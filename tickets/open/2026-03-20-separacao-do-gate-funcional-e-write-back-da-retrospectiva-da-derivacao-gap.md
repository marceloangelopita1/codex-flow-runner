# [TICKET] Separar o gate funcional do write-back da retrospectiva da derivacao

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-20 01:57Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
- Source requirements (RFs/CAs, when applicable): RF-02, RF-03, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31; CA-12, CA-13, CA-14, CA-15
- Inherited assumptions/defaults (when applicable): o gate funcional continua se chamando `spec-ticket-validation`; a secao `Gate de validacao dos tickets derivados` deve registrar apenas resultado funcional do pacote derivado; a nova secao `Retrospectiva sistemica da derivacao dos tickets` e a unica superficie de write-back permitida para a fase pre-run-all no proprio `codex-flow-runner`; em projeto externo a superficie observavel da retrospectiva e trace/log/resumo.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - src/types/spec-ticket-validation.ts
  - src/integrations/spec-ticket-validation-parser.ts
  - src/core/runner.ts
  - docs/specs/templates/spec-template.md
  - SPECS.md
  - src/integrations/telegram-bot.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o gate funcional ainda aceita `systemic-instruction` como causa-raiz e escreve observacoes sistemicas dentro da secao `Gate de validacao dos tickets derivados`, o que conflita diretamente com a separacao causal aprovada na spec e contamina a leitura operacional do pacote derivado.

## Context
- Workflow area: contrato do gate funcional, persistencia em spec e documentacao canonica
- Scenario: o runner termina `spec-ticket-validation` e precisa persistir apenas o resultado funcional do backlog derivado, deixando a retrospectiva pre-run-all em superficie separada
- Input constraints: preservar compatibilidade com a spec atual e com o nome canonico `spec-ticket-validation`; manter write-back da retrospectiva restrito ao proprio `codex-flow-runner`

## Problem statement
O contrato atual do gate funcional ainda carrega semantica sistemica. O prompt `09-validar-tickets-derivados-da-spec.md` permite `probableRootCause: systemic-instruction`; o tipo `SpecTicketValidationProbableRootCause` tambem aceita esse valor; a persistencia da spec escreve a subsecao `Observacoes sobre melhoria sistemica do workflow` dentro do `Gate de validacao dos tickets derivados`; o template global e `SPECS.md` ainda nao descrevem a nova secao `Retrospectiva sistemica da derivacao dos tickets` nem a regra de write-back diferente entre `codex-flow-runner` e projeto externo.

## Observed behavior
- O que foi observado: o gate funcional continua registrando observacoes sistemicas no proprio bloco funcional da spec; o template oficial ainda manda preencher `Observacoes de melhoria sistemica`; `SPECS.md` so trata a secao funcional do gate; o resumo final do Telegram tem apenas um bloco generico `Retrospectiva sistemica`, sem distinguir a retrospectiva da derivacao da retrospectiva pos-`spec-audit`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura do prompt, parser, tipos, persistencia da spec, template e resumo do Telegram

## Expected behavior
O gate funcional deve permanecer estritamente focado em cobertura/suficiencia do pacote derivado, sem classificar ou registrar melhoria sistemica do workflow. A retrospectiva pre-run-all deve possuir secao propria na spec, com write-back permitido apenas no proprio `codex-flow-runner`, e o resumo final de `/run_specs` deve distinguir claramente gate funcional, retrospectiva da derivacao e retrospectiva pos-`spec-audit`.

