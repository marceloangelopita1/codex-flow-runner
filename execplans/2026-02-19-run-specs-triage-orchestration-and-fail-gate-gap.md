# ExecPlan - /run_specs com triagem de spec, fail-gate e encadeamento para /run_all

## Purpose / Big Picture
- Objetivo: implementar no runner o fluxo `/run_specs <arquivo-da-spec.md>` para executar triagem de spec approved de forma sequencial, fechar a triagem com commit/push e somente depois encadear automaticamente a rodada de tickets (`/run_all`).
- Resultado esperado:
  - comando `/run_specs` disponivel no bot;
  - fases de spec expostas em estado/logs (`select-spec`, `spec-triage`, `spec-close-and-version`);
  - triagem executada com `prompts/01-avaliar-spec-e-gerar-tickets.md` com `<SPEC_PATH>` substituido;
  - fechamento da triagem executado com novo prompt `prompts/05-encerrar-tratamento-spec-commit-push.md` e commit message padrao;
  - falha no fechamento bloqueia encadeamento de tickets;
  - sucesso no fechamento dispara automaticamente a rodada completa de `tickets/open/`.
- Escopo:
  - ampliar contrato do `TelegramController` para aceitar `/run_specs` com argumento explicito;
  - ampliar `TicketRunner` para fluxo de spec + fail-gate + handoff para rodada de tickets;
  - ampliar `CodexCliTicketFlowClient` para stages de spec e novo prompt de fechamento;
  - ampliar `RunnerState` e `/status` com contexto de spec em processamento;
  - criar/ajustar testes automatizados para CA-02 a CA-10 e CA-12.
- Fora de escopo:
  - implementar listagem `/specs` completa de elegiveis (ticket separado: `tickets/open/2026-02-19-specs-command-eligibility-listing-and-access-gap.md`);
  - migracao global de metadata `Spec treatment` em todo baseline de specs (ticket separado: `tickets/open/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`);
  - paralelizacao de specs ou tickets.

