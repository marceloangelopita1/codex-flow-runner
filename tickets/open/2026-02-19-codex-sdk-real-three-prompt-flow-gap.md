# [TICKET] Integracao real com Codex SDK e ciclo de 3 prompts por ticket

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
- Workflow area: `src/integrations/codex-client.ts`, `src/core/runner.ts` e `src/main.ts`
- Scenario: rodada iniciada por `/run-all` para processar tickets do repositorio alvo
- Input constraints: `CODEX_API_KEY` configurada e repositorio com tickets em `tickets/open/`

## Problem statement
O fluxo atual ainda usa cliente local de MVP para gerar ExecPlan e nao executa os 3 prompts operacionais reais (`plan`, `implement`, `close-and-version`) via Codex SDK ponta a ponta.

## Observed behavior
- O que foi observado:
  - `LocalCodexTicketFlowClient` gera plano localmente e nao faz chamada ao Codex SDK real.
  - O runner chama apenas `runTicketFlow(ticket)` uma vez por ticket, sem fronteira operacional real entre os 3 prompts.
  - O bootstrap injeta explicitamente o cliente local no fluxo principal.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo contra RFs da spec

## Expected behavior
Cada ticket deve executar, em ordem, os prompts `plan`, `implement` e `close-and-version` usando integracao real com Codex SDK, com evidencias de sucesso/falha por etapa antes de avancar para o proximo ticket.

## Reproduction steps
1. Ler `src/integrations/codex-client.ts` e verificar que a implementacao atual e apenas local.
2. Ler `src/core/runner.ts` e confirmar chamada unica de `runTicketFlow`.
3. Ler `src/main.ts` e confirmar injecao de `LocalCodexTicketFlowClient`.

## Evidence
- `src/integrations/codex-client.ts:11`
- `src/integrations/codex-client.ts:15`
- `src/integrations/codex-client.ts:21`
- `src/core/runner.ts:82`
- `src/core/runner.ts:83`
- `src/main.ts:4`
- `src/main.ts:14`

## Impact assessment
- Impacto funcional: alto, pois RF-02 e RF-03 nao sao atendidos no fluxo principal.
- Impacto operacional: alto, porque a rodada reporta progresso sem executar o contrato real do produto.
- Risco de regressao: alto, integracao com SDK externo altera contrato de execucao e tratamento de erro.
- Scope estimado (quais fluxos podem ser afetados): orquestracao do runner, integracao Codex, telemetria por fase e rastreabilidade por ticket.

## Initial hypotheses (optional)
- O MVP priorizou fluxo local para viabilizar ciclo inicial sem dependencia externa.

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao sera detalhado em ExecPlan.

## Closure criteria
- Cliente de integracao real com Codex SDK implementado e conectado ao bootstrap.
- Fluxo por ticket executa `plan`, `implement` e `close-and-version` com rastreabilidade por etapa.
- Falhas do SDK sao propagadas com contexto suficiente para triagem do ticket.
- Spec atualizada com evidencias (ticket, execplan, commit) apos entrega.

## Decision log
- 2026-02-19 - Ticket aberto apos revisao de gaps da spec `2026-02-19-guiadomus-codex-sdk-ticket-execution`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
