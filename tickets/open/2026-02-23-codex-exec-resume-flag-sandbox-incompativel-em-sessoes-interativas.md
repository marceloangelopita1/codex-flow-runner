# [TICKET] Segunda interacao de /codex_chat falha por uso invalido de `-s` em `codex exec resume`

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-23 12:01Z
- Reporter: codex
- Owner: mapita
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - src/integrations/codex-client.ts
  - src/integrations/codex-client.test.ts
  - tickets/closed/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md

## Context
- Workflow area: sessoes interativas `codex exec/resume --json` em `/codex_chat` e `/plan_spec`
- Scenario: primeira mensagem da sessao funciona, mas a segunda interacao (que usa `resume`) falha e encerra o contexto
- Input constraints: manter fluxo sequencial e preservar contrato de full access por chamada

## Problem statement
O cliente monta os argumentos de `codex exec resume` incluindo `-s danger-full-access` depois do subcomando `resume`. No `codex-cli 0.104.0`, `-s/--sandbox` nao e opcao valida de `codex exec resume`, gerando erro de parsing (exit code 2) antes da execucao. Com isso, o fluxo perde continuidade de contexto apos a primeira interacao.

## Observed behavior
- O que foi observado:
  - No Telegram, a segunda mensagem em `/codex_chat` retorna: `codex exec terminou com codigo 2: error: unexpected argument '-s' found`.
  - O builder de resume injeta `... "exec", "resume", ..., "-s", "danger-full-access", ...` tanto para `/codex_chat` quanto para `/plan_spec`.
  - `codex exec resume --help` nao lista `-s/--sandbox` como opcao valida.
  - Reproducao local direta confirma a mesma falha: `codex -a never exec resume --skip-git-repo-check -s danger-full-access --json <thread> "teste"`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): erro em producao via Telegram + reproducao local em CLI

## Expected behavior
A segunda (e demais) interacoes de sessoes `/codex_chat` e `/plan_spec` devem usar `codex exec resume` de forma compativel com a CLI atual, mantendo o contexto por `thread_id` sem erro de parsing de argumentos.

## Reproduction steps
1. Iniciar `/codex_chat` e enviar uma mensagem inicial (turno inicial usa `codex exec` sem `resume`).
2. Enviar uma segunda mensagem no mesmo chat e observar falha com `unexpected argument '-s'`.
3. Executar `codex exec resume --help` e verificar ausencia de `-s/--sandbox` na lista de opcoes.
4. Executar `codex -a never exec resume --skip-git-repo-check -s danger-full-access --json 019c7f32-4dda-71a0-a33f-00b65eca7c2b "teste"` e observar o mesmo erro.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `error: unexpected argument '-s' found`
  - `Usage: codex exec resume [OPTIONS] [SESSION_ID] [PROMPT]`
- Warnings/codes relevantes:
  - `codex exec terminou com codigo 2`
- Comparativo antes/depois (se houver):
  - Antes: primeiro turno (sem `resume`) funciona.
  - Depois: segundo turno (com `resume`) falha no parser da CLI.
- Referencias de codigo:
  - `src/integrations/codex-client.ts:255`
  - `src/integrations/codex-client.ts:266`
  - `src/integrations/codex-client.ts:668`
  - `src/integrations/codex-client.ts:914`
  - `src/integrations/codex-client.test.ts:333`
  - `src/integrations/codex-client.test.ts:510`

## Impact assessment
- Impacto funcional: alto, quebra a persistencia de contexto apos a primeira interacao de `/codex_chat`.
- Impacto operacional: alto, gera falsa impressao de sessao ativa, mas com impossibilidade de continuidade conversacional.
- Risco de regressao: medio, pois ajuste de argumentos impacta os dois backends interativos (`/codex_chat` e `/plan_spec`).
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, lifecycle de sessao no `runner` e UX de erro no Telegram.

## Initial hypotheses (optional)
- A padronizacao de full access por chamada aplicou `-s danger-full-access` sem considerar restricao especifica de flags no subcomando `exec resume`.
- A suite atual valida presenca de `resume` e `thread_id`, mas nao valida compatibilidade real das opcoes aceitas pela CLI no caminho de resume.

## Proposed solution (optional)
- Ajustar montagem de argumentos de resume para um formato compativel com `codex exec resume` no `codex-cli` atual, preservando full access sem passar `-s` como opcao do subcomando `resume`.
- Adicionar testes que congelem o contrato de argumentos de resume e impeçam regressao de flags invalidas.

## Closure criteria
- Segunda interacao de `/codex_chat` funciona sem erro de parsing e preserva contexto.
- Fluxo de resume de `/plan_spec` permanece funcional.
- Testes automatizados cobrem explicitamente contrato de argumentos de `exec resume`.
- Validacao manual com `codex exec resume --help` e execucao real sem `unexpected argument '-s'`.

## Decision log
- 2026-02-23 - Ticket aberto a partir de incidente em producao no Telegram com reproducao local no `codex-cli 0.104.0`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
