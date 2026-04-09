# [TICKET] target-investigate-case-v2 ainda não executa `resolve-case -> assemble-evidence -> diagnosis` como estágios reais

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-09 18:10Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
- Parent execplan (optional): execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): architectural-review
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: architectural-review-2026-04-09-target-investigate-case-v2-stage-execution
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-04, RF-05, RF-06, RF-07, RF-09, RF-12, RF-13, RF-14, RF-15, RF-18, RF-24, RF-25, RF-26, RF-27; CA-02, CA-03, CA-04, CA-06 e CA-07.
  - O runner precisa operacionalizar explicitamente os estágios `resolve-case`, `assemble-evidence` e `diagnosis`, carregando os prompts canônicos do target e deixando de depender do prompt monolítico `16-target-investigate-case-round-materialization.md`.
- Inherited assumptions/defaults (when applicable):
  - a v1 não é mais objetivo de compatibilidade desta frente;
  - o caminho mínimo encerra em `diagnosis`;
  - publication continua tardia e fora do caminho mínimo;
  - o projeto alvo permanece como autoridade semântica do caso e do framing de cada estágio.
- Inherited RNFs (when applicable):
  - manter o runner target-agnostic;
  - preservar rastreabilidade por estágio;
  - reduzir custo cognitivo e clareza operacional para o humano.
- Inherited technical/documentary constraints (when applicable):
  - não reintroduzir `assessment.json` e `dossier.*` como bloqueios do caminho mínimo;
  - não embutir no runner heurísticas operacionais específicas de target;
  - manter o fluxo sequencial.
- Inherited pending/manual validations (when applicable):
  - validar que os prompts canônicos do target entram de fato na execução runner-side;
  - validar milestones e `failedAtMilestone` coerentes com o estágio real.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): execution
- Smallest plausible explanation (audit/review only): a implementação runner-side adotou nomenclatura e manifesto da v2, mas deixou a execução mínima presa a uma única etapa de materialização genérica, o que impede a separação real entre resolução do caso, coleta de evidências e diagnóstico.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/integrations/target-investigate-case-round-preparer.ts
  - Decision file: src/integrations/codex-client.ts
- Related docs/execplans:
  - execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
  - tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): enquanto a execução continuar monolítica, o runner segue operando a v2 com semântica difusa, milestones enganadores e dependência residual de superfícies legadas.

## Context
- Workflow area: `/target_investigate_case_v2` / orquestração runner-side / Codex CLI / round preparation
- Scenario: o contrato v2 já foi endurecido no schema/manifesto, mas o runtime ainda chama `runTargetInvestigateCaseRoundMaterialization(...)` e valida tudo depois, como se fosse uma única fase.
- Input constraints:
  - substituir o caminho monolítico por execução stage-by-stage;
  - manter a mudança honesta quanto ao que ainda precisa ser removido do runtime;
  - validar com testes focados e tipagem.

## Problem statement
O runner ainda não executa `resolve-case`, `assemble-evidence` e `diagnosis` como estágios reais. Isso mantém a v2 sem operacionalização do contrato de prompts canônicos por estágio e mistura a taxonomia de falha e a materialização de artefatos mínimos num bloco único.

## Observed behavior
- O que foi observado:
  - `src/integrations/target-investigate-case-round-preparer.ts` chama apenas `runTargetInvestigateCaseRoundMaterialization(...)`.
  - `src/integrations/codex-client.ts` carrega somente `prompts/16-target-investigate-case-round-materialization.md`.
  - o prompt monolítico ainda concentra o framing do fluxo, em vez de o runner injetar o prompt canônico do target por estágio.
- Frequência (único, recorrente, intermitente): recorrente; afeta toda rodada v2.
- Como foi detectado (warning/log/test/assert): revisão arquitetural direta do fluxo `preparer -> codex-client -> prompt`.

