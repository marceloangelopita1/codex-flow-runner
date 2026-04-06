# target-investigate-case repo-aware causal-debug and ticket projection gap

## Purpose / Big Picture
- Objetivo: estender `/target_investigate_case` para incluir `causal-debug` repo-aware target-owned e `ticket-proposal.json` antes da publication runner-side.
- Resultado esperado: o runner preserva `semantic-review` bounded, orquestra a nova etapa repo-aware via manifesto do target e so publica ticket quando existir proposta target-owned suficiente.
- Escopo: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/codex-client.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, testes do fluxo e manifesto-base do runner.
- Fora de escopo: alterar a autoridade final de publication, abrir descoberta livre de evidencia no bounded review ou mover o prompt repo-aware para o runner.

## Progress
- [x] 2026-04-06 05:24Z - Planejamento inicial concluído.
- [x] 2026-04-06 06:05Z - Implementação runner-side concluída.
- [x] 2026-04-06 06:40Z - Validação final concluída.

## Surprises & Discoveries
- 2026-04-06 05:42Z - O manifesto-base generico do runner ainda nao declarava `causalDebug`; isso fazia alguns fixtures testarem publication positiva sem que o contrato novo fosse explicitado.
- 2026-04-06 06:02Z - O executor controlado ainda copiava apenas assessment/dossier no teste de versionamento, o que escondia a nova dependencia de `ticket-proposal.json`.

## Decision Log
- 2026-04-06 - Decisão: usar o prompt repo-aware do target em caminho canonico e declarativo.
  - Motivo: a causa minima e o conteudo semantico do ticket continuam pertencendo ao target.
  - Impacto: nenhum prompt runner-side novo foi criado para `causal-debug`.
- 2026-04-06 - Decisão: exigir `ticket-proposal.json` sempre que `publication_recommendation.recommended_action="publish_ticket"`.
  - Motivo: publication runner-side precisa de artefato target-owned mais forte do que narrativa textual.
  - Impacto: publication positiva passou a falhar cedo quando o target nao materializa a projecao de ticket.

## Outcomes & Retrospective
- Status final: concluido com testes verdes.
- O que funcionou: tipagem do contrato, nova integracao de `causal-debug`, sincronizacao de artefatos e reaproveitamento do publisher com markdown do target.
- O que ficou pendente: nenhuma pendencia runner-side nesta frente incremental.
- Próximos passos: validar sempre a capability do target contra o mesmo contrato antes de novas evolucoes de publication.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/target-investigate-case-causal-debug.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `docs/workflows/target-case-investigation-manifest.json`
- Spec de origem: `docs/specs/2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08
  - CA-01, CA-02, CA-03, CA-04, CA-05
- Assumptions / defaults adotados:
  - `semantic-review` continua bounded;
  - `causal-debug` pertence ao target;
  - `ticket-proposal.json` e precondicao de publication positiva.
- Fluxo atual: materializacao -> semantic review bounded -> recomposicao -> causal-debug repo-aware -> ticket projection -> publication.
- Restrições técnicas:
  - sem descoberta externa de evidencia;
  - sem publication positiva sem proposta de ticket;
  - sem prompt repo-aware ad hoc por projeto.

## Plan of Work
- Milestone 1:
  - Entregável: contrato do runner aceitando `causalDebug` e novos artefatos.
  - Evidência de conclusão: tipos, manifesto-base e testes do core aceitam o contrato novo.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `docs/workflows/target-case-investigation-manifest.json`, `src/core/target-investigate-case.test.ts`.
- Milestone 2:
  - Entregável: orquestração runner-side da etapa repo-aware e recomposição oficial do target.
  - Evidência de conclusão: `round-preparer` executa `causal-debug` e os testes cobrem o rerun oficial.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/target-investigate-case-causal-debug.ts`, `src/integrations/target-investigate-case-round-preparer.ts`.
- Milestone 3:
  - Entregável: publication runner-side condicionada a `ticket-proposal.json`.
  - Evidência de conclusão: o core bloqueia publication sem proposta e o publisher reaproveita markdown target-owned.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar tipos, schemas e manifesto-base para o bloco `causalDebug`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar o parser repo-aware e a chamada do prompt canônico do target em `codex-client` e `round-preparer`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar o core para consumir `ticket-proposal.json` e bloquear publication positiva quando o artefato faltar.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar testes do core/preparer/publisher/executor e rerodar a suíte.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: o runner reconhece `causalDebug` e os novos artefatos.
  - Evidência observável: `src/types/target-investigate-case.ts` e os testes do core aceitam o manifesto/assessment novos.
  - Requisito: o runner executa `causal-debug` via prompt declarado pelo target.
  - Evidência observável: `src/integrations/target-investigate-case-round-preparer.test.ts` cobre a etapa repo-aware e a recomposição.
  - Requisito: publication positiva exige `ticket-proposal.json`.
  - Evidência observável: `src/core/target-investigate-case.test.ts` falha sem proposta e publica quando a proposta existe.
  - Requisito: o publisher usa o markdown do target.
  - Evidência observável: `src/integrations/target-investigate-case-ticket-publisher.test.ts` permanece verde com `ticketProposal`.
- Comando: `npm run check`
  - Esperado: `exit 0`.
- Comando: `npm test`
  - Esperado: `exit 0`.
- Comando: `npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotência: as recomposicoes runner-side so rodam quando o manifesto declara suporte explicito; reruns repetidos mantem o mesmo namespace de artefatos.
- Riscos: fixtures desatualizados, publication positiva sem proposta target-owned, drift entre manifesto-base e manifesto rico do target.
- Recovery / Rollback: remover o bloco `causalDebug` do manifesto do target desabilita a nova etapa; os testes do core/preparer detectam regressao imediatamente.

## Artifacts and Notes
- PR/Diff: changeset local ainda nao commitado.
- Logs relevantes:
  - `npm run check`
  - `npm test`
- Evidencias de teste:
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.test.ts`

## Interfaces and Dependencies
- Interfaces alteradas:
  - manifesto de `/target_investigate_case` consumido pelo runner;
  - artefatos `causal-debug.request.json`, `causal-debug.result.json` e `ticket-proposal.json`;
  - publisher de ticket runner-side.
- Compatibilidade: mantida para targets legados nao elegiveis a publication positiva; targets novos devem declarar `causalDebug`.
- Dependencias externas e mocks:
  - Codex CLI segue mockado nos testes;
  - os testes do fluxo usam fixtures locais para o target project.
