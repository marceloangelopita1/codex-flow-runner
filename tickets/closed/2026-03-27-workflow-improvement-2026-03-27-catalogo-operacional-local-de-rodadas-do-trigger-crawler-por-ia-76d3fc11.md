# [TICKET] Spec-triage externo nao resolve o checklist compartilhado do workflow

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-27 22:33Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-ticket-derivation-retrospective
- Active project (when applicable): guiadomus-caixa-trigger-crawler (../guiadomus-caixa-trigger-crawler)
- Target repository (when applicable): codex-flow-runner (../codex-flow-runner)
- Request ID: 20260327t223324z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia
- Source spec (when applicable): guiadomus-caixa-trigger-crawler/docs/specs/2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia.md
- Source spec canonical path (when applicable): docs/specs/2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia.md
- Source requirements (when applicable): CA-01, CA-12, CA-13, RF-01, RF-21, RF-36, RO-02, RO-04
- Inherited assumptions/defaults (when applicable): O gate funcional continua sendo a autoridade final de GO/NO_GO; a remediacao deve reduzir retrabalho pre-run-all, nao substituir o gate.; Projetos externos compativeis com o workflow completo nao recebem hoje uma copia local de `docs/workflows/codex-quality-gates.md` via target-prepare.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): O prompt/contexto de spec-triage nao qualifica o caminho do checklist compartilhado para repositorios externos; como target-prepare nao materializa esse arquivo no projeto alvo, a primeira derivacao pode seguir sem consultar o gate canonico que reforca heranca e closure criteria observaveis.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|1f3a1b13bb96"]
- Related artifacts:
  - Request file: guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/requests/20260327t223324z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-request.md
  - Response file: guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/responses/20260327t223324z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-response.md
  - Decision file: guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/decisions/20260327t223324z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-decision.json
- Related docs/execplans:
  - codex-flow-runner/AGENTS.md
  - codex-flow-runner/docs/workflows/codex-quality-gates.md
  - codex-flow-runner/docs/workflows/target-prepare-managed-agents-section.md
  - codex-flow-runner/docs/workflows/target-prepare-managed-readme-section.md
  - codex-flow-runner/docs/workflows/target-project-compatibility-contract.md
  - codex-flow-runner/DOCUMENTATION.md
  - codex-flow-runner/INTERNAL_TICKETS.md
  - codex-flow-runner/PLANS.md
  - codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md
  - codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - codex-flow-runner/SPECS.md
  - codex-flow-runner/src/core/runner.ts
  - codex-flow-runner/src/integrations/codex-client.ts
  - codex-flow-runner/tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
  - guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/decisions/20260327t222513z-run-specs-spec-spec-ticket-validation-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-decision.json
  - guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/requests/20260327t221720z-run-specs-spec-spec-triage-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-request.md
  - guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/requests/20260327t222513z-run-specs-spec-spec-ticket-validation-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-request.md
  - guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/responses/20260327t221720z-run-specs-spec-spec-triage-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-response.md
  - guiadomus-caixa-trigger-crawler/docs/specs/2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia.md
  - guiadomus-caixa-trigger-crawler/index.js
  - guiadomus-caixa-trigger-crawler/modules/crawler.js
  - guiadomus-caixa-trigger-crawler/modules/storage.js
  - guiadomus-caixa-trigger-crawler/service.js
  - guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-bundle-canonico-e-observabilidade-das-rodadas-operacionais.md
  - guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-contrato-operacional-envelopado-e-matriz-de-compatibilidade.md
  - guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-gcp-discovery-e-guardrails-para-dispatch-remoto.md
  - guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-modos-locais-seguros-http-harness-e-fontes-controladas.md
  - guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-observacao-de-artefatos-logs-e-suite-operacional.md
  - guiadomus-caixa-trigger-crawler/utils/logger.js

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
- Scenario: a retrospectiva sistemica pre-run-all da spec 2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Active project: guiadomus-caixa-trigger-crawler
- Target repository: ../codex-flow-runner
- Affected workflow surfaces: documentacao, prompt, runner, testes
- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
No fluxo de spec-triage para projeto externo, o prompt manda aplicar `docs/workflows/codex-quality-gates.md` como se o arquivo existisse no repositorio alvo. Como o onboarding atual nao materializa esse artefato localmente, a triagem pode concluir sem consultar o checklist canonico e ainda assim gerar tickets e resumir cobertura como se o gate compartilhado tivesse sido aplicado. O gate funcional posterior precisa corrigir omissoes evitaveis de heranca e closure criteria.

