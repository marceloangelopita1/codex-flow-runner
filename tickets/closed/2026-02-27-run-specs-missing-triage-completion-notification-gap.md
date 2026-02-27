# [TICKET] /run_specs nao notifica conclusao da triagem da spec antes do ciclo de tickets

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-27 01:43Z
- Reporter: mapita
- Owner: a definir
- Source: production-observation
- Parent ticket (optional): tickets/closed/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md
- Parent execplan (optional): execplans/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (diagnostico estatico no codigo)
  - Response file: N/A (diagnostico estatico no codigo)
  - Log file: N/A (evidencias em leitura de codigo e testes existentes)
- Related docs/execplans:
  - docs/specs/2026-02-19-approved-spec-triage-run-specs.md
  - docs/specs/2026-02-19-telegram-run-status-notification.md
  - execplans/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md
  - execplans/2026-02-27-run-specs-missing-triage-completion-notification-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): falta feedback proativo na fronteira de fase de `run_specs` (triagem/commit da spec), gerando lacuna de observabilidade para operador.

## Context
- Workflow area: fluxo `run_specs` (etapas `spec-triage` e `spec-close-and-version`) com handoff para `run_all`.
- Scenario: triagem da spec conclui (incluindo commit/push e criacao de tickets), mas nao ha notificacao proativa de milestone no Telegram antes da rodada de tickets.
- Input constraints: operador acompanha progresso remoto somente por mensagens do bot; sem esse marco, progresso aparenta intermitencia.

## Problem statement
O fluxo `run_specs` atual nao emite mensagem proativa ao Telegram quando a triagem da spec termina (sucesso ou falha de fechamento), apesar de este ser um marco operacional importante: tickets foram criados e versionados, e o sistema vai iniciar (ou bloquear) a rodada de tickets em seguida.

## Observed behavior
- O que foi observado: conclusao da triagem fica apenas em estado interno/log, sem mensagem proativa equivalente no Telegram.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert):
  - `src/core/runner.ts:2498-2521` (`runSpecsAndRunAll`) conclui triagem e inicia `runForever` sem chamar emissor Telegram para milestone da triagem.
  - `src/core/runner.ts:50-80` define handlers de lifecycle para `plan_spec` e `codex_chat`, sem canal equivalente para milestone de `run_specs`.
  - `src/integrations/telegram-bot.ts:3980-4015` responde inicio/bloqueio do comando `/run_specs`, mas nao recebe evento proativo de "triagem concluida".

## Expected behavior
Ao finalizar `spec-close-and-version`, o operador deve receber notificacao proativa clara no Telegram com resultado da triagem da spec:
- sucesso: triagem encerrada e rodada de tickets iniciando;
- falha: triagem bloqueada e `run_all` nao iniciado, com motivo acionavel.

## Reproduction steps
1. Enviar `/run_specs <spec-elegivel.md>`.
2. Aguardar conclusao das etapas `spec-triage` e `spec-close-and-version`.
3. Verificar chat: apenas mensagem inicial de comando e, depois, resumos por ticket (quando houver), sem marco proativo da conclusao da triagem.
4. Repetir com falha em `spec-close-and-version` para observar ausencia de notificacao de bloqueio dedicada.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - Em sucesso: `Triagem de spec concluida com sucesso` (log interno).
  - Em falha: `Erro no ciclo de triagem de spec` (log interno).
- Warnings/codes relevantes:
  - Ausencia de evento Telegram dedicado para milestone de triagem.
- Comparativo antes/depois (se houver):
  - Antes: milestone de triagem visivel apenas em logs/status.
  - Depois (esperado): milestone notificada proativamente no chat.

## Impact assessment
- Impacto funcional: nenhuma quebra do processamento sequencial, mas lacuna de feedback do fluxo.
- Impacto operacional: operador nao sabe com clareza quando tickets foram criados/commitados pela triagem.
- Risco de regressao: medio (ajuste cruza runner + integracao Telegram + testes de callback/comando).
- Scope estimado (quais fluxos podem ser afetados): `/run_specs` por comando e por callback de `/specs`, mensagens de lifecycle e testes de telegram-bot.

## Initial hypotheses (optional)
- Milestones de ticket possuem resumo final, mas milestones de spec nao possuem canal proativo equivalente.
- Evolucao anterior priorizou handoff funcional para `run_all`, sem contrato de notificacao de transicao.

## Proposed solution (optional)
Adicionar evento de lifecycle para `run_specs` no runner e wiring Telegram dedicado para marcos de triagem (sucesso/falha de fechamento), mantendo fluxo sequencial e sem paralelizacao de tickets.

## Closure criteria
- Existe notificacao proativa no Telegram quando:
  - triagem conclui com sucesso e antes de iniciar rodada de tickets;
  - triagem falha em `spec-close-and-version` e bloqueia rodada.
- Mensagens incluem contexto minimo: spec alvo, resultado, fase final e acao seguinte.
- Cobertura automatizada para caminho comando (`/run_specs`) e callback (`/specs`).
- `/status` permanece coerente com fases e sem regressao de campos existentes.

## Decision log
- 2026-02-27 - Ticket aberto para cobrir lacuna de observabilidade entre fim da triagem da spec e inicio da rodada de tickets.
- 2026-02-27 - Validacao do ExecPlan concluida com classificacao `GO`; entrega tecnica concluida e validada por testes/check/build.

## Closure
- Closed at (UTC): 2026-02-27 03:46Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-27-run-specs-missing-triage-completion-notification-gap.md (commit de fechamento deste ticket)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Evidencia objetiva de aceite tecnico:
  - `npm test` -> pass (`265/265`)
  - `npm run check && npm run build` -> pass
- Entrega tecnica concluida:
  - runner com lifecycle dedicado de `run_specs` para milestone de triagem;
  - emissao de marco de sucesso/falha em `runSpecsAndRunAll` com fase final e proxima acao;
  - wiring `runner -> main -> TelegramController` para envio proativo best-effort;
  - cobertura automatizada de comando (`/run_specs`) e callback (`/specs`) para captura do chat e envio da milestone;
  - docs/specs atualizadas com CA/RF e rastreabilidade da evolucao.
- Validacao manual externa ainda necessaria:
  - Entrega tecnica concluida: sim; pendencia remanescente e somente operacional em Telegram real.
  - Objetivo: confirmar no chat real o recebimento da milestone de triagem em ambos os desfechos (sucesso e falha de `spec-close-and-version`).
  - Como executar:
    1. iniciar o bot no ambiente real com chat autorizado e enviar `/run_specs <spec-elegivel>`;
    2. validar no chat o marco proativo de sucesso da triagem antes do inicio da rodada de tickets;
    3. repetir com falha controlada em `spec-close-and-version` e validar marco proativo de bloqueio;
    4. registrar evidencias operacionais (timestamp do chat + logs do runner).
  - Responsavel operacional: operador do bot Telegram em ambiente real (mapita/time de operacao).
