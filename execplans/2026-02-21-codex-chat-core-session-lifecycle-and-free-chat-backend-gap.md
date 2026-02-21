# ExecPlan - Backend core de sessao /codex_chat e free chat sem bootstrap /plan

## Purpose / Big Picture
- Objetivo: implementar o backend dedicado de sessao `/codex_chat` no core (`state` + `runner`) e no cliente Codex interativo, mantendo isolamento de `/plan_spec`.
- Resultado esperado:
  - existe estado dedicado para `/codex_chat` no `RunnerState`, sem quebrar `planSpecSession`;
  - o runner expoe API para iniciar, enviar input e encerrar sessao `/codex_chat`;
  - o cliente interativo do Codex suporta conversa livre stateful sem enviar `/plan` automaticamente;
  - existe no maximo uma sessao `/codex_chat` ativa por instancia;
  - timeout de inatividade de 10 minutos encerra a sessao;
  - inicio de `/codex_chat` com `/plan_spec` ativo retorna bloqueio tipado e mensagem acionavel;
  - comportamento fica coberto em testes automatizados de `runner` e `codex-client`.
- Escopo:
  - evoluir contratos de tipo para sessao `/codex_chat` em `src/types/state.ts`.
  - evoluir `src/integrations/codex-client.ts` com sessao interativa de chat livre (sem primer/parser de `/plan_spec`).
  - implementar lifecycle da sessao `/codex_chat` em `src/core/runner.ts` (start/input/cancel/timeout/cleanup).
  - adicionar cobertura automatizada em `src/core/runner.test.ts` e `src/integrations/codex-client.test.ts`.
- Fora de escopo:
  - comando Telegram `/codex_chat` e alias `/codex-chat`, botao inline e fechamento por troca de comando (ticket `tickets/open/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md`).
  - status/logs finais de observabilidade, README/help e cobertura CA fim-a-fim do fluxo Telegram (ticket `tickets/open/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`).

## Progress
- [x] 2026-02-21 00:14Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, spec e referencias tecnicas.
- [x] 2026-02-21 00:27Z - Contratos de tipo (`state`, resultados e eventos) de `/codex_chat` definidos e aplicados.
- [x] 2026-02-21 00:27Z - Cliente Codex com sessao interativa de chat livre (sem `/plan`) implementado e validado.
- [x] 2026-02-21 00:27Z - Lifecycle completo de `/codex_chat` no runner (start/input/cancel/timeout/guardas) implementado.
- [x] 2026-02-21 00:27Z - Suites `runner.test.ts` e `codex-client.test.ts` atualizadas e verdes.
- [x] 2026-02-21 00:27Z - Validacao final (`check`, `test`, `build`) concluida sem regressao do fluxo sequencial.

## Surprises & Discoveries
- 2026-02-21 00:14Z - `RunnerState` atualmente contem apenas `planSpecSession`; nao existe espaco para sessao `/codex_chat` (`src/types/state.ts`).
- 2026-02-21 00:14Z - O runner so expoe lifecycle de sessao para `/plan_spec` e reaproveita estruturas especificas dessa jornada (`src/core/runner.ts`).
- 2026-02-21 00:14Z - O cliente interativo atual e fortemente acoplado a `/plan_spec` por bootstrap `/plan`, primer `PLAN_SPEC_*` e hint de retry dedicado (`src/integrations/codex-client.ts`).
- 2026-02-21 00:14Z - Ja existe o reason tipado `plan-spec-active` em tipo interno de bloqueio do runner, mas ele nao e utilizado no fluxo atual.
- 2026-02-21 00:14Z - Mocks de teste de `runner` e `telegram-bot` assumem shape atual de `RunnerState`; mudancas de contrato podem exigir ajustes de fixture para manter compilacao.

## Decision Log
- 2026-02-21 - Decisao: introduzir sessao `/codex_chat` dedicada, paralela em conceito a `/plan_spec`, sem reaproveitar estado `planSpecSession`.
  - Motivo: evitar acoplamento semantico e risco de mistura de contexto entre fluxos conversacionais com objetivos diferentes.
  - Impacto: novos tipos/campos em `src/types/state.ts` e novos metodos publicos no `TicketRunner`.
- 2026-02-21 - Decisao: evoluir `codex-client` para suportar sessao interativa de chat livre sem bootstrap `/plan` nem parser de blocos `PLAN_SPEC_*`.
  - Motivo: RF-03 e CA-10 exigem ausencia de auto-entrada em modo planejamento.
  - Impacto: novo contrato de sessao/evento para chat livre e cobertura dedicada em `src/integrations/codex-client.test.ts`.
