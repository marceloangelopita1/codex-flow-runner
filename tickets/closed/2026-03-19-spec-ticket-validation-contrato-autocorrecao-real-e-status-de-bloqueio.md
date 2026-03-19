# [TICKET] Corrigir contrato documental, autocorrecao material e status de bloqueio do spec-ticket-validation

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 21:14Z
- Reporter: Codex
- Owner:
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-08, RF-11, RF-12, RF-14, RF-16, RF-17, RF-27; CA-06, CA-07, CA-09, CA-11, CA-12
- Inherited assumptions/defaults (when applicable): `GO/NO_GO` vale para o pacote derivado inteiro; o primeiro passe do gate ocorre em contexto novo; revalidacao so deve ocorrer apos correcao material; `NO_GO` deliberado de qualidade nao deve ser comunicado como erro tecnico.
- Workflow root cause (when applicable): execution
- Smallest plausible explanation (when applicable): o comportamento observado decorre da integracao atual do gate no runner, no prompt e no resumo final: `autoCorrect` nao altera artefatos, o contrato documental de `documentation-compliance-gap` nao esta explicitado de forma suficiente para o contexto de triagem de spec, e o resumo binario do fluxo colapsa bloqueio deliberado em `failure`.
- Remediation scope (when applicable): a remediacao precisa corrigir localmente o runner/tipos/resumo e tambem ajustar a instrucao generica do repositorio para o contrato documental do gate.
- Related artifacts:
  - Request file:
  - Response file:
    - .codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
    - .codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file:
    - .codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - execplans/2026-03-19-spec-ticket-validation-contrato-autocorrecao-real-e-status-de-bloqueio.md
  - INTERNAL_TICKETS.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - src/core/runner.ts
  - src/core/spec-ticket-validation.ts
  - src/types/flow-timing.ts
  - src/integrations/telegram-bot.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o gate pode bloquear `/run_specs` por gap documental potencialmente ambiguo, desperdica ciclos com revalidacao sem correcao material e comunica o resultado como falha tecnica, o que reduz confianca operacional e atrapalha diagnostico.

## Context
- Workflow area: `spec-ticket-validation`, contrato documental do gate, autocorrecao do pacote derivado e resumo final do `/run_specs`
- Scenario: durante a execucao real de `/run_specs` para a spec `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`, o gate bloqueou a rodada com `NO_GO` e `no-real-gap-reduction` sem excecao tecnica
- Input constraints: manter fluxo sequencial; preservar `GO/NO_GO` como decisao do pacote derivado; nao antecipar nesta etapa a arquitetura completa de retrospectiva pos-`spec-audit`

## Problem statement
O comportamento atual de `spec-ticket-validation` mistura tres problemas relacionados. Primeiro, o contrato de `documentation-compliance-gap` esta ambiguo para tickets derivados de `spec-triage`, o que abre espaco para falso positivo em cima de campos que `INTERNAL_TICKETS.md` hoje exige explicitamente apenas para tickets criados em `post-implementation audit/review`. Segundo, o `autoCorrect` integrado ao runner apenas recompõe o `packageContext` e retorna `appliedCorrections: []`, produzindo revalidacao sem correcao material do backlog derivado. Terceiro, o resumo final do fluxo trata `NO_GO` deliberado do gate como `failure`, misturando bloqueio de qualidade com erro tecnico do sistema.

## Observed behavior
- O que foi observado:
  - a rodada de 2026-03-19 encerrou em `spec-ticket-validation` com `verdict=NO_GO`, `confidence=high`, `finalReason=no-real-gap-reduction` e `cyclesExecuted=1`, sem chegar a `spec-close-and-version`, `/run-all` ou `spec-audit`
  - o callback `autoCorrect` em `src/core/runner.ts` recompõe o pacote e devolve `appliedCorrections: []`, sem editar arquivos nem registrar correcao material
  - o resumo final enviado pelo Telegram usa `Resultado: falha` porque o modelo de summary do fluxo continua binario (`success | failure`) mesmo quando o bloqueio foi deliberado pelo gate
