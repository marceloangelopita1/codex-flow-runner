# [TICKET] Camada central de entrega Telegram ainda nao cobre notificações críticas fora dos resumos finais

## Metadata
- Status: closed
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-23 13:43Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: N/A
- Source spec (when applicable): docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-03, RF-04, RF-05, RF-06, RF-07, RF-11, RF-12, RF-13, RF-15, RF-16, RF-18; CA-01, CA-02, CA-03, CA-06, CA-07, CA-09, CA-11; restrições: manter fluxo sequencial, não introduzir persistência/outbox, preservar Telegraf, evitar duplicação entre transporte e composição editorial, preservar observabilidade crítica em `/status`
- Inherited assumptions/defaults (when applicable): `TelegramController` continua como fronteira com Telegraf; a lógica madura de classificação de erro/backoff dos resumos finais é a base inicial a reaproveitar; `notificationChatId` pode continuar sendo resolvido no `TelegramController`; a iteração não exige outbox persistente nem exactly-once; políticas de entrega precisam ser declarativas por tipo de mensagem
- Inherited RNFs (when applicable): logging padronizado por envio com contexto mínimo consistente; falha estruturada e acionável para notificações críticas; compatibilidade com o estado observável do runner em `/status`
- Inherited technical/documentary constraints (when applicable): preservar o fluxo sequencial do runner; manter a integração em Telegraf; não mover lógica de negócio do runner para a camada de transporte; não centralizar regras editoriais junto com retry/classificação/chunking
- Inherited pending/manual validations (when applicable): automatizar cenários de retry, falha definitiva e chunking na nova camada central; validar manualmente um `/run_specs` com milestone seguido de `/run_all`, incluindo falha transitória simulada no envio do marco
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
- Prioridade resultante (`P0` | `P1` | `P2`): P0
- Justificativa objetiva (evidencias e impacto): hoje a robustez forte de envio está concentrada apenas em `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)`, enquanto o milestone de `/run_specs` permanece em envio bruto sem retry nem resultado estruturado. Isso deixa um marco operacional importante fora da política de entrega esperada pela spec.

## Context
- Workflow area: integração Telegram para notificações operacionais críticas
- Scenario: o projeto já possui retry bounded, classificação de erro, backoff, chunking e falha estruturada para resumos finais, mas não existe um componente canônico que também cubra o milestone de triagem de `/run_specs`
- Input constraints: manter o runner sequencial, sem outbox/persistência; preservar `Telegraf`; manter `/status` coerente para notificações críticas

## Problem statement
O código atual não possui um componente central nomeado de entrega Telegram para envios críticos baseados em `sendMessage(...)`. A robustez existe, mas está encapsulada apenas em métodos específicos de resumo final. Como consequência, o milestone de triagem de `/run_specs` continua fora dessa política e novos envios críticos tenderão a repetir ou ignorar partes do transporte robusto.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts:868` (`sendTicketFinalSummary`) implementa retry bounded, classificação de erro e falha estruturada localmente.
  - `src/integrations/telegram-bot.ts:1206` (`sendRunFlowSummary`) repete a mesma família de responsabilidades, incluindo chunking e falha estruturada por parte.
  - `src/integrations/telegram-bot.ts:1189` (`sendRunSpecsTriageMilestone`) ainda faz `sendMessage(...)` direto, sem retry, sem resultado estruturado e sem logging padronizado por política.
  - `src/integrations/telegram-bot.ts` ainda contém 23 chamadas diretas a `bot.telegram.sendMessage(...)`, indicando ausência de um caminho canônico único.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de código em `src/integrations/telegram-bot.ts`, `src/core/runner.ts` e auditoria por `rg`

## Expected behavior
O repositório deve introduzir uma camada central de entrega Telegram orientada por políticas, reaproveitando a lógica madura já existente e fazendo com que resumos finais e o milestone de `/run_specs` deleguem o transporte a esse núcleo. O resultado precisa continuar estruturado, observável em `/status` para notificações críticas e sem introduzir persistência/outbox.

## Reproduction steps
1. Executar `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts`.
2. Comparar `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)` com `sendRunSpecsTriageMilestone(...)`.
3. Confirmar que apenas os resumos finais aplicam retry bounded, classificação de erro, backoff e falha estruturada.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Resumo final de ticket enviado no Telegram`
  - `Falha transitoria ao enviar resumo final de ticket no Telegram`
  - `Falha definitiva ao enviar resumo final de fluxo no Telegram`
- Warnings/codes relevantes:
  - ausência de política explícita no milestone de `/run_specs`
  - duplicação de responsabilidades de transporte entre métodos específicos
