# ExecPlan - Compatibilidade plans/execplans e testes de contrato do fluxo de tickets

## Purpose / Big Picture
- Objetivo: eliminar o acoplamento em `execplans/` e garantir compatibilidade operacional com repositorios que usam `plans/` ou `execplans/`.
- Resultado esperado: etapa `plan` resolve e reporta o diretorio correto sem migracao manual, com cobertura automatizada para cenarios de sucesso/falha do ciclo principal e para as duas convencoes de pasta.
- Escopo:
  - Introduzir resolucao centralizada do diretorio de plano ativo do repositorio alvo.
  - Aplicar essa resolucao em `FileSystemTicketQueue` e `CodexCliTicketFlowClient`.
  - Ajustar a montagem do prompt da etapa `plan` para nao conflitar com a convencao ativa.
  - Expandir testes de contrato/integracao para matriz `plans/` vs `execplans/` e comportamento de erro por etapa.
  - Atualizar a spec `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` com evidencias de atendimento.
- Fora de escopo:
  - Semantica de rodada finita, fail-fast global de `/run-all` e push obrigatorio (ticket separado: `tickets/open/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md`).
  - Paralelizacao de tickets.
  - Mudanca de convencao de nome/estrutura de tickets (`tickets/open` e `tickets/closed`).

## Progress
- [x] 2026-02-19 12:20Z - Planejamento inicial concluido com leitura integral do ticket e referencias.
- [x] 2026-02-19 12:27Z - Resolucao de diretorio `plans/execplans` implementada e integrada no fluxo.
- [x] 2026-02-19 12:27Z - Suite de testes de contrato/integracao atualizada para cenarios de compatibilidade e falha.
- [x] 2026-02-19 12:27Z - Validacoes finais e atualizacao da spec concluidas.

## Surprises & Discoveries
- 2026-02-19 12:28Z - O ticket foi aberto antes da entrada dos testes de contrato em `src/core/runner.test.ts`; ja existe cobertura de ordem de etapas e erro por stage, mas ainda sem matriz de convencao de pasta de plano.
- 2026-02-19 12:28Z - O acoplamento em `execplans/` aparece em tres superficies: `ensureStructure` da fila, `expectedExecPlanPath` no cliente Codex e asserts dos testes do cliente/runner.
- 2026-02-19 12:29Z - O prompt base `prompts/02-criar-execplan-para-ticket.md` instrui salvar em `execplans/`, entao apenas trocar path retornado no codigo nao e suficiente sem alinhar o texto final enviado ao Codex.
- 2026-02-19 12:27Z - Nao foi necessario alterar `src/core/runner.test.ts`; a cobertura do runner permaneceu valida porque o contrato de ordem/falha por stage nao depende do diretorio de plano.

## Decision Log
- 2026-02-19 - Decisao: centralizar a regra de convencao de plano em helper unico reutilizado por fila e cliente Codex.
  - Motivo: evitar divergencia de comportamento entre criacao de estrutura, prompt de plan e `execPlanPath` reportado.
  - Impacto: adiciona novo modulo em `src/integrations` e reduz hardcodes espalhados.
- 2026-02-19 - Decisao: resolver diretorio ativo por deteccao de filesystem com fallback deterministico.
  - Motivo: compatibilidade sem migracao manual em repositorios legados.
  - Impacto: regra proposta:
    - se apenas `plans/` existir, usar `plans/`;
    - se apenas `execplans/` existir, usar `execplans/`;
    - se ambos existirem, preferir diretorio com artefatos `.md` (desempate: `execplans/` por compatibilidade retroativa);
    - se nenhum existir, criar e usar `execplans/`.
- 2026-02-19 - Decisao: complementar cobertura de testes onde o gap permanece (resolucao de pasta e contrato de prompt/path), sem duplicar objetivo do ticket de rodada fail-fast.
  - Motivo: manter escopo focado e reduzir risco de sobreposicao entre tickets abertos.
  - Impacto: novos testes em `src/integrations` e ajuste pontual em `src/core/runner.test.ts` apenas se necessario para refletir caminho dinamico.
