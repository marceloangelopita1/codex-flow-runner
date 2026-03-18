# [TICKET] Protocolo de entrevista profunda e gate final de /discover_spec ainda nao existem

## Metadata
- Status: open
- Priority: P1
- Severity: S1
- Created at (UTC): 2026-03-18 18:59Z
- Reporter: codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Source spec (when applicable): docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md
- Source requirements (RFs/CAs, when applicable): RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-22 (cobertura de categorias); CA-04, CA-05, CA-06, CA-07, CA-08, CA-14 (cobertura de categorias)
- Inherited assumptions/defaults (when applicable): o fluxo profundo existe para demandas ambiguas ou de maior risco; ele nao precisa provar ausencia absoluta de ambiguidade, mas precisa tratar ou explicitar toda ambiguidade critica; `/plan_spec` deve continuar leve e separado desse protocolo.
- Workflow root cause (when applicable):
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md
  - docs/workflows/codex-quality-gates.md
  - SPECS.md
  - INTERNAL_TICKETS.md

## Context
- Workflow area: `src/integrations/codex-client.ts`, `src/integrations/plan-spec-parser.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`
- Scenario: a spec aprovada pede entrevista profunda estruturada, com cobertura explicita das categorias obrigatorias, follow-up de ambiguidades criticas, assumptions/defaults e decisoes/trade-offs explicitados antes de liberar `Criar spec`.
- Input constraints: nao transformar `/plan_spec` no fluxo pesado por padrao e nao depender de inferencia silenciosa do modelo.

## Problem statement
O contrato interativo atual de `/plan_spec` entrega um bloco final util para materializacao de spec, mas nao implementa o comportamento distintivo pedido para `/discover_spec`: cobertura explicita das categorias obrigatorias, marcacao `nao aplicavel`, rastreio de ambiguidade critica, assumptions/defaults aprovados, decisoes/trade-offs aprovados e gate de finalizacao baseado nesses estados.

## Observed behavior
- O que foi observado:
  - O `PLAN_SPEC_PROTOCOL_PRIMER` define apenas pergunta parseavel e bloco final com titulo, resumo, objetivo, atores, jornada, RFs, CAs, nao-escopo, restricoes, validacoes e riscos; nao ha secoes para assumptions/defaults, decisoes/trade-offs, dependencias explicitas, marcacao `nao aplicavel` nem regra de cobertura por categoria (`src/integrations/codex-client.ts:230`).
  - O parser conhece somente os campos atuais do bloco final e nao possui estrutura para assumptions/defaults, decisoes/trade-offs ou status de cobertura por categoria (`src/integrations/plan-spec-parser.ts:137`, `src/integrations/plan-spec-parser.ts:601`, `src/integrations/plan-spec-parser.ts:660`).
  - O runner armazena no bloco final apenas objetivo, atores, jornada, RFs, CAs, nao-escopo, restricoes, validacoes e riscos (`src/core/runner.ts:2534`).
  - O gate de `Criar spec` valida somente a presenca de objetivo, atores, jornada, RFs, CAs e nao-escopo; nao existe nocao de ambiguidade critica residual, categoria pendente ou assumption/default obrigatorio antes da finalizacao (`src/core/runner.ts:1396`, `src/core/runner.ts:4785`).
  - A acao `Refinar` apenas envia um texto generico de continuidade e nao opera sobre um estado tipado de categorias pendentes ou ambiguidades abertas (`src/core/runner.ts:1346`).
  - O resumo final enviado ao Telegram nao renderiza assumptions/defaults nem decisoes/trade-offs (`src/integrations/telegram-bot.ts:3674`).
  - O status da sessao mostra fase, projeto e timestamps, mas nao informa quais categorias obrigatorias estao cobertas ou pendentes (`src/integrations/telegram-bot.ts:5523`, `src/integrations/telegram-bot.ts:5887`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de protocolo, parser, runner e renderizacao Telegram.

## Expected behavior
O fluxo `/discover_spec` deve conduzir entrevista profunda com categorias obrigatorias observaveis, registrar cada uma como coberta ou `nao aplicavel`, insistir em follow-up quando houver ambiguidade critica, converter indefinicoes aceitaveis em assumption/default ou nao-escopo declarado, enriquecer o bloco final com assumptions/defaults e decisoes/trade-offs, exibir esse estado no status e bloquear `Criar spec` enquanto restarem lacunas criticas.

## Reproduction steps
1. Abrir `src/integrations/codex-client.ts` e ler o `PLAN_SPEC_PROTOCOL_PRIMER`.
2. Abrir `src/integrations/plan-spec-parser.ts` e verificar os campos aceitos no bloco final parseavel.
3. Abrir `src/core/runner.ts` e inspecionar o gate de `handlePlanSpecCreateSpecSelection` e `validatePlanSpecFinalBlockForMaterialization`.
4. Abrir `src/integrations/telegram-bot.ts` e verificar o resumo final e o status renderizados hoje.

## Evidence
- `src/integrations/codex-client.ts:230`
- `src/integrations/plan-spec-parser.ts:137`
- `src/integrations/plan-spec-parser.ts:601`
- `src/integrations/plan-spec-parser.ts:660`
- `src/core/runner.ts:1346`
- `src/core/runner.ts:1396`
- `src/core/runner.ts:2534`
- `src/core/runner.ts:4785`
- `src/integrations/telegram-bot.ts:3674`
- `src/integrations/telegram-bot.ts:5523`
- `src/integrations/telegram-bot.ts:5887`

## Impact assessment
- Impacto funcional: alto, sem esse contrato o novo comando seria apenas uma variacao nominal de `/plan_spec`, sem entregar a entrevista profunda prometida.
- Impacto operacional: alto, o operador continua dependente de inferencia silenciosa e pode aprovar specs com ambiguidades criticas nao tratadas.
- Risco de regressao: medio-alto, altera protocolo, parser, estado da sessao, UX de status e criterios de liberacao da finalizacao.
- Scope estimado (quais fluxos podem ser afetados): `codex-client`, `plan-spec-parser`, `runner`, renderizacao Telegram e testes de parser/session.

## Initial hypotheses (optional)
- O fluxo atual foi otimizado para refinamento rapido e nao para uma entrevista guiada com checklist de cobertura e gate semantico de ambiguidade.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- RF-10, RF-11 e RF-15; CA-04 e CA-06: o protocolo e o parser aceitam e renderizam categorias obrigatorias, assumptions/defaults e decisoes/trade-offs, com cobertura explicita ou `nao aplicavel`.
- RF-12, RF-13 e RF-14; CA-05 e CA-07: o runner rastreia ambiguidades criticas/categorias pendentes, emite follow-up quando necessario e rejeita `Criar spec` ate que tudo esteja tratado ou explicitado.
- RF-16; CA-08: `Refinar` retorna ao ciclo de entrevista sem criar arquivos e sem perder o contexto da sessao.
- RF-22; CA-14: o status da sessao mostra quais categorias obrigatorias ja estao cobertas e quais ainda faltam.
- Cobertura automatizada: testes de parser, runner e Telegram validam a matriz CA-04, CA-05, CA-06, CA-07, CA-08 e a parte de cobertura de categorias em CA-14.

## Decision log
- 2026-03-18 - Gap aberto a partir da revisao da spec `2026-03-18-discover-spec-entrevista-profunda-de-alinhamento`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
