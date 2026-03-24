# [TICKET] Falta derivacao idempotente de gaps readiness para `/target_derive_gaps`

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S1
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
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01 (superficie `/target_derive_gaps <project-name> <report-path>`), RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28; CA-07, CA-08, CA-09, CA-10, CA-11.
- Inherited assumptions/defaults (when applicable): `target_derive_gaps` nao e gerador generico de backlog; ele so materializa remediacoes readiness ja evidenciadas por checkup valido; gaps cuja remediacao mora no runner nao devem virar ticket automatico no projeto alvo; a entrega continua quebrada em multiplos tickets/execplans e nao em um pacote monolitico.
- Inherited RNFs (when applicable): manter fluxo sequencial; preservar o projeto alvo como fonte canonica dos tickets e do write-back no artefato de checkup; manter derivacao fortemente idempotente; criar apenas tickets autocontidos com evidencia suficiente para outra IA executar sem reler o relatorio inteiro.
- Inherited technical/documentary constraints (when applicable): exigir working tree limpo, projeto explicito e `report-path` explicito relativo ao repo alvo; recusar relatorio invalido, stale, driftado ou pertencente a outro projeto; agrupar por unidade real de remediacao; usar `Status: blocked` quando faltar insumo externo sem proximo passo local; registrar limitacoes do runner como `not_materialized_runner_limitation`; tickets derivados devem nascer autocontidos com `Source: readiness-checkup`, caminhos do relatorio `.md` e `.json`, `Analyzed head SHA`, `Report commit SHA` quando existir, `Gap ID`, `Gap fingerprint`, `Gap type`, `Checkup dimension`, matriz objetiva de prioridade, evidencias, assumptions/defaults, validation notes, superficie local de remediacao e closure criteria observaveis; o proprio artefato de checkup precisa receber write-back da derivacao no mesmo changeset dos tickets com `derivation_status`, `derived_at_utc`, resultado por gap (`materialized_as_ticket`, `reused_existing_ticket`, `blocked_ticket_created`, `not_materialized_informational`, `not_materialized_insufficient_specificity`, `not_materialized_runner_limitation`) e caminhos dos tickets afetados.
- Inherited pending/manual validations (when applicable): validar `target_derive_gaps` em rerun idempotente e em recorrencia de gap anteriormente fechado; confirmar permissao real de `git push` nos repositorios alvo de teste usados por este fluxo.
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
- Justificativa objetiva (evidencias e impacto): prioridade manual P1 porque a spec exige backlog readiness materializado, idempotente e auditavel; sem isso o checkup nao se converte em trabalho executavel no projeto alvo.

## Context
- Workflow area: derivacao de gaps readiness a partir de relatorio canonico de checkup.
- Scenario: operador precisa transformar um checkup valido em tickets locais acionaveis, com deduplicacao forte, reuso de ticket aberto equivalente, recorrencia de ticket fechado e write-back rastreavel no relatorio.
- Input constraints: nao abrir backlog generico; nao criar ticket quando a remediacao estiver no runner; nao depender de "ultimo relatorio" implicito.

## Problem statement
O runner nao possui `target_derive_gaps`, nao valida elegibilidade de relatorio de checkup para derivacao e nao materializa tickets readiness com `Gap fingerprint`, `Gap type`, `Checkup dimension`, matriz objetiva de prioridade e write-back no proprio artefato de checkup. A unica publicacao automatica existente e voltada a tickets sistemicos do proprio workflow, nao ao backlog readiness do projeto alvo.

## Observed behavior
- O que foi observado: a busca por `target_derive_gaps` em `src/` nao retorna implementacao; `src/integrations/workflow-improvement-ticket-publisher.ts` fixa `TARGET_REPO_NAME = "codex-flow-runner"` e publica apenas tickets sistemicos do workflow; `src/integrations/ticket-queue.ts` ja entende `Priority` e `Status: blocked`, mas nao existe materializador de tickets readiness nem dedupe por `Gap fingerprint`; o template oficial de ticket ainda nao e preenchido automaticamente por nenhum fluxo de readiness.
- Frequencia (unico, recorrente, intermitente): recorrente; a capacidade simplesmente nao existe.
- Como foi detectado (warning/log/test/assert): busca textual em `src/` e leitura direta de `src/integrations/workflow-improvement-ticket-publisher.ts` e `src/integrations/ticket-queue.ts`.

