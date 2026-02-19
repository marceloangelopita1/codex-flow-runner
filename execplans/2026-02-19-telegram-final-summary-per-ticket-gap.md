# ExecPlan - Telegram resumo final por ticket com emissao unica

## Purpose / Big Picture
- Objetivo: implementar notificacao final por ticket no Telegram ao fim do ciclo `plan -> implement -> close-and-version`, com sucesso ou falha.
- Resultado esperado: cada ticket processado em `/run-all` gera exatamente uma mensagem final no chat alvo, sem duplicidade, incluindo erro objetivo quando houver falha.
- Escopo:
  - Definir contrato de evento final por ticket no runner (sucesso/falha, fase final, timestamp UTC, ticket, mensagem de erro quando aplicavel).
  - Integrar emissao desse evento a uma saida Telegram com envio proativo (nao apenas resposta a comando).
  - Garantir emissao unica por ticket em rodada com multiplos tickets.
  - Cobrir cenarios de sucesso, falha e multiplos tickets com testes automatizados.
  - Atualizar spec de notificacao com evidencias e status dos CAs atendidos por este ticket.
- Fora de escopo:
  - Incluir metadados avancados de rastreabilidade (ex.: commit/push id e contrato completo de artefatos) que pertencem ao ticket `tickets/open/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md`.
  - Redesenhar `/status` para espelhar explicitamente o ultimo evento notificado (mesmo ticket irmao acima).
  - Paralelizacao de tickets ou mudanca de politica fail-fast da rodada.

## Progress
- [x] 2026-02-19 14:48Z - Planejamento inicial concluido com leitura integral do ticket e referencias.
- [x] 2026-02-19 14:50Z - Contrato de resumo final por ticket definido no core.
- [x] 2026-02-19 14:51Z - Integracao Telegram para envio proativo implementada e conectada ao runner.
- [x] 2026-02-19 14:52Z - Testes de sucesso/falha/multiplos tickets concluidos.
- [x] 2026-02-19 14:53Z - Validacao final e rastreabilidade na spec concluidas.

## Surprises & Discoveries
- 2026-02-19 14:48Z - `src/core/runner.ts` conclui ticket com `touch(...)` e logs, mas nao possui callback/evento para notificacao externa por ticket.
- 2026-02-19 14:48Z - `src/integrations/telegram-bot.ts` hoje atua apenas como handler de comandos (`/run-all`, `/status`, `/pause`, `/resume`) e nao expoe API de push para resumo final.
- 2026-02-19 14:48Z - `src/integrations/telegram-bot.test.ts` cobre autorizacao e respostas de comando, sem casos para notificacao final por ticket.
- 2026-02-19 14:48Z - Existe acoplamento temporal entre inicio da rodada e destino da notificacao: no modo sem `TELEGRAM_ALLOWED_CHAT_ID`, e preciso definir chat alvo por rodada para envio proativo.

## Decision Log
- 2026-02-19 - Decisao: emitir evento final por ticket em ponto unico do `processTicket` para garantir semantica "exatamente uma vez" por ticket.
  - Motivo: reduzir risco de duplicidade ao evitar emissao espalhada em multiplos pontos/etapas.
  - Impacto: exige contrato explicito de evento no core e testes de deduplicacao.
- 2026-02-19 - Decisao: manter este ticket focado em emissao final unica (sucesso/falha) e erro objetivo, sem expandir para rastreabilidade completa de commit/push.
  - Motivo: evitar sobreposicao com o ticket irmao de rastreabilidade/coerencia.
  - Impacto: CAs ligados a rastreabilidade avancada permanecem pendentes no ticket separado.
- 2026-02-19 - Decisao: definir destino de notificacao com prioridade para `TELEGRAM_ALLOWED_CHAT_ID`; em modo sem restricao, usar chat que disparou `/run-all` na rodada ativa.
  - Motivo: permitir notificacao proativa mesmo quando nao ha chat fixo configurado.
  - Impacto: requer estado minimo no controlador Telegram para lembrar o chat da rodada.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechar ticket e sem commit/push nesta etapa).
- O que funcionou: emissao unica de resumo final por ticket foi centralizada no `TicketRunner` e entregue no Telegram com testes de sucesso, falha e multiplos tickets.
- O que ficou pendente: rastreabilidade avancada de sucesso (artefato plano + identificador commit/push) e coerencia explicita de `/status` com ultimo evento notificado, cobertos pelo ticket irmao.
- Proximos passos: executar fluxo de fechamento em ticket separado apos tratar as pendencias de rastreabilidade/coerencia.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - ciclo sequencial por ticket e ponto principal para publicar resumo final.
  - `src/core/runner.test.ts` - validacao de ordem das etapas e fail-fast; base para adicionar asserts de emissao unica.
  - `src/integrations/telegram-bot.ts` - comandos Telegram e ponto para adicionar envio proativo de resumo final.
  - `src/integrations/telegram-bot.test.ts` - suite atual sem cobertura de notificacao final.
  - `src/main.ts` - composicao runner + Telegram, onde o callback/evento precisa ser conectado.
  - `docs/specs/2026-02-19-telegram-run-status-notification.md` - RF-01/RF-02/RF-04 e CA-01/CA-02/CA-04 alvo deste ticket.
- Fluxo atual:
  - `/run-all` apenas inicia rodada e responde mensagem inicial.
  - Conclusao/falha de ticket atualiza estado interno e logs, sem push Telegram por ticket.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM, arquitetura em camadas (`src/core`, `src/integrations`, `src/config`).
  - Fluxo de tickets permanece estritamente sequencial.
  - Sem dependencia nova desnecessaria.
