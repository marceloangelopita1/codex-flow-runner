# ExecPlan - feature flag para retrospectivas sistemicas no /run_specs

## Purpose / Big Picture
- Objetivo: introduzir `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` como feature flag unica, desligada por padrao, para controlar conjuntamente as retrospectivas sistemicas pre-`/run_all` e pos-`spec-audit` sem alterar o fluxo funcional principal de `/run_specs`.
- Resultado esperado:
  - o parser de ambiente, o bootstrap e a documentacao operacional passam a expor a flag com default `false`, log tecnico do estado efetivo e regra explicita de restart;
  - com a flag desligada, o runner suprime execucao, publication transversal, write-back sistemico, timing observavel e blocos do resumo final ligados a `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`, mantendo apenas logs/traces tecnicos internos de supressao;
  - com a flag ligada, o comportamento atual das duas retrospectivas permanece inalterado.
- Escopo:
  - configuracao e bootstrap em `src/config/env.ts`, `src/config/env.test.ts`, `src/main.ts`, `.env.example` e `README.md`;
  - guardas de orquestracao em `src/core/runner.ts` para as duas retrospectivas e suas superficies derivadas;
  - contratos observaveis de timing/resumo em `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts`;
  - ampliacao da cobertura automatizada e preparacao das validacoes manuais herdadas da spec.
- Fora de escopo:
  - alinhar `SPECS.md`, `docs/specs/templates/spec-template.md` e notas historicas das specs de 2026-03-19/2026-03-20; isso pertence ao ticket irmao `tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`;
  - alterar prompts parseaveis de `derivation-gap-analysis`, `workflow-gap-analysis` ou `workflow-ticket-publication`;
  - criar toggle em runtime, comando de Telegram ou recarga dinamica da configuracao.

## Progress
- [x] 2026-03-22 19:37Z - Leitura completa do ticket, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md` e da spec de origem concluida.
- [x] 2026-03-22 19:37Z - Referencias tecnicas do ticket revisitadas (`env`, `main`, `runner`, `flow-timing`, `telegram`, `.env.example`, `README.md` e suites de teste existentes).
- [x] 2026-03-22 19:48Z - Contrato da flag implementado em `src/config/env.ts`, `src/config/env.test.ts`, `src/main.ts`, `.env.example` e `README.md`, com default `false`, log tecnico do estado efetivo e regra explicita de restart.
- [x] 2026-03-22 19:48Z - Guardas de runtime aplicados em `src/core/runner.ts`: com a flag desligada as retrospectivas sistemicas nao entram no fluxo observavel, nao publicam ticket transversal, nao fazem write-back e registram apenas logs/traces tecnicos de supressao quando elegiveis.
- [x] 2026-03-22 19:48Z - Cobertura automatizada ampliada em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`; `npx tsx --test src/config/env.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build` concluiram em verde.
- [x] 2026-03-22 19:52Z - Revalidacao automatizada de fechamento concluida: `npx tsx --test src/config/env.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build` passaram novamente em verde antes do fechamento tecnico do ticket.
- [ ] 2026-03-22 19:52Z - Validacoes manuais herdadas da spec permanecem pendentes: nao havia ambiente real configurado no workspace para rodar `/run_specs` com Telegram/logs/write-back observaveis em `false` e `true`, nem para provar troca de `.env` sem restart em execucao viva; o ticket pode fechar como `GO` tecnico com anotacao explicita de dependencia operacional externa.

