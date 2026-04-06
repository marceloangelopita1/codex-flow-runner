# target-investigate-case root-cause-review and ticket-readiness hardening gap

## Purpose / Big Picture
- Objetivo: introduzir no runner a etapa target-owned `rootCauseReview` para que `/target_investigate_case` diferencie causa confirmada de causa apenas plausível antes de qualquer `publish_ticket`.
- Resultado esperado: manifests que declararem `rootCauseReview` passam a materializar `root-cause-review.request.json` e `root-cause-review.result.json`, recompõem `assessment.json` após essa etapa e bloqueiam publication positiva quando a revisão permanecer `plausible_but_unfalsified`, `inconclusive`, ausente, inválida ou contradita pelo `ticket-proposal.json`.
- Escopo: contrato e normalização do manifesto, schemas/tipos/artifact paths do runner, cliente Codex, parser da nova etapa, `round-preparer`, avaliação/publication runner-side, testes automatizados e registro manual da policy de rollout legado no ticket antes do fechamento.
- Fora de escopo: alterar o projeto alvo `../guiadomus-matricula`; reabrir o hardening editorial/naming de `causal-debug.result.json` e `ticket-proposal.json` já isolado em `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`; mover a autoridade semântica do target para o runner.

## Progress
- [x] 2026-04-06 20:01Z - Planejamento inicial concluído após releitura integral do ticket, da spec de origem e das referências cross-repo.
- [x] 2026-04-06 - Contrato runner-side atualizado para aceitar `rootCauseReview`, artefatos canônicos, trace/summaries dedicados e o enum explícito de `root_cause_status`.
- [x] 2026-04-06 - `root-cause-review` passou a executar depois de `causal-debug`, persistir `root-cause-review.result.json` e recompor/sincronizar os artefatos oficiais quando o manifesto declara recomposição.
- [x] 2026-04-06 - A avaliação/publication runner-side foi endurecida para bloquear ausência, invalidez, `plausible_but_unfalsified`, `inconclusive` e contradições com `ticket-proposal.json`, preservando o path legado manifesto-first.
- [x] 2026-04-06 - Matriz automatizada executada com `npm test -- ...` e `npm run check`, e a revisão manual da policy de rollout legado foi registrada no ticket.

## Surprises & Discoveries
- 2026-04-06 20:01Z - O manifesto real do target está no formato piloto e a normalização runner-side hoje só traduz `semanticReview` e `causalDebug`; aceitar `rootCauseReview` só no schema interno não basta.
- 2026-04-06 20:01Z - O `round-preparer` atual executa apenas `semantic-review` e `causal-debug`, apaga/sincroniza somente esses artefatos e reread/revalida `assessment.json` uma única vez depois deles.
- 2026-04-06 20:01Z - O core do runner tem discovery, trace, summary, failure surface e gates explícitos para `semantic-review` e `causal-debug`, mas nenhuma superfície equivalente para `root-cause-review`.
- 2026-04-06 20:01Z - O target ainda projeta `ticket-proposal.json` diretamente a partir de `causal-debug`; isso confirma que o runner precisa depender de declaração explícita no manifesto e nunca inferir a nova etapa por heurística.
- 2026-04-06 20:01Z - A fronteira de ownership com `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md` já está reconciliada na spec e no ticket: este plano fica restrito a `rootCauseReview`, gates causais e rollout legado.
- 2026-04-06 - Atualizar o manifesto canônico de referência para documentar `rootCauseReview` exigiu blindar os fixtures default do core: eles agora removem explicitamente esse bloco quando o teste quer provar o path legado.
- 2026-04-06 - O script `npm test -- <arquivos>` do repositório continua expandindo `src/**/*.test.ts`; na prática, a validação observável desta etapa virou uma prova repo-wide com 600 testes verdes, não só a frente focal listada no plano.

## Decision Log
- 2026-04-06 - Decisão: preservar sem consolidação o enum finito `root_cause_confirmed | plausible_but_unfalsified | inconclusive`.
  - Motivo: o ticket e a spec de origem já canonizaram esse conjunto fechado; um critério agregado como “status válido” não prova cobertura suficiente.
  - Impacto: schema, testes e matriz de validação precisam cobrir positivamente os três membros aceitos e rejeitar valores fora do conjunto.
