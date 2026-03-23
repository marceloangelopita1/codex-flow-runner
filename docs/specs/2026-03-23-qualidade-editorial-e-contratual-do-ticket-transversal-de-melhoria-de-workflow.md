# [SPEC] Qualidade editorial e contratual do ticket transversal de melhoria de workflow

## Metadata
- Spec ID: 2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-23 02:32Z
- Last reviewed at (UTC): 2026-03-23 03:08Z
- Source: technical-evolution
- Related tickets:
  - tickets/open/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md
  - tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md
  - tickets/open/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md
  - tickets/closed/2026-03-23-workflow-improvement-2026-03-22-score-de-oportunidade-com-gates-v1-3723af3a.md
  - tickets/closed/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md
- Related execplans:
  - Nenhum ainda.
- Related commits:
  - Nenhum ainda.
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve: o workflow atual ja consegue detectar, classificar e publicar automaticamente melhorias sistemicas do proprio `codex-flow-runner`, mas ainda transforma uma analise causal rica em um ticket humano parcialmente generico. Hoje a qualidade final do ticket depende demais de texto sintetico hardcoded no publisher e de um handoff tipado curto demais, o que favorece titulo pouco orientado a problema, `Inherited assumptions/defaults` poluido com contexto irrelevante da spec de origem, `Proposed solution` confundida com `benefitSummary` e `Closure criteria` genericos demais para guiar execucao futura com seguranca.
- Resultado esperado: todo ticket transversal de melhoria de workflow publicado automaticamente passa a ser um handoff de alta qualidade entre IAs e operadores, com titulo orientado ao problema, contexto filtrado, evidencias especificas, proposta de remediacao concreta e criterios de fechamento observaveis. O fluxo deve maximizar a qualidade de cada token produzido tambem nessa superficie, reduzindo retrabalho na triagem e tornando a execucao futura significativamente mais segura.
- Contexto funcional: a criacao automatica do ticket transversal pode nascer tanto de `spec-ticket-derivation-retrospective` quanto de `spec-workflow-retrospective`. Em ambos os casos, o ticket humano e o backlog reaproveitavel mais importante da retrospectiva; portanto, ele nao pode depender de reconstrucao manual a partir de traces, prompts ou memoria oral do contexto.
- Restricoes tecnicas relevantes:
  - manter o fluxo sequencial e nao bloqueante para a spec corrente;
  - preservar a taxonomia atual de `workflow-gap-analysis` e as regras de `publicationEligibility`;
  - preservar publicacao same-repo e cross-repo em `../codex-flow-runner`;
  - preservar a regra de no maximo 1 ticket transversal agregado por retrospectiva;
  - preservar fingerprints, deduplicacao e rastreabilidade request/response/decision;
  - evitar fallback silencioso para ticket generico quando o contrato de autoria do ticket estiver insuficiente.

## Jornada de uso
1. O runner executa `spec-ticket-derivation-retrospective` ou `spec-workflow-retrospective` e conclui que ha `systemic-gap` com `high confidence`.
2. O prompt da retrospectiva retorna a analise causal estruturada e, quando `publicationEligibility=true`, um rascunho estruturado do ticket humano a ser publicado.
3. O runner valida esse rascunho, filtra apenas o contexto relevante para remediacao e monta um handoff tipado suficiente para a camada de publicacao.
4. O publisher renderiza o ticket usando o rascunho estruturado como fonte primaria, preservando os metadados canonicos, os caminhos qualificados por projeto, os fingerprints e a trilha request/response/decision.
5. Outra IA ou o operador le o ticket publicado e consegue entender problema, escopo, impacto, proposta de remediacao e evidencias de fechamento sem precisar reconstruir o contexto no trace bruto.

