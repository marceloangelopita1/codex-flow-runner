# ExecPlan - Rastreabilidade de resumo final e coerencia de /status no Telegram

## Purpose / Big Picture
- Objetivo: fechar o gap de rastreabilidade do resumo final por ticket (RF-03) e de coerencia do comando `/status` com o ultimo evento efetivamente notificado (RF-05/CA-05).
- Resultado esperado:
  - Em sucesso, o resumo final enviado no Telegram inclui `ticket`, `status`, `fase final`, `timestamp UTC`, `execPlanPath` e identificador de commit/push.
  - O estado exposto por `/status` reflete explicitamente o ultimo evento de notificacao entregue ao chat de destino.
  - Testes automatizados cobrem os contratos novos sem regressao dos fluxos existentes.
- Escopo:
  - Evoluir os tipos de resumo final para suportar rastreabilidade obrigatoria em sucesso.
  - Persistir, dentro do ciclo do ticket no runner, os dados necessarios de plano e versionamento para o resumo final.
  - Evoluir a integracao de git para validar sincronismo e retornar metadados de commit/push consumiveis pelo runner.
  - Introduzir no `RunnerState` um registro explicito do ultimo evento notificado e refleti-lo no `/status`.
  - Atualizar suites de teste de runner, Telegram e git para os novos contratos.
- Fora de escopo:
  - Paralelizacao de tickets ou alteracao da politica fail-fast.
  - Mudanca de canal de notificacao (multicanal, dashboard externo, etc.).
  - Reescrever o fluxo de fechamento fora do contrato atual (`plan -> implement -> close-and-version`).

## Progress
- [x] 2026-02-19 15:03Z - Planejamento inicial concluido com leitura integral do ticket e referencias.
- [x] 2026-02-19 15:07Z - Contrato de rastreabilidade de sucesso definido nos tipos e no runner.
- [x] 2026-02-19 15:07Z - Integracao git evoluida para retornar identificador de commit/push apos validacao.
- [x] 2026-02-19 15:08Z - Estado de "ultimo evento notificado" implementado e exposto em `/status`.
- [x] 2026-02-19 15:08Z - Testes de contrato (runner/telegram/git) atualizados e verdes.
- [x] 2026-02-19 15:09Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 15:03Z - `src/core/runner.ts` recebe `execPlanPath` na etapa `plan`, mas hoje apenas registra em log e nao preserva esse dado para notificacao final.
- 2026-02-19 15:03Z - `src/integrations/git-client.ts` valida repositorio sincronizado, mas nao retorna metadados de commit/upstream para rastreabilidade de notificacao.
- 2026-02-19 15:03Z - `src/types/state.ts` nao possui estrutura para representar o ultimo evento realmente notificado; `/status` depende apenas de snapshot generico (`phase`, `lastMessage`, `updatedAt`).
- 2026-02-19 15:03Z - `src/integrations/telegram-bot.ts` envia resumo final, mas sem contrato de retorno para confirmar entrega e alimentar coerencia de estado.
- 2026-02-19 15:08Z - Cobertura de `/status` ficou mais robusta ao extrair um builder dedicado (`buildStatusReply`), permitindo teste de contrato sem depender de contexto Telegraf real.

## Decision Log
- 2026-02-19 - Decisao: modelar resumo final como contrato discriminado por status, exigindo campos adicionais de rastreabilidade no caminho de sucesso.
  - Motivo: evitar ambiguidade de campos opcionais e garantir checagem de tipo para RF-03.
  - Impacto: mudancas em `TicketFinalSummary`, `runner`, formatacao de mensagem Telegram e asserts de testes.
- 2026-02-19 - Decisao: promover validacao de git para retornar evidencia de versionamento (hash de commit + upstream sincronizado) no mesmo ponto onde ja existe verificacao obrigatoria de push.
  - Motivo: consolidar prova de commit/push em uma unica interface de integracao.
  - Impacto: interface `GitVersioning` e testes do `GitCliVersioning` precisam ser atualizados.
