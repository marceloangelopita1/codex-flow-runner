# ExecPlan - spec-ticket-derivation-retrospective pre-run-all

## Purpose / Big Picture
- Objetivo: introduzir a etapa nomeada `spec-ticket-derivation-retrospective` no `/run_specs`, entre `spec-ticket-validation` e `spec-close-and-version`, com regras observaveis de execucao/skip, contexto proprio de analise sistemica e publication nao bloqueante.
- Resultado esperado:
  - o runner decide de forma explicita se executa ou pula a retrospectiva pre-run-all a partir do historico completo do gate funcional;
  - o novo stage aparece em tipos, timing, traces, estado do runner e resumo final com motivo explicito de skip ou execucao;
  - a analise reutiliza a taxonomia/confianca e a publication cross-repo ja existentes, sem alterar o veredito funcional do projeto alvo.
- Escopo:
  - evoluir a orquestracao de `runSpecsAndRunAll(...)` para encaixar a nova etapa nao bloqueante antes de `spec-close-and-version`;
  - introduzir prompt/stage dedicado de `derivation-gap-analysis` e reaproveitar parser/tipos/publication da retrospectiva pos-`spec-audit` onde isso for semanticamente seguro;
  - ajustar contratos de tipos, traces, estado e Telegram para distinguir a retrospectiva pre-run-all do gate funcional e da retrospectiva pos-auditoria;
  - ampliar a cobertura automatizada dos cenarios exigidos pelo ticket.
- Fora de escopo:
  - mover write-back funcional/sistemico dentro da spec e alinhar `SPECS.md`/template global; isso pertence ao ticket `2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap`;
  - impedir duplicacao causal com a retrospectiva pos-`spec-audit`; isso pertence ao ticket `2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap`;
  - materializar o contrato documental de compatibilidade do projeto alvo (`README.md`, `AGENTS.md`, `docs/workflows/target-project-compatibility-contract.md`); isso pertence ao ticket `2026-03-20-target-project-compatibility-contract-gap`.

## Progress
- [x] 2026-03-20 02:11Z - Leitura completa do ticket, da spec de origem, do padrao `PLANS.md` e do checklist `docs/workflows/codex-quality-gates.md`.
- [x] 2026-03-20 02:11Z - Referencias tecnicas do ticket revisitadas (`runner`, tipos, traces, Telegram, parser, prompt e testes existentes).
- [x] Execucao concluida - Contrato do novo stage pre-run-all definido em tipos, resumo final, traces e estado do runner.
- [x] Execucao concluida - Orquestracao `spec-ticket-validation -> spec-ticket-derivation-retrospective -> spec-close-and-version` implementada com regras de execucao/skip e degradacao nao bloqueante.
- [x] Execucao concluida - Prompt/contexto dedicado de `derivation-gap-analysis` integrado com taxonomia/confianca e publication cross-repo reaproveitadas.
- [x] Execucao concluida - Suites automatizadas e validacoes finais executadas com evidencias aderentes aos closure criteria do ticket.

## Surprises & Discoveries
- 2026-03-20 02:11Z - O fluxo atual encerra em `spec-ticket-validation` quando ha `NO_GO` e pula direto para `spec-close-and-version` quando ha `GO`, entao a nova etapa precisa mexer tanto no caminho feliz quanto no caminho bloqueado de `/run_specs`.
- 2026-03-20 02:11Z - `WorkflowGapAnalysisResult` e `WorkflowImprovementTicketPublicationResult` ja modelam taxonomia, confianca, degradacao nao bloqueante e publication cross-repo, mas hoje estao acoplados semanticamente a `spec-workflow-retrospective`; o plano deve reaproveitar shape sem apagar a distincao entre pre-run-all e pos-auditoria.
- 2026-03-20 02:11Z - `telegram-bot.ts`, `flow-timing.ts`, `state.ts`, `workflow-trace-store.ts` e `codex-client.ts` usam listas fechadas de stages/fases; o stage novo precisa ser adicionado de ponta a ponta para evitar silenciar observabilidade.
- 2026-03-20 02:11Z - A spec de origem ja deixa claro que existem tickets irmaos para write-back, anti-duplicacao e contrato de compatibilidade; manter essa fronteira evita misturar escopos.
- Execucao - O conceito de "gap revisado" da spec precisa ser interpretado como gap efetivamente observado pelo gate funcional, e nao apenas gap corrigido em revalidacao; isso foi necessario para alinhar `NO_GO` com historico estruturado e falha tecnica parcial aos RF-07/RF-09/RF-11.
- Execucao - Para tornar skips observaveis sem invocacao ao Codex, o stage pre-run-all precisou registrar trace sintetico com metadata estruturada e timing proprio, mantendo `finalStage` separado do fato de o stage ter sido pulado.
- Execucao - A reutilizacao do parser/taxonomia pos-`spec-audit` exigiu ampliar `inputMode` para `spec-ticket-validation-history`; a semantica de classificacao/confianca permaneceu compartilhada.

