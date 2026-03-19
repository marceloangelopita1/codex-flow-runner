# [TICKET] Persistir historico por ciclo do spec-ticket-validation em trace, spec e Telegram

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 21:45Z
- Reporter: Codex
- Owner:
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-11, RF-15, RF-16, RF-17, RF-27; CA-10, CA-11, CA-12
- Inherited assumptions/defaults (when applicable): o gate continua com no maximo 2 ciclos completos de `corrigir -> revalidar`; o resumo final do Telegram deve permanecer compacto; traces/spec/summary precisam carregar historico observavel por ciclo sem depender da memoria do operador nem de releitura manual do raw transcript.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
    - .codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file:
    - .codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - tickets/closed/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md
  - execplans/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md
  - src/types/spec-ticket-validation.ts
  - src/core/spec-ticket-validation.ts
  - src/core/runner.ts
  - src/types/flow-timing.ts
  - src/integrations/workflow-trace-store.ts
  - src/integrations/telegram-bot.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a rodada real de 2026-03-19 mostrou que o gate ja produz snapshots internos por ciclo, mas o operador ainda recebe apenas o agregado final. Isso reduz a capacidade de diagnosticar tentativas reais de autocorrecao, identificar falso positivo e reconstruir por que o gate terminou em `NO_GO`.

## Context
- Workflow area: observabilidade detalhada de `spec-ticket-validation` em summary, spec persistida, trace/log e Telegram
- Scenario: o gate executa validacao inicial e possiveis revalidacoes, mas a persistencia externa ainda cola tudo em um snapshot final unico
- Input constraints: manter o fluxo sequencial; nao reabrir o escopo de contrato documental/autocorrecao real/status `blocked`; nao antecipar a arquitetura `spec-workflow-retrospective` pos-`spec-audit`

## Problem statement
Hoje existe uma assimetria entre o que o gate sabe e o que o sistema persiste. `src/core/spec-ticket-validation.ts` ja produz `snapshots` por ciclo com `cycleNumber`, `phase`, `turnResult`, `appliedCorrections`, `openGapFingerprints` e indicacao de `realGapReductionFromPrevious`. Porem, `src/core/runner.ts`, a secao `Gate de validacao dos tickets derivados` da spec, o `RunSpecsFlowSummary`, o workflow trace e o resumo final do Telegram continuam expondo basicamente o estado agregado final. Alem disso, o runner sobrescreve `latestTurn` e o trace persistido da etapa continua refletindo so o ultimo turno, o que dificulta reconstruir o primeiro passe e as tentativas intermediarias de correcao/revalidacao.

## Observed behavior
- O que foi observado:
  - o gate registrou `cyclesExecuted=1`, mas o trace persistido da etapa e o resumo final nao deixam claro o que ocorreu no passe inicial versus na revalidacao;
  - a spec persiste `### Ultima execucao registrada`, mas nao um historico por ciclo com digest observavel;
  - o Telegram mostra o veredito final e os agregados do gate, sem um resumo por ciclo que permita distinguir tentativa inicial, revalidacao e efeito real das correcoes.
- Frequencia (unico, recorrente, intermitente): recorrente sempre que houver mais de um passe em `spec-ticket-validation`
- Como foi detectado (warning/log/test/assert): analise de codigo em `src/core/spec-ticket-validation.ts`, `src/core/runner.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts` e leitura dos traces reais da rodada de 2026-03-19

## Expected behavior
Summary, spec e traces devem persistir um historico por ciclo, ou ao menos um digest objetivo por ciclo, suficiente para reconstruir:
- qual foi o passe inicial;
- quais correcoes foram tentadas em cada ciclo;
- se houve reducao real de gaps entre ciclos;
- qual foi o veredito/resumo de cada passe;
- por que o gate terminou no estado final.

O Telegram deve continuar compacto, mas incluir um resumo por ciclo quando houver mais de um passe.

## Reproduction steps
1. Ler `src/types/spec-ticket-validation.ts` e `src/core/spec-ticket-validation.ts` para confirmar que o gate ja produz `snapshots` internos por ciclo.
2. Ler `src/core/runner.ts` e `src/integrations/workflow-trace-store.ts` para confirmar que o persistido da etapa ainda depende do consolidado final e do `latestTurn`.
3. Ler `src/integrations/telegram-bot.ts` e a secao persistida na spec para confirmar que o operador ve apenas o agregado final do gate.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `cyclesExecuted = 1`
  - `latestTurn = turn`
  - `snapshots: SpecTicketValidationCycleSnapshot[]`
