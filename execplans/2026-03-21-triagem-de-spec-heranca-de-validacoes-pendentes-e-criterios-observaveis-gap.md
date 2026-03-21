# ExecPlan - heranca de validacoes pendentes da spec e criterios observaveis do pacote derivado

## Purpose / Big Picture
- Objetivo: tornar obrigatoria e observavel a heranca de `Validacoes pendentes ou manuais` e de `Assumptions and defaults` equivalentes durante a triagem de spec, endurecendo tambem o gate/autocorrecao para detectar essa omissao antes do `/run-all`.
- Resultado esperado:
  - `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` passam a tratar validacoes pendentes/manuais como item explicito de heranca quando relevantes;
  - `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` passam a considerar essa omissao como gap observavel e corrigivel;
  - o runner passa a extrair `inheritedAssumptionsDefaults` tambem de headings equivalentes conhecidos, incluindo `Premissas e defaults`;
  - testes provam que uma spec com esse contexto gera pacote derivado e handoffs com heranca suficiente.
- Escopo:
  - atualizar contrato compartilhado em `docs/workflows/codex-quality-gates.md`;
  - reforcar triagem, gate e autocorrecao em `prompts/01...`, `prompts/09...` e `prompts/10...`;
  - alinhar `SPECS.md` e, se necessario, `docs/specs/templates/spec-template.md` sobre heading canonico e compatibilidade com aliases de entrada;
  - ajustar extracao em `src/core/runner.ts` e ampliar testes em `src/core/runner.test.ts`.
- Fora de escopo:
  - alterar o contrato do ticket transversal de workflow;
  - criar heuristica frouxa por ticket individual;
  - adicionar novos tipos de gap alem dos ja previstos no contrato atual;
  - modificar o fluxo de publish/git do runner.

## Progress
- [x] 2026-03-21 18:13Z - Gap funcional confirmado no ticket pai e superfices compartilhadas de triagem/gate/extracao mapeadas.
- [x] 2026-03-21 19:07Z - Contrato documental de heranca e gate endurecido em `codex-quality-gates.md`, prompts 01/09/10, `SPECS.md` e template de spec.
- [x] 2026-03-21 19:10Z - Extracao alias-aware implementada no runner e validacao automatizada concluida com `npm test -- src/core/runner.test.ts src/core/spec-ticket-validation.test.ts` e `npm run check`.

## Surprises & Discoveries
- 2026-03-21 18:13Z - A taxonomia do gate ja inclui `closure-criteria-gap` e `spec-inheritance-gap`; o problema atual e de instrucao/criterio, nao de parser/tipos.
- 2026-03-21 18:13Z - A fixture `createSpecFileContent` em `src/core/runner.test.ts` ja materializa a secao `Validacoes pendentes ou manuais`, entao existe base pronta para testar a heranca faltante.
- 2026-03-21 18:13Z - O template canonico de spec ja usa `## Assumptions and defaults`; o caso falho veio de spec externa com `## Premissas e defaults`, portanto a correcao precisa ser resiliente a input legado/externo sem abandonar o heading preferido.
- 2026-03-21 18:13Z - O extrator atual `extractTopLevelBulletItems` depende de heading exato e nao tem aliasing, o que explica a perda silenciosa de contexto no handoff sistemico.
- 2026-03-21 19:10Z - A retrospectiva pre-`/run-all` so executa no cenario correto quando o gate carrega historico funcional revisado (`NO_GO -> autocorrecao -> GO`), entao o teste de prova precisou simular esse caminho real em vez de forcar um passe `GO` direto.

## Decision Log
- 2026-03-21 - Decisao: promover `Validacoes pendentes ou manuais` a item explicito do contrato compartilhado de triagem e do gate.
  - Motivo: o pacote derivado precisa carregar essas validacoes quando elas influenciam cobertura e aceite dos tickets.
  - Impacto: `codex-quality-gates.md`, prompt 01 e prompt 09/10 precisam refletir essa exigencia de forma observavel.
