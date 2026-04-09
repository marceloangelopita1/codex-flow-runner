# [TICKET] /target_investigate_case_v2 ainda nao garante `lineage` obrigatoria em `case-resolution.json` e `case-bundle.json`

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-08 23:48Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
- Parent execplan (optional): execplans/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
- Parent commit (optional): mesmo changeset de fechamento versionado pelo runner
- Analysis stage (when applicable): closeout-validation
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: closeout-2026-04-08-target-investigate-case-v2-lineage
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-23, RF-24, RF-25 e parcela runner-side de CA-06.
  - Membros explícitos que precisam ficar observáveis: `case-resolution.json`, `case-bundle.json` e `diagnosis.json` devem carregar `lineage` quando a rodada nascer de artefatos/comandos legados; `evidence-index.json` pode continuar carregando `lineage`, mas não substitui esses três membros; `output/case-investigation/<round-id>/` permanece autoritativo e `investigations/<round-id>/` segue apenas como espelho secundário.
- Inherited assumptions/defaults (when applicable):
  - a v2 continua sendo contrato explícito e paralelo à v1;
  - o caminho mínimo diagnosis-first já foi aterrado e não deve ser reaberto aqui;
  - o namespace autoritativo do target permanece em `output/case-investigation/<round-id>/`;
  - `investigations/<round-id>/` continua sendo apenas espelho secundário durante migração.
- Inherited RNFs (when applicable):
  - preservar publication runner-side conservadora e anti-overfit;
  - manter o runner target-agnostic;
  - evitar aumentar o custo cognitivo do caminho mínimo com reabertura da cadeia v1.
- Inherited technical/documentary constraints (when applicable):
  - não acoplar o runner a heurísticas de um target específico;
  - não reabrir modelagem completa de `deep-dive`, `improvement-proposal`, `ticket-projection` ou `publication`;
  - corrigir o gap de `lineage` nas camadas de schema, normalização, round preparation e testes no mesmo changeset.
- Inherited pending/manual validations (when applicable):
  - nenhuma validação manual externa é necessária; o gap remanescente é local e automatizável.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): execution
- Smallest plausible explanation (audit/review only): o fechamento do ticket pai encontrou `lineage` objetiva apenas em `diagnosis.json` e `evidence-index.json`; `case-resolution.json` segue sem validação explícita de `lineage` no contrato normalizado, e `case-bundle.json` ainda reutiliza o schema estrito legado sem esse campo.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/types/target-investigate-case.ts
  - Decision file: tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
- Related docs/execplans:
  - execplans/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md
  - execplans/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - src/core/target-investigate-case.ts
  - src/core/target-investigate-case.test.ts
  - src/integrations/target-investigate-case-round-preparer.ts
  - src/integrations/target-investigate-case-round-preparer.test.ts
  - docs/workflows/target-case-investigation-v2-manifest.json

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): o ticket pai não pôde ser aceito sem essa cobertura; enquanto `lineage` continuar incompleta nos artefatos mínimos v2, o contrato diagnosis-first permanece sem rastreabilidade v1 -> v2 observável em todos os membros exigidos pela spec.

## Context
- Workflow area: `/target_investigate_case_v2` / artefatos canônicos / lineage / migração v1 -> v2
- Scenario: o runner já aceita o contrato v2, o manifesto dedicado, o caminho mínimo e o namespace autoritativo, mas o fechamento técnico do ticket pai identificou que a exigência de `lineage` ficou completa apenas em `diagnosis.json`.
- Input constraints:
  - manter o caminho mínimo `preflight -> resolve-case -> assemble-evidence -> diagnosis`;
  - não reintroduzir `semantic-review -> causal-debug -> root-cause-review` como pré-condição;
  - não substituir a exigência explícita dos três artefatos por consolidação em `evidence-index.json`.

## Problem statement
O contrato runner-side da v2 ainda não garante, de forma observável, que `case-resolution.json` e `case-bundle.json` carreguem `lineage` quando a rodada nasce de artefatos ou comandos legados. Sem isso, RF-23 permanece parcialmente atendido e o fechamento do ticket pai fica bloqueado por ausência de evidência positiva para cada membro explícito do conjunto exigido pela spec.