## Progress
- [x] 2026-02-19 19:45Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md` e referencias de codigo/spec.
- [x] 2026-02-19 19:57Z - Contratos de estado/runner/codex para fluxo `/run_specs` implementados.
- [x] 2026-02-19 19:57Z - Comando Telegram `/run_specs` implementado com validacoes de uso e bloqueio `already-running`.
- [x] 2026-02-19 19:57Z - Novo prompt `05` criado e integrado ao fechamento de triagem.
- [x] 2026-02-19 19:57Z - Suite de testes (runner, bot, codex-client) cobrindo CA-02..CA-10 e CA-12.
- [x] 2026-02-19 19:59Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 19:45Z - `TelegramController` hoje registra `/run_all`, `/status`, `/pause`, `/resume`, `/projects` e `/select_project`, sem handler para `/run_specs`.
- 2026-02-19 19:45Z - `TicketRunner` expoe somente `requestRunAll()`, sem API para triagem de spec e sem ponto de handoff explicito de spec para backlog.
- 2026-02-19 19:45Z - `RunnerPhase` nao contem fases de spec, e `/status` mostra apenas `currentTicket`.
- 2026-02-19 19:45Z - `CodexCliTicketFlowClient` aceita apenas stages de ticket (`plan`, `implement`, `close-and-version`) e nao existe prompt `05`.
- 2026-02-19 19:45Z - Existe sobreposicao parcial com ticket P1 para elegibilidade de spec (CA-03), exigindo fronteira clara de responsabilidade no plano.

## Decision Log
- 2026-02-19 - Decisao: introduzir fluxo `/run_specs` no mesmo `TicketRunner`, como pre-round sequencial antes do ciclo de tickets.
  - Motivo: manter uma unica maquina de estado operacional do runner e preservar serializacao global de trabalho.
  - Impacto: `src/core/runner.ts` passa a orquestrar dois tipos de etapa (spec e ticket) sem paralelizacao.
- 2026-02-19 - Decisao: aplicar gate unico de concorrencia (`isRunning`/`loopPromise`/`isStarting`) para `/run_all` e `/run_specs`.
  - Motivo: atender CA-04 e evitar interleaving entre rodada de spec e rodada de tickets.
  - Impacto: contratos de request no runner e respostas do bot precisam incluir `already-running` para ambos os comandos.
- 2026-02-19 - Decisao: adicionar `currentSpec` ao `RunnerState` e refletir no `/status`.
  - Motivo: atender CA-10 com observabilidade explicita da spec em processamento.
  - Impacto: ajustes em `src/types/state.ts`, `src/integrations/telegram-bot.ts` e testes do bot/runner.
- 2026-02-19 - Decisao: introduzir stages explicitos `spec-triage` e `spec-close-and-version` no client do Codex.
  - Motivo: manter rastreabilidade por etapa e fail-gate controlado no runner antes de iniciar tickets.
  - Impacto: ajustes em `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts` e novo prompt `prompts/05-encerrar-tratamento-spec-commit-push.md`.
- 2026-02-19 - Decisao: `run_all` so inicia apos sucesso de `spec-close-and-version`; falha encerra fluxo sem processar tickets.
  - Motivo: atender CA-07 e CA-08 com comportamento deterministico.
  - Impacto: runner precisa separar erro de preflight/spec-close de erro de ticket-round e manter mensagens objetivas de bloqueio.

## Outcomes & Retrospective
- Status final: concluido com implementacao e validacao completas neste escopo.
- O que funcionou: fluxo `/run_specs` foi integrado ponta-a-ponta com fail-gate em `spec-close-and-version`, handoff automatico para `/run_all`, observabilidade de `currentSpec` e cobertura de testes dedicada.
- O que ficou pendente: CA-03 (elegibilidade/arquivo inexistente) e CA-11 (controle de acesso compartilhado com `/specs`) seguem no ticket P1 separado de listagem/elegibilidade.
- Proximos passos: encerrar ticket com commit/push no fluxo operacional e seguir backlog de elegibilidade `/specs`.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - orquestracao principal do loop e portas de entrada do runner.
  - `src/types/state.ts` - fases e shape do estado publicado ao Telegram.
  - `src/integrations/telegram-bot.ts` - comandos Telegram (`/start`, `/run_all`, `/status`, etc.) e mensagens operacionais.
  - `src/integrations/codex-client.ts` - mapeamento de stages para prompts e execucao `codex exec`.
  - `src/main.ts` - wiring de controles entre bot e runner.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` - triagem da spec com `<SPEC_PATH>`.
  - `prompts/05-encerrar-tratamento-spec-commit-push.md` - novo prompt a ser criado para fechamento da triagem.
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` - requisitos RF/CA de origem.
- Fluxo atual:
  - `/run_all` dispara rodada de tickets com fases `select-ticket -> plan -> implement -> close-and-version`.
  - Nao existe entrada para triagem de spec nem transicao previa para backlog.
- Fluxo alvo deste ticket:
  - `/run_specs <arquivo>` valida precondicoes de execucao unica;
  - runner executa `spec-triage` com prompt 01 e path da spec;
  - runner executa `spec-close-and-version` com commit/push padrao;
  - somente com sucesso o runner inicia automaticamente a rodada de tickets como `/run_all`.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM;
  - fluxo estritamente sequencial, sem concorrencia entre tickets/specs;
  - sem commit de segredos e sem dependencia de estado implicito fora do repositorio.
- Dependencias de backlog:
  - CA-03 (elegibilidade/spec inexistente) depende do contrato de validacao de spec do ticket P1; este plano integra o hook de bloqueio no fluxo `/run_specs`, mas evita duplicar toda a superficie de `/specs`.

## Plan of Work
- Milestone 1: Contrato de estado e API do runner para fluxo de spec.
  - Entregavel: `TicketRunner` com entrada `requestRunSpecs(...)`, fases de spec, campos de estado e mensagens operacionais para triagem.
  - Evidencia de conclusao: testes de runner cobrindo transicoes `select-spec -> spec-triage -> spec-close-and-version`.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/state.ts`, `src/core/runner.test.ts`.
