# ExecPlan - anti-duplicacao entre retrospectivas pre e pos-spec-audit

## Purpose / Big Picture
- Objetivo: impedir que `spec-workflow-retrospective` pos-`spec-audit` reavalie ou abra ticket automatico duplicado para a mesma frente causal ja tratada por `spec-ticket-derivation-retrospective`, mantendo a possibilidade de apenas referenciar o ticket/achado preexistente quando isso for util para contexto historico.
- Resultado esperado:
  - a retrospectiva pos-`spec-audit` passa a receber contexto estruturado da retrospectiva pre-run-all, incluindo achados, fingerprints e eventual ticket transversal ja publicado;
  - o contrato parseavel da retrospectiva pos-`spec-audit` passa a distinguir "causa residual nova" de "frente causal ja tratada antes do /run-all", sem criar taxonomia paralela;
  - o runner deixa de chamar publication automatica para casos com overlap causal ja coberto pela retrospectiva pre-run-all e registra apenas referencia historica observavel.
- Escopo:
  - transportar para a retrospectiva pos-`spec-audit` o contexto ja produzido por `spec-ticket-derivation-retrospective`;
  - evoluir prompt, parser, tipos e resumo para expressar referencia historica versus nova publication;
  - adicionar uma guarda deterministica no runner para bloquear ticket automatico duplicado quando houver overlap com a frente causal pre-run-all;
  - cobrir os cenarios observaveis do closure criterion com testes focados.
- Fora de escopo:
  - reabrir a orquestracao da retrospectiva pre-run-all ou o write-back documental da spec; isso pertence ao ticket `2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap`;
  - alterar o contrato de compatibilidade do projeto alvo ou documentacao correlata;
  - redefinir a taxonomia canonica `systemic-gap | systemic-hypothesis | not-systemic | emphasis-only | operational-limitation`;
  - transformar a retrospectiva pos-`spec-audit` em etapa bloqueante.

## Progress
- [x] 2026-03-20 02:50Z - Ticket alvo, spec de origem, `PLANS.md`, `docs/workflows/codex-quality-gates.md` e referencias tecnicas obrigatorias relidos integralmente.
- [x] 2026-03-20 02:50Z - Fluxo atual do runner, prompt pos-`spec-audit`, tipos compartilhados e publisher revisitados para localizar o ponto exato da duplicacao causal.
- [x] 2026-03-19 19:55-03 - `buildWorkflowGapAnalysisContext(...)`, parser/tipos compartilhados, prompt pos-`spec-audit` e resumo de Telegram atualizados para carregar contexto causal pre-run-all, expor `historicalReference` e tornar a referencia historica observavel.
- [x] 2026-03-19 20:02-03 - Runner passou a aplicar guarda deterministica de anti-duplicacao antes da publication pos-`spec-audit`, suprimindo ticket transversal duplicado quando ha overlap de fingerprints ou referencia valida ao contexto pre-run-all.
- [x] 2026-03-19 20:07-03 - Suites focadas do closure criterion, `npm run check` e `npm run build` executados com sucesso.

## Surprises & Discoveries
- 2026-03-20 02:50Z - O runner ja carrega `specTicketDerivationRetrospective.analysis` e `specTicketDerivationRetrospective.workflowImprovementTicket` no resumo do `/run_specs`, mas `buildWorkflowGapAnalysisContext(...)` ainda ignora completamente esse material ao montar o contexto da retrospectiva pos-`spec-audit`.
- 2026-03-20 02:50Z - `WorkflowGapAnalysisResult` hoje nao tem campo estruturado para dizer "esta frente causal ja foi tratada antes do /run-all; so referencie historicamente", o que empurra a diferenciacao para texto livre e deixa a publicacao sem guarda observavel.
- 2026-03-20 02:50Z - O publisher atual deduplica apenas por `source spec + overlap de fingerprints` nos tickets abertos; isso ajuda a reusar ticket existente, mas nao resolve a fronteira analitica exigida por RF-35/RF-36 dentro da mesma linhagem de retrospectivas.
- 2026-03-20 02:50Z - `telegram-bot.ts` ja distingue `Retrospectiva sistemica da derivacao` de `Retrospectiva sistemica pos-spec-audit`, entao a referencia historica pode ser exibida sem criar um quarto bloco de resumo.
- 2026-03-19 19:59-03 - Os testes de overlap causal so exercem a anti-duplicacao real quando a rodada produz historico revisado no `spec-ticket-validation`; sem esse pre-requisito da spec, a retrospectiva pre-run-all e pulada e o runner corretamente nao tem contexto causal anterior para deduplicar.