- 2026-04-06 - Decisão: modelar `ticket_readiness` como sinal separado de `root_cause_status`, com caminho positivo mínimo `status="ready"` e bloqueio para qualquer outro estado enquanto não houver allowlist negativa canônica na spec.
  - Motivo: o ticket exige separação entre confirmação causal e readiness, mas não canoniza um conjunto fechado para os estados negativos.
  - Impacto: o runner exige `ready` para publication no path novo e trata qualquer estado diferente como não pronto sem inventar semântica adicional.
- 2026-04-06 - Decisão: expor a nova etapa em `assessment.json` via um bloco dedicado `root_cause_review`, em vez de sobrecarregar `causal_debug` ou `ticket_projection`.
  - Motivo: o ticket exige propagação observável de `root_cause_status`, `ticket_readiness` e gaps remanescentes nos artefatos oficiais antes da publication runner-side.
  - Impacto: tipos, validações, trace payload e summaries passam a carregar uma superfície própria da etapa nova.
- 2026-04-06 - Decisão: considerar contradição do `ticket-proposal.json` no path novo sempre que ele coexistir com `root_cause_status != root_cause_confirmed` ou `ticket_readiness.status != "ready"`.
  - Motivo: o runner não deve inferir confirmação causal a partir da mera existência do proposal.
  - Impacto: o core bloqueará publication e exigirá recomposição/ajuste target-owned quando proposal e `root-cause-review` divergirem.
- 2026-04-06 - Decisão: manter rollout manifesto-first e backward-compatible; ausência de `rootCauseReview` em manifest legado nunca será tratada como confirmação implícita.
  - Motivo: RF-05 e CA-05 exigem coexistência segura entre manifests legados e manifests novos.
  - Impacto: o path legado continua aceito, mas separado explicitamente do path novo; a revisão manual da policy de rollout precisa ser registrada no próprio ticket antes do fechamento.
- 2026-04-06 - Decisão: atualizar o manifesto/documento canônico com `rootCauseReview`, mas preservar fixtures e cenários default de teste no path legado por remoção explícita desse bloco quando o teste não faz opt-in.
  - Motivo: a documentação viva precisa refletir o contrato novo, mas a suíte ainda precisa provar CA-05 sem depender de dois manifests canônicos concorrentes.
  - Impacto: o repositório documenta o contrato novo em `docs/workflows/target-case-investigation-manifest.json`, enquanto os testes distinguem conscientemente rollout novo vs. legado.

## Outcomes & Retrospective
- Status final: implementação e validação automatizada concluídas nesta etapa; ticket permaneceu aberto por contrato desta execução.
- O que funcionou: o hardening entrou de ponta a ponta no contrato, no `round-preparer`, no core de publication, no manifesto/documentação e na suíte automatizada, com cobertura explícita para rollout legado e para proposal contraditório.
- O que ficou pendente: nenhum blocker técnico local foi identificado; o único passo fora desta etapa continua sendo o fechamento posterior do ticket/commit quando o fluxo sequencial mandar.
- Próximos passos: seguir com a etapa posterior do workflow sem reabrir o escopo deste plano, reaproveitando a nota de rollout legado já registrada no ticket.

## Context and Orientation
- Ticket de origem: `tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`.
- Spec de origem: `docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md`.
- Spec contextual do target: `../guiadomus-matricula/docs/specs/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening.md`.
- Referências principais já lidas:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-causal-debug.md`
  - `../guiadomus-matricula/utils/case-investigation/causal-debug.js`
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/codex-client.ts`
  - `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`
- RFs/CAs cobertos por este plano: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08; CA-01, CA-02, CA-03, CA-04, CA-05.
- RNFs e restrições herdados que precisam permanecer observáveis:
  - preservar a autoridade semântica target-owned;
  - manter a publication final runner-side;
  - não inventar causa do target no runner;
  - manter rollout aditivo e backward-compatible;
  - não overfitar a etapa nova ao caso âncora nem a um workflow específico;
  - tornar observável no próprio ticket a revisão manual da policy de rollout legado antes de ampliar a obrigatoriedade.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - os artefatos canônicos da etapa nova serão `root-cause-review.request.json` e `root-cause-review.result.json`, como já indicado no ticket e na spec;
  - `rootCauseReview` só será executado quando o manifesto declarar o bloco e o request da etapa existir em estado pronto; o runner não sintetizará request/result ausentes;
  - `ticket_readiness` será tratado como objeto/sinal separado de `root_cause_status`, com exigência runner-side mínima de `status="ready"` para publication positiva no path novo;
  - os detalhes aditivos exigidos pelo ticket serão aceitos no resultado da etapa sob membros opcionais explícitos e genéricos, alinhados à linguagem da spec: `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities` e `remaining_gaps`;
  - a coerência do path novo será validada comparando `root-cause-review.result.json`, `assessment.json` e a presença de `ticket-proposal.json`; proposal publicado fora de `root_cause_confirmed + ticket_readiness=ready` conta como contradição e bloqueio.
