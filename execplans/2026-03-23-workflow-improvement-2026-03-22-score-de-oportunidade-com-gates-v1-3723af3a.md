# ExecPlan - heranca de RNFs e restricoes tecnicas na derivacao de tickets de spec

## Purpose / Big Picture
- Objetivo: endurecer o contrato `spec -> tickets` para que RNFs e restricoes tecnicas/documentais relevantes da spec sejam extraidos, herdados e validados explicitamente quando afetarem implementacao, aceite, documentacao ou criterios de fechamento.
- Resultado esperado:
  - `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` passam a exigir extracao e heranca explicita de RNFs e restricoes tecnicas/documentais relevantes;
  - `INTERNAL_TICKETS.md` passa a tratar RNFs e restricoes tecnicas relevantes como parte da rastreabilidade minima do ticket derivado quando esses itens influenciarem implementacao, aceite ou documentacao;
  - `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` passam a tratar a ausencia dessa heranca como gap observavel e corrigivel antes do `/run-all`, sem criar taxonomia nova desnecessaria;
  - uma prova deterministica mostra uma spec com RNF e obrigacao documental gerando pacote derivado que ja nasce com esses itens herdados e chega ao `GO` sem depender de correcao manual equivalente a desta rodada.
- Escopo:
  - atualizar o checklist compartilhado de qualidade;
  - atualizar o contrato minimo de tickets internos;
  - reforcar triagem, gate funcional e autocorrecao nos prompts compartilhados;
  - adicionar prova automatizada/deterministica do contrato revisado no fluxo `run_specs`.
- Fora de escopo:
  - implementar mudancas em projetos alvo externos;
  - fechar o ticket, commitar ou publicar o changeset;
  - criar nova taxonomia de gaps se `spec-inheritance-gap` e `closure-criteria-gap` ja cobrirem o caso;
  - migrar retroativamente tickets/specs historicos sem necessidade funcional.

## Progress
- [x] 2026-03-23 02:43Z - Ticket, referencias obrigatorias, spec de origem, checklist compartilhado e artefatos do workflow relidos; planejamento inicial concluido.
- [x] 2026-03-23 02:51Z - Contrato documental de triagem/ticket/gate atualizado e alinhado entre checklist, `INTERNAL_TICKETS.md` e prompts.
- [x] 2026-03-23 02:51Z - Prova deterministica de nao regressao adicionada e validada no fluxo relevante.
- [x] 2026-03-23 02:51Z - Matriz de validacao observavel executada com sucesso (`rg`, `npx tsx --test ...`, `npm run check`) e diff final revisado no escopo do ticket.

## Surprises & Discoveries
- 2026-03-23 02:43Z - O gap atual nao e duplicata do ticket fechado em `2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md`: a frente anterior endureceu validacoes pendentes/manuais e aliases de assumptions/defaults, mas nao tornou RNFs e restricoes tecnicas/documentais heranca obrigatoria.
- 2026-03-23 02:43Z - A spec de origem do caso auditado ja registrou explicitamente `RNF-02`, `Restrições técnicas relevantes` e a exigencia de revisar `README.md` quando o calculo muda; o `Ciclo 0` do gate ficou em `NO_GO` justamente por essas omissoes, e o `Ciclo 1` virou `GO` apenas apos correcao manual do ticket derivado.
- 2026-03-23 02:43Z - `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md` e `INTERNAL_TICKETS.md` hoje enfatizam RFs/CAs, assumptions/defaults e validacoes pendentes/manuais, deixando RNFs e restricoes tecnicas como contexto implicito.
- 2026-03-23 02:43Z - O gate ja possui `spec-inheritance-gap` e `closure-criteria-gap`, e a autocorrecao ja aceita corrigir tickets abertos nesses casos; a lacuna principal e de instrucao/criterio compartilhado, nao necessariamente de parser ou de tipos.
- 2026-03-23 02:43Z - A fixture `createSpecFileContent` em `src/core/runner.test.ts` ja materializa `Restricoes tecnicas relevantes` e `Validacoes pendentes ou manuais`, o que viabiliza uma prova deterministica sem depender de projeto externo real.
- 2026-03-23 02:43Z - `renderSpecTicketValidationPackageContext` em `src/core/runner.ts` ja injeta a spec inteira e os tickets derivados no gate; isso sugere que a remediacao deve ficar concentrada em docs/prompts/testes, tocando runtime apenas se a prova expuser ausencia de contexto estruturado indispensavel.
- 2026-03-23 02:51Z - A prova deterministica passou apenas com docs/prompts/testes: nao foi necessario tocar `src/core/runner.ts`, porque o package context ja expunha a spec completa e o conteudo integral dos tickets derivados ao gate funcional.
- 2026-03-23 02:51Z - A menor prova util foi dividir a cobertura entre um teste de package context (`runner.test.ts`) e um teste do gate chegando a `GO` sem autocorrecao (`spec-ticket-validation.test.ts`), em vez de criar um fluxo paralelo mais pesado.

