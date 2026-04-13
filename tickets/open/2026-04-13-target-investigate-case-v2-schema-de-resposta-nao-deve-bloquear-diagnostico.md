# [TICKET] /target_investigate_case_v2 bloqueia diagnóstico útil por schema de resposta target-owned

## Metadata
- Status: open
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-13 15:49Z
- Reporter: mapita
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): post-run diagnosis
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): guiadomus-matricula
- Request ID: output/case-investigation/2026-04-12T16-15-14Z
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable): RF-04, RF-05, RF-17a, RF-25, RF-29, CA-03, CA-07, CA-09
- Inherited assumptions/defaults (when applicable): o caminho mínimo da v2 não exige estágios opcionais; `diagnosis.md` e `diagnosis.json` são artefatos principais por default; o namespace autoritativo da rodada fica no projeto alvo.
- Inherited RNFs (when applicable): reduzir custo cognitivo e deixar a resposta principal entendível por um humano em menos de 2 minutos.
- Inherited technical/documentary constraints (when applicable): o runner deve permanecer target-agnostic; divergências de schema em artefatos target-owned devem virar warnings de automação no caminho mínimo, não falha operacional.
- Inherited pending/manual validations (when applicable): validar em caso real de target aderente que diagnóstico útil não é bloqueado por envelope divergente.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): a implementação atual interpreta schemas runner-side como gate obrigatório da rodada, apesar de a spec agora explicitar que o target é autoridade semântica e que envelopes machine-readable são recomendação de automação no caminho mínimo.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - docs/workflows/target-investigate-case-v2-target-onboarding.md
  - docs/workflows/target-investigate-case-v2-target-onboarding-prompt.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto):

## Context
- Workflow area: `/target_investigate_case_v2` / materialização e avaliação do caminho mínimo diagnosis-first
- Scenario: rodada real contra `../guiadomus-matricula` produziu diagnóstico humano útil, mas o runner encerrou com `round-materialization-failed` porque `evidence-index.json` não tinha campos exigidos pelo schema runner-side.
- Input constraints: preservar orquestração sequencial e publication runner-side; não acoplar o runner à semântica do target; não transformar ausência de campos em falha quando houver diagnóstico ou blocker explícito.

## Problem statement
O runner bloqueia o caminho mínimo diagnosis-first quando artefatos target-owned têm envelope diferente do schema esperado localmente. Isso faz uma investigação semanticamente bem-sucedida aparecer como falha operacional, deslocando a autoridade do diagnóstico do target para validações estruturais do runner.

## Observed behavior
- O que foi observado: a rodada `output/case-investigation/2026-04-12T16-15-14Z` produziu `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`.
- Frequência (único, recorrente, intermitente): único observado em rodada real, com risco recorrente para qualquer target que escolha envelope próprio.
- Como foi detectado (warning/log/test/assert): resumo final do Telegram registrou `round-materialization-failed`, `artifact-validation-failed` e erro em `evidence-index.json` por ausência de `bundle_artifact` e `entries`.

## Expected behavior
O runner deve orquestrar os estágios, inspecionar os artefatos target-owned e registrar warnings de envelope quando o shape divergir do recomendado. Se houver `diagnosis.md`, `diagnosis.json`, saída textual de Codex ou blocker explícito suficiente para o operador entender o caso, a rodada deve terminar como diagnóstico produzido com warnings, não como falha de materialização.

## Reproduction steps
1. Executar `/target_investigate_case_v2 guiadomus-matricula 8555540138269 --workflow extract_value_timeline_v1`.
2. Permitir que o target materialize artefatos com shape próprio em `output/case-investigation/<round-id>/`.
3. Observar que o runner falha na validação estrita de `evidence-index.json`, mesmo com diagnóstico humano útil já produzido.

## Evidence
- Logs relevantes (trechos curtos e redigidos): Telegram reportou `round-materialization-failed`; `evidence-index.json contém schema inválido: bundle_artifact: Required | entries: Required`.
- Warnings/codes relevantes: `artifact-validation-failed`.
- Comparativo antes/depois (se houver): após a correção, a mesma classe de divergência deve aparecer em warnings de automação e não impedir o encerramento diagnosis-first.

## Impact assessment
- Impacto funcional: diagnóstico útil pode ser descartado como falha.
- Impacto operacional: operador recebe instrução para revisar artefatos e rerodar, mesmo quando a próxima ação correta é ler o diagnóstico.
- Risco de regressão: médio; a mudança deve preservar hard gates de preflight, segurança, cancelamento, falha de execução, versionamento e publication.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/target-investigate-case-round-preparer.ts`, `src/core/target-investigate-case.ts`, tipos de artefatos v2 e testes focados.

## Initial hypotheses (optional)
- `validateCanonicalArtifacts(...)` deve ser substituído ou complementado por uma inspeção tolerante de artefatos.
- Schemas de resposta podem continuar existindo para normalização e automações, mas não como gate do caminho mínimo.

## Proposed solution (optional)
- Introduzir um relatório de inspeção de artefatos target-owned com `exists`, `parseableJson`, `recognizedFields`, `warnings` e `automationUsability`.
- Rebaixar falhas de parse/schema dos artefatos target-owned para warnings quando houver diagnóstico útil ou blocker explícito.
- Manter falha operacional apenas para problemas que impedem orquestração ou cruzam fronteiras de segurança/publication/versionamento.

## Closure criteria
- Requisito/RF/CA coberto: RF-17a, RF-29, CA-09.
- Evidência observável: teste focado prova que `evidence-index.json`, `case-bundle.json` e `diagnosis.json` com envelope divergente não causam `round-materialization-failed` quando `diagnosis.md` responde o caso.
- Evidência observável: teste negativo prova que ausência total de diagnóstico ou blocker explícito ainda falha de forma operacional clara.
- Evidência observável: o resultado final expõe warnings de envelope e preserva os caminhos dos artefatos produzidos.

## Decision log
- 2026-04-13 - Abrir ticket separado para o comportamento core - o ajuste muda a semântica de falha do caminho mínimo e merece cobertura própria.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
