# ExecPlan - separacao do gate funcional e write-back da retrospectiva da derivacao

## Purpose / Big Picture
- Objetivo: remover a semantica sistemica do contrato de `spec-ticket-validation`, criar write-back dedicado para `Retrospectiva sistemica da derivacao dos tickets` e alinhar template/spec docs/resumo final para que o pre-run-all exponha fronteiras funcionais e documentais coerentes.
- Resultado esperado:
  - `prompts/09-validar-tickets-derivados-da-spec.md`, `src/types/spec-ticket-validation.ts` e `src/integrations/spec-ticket-validation-parser.ts` deixam de aceitar ou transportar melhoria sistemica do workflow dentro do gate funcional;
  - `src/core/runner.ts` passa a persistir apenas resultado funcional em `Gate de validacao dos tickets derivados` e ganha write-back dedicado para `Retrospectiva sistemica da derivacao dos tickets` quando o projeto ativo e o proprio `codex-flow-runner`;
  - `docs/specs/templates/spec-template.md`, `SPECS.md` e o resumo final de `/run_specs` deixam explicita a separacao entre gate funcional, retrospectiva sistemica da derivacao e retrospectiva sistemica pos-`spec-audit`.
- Escopo:
  - limpeza do contrato funcional de `spec-ticket-validation`;
  - persistencia/write-back da nova secao retrospectiva na spec corrente;
  - alinhamento documental do template global e da politica `SPECS.md`;
  - endurecimento do resumo final do Telegram e da cobertura automatizada aderente aos closure criteria.
- Fora de escopo:
  - reabrir a orquestracao de `spec-ticket-derivation-retrospective`, ja entregue pelo ticket `tickets/closed/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`;
  - mexer na anti-duplicacao entre retrospectivas pre e pos-`spec-audit`, coberta pelo ticket `tickets/open/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md`;
  - materializar o contrato documental de compatibilidade do projeto alvo (`docs/workflows/target-project-compatibility-contract.md`, `README.md`, `AGENTS.md`), coberto pelo ticket `tickets/open/2026-03-20-target-project-compatibility-contract-gap.md`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push.

## Progress
- [x] 2026-03-20 03:14Z - Leitura completa do ticket, da spec de origem, de `PLANS.md`, de `DOCUMENTATION.md` e de `docs/workflows/codex-quality-gates.md`.
- [x] 2026-03-20 03:14Z - Referencias obrigatorias do ticket revisitadas (`prompts/09-validar-tickets-derivados-da-spec.md`, tipos, parser, `runner`, template de spec, `SPECS.md`, `telegram-bot.ts`).
- [x] 2026-03-20 03:26Z - Contrato funcional de `spec-ticket-validation` limpo e sem semantica sistemica.
- [x] 2026-03-20 03:26Z - Write-back dedicado da retrospectiva pre-run-all implementado e protegido por contexto de repositorio.
- [x] 2026-03-20 03:26Z - Template, `SPECS.md`, resumo final e suites focadas validados contra os closure criteria do ticket.

## Surprises & Discoveries
- 2026-03-20 03:14Z - A retrospectiva pre-run-all ja existe como stage separado em `src/core/runner.ts`; a lacuna residual deste ticket nao e de orquestracao, e sim de contrato funcional/write-back/documentacao.
- 2026-03-20 03:14Z - `renderSpecTicketValidationExecutionBlock(...)` ainda filtra `probableRootCause === "systemic-instruction"` e persiste `#### Observacoes sobre melhoria sistemica do workflow` dentro do gate funcional, o que conflita diretamente com RF-02/RF-03/CA-13.
- 2026-03-20 03:14Z - Nao apareceu nenhum helper de persistencia dedicado para `Retrospectiva sistemica da derivacao dos tickets` em `src/core/runner.ts`; hoje a secao existe na spec, mas o write-back dedicado exigido pelo ticket ainda nao esta materializado no codigo.
- 2026-03-20 03:14Z - O template oficial `docs/specs/templates/spec-template.md` ainda coloca `Observacoes de melhoria sistemica` dentro do gate funcional e nao traz a nova secao retrospectiva, enquanto a spec de origem ja mostra o formato-alvo.
- 2026-03-20 03:14Z - `src/integrations/telegram-bot.ts` ja possui linhas dedicadas para `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit`, entao a entrega aqui provavelmente e de ajuste fino, coerencia de renderizacao e testes, nao de redesign completo do resumo.
- 2026-03-20 03:26Z - A renderizacao do resumo final no Telegram ja atendia RF-31/CA-15; a lacuna real estava em prova automatizada simultanea dos tres blocos e nao em mudanca estrutural do formatter.

