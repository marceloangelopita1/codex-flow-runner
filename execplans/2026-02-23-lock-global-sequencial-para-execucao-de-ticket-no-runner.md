# ExecPlan - Lock global sequencial para execucao de ticket no runner

## Purpose / Big Picture
- Objetivo: garantir lock global para execucao de tickets no `TicketRunner`, limitando a no maximo 1 ticket em processamento por vez em toda a instancia.
- Resultado esperado:
  - `requestRunAll` e `requestRunSpecs` nao iniciam em paralelo, mesmo em projetos distintos.
  - a resposta de bloqueio exposta para Telegram fica clara, tipada e acionavel.
  - o estado exposto pelo runner passa a refletir explicitamente a capacidade global de execucao de tickets (`1`).
  - sessoes interativas nao-ticket (`/plan_spec` e `/codex_chat`) mantem comportamento atual com regra explicita/documentada.
- Escopo:
  - ajustar admissao de fluxos de ticket no core (`src/core/runner.ts`) para aplicar lock global.
  - ajustar tipos/estado observavel do runner (`src/types/state.ts`) para representar lock global de ticket.
  - atualizar mensagens/status na integracao Telegram quando necessario (`src/integrations/telegram-bot.ts`).
  - atualizar testes de concorrencia e contratos (`src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`).
  - atualizar rastreabilidade da spec de origem (`docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`).
- Fora de escopo:
  - implementar o fluxo Telegram de listagem/selecao de tickets abertos.
  - implementar a acao "Implementar este ticket" (ticket filho).
  - fechar ticket, mover arquivo para `tickets/closed/` ou fazer commit/push nesta etapa.

