# ExecPlan - Fluxo Telegram de tickets abertos para listagem, selecao e leitura integral

## Purpose / Big Picture
- Objetivo: fechar o gap do ticket `tickets/closed/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`, entregando no Telegram o fluxo completo de "Tickets abertos" (entrada, listagem, selecao e leitura integral do arquivo).
- Resultado esperado:
  - o bot passa a expor comando dedicado para abrir a lista de tickets em `tickets/open/`.
  - a listagem usa ordenacao deterministica e navegacao por botoes inline.
  - ao selecionar um ticket valido, o bot envia todo o conteudo do arquivo com chunking ordenado quando exceder limite de mensagem.
  - se nao houver ticket aberto, o bot responde status informativo sem erro tecnico.
  - se o ticket sumir entre listagem e selecao, o bot responde erro funcional claro e orienta atualizar a lista.
  - apos exibir o conteudo, o bot exibe acao "Implementar este ticket" reaproveitando o callback ja existente.
- Escopo:
  - evoluir `src/integrations/telegram-bot.ts` com comando/UX de "Tickets abertos", callbacks de paginacao/selecao e envio chunked.
  - evoluir o contrato de `BotControls` e wiring em `src/main.ts` para listar e ler tickets abertos do projeto ativo.
  - evoluir `src/integrations/ticket-queue.ts` (ou modulo equivalente) com API nao destrutiva para listagem/leitura de tickets abertos mantendo ordenacao deterministica.
  - cobrir fluxo com testes automatizados em `src/integrations/telegram-bot.test.ts` e `src/integrations/ticket-queue.test.ts`.
  - atualizar rastreabilidade na spec de origem e no ticket ao final da implementacao.
- Fora de escopo:
  - reimplementar a execucao unitaria de ticket (`run-ticket`), ja entregue no ticket fechado `tickets/closed/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`.
  - alterar lock global de ticket, capacidade do runner ou contratos de concorrencia do core.
  - alterar fluxo `/run_all`, `/run_specs`, `/plan_spec` e `/codex_chat` alem do necessario para adicionar o novo comando no help.

## Progress
- [x] 2026-02-23 17:00Z - Planejamento inicial concluido com leitura do ticket alvo, `PLANS.md`, spec relacionada e referencias de codigo/testes.
- [x] 2026-02-23 17:08Z - Contrato de listagem/leitura de tickets abertos definido e integrado ao Telegram.
- [x] 2026-02-23 17:08Z - Fluxo de comando/callback de "Tickets abertos" implementado com chunking e tratamento de erros funcionais.
- [x] 2026-02-23 17:11Z - Testes automatizados e validacoes finais concluidos.
- [x] 2026-02-23 17:14Z - Ticket/spec atualizados com rastreabilidade de entrega.

## Surprises & Discoveries
- 2026-02-23 17:00Z - A acao "Implementar este ticket" ja existe no bot (`ticket-run:*`) e no runner (`requestRunSelectedTicket`), entao este plano deve conectar a listagem/leitura a essa acao, nao recria-la.
- 2026-02-23 17:00Z - O ticket original cita ausencia de callback `ticket-run`, mas o codigo atual ja contem esse fluxo (ticket irmao ja fechado).
- 2026-02-23 17:00Z - `FileSystemTicketQueue` ja implementa a ordenacao funcional (Priority P0->P1->P2 + fallback por nome), porem so para `nextOpenTicket()`, sem API de listagem completa para UI.
- 2026-02-23 17:00Z - O Telegram hoje envia textos por `sendMessage` sem helper de chunking para arquivos longos.

## Decision Log
- 2026-02-23 - Decisao: adicionar comando dedicado `/tickets_open` e inclui-lo no `/start`.
  - Motivo: manter consistencia com comandos principais em snake_case e tornar o fluxo explicitamente descobrivel.
  - Impacto: atualizar `START_REPLY_LINES`, `registerHandlers` e testes de help/comando.
- 2026-02-23 - Decisao: centralizar listagem/leitura de tickets abertos no backend de filesystem (na integracao de fila de tickets ou modulo dedicado), nao no controller Telegram.
  - Motivo: separar responsabilidade de IO do controller e reaproveitar ordenacao deterministica ja existente.
  - Impacto: evoluir `BotControls` e wiring de `main.ts` com novos metodos de leitura/listagem.
- 2026-02-23 - Decisao: adotar callback context para "Tickets abertos" no mesmo padrao de `/specs` (contextId por chat, stale-safe e paginacao).
  - Motivo: evitar cliques stale e manter UX previsivel quando a lista muda.
  - Impacto: novo conjunto de prefixos, parser e mapa de contexto em `telegram-bot.ts`.
- 2026-02-23 - Decisao: implementar chunking deterministico por tamanho maximo de mensagem, preservando ordem e numeracao de partes.
  - Motivo: atender RF-05/CA-02 sem depender de limites implicitos do Telegram.
  - Impacto: novo helper de chunking e testes cobrindo conteudo longo.
