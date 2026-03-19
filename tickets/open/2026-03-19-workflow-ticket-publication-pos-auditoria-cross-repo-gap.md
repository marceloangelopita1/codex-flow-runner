# [TICKET] Adaptar workflow-ticket-publication pos-auditoria para reuso, cross-repo e limites nao bloqueantes

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 22:03Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-19, RF-20, RF-21, RF-22, RF-23, RF-25, RF-26, RF-27, RF-29, RF-30; CA-10, CA-11, CA-12, CA-13, CA-16
- Inherited assumptions/defaults (when applicable): o ticket transversal automatico deve ser no maximo 1 artefato agregado por rodada auditada; a abertura automatica exige `high confidence`, evidencia forte e utilidade reaproveitavel; quando o projeto ativo for `codex-flow-runner`, a publicacao ocorre no repositorio atual; quando o projeto ativo for externo, a publicacao ocorre em `../codex-flow-runner`; falhas de publicacao devem ser nao bloqueantes; quando a retrospectiva roda em projeto externo, ela nao deve alterar a spec nem fazer commit/push no projeto corrente.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - src/integrations/workflow-improvement-ticket-publisher.ts
  - src/types/workflow-improvement-ticket.ts
  - src/core/runner.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/git-client.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): ja existe publisher cross-repo com deduplicacao e limitacao nao bloqueante, mas ele ainda e acionado a partir de `spec-ticket-validation`; a adaptacao pos-auditoria e um delta menor que os tickets P0, mas continua necessaria para cumprir a spec aprovada.

## Context
- Workflow area: publicacao do ticket transversal agregado de workflow
- Scenario: a retrospectiva sistemica concluiu `high confidence` e precisa criar ou reutilizar no maximo 1 ticket transversal no repo certo, sem bloquear a rodada
- Input constraints: reaproveitar o que ja existe de deduplicacao/current-project/sibling-repo; nao permitir que a retrospectiva modifique a spec ou faca commit/push no projeto externo auditado

## Problem statement
O repositório ja possui `workflow-improvement-ticket-publisher`, deduplicacao por `Source spec` + overlap de fingerprints e publicacao no repo atual ou em `../codex-flow-runner`, mas todo esse comportamento ainda esta acoplado ao `spec-ticket-validation`. A spec nova exige reaproveitar essa infraestrutura somente depois de `spec-audit`, com resultado explicitado como follow-up sistemico da retrospectiva e sem alterar o projeto corrente quando ele for externo.

## Observed behavior
- O que foi observado: `src/core/runner.ts` chama `publishWorkflowImprovementTicketIfNeeded(...)` durante `spec-ticket-validation`; o resumo final do Telegram reporta `workflowImprovementTicket` dentro do bloco do gate de validacao; `workflow-improvement-ticket-publisher.ts` ja resolve repo atual/irmao, deduplica e registra limitacao nao bloqueante, mas ainda recebe um candidato montado a partir de `SpecTicketValidationResult`; `prompts/08-auditar-spec-apos-run-all.md` continua exigindo commit/push da auditoria no projeto corrente.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de `runner`, `telegram-bot`, `workflow-improvement-ticket-publisher` e prompt de auditoria

## Expected behavior
Quando `workflow-gap-analysis` concluir `high confidence`, `workflow-ticket-publication` deve criar ou reutilizar no maximo 1 ticket transversal agregado no repositorio correto, registrar sucesso/reuso/limitacao em trace/log e resumo final, e preservar o projeto corrente externo sem alteracao de spec ou commit/push por causa da retrospectiva.

## Reproduction steps
1. Ler `src/core/runner.ts` e localizar `publishWorkflowImprovementTicketIfNeeded(...)`.
2. Confirmar que o publisher e acionado antes de `spec-close-and-version`/`/run-all`, ainda dentro de `spec-ticket-validation`.
3. Ler `src/integrations/workflow-improvement-ticket-publisher.ts` e validar que current-project, sibling repo, deduplicacao e limitacoes operacionais ja existem.
4. Ler `src/integrations/telegram-bot.ts` e confirmar que o resultado sistemico aparece apenas como subbloco de `specTicketValidation`.
5. Ler `prompts/08-auditar-spec-apos-run-all.md` e confirmar que a auditoria final ainda manda commit/push no projeto corrente.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts` monta o candidato sistemico a partir de `SpecTicketValidationResult` e publica durante `spec-ticket-validation`.
  - `src/integrations/workflow-improvement-ticket-publisher.ts` ja implementa `current-project`, `workflow-sibling`, `reused-open-ticket`, `created-and-pushed` e `operational-limitation`.
  - `src/integrations/telegram-bot.ts` exibe `Follow-up sistemico` dentro de `appendRunSpecsTicketValidationLines(...)`, nao como resultado da retrospectiva pos-auditoria.
  - `src/core/runner.test.ts` valida publicacao/reuso/limitacao ainda no bloco de `specTicketValidation` e com `finalStage: "spec-audit"`.
  - `prompts/08-auditar-spec-apos-run-all.md` continua exigindo commit/push no projeto da spec auditada.
- Comparativo antes/depois (se houver): antes = publisher reutilizavel, mas no estagio errado; depois esperado = publisher reaproveitado no pos-auditoria, com limites cross-repo corretos

## Impact assessment
- Impacto funcional: o backlog sistemico continua sendo publicado no momento errado e sem separacao clara do follow-up funcional da spec.
- Impacto operacional: em projeto externo, a retrospectiva ainda nao tem barreira explicita contra alterar a spec ou publicar commit/push no repositorio auditado.
- Risco de regressao: baixo a medio, porque a infraestrutura principal ja existe e o delta e mais de integracao/encadeamento do que de IO basico.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/types/workflow-improvement-ticket.ts`, `src/integrations/telegram-bot.ts`, `prompts/08-auditar-spec-apos-run-all.md`, testes associados

## Initial hypotheses (optional)
- O publisher atual provavelmente precisa de ajustes pequenos no tipo de candidato e no ponto de invocacao, nao de uma reescrita total.

## Proposed solution (optional)
Reencadear o publisher atual para `workflow-ticket-publication`, mantendo dedupe/current-project/sibling-repo/limitacao nao bloqueante e mudando o resumo final para distinguir follow-up funcional, hipotese sistemica e ticket transversal publicado ou reutilizado.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-19, RF-20, RF-21, RF-22, RF-23; CA-10, CA-12, CA-16
- Evidencia observavel: `workflow-ticket-publication` cria ou reutiliza no maximo 1 ticket transversal agregado por rodada, no repo atual ou em `../codex-flow-runner`, preservando deduplicacao/reuso quando ja houver ticket equivalente aberto.
- Requisito/RF/CA coberto: RF-25, RF-29, RF-30; CA-10, CA-13, CA-16
- Evidencia observavel: o trace/log e o resumo final de `/run_specs` distinguem resultado da retrospectiva sistemica, ticket transversal publicado/reutilizado, hipotese sem ticket automatico e limitacao operacional nao bloqueante de publicacao.
- Requisito/RF/CA coberto: RF-26, RF-27; CA-11
- Evidencia observavel: testes mostram que, em projeto externo, a retrospectiva nao altera a spec nem faz commit/push no projeto corrente; quando houver publicacao bem-sucedida, o unico commit/push adicional da retrospectiva ocorre no `codex-flow-runner`.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - a infraestrutura de publicacao ja existe, mas ainda esta conectada ao `spec-ticket-validation` e nao aos resultados da retrospectiva pos-auditoria.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
