# ExecPlan - workflow ticket renderizacao editorial e filtro de contexto

## Purpose / Big Picture
- Objetivo: fazer o publisher do ticket transversal usar o `ticketDraft` estruturado como fonte primaria das secoes humanas do markdown final, filtrando contexto para remediacao e preservando a rastreabilidade operacional ja existente.
- Resultado esperado:
  - o ticket publicado deixa de usar titulo, problema, comportamento esperado, solucao e fechamento sinteticos hardcoded a partir do nome da spec e de `benefitSummary`;
  - `Inherited assumptions/defaults` passa a refletir apenas o subconjunto filtrado em `relevantAssumptionsDefaults`, sem reexpandir a lista completa da spec;
  - `Source requirements` continua aceitando refs a RFs, CAs, RNFs e restricoes tecnicas/documentais sem rotulo enganoso de leitura simplificada;
  - os tickets publicados continuam stage-aware, com request/response/decision, fingerprints, dedupe, same-repo/cross-repo e paths qualificados por projeto;
  - testes automatizados do publisher e do runner passam a provar a barra editorial minima em cenarios pre-run-all e pos-`spec-audit`.
- Escopo:
  - ajustar `src/integrations/workflow-improvement-ticket-publisher.ts` para renderizar o markdown a partir de `candidate.ticketDraft` e do contexto ja filtrado pelo runner;
  - fazer ajustes minimos em `src/core/runner.ts` e/ou `src/types/workflow-improvement-ticket.ts` apenas se o renderer ainda precisar de algum dado editorial ou rotulo mais preciso;
  - ampliar `src/integrations/workflow-improvement-ticket-publisher.test.ts` e `src/core/runner.test.ts` para cobrir qualidade editorial e preservacao da rastreabilidade;
  - deixar explicito, no fechamento deste ticket, quais validacoes runtime/manuais herdadas foram executadas localmente e quais permanecem externas.
- Fora de escopo:
  - reabrir o contrato parseavel dos prompts de retrospectiva, coberto pelo ticket irmao ja fechado `tickets/closed/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`;
  - atualizar a barra minima documental canonica, coberta por `tickets/open/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`;
  - alterar a semantica de `publicationEligibility`, a taxonomia `workflow-gap-analysis`, a sequencialidade do fluxo ou a politica de no maximo 1 ticket sistemico por retrospectiva;
  - fechar ticket, commitar ou fazer push durante a execucao deste plano.

## Progress
- [x] 2026-03-23 03:35Z - Planejamento inicial concluido com leitura integral do ticket, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, da spec de origem, dos prompts, do publisher, do runner, dos testes correlatos e do ExecPlan do ticket irmao ja fechado.
- [x] 2026-03-23 03:44Z - Renderizacao editorial do publisher atualizada para usar `ticketDraft` como fonte primaria em `title`, `Problem statement`, `Expected behavior`, `Impact assessment`, `Proposed solution` e `Closure criteria`, mantendo trace, dedupe, same/cross repo e paths qualificados.
- [x] 2026-03-23 03:44Z - Cobertura automatizada de publisher e runner ampliada com asserts de titulo orientado ao problema, refs amplas em `Source requirements`, superficies afetadas, `Closure criteria` especificos e cenarios pre-run-all/pos-`spec-audit`.
- [x] 2026-03-23 03:44Z - Validacao final e auditoria de escopo concluidas com `npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`, `npm run check`, `rg` de propagacao e `git diff` restrito ao escopo.

