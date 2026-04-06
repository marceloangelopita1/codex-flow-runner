# target-investigate-case silent degradation and false success gap

## Purpose / Big Picture
- Objetivo: eliminar a situacao em que uma etapa obrigatoria de `semantic-review` ou `causal-debug` falha, mas o fluxo ainda termina como `success/completed` e anuncia artefatos inexistentes.
- Resultado esperado: `/target_investigate_case` passa a fechar com classificacao operacional explicita, resumo auditavel e artefatos reais, sem quebrar a fronteira entre bounded confirmation, causal-debug repo-aware e publication runner-side.
- Escopo: `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, testes e spec viva.
- Fora de escopo: alterar a semantica interna do target-project, remover `semantic-review`, abrir leitura runner-side do repositorio alvo fora do contrato e publicar ticket sem `ticket-proposal.json`.

## Progress
- [x] 2026-04-06 08:20Z - Diagnostico estrutural consolidado a partir da rodada ancora e do trace local.
- [x] 2026-04-06 08:55Z - Implementacao runner-side concluida com falha estruturada e `realizedArtifactPaths`.
- [x] 2026-04-06 09:34Z - Validacao final ampla, reproducao controlada da rodada ancora e write-back documental concluidos.

## Surprises & Discoveries
- 2026-04-06 08:24Z - O comportamento observado nao era mero bug acidental: o execplan `2026-04-05-target-investigate-case-semantic-review-runner-milestone-3.md` documentava a “degradação segura” como decisao temporaria, que ficou obsoleta depois que publication passou a depender de `semantic-review` e `causal-debug`.
- 2026-04-06 08:31Z - O falso positivo no Telegram nao vinha do bot em si; ele apenas renderizava `summary.artifactPaths`, que no runner ainda eram montados pela lista canonica do contrato, e nao pelos arquivos realmente existentes.

## Decision Log
- 2026-04-06 - Decisao: falha runner-side obrigatoria deixa de ser degradacao silenciosa e passa a encerrar o fluxo com `failed` estruturado.
  - Motivo: depois da evolucao para publication real, a degradacao deixou de ser segura e passou a esconder erro operacional.
  - Impacto: o operador diferencia “caso inconclusivo legitimo” de “etapa obrigatoria falhou”.
- 2026-04-06 - Decisao: o resumo final e o Telegram passam a usar apenas artefatos realizados no disco mais artefatos versionados.
  - Motivo: impedir paths fantasmas no resumo final e no trace.
  - Impacto: o resumo final fica auditavel e alinhado ao estado real da rodada.

## Outcomes & Retrospective
- Status final: concluido nesta execucao local; implementacao, validacao ampla e write-back documental ficaram consistentes.
- O que funcionou: reancorar o problema na rodada real, endurecer `prepareRound`, falhar cedo em `evaluateTargetInvestigateCaseRound`, propagar `failureSurface/failureKind/nextAction` ate o Telegram e trocar o resumo final para `realizedArtifactPaths`.
- O que ficou pendente: apenas o fechamento versionado do ticket junto do commit definitivo e a validacao manual externa via Telegram autorizado, que ja era pendencia operacional da spec maior.
- Proximos passos: consolidar o changeset em commit, fechar o ticket local e executar a rodada manual externa quando apropriado.

## Context and Orientation
- Arquivos principais:
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Spec de origem: `docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md`
- Caso ancora: `/home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T05-31-37Z`
- Assumptions / defaults adotados:
  - target continua dono da semantica, causal-debug e ticket-proposal;
  - runner continua dono da orquestracao, do gate mecanico e da publication final;
  - `semantic-review` continua bounded e sem leitura aberta de repositorio.

## Plan of Work
- Milestone 1:
  - Entregavel: `round-preparer` deixando de degradar silenciosamente falhas de `semantic-review` e `causal-debug`.
  - Evidencia de conclusao: testes do preparer cobrem request invalido e parse invalido com `failed` estruturado.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`.
