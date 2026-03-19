# [TICKET] Implementar workflow-gap-analysis pos-spec-audit com insumos corretos, confianca explicita e leitura de dois contextos

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 20:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-05, RF-06, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-17, RF-18; CA-04, CA-06, CA-07, CA-08, CA-09
- Inherited assumptions/defaults (when applicable): `workflow-gap-analysis` e uma subetapa distinta; deve iniciar em contexto novo em relacao a `spec-audit`; o insumo principal sao os follow-up tickets funcionais abertos por `spec-audit`; na falta deles, usar spec + resultado da auditoria como fallback; em projeto externo, considerar tanto o projeto auditado quanto `../codex-flow-runner`.
- Workflow root cause (when applicable): execution
- Workflow root cause rationale (when applicable): o repositorio ainda nao materializou nenhuma etapa pos-`spec-audit` que releia a spec, use follow-up funcional como insumo principal e produza diagnostico sistemico com `high | medium | low confidence`.
- Remediation scope (when applicable): local
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - src/core/runner.ts
  - src/integrations/codex-client.ts
  - src/integrations/workflow-improvement-ticket-publisher.ts
  - prompts/
  - AGENTS.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): sem `workflow-gap-analysis` pos-`spec-audit`, o sistema nao consegue distinguir aprendizado sistemico reaproveitavel de simples lacuna local da spec, e continua olhando cedo demais para o problema.

## Context
- Workflow area: subetapa `workflow-gap-analysis` da retrospectiva sistemica
- Scenario: `spec-audit` encontrou gaps residuais reais e o runner precisa avaliar se o proprio workflow do `codex-flow-runner` contribuiu materialmente para a recorrencia
- Input constraints: iniciar em contexto novo; usar follow-up funcional da auditoria como insumo principal; reler explicitamente a spec e os artefatos da auditoria; em projeto externo, considerar o projeto auditado e `../codex-flow-runner`

## Problem statement
Nao existe hoje nenhum contrato operacional para `workflow-gap-analysis`. A unica logica reaproveitavel de "gap sistemico" esta acoplada ao `spec-ticket-validation`, antes do `/run-all`, e opera sobre snapshots do gate anterior. Isso nao atende o que a spec aprovada quer: uma analise posterior ao `spec-audit`, com insumos corretos, leitura direcionada das fontes canonicas do workflow e semantica explicita de `high | medium | low confidence`.

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts:5062-5226` coleta/publica gaps sistemicos apenas a partir de `SpecTicketValidationResult`.
  - `src/integrations/codex-client.ts` nao possui estagio/sessao para `workflow-gap-analysis`.
  - O diretorio `prompts/` nao possui prompt dedicado para a analise pos-`spec-audit`.
  - A spec aprovada exige duas subetapas com prompts separados e contexto novo para a analise, mas isso ainda nao foi materializado.
- Frequencia (unico, recorrente, intermitente): recorrente para toda rodada que precise de retrospectiva sistemica pos-auditoria
- Como foi detectado (warning/log/test/assert): leitura de codigo, ausencia de prompts dedicados e releitura da spec aprovada

## Expected behavior
Quando `spec-audit` encontrar gaps residuais reais, o runner deve iniciar `workflow-gap-analysis` em contexto novo, reler explicitamente a spec e os artefatos relevantes da auditoria, usar os follow-up tickets funcionais como insumo principal e produzir diagnostico com `high | medium | low confidence` sobre contribuicao sistemica do workflow atual. Em projeto externo, a analise deve comparar o problema do projeto auditado com as instrucoes e contratos do `codex-flow-runner`.

## Reproduction steps
1. Ler `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:50-71`.
2. Ler `src/core/runner.ts:5062-5226` e confirmar que a logica sistemica atual so olha para `spec-ticket-validation`.
3. Ler `src/integrations/codex-client.ts` e verificar a ausencia de sessao/prompt para `workflow-gap-analysis`.
4. Listar `prompts/` e confirmar que nao existe prompt dedicado para essa subetapa.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts:5062-5226`
  - `src/integrations/codex-client.ts`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:50-71`
  - ausencia de prompt dedicado em `prompts/`
- Comparativo antes/depois (se houver): antes = diagnostico sistemico nasce do gate pre-`/run-all`; depois esperado = nasce de gaps residuais pos-`spec-audit`, com contexto novo e leitura dos artefatos certos

## Impact assessment
- Impacto funcional: a retrospectiva sistemica nao consegue usar seu insumo canonico nem diferenciar `high`, `medium` e `low confidence` no momento certo.
- Impacto operacional: faltam hipotese sistemica observavel e criterio reaproveitavel para abrir ticket automatico so quando houver evidencia forte.
- Risco de regressao: medio, porque envolve novo prompt, nova sessao stateful e novos testes de fluxo pos-auditoria.
- Scope estimado (quais fluxos podem ser afetados): runner pos-`spec-audit`, cliente Codex, prompts dedicados, summary final da retrospectiva, cenarios cross-repo

## Initial hypotheses (optional)
- O contrato de analise precisa ser parseavel o suficiente para alimentar a etapa de publicacao sem deixar a decisao de ticket automatico implcita.
- O desenho deve evitar depender de thread anterior de `spec-audit`; a analise precisa conseguir rodar a partir dos artefatos persistidos.

## Proposed solution (optional)
- Criar prompt e contrato dedicados para `workflow-gap-analysis`, com contexto novo, leitura direcionada e saida estruturada com nivel de confianca e justificativa causal.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-05, RF-06; CA-04
- Evidencia observavel: existe prompt/sessao dedicados para `workflow-gap-analysis`, separados de `spec-audit` e iniciados em contexto novo.
- Requisito/RF/CA coberto: RF-08, RF-09, RF-10, RF-11, RF-12, RF-13; CA-08, CA-09
- Evidencia observavel: a analise reler explicitamente a spec e os artefatos relevantes da auditoria, usa follow-up tickets funcionais como insumo principal e, em projeto externo, considera tanto o projeto auditado quanto `../codex-flow-runner`, priorizando `AGENTS.md`, instrucoes canonicas e `prompts/`.
- Requisito/RF/CA coberto: RF-14, RF-15, RF-17, RF-18; CA-06, CA-07
- Evidencia observavel: a saida da analise diferencia `high`, `medium` e `low confidence`, nao abre ticket automatico para `medium`/`low` nem para sugestao meramente de enfase, e registra hipotese sistemica observavel quando a confianca for `medium`.

## Decision log
- 2026-03-19 - Ticket aberto a partir da releitura da spec aprovada - o repositorio ainda nao possui `workflow-gap-analysis` pos-`spec-audit`, embora essa seja a base causal da retrospectiva sistemica.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