- Allowlists / enumerações finitas relevantes herdadas do ticket/spec:
  - `root_cause_status`: `root_cause_confirmed`, `plausible_but_unfalsified`, `inconclusive`.
  - Política de cobertura desta enumeração: sem consolidação; a validação deve provar o caminho positivo de `root_cause_confirmed`, o bloqueio explícito para `plausible_but_unfalsified` e `inconclusive`, e a rejeição de valores fora do conjunto via schema/parse.
- Fronteira de ownership com ticket histórico aberto:
  - `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md` permanece dono exclusivo do hardening editorial/naming e da exposição enriquecida em `causal-debug.result.json` e `ticket-proposal.json`.
  - Este plano cobre apenas `rootCauseReview`, ordenação da nova etapa, propagação de `root_cause_status`/`ticket_readiness`/`remaining_gaps`, gates causais runner-side e a prova de rollout legado.
  - Essa divisão evita `duplication-gap` e `closure-criteria-gap` porque cada ticket fecha uma superfície observável distinta.
- Fluxo atual observado no runner:
  - `buildTargetInvestigateCaseArtifactSet(...)` conhece apenas `semantic-review`, `causal-debug`, `ticket-proposal` e `publication-decision`;
  - `CodexCliTargetInvestigateCaseRoundPreparer` executa `completeSemanticReviewIfSupported(...)` e `completeCausalDebugIfSupported(...)`, depois reread/revalida `assessment.json`;
  - `evaluateTargetInvestigateCaseRound(...)` e helpers descobrem apenas `semanticReview` e `causalDebug`, constroem trace/summaries sem `root-cause-review` e podem publicar ticket quando o target pedir `publish_ticket` com `ticket-proposal.json`.

## Plan of Work
- Milestone 1: ampliar o contrato runner-side para a etapa `rootCauseReview`.
  - Entregável: `src/types/target-investigate-case.ts` e a normalização do manifesto piloto aceitam `rootCauseReview`, os artefatos `root-cause-review.request.json` / `root-cause-review.result.json`, o enum explícito de `root_cause_status`, o sinal separado de `ticket_readiness`, os campos opcionais genéricos escolhidos neste plano e os novos artifact paths/failure surfaces/trace types necessários.
  - Evidência de conclusão: manifests legado e novo fazem parse; o enum explícito é preservado sem consolidação; valores fora do conjunto falham; `assessment.json` passa a comportar um bloco dedicado `root_cause_review`.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`.
- Milestone 2: executar e materializar `root-cause-review` depois de `causal-debug`.
  - Entregável: cliente Codex e `round-preparer` ganham uma etapa dedicada para `root-cause-review`, com parser próprio, ordem fixa `semantic-review -> causal-debug -> root-cause-review`, persistência do resultado, recomposição oficial do target quando declarada e sincronização dos artefatos oficiais antes da publication.
  - Evidência de conclusão: testes do `round-preparer` provam que a nova etapa só roda após `causal-debug`, escreve o resultado canônico, reread/recompõe `assessment.json` e mantém `root_cause_status`, `ticket_readiness` e `remaining_gaps` observáveis nos artefatos oficiais.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-root-cause-review.ts` (novo), `src/integrations/target-investigate-case-round-preparer.test.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 3: endurecer a avaliação/publication runner-side sem quebrar manifests legados.
  - Entregável: o core descobre a nova etapa, valida coerência entre `assessment.json`, `root-cause-review.result.json` e `ticket-proposal.json`, bloqueia publication para ausência/invalidez/inconclusão/plausibilidade não falsificada ou proposal contraditório e mantém o path legado sem inferir confirmação implícita.
  - Evidência de conclusão: testes do core cobrem explicitamente `root_cause_confirmed`, `plausible_but_unfalsified`, `inconclusive`, resultado ausente/inválido, proposal contraditório e manifesto legado sem `rootCauseReview`.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`, possivelmente `src/core/runner.test.ts`.
