# [TICKET] /target_investigate_case_v2 summary e Telegram não distinguem diagnóstico produzido com warnings

## Metadata
- Status: open
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-13 15:49Z
- Reporter: mapita
- Owner:
- Source: local-run
- Parent ticket (optional): tickets/open/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): post-run diagnosis
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): guiadomus-matricula
- Request ID: output/case-investigation/2026-04-12T16-15-14Z
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable): RF-17a, RF-26, RF-29, CA-07, CA-09
- Inherited assumptions/defaults (when applicable): artefatos e summaries operator-facing devem ser diagnosis-first; publication é tardia e opcional.
- Inherited RNFs (when applicable): reduzir custo cognitivo e deixar a resposta principal entendível por humano em menos de 2 minutos.
- Inherited technical/documentary constraints (when applicable): o runner deve refletir warnings de envelope sem transformar o diagnóstico em falha.
- Inherited pending/manual validations (when applicable): validar em rodada real que Telegram abre com o diagnóstico quando houver envelope divergente.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): a superfície operator-facing ainda presume status binário `success/failure` e usa `round-materialization-failed` para qualquer divergência de artefato, mesmo quando o target já respondeu o caso.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto):

## Context
- Workflow area: `/target_investigate_case_v2` / summary final / trace / Telegram / timing
- Scenario: a rodada real materializou diagnóstico `ok`, mas o Telegram reportou `Resultado: falha`, `Fase final: diagnosis`, `Fase interrompida: preflight` e recomendou revisar artefatos antes de rerodar.
- Input constraints: manter mensagens diagnosis-first, sem esconder warnings de automação; não atravessar publication quando o envelope estruturado não for suficiente para isso.

## Problem statement
As superfícies operator-facing não têm um estado intermediário claro para “diagnóstico produzido com warnings de envelope”. Isso confunde falha operacional com diagnóstico útil e orienta o operador a rerodar em vez de ler a resposta do target.

## Observed behavior
- O que foi observado: o Telegram apresentou a rodada como falha total e listou `round-materialization-failed`.
- Frequência (único, recorrente, intermitente): único observado em rodada real, mas tende a repetir sempre que o target produzir envelope próprio.
- Como foi detectado (warning/log/test/assert): resumo final do Telegram da rodada de 2026-04-12.

## Expected behavior
Quando houver diagnóstico útil ou blocker explícito, o summary final, trace e Telegram devem abrir com o resultado diagnóstico do target e depois listar warnings de envelope/automação. O estado operacional deve diferenciar falha real de orquestração de diagnóstico produzido com automações degradadas.

## Reproduction steps
1. Executar uma rodada v2 que produza `diagnosis.md` e artefatos JSON com envelope não reconhecido pelo runner.
2. Observar a mensagem final do Telegram.
3. Confirmar que a mensagem atual trata divergência de schema como falha e não exibe o diagnóstico como resultado primário.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo final informou `Resultado: falha`, `Motivo de encerramento: round-materialization-failed` e `Fase interrompida: preflight`.
- Warnings/codes relevantes: `artifact-validation-failed`.
- Comparativo antes/depois (se houver): depois, a mensagem deve dizer algo como `diagnóstico produzido com warnings de automação`, listar `diagnosis.md` e sintetizar o veredito quando possível.

## Impact assessment
- Impacto funcional: operador pode ignorar diagnóstico correto.
- Impacto operacional: reruns desnecessários e investigação do problema errado.
- Risco de regressão: médio; a mudança toca summary, trace e Telegram.
- Scope estimado (quais fluxos podem ser afetados): `src/core/target-investigate-case.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts`, testes de bot e trace.

## Initial hypotheses (optional)
- Criar outcome distinto, por exemplo `completed-with-artifact-warnings` ou equivalente interno.
- Renderizar `artifactEnvelopeWarnings` em bloco próprio.
- Corrigir timing/milestone para não reportar `preflight` como fase interrompida quando a preparação executou estágios target-owned.

## Proposed solution (optional)
- Estender o summary final com `artifactInspectionWarnings`.
- Fazer Telegram priorizar `diagnosis.md`/veredito textual quando disponível.
- Garantir que warnings de envelope não sejam confundidos com `failureKind`.

## Closure criteria
- Requisito/RF/CA coberto: RF-26, RF-29, CA-07, CA-09.
- Evidência observável: teste de Telegram mostra mensagem `diagnóstico produzido com warnings` ou equivalente, com links dos artefatos e warnings separados.
- Evidência observável: trace registra warnings de envelope sem marcar `round-materialization-failed` quando há diagnóstico útil.
- Evidência observável: timing/fase interrompida não aponta `preflight` de forma enganosa para falha após execução dos estágios target-owned.

## Decision log
- 2026-04-13 - Separar superfície operator-facing do comportamento core - o usuário precisa receber a leitura certa mesmo quando automações estruturadas ficam degradadas.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
