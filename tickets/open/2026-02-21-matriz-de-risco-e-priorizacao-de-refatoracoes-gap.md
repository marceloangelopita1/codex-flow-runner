# [TICKET] Matriz de risco e criterio de priorizacao de refatoracoes criticas ainda nao foram definidos

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-21 08:42Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md
  - INTERNAL_TICKETS.md
  - README.md
  - src/integrations/ticket-queue.ts

## Context
- Workflow area: classificacao de risco/divida tecnica e priorizacao de backlog derivado do check-up.
- Scenario: existe prioridade operacional P0/P1/P2 na fila, mas a spec exige matriz objetiva mais ampla para classificar riscos e guiar refatoracoes criticas.
- Input constraints: preservar regra atual de consumo da fila no `/run-all` (`P0` -> `P1` -> `P2`).

## Problem statement
A spec exige matriz reproduzivel para classificar risco tecnico e criterio objetivo de prioridade incluindo severidade, frequencia, custo de atraso e risco operacional. O repositorio hoje possui apenas a taxonomia geral de prioridade/severidade de tickets e ordenacao por `Priority`, sem matriz formal de decisao para backlog de refatoracao critica.

## Observed behavior
- O que foi observado:
  - A spec alvo define RF-07, RF-08, CA-02 e CA-03 com matriz e criterio objetivo.
  - `INTERNAL_TICKETS.md` define `Priority`/`Severity` e ordem de consumo da fila, mas nao define frequencia/custo de atraso nem regra de score reproduzivel.
  - `FileSystemTicketQueue` seleciona proximo ticket somente por `Priority` e desempate por nome.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao de documentacao e de implementacao da fila

## Expected behavior
Deve existir matriz de classificacao padronizada, com criterios objetivos e reproduziveis para riscos/divida tecnica, e regra documentada que converta essa classificacao em prioridade pratica de backlog (respeitando a fila sequencial atual).

## Reproduction steps
1. Ler RF-07, RF-08, CA-02 e CA-03 na spec alvo.
2. Conferir regras de prioridade/severidade atuais em `INTERNAL_TICKETS.md`.
3. Conferir `nextOpenTicket()` em `src/integrations/ticket-queue.ts` para validar que a fila consome apenas `Priority`.

## Evidence
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:37`
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:38`
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:49`
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:50`
- `INTERNAL_TICKETS.md:50`
- `INTERNAL_TICKETS.md:57`
- `src/integrations/ticket-queue.ts:50`
- `src/integrations/ticket-queue.ts:68`

## Impact assessment
- Impacto funcional: medio-alto, risco de priorizacao subjetiva em backlog de refatoracoes criticas.
- Impacto operacional: medio, possivel atraso de itens de maior custo de atraso por falta de criterio uniforme.
- Risco de regressao: medio, envolve ajuste de governanca documental e possivel evolucao de metadata.
- Scope estimado (quais fluxos podem ser afetados): abertura/triagem de tickets internos, definicao de prioridade, governanca da spec.

## Initial hypotheses (optional)
- A regra P0/P1/P2 resolveu o consumo da fila, mas nao cobre completamente a classificacao previa exigida para backlog de check-up transversal.

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao sera detalhado em ExecPlan.

## Closure criteria
- Matriz de classificacao de risco/divida tecnica publicada com dimensoes objetivas (incluindo severidade, frequencia, custo de atraso e risco operacional).
- Regra de mapeamento da matriz para prioridade de backlog (`P0`/`P1`/`P2`) documentada e exemplificada.
- Criterio aplicado em ao menos um ciclo de backlog derivado da spec alvo, com rastreabilidade.
- CA-02 e CA-03 aptos para avancar com evidencia objetiva.

## Decision log
- 2026-02-21 - Gap aberto para fechar lacuna entre prioridade operacional existente e matriz de priorizacao exigida pela spec.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
