# ExecPlan - /codex_chat com resposta final unica e anti-flood no Telegram

## Purpose / Big Picture
- Objetivo: ajustar o fluxo de `/codex_chat` para enviar ao Telegram apenas a resposta final de cada turno, evitando flood de chunks intermediarios do Codex.
- Resultado esperado:
  - cada input livre do operador gera no maximo uma mensagem de saida no Telegram;
  - atividade intermediaria do Codex continua observavel em log/status, mas nao gera spam no chat;
  - o comportamento fica consistente com a estrategia de controle aplicada no `/plan_spec` (nao encaminhar stream bruto sem controle).
- Escopo:
  - evoluir o pipeline de output do `/codex_chat` no `runner` para agregacao por turno com flush unico;
  - manter `codex-activity` para diagnostico sem encaminhamento direto ao Telegram;
  - ajustar cobertura automatizada do `runner` para provar ausencia de flood;
  - validar regressao em testes de Telegram onde aplicavel.
- Fora de escopo:
  - alterar comandos/UX de callback do `/codex_chat` (start/cancel/alias);
  - mudar fluxo sequencial de tickets;
  - reabrir ou alterar semantica de `/plan_spec`.

## Progress
- [x] 2026-02-21 07:03Z - Diagnostico inicial concluido com leitura de `runner`, `codex-client`, `main` e logs reportados.
- [x] 2026-02-21 07:08Z - Estrategia final-only por turno definida e implementada no `runner`.
- [x] 2026-02-21 07:08Z - Testes de `runner` atualizados para cobrir burst de chunks sem flood.
- [x] 2026-02-21 07:08Z - Regressao de Telegram validada.
- [x] 2026-02-21 07:08Z - Validacao final (`check`, `test`, `build`) concluida.

## Surprises & Discoveries
- 2026-02-21 07:03Z - `handleCodexChatSessionEvent` encaminha todo evento `raw-sanitized` para Telegram; nao existe throttling/agregacao no caminho de `/codex_chat`.
- 2026-02-21 07:03Z - A fase muda para `waiting-user` no primeiro chunk recebido; chunks seguintes continuam sendo encaminhados, o que amplia o flood.
- 2026-02-21 07:03Z - No `/plan_spec`, saida bruta tem controles explicitos (supressao por fase + throttling + gate de encaminhamento), enquanto no `/codex_chat` o `onOutput` e sempre enviado em `main.ts`.
- 2026-02-21 07:03Z - `codex-activity` ja oferece diagnostico suficiente para manter observabilidade sem precisar encaminhar todos os chunks ao operador.

## Decision Log
- 2026-02-21 - Decisao: consolidar a saida de `/codex_chat` no `runner` e encaminhar para Telegram apenas no flush final por turno.
  - Motivo: resolver flood na camada de orquestracao sem mudar contrato externo de comandos.
  - Impacto: `ActiveCodexChatSession` passa a manter buffer/timer de flush de output.
- 2026-02-21 - Decisao: preservar logs `Lifecycle /codex_chat: codex-activity` para diagnostico e separar isso do output entregue ao chat.
  - Motivo: manter rastreabilidade operacional sem poluir UX.
  - Impacto: novos logs de agregacao/flush/supressao no runner.
- 2026-02-21 - Decisao: manter API publica do Telegram/controller sem mudanca de assinatura.
  - Motivo: reduzir risco de regressao fora do escopo.
  - Impacto: alteracoes concentradas em `runner` e testes.
- 2026-02-21 - Decisao: usar janela de flush de 1200ms por padrao com override em `TicketRunnerOptions`.
  - Motivo: reduzir chance de quebrar resposta em multiplas mensagens e permitir testes rapidos/deterministicos.
  - Impacto: novo parametro `codexChatOutputFlushDelayMs` e nova cobertura para burst de chunks.

## Outcomes & Retrospective
- Status final: implementado e validado (`GO`).
- O que funcionou: agregacao no `runner` eliminou forwarding chunk-a-chunk e manteve observabilidade de atividade.
- O que ficou pendente: nenhum item tecnico deste escopo.
- Proximos passos: monitorar logs operacionais do bot para confirmar comportamento em sessao real de longa duracao.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - handler de eventos de sessao `/codex_chat` e ponto de encaminhamento para Telegram.
  - `src/core/runner.test.ts` - cobertura de lifecycle e output forwarding de `/codex_chat`.
  - `src/main.ts` - wiring de `codexChatEventHandlers.onOutput`.
  - `src/integrations/codex-client.ts` - origem dos eventos `raw-sanitized` e `activity`.
  - `src/integrations/telegram-bot.ts` - envio final de mensagem ao Telegram.
- Fluxo atual:
  - cada chunk `raw-sanitized` recebido no runner chama `emitCodexChatOutput`.
  - o primeiro chunk em `waiting-codex` ja troca fase para `waiting-user`.
  - chunks subsequentes continuam sendo enviados, gerando flood.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript.
  - sem paralelizacao de tickets.
  - sem dependencias novas para este ajuste.

## Plan of Work
- Milestone 1 - Contrato operacional de output final-only no runner
  - Entregavel: estrategia explicita de agregacao por turno para `/codex_chat` (buffer + flush unico).
  - Evidencia de conclusao: diff em `runner.ts` com novos campos de sessao e caminho unico de flush.
  - Arquivos esperados: `src/core/runner.ts`.
