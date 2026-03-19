# [TICKET] Introduzir retrospectiva sistemica apos spec-audit e separar responsabilidades das etapas

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 22:03Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-01, RF-02, RF-03, RF-04, RF-28, RF-31; CA-01, CA-02, CA-03, CA-14, CA-15
- Inherited assumptions/defaults (when applicable): `spec-workflow-retrospective` e o nome canonico do novo estagio; a retrospectiva sistemica e sempre posterior a `spec-audit`; a retrospectiva so existe quando `spec-audit` encontrar gaps residuais reais; follow-up funcional da spec e follow-up sistemico do workflow devem permanecer separados.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - src/core/runner.ts
  - src/types/flow-timing.ts
  - src/types/state.ts
  - src/integrations/workflow-trace-store.ts
  - src/integrations/telegram-bot.ts
  - prompts/08-auditar-spec-apos-run-all.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o fluxo principal de `/run_specs` ainda termina em `spec-audit`, e a etapa de auditoria final ainda carrega resquicios de melhoria sistemica; isso conflita com o contrato central da spec e impede separar auditoria funcional de retrospectiva de workflow.

## Context
- Workflow area: `/run_specs` orchestration, stage boundaries e observabilidade final
- Scenario: a rodada termina com `spec-audit` e, quando houver gaps residuais reais, precisa iniciar uma fase posterior e distinta para retrospectiva sistemica
- Input constraints: manter fluxo sequencial; nao reabrir o escopo do gate `spec-ticket-validation`; preservar `spec-audit` como auditoria funcional da spec

## Problem statement
O runner atual nao possui o estagio `spec-workflow-retrospective` e continua encerrando `/run_specs` em `spec-audit`. Alem disso, o prompt de `spec-audit` ainda menciona promocao de ajuste genericamente instrutivo e registro de instrucao sistemica, o que mantem mistura entre auditoria funcional e melhoria de workflow.

## Observed behavior
- O que foi observado: `runSpecsAndRunAll(...)` executa `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` e encerra o resumo final com `finalStage: "spec-audit"`; `SpecFlowStage`, `RunSpecsFlowTimingStage`, `RunnerPhase` e `WorkflowTraceStage` nao incluem `spec-workflow-retrospective`; `prompts/08-auditar-spec-apos-run-all.md` ainda orienta registrar causa-raiz `systemic-instruction` e promover ajuste genericamente instrutivo.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de codigo, prompts e testes do runner

## Expected behavior
Quando `spec-audit` encontrar gaps residuais reais, `/run_specs` deve seguir para um novo estagio observavel `spec-workflow-retrospective`, mantendo `spec-audit` restrito a follow-ups funcionais da propria spec e tornando a retrospectiva a fase final observavel apenas quando ela realmente rodar.

