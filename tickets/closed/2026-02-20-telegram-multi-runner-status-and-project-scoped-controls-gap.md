# [TICKET] Contrato Telegram para multi-runner (status global e controles por projeto) esta incompleto

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
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
  - execplans/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts` e contratos de controle no `runner`
- Scenario: no modo multi-runner, o bot deve mostrar painel global `N/5`, manter detalhamento do projeto ativo e aplicar comandos de controle no escopo do projeto selecionado.
- Input constraints: preservar aliases legados e manter compatibilidade com fluxo sequencial por projeto.

## Problem statement
Mesmo com suporte atual a selecao de projeto, a camada Telegram ainda opera com estado de runner unico. O `/status` nao exibe visao global de runners, `/pause` e `/resume` continuam globais, e `select_project` e bloqueado sempre que existe qualquer execucao ativa.

## Observed behavior
- O que foi observado:
  - `buildStatusReply` exibe apenas um `RunnerState` singular, sem painel global `N/5` ou lista de runners ativos (`src/integrations/telegram-bot.ts:1501`).
  - `/pause` e `/resume` chamam controles sem contexto de projeto (`src/integrations/telegram-bot.ts:389`, `src/integrations/telegram-bot.ts:404`).
  - `/select_project` bloqueia troca sempre que `state.isRunning` for `true`, sem distinguir projeto em execucao (`src/integrations/telegram-bot.ts:741`).
  - Callback de selecao de projeto tambem bloqueia globalmente quando `state.isRunning` (`src/integrations/telegram-bot.ts:799`).
  - Testes atuais validam explicitamente esse bloqueio global (`src/integrations/telegram-bot.test.ts:1609`, `src/integrations/telegram-bot.test.ts:1877`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de handlers/mensagens e leitura da suite de testes do bot.

## Expected behavior
`/status` deve combinar visao do projeto ativo com painel global de runners ativos (`N/5`), `/pause` e `/resume` devem atuar no runner do projeto ativo no momento do comando, e `/projects` + `/select_project` devem continuar operaveis durante execucao em outros projetos sem conflito.

## Reproduction steps
1. Colocar o runner em estado de execucao (`isRunning=true`).
2. Enviar `/select-project beta-project`.
3. Observar bloqueio global, sem validacao de conflito por projeto.
4. Enviar `/status` e observar ausencia de painel global `N/5`.

## Evidence
- `src/integrations/telegram-bot.ts:1501`
- `src/integrations/telegram-bot.ts:389`
- `src/integrations/telegram-bot.ts:404`
- `src/integrations/telegram-bot.ts:741`
- `src/integrations/telegram-bot.ts:799`
- `src/integrations/telegram-bot.test.ts:1609`
- `src/integrations/telegram-bot.test.ts:1877`
- `src/integrations/telegram-bot.test.ts:2066`

## Impact assessment
- Impacto funcional: medio-alto, inviabiliza CAs de operacao simultanea por projeto (CA-05, CA-06, CA-07).
- Impacto operacional: medio, operador perde visibilidade global de capacidade e nao consegue controlar corretamente runners paralelos.
- Risco de regressao: medio, altera contrato de comandos e mensagens do bot.
- Scope estimado (quais fluxos podem ser afetados): `/status`, `/pause`, `/resume`, `/projects`, `/select_project`, callbacks inline e testes do Telegram.

## Initial hypotheses (optional)
- A interface Telegram foi desenhada para um unico estado de runner e ainda nao recebeu adaptacao para matriz de runners por projeto.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Atualizar contratos do controlador para operar sobre runner alvo por projeto.
- Exibir em `/status` painel global de capacidade e runners ativos (`N/5`) sem perder detalhes do projeto ativo.
- Garantir que `/pause` e `/resume` atuem somente no runner do projeto ativo.
- Permitir `select_project` durante execucao em outro projeto quando nao houver conflito de slot.
- Ajustar mensagens de bloqueio para diferenciar `slot do projeto ocupado` de `capacidade global esgotada`.
- Cobrir CAs com testes automatizados (CA-05, CA-06, CA-07 e impacto de CA-10).

## Decision log
- 2026-02-20 - Ticket aberto apos avaliacao de gaps da spec `2026-02-20-telegram-multi-project-parallel-runners`.
- 2026-02-20 - Ticket resolvido com contrato Telegram alinhado ao multi-runner (status global + controles scoped por projeto ativo).

## Closure
- Closed at (UTC): 2026-02-20 16:45Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md