- 2026-02-21 - Decisao: bloquear inicio de `/codex_chat` quando houver `/plan_spec` ativo com reason tipado explicito.
  - Motivo: requisito funcional RF-11 e necessidade de resposta acionavel para camada Telegram.
  - Impacto: `startCodexChatSession` passa a retornar `status: "blocked"` com reason especifico e mensagem clara.
- 2026-02-21 - Decisao: timeout de 10 minutos implementado com timer resetado por atividade (input do operador e evento do Codex), com cleanup centralizado.
  - Motivo: evitar sessao zumbi e reduzir risco de corrida entre timeout, cancelamento manual e encerramento de processo.
  - Impacto: nova infraestrutura de timeout/finalizacao para `/codex_chat` no runner, separada da sessao `/plan_spec`.

## Outcomes & Retrospective
- Status final: implementacao concluida com aceite tecnico `GO`.
- O que funcionou: separacao entre backend `/codex_chat` e fluxo `/plan_spec` foi mantida sem regressao nas suites existentes.
- O que ficou pendente: integracao Telegram de `/codex_chat` e observabilidade/UX final permanecem nos tickets relacionados de menor escopo.
- Proximos passos: seguir fluxo sequencial com os tickets `2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap` e `2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap`.

## Context and Orientation
- Arquivos principais:
  - `src/types/state.ts` - contrato de estado global do runner e fases operacionais.
  - `src/core/runner.ts` - lifecycle de sessao, timeout, guardas de conflito e cleanup.
  - `src/integrations/codex-client.ts` - bridge interativa com Codex CLI e contratos de sessao.
  - `src/core/runner.test.ts` - cobertura de lifecycle do core com stubs de sessao.
  - `src/integrations/codex-client.test.ts` - cobertura de bootstrap, input e eventos do cliente interativo.
- Fluxo atual:
  - somente `/plan_spec` tem sessao interativa stateful no backend.
  - `startPlanSession` injeta `/plan` e primer estruturado por design.
  - timeout atual de sessao interativa e de 30 minutos e exclusivo de `/plan_spec`.
- Restricoes tecnicas:
  - manter fluxo sequencial do runner sem paralelizacao de tickets.
  - preservar contrato atual de `/plan_spec` sem regressao.
  - evitar dependencia externa nova; reutilizar infraestrutura interativa existente.