## Decision Log
- 2026-03-20 - Decisao: manter a taxonomia oficial de `WorkflowGapAnalysisResult` e adicionar metadata estruturada de referencia historica/decisao anti-duplicacao, em vez de introduzir uma classificacao nova.
  - Motivo: RF-35/RF-36 pedem fronteira causal e referencia observavel, nao vocabulario novo.
  - Impacto: prompt, parser, tipos e testes precisam crescer de forma aditiva e retrocompativel.
- 2026-03-20 - Decisao: aplicar a anti-duplicacao em duas camadas, primeiro no contrato da retrospectiva pos-`spec-audit` e depois em uma guarda deterministica no runner antes de chamar `publishWorkflowImprovementTicketIfNeeded(...)`.
  - Motivo: o closure criterion exige comportamento robusto mesmo se a resposta do modelo vier ambigua.
  - Impacto: o runner passa a comparar a analise pos-auditoria com a frente causal pre-run-all usando fingerprints/refs e pode suprimir publication mesmo quando o texto livre falhar.
- 2026-03-20 - Decisao: operacionalizar "mesma frente causal" por overlap entre fingerprints dos achados pre-run-all e dos achados pos-auditoria, enriquecido com ticket path ja publicado quando existir.
  - Motivo: o projeto ja possui fingerprint canonico em `buildWorkflowImprovementTicketFindingFingerprint(...)`, reduzindo heuristica nova.
  - Impacto: o plano pode reutilizar tipos e publisher existentes sem depender de busca historica ampla fora da rodada corrente.
- 2026-03-19 19:57-03 - Decisao: usar `historicalReference` como unico campo parseavel novo para a etapa pos-`spec-audit`, deixando a decisao de anti-duplicacao implicita pela combinacao `historicalReference != null` + `publicationEligibility=false`.
  - Motivo: isso cobre a referencia historica estruturada exigida pelo ticket sem criar mais uma taxonomia ou estado duplicado no contrato compartilhado.
  - Impacto: o runner pode injetar/sanitizar a referencia historica apos o parse e o Telegram passa a exibir explicitamente quando houve apenas reaproveitamento do contexto pre-run-all.

## Outcomes & Retrospective
- Status final: execucao concluida e validada no working tree; ticket permanece aberto apenas para fechamento formal posterior.
- O que deve funcionar ao final da execucao:
  - a retrospectiva pos-`spec-audit` recebe contexto suficiente para reconhecer que determinada frente causal ja foi tratada na retrospectiva pre-run-all;
  - o runner nao abre ticket automatico duplicado para esse caso e registra apenas referencia historica observavel;
  - causas residuais realmente novas continuam elegiveis para publication automatica.
- O que fica pendente nesta etapa:
  - nenhuma pendencia tecnica dentro do escopo deste ExecPlan;
  - o que resta fora desta etapa e apenas o fechamento formal do ticket e, se desejado, evidencia complementar em rodada real ponta a ponta.
