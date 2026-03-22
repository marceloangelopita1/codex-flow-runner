# ExecPlan - documentacao canonica da feature flag de retrospectivas

## Purpose / Big Picture
- Objetivo: alinhar a documentacao canonica de specs com a feature flag `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`, preservando a secao `Retrospectiva sistemica da derivacao dos tickets` como parte do modelo oficial, mas deixando explicito que sua execucao/write-back automatico depende de opt-in e que a secao pode permanecer `n/a` quando a flag estiver desligada.
- Resultado esperado:
  - `SPECS.md` passa a descrever a condicionalidade da secao canonica por feature flag, sem remover a secao do contrato de spec;
  - `docs/specs/templates/spec-template.md` passa a instruir explicitamente o caso `n/a` e a ausencia de write-back automatico quando a flag estiver desligada;
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` recebem nota documental minima sobre a dependencia futura da flag, sem reescrever seu historico funcional.
- Escopo:
  - alinhamentos documentais em `SPECS.md`, no template oficial de spec e nas 2 specs historicas citadas pelo ticket;
  - validacao observavel limitada ao closure criterion documental do ticket.
- Fora de escopo:
  - qualquer alteracao de runtime, parser, bootstrap, Telegram, logs ou testes do runner;
  - reabrir ou reescrever o historico funcional completo das specs de 2026-03-19 e 2026-03-20;
  - migracao retroativa em massa de specs historicas alem das 2 explicitamente apontadas no ticket;
  - alteracoes em `README.md`, `.env.example` ou no ticket irmao ja fechado de runtime.

## Progress
- [x] 2026-03-22 00:00Z - Ticket, spec de origem, `PLANS.md`, `docs/workflows/codex-quality-gates.md` e referencias obrigatorias lidos integralmente.
- [x] 2026-03-22 00:00Z - Contexto documental atual consolidado em `SPECS.md`, `docs/specs/templates/spec-template.md` e nas specs historicas de 2026-03-19/2026-03-20.
- [x] 2026-03-22 20:00Z - Contrato canonico atualizado em `SPECS.md` com a feature flag e com a semantica de `n/a`/write-back.
- [x] 2026-03-22 20:00Z - Template oficial atualizado para instruir explicitamente o caso `n/a` quando a flag estiver desligada.
- [x] 2026-03-22 20:00Z - Nota documental minima adicionada nas 2 specs historicas sem reescrever historico funcional.
- [x] 2026-03-22 20:00Z - Matriz de validacao do ticket executada e diff final auditado contra o escopo minimo.

## Surprises & Discoveries
- 2026-03-22 00:00Z - `SPECS.md` ja preserva a secao `Retrospectiva sistemica da derivacao dos tickets` como parte da qualidade minima da spec, mas ainda descreve write-back permitido no `codex-flow-runner` sem mencionar a nova feature flag nem o caso `n/a`.
- 2026-03-22 00:00Z - O template oficial repete a mesma lacuna: documenta a secao e sua nota de uso, mas nao orienta que a secao pode permanecer `n/a` quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`.
- 2026-03-22 00:00Z - As specs historicas de 2026-03-19 e 2026-03-20 estao em `Status: attended` e `Spec treatment: done`; a intervencao precisa ser deliberadamente minima para nao parecer reabertura funcional da linhagem.
- 2026-03-22 00:00Z - A propria spec de origem e o ticket reforcam a politica de historico minimo: alinhar o contrato futuro sem migracao retroativa em massa nem reescrita narrativa das entregas antigas.
- 2026-03-22 20:00Z - O ponto menos invasivo para RF-23 foi o `Historico de atualizacao` das specs de 2026-03-19 e 2026-03-20: uma nota historica com a flag atende a rastreabilidade sem alterar secoes funcionais atendidas.
- 2026-03-22 20:00Z - `git diff --` confirmou diff restrito aos 4 artefatos documentais rastreados; o proprio ExecPlan permanece `untracked` no working tree, mas foi atualizado localmente como documento vivo conforme a execucao.

## Decision Log
- 2026-03-22 - Decisao: ancorar o plano apenas nas superficies documentais nomeadas pelo ticket.
  - Motivo: o ticket separa explicitamente o alinhamento canonico/historico do ticket irmao de runtime para manter risco e aceite independentes.
  - Impacto: o plano nao inclui mudancas de codigo, testes nem documentacao operacional fora de `SPECS.md`, template e specs historicas citadas.
