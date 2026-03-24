# [TICKET] Observabilidade e documentacao ainda nao distinguem entrada por validacao em `run-specs`

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-24 17:56Z
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
- Source spec (when applicable): docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md
- Source spec canonical path (when applicable): docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-15, RF-16, RF-17, RF-18, RF-19; CA-08, CA-11.
- Inherited assumptions/defaults (when applicable): a familia observavel continua sendo `run-specs`; a diferenca entre retriagem completa e retomada pela validacao deve aparecer por metadata de entrada, nao por criacao de um segundo fluxo; a primeira versao privilegia clareza operacional em texto simples.
- Inherited RNFs (when applicable): observabilidade explicita do comando de origem e do ponto de entrada; timings devem refletir apenas etapas realmente executadas; atualizacao de help textual, README e documentacao operacional como parte do aceite; preservar baixo risco de escopo e semantica existente de `/run_specs`.
- Inherited technical/documentary constraints (when applicable): resumo final, milestone, traces e `/status` devem distinguir explicitamente entrada por `/run_specs_from_validation`; o resumo final deve manter `run-specs` como familia unica; a variante iniciada pela validacao nao deve exibir `spec-triage` como etapa concluida; a documentacao da primeira versao permanece textual, sem CTA novo em `/specs`.
- Inherited pending/manual validations (when applicable): `npm test`; `npm run check`; cobertura direcionada para `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` com asserts de summary/status/timing para a variante iniciada pela validacao; validacao manual para confirmar no `/status` e no resumo final a identificacao explicita da rodada via `/run_specs_from_validation`.
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
  - tickets/templates/internal-ticket-template.md
  - docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P1 porque a retomada pela validacao, mesmo depois de implementada, continuaria ambigua sem metadados observaveis de comando de origem e ponto de entrada; isso degrada suporte operacional e dificulta aceite da propria spec.

## Context
- Workflow area: contratos de summary/status/trace/timing de `run-specs`, help do bot e documentacao publica.
- Scenario: a spec exige continuar tratando a rodada como `run-specs`, mas com distincao explicita entre entrada por `spec-triage` e entrada por `spec-ticket-validation`.
- Input constraints: manter renderer textual do Telegram, nao criar familia paralela de fluxo, nao inflar o escopo com novo botao em `/specs`.

## Problem statement
O contrato atual de observabilidade de `run-specs` nao registra metadados suficientes para distinguir o comando de origem nem o ponto de entrada do fluxo. O resumo final, o milestone de triagem, o `/status`, os traces e o modelo `RunSpecsFlowSummary` continuam assumindo implicitamente que a rodada veio de `/run_specs` e passou por `spec-triage`; alem disso, o help e o README ainda nao documentam a diferenca entre retriagem completa e continuidade pela validacao.

