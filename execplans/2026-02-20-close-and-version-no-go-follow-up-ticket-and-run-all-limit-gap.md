# ExecPlan - close-and-version com handoff NO_GO e limite de rodada /run-all

## Purpose / Big Picture
- Objetivo: eliminar falhas de `close-and-version` quando o resultado tecnico e `NO_GO`, garantindo encerramento rastreavel do ticket atual, abertura de follow-up e repositorio limpo para o runner continuar.
- Resultado esperado:
  - a etapa `close-and-version` passa a tratar dois desfechos explicitos: `GO` e `NO_GO`.
  - em `NO_GO`, o ticket atual e movido para `tickets/closed/` com metadados de fechamento e `Closure reason` especifica de handoff, e um novo ticket de follow-up e criado em `tickets/open/` com pendencias detalhadas.
  - o mesmo commit inclui: implementacao existente, fechamento do ticket atual e criacao do follow-up, seguido de push.
  - a validacao pos-close continua passando (`working tree` limpo e sem commits pendentes).
  - cada comando `/run-all` processa no maximo 20 tickets por rodada (configuravel), evitando loops longos de follow-up.
- Escopo:
  - ajustar `prompts/04-encerrar-ticket-commit-push.md` para ramo `GO`/`NO_GO` com handoff obrigatorio em `NO_GO`.
  - padronizar metadado de fechamento para handoff (ex.: `split-follow-up`) na documentacao de tickets.
  - introduzir limite por rodada no runner (`RUN_ALL_MAX_TICKETS_PER_ROUND`, default `20`).
  - cobrir comportamento com testes de `env` e `runner`.
  - atualizar documentacao operacional e spec de execucao sequencial.
- Fora de escopo:
  - paralelizacao de tickets.
  - heuristica de deduplicacao semantica entre follow-ups.
  - replanejamento automatico de escopo tecnico dentro da mesma rodada.
  - alterar politica fail-fast para erros tecnicos reais (`plan`, `implement`, falha de git/push).

## Progress
- [x] 2026-02-20 17:08Z - Planejamento inicial concluido com diagnostico da falha em `close-and-version` e estrategia de handoff em `NO_GO`.
- [x] 2026-02-20 17:09Z - Prompt de fechamento e padrao de ticket atualizados para suportar `split-follow-up`.
- [x] 2026-02-20 17:10Z - Runner atualizado com limite maximo de tickets por rodada (`default=20`).
- [x] 2026-02-20 17:12Z - Testes de regressao (`env` + `runner`) atualizados e verdes.
- [x] 2026-02-20 17:13Z - Documentacao/spec atualizadas com novo contrato operacional.

## Surprises & Discoveries
- 2026-02-20 17:00Z - `stderr` do Codex CLI na etapa nao representa falha por si so; com exit code `0`, o runner registra apenas `WARN`.
- 2026-02-20 17:01Z - a falha real observada acontece apos `close-and-version`, na validacao de git limpo (`Repositorio com alteracoes locais apos close-and-version`).
- 2026-02-20 17:02Z - manter o mesmo ticket em `tickets/open/` e commitar mudancas nao resolve o fluxo: o runner interrompe ao detectar o mesmo ticket reaparecendo na fila.
- 2026-02-20 17:03Z - atualmente nao existe guardrail de quantidade maxima de tickets processados por comando `/run-all`.
- 2026-02-20 17:11Z - para manter consistencia de orientacao operacional, alem de `INTERNAL_TICKETS.md` e template, foi necessario atualizar tambem `tickets/README.md` com a regra de `split-follow-up`.

## Decision Log
- 2026-02-20 - Decisao: em `NO_GO`, fechar ticket atual com handoff e abrir ticket novo (follow-up), em vez de manter o ticket original aberto.
  - Motivo: evita reaparecimento do mesmo arquivo na fila e preserva rastreabilidade de decisao/pendencias.
  - Impacto: prompt de fechamento e padrao de closure precisam explicitar `split-follow-up` e dados obrigatorios de rastreabilidade.
- 2026-02-20 - Decisao: manter commit/push obrigatorio tambem no ramo `NO_GO`.
  - Motivo: satisfaz validacao pos-close do runner e evita falha por working tree sujo.
  - Impacto: o fechamento administrativo passa a ser parte da entrega versionada mesmo sem `GO`.