## Surprises & Discoveries
- 2026-03-22 19:37Z - `src/core/runner.ts` ja recebe `AppEnv` no construtor, entao o principal delta nao e plumb de dependencia, e sim definir um gate canonico e reutilizavel para todas as superficies do fluxo.
- 2026-03-22 19:37Z - O fluxo atual sempre chama `runTimedSpecTicketDerivationRetrospectiveStage(...)` apos `spec-ticket-validation` e sempre chama `runTimedSpecWorkflowRetrospectiveStage(...)` quando `specAuditResult.residualGapsDetected` e verdadeiro; a supressao precisara cobrir tanto execucao quanto o stage observavel resultante.
- 2026-03-22 19:37Z - O write-back da secao `Retrospectiva sistemica da derivacao dos tickets` acontece dentro do helper de finalizacao da retrospectiva pre-`/run_all`, entao desligar a flag exige evitar entrar na etapa inteira, nao apenas bloquear publication.
- 2026-03-22 19:37Z - `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts` tratam as retrospectivas como fases normais do snapshot e do resumo final; sem ajuste nessas camadas, a flag desligada ainda vazaria ruido para o operador mesmo que o runner nao chamasse o Codex.
- 2026-03-22 19:37Z - A spec de origem separou o trabalho em dois tickets: este ticket cobre runtime/configuracao e apenas parte da documentacao (`.env.example` e `README.md`), enquanto o alinhamento canonicamente documental das specs ficou para um ticket irmao; o plano precisa preservar essa fronteira.
- 2026-03-22 19:48Z - Nao foi necessario alterar `src/types/flow-timing.ts` nem `src/integrations/telegram-bot.ts`: ao omitir as retrospectivas diretamente do summary/timing gerado pelo runner, o contrato observavel ja ficou limpo; bastou reforcar isso com testes focados.
- 2026-03-22 19:48Z - O gate novo introduziu caminhos em que `specTicketDerivationRetrospectiveSummary` pode permanecer `undefined`; alguns acessos do ramo `NO_GO` precisaram ser ajustados para optional chaining antes de `tsc` aceitar o novo contrato.

## Decision Log
- 2026-03-22 - Decisao: usar uma unica feature flag carregada no bootstrap para governar as duas retrospectivas sistemicas.
  - Motivo: o ticket e a spec fixam explicitamente `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` como controle unico e proíbem toggles separados ou recarga dinamica.
  - Impacto: a implementacao deve concentrar o guard em `AppEnv`/runner e provar em teste que alterar `.env` sem restart nao muda a rodada em voo.
- 2026-03-22 - Decisao: tratar a supressao quando a flag estiver `false` como comportamento deliberado e invisivel para o operador final, mas ainda rastreavel em logs/traces tecnicos internos.
  - Motivo: RF-12, RF-13 e RF-14 pedem explicitamente esse equilibrio de observabilidade.
  - Impacto: `runner` precisa registrar o skip tecnicamente, enquanto `flow-timing` e `telegram-bot` precisam esconder a fase suprimida do snapshot final observavel.
- 2026-03-22 - Decisao: ancorar toda a matriz de validacao nos cinco blocos de closure criteria do ticket, incluindo as validacoes manuais herdadas da spec.
  - Motivo: o usuario pediu que a validacao nasca do closure criterion e o checklist compartilhado reforca evidencias observaveis por requisito.
  - Impacto: `npm test` e `npm run check` entram apenas como sustentacao das evidencias focadas, e nao como aceite generico isolado.
- 2026-03-22 - Decisao: manter fora deste plano as mudancas de `SPECS.md`, template de spec e notas historicas.
  - Motivo: esses itens correspondem aos RF-21, RF-22 e RF-23 da spec e ja foram isolados em ticket irmao.
  - Impacto: este ExecPlan cobre apenas o subconjunto de RFs/CAs carregado no ticket aberto e evita overlap desnecessario de escopo.
- 2026-03-22 - Decisao: implementar a supressao no boundary do runner, registrando trace tecnico sintetico quando a retrospectiva elegivel e barrada por feature flag, sem criar stage observavel no snapshot final.
  - Motivo: essa abordagem remove o risco de `finalStage`, `completedStages` ou blocos do Telegram ficarem “fantasmas” quando a flag estiver `false`.
  - Impacto: o delta funcional ficou concentrado em `src/core/runner.ts`; `telegram-bot` continuou consumindo apenas o summary recebido e precisou apenas de teste adicional para explicitar a ausencia dos blocos sistemicos.

## Outcomes & Retrospective
- Status final: entrega tecnica concluida e classificada como `GO`; validacoes manuais reais permanecem pendentes por indisponibilidade de ambiente externo configurado e ficam registradas como dependencia operacional externa no ticket fechado.
- O que deve existir ao final da execucao:
  - flag documentada e parseada com default `false`;
  - duas retrospectivas protegidas pelo mesmo gate de ambiente, com comportamento atual preservado em `true`;
  - evidencias automatizadas concluidas e um registro explicito do que ainda depende de validacao manual externa.
