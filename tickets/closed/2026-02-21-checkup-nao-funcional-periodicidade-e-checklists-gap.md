# [TICKET] Check-up nao funcional sem periodicidade e checklist base dos 5 eixos

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-21 08:42Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md
  - execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md
  - SPECS.md
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md

## Context
- Workflow area: governanca tecnica nao funcional e preparacao de backlog de refatoracoes criticas.
- Scenario: spec aprovada exige rito periodico e checklist objetivo por eixo antes da derivacao de backlog.
- Input constraints: manter fluxo sequencial e rastreabilidade via tickets/execplans.

## Problem statement
A spec define requisitos para um check-up tecnico nao funcional recorrente, mas o repositorio ainda nao possui artefato operacional com periodicidade minima, gatilhos extraordinarios e checklist objetivo cobrindo os cinco eixos (codigo, arquitetura, testes, observabilidade e documentacao operacional).

## Observed behavior
- O que foi observado:
  - A spec alvo define RF-01..RF-06 e CA-01 com obrigacao explicita de periodicidade e checklist por eixo.
  - Nao existe documento operacional fora da propria spec com checklist formal do check-up.
  - Nao existe definicao objetiva de gatilhos extraordinarios para antecipar nova avaliacao.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica da spec e varredura documental no repositorio

## Expected behavior
Deve existir um rito tecnico periodico documentado, com checklist verificavel dos cinco eixos e gatilhos extraordinarios claros para reavaliacao antecipada.

## Reproduction steps
1. Ler RF-01..RF-06 e CA-01 na spec alvo.
2. Buscar no repositorio artefatos de checklist operacional de check-up nao funcional.
3. Confirmar que a unica ocorrencia do conteudo esta na propria spec e nao em um guia/checklist executavel.

## Evidence
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:31`
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:36`
- `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md:48`
- `rg -n "checklist nao funcional|check-up tecnico|periodicidade minima" docs --glob '!docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md'` (sem ocorrencias)

## Impact assessment
- Impacto funcional: alto, pois sem baseline de check-up o backlog de refatoracao nasce incompleto e reativo.
- Impacto operacional: alto, aumenta risco de criterios inconsistentes entre ciclos de revisao.
- Risco de regressao: medio, envolve consolidacao de processo e possivel ajuste em docs correlatas.
- Scope estimado (quais fluxos podem ser afetados): triagem de evolucoes tecnicas, derivacao de tickets/execplans, governanca de qualidade.

## Initial hypotheses (optional)
- O projeto priorizou entrega de fluxos operacionais (runner/Telegram) e ainda nao materializou o rito de check-up transversal definido nesta spec.

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao sera detalhado em ExecPlan.

## Closure criteria
- Documento de check-up nao funcional criado/atualizado com periodicidade minima e gatilhos extraordinarios.
- Checklist objetivo publicado para os 5 eixos (RF-02..RF-06), com criterios verificaveis.
- Rastreabilidade adicionada na spec alvo para o novo artefato e para os tickets derivados.
- CA-01 apto para migrar de nao atendido para atendido/parcial com evidencia objetiva.

## Decision log
- 2026-02-21 - Gap aberto apos revisao da spec para formalizar baseline operacional do check-up nao funcional.
- 2026-02-21 - ExecPlan validado como GO; criterios de fechamento atendidos com artefato operacional publicado e rastreabilidade atualizada na spec.

## Closure
- Closed at (UTC): 2026-02-21 08:55Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md (commit: mesmo changeset de fechamento)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
