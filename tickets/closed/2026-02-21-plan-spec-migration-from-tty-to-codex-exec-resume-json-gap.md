# [TICKET] /plan_spec ainda depende de TTY interativo; migrar para codex exec/resume --json deterministico

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-21 08:19Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional): N/A
- Parent execplan (optional): execplans/2026-02-21-plan-spec-migration-from-tty-to-codex-exec-resume-json-gap.md
- Parent commit (optional): N/A
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-plan-spec-conversation.md
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - execplans/2026-02-21-plan-spec-migration-from-tty-to-codex-exec-resume-json-gap.md

## Context
- Workflow area: `src/integrations/codex-client.ts`, `src/integrations/plan-spec-parser.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`
- Scenario: `/plan_spec` continua usando bridge interativa via pseudo-TTY, enquanto `/codex_chat` ja usa `codex exec resume --json` com parsing deterministico de `agent_message`.
- Input constraints: preservar UX/contratos atuais de `/plan_spec` (perguntas, bloco final, callbacks, timeout e guardrails) sem degradar fluxo sequencial.

## Problem statement
O backend de `/plan_spec` depende de TTY interativo e heuristicas de detecao de prompt/ruido, o que aumenta complexidade operacional e risco de saida nao deterministica. O projeto ja provou no `/codex_chat` que `codex exec` com `resume` e `--json` simplifica parsing e reduz vazamento de ruido/raciocinio.

## Observed behavior
- O que foi observado:
  - `startPlanSession` ainda inicia sessao interativa com pseudo-TTY (`script`) em vez de chamada `codex exec` por turno (`src/integrations/codex-client.ts:503`, `src/integrations/codex-client.ts:294`).
  - A sessao `CodexInteractivePlanSession` implementa bootstrap de `/plan`, detecao de prompt pronto, auto-resposta para trust prompt e fila de teclas (`src/integrations/codex-client.ts:653`).
  - O parser de `/plan_spec` contem filtros de ruido de UI/ANSI e tratamento de fragmentacao de chunks, sinalizando acoplamento ao modo terminal (`src/integrations/plan-spec-parser.ts:11`).
  - Em contraste, `/codex_chat` ja opera por `codex exec/resume --json`, com `thread_id` e extraindo somente `agent_message` (`src/integrations/codex-client.ts:526`, `src/integrations/codex-client.ts:1100`, `src/integrations/codex-client.ts:1258`).
- Frequencia (unico, recorrente, intermitente): recorrente (design atual).
- Como foi detectado (warning/log/test/assert): revisao estatica dos fluxos e comparativo entre backend de `/plan_spec` e `/codex_chat`.

## Expected behavior
`/plan_spec` deve migrar para backend nao-interativo por turno com `codex exec` + `resume` + `--json`, mantendo contexto por `thread_id` e extraindo conteudo do agente de forma deterministica, sem dependencia de pseudo-TTY.

## Reproduction steps
1. Revisar `startPlanSession` e confirmar que o fluxo atual abre processo interativo com `script`/TTY.
2. Revisar `CodexInteractivePlanSession` e mapear heuristicas de bootstrap/prompt/trust prompt.
3. Revisar `startFreeChatSession` + parser JSON do `/codex_chat` como baseline de migracao.

## Evidence
- `src/integrations/codex-client.ts:294`
- `src/integrations/codex-client.ts:503`
- `src/integrations/codex-client.ts:653`
- `src/integrations/plan-spec-parser.ts:11`
- `src/integrations/codex-client.ts:526`
- `src/integrations/codex-client.ts:1100`
- `src/integrations/codex-client.ts:1258`

## Impact assessment
- Impacto funcional: medio-alto (melhora previsibilidade da saida do `/plan_spec` e reduz risco de ruido no Telegram).
- Impacto operacional: medio (simplifica diagnostico e reduz dependencia de comportamento de terminal/pseudo-TTY).
- Risco de regressao: medio-alto (fluxo `/plan_spec` e sensivel por envolver parser de pergunta/final e callbacks).
- Scope estimado (quais fluxos podem ser afetados): `codex-client` (sessao plan_spec), parser de eventos plan_spec, runner (lifecycle da sessao), testes de integracao e status/observabilidade.

## Initial hypotheses (optional)
- A migracao pode reutilizar o padrao de sessao por turno ja aplicado em `/codex_chat`, preservando parser de blocos (`[[PLAN_SPEC_QUESTION]]` / `[[PLAN_SPEC_FINAL]]`) sobre o texto de `agent_message`.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- Criar ExecPlan dedicado antes da implementacao e registrar uma secao explicita de baseline da documentacao oficial do Codex CLI.
- O implementador deve ler e referenciar no ExecPlan (com links) a documentacao oficial de:
  - `codex exec`;
  - `codex exec resume`;
  - `--json` e formato/eventos de saida;
  - semantica de `thread_id` e encerramento de turno.
- Substituir o backend TTY de `/plan_spec` por backend baseado em `codex exec/resume --json`, sem usar `script`/pseudo-TTY no caminho principal.
- Garantir que a resposta util do `/plan_spec` venha de evento de agente (equivalente ao modelo aplicado em `/codex_chat`), evitando dependencia de ruido de terminal.
- Manter compatibilidade funcional de `/plan_spec`:
  - perguntas parseaveis;
  - bloco final parseavel;
  - callbacks e acoes finais existentes;
  - controle de fase/status no runner;
  - timeout e mensagens operacionais.
- Atualizar/expandir testes automatizados para cobrir:
  - sessao `/plan_spec` em modo exec/resume com persistencia de `thread_id`;
  - erro acionavel quando JSON nao trouxer evento/mensagem esperada;
  - ausencia de regressao nas suites de runner e telegram.
- Atualizar documentacao operacional afetada (README e/ou spec relacionada) removendo ou ajustando instrucoes exclusivas de TTY quando deixarem de ser necessarias.

## Decision log
- 2026-02-21 - Ticket aberto apos validacao da migracao deterministica de `/codex_chat` para `codex exec/resume --json` e identificacao de gap equivalente em `/plan_spec`.
- 2026-02-21 - ExecPlan validado como `GO` com criterios atendidos e validacoes verdes (`npm test`, `npm run check`, `npm run build`, checagens de ausencia de legado pseudo-TTY).

## Closure
- Closed at (UTC): 2026-02-21 08:35Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-21-plan-spec-migration-from-tty-to-codex-exec-resume-json-gap.md (commit: mesmo changeset de fechamento)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
