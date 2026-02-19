# [TICKET] Comando /run-all ausente e cobertura incompleta de controle no bot Telegram

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 11:32Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-access-and-control-plane.md
  - docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts` e orquestracao em `src/main.ts`
- Scenario: comandos de controle via Telegram com restricao por `TELEGRAM_ALLOWED_CHAT_ID`
- Input constraints: ambiente com `TELEGRAM_BOT_TOKEN` configurado e `TELEGRAM_ALLOWED_CHAT_ID` opcional

## Problem statement
As specs descrevem `/run-all` como comando de controle do bot, mas ele nao existe na implementacao atual. Sem esse comando, a cobertura de validacao de acesso para "todos os comandos de controle" fica incompleta e a jornada operacional prevista nao pode ser executada como especificado.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts` registra apenas `/status`, `/pause` e `/resume`.
  - Nao existe handler para `/run-all`.
  - `src/main.ts` inicia o loop com `await runner.runForever()` sem gatilho por comando Telegram.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica do codigo e comparacao com specs

## Expected behavior
O bot deve expor `/run-all` como comando de controle e validar `chat.id` antes de acionar a rodada. A superficie de controle remota (`/run-all`, `/status`, `/pause`, `/resume`) deve ficar consistente com a spec e com bloqueio para chat nao autorizado.

## Reproduction steps
1. Iniciar a aplicacao com `TELEGRAM_BOT_TOKEN` configurado.
2. No Telegram, enviar `/run-all` para o bot.
3. Observar que nao ha comando implementado para esse fluxo no controlador atual.

## Evidence
- `src/integrations/telegram-bot.ts`: comandos registrados sao apenas `status`, `pause`, `resume`.
- `src/main.ts`: o loop principal e iniciado diretamente por `runner.runForever()`.
- `docs/specs/2026-02-19-telegram-access-and-control-plane.md`: jornada cita `/run-all` como comando esperado.

## Impact assessment
- Impacto funcional: bot nao atende a jornada de controle definida nas specs.
- Impacto operacional: operador nao consegue iniciar rodada por comando remoto conforme especificacao.
- Risco de regressao: medio, pois altera ponto de inicio da execucao e interage com estado do runner.
- Scope estimado (quais fluxos podem ser afetados): integracao Telegram, ciclo de vida do runner e contrato operacional dos comandos.

## Initial hypotheses (optional)
- Falta de consolidacao entre MVP atual (auto-start) e contrato final orientado a comando `/run-all`.

## Proposed solution (optional)
- Adicionar `/run-all` no controlador Telegram com validacao de acesso reaproveitavel.
- Ajustar inicio da rodada para obedecer ao comando remoto (ou alinhar explicitamente o comportamento da spec, se houver decisao contraria).

## Closure criteria
- `/run-all` implementado e validado no bot.
- Validacao por `TELEGRAM_ALLOWED_CHAT_ID` aplicada de forma consistente em toda superficie de controle (`/run-all`, `/status`, `/pause`, `/resume`).
- Evidencia de que comando nao autorizado nao altera estado do runner.
- Rastreabilidade atualizada na spec com ticket, execplan e commit de entrega.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec de controle de acesso Telegram.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
