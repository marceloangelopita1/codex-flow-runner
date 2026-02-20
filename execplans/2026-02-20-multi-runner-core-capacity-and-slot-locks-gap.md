# ExecPlan - Multi-runner core com capacidade 5 e lock por slot de projeto

## Purpose / Big Picture
- Objetivo: implementar no nucleo do runner um gerenciador multi-projeto com ate 5 slots ativos, mantendo execucao sequencial de tickets por projeto e bloqueios explicitos por slot/capacidade.
- Resultado esperado:
  - `/run_all` e `/run_specs` podem rodar em paralelo quando disparados para projetos diferentes.
  - O mesmo projeto nao pode iniciar segundo fluxo enquanto o slot dele estiver ocupado.
  - Com 5 slots ativos, novo inicio em projeto sem slot deve falhar de forma acionavel, com lista de projetos em execucao.
  - Nao existe fila automatica nem substituicao de runner ativo quando a capacidade estiver cheia.
  - `/plan_spec` continua globalmente unico, mas pode coexistir com `/run_all` e `/run_specs` em outros projetos quando houver capacidade.
- Escopo:
  - Refatorar `src/core/runner.ts` para trocar bloqueio global por gerenciamento de slots por projeto.
  - Evoluir contratos de retorno de start (`requestRunAll`, `requestRunSpecs`, `startPlanSpecSession`) para diferenciar bloqueio por slot do projeto e bloqueio por capacidade global.
  - Evoluir `src/types/state.ts` para expor visao global de capacidade/slots ativos ao estado do runner.
  - Ajustar composicao em `src/main.ts` para sustentar resolucao de dependencias por projeto em execucoes simultaneas.
  - Cobrir criterios CA-01, CA-02, CA-03, CA-04, CA-08 e CA-09 com testes automatizados no core.
- Fora de escopo:
  - Painel Telegram de status `N/5`, `/pause` e `/resume` por projeto e desbloqueio de `/select_project` durante execucao (ticket `tickets/open/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md`).
  - Tornar `TELEGRAM_ALLOWED_CHAT_ID` obrigatorio no bootstrap (ticket `tickets/open/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md`).
  - Paralelizacao de tickets dentro do mesmo projeto.

## Progress
- [x] 2026-02-20 16:00Z - Planejamento inicial concluido com leitura integral do ticket, spec e evidencias de codigo/teste.
- [x] 2026-02-20 16:14Z - Contratos de estado e respostas de bloqueio evoluidos para modo multi-slot.
- [x] 2026-02-20 16:14Z - Gerenciamento de capacidade global (5) e lock de slot por projeto implementados no core.
- [x] 2026-02-20 16:14Z - Coexistencia de `/plan_spec` com `/run_all`/`/run_specs` em projetos distintos implementada.
- [x] 2026-02-20 16:14Z - Cobertura automatizada dos CAs alvo e regressao completa validadas.

## Surprises & Discoveries
- 2026-02-20 15:56Z - O bootstrap ainda instancia somente um `TicketRunner` global em `src/main.ts`, sem camada de orquestracao de slots por projeto.
- 2026-02-20 15:56Z - O estado atual (`RunnerState`) e singular (`isRunning`, `currentTicket`, `activeProject`) e nao modela matriz de runners ativos.
- 2026-02-20 15:57Z - `requestRunAll` e `requestRunSpecs` bloqueiam por `isBusy()` global e retornam `already-running` mesmo para projetos diferentes.
- 2026-02-20 15:58Z - `requestRunAll` e `requestRunSpecs` bloqueiam sempre que existe sessao `/plan_spec` ativa, contrariando RF-09.
- 2026-02-20 15:59Z - A suite atual de `src/core/runner.test.ts` tem asserts explicitos para esse bloqueio global, portanto parte dos testes atuais precisara ser atualizada para o novo contrato.

## Decision Log
- 2026-02-20 - Decisao: adotar slot por projeto com limite global fixo de 5 no core.
  - Motivo: atender RF-01, RF-03, RF-05 e RF-06 de forma observavel e previsivel.
  - Impacto: o runner deixa de usar lock unico global para inicio de execucao.
- 2026-02-20 - Decisao: diferenciar bloqueios por motivo (`slot ocupado` vs `capacidade esgotada`) no contrato de resposta.
  - Motivo: suportar mensagens acionaveis e preparar integracao Telegram para feedback correto.
  - Impacto: tipos de retorno de comandos e testes de contrato precisam evoluir.
