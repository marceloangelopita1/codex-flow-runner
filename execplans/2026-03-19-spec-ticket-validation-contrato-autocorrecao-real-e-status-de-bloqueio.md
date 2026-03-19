# ExecPlan - Corrigir contrato documental, autocorrecao material e status de bloqueio do spec-ticket-validation

## Purpose / Big Picture
- Objetivo: eliminar o falso atrito operacional revelado na rodada de 2026-03-19, alinhando o contrato documental do gate, substituindo a pseudo-autocorrecao por correcao material ou short-circuit honesto, e separando `NO_GO` deliberado de falha tecnica no resumo final de `/run_specs`.
- Resultado esperado:
  - `documentation-compliance-gap` passa a aplicar um contrato explicito e auditavel para o tipo de ticket avaliado, sem depender de interpretacao implicita do modelo;
  - o caminho de `autoCorrect` deixa de revalidar um pacote essencialmente identico: ou aplica correcao material observavel nos artefatos afetados, ou encerra explicitamente sem vender uma tentativa inexistente de autocorrecao;
  - o resumo final do fluxo e o Telegram passam a comunicar `blocked` ou semantica equivalente para `NO_GO` deliberado do gate, preservando `failure` apenas para erro tecnico.
- Escopo:
  - alinhar `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `prompts/09-validar-tickets-derivados-da-spec.md` e a preparacao de contexto do gate para fechar a ambiguidade documental;
  - implementar uma etapa real e segura de autocorrecao do pacote derivado, com revalidacao apenas apos mutacao material ou com short-circuit quando nao houver correcao segura;
  - expandir o summary de `/run_specs`, o render do Telegram e os testes associados para distinguir bloqueio deliberado de falha tecnica.
- Fora de escopo:
  - persistir historico completo por ciclo no trace/spec/Telegram;
  - implementar a arquitetura `spec-workflow-retrospective` pos-`spec-audit`;
  - mover a publicacao de ticket transversal sistemico para a retrospectiva pos-auditoria;
  - alterar a regra `GO/NO_GO` do pacote derivado ou a taxonomia base do gate alem do necessario para os tres pontos deste plano;
  - fechar ticket, mover artefatos para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-19 21:14Z - Planejamento inicial concluido com leitura integral do diagnostico, `PLANS.md`, `INTERNAL_TICKETS.md`, da spec de origem, dos traces da rodada e dos trechos de codigo do gate/resumo final.
- [ ] 2026-03-19 21:14Z - Contrato documental do gate alinhado sem ambiguidade entre docs, template, prompt e contexto preparado pelo runner.
- [ ] 2026-03-19 21:14Z - Autocorrecao material ou short-circuit honesto implementados e cobertos por testes focados.
- [ ] 2026-03-19 21:14Z - Semantica `blocked` vs `failure` implementada em tipos, runner e Telegram, com regressao automatizada verde.
- [ ] 2026-03-19 21:14Z - Validacao final concluida com testes focados, `npm test`, `npm run check` e `npm run build`.

## Surprises & Discoveries
- 2026-03-19 21:14Z - `tickets/open/` estava vazio neste workspace; por isso este plano foi criado junto com um ticket-base novo para preservar o contrato `spec -> ticket -> execplan`.
- 2026-03-19 21:14Z - O callback `autoCorrect` hoje so recompõe o `packageContext` e retorna `appliedCorrections: []`, o que confirma que a revalidacao atual nao prova tentativa real de correcao.
- 2026-03-19 21:14Z - `RunSpecsFlowSummary` ainda usa `outcome: "success" | "failure"`, de forma que qualquer `NO_GO` deliberado do gate cai no mesmo bucket de erro tecnico.
- 2026-03-19 21:14Z - O problema documental nao esta no parser do gate; ele nasce da combinacao entre contrato canonico, prompt do gate e ausencia de contexto explicito sobre quando os campos extras de tickets de auditoria/review sao obrigatorios.

## Decision Log
- 2026-03-19 - Decisao: tratar este follow-up como derivado da spec de `spec-ticket-validation`, mesmo tendo sido disparado por uma rodada real da spec de retrospectiva.
  - Motivo: os tres problemas a corrigir vivem no contrato/implementacao atual de `spec-ticket-validation`, e as RFs/CAs mais aderentes estao nessa spec.
  - Impacto: o plano fica ancorado em requisitos existentes e evita abrir uma segunda spec apenas para corrigir um contrato parcialmente implementado.
- 2026-03-19 - Decisao: assumir como default que os campos extras de causa-raiz/minor explanation/remediation scope permanecem obrigatorios apenas para tickets criados em `post-implementation audit/review`, salvo evidencia forte para ampliar esse contrato no mesmo changeset.
  - Motivo: este e o wording atual de `INTERNAL_TICKETS.md` e o melhor ponto de partida para reduzir falso positivo na triagem inicial de spec.
  - Impacto: prompt, template e contexto do gate precisam refletir essa regra explicitamente; se a equipe optar por ampliar a exigencia, a ampliacao devera ser feita de forma canonica e sincronizada.
- 2026-03-19 - Decisao: implementar autocorrecao material em vez de apenas remover o loop, mas com short-circuit explicito quando nao houver correcao segura.
  - Motivo: a spec de origem pede autocorrecao como default; desligar o loop sem oferecer substituto faria o comportamento se afastar ainda mais do contrato prometido.
  - Impacto: sera necessario introduzir uma etapa/prompt de correcao com snapshot e recovery dos arquivos afetados.
- 2026-03-19 - Decisao: usar `blocked` como resultado agregado de `RunSpecsFlowSummary` para `NO_GO` deliberado do gate.
  - Motivo: `completionReason` ja diferencia `spec-ticket-validation-no-go`, mas o campo `outcome` continua enganoso para operacao e Telegram.
  - Impacto: `runner`, tipos, helper de render e testes de Telegram precisarao aceitar um terceiro estado para `/run_specs`.

## Outcomes & Retrospective
- Status final: planejamento aprovado; execucao ainda nao iniciada.
- O que precisa existir ao final:
  - contrato documental do gate fechado e testavel;
  - autocorrecao com efeito material ou short-circuit honesto;
  - `NO_GO` deliberado comunicado como bloqueio, nao como erro tecnico.
- O que fica pendente fora deste plano:
  - historico detalhado de ciclos em traces/spec/Telegram;
  - retrospectiva sistemica pos-`spec-audit` e publicacao do ticket transversal na etapa correta;
  - qualquer revisao ampla de telemetria alem do necessario para o novo status agregado.
- Proximos passos:
  - executar os milestones abaixo em ordem;
  - fechar o ticket-base com evidencias objetivas e, se necessario, abrir follow-up separado para historico por ciclo ou retrospectiva pos-auditoria.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-19-spec-ticket-validation-contrato-autocorrecao-real-e-status-de-bloqueio.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json`
  - `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md`
