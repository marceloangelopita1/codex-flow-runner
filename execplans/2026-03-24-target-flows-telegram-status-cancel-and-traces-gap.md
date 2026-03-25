# ExecPlan - Target flows telegram status cancel and traces gap

## Purpose / Big Picture
- Objetivo: fechar a camada compartilhada de controle operacional dos fluxos `/target_prepare`, `/target_checkup` e `/target_derive_gaps`, para que eles ocupem o mesmo plano de controle dos fluxos pesados existentes, com bloqueios coerentes, `/_status`, `/_cancel`, milestones canonicos, resumo final com CTA seguro e traces locais auditaveis.
- Resultado esperado:
  - os tres fluxos passam a aparecer como execucoes de primeira classe no estado do runner e no `/status`, com milestone atual e indicacao explicita de fronteira de versionamento;
  - durante execucao ativa de qualquer fluxo target, `/status` e `/projects` continuam disponiveis, enquanto `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados com mensagem explicita;
  - cada fluxo expoe comandos dedicados de status e cancelamento, com cancelamento cooperativo antes da fronteira de versionamento e tratamento explicito de cancelamento tardio depois dela;
  - Telegram recebe milestones curtos e canonicos, e os resumos finais carregam proxima acao contextual sem trocar implicitamente o projeto ativo;
  - `.codex-flow-runner/flow-traces/` passa a registrar comando, projeto alvo, milestone, inputs, exchanges de IA quando houverem, resultados deterministicos, sucesso/falha/cancelamento e caminhos de artefatos versionados para os tres fluxos.
- Escopo:
  - promover os fluxos target para contratos centrais de `RunnerPhase`, `RunnerSlotKind`, `RunnerState` e `RunnerFlowSummary`;
  - adicionar status/cancel dedicados para cada fluxo target na camada runner + Telegram;
  - introduzir milestones canonicos, resumo final e CTAs seguros na pipeline de notificacao do Telegram;
  - adicionar cancelamento cooperativo e fronteira de versionamento observavel aos executores target;
  - expandir a trilha local em `.codex-flow-runner/flow-traces/` para cobrir execucoes target;
  - cobrir a matriz de aceite do ticket com testes automatizados e roteiro manual de Telegram.
- Fora de escopo:
  - alterar a logica funcional central de onboarding, readiness audit ou derivacao alem do necessario para status/cancel/traces;
  - criar novos comandos top-level alem dos pares de status/cancel dos fluxos target;
  - fechar o ticket, mover arquivo para `tickets/closed/`, fazer commit/push ou rodar validacao manual externa nesta etapa de planejamento;
  - qualquer expansao de backlog funcional fora do subconjunto RF-01 (pares `/_status` e `/_cancel`), RF-29, RF-30, RF-31, RF-32, RF-33 e CAs 12-14.

## Progress
- [x] 2026-03-24 23:23Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `SPECS.md`, de `INTERNAL_TICKETS.md`, do template de ticket interno, dos ExecPlans irmaos de `target_checkup` e `target_derive_gaps`, e das superficies atuais de `runner`, `telegram`, `state`, `flow-timing`, `workflow-trace-store` e executores target.
- [x] 2026-03-25 00:21Z - Contrato compartilhado de slot/estado/timing dos fluxos target implementado em `state`, `flow-timing` e `runner`, incluindo `RunnerPhase`, `RunnerSlotKind`, `targetFlow`, bloqueios operacionais e resumos finais tipados para `prepare`, `checkup` e `derive`.
- [x] 2026-03-25 00:21Z - Comandos `/_status` e `/_cancel`, milestones canonicos e resumos finais com CTA seguro implementados no Telegram e refletidos no `/status`, com captura de chat de notificacao ao iniciar fluxo target.
- [x] 2026-03-25 00:21Z - Traces locais canonicos dos fluxos target implementados em `.codex-flow-runner/flow-traces/target-flows/`, com cobertura automatizada de serializacao, milestones, IA, artefatos e outcomes.
- [ ] 2026-03-25 00:21Z - Matriz manual via Telegram real ainda nao executada nesta etapa; validacao automatizada principal e `npm run check` concluidas com sucesso.

## Surprises & Discoveries
- 2026-03-24 23:23Z - Os tres fluxos target hoje vivem fora de `activeSlots`: `runner.ts` usa apenas `targetPrepareInFlight`, `targetCheckupInFlight` e `targetDeriveInFlight`, o que impede `/status`, a matriz de bloqueios e os resumos de fluxo de enxerga-los como execucoes de primeira classe.
- 2026-03-24 23:23Z - `src/types/flow-timing.ts` ainda modela apenas `run-all` e `run-specs`; para cumprir o ticket sem estado paralelo oculto, a solucao precisa ampliar o contrato de flow summary em vez de manter target flows fora dele.
- 2026-03-24 23:23Z - `src/integrations/workflow-trace-store.ts` e orientado a etapas de prompt (`promptTemplatePath`, `promptText`, `outputText`) e nao cobre milestones deterministicos nem cancelamentos de fluxo; isso exige extensao deliberada do contrato, nao apenas adicionar novos enums.
- 2026-03-24 23:23Z - `telegram-bot.ts` ja expoe `/target_prepare`, `/target_checkup` e `/target_derive_gaps`, mas esses comandos ainda respondem de forma sincrona apenas com resumo final; nao ha captura de chat de notificacao, milestones assincronos nem pares `/_status` e `/_cancel`.
- 2026-03-24 23:23Z - Os executores target nao expoem hoje nenhum hook de progresso, cancelamento ou fronteira de versionamento; a camada compartilhada de controle operacional precisa introduzir esse contrato sem acoplar `core` diretamente ao Telegram.
- 2026-03-25 00:21Z - O resultado final do fluxo target e emitido de forma assincrona depois que `targetFlow` e limpo do estado ativo; os testes precisaram esperar separadamente pelo fechamento do estado e pela emissao de `lastRunFlowSummary`.
- 2026-03-25 00:21Z - O gate `npm run check` capturou incompatibilidades de tipo em stubs de teste que nao apareciam no `tsx --test`, reforcando a necessidade de executar a matriz completa do plano e nao apenas a suite runtime.

## Decision Log
- 2026-03-24 - Decisao: promover `target_prepare`, `target_checkup` e `target_derive_gaps` a `RunnerSlotKind` dedicados, com fases e milestones proprios, em vez de manter booleanos globais de `inFlight`.
  - Motivo: o ticket exige bloqueios, `/status`, cancelamento e resumos de fluxo coerentes com o restante do runner; isso depende de estado compartilhado e observavel.
  - Impacto: `src/types/state.ts`, `src/types/flow-timing.ts` e `src/core/runner.ts` mudam juntos, e os testes precisam cobrir a nova matriz de capacidade/bloqueio.
- 2026-03-24 - Decisao: adotar comandos dedicados `/target_prepare_status`, `/target_prepare_cancel`, `/target_checkup_status`, `/target_checkup_cancel`, `/target_derive_gaps_status` e `/target_derive_gaps_cancel`.
  - Motivo: a spec fala em pares `/_status` e `/_cancel`; seguir o padrao ja usado por `/discover_spec_status` e `/plan_spec_cancel` elimina ambiguidade.
  - Impacto: help, auth, parse, wiring do bot, README e suites de Telegram precisam refletir seis comandos novos.
- 2026-03-24 - Decisao: definir a fronteira de versionamento como a entrada no milestone `versionamento`; antes dele o cancelamento cooperativo deve encerrar sem commit/push, depois dele o bot pode recusar ou registrar cancelamento tardio com mensagem explicita.
  - Motivo: RF-30 e CA-13 pedem distincao observavel antes/depois da fronteira; o runner nao consegue inferir isso apenas por `lastMessage`.
  - Impacto: os executores target precisam reportar milestone atual, `versionBoundaryState` e pedidos de cancelamento em checkpoints seguros.
- 2026-03-24 - Decisao: manter `.codex-flow-runner/flow-traces/` como raiz unica, mas expandir o store para uma taxonomia de sessao/evento de target flow, em vez de forcar milestones deterministicos no schema atual de prompt-stage trace.
  - Motivo: RF-33 e CA-14 exigem rastro de milestones, resultados deterministicos, cancelamento e artefatos versionados, inclusive para etapas sem IA.
  - Impacto: `workflow-trace-store.ts` e seus testes ganham um contrato novo, preservando compatibilidade do caminho atual de request/response/decision usado por tickets/specs.
- 2026-03-24 - Decisao: reutilizar a arquitetura de eventos `runner -> main -> telegram`, com novos eventos de milestone e resumo final de target flow, em vez de permitir que executores enviem mensagens diretamente ao Telegram.
  - Motivo: isso preserva a arquitetura em camadas do repositorio e mantem as regras editoriais/testes concentradas na integracao Telegram.
  - Impacto: `main.ts`, `telegram-delivery.ts` e `telegram-bot.ts` precisam ser ampliados em conjunto com o runner.
- 2026-03-24 - Decisao: no v1 deste ticket, os CTAs finais permanecem textuais e seguros por padrao; callbacks inline adicionais sao opcionais e so entram se nao aumentarem o risco da superficie.
  - Motivo: os closure criteria exigem CTA contextual observavel, mas nao obrigam introduzir uma nova camada de callback para cumprir o aceite.
  - Impacto: a validacao manual deve exercitar os CTAs textuais em todos os fluxos e, se callbacks forem adicionados na execucao, exercitar tambem os callbacks reais do Telegram.
- 2026-03-25 - Decisao: os comandos target passam a responder com `status: "started"` assim que o milestone inicial e observado, deixando milestones, `*_status`, `*_cancel` e resumo final cuidarem do lifecycle restante.
  - Motivo: isso preserva o chat responsivo, permite cancelamento cooperativo durante a execucao real e evita que o Telegram espere pelo versionamento inteiro para reconhecer a rodada.
  - Impacto: runner, Telegram e testes agora tratam reply inicial, estado `targetFlow` e `lastRunFlowSummary` como observaveis separados e complementares.

## Outcomes & Retrospective
- Status final: Implementacao concluida para o subconjunto RF-01 (`/_status` e `/_cancel`), RF-29, RF-30, RF-31, RF-32, RF-33 e CAs 12-14; matriz automatizada principal e `npm run check` executados com sucesso; smoke manual em Telegram real segue pendente.
- O que precisa existir ao final:
  - fluxos target visiveis no `/status` com comando ativo, milestone, estado da fronteira de versionamento e mensagem contextual;
  - bloqueios explicitos para `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` enquanto um target flow estiver ativo, preservando `/status` e `/projects`;
  - comandos dedicados de status/cancel para `prepare`, `checkup` e `derive`, com cancelamento seguro antes de `versionamento` e tratamento explicito depois;
  - milestones e resumos finais entregues no Telegram com CTA seguro e proxima acao contextual;
  - traces locais canonicos dos tres fluxos com IA + resultados deterministicos + artefatos + outcome final;
  - testes automatizados e smoke manual alinhados aos closure criteria do ticket.
- O que fica pendente fora deste plano:
  - novas mudancas funcionais nos artefatos versionados de `target_prepare`, `target_checkup` e `target_derive_gaps` fora do necessario para lifecycle/cancelamento;
  - qualquer mudanca de spec/ticket status ou fechamento administrativo do ticket;
  - callbacks inline adicionais, caso o caminho textual de CTA seja suficiente para o aceite e para o smoke manual.
- Proximos passos:
  - executar o smoke manual em Telegram real para `/target_prepare`, `/target_checkup` e `/target_derive_gaps`, incluindo `*_status` e `*_cancel`;
  - apos o smoke manual, revalidar os traces persistidos em `.codex-flow-runner/flow-traces/target-flows/`;
  - entao seguir para a etapa administrativa separada de fechamento do ticket/commit, fora deste ExecPlan.

## Context and Orientation
- Ticket de origem:
  - `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- RFs/CAs cobertos por este plano:
  - RF-01 apenas no subconjunto dos pares `/_status` e `/_cancel` dos tres fluxos target;
  - RF-29;
  - RF-30;
  - RF-31;
  - RF-32;
  - RF-33;
  - CA-12;
  - CA-13;
  - CA-14.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - os pares de status/cancel seguem o padrao `<comando>_status` e `<comando>_cancel`, resultando em `/target_prepare_status`, `/target_prepare_cancel`, `/target_checkup_status`, `/target_checkup_cancel`, `/target_derive_gaps_status` e `/target_derive_gaps_cancel`;
  - a fronteira de versionamento e igual ao inicio do milestone `versionamento` para cada fluxo; uma vez dentro dele, o cancelamento passa a ser tratado como tardio/recusavel;
  - `prepare`, `checkup` e `derive` mantem seus milestones canonicos definidos pela spec: `prepare` (`preflight`, `adequacao por IA`, `pos-check`, `versionamento`), `checkup` (`preflight`, `coleta de evidencias`, `sintese/redacao`, `versionamento`) e `derive` (`preflight`, `deduplicacao/priorizacao`, `materializacao`, `versionamento`);
  - o estado compartilhado do runner deve expor comando ativo, projeto alvo, milestone atual, `versionBoundaryState`, `cancelRequestedAt` quando houver e ultima mensagem contextual, sem trocar implicitamente o projeto ativo global;
  - os resumos finais continuam trazendo CTAs textuais seguros como barra minima; callbacks inline ficam opcionais;
  - traces target ficam em `.codex-flow-runner/flow-traces/` e nao substituem os artefatos versionados no repo alvo.
