# [TICKET] Comando /specs e validacao de elegibilidade de spec ainda nao existem

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
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
  - ExecPlan: execplans/2026-02-19-specs-command-eligibility-listing-and-access-gap.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/main.ts`, `src/core/active-project-resolver.ts`, `docs/specs/`
- Scenario: operador precisa listar specs elegiveis por `/specs` e receber bloqueio explicito quando `/run_specs <arquivo>` aponta spec inexistente ou nao elegivel.
- Input constraints: usar projeto ativo atual e manter controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID`.

## Problem statement
Nao existe superficie de listagem de specs elegiveis nem validacao de elegibilidade (`Status: approved` + `Spec treatment: pending`) no ciclo de comandos do Telegram. Tambem nao existe validacao de argumento de spec para `/run_specs`.

## Observed behavior
- O que foi observado:
  - O bot nao registra comando `/specs` e nao possui estrutura de controle para consulta de specs do projeto ativo (`src/integrations/telegram-bot.ts:227`, `src/integrations/telegram-bot.ts:280`).
  - O wiring do `main` injeta controles para `runAll`, `pause`, `resume`, `listProjects` e `selectProjectByName`, sem API de listagem/validacao de specs (`src/main.ts:87`).
  - Nao existe modulo de descoberta/parse de metadata de spec em `src/core` ou `src/integrations` para classificar elegibilidade.
  - A suite de testes do bot cobre comandos atuais e nao cobre `/specs` nem validacoes de `/run_specs` (`src/integrations/telegram-bot.test.ts:42`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e testes.

## Expected behavior
`/specs` deve listar apenas specs elegiveis do projeto ativo e `/run_specs <arquivo>` deve validar existencia/elegibilidade com mensagem de bloqueio clara quando invalido, mantendo o mesmo controle de acesso por chat ja usado nos demais comandos.

## Reproduction steps
1. Revisar os comandos registrados em `src/integrations/telegram-bot.ts`.
2. Revisar os controles conectados em `src/main.ts`.
3. Buscar modulo de descoberta de specs e parser de metadata no codigo-fonte.
4. Revisar testes de `telegram-bot` para confirmar ausencia de cobertura de `/specs` e validacao de `/run_specs`.

## Evidence
- `src/integrations/telegram-bot.ts:227`
- `src/integrations/telegram-bot.ts:280`
- `src/main.ts:87`
- `src/integrations/telegram-bot.test.ts:42`
- `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`

## Impact assessment
- Impacto funcional: medio-alto, operador nao consegue descobrir specs elegiveis pelo bot nem validar alvo de triagem com feedback claro.
- Impacto operacional: medio, aumenta erro manual na escolha de spec e reduz auditabilidade da triagem.
- Risco de regressao: medio, envolve novo parser de metadata e mudancas de contrato do bot.
- Scope estimado (quais fluxos podem ser afetados): comandos Telegram, resolucao de projeto ativo, parse de specs e mensagens de validacao.

## Initial hypotheses (optional)
- A base de comandos Telegram evoluiu para multi-projeto/tickets, mas sem camada dedicada para backlog de specs.

## Proposed solution (optional)
Nao obrigatorio. Entrega detalhada deve ser formalizada em ExecPlan.

## Closure criteria
- Implementar listagem de specs elegiveis (`Status: approved` + `Spec treatment: pending`) para o projeto ativo.
- Implementar comando `/specs` com resposta deterministica e legivel.
- Implementar validacao de argumento em `/run_specs <arquivo-da-spec.md>`.
- `/run_specs` deve bloquear com mensagem explicita quando a spec nao existe ou nao e elegivel.
- `/specs` e `/run_specs` devem aplicar o mesmo controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID`.
- Cobertura de testes automatizados para `CA-01`, `CA-03` e `CA-11`.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap para descoberta/elegibilidade de specs no bot.

## Closure
- Closed at (UTC): 2026-02-19 20:13Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-19-specs-command-eligibility-listing-and-access-gap.md (commit deste fechamento; PR N/A)
