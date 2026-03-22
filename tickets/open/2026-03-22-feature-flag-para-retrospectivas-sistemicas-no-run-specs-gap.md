# [TICKET] Controlar retrospectivas sistemicas do /run_specs por feature flag desligada por padrao

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-22 19:24Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable):
- Active project (when applicable):
- Target repository (when applicable):
- Request ID: N/A - derivacao manual local a partir da spec 2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow
- Source spec (when applicable): docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md
- Source spec canonical path (when applicable): docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-24, RF-25; CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-12, CA-13
- Inherited assumptions/defaults (when applicable): o nome canonico da flag e `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`; o default canonico e `false`; a mesma flag controla conjuntamente `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`; com a flag desligada a etapa inteira deve ser suprimida, e nao apenas a publication; com a flag desligada a observabilidade da decisao fica restrita a logs/traces tecnicos internos; os prompts existentes permanecem validos; o valor da flag e carregado no bootstrap e vale ate o proximo restart.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md
  - src/config/env.ts
  - src/config/env.test.ts
  - src/main.ts
  - src/core/runner.ts
  - src/types/flow-timing.ts
  - src/integrations/telegram-bot.ts
  - README.md
  - .env.example

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o comportamento padrao atual continua executando retrospectivas sistemicas, write-back de spec e publication de ticket transversal sem qualquer opt-in. Isso contraria o default `false` aprovado para forks e distribuicoes de terceiros e pode gerar backlog sistemico e observabilidade extra indevidos no consumo real da fila.

## Context
- Workflow area: bootstrap de ambiente, orquestracao de `/run_specs`, traces/timing e resumo final do Telegram
- Scenario: operador deixa `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` ausente ou `false` e ainda assim o fluxo atual entra automaticamente nas retrospectivas sistemicas pre-`/run_all` e pos-`spec-audit`
- Input constraints: manter fluxo sequencial; usar uma unica flag; nao alterar contratos parseaveis atuais de `derivation-gap-analysis`, `workflow-gap-analysis` nem `workflow-ticket-publication`; nao criar toggle em runtime

## Problem statement
O runner ainda nao possui a flag `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` no parser de ambiente nem no bootstrap. Como consequencia, o comportamento aprovado como opt-in continua ativo por padrao: a retrospectiva pre-`/run_all` executa quando ha gaps revisados, a retrospectiva pos-`spec-audit` executa quando ha gaps residuais, a publication de ticket transversal continua elegivel, a secao `Retrospectiva sistemica da derivacao dos tickets` pode receber write-back automatico e o resumo final do Telegram continua exibindo blocos sistemicos.

## Observed behavior
- O que foi observado: `src/config/env.ts` nao declara `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`; `src/main.ts` nao registra o estado efetivo dessa flag no bootstrap; `src/core/runner.ts` sempre chama `runTimedSpecTicketDerivationRetrospectiveStage(...)` apos `spec-ticket-validation` e sempre chama `runTimedSpecWorkflowRetrospectiveStage(...)` quando `specAuditResult.residualGapsDetected` e verdadeiro; `src/core/runner.ts` ainda faz write-back da secao `Retrospectiva sistemica da derivacao dos tickets`; `src/integrations/telegram-bot.ts` sempre inclui os blocos de retrospectiva quando os summaries existem; `src/types/flow-timing.ts` ainda reconhece as retrospectivas como fases normais do snapshot.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de codigo e testes atuais de ambiente/orquestracao/resumo

## Expected behavior
Com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` ausente ou `false`, `/run_specs` deve manter apenas o fluxo funcional da spec, sem executar retrospectivas sistemicas, sem publication transversal, sem write-back da secao sistemica e sem expor esses blocos ao operador. Com a flag em `true`, o comportamento atual das retrospectivas deve ser preservado.

## Inherited validations from source spec
- Executar ao menos uma rodada real com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` e outra com `true`, confirmando a diferenca de comportamento em Telegram, logs e write-back de spec. Esta validacao e relevante para aceite do ticket e deve aparecer na validacao final.
- Confirmar em execucao real que alterar a flag no `.env` sem reiniciar o processo nao muda o comportamento em voo. Esta validacao e relevante para o contrato de bootstrap e deve aparecer nos closure criteria e na validacao final.
- Confirmar em execucao real que, com a flag desligada, o fluxo permanece legivel para um operador externo e nao expoe blocos sistemicos no resumo final. Esta validacao e relevante para aceite do comportamento suprimido no Telegram.

