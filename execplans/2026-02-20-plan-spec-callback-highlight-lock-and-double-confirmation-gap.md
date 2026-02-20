# ExecPlan - /plan_spec com destaque visual, lock de botoes e confirmacao dupla de callback

## Purpose / Big Picture
- Objetivo: fechar o gap do ticket `tickets/closed/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md`, alinhando o UX de callback de `/plan_spec` com o padrao ja aplicado em `/specs`.
- Resultado esperado:
  - clique valido em opcao de pergunta de `/plan_spec` edita a mensagem original, destaca a opcao escolhida e remove/trava botoes.
  - clique valido em acao final (`create-spec`, `refine`, `cancel`) edita a mensagem final, destaca a acao escolhida e remove/trava botoes.
  - todo clique valido em `/plan_spec` retorna confirmacao dupla: `answerCbQuery` + mensagem no chat.
  - callbacks repetidos/stale sao tratados como idempotentes e observaveis, sem efeitos colaterais adicionais.
  - falha em `editMessageText` e tratada em best effort com log, sem quebrar o fluxo principal.
  - cobertura automatizada comprova CA-12, CA-13, CA-14, CA-15, CA-21, CA-22 e CA-23 da spec de origem.
- Escopo:
  - evoluir `src/integrations/telegram-bot.ts` para controlar contexto de callback de `/plan_spec` por mensagem/sessao, com lock e stale/idempotencia.
  - ajustar renderizacao de mensagem para estado "travado com selecao confirmada" (pergunta e acao final).
  - incluir confirmacao em chat para callbacks validos de `/plan_spec`.
  - ampliar testes em `src/integrations/telegram-bot.test.ts` (e, se necessario, em `src/core/runner.test.ts`) para os novos comportamentos.
  - atualizar a spec viva de origem com rastreabilidade do recorte entregue.
- Fora de escopo:
  - alterar callback UX de `/specs` (ja coberto por ticket/execplan anterior).
  - alterar semantica de multi-runner e RF-24 (ticket separado `tickets/open/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`).
  - reescrever fluxo de sessao `/plan_spec` no runner alem do necessario para manter contratos de callback.

## Progress
- [x] 2026-02-20 22:57Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, `SPECS.md`, `INTERNAL_TICKETS.md` e spec de origem.
- [x] 2026-02-20 23:02Z - Implementacao de destaque/trava/confirmacao dupla em callbacks de `/plan_spec` concluida.
- [x] 2026-02-20 23:05Z - Cobertura automatizada dos cenarios CA-12, CA-13, CA-14, CA-15, CA-21, CA-22, CA-23 concluida.
- [x] 2026-02-20 23:11Z - Regressao completa (`npm test`, `npm run check`, `npm run build`) concluida.
- [x] 2026-02-20 23:12Z - Documento vivo da spec atualizado com evidencias do recorte entregue.

## Surprises & Discoveries
- 2026-02-20 22:57Z - `handlePlanSpecCallbackQuery` em `src/integrations/telegram-bot.ts` responde apenas `answerCbQuery` para callbacks aceitos; nao existe `editMessageText` no fluxo de `/plan_spec`.
- 2026-02-20 22:57Z - callback data de `/plan_spec` (`plan-spec:question:*` e `plan-spec:final:*`) nao carrega contexto de mensagem/sessao; sem guardas adicionais, clique repetido pode reenviar input.
- 2026-02-20 22:57Z - testes atuais de `/plan_spec` (ex.: `src/integrations/telegram-bot.test.ts:2267` e `src/integrations/telegram-bot.test.ts:2315`) validam toast e roteamento, mas nao validam lock visual da mensagem nem confirmacao dupla no chat.

## Decision Log
- 2026-02-20 - Decisao: manter este plano estritamente no recorte `/plan_spec`.
  - Motivo: `/specs`, observabilidade geral e RF-24 ja possuem tickets/execplans dedicados; misturar escopos aumenta risco e dilui aceite.
  - Impacto: criterios do ticket atual ficam objetivos e verificaveis sem depender de entregas paralelas.
- 2026-02-20 - Decisao: adotar guarda de stale/idempotencia baseada em contexto de mensagem + sessao no controller do Telegram.
  - Motivo: runner aceita input textual em multiplas fases; sem contexto de mensagem, callback repetido pode gerar side effect duplicado.
  - Impacto: exige estado interno adicional em `telegram-bot.ts` para validar contexto ativo antes de encaminhar callback ao runner.
- 2026-02-20 - Decisao: manter payload de callback de `/plan_spec` compativel com formato atual (`plan-spec:question:*`, `plan-spec:final:*`) e reforcar validacao no controller.
  - Motivo: reduz risco de quebra de mensagens inline ja em uso e minimiza impacto em testes/parse existentes.
  - Impacto: stale detection depende de metadados de mensagem/sessao armazenados no bot, nao de mudanca ampla de protocolo de callback.
