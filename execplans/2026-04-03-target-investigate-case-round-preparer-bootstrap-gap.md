# ExecPlan - Ligar o materializador oficial da rodada do /target_investigate_case

## Purpose / Big Picture
- Objetivo: ligar ao bootstrap do runner um `TargetInvestigateCaseRoundPreparer` oficial que consuma a capability `case-investigation` do projeto alvo, materialize uma rodada real não bloqueada e entregue os artefatos mínimos para o pipeline já existente de avaliação, publication, trace e resumo final.
- Resultado esperado:
  - `src/main.ts` deixa de instanciar `ControlledTargetInvestigateCaseExecutor` sem `roundPreparer`;
  - o fluxo deixa de bloquear em `reason: "round-preparer-unavailable"` e passa a produzir `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json` em `investigations/<round-id>/`;
  - o bootstrap continua reutilizando `src/core/target-investigate-case.ts` como source of truth para parser, avaliação runner-side, matriz de publication, summary e trace;
  - a integração com o projeto alvo continua guiada apenas pelo manifesto e pelos artefatos operacionais declarados, sem descoberta livre por IA de logs, comandos, buckets ou superfícies fora da capability;
  - existe validação automatizada dos caminhos `no-op`, publication positiva e cancelamento no flow materializado, além de uma rodada real redigida com resumo final do Telegram e trace minimizado sem material sensível.
- Escopo:
  - materializador oficial da rodada e seu publisher opcional de ticket;
  - reconciliação local, no runner, entre o shape real do manifesto `case-investigation` do projeto alvo e o shape interno já consumido por `evaluateTargetInvestigateCaseRound(...)`;
  - prompt/cliente/integração necessários para a materialização dirigida da rodada no projeto alvo;
  - wiring do bootstrap em `src/main.ts` e cobertura automatizada/manual da rodada real.
- Fora de escopo:
  - reabrir o control-plane de `/target_investigate_case`, comandos `/_status` e `/_cancel`, milestones públicos, traces ou summaries fora do que já foi entregue no ticket fechado de control-plane;
  - alterar a capability do piloto `../guiadomus-matricula/**`, salvo descoberta inequívoca de um blocker contratual que não possa ser absorvido localmente no runner;
  - criar parser, gates, publication ou summary paralelos ao módulo `src/core/target-investigate-case.ts`;
  - descoberta semântica ad hoc de domínio pelo runner.

## Progress
- [x] 2026-04-03 19:24Z - Planejamento inicial concluído com leitura integral do ticket aberto, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, dos tickets/execplans relacionados, do bootstrap atual, do executor `target-investigate-case`, do manifesto/runbook do piloto e das superfícies de trace/Telegram.
- [x] 2026-04-03 20:05Z - Compatibilidade runner <-> manifesto real do projeto alvo reconciliada localmente via normalização do loader, preservando as allowlists explícitas do piloto (`propertyId|requestId|workflow|window|runArtifact`, `propertyId|pdfFileName|matriculaNumber|transcriptHint`, workflows investigáveis e `versionedArtifactsDefault=["ticket"]`) sem reabrir `../guiadomus-matricula/**`.
- [x] 2026-04-03 20:05Z - `TargetInvestigateCaseRoundPreparer` oficial implementado em `src/integrations/target-investigate-case-round-preparer.ts`, com publisher opcional runner-side em `src/integrations/target-investigate-case-ticket-publisher.ts`, prompt novo em `prompts/16-target-investigate-case-round-materialization.md` e wiring no bootstrap de `src/main.ts`.
- [x] 2026-04-03 20:05Z - Matriz automatizada do ticket executada com suites verdes: `npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts`, `npm run check` e `node --test tests/scripts/target-case-investigation-capability.test.js`.
- [x] 2026-04-03 20:13Z - Fechamento técnico revalidado como `GO` com validação manual externa pendente; o ticket foi encerrado sem follow-up local novo porque o remanescente depende apenas de operador/ambiente externos.
- [ ] 2026-04-03 20:05Z - Rodada real redigida em projeto alvo elegível validada com resumo final do Telegram e trace minimizado.
  - Blocker: esta etapa proíbe commit/push e o shell não consegue acionar uma conversa Telegram autorizada como operador humano; sem um caso previamente aprovado e garantidamente `no-op`, uma rodada real integrada ainda pode cruzar a fronteira de publication no projeto alvo. A capability do piloto e o dossier histórico `output/case-investigation/case_inv_pilot_20260403_183200/` foram revalidados, mas a validação manual ponta a ponta via Telegram ficou pendente.