## Decision Log
- 2026-03-20 - Decisao: tratar `spec-ticket-derivation-retrospective` como stage nomeado de `/run_specs`, distinto de `spec-ticket-validation` e de `spec-workflow-retrospective`, mas reutilizando os mesmos tipos-base de analise/publication sempre que a semantica coincidir.
  - Motivo: o ticket exige separacao observavel de causalidade antes do `/run-all` sem duplicar infra de parser/classificacao/publication.
  - Impacto: adiciona novo stage em tipos, prompt map, traces, timing, estado e resumos; reduz risco de conflitar com o ticket de anti-duplicacao.
- 2026-03-20 - Decisao: modelar motivos de skip explicitamente no resumo/traces em vez de inferir skip por ausencia de payload.
  - Motivo: RF-08, RF-10 e os closure criteria pedem motivo observavel de skip e `finalStage`/`completionReason` coerentes.
  - Impacto: exige contrato de resumo suficientemente explicito para Telegram/testes mesmo quando a analise nao roda.
- 2026-03-20 - Decisao: manter a etapa pre-run-all estritamente nao bloqueante, degradando falhas tecnicas de analise/publication para `operational-limitation` quando a infraestrutura compartilhada nao conseguir concluir a rodada com seguranca.
  - Motivo: RF-05, RF-06 e o terceiro bloco de closure criteria proíbem alterar o desfecho funcional do projeto alvo.
  - Impacto: implementacao precisa separar falha do gate funcional de falha da retrospectiva pre-run-all.
- Execucao - Decisao: manter um resumo dedicado `specTicketDerivationRetrospective` no `RunSpecsFlowSummary`, em vez de reciclar `workflowGapAnalysis`/`workflowImprovementTicket` pos-auditoria.
  - Motivo: o ticket exige distinguir explicitamente a retrospectiva pre-run-all da retrospectiva pos-`spec-audit` em Telegram, traces, `finalStage` e testes.
  - Impacto: contratos ficaram aditivos e preservaram compatibilidade com a retrospectiva pos-auditoria.
- Execucao - Decisao: propagar historico parcial estruturado de `spec-ticket-validation` em falhas tecnicas para permitir execucao da retrospectiva pre-run-all quando houver insumo suficiente.
  - Motivo: RF-10/RF-11 exigem diferenciar falha tecnica sem insumo estruturado de falha tecnica apos material parseavel.
  - Impacto: `spec-ticket-validation` ganhou `technical-failure-partial-history` no resumo interno e o runner passou a decidir a retrospectiva com base nesse snapshot parcial.