- 2026-03-21 - Decisao: suportar aliases conhecidos de heading para assumptions/defaults no runner, em vez de correspondencia aproximada aberta.
  - Motivo: `Premissas e defaults` e `Assumptions and defaults` sao variantes conhecidas e suficientes para o caso atual sem introduzir heuristica fragil.
  - Impacto: o extrator provavelmente deve aceitar uma lista ordenada de headings equivalentes.
- 2026-03-21 - Decisao: manter `Assumptions and defaults` como heading canonico do repositorio e tratar aliases apenas como compatibilidade de entrada.
  - Motivo: o template local e `SPECS.md` ja apontam para esse heading como norma.
  - Impacto: a documentacao deve reforcar "preferido/canonico" sem impedir consumo resiliente de specs externas.
- 2026-03-21 - Decisao: provar a correcao por fixture/teste do runner e por leitura das instrucoes compartilhadas, sem depender de rodada manual completa do gate.
  - Motivo: o comportamento desejado e deterministico e local a docs/prompts/extrator.
  - Impacto: os testes devem fazer assercao direta sobre contexto herdado e o markdown/trace associado.
- 2026-03-21 - Decisao: provar o alias conhecido dentro da retrospectiva pre-`/run-all`, e nao por teste unitario isolado do extrator.
  - Motivo: isso garante que o contexto herdado realmente chega ao handoff e ao ticket transversal publicado, cobrindo a integracao mais sensivel do gap real.
  - Impacto: o teste do runner precisou montar um ciclo com historico funcional revisado para ativar a retrospectiva.

## Outcomes & Retrospective
- Status final: implementacao, validacao e fechamento do ticket concluidos; versionamento deste changeset em andamento nesta rodada.
- O que deve existir ao final:
  - checklist e prompt de triagem explicitando heranca de validacoes pendentes/manuais;
  - gate/autocorrecao capazes de tratar a omissao dessa heranca como gap observavel antes do `/run-all`;
  - extracao de assumptions/defaults resiliente a `Assumptions and defaults` e `Premissas e defaults`;
  - testes mostrando que o contexto herdado chega aos artefatos relevantes.
- O que fica pendente apos este plano:
  - versionar o changeset;
  - eventualmente ampliar a lista de aliases apenas se novos casos reais surgirem.
- Proximos passos:
  - fazer commit/push do changeset;
  - monitorar novos casos reais antes de ampliar a lista de aliases alem de `Assumptions and defaults` e `Premissas e defaults`.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md` - ticket executor deste plano.
  - `tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md` - ticket pai fechado por split-follow-up.
  - `docs/workflows/codex-quality-gates.md` - checklist compartilhado do fluxo.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` - triagem/derivacao inicial dos tickets.
  - `prompts/09-validar-tickets-derivados-da-spec.md` - gate funcional do pacote derivado.
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md` - autocorrecao do pacote.
  - `SPECS.md` e `docs/specs/templates/spec-template.md` - contrato canonico da spec local.
  - `src/core/runner.ts` - extracao de assumptions/defaults e montagem do handoff sistemico.
  - `src/core/runner.test.ts` - fixture e cobertura principal para essa heranca.
- Spec de origem:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
- RFs/CAs cobertos por este plano:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes obrigatorias ainda nao automatizadas`
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes manuais pendentes`
- Assumptions / defaults adotados:
  - validacoes pendentes/manuais da spec devem ser herdadas quando forem relevantes para cobertura ou aceite dos tickets derivados;
  - `Assumptions and defaults` continua sendo o heading canonico deste repositorio;
  - `Premissas e defaults` deve ser aceito como alias de compatibilidade para entrada externa/legada;
  - o gate deve apontar a omissao dessa heranca antes do `/run-all`, preferencialmente via `spec-inheritance-gap` e/ou `closure-criteria-gap`;
  - a correcao nao deve exigir interpretacao manual por ticket quando a spec ja expoe essas validacoes de forma estruturada.
- Fluxo atual relevante:
  - a triagem atual enfatiza RFs/CAs, assumptions/defaults e nao-escopo;
  - o gate ja conhece `spec-inheritance-gap` e `closure-criteria-gap`, mas ainda precisa tornar essa situacao um caso esperado e verificavel;
  - o runner extrai assumptions/defaults por heading exato em ingles.
- Restricoes tecnicas:
  - manter o contrato canonico `spec -> tickets`;
  - evitar heuristica aberta ou matching frouxo de headings;
  - preferir provas deterministicas via testes/fixtures existentes.

## Plan of Work
- Milestone 1: endurecer o contrato compartilhado da triagem.
  - Entregavel: checklist de `codex-quality-gates.md` e prompt 01 passam a exigir heranca explicita de `Validacoes pendentes ou manuais` quando a spec as trouxer de forma relevante.
  - Evidencia de conclusao: leitura dos artefatos mostra essa exigencia ao lado de RFs/CAs, assumptions/defaults e closure criteria.
  - Arquivos esperados: `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Milestone 2: tornar o gate/autocorrecao observavel para esse gap.
  - Entregavel: prompts 09 e 10 tratam ausencia dessa heranca como caso esperado de `spec-inheritance-gap` e/ou `closure-criteria-gap`, com orientacao de correcao segura.
  - Evidencia de conclusao: os prompts passam a citar explicitamente validacoes pendentes/manuais como item a ser conferido e corrigido.
  - Arquivos esperados: `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md`.
