# [SPEC] Paralelizacao por projeto com ate 5 runners no Telegram

## Metadata
- Spec ID: 2026-02-20-telegram-multi-project-parallel-runners
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-20 15:44Z
- Last reviewed at (UTC): 2026-03-20 01:44Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-20-multi-runner-core-capacity-and-slot-locks-gap.md
  - tickets/closed/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md
  - tickets/closed/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md
  - tickets/closed/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md
- Related execplans:
  - execplans/2026-02-20-multi-runner-core-capacity-and-slot-locks-gap.md
  - execplans/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md
  - execplans/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: o runner atual aceita multiplos projetos elegiveis, mas executa apenas uma rodada global por vez. Isso impede operar projetos diferentes em paralelo.
- Resultado esperado: permitir execucao concorrente entre projetos diferentes, com limite de 5 runners ativos por instancia, preservando a regra de sequencialidade dentro de cada projeto.
- Contexto funcional: esta evolucao substitui a restricao de concorrencia global do runner unico e preserva a rastreabilidade operacional por projeto no Telegram.

## Jornada de uso
1. Operador autorizado seleciona `alpha-project` e envia `/run_all`.
2. Enquanto `alpha-project` esta em execucao, operador seleciona `beta-project` e envia `/run_specs <arquivo>.md`.
3. O sistema aceita ambas as execucoes por serem projetos distintos e mostra o consumo de capacidade de runners ativos.
4. Operador recebe notificacoes de fim de ticket com identificacao explicita do projeto para nao confundir eventos simultaneos.
5. Se tentar iniciar outro fluxo no mesmo projeto ocupado, o sistema bloqueia com retorno acionavel.
6. Se tentar iniciar um sexto projeto enquanto ja existem 5 runners ativos, o sistema bloqueia o inicio e informa os projetos em execucao.

## Requisitos funcionais
- RF-01: a instancia deve permitir ate 5 runners ativos simultaneamente, desde que em projetos distintos.
- RF-02: a execucao de tickets deve continuar sequencial dentro de cada projeto (sem paralelizacao de tickets).
- RF-03: deve existir apenas 1 slot ativo por projeto para os fluxos `/run_all`, `/run_specs` e `/plan_spec`.
- RF-04: tentativa de iniciar novo fluxo em projeto que ja possui slot ativo deve retornar bloqueio explicito sem criar nova execucao.
- RF-05: quando houver 5 runners ativos e o projeto alvo ainda nao tiver slot, o inicio deve ser bloqueado com mensagem clara e lista de projetos ativos.
- RF-06: ao atingir o limite de 5, nao deve haver fila automatica nem substituicao automatica de runner ativo.
- RF-07: `/run_all` e `/run_specs` devem poder executar em paralelo quando disparados para projetos diferentes e com capacidade disponivel.
- RF-08: `/plan_spec` deve permanecer com no maximo 1 sessao global ativa por instancia.
- RF-09: a sessao global de `/plan_spec` pode coexistir com `/run_all` e `/run_specs` em outros projetos, respeitando limite de capacidade.
- RF-10: tentativa de iniciar um segundo `/plan_spec` em qualquer projeto enquanto houver sessao ativa deve ser bloqueada com mensagem explicita.
- RF-11: `/status` deve manter visao detalhada do projeto ativo e incluir visao global dos runners ativos com indicador `N/5`.
- RF-12: `/pause` e `/resume` devem atuar apenas no runner do projeto ativo no momento do comando.
- RF-13: `/projects` e `/select_project` devem permanecer disponiveis durante execucao em outros projetos.
- RF-14: notificacoes finais por ticket devem discriminar projeto de forma explicita no texto, incluindo nome e caminho.
- RF-15: logs operacionais devem registrar eventos de inicio/fim/erro com contexto do projeto associado.
- RF-16: `TELEGRAM_ALLOWED_CHAT_ID` deve ser obrigatorio no bootstrap para o modo multi-runner suportado por esta spec.
- RF-17: controle de acesso por chat deve continuar aplicado a comandos e callbacks do Telegram.
- RF-18: contratos existentes de aliases (`/run-all`, `/select-project`) devem continuar compativeis.

