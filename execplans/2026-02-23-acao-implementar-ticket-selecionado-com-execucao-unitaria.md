# ExecPlan - Acao "Implementar este ticket" com execucao unitaria do ticket selecionado

## Purpose / Big Picture
- Objetivo: fechar o gap do ticket `tickets/open/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`, expondo no runner uma API publica para executar somente um ticket escolhido no Telegram.
- Resultado esperado:
  - a acao "Implementar este ticket" dispara apenas o ticket selecionado, sem chamar `nextOpenTicket()` nem varrer backlog.
  - o lock global de ticket continua valendo (maximo de 1 ticket em execucao por vez na instancia).
  - inexistencia/remocao do ticket entre selecao e execucao retorna erro funcional claro.
  - logs e estado do runner refletem marcos da execucao manual (tentativa, lock, inicio, plan, implement, close-and-version, sucesso/falha).
  - a regra de fechamento permanece via pipeline padrao (`plan -> implement -> close-and-version`), preservando `tickets/open -> tickets/closed` no mesmo commit da resolucao.
- Escopo:
  - evoluir `src/core/runner.ts` para suportar solicitacao publica de execucao unitaria por ticket selecionado.
  - evoluir `src/types/state.ts` e mapeamentos de slot/comando para observabilidade da nova origem manual.
  - evoluir `src/integrations/telegram-bot.ts` para integrar callback "Implementar este ticket" com contexto seguro/idempotente.
  - evoluir wiring em `src/main.ts` para injetar novo controle no bot.
  - cobrir contrato com testes automatizados em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`.
- Fora de escopo:
  - implementar do zero o fluxo de listagem/chunking de "Tickets abertos" (ticket irmao: `tickets/open/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`).
  - mudar modelo sequencial para paralelismo de tickets.
  - introduzir novas dependencias externas.

## Progress
- [x] 2026-02-23 16:37Z - Planejamento inicial concluido com leitura do ticket alvo, `PLANS.md`, `INTERNAL_TICKETS.md` e spec relacionada.
- [x] 2026-02-23 16:57Z - Contrato do runner para execucao unitaria de ticket selecionado implementado.
- [x] 2026-02-23 16:57Z - Integracao Telegram/main da acao "Implementar este ticket" concluida.
- [x] 2026-02-23 16:57Z - Cobertura automatizada e validacoes finais concluidas.
- [x] 2026-02-23 16:57Z - Rastreabilidade final do ticket atualizada no fechamento do ciclo.

## Surprises & Discoveries
- 2026-02-23 16:37Z - `TicketRunner` expoe apenas `requestRunAll` e `requestRunSpecs`; `processTicket` existe, mas esta privado e fora do contrato publico.
- 2026-02-23 16:37Z - `prepareRunSlotStart` aceita somente fontes `run-all` e `run-specs`, exigindo generalizacao para o caminho manual.
- 2026-02-23 16:37Z - `BotControls`/`main.ts` nao possuem metodo para executar ticket unico selecionado.
- 2026-02-23 16:37Z - O fluxo de auditoria de callback no Telegram esta tipado para `specs` e `plan-spec`; a acao manual de ticket precisa ampliar essa taxonomia.
- 2026-02-23 16:37Z - `FileSystemTicketQueue` nao expoe busca por nome; para este escopo, o runner precisara resolver/validar o alvo selecionado com normalizacao defensiva.

## Decision Log
- 2026-02-23 - Decisao: adicionar slot/tipo dedicado para execucao manual de ticket selecionado (ex.: `run-ticket`).
  - Motivo: manter observabilidade clara no `/status`, logs e mensagens de bloqueio sem confundir com `/run_all`.
  - Impacto: `RunnerSlotKind`, renderizadores de comando e asserts de testes precisam ser atualizados.
- 2026-02-23 - Decisao: manter selecao de alvo por nome de arquivo do ticket (`<yyyy-mm-dd>-<slug>.md`), com normalizacao no runner.
  - Motivo: reduzir superficie de ataque (sem path arbitrario) e preservar rastreabilidade por nome de ticket.
  - Impacto: incluir validacoes de formato/localizacao e mensagens funcionais para `ticket-nao-encontrado`.
- 2026-02-23 - Decisao: reaproveitar `processTicketInSlot` para a execucao unitaria.
  - Motivo: garantir que a mesma pipeline oficial (`plan -> implement -> close-and-version`) continue sendo a unica responsavel por fechamento/versionamento.
  - Impacto: o novo fluxo apenas prepara slot/alvo e delega para pipeline existente, minimizando divergencia.
- 2026-02-23 - Decisao: manter a acao Telegram baseada em contexto de selecao valido e consumivel uma unica vez.
  - Motivo: evitar cliques repetidos/disparos duplicados e bloquear contexto stale.
  - Impacto: callback precisa validar chat/contexto/idempotencia antes de chamar o runner.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada.
- O que funcionou:
  - API publica de execucao unitaria foi integrada ao runner mantendo lock global e pipeline oficial.
  - callback "Implementar este ticket" foi entregue com controles de contexto, stale e idempotencia.
  - suites automatizadas validaram cobertura funcional e contratos de build/tipagem.
- O que ficou pendente:
  - validacao manual em ambiente Telegram real permanece opcional para operacao, sem bloquear aceite tecnico deste ciclo.
- Proximos passos:
  - concluir ticket irmao de listagem/selecao (`tickets/open/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`) para jornada ponta a ponta completa.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`
  - `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`
  - `src/core/runner.ts`
  - `src/types/state.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Fluxo atual relevante:
  - Telegram aciona apenas `runAll`/`runSpecs` no contrato de controles.
  - `runForever` consome sempre `queue.nextOpenTicket()`.
  - `processTicketInSlot` ja executa pipeline completa de ticket e valida sincronizacao git no final.
- Fluxo alvo deste plano:
  - callback "Implementar este ticket" resolve ticket selecionado de forma segura.
  - runner tenta reservar slot de ticket (com lock global), valida alvo e executa somente esse ticket.
  - Telegram devolve feedback imediato de aceite/bloqueio e acompanha conclusao via estado/log/resumo final.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript, sem novas dependencias.
  - manter lock global de ticket (limite 1) e fluxo sequencial.
  - preservar contratos existentes de `/run_all`, `/run_specs`, `/plan_spec` e `/codex_chat`.
- Dependencia funcional importante:
  - o disparo por botao depende de contexto de ticket selecionado no Telegram, previsto no ticket irmao `tickets/open/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`.

## Plan of Work
- Milestone 1 - Contrato publico de execucao unitaria no core
  - Entregavel: novo metodo publico no `TicketRunner` para iniciar execucao de ticket selecionado.
  - Evidencia de conclusao: teste confirma retorno `started` e cria um slot dedicado sem iniciar varredura de backlog.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/types/state.ts`.
