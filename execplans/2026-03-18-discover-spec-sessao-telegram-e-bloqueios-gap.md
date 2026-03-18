# ExecPlan - Superficie Telegram e ciclo de sessao de /discover_spec

## Purpose / Big Picture
- Objetivo: introduzir a superficie Telegram e o lifecycle stateful minimo de `/discover_spec`, reutilizando a infraestrutura atual de `/plan_spec` para que o operador consiga iniciar, acompanhar, cancelar e bloquear concorrencia de forma coerente.
- Resultado esperado:
  - o bot registra `/discover_spec`, `/discover_spec_status` e `/discover_spec_cancel`, sempre sob `TELEGRAM_ALLOWED_CHAT_ID`;
  - o runner mantem no maximo uma sessao global `/discover_spec`, com snapshot do projeto ativo no start, timeout de 30 minutos, cancelamento e falha acionavel;
  - comandos concorrentes (`/plan_spec`, `/codex_chat`, `/run_all`, `/run_specs`, `/run_ticket` e troca de projeto) retornam bloqueio explicito enquanto `/discover_spec` estiver ativo;
  - o backend stateful continua baseado em `codex exec` / `codex exec resume --json` com `thread_id`, inclusive para observabilidade e repasse de raw output saneado.
- Escopo:
  - adicionar tipos/estado/fases de `/discover_spec` em `src/types/state.ts`;
  - estender `src/core/runner.ts` com start/status/cancel/input/timeout/guards de `/discover_spec`;
  - expor o fluxo em `src/integrations/telegram-bot.ts` e `src/main.ts`;
  - adaptar `src/integrations/codex-client.ts` para oferecer uma sessao stateful reutilizavel por `/discover_spec`;
  - adicionar cobertura automatizada focada nos closure criteria do ticket;
  - atualizar a spec de origem com rastreabilidade objetiva desta entrega quando o plano for executado.
- Fora de escopo:
- implementar o protocolo profundo de entrevista, categorias obrigatorias, gate de `Criar spec` e status de cobertura por categoria (ticket irmao `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`);
  - enriquecer materializacao de spec e trilha `spec_planning/` com campos finais de `/discover_spec` (ticket irmao `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`);
  - mudar o comportamento default de `/plan_spec` ou introduzir selecao automatica entre os dois fluxos;
  - tratar o `Cancelar` do bloco final enriquecido da entrevista; este plano cobre o comando `/discover_spec_cancel`.

