# [TICKET] /target_investigate_case precisa consumir root-cause-review e bloquear publication baseada so em causa plausivel

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-06 19:19Z
- Reporter: codex
- Owner: workflow-core
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): post-implementation review cross-repo do fluxo `/target_investigate_case`
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): ../guiadomus-matricula
- Request ID: 2026-04-06T19-19-03Z
- Source spec (when applicable): docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md
- Source spec canonical path (when applicable): docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01..RF-08; CA-01..CA-05; publication final continua runner-side; manifests legados precisam continuar aceitos durante rollout manifesto-first.
- Inherited assumptions/defaults (when applicable): `semantic-review` permanece bounded; `causal-debug` continua existindo; `rootCauseReview` sera target-owned e runner-executed; a etapa nova nao deve overfitar um workflow especifico.
- Inherited RNFs (when applicable): endurecer quality gates causais sem reescrever o conteudo semantico target-owned.
- Inherited technical/documentary constraints (when applicable): nao inventar causa do target no runner; manter rollout aditivo e backwards-compatible; bloquear publication positiva quando a causa continuar apenas plausivel.
- Inherited pending/manual validations (when applicable): validar o caso em que `ticket-proposal.json` existe, mas `root-cause-review` bloqueia publication.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): o runner atual ainda trata `causal-debug` como gate suficiente para publication positiva e nao possui uma etapa contratual nem um gate mecanico que distingam causa confirmada de causa apenas plausivel sem falsificacao suficiente.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: ../guiadomus-matricula/docs/workflows/target-case-investigation-causal-debug.md
  - Response file: ../guiadomus-matricula/utils/case-investigation/causal-debug.js
  - Decision file: src/core/target-investigate-case.ts
- Related docs/execplans:
  - docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md
  - ../guiadomus-matricula/docs/specs/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening.md
  - ../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json

## Context
- Workflow area: `/target_investigate_case` / round preparer / publication gating
- Scenario: o target vai passar a separar `causal-debug` de `root-cause-review`, e o runner precisa executar a etapa nova, reconhecer seu contrato e impedir publication positiva quando a causa continuar apenas plausivel ou sem falsificacao suficiente.
- Input constraints: preservar a autoridade semantica target-owned, manter backward compatibility com manifests legados e evitar overfitting ao caso ancora.

## Problem statement
O runner ainda nao possui um contrato nem um gate mecanico para uma etapa `rootCauseReview` target-owned. Sem isso, `/target_investigate_case` continua vulneravel a publication positiva baseada em uma causa plausivel formulada no repositorio alvo, mas ainda nao confirmada de forma adversarial e stage-aware.

## Observed behavior
- O que foi observado:
  - o contrato atual termina em `causal-debug` e `ticket-proposal.json`.
  - `publish_ticket` hoje nao depende de um artefato que distingua `root_cause_confirmed` de `plausible_but_unfalsified`.
  - o quality gate runner-side atual ainda e principalmente editorial, nao causal.
- Frequencia (unico, recorrente, intermitente): recorrente para qualquer target que consiga formular uma causa plausivel forte antes de falsificacao suficiente.
- Como foi detectado (warning/log/test/assert): revisao cross-repo do fluxo `case-investigation` e do publisher runner-side.

## Expected behavior
O runner deve aceitar `rootCauseReview` no manifesto, executar a nova etapa quando declarada, bloquear `publish_ticket` quando a causa ainda nao estiver confirmada e manter rollout seguro para manifests legados.

## Reproduction steps
1. Ler `src/types/target-investigate-case.ts` e confirmar que o contrato atual conhece `semanticReview` e `causalDebug`, mas nao `rootCauseReview`.
2. Ler `src/integrations/target-investigate-case-round-preparer.ts` e confirmar que a rodada termina hoje em `causal-debug` antes da publication runner-side.
3. Ler `src/core/target-investigate-case.ts` e confirmar que a publication positiva ainda nao exige um artefato separado para `root_cause_confirmed` vs `plausible_but_unfalsified`.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - a publication runner-side hoje depende de `ticket-proposal.json`
  - o gate atual nao distingue causa confirmada de causa apenas plausivel
- Comparativo antes/depois (se houver):
  - antes: `causal-debug` basta para chegar a `ticket-proposal.json` e `publish_ticket` quando o target assim recomendar;
  - depois esperado: `root-cause-review` vira precondicao mecanica para publication positiva nos manifests que declararem a etapa nova.

## Impact assessment
- Impacto funcional: tickets target-owned podem continuar sendo publicados com boa forma editorial, mas com base causal ainda insuficientemente falsificada.
- Impacto operacional: o backlog pode receber follow-ups errados ou prematuros, aumentando retrabalho cross-repo.
- Risco de regressao: medio, porque a frente toca tipos, round preparer, core e possivelmente o quality gate do publisher.
- Scope estimado (quais fluxos podem ser afetados): `src/types/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts` e as suites do fluxo.

## Initial hypotheses (optional)
- A menor entrega segura e introduzir a etapa nova como contrato aditivo manifesto-first, bloquear publication positiva nos manifests novos quando o veredito for apenas plausivel e manter fallback legado enquanto o rollout ainda estiver em curso.

## Proposed solution (optional)
- Aceitar `rootCauseReview` no manifesto e nos schemas runner-side.
- Executar a etapa nova no round preparer depois de `causal-debug`.
- Exigir `root_cause_confirmed` e `ticket_readiness=ready` para publication positiva.
- Expandir os testes para o caso em que `ticket-proposal.json` existe, mas a publication precisa ser bloqueada por falta de confirmacao causal.

## Closure criteria
- Requisito/RF/CA coberto: RF-01 / CA-01
- Evidencia observavel: `src/types/target-investigate-case.ts` aceita `rootCauseReview` e os artefatos novos.
- Requisito/RF/CA coberto: RF-02 / CA-02
- Evidencia observavel: `src/integrations/target-investigate-case-round-preparer.ts` executa a etapa nova e sincroniza os artefatos oficiais depois da recomposicao.
- Requisito/RF/CA coberto: RF-03 / RF-04 / CA-03
- Evidencia observavel: `src/core/target-investigate-case.ts` bloqueia `publish_ticket` quando o veredito da etapa nova for `plausible_but_unfalsified` ou `inconclusive`.
- Requisito/RF/CA coberto: RF-04 / RF-07 / CA-04
- Evidencia observavel: os testes do runner cobrem um caso em que `ticket-proposal.json` existe, mas a publication positiva fica bloqueada pela etapa nova.
- Requisito/RF/CA coberto: RF-05 / CA-05
- Evidencia observavel: manifests legados continuam aceitos durante rollout manifesto-first sem quebrar suites existentes.

## Decision log
- 2026-04-06 - Ticket aberto a partir da nova spec cross-repo de hardening epistemico - publication runner-side precisa distinguir ticket bem escrito de causa realmente confirmada.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
