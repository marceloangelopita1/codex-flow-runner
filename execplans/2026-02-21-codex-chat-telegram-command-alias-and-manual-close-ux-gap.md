# ExecPlan - Entrada Telegram de /codex_chat com alias, encerramento manual e handoff de comandos

## Purpose / Big Picture
- Objetivo: implementar a camada Telegram do fluxo `/codex_chat` com alias `/codex-chat`, roteamento de texto livre, encerramento manual por botao inline e troca de comando no mesmo update.
- Resultado esperado:
  - comando `/codex_chat` registrado e funcional no `TelegramController`.
  - alias textual `/codex-chat` registrado com semantica identica ao comando oficial.
  - mensagens de texto livre passam a ser roteadas para sessao `/codex_chat` ativa no chat correto.
  - cada resposta do Codex no fluxo `/codex_chat` inclui botao inline para encerramento manual.
  - callback de encerramento manual cancela sessao, confirma no chat e nao permite reuso de contexto ja encerrado.
  - ao receber outro comando durante sessao `/codex_chat`, o bot encerra a sessao e processa o novo comando na mesma mensagem/update.
  - `src/main.ts` injeta controles e handlers de `/codex_chat` no `TelegramController`.
  - cobertura automatizada em `src/integrations/telegram-bot.test.ts` cobre os novos contratos.
- Escopo:
  - evoluir `src/integrations/telegram-bot.ts` (controles, handlers, callbacks, roteamento de texto e UX de botao).
  - evoluir `src/main.ts` para wiring de controles e event handlers de `/codex_chat`.
  - evoluir `src/integrations/telegram-bot.test.ts` para cobrir comando, alias, roteamento, callback e handoff por comando.
- Fora de escopo:
  - ampliar `/status` para bloco detalhado de `/codex_chat`.
  - atualizacao ampla de README/comandos operacionais fora do minimo necessario para este ticket.
  - consolidacao de observabilidade completa RF-12/CA global (ticket separado `tickets/open/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`).

## Progress
- [x] 2026-02-21 00:30Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, spec e referencias de codigo.
- [x] 2026-02-21 02:15Z - Contratos de `BotControls` e wiring de `/codex_chat` em `main.ts` implementados.
- [x] 2026-02-21 02:15Z - Comando `/codex_chat` + alias `/codex-chat` registrados e help `/start` atualizado.
- [x] 2026-02-21 02:15Z - Roteamento de texto livre para sessao `/codex_chat` ativo e regra de handoff por comando implementados.
- [x] 2026-02-21 02:15Z - Callback de encerramento manual com protecao de contexto stale implementado.
- [x] 2026-02-21 02:15Z - Cobertura automatizada em `telegram-bot.test.ts` concluida e verde.
- [x] 2026-02-21 02:15Z - Validacao final (`npm run check`, `npm test`, `npm run build`) concluida sem regressao.

## Surprises & Discoveries
- 2026-02-21 00:30Z - O backend core de `/codex_chat` ja existe no runner (start/input/cancel/timeout/eventos), entao o gap atual e majoritariamente de integracao Telegram (`src/core/runner.ts`).
- 2026-02-21 00:30Z - `TelegramController` ainda nao possui contrato para controles de `/codex_chat` e o bootstrap em `main.ts` nao injeta handlers/eventos desse fluxo.
- 2026-02-21 00:30Z - O roteamento de texto livre atual e exclusivo de `/plan_spec` (`handlePlanSpecTextMessage`), sem branch para `codexChatSession`.
- 2026-02-21 00:30Z - `handleCallbackQuery` hoje so roteia `specs:`, `projects:` e `plan-spec:`, sem callback namespace para encerramento manual de `/codex_chat`.
- 2026-02-21 00:30Z - O ticket pai de backend foi fechado e movido para `tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md`; a referencia em `tickets/open/` esta desatualizada.

## Decision Log
- 2026-02-21 - Decisao: tratar `/codex-chat` como alias legado via `bot.hears(...)`, mantendo `/codex_chat` como comando oficial.
  - Motivo: alias com hifen pode nao ser reconhecido como `bot_command` nativo em todos os updates; pattern textual garante previsibilidade.
  - Impacto: novo regex dedicado e caminho de handler unico para ambos.
- 2026-02-21 - Decisao: implementar handoff de comando por middleware unico antes dos handlers de comando.
  - Motivo: requisito exige encerrar sessao `/codex_chat` e processar o novo comando no mesmo update, sem duplicar logica em cada handler.
  - Impacto: precisa detectar comando de entrada de forma consistente e excluir `/codex_chat`/`/codex-chat` da regra de auto-cancelamento.
- 2026-02-21 - Decisao: usar callback data de encerramento com `sessionId` (`codex-chat:close:<sessionId>`).
  - Motivo: evitar que botao antigo encerre sessao nova (stale callback) e impedir reuso de contexto fechado.
  - Impacto: parse/validacao adicional no callback handler e cobertura de testes stale.