## Outcomes & Retrospective
- Status final: execucao concluida no working tree; ticket ainda nao foi fechado por instrucao desta etapa.
- O que funcionou: o shape compartilhado de `WorkflowGapAnalysisResult`/publication foi reutilizado sem duplicar taxonomia; a separacao pre-run-all vs pos-auditoria ficou explicita em summary, traces, timing e Telegram; a cobertura automatizada passou a cobrir `GO`, `NO_GO`, skip e falha tecnica parcial.
- O que ficou pendente: write-back da retrospectiva na spec corrente, anti-duplicacao causal com `spec-workflow-retrospective` e contrato documental de compatibilidade continuam fora deste ticket, exatamente como planejado.
- Validacoes executadas:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts` -> verde.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` -> verde.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> verde.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` -> verde.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - orquestracao de `/run_specs`, regras de `finalStage`, `completionReason`, timing, milestones e publication.
  - `src/types/flow-timing.ts` - enums/tipos de fases e payload final de `RunSpecsFlowSummary`.
  - `src/types/state.ts` - fases observaveis do runner para bot/status.
  - `src/integrations/codex-client.ts` - mapa `SpecFlowStage -> prompt`, construcao de prompt e contrato de execucao por stage.
  - `src/integrations/workflow-trace-store.ts` - trilha request/response/decision por stage nomeado.
  - `src/types/workflow-gap-analysis.ts` e `src/integrations/workflow-gap-analysis-parser.ts` - taxonomia, confianca, limitation e parse do bloco estruturado.
  - `src/integrations/workflow-improvement-ticket-publisher.ts` - publication/reuse cross-repo do ticket transversal.
  - `src/integrations/telegram-bot.ts` - renderizacao de milestone e resumo final de `/run_specs`.
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` - prompt atual da retrospectiva pos-`spec-audit`, referencia para extrair a parte reaproveitavel e evitar duplicacao.
  - `src/core/runner.test.ts`, `src/integrations/workflow-trace-store.test.ts`, `src/integrations/workflow-gap-analysis-parser.test.ts`, `src/integrations/telegram-bot.test.ts` - suites que precisam receber o novo contrato observavel.
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- RFs/CAs cobertos por este plano:
  - RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-32, RF-33, RF-34.
  - CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-16.
- Assumptions / defaults adotados:
  - `spec-ticket-validation` permanece o gate funcional canonico e sua saida continua sendo a unica fonte para decidir `GO` vs `NO_GO`.
  - `spec-ticket-derivation-retrospective` sera um stage nomeado distinto de `spec-workflow-retrospective`, mesmo quando reutilizar `WorkflowGapAnalysisResult` e `WorkflowImprovementTicketPublicationResult`.
  - O novo prompt dedicado sera numerado e registrado no mapa de prompts de spec; o nome default adotado neste plano e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`.
  - Motivos de skip serao tratados como evidencias de observabilidade do stage pre-run-all, nao como ausencia silenciosa de payload.
  - Em projeto externo, a fase pre-run-all continua read-only sobre a spec e artefatos do projeto alvo; qualquer publication elegivel segue para `.` ou `../codex-flow-runner` via publisher existente.
  - Este ticket nao muda a secao documental de write-back da spec nem a politica anti-duplicacao pos-`spec-audit`; apenas preserva separacao suficiente para os tickets irmaos trabalharem depois.
- Fluxo atual (as-is):
  - `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit -> spec-workflow-retrospective (se residualGapsDetected)`.
  - `NO_GO` encerra a rodada com `finalStage: "spec-ticket-validation"` antes de qualquer retrospectiva pre-run-all.
  - `GO` segue direto para `spec-close-and-version`, sem contexto dedicado de `derivation-gap-analysis`/`derivation-ticket-publication`.
- Fluxo alvo deste ticket (to-be):
  - `spec-triage -> spec-ticket-validation -> spec-ticket-derivation-retrospective (executa ou pula com motivo explicito) -> spec-close-and-version`.
  - Se `GO`, o fluxo continua para `/run-all`.
  - Se `NO_GO`, o fluxo pode terminar apos a retrospectiva pre-run-all quando houver historico estruturado suficiente.
- Restricoes tecnicas:
  - manter fluxo sequencial e sem paralelizacao de tickets;
  - nao tornar a retrospectiva pre-run-all bloqueante;
  - aplicar o checklist de `docs/workflows/codex-quality-gates.md` durante implementacao e validacao;
  - cada comando com `node`/`npm`/`npx` precisa repetir `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.

