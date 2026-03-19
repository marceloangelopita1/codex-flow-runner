# ExecPlan - Retrospectiva pos-spec-audit: orquestracao e separacao de responsabilidades

## Purpose / Big Picture
- Objetivo: introduzir o estagio observavel `spec-workflow-retrospective` no `/run_specs` apos `spec-audit`, tornar a fase final condicional e limpar o contrato de `spec-audit` para que ele permaneça estritamente funcional em relacao a spec auditada.
- Resultado esperado:
  - `runSpecsAndRunAll(...)` passa a distinguir os caminhos `spec-audit sem gaps residuais` vs. `spec-audit com gaps residuais reais`, executando `spec-workflow-retrospective` apenas no segundo caso;
  - `finalStage` do resumo final permanece `spec-audit` quando nao houver retrospectiva e passa a `spec-workflow-retrospective` quando a retrospectiva realmente rodar;
  - `prompts/08-auditar-spec-apos-run-all.md` deixa de instruir melhoria sistemica de workflow;
  - timing, estado, traces e resumo do Telegram reconhecem o novo stage como fase nomeada e exibivel.
- Escopo:
  - orquestracao do fluxo `/run_specs` apos `spec-audit`;
  - expansao dos contratos de stage em `src/integrations/codex-client.ts`, `src/types/flow-timing.ts`, `src/types/state.ts` e `src/integrations/workflow-trace-store.ts`;
  - ajuste do prompt `prompts/08-auditar-spec-apos-run-all.md` para remover responsabilidade sistemica de `spec-audit`;
  - atualizacao dos resumos e testes de runner/trace/Telegram para o novo stage.
- Fora de escopo:
  - implementar o contrato detalhado de `workflow-gap-analysis` e o criterio `high | medium | low confidence`, cobertos pelo ticket irmao `tickets/closed/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md`;
  - migrar a publicacao cross-repo do ticket transversal de workflow para o pos-`spec-audit`, coberta pelo ticket irmao `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push.

## Progress
- [x] 2026-03-19 22:14Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `DOCUMENTATION.md`, de `docs/workflows/codex-quality-gates.md` e das referencias obrigatorias.
- [x] 2026-03-19 22:27Z - Orquestracao pos-`spec-audit` atualizada com `spec-workflow-retrospective` condicional, `finalStage` variavel e falha especifica da retrospectiva.
- [x] 2026-03-19 22:27Z - Contrato operacional de `spec-audit` limpo, com bloco parseavel minimo `[[SPEC_AUDIT_RESULT]]` para distinguir gaps residuais reais sem heuristica frouxa.
- [x] 2026-03-19 22:27Z - Observabilidade, prompt dedicado da retrospectiva e testes do novo stage validados em runner, trace, Telegram, tipagem e build.

## Surprises & Discoveries
- 2026-03-19 22:14Z - O runner hoje finaliza `/run_specs` com `finalStage: "spec-audit"` no caminho de sucesso; os testes existentes em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` assumem isso explicitamente.
- 2026-03-19 22:14Z - O contrato de stage nao esta concentrado em um unico arquivo: alem de `src/core/runner.ts`, o novo nome precisa atravessar `SpecFlowStage` em `src/integrations/codex-client.ts`, os unions de timing, `RunnerPhase` e `WorkflowTraceStage`.
- 2026-03-19 22:14Z - `runSpecStage(...)` em `src/core/runner.ts` hoje aceita apenas `spec-triage | spec-close-and-version | spec-audit`; logo, adicionar o novo estagio toca tambem o wiring do cliente/prompt, nao apenas enums de resumo.
- 2026-03-19 22:14Z - O prompt `prompts/08-auditar-spec-apos-run-all.md` ainda pede registro de causa-raiz `systemic-instruction` e promocao de ajuste genericamente instrutivo, o que conflita diretamente com RF-31 e CA-15 da spec.
- 2026-03-19 22:14Z - A infraestrutura de follow-up sistemico hoje ainda aparece acoplada ao bloco `spec-ticket-validation` no runner e no Telegram; este ticket nao deve absorver a migracao completa dessa publicacao para o pos-auditoria, que pertence ao ticket irmao de publication.
- 2026-03-19 22:27Z - O `spec-audit` nao expunha nenhum sinal estruturado confiavel de `gaps residuais reais`; para manter execucao segura, foi necessario introduzir um contrato parseavel minimo no proprio prompt e no runner.
- 2026-03-19 22:27Z - O menor stage retroativo seguro nesta entrega e um prompt dedicado de retrospectiva preliminar, explicitamente sem `workflow-gap-analysis` e sem `workflow-ticket-publication`; isso preserva a fronteira observavel sem invadir o escopo dos tickets irmaos.

