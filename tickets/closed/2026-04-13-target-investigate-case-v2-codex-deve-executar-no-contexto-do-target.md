# [TICKET] /target_investigate_case_v2 executa Codex fora do contexto natural do target

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P2
- Severity: S3
- Created at (UTC): 2026-04-13 15:49Z
- Reporter: mapita
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): post-run diagnosis
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): guiadomus-matricula
- Request ID: output/case-investigation/2026-04-12T16-15-14Z
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable): RF-04, RF-05, RF-09, RF-14, CA-04, CA-06
- Inherited assumptions/defaults (when applicable): o target é autoridade semântica; o runner deve carregar prompts declarados pelo target e executar as etapas em fluxo sequencial.
- Inherited RNFs (when applicable): reduzir dependência de contexto tácito e manter baixo custo cognitivo.
- Inherited technical/documentary constraints (when applicable): o runner não deve embutir heurísticas específicas do target.
- Inherited pending/manual validations (when applicable): validar em target real que Codex respeita `AGENTS.md`, runbook e paths locais quando invocado pela v2.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): execution
- Smallest plausible explanation (audit/review only): a execução atual do Codex é montada pelo runner com paths absolutos e contexto adicional, mas nasce no cwd do runner; isso aumenta a chance de a IA operar como visitante externo em vez de agente dentro do target.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - docs/workflows/target-investigate-case-v2-target-onboarding.md
  - execplans/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto):

## Context
- Workflow area: `/target_investigate_case_v2` / execução Codex por estágio / contexto target-owned
- Scenario: o runner carrega o prompt do target, mas a chamada Codex CLI de estágio usa o repositório do runner como cwd. O prompt informa o caminho do target, mas o contexto natural de instruções e navegação da IA fica menos aderente ao projeto investigado.
- Input constraints: preservar o runner como orquestrador; não perder referência ao runner repo; respeitar AGENTS e documentação local do target.

## Problem statement
O Codex que executa `resolve-case`, `assemble-evidence` e `diagnosis` deveria trabalhar dentro do repositório alvo, porque é ali que vivem `AGENTS.md`, runbook, scripts, outputs e evidências. Rodar a sessão a partir do runner aumenta a chance de drift, caminhos absolutos desnecessários e decisões menos naturais.

## Observed behavior
- O que foi observado: a execução de estágio constrói prompt target-owned, mas a chamada `runCodexCommand` usa cwd do runner.
- Frequência (único, recorrente, intermitente): recorrente em todas as execuções v2 com o materializador Codex.
- Como foi detectado (warning/log/test/assert): leitura de `src/integrations/codex-client.ts`.

## Expected behavior
Cada etapa target-owned deve ser executada pelo Codex com cwd no projeto alvo. O runner continua injetando referência ao próprio repo, round id, paths e política de orquestração, mas a IA deve herdar naturalmente o contexto local do target.

## Reproduction steps
1. Ler `src/integrations/codex-client.ts` no método que executa estágio v2.
2. Confirmar que `runCodexCommand` recebe cwd do runner.
3. Executar uma rodada v2 e observar que o prompt precisa compensar com caminhos absolutos e instruções explícitas para entrar no target.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
- Warnings/codes relevantes:
- Comparativo antes/depois (se houver): depois, testes devem provar que a chamada Codex usa `targetProject.path` como cwd para estágios target-owned.

