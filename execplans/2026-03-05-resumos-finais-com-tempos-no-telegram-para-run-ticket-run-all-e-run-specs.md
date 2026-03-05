# ExecPlan - Resumos finais com tempos no Telegram para run-ticket, run-all e run_specs

## Purpose / Big Picture
- Objetivo: publicar no Telegram resumos finais com tempos por fase/prompt e tempo total para `run-ticket`, `run-all` e `run_specs`, incluindo dados parciais em falha.
- Resultado esperado:
  - `run-ticket` passa a exibir tempos no resumo final por ticket;
  - milestone de triagem de `run_specs` passa a exibir tempos de triagem;
  - resumo final consolidado de fluxo (`run-all` e `run_specs`) passa a ser enviado ao chat de notificacao com tempos;
  - formato textual permanece legivel e deterministico, sem alterar sequencialidade.
- Escopo:
  - evoluir renderizacao de mensagens em `src/integrations/telegram-bot.ts` para incluir blocos temporais;
  - implementar envio efetivo de resumo final de fluxo no Telegram a partir de `sendRunFlowSummary`;
  - ajustar/estender testes de Telegram para validar contratos textuais com tempos em sucesso e falha.
- Fora de escopo:
  - alterar contrato temporal do runner (fundacao ja entregue no ticket pai fechado);
  - adicionar persistencia historica de metricas;
  - alterar politica de concorrencia/paralelizacao dos fluxos.

## Progress
- [x] 2026-03-05 02:29Z - Leitura completa do ticket alvo e da spec relacionada concluida.
- [x] 2026-03-05 02:29Z - Leitura das referencias de codigo/testes e do `PLANS.md` concluida.
- [x] 2026-03-05 02:33Z - Renderizacao temporal de `run-ticket` e milestone de `run_specs` implementada.
- [x] 2026-03-05 02:34Z - Envio de resumo final de fluxo (`run-all` e `run_specs`) implementado no Telegram.
- [x] 2026-03-05 02:35Z - Testes automatizados atualizados para contratos temporais de mensagem.
- [x] 2026-03-05 02:37Z - Validacao final (`test`, `check`, `build`) concluida sem regressao.

## Surprises & Discoveries
- 2026-03-05 02:29Z - O parent ticket referenciado no ticket alvo ja esta fechado em `tickets/closed/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md` (nao mais em `tickets/open/`).
- 2026-03-05 02:29Z - `TicketFinalSummary` e `RunnerFlowSummary` ja carregam snapshots temporais completos, mas `buildTicketFinalSummaryMessage` e `buildRunSpecsTriageMilestoneMessage` ainda nao os exibem (`src/integrations/telegram-bot.ts:4569-4612`).
- 2026-03-05 02:29Z - `sendRunFlowSummary` recebe o resumo final de fluxo, mas hoje apenas registra log e nao envia mensagem (`src/integrations/telegram-bot.ts:938-956`).
- 2026-03-05 02:29Z - Testes atuais de resumo final/milestone validam texto funcional sem asserts de tempos (`src/integrations/telegram-bot.test.ts:4300-4360`, `src/integrations/telegram-bot.test.ts:4208-4298`).
- 2026-03-05 02:36Z - `npm test` apresentou uma falha intermitente de timeout em `requestRunSpecs ... transita para fase de ticket`; rerun imediato passou integralmente (sinal de flakiness, sem regressao deterministica).

## Decision Log
- 2026-03-05 - Decisao: criar renderizacao temporal reutilizavel no `TelegramController` para evitar divergencia de formato entre `run-ticket`, milestone de triagem e resumo de fluxo.
  - Motivo: manter consistencia textual e reduzir risco de regressao em manutencao futura.
  - Impacto: introduz helpers internos de formatacao (duracoes por fase + total + metadados de interrupcao).
- 2026-03-05 - Decisao: manter ordem deterministica de fases com listas explicitas por fluxo (`ticket`, `run-all`, `run-specs triage`, `run-specs flow`), exibindo apenas fases medidas.
  - Motivo: atender criterio de determinismo sem inventar dados para fases nao executadas.
  - Impacto: falhas exibem snapshot parcial com `interruptedStage` e duracoes existentes.
- 2026-03-05 - Decisao: `sendRunFlowSummary` deve ser best-effort e nao bloquear runner; quando `notificationChatId` estiver ausente, registrar warning estruturado.
  - Motivo: preservar robustez operacional do loop sequencial.
  - Impacto: fluxo principal continua mesmo com indisponibilidade de destino de notificacao.