## Surprises & Discoveries
- 2026-04-03 19:24Z - O executor já está pronto para consumir um `roundPreparer`: ele cria `investigations/<round-id>/`, emite os cinco milestones externos e cruza a fronteira de versionamento apenas dentro de `publication`; o bloqueio atual é exclusivamente a ausência dessa dependência no bootstrap.
- 2026-04-03 19:24Z - O manifesto real publicado no piloto `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json` é mais rico e tem shape diferente do schema interno atual do runner (`capability` objeto vs. string, `investigableWorkflows` vs. `workflows.investigable`, `dossier`/`ticketPublicationPolicy` vs. `dossierPolicy`/`publicationPolicy`). Sem uma normalização local no runner, o fluxo tende a bloquear em `manifest-invalid` antes mesmo de chegar ao `roundPreparer`.
- 2026-04-03 19:24Z - Hoje só existem dublês de `TargetInvestigateCaseRoundPreparer` nos testes; não há integração concreta em `src/integrations/` nem publisher real de ticket causal para `case-investigation`.
- 2026-04-03 19:24Z - `FileSystemWorkflowTraceStore` persiste `aiExchanges.promptText` e `aiExchanges.outputText` integralmente. Se o materializador usar Codex no projeto alvo, registrar prompt/resposta brutos nessa trilha pode vazar `workflow_debug`, `db_payload`, transcript ou payloads do caso.
- 2026-04-03 19:24Z - A capability do piloto já declara allowlists finitas úteis para este ticket: selectors aceitos `propertyId`, `requestId`, `workflow`, `window`, `runArtifact`; identificadores de purge `propertyId`, `pdfFileName`, `matriculaNumber`, `transcriptHint`; template de ticket causal e `versionedArtifactsDefault=["ticket"]`.
- 2026-04-03 20:05Z - O roteiro manual anterior do piloto deixou apenas artefatos em `output/case-investigation/case_inv_pilot_20260403_183200/`; não existia ainda nenhuma árvore `investigations/<round-id>/` materializada pelo runner, o que confirmou que o gap de bootstrap era real e não apenas falta de documentação.
- 2026-04-03 20:05Z - O script `npm test -- ...` continua expandindo `tsx --test src/**/*.test.ts ...`, então a matriz pedida pelo plano acabou validando o repositório inteiro além das suites alvo. O resultado permaneceu verde (`565` testes `pass`), o que aumenta a confiança de não regressão do wiring novo.

## Decision Log
- 2026-04-03 - Decisão: manter `src/core/target-investigate-case.ts` como source of truth de parser, avaliação, publication, summary e trace; o `roundPreparer` oficial só deve materializar artefatos e opcionalmente fornecer `ticketPublisher`.
  - Motivo: o ticket veta parser/gates/publication paralelos e a linhagem já fechou ownership dessas superfícies.
  - Impacto: qualquer adaptação de manifesto ou publisher precisa convergir para os tipos e funções já existentes, não substituí-los.
- 2026-04-03 - Decisão: absorver localmente no runner a divergência entre o manifesto rico do projeto alvo e o schema interno já publicado, via normalização/adaptação no loader, em vez de reabrir o ticket do piloto por default.
  - Motivo: o ticket atual é `local` ao runner, e a capability do piloto já foi fechada como pronta para consumo.
  - Impacto: o primeiro milestone deste plano precisa provar que o runner aceita o manifesto efetivamente versionado pelo projeto alvo elegível.
- 2026-04-03 - Decisão: introduzir uma integração dedicada para materialização de rodada, com prompt/cliente próprios do fluxo, em vez de embutir shell ad hoc em `main.ts`.
  - Motivo: `target_prepare`, `target_checkup` e `target_derive_gaps` já seguem esse padrão; repetir o desenho reduz drift operacional e facilita testes.
  - Impacto: é esperado tocar `src/integrations/codex-client.ts`, adicionar um prompt novo e criar pelo menos uma integração nova em `src/integrations/`.
- 2026-04-03 - Decisão: a trilha `aiExchanges` do flow deve ser omitida ou redigida para este fluxo quando a materialização envolver payloads sensíveis do caso.
  - Motivo: o trace store persiste prompt/output text integralmente, o que conflita com RF-40/RF-41 e CA-11.
  - Impacto: o plano precisa tornar explícito se o `roundPreparer` não emitirá `onAiExchange` ou se emitirá apenas um resumo seguro.
- 2026-04-03 - Decisão: a rodada manual real deve priorizar um caso seguro que termine em `no-op` ou `not_eligible`, deixando a publication positiva como prova automatizada por teste, salvo existência de fixture positiva previamente aprovada.
  - Motivo: o closure criterion exige uma rodada real não bloqueada com resumo/trace redigidos, mas não exige que essa rodada manual publique ticket.
  - Impacto: o fluxo manual pode validar materialização, replay/purge e sanitização sem forçar write-back real no projeto alvo.
