# ExecPlan - Concorrencia de runs por projeto sem ticket lock global

## Purpose / Big Picture
- Objetivo: remover o lock global de ticket na admissao de runs, restaurando concorrencia por projeto para `/run_all` e `/run_specs` (e mantendo semantica consistente para `/run_ticket`), sem quebrar sequencialidade intra-projeto.
- Resultado esperado:
  - run ativo em `alpha-project` nao bloqueia inicio de run em `beta-project` quando houver capacidade global.
  - segundo run no mesmo projeto continua bloqueado por `project-slot-busy`.
  - bloqueio por capacidade global usa taxonomia `runner-capacity-maxed` em vez de `runner-capacity-full`.
  - `/status` permanece coerente com slots ativos por projeto e nao reforca lock global de ticket legado.
- Escopo:
  - ajustar contratos e logica de admissao em `src/core/runner.ts` (`reserveSlot`, tipos de bloqueio e mensagens).
  - alinhar snapshot de estado em `src/types/state.ts` e `src/core/runner.ts` para remover semantica de lock global de ticket.
  - ajustar resposta de status e contratos de testes em `src/integrations/telegram-bot.ts` e testes associados.
  - atualizar cobertura automatizada em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`.
  - atualizar rastreabilidade na spec de origem (`docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`).
- Fora de escopo:
  - implementar lock global unico de texto livre (`global-free-text-busy`) entre `/plan_spec` e `/codex_chat` (ticket dedicado P1).
  - alterar limite numerico global de runners (`RUNNER_SLOT_LIMIT`).
  - paralelizar tickets dentro do mesmo projeto.
  - fechar ticket, mover para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-02-27 04:23Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, specs e referencias de codigo/testes.
- [x] 2026-02-27 04:27Z - Contrato de concorrencia por projeto implementado no core do runner.
- [x] 2026-02-27 04:28Z - Taxonomia de bloqueio de capacidade alinhada para `runner-capacity-maxed`.
- [x] 2026-02-27 04:30Z - Estado `/status` e testes atualizados sem lock global de ticket legado.
- [x] 2026-02-27 04:34Z - Validacao final (tests + check + build) concluida e evidenciada.

## Surprises & Discoveries
- 2026-02-27 04:23Z - `reserveSlot` ainda aplica lock global via `getActiveTicketSlot`, retornando `ticket-lock-active` para projetos distintos.
- 2026-02-27 04:23Z - `RunnerState` ainda publica `ticketCapacity` com `limit: 1` e `isLocked`, e `/status` renderiza essa semantica global explicitamente.
- 2026-02-27 04:23Z - A taxonomia de capacidade permanece como `runner-capacity-full`, divergindo do contrato aprovado (`runner-capacity-maxed`).
- 2026-02-27 04:23Z - Ha cobertura de teste que hoje valida explicitamente bloqueio cross-project (`ticket-lock-active`), exigindo refatoracao coordenada de testes e mensagens.

## Decision Log
- 2026-02-27 - Decisao: aplicar politica de concorrencia por projeto para todos os tipos de run de ticket (`run-all`, `run-specs`, `run-ticket`).
  - Motivo: os tres fluxos compartilham `prepareRunSlotStart`/`reserveSlot`; manter regras diferentes aumenta risco de inconsistencias e bugs de regressao.
  - Impacto: callbacks de "Implementar este ticket" deixam de depender de `ticket-lock-active` e passam a refletir apenas bloqueios por projeto/capacidade.
- 2026-02-27 - Decisao: substituir `runner-capacity-full` por `runner-capacity-maxed` em tipos, retornos e logs.
  - Motivo: alinhar RF-10/CA-08 da spec com taxonomia acionavel unica.
  - Impacto: atualizacao de unions TypeScript, asserts e mensagens observaveis.
- 2026-02-27 - Decisao: remover o snapshot `ticketCapacity` do estado publico do runner e do `/status`.
  - Motivo: o snapshot representa lock global legado de ticket e conflita com o modelo de concorrencia por projeto.
  - Impacto: evolucao de `RunnerState`, `createInitialState`, `getState`, `syncStateFromSlots`, `buildStatusReply` e respectivos testes.
- 2026-02-27 - Decisao: manter lock global de texto livre fora deste plano.
  - Motivo: escopo rastreado no ticket dedicado `tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md`.
  - Impacto: evita mistura de escopos P0 e P1 na mesma entrega.

## Outcomes & Retrospective
- Status final: executado e validado tecnicamente.
- O que funcionou:
  - remocao coordenada do lock global de ticket no core + ajuste de contratos/tipos manteve sequencialidade por projeto sem regressao funcional.
  - cobertura automatizada foi atualizada junto com o comportamento (`runner` e `telegram-bot`) reduzindo risco de regressao em callbacks e `/status`.
  - validacao final objetiva concluiu verde:
    - `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` (`175/175`);
    - `npm test` (`269/269`);
    - `npm run check && npm run build`;
    - `rg -n "ticket-lock-active|runner-capacity-full|ticketCapacity" src/core src/types src/integrations` sem ocorrencias.
- O que ficou pendente:
  - validacao manual operacional em Telegram real para confirmar comportamento fim-a-fim em ambiente externo.
- Proximos passos:
  - concluir fechamento do ticket com move para `tickets/closed` e versionamento em commit/push dedicado do ciclo.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md`
  - `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - `src/core/runner.ts`
  - `src/types/state.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Fluxo atual relevante:
  - `requestRunAll`, `requestRunSpecs` e `requestRunSelectedTicket` entram por `prepareRunSlotStart`.
  - `prepareRunSlotStart` delega admissao para `reserveSlot`.
  - `reserveSlot` agora bloqueia por: (1) slot do mesmo projeto, (2) capacidade global; sem lock global de ticket para runs.
  - `syncStateFromSlots` atualiza `capacity` e `activeSlots`; `/status` exibe capacidade global + slots por projeto.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript sem novas dependencias.
  - preservar sequencialidade por projeto (um slot por projeto para runs).
  - manter lock global de texto livre separado do dominio de runs.