## Requisitos funcionais
- RF-01: a publicacao automatica do ticket transversal deve ser tratada como handoff critico de qualidade do workflow, e nao apenas como materializacao textual da classificacao causal.
- RF-02: `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` e `prompts/11-retrospectiva-workflow-apos-spec-audit.md` devem exigir, quando `publicationEligibility=true`, um bloco estruturado adicional para autoria do ticket humano.
- RF-03: o bloco estruturado de autoria do ticket deve conter, no minimo:
  - `title`;
  - `problemStatement`;
  - `expectedBehavior`;
  - `proposedSolution`;
  - `reproductionSteps`;
  - `impactFunctional`;
  - `impactOperational`;
  - `regressionRisk`;
  - `relevantAssumptionsDefaults`;
  - `closureCriteria`;
  - `affectedWorkflowSurfaces`.
- RF-04: `title` deve ser orientado ao problema sistemico principal e nao pode depender do nome da spec de origem como sujeito principal do ticket, salvo quando isso for indispensavel para evitar ambiguidade.
- RF-05: `problemStatement` deve descrever o problema do workflow de forma autocontida, sem depender de leitura da retrospectiva original para ser entendido.
- RF-06: `expectedBehavior` deve descrever o comportamento esperado do workflow no mesmo contexto causal que originou o ticket, sem recorrer apenas a formulacoes vagas do tipo "reduzir recorrencia futura".
- RF-07: `proposedSolution` deve nomear explicitamente as superficies de workflow que precisam ser ajustadas, como prompts, contrato parseavel, handoff tipado, publisher, documentacao canonica ou testes, e nao pode se resumir ao beneficio esperado da correcao.
- RF-08: `relevantAssumptionsDefaults` deve conter apenas assumptions/defaults da spec de origem que alterem materialmente a remediacao do workflow; o fluxo nao deve despejar automaticamente a lista completa de assumptions/defaults da spec no ticket sistemico.
- RF-09: `closureCriteria` deve ser uma lista estruturada de evidencias observaveis, cada uma vinculada a uma superficie afetada do workflow; criterios puramente genericos de nao recorrencia nao sao suficientes como criterio unico de fechamento.
- RF-10: o contrato tipado em `src/types/workflow-improvement-ticket.ts` deve carregar os campos editoriais necessarios para publicar um ticket humano de alta qualidade, sem depender de sintese generica hardcoded no publisher.
- RF-11: o handoff montado pelo runner deve preservar a separacao entre:
  - resumo causal da analise;
  - beneficio esperado da melhoria;
  - texto humano do ticket a ser publicado.
- RF-12: `sourceRequirements` do ticket transversal nao deve ficar limitado a uma leitura simplificada de "RFs/CAs"; o contrato deve suportar com clareza referencias a RFs, CAs, RNFs e restricoes tecnicas quando essas referencias sustentarem o achado sistemico.
- RF-13: quando `publicationEligibility=true`, ausencia de bloco estruturado valido para autoria do ticket deve ser tratada como violacao de contrato da retrospectiva.
- RF-14: em caso de violacao de contrato ou insuficiencia material do rascunho estruturado, o workflow deve registrar limitacao operacional nao bloqueante e nao deve publicar um ticket placeholder generico em seu lugar.
- RF-15: o publisher deve usar o bloco estruturado de autoria como fonte primaria para `title`, `Problem statement`, `Expected behavior`, `Impact assessment`, `Proposed solution` e `Closure criteria`, mantendo defaults genericos apenas como fallback para campos explicitamente opcionais.
- RF-16: o publisher deve continuar preservando:
  - `Analysis stage`;
  - `Active project`;
  - `Target repository`;
  - `Request ID`;
  - `Request file`, `Response file`, `Decision file`;
  - `Systemic gap fingerprints`;
  - qualificacao de paths cross-repo;
  - deduplicacao por spec canonica + overlap de fingerprints.
- RF-17: `Inherited assumptions/defaults` do ticket publicado deve refletir a lista filtrada em `relevantAssumptionsDefaults`, e nao a lista completa extraida automaticamente da spec.
- RF-18: a documentacao canonica do repositório deve definir a barra minima de qualidade para tickets automaticos oriundos de retrospectiva sistemica, cobrindo ao menos:
  - titulo orientado ao problema;
  - contexto filtrado;
  - ausencia de redundancia evitavel;
  - proposta de remediacao concreta;
  - criterios de fechamento observaveis;
  - comportamento esperado executavel por outra IA.