- 2026-03-22 - Decisao: validar o fechamento com busca textual e diff focado nos 4 arquivos-alvo, em vez de checklists genericos.
  - Motivo: o usuario pediu que toda validacao nasca do closure criterion do ticket.
  - Impacto: a secao `Validation and Acceptance` fica centrada em evidencias observaveis de conteudo e escopo minimo.
- 2026-03-22 - Decisao: registrar a nota historica nas specs de 2026-03-19 e 2026-03-20 como adendo minimo, sem tocar em status, evidencias ou conclusoes funcionais.
  - Motivo: RF-23 pede nota documental minima, e o ticket proibe reescrever o historico funcional ja concluido.
  - Impacto: a edicao deve ser localizada e facilmente auditavel por diff.
- 2026-03-22 - Decisao: explicitar no contrato canonico que a secao continua obrigatoria/canonica mesmo quando fica `n/a`.
  - Motivo: as assumptions herdadas da spec dizem que a secao continua canonica; a flag controla execucao/write-back automatico, nao a existencia do heading.
  - Impacto: evita interpretacao equivocada de que a feature flag remove a secao do modelo de spec.
- 2026-03-22 - Decisao: registrar RF-23 por meio de nota historica no `Historico de atualizacao` das specs antecedentes.
  - Motivo: esse foi o menor ponto de edicao que preserva o status `attended/done` e deixa explicita a dependencia futura de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`.
  - Impacto: a compatibilizacao historica fica auditavel por diff pequeno, sem mexer em evidencias, CAs ou conclusoes funcionais.
- 2026-03-22 - Decisao: tratar a auditoria final de escopo com `git diff --` para os arquivos rastreados e `git status --short` para incluir o ExecPlan.
  - Motivo: o arquivo de plano fornecido para esta execucao ja estava fora do indice do Git, entao precisava de uma verificacao complementar para registrar seu estado.
  - Impacto: a validacao final cobre tanto o diff rastreado do ticket quanto a atualizacao local obrigatoria do ExecPlan.

## Outcomes & Retrospective
- Status final: execucao documental concluida; validacao final concluida.
- O que deve existir ao final da execucao:
  - contrato documental coerente entre `SPECS.md`, template oficial e historico minimo das specs antecedentes;
  - rastreabilidade explicita entre a spec de origem, os RFs/CAs cobertos por este ticket e as validacoes observaveis do fechamento;
  - diff pequeno e intencional, sem efeitos colaterais fora do escopo.
- O que fica pendente apos este plano:
  - nenhuma pendencia tecnica de runtime neste ticket;
  - qualquer follow-up so deve nascer se a releitura final identificar ambiguidade residual nao coberta pelo fechamento atual.
- Proximos passos:
  - aguardar decisao de fechamento do ticket em etapa separada, ja que esta execucao nao deve fechar ticket nem gerar commit;
  - usar as validacoes registradas abaixo como evidencia quando o fechamento for executado.

## Context and Orientation
- Arquivos principais:
  - `SPECS.md`
  - `docs/specs/templates/spec-template.md`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
  - `docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md`
  - `tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`
- Ticket de origem:
  - `tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-21: `SPECS.md` explicita que a secao `Retrospectiva sistemica da derivacao dos tickets` permanece canonica, mas sua execucao/write-back depende da feature flag estar ligada.
  - RF-22: `docs/specs/templates/spec-template.md` explicita que, com a flag desligada, a secao pode permanecer `n/a` e nao recebe write-back automatico.
  - RF-23: as specs historicas de 2026-03-19 e 2026-03-20 recebem nota documental minima apontando a dependencia futura da feature flag.
  - CA-14: `SPECS.md` e `docs/specs/templates/spec-template.md` ficam consistentes com a ativacao condicional por feature flag.
- Assumptions / defaults adotados:
  - a secao `Retrospectiva sistemica da derivacao dos tickets` continua canonica no modelo de spec;
  - com a flag desligada, a secao pode permanecer `n/a` e nao recebe write-back automatico;
  - o historico das specs ja atendidas nao deve ser reescrito em massa; apenas receber nota minima quando explicitamente tocado por esta entrega;
  - como este ticket nao altera runtime, as validacoes manuais herdadas da spec sobre rodadas reais com a flag em `false`/`true` nao entram no aceite daqui.