## Outcomes & Retrospective
- Status final: concluido (`GO`).
- O que funcionou:
  - helpers temporais reutilizaveis passaram a ser usados por `run-ticket`, milestone de triagem e resumo final de fluxo.
  - `sendRunFlowSummary` passou de log-only para envio best-effort no Telegram, com warning estruturado quando nao ha chat capturado.
  - validacoes automatizadas ficaram verdes em `npx tsx --test src/integrations/telegram-bot.test.ts`, `npx tsx --test src/core/runner.test.ts`, `npm test`, `npm run check` e `npm run build`.
- O que ficou pendente:
  - validacao manual externa em ambiente Telegram real (fora do escopo do agente), sem bloqueio tecnico para entrega.
- Proximos passos:
  - executar smoke operacional no bot real para confirmar o texto final em canal produtivo.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts`:
    - `buildTicketFinalSummaryMessage` sem tempos (`:4569-4594`);
    - `buildRunSpecsTriageMilestoneMessage` sem tempos (`:4596-4612`);
    - `sendRunFlowSummary` sem envio de mensagem (`:938-956`).
  - `src/core/runner.ts`:
    - emite milestone de triagem com `timing` (`:2756-2762`, `:2835-2842`);
    - emite resumo final de fluxo para `run-all` e `run-specs` (`:2584-2594`, `:3212-3238`, `:2879-2893`).
  - `src/main.ts`:
    - wiring de `runFlowEventHandlers.onFlowCompleted` para `telegram.sendRunFlowSummary` (`:184-196`).
  - `src/integrations/telegram-bot.test.ts`:
    - fixtures com snapshots temporais (`:75-101`, `:1312-1363`);
    - cobertura atual de resumo final/milestone sem asserts de tempos (`:4208-4298`, `:4300-4360`).
- Fluxo atual (as-is):
  - tempos existem nos payloads do core, mas nao chegam ao texto enviado no Telegram para os pontos alvo.
  - resumo final de fluxo chega ao `TelegramController`, porem e descartado em log.
- Restricoes tecnicas:
  - manter arquitetura em camadas e sem novas dependencias.
  - manter processamento sequencial de tickets/specs.
  - preservar compatibilidade com status e mensagens existentes, adicionando somente informacao temporal necessaria.

## Plan of Work
- Milestone 1 - Canonizar formato temporal do Telegram
  - Entregavel: helpers internos para formatar duracao total e duracoes por fase em ordem deterministica.
  - Evidencia de conclusao: codigo de renderizacao reutilizado por todas as mensagens alvo sem duplicacao manual.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
- Milestone 2 - Enriquecer resumo final de `run-ticket` e milestone de triagem de `run_specs`
  - Entregavel: mensagens passam a incluir tempos por fase/prompt e total, com snapshot parcial em falha.
  - Evidencia de conclusao: testes de `sendTicketFinalSummary` e `sendRunSpecsTriageMilestone` validam linhas temporais.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 3 - Publicar resumo final de fluxo para `run-all` e `run_specs`
  - Entregavel: `sendRunFlowSummary` envia mensagem no chat de notificacao com detalhes de fluxo + tempos.
  - Evidencia de conclusao: novos testes comprovam envio em sucesso/falha, inclusive sem chat capturado (warning).
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 4 - Validar regressao e aceite do ticket
  - Entregavel: suites de teste e checks verdes, com rastreabilidade das CAs no resultado.
  - Evidencia de conclusao: comandos de validacao passam e diff final mostra apenas superficies planejadas.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
    - artefatos de validacao (saida de comandos).

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "buildTicketFinalSummaryMessage|buildRunSpecsTriageMilestoneMessage|sendRunFlowSummary|notificationChatId" src/integrations/telegram-bot.ts` para confirmar pontos exatos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar em `src/integrations/telegram-bot.ts` helper(es) de formatacao temporal reutilizavel(is), com:
   - ordem fixa de fases por fluxo;
   - renderizacao de `totalDurationMs`;
   - indicacao de `interruptedStage` quando houver falha parcial.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `buildTicketFinalSummaryMessage` para incluir bloco temporal do `summary.timing` sem remover campos atuais de sucesso/falha.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `buildRunSpecsTriageMilestoneMessage` para incluir bloco temporal de triagem usando `event.timing`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar builder dedicado para resumo final de fluxo (`run-all` e `run-specs`) e acoplar em `sendRunFlowSummary`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Em `sendRunFlowSummary`, enviar mensagem para `notificationChatId`; se ausente, registrar warning estruturado com `flow`, `outcome` e `finalStage`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` cobrindo:
   - resumo final de ticket com tempos em sucesso e falha;
   - milestone de triagem de `run_specs` com tempos em sucesso e falha;
   - envio do resumo final de fluxo `run-all` e `run-specs` com tempos;
   - comportamento quando `notificationChatId` nao esta definido.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para validacao focada de mensagem/contrato.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para garantir que integracao de fluxo permanece compativel com eventos emitidos.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts` para auditoria final dos artefatos.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Com aceite validado, atualizar metadados de fechamento do ticket e mover `tickets/open/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md` para `tickets/closed/` no mesmo commit da implementacao.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: mensagens de `run-ticket`, milestone de triagem e resumo final de fluxo passam a conter:
    - tempos por fase/prompt medidos;
    - tempo total;
    - dados parciais e fase interrompida em cenarios de falha.
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: contrato de emissao de `RunnerFlowSummary` e de milestone de triagem continua verde, sem regressao comportamental.
- Comando: `npm test`
  - Esperado: suite completa sem regressao em comandos Telegram e fluxo do runner.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e compilacao sem erros.
