# ExecPlan - Observabilidade e documentacao da entrada por validacao em `run-specs`

## Purpose / Big Picture
- Objetivo: tornar observavel e documentada a diferenca entre a rodada `run-specs` iniciada por retriagem (`/run_specs` -> `spec-triage`) e a rodada iniciada por continuidade da validacao (`/run_specs_from_validation` -> `spec-ticket-validation`), sem criar uma segunda familia de fluxo.
- Resultado esperado:
  - `RunSpecsFlowSummary` e o milestone de triagem carregam metadata explicita de `sourceCommand` e `entryPoint`;
  - resumo final, `/status`, milestone e traces passam a distinguir a entrada por `/run_specs_from_validation`;
  - timings da variante iniciada pela validacao nao mostram `spec-triage` como etapa concluida;
  - help textual, `README.md` e a documentacao operacional do fluxo explicam a diferenca entre retriagem completa e continuidade da validacao;
  - cobertura automatizada e validacao manual ficam alinhadas ao closure criterion do ticket.
- Escopo:
  - ajustar contrato de tipos e montagem do summary/milestone de `run-specs`;
  - ajustar renderizacao editorial do Telegram para overview, milestone, timings e `/status`;
  - ajustar traces para expor metadata de comando de origem e ponto de entrada;
  - atualizar documentacao textual do comando e da semantica do fluxo;
  - ampliar testes em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`.
- Fora de escopo:
  - alterar semantica funcional de `/run_specs_from_validation` ou da validacao do backlog;
  - criar uma nova familia de fluxo alem de `run-specs`;
  - adicionar CTA ou botao novo em `/specs`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-24 18:41Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md` e das superficies tecnicas/documentais referenciadas.
- [x] 2026-03-24 18:54Z - Contrato de `run-specs` ampliado com `sourceCommand` e `entryPoint`, incluindo `RunSpecsFlowSummary`, `RunSpecsTriageLifecycleEvent`, estado ativo do slot de `run-specs` e metadata de traces.
- [x] 2026-03-24 18:54Z - Renderer do Telegram e timings ajustados para distinguir a entrada por validacao sem quebrar a familia `run-specs`, cobrindo overview, milestone, `/status` e ausencia de `spec-triage` concluido na variante iniciada pela validacao.
- [x] 2026-03-24 18:54Z - Help textual, `README.md` e documentacao operacional do fluxo atualizados com a diferenca entre retriagem e continuidade da validacao.
- [x] 2026-03-24 18:54Z - Testes focados, `npm test` e `npm run check` concluidos com sucesso; validacao manual do `/status` e do resumo final segue pendente por depender de chat Telegram autorizado.

## Surprises & Discoveries
- 2026-03-24 18:41Z - O `runner` ja recebe `entryPoint` e `sourceCommand` em `runSpecsFlow(...)`, mas `buildRunSpecsFlowSummary(...)` ainda descarta essa informacao ao materializar `RunSpecsFlowSummary`.
- 2026-03-24 18:41Z - `RunSpecsTriageLifecycleEvent` ainda nao carrega metadata de entrada, entao o milestone `buildRunSpecsTriageMilestoneMessage(...)` nao tem como distinguir `/run_specs` de `/run_specs_from_validation`.
- 2026-03-24 18:41Z - O renderer atual do Telegram usa ordens estaticas de timing (`RUN_SPECS_TRIAGE_TIMING_STAGE_ORDER` e `RUN_SPECS_FLOW_TIMING_STAGE_ORDER`), mas a listagem real ja depende das fases presentes em `durationsByStageMs`; o principal gap esta nos dados e no texto editorial, nao na estrutura base do helper.
- 2026-03-24 18:41Z - Os traces do workflow preservam `sourceCommand: "run-specs"` como familia de execucao; para cumprir RF-16 sem abrir uma taxonomia paralela, a distincao fina de `/run_specs` vs `/run_specs_from_validation` deve aparecer em metadata observavel da decisao e/ou do summary, nao em uma nova familia de trace.
- 2026-03-24 18:41Z - O help textual ja reconhece mensagens de uso/erro de `/run_specs_from_validation`, mas `START_REPLY_LINES` e `README.md` ainda descrevem apenas `/run_specs` como porta de entrada do fluxo de spec.
- 2026-03-24 18:54Z - Para tornar `/status` observavel durante a execucao, nao bastou enriquecer apenas `lastRunFlowSummary`; foi necessario estender `RunnerActiveSlotState`/`ActiveRunnerSlot` com `runSpecsSourceCommand` e `runSpecsEntryPoint`.
- 2026-03-24 18:54Z - A menor mudanca segura para traces foi enriquecer `decision.metadata` dentro de `recordWorkflowTrace(...)`, preservando `request.sourceCommand = "run-specs"` no envelope persistido e evitando churn no `traceId` historico.

