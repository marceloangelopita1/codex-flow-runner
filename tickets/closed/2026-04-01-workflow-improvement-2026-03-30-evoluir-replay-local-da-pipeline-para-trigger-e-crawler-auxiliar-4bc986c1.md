# [TICKET] Explicitar reconciliacao de backlog aberto na triagem de tickets derivados de spec

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-01 16:22Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-ticket-derivation-retrospective
- Active project (when applicable): guiadomus-scheduler (../guiadomus-scheduler)
- Target repository (when applicable): codex-flow-runner (../codex-flow-runner)
- Request ID: 20260401t162208z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar
- Source spec (when applicable): guiadomus-scheduler/docs/specs/2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md
- Source spec canonical path (when applicable): docs/specs/2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md
- Source requirements (when applicable): ../codex-flow-runner/docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md#RF-08, ../codex-flow-runner/docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md#RF-09
- Inherited assumptions/defaults (when applicable): O `spec-ticket-validation` continua sendo o gate pre-/run-all e nao deve virar etapa obrigatoria de limpeza editorial que a triagem poderia evitar.; O contrato canonico permanece `spec -> tickets`; a melhoria nao reintroduz `spec -> execplan` direto.; O workflow ja suporta backlog derivado por `Source spec`, `Related tickets` e linhagem `hybrid` na validacao.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): O prompt e o checklist de spec-triage tratam a derivacao como criacao de tickets novos, mas nao tornam obrigatoria a releitura e normalizacao de tickets abertos ja relacionados a mesma spec quando a rodada e uma retriagem documental com backlog existente.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|25ecfb1d3e89"]
- Related artifacts:
  - Request file: guiadomus-scheduler/.codex-flow-runner/flow-traces/requests/20260401t162208z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-request.md
  - Response file: guiadomus-scheduler/.codex-flow-runner/flow-traces/responses/20260401t162208z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-response.md
  - Decision file: guiadomus-scheduler/.codex-flow-runner/flow-traces/decisions/20260401t162208z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-decision.json
- Related docs/execplans:
  - codex-flow-runner/AGENTS.md
  - codex-flow-runner/docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - codex-flow-runner/docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md
  - codex-flow-runner/docs/workflows/codex-quality-gates.md
  - codex-flow-runner/DOCUMENTATION.md
  - codex-flow-runner/INTERNAL_TICKETS.md
  - codex-flow-runner/PLANS.md
  - codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md
  - codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - codex-flow-runner/SPECS.md
  - codex-flow-runner/src/core/runner.ts
  - codex-flow-runner/src/core/spec-ticket-validation.ts
  - codex-flow-runner/src/types/spec-ticket-validation.ts
  - guiadomus-scheduler/docs/specs/2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md
  - guiadomus-scheduler/tickets/open/2026-03-31-alinhar-fixture-ou-capacidade-downstream-para-o-replay-local-trigger-crawler.md
  - guiadomus-scheduler/tickets/open/2026-04-01-reclassificar-backlog-residual-historico-da-spec-de-replay-local-trigger-crawler.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): gaps sistemicos observados com alta confianca durante derivation-gap-analysis pre-run-all.

## Context
- Workflow area: spec-ticket-derivation-retrospective -> workflow-ticket-publication
- Scenario: a retrospectiva sistemica pre-run-all da spec 2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Active project: guiadomus-scheduler
- Target repository: ../codex-flow-runner
- Affected workflow surfaces: documentacao, prompt, testes
- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
O workflow de spec-triage ja convive com specs que chegam a nova rodada trazendo tickets abertos na propria linhagem, mas a instrucao principal de derivacao continua centrada em criar tickets novos e atualizar `Related tickets`. Sem uma regra explicita para reler, reconciliar e normalizar tickets abertos ja existentes, a IA pode abrir um ticket sucessor ou de reclassificacao e deixar o ticket historico ainda carregando ownership e `Closure criteria` sobrepostos. O resultado e que a ausencia de duplicacao e a fronteira correta de ownership so ficam ajustadas depois pelo `spec-ticket-validation`, em vez de sairem corretas da triagem.

## Observed behavior
- O que foi observado:
- O workflow aceita backlog hibrido na validacao, mas a triagem nao obriga reconciliacao de tickets abertos ja existentes na mesma linhagem antes de criar um ticket sucessor.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): derivation-gap-analysis com high confidence antes do /run-all

## Expected behavior
Quando a spec ja tiver backlog aberto na linhagem resolvida por `Source spec`, `Related tickets` ou modo `hybrid`, a triagem deve primeiro comparar o backlog existente com os gaps atuais e decidir explicitamente entre reutilizar/atualizar ticket aberto, dividir ownership com fronteira observavel ou justificar coexistencia. Se um novo ticket absorver a ownership de um residual historico, o ticket antigo deve ser normalizado no mesmo ciclo para nao continuar carregando aceite funcional ou `Closure criteria` duplicados.

