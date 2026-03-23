# ExecPlan - Camada central de entrega Telegram para notificacoes criticas

## Purpose / Big Picture
- Objetivo: introduzir uma camada central e nomeada de entrega Telegram para notificacoes criticas baseadas em `sendMessage(...)`, removendo a duplicacao atual entre `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e o milestone de triagem de `/run_specs`.
- Resultado esperado:
  - existe um componente canonico em `src/integrations` responsavel por politica de entrega, retry bounded, backoff, classificacao de erro, chunking quando aplicavel, logging padronizado e resultado estruturado;
  - `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)` passam a delegar o transporte para esse componente;
  - o estado observavel do runner e o `/status` continuam refletindo ultimo evento critico entregue e ultima falha definitiva com tentativas, classe/codigo de erro e destino;
  - a cobertura automatizada passa a provar retry, falha definitiva, chunking, logging padronizado e migracao do milestone de `/run_specs` para a camada central;
  - permanece fora do escopo qualquer outbox persistente, replay apos restart ou migracao de mensagens conversacionais/auxiliares.
- Escopo:
  - extrair um componente central de entrega Telegram dentro de `src/integrations`;
  - migrar apenas os tres envios criticos citados no ticket;
  - preservar compatibilidade com `main.ts -> TelegramController -> runner`;
  - ampliar testes automatizados de Telegram e runner para cobrir o novo nucleo.
- Fora de escopo:
  - migrar `/plan_spec`, `/discover_spec`, `/codex_chat`, callbacks auxiliares e outras mensagens nao criticas; isso pertence ao ticket irmao `tickets/open/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md`;
  - criar guardrail documental/automatizado amplo contra `sendMessage(...)` bruto fora da camada central; isso pertence ao ticket irmao `tickets/open/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md`;
  - incluir `answerCbQuery(...)` ou `editMessageText(...)` na primeira versao da abstracao;
  - alterar UX textual dos comandos alem do minimo necessario para preservar o comportamento atual;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-23 14:05Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md` e das superficies tecnicas referenciadas.
- [x] 2026-03-23 15:22Z - Camada central de entrega Telegram implementada em `src/integrations/telegram-delivery.ts` e integrada a `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)`, preservando a adaptacao para os contratos existentes do runner.
- [x] 2026-03-23 15:29Z - Cobertura automatizada de retry, falha definitiva, chunking, logging padronizado e `/status` concluida em `src/integrations/telegram-bot.test.ts` e revalidada junto de `src/core/runner.test.ts`.
- [ ] YYYY-MM-DD HH:MMZ - Validacao manual do milestone de `/run_specs` com falha transitoria simulada concluida.

## Surprises & Discoveries
- 2026-03-23 14:05Z - A robustez forte ja existe, mas esta inteiramente embutida em `src/integrations/telegram-bot.ts`: `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)` repetem a mesma familia de responsabilidades, enquanto `sendRunSpecsTriageMilestone(...)` continua em envio bruto.
- 2026-03-23 14:05Z - O runner ja preserva `lastRunFlowSummary`, `lastRunFlowNotificationEvent`, `lastRunFlowNotificationFailure`, `lastNotifiedEvent` e `lastNotificationFailure`; o plano deve priorizar compatibilidade desses contratos em vez de redesenhar o estado.
- 2026-03-23 14:05Z - `src/main.ts` ja concentra o handoff `runSpecsEventHandlers.onTriageMilestone -> telegram.sendRunSpecsTriageMilestone(...)` e `runFlowEventHandlers.onFlowCompleted -> telegram.sendRunFlowSummary(...)`, o que permite manter a mudanca restrita a `src/integrations` e testes, salvo ajustes pequenos de tipagem.
- 2026-03-23 14:05Z - Existem testes extensos em `src/integrations/telegram-bot.test.ts` e `src/core/runner.test.ts` para sucesso, falha definitiva, chunking e `/status`; a lacuna real e provar que o comportamento agora vem da camada central e que o milestone de `/run_specs` tambem herda a mesma politica.
- 2026-03-23 15:18Z - A extracao para um servico generico preservou o contrato do runner sem tocar em `src/core`: bastou adaptar o resultado generico do novo nucleo para `TicketNotificationDispatchError`, `TicketNotificationDelivery`, `FlowNotificationDispatchError` e `FlowNotificationDelivery` dentro do proprio `TelegramController`.
- 2026-03-23 15:24Z - O teste de falha do resumo de fluxo revelou um detalhe contratual facil de perder na extracao: mesmo quando existe um unico chunk, `failedChunkIndex` precisa continuar sendo `1` para preservar o estado observavel e as assercoes de regressao.

