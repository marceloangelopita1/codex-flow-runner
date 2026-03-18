# [TICKET] Materializacao e rastreabilidade do /discover_spec nao preservam os campos enriquecidos da entrevista

## Metadata
- Status: closed
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

## Closure validation
- Resultado final da validacao: `GO`. A entrega tecnica/funcional deste ticket foi concluida no working tree atual; resta apenas validacao manual operacional externa em ambiente real, sem gap local que justifique `NO_GO`.
- `RF-17, RF-18, RF-19; CA-10, CA-11` - atendido. Evidencias: `/discover_spec` agora valida o bloco final e reutiliza `executeCreateSpecFromFinalBlock` com `sourceCommand: "/discover_spec"` em `src/core/runner.ts:1825`, `src/core/runner.ts:1834`, `src/core/runner.ts:1998`, `src/core/runner.ts:2121`; o teste end-to-end valida `docs/specs/YYYY-MM-DD-<slug>.md`, `Status: approved` e `Spec treatment: pending` em `src/core/runner.test.ts:3431`.
- `RF-20; CA-12` - atendido. Evidencias: o prompt de materializacao passou a exigir `Assumptions and defaults`, `Decisoes e trade-offs` e `validacoes obrigatorias` em `prompts/06-materializar-spec-planejada.md:11`, `prompts/06-materializar-spec-planejada.md:50`, `prompts/06-materializar-spec-planejada.md:76`; o builder injeta esses campos em `src/integrations/codex-client.ts:956`, `src/integrations/codex-client.ts:988`, `src/integrations/codex-client.ts:1021`; o teste do prompt cobre placeholders e ausencia de sobras em `src/integrations/codex-client.test.ts:407`; o teste do runner valida as secoes materializadas na spec em `src/core/runner.test.ts:3431`.
- `RF-21; CA-13` - atendido. Evidencias: `spec_planning/requests`, `responses` e `decisions` passaram a persistir `sourceCommand`, assumptions/defaults, trade-offs, category coverage e ambiguidades em `src/integrations/spec-planning-trace-store.ts:14`, `src/integrations/spec-planning-trace-store.ts:75`, `src/integrations/spec-planning-trace-store.ts:104`, `src/integrations/spec-planning-trace-store.ts:153`; testes cobrem os tres artefatos em `src/integrations/spec-planning-trace-store.test.ts:46` e no fluxo end-to-end em `src/core/runner.test.ts:3431`.
- `CA-20` - atendido. Evidencias: o prompt de versionamento continua restringindo o escopo a `<SPEC_PATH>`, `<TRACE_REQUEST_PATH>`, `<TRACE_RESPONSE_PATH>` e `<TRACE_DECISION_PATH>` em `prompts/07-versionar-spec-planejada-commit-push.md:19`; o teste confirma o mesmo contrato no novo fluxo em `src/integrations/codex-client.test.ts:496`.
- Cobertura automatizada exigida pelo ticket - atendida. Evidencias: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts` passou verde em 2026-03-18 21:10Z; a auditoria de rastreabilidade foi reexecutada com `rg -n "RF-17|RF-18|RF-19|RF-20|RF-21|CA-10|CA-11|CA-12|CA-13|CA-20|discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap" docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/spec-planning-trace-store.test.ts`.
- Validacao manual pendente: a entrega tecnica foi concluida, mas ainda e necessario exercitar o fluxo real com Telegram, Codex CLI autenticado e git remoto disponivel para confirmar a integracao ponta a ponta. Como executar: iniciar `/discover_spec`, conduzir a entrevista ate o bloco final, acionar `Criar spec`, verificar a spec gerada e os artefatos `spec_planning/*`, e deixar o runner executar o changeset/push dedicado fora desta etapa. Responsavel operacional: mantenedor/operador humano do runner com acesso ao ambiente real.

## Decision log
- 2026-03-18 - Gap aberto a partir da revisao da spec `2026-03-18-discover-spec-entrevista-profunda-de-alinhamento`.
- 2026-03-18 - Fechamento validado como `GO` apos releitura do diff, ticket, ExecPlan, spec de origem, `docs/workflows/codex-quality-gates.md`, `rg` de rastreabilidade e rerun da matriz de testes.

## Closure
- Closed at (UTC): 2026-03-18 21:10Z
- Closure reason: fixed
- Related PR/commit/execplan: `execplans/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`; commit pertencente ao mesmo changeset de fechamento que sera versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