- 2026-02-23 - Decisao: classificar fechamento como `GO` com validacao manual externa pendente.
  - Motivo: evidencias tecnicas do ciclo estao verdes; pendencia restante e apenas validacao operacional em bot Telegram real.
  - Impacto: ticket fechado como `fixed` sem abrir follow-up automatico.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada (`GO`).
- O que funcionou:
  - comandos/callbacks de `/tickets_open` foram entregues com contexto por chat, paginacao e stale-safety.
  - API de fila evoluiu para listagem/read nao destrutiva com cobertura dedicada.
  - validacao automatizada confirmou integridade de testes, tipagem e build.
- O que ficou pendente:
  - validacao manual externa em Telegram real (operacional) para confirmar UX ponta a ponta.
- Proximos passos:
  - executar validacao manual no bot real conforme registrado no ticket fechado.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`
  - `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/ticket-queue.test.ts`
- Fluxo atual relevante:
  - `/specs` ja possui listagem paginada e callback context robusto, servindo como baseline de UX/seguranca para o novo fluxo.
  - callback `ticket-run:execute:*` ja existe para "Implementar este ticket", mas hoje depende de contexto que nao e gerado por um fluxo de listagem de tickets abertos.
  - `main.ts` injeta controles para specs/projetos/run-ticket, mas nao injeta metodos de listar/ler `tickets/open/`.
- Restricoes tecnicas:
  - manter arquitetura em camadas e fluxo sequencial.
  - sem novas dependencias externas.
  - manter controle de acesso (`TELEGRAM_ALLOWED_CHAT_ID`) em comando e callback.
- Termos usados no plano:
  - tickets abertos: arquivos `*.md` em `tickets/open/` do projeto ativo.
  - chunking: quebra do conteudo em partes ordenadas para envio no chat.
  - stale callback: callback de lista antiga apos mudanca de contexto/lista.

## Plan of Work
- Milestone 1 - Contrato de dados para tickets abertos
  - Entregavel: API de controle para listar tickets abertos em ordem deterministica e ler conteudo de um ticket especifico.
  - Evidencia de conclusao: testes de integracao filesystem comprovam ordenacao e leitura com retorno funcional para `not-found`.
  - Arquivos esperados: `src/integrations/ticket-queue.ts`, `src/integrations/ticket-queue.test.ts`, `src/main.ts`, `src/integrations/telegram-bot.ts`.
- Milestone 2 - Entrada de comando e listagem navegavel no Telegram
  - Entregavel: comando `/tickets_open` registrado, help `/start` atualizado, resposta com teclado inline paginado e fallback claro para lista vazia.
  - Evidencia de conclusao: testes validam comando, renderizacao da lista e mensagem de vazio sem erro tecnico.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Selecao de ticket e envio integral com chunking
  - Entregavel: callback de selecao abre ticket escolhido, envia conteudo completo em partes ordenadas e trata ticket removido/inexistente.
  - Evidencia de conclusao: testes validam envio completo para ticket longo, ordem dos chunks e erro funcional quando ticket nao existe.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Encadeamento com acao "Implementar este ticket"
  - Entregavel: apos leitura do ticket, botao inline de implementacao e exibido com callback `ticket-run:execute:*` valido para o ticket selecionado.
  - Evidencia de conclusao: teste verifica botao e callback data apos leitura; callback existente continua funcional.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Endurecimento, validacao e rastreabilidade
  - Entregavel: cenarios de stale/idempotencia/acesso cobertos, suite verde, spec atualizada e ticket movido para `tickets/closed/` no commit de entrega.
  - Evidencia de conclusao: comandos de teste/check/build verdes e rastreabilidade documental atualizada.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/ticket-queue.ts`, `src/integrations/ticket-queue.test.ts`, `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`, `tickets/closed/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "handleSpecsCommand|buildSpecsReply|parseSpecsCallbackData|createImplementTicketCallbackData|handleTicketRunCallbackQuery|START_REPLY_LINES" src/integrations/telegram-bot.ts` para mapear pontos reutilizaveis do novo fluxo.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "nextOpenTicket|readPriorityRank|extractPriorityRank" src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts` para mapear ordenacao deterministica ja existente.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/integrations/ticket-queue.ts` com API nao destrutiva para listar tickets abertos ordenados e ler conteudo por nome de arquivo.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/ticket-queue.test.ts` cobrindo: ordenacao completa na listagem, leitura de ticket valido e retorno funcional para ticket ausente.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `BotControls` em `src/integrations/telegram-bot.ts` para incluir metodos de listagem/leitura de tickets abertos.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar wiring em `src/main.ts` para injetar os novos controles com base no projeto ativo (`runner.getState().activeProject`).
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar comando `/tickets_open` em `registerHandlers`, incluindo validacao de acesso e logs.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar renderizador de lista de tickets abertos com paginacao inline e callback prefix dedicado (`tickets-open:`), incluindo contexto por chat.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar handler de callback de tickets abertos (page/select) com protecao stale e mensagens funcionais.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar helper de chunking para envio integral do ticket selecionado, preservando ordem e numeracao de partes.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Encadear exibicao da acao "Implementar este ticket" apos envio do conteudo, reaproveitando `createImplementTicketCallbackData`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para cobrir comando/listagem/paginacao/selecao/chunking/ticket-removido/acesso-negado.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/ticket-queue.test.ts`.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts`.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build`.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar a spec `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md` com status RF/CA e evidencias.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Fechar ticket no mesmo commit da entrega movendo `tickets/open/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md` para `tickets/closed/` e preenchendo metadata de closure.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar diff final com `git diff -- src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts src/main.ts docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md tickets/closed/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: cenarios de `/tickets_open` comprovam:
    - lista deterministica quando ha tickets;
    - mensagem informativa quando `tickets/open/` esta vazio;
    - callback de selecao envia conteudo integral com chunking ordenado;
    - ticket inexistente/removido retorna resposta funcional com orientacao de atualizar lista.
- Comando: `npx tsx --test src/integrations/ticket-queue.test.ts`
  - Esperado: API de listagem/leitura preserva ordenacao por prioridade e nome, com comportamento estavel para arquivo ausente.
- Comando: `npm run check && npm run build`
  - Esperado: contratos novos de `BotControls`/wiring compilam sem regressao.
- Comando: `rg -n "/tickets_open|tickets-open:|Implementar este ticket|chunk|Ticket selecionado nao encontrado em tickets/open/" src/integrations/telegram-bot.ts src/main.ts`
  - Esperado: comando, callbacks, acao de implementacao e tratamento de erro funcional estao presentes.
- Comando: `rg -n "RF-01|RF-02|RF-03|RF-04|RF-05|RF-06|RF-09|RF-10|CA-01|CA-02|CA-03|CA-04" docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`
  - Esperado: spec atualizada com status de atendimento e evidencias apos implementacao.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar `/tickets_open` invalida contextos antigos e gera lista nova para o chat.
  - callback de lista stale nao inicia acao sensivel; responde erro funcional e orienta refresh.
  - reexecutar testes/comandos de validacao nao altera estado funcional do runner.
- Riscos:
  - drift de ordenacao entre listagem Telegram e selecao real da fila se regras forem duplicadas.
  - chunking mal calibrado pode gerar mensagens truncadas ou fora de ordem.
  - corrida entre listagem e selecao (ticket movido/removido no intervalo) pode gerar erro confuso se nao houver tratamento explicito.
  - crescimento de callbacks/contextos sem invalidacao por chat pode causar comportamento stale dificil de debugar.
- Recovery / Rollback:
  - manter regra de ordenacao em um unico ponto reutilizavel na camada de filesystem.
  - se chunking falhar, responder erro funcional e nao disparar callback de implementacao.
  - em instabilidade do novo fluxo, fallback seguro e usar mensagem de orientacao para repetir `/tickets_open`.
  - isolar mudancas em metodos novos para rollback cirurgico sem afetar `/specs` e `ticket-run`.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md`.