- Spec de origem: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-08, RF-11, RF-12, RF-14, RF-16, RF-17, RF-27
  - CA-06, CA-07, CA-09, CA-11, CA-12
- Assumptions / defaults adotados:
  - o contrato atual de `INTERNAL_TICKETS.md` para campos extras de tickets de auditoria/review permanece o baseline; qualquer ampliacao precisa ser feita conscientemente e em todas as superficies canonicas;
  - revalidacao so e aceitavel quando houver correcao material observavel ou, no minimo, diferenca concreta entre o pacote anterior e o proximo pacote;
  - quando nao houver correcao segura, o gate deve registrar isso como ausencia de autocorrecao aplicavel, sem simular tentativa;
  - `NO_GO` deliberado por gate de qualidade deve aparecer como `blocked` no agregado do fluxo de spec, enquanto excecoes tecnicas continuam como `failure`;
  - persistencia detalhada do historico por ciclo permanece fora de escopo deste plano.
- Fluxo atual relevante (as-is):
  - `src/core/runner.ts` monta o pacote do gate, chama `runSpecTicketValidation(...)` e injeta um `autoCorrect` que hoje so recompõe o contexto;
  - `src/core/spec-ticket-validation.ts` encerra a rodada em `no-real-gap-reduction` quando os fingerprints finais nao reduzem de forma estrita;
  - `src/types/flow-timing.ts` modela `RunSpecsFlowSummary.outcome` apenas como `success | failure`;
  - `src/integrations/telegram-bot.ts` renderiza `failure` como `falha`, inclusive no caso de `spec-ticket-validation-no-go`.
