# [TICKET] /target_investigate_case_v2 ainda não materializa o diagnóstico como artefato principal nem como UX operator-facing

## Metadata
- Status: open
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-08 21:44Z
- Reporter: Codex
- Owner: workflow-core
- Source: local-run
- Parent ticket (optional): N/A
- Parent execplan (optional): N/A
- Parent commit (optional): N/A
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/codex-flow-runner
- Request ID: spec-triage-2026-04-08-target-investigate-case-v2
- Source spec (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable):
  - RF-15, RF-16, RF-17, RF-18, RF-26 e CA-02, CA-03, CA-07.
  - Membros explícitos que precisam ficar observáveis: artefatos `diagnosis.md` e `diagnosis.json`; `diagnosis.json.verdict = ok | not_ok | inconclusive`; seções de `diagnosis.md` = `Veredito`, `Workflow avaliado`, `Objetivo esperado`, `O que a evidência mostra`, `Por que o caso está ok ou não está`, `Comportamento que precisa mudar`, `Superfície provável de correção`, `Próxima ação`.
- Inherited assumptions/defaults (when applicable):
  - `diagnosis.md` e `diagnosis.json` são os artefatos principais da rodada por default;
  - o operador deve conseguir entender `diagnosis.md` em menos de 2 minutos;
  - o caminho mínimo não depende de `deep-dive`, `ticket-projection` nem `publication`.
- Inherited RNFs (when applicable):
  - reduzir custo cognitivo e priorizar legibilidade humana;
  - manter o target como autoridade semântica do diagnóstico;
  - tornar summary, trace e Telegram diagnosis-first.
- Inherited technical/documentary constraints (when applicable):
  - não deslocar o runner para julgamento semântico de domínio;
  - não esconder publication runner-side, mas rebaixa-la a informação secundária;
  - manter rastreabilidade cross-repo sem exigir que o operador abra vários JSONs auxiliares.
- Inherited pending/manual validations (when applicable):
  - validar a legibilidade de `diagnosis.md` em casos reais.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): N/A
- Smallest plausible explanation (audit/review only): N/A
- Remediation scope (audit/review only): N/A
- Related artifacts:
  - Request file: docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md
  - Response file: src/core/target-investigate-case.ts
  - Decision file: src/integrations/telegram-bot.ts
- Related docs/execplans:
  - prompts/16-target-investigate-case-round-materialization.md
  - tickets/open/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - tickets/open/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5):
- Frequência (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidências e impacto): esta é a entrega principal prometida pela spec; sem ela o fluxo pode mudar de nome, mas continua sem responder rapidamente "o caso está ok ou não, por que e o que muda".

## Context
- Workflow area: `target-investigate-case` / final summary / trace / Telegram / artefatos humanos
- Scenario: a v2 pede que o artefato principal seja um diagnóstico humano-legível, enquanto o runner atual ainda se ancora em `assessment.json`, `publication-decision.json` e `dossier.*`.
- Input constraints:
  - o target continua dono do diagnóstico;
  - o runner precisa apenas carregar, validar e refletir esse diagnóstico de forma clara;
  - publication runner-side continua secundária.

## Problem statement
O runner atual não materializa `diagnosis.md` nem `diagnosis.json` e tampouco os usa como fonte primária das superfícies operator-facing. O summary final, o trace e a mensagem de Telegram continuam derivados de `assessment.json` e `publication-decision.json`, o que preserva a deriva publication-first que a spec v2 justamente quer corrigir.

## Observed behavior
- O que foi observado:
  - `src/core/target-investigate-case.ts` lê `assessment.json`, constrói `buildTargetInvestigateCaseFinalSummary(...)` a partir de `assessment` e `publicationDecision`, e grava sempre `publication-decision.json`.
  - não há leitura nem validação de `diagnosis.md` ou `diagnosis.json` no fluxo atual.
  - `src/integrations/telegram-bot.ts` resume o fechamento por `Resultado investigativo`, `Primary remediation`, `Publication automática`, `Dossier local` e `Ticket path`, sem um artefato de diagnóstico canonicamente renderizado.
  - a busca textual no repositório não encontra implementação para `diagnosis.md`, `diagnosis.json` ou `/target_investigate_case_v2`.
- Frequência (único, recorrente, intermitente): recorrente; afeta toda resposta final do fluxo.
- Como foi detectado (warning/log/test/assert): releitura de `src/core/target-investigate-case.ts`, `src/integrations/telegram-bot.ts` e busca textual por artefatos `diagnosis.*`.

