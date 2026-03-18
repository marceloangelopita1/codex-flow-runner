# [TICKET] Materializacao e rastreabilidade do /discover_spec nao preservam os campos enriquecidos da entrevista

## Metadata
- Status: open
- Priority: P2
- Severity: S2
- Created at (UTC): 2026-03-18 18:59Z
- Reporter: codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Source spec (when applicable): docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md
- Source requirements (RFs/CAs, when applicable): RF-17, RF-18, RF-19, RF-20, RF-21; CA-10, CA-11, CA-12, CA-13, CA-20
- Inherited assumptions/defaults (when applicable): o pipeline atual de materializacao/versionamento deve ser reutilizado; a spec criada continua nascendo com `Status: approved` e `Spec treatment: pending`; o diferencial de `/discover_spec` esta na riqueza do bloco final e na rastreabilidade explicita do modo de origem.
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
- Workflow area: `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/integrations/spec-planning-trace-store.ts`, `prompts/06-materializar-spec-planejada.md`, `prompts/07-versionar-spec-planejada-commit-push.md`
- Scenario: apos `Criar spec`, o fluxo `/discover_spec` deve reaproveitar a pipeline atual, mas materializar no documento final os novos campos da entrevista profunda e gravar na trilha `spec_planning/` que a sessao se originou de `/discover_spec`.
- Input constraints: manter o escopo de commit restrito aos artefatos esperados da spec e da trilha da sessao.

## Problem statement
A pipeline compartilhada de materializacao/versionamento e rastreabilidade ja existe para `/plan_spec`, mas ela so conhece o outline atual e nao carrega o enriquecimento exigido pela nova spec. Mesmo que o fluxo profundo seja implementado, a materializacao final perdera assumptions/defaults, decisoes/trade-offs e a identificacao explicita do modo `/discover_spec` na trilha `spec_planning/`.

## Observed behavior
- O que foi observado:
  - O `runner` envia para `traceStore.startSession` e para `runSpecStage("plan-spec-materialize")` apenas objetivo, atores, jornada, RFs, CAs, nao-escopo, restricoes, validacoes e riscos (`src/core/runner.ts:1424`, `src/core/runner.ts:1504`).
  - `SpecPlanningTraceSessionRequest` e o conteudo persistido em `spec_planning/requests` e `spec_planning/decisions` nao contem campo de origem `/discover_spec`, assumptions/defaults nem decisoes/trade-offs (`src/integrations/spec-planning-trace-store.ts:12`, `src/integrations/spec-planning-trace-store.ts:63`, `src/integrations/spec-planning-trace-store.ts:104`).
  - O `buildSpecPrompt` injeta placeholders somente para os campos atuais do outline; nao existem placeholders para assumptions/defaults, decisoes/trade-offs ou metadados de origem da sessao (`src/integrations/codex-client.ts:744`, `src/integrations/codex-client.ts:782`, `src/integrations/codex-client.ts:817`).
  - O prompt de materializacao pede preservar apenas objetivo, atores/jornada, RFs/CAs, nao-escopo, restricoes, validacoes manuais e riscos; nao pede materializar assumptions/defaults nem decisoes/trade-offs (`prompts/06-materializar-spec-planejada.md:11`, `prompts/06-materializar-spec-planejada.md:57`).
  - O prompt de versionamento ja restringe corretamente o escopo de arquivos a spec e trilha `spec_planning/*` da sessao, o que cobre apenas parte do requisito final (`prompts/07-versionar-spec-planejada-commit-push.md:19`, `prompts/07-versionar-spec-planejada-commit-push.md:27`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica da pipeline de materializacao/versionamento e da trilha `spec_planning`.

## Expected behavior
Ao escolher `Criar spec` em `/discover_spec`, o fluxo deve continuar reaproveitando a pipeline atual, mas passando e persistindo todo o bloco final enriquecido, materializando `Assumptions and defaults` e `Decisoes e trade-offs` no documento final, registrando na trilha `spec_planning/` que a sessao veio de `/discover_spec` e mantendo o versionamento restrito aos artefatos esperados.

## Reproduction steps
1. Abrir `src/core/runner.ts` e verificar quais campos sao enviados para `traceStore.startSession` e `runSpecStage("plan-spec-materialize")`.
2. Abrir `src/integrations/spec-planning-trace-store.ts` e verificar o schema persistido em `request` e `decision`.
3. Abrir `src/integrations/codex-client.ts` e verificar os placeholders preenchidos no prompt de materializacao.
4. Abrir `prompts/06-materializar-spec-planejada.md` e `prompts/07-versionar-spec-planejada-commit-push.md`.

## Evidence
- `src/core/runner.ts:1424`
- `src/core/runner.ts:1504`
- `src/integrations/spec-planning-trace-store.ts:12`
- `src/integrations/spec-planning-trace-store.ts:63`
- `src/integrations/spec-planning-trace-store.ts:104`
- `src/integrations/codex-client.ts:744`
- `src/integrations/codex-client.ts:782`
- `src/integrations/codex-client.ts:817`
- `prompts/06-materializar-spec-planejada.md:11`
- `prompts/06-materializar-spec-planejada.md:57`
- `prompts/07-versionar-spec-planejada-commit-push.md:19`
- `prompts/07-versionar-spec-planejada-commit-push.md:27`

## Impact assessment
- Impacto funcional: medio-alto, a spec final perderia justamente os campos que diferenciam a entrevista profunda do fluxo leve.
- Impacto operacional: medio, a rastreabilidade da origem `/discover_spec` ficaria invisivel e a auditoria posterior perderia contexto.
- Risco de regressao: medio, envolve contratos de prompt, trace store e compatibilidade do pipeline compartilhado.
- Scope estimado (quais fluxos podem ser afetados): materializacao/versionamento de spec, `spec_planning/*`, testes de `codex-client`, `runner` e `spec-planning-trace-store`.

## Initial hypotheses (optional)
- A pipeline de `Criar spec` foi desenhada para o bloco final atual de `/plan_spec` e ainda nao recebeu extensoes semanticas na trilha nem no prompt de materializacao.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- RF-17, RF-18 e RF-19; CA-10 e CA-11: `/discover_spec` reutiliza a pipeline compartilhada, continua criando `docs/specs/YYYY-MM-DD-<slug>.md` e mantem a metadata inicial `Status: approved` + `Spec treatment: pending`.
- RF-20; CA-12: o prompt de materializacao e o contrato de dados carregam assumptions/defaults, decisoes/trade-offs, validacoes pendentes e riscos para a spec final.
- RF-21; CA-13: a trilha `spec_planning/requests`, `responses` e `decisions` identifica explicitamente a origem `/discover_spec` e persiste o bloco final enriquecido.
- CA-20: o prompt de versionamento continua restringindo `git add`/commit aos artefatos esperados da spec e da trilha da sessao, com testes que verifiquem esse contrato tambem no novo fluxo.
- Cobertura automatizada: `codex-client`, `runner` e `spec-planning-trace-store` validam os novos placeholders/campos e a compatibilidade do pipeline compartilhado.

## Decision log
- 2026-03-18 - Gap aberto a partir da revisao da spec `2026-03-18-discover-spec-entrevista-profunda-de-alinhamento`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
