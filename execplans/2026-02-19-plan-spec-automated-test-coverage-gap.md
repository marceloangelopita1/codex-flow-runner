# ExecPlan - Cobertura automatizada complementar da jornada /plan_spec

## Purpose / Big Picture
- Objetivo: fechar o gap de cobertura automatizada complementar da jornada `/plan_spec`, garantindo rastreabilidade objetiva de CA-01..CA-20 com testes deterministas em `src/core/*.test.ts` e `src/integrations/*.test.ts`.
- Resultado esperado:
  - matriz CA-01..CA-20 mapeada para asserts reais da suite de testes;
  - cobertura ampliada para cenarios de erro, chat incorreto, fluxo inativo, callbacks invalidos, encerramento inesperado e branches de recovery do lifecycle;
  - validacao automatizada verde (`npm test`, `npm run check`, `npm run build`) sem regressao no fluxo sequencial do runner.
- Escopo:
  - revisar cobertura atual de `/plan_spec` nas suites `runner`, `telegram-bot`, `codex-client`, `plan-spec-parser` e `spec-planning-trace-store`;
  - adicionar testes faltantes para branches nao cobertos e cenarios de operacao/UX complementares;
  - explicitar rastreabilidade de CAs em nomes de teste e/ou tabela de mapeamento auditavel;
  - atualizar a spec `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` com evidencias de cobertura.
- Fora de escopo:
  - alterar comportamento funcional do fluxo `/plan_spec` (codigo de producao) alem de ajustes minimos estritamente necessarios para testabilidade;
  - criar nova funcionalidade de produto fora do ticket de cobertura;
  - fechar ticket, mover `tickets/open` para `tickets/closed`, commit/push.

## Progress
- [x] 2026-02-19 22:21Z - Planejamento inicial concluido com leitura integral do ticket alvo, `PLANS.md` e referencias.
- [x] 2026-02-19 22:21Z - Baseline de cobertura atual levantada em `runner.test.ts`, `telegram-bot.test.ts`, `codex-client.test.ts`, `plan-spec-parser.test.ts`.
- [x] 2026-02-19 22:26Z - Matriz CA-01..CA-20 consolidada com lacunas de rastreabilidade resolvidas e busca `rg` sem ausencias.
- [x] 2026-02-19 22:27Z - Testes complementares de core (`src/core/runner.test.ts`) implementados e validados.
- [x] 2026-02-19 22:28Z - Testes complementares de integracoes (`src/integrations/*.test.ts`) implementados e validados.
- [x] 2026-02-19 22:28Z - Spec atualizada com rastreabilidade final de cobertura e evidencias.
- [x] 2026-02-19 22:29Z - Regressao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 22:21Z - O ticket foi aberto quando ainda nao havia cobertura de `/plan_spec`, mas o estado atual ja possui cobertura importante para parte dos CAs em `runner.test.ts` e `telegram-bot.test.ts`.
- 2026-02-19 22:21Z - A principal lacuna atual e de rastreabilidade completa e explicita CA-01..CA-20 (nao apenas existencia parcial de testes), alem de branches de erro/operacao nao exercitados.
- 2026-02-19 22:21Z - Branches de lifecycle/falha no core (chat mismatch, sessao inativa, close inesperado, falha de input/start, erros de callback) ainda precisam de cobertura mais profunda para reduzir risco de regressao operacional.
- 2026-02-19 22:21Z - O parser e a bridge interativa ja cobrem caminho feliz e fallback raw, mas ainda ha espaco para casos limite de chunking, normalizacao e confiabilidade de parse em outputs ambiguos.

## Decision Log
- 2026-02-19 - Decisao: tratar este ticket como cobertura complementar e rastreabilidade, nao como implementacao funcional de `/plan_spec`.
  - Motivo: funcionalidades centrais da jornada ja foram implementadas em tickets anteriores; risco atual e regressao por falta de testes abrangentes.
  - Impacto: foco do trabalho em suites de teste e documentacao de evidencia.
- 2026-02-19 - Decisao: manter a cobertura distribuida nas suites existentes (`runner`, `telegram-bot`, `codex-client`, `parser`) em vez de criar uma suite E2E unica.
  - Motivo: testes atuais usam doubles deterministas e evitam dependencias externas reais (Codex/Telegram), alinhado ao requisito do ticket.
  - Impacto: menor flakiness e melhor diagnostico de regressao por camada.
