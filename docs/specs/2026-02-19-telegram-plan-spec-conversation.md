# [SPEC] Planejamento de spec via Telegram com conversa Codex stateful

## Metadata
- Spec ID: 2026-02-19-telegram-plan-spec-conversation
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-02-19 21:06Z
- Last reviewed at (UTC): 2026-02-21 08:31Z
- Source: product-need
- Related tickets:
  - tickets/open/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md
  - tickets/open/2026-02-19-plan-spec-codex-interactive-bridge-and-parser-gap.md
  - tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md
  - tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md
- Related execplans:
  - execplans/2026-02-19-plan-spec-codex-interactive-bridge-and-parser-gap.md
  - execplans/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md
  - execplans/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: hoje o runner consegue triar specs (`/specs`, `/run_specs`), mas nao possui uma jornada conversacional para criar uma nova spec a partir de planejamento guiado no Telegram.
- Resultado esperado: operador consegue iniciar um fluxo `/plan_spec`, conversar com o Codex com contexto persistente (sem alteracoes no projeto durante a conversa), responder perguntas por clique ou texto livre, e no final criar a spec em arquivo com commit/push automatico.
- Contexto funcional: preservar o modelo sequencial do runner e o controle por Telegram, adicionando uma fase de descoberta/refinamento antes da escrita da spec.

## Jornada de uso
1. Operador autorizado envia `/plan_spec`.
2. Bot abre sessao de planejamento e pede o brief inicial na proxima mensagem.
3. Operador envia o contexto inicial em texto livre.
4. Runner abre sessao de planejamento do Codex no projeto ativo via `codex exec/resume --json` e conduz a conversa.
5. Quando o Codex pede desambiguacao, bot mostra pergunta com opcoes clicaveis e tambem aceita resposta livre.
6. Codex conclui o planejamento e o bot mostra acoes finais: `Criar spec`, `Refinar`, `Cancelar`.
7. Operador escolhe `Criar spec`; runner sai do modo de planejamento e executa prompt dedicado para criar arquivo(s) da spec.
8. Runner executa prompt dedicado para commit/push da spec criada.
9. Bot retorna resultado final com arquivo da spec, status do push e rastreabilidade da sessao.

