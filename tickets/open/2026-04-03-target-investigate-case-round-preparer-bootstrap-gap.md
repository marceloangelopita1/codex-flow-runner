# [TICKET] /target_investigate_case ainda sobe sem materializador oficial da rodada

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-03 18:44Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-audit
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: n/a - auditoria final local da spec
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-12, RF-22, RF-23, RF-24, RF-25, RF-26, RF-36, RF-37, RF-38, RF-39, RF-40, RF-41, RF-42; CA-05, CA-07, CA-08, CA-09, CA-10, CA-11, CA-12, CA-15, CA-16. Membros explicitos preservados: artefatos `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json`, `dossier.md|dossier.json`; milestones `preflight`, `case-resolution`, `evidence-collection`, `assessment`, `publication`; bloqueio atual `round-preparer-unavailable`; comando canônico `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`.
- Inherited assumptions/defaults (when applicable): o runner continua como autoridade final de `publication_status` e `overall_outcome`; o projeto alvo continua como autoridade semântica do caso; o artefato versionado padrão de v1 continua sendo apenas o ticket quando houver publication elegível; sem ticket a fase `publication` continua existindo como decisão final/no-op local.
- Inherited RNFs (when applicable): coleta determinística guiada por manifesto; trace mínimo sem material sensível; rastreabilidade cross-project observável; fluxo sequencial.
- Inherited technical/documentary constraints (when applicable): o runner não pode depender de descoberta livre por IA de logs, buckets, comandos ou fontes de evidência; a rodada real precisa ser guiada pelo manifesto `docs/workflows/target-case-investigation-manifest.json` do projeto alvo; o trace do runner não pode copiar `workflow_debug`, `db_payload`, transcript ou payloads brutos; não criar parser, gates ou publication paralelos ao módulo `src/core/target-investigate-case.ts`.
- Inherited pending/manual validations (when applicable): após ligar o materializador oficial, validar em ambiente real se o resumo final do Telegram e o trace minimizado preservam sinal suficiente sem expor material sensível.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): ticket
- Smallest plausible explanation (audit/review only): a linhagem derivada fechou o control-plane, o pacote contratual e a capability do piloto, mas nenhum ticket reteve ownership explícito do materializador oficial que transforma manifesto + capability em artefatos reais no bootstrap do runner.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
  - docs/workflows/codex-quality-gates.md
  - execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - execplans/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - execplans/2026-04-03-target-investigate-case-pilot-capability-gap.md
  - tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - tickets/closed/2026-04-03-target-investigate-case-pilot-capability-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o comando já está publicado no runner e aparenta disponibilidade funcional, mas a execução real ainda bloqueia antes de materializar a rodada; isso impede a spec de chegar a `attended` e compromete o uso operacional da capability recém-entregue.

## Context
- Workflow area: `target-investigate-case` / bootstrap do runner / materialização de rodada real / integração com capability do projeto alvo
- Scenario: a auditoria final da spec encontrou que o runner já expõe o novo fluxo, os contratos e a capability do piloto, mas o runtime ainda não possui um materializador oficial para preparar a rodada real antes da avaliação runner-side.
- Input constraints: o follow-up deve reutilizar o módulo `src/core/target-investigate-case.ts` como source of truth para parser, avaliação, trace e resumo; não deve reabrir a capability do piloto nem duplicar control-plane/gates já fechados.

## Problem statement
O bootstrap atual do runner instancia `ControlledTargetInvestigateCaseExecutor` sem `roundPreparer`. Como o executor bloqueia explicitamente quando essa dependência não existe, `/target_investigate_case` ainda não consegue produzir `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.*` em uma rodada real, mesmo após a entrega dos tickets fechados desta linhagem.

## Observed behavior
- O que foi observado:
  - `src/main.ts` instancia `new ControlledTargetInvestigateCaseExecutor({ targetProjectResolver: ... })` sem fornecer `roundPreparer`.
  - `src/core/target-investigate-case.ts` retorna `status: "blocked"` com `reason: "round-preparer-unavailable"` logo após `preflight` quando `roundPreparer` não está configurado.
  - `rg -n "roundPreparer|TargetInvestigateCaseRoundPreparer" src` encontra apenas a interface, o uso condicional no executor e dublês de teste; não há implementação concreta ligada ao runtime.
  - as suítes `npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts` e `npm run check` passam, o que confirma o control-plane e o contrato publicados, mas não substitui a ausência do materializador real no bootstrap.
- Frequencia (unico, recorrente, intermitente): recorrente em toda execução real do fluxo neste estado do branch
- Como foi detectado (warning/log/test/assert): auditoria funcional pós-`/run_all` com releitura do bootstrap (`src/main.ts`), do executor (`src/core/target-investigate-case.ts`), busca textual por `roundPreparer` e reexecução das suítes automatizadas relevantes.

## Expected behavior
O runner deve injetar um `TargetInvestigateCaseRoundPreparer` oficial no bootstrap, capaz de consumir a capability investigativa do projeto alvo e preparar uma rodada real não bloqueada, produzindo os artefatos mínimos da spec, permitindo a avaliação runner-side já entregue e fechando o resumo/trace final sobre uma investigação de verdade.

