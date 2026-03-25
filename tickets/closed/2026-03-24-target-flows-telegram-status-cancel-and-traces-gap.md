# [TICKET] Fluxos target ainda nao compartilham controle operacional, status/cancel e traces canonicos

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P2
- Severity: S2
- Created at (UTC): 2026-03-24 20:34Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01 (pares `/_status` e `/_cancel` dos tres fluxos), RF-29, RF-30, RF-31, RF-32, RF-33; CA-12, CA-13, CA-14.
- Inherited assumptions/defaults (when applicable): o desenho permanece em tres comandos top-level porque `prepare`, `checkup` e `derive` possuem precondicoes, efeitos e artefatos distintos; os tres fluxos nao devem trocar implicitamente o projeto ativo; o cancelamento e cooperativo e best-effort, respeitando a fronteira de versionamento.
- Inherited RNFs (when applicable): manter fluxo sequencial; UX consistente no Telegram; status e milestones observaveis; rastreabilidade local em `.codex-flow-runner/flow-traces/`; mensagens finais devem expor proxima acao contextual e CTAs seguros.
- Inherited technical/documentary constraints (when applicable): os tres fluxos precisam ocupar o mesmo slot operacional dos fluxos pesados existentes; durante execucao ativa, `/status` e `/projects` permanecem permitidos e `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados; cada fluxo deve publicar milestones canonicos e refletir no `/status` a etapa atual e se ainda esta antes ou depois da fronteira de versionamento; traces locais precisam registrar comando, projeto alvo, milestone, inputs, requests/responses/decisions de IA quando houverem, resultados deterministas, sucesso/falha/cancelamento e caminhos dos artefatos versionados.
- Inherited pending/manual validations (when applicable): exercitar os CTAs e callbacks reais do Telegram nos tres fluxos.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - SPECS.md
  - INTERNAL_TICKETS.md
  - docs/workflows/codex-quality-gates.md
  - tickets/templates/internal-ticket-template.md
  - docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P2 porque os fluxos core ainda precisam nascer primeiro, mas a spec exige controle operacional observavel e seguro; sem esta camada a UX fica inconsistente e o aceite ponta a ponta permanece incompleto.

## Context
- Workflow area: control plane do runner e UX Telegram para fluxos target.
- Scenario: apos existir `target_prepare`, `target_checkup` e `target_derive_gaps`, o operador precisa acompanha-los por `/status`, cancelar de forma segura, receber milestones curtos e summaries finais com CTA, sem conflito com outros fluxos pesados.
- Input constraints: manter consistencia com o restante do bot, sem permitir concorrencia indevida nem troca implicita de projeto ativo.

## Problem statement
Mesmo desconsiderando a ausencia dos tres fluxos core, o runner atual nao tem infraestrutura de status/cancel, slot kind, fases, resumo final e traces canonicos para comandos target. O controle operacional existente cobre `run-all`, `run-specs`, `run-ticket` e sessoes de texto livre, mas nao modela `prepare`, `checkup` ou `derive`, nem sua fronteira de versionamento e CTAs contextuais.

## Observed behavior
- O que foi observado: `src/types/state.ts` nao possui `RunnerPhase` nem `RunnerSlotKind` para fluxos target; `src/core/runner.ts` reserva slots apenas para `run-all`, `run-specs`, `run-ticket`, `discover-spec`, `plan-spec` e `codex-chat`; `src/types/flow-timing.ts` resume apenas `run-all` e `run-specs`; `src/integrations/workflow-trace-store.ts` aceita `sourceCommand` somente para `run-all`, `run-specs` e `run-ticket`; `src/integrations/telegram-bot.ts` nao registra comandos target, `/_status`, `/_cancel`, milestones ou CTAs dos novos fluxos.
- Frequencia (unico, recorrente, intermitente): recorrente; a infraestrutura simplesmente nao cobre esses comandos.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/types/state.ts`, `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts`.

## Expected behavior
Os tres fluxos target devem compartilhar slot operacional e bloqueios coerentes com os fluxos pesados existentes, manter `/status` e `/projects` disponiveis durante execucao, expor `/_status` e `/_cancel`, refletir etapa atual e fronteira de versionamento, publicar milestones canonicos, enviar resumo final com proxima acao contextual e persistir traces locais completos em `.codex-flow-runner/flow-traces/`.

