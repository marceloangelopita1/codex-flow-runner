# [TICKET] /target_investigate_case_v2 ainda não trata continuações opcionais e adaptadores da v1 como etapas tardias com guardrails de migração

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
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
  - RF-03, RF-08, RF-19, RF-20, RF-21, RF-22, RF-27, RF-28 e CA-05, CA-06, CA-08.
  - Membros explícitos que precisam ficar observáveis: estágios opcionais `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`; `publication` runner-side e tardia; adaptadores v1 `semantic-review`, `causal-debug` e `root-cause-review` apenas como pontes de migração, nunca como espinha dorsal obrigatória; derivação inicial no runner com segunda onda posterior para targets aderentes.
- Inherited assumptions/defaults (when applicable):
  - o caminho mínimo da v2 não exige estágios opcionais;
  - a aderência dos targets virá depois da primeira onda runner-side;
  - o piloto `../guiadomus-matricula` é apenas referência, não contrato canônico;
  - `investigations/<round-id>/` pode permanecer somente como espelho de migração.
- Inherited RNFs (when applicable):
  - preservar publication runner-side conservadora;
  - manter a spec e o contrato target-agnostic;
  - evitar reintroduzir a complexidade da v1 como obrigatoriedade escondida.
- Inherited technical/documentary constraints (when applicable):
  - não fundir runner e target em uma unica autoridade semântica;
  - não reabrir publication automática por default;
  - não exigir que todo target implemente todos os estágios opcionais no primeiro dia.
- Inherited pending/manual validations (when applicable):
  - confirmar se algum estágio opcional precisa nascer já na primeira implementação runner-side ou pode ser deixado para a onda de adoção do target.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): N/A
- Smallest plausible explanation (audit/review only): N/A
- Remediation scope (audit/review only): N/A
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/integrations/target-investigate-case-round-preparer.ts
  - Decision file: docs/workflows/target-project-compatibility-contract.md
- Related docs/execplans:
  - docs/workflows/target-case-investigation-manifest.json
  - docs/workflows/target-case-investigation-v2-manifest.json
  - src/core/target-investigate-case.ts
  - src/types/target-investigate-case.ts
  - tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): o fluxo pode entregar o caminho mínimo antes desta frente, mas sem esses guardrails a v1 continua controlando silenciosamente a ordem e o custo cognitivo das rodadas futuras.

## Context
- Workflow area: `target-investigate-case` / estágios opcionais / publication / migração cross-repo
- Scenario: a v2 quer que `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` sejam continuações opcionais e tardias, enquanto a implementação atual continua organizada em torno de `semantic-review`, `causal-debug`, `root-cause-review`, `remediation-proposal` e `publication-decision`.
- Input constraints:
  - publication continua runner-side;
  - a segunda onda de tickets será nos targets aderentes, não nesta triagem runner-side;
  - exemplos do piloto não podem virar contrato global.

## Problem statement
Mesmo depois da introdução do caminho mínimo v2, o runner ainda precisará desacoplar as continuações opcionais da espinha dorsal da v1. Hoje `semantic-review`, `causal-debug` e `root-cause-review` aparecem como cadeia estrutural de recomposição e publication, e `publication-decision.json` é sempre materializado. Sem guardrails explícitos de migração, a v2 corre o risco de apenas renomear a v1.

## Observed behavior
- O que foi observado:
  - `src/integrations/target-investigate-case-round-preparer.ts` executa `completeSemanticReviewIfSupported(...)`, `completeCausalDebugIfSupported(...)` e `completeRootCauseReviewIfSupported(...)` em sequência dentro do preparo da rodada.
  - `src/core/target-investigate-case.ts` sempre constrói e grava `publication-decision.json`, mesmo nos caminhos no-op.
  - `docs/workflows/target-case-investigation-manifest.json` ainda nomeia `causalDebug`, `rootCauseReview`, `remediationProposal` e `publicationPolicy`, sem os estágios opcionais canônicos da v2.
  - `docs/workflows/target-project-compatibility-contract.md` ainda não explica a segunda onda de adoção v2 por targets aderentes nem a fronteira de migração entre v1 e v2.
- Frequência (único, recorrente, intermitente): recorrente; afeta toda extensão futura do fluxo.
- Como foi detectado (warning/log/test/assert): releitura da spec v2 contra o round preparer, o core atual, o manifesto v1 e a documentação de compatibilidade.

## Expected behavior
As continuações `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` devem existir como estágios opcionais, com precondições explícitas e ordem tardia. A cadeia v1 só pode reaparecer como adaptador de migração claramente delimitado, e a documentação do runner deve orientar a segunda onda de derivação em targets sem transformar o piloto em contrato global.