## Plan of Work
- Milestone 1 - Contrato nomeado do novo stage pre-run-all
  - Entregavel: `spec-ticket-derivation-retrospective` adicionado de ponta a ponta em tipos, fases observaveis, prompt map e traces, com superficie distinta das fases `spec-ticket-validation` e `spec-workflow-retrospective`.
  - Evidencia de conclusao: `RunSpecsFlowTimingStage`, `RunSpecsFlowFinalStage`, `RunnerPhase`, `WorkflowTraceStage` e `SpecFlowStage` aceitam o novo stage; existe prompt dedicado mapeado no `codex-client`.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/types/state.ts`
    - `src/integrations/codex-client.ts`
    - `src/integrations/workflow-trace-store.ts`
    - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
- Milestone 2 - Orquestracao, ativacao e skip observavel
  - Entregavel: `runSpecsAndRunAll(...)` decide executar ou pular a retrospectiva pre-run-all usando o historico completo do gate funcional, inclusive nos caminhos `GO`, `NO_GO` e falha tecnica com/s/sem insumo estruturado.
  - Evidencia de conclusao: o resumo final e o milestone de triagem carregam `finalStage`, `completionReason`, timing e detalhes coerentes para execucao, skip por ausencia de gaps revisados e skip por insuficiencia de insumos.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/types/flow-timing.ts`
    - possivelmente `src/types/spec-ticket-validation.ts` apenas se faltar sinal derivavel do historico atual
