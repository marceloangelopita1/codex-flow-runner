# [TICKET] Endurecer a herança de RNFs e restrições técnicas na derivação de tickets de spec

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-23 00:07Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-ticket-derivation-retrospective
- Active project (when applicable): guiadomus-enrich-score (../guiadomus-enrich-score)
- Target repository (when applicable): codex-flow-runner (repositório atual)
- Request ID: 20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1
- Source spec (when applicable): ../guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md
- Source spec canonical path (when applicable): docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md
- Source requirements (RFs/CAs, when applicable): RNF-02; Restrições técnicas relevantes; Restrição técnica: revisão de documentação
- Inherited assumptions/defaults (when applicable): RNFs e restrições técnicas da spec precisam sobreviver à derivação quando influenciarem implementação, aceite ou documentação; a propagação de `requestId` e `propertyId` é um exemplo concreto dessa herança; mudanças materiais de cálculo que exigem revisão documental precisam virar critério observável de fechamento no ticket derivado; a correção deve preservar o contrato canônico `spec -> tickets` e continuar não bloqueando a rodada auditada.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): a menor explicação plausível é que triagem, checklist compartilhado e gate funcional ainda modelam a derivação principalmente por RFs/CAs, assumptions/defaults e validações pendentes/manuais, deixando RNFs e obrigações técnicas/documentais fora da herança obrigatória e da validação explícita.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|381eda0e30b3","workflow-finding|629b708e77a3"]
- Related artifacts:
  - Request file: ../guiadomus-enrich-score/.codex-flow-runner/flow-traces/requests/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-request.md
  - Response file: ../guiadomus-enrich-score/.codex-flow-runner/flow-traces/responses/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-response.md
  - Decision file: ../guiadomus-enrich-score/.codex-flow-runner/flow-traces/decisions/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-decision.json
- Related docs/execplans:
  - AGENTS.md
  - DOCUMENTATION.md
  - INTERNAL_TICKETS.md
  - SPECS.md
  - docs/workflows/codex-quality-gates.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/runner.ts
  - tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
  - ../guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md
  - ../guiadomus-enrich-score/tickets/closed/2026-03-22-implementar-gated-opportunity-score-v1.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a lacuna apareceu com alta confiança numa retrospectiva pre-`/run-all` e consumiu um ciclo real de `NO_GO -> autocorreção -> GO` por omissões previsíveis de backlog. Como o contrato afetado é compartilhado, a recorrência potencial é maior que a spec auditada.

## Context
- Workflow area: `spec-triage` -> `spec-ticket-validation` -> `spec-ticket-derivation-retrospective` -> `workflow-ticket-publication`
- Scenario: a retrospectiva pre-`/run-all` da spec `2026-03-22-score-de-oportunidade-com-gates-v1.md` só foi acionada porque o gate funcional revisou gaps reais no histórico completo antes de chegar a `GO`.
- Active project: `../guiadomus-enrich-score`
- Target repository: repositório atual (`codex-flow-runner`)
- Path conventions: caminhos locais sem prefixo pertencem a este repositório; caminhos iniciados por `../guiadomus-enrich-score/` pertencem ao projeto avaliado; a chave canônica para dedupe continua em `Source spec canonical path`.
- Input constraints: este follow-up deve permanecer não bloqueante para a rodada auditada; o publish deve ocorrer apenas no repositório do workflow; a remediação precisa respeitar o contrato `spec -> tickets` antes de qualquer `ticket -> execplan`.

## Problem statement
O contrato atual de derivação `spec -> tickets` e o gate do pacote derivado ainda não tratam RNFs e restrições técnicas/documentais da spec como herança obrigatória quando esses itens influenciam implementação, observabilidade ou fechamento. Na prática, isso permite que um pacote aparentemente suficiente chegue ao gate funcional sem cobrir explicitamente obrigações como `RNF-02` e atualização de `README.md` exigida pela própria spec.

## Observed behavior
- O que foi observado: no histórico completo de `spec-ticket-validation`, o `Ciclo 0` ficou em `NO_GO` porque o ticket principal de implementação ainda não herdava explicitamente `RNF-02` nem tornava observável a revisão de `README.md` exigida pela spec. O pacote só chegou a `GO` no `Ciclo 1`, depois que esses pontos foram adicionados manualmente ao ticket derivado. A retrospectiva mostrou que essa omissão não é só local: triagem, checklist compartilhado e gate/autocorreção ainda não exigem essa herança de forma contratual.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura do histórico completo de `spec-ticket-validation`, `derivation-gap-analysis` com confiança alta e inspeção dos artefatos compartilhados do workflow.

## Expected behavior
Antes do `/run-all`, o workflow deve exigir e validar explicitamente a herança de RNFs e de restrições técnicas/documentais relevantes da spec quando esses itens impactarem implementação, rastreabilidade ou critérios de fechamento dos tickets derivados. A rodada ideal deve chegar ao `GO` sem depender de correção manual equivalente à ocorrida nesta spec.

