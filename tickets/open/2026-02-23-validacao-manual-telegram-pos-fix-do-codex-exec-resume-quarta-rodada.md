# [TICKET] Validacao manual em Telegram do fix de `codex exec resume` para `/codex_chat` e `/plan_spec` (quarta rodada)

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-23 13:34Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md
- Parent execplan (optional): execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md
- Parent commit (optional): mesmo changeset de fechamento split-follow-up da terceira rodada
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md
  - tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md

## Context
- Workflow area: validacao operacional em sessoes Telegram (`/codex_chat` e `/plan_spec`).
- Scenario: fix tecnico do `codex exec resume` continua estavel em CLI/testes, mas o aceite manual ponta-a-ponta no Telegram real segue pendente.
- Input constraints: fluxo estritamente sequencial, sem paralelizacao de tickets/sessoes.

## Problem statement
A terceira rodada encerrou com `NO_GO` por bloqueio operacional real no host de execucao: nao ha cliente Telegram de usuario para enviar comandos ao bot e nao ha unit `codex-flow-runner.service` para trilha de `journalctl -u`.

## Pending items (from parent `NO_GO`)
- Executar `/status` no chat autorizado antes e depois dos fluxos, confirmando ausencia de sessao conflitando.
- Executar `/codex_chat` em dois turnos e validar ausencia de `unexpected argument '-s'` no segundo turno.
- Executar `/plan_spec` em dois turnos e validar ausencia de `unexpected argument '-s'` no segundo turno.
- Registrar evidencias objetivas com timestamps UTC e resposta observavel de cada fluxo.
- Correlacionar logs da janela validada (quando unit `systemd` existir) e consolidar gate final `GO/NO_GO`.

## Blocking factors observed
- Terminal sem cliente Telegram de usuario (`telegram-cli`, `tg`, `tdl`, `telethon` indisponiveis).
- Host sem `codex-flow-runner.service`, reduzindo observabilidade operacional por unit.

## Expected behavior
Aceite manual completo em Telegram real para ambos os fluxos interativos, com segundo turno funcional e sem parser error, permitindo fechamento com `Closure reason: fixed`.

## Reproduction steps
1. No chat autorizado, executar `/status` e validar estado inicial.
2. Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto.
3. Encerrar `/codex_chat`, executar novo `/status` e validar limpeza.
4. Executar `/plan_spec` com prompt inicial e refinamento (segundo turno).
5. Executar `/plan_spec_status` e, se necessario, `/plan_spec_cancel` para limpeza final.
6. Registrar evidencias UTC e consolidar gate `GO/NO_GO` no ticket.

## Evidence (inherited baseline)
- `codex exec resume --help` segue exibindo uso sem `-s/--sandbox` no subcomando `resume`.
- `npm run test -- src/integrations/codex-client.test.ts` permanece verde (`# pass 229`, `# fail 0`).
- Bloqueio da terceira rodada foi operacional, sem indicio novo de regressao funcional.

## Validation checklist (must pass for `GO`)
- [ ] `/codex_chat` validado manualmente em dois turnos no Telegram real sem parser error.
- [ ] `/plan_spec` validado manualmente em dois turnos no Telegram real sem parser error.
- [ ] Evidencias objetivas registradas com janela UTC e saidas observaveis.
- [ ] Correlacao de logs registrada (ou justificativa objetiva de indisponibilidade).

## Impact assessment
- Impacto funcional: alto para aceite final do incidente.
- Impacto operacional: alto, pois bloqueia encerramento definitivo da trilha de validacao.
- Risco de regressao: medio enquanto nao houver evidencia manual ponta-a-ponta em ambiente real.

## Closure criteria
- Cumprir integralmente o checklist de validacao manual desta rodada.
- Registrar gate final explicito `GO` ou `NO_GO` com justificativa auditavel.
- Em caso de `GO`, fechar com `Closure reason: fixed`.
- Em caso de `NO_GO`, fechar com `Closure reason: split-follow-up` e abrir nova rodada com rastreabilidade.

## Decision log
- 2026-02-23 13:34Z - Ticket criado como follow-up `P0` apos fechamento `split-follow-up` da terceira rodada.
  - Motivo: bloqueios operacionais impediram aceite manual obrigatorio no Telegram real.
  - Vinculos: ticket pai, execplan da terceira rodada e commit de fechamento no mesmo changeset.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
