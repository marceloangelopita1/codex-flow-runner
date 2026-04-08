# [TICKET] /target_investigate_case_v2 ainda não existe como contrato runner-side nem como caminho mínimo diagnosis-first

## Metadata
- Status: open
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-08 21:44Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): N/A
- Parent execplan (optional): N/A
- Parent commit (optional): N/A
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: spec-triage-2026-04-08-target-investigate-case-v2
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-01, RF-02, RF-04, RF-05, RF-06, RF-07, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-23, RF-24, RF-25 e CA-01, CA-02, CA-04, CA-06.
  - Membros explícitos que precisam ficar observáveis no contrato: comando `/target_investigate_case_v2`; `flow = "target-investigate-case-v2"`; estágios `resolve-case`, `assemble-evidence`, `diagnosis`, `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`; artefatos mínimos `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md`, `diagnosis.json`; `diagnosis.json.verdict = ok | not_ok | inconclusive`; namespace autoritativo `output/case-investigation/<round-id>/` com `investigations/<round-id>/` apenas como espelho secundário durante migração.
- Inherited assumptions/defaults (when applicable):
  - a v2 entra como novo contrato explícito, não como mutação silenciosa da v1;
  - o caminho mínimo não exige `deep-dive`, `improvement-proposal`, `ticket-projection` nem `publication`;
  - o namespace autoritativo da rodada fica no projeto alvo;
  - `investigations/<round-id>/` pode permanecer apenas como espelho secundário;
  - o primeiro pacote derivado desta spec pertence ao runner; a aderência dos targets virá depois.
- Inherited RNFs (when applicable):
  - preservar publication runner-side conservadora, anti-overfit e rastreabilidade cross-repo;
  - manter o runner target-agnostic;
  - reduzir custo cognitivo do caminho mínimo.
- Inherited technical/documentary constraints (when applicable):
  - não acoplar o runner a lógica, dados, scripts ou superfícies de um target específico;
  - não transformar a v2 em camada obrigatória sobre a cadeia `semantic-review -> causal-debug -> root-cause-review`;
  - manter o target como autoridade semântica do caso e dos insumos relevantes.
- Inherited pending/manual validations (when applicable):
  - validar o contrato de manifesto v2 e os novos schemas canônicos no runner;
  - validar a separação entre namespace autoritativo do target e espelho runner-side durante migração.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): N/A
- Smallest plausible explanation (audit/review only): N/A
- Remediation scope (audit/review only): N/A
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: docs/workflows/target-case-investigation-manifest.json
  - Decision file: src/core/target-investigate-case.ts
- Related docs/execplans:
  - src/types/target-investigate-case.ts
  - src/types/target-flow.ts
  - src/integrations/target-investigate-case-round-preparer.ts
  - prompts/16-target-investigate-case-round-materialization.md
  - tickets/open/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md
  - tickets/open/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): sem este contrato o runner não consegue nem iniciar a implementação da v2; a fila inteira continua presa ao desenho v1 e os tickets irmãos ficam bloqueados por ausência de superfícies canônicas.

## Context
- Workflow area: `/target_investigate_case` / contrato cross-repo / manifesto / orquestração do caminho mínimo
- Scenario: a spec v2 exige um novo fluxo diagnosis-first, com comando próprio, manifesto por estágio e artefatos primários diferentes da v1.
- Input constraints:
  - manter fronteira runner-target explícita;
  - preservar publication runner-side conservadora;
  - não codificar heurísticas específicas de target no runner.

## Problem statement
O runner atual continua hard-coded no contrato v1 de `case-investigation`: comando `/target_investigate_case`, manifesto `docs/workflows/target-case-investigation-manifest.json`, milestones `case-resolution/evidence-collection/assessment/publication` e artefatos centrais `assessment.json`/`dossier.*`. Assim, a v2 ainda não existe nem como contrato parseável nem como caminho mínimo executável.

## Observed behavior
- O que foi observado:
  - `src/types/target-investigate-case.ts` fixa `TARGET_INVESTIGATE_CASE_MANIFEST_PATH = "docs/workflows/target-case-investigation-manifest.json"`, `TARGET_INVESTIGATE_CASE_COMMAND = "/target_investigate_case"` e `TARGET_INVESTIGATE_CASE_ROUNDS_DIR = "investigations"`.
  - `src/types/target-flow.ts` mantém os milestones `preflight`, `case-resolution`, `evidence-collection`, `assessment` e `publication`, sem `diagnosis`.
  - `docs/workflows/target-case-investigation-manifest.json` expõe `assessment`, `semanticReview`, `causalDebug` e `rootCauseReview`, mas não os slots canônicos `resolveCase`, `assembleEvidence` e `diagnosis` da v2.
  - `prompts/16-target-investigate-case-round-materialization.md` ainda manda gravar `assessment.json` e `dossier.*` como artefatos centrais da rodada.