- 2026-02-19 - Decisao: atualizar `RunnerState` com um campo canonico de "ultimo evento notificado" e usar esse campo como fonte primaria do `/status`.
  - Motivo: eliminar divergencia entre status operacional interno e notificacao realmente entregue ao chat.
  - Impacto: ajuste em `state.ts`, `runner.ts`, `telegram-bot.ts` e testes de contrato do comando `/status`.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - Contrato discriminado de resumo final garantiu rastreabilidade obrigatoria no caminho de sucesso.
  - `assertSyncedWithRemote` passou a retornar evidencia auditavel (`commitHash`, `upstream`, `commitPushId`) reutilizada no resumo.
  - `/status` passou a refletir `lastNotifiedEvent`, atualizado somente quando o envio ao Telegram e confirmado.
  - Suite automatizada foi expandida com cenarios de rastreabilidade avancada e coerencia de notificacao.
- O que ficou pendente: apenas etapa de fechamento operacional do ticket (move para `tickets/closed` + commit/push) em prompt separado.
- Proximos passos: executar `prompts/04-encerrar-ticket-commit-push.md` para encerrar ticket e registrar hash do commit de entrega.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - ciclo sequencial por ticket, montagem/publicacao de resumo final e controle de estado.
  - `src/types/ticket-final-summary.ts` - contrato de payload do resumo final por ticket.
  - `src/types/state.ts` - contrato do estado exposto por `/status`.
  - `src/integrations/git-client.ts` - validacao de sincronismo git e ponto candidato para expor metadados de commit/push.
  - `src/integrations/telegram-bot.ts` - envio de resumo final e resposta ao comando `/status`.
  - `src/main.ts` - composicao entre runner e integracoes.
- Testes e evidencias:
  - `src/core/runner.test.ts`
  - `src/integrations/git-client.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Documento de referencia funcional:
  - `docs/specs/2026-02-19-telegram-run-status-notification.md`
- Restricoes tecnicas:
  - Fluxo sequencial obrigatorio por ticket.
  - Node.js 20+, TypeScript ESM, sem dependencia extra desnecessaria.
  - Sem exposicao de segredos em logs/notificacoes.

## Plan of Work
- Milestone 1 - Contrato de rastreabilidade de sucesso no dominio
  - Entregavel: `TicketFinalSummary` passa a carregar metadados obrigatorios de sucesso (`execPlanPath` + identificador de commit/push).
  - Evidencia de conclusao: asserts de tipo e testes do runner validando resumo de sucesso com todos os campos.
  - Arquivos esperados: `src/types/ticket-final-summary.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2 - Evidencia de versionamento no adaptador git
  - Entregavel: interface de git passa a retornar metadados auditaveis apos validar repositorio limpo e branch sincronizada.
  - Evidencia de conclusao: testes de `git-client` verificam retorno de hash/upstream e manutencao de falhas existentes (workspace sujo, sem upstream, commits sem push).
  - Arquivos esperados: `src/integrations/git-client.ts`, `src/integrations/git-client.test.ts`, `src/core/runner.ts`.
