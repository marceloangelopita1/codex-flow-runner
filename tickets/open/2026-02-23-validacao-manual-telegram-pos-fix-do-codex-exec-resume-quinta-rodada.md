# [TICKET] Validacao manual em Telegram do fix de `codex exec resume` para `/codex_chat` e `/plan_spec` (quinta rodada)

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-23 13:40Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md
- Parent execplan (optional): execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md
- Parent commit (optional): mesmo changeset de fechamento split-follow-up da quarta rodada
- Request ID: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md
  - tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md

## Problem statement
A quarta rodada encerrou com `NO_GO` por bloqueio operacional: host sem cliente Telegram de usuario para executar comandos manuais no chat autorizado e sem unit `codex-flow-runner.service` para correlacao por `journalctl -u`.

## Pendencias principais
- Validar `/codex_chat` em dois turnos no mesmo contexto sem `unexpected argument '-s'`.
- Validar `/plan_spec` em dois turnos (brief inicial + refinamento) sem `unexpected argument '-s'`.
- Registrar `/status` antes e depois dos fluxos e `/plan_spec_status` ao final.
- Consolidar evidencias objetivas com janela UTC e saidas observaveis.

## Evidencias herdadas da quarta rodada
- Janela UTC anterior: `2026-02-23 13:37Z` ate `2026-02-23 13:38Z`.
- `TELEGRAM_ALLOWED_CHAT_ID` configurado (`1314750680`).
- `codex exec resume --help` sem `-s/--sandbox`.
- `npm run test -- src/integrations/codex-client.test.ts` verde (`# pass 229`, `# fail 0`).
- Bloqueio operacional persistente: `telegram-cli`, `tg`, `tdl`, `telethon` indisponiveis e unit `codex-flow-runner.service` ausente.

## Validation checklist (must pass for `GO`)
- [ ] `/codex_chat` validado manualmente em dois turnos no Telegram real sem parser error.
- [ ] `/plan_spec` validado manualmente em dois turnos no Telegram real sem parser error.
- [ ] Evidencias objetivas registradas com janela UTC e saidas observaveis.
- [ ] Correlacao de logs registrada (ou justificativa objetiva de indisponibilidade).

## Impact assessment
- Impacto funcional: alto para aceite final do incidente.
- Impacto operacional: alto, bloqueia encerramento definitivo da validacao.
- Risco de regressao: medio enquanto nao houver evidencia manual ponta-a-ponta.

## Decision log
- 2026-02-23 13:40Z - Ticket criado como follow-up `P0` apos fechamento `split-follow-up` da quarta rodada.
  - Motivo: criterios manuais obrigatorios do ExecPlan nao puderam ser executados no host atual.
  - Vinculos: ticket pai, execplan pai e commit de fechamento no mesmo changeset.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
