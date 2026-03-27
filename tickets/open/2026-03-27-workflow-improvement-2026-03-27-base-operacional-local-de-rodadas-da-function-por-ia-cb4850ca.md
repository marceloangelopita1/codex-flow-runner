# [TICKET] Qualificar referencias canonicas do checklist do workflow em prompts para projetos externos

## Metadata
- Status: open
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
- Active project (when applicable): caixa-crawler-v2 (../caixa-crawler-v2)
- Target repository (when applicable): codex-flow-runner (../codex-flow-runner)
- Request ID: 20260327t223308z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia
- Source spec (when applicable): caixa-crawler-v2/docs/specs/2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md
- Source spec canonical path (when applicable): docs/specs/2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md
- Source requirements (when applicable): CA-05, CA-08, CA-09, RF-09, RF-10, RF-42, RF-43, RF-45
- Inherited assumptions/defaults (when applicable): Em projetos externos, o workflow repo fica disponível como diretório irmão em ../codex-flow-runner.; O checklist em ../codex-flow-runner/docs/workflows/codex-quality-gates.md continua sendo a fonte canônica compartilhada.; O Codex exec das etapas de spec roda com cwd no repositório alvo.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): Os prompts pre-/run_all citam artefatos canônicos do workflow por caminhos relativos ao worktree ativo, mas o Codex roda com cwd no projeto alvo externo; assim, o checklist compartilhado pode ficar indisponível exatamente na etapa que deveria usá-lo para endurecer herança e aceite observável.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|c7a519a86b35","workflow-finding|b5a663405474"]
- Related artifacts:
  - Request file: caixa-crawler-v2/.codex-flow-runner/flow-traces/requests/20260327t223308z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-request.md
  - Response file: caixa-crawler-v2/.codex-flow-runner/flow-traces/responses/20260327t223308z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-response.md
  - Decision file: caixa-crawler-v2/.codex-flow-runner/flow-traces/decisions/20260327t223308z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-decision.json
- Related docs/execplans:
  - caixa-crawler-v2/../codex-flow-runner/tickets/open/2026-03-27-qualificar-caminhos-canonicos-do-checklist-em-prompts-para-projetos-externos.md
  - caixa-crawler-v2/docs/specs/2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md
  - codex-flow-runner/AGENTS.md
  - codex-flow-runner/docs/workflows/codex-quality-gates.md
  - codex-flow-runner/DOCUMENTATION.md
  - codex-flow-runner/INTERNAL_TICKETS.md
  - codex-flow-runner/PLANS.md
  - codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - codex-flow-runner/prompts/02-criar-execplan-para-ticket.md
  - codex-flow-runner/prompts/03-executar-execplan-atual.md
  - codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md
  - codex-flow-runner/prompts/08-auditar-spec-apos-run-all.md
  - codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md
  - codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md
  - codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - codex-flow-runner/SPECS.md
  - codex-flow-runner/src/core/runner.ts
  - codex-flow-runner/src/integrations/codex-client.test.ts
  - codex-flow-runner/src/integrations/codex-client.ts

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
- Scenario: a retrospectiva sistemica pre-run-all da spec 2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Active project: caixa-crawler-v2
- Target repository: ../codex-flow-runner
- Affected workflow surfaces: prompt, runner, testes
- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
Os prompts do workflow pedem aplicacao do checklist compartilhado em docs/workflows/codex-quality-gates.md, mas as etapas de spec e backlog executam o Codex com cwd no projeto alvo. Em projeto externo, esse caminho resolve no repositório avaliado, não no codex-flow-runner, e o checklist prometido fica indisponível justamente quando a IA deveria reutilizar o contrato canônico.

## Observed behavior
- O que foi observado:
- O prompt de spec-triage referencia o checklist compartilhado por caminho relativo ao repositório alvo, tornando a instrução canônica inacessível em projeto externo.
- O mesmo caminho não qualificado do checklist aparece em outros prompts e não há cobertura de teste para esse detalhe em contexto externo.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): derivation-gap-analysis com high confidence antes do /run-all

## Expected behavior
Quando o projeto ativo for externo, toda etapa que exigir artefatos canônicos do workflow deve apontar para ../codex-flow-runner/... ou receber esse contexto já resolvido pelo runner, para que o agente consiga reler o checklist e a documentação correta antes de derivar, validar ou auditar.

## Reproduction steps
Executar spec-triage de uma spec em um repositório externo que não contenha docs/workflows/codex-quality-gates.md.
Inspecionar o request gravado e confirmar que o prompt manda aplicar docs/workflows/codex-quality-gates.md sem qualificar o contexto do codex-flow-runner.
Observar na resposta da triagem a nota de que o caminho não existe no worktree e comparar isso com os closure-criteria-gap abertos pelo gate funcional.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = Em projeto externo, o workflow referenciou o checklist canônico por caminho relativo ao repositório avaliado; o checklist prometido não foi lido na triagem e isso contribuiu materialmente para os closure-criteria-gap revisados pelo gate funcional.
- Artefatos de workflow consultados: codex-flow-runner/AGENTS.md, codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/DOCUMENTATION.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/PLANS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/SPECS.md, codex-flow-runner/src/core/runner.ts, codex-flow-runner/src/integrations/codex-client.ts
- Warnings/codes relevantes:
- O prompt de spec-triage referencia o checklist compartilhado por caminho relativo ao repositório alvo, tornando a instrução canônica inacessível em projeto externo.
  - Requisitos relacionados: CA-05, CA-08, CA-09, RF-09, RF-10, RF-42, RF-43, RF-45
  - Artefatos afetados: codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/src/integrations/codex-client.ts
  - Evidencias: A resposta salva em .codex-flow-runner/flow-traces/responses/20260327t221816z-run-specs-spec-spec-triage-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-response.md registra que docs/workflows/codex-quality-gates.md nao existe neste worktree e que o checklist adicional nao foi herdado. | Em ../codex-flow-runner/src/integrations/codex-client.ts, runSpecStage executa o Codex com cwd=this.repoPath; neste caso o workdir efetivo foi /home/mapita/projetos/caixa-crawler-v2. | O ciclo 0 do gate funcional abriu 2 closure-criteria-gap sobre bundle/matriz e defaults/guardrails; o ciclo 1 precisou corrigir 4 tickets para tornar esse aceite observável. | O request salvo em .codex-flow-runner/flow-traces/requests/20260327t221816z-run-specs-spec-spec-triage-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-request.md manda aplicar docs/workflows/codex-quality-gates.md sem qualificar o contexto do workflow repo.
  - Fingerprint: workflow-finding|c7a519a86b35