## Surprises & Discoveries
- 2026-03-23 03:35Z - O ticket irmao de contrato ja fez o trabalho pesado nos prompts, parser e runner: hoje `WorkflowImprovementTicketHandoff` e `WorkflowImprovementTicketCandidate` ja carregam `ticketDraft` completo e `relevantAssumptionsDefaults` filtradas, entao o menor corte seguro ficou mais concentrado no renderer e nos testes do que o texto original do ticket ainda sugere.
- 2026-03-23 03:35Z - `src/integrations/workflow-improvement-ticket-publisher.ts` ainda ignora esses campos editoriais em pontos centrais e continua montando titulo, `problemStatement`, `expectedBehavior`, `Proposed solution` e `Closure criteria` com texto generico ou baseado em `benefitSummary`.
- 2026-03-23 03:35Z - O runner ja popula `inheritedAssumptionsDefaults` a partir de `ticketDraft.relevantAssumptionsDefaults`; o risco real passou a ser reintroduzir ruido no renderer, nao perder o filtro no parser/handoff.
- 2026-03-23 03:35Z - `sourceRequirements` ja e um `string[]` suficientemente flexivel para RF/CAs/RNFs/restricoes; o desalinhamento atual esta mais no wording do ticket publicado e na ausencia de asserts editoriais do que no shape basico do tipo.
- 2026-03-23 03:35Z - A suite atual do publisher prova bem same-repo, cross-repo, paths qualificados e dedupe, mas ainda nao trava a qualidade editorial minima exigida pela spec para titulo orientado ao problema, assumptions filtradas, solucao concreta e fechamento observavel.
- 2026-03-23 03:44Z - Nenhum ajuste adicional em `src/core/runner.ts` ou `src/types/workflow-improvement-ticket.ts` foi necessario: o contrato endurecido pelo ticket irmao ja sustentava todo o renderer novo.
- 2026-03-23 03:44Z - O runner normaliza `closureCriteria` e `affectedWorkflowSurfaces` de forma deterministica antes do publish; os asserts end-to-end precisaram acompanhar essa ordenacao em vez de assumir a ordem original do prompt.

## Decision Log
- 2026-03-23 - Decisao: tratar `ticketDraft` como fonte primaria obrigatoria para `title`, `Problem statement`, `Expected behavior`, `Impact assessment`, `Proposed solution` e `Closure criteria`, mantendo texto generico apenas para campos realmente opcionais ou metadados operacionais.
  - Motivo: RF-15 e os closure criteria do ticket pedem explicitamente a troca da sintese hardcoded pelo draft estruturado.
  - Impacto: o principal foco de implementacao fica em `src/integrations/workflow-improvement-ticket-publisher.ts`, com possiveis ajustes pequenos de tipo/runner apenas se o renderer precisar de suporte adicional.
- 2026-03-23 - Decisao: preservar `analysisSummary`, `causalHypothesis` e `benefitSummary` apenas como evidencia/causalidade de suporte, sem duplicar essas narrativas nas secoes humanas obrigatorias do ticket.
  - Motivo: a spec e o ticket pedem reducao de redundancia editorial, nao mais camadas de texto paralelo.
  - Impacto: o ticket final deve continuar explicavel e auditavel, mas com menos repeticao entre secoes.
- 2026-03-23 - Decisao: manter `sourceRequirements` como lista ampla de referencias e corrigir o rotulo/renderizacao para nao sugerir limitacao artificial a "RFs/CAs".
  - Motivo: RF-12 e o proprio estado atual do runner/testes mostram que RNFs e restricoes tecnicas ja podem entrar na mesma lista.
  - Impacto: pode ser suficiente ajustar rotulo, mensagens e asserts sem mudar o tipo base.
- 2026-03-23 - Decisao: considerar este ticket satisfeito apenas com evidencia de markdown publicado e de testes automatizados em same-repo e cross-repo; o checklist de plano nao substitui o aceite.
  - Motivo: o proprio ticket exige que toda validacao nasca dos closure criteria observaveis.
  - Impacto: a secao `Validation and Acceptance` abaixo referencia so evidencias derivadas dos closure criteria e da validacao manual herdada.
- 2026-03-23 - Decisao: manter o corte final restrito a `src/integrations/workflow-improvement-ticket-publisher.ts` e testes correlatos.
  - Motivo: a releitura do runner confirmou que o handoff ja chegava completo e filtrado; ampliar tipos/runner aqui so aumentaria superficie de regressao sem ganho funcional.
  - Impacto: o diff final permaneceu concentrado no renderer e na prova automatizada do comportamento esperado.

## Outcomes & Retrospective
- Status final: execucao local concluida; ticket continua aberto por instrucao operacional desta etapa e sem commit/push.
- O que existira ao final:
  - o renderer do ticket transversal publica texto humano orientado ao problema a partir de `ticketDraft`;
  - `Inherited assumptions/defaults` e `Closure criteria` passam a refletir o filtro e a granularidade ja produzidos pelo draft estruturado;
  - o markdown publicado deixa explicitas as superficies afetadas sem perder trace, fingerprints, dedupe e qualificacao de caminhos;
  - testes do publisher e do runner travam o comportamento para cenarios pre-run-all e pos-`spec-audit`.
- O que fica pendente apos este plano:
  - alinhamento documental canonico da barra minima para tickets automaticos;
  - execucao runtime/manual em rodadas reais fora do harness local para complementar a cobertura automatizada desta etapa.
