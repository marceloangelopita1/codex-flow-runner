# [SPEC] Execucao de tickets do guiadomus-matricula via Codex SDK

## Metadata
- Spec ID: 2026-02-19-guiadomus-codex-sdk-ticket-execution
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-19 10:53Z
- Last reviewed at (UTC): 2026-03-09 18:54Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - tickets/closed/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md
  - tickets/closed/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
  - tickets/closed/2026-02-19-codex-cli-auth-chatgpt-only-no-api-key-fallback.md
- Related execplans:
  - execplans/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - execplans/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
  - execplans/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md
  - execplans/2026-02-19-codex-cli-auth-chatgpt-only-no-api-key-fallback.md
  - execplans/2026-02-20-close-and-version-no-go-follow-up-ticket-and-run-all-limit-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: permitir que o bot controle, de forma remota, a execucao sequencial de tickets abertos do repositorio `guiadomus-matricula`.
- Resultado esperado: um comando Telegram inicia rodada que processa tickets abertos um por vez via Codex SDK real, com fechamento por ticket e versionamento git controlado pelo runner no mesmo ciclo.
- Contexto funcional: runner como controlador operacional de backlog remoto baseado em tickets Markdown.

## Jornada de uso
1. Operador autorizado envia `/run-all` no bot.
2. Runner inicia rodada de execucao no repositorio `../guiadomus-matricula`.
3. Para cada ticket aberto, runner executa ciclo completo (`plan -> implement -> close-and-version`) via Codex SDK real.
4. Apos a etapa `close-and-version`, o runner executa `git add/commit/push` de forma controlada e valida sincronismo com o upstream.
5. Em caso de erro em qualquer ticket, a rodada para no primeiro erro e preserva o estado atual para diagnostico.

## Requisitos funcionais
- RF-01: comando `/run-all` deve iniciar rodada de processamento sequencial de tickets em `tickets/open/`.
- RF-02: cada ticket deve executar os 3 prompts operacionais definidos no projeto (`plan`, `implement`, `close-and-version`) antes de passar ao proximo.
- RF-03: integracao deve usar Codex SDK real ponta a ponta (nao apenas gerador local de execplan).
- RF-04: ao finalizar cada ticket com sucesso, o arquivo deve ser movido para `tickets/closed/` no mesmo commit da implementacao.
- RF-05: o runner deve realizar `push` automatico apos commit de fechamento de cada ticket, sem depender de comando git remoto executado pelo Codex.
- RF-06: a rodada deve parar no primeiro erro, mantendo rastreabilidade do ticket que falhou.
- RF-07: runner deve ser compativel com repositorios que usam `plans/` ou `execplans/`, sem exigir migracao manual previa.
- RF-08: quando o fechamento resultar em `NO_GO` tecnico, o ticket atual deve ser encerrado com `Closure reason: split-follow-up` e um novo ticket de follow-up deve ser criado em `tickets/open/` no mesmo commit/push.
- RF-09: cada comando `/run-all` deve respeitar limite maximo de tickets por rodada (`RUN_ALL_MAX_TICKETS_PER_ROUND`, padrao `20`) e encerrar de forma controlada ao atingir o limite.
- RF-10: quando a implementacao estiver correta e a unica pendencia for validacao manual externa ao agente (ex.: Telegram real), o fechamento deve ser `GO` (`Closure reason: fixed`) com registro explicito da validacao manual pendente no ticket fechado, sem gerar follow-up automatico.

## Nao-escopo
- Execucao paralela de tickets.
- Suporte a multiplos repositorios simultaneamente.
- Reprocessamento automatico de ticket com retry inteligente na mesma rodada.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Ao enviar `/run-all` com tickets abertos, o runner processa um ticket por vez ate concluir a rodada ou falhar.
- [x] CA-02 - Ao concluir ticket com sucesso, ocorre movimentacao `tickets/open -> tickets/closed` no mesmo ciclo, com commit/push automatico executados pelo runner.
- [x] CA-03 - Em erro no ticket N, os tickets seguintes nao sao executados e o estado do erro fica registrado.
- [x] CA-04 - Em repositorio alvo com `plans/`, artefato de plano e criado sem quebrar o fluxo.
- [x] CA-05 - Em repositorio alvo com `execplans/`, artefato de plano e criado sem quebrar o fluxo.
- [x] CA-06 - Em `NO_GO` tecnico no fechamento, o ticket atual e fechado em `tickets/closed/` com `split-follow-up` e o follow-up e criado em `tickets/open/` no mesmo ciclo de versionamento.
- [x] CA-07 - Ao atingir o limite configurado de tickets por rodada, `/run-all` encerra em estado `idle` sem erro tecnico, exigindo novo comando para continuar o backlog.
- [x] CA-08 - Em pendencia exclusiva de validacao manual externa ao agente, o ticket fecha como `fixed` com anotacao de validacao manual pendente e sem follow-up automatico.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Itens atendidos:
  - Comando `/run-all` inicia processamento sequencial e evita rodada concorrente.
  - Integracao usa Codex CLI real por etapa (`plan`, `implement`, `close-and-version`) em `src/integrations/codex-client.ts`.
  - Runner executa as tres etapas operacionais por ticket com rastreabilidade de fase e erro contextual no stage.
  - Fluxo principal agora possui cobertura de contrato para ordem de etapas e falha por etapa no runner.
  - Compatibilidade de diretorio de plano foi implementada para `plans/` e `execplans/` com resolucao automatica em `src/integrations/plan-directory.ts`.
  - Fluxo da fila e etapa `plan` agora resolvem e reportam caminho de ExecPlan conforme convencao ativa do repositorio alvo.
  - Suite de testes cobre matriz de convencao de pasta de plano e comportamento da fila (`plan-directory`, `codex-client` e `ticket-queue`).
  - Rodada `/run-all` agora encerra automaticamente quando nao ha mais ticket aberto na fila corrente.
  - Runner interrompe rodada no primeiro erro de ticket (fail-fast), sem executar tickets seguintes na mesma rodada.
  - Runner valida fechamento/versionamento apos `close-and-version` exigindo repositorio limpo e sem commits locais sem push.
  - `GitCliVersioning` passou a executar push obrigatorio apos commit de fechamento (sem feature flag opcional).
  - A etapa `close-and-version` passou a preparar apenas o estado de arquivos/tickets; commit/push de ticket agora sao centralizados no runner via `GitCliVersioning`.
  - Suite automatizada cobre rodada finita, fail-fast entre tickets e validacao de push/sincronismo em `git-client`.
  - `/run-all` agora executa preflight de autenticacao do Codex CLI e bloqueia inicio da rodada com mensagem acionavel quando a sessao nao existe.
  - Integracao com Codex CLI deixou de injetar `CODEX_API_KEY`/`OPENAI_API_KEY`; autenticacao passa a depender da sessao do usuario (`codex login`).
  - Fluxo de fechamento passou a suportar handoff `NO_GO` tecnico com `split-follow-up`: fecha o ticket atual e cria ticket de continuidade no mesmo commit/push.
  - Bloqueio exclusivamente operacional de validacao manual externa nao força `NO_GO`: fechamento pode ser `fixed` com pendencia manual registrada no ticket.
  - `/run-all` passou a respeitar limite maximo de tickets por rodada via `RUN_ALL_MAX_TICKETS_PER_ROUND` (padrao `20`), encerrando de forma controlada ao atingir o teto.