## Expected behavior
`/target_derive_gaps <project-name> <report-path>` deve validar working tree limpo, alvo explicito e relatorio explicitamente elegivel para derivacao, recusar relatorios invalidos/stale/driftados/de outro projeto, materializar apenas gaps readiness acionaveis e especificos, reutilizar ticket aberto equivalente por fingerprint, reabrir recorrencia quando o equivalente ja estiver fechado, registrar `blocked` quando faltar insumo externo, deixar limitacoes do runner no write-back do relatorio sem abrir ticket no alvo e versionar tickets + update do relatorio no mesmo changeset.

## Reproduction steps
1. Buscar `target_derive_gaps` em `src/` e confirmar a ausencia de implementacao.
2. Ler `src/integrations/workflow-improvement-ticket-publisher.ts` e confirmar que o publicador automatico atual e especifico para tickets sistemicos do `codex-flow-runner`.
3. Ler `src/integrations/ticket-queue.ts` e confirmar que existe infraestrutura de prioridade e `Status: blocked`, mas sem derivacao readiness.
4. Ler `tickets/templates/internal-ticket-template.md` e confirmar que nao existe fluxo preenchendo automaticamente metadados de readiness checkup.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/integrations/workflow-improvement-ticket-publisher.ts`: o alvo automatico atual e o backlog sistemico do workflow, nao o projeto readiness auditado.
  - `src/integrations/ticket-queue.ts`: a fila ja ordena `P0 -> P1 -> P2` e ignora `blocked`, mas isso ainda nao e alimentado por `target_derive_gaps`.
  - `tickets/templates/internal-ticket-template.md`: existe barra minima de contexto e fechamento observavel reutilizavel, mas sem materializacao readiness.
- Comparativo antes/depois (se houver): antes = checkup nao se converte em backlog readiness local; depois esperado = derivacao idempotente, tickets autocontidos e write-back no artefato de checkup.

## Impact assessment
- Impacto funcional: o terceiro comando da spec nao existe.
- Impacto operacional: o operador teria que abrir tickets manualmente, sem dedupe forte nem write-back canonico, reintroduzindo retrabalho e risco de backlog duplicado.
- Risco de regressao: alto, porque o fluxo combina validacao de artefato, deduplicacao, renderizacao de ticket, write-back do relatorio e versionamento atomico.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/integrations/ticket-queue.ts`, integracoes novas para parser/schema de checkup report e publicacao de tickets readiness, `tickets/templates/internal-ticket-template.md` quando precisar de extensao editorial, alem de testes e docs operacionais.

## Initial hypotheses (optional)
- A menor entrega segura combina um parser/schema forte de checkup report, um materializador de tickets readiness com fingerprints estaveis, e um write-back atomico no relatorio antes do commit/push.

## Proposed solution (optional)
Nao obrigatorio. Direcao concreta: introduzir executor de `target_derive_gaps` que valida o report contra snapshot/idade/projeto, agrupa gaps por unidade de remediacao, reaproveita ticket aberto equivalente, reabre recorrencia fechada, registra limitacoes do runner como nao materializadas e versiona tickets + atualizacao do report em um unico commit.

## Closure criteria
- Requisito/RF/CA coberto: RF-01 (comando `/target_derive_gaps`), RF-19, RF-20; CA-07.
- Evidencia observavel: o fluxo exige projeto explicito e `report-path` explicito relativo ao repo alvo, working tree limpo e relatorio valido para derivacao; relatorios invalidos, stale, driftados ou pertencentes a outro projeto sao recusados sem criar/alterar tickets; testes cobrem cada causa de bloqueio.
- Requisito/RF/CA coberto: RF-21, RF-22, RF-23, RF-24, RF-25; CA-08, CA-09, CA-11.
- Evidencia observavel: a derivacao agrupa sintomas coerentes por superficie corretiva, cria ticket apenas quando ha acao local executavel com evidencia e fechamento observavel, usa `Status: blocked` quando falta insumo externo, registra limitacoes do runner como `not_materialized_runner_limitation`, faz `no-op` sobre o mesmo relatorio valido e reaproveita/reabre recorrencias por `Gap fingerprint`; testes cobrem rerun idempotente, reuso de ticket aberto equivalente, reabertura de recorrencia fechada e runner limitation nao materializada.
- Requisito/RF/CA coberto: RF-26, RF-27, RF-28; CA-10.
- Evidencia observavel: tickets derivados nascem no proprio projeto alvo com `Source: readiness-checkup`, caminhos do relatorio `.md/.json`, `Analyzed head SHA`, `Report commit SHA` quando existir, `Gap ID`, `Gap fingerprint`, `Gap type`, `Checkup dimension`, matriz de prioridade completa, evidencias, superficie local de remediacao, assumptions/defaults, validation notes e closure criteria; o relatorio de checkup recebe write-back de derivacao com `derivation_status`, `derived_at_utc`, status por gap cobrindo `materialized_as_ticket`, `reused_existing_ticket`, `blocked_ticket_created`, `not_materialized_informational`, `not_materialized_insufficient_specificity` e `not_materialized_runner_limitation`, alem dos caminhos dos tickets afetados, tudo no mesmo changeset; a validacao manual herdada cobre rerun idempotente, recorrencia e permissao real de `git push`.

