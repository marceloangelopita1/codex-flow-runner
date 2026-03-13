# ExecPlan - Resumos finais de run_all e run_specs com preferencias do Codex

## Purpose / Big Picture
- Objetivo: incluir, nos resumos finais de `run_all` e `run_specs`, informacoes de qual modelo, `reasoning effort` e velocidade do Codex foram realmente utilizados na rodada.
- Resultado esperado:
  - o resumo final de fluxo enviado ao Telegram para `run_all` exibe um bloco curto com `model`, `reasoning effort` e velocidade;
  - o resumo final de fluxo enviado ao Telegram para `run_specs` exibe o mesmo bloco, refletindo o snapshot congelado para toda a execucao encadeada;
  - o contrato tipado de `RunnerFlowSummary` passa a carregar esse snapshot de preferencias aplicadas, permitindo rastreabilidade e testes deterministas;
  - a informacao mostrada no resumo final corresponde ao que o slot realmente usou, e nao ao valor corrente do projeto no momento da notificacao.
- Escopo:
  - evoluir os tipos de resumo final de fluxo para incluir snapshot compacto das preferencias do Codex;
  - persistir esse snapshot no ciclo do runner a partir do freeze por slot ja existente para `run_all` e `run_specs`;
  - renderizar o bloco de preferencias no resumo final do Telegram;
  - ajustar testes automatizados e, se necessario, a documentacao visivel ao operador.
- Fora de escopo:
  - alterar o resumo final por ticket;
  - alterar milestone intermediaria de triagem de `run_specs`;
  - mudar comandos `/models`, `/reasoning` ou `/speed`;
  - introduzir historico persistente de preferencias por execucao fora do payload ja emitido pelo runner.

## Progress
- [x] 2026-03-13 19:56Z - Planejamento inicial, leitura do padrao `PLANS.md` e levantamento do gap no runner/Telegram concluidos.
- [x] 2026-03-13 20:00Z - Contrato de resumo de fluxo, plumbing do snapshot no runner e fix de `speed` em `src/main.ts` implementados.
- [x] 2026-03-13 20:01Z - Renderizacao Telegram e testes direcionados de runner/Telegram concluidos.
- [x] 2026-03-13 20:03Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-03-13 19:56Z - `src/types/flow-timing.ts` carrega tempos, projeto e motivos de encerramento, mas nao carrega nenhum snapshot de `model`, `reasoningEffort` ou `speed` em `RunAllFlowSummary` e `RunSpecsFlowSummary`.
- 2026-03-13 19:56Z - `src/integrations/telegram-bot.ts` ja sabe renderizar velocidade por label (`Standard`/`Fast`), mas `buildRunFlowSummaryMessage` hoje nao consulta nem recebe preferencias do Codex.
- 2026-03-13 19:56Z - `src/core/runner.ts` ja faz freeze das preferencias por slot antes de `run_all` e `run_specs`, registra isso em log e troca o `codexClient` por uma versao fixa, porem esse snapshot nao e mantido no contrato do resumo final.
- 2026-03-13 19:56Z - `src/main.ts` ainda devolve para o `CodexCliTicketFlowClient` apenas `model` e `reasoningEffort` no `resolveInvocationPreferences` do runner, omitindo `speed`; isso precisa ser corrigido para que "velocidade utilizada" seja rastreavel e fiel.
- 2026-03-13 19:56Z - `README.md` ja afirma que o runner "congela um snapshot por slot durante `/run_all`, `/run_specs` e execucao unitaria de ticket"; o resumo final deve refletir esse contrato ja prometido.
- 2026-03-13 20:03Z - `npm test` apresentou uma falha intermitente preexistente em `requestRunAll permite processar ticket com ate 3 recuperacoes de NO_GO na linhagem`; o rerun imediato passou integralmente, indicando flakiness e nao regressao deterministica desta entrega.

## Decision Log
- 2026-03-13 - Decisao: mostrar no resumo final o snapshot congelado por slot, e nao resolver preferencias novamente no momento do envio.
  - Motivo: o operador pediu "qual modelo, reasoning effort e velocidade foram utilizados"; isso exige refletir a rodada executada, mesmo que o projeto mude de preferencia depois.
  - Impacto: o runner precisa carregar no payload final um snapshot pequeno e imutavel das preferencias aplicadas.
