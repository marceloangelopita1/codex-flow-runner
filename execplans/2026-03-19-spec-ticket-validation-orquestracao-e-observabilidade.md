# ExecPlan - Integrar spec-ticket-validation na orquestracao e observabilidade do /run_specs

## Purpose / Big Picture
- Objetivo: introduzir `spec-ticket-validation` como gate canonico do fluxo `/run_specs`, bloqueando `spec-close-and-version` e `/run-all` quando o veredito nao for `GO`, com reflexo completo em timing, estado, trace, spec e resumo final do Telegram.
- Resultado esperado:
  - `runSpecsAndRunAll` passa a executar `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` quando o pacote derivado atingir `GO`;
  - `NO_GO` interrompe o fluxo antes de `spec-close-and-version` e `/run-all`, mantendo a rodada sequencial e deixando o motivo observavel;
  - a spec recebe atualizacao automatica na secao `Gate de validacao dos tickets derivados` com veredito, gaps, correcoes aplicadas, causa-raiz provavel e ciclos executados;
  - timing, estado, traces e resumo final do Telegram passam a expor o novo estagio e os dados do gate.
- Escopo:
  - integrar `runSpecTicketValidation(...)` ao runner, reutilizando o contrato/tipos ja entregues no ticket irmao;
  - derivar o pacote de tickets da spec corrente, materializar o resultado do gate na spec e refletir o veredito no fluxo;
  - expandir `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` para o novo estagio e o payload observavel do gate;
  - adicionar/ajustar testes de runner, traces e Telegram para os caminhos `GO` e `NO_GO`.
- Fora de escopo:
  - alterar o contrato interno de `spec-ticket-validation` (taxonomia, parser, sessao stateful, loop de autocorrecao), ja coberto pelo ticket fechado `tickets/closed/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md`;
  - abrir ticket transversal sistemico em `codex-flow-runner` ou `../codex-flow-runner`;
  - alinhar documentacao canonica do contrato `spec -> tickets` e da diretriz de qualidade por token;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-19 16:29Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md` e das referencias obrigatorias do fluxo atual.
- [x] 2026-03-19 17:02Z - Wiring de `spec-ticket-validation` no runner concluido, incluindo bloqueio de `spec-close-and-version` e `/run-all` quando o veredito for `NO_GO`.
- [x] 2026-03-19 17:02Z - Timing, estado, trace, spec e resumo final do Telegram expostos com o novo estagio e os dados do gate.
- [x] 2026-03-19 17:02Z - Matriz de validacao executada com sucesso para os caminhos `GO` e `NO_GO`.

## Surprises & Discoveries
- 2026-03-19 16:29Z - `src/core/runner.ts` ainda encadeia `spec-triage -> spec-close-and-version -> /run-all -> spec-audit`; o novo gate precisa entrar antes de qualquer versionamento da spec ou consumo da fila real.
- 2026-03-19 16:29Z - O contrato do gate ja existe em `src/core/spec-ticket-validation.ts` e `src/types/spec-ticket-validation.ts`, e `src/core/runner.test.ts` ja possui `StubSpecTicketValidationSession`, o que reduz o custo do wiring e dos testes.
- 2026-03-19 16:29Z - Hoje nao existe helper explicito para montar o pacote derivado da spec corrente; sera necessario resolver a linhagem dos tickets abertos via metadata (`Source spec`) e/ou `Related tickets` da spec.
- 2026-03-19 16:29Z - Nao ha mecanismo atual para escrever a secao `Gate de validacao dos tickets derivados` fora dos stages Codex; o caminho `NO_GO` exige persistencia local antes de `spec-close-and-version`, mesmo sem commit/push.
- 2026-03-19 17:02Z - Os testes de `/run_specs` dependiam apenas de stubs de stage; como o novo gate le a spec e os tickets reais em disco, foi necessario promover fixtures temporarias de projeto/spec/ticket nos cenarios de runner para validar a linhagem sem afrouxar o comportamento de producao.

## Decision Log
- 2026-03-19 - Decisao: reutilizar `runSpecTicketValidation(...)` e `SpecTicketValidationResult` como fonte unica do veredito em vez de reimplementar o loop dentro de `src/core/runner.ts`.
  - Motivo: o ticket atual cobre orquestracao e observabilidade; duplicar o motor do gate criaria divergencia com o ticket irmao ja entregue.
  - Impacto: o runner passa a consumir um contrato consolidado e apenas projeta o resultado para timing, estado, trace, spec e Telegram.
- 2026-03-19 - Decisao: tratar `NO_GO` como etapa `spec-ticket-validation` concluida com bloqueio funcional do fluxo, nao como excecao tecnica da etapa.
  - Motivo: o gate pode terminar corretamente em `NO_GO`; isso precisa aparecer como veredito observavel, nao como erro generico de execucao.
  - Impacto: `finalStage` e `completionReason` do resumo final precisam distinguir `NO_GO` de falha tecnica da etapa.
- 2026-03-19 - Decisao: derivar o pacote da spec corrente prioritariamente a partir dos tickets abertos cujo metadata `Source spec` aponta para a spec alvo; usar `Related tickets` da spec apenas como fallback conservador quando a heranca de metadata estiver incompleta.
  - Motivo: o gate precisa validar somente o backlog desta linhagem, sem capturar tickets abertos de outras rodadas.
  - Impacto: o runner precisara de um helper pequeno de leitura/parsing para tickets/specs antes de chamar `runSpecTicketValidation(...)`.
- 2026-03-19 - Decisao: persistir a secao `Gate de validacao dos tickets derivados` imediatamente apos o veredito do gate, substituindo deterministicamente a secao existente.
  - Motivo: RF-15/CA-10 exigem registro na spec tambem para `NO_GO`, e `spec-close-and-version` nao roda nesse caminho.
  - Impacto: a rodada `NO_GO` pode deixar a spec modificada no working tree sem versionamento; isso e intencional e deve ser tratado como evidencia da rodada bloqueada.
- 2026-03-19 - Decisao: manter o campo `triageTiming` por compatibilidade, mas expandi-lo para cobrir todos os stages pre-`/run-all`, incluindo `spec-ticket-validation`.
  - Motivo: o milestone de pre-rodada ja existe e continua util; renomear o contrato agora aumentaria o churn sem valor funcional adicional.
  - Impacto: `RunSpecsTriageTimingStage`, ordens de exibicao do Telegram e testes precisam ser atualizados para incluir o novo estagio.
- 2026-03-19 - Decisao: preservar o conteudo normativo ja existente na secao `Gate de validacao dos tickets derivados` da spec e anexar/substituir apenas a subsecao `### Ultima execucao registrada`.
  - Motivo: a spec ja usava essa secao como contrato funcional do gate; substituir tudo apagaria contexto importante do documento vivo.
  - Impacto: a persistencia do gate continua deterministica e idempotente sem degradar a documentacao funcional da spec.