- Milestone 2 - Resolucao/validacao robusta do ticket alvo
  - Entregavel: normalizacao de nome, bloqueio de alvo invalido e erro funcional para ticket inexistente/removido.
  - Evidencia de conclusao: testes cobrindo `ticket-nao-encontrado` e recusa de entradas fora de `tickets/open`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 3 - Execucao de apenas 1 ticket com lock global e observabilidade
  - Entregavel: fluxo manual roda exatamente um ticket (pipeline completa) e encerra slot; lock global continua aplicando bloqueio para concorrencia.
  - Evidencia de conclusao: testes comprovam que nao ha chamada a `nextOpenTicket()` para este caminho e que concorrencia retorna bloqueio consistente.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/types/state.ts`.
- Milestone 4 - Integracao Telegram da acao "Implementar este ticket"
  - Entregavel: callback/action integrada ao controller com contexto seguro/idempotente e wiring no `main.ts`.
  - Evidencia de conclusao: testes de callback validam aceite, bloqueio por lock, stale e erro de ticket ausente.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/main.ts`.
- Milestone 5 - Aceite final e rastreabilidade
  - Entregavel: criterios de fechamento do ticket comprovados por testes/check/build e atualizacao de rastreabilidade na spec/ticket.
  - Evidencia de conclusao: suites verdes + diffs documentais de status de atendimento e fechamento do ticket no mesmo commit da entrega.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`, `tickets/closed/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "requestRunAll|requestRunSpecs|prepareRunSlotStart|runForever|processTicketInSlot|reserveSlot|renderSlotCommand|isTicketSlotKind" src/core/runner.ts src/types/state.ts` para mapear pontos de extensao do core.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir tipos em `src/core/runner.ts` para incluir resultado da execucao unitaria e motivos funcionais de bloqueio para ticket selecionado inexistente/invalido.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `RunnerSlotKind` em `src/types/state.ts` e mapeamentos correlatos (`isTicketSlotKind`, renderizacao de comando e snapshot de estado).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Generalizar preflight (`prepareRunSlotStart`) para aceitar a nova origem manual e manter semantica de lock global/codex auth.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar helper de resolucao do ticket selecionado por nome com normalizacao defensiva e paths derivados de `activeProject.path` (`tickets/open` e `tickets/closed`).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar execucao manual de ticket unico reaproveitando `processTicketInSlot`, com logs/touch especificos de tentativa, inicio e encerramento.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar metodo de controle no `TelegramController` (`BotControls`) para chamar a nova API do runner.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/main.ts` para injetar o novo controle no bootstrap do Telegram.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Integrar callback "Implementar este ticket" em `src/integrations/telegram-bot.ts`, com validacao de acesso, contexto, idempotencia e mapeamento de retorno (`started`, `blocked`, `ticket-nao-encontrado`).
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar renderizacao de status/slots no Telegram para identificar explicitamente o novo tipo de execucao manual.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios de execucao unitaria, lock global, ticket ausente e nao-varredura de backlog.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com cenarios de callback da acao manual (aceite, stale, bloqueio, ticket removido e idempotencia).
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para validar contratos do runner.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para validar fluxo Telegram.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build apos evolucao de contratos.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar spec/ticket no fechamento da implementacao e auditar com `git diff -- src/core/runner.ts src/types/state.ts src/integrations/telegram-bot.ts src/main.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md tickets/closed/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: existe cobertura para execucao unitaria de ticket selecionado com os seguintes comportamentos observaveis:
    - inicia somente 1 ticket alvo e encerra slot em seguida;
    - bloqueia quando lock global de ticket estiver ativo;
    - retorna erro funcional quando ticket alvo nao existir mais.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: callback "Implementar este ticket" respeita acesso, stale/idempotencia e traduz corretamente respostas do runner para o chat.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build verdes apos ampliar contratos (`BotControls`, resultados do runner e tipos de slot).
- Comando: `rg -n "Implementar este ticket|run-ticket|ticket-lock-active|ticketCapacity" src/core/runner.ts src/integrations/telegram-bot.ts src/types/state.ts`
  - Esperado: pontos de observabilidade e lock global da acao manual estao presentes e coerentes.
- Comando: `rg -n "RF-06|RF-07|RF-08|RF-09|CA-03|CA-04|CA-05|CA-06|CA-07|CA-08" docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`
  - Esperado: documento vivo atualizado com atendimento e evidencias apos execucao do plano.

## Idempotence and Recovery
- Idempotencia:
  - repetir callback da mesma selecao nao pode disparar segunda execucao do mesmo ticket (contexto deve ser consumido/invalidado).
  - reexecutar validacoes automatizadas nao altera estado funcional permanente.
- Riscos:
  - dependencia de contexto do ticket irmao de listagem/selecao pode bloquear integracao de ponta a ponta.
  - normalizacao fraca do nome do ticket pode permitir alvo invalido (path traversal) ou falha falsa de nao encontrado.
  - regressao de mensagens/status de `/run_all` e `/run_specs` ao ampliar enums/tipos compartilhados.
- Recovery / Rollback:
  - isolar nova funcionalidade em metodos dedicados (`requestRunSelectedTicket`, parser/handler de callback manual) para rollback cirurgico.
  - se callback manual falhar em producao, manter comandos existentes (`/run_all` e `/run_specs`) operacionais sem bloqueio adicional.
  - em caso de incerteza sobre contexto stale, falhar em modo seguro com mensagem de atualizar listagem e nao iniciar execucao.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`.
