# ExecPlan - Alinhar RF-24 de sequencialidade com contrato multi-runner

## Purpose / Big Picture
- Objetivo: remover a ambiguidade do RF-24 da spec de UX por clique, alinhando a semantica de "sequencialidade" com o contrato multi-runner vigente.
- Resultado esperado:
  - decisao explicita registrada sobre a semantica do RF-24 (`sequencial global` ou `sequencial por projeto`), com recomendacao tecnica baseada no comportamento atual.
  - RF-24, CAs associados e secoes de status da spec alvo atualizados para linguagem nao ambigua e verificavel.
  - rastreabilidade bidirecional entre a spec de UX por clique e a spec de multi-runner, evitando leituras conflitantes em triagens futuras.
  - caso a decisao escolhida exija mudanca de comportamento (nao apenas texto), follow-up tecnico aberto e referenciado.
- Escopo:
  - revisar e ajustar a spec `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`.
  - atualizar rastreabilidade/decisoes na spec `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` quando necessario para manter consistencia documental.
  - validar coerencia com evidencias do runner e testes existentes.
- Fora de escopo:
  - alterar arquitetura do runner multi-slot.
  - mudar limite de capacidade global (5 runners).
  - fechar ticket, mover arquivo para `tickets/closed/` ou realizar commit/push nesta etapa.

## Progress
- [x] 2026-02-20 23:15Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md` e referencias tecnicas/documentais.
- [x] 2026-02-20 23:19Z - Decisao de semantica do RF-24 registrada no documento alvo.
- [x] 2026-02-20 23:19Z - RF/CA/status da spec de UX por clique atualizados e sem ambiguidade.
- [x] 2026-02-20 23:19Z - Rastreabilidade cruzada com spec multi-runner consolidada.
- [x] 2026-02-20 23:22Z - Validacao final por comandos observaveis concluida.

## Surprises & Discoveries
- 2026-02-20 23:06Z - A spec de UX por clique define RF-24 como "sem paralelizacao de execucoes" sem qualificador de escopo (`global` vs `por projeto`), abrindo margem para interpretacao conflitante.
- 2026-02-20 23:07Z - A spec de multi-runner ja formaliza execucao concorrente entre projetos, mantendo sequencialidade apenas dentro de cada projeto.
- 2026-02-20 23:08Z - O core do runner implementa lock por slot de projeto e limite global de capacidade, reforcando que a regra tecnica vigente e "sequencial por projeto".
- 2026-02-20 23:09Z - A evidencia apontada no ticket em `src/integrations/telegram-bot.test.ts:2284` hoje refere-se a callback de `/plan_spec`; a prova direta de multi-runner em `/status` esta em trecho posterior do mesmo arquivo.

## Decision Log
- 2026-02-20 - Decisao: tratar este ticket como alinhamento de contrato funcional/documental, com preservacao do comportamento multi-runner entregue.
  - Motivo: o problema reportado e divergencia de redacao e criterio de aceite, com baixo impacto funcional imediato.
  - Impacto: prioridade em atualizar spec + rastreabilidade; codigo so muda se uma decisao de produto exigir semantica diferente da implementacao atual.
- 2026-02-20 - Decisao: adotar como baseline a semantica "sequencial por projeto" para RF-24, salvo orientacao explicita contraria do owner.
  - Motivo: alinhamento com spec multi-runner aprovada e evidencias no runner/testes.
  - Impacto: RF-24 e CA de concorrencia precisam explicitar escopo por projeto e convivencia entre projetos distintos.
- 2026-02-20 - Decisao: se o owner optar por "sequencial global", abrir follow-up tecnico obrigatorio no mesmo ciclo documental.
  - Motivo: evitar inconsistencia entre documento e comportamento real do sistema.
  - Impacto: novo ticket/execplan tecnico para reintroduzir gate global ou equivalente.

## Outcomes & Retrospective
- Status final: concluido (GO) com alinhamento documental aprovado e validacao tecnica verde.
- O que funcionou:
  - referencias do ticket forneceram contexto suficiente para delimitar escopo documental vs tecnico.
  - conflito principal ficou claramente localizado em RF-24 e no criterio de concorrencia associado.
  - validacoes de teste em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` confirmaram compatibilidade com o contrato multi-runner vigente.
- O que ficou pendente:
  - Nenhum pendente funcional neste recorte.
- Proximos passos:
  - Encerrar ticket em etapa de fechamento operacional com commit/push e metadados de closure.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - `SPECS.md`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Evidencias relevantes ja levantadas:
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md:64` (RF-24 atual ambiguo).
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md:24` e `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md:37` (concorrencia entre projetos + sequencialidade por projeto).
  - `src/core/runner.ts:2022` e `src/core/runner.ts:2178` (slot por projeto + mensagem de capacidade global).
  - `src/core/runner.test.ts:1177` e `src/core/runner.test.ts:1251` (capacidade 5 e coexistencia multi-projeto).
  - `src/integrations/telegram-bot.test.ts:2951` (status exibe slots ativos globais `N/5`).
- Fluxo atual relevante:
  - callbacks de `/specs` iniciam triagem via `run_specs` e dependem das mesmas regras de admissao do runner.
  - o runner aceita execucoes paralelas em projetos distintos, com exclusao mutua por projeto.