- 2026-02-20 - Decisao: manter `/plan_spec` como sessao global unica, mas consumindo slot do projeto da sessao.
  - Motivo: preservar RF-08/RF-10 e destravar RF-09 sem ambiguidade de roteamento.
  - Impacto: lock de `/plan_spec` passa a conviver com capacidade global e slots por projeto.
- 2026-02-20 - Decisao: manter sem fila automatica no excedente.
  - Motivo: requisito explicito RF-06 e reducao de risco operacional.
  - Impacto: pedidos acima da capacidade retornam bloqueio imediato e nao ficam pendentes.

## Outcomes & Retrospective
- Status final: implementacao e validacao tecnicas concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - `TicketRunner` passou a operar com slots por projeto e limite global `5`, removendo o lock global para `/run_all` e `/run_specs`.
  - Bloqueios agora diferenciam `slot do projeto ocupado` e `capacidade maxima atingida`, com lista de projetos ativos no caso de capacidade.
  - `/plan_spec` permaneceu globalmente unico e passou a coexistir com execucoes em outros projetos.
  - Cobertura automatizada de `runner` foi ampliada para CA-01/02/03/04/08/09 e a regressao completa ficou verde.
- O que ficou pendente:
  - Painel Telegram global `N/5`, controles `/pause`/`/resume` por projeto e desbloqueio de troca de projeto durante execucao (ticket dedicado).
  - Exigencia obrigatoria de `TELEGRAM_ALLOWED_CHAT_ID` no bootstrap (ticket dedicado).
- Proximos passos:
  - Executar etapa de encerramento operacional do ticket (mover para `tickets/closed/`, atualizar closure e versionar).

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - regra de admissao e ciclo de execucao atual (lock global).
  - `src/types/state.ts` - shape do estado exposto para observabilidade/control-plane.
  - `src/main.ts` - bootstrap e composicao do runner com resolucao de dependencias por projeto.
  - `src/core/runner.test.ts` - cobertura principal dos contratos de bloqueio e sessao `/plan_spec`.
- Fluxo atual relevante:
  - Existe apenas uma instancia de runner, com `isRunning` global e `isBusy()` global.
  - O inicio de `/run_all` e `/run_specs` e mutuamente exclusivo para toda a instancia.
  - Sessao `/plan_spec` bloqueia globalmente novos inicios de `/run_all` e `/run_specs`.
- Restricoes tecnicas:
  - Manter Node.js 20+ e TypeScript sem novas dependencias desnecessarias.
  - Preservar sequencialidade de tickets dentro de cada projeto.
  - Nao introduzir fila de espera automatica quando `N=5`.
- Termos usados neste plano:
  - Slot de projeto: permissao exclusiva para um unico fluxo ativo (`/run_all`, `/run_specs` ou `/plan_spec`) em um projeto especifico.
  - Capacidade global: total maximo de slots ativos na instancia (fixo em 5).

## Plan of Work
- Milestone 1 - Contratos de estado e resposta para multi-slot
  - Entregavel: tipos e estado do runner passam a representar capacidade global, slots ativos e motivos de bloqueio distintos.
  - Evidencia de conclusao: build compila com novos tipos e testes de contrato validam payload de bloqueio por `slot` e por `capacidade`.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2 - Admissao e lifecycle de slots por projeto
  - Entregavel: nucleo do runner reserva/libera slot por projeto com limite global de 5, sem fila.
  - Evidencia de conclusao: testes cobrem bloqueio por mesmo projeto (CA-02), bloqueio no sexto projeto (CA-03) e liberacao de vaga (CA-04).
  - Arquivos esperados: `src/core/runner.ts`, possivelmente novo modulo interno em `src/core/` para isolamento de logica de slot.
