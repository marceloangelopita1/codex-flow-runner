# [TICKET] Plugar o pacote contratual de case-investigation ao flow real e ao trace minimizado

## Metadata
- Status: blocked
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-03 17:15Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md
- Parent execplan (optional): execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md
- Parent commit (optional):
- Analysis stage (when applicable): implementation-review
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: n/a - fechamento `NO_GO` local do ticket pai
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): subconjunto remanescente do ticket pai: RF-08, RF-19..RF-35, RF-37..RF-41; CA-03, CA-07, CA-08, CA-09, CA-10, CA-11, CA-15. Membros explicitos preservados: forma canonica `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`; `publication_status=eligible|not_eligible|blocked_by_policy|not_applicable`; `overall_outcome=no-real-gap|real-gap-not-internally-avoidable|real-gap-not-generalizable|inconclusive-case|inconclusive-project-capability-gap|runner-limitation|ticket-published|ticket-eligible-but-blocked-by-policy`; ausencia de `workflow_debug`, `db_payload`, `transcript` e payload bruto no trace/resumo; `versioned_artifact_paths` restrito ao ticket quando houver publication.
- Inherited assumptions/defaults (when applicable): `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.ts` permanecem como source of truth do contrato; o runner continua sem reinterpretar o dominio; o wiring deve reutilizar o control-plane oficial do fluxo e nao criar handler paralelo; o artefato versionado padrao continua sendo apenas o ticket quando houver publication elegivel.
- Inherited RNFs (when applicable): trace minimo sem material sensivel; rastreabilidade cross-project observavel; fluxo sequencial; cobertura positiva/negativa das allowlists finitas relevantes.
- Inherited technical/documentary constraints (when applicable): este follow-up nao deve recriar comandos, status, cancelamento ou milestones fora do ticket irmao `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`; a capability concreta do piloto continua fora de escopo; a integracao deve ocorrer nas superficies reais `runner`/`telegram-bot`/`workflow-trace-store`.
- Inherited pending/manual validations (when applicable): registrar uma validacao redigida do trace minimizado em fixture ou rodada representativa apos o wiring real; a smoke manual de Telegram real do control-plane continua sob ownership do ticket irmao quando ela depender dos comandos/status/cancel ainda nao aterrados.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): ticket
- Smallest plausible explanation (audit/review only): o ticket pai misturou contrato/publication runner-side com criterios de aceite que dependem de um flow real ainda inexistente no branch; a implementacao atual, por isso, ficou correta no modulo dedicado e incompleta no nivel de integracao exigido para `GO`.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
  - docs/workflows/codex-quality-gates.md
  - docs/workflows/target-project-compatibility-contract.md
  - tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o repositorio ja possui contrato e engine runner-side para `case-investigation`, mas ainda sem qualquer consumo nas superficies reais do flow; sem esse wiring, o pacote fica morto no branch e o aceite tecnico do ticket pai permanece bloqueado.

## Context
- Workflow area: target investigate case / integracao do modulo contratual / traces e resumo final
- Scenario: o ticket pai entregou manifesto, schemas, matriz de combinacoes, gates runner-side e helpers de summary/trace, mas o branch ainda nao possui flow real que consuma esse pacote nas superficies do runner.
- Input constraints: este follow-up depende do scaffold do ticket irmao de control-plane para evitar um handler paralelo; enquanto esse scaffold nao aterrar no branch, nao ha proximo passo local seguro dentro deste escopo.

## Problem statement
O pacote contratual de `case-investigation` ja existe em modulo dedicado, porem ainda nao foi plugado ao flow real do runner. Sem integracao em `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts` e superficies correlatas, os criterios de fechamento ligados a UX guiada, trace persistido, resumo final do Telegram e validacao final do trace minimizado permanecem sem evidencia observavel.

## Observed behavior
- O que foi observado:
  - `rg -n "targetInvestigateCase|target-investigate-case|target_investigate_case|case-investigation" src/core src/integrations src/types` encontra ocorrencias apenas em `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` e `src/core/target-investigate-case.test.ts`.
  - `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts`, `src/types/target-flow.ts`, `src/types/state.ts` e `src/types/flow-timing.ts` continuam sem referencias a `target-investigate-case` neste branch.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts` passa, mas nao ha ainda cobertura complementar em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` ou `src/integrations/workflow-trace-store.test.ts` para esse fluxo.
- Frequencia (unico, recorrente, intermitente): recorrente enquanto o scaffold do flow nao aterrar
- Como foi detectado (warning/log/test/assert): releitura do diff e `rg` sobre `src/core`, `src/integrations` e `src/types`, mais revisao dos testes executados no fechamento `NO_GO` do ticket pai.

## Expected behavior
Assim que o control-plane oficial de `target-investigate-case` existir no branch, o runner deve consumir diretamente o pacote contratual ja implementado, reutilizando o normalizador, o avaliador, o trace sanitizado e o resumo final nas superficies reais do flow, sem duplicar comandos/status/cancel ou reimplementar a logica em paralelo.

