# ExecPlan - Persistir historico por ciclo do spec-ticket-validation em trace, spec e Telegram

## Purpose / Big Picture
- Objetivo: expor e persistir o historico por ciclo do gate `spec-ticket-validation`, aproveitando os `snapshots` que o dominio ja produz internamente, para que trace/log, spec e Telegram deixem de depender apenas do agregado final.
- Resultado esperado:
  - o `RunSpecsFlowSummary` passa a carregar um digest observavel por ciclo do gate, e nao apenas `cyclesExecuted` e o consolidado final;
  - a secao `Gate de validacao dos tickets derivados` da spec passa a registrar um historico por ciclo, preservando tambem o snapshot final agregado;
  - o trace/log da etapa `spec-ticket-validation` deixa de depender apenas do ultimo turno e passa a incluir um digest por ciclo;
  - o Telegram passa a mostrar um resumo compacto por ciclo quando houver mais de um passe, sem perder legibilidade;
  - testes focados cobrem historico por ciclo em spec, trace/log e Telegram.
- Escopo:
  - propagar os `snapshots` de `SpecTicketValidationResult` para um shape observavel usado pelo runner, pelo summary final e pela persistencia da spec;
  - enriquecer o metadata do workflow trace com digest por ciclo;
  - atualizar o render da spec e do Telegram para exibir historico por ciclo de forma compacta e deterministica;
  - adicionar regressao focada para runner, workflow trace store e Telegram.
- Fora de escopo:
  - mudar contrato documental, autocorrecao real ou semantica `blocked`, que ja foram enderecados;
  - reabrir a arquitetura `spec-workflow-retrospective` pos-`spec-audit`;
  - mover o ticket transversal sistemico para outra etapa do fluxo;
  - persistir transcript bruto completo de cada turno em vez de um digest observavel por ciclo;
  - commitar, fazer push ou fechar ticket nesta etapa.

## Progress
- [x] 2026-03-19 21:45Z - Planejamento inicial concluido com releitura de `PLANS.md`, do ticket-base, da spec de origem, dos traces reais e dos pontos de codigo onde os `snapshots` ja existem mas ainda nao sao expostos externamente.
- [x] 2026-03-19 21:55Z - Shape observavel de historico por ciclo definido e propagado para `RunSpecsFlowSummary` e para o metadata do trace.
- [x] 2026-03-19 21:58Z - Secao da spec e resumo do Telegram atualizados para exibir digest por ciclo de forma compacta e deterministica.
- [x] 2026-03-19 22:00Z - Regressao focada verde para runner, workflow trace store e Telegram.
- [x] 2026-03-19 22:03Z - Validacao final concluida com testes focados, `npm test`, `npm run check` e `npm run build`.

## Surprises & Discoveries
- 2026-03-19 21:45Z - `SpecTicketValidationResult` ja possui `snapshots: SpecTicketValidationCycleSnapshot[]`; o problema principal nao e coleta de dados, mas exposicao/persistencia desse historico.
- 2026-03-19 21:45Z - `src/core/runner.ts` ainda mantem um `latestTurn` unico para a etapa, o que explica por que o trace persistido continua favorecendo apenas o ultimo passe.
- 2026-03-19 21:45Z - O Telegram ja mostra `Ciclos executados`, o que cria um bom ponto de extensao para um resumo compacto por ciclo sem redesenhar a mensagem inteira.
- 2026-03-19 21:58Z - Nao foi necessario alterar `src/integrations/workflow-trace-store.ts`; o enriquecimento do trace veio inteiro do metadata serializado pelo runner.

## Decision Log
- 2026-03-19 - Decisao: tratar este follow-up como derivado da spec de `spec-ticket-validation`, e nao da spec de retrospectiva pos-`spec-audit`.
  - Motivo: o gap atual esta na observabilidade do gate anterior ao `/run-all`, nao na arquitetura da retrospectiva sistemica.
  - Impacto: RFs/CAs de origem ficam ancorados em `RF-11`, `RF-15`, `RF-16`, `RF-17` e `RF-27`, mantendo o escopo menor e mais preciso.
- 2026-03-19 - Decisao: persistir um digest por ciclo, e nao o transcript bruto completo da sessao, em spec/summary/trace.
  - Motivo: o dominio ja oferece informacoes estruturadas suficientes por snapshot, e um digest reduz ruido, duplicacao e tamanho de mensagem.
  - Impacto: a implementacao deve serializar campos observaveis por ciclo de forma tipada e compacta.
- 2026-03-19 - Decisao: manter o Telegram compacto e mostrar historico por ciclo apenas como resumo objetivo, preservando o detalhamento maior na spec e no trace.
  - Motivo: o operador precisa de contexto rapido sem transformar a mensagem final em transcript.
  - Impacto: a maior densidade de informacao deve ficar na spec e nos traces; o Telegram recebe apenas um digest enxuto por ciclo.
