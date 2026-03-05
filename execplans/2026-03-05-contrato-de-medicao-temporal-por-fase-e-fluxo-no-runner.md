# ExecPlan - Contrato de medicao temporal por fase e por fluxo no runner

## Purpose / Big Picture
- Objetivo: estabelecer um contrato tipado e reutilizavel de medicao temporal por fase e por fluxo dentro do runner para `run-ticket`, `run-all` e `run_specs`.
- Resultado esperado:
  - cada fluxo alvo passa a produzir snapshot temporal estruturado com tempos por fase e tempo total;
  - snapshots sao transportados em contratos do core mesmo quando houver falha parcial;
  - sequencialidade dos tickets permanece inalterada.
- Escopo:
  - definir tipos de telemetria temporal no dominio (`src/types`) com semantica de sucesso e falha parcial;
  - instrumentar coleta e consolidacao no `src/core/runner.ts` para os tres fluxos alvo;
  - estender contratos de saida do runner usados por integracoes (`TicketFinalSummary` e evento de milestone de `run_specs`);
  - incluir cobertura automatizada para sucesso/falha com dados temporais.
- Fora de escopo:
  - formatacao textual final de mensagens no Telegram com novos campos temporais (ticket filho de apresentacao);
  - persistencia historica de metricas fora da memoria de execucao;
  - paralelizacao de tickets ou mudanca de regras de concorrencia.

## Progress
- [x] 2026-03-05 02:07Z - Leitura completa do ticket, spec e referencias tecnicas concluida.
- [x] 2026-03-05 02:07Z - Escopo do contrato temporal e fronteira com ticket filho de Telegram definidos.
- [x] 2026-03-05 02:26Z - Contratos tipados de medicao temporal implementados em `src/types`.
- [x] 2026-03-05 02:26Z - Coleta/consolidacao temporal nos fluxos `run-ticket`, `run-all` e `run_specs` implementada no runner.
- [x] 2026-03-05 02:26Z - Cobertura automatizada de sucesso/falha com snapshots temporais concluida.
- [x] 2026-03-05 02:26Z - Validacao final (test/check/build) concluida sem regressao.

## Surprises & Discoveries
- 2026-03-05 02:07Z - `runStage` e `runSpecStage` ja medem `durationMs`, mas apenas para log (`src/core/runner.ts:3656-3703`), sem contrato reaproveitavel.
- 2026-03-05 02:07Z - `buildSuccessSummary` e `buildFailureSummary` nao carregam tempos (`src/core/runner.ts:3526-3560`), e o tipo `TicketFinalSummary` nao possui campos para isso (`src/types/ticket-final-summary.ts:11-32`).
- 2026-03-05 02:07Z - O milestone de `run_specs` possui contrato funcional sem medicao temporal (`src/core/runner.ts:76-82`, `src/core/runner.ts:2669-2713`).
- 2026-03-05 02:07Z - `run-all` termina por estado/log, sem evento final consolidado de fluxo para integracao externa (`src/core/runner.ts:3034-3152`).

## Decision Log
- 2026-03-05 - Decisao: adotar um snapshot temporal canonico no core com `durationsByStageMs` + `totalDurationMs` + metadados de intervalo temporal (`startedAtUtc`/`finishedAtUtc`) para todos os fluxos alvo.
  - Motivo: reduzir ambiguidade entre logs ad-hoc e contratos usados por resumo final.
  - Impacto: alteracoes em tipos, runner e testes; integracoes passam a receber dados estruturados.
- 2026-03-05 - Decisao: em falha, expor medicoes parciais coletadas ate a interrupcao sem inventar duracoes de etapas nao executadas.
  - Motivo: atender RF-06/CA-04 com comportamento deterministico.
  - Impacto: contrato precisa diferenciar etapas concluidas e estagio de interrupcao.
- 2026-03-05 - Decisao: manter neste ticket apenas a fundacao de contrato/transporte no runner, deixando renderizacao textual no Telegram para o ticket filho `tickets/open/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`.
  - Motivo: evitar mistura de camadas e reduzir risco de regressao em entrega P0.
  - Impacto: possivel necessidade de placeholders/minimos ajustes de compatibilidade em testes de integracao.

## Outcomes & Retrospective
- Status final: executado.
- O que funcionou:
  - contrato temporal comum por fase/fluxo implementado para `run-ticket`, `run-all` e `run_specs`;
  - snapshots parciais em falha preservados em `TicketFinalSummary`, milestones e resumos de fluxo;
  - cobertura automatizada expandida e verde para cenarios de sucesso/falha dos tres fluxos.