## Requisitos funcionais
- RF-01: expor comando `/plan_spec` no Telegram para iniciar planejamento de spec.
- RF-02: `/plan_spec` deve aceitar inicio sem argumento; nesse caso, a primeira mensagem de texto livre subsequente deve ser tratada como brief inicial.
- RF-03: expor comandos `/plan_spec_status` e `/plan_spec_cancel`.
- RF-04: deve existir no maximo uma sessao ativa de `/plan_spec` por instancia do runner.
- RF-05: com sessao `/plan_spec` ativa, comandos `/run_all` e `/run_specs` devem ser bloqueados com mensagem explicita.
- RF-06: com sessao `/plan_spec` ativa, troca de projeto (`/projects` callback e `/select_project`) deve ser bloqueada.
- RF-07: o fluxo deve operar sempre sobre o projeto ativo global no momento em que a sessao e iniciada.
- RF-08: o acesso aos novos comandos e callbacks deve respeitar `TELEGRAM_ALLOWED_CHAT_ID`.
- RF-09: a sessao de planejamento deve usar Codex CLI em turnos com `codex exec`/`codex exec resume` e `--json`.
- RF-10: a integracao deve manter contexto por `thread_id` e extrair resposta util de `agent_message` de forma deterministica.
- RF-11: durante a fase de planejamento, nenhuma alteracao de arquivo do repositorio deve ser executada.
- RF-12: perguntas de desambiguacao devem suportar opcoes clicaveis e resposta por texto livre no Telegram.
- RF-13: para opcoes clicaveis, o bot deve parsear um bloco estruturado de pergunta emitido pelo Codex.
- RF-14: enquanto a sessao estiver ativa, mensagens sem comando (`/`) devem ser roteadas para a conversa de planejamento.
- RF-15: quando o Codex concluir o planejamento, deve existir bloco final parseavel com titulo/resumo para acionar decisoes finais.
- RF-16: ao final do planejamento, o bot deve oferecer botoes `Criar spec`, `Refinar`, `Cancelar`.
- RF-17: ao escolher `Criar spec`, o runner deve executar prompt dedicado fora do modo `/plan` para materializar a spec em `docs/specs/`.
- RF-18: a criacao da spec deve seguir nome `docs/specs/YYYY-MM-DD-<slug>.md`, derivado do titulo final aprovado.
- RF-19: a spec criada pelo fluxo deve iniciar com `Status: approved` e `Spec treatment: pending`.
- RF-20: apos criar a spec, o runner deve executar prompt dedicado de commit/push com mensagem `feat(spec): add <arquivo>.md`.
- RF-21: o prompt de commit/push deve restringir o escopo de arquivos ao artefato da spec e trilha do proprio fluxo.
- RF-22: deve haver timeout de inatividade de 30 minutos para encerrar sessao presa.
- RF-23: em falha da sessao de planejamento (travamento/parsing impossivel), o fluxo deve abortar com orientacao de retry, sem fallback automatico para outro backend.
- RF-24: quando saida do Codex nao for parseavel com seguranca, o bot deve repassar conteudo bruto saneado ao Telegram.
- RF-25: o fluxo deve persistir trilha de rastreabilidade em pasta dedicada no projeto ativo: `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/`.
- RF-26: o estado operacional deve refletir fase da sessao `/plan_spec` em `/status`, com indicacao de espera por usuario ou por Codex.
- RF-27: logs devem registrar inicio/fim/cancelamento/timeout/falha e acao final da sessao de planejamento.
- RF-28: o fluxo deve manter compatibilidade com o ciclo sequencial existente de tickets e specs ja implementado.

