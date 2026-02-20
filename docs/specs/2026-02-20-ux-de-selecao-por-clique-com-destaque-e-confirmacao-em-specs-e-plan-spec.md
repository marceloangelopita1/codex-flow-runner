# [SPEC] UX de selecao por clique com destaque e confirmacao em /specs e /plan_spec

## Metadata
- Spec ID: 2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec
- Status: approved
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-20 22:12Z
- Last reviewed at (UTC): 2026-02-20 23:22Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md
  - tickets/closed/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md
  - tickets/closed/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md
  - tickets/closed/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md
- Related execplans:
  - execplans/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md
  - execplans/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md
  - execplans/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: a triagem de specs pelo Telegram depende de comando manual `/run_specs <arquivo>`, e os fluxos com botoes (`/specs` e `/plan_spec`) ainda nao padronizam destaque visual da escolha com bloqueio de novos cliques na mesma mensagem.
- Resultado esperado: permitir tratamento de spec com um clique em `/specs`, mantendo `/run_specs <arquivo>` como fallback manual; padronizar em `/specs` e `/plan_spec` a confirmacao dupla de clique (toast + mensagem no chat), com destaque explicito da opcao escolhida e desativacao dos botoes da mensagem selecionada.
- Contexto funcional: preservar fluxo sequencial do runner, com validacoes de elegibilidade, acesso, concorrencia e callbacks stale antes de qualquer transicao de estado.

## Jornada de uso
1. Operador autorizado executa `/specs` e recebe lista paginada de specs elegiveis, cada item com botao inline de selecao.
2. Operador clica em uma spec elegivel na lista.
3. Runner valida chat autorizado, estado de concorrencia, pagina/mensagem vigente e elegibilidade atual da spec no momento do clique.
4. Em sucesso, o runner inicia imediatamente o mesmo fluxo de triagem que seria iniciado por `/run_specs <arquivo>`.
5. A mensagem da lista clicada e editada para marcar a spec escolhida com `✅` e bloquear novos cliques naquela mensagem.
6. O usuario recebe confirmacao dupla: `answerCbQuery` e mensagem no chat com a acao iniciada.
7. Se a validacao falhar (nao elegivel, stale, concorrencia ou acesso), nenhum fluxo inicia e o usuario recebe motivo observavel no toast e no chat.
8. Em `/plan_spec`, ao clicar em opcoes de pergunta ou em acoes finais (`Criar spec`, `Refinar`, `Cancelar`), a mensagem correspondente tambem e atualizada para destacar a escolha e travar botoes.
9. Em `/plan_spec`, cada clique valido tambem gera confirmacao dupla (toast + mensagem no chat).
10. O operador pode continuar usando `/run_specs <arquivo>` como fallback manual quando nao quiser usar clique em `/specs`.