## Decision Log
- 2026-03-19 - Decisao: limitar este plano a criar a fronteira observavel `spec-audit -> spec-workflow-retrospective` e a limpar a responsabilidade funcional do `spec-audit`, sem implementar todo o fluxo interno da retrospectiva.
  - Motivo: a spec ja particionou o trabalho em 3 tickets; absorver `workflow-gap-analysis` e `workflow-ticket-publication` aqui destruiria a separacao de escopo aprovada.
  - Impacto: este ticket entrega a orquestracao e a separacao de responsabilidades; os tickets irmaos completam a semantica interna da retrospectiva.
- 2026-03-19 - Decisao: o gatilho para rodar `spec-workflow-retrospective` deve nascer de um sinal observavel do resultado de `spec-audit`, e nao de heuristica frouxa baseada apenas em sucesso tecnico da etapa.
  - Motivo: RF-02 e CA-01 exigem diferenciar `audit concluida sem gaps` de `audit concluida com gaps residuais reais`.
  - Impacto: a execucao precisara confirmar qual artefato do `spec-audit` oferece esse sinal; se ele nao existir, o menor contrato explicito necessario devera ser criado neste ticket antes do wiring do novo stage.
- 2026-03-19 - Decisao: preservar `spec-audit` como etapa funcional da spec corrente, mantendo follow-ups funcionais da spec separados de qualquer backlog sistemico do workflow.
  - Motivo: RF-03, RF-04, RF-31 e CA-03/CA-15 exigem a separacao sem ambiguidade.
  - Impacto: o prompt `08` e quaisquer asserts/fixtures desta etapa devem remover instrucao de melhoria sistemica e reforcar o foco na cobertura funcional da spec.
- 2026-03-19 - Decisao: tratar a migracao do bloco de follow-up sistemico hoje exibido dentro de `spec-ticket-validation` como dependencia fora do escopo direto deste ticket, salvo se isso impedir um resumo final coerente.
  - Motivo: essa publicacao esta mapeada para o ticket irmao de publication cross-repo.
  - Impacto: a implementacao aqui deve evitar regressao ou mensagem enganosa, mas nao reescrever o pipeline inteiro de ticket transversal.
- 2026-03-19 - Decisao: formalizar o sinal de auditoria via bloco `[[SPEC_AUDIT_RESULT]]` com `residual_gaps_detected` e `follow_up_tickets_created`.
  - Motivo: o ticket exige branch pos-`spec-audit` baseado em evidencia observavel, e o estado anterior nao oferecia contrato confiavel para isso.
  - Impacto: o runner falha explicitamente em `spec-audit` quando o bloco obrigatorio nao aparece, evitando continuar o fluxo por inferencia silenciosa.
- 2026-03-19 - Decisao: introduzir `prompts/11-retrospectiva-workflow-apos-spec-audit.md` como prompt seguro de fronteira observavel, sem absorver analise causal nem publicacao.
  - Motivo: `SpecFlowStage` e o dispatch do cliente exigem um prompt dedicado para o novo estagio existir de ponta a ponta.
  - Impacto: o stage agora e executavel e rastreavel, enquanto `workflow-gap-analysis` e `workflow-ticket-publication` permanecem explicitamente pendentes nos tickets irmaos.

## Outcomes & Retrospective
- Status final: execucao concluida sem blockers.
- O que funcionou no planejamento:
  - o ticket e a spec apontam claramente o subconjunto RF/CA deste trabalho;
  - as referencias de codigo ja isolam as superficies que precisam mudar para o stage existir de ponta a ponta;
  - os closure criteria do ticket permitem montar uma matriz objetiva sem depender de checklist generico.