- 2026-02-20 - Decisao: adicionar limite por rodada com default `20` e configuracao por ambiente.
  - Motivo: reduzir risco de ciclos longos em cadeias de follow-up.
  - Impacto: `runForever` passa a encerrar rodada por limite atingido com mensagem explicita.
- 2026-02-20 - Decisao: manter politica fail-fast para erro tecnico e aplicar encerramento por limite como termino controlado da rodada.
  - Motivo: distinguir erro operacional de guardrail deliberado.
  - Impacto: logs e `/status` devem refletir motivo de termino por limite.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas.
- O que funcionou:
  - prompt de fechamento passou a explicitar ramo `GO`/`NO_GO` com handoff `split-follow-up`;
  - configuracao `RUN_ALL_MAX_TICKETS_PER_ROUND` foi adicionada com default `20`;
  - `runner` encerra rodada por limite atingido sem erro tecnico;
  - contratos documentais (tickets/template/README/spec) ficaram alinhados com o novo fluxo.
- O que ficou pendente:
  - fechamento operacional de ticket relacionado, quando a trilha de implementacao for formalizada em ticket dedicado.
- Proximos passos:
  - monitorar rodadas reais com `NO_GO` para confirmar qualidade do handoff e calibrar limite por ambiente, se necessario.

## Context and Orientation
- Arquivos principais:
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/config/env.ts`
  - `src/config/env.test.ts`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `README.md`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
- Fluxo atual relevante:
  - `processTicketInSlot` executa `plan -> implement -> close-and-version` e depois exige `assertSyncedWithRemote`.
  - `runForever` encerra com erro se o mesmo ticket reaparece (`ticket reaberto/nao movido apos close-and-version`).
  - `nextOpenTicket` usa prioridade `P0 > P1 > P2` e fallback por nome.
- Restricoes tecnicas:
  - manter processamento sequencial por ticket.
  - evitar dependencias novas.
  - manter compatibilidade com `plans/` e `execplans/` no repositorio alvo.

## Plan of Work
- Milestone 1 - Contrato de handoff `NO_GO` no fechamento
  - Entregavel: prompt de `close-and-version` com ramo obrigatorio `NO_GO => fechar ticket atual + abrir follow-up + commit/push`.
  - Evidencia de conclusao: prompt e docs de ticket descrevem closure `split-follow-up` e checklist de campos obrigatorios.
  - Arquivos esperados: `prompts/04-encerrar-ticket-commit-push.md`, `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`.
- Milestone 2 - Guardrail de limite por rodada
  - Entregavel: `RUN_ALL_MAX_TICKETS_PER_ROUND` (default `20`) aplicado no loop de `/run-all`.
  - Evidencia de conclusao: runner encerra rodada de forma controlada ao atingir limite, com log e `lastMessage` explicitos.
  - Arquivos esperados: `src/config/env.ts`, `src/core/runner.ts`.
- Milestone 3 - Cobertura automatizada
  - Entregavel: testes de `env` e `runner` cobrindo novo limite e defaults.
  - Evidencia de conclusao: suite de testes focada e regressao geral verdes.
  - Arquivos esperados: `src/config/env.test.ts`, `src/core/runner.test.ts`.
- Milestone 4 - Rastreabilidade documental
  - Entregavel: docs operacionais e spec atualizadas com o novo fluxo de handoff e limite por rodada.
  - Evidencia de conclusao: referencias em README/spec com comportamento observavel e sem contradicoes.
  - Arquivos esperados: `README.md`, `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "close-and-version|run-all|reapareceu na fila|RUN_ALL_MAX_TICKETS_PER_ROUND|Closure reason" src prompts INTERNAL_TICKETS.md tickets/templates README.md docs/specs -S` para baseline de contratos.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `prompts/04-encerrar-ticket-commit-push.md` para definir fluxo bifurcado:
   - `GO`: comportamento atual de fechamento normal.
   - `NO_GO`: fechar ticket atual com `Status: closed`, `Closure reason: split-follow-up`, mover para `tickets/closed/`, criar novo ticket `tickets/open/` com pendencias/falhas detalhadas e prioridade inicial `P0`, depois commit/push no mesmo ciclo.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `INTERNAL_TICKETS.md` com definicao do fechamento por handoff (`split-follow-up`) e rastreabilidade minima entre ticket pai e follow-up.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/templates/internal-ticket-template.md` para incluir `split-follow-up` entre motivos validos de fechamento e campos sugeridos para vinculo com ticket anterior.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar `RUN_ALL_MAX_TICKETS_PER_ROUND` em `src/config/env.ts` com `z.coerce.number().int().positive().default(20)`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.ts` para interromper a rodada quando `processedTicketsCount >= RUN_ALL_MAX_TICKETS_PER_ROUND`, com estado `idle` e mensagem acionavel para nova rodada manual.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/config/env.test.ts` cobrindo default `20`, valor customizado valido e rejeicao de valor invalido (`<=0` ou nao inteiro).
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenario de fila > limite e assert de parada no ticket limite, sem erro tecnico.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` documentando `RUN_ALL_MAX_TICKETS_PER_ROUND` e comportamento de encerramento controlado por limite.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` com regra de handoff `NO_GO` e guardrail de 20 tickets por rodada.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/config/env.test.ts src/core/runner.test.ts`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build`.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar diff final com `git status --short` e `git diff -- prompts/04-encerrar-ticket-commit-push.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md src/config/env.ts src/config/env.test.ts src/core/runner.ts src/core/runner.test.ts README.md docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.

## Validation and Acceptance
- Comando: `npx tsx --test src/config/env.test.ts`
  - Esperado: `RUN_ALL_MAX_TICKETS_PER_ROUND` defaulta para `20` e aceita override inteiro positivo.
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: rodada `/run-all` encerra no limite configurado sem erro tecnico e sem processar ticket `N+1`.
- Comando: `rg -n "NO_GO|split-follow-up|follow-up" prompts/04-encerrar-ticket-commit-push.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md`
  - Esperado: contrato de handoff `NO_GO` aparece de forma explicita e consistente.
- Comando: `npm test`
  - Esperado: regressao completa verde.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erro.
- Validacao operacional dirigida (repositorio alvo real): executar um `/run_all` onde a etapa de fechamento resulte em `NO_GO`.
  - Esperado: ticket original fechado em `tickets/closed/`, follow-up criado em `tickets/open/`, commit/push realizado, e runner segue para o proximo ticket ate limite da rodada.

## Idempotence and Recovery
- Idempotencia:
  - reaplicar o prompt atualizado em cenario `GO` nao altera o fluxo atual.
  - em `NO_GO`, reexecutar rodada apos handoff cria progresso sobre novo ticket, sem reabrir o ticket anterior.
  - o limite por rodada e deterministico para o mesmo valor de configuracao.
- Riscos:
  - classificacao incorreta de `NO_GO` pode gerar handoff desnecessario.
  - follow-up sem rastreabilidade adequada pode fragmentar historico.
  - backlog legitimo > 20 tickets exigira multiplas rodadas manuais.
- Recovery / Rollback:
  - se `split-follow-up` gerar ruido, manter metadado mas reforcar template/checklist ate padronizar.
  - se limite de `20` for baixo para operacao especifica, ajustar por env sem alterar codigo.
  - em regressao critica, reverter prompt para fluxo anterior e manter bloqueio fail-fast ate nova iteracao.

## Artifacts and Notes
- Contexto do incidente fonte (projeto alvo): `/home/mapita/projetos/guiadomus-matricula`.
- Evidencia chave observada:
  - erro final do runner: `Falha na etapa close-and-version ... Repositorio com alteracoes locais apos close-and-version.`
  - warning de `stderr` na etapa `implement` com exit code `0` nao encerrou o stage.
- Referencias internas de comportamento atual:
  - `src/integrations/codex-client.ts` (tratamento de `stderr` e `exit code`).
  - `src/integrations/git-client.ts` (validacao de working tree limpo e push obrigatorio).
  - `src/core/runner.ts` (loop `/run-all`, fail-fast e protecao de ticket reaparecido).

## Interfaces and Dependencies
- Interfaces alteradas:
  - `AppEnv` em `src/config/env.ts` passa a incluir `RUN_ALL_MAX_TICKETS_PER_ROUND`.
  - contrato textual de `prompts/04-encerrar-ticket-commit-push.md` passa a suportar desfecho `NO_GO` com handoff versionado.
  - padrao de fechamento em `tickets/templates/internal-ticket-template.md` passa a incluir `split-follow-up`.
- Compatibilidade:
  - comportamento atual de sucesso (`GO`) permanece.
  - comportamento de erro tecnico permanece fail-fast.
  - limite de rodada tem default seguro e override por ambiente para manter flexibilidade operacional.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime.
  - testes continuam com doubles locais (`runner.test.ts`) sem acesso de rede.
