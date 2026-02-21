# [TICKET] Fluxo core de sessao /codex_chat ainda nao existe (runner + codex-client)

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-21 00:06Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - INTERNAL_TICKETS.md
  - SPECS.md

## Context
- Workflow area: `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/types/state.ts`
- Scenario: a spec exige sessao dedicada de conversa livre `/codex_chat` com contexto persistente e ciclo proprio, separado de `/plan_spec`.
- Input constraints: manter fluxo sequencial e preservar o contrato atual de `/plan_spec`.

## Problem statement
O backend atual nao possui estado, APIs nem sessao interativa dedicada para `/codex_chat`. A unica sessao conversacional implementada e `/plan_spec`, acoplada ao parser de planejamento e ao bootstrap automatico de `/plan`.

## Observed behavior
- O que foi observado:
  - `RunnerState` possui apenas `planSpecSession`, sem estado para sessao `/codex_chat` (`src/types/state.ts:63`, `src/types/state.ts:71`).
  - O runner expoe somente APIs de lifecycle para `/plan_spec` (`src/core/runner.ts:322`, `src/core/runner.ts:473`, `src/core/runner.ts:521`).
  - O cliente Codex expoe apenas `startPlanSession` e a sessao interativa injeta `/plan` automaticamente (`src/integrations/codex-client.ts:106`, `src/integrations/codex-client.ts:154`, `src/integrations/codex-client.ts:416`, `src/integrations/codex-client.ts:749`).
  - O protocolo interativo atual e especifico de planejamento (blocos `PLAN_SPEC_*`), nao de conversa livre (`src/integrations/codex-client.ts:162`).
  - Timeout implementado e exclusivo de `/plan_spec` em 30 minutos, divergente do requisito de 10 minutos para `/codex_chat` (`src/core/runner.ts:108`, `src/core/runner.ts:113`, `src/core/runner.ts:1052`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de `runner`, `state` e `codex-client`.

## Expected behavior
Implementar backend dedicado para `/codex_chat` com sessao global unica por instancia, conversa livre stateful sem `/plan` automatico, encerramento manual/timeout/comando concorrente, e bloqueio explicito quando houver sessao `/plan_spec` ativa.

## Reproduction steps
1. Buscar ocorrencias de `/codex_chat` no repositorio e confirmar ausencia de APIs core.
2. Inspecionar `RunnerState` e validar que apenas `planSpecSession` existe.
3. Inspecionar `CodexCliTicketFlowClient.startPlanSession` e confirmar bootstrap fixo de `/plan`.

## Evidence
- `src/types/state.ts:63`
- `src/types/state.ts:71`
- `src/core/runner.ts:322`
- `src/core/runner.ts:473`
- `src/core/runner.ts:521`
- `src/integrations/codex-client.ts:106`
- `src/integrations/codex-client.ts:154`
- `src/integrations/codex-client.ts:416`
- `src/integrations/codex-client.ts:749`
- `src/core/runner.ts:108`
- `src/core/runner.ts:113`
- `src/core/runner.ts:1052`

## Impact assessment
- Impacto funcional: alto, bloqueia RF-03, RF-04, RF-05, RF-06, RF-08, RF-09 e RF-11.
- Impacto operacional: alto, impede sessao dedicada e pode gerar conflito de contexto com `/plan_spec`.
- Risco de regressao: medio-alto, altera lifecycle de sessao interativa no runner.
- Scope estimado (quais fluxos podem ser afetados): `runner`, `codex-client`, `state`, wiring de callbacks e suites de teste associadas.

## Initial hypotheses (optional)
- A implementacao atual foi desenhada exclusivamente para a jornada `/plan_spec` e ainda nao abstrai sessao interativa generica.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Introduzir estado dedicado para sessao `/codex_chat` no `RunnerState`, sem quebrar `planSpecSession`.
- Expor APIs core para iniciar, enviar input e encerrar sessao `/codex_chat`.
- Implementar cliente interativo de conversa livre sem envio automatico de `/plan`.
- Garantir sessao global unica de `/codex_chat` por instancia.
- Aplicar timeout de 10 minutos de inatividade para `/codex_chat`.
- Bloquear inicio de `/codex_chat` quando houver `/plan_spec` ativa, com motivo tipado e mensagem acionavel.
- Cobrir comportamento em testes automatizados de `runner` e `codex-client`.

## Decision log
- 2026-02-21 - Gap aberto a partir da revisao da spec `2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
