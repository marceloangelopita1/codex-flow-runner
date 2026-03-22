# ExecPlan - `/run_all` com backlog bloqueado e resumo final observavel

## Purpose / Big Picture
- Objetivo: encerrar com seguranca o ticket que nasceu do incidente real de `2026-03-21`, provando primeiro o delta real entre o incidente e o estado atual do `codex-flow-runner`, e alterando codigo/documentacao apenas onde algum closure criterion ainda nao estiver coberto de forma observavel.
- Resultado esperado:
  - existe evidencia objetiva para cada closure criterion do ticket;
  - follow-up exclusivamente `external/manual` sem proximo passo local permanece visivel como `Status: blocked`, sem reentrar automaticamente na fila de `/run_all`;
  - o runner trata backlog misto (`open` + `blocked`) de forma acionavel e o resumo final distingue o ultimo ticket processado do ticket afetado na selecao;
  - se a baseline provar que o estado atual do repositorio ja satisfaz todos os criterios, a execucao deve seguir para fechamento do ticket com changeset minimo, em vez de inventar mudancas.
- Escopo:
  - revalidar ticket, referencias do incidente e superfícies locais que implementam o contrato de `blocked`, selecao de fila, fechamento e resumo final;
  - materializar apenas gaps residuais reais em documentacao, prompt, runtime e testes;
  - produzir evidencias observaveis derivadas diretamente dos closure criteria.
- Fora de escopo:
  - alterar o fluxo sequencial por ticket;
  - automatizar obtencao de insumo externo/manual em projetos alvo;
  - criar nova taxonomia de causas-raiz;
  - fazer retrofit em massa de tickets historicos fora da linhagem tocada.

## Progress
- [x] 2026-03-22 16:01Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, `docs/workflows/codex-quality-gates.md` e referencias obrigatorias.
- [x] 2026-03-22 16:05Z - Baseline do estado atual contra os cinco closure criteria concluida com releitura das specs, `rg` nos artefatos locais e suite focal `npx tsx --test src/integrations/ticket-queue.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` (`264` testes verdes).
- [x] 2026-03-22 16:05Z - Gap residual real identificado como exclusivamente documental no template `tickets/templates/internal-ticket-template.md`; runtime, prompt, fila, runner e resumo final ja estavam coerentes com o ticket.
- [x] 2026-03-22 16:07Z - Gap residual corrigido com patch minimo em `tickets/templates/internal-ticket-template.md`, adicionando orientacao explicita para `Status: blocked` e para follow-up `external/manual` sem proximo passo local.
- [x] 2026-03-22 16:07Z - Matriz `requisito -> validacao observavel` executada integralmente apos o patch documental residual: `rg` contratuais verdes e suites `ticket-queue + runner` (`117` testes), `runner` (`104` testes) e `telegram-bot + runner` (`251` testes) todas sem falhas.
- [x] 2026-03-22 16:07Z - Ticket ficou pronto para fechamento com evidencias coerentes; mantido aberto nesta etapa por instrucao explicita do usuario, sem blocker residual.
- [x] 2026-03-22 16:09Z - Fechamento executado com classificacao `GO`; ticket movido para `tickets/closed/` com `Closure reason: fixed` e sem follow-up.

