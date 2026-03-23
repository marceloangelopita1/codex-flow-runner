# [TICKET] Endurecer contrato estruturado e validacao editorial do ticket sistemico automatico

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-23 02:58Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable):
- Active project (when applicable):
- Target repository (when applicable):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-02, RF-03, RF-10, RF-11, RF-13, RF-14, RF-21; CA-01, CA-02, CA-03, CA-09
- Inherited assumptions/defaults (when applicable): o novo artefato de autoria pode se chamar `ticketDraft` ou equivalente, desde que seja parseavel, versionavel e obrigatorio quando `publicationEligibility=true`; e preferivel nao publicar ticket automatico algum do que publicar backlog sistemico de baixa qualidade; a analise causal estruturada continua sendo a source of truth para classificacao, confianca e findings, e o rascunho editorial e apenas a camada adicional de handoff humano.
- Inherited RNFs (when applicable): o handoff do ticket automatico precisa permanecer autocontido e verificavel, maximizando a qualidade de cada token produzido e reduzindo retrabalho na triagem futura.
- Inherited technical/documentary constraints (when applicable): manter o fluxo sequencial e nao bloqueante para a spec corrente; preservar a taxonomia atual de `workflow-gap-analysis`, `publicationEligibility`, same-repo/cross-repo em `../codex-flow-runner`, a regra de no maximo 1 ticket transversal por retrospectiva, fingerprints/deduplicacao/rastreabilidade request-response-decision e evitar fallback silencioso para ticket generico quando o contrato de autoria estiver insuficiente.
- Inherited pending/manual validations (when applicable): exercitar um caminho em que o prompt retorne `publicationEligibility=true`, mas o bloco estruturado de autoria do ticket esteja incompleto, e confirmar que o fluxo registra limitacao operacional nao bloqueante sem publicar ticket placeholder generico.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a - derivacao pre-implementacao desta spec
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
  - docs/workflows/codex-quality-gates.md
  - prompts/11-retrospectiva-workflow-apos-spec-audit.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/runner.ts
  - src/integrations/workflow-gap-analysis-parser.ts
  - src/types/workflow-gap-analysis.ts
  - src/types/workflow-improvement-ticket.ts
  - src/integrations/workflow-gap-analysis-parser.test.ts
  - src/core/runner.test.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): hoje o contrato parseavel das retrospectivas nao exige um rascunho editorial estruturado e o runner sintetiza `publicationHandoff` a partir de `summary`, `causalHypothesis`, `benefitSummary`, findings e assumptions completas da spec. Enquanto isso continuar, o workflow pode seguir publicando backlog sistemico semanticamente valido, mas editorialmente inseguro, sem forma observavel de rejeitar rascunhos incompletos.

## Context
- Workflow area: contratos parseaveis das retrospectivas sistemicas e validacao pre-publication
- Scenario: `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` marcam `publicationEligibility=true`, mas ainda nao devolvem nem validam um bloco editorial estruturado para autoria do ticket humano.
- Input constraints: preservar o contrato atual de classificacao causal e seus findings; a correcao nao pode quebrar a publicacao same-repo/cross-repo nem transformar a retrospectiva em etapa bloqueante.

## Problem statement
Os prompts de retrospectiva ainda retornam apenas o bloco `WORKFLOW_GAP_ANALYSIS` com `summary`, `causalHypothesis`, `benefitSummary` e findings. Em seguida, `src/core/runner.ts` monta `publicationHandoff` internamente sem qualquer `ticketDraft` parseavel, e `src/integrations/workflow-gap-analysis-parser.ts` nao tem como invalidar ausencia ou insuficiencia editorial desse handoff. O resultado e um pipeline que sempre chega ao publisher com um contrato humano minimo demais e sem barreira observavel contra ticket placeholder generico.