## Progress
- [x] 2026-03-18 19:10Z - Planejamento inicial concluido com leitura integral do ticket alvo, `PLANS.md`, `docs/workflows/codex-quality-gates.md`, spec de origem e referencias de codigo.
- [x] 2026-03-18 19:32Z - Contratos de estado, runner e cliente Codex estendidos para `/discover_spec`, com sessao stateful dedicada, snapshot do projeto ativo, timeout, heartbeat, raw output saneado, retry hint especifico e bloqueios contra `/plan_spec`, `/codex_chat`, execucoes e troca de projeto.
- [x] 2026-03-18 19:37Z - Superficie Telegram (`/discover_spec`, `/discover_spec_status`, `/discover_spec_cancel`, `/start`, roteamento de texto livre e guards de projeto`) implementada e conectada em `src/main.ts`.
- [x] 2026-03-18 19:39Z - Cobertura automatizada ampliada em `runner`, `codex-client` e `telegram-bot` para start/status/cancel, brief inicial, bloqueios, timeout, falha acionavel e raw output saneado.
- [x] 2026-03-18 19:40Z - Matriz de validacao executada com sucesso e spec de origem atualizada para refletir atendimento parcial deste subconjunto.

## Surprises & Discoveries
- 2026-03-18 19:10Z - `src/integrations/telegram-bot.ts` hoje registra e roteia apenas `/plan_spec*` e `/codex_chat*`; `/discover_spec` exige alterar registro de comandos, help `/start`, roteamento de texto livre, replies de status e guards de troca de projeto.
- 2026-03-18 19:10Z - `src/core/runner.ts` concentra varios acoplamentos escondidos em `/plan_spec`: `RunnerSlotKind`, `RunnerPhase`, timeout, heartbeat, raw output, retry hints, bloqueio de projeto e lock global de texto livre.
- 2026-03-18 19:10Z - `src/main.ts` injeta apenas handlers Telegram de `/plan_spec` e `/codex_chat`; sem esse wiring a nova sessao nao consegue publicar pergunta, finalizacao, falha nem mensagens de lifecycle.
- 2026-03-18 19:10Z - A spec original distribui a entrega em 3 tickets; este plano precisa limitar `/discover_spec_status` a lifecycle/observabilidade da sessao, deixando cobertura de categorias para o ticket de entrevista profunda.
- 2026-03-18 19:33Z - A reutilizacao do backend stateful exigiu menos abstracao do que parecia: um wrapper dedicado de `/discover_spec` em cima de `codex exec` / `resume --json` foi suficiente para manter `thread_id`, logs, retry hint e raw output sem contaminar o contrato de `/plan_spec`.
- 2026-03-18 19:38Z - A maior lacuna remanescente nao era de implementacao, mas de evidencia: a suite de `telegram-bot.test.ts` ainda nao tinha casos especificos de `/discover_spec`, apesar do fluxo compilar e passar nos testes agregados.

## Decision Log
- 2026-03-18 - Decisao: reutilizar o backend stateful atual de `/plan_spec` por meio de um entry point ou modo dedicado de `/discover_spec`, em vez de criar um segundo backend.
  - Motivo: o closure criterion pede reaproveitamento de `codex exec` / `resume --json` com `thread_id`; duplicar a infraestrutura aumentaria risco sem ganho funcional.
  - Impacto: `src/integrations/codex-client.ts` deve extrair o minimo de parametrizacao necessario (nome do fluxo, retry hint, logs e parser compartilhado), preservando o comportamento de `/plan_spec`.
- 2026-03-18 - Decisao: manter comandos, estado e replies publicos distintos para `/discover_spec`, mesmo com compartilhamento interno de implementacao.
  - Motivo: os bloqueios operacionais e a observabilidade do ticket precisam continuar explicitos no nome do fluxo ativo.
  - Impacto: `src/types/state.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e testes terao tipos/resultados dedicados ou wrappers finos dedicados.
- 2026-03-18 - Decisao: tratar RF-22/CA-14 e CA-09 como fora do escopo desta entrega, apesar da linhagem da spec.
  - Motivo: o ticket alvo nao exige cobertura de categorias no status nem comportamento do botao final `Cancelar`; ambos dependem do ticket de entrevista/gate final.
  - Impacto: `/discover_spec_status` nesta entrega deve refletir apenas fase, projeto, timestamps e observabilidade equivalente a `/plan_spec`, sem inventar campos de categoria.
- 2026-03-18 - Decisao: ancorar a matriz de validacao exclusivamente nos closure criteria do ticket.
  - Motivo: seguir `docs/workflows/codex-quality-gates.md` e a instrucao operacional de evitar validacao generica desconectada do problema.
  - Impacto: testes e evidencias serao organizados pelos 5 grupos de closure criteria, e nao por checklist generico de suite completa.
- 2026-03-18 - Decisao: manter `/discover_spec` neste ticket como sessao textual stateful com observabilidade e raw output saneado, sem parser de categorias nem bloco final enriquecido.
  - Motivo: o ticket de sessao/Telegram precisa provar start, bloqueios, timeout, cancelamento, retry e repasse saneado; introduzir o protocolo profundo agora misturaria escopos com os tickets irmaos.
  - Impacto: `src/integrations/codex-client.ts` e `src/core/runner.ts` emitem eventos dedicados de lifecycle/output para `/discover_spec`, enquanto parsing estruturado e gate final permanecem fora deste changeset.

## Outcomes & Retrospective
- Status final: execucao concluida no working tree e fechamento validado como `GO`, permanecendo sem commit/push nesta etapa.
- O que funcionou: a infraestrutura stateful de `/plan_spec` permitiu introduzir `/discover_spec` com wrappers dedicados em estado, runner, cliente Codex, bot Telegram e wiring de `main`, preservando o fluxo sequencial e o slot do projeto ativo.
- O que foi validado: os 3 comandos da matriz passaram com sucesso.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts`
- O que ficou pendente por escopo declarado: categorias obrigatorias da entrevista, gate final `Criar spec`/`Cancelar` do bloco enriquecido e materializacao/rastreabilidade enriquecidas continuam nos tickets irmaos.
- Proximos passos: deixar o runner versionar o mesmo changeset de fechamento, usando este ExecPlan e os testes executados como evidencia.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts` - registro de comandos, help `/start`, checks de `TELEGRAM_ALLOWED_CHAT_ID`, roteamento de texto livre, replies de status/cancel e bloqueio de troca de projeto.
  - `src/main.ts` - injecao dos controles do runner e handlers que publicam perguntas/finalizacao/raw/failure/lifecycle no Telegram.
  - `src/core/runner.ts` - start/submit/cancel da sessao, lock global de texto livre, reserva de slot do projeto, timeout, heartbeat, raw output saneado, falha acionavel e guards para comandos concorrentes.
  - `src/types/state.ts` - `RunnerPhase`, `RunnerSlotKind`, shape de sessao stateful e clonagem do estado publico.
  - `src/integrations/codex-client.ts` - contrato do backend stateful `codex exec` / `resume --json`, `thread_id`, retry hint e parser compartilhado.
  - `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts` - suites onde os closure criteria devem virar evidencia automatizada.
- Spec de origem: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.
- RFs cobertos por este plano: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-23, RF-24, RF-25, RF-26, RF-27.
- CAs cobertos por este plano: CA-01, CA-03, CA-15, CA-16, CA-17, CA-18, CA-19.
- Itens da linhagem explicitamente fora deste plano:
  - RF-10..RF-22 e RF-28;
  - CA-02, CA-04..CA-14 e CA-20;
  - CA-09 quando interpretado como acao final `Cancelar` do bloco enriquecido.
- Assumptions / defaults adotados:
  - `/discover_spec` usa o mesmo modelo de sessao global unica ja praticado por `/plan_spec` e `/codex_chat`; nao ha simultaneidade entre fluxos de texto livre.
  - o estado publico de `/discover_spec` deve espelhar o nivel atual de observabilidade de `/plan_spec` (fase, projeto, timestamps, ultimo output/modelo), sem prometer ainda cobertura de categorias.
  - a primeira rodada funcional de `/discover_spec` pode reutilizar o parser/contrato stateful ja existente, desde que labels, retry hints e observabilidade sejam diferenciados por comando.
  - timeout de 30 minutos conta qualquer atividade do operador ou do Codex, preservando a semantica ja usada em `/plan_spec`.
- Fluxo atual:
  - `/plan_spec` ja reserva slot do projeto ativo, snapshota o projeto, inicia sessao stateful, controla timeout/heartbeat e publica pergunta/finalizacao/raw/failure no Telegram;
  - `/codex_chat` compartilha parte do lock global de texto livre;
  - troca de projeto por comando e callback bloqueia apenas `planSpecSession`, e o lock global no runner reconhece apenas `/plan_spec` e `/codex_chat`.
- Restricoes tecnicas:
  - manter fluxo sequencial e sem paralelizacao de tickets;
  - nao introduzir fallback automatico para backend alternativo em falha de `/discover_spec`;
  - preservar compatibilidade comportamental de `/plan_spec`;
  - manter o app preparado para execucao continua no host atual, sem depender de segredos commitados.

## Plan of Work
- Milestone 1: Estruturar `/discover_spec` como sessao stateful de primeira classe no estado e no runner.
  - Entregavel: tipos, fases, slot kind e resultados publicos do runner acomodam `/discover_spec`, com snapshot de projeto e guards de concorrencia equivalentes aos de `/plan_spec`.
  - Evidencia de conclusao: `src/types/state.ts` e `src/core/runner.ts` passam a expor e clonar `discoverSpecSession`; testes de runner provam sessao unica, snapshot de projeto e bloqueios.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2: Reaproveitar o backend stateful do Codex com identidade propria de `/discover_spec`.
  - Entregavel: `src/integrations/codex-client.ts` oferece start de sessao discover-specific ou parametrizada, preservando `codex exec` / `resume --json`, `thread_id`, retry hint e raw output saneado sem fallback.
  - Evidencia de conclusao: testes do cliente confirmam `thread_id`, retry hint `/discover_spec` e falha acionavel sem backend alternativo.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 3: Expor comandos Telegram, help, status e cancelamento de `/discover_spec`.
  - Entregavel: o bot registra os 3 novos comandos, respeita `TELEGRAM_ALLOWED_CHAT_ID`, roteia a primeira mensagem livre como brief inicial e publica status/cancelamento especificos.
  - Evidencia de conclusao: `src/integrations/telegram-bot.test.ts` cobre chat autorizado e nao autorizado para start/status/cancel.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/main.ts`.
- Milestone 4: Fechar bloqueios operacionais e observabilidade equivalentes a `/plan_spec`.
  - Entregavel: `/discover_spec` bloqueia `/plan_spec`, `/codex_chat`, `/run_all`, `/run_specs`, `/run_ticket` e troca de projeto; timeout, raw output saneado e falha acionavel sao emitidos com labels corretos.
  - Evidencia de conclusao: testes do runner e do bot provam bloqueios, timeout de 30 minutos, repasse de raw output e mensagens de retry.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.ts`, `src/main.ts`.
- Milestone 5: Atualizar rastreabilidade da spec sem ampliar escopo do ticket.
  - Entregavel: a spec de origem registra atendimento parcial deste subconjunto (sessao/Telegram/bloqueios) e mantem os tickets irmaos como pendencias abertas.
  - Evidencia de conclusao: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` referencia o ticket/execplan e move apenas os itens deste escopo para atendidos.
  - Arquivos esperados: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "plan_spec|codex_chat|discover_spec|planSpecSession|codexChatSession" src/core/runner.ts src/integrations/telegram-bot.ts src/types/state.ts src/integrations/codex-client.ts src/main.ts` para mapear todos os pontos em que `/plan_spec` esta hardcoded e `/discover_spec` precisa entrar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/state.ts` para adicionar fases/sessao de `/discover_spec`, atualizar `RunnerSlotKind` e garantir que `createInitialState` e o clone publico do estado incluam a nova sessao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.ts` para introduzir `startDiscoverSpecSession`, `submitDiscoverSpecInput`, `cancelDiscoverSpecSession`, timeout/heartbeat/raw output/failure/lifecycle de `/discover_spec`, e generalizar os helpers de lock global e bloqueio de troca de projeto.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/codex-client.ts` para expor um start discover-specific ou parametrizado, com logs/retry hint `/discover_spec`, mantendo `codex exec` / `resume --json` com `thread_id` e sem fallback automatico.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/main.ts` para injetar controles e event handlers de `/discover_spec` no `TelegramController`, reutilizando a mesma infraestrutura de envio usada por `/plan_spec`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/telegram-bot.ts` para registrar `/discover_spec`, `/discover_spec_status` e `/discover_spec_cancel`, atualizar help `/start`, replies de status/cancel, roteamento da primeira mensagem livre e bloqueios de troca de projeto por comando/callback.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/codex-client.test.ts` para transformar cada grupo de closure criteria em casos de teste dedicados, incluindo stubs/doubles necessarios.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts` para validar o subconjunto funcional do ticket.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` para registrar atendimento parcial apenas dos RFs/CAs deste ticket e manter rastreabilidade com este execplan.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "discover-spec-sessao-telegram-e-bloqueios-gap|discover_spec|RF-01|RF-27|CA-19" docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md src/core/runner.ts src/integrations/telegram-bot.ts src/integrations/codex-client.ts` para auditoria final de rastreabilidade e superficies alteradas.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/types/state.ts src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/main.ts docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` para revisao final antes da execucao do ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:

| Requisito / closure criterion | Validacao observavel |
| --- | --- |
| RF-01, RF-02, RF-23, RF-27; CA-01, CA-15, CA-17 | `src/integrations/telegram-bot.test.ts` prova que `/discover_spec`, `/discover_spec_status` e `/discover_spec_cancel` existem, aceitam chat autorizado, negam chat nao autorizado e devolvem replies coerentes de start/status/cancel. |
| RF-03, RF-04, RF-08, RF-09; CA-01 | `src/core/runner.test.ts` prova sessao global unica, snapshot do projeto ativo e primeira mensagem livre tratada como brief; `src/integrations/codex-client.test.ts` prova reutilizacao do backend stateful com `thread_id` em `codex exec` / `resume --json`. |
| RF-05, RF-06, RF-07; CA-03 | `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` provam bloqueio explicito para `/plan_spec`, `/codex_chat`, `/run_all`, `/run_specs`, `/run_ticket` e troca de projeto por comando/callback quando `/discover_spec` esta ativo. |
| RF-24, RF-25; CA-16, CA-18 | `src/core/runner.test.ts` prova timeout automatico apos 30 minutos e mensagem ao operador; `src/integrations/codex-client.test.ts` e/ou `src/core/runner.test.ts` provam erro acionavel com retry `/discover_spec` e ausencia de fallback automatico. |
| RF-26; CA-19 | `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` provam repasse de raw output saneado no Telegram e logs/lifecycle equivalentes ao fluxo atual de `/plan_spec`. |

- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: casos novos de `/discover_spec`, `/discover_spec_status` e `/discover_spec_cancel` passam em chat autorizado e falham com resposta de acesso negado em chat nao autorizado, cobrindo RF-01, RF-02, RF-23, RF-27, CA-01, CA-15 e CA-17.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: casos novos comprovam sessao global unica com snapshot de projeto, brief inicial na primeira mensagem livre, bloqueios de `/plan_spec` `/codex_chat` `/run_all` `/run_specs` `/run_ticket` e troca de projeto, timeout de 30 minutos, falha acionavel e repasse raw saneado, cobrindo RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-24, RF-25, RF-26, CA-01, CA-03, CA-16, CA-18 e CA-19.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: casos novos comprovam que `/discover_spec` reutiliza `codex exec` / `resume --json` com `thread_id`, emite retry hint especifico do comando e nao usa fallback automatico, cobrindo RF-09, RF-25, CA-01 e CA-18.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os testes focados nao cria side effects persistentes fora dos stubs/doubles;
  - reiniciar `/discover_spec` apos cancelamento ou timeout deve limpar completamente `discoverSpecSession` e liberar o slot do projeto;
  - a reutilizacao do backend stateful deve permitir repeticao do fluxo sem trocar contrato do `thread_id`.
- Riscos:
  - over-abstract de `/plan_spec` e `/discover_spec` pode aumentar o diff e abrir regressao em um fluxo ja estavel;
  - esquecer um dos pontos de acoplamento escondidos (`RunnerSlotKind`, `/start`, `/status`, troca de projeto por callback, retry hint, raw output) gera comportamento parcialmente funcional;
  - tentar antecipar RF-22/CA-14 neste ticket pode misturar escopos e atrasar a entrega.
- Recovery / Rollback:
  - extrair apenas helpers pequenos e parametrizados; se a generalizacao comecar a contaminar `/plan_spec`, voltar para wrappers finos por fluxo mantendo o backend compartilhado;
  - se a extensao do cliente Codex quebrar `/plan_spec`, preservar o contrato publico atual e introduzir `startDiscoverSpecSession` como alias dedicado antes de generalizar mais;
  - se algum closure criterion depender de informacao ainda ausente no ticket irmao (ex.: categorias no status), registrar blocker explicito e nao preencher o gap com comportamento inventado.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md`.
- Spec de referencia: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.
- Tickets relacionados para nao sobrepor escopo:
  - `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`
  - `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`
- Evidencias usadas no planejamento:
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/types/state.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/main.ts`
- Nota de escopo: ao executar este plano, manter `/discover_spec_status` no nivel de lifecycle/observabilidade atual; cobertura de categorias obrigatorias e gate final continuam fora deste ticket.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `RunnerState`, `RunnerPhase`, `RunnerSlotKind` e o shape publico da nova `discoverSpecSession`.
  - API publica do runner para `startDiscoverSpecSession`, `submitDiscoverSpecInput`, `cancelDiscoverSpecSession` e possiveis resultados tipados de bloqueio.
  - `BotControls` e wiring de `src/main.ts` para transportar o novo fluxo entre runner e Telegram.
  - `CodexTicketFlowClient` para iniciar a sessao stateful de `/discover_spec` sem romper `startPlanSession` e `startFreeChatSession`.
- Compatibilidade:
  - `/plan_spec` precisa continuar funcional e leve, sem adotar as mensagens/comandos de `/discover_spec`;
  - o lock global de texto livre deve reconhecer 3 fluxos (`/discover_spec`, `/plan_spec`, `/codex_chat`) sem permitir sobreposicao;
  - comandos de execucao continuam sequenciais e bloqueados pelo slot do projeto quando a sessao discover estiver ativa.
- Dependencias externas e mocks:
  - dependencia operacional principal continua sendo o Codex CLI em modo `exec` / `resume --json`;
  - Telegram segue mockado em `src/integrations/telegram-bot.test.ts`;
  - testes do runner e do cliente devem continuar usando stubs/doubles de sessao stateful para evitar chamadas reais ao Codex e ao Telegram.