- Restricoes tecnicas:
  - manter arquitetura sequencial de tickets dentro de cada projeto.
  - nao introduzir dependencias novas.
  - preservar rastreabilidade em spec e ticket.

## Plan of Work
- Milestone 1 - Definir e registrar semantica oficial do RF-24
  - Entregavel: decisao explicita (`global` ou `por projeto`) documentada na spec alvo, sem termos ambiguos.
  - Evidencia de conclusao: secao de requisitos/decisoes da spec inclui a semantica escolhida e justificativa.
  - Arquivos esperados: `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`.
- Milestone 2 - Ajustar RF/CA/status da spec de UX por clique
  - Entregavel: RF-24 e CAs de concorrencia refletem o escopo correto; estado de atendimento deixa de depender de interpretacao implicita.
  - Evidencia de conclusao: matriz de status e pendencias nao traz conflito com multi-runner vigente.
  - Arquivos esperados: `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`.
- Milestone 3 - Consolidar rastreabilidade cruzada entre specs
  - Entregavel: ligacoes explicitas entre spec de UX e spec de multi-runner no ponto de sequencialidade.
  - Evidencia de conclusao: cada documento aponta o outro no contexto de concorrencia/limites, sem contradicoes.
  - Arquivos esperados:
    - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
    - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
- Milestone 4 - Validar coerencia documental e tecnica
  - Entregavel: verificacoes observaveis comprovam que texto final bate com comportamento atual do runner/testes.
  - Evidencia de conclusao: comandos de busca e testes alvo executados com resultado esperado.
  - Arquivos esperados: sem novos arquivos obrigatorios; atualizacoes apenas nas specs.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-24|CA-10|paralelizacao|sequencial" docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` para baseline textual da ambiguidade.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "concorrente|sequencial|por projeto|5 runners" docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` para baseline do contrato multi-runner.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` para:
   - reescrever RF-24 com escopo explicito;
   - ajustar CA de concorrencia associada ao mesmo escopo;
   - atualizar `Status de atendimento` e `Pendencias em aberto` de acordo com a decisao.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` (se necessario) para acrescentar rastreabilidade explicita desta decisao de RF-24.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar o historico nas specs alteradas com timestamp UTC e descricao objetiva da decisao.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-24|por projeto|global|tickets/closed/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md" docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` para comprovar consistencia e rastreabilidade.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts` para confirmar que o comportamento tecnico usado como referencia (slot por projeto/capacidade global) permanece valido.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para confirmar evidencias de observabilidade e contratos de concorrencia no canal Telegram.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` para auditoria final da mudanca documental.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a decisao final for `sequencial global`, criar ticket follow-up tecnico em `tickets/open/` antes de concluir o fechamento deste ticket.

## Validation and Acceptance
- Comando: `rg -n "RF-24|CA-10|sequencial|paralelizacao" docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - Esperado: RF-24 e CA de concorrencia com escopo explicito (`global` ou `por projeto`), sem texto ambiguo.
- Comando: `rg -n "multi-runner|por projeto|5 runners|RF-24" docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - Esperado: rastreabilidade cruzada entre as duas specs e ausencia de contradicao semantica.
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cenarios de capacidade/slot por projeto aprovados, sustentando a semantica tecnica documentada.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: contratos de callback/status continuam coerentes com o texto atualizado da spec.
- Comando: `git diff -- docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - Esperado: diff restrito ao alinhamento de requisito/rastreabilidade, sem mudancas acidentais fora do escopo.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os comandos de busca/validacao deve produzir resultado consistente sem efeitos colaterais.
  - reaplicar ajustes de redacao nao deve alterar comportamento do sistema, apenas clarificar contrato documental.
- Riscos:
  - escolher semantica global sem follow-up tecnico geraria desvio entre documento e implementacao.
  - atualizar apenas uma das specs pode manter contradicao residual.
  - termos vagos em CA/status podem reintroduzir interpretacao conflitante no futuro.
- Recovery / Rollback:
  - se houver divergencia de interpretacao na revisao, reverter para redacao anterior e registrar decisao pendente no `Decision Log`.
  - se a decisao for global, abrir follow-up tecnico imediatamente e manter o ticket atual aberto ate rastreabilidade completa.
  - validar diff final por arquivo para evitar alteracoes fora das secoes planejadas.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`.
- ExecPlan deste trabalho: `execplans/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`.
- Referencias primarias:
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
  - `SPECS.md`
- Evidencias tecnicas de apoio:
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Observacao operacional:
  - este plano nao inclui fechamento de ticket nem versionamento; esses passos pertencem a etapa posterior do fluxo.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contratos documentais da spec de UX por clique (RF/CA/status relacionados a concorrencia).
  - possivel nota de rastreabilidade na spec de multi-runner para alinhamento semantico.
- Compatibilidade:
  - objetivo principal e manter compatibilidade com o comportamento multi-runner ja entregue (sem regressao funcional).
  - se houver decisao por semantica global, a compatibilidade atual sera quebrada e exigira follow-up tecnico dedicado.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime.
  - validacao baseada em testes existentes (`runner.test.ts` e `telegram-bot.test.ts`) e evidencias documentais.