- Milestone 2 - Encaminhamento unico para Telegram por resposta
  - Entregavel: `emitCodexChatOutput` chamado uma vez por turno, apos janela de estabilizacao de chunks.
  - Evidencia de conclusao: logs mostram `output-forwarded` unico por turno; chunks intermediarios nao sao enviados ao chat.
  - Arquivos esperados: `src/core/runner.ts`, possivel ajuste em `src/main.ts` apenas se necessario.
- Milestone 3 - Cobertura de testes para anti-flood
  - Entregavel: testes de burst de chunks garantindo uma unica resposta enviada e transicao de fase consistente.
  - Evidencia de conclusao: casos novos/ajustados verdes em `runner.test.ts`.
  - Arquivos esperados: `src/core/runner.test.ts`.
- Milestone 4 - Regressao de integracao Telegram
  - Entregavel: confirmacao de que mensagem final continua chegando com formato esperado no bot.
  - Evidencia de conclusao: testes de Telegram permanecem verdes sem ajustar contrato publico.
  - Arquivos esperados: `src/integrations/telegram-bot.test.ts` (somente se necessario).
- Milestone 5 - Validacao final do pacote
  - Entregavel: check/test/build verdes.
  - Evidencia de conclusao: comandos executados com resultado esperado.
  - Arquivos esperados: sem novos arquivos alem dos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "handleCodexChatSessionEvent|output-forwarded|codex-activity|setCodexChatPhase" src/core/runner.ts` para confirmar pontos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para adicionar estado interno de agregacao de output em `ActiveCodexChatSession` (buffer, contador de chunks e timer de flush).
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar helper de bufferizacao de `raw-sanitized` no `/codex_chat`, com janela de flush e envio unico ao Telegram.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `handleCodexChatSessionEvent` para nao encaminhar chunk bruto imediatamente e fazer transicao de fase para `waiting-user` apenas no flush final do turno.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir cleanup do timer/buffer no encerramento da sessao (`finalizeCodexChatSession`) para evitar vazamento de flush tardio.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com caso de burst de chunks (`raw-sanitized` em sequencia) validando unica chamada de output ao handler.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar asserts existentes de fase/log para refletir novo momento de transicao (flush final).
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para validacao focada.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para regressao do contrato de envio no bot.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test && npm run build` para regressao completa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar com `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/main.ts`.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: teste de `/codex_chat` comprova que multiplos chunks de uma mesma resposta resultam em uma unica mensagem encaminhada.
- Comando: `rg -n "Lifecycle /codex_chat: output-forwarded|Lifecycle /codex_chat: codex-activity" src/core/runner.ts`
  - Esperado: caminho de forwarding fica separado da telemetria de atividade.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: bot continua enviando saida de `/codex_chat` com formato esperado (incluindo botao de encerramento quando sessao ativa).
- Comando: `npm run check && npm test && npm run build`
  - Esperado: tipagem, testes e build verdes sem regressao.
- Evidencia operacional esperada em log:
  - para um unico input do operador, no maximo um evento `Lifecycle /codex_chat: output-forwarded`.
  - eventos `codex-activity` podem continuar multiplos, sem flood no Telegram.

## Idempotence and Recovery
- Idempotencia:
  - repeticao de chunks dentro da janela de flush nao multiplica mensagens no Telegram.
  - repeticao de cancelamento/close com buffer ativo nao deve disparar envio tardio.
- Riscos:
  - janela de flush curta demais pode quebrar resposta em duas mensagens.
  - janela de flush longa demais pode aumentar latencia percebida da resposta.
  - flush concorrente com timeout/cancelamento pode gerar corrida.
- Recovery / Rollback:
  - manter alteracao isolada no `runner`; rollback simples reverte apenas agregacao.
  - em regressao de latencia, ajustar apenas constante de janela de flush sem mudar contrato.
  - proteger flush com validacao de sessao ativa (`sessionId`) para evitar envio apos encerramento.

## Artifacts and Notes
- Diagnostico operacional de origem:
  - logs `Lifecycle /codex_chat: output-forwarded` repetidos para a mesma resposta, com `codex-activity` em burst.
  - exemplo observado: forwarding em `phase: "waiting-user"` logo apos chunks com preview de tool activity (`"• Ran git log ..."`).
- Referencias consultadas:
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `PLANS.md`
- Evidencias de validacao executadas:
  - `npx tsx --test src/core/runner.test.ts`
  - `npx tsx --test src/integrations/telegram-bot.test.ts`
  - `npm run check && npm test && npm run build`
- Relacao com padrao existente:
  - `/plan_spec` ja aplica controle de output bruto por fase/throttling e gate de encaminhamento; este plano adapta o mesmo principio para `/codex_chat`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - internas do `runner` (`ActiveCodexChatSession` e pipeline de `handleCodexChatSessionEvent`).
  - possiveis ajustes de assert em testes de `runner`.
- Compatibilidade:
  - sem mudanca de assinatura publica em `TelegramController` e comandos.
  - sem alteracao do contrato externo de `CodexTicketFlowClient`.
- Dependencias externas e mocks:
  - sem novas dependencias.
  - testes continuam com stubs de sessao Codex e spy logger locais.