## Reproduction steps
Executar a triagem via `../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md` sem uma instrucao explicita de reconciliar os tickets abertos existentes.
Observar que o novo ticket pode ser criado enquanto o ticket historico permanece aberto com `Closure criteria` e ownership sobrepostos, gerando `duplication-gap` e/ou `closure-criteria-gap` no `spec-ticket-validation`.
Usar uma spec que ja referencie ticket aberto historico em `Related tickets` e precise abrir um novo ticket sucessor de backlog documental.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = A triagem de spec nao exige reconciliar tickets abertos ja existentes na linhagem antes de abrir ticket sucessor, embora o workflow suporte backlog hibrido na validacao; isso contribuiu materialmente para duplication-gap e closure-criteria-gap revisados nesta rodada.
- Artefatos de workflow consultados: codex-flow-runner/AGENTS.md, codex-flow-runner/docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md, codex-flow-runner/docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md, codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/DOCUMENTATION.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/PLANS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/SPECS.md, codex-flow-runner/src/core/runner.ts, codex-flow-runner/src/core/spec-ticket-validation.ts, codex-flow-runner/src/types/spec-ticket-validation.ts
- Warnings/codes relevantes:
- O workflow aceita backlog hibrido na validacao, mas a triagem nao obriga reconciliacao de tickets abertos ja existentes na mesma linhagem antes de criar um ticket sucessor.
  - Requisitos relacionados: ../codex-flow-runner/docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md#RF-08, ../codex-flow-runner/docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md#RF-09
  - Artefatos afetados: codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - Evidencias: A prompt de triagem manda criar ticket(s) e atualizar `Related tickets`, mas nao manda reler e normalizar tickets abertos ja ligados a spec antes de abrir ticket sucessor. | Nesta linhagem do projeto avaliado, o ticket `tickets/open/2026-04-01-reclassificar-backlog-residual-historico-da-spec-de-replay-local-trigger-crawler.md` foi aberto enquanto `tickets/open/2026-03-31-alinhar-fixture-ou-capacidade-downstream-para-o-replay-local-trigger-crawler.md` permaneceu com ownership e `Closure criteria` sobrepostos ate o `spec-ticket-validation` revisar ambos. | O historico funcional da spec mostra ciclo 0 com `closure-criteria-gap` e `duplication-gap`, seguido de ciclo 1 com `GO` apenas apos reancoragem explicita do ticket historico e da ownership exclusiva do ticket de 2026-04-01. | O runner reconstrui o pacote de validacao usando `Source spec`, `Related tickets` e linhagem `hybrid`, o que mostra que backlog aberto reaproveitavel e um modo suportado do workflow.
  - Fingerprint: workflow-finding|25ecfb1d3e89
- Tickets funcionais considerados: guiadomus-scheduler/tickets/open/2026-03-31-alinhar-fixture-ou-capacidade-downstream-para-o-replay-local-trigger-crawler.md, guiadomus-scheduler/tickets/open/2026-04-01-reclassificar-backlog-residual-historico-da-spec-de-replay-local-trigger-crawler.md
- Hipotese causal consolidada: O prompt e o checklist de spec-triage tratam a derivacao como criacao de tickets novos, mas nao tornam obrigatoria a releitura e normalizacao de tickets abertos ja relacionados a mesma spec quando a rodada e uma retriagem documental com backlog existente.
- Beneficio esperado consolidado: Explicitar reconciliacao e anti-duplicacao na triagem reduz correcoes no spec-ticket-validation, evita backlog aberto redundante antes do /run-all e melhora a qualidade do pacote derivado em rodadas de retriagem.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|25ecfb1d3e89

## Impact assessment
- Impacto funcional: O pacote derivado pode chegar ao gate funcional com ownership duplicada e criterios de fechamento desatualizados, apesar de o backlog ja estar semanticamente reancorado.
- Impacto operacional: A fila antes do /run-all fica mais ruidosa, o gate funcional precisa gastar ciclos de autocorrecao editorial e a leitura do estado real da spec fica menos confiavel.
- Risco de regressao: Baixo a medio; a mudanca endurece a barra de triagem para retriagens com backlog aberto, mas preserva o contrato `spec -> tickets` e nao altera o veredito funcional do gate.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md.

## Initial hypotheses (optional)
- O prompt e o checklist de spec-triage tratam a derivacao como criacao de tickets novos, mas nao tornam obrigatoria a releitura e normalizacao de tickets abertos ja relacionados a mesma spec quando a rodada e uma retriagem documental com backlog existente.

## Proposed solution (optional)
Atualizar `../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md` para exigir releitura e reconciliacao de tickets abertos da linhagem antes de criar ticket novo; complementar `../codex-flow-runner/docs/workflows/codex-quality-gates.md` com um checklist explicito para retriagem com backlog aberto; e adicionar testes cobrindo uma spec com ticket historico aberto e novo ticket sucessor, verificando que a triagem nao deixa ownership e `Closure criteria` sobrepostos.

