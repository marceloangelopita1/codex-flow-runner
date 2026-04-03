# [TICKET] Introduzir a superficie operacional do /target_investigate_case no runner

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-03 16:11Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: n/a - triagem local da spec
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-02, RF-10, RF-11, RF-12, RF-36, RF-42; CA-01, CA-05, CA-16. Membros explicitos preservados: comandos `/target_investigate_case`, `/target_investigate_case_status`, `/target_investigate_case_cancel`; milestones `preflight`, `case-resolution`, `evidence-collection`, `assessment`, `publication`; artefatos `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json`, `dossier.md|dossier.json`.
- Inherited assumptions/defaults (when applicable): o comando canonico do novo fluxo deve ser `/target_investigate_case`, separado semanticamente de `/target_checkup`; a fase `publication` existe sempre como fronteira final, inclusive em no-op; o dossier fica local ao projeto alvo e o trace do runner permanece minimo; o artefato versionado de v1 segue restrito ao ticket quando houver publication elegivel.
- Inherited RNFs (when applicable): manter fluxo sequencial; expor milestones visiveis curtos e estaveis; refletir cada etapa importante em logs, `/status` e resumo final; nao incluir segredos ou dados sensiveis.
- Inherited technical/documentary constraints (when applicable): reaproveitar apenas o modelo operacional de slots, milestones, traces e cancelamento cooperativo dos target flows atuais; nao ampliar semanticamente `/target_checkup`; `execplan` so pode surgir depois, a partir do ticket.
- Inherited pending/manual validations (when applicable): validar em ambiente real se o resumo final do Telegram mantem sinal suficiente sem expor material sensivel.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
  - docs/workflows/codex-quality-gates.md
  - tickets/templates/internal-ticket-template.md
  - tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): sem a superficie operacional dedicada, o fluxo especificado nao pode ser invocado, acompanhado, cancelado nem rastreado; isso bloqueia toda a linhagem da spec logo na entrada do sistema.

## Context
- Workflow area: target flows / runner / Telegram / traces locais
- Scenario: a spec aprovada exige um novo target flow separado para investigacao causal de caso produtivo suspeito.
- Input constraints: este ticket cobre control-plane, slot por projeto, milestones, status/cancel, summaries e ciclo local de artefatos; manifesto, gates semanticos, publication e capability do piloto ficam nos tickets irmaos.

## Problem statement
O runner ja possui a infraestrutura operacional para `target_prepare`, `target_checkup` e `target_derive_gaps`, mas nao possui um quarto fluxo dedicado para `/target_investigate_case`. Sem essa superficie, a spec permanece sem porta de entrada, sem milestones canonicos, sem controles `/_status` e `/_cancel`, sem traces/summaries proprios e sem ciclo local estavel para os artefatos minimos da investigacao.

## Observed behavior
- O que foi observado:
  - `src/types/target-flow.ts` aceita apenas `target-prepare`, `target-checkup` e `target-derive`, com comandos `/target_prepare`, `/target_checkup` e `/target_derive_gaps`.
  - `src/core/runner.ts` expoe `requestTargetPrepare`, `requestTargetCheckup`, `requestTargetDerive` e os respectivos `cancelTarget*`, sem variante de investigacao causal.
  - `src/main.ts` injeta no `TelegramController` apenas os tres executores/controles target atuais.
  - `src/integrations/telegram-bot.ts` lista e registra apenas `/target_prepare`, `/target_checkup`, `/target_derive_gaps` e seus pares `/_status` e `/_cancel`.
  - `src/types/state.ts` e `src/types/flow-timing.ts` modelam fases, summaries e slot kinds apenas para os tres target flows existentes.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura estatica de `src/types/target-flow.ts`, `src/core/runner.ts`, `src/main.ts`, `src/integrations/telegram-bot.ts`, `src/types/state.ts` e `src/types/flow-timing.ts`.

## Expected behavior
O runner deve expor `/target_investigate_case` como target flow dedicado, com slot pesado por projeto, 5 milestones visiveis e estaveis, comandos `/_status` e `/_cancel`, trace local proprio, resumo final coerente e ciclo local para os artefatos minimos da rodada.

