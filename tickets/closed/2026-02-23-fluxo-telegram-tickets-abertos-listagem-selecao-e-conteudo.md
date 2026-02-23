# [TICKET] Fluxo Telegram de "Tickets abertos" para listagem, selecao e leitura integral ainda nao existe

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-23 16:14Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md
  - execplans/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md
  - INTERNAL_TICKETS.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): a jornada de selecao manual de ticket no Telegram nao pode ser iniciada hoje, bloqueando RF-01, RF-02, RF-04, RF-05, RF-06, RF-09 e RF-10.

## Context
- Workflow area: comandos/callbacks do Telegram em `src/integrations/telegram-bot.ts` e contrato de controles em `src/main.ts`
- Scenario: operador tenta abrir uma lista de tickets em `tickets/open/`, selecionar item e visualizar conteudo completo no chat
- Input constraints: preservar controle de acesso existente e manter resposta legivel no limite do Telegram

## Problem statement
A integracao Telegram nao possui entrada de UI/comando para "Tickets abertos", nao possui callback de selecao de ticket e nao envia conteudo integral de ticket com chunking. O fluxo de leitura/manual inspection da spec alvo nao esta implementado.

## Observed behavior
- O que foi observado:
  - O help `/start` nao inclui comando para "Tickets abertos" (`src/integrations/telegram-bot.ts:380`).
  - `registerHandlers` registra `run_all`, `specs`, `run_specs`, `codex_chat`, `plan_spec`, `projects` e `select_project`, sem comando para tickets abertos (`src/integrations/telegram-bot.ts:612`).
  - `handleCallbackQuery` so roteia prefixos `specs:`, `projects:`, `codex-chat:` e `plan-spec:` (`src/integrations/telegram-bot.ts:781`).
  - `BotControls` nao expoe metodos para listar/ler tickets abertos (`src/integrations/telegram-bot.ts:35`).
  - O wiring em `main.ts` nao injeta controles para fluxo manual de ticket (`src/main.ts:179`).
  - Envio de mensagens em texto usa `sendMessage` direto, sem estrategia de chunking para arquivos longos (`src/integrations/telegram-bot.ts:582`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de handlers, contratos e wiring

## Expected behavior
Telegram deve expor fluxo "Tickets abertos" com listagem navegavel deterministica, permitir selecao de ticket e enviar o conteudo completo do arquivo no chat em partes ordenadas quando exceder limite de mensagem.

## Reproduction steps
1. Executar `/start` e verificar comandos disponiveis.
2. Inspecionar `registerHandlers` e confirmar ausencia de comando/callback de tickets abertos.
3. Inspecionar `BotControls` e `main.ts` e confirmar ausencia de contrato/wiring para listar e ler tickets.

## Evidence
- `src/integrations/telegram-bot.ts:35`
- `src/integrations/telegram-bot.ts:380`
- `src/integrations/telegram-bot.ts:612`
- `src/integrations/telegram-bot.ts:781`
- `src/integrations/telegram-bot.ts:582`
- `src/main.ts:179`

## Impact assessment
- Impacto funcional: medio-alto; CA-01, CA-02, CA-03 e CA-04 nao sao exercitaveis.
- Impacto operacional: medio; operador perde visibilidade e controle manual por ticket.
- Risco de regressao: medio; envolve novos comandos, callbacks e renderizacao de mensagens.
- Scope estimado (quais fluxos podem ser afetados): controlador Telegram, estado de callbacks, formatacao de mensagens e testes de integracao do bot.

## Initial hypotheses (optional)
- O bot evoluiu em torno de `specs/projects/plan_spec/codex_chat` e ainda nao recebeu extensao de callbacks para ticket manual.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Expor entrada de UI/comando para "Tickets abertos" no Telegram.
- Listar `tickets/open/` em ordem deterministica e com seletor unico por item.
- Responder com mensagem informativa quando nao houver ticket aberto.
- Ao selecionar ticket valido, enviar todo o conteudo do arquivo no chat com chunking ordenado.
- Tratar ticket removido/inexistente com erro funcional e orientacao para atualizar a lista.
- Cobrir fluxo com testes automatizados no `telegram-bot`.

## Decision log
- 2026-02-23 - Gap aberto a partir de triagem da spec `2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram`.
- 2026-02-23 - Execucao validada contra o ExecPlan com resultado `GO` por evidencia objetiva de testes e checks automatizados.

## Closure
- Closed at (UTC): 2026-02-23 17:14Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`
  - Commit: registrado no commit de fechamento deste ciclo.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Closure validation (GO):
  - [x] comando `/tickets_open` disponivel e documentado em `/start`.
  - [x] listagem de `tickets/open/` com ordenacao deterministica, paginacao e callback context.
  - [x] leitura integral com chunking ordenado para ticket longo.
  - [x] erro funcional para ticket removido/inexistente entre listagem e selecao.
  - [x] acao "Implementar este ticket" exibida apos leitura com callback `ticket-run:execute:*`.
  - [x] validacao automatizada executada: `npx tsx --test src/integrations/ticket-queue.test.ts`, `npx tsx --test src/integrations/telegram-bot.test.ts`, `npm run check && npm run build`.
- Manual validation pending: sim.
  - Entrega tecnica concluida: o fluxo foi implementado e validado por testes automatizados.
  - Validacao manual necessaria: executar o fluxo em bot Telegram real para confirmar UX ponta a ponta no ambiente operacional.
  - Como validar: no chat autorizado, executar `/tickets_open`, selecionar um ticket longo, confirmar recebimento em partes ordenadas e acionar "Implementar este ticket".
  - Responsavel operacional: `mapita` (owner do ticket).
