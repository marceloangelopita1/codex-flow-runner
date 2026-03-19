# [TICKET] Migrar workflow-ticket-publication para o pos-spec-audit e definir politica para hipoteses sistemicas antes do /run-all

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 20:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-05, RF-07, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-29, RF-30; CA-05, CA-06, CA-07, CA-10, CA-11, CA-12, CA-13, CA-16
- Inherited assumptions/defaults (when applicable): `workflow-ticket-publication` e subetapa distinta de `workflow-gap-analysis`; ticket automatico so pode nascer com `high confidence`; o maximo automatico por rodada e 1 ticket agregado; quando o projeto auditado for externo, a retrospectiva nao deve alterar a spec nem fazer commit/push no projeto corrente; hipotese sistemica descoberta antes do `/run-all` nao deve se passar por retrospectiva pos-auditoria.
- Workflow root cause (when applicable): execution
- Workflow root cause rationale (when applicable): a infraestrutura atual de follow-up sistemico foi implementada em torno de `spec-ticket-validation`, antes do `/run-all`, e por isso continua publicada no momento errado e com narrativa incorreta sobre a origem do gap.
- Remediation scope (when applicable): local
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - src/core/runner.ts
  - src/types/workflow-improvement-ticket.ts
  - src/integrations/workflow-improvement-ticket-publisher.ts
  - src/integrations/telegram-bot.ts
  - src/types/flow-timing.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o repositorio ja tem infraestrutura de publicacao e deduplicacao, mas ela esta acoplada ao estagio errado. Sem esse desacoplamento, o fluxo continua abrindo ou explicando follow-up sistemico no momento errado e sem politica clara para hipoteses pre-`/run-all`.

## Context
- Workflow area: subetapa `workflow-ticket-publication` e narrativa de follow-up sistemico no resumo final
- Scenario: a spec aprovada exige publicacao pos-`spec-audit`, mas o publisher atual continua acoplado ao `spec-ticket-validation`; alem disso, a rodada pode identificar sinais sistemicos antes do `/run-all`, sem politica explicita sobre como registrar esses sinais
- Input constraints: preservar deduplicacao/reuso; nao bloquear a rodada principal por falha de publicacao; nao alterar projeto externo auditado; manter separado o que e hipotese pre-`/run-all` do que e retrospectiva confirmada pos-`spec-audit`

