# [TICKET] Contrato de medicao temporal por fase e por fluxo no runner

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-05 02:01Z
- Reporter: mapita
- Owner: a definir
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (diagnostico estatico)
  - Response file: N/A (diagnostico estatico)
  - Log file: N/A (evidencias por leitura de codigo e testes)
- Related docs/execplans:
  - docs/specs/2026-03-05-medicao-de-tempo-por-prompt-fase-na-execucao-de-tickets-e-specs.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P0
- Justificativa objetiva (evidencias e impacto): o runner ja mede duracao em log por etapa, mas nao possui contrato estruturado de tempos por fase/fluxo para alimentar resumos finais e falhas parciais.

## Context
- Workflow area: `src/core/runner.ts` (execucao de `run-ticket`, `run-all` e `run_specs`).
- Scenario: a medicao atual fica dispersa em logs (`durationMs`) sem payload estruturado reutilizavel pelos resumos finais.
- Input constraints: manter fluxo sequencial, sem paralelizacao de tickets.

## Problem statement
A base de medicao temporal existe apenas como log pontual por etapa/rodada, sem um contrato unico no runner para transportar tempos por fase e tempo total dos fluxos. Isso impede atender a spec de forma deterministica em resumo final (especialmente em falha com dados parciais).

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts:3656-3677` mede duracao de etapa de ticket e registra apenas em log.
  - `src/core/runner.ts:3688-3703` mede duracao de etapa de spec e registra apenas em log.
  - `src/core/runner.ts:3526-3560` monta `TicketFinalSummary` sem campos de tempo por fase/total.
  - `src/core/runner.ts:76-82` define evento de milestone de `/run_specs` sem estrutura de tempos.
  - `src/types/ticket-final-summary.ts:11-32` nao possui contrato para duracoes.
- Frequencia (unico, recorrente, intermitente): recorrente.
- Como foi detectado (warning/log/test/assert): leitura de codigo + testes que validam payload atual sem tempos (`src/core/runner.test.ts:573-583`, `src/integrations/telegram-bot.test.ts:1278-1305`).

## Expected behavior
O runner deve produzir e transportar um snapshot temporal estruturado por fase e total para cada fluxo alvo (`run-ticket`, `run-all`, `run_specs`), inclusive quando houver falha intermediaria, preservando as medicoes ja coletadas.

## Reproduction steps
1. Executar o fluxo de ticket (`/run_ticket`) e observar logs com `durationMs` por etapa.
2. Verificar o objeto de resumo final emitido (`TicketFinalSummary`): nao ha tempos por fase nem total.
3. Executar `/run_specs` e verificar milestone final: nao ha tempos no payload/evento.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Etapa concluida no runner` com `durationMs` por fase.
  - `Etapa de spec concluida no runner` com `durationMs` por fase.
- Warnings/codes relevantes:
  - Ausencia de campos de duracao em contratos (`TicketFinalSummary`, `RunSpecsTriageLifecycleEvent`).
- Comparativo antes/depois (se houver):
  - Antes: apenas log ad-hoc por etapa.
  - Depois (esperado): contrato temporal estruturado reaproveitavel no resumo final.

## Impact assessment
- Impacto funcional: bloqueia atendimento objetivo de RF-04/RF-05/RF-06 da spec.
- Impacto operacional: baixa rastreabilidade de gargalos e de falhas parciais no fechamento dos fluxos.
- Risco de regressao: medio/alto (altera contratos entre `runner`, tipos e integracoes).
- Scope estimado (quais fluxos podem ser afetados): `run-ticket`, `run-all`, `run_specs`, estado do runner e testes de contrato.

## Initial hypotheses (optional)
- Falta uma estrutura unica de coleta/merge de tempos por fase dentro do runner.
- O contrato atual foi desenhado para resumo funcional (status/stage), sem telemetria operacional.

## Proposed solution (optional)
Introduzir contratos tipados de medicao temporal no runner (por fase + total por fluxo), incluindo payload parcial em falha, e disponibilizar esses dados para as integracoes de notificacao.

## Closure criteria
- Existe contrato tipado de tempo por fase e tempo total para os tres fluxos alvo.
- Em falha, o contrato inclui medicoes coletadas ate a interrupcao.
- Sequencialidade permanece inalterada (sem paralelizacao de tickets).
- Cobertura automatizada valida contratos de sucesso e falha com dados temporais.

## Decision log
- 2026-03-05 - Ticket aberto a partir da revisao da spec para criar fundacao tecnica de medicao temporal estruturada.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