## Reproduction steps
1. Ler `src/core/runner.ts` e localizar o fluxo `runSpecsAndRunAll(...)`.
2. Confirmar que a rodada de sucesso encerra em `spec-audit` e nao possui desvio para `spec-workflow-retrospective`.
3. Conferir `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` para validar a ausencia do novo estagio.
4. Ler `prompts/08-auditar-spec-apos-run-all.md` e confirmar que o prompt ainda mistura auditoria final com consideracoes sistemicas de workflow.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts` limita o sucesso de `/run_specs` a `finalStage: "spec-audit"` e nao conhece `spec-workflow-retrospective`.
  - `src/types/flow-timing.ts` modela `run-all` e `spec-audit` como fim do fluxo de spec, sem a nova fase.
  - `src/types/state.ts` nao possui fase `spec-workflow-retrospective`.
  - `src/integrations/workflow-trace-store.ts` aceita apenas `spec-triage`, `spec-ticket-validation`, `spec-close-and-version` e `spec-audit` no caminho de spec.
  - `src/integrations/telegram-bot.ts` monta o resumo final usando `summary.finalStage` sem qualquer bloco dedicado a retrospectiva sistemica.
  - `prompts/08-auditar-spec-apos-run-all.md` ainda pede para registrar `systemic-instruction` e promover ajuste genericamente instrutivo.
- Comparativo antes/depois (se houver): antes = `spec-audit` e etapa final fixa e ainda mistura consideracoes sistemicas; depois esperado = `spec-audit` permanece funcional e `spec-workflow-retrospective` vira etapa final condicional e separada

## Impact assessment
- Impacto funcional: a retroalimentacao sistemica ocorre no lugar errado ou nao ocorre, comprometendo o contrato aprovado da spec.
- Impacto operacional: logs, traces e resumo final nao conseguem distinguir auditoria funcional da retrospectiva de workflow.
- Risco de regressao: medio, porque runner, tipos, traces, resumo e prompt de auditoria precisam evoluir juntos.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, `prompts/08-auditar-spec-apos-run-all.md`, testes associados

## Initial hypotheses (optional)
- A infraestrutura atual de resumo/traces pode ser reaproveitada, mas o contrato de etapas do runner precisa ser expandido antes de qualquer logica de analise/publicacao pos-auditoria.

## Proposed solution (optional)
Criar o estagio `spec-workflow-retrospective` como fase observavel de `/run_specs`, deslocar a responsabilidade sistemica para depois de `spec-audit` e limpar o prompt de auditoria para que ele trate apenas a cobertura funcional da spec corrente.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-01, RF-02, RF-28; CA-01, CA-02, CA-14
- Evidencia observavel: testes de `runner` mostram que `/run_specs` executa `spec-workflow-retrospective` apenas quando `spec-audit` reportar gaps residuais reais, e que `finalStage` permanece `spec-audit` quando nao houver retrospectiva.
- Requisito/RF/CA coberto: RF-03, RF-04, RF-31; CA-03, CA-15
- Evidencia observavel: `prompts/08-auditar-spec-apos-run-all.md` e o contrato operacional de `spec-audit` deixam de instruir melhoria sistemica de workflow, enquanto testes ou fixtures mostram que `spec-audit` continua abrindo apenas follow-ups funcionais da spec.
- Requisito/RF/CA coberto: observabilidade do novo stage
- Evidencia observavel: `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` passam a reconhecer `spec-workflow-retrospective` como fase nomeada e exibivel.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - o runner ainda encerra `/run_specs` em `spec-audit` e o prompt da auditoria final ainda mistura sinais sistemicos de workflow.
- 2026-03-19 - Diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md` relidos na etapa de fechamento; resultado validado como `GO` com base apenas em criterios tecnicos/funcionais da entrega atual.

## Closure
- Closed at (UTC): 2026-03-19 22:30Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-01`, `RF-02`, `RF-28`; `CA-01`, `CA-02`, `CA-14`: `src/core/runner.ts`, `src/types/flow-timing.ts` e `src/types/state.ts` agora suportam `spec-workflow-retrospective` e tornam `finalStage` condicional; `src/core/runner.test.ts` cobre o caminho com gaps residuais (`requestRunSpecs executa spec-workflow-retrospective quando spec-audit encontra gaps residuais`) e o caminho sem retrospectiva (`requestRunSpecs com sucesso encadeia run-all e processa backlog existente`); `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts` -> pass (`271/271`).
  - `RF-03`, `RF-04`, `RF-31`; `CA-03`, `CA-15`: `prompts/08-auditar-spec-apos-run-all.md` passou a declarar explicitamente que `spec-audit` e auditoria funcional da spec corrente e nao decide backlog sistemico; o bloco `[[SPEC_AUDIT_RESULT]]` fornece apenas o sinal minimo de gaps residuais; `rg -n "systemic-instruction|genericamente instrutivo|melhoria sistemica" prompts/08-auditar-spec-apos-run-all.md` -> sem matches; `src/integrations/codex-client.ts` e `prompts/11-retrospectiva-workflow-apos-spec-audit.md` separam a retrospectiva em stage/prompt proprio.
  - Observabilidade do novo stage: `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts` e `src/integrations/codex-client.ts` reconhecem `spec-workflow-retrospective`; `src/integrations/workflow-trace-store.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/codex-client.test.ts` validam trace, resumo final e prompt dedicado; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> pass; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` -> pass.
- Entrega tecnica concluida:
  - `/run_specs` agora executa `spec-workflow-retrospective` somente quando `spec-audit` expõe `residual_gaps_detected: yes`, mantendo `spec-audit` como fase final quando nao houver gaps residuais reais.
  - `spec-audit` ficou restrito a auditoria funcional da spec, enquanto a retrospectiva sistemica ganhou stage e prompt dedicados.
  - Timing, estado, trace e resumo final do Telegram exibem o novo stage sem quebrar o caminho legado sem retrospectiva.
- Validacao manual externa pendente: nao.
