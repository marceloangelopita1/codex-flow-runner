# [TICKET] Implementar validacao de tickets derivados com taxonomia fixa e autocorrecao

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 15:41Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-02, RF-03, RF-08, RF-09, RF-11, RF-12, RF-13, RF-14; CA-04, CA-05, CA-06, CA-07, CA-08, CA-09
- Inherited assumptions/defaults (when applicable): a primeira validacao nao deve reutilizar o contexto da triagem; revalidacoes podem reutilizar o contexto da propria validacao; `GO/NO_GO` e decidido sobre o pacote derivado inteiro; default do gate = autocorrecao + revalidacao; limite fixo de 2 ciclos completos.
- Workflow root cause (when applicable): execution
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - src/core/runner.ts
  - src/integrations/codex-client.ts
  - src/types/flow-timing.ts
  - docs/workflows/codex-quality-gates.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): sem criterios objetivos, taxonomia fixa e loop limitado de revalidacao, o novo gate vira um passo subjetivo ou incompleto, incapaz de sustentar um `GO/NO_GO` auditavel.

## Context
- Workflow area: contrato funcional de `spec-ticket-validation`
- Scenario: apos `spec-triage`, o runner precisa avaliar o pacote de tickets, tentar corrigir gaps corrigiveis e decidir `GO`/`NO_GO`
- Input constraints: usar apenas a taxonomia aprovada na spec; respeitar no maximo 2 ciclos completos; preservar fluxo sequencial

## Problem statement
Mesmo abstraindo a falta do novo estagio na orquestracao, o codigo atual nao possui um contrato de validacao para o pacote derivado de tickets: nao ha taxonomia fixa de gaps, nao ha parser/resultado estruturado com confianca/evidencias/causa-raiz, nao ha revalidacao com contexto proprio e nao existe loop de autocorrecao limitado.

## Observed behavior
- O que foi observado: as etapas de spec atuais sao apenas execs nao interativos; nao existe prompt/stage para validacao de tickets derivados; o runner nao gerencia conversation/thread para uma etapa de validacao com reuso local de contexto; nao ha estrutura para registrar gaps por taxonomia, confianca final ou reducao real de gaps entre ciclos.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de codigo e testes de `codex-client`/`runner`

## Expected behavior
`spec-ticket-validation` deve rodar um primeiro passe em contexto novo, produzir um resultado estruturado com taxonomia fixa, decidir `GO/NO_GO`, tentar autocorrecao quando houver gaps corrigiveis e revalidar no mesmo contexto local ate o limite de 2 ciclos completos, bloqueando a rodada quando nao houver reducao real dos gaps ou quando a confianca para `GO` continuar insuficiente.

## Reproduction steps
1. Ler `src/integrations/codex-client.ts` e confirmar as etapas de spec disponiveis e os modos interativos existentes.
2. Ler `src/core/runner.ts` e verificar que `/run_specs` usa apenas `runSpecStage(...)` para etapas de spec.
3. Confirmar em `src/types/flow-timing.ts` e nos testes que nao ha payloads para gaps, confianca, ciclos ou causas-raiz da validacao.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/integrations/codex-client.ts` mapeia apenas `spec-triage`, `spec-close-and-version`, `spec-audit`, `plan-spec-materialize` e `plan-spec-version-and-push` como `SpecFlowStage`.
  - `src/core/runner.ts` restringe `runSpecStage(...)` aos stages `spec-triage`, `spec-close-and-version` e `spec-audit`.
  - `src/integrations/codex-client.ts` tem suporte a `exec/resume` stateful para `/plan_spec`, `/discover_spec` e `/codex_chat`, mas nao para uma etapa de validacao de `/run_specs`.
  - `src/types/flow-timing.ts` nao carrega veredito, confianca, gaps por taxonomia ou ciclos de autocorrecao.
  - `docs/workflows/codex-quality-gates.md` define o checklist e a taxonomia de causa-raiz para auditorias, mas isso ainda nao foi materializado como contrato executavel do novo gate.
- Comparativo antes/depois (se houver): antes = validacao inexistente; depois esperado = validacao estruturada, reusavel e testada

## Impact assessment
- Impacto funcional: sem esse contrato, o gate pode ser facilmente burlado, subjetivo ou incapaz de justificar `GO`/`NO_GO`.
- Impacto operacional: faltam rastreabilidade, reprodutibilidade e criterio uniforme para corrigir ou bloquear uma rodada.
- Risco de regressao: alto, porque envolve parsing, persistencia de contexto e politicas de stop/retry.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/codex-client.ts`, `src/core/runner.ts`, novos prompts/parsers/tipos, testes de `runner` e `codex-client`

