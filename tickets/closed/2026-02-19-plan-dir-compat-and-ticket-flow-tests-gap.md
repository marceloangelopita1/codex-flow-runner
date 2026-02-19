# [TICKET] Compatibilidade plans/execplans e cobertura de testes do fluxo de tickets

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
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
  - execplans/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md

## Context
- Workflow area: `src/integrations/ticket-queue.ts`, `src/integrations/codex-client.ts` e estrategia de testes
- Scenario: execucao do runner em repositorios com convencoes diferentes de pasta de plano
- Input constraints: repositorio alvo pode usar `plans/` ou `execplans/`

## Problem statement
O fluxo atual assume apenas `execplans/` e nao cobre os cenarios da spec para `plans/`. Alem disso, nao existe cobertura automatizada de integracao/contrato para o ciclo principal de tickets.

## Observed behavior
- O que foi observado:
  - Estrutura criada pelo queue inclui somente `execplans/`.
  - Cliente local escreve artefatos de plano somente em `execplans/`.
  - Suite de testes atual cobre apenas regras de autorizacao do bot Telegram.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e inventario de testes

## Expected behavior
- Runner deve operar sem quebra em repositorios que usem `plans/` ou `execplans/`, sem migracao manual previa.
- Testes de integracao/contrato devem cobrir o fluxo de processamento sequencial de tickets e os principais cenarios de sucesso/falha.

## Reproduction steps
1. Ler `src/integrations/ticket-queue.ts` e verificar criacao de estrutura de plano.
2. Ler `src/integrations/codex-client.ts` e verificar path hardcoded para `execplans/`.
3. Listar testes existentes em `src/` e confirmar ausencia de testes de integracao do runner.

## Evidence
- `src/integrations/ticket-queue.ts:29`
- `src/integrations/codex-client.ts:24`
- `src/integrations/codex-client.ts:31`
- `src/integrations/telegram-bot.test.ts:1`

## Impact assessment
- Impacto funcional: medio, com quebra potencial em repositorios que adotam `plans/`.
- Impacto operacional: medio, pois reduz confianca de rollout sem testes do fluxo principal.
- Risco de regressao: medio, alteracoes no fluxo podem degradar comportamento sem deteccao automatizada.
- Scope estimado (quais fluxos podem ser afetados): resolucao de diretorio de planos, geracao de artefatos e robustez geral do runner.

## Initial hypotheses (optional)
- O MVP assumiu convencao unica (`execplans/`) e priorizou testes do controle Telegram.

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao sera detalhado em ExecPlan.

## Closure criteria
- Resolucao de diretorio de plano suportando `plans/` e `execplans/` validada.
- Fluxo principal coberto por testes de integracao/contrato para cenarios de sucesso e falha.
- Spec atualizada com evidencias (ticket, execplan, commit) apos entrega.

## Decision log
- 2026-02-19 - Ticket aberto apos revisao de gaps da spec `2026-02-19-guiadomus-codex-sdk-ticket-execution`.

## Closure
- Closed at (UTC): 2026-02-19 12:30Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
