# ExecPlan - workflow ticket draft estruturado e validacao contratual

## Purpose / Big Picture
- Objetivo: endurecer o contrato estruturado das retrospectivas sistemicas para que `publicationEligibility=true` so possa publicar ticket transversal quando houver um rascunho editorial parseavel, materialmente suficiente e separado da analise causal.
- Resultado esperado:
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` passam a exigir o artefato estruturado de autoria do ticket quando houver elegibilidade de publicacao;
  - `src/types/workflow-gap-analysis.ts`, `src/types/workflow-improvement-ticket.ts`, `src/integrations/workflow-gap-analysis-parser.ts` e `src/core/runner.ts` passam a carregar e validar esse draft sem misturar resumo causal, beneficio esperado e texto humano do ticket;
  - quando o draft estiver ausente, invalido ou materialmente insuficiente, o fluxo registra limitacao operacional nao bloqueante e suprime a publicacao de ticket placeholder;
  - testes automatizados provam a nova barra contratual sem quebrar taxonomia, sequencialidade, deduplicacao, same-repo/cross-repo e o limite de 1 ticket sistemico por retrospectiva.
- Escopo:
  - ajustar o contrato dos prompts de retrospectiva para retornar o draft estruturado;
  - propagar o draft em tipos compartilhados e no handoff do runner;
  - implementar validacao contratual e degradacao nao bloqueante para draft ausente/incompleto;
  - ampliar testes de parser e runner para cobrir sucesso, falha contratual e preservacao das invariantes atuais do fluxo.
- Fora de escopo:
  - redesenhar a renderizacao editorial final do ticket publicado, coberta pelo ticket irmao `tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md`;
  - atualizar a barra minima documental do workflow, coberta por `tickets/open/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push.

## Progress
- [x] 2026-03-23 03:12Z - Planejamento inicial concluido com leitura integral do ticket, de `PLANS.md`, de `SPECS.md`, de `docs/workflows/codex-quality-gates.md`, da spec de origem, dos prompts, dos tipos, do parser, do runner e dos testes citados.
- [x] 2026-03-23 03:27Z - Contrato `ticketDraft` implementado em prompts, tipos, parser e runner, com handoff separado da analise causal.
- [x] 2026-03-23 03:27Z - Validacoes automatizadas e de regressao do ticket concluidas.

## Surprises & Discoveries
- 2026-03-23 03:12Z - O runner ja cria `publicationHandoff` automaticamente a partir de `summary`, `causalHypothesis`, `benefitSummary` e assumptions extraidas da spec; o gap principal e eliminar essa sintese editorial hardcoded como fonte primaria do ticket.
- 2026-03-23 03:12Z - `WorkflowGapAnalysisResult` ja aceita `publicationHandoff?`, entao o menor corte seguro e enriquecer o resultado parseado com um `ticketDraft` estruturado e depois montar o handoff a partir dele.
- 2026-03-23 03:12Z - O parser atual falha duro apenas no contrato do bloco `[[WORKFLOW_GAP_ANALYSIS]]`; para atender o ticket, a ausencia ou insuficiencia do draft precisa virar limitacao operacional observavel, nao ticket generico nem quebra fatal do `/run_specs`.
- 2026-03-23 03:12Z - A cobertura existente em `src/core/runner.test.ts` ja exercita same-repo, cross-repo, `operational-limitation`, `historicalReference` e `publicationEligibility`, o que reduz risco para provar RF-21 sem criar harness nova.
- 2026-03-23 03:27Z - A validacao de `ticketDraft` precisou acontecer depois da anti-duplicacao pos-`spec-audit`; se o parser endurecesse publication antes desse passo, um overlap causal historico poderia virar limitacao operacional indevida mesmo quando a publication correta ja era `false`.
- 2026-03-23 03:27Z - A expansao tipada do handoff exigiu ajuste em testes auxiliares fora do escopo funcional direto (`telegram-bot` e publisher) para manter o repositório compilando sob o novo shape compartilhado.