- Comparativo antes/depois (se houver):
  - Antes: robustez crítica espalhada entre dois métodos finais e milestone ad hoc
  - Depois (esperado): componente central único com políticas explícitas e delegação dos fluxos críticos

## Impact assessment
- Impacto funcional: marco de triagem de `/run_specs` continua vulnerável a perda silenciosa e a arquitetura segue divergente do contrato da spec
- Impacto operacional: o operador pode perder o milestone que separa triagem da rodada `/run_all`, reduzindo a confiabilidade do acompanhamento remoto
- Risco de regressao: alto, porque a mudança toca resumo final por ticket, resumo final de fluxo, milestone de `/run_specs`, logging e estado do runner
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/types/ticket-final-summary.ts`, `src/types/flow-timing.ts`, `/status` e testes de integração/unitários do Telegram

## Initial hypotheses (optional)
- O melhor recorte é extrair um núcleo de transporte reutilizável em `src/integrations`, com políticas explícitas para envios críticos e reutilização da classificação de erro/backoff já madura.

## Proposed solution (optional)
- Introduzir um componente central de entrega Telegram com resultado estruturado, política explícita, chunking configurável e logging padronizado.
- Fazer `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)` delegarem o transporte a essa camada.
- Preservar em `/status` apenas a superfície crítica já rastreada pelo runner, sem ampliar o estado para mensagens auxiliares.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-03, RF-04, CA-01
- Evidencia observavel: existe um componente central nomeado de entrega Telegram, fora da duplicação atual entre `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)`, e os envios críticos delegam o transporte para ele.
- Requisito/RF/CA coberto: RF-05, RF-06, RF-12, CA-02, CA-09
- Evidencia observavel: retry bounded, backoff, classificação de erro e falha estruturada dos resumos finais continuam disponíveis por meio do novo componente, com cobertura automatizada para falha transitória e falha definitiva.
- Requisito/RF/CA coberto: RF-15, CA-09
- Evidencia observavel: testes automatizados e/ou asserts de integração comprovam que cada envio crítico delegado à camada central produz logging padronizado com destino, política, tipo lógico da mensagem, tentativas, classe/código de erro e resultado final em sucesso e falha definitiva.
- Requisito/RF/CA coberto: RF-07, CA-03
- Evidencia observavel: o milestone de triagem de `/run_specs` deixa de usar envio bruto e passa a usar a camada central com política explícita e cobertura automatizada.
- Requisito/RF/CA coberto: RF-11, CA-06
- Evidencia observavel: chunking configurável passa a ser responsabilidade da camada central e continua coberto por teste automatizado.
- Requisito/RF/CA coberto: RF-13, CA-07
- Evidencia observavel: `/status` continua expondo último evento crítico entregue e última falha definitiva com tentativas, classe de erro e destino.
- Requisito/RF/CA coberto: RF-16, RF-18, CA-11
- Evidencia observavel: o diff não introduz outbox/persistência/storage adicional e mantém a integração `main.ts -> TelegramController -> runner` sem mover lógica de negócio do runner para a camada de transporte.
- Requisito/RF/CA coberto: validação manual pendente relevante
- Evidencia observavel: execução manual em ambiente real comprova que o milestone de `/run_specs` sobrevive a uma falha transitória simulada e continua acionável antes da rodada `/run_all`.

## Decision log
- 2026-03-23 - Ticket aberto na triagem da spec para isolar a fundação crítica da camada central e a migração dos envios operacionais mais sensíveis.
- 2026-03-23 - Diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md` foram relidos na etapa de fechamento; o resultado final ficou `GO` porque os critérios técnicos/funcionais foram validados com evidência objetiva e o único item remanescente e validação manual externa prevista no próprio ticket.

