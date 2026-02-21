# ExecPlan - Observabilidade operacional, status e cobertura de aceitacao de /codex_chat

## Purpose / Big Picture
- Objetivo: fechar o gap de observabilidade e rastreabilidade de aceitacao do fluxo `/codex_chat`, cobrindo RF-12 e consolidando evidencia automatizada para CA-01..CA-10.
- Resultado esperado:
  - `/status` passa a expor bloco operacional de `/codex_chat` com fase, timestamps e motivo de encerramento quando aplicavel.
  - logs de lifecycle de `/codex_chat` ficam explicitos para inicio, continuidade e encerramento por manual, timeout e troca de comando.
  - documentacao de comandos fica coerente entre `README.md` e help `/start` do bot para `/codex_chat` e alias `/codex-chat`.
  - suites automatizadas passam a evidenciar cobertura dos CAs CA-01..CA-10 com rastreabilidade objetiva.
  - spec de origem e atualizada com evidencias e status final coerente com ausencia de tickets abertos.
- Escopo:
  - evoluir `src/core/runner.ts` e `src/types/state.ts` para enriquecer metadados observaveis de sessao `/codex_chat`.
  - evoluir `src/integrations/telegram-bot.ts` para refletir diagnostico de `/codex_chat` no `/status`.
  - atualizar `README.md` no bloco de comandos Telegram.
  - ampliar testes em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e, quando necessario para CA-10, `src/integrations/codex-client.test.ts`.
  - atualizar `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md` com evidencias finais.
- Fora de escopo:
  - criar novos comandos Telegram alem dos ja aprovados na spec.
  - alterar semantica base de sessao unica global de `/codex_chat`.
  - mudar arquitetura sequencial do runner.

## Progress
- [x] 2026-02-21 03:10Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, spec, codigo e testes de referencia.
- [x] 2026-02-21 00:58Z - Contrato de observabilidade de sessao `/codex_chat` alinhado no estado do runner.
- [x] 2026-02-21 00:58Z - `/status` enriquecido com diagnostico de `/codex_chat` (ativo e ultimo encerramento).
- [x] 2026-02-21 00:58Z - Trilha de logs de lifecycle de `/codex_chat` consolidada para manual/timeout/troca de comando.
- [x] 2026-02-21 00:58Z - README alinhado com help do bot para `/codex_chat` e alias.
- [x] 2026-02-21 00:58Z - Cobertura automatizada CA-01..CA-10 consolidada e validada.
- [x] 2026-02-21 00:58Z - Spec atualizada com evidencias e status final.

## Surprises & Discoveries
- 2026-02-21 03:10Z - A referencia de parent ticket no ticket alvo aponta para `tickets/open/`, mas o arquivo ja foi movido para `tickets/closed/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md`.
- 2026-02-21 03:10Z - O help `/start` ja lista `/codex_chat` e `/codex-chat` em `src/integrations/telegram-bot.ts`, mas `README.md` ainda nao reflete esse comando.
- 2026-02-21 03:10Z - `buildStatusReply` ja indica se `/codex_chat` esta ativo/inativo, porem sem bloco detalhado equivalente ao existente para `/plan_spec`.
- 2026-02-21 03:10Z - Ha cobertura relevante de CAs de `/codex_chat` em testes atuais, mas falta consolidacao explicita da rastreabilidade CA-01..CA-10 e cobertura dedicada de observabilidade de `/status` e logs.

## Decision Log
- 2026-02-21 - Decisao: manter o formato textual de `/status` e adicionar um bloco dedicado de `/codex_chat` no mesmo estilo de diagnostico de `/plan_spec`.
  - Motivo: evita ruptura de UX e reaproveita padrao operacional ja conhecido.
  - Impacto: alteracoes focadas em `buildStatusReply` e testes de string observavel.
- 2026-02-21 - Decisao: registrar motivo de encerramento de `/codex_chat` de forma tipada para reuso em logs e `/status`.
  - Motivo: requisito exige rastreabilidade por manual, timeout e troca de comando.
  - Impacto: exige ajuste de contrato no estado do runner e no caminho de cancelamento.
- 2026-02-21 - Decisao: fechar cobertura CA-01..CA-10 com matriz de evidencia baseada nas suites existentes, ampliando apenas lacunas reais.
  - Motivo: reduzir retrabalho e preservar estabilidade do que ja esta validado.
  - Impacto: foco em testes faltantes de observabilidade/status/log, sem duplicar cenarios ja cobertos.
