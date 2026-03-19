# [TICKET] Abrir ticket transversal de melhoria de workflow no run_specs

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 15:41Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-18, RF-19, RF-20, RF-21, RF-22, RF-23; CA-13, CA-14, CA-15
- Inherited assumptions/defaults (when applicable): abrir ticket transversal apenas quando a menor causa plausivel for sistemica e houver alta confianca de reaproveitamento; usar o repositorio atual quando o projeto ativo for `codex-flow-runner`; usar `../codex-flow-runner` quando o projeto ativo for externo; falhas nessa materializacao sao nao bloqueantes quando o gate da spec estiver em `GO`.
- Workflow root cause (when applicable): execution
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - src/main.ts
  - src/integrations/git-client.ts
  - src/core/runner.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a automacao do ticket transversal depende de IO em outro repositorio e de commit/push dedicado; o runner atual so conhece o projeto ativo e nao tem caminho para materializar esse follow-up sistemico.

## Context
- Workflow area: follow-up sistemico derivado de `spec-ticket-validation`
- Scenario: a validacao dos tickets encontra causa-raiz sistemica e precisa abrir backlog reaproveitavel no proprio `codex-flow-runner`
- Input constraints: nao bloquear a spec corrente quando o gate principal estiver em `GO`, mesmo que o ticket transversal nao possa ser publicado

## Problem statement
Nao existe hoje nenhuma implementacao para abrir automaticamente um ticket transversal de melhoria de workflow em `codex-flow-runner`, nem no repositorio atual nem em `../codex-flow-runner`. O bootstrap do runner e o cliente git trabalham apenas com o projeto ativo da rodada.

## Observed behavior
- O que foi observado: o runner constroi `FileSystemTicketQueue`, `CodexCliTicketFlowClient` e `GitCliVersioning` a partir de um unico `activeProjectPath`; nao ha qualquer caminho de codigo em `src/` que resolva `../codex-flow-runner`, crie ticket transversal ou registre limitacao nao bloqueante para esse caso.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de codigo e busca textual no repositorio

## Expected behavior
Quando `spec-ticket-validation` identificar gap sistemico com alta confianca, o fluxo deve abrir o ticket transversal no repositorio correto, executar commit/push quando possivel e registrar sucesso ou limitacao nao bloqueante no trace/log e no resumo final do `/run_specs`.

## Reproduction steps
1. Ler `src/main.ts` e verificar como `queue`, `codexClient` e `gitVersioning` sao construidos para o projeto ativo.
2. Ler `src/integrations/git-client.ts` e confirmar que o cliente opera sobre um unico `repoPath`.
3. Buscar em `src/` por `../codex-flow-runner`, `ticket transversal` ou logica equivalente e confirmar a ausencia.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `src/main.ts` instancia `FileSystemTicketQueue` e `GitCliVersioning` somente com `activeProjectPath`.
  - `src/integrations/git-client.ts` opera sobre um unico `repoPath` e so oferece fechamento de ticket/validacao de push nesse repositorio.
  - Nao ha referencias em `src/` a `../codex-flow-runner` nem a criacao automatica de ticket transversal de workflow.
- Comparativo antes/depois (se houver): antes = follow-up sistemico inexistente; depois esperado = ticket transversal criado ou limitacao nao bloqueante registrada

## Impact assessment
- Impacto funcional: causas-raiz sistemicas deixam de virar backlog reaproveitavel automaticamente.
- Impacto operacional: o resumo do `/run_specs` nao consegue informar se a melhoria de workflow foi aberta, publicada ou limitada por ambiente.
- Risco de regressao: medio, porque envolve IO em repositorio secundario, git e resumo final.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/main.ts`, `src/integrations/git-client.ts`, possivel utilitario de resolucao cross-repo, testes de `runner`

## Initial hypotheses (optional)
- Sera necessario desacoplar a abertura do ticket transversal do `GitCliVersioning` usado pela rodada principal ou criar uma forma segura de instanciar clientes para um repositorio secundario.

## Proposed solution (optional)
Adicionar um fluxo dedicado e nao bloqueante para materializar o ticket transversal no repo correto, com logs claros para sucesso, limitacao operacional e falhas de git/publicacao.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-18, RF-19, RF-22; CA-13
- Evidencia observavel: quando o projeto ativo for `codex-flow-runner`, um gap sistemico elegivel abre ticket em `tickets/open/` do repositorio atual, com commit/push concluido e rastreado no trace/log e no resumo do `/run_specs`.
- Requisito/RF/CA coberto: RF-20, RF-22; CA-14
- Evidencia observavel: quando o projeto ativo for externo e `../codex-flow-runner` estiver acessivel, o fluxo materializa o ticket transversal naquele repositorio, executa commit/push e registra o resultado no projeto corrente.
- Requisito/RF/CA coberto: RF-21, RF-23; CA-15
- Evidencia observavel: quando `../codex-flow-runner` nao existir ou nao estiver acessivel, o fluxo registra limitacao operacional nao bloqueante no trace/log e no resumo final, sem impedir a continuidade da spec corrente quando o veredito da validacao for `GO`.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - o runner atual nao tem suporte cross-repo nem contrato nao bloqueante para follow-up sistemico.
- 2026-03-19 - Diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md` relidos na etapa de fechamento; resultado validado como `GO` com base apenas em criterios tecnicos/funcionais da entrega atual.

