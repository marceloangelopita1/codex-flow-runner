# ExecPlan - Telegram run-all access control gap

## Purpose / Big Picture
- Objetivo: implementar o comando `/run-all` no bot Telegram e fechar o gap de controle de acesso em toda a superficie de comandos operacionais.
- Resultado esperado: `/run-all`, `/status`, `/pause` e `/resume` passam pelo mesmo gate de autorizacao por `TELEGRAM_ALLOWED_CHAT_ID`; comando autorizado inicia rodada sequencial; comando nao autorizado nao altera estado do runner.
- Escopo:
  - Adicionar `/run-all` no `TelegramController` com validacao de acesso reaproveitando `isAllowed`.
  - Ajustar a interface de controle entre bot e runner para suportar disparo explicito de rodada.
  - Alinhar bootstrap em `src/main.ts` para obedecer o gatilho remoto (em vez de auto-start implicito sem comando).
  - Cobrir comportamento de autorizacao e efeito funcional de `/run-all` em testes automatizados.
  - Atualizar spec relacionada com status/evidencias apos validacao.
- Fora de escopo:
  - Migrar para Codex SDK real (escopo de outro gap/spec).
  - Introduzir paralelizacao de tickets ou multi-chat.
  - Alterar contrato de fila (`tickets/open` -> `tickets/closed`) fora do necessario para disparo por comando.

## Progress
- [x] 2026-02-19 11:48Z - Planejamento inicial concluido com leitura integral do ticket e referencias.
- [x] 2026-02-19 11:50Z - Contrato de disparo `/run-all` definido entre TelegramController e TicketRunner.
- [x] 2026-02-19 11:51Z - Implementacao do comando `/run-all` e ajuste de bootstrap concluida.
- [x] 2026-02-19 11:51Z - Suite de testes atualizada para cobertura de autorizacao + efeito do comando.
- [x] 2026-02-19 11:52Z - Validacao final (test/check/build) e rastreabilidade na spec concluida.

## Surprises & Discoveries
- 2026-02-19 11:48Z - `src/main.ts` dispara `await runner.runForever()` no bootstrap; hoje o runner inicia sem depender de comando Telegram.
- 2026-02-19 11:48Z - `BotControls` em `src/integrations/telegram-bot.ts` expoe apenas `pause` e `resume`, sem gancho para iniciar rodada.
- 2026-02-19 11:48Z - A suite atual (`src/integrations/telegram-bot.test.ts`) valida `isAllowed` por chamada interna e ainda nao cobre `/run-all`.
- 2026-02-19 11:48Z - A spec `docs/specs/2026-02-19-telegram-access-and-control-plane.md` deixa explicito que CA-01/CA-02 dependem da superficie completa com `/run-all`.
- 2026-02-19 11:51Z - O runner atual foi mantido em modo de loop continuo apos o primeiro `/run-all`; o ganho deste ticket e o gatilho remoto com no-op para chamadas concorrentes.
- 2026-02-19 11:53Z - Havia janela curta de concorrencia antes do `isRunning=true`; foi necessario usar guarda adicional por `loopPromise` para bloquear duplo disparo.

## Decision Log
- 2026-02-19 - Decisao: manter validacao centralizada em `isAllowed` e somente expandir contexto para incluir `command: "run-all"`.
  - Motivo: evitar duplicacao de regras e preservar comportamento auditavel uniforme para todos os comandos de controle.
  - Impacto: baixo risco de regressao nos comandos existentes (`status`, `pause`, `resume`).
- 2026-02-19 - Decisao: definir API explicita no runner para disparo por comando, evitando acoplamento do bot a detalhes internos do loop.
  - Motivo: separar camada de integracao Telegram da regra de negocio sequencial no core.
  - Impacto: requer ajuste de interface em `src/main.ts` e cobertura de testes para estado de execucao.
- 2026-02-19 - Decisao: tratar `/run-all` concorrente enquanto ja existe rodada ativa com resposta segura (sem iniciar nova rodada).
  - Motivo: preservar garantia de fluxo sequencial e evitar sobreposicao de processamento.
  - Impacto: incluir sinalizacao de estado ao operador e assert de nao-concorrencia em teste.