## Reproduction steps
1. Ler `src/types/target-flow.ts` e confirmar que `TargetFlowKind`/`TargetFlowCommand` nao incluem `target-investigate-case`.
2. Ler `src/core/runner.ts`, `src/main.ts` e `src/integrations/telegram-bot.ts` e confirmar que nao existe request, status, cancelamento nem roteamento de `/target_investigate_case`.
3. Ler `src/types/state.ts` e `src/types/flow-timing.ts` e confirmar a ausencia de fases, milestones e summary dedicados para investigacao causal.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/types/target-flow.ts`: a uniao de target flows termina em `target-derive`.
  - `src/integrations/telegram-bot.ts`: o help inicial e o registro de comandos nao mencionam `/target_investigate_case`.
  - `src/types/flow-timing.ts`: `RunnerFlowSummary` aceita apenas `TargetPrepareFlowSummary`, `TargetCheckupFlowSummary` e `TargetDeriveFlowSummary`.
- Comparativo antes/depois (se houver): antes = nenhum control-plane para investigacao causal; depois esperado = comando dedicado com lifecycle completo no mesmo padrao operacional dos target flows existentes.

## Impact assessment
- Impacto funcional: o usuario nao consegue iniciar nem acompanhar o fluxo especificado.
- Impacto operacional: nao ha slot por projeto, trace local, cancelamento cooperativo nem summary final para a nova capacidade.
- Risco de regressao: medio, porque a mudanca toca tipos compartilhados, runner, Telegram, traces e testes de lifecycle.
- Scope estimado (quais fluxos podem ser afetados): `src/types/target-flow.ts`, `src/types/state.ts`, `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/main.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts` e suites de teste correlatas.

## Initial hypotheses (optional)
- A menor entrega segura e introduzir um executor dedicado de investigacao causal reaproveitando o arcabouco de slots, traces e cancelamento dos target flows atuais, sem reutilizar semanticamente o contrato de `target_checkup`.

## Proposed solution (optional)
- Adicionar o novo flow kind/comandos, wiring no runner e no Telegram, milestones estaveis, summary/timing proprios e um namespace local dedicado para os artefatos da rodada.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-02, CA-01
- Evidencia observavel: `src/types/target-flow.ts`, `src/core/runner.ts`, `src/main.ts` e `src/integrations/telegram-bot.ts` passam a expor `/target_investigate_case`, `/target_investigate_case_status` e `/target_investigate_case_cancel`, com testes cobrindo inicio, status e cancelamento por projeto ativo/ambiguo.
- Requisito/RF/CA coberto: RF-10, RF-11, RF-42, CA-16
- Evidencia observavel: o novo fluxo usa exatamente os milestones externos `preflight`, `case-resolution`, `evidence-collection`, `assessment` e `publication` em `state`, timing, traces e mensagens de status/cancelamento, sem fallback silencioso para labels de `target_checkup`; a concorrencia pesada permanece exclusiva por projeto no mesmo modelo dos target flows atuais, com teste observavel de exclusao do slot quando ja existir investigacao causal ativa para o mesmo projeto e ausencia de bloqueio indevido entre projetos distintos; `/_status` e `/_cancel` preservam a mesma resolucao de ambiguidade por projeto ativo/ambiguo ja esperada pelo contrato atual.
- Requisito/RF/CA coberto: RF-12, RF-36, CA-05
- Evidencia observavel: uma execucao bem formada registra caminhos locais estaveis para `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json`, e o summary/traces mostram a fase `publication` mesmo quando nao houver write-back versionado; testes de lifecycle tornam observavel o cancelamento cooperativo ate antes da fronteira de versionamento, sem commit/push efetuado, e o cancelamento tardio apos cruzar essa fronteira, com o fluxo concluindo a sequencia segura de publication/versionamento antes de refletir o estado final de cancelamento tardio.
- Requisito/RF/CA coberto: RF-39, CA-15, validacao manual herdada do resumo final do Telegram
- Evidencia observavel: o aceite do ticket registra explicitamente uma validacao manual redigida em ambiente real, baseada em ao menos uma execucao representativa de `/target_investigate_case`, confirmando que o resumo final do Telegram preserva sinal suficiente com os campos minimos obrigatorios sem expor material sensivel; esse registro identifica a execucao avaliada, resume de forma redigida o conteudo observado, informa o resultado da validacao e deixa explicito qualquer ajuste aplicado no resumo antes do fechamento.
- Requisito/RF/CA coberto: fronteira de ownership do pacote derivado
- Evidencia observavel: o diff e os testes deixam explicito que parser/normalizacao fina, manifest/gates/publication e capability do piloto permanecem nos tickets irmaos, sem duplicar closure criteria entre eles.

## Decision log
- 2026-04-03 - Ticket aberto na triagem inicial da spec. Fronteira observavel: este ticket cobre control-plane e lifecycle do runner; `2026-04-03-target-investigate-case-contract-and-publication-gap.md` cobre manifesto/gates/publication; `2026-04-03-target-investigate-case-pilot-capability-gap.md` cobre capability e template no piloto.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