## Surprises & Discoveries
- 2026-03-22 16:01Z - O estado atual do repositorio ja contem boa parte do comportamento que o ticket pede: `INTERNAL_TICKETS.md`, `README.md` e `prompts/04-encerrar-ticket-commit-push.md` ja descrevem follow-up `Status: blocked` para espera exclusivamente externa/manual sem proximo passo local.
- 2026-03-22 16:01Z - `src/integrations/ticket-queue.ts` ja diferencia tickets elegiveis e `blocked`, e `src/integrations/ticket-queue.test.ts` ja cobre a fila mista.
- 2026-03-22 16:01Z - `src/core/runner.test.ts` ja cobre os cenarios "restam apenas tickets blocked" e "ticket movido para closed com metadata incoerente".
- 2026-03-22 16:01Z - `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts` ja usam a separacao entre `lastProcessedTicket` e `selectionTicket`; portanto, o primeiro trabalho da execucao nao e implementar, e sim provar se ainda resta algum gap real entre o ticket aberto e o codigo atual.
- 2026-03-22 16:01Z - O ExecPlan anterior neste mesmo caminho ficou desatualizado em relacao ao estado atual do codigo e nao deve ser usado como baseline de implementacao.
- 2026-03-22 16:05Z - A baseline confirmou que os cinco closure criteria ja estavam cobertos no runtime/documentacao principal; a unica ausencia de evidencia direta estava no template `tickets/templates/internal-ticket-template.md`, que nao explicitava a taxonomia `blocked` nem a regra de follow-up externo/manual.
- 2026-03-22 16:07Z - O patch residual nao exigiu alteracao de TypeScript nem de comportamento; a revalidacao confirmou que o changeset final ficou restrito a `execplans/...` e `tickets/templates/internal-ticket-template.md`.

## Decision Log
- 2026-03-22 - Decisao: executar em duas fases, `baseline primeiro -> patch residual depois`.
  - Motivo: o codigo atual ja sobrepoe varias partes do closure criterion; partir direto para edicao aumentaria risco de retrabalho ou mudanca redundante.
  - Impacto: a execucao pode terminar em fechamento do ticket com evidencias e changeset minimo se nenhum gap residual for encontrado.
- 2026-03-22 - Decisao: tratar como spec de origem contextual a spec externa do incidente e como contrato funcional alvo os RFs/CAs da spec operacional local.
  - Motivo: o ticket nasceu de uma rodada real disparada pela spec v3 no projeto alvo, mas os requisitos explicitamente citados no ticket pertencem ao contrato do workflow deste repositório.
  - Impacto: o plano precisa carregar ambos os contextos sem misturar responsabilidade de produto com responsabilidade do runner.
- 2026-03-22 - Decisao: toda validacao de aceite neste plano fica ancorada nos cinco closure criteria do ticket, sem checklists genericos promovidos a gate de entrega.
  - Motivo: o pedido do usuario e explicito e o `codex-quality-gates` pede evidencias observaveis por criterio.
  - Impacto: `npm test` e `npm run check` entram apenas como regressao de suporte quando houver edicao real, nao como aceite autonomo.
- 2026-03-22 - Decisao: aplicar patch apenas no template de ticket, sem tocar runtime nem docs ja coerentes.
  - Motivo: a baseline com `rg` + `264` testes verdes mostrou que o unico closure criterion sem evidencia completa era o template-base, nao o comportamento do runner.
  - Impacto: o changeset permanece minimo e preserva o estado funcional ja valido do repositorio.
- 2026-03-22 - Decisao: considerar a matriz de validacao concluida sem `npm run check`.
  - Motivo: nao houve edicao em TypeScript; o proprio plano restringe `npm run check` a casos com alteracao de codigo TS.
  - Impacto: a validacao permaneceu alinhada ao escopo real do patch, sem executar regressao generica fora do contrato.

## Outcomes & Retrospective
- Status final: execucao concluida; ticket fechado nesta etapa com `GO`.
- O que deve existir ao final da execucao:
  - uma baseline escrita mostrando quais closure criteria ja estao satisfeitos pelo estado atual;
  - patches somente para os criterios ainda sem evidencia suficiente;
  - ticket apto a fechar com rastreabilidade honesta.
- O que fica pendente depois deste plano:
  - nenhuma pendencia adicional dentro deste escopo.
- Proximos passos:
  - nao ha patch adicional previsto para este escopo.

## Context and Orientation
- Arquivos principais do ticket:
  - `tickets/closed/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md`
  - `execplans/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md`