## Reproduction steps
1. Ler `src/integrations/target-investigate-case-round-preparer.ts` e confirmar a sequência fixa de `semantic-review`, `causal-debug` e `root-cause-review`.
2. Ler `src/core/target-investigate-case.ts` e confirmar que `publication-decision.json` é sempre escrito no fluxo atual.
3. Ler `docs/workflows/target-case-investigation-manifest.json` e `docs/workflows/target-project-compatibility-contract.md` e confirmar a ausência do modelo v2 para continuações opcionais e adoção posterior por targets.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - cadeia atual: `semantic-review -> causal-debug -> root-cause-review`
  - artifact sempre materializado: `publication-decision.json`
  - manifesto atual sem `deep-dive` nem `improvement-proposal`
- Comparativo antes/depois (se houver):
  - antes: publication e recomposições da v1 continuam sendo o backbone;
  - depois esperado: caminho mínimo diagnosis-first e continuações opcionais sob demanda, com adaptadores v1 explicitamente secundarizados.

## Impact assessment
- Impacto funcional: CA-05 e CA-08 permanecem sem superfície observável, e CA-06 fica dependente de comportamento implícito da v1.
- Impacto operacional: a v2 corre risco de manter o mesmo custo cognitivo da v1 e dificultar a adoção por novos targets.
- Risco de regressão: médio, porque a frente toca orquestração tardia, docs de compatibilidade, publication e validações de migração.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/target-investigate-case-round-preparer.ts`, `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, docs de manifesto/compatibilidade e suites do fluxo.

## Initial hypotheses (optional)
- O melhor guardrail é tornar explícita a fronteira entre caminho mínimo v2 e adaptadores v1, com documentação de rollout por estágio e gates que evitem a recaptura do fluxo pela publication.

## Proposed solution (optional)
- Modelar `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como continuações opcionais e tardias, com precondições baseadas no diagnóstico.
- Rebaixar `semantic-review`, `causal-debug` e `root-cause-review` a adaptadores de migração, quando usados, com ownership e impacto claramente documentados.
- Tornar `publication` efetivamente opcional no caminho mínimo v2.
- Atualizar a documentação de compatibilidade para explicar a segunda onda de tickets nos targets aderentes e registrar a decisão sobre quais estágios opcionais entram ou não na primeira implementação runner-side.

## Closure criteria
- Requisito/RF/CA coberto: RF-08, RF-19, RF-20, RF-21, CA-05
- Evidência observável: o runner e o manifesto v2 modelam `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como estágios opcionais e tardios; `deep-dive` só pode ser acionado por ambiguidade causal, baixa confiança ou necessidade real de localizar a menor mudança plausível; `improvement-proposal` e `ticket-projection` não reabrem o diagnóstico; quando `ticket-projection` for suportado e executado, a rodada materializa `ticket-proposal.json` no namespace autoritativo do target e o fechamento registra evidência objetiva de que o artefato respeita as convenções declaradas pelo próprio projeto alvo para esse ticket candidato, sem depender de interpretação implícita fora do ticket.
- Requisito/RF/CA coberto: RF-22, parcela runner-side de CA-06
- Evidência observável: `publication` continua runner-side e conservadora, mas deixa de ser parte obrigatória do caminho mínimo; o runner só a executa quando a rodada realmente atravessar essa continuação opcional.
- Requisito/RF/CA coberto: RF-03, RF-27, RF-28, CA-08
- Evidência observável: a documentação do runner registra que a derivação inicial da v2 ficou no próprio runner e explicita a segunda onda de tickets para targets aderentes, com a cadeia v1 tratada apenas como adaptador de migração e sem acoplamento ao piloto `../guiadomus-matricula`.
- Requisito/RF/CA coberto: validação pendente herdada
- Evidência observável: o fechamento registra, no próprio ticket, a decisão objetiva sobre quais estágios opcionais entram já na primeira implementação runner-side e quais ficam para a onda de adoção do target, com justificativa e guardrails de migração.
- Requisito/RF/CA coberto: validação automatizada/documental do pacote
- Evidência observável: testes focados provam que o caminho mínimo não dispara automaticamente as continuações opcionais; a documentação de compatibilidade e do manifesto v2 foi atualizada no mesmo changeset.

## Decision log
- 2026-04-08 - Nenhum ticket aberto da mesma linhagem estava disponível para reutilização ou atualização; a derivação runner-side foi iniciada do zero nesta rodada.
- 2026-04-08 - Ownership dividido com fronteira observável: este ticket fica dono das continuações opcionais, da publication tardia e dos guardrails de migração; o ticket irmão de contrato fica dono do caminho mínimo; o ticket irmão de diagnosis fica dono das superfícies operator-facing.

## Closure
- Closed at (UTC): 2026-04-09 00:58Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: execplans/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md
  - Commit: mesmo changeset de fechamento versionado pelo runner
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.