## Decision Log
- 2026-03-23 - Decisao: manter `TelegramController` como fronteira com Telegraf e introduzir a camada central como modulo/servico interno de `src/integrations`, em vez de empurrar a abstracao para `src/core`.
  - Motivo: a spec e o ticket pedem centralizacao do transporte, nao migracao de logica de negocio do runner.
  - Impacto: `main.ts -> TelegramController -> runner` permanece intacto ou com churn minimo; o recorte principal fica no layer de integracao.
- 2026-03-23 - Decisao: limitar esta entrega aos tres envios criticos `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)`.
  - Motivo: e o menor recorte que cobre RF-01, RF-03, RF-04, RF-05, RF-06, RF-07, RF-11, RF-12, RF-13, RF-15, RF-16 e RF-18 sem conflitar com os tickets irmaos.
  - Impacto: outras chamadas diretas a `bot.telegram.sendMessage(...)` continuarao existindo nesta rodada, mas explicitamente fora do escopo.
- 2026-03-23 - Decisao: reaproveitar a logica madura atual de classificacao de erro, retry, backoff e chunking, extraindo-a para o componente central em vez de reescreve-la com outra taxonomia.
  - Motivo: RF-12 e o proprio ticket exigem reaproveitamento da base madura para reduzir regressao.
  - Impacto: a extracao deve preferir mover helpers existentes e estabilizar testes, nao duplicar funcoes sob nomes novos.
- 2026-03-23 - Decisao: preservar os contratos de estado e notificacao ja consumidos pelo runner (`TicketNotificationDelivery/Failure` e `FlowNotificationDelivery/Failure`) sempre que possivel, adaptando o resultado generico dentro do `TelegramController`.
  - Motivo: RF-13 e CA-07 pedem continuidade do `/status`; trocar os contratos sem necessidade aumenta o risco de regressao.
  - Impacto: `src/types/ticket-final-summary.ts`, `src/types/flow-timing.ts` e `src/core/runner.ts` so devem mudar se a compatibilidade nao puder ser preservada localmente.
- 2026-03-23 - Decisao: explicitar politicas declarativas por tipo logico de mensagem, com pelo menos `ticket-final-summary`, `run-flow-summary` e `run-specs-triage-milestone`.
  - Motivo: RF-04 e RF-15 pedem politica declarativa e logging padronizado, sem colapsar tudo em um unico comportamento opaco.
  - Impacto: o componente central precisa carregar `policy` e `logicalMessageType` no log e aceitar chunking configuravel por politica.
- 2026-03-23 - Decisao: manter as mensagens de log de alto nivel ja conhecidas pelos testes e operadores, mas padronizar o schema de contexto (`destinationChatId`, `policy`, `logicalMessageType`, `attempts`, `errorClass`, `errorCode`, `result`) dentro da camada central.
  - Motivo: isso reduz churn operacional e preserva rastreabilidade historica sem abrir mao do contrato de observabilidade exigido pela spec.
  - Impacto: a padronizacao ficou no payload do log, enquanto os tres fluxos criticos continuam com mensagens humanas especificas.