## Reproduction steps
1. Ler `src/types/state.ts` e confirmar a ausencia de fases e slot kinds para fluxos target.
2. Ler `src/core/runner.ts` e confirmar que `reserveSlot` e os resultados bloqueados nao modelam `prepare`, `checkup` ou `derive`.
3. Ler `src/types/flow-timing.ts` e confirmar que o `RunnerFlowSummary` nao contempla esses fluxos.
4. Ler `src/integrations/workflow-trace-store.ts` e confirmar que o trace canonico nao cobre os novos comandos.
5. Ler `src/integrations/telegram-bot.ts` e confirmar a ausencia de comandos target, `/_status`, `/_cancel`, milestones e CTAs relacionados.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/types/state.ts`: inexistencia de estados target.
  - `src/core/runner.ts`: bloqueios e reserva de slot atuais nao conhecem fluxos target.
  - `src/types/flow-timing.ts`: summaries finais nao cobrem `prepare`, `checkup` ou `derive`.
  - `src/integrations/workflow-trace-store.ts`: trace source limitado a fluxos existentes.
  - `src/integrations/telegram-bot.ts`: help, handlers e mensagens nao cobrem status/cancel/milestones dos fluxos target.
- Comparativo antes/depois (se houver): antes = mesmo com a logica core implementada, a operacao target continuaria sem status/cancel/trace e sem UX consistente; depois esperado = controle operacional equivalente ao restante do runner, com bloqueios, milestones, CTAs e rastreabilidade canonica.

## Impact assessment
- Impacto funcional: aceite operacional da spec permanece incompleto.
- Impacto operacional: o operador nao consegue acompanhar ou cancelar os fluxos target com a mesma seguranca dos fluxos atuais, e o bot nao protege adequadamente outros comandos durante execucao.
- Risco de regressao: medio, porque o ajuste atravessa contratos de estado, Telegram, traces e summaries sem alterar a logica de negocio central dos fluxos.
- Scope estimado (quais fluxos podem ser afetados): `src/types/state.ts`, `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts`, testes de runner/telegram/traces e documentacao operacional.

## Initial hypotheses (optional)
- O ajuste seguro passa por ampliar os contratos centrais de estado/summary/trace primeiro e depois encaixar a camada Telegram com bloqueios, `/_status`, `/_cancel`, milestones e CTAs baseados nesses contratos.

## Proposed solution (optional)
Nao obrigatorio. Direcao concreta: adicionar tipos e estados de fluxo target, estender reserva de slot e status operacional, expor comandos de status/cancel dedicados, registrar milestones e fronteira de versionamento, e ampliar o trace store para refletir sucesso/falha/cancelamento e artefatos versionados dos tres fluxos.

## Closure criteria
- Requisito/RF/CA coberto: RF-29, RF-30; CA-12, CA-13.
- Evidencia observavel: durante qualquer fluxo target ativo, `/status` e `/projects` continuam disponiveis enquanto `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados com mensagem explicita; cada fluxo expoe `/_status` e `/_cancel`, e o cancelamento distingue caminho antes/depois da fronteira de versionamento; testes cobrem a matriz de bloqueios, status detalhado e cancelamento tardio.
- Requisito/RF/CA coberto: RF-31, RF-32; CA-12, CA-13.
- Evidencia observavel: `prepare`, `checkup` e `derive` publicam milestones canonicos no Telegram e em `/status`, e os resumos finais carregam proxima acao contextual e CTAs seguros; testes cobrem renderizacao editorial minima e proximas acoes para sucesso, bloqueio e falha.
- Requisito/RF/CA coberto: RF-33; CA-14.
- Evidencia observavel: traces locais em `.codex-flow-runner/flow-traces/` registram comando, projeto alvo, milestone, inputs, requests/responses/decisions de IA quando existirem, resultados deterministas, cancelamento/sucesso/falha e caminhos dos artefatos versionados; testes cobrem o contrato de serializacao; a validacao manual herdada exercita CTAs e callbacks reais do Telegram nos tres fluxos.