- 2026-02-21 - Decisao: concluir este ticket junto com atualizacao da spec de origem.
  - Motivo: este e o ultimo ticket aberto derivado da spec; a entrega precisa refletir `Spec treatment`.
  - Impacto: incluir etapa de documentacao como criterio de conclusao tecnica.

## Outcomes & Retrospective
- Status final: implementado, validado e fechado com classificacao `GO`.
- O que funcionou: mudancas de observabilidade/status/documentacao e cobertura de testes ficaram alinhadas com RF-12 e CA-01..CA-10 sem regressao.
- O que ficou pendente: nenhum item tecnico deste escopo.
- Proximos passos: seguir para o proximo ticket da fila sequencial (quando existir).

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts`
  - `src/types/state.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `README.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
- Fluxo atual:
  - lifecycle de `/codex_chat` existe no runner (start/input/cancel/timeout), com logs parciais.
  - `/status` mostra apenas flag ativa/inativa para `/codex_chat`, sem diagnostico detalhado de fase e encerramento.
  - help `/start` contem `/codex_chat`, mas README ainda nao.
  - testes cobrem varios CAs de funcionalidade, mas nao consolidam totalmente o recorte de observabilidade/status.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript sem dependencias novas.
  - preservar fluxo sequencial do runner.
  - nao quebrar contratos existentes de `/plan_spec`, `/specs` e `/run_all`.

## Plan of Work
- Milestone 1 - Contrato observavel de lifecycle `/codex_chat` no core
  - Entregavel: estado do runner com metadado de ultimo encerramento de `/codex_chat` (motivo, timestamp e contexto minimo).
  - Evidencia de conclusao: testes no runner comprovam transicoes e motivo correto para manual, timeout e troca de comando.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2 - Status operacional detalhado para `/codex_chat`
  - Entregavel: `/status` com bloco de diagnostico de `/codex_chat` (fase, projeto da sessao, inicio, ultima atividade, waitingCodex, atividade/preview do Codex e ultimo encerramento quando inativo).
  - Evidencia de conclusao: testes de `buildStatusReply` validam conteudo para sessao ativa e inativa.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Logs de lifecycle com motivo de encerramento
  - Entregavel: trilha explicita de logs para inicio, continuidade e encerramento por manual, timeout e troca de comando.
  - Evidencia de conclusao: asserts em logger nas suites do runner e Telegram para cada trigger de encerramento.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Documentacao e cobertura CA-01..CA-10
  - Entregavel: README alinhado com `/codex_chat` e alias; matriz de evidencia CA-01..CA-10 consolidada em testes/spec.
  - Evidencia de conclusao: grep/execucao de testes demonstram que todos os CAs possuem evidencia automatizada observavel.
  - Arquivos esperados: `README.md`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`, `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`.