## Decision Log
- 2026-03-23 - Decisao: promover RNFs e restricoes tecnicas/documentais relevantes a itens explicitos de heranca no contrato compartilhado, em vez de tratá-los como detalhes informais da spec.
  - Motivo: o caso real auditado mostrou que esses itens influenciam implementacao, observabilidade e fechamento, portanto precisam ser visiveis desde a triagem.
  - Impacto: `codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md` e `INTERNAL_TICKETS.md` devem ser alinhados.
- 2026-03-23 - Decisao: manter a taxonomia atual do gate e usar `spec-inheritance-gap` e `closure-criteria-gap` para RNFs e restricoes tecnicas/documentais herdadas.
  - Motivo: o problema observado e falta de obrigatoriedade contratual, nao ausencia de categoria semantica.
  - Impacto: a correcao pode focar em instrucoes compartilhadas e cobertura de testes, evitando churn desnecessario em tipos/parsers.
- 2026-03-23 - Decisao: tratar obrigacao de atualizar `README.md` neste caso como restricao tecnica/documental herdada da spec, e nao como checklist generico de documentacao.
  - Motivo: a propria spec de origem liga a revisao documental a mudanca material do calculo de score.
  - Impacto: a linguagem do gate e do ticket deve exigir essa observabilidade apenas quando a spec a impuser.
- 2026-03-23 - Decisao: provar a nao regressao com fixture/teste deterministico no fluxo `run_specs`, preferindo superfices de teste ja existentes.
  - Motivo: o closure criterion pede evidencia observavel do contrato revisado, e o repositório ja tem harnesses para spec, gate e retrospectiva pre-`/run-all`.
  - Impacto: `src/core/runner.test.ts` e/ou `src/core/spec-ticket-validation.test.ts` sao os candidatos principais para a prova; tocar `src/core/runner.ts` so se a validacao expuser carencia real de contexto estruturado.
- 2026-03-23 - Decisao: manter o label existente `Source requirements (RFs/CAs, when applicable)` nos fixtures/testes e carregar RNFs/restricoes tecnicas no valor do campo, sem criar mudanca estrutural adicional em parser/template.
  - Motivo: o ticket pede endurecimento contratual e evidencia observavel, nao um rename de metadata que ampliaria o escopo sem necessidade.
  - Impacto: a correcao permanece compatível com o runtime atual e com os tickets existentes.

## Outcomes & Retrospective
- Status final: execucao concluida e validada localmente; sem blockers.
- O que deve existir ao final:
  - triagem compartilhada exigindo RNFs e restricoes tecnicas/documentais relevantes como heranca explicita;
  - contrato minimo do ticket derivado cobrindo esses itens quando influenciarem implementacao, aceite ou documentacao;
  - gate/autocorrecao capazes de apontar e corrigir a omissao dessa heranca antes do `/run-all`;
  - prova deterministica do fluxo revisado sem depender da correcao manual equivalente observada na rodada auditada.
- O que fica pendente apos este plano:
  - nenhum pendente tecnico local identificado nesta etapa; fechamento de ticket/versionamento seguem fora de escopo por contrato deste prompt.
- Proximos passos:
  - usar este changeset na etapa posterior de revisao/finalizacao do ticket, sem reabrir escopo.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-03-23-workflow-improvement-2026-03-22-score-de-oportunidade-com-gates-v1-3723af3a.md` - ticket executor deste plano.
  - `docs/workflows/codex-quality-gates.md` - checklist compartilhado que hoje orienta triagem, ExecPlan, execucao e fechamento.
  - `INTERNAL_TICKETS.md` - contrato minimo do ticket derivado que precisa absorver RNFs/restricoes tecnicas relevantes.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` - triagem inicial `spec -> tickets`.
  - `prompts/09-validar-tickets-derivados-da-spec.md` - gate funcional do pacote derivado.
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md` - write set permitido para autocorrecao segura.
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` - contexto da retrospectiva que revelou o gap.
  - `src/core/runner.ts` - contexto do gate e do fluxo `run_specs`; tocar apenas se a prova exigir contexto adicional.
  - `src/core/runner.test.ts` - harness/fixtures do fluxo `run_specs`, inclusive com `Restricoes tecnicas relevantes` e historico `NO_GO -> GO`.
  - `src/core/spec-ticket-validation.test.ts` - testes do gate e da revalidacao.