- 2026-03-13 - Decisao: usar um snapshot compacto de execucao (`model`, `reasoningEffort`, `speed`) em vez de reutilizar `CodexResolvedProjectPreferences`.
  - Motivo: o resumo final precisa mostrar "o que foi usado", nao metadados de origem, display name, allowlist ou ajustes de resolucao.
  - Impacto: a mudanca de contrato fica pequena, tipada e desacoplada da UX de `/status`.
- 2026-03-13 - Decisao: renderizar o bloco de preferencias uma unica vez no topo da mensagem de resumo de fluxo.
  - Motivo: `run_specs` ja carrega `runAllSummary` aninhado; repetir o mesmo trio de dados em varios trechos aumentaria ruido sem agregar rastreabilidade.
  - Impacto: o payload aninhado pode continuar completo para consumidores futuros, mas o texto do Telegram permanece enxuto.
- 2026-03-13 - Decisao: corrigir junto o plumbing de `speed` em `src/main.ts`.
  - Motivo: sem isso, a nova linha de "velocidade utilizada" pode exibir dado incompleto ou mascarar que o runner das rodadas nao estava recebendo a preferencia completa.
  - Impacto: o escopo passa a incluir um ajuste pequeno, mas necessario, na montagem do `CodexCliTicketFlowClient` para rodadas.
- 2026-03-13 - Decisao: manter `codexPreferences` opcional no contrato de resumo de fluxo e exibir `snapshot indisponivel` quando faltar.
  - Motivo: preservar compatibilidade defensiva com clientes/stubs que ainda possam devolver `snapshotInvocationPreferences()` nulo, sem esconder o problema do operador.
  - Impacto: o caminho normal exibe o snapshot completo; em cenarios degradados, o resumo final continua legivel e honestamente sinaliza a ausencia do snapshot.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada.
- O que funcionou:
  - o runner passou a anexar ao `RunnerFlowSummary` o snapshot efetivamente congelado para a rodada;
  - `src/main.ts` passou a propagar `speed`, corrigindo a fidelidade entre preferencia selecionada e preferencia realmente usada nas rodadas;
  - o Telegram passou a exibir `model`, `reasoning` e velocidade nos resumos finais de `run_all` e `run_specs`;
  - testes direcionados e validacoes finais ficaram verdes.
- O que ficou pendente:
  - validacao manual em Telegram real continua recomendada para confirmar o wording final em ambiente operacional.
- Proximos passos:
  - executar smoke manual de `/run_all` e `/run_specs` em um chat real, se desejado.

## Context and Orientation
- Arquivos principais:
  - `src/types/flow-timing.ts` - contrato de `RunAllFlowSummary`, `RunSpecsFlowSummary` e `RunnerFlowSummary`.
  - `src/types/codex-preferences.ts` - tipos base de preferencias do Codex; candidato natural para um snapshot compacto reutilizavel.
  - `src/core/runner.ts` - freeze por slot em `prepareRoundSlotForRun`, builders de resumo final de fluxo e clones de estado.
  - `src/integrations/telegram-bot.ts` - `buildRunFlowSummaryMessage` e helper `renderCodexSpeedLabel`.
  - `src/main.ts` - wiring do `resolveInvocationPreferences` para rodadas do runner.
  - `src/core/runner.test.ts` - coleta e asserts de `RunnerFlowSummary` em cenarios de `run_all` e `run_specs`.
  - `src/integrations/telegram-bot.test.ts` - fixtures e asserts textuais do resumo final de fluxo.
- Fluxo atual:
  - `requestRunAll` e `requestRunSpecs` resolvem dependencias, autenticam, fazem snapshot das preferencias e congelam o `codexClient` por slot;
  - ao fim do fluxo, `runner` emite `RunnerFlowSummary`;
  - `TelegramController.sendRunFlowSummary` envia o texto final, mas hoje so inclui projeto, resultado, motivo e tempos.
