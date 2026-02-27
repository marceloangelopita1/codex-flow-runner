# ExecPlan - Shutdown gracioso para nao perder notificacoes finais em voo no Telegram

## Purpose / Big Picture
- Objetivo: garantir que o processo execute um shutdown gracioso com drenagem limitada, reduzindo perda de notificacoes finais por ticket quando chegar `SIGINT`/`SIGTERM`.
- Resultado esperado:
  - novas execucoes sao bloqueadas no inicio do shutdown;
  - trabalho em voo (principalmente envio de resumo final) ganha janela de conclusao com timeout configuravel;
  - logs finais deixam explicito o que foi drenado com sucesso e o que ficou pendente por timeout;
  - encerramento continua previsivel em ambiente `systemd` no WSL.
- Escopo:
  - introduzir API de shutdown assincrono no runner com estrategia de drain bounded;
  - atualizar wiring de sinais em `src/main.ts` para aguardar drain antes de `process.exit`;
  - manter entrega de notificacao final como parte do caminho drenado;
  - adicionar cobertura automatizada para cenarios de shutdown durante ticket em fechamento;
  - atualizar documentacao operacional (`README` e `docs/systemd/codex-flow-runner.service`).
- Fora de escopo:
  - outbox persistente em disco para sobreviver a crash/kill -9;
  - garantia absoluta de entrega em qualquer falha externa do Telegram;
  - paralelizacao de tickets (fluxo sequencial permanece inalterado).

## Progress
- [x] 2026-02-27 03:50Z - Planejamento inicial concluido (ticket, PLANS, spec, codigo e referencias revisados).
- [x] 2026-02-27 04:00Z - Contrato de shutdown gracioso no runner implementado com timeout de drenagem.
- [x] 2026-02-27 04:00Z - Wiring de sinais em `main.ts` atualizado para aguardar drain antes do exit.
- [x] 2026-02-27 04:00Z - Cobertura automatizada de shutdown em voo adicionada e validada.
- [x] 2026-02-27 04:00Z - Documentacao operacional atualizada com comportamento de parada graciosa.

## Surprises & Discoveries
- 2026-02-27 03:50Z - `src/main.ts` encerra com `runner.shutdown(); await telegram.stop(); process.exit(0);`, sem `await` de drain de loops/notificacoes.
- 2026-02-27 03:50Z - `shutdown()` no runner e sincrono e dispara finalizacoes interativas com `void`, sem contrato de conclusao observavel para o chamador.
- 2026-02-27 03:50Z - `publishTicketFinalSummary` e async e pode estar em voo quando sinal chega; sem drain explicito, o `exit` pode interromper tentativas finais.
- 2026-02-27 03:50Z - O ticket pai de confiabilidade (`...delivery-reliability-gap`) ja esta fechado em `tickets/closed/`, reforcando que este ticket deve focar apenas em lifecycle de shutdown.

## Decision Log
- 2026-02-27 - Decisao: evoluir para shutdown gracioso em duas fases (freeze de entrada + drain bounded de execucoes em voo).
  - Motivo: reduzir perda de notificacao sem bloquear indefinidamente o processo.
  - Impacto: altera `runner` e `main`, com testes novos de timeout e sucesso no drain.
- 2026-02-27 - Decisao: tornar timeout de drain configuravel por ambiente (com default seguro).
  - Motivo: ajustar operacao em ambientes com latencia variavel (local vs systemd).
  - Impacto: altera `src/config/env.ts`, `src/config/env.test.ts`, README e docs de service.
- 2026-02-27 - Decisao: manter logs estruturados de fechamento com status do drain (entregue, timeout, falha).
  - Motivo: atender necessidade operacional de diagnostico pos-sinal.
  - Impacto: novas mensagens e campos de contexto no logger de `runner`/`main`.

## Outcomes & Retrospective
- Status final: concluido com classificacao tecnica `GO`.
- O que funcionou: contrato de shutdown ficou idempotente e aguardavel, com logs de drain e bloqueio de novas execucoes durante encerramento.
- O que ficou pendente: validacao manual externa em Telegram real durante `SIGTERM` com ticket em voo (pendencia operacional, nao bloqueante para aceite tecnico).
- Proximos passos: concluir validacao operacional em ambiente real e registrar evidencias de chat/log.