- Proximos passos:
  - revisar diff final contra ticket/spec antes do fechamento formal;
  - nao fechar ticket nem fazer commit/push nesta etapa, conforme o contrato desta execucao.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - monta o contexto da retrospectiva pos-`spec-audit`, executa `parseWorkflowGapAnalysisStageResult(...)` e chama `publishWorkflowImprovementTicketIfNeeded(...)`.
  - `src/types/workflow-gap-analysis.ts` - contrato tipado compartilhado entre retrospectiva pre-run-all e pos-auditoria.
  - `src/integrations/workflow-gap-analysis-parser.ts` - parser do bloco `[[WORKFLOW_GAP_ANALYSIS]]`.
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` - contrato operacional da retrospectiva pos-`spec-audit`.
  - `src/integrations/workflow-improvement-ticket-publisher.ts` - deduplicacao e publication cross-repo do ticket transversal.
  - `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts` - superficies observaveis do resumo final.
  - `src/core/runner.test.ts`, `src/integrations/workflow-gap-analysis-parser.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts` - suites candidatas para comprovar o closure criterion.
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- RFs/CAs cobertos por este plano:
  - RF-35, RF-36.
  - CA-17.
- Assumptions / defaults adotados:
  - a retrospectiva pre-run-all continua sendo a primeira responsavel por gaps sistemicos observaveis na derivacao;
  - a retrospectiva pos-`spec-audit` continua livre para publicar ticket novo apenas quando a frente causal residual nao tiver overlap material com a frente causal pre-run-all;
  - quando nao existir ticket publicado pela retrospectiva pre-run-all, a referencia historica pode apontar para os achados/fingerprints daquela analise, desde que isso fique observavel em summary/trace;
  - a anti-duplicacao precisa valer dentro da mesma linhagem do `/run_specs` atual, sem depender de varredura retroativa fora do contexto ja disponivel no runner;
  - todos os comandos com `node`/`npm`/`npx` devem usar o prefixo `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.
- Fluxo atual:
  - `spec-ticket-derivation-retrospective` ja pode gerar `analysis` e `workflowImprovementTicket`.
  - `spec-workflow-retrospective` hoje rele apenas spec, resultado do `spec-audit` e follow-up tickets novos, sem receber nada da etapa pre-run-all.
  - se `workflow-gap-analysis` voltar `publicationEligibility=true`, o runner tenta publicar ticket automaticamente sem considerar se a mesma frente causal ja foi tratada antes do `/run-all`.
- Restricoes tecnicas:
  - manter fluxo sequencial;
  - nao misturar novamente responsabilidade da retrospectiva pre-run-all com a pos-auditoria;
  - aplicar o checklist de `docs/workflows/codex-quality-gates.md`;
  - toda validacao planejada abaixo nasce do closure criterion do ticket, nao de checklist generico.

## Plan of Work
- Milestone 1: Carregar o contexto causal pre-run-all na retrospectiva pos-`spec-audit`.
  - Entregavel: `buildWorkflowGapAnalysisContext(...)` passa a incluir no contexto estruturado a analise pre-run-all, seus fingerprints derivados e o eventual ticket transversal ja publicado, para que a retrospectiva pos-auditoria saiba o que ja foi tratado antes do `/run-all`.
  - Evidencia de conclusao: o prompt/contexto da retrospectiva pos-`spec-audit` explicita quais frentes causais e refs pre-run-all ja existem e quais delas so podem ser citadas historicamente.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - possivelmente `src/types/flow-timing.ts`
- Milestone 2: Tornar a referencia historica parseavel e observavel.
  - Entregavel: `WorkflowGapAnalysisResult` e o parser passam a suportar metadata estruturada suficiente para diferenciar "novo gap residual publicavel" de "referencia historica a frente causal pre-run-all", mantendo a taxonomia canonica.
  - Evidencia de conclusao: `prompts/11-retrospectiva-workflow-apos-spec-audit.md` exige essa saida; `workflow-gap-analysis-parser.test.ts` aceita o payload novo e rejeita combinacoes incoerentes.
  - Arquivos esperados:
    - `src/types/workflow-gap-analysis.ts`
    - `src/integrations/workflow-gap-analysis-parser.ts`
    - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
    - `src/integrations/workflow-gap-analysis-parser.test.ts`
- Milestone 3: Impedir publication duplicada e preservar causas residuais novas.
  - Entregavel: o runner passa a comparar a analise pos-auditoria com a frente causal pre-run-all antes de chamar o publisher; quando houver overlap ja tratado, registra referencia historica e suprime a publication automatica; quando a causa residual for nova, mantem o caminho atual de publication.
  - Evidencia de conclusao: testes do runner cobrem os dois ramos, mostrando `sem ticket novo` para overlap causal e `ticket novo` para causa residual distinta.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - possivelmente `src/types/workflow-improvement-ticket.ts`
    - possivelmente `src/integrations/workflow-improvement-ticket-publisher.ts`
    - `src/core/runner.test.ts`
    - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
