# ExecPlan - Padronizar full access explicito por chamada no Codex CLI

## Purpose / Big Picture
- Objetivo: padronizar todas as conversas com Codex CLI para declarar explicitamente o modo de execucao full access por chamada, substituindo a dependencia de alias implicito.
- Resultado esperado:
  - chamadas nao interativas usam flags explicitas equivalentes a full access (`-s danger-full-access` e `-a never`);
  - sessao interativa de planejamento usa o mesmo contrato explicito por chamada;
  - existe cobertura automatizada para evitar regressao de argumentos de CLI;
  - o comportamento funcional atual do fluxo sequencial e do `/plan_spec` permanece inalterado.
- Escopo:
  - atualizar argumentos usados em `runCodexCommand` e `spawnCodexInteractiveProcess` em `src/integrations/codex-client.ts`;
  - introduzir ponto testavel para validar argumentos de chamada do Codex CLI;
  - adicionar testes em `src/integrations/codex-client.test.ts` cobrindo contrato de flags;
  - validar suite e build.
- Fora de escopo:
  - alterar fluxo funcional de `/plan` (ja esta correto e fora deste ticket);
  - alterar contrato de autenticacao (`codex login status`);
  - alterar politica de prioridade/tickets ou fluxo Telegram alem do necessario para manter compatibilidade.

## Progress
- [x] 2026-02-20 14:58Z - Planejamento inicial e escopo tecnico consolidados.
- [x] 2026-02-20 14:59Z - Implementacao dos argumentos explicitos de full access concluida.
- [x] 2026-02-20 14:59Z - Cobertura automatizada de argumentos Codex CLI concluida.
- [x] 2026-02-20 14:59Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-20 14:58Z - O projeto ja executa em full access efetivo via `--dangerously-bypass-approvals-and-sandbox`, tanto no batch quanto no interativo.
- 2026-02-20 14:58Z - Os testes atuais de `codex-client` validam prompts e fluxo, mas nao validam diretamente os argumentos CLI usados pelo spawn default.
- 2026-02-20 14:58Z - O comando `/plan` ja e enviado literalmente na sessao interativa (`PLAN_COMMAND = "/plan"` e escrita no inicio/retry), portanto nao ha gap funcional de modo plano.
- 2026-02-20 14:59Z - A troca para `-s danger-full-access -a never` nao exigiu mudanca no fluxo funcional de sessoes interativas nem no parser.

## Decision Log
- 2026-02-20 - Decisao: adotar contrato explicito por chamada com `-s danger-full-access -a never` em vez de depender apenas de `--dangerously-bypass-approvals-and-sandbox`.
  - Motivo: aumentar clareza, auditabilidade e estabilidade semantica da chamada.
  - Impacto: mudanca concentrada em montagem de argumentos do Codex CLI.
- 2026-02-20 - Decisao: criar superficie testavel para os argumentos (helper/factory), evitando testes fragis dependentes de monkeypatch global de `spawn`.
  - Motivo: garantir cobertura automatizada robusta e manutencao futura simples.
  - Impacto: pequeno refactor interno no `codex-client`.
- 2026-02-20 - Decisao: manter fluxo de modo plano sem mudanca.
  - Motivo: implementacao atual ja atende contrato de usar `/plan` literal.
  - Impacto: reduz escopo e risco de regressao desnecessaria.
- 2026-02-20 - Decisao: expor helpers de argumentos (`buildNonInteractiveCodexArgs` e `buildInteractiveCodexArgs`) para testes de contrato.
  - Motivo: validar de forma direta e estavel as flags de full access explicitas.
  - Impacto: pequeno aumento da superficie exportada do modulo, com ganho de rastreabilidade.

