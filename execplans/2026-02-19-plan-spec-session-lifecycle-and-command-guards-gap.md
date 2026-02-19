# ExecPlan - Sessao /plan_spec lifecycle e guardrails operacionais

## Purpose / Big Picture
- Objetivo: implementar o ciclo de vida operacional da sessao `/plan_spec` no runner e no bot Telegram, com sessao global unica, comandos dedicados, bloqueios de conflito e timeout por inatividade.
- Resultado esperado:
  - `/plan_spec`, `/plan_spec_status` e `/plan_spec_cancel` funcionam com gate por `TELEGRAM_ALLOWED_CHAT_ID`;
  - existe no maximo uma sessao `/plan_spec` ativa por instancia;
  - primeira mensagem livre apos `/plan_spec` vira brief inicial e mensagens livres seguem roteadas para a sessao ativa;
  - `/run_all`, `/run_specs`, `/select_project` e callback de selecao/paginacao de `/projects` ficam bloqueados durante sessao ativa;
  - timeout de 30 minutos encerra sessao automaticamente com mensagem explicita ao operador;
  - `/status` passa a refletir fase da sessao e timestamp de ultima atividade.
- Escopo:
  - estender estado operacional (`RunnerState`) para representar sessao `/plan_spec` e fases de espera (usuario/Codex).
  - implementar orquestracao de sessao no core com start/status/input/cancel/timeout e snapshot do projeto ativo no inicio.
  - integrar comandos e roteamento de texto livre no `TelegramController`.
  - aplicar guardrails de comando e troca de projeto durante sessao ativa.
  - cobrir CAs do ticket: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-17, CA-18.
  - atualizar spec com rastreabilidade de atendimento deste ticket.
- Fora de escopo:
  - materializacao da spec apos `Criar spec`, commit/push dedicado e trilha `spec_planning/*` (ticket `tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`).
  - cobertura automatizada completa de toda jornada `/plan_spec` alem dos CAs deste ticket (ticket `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`).
  - suporte a sessoes paralelas por chat/usuario.

## Progress
- [x] 2026-02-19 21:38Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, spec e referencias de codigo.
- [x] 2026-02-19 21:57Z - Contrato de estado/sessao `/plan_spec` definido no core (fases, snapshot de projeto e timestamp de atividade).
- [x] 2026-02-19 21:57Z - Comandos `/plan_spec*`, roteamento de texto livre e guardrails de conflito implementados no Telegram.
- [x] 2026-02-19 21:57Z - Timeout de 30 minutos e encerramento automatico com limpeza de estado implementados.
- [x] 2026-02-19 22:00Z - Cobertura automatizada dos CAs deste ticket implementada e validada.
- [x] 2026-02-19 22:00Z - Spec atualizada com evidencias e pendencias remanescentes.

## Surprises & Discoveries
- 2026-02-19 21:38Z - `src/integrations/codex-client.ts` ja expoe `startPlanSession`, mas o fluxo ainda nao e acionado por nenhum comando do Telegram.
- 2026-02-19 21:38Z - `src/integrations/telegram-bot.ts` ja renderiza callbacks `plan-spec:*` para pergunta/finalizacao, porem sem orquestrador de sessao ativo e sem `on("text")` para input livre.
- 2026-02-19 21:38Z - `src/types/state.ts` nao contem fases nem metadados dedicados da sessao `/plan_spec`, limitando observabilidade de `/status`.
- 2026-02-19 21:38Z - bloqueio atual de troca de projeto depende apenas de `isRunning` (rodadas), sem considerar sessao `/plan_spec`.
- 2026-02-19 21:38Z - nao existe infraestrutura de timeout de sessao alem do `sleep` do loop de polling de `/run-all`.

## Decision Log
- 2026-02-19 - Decisao: concentrar a orquestracao de sessao `/plan_spec` no core (`TicketRunner` ou modulo core dedicado), mantendo `TelegramController` como adaptador de comandos/mensagens.
  - Motivo: preservar separacao de camadas e evitar regra de negocio critica espalhada na integracao Telegram.
  - Impacto: amplia API de controle entre `main.ts` e `telegram-bot.ts` com operacoes de sessao.
- 2026-02-19 - Decisao: representar explicitamente estado da sessao no `RunnerState` (fase + ultimo heartbeat + projeto snapshot da sessao).
  - Motivo: cumprir RF-26/CA-05 e permitir `/status` auditavel sem estado implicito em memoria externa.
  - Impacto: ajustes em `src/types/state.ts`, `src/core/runner.ts` e testes que constroem estado fake.
- 2026-02-19 - Decisao: aplicar bloqueio de conflito em duas camadas: no core para `/run_all` e `/run_specs`, e na integracao Telegram para troca de projeto por comando/callback.
  - Motivo: defesa em profundidade para garantir comportamento consistente mesmo com chamada fora do caminho principal do bot.
  - Impacto: novas mensagens de bloqueio e cobertura de regressao em `runner.test.ts` e `telegram-bot.test.ts`.
