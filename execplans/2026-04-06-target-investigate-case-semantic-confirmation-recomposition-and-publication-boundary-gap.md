# target-investigate-case semantic confirmation recomposition and publication boundary gap

## Purpose / Big Picture
- Objetivo: eliminar o colapso indevido para `runner-limitation` quando o target-project ja possui hipotese causal forte, materializar a recomposicao oficial apos `semantic-review.result.json` e manter a fronteira correta entre semantica do target e publication do runner.
- Resultado esperado: o runner preserva a causalidade declarada pelo target, executa o bounded semantic review quando o packet esta pronto, reroda a recomposicao oficial quando o manifesto a declarar e so avalia/publica usando `assessment.json` fresco.
- Escopo: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, testes do core/preparer e atualizacao da spec viva do fluxo.
- Fora de escopo: validacao manual via Telegram autorizado; mudancas semanticas internas do target-project fora da capability `case-investigation`.

## Progress
- [x] 2026-04-06 02:43Z - Planejamento inicial concluido.
- [x] 2026-04-06 02:58Z - Implementacao runner-side concluida.
- [x] 2026-04-06 03:18Z - Validacao final concluida.

## Surprises & Discoveries
- 2026-04-06 02:46Z - O schema do manifesto ja aceitava `semanticReview.recomposition`, mas a normalizacao do manifesto rico do piloto descartava esse bloco; sem essa ponte, o rerun oficial nunca seria acionado no fluxo real.
- 2026-04-06 02:52Z - Os fixtures simplificados do `round-preparer` estavam abaixo do shape rico atual de `case-resolution.json`; alinhar os testes ao contrato real foi necessario para provar a recomposicao end-to-end.

## Decision Log
- 2026-04-06 - Decisao: tratar ausencia de `semantic-review.result.json` como bloqueio de confirmacao/publication, nao como redefinicao da causa principal para `runner-limitation`.
  - Motivo: o runner deve respeitar a autoridade semantica do target-project e so marcar `runner-limitation` quando a limitacao principal for realmente do runner.
  - Impacto: `bug_likely` com packet `ready` continua inconclusivo, mas preserva a superficie causal do target.
- 2026-04-06 - Decisao: exigir recomposicao oficial do target quando o manifesto declarar `semanticReview.recomposition`.
  - Motivo: o runner ja materializa `semantic-review.result.json`, mas nao pode inventar um `assessment` sintetico runner-side.
  - Impacto: a avaliacao final passa a depender de `assessment.json` recomposto pelo entrypoint oficial do projeto alvo.

## Outcomes & Retrospective
- Status final: concluido com validacao automatizada verde no runner.
- O que funcionou: a normalizacao do manifesto rico, a recomposicao oficial injetada no `round-preparer`, a validacao contra `assessment` stale e a atualizacao dos testes do core/preparer.
- O que ficou pendente: apenas a validacao manual via Telegram autorizado, ja registrada na spec viva.
- Proximos passos: validar o caso real e manter a ponte contratual com o target-project nas proximas evolucoes da capability.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
- Spec de origem: `docs/history/target-investigate-case/2026-04-03-pre-v2-foundation.md`
- RFs/CAs cobertos por este plano:
  - RF-18, RF-35, RF-36, RF-40, RF-41
  - RF-46, RF-47, RF-48, RF-49
  - CA-06, CA-07, CA-14, CA-18, CA-19, CA-20, CA-21
- Assumptions / defaults adotados:
  - o target-project continua autoridade semantica do caso;
  - o runner continua autoridade final de publication;
  - `semantic-review` permanece bounded, sem descoberta livre de evidencia.
- Fluxo atual: preparar rodada -> detectar packet `ready` -> executar Codex bounded -> persistir `semantic-review.result.json` -> recompor artefatos no target se suportado -> avaliar publication no runner.
- Restricoes tecnicas:
  - nao copiar payload sensivel para o trace;
  - nao abrir ticket automatico so por narrativa;
  - nao degradar causalidade local para `runner-limitation` fora do caso proprio do runner.