- 2026-02-19 - Decisao: explicitar CAs nos nomes dos testes e complementar com uma matriz de mapeamento verificavel por busca textual.
  - Motivo: cumprir criterio de rastreabilidade objetiva CA-01..CA-20 sem depender de memoria contextual.
  - Impacto: facilita auditoria rapida e manutencao futura da suite.
- 2026-02-19 - Decisao: priorizar primeiro caminhos de falha e guardrails (erro interativo, sessao inativa/chat incorreto, timeout/close) antes de cenarios cosmeticos.
  - Motivo: essas falhas bloqueiam operacao e podem comprometer o fluxo sequencial do runner.
  - Impacto: ordem de execucao orientada por risco operacional.

## Outcomes & Retrospective
- Status final: execucao concluida e validada (sem fechamento de ticket/sem commit-push por escopo desta etapa).
- O que funcionou: baseline permitiu focar em lacunas reais de lifecycle/guardrails e rastreabilidade CA explicita.
- O que ficou pendente: etapa operacional de fechamento do ticket e versionamento (fora do escopo desta execucao).
- Proximos passos: executar prompt de fechamento dedicado quando autorizado, movendo ticket para `tickets/closed/` no mesmo commit da resolucao.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/integrations/plan-spec-parser.test.ts`
  - `src/integrations/spec-planning-trace-store.test.ts`
- Fluxo atual:
  - sessao `/plan_spec` e global por instancia e bloqueia execucoes concorrentes (`/run_all`, `/run_specs`, troca de projeto);
  - bridge interativa do Codex em `/plan` publica eventos de pergunta/final/raw/falha;
  - acao final `Criar spec` materializa spec, persiste trilha `spec_planning/*` e dispara versionamento dedicado.
- Restricoes tecnicas:
  - testes devem permanecer deterministas e sem chamadas reais a Telegram/Codex;
  - fluxo deve manter modelo sequencial do runner;
  - evitar novas dependencias de teste se possivel.

## Plan of Work
- Milestone 1: Inventario de cobertura e matriz de rastreabilidade CA-01..CA-20.
  - Entregavel: tabela CA -> arquivo/teste/assert com identificacao de lacunas reais.
  - Evidencia de conclusao: busca textual e checklist mostrando 100% dos CAs com referencia explicita.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/plan-spec-parser.test.ts`, possivel secao na spec.
- Milestone 2: Cobertura complementar de lifecycle e guardrails no core.
  - Entregavel: testes para branches de erro/edge no `TicketRunner` (sessao inativa, chat incorreto, start/input failure, close inesperado, estados de fallback/recovery).
  - Evidencia de conclusao: asserts deterministas cobrindo respostas/estado/fases esperadas sem chamada externa real.
  - Arquivos esperados: `src/core/runner.test.ts`.
- Milestone 3: Cobertura complementar de UX/comandos/callbacks no Telegram.
  - Entregavel: testes para replies de status/cancel/start em todos os status, callbacks invalidos/inativos/com erro, roteamento de texto em estados limite.
  - Evidencia de conclusao: asserts de mensagem e de nao execucao de controles em cenarios bloqueados.
  - Arquivos esperados: `src/integrations/telegram-bot.test.ts`.
- Milestone 4: Robustez da bridge interativa e parser.
  - Entregavel: testes adicionais de chunking, fallback raw saneado, encerramento inesperado, erro de escrita/input e preservacao de contrato sem fallback batch.
  - Evidencia de conclusao: eventos esperados (`question`, `final`, `raw-sanitized`, `failure`) cobrindo caminhos nao exercitados atualmente.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`, `src/integrations/plan-spec-parser.test.ts`.
- Milestone 5: Validacao final e rastreabilidade na spec.
  - Entregavel: spec atualizada com evidencias objetivas de cobertura complementar e estado do ticket.
  - Evidencia de conclusao: suites verdes e secao de evidencias na spec apontando para testes/linhas relevantes.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CA-[0-9]{2}|plan_spec|plan-spec" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts` para baseline de cobertura declarada.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "startPlanSpecSession|submitPlanSpecInput|cancelPlanSpecSession|handlePlanSpec|handlePlanSpecSession|parsePlanSpec|startPlanSession" src/core/runner.ts src/integrations/telegram-bot.ts src/integrations/codex-client.ts src/integrations/plan-spec-parser.ts` para mapear branches sem teste.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` via `$EDITOR` adicionando cenarios complementares de lifecycle, falhas e guardrails com referencia explicita aos CAs aplicaveis.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` via `$EDITOR` cobrindo replies/estados nao exercitados de `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel`, callbacks e roteamento textual.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` via `$EDITOR` para cenarios complementares da sessao interativa (`close`, `input`, `stderr`, `runtime failure`, trust prompt).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/plan-spec-parser.test.ts` via `$EDITOR` com casos limite de parse/fallback/chunks e normalizacao.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario, ajustar `src/integrations/spec-planning-trace-store.test.ts` para rastreabilidade adicional de CA-15/CA-16 sem alterar comportamento de producao.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para validar milestone de core.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para validar milestone de Telegram.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts src/integrations/spec-planning-trace-store.test.ts` para validar milestone de integracoes.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for ca in $(seq -w 1 20); do rg -n "CA-${ca}" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts >/dev/null || { echo "missing CA-${ca}"; exit 1; }; done` para garantir rastreabilidade explicita de todos os CAs.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` via `$EDITOR` com evidencias de cobertura complementar e timestamp de revisao.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts src/integrations/spec-planning-trace-store.test.ts docs/specs/2026-02-19-telegram-plan-spec-conversation.md` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cobertura de estados de sessao (`started`, `already-active`, `blocked`, `failed`, `inactive`, `ignored-chat`), guardrails e recovery de lifecycle sem regressao.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: comandos e callbacks de `/plan_spec` cobertos em caminhos feliz/erro/bloqueio com mensagens acionaveis e controles corretos.
- Comando: `npx tsx --test src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts`
  - Esperado: bridge interativa e parser cobrem parse estruturado, fallback raw, trust prompt e falhas sem fallback batch.
- Comando: `for ca in $(seq -w 1 20); do rg -n "CA-${ca}" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts; done`
  - Esperado: ao menos uma evidencia de teste para cada CA-01..CA-20.
- Comando: `rg -n "plan-spec-automated-test-coverage-gap|CA-01|CA-20|Status de atendimento|Evidencias de validacao" docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - Esperado: spec atualizada com rastreabilidade desta entrega.
- Comando: `npm test && npm run check && npm run build`
  - Esperado: suite completa verde, mantendo compatibilidade com fluxo sequencial existente.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar suites de teste nao altera estado funcional do repositorio;
  - testes continuam isolados com doubles, sem I/O externo real.
- Riscos:
  - falsos positivos de rastreabilidade se CA aparecer apenas em nome de teste sem assert relevante;
  - flakiness em cenarios de timeout/sessao interativa se timers nao forem controlados;
  - acoplamento excessivo a mensagens textuais do bot gerar fragilidade desnecessaria.
- Recovery / Rollback:
  - se um teste ficar instavel, reduzir dependencia temporal (timers controlados/stubs) antes de manter na suite;
  - se surgir sobreposicao entre CAs, consolidar cenarios em helper comum mantendo asserts explicitos por CA;
  - se houver regressao ampla, isolar o bloco novo por arquivo/suite e reintroduzir incrementalmente com validacao focada.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.
- Prompt relacionado ao ticket: `prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Referencias tecnicas consultadas:
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/integrations/plan-spec-parser.test.ts`
  - `src/integrations/spec-planning-trace-store.test.ts`
- Comandos de validacao previstos:
  - `npx tsx --test src/core/runner.test.ts`
  - `npx tsx --test src/integrations/telegram-bot.test.ts`
  - `npx tsx --test src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts src/integrations/spec-planning-trace-store.test.ts`
  - `npm test`
  - `npm run check`
  - `npm run build`

## Interfaces and Dependencies
- Interfaces alteradas:
  - foco principal em arquivos de teste; interfaces de producao so devem ser tocadas se houver necessidade minima de testabilidade.
  - possivel ajuste pontual em helpers de teste para reduzir duplicacao e melhorar clareza de asserts.
- Compatibilidade:
  - manter semantica atual do fluxo sequencial (`/run_all`, `/run_specs`, `/plan_spec`) sem introduzir paralelizacao;
  - nao alterar contratos de API externos (Telegram/Codex) neste ticket de cobertura.
- Dependencias externas e mocks:
  - manter uso de `node:test` + stubs/fakes locais;
  - manter testes sem chamadas reais de rede/processos externos;
  - evitar adicionar nova dependencia de cobertura enquanto o objetivo for rastreabilidade funcional observavel.