- Milestone 3 - Coerencia do `/status` com ultimo evento notificado
  - Entregavel: `RunnerState` inclui campo para ultimo evento notificado; `runner` atualiza esse campo somente apos envio bem-sucedido do resumo; `/status` exibe esse dado.
  - Evidencia de conclusao: teste cobrindo estado apos notificacao bem-sucedida e nao-atualizacao quando envio falha.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Validacao completa e rastreabilidade da spec
  - Entregavel: suite de testes e checagens de build verdes, com evidencias para CA-03 e CA-05.
  - Evidencia de conclusao: saida limpa de `npm test`, `npm run check`, `npm run build` e atualizacao objetiva do status de atendimento na spec.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-run-status-notification.md` (se houver mudanca de estado/evidencia), mais arquivos alterados nos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "TicketFinalSummary|buildTicketFinalSummary|publishTicketFinalSummary|assertSyncedWithRemote|RunnerState|command\(\"status\"" src` para mapear pontos exatos de contrato.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/ticket-final-summary.ts` para representar sucesso/falha com rastreabilidade obrigatoria no caminho de sucesso.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/git-client.ts` para retornar metadados de commit/push junto da validacao de sincronismo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para:
   - preservar `execPlanPath` da etapa `plan`;
   - incorporar metadados de git no resumo de sucesso;
   - atualizar estado de ultimo evento notificado apenas apos envio confirmado.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` com estrutura explicita de ultimo evento notificado e ajustar snapshots iniciais.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para refletir o novo contrato no resumo final e em `/status`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios de sucesso/falha cobrindo rastreabilidade e coerencia do ultimo evento notificado.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/git-client.test.ts` com asserts do retorno de metadados e manutencao dos erros de validacao existentes.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com asserts de mensagem de sucesso enriquecida e saida de `/status` alinhada ao ultimo evento notificado.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/git-client.test.ts src/integrations/telegram-bot.test.ts` para validacao focada.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se houver mudanca de estado funcional, atualizar `docs/specs/2026-02-19-telegram-run-status-notification.md` com evidencias objetivas de CA-03 e CA-05.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/types/ticket-final-summary.ts src/types/state.ts src/integrations/git-client.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/git-client.test.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-telegram-run-status-notification.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: resumo de sucesso inclui `execPlanPath` + identificador de commit/push; em falha, contrato continua objetivo com fase/erro.
- Comando: `npx tsx --test src/integrations/git-client.test.ts`
  - Esperado: validacao de sincronismo retorna metadados auditaveis e preserva erros para cenarios invalidos.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: mensagem final de sucesso inclui rastreabilidade avancada; `/status` mostra ultimo evento notificado coerente com o envio.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao de autorizacao/controle do bot.
- Comando: `npm run check && npm run build`
  - Esperado: sem erro de tipo e build concluido.
- Comando: `rg -n "CA-03|CA-05|ultimo evento notificado|commit/push|execPlan" docs/specs/2026-02-19-telegram-run-status-notification.md`
  - Esperado: spec atualizada com rastreabilidade de atendimento apos execucao deste plano (quando aplicavel).

## Idempotence and Recovery
- Idempotencia:
  - Reexecucao dos testes/comandos de validacao nao gera efeitos colaterais persistentes.
  - Repetir rodada com os mesmos binarios deve manter emissao unica por ticket e sobrescrever apenas o campo de "ultimo evento notificado" com o evento mais recente.
- Riscos:
  - Risco de quebra de compatibilidade ao transformar interfaces (`GitVersioning`, `TicketFinalSummary`, `RunnerState`).
  - Risco de divergencia se o estado for atualizado antes da confirmacao de envio Telegram.
  - Risco de acoplamento excessivo entre detalhes de Telegram e estado de dominio.
- Recovery / Rollback:
  - Aplicar migracao incremental de tipos (primeiro tipos, depois consumidores) para manter build compilando a cada passo.
  - Se envio Telegram falhar, nao atualizar `lastNotifiedEvent`; registrar erro estruturado e manter fluxo fail-fast do ticket.
  - Em regressao de contrato, reverter apenas o milestone corrente e repetir validacao focada antes de prosseguir.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-run-status-notification.md`.
- Ticket/execplan relacionado (ja entregue):
  - `tickets/closed/2026-02-19-telegram-final-summary-per-ticket-gap.md`
  - `execplans/2026-02-19-telegram-final-summary-per-ticket-gap.md`
- Artefatos esperados de evidencias:
  - `git diff` dos arquivos listados nos milestones.
  - Saida dos comandos de teste e typecheck/build.
  - Trecho de `/status` exibindo ultimo evento notificado apos caso de sucesso.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/types/ticket-final-summary.ts`: contrato de resumo final por ticket (sucesso com rastreabilidade obrigatoria).
  - `src/integrations/git-client.ts`: retorno de metadados de commit/push no ponto de validacao de sincronismo.
  - `src/types/state.ts`: novo campo de ultimo evento notificado no estado do runner.
  - `src/core/runner.ts`: agregacao de evidencias, publicacao de resumo e persistencia do estado coerente para `/status`.
  - `src/integrations/telegram-bot.ts`: adaptacao da mensagem final e renderizacao de `/status` baseada no novo estado.
- Compatibilidade:
  - Comandos `/run-all`, `/pause`, `/resume` devem manter comportamento atual.
  - Fluxo sequencial por ticket deve permanecer inalterado.
  - Mudancas de contrato exigem atualizacao coordenada de testes e pontos de composicao (`src/main.ts`).
- Dependencias externas e mocks:
  - `telegraf` segue como dependencia de envio; testes devem usar mocks/doubles sem chamada de rede.
  - `git` CLI continua fonte de verdade para hash/upstream na integracao local.
