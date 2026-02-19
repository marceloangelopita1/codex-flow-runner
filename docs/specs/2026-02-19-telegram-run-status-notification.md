# [SPEC] Notificacao de status de execucao no Telegram por ticket

## Metadata
- Spec ID: 2026-02-19-telegram-run-status-notification
- Status: approved
- Owner: mapita
- Created at (UTC): 2026-02-19 10:53Z
- Last reviewed at (UTC): 2026-02-19 10:53Z
- Source: product-need
- Related tickets:
  - A definir
- Related execplans:
  - A definir
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
- [ ] CA-01 - Ao concluir um ticket com sucesso, exatamente uma mensagem de resumo final e enviada para o chat autorizado.
- [ ] CA-02 - Ao falhar um ticket, exatamente uma mensagem de resumo final de falha e enviada para o chat autorizado.
- [ ] CA-03 - Mensagens de resumo incluem campos minimos de rastreabilidade (ticket, status, fase final, timestamp UTC).
- [ ] CA-04 - Em rodada com multiplos tickets, cada ticket concluido gera seu proprio resumo final.
- [ ] CA-05 - `/status` apresenta informacao coerente com o ultimo evento notificado.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Definicao de gatilho de notificacao no final dos 3 prompts por ticket.
- Pendencias em aberto:
  - Implementar payload final de notificacao e formato padrao de mensagem.
  - Garantir coleta confiavel de commit hash e resultado de push para incluir no resumo.
  - Criar testes de contrato para notificacoes de sucesso/falha.
- Evidencias de validacao:
  - A definir na implementacao (ticket, execplan, commit).

## Riscos e impacto
- Risco funcional: duplicidade de mensagens ou falta de notificacao em falhas.
- Risco operacional: operador sem visibilidade para saber em que ticket o fluxo parou.
- Mitigacao: emissao unica por ticket ao fim do ciclo e cobertura de cenarios de erro.

## Decisoes e trade-offs
- 2026-02-19 - Notificacao apenas no resumo final por ticket - reduz ruído e mantem contexto util.
- 2026-02-19 - Conteudo minimo padronizado de rastreabilidade - facilita auditoria sem mensagem extensa.

## Historico de atualizacao
- 2026-02-19 10:53Z - Versao inicial da spec aprovada.