- O que ficou pendente:
  - formatacao textual no Telegram com exposicao dos tempos (escopo do ticket filho de apresentacao).
- Proximos passos:
  - fechar o ticket filho `tickets/open/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md` para exibicao operacional dos tempos no bot.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - orquestracao dos fluxos `run-ticket`, `run-all` e `run_specs`; medicao atual existe apenas em logs.
  - `src/types/ticket-final-summary.ts` - contrato atual do resumo final por ticket (sem tempos).
  - `src/types/state.ts` - estado observado pelo bot e referencias de resumo/falha de notificacao.
  - `src/main.ts` - wiring dos handlers do runner para a integracao Telegram.
  - `src/integrations/telegram-bot.ts` - consumidor atual dos contratos de `TicketFinalSummary` e milestone de `run_specs`.
  - `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` - cobertura de contrato/comportamento.
- Fluxo atual (as-is):
  - `run-ticket` e tickets de `run-all`: cada etapa mede `durationMs` apenas para log; resumo final nao inclui tempos.
  - `run_specs`: fases de triagem medem `durationMs` em log; milestone enviado sem tempos.
  - `run-all`: rodada contabiliza duracao em logs de encerramento, sem contrato final estruturado.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript, arquitetura em camadas.
  - Sem adicionar dependencia externa.
  - Fluxo de tickets deve continuar sequencial.
- Termos deste plano:
  - "snapshot temporal": estrutura tipada com duracoes por fase, total e intervalo temporal do fluxo.
  - "falha parcial": encerramento com erro apos executar apenas parte das fases previstas.
  - "fluxo": execucao completa de um comando alvo (`run-ticket`, `run-all`, `run_specs`).

## Plan of Work
- Milestone 1 - Contrato temporal canonico em `src/types`
  - Entregavel: tipos compartilhados para tempos por fase/total aplicaveis aos tres fluxos, com semantica de falha parcial.
  - Evidencia de conclusao: tipos compilam e sao referenciados por `TicketFinalSummary`, eventos de `run_specs` e eventuais novos contratos de fluxo.
  - Arquivos esperados:
    - `src/types/ticket-final-summary.ts`
    - `src/types/state.ts`
    - `src/core/runner.ts`
    - `src/main.ts`
- Milestone 2 - Coleta e consolidacao temporal no runner
  - Entregavel: acumuladores temporais por fase integrados aos fluxos `run-ticket`, `run-all` e `run_specs`, com total consolidado e dados parciais em falha.
  - Evidencia de conclusao: objetos finais emitidos pelo runner carregam tempos coerentes com fases executadas.
  - Arquivos esperados:
    - `src/core/runner.ts`