## Nao-escopo
- Sessao de planejamento paralela por chat/usuario.
- Fallback automatico para backend alternativo (ex.: pseudo-TTY) em caso de falha da sessao `/plan_spec`.
- Execucao concorrente de planejamento e rodada de tickets.
- Criacao de tickets/execplans automaticos a partir desta nova jornada (escopo desta spec e criar spec).
- Mudanca do criterio de elegibilidade de `/specs` e `/run_specs`.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/plan_spec` sem argumento abre sessao e solicita o brief inicial, sem iniciar rodada de tickets.
- [x] CA-02 - primeira mensagem livre apos `/plan_spec` e encaminhada como contexto inicial para o Codex no mesmo contexto da sessao.
- [x] CA-03 - durante sessao ativa, `/run_all` e `/run_specs` retornam bloqueio explicito e nao iniciam execucao.
- [x] CA-04 - durante sessao ativa, tentativa de trocar projeto por `/select_project` ou callback de `/projects` retorna bloqueio e nao altera projeto ativo.
- [x] CA-05 - comando `/plan_spec_status` exibe fase atual, projeto ativo e timestamp da ultima atividade.
- [x] CA-06 - comando `/plan_spec_cancel` encerra a sessao e limpa estado associado.
- [x] CA-07 - perguntas de desambiguacao parseadas geram teclado inline com opcoes clicaveis.
- [x] CA-08 - alem dos botoes, o bot aceita resposta livre em texto durante a mesma pergunta.
- [x] CA-09 - ao receber bloco final do planejamento, o bot mostra botoes `Criar spec`, `Refinar`, `Cancelar`.
- [x] CA-10 - ao escolher `Refinar`, a conversa retorna ao ciclo de perguntas sem criar arquivos.
- [x] CA-11 - ao escolher `Cancelar`, nenhuma spec e criada e a sessao e encerrada.
- [x] CA-12 - ao escolher `Criar spec`, runner executa prompt dedicado fora de `/plan` e cria `docs/specs/YYYY-MM-DD-<slug>.md`.
- [x] CA-13 - arquivo criado contem metadata inicial `Status: approved` e `Spec treatment: pending`.
- [x] CA-14 - apos criacao da spec, runner executa prompt de commit/push com mensagem `feat(spec): add <arquivo>.md`.
- [x] CA-15 - commit/push inclui apenas artefatos do fluxo definidos no prompt de fechamento.
- [x] CA-16 - trilha de sessao e persistida em `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/`.
- [x] CA-17 - apos 30 minutos sem atividade, sessao expira automaticamente com mensagem de timeout.
- [x] CA-18 - com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chat nao autorizado nao consegue usar `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel` nem callbacks associados.
- [x] CA-19 - em falha da sessao, bot retorna erro acionavel e orienta retry sem iniciar fallback automatico.
- [x] CA-20 - em resposta do Codex nao parseavel, bot repassa conteudo bruto saneado no Telegram.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID` ja aplicado nos comandos/callbacks atuais do bot.
  - Runner ja possui fluxo sequencial de `/run_all` e `/run_specs`, com estado observavel em `/status`.
  - Troca de projeto ja possui bloqueio durante execucao de rodada em andamento.
  - Fila sequencial ja prioriza `P0` antes de `P1` e `P1` antes de `P2`.
  - Backend de `/plan_spec` migrado para `codex exec/resume --json` com sessao stateful por `thread_id`, parser estruturado de pergunta/finalizacao sobre `agent_message` e fallback `raw-sanitized` sem dependencia de pseudo-TTY no caminho principal (`src/integrations/codex-client.ts`, `src/integrations/plan-spec-parser.ts`).
  - Telegram integra callbacks `plan-spec:*`, renderiza teclado de pergunta e botoes finais `Criar spec`/`Refinar`/`Cancelar`, com suporte a retorno de falha e raw saneado (`src/integrations/telegram-bot.ts`).
  - Lifecycle da sessao `/plan_spec` implementado com sessao unica global, comandos `/plan_spec*`, roteamento de texto livre, bloqueios de conflito (`/run_all`, `/run_specs`, `/select_project`, callback `/projects`), timeout de 30 minutos e observabilidade no `/status` (`src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/main.ts`).
  - Acao final `Criar spec` implementada no runner fora de `/plan`, com derivacao de naming `docs/specs/YYYY-MM-DD-<slug>.md`, validacao de colisao, materializacao + versionamento dedicados e commit `feat(spec): add <arquivo>.md` (`src/core/runner.ts`, `src/integrations/codex-client.ts`, `prompts/06-materializar-spec-planejada.md`, `prompts/07-versionar-spec-planejada-commit-push.md`).
  - Persistencia da trilha `spec_planning/requests|responses|decisions` implementada por integracao filesystem dedicada (`src/integrations/spec-planning-trace-store.ts`).
- Pendencias em aberto:
  - Nenhuma pendencia funcional de cobertura para CA-01..CA-20; fechamento operacional do ticket `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md` permanece para etapa dedicada de encerramento/versionamento.
