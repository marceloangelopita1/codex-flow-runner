# [TICKET] Superficie Telegram e ciclo de sessao de /discover_spec ainda nao existem

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-18 18:59Z
- Reporter: codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Source spec (when applicable): docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md
- Source requirements (RFs/CAs, when applicable): RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-23, RF-24, RF-25, RF-26, RF-27; CA-01, CA-03, CA-09, CA-15, CA-16, CA-17, CA-18, CA-19
- Inherited assumptions/defaults (when applicable): `/discover_spec` e o nome canonico inicial; o fluxo deve reutilizar a infraestrutura stateful atual; o fluxo continua sequencial; a entrevista profunda nao faz fallback automatico para backend alternativo.
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
- Workflow area: `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/types/state.ts`, `src/integrations/codex-client.ts`
- Scenario: a spec aprovada pede um novo fluxo `/discover_spec` com comandos dedicados, sessao global unica, binds ao projeto ativo, timeout, cancelamento, status, bloqueios operacionais e observabilidade equivalente a `/plan_spec`.
- Input constraints: manter fluxo sequencial, preservar `/plan_spec` como caminho leve e reutilizar o backend stateful atual sem duplicar arquitetura.

## Problem statement
O repositorio ja possui a infraestrutura base de sessao stateful para `/plan_spec`, mas nao existe nenhuma superficie Telegram nem nenhum estado dedicado para `/discover_spec`. Como consequencia, o operador nao consegue iniciar a jornada profunda, consultar status, cancelar a sessao nem receber bloqueios/coerencia operacional no nome e nos comandos definidos pela spec.

