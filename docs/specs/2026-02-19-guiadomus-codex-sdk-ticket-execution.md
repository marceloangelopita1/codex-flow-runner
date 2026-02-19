# [SPEC] Execucao de tickets do guiadomus-matricula via Codex SDK

## Metadata
- Spec ID: 2026-02-19-guiadomus-codex-sdk-ticket-execution
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
- Problema que esta spec resolve: permitir que o bot controle, de forma remota, a execucao sequencial de tickets abertos do repositorio `guiadomus-matricula`.
- Resultado esperado: um comando Telegram inicia rodada que processa tickets abertos um por vez via Codex SDK real, com fechamento + commit/push por ticket.
- Contexto funcional: runner como controlador operacional de backlog remoto baseado em tickets Markdown.

## Jornada de uso
1. Operador autorizado envia `/run-all` no bot.
2. Runner inicia rodada de execucao no repositorio `../guiadomus-matricula`.
3. Para cada ticket aberto, runner executa ciclo completo (`plan -> implement -> close`) via Codex SDK real, depois commit/push.
4. Em caso de erro em qualquer ticket, a rodada para no primeiro erro e preserva o estado atual para diagnostico.

## Requisitos funcionais
- RF-01: comando `/run-all` deve iniciar rodada de processamento sequencial de tickets em `tickets/open/`.
- RF-02: cada ticket deve executar os 3 prompts operacionais definidos no projeto (`plan`, `implement`, `close-and-version`) antes de passar ao proximo.
- RF-03: integracao deve usar Codex SDK real ponta a ponta (nao apenas gerador local de execplan).
- RF-04: ao finalizar cada ticket com sucesso, o arquivo deve ser movido para `tickets/closed/` no mesmo commit da implementacao.
- RF-05: o fluxo deve realizar `push` automatico apos commit de fechamento de cada ticket.
- RF-06: a rodada deve parar no primeiro erro, mantendo rastreabilidade do ticket que falhou.
- RF-07: runner deve ser compativel com repositorios que usam `plans/` ou `execplans/`, sem exigir migracao manual previa.

## Nao-escopo
- Execucao paralela de tickets.
- Suporte a multiplos repositorios simultaneamente.
- Reprocessamento automatico de ticket com retry inteligente na mesma rodada.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Ao enviar `/run-all` com tickets abertos, o runner processa um ticket por vez ate concluir a rodada ou falhar.
- [ ] CA-02 - Ao concluir ticket com sucesso, ocorre movimentacao `tickets/open -> tickets/closed` no mesmo commit e push automatico.
- [ ] CA-03 - Em erro no ticket N, os tickets seguintes nao sao executados e o estado do erro fica registrado.
- [ ] CA-04 - Em repositorio alvo com `plans/`, artefato de plano e criado sem quebrar o fluxo.
- [ ] CA-05 - Em repositorio alvo com `execplans/`, artefato de plano e criado sem quebrar o fluxo.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Escopo da rodada, politica de falha e politica de push aprovados.
- Pendencias em aberto:
  - Implementar cliente Codex SDK real e remover dependencia do fluxo local MVP.
  - Implementar compatibilidade de diretorio de planos (`plans/` e `execplans/`).
  - Cobrir fluxo com testes de integracao/contrato.
- Evidencias de validacao:
  - A definir na implementacao (ticket, execplan, commit).

## Riscos e impacto
- Risco funcional: divergencia entre comportamento do Codex SDK real e fluxo local atual.
- Risco operacional: push automatico em ticket com implementacao incompleta.
- Mitigacao: parada no primeiro erro, logs por ticket, validacoes antes de close/commit/push.

## Decisoes e trade-offs
- 2026-02-19 - Rodada sequencial por `/run-all` em vez de comando por ticket - reduz friccao operacional para esvaziar backlog.
- 2026-02-19 - Parar no primeiro erro - prioriza seguranca e diagnostico sobre throughput.
- 2026-02-19 - Push automatico por ticket - garante ciclo completo fechado sem passo manual.

## Historico de atualizacao
- 2026-02-19 10:53Z - Versao inicial da spec aprovada.
