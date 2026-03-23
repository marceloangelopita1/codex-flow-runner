# [TICKET] Envios conversacionais e auxiliares do Telegram ainda usam `sendMessage(...)` bruto fora da camada central

## Metadata
- Status: open
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-23 13:43Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional): tickets/open/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: N/A
- Source spec (when applicable): docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-02, RF-08, RF-09, RF-10, RF-14, RF-15, RF-17, RF-20; CA-04, CA-05, CA-09, CA-12; restrições: evitar duplicação entre transporte e regras editoriais, não exigir a mesma política para toda mensagem, preservar contratos funcionais já expostos ao operador, manter `answerCbQuery(...)` e `editMessageText(...)` fora do núcleo inicial quando justificado
- Inherited assumptions/defaults (when applicable): a centralização prioritária é para envios baseados em `sendMessage(...)`; mensagens interativas e auxiliares podem usar políticas mais leves; `TelegramController` continua responsável pela composição editorial e pela resolução do destino, enquanto o transporte deve ficar declarativo e reutilizável; a nova camada precisa aceitar `reply_markup` e retornar `message_id` quando necessário
- Inherited RNFs (when applicable): comportamento consistente entre mensagens operacionais e conversacionais; logging padronizado por envio; compatibilidade funcional para comandos e callbacks já existentes do ponto de vista do operador
- Inherited technical/documentary constraints (when applicable): não forçar `answerCbQuery(...)` e `editMessageText(...)` para dentro da primeira versão do transporte; manter a separação entre formatter/editorial e política de transporte; preservar fluxo sequencial do runner
- Inherited pending/manual validations (when applicable): automatizar cenários de preservação de `reply_markup` e `message_id`; auditar por código que os envios migrados deixaram de duplicar lógica de transporte; validar manualmente ao menos um fluxo conversacional (`/plan_spec`, `/discover_spec` ou `/codex_chat`) com botões e mensagens coerentes após a migração
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a - triagem pré-implementação da spec
- Smallest plausible explanation (audit/review only): n/a - triagem pré-implementação da spec
- Remediation scope (audit/review only): n/a - triagem pré-implementação da spec
- Related artifacts:
  - Request file: N/A (diagnóstico estático no código)
  - Response file: N/A (diagnóstico estático no código)
  - Decision file: N/A (triagem documental local)
- Related docs/execplans:
  - docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
  - docs/workflows/codex-quality-gates.md
  - INTERNAL_TICKETS.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): o volume maior de chamadas brutas a `sendMessage(...)` está em fluxos conversacionais e auxiliares. Sem migrá-las, a nova arquitetura fica parcial e novos pontos continuarão copiando transporte na `TelegramController`.

## Context
- Workflow area: integrações Telegram para `/plan_spec`, `/discover_spec`, `/codex_chat`, callbacks auxiliares e leitura de ticket aberto
- Scenario: a `TelegramController` já suporta `reply_markup` e captura `message_id` em alguns fluxos, mas cada método ainda chama `sendMessage(...)` diretamente e decide transporte localmente
- Input constraints: preservar a UX textual atual, manter botões inline e `message_id` onde já são usados, sem forçar `editMessageText(...)`/`answerCbQuery(...)` para a mesma abstração nesta primeira evolução

## Problem statement
Mesmo após existir base robusta para resumos finais, os fluxos conversacionais e auxiliares do Telegram continuam espalhando chamadas diretas a `sendMessage(...)` por vários métodos. Isso impede que a camada central se torne o caminho canônico para novos envios ao chat, mantém o transporte distribuído e torna incompleta a separação entre composição editorial e política de entrega.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts:1109-1186` envia perguntas, finalizações, falhas, mensagens de lifecycle e saída raw de `/discover_spec` e `/plan_spec` com `sendMessage(...)` direto.
  - `src/integrations/telegram-bot.ts:1325-1338` envia saída, falha e lifecycle de `/codex_chat` com `sendMessage(...)` direto.
  - `src/integrations/telegram-bot.ts:5649-5778` envia conteúdo de ticket aberto, CTA de implementação e confirmações de callbacks com `sendMessage(...)` direto.
  - `src/integrations/telegram-bot.ts:5457` (`resolveOutgoingMessageId`) e os métodos de pergunta/finalização já dependem de `message_id`, mas esse contrato permanece ad hoc, acoplado a cada método chamador.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de código em `src/integrations/telegram-bot.ts` e auditoria por `rg`

## Expected behavior
Os envios baseados em `sendMessage(...)` para superfícies conversacionais e auxiliares devem usar a mesma camada central introduzida para notificações críticas, escolhendo políticas explícitas apropriadas e preservando `reply_markup`, `message_id`, chunking quando aplicável e o comportamento funcional já visto pelo operador.

## Reproduction steps
1. Executar `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts`.
2. Abrir os métodos `sendDiscoverSpecQuestion(...)`, `sendDiscoverSpecFinalization(...)`, `sendPlanSpecQuestion(...)`, `sendPlanSpecFinalization(...)`, `sendCodexChatOutput(...)`, `sendTicketOpenContent(...)` e os helpers `send*CallbackChatMessage(...)`.
3. Confirmar que eles usam transporte bruto, apesar de já dependerem de `reply_markup` e/ou `message_id`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Falha ao enviar confirmação de callback de /plan_spec no chat`
  - `Falha ao enviar confirmação de callback de /codex_chat no chat`