## Reproduction steps
1. Executar `rg -n "targetInvestigateCase|target-investigate-case|target_investigate_case|case-investigation" src/core src/integrations src/types` e confirmar que as ocorrencias ficam restritas ao modulo novo e ao seu teste.
2. Ler `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts`, `src/types/target-flow.ts`, `src/types/state.ts` e `src/types/flow-timing.ts` e confirmar a ausencia de wiring para `target-investigate-case`.
3. Executar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts` e observar que a cobertura automatizada atual e apenas do modulo dedicado, nao do flow real.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `src/integrations/workflow-trace-store.ts`: nenhuma referencia a `target-investigate-case` no branch revisado.
  - `src/core/target-investigate-case.ts`: summary/trace existem apenas como helpers puros.
  - `src/core/target-investigate-case.test.ts`: cobre o contrato local, mas ainda nao prova persistencia de trace nem renderizacao no flow real.
- Comparativo antes/depois (se houver): antes = nenhuma superficie contratual de `case-investigation`; depois atual = contrato, validadores e engine runner-side existem, mas ainda sem consumo nas superficies reais do flow.

## Impact assessment
- Impacto funcional: o pacote entregue no ticket pai ainda nao se torna comportamento observavel do runner.
- Impacto operacional: o aceite tecnico do ticket pai permanece bloqueado e o repositorio continua sem trace/resumo final reais para `case-investigation`.
- Risco de regressao: medio, porque o wiring remanescente toca superficies compartilhadas de runner, Telegram, trace store e tipos de flow.
- Scope estimado (quais fluxos podem ser afetados): `src/types/target-flow.ts`, `src/types/state.ts`, `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/workflow-trace-store.test.ts`.

## Initial hypotheses (optional)
- A menor entrega segura e reaproveitar o modulo dedicado de `target-investigate-case` dentro do flow oficial aterrado pelo ticket irmao, em vez de reconstruir parser, summary, trace ou publication em outra superficie.

## Proposed solution (optional)
- Assim que o ticket irmao de control-plane aterrar o scaffold do fluxo, importar e usar `normalizeTargetInvestigateCaseInput`, `evaluateTargetInvestigateCaseRound`, `buildTargetInvestigateCaseTracePayload` e `buildTargetInvestigateCaseFinalSummary` nas superficies reais do runner, Telegram e trace store; depois registrar uma validacao redigida do trace minimizado sobre fixture ou rodada representativa.

## Closure criteria
- Requisito/RF/CA coberto: RF-08, CA-03
- Evidencia observavel: o flow real ou a UX guiada do Telegram convergem para a mesma forma canonica `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]` usando o normalizador compartilhado, com teste observavel de equivalencia entre comando canonico e entrada guiada.
- Requisito/RF/CA coberto: RF-19..RF-35, CA-07, CA-08, CA-09, CA-10, CA-14
- Evidencia observavel: o flow real consome `evaluateTargetInvestigateCaseRound(...)`, torna observaveis os caminhos `no-op`, `blocked_by_policy`, `runner-limitation` e `ticket-published`, persiste `publication-decision.json` no lifecycle real e, quando houver publication positiva, preenche `ticket_path` e restringe `versioned_artifact_paths` ao ticket; testes nas suites do runner comprovam esses caminhos sem duplicar logica do modulo dedicado.
- Requisito/RF/CA coberto: RF-37..RF-41, CA-11, CA-15
- Evidencia observavel: `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` passam a receber somente o payload sanitizado e o summary final derivados do modulo compartilhado; testes garantem presenca dos campos obrigatorios e ausencia de `workflow_debug`, `db_payload`, `transcript` e payloads brutos no trace/resumo do flow real.
- Requisito/RF/CA coberto: validacao manual herdada de rastreabilidade operacional do trace minimizado
- Evidencia observavel: o aceite do ticket registra explicitamente uma validacao redigida feita sobre fixture ou rodada representativa apos o wiring, identificando a execucao avaliada, o resultado da auditoria do trace minimizado e quaisquer ajustes feitos antes do fechamento.
- Requisito/RF/CA coberto: fronteira de ownership do pacote derivado
- Evidencia observavel: o diff final reutiliza o scaffold do ticket `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`, sem criar novo control-plane paralelo e sem tocar `../guiadomus-matricula/**`.

## Decision log
- 2026-04-03 17:15Z - Ticket criado como follow-up `blocked` apos fechamento `NO_GO` do ticket pai.
  - Motivo: o branch atual ja contem o pacote contratual e sua cobertura local, mas nao o wiring observavel exigido para `GO`.
  - Gatilho de desbloqueio: aterragem do scaffold oficial de `target-investigate-case` no ticket irmao `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
