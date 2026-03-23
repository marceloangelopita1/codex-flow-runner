# [TICKET] Projeto ainda nao documenta nem protege o uso canônico da camada central de mensagens Telegram

## Metadata
- Status: open
- Status guidance: `open` = elegível para execução; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisão externa sem próximo passo local executável; `closed` = encerrado em `tickets/closed/`
- Priority: P2
- Severity: S3
- Created at (UTC): 2026-03-23 13:43Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional): tickets/open/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: N/A
- Source spec (when applicable): docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-19; CA-08, CA-10; restrições documentais: seguir `DOCUMENTATION.md`, evitar duplicação de regra canônica, registrar explicitamente o caminho oficial para novas mensagens Telegram e a exceção de escopo para superfícies fora de `sendMessage(...)`
- Inherited assumptions/defaults (when applicable): novas mensagens Telegram devem escolher política e formatter sem chamar o transporte bruto diretamente; a fonte de verdade documental deve ficar em documento canônico do projeto, não em duplicação espalhada
- Inherited RNFs (when applicable): orientação futura precisa ser inequívoca e auditável; o contrato de centralização deve reduzir retrabalho e deriva arquitetural em novos fluxos
- Inherited technical/documentary constraints (when applicable): seguir `DOCUMENTATION.md`; não duplicar regra canônica no `AGENTS.md`; manter explícito o limite de escopo inicial para `sendMessage(...)`
- Inherited pending/manual validations (when applicable): auditoria automatizada do código deve mostrar que os envios baseados em `sendMessage(...)` migrados não duplicam mais lógica de transporte
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a - triagem pré-implementação da spec
- Smallest plausible explanation (audit/review only): n/a - triagem pré-implementação da spec
- Remediation scope (audit/review only): n/a - triagem pré-implementação da spec
- Related artifacts:
  - Request file: N/A (diagnóstico estático na documentação e no código)
  - Response file: N/A (diagnóstico estático na documentação e no código)
  - Decision file: N/A (triagem documental local)
- Related docs/execplans:
  - docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md
  - DOCUMENTATION.md
  - docs/workflows/codex-quality-gates.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`): P2
- Justificativa objetiva (evidencias e impacto): sem regra canônica documentada e sem guardrail objetivo, a equipe pode reintroduzir chamadas diretas a `sendMessage(...)` mesmo após a camada central existir, recriando a deriva arquitetural que motivou a spec.

## Context
- Workflow area: documentação canônica e guardrails de manutenção para integrações Telegram
- Scenario: a spec exige que futuras mensagens usem a camada central, mas o repositório ainda não registra essa orientação fora da própria spec e não possui um guardrail objetivo contra novas chamadas brutas
- Input constraints: respeitar `DOCUMENTATION.md`; evitar duplicação desnecessária; escolher o documento canônico correto para a regra

## Problem statement
Hoje não existe documentação operacional do projeto dizendo explicitamente que novas mensagens Telegram devem usar a camada central e escolher uma política de entrega. Também não existe guardrail verificável que torne observável o retorno indevido de `sendMessage(...)` bruto fora das exceções aceitas.

## Observed behavior
- O que foi observado:
  - a auditoria por `rg` não encontrou orientação canônica fora da spec alvo para o uso obrigatório da futura camada central
  - `src/integrations/telegram-bot.ts` ainda contém 23 chamadas diretas a `bot.telegram.sendMessage(...)`
  - a própria spec já exige em RF-19/CA-10 que essa orientação passe a existir, mas ela ainda não foi materializada em documentação de projeto
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de `DOCUMENTATION.md`, da spec alvo e auditoria por `rg`

## Expected behavior
O projeto deve ter uma fonte de verdade documental dizendo onde a camada central vive, como novas mensagens escolhem política de entrega e quais superfícies permanecem explicitamente fora do escopo inicial. Além disso, deve existir um guardrail automatizado simples que torne observável o reaparecimento de `sendMessage(...)` bruto fora das exceções justificadas.

## Reproduction steps
1. Executar `rg -n "camada central|política de entrega|sendMessage\\(" DOCUMENTATION.md README.md docs src`.
2. Confirmar que a orientação canônica só existe na spec alvo e não em documentação operacional do projeto.
3. Executar `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts` e observar a falta de um guardrail que falhe quando novas chamadas indevidas forem adicionadas.

## Evidence
- Logs relevantes (trechos curtos e redigidos): N/A
- Warnings/codes relevantes:
  - ausência de documentação canônica explícita para o uso da camada central
  - ausência de auditoria/teste que funcione como barreira contra reintrodução de transporte bruto
- Comparativo antes/depois (se houver):
  - Antes: regra fica implícita na spec e depende de memória do implementador
  - Depois (esperado): regra fica documentada e verificável por guardrail simples

## Impact assessment
- Impacto funcional: baixo no curto prazo, mas alto para manutenção futura se a regra continuar implícita
- Impacto operacional: aumenta chance de retrabalho e de novos fluxos nascerem fora da arquitetura prevista
- Risco de regressao: baixo-médio, concentrado em documentação e em um guardrail automatizado de manutenção
- Scope estimado (quais fluxos podem ser afetados): documentação canônica do projeto e suíte de testes/auditoria da integração Telegram

## Initial hypotheses (optional)
- O lugar mais adequado para a regra é um documento canônico de documentação operacional ou README de integração, com ponteiro leve quando necessário, mais um teste/auditoria simples sobre as chamadas diretas restantes permitidas.

## Proposed solution (optional)
- Atualizar a documentação canônica para registrar a camada central como caminho obrigatório para novas mensagens Telegram e listar as exceções de escopo inicial.
- Adicionar guardrail automatizado simples que torne observável o reaparecimento de `sendMessage(...)` bruto fora das exceções justificadas.

## Closure criteria
- Requisito/RF/CA coberto: RF-19, CA-10
- Evidencia observavel: existe documentação canônica do projeto orientando explicitamente futuras mensagens Telegram a usar a camada central e a selecionar política de entrega, em conformidade com `DOCUMENTATION.md`.
- Requisito/RF/CA coberto: CA-08
- Evidencia observavel: existe guardrail automatizado simples (teste/auditoria) que falha quando novas chamadas diretas a `sendMessage(...)` surgem fora das exceções justificadas.
- Requisito/RF/CA coberto: restrição documental relevante
- Evidencia observavel: a regra não é duplicada de forma desnecessária em `AGENTS.md` e o limite de escopo inicial (`sendMessage(...)` centralizado; `answerCbQuery(...)`/`editMessageText(...)` fora do núcleo) fica explícito na documentação escolhida.

## Decision log
- 2026-03-23 - Ticket aberto para transformar a exigência documental da spec em regra canônica de projeto com guardrail observável.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisão externa e não houver próximo passo local executável, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executável pelo agente.
