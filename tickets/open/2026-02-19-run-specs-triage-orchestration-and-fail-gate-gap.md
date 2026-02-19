# [TICKET] Fluxo /run_specs nao executa triagem de spec nem encadeia run_all

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 19:39Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-approved-spec-triage-run-specs.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/types/state.ts`, `prompts/`
- Scenario: operador precisa executar triagem de uma spec approved e, apos commit/push da triagem, continuar automaticamente com a rodada de tickets.
- Input constraints: fluxo sequencial, sem paralelizacao de specs/tickets.

## Problem statement
O runner atual nao tem fluxo de triagem de spec por comando `/run_specs <arquivo>`. A orquestracao existe apenas para tickets (`/run_all`), sem fases de spec, sem etapa de fechamento/commit da triagem e sem encadeamento automatico para a rodada de backlog.

## Observed behavior
- O que foi observado:
  - `TelegramController` registra comandos para `/run_all`, `/status`, `/pause`, `/resume`, `/projects` e `/select_project`, sem handler de `/run_specs` (`src/integrations/telegram-bot.ts:227`, `src/integrations/telegram-bot.ts:280`, `src/integrations/telegram-bot.ts:292`).
  - `TicketRunner` expoe apenas `requestRunAll()` como entrada de rodada; nao ha API de execucao de spec (`src/core/runner.ts:111`).
  - O estado/fases do runner nao incluem `select-spec`, `spec-triage` ou `spec-close-and-version` (`src/types/state.ts:4`).
  - O client do Codex aceita apenas stages de ticket (`plan`, `implement`, `close-and-version`) e mapeia apenas prompts `02`, `03`, `04` (`src/integrations/codex-client.ts:13`, `src/integrations/codex-client.ts:49`).
  - Nao existe prompt `prompts/05-encerrar-tratamento-spec-commit-push.md` no repositorio.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e contratos de testes.

## Expected behavior
Comando `/run_specs <arquivo-da-spec.md>` deve executar triagem sequencial da spec, validar commit/push com mensagem padrao `chore(specs): triage <arquivo>`, bloquear `run_all` em caso de falha no fechamento da triagem e iniciar automaticamente `run_all` em caso de sucesso.

## Reproduction steps
1. Revisar os handlers de comando em `src/integrations/telegram-bot.ts` e confirmar ausencia de `/run_specs`.
2. Revisar `src/core/runner.ts` e confirmar que a rodada contempla apenas selecao/processamento de tickets.
3. Revisar `src/types/state.ts` e `src/integrations/codex-client.ts` para confirmar ausencia de fases/stages de spec.
4. Listar `prompts/` e confirmar ausencia do prompt de fechamento da triagem de spec.

## Evidence
- `src/integrations/telegram-bot.ts:227`
- `src/integrations/telegram-bot.ts:280`
- `src/core/runner.ts:111`
- `src/types/state.ts:4`
- `src/integrations/codex-client.ts:13`
- `src/integrations/codex-client.ts:49`
- `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`

## Impact assessment
- Impacto funcional: alto, pois a jornada principal da spec (`/run_specs`) nao e executavel.
- Impacto operacional: alto, bloqueia derivacao automatica de backlog a partir de specs approved.
- Risco de regressao: medio, envolve ampliar orquestracao do runner, estagios Codex e contratos do bot.
- Scope estimado (quais fluxos podem ser afetados): comandos Telegram, estado/fase do runner, integracao Codex, validacao de fechamento com git e encadeamento de rodada.

## Initial hypotheses (optional)
- O runner foi desenhado inicialmente para tickets e ainda nao recebeu a extensao de ciclo para specs approved.

## Proposed solution (optional)
Nao obrigatorio. Entrega detalhada deve ser formalizada em ExecPlan.

## Closure criteria
- Implementar comando `/run_specs <arquivo-da-spec.md>` com validacao de rodada unica (`already-running`).
- Executar triagem com `prompts/01-avaliar-spec-e-gerar-tickets.md` substituindo `<SPEC_PATH>` por `docs/specs/<arquivo>`.
- Implementar etapa de fechamento da triagem (commit/push) com mensagem `chore(specs): triage <arquivo-da-spec.md>`.
- Sem sucesso na etapa de fechamento, nao iniciar `run_all`.
- Com sucesso na etapa de fechamento, iniciar `run_all` automaticamente na mesma solicitacao.
- `/status` e logs devem refletir fase/spec em processamento durante triagem e transicao para rodada de tickets.
- Cobertura de testes automatizados para CAs de fluxo (`CA-02` a `CA-10` e `CA-12` da spec).

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec de triagem de specs approved (`/run_specs`).

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