## Plan of Work
- Milestone 1:
  - Entregavel: manifesto rico do piloto preservando `semanticReview.recomposition` dentro do contrato normalizado do runner.
  - Evidencia de conclusao: `loadTargetInvestigateCaseManifest` passa a expor recomposicao e sintomas nos testes.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`.
- Milestone 2:
  - Entregavel: `round-preparer` executando recomposicao oficial e rejeitando `assessment` stale.
  - Evidencia de conclusao: testes do `round-preparer` passam a cobrir o rerun oficial com espelhamento de artefatos recompostos.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`.
- Milestone 3:
  - Entregavel: avaliacao final do runner preservando `bug_likely` target-side enquanto a confirmacao bounded ainda esta pendente.
  - Evidencia de conclusao: `src/core/target-investigate-case.test.ts` deixa de esperar `runner-limitation` nesse cenario e valida stale detection quando o target ignora resultado confirmado.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`, spec viva.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/target-investigate-case.ts` para preservar `semanticReview.recomposition` e `semanticReview.symptoms` ao normalizar o manifesto rico.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/target-investigate-case-round-preparer.ts` para rerodar a recomposicao oficial do target e validar que o `assessment` recomposto consumiu `semantic-review.result.json`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/core/target-investigate-case.ts` e testes para impedir `runner-limitation` indevido e rejeitar `assessment` stale apos confirmacao bounded.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` e `npm test`.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito: o runner preserva a hipotese causal do target quando `semantic-review.result.json` ainda falta.
  - Evidencia observavel: `src/core/target-investigate-case.test.ts` valida `overall_outcome="inconclusive-case"` em vez de `runner-limitation` no cenario `bug_likely` com packet `ready`.
  - Requisito: o runner reroda a recomposicao oficial do target quando o manifesto a declara.
  - Evidencia observavel: `src/integrations/target-investigate-case-round-preparer.test.ts` prova o rerun oficial, o espelhamento de `assessment.json` recomposto e a persistencia de `semantic-review.result.json`.
  - Requisito: o runner rejeita `assessment` stale quando o target ignora confirmacao bounded valida.
  - Evidencia observavel: `src/core/target-investigate-case.test.ts` falha explicitamente se `primary_taxonomy` nao for promovida a `bug_confirmed` depois de `semantic-review.result.json` confirmado.
- Comando: `npm run check`
  - Esperado: `exit 0`.
- Comando: `npm test`
  - Esperado: suite completa verde.

## Idempotence and Recovery
- Idempotencia: o rerun oficial do target e protegido por manifesto explicito e usa o entrypoint canonico do proprio projeto alvo.
- Riscos: manifesto rico sem recomposicao mapeada; `assessment` stale apos materializacao do resultado; fixtures antigos abaixo do contrato real.
- Recovery / Rollback: remover o bloco `semanticReview.recomposition` do manifesto desativa a recomposicao; os testes de `round-preparer` e `core` capturam qualquer regressao contratual.

## Artifacts and Notes
- PR/Diff: changeset local ainda nao commitado.
- Logs relevantes:
  - `npm run check`
  - `npm test`
- Evidencias de teste:
  - `npx tsx --test src/core/target-investigate-case.test.ts`
  - `npx tsx --test src/integrations/target-investigate-case-round-preparer.test.ts`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato normalizado de `semanticReview` no manifesto do runner;
  - fluxo de `prepareRound` apos materializacao de `semantic-review.result.json`;
  - validacao de consistencia entre `assessment.json` e `semantic-review.result.json`.
- Compatibilidade: mantida com o manifesto rico do piloto e com o shape normalizado anterior; a recomposicao so roda quando declarada.
- Dependencias externas e mocks:
  - Codex CLI continua mockado nos testes;
  - recomposicao oficial do target e injetada nos testes do `round-preparer`.
