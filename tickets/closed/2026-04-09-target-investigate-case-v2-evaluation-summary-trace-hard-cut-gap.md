# [TICKET] target-investigate-case-v2 ainda avalia, resume e publica com herança estrutural de `assessment` e `dossier`

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-09 18:43Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
- Parent execplan (optional): execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): architectural-review
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: architectural-review-2026-04-09-target-investigate-case-v2-evaluation-hard-cut
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-15, RF-18, RF-24, RF-25, RF-26 e RF-27; CA-02, CA-03, CA-04, CA-06 e CA-07.
  - `diagnosis.json` precisa virar fonte canônica de summary, Telegram e automações do caminho mínimo v2.
  - publication precisa continuar conservadora e tardia, mas sem depender de `assessment.json` nem `dossier.*`.
- Inherited assumptions/defaults (when applicable):
  - a v1 não é mais alvo de compatibilidade desta frente;
  - o caminho mínimo v2 termina em `diagnosis`;
  - `assessment.json` e `dossier.*` não fazem parte do contrato mínimo;
  - `ticket-proposal.json` permanece continuação opcional target-owned.
- Inherited RNFs (when applicable):
  - manter o runner target-agnostic;
  - preservar publication runner-side conservadora;
  - reduzir custo cognitivo e clareza humana das superfícies finais.
- Inherited technical/documentary constraints (when applicable):
  - não reintroduzir gating obrigatório por `assessment`/`dossier`;
  - não usar herança da v1 como justificativa para manter summary/trace publication-first;
  - manter o fluxo sequencial.
- Inherited pending/manual validations (when applicable):
  - validar que `evaluateTargetInvestigateCaseRound(...)` conclui o v2 só com os artefatos canônicos mínimos;
  - validar que Telegram e summary não exibem mais `dossier` nem campos derivados de `assessment`.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): execution
- Smallest plausible explanation (audit/review only): a orquestração stage-aware da v2 entrou no preparo, mas a camada de avaliação/finalização continuou presa ao shape herdado da v1, centralizando `assessment`, `dossier`, tuplas semânticas legadas e gating de publication sobre artefatos que a spec v2 já removeu do caminho mínimo.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/core/target-investigate-case.ts
  - Decision file: src/integrations/telegram-bot.ts
- Related docs/execplans:
  - execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md
  - tickets/closed/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): enquanto `core`, summary, trace e Telegram dependerem de `assessment`/`dossier`, a v2 continua diagnosis-first só no nome, e publication/automações seguem ancoradas em um contrato que a própria spec já descartou.

## Context
- Workflow area: `/target_investigate_case_v2` / avaliação final / publication runner-side / Telegram / trace e summary
- Scenario: o preparo v2 já opera `resolve-case -> assemble-evidence -> diagnosis`, mas a avaliação final ainda lê `assessment.json`, valida `dossier.*`, deriva summary de campos legados e exibe isso ao operador.
- Input constraints:
  - manter publication opcional e tardia;
  - permitir publication positiva no v2 a partir de `diagnosis` + `ticket-proposal.json`, sem fallback obrigatório em `assessment`;
  - não reabrir a v1 como trilha de compatibilidade.

## Problem statement
O coração final do fluxo v2 ainda não é diagnosis-first. A execução mínima já foi separada por estágio, mas o `core` continua exigindo e propagando `assessment.json` e `dossier.*` para avaliar a rodada, montar `summary`, montar `tracePayload`, decidir publication e responder no Telegram.

## Observed behavior
- O que foi observado:
  - `evaluateTargetInvestigateCaseRound(...)` ainda lê `assessment.json` e `dossier.*` antes de produzir summary/trace.
  - `buildTargetInvestigateCaseFinalSummary(...)` e `buildTargetInvestigateCaseTracePayload(...)` continuam assessment-first.
  - `shouldTraverseTargetInvestigateCasePublicationFromArtifacts(...)` ainda tenta ler `assessment.json` para decidir publication no v2.
  - o reply do Telegram ainda expõe `primary_remediation`, `publication_dependency` e `dossier`.
- Frequência (único, recorrente, intermitente): recorrente; afeta toda rodada v2 concluída.
- Como foi detectado (warning/log/test/assert): revisão arquitetural direta dos arquivos `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts` e `src/integrations/telegram-bot.ts`.