- Spec de origem: `docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md`.
- ExecPlan relacionado ja entregue: `execplans/2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md`.
- Referencias primarias usadas no planejamento:
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/main.ts`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/ticket-queue.test.ts`
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
- Evidencias a anexar ao final da execucao:
  - diff dos arquivos alterados;
  - saida dos testes `telegram-bot` e `ticket-queue`;
  - saida de `npm run check && npm run build`;
  - atualizacao da spec e ticket fechado no mesmo commit da entrega.
- Validacoes executadas:
  - `npx tsx --test src/integrations/ticket-queue.test.ts` (8 testes, 8 pass).
  - `npx tsx --test src/integrations/telegram-bot.test.ts` (101 testes, 101 pass).
  - `npm run check && npm run build` (tipagem e build verdes).

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/integrations/telegram-bot.ts`
    - `BotControls` passa a incluir metodos para listar e ler tickets abertos.
    - novos tipos/constantes para comando e callbacks de `tickets-open`.
  - `src/main.ts`
    - bootstrap passa a injetar os novos metodos no `TelegramController`.
  - `src/integrations/ticket-queue.ts`
    - API de leitura/listagem nao destrutiva de `tickets/open/` (alem de `nextOpenTicket`).
- Compatibilidade:
  - fluxo existente de `ticket-run` permanece inalterado e e apenas reaproveitado apos selecao do ticket.
  - comandos antigos continuam operacionais; o novo fluxo e aditivo.
- Dependencias externas e mocks:
  - sem novas dependencias.
  - testes continuam usando doubles/spies locais sem chamadas reais ao Telegram.
