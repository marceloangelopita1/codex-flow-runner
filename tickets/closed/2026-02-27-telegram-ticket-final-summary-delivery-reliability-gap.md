# [TICKET] Entrega de resumo final por ticket no Telegram perde eventos em falhas transitorias

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-27 01:43Z
- Reporter: mapita
- Owner: a definir
- Source: production-observation
- Parent ticket (optional): tickets/closed/2026-02-19-telegram-final-summary-per-ticket-gap.md
- Parent execplan (optional): execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (diagnostico estatico no codigo)
  - Response file: N/A (diagnostico estatico no codigo)
  - Log file: N/A (evidencias em testes e leitura de codigo)
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-run-status-notification.md
  - docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md
  - execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md
  - execplans/2026-02-27-telegram-ticket-final-summary-delivery-reliability-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P0
- Justificativa objetiva (evidencias e impacto): perda intermitente de notificacao final remove visibilidade operacional sobre ticket fechado e conflita com CAs da spec de notificacao.

## Context
- Workflow area: fechamento de ticket (`plan -> implement -> close-and-version`) com notificacao proativa no Telegram.
- Scenario: ticket fecha com sucesso (incluindo commit/push), mas mensagem final pode nao ser entregue quando Telegram/API/rede falham transitoriamente.
- Input constraints: ambiente real com latencia, 429/5xx, reconexao de rede e restart de processo.

## Problem statement
O fluxo atual de notificacao final por ticket e "tentativa unica". Em qualquer erro de envio para Telegram, o runner registra log de erro e segue sem retry, sem fila de reentrega e sem mecanismo de recuperacao. Isso causa perda intermitente de notificacoes, inclusive em tickets fechados com sucesso.

## Observed behavior
- O que foi observado: envio da notificacao final e feito em tentativa unica e erro e absorvido sem reentrega.
- Frequencia (unico, recorrente, intermitente): intermitente
- Como foi detectado (warning/log/test/assert):
  - `src/core/runner.ts:3243-3265` (`publishTicketFinalSummary`) captura erro e apenas registra `Falha ao emitir resumo final de ticket`.
  - `src/integrations/telegram-bot.ts:635-662` (`sendTicketFinalSummary`) faz apenas um `sendMessage`, sem retry/backoff.
  - `src/core/runner.test.ts:1997-2016` valida comportamento atual: quando envio falha, `lastNotifiedEvent` permanece `null`.

## Expected behavior
Quando um ticket e fechado, a notificacao final deve ter entrega confiavel (eventualmente entregue dentro de politica definida), com tratamento de falhas transitorias e rastreabilidade de tentativas. Falha definitiva deve ser explicitamente observavel e acionavel, nao silenciosa.

## Reproduction steps
1. Disparar `/run_all` ou `/run_specs` com ao menos um ticket elegivel.
2. Introduzir falha transitoria no envio Telegram durante `sendTicketFinalSummary` (ex.: simular timeout, 429 ou erro de transporte).
3. Confirmar que ticket foi fechado/commitado com sucesso.
4. Observar ausencia de mensagem final no chat e apenas log de erro no runner.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - Mensagem esperada em erro: `Falha ao emitir resumo final de ticket`.
- Warnings/codes relevantes:
  - Sem politica de retry para 429/5xx/transientes.
  - Sem outbox para eventos pendentes de entrega.
- Comparativo antes/depois (se houver):
  - Antes: sem reentrega automatica.
  - Depois (esperado): reentrega controlada com estado observavel.

## Impact assessment
- Impacto funcional: perda do evento de fechamento no Telegram mesmo com ticket concluido.
- Impacto operacional: operador perde visibilidade de progresso e pode interpretar falso travamento.
- Risco de regressao: medio-alto (envolve fluxo de notificacao em todos os comandos de ticket).
- Scope estimado (quais fluxos podem ser afetados): `run_all`, `run_specs`, `run_ticket`, estado de `/status` (`lastNotifiedEvent`) e shutdown.

## Initial hypotheses (optional)
- Semantica atual e `at-most-once`.
- Nao existe camada de dispatch resiliente (fila/retry/backoff).
- Erro de entrega nao propaga para mecanismo de recuperacao.

## Proposed solution (optional)
Criar camada de dispatch de notificacoes com politica de retry para falhas transitorias, backoff com limite, instrumentacao de tentativas e estado de entrega pendente/sucesso/falha definitiva. Preservar fluxo sequencial de tickets (nao paralelizar processamento de tickets).

## Closure criteria
- Existe cobertura automatizada para:
  - falha transitoria seguida de sucesso com reentrega;
  - falha definitiva apos limite de tentativas com sinalizacao explicita no estado/log;
  - ausencia de duplicidade indevida de notificacao por ticket.
- Politica de retry documentada (quais erros retentam, limite, intervalo).
- `/status` continua coerente com ultimo evento efetivamente entregue.
- Validacao manual em Telegram real comprovando nao perda em cenario transitorio controlado.

## Decision log
- 2026-02-27 - Ticket aberto a partir de diagnostico de perda intermitente de notificacoes finais no Telegram em fechamento de ticket.
- 2026-02-27 - Validacao do ExecPlan concluida com classificacao `GO`; implementacao tecnica concluida e evidenciada por testes/check/build.

## Closure
- Closed at (UTC): 2026-02-27 03:33Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-27-telegram-ticket-final-summary-delivery-reliability-gap.md (commit de fechamento deste ticket)
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Evidencia objetiva de aceite tecnico:
  - `npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` -> pass (`168/168`)
  - `npm test` -> pass (`260/260`)
  - `npm run check && npm run build` -> pass
- Entrega tecnica concluida: retry/backoff bounded no envio final, estado de falha definitiva (`lastNotificationFailure`), `/status` com separacao entre ultimo evento entregue e ultima falha definitiva, cobertura automatizada e documentacao atualizadas.
- Validacao manual externa ainda necessaria:
  - Objetivo: comprovar no Telegram real que falha transitoria controlada (rede/API) resulta em reentrega do resumo final sem perda silenciosa.
  - Como executar:
    1. iniciar o runner no ambiente real com bot e chat autorizados;
    2. fechar ticket elegivel forçando falha transitoria no primeiro envio (ex.: simular indisponibilidade curta de rede ou 429/5xx controlado);
    3. confirmar que a mensagem final chega apos retentativa e que `/status` permanece coerente;
    4. registrar evidencia operacional (timestamp/log/chat).
  - Responsavel operacional: operador do bot Telegram em ambiente real (mapita/time de operacao).