- Referencias do incidente externo:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
  - `../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-20-validar-calibragem-final-da-v3-com-amostra-real-publicavel.md`
  - `../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3.md`
  - `../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-21-aguardar-amostra-publicavel-e-retomar-contrafactual-final-da-v3.md`
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/requests/20260321t183642z-run-all-ticket-plan-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-request.md`
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/responses/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-response.md`
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/decisions/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-decision.json`
- Referencias internas de contrato e precedentes:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `INTERNAL_TICKETS.md`
  - `README.md`
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `execplans/2026-02-20-close-and-version-no-go-follow-up-ticket-and-run-all-limit-gap.md`
  - `execplans/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
  - `tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md`
- Superficies locais relevantes:
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/ticket-queue.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Spec de origem:
  - spec contextual do incidente: `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
- RFs/CAs cobertos por este ticket:
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::RF-08`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::RF-10`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::CA-06`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md::CA-08`
  - `INTERNAL_TICKETS.md::Ciclo de vida do ticket`
  - `README.md::Observacoes operacionais`
- Assumptions / defaults adotados:
  - `Status: blocked` continua sendo backlog visivel em `tickets/open/`, mas fora da fila automatica de `/run_all`;
  - `split-follow-up` continua valido para `NO_GO` tecnico real com trabalho local remanescente;
  - espera exclusivamente externa/manual sem proximo passo local nao deve reaparecer como novo ticket `open` autoexecutavel;
  - se a baseline provar que os cinco closure criteria ja estao cobertos, o caminho correto e fechamento do ticket, nao criacao artificial de novas mudancas;
  - comandos Node durante a execucao devem repetir o prefixo `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.
- Fluxo atual relevante:
  - `FileSystemTicketQueue` separa backlog em `runnableTickets` e `blockedTickets`.
  - `RunAllFlowSummary` carrega `lastProcessedTicket`, `selectionTicket` e `completionReason: blocked-tickets-only`.
  - o runner valida estrutura minima do ticket depois de `close-and-version`.
  - o resumo final do Telegram e o `/status` ja usam os campos distintos de rastreabilidade da selecao.
- Restricoes tecnicas:
  - manter arquitetura em camadas e fluxo sequencial;
  - evitar novas dependencias;
  - preservar compatibilidade com repositórios externos que ainda tenham tickets historicos sem tocar neles retroativamente.

## Plan of Work
- Milestone 1 - Baseline orientada pelos closure criteria
  - Entregavel: matriz inicial mostrando, para cada closure criterion do ticket, se o estado atual ja o satisfaz e qual evidencia local comprova isso.
  - Evidencia de conclusao: comandos de leitura e testes focados apontam `pass/fail` por criterio, sem editar arquivos ainda.
  - Arquivos esperados: este ExecPlan atualizado em `Progress`, `Surprises & Discoveries` e `Decision Log`; possivelmente nenhum arquivo de produto.
- Milestone 2 - Correcao residual somente onde houver gap real
  - Entregavel: patches minimos apenas nos criterios que falharem na baseline.
  - Evidencia de conclusao: cada criterio antes pendente passa a ter evidencia observavel suficiente, sem mexer em superficies nao relacionadas.
  - Arquivos esperados:
    - se o gap for contratual/documental: `INTERNAL_TICKETS.md`, `README.md`, `prompts/04-encerrar-ticket-commit-push.md`, `tickets/templates/internal-ticket-template.md`
    - se o gap for de fila/runner: `src/integrations/ticket-queue.ts`, `src/integrations/ticket-queue.test.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`
    - se o gap for de resumo final: `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`