## Observed behavior
- O que foi observado:
- O spec-triage de projeto externo ainda trata o checklist compartilhado como caminho local ao repositorio alvo, embora o artefato canonico viva no runner e nao seja materializado pelo onboarding atual.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): derivation-gap-analysis com high confidence antes do /run-all

## Expected behavior
Ao rodar spec-triage em projeto externo, o contexto entregue ao Codex deve apontar de forma inequivoca para o checklist canonico no `../codex-flow-runner` ou injetar seu conteudo relevante, para que a primeira derivacao use o mesmo contrato compartilhado que o gate funcional espera.

## Reproduction steps
Executar spec-ticket-validation sobre o pacote derivado e observar gaps de heranca/closure criteria que exigem autocorrecao antes do GO.
Executar spec-triage em um projeto externo que nao possui `docs/workflows/codex-quality-gates.md` no repo alvo.
Observar no trace da triagem que o checklist compartilhado foi tratado como indisponivel localmente, embora exista em `../codex-flow-runner/docs/workflows/codex-quality-gates.md`.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = Em projeto externo, o spec-triage ainda referencia o checklist compartilhado por caminho local ao repo alvo, o que permitiu encerrar a primeira derivacao sem aplicar o quality gate canonico e gerou um ciclo evitavel de NO_GO antes do GO.
- Artefatos de workflow consultados: codex-flow-runner/AGENTS.md, codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/docs/workflows/target-prepare-managed-agents-section.md, codex-flow-runner/docs/workflows/target-prepare-managed-readme-section.md, codex-flow-runner/docs/workflows/target-project-compatibility-contract.md, codex-flow-runner/DOCUMENTATION.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/PLANS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/SPECS.md, codex-flow-runner/src/core/runner.ts, codex-flow-runner/src/integrations/codex-client.ts, codex-flow-runner/tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md, guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/decisions/20260327t222513z-run-specs-spec-spec-ticket-validation-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-decision.json, guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/requests/20260327t221720z-run-specs-spec-spec-triage-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-request.md, guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/requests/20260327t222513z-run-specs-spec-spec-ticket-validation-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-request.md, guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/responses/20260327t221720z-run-specs-spec-spec-triage-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-response.md, guiadomus-caixa-trigger-crawler/docs/specs/2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia.md, guiadomus-caixa-trigger-crawler/index.js, guiadomus-caixa-trigger-crawler/modules/crawler.js, guiadomus-caixa-trigger-crawler/modules/storage.js, guiadomus-caixa-trigger-crawler/service.js, guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-bundle-canonico-e-observabilidade-das-rodadas-operacionais.md, guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-contrato-operacional-envelopado-e-matriz-de-compatibilidade.md, guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-gcp-discovery-e-guardrails-para-dispatch-remoto.md, guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-modos-locais-seguros-http-harness-e-fontes-controladas.md, guiadomus-caixa-trigger-crawler/tickets/open/2026-03-27-observacao-de-artefatos-logs-e-suite-operacional.md, guiadomus-caixa-trigger-crawler/utils/logger.js
- Warnings/codes relevantes:
- O spec-triage de projeto externo ainda trata o checklist compartilhado como caminho local ao repositorio alvo, embora o artefato canonico viva no runner e nao seja materializado pelo onboarding atual.
  - Requisitos relacionados: CA-01, CA-12, CA-13, RF-01, RF-21, RF-36, RO-02, RO-04
  - Artefatos afetados: codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/src/integrations/codex-client.ts
  - Evidencias: ../codex-flow-runner/docs/workflows/target-prepare-managed-agents-section.md e ../codex-flow-runner/docs/workflows/target-prepare-managed-readme-section.md mostram que o onboarding gerenciado atual nao materializa `docs/workflows/codex-quality-gates.md` no projeto externo. | ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md pede para aplicar `docs/workflows/codex-quality-gates.md`, mas nao qualifica o caminho para contexto cross-repo. | .codex-flow-runner/flow-traces/decisions/20260327t222513z-run-specs-spec-spec-ticket-validation-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-decision.json mostra que o ciclo 0 abriu 4 gaps exatamente na classe de heranca/closure criteria que o checklist compartilhado reforca antes de o pacote virar GO. | .codex-flow-runner/flow-traces/responses/20260327t221720z-run-specs-spec-spec-triage-2026-03-27-catalogo-operacional-local-de-rodadas-do-trigger-crawler-por-ia-response.md registra explicitamente que `docs/workflows/codex-quality-gates.md` nao existe no repositorio alvo e, por isso, o checklist nao foi aplicado.
  - Fingerprint: workflow-finding|1f3a1b13bb96