- Milestone 4: fechar a trilha de aceite e de rollout legado.
  - Entregável: suíte automatizada alvo verde, `npm run check` verde e ticket atualizado com a revisão manual da policy final de rollout para manifests legados, a decisão tomada e as guardrails/condições para ampliar a obrigatoriedade.
  - Evidência de conclusão: comandos de validação com `exit 0` e presença observável da nota de rollout no `Decision log` ou `Closure` do ticket.
  - Arquivos esperados: `tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`, suites de teste afetadas.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`, `sed -n '1,260p' docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md`, `sed -n '232,420p' ../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json` e `rg -n "rootCauseReview|causalDebug|ticket-proposal|publication" src/types/target-investigate-case.ts src/core/target-investigate-case.ts src/integrations/target-investigate-case-round-preparer.ts src/integrations/codex-client.ts` para reabrir o contexto antes de qualquer edição.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/types/target-investigate-case.ts` para adicionar constantes, schemas e tipos da etapa nova, atualizar os schemas do manifesto interno e do manifesto piloto, expandir `TargetInvestigateCaseArtifactSet`, `TargetInvestigateCaseArtifactPaths`, failure surfaces e trace/final summary, e introduzir o bloco `assessment.root_cause_review` com os campos mínimos decididos neste plano.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` para criar `src/integrations/target-investigate-case-root-cause-review.ts` com parser dedicado do output e ajustar `src/integrations/codex-client.ts` para expor um método `runTargetInvestigateCaseRootCauseReview(...)` e o prompt builder correspondente, seguindo o padrão já existente para `semantic-review` e `causal-debug`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/integrations/target-investigate-case-round-preparer.ts` para implementar `completeRootCauseReviewIfSupported(...)`, limpar/persistir/sincronizar os novos artefatos, executar a nova etapa apenas após `causal-debug`, rerodar a recomposição oficial quando declarada e reread/revalidar os artefatos oficiais antes da publication.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/core/target-investigate-case.ts` para descobrir os artefatos de `root-cause-review`, validar coerência com `assessment.json` e `ticket-proposal.json`, bloquear publication conforme os closure criteria do ticket, manter o path legado explícito e atualizar trace payloads/summaries para carregar `root_cause_status`, `ticket_readiness` e `remaining_gaps`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, `src/integrations/codex-client.test.ts` e, se necessário, `src/core/runner.test.ts` para cobrir o enum explícito, a ordem de execução da nova etapa, o bloqueio por `plausible_but_unfalsified` e `inconclusive`, o caso com `ticket-proposal.json` contraditório e a compatibilidade com manifest legado.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` para validar a frente mais afetada.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem/lint/checks globais do repositório.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Usar `apply_patch` em `tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md` para registrar, em `Decision log` ou `Closure`, a revisão manual da policy de rollout legado, a decisão tomada e as guardrails/condições para ampliar a obrigatoriedade antes de qualquer fechamento do ticket.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisito: `RF-01 / RF-03 / RF-06 / CA-01`.
    Evidência observável: `src/types/target-investigate-case.ts` aceita `rootCauseReview` no manifesto interno e no manifesto piloto normalizado, tipa `root-cause-review.request.json` e `root-cause-review.result.json`, preserva explicitamente o enum `root_cause_confirmed | plausible_but_unfalsified | inconclusive`, carrega `ticket_readiness` como sinal separado e aceita os membros opcionais `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities` e `remaining_gaps` sem quebrar o shape declarado.
  - Requisito: cobertura da enumeração finita `root_cause_status`.
    Evidência observável: a suíte prova caminho positivo para `root_cause_confirmed`, bloqueio explícito para `plausible_but_unfalsified` e `inconclusive` e falha de parse/schema para qualquer valor fora do conjunto, sem consolidar os membros aceitos em uma verificação genérica.
  - Requisito: `RF-02 / RF-08 / CA-02`.
    Evidência observável: `src/integrations/codex-client.ts` e `src/integrations/target-investigate-case-round-preparer.ts` executam `root-cause-review` somente após `causal-debug`, persistem o resultado, reread/recompõem `assessment.json` e sincronizam os artefatos oficiais mantendo explícitos `root_cause_status`, `ticket_readiness` e `remaining_gaps` quando existirem.
  - Requisito: `RF-04 / RF-07 / CA-03`.
    Evidência observável: `src/core/target-investigate-case.ts` bloqueia `publish_ticket` quando `root-cause-review.result.json` está ausente, inválido ou inconclusivo, quando `root_cause_status=plausible_but_unfalsified` e quando `ticket-proposal.json` existe fora de `root_cause_confirmed + ticket_readiness.status="ready"`, sem substituir conteúdo target-owned por inferência runner-side.
  - Requisito: `RF-05 / CA-05`.
    Evidência observável: manifests legados sem `rootCauseReview` continuam aceitos pelo path legado sem inferir causa confirmada pela ausência da etapa nova; além disso, o ticket registra de forma observável a revisão manual da policy final de rollout legado, a decisão tomada e as guardrails/condições para ampliar a obrigatoriedade.
  - Requisito: `RF-04 / CA-04`.
    Evidência observável: `src/core/target-investigate-case.test.ts` e `src/integrations/target-investigate-case-round-preparer.test.ts` cobrem explicitamente o caso em que `ticket-proposal.json` existe, mas a publication positiva fica bloqueada porque `root-cause-review` retornou `plausible_but_unfalsified` ou `inconclusive`.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  - Esperado: `exit 0`, com asserts cobrindo o enum explícito de `root_cause_status`, a ordem `causal-debug -> root-cause-review`, o bloqueio do proposal contraditório e a compatibilidade do path legado.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: `exit 0`.