## Outcomes & Retrospective
- Status final: implementacao e validacao automatizada concluidas; validacao manual em ambiente real permanece pendente.
- O que funcionou:
  - o ticket e a spec ja deixam claro o recorte funcional, as restricoes e as validacoes criticas;
  - o repositorio ja possui cobertura suficiente para apoiar uma extracao incremental, sem abrir um redesign amplo da integracao Telegram;
  - a extracao para `src/integrations/telegram-delivery.ts` permitiu centralizar retry, backoff, classificacao, chunking e logging sem propagar churn para o runner.
- O que ficou pendente:
  - smoke manual em ambiente real.
- Proximos passos:
  - executar a validacao manual do milestone de `/run_specs` com falha transitoria simulada em chat autorizado;
  - manter qualquer migracao adicional de mensagens fora deste plano, salvo o minimo necessario para nao quebrar compatibilidade local.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md`
  - `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `INTERNAL_TICKETS.md`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/main.ts`
  - `src/types/flow-timing.ts`
  - `src/types/ticket-final-summary.ts`
  - `src/types/state.ts`
- Spec de origem: `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-03, RF-04, RF-05, RF-06, RF-07, RF-11, RF-12, RF-13, RF-15, RF-16, RF-18
  - CA-01, CA-02, CA-03, CA-06, CA-07, CA-09, CA-11
- RNFs e restricoes herdados que precisam ficar observaveis neste ticket:
  - logging padronizado por envio com destino, politica, tipo logico, tentativas, classe/codigo de erro e resultado final;
  - falha estruturada e acionavel para notificacoes criticas;
  - compatibilidade com o estado observavel do runner em `/status`;
  - manter o fluxo sequencial do runner;
  - nao introduzir persistencia, outbox, storage adicional ou replay apos restart;
  - preservar Telegraf como integracao;
  - nao mover logica de negocio do runner para a camada de transporte;
  - evitar colapsar regras editoriais junto do transporte robusto.
- Assumptions / defaults adotados:
  - `TelegramController` continua resolvendo `notificationChatId` e montando o conteudo editorial das mensagens; a nova camada so recebe destino, payload textual, politica e metadados observaveis;
  - a camada central sera materializada em `src/integrations/telegram-delivery.ts`, para manter um caminho canonico unico e auditavel;
  - a primeira versao precisa cobrir envio simples de texto e chunking configuravel; suporte a `reply_markup` e `message_id` pode ser preparado de forma pass-through, mas nao precisa ser migrado neste ticket;
  - `sendRunSpecsTriageMilestone(...)` pode continuar com retorno `Promise<void>` para preservar o wiring atual, desde que internamente use a camada central e gere logging/politica explicita;
  - o runner deve continuar recebendo os metadados de entrega/falha dos resumos finais no formato atual, salvo mudanca minima e justificada de compatibilidade.
- Fluxo atual relevante:
  - `src/main.ts` conecta `TicketRunner` a `TelegramController` via `notifyTicketFinalSummary`, `runSpecsEventHandlers.onTriageMilestone` e `runFlowEventHandlers.onFlowCompleted`;
  - `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)` fazem retry/classificacao/backoff localmente em `src/integrations/telegram-bot.ts`;
  - `sendRunSpecsTriageMilestone(...)` envia direto via `bot.telegram.sendMessage(...)`, sem retry, sem falha estruturada e sem politica padronizada;
  - `src/core/runner.ts` preserva os ultimos eventos/notificacoes e `src/integrations/telegram-bot.ts` expoe esses dados em `/status`.

## Plan of Work
- Milestone 1 - Extrair o nucleo canonico de entrega critica
  - Entregavel: existe um componente central nomeado de entrega Telegram, orientado por politica, que encapsula envio, retry bounded, backoff, classificacao de erro, chunking e logging padronizado.
  - Evidencia de conclusao: os loops e helpers duplicados deixam de ficar espalhados entre `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)`, e passam a viver no novo componente.
  - Arquivos esperados:
    - `src/integrations/telegram-delivery.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 2 - Migrar os tres envios criticos para delegacao por politica
  - Entregavel: `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)` delegam o transporte para a camada central com politicas explicitas.
  - Evidencia de conclusao: o milestone de `/run_specs` deixa de usar envio bruto, e os resumos finais continuam produzindo resultado estruturado compativel com o runner.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/types/ticket-final-summary.ts` e `src/types/flow-timing.ts` apenas se adaptacao de contrato for inevitavel
    - `src/core/runner.ts` apenas se compatibilidade de estado exigir ajuste minimo