## Closure validation evidence
- RF-01 / RF-19 / RF-20 / CA-07: `src/core/target-derive.ts` resolve projeto explicito e `report-path` canonico, valida working tree, projeto do report, idade, drift e elegibilidade antes de qualquer mutacao; `src/core/target-derive.test.ts` cobre `working-tree-dirty`, `report-path-invalid`, `report-invalid`, `report-project-mismatch`, `report-ineligible` (`report-expired`) e `report-drifted`, sempre sem tickets novos e sem versionamento.
- RF-21 / RF-22 / RF-23 / RF-24 / RF-25 / CA-08 / CA-09 / CA-11: `src/core/target-derive.ts` calcula `Gap ID`/`Gap fingerprint`/prioridade em codigo, preserva `no-op-existing-mapping`, reutiliza ticket aberto, cria recorrencia a partir de `tickets/closed/`, materializa `Status: blocked` e deixa limitacoes do runner apenas no write-back; `src/core/target-derive.test.ts` cobre `no-op`, reuso de ticket aberto, recorrencia, `blocked_ticket_created`, `not_materialized_runner_limitation`, `not_materialized_informational` e `not_materialized_insufficient_specificity`.
- RF-26 / RF-27 / RF-28 / CA-10: `renderReadinessTicket` em `src/core/target-derive.ts`, `TargetCheckupGapDerivationSnapshot` em `src/types/target-checkup.ts` e `renderTargetCheckupMarkdownReport` em `src/core/target-checkup.ts` carregam os campos obrigatorios do ticket e do write-back; `src/core/target-derive.test.ts` afirma `Source: readiness-checkup`, caminhos `.json/.md`, `Gap fingerprint`, `Parent ticket`, secao `Gap derivation` no Markdown e o mesmo changeset para report + tickets.
- Validacao automatizada executada: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-derive.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/target-derive-gap-analysis-parser.test.ts` passou com a suite verde em 2026-03-24; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` passou com `tsc --noEmit`.

## Decision log
- 2026-03-24 - Ticket aberto na triagem da spec para isolar a materializacao de backlog readiness; sem derivacao automatica o checkup permaneceria apenas como auditoria sem conversao controlada em trabalho executavel.
- 2026-03-24 23:17Z - Revalidacao final contra diff, ExecPlan, spec e quality gates concluiu `GO`; a cobertura automatizada foi expandida para os bloqueios de report e para a taxonomia restante de materializacao antes do fechamento tecnico.

## Closure
- Closed at (UTC): 2026-03-24 23:17Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Validacao manual pendente registrada: sim
- Entrega tecnica concluida: sim; a implementacao funcional e a cobertura automatizada do ticket estao concluidas.
- Validacao manual ainda necessaria: smoke real via Telegram em repo alvo preparado para confirmar rerun idempotente sem novo commit, recorrencia apos fechamento do ticket equivalente e permissao real de `git push`.
- Como executar a validacao manual: iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`, executar `/target_checkup <project-name>` e depois `/target_derive_gaps <project-name> <report-path>` em repo alvo com remoto funcional, e inspecionar `git status --porcelain`, `git log -1 --stat`, `tickets/open/`, `tickets/closed/` e `docs/checkups/history/<timestamp>-project-readiness-checkup.{json,md}`.
- Responsavel operacional pela validacao manual: operador do runner com acesso ao Telegram e permissao real de push no repo alvo de smoke.
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
