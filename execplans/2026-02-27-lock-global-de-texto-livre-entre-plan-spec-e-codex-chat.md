# ExecPlan - Lock global de texto livre entre /plan_spec e /codex_chat

## Purpose / Big Picture
- Objetivo: implementar exclusao mutua global, bidirecional e taxonomicamente unificada para sessoes de texto livre (`/plan_spec` e `/codex_chat`), sem reintroduzir lock global para runs por projeto.
- Resultado esperado:
  - tentativa de iniciar `/plan_spec` ou `/codex_chat` com qualquer sessao global de texto livre ativa retorna `blocked` com motivo `global-free-text-busy`.
  - roteamento de mensagens de texto livre no Telegram ocorre apenas para a sessao global ativa, evitando dupla submissao para handlers distintos.
  - logs e respostas observaveis deixam de usar `plan-spec-active` para esse conflito e convergem para `global-free-text-busy`.
  - `/run_all` e `/run_specs` em projeto diferente permanecem elegiveis quando houver capacidade.
- Escopo:
  - evoluir contrato de bloqueio e fluxo de inicio de sessoes em `src/core/runner.ts`.
  - consolidar gate de roteamento de texto livre e ajuste de handoff em `src/integrations/telegram-bot.ts`.
  - atualizar cobertura automatizada em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` para CA-03, CA-04, CA-06 e CA-08.
  - atualizar rastreabilidade da spec de origem em `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`.
- Fora de escopo:
  - alterar limite global de capacidade de runners (`RUNNER_SLOT_LIMIT`).
  - paralelizar tickets dentro do mesmo projeto.
  - reabrir o tema de lock global de tickets (ja removido no ticket P0 fechado em 2026-02-27).
  - fechar ticket, mover para `tickets/closed/`, commitar ou fazer push nesta etapa de planejamento.

## Progress
- [x] 2026-02-27 04:39Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, specs relacionadas e trechos de codigo/teste referenciados.
- [x] 2026-02-27 04:48Z - Contrato de lock global de texto livre alinhado no runner (`global-free-text-busy` bidirecional).
- [x] 2026-02-27 04:48Z - Roteamento de texto livre no Telegram consolidado para sessao global unica ativa.
- [x] 2026-02-27 04:48Z - Cobertura de testes runner/Telegram atualizada para cenarios de bloqueio e roteamento.
- [x] 2026-02-27 04:48Z - Validacao final (tests + check + build) concluida e evidenciada.

## Surprises & Discoveries
- 2026-02-27 04:39Z - `startCodexChatSession` bloqueia com `plan-spec-active`, mas `startPlanSpecSession` nao valida sessao `/codex_chat` ativa antes de reservar slot, mantendo assimetria real no core (`src/core/runner.ts`).
- 2026-02-27 04:39Z - o Telegram roteia todo `on("text")` para `handleCodexChatTextMessage` e `handlePlanSpecTextMessage` em sequencia, sem gate unico de sessao ativa (`src/integrations/telegram-bot.ts`).
- 2026-02-27 04:39Z - middleware de command handoff do `/codex_chat` encerra sessao antes de comandos como `/plan_spec`; isso conflita com CA-04 da spec alvo (espera bloqueio `global-free-text-busy` em vez de handoff implicito).
- 2026-02-27 04:39Z - existe teste cobrindo apenas um sentido do bloqueio (`/codex_chat` bloqueado por `/plan_spec`); nao ha cobertura equivalente para `/plan_spec` bloqueado por `/codex_chat`.

## Decision Log
- 2026-02-27 - Decisao: introduzir motivo unico `global-free-text-busy` para conflito de texto livre em ambos os comandos de inicio.
  - Motivo: atender RF-05/RF-06/RF-10 e remover ambiguidade taxonomica entre dominos equivalentes.
  - Impacto: unioes TypeScript, mensagens de bloqueio, asserts de testes e rastreabilidade de logs serao atualizados.
- 2026-02-27 - Decisao: manter lock por projeto e capacidade global como regras de admissao de slot; lock global de texto livre sera regra adicional apenas para sessoes interativas.
  - Motivo: preservar a separacao de dominos aprovada na spec (runs por projeto vs texto livre global).
  - Impacto: `reserveSlot` permanece responsavel por `project-slot-busy`/`runner-capacity-maxed`; gate global de texto livre fica explicito no inicio de sessao.
- 2026-02-27 - Decisao: consolidar roteamento de mensagem livre no Telegram com um gate de sessao ativa, em vez de encadear dois handlers sem decisao central.
  - Motivo: evitar dupla entrega em caso de estado inconsistente e cumprir CA-06 de roteamento unico.
  - Impacto: mudanca localizada em `src/integrations/telegram-bot.ts` e testes de roteamento/handoff.

## Outcomes & Retrospective
- Status final: executado (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - lock bidirecional de texto livre aplicado no `runner` com motivo unico `global-free-text-busy`.
  - gate unico de texto livre aplicado no Telegram com handoff de `/codex_chat` preservando tentativa de `/plan_spec`.
  - validacao automatizada verde em `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`.
- O que ficou pendente:
  - fechar ticket (`tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md`) e mover para `tickets/closed/` no mesmo commit da entrega.
  - executar etapa de versionamento (commit/push), fora do escopo deste passo.
- Proximos passos:
  - seguir com etapa de fechamento operacional do ticket e versionamento da entrega em fluxo sequencial.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md`
  - `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Fluxo atual relevante:
  - inicio de sessao `/plan_spec` e `/codex_chat` resolve projeto, reserva slot por projeto e inicia sessao interativa no Codex.
  - apenas `/codex_chat` verifica conflito com `/plan_spec` ativo (motivo atual `plan-spec-active`), deixando falta de bloqueio simetrico.
  - roteamento de texto no Telegram chama dois handlers sequenciais (`codex_chat` e `plan_spec`) no mesmo update.
  - `/status` ja expone estado de sessoes de texto livre e capacidade por projeto separadamente.
- Restricoes tecnicas:
  - manter Node.js 20+ com TypeScript e sem novas dependencias.
  - preservar fluxo sequencial de tickets por projeto.
  - nao bloquear runs cross-project por causa do lock global de texto livre.
- Termos usados neste plano:
  - lock global de texto livre: exclusao mutua unica entre `/plan_spec` e `/codex_chat`, independente de projeto.
  - taxonomia de bloqueio: motivo tipado observavel em resposta/log (`global-free-text-busy`, `project-slot-busy`, `runner-capacity-maxed`).

## Plan of Work
- Milestone 1 - Contrato global bidirecional de lock para texto livre no runner
  - Entregavel: `startPlanSpecSession` e `startCodexChatSession` passam a negar inicio quando qualquer sessao global de texto livre estiver ativa, usando `global-free-text-busy`.
  - Evidencia de conclusao: testes de start em ambos os sentidos retornam `blocked` com motivo unificado e mensagem acionavel.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2 - Taxonomia e observabilidade alinhadas
  - Entregavel: remocao de `plan-spec-active` como motivo de conflito de texto livre em contratos e logs observaveis; mensagens convergem para semantica global.
  - Evidencia de conclusao: busca textual no `src/` nao encontra uso runtime de `plan-spec-active` nesse dominio; asserts passam com `global-free-text-busy`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Gate unico de roteamento de texto livre no Telegram
  - Entregavel: mensagem livre e encaminhada apenas para a sessao ativa (`/plan_spec` ou `/codex_chat`), sem cadeia cega de handlers.
  - Evidencia de conclusao: testes de Telegram validam entrega unica e ausencia de dupla chamada de submit no mesmo update.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Compatibilizacao do handoff de comandos com lock global
  - Entregavel: tentativa de abrir `/plan_spec` durante `/codex_chat` ativo respeita bloqueio global esperado (sem encerrar automaticamente a sessao em conflito, quando aplicavel).
  - Evidencia de conclusao: teste dedicado confirma CA-04 (`global-free-text-busy`) na camada Telegram/runner.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/core/runner.test.ts`.