- RF-19: os testes automatizados do publisher e do runner devem validar qualidade editorial minima do ticket publicado em cenarios pre-run-all e pos-`spec-audit`, incluindo same-repo e cross-repo.
- RF-20: os testes devem cobrir explicitamente que:
  - o titulo deixa de usar wording generico centrado na spec de origem quando houver `title` estruturado;
  - `Inherited assumptions/defaults` nao replica automaticamente a lista completa da spec;
  - `Proposed solution` nomeia superficies concretas;
  - `Closure criteria` nao se resume a frase generica de nao recorrencia;
  - falha no contrato de autoria gera limitacao operacional nao bloqueante, sem ticket generico publicado.
- RF-21: a melhoria desta spec nao deve alterar a semantica de `publicationEligibility`, a taxonomia de `workflow-gap-analysis`, a sequencialidade do fluxo nem a regra de no maximo 1 ticket sistemico por retrospectiva.

## Assumptions and defaults
- O nome do novo artefato estruturado de autoria do ticket pode ser `ticketDraft` ou equivalente, desde que seja parseavel, versionavel e obrigatorio quando `publicationEligibility=true`.
- E preferivel nao publicar ticket automatico algum do que publicar um ticket transversal de baixa qualidade que induza implementacao errada ou retrabalho.
- A analise causal estruturada da retrospectiva continua sendo a source of truth para classificacao, confianca e findings; o rascunho do ticket humano e uma camada adicional de handoff, nao um substituto da analise.
- Fingerprints, deduplicacao, trace e qualificacao cross-repo existentes ja resolvem boa parte da rastreabilidade; o problema principal desta spec esta na autoria e renderizacao do ticket humano.
- A melhoria deve reduzir duplicacao entre `analysisSummary`, `causalHypothesis`, `benefitSummary` e as secoes humanas do ticket, em vez de ampliar texto redundante.

