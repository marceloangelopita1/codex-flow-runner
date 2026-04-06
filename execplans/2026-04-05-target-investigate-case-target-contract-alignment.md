# ExecPlan - Alinhar o runner ao contrato atual de `target-investigate-case`

## Purpose / Big Picture
- Objetivo: atualizar o `codex-flow-runner` para aceitar e usar corretamente o contrato atual do target `guiadomus-matricula` no flow `target-investigate-case`, preservando `assessment` como autoridade do projeto alvo e `publication-decision.json` como autoridade final runner-side.
- Resultado esperado:
  - `semantic-review.request.json` runner-side aceita `symptom_selection` e `symptom_candidates` com validação bounded;
  - `assessment.json` passa a reconhecer e preservar `primary_taxonomy`, `operational_class`, `next_action`, `blockers` e `capability_limits`;
  - os gates de consistência deixam de rejeitar cenários válidos do target como `bug_likely` + `bug_likely_but_unconfirmed` antes da materialização de `semantic-review.result.json`;
  - a lógica de `publication` entende a taxonomia nova sem remover compatibilidade com o contrato legado;
  - summary, trace e ticket publisher passam a expor os sinais novos mais relevantes sem ampliar descoberta livre de evidência;
  - testes cobrem cenários novos e legados.
- Escopo:
  - `src/types/target-investigate-case.ts`;
  - `src/core/target-investigate-case.ts`;
  - `src/integrations/target-investigate-case-round-preparer.ts`;
  - `src/integrations/target-investigate-case-semantic-review.ts`;
  - `src/integrations/target-investigate-case-ticket-publisher.ts`;
  - `prompts/17-target-investigate-case-semantic-review.md`;
  - testes relacionados.
- Fora de escopo:
  - alterar `../guiadomus-matricula/**`;
  - mudar a ownership final de `publication`;
  - transformar o subfluxo em descoberta livre de evidência;
  - remover compatibilidade com fixtures legadas sem necessidade explícita.

## Progress
- [x] 2026-04-06 00:17Z - Planejamento inicial concluído com leitura de `AGENTS.md`, `PLANS.md`, dos módulos do runner, da spec consolidada do target, do manifesto atual e dos artefatos reais `case-resolution.json`, `semantic-review.request.json` e `assessment.json`.
- [x] 2026-04-06 00:38Z - Tipos e schemas do runner foram atualizados para aceitar o packet bounded novo (`symptom_selection`, `symptom_candidates`) e para normalizar `assessment.json` e `case-resolution.json` ricos sem quebrar fixtures legadas.
- [x] 2026-04-06 00:38Z - Gates de consistência, publication, summary/trace e ticket publisher foram alinhados à nova taxonomia do target, preservando `publication-decision.json` como autoridade final runner-side.
- [x] 2026-04-06 00:38Z - O prompt runner-side de semantic review foi revisado para refletir o packet enriquecido e manter o guardrail de não descobrir novas evidências ou sintomas fora do bounded packet.
- [x] 2026-04-06 00:38Z - `npm run check` e a suíte de testes do repositório passaram após cobrir cenários novos (`bug_likely`, `bundle_not_captured`, `bug_confirmed`) e legados.

## Surprises & Discoveries
- 2026-04-06 00:17Z - O runner atual ainda normaliza `assessment.json` rico para um shape legado e perde `primary_taxonomy`, `operational_class`, `next_action`, `blockers` e `capability_limits`, o que empobrece publication, summary e auditoria.
- 2026-04-06 00:17Z - O target já trata `bug_likely` + `bug_likely_but_unconfirmed` como estado válido quando o packet está pronto, mas `semantic-review.result.json` ainda está ausente ou inválido; o runner hoje tende a reclassificar isso de forma incompatível.
- 2026-04-06 00:17Z - `case-resolution.json` rico já expõe `attempt_candidates` e `replay_readiness`; o runner aceita parte do shape atual, mas ainda não carrega esses sinais para summary/trace.

