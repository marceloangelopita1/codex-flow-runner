# ExecPlan - Notificacao de conclusao da triagem no fluxo /run_specs

## Purpose / Big Picture
- Objetivo: adicionar notificacao proativa no Telegram ao finalizar a triagem de spec em `/run_specs`, antes do handoff para a rodada de tickets, cobrindo sucesso e falha de fechamento.
- Resultado esperado:
  - ao concluir `spec-close-and-version` com sucesso, o operador recebe marco explicito de triagem concluida e inicio iminente de `/run-all`;
  - ao falhar em `spec-close-and-version`, o operador recebe marco explicito de bloqueio com motivo acionavel;
  - o comportamento vale tanto para disparo por comando `/run_specs` quanto por callback de `/specs` (mesmo destino de notificacao capturado pelo bot);
  - fluxo sequencial permanece inalterado (sem paralelizacao de tickets).
- Escopo:
  - introduzir canal de lifecycle dedicado para milestones de `run_specs` no runner;
  - emitir eventos de milestone no `runSpecsAndRunAll` em pontos de fronteira de fase;
  - fazer wiring em `src/main.ts` para encaminhar milestone ao Telegram;
  - ampliar `TelegramController` para envio proativo desse milestone no chat de notificacao;
  - cobrir testes automatizados em runner e Telegram para sucesso/falha e para origem comando/callback.
- Fora de escopo:
  - alterar politica de retry/backoff de notificacoes finais por ticket;
  - alterar contratos de lifecycle de `/plan_spec` e `/codex_chat` alem do necessario para manter compatibilidade;
  - mudar sequencialidade do fluxo (`run_specs` continua pre-fase de `run_all` sem concorrencia).

## Progress
- [x] 2026-02-27 03:36Z - Ticket, referencias e pontos de codigo relevantes analisados.
- [x] 2026-02-27 03:36Z - Escopo tecnico, milestones e criterios observaveis definidos.
- [x] 2026-02-27 04:30Z - Contrato de lifecycle de `run_specs` implementado no runner.
- [x] 2026-02-27 04:31Z - Wiring runner -> main -> Telegram concluido.
- [x] 2026-02-27 04:34Z - Cobertura automatizada para sucesso/falha e origem comando/callback concluida.
- [x] 2026-02-27 04:36Z - Validacao final (`test`, `check`, `build`) e evidencias consolidadas.
- [x] 2026-02-27 - Fechamento operacional do ticket concluido com classificacao `GO`, commit/push e movendo `tickets/open` -> `tickets/closed`.

## Surprises & Discoveries
- 2026-02-27 03:36Z - `requestRunSpecs` e `runSpecsAndRunAll` ja existem, mas a conclusao da triagem gera apenas `touchSlot` e logs internos; nao ha emissor proativo equivalente ao de `/plan_spec` e `/codex_chat`.
- 2026-02-27 03:36Z - `TicketRunnerOptions` hoje expoe handlers de lifecycle apenas para `plan_spec` e `codex_chat`.
- 2026-02-27 03:36Z - `main.ts` ja faz wiring de lifecycle para Telegram nesses dois fluxos, mas nao para milestones de `run_specs`.
- 2026-02-27 03:36Z - `TelegramController` ja possui `notificationChatId` (capturado por `/run_all`, `/run_specs` e callback de `/specs`), o que permite envio proativo sem exigir chatId no contrato do runner.
- 2026-02-27 03:36Z - `/status` ja reflete `currentSpec` e fases de spec; o gap e de notificacao proativa na fronteira triagem -> tickets.

## Decision Log
- 2026-02-27 - Decisao: criar handler dedicado para lifecycle de `run_specs` no runner (em vez de reutilizar `planSpecEventHandlers`).
  - Motivo: reduzir acoplamento semantico e manter contratos explicitos por fluxo.
  - Impacto: ajuste de `TicketRunnerOptions`, helper de emissao e wiring em `main.ts`.
- 2026-02-27 - Decisao: emissao de milestone em dois pontos obrigatorios.
  - Motivo: cobrir criterios do ticket com sinais claros de sucesso (handoff) e falha (bloqueio).
  - Impacto: `runSpecsAndRunAll` passa a emitir mensagem apos sucesso de fechamento e no catch de erro com classificacao de etapa.
- 2026-02-27 - Decisao: envio Telegram de milestone de `run_specs` deve ser best-effort e nao bloquear o fluxo principal.
  - Motivo: preservar robustez operacional do pipeline sequencial.
  - Impacto: falhas de envio devem gerar warning observavel, mantendo execucao do runner.
