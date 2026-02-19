# [SPEC] Triagem de specs approved pendentes com /specs e /run_specs

## Metadata
- Spec ID: 2026-02-19-approved-spec-triage-run-specs
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-02-19 19:34Z
- Last reviewed at (UTC): 2026-02-19 19:34Z
- Source: technical-evolution
- Related tickets:
  - A definir
- Related execplans:
  - A definir
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
- [ ] CA-01 - `/specs` lista apenas arquivos de `docs/specs/` com `Status: approved` e `Spec treatment: pending`.
- [ ] CA-02 - `/run_specs` sem argumento retorna mensagem de uso e nao inicia execucao.
- [ ] CA-03 - `/run_specs <arquivo>` com spec inexistente ou nao elegivel retorna bloqueio explicito e nao inicia execucao.
- [ ] CA-04 - Durante rodada ativa, `/run_specs` responde `already-running` e nao inicia novo fluxo.
- [ ] CA-05 - Na etapa de triagem, o prompt 01 recebe `<SPEC_PATH>` substituido por `docs/specs/<arquivo>`.
- [ ] CA-06 - A etapa de fechamento da triagem executa commit/push com mensagem `chore(specs): triage <arquivo-da-spec.md>`.
- [ ] CA-07 - Sem sucesso no commit/push da triagem, `run_all` nao e iniciado.
- [ ] CA-08 - Com sucesso no commit/push da triagem, `run_all` inicia automaticamente na mesma solicitacao.
- [ ] CA-09 - A rodada resultante processa tickets ja existentes alem dos criados pela triagem.
- [ ] CA-10 - `/status` reflete fase e contexto de spec durante triagem e volta para fases de ticket no `run_all`.
- [ ] CA-11 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chats nao autorizados nao executam `/specs` nem `/run_specs`.
- [ ] CA-12 - Specs sem gaps sao atualizadas para `Status: attended` antes do commit/push da triagem.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - O runner ja possui ciclo sequencial de tickets e fail-fast via `/run_all`.
  - O projeto ja possui prompt de triagem de spec (`prompts/01-avaliar-spec-e-gerar-tickets.md`) com placeholder `<SPEC_PATH>`.
  - A infraestrutura atual ja suporta preflight de autenticacao do Codex CLI e controle de acesso no Telegram.
  - O fluxo atual ja exige commit/push no fechamento de ticket.
- Pendencias em aberto:
  - Implementar descoberta e listagem de specs elegiveis no projeto ativo.
  - Implementar comando `/specs` no Telegram.
  - Implementar comando `/run_specs <arquivo-da-spec.md>`.
  - Implementar etapas de execucao de spec (`spec-triage` e `spec-close-and-version`) no runner/Codex client.
  - Criar prompt de commit/push para fechamento da triagem da spec.
  - Migrar specs existentes para metadata `Spec treatment`.
  - Adicionar observabilidade de fase/spec no estado do runner e no `/status`.
- Evidencias de validacao:
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/codex-client.ts
  - src/integrations/codex-client.test.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
  - src/integrations/git-client.ts
  - src/integrations/git-client.test.ts
  - src/types/state.ts
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/05-encerrar-tratamento-spec-commit-push.md
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
