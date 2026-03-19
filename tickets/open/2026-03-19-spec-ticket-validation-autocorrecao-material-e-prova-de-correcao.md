# [TICKET] Materializar autocorrecao real do spec-ticket-validation e provar correcoes aplicadas

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 20:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17; CA-07, CA-08, CA-09, CA-10, CA-11, CA-12
- Inherited assumptions/defaults (when applicable): o gate decide `GO/NO_GO` sobre o pacote derivado inteiro; a estrategia padrao deve tentar autocorrecao antes de bloquear a rodada; o primeiro passe roda em contexto novo e revalidacoes reutilizam apenas o contexto da validacao corrente; `no-real-gap-reduction` so faz sentido depois de uma tentativa material de correcao.
- Workflow root cause (when applicable): execution
- Workflow root cause rationale (when applicable): o contrato do loop `corrigir -> revalidar` existe no core, mas a integracao concreta do runner deixa o passo `autoCorrect` sem qualquer mutacao real de arquivos nem evidencias verificaveis de correcao.
- Remediation scope (when applicable): local
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - execplans/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - src/core/spec-ticket-validation.ts
  - src/core/runner.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o gate promete recuperacao automatica, mas hoje executa uma revalidacao sem correcao material. Isso pode bloquear specs corretas por ausencia de wiring e mina a confianca no fluxo.

## Context
- Workflow area: `/run_specs` na etapa `spec-ticket-validation`, antes de `spec-close-and-version`
- Scenario: uma rodada real da spec `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` entrou em revalidacao, mas terminou com `NO_GO` sem qualquer correcao aplicada
- Input constraints: manter fluxo sequencial; nao reutilizar contexto de `spec-triage`; se houver mutacao de arquivos derivada da autocorrecao, ela precisa ser rastreavel e segura para revalidacao imediata

## Problem statement
O fluxo atual implementa o laço de `autocorrecao -> revalidacao` apenas como estrutura de controle. No runner real, a etapa de autocorrecao nao corrige nada: ela apenas recompila o `packageContext` e manda o mesmo pacote para nova validacao. Isso produz uma "tentativa de recuperacao" sem efeito concreto e faz o motivo final `no-real-gap-reduction` aparecer mesmo quando nao houve qualquer acao material sobre os tickets/spec/documentacao derivada.

## Observed behavior
- O que foi observado:
  - `src/core/runner.ts:4757-4765` implementa `autoCorrect` retornando somente `packageContext` atualizado e `appliedCorrections: []`.
  - `src/core/spec-ticket-validation.ts:95-145` considera que houve um ciclo completo sempre que o callback `autoCorrect` roda, mesmo sem mudanca material de artefatos.
  - A rodada real registrada em `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json:12-46` terminou com `cyclesExecuted: 1`, `finalReason: "no-real-gap-reduction"` e `appliedCorrections: []`.
  - O prompt atual `prompts/09-validar-tickets-derivados-da-spec.md:3-60` instrui somente a validar e responder JSON; ele nao define um passo operacional de correcao nem ownership sobre edicao dos artefatos derivados.
- Frequencia (unico, recorrente, intermitente): recorrente para todo gap marcado como `isAutoCorrectable` enquanto o wiring atual permanecer
- Como foi detectado (warning/log/test/assert): analise de codigo, trace da rodada falha e comparacao com o escopo explicitamente adiado no ExecPlan de origem

## Expected behavior
Quando um passe de `spec-ticket-validation` marcar gaps como autocorretaveis, o runner deve executar uma correcao material sobre o pacote derivado ou registrar explicitamente por que nao foi possivel aplicar correcao. A revalidacao so deve acontecer sobre o estado efetivamente corrigido. O resultado final precisa diferenciar com clareza:
- nao houve tentativa material de correcao;
- houve tentativa material, mas nenhum arquivo mudou;
- houve correcao material, mas os gaps persistiram;
- houve correcao material e os gaps reduziram.

