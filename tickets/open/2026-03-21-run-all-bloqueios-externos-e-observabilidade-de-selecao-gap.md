# [TICKET] Tornar `/run_all` resiliente a bloqueios externos e explicito na observabilidade de selecao

## Metadata
- Status: open
- Priority: P0
- Severity: S2
- Created at (UTC): 2026-03-21 19:34Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md
- Parent commit (optional):
- Analysis stage (when applicable): diagnostic review pos-falha de `/run_all`
- Active project (when applicable): guiadomus-enrich-costs-and-bid
- Target repository (when applicable): ../guiadomus-enrich-costs-and-bid
- Request ID: N/A - diagnostico manual consolidado a partir de traces, git log e artefatos do projeto alvo
- Source spec (when applicable): ../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md
- Source spec canonical path (when applicable): ../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md
- Source requirements (when applicable): docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::RF-08, docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::RF-10, docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::CA-06, docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::CA-08, INTERNAL_TICKETS.md::Ciclo de vida do ticket, README.md::Observacoes operacionais
- Inherited assumptions/defaults (when applicable): tickets com dependencia exclusiva de insumo externo/manual devem continuar auditaveis no backlog, mas nao podem consumir repetidamente a fila automatica sem progresso local; `split-follow-up` continua valido para `NO_GO` tecnico real, mas nao deve gerar churn documental infinito quando o estado correto e `blocked`; o resumo final precisa distinguir o ultimo ticket processado do ticket recusado na selecao seguinte.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (audit/review only): o contrato combinado de prompt/template/fila/summary nao operacionaliza de forma coerente o status `blocked` e o caso `external/manual` sem proximo passo local; com isso, follow-ups de espera nascem como tickets `open`/`P0`, a fila os consome normalmente, o runner so percebe a falta de conclusao quando a linhagem excede o limite de `NO_GO`, e o resumo final mistura o ultimo ticket concluido com o ticket recusado em `select-ticket`.
- Remediation scope (audit/review only): generic-repository-instruction
- Related artifacts:
  - Request file: ../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/requests/20260321t183642z-run-all-ticket-plan-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-request.md
  - Response file: ../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/responses/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-response.md
  - Decision file: ../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/decisions/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-decision.json
- Related docs/execplans:
  - ../guiadomus-enrich-costs-and-bid/tickets/open/2026-03-21-aguardar-amostra-publicavel-e-retomar-contrafactual-final-da-v3.md
  - ../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-20-validar-calibragem-final-da-v3-com-amostra-real-publicavel.md
  - ../guiadomus-enrich-costs-and-bid/INTERNAL_TICKETS.md
  - execplans/2026-02-20-close-and-version-no-go-follow-up-ticket-and-run-all-limit-gap.md
  - execplans/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md
  - tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): em um caso real de `2026-03-21`, `/run_all` gastou 1h55m processando 5 tickets documentais sobre o mesmo bloqueio externo/manual, gerou 5 commits/pushes sem alterar codigo de produto, deixou outros tickets abertos sem execucao e encerrou em falha com `no-go-limit-exceeded`. Isso bloqueia throughput do backlog e reduz confianca operacional no runner.

## Context
- Workflow area: `src/integrations/ticket-queue.ts` -> `src/core/runner.ts` (`run-all`, `select-ticket`, `close-and-version`) -> `src/integrations/telegram-bot.ts`
- Scenario: um projeto externo possui backlog misto de tickets reais e um ticket que, na pratica, representa apenas espera por insumo externo/manual. O runner fecha esse ticket com `split-follow-up`, gera outro follow-up equivalente como `P0`, seleciona o novo ticket de novo e repete o ciclo ate atingir o guardrail de 3 recuperacoes.
- Input constraints: preservar fluxo sequencial por ticket; manter backlog e rastreabilidade em git; nao esconder tickets bloqueados do operador; evitar regressao do contrato `GO` vs `NO_GO`; manter compatibilidade com projetos externos e com o resumo final atual do Telegram.

