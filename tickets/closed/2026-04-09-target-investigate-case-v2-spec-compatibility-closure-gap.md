# [TICKET] target-investigate-case-v2 ainda nao fechou a compatibilidade real runner-side com a spec diagnosis-first

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-09 19:33Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): N/A
- Parent execplan (optional): execplans/2026-04-09-target-investigate-case-v2-spec-compatibility-closure-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): architectural-review
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: architectural-review-2026-04-09-target-investigate-case-v2-spec-compatibility-closure
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-13, RF-15, RF-18, RF-24, RF-25, RF-26 e RF-27; CA-02, CA-04, CA-05, CA-06 e CA-07.
  - O runner precisa aceitar o contrato público mínimo da spec, preservar a etapa real da falha e esconder `assessment`/`dossier` do branch v2 no caminho mínimo.
- Inherited assumptions/defaults (when applicable):
  - o caminho mínimo v2 continua sendo `preflight -> resolve-case -> assemble-evidence -> diagnosis`;
  - publication continua runner-side, conservadora e tardia;
  - o projeto alvo continua autoridade semântica do caso.
- Inherited RNFs (when applicable):
  - manter o runner target-agnostic;
  - manter fluxo sequencial;
  - reduzir custo cognitivo e drift contratual para targets aderentes.
- Inherited technical/documentary constraints (when applicable):
  - não compatibilizar targets externos contra o contrato errado;
  - não tratar compatibilidade transitória como desenho final correto;
  - atualizar a spec como documento vivo no mesmo ciclo.
- Inherited pending/manual validations (when applicable):
  - validar fixture literal da spec;
  - validar falha stage-by-stage em `assemble-evidence` e `diagnosis`;
  - validar ausência de `assessment`/`dossier` no contexto mínimo do v2.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): os follow-ups fechados hoje corrigiram boa parte do comportamento, mas a suíte e o fechamento documental ainda aceitaram evidência insuficiente para provar o hard cut contratual real da v2.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/types/target-investigate-case.ts
  - Decision file: src/integrations/target-investigate-case-round-preparer.ts
- Related docs/execplans:
  - execplans/2026-04-09-target-investigate-case-v2-spec-compatibility-closure-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): enquanto o runner continuar exigindo um manifesto mais largo do que a spec, colapsando falhas para `resolve-case` e vazando artefatos legados no branch v2, a próxima onda de compatibilização target-side será feita contra um contrato errado.

## Context
- Workflow area: `/target_investigate_case_v2` / contrato cross-repo / round-preparer / prompt context / fechamento runner-side
- Scenario: a revisão arquitetural de 2026-04-09 confirmou que a v2 evoluiu materialmente, mas ainda não fechou compatibilidade real com a spec diagnosis-first.
- Input constraints:
  - executar agora a reabertura honesta e os três cortes runner-side;
  - não tratar testes verdes atuais como prova suficiente;
  - manter rastreabilidade explícita com a spec e com o novo ExecPlan.

## Problem statement
O runner ainda não fechou a compatibilidade real da v2 com o contrato público da spec. O manifesto aceito/normalizado segue mais largo do que a spec publica, o preparador ainda pode reclassificar falhas reais de `assemble-evidence` e `diagnosis` como `resolve-case`, e o branch v2 ainda expõe `assessmentPath` / `dossierPath` em superfícies técnicas que o target implementer não deveria precisar considerar no caminho mínimo.

## Observed behavior
- O que foi observado:
  - a spec descreve o contrato público mínimo da v2 a partir de `flow`, `entrypoint`, `stages.*` e `publicationPolicy`, mas o schema/runtime ainda exigem campos extras herdados do desenho anterior;
  - o `catch` externo de `src/integrations/target-investigate-case-round-preparer.ts` ainda pode devolver `failedAtMilestone = resolve-case` para falhas tardias da v2;
  - `assessmentPath` e `dossierPath` ainda aparecem em `artifactPaths`, fixtures e fatos serializados para prompts de estágio.
- Frequência (único, recorrente, intermitente): recorrente; afeta toda aderência runner-side da v2.
- Como foi detectado (warning/log/test/assert): revisão arquitetural direta de spec, tipos, runtime e testes focados em 2026-04-09.

## Expected behavior
O runner deve aceitar o shape mínimo publicado pela spec sem campos extras obrigatórios, preservar o milestone real da falha em cada estágio obrigatório do caminho mínimo e esconder `assessment`/`dossier` do contrato técnico efetivo da v2, deixando esses artefatos apenas em bridges internas opcionais quando ainda forem necessários fora do caminho mínimo.

