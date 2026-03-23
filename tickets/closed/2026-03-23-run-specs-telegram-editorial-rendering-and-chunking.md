# [TICKET] Mensagens de /run_specs no Telegram ainda usam montagem append-only com duplicacao e chunking sem contexto de secao

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-23 16:17Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-02, RF-07, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24; CA-03, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10.
- Inherited assumptions/defaults (when applicable): o Telegram continua sendo superficie operacional de leitura rapida; o marco de triagem deve ser mais curto e decisorio que o resumo final; o resumo final pode ser mais detalhado desde que preserve hierarquia visual; nem toda fase precisa expor o mesmo volume de dados; o formato alvo permanece compativel com texto simples e chunking.
- Inherited RNFs (when applicable): RF-19, RF-20, RF-21, RF-22 e RF-24 governam legibilidade, arquitetura editorial, chunking e cobertura automatizada minima.
- Inherited technical/documentary constraints (when applicable): preservar a camada atual de entrega robusta do Telegram; manter compatibilidade com mensagens em texto simples; nao alterar a semantica funcional das fases do `/run_specs`; nao introduzir persistencia/outbox ou novas garantias de entrega; nao transformar o Telegram em copia integral de trace/log bruto; manter o fluxo sequencial e a observabilidade atual do runner.
- Inherited pending/manual validations (when applicable): revisar com exemplos reais se o novo marco de triagem ficou informativo sem virar resumo final prematuro; validar em mensagens reais se a hierarquia visual permanece agradavel quando o resumo final for chunkado em mais de uma parte; confirmar manualmente que operadores conseguem responder mais rapido a "o que aconteceu?", "o que mudou?" e "o que faco agora?" usando apenas a mensagem do Telegram.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - SPECS.md
  - INTERNAL_TICKETS.md
  - docs/workflows/codex-quality-gates.md
  - docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md
  - tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade P1 porque o problema ja afeta leitura operacional, mas depende primeiro do ticket P0 que amplia o contrato de dados usado pelo renderer.

## Context
- Workflow area: renderizacao do milestone de triagem e do resumo final de `/run_specs` no Telegram.
- Scenario: o renderer atual usa concatenacao incremental de linhas para blocos heterogeneos, sem modelo editorial de secoes, com deduplicacao fraca e chunking apenas por newline.
- Input constraints: manter texto simples, preservar entrega robusta e reduzir duplicacao/parede de texto sem despejar todos os campos internos.

## Problem statement
Mesmo onde ja existem dados estruturados, a renderizacao atual de `/run_specs` ainda mistura blocos em ordem pouco editorial, repete informacao entre historico e agregados, reutiliza rotulos genericos como `Resumo` para camadas diferentes e deixa o chunking quebrar a leitura apenas pelo ultimo newline disponivel. A superficie Telegram continua correta do ponto de vista de transporte, mas ainda abaixo do contrato editorial definido na spec.

## Observed behavior
- O que foi observado: `buildRunFlowSummaryMessage` em `src/integrations/telegram-bot.ts` monta o resumo final por `lines.push(...)` e apenas anexa blocos disponiveis; `appendRunSpecsTicketValidationLines` imprime correcoes por ciclo e depois repete `Correcoes aplicadas` de forma agregada; `appendSpecTicketDerivationRetrospectiveLines` e `appendWorkflowGapAnalysisDetails` usam `Resumo:` para camadas diferentes; `appendTimingLines` adiciona `Tempos do fluxo` e `Tempos da triagem` sem uma moldura editorial mais forte; `chunkText` em `src/integrations/telegram-delivery.ts` quebra apenas por ultimo `\n` antes do limite; o teste de chunking em `src/integrations/telegram-bot.test.ts` valida apenas contagem de partes.
- Frequencia (unico, recorrente, intermitente): recorrente em todos os resumos de `/run_specs`.
- Como foi detectado (warning/log/test/assert): inspecao do renderer e da suite de testes de Telegram/runner.

## Expected behavior
As mensagens de `/run_specs` devem ser montadas por secoes editoriais estaveis, com responsabilidade clara entre milestone e resumo final, deduplicacao semantica das correcoes, evolucao legivel do gate por ciclo, separacao explicita entre retrospectiva da derivacao e retrospectiva pos-`spec-audit`, rotulos nao ambiguos e chunking que preserve fronteiras de secao sempre que houver alternativa razoavel. A suite de testes deve travar esses comportamentos em cenarios de sucesso, bloqueio, falha tecnica, retrospectiva executada/pulada e mensagem longa chunkada.