- 2026-03-19 - Decisao: nao alterar a implementacao do `workflow-trace-store`, apenas ampliar o metadata enviado pelo runner.
  - Motivo: o store ja serializa `decision.metadata` genericamente; o gap estava no produtor da informacao, nao no writer do trace.
  - Impacto: o diff ficou menor e a cobertura de contrato foi concentrada em `runner.test.ts` e `workflow-trace-store.test.ts`.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada localmente.
- O que passou a existir ao final:
  - `RunSpecsTicketValidationSummary` agora carrega `cycleHistory` tipado por ciclo;
  - `src/core/runner.ts` propaga esse historico para summary, secao da spec e metadata do trace;
  - `src/integrations/telegram-bot.ts` mostra historico compacto por ciclo quando houve revalidacao;
  - regressao focada e suite completa ficaram verdes.
- O que fica pendente fora deste plano:
  - retrospectiva sistemica pos-`spec-audit`;
  - qualquer ampliacao da taxonomia do gate;
  - qualquer refatoracao ampla do workflow trace store alem do necessario para o digest por ciclo.
- Proximos passos:
  - se desejado, fechar ticket e versionar o changeset;
  - depois seguir para a frente arquitetural da retrospectiva pos-`spec-audit`.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-03-19-spec-ticket-validation-historico-por-ciclo-em-trace-spec-e-telegram.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `src/types/spec-ticket-validation.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/core/runner.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/workflow-trace-store.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.test.ts`
- Spec de origem: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-11, RF-15, RF-16, RF-17, RF-27
  - CA-10, CA-11, CA-12
- Assumptions / defaults adotados:
  - `SpecTicketValidationCycleSnapshot` ja e a fonte canonica interna do historico do gate;
  - um digest observavel por ciclo deve conter, no minimo, `cycleNumber`, `phase`, veredito, confianca, resumo, fingerprints abertos, correcoes aplicadas e `realGapReductionFromPrevious`;
  - a spec e o trace podem carregar mais detalhe do que o Telegram, mas todos precisam representar o mesmo historico base;
  - o resumo final do Telegram deve continuar compacto e legivel mesmo quando houver 2 ciclos completos;
  - nao ha necessidade de guardar transcript bruto por ciclo no summary da rodada.
- Fluxo atual:
  - `src/core/spec-ticket-validation.ts` produz `snapshots` por ciclo;
  - `src/core/runner.ts` converte o resultado do gate para summary persistido na spec e para metadata do trace, mas privilegia o consolidado final;
  - `src/integrations/workflow-trace-store.ts` persiste um trace por etapa;
  - `src/integrations/telegram-bot.ts` renderiza apenas o snapshot agregado do gate.
- Restricoes tecnicas:
  - Node.js 20+ e TypeScript, sem novas dependencias;
  - fluxo sequencial inalterado;
  - diff deve permanecer focado em observabilidade do gate;
  - comandos de validacao precisam rodar no proprio repositorio e produzir evidencia objetiva.

## Plan of Work
- Milestone 1 - Propagar historico por ciclo para o summary e para o trace
  - Entregavel: `RunSpecsFlowSummary` e o metadata do trace de `spec-ticket-validation` passam a carregar um digest por ciclo derivado de `result.snapshots`.
  - Evidencia de conclusao: testes mostram que um gate com `initial-validation` e `revalidation` persiste ambos os ciclos no summary e no trace, sem depender apenas de `latestTurn`.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/types/flow-timing.ts`
    - `src/integrations/workflow-trace-store.ts`
    - testes associados
- Milestone 2 - Persistir e renderizar historico por ciclo em spec e Telegram
  - Entregavel: a secao `Gate de validacao dos tickets derivados` da spec passa a incluir historico por ciclo, e o Telegram exibe um digest compacto por ciclo quando houver mais de um passe.
  - Evidencia de conclusao: testes e leitura da spec persistida mostram ciclos distintos, com suas correcoes e resultado de reducao de gaps.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/integrations/telegram-bot.ts`
    - testes associados