## Problem statement
O `codex-flow-runner` nao diferencia adequadamente um ticket `blocked` por dependencia externa/manual de um ticket `open` realmente elegivel para execucao automatica. Como a fila de `/run_all` prioriza apenas `Priority` e nome de arquivo, follow-ups de espera podem reaparecer imediatamente como `P0`, gerando churn de `split-follow-up` sem progresso local. O runner so interrompe quando a linhagem ultrapassa o limite de recuperacoes de `NO_GO`, e o resumo final do Telegram ainda apresenta um unico `Ticket de referencia`, o que embaralha o ultimo ticket concluido com o ticket recusado na selecao.

## Observed behavior
- O que foi observado:
  - a fila do runner escolhe tickets abertos por `Priority` e nome, ignorando a metadata `Status` (`open`, `in-progress`, `blocked`);
  - o prompt de fechamento permite que um bloqueio `external/manual` sem proximo passo local seja materializado como novo follow-up `open`/`P0`;
  - o runner considera progresso suficiente enquanto houver novo arquivo de follow-up, mesmo que a causa-raiz, os criteria nao atendidos e a ausencia de insumo permaneçam essencialmente os mesmos;
  - `close-and-version` pode passar mesmo quando o ticket movido para `tickets/closed/` fica com metadata incoerente, como `Status: open`;
  - o resumo final de `run-all` no Telegram mostra `Ticket de referencia` unico, sem separar o ultimo ticket processado do ticket que causou a falha em `select-ticket`.
- Frequencia (unico, recorrente, intermitente): recorrente quando houver backlog com bloqueios exclusivamente externos/manuais tratados como follow-up executavel.
- Como foi detectado (warning/log/test/assert): diagnostico manual de uma rodada real falha em `../guiadomus-enrich-costs-and-bid`, releitura dos tickets/execplans gerados, traces em `.codex-flow-runner/flow-traces/`, `git log`, `README.md`, `INTERNAL_TICKETS.md`, `src/integrations/ticket-queue.ts`, `src/core/runner.ts` e `src/integrations/telegram-bot.ts`.

## Expected behavior
O runner deve tornar visivel e respeitar a diferenca entre trabalho elegivel para execucao automatica e espera por insumo externo/manual. Um follow-up que so representa aguardando insumo deve ser explicitado como `blocked` ou equivalente observavel, ficar fora da fila automatica de `/run_all`, e nao provocar cadeia repetitiva de `split-follow-up` sem progresso local. Quando uma rodada falhar em `select-ticket`, o resumo final deve distinguir claramente o ultimo ticket processado do ticket bloqueado/recusado na selecao.

## Reproduction steps
1. No projeto `../guiadomus-enrich-costs-and-bid`, manter aberto um ticket `P0` cuja causa-raiz e `external/manual` e cujo proximo passo real e apenas aguardar amostra/insumo externo, como [2026-03-21-aguardar-amostra-publicavel-e-retomar-contrafactual-final-da-v3.md](../guiadomus-enrich-costs-and-bid/tickets/open/2026-03-21-aguardar-amostra-publicavel-e-retomar-contrafactual-final-da-v3.md).
2. Executar `/run_all` e observar que o runner fecha o ticket corrente com `split-follow-up`, cria novo follow-up equivalente em `tickets/open/`, faz commit/push e volta a seleciona-lo por ser `P0`.
3. Repetir o ciclo ate a linhagem exceder 3 recuperacoes de `NO_GO`.
4. Observar a falha final em `select-ticket` com `completionReason: no-go-limit-exceeded` e o resumo do Telegram apontando um unico `Ticket de referencia`, apesar de o ticket citado nao ter sido executado.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `run-all` do projeto alvo iniciou em `2026-03-21T16:56:12.802Z` e terminou em falha em `2026-03-21T18:51:55.923Z`, com `Tickets processados: 5/20`, `Fase final: select-ticket` e `Motivo de encerramento: no-go-limit-exceeded`.
  - os 5 commits da rodada foram apenas `chore(tickets): close ...`, todos sem alteracao de runtime de produto e sempre com o mesmo bloqueio `external/manual`.
- Warnings/codes relevantes:
  - `src/core/runner.ts` interrompe a rodada quando `splitFollowUpRecoveries > 3`.
  - `src/integrations/ticket-queue.ts` seleciona tickets por `Priority`/nome sem considerar `Status`.
  - `src/integrations/telegram-bot.ts` renderiza apenas `Ticket de referencia` no resumo final de `run-all`.
  - [2026-03-20-validar-calibragem-final-da-v3-com-amostra-real-publicavel.md](../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-20-validar-calibragem-final-da-v3-com-amostra-real-publicavel.md) foi movido para `tickets/closed/`, mas permaneceu com `Status: open`.
