# [TICKET] Callbacks de /plan_spec nao destacam escolha, nao travam botoes e nao confirmam no chat

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-20 22:19Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md
  - execplans/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md
  - SPECS.md
  - INTERNAL_TICKETS.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/core/runner.ts`
- Scenario: operador responde perguntas e acoes finais de `/plan_spec` por botoes inline.
- Input constraints: manter sessao unica de `/plan_spec` e compatibilidade com opcoes atuais (`create-spec`, `refine`, `cancel`).

## Problem statement
No fluxo atual de callback de `/plan_spec`, o bot responde apenas `answerCbQuery` (toast). A mensagem com botoes nao e editada para registrar a escolha e os botoes permanecem reutilizaveis. Tambem nao ha segunda confirmacao por mensagem no chat apos clique valido.

## Observed behavior
- O que foi observado:
  - `handlePlanSpecCallbackQuery` chama `safeAnswerCallbackQuery` e retorna, sem `ctx.editMessageText` para callbacks de planejamento.
  - Em cliques validos, a confirmacao e apenas toast (`"Resposta registrada."`) sem mensagem adicional no chat.
  - Selecao de pergunta usa `submitPlanSpecInput` diretamente, sem controle de idempotencia por mensagem/etapa para clique repetido.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao de handlers + testes atuais de callback

## Expected behavior
Todo clique valido em `/plan_spec` deve editar a mensagem correspondente para destacar a opcao/acao escolhida e travar botoes daquela mensagem, com confirmacao dupla (toast + mensagem no chat). Repeticoes/stale devem ser tratadas de forma idempotente e observavel.

## Reproduction steps
1. Iniciar `/plan_spec` e receber pergunta/final com botoes inline.
2. Clicar em qualquer opcao.
3. Observar que apenas toast e retornado; a mensagem original nao muda e os botoes continuam clicaveis.

## Evidence
- `src/integrations/telegram-bot.ts:816`
- `src/integrations/telegram-bot.ts:855`
- `src/integrations/telegram-bot.ts:876`
- `src/core/runner.ts:531`
- `src/core/runner.ts:535`
- `src/core/runner.ts:465`
- `src/integrations/telegram-bot.test.ts:1854`
- `src/integrations/telegram-bot.test.ts:1897`

## Impact assessment
- Impacto funcional: medio, reduz clareza de estado da conversa e aumenta risco de clique duplicado.
- Impacto operacional: medio, gera ambiguidade para operador sobre qual escolha ficou ativa.
- Risco de regressao: medio, envolve callback UX e transicoes de fase da sessao.
- Scope estimado (quais fluxos podem ser afetados): perguntas/finalizacao de `/plan_spec`, estados de sessao, mensagens Telegram e suite de testes.

## Initial hypotheses (optional)
- A implementacao atual priorizou parser e roteamento de callback, deixando pendente padrao de UX de confirmacao + lock visual.

## Proposed solution (optional)
Nao obrigatorio. Definir em ExecPlan.

## Closure criteria
- Callback de pergunta edita mensagem da pergunta destacando escolha e removendo/travando botoes.
- Callback de acao final edita mensagem final destacando acao e removendo/travando botoes.
- Clique valido em `/plan_spec` envia confirmacao dupla: toast + mensagem no chat.
- Cliques repetidos para mesma mensagem/escolha retornam comportamento idempotente.
- Falha de `editMessageText` e tratada em best effort sem quebrar fluxo principal e com log.
- Cobertura automatizada para CAs de `/plan_spec` (CA-12 a CA-15, CA-21, CA-22, CA-23 relacionados).

## Decision log
- 2026-02-20 - Gap separado do ticket de `/specs` por contexto de sessao interativa e risco proprio em `/plan_spec`.
- 2026-02-20 - Validacao de aceite do ExecPlan classificada como GO com `npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`, `npm test`, `npm run check` e `npm run build` verdes.

## Closure
- Closed at (UTC): 2026-02-20 23:12Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md (commit: mesmo changeset de fechamento)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
