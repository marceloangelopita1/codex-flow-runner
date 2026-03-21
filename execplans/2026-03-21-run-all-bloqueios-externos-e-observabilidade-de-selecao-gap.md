# ExecPlan - resiliencia do `/run_all` a bloqueios externos e observabilidade de selecao

## Purpose / Big Picture
- Objetivo: impedir que tickets em espera exclusivamente externa/manual consumam repetidamente a fila automatica de `/run_all`, fortalecer a consistencia documental do fechamento e tornar o resumo final observavel quando a falha ocorre em `select-ticket`.
- Resultado esperado:
  - follow-ups que representam apenas espera por insumo externo/manual passam a nascer com semantica observavel de `blocked`, e nao como novo ticket `open` auto-consumivel;
  - `/run_all` deixa de selecionar tickets `blocked`, continua processando tickets realmente elegiveis e encerra a rodada de forma acionavel quando restarem apenas bloqueados;
  - o fluxo evita churn equivalente de `split-follow-up` sem progresso local quando a causa-raiz e apenas espera externa/manual;
  - `close-and-version` passa a validar consistencia minima do ticket movido para `tickets/closed/`;
  - o resumo final do Telegram distingue ultimo ticket processado de ticket recusado/bloqueado em `select-ticket`.
- Escopo:
  - revisar contrato humano em `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `README.md` e `prompts/04-encerrar-ticket-commit-push.md`;
  - evoluir selecao da fila e guardrails de `/run_all` em `src/integrations/ticket-queue.ts` e `src/core/runner.ts`;
  - endurecer consistencia do fechamento documental antes de considerar `close-and-version` concluido;
  - atualizar tipagem e renderizacao do resumo final em `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts`;
  - cobrir o comportamento em testes de fila, runner e Telegram.
- Fora de escopo:
  - reescrever o contrato inteiro de `GO` vs `NO_GO`;
  - automatizar obtencao de insumos externos/manuais em projetos alvo;
  - remover o guardrail existente de 3 recuperacoes de `NO_GO` para casos tecnicos reais;
  - alterar a ordem sequencial de execucao por ticket.

## Progress
- [x] 2026-03-21 19:34Z - Planejamento inicial concluido com diagnostico consolidado a partir de falha real em projeto externo.
- [ ] 2026-03-21 19:34Z - Contrato documental de `blocked`/`external/manual` endurecido e alinhado ao prompt de fechamento.
- [ ] 2026-03-21 19:34Z - Fila e runner atualizados para ignorar tickets `blocked` e tratar churn sem progresso de forma observavel.
- [ ] 2026-03-21 19:34Z - Validacao de consistencia do ticket fechado implementada em `close-and-version`.
- [ ] 2026-03-21 19:34Z - Resumo final do Telegram enriquecido com contexto distinto para ultimo ticket processado e ticket recusado/bloqueado em `select-ticket`.
- [ ] 2026-03-21 19:34Z - Cobertura automatizada e verificacoes finais concluidas.

## Surprises & Discoveries
- 2026-03-21 19:34Z - O contrato do repositório ja diferencia `open`, `in-progress` e `blocked`, mas `src/integrations/ticket-queue.ts` ainda nao usa essa metadata na selecao do proximo ticket.
- 2026-03-21 19:34Z - O caso real que motivou o ticket nao teve falha tecnica em `plan`, `implement` nem em `git push`; o custo operacional veio de 5 ciclos documentais `split-follow-up` sobre a mesma causa-raiz `external/manual`.
- 2026-03-21 19:34Z - Existe uma lacuna secundaria de integridade: um ticket movido para `tickets/closed/` pode permanecer com `Status: open` sem que o runner detecte isso hoje.
- 2026-03-21 19:34Z - O resumo final de `run-all` usa um unico campo `ticket`, o que nao distingue adequadamente "ultimo ticket processado" de "ticket que causou a falha em `select-ticket`".

## Decision Log
- 2026-03-21 - Decisao: tratar o problema como combinacao de contrato humano + runtime + observabilidade, e nao apenas como ordenacao da fila.
  - Motivo: a falha real nasceu da interacao entre prompt de fechamento, status de ticket, selecao de fila, guardrail de `NO_GO` e resumo final ambiguo.
  - Impacto: o plano precisa tocar docs, prompts, fila, runner, tipagem de resumo e testes associados.
- 2026-03-21 - Decisao: manter tickets `blocked` auditaveis no backlog, mas fora da fila automatica de `/run_all`.
  - Motivo: esconder ou fechar esses tickets reduziria rastreabilidade; o problema e consumo automatico indevido, nao existencia do backlog.
  - Impacto: a fila deve filtrar ou priorizar explicitamente por status, e o resumo operacional deve deixar claro quando a rodada terminou por tickets restantes apenas bloqueados.
- 2026-03-21 - Decisao: endurecer `close-and-version` com validacao minima do ticket movido para `tickets/closed/`.
  - Motivo: o incidente mostrou que a consistencia documental minima nao esta sendo verificada.
  - Impacto: o runner deve falhar cedo com mensagem acionavel se `Status`, `Closed at (UTC)` ou `Closure reason` ficarem incoerentes.
- 2026-03-21 - Decisao: separar no resumo final do Telegram o contexto "ultimo ticket processado" do contexto "ticket bloqueado/recusado na selecao".
  - Motivo: o operador precisa entender se o ticket citado foi executado ou apenas encontrado na tentativa seguinte.
  - Impacto: `RunAllFlowSummary` provavelmente precisara transportar campos mais especificos que o `ticket` atual.

## Outcomes & Retrospective
- Status final: planejamento aberto para execucao.
- O que deve existir ao final:
  - contrato explicito para `blocked` em tickets `external/manual` sem proximo passo local;
  - `/run_all` resiliente a backlog misto com tickets `blocked` e `open`;
  - guardrail observavel contra churn de follow-up sem progresso local;
  - checagem automatica de coerencia minima do ticket fechado;
  - resumo final do Telegram sem ambiguidade de selecao.
- O que fica pendente apos este plano:
  - decidir a nomenclatura final do motivo de encerramento quando restarem apenas tickets bloqueados;
  - validar em rodada real a nova UX do resumo no Telegram.
- Proximos passos:
  - implementar as mudancas por milestone;
  - rodar testes focados e regressao relevante;
  - validar manualmente a mensagem final de `/run_all` em um cenario com backlog misto.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md`
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `README.md`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/ticket-queue.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Spec de origem:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
- RFs/CAs cobertos por este plano:
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::RF-08`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::RF-10`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::CA-06`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::CA-08`
  - `INTERNAL_TICKETS.md::Ciclo de vida do ticket`
  - `README.md::Observacoes operacionais`
