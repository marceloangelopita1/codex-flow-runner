# [TICKET] Alinhar checklist compartilhado entre prompts e onboarding de projetos externos

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-28 20:20Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-ticket-derivation-retrospective
- Active project (when applicable): guiadomus-enrich-amenities (../guiadomus-enrich-amenities)
- Target repository (when applicable): codex-flow-runner (../codex-flow-runner)
- Request ID: 20260328t202015z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia
- Source spec (when applicable): guiadomus-enrich-amenities/docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md
- Source spec canonical path (when applicable): docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md
- Source requirements (when applicable): CA-01, RF-07
- Inherited assumptions/defaults (when applicable): O checklist compartilhado em `docs/workflows/codex-quality-gates.md` continua sendo referencia canonica para triagem, planejamento, execucao e auditoria.; Projetos externos compativeis com o workflow completo precisam ter acesso deterministico a todas as superficies documentais que os prompts operacionais exigem.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): Divergencia estrutural entre a localizacao/disponibilidade esperada do checklist compartilhado nos prompts e as superficies realmente preparadas e validadas para projetos externos.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|420703896902"]
- Related artifacts:
  - Request file: guiadomus-enrich-amenities/.codex-flow-runner/flow-traces/requests/20260328t202015z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-request.md
  - Response file: guiadomus-enrich-amenities/.codex-flow-runner/flow-traces/responses/20260328t202015z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-response.md
  - Decision file: guiadomus-enrich-amenities/.codex-flow-runner/flow-traces/decisions/20260328t202015z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-decision.json
- Related docs/execplans:
  - codex-flow-runner/AGENTS.md
  - codex-flow-runner/docs/workflows/codex-quality-gates.md
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
  - codex-flow-runner/src/types/target-checkup.ts
  - codex-flow-runner/src/types/target-prepare.ts
  - guiadomus-enrich-amenities/docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md
  - guiadomus-enrich-amenities/tickets/open/2026-03-28-implementar-runner-local-e-bundles-operacionais-base.md
  - guiadomus-enrich-amenities/tickets/open/2026-03-28-materializar-contrato-http-operacional-e-catalogo-base.md

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
- Scenario: a retrospectiva sistemica pre-run-all da spec 2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Active project: guiadomus-enrich-amenities
- Target repository: ../codex-flow-runner
- Affected workflow surfaces: documentacao, prompt, runner, testes
- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.
- Scope boundary with related tickets: este ticket define e valida a estrategia canonica entre `target_prepare`, `target_checkup`, contrato de compatibilidade e o contrato documental dos prompts; o rollout operacional amplo nos prompts, runner e testes consumidores do checklist segue rastreado em `tickets/open/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md`.

## Problem statement
No workflow completo em projeto externo, os prompts operacionais mandam aplicar `docs/workflows/codex-quality-gates.md` como se o arquivo existisse no repo alvo, mas `target_prepare` nao o propaga e `target_checkup` nao o exige. Isso permite que um projeto seja tratado como compativel com o workflow completo enquanto uma instrucao central do proprio workflow permanece inacessivel localmente, enfraquecendo a derivacao inicial de tickets.

## Observed behavior
- O que foi observado:
- O checklist compartilhado exigido pelos prompts do workflow nao faz parte das superficies copiadas por `target_prepare` nem dos documentos obrigatorios de `target_checkup`, entao um projeto externo pode entrar no workflow completo sem acesso local ao checklist que a triagem deveria aplicar.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): derivation-gap-analysis com high confidence antes do /run-all

## Expected behavior
Quando o workflow completo rodar em projeto externo, o checklist compartilhado deve estar acessivel exatamente no caminho e no contexto que os prompts usam, ou os prompts devem apontar explicitamente para a fonte correta no `codex-flow-runner`. `target_prepare`, `target_checkup`, o contrato de compatibilidade e os prompts nao podem divergir sobre essa superficie.