## Decision Log
- 2026-03-20 - Decisao: manter este plano estritamente no fechamento dos 3 closure criteria do ticket, sem absorver novamente a orquestracao pre-run-all nem o contrato cross-repo de compatibilidade.
  - Motivo: a spec ja fatiou o trabalho em tickets independentes; ampliar o escopo destruiria a rastreabilidade `spec -> tickets`.
  - Impacto: o plano atua no contrato do gate funcional, no write-back da spec corrente, na documentacao canonica e no resumo final.
- 2026-03-20 - Decisao: remover `systemic-instruction` apenas do contrato de `spec-ticket-validation`, e nao da taxonomia global de retrospectivas sistemicas.
  - Motivo: o ticket pede separar gate funcional de retrospectiva sistemica; a causa-raiz sistemica continua valida nas etapas retrospectivas dedicadas.
  - Impacto: prompt, tipos e parser de `spec-ticket-validation` mudam; `workflow-gap-analysis` e tickets irmaos nao devem ser tocados fora do necessario.
- 2026-03-20 - Decisao: tratar a spec de origem como modelo canonico da secao `Retrospectiva sistemica da derivacao dos tickets` e alinhar template + `SPECS.md` a esse shape, em vez de inventar um formato paralelo.
  - Motivo: a spec aprovada ja mostra campos minimos, nota de uso e regra diferente entre `codex-flow-runner` e projeto externo.
  - Impacto: reduz ambiguidade documental e permite validar por `rg`/fixtures exatamente os headings e notas esperados.
- 2026-03-20 - Decisao: provar write-back dedicado e regra de repositorio por testes do runner, evitando inferencia apenas por leitura de diff.
  - Motivo: RF-26/RF-28/RF-29/RF-30/CA-12/CA-14 exigem comportamento observavel, nao somente texto atualizado.
  - Impacto: a implementacao precisara isolar o renderer/upsert da retrospectiva pre-run-all e cobrir pelo menos os cenarios `codex-flow-runner` vs projeto externo.
- 2026-03-20 - Decisao: manter `src/integrations/telegram-bot.ts` sem refactor funcional e endurecer apenas a cobertura automatizada do resumo final.
  - Motivo: a leitura do codigo confirmou que os titulos `Gate spec-ticket-validation`, `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit` ja estavam separados; mudar o formatter sem necessidade aumentaria churn e risco de regressao.
  - Impacto: a entrega concentrou churn em contrato do gate, write-back da spec, docs canonicas e testes.

## Outcomes & Retrospective
- Status final: changeset implementado, validado no working tree e fechado na etapa dedicada de encerramento.
- O que passou a existir ao final da execucao:
  - gate funcional sem `systemic-instruction` no prompt/tipos e sem bloco sistemico persistido na spec;
  - secao `Retrospectiva sistemica da derivacao dos tickets` atualizada pelo runner apenas quando o repositorio atual e o proprio `codex-flow-runner`;
  - template global, `SPECS.md`, spec de origem e testes coerentes com a separacao aprovada na spec;
  - prova automatizada de que o resumo final distingue os tres blocos quando aplicavel.
- O que fica pendente fora deste plano:
  - validacoes manuais reais em projeto externo e no proprio `codex-flow-runner`, ja registradas na spec de origem;
  - ticket irmao de contrato de compatibilidade.
- Proximos passos:
  - reler diff/ticket/spec para decidir `GO` ou `NO_GO` no fechamento do ticket;
  - executar a etapa separada de fechamento sem reabrir escopo;
  - preservar as pendencias manuais ja registradas na spec ate rodadas reais.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md` - contrato do ticket e closure criteria.
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` - spec de origem com RFs/CAs, shape da secao nova e notas de uso.
  - `prompts/09-validar-tickets-derivados-da-spec.md` - prompt do gate funcional ainda aceitando `systemic-instruction`.
  - `src/types/spec-ticket-validation.ts` - contrato tipado do gate funcional.
  - `src/integrations/spec-ticket-validation-parser.ts` - parser/normalizacao do bloco `[[SPEC_TICKET_VALIDATION]]`.
  - `src/core/runner.ts` - persistencia do gate na spec, write-back potencial da retrospectiva e orquestracao de `/run_specs`.
  - `docs/specs/templates/spec-template.md` - template global ainda com observacao sistemica no gate.
  - `SPECS.md` - politica canonica de specs ainda sem a nova secao retrospectiva.
  - `src/integrations/telegram-bot.ts` - resumo final observavel de `/run_specs`.
  - `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` - suites candidatas para validar write-back e renderizacao final.
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- RFs/CAs cobertos por este plano:
  - RF-02, RF-03, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31.
  - CA-12, CA-13, CA-14, CA-15.