- Milestone 5 - Rastreabilidade de spec e regressao final
  - Entregavel: spec de 2026-02-27 atualizada com RF/CA atendidos e historico da entrega.
  - Evidencia de conclusao: secao de status da spec marca fechamento dos gaps de lock global de texto livre com evidencias de teste.
  - Arquivos esperados: `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "plan-spec-active|global-free-text-busy|startPlanSpecSession|startCodexChatSession|bot.on\(\"text\"" src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts` para mapear pontos de contrato e cobertura.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para criar helper explicito de conflito de sessao global de texto livre e aplicalo no inicio de `/plan_spec` e `/codex_chat`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar unioes de tipos em `src/core/runner.ts` para usar `global-free-text-busy` no contrato de bloqueio de sessoes interativas.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar mensagens e logs em `src/core/runner.ts` para refletir conflito global de texto livre com contexto do comando ativo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/integrations/telegram-bot.ts` para substituir o encadeamento de dois handlers de texto por gate unico que roteia para apenas uma sessao ativa.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `handleCodexChatCommandHandoff` em `src/integrations/telegram-bot.ts` para manter compatibilidade com CA-04, evitando handoff implicito quando o proximo comando for `/plan_spec`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios bidirecionais de bloqueio (`/plan_spec` -> `/codex_chat` e `/codex_chat` -> `/plan_spec`) esperando `global-free-text-busy`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para validar roteamento unico de texto livre, bloqueio observado ao tentar `/plan_spec` durante `/codex_chat` e contratos de reply.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada dos CAs do ticket.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipos e build apos mudancas de contrato.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md` com atendimento de RF-05, RF-06, RF-08 e CA-03, CA-04, CA-06, CA-08.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: inicio cruzado de sessoes de texto livre falha nos dois sentidos com `blocked` + `reason: global-free-text-busy`.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: update de texto livre aciona apenas um submit por mensagem; tentativa de `/plan_spec` com `/codex_chat` ativo retorna resposta de bloqueio alinhada.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao em fluxo de tickets, callbacks e observabilidade.