- O que fica pendente depois deste plano:
  - alinhamentos documentais canonicos fora do escopo deste ticket continuam no ticket irmao.
  - executar duas rodadas reais de `/run_specs` com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` e `true`, com restart entre elas, mais a prova manual de que mudar `.env` sem restart nao altera a rodada em voo.
- Proximos passos:
  - usar o changeset atual como base para a rodada manual em ambiente real;
  - registrar nas evidencias operacionais a diferenca observavel entre `false` e `true`;
  - confirmar em execucao viva que alterar `.env` sem restart nao muda a rodada em voo;
  - tratar essa etapa como validacao manual externa ao agente, sem reabrir o fechamento tecnico do ticket salvo se a rodada real revelar divergencia funcional.

## Context and Orientation
- Arquivos principais:
  - `src/config/env.ts` - schema de ambiente e parser booleano reutilizavel.
  - `src/config/env.test.ts` - cobertura de defaults e booleans do ambiente.
  - `src/main.ts` - bootstrap, logging tecnico inicial e injecao de `env` no `TicketRunner`.
  - `src/core/runner.ts` - orquestracao de `/run_specs`, write-back da retrospectiva da derivacao, publication transversal e montagem do resumo final.
  - `src/types/flow-timing.ts` - contratos de `finalStage`, `completedStages`, duracoes e summaries observaveis.
  - `src/integrations/telegram-bot.ts` - renderizacao textual do resumo final do fluxo.
  - `src/core/runner.test.ts` - principal suite para execucao/supressao das retrospectivas.
  - `src/integrations/telegram-bot.test.ts` - suite de renderizacao dos blocos do resumo final.
  - `.env.example` e `README.md` - documentacao operacional a ser mantida coerente com o runtime.
- Ticket de origem:
  - `tickets/closed/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-24, RF-25.
  - CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-12, CA-13.
- Assumptions / defaults adotados:
  - o nome canonico da flag e `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`;
  - o default canonico e `false`;
  - a mesma flag controla conjuntamente `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`;
  - com a flag desligada, a etapa inteira deve ser suprimida, e nao apenas a publication;
  - com a flag desligada, a observabilidade da decisao fica restrita a logs/traces tecnicos internos;
  - os prompts parseaveis existentes permanecem validos;
  - o valor da flag e carregado no bootstrap e vale ate o proximo restart.
- Fluxo atual (as-is):
  - `spec-triage -> spec-ticket-validation -> spec-ticket-derivation-retrospective -> spec-close-and-version -> /run_all -> spec-audit -> spec-workflow-retrospective (quando ha residualGapsDetected)`.
  - `.env.example` e `README.md` ainda nao descrevem a nova flag.
  - o bootstrap so registra `PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM` como feature flag operacional.
- Fluxo alvo deste ticket (to-be):
  - com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` ou ausente: `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run_all -> spec-audit`, sem write-back sistemico, sem ticket transversal e sem blocos sistemicos no resumo final;
  - com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`: o comportamento atual das retrospectivas permanece habilitado nos mesmos cenarios elegiveis.
- Restricoes tecnicas:
  - manter fluxo sequencial;
  - nao alterar contratos parseaveis atuais das etapas de analise/publication;
  - nao criar toggle em runtime;
  - em comandos com `node`/`npm`/`npx`, repetir `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.

## Plan of Work
- Milestone 1 - Contrato de configuracao e bootstrap da flag
  - Entregavel: `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` existe em `AppEnv` com parser booleano existente, default `false`, log tecnico do estado efetivo no bootstrap e documentacao operacional minima em `.env.example` e `README.md`.
  - Evidencia de conclusao: `env.test.ts` cobre default e parsing; `main.ts` registra o estado efetivo e a exigencia de restart; `README.md` e `.env.example` descrevem default e efeito sobre `/run_specs`.
  - Arquivos esperados:
    - `src/config/env.ts`
    - `src/config/env.test.ts`
    - `src/main.ts`
    - `.env.example`
    - `README.md`
- Milestone 2 - Guardas de runtime e supressao observavel quando `false`
  - Entregavel: `runner` usa um gate unico para impedir as duas retrospectivas e todas as superficies derivadas quando a flag estiver desligada, preservando logs/traces tecnicos internos de supressao.
  - Evidencia de conclusao: nao ha invocacao de `derivation-gap-analysis`, `workflow-gap-analysis` nem `workflow-ticket-publication`; nao ha write-back da secao sistemica; `spec-audit` permanece fase funcional final observavel quando aplicavel.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/types/flow-timing.ts`
    - possivelmente fixtures/harnesses em `src/core/runner.test.ts`