## Context and Orientation
- Arquivos principais:
  - `src/main.ts` - tratamento de sinais e ordem de encerramento do processo.
  - `src/core/runner.ts` - lifecycle de slots, tickets e publicacao de resumo final.
  - `src/integrations/telegram-bot.ts` - stop do bot e envio de notificacoes finais.
  - `src/config/env.ts` e `src/config/env.test.ts` - configuracao de timeout de shutdown.
  - `src/core/runner.test.ts` - melhor ponto para cobrir drain/timeout em shutdown.
  - `README.md` e `docs/systemd/codex-flow-runner.service` - orientacao operacional de parada.
- Fluxo atual (as-is): sinal -> `runner.shutdown()` sincrono -> `telegram.stop()` -> `process.exit(0)`.
- Restricoes tecnicas:
  - Node.js 20+ com TypeScript.
  - fluxo sequencial de tickets deve ser preservado.
  - sem novas dependencias externas.
- Termos deste plano:
  - `freeze`: impedir novos trabalhos e iniciar encerramento controlado.
  - `drain bounded`: aguardar conclusao de trabalho em voo por janela maxima de tempo.
  - `in-flight notification`: envio de resumo final iniciado, mas ainda nao concluido.

## Plan of Work
- Milestone 1 - Contrato de shutdown gracioso no runner
  - Entregavel: API assincrona de shutdown com relatorio de drain (sucesso/timeout/falhas) e janela configuravel.
  - Evidencia de conclusao: `runner` expoe metodo aguardavel para shutdown, sem depender de `void` fire-and-forget.
  - Arquivos esperados: `src/core/runner.ts`, possivel ajuste em `src/types/state.ts` se houver novo estado observavel.
- Milestone 2 - Wiring de sinais com await de drain no bootstrap
  - Entregavel: `main.ts` aguarda drain do runner antes de parar Telegram e sair do processo; tratamento idempotente para sinais repetidos.
  - Evidencia de conclusao: logs mostram inicio/fim de drain com resultado objetivo e sem encerramento prematuro.
  - Arquivos esperados: `src/main.ts`.
- Milestone 3 - Cobertura automatizada de cenarios criticos
  - Entregavel: testes cobrindo shutdown durante fechamento de ticket/notificacao, incluindo caminho de timeout.
  - Evidencia de conclusao: testes validam que notificacao final e aguardada no caminho feliz e que timeout e explicitado no caminho degradado.
  - Arquivos esperados: `src/core/runner.test.ts` (e outros testes se necessario).
- Milestone 4 - Configuracao e operacao
  - Entregavel: variavel de ambiente para timeout de drain e alinhamento com comportamento de parada no `systemd`.
  - Evidencia de conclusao: parser/env/testes aceitam default e override; docs orientam ajuste operacional.
  - Arquivos esperados: `src/config/env.ts`, `src/config/env.test.ts`, `README.md`, `docs/systemd/codex-flow-runner.service`.
- Milestone 5 - Auditoria final e criterios do ticket
  - Entregavel: validacao completa e checklist de aceite do ticket evidenciado por comandos.
  - Evidencia de conclusao: suite verde, logs coerentes e documentacao atualizada.
  - Arquivos esperados: artefatos alterados dos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "shutdown\(|publishTicketFinalSummary|loopPromise|process.on\(\"SIG" src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts` para confirmar pontos exatos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/config/env.ts` para incluir `SHUTDOWN_DRAIN_TIMEOUT_MS` (inteiro positivo com default explicito).
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/config/env.test.ts` para cobrir default, override valido e validacao de valor invalido para o timeout de drain.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/core/runner.ts` para expor metodo assincrono de shutdown gracioso que: (a) bloqueia novas execucoes, (b) sinaliza parada dos slots, (c) aguarda drains relevantes, (d) retorna resultado estruturado.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir que finalizacoes de sessoes interativas (`/plan_spec` e `/codex_chat`) entrem no mesmo contrato aguardavel de shutdown (sem `void` solto).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Incluir timeout bounded no drain do runner (`Promise.race` ou estrategia equivalente) com logging de expiracao e pendencias remanescentes.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/main.ts` para usar o novo shutdown assincrono, com guarda para sinais repetidos e ordem de encerramento: drain runner -> stop Telegram -> `process.exit`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar logs finais de shutdown em `main.ts`/`runner.ts` com campos observaveis (`signal`, `timeoutMs`, `timedOut`, `pendingTasks`, `durationMs`).
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes em `src/core/runner.test.ts` para validar que shutdown aguardara resumo final em voo antes de concluir (caminho sucesso).
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes em `src/core/runner.test.ts` para validar caminho de timeout do drain sem bloqueio indefinido.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario, adicionar teste de idempotencia para sinais repetidos no contrato de shutdown (segunda chamada nao duplica fluxo).
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/config/env.test.ts` para validacao focada.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` e `docs/systemd/codex-flow-runner.service` com comportamento de shutdown gracioso e tuning de timeout.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/main.ts src/core/runner.ts src/core/runner.test.ts src/config/env.ts src/config/env.test.ts src/integrations/telegram-bot.ts README.md docs/systemd/codex-flow-runner.service` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cobertura explicita de shutdown durante ticket em voo, com caso de drain concluido e caso de timeout.
- Comando: `npx tsx --test src/config/env.test.ts`
  - Esperado: `SHUTDOWN_DRAIN_TIMEOUT_MS` validado com default/override e rejeicao de valor invalido.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao no fluxo sequencial e nos comandos Telegram.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erros.
