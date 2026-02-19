# [SPEC] Controle multi-projeto no Telegram com projeto ativo global

## Metadata
- Spec ID: 2026-02-19-telegram-multi-project-active-selection
- Status: approved
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-19 17:25Z
- Last reviewed at (UTC): 2026-02-19 18:20Z
- Source: product-need
- Related tickets:
  - tickets/open/2026-02-19-projects-root-discovery-and-active-state-foundation-gap.md
  - tickets/open/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md
  - tickets/open/2026-02-19-active-project-context-in-runner-status-and-final-summary-gap.md
- Related execplans:
  - execplans/2026-02-19-active-project-context-in-runner-status-and-final-summary-gap.md
  - execplans/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: o runner opera com um unico repositorio (`REPO_PATH`) e nao permite trocar o projeto alvo pelo Telegram.
- Resultado esperado: operador consegue listar projetos elegiveis em `/home/mapita/projetos`, selecionar um projeto ativo por clique (ou comando textual) e executar o fluxo sequencial no projeto selecionado.
- Contexto funcional: manter o runner com processamento sequencial por ticket, adicionando camada de selecao de projeto para operacao remota.

## Jornada de uso
1. Operador configura `PROJECTS_ROOT_PATH=/home/mapita/projetos` e inicia o runner.
2. Runner descobre projetos validos no diretorio raiz e define um projeto ativo global.
3. Operador envia `/projects` para listar projetos e seleciona o desejado por botao inline.
4. Operador dispara `/run-all`; o ciclo `plan -> implement -> close-and-version` roda somente no projeto ativo.
5. Operador acompanha `/status` e notificacoes finais por ticket com identificacao do projeto ativo.

