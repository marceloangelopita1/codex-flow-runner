# [SPEC] Comando dedicado /codex_chat para conversa livre com contexto persistente no Telegram

## Metadata
- Spec ID: 2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-21 00:02Z
- Last reviewed at (UTC): 2026-02-21 00:58Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md
  - tickets/closed/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md
  - tickets/closed/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md
- Related execplans:
  - execplans/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md
  - execplans/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md
  - execplans/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md
- Related commits:
  - commit: mesmo changeset de fechamento de `tickets/closed/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`

## Objetivo e contexto
- Problema que esta spec resolve: o bot ainda nao possui um comando dedicado para conversa livre com Codex, isolado do fluxo de planejamento de spec.
- Resultado esperado: introduzir um fluxo oficial `/codex_chat` (com alias `/codex-chat`) para conversa livre com contexto persistente, sem uso automatico de `/plan`.
- Contexto funcional: manter uma unica sessao global por instancia, com continuidade de contexto por mensagens livres, encerramento manual por botao e encerramento automatico por inatividade/comando concorrente.

## Jornada de uso
1. Operador autorizado envia `/codex_chat` ou `/codex-chat`.
2. Sistema valida se nao existe sessao `/plan_spec` ativa.
3. Se validado, sistema abre sessao global de chat livre com o Codex.
4. Enquanto a sessao estiver ativa, cada mensagem de texto livre enviada pelo operador e roteada para o mesmo contexto.
5. A cada envio processado, o sistema aguarda a resposta do Codex e publica o retorno no Telegram.
6. Em cada resposta do Codex, o bot exibe botao para encerrar o contexto manualmente.
7. Se operador clicar no botao, a sessao e encerrada e o contexto e limpo.
8. Se houver 10 minutos sem atividade, a sessao e encerrada automaticamente.
9. Se operador enviar qualquer outro comando durante a sessao, o sistema encerra o contexto atual e processa o novo comando na mesma mensagem.
10. Se `/plan_spec` estiver ativo, `/codex_chat` e bloqueado com mensagem explicita de conflito.

## Requisitos funcionais
- RF-01: expor comando oficial `/codex_chat` para iniciar conversa livre com Codex.
- RF-02: expor alias textual `/codex-chat` com comportamento identico ao comando oficial.
- RF-03: o fluxo `/codex_chat` deve ser separado de `/plan_spec` e nao pode iniciar modo `/plan` automaticamente.
- RF-04: deve existir no maximo uma sessao global ativa de `/codex_chat` por instancia.
- RF-05: enquanto a sessao estiver ativa, mensagens de texto livre devem ser encaminhadas para o mesmo contexto.
- RF-06: cada mensagem encaminhada deve produzir resposta do Codex no Telegram quando pronta.
- RF-07: cada resposta do Codex deve incluir opcao visual para encerramento manual do contexto.
- RF-08: o encerramento manual deve limpar a sessao ativa e impedir novo roteamento para contexto encerrado.
- RF-09: a sessao deve encerrar automaticamente apos 10 minutos de inatividade.
- RF-10: ao receber qualquer outro comando com sessao `/codex_chat` ativa, o sistema deve encerrar a sessao e processar o novo comando na mesma mensagem.
- RF-11: se houver sessao `/plan_spec` ativa, tentativa de iniciar `/codex_chat` deve ser bloqueada com mensagem explicita.
- RF-12: logs e status operacional devem refletir inicio, continuidade e encerramento (manual, timeout ou troca por comando) da sessao `/codex_chat`.

