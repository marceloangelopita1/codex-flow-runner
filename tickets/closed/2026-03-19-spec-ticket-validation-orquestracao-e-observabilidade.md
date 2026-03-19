# [TICKET] Introduzir stage spec-ticket-validation com gate antes do /run-all

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 15:41Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-01, RF-10, RF-15, RF-16, RF-17, RF-24, RF-25, RF-27; CA-01, CA-10, CA-11, CA-12, CA-16, CA-17
- Inherited assumptions/defaults (when applicable): `spec-ticket-validation` e o nome canonico do novo estagio; o veredito `GO/NO_GO` vale para o pacote derivado como um todo; o fluxo continua sequencial; `spec-audit` continua separado e posterior ao `/run-all`.
- Workflow root cause (when applicable): execution
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - src/core/runner.ts
  - src/types/flow-timing.ts
  - src/types/state.ts
  - src/integrations/workflow-trace-store.ts
  - src/integrations/telegram-bot.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a rodada `/run_specs` segue para `spec-close-and-version` e `/run-all` sem gate formal, entao um pacote de tickets inconsistente pode entrar na fila real.

## Context
- Workflow area: `/run_specs` orchestration, observability e resumo final
- Scenario: spec aprovada entra em triagem e o runner precisa decidir se pode ou nao continuar para fechamento/versionamento e `/run-all`
- Input constraints: manter fluxo sequencial; inserir o novo gate como estagio nomeado; nao alterar a semantica de `spec-audit`

## Problem statement
O runner atual nao possui o estagio `spec-ticket-validation`. A orquestracao segue de `spec-triage` direto para `spec-close-and-version` e depois para `/run-all`, sem um veredito formal `GO/NO_GO`, sem escrita da secao dedicada na spec e sem refletir esse gate em timing, estado, traces e resumo final do Telegram.

## Observed behavior
- O que foi observado: `runSpecsAndRunAll` encadeia `spec-triage -> spec-close-and-version -> /run-all -> spec-audit`; os tipos de estado/timing e o workflow trace nao reconhecem `spec-ticket-validation`; o resumo final do Telegram nao tem campos para veredito, gaps, correcoes ou ciclos do gate.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura do codigo e dos testes de `runner`/`telegram-bot`

## Expected behavior
Antes de qualquer `spec-close-and-version` ou `/run-all`, o fluxo `/run_specs` deve executar `spec-ticket-validation`, registrar veredito `GO/NO_GO` com detalhes observaveis, escrever o resultado na spec e refletir a etapa em estado, trace e resumo final.

## Reproduction steps
1. Ler `src/core/runner.ts` e localizar `runSpecsAndRunAll`.
2. Confirmar que `spec-close-and-version` roda imediatamente apos `spec-triage` e que `/run-all` inicia logo em seguida.
3. Conferir `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` para verificar que o novo estagio e seus campos nao existem.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts` encadeia `spec-triage -> spec-close-and-version -> /run-all` sem gate intermediario.
  - `src/types/flow-timing.ts` so modela `spec-triage`, `spec-close-and-version`, `run-all` e `spec-audit`.
  - `src/types/state.ts` nao possui a fase `spec-ticket-validation`.
  - `src/integrations/workflow-trace-store.ts` aceita apenas `spec-triage`, `spec-close-and-version` e `spec-audit` como stages de spec.
  - `src/integrations/telegram-bot.ts` monta o resumo final de `/run_specs` sem veredito `GO/NO_GO`, gaps ou correcoes aplicadas.
- Comparativo antes/depois (se houver): antes = gate inexistente; depois esperado = gate observavel e bloqueante antes de `spec-close-and-version`/`/run-all`

## Impact assessment
- Impacto funcional: a rodada pode avançar com backlog derivado inconsistente, contrariando a spec e degradando a qualidade da fila real.
- Impacto operacional: faltam sinais claros no Telegram e nos traces para explicar por que a rodada continuou ou foi bloqueada.
- Risco de regressao: medio, porque runner, tipos, traces e resumo final precisam evoluir em conjunto.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, testes associados

## Initial hypotheses (optional)
- O fluxo atual foi estruturado para tres etapas fixas de spec e ainda nao possui um contrato de resultado intermediario antes de `/run-all`.

## Proposed solution (optional)
Introduzir o novo estagio como parte canonica de `/run_specs`, com contrato estruturado de resultado e propagacao obrigatoria para estado, trace, spec e Telegram.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-01, RF-24, RF-25; CA-01, CA-16, CA-17
- Evidencia observavel: testes de `runner` mostram a sequencia `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` em caso `GO`, e mostram que `spec-close-and-version`/`/run-all` nao sao executados quando o gate retornar `NO_GO`.
- Requisito/RF/CA coberto: RF-15, RF-16, RF-17, RF-27; CA-10, CA-11, CA-12
- Evidencia observavel: `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` passam a expor `spec-ticket-validation`, veredito, gaps, correcoes aplicadas e ciclos executados; a spec recebe atualizacao automatica na secao `Gate de validacao dos tickets derivados`.
- Requisito/RF/CA coberto: regressao do fluxo principal
- Evidencia observavel: testes automatizados validam snapshots de timing, status e resumo final do Telegram para os caminhos `GO` e `NO_GO`.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - o gate antes do `/run-all` nao existe na orquestracao atual nem nos artefatos de observabilidade.
- 2026-03-19 - Diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md` relidos na etapa de fechamento; resultado validado como `GO` com base apenas em criterios tecnicos/funcionais da entrega atual.

## Closure
- Closed at (UTC): 2026-03-19 17:06Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-01`, `RF-24`, `RF-25`; `CA-01`, `CA-16`, `CA-17`: `src/core/runner.ts`, `src/types/flow-timing.ts` e `src/types/state.ts` encadeiam `spec-ticket-validation` entre `spec-triage` e `spec-close-and-version`, e encerram o fluxo em `spec-ticket-validation` quando o veredito for `NO_GO`; `src/core/runner.test.ts` cobre o caminho `GO` (`requestRunSpecs com sucesso encadeia run-all e processa backlog existente`) e o caminho `NO_GO` (`requestRunSpecs encerra com NO_GO em spec-ticket-validation e atualiza a spec`); `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` -> pass (`227/227`).
  - `RF-15`, `RF-16`, `RF-17`, `RF-27`; `CA-10`, `CA-11`, `CA-12`: `src/core/runner.ts` persiste a subsecao `### Ultima execucao registrada` na secao `Gate de validacao dos tickets derivados`; `src/integrations/workflow-trace-store.ts` aceita `spec-ticket-validation` com metadata observavel do gate; `src/integrations/telegram-bot.ts` inclui veredito, gaps, correcoes aplicadas e ciclos no resumo final; `src/core/runner.test.ts`, `src/integrations/workflow-trace-store.test.ts` e `src/integrations/telegram-bot.test.ts` validam escrita idempotente na spec, traces do gate e resumo final do Telegram para `GO` e `NO_GO`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` -> pass (`227/227`).
  - Regressao do fluxo principal: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` -> pass (`356/356`); `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> pass; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` -> pass.
- Entrega tecnica concluida:
  - `runSpecsAndRunAll(...)` passou a executar `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` apenas quando o veredito do gate for `GO`.
  - O caminho `NO_GO` agora bloqueia `spec-close-and-version` e `/run-all` sem tratar o gate como erro tecnico generico, preservando `finalStage`, `completionReason` e timing observavel do bloqueio.
  - A spec recebe registro deterministico do gate, e o payload observavel do veredito passa a aparecer em estado, traces e resumo final do Telegram.
- Validacao manual externa pendente: nao.