## Decision Log
- 2026-03-23 - Decisao: adotar `ticketDraft` como nome default do novo artefato estruturado, carregado no payload parseavel da retrospectiva e propagado separadamente do resumo causal.
  - Motivo: o proprio ticket e a spec aceitam `ticketDraft` ou equivalente; usar um nome explicito reduz ambiguidade entre analise causal, handoff e renderer.
  - Impacto: prompts, tipos, parser, runner e testes devem falar a mesma nomenclatura.
- 2026-03-23 - Decisao: considerar "suficiencia material" como presenca nao vazia dos campos minimos `title`, `problemStatement`, `expectedBehavior`, `proposedSolution`, `reproductionSteps`, `impactFunctional`, `impactOperational`, `regressionRisk`, `relevantAssumptionsDefaults`, `closureCriteria` e `affectedWorkflowSurfaces`.
  - Motivo: o closure criterion pede exatamente esse conjunto como barra minima observavel.
  - Impacto: parser e/ou runner precisam validar shape e nao apenas presenca de objeto.
- 2026-03-23 - Decisao: tratar `publicationEligibility=true` com draft ausente/invalido/incompleto como `operational-limitation` nao bloqueante, preservando a classificacao causal e suprimindo a publication.
  - Motivo: RF-13, RF-14, CA-03 e CA-09 priorizam backlog de alta qualidade sobre publication a qualquer custo.
  - Impacto: o runner precisara transformar falhas contratuais editoriais em resumo/trace/log observaveis, em vez de publicar placeholder ou abortar a rodada principal.
- 2026-03-23 - Decisao: preservar a separacao entre `summary`/`causalHypothesis`/`benefitSummary` e o texto humano do ticket, mesmo que alguns dados sejam semanticamente correlatos.
  - Motivo: RF-11 exige que resumo causal, beneficio esperado e handoff humano nao sejam colapsados no mesmo campo.
  - Impacto: `WorkflowImprovementTicketHandoff` deve continuar carregando os campos causais e ganhar um draft editorial dedicado ou campos derivados explicitamente mapeados.
- 2026-03-23 - Decisao: parsear `ticketDraft` de forma leniente no parser e promover a falha contratual para `operational-limitation` apenas na finalizacao do runner.
  - Motivo: o caminho pos-`spec-audit` ainda precisa aplicar anti-duplicacao antes de decidir se publication segue elegivel; endurecer cedo demais criaria falso negativo quando a publication correta ja e suprimida por `historicalReference`.
  - Impacto: `parseWorkflowGapAnalysisOutput(...)` passou a devolver `analysis + ticketDraftContractError`, e o runner centraliza a decisao final de publication/handoff.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada localmente.
- O que existe ao final:
  - prompts de retrospectiva exigem `ticketDraft` completo quando `publicationEligibility=true` e orientam `ticketDraft: null` quando a publication nao e elegivel;
  - tipos compartilhados, parser e runner carregam `ticketDraft` sem colapsar `summary`, `causalHypothesis` e `benefitSummary`;
  - o runner so monta `publicationHandoff` a partir de `ticketDraft` valido e degrada draft ausente/incompleto para `operational-limitation` nao bloqueante;
  - testes verdes cobrem parse valido, falha contratual do draft e preservacao das invariantes atuais do fluxo.
- O que fica pendente apos este plano:
  - refinamento da renderizacao editorial final do ticket publicado e filtro de contexto;
  - alinhamento documental da barra minima para tickets automaticos.
- Proximos passos:
  - executar o ticket irmao de renderizacao/editorial para fazer o publisher usar `ticketDraft` como fonte primaria do markdown final;
  - executar o ticket irmao documental para refletir a barra minima editorial nos documentos canonicos;
  - fechar este ticket apenas quando a revisao final do diff confirmar que o escopo permaneceu restrito ao contrato/validacao.