- Pendencias em aberto:
  - Nenhuma pendencia funcional aberta nesta spec.
- Evidencias de validacao:
  - execplans/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - execplans/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md
  - execplans/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/plan-directory.ts
  - src/integrations/plan-directory.test.ts
  - src/integrations/codex-client.ts
  - src/integrations/codex-client.test.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/git-client.ts
  - src/integrations/git-client.test.ts
  - src/integrations/ticket-queue.ts
  - src/integrations/ticket-queue.test.ts
  - src/config/env.ts
  - src/config/env.test.ts
  - src/main.ts
  - README.md
  - prompts/04-encerrar-ticket-commit-push.md
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md
  - docs/systemd/codex-flow-runner.service
  - src/integrations/telegram-bot.test.ts
  - execplans/2026-02-20-close-and-version-no-go-follow-up-ticket-and-run-all-limit-gap.md
  - execplans/2026-02-19-codex-cli-auth-chatgpt-only-no-api-key-fallback.md
  - tickets/closed/2026-02-19-codex-cli-auth-chatgpt-only-no-api-key-fallback.md
  - tickets/closed/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md
  - tickets/closed/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md
  - tickets/closed/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md

## Riscos e impacto
- Risco funcional: divergencia entre comportamento do Codex SDK real e fluxo local atual.
- Risco operacional: push automatico em ticket com implementacao incompleta.
- Mitigacao: parada no primeiro erro, logs por ticket, validacoes antes de close/commit/push.

## Decisoes e trade-offs
- 2026-02-19 - Rodada sequencial por `/run-all` em vez de comando por ticket - reduz friccao operacional para esvaziar backlog.
- 2026-02-19 - Parar no primeiro erro - prioriza seguranca e diagnostico sobre throughput.
- 2026-02-19 - Push automatico por ticket - garante ciclo completo fechado sem passo manual.

## Historico de atualizacao
- 2026-02-19 10:53Z - Versao inicial da spec aprovada.
- 2026-02-19 11:59Z - Revisao de gaps de implementacao concluida com abertura de tickets de follow-up.
- 2026-02-19 12:13Z - Integracao real por etapas com Codex CLI e testes de contrato do fluxo principal implementados.
- 2026-02-19 12:27Z - Compatibilidade `plans/execplans` implementada com testes de contrato e atualizacao de evidencias.
- 2026-02-19 12:40Z - Rodada finita/fail-fast e push obrigatorio implementados com validacao git pos `close-and-version` e cobertura automatizada.
- 2026-02-19 12:43Z - Ticket de rodada fail-fast/push obrigatorio encerrado com move para `tickets/closed/` no mesmo commit da solucao.
- 2026-02-19 16:05Z - Fluxo migrado para autenticacao login-only do Codex CLI, com preflight de `/run-all`, remocao de injecao de API key e testes/documentacao atualizados.
- 2026-02-20 17:08Z - Fluxo ajustado para handoff `NO_GO` com `split-follow-up` no fechamento e limite de tickets por rodada (`RUN_ALL_MAX_TICKETS_PER_ROUND`, padrao 20).
- 2026-02-23 15:16Z - Regra de fechamento refinada: pendencia exclusiva de validacao manual externa ao agente nao bloqueia `GO`; ticket fecha como `fixed` com anotacao de validacao manual pendente, sem gerar cadeia de `split-follow-up`.
- 2026-03-09 18:54Z - Versionamento de ticket centralizado no runner: `close-and-version` deixa de executar git remoto e passa a apenas preparar o estado de fechamento para commit/push posterior controlado.
