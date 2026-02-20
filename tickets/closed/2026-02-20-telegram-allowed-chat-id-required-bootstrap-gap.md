# [TICKET] TELEGRAM_ALLOWED_CHAT_ID obrigatorio no bootstrap ainda nao e exigido

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-20 15:51Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md
  - ExecPlan: execplans/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md

## Context
- Workflow area: `src/config/env.ts`, `src/main.ts`, `src/integrations/telegram-bot.ts`
- Scenario: no modo multi-runner definido na spec, `TELEGRAM_ALLOWED_CHAT_ID` deve ser requisito obrigatorio de bootstrap.
- Input constraints: manter bloqueio de comandos e callbacks para chats nao autorizados.

## Problem statement
A configuracao atual ainda permite iniciar o bot sem `TELEGRAM_ALLOWED_CHAT_ID`, deixando o modo sem restricao ativo. Isso contraria o RF-16 e impede cumprir o CA-11 da spec.

## Observed behavior
- O que foi observado:
  - `TELEGRAM_ALLOWED_CHAT_ID` esta marcado como opcional no schema de ambiente (`src/config/env.ts:5`).
  - Teste valida que `parseEnv` aceita ambiente sem `TELEGRAM_ALLOWED_CHAT_ID` (`src/config/env.test.ts:15`).
  - O bootstrap injeta o valor opcional diretamente no `TelegramController` (`src/main.ts:192`).
  - `isAllowed` permite qualquer chat quando `allowedChatId` nao foi configurado (`src/integrations/telegram-bot.ts:1426`).
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica da validacao de ambiente e regra de autorizacao do bot.

## Expected behavior
Sem `TELEGRAM_ALLOWED_CHAT_ID`, o bootstrap deve falhar com erro claro de configuracao obrigatoria. Quando configurado, comandos e callbacks devem permanecer bloqueados para chats nao autorizados.

## Reproduction steps
1. Remover `TELEGRAM_ALLOWED_CHAT_ID` do ambiente.
2. Executar bootstrap do runner.
3. Observar que o processo inicia sem erro de configuracao obrigatoria.
4. Verificar em `isAllowed` que o modo sem restricao aceita qualquer chat quando o campo esta ausente.

## Evidence
- `src/config/env.ts:5`
- `src/config/env.test.ts:15`
- `src/main.ts:192`
- `src/integrations/telegram-bot.ts:1426`

## Impact assessment
- Impacto funcional: alto, criterio de aceitacao de seguranca/configuracao (CA-11) permanece pendente.
- Impacto operacional: alto, risco de operacao do bot em modo sem restricao por configuracao incompleta.
- Risco de regressao: medio, altera contrato de ambiente e testes.
- Scope estimado (quais fluxos podem ser afetados): bootstrap, parser de ambiente, documentacao de deploy e suites de teste de env/acesso.

## Initial hypotheses (optional)
- O comportamento opcional foi mantido para retrocompatibilidade inicial, mas conflita com o baseline operacional da spec de paralelizacao.

## Proposed solution (optional)
Nao obrigatorio. Detalhar em ExecPlan.

## Closure criteria
- Tornar `TELEGRAM_ALLOWED_CHAT_ID` obrigatorio no schema de ambiente.
- Garantir falha de bootstrap com mensagem objetiva quando variavel estiver ausente.
- Atualizar testes de `parseEnv` para cobrir ausencia como erro.
- Preservar validacoes de acesso para comandos e callbacks com `allowedChatId` configurado (CA-12).

## Decision log
- 2026-02-20 - Ticket aberto apos avaliacao de gaps da spec `2026-02-20-telegram-multi-project-parallel-runners`.

## Closure
- Closed at (UTC): 2026-02-20 16:25Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - PR: N/A
  - Commit: registrado no historico Git deste fechamento
  - ExecPlan: execplans/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md