- Criterios de aceite do ticket cobertos:
  - CA-01: resumo final de `run-ticket` com tempos por fase e total.
  - CA-02: resumo final de `run-all` com tempos por fase e total.
  - CA-03: resumo final de `run_specs` com tempos por fase e total.
  - CA-04: em falha, mensagens exibem medicoes parciais e total acumulado ate interrupcao.

## Idempotence and Recovery
- Idempotencia:
  - reexecucao dos comandos de teste/check/build nao altera estado funcional alem de artefatos temporarios de execucao;
  - renderizacao de mensagem depende somente do snapshot recebido, sem mutacao de estado global.
- Riscos:
  - divergencia de formato entre mensagens se helpers nao forem centralizados;
  - quebra de testes por regex/texto sensivel a mudancas pequenas de wording;
  - ausencia de `notificationChatId` impedir envio de resumo de fluxo em modo sem restricao.
- Recovery / Rollback:
  - se houver regressao textual ampla, reduzir mudanca para helper unico e reaplicar builders incrementalmente;
  - se envio de resumo de fluxo causar ruido, manter warning estruturado e fallback para log enquanto testes sao ajustados;
  - se compatibilidade quebrar, reverter apenas `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts`, preservando contratos do runner.

## Artifacts and Notes
- Ticket alvo:
  - `tickets/closed/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
- Spec de origem:
  - `docs/specs/2026-03-05-medicao-de-tempo-por-prompt-fase-na-execucao-de-tickets-e-specs.md`
- Parent ticket de fundacao temporal (ja fechado):
  - `tickets/closed/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md`
  - `execplans/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md`
- Referencias tecnicas usadas no planejamento:
  - `src/integrations/telegram-bot.ts:938-956`
  - `src/integrations/telegram-bot.ts:4569-4612`
  - `src/main.ts:184-196`
  - `src/core/runner.ts:2584-2594`
  - `src/core/runner.ts:2712-2893`
  - `src/core/runner.ts:3212-3238`
  - `src/integrations/telegram-bot.test.ts:75-101`
  - `src/integrations/telegram-bot.test.ts:1312-1363`
  - `src/integrations/telegram-bot.test.ts:4208-4298`
  - `src/integrations/telegram-bot.test.ts:4300-4360`

## Interfaces and Dependencies
- Interfaces alteradas (entregues):
  - metodos privados de renderizacao textual em `TelegramController` (`buildTicketFinalSummaryMessage`, `buildRunSpecsTriageMilestoneMessage`, novo builder para resumo de fluxo).
  - `sendRunFlowSummary` em `TelegramController` (de log-only para envio efetivo no Telegram).
- Compatibilidade:
  - contratos tipados recebidos do runner (`TicketFinalSummary`, `RunnerFlowSummary`, `RunSpecsTriageLifecycleEvent`) permanecem os mesmos.
  - wiring de `main.ts` para `runFlowEventHandlers.onFlowCompleted` permanece sem quebra.
  - fluxo sequencial do runner nao sofre alteracao.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - testes seguem com mocks locais de `bot.telegram.sendMessage` em `src/integrations/telegram-bot.test.ts`.