## Nao-escopo
- Alterar a taxonomia `systemic-gap | systemic-hypothesis | not-systemic | emphasis-only | operational-limitation`.
- Alterar o criterio atual de `publicationEligibility`.
- Tornar a publicacao do ticket transversal bloqueante para a spec corrente.
- Introduzir aprovacao manual obrigatoria antes da publicacao do ticket transversal.
- Reescrever retroativamente todos os tickets transversais historicos ja fechados.
- Reprojetar a estrategia de deduplicacao por fingerprints alem do necessario para suportar o novo contrato editorial.
- Resolver, nesta spec, todos os gaps de qualidade da derivacao funcional `spec -> tickets`; o foco aqui e a qualidade do ticket transversal de melhoria de workflow.
- Paralelizar fases do workflow ou abrir mais de 1 ticket sistemico por retrospectiva.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Quando `publicationEligibility=true` em `spec-ticket-derivation-retrospective`, o prompt retorna analise causal estruturada e um bloco parseavel de autoria do ticket com os campos minimos definidos nesta spec.
- [ ] CA-02 - Quando `publicationEligibility=true` em `spec-workflow-retrospective`, o prompt retorna analise causal estruturada e um bloco parseavel de autoria do ticket com os campos minimos definidos nesta spec.
- [ ] CA-03 - O runner rejeita `publicationEligibility=true` sem bloco estruturado valido de autoria do ticket e registra a situacao como limitacao operacional nao bloqueante.
- [ ] CA-04 - O ticket publicado deixa de depender de titulo generico baseado no nome da spec e passa a usar titulo orientado ao problema sistemico.
- [ ] CA-05 - `Inherited assumptions/defaults` do ticket publicado inclui apenas o subconjunto relevante para remediacao do workflow, sem replicar automaticamente a lista completa de assumptions/defaults da spec de origem.
- [ ] CA-06 - `Proposed solution` do ticket publicado nomeia explicitamente as superficies do workflow a serem alteradas.
- [ ] CA-07 - `Closure criteria` do ticket publicado referencia evidencias observaveis em prompts, contratos, publisher, documentacao ou testes, e nao se resume a uma frase generica de nao recorrencia.
- [ ] CA-08 - Em same-repo e cross-repo, o ticket continua preservando request/response/decision, fingerprints, stage-awareness e paths qualificados por projeto.
- [ ] CA-09 - Em caso de contrato editorial invalido ou insuficiente, o workflow registra limitacao operacional nao bloqueante e nao publica ticket placeholder generico.
- [ ] CA-10 - `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md` e a documentacao relevante do workflow passam a explicitar a barra minima de qualidade para tickets automaticos de retrospectiva sistemica.
- [ ] CA-11 - `src/integrations/workflow-improvement-ticket-publisher.test.ts` e testes correlatos cobrem os cenarios pre-run-all e pos-`spec-audit`, validando qualidade editorial minima do ticket gerado.

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
- Nota de uso: esta secao permanece `n/a` ate que esta spec seja executada via `/run_specs`; o foco da spec e a qualidade do ticket transversal de melhoria de workflow, e nao um gate funcional ja rodado nesta linhagem.
- Politica historica: alinhamentos desta secao nao exigem migracao retroativa em massa; material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-23T03:07:57.312Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado cobre de forma coerente as tres frentes abertas da spec: contrato/validacao do ticketDraft, renderizacao editorial com filtro de contexto e barra minima documental. Os tickets herdam explicitamente RNFs, restricoes tecnicas/documentais e validacoes manuais aplicaveis onde isso afeta implementacao, aceite ou documentacao, e os Closure criteria tornam esse aceite observavel sem exigir campos exclusivos de post-implementation audit/review para origem spec-triage.
- Ciclos executados: 0
- Thread da validacao: 019d18a8-596b-7d62-944b-32e7a91ca092
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md [fonte=source-spec]
  - tickets/open/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md [fonte=source-spec]
  - tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: GO (high)
  - Resumo: O pacote derivado cobre de forma coerente as tres frentes abertas da spec: contrato/validacao do ticketDraft, renderizacao editorial com filtro de contexto e barra minima documental. Os tickets herdam explicitamente RNFs, restricoes tecnicas/documentais e validacoes manuais aplicaveis onde isso afeta implementacao, aceite ou documentacao, e os Closure criteria tornam esse aceite observavel sem exigir campos exclusivos de post-implementation audit/review para origem spec-triage.
  - Thread: 019d18a8-596b-7d62-944b-32e7a91ca092
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Nenhuma.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: nao
- Motivo de ativacao ou skip: pulada porque o gate funcional nao revisou gaps em nenhum ciclo.
- Classificacao final: n/a
- Confianca: n/a
- Frente causal analisada: n/a
- Achados sistemicos:
  - n/a
- Artefatos do workflow consultados:
  - n/a
- Elegibilidade de publicacao: n/a
- Resultado do ticket transversal ou limitacao operacional:
  - n/a
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Executar ao menos uma rodada automatizada no proprio `codex-flow-runner` com `systemic-gap` elegivel e confirmar que o ticket publicado usa titulo orientado ao problema, `Proposed solution` concreta e `Closure criteria` observaveis.
  - Executar ao menos uma rodada automatizada em projeto externo com publicacao cross-repo e confirmar que a qualidade editorial do ticket permanece alta sem perder qualificacao de paths e trilha request/response/decision.
- Validacoes manuais pendentes:
  - Exercitar uma spec de origem com lista longa de assumptions/defaults e confirmar que o ticket transversal publica apenas o subconjunto relevante para remediacao do workflow.
  - Exercitar um caminho em que o prompt retorne `publicationEligibility=true`, mas o bloco de autoria do ticket esteja incompleto, e confirmar que o fluxo registra limitacao operacional nao bloqueante sem publicar ticket placeholder generico.
  - Revisar manualmente um ticket publicado a partir de cada retrospectiva e confirmar que outra IA consegue planejar a implementacao sem precisar reler os traces completos da rodada original.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Resultado da validacao final da triagem: a releitura desta spec, dos 3 tickets derivados, de `SPECS.md`, `DOCUMENTATION.md` e do diff atual confirmou consistencia documental entre os gaps registrados, as evidencias citadas e a rastreabilidade aberta; por isso o documento permanece em `Status: approved` com `Spec treatment: pending`.