- Milestone 3: tornar a extracao de assumptions/defaults resiliente e comprovada.
  - Entregavel: `runner.ts` suporta headings equivalentes conhecidos e os testes demonstram a heranca de contexto para spec com `Premissas e defaults`.
  - Evidencia de conclusao: suite relevante do runner passa com fixture cobrindo alias de heading e contexto herdado.
  - Arquivos esperados: `SPECS.md`, possivelmente `docs/specs/templates/spec-template.md`, `src/core/runner.ts`, `src/core/runner.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' docs/workflows/codex-quality-gates.md`, `sed -n '1,240p' prompts/01-avaliar-spec-e-gerar-tickets.md`, `sed -n '1,260p' prompts/09-validar-tickets-derivados-da-spec.md` e `sed -n '1,260p' prompts/10-autocorrigir-tickets-derivados-da-spec.md` para localizar o contrato atual de triagem/gate.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Assumptions and defaults|Premissas e defaults|Validacoes pendentes ou manuais|spec-inheritance-gap|closure-criteria-gap" docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md SPECS.md docs/specs/templates/spec-template.md src/core/runner.ts src/core/runner.test.ts` para mapear os pontos de ajuste.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` para exigir heranca de `Validacoes pendentes ou manuais` quando presente e relevante.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` para tornar a omissao dessa heranca um caso esperado de validacao/autocorrecao.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `SPECS.md` e, apenas se necessario para reforco explicito, `docs/specs/templates/spec-template.md` para documentar `Assumptions and defaults` como heading canonico e `Premissas e defaults` como alias de compatibilidade de entrada.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para extrair assumptions/defaults a partir de uma lista ordenada de headings aceitos, mantendo comportamento deterministico.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts` para adicionar fixture/cenario com `Premissas e defaults` e para verificar heranca observavel de validacoes pendentes/manuais no fluxo relevante.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/core/runner.test.ts src/core/spec-ticket-validation.test.ts` para validar extracao e integracao com o gate.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para garantir que a ampliacao do contrato e das assinaturas nao introduziu regressao de tipos.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md SPECS.md docs/specs/templates/spec-template.md src/core/runner.ts src/core/runner.test.ts` para auditar o escopo final antes do fechamento.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: checklist e prompt de triagem tratam `Validacoes pendentes ou manuais` como item explicito de heranca quando presente na spec e relevante para os tickets derivados.
  - Evidencia observavel: os documentos mencionam essa heranca ao lado de RFs/CAs, assumptions/defaults e closure criteria.
  - Comando: `rg -n "Validacoes pendentes ou manuais|heranca|closure criteria|Source requirements" docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md`
  - Esperado: matches explicitos instruindo a heranca dessas validacoes para os tickets derivados.