## Closure
- Closed at (UTC): 2026-03-19 18:05Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-18`, `RF-19`, `RF-22`; `CA-13`: `src/core/runner.ts` agora coleta gaps sistemicos a partir de `result.snapshots`, publica o follow-up apenas em veredito `GO` e propaga `workflowImprovementTicket` para spec, trace e resumo final; `src/integrations/workflow-improvement-ticket-publisher.ts` resolve o repo atual quando `activeProjectName === codex-flow-runner` e publica o ticket com `commitAndPushPaths(...)`; `src/core/runner.test.ts` cobre `requestRunSpecs publica ticket transversal no repo atual a partir de gap sistemico visto nos snapshots`; `src/integrations/workflow-improvement-ticket-publisher.test.ts` cobre `publica ticket transversal no repositorio atual com commit/push observavel`; `src/integrations/git-client.test.ts` cobre `commitAndPushPaths publica apenas os caminhos explicitos e retorna evidencia de push`; `src/integrations/telegram-bot.test.ts` cobre `envia resumo final de /run-specs com follow-up sistemico publicado`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> pass (`238/238`).
  - `RF-20`, `RF-22`; `CA-14`: `src/integrations/workflow-improvement-ticket-publisher.ts` resolve `../codex-flow-runner` quando o projeto ativo e externo, valida `.git` + `tickets/open/`, materializa o ticket e registra `targetRepoDisplayPath`; `src/core/runner.test.ts` cobre `requestRunSpecs publica ticket transversal no repo irmao e registra o resultado no projeto corrente`; `src/integrations/workflow-improvement-ticket-publisher.test.ts` cobre `publica ticket transversal no repositorio irmao quando o projeto ativo e externo`; `src/integrations/telegram-bot.test.ts` valida a exibicao do repo irmao e do `commit/push` no resumo final; o mesmo comando focado acima permaneceu verde (`238/238`).
  - `RF-21`, `RF-23`; `CA-15`: `src/integrations/workflow-improvement-ticket-publisher.ts` retorna `operational-limitation` com `target-repo-missing` ou `target-repo-inaccessible` sem bloquear a rodada principal; `src/core/runner.ts` registra a limitacao como nao bloqueante quando o gate principal permanece `GO`; `src/core/runner.test.ts` cobre `requestRunSpecs registra limitacao operacional nao bloqueante quando o repo irmao nao existe`; `src/integrations/workflow-improvement-ticket-publisher.test.ts` cobre `retorna limitacao operacional quando o repositorio irmao nao existe`; `src/integrations/telegram-bot.test.ts` cobre `envia resumo final de /run-specs com limitacao operacional do follow-up sistemico`; o mesmo comando focado acima permaneceu verde (`238/238`).
- Regressao complementar executada:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` -> pass (`368/368`).
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> pass.
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` -> pass.
- Entrega tecnica concluida:
  - O runner passou a abrir/publicar follow-up sistemico no repo atual ou em `../codex-flow-runner`, com commit/push por caminhos explicitos e sem depender de `git add -A`.
  - O resultado da publicacao agora aparece na secao `Gate de validacao dos tickets derivados` da spec, no trace/log da etapa `spec-ticket-validation` e no resumo final do Telegram.
  - A deduplicacao conservadora por `Source spec` + overlap de fingerprints evita backlog duplicado em reruns da mesma spec.
- Validacao manual externa pendente: sim.
  - Entrega tecnica concluida; a pendencia restante e apenas auditoria operacional externa ao agente.
  - Validacao necessaria: executar uma rodada real de `/run_specs` em projeto externo com `../codex-flow-runner` acessivel e outra sem esse repositorio acessivel, confirmando no Telegram o resumo de sucesso e a limitacao nao bloqueante.
  - Como executar: usar uma spec elegivel em repositorio externo, disparar `/run_specs <spec>`, observar o bloco `Follow-up sistemico` no resumo final e conferir se o ticket foi criado em `../codex-flow-runner` quando presente; repetir sem o repositorio irmao para validar `operational-limitation`.
  - Responsavel operacional: operador/maintainer do runner em ambiente real com Telegram habilitado.