- Milestone 5 - Validacao final e fechamento de rastreabilidade
  - Entregavel: check/test/build verdes e spec com status/metadata coerentes com ausencia de tickets abertos.
  - Evidencia de conclusao: comandos de validacao completos e spec atualizada com links de ticket/execplan/evidencias.
  - Arquivos esperados: arquivos dos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "codexChatSession|cancelCodexChatSession|finalizeCodexChatSession|buildStatusReply" src/types/state.ts src/core/runner.ts src/integrations/telegram-bot.ts` para mapear pontos de extensao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/types/state.ts` com estrutura de ultimo encerramento observavel de `/codex_chat` (motivo e timestamp).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.ts` para preencher metadados de encerramento em todos os caminhos: manual, timeout, troca de comando e encerramento inesperado.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Padronizar logs de lifecycle no runner para inicio e continuidade de `/codex_chat` com contexto operacional consistente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar handoff em `src/integrations/telegram-bot.ts` para propagar motivo de encerramento por troca de comando de forma observavel.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Enriquecer `buildStatusReply` em `src/integrations/telegram-bot.ts` com bloco detalhado de `/codex_chat` alinhado ao padrao de diagnostico do `/plan_spec`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` no bloco "Controle por Telegram" incluindo `/codex_chat` e `/codex-chat`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `src/integrations/telegram-bot.test.ts` com cenarios de `/status` para `/codex_chat` ativo/inativo e assert de logs de handoff.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `src/core/runner.test.ts` para validar motivo de encerramento e logs em manual/timeout/troca de comando.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/codex-client.test.ts` somente se necessario para completar evidencia de CA-10 sem regressao.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Montar rastreabilidade CA-01..CA-10 na spec de origem com referencias de testes e comportamentos observados.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar metadata da spec (`Status`/`Spec treatment`) conforme resultado final e ausencia de pendencias abertas.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts` para validacao focada.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao geral.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run build` para confirmar integridade final de compilacao.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar com `git diff -- src/types/state.ts src/core/runner.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts README.md docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`.

## Validation and Acceptance
- Comando: `rg -n "Sessão /codex_chat|Fase /codex_chat|Última atividade /codex_chat|Último encerramento /codex_chat" src/integrations/telegram-bot.ts`
  - Esperado: `/status` contem diagnostico detalhado de sessao ativa e do ultimo encerramento.
- Comando: `rg -n "manual|timeout|command-handoff|troca de comando|encerrad" src/core/runner.ts src/integrations/telegram-bot.ts`
  - Esperado: trilha de encerramento explicita para manual, timeout e troca de comando.
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: testes validam lifecycle observavel e motivos de encerramento de `/codex_chat`.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: testes validam `/status` com bloco `/codex_chat`, handoff por comando e respostas observaveis de encerramento.
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: evidencia de CA-10 mantida (sessao livre sem `/plan` automatico).
- Comando: `rg -n "/codex_chat|/codex-chat" README.md src/integrations/telegram-bot.ts`
  - Esperado: README e help do bot alinhados para comando oficial e alias.
- Comando: `rg -n "CA-01|CA-02|CA-03|CA-04|CA-05|CA-06|CA-07|CA-08|CA-09|CA-10" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - Esperado: rastreabilidade completa dos CAs no codigo de teste e na spec.
- Comando: `npm run check && npm test && npm run build`
  - Esperado: tipagem, testes e build verdes sem regressao.

## Idempotence and Recovery
- Idempotencia:
  - repetir cancelamento manual de sessao inativa continua retornando estado seguro sem side effects.
  - callbacks stale continuam sem fechar sessao nova e sem poluir metadados de ultimo encerramento.
  - repeticao de comandos de validacao nao altera estado funcional do repositorio.
- Riscos:
  - corrida entre timeout, callback manual e handoff pode gravar motivo incorreto de encerramento.
  - enriquecimento de `/status` pode quebrar asserts existentes por mudanca textual.
  - divergencia entre README, help e spec pode manter rastreabilidade inconsistente.
- Recovery / Rollback:
  - centralizar atribuicao de motivo de encerramento em um unico ponto de finalizacao no runner.
  - se houver regressao textual em `/status`, ajustar testes para formato estabilizado e manter campos obrigatorios minimos.
  - isolar mudancas de documentacao em commit/logica separavel para rollback sem perder correcoes de runtime.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`.
- Spec de origem: `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`.
- Tickets/planos relacionados:
  - `tickets/closed/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md`
  - `tickets/closed/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md`
  - `execplans/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md`
  - `execplans/2026-02-21-codex-chat-telegram-command-alias-and-manual-close-ux-gap.md`
- Referencias tecnicas consultadas no planejamento:
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/types/state.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `README.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/types/state.ts`: novo campo para ultimo encerramento observavel de `/codex_chat`.
  - `src/core/runner.ts`: lifecycle de cancelamento/finalizacao de `/codex_chat` com motivo tipado e logs dedicados.
  - `src/integrations/telegram-bot.ts`: renderizacao de `/status` com bloco `/codex_chat` e propagacao de contexto de encerramento por troca de comando.
  - suites de teste (`src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`) para rastreabilidade CA e observabilidade.
  - `README.md` e spec de origem para consistencia documental.
- Compatibilidade:
  - preservar contratos existentes de `/plan_spec` e demais comandos Telegram.
  - manter fluxo sequencial e sem paralelizacao de tickets.
  - manter retrocompatibilidade de mensagens essenciais para operadores.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime.
  - continuar usando stubs locais e `SpyLogger` nas suites para validacao de observabilidade.
