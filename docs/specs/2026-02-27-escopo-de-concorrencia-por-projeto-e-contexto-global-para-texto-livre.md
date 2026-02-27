# [SPEC] Escopo de concorrencia por projeto em runs e contexto global para texto livre no Telegram

## Metadata
- Spec ID: 2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-02-27 04:09Z
- Last reviewed at (UTC): 2026-02-27 04:20Z
- Source: product-need
- Related tickets:
  - tickets/open/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md
  - tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md
- Related execplans:
  - A definir
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: parte dos fluxos de execucao ainda pode herdar bloqueio global indevido, reduzindo capacidade quando projetos diferentes poderiam rodar em paralelo.
- Resultado esperado: `/run_all` e `/run_specs` passam a obedecer lock por projeto, enquanto o lock global fica restrito a sessoes de texto livre (ex.: escrita guiada para Instagram via `/plan_spec` e conversa livre via `/codex_chat`).
- Contexto funcional: consolidar um modelo unico de concorrencia coerente com operacao multi-projeto no Telegram.

## Jornada de uso
1. Operador seleciona `alpha-project` e envia `/run_all`.
2. Com `alpha-project` ativo, operador seleciona `beta-project` e envia `/run_specs <arquivo>.md`.
3. Sistema aceita ambas as execucoes por serem projetos diferentes.
4. Tentativa de iniciar outro run em `alpha-project` e bloqueada por slot ocupado no proprio projeto.
5. Operador inicia `/plan_spec`; sessao global de texto livre passa a ficar ativa.
6. Enquanto `/plan_spec` estiver ativo, tentativa de abrir `/codex_chat` e bloqueada por lock global de texto livre.
7. Mesmo com sessao de texto livre ativa, `/run_all` ou `/run_specs` em outro projeto continuam elegiveis quando houver capacidade por projeto.

## Requisitos funcionais
- RF-01: `run_all` e `run_specs` devem usar lock de execucao escopado por projeto.
- RF-02: execucao ativa em um projeto nao pode bloquear `run_all` ou `run_specs` em projeto diferente.
- RF-03: cada projeto deve manter no maximo um run ativo por vez, preservando sequencialidade interna de tickets.
- RF-04: bloqueios de run devem ocorrer apenas por `slot do proprio projeto` ou por `capacidade global de runners`, nunca por lock global unico de ticket.
- RF-05: deve existir um unico lock global para sessoes de texto livre, compartilhado por `/plan_spec` e `/codex_chat`.
- RF-06: `/plan_spec` e `/codex_chat` devem ser mutuamente exclusivos enquanto houver sessao ativa de texto livre.
- RF-07: lock global de texto livre nao deve bloquear `run_all` e `run_specs` em projetos diferentes.
- RF-08: mensagens de texto livre devem ser roteadas apenas para a sessao global ativa (`/plan_spec` ou `/codex_chat`) ate encerramento/timeout.
- RF-09: `/status` deve exibir separadamente capacidade de runners por projeto e estado da sessao global de texto livre.
- RF-10: logs e mensagens de bloqueio devem usar motivos acionaveis, no minimo: `project-slot-busy`, `runner-capacity-maxed`, `global-free-text-busy`.