- Assumptions / defaults adotados:
  - `blocked` continua sendo status valido e visivel em `tickets/open/`, mas nao deve ser consumido por `/run_all`;
  - `external/manual` sem proximo passo local executavel nao deve gerar cadeia infinita de follow-up `open`;
  - ainda pode existir `split-follow-up` para `NO_GO` tecnico legitimo, quando ha trabalho local remanescente;
  - o runner precisa falhar quando o ticket movido para `tickets/closed/` fica documentalmente incoerente;
  - o resumo final precisa ser suficientemente especifico para o operador entender a falha sem reler logs.
- Fluxo atual:
  - a fila lista `tickets/open/*.md` e ordena por `Priority`/nome;
  - o runner mede `splitFollowUpRecoveries` apenas pela cadeia de `Parent ticket` + `Closure reason: split-follow-up`;
  - o resumo final de `run-all` mostra um unico campo `ticket`;
  - o prompt de fechamento distingue `GO` e `NO_GO`, mas nao diferencia explicitamente wait-state `blocked` de follow-up tecnico executavel.
- Restricoes tecnicas:
  - manter processamento sequencial por ticket;
  - evitar dependencia nova;
  - preservar compatibilidade com projetos externos e com repositorios que usam o template atual de ticket;
  - reduzir ao minimo a quantidade de estados novos no resumo final.