- 2026-02-21 - Decisao: manter este plano focado em funcionalidade Telegram e testes locais, sem absorver backlog de observabilidade/doc completa.
  - Motivo: manter escopo P1 aderente ao ticket alvo e preservar sequencialidade do backlog (P0 -> P1 -> P2).
  - Impacto: itens de `/status` detalhado, README completo e cobertura de aceitacao fim-a-fim permanecem no ticket P2.

## Outcomes & Retrospective
- Status final: implementado e validado localmente (sem fechamento de ticket/commit nesta etapa).
- O que funcionou: comando oficial + alias, handoff por comando, roteamento de texto, callback stale-safe e wiring runner->Telegram foram entregues com cobertura automatizada.
- O que ficou pendente: observabilidade detalhada de `/status` e cobertura fim-a-fim completa permanecem no ticket P2 (`tickets/open/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`).
- Proximos passos: seguir para etapa de fechamento do ticket/commit em fluxo sequencial e depois atacar o P2 de observabilidade.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.ts` (contratos ja existentes de `/codex_chat` a serem consumidos)
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
- Fluxo atual relevante:
  - comando/help Telegram nao inclui `/codex_chat` nem alias `/codex-chat`.
  - texto livre e encaminhado apenas quando `planSpecSession` esta ativo.
  - nao existe callback prefix para encerramento manual de `/codex_chat`.
  - `main.ts` injeta controles somente de `/run_all`, `/run_specs`, `/plan_spec`, `/projects` e afins.
- Fluxo alvo deste ticket:
  - `/codex_chat` e `/codex-chat` iniciam a mesma sessao no runner (`startCodexChatSession`).
  - enquanto `state.codexChatSession` estiver ativo, mensagens livres do mesmo chat vao para `submitCodexChatInput`.
  - cada saida raw encaminhada pelo runner ao Telegram inclui botao inline para fechamento manual da sessao atual.
  - callback de fechamento chama `cancelCodexChatSession` e confirma resultado para operador.
  - se um comando diferente de `/codex_chat`/`/codex-chat` chegar durante sessao ativa, o bot cancela antes e deixa o handler do novo comando executar no mesmo update.
- Restricoes tecnicas:
  - manter compatibilidade com comandos existentes e com fluxo `/plan_spec`.
  - manter processamento sequencial (sem paralelizacao de tickets).
  - nao adicionar dependencias novas.

## Plan of Work
- Milestone 1 - Contratos e wiring de `/codex_chat`
  - Entregavel: `BotControls` exposto com `startCodexChatSession`, `submitCodexChatInput`, `cancelCodexChatSession` e bootstrap em `main.ts` com handlers de output/failure/lifecycle.
  - Evidencia de conclusao: `rg` mostra novos controles em `telegram-bot.ts` e injeção correspondente em `main.ts`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/main.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 2 - Entrada de comando oficial e alias legado
  - Entregavel: registro de `/codex_chat` e `/codex-chat` apontando para o mesmo handler com respostas tipadas (`started`, `already-active`, `blocked`, `failed`).
  - Evidencia de conclusao: testes garantem que ambos acionam o mesmo controle e retornam mensagens esperadas.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Roteamento de texto livre e handoff de comando
  - Entregavel: mensagens livres roteadas para sessao `/codex_chat` ativa; comando concorrente encerra sessao e segue processamento no mesmo update.
  - Evidencia de conclusao: testes cobrem input aceito/ignorado e cenario de comando concorrente que cancela sessao antes de executar o novo comando.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - UX de encerramento manual por botao inline
  - Entregavel: respostas de `/codex_chat` enviadas com botao de encerramento; callback valida contexto/sessao e confirma fechamento.
  - Evidencia de conclusao: testes validam `reply_markup` por resposta, callback aceito, callback stale e ausencia de reuso de contexto encerrado.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Validacao final e regressao
  - Entregavel: suite focada e regressao geral verdes sem quebrar `/plan_spec`, `/specs` e comandos existentes.
  - Evidencia de conclusao: `npx tsx --test ...`, `npm run check`, `npm test`, `npm run build` concluidos com sucesso.
  - Arquivos esperados: arquivos alterados dos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes da implementacao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "BotControls|registerHandlers|handleCallbackQuery|handlePlanSpecTextMessage|buildStartReply" src/integrations/telegram-bot.ts` para mapear pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para estender `BotControls` com controles de `/codex_chat` e adicionar constantes/prefixos (`/codex-chat`, callback close).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar handler unificado de inicio `/codex_chat` (comando oficial + alias legado) com logging e mensagens de retorno observaveis.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `START_REPLY_LINES` para listar `/codex_chat` e alias `/codex-chat` no help do bot.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar roteador de texto livre para `/codex_chat` ativo, preservando o fluxo existente de `/plan_spec`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Introduzir middleware de handoff: detectar comando concorrente durante sessao `/codex_chat`, cancelar sessao e seguir com o handler do proprio comando no mesmo update.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar envio de output de `/codex_chat` com botao inline de encerramento manual por sessao ativa.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar callback `codex-chat:close:<sessionId>` com validacao de contexto stale, `answerCbQuery` e confirmacao no chat.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar helpers de reply para start/cancel/input de `/codex_chat` mantendo semantica de mensagens acionaveis.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` para injetar controles do runner (`startCodexChatSession`, `submitCodexChatInput`, `cancelCodexChatSession`) no `TelegramController`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` para conectar `codexChatEventHandlers` do runner aos novos metodos de envio Telegram (output/failure/lifecycle).
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar helpers e fixtures de `src/integrations/telegram-bot.test.ts` para incluir novos controles e estados de `codexChatSession`.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes para: comando `/codex_chat`, alias `/codex-chat`, texto livre em sessao ativa, botao de close por resposta, callback de close e callback stale.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar teste de handoff por comando: com sessao `/codex_chat` ativa, comando diferente cancela sessao e executa o comando novo no mesmo update.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para validacao focada do controller.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test && npm run build` para regressao completa.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar com `git diff -- src/integrations/telegram-bot.ts src/main.ts src/integrations/telegram-bot.test.ts`.

## Validation and Acceptance
- Comando: `rg -n "codex_chat|codex-chat" src/integrations/telegram-bot.ts`
  - Esperado: ha registro do comando oficial, alias legado e help atualizado.
- Comando: `rg -n "startCodexChatSession|submitCodexChatInput|cancelCodexChatSession|codexChatEventHandlers" src/main.ts src/integrations/telegram-bot.ts`
  - Esperado: wiring entre runner e Telegram para controles e eventos de `/codex_chat` esta presente.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: testes cobrem CA-01, CA-02, CA-04, CA-05 e CA-07 do recorte Telegram, incluindo stale callback e handoff de comando.
- Comando: `npm run check`
  - Esperado: tipagem verde apos expansao de contratos do `TelegramController` e bootstrap em `main.ts`.
- Comando: `npm test && npm run build`
  - Esperado: regressao completa verde sem quebra dos fluxos existentes (`/plan_spec`, `/specs`, `/projects`, `/run_all`).

## Idempotence and Recovery
- Idempotencia:
  - repetir `/codex_chat` com sessao ativa retorna `already-active` sem abrir nova sessao.
  - callback de close repetido ou stale nao reabre/nao fecha sessao indevida; retorna resposta observavel de sessao inativa/expirada.
  - reexecucao dos testes e comandos de validacao nao gera mudanca funcional fora dos arquivos alterados.
- Riscos:
  - ordem de middlewares do Telegraf pode impedir handoff se o cancelamento ocorrer tarde demais no pipeline.
  - alias `/codex-chat` pode competir com fallback de comando desconhecido se registro/ordem nao forem consistentes.
  - callback sem `sessionId` validado pode permitir fechamento incorreto de sessao nova por botao antigo.
  - regressao no roteamento de texto livre pode afetar fluxo `/plan_spec` se a precedencia de sessao nao for explicita.
- Recovery / Rollback:
  - encapsular handoff em helper isolado para rollback rapido caso gere side effects em comandos existentes.
  - manter fallback de seguranca: se validacao de callback falhar, responder stale/inativo e nao chamar cancelamento.
  - em regressao no roteamento textual, restaurar rapidamente branch exclusiva de `/plan_spec` e reaplicar mudanca por etapas com testes focados.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md`.