- Proximos passos:
  - manter o ticket aberto ate a etapa de fechamento formal, sem commit/push nesta execucao;
  - tratar o ticket documental irmao como pendencia separada para a barra minima canonica;
  - registrar no fechamento do ticket que as validacoes locais desta etapa vieram de suites automatizadas, enquanto as rodadas operacionais reais continuam externas.

## Context and Orientation
- Ticket executor:
  - `tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-12, RF-15, RF-16, RF-17, RF-19, RF-20, RF-21
  - CA-04, CA-05, CA-06, CA-07, CA-08, CA-11
- RNFs e restricoes tecnicas/documentais herdados da spec/ticket:
  - o ticket automatico publicado precisa continuar sendo um handoff de alta qualidade entre IAs e operadores, com contexto filtrado e comportamento esperado executavel;
  - manter fluxo sequencial e nao bloqueante;
  - preservar same-repo/cross-repo em `../codex-flow-runner`;
  - preservar fingerprints, deduplicacao, request-response-decision, qualificacao de paths por projeto e o limite de no maximo 1 ticket transversal agregado por retrospectiva;
  - nao alterar a semantica de `publicationEligibility` nem a taxonomia `workflow-gap-analysis`.
- Validacoes pendentes/manuais herdadas relevantes:
  - executar ao menos uma rodada automatizada no proprio `codex-flow-runner` com `systemic-gap` elegivel e confirmar titulo orientado ao problema, `Proposed solution` concreta e `Closure criteria` observaveis;
  - executar ao menos uma rodada automatizada em projeto externo com publicacao cross-repo e confirmar que a qualidade editorial permanece alta sem perder paths qualificados e trilha request-response-decision;
  - exercitar uma spec de origem com lista longa de assumptions/defaults e confirmar que o ticket transversal publica apenas o subconjunto relevante;
  - revisar manualmente um ticket publicado a partir de cada retrospectiva e confirmar que outra IA consegue planejar a implementacao sem reler os traces completos.
- Assumptions / defaults adotados:
  - o `ticketDraft` entregue pelo runner apos o ticket irmao fechado passa a ser o contrato canonico para as secoes humanas do ticket publicado;
  - `candidate.inheritedAssumptionsDefaults` ja representa o subconjunto filtrado e nao deve ser reabastecido a partir da spec original;
  - `sourceRequirements` pode continuar como lista simples de strings, desde que o renderer e os testes deixem claro que ela aceita RF/CAs/RNFs/restricoes tecnicas/documentais relevantes;
  - `analysisSummary`, `causalHypothesis` e `benefitSummary` continuam uteis como trilha causal/evidencial, mas nao como fonte primaria das secoes humanas obrigatorias;
  - as validacoes runtime/manuais herdadas podem permanecer parcialmente externas desde que o fechamento registre o status de cada uma e que o aceite tecnico local fique sustentado por testes e evidencias observaveis.
- Termos do projeto relevantes:
  - `ticketDraft`: rascunho editorial estruturado do ticket humano publicado pelo workflow.
  - `publicationHandoff`: payload tipado que o runner entrega ao publisher quando a publication e permitida.
  - `same-repo` / `cross-repo`: publicacao no proprio `codex-flow-runner` ou no repositorio irmao do workflow quando o projeto ativo e externo.
  - `stage-awareness`: wording e contexto distintos para `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`.
- Arquivos principais:
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `execplans/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`
- Fluxo atual relevante:
  - os prompts e o parser ja exigem `ticketDraft` valido quando `publicationEligibility=true`;
  - o runner ja monta `publicationHandoff` com `ticketDraft` e filtra `relevantAssumptionsDefaults`;
  - o publisher ainda renderiza grande parte do markdown a partir de defaults genericos e `benefitSummary`, criando o gap editorial remanescente.

## Plan of Work
- Milestone 1: reorientar o renderer para o draft estruturado.
  - Entregavel: `src/integrations/workflow-improvement-ticket-publisher.ts` passa a usar `candidate.ticketDraft.title`, `problemStatement`, `expectedBehavior`, `impactFunctional`, `impactOperational`, `regressionRisk`, `proposedSolution`, `closureCriteria`, `reproductionSteps` e `affectedWorkflowSurfaces` como fonte primaria do ticket.
  - Evidencia de conclusao: o markdown renderizado deixa de ter header centrado na spec, `Proposed solution` deixa de ser apenas `benefitSummary` e `Closure criteria` deixa de ser um unico criterio generico.
  - Arquivos esperados: `src/integrations/workflow-improvement-ticket-publisher.ts`.
- Milestone 2: alinhar filtro de contexto e rotulos contratuais sem regressao.
  - Entregavel: `Inherited assumptions/defaults` usa o subconjunto filtrado, `Source requirements` deixa de ser rotulado como leitura simplificada de RF/CAs e o ticket continua preservando trace, dedupe, same/cross repo e stage-awareness.
  - Evidencia de conclusao: o ticket publicado mostra assumptions filtradas, refs amplas de requisitos e a mesma trilha operacional observavel dos cenarios atuais.
  - Arquivos esperados: `src/integrations/workflow-improvement-ticket-publisher.ts`, possivelmente `src/types/workflow-improvement-ticket.ts` e/ou `src/core/runner.ts` se algum ajuste minimo de suporte se mostrar necessario.
- Milestone 3: provar a barra editorial em testes automatizados.
  - Entregavel: suites de publisher e runner passam a cobrir titulo orientado ao problema, assumptions filtradas, solucao concreta, closure criteria especificos, same-repo, cross-repo, pre-run-all e pos-`spec-audit`.
  - Evidencia de conclusao: testes nomeados falham no baseline antigo e passam com o novo renderer, sem perder cobertura de rastreabilidade.
  - Arquivos esperados: `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/core/runner.test.ts`.
- Milestone 4: consolidar aceite tecnico e registrar validacoes herdadas.
  - Entregavel: comandos direcionados ficam verdes, o diff permanece no escopo deste ticket e o fechamento deixa claro quais validacoes runtime/manuais foram executadas localmente ou ficaram externas.
  - Evidencia de conclusao: `npm test` direcionado e `npm run check` passam; o diff nao reabre prompts/documentacao irmaos; o encerramento do ticket/ExecPlan registra o status das validacoes herdadas.
  - Arquivos esperados: sem novos artefatos obrigatorios alem dos alterados nos milestones anteriores e da atualizacao do proprio ExecPlan durante a execucao.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "sourceSpecTitle|benefitSummary|closure criteria|Source requirements|Inherited assumptions/defaults|ticketDraft|affectedWorkflowSurfaces" src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.ts src/core/runner.test.ts src/types/workflow-improvement-ticket.ts` para reconfirmar o baseline exato antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir com `sed -n` os trechos centrais de `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts` e `src/core/runner.test.ts` para mapear as asserts atuais e os pontos de renderizacao a serem trocados.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-improvement-ticket-publisher.ts` para:
   - usar `candidate.ticketDraft.title` no titulo do ticket;
   - renderizar `Problem statement`, `Expected behavior`, `Impact assessment`, `Proposed solution` e `Closure criteria` diretamente do draft estruturado;
   - incorporar `affectedWorkflowSurfaces` na narrativa editorial sem perder stage-awareness;
   - usar apenas assumptions/defaults filtradas e corrigir o rotulo/uso de `sourceRequirements`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se o renderer precisar de suporte adicional, alterar com `apply_patch` `src/types/workflow-improvement-ticket.ts` e/ou `src/core/runner.ts` apenas no minimo necessario para expor melhor os dados editoriais ja disponiveis, sem reabrir o contrato dos prompts.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-improvement-ticket-publisher.test.ts` para adicionar asserts explicitos de:
   - titulo orientado ao problema em vez de wording centrado na spec;
   - uso de `problemStatement`, `expectedBehavior`, `proposedSolution` e `closureCriteria` do draft;
   - `Inherited assumptions/defaults` filtradas;
   - preservacao de same-repo e cross-repo com trilha request/response/decision e paths qualificados.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts` para manter cobertura end-to-end de pre-run-all e pos-`spec-audit`, incluindo pelo menos um cenario que inspecione o ticket publicado com titulo orientado ao problema, solucao concreta, fechamento especifico e refs amplas de requisitos.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "ticketDraft\\.title|problemStatement|expectedBehavior|proposedSolution|closureCriteria|affectedWorkflowSurfaces|Source requirements" src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.ts src/core/runner.test.ts src/types/workflow-improvement-ticket.ts` para auditar a propagacao final das mudancas.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts` para validar renderer, same/cross repo, stage-awareness e cobertura editorial.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para garantir que o contrato tipado segue consistente apos os ajustes.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.ts src/core/runner.test.ts src/types/workflow-improvement-ticket.ts` para auditar que o escopo permaneceu restrito a renderer, suporte minimo de handoff e testes.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Antes de encerrar o ticket, registrar no proprio ticket/ExecPlan quais validacoes runtime/manuais herdadas foram executadas, quais permaneceram externas e por que o aceite tecnico local ainda e valido.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-04, RF-05, RF-06, RF-07, RF-15, CA-04, CA-06
  - Evidencia observavel: o ticket publicado deixa de usar titulo centrado na spec e passa a renderizar `title`, `Problem statement`, `Expected behavior` e `Proposed solution` diretamente do `ticketDraft`, nomeando as superficies afetadas do workflow.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`
  - Esperado: existem asserts verdes para titulo orientado ao problema, `problemStatement`, `expectedBehavior`, `proposedSolution` e mencao explicita das superficies afetadas em cenarios de publicacao real.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-08, RF-09, RF-17, CA-05, CA-07
  - Evidencia observavel: `Inherited assumptions/defaults` reflete somente `relevantAssumptionsDefaults`, e `Closure criteria` aparece como lista de evidencias observaveis especificas em vez de frase generica de nao recorrencia.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`
  - Esperado: as suites verificam o texto publicado e falhariam se o renderer voltasse a usar assumptions completas da spec ou um unico criterion generico.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-12, RF-16, RF-21, CA-08
  - Evidencia observavel: `Source requirements` suporta refs a RFs, CAs, RNFs e restricoes tecnicas/documentais sem perder stage-awareness, request-response-decision, fingerprints, dedupe e qualificacao de paths em same-repo e cross-repo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`
  - Esperado: continuam verdes os cenarios de publicacao no repositorio atual, no repositorio irmao e de wording por stage, agora com asserts adicionais para rotulo/conteudo de `Source requirements`.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-19, RF-20, CA-11
  - Evidencia observavel: os testes automatizados do publisher e do runner cobrem cenarios pre-run-all e pos-`spec-audit`, validando titulo orientado ao problema, assumptions filtradas, `Proposed solution` concreta, `Closure criteria` especificos e preservacao da rastreabilidade operacional.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`
  - Esperado: a cobertura direcionada fica verde com nomes/asserts que reflitam explicitamente os cenarios pre-run-all e pos-`spec-audit`.