- Frequência (único, recorrente, intermitente): recorrente; atinge toda rodada de `target-investigate-case`.
- Como foi detectado (warning/log/test/assert): releitura da spec v2 contra `src/types/target-investigate-case.ts`, `src/types/target-flow.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `docs/workflows/target-case-investigation-manifest.json` e `prompts/16-target-investigate-case-round-materialization.md`.

## Expected behavior
O runner deve expor `target-investigate-case-v2` como contrato próprio, com comando e fluxo canônicos, manifesto cross-repo por estágio, caminho mínimo `preflight -> resolve-case -> assemble-evidence -> diagnosis`, artefatos primários diagnosis-first e rastreabilidade explícita com a v1 durante a migração.

## Reproduction steps
1. Ler `src/types/target-investigate-case.ts` e confirmar que o comando e o manifesto ainda são os da v1.
2. Ler `src/types/target-flow.ts` e confirmar que o fluxo ainda não possui milestone `diagnosis`.
3. Ler `docs/workflows/target-case-investigation-manifest.json` e `prompts/16-target-investigate-case-round-materialization.md` para verificar que o contrato ainda gira em torno de `assessment.json` e `dossier.*`.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - `TARGET_INVESTIGATE_CASE_COMMAND = "/target_investigate_case"`
  - `TARGET_INVESTIGATE_CASE_MANIFEST_PATH = "docs/workflows/target-case-investigation-manifest.json"`
  - milestones atuais: `preflight | case-resolution | evidence-collection | assessment | publication`
  - artefatos centrais atuais: `assessment.json`, `publication-decision.json`, `dossier.md|dossier.json`
- Comparativo antes/depois (se houver):
  - antes: v1 com `assessment` e publication como espinha dorsal;
  - depois esperado: v2 com `diagnosis` como produto primário e publication como continuação opcional.

## Impact assessment
- Impacto funcional: o runner não consegue atender CA-01, CA-02 ou CA-04 da spec.
- Impacto operacional: qualquer implementação diagnosis-first virá improviso local sem contrato comum entre runner e target.
- Risco de regressão: alto, porque a frente toca parser, tipos, manifestos, prompt loading, milestones, round preparer e testes.
- Scope estimado (quais fluxos podem ser afetados): `src/types/target-investigate-case.ts`, `src/types/target-flow.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts`, `docs/workflows/target-case-investigation-manifest.json`, prompts e suites do fluxo.

## Initial hypotheses (optional)
- A menor entrega segura e adicionar a v2 como contrato paralelo, com adaptadores explícitos para a v1 somente onde isso for necessário para migração, sem renomear silenciosamente o fluxo atual.

## Proposed solution (optional)
- Introduzir o novo contrato `/target_investigate_case_v2` e o manifesto `target-investigate-case-v2` com slots canônicos de estágio.
- Modelar `resolve-case`, `assemble-evidence` e `diagnosis` como caminho mínimo obrigatório, com artefatos `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`.
- Preservar `output/case-investigation/<round-id>/` como namespace autoritativo do target e `investigations/<round-id>/` como espelho opcional de migração.
- Registrar `lineage` para rounds originados da v1 e impedir que a cadeia `semantic-review -> causal-debug -> root-cause-review` continue como precondição do caminho mínimo.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-09, RF-10, RF-11, CA-01
- Evidência observável: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` e a documentação do manifesto aceitam `target-investigate-case-v2` / `/target_investigate_case_v2`, validam exatamente os estágios `resolve-case`, `assemble-evidence`, `diagnosis`, `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication`, e rejeitam nomes fora desse conjunto.
- Requisito/RF/CA coberto: RF-02, RF-05, RF-09, RF-11, CA-06
- Evidência observável: o manifesto v2 passa a ser a fonte de verdade cross-repo do contrato runner/target e o validador rejeita qualquer estágio target-owned declarado sem `owner = "target-project"`, `runnerExecutor = "codex-flow-runner"`, `artifacts` e `policy` ou equivalente; quando o estágio usar instrucao semântica via Codex, `promptPath` torna-se obrigatório e segue a convenção `docs/workflows/target-investigate-case-v2-<stage>.md`; quando houver `entrypoint`, a execução documenta que ele continua sendo a autoridade operacional do estágio; `publicationPolicy` comprova explicitamente `semanticAuthority = "target-project"` e `finalPublicationAuthority = "runner"` sem transferir a semântica do caso para o runner.
- Requisito/RF/CA coberto: RF-06, RF-07, RF-12, RF-13, RF-14, CA-02, CA-04
- Evidência observável: o runner consegue orquestrar `preflight -> resolve-case -> assemble-evidence -> diagnosis` sem exigir `deep-dive`, `ticket-proposal.json` ou `publication-decision.json`, materializando `case-resolution.json`, `evidence-index.json` e `case-bundle.json`; `assemble-evidence` fica explicitamente responsável por instruções operacionais de coleta e indexação.
- Requisito/RF/CA coberto: RF-23, RF-24, RF-25, parcela runner-side de CA-06
- Evidência observável: `case-resolution.json`, `case-bundle.json` e `diagnosis.json` carregam `lineage` quando a rodada nasce da v1; o namespace autoritativo `output/case-investigation/<round-id>/` passa a ser a fonte primária da rodada; `investigations/<round-id>/` permanece, quando existir, apenas como espelho secundário; os testes provam que o caminho mínimo não depende mais da cadeia `semantic-review -> causal-debug -> root-cause-review`.
- Requisito/RF/CA coberto: validações pendentes herdadas
- Evidência observável: o fechamento registra validação observável do manifesto v2 e dos novos schemas canônicos no runner, além de prova explícita da separação entre namespace autoritativo do target e espelho runner-side durante a migração.
- Requisito/RF/CA coberto: validação automatizada do pacote
- Evidência observável: suites focadas de tipos/core/preparer/codex-client cobrindo o contrato v2 terminam em `exit 0`, junto com `npm run check`.

## Decision log
- 2026-04-08 - Nenhum ticket aberto da mesma linhagem estava disponível para reutilização ou atualização; a derivação runner-side foi iniciada do zero nesta rodada.
- 2026-04-08 - Ownership dividido com fronteira observável: este ticket fica dono do contrato, manifesto, estágios e caminho mínimo; o ticket irmão de diagnosis fica dono do conteúdo/UX diagnosis-first; o ticket irmão de continuações opcionais fica dono dos adaptadores tardios e guardrails de migração.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