- 2026-04-03 - Decisão: não registrar `onAiExchange` no flow `target-investigate-case` enquanto a materialização depender de prompts com payload potencialmente sensível do caso.
  - Motivo: `FileSystemWorkflowTraceStore` persiste prompt/output integralmente e o ticket exige que `workflow_debug`, `db_payload`, transcript e payload bruto permaneçam fora do trace do runner.
  - Impacto: o trace final do flow continua com milestones, artefatos, vereditos, decisão final e paths mínimos, sem prompt/resposta brutos do Codex.
- 2026-04-03 - Decisão: o publisher runner-side reutiliza o template interno do projeto alvo apenas como contrato estrutural e publica um ticket determinístico/idempotente baseado em `case-ref` + `suggested_title`.
  - Motivo: o template atual não expõe placeholders programáticos, mas a spec exige heading/ordem estáveis, `versionedArtifactsDefault=["ticket"]` e ausência de ticket duplicado em reruns.
  - Impacto: a publication positiva continua limitada ao ticket, com busca prévia em `tickets/open|closed/` antes de criar um novo arquivo e commit/push dedicado apenas para esse path.
- 2026-04-03 - Decisão: tratar a rodada manual real ponta a ponta como blocker explícito desta etapa, em vez de forçar uma execução integrada potencialmente publicadora.
  - Motivo: a etapa atual proíbe commit/push e o shell não consegue operar como o usuário autorizado do Telegram; sem um caso previamente aprovado e garantidamente `no-op`, a validação manual ainda pode cruzar a fronteira de publication do projeto alvo.
  - Impacto: esta execução encerra com implementação local completa, matriz automatizada verde e blocker objetivo registrado para a validação manual externa.

## Outcomes & Retrospective
- Status final: implementação concluída com validação automatizada e revalidação da capability do piloto; validação manual ponta a ponta via Telegram ficou bloqueada nesta etapa.
- O que precisa existir ao final:
  - um `roundPreparer` oficial injetado no bootstrap do runner;
  - compatibilidade comprovada com o manifesto real do projeto alvo elegível;
  - materialização canônica dos cinco artefatos mínimos sob `investigations/<round-id>/`;
  - publisher opcional de ticket que respeite `versioned_artifact_paths` restrito ao ticket e a fronteira de `publication`;
  - cobertura automatizada dos caminhos `no-op`, publication positiva, cancelamento antes/depois da fronteira e bloqueios do manifesto;
  - registro manual redigido de uma rodada real com resumo final do Telegram e trace minimizado.
- O que fica pendente fora deste plano:
  - executar uma rodada manual real via Telegram autorizado em caso previamente aprovado como seguro para esta etapa, registrando resumo final e trace minimizado sem commit/push indevido;
  - qualquer evolução adicional da capability do piloto fora de blockers objetivos encontrados durante a integração;
  - mudanças em tickets/specs não relacionadas a `target-investigate-case`;
  - apenas commit/push e publicação final deste changeset, que pertencem à etapa posterior do fluxo executada pelo runner.
- Próximos passos:
  - usar o fluxo já implementado para uma rodada manual `no-op` ou `not_eligible` em Telegram assim que houver operador autorizado e caso seguro aprovado;
  - após essa rodada, registrar a evidência manual redigida no ticket fechado e na spec, sem reabrir follow-up automático se o comportamento técnico permanecer conforme;
  - seguir para a etapa posterior de versionamento/commit deste changeset pelo runner; a validação manual residual permanece como anotação operacional já registrada.

## Context and Orientation
- Ticket de origem:
  - `tickets/closed/2026-04-03-target-investigate-case-round-preparer-bootstrap-gap.md`
- Spec de origem:
  - `docs/history/target-investigate-case/2026-04-03-pre-v2-foundation.md`
- Tickets/planos relidos para fronteira de ownership:
  - `tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
  - `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md`
  - `tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md`
  - `tickets/closed/2026-04-03-target-investigate-case-pilot-capability-gap.md`
  - `execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
  - `execplans/2026-04-03-target-investigate-case-runner-control-plane-gap.md`
  - `execplans/2026-04-03-target-investigate-case-pilot-capability-gap.md`
- Superfícies de código diretamente relevantes:
  - `src/main.ts`
  - `src/core/target-investigate-case.ts`
  - `src/types/target-investigate-case.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/git-client.ts`
  - `src/integrations/target-project-resolver.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts` como referência de publisher/versionamento