## Decision log
- 2026-03-24 - Ticket aberto na triagem da spec para isolar a camada compartilhada de controle operacional e UX; isso reduz risco de espalhar status/cancel/traces de forma inconsistente pelos tres fluxos target.
- 2026-03-25 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO` com validacao manual externa pendente.

## Closure
- Closed at (UTC): 2026-03-25 00:26Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Checklist aplicado: releitura do diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion.
- Evidencia objetiva por closure criterion:
  - `RF-29`, `RF-30`, `CA-12`, `CA-13`: `src/core/runner.ts` promove os tres fluxos target a slot operacional compartilhado, bloqueia `run-all`, `run-specs`, sessoes globais e troca de projeto enquanto um target flow estiver ativo, expoe `cancelTargetPrepare|Checkup|Derive` e diferencia cancelamento aceito de cancelamento tardio via `versionBoundaryState`; `src/integrations/telegram-bot.ts` registra `/target_prepare_status`, `/target_prepare_cancel`, `/target_checkup_status`, `/target_checkup_cancel`, `/target_derive_gaps_status` e `/target_derive_gaps_cancel`, e o `/status` passou a refletir milestone, fronteira e fluxo ativo; a cobertura automatizada valida a matriz de bloqueios, o status detalhado e o cancelamento tardio/antecipado em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`.
  - `RF-31`, `RF-32`, `CA-12`, `CA-13`: `src/core/target-prepare.ts`, `src/core/target-checkup.ts` e `src/core/target-derive.ts` publicam milestones canonicos e checkpoints de cancelamento antes da fronteira de versionamento; `src/main.ts` e `src/integrations/telegram-bot.ts` enviam milestones curtos e resumos finais editoriais com `nextAction`, artefatos e CTA seguro; os testes `execute publica milestones canonicos e respeita cancelamento cooperativo antes do versionamento` nos tres executores target, mais a suite `src/integrations/telegram-bot.test.ts`, provam o lifecycle observavel e os resumos finais contextuais.
  - `RF-33`, `CA-14`: `src/integrations/workflow-trace-store.ts` adiciona `recordTargetFlowTrace(...)` em `.codex-flow-runner/flow-traces/target-flows/` com inputs, milestones, exchanges de IA, artefatos, outcome e deduplicacao segura de `traceId`; `src/core/runner.ts` persiste esse contrato ao concluir cada target flow; `src/integrations/workflow-trace-store.test.ts` cobre serializacao do schema e protecao contra sobrescrita, enquanto `src/core/runner.test.ts` valida a emissao/finalizacao do fluxo com trace associado.
  - Validacao manual pendente relevante: a entrega tecnica foi concluida e a falta remanescente e apenas o smoke externo em Telegram real, necessario para exercitar CTAs/callbacks reais dos tres fluxos. Classificacao do remanescente: `external/manual`. Escopo: local ao ambiente operacional de validacao.
- Entrega tecnica concluida:
  - contratos centrais de estado, slot e summary agora cobrem `target_prepare`, `target_checkup` e `target_derive_gaps`;
  - Telegram passou a expor comandos dedicados de status/cancel, milestones e resumo final dos tres fluxos;
  - traces locais canonicos dos fluxos target foram materializados e cobertos por teste;
  - README e spec de origem foram atualizados para refletir o comportamento implementado.
- Validacoes executadas:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts src/integrations/workflow-trace-store.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - `git diff --check`
- Validacao manual externa pendente: sim.
- Validacao manual ainda necessaria:
  - executar `/target_prepare`, `/target_checkup` e `/target_derive_gaps` em chat Telegram autorizado, exercitando tambem os respectivos `*_status` e `*_cancel`;
  - confirmar no chat que milestones, fronteira de versionamento e CTA final aparecem como observado nos testes;
  - confirmar no repositorio alvo que cancelamento precoce nao cruza a fronteira de versionamento e que traces sao persistidos em `.codex-flow-runner/flow-traces/target-flows/`.
- Como executar a validacao manual:
  - iniciar o runner em ambiente com Telegram real habilitado;
  - disparar cada fluxo target a partir de chat autorizado e consultar `*_status` durante a execucao;
  - solicitar `*_cancel` antes da fronteira de versionamento em pelo menos uma rodada e repetir apos a fronteira em outra, verificando a resposta explicita;
  - inspecionar os traces locais gerados e o estado do repositorio alvo apos cada smoke.
- Responsavel operacional pela validacao manual: operador do runner com acesso ao chat Telegram autorizado e aos repositorios alvo usados no smoke.
