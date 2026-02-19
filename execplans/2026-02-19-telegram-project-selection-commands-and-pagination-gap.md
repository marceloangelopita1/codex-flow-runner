# ExecPlan - Comandos Telegram de selecao de projeto e paginacao

## Purpose / Big Picture
- Objetivo: entregar RF-07, RF-08, RF-09 e RF-12 da spec `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`, adicionando comandos de selecao de projeto no Telegram com paginacao, callback inline, fallback textual e bloqueio durante execucao.
- Resultado esperado:
  - `/projects` lista projetos elegiveis em ordem alfabetica, com paginacao e marcador do projeto ativo (CA-02, CA-10).
  - Selecao por callback inline altera o projeto ativo global e persiste o estado (CA-03).
  - Selecao por `/select-project <nome>` altera o projeto ativo global e persiste o estado (CA-04).
  - Troca de projeto e bloqueada enquanto `isRunning=true`, sem alterar estado (CA-05).
  - Comandos de projeto e callbacks seguem o mesmo gate de `TELEGRAM_ALLOWED_CHAT_ID`, com log de auditoria para acesso nao autorizado (CA-09).
- Escopo:
  - Evoluir `TelegramController` para suportar `/projects`, `/select-project` e `callback_query` de teclado inline.
  - Introduzir uma camada pequena de negocio para listar/procurar/persistir projeto ativo usando componentes ja existentes (`project-discovery`, `active-project-store`, `active-project-resolver`).
  - Atualizar wiring em `src/main.ts` para injetar controles de projeto no bot.
  - Manter coerencia de `RunnerState.activeProject` apos selecao concluida para que `/status` reflita o projeto ativo sem depender de nova rodada.
  - Cobrir fluxos positivos e negativos em testes automatizados.
- Fora de escopo:
  - Execucao paralela de tickets ou de multiplos projetos na mesma rodada.
  - Mudancas no fluxo base `plan -> implement -> close-and-version`.
  - Mudancas no contrato de autenticacao do Codex CLI.

