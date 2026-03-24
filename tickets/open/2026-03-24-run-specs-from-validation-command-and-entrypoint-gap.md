# [TICKET] Falta porta de entrada publica para retomar `run-specs` a partir de `spec-ticket-validation`

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-24 17:56Z
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
- Source spec (when applicable): docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md
- Source spec canonical path (when applicable): docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25; CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-09, CA-10, CA-11.
- Inherited assumptions/defaults (when applicable): o nome canonico do comando e `/run_specs_from_validation`; `/run_specs` continua significando retriagem completa; `/run_specs_from_validation` significa revalidar o backlog derivado atual e continuar somente em `GO`; ausencia de tickets abertos derivados implica ausencia de backlog reaproveitavel; a primeira versao fica restrita a comando textual no Telegram; `spec-ticket-validation` continua sendo a autoridade funcional para decidir `GO | NO_GO`.
- Inherited RNFs (when applicable): preservar o fluxo sequencial por projeto; manter o mesmo contrato funcional atual de `spec-ticket-validation` (contexto novo no primeiro passe, autocorrecao controlada, limite de ciclos, taxonomia de gaps, veredito e write-back funcional); preservar `/run_specs` sem mudanca semantica.
- Inherited technical/documentary constraints (when applicable): o novo caminho deve iniciar diretamente em `spec-ticket-validation` sem executar `spec-triage`; a validacao deve reconstruir o pacote usando a mesma logica de linhagem atual (`Source spec`, `Related tickets`, `source-spec | spec-related | hybrid`); o novo comando nao pode criar, apagar, mover ou regenerar tickets antes da validacao; a primeira versao nao pode adicionar botao novo em `/specs`; o comando deve obedecer aos mesmos gates operacionais de slot/capacidade/autenticacao/projeto ativo usados em `/run_specs`.
- Inherited pending/manual validations (when applicable): `npm test`; `npm run check`; cobertura direcionada para `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`, incluindo inicio direto na validacao, bloqueio por ausencia de backlog derivado, parada em `NO_GO`, continuacao em `GO` e preservacao semantica de `/run_specs`; validacao manual no Telegram para confirmar inicio direto em `spec-ticket-validation`, bloqueio sem backlog derivado, parada antes de `spec-close-and-version` e `/run_all` em `NO_GO`, e continuidade ate `spec-audit` em `GO`.
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
  - docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P0 porque a porta de entrada principal da spec ainda nao existe; o operador segue obrigado a voltar para `spec-triage`, o que contradiz o recorte aprovado de retomada pela validacao e pode sobrescrever backlog ajustado manualmente.

## Context
- Workflow area: Telegram `/run_specs*` -> `run-specs` pre-`/run_all`.
- Scenario: uma spec aprovada ja derivou tickets, o backlog aberto foi ajustado manualmente apos `NO_GO`, e o operador precisa retomar o fluxo direto em `spec-ticket-validation`.
- Input constraints: manter `run-specs` como familia de fluxo, preservar o caminho legado de retriagem completa, nao tocar em botoes/callbacks de `/specs` nesta primeira versao.

## Problem statement
O runner nao oferece nenhum comando publico para iniciar `run-specs` diretamente em `spec-ticket-validation`. Hoje o Telegram expoe apenas `/run_specs`, e `requestRunSpecs` sempre agenda `runSpecsAndRunAll` com passagem obrigatoria por `spec-triage`. Com isso, a retomada aprovada pela spec nao existe, e o operador nao consegue reutilizar com seguranca o backlog aberto atual apos revisao manual.

## Observed behavior
- O que foi observado: o bot so registra `/run_specs` no help e nos handlers; nao existe parser, mensagem de uso ou reply de validacao para `/run_specs_from_validation`. No runner, `requestRunSpecs` normaliza a spec e sempre chama `runSpecsAndRunAll`, cujo fluxo inicia por `runTimedSpecTriageStage` antes de `spec-ticket-validation`. A construcao do pacote derivado ja existe, mas e chamada apenas dentro do caminho iniciado por `/run_specs`.
- Frequencia (unico, recorrente, intermitente): recorrente em toda execucao de `run-specs`.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/core/spec-ticket-validation.ts`, `src/integrations/spec-discovery.ts` e `README.md`.

## Expected behavior
O bot deve expor `/run_specs_from_validation <arquivo-da-spec.md>` com o mesmo contrato basico de acesso, parsing e elegibilidade de `/run_specs`, acrescido do gate de backlog derivado aberto. Em caso elegivel, o runner deve iniciar `run-specs` diretamente em `spec-ticket-validation`, reutilizando a logica atual de montagem do pacote derivado e preservando o restante do fluxo (`NO_GO` bloqueia; `GO` continua para retrospectiva quando aplicavel, `spec-close-and-version`, `/run_all` e `spec-audit`).

## Reproduction steps
1. Ler `START_REPLY_LINES` e `registerHandlers` em `src/integrations/telegram-bot.ts` e confirmar que apenas `/run_specs` esta exposto.
2. Ler `handleRunSpecsCommand` em `src/integrations/telegram-bot.ts` e confirmar que o caminho atual valida apenas elegibilidade da spec e depois chama `controls.runSpecs(...)`.
3. Ler `requestRunSpecs` em `src/core/runner.ts` e confirmar que o loop agendado e sempre `runSpecsAndRunAll(...)`.
4. Ler `runSpecsAndRunAll` em `src/core/runner.ts` e confirmar que a primeira etapa executada e `spec-triage`.
5. Ler `buildSpecTicketValidationPackageContext` em `src/core/runner.ts` e confirmar que a logica de backlog derivado reaproveitavel ja existe, mas nao esta ligada a um comando publico de retomada.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/integrations/telegram-bot.ts`: constantes, help e handlers cobrem apenas `/run_specs`.
  - `src/core/runner.ts`: `requestRunSpecs` agenda sempre `runSpecsAndRunAll`; o fluxo comeca em `spec-triage`.
  - `src/core/runner.ts`: `buildSpecTicketValidationPackageContext` ja reconstrui backlog por `Source spec` e `Related tickets`, com linhagem `source-spec | spec-related | hybrid`.
  - `src/integrations/spec-discovery.ts`: a elegibilidade atual cobre apenas `Status: approved` e `Spec treatment: pending`.
