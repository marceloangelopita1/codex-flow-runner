# [TICKET] Observabilidade, status operacional e cobertura de aceitacao para /codex_chat estao ausentes

## Metadata
- Status: open
- Priority: P2
- Severity: S2
- Created at (UTC): 2026-02-21 00:06Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/open/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - README.md
  - tickets/open/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md

## Context
- Workflow area: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `README.md`, suites de teste
- Scenario: apos implementar o fluxo `/codex_chat`, a spec exige visibilidade clara de lifecycle no status/logs e evidencias automatizadas dos CAs.
- Input constraints: nao regredir observabilidade existente de `/plan_spec` e manter rastreabilidade por motivo de encerramento.

## Problem statement
Hoje nao ha trilha operacional dedicada para `/codex_chat` em `/status`, logs e documentacao de comandos, e nao existe cobertura de testes para os criterios de aceitacao da nova jornada.

## Observed behavior
- O que foi observado:
  - `/status` mostra apenas indicador e detalhes de sessao `/plan_spec`, sem qualquer bloco de `/codex_chat` (`src/integrations/telegram-bot.ts:2804`, `src/integrations/telegram-bot.ts:2825`).
  - Mensagens de log/lifecycle no runner estao focadas em `/plan_spec` (`src/core/runner.ts:323`, `src/core/runner.ts:1039`, `src/core/runner.ts:1238`).
  - README nao documenta `/codex_chat` nem alias `/codex-chat` na secao de comandos (`README.md:67`, `README.md:77`).
  - Suite de testes do Telegram enumera comandos suportados sem `/codex_chat` (`src/integrations/telegram-bot.test.ts:70`).
  - Suite de runner cobre lifecycle de `/plan_spec`, mas nao cobre fluxo dedicado de chat livre (`src/core/runner.test.ts:1507`, `src/core/runner.test.ts:2206`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de status/logs/docs e leitura das suites de teste.

## Expected behavior
O sistema deve expor observabilidade completa de `/codex_chat` (inicio, continuidade e encerramento por manual/timeout/troca de comando) em logs e `/status`, documentar comandos oficiais no README e manter cobertura automatizada para os CAs da spec.

## Reproduction steps
1. Ler `buildStatusReply` e confirmar ausencia de secao para `/codex_chat`.
2. Ler logs do runner e confirmar que as trilhas de lifecycle referenciam somente `/plan_spec`.
3. Ler README e testes atuais para confirmar ausencia de comando e cenarios `/codex_chat`.

## Evidence
- `src/integrations/telegram-bot.ts:2804`
- `src/integrations/telegram-bot.ts:2825`
- `src/core/runner.ts:323`
- `src/core/runner.ts:1039`
- `src/core/runner.ts:1238`
- `README.md:67`
- `README.md:77`
- `src/integrations/telegram-bot.test.ts:70`
- `src/core/runner.test.ts:1507`
- `src/core/runner.test.ts:2206`

## Impact assessment
- Impacto funcional: medio, bloqueia RF-12 e dificulta validar CA-01..CA-10 com evidencias.
- Impacto operacional: medio, reduz capacidade de diagnostico e suporte em producao.
- Risco de regressao: medio, altera saidas de status/log e contratos de teste/documentacao.
- Scope estimado (quais fluxos podem ser afetados): `/status`, logs do runner, README, testes de `runner` e `telegram-bot`.

## Initial hypotheses (optional)
- A implementacao atual priorizou entrega de `/plan_spec` e ainda nao adicionou baseline observavel para nova sessao conversacional.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Incluir no `/status` estado operacional de `/codex_chat` (ativo/inativo, fase, timestamps e motivo de encerramento quando aplicavel).
- Registrar logs de lifecycle de `/codex_chat` para inicio, continuidade e encerramento por: manual, timeout e troca por comando.
- Atualizar README e help do bot com `/codex_chat` e alias `/codex-chat`.
- Adicionar testes automatizados cobrindo criterios observaveis de CA-01..CA-10 para o fluxo `/codex_chat`.
- Atualizar a spec com evidencias de validacao apos entrega dos tickets dependentes.

## Decision log
- 2026-02-21 - Gap aberto como P2 para executar apos base funcional P0/P1 e consolidar fechamento de rastreabilidade da spec.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
