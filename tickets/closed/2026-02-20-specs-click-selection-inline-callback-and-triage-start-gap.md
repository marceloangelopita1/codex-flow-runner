# [TICKET] /specs ainda nao suporta selecao por clique com callback inline e inicio imediato de triagem

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-20 22:19Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md
  - execplans/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md
  - SPECS.md
  - INTERNAL_TICKETS.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts`, `src/integrations/spec-discovery.ts`, `src/core/runner.ts`
- Scenario: operador usa `/specs` esperando selecionar uma spec por clique e iniciar triagem sem digitar `/run_specs`.
- Input constraints: manter validacao de elegibilidade (`Status: approved`, `Spec treatment: pending`) e gate de concorrencia do runner.

## Problem statement
A jornada por clique em `/specs` descrita na spec nao esta implementada. Hoje o comando apenas lista texto e orienta uso manual de `/run_specs <arquivo>`, sem callback por item, sem destaque da escolha e sem bloqueio de botoes na mensagem clicada.

## Observed behavior
- O que foi observado:
  - `/specs` responde apenas texto puro (`ctx.reply(this.buildSpecsReply(specs))`), sem `inline_keyboard`.
  - `buildSpecsReply` monta lista textual e fallback manual de `/run_specs`, sem callback data por item.
  - `handleCallbackQuery` roteia apenas prefixos `projects:` e `plan-spec:`, sem fluxo `specs:`.
  - Nao existe controle para callback de selecao de spec (revalidacao no clique, stale, ineligibilidade no momento do click, pagina/contexto da mensagem).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica + testes atuais de `/specs` validando somente resposta textual

## Expected behavior
`/specs` deve expor lista paginada com botoes inline por item elegivel, transportar contexto suficiente no callback, iniciar triagem no clique valido e atualizar a mensagem clicada com destaque (`✅`) e botoes travados. Falhas de elegibilidade/stale/concorrencia devem bloquear inicio e retornar motivo observavel.

## Reproduction steps
1. Executar `/specs` em chat autorizado.
2. Observar que a resposta contem apenas texto e instrucao para `/run_specs`, sem botoes inline por spec.
3. Verificar `handleCallbackQuery` e confirmar ausencia de branch para callbacks de `/specs`.

## Evidence
- `src/integrations/telegram-bot.ts:672`
- `src/integrations/telegram-bot.ts:689`
- `src/integrations/telegram-bot.ts:1002`
- `src/integrations/telegram-bot.ts:1019`
- `src/integrations/telegram-bot.ts:470`
- `src/integrations/telegram-bot.ts:481`
- `src/integrations/telegram-bot.test.ts:1500`

## Impact assessment
- Impacto funcional: alto, pois o objetivo principal da spec (triagem por clique em `/specs`) nao esta disponivel.
- Impacto operacional: alto, mantem friccao manual e aumenta chance de erro de digitacao do arquivo.
- Risco de regressao: medio-alto, altera contrato de callback e UX de mensagem editavel.
- Scope estimado (quais fluxos podem ser afetados): `/specs`, callback routing, validacoes de elegibilidade/concorrrencia/stale, testes do bot.

## Initial hypotheses (optional)
- A implementacao atual cobre apenas fase anterior da spec (`/specs` como listagem textual + fallback manual).

## Proposed solution (optional)
Nao obrigatorio. Definir em ExecPlan.

## Closure criteria
- `/specs` renderiza inline keyboard com selecao por item e navegacao por pagina.
- Callback de selecao de spec inclui contexto minimo (spec + pagina + marcador de mensagem/contexto).
- Clique valido em item de `/specs` inicia `runSpecs` imediatamente.
- Mensagem clicada e editada com destaque da escolha e botoes desabilitados.
- Falhas de inelegibilidade, stale, concorrencia e acesso retornam feedback observavel sem iniciar triagem.
- Cobertura automatizada para CAs de `/specs` (CA-01 a CA-10) e cenarios de reuso/stale.

## Decision log
- 2026-02-20 - Gap priorizado como P0/S1 por bloquear o objetivo central da UX por clique em `/specs`.
- 2026-02-20 - Execucao validada com `npx tsx --test src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`; criterios de fechamento do recorte `/specs` atendidos.

## Closure
- Closed at (UTC): 2026-02-20 22:38Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md (commit: mesmo changeset de fechamento)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