## Plan of Work
- Milestone 1 - Contrato de sessao `/codex_chat` no estado e no core.
  - Entregavel: tipos de estado/resultado para `/codex_chat` (sessao ativa, fase, timestamps, guardas de bloqueio).
  - Evidencia de conclusao: diff em `src/types/state.ts` e `src/core/runner.ts` com novos tipos e APIs publicas.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`.
- Milestone 2 - Sessao interativa de chat livre no `codex-client`.
  - Entregavel: metodo dedicado para iniciar sessao de conversa livre sem envio automatico de `/plan` e sem parser de planejamento.
  - Evidencia de conclusao: testes demonstram ausencia de `/plan` e de primer `PLAN_SPEC_*`, mantendo input/output interativo funcional.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 3 - Lifecycle `/codex_chat` no runner (start/input/cancel/timeout).
  - Entregavel: API `start/submit/cancel` com sessao unica global, validacao de chat, timeout de 10 minutos e finalizacao segura.
  - Evidencia de conclusao: testes no runner cobrindo sessao unica, bloqueio por `/plan_spec`, timeout e limpeza de estado.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 4 - Compatibilidade e hardening de integração interna.
  - Entregavel: cleanup consistente em `shutdown`, `getState` clonado corretamente e sem quebrar fluxo `/plan_spec`.
  - Evidencia de conclusao: regressao de testes existentes do runner e cliente sem falhas relacionadas a `/plan_spec`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, possivel ajuste de fixtures tipadas em `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Validacao de aceitacao tecnica do ticket.
  - Entregavel: suite focada verde (`runner` + `codex-client`) e regressao geral sem quebra de build/tipagem.
  - Evidencia de conclusao: comandos de validacao executados com resultado esperado observavel.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/codex-client.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "planSpecSession|startPlanSession|PLAN_SPEC|timeout|isPlanSpecSessionActive" src/types/state.ts src/core/runner.ts src/integrations/codex-client.ts` para mapear pontos de extensao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` via `$EDITOR src/types/state.ts` para incluir tipos/campos de sessao `/codex_chat` e fases associadas no estado.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para adicionar contrato da sessao interativa de chat livre e metodo de start dedicado sem bootstrap `/plan`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir o erro de sessao interativa no cliente para mensagem de retry coerente com o modo (`/plan_spec` vs `/codex_chat`) sem quebrar testes existentes.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para adicionar tipos/resultados publicos de `/codex_chat` e estado em memoria da sessao ativa.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `startCodexChatSession(chatId)` no runner com guardas de conflito (`plan-spec-active`), autenticacao, sessao unica e snapshot de projeto.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `submitCodexChatInput(chatId, input)` e `cancelCodexChatSession(chatId)` com rejeicao de input vazio/chat incorreto e transicoes de fase.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar timeout de 10 minutos em `runner.ts` com reset por atividade e finalizacao centralizada (cancel/close/timeout).
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `shutdown` e clone de `getState` para considerar sessao `/codex_chat` ativa sem regressao da sessao `/plan_spec`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar stubs/helpers de `src/core/runner.test.ts` para suportar o novo contrato do `CodexTicketFlowClient` e adicionar cenarios de `/codex_chat` previstos no ticket.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` com cenarios de `startFreeChatSession` (sem `/plan`, sem primer `PLAN_SPEC_*`, input livre e falha acionavel).
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario para tipagem, ajustar fixtures de `RunnerState` em `src/integrations/telegram-bot.test.ts` sem adicionar comportamento novo de `/codex_chat` neste ticket.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/codex-client.test.ts` para validacao focada.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar com `git status --short` e `git diff -- src/types/state.ts src/core/runner.ts src/integrations/codex-client.ts src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: ha cobertura provando que a sessao de chat livre nao envia `/plan` automaticamente, nao injeta primer `PLAN_SPEC_*` e continua aceitando input/output interativo.
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: ha cobertura para sessao unica de `/codex_chat`, bloqueio de start quando `/plan_spec` esta ativo (reason tipado), timeout de 10 minutos e encerramento com limpeza de estado.
- Comando: `rg -n "codexChatSession|startCodexChatSession|submitCodexChatInput|cancelCodexChatSession|plan-spec-active" src/types/state.ts src/core/runner.ts`
  - Esperado: contratos e guardas do backend `/codex_chat` estao declarados e visiveis no codigo.
- Comando: `npm run check`
  - Esperado: tipagem completa verde, incluindo pontos que usam `RunnerState` e `CodexTicketFlowClient`.
- Comando: `npm test && npm run build`
  - Esperado: suite geral e build concluem sem regressao no fluxo `/plan_spec` e no runner sequencial.

## Idempotence and Recovery
- Idempotencia:
  - repetir `startCodexChatSession` com sessao ativa nao cria nova sessao; retorna estado de sessao ja ativa.
  - repetir `cancelCodexChatSession` apos encerramento responde de forma segura (`inactive`) sem excecao.
  - reexecutar testes/comandos de validacao nao altera estado funcional do repositorio.
- Riscos:
  - corrida entre timeout, cancelamento manual e callback de close da sessao interativa.
  - regressao acidental no fluxo `/plan_spec` ao refatorar contratos compartilhados no `codex-client`.
  - flood de output bruto no chat livre se nao houver estrategia minima de saneamento/agregacao.
- Recovery / Rollback:
  - centralizar finalizacao de `/codex_chat` em funcao unica para cleanup deterministico de timer/processo/estado.
  - manter compatibilidade do caminho `/plan_spec`; em regressao, isolar alteracoes do chat livre atras de novos metodos sem tocar caminho legado.
  - se integracao interativa falhar em runtime, encerrar sessao com mensagem acionavel de retry e preservar runner operacional.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md`.
- Spec de referencia: `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`.
- Tickets relacionados fora deste escopo:
  - `tickets/open/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md`
  - `tickets/open/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`
- Evidencias tecnicas usadas no planejamento:
  - `src/types/state.ts`
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/main.ts`
  - `src/integrations/telegram-bot.ts`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunnerState` e possiveis fases em `src/types/state.ts` para incluir sessao `/codex_chat`.
  - API publica do `TicketRunner` em `src/core/runner.ts` com operacoes de lifecycle `/codex_chat` e resultado tipado de bloqueio.
  - `CodexTicketFlowClient` em `src/integrations/codex-client.ts` com metodo de sessao interativa de chat livre separado de `startPlanSession`.
  - stubs/mocks de teste em `src/core/runner.test.ts` (e eventualmente fixtures tipadas em `src/integrations/telegram-bot.test.ts`).
- Compatibilidade:
  - preservar comportamento existente de `/plan_spec` (parser, bootstrap `/plan`, callbacks atuais).
  - manter processamento sequencial e sem paralelizacao de tickets.
  - nao introduzir mudanca funcional de comandos Telegram neste ticket.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime planejadas; reutilizar `codex` interativo ja existente.
  - testes devem continuar usando processos fakes/stubs, sem chamadas reais a Codex ou Telegram.
