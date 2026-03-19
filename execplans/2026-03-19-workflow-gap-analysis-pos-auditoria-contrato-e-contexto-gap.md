# ExecPlan - Workflow-gap-analysis pos-auditoria: contrato, contexto novo e criterio causal

## Purpose / Big Picture
- Objetivo: materializar o contrato dedicado de `workflow-gap-analysis` dentro de `spec-workflow-retrospective`, substituindo a retrospectiva preliminar atual por uma analise causal estruturada, iniciada em contexto novo em relacao a `spec-audit`, com insumos corretos e criterio observavel para `high | medium | low confidence`.
- Resultado esperado:
  - o runner deixa de tratar `spec-workflow-retrospective` como relatorio preliminar sem contrato e passa a produzir um resultado parseavel de `workflow-gap-analysis`;
  - a analise prioriza follow-up tickets funcionais abertos por `spec-audit`, com fallback explicito para `spec + resultado da auditoria` quando necessario;
  - a elegibilidade para acionar `workflow-ticket-publication` passa a nascer apenas do resultado estruturado da analise com `high confidence`;
  - `medium confidence`, `low confidence`, sugestao meramente de enfase e falha tecnica passam a ter tratamento observavel e nao bloqueante.
- Escopo:
  - definir o payload/shape operacional de `workflow-gap-analysis`, incluindo parser, tipos e contrato parseavel;
  - construir o contexto de entrada da analise a partir de `spec-audit`, follow-up tickets funcionais e fontes canonicas do `codex-flow-runner`;
  - trocar o wiring do runner para executar a analise dedicada em contexto novo e gatear a publicacao apenas quando houver elegibilidade com `high confidence`;
  - propagar o resultado da analise para trace/log e para o resumo final observavel quando ele nao depender de publicacao efetiva;
  - cobrir em testes os caminhos `high`, `medium`, `low`, sugestao meramente de enfase e `operational-limitation`.
- Fora de escopo:
  - reescrever a infraestrutura de `workflow-improvement-ticket-publisher` ou concluir a migracao cross-repo de publicacao, coberta por `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`;
  - mudar a semantica de `spec-ticket-validation`, salvo a remocao do acoplamento minimo necessario para evitar dupla fonte de verdade sobre follow-up sistemico;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push.

## Progress
- [x] 2026-03-19 22:35Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `DOCUMENTATION.md`, de `docs/workflows/codex-quality-gates.md` e das referencias obrigatorias do ticket.
- [x] 2026-03-19 22:48Z - Contrato parseavel de `workflow-gap-analysis` definido em prompt, parser e tipos compartilhados, incluindo `classification`, `publicationEligibility`, `inputMode`, `findings` e `operational-limitation`.
- [x] 2026-03-19 22:54Z - Runner atualizado para montar o contexto correto da analise, executar o stage em contexto novo, degradar falhas para `operational-limitation` e produzir handoff tipado para `workflow-ticket-publication`.
- [x] 2026-03-19 22:58Z - Observabilidade, summary/trace e testes cobrindo `high`, `medium`, `low`/`not-systemic`, enfase nao elegivel e limitacao operacional validados com `tsx --test`, `npm run check` e `npm run build`.

