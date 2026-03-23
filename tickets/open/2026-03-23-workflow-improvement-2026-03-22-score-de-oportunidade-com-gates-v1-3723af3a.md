# [TICKET] Melhoria transversal de workflow derivada de score de oportunidade com gates v1

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
- Target repository (when applicable): codex-flow-runner (../codex-flow-runner)
- Request ID: 20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1
- Source spec (when applicable): guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md
- Source spec canonical path (when applicable): docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md
- Source requirements (RFs/CAs, when applicable): Restrição técnica: revisão de documentação, Restrições técnicas relevantes, RNF-02
- Inherited assumptions/defaults (when applicable): `p90`, `scenario.aggressive`, `descricaoDetalhada`, `urlImagens`, `bairro`, `cidade`, `estado` e `caracteristicas` livres não entram no score principal nesta versão;; `price_info.confidence` é a semente principal de `confidence`, mas não é suficiente sozinha para representar a confiabilidade do score final;; `staleness` operacional de leilão encerrado ou imóvel inativo continua sendo suficiente para cap severo de score;; a ausência de dado não significa valor negativo, exceto quando a ausência torna a operação materialmente incerta;; a primeira implementação deve tratar esta spec como `policy model v1`, com pesos e thresholds explicitamente versionados e auditáveis.; a visão `cash` de `lance_maximo_info` é a baseline do score; `financiado` pode existir para explicação futura, mas não substitui `cash` no ranking principal;; o perfil-base do score continua sendo investidor racional orientado a retorno econômico-operacional, e não comprador de uso próprio;
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): A menor causa plausível é que triagem, checklist compartilhado e contrato mínimo de tickets modelam a derivação sobretudo por RFs/CAs, assumptions/defaults e validações manuais, deixando RNFs e obrigações técnicas/documentais fora da transferência obrigatória para os tickets e para o gate funcional.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|381eda0e30b3","workflow-finding|629b708e77a3"]
- Related artifacts:
  - Request file: guiadomus-enrich-score/.codex-flow-runner/flow-traces/requests/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-request.md
  - Response file: guiadomus-enrich-score/.codex-flow-runner/flow-traces/responses/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-response.md
  - Decision file: guiadomus-enrich-score/.codex-flow-runner/flow-traces/decisions/20260323t000741z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-22-score-de-oportunidade-com-gates-v1-decision.json
- Related docs/execplans:
  - codex-flow-runner/AGENTS.md
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
  - codex-flow-runner/tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
  - guiadomus-enrich-score/docs/specs/2026-03-22-score-de-oportunidade-com-gates-v1.md
  - guiadomus-enrich-score/tickets/open/2026-03-22-implementar-gated-opportunity-score-v1.md

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
- Scenario: a retrospectiva sistemica pre-run-all da spec 2026-03-22-score-de-oportunidade-com-gates-v1.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Active project: guiadomus-enrich-score
- Target repository: ../codex-flow-runner
- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
A retrospectiva pre-run-all da spec 2026-03-22-score-de-oportunidade-com-gates-v1.md encontrou evidencia de que a derivacao ainda introduz backlog sistemico reaproveitavel antes do /run-all. O follow-up precisa capturar a menor correcao plausivel no proprio workflow para reduzir recorrencia em specs futuras.

## Observed behavior
- O que foi observado:
- A triagem inicial da spec não exige explicitamente que tickets derivados carreguem RNFs e restrições técnicas/documentais relevantes da spec.
- O gate funcional/autocorreção não tem verificação contratual explícita para ausência de RNFs e obrigações técnicas/documentais nos closure criteria dos tickets derivados.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): derivation-gap-analysis com high confidence antes do /run-all

## Expected behavior
O workflow deve prevenir ou absorver automaticamente a causa sistemica registrada durante a retrospectiva pre-run-all, reduzindo recorrencia observada em 2026-03-22-score-de-oportunidade-com-gates-v1.md e em specs futuras equivalentes antes do consumo da fila real.