- Restricoes tecnicas:
  - manter o fluxo sequencial de tickets e specs;
  - nao adicionar dependencias novas;
  - preservar a separacao em camadas (`src/core`, `src/integrations`, `src/types`, `src/config`);
  - evitar mostrar preferencias "ao vivo" se elas puderem divergir do snapshot usado pelo slot.

## Plan of Work
- Milestone 1 - Materializar o snapshot aplicado ao fluxo
  - Entregavel: existe um tipo compacto para preferencias efetivamente usadas pelo fluxo e ele passa a integrar `RunAllFlowSummary` e `RunSpecsFlowSummary`.
  - Evidencia de conclusao: testes do runner passam a observar `model`, `reasoningEffort` e `speed` no payload emitido.
  - Arquivos esperados:
    - `src/types/codex-preferences.ts`
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
- Milestone 2 - Garantir fidelidade do snapshot congelado
  - Entregavel: o runner propaga para o resumo final exatamente o snapshot congelado no inicio da rodada, incluindo velocidade.
  - Evidencia de conclusao: cenarios de `run_all` e `run_specs` mostram o mesmo snapshot no resumo final, mesmo com fluxo encadeado.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/main.ts`
    - `src/core/runner.test.ts`
- Milestone 3 - Exibir preferencias no resumo final do Telegram
  - Entregavel: `buildRunFlowSummaryMessage` passa a renderizar um bloco curto e deterministico com modelo, reasoning e velocidade.
  - Evidencia de conclusao: testes textuais de `run_all` e `run_specs` validam a nova linha no resumo final.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 4 - Fechar validacao e documentacao
  - Entregavel: suite automatizada verde e documentacao minima alinhada ao comportamento final, se a mudanca for exposta ao operador.
  - Evidencia de conclusao: `npm test`, `npm run check` e `npm run build` verdes; diff final restrito ao escopo.
  - Arquivos esperados:
    - `README.md` (se necessario)
    - artefatos de validacao

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RunAllFlowSummary|RunSpecsFlowSummary|buildRunFlowSummaryMessage|snapshotInvocationPreferences|resolveInvocationPreferences" src` para reconfirmar todos os pontos de contrato e de renderizacao afetados.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/codex-preferences.ts` para introduzir um tipo compacto de preferencias aplicadas ao fluxo, com `model`, `reasoningEffort` e `speed` obrigatorio.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/flow-timing.ts` para adicionar esse snapshot ao contrato de `RunAllFlowSummary` e `RunSpecsFlowSummary`, mantendo `RunnerFlowSummary` consistente.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para:
   - armazenar no slot o snapshot congelado usado na rodada;
   - normalizar `speed` para `standard` quando o snapshot herdado vier sem esse campo;
   - anexar o snapshot a `buildRunAllFlowSummary`, `buildRunSpecsFlowSummary` e aos helpers de clone;
   - limpar o snapshot ao liberar o slot.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` para incluir `speed: resolved.speed` no `resolveInvocationPreferences` usado pelas rodadas do runner, garantindo coerencia entre o que o Codex recebe e o que o resumo final reporta.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para renderizar, em `buildRunFlowSummaryMessage`, uma linha como `Codex utilizado: <model> | reasoning <effort> | velocidade <label>` antes dos blocos de tempo.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` cobrindo pelo menos:
   - `run_all` com sucesso;
   - `run_all` com falha;
   - `run_specs` com sucesso;
   - `run_specs` com falha na triagem ou no `run-all` encadeado;
   - presenca do snapshot correto tambem em `runAllSummary` aninhado quando existir.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para que as fixtures de `RunAllFlowSummary` e `RunSpecsFlowSummary` tragam o novo snapshot e os asserts confirmem a nova linha textual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se o comportamento final ficar explicito para o operador, atualizar `README.md` para dizer que o resumo final de `run_all` e `run_specs` mostra o snapshot de modelo/reasoning/velocidade usado na rodada.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao direcionada do contrato e do texto.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para validar tipagem e compatibilidade de contratos.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run build` para validar compilacao.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/types/codex-preferences.ts src/types/flow-timing.ts src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts README.md` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado:
    - `RunnerFlowSummary` de `run_all` e `run_specs` passa a carregar `model`, `reasoningEffort` e `speed`;
    - o resumo final de `run_all` no Telegram inclui a nova linha de preferencias;
    - o resumo final de `run_specs` no Telegram inclui a nova linha de preferencias;
    - cenarios de falha continuam exibindo tempos e agora tambem o snapshot do Codex utilizado.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao em fluxos de ticket, specs, Telegram e preferencias do Codex.
