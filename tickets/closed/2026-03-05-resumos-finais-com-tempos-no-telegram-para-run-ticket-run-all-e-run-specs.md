# [TICKET] Resumos finais com tempos no Telegram para run-ticket, run-all e run_specs

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-05 02:01Z
- Reporter: mapita
- Owner: codex
- Source: production-observation
- Parent ticket (optional): tickets/closed/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md
- Parent execplan (optional): execplans/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A (diagnostico estatico)
  - Response file: N/A (diagnostico estatico)
  - Log file: N/A (evidencias por leitura de codigo e testes)
- Related docs/execplans:
  - docs/specs/2026-03-05-medicao-de-tempo-por-prompt-fase-na-execucao-de-tickets-e-specs.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5): N/A
- Frequencia (1-5): N/A
- Custo de atraso (1-5): N/A
- Risco operacional (1-5): N/A
- Score ponderado (10-50): N/A
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): os resumos finais publicados hoje nao carregam tempos por fase/total e nao existe resumo final consolidado para `run-all`/`run_specs`, reduzindo observabilidade operacional.

## Context
- Workflow area: `src/integrations/telegram-bot.ts` + eventos emitidos por `src/core/runner.ts`.
- Scenario: operador recebe resumo final por ticket e milestone de triagem, mas sem duracoes e sem fechamento consolidado dos fluxos `run-all` e `run_specs`.
- Input constraints: manter formato legivel/deterministico e compatibilidade com status existentes.

## Problem statement
Mesmo com execucao sequencial e logs internos de duracao, o canal operacional (Telegram) nao entrega o resumo temporal exigido pela spec para os tres fluxos alvo. Em falhas, tambem nao ha exposicao das medicoes parciais coletadas ate a interrupcao.

## Observed behavior
- O que foi observado:
  - `src/integrations/telegram-bot.ts:4548-4573` monta resumo final de ticket sem tempos por fase/total.
  - `src/integrations/telegram-bot.ts:4575-4590` monta milestone de `/run_specs` sem tempos por fase/total.
  - `src/core/runner.ts:3034-3152` finaliza `/run-all` apenas por logs/estado, sem callback de resumo final de fluxo.
  - `src/core/runner.ts:2649-2717` finaliza triagem de `/run_specs` com milestone funcional, sem resumo temporal consolidado do fluxo.
- Frequencia (unico, recorrente, intermitente): recorrente.
- Como foi detectado (warning/log/test/assert): testes atuais validam payload textual sem campos de tempo (`src/integrations/telegram-bot.test.ts:4223-4225`, `src/integrations/telegram-bot.test.ts:4237-4248`).

## Expected behavior
No encerramento de `run-ticket`, `run-all` e `run_specs` (sucesso ou falha), o Telegram deve receber resumo final com:
- tempos por fase/prompt executados;
- tempo total acumulado do fluxo;
- dados parciais quando houver interrupcao por falha.

## Reproduction steps
1. Executar `/run_all` com pelo menos um ticket e aguardar encerramento.
2. Executar `/run_specs <spec.md>` e observar milestone/finalizacao.
3. Conferir mensagens recebidas: nao ha tempos por fase/total nem resumo final consolidado de fluxo.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - Eventos de sucesso/falha existem, mas sem duracao no payload final do Telegram.
- Warnings/codes relevantes:
  - Contratos de mensagem atuais nao incluem campos temporais.
- Comparativo antes/depois (se houver):
  - Antes: resumo final funcional sem telemetria temporal.
  - Depois (esperado): resumo final temporal deterministico para os tres fluxos.

## Impact assessment
- Impacto funcional: CAs CA-01, CA-02, CA-03 e CA-04 permanecem nao atendidos.
- Impacto operacional: dificuldade de localizar gargalos e de avaliar custos de falhas.
- Risco de regressao: medio (ajustes em mensagens/eventos e suite de testes do Telegram).
- Scope estimado (quais fluxos podem ser afetados): notificacoes de ticket, milestones/finalizacao de `run_specs`, possivel novo resumo final de `run-all`.

## Initial hypotheses (optional)
- O canal Telegram foi desenhado para status funcional minimo, sem camada temporal.
- Falta evento dedicado para fechamento consolidado de `run-all` e `run_specs` com metrica.

## Proposed solution (optional)
Consumir o contrato temporal do runner e publicar resumos finais deterministicos no Telegram para os tres fluxos, incluindo formato padronizado de sucesso/falha com tempos parciais quando aplicavel.

## Closure criteria
- Mensagens finais de `run-ticket`, `run-all` e `run_specs` exibem tempos por fase/prompt e total.
- Em falha, mensagens finais mantem tempos coletados ate o ponto de interrupcao.
- Formato textual e deterministico (ordem de fases consistente).
- Testes automatizados atualizados para validar os novos contratos de mensagem.

## Decision log
- 2026-03-05 - Ticket aberto para cobrir camada de apresentacao/observabilidade temporal no Telegram apos fundacao do contrato no runner.

## Closure
- Delivery decision: GO
- Closed at (UTC): 2026-03-05 02:37Z
- Closure reason: fixed
- Related PR/commit/execplan: commit deste ciclo em `main` (mesmo commit que move este ticket para `tickets/closed/`); `execplans/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Validacao manual externa pendente: sim
- Entrega tecnica concluida: implementacao e testes automatizados atendem os criterios funcionais do ticket (CA-01..CA-04).
- Validacao manual necessaria: validar em Telegram real os resumos finais de `run-ticket`, `run-all` e `run_specs` (sucesso/falha) com tempos por fase e total.
- Como executar a validacao manual:
  1. Executar `/run_all` em ambiente com bot real e confirmar mensagem "Resumo final de fluxo" com bloco "Tempos do fluxo".
  2. Executar `/run_specs <spec-aprovada>` e confirmar milestone de triagem com bloco "Tempos da triagem".
  3. Executar um ticket com falha controlada e confirmar exibicao de `Fase interrompida` e tempos parciais.
- Responsavel operacional: operador do bot Telegram (mapita).