- Milestone 3 - Resumo final, timing e prova de ausencia de ruido para o operador
  - Entregavel: snapshots e texto do Telegram deixam de expor retrospectivas sistemicas quando a flag estiver desligada, mas continuam corretos quando a flag estiver ligada.
  - Evidencia de conclusao: `completedStages`, `finalStage`, duracoes e blocos `Retrospectiva sistemica da derivacao` / `Retrospectiva sistemica pos-spec-audit` somem do resumo quando `false` e reaparecem sem regressao quando `true`.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `src/core/runner.test.ts`
- Milestone 4 - Validacao final aderente ao ticket
  - Entregavel: matriz automatizada e manual executada contra os closure criteria, incluindo uma rodada real com a flag em `false`, outra com a flag em `true` e confirmacao de bootstrap sem recarga dinamica.
  - Evidencia de conclusao: testes verdes nas superficies do ticket e registro manual das rodadas reais, com diferenca observavel em Telegram, logs e write-back.
  - Arquivos esperados:
    - `src/config/env.test.ts`
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
    - possivel nota final no ticket/execucao ao encerrar o trabalho

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM|RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|spec-ticket-derivation-retrospective|spec-workflow-retrospective|Retrospectiva sistemica" src README.md .env.example` para consolidar todas as superficies tocadas pelo contrato da flag.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/config/env.ts` para incluir `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` com o mesmo parser booleano reutilizado no projeto e default `false`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `src/config/env.test.ts` com cenarios de default ausente, `true`, `false` e valor invalido para a nova flag.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts`, `.env.example` e `README.md` para registrar/documentar o estado efetivo da flag, seu default, o efeito sobre `/run_specs` e a necessidade de restart.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/core/runner.ts` para centralizar um gate do tipo `isRunSpecsWorkflowImprovementEnabled`, aplicando-o antes de:
   - `runTimedSpecTicketDerivationRetrospectiveStage(...)`;
   - `runTimedSpecWorkflowRetrospectiveStage(...)`;
   - publication transversal derivada dessas etapas;
   - write-back da secao `Retrospectiva sistemica da derivacao dos tickets`;
   - qualquer superficie observavel ligada a essas etapas.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir em `src/core/runner.ts` que, com a flag desligada, o fluxo funcional continue como `spec-ticket-validation -> spec-close-and-version -> /run_all -> spec-audit`, registrando apenas logs/traces tecnicos internos quando uma retrospectiva elegivel for suprimida.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/flow-timing.ts` e o consumo correspondente em `src/core/runner.ts` para que retrospectivas suprimidas nao entrem em `completedStages`, `finalStage` nem `durationsByStageMs` do snapshot observavel.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.ts` para esconder os blocos sistemicos quando a flag estiver desligada e preservar a renderizacao atual quando estiver ligada.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `src/core/runner.test.ts` com cenarios cobrindo:
   - flag ausente/`false` suprimindo retrospectiva pre-`/run_all`;
   - flag ausente/`false` suprimindo retrospectiva pos-`spec-audit`;
   - ausencia de publication, write-back, timing e blocos sistemicos com a flag desligada;
   - fluxo funcional principal preservado com a flag desligada;
   - comportamento atual preservado com a flag ligada.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `src/integrations/telegram-bot.test.ts` para validar ausencia/presenca dos blocos sistemicos conforme o estado da flag refletido no summary.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/config/env.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar diretamente as superficies dos closure criteria.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao do repositorio apos os testes focados.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar tipagem do changeset.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para confirmar build do changeset.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar duas rodadas reais de `/run_specs` em ambiente controlado, uma com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` e outra com `true`, reiniciando o processo entre elas e registrando evidencias de Telegram, logs e write-back; depois repetir uma troca de `.env` sem restart para confirmar que o comportamento em voo nao muda.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar o diff final com `git diff -- src/config/env.ts src/config/env.test.ts src/main.ts src/core/runner.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts README.md .env.example execplans/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md` para garantir escopo minimo antes do fechamento do ticket.

## Validation and Acceptance
- Matriz `requisito -> validacao observavel`:
  - Requisitos cobertos: RF-01, RF-02, RF-03, RF-17, RF-18, RF-19, RF-20, RF-24, RF-25; CA-01, CA-02, CA-03, CA-13.
  - Evidencia observavel: `src/config/env.ts` e `src/config/env.test.ts` passam a expor `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` com o mesmo contrato booleano do projeto e default `false`; `.env.example`, `README.md` e `src/main.ts` documentam/logam o estado efetivo da flag, seu default, o efeito sobre `/run_specs` e a necessidade de restart.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/config/env.test.ts`
    - Esperado: cobertura verde para default ausente, parsing booleano valido e rejeicao de valor invalido da nova flag.
    - Resultado executado em 2026-03-22 19:52Z: `pass` (12 testes verdes).
  - Comando: `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|false|restart|run_specs" src/main.ts README.md .env.example`
    - Esperado: matches coerentes mostrando o nome da flag, o default `false`, o efeito no fluxo `/run_specs` e a necessidade de restart.
    - Resultado executado em 2026-03-22 19:52Z: `pass` (`src/main.ts`, `README.md` e `.env.example` exibem nome canonico, default `false`, efeito no fluxo e restart obrigatorio).
