# [TICKET] Lock global de concorrencia ainda permite multiplos tickets em execucao no runner

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-23 16:14Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-02-23-lock-global-sequencial-para-execucao-de-ticket-no-runner.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md
  - execplans/2026-02-23-lock-global-sequencial-para-execucao-de-ticket-no-runner.md
  - INTERNAL_TICKETS.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`): P0
- Justificativa objetiva (evidencias e impacto): o requisito da spec exige no maximo 1 ticket em execucao globalmente; o estado atual permite paralelismo entre projetos e abre risco de corrida operacional.

## Context
- Workflow area: concorrencia de execucao em `src/core/runner.ts` e estado global em `src/types/state.ts`
- Scenario: inicio de rodadas `/run_all` em projetos distintos enquanto outra rodada ja esta ativa
- Input constraints: manter fluxo sequencial com um unico ticket em processamento por vez

## Problem statement
O runner atual nao aplica lock global de ticket. A reserva de slot e por projeto, com capacidade total de 5 slots, permitindo processar tickets em paralelo em projetos distintos e violando o requisito de sequencialidade global da spec alvo.

## Observed behavior
- O que foi observado:
  - `RUNNER_SLOT_LIMIT` esta fixado em `5` (`src/core/runner.ts:170`).
  - `reserveSlot` bloqueia apenas por `slotKey` (projeto) e permite novos slots em outros projetos ate o limite (`src/core/runner.ts:3103`).
  - `syncStateFromSlots` expoe capacidade global multipla (`used/limit`) e considera multiplos slots ativos (`src/core/runner.ts:3294`).
  - Teste explicito valida execucoes paralelas em projetos distintos (`src/core/runner.test.ts:1393`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica + leitura de testes automatizados existentes

## Expected behavior
Deve existir lock global para fluxos de ticket (`/run_all`, `/run_specs` e execucao manual de ticket), garantindo no maximo 1 ticket em processamento por vez em toda a instancia.

## Reproduction steps
1. Configurar `resolveRoundDependencies` para alternar entre dois projetos.
2. Chamar `requestRunAll()` duas vezes em sequencia curta para projetos diferentes.
3. Observar ambos resultados como `started` (comportamento atual), evidenciando ausencia de lock global.

## Evidence
- `src/core/runner.ts:170`
- `src/core/runner.ts:3103`
- `src/core/runner.ts:3294`
- `src/types/state.ts:119`
- `src/core/runner.test.ts:1393`

## Impact assessment
- Impacto funcional: alto; viola RF-11 da spec alvo.
- Impacto operacional: alto; aumenta risco de corrida entre fluxos automaticos e manuais.
- Risco de regressao: alto; altera regra central de concorrencia do runner.
- Scope estimado (quais fluxos podem ser afetados): `requestRunAll`, `requestRunSpecs`, status global, respostas de bloqueio no Telegram e testes de concorrencia.

## Initial hypotheses (optional)
- A arquitetura atual foi otimizada para multi-projeto em paralelo e precisa de guardrail adicional para cenarios com lock global de ticket.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Bloquear qualquer nova execucao de ticket quando ja existir ticket em processamento global (independente do projeto).
- Retornar motivo de bloqueio claro e consistente para camada Telegram.
- Ajustar estado/capacidade exposta para refletir regra global de sequencialidade de tickets.
- Atualizar testes para impedir paralelismo de tickets entre projetos.
- Preservar funcionamento de sessoes interativas nao-ticket com regra explicita e documentada.

## Decision log
- 2026-02-23 - Gap aberto a partir de triagem da spec `2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram`.
- 2026-02-23 - Execucao validada contra o ExecPlan com resultado `GO` por evidencia objetiva de testes e checks automatizados.

## Closure
- Closed at (UTC): 2026-02-23 16:34Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-02-23-lock-global-sequencial-para-execucao-de-ticket-no-runner.md`
  - Commit: registrado no commit de fechamento deste ciclo.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Closure validation (GO):
  - [x] lock global impede novo ticket quando ja existe ticket em execucao global.
  - [x] motivo de bloqueio tipado e mensagem contextual para Telegram.
  - [x] estado/capacidade inclui snapshot dedicado de ticket (`ticketCapacity`).
  - [x] testes atualizados para bloquear paralelismo entre projetos e preservar fluxos nao-ticket.
  - [x] validacao automatizada executada: `npx tsx --test src/core/runner.test.ts`, `npx tsx --test src/integrations/telegram-bot.test.ts`, `npm run check && npm run build`.
- Manual validation pending: nao.