## Decision Log
- 2026-04-06 - Decisão: manter o contrato interno retrocompatível, mas promover a taxonomia nova a first-class dentro do tipo normalizado.
  - Motivo: publication, trace e ticket publisher precisam consumir os campos novos sem depender de parsing ad hoc.
  - Impacto: o normalizador de `assessment.json` passa a produzir um shape estendido, e os consumidores runner-side podem migrar sem quebrar fixtures legadas.
- 2026-04-06 - Decisão: validar `symptom_selection` e `symptom_candidates` com regras bounded estruturais e de consistência local, sem replicar todo o catálogo canônico do target.
  - Motivo: isso aceita o contrato atual sem afrouxar o packet e evita acoplamento excessivo a detalhes internos do repo alvo.
  - Impacto: o runner continuará estrito quanto a caminhos relativos, enums, unicidade, limite de candidatos e coerência da seleção priorizada.
- 2026-04-06 - Decisão: usar `primary_taxonomy` e `operational_class` como guias principais de publication quando presentes, caindo para a taxonomia legada quando o artefato for antigo.
  - Motivo: a taxonomia nova já é a fonte de verdade atual do target; a legada deve permanecer apenas como bridge de compatibilidade.
  - Impacto: os gates precisam aceitar mais combinações runner-side válidas e ainda permanecer conservadores na publication final.

## Outcomes & Retrospective
- Status final: concluído.
- O que funcionou:
  - os artefatos reais e testes do target forneceram referência suficiente para alinhar o runner sem alterar o repo alvo;
  - a estratégia de normalização interna com fallback explícito preservou compatibilidade legada enquanto promoveu a taxonomia nova a first-class;
  - os campos novos puderam ser expostos em summary/trace/ticket publisher sem abrir descoberta livre de evidência.
- O que ficou pendente:
  - nada bloqueante no escopo runner-side solicitado.
- Próximos passos:
  - monitorar futuros alvos que ainda emitam apenas o contrato legado para confirmar que os defaults continuam cobrindo esses cenários sem drift.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-semantic-review.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `prompts/17-target-investigate-case-semantic-review.md`
- Spec de origem:
  - `../guiadomus-matricula/docs/specs/2026-04-05-case-investigation-evidence-correlation-and-semantic-triage-redesign.md`
- RFs/CAs cobertos por este plano:
  - aceitar o packet bounded novo de semantic review;
  - aceitar o `assessment.json` enriquecido;
  - preservar publication runner-side conservadora;
  - manter compatibilidade retroativa com artefatos legados.
- Assumptions / defaults adotados:
  - `publication-decision.json` continua sendo a única autoridade final runner-side;
  - `assessment.json` do target continua sendo a autoridade semântica;
  - quando `primary_taxonomy`/`operational_class` não existirem, o runner cai para o contrato legado;
  - summary/trace podem ser enriquecidos com sinais já declarados em artefatos existentes, sem abrir novas leituras livres fora do packet/artefatos da rodada.
- Fluxo atual:
  - o target materializa os artefatos da rodada;
  - o runner valida, descobre semantic review, calcula publication e grava `publication-decision.json`.
- Restrições técnicas:
  - evitar regressão em fixtures legadas;
  - não relaxar guardrails `declared_surfaces_only=true` e `new_evidence_discovery_allowed=false`;
  - não tocar o repo alvo.

## Plan of Work
- Milestone 1:
  - Entregável: tipos e normalizadores atualizados para o packet e o assessment enriquecidos.
  - Evidência de conclusão: os exemplos reais do target parseiam no runner e fixtures legadas continuam válidas.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, testes.
- Milestone 2:
  - Entregável: gates de consistência, publication, summary/trace e publisher entendem a taxonomia nova.
  - Evidência de conclusão: cenários `bug_likely`, `bundle_not_captured`, `bug_confirmed` e legado passam em teste.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, testes.