## Expected behavior
O runner deve tratar `diagnosis.md` e `diagnosis.json` como o produto primário da rodada v2, validar o contrato desses artefatos e refletir seu conteúdo como manchete do summary final, do trace e da mensagem de Telegram, deixando publication runner-side como continuação opcional e secundária.

## Reproduction steps
1. Ler `src/core/target-investigate-case.ts` e confirmar que o fluxo atual só consome `assessment.json`, `evidence-bundle.json`, `dossier.*` e `publication-decision.json`.
2. Ler `src/integrations/telegram-bot.ts` e verificar que a resposta final não menciona `diagnosis.md` nem estrutura equivalente a um diagnóstico canonicamente definido.
3. Executar `rg -n "diagnosis\\.md|diagnosis\\.json|target_investigate_case_v2"` no repositório e confirmar a ausência de implementação runner-side.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - `buildTargetInvestigateCaseFinalSummary(...)` consome `assessment` + `publicationDecision`
  - `buildTargetInvestigateCaseReply(...)` destaca `Publication automática` e `Dossier local`
  - ausência de `diagnosis.md` / `diagnosis.json` no fluxo atual
- Comparativo antes/depois (se houver):
  - antes: operador precisa inferir o diagnóstico a partir de `assessment` e publication;
  - depois esperado: `diagnosis.md` responde o caso diretamente e o runner apenas propaga esse artefato.

## Impact assessment
- Impacto funcional: CA-03 e CA-07 permanecem impossíveis de atender.
- Impacto operacional: o operador continua abrindo mais artefatos do que o necessário para entender o caso.
- Risco de regressão: alto, porque a frente toca tipos, summary final, trace, Telegram e testes de renderização.
- Scope estimado (quais fluxos podem ser afetados): `src/core/target-investigate-case.ts`, `src/integrations/telegram-bot.ts`, `src/types/target-investigate-case.ts`, `src/core/runner.ts`, suites de Telegram e do fluxo target.

## Initial hypotheses (optional)
- O runner precisa de uma surface estruturada de diagnóstico e de uma surface textual curta para humanos; tentar deduzir isso a partir do `assessment` atual só perpetua a hierarquia errada da v1.

## Proposed solution (optional)
- Adicionar schemas e validação para `diagnosis.md` e `diagnosis.json`.
- Fazer do `diagnosis.json` a fonte primária machine-readable para summary, trace, status e Telegram.
- Validar que `diagnosis.md` contenha as seções canônicas e que `diagnosis.json` use exatamente `ok | not_ok | inconclusive`.
- Manter publication runner-side como informação complementar, não como abertura da mensagem.

## Closure criteria
- Requisito/RF/CA coberto: RF-15, RF-17, CA-02
- Evidência observável: a rodada v2 materializa `diagnosis.md` e `diagnosis.json`; o schema de `diagnosis.json` aceita exatamente `verdict = ok | not_ok | inconclusive` e rejeita valores fora desse conjunto.
- Requisito/RF/CA coberto: RF-16, CA-03
- Evidência observável: `diagnosis.md` passa a exigir e validar as seções `Veredito`, `Workflow avaliado`, `Objetivo esperado`, `O que a evidência mostra`, `Por que o caso está ok ou não está`, `Comportamento que precisa mudar`, `Superfície provável de correção` e `Próxima ação`; os testes cobrem a presença positiva dessas seções e falha fora do shape esperado.
- Requisito/RF/CA coberto: RF-18, RF-26, CA-07
- Evidência observável: summary final, trace e Telegram passam a abrir com o veredito do `diagnosis` e continuam inteligíveis sem `deep-dive`, `ticket-projection` ou `publication`; `publication_status` deixa de ser a manchete principal.
- Requisito/RF/CA coberto: validação pendente herdada
- Evidência observável: o fechamento registra um spot-check manual em caso real validando a legibilidade de `diagnosis.md` e a consistência diagnosis-first no Telegram.
- Requisito/RF/CA coberto: validação automatizada do pacote
- Evidência observável: testes focados de core/runner/telegram para a renderização diagnosis-first terminam em `exit 0`, junto com `npm run check`.

## Decision log
- 2026-04-08 - Nenhum ticket aberto da mesma linhagem estava disponível para reutilização ou atualização; a derivação runner-side foi iniciada do zero nesta rodada.
- 2026-04-08 - Ownership dividido com fronteira observável: este ticket fica dono dos artefatos `diagnosis.*` e das surfaces operator-facing; o ticket irmão de contrato fica dono do manifesto/caminho mínimo; o ticket irmão de continuações opcionais fica dono dos adaptadores tardios e dos guardrails de migração.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
