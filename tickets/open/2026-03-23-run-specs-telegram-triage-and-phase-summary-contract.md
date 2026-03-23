# [TICKET] Contrato de /run_specs nao expoe snapshot de triagem nem summaries estruturados das fases timing-only

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-23 16:17Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-03, RF-04, RF-05, RF-06, RF-08, RF-09, RF-10, RF-11, RF-12, RF-23; CA-01, CA-02, CA-04, CA-09, CA-10.
- Inherited assumptions/defaults (when applicable): o marco de triagem deve ser mais curto e decisorio que o resumo final; nem toda fase precisa expor o mesmo volume de dados; `spec-triage`, `spec-close-and-version` e `spec-audit` provavelmente exigem enriquecimento do contrato interno, nao apenas ajuste de renderer; o formato alvo permanece compativel com texto simples.
- Inherited RNFs (when applicable): RF-20 como guardrail de utilidade operacional para o contrato; RF-23 para preservar robustez da superficie atual.
- Inherited technical/documentary constraints (when applicable): preservar a camada atual de entrega robusta do Telegram; manter compatibilidade com mensagens em texto simples; nao alterar a semantica funcional das fases do `/run_specs`; nao introduzir persistencia/outbox ou novas garantias de entrega; nao transformar o Telegram em copia integral de trace/log bruto; manter o fluxo sequencial e a observabilidade atual do runner.
- Inherited pending/manual validations (when applicable): nenhuma herdada para aceite deste ticket; as validacoes manuais da spec dependem da mudanca editorial do renderer e ficam no ticket de apresentacao.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - SPECS.md
  - INTERNAL_TICKETS.md
  - docs/workflows/codex-quality-gates.md
  - docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P0 porque o operador continua sem snapshot funcional suficiente no checkpoint pre-`/run-all`, e o ticket de renderer depende deste contrato para ser executavel sem inferencias ocultas.

## Context
- Workflow area: `/run_specs` pre-`/run_all`, resumo final e contrato interno de summaries.
- Scenario: a spec exige que o milestone de triagem e o resumo final carreguem snapshots funcionais e summaries por fase, inclusive para fases hoje timing-only.
- Input constraints: preservar transporte/telemetria atuais e limitar o contrato a sinais operacionais relevantes em texto simples.

## Problem statement
O contrato interno atual de `/run_specs` nao expoe dados estruturados suficientes para o milestone de triagem nem para as fases `spec-triage`, `spec-close-and-version` e `spec-audit`. Como o renderer recebe apenas `outcome/finalStage/nextAction/details/timing` no milestone e apenas alguns blocos especializados no resumo final, faltam insumos objetivos para cumprir a spec sem recorrer a texto generico ou deducao fraca.

## Observed behavior
- O que foi observado: `RunSpecsTriageLifecycleEvent` em `src/core/runner.ts` carrega apenas `spec`, `outcome`, `finalStage`, `nextAction`, `timing` e `details`; `buildRunSpecsTriageMilestoneMessage` em `src/integrations/telegram-bot.ts` renderiza apenas esses campos e tempos. `RunSpecsFlowSummary` em `src/types/flow-timing.ts` so tem summaries especializados para `spec-ticket-validation`, `spec-ticket-derivation-retrospective`, `workflow-gap-analysis`, publication transversal e `runAllSummary`. `parseSpecAuditStageResult` em `src/core/runner.ts` reduz `spec-audit` a `residualGapsDetected` e `followUpTicketsCreated`.
- Frequencia (unico, recorrente, intermitente): recorrente em todo `/run_specs`.
- Como foi detectado (warning/log/test/assert): inspecao direta de `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts` e dos testes atuais de `src/integrations/telegram-bot.test.ts`.

## Expected behavior
O runner deve publicar um contrato explicito para o milestone de triagem e para o resumo final com summaries estruturados por fase quando houver sinal operacional relevante. Isso inclui preservar o melhor snapshot disponivel de `spec-ticket-validation` e `spec-ticket-derivation-retrospective` antes do `/run-all` e expor resumos proprios de `spec-triage`, `spec-close-and-version` e `spec-audit` para o renderer.

