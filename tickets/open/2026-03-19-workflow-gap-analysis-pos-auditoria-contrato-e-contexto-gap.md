# [TICKET] Materializar workflow-gap-analysis pos-auditoria com contrato, contexto novo e criterio causal

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 22:03Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-24; CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-13
- Inherited assumptions/defaults (when applicable): as subetapas canonicas sao `workflow-gap-analysis` e `workflow-ticket-publication`; a analise deve iniciar em contexto novo em relacao a `spec-audit`; o insumo principal da analise sao os follow-up tickets funcionais abertos por `spec-audit`; na ausencia desses tickets, a analise usa a spec e o resultado da auditoria como fallback; `high confidence` e exigencia minima para ticket automatico; `medium confidence` gera apenas hipotese em trace/log e resumo final; `low confidence` nao gera ticket automatico.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - src/core/runner.ts
  - src/core/spec-ticket-validation.ts
  - src/integrations/codex-client.ts
  - prompts/08-auditar-spec-apos-run-all.md
  - prompts/09-validar-tickets-derivados-da-spec.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o repositorio ja possui uma sessao stateful e um parser para `spec-ticket-validation`, mas ainda nao existe qualquer contrato especifico para analisar gaps residuais apos `spec-audit`; sem isso, o fluxo continuaria inferindo backlog sistemico a partir do lugar errado.

## Context
- Workflow area: contrato de analise sistemica pos-`spec-audit`
- Scenario: a auditoria final encontrou gaps residuais reais e o runner precisa avaliar se o workflow atual do `codex-flow-runner` contribuiu materialmente para esses gaps
- Input constraints: usar contexto novo em relacao a `spec-audit`; priorizar follow-up tickets funcionais da auditoria; reler fontes canonicas do workflow antes de escalar para backlog sistemico

## Problem statement
Nao existe hoje uma etapa dedicada `workflow-gap-analysis`. O unico contrato estruturado para causa sistêmica esta acoplado ao `spec-ticket-validation`, que acontece antes de `/run-all` e analisa o pacote derivado de tickets, nao os gaps residuais apos a auditoria funcional da spec implementada.

## Observed behavior
- O que foi observado: `src/integrations/codex-client.ts` so conhece prompts de spec para `spec-triage`, `spec-close-and-version` e `spec-audit`, alem da sessao dedicada de `spec-ticket-validation`; `src/core/runner.ts` publica ticket sistemico a partir de `SpecTicketValidationResult`; nao existem prompts `workflow-gap-analysis` ou `workflow-ticket-publication`; nao ha parser/contrato para `high | medium | low confidence` na retrospectiva pos-auditoria.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): busca textual, leitura de `runner`, `codex-client` e prompts

## Expected behavior
Depois de `spec-audit`, a retrospectiva deve executar `workflow-gap-analysis` em contexto novo, usando como insumo principal os follow-up tickets funcionais da auditoria e, na falta deles, a propria spec e o resultado do audit; a analise deve distinguir `high`, `medium` e `low confidence`, registrar limitacao operacional nao bloqueante em falha tecnica e somente habilitar publicacao automatica quando houver evidência razoável de contribuição sistêmica.

## Reproduction steps
1. Buscar `workflow-gap-analysis` e `workflow-ticket-publication` em `src/` e `prompts/`.
2. Ler `src/integrations/codex-client.ts` e confirmar que nao existe prompt, parser ou sessao dedicada para retrospectiva sistemica pos-auditoria.
3. Ler `src/core/runner.ts` e confirmar que a coleta de gaps sistemicos depende de `SpecTicketValidationResult`, antes de `spec-audit`.
4. Ler `prompts/09-validar-tickets-derivados-da-spec.md` e confirmar que o contrato atual valida tickets derivados, nao gaps residuais auditados.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/integrations/codex-client.ts` mapeia `spec-audit` para `prompts/08-auditar-spec-apos-run-all.md` e nao possui prompt/stage para retrospectiva pos-auditoria.
  - `src/core/runner.ts` executa `publishWorkflowImprovementTicketIfNeeded(...)` dentro da etapa `spec-ticket-validation`.
  - `src/core/spec-ticket-validation.ts` e `prompts/09-validar-tickets-derivados-da-spec.md` tratam o pacote derivado de tickets antes da implementacao, nao follow-ups residuais apos a auditoria.
  - Nao ha qualquer referencia em `src/` a insumos do tipo "follow-up tickets da auditoria" nem fallback de "spec + resultado do audit" para analise sistemica.
- Comparativo antes/depois (se houver): antes = causa sistêmica inferida antes de `/run-all`; depois esperado = analise causal separada e posterior a `spec-audit`

## Impact assessment
- Impacto funcional: tickets sistemicos podem ser abertos com base em evidência errada ou antes de saber se ainda existem gaps residuais reais.
- Impacto operacional: o workflow perde precisão causal e tende a misturar melhoria de backlog derivado com aprendizado sistemico do runner.
- Risco de regressao: medio, porque introduz nova etapa stateful, contrato estruturado e critérios de confiança no fluxo de spec.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/integrations/codex-client.ts`, novos prompts/parsers/tipos de retrospectiva, testes de `runner` e de cliente/parser

## Initial hypotheses (optional)
- Parte da infraestrutura de sessao stateful de `spec-ticket-validation` pode ser reaproveitada, mas o prompt e o parser da retrospectiva precisam nascer separados para evitar heranca indevida de semantica.

## Proposed solution (optional)
Criar contrato dedicado de `workflow-gap-analysis`, com prompt estruturado, parser/tipos proprios, insumos explicitos da auditoria e regras observaveis para `high`, `medium`, `low` e `operational-limitation`.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-05, RF-06, RF-07; CA-04, CA-05
- Evidencia observavel: o fluxo passa a ter prompt e contrato dedicados para `workflow-gap-analysis`, iniciados em contexto novo em relacao a `spec-audit`, e `workflow-ticket-publication` so recebe execucao quando a analise retornar elegibilidade com `high confidence`.
- Requisito/RF/CA coberto: RF-08, RF-09, RF-10, RF-11, RF-12, RF-13; CA-08, CA-09
- Evidencia observavel: testes mostram que a analise usa follow-up tickets funcionais abertos por `spec-audit` como insumo principal, cai para `spec + resultado do audit` como fallback e orienta a leitura inicial de `AGENTS.md`, docs canonicos e `prompts/` do `codex-flow-runner`, expandindo para runner/orquestracao so quando necessario.
- Requisito/RF/CA coberto: RF-14, RF-15, RF-16, RF-17, RF-18, RF-24; CA-06, CA-07, CA-13
- Evidencia observavel: o contrato estruturado diferencia `high`, `medium` e `low confidence`, nao abre ticket automatico para `medium` ou `low`, registra apenas hipotese sistemica em `medium`, bloqueia sugestoes meramente de enfase e registra falha tecnica da analise como limitacao operacional nao bloqueante.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - ainda nao existe contrato pos-auditoria para diagnostico causal do workflow; a infraestrutura atual esta toda ancorada no `spec-ticket-validation`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