## Reproduction steps
Executar `/run_specs` nesse projeto externo e observar que o prompt de `spec-triage` continua mandando aplicar `docs/workflows/codex-quality-gates.md` por caminho relativo local.
Preparar um projeto externo limpo via `target_prepare` e confirmar que `docs/workflows/codex-quality-gates.md` nao e propagado para o repo alvo.
Rodar `target_checkup` no mesmo projeto e confirmar que o checklist compartilhado nao aparece entre os documentos obrigatorios para readiness.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = Prompts do workflow completo exigem um checklist compartilhado por caminho local que o onboarding/checkup de projetos externos nao disponibiliza nem valida; a rodada atual ocorreu exatamente nesse estado e o gate funcional precisou revisar gaps de coverage/closure antes do GO.
- Artefatos de workflow consultados: codex-flow-runner/AGENTS.md, codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/docs/workflows/target-project-compatibility-contract.md, codex-flow-runner/DOCUMENTATION.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/PLANS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md, codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/SPECS.md, codex-flow-runner/src/core/runner.ts, codex-flow-runner/src/types/target-checkup.ts, codex-flow-runner/src/types/target-prepare.ts
- Warnings/codes relevantes:
- O checklist compartilhado exigido pelos prompts do workflow nao faz parte das superficies copiadas por `target_prepare` nem dos documentos obrigatorios de `target_checkup`, entao um projeto externo pode entrar no workflow completo sem acesso local ao checklist que a triagem deveria aplicar.
  - Requisitos relacionados: CA-01, RF-07
  - Artefatos afetados: codex-flow-runner/docs/workflows/target-project-compatibility-contract.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/src/types/target-checkup.ts, codex-flow-runner/src/types/target-prepare.ts, guiadomus-enrich-amenities/docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md
  - Evidencias: `../codex-flow-runner/docs/workflows/target-project-compatibility-contract.md` ainda cita `docs/workflows/codex-quality-gates.md` como referencia do workflow completo. | `../codex-flow-runner/src/types/target-prepare.ts` nao copia esse arquivo e `../codex-flow-runner/src/types/target-checkup.ts` nao o exige entre os documentos obrigatorios. | No projeto avaliado, `find docs -maxdepth 3 -type f` mostrou apenas `docs/specs/*`, e a spec alvo registrou explicitamente a ausencia de `docs/workflows/codex-quality-gates.md`. | O historico funcional desta rodada revisou 4 gaps de coverage/closure (`RF-01`, `RF-10`, `RF-18`, `RF-30`) antes do GO final. | O prompt `../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md` manda aplicar `docs/workflows/codex-quality-gates.md` por caminho relativo no repo alvo.
  - Fingerprint: workflow-finding|420703896902
- Tickets funcionais considerados: guiadomus-enrich-amenities/tickets/open/2026-03-28-implementar-runner-local-e-bundles-operacionais-base.md, guiadomus-enrich-amenities/tickets/open/2026-03-28-materializar-contrato-http-operacional-e-catalogo-base.md
- Hipotese causal consolidada: Divergencia estrutural entre a localizacao/disponibilidade esperada do checklist compartilhado nos prompts e as superficies realmente preparadas e validadas para projetos externos.
- Beneficio esperado consolidado: Alinhar prompts, onboarding e checkup para a mesma estrategia de acesso ao checklist compartilhado reduz omissoes de primeira passada em projetos externos e diminui retrabalho corretivo no spec-ticket-validation antes do /run-all.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|420703896902

## Impact assessment
- Impacto funcional: A derivacao inicial de tickets pode sair sem parte das verificacoes compartilhadas de coverage/heranca/closure e depender do gate funcional para completar o pacote antes da execucao da spec.
- Impacto operacional: Projetos externos podem ser tratados como prontos para o workflow completo com uma dependencia documental ausente, tornando a qualidade da triagem sensivel a memoria local do agente e gerando retrabalho recorrente.
- Risco de regressao: Medio: a remediacao toca prompts, onboarding/checkup e documentacao compartilhada; um alinhamento incompleto pode afetar outros fluxos target e o /run_specs em projetos externos.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/docs/workflows/target-project-compatibility-contract.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, ../codex-flow-runner/src/types/target-checkup.ts, ../codex-flow-runner/src/types/target-prepare.ts, docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md.

## Initial hypotheses (optional)
- Divergencia estrutural entre a localizacao/disponibilidade esperada do checklist compartilhado nos prompts e as superficies realmente preparadas e validadas para projetos externos.

## Proposed solution (optional)
Escolher e aplicar uma estrategia canonica unica para o checklist compartilhado em projetos externos: ou propagar `docs/workflows/codex-quality-gates.md` durante `target_prepare` e valida-lo no `target_checkup`, ou fazer o runner/prompt injetar de forma deterministica o caminho `../codex-flow-runner/...` quando o projeto ativo for externo. Depois alinhar documentacao e testes para a mesma regra.