- RNFs e restricoes herdados que precisam ficar observaveis neste ticket:
  - manter fluxo sequencial e impedir concorrencia indevida;
  - UX consistente no Telegram;
  - status e milestones observaveis;
  - rastreabilidade local em `.codex-flow-runner/flow-traces/`;
  - mensagens finais com proxima acao contextual e CTA seguro;
  - os tres fluxos nao podem trocar implicitamente o projeto ativo;
  - o cancelamento e cooperativo e best-effort.
- Restricoes tecnicas/documentais herdadas:
  - os tres fluxos precisam ocupar o mesmo slot operacional dos fluxos pesados existentes;
  - durante execucao ativa, `/status` e `/projects` permanecem permitidos;
  - `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados;
  - traces locais precisam registrar comando, projeto alvo, milestone, inputs, requests/responses/decisions de IA quando houverem, resultados deterministicos, sucesso/falha/cancelamento e caminhos dos artefatos versionados.
- Validacoes pendentes/manuais herdadas:
  - exercitar os CTAs reais do Telegram nos tres fluxos;
  - se callbacks inline forem introduzidos na execucao, exercitar tambem os callbacks reais nos tres fluxos.
- Arquivos principais a reabrir durante a execucao:
  - `src/types/state.ts`
  - `src/types/flow-timing.ts`
  - `src/types/target-prepare.ts`
  - `src/types/target-checkup.ts`
  - `src/types/target-derive.ts`
  - `src/core/runner.ts`
  - `src/core/target-prepare.ts`
  - `src/core/target-checkup.ts`
  - `src/core/target-derive.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/core/target-prepare.test.ts`
  - `src/core/target-checkup.test.ts`
  - `src/core/target-derive.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/workflow-trace-store.test.ts`
  - `README.md`

## Plan of Work
- Milestone 1: promover os fluxos target ao contrato compartilhado de estado e slot do runner.
  - Entregavel: `RunnerSlotKind`, `RunnerPhase`, `RunnerState`, `RunnerFlowSummary` e preflight de bloqueio passam a modelar `target_prepare`, `target_checkup` e `target_derive_gaps` como fluxos ativos de primeira classe, com milestone atual e fronteira de versionamento observaveis.
  - Evidencia de conclusao: `/status` passa a exibir fluxo target ativo de forma estruturada e os testes comprovam que comandos bloqueados nao iniciam enquanto o slot target estiver ocupado.
  - Arquivos esperados:
    - `src/types/state.ts`
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `src/core/runner.test.ts`
- Milestone 2: adicionar status/cancel dedicados, milestones canonicos e resumos finais com CTA seguro no Telegram.
  - Entregavel: os seis comandos `*_status` e `*_cancel` existem, o bot publica milestones curtos e os resumos finais carregam proxima acao contextual sem trocar o projeto ativo.
  - Evidencia de conclusao: testes de Telegram e runner cobrem help, parse, mensagens de bloqueio, renderizacao de milestones, respostas de status, cancelamento e CTA final para sucesso/bloqueio/falha.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-delivery.ts`
    - `src/main.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `README.md`
- Milestone 3: introduzir cancelamento cooperativo e fronteira de versionamento observavel nos executores target.
  - Entregavel: `target_prepare`, `target_checkup` e `target_derive_gaps` passam a reportar milestone atual, receber pedido de cancelamento cooperativo, sinalizar quando entraram em `versionamento` e retornar outcome observavel para cancelamento precoce ou tardio.
  - Evidencia de conclusao: testes focados por executor provam que cancelar antes da fronteira encerra sem commit/push e que cancelar depois dela devolve mensagem explicita sem corromper o estado do fluxo.
  - Arquivos esperados:
    - `src/types/target-prepare.ts`
    - `src/types/target-checkup.ts`
    - `src/types/target-derive.ts`
    - `src/core/target-prepare.ts`
    - `src/core/target-checkup.ts`
    - `src/core/target-derive.ts`
    - `src/core/target-prepare.test.ts`
    - `src/core/target-checkup.test.ts`
    - `src/core/target-derive.test.ts`
- Milestone 4: persistir traces locais canonicos dos fluxos target e fechar a validacao observavel.
  - Entregavel: `.codex-flow-runner/flow-traces/` ganha taxonomia para target flows, cobrindo comando, projeto, milestone, inputs, exchanges de IA, resultados deterministicos, cancelamento/sucesso/falha e artefatos; a matriz completa do ticket fica coberta por testes e por roteiro manual.
  - Evidencia de conclusao: testes de trace e runner validam a serializacao do contrato, e o smoke manual encontra os arquivos esperados apos execucao real via Telegram.
  - Arquivos esperados:
    - `src/integrations/workflow-trace-store.ts`
    - `src/integrations/workflow-trace-store.test.ts`
    - `src/core/runner.ts`
    - `src/core/runner.test.ts`
    - ajustes pontuais nos executores target para alimentar o trace

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md` e `sed -n '104,122p' docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md` para reabrir o ticket e os CAs 12-14 imediatamente antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "targetPrepareInFlight|targetCheckupInFlight|targetDeriveInFlight|reserveSlot|syncStateFromSlots|buildStatusReply|recordStageTrace" src/core/runner.ts src/integrations/telegram-bot.ts src/integrations/workflow-trace-store.ts src/types/state.ts src/types/flow-timing.ts` para confirmar o delta real das superficies compartilhadas.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/types/state.ts` e `src/types/flow-timing.ts` para adicionar:
   - `RunnerSlotKind` dos tres fluxos target;
   - fases/milestones canonicos e estado da fronteira de versionamento;
   - flow summary/final summary para `target_prepare`, `target_checkup` e `target_derive_gaps`;
   - event/result types necessarios para milestones e cancelamento observavel.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/core/runner.ts` para substituir o modelo atual de `target*InFlight` por lifecycle compartilhado de slot, incluindo:
   - reserva/liberacao do slot target;
   - matriz de bloqueios exigida pelo ticket;
   - request handlers de status/cancel por fluxo;
   - persistencia de `lastRunFlowSummary`/estado de milestone dos fluxos target;
   - dispatch de eventos de milestone e resumo final.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/types/target-prepare.ts`, `src/types/target-checkup.ts` e `src/types/target-derive.ts` para incluir contratos de lifecycle/cancelamento, milestone atual, `versionBoundaryState` e outcomes de cancelamento/late-cancel quando necessario.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/core/target-prepare.ts`, `src/core/target-checkup.ts` e `src/core/target-derive.ts` para:
   - reportar milestones canonicos em checkpoints seguros;
   - respeitar pedido de cancelamento cooperativo antes de `versionamento`;
   - marcar entrada na fronteira de versionamento;
   - devolver mensagem explicita quando o cancelamento ocorrer tarde demais.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/integrations/workflow-trace-store.ts` para manter o contrato atual de request/response/decision e adicionar uma sessao de trace dos fluxos target com eventos de milestone, inputs, IA, resultado deterministico, cancelamento e caminhos de artefatos versionados.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/main.ts`, `src/integrations/telegram-delivery.ts` e `src/integrations/telegram-bot.ts` para:
   - registrar novos event handlers de milestone/resumo final;
   - captar o chat de notificacao ao iniciar fluxo target;
   - expor `/target_prepare_status`, `/target_prepare_cancel`, `/target_checkup_status`, `/target_checkup_cancel`, `/target_derive_gaps_status` e `/target_derive_gaps_cancel`;
   - atualizar help/usage/replies do bot e enriquecer o `/status`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `README.md` para documentar os novos comandos target, o comportamento de bloqueio e a semantica resumida de cancelamento/status.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/core/runner.test.ts` para cobrir:
   - slot compartilhado target vs fluxos pesados;
   - matriz de comandos permitidos/bloqueados;
   - status detalhado de fluxo target;
   - dispatch de milestones/resumos finais;
   - liberacao correta do slot apos sucesso/falha/cancelamento.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/integrations/telegram-bot.test.ts` para cobrir:
   - help e parse dos seis novos comandos;
   - respostas de `*_status` quando nao houver fluxo ativo e quando houver fluxo ativo;
   - respostas de `*_cancel` antes e depois da fronteira de versionamento;
   - mensagens de bloqueio exigidas em CA-12;
   - milestones e resumos finais com CTA contextual.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/core/target-prepare.test.ts`, `src/core/target-checkup.test.ts` e `src/core/target-derive.test.ts` para cobrir cancelamento cooperativo, fronteira de versionamento e payload de milestone/trace alimentado pelos executores.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/integrations/workflow-trace-store.test.ts` para provar que os traces target serializam comando, projeto, milestone, inputs, exchanges de IA, resultado final e artefatos sem sobrescrever silenciosamente execucoes anteriores.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts src/integrations/workflow-trace-store.test.ts` para validar a matriz automatizada principal do ticket.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar integridade tipada do wiring final.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` e, pelo Telegram autorizado, iniciar uma execucao real de cada fluxo target usando tambem seus comandos `*_status` e `*_cancel` para smoke manual do lifecycle.
17. (workdir: repo alvo de smoke dentro de `PROJECTS_ROOT_PATH/<project-name>`) Rodar `git status --porcelain`, `git log -1 --stat` e `find .codex-flow-runner/flow-traces -maxdepth 3 -type f | sort` apos cada smoke para confirmar que cancelamento precoce nao versionou o repo, cancelamento tardio foi tratado explicitamente e os traces locais esperados foram persistidos.

## Validation and Acceptance
- Matriz requisito -> validacao observavel derivada diretamente dos closure criteria do ticket:
  - Requisito: RF-29, RF-30; CA-12, CA-13.
    - Evidencia observavel: durante qualquer fluxo target ativo, `/status` e `/projects` continuam disponiveis enquanto `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados com mensagem explicita; cada fluxo expoe `*_status` e `*_cancel`; cancelar antes da fronteira de versionamento encerra sem commit/push e cancelar depois dela devolve tratamento explicito de cancelamento tardio.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts`
    - Esperado: a suite cobre a matriz de bloqueios em execucao target, a disponibilidade de `/status` e `/projects`, o conteudo de `*_status`, o cancelamento seguro antes de `versionamento` e a mensagem explicita de cancelamento tardio depois da fronteira.
  - Requisito: RF-31, RF-32; CA-12, CA-13.
    - Evidencia observavel: `prepare`, `checkup` e `derive` publicam milestones canonicos no Telegram e em `/status`, e os resumos finais carregam proxima acao contextual e CTAs seguros para sucesso, bloqueio e falha.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes afirmam a renderizacao editorial minima dos milestones, a reflexao do milestone atual no `/status` e a presenca de CTA/proxima acao contextual nos resumos finais dos tres fluxos.
  - Requisito: RF-33; CA-14.
    - Evidencia observavel: traces locais em `.codex-flow-runner/flow-traces/` registram comando, projeto alvo, milestone, inputs, requests/responses/decisions de IA quando existirem, resultados deterministicos, cancelamento/sucesso/falha e caminhos dos artefatos versionados; a serializacao e coberta por teste.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-trace-store.test.ts src/core/runner.test.ts src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts`
    - Esperado: a suite valida o contrato de trace dos fluxos target, incluindo unicidade de identificadores, persistencia dos eventos de milestone e registro do outcome final com caminhos de artefatos.
  - Requisito: validacao manual herdada da spec/ticket.
    - Evidencia observavel: os CTAs textuais reais foram exercitados nos tres fluxos via Telegram; se callbacks inline forem introduzidos na execucao, eles tambem foram exercitados; os traces locais do smoke mostram milestones e outcome final compativeis com o observado no bot.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`, depois executar `/target_prepare ...`, `/target_prepare_status`, `/target_prepare_cancel`, `/target_checkup ...`, `/target_checkup_status`, `/target_checkup_cancel`, `/target_derive_gaps ...`, `/target_derive_gaps_status` e `/target_derive_gaps_cancel` pelo Telegram autorizado e inspecionar `git status --porcelain`, `git log -1 --stat` e `find .codex-flow-runner/flow-traces -maxdepth 3 -type f | sort` no repo alvo.
    - Esperado: o bot responde com CTA/proxima acao coerentes, o cancelamento precoce nao cruza a fronteira de versionamento, o cancelamento tardio e comunicado explicitamente e os traces do smoke refletem o lifecycle observado.
- Guardrail complementar de consistencia tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de TypeScript apos a expansao de estado, Telegram e traces.
- Resultados executados nesta rodada:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts src/integrations/workflow-trace-store.test.ts`
    - Resultado: sucesso (`504` testes, `0` falhas).
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Resultado: sucesso (`tsc --noEmit` sem erros).
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` + smoke manual via Telegram real
    - Resultado: nao executado nesta etapa; depende de interacao com chat autorizado e ambiente externo.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar `*_status` nao deve mutar estado, slot ou traces;
  - repetir `*_cancel` depois de fluxo encerrado deve responder de forma inofensiva (`inactive`/`ignored`) sem nova mutacao;
  - rerodar um fluxo target apos sucesso, falha ou cancelamento deve encontrar o slot liberado e abrir uma nova sessao de trace sem sobrescrever a anterior;
  - o state snapshot do `/status` deve convergir para o mesmo payload observavel quando lido repetidas vezes dentro do mesmo milestone.
- Riscos:
  - migrar de booleanos `target*InFlight` para slot compartilhado pode regressar a orquestracao atual de `/run_all`, `/run_specs`, `/discover_spec`, `/plan_spec` e `/codex_chat`;
  - o cancelamento cooperativo pode ficar inconsistente se algum executor sinalizar a fronteira de versionamento tarde demais;
  - expandir `workflow-trace-store.ts` sem compatibilidade pode quebrar leitores/testes do contrato atual de traces de prompt;
  - milestones assincronos no Telegram podem duplicar mensagens se a captura de chat e o resumo final nao forem coordenados.
- Recovery / Rollback:
  - implementar primeiro o contrato de slot/estado no runner e estabilizar os testes antes de tocar Telegram/traces;
  - se o cancelamento seguro nao puder ser garantido de forma homogenea nos tres executores, parar a execucao com blocker explicito em vez de publicar semantica diferente por fluxo;
  - se a expansao do trace ameacar compatibilidade, manter o contrato antigo intacto e introduzir o novo schema target em paralelo sob a mesma raiz `.codex-flow-runner/flow-traces/`;
  - apos qualquer falha nos smokes, inspecionar `git status --porcelain`, `git log -1 --stat`, `state.lastMessage` e os arquivos de trace antes de rerodar; nunca rerodar um fluxo target sobre repo alvo sujo.

## Artifacts and Notes
- Artefatos consultados no planejamento:
  - `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `execplans/2026-03-24-target-checkup-readiness-audit-gap.md`
  - `execplans/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`
