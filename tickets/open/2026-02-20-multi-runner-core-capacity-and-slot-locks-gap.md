# [TICKET] Gerenciador multi-runner por projeto com limite de 5 slots ainda nao implementado

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-20 15:51Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md
  - ExecPlan: A definir

## Context
- Workflow area: `src/main.ts`, `src/core/runner.ts`, `src/types/state.ts`
- Scenario: a instancia precisa executar `/run_all` e `/run_specs` em paralelo entre projetos distintos, com ate 5 runners ativos e 1 slot por projeto.
- Input constraints: manter processamento sequencial de tickets por projeto e nao criar fila automatica quando capacidade estiver cheia.

## Problem statement
A arquitetura atual continua baseada em um unico `TicketRunner` com estado global (`isRunning`) e bloqueio unico. Isso impede concorrencia entre projetos, nao aplica limite `N/5` e bloqueia `/run_all`/`/run_specs` durante `/plan_spec`, contrariando os RFs centrais da spec.

## Observed behavior
- O que foi observado:
  - O bootstrap instancia apenas um `TicketRunner` para toda a instancia (`src/main.ts:76`).
  - O estado do runner e singular (`isRunning`, `currentTicket`, `activeProject`) sem mapa por projeto (`src/types/state.ts:39`).
  - `requestRunAll` e `requestRunSpecs` usam `isBusy()` global e retornam `already-running` quando qualquer execucao esta ativa (`src/core/runner.ts:685`, `src/core/runner.ts:750`, `src/core/runner.ts:1079`).
  - Nao existe controle de capacidade maxima de 5 runners nem retorno com lista de projetos ativos no bloqueio.
  - Com sessao `/plan_spec` ativa, `/run_all` e `/run_specs` ficam bloqueados globalmente (`src/core/runner.ts:672`, `src/core/runner.ts:736`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e testes unitarios de bloqueio global (`src/core/runner.test.ts:896`, `src/core/runner.test.ts:925`, `src/core/runner.test.ts:1327`).

## Expected behavior
A instancia deve ter gerenciador multi-runner por projeto com ate 5 slots ativos simultaneos, garantindo 1 slot por projeto para `/run_all` e `/run_specs`, sem fila automatica no limite, e coexistencia com a sessao global unica de `/plan_spec`.

## Reproduction steps
1. Iniciar uma execucao `/run_all` para um projeto.
2. Trocar o projeto ativo e tentar iniciar nova execucao `/run_all` ou `/run_specs`.
3. Observar retorno `already-running`, mesmo sendo projeto diferente.
4. Iniciar `/plan_spec` e tentar `/run_all`; observar bloqueio global por `plan_spec-active`.

## Evidence
- `src/main.ts:76`
- `src/types/state.ts:39`
- `src/core/runner.ts:660`
- `src/core/runner.ts:716`
- `src/core/runner.ts:785`
- `src/core/runner.ts:1079`
- `src/core/runner.test.ts:896`
- `src/core/runner.test.ts:925`
- `src/core/runner.test.ts:1327`

## Impact assessment
- Impacto funcional: alto, bloqueia os RFs de paralelizacao por projeto (RF-01, RF-03, RF-05, RF-07, RF-09).
- Impacto operacional: alto, operador nao consegue consumir backlog de projetos independentes com throughput previsto.
- Risco de regressao: alto, envolve refatoracao de orquestracao de estado e contratos de retorno de comandos.
- Scope estimado (quais fluxos podem ser afetados): core do runner, resolucao de dependencias por projeto, contratos de controle Telegram e testes de concorrencia.

## Initial hypotheses (optional)
- O design atual foi otimizado para um runner unico global e ainda nao tem camada de orquestracao de slots por projeto.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Implementar gerenciador multi-runner por projeto com limite global `5` de slots ativos.
- Garantir `1` slot por projeto para `/run_all` e `/run_specs` (sem duplicar execucao no mesmo projeto).
- Bloquear inicio quando `N=5` com retorno explicito incluindo projetos ativos.
- Nao enfileirar automaticamente pedidos excedentes nem substituir runner ativo.
- Permitir concorrencia real entre projetos distintos quando houver capacidade.
- Permitir coexistencia de `/plan_spec` global unico com `/run_all` e `/run_specs` em projetos diferentes, respeitando capacidade.
- Cobrir os CAs de concorrencia/capacidade com testes automatizados (CA-01, CA-02, CA-03, CA-04, CA-08, CA-09).

## Decision log
- 2026-02-20 - Ticket aberto apos avaliacao de gaps da spec `2026-02-20-telegram-multi-project-parallel-runners`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