- 2026-03-19 - Decisao: tratar `autoCorrect(...)` no wiring do runner como reconstrucao do `packageContext` a partir do working tree atual, sem reimplementar edicoes do backlog fora do proprio stage Codex.
  - Motivo: o ticket atual cobre orquestracao/observabilidade, e o contrato do gate ja reporta correcoes aplicadas na propria rodada.
  - Impacto: revalidacoes usam o estado atualizado em disco e mantem o runner pequeno, delegando a autoria das mudancas ao stage `spec-ticket-validation`.

## Outcomes & Retrospective
- Status final: implementacao e validacao local concluidas; fechamento formal do ticket/commit permanece pendente por instrucao desta etapa.
- O que funcionou:
  - o runner agora executa `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` no caminho `GO`, e encerra a rodada em `spec-ticket-validation` com `completionReason` especifico quando o veredito for `NO_GO`;
  - a spec recebe uma subsecao idempotente `### Ultima execucao registrada` com veredito, gaps, correcoes, causa-raiz provavel, ciclos e tickets avaliados;
  - traces, timing, estado e resumo final do Telegram passaram a expor o novo stage e o payload observavel do gate;
  - fixtures temporarias de projeto garantiram teste fiel da linhagem `spec -> tickets/open` sem relaxar o comportamento real do runner.
- O que fica pendente fora deste plano:
  - ticket transversal sistemico de melhoria de workflow;
  - ajustes documentais do contrato `spec -> tickets` e da diretriz de qualidade por token;
  - quaisquer mudancas cross-repo para `codex-flow-runner`.
