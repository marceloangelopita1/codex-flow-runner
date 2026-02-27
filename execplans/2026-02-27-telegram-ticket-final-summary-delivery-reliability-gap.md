# ExecPlan - Confiabilidade de entrega do resumo final por ticket no Telegram

## Purpose / Big Picture
- Objetivo: eliminar perda intermitente da notificacao final por ticket no Telegram quando ocorrerem falhas transitorias (rede/API), mantendo o fluxo sequencial de tickets.
- Resultado esperado:
  - envio com retry/backoff para erros transitorios;
  - falha definitiva apos limite de tentativas com estado e log acionaveis;
  - `/status` permanece coerente com o ultimo evento efetivamente entregue (`lastNotifiedEvent`), sem ocultar falhas de entrega.
- Escopo:
  - definir politica explicita de reentrega (erros retentaveis, maximo de tentativas, intervalo/backoff);
  - implementar retry/bounded backoff no envio de `sendTicketFinalSummary`;
  - tornar observavel no estado do runner quando houver falha definitiva de entrega;
  - preservar emissao unica por ticket no core (sem duplicidade por caminhos de codigo concorrentes);
  - cobrir sucesso apos falha transitoria e falha definitiva em testes automatizados;
  - documentar politica e rastreabilidade em spec/README.
- Fora de escopo:
  - outbox persistente em disco para sobreviver a restart de processo;
  - drenagem garantida de notificacoes durante shutdown (`SIGINT`/`SIGTERM`), tratada no ticket filho `tickets/open/2026-02-27-runner-shutdown-may-drop-in-flight-telegram-notifications.md`;
  - paralelizacao de tickets (continua proibida).

## Progress
- [x] 2026-02-27 02:20Z - Leitura integral do ticket, referencias e codigo atual concluida.
- [x] 2026-02-27 02:29Z - Escopo, limites e criterios de aceite do plano consolidados.
- [x] 2026-02-27 03:31Z - Politica de retry/backoff implementada e instrumentada no envio Telegram.
- [x] 2026-02-27 03:31Z - Estado do runner atualizado para explicitar falha definitiva de notificacao.
- [x] 2026-02-27 03:31Z - Testes automatizados cobrindo transiente->sucesso, falha definitiva e ausencia de duplicidade.
- [ ] 2026-02-27 03:31Z - Documentacao atualizada; validacao manual em Telegram real permanece pendente nesta etapa.

## Surprises & Discoveries
- 2026-02-27 02:14Z - `publishTicketFinalSummary` (`src/core/runner.ts`) registra erro e segue fluxo sem mecanismo de reentrega.
- 2026-02-27 02:15Z - `sendTicketFinalSummary` (`src/integrations/telegram-bot.ts`) faz uma unica chamada a `sendMessage`, sem classificacao de erro transitorio.
- 2026-02-27 02:16Z - A suite atual (`src/core/runner.test.ts`) codifica esse comportamento: quando envio falha, `lastNotifiedEvent` permanece `null`.
- 2026-02-27 02:18Z - Existe ticket aberto de shutdown gracioso relacionado; misturar drain de desligamento neste escopo aumenta risco de deriva e deve ficar desacoplado.

## Decision Log
- 2026-02-27 - Decisao: manter assinatura publica principal (`onTicketFinalized(summary)`) e introduzir resiliencia no caminho de envio Telegram com retry/backoff bounded.
  - Motivo: reduzir impacto estrutural e entregar correção P0 rapidamente.
  - Impacto: alteracoes concentradas em `telegram-bot`, `runner` (observabilidade) e testes.