- Spec de origem:
  - `../guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md`
- RFs/CAs cobertos por este plano:
  - `RNF-02`
  - `Restrições técnicas relevantes`
  - `Restrição técnica: revisão de documentação`
- Assumptions / defaults adotados:
  - RNFs e restricoes tecnicas/documentais da spec so precisam ser herdados explicitamente nos tickets cujo escopo, aceite ou fechamento dependam deles; nao ha exigencia de duplicacao literal em todo ticket do pacote.
  - A ausencia dessa heranca deve continuar sendo tratada com a taxonomia existente do gate, preferencialmente por `spec-inheritance-gap` e/ou `closure-criteria-gap`.
  - A exigencia de revisar `README.md` neste caso nasce da spec auditada e deve ser validada como criterio observavel de fechamento, nao como regra universal de toda mudanca.
  - A prova de nao regressao pode ser local e deterministica, desde que demonstre o contrato compartilhado revisado e um pacote derivado que chegue ao `GO` sem correcao manual equivalente.
  - O contrato canonico do repositório permanece `spec -> tickets` e `ticket -> execplan` quando necessario.
- Fluxo atual relevante:
  - `spec-triage` cria tickets derivados a partir da spec via prompt compartilhado;
  - `spec-ticket-validation` reavalia o pacote completo e pode autocorrigir tickets abertos;
  - `spec-ticket-derivation-retrospective` analisa `NO_GO -> GO` reaproveitavel e publica ticket transversal no workflow;
  - o caso real auditado mostrou que RNF-02 e a revisao observavel de `README.md` entraram tarde demais, apenas apos correcao manual do ticket de implementacao.
- Restricoes tecnicas:
  - manter fluxo sequencial;
  - evitar dependencia de projeto externo ou rodada manual nao deterministica para provar a correcao;
  - nao ampliar o contrato para retrofits historicos em massa;
  - tocar runtime do runner apenas se docs/prompts/testes nao forem suficientes para garantir a evidencia observavel pedida pelo ticket.

