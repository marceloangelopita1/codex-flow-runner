# [TICKET] Adaptar workflow-ticket-publication pos-auditoria para reuso, cross-repo e limites nao bloqueantes

## Metadata
- Status: closed
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
  - execplans/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md
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
- 2026-03-19 - Diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md` relidos na etapa de fechamento; resultado validado como `GO` com base apenas em criterios tecnicos/funcionais da entrega atual.

## Closure
- Closed at (UTC): 2026-03-19 23:23Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-19`, `RF-20`, `RF-21`, `RF-22`, `RF-23`; `CA-10`, `CA-12`, `CA-16`: `src/core/runner.ts` passou a acionar `publishWorkflowImprovementTicketIfNeeded(...)` apenas a partir de `workflowGapAnalysis.publicationHandoff`, e `src/types/workflow-improvement-ticket.ts` agora tipa o handoff/candidato por findings com fingerprints proprios; `src/integrations/workflow-improvement-ticket-publisher.ts` preserva `current-project`, `workflow-sibling`, `created-and-pushed`, `reused-open-ticket` e deduplicacao por `Source spec` + overlap de fingerprints; `src/integrations/workflow-improvement-ticket-publisher.test.ts` cobre publish no repo atual, publish no repo irmao e reuso; `src/core/runner.test.ts` cobre publish no repo atual e no repo irmao durante `spec-workflow-retrospective`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/telegram-bot.test.ts` -> pass (`235/235`); `rg -n "publicationHandoff|workflowImprovementTicket|publishWorkflowImprovementTicketIfNeeded|workflow-ticket-publication|workflow-sibling|current-project" src/core/runner.ts src/integrations/workflow-improvement-ticket-publisher.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts` confirma o wiring pos-auditoria, os destinos cross-repo e a entidade dedicada no summary.
  - `RF-25`, `RF-29`, `RF-30`; `CA-10`, `CA-13`, `CA-16`: `src/types/flow-timing.ts` ganhou `workflowImprovementTicket`; `src/core/runner.ts` persiste esse resultado no `RunSpecsFlowSummary`; `src/integrations/telegram-bot.ts` renderiza bloco dedicado `Ticket transversal de workflow` com `Resultado`, `Repositorio alvo`, `Ticket publicado/reutilizado`, `Commit/push dedicado` e `Limitacao de publication`; `src/integrations/telegram-bot.test.ts` cobre os cenarios `created-and-pushed` e `operational-limitation`; `npm run check` -> pass; `npm run build` -> pass.
  - `RF-26`, `RF-27`; `CA-11`: `src/core/runner.test.ts` adicionou o cenario `requestRunSpecs publica ticket transversal no repo irmao sem alterar a spec do projeto externo durante a retrospectiva`, com assert de ausencia de git publish no repo externo e de igualdade do conteudo da spec antes/depois da retrospectiva; `src/integrations/workflow-improvement-ticket-publisher.ts` resolve `../codex-flow-runner` como unico destino elegivel quando o projeto ativo e externo; a mesma matriz `npx tsx --test ...` passou verde e `git diff -- src/core/runner.ts src/integrations/workflow-improvement-ticket-publisher.ts src/core/runner.test.ts src/integrations/workflow-improvement-ticket-publisher.test.ts` nao mostra escrita planejada na spec do projeto externo nem wiring de commit/push para o repo auditado.
- Entrega tecnica concluida:
  - O runner passou a consumir `workflowGapAnalysis.publicationHandoff` como unica fonte de verdade para `workflow-ticket-publication`, sem depender mais de `SpecTicketValidationResult`.
  - O publisher preservou reuso/deduplicacao e publicou ou reutilizou o ticket transversal no repo atual ou em `../codex-flow-runner`, com limitacao operacional nao bloqueante quando necessario.
  - O resumo final de `/run_specs` agora distingue analise sistemica de publication do ticket transversal.
- Validacao manual externa pendente: sim.
  - Entrega tecnica e aceite tecnico concluidos; a pendencia remanescente e apenas operacional.
  - Validacao manual ainda necessaria: executar uma rodada real de `/run_specs` em projeto externo com `../codex-flow-runner` acessivel, outra sem o repo irmao acessivel e uma terceira no proprio `codex-flow-runner`, confirmando no Telegram o resumo final e o ticket transversal publicado/reutilizado ou a limitacao nao bloqueante.
  - Como executar: o operador do runner deve disparar `/run_specs` para uma spec que produza gaps residuais reais e verificar os efeitos observaveis em `tickets/open/` do repo alvo e no resumo final do bot.
  - Responsavel operacional: mantenedor/operador do runner no ambiente real.
