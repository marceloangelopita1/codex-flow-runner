# [TICKET] Handoffs do workflow perdem membros explicitos de allowlists da spec

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-30 23:43Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-workflow-retrospective
- Active project (when applicable): guiadomus-caixa-trigger-crawler (../guiadomus-caixa-trigger-crawler)
- Target repository (when applicable): codex-flow-runner (../codex-flow-runner)
- Request ID: 20260330t234317z-run-specs-spec-spec-workflow-retrospective-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler
- Source spec (when applicable): guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md
- Source spec canonical path (when applicable): docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md
- Source requirements (when applicable): RF-27
- Inherited assumptions/defaults (when applicable): A remediacao nao precisa forcar um ticket por RF; ela precisa impedir a perda semantica quando um RF consolidado carrega uma whitelist ou enum finito.; Tickets e ExecPlans continuam sendo a fonte operacional imediata das etapas de execução e fechamento.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): Falta um guardrail no handoff spec->ticket->execplan para preservar membros explicitos de allowlists/enumerações; como ExecPlan, execução e fechamento validam o closure criterion agregado, variantes omitidas da spec podem permanecer sem implementação nem teste.
- Remediation scope (audit/review only): generic-repository-instruction
- Systemic gap fingerprints: ["workflow-finding|79712cff8f91"]
- Related artifacts:
  - Request file: guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/requests/20260330t234317z-run-specs-spec-spec-workflow-retrospective-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-request.md
  - Response file: guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/responses/20260330t234317z-run-specs-spec-spec-workflow-retrospective-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-response.md
  - Decision file: guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/decisions/20260330t234317z-run-specs-spec-spec-workflow-retrospective-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-decision.json
- Related docs/execplans:
  - codex-flow-runner/AGENTS.md
  - codex-flow-runner/docs/workflows/codex-quality-gates.md
  - codex-flow-runner/DOCUMENTATION.md
  - codex-flow-runner/execplans/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md
  - codex-flow-runner/INTERNAL_TICKETS.md
  - codex-flow-runner/PLANS.md
  - codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - codex-flow-runner/prompts/02-criar-execplan-para-ticket.md
  - codex-flow-runner/prompts/03-executar-execplan-atual.md
  - codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md
  - codex-flow-runner/prompts/08-auditar-spec-apos-run-all.md
  - codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md
  - codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - codex-flow-runner/SPECS.md
  - codex-flow-runner/src/core/runner.ts
  - guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md
  - guiadomus-caixa-trigger-crawler/modules/externalGuardrails.js
  - guiadomus-caixa-trigger-crawler/tests/index.test.js
  - guiadomus-caixa-trigger-crawler/tests/mainService.test.js
  - guiadomus-caixa-trigger-crawler/tickets/closed/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md
  - guiadomus-caixa-trigger-crawler/tickets/open/2026-03-30-local-http-deve-aceitar-loopback-ipv6.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): gaps sistemicos observados com alta confianca durante workflow-gap-analysis pos-spec-audit.

## Context
- Workflow area: spec-workflow-retrospective -> workflow-ticket-publication
- Scenario: a retrospectiva sistemica pos-spec-audit da spec 2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md concluiu elegibilidade automatica com input mode follow-up-tickets.
- Active project: guiadomus-caixa-trigger-crawler
- Target repository: ../codex-flow-runner
- Affected workflow surfaces: documentacao, prompt, testes
- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
No fluxo derivado de spec, um requisito que enumera valores aceitos pode ser reescrito no ticket como criterio generico, por exemplo 'loopback'. Como o ExecPlan, a execução e o fechamento passam a validar apenas esse closure criterion agregado, um membro explicito da whitelist original pode sair do escopo efetivo sem gerar blocker ate a auditoria final da spec.

## Observed behavior
- O que foi observado:
- A whitelist explicita de RF-27 foi reduzida a 'loopback' no ticket e no ExecPlan, e o workflow posterior validou apenas esse criterio agregado.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): workflow-gap-analysis com high confidence apos spec-audit