- Superficies principais previstas para mudanca:
  - `src/types/state.ts`
  - `src/types/flow-timing.ts`
  - `src/types/target-prepare.ts`
  - `src/types/target-checkup.ts`
  - `src/types/target-derive.ts`
  - `src/core/runner.ts`
  - `src/core/target-prepare.ts`
  - `src/core/target-checkup.ts`
  - `src/core/target-derive.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/workflow-trace-store.test.ts`
  - `src/core/target-prepare.test.ts`
  - `src/core/target-checkup.test.ts`
  - `src/core/target-derive.test.ts`
  - `README.md`
- Checklist de qualidade aplicado neste planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita de spec de origem, subconjunto de RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - explicacao do que fica fora de escopo e dos riscos residuais;
  - comandos Node deste plano ja carregam o prefixo operacional obrigatorio `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.

## Interfaces and Dependencies
- Interfaces alteradas ou adicionadas:
  - `RunnerSlotKind`, `RunnerPhase`, `RunnerState.activeSlots`, `RunnerState.lastRunFlowSummary` e tipos associados em `state.ts`/`flow-timing.ts`;
  - request/result types de `target_prepare`, `target_checkup` e `target_derive_gaps`, agora com lifecycle/milestone/cancelamento observavel;
  - nova superficie Telegram dos seis comandos `*_status` e `*_cancel`, alem dos milestones e resumos finais dos fluxos target;
  - expansao de `workflow-trace-store.ts` para suportar traces canonicos de target flow;
  - event handlers `runner -> main -> telegram` para milestones e resumos finais dos fluxos target.
- Compatibilidade:
  - o projeto ativo global nao pode ser trocado implicitamente pelos fluxos target nem por seus comandos de status/cancelamento;
  - o consumo sequencial de tickets e as suites de `/run_all` e `/run_specs` nao podem perder comportamento atual;
  - o contrato atual de traces de ticket/spec deve permanecer funcional mesmo apos a expansao para target flows;
  - as respostas finais ja existentes de `target_prepare`, `target_checkup` e `target_derive_gaps` devem ser preservadas editorialmente no que nao conflitar com milestones/cancel/status.
- Dependencias externas e operacionais:
  - Telegram disponivel para validar comandos, milestones e resumos finais;
  - autenticacao valida do Codex CLI nas etapas target que ainda usam IA, para que o trace consiga registrar request/response/decision quando houver;
  - Git do host e repositorios alvo irmaos acessiveis para smokes reais;
  - `PROJECTS_ROOT_PATH` apontando para a pasta-pai que contem `codex-flow-runner` e os repositorios alvo de teste.
