# [TICKET] Fundacao de multi-projeto: PROJECTS_ROOT_PATH, descoberta e projeto ativo persistido

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 17:28Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-multi-project-active-selection.md
  - ExecPlan: A definir

## Context
- Workflow area: `src/config/env.ts`, `src/main.ts`, bootstrap de integracoes e descoberta de repositorios
- Scenario: instancia unica do runner precisa operar sobre um projeto ativo global selecionado a partir de `/home/mapita/projetos`
- Input constraints: manter fluxo sequencial, sem fallback para `REPO_PATH`, sem dados sensiveis em estado persistido

## Problem statement
A base de configuracao e bootstrap ainda assume um unico repositorio fixo (`REPO_PATH`) e nao possui mecanismo para descobrir projetos validos, definir projeto ativo global e persistir/restaurar essa selecao entre reinicios. Isso bloqueia os RFs estruturais da spec multi-projeto.

## Observed behavior
- O que foi observado:
  - `src/config/env.ts:6` define `REPO_PATH` opcional com default em `process.cwd()`, e nao exige `PROJECTS_ROOT_PATH`.
  - `src/main.ts:17`, `src/main.ts:18` e `src/main.ts:19` instanciam fila, cliente Codex e git com um unico caminho fixo (`env.REPO_PATH`).
  - Nao existe camada dedicada para descoberta de projetos validos por criterio (`.git` + `tickets/open`) nem para persistencia/restauracao de projeto ativo.
  - `README.md:35` documenta apenas `REPO_PATH` como variavel de repositorio.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica do codigo e comparacao direta com RF-01..RF-06/RF-13 da spec

## Expected behavior
O bootstrap deve exigir `PROJECTS_ROOT_PATH`, descobrir projetos validos no primeiro nivel, definir exatamente um projeto ativo global e persisti-lo para restauracao no restart (com fallback alfabetico quando estado salvo estiver invalido), incluindo `codex-flow-runner` quando elegivel.

## Reproduction steps
1. Ler `src/config/env.ts` e verificar ausencia de `PROJECTS_ROOT_PATH` obrigatorio.
2. Ler `src/main.ts` e verificar wiring unico por `env.REPO_PATH`.
3. Confirmar ausencia de modulo/estado de descoberta e persistencia de projeto ativo no `src/`.

## Evidence
- `src/config/env.ts:3`
- `src/config/env.ts:6`
- `src/main.ts:17`
- `src/main.ts:18`
- `src/main.ts:19`
- `README.md:35`
- `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`

## Impact assessment
- Impacto funcional: alto, multi-projeto nao pode ser habilitado sem fundacao de configuracao/descoberta/estado ativo.
- Impacto operacional: alto, risco de executar no repositorio errado por depender de path fixo/manual.
- Risco de regressao: medio, muda contrato de ambiente e bootstrap.
- Scope estimado (quais fluxos podem ser afetados): carregamento de ambiente, bootstrap, fila de tickets, integracao Codex/git, documentacao operacional e testes de inicializacao.

## Initial hypotheses (optional)
- Evolucoes anteriores foram orientadas para repositorio unico; falta uma camada explicita de "project context" no bootstrap.

## Proposed solution (optional)
- Introduzir `PROJECTS_ROOT_PATH` obrigatorio e remover `REPO_PATH`.
- Criar integracao de descoberta/elegibilidade de projetos no primeiro nivel.
- Criar armazenamento simples para projeto ativo global (arquivo local) com restauracao/fallback.

## Closure criteria
- RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 e RF-13 implementados com cobertura automatizada.
- CA-01 e CA-06 validados por testes.
- README e spec atualizados com o novo contrato de ambiente e bootstrap multi-projeto.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec `telegram-multi-project-active-selection`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