- Frequencia (unico, recorrente, intermitente): recorrente enquanto o contrato/pipeline permanecer igual
- Como foi detectado (warning/log/test/assert): analise dos traces da rodada real e leitura de `src/core/runner.ts`, `src/core/spec-ticket-validation.ts`, `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `INTERNAL_TICKETS.md` e `prompts/09-validar-tickets-derivados-da-spec.md`

## Expected behavior
O gate deve aplicar o contrato documental correto para o tipo de ticket avaliado, evitando falso positivo por requisito que nao pertence a triagem inicial da spec. Quando o runner disser que tentou autocorrecao, precisa haver correcao material observavel nos artefatos afetados ou short-circuit explicito sem consumir um ciclo enganoso de revalidacao. E, quando a rodada for bloqueada deliberadamente por `NO_GO`, o resumo final deve comunicar `bloqueado` ou semantica equivalente, separado de falha tecnica.

## Reproduction steps
1. Ler `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json` e confirmar `finalReason=no-real-gap-reduction`, `cyclesExecuted=1` e `appliedCorrections: []`.
2. Ler `src/core/runner.ts` e confirmar que o callback `autoCorrect` de `runSpecTicketValidationStage(...)` apenas recompõe `packageContext` sem editar artefatos.
3. Ler `INTERNAL_TICKETS.md`, `prompts/09-validar-tickets-derivados-da-spec.md`, `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts` para confirmar a ambiguidade documental do gap e a comunicacao binaria `success | failure`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `decision.metadata.finalReason = "no-real-gap-reduction"`
  - `decision.metadata.cyclesExecuted = 1`
  - `decision.metadata.appliedCorrections = []`
- Warnings/codes relevantes:
  - `src/core/runner.ts`: `autoCorrect` recompõe apenas `packageContext`
  - `src/core/spec-ticket-validation.ts`: o loop encerra em `no-real-gap-reduction` quando nao houver reducao estrita dos gaps entre ciclos
  - `INTERNAL_TICKETS.md`: campos extras de causa-raiz/minimal explanation/remediation scope sao exigidos explicitamente apenas para `post-implementation audit/review`
  - `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts`: resumo final ainda usa semantica agregada `success | failure`
- Comparativo antes/depois (se houver): antes = revalidacao sem correcao material, contrato documental ambiguo e `NO_GO` mostrado como falha; depois esperado = contrato explicito, autocorrecao material ou short-circuit honesto, e `NO_GO` deliberado mostrado como bloqueio

## Impact assessment
- Impacto funcional: falso `NO_GO` ou `NO_GO` estagnado pode bloquear a rodada antes de `spec-close-and-version` e `/run-all` mesmo quando o backlog esta perto de consistente
- Impacto operacional: o operador recebe um resumo final que parece erro tecnico do sistema em vez de gate deliberado de qualidade
- Risco de regressao: alto, porque a correcao atravessa contrato documental, runner, tipos de summary, Telegram e testes do gate
- Scope estimado (quais fluxos podem ser afetados): `spec-ticket-validation`, geracao de traces/resumo final de `/run_specs`, prompts/documentacao do gate e testes associados

## Initial hypotheses (optional)
- O contrato original de `spec-ticket-validation` foi implementado parcialmente: a espinha de validacao/revalidacao entrou no codigo, mas a etapa de correcao material ficou como placeholder e a observabilidade manteve o modelo binario preexistente.
- A ambiguidade documental do `documentation-compliance-gap` aumenta porque o prompt do gate nao explicita quando os campos extras de tickets de auditoria/review devem ou nao ser cobrados.

## Proposed solution (optional)
Fechar explicitamente o contrato documental de `documentation-compliance-gap`, introduzir uma etapa real de autocorrecao do pacote derivado ou short-circuit sem revalidacao enganosa quando nao houver correcao material segura, e expandir o summary de `/run_specs` para distinguir `blocked` de `failure`.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-08, RF-11; CA-06
- Evidencia observavel: `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `prompts/09-validar-tickets-derivados-da-spec.md` e quaisquer helpers/contextos de suporte deixam explicito quando `documentation-compliance-gap` pode cobrar campos extras de tickets de auditoria/review; testes automatizados cobrem ao menos um pacote derivado de `spec-triage` e um caso de `post-implementation audit/review` sem ambiguidade residual.
- Requisito/RF/CA coberto: RF-12, RF-14; CA-07, CA-09
- Evidencia observavel: o runner so dispara revalidacao depois de uma correcao material observavel ou encerra explicitamente sem simular autocorrecao; `appliedCorrections` so lista correcoes reais; testes cobrem caminho com correcao aplicada e caminho sem correcao segura.
- Requisito/RF/CA coberto: RF-16, RF-17, RF-27; CA-11, CA-12
- Evidencia observavel: `RunSpecsFlowSummary`, `src/integrations/telegram-bot.ts` e testes associados distinguem bloqueio deliberado do gate (`blocked` ou semantica equivalente) de falha tecnica (`failure`), preservando `completionReason` observavel no resumo final.