## Requisitos funcionais
- RF-01: `/specs` deve renderizar botoes inline por item elegivel na pagina atual.
- RF-02: cada botao de item em `/specs` deve carregar callback data suficiente para identificar spec, pagina e contexto da mensagem.
- RF-03: o clique em item elegivel de `/specs` deve iniciar imediatamente a triagem da spec, sem exigir comando textual adicional.
- RF-04: apos clique valido em `/specs`, a mensagem da lista deve ser editada para destacar apenas a spec escolhida com `✅`.
- RF-05: apos clique valido em `/specs`, os botoes da mensagem clicada devem ser desabilitados para impedir reuso.
- RF-06: apos clique valido em `/specs`, o bot deve emitir confirmacao dupla: `answerCbQuery` e mensagem explicita no chat.
- RF-07: o fallback manual `/run_specs <arquivo>` deve permanecer funcional e documentado.
- RF-08: a listagem `/specs` deve manter paginacao navegavel com botoes de navegacao e sem quebra da elegibilidade.
- RF-09: no clique de `/specs`, a elegibilidade da spec deve ser revalidada em tempo real (`Status: approved` e `Spec treatment: pending`).
- RF-10: clique em spec nao elegivel no momento da validacao deve ser rejeitado com retorno observavel, sem iniciar triagem.
- RF-11: callbacks stale de `/specs` (mensagem antiga, pagina expirada, contexto invalido ou ja travado) devem ser rejeitados de forma idempotente.
- RF-12: durante execucao ativa do runner, clique de `/specs` deve respeitar gate de concorrencia e nao iniciar segunda rodada.
- RF-13: callbacks de `/specs` e `/plan_spec` devem aplicar o mesmo controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID`.
- RF-14: em `/plan_spec`, clique de opcao de pergunta deve editar a mensagem da pergunta marcando a opcao escolhida e travando botoes.
- RF-15: em `/plan_spec`, clique de acao final (`Criar spec`, `Refinar`, `Cancelar`) deve editar a mensagem de decisao final marcando a escolha e travando botoes.
- RF-16: em `/plan_spec`, todo clique valido deve emitir confirmacao dupla: `answerCbQuery` e mensagem explicita no chat.
- RF-17: callbacks stale em `/plan_spec` (pergunta ja respondida, fase encerrada, mensagem antiga ou sessao inativa) devem ser rejeitados com resposta observavel e sem efeitos colaterais.
- RF-18: mensagens de erro de callback devem distinguir minimamente causas de acesso negado, concorrencia, stale e inelegibilidade.
- RF-19: logs devem registrar tentativa de callback, validacoes aplicadas, decisao final e motivo de bloqueio quando houver.
- RF-20: logs devem incluir identificadores necessarios para rastreio operacional (chat, usuario, spec/sessao, acao e timestamp).
- RF-21: a edicao de mensagem para destaque/trava deve ser best effort; se a edicao falhar, o fluxo principal deve manter consistencia e registrar erro.
- RF-22: callbacks repetidos para mesma escolha ja confirmada devem ser tratados de forma idempotente.
- RF-23: o comportamento de destaque e confirmacao deve ser consistente entre `/specs` e `/plan_spec` para reduzir ambiguidade de UX.
- RF-24: a implementacao deve manter processamento sequencial de tickets/specs por projeto (sem paralelizacao no mesmo projeto), permitindo execucao paralela entre projetos quando houver capacidade no modo multi-runner conforme `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`.

## Nao-escopo
- Substituir ou remover `/run_specs <arquivo>`.
- Permitir selecao multipla de specs para execucao em lote.
- Suportar undo de escolha apos botoes travados na mesma mensagem.
- Alterar criterio de elegibilidade de spec alem de `Status: approved` e `Spec treatment: pending`.
- Introduzir paralelizacao de rodadas por click callback.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/specs` exibe lista paginada de specs elegiveis com um botao inline por item.
- [x] CA-02 - Clique valido em item de `/specs` inicia triagem da spec sem necessidade de `/run_specs <arquivo>`.
- [x] CA-03 - A mensagem de `/specs` clicada e editada marcando a spec escolhida com `✅`.
- [x] CA-04 - A mensagem de `/specs` clicada tem botoes travados apos confirmacao da escolha.
- [x] CA-05 - Clique valido em `/specs` retorna confirmacao dupla: toast (`answerCbQuery`) e mensagem no chat.
- [x] CA-06 - `/run_specs <arquivo>` continua funcionando como fallback manual apos introducao do clique em `/specs`.
- [x] CA-07 - Navegacao de paginacao em `/specs` continua funcional sem quebrar selecao por clique.
- [x] CA-08 - Clique em callback stale de `/specs` retorna bloqueio observavel e nao inicia triagem.
- [x] CA-09 - Clique em spec que perdeu elegibilidade entre listagem e clique retorna bloqueio observavel e nao inicia triagem.
- [x] CA-10 - Com runner em execucao ativa no mesmo projeto, clique de `/specs` retorna bloqueio de concorrencia e nao abre nova rodada.
- [x] CA-11 - Callback de chat nao autorizado em `/specs` ou `/plan_spec` e rejeitado por controle de acesso.
- [x] CA-12 - Clique em opcao de pergunta de `/plan_spec` edita a mensagem da pergunta, destaca a opcao e trava botoes.
- [x] CA-13 - Clique em acao final de `/plan_spec` edita a mensagem de decisao, destaca a acao e trava botoes.
- [x] CA-14 - Clique valido em `/plan_spec` retorna confirmacao dupla: toast (`answerCbQuery`) e mensagem no chat.
- [x] CA-15 - Callback stale em `/plan_spec` retorna bloqueio observavel e nao altera estado da sessao.
- [x] CA-16 - Logs permitem rastrear tentativa/resultado de clique em `/specs` e `/plan_spec`, incluindo causa de bloqueio quando aplicavel.
- [x] CA-21 - Falha de `editMessageText` durante lock visual de callback nao interrompe o fluxo principal e gera warning de observabilidade.
- [x] CA-22 - Callback repetido para a mesma mensagem/acao de `/plan_spec` e bloqueado de forma idempotente, sem reenviar input ao runner.
- [x] CA-23 - `/specs` e `/plan_spec` mantem padrao consistente de UX de callback com destaque da escolha, lock visual e confirmacao observavel.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - RF-01..RF-12 / CA-01..CA-10: `/specs` agora usa teclado inline paginado com callback contextual, revalidacao no clique, tratamento stale/idempotente, destaque de selecao e bloqueio de botoes.
  - RF-13 / CA-11: callbacks de `/specs` e `/plan_spec` respeitam `TELEGRAM_ALLOWED_CHAT_ID`, incluindo callback query.
  - RF-07 / CA-06: fallback manual `/run_specs <arquivo>` permanece funcional e documentado no bot.
  - RF-18..RF-20 / CA-16: callbacks de `/specs` e `/plan_spec` registram trilha padronizada `attempt -> validation -> decision`, com taxonomia minima de bloqueio (`access-denied`, `concurrency`, `stale`, `ineligible`, `invalid-action`, `inactive-session`) e campos operacionais (`chatId`, `userId` quando disponivel, `callbackData`, `action`, `specFileName|sessionId`, `result`).
  - RF-14..RF-17 / CA-12..CA-15: callbacks de `/plan_spec` agora validam contexto ativo por mensagem/sessao/fase, aplicam destaque+lock da escolha e fazem confirmacao dupla (toast + chat) nos caminhos aceitos.
  - RF-21..RF-23 / CA-21..CA-23: lock visual de `/plan_spec` opera em best effort com warning em falha de edicao; callbacks repetidos/stale nao reenviam input ao runner, mantendo consistencia de UX com `/specs`.
  - RF-24: sequencialidade desta spec fica definida por projeto (slot unico por projeto), com rastreabilidade explicita para o contrato multi-runner e sem bloqueio global entre projetos distintos quando houver capacidade.