## Decision Log
- 2026-03-24 - Decisao: manter `flow: "run-specs"` e `WorkflowTraceSourceCommand: "run-specs"` como taxonomias canonicas, adicionando `sourceCommand` e `entryPoint` como metadata complementar nas superficies observaveis.
  - Motivo: RF-16 exige familia unica de fluxo; abrir um segundo flow/tipo aumentaria churn e ambiguidade.
  - Impacto: tipos, renderer e traces precisam carregar metadata adicional sem quebrar compatibilidade do contrato agregado.
- 2026-03-24 - Decisao: tratar `sourceCommand` como `"/run_specs" | "/run_specs_from_validation"` e `entryPoint` como `"spec-triage" | "spec-ticket-validation"` em todas as superficies de `run-specs`.
  - Motivo: este e o minimo observavel explicitamente exigido pelo ticket e pela spec.
  - Impacto: `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts` precisam convergir nesses enums literais.
- 2026-03-24 - Decisao: mapear "documentacao operacional do fluxo" para `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`, salvo descoberta de um artefato mais canonico durante a execucao.
  - Motivo: este documento ja descreve a jornada operacional de `/run_specs` e funciona como referencia viva do fluxo base.
  - Impacto: a execucao deve revisar esse arquivo junto com `README.md` e o help textual do bot.
- 2026-03-24 - Decisao: expor `sourceCommand` e `entryPoint` tambem no estado do slot ativo de `run-specs`.
  - Motivo: o ticket exige `/status` observavel tambem durante a rodada em andamento; somente o resumo final nao cobre esse caso.
  - Impacto: `src/types/state.ts`, `src/core/runner.ts` e `src/integrations/telegram-bot.ts` passaram a carregar metadata opcional no slot ativo sem alterar a taxonomia de slots.
- 2026-03-24 - Decisao: centralizar o enriquecimento de traces em `recordWorkflowTrace(...)`, e nao em cada call site de etapa.
  - Motivo: reduz repeticao e garante consistencia entre `spec-triage`, `spec-ticket-validation`, retrospectiva, fechamento e auditoria.
  - Impacto: toda etapa de `run-specs` agora persiste `decision.metadata.sourceCommand` e `decision.metadata.entryPoint` quando a rodada tiver esse contexto ativo.

## Outcomes & Retrospective
- Status final: executado.
- O que funcionou:
  - o ticket ja delimitava closure criteria objetivos por superficie, o que permitiu validar contrato, renderer, traces e documentacao sem expandir escopo;
  - a extensao aditiva de tipos e estado preservou `flow: "run-specs"` e `WorkflowTraceSourceCommand: "run-specs"` como taxonomias canonicas;
  - o renderer ja filtrava timings pelas fases realmente presentes, entao o principal trabalho ficou concentrado em dados, texto editorial e fixtures de teste.
- O que ficou pendente:
  - validacao manual no Telegram do `/status` e do resumo final para a variante iniciada por validacao;
  - fechamento operacional do ticket em etapa posterior, conforme restricao desta execucao.