- Milestone 3 - Contexto dedicado de `derivation-gap-analysis` e publication nao bloqueante
  - Entregavel: novo contexto pre-run-all em thread nova, com releitura da spec, pacote final de tickets derivados, historico completo do gate funcional e fontes canonicas do workflow, reutilizando taxonomia/confianca e publication cross-repo.
  - Evidencia de conclusao: parser/tipos aceitam a mesma taxonomia/confianca da retrospectiva pos-`spec-audit`; publication cria ou reutiliza no maximo um ticket transversal agregado e falhas degradam para `operational-limitation`.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/types/workflow-gap-analysis.ts`
    - `src/integrations/workflow-gap-analysis-parser.ts`
    - `src/integrations/workflow-improvement-ticket-publisher.ts` (somente se algum contrato adicional for realmente necessario)
    - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
- Milestone 4 - Observabilidade final e testes de fechamento
  - Entregavel: traces, Telegram e suites automatizadas distinguem a retrospectiva pre-run-all, seus motivos de skip e seu efeito nao bloqueante.
  - Evidencia de conclusao: testes do runner, trace store, parser e Telegram cobrem exatamente os cenarios exigidos nos closure criteria do ticket.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/core/runner.test.ts`
    - `src/integrations/workflow-trace-store.test.ts`
    - `src/integrations/workflow-gap-analysis-parser.test.ts`
    - `src/integrations/telegram-bot.test.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "spec-ticket-validation|spec-close-and-version|spec-workflow-retrospective|RunSpecsFlow|RunnerPhase|WorkflowTraceStage"` em `src/` para consolidar todos os pontos que hoje usam listas fechadas de stage/fase.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/flow-timing.ts` para introduzir `spec-ticket-derivation-retrospective` no contrato de triagem e de fluxo, incluindo `finalStage` e, se necessario, um `completionReason`/detalhe observavel para skip nao silencioso.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts`, `src/integrations/codex-client.ts` e `src/integrations/workflow-trace-store.ts` para aceitar o novo stage nomeado, mapear o prompt dedicado e permitir trilhas request/response/decision da etapa pre-run-all.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` tomando `prompts/11-retrospectiva-workflow-apos-spec-audit.md` como base, mas ajustando o contexto minimo para: releitura da spec, pacote final de tickets derivados, historico completo de `spec-ticket-validation`, fontes canonicas do workflow, regra read-only em projeto externo e proibicao de alterar o veredito funcional.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/types/workflow-gap-analysis.ts` e `src/integrations/workflow-gap-analysis-parser.ts` para confirmar que a taxonomia/confianca atual cobre integralmente a retrospectiva pre-run-all; ajustar apenas o que for indispensavel para representar input/contexto ou sinais de publication/limitation sem criar taxonomia paralela.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/core/runner.ts` para introduzir um helper dedicado da retrospectiva pre-run-all, separado da retrospectiva pos-`spec-audit`, incluindo:
   - decisao de ativacao baseada no historico completo do gate funcional;
   - skip explicito por ausencia de gaps revisados;
   - skip explicito por insuficiencia de insumo estruturado;
   - execucao mesmo em `NO_GO` quando houver historico suficiente;
   - degradacao de falha tecnica para `operational-limitation` sem bloquear `spec-close-and-version` ou o encerramento do fluxo.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar o contrato de resumo final de `/run_specs` em `src/types/flow-timing.ts` e o consumo correspondente em `src/core/runner.ts` para distinguir claramente o resultado da retrospectiva pre-run-all do resultado pos-`spec-audit`, inclusive em `finalStage`, `completionReason`, detalhes, timing e publication.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.ts` para:
   - incluir o novo stage na ordem de tempos;
   - distinguir no texto o gate funcional da retrospectiva da derivacao;
   - exibir o motivo de skip/execucao e eventual publication/limitation da etapa pre-run-all sem confundir com a retrospectiva pos-auditoria.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `src/core/runner.test.ts` com cenarios que cubram os closure criteria do ticket:
   - `GO` com gap revisado e execucao da retrospectiva pre-run-all;
   - `NO_GO` com historico estruturado suficiente e `finalStage` na retrospectiva pre-run-all;
   - skip por ausencia de gaps revisados;
   - skip por insuficiencia de insumos estruturados;
   - publication criando/reutilizando no maximo 1 ticket agregado no repo correto;
   - falha tecnica de analise/publication degradando para `operational-limitation` nao bloqueante.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/workflow-trace-store.test.ts`, `src/integrations/workflow-gap-analysis-parser.test.ts` e `src/integrations/telegram-bot.test.ts` para validar stage nomeado, metadata estruturada e renderizacao observavel da nova etapa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts` para validar os cenarios diretamente ligados aos closure criteria deste ticket.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao do repositorio apos o fechamento das evidencias focadas.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar tipagem do changeset.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para confirmar build do changeset.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/types/flow-timing.ts src/types/state.ts src/integrations/codex-client.ts src/integrations/workflow-trace-store.ts src/types/workflow-gap-analysis.ts src/integrations/workflow-gap-analysis-parser.ts src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para auditoria final de escopo antes do fechamento do ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-32, RF-33, RF-34; CA-01, CA-02, CA-03, CA-04, CA-16.
  - Evidencia observavel: `src/core/runner.test.ts` comprova os cenarios `GO` com gap revisado, `NO_GO` com historico estruturado suficiente, skip por ausencia de gaps revisados e skip por insuficiencia de insumos estruturados; o resumo final e o milestone de triagem expõem `finalStage`, `completionReason`, timing e detalhes que distinguem execucao vs skip da retrospectiva pre-run-all.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: existe cobertura verde para todos os cenarios acima, inclusive o caso em que `spec-ticket-derivation-retrospective` se torna fase final observavel quando o fluxo termina antes do `/run-all`.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19; CA-05, CA-06, CA-07, CA-09, CA-10.
  - Evidencia observavel: existe prompt/stage dedicado de `derivation-gap-analysis` em contexto novo, com releitura da spec, pacote final de tickets derivados, historico completo do gate funcional e fontes canonicas do `codex-flow-runner`; parser/tipos aceitam a mesma taxonomia/confianca da retrospectiva pos-`spec-audit`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-gap-analysis-parser.test.ts src/core/runner.test.ts`
    - Esperado: a suite valida o novo prompt/contexto pre-run-all, a thread nova da analise, a taxonomia compartilhada e o parse correto do bloco estruturado sem regressao na retrospectiva pos-`spec-audit`.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-20, RF-21, RF-22, RF-23, RF-24, RF-25; CA-08, CA-11.
  - Evidencia observavel: a publication cria ou reutiliza no maximo 1 ticket transversal agregado por rodada, no repo correto (`.` ou `../codex-flow-runner`), sem write-back no projeto alvo externo; falhas de analise/publication aparecem como `operational-limitation` nao bloqueante com trace/log/resumo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes confirmam publication unica/agregada, roteamento cross-repo, ausencia de write-back no projeto externo, trace metadata do novo stage e resumo final distinguindo limitation/publication da retrospectiva pre-run-all.
- Validacao de regressao vinculada ao fechamento:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
    - Esperado: nenhuma regressao fora do contrato novo da retrospectiva pre-run-all.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Esperado: tipagem verde com o novo stage/adaptacoes de contratos.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - Esperado: build verde com o novo stage/adaptacoes de contratos.

## Idempotence and Recovery
- Idempotencia:
  - a decisao de execucao/skip da retrospectiva pre-run-all deve depender apenas do snapshot atual do gate funcional e do estado do repositorio, sem gravar artefatos intermediarios que alterem o proximo rerun;
  - publication deve continuar usando a deduplicacao existente por sobreposicao de fingerprints para evitar abrir mais de um ticket transversal agregado na mesma frente causal;
  - rerodar testes e comandos de validacao nao deve alterar specs/tickets alem do que a publication explicitamente cobrir em cenarios de teste controlado.
- Riscos:
  - conflitar semanticamente a retrospectiva pre-run-all com a pos-`spec-audit`, reaproveitando demais o mesmo payload/resumo;
  - introduzir o stage no caminho `GO`, mas esquecer o caminho `NO_GO` ou o caso de falha tecnica sem insumo suficiente;
  - exibir no Telegram um resumo ambíguo que misture a retrospectiva da derivacao com a retrospectiva pos-auditoria;
  - criar campo/tipo novo demais e quebrar testes que hoje assumem apenas `workflowGapAnalysis`/`workflowImprovementTicket`.
- Recovery / Rollback:
  - se a separacao de payload pre-run-all vs pos-auditoria gerar regressao ampla, manter o shape compartilhado de analise/publication e introduzir somente wrappers/rotulos stage-specificos no resumo final;
  - se o novo stage quebrar o fluxo `NO_GO`, desabilitar temporariamente apenas a execucao nesse ramo e registrar blocker explicito em vez de liberar comportamento silencioso;
  - se o prompt dedicado divergir demais da taxonomia compartilhada, alinhar o prompt ao parser existente antes de criar parser paralelo;
  - se a publication cross-repo falhar, preservar a rodada como sucesso funcional e registrar `operational-limitation` com trace/log/resumo conforme o contrato do ticket.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- Referencias tecnicas lidas no planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/core/runner.ts`
  - `src/types/flow-timing.ts`
  - `src/types/state.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/types/workflow-gap-analysis.ts`
  - `src/integrations/workflow-gap-analysis-parser.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/telegram-bot.ts`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
