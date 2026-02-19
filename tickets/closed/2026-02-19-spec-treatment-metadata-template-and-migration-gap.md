# [TICKET] Baseline de metadata Spec treatment nao esta padronizada em todas as specs

## Metadata
- Status: closed
- Priority: P2
- Severity: S3
- Created at (UTC): 2026-02-19 19:39Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-approved-spec-triage-run-specs.md
  - docs/specs/templates/spec-template.md
  - SPECS.md
  - ExecPlan: execplans/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md

## Context
- Workflow area: `docs/specs/`, `docs/specs/templates/spec-template.md`, governanca de specs.
- Scenario: nova regra da spec exige `Spec treatment: pending | done` em toda spec para elegibilidade rastreavel.
- Input constraints: preservar historico e status de cada spec sem alterar semantica de aprovacao/atendimento.

## Problem statement
A regra de metadata `Spec treatment` ainda nao foi aplicada no baseline de specs e no template oficial. Isso deixa a classificacao de elegibilidade dependente de excecoes e pode gerar retriagem acidental.

## Observed behavior
- O que foi observado:
  - Somente a spec alvo possui `Spec treatment` no metadata (`docs/specs/2026-02-19-approved-spec-triage-run-specs.md:6`).
  - Outras specs em `docs/specs/` nao trazem o campo `Spec treatment` no cabecalho de metadata.
  - O template oficial de spec nao inclui `Spec treatment` (`docs/specs/templates/spec-template.md:3`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao de documentos e template em `docs/specs/`.

## Expected behavior
Todas as specs devem declarar `Spec treatment: pending | done` de forma explicita e o template oficial deve passar a exigir esse campo para novas specs.

## Reproduction steps
1. Comparar o metadata da spec alvo com as demais specs em `docs/specs/`.
2. Revisar `docs/specs/templates/spec-template.md`.
3. Confirmar ausencia de instrucao operacional especifica para migracao de baseline.

## Evidence
- `docs/specs/2026-02-19-approved-spec-triage-run-specs.md:6`
- `docs/specs/2026-02-19-telegram-access-and-control-plane.md:4`
- `docs/specs/2026-02-19-telegram-run-status-notification.md:4`
- `docs/specs/2026-02-19-telegram-multi-project-active-selection.md:4`
- `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md:4`
- `docs/specs/templates/spec-template.md:3`

## Impact assessment
- Impacto funcional: baixo-medio, mas afeta determinismo da triagem automatica por metadata.
- Impacto operacional: medio, risco de inconsistencias ao listar specs elegiveis.
- Risco de regressao: baixo, majoritariamente documental com possivel apoio de validacao simples.
- Scope estimado (quais fluxos podem ser afetados): criacao/manutencao de specs, parser de elegibilidade e governanca de backlog de specs.

## Initial hypotheses (optional)
- A regra `Spec treatment` foi introduzida por spec nova, mas ainda sem migracao do acervo existente.

## Proposed solution (optional)
Nao obrigatorio. Entrega detalhada deve ser formalizada em ExecPlan.

## Closure criteria
- Atualizar `docs/specs/templates/spec-template.md` para incluir `Spec treatment`.
- Migrar specs existentes em `docs/specs/` para conter `Spec treatment: pending | done`.
- Atualizar orientacoes em `SPECS.md` para refletir a obrigatoriedade desse metadata.
- Validar consistencia final dos arquivos de spec sem quebrar rastreabilidade existente.

## Decision log
- 2026-02-19 - Ticket aberto para padronizar metadata de tratamento de specs no baseline documental.

## Closure
- Closed at (UTC): 2026-02-19 20:21Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md (commit deste fechamento; PR N/A)