## Surprises & Discoveries
- 2026-03-19 22:35Z - O estagio `spec-workflow-retrospective` ja existe em `src/core/runner.ts`, mas hoje chama apenas `prompts/11-retrospectiva-workflow-apos-spec-audit.md`, que assume explicitamente uma entrega preliminar sem `workflow-gap-analysis` nem `workflow-ticket-publication`.
- 2026-03-19 22:35Z - O runner ja parseia `[[SPEC_AUDIT_RESULT]]`, mas o contrato atual de `spec-audit` expõe apenas `residual_gaps_detected` e `follow_up_tickets_created`; nao existe hoje lista estruturada dos follow-up tickets que a analise precisa priorizar.
- 2026-03-19 22:35Z - A publicacao do ticket transversal e o resumo correspondente ainda nascem de `SpecTicketValidationResult`, via `publishWorkflowImprovementTicketIfNeeded(...)`, `RunSpecsTicketValidationSummary.workflowImprovementTicket` e o bloco `Gate spec-ticket-validation` no Telegram.
- 2026-03-19 22:35Z - Ja existe logica reutilizavel para descobrir tickets abertos ligados a uma spec em `src/core/runner.ts`; ela pode servir de base para montar os insumos de auditoria sem inventar um segundo mecanismo de varredura.
- 2026-03-19 22:49Z - `runSpecStage(...)` so persistia trilha de falha quando a execucao do Codex quebrava; erros de contrato apos receber output parseavel precisaram de um caminho extra para registrar decision failure sem perder prompt/output.
- 2026-03-19 22:52Z - O helper de descoberta de tickets ligados a spec ja era suficiente para resolver o delta pre/post `spec-audit`; nao foi necessario criar uma segunda infraestrutura de lookup para follow-ups funcionais.

## Decision Log
- 2026-03-19 - Decisao: este ticket passa a ser a fonte de verdade do diagnostico causal pos-auditoria; o ticket irmao de publication consome o resultado desta analise, mas nao redefine seu contrato.
  - Motivo: o ticket atual cobre RF-05..RF-18 e RF-24, enquanto o ticket irmao cobre RF-19..RF-23 e RF-25..RF-30.
  - Impacto: o plano precisa entregar o tipo/resultado intermediario que permita desacoplar analise e publicacao sem misturar escopos.
- 2026-03-19 - Decisao: o resultado de `workflow-gap-analysis` deve nascer de um bloco parseavel dedicado, em vez de texto livre ou inferencia por regex frouxa.
  - Motivo: CA-05, CA-06, CA-07 e CA-13 exigem gating deterministico entre `high`, `medium`, `low`, nao elegibilidade por enfase e falha tecnica nao bloqueante.
  - Impacto: sera necessario criar tipos e parser proprios, com testes focados em compatibilidade e falhas de contrato.
- 2026-03-19 - Decisao: a prioridade pelos follow-up tickets da auditoria deve ser resolvida por evidencia observavel do repositorio, usando a saida de `spec-audit` e o delta de tickets ligados a spec como mecanismo principal; quando isso nao for suficiente, o fluxo cai para `spec + resultado da auditoria` com rastreabilidade explicita.
  - Motivo: o contrato atual de `spec-audit` nao entrega os caminhos dos tickets, apenas a contagem.
  - Impacto: o plano precisa prever um helper claro para descobrir os follow-ups corretos sem acoplar a analise a heuristicas opacas.
- 2026-03-19 - Decisao: falha tecnica na analise deve degradar para um resultado estruturado de `operational-limitation` e nao abortar o `/run_specs`.
  - Motivo: RF-24 e CA-13 exigem retrospectiva sistemica nao bloqueante.
  - Impacto: runner, trace e resumo final precisam distinguir falha contratual da analise de falha fatal do fluxo principal.
- 2026-03-19 - Decisao: o handoff para `workflow-ticket-publication` sera produzido pela propria analise, mas a publicacao cross-repo fica explicitamente fora deste changeset.
  - Motivo: o ticket atual precisa remover a origem sistêmica de `spec-ticket-validation` sem invadir RF-19..RF-30, reservados ao ticket irmao.
  - Impacto: `workflowGapAnalysis.publicationHandoff` passa a ser a interface futura de publication, enquanto o publisher atual permanece desacoplado por ora.
- 2026-03-19 - Decisao: o resumo do Telegram e o trace do `/run_specs` passam a refletir `workflowGapAnalysis` como entidade propria, e o gate pre-`/run-all` deixa de anunciar follow-up sistemico pos-auditoria.
  - Motivo: evitar duas fontes de verdade concorrentes para backlog sistemico.
  - Impacto: testes e serializacao do summary precisaram migrar do subbloco `specTicketValidation.workflowImprovementTicket` para `workflowGapAnalysis`.