- Comparativo antes/depois (se houver):
  - antes esperado: um ticket em espera externa/manual permanece visivel no backlog, mas nao consome repetidamente a fila automatica;
  - comportamento observado: o wait-state virou cadeia de follow-ups `P0`, consumiu a rodada inteira e bloqueou outros tickets elegiveis.

## Impact assessment
- Impacto funcional: `/run_all` falha mesmo sem erro tecnico de implementacao/git, apenas por churn documental de follow-up.
- Impacto operacional: outros tickets abertos deixam de ser processados porque follow-ups `P0` equivalentes monopolizam a fila.
- Risco de regressao: medio, porque a correcao toca contrato de tickets, selecao da fila, summary do Telegram, tipagem de resumo final e guardrails de fechamento.
- Scope estimado (quais fluxos podem ser afetados): `prompts/04-encerrar-ticket-commit-push.md`, `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `README.md`, `src/integrations/ticket-queue.ts`, `src/integrations/ticket-queue.test.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`, `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.

## Initial hypotheses (optional)
- O caso correto precisa combinar contrato humano e guardrail de runtime:
  - follow-up sem proximo passo local e dependente apenas de insumo externo/manual deve nascer como `blocked` ou equivalente observavel;
  - `/run_all` deve pular tickets `blocked` e diferenciar backlog elegivel de backlog em espera;
  - o fechamento precisa validar consistencia minima do ticket movido para `tickets/closed/`;
  - o resumo final de `run-all` precisa transportar dois contextos distintos quando falha em `select-ticket`: ultimo ticket concluido e ticket recusado/bloqueado na selecao.

## Proposed solution (optional)
- Endurecer prompt/template/documentacao para que `external/manual` sem acao local gere follow-up `blocked`, nao novo ticket auto-executavel.
- Atualizar fila/runner para ignorar tickets `blocked` em `/run_all` e encerrar a rodada de forma acionavel quando restarem apenas tickets bloqueados.
- Tornar observavel um guardrail de "sem progresso real" para impedir novas cadeias equivalentes de `split-follow-up`.
- Validar em `close-and-version` que todo ticket movido para `tickets/closed/` tenha `Status: closed`, `Closed at (UTC)` e `Closure reason` coerentes.
- Evoluir o resumo final do Telegram para distinguir `ultimo ticket processado` de `ticket bloqueado/recusado na selecao`.

## Closure criteria
- Requisito/RF/CA coberto: semantica de backlog bloqueado
- Evidencia observavel: `INTERNAL_TICKETS.md`, template e prompt de fechamento passam a explicitar quando follow-up `external/manual` deve ser `blocked` em vez de novo ticket `open`.
- Requisito/RF/CA coberto: consumo automatico da fila
- Evidencia observavel: `src/integrations/ticket-queue.ts` e `src/core/runner.ts` deixam de selecionar tickets `blocked` em `/run_all`, e os testes cobrem fila mista com `open` + `blocked`.
- Requisito/RF/CA coberto: protecao contra churn sem progresso
- Evidencia observavel: existe guardrail observavel impedindo nova cadeia equivalente de `split-follow-up` quando o estado remanescente e apenas espera por insumo externo/manual sem progresso local.
- Requisito/RF/CA coberto: consistencia de fechamento
- Evidencia observavel: `close-and-version` falha cedo quando um ticket movido para `tickets/closed/` nao ficou com metadata minima coerente (`Status: closed`, `Closed at (UTC)`, `Closure reason`).
- Requisito/RF/CA coberto: observabilidade do resumo final
- Evidencia observavel: o resumo final de `run-all` no Telegram distingue o ultimo ticket processado do ticket bloqueado/recusado em `select-ticket`, evitando ambiguidade do atual `Ticket de referencia`.

## Decision log
- 2026-03-21 - Ticket aberto a partir de diagnostico real de falha do `/run_all` em projeto externo - a parada por `no-go-limit-exceeded` se mostrou efeito colateral de contrato insuficiente entre tickets `blocked`, follow-up `external/manual`, fila automatica e resumo final.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