- Proximos passos:
  - seguir para a etapa dedicada de fechamento do ticket, mantendo o arquivo em `tickets/open/` ate o commit/push correspondente;
  - preservar a matriz de validacao desta rodada como evidencia objetiva do fechamento futuro;
  - atacar os tickets irmaos ainda abertos (`workflow ticket transversal` e `contrato canonico spec -> tickets`) em rodadas separadas.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/core/runner.test.ts`
  - `src/types/flow-timing.ts`
  - `src/types/state.ts`
  - `src/types/spec-ticket-validation.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/workflow-trace-store.test.ts`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/05-encerrar-tratamento-spec-commit-push.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
- Spec de origem: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-10, RF-15, RF-16, RF-17, RF-24, RF-25, RF-27
  - CA-01, CA-10, CA-11, CA-12, CA-16, CA-17
- Assumptions / defaults adotados:
  - o nome canonico do novo estagio permanece `spec-ticket-validation`;
  - o veredito `GO/NO_GO` vale para o pacote derivado inteiro, nunca para tickets isolados;
  - `spec-audit` permanece separado e posterior ao `/run-all`, sem absorver a semantica do novo gate;
  - `triageTiming` continua sendo o snapshot pre-`/run-all`, agora com `spec-triage`, `spec-ticket-validation` e `spec-close-and-version`;
  - o pacote derivado sera serializado a partir dos tickets abertos da linhagem da spec, priorizando metadata `Source spec` e usando `Related tickets` apenas como fallback diagnosticado;
  - a secao `Gate de validacao dos tickets derivados` deve ser atualizada para `GO` e `NO_GO` antes de qualquer decisao sobre `spec-close-and-version`;
  - quando o gate terminar em `NO_GO`, a spec pode permanecer modificada no working tree sem versionamento; isso e aceitavel e faz parte da evidencia local da rodada bloqueada;
  - o resumo final do Telegram deve ser compacto: listar veredito, ciclos, gaps/correcoes em forma resumida e deixar evidencias detalhadas na spec e no trace.
- Fluxo atual relevante (as-is):
  - `runSpecsAndRunAll(...)` hoje executa apenas `spec-triage`, `spec-close-and-version`, `runForever(...)` e `spec-audit`;
  - `RunSpecsTriageTimingStage`, `RunSpecsFlowTimingStage`, `RunnerPhase` e `WorkflowTraceStage` ainda nao conhecem `spec-ticket-validation`;
  - `buildRunSpecsFlowSummary(...)` e `buildRunFlowSummaryMessage(...)` ainda nao carregam veredito, gaps, correcoes ou ciclos;
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` ja instrui a triagem a atualizar `Related tickets` da spec e a criar tickets com `Source spec`, mas o runner ainda nao consome essa linhagem.
- Restricoes tecnicas:
  - manter fluxo estritamente sequencial;
  - nao alterar a semantica do `spec-audit`;
  - toda validacao deste plano deve nascer dos closure criteria do ticket, nao do checklist generico;
  - respeitar arquitetura por camadas, isolando leitura/escrita de arquivos em helpers pequenos quando isso simplificar o runner.

## Plan of Work
- Milestone 1: Wiring canonico do gate no runner
  - Entregavel: `src/core/runner.ts` passa a montar o pacote derivado da spec corrente, rodar `spec-ticket-validation` entre `spec-triage` e `spec-close-and-version`, e decidir explicitamente entre caminho `GO`, caminho `NO_GO` e falha tecnica da etapa.
  - Evidencia de conclusao: testes de runner mostram a sequencia `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` para `GO` e mostram que `spec-close-and-version`/`/run-all` nao executam quando o gate retorna `NO_GO`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, possivelmente um helper pequeno de leitura/escrita de spec/ticket em `src/integrations/`.
