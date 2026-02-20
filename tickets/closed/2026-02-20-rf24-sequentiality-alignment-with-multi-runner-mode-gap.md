# [TICKET] RF-24 da spec de clique precisa alinhamento explicito com modo multi-runner atual

## Metadata
- Status: closed
- Priority: P2
- Severity: S3
- Created at (UTC): 2026-02-20 22:19Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md
  - docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md
  - SPECS.md

## Context
- Workflow area: requisitos de produto (spec) vs comportamento atual do runner multi-projeto.
- Scenario: RF-24 exige "sem paralelizacao de execucoes", enquanto arquitetura recente permite runners paralelos por projeto.
- Input constraints: preservar rastreabilidade e evitar regressao de capacidades entregues no modo multi-runner.

## Problem statement
Existe divergencia entre a redacao do RF-24 da spec de UX por clique e o comportamento atual oficialmente entregue para multi-runner. Sem alinhamento explicito, implementacoes futuras podem aplicar bloqueios incorretos ou gerar leituras conflitantes de aceite.

## Observed behavior
- O que foi observado:
  - A spec alvo define no RF-24: "sem paralelizacao de execucoes".
  - O runner atual mantem capacidade global com multiplos slots e execucao paralela por projeto (sequencial apenas dentro de cada projeto).
  - Testes e `/status` ja validam coexistencia de multiplos slots ativos.
- Frequencia (unico, recorrente, intermitente): recorrente (divergencia documental)
- Como foi detectado (warning/log/test/assert): revisao de spec + core do runner + testes

## Expected behavior
A spec de UX por clique deve deixar explicito se o requisito de sequencialidade e global ou por projeto, alinhando-se ao contrato multi-runner vigente para evitar ambiguidade.

## Reproduction steps
1. Ler RF-24 na spec alvo.
2. Ler spec de multi-runner e comportamento de slots ativos no runner.
3. Comparar e identificar conflito de interpretacao sobre paralelizacao.

## Evidence
- `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md:59`
- `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md:24`
- `src/core/runner.ts:2000`
- `src/core/runner.ts:2177`
- `src/integrations/telegram-bot.test.ts:2284`

## Impact assessment
- Impacto funcional: baixo no curto prazo (documental), mas com risco de implementacao inconsistente.
- Impacto operacional: baixo-medio, pois cria ambiguidade de regra para triagem e aceite.
- Risco de regressao: baixo, focado em alinhamento de requisito/escopo.
- Scope estimado (quais fluxos podem ser afetados): definicao de gates de concorrencia em callbacks e criterio de validacao de aceite da spec.

## Initial hypotheses (optional)
- RF-24 herdou redacao de contexto sequencial anterior ao modo multi-runner ou sem detalhar "por projeto".

## Proposed solution (optional)
Nao obrigatorio. Definir em ExecPlan/documentacao.

## Closure criteria
- Decisao registrada sobre semantica de sequencialidade para esta spec: global ou por projeto.
- RF-24 e CAs associados revisados para remover ambiguidade.
- Rastreabilidade adicionada entre spec alvo e spec de multi-runner.

## Decision log
- 2026-02-20 - Gap aberto para alinhar requisito funcional e evitar conflito com comportamento multi-runner ja entregue.
- 2026-02-20 - Criterios do ExecPlan validados com resultado GO; RF-24 e CA-10 alinhados para semantica por projeto e testes alvo aprovados.

## Closure
- Closed at (UTC): 2026-02-20 23:22Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - PR: N/A
  - Commit: registrado no historico Git deste fechamento
  - ExecPlan: execplans/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