- Superfícies externas necessárias para a rodada real:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-causal-ticket-template.md`
  - `../guiadomus-matricula/tickets/templates/internal-ticket-template.md`
  - `../guiadomus-matricula/tests/scripts/target-case-investigation-capability.test.js`
- RFs/CAs cobertos por este plano:
  - RF-12
  - RF-22
  - RF-23
  - RF-24
  - RF-25
  - RF-26
  - RF-36
  - RF-37
  - RF-38
  - RF-39
  - RF-40
  - RF-41
  - RF-42
  - CA-05
  - CA-07
  - CA-08
  - CA-09
  - CA-10
  - CA-11
  - CA-12
  - CA-15
  - CA-16
- RNFs e restrições herdados que condicionam implementação e aceite:
  - fluxo sequencial, sem paralelização de tickets;
  - coleta determinística guiada por manifesto;
  - o runner não pode depender de descoberta livre por IA de logs, comandos ou fontes de evidência fora da capability;
  - o runner continua como autoridade final de `publication_status` e `overall_outcome`;
  - o projeto alvo continua como autoridade semântica do caso;
  - o trace do runner não pode copiar `workflow_debug`, `db_payload`, transcript ou payload bruto;
  - o artefato versionado padrão de v1 continua sendo apenas o ticket quando houver publication elegível.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - o control-plane já fechado em `runner`/`Telegram` permanece estável; este ticket não recria comandos nem milestones públicos;
  - a divergência de shape entre o manifesto do piloto e o schema interno atual será resolvida no runner por adaptação/normalização, não por edição retroativa do piloto, salvo blocker incontornável;
  - o `roundPreparer` materializa os artefatos canônicos em `investigations/<round-id>/` e pode usar o namespace bruto da capability (`output/case-investigation/<request-id>/`) apenas como fonte/dossier local referenciado;
  - `dossier.md` é o default de v1; `dossier.json` continua aceito quando `local_path` coincidir exatamente com o caminho efetivo do artefato canônico;
  - a publication positiva real em ambiente manual não é obrigatória para o aceite deste ticket se os testes cobrirem o caminho e a rodada real segura for `no-op` ou `not_eligible`;
  - se a materialização usar Codex no projeto alvo, a trilha `aiExchanges` do runner deverá ser omitida ou redigida, nunca persistida em bruto.
- Allowlists / enumerações finitas relevantes herdadas deste ticket/spec:
  - artefatos mínimos obrigatórios do flow:
    - `case-resolution.json`
    - `evidence-bundle.json`
    - `assessment.json`
    - `publication-decision.json`
    - `dossier.md|dossier.json`
  - milestones externos obrigatórios:
    - `preflight`
    - `case-resolution`
    - `evidence-collection`
    - `assessment`
    - `publication`
  - bloqueio atual a eliminar:
    - `round-preparer-unavailable`
  - comando canônico do flow:
    - `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`
- Allowlists finitas do projeto alvo relevantes para esta integração:
  - selectors aceitos do piloto:
    - `propertyId`
    - `requestId`
    - `workflow`
    - `window`
    - `runArtifact`
  - identificadores aceitos para purge scoped no piloto:
    - `propertyId`
    - `pdfFileName`
    - `matriculaNumber`
    - `transcriptHint`
  - workflows investigáveis declarados no piloto:
    - `extract_address`
    - `extract_condominium_info`
    - `extract_inscricao_municipal`
    - `extract_matricula_risks_v2`
    - `extract_unit_description_structured_v1`
    - `extract_value_timeline_v1`
    - `extract_construction_timeline_v1`
- Consolidações explicitamente aceitas neste plano:
  - a execução manual real não repetirá os sete workflows do piloto ponta a ponta; a justificativa objetiva é que o risco específico deste ticket está em ingestão do manifesto, materialização da rodada, publisher e sanitização runner-side, enquanto a cobertura positiva da allowlist inteira já existe no teste do piloto `tests/scripts/target-case-investigation-capability.test.js`;
  - para compensar essa consolidação, os testes locais do runner deverão validar a importação completa da allowlist do manifesto, um workflow aceito representativo e um workflow fora do conjunto, com rejeição observável.
- Fronteira de ownership deste plano:
  - este ticket cobre bootstrap, materializador oficial, publisher opcional, compatibilidade local com a capability e validação real da rodada;
  - `tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md` permanece dono de comandos, status, cancelamento, milestones públicos, summary operacional e trace store do flow;
  - `tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md` continua dono da matriz de publication, parser, summary e trace payload já existentes;
  - `tickets/closed/2026-04-03-target-investigate-case-pilot-capability-gap.md` continua dono da capability do piloto, do runbook local, da policy de replay/purge e do template `## Investigação Causal`.

