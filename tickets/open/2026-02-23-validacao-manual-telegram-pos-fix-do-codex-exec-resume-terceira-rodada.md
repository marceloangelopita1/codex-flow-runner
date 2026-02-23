# [TICKET] Validacao manual em Telegram do fix de `codex exec resume` para `/codex_chat` e `/plan_spec` (terceira rodada)

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-23 13:27Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md
- Parent execplan (optional): execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md
- Parent commit (optional): mesmo changeset de fechamento split-follow-up da segunda rodada
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md
  - tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md

## Context
- Workflow area: validacao operacional em sessoes Telegram (`/codex_chat` e `/plan_spec`)
- Scenario: o fix tecnico permanece estavel em testes/CLI, mas o aceite manual real no Telegram segue pendente.
- Input constraints: fluxo sequencial, evidencia objetiva por fluxo e fechamento somente com gate `GO`.

## Problem statement
A rodada anterior fechou com `NO_GO` por bloqueio operacional: ausencia de cliente Telegram de usuario no terminal e indisponibilidade de observabilidade por `systemd` neste host.

## Pending items (from parent `NO_GO`)
- Executar `/codex_chat` em dois turnos no chat autorizado e confirmar ausencia de `unexpected argument '-s'` no segundo turno.
- Executar `/plan_spec` em dois turnos no chat autorizado e confirmar ausencia de `unexpected argument '-s'` no segundo turno.
- Registrar timestamps UTC e evidencias objetivas no ticket (resposta observavel e correlacao de logs quando disponivel).
- Consolidar gate final `GO/NO_GO` com justificativa auditavel.

## Blocking factors observed
- Este terminal nao possui cliente Telegram de usuario para envio de comandos como humano ao bot.
- Host da rodada anterior sem unit `codex-flow-runner.service`, reduzindo trilha de `journalctl -u`.

## Expected behavior
Aceite manual completo em Telegram para ambos os fluxos interativos sem parser error no segundo turno, com evidencias suficientes para fechamento com `Closure reason: fixed`.

## Reproduction steps
1. No chat autorizado, executar `/status` e confirmar estado inicial sem sessao conflitante.
2. Executar `/codex_chat` e enviar duas mensagens sequenciais no mesmo contexto.
3. Encerrar `/codex_chat` e executar `/plan_spec` com brief inicial + refinamento (segundo turno).
4. Confirmar ausencia de `unexpected argument '-s'` nas respostas e logs do periodo.
5. Registrar evidencias objetivas no ticket e decidir gate final.

## Evidence (current baseline)
- `codex exec resume --help` segue sem `-s/--sandbox` no subcomando `resume`.
- `npm run test -- src/integrations/codex-client.test.ts` segue com `# pass 229` e `# fail 0`.
- Rodada imediatamente anterior registrou `NO_GO` por bloqueio operacional, nao por regressao funcional comprovada.

## Impact assessment
- Impacto funcional: alto para aceite final.
- Impacto operacional: alto, pois bloqueia encerramento definitivo do incidente.
- Risco de regressao: medio enquanto nao houver evidencia manual ponta-a-ponta em ambiente real.

## Closure criteria
- Validar manualmente `/codex_chat` em dois turnos sem parser error no segundo turno.
- Validar manualmente `/plan_spec` em dois turnos sem parser error no segundo turno.
- Registrar evidencias objetivas (tempo UTC e output/log resumido) no ticket.
- Encerrar este ticket com `Status: closed` e `Closure reason: fixed` quando o gate for `GO`.

## Decision log
- 2026-02-23 13:27Z - Ticket criado como follow-up `P0` apos fechamento `split-follow-up` da segunda rodada.
  - Motivo: pendencias criticas de validacao manual ainda impedem aceite final.
  - Vinculos: ticket pai, execplan da segunda rodada e commit de fechamento no mesmo changeset.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
