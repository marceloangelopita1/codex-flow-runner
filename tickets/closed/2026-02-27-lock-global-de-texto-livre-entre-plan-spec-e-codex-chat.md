# [TICKET] /plan_spec e /codex_chat nao compartilham lock global unico com taxonomia unificada

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-27 04:16Z
- Reporter: codex
- Owner: a definir
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (revisao estatica da spec e codigo)
  - Response file: N/A (revisao estatica da spec e codigo)
  - Log file: N/A (evidencias objetivas em codigo e testes)
- Related docs/execplans:
  - docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md
  - docs/specs/2026-02-19-telegram-plan-spec-conversation.md
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - execplans/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): falta de lock global unico e bidirecional para texto livre pode gerar concorrencia indevida entre sessoes interativas e taxonomia de bloqueio divergente da spec.

## Context
- Workflow area: sessoes interativas de texto livre (`/plan_spec` e `/codex_chat`) no runner e no bot Telegram.
- Scenario: bloqueio hoje e assimetrico; `/codex_chat` bloqueia com `/plan_spec` ativo, mas `/plan_spec` nao bloqueia simetricamente quando `/codex_chat` esta ativo em outro projeto.
- Input constraints: manter apenas uma sessao global de texto livre ativa por vez, sem bloquear runs em projetos diferentes.

## Problem statement
A implementacao atual nao materializa um lock global unico de texto livre com motivo taxonomico `global-free-text-busy`, e a exclusao mutua entre `/plan_spec` e `/codex_chat` fica incompleta.

## Observed behavior
- O que foi observado:
  - `/codex_chat` bloqueia quando `/plan_spec` esta ativo, usando motivo `plan-spec-active`.
  - `startPlanSpecSession` nao verifica sessao ativa de `/codex_chat` antes de reservar slot.
  - `reserveSlot` bloqueia por projeto, permitindo coexistencia de sessoes de texto livre em projetos diferentes.
  - roteamento de texto no Telegram chama handlers de `/codex_chat` e `/plan_spec` em sequencia, sem um gate global explicito de sessao unica.
- Frequencia (unico, recorrente, intermitente): recorrente (gap estrutural)
- Como foi detectado (warning/log/test/assert):
  - `src/core/runner.ts:833-838` (bloqueio de `/codex_chat` por `plan-spec-active`).
  - `src/core/runner.ts:578-634` (`startPlanSpecSession` sem bloqueio explicito para `/codex_chat` ativo).
  - `src/core/runner.ts:3673-3685` (bloqueio apenas por `slotKey` de projeto).
  - `src/integrations/telegram-bot.ts:1078-1080` + `1247-1282` + `1482-1520` (roteamento sequencial de texto sem lock global unificado).
  - `src/core/runner.test.ts:2769-2787` cobre apenas o bloqueio de `/codex_chat` quando `/plan_spec` esta ativo (falta caso inverso CA-04).

## Expected behavior
- Deve existir lock global unico para texto livre compartilhado por `/plan_spec` e `/codex_chat`.
- Inicio de qualquer um dos dois comandos, com sessao global ativa, retorna `global-free-text-busy`.
- Mensagens de texto livre sao roteadas apenas para a sessao global ativa ate encerramento/timeout.
- Lock global de texto livre nao deve bloquear `/run_all` e `/run_specs` em outro projeto quando houver capacidade.

## Reproduction steps
1. Iniciar `/codex_chat` no projeto `alpha-project`.
2. Trocar projeto ativo para `beta-project`.
3. Iniciar `/plan_spec`.
4. Observar que a implementacao atual pode iniciar a sessao (ausencia de bloqueio global bidirecional esperado).

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - bloqueio atual de `/codex_chat`: motivo `plan-spec-active`.
- Warnings/codes relevantes:
  - motivo esperado na spec: `global-free-text-busy`.
  - motivo atual: `plan-spec-active`.
- Comparativo antes/depois (se houver):
  - Antes: lock parcial/assimetrico para texto livre.
  - Depois (esperado): lock global unico e bidirecional, com taxonomia padronizada.

## Impact assessment
- Impacto funcional: viola RF-05, RF-06, RF-08 e RF-10 da spec alvo.
- Impacto operacional: risco de mistura de contexto em sessoes interativas e bloqueios com semantica inconsistente para o operador.
- Risco de regressao: medio (runner + telegram + testes de sessao e roteamento).
- Scope estimado (quais fluxos podem ser afetados): `startPlanSpecSession`, `startCodexChatSession`, roteamento de texto livre no Telegram, `/status` e logs de bloqueio.

## Initial hypotheses (optional)
- O controle de exclusao mutua foi implementado de forma unilateral (`plan_spec` -> bloqueia `codex_chat`) sem lock global compartilhado.

## Proposed solution (optional)
- Introduzir lock global explicito de texto livre no runner, com motivo unico `global-free-text-busy` e cobertura de testes bidirecionais.

## Closure criteria
- CA-03 e CA-04 da spec alvo atendidos com bloqueio `global-free-text-busy` em ambos os sentidos.
- CA-06 atendido com roteamento de texto para apenas uma sessao global ativa.
- CA-08 atendido para bloqueios de texto livre com motivo taxonomico e contexto de projeto quando aplicavel.
- Garantia de nao regressao do comportamento de runs em outros projetos (CA-05).

## Decision log
- 2026-02-27 - Ticket aberto a partir de revisao de gaps da spec de lock global para texto livre.
- 2026-02-27 - Validacao do ExecPlan concluida com classificacao `GO`; entrega tecnica confirmada por testes, check e build.

## Closure
- Closed at (UTC): 2026-02-27 04:51Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md (commit de fechamento deste ticket)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Evidencia objetiva de aceite tecnico:
  - `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> pass (`178/178`).
  - `npm test` -> pass (`272/272`).
  - `npm run check && npm run build` -> pass.
  - `rg -n "plan-spec-active" src/core src/integrations src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> sem ocorrencias.
  - `rg -n "global-free-text-busy" src/core src/integrations src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> ocorrencias presentes em contratos de bloqueio e testes.
- Entrega tecnica concluida:
  - lock global bidirecional de texto livre aplicado no runner para `/plan_spec` e `/codex_chat` com motivo unico `global-free-text-busy`.
  - roteamento de texto livre no Telegram consolidado com gate unico de sessao ativa, evitando dupla entrega no mesmo update.
  - handoff de comando ajustado para preservar bloqueio esperado ao tentar `/plan_spec` durante `/codex_chat`.
  - spec de concorrencia por projeto/contexto global atualizada para `Status: attended` com RF/CA deste ticket marcados como atendidos.
- Validacao manual externa ainda necessaria:
  - Entrega tecnica concluida: sim; pendencia remanescente e apenas operacional em ambiente Telegram real.
  - Objetivo: confirmar no chat real o bloqueio bidirecional `global-free-text-busy` e o roteamento unico de texto livre por sessao ativa.
  - Como executar:
    1. iniciar o bot no ambiente real com chat autorizado e garantir que nao haja sessao interativa ativa;
    2. iniciar `/codex_chat`, trocar para outro projeto e tentar `/plan_spec`, confirmando bloqueio `global-free-text-busy`;
    3. encerrar a sessao, iniciar `/plan_spec` e tentar `/codex_chat`, confirmando bloqueio no sentido inverso;
    4. durante uma sessao ativa, enviar texto livre e validar que apenas a sessao ativa recebe o input.
  - Responsavel operacional: operador do bot Telegram em ambiente real (mapita/time de operacao).