## Outcomes & Retrospective
- Status final: execucao concluida para o escopo deste ticket; publication cross-repo permanece pendente no ticket irmao.
- O que funcionou:
  - a spec e o ticket delimitam com precisao o subconjunto RF/CA deste trabalho;
  - o repositorio ja possui infraestrutura reutilizavel de parse, trace, tipagem de fluxo e descoberta de tickets ligados a spec;
  - os closure criteria do ticket sao especificos o bastante para derivar uma matriz observavel sem checklist generico;
  - a migracao do resumo/trace para `workflowGapAnalysis` removeu o acoplamento pos-auditoria de `spec-ticket-validation` sem exigir reescrita do publisher.
- O que ficou pendente:
  - executar `workflow-ticket-publication` como segunda subetapa real da retrospectiva;
  - ligar o publisher cross-repo existente ao novo `publicationHandoff`;
  - validar manualmente a rodada real em projeto externo e no proprio `codex-flow-runner`.
- Proximos passos:
  - fechar o ticket irmao de publication consumindo `workflowGapAnalysis.publicationHandoff`;
  - validar manualmente os cenarios cross-repo e mesmo-repo;
  - encerrar este ticket em changeset posterior, sem alterar o escopo ja entregue aqui.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/closed/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md`
  - `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/types/flow-timing.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `prompts/08-auditar-spec-apos-run-all.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
- Spec de origem: `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
- RFs/CAs cobertos por este plano:
  - RF-05, RF-06, RF-07
  - RF-08, RF-09, RF-10, RF-11, RF-12, RF-13
  - RF-14, RF-15, RF-16, RF-17, RF-18, RF-24
  - CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-13
- Assumptions / defaults adotados:
  - `workflow-gap-analysis` e `workflow-ticket-publication` continuam sendo os nomes canonicos das subetapas da retrospectiva;
  - `workflow-gap-analysis` deve usar um contrato parseavel dedicado e pode ser executado por uma chamada nova do runner/Codex que nao herde implicitamente contexto de `spec-audit`;
  - os follow-up tickets funcionais da auditoria serao resolvidos prioritariamente por delta observavel de `tickets/open/` ligados a mesma `Source spec`, usando `follow_up_tickets_created` como cheque de consistencia; quando isso falhar ou resultar vazio, a analise cai para `spec + resultado do audit` como fallback explicito;
  - `medium confidence` gera apenas hipotese sistemica observavel, sem ticket automatico;
  - `low confidence` ou recomendacao meramente de enfase nao gera ticket automatico nem hipotese acionavel;
  - `workflow-ticket-publication` permanece dependente do ticket irmao para publicar/reutilizar ticket, mas o gate de elegibilidade `high confidence` passa a ser definido aqui;
  - a retrospectiva continua nao bloqueante mesmo quando a analise falha tecnicamente.
- Fluxo atual relevante:
  - `runSpecsAndRunAll(...)` ja executa `spec-audit` e, quando ha gaps residuais, roda `spec-workflow-retrospective` como etapa final observavel;
  - a retrospetiva atual nao possui payload estruturado e nao diferencia `high`, `medium`, `low` nem `operational-limitation`;
  - o follow-up sistemico publicado/reutilizado ainda e derivado de `spec-ticket-validation`, antes de `/run-all`;
  - o Telegram ainda resume o follow-up sistemico dentro do bloco `Gate spec-ticket-validation`.
- Restricoes tecnicas:
  - manter o fluxo sequencial;
  - toda validacao precisa nascer dos closure criteria deste ticket;
  - comandos Node devem usar o prefixo obrigatorio de `HOME` e `PATH`;
  - o plano precisa deixar espaco claro para o ticket irmao sem exigir reescrita dupla de runner/summary.