## Plan of Work
- Milestone 1: reconciliar o contrato que o runner realmente consome na borda do projeto alvo.
  - Entregável: loader/normalizador do manifesto do projeto alvo compatível com o shape rico efetivamente publicado no piloto, sem quebrar `evaluateTargetInvestigateCaseRound(...)`.
  - Evidência de conclusão: o manifesto real de `../guiadomus-matricula` deixa de falhar no preflight do runner; testes positivos/negativos cobrem manifesto válido, shape divergente, workflow fora da allowlist e campos obrigatórios ausentes.
  - Arquivos esperados:
    - `src/types/target-investigate-case.ts`
    - `src/core/target-investigate-case.ts`
    - `src/core/target-investigate-case.test.ts`
- Milestone 2: materializar a rodada real do caso de forma guiada pelo manifesto e pronta para publication.
  - Entregável: integração oficial de `roundPreparer` que, a partir do comando canônico e do manifesto do projeto alvo, produz os artefatos canônicos em `investigations/<round-id>/` e entrega um `ticketPublisher` quando houver publication elegível.
  - Evidência de conclusão: existe integração concreta em `src/integrations/` e/ou extensão do cliente Codex com prompt dedicado; testes cobrem materialização de `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `dossier.md|dossier.json` e o caminho `ticket-publisher-missing` deixa de ocorrer quando o publisher estiver configurado.
  - Arquivos esperados:
    - `src/integrations/target-investigate-case-round-preparer.ts`
    - `src/integrations/target-investigate-case-ticket-publisher.ts` ou equivalente
    - `src/integrations/codex-client.ts`
    - `prompts/16-target-investigate-case-round-materialization.md`
    - testes novos em `src/integrations/`
- Milestone 3: ligar o bootstrap e preservar a fronteira de publication/trace.
  - Entregável: `src/main.ts` injeta o preparer oficial; o flow real segue usando o executor/evaluator já entregues; o trace e o summary continuam mínimos e sem vazamento de payload sensível.
  - Evidência de conclusão: `/target_investigate_case` deixa de bloquear no bootstrap, os testes do flow continuam verdes e nenhuma trilha do runner persiste `workflow_debug`, `db_payload`, transcript ou payload bruto.
  - Arquivos esperados:
    - `src/main.ts`
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `src/integrations/workflow-trace-store.test.ts`
- Milestone 4: validar o fluxo real com uma rodada representativa e registrar evidência redigida.
  - Entregável: matriz automatizada do ticket executada, capability do piloto revalidada e uma rodada real segura documentada com resumo final do Telegram, trace minimizado e paths dos artefatos.
  - Evidência de conclusão: suites verdes, serviços sobem, o operador executa uma rodada real não bloqueada e registra no ExecPlan/ticket o resultado redigido, incluindo se houve replay/purge seguro e quais ajustes foram necessários.
  - Arquivos esperados:
    - este ExecPlan atualizado em `Progress`, `Surprises & Discoveries` e `Decision Log`
    - ticket aberto correspondente atualizado com a validação manual redigida antes do fechamento

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "roundPreparer|TargetInvestigateCaseRoundPreparer|manifest-invalid|round-preparer-unavailable|ticket-publisher-missing" src/main.ts src/core/target-investigate-case.ts src/types/target-investigate-case.ts` para reconfirmar os bloqueios e a superfície exata antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir com `sed -n '1,260p'` o ticket atual, a spec de origem, `src/main.ts`, `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, `src/integrations/codex-client.ts`, `src/integrations/workflow-trace-store.ts` e os arquivos do piloto (`../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`, `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md`, `../guiadomus-matricula/tickets/templates/internal-ticket-template.md`) imediatamente antes de aplicar patches.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.ts` para introduzir:
   - um schema bruto do manifesto realmente publicado pelo projeto alvo;
   - um normalizador desse manifesto para o shape interno já consumido por `loadTargetInvestigateCaseManifest(...)`, `validateInputAgainstManifest(...)` e `buildPublicationDecision(...)`;
   - cobertura positiva dos membros explícitos herdados do piloto e rejeição objetiva fora do conjunto.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Estender `src/integrations/codex-client.ts` com um request/result/client específicos para materialização da rodada de `target-investigate-case`, seguindo o mesmo padrão de `runTargetPrepare`, `runTargetCheckup` e `runTargetDeriveGapAnalysis`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `prompts/16-target-investigate-case-round-materialization.md` instruindo o Codex no projeto alvo a:
   - consumir somente o manifesto e o runbook declarados;
   - resolver `case-ref` sem adivinhar tentativa;
   - usar apenas selectors e estratégias permitidos;
   - declarar replay/purge apenas quando permitido e com `updateDb=false`, `x-request-id` dedicado e `dryRun` antes de purge efetivo;
   - gravar os artefatos canônicos da rodada exatamente em `investigations/<round-id>/`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/target-investigate-case-round-preparer.ts` para:
   - montar o request do materializador a partir do comando canônico normalizado e do manifesto já normalizado;
   - disparar a materialização no projeto alvo via integração oficial;
   - validar a presença/coerência dos artefatos canônicos antes de devolver `status: "prepared"`;
   - escolher `dossier.md` ou `dossier.json` de forma explícita;
   - devolver um `ticketPublisher` opcional quando a capability suportar publication via template interno.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/target-investigate-case-ticket-publisher.ts` ou equivalente para publicar ticket elegível usando:
   - o template interno do projeto alvo e o bloco `## Investigação Causal` declarados no manifesto;
   - `GitCliVersioning` para versionar apenas o ticket;
   - a fronteira de authority já declarada (`semanticAuthority=target-project`, `finalPublicationAuthority=runner`).
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/main.ts` para injetar o preparer oficial no `ControlledTargetInvestigateCaseExecutor`, reaproveitando factories já existentes de `CodexCliTicketFlowClient`, `GitCliVersioning` e `FileSystemTargetProjectResolver`, sem tocar o control-plane do flow.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rever o tratamento de `onAiExchange` para `target-investigate-case`: se a materialização passar payloads sensíveis pelo Codex, não emitir prompt/output brutos para o runner trace store; se for necessária trilha, emitir apenas resumo seguro e redigido.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Escrever/atualizar testes em:
    - `src/core/target-investigate-case.test.ts` para manifesto rico do piloto, materialização com preparer oficial, `dossier.md|dossier.json`, cancelamento, `no-op`, publication positiva e ausência do bloqueio `round-preparer-unavailable`;
    - `src/integrations/codex-client.test.ts` para o novo prompt/método;
    - testes novos do preparer/publisher em `src/integrations/`;
    - `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/workflow-trace-store.test.ts` para garantir que o flow materializado continua observável e sanitizado no runner real.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts` para validar a matriz automatizada principal.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` como guardrail tipado complementar.
13. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js` para reconfirmar que a capability do piloto usada pela integração continua íntegra.
14. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Em um terminal dedicado, rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm start` para subir o serviço local do projeto alvo; em outro terminal, no runner, rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`.
15. (workdir: execução manual via Telegram autorizado) Executar uma rodada representativa de `/target_investigate_case guiadomus-matricula <case-ref> [--workflow extract_address] [--request-id <request-id>] [--window ...] [--symptom ...]`, seguida de `/target_investigate_case_status` e, quando seguro, `/target_investigate_case_cancel`, registrando o resumo final observado de forma redigida.
16. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Inspecionar com `find investigations -maxdepth 2 -type f | sort` e `find output/case-investigation -maxdepth 2 -type f | sort | tail -n 20` os artefatos canônicos e o dossier local bruto gerados pela rodada.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Inspecionar com `find .codex-flow-runner/flow-traces/target-flows -type f | sort | tail -n 5`, `sed -n '1,240p' <trace-file>` e `rg -n "workflow_debug|db_payload|transcript" <trace-file>` a trilha final do flow para registrar a validação manual redigida do trace minimizado.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan e o ticket com a validação manual redigida, incluindo: execução avaliada, resultado do resumo final do Telegram, resultado do trace minimizado, se houve replay/purge, quais paths foram gerados e quaisquer blockers residuais.
19. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "parseTargetInvestigateCaseCommand|evaluateTargetInvestigateCaseRound|buildTargetInvestigateCaseTracePayload|buildTargetInvestigateCaseFinalSummary|renderTargetInvestigateCaseFinalSummary" src && git diff --name-only` para confirmar, no fechamento, que não surgiu implementação paralela e que o changeset ficou restrito ao runner.

## Validation and Acceptance
- Regra de cobertura para allowlists / enumerações finitas deste ticket: não há consolidação genérica permitida para os cinco artefatos mínimos, os cinco milestones externos, os selectors aceitos do piloto ou os identificadores de purge aceitos. Para os sete workflows investigáveis do piloto, a consolidação autorizada já foi registrada em `Context and Orientation`: a allowlist inteira deve ser validada por parser/adapter/teste de capability, e a rodada manual real pode usar um único workflow representativo.
- Matriz requisito -> validação observável derivada diretamente dos closure criteria do ticket:
  - Requisito: RF-12, CA-05, mais eliminação objetiva do bloqueio `round-preparer-unavailable`.
    - Evidência observável: o bootstrap passa a injetar um `TargetInvestigateCaseRoundPreparer` oficial; uma execução materializada não bloqueia mais em `round-preparer-unavailable` e produz exatamente `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json` sob `investigations/<round-id>/`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts`
    - Comando: `find ../guiadomus-matricula/investigations -maxdepth 2 -type f | sort`
    - Esperado: os testes deixam explícito o caminho materializado e a ausência do blocker; a rodada real mostra os cinco filenames canônicos e um `publication-decision.json` efetivamente gravado.
  - Requisito: RF-22, RF-23, RF-24, RF-25, RF-26, CA-12.
    - Evidência observável: a materialização usa apenas o manifesto e o runbook declarados; preserva os selectors aceitos `propertyId|requestId|workflow|window|runArtifact`, rejeita workflow fora da allowlist, registra replay apenas com `updateDb=false`, `requestId` dedicado, namespace `output/case-investigation/<request-id>/`, `includeWorkflowDebug` conforme policy `safe-only` e purge scoped apenas com `propertyId|pdfFileName|matriculaNumber|transcriptHint`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js`
    - Esperado: os testes do runner e do piloto tornam observáveis a allowlist completa e a rejeição fora do conjunto; a rodada manual redigida registra `updateDb=false`, `requestId` dedicado, replay explícito quando houver e purge `dryRun` scoped quando aplicável.
  - Requisito: RF-36, RF-37, RF-38, RF-42; CA-07, CA-08, CA-09, CA-10, CA-16.
    - Evidência observável: a execução real continua reutilizando `evaluateTargetInvestigateCaseRound(...)`, preserva `publication` como fronteira final, emite `publication-decision.json`, mantém `versioned_artifact_paths` restrito ao ticket quando `publication_status=eligible`, cobre `no-op`, publication positiva e cancelamento antes/depois da fronteira no flow materializado.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts`
    - Esperado: a suite cobre `publication_status=not_applicable|not_eligible|blocked_by_policy|eligible`, `overall_outcome` coerentes, `versioned_artifact_paths` vazio em no-op e contendo apenas o ticket em publication positiva, além de cancelamento cooperativo/tardio no flow real.
  - Requisito: RF-39, RF-40, RF-41; CA-11, CA-15; validação manual herdada do resumo final e do trace minimizado.
    - Evidência observável: o resumo final do Telegram inclui ao menos `case-ref`, tentativa resolvida ou ausência explícita, replay usado ou não, três vereditos, `confidence`, `evidence_sufficiency`, `causal_surface`, decisão final, razão curta, caminho do dossier local, caminho do ticket se houver e próxima ação; o trace do runner não contém `workflow_debug`, `db_payload`, transcript nem payload bruto.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts`
    - Comando: `rg -n "workflow_debug|db_payload|transcript" .codex-flow-runner/flow-traces/target-flows/<trace-file>`
    - Esperado: a suite automatizada cobre presença dos campos obrigatórios e ausência dos proibidos; a validação manual registra texto redigido do resumo final e `rg` sem ocorrências dos tokens proibidos no trace final do flow.
  - Requisito: rodada real validada em projeto alvo elegível com registro redigido.
    - Evidência observável: após a ligação do materializador oficial, existe ao menos uma rodada real não bloqueada contra `../guiadomus-matricula`, com paths canônicos em `investigations/<round-id>/`, dossier bruto em `output/case-investigation/<request-id>/` quando aplicável, resumo final do Telegram observado e trace minimizado auditado.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm start`
    - Esperado: runner e piloto sobem, a rodada via Telegram completa o lifecycle sem `round-preparer-unavailable` ou `manifest-invalid`, e o ticket/ExecPlan recebem nota manual redigida com os resultados.
  - Requisito: fronteira de ownership do pacote derivado.
    - Evidência observável: o diff final reutiliza `parseTargetInvestigateCaseCommand`, `evaluateTargetInvestigateCaseRound`, `buildTargetInvestigateCaseTracePayload`, `buildTargetInvestigateCaseFinalSummary` e `renderTargetInvestigateCaseFinalSummary`, sem criar control-plane paralelo nem tocar `../guiadomus-matricula/**` por default.
    - Comando: `rg -n "parseTargetInvestigateCaseCommand|evaluateTargetInvestigateCaseRound|buildTargetInvestigateCaseTracePayload|buildTargetInvestigateCaseFinalSummary|renderTargetInvestigateCaseFinalSummary" src`
    - Comando: `git diff --name-only`
    - Esperado: as referências apontam para reuso do módulo central e o diff permanece restrito ao runner, exceto se um blocker contratual objetivo exigir renegociação explícita com o piloto.
