# [SPEC] Notificacao de status de execucao no Telegram por ticket

## Metadata
- Spec ID: 2026-02-19-telegram-run-status-notification
- Status: approved
- Owner: mapita
- Created at (UTC): 2026-02-19 10:53Z
- Last reviewed at (UTC): 2026-02-19 15:09Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-19-telegram-final-summary-per-ticket-gap.md
  - tickets/closed/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md
- Related execplans:
  - execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md
  - execplans/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: falta de feedback claro no Telegram ao final dos 3 prompts operacionais de cada ticket.
- Resultado esperado: operador recebe mensagem de resumo por ticket somente quando `plan`, `implement` e `close-and-version` forem finalizados.
- Contexto funcional: rodada disparada por `/run-all` no bot.

## Jornada de uso
1. Operador autorizado dispara `/run-all`.
2. Runner processa ticket em execucao no ciclo `plan -> implement -> close-and-version`.
3. Quando o ciclo do ticket encerra, bot envia um resumo unico com sucesso ou falha.
4. Rodada continua para proximo ticket (ou para no primeiro erro, conforme politica do fluxo).

## Requisitos funcionais
- RF-01: para cada ticket, o bot deve enviar uma mensagem unica apos concluir as 3 fases operacionais.
- RF-02: mensagem de resumo deve conter no minimo: nome do ticket, resultado (`sucesso` ou `falha`), fase final, timestamp UTC.
- RF-03: em sucesso, mensagem deve incluir referencia de artefato de plano e identificador de commit/push.
- RF-04: em falha, mensagem deve incluir ticket afetado e mensagem de erro objetiva para triagem.
- RF-05: o comando `/status` deve refletir o estado mais recente da rodada e do ticket atual.

## Nao-escopo
- Envio de mensagem por micro-etapa interna dentro de cada fase.
- Dashboard externo fora do Telegram.
- Sistema de notificacao multicanal.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Ao concluir um ticket com sucesso, exatamente uma mensagem de resumo final e enviada para o chat autorizado.
- [x] CA-02 - Ao falhar um ticket, exatamente uma mensagem de resumo final de falha e enviada para o chat autorizado.
- [x] CA-03 - Mensagens de resumo incluem campos minimos de rastreabilidade (ticket, status, fase final, timestamp UTC).
- [x] CA-04 - Em rodada com multiplos tickets, cada ticket concluido gera seu proprio resumo final.
- [x] CA-05 - `/status` apresenta informacao coerente com o ultimo evento notificado.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - O runner executa as fases `plan -> implement -> close-and-version` de forma sequencial por ticket.
  - O runner registra estado interno por fase, sucesso e erro (`phase`, `currentTicket`, `lastMessage`, `updatedAt`) e esse snapshot e exposto por `/status`.
  - O runner passou a publicar resumo final por ticket em sucesso e falha, com emissao unica ao fim de `processTicket`.
  - A integracao Telegram passou a enviar notificacao proativa por ticket com campos minimos (`ticket`, `resultado`, `fase final`, `timestamp UTC`) e erro objetivo em falha.
  - Em modo sem `TELEGRAM_ALLOWED_CHAT_ID`, o chat que dispara `/run-all` vira destino da notificacao final da rodada; em modo restrito, o destino continua o chat autorizado.
  - A suite automatizada cobre emissao final em sucesso, falha e rodada com multiplos tickets.
  - O resumo final de sucesso agora inclui `execPlanPath` e identificador de commit/push (`commitPushId`, com detalhes de `commitHash` e `pushUpstream`).
  - O estado do runner passou a persistir `lastNotifiedEvent` somente apos entrega confirmada no Telegram, e `/status` agora reflete esse evento como fonte canonica.
  - A suite automatizada cobre explicitamente os contratos de rastreabilidade avancada em sucesso e coerencia de `/status` com o ultimo evento notificado.
- Pendencias em aberto:
  - Nenhuma pendencia funcional em aberto para esta spec.
- Evidencias de validacao:
  - src/core/runner.ts
  - src/types/ticket-final-summary.ts
  - src/types/state.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/git-client.ts
  - src/core/runner.test.ts
  - src/integrations/telegram-bot.test.ts
  - src/main.ts
  - tickets/closed/2026-02-19-telegram-final-summary-per-ticket-gap.md
  - tickets/closed/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md
  - execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md
  - execplans/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md

## Riscos e impacto
- Risco funcional: duplicidade de mensagens ou falta de notificacao em falhas.
- Risco operacional: operador sem visibilidade para saber em que ticket o fluxo parou.
- Mitigacao: emissao unica por ticket ao fim do ciclo e cobertura de cenarios de erro.

## Decisoes e trade-offs
- 2026-02-19 - Notificacao apenas no resumo final por ticket - reduz ruído e mantem contexto util.
- 2026-02-19 - Conteudo minimo padronizado de rastreabilidade - facilita auditoria sem mensagem extensa.

## Historico de atualizacao
- 2026-02-19 10:53Z - Versao inicial da spec aprovada.
- 2026-02-19 14:42Z - Revisao de gaps concluida, com abertura de tickets para notificacao final por ticket e rastreabilidade/coerencia de status.
- 2026-02-19 14:53Z - Entrega da emissao unica de resumo final por ticket (sucesso/falha) com cobertura automatizada; pendencias de rastreabilidade avancada e coerencia de `/status` mantidas no ticket irmao.
- 2026-02-19 14:56Z - Ticket de emissao final por ticket movido para `tickets/closed/` apos validacao completa de testes e build.
- 2026-02-19 15:09Z - Rastreabilidade avancada de sucesso e coerencia de `/status` com ultimo evento notificado implementadas e validadas por testes.
- 2026-02-19 15:10Z - Ticket de rastreabilidade/coerencia movido para `tickets/closed/` apos validacao completa de testes, check e build.
