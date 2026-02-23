# [TICKET] Timeout de inatividade em `/codex_chat` conta durante runner ativo

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-23 15:47Z
- Reporter: mapita
- Owner: mapita
- Source: production-observation
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`): P1
- Justificativa objetiva (evidencias e impacto): timeout encerra sessao interativa ainda durante processamento, degradando confiabilidade do fluxo de conversa no Telegram.

## Context
- Workflow area: sessao interativa de `/codex_chat` no runner
- Scenario: sessao e encerrada por timeout de inatividade de 10 minutos enquanto o runner ainda esta em atividade/processamento.
- Input constraints: fluxo sequencial; timeout deve considerar inatividade do usuario apos resposta processada.

## Problem statement
A sessao de `/codex_chat` esta sendo encerrada por inatividade com janela de 10 minutos iniciando mesmo durante o processamento ativo do runner. Isso antecipa encerramentos indevidos em interacoes longas.

## Observed behavior
- O que foi observado: timeout de 10 minutos expira durante atividade do runner e a sessao e finalizada como inativa.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): observacao operacional em uso do fluxo `/codex_chat`.

## Expected behavior
O timeout de 10 minutos deve ser contabilizado somente como inatividade apos uma resposta ser processada e entregue ao usuario, nao durante execucao ativa do runner.

## Reproduction steps
1. Iniciar uma sessao `/codex_chat`.
2. Enviar um prompt que leva tempo relevante de processamento.
3. Observar que a sessao pode ser encerrada por timeout de 10 minutos antes de a janela de inatividade real (apos resposta) ser atingida.

## Evidence
- Logs relevantes (trechos curtos e redigidos): a coletar na implementacao/triagem.
- Warnings/codes relevantes: timeout de inatividade da sessao (`10m`).
- Comparativo antes/depois (se houver): antes esperado incorreto atual: timeout durante atividade; comportamento alvo: timeout apenas apos resposta processada.

## Impact assessment
- Impacto funcional: interrupcao indevida de conversas longas no `/codex_chat`.
- Impacto operacional: necessidade de reiniciar sessoes e perda de continuidade de contexto para usuario.
- Risco de regressao: medio (envolve ciclo de vida de sessao e controle de timeout).
- Scope estimado (quais fluxos podem ser afetados): gerenciamento de sessao interativa em `src/core` e integracao de status/timeout no bot.

## Initial hypotheses (optional)
- O timestamp base de inatividade esta sendo atualizado no inicio da requisicao, nao no fim do processamento da resposta.

## Proposed solution (optional)
- Ajustar a logica para iniciar/resetar o contador de inatividade no evento de resposta processada/enviada ao usuario.

## Closure criteria
- Reproduzir o cenario com processamento longo sem encerramento indevido durante atividade.
- Confirmar que os 10 minutos passam a contar apos resposta processada.
- Cobrir o comportamento com teste automatizado de ciclo de vida de sessao.
- Validar via fluxo manual no Telegram com evidencia de timestamps.

## Decision log
- 2026-02-23 15:47Z - Ticket aberto para corrigir contabilizacao de timeout de inatividade em `/codex_chat`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