## Reproduction steps
1. Ler `buildRunFlowSummaryMessage`, `appendRunSpecsTicketValidationLines`, `appendSpecTicketDerivationRetrospectiveLines` e `appendTimingLines` em `src/integrations/telegram-bot.ts`.
2. Ler `chunkText` em `src/integrations/telegram-delivery.ts`.
3. Ler os testes atuais em `src/integrations/telegram-bot.test.ts` e comparar a cobertura com CA-03 e CA-05 a CA-10 da spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/integrations/telegram-bot.ts`: renderer append-only em `buildRunFlowSummaryMessage`.
  - `src/integrations/telegram-bot.ts`: `appendRunSpecsTicketValidationLines` repete correcoes no historico por ciclo e no agregado final.
  - `src/integrations/telegram-bot.ts`: retrospectiva da derivacao e analise sistemica compartilham o rotulo generico `Resumo`.
  - `src/integrations/telegram-delivery.ts`: `chunkText` nao conhece fronteiras de secao, apenas o ultimo newline antes do limite.
  - `src/integrations/telegram-bot.test.ts`: o teste de chunking atual so assegura multiplas partes e cabecalho `Parte x/y`.
- Comparativo antes/depois (se houver): n/a

## Impact assessment
- Impacto funcional: o operador ainda recebe mensagens corretas, mas com leitura menos rapida, menor clareza sobre o que mudou entre ciclos e ambiguidade entre blocos pre- e pos-`run-all`.
- Impacto operacional: aumenta tempo de diagnostico no Telegram e reduz a confianca no checkpoint de triagem e no resumo final como superficies autocontidas.
- Risco de regressao: medio, porque a mudanca envolve renderer, possivel view-model editorial, chunking e asserts textuais amplos.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/telegram-bot.ts`, possivel apoio em `src/integrations/telegram-delivery.ts`, `src/integrations/telegram-bot.test.ts` e testes correlatos do runner.

## Initial hypotheses (optional)
- A montagem incremental de linhas facilitou o crescimento do resumo, mas agora impede separar responsabilidade editorial, deduplicar sinal e preservar leitura chunkada com previsibilidade.