- Comando: `rg -n "rollout legado|rootCauseReview|obrigatoriedade ampla|guardrails" tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
  - Esperado: linhas no `Decision log` ou `Closure` registrando a revisão manual da policy de rollout legado, a decisão final e as condições para ampliar a obrigatoriedade.

## Idempotence and Recovery
- Idempotência: a etapa nova só roda quando o manifesto a declara e o request correspondente existe em estado pronto; reruns devem sobrescrever `root-cause-review.result.json`, recompor os artefatos oficiais e manter o mesmo gating determinístico para o mesmo conjunto de artefatos.
- Riscos principais:
  - drift entre o schema runner-side e o contrato que o target passará a emitir;
  - `assessment.json` ou `ticket-proposal.json` ficarem stale após a recomposição do target;
  - regressão em manifests legados se o path novo for tratado como obrigatório cedo demais;
  - fechamento do ticket sem a revisão manual explícita da policy de rollout legado.
- Recovery / Rollback:
  - se o target ainda não estiver pronto, manter `rootCauseReview` ausente do manifesto preserva o path legado sem inferir confirmação causal;
  - se `root-cause-review.result.json` falhar em parse ou coerência, bloquear publication, preservar os artefatos já existentes e exigir rerun/recomposição target-owned em vez de inferir correções runner-side;
  - se a policy de rollout legado permanecer indefinida, parar antes do fechamento do ticket e registrar blocker explícito no próprio ticket em vez de seguir no improviso.

## Artifacts and Notes
- Ticket alvo deste plano: `tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`.
- Ticket irmão com ownership separado: `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`.
- Spec runner-side de origem: `docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md`.
- Spec contextual do target: `../guiadomus-matricula/docs/specs/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening.md`.
- Referências do target consultadas para o plano:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-causal-debug.md`
  - `../guiadomus-matricula/utils/case-investigation/causal-debug.js`
- Superfícies runner-side mais prováveis de alteração:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/codex-client.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`

## Interfaces and Dependencies
- Interfaces e contratos impactados:
  - `TargetInvestigateCaseManifest` e `targetInvestigateCasePilotManifestSchema` para aceitar `rootCauseReview`;
  - `TargetInvestigateCaseArtifactSet` / `TargetInvestigateCaseArtifactPaths` para reservar `root-cause-review.request.json` e `root-cause-review.result.json`;
  - schemas/tipos de `root-cause-review.request.json`, `root-cause-review.result.json` e `assessment.root_cause_review`;
  - `TargetInvestigateCaseRoundMaterializationCodexClient` e `CodexCliTicketFlowClient` para executar a nova etapa;
  - discovery, trace payload, final summary, failure surfaces e publication decision do fluxo runner-side.
- Compatibilidade:
  - path novo é opt-in por manifesto;
  - manifests legados continuam aceitos sem inferência de causa confirmada;
  - o enum de `root_cause_status` permanece fechado e explícito;
  - `ticket_readiness` fica separado de `root_cause_status`, com exigência runner-side mínima de `ready` para publication positiva.
- Dependências externas e mocks:
  - depende do target emitir `rootCauseReview` no manifesto e materializar request/result coerentes;
  - testes runner-side devem continuar usando stubs/mocks locais do Codex CLI e fixtures do fluxo, sem chamadas externas reais;
  - o fechamento observável de CA-05 depende de uma decisão manual registrada no ticket, não só de testes automatizados.
