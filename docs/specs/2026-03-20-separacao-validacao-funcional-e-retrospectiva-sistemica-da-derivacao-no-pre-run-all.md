# [SPEC] Separacao entre validacao funcional e retrospectiva sistemica da derivacao de tickets no pre-run-all

## Metadata
- Spec ID: 2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-03-20 01:36Z
- Last reviewed at (UTC): 2026-03-20 03:49Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md
  - tickets/closed/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md
  - tickets/closed/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md
  - tickets/closed/2026-03-20-target-project-compatibility-contract-gap.md
- Related execplans:
  - execplans/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md
  - execplans/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md
  - execplans/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md
  - execplans/2026-03-20-target-project-compatibility-contract-gap.md
- Related commits:
  - 55b651f - `chore(specs): triage 2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
  - 816cb4e - `chore(tickets): close 2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`
  - d861333 - `chore(tickets): close 2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md`
  - fd33449 - `chore(tickets): close 2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md`
  - 6f65b2e - `chore(tickets): close 2026-03-20-target-project-compatibility-contract-gap.md`
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve: o fluxo atual de `/run_specs` ainda mistura, no pre-run-all, a validacao funcional do pacote derivado de tickets com aprendizado sistemico sobre prompts, instrucoes, contratos e orquestracao do proprio `codex-flow-runner`. Isso enfraquece causalidade, mistura backlog funcional do projeto alvo com backlog sistemico do runner e cria sobreposicao com a retrospectiva sistemica pos-`spec-audit`. Alem disso, o workflow ainda nao documenta de forma canonica que compatibilidade do projeto alvo com o fluxo completo e um pre-requisito operacional do onboarding humano, e nao uma validacao semantica de runtime.
- Resultado esperado: separar explicitamente o gate funcional `spec-ticket-validation` de uma nova etapa nao bloqueante `spec-ticket-derivation-retrospective`, executada antes do `/run-all` apenas quando a derivacao tiver exigido revisao real de gaps. Essa nova etapa passa a analisar, em contexto proprio, se o workflow do `codex-flow-runner` contribuiu materialmente para gaps de derivacao, podendo registrar hipotese sistemica ou publicar no maximo 1 ticket transversal agregado no proprio runner sem alterar o desfecho funcional do projeto alvo. Em paralelo, o repositorio passa a documentar de forma canonica a distincao entre `projeto elegivel para descoberta` e `projeto compativel com o workflow completo`, assumindo esta segunda condicao como contrato previo do operador humano.
- Contexto funcional: o fluxo desejado fica `spec-triage -> spec-ticket-validation -> spec-ticket-derivation-retrospective (quando aplicavel) -> spec-close-and-version -> /run-all -> spec-audit -> spec-workflow-retrospective (quando aplicavel)`. `spec-ticket-validation` continua responsavel apenas por decidir se o pacote derivado esta apto ou nao para sustentar a execucao funcional da spec do projeto alvo. `spec-ticket-derivation-retrospective` passa a tratar apenas melhoria sistemica do runner observavel antes do `/run-all`. `spec-workflow-retrospective` continua reservado a gaps sistemicos residuais que so ficaram claros apos implementacao e auditoria final.
- Restricoes tecnicas relevantes:
  - manter fluxo sequencial do runner;
  - preservar `spec-ticket-validation` como nome canonico e gate funcional do pacote derivado;
  - introduzir `spec-ticket-derivation-retrospective` como etapa separada, nao bloqueante e observavel;
  - executar a retrospectiva pre-run-all apenas quando houver historico revisado suficiente de gaps na validacao funcional;
  - iniciar `derivation-gap-analysis` em contexto novo em relacao ao `spec-ticket-validation`;
  - permitir que `derivation-ticket-publication` reutilize apenas o contexto da propria analise;
  - em projeto externo, manter a fase pre-run-all read-only sobre a spec e os artefatos do projeto alvo;
  - permitir write-back da retrospectiva pre-run-all na spec corrente apenas quando o projeto atual for o proprio `codex-flow-runner`;
  - evitar duplicacao causal entre retrospectiva pre-run-all e retrospectiva pos-`spec-audit`;
  - nao gastar tokens em preflight semantico de compatibilidade do projeto alvo durante a execucao automatizada.

## Jornada de uso
1. Operador executa `/run_specs <arquivo-da-spec.md>` em um projeto previamente adaptado ao contrato do workflow completo.
2. `spec-triage` deriva apenas tickets em `tickets/open/`, sem criar `execplans/` diretamente a partir da spec.
3. `spec-ticket-validation` avalia o pacote derivado inteiro, registra gaps funcionais, tenta autocorrecao quando seguro e decide `GO` ou `NO_GO`.
4. Se nenhum gap tiver sido revisado em qualquer ciclo do gate funcional, `spec-ticket-derivation-retrospective` e pulada com motivo observavel explicito.
5. Se ao menos 1 gap tiver sido revisado em algum ciclo, mesmo que o veredito final vire `GO`, o runner inicia `spec-ticket-derivation-retrospective`.
6. `derivation-gap-analysis` rele a spec, o pacote final de tickets derivados, o historico completo dos ciclos do gate funcional e as fontes canonicas do workflow no `codex-flow-runner`.
7. A analise classifica a contribuicao sistemica do runner como `systemic-gap`, `systemic-hypothesis`, `not-systemic`, `emphasis-only` ou `operational-limitation`, com confianca `high`, `medium` ou `low`.
8. Se houver `systemic-gap` com `high confidence`, o runner executa `derivation-ticket-publication` e pode criar ou reutilizar no maximo 1 ticket transversal agregado no `codex-flow-runner`, sem bloquear a rodada principal.
9. Se o projeto atual for externo, a retrospectiva pre-run-all nao altera a spec nem outros artefatos do projeto alvo; os resultados ficam em trace/log/resumo e, quando elegivel, no ticket publicado no `codex-flow-runner`.
10. Se o veredito funcional for `GO`, o fluxo segue para `spec-close-and-version`, `/run-all` e `spec-audit`.
11. Se o veredito funcional for `NO_GO`, o fluxo encerra sem `/run-all`, mas ainda pode concluir a retrospectiva pre-run-all se houver material estruturado suficiente.
12. Depois do `spec-audit`, a retrospectiva sistemica pos-auditoria so trata gaps residuais novos que nao eram observaveis com boa causalidade antes da implementacao, podendo no maximo referenciar tickets ja abertos pela retrospectiva pre-run-all.

## Requisitos funcionais
- RF-01: `spec-ticket-validation` deve permanecer como nome canonico do gate funcional do pacote derivado de tickets.
- RF-02: `spec-ticket-validation` deve ficar restrito a validar se o pacote derivado esta correto, suficiente e apto a suportar a execucao funcional da spec do projeto alvo.
- RF-03: `spec-ticket-validation` nao deve mais decidir, promover, registrar nem publicar melhoria sistemica do workflow do `codex-flow-runner`.
- RF-04: o runner deve introduzir um novo stage explicito `spec-ticket-derivation-retrospective` entre `spec-ticket-validation` e `spec-close-and-version`.
- RF-05: `spec-ticket-derivation-retrospective` deve ser estritamente nao bloqueante para o fluxo funcional do projeto alvo.
- RF-06: a retrospectiva pre-run-all nunca deve alterar o veredito do `spec-ticket-validation`, nem impedir `spec-close-and-version`, `/run-all` ou encerramento do fluxo principal.
- RF-07: `spec-ticket-derivation-retrospective` deve executar somente quando existir pelo menos 1 gap revisado em qualquer ciclo do historico do `spec-ticket-validation`, independentemente do snapshot final da validacao.
- RF-08: quando o `spec-ticket-validation` concluir sem gaps revisados em nenhum ciclo, `spec-ticket-derivation-retrospective` deve ser pulada e o motivo do skip deve aparecer explicitamente em trace/log/resumo.
- RF-09: quando o `spec-ticket-validation` terminar em `NO_GO`, `spec-ticket-derivation-retrospective` ainda deve poder executar antes do encerramento do fluxo, desde que haja historico estruturado suficiente para analise.
- RF-10: quando `spec-ticket-validation` falhar tecnicamente antes de produzir material estruturado suficiente, `spec-ticket-derivation-retrospective` deve ser pulada com motivo explicito de insuficiencia de insumos.
- RF-11: quando `spec-ticket-validation` falhar tecnicamente apos produzir material estruturado suficiente, `spec-ticket-derivation-retrospective` pode executar mesmo sem veredito funcional final utilizavel.
- RF-12: `spec-ticket-derivation-retrospective` deve conter duas subetapas distintas:
  - `derivation-gap-analysis`
  - `derivation-ticket-publication`
- RF-13: `derivation-gap-analysis` deve iniciar em contexto novo em relacao ao `spec-ticket-validation`, sem herdar implicitamente o contexto conversacional do gate funcional.
- RF-14: `derivation-ticket-publication` pode reutilizar apenas o contexto produzido pela propria `derivation-gap-analysis`.
- RF-15: `derivation-gap-analysis` deve usar, no minimo, os seguintes insumos:
  - a spec alvo;
  - o pacote final de tickets derivados;
  - o historico completo dos ciclos do `spec-ticket-validation`, incluindo `gaps`, `appliedCorrections`, veredito final, confianca e demais sinais relevantes da rodada.
- RF-16: o prompt de `derivation-gap-analysis` deve orientar releitura das fontes canonicas do workflow no `codex-flow-runner`, priorizando:
  - `AGENTS.md`;
  - `DOCUMENTATION.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`;
  - `docs/workflows/`;
  - `prompts/`;
  - implementacao de codigo do fluxo, quando necessario para sustentar a causalidade.
- RF-17: quando o projeto atual for externo, `derivation-gap-analysis` deve considerar dois contextos:
  - o projeto alvo onde o gap de derivacao ocorreu;
  - `../codex-flow-runner` como origem potencial da melhoria sistemica.
- RF-18: `derivation-gap-analysis` deve reutilizar exatamente a mesma taxonomia de classificacao da retrospectiva pos-`spec-audit`:
  - `systemic-gap`
  - `systemic-hypothesis`
  - `not-systemic`
  - `emphasis-only`
  - `operational-limitation`
- RF-19: a semantica de confianca da retrospectiva pre-run-all deve espelhar a retrospectiva pos-`spec-audit`:
  - `systemic-gap` com `high confidence` pode ser elegivel para ticket automatico;
  - `systemic-hypothesis` deve usar `medium confidence` e nao abre ticket automatico;
  - `low confidence` nao deve promover hipotese sistemica acionavel.
- RF-20: `derivation-ticket-publication` deve abrir ou reutilizar no maximo 1 ticket transversal agregado por rodada, consolidando os achados sistemicos da derivacao daquela spec.
- RF-21: quando o projeto atual for o proprio `codex-flow-runner`, `derivation-ticket-publication` deve publicar o ticket transversal no repositorio atual.
- RF-22: quando o projeto atual for externo, `derivation-ticket-publication` deve publicar o ticket transversal somente em `../codex-flow-runner`.
- RF-23: falhas tecnicas em `derivation-gap-analysis` ou `derivation-ticket-publication` devem ser registradas como limitacao operacional nao bloqueante.
- RF-24: em projeto externo, `spec-ticket-derivation-retrospective` nao deve alterar a spec, tickets, execplans, documentacao ou qualquer outro artefato do projeto alvo.
- RF-25: em projeto externo, a fonte observavel da retrospectiva pre-run-all deve ser trace/log/resumo e, quando elegivel, o ticket transversal publicado no `codex-flow-runner`.
- RF-26: quando o projeto atual for o proprio `codex-flow-runner`, a retrospectiva pre-run-all pode fazer write-back na secao `Retrospectiva sistemica da derivacao dos tickets` da spec corrente.
- RF-27: a secao `Gate de validacao dos tickets derivados` deve permanecer 100% funcional e nao deve conter nenhum campo ou semantica ligada a melhoria sistemica do workflow.
- RF-28: o modelo canonico de spec deve incluir uma secao propria `Retrospectiva sistemica da derivacao dos tickets`, separada do gate funcional.
- RF-29: a secao `Retrospectiva sistemica da derivacao dos tickets` deve registrar, no minimo:
  - se a fase rodou ou foi pulada;
  - motivo de ativacao ou skip;
  - classificacao final;
  - confianca;
  - frente causal analisada;
  - achados sistemicos;
  - artefatos do workflow consultados;
  - elegibilidade de publicacao;
  - resultado do ticket transversal ou limitacao operacional.
- RF-30: `SPECS.md` e o template global de spec devem documentar explicitamente que write-back da nova secao so e permitido quando a execucao ocorrer no proprio `codex-flow-runner`; em projeto externo, a superficie observavel e trace/log/resumo.
- RF-31: o resumo final do `/run_specs` deve distinguir explicitamente tres blocos quando aplicavel:
  - `Gate spec-ticket-validation`
  - `Retrospectiva sistemica da derivacao`
  - `Retrospectiva sistemica pos-spec-audit`
- RF-32: quando a retrospectiva pre-run-all nao for executada, trace/log/resumo devem registrar explicitamente um motivo observavel equivalente a `nao executada por ausencia de gaps revisados` ou `nao executada por insuficiencia de insumos estruturados`.
- RF-33: quando `spec-ticket-derivation-retrospective` executar por completo e o fluxo parar antes do `/run-all`, ela deve se tornar a fase final observavel do `/run_specs`.
- RF-34: quando `spec-ticket-derivation-retrospective` for pulada e o fluxo parar antes do `/run-all`, `spec-ticket-validation` deve permanecer como fase final observavel do `/run_specs`.
- RF-35: `spec-workflow-retrospective` pos-`spec-audit` nao deve reavaliar nem abrir novo ticket automatico para a mesma frente causal ja analisada e ticketada na retrospectiva pre-run-all.
- RF-36: quando util, a retrospectiva pos-`spec-audit` pode apenas referenciar tickets ou achados da retrospectiva pre-run-all como contexto historico, sem duplicar a responsabilidade analitica.
- RF-37: o repositorio deve documentar, em `docs/workflows/target-project-compatibility-contract.md`, a distincao canonica entre:
  - `projeto elegivel para descoberta`
  - `projeto compativel com o workflow completo`
- RF-38: a documentacao canonica deve deixar explicito que `/discover_spec` e `/plan_spec` podem operar sobre `projeto elegivel para descoberta`.
- RF-39: a documentacao canonica deve deixar explicito que `/run_specs` e o workflow completo pressupoem `projeto compativel com o workflow completo`.
- RF-40: o runner nao deve gastar tokens tentando provar em runtime, por meio de analise semantica, se o projeto alvo e compativel com o workflow completo; essa compatibilidade deve ser tratada como pre-requisito operacional do onboarding humano.
- RF-41: `README.md` deve resumir o contrato de compatibilidade como pre-requisito operacional e apontar para `docs/workflows/target-project-compatibility-contract.md`.
- RF-42: `AGENTS.md` deve conter apenas um ponteiro curto para o contrato de compatibilidade, sem duplicar a definicao normativa.

## Assumptions and defaults
- O nome canonico do gate funcional continua sendo `spec-ticket-validation`.
- O nome canonico da nova etapa pre-run-all e `spec-ticket-derivation-retrospective`.
- Os nomes canonicos das subetapas novas sao `derivation-gap-analysis` e `derivation-ticket-publication`.
- A ativacao da retrospectiva pre-run-all usa o historico completo do `spec-ticket-validation`, e nao apenas o snapshot final.
- A retrospectiva pre-run-all so abre ticket automatico com `systemic-gap` e `high confidence`.
- A publicacao automatica da retrospectiva pre-run-all fica limitada a no maximo 1 ticket agregado por rodada.
- A mesma taxonomia da retrospectiva pos-`spec-audit` deve ser reutilizada no pre-run-all para reduzir vocabulario novo.
- Em projeto externo, a retrospectiva pre-run-all e sempre read-only sobre o projeto alvo.
- `docs/workflows/target-project-compatibility-contract.md` e o path canonico esperado para o contrato de compatibilidade do projeto alvo.
- Trace/log/resumo sempre existem como superficie observavel da retrospectiva pre-run-all, mesmo quando houver write-back permitido no proprio `codex-flow-runner`.

## Nao-escopo
- Renomear `spec-ticket-validation`.
- Transformar a retrospectiva pre-run-all em etapa bloqueante do fluxo funcional.
- Permitir que a retrospectiva pre-run-all altere specs ou outros artefatos de projetos externos.
- Fazer preflight semantico em runtime para provar compatibilidade do projeto alvo com o workflow completo.
- Abrir mais de 1 ticket sistemico automatico por rodada de derivacao.
- Fundir a retrospectiva pre-run-all com `spec-ticket-validation`.
- Fundir a retrospectiva pre-run-all com `spec-workflow-retrospective` pos-`spec-audit`.
- Permitir que a retrospectiva pos-`spec-audit` retickete a mesma frente causal ja tratada na retrospectiva pre-run-all.
- Paralelizar triagem, validacao ou execucao de tickets derivados.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Quando `spec-ticket-validation` concluir sem gaps revisados em nenhum ciclo, `spec-ticket-derivation-retrospective` nao roda e trace/log/resumo registram explicitamente o skip por ausencia de gaps revisados.
- [x] CA-02 - Quando existir ao menos 1 gap revisado em qualquer ciclo do `spec-ticket-validation`, `spec-ticket-derivation-retrospective` roda mesmo que o veredito funcional final seja `GO`.
- [x] CA-03 - Quando `spec-ticket-validation` terminar em `NO_GO` com historico estruturado suficiente, `spec-ticket-derivation-retrospective` ainda roda antes do encerramento do fluxo.
- [x] CA-04 - Quando `spec-ticket-validation` falhar tecnicamente sem material estruturado suficiente, `spec-ticket-derivation-retrospective` e pulada e o motivo aparece como insuficiencia de insumos estruturados.
- [x] CA-05 - `derivation-gap-analysis` inicia em contexto novo, rele a spec, o pacote final de tickets derivados e o historico completo dos ciclos do gate funcional.
- [x] CA-06 - `derivation-gap-analysis` consulta as fontes canonicas do workflow no `codex-flow-runner`, incluindo `AGENTS.md`, docs canonicas, `prompts/` e codigo do fluxo quando necessario.
- [x] CA-07 - A retrospectiva pre-run-all usa exatamente a mesma taxonomia `systemic-gap | systemic-hypothesis | not-systemic | emphasis-only | operational-limitation` da retrospectiva pos-`spec-audit`.
- [x] CA-08 - Com `systemic-gap` e `high confidence`, o runner pode criar ou reutilizar no maximo 1 ticket transversal agregado no `codex-flow-runner`.
- [x] CA-09 - Com `medium confidence`, o runner registra hipotese sistemica e evidencias, mas nao abre ticket automatico.
- [x] CA-10 - Com `low confidence`, o runner nao promove hipotese sistemica acionavel nem abre ticket automatico.
- [x] CA-11 - Em projeto externo, a retrospectiva pre-run-all nao altera a spec nem outros artefatos do projeto alvo, registrando resultado apenas em trace/log/resumo e, quando elegivel, no ticket publicado no `codex-flow-runner`.
- [x] CA-12 - No proprio `codex-flow-runner`, a retrospectiva pre-run-all pode atualizar a secao `Retrospectiva sistemica da derivacao dos tickets` da spec corrente, sem perder trace/log/resumo.
- [x] CA-13 - O `Gate de validacao dos tickets derivados` deixa de carregar qualquer observacao ou semantica de melhoria sistemica do workflow.
- [x] CA-14 - A spec, o template global e `SPECS.md` passam a conter a secao `Retrospectiva sistemica da derivacao dos tickets` com nota explicita de comportamento diferente entre `codex-flow-runner` e projeto externo.
- [x] CA-15 - O resumo final do `/run_specs` distingue explicitamente `Gate spec-ticket-validation`, `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit`, quando aplicavel.
- [x] CA-16 - Quando a retrospectiva pre-run-all executa por completo e o fluxo termina antes do `/run-all`, `spec-ticket-derivation-retrospective` aparece como fase final observavel do `/run_specs`.
- [x] CA-17 - `spec-workflow-retrospective` pos-`spec-audit` nao abre ticket automatico duplicado para a mesma frente causal ja tratada na retrospectiva pre-run-all e, quando util, apenas referencia o ticket existente.
- [x] CA-18 - Existe novo documento canonico em `docs/workflows/target-project-compatibility-contract.md` definindo `projeto elegivel para descoberta` e `projeto compativel com o workflow completo`.
- [x] CA-19 - `README.md` resume que compatibilidade do projeto alvo e pre-requisito operacional do onboarding humano e nao validacao semantica de runtime, apontando para o documento canonico.
- [x] CA-20 - `AGENTS.md` passa a conter apenas um ponteiro curto para o contrato de compatibilidade, sem duplicacao normativa.

## Gate de validacao dos tickets derivados
- Veredito atual: n/a
- Gaps encontrados:
  - n/a
- Correcoes aplicadas:
  - n/a
- Causa-raiz provavel:
  - n/a
- Ciclos executados:
  - n/a
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta secao apenas com o resultado funcional do gate formal de validacao dos tickets derivados. Hipoteses sistemicas, backlog transversal do runner e publicacao de ticket sistemico nao pertencem mais a esta secao.
- Politica historica: alinhamentos desta secao nao exigem migracao retroativa em massa; material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-20T02:07:24.755Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado cobre de forma coerente as pendencias abertas da spec, preserva a separacao entre orquestracao, contrato funcional/write-back, anti-duplicacao pos-auditoria e contrato documental de compatibilidade, e os 4 tickets atendem ao contrato canonico minimo de `INTERNAL_TICKETS.md` para derivacao via `spec-triage`, sem lacuna objetiva de cobertura, duplicacao material, granularidade inadequada ou nao conformidade documental que justifique bloquear o backlog.
- Ciclos executados: 0
- Thread da validacao: 019d08fd-9ba0-71b2-bdfb-c331f48599b9
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/closed/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md [fonte=source-spec]
  - tickets/closed/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md [fonte=source-spec]
  - tickets/closed/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md [fonte=source-spec]
  - tickets/closed/2026-03-20-target-project-compatibility-contract-gap.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: GO (high)
  - Resumo: O pacote derivado cobre de forma coerente as pendencias abertas da spec, preserva a separacao entre orquestracao, contrato funcional/write-back, anti-duplicacao pos-auditoria e contrato documental de compatibilidade, e os 4 tickets atendem ao contrato canonico minimo de `INTERNAL_TICKETS.md` para derivacao via `spec-triage`, sem lacuna objetiva de cobertura, duplicacao material, granularidade inadequada ou nao conformidade documental que justifique bloquear o backlog.
  - Thread: 019d08fd-9ba0-71b2-bdfb-c331f48599b9
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Nenhuma.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: nao
- Motivo de ativacao ou skip:
  - Gate `spec-ticket-validation` desta propria linhagem encerrou em `GO` com 0 gaps revisados e 0 correcoes aplicadas; conforme RF-08 e RF-32, a retrospectiva pre-run-all foi pulada com motivo observavel de ausencia de gaps revisados.
- Classificacao final: n/a - etapa pulada por ausencia de gaps revisados
- Confianca: n/a
- Frente causal analisada: n/a - etapa pulada antes da analise sistemica
- Achados sistemicos:
  - nenhum; a etapa nao foi ativada.
- Artefatos do workflow consultados:
  - n/a - etapa pulada antes da releitura dedicada das fontes canonicas.
- Elegibilidade de publicacao: n/a - etapa pulada
- Resultado do ticket transversal ou limitacao operacional:
  - nenhum; skip funcional sem limitacao operacional.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Nenhuma bloqueante para o atendimento final desta spec; o encadeamento pre-run-all, a separacao documental do gate, a anti-duplicacao pos-`spec-audit`, o contrato de compatibilidade e a publication cross-repo ficaram cobertos por `src/core/runner.test.ts`, `src/integrations/workflow-trace-store.test.ts`, `src/integrations/workflow-gap-analysis-parser.test.ts`, `src/integrations/spec-ticket-validation-parser.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/workflow-improvement-ticket-publisher.test.ts`.
- Validacoes manuais pendentes:
  - Executar ao menos uma rodada real no proprio `codex-flow-runner` com gap corrigido no gate funcional e confirmar write-back na secao `Retrospectiva sistemica da derivacao dos tickets`, resumo final e eventual publicacao do ticket transversal; esta revalidacao permanece recomendada e nao configura gap residual da spec.
  - Executar ao menos uma rodada real em projeto externo com gap revisado no gate funcional e confirmar ausencia de write-back na spec do projeto alvo, mantendo trace/log/resumo e eventual ticket no `../codex-flow-runner`; esta revalidacao permanece recomendada e nao configura gap residual da spec.
  - Executar ao menos uma rodada real em projeto externo sem gaps revisados no gate funcional e confirmar skip explicito da retrospectiva pre-run-all; esta revalidacao permanece recomendada e nao configura gap residual da spec.
  - Exercitar um caminho de falha tecnica do `spec-ticket-validation` com e sem insumo estruturado suficiente para confirmar a regra de execucao condicional da retrospectiva pre-run-all; esta revalidacao permanece recomendada e nao configura gap residual da spec.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Resultado da auditoria final: a linhagem completa foi relida contra esta spec, os 4 tickets fechados relacionados, os 4 execplans relacionados, o estado versionado em `55b651f`, `816cb4e`, `d861333`, `fd33449` e `6f65b2e`, e o codigo/testes atuais; nao foram encontrados gaps tecnicos residuais e a spec foi promovida para `Status: attended` com `Spec treatment: done`.
- Itens atendidos:
  - `spec-ticket-validation` ja existe como nome canonico do gate funcional pre-run-all, com historico por ciclo, `GO/NO_GO` e resumo observavel do pacote derivado.
  - A retrospectiva sistemica pos-`spec-audit` ja oferece taxonomia compartilhada (`systemic-gap | systemic-hypothesis | not-systemic | emphasis-only | operational-limitation`), semantica de confianca e publication cross-repo reutilizavel para a etapa pre-run-all.
  - O runner atual nao faz preflight semantico dedicado de compatibilidade do projeto alvo; o fluxo segue diretamente por stages nomeados de `/run_specs`, preservando o contrato de onboarding humano descrito nesta spec.
  - `tickets/closed/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`: o stage `spec-ticket-derivation-retrospective` foi implementado no working tree entre `spec-ticket-validation` e `spec-close-and-version`, com execucao/skip observaveis, contexto proprio `spec-ticket-validation-history`, traces, timing, `finalStage` e publication pre-run-all distintos da retrospectiva pos-`spec-audit`.
  - `tickets/closed/2026-03-20-anti-duplicacao-entre-retrospectivas-pre-e-pos-spec-audit-gap.md`: o working tree atual ja transporta fingerprints/ticket/achados pre-run-all para `spec-workflow-retrospective`, registra `historicalReference` parseavel/observavel e aplica guarda deterministica no runner para suprimir ticket transversal duplicado quando a frente causal pos-`spec-audit` coincide com a da retrospectiva pre-run-all.
  - `tickets/closed/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md`: o working tree atual ja remove `systemic-instruction` do contrato de `spec-ticket-validation`, persiste apenas conteudo funcional no gate, faz write-back dedicado da secao `Retrospectiva sistemica da derivacao dos tickets` no proprio `codex-flow-runner` e alinha template/SPECS/resumo final com a separacao aprovada nesta spec.
  - `tickets/closed/2026-03-20-target-project-compatibility-contract-gap.md`: o working tree materializa `docs/workflows/target-project-compatibility-contract.md`, atualiza `README.md`/`AGENTS.md` e fecha o gap documental de compatibilidade do projeto alvo.
- Pendencias em aberto:
  - Nenhuma pendencia tecnica residual nem follow-up aberto derivado desta spec.
  - Permanecem apenas validacoes manuais externas registradas em `Validacoes pendentes ou manuais`, sem bloquear `Status: attended` nem `Spec treatment: done`.
- Evidencias de validacao:
  - Entrevista detalhada de descoberta concluida em 2026-03-20 01:36Z, cobrindo objetivo, escopo, nao-escopo, naming, restricoes, outputs, observabilidade, anti-duplicacao e contrato de compatibilidade.
  - Suite automatizada verde no working tree para RF-35, RF-36 e CA-17 cobrindo overlap causal com ticket pre-run-all, overlap sem ticket pre-run-all e causa residual realmente nova via `src/core/runner.test.ts`, `src/integrations/workflow-gap-analysis-parser.test.ts` e `src/integrations/telegram-bot.test.ts`.
  - Releitura de `docs/workflows/discover-spec.md`, `SPECS.md`, `DOCUMENTATION.md`, `README.md`, `INTERNAL_TICKETS.md` e `docs/workflows/codex-quality-gates.md`.
  - Releitura de `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md` e `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`.
  - Releitura de `prompts/08-auditar-spec-apos-run-all.md`, `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md` e `prompts/11-retrospectiva-workflow-apos-spec-audit.md`.
  - Revisao de implementacao concluida em 2026-03-20 01:57Z contra `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/types/spec-ticket-validation.ts`, `src/integrations/codex-client.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, `docs/specs/templates/spec-template.md` e `src/integrations/workflow-improvement-ticket-publisher.ts`, com abertura dos tickets derivados acima.
  - Validacao final da triagem concluida em 2026-03-20 02:08Z, confirmando consistencia entre `Status: approved`, `Spec treatment: pending` e os 4 tickets derivados desta spec, sem gap adicional fora da rastreabilidade ja registrada.
  - Implementacao do stage `spec-ticket-derivation-retrospective` no working tree, com novo prompt `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`, novo `inputMode` `spec-ticket-validation-history`, resumo dedicado no `/run_specs` e cobertura automatizada de `GO` com gap revisado, `NO_GO` com historico estruturado, skip explicito e falha tecnica parcial.
  - Validacoes observaveis desta rodada: `npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`, todos verdes no working tree atual.
  - Validacoes observaveis desta rodada de separacao funcional/write-back: `npx tsx --test src/core/runner.test.ts src/integrations/spec-ticket-validation-parser.test.ts src/integrations/telegram-bot.test.ts`, `rg -n "systemic-instruction|Observacoes sobre melhoria sistemica do workflow|Observacoes de melhoria sistemica" prompts/09-validar-tickets-derivados-da-spec.md src/types/spec-ticket-validation.ts src/integrations/spec-ticket-validation-parser.ts src/core/runner.ts docs/specs/templates/spec-template.md` e `rg -n "Retrospectiva sistemica da derivacao dos tickets|codex-flow-runner|projeto externo" docs/specs/templates/spec-template.md SPECS.md`, cobrindo o gate funcional limpo, o write-back local da retrospectiva e a documentacao canonica atualizada.
  - Auditoria final reexecutada em 2026-03-20 03:49Z com releitura desta spec, dos 4 tickets fechados relacionados, dos 4 execplans relacionados, de `README.md`, `AGENTS.md`, `docs/workflows/target-project-compatibility-contract.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`, `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/types/flow-timing.ts`, `src/types/spec-ticket-validation.ts`, `src/types/workflow-gap-analysis.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/spec-ticket-validation-parser.ts`, `src/integrations/workflow-gap-analysis-parser.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts` e `src/integrations/telegram-bot.ts`, sem identificacao de gap residual.
  - Matriz observavel da auditoria final executada em 2026-03-20 03:49Z com sucesso:
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/workflow-gap-analysis-parser.test.ts src/integrations/spec-ticket-validation-parser.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - `rg -n "systemic-instruction|Observacoes sobre melhoria sistemica do workflow|Observacoes de melhoria sistemica" prompts/09-validar-tickets-derivados-da-spec.md src/types/spec-ticket-validation.ts src/integrations/spec-ticket-validation-parser.ts src/core/runner.ts docs/specs/templates/spec-template.md` -> sem matches
    - `rg -n "Retrospectiva sistemica da derivacao dos tickets|codex-flow-runner|projeto externo|target-project-compatibility-contract|spec -> tickets|ticket -> execplan" docs/specs/templates/spec-template.md SPECS.md README.md AGENTS.md docs/workflows/target-project-compatibility-contract.md` -> matches esperados
    - `git log --oneline --decorate -n 12`

