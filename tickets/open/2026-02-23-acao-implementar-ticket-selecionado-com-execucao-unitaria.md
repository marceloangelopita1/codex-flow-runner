# [TICKET] Acao "Implementar este ticket" e execucao unitaria do ticket selecionado ainda nao existem

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-23 16:14Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/open/2026-02-23-lock-global-sequencial-para-execucao-de-ticket-no-runner.md
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md
  - INTERNAL_TICKETS.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): mesmo com listagem de ticket, o operador ainda nao consegue disparar execucao apenas do ticket selecionado com feedback funcional no Telegram.

## Context
- Workflow area: API publica do runner (`src/core/runner.ts`) e integracao Telegram (`src/integrations/telegram-bot.ts`, `src/main.ts`)
- Scenario: operador seleciona ticket no Telegram e aciona "Implementar este ticket"
- Input constraints: executar somente um ticket alvo e respeitar lock de concorrencia/fluxo sequencial

## Problem statement
Nao existe contrato de controle para iniciar execucao de um ticket especifico selecionado no Telegram. O runner publico so expoe `/run_all` e `/run_specs`, enquanto a rotina de ticket unico esta privada e sem integracao com a camada Telegram.

## Observed behavior
- O que foi observado:
  - `BotControls` expoe `runAll` e `runSpecs`, mas nao ha acao de "run single ticket" (`src/integrations/telegram-bot.ts:35`).
  - `main.ts` injeta apenas controles existentes, sem wiring para execucao unitária de ticket (`src/main.ts:184`).
  - `TicketRunner` so expoe `requestRunAll` e `requestRunSpecs` como entradas publicas para processamento de ticket (`src/core/runner.ts:1199`).
  - A rotina de ticket unico (`processTicket`) e privada e usada como fallback interno/teste (`src/core/runner.ts:2825`).
  - O loop publico de producao seleciona sempre `nextOpenTicket()` da fila, sem alvo explicitamente escolhido (`src/core/runner.ts:2713`).
  - Mensagens de bloqueio atuais cobrem `/run-all`/`/run_specs`, nao a acao "Implementar este ticket" da spec (`src/integrations/telegram-bot.ts:3042`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de contratos runner/telegram

## Expected behavior
Apos selecionar ticket no Telegram, a acao "Implementar este ticket" deve iniciar somente esse ticket (sem varrer outros), respeitando lock de concorrencia, emitindo status/log por etapa e mantendo regra de fechamento `tickets/open -> tickets/closed` no mesmo commit.

## Reproduction steps
1. Inspecionar contratos `BotControls` e `main.ts` para confirmar ausencia de metodo de execucao unitária de ticket.
2. Inspecionar `TicketRunner` e confirmar ausencia de API publica para ticket selecionado.
3. Observar em `runForever` que o fluxo atual sempre consome o proximo ticket da fila.

## Evidence
- `src/integrations/telegram-bot.ts:35`
- `src/main.ts:184`
- `src/core/runner.ts:1199`
- `src/core/runner.ts:2713`
- `src/core/runner.ts:2825`
- `src/integrations/telegram-bot.ts:3042`

## Impact assessment
- Impacto funcional: alto para RF-07 e CA-06.
- Impacto operacional: medio-alto; operador nao consegue controlar execucao pontual por ticket.
- Risco de regressao: medio-alto; altera contratos entre core e Telegram.
- Scope estimado (quais fluxos podem ser afetados): runner, integracao Telegram, mensagens de bloqueio/estado e testes de ponta a ponta.

## Initial hypotheses (optional)
- Existe base de processamento unitario (`processTicket`) mas faltam API publica, validacoes de existencia e acoplamento no fluxo Telegram.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Expor API publica para executar ticket selecionado (por nome/caminho) sem percorrer backlog completo.
- Validar inexistencia/remocao do ticket antes da execucao e responder erro funcional claro.
- Integrar callback "Implementar este ticket" no Telegram com contexto seguro/idempotente.
- Bloquear execucao quando houver processamento em andamento, preservando estado atual.
- Emitir logs/status de marcos da execucao manual (tentativa, lock, inicio, plan, implement, close-and-version, sucesso/falha).
- Garantir regra de fechamento com evidencia de sincronizacao e ticket movido para `tickets/closed/` no mesmo commit de resolucao.
- Cobrir criterios com testes automatizados em `runner` e `telegram-bot`.

## Decision log
- 2026-02-23 - Gap aberto a partir de triagem da spec `2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
