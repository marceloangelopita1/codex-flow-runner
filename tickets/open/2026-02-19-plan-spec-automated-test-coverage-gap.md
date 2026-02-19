# [TICKET] Cobertura automatizada do fluxo /plan_spec inexistente

## Metadata
- Status: open
- Priority: P2
- Severity: S3
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
  - ExecPlan: a definir

## Context
- Workflow area: `src/integrations/*.test.ts`, `src/core/*.test.ts`
- Scenario: nova jornada `/plan_spec` exige validacao automatizada de comandos, estados, parsing, fallbacks, timeout e fechamento.
- Input constraints: manter testes deterministas, sem depender de chamada externa real do Codex/Telegram.

## Problem statement
Nao ha casos de teste cobrindo a jornada `/plan_spec` (comandos, sessao ativa, parser de perguntas/finalizacao, acao `Criar spec`, timeout e falhas interativas). Isso reduz confianca para evolucao segura do fluxo e dificulta validacao objetiva dos CAs da spec.

## Observed behavior
- O que foi observado:
  - Busca por `plan_spec`/`spec_planning`/`Criar spec` em testes nao retorna cobertura da jornada (`src/**/*.test.ts`).
  - Suites atuais cobrem `/run_all`, `/run_specs`, acesso Telegram e selecao de projeto, mas nao casos de planejamento conversacional (`src/integrations/telegram-bot.test.ts`, `src/core/runner.test.ts`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica da suite de testes e busca textual.

## Expected behavior
Deve existir cobertura automatizada para o fluxo `/plan_spec`, incluindo caminho feliz e falhas, com verificacao dos criterios de aceitacao funcionais da spec.

## Reproduction steps
1. Executar busca textual por `plan_spec` em `src/**/*.test.ts`.
2. Revisar suites existentes (`telegram-bot.test.ts`, `runner.test.ts`) e confirmar ausencia de casos da jornada de planejamento conversacional.

## Evidence
- `src/integrations/telegram-bot.test.ts:1`
- `src/core/runner.test.ts:1`
- `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`

## Impact assessment
- Impacto funcional: baixo direto, mas alto risco de regressao indireta.
- Impacto operacional: medio, dificulta manutencao e diagnostico de falhas da nova jornada.
- Risco de regressao: alto sem cobertura dedicada, devido a combinacao de estado, callbacks e I/O interativo.
- Scope estimado (quais fluxos podem ser afetados): comandos Telegram, maquina de estados da sessao, parser e fechamento de spec.

## Initial hypotheses (optional)
- Como o fluxo ainda nao foi implementado, a cobertura de testes tambem nao foi iniciada.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- Adicionar testes unitarios/integracao para:
  - comandos `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel`;
  - bloqueios de `/run_all`, `/run_specs` e troca de projeto durante sessao ativa;
  - parser de perguntas/finalizacao e respostas por clique/texto;
  - timeout de 30 min, cancelamento e erros interativos com orientacao de retry;
  - acao `Criar spec` com validacao de naming/metadata/commit message e escopo de commit.
- Cobrir explicitamente os CAs CA-01..CA-20 com rastreabilidade para asserts de teste.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gaps da spec `telegram-plan-spec-conversation`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
