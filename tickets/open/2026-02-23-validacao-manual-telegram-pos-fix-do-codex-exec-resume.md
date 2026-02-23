# [TICKET] Validacao manual em Telegram do fix de `codex exec resume` para `/codex_chat` e `/plan_spec`

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-23 12:11Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md
- Parent execplan (optional): execplans/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md
- Parent commit (optional): mesmo changeset de fechamento com split-follow-up
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - execplans/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md
  - tickets/closed/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md

## Context
- Workflow area: validacao operacional em sessoes Telegram (`/codex_chat` e `/plan_spec`)
- Scenario: mudanca de contrato de `exec resume` concluida e validada por testes, faltando aceite manual no ambiente real do bot.
- Input constraints: manter fluxo sequencial e registrar evidencia objetiva de sucesso/erro por turno.

## Problem statement
O bug de parser por `-s` no `codex exec resume` foi corrigido no codigo e validado localmente, mas o aceite final deste fluxo depende de validacao manual ponta-a-ponta no Telegram, ainda nao executada no ciclo anterior.

## Observed behavior
- O que foi observado:
  - Testes automatizados relevantes passaram (`src/integrations/codex-client.test.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`).
  - `codex exec resume --help` confirma ausencia de `-s/--sandbox` no subcomando.
  - Execucao real local de `codex exec` + `codex exec resume` com `--dangerously-bypass-approvals-and-sandbox` nao apresentou `unexpected argument '-s'`.
  - Faltou evidencia manual em Telegram para segundo turno dos dois fluxos.
- Frequencia (unico, recorrente, intermitente): unico (pendencia de aceite)
- Como foi detectado (warning/log/test/assert): gate de fechamento `NO_GO` no ticket pai

## Expected behavior
No ambiente Telegram real, o segundo turno de `/codex_chat` e `/plan_spec` deve concluir sem erro de parser, mantendo contexto por `thread_id` e retornando resposta normal do Codex.

## Reproduction steps
1. Iniciar `/codex_chat` e enviar a primeira mensagem.
2. Enviar segunda mensagem no mesmo chat e verificar continuidade sem `unexpected argument '-s'`.
3. Iniciar `/plan_spec`, enviar brief inicial e depois mensagem de refinamento.
4. Confirmar que o segundo turno segue ativo e sem parser error em ambos os fluxos.
5. Registrar evidencias objetivas (timestamp UTC + trecho de log/resposta).

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Usage: codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]`
  - ausencia de `-s/--sandbox` em `codex exec resume --help`
- Warnings/codes relevantes:
  - N/A (pendencia operacional de aceite)
- Comparativo antes/depois (se houver):
  - Antes: segundo turno em Telegram quebrava com `unexpected argument '-s'`.
  - Depois esperado: segundo turno funcional em `/codex_chat` e `/plan_spec`.

## Impact assessment
- Impacto funcional: alto para aceite, pois ainda nao ha confirmacao operacional no ambiente alvo.
- Impacto operacional: alto, bloqueia conclusao formal do incidente original.
- Risco de regressao: medio, por depender de comportamento integrado CLI + runner + bot.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/codex-client.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`.

## Initial hypotheses (optional)
- O ajuste tecnico deve estar correto; risco remanescente principal e variacao de ambiente operacional (sessao real no Telegram/bot).

## Proposed solution (optional)
- Executar validacao manual guiada no ambiente Telegram com dois turnos por fluxo e fechar este follow-up no mesmo commit de evidencias/documentacao.

## Closure criteria
- Validar manualmente `/codex_chat` em dois turnos sem parser error no segundo turno.
- Validar manualmente `/plan_spec` em dois turnos sem parser error no segundo turno.
- Registrar evidencias objetivas (tempo UTC e output/log resumido) no ticket.
- Encerrar este ticket com `Status: closed` e `Closure reason: fixed`.

## Decision log
- 2026-02-23 - Ticket criado como follow-up `P0` apos fechamento `NO_GO` do ticket pai por pendencia de validacao manual em Telegram.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