## Reproduction steps
1. Ler `../guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md` e localizar `Restrições técnicas relevantes`, `Restrições e requisitos não funcionais` e a exigência de revisão de `README.md` quando o cálculo de score muda.
2. Ler a seção `Gate de validação dos tickets derivados` da mesma spec e confirmar que o `Ciclo 0` apontou ausência de cobertura explícita para `RNF-02` e para a atualização observável de `README.md`, enquanto o `Ciclo 1` virou `GO` após correção do ticket derivado.
3. Ler `docs/workflows/codex-quality-gates.md`, `INTERNAL_TICKETS.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` e confirmar que o contrato compartilhado ainda não exige nem valida explicitamente RNFs e restrições técnicas/documentais herdadas da spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): `../guiadomus-enrich-score/.codex-flow-runner/flow-traces/responses/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-response.md` conclui `systemic-gap` com confiança alta e resume que o contrato atual do `codex-flow-runner` ainda não obriga herança explícita de RNFs e restrições técnicas/documentais da spec.
- Artefatos de workflow consultados: `AGENTS.md`, `DOCUMENTATION.md`, `INTERNAL_TICKETS.md`, `SPECS.md`, `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`, `src/core/runner.ts`, `tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md`
- Warnings/codes relevantes:
  - `workflow-finding|381eda0e30b3`: a triagem inicial da spec não exige explicitamente que tickets derivados carreguem RNFs e restrições técnicas/documentais relevantes. Evidências: `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` mandam extrair RFs/CAs, assumptions/defaults, validações pendentes/manuais e não-escopo, mas não RNFs nem restrições técnicas; `INTERNAL_TICKETS.md` ainda define a rastreabilidade mínima com foco em RF/CA; no projeto avaliado, o ticket `../guiadomus-enrich-score/tickets/closed/2026-03-22-implementar-gated-opportunity-score-v1.md` só ficou adequado depois de herdar explicitamente `RNF-02` e a exigência de propagação de `requestId`/`propertyId`.
  - `workflow-finding|629b708e77a3`: o gate funcional/autocorreção não trata a ausência de RNFs e de obrigações técnicas/documentais herdadas como verificação contratual explícita. Evidências: `prompts/09-validar-tickets-derivados-da-spec.md` tem regras claras para validações pendentes/manuais e `documentation-compliance`, mas não cria cheque dedicado para RNFs ou restrições técnicas herdadas; `prompts/10-autocorrigir-tickets-derivados-da-spec.md` não autoriza correção segura explícita para essa lacuna; no projeto avaliado, a revisão observável de `README.md` precisou ser adicionada ao ticket de implementação durante a revalidação para o pacote chegar a `GO`.
- Tickets funcionais considerados: `../guiadomus-enrich-score/tickets/closed/2026-03-22-implementar-gated-opportunity-score-v1.md`
- Hipotese causal consolidada: a menor causa plausível é que triagem, checklist compartilhado e gate funcional ainda modelam a derivação principalmente por RFs/CAs, assumptions/defaults e validações pendentes/manuais, deixando RNFs e obrigações técnicas/documentais fora da herança obrigatória e da validação explícita.
- Beneficio esperado consolidado: tornar RNFs e restrições técnicas relevantes itens obrigatórios de herança e validação deve reduzir ciclos `NO_GO` por omissões previsíveis antes de consumir a fila real do `/run-all`.
- Comparativo antes/depois (se houver): antes, o pacote dependeu de correção manual do ticket de implementação para cobrir `RNF-02` e atualização observável de `README.md`; depois esperado, a triagem e o gate absorvem essa necessidade de forma determinística antes da fila real.

## Impact assessment
- Impacto funcional: futuros pacotes derivados podem continuar chegando ao gate sem cobertura explícita de RNFs e obrigações técnicas/documentais relevantes, mesmo quando os RFs/CAs centrais já estiverem cobertos.
- Impacto operacional: o runner gasta ciclos extras de revisão/autocorreção antes do `/run-all` para corrigir uma omissão previsível do próprio contrato de derivação.
- Risco de regressao: medio, porque a remediação tende a tocar instruções canônicas, prompts compartilhados, critérios de validação e possivelmente fixtures/testes do workflow.
- Scope estimado (quais fluxos podem ser afetados): `INTERNAL_TICKETS.md`, `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md` e testes/fixtures associados ao fluxo `run_specs`.

## Initial hypotheses (optional)
- A correção mais robusta é promover RNFs e restrições técnicas/documentais relevantes a itens explícitos do contrato de triagem e do gate funcional, de modo que sua ausência vire gap observável e corrigível antes do `/run-all`.

## Proposed solution (optional)
- Atualizar o contrato compartilhado para: extrair RNFs e restrições técnicas relevantes da spec na triagem; exigir que esses itens apareçam no ticket derivado quando influenciarem implementação, aceite ou documentação; e ensinar o gate/autocorreção a detectar e corrigir essa ausência de forma segura.

## Closure criteria
- Requisito/RF/CA coberto: contrato de triagem `spec -> tickets`
- Evidencia observavel: `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` passam a exigir extração e herança explícita de RNFs e restrições técnicas/documentais relevantes quando esses itens impactarem implementação, documentação ou critérios de fechamento.
- Requisito/RF/CA coberto: contrato mínimo do ticket derivado
- Evidencia observavel: `INTERNAL_TICKETS.md` passa a exigir rastreabilidade de RNFs e restrições técnicas relevantes quando elas influenciarem implementação, aceite ou documentação, em vez de deixar o contrato mínimo restrito na prática a RF/CA.
- Requisito/RF/CA coberto: gate funcional e autocorreção do pacote derivado
- Evidencia observavel: `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` passam a tratar a ausência dessa herança como gap observável e corrigível antes do `/run-all`.
- Requisito/RF/CA coberto: prova de não regressão do contrato
- Evidencia observavel: teste, fixture ou trace determinístico mostra uma spec com RNF e obrigação documental gerando ticket derivado que já nasce com esses itens herdados e chega ao `GO` sem depender de correção manual equivalente à desta rodada.

## Decision log
- 2026-03-23 - Ticket aberto automaticamente a partir da retrospectiva sistêmica pre-`/run-all` da derivação - o histórico real da validação mostrou que a omissão de `RNF-02` e de revisão documental observável não foi só um erro local do pacote, mas um ponto cego reaproveitável do contrato compartilhado do workflow.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
