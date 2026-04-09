# [TICKET] Endurecer contrato e publication runner-side para ticket target-owned de case-investigation

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-06 17:15Z
- Reporter: codex
- Owner: workflow-core
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md
- Parent commit (optional):
- Analysis stage (when applicable): post-implementation audit/review cross-repo do fluxo `/target_investigate_case`
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): ../guiadomus-matricula
- Request ID: 2026-04-06T16-30-09Z
- Source spec (when applicable): docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md
- Source spec canonical path (when applicable): docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-06, RF-07, RF-08; CA-01, CA-03, CA-04; publication final continua runner-side e o target continua dono do conteudo semantico do ticket.
- Inherited assumptions/defaults (when applicable): `ticket-proposal.json` continua target-owned; rollout deve permanecer backward-compatible com o contrato atual durante a transicao; o runner deve preferir preservar conteudo target-owned em vez de reescrever o ticket.
- Inherited RNFs (when applicable): preservar qualidade editorial minima, evitar duplicacao evitavel e manter ticket executavel por outra IA.
- Inherited technical/documentary constraints (when applicable): nao criar parser paralelo fora de `src/core/target-investigate-case.ts`; nao reabrir a fronteira bounded; manter o caminho canonico do manifesto e dos artefatos.
- Inherited pending/manual validations (when applicable): revalidar publication com `ticket-proposal.json` legado e com contrato enriquecido antes de considerar a frente concluida.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): o runner hoje aceita `ticket-proposal.json` de forma estrita e publica `ticket_markdown` quase verbatim, mas sem quality gates suficientes e com naming sempre prefixado por `case_ref`, o que degrada ou contradiz tickets explicitamente generalizaveis.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: ../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/causal-debug.result.json
  - Response file: ../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/ticket-proposal.json
  - Decision file: ../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/publication-decision.json
- Related docs/execplans:
  - docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md
  - execplans/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md
  - tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md
  - ../guiadomus-matricula/execplans/2026-04-06-case-investigation-ticket-quality-hardening.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto):

## Context
- Workflow area: target-investigate-case / publication runner-side / ticket publisher
- Scenario: o target project ja consegue produzir uma hipotese repo-aware melhor, mas o runner ainda aceita pouco contexto adicional, valida pouco o markdown target-owned e impõe naming de arquivo que mistura um identificador de caso com tickets pensados para backlog reutilizavel.
- Input constraints: preservar a autoridade semantica target-owned, manter publication final no runner e permitir rollout gradual sem quebrar targets que ainda emitem `ticket_proposal_v1` no shape atual.
- Ownership boundary: este ticket nao cobre `rootCauseReview`, gates causais nem rollout legado da nova etapa; essa frente ficou explicitamente no ticket `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`.

## Problem statement
O runner precisa aceitar enriquecimento aditivo de `causal-debug.result.json` e `ticket-proposal.json`, endurecer a publication de `ticket_markdown` com guardrails editoriais minimos e deixar de impor naming runner-side que contradiga o escopo reutilizavel declarado pelo target, sem assumir a ownership do contrato futuro de confirmacao causal (`rootCauseReview`).

## Observed behavior
- O que foi observado:
  - `src/types/target-investigate-case.ts` rejeita qualquer campo aditivo em `causal-debug.result.json` e `ticket-proposal.json`.
  - `src/integrations/target-investigate-case-ticket-publisher.ts` publica `ticket_markdown` quase verbatim sem quality gate editorial minimo alem da compatibilidade do bloco causal.
  - o nome do arquivo publicado sempre prefixa `case_ref`, mesmo quando o ticket e generalizavel e o target ja forneceu `suggested_slug`.
- Frequencia (unico, recorrente, intermitente): recorrente para qualquer publication futura de `ticket-proposal.json` target-owned mais rica.
- Como foi detectado (warning/log/test/assert): leitura dirigida do contrato, do publisher e do ticket publicado a partir da rodada `2026-04-06T16-30-09Z`.

## Expected behavior
O runner deve aceitar contrato enriquecido backward-compatible, validar o ticket target-owned com guardrails estruturais minimos e publicar filename coerente com o escopo declarado sem reescrever o conteudo semantico do ticket.