- Restricoes tecnicas:
  - Node.js 20+ com TypeScript; sem dependencias externas novas;
  - fluxo continua sequencial;
  - qualquer autocorrecao deve limitar o write set aos artefatos apontados pelo gate e ter estrategia de recovery;
  - o plano precisa permanecer executavel por outra pessoa sem depender de contexto conversacional externo.
- Termos usados neste plano:
  - `contrato documental do gate`: regra que determina quais exigencias de `documentation-compliance-gap` sao validas para o tipo de ticket avaliado;
  - `autocorrecao material`: etapa que realmente altera os arquivos afetados e registra correcoes aplicadas observaveis;
  - `blocked`: encerramento deliberado por gate de qualidade, distinto de erro tecnico do runtime.

## Plan of Work
- Milestone 1 - Fechar o contrato documental de `documentation-compliance-gap`
  - Entregavel: docs, template, prompt e contexto preparado pelo runner passam a explicitar quando os campos extras de tickets de auditoria/review sao obrigatorios e quando nao se aplicam a tickets derivados de `spec-triage`.
  - Evidencia de conclusao: testes ou asserts focados mostram que o gate recebe contexto suficiente para distinguir tickets de triagem inicial e tickets de auditoria/review, sem ambiguidade residual no prompt.
  - Arquivos esperados:
    - `INTERNAL_TICKETS.md`
    - `tickets/templates/internal-ticket-template.md`
    - `prompts/09-validar-tickets-derivados-da-spec.md`
    - `src/core/runner.ts`
    - testes associados
- Milestone 2 - Trocar a pseudo-autocorrecao por correcao material segura
  - Entregavel: existe uma etapa real de autocorrecao do pacote derivado, com prompt/contrato proprio, snapshot/recovery dos arquivos afetados e revalidacao apenas quando houve mudanca material; quando nao houver correcao segura, o gate encerra sem simular tentativa.
  - Evidencia de conclusao: testes cobrem caminho com correcao aplicada e caminho sem correcao segura, e `appliedCorrections` deixa de ficar vazio em revalidacoes bem-sucedidas por correcao real.
  - Arquivos esperados:
    - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
    - `src/integrations/codex-client.ts`
    - `src/core/spec-ticket-validation.ts`
    - `src/core/runner.ts`
    - tipos/parsers/testes associados
- Milestone 3 - Separar `blocked` de `failure` no fluxo de spec
  - Entregavel: `RunSpecsFlowSummary` ganha semantica propria para bloqueio deliberado, `runner` passa a usá-la no caminho `spec-ticket-validation-no-go`, e o Telegram renderiza isso como bloqueio em vez de falha.
  - Evidencia de conclusao: testes do runner e do Telegram diferenciam claramente `blocked` por `NO_GO` de `failure` por excecao tecnica.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `src/integrations/telegram-bot.ts`
    - testes associados