- Assumptions / defaults adotados:
  - `spec-ticket-validation` continua sendo o nome canonico do gate funcional e nao deve ganhar nomenclatura nova;
  - a unica superficie de write-back da retrospectiva pre-run-all na spec e a secao `Retrospectiva sistemica da derivacao dos tickets`, nunca o bloco do gate funcional;
  - em projeto externo, a retrospectiva pre-run-all continua read-only sobre a spec alvo; a superficie observavel fica em trace/log/resumo e eventual ticket no `codex-flow-runner`;
  - o contrato do resumo final exigido por RF-31/CA-15 vale para `/run_specs` quando as respectivas etapas existirem na rodada, sem alterar mensagens de outros fluxos;
  - todos os comandos com `node`/`npm`/`npx` devem usar o prefixo `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.
- Fluxo atual relevante:
  - `spec-ticket-validation` ja persiste historico, gaps e correcoes na secao funcional da spec.
  - `spec-ticket-derivation-retrospective` ja roda separadamente antes de `spec-close-and-version`.
  - o resumo do Telegram ja possui hooks distintos para gate funcional, retrospectiva da derivacao e retrospectiva pos-`spec-audit`, mas o ticket exige confirmar que o resumo final realmente preserve essa distincao de ponta a ponta.
- Restricoes tecnicas:
  - manter fluxo sequencial;
  - nao reintroduzir semantica sistemica no gate funcional por aliases ou campos herdados;
  - nao criar write-back em projeto externo;
  - nao exigir migracao retroativa em massa de specs antigas.

## Plan of Work
- Milestone 1: limpar o contrato funcional de `spec-ticket-validation`.
  - Entregavel: prompt, tipos e parser do gate aceitando apenas causas-raiz funcionais/documentais, sem `systemic-instruction`, e persistencia do bloco funcional sem `Observacoes sobre melhoria sistemica do workflow`.
  - Evidencia de conclusao: `rg` nos arquivos de contrato nao encontra `systemic-instruction` nem o heading sistemico dentro do gate funcional; testes do runner continuam verdes com o gate focado em veredito/gaps/correcoes.
  - Arquivos esperados: `prompts/09-validar-tickets-derivados-da-spec.md`, `src/types/spec-ticket-validation.ts`, `src/integrations/spec-ticket-validation-parser.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2: materializar o write-back dedicado da retrospectiva da derivacao.
  - Entregavel: renderer/upsert dedicado para `Retrospectiva sistemica da derivacao dos tickets`, com write-back apenas no proprio `codex-flow-runner` e sem contaminar o bloco funcional.
  - Evidencia de conclusao: testes do runner comprovam que a spec local do `codex-flow-runner` recebe atualizacao da nova secao e que o caminho de projeto externo nao escreve na spec alvo.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, possivelmente fixtures auxiliares.