- 2026-02-19 - Decisao: adaptar somente o trecho de instrucao de salvamento no prompt de plan (`plans/` vs `execplans/`) em vez de reescrever todo o template.
  - Motivo: preservar o texto canonico versionado no prompt base e minimizar risco de drift de instrucoes.
  - Impacto: `CodexCliTicketFlowClient` passou a fazer substituicao dirigida no stage `plan` e manter as demais instrucoes intactas.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas, com encerramento do ticket no mesmo commit da solucao.
- O que funcionou: resolucao centralizada de diretorio, integracao em fila/cliente Codex e nova cobertura automatizada para `plans/` e `execplans`.
- O que ficou pendente: sem pendencias tecnicas dentro deste escopo.
- Proximos passos: acompanhar somente o ticket remanescente de rodada fail-fast/auto-push.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/ticket-queue.ts` - cria estrutura base e atualmente fixa `execplans/`.
  - `src/integrations/codex-client.ts` - monta prompt por stage e reporta `execPlanPath` hardcoded em `execplans/`.
  - `src/core/runner.ts` - orquestra stages e registra o `execPlanPath` devolvido pela etapa `plan`.
  - `src/integrations/codex-client.test.ts` e `src/core/runner.test.ts` - cobertura atual de contrato do fluxo.
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` - RF-07 e CAs de compatibilidade (`CA-04`, `CA-05`).
  - `tickets/closed/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md` - criterio de fechamento deste escopo.
- Fluxo atual:
  - Runner executa `plan -> implement -> close-and-version`.
  - Etapa `plan` depende de `expectedExecPlanPath(...)` para orientar o prompt e reportar artefato.
  - Fila sempre cria `execplans/`, independentemente da convencao do repositorio alvo.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM, arquitetura em camadas.
  - Fluxo de tickets permanece sequencial.
  - Sem commit de segredos; ambiente via `.env`.
- Termos usados no plano:
  - "Diretorio de plano ativo": pasta canonicamente usada pelo repositorio alvo para artefatos da etapa `plan` (`plans/` ou `execplans/`).
  - "Teste de contrato": teste que valida comportamento esperado entre camadas com doubles/fixtures observaveis.

## Plan of Work
- Milestone 1: Regra unica de resolucao de diretorio de plano ativa e testavel.
  - Entregavel: helper de resolucao de convencao (`plans`/`execplans`) com fallback deterministico.
  - Evidencia de conclusao: testes unitarios cobrindo matriz de existencia de pastas e fallback.
  - Arquivos esperados: `src/integrations/plan-directory.ts`, `src/integrations/plan-directory.test.ts`.
- Milestone 2: Fluxo de fila e cliente Codex usando diretorio resolvido em vez de hardcode.
  - Entregavel: `ensureStructure`, montagem de prompt e `execPlanPath` orientados pelo diretorio ativo.
  - Evidencia de conclusao: busca textual sem hardcode operacional indevido e asserts de teste passando para ambos os cenarios.
  - Arquivos esperados: `src/integrations/ticket-queue.ts`, `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 3: Cobertura de contrato do fluxo principal reforcada para cenarios de sucesso/falha sem drift de escopo.
  - Entregavel: testes cobrindo propagacao de `execPlanPath` dinamico no stage `plan` e quebra de fluxo por erro de stage mantendo rastreabilidade.
  - Evidencia de conclusao: `npm test` verde com casos nomeados para convencao `plans` e `execplans`.
  - Arquivos esperados: `src/core/runner.test.ts` (se ajuste necessario), `src/integrations/codex-client.test.ts`, `src/integrations/ticket-queue.test.ts`.
- Milestone 4: Rastreabilidade da spec atualizada com evidencia objetiva.
  - Entregavel: status de atendimento da spec refletindo compatibilidade de diretorio e cobertura de testes adicionada.
  - Evidencia de conclusao: diff da spec com `Last reviewed at (UTC)`, pendencias e evidencias atualizadas.
  - Arquivos esperados: `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para registrar baseline antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "execplans|expectedExecPlanPath|ensureStructure|ExecPlan esperado" src/integrations src/core/runner.test.ts` para mapear todos os pontos de acoplamento.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/plan-directory.ts` via `$EDITOR src/integrations/plan-directory.ts` com regra unica de resolucao e fallback documentado.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/plan-directory.test.ts` via `$EDITOR src/integrations/plan-directory.test.ts` cobrindo: apenas `plans`, apenas `execplans`, ambos, nenhum.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/ticket-queue.ts` via `$EDITOR src/integrations/ticket-queue.ts` para garantir estrutura do diretorio ativo e remover dependencia cega de `execplans/`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para gerar `execPlanPath` dinamico e alinhar o prompt da etapa `plan` com o diretorio ativo.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` via `$EDITOR src/integrations/codex-client.test.ts` para validar prompt e `execPlanPath` em cenarios `plans/` e `execplans/`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.test.ts` via `$EDITOR src/core/runner.test.ts` somente se necessario para manter contrato de `execPlanPath` dinamico sem quebrar asserts de ordem/falha.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` e verificar que novos cenarios de compatibilidade e erro de stage passam.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build apos as alteracoes.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` via `$EDITOR ...` com `Last reviewed at (UTC)`, status dos CAs e evidencias da entrega.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-07|CA-04|CA-05|plan-dir-compat-and-ticket-flow-tests-gap|Last reviewed at" docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` para conferir rastreabilidade final.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/integrations/ticket-queue.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/integrations/plan-directory.ts src/integrations/plan-directory.test.ts src/core/runner.test.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` para auditoria final.