- Milestone 3 - Fechamento orientado por evidencia
  - Entregavel: validacao final rodada, diff auditado e ticket pronto para fechamento honesto.
  - Evidencia de conclusao: a matriz inteira fica verde e o changeset final contem apenas superfícies correspondentes aos criterios realmente necessarios.
  - Arquivos esperados: ticket fechado e plano atualizado no mesmo changeset da execucao, se a baseline e os patches residuais concluirem o trabalho.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "blocked|external/manual|split-follow-up|blocked-tickets-only|lastProcessedTicket|selectionTicket|Status: closed|Closed at \\(UTC\\)|Closure reason" INTERNAL_TICKETS.md README.md prompts/04-encerrar-ticket-commit-push.md tickets/templates/internal-ticket-template.md src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts src/core/runner.ts src/core/runner.test.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts` para montar a baseline de contrato e runtime.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler o ticket e as referencias do incidente com `sed -n` nos arquivos listados em `Context and Orientation`, anotando quais closure criteria do ticket ja tem evidencias locais e quais dependem de patch residual.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/ticket-queue.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para provar a baseline funcional diretamente nas superfícies do ticket.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan em `Progress`, `Surprises & Discoveries` e `Decision Log` com o resultado da baseline:
   - se todos os closure criteria estiverem cobertos, registrar explicitamente que a implementacao ja existe e pular para o passo 8;
   - se algum closure criterion falhar, registrar o delta exato e seguir apenas para a superfície correspondente.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se houver gap contratual/documental, alterar com `apply_patch` apenas `INTERNAL_TICKETS.md`, `README.md`, `prompts/04-encerrar-ticket-commit-push.md` e/ou `tickets/templates/internal-ticket-template.md` para cobrir a lacuna exata observada na baseline.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se houver gap de comportamento, alterar com `apply_patch` apenas os arquivos de runtime/teste relacionados:
   - fila/runner: `src/integrations/ticket-queue.ts`, `src/integrations/ticket-queue.test.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`
   - resumo final: `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reexecutar somente os comandos da matriz de validacao afetados pelos patches; se houver edicao de TypeScript, complementar com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar o diff final com `git diff -- INTERNAL_TICKETS.md README.md prompts/04-encerrar-ticket-commit-push.md tickets/templates/internal-ticket-template.md src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts src/core/runner.ts src/core/runner.test.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts execplans/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md tickets/open/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md tickets/closed/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md` para garantir escopo minimo e rastreabilidade.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a matriz inteira estiver verde, fechar o ticket no mesmo changeset da execucao; se nao estiver, registrar blocker explicito no ticket sem improvisar nova heuristica fora do plano.

## Validation and Acceptance
- Matriz `requisito -> validacao observavel`:
  - Requisito: semantica de backlog bloqueado.
    - Evidencia observavel: `INTERNAL_TICKETS.md`, `README.md`, `prompts/04-encerrar-ticket-commit-push.md` e `tickets/templates/internal-ticket-template.md` deixam explicito que follow-up exclusivamente `external/manual` sem proximo passo local deve nascer como `Status: blocked`, nao como novo ticket `open`.
    - Comando: `rg -n "Status: blocked|external/manual|validacao manual externa|split-follow-up" INTERNAL_TICKETS.md README.md prompts/04-encerrar-ticket-commit-push.md tickets/templates/internal-ticket-template.md`
    - Esperado: matches coerentes mostrando a regra de classificacao e a diferenca entre `blocked` e `split-follow-up` tecnico.
  - Requisito: consumo automatico da fila.
    - Evidencia observavel: `src/integrations/ticket-queue.ts` e `src/core/runner.ts` ignoram tickets `blocked` em `/run_all`, e os testes cobrem backlog misto com `open` + `blocked`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/ticket-queue.test.ts src/core/runner.test.ts`
    - Esperado: testes verdes para selecao que ignora `blocked` e para rodada que termina com `completionReason: blocked-tickets-only`.
  - Requisito: protecao contra churn sem progresso.
    - Evidencia observavel: o contrato de fechamento impede follow-up `open` para espera passiva e o runner nao reconsome automaticamente o wait-state, encerrando a rodada quando restarem apenas bloqueados.
    - Comando: `rg -n "nao criar follow-up open|Status: blocked|aguardar insumo/decisao externa" prompts/04-encerrar-ticket-commit-push.md INTERNAL_TICKETS.md README.md`
    - Esperado: a documentacao/prompt descreve explicitamente o guardrail que substitui a cadeia improdutiva observada no incidente.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: o cenario com backlog restante apenas `blocked` termina de forma acionavel, sem voltar a executar o mesmo wait-state.
  - Requisito: consistencia de fechamento.
    - Evidencia observavel: `close-and-version` falha cedo quando o ticket movido para `tickets/closed/` nao fica com `Status: closed`, `Closed at (UTC)` e `Closure reason` coerentes.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: teste verde cobrindo falha estrutural pos-`close-and-version` quando a metadata do ticket fechado fica incoerente.
  - Requisito: observabilidade do resumo final.
    - Evidencia observavel: o resumo final de `run-all` e o `/status` distinguem `lastProcessedTicket` de `selectionTicket`, evitando o antigo `Ticket de referencia` ambiguo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`
    - Esperado: testes verdes cobrindo `selectionTicket`, `lastProcessedTicket` e `completionReason: blocked-tickets-only`.