- 2026-02-19 - Decisao: timeout de inatividade com `setTimeout` resetado por atividade de usuario ou evento Codex.
  - Motivo: encerrar sessao zumbi sem polling agressivo e com semantica clara de "inatividade".
  - Impacto: precisa lifecycle rigoroso de cleanup para evitar timer orfao e corrida entre cancel/close/timeout.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada para o escopo deste ticket.
- O que funcionou: a separacao entre lifecycle no core e adaptacao Telegram permitiu adicionar comandos, roteamento de texto livre, bloqueios de conflito e timeout sem quebrar o fluxo sequencial existente.
- O que ficou pendente: materializacao da spec e versionamento (`tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`) e cobertura automatizada completa da jornada (`tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`).
- Proximos passos: encerrar o ticket com move `tickets/open -> tickets/closed` no mesmo commit e seguir o backlog remanescente de `/plan_spec`.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - estado global, guardrails de concorrencia e ponto natural para lifecycle da sessao.
  - `src/types/state.ts` - contrato de fases/estado consumido por `/status`.
  - `src/integrations/telegram-bot.ts` - comandos, callbacks, roteamento de texto e bloqueios de comando.
  - `src/main.ts` - bootstrap e injecao de controles entre core e Telegram.
  - `src/integrations/codex-client.ts` - API existente de sessao interativa (`startPlanSession`).
  - `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` - suites para validar CAs sem chamadas externas reais.
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` - fonte de RFs/CAs e status de atendimento.
- Fluxo atual:
  - `/run_all` e `/run_specs` iniciam rodadas sequenciais via runner.
  - callbacks `plan-spec:*` existem no Telegram, mas sem sessao orquestrada ativa.
  - mensagens livres sem comando nao sao roteadas para conversa de planejamento.
- Restricoes tecnicas:
  - fluxo estritamente sequencial, sem paralelizacao de tickets/sessoes.
  - sessao `/plan_spec` deve ser global por instancia.
  - controle de acesso deve continuar baseado em `TELEGRAM_ALLOWED_CHAT_ID`.

## Plan of Work
- Milestone 1: Modelo de estado e contrato de sessao `/plan_spec` no core.
  - Entregavel: tipos e estado operacional para representar sessao ativa, fase da sessao, projeto congelado e ultima atividade.
  - Evidencia de conclusao: diff com novos tipos/campos e getters de status consumiveis por Telegram.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`.
- Milestone 2: Lifecycle completo da sessao (start/input/status/cancel/timeout) integrado ao Codex interativo.
  - Entregavel: API no core para iniciar sessao sem brief, receber primeira mensagem livre como contexto inicial, encaminhar mensagens seguintes, cancelar e expirar por timeout.
  - Evidencia de conclusao: logs de inicio/fim/cancel/timeout/falha e limpeza de estado deterministica apos encerramento.
  - Arquivos esperados: `src/core/runner.ts`, possivelmente novo modulo `src/core/plan-spec-session.ts`.
- Milestone 3: Comandos Telegram e roteamento de texto livre.
  - Entregavel: handlers `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel` + `on("text")` para sessao ativa.
  - Evidencia de conclusao: testes cobrindo inicio de sessao, primeira mensagem livre, status e cancelamento.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4: Guardrails de conflito durante sessao ativa.
  - Entregavel: bloqueio explicito de `/run_all`, `/run_specs`, `/select_project` e callback de `/projects`; bloqueio de troca de projeto preservando snapshot inicial da sessao.
  - Evidencia de conclusao: asserts de nao-execucao/nao-alteracao de projeto e mensagens de bloqueio claras.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/main.ts`, testes correspondentes.
- Milestone 5: Validacao, rastreabilidade e atualizacao da spec.
  - Entregavel: suite verde para CAs do ticket + status da spec atualizado com evidencias objetivas.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` verdes e diff da spec com CAs marcados.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "plan_spec|PlanSpec|startPlanSession|runAll|runSpecs|selectProject|callback_query|status" src/core/runner.ts src/integrations/telegram-bot.ts src/main.ts src/types/state.ts` para mapear pontos exatos de edicao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` via `$EDITOR src/types/state.ts` para incluir fases/metadados de sessao `/plan_spec` necessarios para `/status` e guardrails.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para adicionar API de lifecycle (`start`, `status`, `submitInput`, `cancel`) e timeout de 30 min com cleanup seguro.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para bloquear `requestRunAll` e `requestRunSpecs` quando houver sessao `/plan_spec` ativa, com `status: "blocked"` e mensagem explicita.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` via `$EDITOR src/main.ts` para injetar no `TelegramController` os novos controles de sessao e ligar callbacks/eventos da sessao aos metodos `sendPlanSpec*`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` via `$EDITOR src/integrations/telegram-bot.ts` para registrar `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel`, rotear `on("text")` para sessao ativa e aplicar bloqueios de conflito em comandos/callbacks.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/integrations/telegram-bot.ts` para atualizar `/start` e `/status` com visibilidade da sessao `/plan_spec` e ultima atividade.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com casos de sessao unica, primeiro brief livre, bloqueios `/run_*`, cancelamento e timeout de inatividade.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com casos de novos comandos, roteamento de texto livre, guardrails de troca de projeto e gate por `TELEGRAM_ALLOWED_CHAT_ID`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada da entrega.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` via `$EDITOR ...` marcando CAs deste ticket e mantendo pendencias dos tickets remanescentes.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CA-01|CA-02|CA-03|CA-04|CA-05|CA-06|CA-17|CA-18|plan_spec|Status de atendimento" docs/specs/2026-02-19-telegram-plan-spec-conversation.md` para checagem final de rastreabilidade.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/types/state.ts src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-telegram-plan-spec-conversation.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: cobre `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel`, roteamento de primeira mensagem livre e bloqueio de troca de projeto durante sessao ativa (CA-01, CA-02, CA-04, CA-05, CA-06, CA-18).
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: runner bloqueia `/run_all` e `/run_specs` durante sessao ativa, mantem sessao unica global e encerra por timeout de 30 min com limpeza de estado (CA-03, CA-17).
- Comando: `rg -n "command\\(\"plan_spec\"|command\\(\"plan_spec_status\"|command\\(\"plan_spec_cancel\"|bot\\.on\\(\"text\"" src/integrations/telegram-bot.ts`
  - Esperado: comandos novos e roteamento de texto livre estao registrados.