- Milestone 3 - Preservar observabilidade critica e `/status`
  - Entregavel: sucesso/falha dos resumos finais continuam alimentando `lastNotifiedEvent`, `lastNotificationFailure`, `lastRunFlowNotificationEvent` e `lastRunFlowNotificationFailure` sem perda de metadados.
  - Evidencia de conclusao: testes do runner e do `/status` continuam verdes e exibem tentativas, classe/codigo de erro e destino.
  - Arquivos esperados:
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `src/types/state.ts` apenas se houver ajuste estritamente necessario
- Milestone 4 - Fechar a validacao observavel e o smoke manual
  - Entregavel: suite direcionada e regressao completa verdes, mais roteiro manual para o milestone de `/run_specs` com falha transitoria simulada.
  - Evidencia de conclusao: comandos de teste e auditoria abaixo concluidos com sucesso, e a validacao manual confirma que o marco chega antes da rodada `/run_all`.
  - Arquivos esperados:
    - artefatos de teste
    - logs locais do smoke manual

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "sendTicketFinalSummary|sendRunFlowSummary|sendRunSpecsTriageMilestone|bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/main.ts src/core/runner.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para reconfirmar os pontos de extracao, o wiring e a cobertura existente.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/integrations/telegram-delivery.ts` com:
   - definicao de politica declarativa por tipo logico de mensagem critica;
   - encapsulamento de `sendMessage(...)`, retry bounded, backoff, classificacao de erro, chunking configuravel e logging padronizado;
   - resultado generico suficiente para adaptacao em `TicketNotificationDelivery/Failure` e `FlowNotificationDelivery/Failure`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para:
   - injetar/instanciar a camada central dentro do proprio `TelegramController`;
   - migrar `sendTicketFinalSummary(...)` para delegar envio e mapear sucesso/falha para o contrato atual do ticket final;
   - migrar `sendRunFlowSummary(...)` para delegar envio chunkado e mapear sucesso/falha para o contrato atual de fluxo;
   - migrar `sendRunSpecsTriageMilestone(...)` para usar a camada central com politica explicita e logging padronizado, removendo o envio bruto atual;
   - manter a composicao editorial das mensagens no controller e/ou helpers ja existentes.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/ticket-final-summary.ts`, `src/types/flow-timing.ts`, `src/types/state.ts` e `src/core/runner.ts` somente se a camada central exigir ajuste minimo de compatibilidade; preferir adaptacao local no controller antes de expandir contratos compartilhados.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.test.ts` para:
   - preservar assercoes atuais de resumo final por ticket e por fluxo;
   - adicionar cobertura explicita de politica/logical message type nos logs;
   - provar retry e falha definitiva agora pelo caminho central;
   - provar que `sendRunSpecsTriageMilestone(...)` tambem faz retry bounded em falha transitoria e nao usa mais envio bruto;
   - provar que chunking do resumo final de fluxo continua funcional a partir da camada central.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts` para confirmar que:
   - o runner continua registrando ultimo evento entregue e ultima falha definitiva dos resumos finais;
   - `/status` continua exibindo destino, tentativas, classe/codigo de erro e separacao entre ultimo sucesso e ultima falha;
   - nenhuma regressao foi introduzida no handoff `runner -> TelegramController`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validar a camada central, os tres envios criticos e o estado observavel do runner.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se for criado um teste dedicado para o novo modulo, rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validar o nucleo em isolamento e sua integracao.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao completa do repositorio.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem e contratos apos a extracao.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir compilacao do fluxo completo.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/main.ts src/core/runner.ts src/types/state.ts src/types/ticket-final-summary.ts src/types/flow-timing.ts src/integrations` para auditoria final de escopo, confirmando que a entrega ficou restrita ao recorte critico.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar manualmente, em chat real autorizado, um `/run_specs <spec>` com falha transitoria simulada no transporte Telegram antes do sucesso do milestone e confirmar visualmente que:
   - o milestone de triagem e entregue;
   - o log registra retry e resultado final;
   - a rodada `/run_all` segue acionavel apos a entrega do marco.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01, RF-03, RF-04; CA-01
    - Evidencia observavel: existe um componente central nomeado em `src/integrations` para entrega Telegram, e `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)` deixam de concentrar localmente retry/classificacao/chunking.
    - Comando: `rg -n "sendTicketFinalSummary|sendRunFlowSummary|sendRunSpecsTriageMilestone|bot\\.telegram\\.sendMessage\\(|policy|logicalMessageType" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
    - Esperado: o novo componente aparece como ponto canonico de entrega; os tres metodos criticos do controller delegam para ele e o envio bruto desses fluxos nao fica mais embutido no proprio metodo.
  - Requisito: RF-05, RF-06, RF-12; CA-02, CA-09
    - Evidencia observavel: retry bounded, backoff, classificacao de erro e falha estruturada seguem funcionando para resumos finais por ticket e por fluxo apos a extracao.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: os testes de resumo final por ticket e por fluxo passam validando tentativas, `maxAttempts`, `retryable`, `errorClass`, `errorCode`, `chunkCount` e falha definitiva via o novo caminho central.
  - Requisito: RF-15; CA-09
    - Evidencia observavel: sucesso, falha transitoria e falha definitiva registram logging padronizado com destino, politica, tipo logico da mensagem, tentativas, classe/codigo de erro e resultado final.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: assercoes de logger ficam verdes tanto nos cenarios de sucesso quanto nos cenarios de retry e falha definitiva dos tres envios criticos.
  - Requisito: RF-07; CA-03
    - Evidencia observavel: o milestone de triagem de `/run_specs` deixa de usar envio bruto e passa a usar a camada central com politica explicita e cobertura automatizada de retry.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: os testes de `sendRunSpecsTriageMilestone(...)` passam cobrindo sucesso normal e pelo menos um cenario de falha transitoria seguida de entrega, sem caminho bruto paralelo.
  - Requisito: RF-11; CA-06
    - Evidencia observavel: chunking configuravel continua existindo como responsabilidade da camada central e segue coberto por teste automatizado.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: o teste de resumo final de fluxo grande continua verde, com `chunkCount` coerente e mensagens `Parte x/n` emitidas pelo caminho central.
  - Requisito: RF-13; CA-07
    - Evidencia observavel: `/status` continua expondo ultimo evento critico entregue e ultima falha definitiva com tentativas, classe de erro e destino, sem perder a separacao entre sucesso anterior e falha mais recente.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes do runner e do status continuam verdes verificando `lastRunFlowNotificationEvent`, `lastRunFlowNotificationFailure`, `lastNotifiedEvent` e `lastNotificationFailure`.
  - Requisito: RF-16, RF-18; CA-11
    - Evidencia observavel: o diff nao introduz outbox, persistencia ou storage adicional, e o handoff `main.ts -> TelegramController -> runner` continua preservado.
    - Comando: `git diff -- src/main.ts src/core/runner.ts src/integrations src/config src/types`
    - Esperado: a mudanca fica restrita ao layer de integracao e testes, sem novos mecanismos de persistencia duravel nem deslocamento de logica de negocio do runner para o transporte.
  - Requisito: validacao manual pendente relevante do ticket
    - Evidencia observavel: em ambiente real, um `/run_specs` com falha transitoria simulada no envio do milestone ainda entrega o marco com retry e permite continuidade para a rodada `/run_all`.
    - Comando: execucao manual de `/run_specs <spec>` em chat autorizado, com simulacao controlada de falha transitoria de transporte Telegram.
    - Esperado: o milestone chega ao chat com comportamento robusto observavel, os logs mostram retry e resultado final, e o operador continua com o marco acionavel antes do `/run_all`.
- Regressao complementar obrigatoria:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: suite completa verde sem regressao em fluxos de runner, Telegram e estado.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde sem divergencia entre contratos compartilhados e a nova camada central.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: build concluida com sucesso.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a extracao deve manter um unico ponto canonico de entrega critica, sem reintroduzir loops duplicados no controller;
  - rerodar testes e checks nao deve gerar efeitos colaterais fora do working tree local;
  - rerodar o smoke manual pode reenviar o milestone, mas nao deve alterar contratos persistidos do runner alem do estado normal de execucao.
- Riscos:
  - extrair helpers demais e acoplar a nova camada a mensagens conversacionais ainda fora do escopo;
  - quebrar o contrato do `/status` ao alterar metadados de falha/sucesso dos resumos finais;
  - tratar o milestone de `/run_specs` como resumo final completo e ampliar indevidamente o estado do runner;
  - introduzir regressao sutil de duplicidade em cenarios extremos de timeout apos entrega remota, risco residual ja aceito pela ausencia de outbox/exactly-once.
- Recovery / Rollback:
  - se a extracao causar regressao ampla, reduzir o recorte para um componente central usado apenas pelos tres metodos alvo e manter outras chamadas diretas intactas;
  - se o contrato de estado do runner quebrar, restaurar os tipos atuais e adaptar o resultado generico no `TelegramController`, em vez de propagar churn pelo dominio;
  - se o milestone de `/run_specs` ficar ruidoso demais, manter politica robusta com payload editorial atual e ajustar so os metadados de log/politica;
  - se algum teste revelar que chunking ou retry ficou acoplado a um fluxo especifico, mover a regra de volta para o componente central antes de continuar a migracao.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md`