## Auditoria final de entrega
- Auditoria executada em: 2026-03-20 03:49Z
- Resultado: a releitura integral desta spec, dos 4 tickets fechados relacionados, dos 4 execplans relacionados, do estado versionado em `55b651f`, `816cb4e`, `d861333`, `fd33449` e `6f65b2e`, da documentacao canonica atual e das suites executadas nesta auditoria confirmou atendimento de RF-01..RF-42 e CA-01..CA-20. Nao foram encontrados gaps tecnicos residuais; a spec permanece em `Status: attended` com `Spec treatment: done`.
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum
- Causas-raiz sistemicas identificadas:
  - nenhuma; auditoria encerrada sem gaps residuais.
- Ajustes genericos promovidos ao workflow:
  - nenhum; a auditoria final apenas consolidou a rastreabilidade e revalidou a entrega existente.

## Riscos e impacto
- Risco funcional: manter sobreposicao entre gate funcional e retrospectiva sistemica pode continuar gerando backlog confuso e causalidade fraca.
- Risco operacional: uma nova etapa pre-run-all mal observada pode aumentar complexidade do `/run_specs` sem clareza suficiente para o operador.
- Risco documental: a nova secao retrospectiva ser interpretada como permissao para write-back em specs de projetos externos.
- Mitigacao:
  - manter fronteiras canonicas explicitas entre gate funcional, retrospectiva pre-run-all e retrospectiva pos-`spec-audit`;
  - registrar de forma obrigatoria motivos de execucao, skip, limitacao operacional e fase final observavel;
  - documentar canonicamente a diferenca entre write-back permitido no proprio `codex-flow-runner` e proibicao em projetos externos.

