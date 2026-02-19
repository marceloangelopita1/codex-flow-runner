# [TICKET] Fila de /run-all ignora prioridade do ticket e documentacao nao define ordenacao por prioridade

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-19 18:33Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - INTERNAL_TICKETS.md
  - README.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md

## Context
- Workflow area: `src/integrations/ticket-queue.ts` e documentacao operacional de tickets
- Scenario: rodada `/run-all` com mais de um ticket aberto em `tickets/open/`
- Input constraints: manter fluxo sequencial, sem paralelizacao de tickets

## Problem statement
A fila de tickets atualmente escolhe o proximo item apenas por ordem alfabetica de nome de arquivo, sem considerar o campo `Priority` (`P0`, `P1`, `P2`) presente no ticket. A documentacao tambem nao deixa explicita a regra de ordenacao por prioridade quando varios tickets sao criados.

## Observed behavior
- O que foi observado:
  - `nextOpenTicket()` filtra arquivos Markdown e escolhe o primeiro apos `localeCompare`.
  - Nao existe leitura de metadata `Priority` para ordenar a fila.
  - Nao ha regra explicita em docs dizendo que `P0` deve ser executado antes de `P1` e `P2`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e fluxos de prompt/documentacao

## Expected behavior
- A selecao do proximo ticket em `/run-all` deve priorizar `P0` (mais urgente), depois `P1`, depois `P2`.
- Quando houver mais de um ticket com a mesma prioridade, a ordem entre eles pode ser qualquer.
- A documentacao deve registrar claramente essa regra para criacao/triagem de backlog.

## Reproduction steps
1. Criar ao menos dois tickets em `tickets/open/` com prioridades diferentes no metadata.
2. Ler `src/integrations/ticket-queue.ts` e verificar que a selecao atual nao interpreta `Priority`.
3. Confirmar ausencia de regra explicita de ordenacao por prioridade em docs operacionais do fluxo.

## Evidence
- `src/integrations/ticket-queue.ts:44`
- `src/integrations/ticket-queue.ts:46`
- `src/integrations/ticket-queue.ts:48`
- `INTERNAL_TICKETS.md:44`

## Impact assessment
- Impacto funcional: medio, pois a fila pode processar ticket menos urgente antes de ticket critico.
- Impacto operacional: medio, com risco de atraso na resposta a itens P0.
- Risco de regressao: medio, envolve mudanca de criterio de ordenacao na fila e atualizacao de testes.
- Scope estimado (quais fluxos podem ser afetados): selecao de ticket no runner, documentacao operacional, prompts de abertura/triagem.

## Initial hypotheses (optional)
- A ordenacao alfabetica foi adotada inicialmente por simplicidade e ainda nao evoluiu para criterio de prioridade.

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao sera detalhado em ExecPlan.

## Closure criteria
- `FileSystemTicketQueue.nextOpenTicket()` passa a priorizar ticket por `Priority` (`P0` > `P1` > `P2`).
- Em empate de prioridade, ordem entre tickets empatados e nao deterministica/indiferente para o contrato funcional.
- Testes automatizados cobrindo: prioridade diferente e empate de prioridade.
- Documentacao operacional atualizada com regra explicita de ordenacao por prioridade e desempate.

## Decision log
- 2026-02-19 - Ticket aberto para formalizar melhoria de priorizacao de execucao por `Priority` e alinhamento de documentacao.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