- Comando: `rg -n "plan-spec|lastActivity|timeout|blocked" src/core/runner.ts src/types/state.ts src/integrations/telegram-bot.ts`
  - Esperado: contrato de estado da sessao, timeout e mensagens de bloqueio explicitas estao presentes.
- Comando: `npm test && npm run check && npm run build`
  - Esperado: suite completa verde sem regressao no fluxo sequencial existente.
- Comando: `rg -n "CA-01|CA-02|CA-03|CA-04|CA-05|CA-06|CA-17|CA-18" docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - Esperado: CAs deste ticket marcados com evidencia e pendencias restantes mantidas rastreaveis.

## Idempotence and Recovery
- Idempotencia:
  - chamar `/plan_spec` com sessao ativa nao cria segunda sessao; retorna mensagem de sessao ja em andamento.
  - reenviar `/plan_spec_cancel` apos sessao encerrada responde de forma segura, sem excecao.
  - reexecutar testes/comandos de validacao nao altera estado funcional do repositorio.
- Riscos:
  - corrida entre timeout e encerramento natural da sessao (close callback vs cancel manual).
  - regressao no bloqueio de comandos existentes se guardrails forem aplicados em pontos incompletos.
  - inconsistencias de fase se `RunnerState` nao for atualizado de forma atomica ao trocar estados de espera.
- Recovery / Rollback:
  - centralizar cleanup de sessao em funcao unica (cancelar timer, encerrar sessao Codex, limpar contexto) para reaproveitar em cancelamento, timeout e falha.
  - se guardrail causar regressao, manter bloqueio minimo no core (`requestRunAll`/`requestRunSpecs`) e desacoplar temporariamente bloqueio de UI ate corrigir mensagens/rotas.
  - em falha de timeout, permitir cancelamento manual via `/plan_spec_cancel` como via segura de recuperacao operacional.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.
- Dependencia funcional ja entregue:
  - `execplans/2026-02-19-plan-spec-codex-interactive-bridge-and-parser-gap.md` (bridge `/plan` + parser + callbacks `plan-spec:*`).
- Tickets relacionados (fora deste escopo):
  - `tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`
  - `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`
- Evidencias tecnicas usadas no planejamento:
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/types/state.ts`
  - `src/main.ts`
  - `src/integrations/codex-client.ts`
- Comandos de validacao previstos:
  - `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - `npm test`
  - `npm run check`
  - `npm run build`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunnerPhase` e `RunnerState` em `src/types/state.ts` para expor lifecycle/atividade da sessao `/plan_spec`.
  - API publica do `TicketRunner` para controlar sessao (`start/status/input/cancel`) e bloquear `requestRunAll`/`requestRunSpecs` durante sessao ativa.
  - `BotControls` em `src/integrations/telegram-bot.ts` para incluir comandos e roteamento de input da sessao.
- Compatibilidade:
  - manter fluxo sequencial de tickets/specs existente sem paralelizacao.
  - manter comportamento atual de callbacks `plan-spec:*`, agora vinculados a sessao ativa.
  - nao alterar neste ticket a etapa de materializacao/commit da spec.
- Dependencias externas e mocks:
  - dependencia externa principal permanece `telegraf` para comandos/callbacks.
  - sessao interativa usa `CodexCliTicketFlowClient.startPlanSession` ja existente.
  - testes devem continuar com stubs/mocks locais, sem chamadas reais a Codex/Telegram.
