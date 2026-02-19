# [TICKET] Jornada /plan_spec sem sessao dedicada e guardrails operacionais

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 21:13Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-plan-spec-conversation.md
  - ExecPlan: a definir

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/types/state.ts`, `src/main.ts`
- Scenario: operador precisa iniciar `/plan_spec`, manter uma unica sessao ativa, bloquear comandos conflitantes e acompanhar estado/timeout via Telegram.
- Input constraints: fluxo sequencial, sem paralelizacao, uma sessao global por instancia.

## Problem statement
Nao existe orquestrador de sessao para `/plan_spec`, nem comandos dedicados (`/plan_spec_status`, `/plan_spec_cancel`). O bot atual nao roteia mensagens livres para uma conversa ativa e o estado do runner nao representa fases de planejamento de spec (esperando usuario/Codex), inviabilizando os RFs operacionais de ciclo de vida, bloqueio e timeout.

## Observed behavior
- O que foi observado:
  - O help e os handlers registrados nao incluem `/plan_spec`, `/plan_spec_status` ou `/plan_spec_cancel` (`src/integrations/telegram-bot.ts:157`, `src/integrations/telegram-bot.ts:249`, `src/integrations/telegram-bot.ts:344`).
  - O bot trata apenas comandos conhecidos, aliases legacy e callback de projetos; nao ha `on("text")` para rotear mensagens livres de sessao (`src/integrations/telegram-bot.ts:253`, `src/integrations/telegram-bot.ts:318`, `src/integrations/telegram-bot.ts:322`).
  - `BotControls`/bootstrap expoem apenas controles de run/spec/projeto, sem API para sessao de planejamento (`src/main.ts:97`).
  - O estado/fases nao contem fases especificas de planejamento de spec nem marcador de espera por usuario/Codex (`src/types/state.ts:4`).
  - Nao ha logica de timeout de sessao de planejamento; apenas `sleep` do polling de `/run-all` (`src/core/runner.ts:695`).
  - Ja existe base parcial de bloqueio de troca de projeto durante execucao (`src/integrations/telegram-bot.ts:516`, `src/integrations/telegram-bot.ts:568`) e bloqueio de rodadas concorrentes (`src/core/runner.ts:134`, `src/core/runner.ts:185`), mas nao vinculada a uma sessao `/plan_spec`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e contratos atuais de comandos/estado.

## Expected behavior
O bot deve expor e orquestrar sessao unica de `/plan_spec` com ciclo completo (inicio, status, cancelamento, timeout), rotear mensagens livres para a sessao ativa, bloquear comandos conflitantes (`/run_all`, `/run_specs`, troca de projeto) e refletir fase/ultima atividade no status operacional.

## Reproduction steps
1. Revisar `src/integrations/telegram-bot.ts` e confirmar ausencia de handlers `/plan_spec*` e ausencia de roteamento generico de texto livre.
2. Revisar `src/types/state.ts` e confirmar inexistencia de fases para sessao de planejamento de spec.
3. Revisar `src/main.ts` e confirmar ausencia de controles de sessao de planejamento injetados no controller.
4. Buscar `plan_spec`/timeout em `src/` e confirmar ausencia de implementacao.

## Evidence
- `src/integrations/telegram-bot.ts:157`
- `src/integrations/telegram-bot.ts:249`
- `src/integrations/telegram-bot.ts:322`
- `src/integrations/telegram-bot.ts:344`
- `src/integrations/telegram-bot.ts:516`
- `src/integrations/telegram-bot.ts:568`
- `src/core/runner.ts:134`
- `src/core/runner.ts:185`
- `src/core/runner.ts:695`
- `src/types/state.ts:4`
- `src/main.ts:97`
- `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`

## Impact assessment
- Impacto funcional: alto, a jornada principal `/plan_spec` nao pode ser iniciada nem controlada.
- Impacto operacional: alto, faltam guardrails de conflito e timeout de sessao presa.
- Risco de regressao: medio, envolve estado global do runner e superficie de comandos Telegram.
- Scope estimado (quais fluxos podem ser afetados): comandos Telegram, controle de concorrencia do runner, status operacional e auditoria de logs.

## Initial hypotheses (optional)
- A base atual foi desenhada para `/run_all` e `/run_specs`, sem sessao conversacional persistente.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- Implementar `/plan_spec`, `/plan_spec_status` e `/plan_spec_cancel` com gate por `TELEGRAM_ALLOWED_CHAT_ID`.
- Garantir sessao unica global de planejamento por instancia.
- Rotear a primeira mensagem livre apos `/plan_spec` como brief inicial e manter roteamento de mensagens livres para sessao ativa.
- Bloquear `/run_all`, `/run_specs`, `/select_project` e callback de selecao de projeto durante sessao ativa, com mensagem explicita.
- Preservar projeto ativo da sessao no momento do inicio e bloquear troca durante a sessao.
- Implementar timeout de inatividade de 30 minutos com encerramento automatico e mensagem ao operador.
- Atualizar `/status` para refletir fase da sessao e timestamp da ultima atividade.
- Cobrir CAs: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-17, CA-18.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gaps da spec `telegram-plan-spec-conversation`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