- Matriz requisito -> validacao observavel:
  - Requisito: validacoes manuais herdadas
  - Evidencia observavel: o fechamento deste ticket registra quais validacoes runtime/manuais da spec foram executadas localmente, quais ficaram externas e por que isso nao invalida o aceite tecnico local.
  - Comando: `rg -n "validacoes runtime/manuais|externas|aceite tecnico local" tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md execplans/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md`
  - Esperado: existe registro textual objetivo no fechamento do ticket e/ou na retrospectiva do ExecPlan, sem depender de memoria externa do executor.
- Matriz requisito -> validacao observavel:
  - Requisito: propagacao tipada sem regressao local
  - Evidencia observavel: tipagem e contratos compartilhados continuam consistentes depois dos ajustes de renderer e testes.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: checagem verde, sem erros em `workflow-improvement-ticket` ou nos testes atualizados.

### Resultado desta execucao
- 2026-03-23 03:44Z - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`
  - Resultado: verde.
  - Evidencia consolidada: 424 testes passaram; as suites cobrem renderer atual, same-repo, cross-repo, pre-run-all, pos-`spec-audit`, assumptions filtradas, `Source requirements` com RF/RNF/restricao tecnica e preservacao de request/response/decision.
- 2026-03-23 03:44Z - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Resultado: verde.
  - Evidencia consolidada: `tsc --noEmit` sem erros apos o ajuste do renderer e dos testes.
- 2026-03-23 03:44Z - `rg -n "ticketDraft\\.title|problemStatement|expectedBehavior|proposedSolution|closureCriteria|affectedWorkflowSurfaces|Source requirements" src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.ts src/core/runner.test.ts src/types/workflow-improvement-ticket.ts`
  - Resultado: confirmou propagacao final do contrato editorial endurecido e os novos asserts de renderer.
- 2026-03-23 03:44Z - `git diff -- src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.ts src/core/runner.test.ts src/types/workflow-improvement-ticket.ts`
  - Resultado: o diff util ficou restrito a `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts` e `src/core/runner.test.ts`; nao houve mudanca funcional em prompts, parser, runner de producao ou tipos compartilhados.
- Validacoes runtime/manuais herdadas executadas localmente:
  - cobertura same-repo no proprio `codex-flow-runner` via testes do publisher e do runner;
  - cobertura cross-repo em fixture de projeto externo via testes do publisher e do runner;
  - cobertura de assumptions/defaults filtradas e de `ticketDraft` invalido sem placeholder via `src/core/runner.test.ts`.
- Validacoes runtime/manuais herdadas que permanecem externas:
  - rodada operacional real em projeto externo com publicacao cross-repo fora do harness;
  - revisao manual de um ticket publicado por cada retrospectiva para confirmar que outra IA planeja sem reler traces;
  - exercicio manual de uma spec de origem longa em ambiente operacional, alem da prova automatizada local.
- Aceite tecnico local:
  - valido para esta etapa porque os closure criteria do ticket ficaram observaveis em markdown publicado e em suites automatizadas verdes, sem reabrir o contrato parseavel nem a documentacao canonica fora do escopo.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar as alteracoes nao deve duplicar secoes do ticket nem reintroduzir texto generico nas partes que passaram a vir do draft;
  - reexecutar os testes direcionados nao produz novos artefatos persistentes nem tickets extras;
  - o comportamento de dedupe e o limite de 1 ticket sistemico por retrospectiva devem permanecer deterministas.
- Riscos:
  - misturar responsabilidades do ticket irmao fechado e reabrir prompts/parser sem necessidade;
  - substituir demais o texto do ticket e perder informacoes operacionais relevantes de trace, stage-awareness ou cross-repo;
  - corrigir o markdown localmente no publisher, mas deixar os testes frouxos e permitir regressao editorial futura;
  - mudar o rotulo de `Source requirements` sem preservar compatibilidade com asserts legadas ou com o package context do runner.
- Recovery / Rollback:
  - se o renderer comecar a esconder informacoes operacionais importantes, restaurar essas partes como secoes dedicadas e manter o draft apenas nas secoes humanas obrigatorias;
  - se um ajuste de tipo/runner se mostrar mais invasivo que o esperado, voltar ao menor corte possivel: renderer + testes, deixando qualquer extensao contratual para follow-up explicito;
  - se os testes end-to-end ficarem instaveis, isolar primeiro asserts unitarios no publisher e so depois reintroduzir a verificacao equivalente no runner.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
- Referencias obrigatorias lidas para este plano:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `execplans/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`
- Checklist aplicado de `docs/workflows/codex-quality-gates.md`:
  - ticket inteiro e referencias do ticket lidos antes de planejar;
  - spec de origem, RFs/CAs/RNFs/restricoes e assumptions/defaults explicitados;
  - criteria de fechamento traduzidos para matriz `requisito -> validacao observavel`;
  - riscos residuais, nao-escopo e dependencias explicitados;
  - validacoes pendentes/manuais herdadas carregadas para o plano.
- Nota de baseline:
  - o plano incorpora a descoberta de que o contrato `ticketDraft` ja foi endurecido pelo ticket irmao fechado; portanto a execucao deve evitar retrabalho em prompts/parser e focar no gap editorial remanescente.
- Nota de aceite:
  - esta secao usa `PLANS.md` e os quality gates apenas como meta-gates de completude do plano; a aceitacao real continua derivada exclusivamente dos closure criteria do ticket e da validacao manual herdada.

## Interfaces and Dependencies
- Interfaces alteradas:
  - renderer do ticket automatico em `src/integrations/workflow-improvement-ticket-publisher.ts`;
  - testes do publisher e do runner que validam o markdown publicado;
  - eventualmente `WorkflowImprovementTicketCandidate` ou o builder do runner, apenas se algum campo editorial precisar de suporte adicional minimo.
- Compatibilidade:
  - manter classificacoes atuais de `workflow-gap-analysis`;
  - manter `publicationEligibility` e o fluxo sequencial sem mudanca semantica;
  - manter publicacao same-repo/cross-repo, paths qualificados, fingerprints, dedupe e request-response-decision;
  - manter compatibilidade com o contrato `ticketDraft` ja introduzido no ticket irmao fechado.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova esperada;
  - a principal cobertura reutiliza os harnesses existentes em `src/integrations/workflow-improvement-ticket-publisher.test.ts` e `src/core/runner.test.ts`;
  - nao ha dependencia de rodar Git remoto, Telegram ou prompts reais para validar este ticket localmente.
