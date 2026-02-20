# ExecPlan - Contrato Telegram multi-runner com status global e controles por projeto ativo

## Purpose / Big Picture
- Objetivo: completar o contrato do Telegram no modo multi-runner para atender RF-11, RF-12 e RF-13 da spec `2026-02-20-telegram-multi-project-parallel-runners`.
- Resultado esperado:
  - `/status` exibe visao do projeto ativo e painel global de capacidade com indicador `N/5`.
  - `/pause` e `/resume` afetam apenas o slot do projeto ativo no momento do comando.
  - `/projects` e `/select_project` funcionam durante execucao em outros projetos, sem bloqueio global indevido.
  - Mensagens de bloqueio continuam acionaveis e coerentes com `slot do projeto ocupado` vs `capacidade global esgotada`.
  - Cobertura automatizada valida CA-05, CA-06, CA-07 e regressao de CA-10.
- Escopo:
  - Ajustar contratos de controle entre `TelegramController`, `main.ts` e `TicketRunner` para controle por projeto.
  - Atualizar renderizacao de status em `src/integrations/telegram-bot.ts` usando `state.capacity` e `state.activeSlots`.
  - Remover bloqueios globais de troca de projeto no caminho Telegram quando a execucao ativa for de outro projeto.
  - Atualizar testes unitarios/integracao das camadas `core` e `integrations`.
  - Atualizar matriz de atendimento da spec com rastreabilidade dos CAs entregues.
- Fora de escopo:
  - Mudancas no limite global de 5 slots ou no algoritmo base de admissao de slots.
  - Suporte a paralelizacao de tickets dentro do mesmo projeto.
  - Mudancas de bootstrap/seguranca de `TELEGRAM_ALLOWED_CHAT_ID` (ja coberto em ticket/execplan dedicado).
  - Fechamento operacional do ticket (mover para `tickets/closed/`, commit/push).

## Progress
- [x] 2026-02-20 16:30Z - Planejamento inicial concluido com leitura integral do ticket, spec e referencias tecnicas.
- [x] 2026-02-20 16:36Z - Contratos de controle por projeto ajustados no `runner` e no `TelegramController`.
- [x] 2026-02-20 16:37Z - Renderizacao de `/status` com painel global `N/5` implementada.
- [x] 2026-02-20 16:38Z - Fluxos `/pause`, `/resume`, `/projects` e `/select_project` atualizados para concorrencia por projeto.
- [x] 2026-02-20 16:40Z - Testes CA-05/CA-06/CA-07 + regressao de CA-10 aprovados.
- [x] 2026-02-20 16:42Z - Spec atualizada e validacao final (`test`, `check`, `build`) concluida.

## Surprises & Discoveries
- 2026-02-20 16:24Z - `RunnerState` ja expoe `capacity` e `activeSlots`, mas `buildStatusReply` ainda ignora esses campos e mostra apenas visao singular.
- 2026-02-20 16:25Z - `requestPause`/`requestResume` no `TicketRunner` atuam em todos os slots de execucao (`getRunSlots()`), nao no projeto ativo.
- 2026-02-20 16:26Z - O bloqueio de troca de projeto esta duplicado em tres pontos: `telegram-bot.ts` (`state.isRunning`), `main.ts` (tratamento de `syncActiveProject`) e `runner.ts` (`hasBusyRunSlots` em `syncActiveProject`).
- 2026-02-20 16:27Z - A suite atual de Telegram codifica explicitamente o bloqueio global em comando e callback, exigindo atualizacao de expectativas.
- 2026-02-20 16:28Z - A spec alvo tem inconsistencia textual em CA-10 (checklist vs matriz), entao a etapa de documentacao deve reconciliar o status final.

## Decision Log
- 2026-02-20 - Decisao: introduzir resultado explicito para `/pause` e `/resume` por projeto (sucesso, sem slot ativo no projeto, ou falha operacional).
  - Motivo: evitar efeitos colaterais em slots de outros projetos e melhorar feedback do Telegram.
  - Impacto: contrato `BotControls` e `TicketRunner` evoluem; testes de comando precisam validar novo comportamento.
- 2026-02-20 - Decisao: permitir `syncActiveProject` durante execucao de outros projetos, mantendo bloqueio apenas para condicoes realmente conflitantes (ex.: sessao `/plan_spec` ativa, se aplicavel).
  - Motivo: atender RF-13/CA-07 e eliminar bloqueio global legado de runner unico.
  - Impacto: `main.ts`, `runner.ts` e testes de selecao devem ser alinhados ao novo contrato.