## Expected behavior
O runner deve executar `resolve-case`, depois `assemble-evidence`, depois `diagnosis`, validando artefatos do estágio correspondente após cada etapa. Cada execução stage-owned precisa carregar `promptPath` e `entrypoint` do estágio no manifesto, sem depender do prompt monolítico legado.

## Reproduction steps
1. Ler `src/integrations/target-investigate-case-round-preparer.ts` e confirmar a chamada única para `runTargetInvestigateCaseRoundMaterialization(...)`.
2. Ler `src/integrations/codex-client.ts` e confirmar o uso exclusivo de `prompts/16-target-investigate-case-round-materialization.md`.
3. Executar a suíte focada atual e observar que ela valida milestones v2, mas não prova execução runner-side separada por estágio.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - revisão do wiring `preparer -> codex-client -> prompt` em 2026-04-09.
- Warnings/codes relevantes:
  - drift entre contrato por estágio e execução monolítica.
- Comparativo antes/depois (se houver):
  - antes: uma única materialização com validação posterior;
  - depois esperado: três execuções sequenciais explícitas, cada uma ancorada no estágio canônico correspondente.

## Impact assessment
- Impacto funcional:
  - o runner continua sem separar claramente resolução do caso, coleta e diagnóstico.
- Impacto operacional:
  - `failedAtMilestone` e logs podem apontar para estágio errado;
  - o operador continua sem rastreabilidade real por estágio.
- Risco de regressão:
  - alto; a mudança cruza `codex-client`, `preparer`, `core` e testes.
- Scope estimado (quais fluxos podem ser afetados):
  - materialização v2, validação de artefatos do caminho mínimo, telemetry/milestones e testes focados do fluxo.

## Initial hypotheses (optional)
- um prompt runner-side pequeno por estágio, que envolva o prompt canônico do target e os fatos do round, permite operacionalizar o contrato sem codificar semântica de target no runner.

## Proposed solution (optional)
- introduzir um request/result stage-aware no `codex-client`;
- trocar o `round-preparer` para executar `resolve-case`, `assemble-evidence` e `diagnosis` em sequência;
- validar artefatos por estágio e corrigir `failedAtMilestone`;
- remover do caminho mínimo as validações obrigatórias de `assessment`/`dossier`.

## Closure criteria
- Requisito/RF/CA coberto: RF-06, RF-07, RF-09, RF-12, RF-13, RF-14, RF-15, RF-18, CA-02, CA-04
- Evidência observável: `src/integrations/target-investigate-case-round-preparer.ts` passa a executar explicitamente `resolve-case`, `assemble-evidence` e `diagnosis` em sequência, com validação incremental dos artefatos mínimos do estágio.
- Requisito/RF/CA coberto: RF-04, RF-05, RF-09, RF-14, CA-06
- Evidência observável: `src/integrations/codex-client.ts` deixa de depender do prompt monolítico `16-target-investigate-case-round-materialization.md` para o caminho mínimo v2 e passa a carregar o `promptPath` do estágio declarado pelo target.
- Requisito/RF/CA coberto: RF-15, RF-18, RF-25, RF-26, RF-27, CA-03, CA-07
- Evidência observável: o caminho mínimo v2 conclui com `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`, sem exigir `assessment.json` nem `dossier.*`, e as superfícies operator-facing continuam diagnosis-first.
- Requisito/RF/CA coberto: validação automatizada do passo
- Evidência observável: suites focadas de `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, `src/integrations/codex-client.test.ts` e `src/integrations/telegram-bot.test.ts` terminam em `exit 0`, junto com `npm run check`.

## Decision log
- 2026-04-09 - Este ticket nasce como follow-up direto do hard cut contratual da v2.
- 2026-04-09 - A etapa foi separada do ticket anterior porque agora a frente é de arquitetura/runtime, não apenas de contrato/schema.

## Closure
- Closed at (UTC): 2026-04-09 18:56Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md; commit de fechamento local da orquestração por estágio.
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