- Fluxo atual:
  - `SPECS.md` e o template ainda descrevem a secao sistemica como parte do contrato, mas sem condicionar a execucao/write-back a `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`.
  - As specs de 2026-03-19 e 2026-03-20 narram a capacidade como comportamento implementado e nao registram a dependencia futura introduzida pela nova spec.
- Fluxo alvo deste ticket:
  - o contrato canonico passa a explicar que a secao continua existindo, mas so recebe execucao/write-back automatico quando a flag estiver ligada;
  - o template orienta explicitamente o preenchimento `n/a` quando a flag estiver desligada;
  - as specs historicas ganham nota curta de compatibilizacao futura sem alterar seu status nem o historico da entrega original.
- Restricoes tecnicas:
  - manter fluxo sequencial e separacao `spec -> tickets -> execplan`;
  - preservar o historico funcional das specs antigas;
  - limitar a edicao aos arquivos nomeados pelo ticket e suas referencias diretas.

## Plan of Work
- Milestone 1 - Alinhar o contrato canonico de specs com a feature flag
  - Entregavel: `SPECS.md` descreve a secao `Retrospectiva sistemica da derivacao dos tickets` como canônica, mas condiciona execucao/write-back automatico a `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e deixa claro o caso `n/a`.
  - Evidencia de conclusao: busca textual em `SPECS.md` mostra o nome da flag, a permanencia da secao canonica e a semantica de `n/a`/write-back.
  - Arquivos esperados:
    - `SPECS.md`
- Milestone 2 - Ensinar o template oficial a refletir o mesmo contrato
  - Entregavel: `docs/specs/templates/spec-template.md` orienta explicitamente que a secao pode permanecer `n/a` quando a flag estiver desligada e nao recebe write-back automatico nesse caso.
  - Evidencia de conclusao: busca textual no template mostra a flag e a instrucao de `n/a`.
  - Arquivos esperados:
    - `docs/specs/templates/spec-template.md`
- Milestone 3 - Compatibilizar o historico minimo das specs antecedentes
  - Entregavel: as specs de 2026-03-19 e 2026-03-20 recebem uma nota curta informando que futuras ativacoes dessas etapas passaram a depender de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`.
  - Evidencia de conclusao: `git diff --` das 2 specs mostra apenas a nota minima esperada, sem reescrita ampla de status, historico ou evidencias.
  - Arquivos esperados:
    - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
    - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md` para reabrir o ticket e confirmar escopo, assumptions/defaults e closure criteria antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' SPECS.md` e `sed -n '1,220p' docs/specs/templates/spec-template.md` para localizar exatamente os trechos canonicos que precisam receber a nota sobre feature flag e `n/a`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `SPECS.md` para explicitar que a secao `Retrospectiva sistemica da derivacao dos tickets` continua canonica, mas sua execucao/write-back automatico depende de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, podendo permanecer `n/a` com a flag desligada.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `docs/specs/templates/spec-template.md` para refletir o mesmo contrato, incluindo a orientacao de `n/a` e de ausencia de write-back automatico com a flag desligada.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `sed -n '1,260p' docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` para escolher o ponto menos invasivo onde a nota historica minima sera adicionada.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar as 2 specs historicas com uma nota curta e rastreavel informando que futuras ativacoes dessas etapas passaram a depender de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, sem mudar status, evidencias, milestones nem conclusoes funcionais.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|Retrospectiva sistemica da derivacao dos tickets|n/a|write-back" SPECS.md docs/specs/templates/spec-template.md` para validar o contrato canonico apos a edicao.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED" docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` para confirmar a nota minima nas specs historicas.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- SPECS.md docs/specs/templates/spec-template.md docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` para auditar se o diff permaneceu restrito ao closure criterion documental do ticket.

## Validation and Acceptance
- Matriz `requisito -> validacao observavel`:
  - Requisito: RF-21.
  - Evidencia observavel: `SPECS.md` deixa explicito que a secao `Retrospectiva sistemica da derivacao dos tickets` continua canonica, mas sua execucao/write-back automatico depende de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`.
  - Comando: `rg -n "Retrospectiva sistemica da derivacao dos tickets|RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|write-back" SPECS.md`
    - Esperado: matches no contrato canonico mencionando a secao, o nome da flag e a dependencia da execucao/write-back automatico.
- Matriz `requisito -> validacao observavel`:
  - Requisito: RF-22.
  - Evidencia observavel: `docs/specs/templates/spec-template.md` instrui que, com a flag desligada, a secao pode permanecer `n/a` e nao recebe write-back automatico.
  - Comando: `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|n/a|write-back" docs/specs/templates/spec-template.md`
    - Esperado: matches no template conectando explicitamente a flag ao caso `n/a` e a ausencia de write-back automatico.