## Context and Orientation
- Ticket executor:
  - `tickets/open/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-02, RF-03, RF-10, RF-11, RF-13, RF-14, RF-21
  - CA-01, CA-02, CA-03, CA-09
  - Validacao manual herdada relevante: exercitar `publicationEligibility=true` com draft incompleto e comprovar ausencia de ticket placeholder com limitacao operacional observavel.
- RNFs e restricoes tecnicas/documentais herdados da spec/ticket:
  - o handoff do ticket automatico precisa permanecer autocontido e verificavel;
  - manter fluxo sequencial e nao bloqueante para a spec corrente;
  - preservar a taxonomia atual de `workflow-gap-analysis` e a semantica de `publicationEligibility`;
  - preservar publicacao same-repo/cross-repo em `../codex-flow-runner`;
  - preservar a regra de no maximo 1 ticket transversal por retrospectiva;
  - preservar fingerprints, deduplicacao e rastreabilidade request/response/decision;
  - evitar fallback silencioso para ticket generico quando o contrato de autoria estiver insuficiente.
- Assumptions / defaults adotados:
  - o novo artefato sera chamado `ticketDraft`, salvo descoberta forte em execucao que imponha nome diferente;
  - `ticketDraft` sera obrigatorio somente quando `publicationEligibility=true`;
  - `relevantAssumptionsDefaults`, `closureCriteria` e `affectedWorkflowSurfaces` podem ser listas, mas precisam ser nao vazias quando o draft for elegivel;
  - a validacao contratual deve acontecer antes de qualquer tentativa de montar/publicar ticket transversal;
  - o caminho mais seguro e aproveitar o bloco parseavel ja existente da retrospectiva, adicionando o draft estruturado sem mudar a taxonomia da analise.
- Termos do projeto relevantes:
  - `workflow-gap-analysis`: resultado causal estruturado da retrospectiva sistemica.
  - `ticketDraft`: rascunho editorial estruturado do ticket humano, separado da analise causal.
  - `publicationHandoff`: payload tipado que o runner entrega ao publisher quando a publication e permitida.
  - `operational-limitation`: degradacao nao bloqueante, observavel em trace/log/resumo, usada quando o fluxo nao pode publicar com seguranca.
- Arquivos principais:
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/types/workflow-gap-analysis.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/integrations/workflow-gap-analysis-parser.ts`
  - `src/integrations/workflow-gap-analysis-parser.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
- Fluxo atual relevante:
  - os prompts agora retornam `ticketDraft` estruturado quando a publication segue elegivel;
  - o parser valida o shape do bloco principal e registra erro contratual dedicado para `ticketDraft` invalido;
  - o runner aplica anti-duplicacao, decide elegibilidade final de publication e so monta `publicationHandoff` quando o draft esta valido.

## Plan of Work
- Milestone 1: tornar o contrato editorial obrigatorio nas retrospectivas elegiveis.
  - Entregavel: os dois prompts de retrospectiva exigem `ticketDraft` quando `publicationEligibility=true`, com os campos minimos do ticket.
  - Evidencia de conclusao: leitura do prompt e testes de parser demonstram que o contrato parseavel agora inclui o draft e seus campos obrigatorios.
  - Arquivos esperados: `prompts/11-retrospectiva-workflow-apos-spec-audit.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`, `src/types/workflow-gap-analysis.ts`, `src/integrations/workflow-gap-analysis-parser.ts`, `src/integrations/workflow-gap-analysis-parser.test.ts`.
- Milestone 2: separar causalidade, beneficio e autoria humana no handoff do runner.
  - Entregavel: `WorkflowGapAnalysisResult` e `WorkflowImprovementTicketHandoff` passam a carregar o draft estruturado sem substituir `summary`, `causalHypothesis` e `benefitSummary`.
  - Evidencia de conclusao: o runner monta `publicationHandoff` a partir do draft validado e deixa de sintetizar ticket humano apenas com base em `benefitSummary` e assumptions completas da spec.
  - Arquivos esperados: `src/types/workflow-gap-analysis.ts`, `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts`.
- Milestone 3: transformar falha editorial em limitacao operacional observavel, nao em publication generica.
  - Entregavel: `publicationEligibility=true` com draft ausente/incompleto nao publica ticket e produz output observavel em trace/log/resumo.
  - Evidencia de conclusao: testes do runner cobrem draft invalido, preservam a taxonomia atual e confirmam que nenhuma publication placeholder ocorre.
  - Arquivos esperados: `src/integrations/workflow-gap-analysis-parser.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 4: provar que o hardening nao quebra invariantes do fluxo.
  - Entregavel: a suite relevante continua cobrindo same-repo, cross-repo, historicalReference, limitacao operacional e o limite de 1 ticket sistemico por retrospectiva com o novo contrato.
  - Evidencia de conclusao: parser e runner tests passam apos a mudanca, incluindo o novo caso de draft incompleto e os cenarios legados relevantes.
  - Arquivos esperados: `src/integrations/workflow-gap-analysis-parser.test.ts`, `src/core/runner.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `sed -n '1,260p' prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para reabrir o contrato atual e localizar onde `ticketDraft` deve passar a ser exigido.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' src/types/workflow-gap-analysis.ts`, `sed -n '1,260p' src/types/workflow-improvement-ticket.ts` e `sed -n '1,320p' src/integrations/workflow-gap-analysis-parser.ts` para mapear o shape atual do payload e do handoff.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` os prompts de retrospectiva para exigir `ticketDraft` quando `publicationEligibility=true`, incluindo os campos minimos `title`, `problemStatement`, `expectedBehavior`, `proposedSolution`, `reproductionSteps`, `impactFunctional`, `impactOperational`, `regressionRisk`, `relevantAssumptionsDefaults`, `closureCriteria` e `affectedWorkflowSurfaces`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/workflow-gap-analysis.ts` para transportar `ticketDraft` no resultado parseado e `src/types/workflow-improvement-ticket.ts` para refletir o draft e a separacao entre analise causal, beneficio esperado e autoria humana.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-gap-analysis-parser.ts` para validar o novo shape do draft e distinguir:
   - contratos validos com `publicationEligibility=true`;
   - contratos sem `ticketDraft`;
   - contratos com `ticketDraft` materialmente insuficiente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para:
   - montar `publicationHandoff` a partir do draft estruturado validado;
   - preservar `summary`, `causalHypothesis` e `benefitSummary` como campos causais separados;
   - degradar draft ausente/invalido/incompleto para limitacao operacional nao bloqueante e suprimir a publication.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-gap-analysis-parser.test.ts` para cobrir contrato valido e contrato invalido envolvendo `ticketDraft`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts` para cobrir:
   - retrospectiva pre-`/run-all` com `ticketDraft` valido;
   - retrospectiva pos-`spec-audit` com `ticketDraft` valido;
   - `publicationEligibility=true` com draft incompleto, sem ticket placeholder e com limitacao operacional observavel;
   - preservacao da semantica atual de same-repo/cross-repo, taxonomia e no maximo 1 ticket sistemico por retrospectiva.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "ticketDraft|title|problemStatement|expectedBehavior|proposedSolution|reproductionSteps|impactFunctional|impactOperational|regressionRisk|relevantAssumptionsDefaults|closureCriteria|affectedWorkflowSurfaces" prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/types/workflow-gap-analysis.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-gap-analysis-parser.ts src/core/runner.ts` para auditar a propagacao do novo contrato nas superficies exigidas pelo ticket.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-gap-analysis-parser.test.ts src/core/runner.test.ts` para validar parser, runner, degradacao nao bloqueante e invariantes do fluxo.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar que o contrato tipado novo propaga sem erros entre prompts, parser, runner e handoff.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/types/workflow-gap-analysis.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-gap-analysis-parser.ts src/integrations/workflow-gap-analysis-parser.test.ts src/core/runner.ts src/core/runner.test.ts` para auditar escopo final e confirmar que este ticket nao invadiu os tickets irmaos de renderizacao/documentacao.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-02, RF-03, CA-01, CA-02
  - Evidencia observavel: ambos os prompts passam a exigir `ticketDraft` quando `publicationEligibility=true`, com todos os campos minimos previstos no closure criterion.
  - Comando: `rg -n "ticketDraft|title|problemStatement|expectedBehavior|proposedSolution|reproductionSteps|impactFunctional|impactOperational|regressionRisk|relevantAssumptionsDefaults|closureCriteria|affectedWorkflowSurfaces" prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - Esperado: os dois prompts exibem o contrato do draft e o condicionam explicitamente a `publicationEligibility=true`.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-10, RF-11, CA-03
  - Evidencia observavel: `src/types/workflow-improvement-ticket.ts`, `src/types/workflow-gap-analysis.ts`, `src/integrations/workflow-gap-analysis-parser.ts` e `src/core/runner.ts` passam a carregar o draft estruturado e a separar draft humano de `summary`, `causalHypothesis` e `benefitSummary`.
  - Comando: `rg -n "ticketDraft|analysisSummary|causalHypothesis|benefitSummary|publicationHandoff|operational-limitation" src/types/workflow-gap-analysis.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-gap-analysis-parser.ts src/core/runner.ts`
  - Esperado: o draft aparece como estrutura explicita nas quatro superficies e a degradacao para limitacao operacional fica mapeada antes da publication.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-13, RF-14, CA-03, CA-09
  - Evidencia observavel: existe cenario automatizado em que `publicationEligibility=true` com draft incompleto nao publica ticket placeholder e registra limitacao operacional nao bloqueante em trace/log/resumo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts`
  - Esperado: a suite cobre o caso de draft incompleto com ausencia de publication e presenca de limitacao operacional observavel.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-21
  - Evidencia observavel: parser e runner tests continuam verdes nos cenarios de taxonomy, `publicationEligibility`, sequencialidade, same-repo/cross-repo e no maximo 1 ticket sistemico por retrospectiva, agora sob o contrato endurecido.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-gap-analysis-parser.test.ts src/core/runner.test.ts`
  - Esperado: nenhum teste legado relevante regressa e os cenarios novos convivem com as invariantes ja existentes.