- 2026-02-20 - Decisao: manter `/status` com foco no projeto ativo e acrescentar painel global enxuto (`N/5` + slots ativos) sem remover rastreabilidade existente.
  - Motivo: atender RF-11 sem regredir o contrato atual de observabilidade por projeto/evento notificado.
  - Impacto: asserts de texto em `telegram-bot.test.ts` precisarao ser atualizados.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - `TicketRunner` passou a expor pausa/resume scoped ao projeto ativo e deixou de bloquear troca de projeto por execucao global.
  - `TelegramController` passou a renderizar `/status` com painel global de capacidade e slots ativos (`N/5`).
  - `/pause` e `/resume` agora respondem com contexto do projeto ativo e nao afetam slots de outros projetos.
  - `/select_project` e callbacks de `/projects` passaram a funcionar durante execucao em outro projeto.
  - Suite automatizada ficou verde para `runner`, `telegram-bot`, regressao completa, tipagem e build.
- O que ficou pendente:
  - Encerramento operacional do ticket (mover para `tickets/closed/`, atualizar closure e versionar).
- Proximos passos:
  - Executar etapa de encerramento do ticket quando autorizado.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts` - comandos `/status`, `/pause`, `/resume`, `/projects`, `/select_project` e callbacks.
  - `src/integrations/telegram-bot.test.ts` - cobertura de mensagens, bloqueios e selecao de projeto.
  - `src/core/runner.ts` - controle de slots, pausa/resume e sincronizacao de projeto ativo.
  - `src/core/runner.test.ts` - contratos de concorrencia, slots e bloqueios no core.
  - `src/main.ts` - wiring de `BotControls` e politica de sincronizacao com `projectSelection`.
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` - fonte dos RFs/CAs alvo.
- Fluxo atual relevante:
  - `/status` usa `RunnerState`, mas renderiza apenas estado singular.
  - `/pause` e `/resume` disparam controles sem contexto de projeto.
  - `/select_project` e callback de `projects:select:*` bloqueiam por `state.isRunning` global.
  - `main.ts` delega para `runner.syncActiveProject`, que hoje bloqueia enquanto houver slot de execucao ativo.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript, sem novas dependencias desnecessarias.
  - Fluxo sequencial por ticket dentro de cada projeto deve permanecer intacto.
  - Compatibilidade de aliases legados (`/select-project`, `/run-all`) deve ser preservada.

## Plan of Work
- Milestone 1 - Contrato de controle por projeto no core e wiring
  - Entregavel: `TicketRunner` expoe operacoes de pausa/resume com escopo de projeto ativo; `syncActiveProject` deixa de bloquear globalmente execucoes em outros projetos.
  - Evidencia de conclusao: testes de `runner` validam que pausar/resumir projeto `beta` nao altera slot de `alpha`, e que troca de projeto e aceita durante execucao em projeto diferente.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/main.ts`.
- Milestone 2 - Contrato Telegram para status global e comandos scoped
  - Entregavel: `/status` inclui painel global `N/5` e lista de slots ativos; `/pause` e `/resume` operam no projeto ativo e retornam resposta contextual.
  - Evidencia de conclusao: testes de `telegram-bot` validam texto de status com `N/5` e comportamento de comando scoped por projeto.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Selecao de projeto durante execucao multiprojeto
  - Entregavel: remocao dos bloqueios globais de `state.isRunning` em comando/callback, mantendo apenas bloqueios realmente necessarios.
  - Evidencia de conclusao: `/select_project` e callback de `/projects` passam quando a execucao ativa pertence a outro projeto; casos de bloqueio legitimo permanecem cobertos.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/main.ts`, `src/core/runner.ts`.