- Guardrail complementar:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de tipagem após introduzir a normalização do manifesto, o preparer oficial e o publisher opcional.

## Idempotence and Recovery
- Idempotência:
  - cada nova execução deve criar um `roundId` novo e, quando houver replay, um `requestId` dedicado novo, preservando rodadas anteriores sob `investigations/<round-id>/` e `output/case-investigation/<request-id>/`;
  - rerodar o mesmo caso sem publication positiva não deve sobrescrever artefatos anteriores nem criar ticket duplicado;
  - se o caso terminar com ticket publicado, o `publication-decision.json` e o `ticket_path` versionado passam a ser a source of truth para retomar/reconciliar a rodada.
- Riscos:
  - a divergência de manifesto entre runner e piloto pode exigir mais do que uma simples injeção de dependência;
  - um materializador baseado em Codex pode vazar payload sensível para `aiExchanges` se o plano não redigir explicitamente essa borda;
  - publication positiva real pode produzir write-back no projeto alvo se a fixture manual escolhida não for segura;
  - ambiente Telegram ou serviço local do piloto podem bloquear a validação manual externa mesmo com o código correto.
- Recovery / Rollback:
  - se a rodada falhar antes da fronteira de versionamento, remover o `investigations/<round-id>/` incompleto e o namespace bruto `output/case-investigation/<request-id>/` apenas se o runbook do projeto alvo permitir, depois rerodar com novo `roundId`/`requestId`;
  - se falhar após publicar ticket, não tentar republicar: usar o `ticket_path` já emitido, revisar o ticket versionado e ajustar apenas os artefatos locais/remanescentes;
  - se o trace revelar `workflow_debug`, `db_payload`, transcript ou payload bruto, parar a execução e corrigir a sanitização antes de qualquer nova rodada manual;
  - se a rodada manual for bloqueada por ambiente externo (Telegram, serviço local, auth), registrar blocker explícito com data, comando tentado e erro observado em vez de marcar `GO`.