- Itens atendidos:
  - O repositório ja possui `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` como pontos canonicos de descoberta do backlog sistemico.
  - O workflow ja possui `workflow-gap-analysis` parseavel, publication cross-repo, deduplicacao por fingerprints e trilha request/response/decision.
  - O publisher atual ja preserva boa parte da rastreabilidade operacional e da qualificacao cross-repo necessarias para tickets automaticos confiaveis.
  - A discussao que motivou esta spec ja delimitou com clareza os principais gaps de qualidade: titulo pouco orientado ao problema, excesso de assumptions/defaults irrelevantes, solucao confundida com beneficio e fechamento generico demais.
- Pendencias em aberto:
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` ainda nao exigem um `ticketDraft` parseavel obrigatorio quando `publicationEligibility=true`; o runner continua sintetizando `publicationHandoff` internamente a partir de `summary`, `causalHypothesis`, `benefitSummary` e findings. Ticket derivado: `tickets/open/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`.
  - `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts` e `src/integrations/workflow-improvement-ticket-publisher.ts` ainda nao carregam/renderizam titulo orientado ao problema, `problemStatement`, `expectedBehavior`, `proposedSolution`, `closureCriteria` por superficie e `relevantAssumptionsDefaults` filtradas como fonte primaria; `Source requirements` segue simplificado como `RFs/CAs`. Ticket derivado: `tickets/open/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md`.
  - `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md` e a documentacao compartilhada ainda nao explicitam a barra minima editorial do ticket automatico de retrospectiva sistemica. Ticket derivado: `tickets/open/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`.
- Evidencias de validacao:
  - Validacao final da triagem concluida em 2026-03-23 03:08Z, confirmando consistencia entre `Status: approved`, `Spec treatment: pending`, as 3 pendencias abertas e a rastreabilidade derivada na propria spec.
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/core/runner.ts`
  - `src/types/workflow-gap-analysis.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/integrations/workflow-gap-analysis-parser.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `tickets/closed/2026-03-23-workflow-improvement-2026-03-22-score-de-oportunidade-com-gates-v1-3723af3a.md`

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - 
- Causas-raiz sistemicas identificadas:
  - 
- Ajustes genericos promovidos ao workflow:
  - 

## Riscos e impacto
- Risco funcional: um contrato editorial forte demais pode tornar o prompt mais sensivel a violacoes formais se a implementacao nao balancear bem obrigatoriedade e ergonomia.
- Risco operacional: se a validacao do novo bloco estruturado for frouxa, o fluxo continuara publicando tickets medianos; se for dura demais sem fallback observavel, pode haver perda de oportunidade de backlog sistemico.
- Mitigacao:
  - manter a analise causal atual como fonte de verdade e adicionar autoria estruturada apenas para qualidade do ticket humano;
  - tratar falhas contratuais como limitacao operacional nao bloqueante, com observabilidade explicita;
  - cobrir same-repo, cross-repo e falha contratual em testes dedicados.

## Decisoes e trade-offs
- 2026-03-23 - Priorizar contrato estruturado de autoria do ticket sobre heuristicas cada vez mais sofisticadas no publisher - reduz acoplamento com texto hardcoded e torna a qualidade do ticket verificavel em testes.
- 2026-03-23 - Preferir limitacao operacional nao bloqueante a publicacao de ticket placeholder generico - preserva a qualidade do backlog sistemico e reduz retrabalho futuro.

## Historico de atualizacao
- 2026-03-23 02:32Z - Versao inicial da spec.
- 2026-03-23 02:58Z - Triagem de gaps concluida contra prompts, runner, parser, tipos, publisher, testes e documentacao canonica; 3 tickets derivados abertos para contrato/validacao editorial, renderizacao/filtro de contexto e barra minima documental.
- 2026-03-23 03:08Z - Validacao final da triagem concluida com releitura da spec, dos tickets derivados, de `SPECS.md`, `DOCUMENTATION.md` e do diff atual; o documento permaneceu em `Status: approved` e `Spec treatment: pending` por ainda depender dos 3 tickets abertos.