- Milestone 4 - Regressao completa e auditoria final do escopo
  - Entregavel: suites focadas, `npm test`, `npm run check` e `npm run build` passam com diff restrito ao escopo planejado.
  - Evidencia de conclusao: comandos verdes e diff final sem vazamento para a arquitetura pos-`spec-audit` ou historico por ciclo.
  - Arquivos esperados:
    - artefatos de teste e diff dos arquivos acima.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "documentation-compliance-gap|autoCorrect|appliedCorrections|spec-ticket-validation-no-go|renderOutcome|RunSpecsFlowSummary" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md prompts/09-validar-tickets-derivados-da-spec.md src/core/runner.ts src/core/spec-ticket-validation.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts` para fixar os pontos exatos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler os traces `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json` e `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md` para manter o diagnostico concreto durante a execucao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `INTERNAL_TICKETS.md` e `tickets/templates/internal-ticket-template.md` para:
   - explicitar, sem ambiguidade, quando os campos extras de tickets de auditoria/review sao obrigatorios;
   - evitar que o template sugira obrigatoriedade indevida em tickets de triagem inicial;
   - manter o contrato auto-contido e coerente com o wording canonico ja adotado.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `prompts/09-validar-tickets-derivados-da-spec.md` e no contexto preparado em `src/core/runner.ts` para:
   - informar ao gate como aplicar `documentation-compliance-gap` conforme a origem do ticket;
   - explicitar que tickets derivados de `spec-triage` nao devem ser cobrados com requisitos exclusivos de `post-implementation audit/review`, salvo contrato ampliado de forma canonica;
   - preservar a taxonomia existente do gate.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar, via `apply_patch`, um contrato/prompt dedicado de autocorrecao em `prompts/10-autocorrigir-tickets-derivados-da-spec.md`, com foco em editar apenas os artefatos afetados apontados pelo gate e devolver uma lista parseavel de correcoes realmente aplicadas.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/codex-client.ts` para adicionar a capacidade de rodar a etapa de autocorrecao dedicada, sem reaproveitar o `thread_id` de `spec-triage` e sem depender do fluxo pos-`spec-audit`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/spec-ticket-validation.ts` e `src/core/runner.ts` para:
   - substituir o `autoCorrect` placeholder por uma etapa que aplica correcao material ou retorna explicitamente que nenhuma correcao segura foi possivel;
   - revalidar apenas quando houver mudanca material no pacote derivado;
   - registrar `appliedCorrections` reais e manter snapshot/recovery dos arquivos tocados.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario, criar ou ajustar tipos/parsers auxiliares para a nova etapa de autocorrecao, mantendo allowlists fechadas e payload parseavel.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/flow-timing.ts`, `src/core/runner.ts` e `src/integrations/telegram-bot.ts` para introduzir `blocked` (ou nome equivalente decidido no mesmo changeset) como resultado agregado de `/run_specs` quando o encerramento vier de `spec-ticket-validation-no-go`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts`, `src/core/spec-ticket-validation.test.ts`, `src/integrations/codex-client.test.ts` e `src/integrations/telegram-bot.test.ts` para cobrir:
    - contrato documental correto de `documentation-compliance-gap`;
    - autocorrecao material seguida de revalidacao;
    - ausencia de ciclo enganoso quando nao houver correcao segura;
    - resumo final com `blocked` para `NO_GO` deliberado e `failure` para excecao tecnica.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` para validar os pontos centrais do plano.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao completa.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para validar compilacao final.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md src/core/runner.ts src/core/spec-ticket-validation.ts src/integrations/codex-client.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/core/spec-ticket-validation.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` para auditoria final do escopo.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-08, RF-11; CA-06
    - Evidencia observavel: docs, template, prompt e contexto do gate deixam explicito quando os campos extras de tickets de auditoria/review sao exigidos, e os testes cobrem um pacote derivado de `spec-triage` e um caso de `post-implementation audit/review`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/core/spec-ticket-validation.test.ts`
    - Esperado: asserts verdes para a regra documental correta, sem `documentation-compliance-gap` falso por exigencia exclusiva de auditoria/review em tickets de triagem inicial.
  - Requisito: RF-12, RF-14; CA-07, CA-09
    - Evidencia observavel: o runner revalida somente apos correcao material ou encerra explicitamente sem simular tentativa; `appliedCorrections` contem apenas correcoes reais; testes cobrem caminho com correcao e caminho sem correcao segura.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/integrations/codex-client.test.ts`
    - Esperado: cenarios verdes para `NO_GO -> autocorrecao material -> GO` e para short-circuit honesto quando nao houver write set seguro.
  - Requisito: RF-16, RF-17, RF-27; CA-11, CA-12
    - Evidencia observavel: `RunSpecsFlowSummary` e o Telegram diferenciam `blocked` por gate deliberado de `failure` por erro tecnico, mantendo `completionReason` explicito.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: resumo final de `/run_specs` mostra bloqueio deliberado para `spec-ticket-validation-no-go` e falha tecnica apenas nos caminhos de excecao.
- Comando complementar de regressao: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: suite completa verde apos a mudanca de contrato, autocorrecao e semantica de summary.
- Comando complementar de consistencia: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check && npm run build`
  - Esperado: tipagem e compilacao verdes, sem regressao de interface nos tipos de summary ou no cliente de autocorrecao.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar as edicoes documentais deve convergir para o mesmo contrato final, sem duplicar bullets ou excecoes;
  - a etapa de autocorrecao deve ser deterministicamente limitada aos artefatos apontados pelo gate e nao tocar spec ou arquivos fora do write set esperado;
  - o novo estado `blocked` nao deve alterar comportamento de `run-all`, apenas o resumo de `/run_specs`.