## Closure criteria
- Refs de origem relacionadas: CA-01, RF-07
- `target_checkup` e o contrato de compatibilidade passam a validar exatamente a mesma estrategia escolhida, sem marcar o target como workflow-complete com checklist inacessivel.
- `target_prepare` passa a propagar `docs/workflows/codex-quality-gates.md` para o projeto externo ou o runner/prompt passa a injetar a referencia externa correta de forma deterministica.
- Prompts que hoje referenciam `docs/workflows/codex-quality-gates.md` deixam de depender de um caminho inexistente em projeto externo.
- Testes cobrindo projeto externo preparado + prompt de `spec-triage` confirmam que o checklist compartilhado fica resolvivel antes da derivacao de tickets.
- O fechamento deste ticket deixa explicita a regra canonica para projetos externos, sem depender de inferencia sobre como os demais prompts consumidores do checklist serao atualizados em lote.

## Decision log
- 2026-03-28 - Ticket aberto automaticamente a partir da retrospectiva sistemica pre-run-all da derivacao - follow-up sistemico reaproveitavel identificado com high confidence.
- 2026-03-31 - Revisao manual do backlog manteve este ticket como dono do alinhamento estrutural entre onboarding, checkup e contrato de compatibilidade; o ticket tatico de spec-triage sobreposto foi fechado como `duplicate`.
- 2026-03-31 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO` sem gap remanescente.

## Closure
- Closed at (UTC): 2026-03-31 01:16Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Resultado final do fechamento: `GO`
- Checklist aplicado: releitura do diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion antes da decisao final.
- Evidencia objetiva por closure criterion:
  - `target_checkup` e o contrato de compatibilidade validam a mesma estrategia canonica: `docs/workflows/target-project-compatibility-contract.md` agora explicita o caminho `../codex-flow-runner/docs/workflows/codex-quality-gates.md` para projeto externo, e `src/core/target-checkup.ts` passou a verificar `workflowCompleteDependencies` no manifesto, no relatorio e na resolubilidade real do checklist; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/codex-client.test.ts` passou com `531` testes e `0` falhas, incluindo `execute registra gap quando o checklist compartilhado nao fica resolvivel pelo caminho canonico`.
  - `target_prepare` torna observavel a estrategia escolhida sem copiar implicitamente o checklist para o target: `src/types/target-prepare.ts` centraliza `resolveTargetPrepareWorkflowCompleteDependencies`, e `src/core/target-prepare.ts` grava a dependencia no manifesto e no relatorio; a mesma suite verde inclui `resolveTargetPrepareWorkflowCompleteDependencies usa caminho externo canonico para projeto irmao`, `resolveTargetPrepareWorkflowCompleteDependencies usa caminho local no proprio runner` e `execute conclui target_prepare, versiona artefatos permitidos e preserva contexto preexistente`.
  - Os prompts deixaram de depender de um caminho inexistente em projeto externo: `rg -n '<WORKFLOW_QUALITY_GATES_PATH>' prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` confirmou o placeholder comum nas sete superficies relevantes, `rg -n 'Aplicar( tambem)? o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`|Aplique o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`' prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` nao retornou matches, e a mesma suite verde inclui `runStage(implement) resolve checklist compartilhado para projeto externo` e `runSpecStage(spec-triage) resolve checklist compartilhado para projeto externo`.
  - Ha cobertura observavel para projeto externo preparado + `spec-triage` antes da derivacao: a regressao completa acima cobre `target_prepare`, `target_checkup`, `runner` e `codex-client` no mesmo estado final, provando ao mesmo tempo a declaracao da dependencia no onboarding e a resolucao do checklist no prompt de `spec-triage`.
  - A regra canonica final ficou explicita sem depender de rollout implícito futuro: o diff final ficou restrito a `docs/workflows/target-project-compatibility-contract.md`, `src/types/target-prepare.ts`, `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts`, `src/core/target-checkup.ts` e `src/core/target-checkup.test.ts`, enquanto a estrategia de prompts permanece coberta e verde por `src/integrations/codex-client.test.ts`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` passou com `tsc --noEmit`.
- Entrega tecnica concluida:
  - o contrato de compatibilidade, o `target_prepare` e o `target_checkup` convergem para a mesma regra canonica do checklist compartilhado em projeto externo;
  - o onboarding deixou de afirmar compatibilidade com workflow completo sem tambem declarar a dependencia auditavel correspondente;
  - o readiness audit agora acusa `gap` objetivo quando a resolubilidade do checklist compartilhado se perde.
- Validacoes executadas:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/codex-client.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - `rg -n '<WORKFLOW_QUALITY_GATES_PATH>' prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `rg -n 'Aplicar( tambem)? o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`|Aplique o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`' prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
- Validacao manual externa pendente: nao.