- 2026-02-27 - Decisao: reutilizar `notificationChatId` do `TelegramController` para cobrir comando e callback.
  - Motivo: manter comportamento consistente com notificacoes ja existentes por ticket.
  - Impacto: metodo de envio de milestone de `run_specs` no Telegram nao precisa de chatId explicito.
- 2026-02-27 - Decisao: evento de lifecycle de `run_specs` carregara payload estruturado (`spec`, `outcome`, `finalStage`, `nextAction`, `details`) e o render final da mensagem ficara no TelegramController.
  - Motivo: manter separacao de responsabilidades entre core (evento) e integracao (apresentacao).
  - Impacto: testes cobrem o contrato em `runner` e o texto final em `telegram-bot`.

## Outcomes & Retrospective
- Status final: implementacao e validacao tecnica concluidas, com ticket fechado no mesmo ciclo (`GO` com validacao manual externa pendente).
- O que funcionou: extensao do contrato de lifecycle no runner com wiring para Telegram manteve compatibilidade com fluxos existentes e preservou sequencialidade.
- O que ficou pendente: validacao manual externa no Telegram real para aceite operacional completo da notificacao de milestone.
- Evidencias principais: `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check`, `npm run build` (todos verdes).

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - orquestracao de `requestRunSpecs`/`runSpecsAndRunAll` e contratos de lifecycle.
  - `src/main.ts` - wiring de handlers de lifecycle para Telegram.
  - `src/integrations/telegram-bot.ts` - envio de mensagens proativas e captura de chat de notificacao.
  - `src/core/runner.test.ts` - cobertura de sucesso/falha de `run_specs` e transicoes de fase.
  - `src/integrations/telegram-bot.test.ts` - cobertura de comandos, callbacks e envio de notificacoes no bot.
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` - contrato funcional de triagem/handoff.
  - `docs/specs/2026-02-19-telegram-run-status-notification.md` - contrato de observabilidade no Telegram.
- Fluxo atual (as-is):
  - `/run_specs` executa triagem e, em sucesso, chama `runForever`; em falha, bloqueia rodada.
  - operador recebe mensagem inicial do comando e depois resumos por ticket; marco de conclusao da triagem nao e enviado proativamente.
- Fluxo alvo (to-be):
  - na fronteira de conclusao da triagem, Telegram recebe milestone explicito de sucesso/falha antes da continuidade/bloqueio do fluxo.
- Restricoes tecnicas:
  - Node.js 20+ e TypeScript ESM.
  - arquitetura em camadas (`core`, `integrations`, `config`).
  - fluxo estritamente sequencial por ticket/spec.
  - sem dependencias externas novas para esta evolucao.

## Plan of Work
- Milestone 1 - Contrato de lifecycle de `run_specs` no core
  - Entregavel: novo contrato de evento para milestones de triagem de spec no `TicketRunner`.
  - Evidencia de conclusao: `TicketRunnerOptions` suporta handler dedicado e compilacao preserva compatibilidade dos fluxos existentes.
  - Arquivos esperados: `src/core/runner.ts`.
- Milestone 2 - Emissao de milestones no `runSpecsAndRunAll`
  - Entregavel: emissao proativa no sucesso (antes de iniciar tickets) e na falha (incluindo bloqueio por `spec-close-and-version`).
  - Evidencia de conclusao: logs/estado + chamadas do handler mostram exatamente um marco por caminho de conclusao.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 3 - Wiring para Telegram
  - Entregavel: `main.ts` encaminha lifecycle de `run_specs` ao bot e `TelegramController` envia mensagem no chat de notificacao.
  - Evidencia de conclusao: envio proativo ocorre usando `notificationChatId` capturado por comando ou callback.
  - Arquivos esperados: `src/main.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Cobertura automatizada de comando e callback
  - Entregavel: testes cobrindo origem por `/run_specs` e por callback de `/specs`, com entrega de milestone no chat correto.
  - Evidencia de conclusao: testes verdes demonstram notificacao apos captura de chat em ambos os caminhos.
  - Arquivos esperados: `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Validacao final e rastreabilidade
  - Entregavel: suites de teste/check/build verdes e documentacao de evidencias para aceite do ticket.
  - Evidencia de conclusao: comandos de validacao com sucesso e artefatos atualizados.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`, `docs/specs/2026-02-19-telegram-run-status-notification.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "runSpecsAndRunAll|requestRunSpecs|planSpecEventHandlers|codexChatEventHandlers|sendPlanSpecMessage|captureNotificationChat" src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts` para mapear pontos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para incluir contrato de handler dedicado a lifecycle de `run_specs` no `TicketRunnerOptions`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar helper de emissao de lifecycle de `run_specs` com tratamento de erro nao bloqueante (warning + continuidade do fluxo).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `runSpecsAndRunAll` em `src/core/runner.ts` para emitir:
   - sucesso da triagem apos `spec-close-and-version` e antes de `runForever`;
   - falha de triagem com mensagem acionavel, diferenciando bloqueio em `spec-close-and-version`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` para fazer wiring do novo handler de `run_specs` para `TelegramController`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para adicionar metodo de envio de milestone de `run_specs` para `notificationChatId` (com warning quando chat nao estiver definido).
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar mensagens de milestone no `telegram-bot` para incluir contexto minimo: spec, resultado, fase final e proxima acao.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios de emissao de milestone em sucesso e em falha de `spec-close-and-version`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com cenarios de envio da notificacao de `run_specs` apos captura de chat por:
   - comando `/run_specs`;
   - callback de selecao via `/specs`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar status/evidencias nas specs relacionadas (`docs/specs/2026-02-19-approved-spec-triage-run-specs.md` e `docs/specs/2026-02-19-telegram-run-status-notification.md`) com o novo comportamento observavel.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-approved-spec-triage-run-specs.md docs/specs/2026-02-19-telegram-run-status-notification.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: testes comprovam emissao de milestone de `run_specs` em sucesso e falha sem quebrar o fail-gate/handoff existente.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: notificacao de milestone usa chat correto apos inicio por comando `/run_specs` e por callback `/specs`.
- Comando: `npm test`
  - Esperado: suite completa passa sem regressao em comandos existentes e sem regressao de notificacao final por ticket.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erro apos extensao dos contratos de lifecycle.
- Comando: `rg -n "runSpecs|lifecycle|triagem|spec-close-and-version" src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts`
  - Esperado: wiring runner -> main -> Telegram explicito e alinhado ao novo milestone.
- Criterios de aceite cobertos:
  - notificacao proativa em sucesso da triagem antes de iniciar tickets;
  - notificacao proativa em falha de fechamento bloqueando `run_all`;
  - mensagem com contexto minimo (spec, resultado, fase final, proxima acao);
  - cobertura automatizada para caminho de comando e callback;
  - `/status` permanece coerente sem quebra de campos existentes.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os testes nao deve criar efeitos colaterais alem dos artefatos esperados de teste;
  - reexecutar `/run_specs` apos correcao de erro deve produzir novo milestone coerente sem duplicar estado interno.
- Riscos:
  - risco de duplicidade de mensagens se emissao for disparada em mais de um ponto da fronteira triagem->tickets;
  - risco de perda de notificacao quando `notificationChatId` nao estiver definido (modo sem restricao sem comando/callback previo);
  - risco de regressao de contrato ao ampliar `TicketRunnerOptions`.
- Recovery / Rollback:
  - se houver duplicidade, concentrar emissao em ponto unico de conclusao por caminho (sucesso/falha) e reforcar assert em teste;
  - se chat nao estiver definido, manter warning explicito e orientar operador a iniciar fluxo via comando/callback antes do ciclo;
  - se houver regressao de contrato, reverter assinatura para estado anterior e reaplicar mudanca com adapter minimo.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-27-run-specs-missing-triage-completion-notification-gap.md`.