- O que funcionou na execucao:
  - o contrato minimo `[[SPEC_AUDIT_RESULT]]` permitiu separar `spec-audit` de `spec-workflow-retrospective` sem depender de side effects de filesystem;
  - a expansao de unions/tipos/trace/Telegram permaneceu pequena e verificavel;
  - a cobertura adicionada em `runner`, `workflow-trace-store`, `telegram-bot` e `codex-client` protege os dois caminhos de sucesso e o blocker explicito do `spec-audit`.
- O que fica pendente fora deste plano:
  - contrato dedicado de `workflow-gap-analysis`;
  - publicacao/reuso cross-repo do ticket transversal no pos-`spec-audit`;
  - validacoes manuais reais em projeto externo descritas na spec.
- Proximos passos:
  - manter os tickets irmaos separados para concluir a semantica interna da retrospectiva sistemica;
  - validar manualmente o novo stage em rodada real de `/run_specs` quando houver gap residual autentico;
  - encerrar operacionalmente o ticket em etapa posterior, sem alterar o escopo desta entrega.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/types/flow-timing.ts`
  - `src/types/state.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `prompts/08-auditar-spec-apos-run-all.md`
  - `execplans/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
- Spec de origem: `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-03, RF-04, RF-28, RF-31
  - CA-01, CA-02, CA-03, CA-14, CA-15
- Assumptions / defaults adotados:
  - o nome canonico do novo estagio permanece `spec-workflow-retrospective`;
  - neste ticket, `spec-workflow-retrospective` e tratado como fronteira observavel unica no `/run_specs`; as subetapas internas `workflow-gap-analysis` e `workflow-ticket-publication` continuam pertencendo aos tickets irmaos;
  - a retrospectiva so deve rodar quando houver evidencia observavel de gaps residuais reais apos `spec-audit`, nunca apenas porque a auditoria terminou com sucesso tecnico;
  - follow-up funcional da spec e follow-up sistemico do workflow continuam sendo artefatos distintos;
  - qualquer migracao completa do ticket transversal hoje acoplado a `spec-ticket-validation` fica fora deste plano, salvo ajuste minimo necessario para evitar contradicao funcional no resumo final.
- Fluxo atual relevante:
  - `runSpecsAndRunAll(...)` hoje executa `spec-triage -> spec-ticket-validation -> spec-close-and-version -> run-all -> spec-audit`;
  - o caminho de sucesso encerra com `finalStage: "spec-audit"`;
  - `src/integrations/telegram-bot.ts` ainda exibe follow-up sistemico como parte do bloco `Gate spec-ticket-validation`.
- Restricoes tecnicas:
  - manter fluxo sequencial;
  - nao reabrir o escopo dos tickets irmaos;
  - fazer a validacao exclusivamente a partir dos closure criteria do ticket;
  - usar comandos Node com o prefixo obrigatorio de `HOME` e `PATH`.