- Matriz `requisito -> validacao observavel`:
  - Requisito: CA-14.
  - Evidencia observavel: `SPECS.md` e `docs/specs/templates/spec-template.md` passam a usar a mesma regra textual sobre a secao canonica, a flag e o caso `n/a`.
  - Comando: `git diff -- SPECS.md docs/specs/templates/spec-template.md`
    - Esperado: diff coerente entre contrato canonico e template, sem contradicoes materiais sobre a feature flag.
- Matriz `requisito -> validacao observavel`:
  - Requisito: RF-23.
  - Evidencia observavel: `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` recebem nota documental minima apontando a dependencia futura da feature flag, sem reescrever o historico funcional ja concluido.
  - Comando: `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED" docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
    - Esperado: ambas as specs historicas passam a conter a nota minima com o nome canonico da flag.
  - Comando: `git diff -- docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
    - Esperado: diff pequeno, localizado e sem reescrita ampla de `Status`, `Spec treatment`, evidencias, historico de atualizacao ou resultados funcionais.

## Idempotence and Recovery
- Idempotencia:
  - rereadicionar a mesma nota textual nao deve criar duplicacao; antes de editar, conferir se a flag ja foi mencionada nas 4 superficies;
  - as validacoes por `rg` e `git diff` sao repetiveis e nao alteram o repositorio;
  - como o escopo e apenas documental, repetir a execucao do plano deve produzir somente o mesmo diff minimo ou nenhum diff.
- Riscos:
  - transformar o alinhamento historico minimo em reescrita retroativa ampla das specs de 2026-03-19 e 2026-03-20;
  - introduzir divergencia entre `SPECS.md` e o template, deixando um deles afirmar que a secao e obrigatoria e o outro sugerir que a secao desaparece;
  - usar linguagem ambigua que faca parecer que a flag remove a secao canonica em vez de controlar apenas execucao/write-back automatico.
- Recovery / Rollback:
  - se o diff nas specs historicas crescer alem da nota minima, reverter apenas o excesso e recolocar a observacao em ponto mais localizado;
  - se `SPECS.md` e template divergirem, alinhar primeiro o texto canonico em `SPECS.md` e depois ajustar o template para espelhar a mesma regra;
  - se surgir duvida sobre onde inserir a nota historica, preferir um adendo curto em secao de uso/politica historica ou nota contextual, evitando reescrever secoes de atendimento final.

## Artifacts and Notes
- Artefatos de origem consultados:
  - `tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`
  - `docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `docs/specs/templates/spec-template.md`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- Ticket irmao relevante para fronteira de escopo:
  - `tickets/closed/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md`
- Nota operacional:
  - este ticket e puramente documental; nao ha dependencia de `node`/`npm`/`npx` para o aceite planejado.
- Evidencias executadas nesta etapa:
  - `rg -n "Retrospectiva sistemica da derivacao dos tickets|RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|write-back" SPECS.md`
  - `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED|n/a|write-back" docs/specs/templates/spec-template.md`
  - `rg -n "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED" docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
  - `git diff -- SPECS.md docs/specs/templates/spec-template.md docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
  - `git status --short SPECS.md docs/specs/templates/spec-template.md docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md execplans/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato canônico de criacao/manutencao de specs em `SPECS.md`;
  - template oficial de novas specs em `docs/specs/templates/spec-template.md`;
  - notas documentais historicas nas specs antecedentes de 2026-03-19 e 2026-03-20.
- Compatibilidade:
  - o plano preserva a secao `Retrospectiva sistemica da derivacao dos tickets` como interface canonica do workflow;
  - a mudanca e de compatibilizacao documental com a feature flag ja implementada, sem alterar contratos parseaveis nem comportamento de runtime.
- Dependencias externas e acoplamentos:
  - a coerencia textual depende da spec de origem `2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md`, que fixa RF-21, RF-22, RF-23 e CA-14;
  - o historico minimo das specs de 2026-03-19 e 2026-03-20 deve continuar legivel em conjunto com o ticket P0 ja fechado, que implementou a feature flag no runtime.