## Outcomes & Retrospective
- Status final: implementacao e validacao tecnica concluidas nesta etapa.
- O que funcionou: padronizacao explicita de full access por chamada em batch e interativo com cobertura automatizada dedicada.
- O que ficou pendente: fechamento do ticket e commit/push ficam para a etapa de encerramento do fluxo.
- Proximos passos: executar etapa de fechamento/versionamento para mover ticket e registrar closure no mesmo commit.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/codex-client.ts` - monta e executa chamadas `codex exec` e `codex` interativo.
  - `src/integrations/codex-client.test.ts` - suite de contrato do cliente Codex.
  - `tickets/open/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md` - ticket de origem.
- Fluxo atual:
  - etapas de ticket/spec usam `runCodexCommand()` (spawn de `codex exec`);
  - `/plan_spec` usa `spawnCodexInteractiveProcess()` (spawn de `codex` interativo);
  - ambos agora usam flags explicitas de full access por chamada (`-s danger-full-access -a never`).
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM;
  - sem introduzir dependencias externas;
  - manter fluxo sequencial e compatibilidade com `codex-cli 0.104.0`.

## Plan of Work
- Milestone 1: Padronizacao de argumentos CLI para full access explicito.
  - Entregavel: chamadas batch/interativas passam a usar `-s danger-full-access -a never` no contrato de argumentos.
  - Evidencia de conclusao: leitura do codigo mostra flags explicitas em ambas as rotas.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 2: Testabilidade do contrato de argumentos.
  - Entregavel: helper/factory de argumentos com cobertura automatizada.
  - Evidencia de conclusao: testes falham se flags forem removidas/alteradas indevidamente.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 3: Validacao de regressao e fechamento tecnico.
  - Entregavel: testes, checagem de tipos e build verdes.
  - Evidencia de conclusao: comandos de validacao executados com sucesso.
  - Arquivos esperados: sem novos arquivos alem dos alterados nos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "dangerously-bypass|runCodexCommand|spawnCodexInteractiveProcess" src/integrations/codex-client.ts` para mapear pontos de troca.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` para centralizar argumentos CLI em helpers nomeados e reutilizaveis.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar helper da rota batch para usar argumentos explicitos de full access (`-s danger-full-access -a never`) mantendo `exec`, `--skip-git-repo-check`, `--color never`, `-`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar helper da rota interativa para usar argumentos explicitos equivalentes (`--skip-git-repo-check`, `-s danger-full-access`, `-a never`, `--color never`).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes em `src/integrations/codex-client.test.ts` cobrindo os helpers/args de batch e interativo.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts` para validar cobertura local da mudanca.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa da suite.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/codex-client.ts src/integrations/codex-client.test.ts` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: testes de argumentos comprovam full access explicito em batch e interativo.
- Comando: `npm test`
  - Esperado: suite verde sem regressao do fluxo de tickets/specs e `/plan_spec`.
- Comando: `npm run check`
  - Esperado: sem erros de tipo/lint.
- Comando: `npm run build`
  - Esperado: build concluida com sucesso.
- Evidencia funcional adicional:
  - `src/integrations/codex-client.ts` sem dependencia de `--dangerously-bypass-approvals-and-sandbox` para definir full access.
  - `/plan` permanece inalterado no fluxo interativo.

## Idempotence and Recovery
- Idempotencia:
  - a refatoracao de argumentos e repetivel sem efeitos colaterais em dados persistidos;
  - reexecucao de testes nao altera estado de runtime do projeto.
- Riscos:
  - diferenca semantica entre alias antigo e combinacao explicita de flags em versoes futuras do CLI;
  - regressao por esquecimento de flags em uma das duas rotas (batch vs interativa).
- Recovery / Rollback:
  - se houver regressao operacional, restaurar temporariamente alias antigo e manter testes como guarda para iteracao seguinte;
  - isolar rollback aos argumentos do spawn sem tocar em parser, fluxo `/plan` ou orquestracao do runner.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md`.
- Arquivos-alvo desta execucao:
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
- Referencias de comportamento atual:
  - `src/integrations/codex-client.ts:140`
  - `src/integrations/codex-client.ts:646`
  - `src/integrations/codex-client.ts:727`
  - `src/integrations/codex-client.ts:138`
  - `src/integrations/codex-client.ts:468`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato interno de montagem de argumentos para subprocessos Codex CLI.
- Compatibilidade:
  - contrato externo do `CodexTicketFlowClient` permanece igual;
  - fluxo funcional de `/plan_spec` e etapas de ticket/spec deve permanecer inalterado.
- Dependencias externas e mocks:
  - dependencia do binario `codex` instalado no ambiente;
  - sem novas libs de teste; usar `node:test`/stubs existentes.
