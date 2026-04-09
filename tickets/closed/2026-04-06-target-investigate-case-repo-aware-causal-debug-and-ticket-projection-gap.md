# [TICKET] target-investigate-case ainda nao formaliza causal-debug repo-aware nem ticket-proposal target-owned

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-06 05:24Z
- Reporter: Codex
- Owner: Codex
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): local-run
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/guiadomus-matricula
- Request ID: 2026-04-06T03-21-21Z
- Source spec (when applicable): docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md
- Source spec canonical path (when applicable): docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08; CA-01, CA-02, CA-03, CA-04, CA-05.
- Inherited assumptions/defaults (when applicable): `semantic-review` permanece bounded; `causal-debug` e target-owned; publication continua runner-side.
- Inherited RNFs (when applicable): rastreabilidade formal, fronteira cross-repo clara e anti-overfit.
- Inherited technical/documentary constraints (when applicable): nao inventar causalidade runner-side; nao abrir ticket so por narrativa; usar prompt repo-aware declarado no manifesto do target.
- Inherited pending/manual validations (when applicable): rodada Telegram autorizada continua fora do escopo.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): spec
- Smallest plausible explanation (audit/review only): o fluxo runner-side encerrava a modelagem estrutural no bounded semantic review e na publication conservadora, sem uma etapa repo-aware target-owned e sem `ticket-proposal.json` como fronteira formal antes da publication.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T03-21-21Z/semantic-review.request.json
  - Response file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T03-21-21Z/assessment.json
  - Decision file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T03-21-21Z/publication-decision.json
- Related docs/execplans:
  - execplans/2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection-gap.md
  - /home/mapita/projetos/guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json
  - /home/mapita/projetos/guiadomus-matricula/docs/workflows/target-case-investigation-causal-debug.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o caso ancora ja tinha packet bounded forte, mas o runner ainda nao tinha a fase repo-aware nem a precondicao formal de `ticket-proposal.json`, o que bloqueava a melhoria continua orientada a codigo.

## Context
- Workflow area: `/target_investigate_case` / orchestration / publication.
- Scenario: caso ancora `extract_address` com `complemento="apartamento n"` em `guiadomus-matricula`.
- Input constraints: preservar `semantic-review` bounded, ownership semantico do target e publication mecanica do runner.

## Problem statement
O runner ainda parava cedo demais no fluxo. Havia round materialization, confirmacao semantica bounded e gates conservadores de publication, mas nao havia a etapa repo-aware target-owned que localiza a menor causa plausivel do erro e prepara uma proposta de ticket consistente com o repositorio alvo.

## Observed behavior
- O que foi observado:
  - o contrato do runner nao modelava `causal-debug.request.json`, `causal-debug.result.json` nem `ticket-proposal.json`;
  - a publication positiva runner-side podia ser decidida sem um artefato target-owned explicito de ticket projection;
  - o prompt repo-aware ainda nao era parte formal do manifesto-base do runner.
- Frequencia (unico, recorrente, intermitente): recorrente para qualquer target compatível com `semantic-review` bounded mas que precise depurar causa minima no proprio repositorio.
- Como foi detectado (warning/log/test/assert): leitura dos contratos, do caso ancora e dos testes do core/preparer/publisher.

## Expected behavior
O runner deve orquestrar mecanicamente uma fase `causal-debug` repo-aware declarada pelo target, exigir `ticket-proposal.json` quando houver recomendacao positiva e continuar decidindo publication somente depois dessa fronteira formal.

## Reproduction steps
1. Ler o caso ancora em `guiadomus-matricula/investigations/2026-04-06T03-21-21Z/`.
2. Observar que havia `semantic-review.request.json` pronto e `publication-decision.json` conservador, mas nenhuma fase formal repo-aware.
3. Inspecionar `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts` e `src/integrations/target-investigate-case-ticket-publisher.ts`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - N/A
- Warnings/codes relevantes:
  - `SEMANTIC_REVIEW_RESULT_MISSING`
  - ausencia contratual de `ticket-proposal.json`
- Comparativo antes/depois (se houver):
  - antes: o fluxo saltava de bounded review para publication.
  - depois: `causal-debug` e `ticket-proposal.json` passam a ser parte formal do caminho elegivel a publication.

## Impact assessment
- Impacto funcional: tickets automaticos podiam sair sem uma projecao target-owned suficientemente forte.
- Impacto operacional: a melhoria continua orientada a codigo ficava truncada no lado do runner.
- Risco de regressao: medio, porque toca tipos, manifesto base, core, preparer e publisher.
- Scope estimado (quais fluxos podem ser afetados): todo target compatível com `/target_investigate_case`.

## Initial hypotheses (optional)
- o desenho inicial acertou a separacao bounded vs publication, mas ainda nao tinha a etapa repo-aware no ponto certo do workflow.

## Proposed solution (optional)
- tipar `causalDebug` no runner;
- orquestrar a execucao repo-aware usando o prompt canônico do target;
- exigir `ticket-proposal.json` como precondicao de publication positiva.

## Closure criteria
- Requisito/RF/CA coberto: RF-01 / RF-02 / CA-01
- Evidencia observavel: `src/types/target-investigate-case.ts` e `docs/workflows/target-case-investigation-manifest.json` aceitam `causalDebug`, `causal-debug.request.json`, `causal-debug.result.json` e `ticket-proposal.json`.
- Requisito/RF/CA coberto: RF-03 / RF-04 / RF-05 / CA-02
- Evidencia observavel: `src/integrations/target-investigate-case-round-preparer.ts` e seus testes executam o prompt repo-aware declarado pelo target e recompõem o assessment oficial.
- Requisito/RF/CA coberto: RF-06 / RF-07 / CA-03
- Evidencia observavel: `src/core/target-investigate-case.ts` bloqueia publication positiva sem `ticket-proposal.json`.
- Requisito/RF/CA coberto: RF-08 / CA-04
- Evidencia observavel: `src/integrations/target-investigate-case-ticket-publisher.ts` prefere slug/titulo/markdown de `ticket-proposal.json`.
- Requisito/RF/CA coberto: CA-05
- Evidencia observavel: `npm run check`, `npm test` e a suite focada do fluxo terminaram em `exit 0`.

## Decision log
- 2026-04-06 - Preservar `semantic-review` bounded e adicionar `causal-debug` como etapa nova, em vez de abrir leitura de repositorio dentro da fase bounded.
- 2026-04-06 - Exigir `ticket-proposal.json` para publication positiva runner-side.

## Closure
- Closed at (UTC): 2026-04-06 06:40Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection-gap.md`; commit: mesmo changeset local ainda nao commitado.
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): n/a
- Closure evidence:
  - `npm run check` -> `exit 0`
  - `npm test` -> `exit 0`
  - `npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts` -> `exit 0`

