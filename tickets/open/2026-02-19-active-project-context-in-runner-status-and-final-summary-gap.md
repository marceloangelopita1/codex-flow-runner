# [TICKET] Projeto ativo nao propaga para execucao, /status e resumo final

## Metadata
- Status: open
- Priority: P1
- Severity: S1
- Created at (UTC): 2026-02-19 17:28Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-multi-project-active-selection.md
  - ExecPlan: A definir

## Context
- Workflow area: `src/main.ts`, `src/core/runner.ts`, `src/types/state.ts`, `src/types/ticket-final-summary.ts`, `src/integrations/telegram-bot.ts`
- Scenario: comandos operacionais e observabilidade devem refletir o projeto ativo global selecionado
- Input constraints: manter processamento sequencial por ticket e rastreabilidade no Telegram

## Problem statement
Mesmo com comandos de controle ja existentes, o runner nao carrega/propaga identidade do projeto ativo no estado, no resumo final e no `/status`. O pipeline continua acoplado a uma unica instancia de integracoes por `REPO_PATH`, sem roteamento por projeto selecionado.

## Observed behavior
- O que foi observado:
  - `src/main.ts:17`, `src/main.ts:18`, `src/main.ts:19` criam `queue`, `codex` e `gitVersioning` uma unica vez com `env.REPO_PATH`.
  - `src/core/runner.ts:37` a `src/core/runner.ts:43` recebem dependencias de repositorio unico e as reutilizam em toda a rodada (`src/core/runner.ts:120`, `src/core/runner.ts:307`).
  - `src/types/state.ts:17` a `src/types/state.ts:25` nao possuem campos de projeto ativo (nome/caminho).
  - `src/types/ticket-final-summary.ts:5` a `src/types/ticket-final-summary.ts:24` nao carregam identificacao de projeto no payload de notificacao.
  - `src/integrations/telegram-bot.ts:239` a `src/integrations/telegram-bot.ts:271` montam `/status` sem nome/caminho do projeto.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de wiring, estado e contratos de notificacao

## Expected behavior
`/run-all`, `/pause`, `/resume` e `/status` devem operar sobre o projeto ativo corrente, e tanto `/status` quanto o resumo final por ticket devem exibir identificacao do projeto (nome e caminho base), sem mistura de estado entre projetos.

## Reproduction steps
1. Ler `src/main.ts` e verificar que todo o fluxo usa dependencias fixas para um unico `repoPath`.
2. Ler `src/types/state.ts` e `src/types/ticket-final-summary.ts` para confirmar ausencia de campos de contexto de projeto.
3. Ler `src/integrations/telegram-bot.ts` e verificar que `/status` e mensagem final nao incluem projeto.

## Evidence
- `src/main.ts:17`
- `src/main.ts:18`
- `src/main.ts:19`
- `src/core/runner.ts:37`
- `src/core/runner.ts:120`
- `src/core/runner.ts:307`
- `src/types/state.ts:17`
- `src/types/ticket-final-summary.ts:5`
- `src/integrations/telegram-bot.ts:239`
- `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`

## Impact assessment
- Impacto funcional: alto, risco de executar fluxo no projeto errado quando multi-projeto for habilitado.
- Impacto operacional: alto, falta de identificacao do projeto em `/status` e notificacao reduz auditabilidade.
- Risco de regressao: medio, exige evolucao de contratos de estado e notificacao entre runner e Telegram.
- Scope estimado (quais fluxos podem ser afetados): bootstrap, estado do runner, mensagens de status/notificacao, tipos compartilhados e testes de regressao.

## Initial hypotheses (optional)
- O contrato atual de estado/notificacao foi desenhado para repositorio unico e precisa incorporar contexto de projeto.

## Proposed solution (optional)
- Introduzir `activeProject` no estado do runner.
- Evoluir tipos de resumo final para incluir nome/caminho do projeto.
- Adaptar wiring do runner para resolver dependencias de acordo com o projeto ativo.

## Closure criteria
- RF-10 e RF-11 implementados com testes.
- CA-07 e CA-08 validados com cenarios de troca de projeto e rodada completa.
- `/status` e resumo final exibem nome e caminho base do projeto ativo com coerencia de estado.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec `telegram-multi-project-active-selection`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