- Matriz requisito -> validacao observavel:
  - Requisito: validacao manual herdada do ticket
  - Evidencia observavel: a suite automatizada inclui ou o executor registra explicitamente um fixture/cenario cobrindo `publicationEligibility=true` com draft incompleto; se a assercao automatica nao for suficiente para inspecao humana do summary, registrar a evidencia complementar no diff ou na nota de execucao.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts`
  - Esperado: ha um teste nomeado ou bloco de assertions que comprove a ausencia de ticket placeholder e a presenca de limitacao operacional nao bloqueante.
- Matriz requisito -> validacao observavel:
  - Requisito: propagacao tipada sem regressao local ao escopo do ticket
  - Evidencia observavel: a checagem de tipos passa com o novo contrato.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: compilacao e checagens do repositório passam sem erro de tipos relacionado ao novo draft.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a implementacao nao deve duplicar campos do draft nos prompts, tipos ou parser;
  - o caminho feliz continua gerando no maximo 1 ticket sistemico por retrospectiva;
  - o caminho de draft invalido continua suprimindo publication de forma deterministica para o mesmo output parseado.
- Riscos:
  - endurecer demais o parser e transformar ausencia editorial em falha fatal do stage;
  - enriquecer `publicationHandoff` sem alinhar `WorkflowImprovementTicketHandoff`, quebrando testes e tipagem;
  - misturar responsabilidades deste ticket com o ticket irmao de renderizacao e acabar alterando o publisher alem do necessario;
  - perder compatibilidade com same-repo/cross-repo ou `historicalReference` ao refatorar a montagem do handoff.
- Recovery / Rollback:
  - se o parser ficar fragil demais, reduzir a validacao sintatica ao minimo seguro no parser e mover a validacao de sufiencia material para o runner, mantendo a degradacao para `operational-limitation`;
  - se o novo draft quebrar o handoff existente, preservar temporariamente os campos causais atuais e adicionar o draft como campo paralelo, evitando regressao no publisher;
  - se a publicacao voltar a ocorrer com placeholder, bloquear explicitamente o branch de publication ate que o runner produza limitacao operacional observavel.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
- Referencias obrigatorias lidas para este plano:
  - `PLANS.md`
  - `SPECS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/types/workflow-gap-analysis.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/integrations/workflow-gap-analysis-parser.ts`
  - `src/integrations/workflow-gap-analysis-parser.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
