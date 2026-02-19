# [TICKET] Materializacao da spec planejada e versionamento dedicado inexistentes

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-19 21:13Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-plan-spec-conversation.md
  - ExecPlan: execplans/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md

## Context
- Workflow area: `prompts/`, `src/integrations/codex-client.ts`, `docs/specs/templates/spec-template.md`
- Scenario: ao escolher `Criar spec` no fluxo de planejamento, o runner deve materializar a spec, versionar com commit/push dedicado e persistir trilha `spec_planning/*`.
- Input constraints: escopo de commit controlado, sem incluir arquivos fora do fluxo.

## Problem statement
Nao existem prompts/etapas dedicadas para criar a spec a partir da conversa e fechar com commit `feat(spec): add <arquivo>.md`. A integracao atual de spec trata apenas triagem (`spec-triage` + `spec-close-and-version`) e usa mensagem de commit diferente. Tambem nao ha persistencia da trilha `spec_planning/requests|responses|decisions`.

## Observed behavior
- O que foi observado:
  - O mapeamento de etapas de spec contempla apenas `spec-triage` e `spec-close-and-version` (`src/integrations/codex-client.ts:63`).
  - A mensagem de commit de spec atual e `chore(specs): triage <arquivo>` (`src/integrations/codex-client.ts:287`), diferente de `feat(spec): add <arquivo>.md`.
  - O prompt de fechamento de spec instrui `git add` de arquivos alterados sem escopo restrito ao artefato esperado (`prompts/05-encerrar-tratamento-spec-commit-push.md:28`).
  - O template padrao de spec inicia com `Status: draft` (nao `approved`), embora tenha `Spec treatment: pending` (`docs/specs/templates/spec-template.md:5`, `docs/specs/templates/spec-template.md:6`).
  - Nao ha referencias a `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/` no codigo (`src/`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de prompts, client Codex e template de spec.

## Expected behavior
Ao confirmar `Criar spec`, o runner deve executar prompt dedicado fora do modo `/plan`, gerar arquivo `docs/specs/YYYY-MM-DD-<slug>.md` com metadata inicial (`Status: approved`, `Spec treatment: pending`), persistir trilha de rastreabilidade do planejamento e finalizar com commit/push dedicado e escopo de arquivos restrito.

## Reproduction steps
1. Revisar `src/integrations/codex-client.ts` e confirmar ausencia de etapas/prompts dedicados a criacao de spec planejada.
2. Revisar `prompts/` e confirmar inexistencia de prompt para `Criar spec` do fluxo `/plan_spec`.
3. Revisar template de spec e confirmar `Status: draft` como baseline.
4. Buscar `spec_planning` em `src/` e confirmar ausencia de persistencia de trilha.

## Evidence
- `src/integrations/codex-client.ts:63`
- `src/integrations/codex-client.ts:250`
- `src/integrations/codex-client.ts:287`
- `prompts/05-encerrar-tratamento-spec-commit-push.md:28`
- `docs/specs/templates/spec-template.md:5`
- `docs/specs/templates/spec-template.md:6`
- `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`

## Impact assessment
- Impacto funcional: medio-alto, sem `Criar spec` nao ha entrega final da jornada planejada.
- Impacto operacional: medio, risco de commit com escopo indevido e perda de rastreabilidade.
- Risco de regressao: medio, envolve prompts, versionamento e contratos de naming/metadata.
- Scope estimado (quais fluxos podem ser afetados): integracao de prompts, criacao de arquivo de spec, commit/push e trilha documental.

## Initial hypotheses (optional)
- O pipeline atual de specs foi construindo para triagem de specs existentes, nao para criacao de novas specs conversacionais.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- Implementar etapa/prompt dedicado para materializar spec apos decisao `Criar spec`, fora do modo `/plan`.
- Garantir naming `docs/specs/YYYY-MM-DD-<slug>.md` derivado do titulo final aprovado.
- Garantir metadata inicial da spec criada com `Status: approved` e `Spec treatment: pending`.
- Implementar etapa/prompt dedicado de commit/push com mensagem exata `feat(spec): add <arquivo>.md`.
- Restringir escopo de `git add`/commit ao artefato de spec criado e trilha do fluxo (`spec_planning/*`).
- Persistir rastreabilidade da sessao em `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/`.
- Cobrir CAs: CA-11, CA-12, CA-13, CA-14, CA-15, CA-16.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gaps da spec `telegram-plan-spec-conversation`.
- 2026-02-19 - Implementacao validada com `npx tsx --test src/integrations/codex-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`.

## Closure
- Closed at (UTC): 2026-02-19 22:18Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md (commit deste fechamento; PR N/A)