## Reproduction steps
1. Ler `src/types/target-investigate-case.ts` e confirmar que `targetInvestigateCaseCausalDebugResultSchema` e `targetInvestigateCaseTicketProposalSchema` estao estritos demais para metadados editoriais opcionais.
2. Ler `src/integrations/target-investigate-case-ticket-publisher.ts` e confirmar que `ticket_markdown` e reaproveitado quase verbatim e que `buildTicketSlug(...)` sempre prefixa `case_ref`.
3. Comparar isso com `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/ticket-proposal.json` e com o ticket publicado no projeto alvo.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - publication positiva runner-side depende de `ticket-proposal.json`
  - ticket target-owned ainda pode degradar editorialmente no handoff runner-side
- Comparativo antes/depois (se houver):
  - antes: contrato estrito, publication permissiva e filename sempre acoplado ao `case_ref`;
  - depois esperado: contrato aditivo aceito, quality gates minimos ativos e naming coerente com tickets generalizaveis.

## Impact assessment
- Impacto funcional: tickets target-owned mais ricos continuam bloqueados ou degradados no runner, o que dificulta melhoria continua do fluxo cross-repo.
- Impacto operacional: o backlog pode continuar recebendo tickets tecnicamente corretos, mas editorialmente inconsistentes ou com naming ruim para dedupe/reuse.
- Risco de regressao: medio, porque a frente toca schema, publication e dedupe do fluxo `/target_investigate_case`.
- Scope estimado (quais fluxos podem ser afetados): `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, suites do core/runner e publication cross-repo de `case-investigation`

## Initial hypotheses (optional)
- A menor entrega segura e aceitar metadados aditivos opcionais no contrato e usar esses hints apenas quando presentes, preservando comportamento legado como fallback.

## Proposed solution (optional)
Nao obrigatorio. Preencher somente se houver direcao clara. Para ticket automatico de retrospectiva sistemica, quando houver direcao concreta, nomeie as superficies de workflow/documentacao que precisam mudar.
- Ajustar `src/types/target-investigate-case.ts` para aceitar campos opcionais de qualidade editorial/naming em `causal-debug.result.json` e `ticket-proposal.json`.
- Ajustar `src/integrations/target-investigate-case-ticket-publisher.ts` para aplicar quality gates estruturais minimos e revisar `buildTicketSlug(...)` quando o target declarar ticket generalizavel.
- Cobrir o contrato novo em `src/core/target-investigate-case.test.ts` e `src/integrations/target-investigate-case-ticket-publisher.test.ts`.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket. Para ticket automatico de retrospectiva sistemica, prefira criterios por superficie afetada e evite usar "nao recorrencia" como criterio unico.
- Requisito/RF/CA coberto: RF-06 / CA-01
- Evidencia observavel: `src/types/target-investigate-case.ts` aceita shape legado e enriquecido para `causal-debug.result.json` e `ticket-proposal.json`, incluindo campos opcionais para hipoteses consideradas, motivo do escape de QA do extractor, oportunidades de prompt/exemplos/guardrails, `ticket_readiness`, gaps remanescentes e hints editoriais/naming sem quebrar backward compatibility.
- Requisito/RF/CA coberto: RF-08 / CA-04
- Evidencia observavel: `src/integrations/target-investigate-case-ticket-publisher.ts` e `src/integrations/target-investigate-case-ticket-publisher.test.ts` tornam observavel que, quando o contrato enriquecido for usado, a publication target-owned preserva ou exige exposicao explicita de hipoteses consideradas, do motivo de o QA do extractor nao ter capturado o erro, das oportunidades de prompt/exemplos/guardrails e de `ticket_readiness` com gaps remanescentes quando houver, alem de manter naming coerente com o hint do target.
- Requisito/RF/CA coberto: RF-07 / CA-03
- Evidencia observavel: `src/core/target-investigate-case.test.ts` e suites correlatas continuam verdes, mantendo gates explicitos quando `ticket-proposal.json` estiver ausente ou invalido e quando a publication runner-side receber contrato enriquecido sem a trilha explicita exigida para o path novo.

## Decision log
- 2026-04-06 - Ticket aberto a partir do diagnostico cross-repo do fluxo de `case-investigation` - a maior degradacao editorial nasce no target, mas o runner ainda precisa aceitar o contrato enriquecido e endurecer publication/naming para nao perpetuar o problema.
- 2026-04-06 - Implementacao runner-side iniciada e validada localmente - o ticket permanece aberto ate o versionamento/fechamento formal no changeset final.
- 2026-04-06 - Backlog reconciliado com `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md` - este ticket segue apenas com contrato enriquecido de `causal-debug.result.json`/`ticket-proposal.json`, guardrails editoriais e naming; gates causais de `rootCauseReview` ficaram fora da sua ownership.
- 2026-04-06 - Fechamento validado com checklist de `docs/workflows/codex-quality-gates.md` - as allowlists finitas de `ticket_scope`, `slug_strategy` e `quality_gate` ficaram com evidencia positiva dos membros aceitos (`case-specific`, `generalizable`, `case-ref-prefix`, `suggested-slug-only`, `legacy`, `target-ticket-quality-v1`) e evidencia negativa da combinacao fora do conjunto (`suggested-slug-only` com `ticket_scope=case-specific`).

## Closure
- Closed at (UTC): 2026-04-06 21:19Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Closure evidence:
  - `RF-06 / CA-01`: `src/types/target-investigate-case.ts` preserva o shape enriquecido de `causal-debug.result.json` ja em uso (`root_cause_classification`, `preventable_stage`, `remediation_scope`, `ticket_seed.ticket_scope`) e passa a aceitar, em `ticket-proposal.json`, `ticket_readiness`, `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities` e `remaining_gaps` sem quebrar o shape legado.
  - `RF-06 / CA-01`: `src/core/target-investigate-case.test.ts` prova a allowlist finita com parse positivo de `ticket_scope=generalizable + slug_strategy=suggested-slug-only + quality_gate=target-ticket-quality-v1`, parse positivo de `ticket_scope=case-specific + slug_strategy=case-ref-prefix + quality_gate=legacy` e rejeicao explicita de `suggested-slug-only` fora de `ticket_scope=generalizable`.
  - `RF-08 / CA-04`: `src/integrations/target-investigate-case-ticket-publisher.ts` endurece `quality_gate=target-ticket-quality-v1` exigindo headings e trilha explicita no markdown target-owned para `competing_hypotheses`, `qa_escape.why_not_caught`, `prompt_guardrail_opportunities`, `ticket_readiness.status`, `ticket_readiness.summary` e `remaining_gaps`.
  - `RF-08 / CA-04`: `src/integrations/target-investigate-case-ticket-publisher.test.ts` prova naming positivo para os dois membros aceitos do escopo: `generalizable + suggested-slug-only` publica `tickets/open/2026-04-03-fix-billing-core-local-guardrail.md`, enquanto `case-specific + case-ref-prefix + legacy` publica `tickets/open/2026-04-03-case-001-fix-billing-core-local-guardrail.md`.
  - `RF-08 / CA-04`: `src/integrations/target-investigate-case-ticket-publisher.test.ts` rejeita markdown target-owned sob `quality_gate=target-ticket-quality-v1` quando ha duplicacao estrutural ou quando a secao/trilha explicita de `QA escape` e omitida, mantendo o runner como validador e nao reescritor semantico do ticket.
  - `RF-07 / CA-03`: `src/core/target-investigate-case.test.ts` cobre o gate runner-side quando `ticket-proposal.json` enriquecido chega sem a trilha estruturada minima do quality gate v1; a leitura falha com schema explicito em `qa_escape`, e `evaluateTargetInvestigateCaseRound(...)` nao chega a publicar ticket.
  - `RF-07 / CA-03`: `npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` -> `exit 0`, com suite expandida encerrando em `603` testes passando; `npm run check` -> `exit 0`.
  - Validacao manual pendente: nenhuma. A revalidacao pedida para `ticket-proposal.json` legado e contrato enriquecido ficou coberta por teste automatizado runner-side e nao restou dependencia externa/manual para aceite tecnico.