## Expected behavior
Quando a spec enumerar uma whitelist, enum finito ou matriz pequena de valores aceitos, o ticket derivado e o ExecPlan devem preservar cada membro explicito ou justificar a consolidacao, e o fechamento deve provar cobertura positiva para os membros aceitos e negativa para fora do conjunto.

## Reproduction steps
Criar ExecPlan e encerrar o ticket seguindo os prompts atuais; a validacao pode passar sem provar C, deixando a auditoria final da spec detectar o gap residual.
Derivar um ticket a partir de uma spec cujo RF enumera valores aceitos A, B e C.
Generalizar o fechamento do ticket para um criterio unico como 'aceita valor valido' sem listar A, B e C.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = O workflow atual permite que uma whitelist enumerada na spec seja condensada em closure criteria generico no ticket, e as etapas seguintes validam apenas esse agregado; isso deixou [::1] fora da cobertura de RF-27 ate o spec-audit.
- Artefatos de workflow consultados: codex-flow-runner/AGENTS.md, codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/DOCUMENTATION.md, codex-flow-runner/execplans/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md, codex-flow-runner/INTERNAL_TICKETS.md, codex-flow-runner/PLANS.md, codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, codex-flow-runner/prompts/02-criar-execplan-para-ticket.md, codex-flow-runner/prompts/03-executar-execplan-atual.md, codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md, codex-flow-runner/prompts/08-auditar-spec-apos-run-all.md, codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md, codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, codex-flow-runner/SPECS.md, codex-flow-runner/src/core/runner.ts, guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md, guiadomus-caixa-trigger-crawler/modules/externalGuardrails.js, guiadomus-caixa-trigger-crawler/tests/index.test.js, guiadomus-caixa-trigger-crawler/tests/mainService.test.js, guiadomus-caixa-trigger-crawler/tickets/closed/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md, guiadomus-caixa-trigger-crawler/tickets/open/2026-03-30-local-http-deve-aceitar-loopback-ipv6.md
- Warnings/codes relevantes:
- A whitelist explicita de RF-27 foi reduzida a 'loopback' no ticket e no ExecPlan, e o workflow posterior validou apenas esse criterio agregado.
  - Requisitos relacionados: RF-27
  - Artefatos afetados: codex-flow-runner/docs/workflows/codex-quality-gates.md, codex-flow-runner/execplans/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md, codex-flow-runner/prompts/02-criar-execplan-para-ticket.md, codex-flow-runner/prompts/03-executar-execplan-atual.md, codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md, guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md, guiadomus-caixa-trigger-crawler/modules/externalGuardrails.js, guiadomus-caixa-trigger-crawler/tests/index.test.js, guiadomus-caixa-trigger-crawler/tests/mainService.test.js, guiadomus-caixa-trigger-crawler/tickets/closed/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md
  - Evidencias: A spec enumera explicitamente 127.0.0.1, localhost e [::1] como destinos aceitos de local_http. | O estado atual do codigo ainda aceita ::1 mas nao [::1], e a cobertura positiva observavel nao inclui um caso explicito para [::1]. | O ticket fechado e o ExecPlan passaram a exigir apenas que a URL fosse 'loopback', sem uma validacao positiva separada para [::1]. | Os prompts do workflow amarram a validacao do ExecPlan ao closure criterion do ticket e a execução ao subconjunto declarado no ticket/ExecPlan.
  - Fingerprint: workflow-finding|79712cff8f91
- Tickets funcionais considerados: guiadomus-caixa-trigger-crawler/tickets/open/2026-03-30-local-http-deve-aceitar-loopback-ipv6.md
- Hipotese causal consolidada: Falta um guardrail no handoff spec->ticket->execplan para preservar membros explicitos de allowlists/enumerações; como ExecPlan, execução e fechamento validam o closure criterion agregado, variantes omitidas da spec podem permanecer sem implementação nem teste.
- Beneficio esperado consolidado: Exigir que tickets e ExecPlans preservem membros explicitos de whitelists ou provem positivamente cada valor aceito reduz follow-ups residuais em specs futuras que descrevem hosts, enums, modos, codigos ou matrizes finitas.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|79712cff8f91