## Plan of Work
- Milestone 1: Abrir a fronteira pos-auditoria no runner e nos contratos de stage.
  - Entregavel: `runSpecsAndRunAll(...)` passa a conhecer `spec-workflow-retrospective`, com `finalStage` condicional e unions/tipos alinhados em runner, codex client, timing, state e trace.
  - Evidencia de conclusao: testes de runner mostram que a retrospectiva roda apenas quando o `spec-audit` indicar gaps residuais reais, e que o caminho sem retrospectiva continua encerrando em `spec-audit`.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts`, `src/core/runner.test.ts`.
- Milestone 2: Separar a responsabilidade funcional de `spec-audit`.
  - Entregavel: o prompt `08` e o contrato operacional da etapa deixam de orientar melhoria sistemica de workflow e reforcam que `spec-audit` abre apenas follow-ups funcionais da spec.
  - Evidencia de conclusao: o texto do prompt nao menciona mais `systemic-instruction` nem promocao genericamente instrutiva; fixtures/testes continuam provando follow-up funcional da spec.
  - Arquivos esperados: `prompts/08-auditar-spec-apos-run-all.md`, `src/core/runner.test.ts` e quaisquer fixtures auxiliares estritamente necessarias.
- Milestone 3: Fechar observabilidade e legibilidade do novo stage.
  - Entregavel: traces, resumo do Telegram e ordem de timing passam a reconhecer `spec-workflow-retrospective` como fase nomeada e exibivel, sem quebrar o caminho em que a retrospectiva nao roda.
  - Evidencia de conclusao: testes de trace/Telegram e checagem de tipos confirmam o stage novo nos consumidores e mantem `spec-audit` como fase final quando apropriado.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/workflow-trace-store.test.ts`, alem dos tipos compartilhados.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "runSpecsAndRunAll|spec-audit|spec-workflow-retrospective|finalStage" src/core/runner.ts src/integrations/codex-client.ts src/types/flow-timing.ts src/types/state.ts src/integrations/workflow-trace-store.ts src/integrations/telegram-bot.ts src/core/runner.test.ts` para reabrir o contexto exato antes das edicoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.ts`, `src/types/flow-timing.ts`, `src/types/state.ts` e `src/integrations/workflow-trace-store.ts` para introduzir `spec-workflow-retrospective` nos contratos de stage, timing, phase e trace.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para:
   - criar o ramo pos-`spec-audit` que decide se a retrospectiva roda;
   - registrar duracao/sucesso/falha do novo stage;
   - tornar `finalStage` condicional entre `spec-audit` e `spec-workflow-retrospective`;
   - introduzir, se necessario, o menor sinal explicito de `audit com gaps residuais reais` para evitar heuristica fragil.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/08-auditar-spec-apos-run-all.md` para remover qualquer instrucao de melhoria sistemica de workflow e reafirmar o foco exclusivo da auditoria funcional da spec.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/telegram-bot.ts` para refletir o novo stage no resumo final e nas linhas de timing, preservando o comportamento em que `spec-audit` segue como fase final quando nao houver retrospectiva.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts`, `src/integrations/workflow-trace-store.test.ts` e `src/integrations/telegram-bot.test.ts` para cobrir:
   - caminho com gaps residuais reais apos `spec-audit`, incluindo `finalStage: "spec-workflow-retrospective"`;
   - caminho sem gaps residuais, mantendo `finalStage: "spec-audit"`;
   - ausencia de instrucao sistemica no contrato de `spec-audit`;
   - reconhecimento do novo stage em trace e Telegram.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts` para validar os cenarios observaveis diretamente ligados aos closure criteria.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar que os novos unions/stages propagam corretamente por todos os consumidores de tipo.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir que o wiring do stage novo compila no fluxo completo.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/integrations/codex-client.ts src/types/flow-timing.ts src/types/state.ts src/integrations/workflow-trace-store.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts prompts/08-auditar-spec-apos-run-all.md` para auditoria final do escopo tocado.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01, RF-02, RF-28; CA-01, CA-02, CA-14
    - Evidencia observavel: testes de `runner` mostram dois caminhos de sucesso distintos: com gaps residuais reais apos `spec-audit`, o fluxo executa `spec-workflow-retrospective` e encerra com `finalStage: "spec-workflow-retrospective"`; sem gaps residuais, a retrospectiva nao roda e `finalStage` permanece `spec-audit`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: asserts verdes cobrindo ambos os caminhos e timings contendo `spec-workflow-retrospective` apenas quando a retrospectiva realmente executa.
  - Requisito: RF-03, RF-04, RF-31; CA-03, CA-15
    - Evidencia observavel: `prompts/08-auditar-spec-apos-run-all.md` deixa de mencionar `systemic-instruction` e promocao genericamente instrutiva; testes/fixtures de `runner` continuam comprovando que `spec-audit` fica restrito a follow-ups funcionais da spec e nao assume decisao/publicacao de melhoria sistemica.
    - Comando: `rg -n "systemic-instruction|genericamente instrutivo|melhoria sistemica" prompts/08-auditar-spec-apos-run-all.md`
    - Esperado: nenhum match para orientacoes sistemicas no prompt de `spec-audit`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: asserts verdes ou fixtures atualizadas demonstrando que `spec-audit` continua sendo auditoria funcional da spec.
  - Requisito: observabilidade do novo stage nomeado em timing/estado/trace/resumo
    - Evidencia observavel: `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` reconhecem `spec-workflow-retrospective` como fase nomeada e exibivel, sem quebrar o caminho sem retrospectiva.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts`
    - Esperado: testes verdes com trace aceitando o novo stage, Telegram exibindo a nova fase quando presente e mantendo `spec-audit` quando ela nao existir.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - Esperado: tipagem verde para todos os unions/consumidores do stage novo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - Esperado: build verde do runner com o wiring completo do novo stage.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a mudanca nao deve duplicar nomes de stage, blocos de resumo nem branches de timing;
  - os testes precisam continuar distinguindo de forma deterministica os caminhos `sem retrospectiva` e `com retrospectiva`;
  - o prompt `08` deve permanecer com escopo funcional claro em reruns, sem reintroduzir linguagem sistemica.
