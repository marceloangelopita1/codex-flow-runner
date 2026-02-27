# [TICKET] /run_all e /run_specs ainda usam lock global de ticket e bloqueiam projetos distintos

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-27 04:16Z
- Reporter: codex
- Owner: a definir
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (revisao estatica da spec e codigo)
  - Response file: N/A (revisao estatica da spec e codigo)
  - Log file: N/A (evidencias objetivas em codigo e testes)
- Related docs/execplans:
  - docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md
  - docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md
  - execplans/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P0
- Justificativa objetiva (evidencias e impacto): o lock global de ticket reduz throughput multi-projeto e viola CA-01, impactando consumo real da fila em `/run_all`.

## Context
- Workflow area: controle de concorrencia no `TicketRunner` para `/run_all` e `/run_specs`.
- Scenario: execucao ativa em `alpha-project` bloqueia inicio de run em `beta-project`, mesmo com capacidade global disponivel.
- Input constraints: manter sequencialidade interna por projeto e respeitar ordem de consumo P0 > P1 > P2.

## Problem statement
O runner ainda aplica lock global de ticket para slots de run (`run-all`, `run-specs`, `run-ticket`), impedindo concorrencia por projeto e contrariando o escopo aprovado na spec alvo.

## Observed behavior
- O que foi observado:
  - `reserveSlot` bloqueia qualquer segundo run quando ha `activeTicketSlot`, retornando `ticket-lock-active`.
  - estado expoe `ticketCapacity.isLocked`, reforcando lock global de tickets.
  - testes validam explicitamente bloqueio cruzado entre projetos.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert):
  - `src/core/runner.ts:3687-3695` (bloqueio por `ticket-lock-active`).
  - `src/core/runner.ts:3920-3924` (`ticketCapacity` global com `isLocked`).
  - `src/core/runner.ts:3855-3864` (mensagem "lock global de ticket ativo").
  - `src/core/runner.test.ts:1717-1773` e `1782-1834` (esperam bloqueio cross-project por lock global).

## Expected behavior
- `/run_all` e `/run_specs` devem bloquear apenas por:
  - `project-slot-busy` (mesmo projeto), ou
  - capacidade global de runners esgotada.
- Run ativo em um projeto nao deve bloquear run em projeto diferente quando houver capacidade.

## Reproduction steps
1. Iniciar `/run_all` com projeto ativo `alpha-project`.
2. Trocar projeto ativo para `beta-project`.
3. Tentar iniciar `/run_specs <spec>.md`.
4. Observar retorno `blocked` com motivo `ticket-lock-active` (comportamento atual indesejado).

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - mensagem de bloqueio: "lock global de ticket ativo por /run_all no projeto alpha-project".
- Warnings/codes relevantes:
  - motivo atual: `ticket-lock-active`.
  - motivo esperado na spec para capacidade: `runner-capacity-maxed` (hoje: `runner-capacity-full`).
- Comparativo antes/depois (se houver):
  - Antes: concorrencia entre projetos negada por lock global de ticket.
  - Depois (esperado): concorrencia liberada por projeto, mantendo sequencialidade interna.

## Impact assessment
- Impacto funcional: viola RF-01, RF-02 e RF-04 da spec alvo.
- Impacto operacional: reduz throughput real da fila e aumenta tempo de espera desnecessario.
- Risco de regressao: alto (mudanca central no modelo de lock de runs e mensagens de bloqueio).
- Scope estimado (quais fluxos podem ser afetados): `requestRunAll`, `requestRunSpecs`, `requestRunSelectedTicket`, `/status`, testes de concorrencia no runner/Telegram.

## Initial hypotheses (optional)
- O lock global foi introduzido para evitar corrida ampla, mas conflita com o requisito de concorrencia por projeto.

## Proposed solution (optional)
- Substituir lock global de ticket por controle estrito por projeto para runs, preservando limite global de runners e sequencialidade intra-projeto.

## Closure criteria
- CA-01 e CA-02 da spec alvo atendidos com testes automatizados.
- Bloqueio `ticket-lock-active` deixa de ser usado para conflitos entre projetos em `/run_all` e `/run_specs`.
- Taxonomia de capacidade alinhada para `runner-capacity-maxed` (incluindo logs/mensagens).
- `/status` permanece coerente com slots ativos por projeto apos a mudanca.

## Decision log
- 2026-02-27 - Ticket aberto a partir de revisao de gaps da spec de concorrencia por projeto.
- 2026-02-27 - Validacao do ExecPlan concluida com classificacao `GO`; entrega tecnica validada por testes, check e build.

## Closure
- Closed at (UTC): 2026-02-27 04:35Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md (commit de fechamento deste ticket)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Evidencia objetiva de aceite tecnico:
  - `rg -n "ticket-lock-active|runner-capacity-full|ticketCapacity" src/core src/types src/integrations` -> sem ocorrencias.
  - `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> pass (`175/175`).
  - `npm test` -> pass (`269/269`).
  - `npm run check && npm run build` -> pass.
- Entrega tecnica concluida:
  - lock global de ticket removido da admissao de runs (`run-all`, `run-specs`, `run-ticket`) em favor de bloqueio por projeto/capacidade global.
  - taxonomia de capacidade global alinhada para `runner-capacity-maxed` no core e nos contratos de teste.
  - estado publico do runner e `/status` atualizados sem `ticketCapacity` legado.
  - rastreabilidade da spec de origem atualizada com matriz RF/CA e historico da entrega.
- Validacao manual externa ainda necessaria:
  - Entrega tecnica concluida: sim; pendencia remanescente e apenas operacional em ambiente Telegram real.
  - Objetivo: confirmar no chat real o comportamento de concorrencia entre projetos e a renderizacao de `/status` apos a mudanca.
  - Como executar:
    1. iniciar o bot no ambiente real com chat autorizado e garantir capacidade global disponivel;
    2. iniciar `/run_all` no projeto `alpha-project`;
    3. trocar para `beta-project` e iniciar `/run_specs <spec-elegivel.md>`, confirmando inicio sem bloqueio global;
    4. executar `/status` e validar ausencia de "Capacidade de tickets (global)" com slots ativos por projeto coerentes.
  - Responsavel operacional: operador do bot Telegram em ambiente real (mapita/time de operacao).