- Termos usados neste plano:
  - lock por projeto: bloqueio quando ja existe slot ativo no mesmo projeto.
  - capacidade global: limite total de slots ativos simultaneos na instancia.
  - taxonomia de bloqueio: conjunto tipado de motivos usados em retorno/logs (`project-slot-busy`, `runner-capacity-maxed`, etc.).

## Plan of Work
- Milestone 1 - Remover lock global de ticket na admissao de runs
  - Entregavel: `reserveSlot` deixa de consultar/retornar `ticket-lock-active` para fluxos de run e passa a decidir por slot do projeto + capacidade global.
  - Evidencia de conclusao: testes de concorrencia entre projetos para `/run_all` e `/run_specs` passam a iniciar em paralelo quando ha capacidade.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2 - Alinhar taxonomia de capacidade com a spec
  - Entregavel: motivo de bloqueio por limite global passa a ser `runner-capacity-maxed` em tipos, retornos e logs.
  - Evidencia de conclusao: asserts e logs usam o novo motivo; nao restam referencias runtime de `runner-capacity-full`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Atualizar estado publico e `/status` sem semantica de lock global legado
  - Entregavel: `RunnerState` e `buildStatusReply` deixam de expor `ticketCapacity` com lock global e mantem visao coerente por slots/projetos.
  - Evidencia de conclusao: `/status` continua mostrando capacidade global e slots ativos por projeto sem "capacidade de tickets (global)".
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Cobertura de regressao para runner e Telegram
  - Entregavel: testes atualizados para novo contrato de bloqueio e concorrencia por projeto, incluindo fluxo de callback de ticket unitario quando aplicavel.
  - Evidencia de conclusao: suites `runner` e `telegram-bot` verdes com cenarios cross-project e same-project validados.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Rastreabilidade da spec de origem
  - Entregavel: spec de 2026-02-27 atualizada com status dos RF/CA cobertos por este ticket.
  - Evidencia de conclusao: secao "Status de atendimento" e historico da spec registram fechamento do gap de concorrencia/taxonomia.
  - Arquivos esperados: `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "ticket-lock-active|runner-capacity-full|reserveSlot\\(|getActiveTicketSlot|ticketCapacity" src/core/runner.ts src/types/state.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para mapear pontos de contrato e cobertura.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para remover `ticket-lock-active` de `RunnerRequestBlockedReason` e encerrar o gate global em `reserveSlot`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para substituir `runner-capacity-full` por `runner-capacity-maxed` em unions, retornos e logs relacionados.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para remover helpers legados de lock global de ticket (`getActiveTicketSlot`, mensagem de lock global) e ajustar qualquer mapeamento residual em `startPlanSpecSession`/`startCodexChatSession`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/state.ts` para remover `RunnerTicketCapacitySnapshot` e o campo `ticketCapacity` de `RunnerState`/`createInitialState`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para atualizar `getState` e `syncStateFromSlots` conforme o novo contrato de estado sem `ticketCapacity`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para ajustar `buildStatusReply`, removendo linha de capacidade global de ticket legado e preservando leitura de slots por projeto.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts` para reescrever cenarios que hoje esperam `ticket-lock-active` em projetos distintos, cobrindo aceite CA-01/CA-02 e novo motivo de capacidade.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.test.ts` para alinhar fixtures de `RunnerState`, respostas bloqueadas e snapshot de `/status` ao contrato novo.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada de concorrencia, taxonomia e status Telegram.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build apos evolucao de interfaces.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md` atualizando matriz de atendimento, pendencias e historico da entrega.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/types/state.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md` para auditoria final do escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cenarios de `/run_all` e `/run_specs` em projetos diferentes iniciam sem `ticket-lock-active`; conflitos no mesmo projeto seguem com `project-slot-busy`.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: respostas e status do bot refletem novo contrato de bloqueio/capacidade sem dependencias de `ticketCapacity` legado.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao em comandos Telegram, callbacks e ciclo de runner.