## Impact assessment
- Impacto funcional: baixo a médio; não causa sozinho o bloqueio observado, mas aumenta fricção e drift.
- Impacto operacional: o Codex trabalha menos naturalmente com os documentos e comandos do target.
- Risco de regressão: baixo; precisa preservar prompts com referência ao runner e variáveis de ambiente.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/codex-client.ts` e testes focados de client.

## Initial hypotheses (optional)
- `runTargetInvestigateCaseV2Stage(...)` pode chamar `runCodexCommand` com `cwd: request.targetProject.path`.
- O prompt deve manter `runnerRepoPath` como referência explícita para docs e contrato do runner.

## Proposed solution (optional)
- Alterar apenas a execução dos estágios target-owned de investigação v2 para cwd do target.
- Manter execução de fluxos runner-owned no cwd atual.
- Cobrir com teste que o cwd passado à dependência é o target.

## Closure criteria
- Requisito/RF/CA coberto: RF-04, RF-05, RF-14, CA-04, CA-06.
- Evidência observável: teste de `CodexCliTicketFlowClient.runTargetInvestigateCaseV2Stage` prova `cwd = targetProject.path`.
- Evidência observável: prompt ainda inclui `runnerRepoPath`, `runnerReference`, round id e artifact paths.
- Evidência observável: nenhum fluxo não relacionado muda de cwd.

## Decision log
- 2026-04-13 - Abrir como melhoria separada P2 - ajuda a IA a trabalhar no lugar certo, mas o bloqueio de schema fica no ticket P1 principal.

## Closure
- Closed at (UTC): 2026-04-13 17:05Z
- Closure reason: fixed
- Related PR/commit/execplan: execplan `execplans/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`; commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.

### Closure evidence
- Resultado final: GO.
- Checklist compartilhado aplicado: `docs/workflows/codex-quality-gates.md` foi relido; diff, ticket, ExecPlan, spec de origem, onboarding v2, `DOCUMENTATION.md` e `PLANS.md` foram relidos antes da decisão.
- RF-04 e CA-06: `git diff -- src/integrations/codex-client.ts` mostra uma alteração local e target-agnostic, trocando apenas o `cwd` da chamada `runCodexCommand` dentro de `runTargetInvestigateCaseV2Stage(...)` para `request.targetProject.path`, sem adicionar heurística, path, script ou semântica específica de `guiadomus-matricula`.
- RF-05: `src/integrations/codex-client.test.ts` cobre que `runTargetInvestigateCaseV2Stage(...)` chama `runCodexCommand` com `cwd = fixture.project.path` e `cwd != runnerRepoPath`, permitindo que Codex herde naturalmente `AGENTS.md`, runbook, scripts e paths locais do target.
- RF-14 e CA-04: o caso parametrizado de `stage: "assemble-evidence"` valida `cwd = targetProject.path`, `stagePromptPath = docs/workflows/target-investigate-case-v2-assemble-evidence.md` e presença dos artefatos `evidence-index.json` e `case-bundle.json` no prompt.
- Closure criterion 1: o teste `runTargetInvestigateCaseV2Stage executa estagios target-owned no cwd do target preservando contexto do runner` cobre explicitamente `resolve-case`, `assemble-evidence` e `diagnosis`, capturando o request recebido por `runCodexCommand` para cada membro e esperando `cwd` igual ao path do target.
- Closure criterion 2: o mesmo teste valida que o prompt continua incluindo `runnerRepoPath`, `runnerReference`, `roundId`, `roundDirectory`, manifesto, runbook, `stagePromptPath`, `stageArtifacts` e `artifactPaths` serializados.
- Closure criterion 3: `git diff -- src/integrations/codex-client.ts` mostra mudança restrita ao bloco de `runTargetInvestigateCaseV2Stage(...)`; `rg -n "cwd: this\\.repoPath|cwd: request\\.targetProject\\.path" src/integrations/codex-client.ts` confirma que os fluxos runner-owned e não relacionados continuam em `this.repoPath`, enquanto somente a v2 target-owned usa `request.targetProject.path`.
- RF-09 herdado: o teste valida que `promptTemplatePath` continua sendo resolvido por `path.join(fixture.project.path, stagePromptPath)` para prompts declarados pelo target, e os testes existentes preservam a etapa entrypoint-only sem prompt externo.
- RNFs/restrições herdadas: o prompt final preserva o bloco de contexto adicional com runner repo, referência textual do runner, round id, manifesto, runbook, artefatos obrigatórios e facts JSON; a mudança de `cwd` reduz a necessidade de instruções compensatórias para navegar manualmente até o target.
- Allowlist/enumeração finita: `targetOwnedStageCases` cobre positivamente todos os três estágios obrigatórios aceitos neste método (`resolve-case`, `assemble-evidence`, `diagnosis`) sem consolidação agregada. O ticket/ExecPlan não exigem teste negativo para estágio fora do conjunto; a cobertura de fora do escopo foi feita por revisão de diff, `rg` de `cwd` e typecheck da união tipada.
- Validações executadas: `npm test -- src/integrations/codex-client.test.ts` em 2026-04-13 17:05Z, com 203 testes passando; `npm run check` em 2026-04-13 17:05Z, com exit 0.
- Revisão de consistência: `git status --short` e `find . -maxdepth 3` para artefatos temporários confirmaram apenas alterações intencionais do ticket/follow-up e nenhum lixo local detectado.

### Manual validation pending
- Entrega técnica local runner-side: concluída e validada por teste automatizado, typecheck e revisão de diff.
- Validação manual externa pendente: executar uma rodada real de `/target_investigate_case_v2` contra um target aderente e confirmar que Codex respeita `AGENTS.md`, runbook e paths locais quando invocado pela v2 no `cwd` do projeto alvo.
- Como executar: operador deve acionar `/target_investigate_case_v2 <target> <case-ref> --workflow <workflow>` em ambiente real com target aderente, aguardar a conclusão e inspecionar logs/artefatos em `output/case-investigation/<round-id>/` para confirmar que os estágios target-owned operaram a partir do target.
- Responsável operacional: operador humano do runner/target no ambiente real.
- Classificação: validação externa/manual; não bloqueia o GO técnico deste ticket.