- Proximos passos:
  - executar a validacao manual do comando `/run_specs_from_validation` em chat autorizado;
  - usar o prompt de fechamento para decidir `GO`/`NO_GO` do ticket com base nas evidencias agora produzidas.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-24-run-specs-from-validation-observability-and-docs-gap.md`
  - `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `src/types/flow-timing.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `README.md`
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
- Spec de origem: `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md`
- RFs/CAs cobertos por este plano:
  - RF-15, RF-16, RF-17, RF-18, RF-19
  - CA-08, CA-11
- RNFs e restricoes herdados que precisam ficar observaveis neste ticket:
  - a familia observavel continua sendo `run-specs`;
  - a diferenca entre retriagem completa e retomada pela validacao deve aparecer por metadata de entrada, nao por criacao de um segundo fluxo;
  - resumo final, milestone, traces e `/status` devem distinguir explicitamente a entrada por `/run_specs_from_validation`;
  - a variante iniciada pela validacao nao deve exibir `spec-triage` como etapa concluida;
  - a primeira versao da documentacao continua textual, sem CTA novo em `/specs`;
  - a documentacao publica e operacional faz parte do aceite, nao apenas do polimento editorial.
- Assumptions / defaults adotados:
  - `RunSpecsFlowSummary` e `RunSpecsTriageLifecycleEvent` podem ser estendidos de forma aditiva, preservando consumidores existentes da familia `run-specs`.
  - o trace de workflow deve continuar agrupado sob `run-specs`; a distincao fina de comando/ponto de entrada sera carregada em metadata observavel da decisao, e nao em uma nova variante de `WorkflowTraceSourceCommand`.
  - "documentacao operacional do fluxo" sera atendida por `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` enquanto nao houver artefato mais canonico para essa jornada.
  - os helpers de teste que constroem `RunSpecsFlowSummary` devem assumir por default o caminho legado (`sourceCommand: "/run_specs"`, `entryPoint: "spec-triage"`) para evitar regressao acidental em cenarios preexistentes.
- Fluxo atual relevante:
  - `requestRunSpecs(...)` agenda `runSpecsFlow(...)` com `entryPoint: "spec-triage"` e `sourceCommand: "/run_specs"`;
  - `requestRunSpecsFromValidation(...)` agenda `runSpecsFlow(...)` com `entryPoint: "spec-ticket-validation"` e `sourceCommand: "/run_specs_from_validation"`;
  - `buildRunSpecsFlowSummary(...)` ainda nao materializa essa metadata;
  - `buildRunFlowSummaryMessage(...)`, `buildRunSpecsTriageMilestoneMessage(...)` e `buildStatusReply(...)` ainda nao a exibem;
  - `START_REPLY_LINES` e `README.md` ainda documentam somente `/run_specs`.
- Restricoes tecnicas locais:
  - manter o fluxo sequencial por projeto;
  - evitar bifurcacao de schema de summary/timing;
  - ancorar toda validacao em closure criteria do ticket, nao em checklist generico.

## Plan of Work
- Milestone 1: Formalizar a metadata de entrada no contrato de `run-specs`.
  - Entregavel: tipos e builders de summary/milestone/traces carregam `sourceCommand` e `entryPoint` de forma canonica e aditiva.
  - Evidencia de conclusao: `RunSpecsFlowSummary` e `RunSpecsTriageLifecycleEvent` exibem os novos campos; o `runner` os popula tanto no caminho legado quanto na retomada pela validacao; traces passam a registrar a distincao observavel sem criar segunda familia de fluxo.
  - Arquivos esperados: `src/types/flow-timing.ts`, `src/core/runner.ts`, possivelmente `src/integrations/workflow-trace-store.ts`, `src/core/runner.test.ts`.
- Milestone 2: Tornar a diferenca editorialmente observavel no Telegram e no status.
  - Entregavel: resumo final, milestone de triagem, `/status` e blocos de timing evidenciam comando de origem e ponto de entrada; a variante de validacao nao apresenta `spec-triage` como etapa concluida.
  - Evidencia de conclusao: testes de `telegram-bot` cobrem sucesso, `NO_GO` e falha tecnica da variante iniciada por validacao com asserts sobre overview, `/status`, milestone e timing.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, possivelmente `src/core/runner.test.ts`.
- Milestone 3: Atualizar ajuda e documentacao textual do fluxo.
  - Entregavel: help do bot, `README.md` e doc operacional do fluxo explicam quando usar `/run_specs` vs `/run_specs_from_validation`.
  - Evidencia de conclusao: buscas de texto e testes/documentacao mostram ambos os comandos com diferenca semantica clara e sem CTA novo em `/specs`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `README.md`, `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`.
- Milestone 4: Provar o fechamento do ticket por validacoes automatizadas e manuais.
  - Entregavel: testes focados, `npm test`, `npm run check` e roteiro manual cobrindo `/status` e resumo final.
  - Evidencia de conclusao: suites verdes e validacao manual explicitamente registrada para a variante iniciada por validacao.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, logs/notes deste plano.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' src/types/flow-timing.ts`, `sed -n '4700,5805p' src/core/runner.ts` e `sed -n '6395,7065p' src/integrations/telegram-bot.ts` para reabrir o contrato atual antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/flow-timing.ts` para introduzir tipos canonicos de metadata de entrada de `run-specs` e anexar `sourceCommand`/`entryPoint` ao summary; se necessario, compartilhar esses literais com o milestone de triagem.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para propagar `sourceCommand` e `entryPoint` desde `requestRunSpecs(...)`/`requestRunSpecsFromValidation(...)` ate `buildRunSpecsFlowSummary(...)`, `emitRunSpecsTriageMilestone(...)` e metadata de traces relevantes.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/integrations/workflow-trace-store.ts` apenas se necessario para tornar a metadata de comando/ponto de entrada visivel no artefato persistido sem mudar a familia canonica `run-specs`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para:
   - incluir `sourceCommand` e `entryPoint` no overview do summary final;
   - incluir a mesma distincao no milestone de triagem;
   - incluir a distincao no `/status` quando `lastRunFlowSummary.flow === "run-specs"`;
   - garantir que a variante iniciada pela validacao nao renderize `spec-triage` como etapa concluida nos timings, confiando nos snapshots reais do `runner` e ajustando texto/ordem apenas se houver exibicao enganosa.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `START_REPLY_LINES` em `src/integrations/telegram-bot.ts`, `README.md` e `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` para documentar:
   - `/run_specs <arquivo>` como retriagem completa;
   - `/run_specs_from_validation <arquivo>` como continuidade da validacao do backlog derivado;
   - a ausencia de CTA novo em `/specs`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.test.ts` para cobrir:
   - summary de `run-specs` iniciado por validacao contendo `sourceCommand` e `entryPoint`;
   - traces com metadata observavel da origem e do ponto de entrada;
   - `completedStages`/timings sem `spec-triage` na variante iniciada por validacao.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.test.ts` para cobrir:
   - summary final de `run-specs` exibindo comando de origem e ponto de entrada;
   - milestone de triagem distinguindo retriagem vs retomada;
   - `/status` exibindo metadata da ultima rodada `run-specs`;
   - help textual documentando `/run_specs_from_validation`;
   - tempos/resumo da variante iniciada por validacao sem `spec-triage` como concluida.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar o recorte principal do ticket.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao completa alinhada ao closure criterion herdado da spec.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar contratos e tipagem apos a ampliacao do summary.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "/run_specs_from_validation|retriar|continuar da validacao|spec-ticket-validation" src/integrations/telegram-bot.ts README.md docs/specs/2026-02-19-approved-spec-triage-run-specs.md` para auditar a cobertura documental exigida pelo ticket.
13. (workdir: ambiente Telegram autorizado) Executar manualmente `/run_specs_from_validation <arquivo-da-spec.md>` em uma spec elegivel com backlog aberto derivado e confirmar:
   - o `/status` identifica explicitamente a rodada por `/run_specs_from_validation`;
   - o resumo final identifica `entryPoint: spec-ticket-validation`;
   - a variante nao mostra `spec-triage` como etapa concluida;
   - em `NO_GO`, a proxima acao continua apontando para reexecucao de `/run_specs_from_validation`.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-17; CA-08
    - Evidencia observavel: `RunSpecsFlowSummary` e o contrato correlato do milestone registram `sourceCommand` (`/run_specs` ou `/run_specs_from_validation`) e `entryPoint` (`spec-triage` ou `spec-ticket-validation`), e o `runner` popula esses campos nos dois caminhos.
    - Comando: `rg -n "sourceCommand|entryPoint" src/types/flow-timing.ts src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os tipos e builders de `run-specs` usam os novos campos; os testes focados cobrem explicitamente a variante iniciada por validacao.
  - Requisito: RF-15, RF-16; CA-11
    - Evidencia observavel: resumo final, milestone, `/status` e traces distinguem explicitamente a rodada iniciada por `/run_specs_from_validation`, mantendo `flow: run-specs` como familia unica.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: asserts verdes para overview, milestone, `/status` e trace metadata mostrando comando de origem e ponto de entrada, sem introduzir outro `flow`.
  - Requisito: RF-18; CA-08
    - Evidencia observavel: a variante iniciada por `/run_specs_from_validation` nao marca `spec-triage` como etapa concluida nos timings do summary final nem no milestone.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes para cenarios de `NO_GO`, falha tecnica e `GO` iniciados por validacao, com `completedStages` e texto de timing sem `spec-triage` concluido.
  - Requisito: RF-19
    - Evidencia observavel: help textual do bot, `README.md` e a documentacao operacional do fluxo explicam a diferenca entre retriagem completa e continuidade da validacao, incluindo o novo comando.
    - Comando: `rg -n "/run_specs_from_validation|retriar|continuar da validacao|spec-ticket-validation" src/integrations/telegram-bot.ts README.md docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
    - Esperado: os tres artefatos documentam `/run_specs_from_validation` e diferenciam semanticamente os dois caminhos.
  - Requisito: validacoes herdadas da spec e do ticket
    - Evidencia observavel: `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` passam a cobrir summary/status/timing/documentacao da nova entrada; `npm test` e `npm run check` concluem sem regressao; validacao manual confirma `/status` e resumo final no Telegram.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: cobertura focada verde para summary, milestone, `/status`, timing e help/documentacao da entrada por validacao.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
    - Esperado: suite completa verde sem regressao.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Esperado: tipagem e checks verdes sem divergencia de contratos.
    - Comando: validacao manual em chat autorizado com `/run_specs_from_validation <arquivo-da-spec.md>`.
    - Esperado: `/status` e resumo final identificam explicitamente a rodada pela validacao, com `spec-ticket-validation` como ponto de entrada observavel.

## Idempotence and Recovery
- Idempotencia:
  - a mudanca deve ser aditiva nos contratos de summary e milestone; reexecutar testes e checks nao deve produzir efeitos colaterais alem do working tree;
  - os defaults dos helpers de teste devem preservar o caminho legado para evitar que cenarios antigos precisem declarar metadata nova manualmente;
  - reexecutar a validacao manual pode reenviar resumo e milestone, mas nao deve alterar a semantica do fluxo.
- Riscos:
  - acoplamento excessivo do trace store a uma nova taxonomia de comando, quebrando o agrupamento historico por `run-specs`;
  - regressao editorial em resumos antigos caso o renderer assuma metadata obrigatoria sem fallback;
  - documentacao parcial: atualizar somente help/README e esquecer a doc operacional do fluxo;
  - testes focados cobrirem apenas o caso `GO` e deixarem `NO_GO` ou falha tecnica sem verificacao observavel do novo contrato.
- Recovery / Rollback:
  - se a ampliacao do trace store causar churn alto, manter `sourceCommand: "run-specs"` na envelope do trace e deslocar a distincao fina para `decision.metadata`;
  - se o renderer do Telegram quebrar cenarios legados, adicionar fallback explicito para `sourceCommand: "/run_specs"` e `entryPoint: "spec-triage"` quando a metadata estiver ausente;
  - se a documentacao operacional escolhida nao for a mais canonica, registrar a descoberta em `Surprises & Discoveries` e redirecionar a atualizacao para o artefato correto no mesmo changeset;
  - se algum teste mostrar que `spec-triage` ainda aparece por efeito de fixture/helper, corrigir primeiro os snapshots de teste antes de alterar o renderer novamente.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-03-24-run-specs-from-validation-observability-and-docs-gap.md`