- Milestone 3 - Concorrencia real entre projetos
  - Entregavel: `/run_all` e `/run_specs` aceitos em paralelo para projetos diferentes, mantendo sequencialidade interna por projeto.
  - Evidencia de conclusao: teste dedicado inicia fluxos simultaneos em `alpha` e `beta` sem `already-running` global (CA-01).
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 4 - Coexistencia com `/plan_spec` global unico
  - Entregavel: `/plan_spec` continua unico por instancia, sem bloquear inicios em outros projetos quando houver capacidade.
  - Evidencia de conclusao: testes para coexistencia `/plan_spec` + `/run_all` em projetos distintos (CA-08) e bloqueio de segundo `/plan_spec` (CA-09).
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 5 - Integracao minima, regressao e rastreabilidade
  - Entregavel: bootstrap compatibilizado com a nova estrategia e matriz da spec atualizada com evidencias.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` verdes e status da spec atualizado.
  - Arquivos esperados: `src/main.ts`, `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes da refatoracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "isBusy\(|requestRunAll|requestRunSpecs|startPlanSpecSession|RunnerState|createInitialState" src/core/runner.ts src/types/state.ts` para mapear pontos de lock global e contratos.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` para incluir snapshot observavel de capacidade (`used`, `limit`) e slots ativos por projeto, preservando compatibilidade do estado base.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para introduzir gerenciador de slots por projeto com limite fixo de 5, lock de slot por projeto e retorno de bloqueio com motivo explicito.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar em `src/core/runner.ts` a logica de `/plan_spec` para coexistir com runners de outros projetos, mantendo sessao global unica.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/main.ts` para compor o runner no novo modelo de resolucao por projeto sem regressao do bootstrap.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios CA-01/02/03/04/08/09 e remover asserts que codificam bloqueio global antigo.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se houver impacto de tipo publico, ajustar apenas compatibilidade minima em `src/integrations/telegram-bot.ts` (sem implementar painel/global controls deste ticket).
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para validar contratos de concorrencia/capacidade no core.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para confirmar tipagem e build apos refatoracao.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` na matriz RF/CA com os itens atendidos por este ticket e evidencias de teste.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/types/state.ts src/main.ts src/core/runner.test.ts docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cobre e aprova CA-01, CA-02, CA-03, CA-04, CA-08 e CA-09 com asserts de motivo de bloqueio e liberacao de slot.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao no fluxo sequencial de tickets.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erro apos evolucao dos contratos do runner.
- Comando: `rg -n "RF-01|RF-03|RF-05|RF-06|RF-07|RF-09|CA-01|CA-02|CA-03|CA-04|CA-08|CA-09" docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - Esperado: status da spec atualizado com rastreabilidade objetiva para os itens atendidos por este ticket.

## Idempotence and Recovery
- Idempotencia:
  - Repetir comando de inicio para projeto com slot ocupado deve sempre retornar bloqueio explicito, sem criar execucao duplicada.
  - Reexecutar validacoes (`npm test`, `npm run check`, `npm run build`) nao gera efeitos colaterais persistentes.
- Riscos:
  - Vazamento de slot (slot nao liberado em erro/finalizacao) pode bloquear capacidade indevidamente.
  - Corrida de admissao pode permitir exceder 5 slots se reserva/liberacao nao for atomica.
  - Refatoracao ampla em `runner.ts` pode quebrar contratos atuais de estado e respostas.
- Recovery / Rollback:
  - Centralizar reserva/liberacao de slot em caminhos unicos com `try/finally` para cleanup garantido.
  - Manter testes de concorrencia com atrasos controlados para reproduzir corridas de inicio e validar fix.
  - Em regressao critica, reverter para lock global temporariamente por feature flag interna (limite efetivo `1`) enquanto corrige leak/race, mantendo trilha no `Decision Log`.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-20-multi-runner-core-capacity-and-slot-locks-gap.md`.
- Spec de referencia: `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`.
- Tickets relacionados (fora do escopo deste plano):
  - `tickets/open/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md`.
  - `tickets/open/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md`.
- Evidencias esperadas ao final da execucao:
  - Diff de core/state/main/testes mostrando gerencia de slots e capacidade.
  - Saidas dos comandos de teste, check e build.
  - Atualizacao da matriz RF/CA na spec com links para arquivos de evidencia.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/core/runner.ts`:
    - contratos de `requestRunAll`, `requestRunSpecs` e `startPlanSpecSession` para bloqueios multi-slot;
    - estado interno passa a rastrear slots ativos por projeto e capacidade global.
  - `src/types/state.ts`:
    - `RunnerState` passa a expor snapshot global de capacidade/slots ativos.
  - `src/main.ts`:
    - composicao do runner adaptada para o novo modelo de concorrencia por projeto.
- Compatibilidade:
  - aliases de comando (`/run-all`, `/select-project`) permanecem compativeis.
  - fluxo continua sequencial dentro de cada projeto.
  - mensagens de bloqueio podem ficar mais especificas; ajuste fino de UX Telegram fica no ticket dedicado.
- Dependencias externas e mocks:
  - sem novas bibliotecas; reutilizar `CodexTicketFlowClient`, `TicketQueue`, `GitVersioning` e doubles de teste existentes.
  - testes continuam locais, sem chamadas reais de rede/Telegram.
