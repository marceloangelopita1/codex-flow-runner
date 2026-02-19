# [TICKET] Notificacao final por ticket no Telegram nao e emitida no fim do ciclo

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 14:42Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-run-status-notification.md
  - ExecPlan: execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md

## Context
- Workflow area: observabilidade operacional no Telegram durante rodada `/run-all`
- Scenario: execucao sequencial de ticket com sucesso ou falha nas fases `plan -> implement -> close-and-version`
- Input constraints: fluxo estritamente sequencial, sem paralelizacao de tickets

## Problem statement
A spec exige uma mensagem final unica por ticket no Telegram quando o ciclo de 3 fases termina (sucesso ou falha), mas a implementacao atual nao dispara notificacao automatica por ticket.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts` responde apenas a comandos recebidos (`/run-all`, `/status`, `/pause`, `/resume`), sem mecanismo de push ao fim de cada ticket.
  - `src/core/runner.ts` atualiza estado e loga sucesso/erro em `processTicket`, mas nao invoca nenhuma integracao de notificacao Telegram por ticket concluido.
  - A unica resposta de `/run-all` e de inicio da rodada (`▶️ Runner iniciado via /run-all.`), nao um resumo final por ticket.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e testes existentes

## Expected behavior
Cada ticket processado na rodada deve gerar exatamente uma mensagem final no chat autorizado:
- sucesso: quando `plan`, `implement` e `close-and-version` concluem;
- falha: quando qualquer fase falha.

## Reproduction steps
1. Ler `src/integrations/telegram-bot.ts` e verificar que nao ha API/metodo de envio de resumo por evento do runner.
2. Ler `src/core/runner.ts` e verificar ausencia de callback/integracao para notificar Telegram ao fim de `processTicket`.
3. Ler `src/integrations/telegram-bot.test.ts` e confirmar ausencia de testes para resumo final por ticket.

## Evidence
- `src/integrations/telegram-bot.ts`: somente handlers de comando com `ctx.reply(...)`.
- `src/core/runner.ts`: `processTicket` registra `this.touch("idle", "Ticket ... finalizado com sucesso")` ou `this.touch("error", "Falha ao processar ...")`, sem notificacao Telegram.
- `src/integrations/telegram-bot.test.ts`: suite cobre autorizacao e resposta de `/run-all`, sem casos CA-01/CA-02/CA-04 da spec.

## Impact assessment
- Impacto funcional: alto, pois RF-01/RF-02/RF-04 e CA-01/CA-02/CA-04 ficam sem atendimento.
- Impacto operacional: alto, operador perde visibilidade imediata de sucesso/falha por ticket sem polling manual de `/status`.
- Risco de regressao: medio, exige acoplamento controlado entre runner e notificacao.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, testes de runner e integracao Telegram.

## Initial hypotheses (optional)
- A implementacao atual priorizou controle remoto por comando e estado interno, sem camada de notificacao por evento de ticket.

## Proposed solution (optional)
- Introduzir evento/contrato de resumo final por ticket no runner (sucesso/falha) e consumidor Telegram para emissao unica por ticket.
- Cobrir deduplicacao e comportamento em rodada com multiplos tickets.

## Closure criteria
- Existe mecanismo explicito no runner para publicar resumo final por ticket ao fim do ciclo (sucesso/falha).
- Telegram envia exatamente uma mensagem final por ticket concluido, inclusive em rodada com multiplos tickets.
- Mensagem final de falha inclui ticket afetado e erro objetivo para triagem.
- Testes automatizados cobrem sucesso, falha e multiplo ticket garantindo emissao unica.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec de notificacao de status por ticket no Telegram.
- 2026-02-19 - Ticket encerrado com implementacao de emissao final unica por ticket no Telegram (sucesso/falha) e cobertura automatizada.

## Closure
- Closed at (UTC): 2026-02-19 14:56Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - Commit: definido no commit de fechamento deste ticket (mesmo commit do move `tickets/open` -> `tickets/closed`)
  - ExecPlan: execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md
