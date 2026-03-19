# [TICKET] Orquestrar spec-workflow-retrospective e limpar o contrato funcional do spec-audit

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 20:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-01, RF-02, RF-03, RF-04, RF-28, RF-29, RF-30, RF-31; CA-01, CA-02, CA-03, CA-14, CA-15
- Inherited assumptions/defaults (when applicable): `spec-workflow-retrospective` e sempre posterior a `spec-audit`; ela so existe quando a auditoria final encontrar gaps residuais reais; follow-up funcional da spec e follow-up sistemico do workflow precisam permanecer separados; quando a retrospectiva roda, ela passa a ser a fase final observavel do `/run_specs`.
- Workflow root cause (when applicable): execution
- Workflow root cause rationale (when applicable): a spec aprovada define o novo estagio e o foco funcional de `spec-audit`, mas o runner continua encerrando o fluxo em `spec-audit` e o prompt de auditoria final ainda deixa margem para responsabilidade sistemica.
- Remediation scope (when applicable): local
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - prompts/08-auditar-spec-apos-run-all.md
  - src/core/runner.ts
  - src/integrations/codex-client.ts
  - src/integrations/workflow-trace-store.ts
  - src/integrations/telegram-bot.ts
  - src/types/flow-timing.ts
  - src/types/state.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): enquanto o runner terminar em `spec-audit` e o prompt de auditoria final ainda misturar responsabilidade funcional e sistemica, a jornada aprovada da spec nao pode ser cumprida e o resumo final nunca refletira a retrospectiva esperada.

## Context
- Workflow area: `/run_specs` depois de `/run-all` encadeado e na etapa `spec-audit`
- Scenario: existe uma spec aprovada que exige um novo estagio `spec-workflow-retrospective` apos `spec-audit`, mas o fluxo atual ainda nao possui essa orquestracao nem a limpeza do contrato funcional de `spec-audit`
- Input constraints: manter fluxo sequencial; retrospectiva continua nao bloqueante; follow-up funcional da propria spec nao pode ser misturado com backlog transversal de workflow

## Problem statement
O estado atual do runner nao consegue executar a jornada aprovada da retrospectiva sistemica. Mesmo quando uma spec deveria seguir para uma etapa posterior de analise sistemica do workflow, o fluxo hoje termina em `spec-audit`. Ao mesmo tempo, o prompt operacional da auditoria final ainda abre espaco para "promover ajuste genericamente instrutivo", o que viola o contrato novo: `spec-audit` deve continuar sendo auditoria funcional da spec, e a aprendizagem sistemica deve ser tratada num estagio posterior, separado e nao bloqueante.

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts:4473-4579` executa `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` e encerra o caminho de sucesso com `finalStage: "spec-audit"`.
  - `src/types/flow-timing.ts:67-84`, `src/types/state.ts` e `src/integrations/workflow-trace-store.ts:10-15` ainda nao declaram `spec-workflow-retrospective` como estagio/phase observavel.
  - `prompts/08-auditar-spec-apos-run-all.md:17-31` ainda inclui "promover ajuste genericamente instrutivo somente se a lacuna for claramente sistemica", misturando responsabilidade funcional e sistemica dentro de `spec-audit`.
  - O resumo final atual de `/run_specs` so tem caminho ate `spec-audit` como fase final de sucesso.
- Frequencia (unico, recorrente, intermitente): recorrente enquanto a spec de retrospectiva permanecer sem implementacao
- Como foi detectado (warning/log/test/assert): leitura de codigo, prompt operacional e resposta da triagem da spec aprovada

## Expected behavior
Quando `spec-audit` encontrar gaps residuais reais, o runner deve seguir para `spec-workflow-retrospective` e fazer dessa retrospectiva a fase final observavel daquele `/run_specs`. `spec-audit` deve continuar responsavel apenas por auditoria funcional da propria spec e pela abertura de follow-ups funcionais locais, sem promover backlog sistemico de workflow.

## Reproduction steps
1. Ler `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:48-91`.
2. Ler `src/core/runner.ts:4473-4579` e confirmar que o fluxo bem-sucedido termina em `spec-audit`.
3. Ler `prompts/08-auditar-spec-apos-run-all.md:17-31` e confirmar que o prompt ainda mistura auditoria funcional com promocao de ajuste sistemico.
4. Ler `src/integrations/workflow-trace-store.ts:10-15`, `src/types/flow-timing.ts:67-84` e `src/types/state.ts` e confirmar a ausencia do novo estagio observavel.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts:4473-4579`
  - `src/integrations/workflow-trace-store.ts:10-15`
  - `src/types/flow-timing.ts:67-84`
  - `prompts/08-auditar-spec-apos-run-all.md:17-31`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:48-91`
- Comparativo antes/depois (se houver): antes = sucesso de `/run_specs` termina em `spec-audit`; depois esperado = quando houver gaps residuais reais, a fase final observavel passa a ser `spec-workflow-retrospective`

## Impact assessment
- Impacto funcional: a spec aprovada nao pode ser atendida integralmente.
- Impacto operacional: o resumo final nao consegue diferenciar follow-up funcional da spec de retrospectiva sistemica do workflow.
- Risco de regressao: alto, porque toca orquestracao principal de `/run_specs`, prompt operacional, tipos de estado/timing e resumo final.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `prompts/08-auditar-spec-apos-run-all.md`

## Initial hypotheses (optional)
- A mudanca segura pede novo estagio observavel no runner e limpeza explicita do prompt/contrato de `spec-audit`.
- A retrospectiva pode precisar de tipo/resumo proprio para nao reaproveitar campos do `spec-ticket-validation` de forma impropria.

## Proposed solution (optional)
- Introduzir `spec-workflow-retrospective` como etapa nomeada e observavel de `/run_specs`, deixando `spec-audit` restrito ao follow-up funcional da spec.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-01, RF-02, RF-28, RF-29; CA-01, CA-02, CA-14
- Evidencia observavel: o runner passa a expor `spec-workflow-retrospective` como estagio nomeado apos `spec-audit`, executando-o apenas quando a auditoria final indicar gaps residuais reais; timing, state, trace/log e resumo final passam a registrar essa fase como final observavel quando aplicavel.
- Requisito/RF/CA coberto: RF-03, RF-04, RF-31; CA-03, CA-15
- Evidencia observavel: `spec-audit` deixa de instruir ou decidir melhoria sistemica de workflow e fica restrito a auditoria funcional/follow-up da propria spec, com prompt e contrato operacional atualizados.
- Requisito/RF/CA coberto: RF-29, RF-30
- Evidencia observavel: o resumo final e o trace distinguem explicitamente follow-up funcional da spec e retrospectiva sistemica, sem reutilizar o bloco de `spec-ticket-validation` para representar a nova fase.

## Decision log
- 2026-03-19 - Ticket aberto a partir da releitura da spec aprovada e do estado atual do runner - a orquestracao da retrospectiva pos-`spec-audit` ainda nao existe e `spec-audit` segue com contrato misto.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