- Spec de origem:
  - `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- Checklist aplicado no planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita da spec de origem, subset de RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria para matriz `requisito -> validacao observavel`;
  - declaracao de riscos residuais e do nao-escopo;
  - amarracao do smoke manual ao closure criterion manual do proprio ticket.
- Referencias tecnicas consumidas:
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/main.ts`
  - `src/types/flow-timing.ts`
  - `src/types/ticket-final-summary.ts`
  - `src/types/state.ts`
- Tickets correlatos fora do escopo direto:
  - `tickets/open/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md`
  - `tickets/open/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md`
- Artefatos esperados ao final da execucao:
  - novo modulo central de entrega Telegram em `src/integrations`;
  - diff restrito ao layer de integracao, contratos estritamente necessarios e testes;
  - logs automatizados e/ou outputs de teste provando retry, falha definitiva, chunking, milestone robusto e preservacao de `/status`.
- Nota de qualidade: o checklist de `docs/workflows/codex-quality-gates.md` foi aplicado apenas para garantir completude do handoff; toda a validacao operacional acima nasce dos closure criteria do ticket.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - API interna do novo componente de entrega Telegram critica, com politica declarativa e resultado generico de sucesso/falha;
  - `TelegramController.sendTicketFinalSummary(...)`, `TelegramController.sendRunFlowSummary(...)` e `TelegramController.sendRunSpecsTriageMilestone(...)`;
  - contratos de `TicketNotificationDelivery/Failure` e `FlowNotificationDelivery/Failure` apenas se a adaptacao local nao for suficiente;
  - testes de Telegram e runner que validam logs, chunking, retry e `/status`.
- Compatibilidade:
  - `main.ts` deve continuar delegando ao `TelegramController`, sem obrigar o runner a conhecer politicas Telegram;
  - o fluxo sequencial do runner permanece inalterado;
  - o milestone de `/run_specs` ganha robustez de entrega, mas nao passa a competir com o resumo final no estado observavel.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - uso continuado de Telegraf via `bot.telegram.sendMessage(...)`;
  - mocks atuais de `sendMessage` em `src/integrations/telegram-bot.test.ts`;
  - uso continuado das suites de `src/core/runner.test.ts` para validar o estado do runner e `/status`.