## Progress
- [x] 2026-02-19 18:08Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, spec e referencias de codigo/testes.
- [x] 2026-02-19 18:15Z - Camada `src/core/project-selection.ts` implementada e validada em `src/core/project-selection.test.ts`.
- [x] 2026-02-19 18:18Z - Comandos Telegram `/projects` e `/select-project` + callbacks inline implementados com bloqueio de troca/auditoria.
- [x] 2026-02-19 18:20Z - Validacao final (`npx tsx --test ...`, `npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 18:08Z - `src/integrations/telegram-bot.ts` ainda limita `ControlCommand` a cinco comandos e nao possui handler de `callback_query`, entao a UX de selecao nao existe hoje.
- 2026-02-19 18:08Z - O controle de acesso atual loga apenas `eventType: "command"`; callbacks inline tambem precisam entrar no mesmo trilho de auditoria.
- 2026-02-19 18:08Z - A fundacao multi-projeto ja esta pronta (`project-discovery`, `active-project-store`, `active-project-resolver`), entao a entrega pode reutilizar infra existente sem novas dependencias.
- 2026-02-19 18:08Z - `TicketRunner` resolve dependencias no inicio de cada `/run-all`; logo, persistir troca quando o runner estiver inativo e suficiente para a rodada seguinte, mas `/status` precisa ficar sincronizado imediatamente.
- 2026-02-19 18:16Z - Para manter `/status` coerente entre rodadas, foi necessario introduzir `runner.syncActiveProject` no estado em memoria apos selecao bem-sucedida.
- 2026-02-19 18:17Z - Callbacks de selecao precisam recarregar snapshot apos persistencia para refletir marcador visual atualizado da pagina.

## Decision Log
- 2026-02-19 - Decisao: manter regras de selecao em modulo de core pequeno e composavel, deixando `TelegramController` focado em parse/renderizacao.
  - Motivo: manter arquitetura em camadas e reduzir acoplamento de regra de negocio com API do Telegram.
  - Impacto: cria/expande interface de controle de projeto e facilita testes unitarios sem mock pesado de `Telegraf`.
- 2026-02-19 - Decisao: usar callback data curta e deterministica para paginacao/selecao (evitando payload longo com nome completo do projeto).
  - Motivo: limite de callback data do Telegram e necessidade de manter parser robusto.
  - Impacto: incluir parse/validacao defensiva para callback invalido ou stale.
- 2026-02-19 - Decisao: bloquear troca de projeto com resposta explicita quando `isRunning=true` em qualquer superficie (`/select-project` e callback).
  - Motivo: requisito RF-09/CA-05 e preservacao de rastreabilidade da rodada ativa.
  - Impacto: fluxo de selecao consulta estado do runner antes de persistir alteracao.
- 2026-02-19 - Decisao: apos selecao bem-sucedida em modo idle, sincronizar `RunnerState.activeProject` imediatamente.
  - Motivo: evitar divergencia entre projeto persistido e `/status` antes da proxima rodada.
  - Impacto: pequeno ajuste em controle do runner ou em closure de integracao para atualizar estado em memoria com seguranca.
- 2026-02-19 - Decisao: usar `projects:page:<n>` e `projects:select:<index>` como contrato de callback data.
  - Motivo: manter payload curto, previsivel e facil de validar defensivamente.
  - Impacto: parser dedicado com resposta segura para callback invalido/stale.
- 2026-02-19 - Decisao: manter bloqueio de troca em dois niveis (cheque no controller e retorno `blocked-running` no controle).
  - Motivo: reduzir janela de corrida entre comandos concorrentes (`/run-all` vs troca de projeto).
  - Impacto: respostas de bloqueio consistentes em comando textual e callback.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - A camada nova `project-selection` reduziu acoplamento e permitiu testar listagem/selecao sem depender de `Telegraf`.
  - `TelegramController` passou a cobrir `/projects`, `/select-project`, `callback_query`, paginacao e auditoria de acesso.
  - `TicketRunner` recebeu `syncActiveProject` para manter estado observavel coerente apos troca em idle.
  - Validacao focada e regressao completa ficaram verdes (`npx tsx --test ...`, `npm test`, `npm run check`, `npm run build`).
- O que ficou pendente:
  - Fechamento operacional do ticket (mover para `tickets/closed/` e commit/push) em etapa separada.
- Proximos passos:
  - Executar prompt de fechamento do ticket quando desejar consolidar commit/push.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts` - comandos atuais, acesso permitido, respostas e status.
  - `src/integrations/telegram-bot.test.ts` - cobertura atual do bot (sem paginacao/selecao).
  - `src/main.ts` - composicao de dependencias e injecao de controles no Telegram.
  - `src/core/runner.ts` - estado `isRunning` e projeto ativo usado no `/status`.
  - `src/integrations/project-discovery.ts` - fonte canonica da lista de projetos elegiveis.
  - `src/integrations/active-project-store.ts` - persistencia do projeto ativo global.
  - `src/core/active-project-resolver.ts` - restauracao/fallback do projeto ativo.
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md` - requisitos e criterios observaveis alvo.
- Fluxo atual relevante:
  - `/run-all`, `/status`, `/pause`, `/resume` ja existem com gate por `TELEGRAM_ALLOWED_CHAT_ID`.
  - Projeto ativo e resolvido no bootstrap e novamente no inicio de cada rodada.
  - Nao existe superficie Telegram para listar projetos nem trocar projeto ativo.
- Restricoes tecnicas:
  - Preservar processamento sequencial por ticket.
  - Sem dependencias novas.
  - Logs simples e legiveis, com contexto minimo de auditoria para bloqueios.

## Plan of Work
- Milestone 1 - Nucleo de selecao de projeto e contrato de controles
  - Entregavel: contrato claro para listar projetos + selecionar projeto ativo por nome, reaproveitando discovery/store/resolver e retornando erros acionaveis (`not-found`, `blocked-running`, `infra-error`).
  - Evidencia de conclusao: testes unitarios do modulo de selecao cobrindo sucesso, projeto inexistente e falhas de infraestrutura.
  - Arquivos esperados: `src/core/project-selection.ts` (novo), `src/core/project-selection.test.ts` (novo), ajustes em `src/main.ts`.
- Milestone 2 - `/projects` com paginacao e marcador de ativo
  - Entregavel: comando `/projects` renderiza lista paginada com teclado inline, destaque do projeto ativo e navegacao de paginas.
  - Evidencia de conclusao: testes do bot validam texto da lista, marcador de ativo e botoes de navegacao quando ha mais de uma pagina.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Selecao por callback inline e por comando textual
  - Entregavel: callbacks de selecao e `/select-project <nome>` persistem projeto ativo, respondem sucesso/erro claro e mantem contexto consistente.
  - Evidencia de conclusao: testes cobrindo CA-03 e CA-04, incluindo tentativa com nome invalido.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, possivel ajuste em `src/core/runner.ts` para sincronizacao imediata de estado.
- Milestone 4 - Bloqueio em execucao e auditoria de acesso
  - Entregavel: qualquer troca de projeto durante `isRunning=true` e bloqueada sem alterar estado; comandos/callbacks de projeto respeitam `TELEGRAM_ALLOWED_CHAT_ID` e logam metadados minimos.
  - Evidencia de conclusao: testes de bloqueio e acesso nao autorizado com asserts de log (`chatId`, `eventType`, `command`/`callbackData`).
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, possiveis ajustes de tipo para contexto de auditoria.
- Milestone 5 - Validacao completa e rastreabilidade de spec
  - Entregavel: suite verde, check/build verdes e spec atualizada marcando RF/CA atendidos por este ticket.
  - Evidencia de conclusao: comandos de validacao executados sem erro e diff objetivo na spec.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`, `README.md` (se houver ajuste de comandos documentados).

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "ControlCommand|isAllowed|registerHandlers|buildStartReply|RunnerState|resolveActiveProject|ActiveProjectStore|ProjectDiscovery" src` para mapear pontos exatos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/core/project-selection.ts` com operacoes de listagem e selecao persistida do projeto ativo.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/core/project-selection.test.ts` cobrindo: listagem ordenada com ativo, selecao valida, projeto inexistente e erro de discovery/store.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `BotControls` em `src/integrations/telegram-bot.ts` para incluir operacoes de projeto necessarias ao bot.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar no `TelegramController` o comando `/projects` com builder de mensagem paginada e inline keyboard (marcador visual do ativo + botoes de navegacao).
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar handler de `callback_query` para paginacao e selecao de projeto, com parser defensivo de callback data.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar comando `/select-project <nome>` com parse robusto do argumento, resposta de erro para entrada ausente/invalida e sucesso quando selecionado.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar bloqueio de troca quando `this.getState().isRunning === true` em ambos os caminhos de selecao (texto e callback).
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir `isAllowed`/contexto de auditoria para cobrir comandos de projeto e callbacks inline com metadados minimos.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/main.ts` para injetar a camada de selecao de projeto no `TelegramController` e sincronizar `RunnerState.activeProject` apos selecao concluida em modo idle.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com cenarios de `/projects`, paginacao, callback de selecao, `/select-project`, bloqueio por `isRunning` e acesso nao autorizado.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario, ajustar `src/core/runner.test.ts` para validar sincronizacao imediata de `activeProject` no estado apos troca fora de rodada.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/project-selection.test.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validacao focada.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-multi-project-active-selection.md` no bloco de status/evidencias para RF-07/RF-08/RF-09/RF-12 e CA-02/03/04/05/09/10.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/project-selection.ts src/core/project-selection.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/core/runner.ts src/core/runner.test.ts src/main.ts docs/specs/2026-02-19-telegram-multi-project-active-selection.md README.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/project-selection.test.ts`
  - Esperado: listagem de projetos e resolucao de projeto ativo funcionam com ordenacao deterministica; selecao valida persiste estado; nome inexistente retorna erro acionavel.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: `/projects` mostra projetos paginados e ativo (CA-02, CA-10); callback seleciona projeto e persiste (CA-03); `/select-project <nome>` funciona (CA-04); bloqueio durante `isRunning=true` preserva estado (CA-05); acessos nao autorizados sao bloqueados com log (CA-09).
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: estado do runner permanece coerente com o projeto ativo apos selecao em modo idle e sem regressao nas rodadas sequenciais.
- Comando: `npm test`
  - Esperado: suite completa verde, sem regressao dos comandos existentes (`/run-all`, `/pause`, `/resume`, `/status`).
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erro apos adicionar comandos/callbacks e novos contratos.
- Comando: `rg -n "RF-07|RF-08|RF-09|RF-12|CA-02|CA-03|CA-04|CA-05|CA-09|CA-10" docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - Esperado: spec atualizada com status e evidencias coerentes com os testes executados.

## Idempotence and Recovery
- Idempotencia:
  - Reexecutar `/projects` nao altera estado persistido; apenas consulta e renderiza.
  - Selecionar repetidamente o mesmo projeto deve manter resultado estavel e sem efeito colateral funcional.
  - Reexecutar testes/comandos de validacao nao altera comportamento alem de artefatos temporarios de teste.
- Riscos:
  - Callback data acima do limite ou parser fragil pode quebrar paginacao/selecao.
  - Mudanca de lista de projetos entre render e clique pode gerar callback stale.
  - Corrida entre inicio de `/run-all` e tentativa de troca pode causar UX ambigua sem bloqueio consistente.
  - Falhas de I/O no store podem deixar usuario sem confirmacao clara de troca.
- Recovery / Rollback:
  - Implementar com parser defensivo: callback invalido retorna pagina inicial e loga contexto, sem alterar projeto.
  - Em falha de persistencia (`save`), manter projeto anterior e responder erro acionavel ao operador.
  - Aplicar mudancas em ordem incremental (core -> telegram -> wiring -> testes) para facilitar isolamento de regressao.
  - Se um ajuste quebrar comandos existentes, restaurar temporariamente handler anterior do comando afetado e reintroduzir mudanca com teste dedicado.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`.
- Evidencias tecnicas consultadas:
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/main.ts`
  - `src/core/runner.ts`
  - `src/core/active-project-resolver.ts`
  - `src/integrations/project-discovery.ts`
  - `src/integrations/active-project-store.ts`
- Artefatos produzidos:
  - `src/core/project-selection.ts`
  - `src/core/project-selection.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/main.ts`
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - `README.md`
- Comandos de validacao executados:
  - `npx tsx --test src/core/project-selection.test.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts`
  - `npm test`
  - `npm run check`
  - `npm run build`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/integrations/telegram-bot.ts`
    - expandir `ControlCommand` para incluir `projects` e `select-project`.
    - evoluir `AccessAttemptContext` para suportar `command` e `callback_query`.
    - evoluir `BotControls` com operacoes de listagem/selecao de projeto.
  - `src/main.ts`
    - injetar implementacoes concretas de listagem/selecao (reuso de discovery/store/resolver).
    - manter estado do runner coerente apos troca de projeto em idle.
  - `src/core/project-selection.ts` (novo)
    - encapsular regra de listagem e selecao persistida com respostas discriminadas para o bot.
  - `src/core/runner.ts` (se necessario)
    - expor mecanismo seguro para sincronizar `activeProject` no estado quando nao ha rodada ativa.
- Compatibilidade:
  - Comandos existentes do bot devem manter semantica atual.
  - Fluxo sequencial por ticket permanece inalterado.
  - Troca de projeto em execucao continua proibida por regra de negocio.
- Dependencias externas e mocks:
  - Sem novas bibliotecas.
  - Reuso de `telegraf` para inline keyboard/callback query.
  - Testes com doubles locais para logger, controles e store/discovery (sem rede).
