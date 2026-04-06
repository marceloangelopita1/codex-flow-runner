# [TICKET] target-investigate-case ainda perde causalidade do target e avalia publication com assessment stale

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-06 02:43Z
- Reporter: Codex
- Owner: Codex
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-04-06-target-investigate-case-semantic-confirmation-recomposition-and-publication-boundary-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): local-run
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/guiadomus-matricula
- Request ID: 2026-04-06T01-48-26Z
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-18, RF-35, RF-36, RF-40, RF-41, RF-46, RF-47, RF-48, RF-49; CA-06, CA-07, CA-14, CA-18, CA-19, CA-20, CA-21.
- Inherited assumptions/defaults (when applicable): target-project continua como autoridade semantica; runner continua como autoridade final de publication; `semantic-review` permanece bounded e sem descoberta livre de evidencia.
- Inherited RNFs (when applicable): rastreabilidade formal, trace minimo, anti-overfit e preservacao da fronteira cross-repo.
- Inherited technical/documentary constraints (when applicable): nao inventar causalidade runner-side; nao abrir ticket automatico so por narrativa; nao copiar payload sensivel para o trace; rerun oficial do target apenas via manifesto/entrypoint declarados.
- Inherited pending/manual validations (when applicable): validacao manual ponta a ponta via Telegram autorizado permanece pendente na spec viva.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): execution
- Smallest plausible explanation (audit/review only): o runner ja materializava `semantic-review.result.json`, mas ainda descartava `semanticReview.recomposition` ao normalizar o manifesto rico do target e seguia avaliando `assessment.json` stale, o que mantinha o caso em `runner-limitation`.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T01-48-26Z/semantic-review.request.json
  - Response file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T01-48-26Z/assessment.json
  - Decision file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T01-48-26Z/publication-decision.json
- Related docs/execplans:
  - execplans/2026-04-06-target-investigate-case-semantic-confirmation-recomposition-and-publication-boundary-gap.md
  - /home/mapita/projetos/guiadomus-matricula/docs/specs/2026-04-06-case-investigation-semantic-confirmation-recomposition-and-publication-boundary.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o fluxo ja chegava a `bug_likely` com packet bounded `ready`, mas a publication runner-side ainda lia artefatos pre-confirmacao e escondia a causalidade local sob `runner-limitation`, bloqueando ticket automatico e degradando a fronteira contratual.

## Context
- Workflow area: `/target_investigate_case` / recomposicao oficial / gates de publication.
- Scenario: caso real `guiadomus-matricula` em `investigations/2026-04-06T01-48-26Z`.
- Input constraints: sem descoberta livre, sem alterar a autoridade semantica do target-project e sem relaxar a politica anti-overfit.

## Problem statement
O runner ainda aceitava dois desvios estruturais: descartava `semanticReview.recomposition` ao adaptar o manifesto rico do target-project e tratava `assessment.json` stale como se fosse a verdade final mesmo apos materializar `semantic-review.result.json`. Com isso, um caso com causalidade local forte continuava aparecendo como `runner-limitation`.

## Observed behavior
- O que foi observado:
  - `bug_likely` com `review_readiness.status="ready"` caia em `overall_outcome="runner-limitation"` no teste do runner.
  - o manifesto rico do piloto carregava `semanticReview.recomposition`, mas o contrato normalizado usado em runtime nao preservava esse bloco.
  - o `round-preparer` nao tinha cobertura provando o rerun oficial do target apos a materializacao do resultado bounded.
- Frequencia (unico, recorrente, intermitente): recorrente para targets que emitem manifesto rico do piloto.
- Como foi detectado (warning/log/test/assert): leitura do caso real, inspeção de `src/types/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts` e teste `evaluateTargetInvestigateCaseRound aceita bug_likely runner-side com packet ready e semantic-review.result.json ausente`.

## Expected behavior
O runner deve preservar a causalidade declarada pelo target-project, tratar ausencia de `semantic-review.result.json` apenas como bloqueio de confirmacao/publication, rerodar a recomposicao oficial do target quando o manifesto a declarar e rejeitar `assessment` stale apos confirmacao bounded valida.

## Reproduction steps
1. Ler o manifesto rico do piloto e observar `semanticReview.recomposition`.
2. Avaliar o caso real `2026-04-06T01-48-26Z` ou o teste antigo do runner com `bug_likely` + packet `ready` + resultado ausente.
3. Confirmar que o runner classificava o desfecho como `runner-limitation` e nao tinha rerun oficial do target.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - N/A
- Warnings/codes relevantes:
  - `SEMANTIC_REVIEW_RESULT_MISSING`
  - `semantic_review_result_missing`
- Comparativo antes/depois (se houver):
  - antes: `bug_likely` + packet `ready` podia terminar como `runner-limitation`.
  - depois: o mesmo cenario fica `inconclusive-case` com causalidade `target-project`, e a recomposicao oficial e obrigatoria quando declarada.

## Impact assessment
- Impacto funcional: bloqueava ticket automatico correto e invertia a autoridade semantica do caso.
- Impacto operacional: mantinha o runner lendo artefatos stale e escondia a real necessidade de recomposicao no target.
- Risco de regressao: medio, porque toca manifesto, `round-preparer` e avaliacao final.
- Scope estimado (quais fluxos podem ser afetados): `target-investigate-case` no runner e qualquer target compatível com manifesto rico.

## Initial hypotheses (optional)
- o contrato da capability evoluiu no target mais rapido do que a normalizacao consumida pelo runner;
- faltava um guardrail runner-side contra `assessment` stale apos confirmacao bounded.

## Proposed solution (optional)
- preservar `semanticReview.recomposition` e `semanticReview.symptoms` na normalizacao do manifesto rico;
- rerodar o entrypoint oficial do target apos materializar `semantic-review.result.json`;
- validar `assessment` recomposto e ajustar os testes para exigir `inconclusive-case` em vez de `runner-limitation` quando a limitacao nao for do runner.

## Closure criteria
- Requisito/RF/CA coberto: RF-46 / CA-18
- Evidencia observavel: `src/core/target-investigate-case.test.ts` valida que `bug_likely` com packet `ready` e resultado ausente permanece `inconclusive-case`, sem degradar para `runner-limitation`.
- Requisito/RF/CA coberto: RF-47 / RF-48 / CA-19
- Evidencia observavel: `src/integrations/target-investigate-case-round-preparer.test.ts` cobre o rerun oficial do target, espelha o `assessment` recomposto e `loadTargetInvestigateCaseManifest` preserva `semanticReview.recomposition`.
- Requisito/RF/CA coberto: RF-49 / CA-20
- Evidencia observavel: `src/core/target-investigate-case.test.ts` rejeita explicitamente `assessment` stale apos `semantic-review.result.json` confirmado.

## Decision log
- 2026-04-06 - Corrigir no runner a perda de `semanticReview.recomposition` ao adaptar o manifesto rico do target.
- 2026-04-06 - Fechar o loop no `round-preparer` usando apenas a recomposicao oficial do target-project.

## Closure
- Closed at (UTC): 2026-04-06 03:18Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-04-06-target-investigate-case-semantic-confirmation-recomposition-and-publication-boundary-gap.md`; commit: mesmo changeset local ainda nao commitado.
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): n/a
- Closure evidence:
  - `npm run check` -> `exit 0`
  - `npm test` -> `exit 0`
  - `npx tsx --test src/core/target-investigate-case.test.ts` -> `exit 0`
  - `npx tsx --test src/integrations/target-investigate-case-round-preparer.test.ts` -> `exit 0`