## Problem statement
A infraestrutura de ticket transversal hoje nasce do resultado de `spec-ticket-validation`, usa tipos acoplados a esse estagio e aparece no resumo final como se ja fosse o follow-up sistemico canonico da rodada. Isso conflita com a spec aprovada de retrospectiva pos-auditoria e deixa um vazio de politica: se o gate pre-`/run-all` enxerga um possivel sinal sistemico, esse sinal deve ser ignorado, registrado como hipotese ou virar outra classe de artefato? Sem essa definicao, o sistema mistura descoberta precoce, retrospectiva sistemica e publicacao de backlog no mesmo bloco narrativo.

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts:5062-5090` so publica ticket transversal quando `result.verdict === "GO"` de `spec-ticket-validation`.
  - `src/types/workflow-improvement-ticket.ts:1-39` ainda importa tipos diretamente de `SpecTicketValidation*`.
  - `src/integrations/workflow-improvement-ticket-publisher.ts:321-427` renderiza o problema como follow-up do gate `spec-ticket-validation`.
  - `src/integrations/telegram-bot.ts:6207-6258` so sabe mostrar follow-up sistemico dentro do bloco do gate anterior ao `/run-all`.
  - A spec aprovada de retrospectiva exige que a publicacao nasca apenas depois de `workflow-gap-analysis`, com distincao entre hipotese sem ticket, ticket publicado/reutilizado e limitacao operacional.
- Frequencia (unico, recorrente, intermitente): recorrente enquanto o publisher continuar acoplado ao gate anterior ao `/run-all`
- Como foi detectado (warning/log/test/assert): leitura de tipos, runner, publisher, Telegram e da spec aprovada

## Expected behavior
`workflow-ticket-publication` deve nascer da retrospectiva pos-`spec-audit`, depois de uma analise causal propria. O sistema precisa deixar clara a politica para sinais sistemicos percebidos antes do `/run-all`: se eles forem mantidos, devem aparecer apenas como hipotese observavel e nao podem ser confundidos com a retrospectiva canonica da rodada.

## Reproduction steps
1. Ler `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:50-90`.
2. Ler `src/core/runner.ts:5062-5090` e confirmar que a publicacao atual depende de `SpecTicketValidationResult`.
3. Ler `src/types/workflow-improvement-ticket.ts:1-39` e verificar o acoplamento tipado ao gate anterior ao `/run-all`.
4. Ler `src/integrations/workflow-improvement-ticket-publisher.ts:321-427` e `src/integrations/telegram-bot.ts:6207-6258` para confirmar que a narrativa de follow-up sistemico ainda e a do `spec-ticket-validation`.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/core/runner.ts:5062-5090`
  - `src/types/workflow-improvement-ticket.ts:1-39`
  - `src/integrations/workflow-improvement-ticket-publisher.ts:321-427`
  - `src/integrations/telegram-bot.ts:6207-6258`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:50-90`
- Comparativo antes/depois (se houver): antes = follow-up sistemico nasce do gate pre-`/run-all`; depois esperado = nasce da retrospectiva pos-`spec-audit`, e sinais pre-`/run-all` tem politica explicita e separada

## Impact assessment
- Impacto funcional: tickets transversais podem continuar sendo abertos, resumidos ou justificados no momento errado.
- Impacto operacional: o operador nao consegue distinguir hipotese sistemica precoce de follow-up sistemico confirmado pela retrospectiva pos-auditoria.
- Risco de regressao: medio, porque a infraestrutura de publisher ja existe, mas precisa ser reposicionada sem perder dedupe, commit/push e caso cross-repo.
- Scope estimado (quais fluxos podem ser afetados): runner pos-`spec-audit`, publisher de ticket transversal, resumo final do Telegram, tipos compartilhados e testes dos cenarios cross-repo

## Initial hypotheses (optional)
- O publisher atual parece tecnicamente reaproveitavel, mas precisa de um contrato de entrada desacoplado do `SpecTicketValidationResult`.
- A politica mais segura para hipoteses pre-`/run-all` pode ser registra-las apenas como observacao nao acionavel, sem abrir ticket automatico e sem ocupar o mesmo bloco narrativo da retrospectiva.

## Proposed solution (optional)
- Reusar a infraestrutura atual de publicacao com novo contrato de entrada da retrospectiva pos-auditoria e politica explicita para hipoteses sistemicas detectadas antes do `/run-all`.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-05, RF-07, RF-16, RF-19, RF-20, RF-21, RF-22, RF-23; CA-05, CA-10, CA-11, CA-12, CA-16
- Evidencia observavel: `workflow-ticket-publication` passa a consumir o resultado de `workflow-gap-analysis` pos-`spec-audit`, cria ou reutiliza no maximo 1 ticket agregado no repositorio correto e preserva deduplicacao/reuso e commit/push apenas quando aplicavel.
- Requisito/RF/CA coberto: RF-17, RF-18, RF-24, RF-25, RF-29, RF-30; CA-06, CA-07, CA-13
- Evidencia observavel: o trace/log e o resumo final distinguem explicitamente:
  - hipotese sistemica sem ticket automatico;
  - ticket transversal publicado ou reutilizado;
  - limitacao operacional nao bloqueante;
  - ausencia de follow-up sistemico quando nao houver elegibilidade.
- Requisito/RF/CA coberto: politica para hipoteses antes do `/run-all`
- Evidencia observavel: sinais sistemicos percebidos durante `spec-ticket-validation` passam a seguir uma politica explicita e documentada, sem se passar por retrospectiva pos-auditoria nem abrir ticket automatico no momento errado.

## Decision log
- 2026-03-19 - Ticket aberto a partir da releitura da spec aprovada e da infraestrutura atual - o publisher sistemico continua acoplado ao `spec-ticket-validation`, e ainda nao existe politica clara para hipoteses sistemicas antes do `/run-all`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