## Nao-escopo
- Paralelizacao de tickets dentro do mesmo projeto.
- Aumentar limite de 5 runners ativos nesta entrega.
- Fila automatica para iniciar projeto quando capacidade voltar.
- Encerramento forcado automatico de runner para abrir vaga.
- Suporte oficial ao modo Telegram sem `TELEGRAM_ALLOWED_CHAT_ID`.
- Multiplas sessoes simultaneas de `/plan_spec`.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Com `alpha-project` e `beta-project`, `/run_all` em `alpha` e `/run_all` em `beta` iniciam sem bloquear um ao outro.
- [x] CA-02 - Com runner ativo em `alpha-project`, novo `/run_all` ou `/run_specs` em `alpha-project` retorna bloqueio de slot ja ocupado.
- [x] CA-03 - Com 5 projetos ativos, tentativa de iniciar execucao em sexto projeto retorna bloqueio de capacidade maxima com lista de projetos ativos.
- [x] CA-04 - Ao finalizar um runner ativo e liberar vaga, novo start em outro projeto passa a ser aceito.
- [x] CA-05 - `/status` exibe dados detalhados do projeto ativo e painel global de runners com indicador `N/5`.
- [x] CA-06 - `/pause` e `/resume` enviados com projeto `beta` ativo nao alteram estado do runner de `alpha`.
- [x] CA-07 - Troca de projeto via `/select_project` e callbacks de `/projects` funciona mesmo com execucao ativa em projeto diferente.
- [x] CA-08 - `/plan_spec` ativo em um projeto nao bloqueia `/run_all` em outro projeto com capacidade disponivel.
- [x] CA-09 - Durante `/plan_spec` ativo, nova tentativa de `/plan_spec` em qualquer projeto retorna bloqueio explicito.
- [x] CA-10 - Mensagem de resumo final por ticket identifica explicitamente o projeto no proprio texto da notificacao.
- [x] CA-11 - Sem `TELEGRAM_ALLOWED_CHAT_ID`, bootstrap falha com erro claro de configuracao obrigatoria.
- [x] CA-12 - Chat nao autorizado continua bloqueado para comandos e callbacks do bot.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Matriz RF:
  - Atendidos: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Matriz CA:
  - Atendidos: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-12.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Itens atendidos:
  - Descoberta de projetos elegiveis e projeto ativo global persistido ja existem.
  - Nucleo multi-runner por projeto implementado com limite global fixo de 5 slots e bloqueio acionavel sem fila automatica.
  - `/run_all` e `/run_specs` executam em paralelo para projetos distintos, mantendo sequencialidade de tickets por projeto.
  - `/plan_spec` continua com sessao global unica e bloqueio explicito para segunda tentativa, coexistindo com `/run_all` em outro projeto quando ha capacidade.
  - `/status` agora combina detalhes do projeto ativo com painel global de capacidade (`N/5`) e listagem de slots ativos.
  - `/pause` e `/resume` passaram a atuar apenas no slot do projeto ativo, sem alterar runners de outros projetos.
  - `/select_project` e callbacks de `/projects` permanecem operaveis durante execucao em outro projeto, mantendo bloqueio apenas para sessao `/plan_spec` ativa.
  - Resumo final por ticket e logs operacionais ja incluem nome/caminho do projeto.
  - Bootstrap falha cedo quando `TELEGRAM_ALLOWED_CHAT_ID` nao esta configurado.
  - Controle de acesso por chat segue aplicado a comandos e callbacks quando `TELEGRAM_ALLOWED_CHAT_ID` esta configurado.
  - RF-02 desta spec passa a ser referencia explicita para a semantica do RF-24 em `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` (sequencialidade por projeto, nao global).
- Pendencias em aberto:
  - Nenhuma pendencia funcional aberta nesta spec.
- Evidencias de validacao:
  - src/main.ts
  - src/core/runner.ts
  - src/core/runner.test.ts
  - execplans/2026-02-20-multi-runner-core-capacity-and-slot-locks-gap.md
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
  - src/config/env.ts
  - src/config/env.test.ts
  - execplans/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md
  - execplans/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md
  - docs/specs/2026-02-19-telegram-multi-project-active-selection.md
  - docs/specs/2026-02-19-telegram-run-status-notification.md

## Riscos e impacto
- Risco funcional: conflito de estado ao iniciar fluxos quase simultaneos para o mesmo projeto.
- Risco operacional: excesso de mensagens concorrentes no Telegram sem contexto visual forte de projeto.
- Mitigacao: lock por projeto, limite global de slots, notificacao com discriminacao explicita de projeto e cobertura de testes de concorrencia.

## Decisoes e trade-offs
- 2026-02-20 - Adotar arquitetura de 1 processo com gerenciador multi-runner por projeto - mantem operacao centralizada em um unico bot.
- 2026-02-20 - Limite fixo de 5 runners ativos com bloqueio no excedente - simplifica operacao inicial e evita saturacao descontrolada.
- 2026-02-20 - Slot unico por projeto para `/run_all`, `/run_specs` e `/plan_spec` - reduz risco de conflito no mesmo codebase.
- 2026-02-20 - Manter apenas 1 sessao global de `/plan_spec` - evita ambiguidade de roteamento de mensagens livres no Telegram.
- 2026-02-20 - `/status` com foco no projeto ativo + painel global - preserva ergonomia atual sem perder visibilidade multiprojeto.
- 2026-02-20 - `/pause` e `/resume` com escopo do projeto ativo - evita efeito colateral em runners nao relacionados.
- 2026-02-20 - Tornar `TELEGRAM_ALLOWED_CHAT_ID` obrigatorio para esta evolucao - reforca previsibilidade operacional no modo paralelo.
- 2026-02-20 - Formalizar rastreabilidade com RF-24 da spec de UX por clique - evita interpretacao de sequencialidade global conflitante com o contrato multi-runner.

## Historico de atualizacao
- 2026-02-20 15:44Z - Versao inicial da spec criada e aprovada para derivacao tecnica.
- 2026-02-20 15:51Z - Revisao de gaps concluida com matriz RF/CA atualizada e abertura de tickets de backlog para nucleo multi-runner, contrato Telegram e exigencia de `TELEGRAM_ALLOWED_CHAT_ID`.
- 2026-02-20 16:14Z - Core multi-runner entregue com limite global de 5 slots, lock por projeto e cobertura automatizada de CA-01/02/03/04/08/09.
- 2026-02-20 16:23Z - Bootstrap passou a exigir `TELEGRAM_ALLOWED_CHAT_ID` via `parseEnv`, com cobertura de testes para ausencia/valor vazio e preservacao do bloqueio de acesso no Telegram.
- 2026-02-20 16:42Z - Contrato Telegram multi-runner concluido com painel global `N/5` em `/status`, `/pause` e `/resume` por projeto ativo, e troca de projeto liberada durante execucao em outros projetos com cobertura de CA-05/06/07.
- 2026-02-20 23:19Z - Rastreabilidade cruzada adicionada para o ticket de alinhamento do RF-24 na spec de UX por clique, reafirmando que a sequencialidade oficial e por projeto.
- 2026-02-20 23:22Z - Referencia do ticket RF-24 atualizada para `tickets/closed/` apos fechamento operacional.
- 2026-03-20 01:44Z - Spec encerrada documentalmente como atendida; todos os tickets derivados desta frente foram consolidados como fechados.