- Milestone 3:
  - Entregável: prompt e subfluxo bounded de semantic review atualizados para o packet enriquecido.
  - Evidência de conclusão: testes do round preparer seguem aceitando `symptom_selection`/`symptom_candidates` e o prompt explicita o packet bounded novo.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, `prompts/17-target-investigate-case-semantic-review.md`, testes.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/target-investigate-case.ts` para normalizar `assessment.json` rico, tipar novos campos e aceitar o packet de semantic review enriquecido.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/core/target-investigate-case.ts` para afrouxar apenas os gates legados incompatíveis, aproveitar `primary_taxonomy`/`operational_class`/`next_action`/`blockers`/`capability_limits` e enriquecer summary/trace.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar prompt e integrações auxiliares para refletir `symptom_selection` e `symptom_candidates`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir testes do fluxo com cenários novos e legados.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar testes focados e checks do repositório.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `Progress`, `Decision Log` e `Outcomes & Retrospective` com o resultado final.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: `semantic-review.request.json` atual do target é aceito.
  - Evidência observável: teste parseia fixture com `symptom_selection` e `symptom_candidates`.
  - Requisito: caso `bug_likely` / `bug_likely_but_unconfirmed` sem `semantic-review.result.json` deixa de falhar por consistência legada.
  - Evidência observável: teste avalia rodada com packet `ready`, `symptom_selection.source="strong_candidate"` e `semantic-review.result.json` ausente sem rejeição de schema/consistência.
  - Requisito: cenário `WORKFLOW_RESPONSE_MISSING` + `replay_readiness.state="ready"` leva a taxonomia runner-side coerente com o target.
  - Evidência observável: teste observa `primary_taxonomy=evidence_missing_or_partial` e `operational_class=bundle_not_captured`.
  - Requisito: cenário com `semantic-review.result.json` confirmado mantém publication runner-side compatível.
  - Evidência observável: teste observa `primary_taxonomy=bug_confirmed` e decisão runner-side consistente.
  - Requisito: artefatos legados continuam aceitos.
  - Evidência observável: fixtures antigas sem `primary_taxonomy`, `operational_class` e `symptom_candidates` continuam passando.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-semantic-review.test.ts`
  - Esperado: `exit 0`.
- Comando: `npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotência:
  - rerodar os testes e a avaliação sobre as mesmas fixtures deve produzir o mesmo resultado;
  - os normalizadores continuam determinísticos para o mesmo artefato.
- Riscos:
  - endurecer demais a taxonomia nova e rejeitar um output real do target;
  - afrouxar demais o packet de semantic review;
  - degradar fixtures legadas.
- Recovery / Rollback:
  - se algum gate novo quebrar o legado, reintroduzir fallback explícito baseado no contrato anterior;
  - se algum campo novo vazar contexto indevido para trace/prompt, reduzir o payload ao conjunto mínimo declarado e rerodar os testes focados.

## Artifacts and Notes
- Manifesto canônico do alvo:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
- Exemplos reais de referência:
  - `../guiadomus-matricula/output/case-investigation/case_inv_propertyid_attempt_corr_manual_hist_01/case-resolution.json`
  - `../guiadomus-matricula/output/case-investigation/case_inv_semantic_symptom_manual_01/semantic-review.request.json`
  - `../guiadomus-matricula/output/case-investigation/case_inv_assessment_taxonomy_manual_replay_02/assessment.json`
- Testes canônicos do alvo:
  - `../guiadomus-matricula/tests/utils/case-investigation-semantic-artifacts.test.js`
  - `../guiadomus-matricula/tests/scripts/materialize-case-investigation-round.test.js`
  - `../guiadomus-matricula/tests/scripts/case-investigation-operational-validation.test.js`

## Interfaces and Dependencies
- Interfaces alteradas:
  - schema runner-side de `semantic-review.request.json`;
  - shape normalizado de `assessment.json`;
  - trace/final summary do flow;
  - renderização do ticket derivado runner-side.
- Compatibilidade:
  - manter suporte a manifesto/artifacts legados;
  - `publication-decision.json` continua runner-side;
  - `assessment.json` continua target-side.
- Dependências externas e mocks:
  - fixtures locais do runner;
  - artefatos reais do repo alvo usados apenas como referência;
  - nenhuma dependência de serviço externo adicional.