- Milestone 2: Persistencia observavel do veredito na spec e no estado do fluxo
  - Entregavel: a secao `Gate de validacao dos tickets derivados` da spec passa a ser atualizada deterministicamente, e o resumo de fluxo/estado carrega um snapshot estruturado do gate com veredito, confianca, gaps, correcoes e ciclos executados.
  - Evidencia de conclusao: testes de runner validam o conteudo persistido na spec para `GO` e `NO_GO`, alem do estado final e dos snapshots de timing/status.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/core/runner.test.ts`.
- Milestone 3: Traces e Telegram refletem o novo stage
  - Entregavel: o trace store aceita `spec-ticket-validation` e registra metadata do gate; o resumo final de `/run_specs` no Telegram passa a mostrar veredito, gaps, correcoes aplicadas e ciclos.
  - Evidencia de conclusao: suites de `workflow-trace-store` e `telegram-bot` provam o novo stage, o metadata do gate e a renderizacao do resumo final para `GO` e `NO_GO`.
  - Arquivos esperados: `src/integrations/workflow-trace-store.ts`, `src/integrations/workflow-trace-store.test.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4: Regressao do fluxo principal
  - Entregavel: matriz de validacao focada e regressao completa do repositorio executadas sem falhas apos o wiring.
  - Evidencia de conclusao: `tsx --test` focado, `npm test`, `npm run check` e `npm run build` verdes.
  - Arquivos esperados: sem novos arquivos de produto; apenas eventuais ajustes finais em testes e tipos.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `rg -n "spec-ticket-validation|runSpecsAndRunAll|RunSpecsFlowSummary|RunnerPhase" src/core src/types src/integrations` para confirmar todos os contratos que ainda nao conhecem o novo stage antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/flow-timing.ts` e `src/types/state.ts` para:
   - adicionar `spec-ticket-validation` aos enums/stages de `/run_specs`;
   - introduzir um snapshot estruturado do gate no resumo de fluxo e no estado, com campos observaveis suficientes para Telegram/trace/spec;
   - diferenciar `NO_GO` de falha tecnica do stage via `completionReason`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` e, se simplificar a camada, em um helper pequeno de `src/integrations/` para:
   - coletar tickets abertos da linhagem da spec alvo;
   - serializar `packageContext` para `runSpecTicketValidation(...)`;
   - persistir a secao `Gate de validacao dos tickets derivados` na spec de forma deterministica;
   - encapsular recovery seguro em caso de falha na escrita da spec.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para integrar o gate ao fluxo:
   - rodar `spec-ticket-validation` logo apos `spec-triage`;
   - registrar timing de sucesso/falha da etapa;
   - encerrar a rodada com `finalStage: spec-ticket-validation` e `completionReason` especifico quando o veredito for `NO_GO`;
   - permitir `spec-close-and-version` e `/run-all` apenas quando o veredito for `GO`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/workflow-trace-store.ts` e `src/integrations/workflow-trace-store.test.ts` para aceitar `spec-ticket-validation` como `WorkflowTraceStage` e registrar metadata observavel do gate, incluindo veredito, confianca, gaps resumidos, correcoes aplicadas e ciclos executados.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts` para:
   - atualizar a ordem de stages/timings de `/run_specs`;
   - renderizar um bloco do gate no resumo final com `GO/NO_GO`, ciclos, gaps e correcoes;
   - manter o resumo legivel no caminho `NO_GO`, sem depender de `runAllSummary`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts` para cobrir, no minimo:
   - caminho `GO` com sequencia completa incluindo `spec-ticket-validation`;
   - caminho `NO_GO` bloqueando `spec-close-and-version` e `/run-all`;
   - snapshots de timing/status/final summary para `GO` e `NO_GO`;
   - persistencia da secao da spec com veredito, gaps, correcoes aplicadas e ciclos executados;
   - emissao de traces com stage/metadata do gate.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` para validar o wiring do gate, a persistencia na spec, os traces e o resumo final.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao completa apos os testes focados.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem e contratos expandidos de `flow-timing`/`state`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir compilacao do fluxo completo.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/core/runner.test.ts src/types/flow-timing.ts src/types/state.ts src/integrations/workflow-trace-store.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/core/spec-ticket-validation.ts src/types/spec-ticket-validation.ts prompts/01-avaliar-spec-e-gerar-tickets.md prompts/05-encerrar-tratamento-spec-commit-push.md prompts/09-validar-tickets-derivados-da-spec.md` para auditoria final do escopo efetivamente tocado.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01, RF-10, RF-24, RF-25; CA-01, CA-16, CA-17
    - Evidencia observavel: testes de `runner` mostram a sequencia `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` em caso `GO`, e mostram que `spec-close-and-version`/`/run-all` nao sao executados quando o gate retornar `NO_GO`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: asserts verdes para o caminho `GO` com o novo stage entre `spec-triage` e `spec-close-and-version`, e para o caminho `NO_GO` com `finalStage: spec-ticket-validation`, `completionReason` especifico e ausencia de chamadas a `spec-close-and-version`/`run-all`.
  - Requisito: RF-15, RF-16, RF-17, RF-27; CA-10, CA-11, CA-12
    - Evidencia observavel: `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` passam a expor `spec-ticket-validation`, veredito, gaps, correcoes aplicadas e ciclos executados; a spec recebe atualizacao automatica na secao `Gate de validacao dos tickets derivados`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes comprovando o novo stage e metadata no trace, a secao persistida na spec com os campos exigidos e a mensagem final do Telegram exibindo `GO/NO_GO`, gaps, correcoes e ciclos.
  - Requisito: regressao do fluxo principal
    - Evidencia observavel: testes automatizados validam snapshots de timing, status e resumo final do Telegram para os caminhos `GO` e `NO_GO`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
    - Esperado: suite completa verde, incluindo snapshots/assercoes de timing e status de `/run_specs` para `GO` e `NO_GO`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Esperado: tipagem verde sem inconsistencias entre novos enums/stages e consumidores.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - Esperado: build verde com os contratos de observabilidade e do runner integrados.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar o fluxo para a mesma spec deve substituir a secao `Gate de validacao dos tickets derivados` sem duplicar heading nem blocos antigos;
  - o caminho `NO_GO` deve ser deterministico: nunca pode vazar para `spec-close-and-version` ou `/run-all` em reruns;
  - reexecutar a matriz de testes nao deve gerar efeitos colaterais fora do working tree local e dos artefatos de trace gerados pela propria rodada de teste.
- Riscos:
  - resolver a linhagem dos tickets de forma ampla demais e validar tickets abertos que nao pertencem a esta spec;
  - resolver a linhagem de forma estreita demais e omitir ticket derivado relevante do `packageContext`;
  - deixar a spec inconsistente se a escrita da secao do gate falhar no meio do processo;
  - ampliar demais o resumo do Telegram e degradar a legibilidade operacional.
- Recovery / Rollback:
  - antes de escrever a secao do gate, manter snapshot do conteudo atual da spec; se a escrita falhar, restaurar o snapshot e marcar a rodada como falha tecnica de `spec-ticket-validation`;
  - se a derivacao do pacote da spec ficar ambigua, abortar antes de `spec-close-and-version` com diagnostico explicito, em vez de validar backlog incorreto;
  - se a mensagem do Telegram ficar grande demais, reduzir detalhes para resumos de gaps/correcoes na mensagem e deixar a lista completa na spec e nos traces;
  - se a expansao de `triageTiming` quebrar consumidores, preservar o nome do campo e ajustar apenas a ordem/lista de stages, evitando renomeacoes maiores no mesmo changeset.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
- Spec de origem:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Checklist aplicado no planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita da spec de origem e do subconjunto de RFs/CAs;
  - registro de assumptions/defaults para eliminar ambiguidade do `NO_GO` e da persistencia na spec;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - declaracao de riscos residuais e de nao-escopo.
- Nota de qualidade: o checklist de `docs/workflows/codex-quality-gates.md` foi usado para garantir completude do plano, mas toda a validacao operacional acima deriva exclusivamente dos closure criteria do ticket.
- Referencias tecnicas consumidas:
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/core/runner.test.ts`
  - `src/types/flow-timing.ts`
  - `src/types/state.ts`
  - `src/types/spec-ticket-validation.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/spec-discovery.ts`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/05-encerrar-tratamento-spec-commit-push.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