- Referencias obrigatorias consumidas:
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
  - `docs/specs/2026-02-19-telegram-run-status-notification.md`
  - `execplans/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md`
  - `tickets/closed/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md`
- Pontos de codigo analisados para este plano:
  - `src/core/runner.ts` (`runSpecsAndRunAll`, contratos de lifecycle de `plan_spec` e `codex_chat`)
  - `src/main.ts` (wiring de handlers para Telegram)
  - `src/integrations/telegram-bot.ts` (`notificationChatId`, `/run_specs`, callback `/specs`, envio de mensagens)
  - `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`
- Evidencias esperadas de aceite:
  - saida verde dos testes focados e suite completa;
  - diff dos arquivos alvo com novo contrato de lifecycle e mensagens de milestone;
  - atualizacao de status/evidencias nas specs relacionadas.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `TicketRunnerOptions` recebe handler dedicado de lifecycle para `run_specs`.
  - `TicketRunner` ganha helper interno de emissao para milestones de triagem de spec.
  - `TelegramController` ganha metodo publico para enviar milestone de `run_specs` usando `notificationChatId`.
- Compatibilidade:
  - contratos existentes de `/run_all`, `/run_specs`, `/status`, `/plan_spec` e `/codex_chat` permanecem validos;
  - fail-gate de `spec-close-and-version` e handoff para `run_all` permanecem sem mudanca funcional;
  - sequencialidade global continua preservada.
- Dependencias externas e mocks:
  - envio usa `telegraf` (`sendMessage`) sem novas dependencias.
  - testes devem usar mocks/stubs locais de runner/bot sem chamada real de rede.