- 2026-02-20 - Decisao: tratar edicao de mensagem como best effort, com log de falha e continuidade do fluxo.
  - Motivo: requisito RF-21/CA-21 exige robustez operacional mesmo com erro de API Telegram ao editar mensagem.
  - Impacto: callback aceito continua emitindo confirmacao dupla, mesmo quando `editMessageText` falhar.

## Outcomes & Retrospective
- Status final: recorte entregue e validado como GO.
- O que funcionou: o contrato de callback por contexto de mensagem/sessao + lock visual + confirmacao dupla ficou coberto com testes dedicados e regressao completa verde.
- O que ficou pendente: somente RF-24 da spec viva, explicitamente fora de escopo deste plano.
- Proximos passos: fechar ticket de origem no mesmo changeset da entrega.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.ts` (somente se ajuste de contrato for necessario)
  - `src/core/runner.test.ts` (se houver ajuste no contrato)
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
- Pontos de entrada relevantes:
  - `handlePlanSpecCallbackQuery` (roteamento de callback `/plan_spec`).
  - `sendPlanSpecQuestion` e `sendPlanSpecFinalization` (emissao de mensagens com botoes).
  - `buildPlanSpecQuestionReply` e `buildPlanSpecFinalReply` (renderizacao atual sem estado travado selecionado).
  - handlers do runner: `handlePlanSpecQuestionOptionSelection` e `handlePlanSpecFinalActionSelection`.
- Fluxo atual:
  - callback valido em `/plan_spec` chama o handler do runner e responde toast (`answerCbQuery`), sem editar mensagem e sem segunda confirmacao no chat.
  - nao ha trava visual no teclado inline da mensagem clicada.
  - stale/repeticao depende basicamente do estado do runner, sem guarda explicita por mensagem.
- Fluxo alvo:
  - callback valido de pergunta/final faz confirmacao dupla (toast + chat), edita a mensagem com destaque da escolha e trava botoes.
  - callbacks repetidos/stale para a mesma mensagem sao bloqueados de forma idempotente e observavel.
  - falha de edicao da mensagem nao quebra aceite da acao no fluxo principal.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript sem novas dependencias.
  - preservar fluxo sequencial de tickets/specs.
  - manter compatibilidade com acoes finais atuais (`create-spec`, `refine`, `cancel`).

## Plan of Work
- Milestone 1 - Contrato de contexto para callback de `/plan_spec`
  - Entregavel: estado interno no controller para rastrear mensagem de pergunta/final ativa por chat/sessao (incluindo lock de consumo).
  - Evidencia de conclusao: callbacks sem contexto ativo ou com mensagem divergente retornam bloqueio stale/inactive sem chamar runner.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 2 - Renderizacao travada e destaque de escolha em pergunta/final
  - Entregavel: helpers de renderizacao de mensagem travada para pergunta e para finalizacao, com marcador explicito da escolha confirmada.
  - Evidencia de conclusao: `editMessageText` recebe texto atualizado e `inline_keyboard: []` apos callback aceito.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Confirmacao dupla para callback valido de `/plan_spec`
  - Entregavel: fluxo aceito passa a emitir toast e mensagem adicional no chat.
  - Evidencia de conclusao: testes validam `answerCbQuery("Resposta registrada.")` + envio de mensagem no chat para pergunta e acao final aceitas.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Idempotencia, stale e robustez operacional
  - Entregavel: callbacks repetidos/stale em mesma mensagem ou fase encerrada nao reenviam input, retornam resposta observavel, e mantem logging de decisao.
  - Evidencia de conclusao: testes dedicados cobrindo repeticao, stale e falha de `editMessageText` sem quebrar fluxo principal.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, opcionalmente `src/core/runner.test.ts`.
- Milestone 5 - Regressao e rastreabilidade de spec
  - Entregavel: suite verde e spec atualizada com status dos CAs pendentes deste recorte.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` verdes e update no documento vivo da spec.
  - Arquivos esperados: `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` + arquivos alterados do bot/testes.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para baseline antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "handlePlanSpecCallbackQuery|sendPlanSpecQuestion|sendPlanSpecFinalization|buildPlanSpecQuestionReply|buildPlanSpecFinalReply" src/integrations/telegram-bot.ts` para mapear pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir tipos/contexto de callback em `src/integrations/telegram-bot.ts` para ler `callbackQuery.message.message_id` (quando disponivel) e rastrear contexto ativo por chat/sessao.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Registrar contexto de callback ao enviar perguntas/finalizacao (`sendPlanSpecQuestion`, `sendPlanSpecFinalization`), incluindo tipo da mensagem, opcoes/acoes validas e status de consumo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar guardas de stale/idempotencia em `handlePlanSpecCallbackQuery` (contexto ausente, mensagem divergente, contexto consumido, sessao inativa/fase invalida).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar helpers de renderizacao travada para pergunta e finalizacao com destaque de escolha e `inline_keyboard` vazio.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Integrar `editMessageText` best effort no caminho de callback aceito, com log de warning em falha e sem rollback de acao aceita.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar envio de confirmacao no chat para callback valido de pergunta/final, mantendo toast atual como primeira confirmacao.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir que callback repetido para mesma mensagem escolha nao chama novamente `onPlanSpecQuestionOptionSelected`/`onPlanSpecFinalActionSelected`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar/expandir helpers de teste para callback query contendo metadados de mensagem (`message_id`) e captura de `editMessageText`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes para CA-12 e CA-13: destaque + lock em pergunta e finalizacao.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes para CA-14: confirmacao dupla (toast + chat) em callback valido.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes para CA-15 e CA-22: stale/repeticao idempotente sem side effects adicionais.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar teste para CA-21: falha de `editMessageText` nao quebra fluxo principal e gera log.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validacao focada.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar a spec `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` com atendimento dos CAs deste recorte e evidencias.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/core/runner.ts src/core/runner.test.ts docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: cobertura verde para callbacks de `/plan_spec` com destaque/lock, confirmacao dupla, stale e idempotencia (CA-12, CA-13, CA-14, CA-15, CA-22, CA-23).
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: sem regressao do contrato de callbacks de `/plan_spec`; se houver ajuste de contrato, novos cenarios passam.
- Comando: `rg -n "handlePlanSpecCallbackQuery|editMessageText|answerCbQuery|plan-spec" src/integrations/telegram-bot.ts`
  - Esperado: fluxo de callback de `/plan_spec` inclui caminho de edicao da mensagem e confirmacao dupla.
- Comando: `npm test`
  - Esperado: suite completa verde, incluindo fluxos existentes de `/specs`, `/projects`, `/run_specs` e `/plan_spec`.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erro apos alteracoes no controller e testes.
- Comando: `rg -n "CA-12|CA-13|CA-14|CA-15|CA-21|CA-22|CA-23|Status de atendimento|Evidencias" docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - Esperado: documento vivo atualizado com rastreabilidade objetiva do recorte entregue.