## Plan of Work
- Milestone 1: Definir o contrato estruturado e os artefatos de entrada de `workflow-gap-analysis`.
  - Entregavel: um tipo dedicado de resultado da analise, um parser com bloco parseavel e um builder de contexto que prioriza follow-up tickets da auditoria e cai para `spec + resultado do audit` quando necessario.
  - Evidencia de conclusao: testes de parser/contexto provam que a analise recebe o pacote correto de artefatos, registra o modo de entrada usado e falha com mensagem objetiva quando o contrato parseavel estiver invalido.
  - Arquivos esperados: `src/types/` com novo tipo da analise, novo parser em `src/integrations/`, testes do parser e helper(s) no runner ou modulo dedicado.
- Milestone 2: Substituir a retrospectiva preliminar por analise causal em contexto novo.
  - Entregavel: o runner deixa de executar a retrospectiva placeholder e passa a chamar `workflow-gap-analysis` com contexto novo em relacao a `spec-audit`, sem herdar thread implícita da auditoria.
  - Evidencia de conclusao: testes de runner/codex client mostram que a etapa de analise usa prompt/contrato dedicados, com contexto novo, e que `workflow-ticket-publication` so entra no fluxo quando a analise devolver elegibilidade com `high confidence`.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/codex-client.ts`, prompt(s) da retrospectiva e testes de runner/codex.
- Milestone 3: Tornar a decisao `high | medium | low | operational-limitation` observavel.
  - Entregavel: traces, resumo final e tipagem do fluxo passam a carregar um resumo de `workflow-gap-analysis`, incluindo hipotese sistemica em `medium`, nao elegibilidade em `low` ou enfase, e limitacao operacional nao bloqueante em falha tecnica.
  - Evidencia de conclusao: testes de runner/trace/Telegram comprovam que `medium` registra hipotese sem ticket automatico, `low` e enfase nao abrem ticket, e falhas tecnicas nao bloqueiam `/run_specs`.
  - Arquivos esperados: `src/types/flow-timing.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts` e testes associados.
- Milestone 4: Preparar a interface de handoff para o ticket irmao de publication.
  - Entregavel: o resultado de `workflow-gap-analysis` passa a oferecer os dados minimos para `workflow-ticket-publication` consumir depois, sem manter a publicacao sistemica acoplada a `SpecTicketValidationResult`.
  - Evidencia de conclusao: nao resta no runner nenhum novo caminho que derive elegibilidade de publicacao a partir de `spec-ticket-validation`; a interface de handoff esta tipada e testada.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/flow-timing.ts`, possivelmente `src/types/workflow-improvement-ticket.ts` e testes de regressao.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "spec-workflow-retrospective|workflow-gap-analysis|workflow-ticket-publication|publishWorkflowImprovementTicketIfNeeded|workflowImprovementTicket|SPEC_AUDIT_RESULT" src prompts` para reabrir os pontos de acoplamento atuais antes das edicoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '4480,5515p' src/core/runner.ts` e `sed -n '1,260p' prompts/11-retrospectiva-workflow-apos-spec-audit.md` para confirmar o fluxo placeholder atual e fixar o desenho de substituicao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` os tipos compartilhados para introduzir um resultado dedicado de `workflow-gap-analysis`, com campos suficientes para:
   - `confidence`;
   - `publicationEligibility`;
   - `inputMode` (`follow-up-tickets` ou `spec-and-audit-fallback`);
   - resumo da hipotese causal;
   - classificacao de `operational-limitation`, quando houver.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.ts` e criar o prompt/parser dedicados para `workflow-gap-analysis`, garantindo bloco parseavel e contexto novo em relacao a `spec-audit`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para:
   - resolver os follow-up tickets da auditoria por delta observavel e/ou referencia de spec;
   - montar o fallback `spec + resultado do audit` quando nao houver follow-ups;
   - chamar `workflow-gap-analysis` em contexto novo;
   - gatear `workflow-ticket-publication` apenas quando `publicationEligibility` for verdadeiro com `high confidence`;
   - converter falhas tecnicas da analise em resultado nao bloqueante de `operational-limitation`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-trace-store.ts`, `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts` para que a retrospectiva exponha o resultado da analise como entidade propria, desacoplando o follow-up sistemico de `spec-ticket-validation`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` os testes de `src/core/runner.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/workflow-trace-store.test.ts`, `src/integrations/telegram-bot.test.ts` e criar testes do parser/contrato da analise para cobrir:
   - contexto novo vs. `spec-audit`;
   - priorizacao de follow-up tickets funcionais;
   - fallback `spec + audit`;
   - `high`, `medium`, `low`, enfase nao elegivel e `operational-limitation`;
   - ausencia de ticket automatico fora de `high confidence`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` para validar os cenarios observaveis diretamente ligados ao ticket.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para garantir que o novo contrato da analise propaga corretamente pelos tipos do fluxo.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para confirmar que o wiring completo compila.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/integrations/codex-client.ts src/integrations/workflow-trace-store.ts src/integrations/telegram-bot.ts src/types/flow-timing.ts src/types/workflow-improvement-ticket.ts prompts src/integrations` para auditoria final do escopo tocado e para verificar se o acoplamento remanescente com `spec-ticket-validation` ficou limitado ao necessario.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-05, RF-06, RF-07; CA-04, CA-05
    - Evidencia observavel: existem prompt e contrato dedicados para `workflow-gap-analysis`; a analise roda em contexto novo em relacao a `spec-audit`; `workflow-ticket-publication` so recebe execucao quando o resultado parseado sinaliza elegibilidade com `high confidence`.
    - Comando: `rg -n "workflow-gap-analysis|workflow-ticket-publication|high confidence|publicationEligibility|SPEC_AUDIT_RESULT" src prompts`
    - Esperado: referencias a contrato/prompt dedicados de `workflow-gap-analysis` e gating explicito de publication por `high confidence`, sem depender de heuristica livre.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/codex-client.test.ts`
    - Esperado: testes verdes provando contexto novo para a analise e ausencia de chamada de publication quando a analise nao for `high confidence`.
  - Requisito: RF-08, RF-09, RF-10, RF-11, RF-12, RF-13; CA-08, CA-09
    - Evidencia observavel: a analise usa follow-up tickets funcionais da auditoria como insumo principal, cai para `spec + resultado do audit` como fallback e o prompt orienta leitura inicial de `AGENTS.md`, docs canonicos e `prompts/` do `codex-flow-runner`, expandindo para runner/orquestracao apenas quando necessario.
    - Comando: `rg -n "AGENTS.md|prompts/|follow-up tickets|fallback|spec \\+ resultado do audit|runner/orquestracao" prompts src`
    - Esperado: o prompt e/ou builder de contexto mencionam explicitamente a ordem de leitura canonica e o fallback controlado.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/codex-client.test.ts`
    - Esperado: testes verdes cobrindo os cenarios `com follow-up tickets` e `sem follow-up tickets`, inclusive em projeto externo com leitura priorizada de `../codex-flow-runner`.
  - Requisito: RF-14, RF-15, RF-16, RF-17, RF-18, RF-24; CA-06, CA-07, CA-13
    - Evidencia observavel: o contrato da analise diferencia `high`, `medium` e `low confidence`; `medium` registra apenas hipotese sistemica; `low` e sugestao meramente de enfase nao abrem ticket automatico; falha tecnica vira limitacao operacional nao bloqueante observavel.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes demonstrando hipotese apenas em `medium`, ausencia de ticket automatico em `low`/enfase e resumo/trace com `operational-limitation` sem falha do `/run_specs`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Esperado: tipagem verde com o novo resultado da analise propagado pelo fluxo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - Esperado: build verde do runner com o novo contrato de retrospectiva.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a implementacao nao deve duplicar blocos parseaveis, enums de confidence nem mensagens de resumo;
  - a descoberta de follow-up tickets por delta de auditoria deve ser deterministica para a mesma spec e o mesmo estado de `tickets/open/`;
  - o prompt da analise deve permanecer focado nas fontes canonicas e no criterio causal, sem reintroduzir linguagem preliminar da retrospectiva placeholder.
- Riscos:
  - o delta de follow-up tickets da auditoria pode ficar ambiguo se houver tickets abertos paralelos tocados manualmente entre o snapshot pre-audit e o pos-audit;
  - mover a fonte de verdade do follow-up sistemico para a retrospectiva pode exigir ajuste adicional no resumo do Telegram para evitar informacao duplicada ou contraditoria;
  - um parser detalhado demais pode engessar o prompt e tornar a analise fragil a pequenas variacoes de texto.
- Recovery / Rollback:
  - se a identificacao objetiva dos follow-up tickets falhar, registrar `operational-limitation` e usar o fallback `spec + resultado do audit` em vez de inventar insumos;
  - se a migracao do resumo final conflitar com o ticket irmao, introduzir temporariamente um adaptador interno para carregar apenas o resultado da analise, deixando a publicacao cross-repo para o changeset seguinte;
  - se o contrato parseavel ficar instavel, reduzir o bloco a um shape minimo obrigatorio e mover detalhes secundarios para campos opcionais testados separadamente.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
- Ticket correlato fora do escopo direto:
  - `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`
- ExecPlan correlato consultado:
  - `execplans/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md`
- Checklists aplicados no planejamento (`docs/workflows/codex-quality-gates.md`):
  - ticket inteiro e referencias obrigatorias lidos antes de planejar;
  - spec de origem, RFs/CAs e assumptions/defaults explicitados;
  - closure criteria traduzidos para matriz `requisito -> validacao observavel`;
  - riscos residuais, limites do ticket e dependencias com o ticket irmao declarados.
- Nota de desenho:
  - a implementacao deve preferir reaproveitar padroes existentes de parser, trace e descoberta de tickets ligados a spec, evitando criar uma segunda infraestrutura paralela ao que ja existe em `spec-ticket-validation`.
- Nota de qualidade:
  - toda a secao `Validation and Acceptance` deriva diretamente dos 3 closure criteria do ticket; o checklist compartilhado foi usado apenas como gate de completude do plano.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - novo tipo de resultado de `workflow-gap-analysis` em `src/types/`;
  - novo parser dedicado em `src/integrations/`;
  - contratos de summary/trace para carregar o resultado da retrospectiva fora de `RunSpecsTicketValidationSummary`;
  - wiring do runner que hoje liga follow-up sistemico a `SpecTicketValidationResult`.
- Compatibilidade:
  - `spec-workflow-retrospective` continua sendo a fase final observavel quando houver gaps residuais reais;
  - `spec-ticket-validation` continua existindo como gate pre-`/run-all`, mas deixa de ser a origem semantica do backlog sistemico pos-auditoria;
  - `workflow-ticket-publication` continua dependente do ticket irmao para concluir deduplicacao/reuso/publicacao cross-repo.
- Dependencias e acoplamentos relevantes:
  - `src/core/runner.ts` para montar snapshots de tickets antes/depois de `spec-audit` e para orquestrar a analise;
  - `src/integrations/codex-client.ts` para expor prompt/execucao dedicados da analise;
  - `prompts/08-auditar-spec-apos-run-all.md` apenas como fonte do bloco `[[SPEC_AUDIT_RESULT]]`, sem reabsorver responsabilidade sistemica;
  - `src/integrations/workflow-improvement-ticket-publisher.ts` e `src/types/workflow-improvement-ticket.ts` como consumidores futuros do handoff de `high confidence`;
  - `src/integrations/telegram-bot.ts` e `src/integrations/workflow-trace-store.ts` para distinguir hipotese, nao elegibilidade e limitacao operacional.
- Estado final esperado das dependencias:
  - a analise causal pos-auditoria passa a ser uma interface tipada e observavel;
  - o ticket irmao de publication pode consumir esse resultado sem voltar a depender de `SpecTicketValidationResult`;
  - o resumo do fluxo deixa de sugerir que o follow-up sistemico nasce do gate pre-implementacao.