- Comando: `rg -n "SHUTDOWN_DRAIN_TIMEOUT_MS|shutdown gracioso|TimeoutStopSec|drain" README.md docs/systemd/codex-flow-runner.service src/main.ts src/core/runner.ts`
  - Esperado: comportamento e configuracao de shutdown documentados e implementados de forma rastreavel.
- Criterios de aceite do ticket cobertos:
  - mecanismo de drain com timeout para notificacoes finais pendentes durante shutdown;
  - cobertura automatizada para sinal durante fechamento de ticket;
  - logs finais distinguindo entrega, timeout/abandono e falha definitiva;
  - documentacao operacional atualizada.

## Idempotence and Recovery
- Idempotencia:
  - chamadas repetidas de shutdown durante o mesmo encerramento devem retornar o mesmo estado final sem iniciar novo drain concorrente;
  - reexecucao dos testes/comandos de validacao nao gera efeitos colaterais fora da suite.
- Riscos:
  - etapa do Codex pode ficar presa e consumir a janela de drain inteira;
  - timeout curto demais pode manter risco residual de perda em ambiente lento;
  - timeout longo demais pode conflitar com politica de stop do `systemd`.
- Recovery / Rollback:
  - se houver regressao de encerramento, manter fallback controlado para shutdown imediato com log explicito de degradacao;
  - ajustar timeout via env sem necessidade de novo deploy estrutural;
  - em falha critica, reverter alteracoes de shutdown para ultimo comportamento estavel e manter ticket/follow-up com evidencias.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-27-runner-shutdown-may-drop-in-flight-telegram-notifications.md`.
- Referencias consumidas neste planejamento:
  - `PLANS.md`
  - `docs/specs/2026-02-19-telegram-run-status-notification.md`
  - `docs/systemd/codex-flow-runner.service`
  - `tickets/closed/2026-02-27-telegram-ticket-final-summary-delivery-reliability-gap.md`
  - `src/main.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/config/env.ts`
  - `src/core/runner.test.ts`
  - `src/config/env.test.ts`
- Evidencias registradas para auditoria:
  - `npx tsx --test src/core/runner.test.ts src/config/env.test.ts` -> pass (`77/77`);
  - `npm test` -> pass (`269/269`);
  - `npm run check` e `npm run build` -> pass;
  - diff consolidado nos arquivos de lifecycle/config/docs e testes.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `TicketRunner` deve expor contrato de shutdown aguardavel com resultado estruturado de drain.
  - `AppEnv` deve incluir timeout de drain de shutdown.
  - `main.ts` passa a depender do novo contrato assincrono de shutdown.
- Compatibilidade:
  - comandos e fluxo sequencial de tickets permanecem inalterados no caminho normal (sem sinal);
  - comportamento em shutdown muda de "encerrar rapido" para "encerrar com drain bounded".
- Dependencias externas e mocks:
  - envio Telegram continua via `telegraf`/`sendMessage` existente;
  - testes usam stubs/mocks locais, sem chamadas reais de rede;
  - operacao no `systemd` depende de `TimeoutStopSec` coerente com `SHUTDOWN_DRAIN_TIMEOUT_MS`.