## Idempotence and Recovery
- Idempotencia:
  - callback repetido para mesma mensagem/acao confirmada retorna bloqueio observavel e nao reenvia input ao runner.
  - reexecucao dos comandos de teste nao altera estado funcional alem dos artefatos de build/test.
- Riscos:
  - ausencia de `message_id` em alguns callbacks pode reduzir capacidade de validar stale por mensagem.
  - lock feito cedo demais pode bloquear retry legitimo se a chamada ao runner falhar antes da decisao final.
  - ajuste de contexto de callback pode introduzir regressao em callbacks antigos de `/plan_spec` se parsing/guards ficarem rigidos demais.
  - falha recorrente de `editMessageText` pode gerar UX inconsistente se nao houver mensagem de chat clara.
- Recovery / Rollback:
  - manter guardas de callback encapsulados em helpers para rollback rapido do recorte sem afetar `/specs` e `/projects`.
  - em falha de `editMessageText`, manter toast + mensagem no chat e log para investigacao, preservando fluxo principal.
  - se stale detection por `message_id` for insuficiente em cenario real, fallback seguro para bloqueio por `sessionId` + fase atual.
  - em regressao ampla, restaurar temporariamente comportamento anterior de callback de `/plan_spec` mantendo logs e testes de diagnostico.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md`.
- Referencias obrigatorias consultadas:
  - `PLANS.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.test.ts`
- Tickets/execplans correlatos para contexto:
  - `execplans/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md`
  - `execplans/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md`
  - `tickets/open/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`
- Evidencias tecnicas usadas no planejamento:
  - `src/integrations/telegram-bot.ts:1133`
  - `src/integrations/telegram-bot.ts:1463`
  - `src/integrations/telegram-bot.ts:1503`
  - `src/core/runner.ts:539`
  - `src/core/runner.ts:559`
  - `src/integrations/telegram-bot.test.ts:2267`
  - `src/integrations/telegram-bot.test.ts:2315`

## Interfaces and Dependencies
- Interfaces alteradas (previstas):
  - `src/integrations/telegram-bot.ts`:
    - extensao de `CallbackContext`/parse de callback para ler metadados de mensagem (`message_id`) quando disponivel.
    - novo estado interno de contexto de callback ativo para `/plan_spec`.
    - novos helpers para renderizacao travada e envio de confirmacao de chat em callbacks de `/plan_spec`.
  - `src/integrations/telegram-bot.test.ts`:
    - mocks de callback query com metadados de mensagem e asserts de `editMessageText` + mensagem no chat.
  - `src/core/runner.ts` / `src/core/runner.test.ts`:
    - somente se surgir necessidade de ajuste fino em contrato de retorno para diferenciar melhor stale/inactive.
- Compatibilidade:
  - preservar comandos e callbacks atuais de `/plan_spec`, incluindo opcoes `create-spec`, `refine` e `cancel`.
  - manter comportamento de autorizacao por `TELEGRAM_ALLOWED_CHAT_ID`.
  - nao introduzir paralelizacao de tickets/specs.
- Dependencias externas e mocks:
  - sem novas bibliotecas.
  - reuso de `telegraf` (`answerCbQuery`, `editMessageText`, `sendMessage`) e logger interno.
  - testes seguem com doubles locais, sem chamadas reais ao Telegram.