- Matriz `requisito -> validacao observavel`:
  - Requisitos cobertos: RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-12, RF-13, RF-14; CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10.
  - Evidencia observavel: testes de `src/core/runner.ts`, `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts` provam que, com a flag desligada, as retrospectivas sistemicas nao executam, nao publicam ticket transversal, nao fazem write-back, nao entram em `completedStages`/`finalStage`/duracoes e nao aparecem no resumo final do Telegram, deixando apenas logs/traces tecnicos internos de supressao.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: suites verdes cobrindo explicitamente a supressao das duas retrospectivas e a ausencia de ruido operacional quando a flag estiver `false`.
    - Resultado executado em 2026-03-22 19:52Z: `pass` (265 testes verdes; novo cenario cobre supressao pre-`/run_all`, pos-`spec-audit`, ausencia de timing observavel e ausencia dos blocos sistemicos no resumo).
- Matriz `requisito -> validacao observavel`:
  - Requisitos cobertos: RF-11.
  - Evidencia observavel: os testes mostram que `spec-ticket-validation`, `spec-close-and-version`, `/run_all` e `spec-audit` continuam operando normalmente com a flag desligada, e `spec-audit` permanece como fase final observavel quando nao houver falha funcional posterior.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: cenarios verdes em que o fluxo funcional principal continua concluindo a rodada de `/run_specs` mesmo com as retrospectivas desligadas.
    - Resultado executado em 2026-03-22 19:52Z: `pass` dentro da suite focada e novamente em `npm test`; o novo teste dedicado termina com `finalStage=spec-audit` e sem etapas sistemicas no snapshot.
- Matriz `requisito -> validacao observavel`:
  - Requisitos cobertos: RF-15, RF-16; CA-11, CA-12.
  - Evidencia observavel: os testes mostram que, com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, os cenarios elegiveis atuais continuam disparando `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` sem regressao funcional.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: suites verdes preservando os cenarios hoje aceitos quando a flag estiver `true`.
    - Resultado executado em 2026-03-22 19:52Z: `pass`; as suites existentes permaneceram verdes com o fixture-base de testes ajustado para `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`.