- Milestone 3 - Regressao focada e auditoria final
  - Entregavel: runner, workflow trace store e Telegram ficam cobertos por cenarios com pelo menos dois passes do gate.
  - Evidencia de conclusao: testes focados, `npm test`, `npm run check` e `npm run build` verdes.
  - Arquivos esperados:
    - `src/core/runner.test.ts`
    - `src/integrations/workflow-trace-store.test.ts`
    - `src/integrations/telegram-bot.test.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "snapshots|latestTurn|cyclesExecuted|appendRunSpecsTicketValidationLines|recordStageTrace|Gate de validacao dos tickets derivados" src/core/runner.ts src/core/spec-ticket-validation.ts src/types/spec-ticket-validation.ts src/types/flow-timing.ts src/integrations/workflow-trace-store.ts src/integrations/telegram-bot.ts` para fixar os pontos exatos de serializacao e render.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/flow-timing.ts` e, se necessario, em tipos auxiliares para introduzir um shape tipado de digest por ciclo reutilizavel no summary.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para:
   - converter `result.snapshots` em um historico observavel por ciclo;
   - persistir esse historico na secao do gate na spec;
   - incluir o historico no summary e no metadata do trace da etapa;
   - reduzir a dependencia operacional de `latestTurn` para reconstruir a rodada.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/workflow-trace-store.ts` e, se necessario, nos tipos relacionados para aceitar e persistir o digest por ciclo do gate.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para renderizar historico por ciclo de forma compacta quando houver mais de um passe.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts`, `src/integrations/workflow-trace-store.test.ts` e `src/integrations/telegram-bot.test.ts` para cobrir:
   - persistencia do historico por ciclo na spec;
   - persistencia do historico por ciclo no trace;
   - renderizacao compacta por ciclo no Telegram.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` para validar os pontos centrais do plano.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao completa.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para validar compilacao final.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/types/flow-timing.ts src/integrations/workflow-trace-store.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` para auditoria final de escopo.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito: RF-11, RF-15; CA-10
  - Evidencia observavel: a secao `Gate de validacao dos tickets derivados` da spec persiste historico por ciclo com fase, veredito, confianca, resumo, fingerprints abertos e correcoes aplicadas, mantendo tambem o snapshot final agregado.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: teste verde comprovando escrita idempotente da secao do gate com pelo menos dois ciclos observaveis.
  - Requisito: RF-16, RF-17, RF-27; CA-11
  - Evidencia observavel: o metadata do trace da etapa `spec-ticket-validation` inclui digest por ciclo e permite distinguir validacao inicial e revalidacoes.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-trace-store.test.ts src/core/runner.test.ts`
  - Esperado: testes verdes comprovando o historico por ciclo no trace persistido da etapa.
  - Requisito: RF-16, RF-17, RF-27; CA-12
  - Evidencia observavel: o resumo final do Telegram mostra digest compacto por ciclo quando houver revalidacoes, preservando legibilidade.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: testes verdes comprovando a exibicao do historico compacto por ciclo no `/run_specs`.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: suite completa verde sem regressao do gate e dos resumos finais.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check && npm run build`
  - Esperado: tipagem e compilacao verdes.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a persistencia na spec deve convergir para a mesma secao do gate, sem duplicar ciclos;
  - a serializacao do historico por ciclo deve ser derivada exclusivamente de `result.snapshots`, evitando drift entre superfices;
  - o Telegram deve manter comportamento atual quando houver apenas um passe do gate.
- Riscos:
  - duplicar informacao demais e tornar a spec/Telegram verbosos demais;
  - deixar o shape do historico divergente entre summary, spec, trace e Telegram;
  - acoplar a mudanca a detalhes do transcript bruto em vez do snapshot tipado do dominio.
- Recovery / Rollback:
  - se o Telegram ficar ruidoso demais, manter o historico detalhado na spec/trace e reduzir a mensagem a um digest ainda mais curto;
  - se o shape novo gerar churn excessivo nos tipos, introduzir um helper unico de normalizacao do digest por ciclo para centralizar a serializacao;
  - se a persistencia detalhada na spec ficar grande demais, reduzir para um digest por ciclo mantendo o agregado final e preservar o detalhe maior apenas no trace.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-19-spec-ticket-validation-historico-por-ciclo-em-trace-spec-e-telegram.md`
- Spec de origem:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Referencias tecnicas consumidas:
  - `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json`
  - `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md`
  - `src/types/spec-ticket-validation.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/core/runner.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
- Artefatos esperados ao final:
  - diff focado em tipos, runner, workflow trace store, Telegram e testes associados;
  - historico por ciclo visivel na spec, no trace e no Telegram;
  - suite focada e suite completa verdes.
- Evidencias de validacao executadas:
  - `npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` -> pass (`229/229`)
  - `npm test` -> pass (`376/376`)
  - `npm run check` -> pass
  - `npm run build` -> pass

## Interfaces and Dependencies
- Interfaces alteradas:
  - shape de `RunSpecsFlowSummary.specTicketValidation`;
  - metadata persistida do stage `spec-ticket-validation` em workflow trace;
  - render da secao `Gate de validacao dos tickets derivados` na spec;
  - render do resumo final do Telegram para `/run_specs`.
- Compatibilidade:
  - o comportamento funcional do gate nao muda; muda apenas a capacidade de reconstruir o historico por ciclo;
  - o consolidado final do gate deve continuar disponivel para nao quebrar consumidores atuais;
  - a nova informacao deve ser aditiva e derivada do snapshot tipado existente.
- Dependencias externas e mocks:
  - nenhuma dependencia externa nova;
  - testes devem continuar usando fixtures e stubs locais do runner/trace/Telegram.