## Reproduction steps
1. Ler `RunSpecsTriageLifecycleEvent` em `src/core/runner.ts` e confirmar a ausencia de campos estruturados para gate funcional e retrospectiva.
2. Ler `RunSpecsFlowSummary` em `src/types/flow-timing.ts` e confirmar a ausencia de summaries proprios para `spec-triage`, `spec-close-and-version` e `spec-audit`.
3. Ler `buildRunSpecsTriageMilestoneMessage` e `buildRunFlowSummaryMessage` em `src/integrations/telegram-bot.ts` e comparar com RF-03 a RF-12 e CA-01 a CA-04 da spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/core/runner.ts`: `RunSpecsTriageLifecycleEvent` nao tem campos para snapshot funcional alem de `details`.
  - `src/types/flow-timing.ts`: `RunSpecsFlowSummary` nao modela summaries de `spec-triage`, `spec-close-and-version` ou `spec-audit`.
  - `src/core/runner.ts`: `parseSpecAuditStageResult` so retorna `residualGapsDetected` e `followUpTicketsCreated`.
  - `src/integrations/telegram-bot.ts`: o milestone renderiza apenas resultado, fase final, proxima acao, detalhes e tempos.
- Comparativo antes/depois (se houver): n/a

## Impact assessment
- Impacto funcional: o milestone pre-`/run_all` nao consegue comunicar por que o fluxo vai seguir ou bloquear com o nivel de detalhe exigido pela spec; o resumo final tambem nao consegue representar fases timing-only com summary proprio.
- Impacto operacional: o operador continua dependente de `details`, logs ou inferencia manual para entender checkpoint, fechamento/versionamento e auditoria.
- Risco de regressao: medio, porque a mudanca atravessa tipos, montagem de summary e testes do runner.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/flow-timing.ts`, contratos consumidos por `src/integrations/telegram-bot.ts` e testes correlatos de runner/Telegram.

## Initial hypotheses (optional)
- O contrato atual cresceu ao redor de fases ja estruturadas (`spec-ticket-validation` e retrospectivas), mas nao foi estendido para fases ainda tratadas como timing-only.

## Proposed solution (optional)
- Introduzir view-models/summaries estruturados para milestone pre-`/run_all`, `spec-triage`, `spec-close-and-version` e `spec-audit`, com campos minimos alinhados aos RFs e reutilizaveis pelo renderer do Telegram.

## Closure criteria
- Requisito/RF/CA coberto: RF-03, RF-04, RF-05, RF-06, CA-01, CA-02.
- Evidencia observavel: `RunSpecsTriageLifecycleEvent` ou contrato equivalente passa a carregar snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective`; os testes do runner verificam, em cenarios de sucesso, `NO_GO` e falha tecnica pre-`/run_all`, que o milestone preserva o melhor snapshot disponivel e expõe em `spec-ticket-validation` ao menos `verdict`, `confidence`, `finalReason`, `cyclesExecuted` e `summary`, e em `spec-ticket-derivation-retrospective` ao menos `decision`, `reviewedGapHistoryDetected`, `summary` e, quando houver analise estruturada, `classification` e `confidence`.
- Requisito/RF/CA coberto: RF-08, RF-09, RF-10, RF-11, RF-12, CA-04, CA-10.
- Evidencia observavel: `RunSpecsFlowSummary` ou contrato equivalente passa a expor summaries proprios para `spec-triage`, `spec-close-and-version` e `spec-audit`, com asserts objetivos nos testes de runner para os campos minimos exigidos.
- Requisito/RF/CA coberto: RF-23, CA-09.
- Evidencia observavel: o envio continua passando por `TelegramDeliveryService` e pelos policies atuais; testes de entrega/retry/chunking existentes seguem cobrindo o caminho central sem regressao.

## Decision log
- 2026-03-23 - Ticket derivado da spec para tratar o gap de contrato antes do redesign editorial - o renderer depende destes dados para cumprir a spec sem texto generico.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
