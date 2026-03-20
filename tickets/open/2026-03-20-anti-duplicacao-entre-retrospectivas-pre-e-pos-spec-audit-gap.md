# [TICKET] Evitar duplicacao entre retrospectivas pre e pos-spec-audit

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-20 01:57Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
- Source requirements (RFs/CAs, when applicable): RF-35, RF-36; CA-17
- Inherited assumptions/defaults (when applicable): a retrospectiva pre-run-all e a primeira responsavel por gaps sistemicos observaveis na derivacao; a retrospectiva pos-`spec-audit` so deve tratar gaps residuais novos; quando util, ela pode referenciar ticket/achado preexistente em vez de reticketar a mesma frente causal.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
  - src/core/runner.ts
  - src/types/workflow-gap-analysis.ts
  - src/integrations/workflow-improvement-ticket-publisher.ts
  - prompts/11-retrospectiva-workflow-apos-spec-audit.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a retrospectiva pos-`spec-audit` ja consegue publicar ou reutilizar ticket transversal, mas nao conhece nenhuma frente causal produzida antes do `/run-all`. Sem contrato de deduplicacao, a introducao da retrospectiva pre-run-all pode abrir tickets automaticos duplicados para a mesma causa sistemica.

## Context
- Workflow area: coordenacao entre retrospectiva pre-run-all e retrospectiva pos-`spec-audit`
- Scenario: uma rodada executa retrospectiva da derivacao antes do `/run-all` e tambem retrospectiva pos-auditoria depois de `spec-audit`
- Input constraints: nao reavaliar a mesma frente causal duas vezes; permitir apenas referencia historica quando a retrospectiva pos-auditoria precisar citar o contexto preexistente

## Problem statement
O mecanismo atual de `workflow-gap-analysis`/publication pos-`spec-audit` nao possui nenhum contrato para reconhecer achados ou tickets publicados pela futura retrospectiva pre-run-all. Assim, mesmo com fingerprinting e reuse no publisher, nada impede que a retrospectiva pos-auditoria reanalise a mesma frente causal como se fosse nova ou tente promover ticket automatico duplicado.

## Observed behavior
- O que foi observado: a publication atual usa apenas o handoff da retrospectiva pos-`spec-audit`; os prompts e tipos nao carregam referencia a achados/tickets pre-run-all; o fluxo de `spec-workflow-retrospective` so conhece gaps residuais pos-implementacao.
- Frequencia (unico, recorrente, intermitente): recorrente assim que a nova retrospectiva pre-run-all for introduzida sem integracao adicional
- Como foi detectado (warning/log/test/assert): leitura do runner, do publisher e do contrato atual de `workflow-gap-analysis`

## Expected behavior
Quando a mesma frente causal ja tiver sido analisada e ticketada na retrospectiva pre-run-all, `spec-workflow-retrospective` deve evitar nova publicacao automatica e, quando necessario, apenas referenciar o ticket ou o achado anterior como contexto historico.

## Reproduction steps
1. Ler `src/core/runner.ts` e localizar a chamada de `publishWorkflowImprovementTicketIfNeeded(...)` dentro da retrospectiva pos-`spec-audit`.
2. Ler `src/integrations/workflow-improvement-ticket-publisher.ts` e confirmar que o reuso atual depende apenas dos dados do proprio candidate/handoff.
3. Verificar que nao existe campo, prompt ou metadata ligando a retrospectiva pos-`spec-audit` a achados/tickets pre-run-all.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts` aciona publication pos-`spec-audit` sem contexto sobre retrospectiva pre-run-all.
  - `src/integrations/workflow-improvement-ticket-publisher.ts` reutiliza ticket apenas quando o candidate da rodada atual coincide com um aberto existente, sem distinguir se a causa ja foi tratada previamente na mesma linhagem.
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `src/types/workflow-gap-analysis.ts` nao incluem referencia a achados/tickets pre-run-all.
- Comparativo antes/depois (se houver): antes = possivel duplicacao causal entre retrospectivas; depois esperado = pos-auditoria so publica ticket novo quando a causa residual for realmente distinta da derivacao pre-run-all

## Impact assessment
- Impacto funcional: backlog sistemico pode ficar duplicado e com causalidade confusa.
- Impacto operacional: o operador perde confianca na diferenciacao entre gap de derivacao e gap residual pos-implementacao.
- Risco de regressao: medio, porque o ajuste cruza duas retrospectivas e a publication compartilhada.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/workflow-gap-analysis.ts`, prompts de retrospectiva, `src/integrations/workflow-improvement-ticket-publisher.ts`, testes associados

## Initial hypotheses (optional)
- O fingerprinting atual pode ser reaproveitado, mas falta transportar contexto de causalidade pre-run-all para a etapa pos-`spec-audit`.

## Proposed solution (optional)
Transportar para a retrospectiva pos-`spec-audit` o conjunto de achados/tickets sistemicos da retrospectiva pre-run-all e adicionar uma regra objetiva de referencia historica versus publicacao nova.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-35, RF-36; CA-17
- Evidencia observavel: testes mostram que `spec-workflow-retrospective` nao abre ticket automatico duplicado quando a mesma frente causal ja foi tratada na retrospectiva pre-run-all e, quando necessario, registra apenas referencia ao ticket/achado existente.

## Decision log
- 2026-03-20 - Ticket aberto a partir da avaliacao da spec - a fase pos-`spec-audit` ja existe, mas ainda nao conhece nenhuma superficie causal da futura retrospectiva pre-run-all.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
