# [SPEC] Telegram access and control plane

## Metadata
- Spec ID: 2026-02-19-telegram-access-and-control-plane
- Status: approved
- Owner: mapita
- Created at (UTC): 2026-02-19 10:53Z
- Last reviewed at (UTC): 2026-02-19 11:56Z
- Source: operational-gap
- Related tickets:
  - tickets/closed/2026-02-19-telegram-run-all-access-control-gap.md
  - tickets/closed/2026-02-19-telegram-access-audit-docs-tests-gap.md
- Related execplans:
  - execplans/2026-02-19-telegram-access-audit-docs-tests-gap.md
  - execplans/2026-02-19-telegram-run-all-access-control-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: garantir que apenas um chat autorizado consiga operar o bot do runner no Telegram.
- Resultado esperado: comandos do bot so podem ser executados pelo chat autorizado e toda tentativa externa gera registro de seguranca.
- Contexto funcional: operacao do runner via Telegram para controle de execucao de tickets.

## Jornada de uso
1. Operador configura `TELEGRAM_BOT_TOKEN` e `TELEGRAM_ALLOWED_CHAT_ID` no ambiente do runner.
2. Operador autorizado envia comandos (`/run-all`, `/status`, `/pause`, `/resume`) para o bot.
3. Bot valida o `chat.id` antes de qualquer acao e executa somente quando autorizado.

## Requisitos funcionais
- RF-01: todos os comandos de controle devem validar o `chat.id` contra `TELEGRAM_ALLOWED_CHAT_ID`.
- RF-02: chats nao autorizados nao podem acionar execucao, pausa, retomada ou leitura de status operacional.
- RF-03: toda tentativa nao autorizada deve gerar log com metadados minimos para auditoria operacional.
- RF-04: quando `TELEGRAM_ALLOWED_CHAT_ID` estiver ausente, o comportamento permitido deve ser explicitamente documentado como modo nao restrito.

## Nao-escopo
- Controle de acesso por multiplos usuarios/chats.
- Fluxo de pareamento automatico dentro do bot.
- Camadas adicionais de autenticacao fora do Telegram chat ID.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, comando enviado por chat nao autorizado nao altera estado do runner.
- [x] CA-02 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, comando enviado por chat autorizado executa comportamento esperado.
- [x] CA-03 - Tentativa nao autorizada fica registrada em log com `chatId` e contexto minimo do evento.
- [x] CA-04 - Documentacao operacional descreve claramente o modo restrito e o modo sem restricao.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - `TELEGRAM_ALLOWED_CHAT_ID` ja existe como configuracao opcional de ambiente.
  - Comandos `/run-all`, `/status`, `/pause` e `/resume` validam `chat.id` antes da acao.
  - `/run-all` foi implementado no controlador Telegram e aciona o runner de forma explicita, sem iniciar nova rodada concorrente quando ja ativo.
  - Bootstrap em `src/main.ts` deixou de iniciar o loop automaticamente e passou a aguardar gatilho remoto por `/run-all`.
  - Tentativas nao autorizadas agora geram warning com `chatId`, `eventType` e `command`.
  - README documenta explicitamente modo restrito e modo sem restricao para `TELEGRAM_ALLOWED_CHAT_ID`.
  - Suite automatizada cobre autorizacao (autorizado, nao autorizado e sem restricao) no controlador Telegram, incluindo superficie de `/run-all`.
- Pendencias em aberto:
  - Nenhuma pendencia tecnica em aberto para a superficie de controle Telegram desta spec.
- Evidencias de validacao:
  - src/config/env.ts
  - src/core/runner.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
  - src/main.ts
  - README.md
  - package.json
  - tickets/closed/2026-02-19-telegram-run-all-access-control-gap.md
  - tickets/closed/2026-02-19-telegram-access-audit-docs-tests-gap.md
  - execplans/2026-02-19-telegram-access-audit-docs-tests-gap.md
  - execplans/2026-02-19-telegram-run-all-access-control-gap.md

## Riscos e impacto
- Risco funcional: comando indevido por chat nao autorizado em ambiente produtivo.
- Risco operacional: alteracao de estado do runner por ator nao esperado.
- Mitigacao: validacao centralizada por `chat.id`, logs de auditoria e testes de autorizacao.

## Decisoes e trade-offs
- 2026-02-19 - Controle por `TELEGRAM_ALLOWED_CHAT_ID` como mecanismo principal - simplicidade operacional e baixo custo de implementacao.
- 2026-02-19 - Superficie minima de comandos com controle remoto - reduz escopo inicial sem bloquear operacao.

## Historico de atualizacao
- 2026-02-19 10:53Z - Versao inicial da spec aprovada.
- 2026-02-19 11:32Z - Revisao de gaps de implementacao concluida, com abertura de tickets de follow-up.
- 2026-02-19 11:43Z - Auditoria de acesso, documentacao de modos e cobertura automatizada inicial entregues (CA-03 e CA-04 atendidos).
- 2026-02-19 11:52Z - `/run-all` entregue com controle de acesso, bootstrap por gatilho remoto e cobertura de testes para CA-01/CA-02.
- 2026-02-19 11:56Z - Ticket de `/run-all` encerrado e referencias de rastreabilidade atualizadas para `tickets/closed/`.