- 2026-02-27 - Decisao: classificar falhas em `retentavel` vs `nao retentavel`, com retry para 429, 5xx e erros de transporte transitorios (`ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, `ENETUNREACH`).
  - Motivo: equilibrar confiabilidade e evitar retries inutilmente longos em erros definitivos (ex.: 401/403/400).
  - Impacto: exige helper de classificacao e cobertura de testes por classe de erro.
- 2026-02-27 - Decisao: manter `lastNotifiedEvent` apenas para entrega confirmada e adicionar estado separado para falha definitiva de entrega.
  - Motivo: preservar contrato de `/status` para "ultimo evento efetivamente entregue" e, ao mesmo tempo, expor falhas acionaveis.
  - Impacto: atualizacao de `RunnerState`, renderizacao de `/status` e testes de status.
- 2026-02-27 - Decisao: adiar garantias de entrega durante desligamento para o ticket filho de shutdown.
  - Motivo: evitar acoplamento entre correção de retry em runtime e lifecycle global de encerramento.
  - Impacto: risco residual em restart abrupto fica explicitado como dependencia aberta.

## Outcomes & Retrospective
- Status final: execucao tecnica concluida nesta etapa, com validacoes automatizadas verdes.
- O que funcionou: retry/backoff bounded, estado dedicado de falha definitiva e cobertura automatizada dos cenarios criticos.
- O que ficou pendente: validacao manual em Telegram real (falha transitoria controlada) e fechamento operacional do ticket.
- Proximos passos: executar validacao manual no ambiente real e seguir para etapa de fechamento/versionamento do ticket.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - publica resumo final e atualiza `lastNotifiedEvent`.
  - `src/integrations/telegram-bot.ts` - envio de mensagem ao Telegram e renderizacao de `/status`.
  - `src/types/ticket-final-summary.ts` - contratos de resumo/delivery.
  - `src/types/state.ts` - estado observavel do runner.
  - `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` - cobertura automatizada do comportamento esperado.
  - `docs/specs/2026-02-19-telegram-run-status-notification.md` - contrato funcional de notificacao por ticket.
- Fluxo atual (as-is):
  - ticket finaliza -> `publishTicketFinalSummary` chama callback async;
  - callback envia uma unica vez ao Telegram;
  - falha no envio apenas gera log de erro; sem retry, sem estado explicito de falha definitiva.
- Restricoes tecnicas:
  - Node.js 20+ e TypeScript.
  - Arquitetura em camadas (`core`, `integrations`, `config`).
  - Fluxo sequencial por ticket deve permanecer inalterado.
  - Sem dependencia externa nova.
- Termos deste plano:
  - "falha transitoria": erro potencialmente recuperavel com nova tentativa (429/5xx/rede).
  - "falha definitiva": erro nao retentavel ou exaustao do limite de tentativas.
  - "evento efetivamente entregue": notificacao confirmada por retorno bem-sucedido de `sendMessage`.

## Plan of Work
- Milestone 1 - Politica de entrega confiavel e contrato observavel
  - Entregavel: politica formalizada (retentativa, limites e backoff) + tipo de estado para falha definitiva de notificacao.
  - Evidencia de conclusao: `runner` e `types` com campos explicitos de tentativa/falha; comentarios/logs com politica aplicada.
  - Arquivos esperados: `src/types/ticket-final-summary.ts`, `src/types/state.ts`, `src/core/runner.ts`.
- Milestone 2 - Retry/backoff no dispatch Telegram
  - Entregavel: `sendTicketFinalSummary` com retry bounded, classificacao de erro e logs por tentativa.
  - Evidencia de conclusao: envio transitorio recupera sem perda; erro definitivo encerra com contexto acionavel.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`.
- Milestone 3 - Coerencia de estado e `/status`
  - Entregavel: `/status` mostra ultimo evento entregue e tambem ultima falha definitiva de entrega (quando existir).
  - Evidencia de conclusao: resposta de status diferencia claramente sucesso entregue vs falha de entrega.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/state.ts`, `src/integrations/telegram-bot.ts`.
- Milestone 4 - Cobertura automatizada de confiabilidade
  - Entregavel: testes para (a) transiente->sucesso, (b) falha definitiva apos limite, (c) ausencia de duplicidade indevida por ticket.
  - Evidencia de conclusao: testes novos/verdes em `runner` e `telegram-bot`.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Documentacao e validacao manual
  - Entregavel: politica de retry documentada e evidenciada na spec e no README + roteiro de validacao em Telegram real.
  - Evidencia de conclusao: docs atualizadas e checklist manual registrado.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-run-status-notification.md`, `README.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "publishTicketFinalSummary|sendTicketFinalSummary|lastNotifiedEvent|buildStatusReply" src/core/runner.ts src/integrations/telegram-bot.ts` para confirmar pontos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` para incluir estado observavel de falha definitiva de notificacao (ticket, tentativas, ultimo erro, timestamp).
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/ticket-final-summary.ts` para incluir metadados de tentativas na entrega confirmada (quando aplicavel) e manter compatibilidade de contratos.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar em `src/integrations/telegram-bot.ts` um helper de classificacao de erro retentavel e loop de retry com backoff exponencial bounded (priorizando `retry_after` quando Telegram responder 429).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar logs de tentativa no `telegram-bot` com `ticket`, `attempt`, `maxAttempts`, `errorCode` e classe do erro.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.ts` para registrar sucesso em `lastNotifiedEvent` somente apos entrega confirmada e persistir falha definitiva no novo campo de estado.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.ts` (render de `/status`) para exibir ultimo evento entregue e, separadamente, ultima falha definitiva de notificacao quando houver.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.test.ts` com casos de retry: falha transitoria nas primeiras tentativas e sucesso final; falha definitiva nao retentavel; exaustao de tentativas.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.test.ts` para validar atualizacao de estado em sucesso de entrega, falha definitiva e preservacao de coerencia do `lastNotifiedEvent`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validacao focada.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa da suite.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-run-status-notification.md` e `README.md` com politica de retry (erros retentaveis, limite de tentativas, intervalo/backoff) e evidencias de aceite.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/types/state.ts src/types/ticket-final-summary.ts docs/specs/2026-02-19-telegram-run-status-notification.md README.md` para auditoria final dos artefatos.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run dev` e validar manualmente no Telegram real com falha transitoria controlada de rede durante fechamento de ticket, confirmando reentrega e estado coerente em `/status`.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: casos cobrem 429/5xx/transporte com retry e sucesso posterior; erro nao retentavel falha sem retries indevidos.
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: `lastNotifiedEvent` so muda em entrega confirmada; falha definitiva fica registrada em estado dedicado; sem duplicidade indevida de notificacao por ticket.
- Comando: `npm test`
  - Esperado: suite completa passa sem regressao dos comandos Telegram e fluxo de tickets.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erros.
- Comando: `npm run dev` + validacao manual no chat autorizado
  - Esperado: em falha transitoria controlada, mensagem final chega apos retentativa; em falha definitiva controlada, `/status` e logs exibem falha acionavel.
- Criterios de aceite do ticket cobertos:
  - falha transitoria seguida de sucesso com reentrega comprovada;
  - falha definitiva apos limite com sinalizacao explicita em estado/log;
  - `/status` coerente com ultimo evento entregue;
  - politica de retry documentada;
  - ausencia de duplicidade indevida por ticket em execucao normal.

## Idempotence and Recovery
- Idempotencia:
  - retries sao bounded por tentativa e nao alteram ordenacao do fluxo de tickets;
  - reexecucao da suite e dos comandos de validacao nao gera efeito colateral fora dos artefatos de teste.
- Riscos:
  - timeout de rede pode produzir ambiguidade de entrega (possivel duplicidade residual em condicao extrema de "resposta perdida apos entrega");
  - retry excessivo pode aumentar tempo de fechamento do ticket;
  - restart durante retries ainda pode descartar entrega em voo (dependencia do ticket de shutdown).
- Recovery / Rollback:
  - se houver regressao severa de latencia, reduzir imediatamente `maxAttempts`/janela de backoff para modo conservador no proprio codigo;
  - se houver comportamento inesperado de estado, reverter alteracoes de `runner`/`status` para ultimo contrato estavel e manter logs de erro;
  - se falhar validacao manual externa, manter ticket aberto com evidencia e registrar bloqueio operacional na spec/ticket.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-27-telegram-ticket-final-summary-delivery-reliability-gap.md`.
- Referencias obrigatorias consumidas:
  - `docs/specs/2026-02-19-telegram-run-status-notification.md`
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - `execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md`
  - `tickets/closed/2026-02-19-telegram-final-summary-per-ticket-gap.md`
  - `src/core/runner.ts` (trechos de `processTicketInSlot` e `publishTicketFinalSummary`)
  - `src/integrations/telegram-bot.ts` (`sendTicketFinalSummary`, `/status`)
  - `src/core/runner.test.ts` (caso atual de falha sem `lastNotifiedEvent`)
- Dependencia/follow-up relacionado:
  - `tickets/open/2026-02-27-runner-shutdown-may-drop-in-flight-telegram-notifications.md`.
- Evidencias esperadas para auditoria:
  - saida dos comandos de teste/check/build;
  - diff dos arquivos-alvo;
  - registro manual de validacao Telegram real.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `TelegramController.sendTicketFinalSummary` passa a aplicar politica de retry/backoff e pode reportar metadados de tentativa na entrega.
  - `RunnerState` ganha campo para ultima falha definitiva de notificacao, preservando `lastNotifiedEvent` como fonte canonica de entrega confirmada.
  - Renderizacao de `/status` incorpora secao de falha definitiva de notificacao.
- Compatibilidade:
  - comandos existentes (`/run_all`, `/run_specs`, `/run_ticket`, `/status`) mantidos;
  - sequencialidade de tickets por projeto preservada;
  - sem mudanca de protocolo externo do Telegram (continua `sendMessage`).
- Dependencias externas e mocks:
  - `telegraf` (Telegram API) e classificacao de erros por `error_code`/descricao;
  - testes com mocks de `sendMessage` e erros sinteticos (429/5xx/transporte), sem chamadas reais de rede;
  - dependencia operacional de validacao manual em Telegram real para aceite final.
