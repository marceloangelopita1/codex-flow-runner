# [TICKET] Usar o draft estruturado como fonte primaria do ticket sistemico automatico

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S1
- Created at (UTC): 2026-03-23 02:58Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional): tickets/open/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable):
- Active project (when applicable):
- Target repository (when applicable):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-12, RF-15, RF-16, RF-17, RF-19, RF-20, RF-21; CA-04, CA-05, CA-06, CA-07, CA-08, CA-11
- Inherited assumptions/defaults (when applicable): a analise causal estruturada continua sendo a source of truth para classificacao, confianca e findings; fingerprints, deduplicacao, trace e qualificacao cross-repo ja resolvem boa parte da rastreabilidade e devem ser preservados; a melhoria deve reduzir duplicacao entre `analysisSummary`, `causalHypothesis`, `benefitSummary` e as secoes humanas do ticket, em vez de ampliar redundancia textual; `relevantAssumptionsDefaults` deve carregar apenas o subconjunto material para a remediacao.
- Inherited RNFs (when applicable): o ticket automatico publicado precisa ser um handoff de alta qualidade entre IAs e operadores, com contexto filtrado, evidencias especificas e comportamento esperado executavel sem reconstrucao manual do trace original.
- Inherited technical/documentary constraints (when applicable): manter o fluxo sequencial e nao bloqueante; preservar same-repo/cross-repo em `../codex-flow-runner`, fingerprints, deduplicacao, request-response-decision, qualificacao de paths por projeto e o limite de no maximo 1 ticket transversal agregado por retrospectiva; nao alterar a semantica de `publicationEligibility` nem a taxonomia `workflow-gap-analysis`.
- Inherited pending/manual validations (when applicable): executar ao menos uma rodada automatizada no proprio `codex-flow-runner` com `systemic-gap` elegivel e confirmar titulo orientado ao problema, `Proposed solution` concreta e `Closure criteria` observaveis; executar ao menos uma rodada automatizada em projeto externo com publicacao cross-repo e confirmar que a qualidade editorial permanece alta sem perder paths qualificados e trilha request-response-decision; exercitar uma spec de origem com lista longa de assumptions/defaults e confirmar que o ticket transversal publica apenas o subconjunto relevante; revisar manualmente um ticket publicado a partir de cada retrospectiva e confirmar que outra IA consegue planejar a implementacao sem precisar reler os traces completos.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a - derivacao pre-implementacao desta spec
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
  - docs/workflows/codex-quality-gates.md
  - prompts/11-retrospectiva-workflow-apos-spec-audit.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/runner.ts
  - src/types/workflow-improvement-ticket.ts
  - src/integrations/workflow-improvement-ticket-publisher.ts
  - src/integrations/workflow-improvement-ticket-publisher.test.ts
  - src/core/runner.test.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): mesmo depois de resolver o contrato do `ticketDraft`, o publisher atual continuara publicando titulo, problema, comportamento esperado, solucao e fechamento com texto sintetico hardcoded se a renderizacao nao for trocada para usar o draft estruturado como fonte primaria. Isso mantem alto o risco de backlog sistemico mal direcionado.

## Context
- Workflow area: montagem do candidato, renderizacao do ticket transversal e testes de regressao editorial
- Scenario: o pipeline ja preserva stage-awareness, deduplicacao, publish same-repo/cross-repo e trilha request-response-decision, mas o conteudo humano do ticket ainda e sintetizado a partir do nome da spec, `benefitSummary` e uma frase generica de nao recorrencia.
- Input constraints: a correcao precisa preservar a rastreabilidade operacional ja existente e reduzir, nao ampliar, a redundancia entre analise causal e texto humano do ticket.

## Problem statement
`src/integrations/workflow-improvement-ticket-publisher.ts` ainda define `# [TICKET] Melhoria transversal de workflow derivada de ${candidate.sourceSpecTitle}`, gera `problemStatement` e `expectedBehavior` baseados na spec de origem, usa `benefitSummary` como `Proposed solution`, replica toda a lista de assumptions/defaults extraida da spec e fecha com um criterion unico de "deixa de reaparecer". Em paralelo, `src/types/workflow-improvement-ticket.ts` e `src/core/runner.ts` continuam carregando apenas um handoff editorial minimo, incapaz de distinguir titulo orientado a problema, surfaces afetadas, closure criteria por superficie e refs mais claras a RF/CAs/RNFs/restricoes tecnicas.