## Reproduction steps
1. Ler `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md` nas seções de contrato, fluxo canônico, artefatos canônicos e requisitos funcionais.
2. Ler `src/types/target-investigate-case.ts` e confirmar obrigatoriedades extras runner-side e o acoplamento a superfícies legadas.
3. Ler `src/integrations/target-investigate-case-round-preparer.ts` e confirmar o `catch` externo reclassificando falhas v2.
4. Ler `src/integrations/codex-client.ts` e os testes focados para confirmar o vazamento de `assessment`/`dossier` no contexto técnico do branch v2.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - revisão local de contrato/runtime/testes em 2026-04-09;
  - `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` com `exit 0` e 634 testes passando em 2026-04-09 19:48Z;
  - `npm run check` com `exit 0` em 2026-04-09 19:47Z.
- Warnings/codes relevantes:
  - drift entre contrato público da spec e contrato efetivamente aceito pelo runner.
- Comparativo antes/depois (se houver):
  - antes: v2 behaviorally melhor, mas ainda não contratualmente fechada;
  - depois esperado: contrato mínimo aceito, falha preservada por estágio e contexto v2 sem vazamento legado.

## Impact assessment
- Impacto funcional:
  - targets aderentes podem falhar ao seguir literalmente a spec ou, pior, se adaptar ao shape errado do runner.
- Impacto operacional:
  - rastreabilidade stage-by-stage permanece menos confiável;
  - custo cognitivo do branch v2 segue contaminado por artefatos que a spec removeu do caminho mínimo.
- Risco de regressão:
  - moderado a alto; a correção cruza tipos centrais, preparer, cliente Codex e testes focados.
- Scope estimado (quais fluxos podem ser afetados):
  - parsing/normalização do manifesto v2, execução do round-preparer, contexto serializado de prompts v2 e superfícies focadas de teste/documentação.

## Proposed solution (optional)
- separar contrato público do manifesto v2 da normalização interna runner-side;
- preservar `TargetInvestigateCaseRoundPreparationFailureError` no `catch` externo do preparador;
- introduzir uma superfície de artefatos/contexto mínima do branch v2 sem `assessment`/`dossier`;
- endurecer a suíte com fixture literal da spec e asserts explícitos de milestone real.

## Closure criteria
- Requisito/RF/CA coberto: RF-05, RF-09, CA-06
- Evidência observável: o runner aceita manifesto v2 literal da spec sem exigir `outputs`, `dossierPolicy`, `supportingArtifacts`, `precedence`, `roundDirectories`, `minimumPath` ou equivalentes como pré-requisito de aderência.
- Requisito/RF/CA coberto: RF-06, RF-07, RF-08, CA-05
- Evidência observável: `resolve-case`, `assemble-evidence` e `diagnosis` seguem obrigatórios; `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` só são validados quando declarados.
- Requisito/RF/CA coberto: RF-06, RF-13, RF-15, RF-18, CA-02, CA-04
- Evidência observável: falhas forçadas em `assemble-evidence` e `diagnosis` preservam `failedAtMilestone` e `failureKind` reais até a superfície do preparador.
- Requisito/RF/CA coberto: RF-24, RF-25, RF-26, RF-27, CA-07
- Evidência observável: os fatos de prompt e o contrato técnico mínimo do branch v2 deixam de expor `assessment` e `dossier` como parte do caminho mínimo.
- Requisito/RF/CA coberto: validação automatizada do passo
- Evidência observável: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` e `npm run check` terminam com `exit 0`.

## Decision log
- 2026-04-09 - Ticket aberto a partir de revisão arquitetural pós-implementação. Motivo: os follow-ups fechados hoje melhoraram o comportamento, mas não provaram fechamento material da compatibilidade v2.
- 2026-04-09 - O escopo ficou restrito ao runner-side; compatibilização target-side foi explicitamente adiada para não consolidar o contrato errado.
- 2026-04-09 - Implementação local concluída no runner com validação automatizada verde. O ticket permanece `in-progress` apenas porque o fechamento formal depende do commit que moverá este arquivo para `tickets/closed/`, conforme `INTERNAL_TICKETS.md`.

## Closure
- Closed at (UTC): 2026-04-09 19:57Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-04-09-target-investigate-case-v2-spec-compatibility-closure-gap.md
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