## Plan of Work
- Milestone 1: tornar a heranca obrigatoria na triagem e no contrato minimo do ticket.
  - Entregavel: checklist compartilhado, prompt de triagem e `INTERNAL_TICKETS.md` passam a exigir que RNFs e restricoes tecnicas/documentais relevantes da spec aparecam explicitamente no ticket derivado quando influenciarem implementacao, aceite, documentacao ou fechamento.
  - Evidencia de conclusao: leitura dos artefatos mostra a exigencia ao lado de RFs/CAs, assumptions/defaults e validacoes pendentes/manuais, sem ambiguidade sobre quando herdar.
  - Arquivos esperados: `docs/workflows/codex-quality-gates.md`, `INTERNAL_TICKETS.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Milestone 2: endurecer o gate funcional e a autocorrecao para essa lacuna.
  - Entregavel: os prompts 09 e 10 passam a explicitar que a falta de RNFs e restricoes tecnicas/documentais herdadas, ou de closure criteria que as tornem observaveis, deve virar gap observavel/corrigivel antes do `/run-all`.
  - Evidencia de conclusao: os prompts passam a citar RNFs e obrigacoes tecnicas/documentais herdadas como alvo da verificacao/correcao dentro da taxonomia existente.
  - Arquivos esperados: `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md`.
- Milestone 3: adicionar prova deterministica de nao regressao do contrato revisado.
  - Entregavel: fixture/teste/trace local mostra uma spec com RNF e obrigacao documental relevante gerando pacote derivado com esses itens ja herdados e apto a chegar ao `GO` sem correcao manual equivalente.
  - Evidencia de conclusao: teste direcionado fica verde e/ou assertiva de trace comprova a presenca desses itens no pacote e no fechamento esperado.
  - Arquivos esperados: `src/core/runner.test.ts`, possivelmente `src/core/spec-ticket-validation.test.ts`, e `src/core/runner.ts` apenas se a prova revelar ausencia real de contexto estruturado.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' docs/workflows/codex-quality-gates.md`, `sed -n '1,240p' INTERNAL_TICKETS.md`, `sed -n '1,220p' prompts/01-avaliar-spec-e-gerar-tickets.md`, `sed -n '1,260p' prompts/09-validar-tickets-derivados-da-spec.md` e `sed -n '1,220p' prompts/10-autocorrigir-tickets-derivados-da-spec.md` para fixar o contrato atual antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RNF|restric|technical|documentation|spec-inheritance-gap|closure-criteria-gap|Source requirements|Inherited assumptions" docs/workflows/codex-quality-gates.md INTERNAL_TICKETS.md prompts src/core/runner.test.ts src/core/spec-ticket-validation.test.ts` para mapear lacunas e pontos de prova existentes.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `docs/workflows/codex-quality-gates.md` para que o checklist de triagem e de ExecPlan exija extracao/heranca de RNFs e restricoes tecnicas/documentais relevantes, e para que a checklist de execucao/fechamento reforce a validacao observavel desses itens quando aplicaveis.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `INTERNAL_TICKETS.md` para incluir RNFs e restricoes tecnicas relevantes na rastreabilidade minima do ticket derivado, sempre condicionando a exigencia a impacto real em implementacao, aceite ou documentacao.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/01-avaliar-spec-e-gerar-tickets.md` para instruir explicitamente a triagem a extrair RNFs e restricoes tecnicas/documentais relevantes da spec, refleti-los em `Source requirements` e/ou no contexto herdado do ticket e tornar observavel o fechamento correspondente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` para que RNFs e obrigacoes tecnicas/documentais herdadas sejam verificadas e corrigidas com a taxonomia atual, sem inventar requisitos alem da spec.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/core/runner.test.ts` e `src/core/spec-ticket-validation.test.ts` e adicionar com `apply_patch` a menor prova deterministica suficiente: uma fixture de spec com `RNF-02` e exigencia documental observavel, um pacote derivado que ja nasce com essa heranca e um caminho de validacao que chegue a `GO` sem autocorrecao equivalente; tocar `src/core/runner.ts` apenas se o teste expuser falta real de contexto estruturado para o gate.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/core/spec-ticket-validation.test.ts` para validar a prova de nao regressao e o gate compartilhado.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar que as alteracoes nao quebraram tipagem ou contratos internos.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- docs/workflows/codex-quality-gates.md INTERNAL_TICKETS.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md src/core/runner.ts src/core/runner.test.ts src/core/spec-ticket-validation.test.ts` para auditar escopo final e conferir se a mudanca permaneceu restrita ao contrato visado pelo ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: contrato de triagem `spec -> tickets`.
  - Evidencia observavel: `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` passam a exigir extracao e heranca explicita de RNFs e restricoes tecnicas/documentais relevantes quando esses itens impactarem implementacao, documentacao ou criterios de fechamento.
  - Comando: `rg -n "RNF|restric|tecnic|documenta" docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md`
  - Esperado: ocorrencias explicitas exigindo essa heranca no contrato de triagem.
- Matriz requisito -> validacao observavel:
  - Requisito: contrato minimo do ticket derivado.
  - Evidencia observavel: `INTERNAL_TICKETS.md` passa a exigir rastreabilidade de RNFs e restricoes tecnicas relevantes quando elas influenciarem implementacao, aceite ou documentacao.
  - Comando: `rg -n "RNF|restric|tecnic|documenta|rastreabilidade" INTERNAL_TICKETS.md`
  - Esperado: texto explicito ligando o contrato minimo do ticket a RNFs/restricoes tecnicas relevantes, sem reduzir rastreabilidade pratica a RF/CA.