- Milestone 3 - Transporte do contrato para integracoes
  - Entregavel: contratos emitidos pelo runner incluem snapshot temporal estruturado para consumo externo, sem mudar regra sequencial.
  - Evidencia de conclusao: handlers (`onTicketFinalized`/milestones de `run_specs` e eventual callback final de fluxo) recebem payload com tempos.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/main.ts`
    - `src/integrations/telegram-bot.ts` (apenas compatibilidade de contrato, sem redesign de mensagem)
- Milestone 4 - Cobertura automatizada de sucesso/falha com tempos
  - Entregavel: testes cobrindo snapshots temporais em sucesso e falha para `run-ticket`, `run-all` e `run_specs`.
  - Evidencia de conclusao: suites focadas passam validando tempos por fase/total e dados parciais em interrupcao.
  - Arquivos esperados:
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 5 - Validacao de regressao e rastreabilidade
  - Entregavel: check/build/test verdes e diff final auditavel com contratos atualizados.
  - Evidencia de conclusao: comandos de validacao sem erro e artefatos listados no plano.
  - Arquivos esperados:
    - artefatos de saida de comando + diff dos arquivos acima.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "runStage|runSpecStage|buildSuccessSummary|buildFailureSummary|emitRunSpecsTriageMilestone|runForever|runSpecsAndRunAll"` em `src/core/runner.ts` para confirmar pontos de instrumentacao e emissao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Definir/ajustar tipos de snapshot temporal em `src/types/ticket-final-summary.ts` (e arquivos de tipo relacionados, se necessario) para suportar `durationsByStageMs`, `totalDurationMs`, intervalo temporal e semantica de falha parcial.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `RunSpecsTriageLifecycleEvent` em `src/core/runner.ts` para incluir snapshot temporal de triagem da spec.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar `processTicketInSlot`/`runStage` para acumular duracao por fase e anexar snapshot ao `TicketFinalSummary` de sucesso e falha.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar `runForever` para consolidar snapshot temporal da rodada `run-all` (incluindo total e dados parciais quando interrompido por falha) e disponibilizar contrato emitivel para integracao.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar `runSpecsAndRunAll`/`runSpecStage` para consolidar snapshot temporal da triagem e do fluxo composto (`run_specs` + eventual `run-all` encadeado), preservando dados coletados em erro.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar wiring em `src/main.ts` para transportar novos contratos/eventos temporais ao consumidor de integracao sem quebrar fluxo existente.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar ajustes minimos de compatibilidade em `src/integrations/telegram-bot.ts` para aceitar contratos enriquecidos (sem alterar escopo de formatacao final deste ticket).
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios de:
   - `run-ticket` sucesso/falha com tempos por fase + total;
   - `run-all` sucesso e interrupcao por falha com snapshot parcial;
   - `run_specs` sucesso/falha com snapshot temporal no milestone/finalizacao de fluxo.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` apenas para compatibilidade de tipos/contratos recebidos.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada de contrato.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/core/runner.test.ts src/main.ts src/types/ticket-final-summary.ts src/types/state.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: testes validam que `TicketFinalSummary` e eventos de `run_specs` carregam tempos por fase e total em sucesso e falha parcial.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: suite permanece verde com contratos enriquecidos, sem quebra de envio/notificacao.
- Comando: `npm test`
  - Esperado: regressao completa sem falhas.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e compilacao sem erros.
- Criterios de aceite do ticket cobertos:
  - existe contrato tipado de tempo por fase e total para `run-ticket`, `run-all` e `run_specs`;
  - em falha, contrato preserva medicoes coletadas ate a interrupcao;
  - sequencialidade de tickets permanece inalterada;
  - cobertura automatizada valida cenarios de sucesso e falha com dados temporais.

## Idempotence and Recovery
- Idempotencia:
  - coleta temporal deve ser restrita ao ciclo corrente (por ticket/rodada/spec), evitando acumulacao entre execucoes distintas;
  - reexecutar testes/comandos de validacao nao deve gerar efeito colateral funcional.
- Riscos:
  - dupla contagem de tempo ao reutilizar medicao em mais de um nivel (fase, ticket, fluxo composto);
  - contrato temporal obrigatorio pode quebrar consumidores se campos forem introduzidos sem compatibilidade minima;
  - inconsistencias entre `Date.now()` em pontos diferentes podem gerar totais divergentes de somatorio por fase.
- Recovery / Rollback:
  - se houver regressao de contrato, reverter para tipos anteriores e reintroduzir campos novos como opcionais ate estabilizar testes;
  - se houver divergencia de medicao, manter log atual e reduzir mudanca para apenas um fluxo por vez (ticket -> run-all -> run_specs);
  - se surgirem bloqueios de escopo em Telegram, manter este ticket no core e abrir follow-up especifico de adaptacao de integracao.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md`
- Spec de referencia:
  - `docs/specs/2026-03-05-medicao-de-tempo-por-prompt-fase-na-execucao-de-tickets-e-specs.md`
- Ticket filho dependente de apresentacao:
  - `tickets/open/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
- Referencias tecnicas consumidas no planejamento:
  - `src/core/runner.ts:76-82`
  - `src/core/runner.ts:2649-2717`
  - `src/core/runner.ts:3034-3152`
  - `src/core/runner.ts:3526-3560`
  - `src/core/runner.ts:3656-3703`
  - `src/types/ticket-final-summary.ts:11-32`
  - `src/core/runner.test.ts:573-583`
  - `src/integrations/telegram-bot.ts:4548-4590`
  - `src/integrations/telegram-bot.test.ts:1278-1305`
  - `src/integrations/telegram-bot.test.ts:4223-4248`

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `TicketFinalSummary` (e variantes) para incluir snapshot temporal por fase/total.
  - `RunSpecsTriageLifecycleEvent` para incluir snapshot temporal de triagem.
  - Contrato de encerramento de `run-all`/`run_specs` no runner (novo tipo/callback, se necessario para transporte).
  - `RunnerState` somente se for necessario refletir novo contrato em observabilidade de estado.
- Compatibilidade:
  - manter comandos e fluxo sequencial existentes (`/run_ticket`, `/run_all`, `/run_specs`);
  - nao remover campos atuais de contratos publicos; evoluir com extensao aditiva quando possivel.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - testes continuam com mocks locais de codex/git/telegram;
  - acoplamento principal entre `core/runner`, `main` (wiring) e `integrations/telegram-bot`.