## Observed behavior
- O que foi observado:
  - O bot registra `/codex_chat`, `/plan_spec`, `/plan_spec_status` e `/plan_spec_cancel`, mas nao registra `/discover_spec`, `/discover_spec_status` ou `/discover_spec_cancel` (`src/integrations/telegram-bot.ts:1236`, `src/integrations/telegram-bot.ts:1244`, `src/integrations/telegram-bot.ts:1248`, `src/integrations/telegram-bot.ts:1252`).
  - O roteamento Telegram existente para planejamento cobre apenas `handlePlanSpecCommand`, `handlePlanSpecStatusCommand`, `handlePlanSpecCancelCommand` e texto livre da sessao `/plan_spec` (`src/integrations/telegram-bot.ts:1690`, `src/integrations/telegram-bot.ts:1713`, `src/integrations/telegram-bot.ts:1732`, `src/integrations/telegram-bot.ts:1751`).
  - O estado tipado do runner possui somente `planSpecSession` e `codexChatSession`; nao ha estrutura para sessao `/discover_spec` nem fases dedicadas (`src/types/state.ts:19`, `src/types/state.ts:28`, `src/types/state.ts:36`, `src/types/state.ts:64`, `src/types/state.ts:119`).
  - O lock global de texto livre reconhece apenas `/plan_spec` e `/codex_chat`, sem incluir `/discover_spec` (`src/core/runner.ts:1777`).
  - Troca de projeto por comando e callback e bloqueada apenas quando `state.planSpecSession` esta ativa, sem considerar uma futura sessao `/discover_spec` (`src/integrations/telegram-bot.ts:2631`, `src/integrations/telegram-bot.ts:2678`).
  - O runner ja sabe iniciar uma sessao `/plan_spec`, reservar slot do projeto ativo, snapshotar o projeto da sessao e aguardar o brief inicial, o que mostra a infraestrutura reutilizavel mas ainda nao exposta para `/discover_spec` (`src/core/runner.ts:761`, `src/core/runner.ts:816`, `src/core/runner.ts:878`, `src/core/runner.ts:893`, `src/core/runner.ts:929`).
  - O backend stateful atual usa `codex exec`/`codex exec resume` com `--json` e persiste contexto por `thread_id`, mas apenas atraves de `startPlanSession` (`src/integrations/codex-client.ts:223`, `src/integrations/codex-client.ts:679`, `src/integrations/codex-client.ts:955`, `src/integrations/codex-client.ts:999`, `src/integrations/codex-client.ts:1012`).
  - Timeout, heartbeat, cancelamento, falha acionavel e repasse de saida saneada existem para `/plan_spec`, nao para `/discover_spec` (`src/core/runner.ts:2377`, `src/core/runner.ts:2421`, `src/core/runner.ts:2471`, `src/core/runner.ts:2498`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica do runner, bot Telegram, tipos de estado e cliente Codex.

## Expected behavior
Deve existir um fluxo `/discover_spec` com comandos dedicados, sessao global unica por instancia, bind ao projeto ativo no momento do start, timeout de 30 minutos, cancelamento e status proprios, bloqueios explicitos para execucao/troca de projeto/texto livre concorrente, respeito a `TELEGRAM_ALLOWED_CHAT_ID`, falha acionavel e repasse de saida nao parseavel equivalente ao fluxo atual de `/plan_spec`.

## Reproduction steps
1. Abrir `src/integrations/telegram-bot.ts` e verificar que apenas `/plan_spec*` e `/codex_chat*` estao registrados.
2. Abrir `src/types/state.ts` e confirmar que nao ha estado nem fases para `/discover_spec`.
3. Abrir `src/core/runner.ts` e confirmar que o lock global de texto livre e os lifecycles interativos cobrem apenas `/plan_spec` e `/codex_chat`.
4. Abrir `src/integrations/codex-client.ts` e confirmar que a sessao stateful existe, mas somente por `startPlanSession`.

## Evidence
- `src/integrations/telegram-bot.ts:1236`
- `src/integrations/telegram-bot.ts:1244`
- `src/integrations/telegram-bot.ts:1248`
- `src/integrations/telegram-bot.ts:1252`
- `src/integrations/telegram-bot.ts:1690`
- `src/integrations/telegram-bot.ts:1713`
- `src/integrations/telegram-bot.ts:1732`
- `src/integrations/telegram-bot.ts:1751`
- `src/integrations/telegram-bot.ts:2631`
- `src/integrations/telegram-bot.ts:2678`
- `src/types/state.ts:19`
- `src/types/state.ts:36`
- `src/types/state.ts:64`
- `src/core/runner.ts:761`
- `src/core/runner.ts:816`
- `src/core/runner.ts:878`
- `src/core/runner.ts:893`
- `src/core/runner.ts:929`
- `src/core/runner.ts:1777`
- `src/core/runner.ts:2377`
- `src/core/runner.ts:2421`
- `src/core/runner.ts:2471`
- `src/core/runner.ts:2498`
- `src/integrations/codex-client.ts:223`
- `src/integrations/codex-client.ts:679`
- `src/integrations/codex-client.ts:955`
- `src/integrations/codex-client.ts:999`
- `src/integrations/codex-client.ts:1012`

## Impact assessment
- Impacto funcional: alto, o comando principal da spec nao existe e a jornada nao pode ser iniciada.
- Impacto operacional: alto, sem bloqueios e status dedicados o contexto pode ficar inconsistente ou invisivel para o operador.
- Risco de regressao: alto, envolve novo lifecycle interativo, wiring Telegram, guards de concorrencia e reutilizacao do slot do projeto ativo.
- Scope estimado (quais fluxos podem ser afetados): `runner`, `telegram-bot`, `state`, `codex-client` e suites de teste associadas.

## Initial hypotheses (optional)
- A arquitetura atual foi estabilizada em torno de `/plan_spec` e ainda nao abstraiu um segundo fluxo de planejamento stateful com nome, status e guards proprios.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- RF-01, RF-02, RF-23 e RF-27; CA-01, CA-15 e CA-17: o bot registra `/discover_spec`, `/discover_spec_status` e `/discover_spec_cancel`, respeita `TELEGRAM_ALLOWED_CHAT_ID` e testes automatizados cobrem start/status/cancel em chat autorizado e negam chat nao autorizado.
- RF-03, RF-04, RF-08 e RF-09; CA-01: o runner inicia uma sessao `/discover_spec` global unica, usa o projeto ativo snapshotado no start e reutiliza backend stateful `codex exec`/`resume --json` com `thread_id`, com cobertura em `runner` e `codex-client`.
- RF-05, RF-06 e RF-07; CA-03: com sessao `/discover_spec` ativa, `/plan_spec`, `/codex_chat`, `/run_all`, `/run_specs`, `/run_ticket` e troca de projeto retornam bloqueio explicito e nao iniciam execucao.
- RF-24 e RF-25; CA-16 e CA-18: a sessao expira apos 30 minutos sem atividade, envia mensagem de timeout e falhas retornam erro acionavel com orientacao de retry, sem fallback automatico.
- RF-26; CA-19: quando a saida do Codex nao for parseavel com seguranca, o bot repassa conteudo bruto saneado ao Telegram e registra observabilidade equivalente ao fluxo atual.

## Decision log
- 2026-03-18 - Gap aberto a partir da revisao da spec `2026-03-18-discover-spec-entrevista-profunda-de-alinhamento`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
