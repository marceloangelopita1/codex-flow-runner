# [TICKET] Introduzir spec-ticket-derivation-retrospective antes do /run-all

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-20 01:57Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
- Source requirements (RFs/CAs, when applicable): RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-32, RF-33, RF-34; CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-16
- Inherited assumptions/defaults (when applicable): `spec-ticket-validation` continua como gate funcional canonico; a nova etapa pre-run-all e `spec-ticket-derivation-retrospective`; ela e sempre nao bloqueante; sua ativacao depende do historico completo de gaps revisados do gate funcional; em projeto externo a fase pre-run-all e read-only sobre o projeto alvo; a mesma taxonomia/confianca da retrospectiva pos-`spec-audit` deve ser reutilizada.
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
  - src/types/flow-timing.ts
  - src/integrations/codex-client.ts
  - src/integrations/workflow-trace-store.ts
  - src/integrations/telegram-bot.ts
  - src/types/workflow-gap-analysis.ts
  - src/integrations/workflow-improvement-ticket-publisher.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o fluxo `/run_specs` ainda salta de `spec-ticket-validation` direto para `spec-close-and-version` ou encerra em `NO_GO`, sem a etapa pre-run-all aprovada na spec. Isso impede separar backlog funcional do projeto alvo de aprendizado sistemico do runner antes de consumir a fila real.

## Context
- Workflow area: `/run_specs` orchestration, observability e publication pre-run-all
- Scenario: a validacao funcional do pacote derivado encontra ou revisa gaps e o runner precisa decidir se executa uma retrospectiva sistemica separada antes de `spec-close-and-version` e `/run-all`
- Input constraints: manter fluxo sequencial; nao tornar a nova etapa bloqueante; reutilizar taxonomia/confianca e publication cross-repo ja existentes quando fizer sentido

## Problem statement
O runner atual nao possui o stage `spec-ticket-derivation-retrospective`. `runSpecsAndRunAll(...)` encerra imediatamente em `spec-ticket-validation` quando o veredito e `NO_GO` e, quando o veredito e `GO`, segue direto para `spec-close-and-version`, sem analisar o historico revisado do gate funcional, sem motivo explicito de skip, sem `finalStage` proprio e sem contexto pre-run-all dedicado para `derivation-gap-analysis` e `derivation-ticket-publication`.

## Observed behavior
- O que foi observado: `src/core/runner.ts` retorna em `NO_GO` com `finalStage: "spec-ticket-validation"` e no caminho `GO` executa `spec-close-and-version` logo em seguida; `SpecFlowStage`, `RunSpecsFlowTimingStage` e `WorkflowTraceStage` nao reconhecem `spec-ticket-derivation-retrospective`; o unico prompt de retrospectiva sistemica disponivel e `spec-workflow-retrospective`, pos-`spec-audit`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura objetiva de `runner`, `types`, `codex-client`, `workflow-trace-store` e `telegram-bot`

## Expected behavior
Depois de `spec-ticket-validation`, o runner deve decidir de forma observavel se executa ou pula `spec-ticket-derivation-retrospective`, usando o historico completo do gate funcional. Quando executada, a fase deve rodar em contexto novo, reutilizar a taxonomia/confianca da retrospectiva pos-`spec-audit`, poder publicar no maximo 1 ticket transversal agregado e nunca alterar o desfecho funcional do projeto alvo.

