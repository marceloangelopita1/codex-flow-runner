# [TICKET] Rastreabilidade incompleta no resumo final e incoerencia potencial de /status

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-19 14:42Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-run-status-notification.md
  - ExecPlan: execplans/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md

## Context
- Workflow area: rastreabilidade de fechamento por ticket e leitura operacional por `/status`
- Scenario: ticket finalizado com sucesso deve reportar artefato de plano + identificador de commit/push; `/status` deve refletir ultimo evento notificado
- Input constraints: sem exposicao de segredos; manter fluxo sequencial

## Problem statement
Mesmo apos implementar notificacao final por ticket, o estado atual nao tem contrato para transportar todos os campos de rastreabilidade exigidos na spec (especialmente identificador de commit/push) nem para alinhar explicitamente `/status` com o ultimo evento efetivamente notificado no chat.

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts` apenas loga `execPlanPath` retornado da etapa `plan`; nao persiste esse dado em estado orientado a notificacao.
  - `src/integrations/git-client.ts` executa commit/push e valida sincronismo, mas nao retorna hash de commit nem metadado de push consumivel por notificacao.
  - `src/types/state.ts` define estado geral do runner (`phase`, `lastMessage`, `updatedAt`) sem estrutura de "ultimo evento notificado".
  - `src/integrations/telegram-bot.ts` em `/status` exibe snapshot interno atual, sem referencia explicita ao ultimo resumo enviado ao chat.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e contratos de tipos

## Expected behavior
- Resumo final de sucesso contem, no minimo, ticket, status, fase final, timestamp UTC, referencia de plano e identificador de commit/push.
- `/status` exibe estado coerente com o ultimo evento de notificacao emitido para o chat autorizado.
- Testes automatizados garantem esses contratos de rastreabilidade/coerencia.

## Reproduction steps
1. Ler `src/core/runner.ts` e verificar que `runStage` registra `execPlanPath` apenas em log.
2. Ler `src/integrations/git-client.ts` e verificar ausencia de retorno de hash/resultado de push em `commitTicketClosure`/`assertSyncedWithRemote`.
3. Ler `src/integrations/telegram-bot.ts` e `src/types/state.ts` para confirmar que `/status` nao referencia evento notificado.

## Evidence
- `src/core/runner.ts`: `runStage` retorna resultado e apenas loga `execPlanPath`; nao ha snapshot de notificacao final.
- `src/integrations/git-client.ts`: interface `GitVersioning` exposta sem retorno de metadados de commit/push.
- `src/types/state.ts`: `RunnerState` sem campo para ultimo evento notificado.
- `src/integrations/telegram-bot.ts`: `/status` monta resposta a partir de `RunnerState` generico.

## Impact assessment
- Impacto funcional: medio, RF-03 e CA-05 sem cobertura confiavel.
- Impacto operacional: medio, reduz auditabilidade de fechamento por ticket e pode gerar divergencia entre mensagem enviada e `/status`.
- Risco de regressao: medio, envolve evolucao de contratos entre runner, git e Telegram.
- Scope estimado (quais fluxos podem ser afetados): tipos de estado, runner, integracao git, integracao Telegram e suites de teste associadas.

## Initial hypotheses (optional)
- Contratos atuais foram desenhados para validacao de fluxo, nao para exposicao de metadados de rastreabilidade em notificacao ao operador.

## Proposed solution (optional)
- Introduzir modelo de evento final por ticket com campos obrigatorios da spec.
- Evoluir integracao git para expor identificador de commit/push necessario ao resumo.
- Ajustar `/status` para refletir ultimo evento notificado e adicionar testes de contrato.

## Closure criteria
- Contrato de notificacao final inclui artefato de plano e identificador de commit/push em sucesso.
- `/status` apresenta estado coerente com o ultimo evento notificado ao chat autorizado.
- Testes automatizados cobrem CA-03 e CA-05 com cenarios de sucesso e falha.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec de notificacao de status por ticket no Telegram.
- 2026-02-19 - Ticket encerrado apos implementar rastreabilidade avancada no resumo final e coerencia de `/status` com o ultimo evento notificado, com cobertura automatizada.

## Closure
- Closed at (UTC): 2026-02-19 15:10Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - Commit: definido no commit de fechamento deste ticket (mesmo commit do move `tickets/open` -> `tickets/closed`)
  - ExecPlan: execplans/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md