- Termos usados neste plano:
  - "Resumo final por ticket": mensagem unica enviada ao termino do ciclo completo do ticket (sucesso) ou no ponto de falha (falha).
  - "Emissao unica": um unico evento/mensagem final por ticket, mesmo em cenarios de erro.

## Plan of Work
- Milestone 1: Contrato de evento final por ticket no runner.
  - Entregavel: tipo/interface de resumo final definido e emitido pelo runner no encerramento de `processTicket`.
  - Evidencia de conclusao: diff em `src/core/runner.ts` (e tipo associado) com callback/evento chamado exatamente uma vez por ticket.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/state.ts` ou novo arquivo de tipos em `src/core`/`src/types`, `src/core/runner.test.ts`.
- Milestone 2: Saida Telegram para notificacao final por ticket.
  - Entregavel: integracao Telegram capaz de enviar mensagem proativa de resumo final para o chat alvo da rodada.
  - Evidencia de conclusao: metodo/adapter de notificacao no dominio Telegram e wiring em `src/main.ts`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/main.ts`, possivelmente `src/integrations/telegram-bot.test.ts`.
- Milestone 3: Garantia de emissao unica com cobertura automatizada.
  - Entregavel: testes cobrindo sucesso, falha e multiplos tickets, validando uma emissao final por ticket.
  - Evidencia de conclusao: `npm test` verde com casos nomeados para os cenarios do ticket.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4: Rastreabilidade da spec e fechamento de criterios deste ticket.
  - Entregavel: spec atualizada com evidencias dos CAs cobertos por este escopo.
  - Evidencia de conclusao: `docs/specs/2026-02-19-telegram-run-status-notification.md` com `Last reviewed at (UTC)` atualizado e status refletindo o que foi entregue.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-run-status-notification.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "processTicket|runStage|touch\(|requestRunAll|command\(\"run-all\"|command\(\"status\"" src/core/runner.ts src/integrations/telegram-bot.ts src/main.ts` para mapear pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` (e tipo associado) para publicar um resumo final por ticket em sucesso/falha com dados minimos do evento.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts` para suportar envio proativo de resumo final por ticket ao chat alvo da rodada.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/main.ts` para conectar evento final do runner ao emissor Telegram.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com casos de emissao unica em sucesso, falha e rodada com multiplos tickets.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com casos de formatacao/envio de resumo final para sucesso e falha.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada do novo contrato.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-run-status-notification.md` com evidencias, CAs atendidos por este ticket e pendencias restantes no ticket irmao.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/main.ts docs/specs/2026-02-19-telegram-run-status-notification.md` para auditoria final dos artefatos.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: casos comprovam emissao de exatamente um resumo final por ticket em sucesso e falha.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: envio proativo de resumo final cobre sucesso e falha, incluindo ticket e erro objetivo em falha.
- Comando: `npm test`
  - Esperado: suite completa passa sem regressao dos comandos Telegram existentes.
- Comando: `npm run check && npm run build`
  - Esperado: sem erros de tipagem e build concluido.
- Comando: `rg -n "CA-01|CA-02|CA-04|Last reviewed at|telegram-final-summary-per-ticket-gap" docs/specs/2026-02-19-telegram-run-status-notification.md`
  - Esperado: spec com rastreabilidade e estado atualizado para os criterios cobertos por este ticket.

## Idempotence and Recovery
- Idempotencia:
  - Reexecucao dos testes e validacoes (`npm test`, `npm run check`, `npm run build`) nao produz efeito colateral.
  - Reprocessamento de rodada nova deve gerar um resumo por ticket daquela rodada, sem reemitir tickets ja finalizados da rodada anterior.
- Riscos:
  - Duplicidade de notificacao se sucesso e erro emitirem em caminhos diferentes sem guarda unica.
  - Perda de notificacao quando envio Telegram falhar por rede/API.
  - Ambiguidade de chat alvo quando `TELEGRAM_ALLOWED_CHAT_ID` nao estiver configurado.
- Recovery / Rollback:
  - Centralizar emissao no fechamento de `processTicket`; em caso de duplicidade, remover emissoes redundantes e manter apenas o ponto canonico.
  - Em falha de envio Telegram, registrar erro estruturado e manter runner operacional (sem quebrar sequencialidade), com possibilidade de retry manual via nova rodada.
  - Em erro de roteamento de chat, aplicar fallback para chat que iniciou `/run-all` e registrar decisao no `Decision Log`.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-19-telegram-final-summary-per-ticket-gap.md`.
- Ticket relacionado (fora de escopo deste plano): `tickets/open/2026-02-19-telegram-summary-traceability-and-status-coherence-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-run-status-notification.md`.
- PR/Diff alvo: `git diff -- src/types/ticket-final-summary.ts src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/main.ts docs/specs/2026-02-19-telegram-run-status-notification.md`.
- Logs relevantes: saida de `npm test`, `npm run check`, `npm run build` e logs de execucao de rodada via `/run-all`.
- Evidencias de aceite: nomes de testes adicionados para sucesso, falha e multiplos tickets com emissao unica por ticket.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `TicketRunner` passa a expor/publicar evento de resumo final por ticket para consumidor externo.
  - Integracao Telegram passa a suportar envio proativo de mensagem final por ticket (alem das respostas a comando).
  - Possivel novo tipo de dominio para resumo final (`ticket`, `status`, `finalStage`, `timestampUtc`, `errorMessage?`).
- Compatibilidade:
  - Comandos existentes (`/run-all`, `/status`, `/pause`, `/resume`) devem manter comportamento atual.
  - Fluxo sequencial por ticket permanece inalterado; sem paralelizacao.
- Dependencias externas e mocks:
  - `telegraf` segue como dependencia principal para envio de mensagens Telegram.
  - Testes devem usar doubles/mocks locais para envio de mensagem, sem chamadas de rede reais.
