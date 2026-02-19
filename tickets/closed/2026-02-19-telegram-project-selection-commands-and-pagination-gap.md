# [TICKET] Comandos Telegram de selecao de projeto e paginacao ausentes

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
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
  - ExecPlan: execplans/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md

## Context
- Workflow area: `src/integrations/telegram-bot.ts` e cobertura em `src/integrations/telegram-bot.test.ts`
- Scenario: operador precisa listar projetos, selecionar projeto ativo por clique/texto e navegar paginas quando a lista crescer
- Input constraints: manter controle por `TELEGRAM_ALLOWED_CHAT_ID` e bloquear troca durante execucao em andamento

## Problem statement
A interface do bot ainda nao expoe comandos de selecao de projeto (`/projects`, `/select-project`) nem mecanismos de callback/paginacao para inline keyboard. Sem essa superficie, o operador nao consegue trocar projeto ativo remotamente e os criterios de aceitacao de UX/controle ficam pendentes.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts:16` limita `ControlCommand` a `start`, `run-all`, `status`, `pause` e `resume`.
  - `src/integrations/telegram-bot.ts:95` a `src/integrations/telegram-bot.ts:170` registra apenas handlers desses 5 comandos.
  - Nao ha handler de callback query/inline keyboard nem estado de paginacao no controlador.
  - Nao existe caminho de selecao textual `/select-project <nome>` com validacao de entrada e resposta de erro.
  - `src/integrations/telegram-bot.test.ts` cobre apenas comandos atuais e nao possui casos de paginacao/selecao de projeto.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica do controlador Telegram e da suite de testes

## Expected behavior
O bot deve expor `/projects` com listagem paginada e marcacao visual do projeto ativo, permitir selecao por callback inline e por `/select-project <nome>`, bloquear troca durante `isRunning=true` e aplicar o mesmo controle/auditoria de acesso existente para chats nao autorizados.

## Reproduction steps
1. Iniciar a aplicacao e enviar `/projects` no bot.
2. Observar ausencia de handler especifico para listagem/selecao de projetos.
3. Enviar `/select-project algum-projeto` e observar ausencia de comando dedicado.

## Evidence
- `src/integrations/telegram-bot.ts:16`
- `src/integrations/telegram-bot.ts:95`
- `src/integrations/telegram-bot.ts:109`
- `src/integrations/telegram-bot.ts:129`
- `src/integrations/telegram-bot.ts:143`
- `src/integrations/telegram-bot.ts:157`
- `src/integrations/telegram-bot.test.ts:1`
- `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`

## Impact assessment
- Impacto funcional: medio, operador nao consegue trocar projeto ativo pelo Telegram.
- Impacto operacional: medio, controle remoto fica incompleto para ambiente com varios repositorios.
- Risco de regressao: medio, adiciona novos comandos, callbacks e validacoes de acesso/estado.
- Scope estimado (quais fluxos podem ser afetados): controlador Telegram, formato de mensagens, callbacks inline, validacoes de autorizacao e testes de integracao do bot.

## Initial hypotheses (optional)
- A camada de comando atual foi criada para um unico repositorio e ainda nao recebeu extensao para selecao de contexto de projeto.

## Proposed solution (optional)
- Adicionar `/projects` paginado com inline keyboard e marcacao de projeto ativo.
- Adicionar `/select-project <nome>` como fallback textual.
- Reaproveitar `isAllowed` e estender auditoria para eventos de projeto.

## Closure criteria
- RF-07, RF-08, RF-09 e RF-12 implementados com testes.
- CA-02, CA-03, CA-04, CA-05, CA-09 e CA-10 validados.
- Logs de tentativa nao autorizada para comandos de projeto incluem metadados minimos de auditoria.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gap da spec `telegram-multi-project-active-selection`.

## Closure
- Closed at (UTC): 2026-02-19 18:22Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md (commit deste fechamento)