- Milestone 4: Expor a referencia historica no resumo final sem confundir os stages.
  - Entregavel: `telegram-bot.ts` e o resumo tipado passam a mostrar quando a retrospectiva pos-`spec-audit` apenas referenciou ticket/achado preexistente, sem parecer que um novo ticket foi aberto.
  - Evidencia de conclusao: `telegram-bot.test.ts` valida o texto do resumo para o caminho "referencia historica apenas" e para o caminho "nova publication residual".
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
    - possivelmente `src/types/flow-timing.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "specTicketDerivationRetrospective|workflowGapAnalysis|workflowImprovementTicket|publishWorkflowImprovementTicketIfNeeded|buildWorkflowGapAnalysisContext"` em `src/core/runner.ts`, `src/types/workflow-gap-analysis.ts`, `src/integrations/workflow-gap-analysis-parser.ts`, `src/integrations/telegram-bot.ts` e testes para reabrir todos os pontos de acoplamento da anti-duplicacao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para que `buildWorkflowGapAnalysisContext(...)` receba a sintese da retrospectiva pre-run-all da rodada corrente e gere uma lista deterministica de refs/fingerprints/ticket path ja tratados antes do `/run-all`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/workflow-gap-analysis.ts` para adicionar o shape minimo da referencia historica e da decisao de anti-duplicacao, preservando a taxonomia existente e sem remover campos atuais usados pela retrospectiva pre-run-all.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/11-retrospectiva-workflow-apos-spec-audit.md` para instruir explicitamente que:
   - a etapa deve reler o contexto pre-run-all recebido;
   - a mesma frente causal ja tratada antes do `/run-all` nao pode voltar com `publicationEligibility=true`;
   - quando houver overlap, o resultado deve registrar apenas referencia historica estruturada ao ticket/achado existente.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-gap-analysis-parser.ts` e `src/integrations/workflow-gap-analysis-parser.test.ts` para parsear e validar a nova metadata de referencia historica, rejeitando payloads que marquem referencia historica e publication nova ao mesmo tempo para a mesma frente causal.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar com `apply_patch` `src/core/runner.ts` para:
   - derivar fingerprints da analise pre-run-all ja concluida;
   - comparar esses fingerprints com os achados retornados por `spec-workflow-retrospective`;
   - suprimir `publishWorkflowImprovementTicketIfNeeded(...)` quando a causa residual for apenas uma repeticao da frente causal pre-run-all;
   - preservar publication quando o overlap nao existir ou quando a nova analise trouxer frente causal realmente distinta.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar com `apply_patch` `src/integrations/telegram-bot.ts` e, se necessario, `src/types/flow-timing.ts` para expor no resumo final quando houve "referencia historica apenas" em vez de novo ticket transversal pos-`spec-audit`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `src/core/runner.test.ts` para cobrir:
   - overlap causal com ticket pre-run-all ja publicado, sem nova publication pos-auditoria;
   - overlap causal sem ticket pre-run-all, mas com referencia aos achados/fingerprints preexistentes;
   - causa residual nova, ainda elegivel para publication pos-`spec-audit`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `src/integrations/telegram-bot.test.ts` e `src/integrations/workflow-improvement-ticket-publisher.test.ts` apenas se o contrato observavel ou o status/result do publisher precisarem refletir explicitamente a referencia historica.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts` para validar os cenarios do closure criterion.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar que os contratos novos de anti-duplicacao se propagam sem quebras de tipagem nas duas retrospectivas.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para confirmar que a integracao final do changeset permanece verde.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/types/workflow-gap-analysis.ts src/integrations/workflow-gap-analysis-parser.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-improvement-ticket-publisher.ts src/core/runner.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts prompts/11-retrospectiva-workflow-apos-spec-audit.md` para auditoria final de escopo antes do fechamento do ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-35; CA-17.
  - Evidencia observavel: uma rodada de teste em que a retrospectiva pre-run-all ja tratou e ticketou a mesma frente causal mostra que `spec-workflow-retrospective` nao dispara nova publication automatica, nao gera segundo ticket transversal e mantem apenas a referencia ao artefato preexistente.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: os asserts do caso de overlap causal passam com `workflowImprovementTicket` pos-`spec-audit` ausente ou explicitamente suprimido e com a referencia historica apontando para o ticket/achado pre-run-all.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-36; CA-17.
  - Evidencia observavel: o payload parseavel, o resumo do runner e o resumo do Telegram registram "referencia historica apenas" quando a etapa pos-`spec-audit` precisa citar ticket/achado da retrospectiva pre-run-all sem reabrir a mesma frente causal como backlog novo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: a suite aceita o novo shape de referencia historica, rejeita combinacoes incoerentes e renderiza texto que deixa claro tratar-se de contexto preexistente, nao de nova publication.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-35, RF-36; CA-17.
  - Evidencia observavel: uma rodada de teste com frente causal realmente nova apos `spec-audit` continua abrindo ticket transversal normalmente, provando que a guarda de anti-duplicacao nao bloqueia causas residuais distintas.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - Esperado: o caso "causa residual nova" permanece verde com publication ativa, enquanto o caso de overlap causal continua sem ticket duplicado.
- Validacao de integracao do mesmo criterion:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde para o contrato compartilhado entre retrospectiva pre-run-all e pos-auditoria, sem quebrar o fluxo observavel.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: build verde com o novo contrato de anti-duplicacao integrado aos artefatos do runner.

## Idempotence and Recovery
- Idempotencia:
  - a derivacao dos fingerprints usados para comparar a frente causal pre-run-all versus pos-auditoria deve ser deterministica a partir do resultado parseado e dos achados ja persistidos no summary da rodada;
  - rerodar a mesma rodada com a mesma frente causal deve continuar sem abrir segundo ticket, seja pela nova guarda no runner, seja pelo reuso ja existente no publisher;
  - a referencia historica deve ser aditiva e observavel, sem alterar o veredito funcional nem o encadeamento sequencial do fluxo.
- Riscos:
  - overlap agressivo demais pode bloquear uma causa residual realmente nova que compartilha algum artefato, mas nao a mesma frente causal;
  - overlap frouxo demais pode deixar passar o mesmo backlog sistemico em duas etapas;
  - alterar o parser compartilhado pode introduzir regressao tambem na retrospectiva pre-run-all.
- Recovery / Rollback:
  - se o novo shape parseavel se mostrar instavel, priorizar primeiro a guarda deterministica no runner com base em fingerprints ja existentes e deixar a referencia historica minima em summary/trace, em vez de liberar duplicacao automatica;
  - se a heuristica de overlap gerar falso positivo, restringir a comparacao para fingerprints completos dos achados e ticket path pre-run-all, evitando heuristica textual frouxa;
  - se o publisher nao precisar mudar, manter o change set fora dele para reduzir a area de regressao.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- Referencias obrigatorias relidas:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/core/runner.ts`
  - `src/types/workflow-gap-analysis.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/integrations/workflow-gap-analysis-parser.test.ts`
  - `execplans/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`
