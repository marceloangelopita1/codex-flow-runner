# [TICKET] Bridge interativa do Codex em /plan e parser conversacional ausentes

## Metadata
- Status: open
- Priority: P0
- Severity: S1
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
- Workflow area: `src/integrations/codex-client.ts`, `src/integrations/telegram-bot.ts`
- Scenario: sessao `/plan_spec` precisa conversar em tempo real com Codex no modo `/plan`, renderizar perguntas estruturadas no Telegram e tratar falhas de parsing de forma segura.
- Input constraints: sem fallback automatico para backend nao interativo quando houver falha da sessao interativa.

## Problem statement
A integracao atual com Codex e apenas nao interativa (`codex exec` com prompt unico). Nao existe bridge de PTY/streaming, parser de blocos estruturados de pergunta/finalizacao, nem callbacks dedicados para opcoes de desambiguacao e acoes finais (`Criar spec`, `Refinar`, `Cancelar`).

## Observed behavior
- O que foi observado:
  - `CodexCliTicketFlowClient` expoe apenas `runStage`/`runSpecStage` batch, sem API de sessao interativa (`src/integrations/codex-client.ts:28`, `src/integrations/codex-client.ts:134`, `src/integrations/codex-client.ts:181`).
  - Execucao usa `codex exec ...` com escrita unica em `stdin` e encerramento imediato, sem loop interativo (`src/integrations/codex-client.ts:295`, `src/integrations/codex-client.ts:336`, `src/integrations/codex-client.ts:337`).
  - Callback handler atual so trata namespace `projects:*` (`src/integrations/telegram-bot.ts:535`, `src/integrations/telegram-bot.ts:556`), sem callbacks para perguntas/decisoes do planejamento.
  - Nao ha referencias a `/plan_spec`, `Criar spec`, `Refinar`, `Cancelar` ou `spec_planning` no codigo (`src/`).
  - Nao ha contrato implementado para saida nao parseavel com repasse bruto saneado.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo e busca textual em `src/`.

## Expected behavior
Deve existir sessao interativa real com Codex em `/plan`, incluindo auto-tratamento de prompt de confianca de diretorio, parser de blocos estruturados para perguntas/finalizacao, suporte simultaneo a respostas por clique e texto livre, e tratamento robusto de falha/parsing com mensagem acionavel.

## Reproduction steps
1. Revisar `src/integrations/codex-client.ts` e confirmar que a execucao atual e exclusivamente batch via `codex exec`.
2. Revisar `src/integrations/telegram-bot.ts` e confirmar que callbacks aceitos sao apenas os de projeto.
3. Buscar por tokens do fluxo (`/plan_spec`, `Criar spec`, `Refinar`, `Cancelar`, `spec_planning`) e confirmar ausencia no codigo.

## Evidence
- `src/integrations/codex-client.ts:28`
- `src/integrations/codex-client.ts:134`
- `src/integrations/codex-client.ts:181`
- `src/integrations/codex-client.ts:295`
- `src/integrations/codex-client.ts:336`
- `src/integrations/codex-client.ts:337`
- `src/integrations/telegram-bot.ts:535`
- `src/integrations/telegram-bot.ts:556`
- `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`

## Impact assessment
- Impacto funcional: alto, sem sessao interativa nao ha conversa de planejamento.
- Impacto operacional: alto, ausencia de tratamento de falhas/parsing pode travar UX e fluxo.
- Risco de regressao: alto, inclui I/O interativo, parser e callbacks adicionais.
- Scope estimado (quais fluxos podem ser afetados): integracao Codex, callbacks Telegram, roteamento de mensagens e UX conversacional.

## Initial hypotheses (optional)
- O client atual foi otimizado para etapas deterministicas de prompt unico e nao para conversa stateful.

## Proposed solution (optional)
Nao obrigatorio. Detalhar implementacao em ExecPlan.

## Closure criteria
- Implementar bridge interativa (PTY/stream) com comando `/plan` literal no Codex.
- Tratar automaticamente prompt inicial de confianca de diretorio para continuidade no projeto ativo.
- Implementar parser de bloco estruturado para perguntas de desambiguacao e bloco final de conclusao.
- Expor teclado inline para opcoes parseadas e aceitar resposta livre de texto no mesmo contexto.
- Expor acoes finais `Criar spec`, `Refinar`, `Cancelar` ao receber bloco final parseavel.
- Em falha da sessao interativa, abortar com erro acionavel e orientacao de retry, sem fallback automatico para outro backend.
- Em saida nao parseavel com seguranca, enviar conteudo bruto saneado ao Telegram.
- Cobrir CAs: CA-07, CA-08, CA-09, CA-10, CA-19, CA-20.

## Decision log
- 2026-02-19 - Ticket aberto apos avaliacao de gaps da spec `telegram-plan-spec-conversation`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix
- Related PR/commit/execplan:
