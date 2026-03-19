# ExecPlan - Workflow-ticket-publication pos-auditoria: reuso cross-repo e limites nao bloqueantes

## Purpose / Big Picture
- Objetivo: reconectar a publicacao do ticket transversal de workflow ao resultado de `workflow-gap-analysis`, preservando o publisher cross-repo ja existente, a deduplicacao por spec + fingerprints e o comportamento nao bloqueante exigido pela retrospectiva pos-auditoria.
- Resultado esperado:
  - `workflow-ticket-publication` passa a consumir o handoff tipado de `workflow-gap-analysis` em vez de `SpecTicketValidationResult`;
  - a retrospectiva publica ou reutiliza no maximo 1 ticket transversal agregado por rodada auditada, no repositorio atual ou em `../codex-flow-runner`, conforme o projeto ativo;
  - o resumo final, os logs e os traces de `/run_specs` passam a distinguir a analise sistemica, o ticket transversal publicado/reutilizado, a hipotese sem ticket automatico e a limitacao operacional nao bloqueante;
  - quando o projeto auditado for externo, a retrospectiva nao altera a spec nem faz commit/push no projeto corrente; se houver publish bem-sucedido, o unico commit/push adicional acontece no `codex-flow-runner`.
- Escopo:
  - migrar o gatilho e o payload da publicacao do ticket transversal para o pos-`spec-audit`, consumindo `workflowGapAnalysis.publicationHandoff`;
  - adaptar tipos e o publisher para que o candidato do ticket nasca da retrospectiva, sem depender mais do shape herdado de `spec-ticket-validation`;
  - expor o resultado da publicacao como entidade observavel do `/run_specs` e refletir isso no Telegram/logs;
  - ampliar a cobertura automatizada de runner, publisher e resumo final para os cenarios de reuso, publish cross-repo e limitacao operacional.
- Fora de escopo:
  - redesenhar o contrato de `workflow-gap-analysis`, ja entregue pelo ticket irmao fechado;
  - reabrir a separacao de responsabilidades de `spec-audit` ou alterar novamente `prompts/08-auditar-spec-apos-run-all.md`, salvo se uma releitura durante a execucao revelar regressao objetiva neste ticket;
  - fechar o ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push manualmente nesta etapa de planejamento.

## Progress
- [x] 2026-03-19 23:15Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `DOCUMENTATION.md`, de `docs/workflows/codex-quality-gates.md` e das referencias obrigatorias do ticket.
- [x] 2026-03-19 23:05Z - Wiring do runner e dos tipos migrado de `spec-ticket-validation` para `workflow-gap-analysis.publicationHandoff`.
- [x] 2026-03-19 23:12Z - Observabilidade do `/run_specs` atualizada para expor o resultado de publication fora do gate `spec-ticket-validation`.
- [x] 2026-03-19 23:20Z - Testes de runner/publisher/Telegram executados e matriz final validada.
- [x] 2026-03-19 23:23Z - Fechamento formal validado como `GO`; ticket movido para `tickets/closed/` e artefatos preparados para versionamento pelo runner.

## Surprises & Discoveries
- 2026-03-19 23:15Z - O publisher cross-repo ja cobre `current-project`, `workflow-sibling`, `reused-open-ticket`, `created-and-pushed` e `operational-limitation`; o gap atual e de orquestracao/contrato, nao de IO basico.
- 2026-03-19 23:15Z - `src/core/runner.ts` ainda monta `WorkflowImprovementTicketCandidate` a partir de `SpecTicketValidationResult`, filtrando `systemic-instruction` no gate pre-`/run-all`, o que conflita com a spec aprovada para a retrospectiva pos-auditoria.
- 2026-03-19 23:15Z - `RunSpecsFlowSummary` ja possui `workflowGapAnalysis`, mas ainda nao carrega um resultado proprio de `workflow-ticket-publication`; por isso o Telegram hoje distingue a hipotese sistemica, mas nao o resultado do publish/reuso.
- 2026-03-19 23:15Z - Ja existe suite dedicada em `src/integrations/workflow-improvement-ticket-publisher.test.ts`; ela reduz o risco da mudanca e deve ser expandida, nao substituida.
- 2026-03-19 23:15Z - `renderWorkflowImprovementTicketLines(...)` existe no runner, mas ainda nao esta ligado ao resumo final; ele e um bom candidato para reaproveitamento ou consolidacao durante a execucao.
- 2026-03-19 23:16Z - O narrowing de `parsedResult` apos `runSpecStage(...)` nao e inferido pelo TypeScript; foi necessario congelar o valor em uma variavel local tipada antes de validar `publicationEligibility` e `publicationHandoff`.
- 2026-03-19 23:18Z - `prompts/08-auditar-spec-apos-run-all.md` ainda preserva linguagem de commit/push da auditoria funcional, mas o wiring desta entrega nao depende mais desse prompt para garantir o contrato da retrospectiva cross-repo.

## Decision Log
- 2026-03-19 - Decisao: tratar `workflowGapAnalysis.publicationHandoff` como unica fonte de verdade para `workflow-ticket-publication`.
  - Motivo: a spec e o ticket exigem que a decisao automatica de publicacao nasca apenas da retrospectiva pos-auditoria com `high confidence`.
  - Impacto: o plano precisa remover a dependencia do runner em `SpecTicketValidationResult` para montagem do candidato sistemico.
- 2026-03-19 - Decisao: expor o resultado da publicacao como entidade propria no summary do `/run_specs`, fora de `specTicketValidation`.
  - Motivo: o closure criterion do ticket exige distinguir observavelmente analise, hipotese sem ticket, ticket publicado/reutilizado e limitacao operacional nao bloqueante.
  - Impacto: `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e testes associados precisarao carregar um campo proprio de publication.
- 2026-03-19 - Decisao: preservar a estrategia atual de deduplicacao por `Source spec` + overlap de fingerprints no publisher, sem introduzir segunda heuristica de reuso.
  - Motivo: isso ja existe, esta testado e atende RF-23/CA-16; o risco maior aqui e reconectar a chamada no estagio certo.
  - Impacto: a execucao deve preferir adaptar o shape do candidato e os testes, nao reescrever o algoritmo de reuso.
- 2026-03-19 - Decisao: validar a garantia cross-repo com testes de estado observavel do filesystem e dos stubs de git, em vez de depender de remotos reais.
  - Motivo: RF-26/RF-27/CA-11 falam sobre ausencia de alteracao/commit/push no projeto externo e destino correto do publish, algo que pode ser provado por repositorios temporarios e dublos controlados.
  - Impacto: a matriz de validacao prioriza `tsx --test` e asserts sobre caminhos, commits e arquivos escritos.
- 2026-03-19 - Decisao: manter `workflow-ticket-publication` sem uma trilha separada em `WorkflowTraceStage` nesta etapa e expor o resultado via `RunSpecsFlowSummary` + logs estruturados.
  - Motivo: o trace persistido do stage continua pertencendo a `spec-workflow-retrospective`, enquanto o closure criterion exigido pelo ticket ja fica atendido com logs e resumo final distintos.
  - Impacto: a mudanca permanece focada no contrato do runner/publisher/Telegram sem ampliar o schema da trilha persistida.

## Outcomes & Retrospective
- Status final: execucao concluida, validada e fechada como `GO` nesta etapa.
- O que funcionou: o runner passou a publicar a partir de `publicationHandoff`, o publisher preservou reuso/deduplicacao cross-repo e o resumo final agora distingue analise sistemica de publication.
- O que ficou pendente: rodada manual real em ambiente externo/same-repo continua pendente como validacao operacional externa e nao bloqueante.
- Proximos passos: o runner deve apenas versionar o mesmo changeset de fechamento; nao ha follow-up tecnico aberto para este ticket.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/git-client.ts`
  - `prompts/08-auditar-spec-apos-run-all.md`
- Spec de origem: `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
- RFs/CAs cobertos por este plano:
  - RF-19, RF-20, RF-21, RF-22, RF-23
  - RF-25, RF-26, RF-27, RF-29, RF-30
  - CA-10, CA-11, CA-12, CA-13, CA-16
- Assumptions / defaults adotados:
  - `workflow-ticket-publication` continua sendo a segunda subetapa canonica de `spec-workflow-retrospective`;
  - o runner deve chamar o publisher no maximo uma vez por rodada de `/run_specs`, somente quando `workflowGapAnalysis.publicationEligibility === true` e houver `publicationHandoff`;
  - o resultado da publicacao sera exposto em `RunSpecsFlowSummary` como entidade propria, em vez de voltar para `specTicketValidation` ou ser escondido dentro de `workflowGapAnalysis`;
  - a estrategia canonica de destino permanece: projeto atual se `activeProjectName === "codex-flow-runner"`, senão `../codex-flow-runner`;
  - `not-needed` continua sendo um resultado valido do publisher, mas a ausencia de ticket automatico por `medium`/`low` confidence continua sendo comunicada por `workflowGapAnalysis`, sem acionar publication;
  - a garantia de “nao alterar o projeto externo” sera tratada como contrato do runner + publisher + testes de filesystem/stubs, nao como regra implícita do prompt de `spec-audit`.
- Fluxo atual observado:
  - `workflow-gap-analysis` ja existe e pode produzir `publicationHandoff`, mas o runner ainda chama `publishWorkflowImprovementTicketIfNeeded(...)` com base em `SpecTicketValidationResult`.
  - o publisher ja sabe escrever em `tickets/open/`, deduplicar ticket equivalente aberto e fazer commit/push no repo alvo via `GitCliVersioning`.
  - o resumo do Telegram ja mostra `workflowGapAnalysis`, mas ainda nao mostra de forma dedicada o resultado de publication/reuso/limitacao.
- Restricoes tecnicas:
  - manter fluxo sequencial, sem paralelizar tickets ou etapas da retrospectiva;
  - evitar qualquer commit/push no projeto auditado quando ele for externo;
  - preservar o comportamento nao bloqueante da retrospectiva se o repo alvo estiver ausente, inacessivel ou falhar no publish;
  - repetir `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` em todo comando `node`, `npm` ou `npx` da execucao futura deste plano.

## Plan of Work
- Milestone 1 - Desacoplar a origem da publication do gate pre-`/run-all`
  - Entregavel: o runner deixa de montar o candidato sistemico a partir de `SpecTicketValidationResult` e passa a acionar `workflow-ticket-publication` exclusivamente com o handoff produzido por `workflow-gap-analysis`.
  - Evidencia de conclusao: nao ha mais wiring funcional de publication sob `specTicketValidation`; testes de runner provam que o publish so ocorre em `spec-workflow-retrospective` com `publicationEligibility=true`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/types/workflow-improvement-ticket.ts`.
- Milestone 2 - Adaptar o contrato do publisher para o handoff pos-auditoria
  - Entregavel: o shape de `WorkflowImprovementTicketCandidate` e/ou o adaptador que o constroi passa a nascer do handoff da retrospectiva, mantendo destino cross-repo, reuso por fingerprints e limite de 1 ticket por rodada.
  - Evidencia de conclusao: a suite do publisher segue verde com o novo contrato e cobre publish no repo atual, publish no repo irmao, reuso e limitacoes operacionais.
  - Arquivos esperados: `src/types/workflow-improvement-ticket.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts`.
- Milestone 3 - Tornar o resultado de publication observavel no fluxo
  - Entregavel: o `/run_specs` passa a carregar um resultado proprio de `workflow-ticket-publication` em summary/logs/Telegram, distinguindo ticket publicado/reutilizado, hipotese sem ticket e limitacao operacional.
  - Evidencia de conclusao: `RunSpecsFlowSummary`, logs do runner e resumo do Telegram exibem estados diferentes para `workflowGapAnalysis` e publication, sem regressar o acoplamento ao gate `spec-ticket-validation`.
  - Arquivos esperados: `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, possivelmente `src/integrations/workflow-trace-store.ts` e testes associados.
- Milestone 4 - Garantir o contrato cross-repo nao bloqueante
  - Entregavel: os testes demonstram que, em projeto externo, a retrospectiva nao altera a spec nem produz commit/push no repo auditado; se o publish der certo, a atividade de git ocorre apenas no `codex-flow-runner`.
  - Evidencia de conclusao: testes verdes em temp repos e auditoria final do diff mostram ausencia de alteracao no repo externo e destino correto do ticket/commit.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/integrations/telegram-bot.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "publishWorkflowImprovementTicketIfNeeded|buildWorkflowImprovementTicketCandidate|publicationHandoff|workflowImprovementTicket|workflowGapAnalysis" src/core/runner.ts src/types/workflow-improvement-ticket.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts` para confirmar todos os pontos de acoplamento que ainda ligam publication ao gate antigo.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/workflow-improvement-ticket.ts` para alinhar o contrato do candidato/publication com o handoff de `workflow-gap-analysis`, mantendo apenas os campos realmente necessarios para renderizar o ticket, deduplicar e registrar o resultado observavel.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para:
   - remover o gatilho de publication baseado em `SpecTicketValidationResult`;
   - acionar o publisher somente dentro de `spec-workflow-retrospective`, a partir de `workflowGapAnalysis.publicationHandoff`;
   - garantir no maximo uma chamada por rodada;
   - promover falhas tecnicas para `operational-limitation` sem quebrar o `/run_specs`;
   - carregar o resultado da publication no summary final.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-improvement-ticket-publisher.ts` para adaptar a construcao do ticket transversal ao novo contrato do handoff, preservando:
   - `current-project` vs. `workflow-sibling`;
   - deduplicacao por `Source spec` + overlap de fingerprints;
   - `created-and-pushed`, `reused-open-ticket`, `not-needed` e `operational-limitation`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts` e, se necessario, `src/integrations/workflow-trace-store.ts` para expor o resultado de publication como entidade propria do `/run_specs`, distinta de `workflowGapAnalysis` e de `specTicketValidation`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/integrations/telegram-bot.test.ts` e outros testes diretamente afetados para cobrir:
   - `high confidence` com publish no repo atual;
   - `high confidence` com publish/reuso em `../codex-flow-runner`;
   - hipotese sistemica sem ticket automatico;
   - limitacao operacional nao bloqueante;
   - ausencia de alteracao/commit/push no projeto externo.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/telegram-bot.test.ts` para validar diretamente os cenarios observaveis ligados aos closure criteria.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar propagacao correta dos tipos e unions do novo summary de publication.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir que o wiring completo do runner e do publisher continua compilando.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-improvement-ticket-publisher.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/telegram-bot.test.ts` para auditoria final do escopo tocado.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-19, RF-20, RF-21, RF-22, RF-23; CA-10, CA-12, CA-16
    - Evidencia observavel: `workflow-ticket-publication` cria ou reutiliza no maximo 1 ticket transversal agregado por rodada auditada, usando o repo atual quando o projeto ativo for `codex-flow-runner` e `../codex-flow-runner` quando o projeto ativo for externo, preservando deduplicacao/reuso de ticket equivalente aberto.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts`
    - Esperado: testes verdes cobrindo publish no repo atual, publish no repo irmao, reuso por overlap de fingerprints e ausencia de multiplas publicacoes para a mesma rodada.
    - Comando: `rg -n "publicationHandoff|reused-open-ticket|created-and-pushed|workflow-sibling|current-project|Systemic gap fingerprints" src/core/runner.ts src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts`
    - Esperado: o wiring aponta para `publicationHandoff`, e o publisher continua declarando os estados/dados usados para destino cross-repo e deduplicacao.
  - Requisito: RF-25, RF-29, RF-30; CA-10, CA-13, CA-16
    - Evidencia observavel: o trace/log e o resumo final de `/run_specs` distinguem a retrospectiva sistemica, o ticket transversal publicado/reutilizado, a hipotese sem ticket automatico e a limitacao operacional nao bloqueante de publication.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes com asserts separados para `workflowGapAnalysis` e para o resultado de publication, incluindo cenarios `reused-open-ticket`, `created-and-pushed`, hipotese sem ticket e `operational-limitation`.
    - Comando: `rg -n "workflowGapAnalysis|workflowImprovementTicket|Retrospectiva sistemica|ticket transversal|Limitacao" src/types/flow-timing.ts src/core/runner.ts src/integrations/telegram-bot.ts`
    - Esperado: summary e renderizacao do Telegram possuem campos/linhas distintas para analise sistemica e publicacao do ticket transversal.
  - Requisito: RF-26, RF-27; CA-11
    - Evidencia observavel: em projeto externo, a retrospectiva nao altera a spec nem faz commit/push no projeto corrente; quando houver publicacao bem-sucedida, o unico commit/push adicional ocorre no `codex-flow-runner`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts`
    - Esperado: testes verdes com fixtures de repositorio temporario provando que o ticket nasce em `../codex-flow-runner`, que o repo externo nao ganha arquivo/commit da retrospectiva e que o stub de git registra publish apenas no repo alvo.
    - Comando: `git diff -- src/core/runner.ts src/integrations/workflow-improvement-ticket-publisher.ts src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts`
    - Esperado: o diff final nao mostra nenhuma escrita planejada na spec do projeto auditado nem qualquer wiring para commit/push do repo externo durante `spec-workflow-retrospective`.