- Checklist aplicado de `docs/workflows/codex-quality-gates.md`:
  - ticket inteiro e referencias obrigatorias lidos antes de planejar;
  - spec de origem, RFs/CAs, RNFs/restricoes e assumptions/defaults explicitados;
  - closure criteria traduzidos para matriz `requisito -> validacao observavel`;
  - riscos residuais e limites do ticket declarados;
  - validacao herdada do ticket mantida como item explicito do plano.
- Nota de escopo:
  - toda a secao `Validation and Acceptance` deriva diretamente dos closure criteria do ticket e da validacao herdada; `PLANS.md` e os quality gates foram usados como meta-gates de completude do plano, nao como substituto do aceite do ticket.
- Evidencias executadas em 2026-03-23 03:27Z:
  - `rg -n "ticketDraft|title|problemStatement|expectedBehavior|proposedSolution|reproductionSteps|impactFunctional|impactOperational|regressionRisk|relevantAssumptionsDefaults|closureCriteria|affectedWorkflowSurfaces" prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/types/workflow-gap-analysis.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-gap-analysis-parser.ts src/core/runner.ts` -> confirmou a propagacao do contrato nas superficies planejadas.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/workflow-gap-analysis-parser.test.ts src/core/runner.test.ts` -> verde, incluindo o cenario `publicationEligibility=true` com `ticketDraft` incompleto sem publication placeholder.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> verde.
  - `git diff -- prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/types/workflow-gap-analysis.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-gap-analysis-parser.ts src/integrations/workflow-gap-analysis-parser.test.ts src/core/runner.ts src/core/runner.test.ts docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md execplans/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md` -> escopo auditado sem tocar a renderizacao final do publisher.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato textual das retrospectivas em `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`;
  - `WorkflowGapAnalysisResult` em `src/types/workflow-gap-analysis.ts`;
  - `WorkflowImprovementTicketHandoff` e possiveis tipos auxiliares em `src/types/workflow-improvement-ticket.ts`;
  - parser do bloco `[[WORKFLOW_GAP_ANALYSIS]]` em `src/integrations/workflow-gap-analysis-parser.ts`;
  - montagem do handoff e degradacao da publication em `src/core/runner.ts`.
- Compatibilidade:
  - manter classificacoes atuais de `workflow-gap-analysis`;
  - manter `publicationEligibility` como gate semantico de publicacao, apenas endurecendo seu prerequisito editorial;
  - manter a infraestrutura de publication same-repo/cross-repo, deduplicacao e fingerprints sem mudanca de semantica;
  - manter o fluxo sequencial e nao bloqueante para a spec corrente.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova esperada;
  - cobertura principal reutiliza o harness existente em `src/core/runner.test.ts` e `src/integrations/workflow-gap-analysis-parser.test.ts`;
  - o publisher e dependencia indireta: o plano deve preservar compatibilidade do handoff mesmo sem aprofundar mudancas de renderizacao neste ticket.