- Dependencia funcional relacionada: `tickets/open/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`.
- Spec de origem: `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`.
- Referencias obrigatorias usadas no planejamento:
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
  - `src/core/runner.ts`
  - `src/main.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Validacoes executadas:
  - `npx tsx --test src/core/runner.test.ts` (61 testes, 61 pass).
  - `npx tsx --test src/integrations/telegram-bot.test.ts` (94 testes, 94 pass).
  - `npm run check && npm run build` (tipagem e build verdes).
- Evidencias consolidadas ao final da execucao:
  - diff com API publica de execucao unitaria no runner.
  - callback de "Implementar este ticket" funcional e coberto por testes.
  - logs/status demonstrando lock, inicio, etapas e conclusao/falha do ticket selecionado.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/core/runner.ts`:
    - novo contrato publico para execucao de ticket selecionado;
    - ampliacao de tipagens de retorno/bloqueio para erros funcionais de alvo.
  - `src/types/state.ts`:
    - ampliacao de `RunnerSlotKind` para representar execucao manual de ticket.
  - `src/integrations/telegram-bot.ts`:
    - `BotControls` com novo metodo de execucao unitaria;
    - novo fluxo de callback para a acao "Implementar este ticket".
  - `src/main.ts`:
    - wiring do novo metodo no bootstrap do Telegram.
- Compatibilidade:
  - `/run_all` e `/run_specs` permanecem com comportamento atual; a nova acao reutiliza as mesmas guardas de lock global e autenticacao.
  - pipeline oficial de fechamento de ticket permanece centralizada no core (`processTicketInSlot` + `close-and-version`).
- Dependencias externas e mocks:
  - sem novas dependencias.
  - testes continuam usando doubles locais de runner/telegram, sem chamadas reais ao Telegram.