- Milestone 2:
  - Entregavel: executor e avaliacao final falhando explicitamente quando packet `ready` nao tem artefato obrigatorio materializado.
  - Evidencia de conclusao: `src/core/target-investigate-case.test.ts` passa a rejeitar `semantic-review.result.json` ausente/invalido e o executor propaga `failureSurface`.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`.
- Milestone 3:
  - Entregavel: resumo final do runner e Telegram usando somente `realizedArtifactPaths` e completion reasons especificos.
  - Evidencia de conclusao: `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` validam a classificacao e a lista de artefatos reais.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, testes correspondentes.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Tipar falha estruturada de `target-investigate-case` e propagar `realizedArtifactPaths`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Remover a degradacao silenciosa do `round-preparer` para subetapas obrigatorias.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Endurecer `evaluateTargetInvestigateCaseRound` e o executor contra packet `ready` sem artefato materializado.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar runner/Telegram/testes para diferenciar falha operacional e listar apenas artefatos reais.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar validacoes automatizadas e checagem ancorada na rodada real `2026-04-06T05-31-37Z`.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito: o fluxo nao encerra como sucesso quando `semantic-review` ou `causal-debug` obrigatorios falham.
  - Evidencia observavel: `src/core/runner.ts` emite `semantic-review-failed`, `causal-debug-failed`, `round-materialization-failed` ou `round-evaluation-failed`.
  - Requisito: o resumo final nao anuncia artefatos inexistentes.
  - Evidencia observavel: `realizedArtifactPaths` substitui a lista canonica nos summaries do runner.
  - Requisito: o operador entende por que o ticket nao foi criado.
  - Evidencia observavel: reply imediato do Telegram inclui `failureSurface`, `failureKind`, `failedAtMilestone`, `nextAction` e `artefatos locais`.
- Comando: `npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: `exit 0`.
- Comando: `npm run check`
  - Esperado: `exit 0`.
- Comando: `npm test`
  - Esperado: `exit 0`.
- Comando: reproducao controlada da rodada ancora `2026-04-06T05-31-37Z` em projeto temporario com o manifesto real do piloto e os artefatos reais da rodada.
  - Esperado: `status=failed`, `failureSurface=semantic-review`, `failureKind=artifact-validation-failed`, `failedAtMilestone=publication`.

## Idempotence and Recovery
- Idempotencia: rerodar a mesma investigacao apos corrigir a etapa obrigatoria apenas materializa os artefatos faltantes/validos no namespace da rodada nova.
- Riscos: classificacao runner-side excessivamente generica em falhas inesperadas fora de `semantic-review`/`causal-debug`.
- Recovery / Rollback: reverter o contrato de falha estruturada volta o problema de limbo operacional; os testes novos capturam essa regressao.

## Artifacts and Notes
- PR/Diff: changeset local ainda nao commitado.
- Logs relevantes:
  - `npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - `npm run check`
  - `npm test`
- Evidencias de teste:
  - falha runner-side de `semantic-review` agora encerra o executor como `failed`;
  - Telegram imediato exibe surface/kind/artefatos reais;
  - flow summary usa `realizedArtifactPaths`.
  - a reproducao controlada do round ancora real agora classifica a ausencia de `semantic-review.result.json` como falha operacional em `publication`, sem anunciar artefatos inexistentes.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `TargetInvestigateCaseExecutionResult.failed` passa a aceitar resumo estruturado;
  - `TargetInvestigateCaseCompletedSummary` passa a expor `realizedArtifactPaths`;
  - `TargetInvestigateCaseFlowCompletionReason` ganha variantes especificas de falha operacional.
- Compatibilidade: mantida para callers que ainda leem `message`, com enriquecimento opcional por `summary`.
- Dependencias externas e mocks:
  - Codex CLI continua mockado nos testes;
  - target project continua sem alteracao obrigatoria para este fix runner-side.