## Plan of Work
- Milestone 1 - Contrato humano de `blocked` e follow-up externo/manual
  - Entregavel: docs, template e prompt de fechamento passam a distinguir `blocked` de `open` quando o remanescente e apenas espera por insumo externo/manual sem proximo passo local.
  - Evidencia de conclusao: instrucoes explicitas em `INTERNAL_TICKETS.md`, template de ticket, `README.md` e `prompts/04-encerrar-ticket-commit-push.md`.
  - Arquivos esperados: `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `README.md`, `prompts/04-encerrar-ticket-commit-push.md`.
- Milestone 2 - Fila e runner resilientes a tickets bloqueados
  - Entregavel: `ticket-queue` e `runner` deixam de consumir tickets `blocked`; backlog misto com `open` + `blocked` continua executando apenas os elegiveis.
  - Evidencia de conclusao: testes mostram selecao correta e rodada sem falha quando restam apenas tickets bloqueados.
  - Arquivos esperados: `src/integrations/ticket-queue.ts`, `src/integrations/ticket-queue.test.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 3 - Guardrail de "sem progresso real" em cadeias `external/manual`
  - Entregavel: existe comportamento observavel que impede churn equivalente de follow-up quando o remanescente e apenas espera externa/manual.
  - Evidencia de conclusao: teste cobre cenario realista de follow-up equivalente e evita nova rodada improdutiva ou reclassifica para `blocked`.
  - Arquivos esperados: `prompts/04-encerrar-ticket-commit-push.md`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 4 - Fechamento consistente e resumo final sem ambiguidade
  - Entregavel: `close-and-version` valida metadata minima do ticket fechado; resumo final do Telegram diferencia ultimo ticket processado de ticket recusado/bloqueado em `select-ticket`.
  - Evidencia de conclusao: testes de runner e Telegram cobrem os dois cenarios.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "blocked|external/manual|split-follow-up|Ticket de referencia|select-ticket|Priority|Status" prompts/04-encerrar-ticket-commit-push.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md README.md src/integrations/ticket-queue.ts src/core/runner.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts` para mapear todos os contratos tocados.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `README.md` e `prompts/04-encerrar-ticket-commit-push.md` para explicitar:
   - quando follow-up deve ser `blocked`;
   - quando `split-follow-up` continua sendo `open`;
   - como registrar wait-state externo/manual sem gerar ticket auto-consumivel.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/ticket-queue.ts` e `src/integrations/ticket-queue.test.ts` para ler `Status` dos tickets abertos e filtrar ou despriorizar explicitamente `blocked` na selecao de `/run_all`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` e `src/core/runner.test.ts` para:
   - lidar com cenario "apenas tickets bloqueados restantes";
   - evitar churn equivalente de `split-follow-up` em linhagens `external/manual` sem progresso local;
   - validar consistencia minima do ticket movido para `tickets/closed/`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts` para enriquecer o resumo final de `run-all` com campos distintos para:
   - ultimo ticket processado;
   - ticket recusado/bloqueado em `select-ticket`, quando existir.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/ticket-queue.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar a cobertura focada.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para garantir compatibilidade de tipos e contratos.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao relevante do repositório.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- prompts/04-encerrar-ticket-commit-push.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md README.md src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts src/core/runner.ts src/core/runner.test.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts` para auditoria final de escopo.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: follow-up exclusivamente externo/manual sem proximo passo local passa a ter semantica de `blocked`.
  - Evidencia observavel: docs/template/prompt descrevem explicitamente esse ramo e diferenciam `blocked` de `open`.
  - Comando: `rg -n "blocked|external/manual|split-follow-up|validacao manual externa" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md README.md prompts/04-encerrar-ticket-commit-push.md`
  - Esperado: matches explicitos alinhando contrato humano e prompt.
- Matriz requisito -> validacao observavel:
  - Requisito: `/run_all` nao seleciona tickets `blocked`.
  - Evidencia observavel: fila mista com `open` + `blocked` retorna apenas tickets elegiveis e encerra de forma acionavel quando restarem apenas bloqueados.
  - Comando: `npx tsx --test src/integrations/ticket-queue.test.ts src/core/runner.test.ts`
  - Esperado: cobertura verde para selecao de fila e rodada com backlog parcialmente bloqueado.
- Matriz requisito -> validacao observavel:
  - Requisito: runner nao aceita ticket fechado incoerente em `tickets/closed/`.
  - Evidencia observavel: teste falha quando o ticket movido permanece com `Status: open` ou sem `Closure reason`/`Closed at (UTC)`.
  - Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: existe caso cobrindo validacao minima de fechamento documental.
- Matriz requisito -> validacao observavel:
  - Requisito: resumo final de `run-all` diferencia ultimo ticket processado de ticket recusado/bloqueado em `select-ticket`.
  - Evidencia observavel: mensagem do Telegram passa a listar campos distintos, sem ambiguo `Ticket de referencia` unico.
  - Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: testes verificam mensagens distintas para falha em `select-ticket`.
- Matriz requisito -> validacao observavel:
  - Requisito: a mudanca preserva tipagem e regressao relevante do runner.
  - Evidencia observavel: TypeScript e suite relevante verdes.
  - Comando: `npm run check && npm test`
  - Esperado: sem erro de tipo e sem regressao relevante.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a implementacao nao deve criar novos status ou comportamentos ocultos; apenas reforcar a mesma semantica de `blocked`;
  - os testes devem continuar deterministas com tickets fixture `open`, `in-progress` e `blocked`;
  - o resumo final deve permanecer retrocompativel para fluxos bem-sucedidos que nao envolvam falha em `select-ticket`.
- Riscos:
  - filtrar `blocked` de forma agressiva e esconder trabalho que ainda deveria ser `open`;
  - criar heuristica frouxa demais para "sem progresso real" e bloquear follow-ups tecnicos legitimos;
  - endurecer demais a validacao documental e quebrar tickets historicos tocados por compatibilidade;
  - aumentar demais o payload do resumo final do Telegram.
- Recovery / Rollback:
  - se a heuristica de `blocked` ficar ampla demais, restringi-la a `external/manual` sem proximo passo local explicito;
  - se a fila quebrar compatibilidade, preservar fallback por `open`/`in-progress` e logar tickets `blocked` ignorados;
  - se o resumo final ficar verboso ou ambiguo, manter os novos campos apenas em falhas de `select-ticket`;
  - se a validacao de fechamento gerar falso positivo em historico, limitar a regra a tickets fechados na rodada corrente.

## Artifacts and Notes
- Ticket executor:
  - `tickets/open/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md`
- Incidente fonte:
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/responses/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-response.md`
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/decisions/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-decision.json`
  - `../guiadomus-enrich-costs-and-bid/tickets/open/2026-03-21-aguardar-amostra-publicavel-e-retomar-contrafactual-final-da-v3.md`
  - `../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-20-validar-calibragem-final-da-v3-com-amostra-real-publicavel.md`
- Referencias internas de contexto:
  - `execplans/2026-02-20-close-and-version-no-go-follow-up-ticket-and-run-all-limit-gap.md`
  - `execplans/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
  - `tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md`
- Observacao operacional:
  - este plano nasce de uma falha real em projeto externo; a revalidacao ideal inclui um fixture ou cenario de teste que replique backlog misto com ticket `blocked` e cadeia de `split-follow-up`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato textual de tickets e fechamento em `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `README.md` e `prompts/04-encerrar-ticket-commit-push.md`;
  - selecao da fila em `src/integrations/ticket-queue.ts`;
  - resumo de fluxo em `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts`;
  - validacao de fechamento e tratamento de selecao no `runner`.
- Compatibilidade:
  - preservar `split-follow-up` para `NO_GO` tecnico real;
  - preservar visibilidade de tickets `blocked` no backlog;
  - manter mensagens existentes de sucesso o mais estaveis possivel;
  - evitar alterar o contrato de projetos alvo alem do que ja esta documentado em `INTERNAL_TICKETS.md`.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova esperada;
  - cobertura automatizada deve usar fixtures locais de ticket/runner/Telegram;
  - validacao manual ideal posterior: reproduzir uma rodada real de `/run_all` com backlog misto em projeto de teste ou fixture integrada.