- Comparativo antes/depois (se houver): antes = inexistencia de retomada publica pela validacao; depois esperado = comando textual dedicado com gate de backlog e entrada direta em `spec-ticket-validation`.

## Impact assessment
- Impacto funcional: a funcionalidade principal aprovada na spec nao existe.
- Impacto operacional: o operador precisa rerodar `spec-triage` mesmo quando o backlog derivado ja foi corrigido manualmente, com risco de sobrescrita ou duplicacao de trabalho.
- Risco de regressao: alto, porque a mudanca atravessa Telegram, runner, contrato de entrada do fluxo e cobertura automatizada do caminho legado.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/types/flow-timing.ts` ou contratos associados, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, e possivelmente wiring em `src/main.ts`.

## Initial hypotheses (optional)
- A remediacao minima e introduzir um segundo ponto de entrada para a mesma familia `run-specs`, reaproveitando a logica existente de `buildSpecTicketValidationPackageContext` e separando o ponto de entrada do restante do fluxo.

## Proposed solution (optional)
Nao obrigatorio. Direcao concreta: adicionar comando Telegram dedicado, gate explicito para backlog derivado aberto, e um caminho no runner que entre em `spec-ticket-validation` sem executar `spec-triage`, mantendo o comportamento de `NO_GO`, `GO` e do caminho legado.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-23, RF-24, RF-25; CA-01, CA-02, CA-03, CA-04.
- Evidencia observavel: o bot expone `/run_specs_from_validation <arquivo-da-spec.md>` com mensagens de uso, parsing, controle de acesso, validacao de elegibilidade e bloqueio acionavel quando nao houver backlog derivado aberto; `src/integrations/telegram-bot.test.ts` cobre sucesso, falta de argumento, caminho invalido/spec inexistente/spec inelegivel e ausencia de backlog derivado.
- Requisito/RF/CA coberto: RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-20, RF-21, RF-22; CA-05, CA-06, CA-07, CA-09, CA-10, CA-11.
- Evidencia observavel: o runner passa a ter um caminho de `run-specs` cujo ponto de entrada e `spec-ticket-validation`, sem executar `spec-triage`, sem criar/apagar/regenerar tickets antes da validacao, preservando a mesma logica de backlog derivado atual e a continuidade para retrospectiva/quebra em `NO_GO`/continuidade em `GO`; `src/core/runner.test.ts` cobre `NO_GO`, falha tecnica, `GO` e preservacao semantica de `/run_specs`.
- Requisito/RF/CA coberto: RF-10.
- Evidencia observavel: a rodada iniciada por `/run_specs_from_validation` comprova explicitamente que o primeiro passe de `spec-ticket-validation` roda em contexto novo em relacao a execucoes anteriores e preserva, sem regressao, autocorrecao controlada, o mesmo limite de ciclos, a mesma taxonomia de gaps, o mesmo veredito `GO | NO_GO` e o mesmo write-back funcional na spec quando aplicavel; `src/core/runner.test.ts` cobre esses asserts de contrato no caminho novo alem do legado.
- Requisito/RF/CA coberto: validacoes herdadas da spec.
- Evidencia observavel: `npm test` e `npm run check` concluem sem regressao; a cobertura direcionada de `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` inclui os cenarios exigidos; as validacoes manuais no Telegram registradas na spec ficam executaveis para este recorte, incluindo confirmar no Telegram o inicio direto em `spec-ticket-validation`, a parada antes de `spec-close-and-version` e `/run_all` em `NO_GO`, e a continuidade ate `spec-audit` em `GO`.

## Decision log
- 2026-03-24 - Ticket aberto na triagem da spec para cobrir o gap funcional principal da retomada pela validacao - sem esta porta de entrada publica, os demais ajustes de observabilidade/documentacao nao entregam valor operacional.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