## Observed behavior
- O que foi observado:
  - `src/types/target-investigate-case.ts` exige `lineage` em `diagnosis.json` e aceita `lineage` opcional em `evidence-index.json`, mas não expõe validação equivalente para `case-resolution.json`.
  - `targetInvestigateCaseCaseBundleSchema` ainda é apenas um alias de `targetInvestigateCaseEvidenceBundleSchema`, que normaliza o shape legado sem `lineage`.
  - os testes v2 atuais comprovam namespace autoritativo, materialização de artefatos mínimos e `lineage` em `diagnosis.json`, mas não fecham a evidência positiva de `lineage` em `case-resolution.json` e `case-bundle.json`.
- Frequência (único, recorrente, intermitente): recorrente; afeta qualquer rodada v2 que precise preservar linhagem explícita com a v1.
- Como foi detectado (warning/log/test/assert): releitura adversarial do diff, do ticket pai, do ExecPlan e das suites `src/core/target-investigate-case.test.ts` e `src/integrations/target-investigate-case-round-preparer.test.ts` no fechamento técnico.

## Expected behavior
Quando a rodada v2 nascer de artefatos ou comandos legados, `case-resolution.json`, `case-bundle.json` e `diagnosis.json` devem carregar `lineage` observável e validada runner-side, preservando `output/case-investigation/<round-id>/` como fonte autoritativa e `investigations/<round-id>/` apenas como espelho secundário. A ausência de `lineage` nesses membros não pode passar como sucesso silencioso quando o contexto exigir rastreabilidade v1 -> v2.

## Reproduction steps
1. Ler `src/types/target-investigate-case.ts` e confirmar que `targetInvestigateCaseDiagnosisSchema` exige `lineage`, enquanto `targetInvestigateCaseCaseResolutionSchema` não a exige explicitamente e `targetInvestigateCaseCaseBundleSchema` reaproveita o schema legado sem esse campo.
2. Ler `src/core/target-investigate-case.test.ts` e `src/integrations/target-investigate-case-round-preparer.test.ts` e confirmar que os casos v2 fecham `lineage` em `diagnosis.json`, mas não provam a mesma cobertura positiva para `case-resolution.json` e `case-bundle.json`.
3. Comparar o resultado com RF-23 da spec e com o closure criterion do ticket pai para verificar o bloqueio de aceite.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - `RF-23`: `lineage` obrigatória em `case-resolution.json`, `case-bundle.json` e `diagnosis.json` quando houver origem v1.
  - `targetInvestigateCaseCaseBundleSchema = targetInvestigateCaseEvidenceBundleSchema`
  - `targetInvestigateCaseDiagnosisSchema` exige `lineage`, mas o contrato normalizado de `case-resolution.json` não fecha a mesma exigência.
- Comparativo antes/depois (se houver):
  - antes: o ticket pai fechou `lineage` parcialmente, concentrada em `diagnosis.json` e `evidence-index.json`;
  - depois esperado: os três artefatos exigidos pela spec ficam cobertos positiva e negativamente no runner.

## Impact assessment
- Impacto funcional: RF-23 e a parcela runner-side de CA-06 permanecem sem aceite integral.
- Impacto operacional: rounds v2 originados da v1 continuam sem trilha uniforme entre resolução do caso, bundle curado e diagnóstico.
- Risco de regressão: médio; a correção toca schema, normalização, round preparation e testes, mas fica confinada ao pacote v2 já introduzido.
- Scope estimado (quais fluxos podem ser afetados): `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts` e suites correlatas.

## Initial hypotheses (optional)
- A menor correção segura é explicitar `lineage` nos schemas/normalizadores de `case-resolution.json` e `case-bundle.json`, ajustar os fixtures v2 para exercitar origem legada e provar que o espelho runner-side preserva esses campos sem mutação semântica.