## Reproduction steps
1. Ler `src/config/env.ts` e `src/config/env.test.ts` e confirmar a ausencia de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`.
2. Ler `src/core/runner.ts` e confirmar que a retrospectiva pre-`/run_all` sempre e avaliada/rodada apos `spec-ticket-validation`, sem guard por feature flag.
3. Ler `src/core/runner.ts` e confirmar que, quando `specAuditResult.residualGapsDetected` e verdadeiro, a retrospectiva pos-`spec-audit` e executada sem guard por feature flag.
4. Ler `src/integrations/telegram-bot.ts`, `src/types/flow-timing.ts`, `.env.example` e `README.md` e confirmar que o comportamento sistemico continua sendo tratado como parte normal do fluxo.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/config/env.ts` define apenas `PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM` como booleano opcional; a nova flag nao existe no schema.
  - `src/config/env.test.ts` cobre defaults e booleans apenas para a flag de raw output; nao existe cobertura para `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`.
  - `src/main.ts` registra apenas `PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM` no bootstrap.
  - `src/core/runner.ts` executa `runTimedSpecTicketDerivationRetrospectiveStage(...)` sem condicao de ambiente e, quando `specAuditResult.residualGapsDetected`, executa `runTimedSpecWorkflowRetrospectiveStage(...)`.
  - `src/core/runner.ts` continua permitindo write-back da secao `Retrospectiva sistemica da derivacao dos tickets`.
  - `src/integrations/telegram-bot.ts` acrescenta os blocos `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit` quando os summaries existem.
  - `.env.example` e `README.md` nao documentam a nova flag nem o default `false`.
- Comparativo antes/depois (se houver): antes = retrospectivas sistemicas sao comportamento padrao; depois esperado = retrospectivas viram opt-in por ambiente, com default desligado e sem ruido para o operador quando `false`

## Impact assessment
- Impacto funcional: o fluxo executa etapas adicionais fora do comportamento padrao aprovado para terceiros.
- Impacto operacional: pode abrir/reutilizar ticket transversal indevido, escrever retrospectiva sistemica na spec local e poluir o resumo final do Telegram.
- Risco de regressao: alto, porque a mudanca precisa manter o comportamento atual quando `true` e suprimir multiplas superficies quando `false`.
- Scope estimado (quais fluxos podem ser afetados): `src/config/env.ts`, `src/config/env.test.ts`, `src/main.ts`, `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `.env.example`, `README.md` e testes associados

## Initial hypotheses (optional)
- O parser booleano reutilizavel ja existe e reduz o risco da parte de configuracao; o ponto mais sensivel e garantir supressao consistente de execucao, publication, write-back, summary e timing sem quebrar o caminho atual quando a flag estiver ligada.

## Proposed solution (optional)
Adicionar a nova flag ao parser de ambiente com default `false`, registrar seu estado efetivo no bootstrap, guardar a entrada nas duas retrospectivas sistemicas por uma unica verificacao de ambiente e ajustar summary/timing/tests para refletir a supressao completa quando a flag estiver desligada, preservando o comportamento atual quando ela estiver ligada.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-01, RF-02, RF-03, RF-17, RF-18, RF-19, RF-20, RF-24, RF-25; CA-01, CA-02, CA-03, CA-13
- Evidencia observavel: `src/config/env.ts` e `src/config/env.test.ts` passam a expor `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` com o mesmo contrato booleano do projeto e default `false`; `.env.example`, `README.md` e `src/main.ts` documentam/logam o estado efetivo da flag, seu default, o efeito sobre `/run_specs` e a necessidade de restart.
- Requisito/RF/CA coberto: RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-12, RF-13, RF-14; CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10
- Evidencia observavel: testes de `src/core/runner.ts`, `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts` provam que, com a flag desligada, as retrospectivas sistemicas nao executam, nao publicam ticket transversal, nao fazem write-back, nao entram em `completedStages`/`finalStage`/duracoes e nao aparecem no resumo final do Telegram, deixando apenas logs/traces tecnicos internos de supressao.
- Requisito/RF/CA coberto: RF-11
- Evidencia observavel: os testes mostram que `spec-ticket-validation`, `spec-close-and-version`, `/run_all` e `spec-audit` continuam operando normalmente com a flag desligada, e `spec-audit` permanece como fase final observavel quando nao houver falha funcional posterior.
- Requisito/RF/CA coberto: RF-15, RF-16; CA-11, CA-12
- Evidencia observavel: testes mostram que, com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, os cenarios elegiveis atuais continuam disparando `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` sem regressao funcional.
- Requisito/RF/CA coberto: validacoes manuais herdadas da spec
- Evidencia observavel: a entrega registra explicitamente a execucao de ao menos uma rodada real com a flag em `false` e outra em `true`, alem da confirmacao manual de que mudar o `.env` sem restart nao altera o comportamento em voo.

## Decision log
- 2026-03-22 - Ticket aberto a partir da avaliacao da spec - o default aprovado (`false`) ainda nao existe no runtime, e o backlog sistemico continua ativo por padrao no `/run_specs`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