## Idempotence and Recovery
- Idempotencia:
  - a baseline pode ser rerodada quantas vezes forem necessarias sem alterar estado do repositorio;
  - se todos os closure criteria ja estiverem satisfeitos, a execucao correta e nao adicionar novas mudancas de produto;
  - quaisquer patches residuais devem ser localizados e revalidaveis com os mesmos comandos da matriz.
- Riscos:
  - editar codigo que ja satisfaz o ticket e introduzir regressao desnecessaria;
  - usar `npm test` como muleta generica em vez de provar diretamente os closure criteria;
  - fechar o ticket sem registrar claramente que o incidente foi resolvido por mudancas ja presentes no tree atual.
- Recovery / Rollback:
  - se a baseline mostrar cobertura completa, interromper qualquer tentativa de implementacao e seguir para fechamento documentado;
  - se um patch residual quebrar criterio que estava verde, reverter somente a superfície afetada e retornar ao ultimo estado validado pela baseline;
  - se surgir ambiguidade entre ticket aberto e estado atual do codigo, registrar a descoberta em `Surprises & Discoveries` antes de ampliar escopo.

## Artifacts and Notes
- Artefatos principais usados no planejamento:
  - `tickets/closed/2026-03-21-run-all-bloqueios-externos-e-observabilidade-de-selecao-gap.md`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - `INTERNAL_TICKETS.md`
  - `README.md`
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/ticket-queue.test.ts`
  - `src/core/runner.test.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Artefatos do caso real:
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/responses/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-response.md`
  - `../guiadomus-enrich-costs-and-bid/.codex-flow-runner/flow-traces/decisions/20260321t185155z-run-all-ticket-close-and-version-2026-03-21-obter-amostra-publicavel-e-revalidar-recorte-operacional-da-v3-decision.json`
  - `../guiadomus-enrich-costs-and-bid/tickets/closed/2026-03-21-aguardar-amostra-publicavel-e-retomar-contrafactual-final-da-v3.md`
- Nota operacional:
  - a execucao deste plano deve atualizar `Progress`, `Surprises & Discoveries` e `Decision Log` em tempo real; se a baseline encerrar o ticket sem codigo novo, isso tambem precisa ficar registrado explicitamente aqui.

## Interfaces and Dependencies
- Interfaces alteradas potencialmente:
  - contrato textual de lifecycle de ticket em `INTERNAL_TICKETS.md`, `README.md`, `prompts/04-encerrar-ticket-commit-push.md` e `tickets/templates/internal-ticket-template.md`;
  - `TicketBacklogSnapshot` e selecao de elegibilidade em `src/integrations/ticket-queue.ts`;
  - validacao estrutural pos-`close-and-version` e montagem de `RunAllFlowSummary` em `src/core/runner.ts`;
  - shape textual/semantico do resumo final em `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - manter `split-follow-up` para `NO_GO` tecnico real;
  - manter tickets `blocked` visiveis no backlog;
  - evitar qualquer mudanca que exija adaptacao imediata de projetos externos alem do contrato ja documentado;
  - preservar sucesso dos fluxos que nao entram no cenario de backlog bloqueado.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime esperadas;
  - validacao local usa apenas testes existentes do repositorio;
  - a referencia ao projeto externo e somente artefato de diagnostico, nao dependencia de execucao automatizada deste plano.
