## Integração com codex-flow-runner

Este repositório está preparado para o workflow completo do `codex-flow-runner`.

O contrato operacional mínimo esperado pelo runner está versionado nestes artefatos:
- `AGENTS.md`
- `EXTERNAL_PROMPTS.md`
- `INTERNAL_TICKETS.md`
- `PLANS.md`
- `SPECS.md`
- `docs/specs/templates/spec-template.md`
- `docs/workflows/discover-spec.md`
- `docs/workflows/target-project-compatibility-contract.md`

Os artefatos canônicos do onboarding ficam em:
- `docs/workflows/target-prepare-manifest.json`
- `docs/workflows/target-prepare-report.md`

Quando este repositório passar a atender o critério de descoberta (`.git` + `tickets/open/`), ele poderá aparecer em `/projects` no runner sem trocar implicitamente o projeto ativo durante o `prepare`.