## Reproduction steps
1. Ler `src/core/runner.ts` em `runSpecsAndRunAll(...)`.
2. Confirmar que o caminho `NO_GO` retorna antes de qualquer etapa intermediaria entre `spec-ticket-validation` e o encerramento da rodada.
3. Confirmar que o caminho `GO` segue diretamente para `spec-close-and-version`.
4. Ler `src/integrations/codex-client.ts`, `src/types/flow-timing.ts` e `src/integrations/workflow-trace-store.ts` e verificar a ausencia do stage `spec-ticket-derivation-retrospective`.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts` encerra em `spec-ticket-validation` quando o veredito e `NO_GO` e pula direto para `spec-close-and-version` quando o veredito e `GO`.
  - `src/types/flow-timing.ts` modela apenas `spec-triage`, `spec-ticket-validation`, `spec-close-and-version`, `run-all`, `spec-audit` e `spec-workflow-retrospective`.
  - `src/integrations/codex-client.ts` nao tem stage nem prompt dedicado para a retrospectiva pre-run-all.
  - `src/integrations/workflow-trace-store.ts` nao aceita `spec-ticket-derivation-retrospective` como stage nomeado.
  - `src/integrations/telegram-bot.ts` nao consegue distinguir a retrospectiva da derivacao no resumo final.
  - `src/types/workflow-gap-analysis.ts`, `src/core/runner.ts` e `src/integrations/workflow-improvement-ticket-publisher.ts` ja oferecem taxonomia, confianca, degradacao nao bloqueante e publication cross-repo para a retrospectiva pos-`spec-audit`, indicando base reaproveitavel.
- Comparativo antes/depois (se houver): antes = nao existe etapa pre-run-all e o fluxo funcional absorve toda a causalidade; depois esperado = etapa explicita, nao bloqueante e observavel entre `spec-ticket-validation` e `spec-close-and-version`

## Impact assessment
- Impacto funcional: a fila real pode ser consumida sem separar com clareza o que e backlog funcional do projeto alvo e o que e backlog sistemico do runner.
- Impacto operacional: faltam sinais observaveis de execucao/skip, fase final e limitacoes operacionais da retrospectiva pre-run-all.
- Risco de regressao: alto, porque a mudanca toca orquestracao central, tipos compartilhados, prompt/stage mapping, traces, resumo final e publication.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/codex-client.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, prompts dedicados, testes associados

## Initial hypotheses (optional)
- A infraestrutura de `workflow-gap-analysis` e `workflow-ticket-publication` pos-`spec-audit` pode ser reaproveitada, mas falta uma orquestracao pre-run-all com insumos e regras de ativacao diferentes.

## Proposed solution (optional)
Introduzir `spec-ticket-derivation-retrospective` como novo stage nomeado de `/run_specs`, com duas subetapas (`derivation-gap-analysis` e `derivation-ticket-publication`), contexto proprio, sinais explicitos de skip/execucao, degradacao para limitacao operacional nao bloqueante e `finalStage` condicional quando a rodada terminar antes do `/run-all`.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-32, RF-33, RF-34; CA-01, CA-02, CA-03, CA-04, CA-16
- Evidencia observavel: testes de `runner` cobrem os cenarios `GO` com gap revisado, `NO_GO` com historico estruturado suficiente, skip por ausencia de gaps revisados e skip por insuficiencia de insumos estruturados; `finalStage`, `completionReason`, timing e milestone refletem `spec-ticket-derivation-retrospective` ou o motivo explicito de skip.
- Requisito/RF/CA coberto: RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19; CA-05, CA-06, CA-07, CA-09, CA-10
- Evidencia observavel: existe prompt/stage dedicado de `derivation-gap-analysis` em contexto novo, com releitura da spec, pacote final de tickets derivados, historico completo do gate funcional e fontes canonicas do `codex-flow-runner`; parser/tipos validam a mesma taxonomia/confianca da retrospectiva pos-`spec-audit`.
- Requisito/RF/CA coberto: RF-20, RF-21, RF-22, RF-23, RF-24, RF-25; CA-08, CA-11
- Evidencia observavel: publication cria ou reutiliza no maximo 1 ticket transversal agregado por rodada, direcionado ao repo atual ou `../codex-flow-runner` conforme o projeto ativo; falhas de analise/publication viram `operational-limitation` nao bloqueante com trace/log/resumo; em projeto externo nao ha write-back em artefatos do projeto alvo.

## Decision log
- 2026-03-20 - Ticket aberto a partir da avaliacao da spec - a nova etapa pre-run-all aprovada ainda nao existe na orquestracao, embora haja infra parcial reaproveitavel de taxonomia/publication na retrospectiva pos-`spec-audit`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
