# [TICKET] Tornar o NO_GO de spec-ticket-validation auditavel no trace e compreensivel no Telegram

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
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-15, RF-16, RF-17, RF-27; CA-10, CA-11, CA-12
- Inherited assumptions/defaults (when applicable): `spec-ticket-validation` e um gate de qualidade anterior ao `/run-all`, distinto de falha tecnica; o operador precisa entender o que foi tentado, o que permaneceu aberto e qual e a proxima acao segura; quando o gate barra a rodada, os artefatos criados na triagem ainda podem permanecer locais e nao versionados.
- Workflow root cause (when applicable): execution
- Workflow root cause rationale (when applicable): o contrato do gate ja exige rastreabilidade na spec, trace/log e resumo final, mas a projecao atual do runner/Telegram reduz a rodada ao estado final e mistura "bloqueio por qualidade" com "falha tecnica".
- Remediation scope (when applicable): local
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - src/core/runner.ts
  - src/integrations/workflow-trace-store.ts
  - src/integrations/telegram-bot.ts
  - src/types/flow-timing.ts
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a rodada pode estar correta do ponto de vista do gate, mas o operador nao consegue reconstruir o que aconteceu nem diferenciar bloqueio de qualidade de falha tecnica. Isso reduz a utilidade operacional do `run-specs`.

## Context
- Workflow area: rastreabilidade do `spec-ticket-validation` no runner, traces e Telegram
- Scenario: a primeira rodada real do gate terminou em `NO_GO`, mas o resumo final nao deixou claro se houve tentativa de recuperacao, o que ficou alterado localmente e se a rodada falhou tecnicamente ou foi barrada pelo gate
- Input constraints: manter resumo legivel no Telegram; nao inundar o operador com payload bruto; preservar o contrato de timing/estado do runner

## Problem statement
Hoje o gate persiste e comunica apenas o estado final agregado da validacao. O primeiro passe e as tentativas intermediarias ficam invisiveis nos traces do fluxo, e o resumo final do Telegram trata `NO_GO` como `Resultado: falha`, o que confunde bloqueio deliberado por qualidade com erro tecnico do sistema. Alem disso, o operador nao recebe um estado operacional minimo sobre artefatos locais: se houve ou nao correcoes aplicadas, se algum arquivo mudou e se algo permaneceu sem commit/push por causa do bloqueio.

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts:4737-4816` usa `latestTurn` e grava apenas o ultimo turno da sessao no `workflow-trace-store`, apagando a visibilidade do primeiro passe quando existe revalidacao.
  - `src/types/flow-timing.ts:86-95` modela o resumo de `run-specs` com `outcome: "success" | "failure"`, sem um estado explicito de bloqueio por gate.
  - `src/integrations/telegram-bot.ts:6150-6228` renderiza `NO_GO` como `Resultado: falha` e mostra somente gaps/correcoes finais, sem informar se houve tentativa de correcao material, se algo mudou em disco ou se nada foi versionado.
  - A trilha gravada em `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json:12-58` informa `cyclesExecuted: 1`, mas nao preserva o primeiro passe nem as diferencas entre ciclos.
- Frequencia (unico, recorrente, intermitente): recorrente em todo `NO_GO` com revalidacao ou quando o operador precisa auditar a rodada depois do fato
- Como foi detectado (warning/log/test/assert): leitura de codigo, traces gerados e comparacao com a mensagem final recebida no Telegram

## Expected behavior
O trace e o resumo final de `run-specs` devem permitir responder, sem abrir o codigo:
- a rodada falhou tecnicamente ou foi barrada pelo gate de qualidade?
- quantos ciclos houve e o que aconteceu em cada um?
- houve tentativa de correcao? algum arquivo mudou?
- a spec e os tickets derivados ficaram locais e nao versionados?
- qual e a proxima acao recomendada?

## Reproduction steps
1. Ler `src/core/runner.ts:4737-4816` e verificar que apenas o ultimo turno de `spec-ticket-validation` e enviado ao `workflow-trace-store`.
2. Ler `src/integrations/workflow-trace-store.ts:1-120` e confirmar que o trace armazenado e por etapa, sem granularidade de ciclo.
3. Ler `src/integrations/telegram-bot.ts:6150-6228` e confirmar que o resumo final usa apenas `success | failure` e nao diferencia bloqueio de gate de erro tecnico.
4. Abrir `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md` e comparar o que ficou gravado com as perguntas operacionais acima.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Resultado: falha`
  - `Motivo de encerramento: spec-ticket-validation-no-go`
  - `Correcoes aplicadas: nenhuma`
- Warnings/codes relevantes:
  - `src/core/runner.ts:4737-4816`
  - `src/types/flow-timing.ts:86-95`
  - `src/integrations/telegram-bot.ts:6150-6228`
  - `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json:12-58`
- Comparativo antes/depois (se houver): antes = estado final agregado e ambiguo; depois esperado = trilha por ciclo, resumo final operacionalmente compreensivel e semantica distinta para `NO_GO`

## Impact assessment
- Impacto funcional: baixo no comportamento do runner, alto na capacidade de auditar e operar o fluxo com confianca.
- Impacto operacional: alto; o operador nao consegue entender rapidamente se deve corrigir backlog, rerodar o gate ou investigar erro tecnico.
- Risco de regressao: medio, porque toca tipos de resumo, renderizacao do Telegram e estrutura dos traces.
- Scope estimado (quais fluxos podem ser afetados): `run-specs`, `workflow-trace-store`, Telegram, possivel persistencia do gate na spec e testes de resumo final

## Initial hypotheses (optional)
- Pode ser suficiente manter o `outcome` atual para compatibilidade e introduzir uma categoria explicita de `resultClassification` ou similar para distinguir `blocked-by-gate` de `technical-failure`.
- Se o resumo final ficar muito longo, o trace por ciclo pode carregar o detalhe tecnico e o Telegram pode trazer um sumario curto com link/path dos artefatos.

## Proposed solution (optional)
- Persistir snapshots por ciclo do gate e ajustar a linguagem do resumo final para deixar `NO_GO` como bloqueio deliberado, nao como falha tecnica generica.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-15, RF-16; CA-10, CA-11
- Evidencia observavel: cada ciclo de `spec-ticket-validation` passa a ficar rastreavel com numero do ciclo, fase, resultado do passe e resumo de correcoes tentadas, sem depender apenas do ultimo turno da sessao.
- Requisito/RF/CA coberto: RF-16, RF-17, RF-27; CA-12
- Evidencia observavel: o resumo final do Telegram distingue claramente `NO_GO` de falha tecnica, informa se houve tentativa de correcao, se algum arquivo mudou e se a rodada deixou artefatos locais nao versionados.
- Requisito/RF/CA coberto: operacao segura do `/run_specs`
- Evidencia observavel: testes automatizados cobrem pelo menos:
  - `NO_GO` com revalidacao;
  - `NO_GO` sem revalidacao;
  - falha tecnica de `spec-ticket-validation`;
  - caminho em que nada foi commitado/pushado porque o bloqueio ocorreu antes de `spec-close-and-version`.

## Decision log
- 2026-03-19 - Ticket aberto a partir da analise da rodada falha - o estado final hoje e insuficiente para auditoria operacional e mistura bloqueio por qualidade com falha tecnica.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