- Warnings/codes relevantes:
  - uso bruto repetido de `sendMessage(...)` em superfícies que deveriam apenas formatar mensagem e escolher política
  - suporte a `reply_markup` e `message_id` existe, mas sem contrato centralizado
- Comparativo antes/depois (se houver):
  - Antes: cada fluxo conversacional escolhe transporte e chama `sendMessage(...)` diretamente
  - Depois (esperado): fluxos escolhem política/formatter e delegam transporte à camada central

## Impact assessment
- Impacto funcional: a arquitetura centralizada fica incompleta e novos fluxos continuam com alta chance de copiar transporte localmente
- Impacto operacional: inconsistências de logging, retry leve/best-effort e captura de `message_id` permanecem difíceis de auditar
- Risco de regressao: médio, porque a mudança cruza fluxos interativos com botões inline, callbacks e mensagens de apoio ao operador
- Scope estimado (quais fluxos podem ser afetados): `/plan_spec`, `/discover_spec`, `/codex_chat`, `/tickets_open`, callbacks de confirmação e testes de `src/integrations/telegram-bot.test.ts`

## Initial hypotheses (optional)
- O transporte central precisa aceitar `reply_markup`, devolver metadados de mensagem e oferecer políticas leves para fluxos interativos sem replicar a política crítica usada nos resumos finais.

## Proposed solution (optional)
- Migrar gradualmente os envios conversacionais e auxiliares baseados em `sendMessage(...)` para a camada central, preservando os formatters existentes.
- Introduzir um contrato central para `reply_markup`/`message_id`, mantendo o guardrail documental/auditoria automatizada contra novas chamadas brutas como frente própria do ticket dedicado de documentação.

## Closure criteria
- Requisito/RF/CA coberto: RF-02, RF-08, CA-04
- Evidencia observavel: pelo menos `/plan_spec`, `/discover_spec` e `/codex_chat` passam a usar a camada central para transporte das mensagens enviadas ao chat.
- Requisito/RF/CA coberto: RF-09, RF-10, CA-05
- Evidencia observavel: a camada central aceita `reply_markup` e retorna `message_id` ou metadado equivalente; os fluxos que dependem disso continuam cobertos por testes automatizados.
- Requisito/RF/CA coberto: RF-14
- Evidencia observavel: auditoria por `rg` e/ou testes dedicados mostram que os fluxos migrados (`/plan_spec`, `/discover_spec`, `/codex_chat`, callbacks auxiliares e leitura de ticket aberto) deixam de manter transporte ad hoc e passam a delegar o envio à camada central com política explícita.
- Requisito/RF/CA coberto: RF-15, CA-09
- Evidencia observavel: testes automatizados e/ou asserts de integração comprovam que os envios conversacionais e auxiliares migrados produzem logging padronizado por envio com destino, política, tipo lógico da mensagem, tentativas, classe/código de erro e resultado final quando aplicável, sem alterar a UX textual observada pelo operador.
- Requisito/RF/CA coberto: RF-17, RF-20, CA-12
- Evidencia observavel: os comandos e callbacks existentes mantêm comportamento funcional equivalente do ponto de vista do operador, e `answerCbQuery(...)`/`editMessageText(...)` seguem fora do núcleo inicial com limite de escopo documentado no ticket/implementação.
- Requisito/RF/CA coberto: validação manual pendente relevante
- Evidencia observavel: execução manual em ambiente real de ao menos um fluxo conversacional confirma coerência de botões, mensagens e callback após a migração.

## Decision log
- 2026-03-23 - Ticket aberto para concluir a centralização dos envios `sendMessage(...)` fora do caminho crítico e preservar contratos interativos já existentes.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