- Tickets correlatos fora do escopo direto:
  - `tickets/closed/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md`
  - `tickets/open/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`
  - `tickets/open/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`
- Artefatos esperados ao final da execucao:
  - spec atualizada com a secao `Gate de validacao dos tickets derivados`;
  - traces de `spec-ticket-validation` em `.codex-flow-runner/flow-traces/`;
  - resumos finais de `/run_specs` no Telegram cobrindo `GO` e `NO_GO`;
  - diff consolidado apenas nas superficies do runner, tipos, trace store, Telegram e testes associados.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `RunSpecsTriageTimingStage`, `RunSpecsFlowTimingStage`, `RunSpecsTriageFinalStage`, `RunSpecsFlowFinalStage` e `RunSpecsFlowCompletionReason` em `src/types/flow-timing.ts`;
  - `RunnerPhase` e o espelho de `lastRunFlowSummary` em `src/types/state.ts`;
  - `WorkflowTraceStage` e `WorkflowTraceDecision.metadata` em `src/integrations/workflow-trace-store.ts`;
  - o payload renderizado por `buildRunFlowSummaryMessage(...)` em `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - `spec-audit` continua sendo o gate final apos `/run-all` bem-sucedido;
  - o motor `runSpecTicketValidation(...)` permanece sendo o dono do contrato do veredito, e o runner apenas o orquestra;
  - o fluxo continua sequencial e nao deve introduzir paralelizacao de tickets.
- Dependencias externas e mocks:
  - dependencia direta de `src/core/spec-ticket-validation.ts` e `src/types/spec-ticket-validation.ts`;
  - leitura/escrita local de arquivos da spec e de `tickets/open/`;
  - `StubCodexClient`/`StubSpecTicketValidationSession` em `src/core/runner.test.ts` como seam principal para os testes de wiring;
  - helpers de summary em `src/integrations/telegram-bot.test.ts` e coletores de trace em `src/integrations/workflow-trace-store.test.ts`.
