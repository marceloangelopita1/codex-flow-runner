# [TICKET] target-investigate-case-v2 ainda carrega obrigatoriedades legadas no contrato runner-side

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-09 17:55Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): N/A
- Parent execplan (optional): N/A
- Parent commit (optional): N/A
- Analysis stage (when applicable): architectural-review
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: architectural-review-2026-04-09-target-investigate-case-v2
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-13, RF-15, RF-18, RF-22, RF-25, RF-26, RF-27; CA-02, CA-04, CA-05, CA-06 e CA-07.
  - O corte runner-side desta etapa deve remover do contrato mínimo v2 a obrigatoriedade de `assessment.json`, `dossier.*` e `publication-decision.json`, além de tratar `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como realmente opcionais.
- Inherited assumptions/defaults (when applicable):
  - o caminho mínimo da v2 é `preflight -> resolve-case -> assemble-evidence -> diagnosis`;
  - o projeto alvo continua sendo a autoridade semântica do caso;
  - `diagnosis.md` e `diagnosis.json` são os artefatos principais operator-facing;
  - publication continua tardia e runner-side, mas não pertence ao caminho mínimo.
- Inherited RNFs (when applicable):
  - manter o runner target-agnostic;
  - reduzir custo cognitivo real para o operador;
  - preservar fluxo sequencial e rastreabilidade objetiva.
- Inherited technical/documentary constraints (when applicable):
  - não usar a herança da v1 como justificativa para manter complexidade indevida na v2;
  - alinhar manifesto, schema, summary e superfícies de validação ao contrato diagnosis-first;
  - atualizar a spec como documento vivo no mesmo ciclo.
- Inherited pending/manual validations (when applicable):
  - validar a consistência tipada do corte contratual com `npm run check`;
  - validar suites focadas do manifesto/runtime mínimo da v2.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): a implementação runner-side foi aceita porque testes e auditoria final reforçaram o shape existente, mas não provaram aderência plena ao contrato diagnosis-first da spec.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/types/target-investigate-case.ts
  - Decision file: src/core/target-investigate-case.ts
- Related docs/execplans:
  - execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): o contrato v2 segue comunicando e validando artefatos legados como backbone do fluxo; isso distorce a adoção target-side, reduz clareza diagnóstica e perpetua drift arquitetural no runner.

## Context
- Workflow area: `/target_investigate_case_v2` / contrato cross-repo / manifesto / schema runner-side
- Scenario: a revisão arquitetural confirmou que o runner já expõe o nome e alguns milestones da v2, mas ainda carrega shape mínimo e validações herdadas da v1 no contrato central.
- Input constraints:
  - executar somente o passo 1 agora;
  - não implementar ainda a orquestração stage-by-stage inteira;
  - usar ticket e ExecPlan por se tratar de mudança de contrato/schema crítico.

## Problem statement
O contrato runner-side da v2 ainda exige ou tolera como backbone artefatos e superfícies legadas que a spec diagnosis-first não coloca no caminho mínimo. Isso aparece no schema do manifesto, no manifesto v2 de referência e em testes que continuam modelando `assessment.json`, `dossier.*` e continuações opcionais como se fossem parte estrutural do contrato.

## Observed behavior
- O que foi observado:
  - `src/types/target-investigate-case.ts` ainda valida `outputs.assessment`, `outputs.dossier` e `outputs.publicationDecision` como parte do shape central do manifesto.
  - o manifesto v2 em `docs/workflows/target-case-investigation-v2-manifest.json` ainda declara `assessment`, `dossier` e `publicationDecision` em `outputs`, além de `diagnosis.artifacts` contendo `assessment.json`.
  - a validação v2 ainda força a explicitação dos estágios opcionais e de metadados de migração/adoção que não pertencem ao mínimo diagnosis-first.
- Frequência (único, recorrente, intermitente): recorrente; afeta toda leitura runner-side do contrato v2.
- Como foi detectado (warning/log/test/assert): revisão arquitetural manual com releitura da spec, do manifesto v2, de `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts` e dos testes focados.

## Expected behavior
O contrato v2 do runner deve aceitar e priorizar apenas o mínimo canônico diagnosis-first. `assessment.json`, `dossier.*` e `publication-decision.json` não devem aparecer como obrigatoriedade do manifesto v2; estágios opcionais só devem ser validados quando presentes; e o manifesto de referência precisa refletir esse corte duro.

## Reproduction steps
1. Ler `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md` nas seções de caminho mínimo, artefatos canônicos e requisitos funcionais.
2. Ler `src/types/target-investigate-case.ts` e verificar a obrigatoriedade runner-side de `outputs.assessment`, `outputs.dossier`, `outputs.publicationDecision` e dos estágios opcionais.
3. Ler `docs/workflows/target-case-investigation-v2-manifest.json` e confirmar que o exemplo canônico ainda declara artefatos e políticas legadas no caminho mínimo.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - revisão manual do schema v2, do manifesto v2 e dos testes focados em 2026-04-09.
- Warnings/codes relevantes:
  - drift entre spec diagnosis-first e shape aceito/emitido runner-side.
- Comparativo antes/depois (se houver):
  - antes: contrato v2 ainda impõe shape com artefatos auxiliares como parte estrutural;
  - depois esperado: contrato v2 aceita apenas o mínimo diagnosis-first e trata o restante como fora do mínimo ou ausente.

## Impact assessment
- Impacto funcional:
  - targets continuam recebendo um contrato mais pesado do que a spec promete.
- Impacto operacional:
  - a adoção fica mais cara e a análise do operador continua misturando diagnóstico com publication/artefatos auxiliares.
- Risco de regressão:
  - moderado; o corte contratual altera schemas e fixtures centrais.
- Scope estimado (quais fluxos podem ser afetados):
  - manifesto v2, parsing/normalização do contrato, testes do runner e a documentação viva da spec.

## Initial hypotheses (optional)
- o ajuste pode ser feito primeiro no contrato/schema e no manifesto de referência, preservando apenas fallbacks internos estritamente necessários para o runtime continuar íntegro até os próximos passos.

## Proposed solution (optional)
- cortar agora o contrato v2 em `src/types/target-investigate-case.ts`;
- alinhar o manifesto v2 de referência ao mínimo diagnosis-first;
- atualizar a spec para `pending`/`in_progress`;
- manter os próximos passos de runtime explícitos, sem vender este passo como correção completa da orquestração.

## Closure criteria
- Requisito/RF/CA coberto: RF-06, RF-07, RF-13, RF-15, RF-18, CA-02
- Evidência observável: `src/types/target-investigate-case.ts` deixa de exigir `outputs.assessment`, `outputs.dossier` e `outputs.publicationDecision` no contrato v2, e rejeita esses outputs quando `flow = "target-investigate-case-v2"`.
- Requisito/RF/CA coberto: RF-08, RF-09, CA-05
- Evidência observável: a validação v2 exige apenas `resolve-case`, `assemble-evidence` e `diagnosis`; `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` só são validados quando declarados no manifesto.
- Requisito/RF/CA coberto: RF-13, RF-15, RF-26
- Evidência observável: o manifesto v2 em `docs/workflows/target-case-investigation-v2-manifest.json` passa a expor `diagnosis.artifacts = ["diagnosis.md", "diagnosis.json"]` e remove os outputs legados do caminho mínimo.
- Requisito/RF/CA coberto: validação automatizada do passo
- Evidência observável: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts` e `npm run check` terminam com `exit 0`.

## Decision log
- 2026-04-09 - Ticket aberto a partir de revisão arquitetural direta do código atual, não de uma nova triagem de spec. Motivo: a spec estava marcada como `done`, mas o contrato observado ainda divergia materialmente do desenho diagnosis-first.
- 2026-04-09 - O escopo imediato deste ticket foi limitado ao passo 1 do plano: corte do contrato/schema e do manifesto de referência, sem vender esta etapa como implementação completa do runtime stage-by-stage.

## Closure
- Closed at (UTC): 2026-04-09 18:56Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md; commit de fechamento local do hard cut v2.
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
