# [TICKET] Shutdown do runner pode descartar notificacoes finais em voo no Telegram

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-27 01:43Z
- Reporter: mapita
- Owner: a definir
- Source: production-observation
- Parent ticket (optional): tickets/open/2026-02-27-telegram-ticket-final-summary-delivery-reliability-gap.md
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (diagnostico estatico no codigo)
  - Response file: N/A (diagnostico estatico no codigo)
  - Log file: N/A (evidencias em leitura de codigo)
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-run-status-notification.md
  - docs/systemd/codex-flow-runner.service

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): reinicio/parada do processo durante fechamento de ticket pode interromper envio final ao Telegram, agravando perda intermitente de visibilidade.

## Context
- Workflow area: encerramento de processo (`SIGINT`/`SIGTERM`) com loops ativos de ticket.
- Scenario: processo recebe sinal durante fase final de ticket ou durante envio de resumo final para Telegram.
- Input constraints: operacao continua em WSL/systemd com reinicios planejados ou falhas operacionais.

## Problem statement
O caminho de shutdown atual nao explicita drenagem de notificacoes finais pendentes/em voo antes de encerrar processo. Em cenarios de sinal durante fechamento de ticket, existe risco de o processo terminar sem garantir entrega da notificacao final no Telegram.

## Observed behavior
- O que foi observado: fluxo de shutdown encerra rapidamente apos `runner.shutdown()` e `telegram.stop()`, sem contrato explicito de aguardar envios de resumo final pendentes.
- Frequencia (unico, recorrente, intermitente): intermitente
- Como foi detectado (warning/log/test/assert):
  - `src/main.ts:268-273` chama `runner.shutdown(); await telegram.stop(signal); process.exit(0);`.
  - `src/core/runner.ts:3019-3056` `shutdown()` sinaliza parada e pode finalizar sessoes interativas com `void`, sem API de "await drain" para loops de ticket/notificacoes.
  - `src/core/runner.ts:3243-3265` notificacao final depende de operacao async que pode estar em voo no momento do shutdown.

## Expected behavior
Ao receber sinal de parada, o runner deve executar shutdown gracioso com janela limitada de drenagem:
- finalizar trabalho em voo de forma consistente;
- tentar concluir notificacoes finais pendentes;
- registrar claramente o que foi entregue e o que nao foi entregue antes de encerrar.

## Reproduction steps
1. Iniciar runner e disparar `/run_all` com ticket em processamento.
2. Enviar `SIGTERM` durante `close-and-version` ou imediatamente apos fechamento, enquanto notificacao final pode estar em envio.
3. Verificar se mensagem final do ticket chega ao Telegram.
4. Validar logs para confirmar ausencia/presenca de mecanica de drenagem antes do `exit`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Sinal recebido, encerrando...` seguido de finalizacao do bot.
- Warnings/codes relevantes:
  - Sem contrato de flush/drain de notificacoes no shutdown.
- Comparativo antes/depois (se houver):
  - Antes: risco de perda em parada durante envio.
  - Depois (esperado): parada controlada com evidencia de entrega/nao entrega.

## Impact assessment
- Impacto funcional: fechamento de ticket pode nao ser comunicado ao operador em parada/restart.
- Impacto operacional: baixa confiabilidade percebida durante manutencao/redeploy.
- Risco de regressao: medio (afeta lifecycle global do processo).
- Scope estimado (quais fluxos podem ser afetados): `main.ts` (sinais), `runner` (shutdown lifecycle), integracao Telegram e possivel outbox/retry.

## Initial hypotheses (optional)
- Ausencia de API explicita para aguardar conclusao dos loops/entregas pendentes.
- Sequencia de shutdown privilegia encerramento rapido sem fase de drenagem observavel.

## Proposed solution (optional)
Introduzir shutdown gracioso em duas fases: (1) stop de novos trabalhos e freeze de entrada; (2) drain bounded de tickets/notificacoes pendentes com timeout configuravel e logs de resultado final.

## Closure criteria
- Existe mecanismo de drain com timeout para notificacoes finais pendentes durante shutdown.
- Ha cobertura automatizada para cenario de sinal durante ticket em fechamento.
- Logs finais distinguem: entregue, pendente abandonado por timeout, falha definitiva.
- Documentacao operacional (`README` e/ou `docs/systemd`) atualizada com comportamento de parada graciosa.

## Decision log
- 2026-02-27 - Ticket aberto para mitigar perda de visibilidade por encerramento de processo durante envio de notificacao final.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