- Warnings/codes relevantes:
  - `src/core/spec-ticket-validation.ts` ja produz snapshots ricos por passe;
  - `src/core/runner.ts` ainda usa um `latestTurn` unico para a etapa;
  - `src/integrations/workflow-trace-store.ts` persiste um trace por etapa, sem digest por ciclo do gate;
  - `src/integrations/telegram-bot.ts` renderiza apenas `Ciclos executados: N`, sem historico resumido por ciclo.
- Comparativo antes/depois (se houver): antes = somente agregado final do gate; depois esperado = agregado final + historico/digest por ciclo em summary, spec, trace e Telegram

## Impact assessment
- Impacto funcional: baixo no fluxo principal, mas alto para diagnostico e auditoria do gate
- Impacto operacional: o operador nao consegue reconstruir com confianca o que foi tentado em cada ciclo sem voltar aos traces brutos e ao codigo
- Risco de regressao: medio, porque a mudanca atravessa tipos, persistencia na spec, trace/log, Telegram e testes de observabilidade
- Scope estimado (quais fluxos podem ser afetados): `spec-ticket-validation`, persistencia da secao do gate na spec, traces da etapa, resumo final do `/run_specs` e testes associados

## Initial hypotheses (optional)
- A base correta ja existe em `SpecTicketValidationCycleSnapshot`; o gap principal esta na serializacao e exposicao desse historico ao restante do runner.
- Um digest por ciclo deve ser suficiente para Telegram/spec/trace, sem necessidade de duplicar o transcript bruto completo da sessao.

## Proposed solution (optional)
Propagar `snapshots` do resultado do gate para um shape observavel e persistivel no `RunSpecsFlowSummary`, no trace da etapa e na secao da spec, adicionar um resumo compacto por ciclo no Telegram e cobrir isso com regressao focada em runner, trace store e Telegram.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-11, RF-15; CA-10
- Evidencia observavel: a secao `Gate de validacao dos tickets derivados` da spec persiste historico/digest por ciclo com `cycleNumber`, `phase`, veredito, confianca, resumo, fingerprints abertos e correcoes aplicadas, sem apagar a leitura do agregado final.
- Requisito/RF/CA coberto: RF-16, RF-17, RF-27; CA-11, CA-12
- Evidencia observavel: `RunSpecsFlowSummary`, trace/log da etapa e resumo final do Telegram passam a expor historico/digest por ciclo do gate; quando houver mais de um passe, o operador consegue distinguir validacao inicial e revalidacoes sem reler o transcript bruto.
- Requisito/RF/CA coberto: RF-16, RF-17, RF-27; parte correspondente do item 6
- Evidencia observavel: testes focados cobrem historico por ciclo na spec, no workflow trace e no Telegram, incluindo um caso com pelo menos 2 passes (`initial-validation` + `revalidation`).

## Decision log
- 2026-03-19 - Ticket aberto como follow-up da observacao operacional de `/run_specs` - os itens 1, 2 e 3 do diagnostico ja foram implementados, e o proximo passo recomendado passou a ser a persistencia de historico por ciclo com regressao focada.
- 2026-03-19 - Implementacao concluida com historico por ciclo propagado para summary, spec persistida, metadata de trace e resumo do Telegram, com regressao focada cobrindo runner, trace store e bot.

## Closure
- Closed at (UTC): 2026-03-19 21:57Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - Execplan: `execplans/2026-03-19-spec-ticket-validation-historico-por-ciclo-em-trace-spec-e-telegram.md`
  - Commit: a ser registrado no mesmo changeset do fechamento
  - Evidencias:
    - `src/types/flow-timing.ts` passou a carregar `cycleHistory` no `RunSpecsTicketValidationSummary`.
    - `src/core/runner.ts` passou a persistir o digest por ciclo no summary, na secao da spec e no metadata do trace do gate.
    - `src/integrations/telegram-bot.ts` passou a renderizar historico compacto por ciclo quando houve revalidacao.
    - `src/core/runner.test.ts` cobre a persistencia do historico por ciclo em summary, spec e trace.
    - `src/integrations/workflow-trace-store.test.ts` cobre a serializacao do metadata com `cycleHistory`.
    - `src/integrations/telegram-bot.test.ts` cobre a exibicao do historico por ciclo no resumo final do `/run_specs`.
    - `npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` passou (`229/229`).
    - `npm test` passou (`376/376`).
    - `npm run check` passou.
    - `npm run build` passou.
- Follow-up ticket (required when `Closure reason: split-follow-up`):
