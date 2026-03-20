# [SPEC] Triagem de specs approved pendentes com /specs e /run_specs

## Metadata
- Spec ID: 2026-02-19-approved-spec-triage-run-specs
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-19 19:34Z
- Last reviewed at (UTC): 2026-03-20 01:44Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md
  - tickets/closed/2026-02-19-specs-command-eligibility-listing-and-access-gap.md
  - tickets/closed/2026-02-27-run-specs-missing-triage-completion-notification-gap.md
  - tickets/closed/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md
- Related execplans:
  - execplans/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md
  - execplans/2026-02-27-run-specs-missing-triage-completion-notification-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: o ciclo atual automatiza tickets, mas nao cobre a triagem de specs `approved` que ainda nao foram tratadas.
- Resultado esperado: operador consegue listar specs pendentes e executar triagem de uma spec por vez; apos commit/push da triagem, o runner continua automaticamente com o mesmo comportamento de `/run_all`.
- Contexto funcional: manter fluxo sequencial do runner, adicionando uma fase anterior de derivacao de trabalho a partir de specs.

## Jornada de uso
1. Operador autorizado envia `/specs` para listar specs elegiveis no projeto ativo.
2. Bot retorna apenas specs com `Status: approved` e `Spec treatment: pending`.
3. Operador envia `/run_specs <arquivo-da-spec.md>`.
4. Runner valida elegibilidade da spec e garante que nao existe outra rodada em execucao.
5. Runner executa `prompts/01-avaliar-spec-e-gerar-tickets.md`, substituindo `<SPEC_PATH>` por `docs/specs/<arquivo-da-spec.md>`.
6. Runner executa novo prompt de fechamento da triagem da spec (commit/push), com mensagem `chore(specs): triage <arquivo-da-spec.md>`.
7. Depois do commit/push da triagem, runner inicia automaticamente o mesmo ciclo de `/run_all`.
8. O ciclo processa todos os tickets de `tickets/open/` em ordem de prioridade, incluindo tickets ja existentes e os criados pela triagem da spec.

## Requisitos funcionais
- RF-01: toda spec em `docs/specs/` deve conter metadata explicita `Spec treatment: pending | done`.
- RF-02: spec elegivel para triagem automatica deve atender simultaneamente: `Status: approved` e `Spec treatment: pending`.
- RF-03: comando `/specs` deve listar somente specs elegiveis do projeto ativo.
- RF-04: comando `/run_specs` deve exigir argumento explicito de arquivo (`/run_specs <arquivo-da-spec.md>`), sem selecao implicita em memoria.
- RF-05: o runner deve permitir apenas uma execucao de triagem de spec por vez.
- RF-06: a etapa de triagem deve executar `prompts/01-avaliar-spec-e-gerar-tickets.md` com substituicao obrigatoria de `<SPEC_PATH>`.
- RF-07: deve existir novo prompt para fechamento da triagem de spec com commit/push antes da rodada de tickets.
- RF-08: o commit de triagem deve seguir padrao `chore(specs): triage <arquivo-da-spec.md>`.
- RF-09: sem sucesso na etapa de commit/push da triagem, o runner nao deve iniciar `run_all`.
- RF-10: apos sucesso da triagem + commit/push, o runner deve iniciar automaticamente a rodada de tickets como `/run_all`.
- RF-11: a rodada iniciada por `/run_specs` deve consumir todo backlog aberto (tickets novos e preexistentes).
- RF-12: `/specs` e `/run_specs` devem respeitar o mesmo controle de acesso de `TELEGRAM_ALLOWED_CHAT_ID`.
- RF-13: logs e estado do runner devem incluir fases de spec (`select-spec`, `spec-triage`, `spec-close-and-version`) e a spec atual em processamento.
- RF-14: politica de status da spec na triagem: sem gaps -> `Status: attended`; com gaps -> manter `Status: approved` e registrar pendencias/tickets.