## Closure
- Closed at (UTC): 2026-03-23 14:25Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
  - PR: N/A
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-01`, `RF-03`, `RF-04`, `CA-01`: o componente central nomeado existe em `src/integrations/telegram-delivery.ts` com políticas declarativas e ponto canônico `deliverTextMessage(...)`, enquanto `sendTicketFinalSummary(...)`, `sendRunSpecsTriageMilestone(...)` e `sendRunFlowSummary(...)` delegam explicitamente para ele em `src/integrations/telegram-bot.ts`; validação executada com `rg -n "deliverTextMessage|RUN_SPECS_TRIAGE_MILESTONE_DELIVERY_POLICY|RUN_FLOW_SUMMARY_DELIVERY_POLICY|TICKET_FINAL_SUMMARY_DELIVERY_POLICY|sendRunSpecsTriageMilestone|sendRunFlowSummary|sendTicketFinalSummary" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`.
  - `RF-05`, `RF-06`, `RF-12`, `CA-02`, `CA-09`: a nova camada preserva retry bounded, backoff, classificação de erro, chunking e falha estruturada em `src/integrations/telegram-delivery.ts`; a cobertura automatizada prova falha transitória, falha definitiva e metadados estruturados para resumos finais em `src/integrations/telegram-bot.test.ts`; validações executadas com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` e `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`.
  - `RF-15`, `CA-09`: os testes verificam logging padronizado com `policy`, `logicalMessageType`, `destinationChatId`, `errorClass`, `errorCode` e `result` em sucesso, retry e falha definitiva para os envios críticos; evidência objetiva em `src/integrations/telegram-bot.test.ts` para milestone, resumo final de ticket e resumo final de fluxo; validação executada com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`.
  - `RF-07`, `CA-03`: `sendRunSpecsTriageMilestone(...)` deixou de usar envio bruto e agora usa a camada central com política `run-specs-triage-milestone`; o teste `reenvia milestone de triagem /run_specs em falha transitoria com logging padronizado` prova retry bounded e entrega; validação executada com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`.
  - `RF-11`, `CA-06`: o chunking configurável saiu do método específico e ficou sob responsabilidade da política `RUN_FLOW_SUMMARY_DELIVERY_POLICY` em `src/integrations/telegram-delivery.ts`; o teste `envio de resumo final de fluxo grande usa chunking e retorna delivery estruturado` permanece verde em `src/integrations/telegram-bot.test.ts`; validação executada com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`.
  - `RF-13`, `CA-07`: `/status` continua expondo último sucesso e última falha definitiva, e o runner preserva o último evento entregue ao registrar nova falha; evidência objetiva nos testes `runner preserva ultimo evento entregue e registra falha definitiva quando envio do resumo falha`, `runner mantém ultimo evento entregue ao registrar nova falha definitiva de notificacao`, `status inclui rastreabilidade da notificacao do resumo final de fluxo e sua falha` e `status inclui falha definitiva de notificacao separada do ultimo evento entregue`; validações executadas com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`.
  - `RF-16`, `RF-18`, `CA-11`: a auditoria final de diff mostra mudanças restritas a `src/integrations`, testes e write-back documental da spec, sem outbox, persistência, storage adicional ou deslocamento de lógica de negócio do runner; validações executadas com `git diff -- src/main.ts src/core/runner.ts src/integrations src/config src/types docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`, `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` e `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`.
  - Validação manual pendente relevante: a entrega técnica foi concluída, mas a execução em ambiente real do milestone de `/run_specs` com falha transitória simulada ainda não foi executada neste workspace. Classificação do gap remanescente: `external/manual`. Escopo: local ao ambiente operacional de validação.
- Entrega tecnica concluida:
  - `src/integrations/telegram-delivery.ts` centraliza política, retry bounded, backoff, classificação, chunking e logging.
  - `sendTicketFinalSummary(...)`, `sendRunSpecsTriageMilestone(...)` e `sendRunFlowSummary(...)` delegam o transporte para a nova camada.
  - Os contratos observáveis do runner e do `/status` foram preservados.
- Validacoes executadas:
  - `rg -n "deliverTextMessage|RUN_SPECS_TRIAGE_MILESTONE_DELIVERY_POLICY|RUN_FLOW_SUMMARY_DELIVERY_POLICY|TICKET_FINAL_SUMMARY_DELIVERY_POLICY|sendRunSpecsTriageMilestone|sendRunFlowSummary|sendTicketFinalSummary" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - `git diff -- src/main.ts src/core/runner.ts src/integrations src/config src/types docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- Validacao manual externa pendente: sim.
- Validacao manual ainda necessaria:
  - executar em chat Telegram autorizado um `/run_specs <spec>` que emita milestone antes da rodada `/run_all`, simulando uma falha transitória no primeiro envio do marco;
  - confirmar que o milestone chega após retry, que os logs registram a tentativa transitória e o resultado final, e que a rodada `/run_all` permanece acionável.
- Como executar a validacao manual:
  - iniciar o runner em ambiente com Telegram real habilitado;
  - disparar `/run_specs <spec>` em chat autorizado;
  - induzir uma falha transitória controlada no primeiro `sendMessage(...)` do milestone;
  - verificar no chat e nos logs que houve retry e entrega final do milestone antes da continuação operacional.
- Responsavel operacional pela validacao manual: operador do runner com acesso ao chat Telegram autorizado e ao ambiente onde a falha transitória possa ser simulada.