- 2026-02-19 - Decisao: manter cobertura de teste no nivel de contrato interno do controlador (metodos privados) em vez de mock profundo de internals do Telegraf.
  - Motivo: manter suite enxuta e alinhada ao padrao de testes existente no repositorio.
  - Impacto: cobertura valida gate de autorizacao e efeito de `/run-all` sem depender de comportamento interno da biblioteca Telegram.
- 2026-02-19 - Decisao: marcar `isRunning` no momento do comando e usar `loopPromise` como trava de startup.
  - Motivo: eliminar janela de corrida para dois `/run-all` quase simultaneos.
  - Impacto: runner passa a recusar novo disparo mesmo durante bootstrap assincrono do loop.

## Outcomes & Retrospective
- Status final: implementacao e validacoes concluidas, sem fechamento de ticket/commit/push nesta etapa.
- O que funcionou: `/run-all` foi integrado ao mesmo gate de autorizacao dos demais comandos e o bootstrap passou a aguardar gatilho remoto.
- O que ficou pendente: apenas etapa de fechamento operacional do ticket (metadados + commit/push).
- Proximos passos: executar prompt de encerramento de ticket apos revisao final do diff.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts` - superficie de comandos e gate de autorizacao por chat.
  - `src/main.ts` - orquestracao entre controller Telegram e `TicketRunner`.
  - `src/core/runner.ts` - loop sequencial e transicoes de estado do processamento.
  - `src/integrations/telegram-bot.test.ts` - cobertura atual de autorizacao.
  - `docs/specs/2026-02-19-telegram-access-and-control-plane.md` - RFs/CAs de acesso remoto.
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` - jornada funcional que define `/run-all` como gatilho da rodada.
- Fluxo atual:
  - Bot publica `/status`, `/pause`, `/resume` e valida acesso via `isAllowed`.
  - Runner inicia automaticamente no bootstrap com `runForever`, sem gate por comando remoto.
  - Em erro de ticket, runner registra log e segue no loop continuo.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM e arquitetura em camadas.
  - Fluxo de tickets deve continuar sequencial (sem paralelizacao).
  - Sem introduzir dependencias novas sem necessidade.

## Plan of Work
- Milestone 1: Contrato de controle remoto para `/run-all` definido.
  - Entregavel: interface de controle bot->runner contempla disparo de rodada com semantica clara para estado ativo/inativo.
  - Evidencia de conclusao: diff em `src/integrations/telegram-bot.ts`, `src/main.ts` e `src/core/runner.ts` com assinatura nova e logs coerentes.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/main.ts`, `src/core/runner.ts`.
- Milestone 2: Comando `/run-all` implementado com gate de autorizacao completo.
  - Entregavel: handler `/run-all` aplica `isAllowed`, inicia execucao apenas quando autorizado e responde ao operador com feedback de estado.
  - Evidencia de conclusao: busca textual mostrando registro do comando e uso de `isAllowed` com `command: "run-all"`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`.
- Milestone 3: Cobertura automatizada para autorizacao + efeito do comando.
  - Entregavel: testes validam bloqueio de chat nao autorizado e garantia de que comando autorizado aciona controle esperado sem concorrencia indevida.
  - Evidencia de conclusao: `npm test` verde com casos cobrindo `/run-all` e regressao dos comandos existentes.
  - Arquivos esperados: `src/integrations/telegram-bot.test.ts` e possivelmente `src/core/runner.test.ts`.