## Observed behavior
- O que foi observado:
  - o titulo atual do ticket e derivado de `sourceSpecTitle`, nao do problema sistemico principal;
  - `problemStatement` e `expectedBehavior` sao textos genericos montados pelo publisher;
  - `Proposed solution` recebe apenas `candidate.benefitSummary`;
  - `Inherited assumptions/defaults` recebe `handoff.inheritedAssumptionsDefaults`, que hoje vem da lista completa da spec;
  - `Closure criteria` usa uma unica evidencia generica de nao recorrencia;
  - `Source requirements` continua rotulado como leitura simplificada de `RFs/CAs`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts` e `src/integrations/workflow-improvement-ticket-publisher.test.ts`.

## Expected behavior
Com o contrato estruturado disponivel, o publisher deve usar o draft como fonte primaria para `title`, `Problem statement`, `Expected behavior`, `Impact assessment`, `Proposed solution` e `Closure criteria`, filtrando assumptions/defaults para o subconjunto relevante, suportando refs mais claras a RF/CAs/RNFs/restricoes e mantendo stage-awareness, dedupe, same-repo/cross-repo e trilha request-response-decision.

## Reproduction steps
1. Ler `src/integrations/workflow-improvement-ticket-publisher.ts`.
2. Confirmar que o titulo hardcoded usa `candidate.sourceSpecTitle`.
3. Confirmar que `Proposed solution` recebe `candidate.benefitSummary`, `Inherited assumptions/defaults` recebe a lista inteira e `Closure criteria` tem um unico criterio generico.
4. Ler `src/integrations/workflow-improvement-ticket-publisher.test.ts` e verificar que a suite atual cobre principalmente paths, trace e dedupe, nao a qualidade editorial minima exigida pela spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta triagem documental.
- Warnings/codes relevantes:
  - `src/integrations/workflow-improvement-ticket-publisher.ts:398-417` gera `problemStatement`, `expectedBehavior` e `reproductionSteps` genericos por stage.
  - `src/integrations/workflow-improvement-ticket-publisher.ts:447-448` continua tratando `Source requirements` como `RFs/CAs` e despejando assumptions herdadas em linha unica.
  - `src/integrations/workflow-improvement-ticket-publisher.ts:512-517` usa `benefitSummary` como `Proposed solution` e fecha com um criterio unico de nao recorrencia.
  - `src/core/runner.ts:6383-6390` extrai automaticamente todos os bullets de `Assumptions and defaults` e os injeta no handoff.
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts` hoje valida publish same-repo/cross-repo e reuso, mas nao afirma titulo orientado ao problema, filtro de assumptions, solucao concreta nem closure criteria por superficie.
- Comparativo antes/depois (se houver): antes = ticket confiavel como rastro operacional, mas editorialmente generico; depois esperado = ticket humano autoexplicativo, acionavel e com aceite observavel por superficie afetada.

## Impact assessment
- Impacto funcional: outra IA pode interpretar mal a frente causal e propor remediacao errada ou ampla demais.
- Impacto operacional: o operador continua precisando reler trace, prompt e findings para descobrir o problema central e o que precisa ser alterado.
- Risco de regressao: medio, porque a entrega toca tipos compartilhados, montagem do candidato, renderer do ticket e suites de teste same-repo/cross-repo.
- Scope estimado (quais fluxos podem ser afetados): `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/core/runner.test.ts`.

## Initial hypotheses (optional)
- O caminho mais seguro e tornar o draft estruturado a fonte unica das secoes humanas obrigatorias, mantendo texto generico apenas para campos explicitamente opcionais ou ausentes por contrato.

## Proposed solution (optional)
- Ampliar o handoff/candidato com os campos editoriais exigidos pela spec, filtrar `relevantAssumptionsDefaults`, explicitar `affectedWorkflowSurfaces` e renderizar `title`, `Problem statement`, `Expected behavior`, `Impact assessment`, `Proposed solution` e `Closure criteria` diretamente a partir do draft, com testes same-repo e cross-repo cobrindo qualidade minima.

## Closure criteria
- Requisito/RF/CA coberto: RF-04, RF-05, RF-06, RF-07, RF-15, CA-04, CA-06
- Evidencia observavel: o ticket publicado deixa de usar titulo centrado na spec e passa a renderizar `title`, `Problem statement`, `Expected behavior` e `Proposed solution` a partir do draft estruturado, nomeando explicitamente as superficies de workflow afetadas.
- Requisito/RF/CA coberto: RF-08, RF-09, RF-17, CA-05, CA-07
- Evidencia observavel: `Inherited assumptions/defaults` passa a refletir somente `relevantAssumptionsDefaults`, e `Closure criteria` passa a listar evidencias observaveis vinculadas a prompts, contratos, publisher, documentacao e/ou testes, sem se resumir a nao recorrencia generica.
- Requisito/RF/CA coberto: RF-12, RF-16, RF-21, CA-08
- Evidencia observavel: `sourceRequirements` do ticket published suporta refs a RFs, CAs, RNFs e restricoes tecnicas/documentais relevantes sem perder stage-awareness, request-response-decision, fingerprints, dedupe e paths qualificados por projeto em same-repo e cross-repo.
- Requisito/RF/CA coberto: RF-19, RF-20, CA-11
- Evidencia observavel: testes automatizados do publisher e do runner cobrem cenarios pre-run-all e pos-`spec-audit`, incluindo same-repo e cross-repo, validando titulo orientado ao problema, assumptions filtradas, `Proposed solution` concreta, `Closure criteria` especificos e preservacao da rastreabilidade operacional.
- Requisito/RF/CA coberto: validacoes manuais herdadas
- Evidencia observavel: o ticket/fechamento registra quais validacoes runtime/manuais desta spec foram executadas, quais permaneceram externas e por que isso nao invalida o aceite tecnico local.

## Decision log
- 2026-03-23 - Ticket aberto a partir da triagem da spec - a renderizacao editorial e o filtro de contexto formam um pacote distinto do endurecimento contratual porque dependem do draft estruturado, mas nao devem bloquear a abertura desse contrato.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