- Milestone 4 - Validacao, regressao e rastreabilidade da spec
  - Entregavel: suites alvo verdes, regressao completa sem quebra e spec atualizada com CAs atendidos.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` com sucesso e matriz RF/CA atualizada.
  - Arquivos esperados: `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "requestPause|requestResume|syncActiveProject|hasBusyRunSlots|buildStatusReply|SELECT_PROJECT_BLOCKED_RUNNING_REPLY|state\\.isRunning" src/core/runner.ts src/integrations/telegram-bot.ts src/main.ts` para mapear todos os pontos de lock/global.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para expor pausa/resume por projeto ativo e ajustar `syncActiveProject` para concorrencia multiprojeto.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/main.ts` para wiring dos novos retornos de pausa/resume e sincronizacao de projeto sem rollback indevido.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts`:
   - renderizar painel global de slots/capacidade em `/status`;
   - aplicar `/pause` e `/resume` com escopo do projeto ativo;
   - remover bloqueio global por `state.isRunning` em `/select_project` e callbacks.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios dedicados de controle scoped e troca de projeto durante execucao em outro slot.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para CA-05, CA-06, CA-07 e regressao de CA-10, removendo asserts do bloqueio global legado.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` marcando CA-05/CA-06/CA-07 e reconciliando status de CA-10.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/core/runner.test.ts src/main.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: cobre `/status` com painel `N/5`, `/pause`/`/resume` scoped por projeto e selecao de projeto durante execucao em outro projeto (CA-05/06/07).
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: garante que pausa/resume nao afetam slots de outros projetos e que `syncActiveProject` nao bloqueia globalmente sem conflito.
- Comando: `npm test`
  - Esperado: regressao completa verde, incluindo notificacao final por ticket com identificacao de projeto (CA-10 sem regressao).
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build concluidos sem erro.
- Comando: `rg -n "CA-05|CA-06|CA-07|CA-10|RF-11|RF-12|RF-13" docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - Esperado: matriz da spec atualizada de forma coerente com o resultado validado.

## Idempotence and Recovery
- Idempotencia:
  - Repetir `/pause` no mesmo projeto ativo nao deve pausar slots adicionais nem mudar projeto.
  - Repetir `/resume` sem slot ativo no projeto deve retornar resposta informativa sem efeito colateral.
  - Reexecutar suites de teste e comandos de validacao nao altera estado persistente do repositorio.
- Riscos:
  - Corrida entre troca de projeto e finalizacao de slot pode gerar mensagem incoerente de pausa/resume.
  - Ajuste incompleto do contrato entre `runner`, `main` e `telegram` pode causar mismatch de tipos/retornos.
  - Render de status global pode ficar ruidoso se nao limitar formato da lista de slots.
- Recovery / Rollback:
  - Tratar lookup de slot do projeto ativo no instante do comando e responder `sem slot ativo` quando o slot terminar antes da aplicacao.
  - Manter adaptador de compatibilidade no `main.ts` ate todos os consumidores de controle serem migrados.
  - Em regressao critica de UX, restaurar temporariamente mensagem antiga de status, preservando logica nova de escopo e mantendo ticket aberto com decisao registrada.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md`.
- Spec de referencia: `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`.
- Evidencias usadas no planejamento:
  - `src/integrations/telegram-bot.ts:389`
  - `src/integrations/telegram-bot.ts:404`
  - `src/integrations/telegram-bot.ts:741`
  - `src/integrations/telegram-bot.ts:799`
  - `src/integrations/telegram-bot.ts:1501`
  - `src/integrations/telegram-bot.test.ts:1609`
  - `src/integrations/telegram-bot.test.ts:1877`
  - `src/integrations/telegram-bot.test.ts:2066`
- ExecPlans relacionados:
  - `execplans/2026-02-20-multi-runner-core-capacity-and-slot-locks-gap.md`
  - `execplans/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/integrations/telegram-bot.ts`
    - `BotControls.pause`/`BotControls.resume` devem suportar retorno orientado a projeto (nao apenas `void`).
    - `buildStatusReply` passa a consumir `RunnerState.capacity` e `RunnerState.activeSlots`.
  - `src/core/runner.ts`
    - API de pausa/resume evolui para escopo do projeto ativo.
    - `syncActiveProject` deixa de codificar bloqueio global legado de runner unico.
  - `src/main.ts`
    - adaptacao de wiring para novos contratos de controle e sincronizacao.
- Compatibilidade:
  - Aliases legados (`/run-all`, `/select-project`) permanecem ativos.
  - Fluxo sequencial por ticket em cada projeto permanece inalterado.
  - Mudancas de texto de resposta devem preservar clareza operacional e rastreabilidade.
- Dependencias externas e mocks:
  - Sem novas bibliotecas.
  - Reutilizar doubles existentes em `runner.test.ts` e `telegram-bot.test.ts`.