## Nao-escopo
- Selecao de multiplas specs para execucao em lote.
- Paralelizacao de specs ou tickets.
- Pular commit/push da triagem de spec antes da rodada de tickets.
- Estado de selecao de spec por chat/usuario.
- Regras de elegibilidade baseadas apenas em heuristica textual sem metadata explicita.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/specs` lista apenas arquivos de `docs/specs/` com `Status: approved` e `Spec treatment: pending`.
- [x] CA-02 - `/run_specs` sem argumento retorna mensagem de uso e nao inicia execucao.
- [x] CA-03 - `/run_specs <arquivo>` com spec inexistente ou nao elegivel retorna bloqueio explicito e nao inicia execucao.
- [x] CA-04 - Durante rodada ativa, `/run_specs` responde `already-running` e nao inicia novo fluxo.
- [x] CA-05 - Na etapa de triagem, o prompt 01 recebe `<SPEC_PATH>` substituido por `docs/specs/<arquivo>`.
- [x] CA-06 - A etapa de fechamento da triagem executa commit/push com mensagem `chore(specs): triage <arquivo-da-spec.md>`.
- [x] CA-07 - Sem sucesso no commit/push da triagem, `run_all` nao e iniciado.
- [x] CA-08 - Com sucesso no commit/push da triagem, `run_all` inicia automaticamente na mesma solicitacao.
- [x] CA-09 - A rodada resultante processa tickets ja existentes alem dos criados pela triagem.
- [x] CA-10 - `/status` reflete fase e contexto de spec durante triagem e volta para fases de ticket no `run_all`.
- [x] CA-11 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chats nao autorizados nao executam `/specs` nem `/run_specs`.
- [x] CA-12 - Specs sem gaps sao atualizadas para `Status: attended` antes do commit/push da triagem.
- [x] CA-13 - Ao concluir a triagem em `/run_specs`, o operador recebe milestone proativo no Telegram com spec, resultado, fase final e proxima acao (sucesso/falha).

## Status de atendimento (documento vivo)
- Estado geral: attended
- Itens atendidos:
  - O runner ja possui ciclo sequencial por ticket via `/run_all`, com fail-fast e validacao de sincronismo git.
  - O projeto ja possui prompt base de avaliacao de spec com placeholder `<SPEC_PATH>` (`prompts/01-avaliar-spec-e-gerar-tickets.md`).
  - O bot Telegram ja aplica controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID`.
  - A fila atual ja processa backlog aberto com prioridade (`P0` -> `P1` -> `P2`) no ciclo de tickets.
  - Fluxo `/run_specs <arquivo-da-spec.md>` implementado com gate unico de concorrencia (`already-running`) e validacao de uso sem argumento.
  - Runner ampliado com fases de spec (`select-spec`, `spec-triage`, `spec-close-and-version`) e campo `currentSpec` no estado.
  - Triagem de spec executa `prompts/01-avaliar-spec-e-gerar-tickets.md` com substituicao de `<SPEC_PATH>`.
  - Fechamento da triagem integrado com novo prompt `prompts/05-encerrar-tratamento-spec-commit-push.md` e commit padrao `chore(specs): triage <arquivo-da-spec.md>`.
  - Fail-gate implementado: falha em `spec-close-and-version` bloqueia rodada de tickets; sucesso encadeia `/run_all` automaticamente.
  - Runner passou a emitir evento de lifecycle dedicado para milestone de conclusao da triagem (`run_specs`) em sucesso/falha.
  - Telegram passou a enviar notificacao proativa dessa milestone antes do handoff para tickets, usando `notificationChatId` capturado por comando `/run_specs` ou callback de `/specs`.
  - `/status` agora exibe `Spec atual` durante triagem e transicao para fases de ticket apos handoff.
  - `FileSystemSpecDiscovery` implementado para listar specs elegiveis e validar `Status: approved` + `Spec treatment: pending` no projeto ativo.
  - Comando `/specs` implementado com listagem deterministica de specs elegiveis e gate de acesso por `TELEGRAM_ALLOWED_CHAT_ID`.
  - `/run_specs <arquivo>` agora valida existencia/elegibilidade antes de iniciar triagem, bloqueando entradas invalidas, specs inexistentes e nao elegiveis com mensagem explicita.
- Pendencias em aberto:
  - Nenhuma pendencia funcional aberta nesta spec.
- Evidencias de validacao:
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/ticket-queue.ts
  - src/integrations/ticket-queue.test.ts
  - src/integrations/codex-client.ts
  - src/integrations/codex-client.test.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
  - src/integrations/spec-discovery.ts
  - src/integrations/spec-discovery.test.ts
  - src/integrations/git-client.ts
  - src/integrations/git-client.test.ts
  - src/types/state.ts
  - src/main.ts
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/05-encerrar-tratamento-spec-commit-push.md
  - prompts/04-encerrar-ticket-commit-push.md
  - SPECS.md
  - docs/specs/templates/spec-template.md
  - README.md

## Riscos e impacto
- Risco funcional: parser de metadata de spec interpretar formato inconsistente e classificar spec incorretamente.
- Risco operacional: commit/push da triagem falhar e interromper cadeia antes do `run_all`.
- Mitigacao: validar formato de metadata com mensagens claras, testes de parser, fail-fast antes de iniciar tickets e logs por fase.

## Decisoes e trade-offs
- 2026-02-19 - Adotar metadata explicita `Spec treatment` - elimina ambiguidade sobre "spec tratada" e evita retriagem acidental.
- 2026-02-19 - Manter execucao de uma spec por vez - simplifica estado do runner e reduz risco de conflitos de rastreabilidade.
- 2026-02-19 - Exigir `/run_specs <arquivo>` sem selecao implicita - comando fica deterministico e auditavel em log.
- 2026-02-19 - Exigir commit/push da triagem antes do `run_all` - garante rastreabilidade da derivacao da spec no historico git.
- 2026-02-19 - Quando nao houver gaps, promover spec para `Status: attended` na propria triagem - mantem documento vivo coerente.

## Historico de atualizacao
- 2026-02-19 19:34Z - Versao inicial da spec criada com escopo fechado para triagem de specs approved pendentes com execucao automatica de tickets.
- 2026-02-19 19:41Z - Revisao de gaps concluida com abertura de 3 tickets (orquestracao `/run_specs`, listagem/elegibilidade `/specs` e baseline de metadata `Spec treatment`).
- 2026-02-19 19:57Z - Fluxo `/run_specs` implementado e validado com fail-gate, handoff para `/run_all`, novo prompt `05` e cobertura de testes para CA-02, CA-04..CA-10 e CA-12.
- 2026-02-19 20:11Z - `/specs` e validacao de elegibilidade/existencia em `/run_specs` implementados com cobertura automatizada para CA-01, CA-03 e CA-11.
- 2026-02-27 04:30Z - Milestone proativa de conclusao da triagem em `/run_specs` implementada para sucesso/falha e validada para origem por comando `/run_specs` e callback de `/specs` (CA-13).
- 2026-03-20 01:44Z - Spec encerrada documentalmente como atendida; metadata `Spec treatment`, status e rastreabilidade foram consolidados apos o fechamento do ticket remanescente.