- Evidencias de validacao:
  - Revisao de gaps concluida em 2026-02-19 21:13Z com evidencia em `src/`, `prompts/` e abertura de tickets em `tickets/open/`.
  - Validacao final da triagem executada em 2026-02-19 21:18Z, mantendo `Status: approved` e `Spec treatment: pending` devido a gaps rastreados em tickets abertos.
  - Implementacao do ticket de bridge/parser executada em 2026-02-19 21:33Z com cobertura dedicada em `src/integrations/codex-client.test.ts`, `src/integrations/plan-spec-parser.test.ts`, `src/integrations/telegram-bot.test.ts`.
  - Implementacao do ticket de lifecycle e guardrails executada em 2026-02-19 21:57Z com cobertura dedicada em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e regressao verde em `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`.
  - Implementacao de materializacao/versionamento da spec planejada executada em 2026-02-19 23:42Z com cobertura dedicada em `src/core/runner.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/spec-planning-trace-store.test.ts`.
  - Validacao verde em `npx tsx --test src/integrations/codex-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/spec-planning-trace-store.test.ts`, `npm test`, `npm run check` e `npm run build`.
  - ExecPlan `execplans/2026-02-19-plan-spec-automated-test-coverage-gap.md` executado em 2026-02-19 22:28Z com cobertura complementar de lifecycle/guardrails (`src/core/runner.test.ts`), respostas/status/cancel/callbacks (`src/integrations/telegram-bot.test.ts`), lifecycle interativo Codex (`src/integrations/codex-client.test.ts`) e robustez de parser (`src/integrations/plan-spec-parser.test.ts`), incluindo rastreabilidade textual completa de `CA-01`..`CA-20`.
  - Migracao TTY -> `exec/resume --json` executada em 2026-02-21 08:31Z com cobertura dedicada em `src/integrations/codex-client.test.ts` (persistencia de `thread_id`, erro acionavel sem `thread_id`/`agent_message`), sem regressao em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`.

## Riscos e impacto
- Risco funcional: parsing instavel da saida do Codex gerar UX inconsistente no Telegram.
- Risco operacional: sessao de planejamento ficar presa, bloqueando comandos de execucao.
- Risco de rastreabilidade: commit incluir arquivos fora do escopo esperado se prompt de fechamento nao for restritivo.
- Mitigacao: contrato de bloco estruturado, timeout de sessao, cancelamento explicito, e prompt de commit com escopo controlado.

## Decisoes e trade-offs
- 2026-02-19 - Usar `/plan` literal no Codex interativo - atende requisito de modo de planejamento explicitamente solicitado.
- 2026-02-19 - Sessao unica global - simplifica concorrencia e preserva consistencia com fluxo sequencial.
- 2026-02-19 - Bloquear `/run_all`, `/run_specs` e troca de projeto durante `/plan_spec` - evita conflito de contexto.
- 2026-02-19 - Aceitar clique e texto livre para desambiguacao - melhora UX sem perder flexibilidade.
- 2026-02-19 - Criar spec e depois commit/push com prompts separados fora de `/plan` - separa planejamento de mutacao de arquivos.
- 2026-02-19 - Timeout de 30 minutos - evita sessao zumbi sem exigir intervencao manual imediata.
- 2026-02-19 - Em falha interativa, abortar e pedir retry - reduz complexidade e evita comportamento oculto.
- 2026-02-21 - Migrar backend principal de `/plan_spec` para `codex exec/resume --json` mantendo parser de blocos e UX existente - reduz acoplamento a TTY e melhora determinismo de output.

## Historico de atualizacao
- 2026-02-19 21:06Z - Versao inicial da spec criada e aprovada para derivacao tecnica.
- 2026-02-19 21:13Z - Revisao de gaps concluida; 4 tickets abertos em `tickets/open/` para implementacao sequencial da jornada `/plan_spec`.
- 2026-02-19 21:18Z - Validacao final da triagem concluida; status/metadados confirmados com pendencias rastreadas para tickets abertos.
- 2026-02-19 21:33Z - Ticket de bridge interativa/parser concluido com CAs CA-07..CA-10, CA-19 e CA-20 marcados como atendidos.
- 2026-02-19 21:57Z - Ticket de lifecycle/guardrails concluido com CAs CA-01..CA-06, CA-17 e CA-18 marcados como atendidos.
- 2026-02-19 23:42Z - Ticket de materializacao/versionamento da spec planejada implementado no codigo com CAs CA-11..CA-16 atendidos; fechamento operacional do ticket permanece para etapa dedicada.
- 2026-02-19 22:28Z - ExecPlan de cobertura automatizada complementar executado com testes adicionais em `runner`, `telegram-bot`, `codex-client` e `plan-spec-parser`, fechando rastreabilidade CA-01..CA-20; encerramento operacional do ticket segue para etapa de fechamento/versionamento.
- 2026-02-21 08:31Z - Ticket de migracao de `/plan_spec` para `codex exec/resume --json` implementado com validacao verde em suites de `codex-client`, `runner` e `telegram`.