## Observed behavior
- O que foi observado: `RunSpecsFlowSummary` modela `flow`, `outcome`, `finalStage`, `completionReason`, timings e blocos de fase, mas nao tem campos para `sourceCommand` ou `entryPoint`. `buildRunSpecsOverviewLines`, `buildRunSpecsTriageMilestoneMessage` e `buildStatusReply` nao exibem metadados de entrada. As ordens de timing do Telegram continuam incluindo `spec-triage` como fase conhecida da familia `run-specs`. O help e o README documentam apenas `/run_specs`.
- Frequencia (unico, recorrente, intermitente): recorrente em toda superficie observavel de `run-specs`.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.test.ts` e `README.md`.

## Expected behavior
O modelo de dados, as mensagens do Telegram, o `/status`, os traces e a documentacao devem identificar explicitamente quando uma rodada `run-specs` entrou por `/run_specs_from_validation` em `spec-ticket-validation`, sem criar um fluxo paralelo. Os timings da variante iniciada pela validacao devem refletir apenas as etapas executadas, omitindo `spec-triage` do conjunto concluido, e o help/README/documentacao operacional devem explicar claramente a diferenca entre retriagem e continuidade da validacao.

## Reproduction steps
1. Ler `RunSpecsFlowSummary` em `src/types/flow-timing.ts` e confirmar a ausencia de `sourceCommand` e `entryPoint`.
2. Ler `buildRunFlowSummaryMessage`, `buildRunSpecsOverviewLines`, `buildRunSpecsTriageMilestoneMessage` e `buildStatusReply` em `src/integrations/telegram-bot.ts` e confirmar a ausencia de metadados de entrada.
3. Ler `START_REPLY_LINES` em `src/integrations/telegram-bot.ts` e `README.md` e confirmar que apenas `/run_specs` esta documentado.
4. Ler `buildRunSpecsFlowSummary` e traces associados em `src/core/runner.ts` e confirmar que a familia `run-specs` nao carrega distincao entre comando de origem e ponto de entrada.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/types/flow-timing.ts`: `RunSpecsFlowSummary` nao registra `sourceCommand` nem `entryPoint`.
  - `src/integrations/telegram-bot.ts`: overview, milestone, status e help nao distinguem a entrada por validacao.
  - `src/core/runner.ts`: `buildRunSpecsFlowSummary` nao popula metadados de origem; o milestone atual de triagem e apresentado como `/run_specs`.
  - `README.md`: documenta apenas `/run_specs` como porta de entrada do fluxo de spec.
- Comparativo antes/depois (se houver): antes = observabilidade ambigua e documentacao incompleta; depois esperado = round-trip observavel e documentado para a nova entrada sem duplicar a taxonomia de fluxo.

## Impact assessment
- Impacto funcional: a implementacao da nova entrada fica parcialmente invisivel para o operador e para o aceite observavel da spec.
- Impacto operacional: suporte e diagnostico podem interpretar uma retomada pela validacao como retriagem completa.
- Risco de regressao: medio, porque toca contratos de summary/timing/status, traces, renderer do Telegram e documentacao.
- Scope estimado (quais fluxos podem ser afetados): `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `README.md` e eventuais docs operacionais relacionadas ao fluxo de spec.

## Initial hypotheses (optional)
- O ajuste minimo seguro e ampliar o contrato de `run-specs` com metadata de origem (`sourceCommand`, `entryPoint`) e adaptar renderer/status/timing para renderizar a variante iniciada pela validacao sem bifurcar o fluxo.

## Proposed solution (optional)
Nao obrigatorio. Direcao concreta: adicionar metadata de comando de origem e ponto de entrada ao summary/trace; adaptar milestone, resumo final e `/status`; ajustar renderizacao de timing para nao listar `spec-triage` quando a rodada entrou pela validacao; documentar o comando no help e no README.

## Closure criteria
- Requisito/RF/CA coberto: RF-15, RF-16, RF-17, RF-18; CA-08, CA-11.
- Evidencia observavel: `RunSpecsFlowSummary` e contratos correlatos passam a registrar, no minimo, `sourceCommand` (`/run_specs` ou `/run_specs_from_validation`) e `entryPoint` (`spec-triage` ou `spec-ticket-validation`); milestone, resumo final, traces e `/status` exibem essa distincao explicitamente; a variante iniciada pela validacao nao marca `spec-triage` como etapa concluida nos timings.
- Requisito/RF/CA coberto: RF-19.
- Evidencia observavel: help textual do bot, `README.md` e documentacao operacional do fluxo passam a documentar `/run_specs_from_validation` e a diferenca semantica entre retriagem completa e continuidade da validacao.
- Requisito/RF/CA coberto: validacoes herdadas da spec.
- Evidencia observavel: `npm test` e `npm run check` concluem sem regressao; `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` passam a ter asserts objetivos para summary/status/timing/documentacao da nova entrada; a validacao manual de `/status` e resumo final fica explicitamente coberta por este ticket.

## Decision log
- 2026-03-24 - Ticket aberto separado do gap funcional principal para isolar risco de contrato observavel/documental - a nova porta de entrada so fica operacionalmente aceitavel quando status, resumo, traces e docs distinguem a origem da rodada.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