## Nao-escopo
- Alterar semantica de comandos existentes fora do conflito com sessao ativa de `/codex_chat`.
- Permitir multiplas sessoes simultaneas de conversa livre por chat ou usuario.
- Substituir o fluxo de planejamento via `/plan_spec`.
- Introduzir paralelizacao de tickets/specs por causa do novo comando.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/codex_chat` inicia sessao de conversa livre quando nao ha conflito ativo.
- [x] CA-02 - `/codex-chat` inicia a mesma sessao e segue as mesmas regras de `/codex_chat`.
- [x] CA-03 - Com sessao ativa, mensagem de texto livre recebe resposta do Codex no mesmo contexto.
- [x] CA-04 - Cada resposta do Codex em `/codex_chat` traz botao de encerramento manual do contexto.
- [x] CA-05 - Acionar encerramento manual finaliza a sessao e confirma o fechamento no Telegram.
- [x] CA-06 - Apos 10 minutos sem atividade, o bot encerra automaticamente a sessao e informa timeout.
- [x] CA-07 - Enviar qualquer outro comando durante sessao ativa encerra o contexto atual e executa o novo comando na mesma mensagem.
- [x] CA-08 - Com sessao `/plan_spec` ativa, `/codex_chat` e bloqueado com mensagem explicita e sem abrir nova sessao.
- [x] CA-09 - Sistema impede mais de uma sessao global simultanea de `/codex_chat` por instancia.
- [x] CA-10 - O fluxo `/codex_chat` nao entra em modo `/plan` automaticamente em nenhum ponto da jornada.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Itens atendidos:
  - RF-01..RF-11 entregues via backend de sessao livre, camada Telegram e bloqueios de concorrencia de `/plan_spec`.
  - RF-12 entregue com metadado tipado de ultimo encerramento de `/codex_chat`, logs de lifecycle (inicio, continuidade e encerramento) e bloco operacional no `/status`.
  - README alinhado com help `/start` para `/codex_chat` e alias `/codex-chat`.
- Pendencias em aberto:
  - Nenhuma.
- Evidencias de validacao:
  - `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts`
  - `npm run check`
  - `npm test`
  - `npm run build`
  - `src/integrations/telegram-bot.test.ts`: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07.
  - `src/core/runner.test.ts`: CA-01, CA-03, CA-06, CA-07, CA-08, CA-09.
  - `src/integrations/codex-client.test.ts`: CA-10.
  - `src/integrations/telegram-bot.ts`: bloco detalhado de `/status` para sessao ativa e ultimo encerramento de `/codex_chat`.
  - `src/core/runner.ts`: rastreabilidade de encerramento (`manual`, `timeout`, `command-handoff`, `unexpected-close`, `failure`, `shutdown`) e logs de lifecycle.
  - `README.md`: secao "Controle por Telegram" alinhada com `/codex_chat` e `/codex-chat`.
  - src/types/state.ts
  - src/core/runner.ts
  - src/integrations/codex-client.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
  - src/core/runner.test.ts
  - src/integrations/codex-client.test.ts

## Riscos e impacto
- Risco funcional: mistura de contexto entre comandos se o encerramento por troca de comando nao for atomico.
- Risco operacional: sessao presa sem timeout efetivo pode bloquear interacoes futuras.
- Mitigacao: controlar sessao unica global com timeout de 10 minutos, botao de encerramento e trilha de logs/status por transicao.

## Decisoes e trade-offs
- 2026-02-21 - Criar comando dedicado `/codex_chat` com alias `/codex-chat` - reduz ambiguidade com `/plan_spec` e deixa objetivo do fluxo explicito.
- 2026-02-21 - Manter sessao unica global por instancia - simplifica consistencia de contexto e controle operacional.
- 2026-02-21 - Encerrar sessao ao receber outro comando e processar comando na mesma mensagem - evita travas operacionais e melhora previsibilidade.
- 2026-02-21 - Bloquear `/codex_chat` quando `/plan_spec` estiver ativo - evita competicao de contexto entre fluxos conversacionais.

## Historico de atualizacao
- 2026-02-21 00:02Z - Versao inicial da spec criada com `Status: approved` e `Spec treatment: pending`.
- 2026-02-21 00:06Z - Revisao de gaps concluida com abertura de 3 tickets em `tickets/open/` priorizados em fila sequencial P0 -> P1 -> P2.
- 2026-02-21 00:11Z - Validacao final da triagem concluida, mantendo `Status: approved` e `Spec treatment: pending` com rastreabilidade nos tickets abertos.
- 2026-02-21 04:55Z - Implementacao e validacao do ExecPlan P2 concluida com cobertura CA-01..CA-10; pendente apenas etapa operacional de fechamento de ticket e versionamento.
- 2026-02-21 00:58Z - Ticket P2 encerrado com validacao verde (`check`, `test`, `build`), movido para `tickets/closed/`; spec atualizada para `Status: attended` e `Spec treatment: done`.
