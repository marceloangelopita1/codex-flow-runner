# [TICKET] Entrada Telegram de /codex_chat (com alias) e UX de encerramento manual ainda nao existem

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-21 00:06Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md
  - ExecPlan: execplans/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md
  - INTERNAL_TICKETS.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/main.ts`
- Scenario: operador precisa iniciar `/codex_chat` (ou `/codex-chat`), conversar em texto livre e encerrar manualmente por botao inline.
- Input constraints: preservar comandos existentes e manter processamento sequencial.

## Problem statement
A camada Telegram nao possui comando/alias de `/codex_chat`, nao roteia conversa livre para uma sessao dedicada e nao tem callback/botao para encerramento manual do contexto. Tambem nao existe mecanismo para encerrar `/codex_chat` ao receber outro comando e processar esse comando na mesma mensagem.

## Observed behavior
- O que foi observado:
  - `BotControls` nao define nenhum contrato para sessao `/codex_chat` (`src/integrations/telegram-bot.ts:31`).
  - A ajuda `/start` lista `/plan_spec`, mas nao lista `/codex_chat` nem alias `/codex-chat` (`src/integrations/telegram-bot.ts:329`, `src/integrations/telegram-bot.ts:346`).
  - `registerHandlers` nao registra comando `codex_chat` nem alias textual `codex-chat` (`src/integrations/telegram-bot.ts:476`, `src/integrations/telegram-bot.ts:543`).
  - O roteamento de texto livre atende apenas sessao `/plan_spec` (`src/integrations/telegram-bot.ts:539`, `src/integrations/telegram-bot.ts:771`).
  - O roteamento de callbacks so cobre `specs:`, `projects:` e `plan-spec:`, sem fluxo de encerramento `/codex_chat` (`src/integrations/telegram-bot.ts:610`, `src/integrations/telegram-bot.ts:620`).
  - O bootstrap em `main.ts` nao injeta controles de `/codex_chat` no `TelegramController` (`src/main.ts:152`, `src/main.ts:166`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de handlers/controles Telegram e wiring do bootstrap.

## Expected behavior
Telegram deve expor `/codex_chat` com alias `/codex-chat`, encaminhar mensagens livres para a sessao ativa, renderizar botao inline de encerramento manual a cada resposta e aplicar regra de troca de comando: ao receber outro comando durante sessao ativa, encerrar o contexto atual e processar o novo comando no mesmo update.

## Reproduction steps
1. Inspecionar `registerHandlers` e confirmar ausencia de `bot.command("codex_chat")` e alias textual.
2. Inspecionar `bot.on("text")` e confirmar que o fluxo de texto livre depende exclusivamente de `planSpecSession`.
3. Inspecionar `handleCallbackQuery` e confirmar ausencia de prefixo/callback para encerramento de `/codex_chat`.

## Evidence
- `src/integrations/telegram-bot.ts:31`
- `src/integrations/telegram-bot.ts:329`
- `src/integrations/telegram-bot.ts:346`
- `src/integrations/telegram-bot.ts:476`
- `src/integrations/telegram-bot.ts:543`
- `src/integrations/telegram-bot.ts:539`
- `src/integrations/telegram-bot.ts:771`
- `src/integrations/telegram-bot.ts:610`
- `src/integrations/telegram-bot.ts:620`
- `src/main.ts:152`
- `src/main.ts:166`

## Impact assessment
- Impacto funcional: alto para RF-01, RF-02, RF-07 e RF-10, com bloqueio direto de CA-01, CA-02, CA-04 e CA-07.
- Impacto operacional: medio-alto, impede uso pratico do novo fluxo conversacional via Telegram.
- Risco de regressao: medio, altera dispatch de comandos, callbacks e roteamento de texto.
- Scope estimado (quais fluxos podem ser afetados): comandos Telegram, callbacks inline, help `/start`, wiring em `main.ts`, testes de controlador.

## Initial hypotheses (optional)
- A superficie Telegram atual foi desenhada para `/plan_spec`, sem extensao para uma segunda sessao conversacional dedicada.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Registrar comando `/codex_chat` e alias `/codex-chat` com mesma semantica.
- Encaminhar mensagem de texto livre para sessao `/codex_chat` ativa no mesmo chat.
- Renderizar botao inline de encerramento manual em cada resposta do Codex no fluxo `/codex_chat`.
- Implementar callback de encerramento manual com confirmacao no chat e sem reuso de contexto fechado.
- Ao receber outro comando durante sessao `/codex_chat`, encerrar sessao e processar o novo comando no mesmo update.
- Atualizar wiring em `main.ts` para injetar controles e handlers de `/codex_chat`.
- Cobrir novos contratos em testes automatizados de `telegram-bot`.

## Decision log
- 2026-02-21 - Gap aberto apos revisao da spec de `/codex_chat` com priorizacao P1 por depender do backend core P0.
- 2026-02-21 - ExecPlan validado como `GO` com criterios atendidos e validacoes verdes (`npm run check`, `npm test`, `npm run build`).

## Closure
- Closed at (UTC): 2026-02-21 00:43Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md (commit: mesmo changeset de fechamento)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