## Decisoes e trade-offs
- 2026-03-20 - Manter `spec-ticket-validation` como nome do gate funcional - preserva o contrato atual e reduz churn conceitual.
- 2026-03-20 - Introduzir `spec-ticket-derivation-retrospective` como etapa propria pre-run-all - separa backlog funcional do projeto alvo de backlog sistemico do runner.
- 2026-03-20 - Ativar a retrospectiva pre-run-all a partir do historico completo de gaps revisados, e nao apenas do snapshot final - preserva causalidade sobre gaps corrigidos durante a rodada.
- 2026-03-20 - Tornar a retrospectiva pre-run-all estritamente nao bloqueante - evita que falhas observacionais secundarias mudem o desfecho funcional do projeto alvo.
- 2026-03-20 - Limitar a publicacao automatica a no maximo 1 ticket agregado por rodada - reduz ruido e fragmentacao prematura do backlog sistemico.
- 2026-03-20 - Reutilizar a mesma taxonomia e a mesma semantica de confianca da retrospectiva pos-`spec-audit` - melhora simetria arquitetural e comparabilidade operacional.
- 2026-03-20 - Tratar compatibilidade do projeto alvo como contrato de onboarding humano e nao como preflight semantico de runtime - reduz gasto de tokens e reforca responsabilidade operacional explicita.

## Historico de atualizacao
- 2026-03-20 01:36Z - Versao inicial da spec criada a partir de entrevista detalhada de descoberta, com `Status: approved` e `Spec treatment: pending`.
- 2026-03-20 02:08Z - Triagem final validada; status e tratamento mantidos em aberto devido aos 4 gaps rastreados por tickets em `tickets/open/`.
- 2026-03-20 03:39Z - Working tree atualizado para materializar o contrato canonico de compatibilidade do projeto alvo em `docs/workflows/target-project-compatibility-contract.md` e alinhar `README.md`/`AGENTS.md`; naquele momento, o ticket correspondente ainda seguia para a etapa separada de fechamento/versionamento.
- 2026-03-20 03:41Z - Ticket `2026-03-20-target-project-compatibility-contract-gap.md` fechado como `fixed`; a spec passa a referenciar apenas tickets fechados nesta linhagem e mantem pendentes apenas as validacoes manuais/auditoria final.
- 2026-03-20 03:49Z - Auditoria final apos a rodada encadeada revalidou a linhagem inteira sem gaps tecnicos residuais, marcou CA-01..CA-20 como atendidos, atualizou a rastreabilidade de execplans/commits e promoveu a spec para `Status: attended` com `Spec treatment: done`.