- Tickets funcionais considerados: fallback controlado em spec + resultado do spec-audit
- Hipotese causal consolidada: O prompt/contexto de spec-triage nao qualifica o caminho do checklist compartilhado para repositorios externos; como target-prepare nao materializa esse arquivo no projeto alvo, a primeira derivacao pode seguir sem consultar o gate canonico que reforca heranca e closure criteria observaveis.
- Beneficio esperado consolidado: Fazer o spec-triage externo resolver o checklist canonico do runner reduz omissoes de heranca/closure criteria na primeira rodada, economiza tokens e evita retrabalho antes de consumir a fila real do /run-all.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|1f3a1b13bb96

## Impact assessment
- Impacto funcional: A primeira derivacao de tickets pode sair do spec-triage com cobertura contratual incompleta apesar de a spec e o workflow canonico exigirem essa heranca.
- Impacto operacional: O runner gasta uma rodada adicional de validacao/autocorrecao, aumenta custo de tokens e atrasa a entrada segura no /run-all.
- Risco de regressao: Baixo a medio; a mudanca fica concentrada em prompt/contexto de triagem, documentacao de onboarding e testes de regressao, sem alterar a taxonomia do gate funcional.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, ../codex-flow-runner/src/integrations/codex-client.ts.

## Initial hypotheses (optional)
- O prompt/contexto de spec-triage nao qualifica o caminho do checklist compartilhado para repositorios externos; como target-prepare nao materializa esse arquivo no projeto alvo, a primeira derivacao pode seguir sem consultar o gate canonico que reforca heranca e closure criteria observaveis.

## Proposed solution (optional)
Ajustar a construcao do prompt de spec-triage para qualificar o caminho do checklist em projetos externos; documentar esse fallback no contrato/onboarding do workflow; adicionar teste cobrindo repo externo sem `docs/workflows/codex-quality-gates.md` local para impedir regressao do mesmo problema.

## Closure criteria
- Refs de origem relacionadas: CA-01, CA-12, CA-13, RF-01, RF-21, RF-36, RO-02, RO-04
- A documentacao de compatibilidade/onboarding deixa claro onde o checklist canonico deve ser lido durante spec-triage em projetos externos.
- Existe teste automatizado cobrindo spec-triage em projeto externo sem checklist local e provando que a etapa nao degrada para a mensagem de checklist indisponivel.
- O contexto de spec-triage para projeto externo referencia explicitamente `../codex-flow-runner/docs/workflows/codex-quality-gates.md` ou injeta conteudo equivalente quando o arquivo nao existir no repo alvo.

## Decision log
- 2026-03-27 - Ticket aberto automaticamente a partir da retrospectiva sistemica pre-run-all da derivacao - follow-up sistemico reaproveitavel identificado com high confidence.
- 2026-03-31 - Revisao manual do backlog confirmou que este ticket e um subconjunto tatico do rollout operacional ja coberto pelo ticket `2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md`, sem criterio de fechamento independente; o alinhamento estrutural com onboarding/checkup segue no ticket `2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md`.

## Closure
- Closed at (UTC): 2026-03-31 00:30Z
- Closure reason: duplicate
- Related PR/commit/execplan: commit deste ciclo em `main` (mesmo commit que move este ticket para `tickets/closed/`); escopo absorvido por `tickets/open/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md` e realinhado ao contrato estrutural em `tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md`.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