- Milestone 4: Rastreabilidade e criterios de aceitacao atualizados.
  - Entregavel: spec de acesso Telegram atualizada com evidencias de CA-01/CA-02 para superficie completa.
  - Evidencia de conclusao: diff da spec com `Last reviewed at (UTC)` atualizado, status de atendimento revisado e referencias aos artefatos.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-access-and-control-plane.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para registrar baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "BotControls|command\\(\"status\"|command\\(\"pause\"|command\\(\"resume\"|runForever" src/integrations/telegram-bot.ts src/main.ts src/core/runner.ts` para mapear pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para expor metodo seguro de disparo da rodada por comando (sem quebrar sequencialidade).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` via `$EDITOR src/integrations/telegram-bot.ts` para incluir `/run-all` usando `isAllowed` com `command: "run-all"`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` via `$EDITOR src/main.ts` para conectar o novo controle do runner ao `TelegramController` e ajustar estrategia de inicializacao.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar testes via `$EDITOR src/integrations/telegram-bot.test.ts` (e criar `src/core/runner.test.ts` se necessario) cobrindo autorizado/nao autorizado e disparo unico de `/run-all`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para validar cobertura do comando novo e regressao dos comandos existentes.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para confirmar integridade de tipos e build.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-access-and-control-plane.md` via `$EDITOR ...` com evidencias e estado dos CAs apos entrega.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "run-all|CA-01|CA-02|Last reviewed at" docs/specs/2026-02-19-telegram-access-and-control-plane.md README.md src/integrations/telegram-bot.ts` para confirmar rastreabilidade e contrato.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-telegram-access-and-control-plane.md README.md` para auditoria final dos artefatos.

## Validation and Acceptance
- Comando: `npm test`
  - Esperado: casos de `/run-all` passam cobrindo autorizacao, bloqueio de chat nao autorizado e comportamento seguro em tentativa concorrente.
- Comando: `rg -n "command\\(\"run-all\"|command: \"run-all\"|isAllowed" src/integrations/telegram-bot.ts`
  - Esperado: handler `/run-all` registrado e protegido pelo mesmo gate de acesso dos demais comandos.
- Comando: `npm run check && npm run build`
  - Esperado: sem erros de tipagem e build gerado com sucesso.
- Comando: `rg -n "CA-01|CA-02|run-all|Last reviewed at" docs/specs/2026-02-19-telegram-access-and-control-plane.md`
  - Esperado: spec refletindo evidencias de atendimento da superficie completa de comandos de controle.
- Comando: `rg -n "/run-all|/status|/pause|/resume" README.md`
  - Esperado: documentacao operacional coerente com os comandos efetivamente suportados.

## Idempotence and Recovery
- Idempotencia:
  - Comandos de validacao (`npm test`, `npm run check`, `npm run build`) podem ser executados repetidamente sem efeitos colaterais.
  - Reexecucao de `/run-all` enquanto rodada ativa deve resultar em no-op controlado com resposta explicita ao operador.
- Riscos:
  - Regressao no ciclo do runner ao trocar auto-start por disparo remoto.
  - Estado inconsistente se `/run-all` for aceito durante execucao em andamento.
  - Cobertura de testes insuficiente para garantir que comando nao autorizado nao altera estado.
- Recovery / Rollback:
  - Em regressao de inicializacao, restaurar contrato anterior de loop e reaplicar mudanca em passos menores (primeiro API do runner, depois handler Telegram).
  - Em falha de concorrencia, introduzir guarda explicita de estado (`isRunning`/flag dedicada) e validar por teste antes de seguir.
  - Em divergencia spec x implementacao, alinhar documento ao comportamento real e registrar decisao no `Decision Log` do plano.

## Artifacts and Notes
- PR/Diff: `git diff -- src/core/runner.ts src/main.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-telegram-access-and-control-plane.md README.md`
- Logs relevantes: saida de `npm test`, `npm run check` e `npm run build`.
- Evidencias de teste: casos nomeados para `/run-all` autorizado, `/run-all` nao autorizado e tentativa de disparo concorrente.
- Ticket de origem: `tickets/closed/2026-02-19-telegram-run-all-access-control-gap.md`.
- Specs de referencia: `docs/specs/2026-02-19-telegram-access-and-control-plane.md`, `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `BotControls` em `src/integrations/telegram-bot.ts` para incluir disparo de `/run-all`.
  - API publica do `TicketRunner` para iniciar rodada sob demanda de forma sequencial e segura.
- Compatibilidade:
  - `TELEGRAM_ALLOWED_CHAT_ID` permanece opcional com mesmo contrato de modo restrito/sem restricao.
  - Comandos existentes (`/status`, `/pause`, `/resume`) devem manter comportamento atual sem regressao.
- Dependencias externas e mocks:
  - `telegraf` continua como dependencia principal da integracao Telegram.
  - Testes devem usar doubles locais para logger e controles do runner, evitando chamadas reais a rede Telegram.