## Artifacts and Notes
- Artefatos de código esperados neste ticket:
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts` ou equivalente
  - `prompts/16-target-investigate-case-round-materialization.md`
  - ajustes em `src/main.ts`, `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, `src/integrations/codex-client.ts`
- Artefatos operacionais esperados na rodada real:
  - canônicos: `../guiadomus-matricula/investigations/<round-id>/case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json`, `dossier.md|dossier.json`
  - locais brutos da capability, quando houver replay/coleta local: `../guiadomus-matricula/output/case-investigation/<request-id>/`
  - trace do runner: `.codex-flow-runner/flow-traces/target-flows/<trace-id>.json`
- Notas operacionais para registrar na validação manual pendente:
  - qual caso/fixture segura foi usada na rodada real;
  - se houve replay e/ou purge preview;
  - se a rodada manual terminou em `no-op`, `not_eligible`, `blocked_by_policy` ou publication positiva;
  - resumo final do Telegram em formato redigido;
  - resultado da auditoria do trace minimizado e eventuais ajustes aplicados.

## Interfaces and Dependencies
- Interfaces internas do runner impactadas:
  - `TargetInvestigateCaseRoundPreparer`
  - `TargetInvestigateCaseTicketPublisher`
  - `ControlledTargetInvestigateCaseExecutor`
  - `CodexCliTicketFlowClient` e novos request/result do fluxo
  - `GitVersioning`
- Dependências e contratos externos:
  - manifesto do projeto alvo `docs/workflows/target-case-investigation-manifest.json`
  - runbook local `docs/workflows/target-case-investigation-runbook.md`
  - template causal `docs/workflows/target-case-investigation-causal-ticket-template.md`
  - template interno `tickets/templates/internal-ticket-template.md`
  - serviço local do projeto alvo para replay/purge seguro
  - bot Telegram funcional para a validação manual do resumo final
- Compatibilidade e acoplamentos a preservar:
  - `evaluateTargetInvestigateCaseRound(...)` continua sendo a fronteira única de publication runner-side;
  - o control-plane do flow (`runner.ts`, `telegram-bot.ts`, `workflow-trace-store.ts`) continua consumindo apenas summaries/traces já sanitizados;
  - a capability do projeto alvo permanece a autoridade semântica do caso e do conteúdo causal do ticket;
  - o runner continua sendo a autoridade final de `publication_status`, `overall_outcome` e `versioned_artifact_paths`.