- Riscos:
  - o `spec-audit` atual pode nao expor um sinal confiavel de gaps residuais reais, forçando definicao de um contrato minimo adicional;
  - ampliar o stage no runner sem alinhar `codex-client` pode quebrar o dispatch de prompts e os traces;
  - mexer no resumo do Telegram sem cuidado pode conflitar com o bloco sistemico hoje ainda anexado a `spec-ticket-validation`;
  - atualizar apenas parte dos testes pode mascarar regressao de `finalStage`.
- Recovery / Rollback:
  - se nao houver sinal observavel robusto para `gaps residuais reais`, parar a execucao e registrar blocker explicito em vez de adotar heuristica baseada apenas em side effects de filesystem;
  - se o novo stage quebrar o despacho do cliente, reverter localmente a expansao do branch do runner e alinhar primeiro `SpecFlowStage` + prompt mapping antes de insistir;
  - se o resumo do Telegram ficar contraditorio por dependencia do ticket irmao, reduzir este ticket ao minimo coerente e registrar a dependencia explicitamente no `Decision Log` durante a execucao.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
- Tickets correlatos fora do escopo direto:
  - `tickets/closed/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md`
  - `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`
- ExecPlan correlato consultado:
  - `execplans/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
- Checklist aplicado no planejamento (`docs/workflows/codex-quality-gates.md`):
  - ticket inteiro e referencias obrigatorias relidos antes de planejar;
  - spec de origem e subconjunto RF/CA explicitados;
  - assumptions/defaults escolhidos para remover ambiguidade do stage novo;
  - closure criteria traduzidos para matriz `requisito -> validacao observavel`;
  - riscos residuais e nao-escopo declarados.
- Checklist aplicado na execucao (`docs/workflows/codex-quality-gates.md`):
  - ticket, spec e ExecPlan relidos antes de alterar codigo;
  - `Progress`, `Surprises & Discoveries` e `Decision Log` atualizados apos confirmar a ausencia do sinal estruturado de `spec-audit`;
  - implementacao mantida dentro de RF-01, RF-02, RF-03, RF-04, RF-28 e RF-31;
  - matriz de validacao executada integralmente antes do encerramento;
  - spec/documentacao impactadas atualizadas no mesmo changeset.
- Nota de qualidade: toda a validacao deste plano deriva dos 3 closure criteria do ticket; o checklist compartilhado foi usado apenas como gate de completude do plano.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `SpecFlowStage` e `SPEC_STAGE_PROMPT_FILES` em `src/integrations/codex-client.ts`;
  - `RunSpecsFlowTimingStage`, `RunSpecsFlowFinalStage` e possiveis motivos de encerramento/falha em `src/types/flow-timing.ts`;
  - `RunnerPhase` em `src/types/state.ts`;
  - `WorkflowTraceStage` em `src/integrations/workflow-trace-store.ts`;
  - renderizacao do resumo final de `/run_specs` em `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - `spec-audit` continua existindo e segue sendo a etapa final quando nao houver gaps residuais reais;
  - o fluxo continua sequencial e nao pode introduzir paralelizacao;
  - a semantica interna de `workflow-gap-analysis` e `workflow-ticket-publication` permanece pertencendo aos tickets irmaos.
- Dependencias e pontos de acoplamento:
  - dependencia do contrato real de saida do `spec-audit` para detectar `gaps residuais reais`;
  - dependencia dos stubs de `src/core/runner.test.ts` para simular o caminho com e sem retrospectiva;
  - dependencia dos testes de resumo do Telegram e de trace para validar a nova fase nomeada.
- Estado final das dependencias:
  - o contrato minimo do `spec-audit` agora existe via bloco parseavel;
  - os stubs de teste foram ajustados para devolver saida estrutural por stage;
  - a legibilidade final ainda depende dos tickets irmaos para mover a semantica sistemica hoje acoplada ao gate `spec-ticket-validation`.