## Expected behavior
No v2, a avaliação final deve funcionar com `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`, usando `ticket-proposal.json` apenas quando a continuação `publication` for realmente atravessada. Summary, trace e Telegram devem nascer do diagnóstico e da decisão tardia de publication, não de artefatos legados.

## Reproduction steps
1. Ler `src/core/target-investigate-case.ts` e confirmar o carregamento obrigatório de `assessment.json` e `dossier.*`.
2. Ler `src/types/target-investigate-case.ts` e confirmar que `summary` e `tracePayload` ainda exigem blocos assessment/dossier.
3. Ler `src/integrations/telegram-bot.ts` e confirmar que o reply concluído do fluxo ainda menciona `Dossier local`, `Execution readiness` e `Publication dependency`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - revisão local do wiring `evaluate -> summary/trace -> telegram` em 2026-04-09.
- Warnings/codes relevantes:
  - drift entre contrato mínimo diagnosis-first e superfícies finais assessment-first.
- Comparativo antes/depois (se houver):
  - antes: summary/trace publication-first e assessment-first;
  - depois esperado: summary/trace diagnosis-first com publication tardia opcional.

## Impact assessment
- Impacto funcional:
  - o v2 não entrega ainda sua promessa central de diagnóstico claro como produto padrão.
- Impacto operacional:
  - Telegram e summary continuam mais difíceis de ler do que deveriam;
  - publication opcional permanece acoplada a artefatos removidos do contrato mínimo.
- Risco de regressão:
  - alto; a mudança atravessa tipos centrais, avaliação, publication opcional, ticket publisher e testes.
- Scope estimado (quais fluxos podem ser afetados):
  - `evaluateTargetInvestigateCaseRound`, publication do v2, trace/summary finais, reply do Telegram e suites focadas de `core` e `telegram`.

## Initial hypotheses (optional)
- um branch v2 explícito na avaliação final, com decision builders diagnosis-first e publication opcional ancorada em `ticket-proposal.json`, resolve o desvio principal sem precisar carregar `assessment` e `dossier` como artefatos obrigatórios.

## Proposed solution (optional)
- remover `assessment` e `dossier` da avaliação obrigatória do v2;
- rebaixar campos legados de `summary` e `tracePayload` para opcionais/nulos ou deixá-los fora do branch v2;
- decidir publication do v2 por `diagnosis` + `ticket-proposal.json` + policy runner-side;
- simplificar o reply do Telegram para a leitura humana diagnosis-first.

## Closure criteria
- Requisito/RF/CA coberto: RF-15, RF-18, RF-25, CA-02, CA-03
- Evidência observável: `evaluateTargetInvestigateCaseRound(...)` no v2 conclui a rodada mínima com `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`, sem ler `assessment.json` nem validar `dossier.*`.
- Requisito/RF/CA coberto: RF-24, RF-26, RF-27, CA-04, CA-06
- Evidência observável: `summary`, `tracePayload` e `renderTargetInvestigateCaseFinalSummary(...)` passam a refletir o diagnóstico como fonte principal e deixam de expor `dossier` e campos assessment-first na trilha v2.
- Requisito/RF/CA coberto: RF-26, RF-27, CA-07
- Evidência observável: `src/integrations/telegram-bot.ts` responde o v2 concluído com foco em veredito, porquê, comportamento a mudar, superfície provável, publication status e próxima ação, sem `Dossier local`.
- Requisito/RF/CA coberto: publication runner-side tardia e conservadora
- Evidência observável: o v2 só tenta publication quando `ticket-proposal.json` existir e a policy permitir; do contrário, `publicationDecision` é calculada runner-side sem depender de `assessment`.
- Requisito/RF/CA coberto: validação automatizada do passo
- Evidência observável: suites focadas de `src/core/target-investigate-case.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/target-investigate-case-ticket-publisher.test.ts` e `npm run check` terminam em `exit 0`.

## Decision log
- 2026-04-09 - Este ticket nasce como follow-up do passo 2 porque a orquestração por estágio expôs com mais clareza que o desvio remanescente está concentrado na avaliação final e nas superfícies operator-facing.
- 2026-04-09 - O escopo inclui publication opcional do v2 porque ela ainda depende indiretamente do shape legado do assessment e, sem esse corte, o hard cut diagnosis-first fica incompleto.

## Closure
- Closed at (UTC): 2026-04-09 18:56Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md; commit de fechamento local das superfícies finais diagnosis-first.
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