- Tickets irmaos relevantes para fronteira de escopo:
  - `tickets/open/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md`
  - `tickets/open/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md`
  - `tickets/open/2026-03-20-target-project-compatibility-contract-gap.md`
- Observacao operacional:
  - todos os comandos com `node`/`npm`/`npx` neste plano ja estao escritos com o prefixo de ambiente exigido pelo host.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `SpecFlowStage`, `WorkflowTraceStage` e `RunnerPhase` para incluir `spec-ticket-derivation-retrospective`.
  - `RunSpecsTriageTimingStage`, `RunSpecsFlowTimingStage`, `RunSpecsFlowFinalStage` e eventualmente `RunSpecsFlowCompletionReason` para refletir a nova etapa e seus skips observaveis.
  - contrato de `RunSpecsFlowSummary` e do milestone de triagem para expor claramente o resultado da retrospectiva pre-run-all.
  - prompt map em `codex-client` com arquivo dedicado da nova etapa.
- Compatibilidade:
  - preservar nomes canonicos existentes (`spec-ticket-validation`, `spec-workflow-retrospective`);
  - manter o gate funcional como unica fonte do veredito `GO`/`NO_GO`;
  - evoluir contratos de forma aditiva sempre que possivel para reduzir impacto em Telegram/testes.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - reutilizar `WorkflowImprovementTicketPublisher` e seus mocks/harnesses de teste;
  - reutilizar `WorkflowGapAnalysisResult`/parser sempre que a semantica do pre-run-all coincidir com a do pos-auditoria;
  - manter a dependencia do repo irmao `../codex-flow-runner` apenas para cenarios de publication cross-repo e sempre como read-only para o projeto alvo externo.