## Requisitos funcionais
- RF-01: substituir `REPO_PATH` por `PROJECTS_ROOT_PATH` como configuracao obrigatoria de ambiente.
- RF-02: listar apenas projetos validos no primeiro nivel de `PROJECTS_ROOT_PATH`.
- RF-03: considerar projeto valido quando existir repositorio git local (`.git`) e pasta `tickets/open/`.
- RF-04: manter exatamente um projeto ativo global quando houver ao menos um projeto valido.
- RF-05: persistir projeto ativo para sobreviver restart do processo.
- RF-06: no bootstrap, restaurar projeto ativo persistido quando ainda valido; caso contrario, usar o primeiro projeto valido em ordem alfabetica.
- RF-07: expor comando `/projects` com listagem paginada e selecao por clique (inline keyboard), marcando visualmente o projeto ativo.
- RF-08: expor comando `/select-project <nome-do-projeto>` como fallback textual para selecao.
- RF-09: bloquear troca de projeto enquanto houver rodada em execucao (`isRunning=true`).
- RF-10: manter `/run-all`, `/pause`, `/resume` e `/status` operando sobre o projeto ativo.
- RF-11: incluir projeto ativo em `/status` e no resumo final por ticket enviado no Telegram.
- RF-12: aplicar o mesmo controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID` aos comandos `/projects` e `/select-project`.
- RF-13: incluir o proprio `codex-flow-runner` na listagem quando ele atender os criterios de projeto valido.

## Nao-escopo
- Execucao paralela de tickets.
- Execucao simultanea de multiplos projetos na mesma rodada.
- Projeto ativo separado por chat/usuario (escopo e global unico por instancia).
- Fallback de compatibilidade para `REPO_PATH` (migracao sera quebra direta).

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Sem `PROJECTS_ROOT_PATH`, o bootstrap falha com erro claro de configuracao obrigatoria.
- [x] CA-02 - `/projects` lista apenas projetos validos em ordem alfabetica e indica o projeto ativo.
- [x] CA-03 - Selecionar projeto por botao inline altera o projeto ativo e persiste o estado.
- [x] CA-04 - Selecionar projeto por `/select-project <nome>` altera o projeto ativo e persiste o estado.
- [x] CA-05 - Durante execucao em andamento, tentativa de troca responde bloqueio e nao altera o projeto ativo.
- [x] CA-06 - Apos restart, runner restaura projeto ativo anterior; se invalido, aplica fallback para o primeiro valido.
- [x] CA-07 - `/run-all` processa tickets apenas do projeto ativo, sem misturar estado de outro projeto.
- [x] CA-08 - `/status` e resumo final por ticket exibem identificacao do projeto (nome e caminho base).
- [x] CA-09 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chats nao autorizados nao conseguem usar comandos de projeto e geram log de auditoria.
- [x] CA-10 - Quando a quantidade de projetos exceder uma pagina, `/projects` permite navegar por paginas sem perder contexto de selecao.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Fluxo sequencial por ticket (`plan -> implement -> close-and-version`) ja esta implementado no runner.
  - Comandos `/run-all`, `/pause`, `/resume` e `/status` ja existem no bot com controle por `TELEGRAM_ALLOWED_CHAT_ID`.
  - Notificacao final por ticket e `/status` exibem contexto explicito do projeto ativo (nome + caminho base).
  - RF-01 atendido: `PROJECTS_ROOT_PATH` obrigatorio em `src/config/env.ts`, sem fallback para `REPO_PATH`.
  - RF-02 e RF-03 atendidos: descoberta de projetos validos no primeiro nivel via `src/integrations/project-discovery.ts` com criterio `.git` + `tickets/open`.
  - RF-04, RF-05 e RF-06 atendidos: resolucao de projeto ativo global com persistencia/restauracao e fallback alfabetico em `src/core/active-project-resolver.ts` e `src/integrations/active-project-store.ts`.
  - RF-10 atendido: `TicketRunner` resolve/aplica dependencias por projeto ativo no inicio de cada rodada, mantendo `/run-all`, `/pause`, `/resume` e `/status` coerentes com o projeto corrente.
  - RF-11 atendido: `RunnerState` e `TicketFinalSummary` carregam contexto de projeto ativo, refletido em `/status` e no resumo final enviado no Telegram.
  - RF-07 atendido: `TelegramController` expoe `/projects` com listagem paginada, callback inline e marcacao visual do projeto ativo.
  - RF-08 atendido: `TelegramController` expoe `/select-project <nome>` como fallback textual para selecao.
  - RF-09 atendido: troca de projeto por comando textual/callback e bloqueada durante `isRunning=true`.
  - RF-12 atendido: gate de `TELEGRAM_ALLOWED_CHAT_ID` cobre comandos de projeto e callbacks inline com auditoria de metadados.
  - RF-13 atendido: `codex-flow-runner` entra na descoberta quando cumprir criterio de elegibilidade, coberto em `src/integrations/project-discovery.test.ts`.
  - CA-01 e CA-06 validados por testes automatizados (`src/config/env.test.ts`, `src/core/active-project-resolver.test.ts`, `src/integrations/active-project-store.test.ts`).
  - CA-07 e CA-08 validados por testes automatizados (`src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`).
  - CA-02, CA-03, CA-04, CA-05, CA-09 e CA-10 validados por testes automatizados (`src/integrations/telegram-bot.test.ts`, `src/core/project-selection.test.ts`, `src/core/runner.test.ts`).
- Pendencias em aberto:
  - Nenhuma pendencia tecnica aberta nesta spec; permanece pendente apenas o fechamento operacional dos tickets relacionados.
- Evidencias de validacao:
  - src/config/env.ts
  - src/config/env.test.ts
  - src/main.ts
  - src/core/project-selection.ts
  - src/core/project-selection.test.ts
  - src/core/active-project-resolver.ts
  - src/core/active-project-resolver.test.ts
  - src/integrations/project-discovery.ts
  - src/integrations/project-discovery.test.ts
  - src/integrations/active-project-store.ts
  - src/integrations/active-project-store.test.ts
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
  - src/types/state.ts
  - src/types/ticket-final-summary.ts
  - README.md
  - tickets/open/2026-02-19-projects-root-discovery-and-active-state-foundation-gap.md
  - tickets/open/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md
  - tickets/open/2026-02-19-active-project-context-in-runner-status-and-final-summary-gap.md

## Riscos e impacto
- Risco funcional: listar projeto invalido e permitir selecao de alvo que nao roda o fluxo.
- Risco operacional: troca de projeto em meio a rodada causar perda de rastreabilidade.
- Mitigacao: criterio estrito de elegibilidade, bloqueio de troca durante execucao e testes de regressao do fluxo sequencial.

## Decisoes e trade-offs
- 2026-02-19 - Projeto ativo global unico (nao por chat) - simplifica estado operacional e reduz complexidade de concorrencia.
- 2026-02-19 - Selecao principal por clique em `/projects`, com `/select-project` como fallback - melhora UX sem remover canal textual.
- 2026-02-19 - Paginacao da listagem de projetos - evita mensagens longas e limite de teclado inline.
- 2026-02-19 - Migracao com quebra direta para `PROJECTS_ROOT_PATH` - elimina ambiguidades de compatibilidade com `REPO_PATH`.
- 2026-02-19 - Bloqueio de troca de projeto enquanto runner esta em execucao - preserva coerencia e rastreabilidade da rodada.

## Historico de atualizacao
- 2026-02-19 17:25Z - Versao inicial da spec criada e aprovada para derivacao.
- 2026-02-19 17:30Z - Revisao de gaps concluida com abertura de tres tickets para fundacao multi-projeto, comandos Telegram de selecao/paginacao e propagacao de contexto do projeto ativo.
- 2026-02-19 17:40Z - Fundacao multi-projeto implementada (RF-01..RF-06/RF-13) com validacao de CA-01 e CA-06.
- 2026-02-19 18:03Z - RF-10/RF-11 implementados com resolucao de projeto por rodada no runner e contexto de projeto ativo em `/status` e resumo final; CA-07/CA-08 validados por testes.
- 2026-02-19 18:20Z - RF-07/RF-08/RF-09/RF-12 implementados com `/projects` paginado, selecao via callback e `/select-project`, bloqueio durante execucao e auditoria de acesso; CA-02/CA-03/CA-04/CA-05/CA-09/CA-10 validados por testes.