## Validation and Acceptance
- Comando: `npm test`
  - Esperado: suite verde com casos que comprovam geracao de artefato de plano em `plans/` e em `execplans/`, alem de erro por stage com rastreabilidade.
- Comando: `rg -n "plans/|execplans/" src/integrations/codex-client.ts src/integrations/ticket-queue.ts src/integrations/plan-directory.ts`
  - Esperado: convencao de diretorio tratada por regra centralizada, sem hardcode operacional espalhado.
- Comando: `npm run check && npm run build`
  - Esperado: zero erro de tipagem e build concluido com sucesso.
- Comando: `rg -n "RF-07|CA-04|CA-05|Status de atendimento|Last reviewed at" docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - Esperado: spec atualizada com evidencia objetiva da compatibilidade entre `plans/` e `execplans/`.

## Idempotence and Recovery
- Idempotencia:
  - Comandos de validacao (`npm test`, `npm run check`, `npm run build`) podem ser reexecutados sem alterar estado funcional do repositorio.
  - Resolver de diretorio deve ser puro para leitura e previsivel para a mesma estrutura de pastas.
- Riscos:
  - Ambiguidade quando `plans/` e `execplans/` coexistem com conteudo valido.
  - Prompt da etapa `plan` permanecer contraditorio se texto base nao for alinhado ao diretorio ativo.
  - Regressao em testes existentes que assumem `execplans/` fixo.
- Recovery / Rollback:
  - Em regressao, manter fallback imediato para `execplans/` com log de advertencia enquanto ajusta a heuristica.
  - Se os testes de contrato falharem por mudanca de regra, corrigir primeiro o resolver central e somente depois os pontos consumidores.
  - Se houver comportamento inesperado em producao, reverter para implementacao anterior e reintroduzir a compatibilidade em passos menores (resolver -> queue -> client -> testes).

## Artifacts and Notes
- PR/Diff: `git diff -- src/integrations/ticket-queue.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/integrations/plan-directory.ts src/integrations/plan-directory.test.ts src/core/runner.test.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.
- Logs relevantes: saida de `npm test`, `npm run check`, `npm run build`.
- Evidencias de teste: casos nomeados cobrindo `plans/`, `execplans/`, fallback e falha por stage.
- Ticket de origem: `tickets/closed/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md`.
- Referencias usadas no planejamento:
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/codex-client.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `prompts/02-criar-execplan-para-ticket.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - Contrato interno de resolucao de diretorio de plano (novo helper compartilhado em `src/integrations`).
  - `CodexStageResult.execPlanPath` permanece opcional, mas passa a refletir `plans/` ou `execplans/` conforme convencao ativa.
  - `FileSystemTicketQueue.ensureStructure()` passa a respeitar diretorio de plano ativo em vez de assumir `execplans/`.
- Compatibilidade:
  - Repositorios com `execplans/` mantem comportamento atual.
  - Repositorios com `plans/` deixam de exigir migracao manual.
  - Fluxo sequencial de tickets e contrato de etapas (`plan`, `implement`, `close-and-version`) permanecem inalterados.
- Dependencias externas e mocks:
  - Sem nova dependencia de runtime prevista; uso de `node:fs` e `node:path`.
  - Testes continuam com doubles locais para evitar chamadas reais ao `codex exec`.