- Matriz `requisito -> validacao observavel`:
  - Requisito: validacoes manuais herdadas da spec e carregadas para o closure criterion do ticket.
  - Evidencia observavel: a entrega registra explicitamente a execucao de ao menos uma rodada real com a flag em `false` e outra em `true`, alem da confirmacao manual de que mudar o `.env` sem restart nao altera o comportamento em voo.
  - Comando: executar uma rodada real de `/run_specs` com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, reiniciar o processo, executar outra com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, depois alterar o `.env` sem restart e repetir a observacao da rodada em voo.
    - Esperado: com `false`, Telegram/logs/write-back nao expõem blocos sistemicos; com `true`, os blocos e comportamentos sistemicos reaparecem; alterar o `.env` sem restart nao muda a rodada atual.
    - Resultado executado em 2026-03-22 19:52Z: `pendente/manual-externo` por ausencia de ambiente real configurado no workspace para observar Telegram, restart controlado do runner e write-back em rodadas reais; nao bloqueia o fechamento tecnico segundo o gate de fechamento desta rodada.
- Validacao de regressao vinculada ao fechamento:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
    - Esperado: nenhuma regressao fora do contrato novo da flag.
    - Resultado executado em 2026-03-22 19:52Z: `pass` (420 testes verdes).
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Esperado: tipagem verde apos a introducao da nova flag e do gate no fluxo.
    - Resultado executado em 2026-03-22 19:52Z: `pass`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - Esperado: build verde com os contratos atualizados.
    - Resultado executado em 2026-03-22 19:52Z: `pass`.

## Idempotence and Recovery
- Idempotencia:
  - rerodar os testes focados e a regressao completa nao deve alterar artefatos do repositorio;
  - o gate da flag deve depender apenas de `AppEnv` carregado no bootstrap, sem mutacao de estado global fora do processo atual;
  - repetir rodadas reais com o mesmo valor da flag deve produzir o mesmo perfil observavel de supressao ou execucao, salvo o conteudo funcional da spec/tickets processados.
- Riscos:
  - suprimir a invocacao do stage, mas ainda deixar rastros dele em `finalStage`, `completedStages` ou no resumo final;
  - bloquear write-back/publication da retrospectiva pre-`/run_all`, mas esquecer a retrospectiva pos-`spec-audit`;
  - alterar a observabilidade do operador de forma excessiva e esconder tambem sinais tecnicos necessarios para diagnostico;
  - depender de validacao manual em ambiente real sem reservar tempo para restart controlado do runner e captura de evidencias.
- Recovery / Rollback:
  - se a supressao quebrar o fluxo funcional principal, voltar primeiro ao ultimo estado em que `spec-ticket-validation -> spec-close-and-version -> /run_all -> spec-audit` permanecia estavel e reintroduzir o gate por superficie;
  - se `flow-timing` e `telegram-bot` divergirem, priorizar o contrato do summary gerado pelo runner e alinhar a renderizacao depois, sem manter fases fantasmas no snapshot;
  - se a validacao manual nao puder ser executada por indisponibilidade operacional do Telegram/ambiente real, registrar blocker explicito no ticket em vez de inferir aceite sem evidencia.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md`
- Referencias tecnicas lidas no planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/config/env.ts`
  - `src/config/env.test.ts`
  - `src/main.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `README.md`
  - `.env.example`
- Ticket irmao relevante para fronteira de escopo:
  - `tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`
- Observacao operacional:
  - todos os comandos com `node`/`npm`/`npx` neste plano ja estao escritos com o prefixo de ambiente exigido pelo host.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `AppEnv` e o schema de ambiente para incluir `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`;
  - logging tecnico de bootstrap em `src/main.ts`;
  - contrato de `RunSpecsFlowSummary` e snapshots de timing apenas na medida necessaria para remover fases sistemicas quando suprimidas;
  - renderizacao textual do resumo final em `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - manter os nomes canonicos atuais de stage e dos prompts parseaveis;
  - preservar o comportamento atual das retrospectivas quando a flag estiver `true`;
  - manter o fluxo funcional principal de `/run_specs` inalterado quando a flag estiver `false`;
  - evitar mudanças nos RF-21/RF-22/RF-23, reservados ao ticket irmao documental.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - reutilizar o parser booleano existente em `src/config/env.ts`;
  - reutilizar harnesses e fixtures atuais de `runner.test.ts` e `telegram-bot.test.ts`;
  - a validacao manual depende de um ambiente real com runner reiniciavel e observacao de Telegram/logs/write-back.
