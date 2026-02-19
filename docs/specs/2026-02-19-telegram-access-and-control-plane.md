# [SPEC] Telegram access and control plane

## Metadata
- Spec ID: 2026-02-19-telegram-access-and-control-plane
- Status: approved
- Owner: mapita
- Created at (UTC): 2026-02-19 10:53Z
- Last reviewed at (UTC): 2026-02-19 10:53Z
- Source: operational-gap
- Related tickets:
  - A definir
- Related execplans:
  - A definir
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
- [ ] CA-01 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, comando enviado por chat nao autorizado nao altera estado do runner.
- [ ] CA-02 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, comando enviado por chat autorizado executa comportamento esperado.
- [ ] CA-03 - Tentativa nao autorizada fica registrada em log com `chatId` e contexto minimo do evento.
- [ ] CA-04 - Documentacao operacional descreve claramente o modo restrito e o modo sem restricao.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Escopo funcional e criterios de aceitacao aprovados para implementacao.
- Pendencias em aberto:
  - Implementacao da validacao final para todos os comandos desta fase.
  - Testes automatizados de acesso autorizado/nao autorizado.
- Evidencias de validacao:
  - A definir na implementacao (ticket, execplan, commit).

## Riscos e impacto
- Risco funcional: comando indevido por chat nao autorizado em ambiente produtivo.
- Risco operacional: alteracao de estado do runner por ator nao esperado.
- Mitigacao: validacao centralizada por `chat.id`, logs de auditoria e testes de autorizacao.

## Decisoes e trade-offs
- 2026-02-19 - Controle por `TELEGRAM_ALLOWED_CHAT_ID` como mecanismo principal - simplicidade operacional e baixo custo de implementacao.
- 2026-02-19 - Superficie minima de comandos com controle remoto - reduz escopo inicial sem bloquear operacao.

## Historico de atualizacao
- 2026-02-19 10:53Z - Versao inicial da spec aprovada.