- Itens parcialmente atendidos:
  - Nenhum.
- Pendencias em aberto:
  - Nenhuma pendencia funcional aberta nesta spec.
- Evidencias de validacao:
  - docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md
  - docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md
  - src/integrations/telegram-bot.ts
  - src/core/runner.ts
  - src/integrations/telegram-bot.test.ts
  - src/core/runner.test.ts
  - execplans/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md
  - npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts
  - npm test && npm run check && npm run build
  - tickets/closed/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md
  - tickets/closed/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md
  - tickets/closed/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md
  - tickets/closed/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md

## Riscos e impacto
- Risco funcional: callback fora de contexto iniciar fluxo incorreto se validacao stale for incompleta.
- Risco operacional: falha de travamento de botoes gerar cliques duplicados e ruido de execucao.
- Mitigacao: revalidacao no clique, idempotencia de callback, logs estruturados de decisao e testes de regressao para gates de concorrencia/acesso.

## Decisoes e trade-offs
- 2026-02-20 - Manter `/run_specs <arquivo>` como fallback manual - preserva operacao mesmo quando UX por clique nao for desejada.
- 2026-02-20 - Confirmacao dupla (toast + mensagem no chat) para todo clique valido - melhora feedback imediato e rastreabilidade conversacional.
- 2026-02-20 - Travar botoes apos escolha na mesma mensagem - reduz risco de duplicidade e torna estado visual explicito.
- 2026-02-20 - Revalidar elegibilidade e concorrencia no clique, nao apenas na listagem - evita acoes com estado desatualizado.
- 2026-02-20 - RF-24 alinhado para sequencialidade por projeto (nao global) - preserva contrato multi-runner vigente e evita bloqueio incorreto entre projetos.

## Historico de atualizacao
- 2026-02-20 22:12Z - Versao inicial da spec criada com status aprovado e tratamento pendente.
- 2026-02-20 22:19Z - Revisao de gaps concluida com abertura de 4 tickets (UX de clique em `/specs`, UX de callback em `/plan_spec`, observabilidade de callbacks e alinhamento do RF-24 com multi-runner).
- 2026-02-20 22:24Z - Validacao final da triagem concluida com `Status: approved` e `Spec treatment: done`, mantendo 4 pendencias rastreadas em `tickets/open/`.
- 2026-02-20 23:40Z - Recorte `/specs` entregue com callback inline, revalidacao no clique, stale/idempotencia, destaque/trava e cobertura automatizada CA-01..CA-10 (incluindo CA-11 para acesso em callback).
- 2026-02-20 23:59Z - Recorte de observabilidade de callbacks entregue com taxonomia minima de bloqueios e logs padronizados em `/specs` e `/plan_spec` (RF-18..RF-20, CA-16).
- 2026-02-20 23:09Z - Recorte `/plan_spec` entregue com contexto de callback por mensagem/sessao, destaque+lock de pergunta/final, confirmacao dupla em callbacks aceitos e cobertura CA-12, CA-13, CA-14, CA-15, CA-21, CA-22 e CA-23.
- 2026-02-20 23:19Z - RF-24 e criterio de concorrencia alinhados ao contrato multi-runner: sequencialidade definida por projeto e rastreada com a spec `2026-02-20-telegram-multi-project-parallel-runners`.
- 2026-02-20 23:22Z - Referencias do ticket RF-24 atualizadas para `tickets/closed/` apos fechamento operacional.