- Milestone 2: Integracao Codex para triagem/fechamento de spec.
  - Entregavel: `CodexCliTicketFlowClient` suporta stages de spec e gera prompt com `<SPEC_PATH>` substituido, mais novo prompt `05` de fechamento.
  - Evidencia de conclusao: testes de `codex-client` validando substituicao de path, stage correto e mensagem de commit da triagem.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `prompts/05-encerrar-tratamento-spec-commit-push.md`.
- Milestone 3: Comando Telegram `/run_specs` e observabilidade de status.
  - Entregavel: handler do comando com validacao de uso, resposta de bloqueio `already-running` e atualizacao de `/start`/`/status` para contexto de spec.
  - Evidencia de conclusao: testes do bot para mensagem de uso (sem argumento), bloqueio durante execucao e exibicao de spec atual no status.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4: Encadeamento automatico para rodada de tickets com fail-gate.
  - Entregavel: apos sucesso de fechamento da triagem, runner inicia rodada de tickets no mesmo request; em falha de fechamento, nao inicia `run_all`.
  - Evidencia de conclusao: testes de runner para CA-07, CA-08 e CA-09 (backlog preexistente + tickets novos).
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/main.ts`.
- Milestone 5: Rastreabilidade de spec e validacao final.
  - Entregavel: evidencias de validacao completas e atualizacao da spec de origem com status de atendimento dos CAs deste ticket.
  - Evidencia de conclusao: comandos de teste/check/build verdes e spec atualizada com `Last reviewed at (UTC)`/pendencias.
  - Arquivos esperados: `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para baseline antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "run_all|requestRunAll|RunnerPhase|buildStatusReply|TicketFlowStage|STAGE_PROMPT_FILES" src` para mapear pontos exatos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` via `$EDITOR src/types/state.ts` para incluir fases de spec e campo `currentSpec`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para:
   - adicionar API `requestRunSpecs(specFileName)`;
   - executar stages `spec-triage` e `spec-close-and-version`;
   - bloquear encadeamento de tickets em falha de fechamento;
   - iniciar rodada de tickets automaticamente em sucesso;
   - manter `already-running` deterministico para `/run_all` e `/run_specs`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para suportar stages de spec e composicao de prompt com `<SPEC_PATH>` + commit message da triagem.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `prompts/05-encerrar-tratamento-spec-commit-push.md` via `$EDITOR prompts/05-encerrar-tratamento-spec-commit-push.md` com regras de fechamento da triagem (incluindo politica de `Status: attended` quando sem gaps e commit `chore(specs): triage <arquivo>`).
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` via `$EDITOR src/integrations/telegram-bot.ts` para registrar `/run_specs`, validar argumento obrigatorio e refletir `currentSpec` no `/status`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` via `$EDITOR src/main.ts` para injetar o novo controle `runSpecs` no bot, preservando controle de acesso existente.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` via `$EDITOR src/integrations/codex-client.test.ts` com cenarios de stages de spec (CA-05, CA-06, CA-12 por contrato de prompt).
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` via `$EDITOR src/core/runner.test.ts` com cenarios de fail-gate e encadeamento automatico (CA-04, CA-07, CA-08, CA-09, CA-10).
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` via `$EDITOR src/integrations/telegram-bot.test.ts` com cenarios `/run_specs` sem argumento, bloqueio `already-running` e mensagens de status com spec.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada dos fluxos alterados.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para validacao final completa.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` via `$EDITOR ...` registrando `Last reviewed at (UTC)`, itens atendidos e evidencias dos CAs deste ticket.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/types/state.ts src/integrations/codex-client.ts src/integrations/telegram-bot.ts src/main.ts prompts/05-encerrar-tratamento-spec-commit-push.md src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-approved-spec-triage-run-specs.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: cobertura de CA-02 (`/run_specs` sem argumento responde uso e nao inicia execucao), CA-04 (`already-running`) e parte de CA-10 (status com fase/spec).
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: cobertura de CA-05 (placeholder `<SPEC_PATH>` substituido), CA-06 (prompt de fechamento com commit message padrao) e CA-12 (instrucao de `Status: attended` quando sem gaps presente no fluxo de fechamento).
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cobertura de CA-07 (falha em `spec-close-and-version` bloqueia ticket round), CA-08 (sucesso encadeia `run_all`), CA-09 (rodada consome backlog preexistente + novos tickets) e CA-10 (fases de spec para ticket observaveis no estado).
- Comando: `npm test`
  - Esperado: suite completa passa sem regressao nos comandos existentes do bot e no fluxo atual de tickets.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem/build sem erro apos ampliar contratos de estado/runner/codex.