- Comando: `npm run check && npm run build`
  - Esperado: sem erros de tipagem/build apos evolucao das unioes de motivos e handlers.
- Comando: `rg -n "plan-spec-active" src/core src/integrations`
  - Esperado: sem ocorrencia runtime para bloqueio de texto livre (eventuais ocorrencias aceitas apenas em historico/documentacao).
- Comando: `rg -n "global-free-text-busy" src/core src/integrations src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: motivo presente em contratos de start, mensagens de bloqueio e cobertura automatizada correspondente.
- Criterios de aceite cobertos:
  - CA-03 e CA-04: bloqueio bidirecional com motivo `global-free-text-busy`.
  - CA-06: roteamento de texto livre para unica sessao ativa.
  - CA-08: taxonomia de bloqueio observavel e acionavel.
  - CA-05: runs em projeto diferente continuam elegiveis quando houver capacidade e sem lock global de ticket.

## Idempotence and Recovery
- Idempotencia:
  - repetir tentativa de start da segunda sessao de texto livre deve retornar sempre o mesmo bloqueio tipado, sem criar sessao adicional.
  - repetir processamento de mensagem livre no mesmo estado deve encaminhar input para um unico backend por update.
- Riscos:
  - conflito com regra legada de handoff do `/codex_chat` para outros comandos pode causar divergencia de comportamento esperado em CA-04.
  - alteracao no roteamento de texto do Telegram pode quebrar comandos nao relacionados se o parse de comando nao for preservado.
  - mudanca de union types pode exigir ajuste em stubs/fixtures de teste e provocar falhas de compilacao cruzadas.
- Recovery / Rollback:
  - introduzir as mudancas em duas camadas (core primeiro, Telegram depois) para isolar regressao.
  - se ocorrer regressao ampla no bot, manter lock bidirecional no core e reverter temporariamente apenas o gate de roteamento ate cobertura adicional.
  - validar cada etapa com suites focadas (`runner` e `telegram-bot`) antes do `npm test` completo.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md`.
- Referencias consumidas para este plano:
  - `PLANS.md`
  - `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Ticket/entrega correlata ja concluida (contexto de dominio):
  - `tickets/closed/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md`
  - `execplans/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md`
- Evidencias esperadas ao final da execucao:
  - diff focalizado em core + Telegram + testes + atualizacao da spec de origem.
  - suites de teste/validacao verdes com rastreabilidade CA-03/CA-04/CA-06/CA-08.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunnerRequestBlockedReason` e resultados de start de sessao (`PlanSpecSessionStartResult`, `CodexChatSessionStartResult`) para incluir/usar `global-free-text-busy`.
  - contratos de reply/controle no Telegram que consumem `CodexChatSessionStartResult` e `PlanSpecSessionStartResult`.
- Compatibilidade:
  - comandos existentes permanecem os mesmos; muda a semantica de conflito entre `/plan_spec` e `/codex_chat` para bloqueio global explicito.
  - comportamento de handoff para comandos concorrentes pode ser refinado especificamente para manter CA-04 sem afetar comandos nao conflitantes.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime.
  - reaproveitar stubs existentes de runner/codex/telegram nos testes.