## Closure validation
- Decisão final: `GO`
- RF-08, RF-19, RF-20, RF-21, CA-05:
  - `src/types/target-investigate-case.ts` agora modela explicitamente a matriz finita de continuações opcionais e guardrails de migração, incluindo `TARGET_INVESTIGATE_CASE_V2_DEEP_DIVE_TRIGGER_VALUES = ["causal-ambiguity", "low-confidence", "smallest-plausible-change-unclear"]`, `TARGET_INVESTIGATE_CASE_V2_RUNNER_FIRST_STAGE_VALUES = ["ticket-projection", "publication"]`, `TARGET_INVESTIGATE_CASE_V2_TARGET_ADOPTION_STAGE_VALUES = ["deep-dive", "improvement-proposal"]` e `TARGET_INVESTIGATE_CASE_V2_MIGRATION_ADAPTER_VALUES = ["semantic-review", "causal-debug", "root-cause-review"]`, além de schemas estritos para `deepDive`, `improvementProposal`, `ticketProjection` e `publication`.
  - `docs/workflows/target-case-investigation-v2-manifest.json` explicita `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como continuações opcionais e tardias com `promptPath` canônico, `executionOrder`, `adoptionWave`, gatilhos permitidos de `deep-dive`, proibição de reabrir diagnóstico e vínculo de `ticket-projection` com `ticket-proposal.json` + `ticketPublicationPolicy`.
  - `docs/workflows/target-investigate-case-v2-deep-dive.md`, `docs/workflows/target-investigate-case-v2-improvement-proposal.md` e `docs/workflows/target-investigate-case-v2-ticket-projection.md` registram o framing semântico de cada slot opcional, preservando que `deep-dive` só entra por ambiguidade/baixa confiança/menor mudança plausível incerta, que `improvement-proposal` só aparece depois de diagnóstico suficiente e que `ticket-projection` não reabre o diagnóstico.
  - Evidência automatizada positiva do conjunto aceito: `src/core/target-investigate-case.test.ts` cobre `loadTargetInvestigateCaseManifest aceita o manifesto v2 dedicado com stages, minimumPath e namespace canonicos`, `loadTargetInvestigateCaseManifest rejeita manifesto v2 com gatilho de deep-dive fora da matriz canonica`, `evaluateTargetInvestigateCaseRound nao grava publication-decision no caminho minimo v2` e `evaluateTargetInvestigateCaseRound atravessa publication no v2 a partir de ticket-projection target-owned sem depender de causal-debug`.
- RF-22, parcela runner-side de CA-06:
  - `src/core/target-investigate-case.ts` passou a decidir `shouldTraverseTargetInvestigateCasePublication(...)` antes de entrar em publication; no fluxo v2, `publication` só é atravessada quando o manifesto declara a etapa, `assessment.publication_recommendation.recommended_action === "publish_ticket"` e `ticket-proposal.json` já existe no namespace autoritativo do target.
  - O mesmo arquivo grava `publication-decision.json` apenas quando `shouldTraversePublication` é verdadeiro; fora disso, retorna `buildSkippedPublicationDecision(...)` com `publication-continuation-not-entered`, sem materializar artefato versionável e preservando `publication` como continuação runner-side tardia e conservadora.
  - Evidência automatizada: `src/core/target-investigate-case.test.ts` prova a ausência de `publication-decision.json` no caminho mínimo v2 e a travessia tardia runner-side quando `ticket-projection` target-owned está pronto.
- RF-03, RF-27, RF-28, CA-08:
  - `docs/workflows/target-project-compatibility-contract.md` registra explicitamente que a primeira onda runner-side cobre `ticket-projection` e `publication`, enquanto `deep-dive` e `improvement-proposal` ficam para a segunda onda de adoção nos targets aderentes; a cadeia v1 fica limitada a adaptadores de migração explícitos e `../guiadomus-matricula` permanece apenas como referência histórica não canônica.
  - `docs/workflows/target-case-investigation-v2-manifest.json` reforça o mesmo contrato por `adoptionPlan` e `migration`, tornando observáveis os membros aceitos da allowlist de adaptadores e proibindo backbone legado.
  - Evidência automatizada/documental complementar: `src/integrations/target-investigate-case-round-preparer.test.ts` cobre `CodexCliTargetInvestigateCaseRoundPreparer preserva output/case-investigation como namespace autoritativo v2 e nao dispara a cadeia opcional`, garantindo que o caminho mínimo continua diagnosis-first sem recaptura silenciosa pela v1.
- Validação pendente herdada:
  - A decisão objetiva desta primeira implementação runner-side ficou registrada no próprio changeset: entram já agora `ticket-projection` e `publication`; `deep-dive` e `improvement-proposal` permanecem como slots canônicos para a segunda onda target-side. A cadeia v1 aceita apenas os adaptadores `semantic-review`, `causal-debug` e `root-cause-review`, sem recuperar backbone obrigatório.
- Validação automatizada/documental do pacote:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts` -> `exit 0` com `630` testes passando.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> `exit 0`.
  - `rg -n 'segunda onda|targets aderentes|adaptador(es)? de migracao|ticket-projection|publication|ticketPublicationPolicy' docs/workflows/target-project-compatibility-contract.md docs/workflows/target-case-investigation-v2-manifest.json src/core/target-investigate-case.ts` confirmou os anchors documentais e runtime exigidos pelo ExecPlan no mesmo changeset.
- Manual validation pending recorded on closed ticket: nao
