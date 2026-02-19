# [SPEC] Execucao de tickets do guiadomus-matricula via Codex SDK

## Metadata
- Spec ID: 2026-02-19-guiadomus-codex-sdk-ticket-execution
- Status: partially_attended
- Owner: mapita
- Created at (UTC): 2026-02-19 10:53Z
- Last reviewed at (UTC): 2026-02-19 12:27Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - tickets/open/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md
  - tickets/closed/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
- Related execplans:
  - execplans/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - execplans/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
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
- [x] CA-04 - Em repositorio alvo com `plans/`, artefato de plano e criado sem quebrar o fluxo.
- [x] CA-05 - Em repositorio alvo com `execplans/`, artefato de plano e criado sem quebrar o fluxo.

## Status de atendimento (documento vivo)
- Estado geral: partially_attended
- Itens atendidos:
  - Comando `/run-all` inicia processamento sequencial e evita rodada concorrente.
  - Integracao usa Codex CLI real por etapa (`plan`, `implement`, `close-and-version`) em `src/integrations/codex-client.ts`.
  - Runner executa as tres etapas operacionais por ticket com rastreabilidade de fase e erro contextual no stage.
  - Fluxo principal agora possui cobertura de contrato para ordem de etapas e falha por etapa no runner.
  - Compatibilidade de diretorio de plano foi implementada para `plans/` e `execplans/` com resolucao automatica em `src/integrations/plan-directory.ts`.
  - Fluxo da fila e etapa `plan` agora resolvem e reportam caminho de ExecPlan conforme convencao ativa do repositorio alvo.
  - Suite de testes cobre matriz de convencao de pasta de plano e comportamento da fila (`plan-directory`, `codex-client` e `ticket-queue`).
- Pendencias em aberto:
  - Rodada `/run-all` nao encerra quando a fila termina; o loop permanece em polling continuo.
  - Em erro de ticket, o runner nao interrompe a rodada no primeiro erro.
  - Nao ha validacao programatica no runner confirmando commit/push ao final de `close-and-version`; a garantia operacional ainda depende de completar o fluxo de rodada/versao nos tickets restantes.
- Evidencias de validacao:
  - execplans/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - execplans/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/plan-directory.ts
  - src/integrations/plan-directory.test.ts
  - src/integrations/codex-client.ts
  - src/integrations/codex-client.test.ts
  - src/integrations/git-client.ts
  - src/integrations/ticket-queue.ts
  - src/integrations/ticket-queue.test.ts
  - src/config/env.ts
  - src/main.ts
  - src/integrations/telegram-bot.test.ts
  - tickets/closed/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - tickets/open/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md
  - tickets/closed/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md

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
- 2026-02-19 11:59Z - Revisao de gaps de implementacao concluida com abertura de tickets de follow-up.
- 2026-02-19 12:13Z - Integracao real por etapas com Codex CLI e testes de contrato do fluxo principal implementados.
- 2026-02-19 12:27Z - Compatibilidade `plans/execplans` implementada com testes de contrato e atualizacao de evidencias.