## Reproduction steps
1. Ler `src/core/runner.ts:4741-4765` e confirmar que o callback `autoCorrect` do runner nao edita nenhum arquivo nem produz correcoes aplicadas.
2. Ler `src/core/spec-ticket-validation.ts:95-145` e confirmar que o ciclo de revalidacao roda independentemente de existir correcao material verificavel.
3. Abrir `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json` e verificar `cyclesExecuted: 1`, `finalReason: "no-real-gap-reduction"` e `appliedCorrections: []`.
4. Conferir em `prompts/09-validar-tickets-derivados-da-spec.md` que nao existe protocolo de correcao nem prompt dedicado para a etapa `corrigir`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `Etapa spec-ticket-validation concluida com veredito NO_GO.`
  - `finalReason = no-real-gap-reduction`
  - `appliedCorrections = []`
- Warnings/codes relevantes:
  - `src/core/runner.ts:4757-4765`
  - `src/core/spec-ticket-validation.ts:95-145`
  - `.codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json:12-46`
  - `execplans/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md:56-58`
- Comparativo antes/depois (se houver): antes = "revalidacao" pode acontecer sem nenhuma correcao material; depois esperado = revalidacao so acontece sobre estado corrigido ou o fluxo registra explicitamente que a correcao nao aconteceu

## Impact assessment
- Impacto funcional: specs podem ser barradas por falta de wiring da recuperacao, nao apenas por qualidade real do backlog derivado.
- Impacto operacional: o operador recebe a impressao de que houve tentativa de recuperacao, mas o trace nao mostra nenhuma acao concreta.
- Risco de regressao: alto, porque a correcao material vai tocar arquivos derivados e precisa evitar deixar o pacote em estado parcialmente editado.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/core/spec-ticket-validation.ts`, possivel novo prompt/protocolo de correcao, traces, resumo final do Telegram e testes focados do gate

## Initial hypotheses (optional)
- O desenho mais seguro pode separar `validar` e `corrigir` em protocolos diferentes, mantendo o parser do gate apenas para o passo de validacao.
- Se a correcao material for feita por prompt, o runner deve limitar quais arquivos podem ser alterados no ciclo e registrar diff ou checksum minimo dos artefatos tocados.

## Proposed solution (optional)
- Materializar um passo de correcao real do pacote derivado, com prova verificavel de arquivos alterados, e revalidar somente quando essa prova existir ou quando houver um no-op explicitamente classificado.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-12, RF-13, RF-14; CA-07, CA-08, CA-09
- Evidencia observavel: quando houver gap autocorretavel, o runner executa um passo de correcao material sobre tickets/spec/documentacao derivada autorizados e revalida o estado efetivamente corrigido; testes automatizados cobrem ao menos um caso `NO_GO -> correcao material -> GO`.
- Requisito/RF/CA coberto: RF-11, RF-15, RF-16, RF-17; CA-10, CA-11, CA-12
- Evidencia observavel: `appliedCorrections` passa a refletir efeitos verificaveis do runner (arquivos tocados, resultado aplicado/skipped/failed e motivo), e essa evidencia aparece na spec, no trace e no resumo final.
- Requisito/RF/CA coberto: RF-14
- Evidencia observavel: o motivo final do gate diferencia explicitamente "sem correcao material" de "correcao material sem reducao real", evitando usar `no-real-gap-reduction` para um ciclo sem mudanca real de artefato.
- Requisito/RF/CA coberto: seguranca operacional do ciclo
- Evidencia observavel: se a correcao falhar antes da revalidacao, o runner restaura o estado anterior ou deixa rastreado de forma objetiva quais arquivos ficaram alterados e por que o ciclo foi abortado.

## Decision log
- 2026-03-19 - Ticket aberto a partir da analise da primeira rodada real do novo gate - o comportamento atual simula recuperacao, mas nao materializa correcao nem prova de correcao.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

