# [TICKET] Observabilidade de callbacks e taxonomia de bloqueios estao incompletas em /specs e /plan_spec

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-20 22:19Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md
  - execplans/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md
  - SPECS.md
  - INTERNAL_TICKETS.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/core/runner.ts`
- Scenario: callbacks precisam ser auditaveis por tentativa, validacao e decisao final, com causa de bloqueio distinguivel.
- Input constraints: manter logging legivel e sem exposicao de dados sensiveis.

## Problem statement
A camada atual registra parte das tentativas de callback, mas nao fecha trilha completa de validacoes + decisao final com causa padronizada para todos os caminhos esperados da spec (acesso negado, concorrencia, stale, inelegibilidade). O rastreio tambem nao inclui consistentemente identificadores de usuario/acao/sessao para diagnostico operacional.

## Observed behavior
- O que foi observado:
  - Existe log de chegada de callback (`callbackData`, `chatId`), mas nao ha log estruturado e consistente de decisao final para cada retorno `accepted/ignored`.
  - Em `/plan_spec`, bloqueios como `inactive` e `invalid` retornam ao usuario sem registrar motivo detalhado no logger.
  - A interface de callback atual nao carrega `from.id` (usuario) no contrato interno, limitando rastreio por operador.
  - Em `/specs`, como nao ha callback implementado ainda, tambem nao ha taxonomia pronta de bloqueios para inelegibilidade/stale/concorrencia.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de logs/handlers e cobertura de testes

## Expected behavior
Callbacks de `/specs` e `/plan_spec` devem registrar tentativa + validacoes + decisao com motivo de bloqueio padronizado, incluindo identificadores operacionais essenciais (chat, usuario, acao, alvo spec/sessao e timestamp).

## Reproduction steps
1. Acionar callbacks validos e invalidos em `/plan_spec`.
2. Revisar pontos de log do controlador/runner.
3. Verificar ausencia de padrao unico de "validacoes aplicadas + decisao + motivo" em cada resposta de callback.

## Evidence
- `src/integrations/telegram-bot.ts:823`
- `src/integrations/telegram-bot.ts:838`
- `src/integrations/telegram-bot.ts:1460`
- `src/integrations/telegram-bot.ts:1481`
- `src/core/runner.ts:531`
- `src/core/runner.ts:546`
- `src/integrations/telegram-bot.test.ts:1984`
- `src/integrations/telegram-bot.test.ts:2101`

## Impact assessment
- Impacto funcional: medio, dificulta diagnosticar por que callbacks foram bloqueados ou aceitos.
- Impacto operacional: medio-alto para suporte e auditoria de operacao remota.
- Risco de regressao: medio, envolve padronizacao de mensagens/logs e ajustes de testes.
- Scope estimado (quais fluxos podem ser afetados): handlers de callback de `/specs` e `/plan_spec`, logger e asserts de testes.

## Initial hypotheses (optional)
- A instrumentacao atual foi desenhada para cobertura minima de auditoria de acesso, nao para rastreio detalhado de decisao por callback.

## Proposed solution (optional)
Nao obrigatorio. Definir em ExecPlan.

## Closure criteria
- Definir e aplicar taxonomia minima de bloqueios: `access-denied`, `concurrency`, `stale`, `ineligible`, `invalid-action`, `inactive-session`.
- Logar tentativa, validacoes e decisao final em callbacks de `/specs` e `/plan_spec`.
- Incluir identificadores essenciais no log: `chatId`, `userId` (quando disponivel), `callbackData`, `action`, `specFileName` ou `sessionId`, `result`.
- Garantir mensagens observaveis coerentes com a causa de bloqueio no toast/chat.
- Cobertura automatizada validando logs e diferenciacao de causas (CA-16 e RF-18..RF-20).

## Decision log
- 2026-02-20 - Gap separado por risco operacional e por atravessar ambos os fluxos (`/specs` e `/plan_spec`).
- 2026-02-20 - ExecPlan validado como `GO` com criterios de fechamento atendidos e validacoes verdes (`npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`, `npm test`, `npm run check`, `npm run build`).

## Closure
- Closed at (UTC): 2026-02-20 22:54Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md (commit: mesmo changeset de fechamento)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