## Reproduction steps
1. Ler `src/main.ts` e confirmar que `ControlledTargetInvestigateCaseExecutor` é instanciado sem `roundPreparer`.
2. Ler `src/core/target-investigate-case.ts` e confirmar o retorno explícito `round-preparer-unavailable` quando a dependência não existe.
3. Executar `rg -n "roundPreparer|TargetInvestigateCaseRoundPreparer" src` e confirmar a ausência de implementação concreta ligada ao runtime.
4. Executar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts` e observar que o branch está verde mesmo sem um caminho de rodada real configurado no bootstrap.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/core/target-investigate-case.ts`: `reason: "round-preparer-unavailable"`.
  - `src/main.ts`: bootstrap do executor sem `roundPreparer`.
  - `src/core/target-investigate-case.test.ts`: existe teste explícito que prova o bloqueio quando o materializador oficial ainda não foi ligado.
- Comparativo antes/depois (se houver): antes = o fluxo ainda bloqueia no bootstrap mesmo com comando/control-plane publicados; depois esperado = o mesmo fluxo executa uma rodada real, produz artefatos mínimos, usa a avaliação runner-side existente e só bloqueia por manifesto/capability/policy reais do projeto alvo.

## Impact assessment
- Impacto funcional: a spec continua sem entrega ponta a ponta porque o operador consegue iniciar `/target_investigate_case`, mas não consegue concluir uma investigação causal bem formada.
- Impacto operacional: o runner expõe um fluxo aparentemente pronto que falha de modo determinístico antes de produzir os artefatos mínimos, o que gera falsa sensação de completude e impede validação manual útil do resumo final e do trace.
- Risco de regressao: medio, porque a remediação tocará bootstrap do runner e a ponte com projetos alvo, mas deve reaproveitar o módulo contratual já fechado em vez de reimplementar lógica.
- Scope estimado (quais fluxos podem ser afetados): `src/main.ts`, `src/core/target-investigate-case.ts`, possível nova integração de materialização, testes do executor/runner/Telegram/trace store e eventual ponto de integração com projetos alvo elegíveis.

## Initial hypotheses (optional)
- A menor entrega segura é introduzir um materializador oficial de rodada que leia a capability do projeto alvo, produza os cinco artefatos mínimos em `investigations/<round-id>/` e entregue opcionalmente o `ticketPublisher`, mantendo `evaluateTargetInvestigateCaseRound(...)` como source of truth runner-side.

## Proposed solution (optional)
- Implementar e injetar um `TargetInvestigateCaseRoundPreparer` oficial no bootstrap do runner, com coverage automatizada de rodada não bloqueada e smoke/manual validation em ambiente real após a conexão com um projeto alvo elegível.

## Closure criteria
- Requisito/RF/CA coberto: RF-12, CA-05
- Evidencia observavel: o bootstrap do runner passa a injetar um `TargetInvestigateCaseRoundPreparer` oficial; uma rodada representativa em projeto alvo elegível produz `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json` sob `investigations/<round-id>/`; testes deixam explícito o caminho não bloqueado.
- Requisito/RF/CA coberto: RF-36, RF-37, RF-38, RF-42; CA-07, CA-08, CA-09, CA-10, CA-11, CA-16
- Evidencia observavel: a execução real reutiliza `evaluateTargetInvestigateCaseRound(...)`, preserva `publication` como fronteira final, emite `publication-decision.json`, restringe `versioned_artifact_paths` ao ticket quando houver publication elegível e mantém trace/resumo sem `workflow_debug`, `db_payload`, transcript ou payload bruto; testes cobrem os caminhos no-op, publication positiva e cancelamento no flow já materializado.
- Requisito/RF/CA coberto: RF-24, RF-25, RF-26, RF-39; CA-12, CA-15
- Evidencia observavel: após a ligação do materializador oficial, existe uma rodada real validada contra um projeto alvo elegível, com registro redigido do resumo final do Telegram e do trace minimizado sobre investigação não bloqueada, incluindo replay/purge quando aplicável e sem expor material sensível.
- Requisito/RF/CA coberto: fronteira de ownership do pacote derivado
- Evidencia observavel: o diff final reutiliza o módulo `src/core/target-investigate-case.ts` como source of truth de parser/avaliação/summary/trace, sem reabrir os tickets fechados da capability do piloto e sem criar uma segunda implementação paralela de publication ou de control-plane.

## Decision log
- 2026-04-03 18:44Z - Ticket aberto a partir da auditoria final da spec.
  - Motivo: o estado atual do branch ainda bloqueia o flow real em `round-preparer-unavailable`, apesar de control-plane, contrato e capability do piloto já estarem fechados.
  - Fronteira observável: este ticket cobre o materializador oficial e a primeira rodada real não bloqueada; não reabre os artefatos já entregues nos tickets fechados da mesma linhagem.