- Milestone 3: alinhar superfices documentais e resumo final.
  - Entregavel: template global, `SPECS.md` e resumo final de `/run_specs` descrevendo/exibindo explicitamente `Gate spec-ticket-validation`, `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit`.
  - Evidencia de conclusao: `rg` encontra a nova secao e a nota de comportamento distinto em `docs/specs/templates/spec-template.md` e `SPECS.md`; testes do Telegram confirmam os tres blocos distintos quando aplicaveis.
  - Arquivos esperados: `docs/specs/templates/spec-template.md`, `SPECS.md`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' tickets/closed/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md` para reler o ticket imediatamente antes da execucao e confirmar que os closure criteria nao mudaram.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` para usar a spec aprovada como contrato de shape, RF/CA e nota de write-back.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/09-validar-tickets-derivados-da-spec.md` para remover qualquer instrucao que permita classificar, registrar ou promover melhoria sistemica dentro de `spec-ticket-validation`, mantendo o foco exclusivo no pacote funcional derivado.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/spec-ticket-validation.ts` e `src/integrations/spec-ticket-validation-parser.ts` para retirar `systemic-instruction` do contrato do gate funcional e ajustar aliases/erros/fixtures conforme necessario.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar com `apply_patch` `src/core/runner.ts` para:
   - remover a subsecao `#### Observacoes sobre melhoria sistemica do workflow` do renderer do gate funcional;
   - garantir que a secao `Gate de validacao dos tickets derivados` persista apenas veredito, historico, gaps e correcoes funcionais;
   - criar renderer/upsert dedicado para `Retrospectiva sistemica da derivacao dos tickets`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Completar em `src/core/runner.ts` a regra de write-back da retrospectiva pre-run-all:
   - escrever na spec corrente apenas quando `slot.project.name === "codex-flow-runner"` ou contrato equivalente ja existente no runner;
   - manter projeto externo read-only, preservando trace/log/resumo como superficie observavel.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `docs/specs/templates/spec-template.md` para remover `Observacoes de melhoria sistemica` do gate funcional, adicionar a secao `Retrospectiva sistemica da derivacao dos tickets` e copiar a nota de uso minima aprovada pela spec.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `SPECS.md` para documentar:
   - que o `Gate de validacao dos tickets derivados` e estritamente funcional;
   - que a secao `Retrospectiva sistemica da derivacao dos tickets` passa a ser obrigatoria quando a spec participar de `/run_specs`;
   - que write-back dessa retrospectiva so e permitido no proprio `codex-flow-runner`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar com `apply_patch` `src/integrations/telegram-bot.ts` apenas onde necessario para garantir que o resumo final de `/run_specs` distinga explicitamente os tres blocos exigidos pelo ticket, sem reintroduzir um titulo generico ambiguo.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `src/core/runner.test.ts` para cobrir:
   - gate funcional persistido sem bloco sistemico;
   - write-back da retrospectiva na spec quando o projeto atual e `codex-flow-runner`;
   - ausencia de write-back na spec alvo quando o projeto atual e externo.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `src/integrations/telegram-bot.test.ts` para cobrir o resumo final contendo `Gate spec-ticket-validation`, `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit`, quando aplicavel.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar os cenarios diretamente ligados aos 3 closure criteria do ticket.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "systemic-instruction|Observacoes sobre melhoria sistemica do workflow|Observacoes de melhoria sistemica" prompts/09-validar-tickets-derivados-da-spec.md src/types/spec-ticket-validation.ts src/integrations/spec-ticket-validation-parser.ts src/core/runner.ts docs/specs/templates/spec-template.md` para confirmar que a semantica sistemica saiu do gate funcional e do template.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Retrospectiva sistemica da derivacao dos tickets|codex-flow-runner|projeto externo" docs/specs/templates/spec-template.md SPECS.md` para confirmar que a nova secao e a regra de write-back ficaram documentadas nas fontes canonicas.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para verificar propagacao de tipos/contratos apos a limpeza.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir compilacao do changeset completo.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- prompts/09-validar-tickets-derivados-da-spec.md src/types/spec-ticket-validation.ts src/integrations/spec-ticket-validation-parser.ts src/core/runner.ts docs/specs/templates/spec-template.md SPECS.md src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para auditoria final de escopo antes do fechamento do ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-02, RF-03, RF-27; CA-13.
  - Evidencia observavel: o contrato de `spec-ticket-validation` deixa de aceitar `systemic-instruction`; o gate persistido na spec nao contem mais `Observacoes sobre melhoria sistemica do workflow` e registra apenas veredito, gaps, correcoes e historico funcional.
  - Comando: `rg -n "systemic-instruction|Observacoes sobre melhoria sistemica do workflow|Observacoes de melhoria sistemica" prompts/09-validar-tickets-derivados-da-spec.md src/types/spec-ticket-validation.ts src/integrations/spec-ticket-validation-parser.ts src/core/runner.ts docs/specs/templates/spec-template.md`
  - Esperado: nenhum match nos arquivos do gate funcional/template para semantica sistemica residual.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: existe cobertura verde provando que a secao `Gate de validacao dos tickets derivados` e persistida apenas com conteudo funcional.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-26, RF-28, RF-29, RF-30; CA-12, CA-14.
  - Evidencia observavel: o runner possui write-back dedicado da secao `Retrospectiva sistemica da derivacao dos tickets` com os campos minimos exigidos; `docs/specs/templates/spec-template.md` e `SPECS.md` documentam a secao e a regra de write-back apenas no proprio `codex-flow-runner`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: a suite cobre pelo menos um caso local (`codex-flow-runner`) com write-back na spec e um caso externo sem write-back no projeto alvo.
  - Comando: `rg -n "Retrospectiva sistemica da derivacao dos tickets|codex-flow-runner|projeto externo" docs/specs/templates/spec-template.md SPECS.md`
  - Esperado: os dois documentos canonicos exibem a nova secao e a nota explicita de comportamento diferente entre repositorio local e projeto externo.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-31; CA-15.
  - Evidencia observavel: o resumo final de `/run_specs` distingue explicitamente `Gate spec-ticket-validation`, `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit`, quando aplicavel.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`
  - Esperado: os asserts do resumo final passam exibindo os tres blocos distintos, sem regressao nos caminhos sem retrospectiva.
- Validacao de regressao amarrada ao fechamento:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde apos a limpeza do contrato e do write-back.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: build verde com runner, parser, docs e resumo integrados.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar o changeset nao deve recriar blocos duplicados no gate funcional nem na retrospectiva da derivacao;
  - o upsert da retrospectiva deve substituir apenas a secao `Retrospectiva sistemica da derivacao dos tickets`, preservando o restante da spec;
  - rerodar os testes nao deve depender de side effects persistentes fora das fixtures temporarias do proprio teste.
- Riscos:
  - remover `systemic-instruction` do contrato errado e quebrar retrospectivas sistemicas que usam outra tipagem compartilhada;
  - acoplar o write-back retrospectivo a helpers do gate funcional e voltar a misturar superficies;
  - alterar o resumo do Telegram em um caminho ja correto e introduzir regressao por excesso de refactor;
  - documentar a nova secao em `SPECS.md` sem alinhar exatamente o wording do template, criando nova ambiguidade.
- Recovery / Rollback:
  - se a limpeza do contrato do gate impactar codigo fora do pre-run-all, restringir a mudanca apenas aos arquivos de `spec-ticket-validation` e registrar explicitamente qualquer dependencia inesperada em `Surprises & Discoveries`;
  - se o write-back da retrospectiva ficar instavel, extrair renderer/upsert dedicado em `runner.ts` em vez de sobrecarregar o bloco funcional existente;
  - se o resumo do Telegram ja estiver semanticamente correto, manter a implementacao minima e mover a prova de conformidade para testes, evitando churn desnecessario;
  - se aparecer conflito com ticket irmao de anti-duplicacao, parar e registrar blocker em vez de improvisar uma fusao de escopos.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- Referencias obrigatorias lidas no planejamento:
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `src/types/spec-ticket-validation.ts`
  - `src/integrations/spec-ticket-validation-parser.ts`
  - `src/core/runner.ts`
  - `docs/specs/templates/spec-template.md`
  - `SPECS.md`
  - `src/integrations/telegram-bot.ts`
- ExecPlans correlatos consultados para fronteira de escopo:
  - `execplans/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`
  - `execplans/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md`
- Checklist aplicado no planejamento (`docs/workflows/codex-quality-gates.md`):
  - ticket inteiro e referencias obrigatorias lidos antes de planejar;
  - spec de origem, RFs/CAs e assumptions/defaults explicitados;
  - closure criteria traduzidos para matriz `requisito -> validacao observavel`;
  - riscos residuais e nao-escopo declarados;
  - toda validacao derivada dos closure criteria, nao de checklist generico.
- Observacao operacional:
  - todos os comandos com `node`/`npm`/`npx` neste plano ja estao escritos com o prefixo de ambiente exigido pelo host.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato textual do prompt `prompts/09-validar-tickets-derivados-da-spec.md`;
  - tipos e parser de `spec-ticket-validation`;
  - renderer/upsert do gate funcional e da retrospectiva da derivacao em `src/core/runner.ts`;
  - template oficial de spec e politica `SPECS.md`;
  - renderizacao do resumo final de `/run_specs` em `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - preservar `spec-ticket-validation` como gate funcional canonico;
  - preservar `spec-ticket-derivation-retrospective` como etapa nao bloqueante ja entregue;
  - manter write-back retrospectivo restrito ao proprio `codex-flow-runner`;
  - evitar migracao retroativa em massa de specs historicas.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova deve ser necessaria;
  - reutilizar harnesses existentes de `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`;
  - usar a spec de origem como fixture/documento-modelo do shape da nova secao;
  - manter o projeto externo apenas como contexto de regra observavel, sem modificar artefatos fora do repositorio corrente durante os testes.