- Spec de origem: `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md`
- Artefatos tecnicos com maior probabilidade de mudanca:
  - `src/types/flow-timing.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `README.md`
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
- Checklist aplicado no planejamento:
  - leitura integral do ticket e de todas as referencias obrigatorias consultadas;
  - declaracao explicita da spec de origem, subset de RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - identificacao de riscos residuais e nao-escopo;
  - amarracao das validacoes automatizadas e manuais diretamente aos closure criteria do ticket.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunSpecsFlowSummary` em `src/types/flow-timing.ts`;
  - possivelmente `RunSpecsTriageLifecycleEvent` em `src/core/runner.ts`;
  - metadata de `decision` usada em traces de workflow para etapas de `run-specs`;
  - helpers editoriais `buildRunSpecsOverviewLines(...)`, `buildRunSpecsTriageMilestoneMessage(...)` e `buildStatusReply(...)`.
- Compatibilidade:
  - manter `flow: "run-specs"` como contrato canonico;
  - manter `WorkflowTraceSourceCommand` agregado por familia, salvo necessidade incontornavel descoberta durante a execucao;
  - preservar o caminho legado `/run_specs` como default/fallback de metadata para fixtures e cenarios historicos.
- Dependencias externas e mocks:
  - `WorkflowTraceStore` e seus testes, caso metadata adicional precise ser persistida;
  - fixtures/helpers de `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` que constroem summaries de `run-specs`;
  - ambiente Telegram autorizado para a validacao manual final.