## Decision log
- 2026-03-19 - Ticket aberto a partir de observacao real de `/run_specs` - a rodada da spec de retrospectiva foi bloqueada sem excecao tecnica, mas revelou contrato documental ambiguo, autocorrecao placeholder e semantica operacional insuficiente para `NO_GO`.
- 2026-03-19 - Diff, ticket, execplan e testes de regressao relidos na etapa de fechamento; criterios tecnicos desta entrega validados com `GO`.

## Closure
- Closed at (UTC): 2026-03-19 21:38Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-spec-ticket-validation-contrato-autocorrecao-real-e-status-de-bloqueio.md`
  - Commit: mesmo changeset de fechamento versionado manualmente.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-08`, `RF-11`; `CA-06`: [INTERNAL_TICKETS.md](/home/mapita/projetos/codex-flow-runner/INTERNAL_TICKETS.md), [tickets/templates/internal-ticket-template.md](/home/mapita/projetos/codex-flow-runner/tickets/templates/internal-ticket-template.md) e [prompts/09-validar-tickets-derivados-da-spec.md](/home/mapita/projetos/codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md) agora deixam explicito que campos extras de `post-implementation audit/review` nao devem ser cobrados automaticamente de tickets derivados de `spec-triage`.
  - `RF-12`, `RF-14`; `CA-07`, `CA-09`: [src/core/runner.ts](/home/mapita/projetos/codex-flow-runner/src/core/runner.ts), [src/core/spec-ticket-validation.ts](/home/mapita/projetos/codex-flow-runner/src/core/spec-ticket-validation.ts), [src/integrations/codex-client.ts](/home/mapita/projetos/codex-flow-runner/src/integrations/codex-client.ts), [prompts/10-autocorrigir-tickets-derivados-da-spec.md](/home/mapita/projetos/codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md) e [src/integrations/spec-ticket-validation-autocorrect-parser.ts](/home/mapita/projetos/codex-flow-runner/src/integrations/spec-ticket-validation-autocorrect-parser.ts) substituem a pseudo-autocorrecao por uma etapa real e encerram o gate com `no-material-auto-correction` quando nao houver mudanca segura e material.
  - `RF-16`, `RF-17`, `RF-27`; `CA-11`, `CA-12`: [src/types/flow-timing.ts](/home/mapita/projetos/codex-flow-runner/src/types/flow-timing.ts), [src/core/runner.ts](/home/mapita/projetos/codex-flow-runner/src/core/runner.ts) e [src/integrations/telegram-bot.ts](/home/mapita/projetos/codex-flow-runner/src/integrations/telegram-bot.ts) agora distinguem `blocked` de `failure` no `/run_specs` e no resumo final do Telegram.
- Regressao automatizada executada:
  - `npm test` -> pass (`374/374`)
  - `npm run check` -> pass
- Validacao manual externa pendente: nao.