## Closure criteria
- Refs de origem relacionadas: ../codex-flow-runner/docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md#RF-08, ../codex-flow-runner/docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md#RF-09
- A evidencia de teste mostra que o pacote derivado sai da triagem sem `duplication-gap` ou `closure-criteria-gap` decorrentes apenas de backlog historico ainda nao reconciliado.
- A prompt `../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md` passa a exigir explicitamente releitura e reconciliacao de tickets abertos da linhagem antes de abrir ticket novo em rodada de retriagem.
- Ha teste automatizado cobrindo uma spec com backlog aberto `hybrid` em que a triagem abre ticket sucessor sem deixar o ticket historico carregando aceite funcional ou fechamento duplicado.
- O checklist em `../codex-flow-runner/docs/workflows/codex-quality-gates.md` passa a tratar como verificacao obrigatoria a normalizacao de ownership e `Closure criteria` quando houver ticket historico aberto e ticket sucessor na mesma linhagem.

## Closure validation
- Criterio 1 (evidencia de teste contra `duplication-gap` / `closure-criteria-gap` por backlog historico nao reconciliado): atendido.
  Evidencia objetiva: `src/integrations/codex-client.test.ts` agora trava o prompt real de `spec-triage` exigindo releitura da linhagem por `Source spec`, `Related tickets` ou `hybrid`, a decisao explicita entre `reutilizar/atualizar ticket aberto`, `dividir ownership com fronteira observavel` ou `justificar coexistencia`, e a normalizacao do ticket historico no mesmo ciclo; `src/core/runner.test.ts` agora ancora a topologia `hybrid` com `ticket historico aberto + ticket sucessor` e `Closure criteria` distintos para cada papel. Revalidado com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts src/core/runner.test.ts` em 2026-04-01 16:50Z; o script expandiu para a suite `src/**/*.test.ts` e concluiu verde (`538/538`). A ausencia dos gaps citados aqui e inferencia tecnica sustentada por essas duas provas automatizadas complementares, nao por afirmacao manual.
- Criterio 2 (prompt de triagem exige releitura e reconciliacao explicitas): atendido.
  Evidencia objetiva: `prompts/01-avaliar-spec-e-gerar-tickets.md` agora exige releitura de tickets abertos da mesma linhagem resolvida por `Source spec`, `Related tickets` ou `hybrid`, enumera as tres decisoes aceitas de reconciliacao e obriga normalizacao do ticket historico quando o sucessor absorver ownership. Revalidado com `rg -n "reler tickets abertos|reutilizar/atualizar ticket aberto|dividir ownership com fronteira observável|justificar coexistência|normalizar o ticket histórico" prompts/01-avaliar-spec-e-gerar-tickets.md` em 2026-04-01 16:50Z.
- Criterio 3 (teste automatizado cobre backlog aberto `hybrid` com ticket historico + sucessor): atendido.
  Evidencia objetiva: `src/core/runner.test.ts` ganhou o teste `buildSpecTicketValidationPackageContext preserva topologia hybrid com ticket historico aberto e ticket sucessor`, assertando `lineageSource: "hybrid"`, a presenca dos dois tickets na ordem esperada e `Closure criteria` separados para historico e sucessor. Revalidado pelo mesmo comando de testes de 2026-04-01 16:50Z e por `rg -n "preserva topologia hybrid|Ticket historico preserva apenas rastreabilidade documental|Ticket sucessor concentra a ownership atual desta linhagem" src/core/runner.test.ts`.
- Criterio 4 (checklist compartilhado trata normalizacao de ownership e `Closure criteria` como obrigatoria): atendido.
  Evidencia objetiva: `docs/workflows/codex-quality-gates.md` agora carrega o guardrail de reconciliacao de backlog aberto na triagem, a obrigacao de explicitar fronteira de ownership no ExecPlan/execucao e a condicao de `GO` no fechamento quando coexistirem ticket historico e ticket sucessor. Revalidado com `rg -n "Source spec|Related tickets|hybrid|duplication-gap|closure-criteria-gap|ticket histórico|ticket sucessor|Closure criteria" docs/workflows/codex-quality-gates.md` em 2026-04-01 16:50Z.
- Checklist aplicado (`docs/workflows/codex-quality-gates.md`): concluido.
  Evidencia objetiva: releitura integral do diff, do ticket, do ExecPlan `execplans/2026-04-01-workflow-improvement-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-4bc986c1.md`, das specs internas `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md#RF-08` e `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md#RF-09`, do caso causal em `../guiadomus-scheduler` e do proprio checklist antes da decisao final; `npm run check` tambem concluiu sem erros em 2026-04-01 16:50Z.

## Decision log
- 2026-04-01 - Ticket aberto automaticamente a partir da retrospectiva sistemica pre-run-all da derivacao - follow-up sistemico reaproveitavel identificado com high confidence.
- 2026-04-01 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, specs/RFs internas, caso causal em `../guiadomus-scheduler` e `docs/workflows/codex-quality-gates.md`; resultado final `GO`, sem follow-up, porque os quatro closure criteria foram atendidos integralmente por `prompt + checklist + testes`.

## Closure
- Closed at (UTC): 2026-04-01 16:50Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-04-01-workflow-improvement-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-4bc986c1.md (commit: mesmo changeset de fechamento versionado pelo runner)
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Validacao manual externa pendente: nao