- Matriz requisito -> validacao observavel:
  - Requisito: gate funcional e autocorrecao do pacote derivado.
  - Evidencia observavel: `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` passam a tratar a ausencia dessa heranca como gap observavel e corrigivel antes do `/run-all`.
  - Comando: `rg -n "RNF|restric|tecnic|documenta|spec-inheritance-gap|closure-criteria-gap" prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - Esperado: os prompts conectam RNFs/restricoes tecnicas herdadas aos gaps existentes e a correcao segura correspondente.
- Matriz requisito -> validacao observavel:
  - Requisito: prova de nao regressao do contrato.
  - Evidencia observavel: teste, fixture ou trace deterministico mostra uma spec com RNF e obrigacao documental gerando ticket derivado que ja nasce com esses itens herdados e chega ao `GO` sem depender de correcao manual equivalente a desta rodada.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/core/spec-ticket-validation.test.ts`
  - Esperado: suite verde com assertivas cobrindo a heranca de RNF/restricao tecnica/documental e o caminho de validacao sem correcao manual equivalente.
- Validacao complementar de consistencia:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: `tsc --noEmit` conclui sem erros.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a implementacao deve apenas reforcar a mesma exigencia contratual em docs/prompts/testes, sem duplicar campos nem ampliar o escopo alem de RNFs e restricoes tecnicas/documentais relevantes;
  - a prova deterministica deve continuar valida com as mesmas fixtures, sem depender de dados externos variaveis;
  - o gate deve continuar usando a mesma taxonomia, evitando churn em parsers/tipos quando nao houver necessidade real.
- Riscos:
  - tornar obrigatoria a heranca literal de todo RNF/restricao em todos os tickets, criando ruido e falso positivo;
  - endurecer o gate sem alinhar `INTERNAL_TICKETS.md`, gerando conflito entre contrato minimo e verificacao;
  - confiar apenas em texto de prompt sem adicionar prova deterministica suficiente do fluxo revisado;
  - descobrir tardiamente que o runner precisa de contexto estruturado adicional para a prova passar.
- Recovery / Rollback:
  - se a linguagem ficar ampla demais, restringir para "quando influenciarem implementacao, aceite, documentacao ou fechamento";
  - se a prova falhar por falta de contexto no runtime, fazer o menor ajuste em `src/core/runner.ts` necessario para expor o contexto ja presente na spec, sem mudar o contrato canonico;
  - se a cobertura automatizada ficar fragil por depender de texto integral de prompt, preferir asserts sobre obrigacoes-chave e traces/fixtures locais em vez de snapshots extensos;
  - se surgirem efeitos colaterais em parsers/tipos, voltar a mudanca de runtime e manter a remediacao no nivel documental ate haver evidencia de necessidade adicional.

## Artifacts and Notes
- Ticket executor:
  - `tickets/open/2026-03-23-workflow-improvement-2026-03-22-score-de-oportunidade-com-gates-v1-3723af3a.md`
- Spec de origem:
  - `../guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md`
- Artefatos da retrospectiva que abriram o ticket:
  - `../guiadomus-enrich-score/.codex-flow-runner/flow-traces/responses/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-response.md`
  - `../guiadomus-enrich-score/.codex-flow-runner/flow-traces/decisions/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-decision.json`
- Caso funcional que evidenciou o gap:
  - `../guiadomus-enrich-score/tickets/closed/2026-03-22-implementar-gated-opportunity-score-v1.md`
- Ticket sistemico anterior relacionado, mas nao duplicado:
  - `tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md`
- Referencias principais do planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `INTERNAL_TICKETS.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/core/spec-ticket-validation.test.ts`
- Observacao operacional:
  - o repositório ja tem cobertura para aliases de assumptions/defaults e para o ciclo `NO_GO -> autocorrecao -> GO`; a nova prova deve reaproveitar esses harnesses em vez de criar fluxo paralelo.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato textual da triagem em `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md`;
  - contrato minimo do ticket derivado em `INTERNAL_TICKETS.md`;
  - contrato textual do gate/autocorrecao em `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md`;
  - superfice de prova do fluxo em `src/core/runner.test.ts` e/ou `src/core/spec-ticket-validation.test.ts`.
- Compatibilidade:
  - preservar o contrato canonico `spec -> tickets` e `ticket -> execplan`;
  - preservar a taxonomia atual de gaps (`spec-inheritance-gap`, `closure-criteria-gap`, `documentation-compliance-gap` etc.) salvo evidencia contraria;
  - manter a exigencia de heranca condicionada a relevancia funcional/documental do ticket, evitando overfitting em backlog derivado.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova esperada;
  - os mocks/harnesses de `run_specs`, `spec-ticket-validation` e fixture de spec existentes devem ser reutilizados;
  - a spec externa auditada e seus traces servem como referencia de comportamento, nao como dependencia de execucao do teste local.