## Observed behavior
- O que foi observado:
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` exigem apenas `summary`, `causalHypothesis`, `benefitSummary`, findings, artefatos consultados e follow-ups, sem `ticketDraft`.
  - `src/integrations/workflow-gap-analysis-parser.ts` valida somente o bloco `WORKFLOW_GAP_ANALYSIS`.
  - `src/core/runner.ts` cria `publicationHandoff` com `buildWorkflowImprovementTicketHandoffFromGapAnalysis(...)`, extraindo assumptions completas da spec e reaproveitando `benefitSummary` como insumo editorial.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura direta dos prompts, parser e runner; corroborado pela ausencia de qualquer teste que valide um bloco editorial parseavel obrigatorio.

## Expected behavior
Quando `publicationEligibility=true`, ambas as retrospectivas devem retornar um bloco editorial parseavel e versionavel com os campos minimos exigidos pela spec. O runner deve validar esse contrato antes de montar/publicar o ticket e, se o bloco estiver ausente ou materialmente insuficiente, registrar limitacao operacional nao bloqueante e suprimir a publicacao do placeholder.

## Reproduction steps
1. Ler `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` e `prompts/11-retrospectiva-workflow-apos-spec-audit.md`.
2. Confirmar que o bloco parseavel atual nao exige `title`, `problemStatement`, `expectedBehavior`, `proposedSolution`, `relevantAssumptionsDefaults`, `closureCriteria` ou `affectedWorkflowSurfaces`.
3. Ler `src/integrations/workflow-gap-analysis-parser.ts` e `src/core/runner.ts` para verificar que o handoff editorial e montado internamente, sem validacao contratual dedicada.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta triagem documental.
- Warnings/codes relevantes:
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` e `prompts/11-retrospectiva-workflow-apos-spec-audit.md` encerram a resposta exigindo somente `[[WORKFLOW_GAP_ANALYSIS]]`.
  - `src/integrations/workflow-gap-analysis-parser.ts` nao le qualquer campo editorial alem do resumo causal.
  - `src/types/workflow-improvement-ticket.ts` define `WorkflowImprovementTicketHandoff` sem `title`, `problemStatement`, `expectedBehavior`, `proposedSolution`, `relevantAssumptionsDefaults`, `closureCriteria` ou `affectedWorkflowSurfaces`.
  - `src/core/runner.ts:6369-6394` constroi `publicationHandoff` com assumptions extraidas da spec e `benefitSummary`, sem validar um draft humano vindo do prompt.
- Comparativo antes/depois (se houver): antes = `publicationEligibility=true` sempre produz handoff editorial sintetico; depois esperado = `publicationEligibility=true` so habilita publish quando houver bloco editorial valido e completo.

## Impact assessment
- Impacto funcional: o workflow continua elegendo tickets automaticos sem garantir que o backlog publicado seja executavel por outra IA sem releitura do trace bruto.
- Impacto operacional: triagem e follow-up continuam dependendo de interpretacao manual para descobrir titulo, remediacao e aceite corretos.
- Risco de regressao: medio, porque o ajuste toca prompts, parser, runner, tipos compartilhados e contratos de trace/resumo.
- Scope estimado (quais fluxos podem ser afetados): `prompts/11-retrospectiva-workflow-apos-spec-audit.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`, `src/integrations/workflow-gap-analysis-parser.ts`, `src/types/workflow-gap-analysis.ts`, `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts`, testes associados.

## Initial hypotheses (optional)
- O menor corte seguro e separar explicitamente `workflowGapAnalysis` da autoria humana do ticket, exigindo um bloco parseavel adicional so quando `publicationEligibility=true`.

## Proposed solution (optional)
- Introduzir `ticketDraft` ou equivalente no contrato das retrospectivas, propagar esse draft em tipos/handoff, validar presenca e sufiencia material no parser/runner e degradar para limitacao operacional nao bloqueante quando o contrato editorial falhar.

## Closure criteria
- Requisito/RF/CA coberto: RF-02, RF-03, CA-01, CA-02
- Evidencia observavel: `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` passam a exigir, quando `publicationEligibility=true`, um bloco editorial parseavel com `title`, `problemStatement`, `expectedBehavior`, `proposedSolution`, `reproductionSteps`, `impactFunctional`, `impactOperational`, `regressionRisk`, `relevantAssumptionsDefaults`, `closureCriteria` e `affectedWorkflowSurfaces`.
- Requisito/RF/CA coberto: RF-10, RF-11, RF-13, RF-14, CA-03, CA-09
- Evidencia observavel: `src/types/workflow-improvement-ticket.ts`, `src/types/workflow-gap-analysis.ts`, `src/integrations/workflow-gap-analysis-parser.ts` e `src/core/runner.ts` passam a carregar e validar o draft estruturado; `publicationEligibility=true` sem draft valido deixa de gerar publish e vira limitacao operacional nao bloqueante observavel em trace/log/resumo.
- Requisito/RF/CA coberto: RF-21
- Evidencia observavel: testes automatizados demonstram que a nova validacao preserva a taxonomia atual, a semantica de `publicationEligibility`, a sequencialidade do fluxo e a regra de no maximo 1 ticket sistemico por retrospectiva.
- Requisito/RF/CA coberto: validacao manual herdada
- Evidencia observavel: existe um cenario cobrindo `publicationEligibility=true` com draft incompleto, verificando ausencia de ticket placeholder generico e presenca de limitacao operacional nao bloqueante.

## Decision log
- 2026-03-23 - Ticket aberto a partir da triagem da spec - o gap principal esta no contrato/validacao do `ticketDraft`, nao apenas no renderer final do ticket.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