- Validacao estrutural complementar:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde com o novo summary e o novo contrato do candidato/publication propagados pelo fluxo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: build verde do runner sem regressao no wiring da retrospectiva.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a implementacao nao deve recolocar publication dentro de `specTicketValidation` nem duplicar campos no summary final;
  - reexecutar os testes do publisher nao deve criar mais de um ticket para o mesmo cenario fixture quando o overlap de fingerprints ja existir;
  - reruns do `/run_specs` para a mesma spec devem continuar convergindo em `reused-open-ticket` quando o ticket transversal equivalente ja estiver aberto.
- Riscos:
  - adaptar o tipo do candidato sem cuidado pode quebrar a renderizacao atual do ticket ou perder campos hoje usados pelo publisher para metadados;
  - mover o resultado de publication para o summary final pode criar duplicidade ou inconsistência temporaria com o bloco da analise sistemica no Telegram;
  - testes de cross-repo insuficientes podem mascarar escrita acidental no projeto externo.
- Recovery / Rollback:
  - se a adaptacao do contrato do candidato introduzir ambiguidade, criar um adaptador minimo entre `publicationHandoff` e o publisher antes de simplificar tipos compartilhados;
  - se a exposicao do resultado no summary conflitar com consumidores atuais, introduzir o novo campo mantendo compatibilidade temporaria interna, removendo o acoplamento antigo apenas depois dos testes verdes;
  - se o cenario cross-repo ficar instavel, priorizar asserts de destino do filesystem e do stub de git antes de tentar validacao manual mais ampla.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
- ExecPlans correlatos consultados:
  - `execplans/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md`
  - `execplans/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md`
- Artefatos de codigo/referencia consultados:
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/git-client.ts`
- Checklist aplicado no planejamento (`docs/workflows/codex-quality-gates.md`):
  - ticket inteiro e referencias obrigatorias lidos antes de planejar;
  - spec de origem, RFs/CAs e assumptions/defaults explicitados;
  - closure criteria traduzidos para matriz `requisito -> validacao observavel`;
  - riscos residuais, limites e dependencias declarados.
- Nota de desenho:
  - toda validacao deste plano deriva diretamente dos 3 closure criteria do ticket; o checklist compartilhado foi usado apenas como gate de completude do plano.
- Nota de implementacao:
  - sempre que a execucao usar `node`, `npm` ou `npx`, repetir no mesmo comando o prefixo `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.
  - comandos executados nesta etapa:
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/telegram-bot.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `WorkflowImprovementTicketCandidate` e possiveis helpers/adaptadores em `src/types/workflow-improvement-ticket.ts`;
  - wiring do runner que decide quando publicar e como serializar o resultado da publication;
  - `RunSpecsFlowSummary` em `src/types/flow-timing.ts`;
  - renderizacao do resumo final em `src/integrations/telegram-bot.ts`;
  - suite de testes do publisher e do runner para cross-repo e nao-bloqueio.
- Compatibilidade:
  - `workflow-gap-analysis` continua sendo a etapa que decide elegibilidade; `workflow-ticket-publication` apenas consome esse resultado;
  - o publisher continua reutilizando `GitCliVersioning.commitAndPushPaths(...)`, preservando o contrato atual de commit/push no repo alvo;
  - `spec-ticket-validation` continua como gate pre-`/run-all`, mas deixa de ser a origem semantica e operacional do backlog sistemico pos-auditoria.
- Dependencias e acoplamentos relevantes:
  - `src/core/runner.ts` para acionar publication uma unica vez e carregar o resultado no summary;
  - `src/integrations/workflow-improvement-ticket-publisher.ts` para resolver repo alvo, deduplicar e publicar;
  - `src/integrations/git-client.ts` para o commit/push dedicado no repo destino;
  - `src/integrations/telegram-bot.ts` para a legibilidade final de `/run_specs`;
  - `src/core/runner.test.ts` e `src/integrations/workflow-improvement-ticket-publisher.test.ts` como evidencias principais dos requisitos cross-repo e nao bloqueantes.
- Estado final esperado das dependencias:
  - a publication transversal passa a nascer de `spec-workflow-retrospective`, nao mais de `spec-ticket-validation`;
  - o summary do `/run_specs` distingue analise causal e publicacao efetiva;
  - o projeto auditado externo permanece intocado pela retrospectiva, enquanto o `codex-flow-runner` recebe o ticket/commit quando cabivel.