## Impact assessment
- Impacto funcional: Permite que uma spec fique parcialmente atendida mesmo depois de ticket fechado como fixed, porque um membro explicito da whitelist original pode ficar fora da implementacao e dos testes.
- Impacto operacional: Aumenta retrabalho pos-auditoria, cria follow-ups residuais evitaveis e reduz confianca no encadeamento automatico spec->ticket->execplan->fechamento.
- Risco de regressao: Baixo a medio; a remediacao e principalmente editorial e de testes, mas deve evitar exigir decomposicao excessiva de um RF quando bastar preservar explicitamente seus membros finitos.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/02-criar-execplan-para-ticket.md, ../codex-flow-runner/prompts/03-executar-execplan-atual.md, ../codex-flow-runner/prompts/04-encerrar-ticket-commit-push.md, docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md, execplans/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md, modules/externalGuardrails.js, tests/index.test.js, tests/mainService.test.js, tickets/closed/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md.

## Initial hypotheses (optional)
- Falta um guardrail no handoff spec->ticket->execplan para preservar membros explicitos de allowlists/enumerações; como ExecPlan, execução e fechamento validam o closure criterion agregado, variantes omitidas da spec podem permanecer sem implementação nem teste.

## Proposed solution (optional)
Atualizar ../codex-flow-runner/docs/workflows/codex-quality-gates.md e os prompts 01, 02, 03 e 04 para exigir preservacao explicita de allowlists/enumerações finitas nos closure criteria e na matriz de validacao; adicionar testes no codex-flow-runner cobrindo um caso em que a spec enumera tres valores aceitos e o fluxo nao pode fechar o ticket sem evidenciar os tres.

## Closure criteria
- Refs de origem relacionadas: RF-27
- A documentacao do workflow explica que validacao generica de 'valor valido' nao substitui a prova dos membros explicitamente aceitos pela spec quando o requisito for uma whitelist finita.
- Existe cobertura automatizada no codex-flow-runner provando que o fluxo nao fecha um ticket derivado enquanto um membro explicito da whitelist original nao tiver evidencia positiva correspondente.
- Os quality gates e prompts do workflow passam a exigir que allowlists/enumerações finitas da spec aparecam explicitamente no ticket ou na matriz de validacao, ou tragam justificativa objetiva para consolidacao.

## Decision log
- 2026-03-30 - Ticket aberto automaticamente a partir da retrospectiva sistemica pos-spec-audit - follow-up sistemico reaproveitavel identificado com high confidence.
- 2026-03-31 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO`.

## Closure validation
- Checklist aplicado: releitura do diff, do ticket, do ExecPlan, da spec de origem `../guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md` e de `docs/workflows/codex-quality-gates.md` antes da decisao final; `git diff --check` retornou limpo.
- Criterion 1 atendido: `docs/workflows/codex-quality-gates.md` agora explicita que `valor valido`/`loopback` nao substituem a prova dos membros aceitos e exige preservacao de allowlists/enumerações finitas na triagem, no ExecPlan, na execucao e no fechamento; o comando `rg -n "allowlists|enumerações finitas|membros explicitos|justificativa objetiva|valor valido|fora do conjunto" docs/workflows/codex-quality-gates.md ...` confirmou os trechos em `docs/workflows/codex-quality-gates.md:18,33,37,41,50,57,66`.
- Criterion 2 atendido: `src/integrations/codex-client.test.ts` adiciona o teste `prompts reais da cadeia relevante carregam o guardrail de allowlists finitas`, que carrega os prompts reais de `spec-triage`, `plan`, `implement` e `close-and-version`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts` passou com `532` testes verdes e `0` falhas.
- Criterion 3 atendido: `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md` e `prompts/04-encerrar-ticket-commit-push.md` passaram a exigir membros explicitos ou justificativa objetiva para consolidacao com cobertura positiva dos aceitos e negativa fora do conjunto; o `rg` acima confirmou o wording nas quatro etapas e `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` concluiu sem erros de tipos.
- Validacao manual pendente: nenhuma.

## Closure
- Closed at (UTC): 2026-03-31 01:34Z
- Closure reason: fixed
- Related PR/commit/execplan: `execplans/2026-03-30-workflow-improvement-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-c5f3980b.md`; commit pertencente ao mesmo changeset de fechamento que sera versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