- Observacoes operacionais:
  - este plano assume que o contexto pre-run-all ja esta disponivel em memoria/resumo da rodada corrente; se isso nao bastar durante a execucao, registrar blocker explicito antes de improvisar armazenamento paralelo;
  - os comandos Node deste plano ja estao escritos com o prefixo de ambiente exigido pelo host.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `WorkflowGapAnalysisResult` para carregar metadata estruturada de referencia historica/anti-duplicacao.
  - `buildWorkflowGapAnalysisContext(...)` e `runTimedSpecWorkflowRetrospectiveStage(...)` em `src/core/runner.ts`.
  - possivel contrato observavel de `RunSpecsFlowSummary.workflowGapAnalysis` e/ou do resumo de Telegram, caso a referencia historica precise aparecer explicitamente.
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `workflow-gap-analysis-parser.ts`.
- Compatibilidade:
  - preservar os nomes canonicos `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`;
  - preservar a taxonomia compartilhada entre as duas retrospectivas;
  - bloquear apenas duplicacao da mesma frente causal ja tratada antes do `/run-all`, sem impedir publication para causas residuais novas.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova deve ser necessaria;
  - reutilizar `buildWorkflowImprovementTicketFindingFingerprint(...)` como base do overlap deterministico;
  - reutilizar os harnesses/mocks ja existentes de `runner`, parser, Telegram e publisher.