## Proposed solution (optional)
- Migrar o renderer de `/run_specs` para um modelo orientado a secoes/view-models editoriais, com chunking guiado por secoes e asserts editoriais explicitos na suite de testes.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-02, RF-07, CA-03.
- Evidencia observavel: milestone e resumo final passam a usar ordem editorial estavel, com secoes distinguiveis para visao geral, fases pre-`/run_all`, fases pos-`/run_all`, timings e resultado do `/run_all`; testes de Telegram verificam rotulos e ordem.
- Validacao de fechamento: `src/integrations/telegram-bot.ts` passou a renderizar milestone e resumo final via `renderEditorialMessage(...)`, com secoes `Visao geral da triagem`, `Pre-/run_all`, `Pos-/run_all`, timings e `Resultado do /run_all encadeado`; `src/integrations/telegram-bot.test.ts` valida ordem e rotulos com `assertOrderedSubstrings(...)`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts`, `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` e `npm test` passaram em 2026-03-23 17:14Z.
- Requisito/RF/CA coberto: RF-13, RF-14, RF-15, CA-05, CA-10.
- Evidencia observavel: o bloco de `spec-ticket-validation` mostra evolucao entre ciclos, contagem de gaps finais e revalidacao quando houver, sem repetir literalmente a mesma correcao em historico e agregado; testes fazem asserts negativos para duplicacao textual.
- Validacao de fechamento: `src/integrations/telegram-bot.ts` passou a expor `Revalidacao executada`, `Contagem final de gaps`, `Evolucao por ciclo` e `Sintese final das correcoes aplicadas`; o teste `envia historico por ciclo no resumo de /run-specs quando houve revalidacao` em `src/integrations/telegram-bot.test.ts` verifica a ausencia de repeticao literal da mesma correcao com `countOccurrences(...) === 1`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts` passou em 2026-03-23 17:14Z.
- Requisito/RF/CA coberto: RF-16, RF-17, RF-18, CA-06, CA-07.
- Evidencia observavel: a retrospectiva da derivacao separa execucao, analise sistemica e ticket/limitacao associada; rotulos deixam de reutilizar `Resumo` sem qualificacao; timings de triagem e fluxo completo ficam com escopo autoexplicativo.
- Validacao de fechamento: `src/integrations/telegram-bot.ts` passou a usar `Sintese da retrospectiva`, `Analise sistemica associada`, `Ticket transversal ou limitacao associada`, `Timing do fluxo completo` e `Timing da triagem pre-/run_all`; os testes `envia resumo final de /run-specs distinguindo gate funcional, retrospectiva da derivacao e retrospectiva pos-spec-audit` e `envia resumo final de fluxo /run-specs com tempos e snapshot parcial em falha` confirmam os rotulos qualificados; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts` passou em 2026-03-23 17:14Z.
- Requisito/RF/CA coberto: RF-19, RF-20, RF-21, RF-22, RF-24, CA-08.
- Evidencia observavel: o renderer passa a ser orientado a secoes/view-models editoriais; a suite cobre sucesso, `NO_GO`, falha tecnica de triagem, retrospectiva executada, retrospectiva pulada e mensagens longas chunkadas com asserts editoriais especificos e verificacao de fronteira de secao quando aplicavel.
- Validacao de fechamento: `src/integrations/telegram-bot.ts` foi refatorado para builders editoriais por secao e `src/integrations/telegram-delivery.ts` passou a preferir `\\n\\n` antes de `\\n` no chunking; `src/integrations/telegram-delivery.test.ts` valida a quebra por fronteira de secao e `src/integrations/telegram-bot.test.ts` cobre sucesso, `NO_GO`, falha tecnica, retrospectiva executada/pulada e resumo longo; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts`, `npm test`, `npm run check` e `npm run build` passaram em 2026-03-23 17:14Z.
- Requisito/RF/CA coberto: RF-23, CA-09.
- Evidencia observavel: `sendRunSpecsTriageMilestone` e `sendRunFlowSummary` continuam usando `TelegramDeliveryService` com logging/retry/chunking centralizados, e os testes existentes de entrega permanecem passando.
- Validacao de fechamento: o diff manteve `sendRunSpecsTriageMilestone(...)` e `sendRunFlowSummary(...)` no caminho central de `TelegramDeliveryService`; `src/integrations/telegram-delivery.test.ts` e os cenarios de envio em `src/integrations/telegram-bot.test.ts` permaneceram verdes; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` concluiu com 430 testes aprovados em 2026-03-23 17:14Z.
- Requisito/RF/CA coberto: validacoes manuais herdadas da spec.
- Evidencia observavel: o ticket registra exemplos reais de mensagem apos implementacao e documenta o resultado das tres validacoes manuais herdadas, mesmo que permaneçam como cheque manual externo ao fechamento automatico.
- Validacao de fechamento: a implementacao tecnica ficou concluida e validada localmente; a coleta de exemplos reais em Telegram continua externa ao agente e foi registrada abaixo como validacao manual pendente, com procedimento e responsavel operacional explicitos. Pela regra de fechamento deste workflow, isso mantem o resultado em `GO` com anotacao de validacao manual externa pendente.

## Manual validation pending
- Entrega tecnica concluida: sim. O aceite tecnico local desta etapa ficou coberto por `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts`, `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`, todos verdes em 2026-03-23 17:14Z.
- Validacoes manuais externas ainda necessarias:
  - Revisar em chat Telegram autorizado se o novo marco de triagem ficou informativo sem virar resumo final prematuro.
  - Validar em mensagens reais chunkadas se a hierarquia visual continua agradavel quando o resumo final ocupa mais de uma parte.
  - Confirmar com operador do workflow que as perguntas "o que aconteceu?", "o que mudou?" e "o que faco agora?" podem ser respondidas apenas pelo Telegram apos uma rodada real de `/run_specs`.
- Como executar a validacao manual:
  - Rodar `/run_specs <spec-aprovada>` em ambiente com bot Telegram autorizado.
  - Capturar o milestone de triagem e o resumo final reais, inclusive quando houver chunking.
  - Registrar no historico operacional ou na trilha da rodada os exemplos reais e o resultado objetivo de cada uma das tres validacoes.
- Responsavel operacional pela validacao manual: operador do runner com acesso ao chat Telegram autorizado e a uma spec elegivel para rodada real.
- Motivo para nao bloquear o aceite: a implementacao local ja demonstrou o comportamento exigido por diff, codigo e suites automatizadas; o remanescente depende apenas de exercicio operacional externo ao agente.

## Decision log
- 2026-03-23 - Ticket derivado separadamente do contrato de summaries para manter escopo editorial executavel e respeitar a ordem de dependencia da fila (`P0` antes de `P1`).
- 2026-03-23 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO` com validacao manual externa pendente.

## Closure
- Closed at (UTC): 2026-03-23 17:14Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Checklist aplicado: releitura do diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion.