- Riscos:
  - ampliar ou restringir demais o contrato documental e criar novo falso positivo/negativo do gate;
  - deixar a autocorrecao parcial em disco se a etapa falhar apos editar arquivos;
  - espalhar `blocked` para fluxos que nao precisam do terceiro estado e aumentar churn de tipos sem necessidade;
  - acoplar demais esta entrega a historico por ciclo ou a retrospectiva pos-`spec-audit`.
- Recovery / Rollback:
  - antes de executar autocorrecao, capturar snapshot em memoria dos arquivos afetados; se a etapa falhar ou retornar payload invalido, restaurar os arquivos e encerrar a rodada com erro objetivo;
  - se a regra documental adotada se mostrar incompatavel com a spec de origem durante a implementacao, reduzir o changeset ao alinhamento explicito das superficies canonicas e registrar follow-up separado para eventual ampliacao de escopo;
  - se o terceiro estado `blocked` causar churn excessivo fora de `/run_specs`, restringir a alteracao ao tipo/resumo de spec e manter `run-all` inalterado;
  - se a etapa nova de autocorrecao ficar insegura para esta rodada, preservar o short-circuit honesto como fallback minimo e registrar follow-up para expansao posterior.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-19-spec-ticket-validation-contrato-autocorrecao-real-e-status-de-bloqueio.md`
- Spec de origem:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Observacao operacional que disparou o plano:
  - rodada de `/run_specs` da spec `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` encerrada em `spec-ticket-validation` com `NO_GO`, `high`, `no-real-gap-reduction` e `appliedCorrections: []`
- Referencias tecnicas consumidas:
  - `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json`
  - `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
- Artefatos esperados ao final da execucao:
  - diff restrito ao contrato documental do gate, a etapa de autocorrecao material e ao summary/Telegram de `/run_specs`;
  - testes focados provando contrato, autocorrecao e `blocked`;
  - nenhum vazamento para a arquitetura maior de retrospectiva pos-`spec-audit`.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato canonico de tickets em `INTERNAL_TICKETS.md` e no template oficial;
  - prompt do gate `spec-ticket-validation` e possivel novo prompt de autocorrecao;
  - interface do cliente para disparar autocorrecao material do pacote derivado;
  - tipos de `RunSpecsFlowSummary` para suportar `blocked`;
  - render do Telegram para o novo estado agregado de `/run_specs`.
- Compatibilidade:
  - o `GO/NO_GO` do pacote derivado permanece igual; muda apenas a honestidade da tentativa de correcao e a semantica observavel do resumo final;
  - `run-all` pode continuar binario (`success | failure`) se o terceiro estado for restrito ao fluxo de spec;
  - o novo prompt de autocorrecao deve ser aditivo e nao interferir na futura retrospectiva pos-`spec-audit`.
- Dependencias externas e mocks:
  - nao ha dependencias externas novas;
  - testes devem mockar a etapa de autocorrecao e o cliente Codex onde necessario, preservando execucao local deterministica.