## Reproduction steps
1. Executar /run_specs para 2026-03-22-score-de-oportunidade-com-gates-v1.md.
2. Revisar o historico completo de spec-ticket-validation e o pacote final de tickets derivados antes do /run-all.
3. Observar derivation-gap-analysis e confirmar o diagnostico causal com evidencia suficiente para backlog sistemico reaproveitavel.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = O contrato de derivação do codex-flow-runner ainda não obriga a herança explícita de RNFs e restrições técnicas/documentais da spec, o que contribuiu materialmente para os gaps corrigidos de RNF-02 e atualização observável de README no pacote derivado.
- Artefatos de workflow consultados: codex-flow-runner/AGENTS.md, codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/DOCUMENTATION.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/PLANS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/SPECS.md, codex-flow-runner/src/core/runner.ts, codex-flow-runner/tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
- Warnings/codes relevantes:
- A triagem inicial da spec não exige explicitamente que tickets derivados carreguem RNFs e restrições técnicas/documentais relevantes da spec.
  - Requisitos relacionados: Restrições técnicas relevantes, RNF-02
  - Artefatos afetados: codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - Evidencias: ../codex-flow-runner/docs/workflows/codex-quality-gates.md repete a checklist de triagem e manda registrar apenas RFs/CAs cobertos nos tickets. | ../codex-flow-runner/INTERNAL_TICKETS.md define a rastreabilidade mínima por IDs de RF/CA de origem, sem obrigação equivalente para RNFs ou restrições técnicas herdadas. | ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md pede extrair RFs, CAs, assumptions/defaults, validações pendentes/manuais e não-escopo, sem exigir RNFs ou restrições técnicas. | No projeto avaliado, o ciclo funcional só chegou ao GO depois que tickets/open/2026-03-22-implementar-gated-opportunity-score-v1.md passou a herdar explicitamente RNF-02 e a exigência de propagação de requestId/propertyId.
  - Fingerprint: workflow-finding|381eda0e30b3
- O gate funcional/autocorreção não tem verificação contratual explícita para ausência de RNFs e obrigações técnicas/documentais nos closure criteria dos tickets derivados.
  - Requisitos relacionados: Restrição técnica: revisão de documentação, RNF-02
  - Artefatos afetados: codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - Evidencias: ../codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md tem regras explícitas para herança de validações pendentes/manuais e para documentation-compliance, mas não cria cheque dedicado para RNFs ou restrições técnicas herdadas da spec. | ../codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md só autoriza correções seguras centradas em validações pendentes/manuais e documentation-compliance. | No projeto avaliado, o segundo gap revisado no histórico completo foi tornar observável no fechamento a atualização de README.md exigida pela spec quando o cálculo de score muda; esse item não estava protegido por um cheque explícito do contrato de validação.
  - Fingerprint: workflow-finding|629b708e77a3
- Tickets funcionais considerados: guiadomus-enrich-score/tickets/open/2026-03-22-implementar-gated-opportunity-score-v1.md
- Hipotese causal consolidada: A menor causa plausível é que triagem, checklist compartilhado e contrato mínimo de tickets modelam a derivação sobretudo por RFs/CAs, assumptions/defaults e validações manuais, deixando RNFs e obrigações técnicas/documentais fora da transferência obrigatória para os tickets e para o gate funcional.
- Beneficio esperado consolidado: Tornar RNFs e restrições técnicas relevantes itens obrigatórios de herança e validação reduz ciclos NO_GO/autocorreção por omissões previsíveis antes de consumir a fila real do /run-all.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|381eda0e30b3, workflow-finding|629b708e77a3

## Impact assessment
- Impacto funcional: novos pacotes derivados podem repetir a mesma lacuna sistemica.
- Impacto operacional: o runner depende de follow-up manual para melhorar o proprio workflow.
- Risco de regressao: medio, porque a correcao tende a tocar instrucoes canonicas, prompts, validacoes ou ordem das etapas compartilhadas.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/INTERNAL_TICKETS.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, ../codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md.

## Initial hypotheses (optional)
- A menor causa plausível é que triagem, checklist compartilhado e contrato mínimo de tickets modelam a derivação sobretudo por RFs/CAs, assumptions/defaults e validações manuais, deixando RNFs e obrigações técnicas/documentais fora da transferência obrigatória para os tickets e para o gate funcional.

## Proposed solution (optional)
- Tornar RNFs e restrições técnicas relevantes itens obrigatórios de herança e validação reduz ciclos NO_GO/autocorreção por omissões previsíveis antes de consumir a fila real do /run-all.

## Closure criteria
- Requisito/RF/CA coberto: Restrição técnica: revisão de documentação, Restrições técnicas relevantes, RNF-02
- Evidencia observavel: a causa sistemica registrada neste ticket deixa de reaparecer em uma rodada equivalente de workflow-gap-analysis/workflow-ticket-publication, com rastreabilidade objetiva nos artefatos afetados.

## Decision log
- 2026-03-23 - Ticket aberto automaticamente a partir da retrospectiva sistemica pre-run-all da derivacao - follow-up sistemico reaproveitavel identificado com high confidence.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