## Progress
- [x] 2026-02-23 17:20Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md` e referencias tecnicas/documentais.
- [x] 2026-02-23 16:33Z - Contrato de lock global de ticket definido e aplicado no core.
- [x] 2026-02-23 16:33Z - Estado/status observavel atualizado para refletir capacidade global de ticket.
- [x] 2026-02-23 16:33Z - Suite de testes de runner e Telegram ajustada para o novo contrato.
- [x] 2026-02-23 16:33Z - Spec de origem atualizada com status/evidencias do RF-11.

## Surprises & Discoveries
- 2026-02-23 17:03Z - O runner atual foi desenhado para multi-slot global (`RUNNER_SLOT_LIMIT = 5`) com lock por projeto, nao por ticket global.
- 2026-02-23 17:05Z - Existe teste explicito aceitando `requestRunAll` paralelo entre projetos (`src/core/runner.test.ts`), o que contradiz RF-11 da spec alvo.
- 2026-02-23 17:06Z - O estado exposto em `/status` hoje mostra apenas `capacity used/limit` de slots globais, sem snapshot dedicado para lock de ticket.
- 2026-02-23 17:08Z - A mesma primitiva de reserva (`reserveSlot`) atende `run-all`, `run-specs`, `plan-spec` e `codex-chat`; mudanca mal delimitada pode regredir sessoes nao-ticket.

## Decision Log
- 2026-02-23 - Decisao: implementar lock global dedicado para fluxos de ticket, sem reduzir a capacidade global de slots para `1`.
  - Motivo: reduzir risco de regressao em fluxos nao-ticket e manter arquitetura multi-slot onde necessario.
  - Impacto: `run-all`/`run-specs` passam a compartilhar exclusao mutua global de ticket.
- 2026-02-23 - Decisao: introduzir motivo de bloqueio explicito para lock global de ticket no contrato de resposta.
  - Motivo: garantir feedback consistente e observavel para camada Telegram.
  - Impacto: tipos de retorno, asserts de testes e logs precisam ser atualizados.
- 2026-02-23 - Decisao: expor snapshot dedicado de capacidade de ticket no estado do runner.
  - Motivo: atender criterio de "estado/capacidade refletindo sequencialidade global de tickets" sem perder visao de capacidade global de slots.
  - Impacto: `RunnerState`, `buildStatusReply` e testes de status precisam evoluir.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada.
- O que funcionou:
  - lock global de ticket foi aplicado sem reduzir capacidade global de slots nao-ticket.
  - snapshot `ticketCapacity` tornou o estado observavel do lock global explicito no runner e no `/status`.
  - cobertura automatizada confirmou bloqueio global entre projetos e preservacao de fluxos nao-ticket.
- O que ficou pendente:
  - nenhuma pendencia tecnica deste escopo.
- Proximos passos:
  - seguir com os tickets filhos de UX/acao manual da spec (`Tickets abertos` e `Implementar este ticket`).

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-02-23-lock-global-sequencial-para-execucao-de-ticket-no-runner.md`
  - `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`
  - `src/core/runner.ts`
  - `src/types/state.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Fluxo atual relevante:
  - `requestRunAll` e `requestRunSpecs` chamam `prepareRunSlotStart`, que reserva slot por projeto em `reserveSlot`.
  - `reserveSlot` bloqueia apenas mesmo projeto e excesso de capacidade global (`5`), permitindo paralelismo entre projetos.
  - `syncStateFromSlots` publica `capacity` e `activeSlots`, mas sem indicador dedicado da capacidade global de ticket.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript, sem novas dependencias.
  - preservar comportamento de sessoes interativas nao-ticket com regra explicita.
  - manter rastreabilidade com ticket/spec e registrar fechamento no ciclo de entrega.
- Termos usados neste plano:
  - lock global de ticket: exclusao mutua para fluxos que processam ticket (`run-all`, `run-specs` e API publica futura de ticket unitario).
  - capacidade global de slots: total de slots ativos na instancia (base da observabilidade multi-runner ja existente).

## Plan of Work
- Milestone 1 - Contrato de lock global de ticket no core
  - Entregavel: `requestRunAll`/`requestRunSpecs` passam a bloquear quando qualquer fluxo de ticket ja estiver ativo globalmente.
  - Evidencia de conclusao: testes de concorrencia mostram segundo start bloqueado em projeto distinto com motivo explicito.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2 - Estado observavel alinhado ao RF-11
  - Entregavel: `RunnerState` expoe snapshot dedicado de capacidade global de ticket (limite `1`) e lock ativo/inativo.
  - Evidencia de conclusao: `/status` e testes associados mostram estado coerente entre capacidade de slots e capacidade de ticket.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Mensagens e taxonomy de bloqueio para Telegram
  - Entregavel: camada Telegram recebe motivo/mensagem clara quando lock global de ticket negar inicio.
  - Evidencia de conclusao: testes de comandos/callbacks validam resposta de bloqueio funcional e log coerente.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Regressao controlada de fluxos nao-ticket
  - Entregavel: convivencia de `/plan_spec` e `/codex_chat` com a nova regra fica coberta por testes, sem regressao de contratos existentes.
  - Evidencia de conclusao: cenarios de sessao interativa continuam verdes com regra explicita.
  - Arquivos esperados: `src/core/runner.test.ts` (e `src/integrations/telegram-bot.test.ts` se houver ajuste textual de status).
- Milestone 5 - Rastreabilidade da spec de origem
  - Entregavel: matriz RF/CA da spec atualizada para refletir atendimento de RF-11 e criterios relacionados apos validacao.
  - Evidencia de conclusao: secao "Status de atendimento" e historico de atualizacao da spec com links de evidencia.
  - Arquivos esperados: `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RUNNER_SLOT_LIMIT|reserveSlot\\(|prepareRunSlotStart|syncStateFromSlots|RunnerRequestBlockedReason" src/core/runner.ts src/types/state.ts` para mapear pontos de admissao e estado impactados.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para introduzir predicado de fluxo de ticket e guarda de lock global antes de aceitar novo `run-all`/`run-specs`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir tipos de bloqueio em `src/core/runner.ts` para incluir motivo explicito de lock global de ticket e mensagem com contexto do fluxo ativo.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/types/state.ts` (e `createInitialState`) para incluir snapshot observavel da capacidade de ticket global (limite `1`, usado `0/1`).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `syncStateFromSlots` e `getState` em `src/core/runner.ts` para preencher/clonar corretamente o novo snapshot de ticket.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts` para exibir o novo snapshot no `/status` e manter resposta clara para bloqueio de inicio.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts`:
   - reescrever o caso que aceita paralelismo entre projetos para esperar bloqueio global de ticket;
   - adicionar/ajustar asserts de motivo tipado e mensagem de bloqueio;
   - manter cobertura de convivencia com `/plan_spec` e `/codex_chat`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para refletir eventuais mudancas de status/mensagem e novo snapshot exibido no `/status`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para validar contrato de lock global de ticket e nao-regressao principal do runner.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para validar mensagens/status no bot.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para garantir consistencia de tipos e build.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md` na matriz RF/CA e historico, com evidencia do RF-11 entregue.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/types/state.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: nenhum teste aceitando paralelismo de ticket entre projetos; novos asserts comprovam bloqueio global com motivo claro.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: respostas de bloqueio para `/run_all` e `/run_specs` permanecem acionaveis; `/status` reflete capacidade global de ticket.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build verdes apos evolucao de contratos (`RunnerState` e motivos de bloqueio).
- Comando: `rg -n "RF-11|CA-05|CA-06|CA-07|CA-08|lock global|sequencial" docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`
  - Esperado: spec registra atendimento/estado atualizado para lock global de ticket com evidencias objetivas.

## Idempotence and Recovery
- Idempotencia:
  - repetir chamada de `requestRunAll`/`requestRunSpecs` enquanto houver ticket em execucao deve sempre retornar bloqueio sem criar novo slot de ticket.
  - reexecutar testes/comandos de validacao nao deve alterar estado persistente do repositorio.
- Riscos:
  - aplicar lock global de forma ampla e bloquear indevidamente `/plan_spec` ou `/codex_chat`.
  - regressao em contratos tipados de bloqueio usados por Telegram e testes.
  - inconsistencias entre capacidade global de slots e novo snapshot de capacidade de ticket.
- Recovery / Rollback:
  - isolar a regra em helper especifico para fluxos de ticket e cobrir com testes dedicados antes de ajustar mensagens.
  - em falha de regressao nao-ticket, restaurar rapidamente a regra anterior nesse caminho e manter lock global apenas para `run-all`/`run-specs`.
  - validar diff final por arquivo para garantir ausencia de alteracoes fora do escopo deste ticket.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-23-lock-global-sequencial-para-execucao-de-ticket-no-runner.md`.
- Ticket dependente relevante: `tickets/open/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`.
- Spec de origem: `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`.
- Validacoes executadas:
  - `npx tsx --test src/core/runner.test.ts` (57 testes, 57 pass).
  - `npx tsx --test src/integrations/telegram-bot.test.ts` (89 testes, 89 pass).
  - `npm run check && npm run build` (tipagem e build verdes).
- Referencias primarias de evidencia:
  - `src/core/runner.ts`
  - `src/types/state.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
- Evidencias consolidadas ao final da execucao:
  - diff com lock global de ticket no core e motivo de bloqueio tipado.
  - testes runner/Telegram verdes, incluindo cenarios de lock global.
  - spec atualizada com status de RF-11 como atendido.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunAllRequestResult` e `RunSpecsRequestResult` (motivo tipado adicional para lock global de ticket).
  - `RunnerState` (novo snapshot de capacidade/lock global de ticket).
  - `buildStatusReply` e logs de bloqueio na integracao Telegram.
- Compatibilidade:
  - comportamento muda de "paralelismo entre projetos" para "sequencial global de ticket" por requisito funcional.
  - sessoes nao-ticket devem permanecer operacionais com regra explicita e cobertura de regressao.
- Dependencias externas e mocks:
  - sem novas dependencias.
  - reaproveitar doubles e helpers existentes em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`.