## Initial hypotheses (optional)
- A infraestrutura de `exec/resume` existente para chats stateful pode ser reaproveitada, mas hoje nao esta acoplada a um contrato parseavel do gate de validacao.

## Proposed solution (optional)
Criar um contrato estruturado de validacao para `/run_specs`, com prompt/parse dedicado, taxonomia fixa, persistencia de contexto intra-etapa e criterio objetivo de stop/revalidate.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-02, RF-03; CA-04, CA-05
- Evidencia observavel: testes automatizados demonstram que o primeiro passe de `spec-ticket-validation` inicia sem herdar `thread_id`/contexto de `spec-triage`, enquanto revalidacoes do mesmo gate reutilizam o contexto da propria validacao.
- Requisito/RF/CA coberto: RF-08, RF-09, RF-11; CA-06
- Evidencia observavel: o resultado parseado do gate registra somente gaps dentro da taxonomia aprovada (`coverage-gap`, `scope-justification-gap`, `granularity-gap`, `duplication-gap`, `closure-criteria-gap`, `spec-inheritance-gap`, `documentation-compliance-gap`), com evidencias objetivas, causa-raiz provavel, correcoes aplicadas e confianca final.
- Requisito/RF/CA coberto: RF-12, RF-13, RF-14; CA-07, CA-08, CA-09
- Evidencia observavel: testes cobrem autocorrecao automatica seguida de revalidacao, limite maximo de 2 ciclos completos e bloqueio por ausencia de reducao real dos gaps ou por confianca insuficiente para `GO`.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - nao existe ainda um contrato stateful e auditavel para validar o pacote derivado de tickets.
- 2026-03-19 - ExecPlan validado com resultado `GO`; contrato entregue com evidencias objetivas em testes focados, `npm test`, `npm run check` e `npm run build`.

## Closure
- Closed at (UTC): 2026-03-19 16:23Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-02`, `RF-03`; `CA-04`, `CA-05`: `src/integrations/codex-client.test.ts` cobre exec inicial sem `resume`, sem reaproveitar `triageThreadId`, e revalidacao com `resume` no mesmo `thread_id`; `npx tsx --test src/integrations/spec-ticket-validation-parser.test.ts src/integrations/codex-client.test.ts src/core/spec-ticket-validation.test.ts` -> pass (`44/44`).
  - `RF-08`, `RF-09`, `RF-11`; `CA-06`: `src/integrations/spec-ticket-validation-parser.test.ts` e `src/integrations/codex-client.test.ts` validam taxonomia fechada de gaps, `probableRootCause`, `confidence`, evidencias obrigatorias e falha deterministica para payload invalido; `npx tsx --test src/integrations/spec-ticket-validation-parser.test.ts src/integrations/codex-client.test.ts src/core/spec-ticket-validation.test.ts` -> pass (`44/44`).
  - `RF-12`, `RF-13`, `RF-14`; `CA-07`, `CA-08`, `CA-09`: `src/core/spec-ticket-validation.test.ts` cobre `NO_GO -> autocorrecao -> GO`, limite de 2 ciclos completos, bloqueio por falta de reducao real e `GO` com confianca insuficiente normalizado para `NO_GO`; `npx tsx --test src/integrations/spec-ticket-validation-parser.test.ts src/integrations/codex-client.test.ts src/core/spec-ticket-validation.test.ts` -> pass (`44/44`).
- Evidencia objetiva de regressao e consistencia:
  - `npm test` -> pass (`353/353`).
  - `npm run check` -> pass.
  - `npm run build` -> pass.
- Entrega tecnica concluida:
  - contrato tipado de `spec-ticket-validation` implementado em `src/types/spec-ticket-validation.ts`;
  - parser estruturado e prompt dedicado implementados em `src/integrations/spec-ticket-validation-parser.ts` e `prompts/09-validar-tickets-derivados-da-spec.md`;
  - sessao stateful isolada de `spec-triage` implementada em `src/integrations/codex-client.ts`;
  - motor de `autocorrecao -> revalidacao` com limite de 2 ciclos completos implementado em `src/core/spec-ticket-validation.ts`.
- Validacao manual externa pendente: nao.