## Reproduction steps
1. Ler `prompts/09-validar-tickets-derivados-da-spec.md` e confirmar que `systemic-instruction` ainda e causa-raiz valida.
2. Ler `src/types/spec-ticket-validation.ts` e `src/integrations/spec-ticket-validation-parser.ts` e confirmar o mesmo contrato.
3. Ler `src/core/runner.ts` em `renderSpecTicketValidationExecutionBlock(...)` e confirmar a subsecao `Observacoes sobre melhoria sistemica do workflow`.
4. Ler `docs/specs/templates/spec-template.md`, `SPECS.md` e `src/integrations/telegram-bot.ts` para confirmar a ausencia do contrato documental/separacao observavel exigidos pela spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `prompts/09-validar-tickets-derivados-da-spec.md` permite `probableRootCause: systemic-instruction`.
  - `src/types/spec-ticket-validation.ts` e `src/integrations/spec-ticket-validation-parser.ts` aceitam `systemic-instruction` no resultado parseado do gate.
  - `src/core/runner.ts` persiste `#### Observacoes sobre melhoria sistemica do workflow` dentro do gate funcional da spec.
  - `docs/specs/templates/spec-template.md` ainda inclui `Observacoes de melhoria sistemica` dentro do `Gate de validacao dos tickets derivados`.
  - `SPECS.md` nao exige nem documenta a secao `Retrospectiva sistemica da derivacao dos tickets`.
  - `src/integrations/telegram-bot.ts` usa um unico bloco `Retrospectiva sistemica`.
- Comparativo antes/depois (se houver): antes = gate e retrospectiva se misturam; depois esperado = fronteiras funcionais/documentais separadas e write-back controlado

## Impact assessment
- Impacto funcional: a leitura do gate pode sugerir incorretamente que backlog funcional e backlog sistemico pertencem ao mesmo veredito pre-run-all.
- Impacto operacional: a spec e o resumo final deixam ambigua a superficie observavel correta para projetos externos versus o proprio `codex-flow-runner`.
- Risco de regressao: medio, porque envolve prompt, parser, tipos, persistencia da spec, template e resumo final.
- Scope estimado (quais fluxos podem ser afetados): `prompts/09-validar-tickets-derivados-da-spec.md`, `src/types/spec-ticket-validation.ts`, `src/integrations/spec-ticket-validation-parser.ts`, `src/core/runner.ts`, `docs/specs/templates/spec-template.md`, `SPECS.md`, `src/integrations/telegram-bot.ts`, testes associados

## Initial hypotheses (optional)
- O contrato original do gate foi estendido para acomodar aprendizado sistemico antes da existencia de uma retrospectiva pre-run-all dedicada; agora a principal necessidade e redividir responsabilidades sem perder observabilidade.

## Proposed solution (optional)
Remover semantica sistemica do contrato de `spec-ticket-validation`, criar persistencia e write-back dedicados para `Retrospectiva sistemica da derivacao dos tickets`, atualizar template/SPECS para a nova secao e ajustar o resumo final do Telegram para distinguir explicitamente as duas retrospectivas sistemicas.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-02, RF-03, RF-27; CA-13
- Evidencia observavel: o prompt, os tipos, o parser e a persistencia do gate deixam de aceitar ou registrar semantica sistemica do workflow; a secao `Gate de validacao dos tickets derivados` passa a conter apenas veredito, gaps, correcoes e historico funcional.
- Requisito/RF/CA coberto: RF-26, RF-28, RF-29, RF-30; CA-12, CA-14
- Evidencia observavel: existe write-back dedicado da secao `Retrospectiva sistemica da derivacao dos tickets` com os campos minimos exigidos; `docs/specs/templates/spec-template.md` e `SPECS.md` documentam a nova secao e a regra de write-back apenas no proprio `codex-flow-runner`.
- Requisito/RF/CA coberto: RF-31; CA-15
- Evidencia observavel: o resumo final do `/run_specs` distingue explicitamente `Gate spec-ticket-validation`, `Retrospectiva sistemica da derivacao` e `Retrospectiva sistemica pos-spec-audit`, quando aplicavel.

## Decision log
- 2026-03-20 - Ticket aberto a partir da avaliacao da spec - a fronteira funcional/documental entre gate e retrospectiva pre-run-all ainda nao foi materializada no prompt, nos tipos compartilhados nem nas superfices observaveis.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
