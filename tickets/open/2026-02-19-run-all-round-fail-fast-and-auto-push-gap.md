# [TICKET] Rodada /run-all nao e fail-fast e push de fechamento nao e obrigatorio

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 11:59Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md

## Context
- Workflow area: `src/core/runner.ts`, `src/integrations/git-client.ts` e `src/config/env.ts`
- Scenario: rodada iniciada por `/run-all` com multiplos tickets em `tickets/open/`
- Input constraints: fluxo sequencial com commit e push por ticket

## Problem statement
O comportamento atual nao implementa a semantica de rodada definida na spec: nao para no primeiro erro, nao encerra automaticamente quando a fila termina e o push apos commit de fechamento e opcional.

## Observed behavior
- O que foi observado:
  - Quando nao ha ticket aberto, o loop continua em polling sem encerrar a rodada.
  - Em erro de ticket, o runner registra falha, mas continua para proximo ticket no loop.
  - O push apos commit depende de `GIT_AUTO_PUSH`, que tem default `false`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo contra RFs e CAs da spec

## Expected behavior
- `/run-all` deve executar uma rodada finita: processar fila de tickets abertos e encerrar quando concluir ou falhar.
- Em erro no ticket N, os tickets seguintes nao devem executar na mesma rodada.
- Apos commit de fechamento bem-sucedido, o push deve ser executado automaticamente por ticket.

## Reproduction steps
1. Ler `src/core/runner.ts` e verificar o comportamento de `while (this.state.isRunning)`.
2. Confirmar no bloco de erro que nao existe `break` nem mudanca para interromper a rodada.
3. Ler `src/integrations/git-client.ts` e `src/config/env.ts` para confirmar condicional de push.

## Evidence
- `src/core/runner.ts:64`
- `src/core/runner.ts:73`
- `src/core/runner.ts:75`
- `src/core/runner.ts:92`
- `src/core/runner.ts:98`
- `src/integrations/git-client.ts:32`
- `src/config/env.ts:9`

## Impact assessment
- Impacto funcional: alto, com divergencia direta de RF-05/RF-06 e CA-01/CA-02/CA-03.
- Impacto operacional: alto, pois pode executar tickets apos falha e deixar push pendente sem erro explicito.
- Risco de regressao: medio-alto, altera controle de ciclo, finalizacao da rodada e versionamento remoto.
- Scope estimado (quais fluxos podem ser afetados): controle de estado do runner, observabilidade de erro e integracao de versionamento git.

## Initial hypotheses (optional)
- O loop continuo foi mantido do MVP de daemon e nao ajustado para semantica de rodada por comando.

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao sera detalhado em ExecPlan.

## Closure criteria
- Rodada `/run-all` encerra automaticamente quando a fila atual termina.
- Erro no ticket N interrompe a rodada e preserva rastreabilidade objetiva da falha.
- Push apos commit de fechamento passa a ser obrigatorio no ciclo de sucesso por ticket.
- Spec atualizada com evidencias (ticket, execplan, commit) apos entrega.

## Decision log
- 2026-02-19 - Ticket aberto apos revisao de gaps da spec `2026-02-19-guiadomus-codex-sdk-ticket-execution`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