## Nao-escopo
- Paralelizacao de tickets dentro do mesmo projeto.
- Multiplas sessoes simultaneas de texto livre por chat/usuario.
- Alterar politicas de autorizacao de chat (`TELEGRAM_ALLOWED_CHAT_ID`).
- Alterar o limite numerico de capacidade global de runners nesta entrega.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Com `alpha-project` em `/run_all`, iniciar `/run_specs` em `beta-project` e aceito e inicia sem bloqueio global.
- [ ] CA-02 - Com run ativo em `alpha-project`, nova tentativa de run em `alpha-project` retorna bloqueio `project-slot-busy`.
- [ ] CA-03 - Com sessao `/plan_spec` ativa, tentativa de abrir `/codex_chat` retorna bloqueio `global-free-text-busy`.
- [ ] CA-04 - Com sessao `/codex_chat` ativa, tentativa de abrir `/plan_spec` retorna bloqueio `global-free-text-busy`.
- [ ] CA-05 - Com sessao global de texto livre ativa, `/run_all` em projeto diferente continua iniciando quando houver capacidade de runner.
- [ ] CA-06 - Mensagem de texto livre durante sessao ativa e roteada para a mesma sessao global, sem interferir em runs por projeto.
- [ ] CA-07 - `/status` mostra painel de runners por projeto e estado da sessao global de texto livre no mesmo snapshot.
- [ ] CA-08 - Logs de bloqueio registram motivo taxonomico e contexto de projeto quando aplicavel.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - RF-03 e CA-02: existe bloqueio por slot do proprio projeto para impedir segundo run no mesmo projeto (`src/core/runner.ts`, `reserveSlot`, chave por projeto).
  - CA-05: sessao de texto livre pode coexistir com run em outro projeto (evidencia em teste `startPlanSpecSession pode coexistir com /run_all em outro projeto`).
  - RF-09 e CA-07: `/status` exibe slots ativos por projeto e estado de `/plan_spec` + `/codex_chat` no mesmo snapshot (`src/integrations/telegram-bot.ts`, `buildStatusReply`).
- Itens parcialmente atendidos:
  - RF-01, RF-04 e CA-01: existe lock por projeto, mas ainda ha lock global de ticket (`ticket-lock-active`) bloqueando runs entre projetos.
  - RF-08 e CA-06: roteamento de texto por sessao existe, mas sem garantia estrutural de lock global unico bidirecional entre `/plan_spec` e `/codex_chat`.
  - RF-10 e CA-08: taxonomia de bloqueio diverge do contrato (`runner-capacity-full` e `plan-spec-active` em vez de `runner-capacity-maxed` e `global-free-text-busy`).
- Pendencias em aberto:
  - Remover lock global de ticket para runs e alinhar bloqueios para concorrencia por projeto (RF-01, RF-02, RF-04, CA-01, CA-08):
    - `tickets/open/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md`
  - Implementar lock global unico e bidirecional de texto livre (`/plan_spec` <-> `/codex_chat`) com motivo `global-free-text-busy` (RF-05, RF-06, RF-08, RF-10, CA-03, CA-04, CA-06, CA-08):
    - `tickets/open/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md`
  - Revalidar cobertura automatizada dos cenarios CA-01..CA-08 apos os ajustes de lock e taxonomia.
- Evidencias de validacao:
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts

## Riscos e impacto
- Risco funcional: combinacao incorreta de locks pode gerar corrida ou bloqueios indevidos entre projetos.
- Risco operacional: bloqueio global em runs reduz throughput e aumenta tempo de fila sem necessidade.
- Mitigacao: separar explicitamente lock por projeto (runs) de lock global (texto livre), com taxonomia de bloqueio e testes de regressao de concorrencia.

## Decisoes e trade-offs
- 2026-02-27 - Adotar dois dominios de concorrencia (por projeto para runs, global para texto livre) - reduz bloqueios indevidos e preserva contexto conversacional unico.
- 2026-02-27 - Manter sequencialidade estrita dentro de cada projeto - evita conflitos de edicao no mesmo repositorio.
- 2026-02-27 - Manter sessao global unica para texto livre (`/plan_spec` e `/codex_chat`) - evita mistura de contexto em mensagens nao estruturadas.

## Historico de atualizacao
- 2026-02-27 04:09Z - Versao inicial da spec criada a partir do brief operacional sobre concorrencia multi-projeto e contexto global de texto livre.
- 2026-02-27 04:17Z - Revisao de gaps concluida; RFs/CAs classificados e tickets de implementacao abertos em `tickets/open/`.
- 2026-02-27 04:20Z - Validacao final da triagem concluida; mantido `Status: approved` com `Spec treatment: pending` devido a gaps rastreados nos tickets abertos relacionados.