- Matriz requisito -> validacao observavel:
  - Requisito: o fluxo suporta ao menos `Assumptions and defaults` e `Premissas e defaults` para extrair contexto herdado.
  - Evidencia observavel: o runner passa em teste com spec fixture usando o heading em portugues e continua aceitando o heading canonico.
  - Comando: `npm test -- src/core/runner.test.ts`
  - Esperado: existe cobertura verde para as duas variantes de heading e para o contexto herdado resultante.
- Matriz requisito -> validacao observavel:
  - Requisito: prompts 09 e 10 tornam observavel e corrigivel a ausencia dessa heranca antes do `/run-all`.
  - Evidencia observavel: os prompts citam explicitamente `spec-inheritance-gap` e/ou `closure-criteria-gap` para casos em que validacoes pendentes/manuais da spec nao aparecerem no pacote derivado.
  - Comando: `rg -n "spec-inheritance-gap|closure-criteria-gap|Validacoes pendentes ou manuais" prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - Esperado: os prompts descrevem a deteccao e a correcao desse gap como comportamento esperado.
- Matriz requisito -> validacao observavel:
  - Requisito: a mudanca preserva a tipagem e o contrato do repositorio.
  - Evidencia observavel: TypeScript e a suite relevante passam sem erros.
  - Comando: `npm run check`
  - Esperado: compilacao sem erros de tipos.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a implementacao deve apenas reforcar as mesmas regras de heranca e os mesmos aliases conhecidos, sem duplicar instrucoes nem ampliar heuristicas;
  - os testes do runner devem continuar deterministas com as mesmas fixtures;
  - o heading canonico local deve permanecer `Assumptions and defaults` mesmo apos aceitar alias de compatibilidade.
- Riscos:
  - tornar a heranca obrigatoria de modo indiscriminado, mesmo quando a validacao pendente nao tiver relevancia para o ticket especifico;
  - aceitar alias demais e introduzir falso-positivo na extracao de headings;
  - mudar prompts sem refletir o mesmo criterio no checklist compartilhado, ou vice-versa;
  - ajustar docs/prompts e esquecer de provar a heranca real no runner.
- Recovery / Rollback:
  - se a regra de heranca ficar ampla demais, restringir a linguagem para "quando presente e relevante para cobertura/aceite";
  - se novos aliases gerarem ambiguidade, voltar para a lista minima conhecida (`Assumptions and defaults`, `Premissas e defaults`);
  - se os prompts divergirem do checklist, usar `docs/workflows/codex-quality-gates.md` como fonte normativa e realinhar os prompts;
  - se a prova em teste ficar fragil, preferir fixture explicita no `runner.test.ts` em vez de depender de comportamento incidental.

## Artifacts and Notes
- Ticket executor:
  - `tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md`
- Ticket pai:
  - `tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md`
- Spec externa que motivou o gap:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
- Referencias principais do planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - `SPECS.md`
  - `docs/specs/templates/spec-template.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/spec-ticket-validation.ts`
- Observacao operacional:
  - como `spec-inheritance-gap` e `closure-criteria-gap` ja existem no parser/tipos, o foco da implementacao deve permanecer em instrucoes e evidencias, nao em ampliar taxonomia.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato textual da triagem e do gate em `docs/workflows/codex-quality-gates.md`, `prompts/01...`, `prompts/09...` e `prompts/10...`;
  - comportamento de extracao de assumptions/defaults em `src/core/runner.ts`;
  - possivel documentacao complementar em `SPECS.md`.
- Compatibilidade:
  - preservar `Assumptions and defaults` como heading canonico do repositorio;
  - aceitar `Premissas e defaults` apenas como compatibilidade de entrada;
  - preservar a taxonomia de gaps ja aceita por `src/types/spec-ticket-validation.ts` e `src/integrations/spec-ticket-validation-parser.ts`.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova esperada;
  - a principal fixture aproveitavel ja existe em `src/core/runner.test.ts`;
  - os prompts e o checklist sao dependencias normativas do comportamento esperado do gate.