- Comando: `npm run check && npm run build`
  - Esperado: tipos e build sem erros apos mudancas de union e `RunnerState`.
- Comando: `rg -n "ticket-lock-active|runner-capacity-full|ticketCapacity" src/core src/types src/integrations`
  - Esperado: nenhuma ocorrencia runtime residual no dominio de run/status (eventuais ocorrencias devem permanecer apenas em historico/documentacao quando inevitavel).
- Comando: `rg -n "runner-capacity-maxed|project-slot-busy" src/core/runner.ts src/core/runner.test.ts`
  - Esperado: taxonomia de bloqueio alinhada e coberta por testes.
- Criterios de aceite cobertos:
  - CA-01 e CA-02 da spec atendidos para concorrencia por projeto em runs.
  - bloqueio `ticket-lock-active` nao e mais usado para conflitos entre projetos em `/run_all` e `/run_specs`.
  - taxonomia de capacidade alinhada para `runner-capacity-maxed`.
  - `/status` permanece coerente com slots ativos por projeto apos a mudanca.

## Idempotence and Recovery
- Idempotencia:
  - repetir comandos de run no mesmo projeto deve continuar retornando `project-slot-busy` sem criar novo slot.
  - reexecutar suites de teste e comandos de validacao nao deve gerar efeitos colaterais no repositorio alem dos arquivos alterados.
- Riscos:
  - remover lock global sem ajustar todos os caminhos pode permitir corrida nao coberta em `run-ticket`.
  - mudanca de `RunnerState` pode quebrar fixtures utilitarias de teste e contratos de status.
  - renomear motivo de capacidade sem cobertura completa pode deixar divergencia entre runner e Telegram.
- Recovery / Rollback:
  - se houver regressao critica de concorrencia, restaurar temporariamente guarda anterior em `reserveSlot` enquanto os testes faltantes sao adicionados.
  - se regressao ocorrer apenas na interface de status, manter core novo e aplicar correcoes incrementais em `buildStatusReply`/fixtures.
  - em falha de tipagem ampla por remocao de `ticketCapacity`, aplicar migracao em duas fases: deprecar campo primeiro (read-only) e remover no passo seguinte.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md`.
- Referencias obrigatorias consumidas no planejamento:
  - `PLANS.md`
  - `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/state.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Ticket correlato (nao escopo deste plano): `tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md`.
- Evidencias coletadas ao final da execucao:
  - diff do escopo com remocao de lock global de ticket para runs e migracao para `runner-capacity-maxed`.
  - suites verdes (`npx tsx --test ...`, `npm test`) e validacao de tipagem/build (`npm run check && npm run build`).
  - spec atualizada com status de atendimento dos RF/CA impactados.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunnerRequestBlockedReason` (remocao de `ticket-lock-active`, troca para `runner-capacity-maxed`).
  - `RunAllRequestResult`, `RunSpecsRequestResult` e `RunSelectedTicketRequestResult` (motivos bloqueados refletindo novo contrato).
  - `RunnerState` (remocao de `ticketCapacity` e adaptacoes de consumidores).
- Compatibilidade:
  - comportamento muda de lock global de ticket para concorrencia por projeto nos comandos de run.
  - comandos/aliases existentes permanecem os mesmos; muda apenas semantica de bloqueio.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime.
  - testes continuam usando stubs existentes de Codex/Git/Telegram.
  - lock global de texto livre continua dependente do ticket dedicado, sem mudanca neste plano.
