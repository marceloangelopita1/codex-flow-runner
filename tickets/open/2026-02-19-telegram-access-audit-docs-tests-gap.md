# [TICKET] Auditoria, documentacao e testes incompletos no controle de acesso Telegram

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-19 11:32Z
- Reporter: codex
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: prompts/01-avaliar-spec-e-gerar-tickets.md
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-telegram-access-and-control-plane.md

## Context
- Workflow area: autorizacao e observabilidade do bot Telegram
- Scenario: tentativa de comando por chat autorizado e nao autorizado
- Input constraints: `TELEGRAM_ALLOWED_CHAT_ID` configurado e ausente (modo sem restricao)

## Problem statement
O controle de acesso atual registra tentativa nao autorizada apenas com `chatId`, sem contexto suficiente do evento para auditoria operacional. Alem disso, a documentacao nao descreve explicitamente o comportamento de modo restrito vs. modo sem restricao, e nao ha testes automatizados cobrindo os cenarios de autorizacao/nao autorizacao.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts` registra warning de acesso nao autorizado apenas com `{ chatId }`.
  - `README.md` lista `TELEGRAM_ALLOWED_CHAT_ID` como opcional, mas nao formaliza claramente o modo sem restricao e seus efeitos.
  - Nao existem arquivos de teste no repositorio cobrindo autorizacao do bot.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e documentacao

## Expected behavior
- Tentativas nao autorizadas devem gerar log com `chatId` e contexto minimo do evento (ex.: comando/tipo do evento).
- Documentacao operacional deve explicar claramente:
  - modo restrito (`TELEGRAM_ALLOWED_CHAT_ID` configurado);
  - modo sem restricao (`TELEGRAM_ALLOWED_CHAT_ID` ausente).
- Testes automatizados devem validar cenarios autorizado/nao autorizado e modo sem restricao.

## Reproduction steps
1. Ler `src/integrations/telegram-bot.ts` e localizar `isAllowed`.
2. Verificar que o warning registra apenas `chatId`.
3. Ler `README.md` e confirmar ausencia de secao explicita sobre modo restrito vs. sem restricao.

## Evidence
- `src/integrations/telegram-bot.ts`: `this.logger.warn("Tentativa de acesso não autorizado ao bot", { chatId });`
- `README.md`: variavel `TELEGRAM_ALLOWED_CHAT_ID` listada como opcional sem regra operacional explicita.
- Ausencia de testes: nao ha suite de testes no repositorio para controle de acesso Telegram.

## Impact assessment
- Impacto funcional: medio, com lacuna de validacao automatizada e menor capacidade de auditoria.
- Impacto operacional: medio, dificulta triagem de tentativas indevidas e entendimento de configuracao segura.
- Risco de regressao: medio, pois mudancas em autorizacao podem degradar comportamento sem cobertura de testes.
- Scope estimado (quais fluxos podem ser afetados): observabilidade do bot, documentacao de operacao e confiabilidade de alteracoes futuras.

## Initial hypotheses (optional)
- Escopo inicial do MVP priorizou comando e loop principal, sem fechar trilha de auditoria/testes.

## Proposed solution (optional)
- Enriquecer log de acesso negado com metadados minimos do evento.
- Atualizar documentacao operacional com secoes explicitas de modo restrito e sem restricao.
- Criar testes automatizados de autorizacao para comandos do bot.

## Closure criteria
- Log de acesso nao autorizado inclui `chatId` e contexto minimo do evento.
- Documentacao descreve claramente modos restrito e sem restricao.
- Testes automatizados cobrindo autorizado/nao autorizado/modo sem restricao implementados e passando.
- Spec atualizada com evidencias de validacao apos entrega.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec de controle de acesso Telegram.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
