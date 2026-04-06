# [TICKET] /target_investigate_case ainda trata falha obrigatoria como sucesso e anuncia artefatos inexistentes

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-06 08:20Z
- Reporter: Codex
- Owner: Codex
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-04-06-target-investigate-case-silent-degradation-and-false-success-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): local-run
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/guiadomus-matricula
- Request ID: 2026-04-06T05-31-37Z
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-39, RF-40, RF-41, RF-46, RF-47, RF-48, RF-49; CA-18, CA-19, CA-20.
- Inherited assumptions/defaults (when applicable): bounded semantic confirmation continua bounded; causal-debug e ticket-proposal continuam target-owned; publication final continua runner-side.
- Inherited RNFs (when applicable): reprodutibilidade, auditabilidade, anti-overfit, rastreabilidade cross-repo e minimizacao do trace.
- Inherited technical/documentary constraints (when applicable): nao inventar causalidade do target; nao publicar ticket so por narrativa; nao anunciar artefato como tocado quando ele nao existir.
- Inherited pending/manual validations (when applicable): rodada manual via Telegram autorizado permanece opcional apos validacao runner-side local.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): execution
- Smallest plausible explanation (audit/review only): o runner ainda preservava a estrategia antiga de degradar silenciosamente falhas de `semantic-review` e `causal-debug` e, ao fechar o fluxo, anunciava a lista canonica de artefatos em vez dos caminhos realmente materializados no disco.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T05-31-37Z/semantic-review.request.json
  - Response file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T05-31-37Z/assessment.json
  - Decision file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T05-31-37Z/publication-decision.json
  - Trace file: /home/mapita/projetos/guiadomus-matricula/.codex-flow-runner/flow-traces/target-flows/20260406t053550z-target_investigate_case-target-investigate-case-guiadomus-matricula.json
- Related docs/execplans:
  - execplans/2026-04-06-target-investigate-case-silent-degradation-and-false-success-gap.md
  - execplans/2026-04-05-target-investigate-case-semantic-review-runner-milestone-3.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o fluxo pode encerrar como `success/completed` mesmo quando uma etapa obrigatoria falhou e o ticket deixou de ser publicado por bloqueio operacional, criando limbo operacional e falso positivo no Telegram.

## Context
- Workflow area: `/target_investigate_case` / semantic-review bounded / causal-debug repo-aware / publication runner-side.
- Scenario: rodada ancora real `guiadomus-matricula/investigations/2026-04-06T05-31-37Z`.
- Input constraints: sem abrir a fronteira bounded, sem transferir causalidade para o runner e sem quebrar o contrato target-owned de `causal-debug` e `ticket-proposal`.

## Problem statement
Hoje o runner ainda permite que uma falha runner-side em `semantic-review` ou `causal-debug` seja absorvida como degradacao silenciosa. Depois disso, a avaliacao final converte a rodada para `completed`/`inconclusive-case`, e o resumo final lista caminhos canonicos como se tivessem sido tocados mesmo quando os artefatos reais nao existem.

## Observed behavior
- O que foi observado:
  - `semantic-review.request.json` estava `ready`, mas `semantic-review.result.json` nao existia no disco.
  - `assessment.json` ficou em `bug_likely_but_unconfirmed` com blocker `SEMANTIC_REVIEW_RESULT_MISSING`.
  - o trace/Telegram marcaram `success`, `completionReason=completed` e listaram `semantic-review.result.json`, `causal-debug.result.json` e `ticket-proposal.json` como artefatos tocados.
  - reproducoes manuais do prompt bounded retornaram `confirmed_error`, reforcando que a elegibilidade do caso nao era o problema.
- Frequencia (unico, recorrente, intermitente): recorrente sempre que uma etapa obrigatoria falhar dentro da degradacao silenciosa herdada.
- Como foi detectado (warning/log/test/assert): leitura do round ancora, comparacao trace x disco, inspeção do `round-preparer`, do executor e do resumo final no runner.

## Expected behavior
Quando uma etapa obrigatoria runner-side falhar, `/target_investigate_case` deve encerrar com falha operacional classificada, próxima ação explícita e lista apenas de artefatos realmente existentes. O fluxo so pode terminar em sucesso quando a publication runner-side conclui legitimamente, com ou sem ticket.

## Reproduction steps
1. Inspecionar a rodada ancora `2026-04-06T05-31-37Z` no target.
2. Confirmar que `semantic-review.request.json` esta `ready` e que `semantic-review.result.json` nao existe.
3. Ler o trace final do runner e observar `success/completed` com artefatos canonicos inexistentes.
4. Reproduzir manualmente o prompt bounded e verificar que o caso era elegivel.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `nextAction = materialize semantic-review.result.json for the ready bounded packet before runner-side publication triage`
- Warnings/codes relevantes:
  - `SEMANTIC_REVIEW_RESULT_MISSING`
  - `semantic_review_result_missing`
- Comparativo antes/depois (se houver):
  - antes: falha operacional podia terminar como `completed` indistinguivel de sucesso.
  - depois esperado: falha runner-side obrigatoria interrompe o fluxo com surface/kind/nextAction e sem artefatos fantasmas.

## Impact assessment
- Impacto funcional: impede publication correta e mascara se o caso nao merecia ticket ou se a etapa falhou.
- Impacto operacional: cria limbo operacional e deteriora a confianca no Telegram e no trace local.
- Risco de regressao: medio, porque toca `round-preparer`, executor, resumo de fluxo e notificacoes.
- Scope estimado (quais fluxos podem ser afetados): `target-investigate-case` runner-side.

## Initial hypotheses (optional)
- a degradacao silenciosa fazia sentido apenas antes de `semantic-review` e `causal-debug` virarem precondicoes reais de publication;
- o resumo final reutiliza caminhos canonicos do contrato em vez de paths realizados.

## Proposed solution (optional)
- transformar falhas runner-side obrigatorias em `failed` estruturado com `failureSurface`, `failureKind`, `failedAtMilestone`, `nextAction` e artefatos reais;
- impedir que `evaluateTargetInvestigateCaseRound` trate packet `ready` sem artefato materializado como `inconclusive-case` legitimo;
- usar somente caminhos materializados no disco para “artefatos tocados” no trace e no Telegram.

## Closure criteria
- Requisito/RF/CA coberto: RF-51 / RF-52
- Evidencia observavel: `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts` e `src/core/runner.ts` diferenciam `semantic-review-failed`, `causal-debug-failed`, `round-materialization-failed` e `round-evaluation-failed`.
- Requisito/RF/CA coberto: RF-53
- Evidencia observavel: o resumo final usa apenas `realizedArtifactPaths` existentes no disco mais artefatos versionados.
- Requisito/RF/CA coberto: RF-54
- Evidencia observavel: o Telegram e o trace explicam por que nao houve ticket com surface/kind/nextAction observaveis.

## Decision log
- 2026-04-06 - Investigar a rodada ancora antes de qualquer remendo para identificar a menor causa plausivel.
- 2026-04-06 - Corrigir no runner a combinacao de degradacao silenciosa e resumo baseado em caminhos canonicos.

## Closure
- Closed at (UTC): 2026-04-06 06:35Z
- Closure reason: implemented
- Related PR/commit/execplan: execplans/2026-04-06-target-investigate-case-silent-degradation-and-false-success-gap.md
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): n/a
- Closure evidence:
  - `npm run check` -> `exit 0`
  - `npm test` -> `exit 0`
  - `npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> `exit 0`
  - reproducao controlada da rodada ancora `2026-04-06T05-31-37Z` agora retorna `status=failed`, `failureSurface=semantic-review` e apenas artefatos realmente existentes.
