# [TICKET] Endurecer contrato, contexto e rastreabilidade do ticket transversal de workflow

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-21 18:03Z
- Reporter: Codex
- Owner: Codex
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md
- Parent execplan (optional): execplans/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md
- Parent commit (optional):
- Request ID: N/A - follow-up manual derivado de revisao do ticket pai
- Source spec (when applicable): ../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md
- Source requirements (RFs/CAs, when applicable): n/a - follow-up de qualidade estrutural do ticket transversal automatico aberto a partir desta spec
- Inherited assumptions/defaults (when applicable): o ticket transversal pode nascer tanto da retrospectiva pre-run-all quanto da retrospectiva pos-spec-audit; quando o projeto ativo for externo, o ticket deve ser publicado apenas no repositorio do workflow; o contrato humano do ticket precisa explicitar projeto ativo, repositorio alvo e referencias cross-repo sem depender de contexto oral adicional.
- Workflow root cause (required for workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (workflow retrospectives/audit/review): o publisher compartilhado reaproveita um handoff minimo e texto fixo de pos-auditoria, sem carregar nem renderizar de forma explicita a origem real da retrospectiva, o projeto ativo, a trilha request/response/decision e os campos extras do template de audit/review.
- Remediation scope (workflow retrospectives/audit/review): generic-repository-instruction
- Related artifacts:
  - Request file: N/A - o ticket pai nao preservou a trilha da retrospectiva que o originou
  - Response file: N/A - o ticket pai nao preservou a trilha da retrospectiva que o originou
  - Decision file: N/A - o ticket pai nao preservou a trilha da retrospectiva que o originou e o contrato anterior ainda nao materializava este campo
- Related docs/execplans:
  - tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md
  - ../codex-flow-runner/INTERNAL_TICKETS.md
  - ../codex-flow-runner/tickets/templates/internal-ticket-template.md
  - ../codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md
  - ../codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - ../codex-flow-runner/src/core/runner.ts
  - ../codex-flow-runner/src/integrations/workflow-improvement-ticket-publisher.ts
  - ../codex-flow-runner/src/integrations/workflow-trace-store.ts
  - execplans/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o ticket transversal automatico e a principal superficie de backlog sistemico reaproveitavel do workflow; quando ele nasce com origem ambigua, paths opacos e campos obrigatorios incompletos, a triagem futura perde confianca e aumenta o risco de follow-up mal direcionado.

## Context
- Workflow area: publication e reuso do ticket transversal de workflow
- Scenario: o runner abre automaticamente ticket transversal agregado quando uma retrospectiva sistemica conclui `high confidence`, inclusive em projeto externo com publish no repo do workflow
- Input constraints: preservar deduplicacao e hash do candidato atual; nao quebrar publish same-repo e cross-repo; manter o ticket humano auto-contido para outra IA executar sem contexto oral adicional

## Problem statement
O contrato atual do ticket transversal automatico mistura retrospectiva pre-run-all com wording fixo de pos-auditoria, usa paths humanos ambiguos em cenarios cross-repo, nao preenche de forma canonica os campos extras de audit/review e nao carrega a trilha request/response/decision da etapa que originou o ticket. Isso torna o backlog sistemico menos confiavel e dificulta tanto a leitura humana quanto a execucao futura por outra IA.

## Observed behavior
- O que foi observado: o publisher compartilhado renderiza wording fixo de `workflow-gap-analysis pos-auditoria`; o ticket aberto nao deixa claro qual retrospectiva o originou; referencias a spec e a artefatos de workflow ficam ambiguas em projeto externo; `Workflow root cause` aparece, mas `Smallest plausible explanation` e `Remediation scope` nao; `Request ID` e artefatos de trilha ficam vazios mesmo existindo trace de workflow no runner.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao manual do ticket aberto, do publisher compartilhado, do handoff em `runner.ts` e do contrato de trace do workflow

## Expected behavior
Todo ticket transversal automatico deve explicitar corretamente qual retrospectiva o gerou, qual e o projeto ativo, qual e o repositorio alvo, quais paths humanos pertencem a qual projeto, quais campos extras de audit/review foram preenchidos e qual trilha request/response/decision sustenta o follow-up.

## Reproduction steps
1. Ler `src/core/runner.ts` e confirmar que o mesmo publisher e usado tanto na retrospectiva `spec-ticket-derivation-retrospective` quanto em `spec-workflow-retrospective`.
2. Ler `src/integrations/workflow-improvement-ticket-publisher.ts` e verificar que o texto do ticket assume wording fixo de pos-auditoria.
3. Conferir o ticket pai e observar origem da retrospectiva misturada, referencias cross-repo ambiguas e ausencia de campos/artefatos de rastreabilidade esperados.

## Evidence
- Logs relevantes (trechos curtos e redigidos): revisao manual do ticket pai confirmou mistura entre `spec-ticket-validation-history` e wording fixo de `workflow-gap-analysis pos-auditoria`.
- Warnings/codes relevantes:
  - `src/core/runner.ts` chama `publishWorkflowImprovementTicketIfNeeded(...)` em duas retrospectivas distintas.
  - `src/integrations/workflow-improvement-ticket-publisher.ts` hardcode `spec-workflow-retrospective -> workflow-ticket-publication`, `workflow-gap-analysis pos-auditoria` e fallback textual de `spec + resultado do spec-audit`.
  - `src/types/workflow-improvement-ticket.ts` ja carrega `activeProjectName` e `activeProjectPath`, mas o ticket humano nao os materializa.
  - `src/integrations/workflow-trace-store.ts` gera `requestPath`, `responsePath` e `decisionPath`, mas o contrato atual do ticket transversal nao os preenche.
  - `tickets/templates/internal-ticket-template.md` exige `Smallest plausible explanation` e `Remediation scope`, ausentes no ticket pai automatico.
- Comparativo antes/depois (se houver): antes = ticket transversal automatico com origem/paths/rastreabilidade ambiguos; depois esperado = ticket automatico auto-contido, stage-aware, cross-repo-aware e alinhado ao template canonico

## Impact assessment
- Impacto funcional: a execucao futura do backlog sistemico pode mirar a retrospectiva errada, a spec errada ou o repositorio errado.
- Impacto operacional: o operador e outra IA gastam mais tempo reconstruindo contexto que ja existia no runner.
- Risco de regressao: medio, porque o ajuste toca contrato de handoff, renderer do ticket, dedupe e observabilidade do workflow.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/workflow-improvement-ticket.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/integrations/workflow-trace-store.ts`, `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, prompts de retrospectiva e testes associados

## Initial hypotheses (optional)
- A melhor correcao e separar identidade canonica do ticket para dedupe/hash de uma camada humana de `display paths`/metadados de projeto, e carregar explicitamente a origem da retrospectiva e a trilha request/response/decision no handoff do publisher.

## Proposed solution (optional)
- Tornar o handoff do ticket transversal stage-aware e cross-repo-aware, preservar o `sourceSpecPath` canonico para dedupe, adicionar campos humanos de projeto/contexto/trace, preencher os campos extras de audit/review do template e endurecer os testes de publish same-repo/external-repo/reuse.

## Closure criteria
- Requisito/RF/CA coberto: contrato humano do ticket transversal automatico
- Evidencia observavel: tickets transversais abertos a partir de `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` identificam corretamente a retrospectiva de origem e nao reaproveitam wording de pos-auditoria quando a origem for pre-run-all.
- Requisito/RF/CA coberto: contexto cross-repo e rastreabilidade
- Evidencia observavel: quando o projeto ativo for externo, o ticket automatico explicita projeto ativo, spec de origem com path humano incluindo o projeto, repositorio alvo e referencias cross-repo sem ambiguidade, preservando dedupe/reuse.
- Requisito/RF/CA coberto: conformidade documental de audit/review
- Evidencia observavel: o ticket automatico passa a preencher `Workflow root cause`, `Smallest plausible explanation`, `Remediation scope` e a trilha `Request ID`/`Request file`/`Response file`/campo equivalente a `decision/log`.
- Requisito/RF/CA coberto: seguranca de regressao
- Evidencia observavel: testes automatizados cobrem publicacao same-repo e cross-repo, reuso de ticket aberto e o contrato humano do ticket gerado.

## Decision log
- 2026-03-21 - Ticket aberto manualmente a partir da revisao do ticket pai - a melhoria de heranca de validacoes da spec e real, mas a qualidade estrutural do proprio ticket transversal automatico precisa follow-up dedicado para nao contaminar backlog futuro.
- 2026-03-21 - Implementacao concluida no workflow com contratos, prompts, publisher, runner e testes atualizados para distinguir origem da retrospectiva, qualificar paths cross-repo e publicar rastreabilidade completa do ticket transversal.

## Closure
- Closed at (UTC): 2026-03-21 18:49Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md
- Follow-up ticket (required when `Closure reason: split-follow-up`):