- Spec de referencia: `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`.
- Ticket pai (backend ja entregue): `tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md`.
- Documento de processo consultado: `INTERNAL_TICKETS.md`.
- Evidencias tecnicas do ticket usadas para orientar o plano:
  - `src/integrations/telegram-bot.ts:31`
  - `src/integrations/telegram-bot.ts:329`
  - `src/integrations/telegram-bot.ts:476`
  - `src/integrations/telegram-bot.ts:539`
  - `src/integrations/telegram-bot.ts:543`
  - `src/integrations/telegram-bot.ts:610`
  - `src/main.ts:152`
- Observacao operacional: implementacao concluida neste passo com validacao local verde (`npx tsx --test src/integrations/telegram-bot.test.ts`, `npm run check`, `npm test`, `npm run build`).

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/integrations/telegram-bot.ts`:
    - `BotControls` com metodos de `/codex_chat`.
    - novos handlers de comando/alias, texto livre e callback close.
    - novos metodos publicos para envio de output/failure/lifecycle de `/codex_chat` para Telegram.
  - `src/main.ts`:
    - injecao dos novos controles no `TelegramController`.
    - conexao de `codexChatEventHandlers` do runner para metodos do Telegram.
  - `src/integrations/telegram-bot.test.ts`:
    - stubs de controles atualizados e novos cenarios de teste para `/codex_chat`.
- Compatibilidade:
  - preservar contratos existentes de `/plan_spec`, `/specs`, `/projects`, `/run_all` e controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID`.
  - manter fluxo sequencial do runner sem paralelizacao de tickets.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime.
  - reuso de `telegraf` para comandos, `hears`, callback query e inline keyboard.
  - testes seguem com doubles locais, sem chamadas reais ao Telegram ou Codex CLI.