- Comando: `npm run check`
  - Esperado: sem erros de tipo apos evolucao do contrato de `RunnerFlowSummary`.
- Comando: `npm run build`
  - Esperado: build concluida com sucesso.
- Evidencias funcionais adicionais:
  - apos selecionar `model`, `reasoning` e `speed`, um `/run_all` exibe no resumo final exatamente esses valores congelados para a rodada;
  - em `/run_specs`, o bloco exibido no resumo final corresponde ao mesmo snapshot usado tanto na triagem quanto no `run-all` encadeado;
  - se as preferencias do projeto mudarem no meio da execucao, o resumo final ainda mostra o snapshot da rodada iniciada, nao o valor atual.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os testes e checks nao altera tickets, specs nem preferencias persistidas;
  - a nova renderizacao de resumo depende apenas do payload emitido pelo runner, sem side effects adicionais.
- Riscos:
  - usar preferencias correntes do projeto em vez do snapshot congelado e exibir resumo enganoso;
  - quebrar compatibilidade de clones/estado ao evoluir `RunnerFlowSummary`;
  - continuar omitindo `speed` no bootstrap das rodadas e reportar velocidade incorreta;
  - duplicar informacao visual em `run_specs` caso o builder repita o mesmo snapshot em bloco principal e resumo aninhado.
- Recovery / Rollback:
  - se a evolucao de contrato gerar regressao ampla, introduzir o novo campo primeiro como opcional, estabilizar builders/testes e so depois endurecer para obrigatorio;
  - se houver divergencia entre snapshot e resumo, priorizar rollback localizado em `src/integrations/telegram-bot.ts` enquanto o payload tipado do runner e corrigido;
  - se o problema vier do wiring de `main.ts`, restaurar o fluxo anterior e manter o bloco textual escondido ate que a preferencia de velocidade esteja corretamente entregue ao `CodexCliTicketFlowClient`.

## Artifacts and Notes
- Pedido que originou esta iteracao:
  - incluir, nos resumos finais de `run_all` e `run_specs`, modelo, `reasoning effort` e velocidade utilizados.
- ExecPlans relacionados:
  - `execplans/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
  - `execplans/2026-03-13-selecao-de-velocidade-do-codex-via-telegram.md`
- Specs relacionadas:
  - `docs/specs/2026-03-05-medicao-de-tempo-por-prompt-fase-na-execucao-de-tickets-e-specs.md`
  - `docs/specs/2026-03-13-selecao-dinamica-de-modelo-e-reasoning-do-codex-via-telegram.md`
- Referencias locais observadas no planejamento:
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/types/flow-timing.ts`
  - `src/types/codex-preferences.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunAllFlowSummary`, `RunSpecsFlowSummary` e, por consequencia, `RunnerFlowSummary`;
  - possivel novo tipo compacto em `src/types/codex-preferences.ts` para snapshot de execucao;
  - builders/clones de resumo no `TicketRunner`;
  - rendering textual de `sendRunFlowSummary` no `TelegramController`.
- Compatibilidade:
  - o consumidor principal do contrato hoje e o `TelegramController`, entao a mudanca e local ao repositorio, mas afeta testes e estado clonado;
  - `run_specs` carrega `runAllSummary` aninhado, portanto o contrato precisa permanecer coerente tanto no payload principal quanto no aninhado;
  - o fluxo sequencial e o protocolo de notificacao best-effort do Telegram devem permanecer inalterados.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - uso continuado dos mocks locais de `CodexTicketFlowClient` em `src/core/runner.test.ts`;
  - uso continuado dos mocks de `bot.telegram.sendMessage` em `src/integrations/telegram-bot.test.ts`.
