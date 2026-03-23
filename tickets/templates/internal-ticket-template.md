# [TICKET] <titulo-curto-do-problema>

Para ticket automatico de retrospectiva sistemica, use titulo orientado ao problema principal do workflow; nao use a spec de origem como sujeito do ticket, salvo para desambiguar.

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): YYYY-MM-DD HH:MMZ
- Reporter:
- Owner:
- Source: local-run | automated-test | external-test | production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable):
- Active project (when applicable):
- Target repository (when applicable):
- Request ID:
- Source spec (when applicable):
- Source spec canonical path (when applicable):
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable):
- Inherited assumptions/defaults (when applicable):
- Inherited RNFs (when applicable):
- Inherited technical/documentary constraints (when applicable):
- Inherited pending/manual validations (when applicable):
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): spec | ticket | execplan | execution | validation | systemic-instruction | external/manual
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only): local | generic-repository-instruction
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao | sim
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto):

## Context
- Workflow area:
- Scenario:
- Input constraints:

Para tickets automaticos de retrospectiva sistemica, mantenha apenas o contexto filtrado necessario para remediacao; nao replique a spec inteira nem o trace bruto.

## Problem statement
Descreva o problema objetivamente, sem propor solucao obrigatoriamente.

## Observed behavior
- O que foi observado:
- Frequencia (unico, recorrente, intermitente):
- Como foi detectado (warning/log/test/assert):

## Expected behavior
Descreva o comportamento esperado para o mesmo contexto. No caso automatico de retrospectiva sistemica, esse texto deve ser executavel por outra IA sem releitura externa.

## Reproduction steps
1. 
2. 
3. 

## Evidence
- Logs relevantes (trechos curtos e redigidos):
- Warnings/codes relevantes:
- Comparativo antes/depois (se houver):

## Impact assessment
- Impacto funcional:
- Impacto operacional:
- Risco de regressao:
- Scope estimado (quais fluxos podem ser afetados):

## Initial hypotheses (optional)
- 

## Proposed solution (optional)
Nao obrigatorio. Preencher somente se houver direcao clara. Para ticket automatico de retrospectiva sistemica, quando houver direcao concreta, nomeie as superficies de workflow/documentacao que precisam mudar.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket. Para ticket automatico de retrospectiva sistemica, prefira criterios por superficie afetada e evite usar "nao recorrencia" como criterio unico.
- Requisito/RF/CA coberto:
- Evidencia observavel:

## Decision log
- YYYY-MM-DD - <decisao> - <motivo/impacto>

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