- Comando: `rg -n "run_specs|spec-triage|spec-close-and-version|currentSpec|chore\(specs\): triage" src prompts`
  - Esperado: superficies novas aparecem de forma consistente no codigo e no prompt.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar `/run_specs <arquivo>` apos falha deve iniciar nova tentativa limpa sem manter `currentSpec` preso;
  - reexecutar testes e comandos de validacao nao deve gerar efeitos colaterais no repositorio alem de artefatos de build esperados.
- Riscos:
  - sobreposicao com ticket P1 pode gerar duplicacao de logica de elegibilidade (CA-03);
  - erro de transicao de estado pode deixar `/status` inconsistente entre fase de spec e fase de ticket;
  - prompt `05` incompleto pode quebrar CA-06/CA-12 mesmo com orquestracao correta.
- Recovery / Rollback:
  - se houver conflito com P1, extrair validacao de elegibilidade para interface unica (`SpecEligibility`) e manter este ticket apenas como consumidor;
  - em regressao de estado, adicionar asserts de transicao no runner antes de relancar;
  - se fechamento da triagem falhar em producao, manter gate bloqueando `run_all` e orientar rerun de `/run_specs` apos corrigir repositorio/auth.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-run-specs-triage-orchestration-and-fail-gate-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`.
- Prompt de triagem existente: `prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Prompt novo esperado: `prompts/05-encerrar-tratamento-spec-commit-push.md`.
- Areas de codigo-alvo: `src/core/runner.ts`, `src/types/state.ts`, `src/integrations/codex-client.ts`, `src/integrations/telegram-bot.ts`, `src/main.ts`.
- Evidencias esperadas de aceite:
  - nomes dos testes novos para CA-02..CA-10 e CA-12;
  - saida verde de `npm test`, `npm run check`, `npm run build`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `BotControls` em `src/integrations/telegram-bot.ts` deve incluir `runSpecs(specFileName)`;
  - `TicketRunner` deve expor novo request para triagem de spec;
  - `RunnerPhase`/`RunnerState` devem carregar fases e contexto de spec;
  - `CodexTicketFlowClient` deve suportar stages de spec alem dos stages de ticket.
- Compatibilidade:
  - comando `/run_all` permanece disponivel e sem mudanca de contrato externo;
  - fluxo continua sequencial (uma execucao por vez), sem paralelizacao;
  - controles de acesso por `TELEGRAM_ALLOWED_CHAT_ID` devem permanecer identicos para novos comandos.
- Dependencias externas e mocks:
  - `codex exec` continua dependencia primaria para execucao dos prompts;
  - `git` remoto continua requisito operacional para etapa de fechamento (via prompt `close-and-version`);
  - testes devem usar doubles para codex/git, sem dependencia de rede real.