## Proposed solution (optional)
- Estender o contrato normalizado de `case-resolution.json` para aceitar/preservar `lineage` quando presente em rounds originados da v1.
- Introduzir validação runner-side de `lineage` em `case-bundle.json` sem rebaixá-lo novamente ao shape legado puro de `evidence-bundle.json`.
- Atualizar round preparation e testes focados para provar:
  - cobertura positiva de `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`;
  - namespace autoritativo e espelho secundário preservando os mesmos metadados;
  - falha observável quando o contexto exige `lineage` mas ela não aparece nos artefatos obrigatórios.

## Closure criteria
- Requisito/RF/CA coberto: RF-23 e parcela runner-side de CA-06
- Evidência observável: `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.test.ts` passam a validar `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json` quando a rodada nasce da v1, com cobertura positiva de cada membro explícito do conjunto e sem aceitar `evidence-index.json` como consolidação substitutiva.
- Requisito/RF/CA coberto: RF-24, RF-25
- Evidência observável: `src/integrations/target-investigate-case-round-preparer.test.ts` prova que `output/case-investigation/<round-id>/` continua sendo a fonte autoritativa, `investigations/<round-id>/` segue apenas como espelho secundário e ambos preservam `lineage` sem reintroduzir a cadeia `semantic-review -> causal-debug -> root-cause-review`.
- Requisito/RF/CA coberto: validação automatizada do pacote
- Evidência observável: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` e `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` terminam em `exit 0`.

## Decision log
- 2026-04-08 - O ticket pai foi fechado em `NO_GO` porque a matriz de aceite exigia `lineage` explícita em três artefatos e a implementação só fechou evidência objetiva em um deles.
- 2026-04-08 - O follow-up foi mantido local e `P0` para completar o critério sem reabrir as frentes irmãs de `diagnosis.*` e de continuações opcionais.

## Closure
- Closed at (UTC): 2026-04-09 00:16Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`; commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
- Final decision: GO
- Closure evidence:
  - Critério `RF-23` e parcela runner-side de `CA-06`: `src/types/target-investigate-case.ts` agora compartilha `targetInvestigateCaseLineageSchema` entre `case-resolution.json`, `case-bundle.json`, `evidence-index.json` e `diagnosis.json`, adiciona normalização explícita de `lineage` em `case-resolution.json` e deixa `case-bundle.json` com schema próprio em vez do alias cego do bundle legado. `src/core/target-investigate-case.ts` lê `case-bundle.json` com `targetInvestigateCaseCaseBundleSchema` e aplica `assertTargetInvestigateCaseV2LegacyLineageCoverage(...)`, que exige evidência positiva no trio `case-resolution.json`, `case-bundle.json`, `diagnosis.json` quando a rodada declara origem legada e rejeita explicitamente a consolidação por `evidence-index.json`. `src/core/target-investigate-case.test.ts` cobre o trio positivo e a negativa em que `evidence-index.json` mantém `lineage`, mas `case-bundle.json` sem `lineage` continua falhando.
  - Critério `RF-24`, `RF-25`: `src/integrations/target-investigate-case-round-preparer.ts` valida o mesmo gate de `lineage` ainda na preparação da rodada v2. `src/integrations/target-investigate-case-round-preparer.test.ts` comprova que `output/case-investigation/<round-id>/` permanece autoritativo, `investigations/<round-id>/` segue apenas como espelho secundário e ambos preservam a mesma `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`; a mesma suíte prova que `semantic-review`, `causal-debug` e `root-cause-review` não são disparados no caminho mínimo e falha quando `case-resolution.json` perde `lineage` mesmo com `evidence-index.json` ainda preenchido.
  - Critério `validação automatizada do pacote`: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` -> `exit 0` (`627` testes passando). `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> `exit 0`.
- GO rationale:
  - o changeset fecha o gap local identificado no ticket pai sem reabrir ownership fora do escopo;
  - os três artefatos explicitamente enumerados pela spec/ticket agora têm evidência positiva observável de `lineage` quando há origem legada;
  - `evidence-index.json` permanece apenas como artefato auxiliar e não fecha o aceite sozinho;
  - namespace autoritativo, espelho secundário e independência do caminho mínimo em relação à cadeia opcional permaneceram válidos.
- Manual validation pending recorded on closed ticket: nao