- O mesmo caminho não qualificado do checklist aparece em outros prompts e não há cobertura de teste para esse detalhe em contexto externo.
  - Requisitos relacionados: CA-05, CA-08, RF-42, RF-45
  - Artefatos afetados: codex-flow-runner/prompts/02-criar-execplan-para-ticket.md, codex-flow-runner/prompts/03-executar-execplan-atual.md, codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md, codex-flow-runner/prompts/08-auditar-spec-apos-run-all.md, codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/src/integrations/codex-client.test.ts
  - Evidencias: Busca em ../codex-flow-runner/prompts/ encontrou docs/workflows/codex-quality-gates.md literal nos prompts 01, 02, 03, 04, 08, 11 e 12. | Busca em ../codex-flow-runner/src/**/*.test.ts nao encontrou cobertura sobre codex-quality-gates nem sobre o caminho qualificado do checklist em contexto externo.
  - Fingerprint: workflow-finding|b5a663405474
- Tickets funcionais considerados: caixa-crawler-v2/../codex-flow-runner/tickets/open/2026-03-27-qualificar-caminhos-canonicos-do-checklist-em-prompts-para-projetos-externos.md
- Hipotese causal consolidada: Os prompts pre-/run_all citam artefatos canônicos do workflow por caminhos relativos ao worktree ativo, mas o Codex roda com cwd no projeto alvo externo; assim, o checklist compartilhado pode ficar indisponível exatamente na etapa que deveria usá-lo para endurecer herança e aceite observável.
- Beneficio esperado consolidado: Qualificar o checklist e testar o contexto externo reduz recorrência de backlog derivado com critérios de fechamento incompletos, evitando uma rodada extra de validação/autocorreção antes do /run-all.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|c7a519a86b35, workflow-finding|b5a663405474

## Impact assessment
- Impacto funcional: A derivação pode sair sem parte do contrato canônico de herança e aceite observável, exigindo revalidação/autocorreção para fechar gaps que o workflow já pretendia prevenir.
- Impacto operacional: A fila pre-/run_all consome ciclos extras, aumenta retrabalho documental e eleva o risco de backlog derivado incompleto chegar perto da execução real.
- Risco de regressao: Médio; a remediação toca templates e resolução de contexto entre repositórios, mas pode ser protegida com testes para repositório corrente e projeto externo.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, ../codex-flow-runner/prompts/02-criar-execplan-para-ticket.md, ../codex-flow-runner/prompts/03-executar-execplan-atual.md, ../codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md, ../codex-flow-runner/prompts/08-auditar-spec-apos-run-all.md, ../codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md, ../codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, ../codex-flow-runner/src/integrations/codex-client.test.ts, ../codex-flow-runner/src/integrations/codex-client.ts.

## Initial hypotheses (optional)
- Os prompts pre-/run_all citam artefatos canônicos do workflow por caminhos relativos ao worktree ativo, mas o Codex roda com cwd no projeto alvo externo; assim, o checklist compartilhado pode ficar indisponível exatamente na etapa que deveria usá-lo para endurecer herança e aceite observável.

## Proposed solution (optional)
Atualizar os prompt templates que citam docs/workflows/codex-quality-gates.md para usar caminhos qualificados em projeto externo ou placeholders resolvidos pelo runner; complementar o builder do prompt com hints canônicos do workflow repo; adicionar testes de regressão cobrindo pelo menos spec-triage em repositório externo.

## Closure criteria
- Refs de origem relacionadas: CA-05, CA-08, CA-09, RF-09, RF-10, RF-42, RF-43, RF-45
- Em spec-triage de projeto externo, o prompt gravado referencia explicitamente ../codex-flow-runner/docs/workflows/codex-quality-gates.md ou injeta contexto equivalente resolvido pelo runner.
- Existe cobertura automatizada que falha se um prompt de projeto externo voltar a emitir o caminho não qualificado para o checklist.
- Há teste de regressão cobrindo ao menos spec-triage em projeto externo e validando que o prompt final inclui artefatos canônicos qualificados do workflow.
- Os prompts externos que exigem o checklist compartilhado não deixam mais o agente depender de docs/workflows/codex-quality-gates.md relativo ao repositório alvo.

## Decision log
- 2026-03-27 - Ticket aberto automaticamente a partir da retrospectiva sistemica pre-run-all da derivacao - follow-up sistemico reaproveitavel identificado com high confidence.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
