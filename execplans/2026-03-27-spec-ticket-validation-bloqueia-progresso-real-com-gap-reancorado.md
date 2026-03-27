# ExecPlan - hardening de progresso real no spec-ticket-validation com gap remanescente reancorado

## Purpose / Big Picture
- Objetivo: corrigir o caso em que `spec-ticket-validation` bloqueia o fluxo com `no-real-gap-reduction` mesmo após redução material de gaps, quando o remanescente continua no mesmo ticket e no mesmo `gapType`, mas reaparece com `requirementRefs` refinadas.
- Resultado esperado:
  - o runner passa a distinguir redução estrita de redução ancorada de gaps;
  - a revalidação recebe histórico estruturado suficiente para comparar gaps anteriores com o remanescente atual;
  - a autocorreção reforça a checagem final de completude dos `Closure criteria` herdados;
  - o caso real `3 -> 1` deixa de bloquear prematuramente o gate.
- Escopo:
  - ajustar heurística de progresso em `src/types/spec-ticket-validation.ts` e `src/core/spec-ticket-validation.ts`;
  - enriquecer o contexto de revalidação/autocorreção em `src/integrations/codex-client.ts`;
  - atualizar `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md`;
  - cobrir o incidente e os guardrails em testes focados e integrados;
  - atualizar a spec funcional do gate no mesmo ciclo da implementação.
- Fora de escopo:
  - criar nova taxonomia de gaps;
  - introduzir IDs semânticos persistentes de gap no payload parseado;
  - alterar Telegram, traces ou write-back funcional além do necessário para manter consistência com a nova heurística;
  - transformar esta correção em redesign amplo de todo o estágio de validação.

## Progress
- [x] 2026-03-27 16:59Z - Planejamento inicial consolidado a partir do incidente real, do contrato do repositório e da recomendação de seguir por ticket + ExecPlan.
- [x] 2026-03-27 17:15Z - Heurística de progresso ajustada com guardrails de regressão.
- [x] 2026-03-27 17:15Z - Contexto estruturado de revalidação/autocorreção atualizado.
- [x] 2026-03-27 17:15Z - Testes focados e integrados verdes.
- [x] 2026-03-27 17:15Z - Spec funcional do gate atualizada e auditoria local concluída.

## Surprises & Discoveries
- 2026-03-27 16:59Z - O helper atual de fingerprint é mais rígido do que parecia na leitura superficial: ele inclui `requirementRefs`, então qualquer refinamento dessas referências muda a identidade do gap aberto.
- 2026-03-27 16:59Z - A revalidação stateful preserva o `thread_id`, mas o prompt só injeta o pacote atual e um resumo textual de correções; falta um mapa explícito do histórico de gaps.
- 2026-03-27 16:59Z - O caso concreto em `../caixa-fonte-ids` já oferece um fixture narrativo forte para guiar os testes locais do runner, sem exigir GCP nem alteração do projeto alvo.
- 2026-03-27 17:15Z - A cobertura já existente de `src/core/runner.test.ts` era suficiente para revalidar a integração do `run_specs`; não foi necessário adicionar um novo teste de runner para provar a correção do gate.

## Decision Log
- 2026-03-27 - Decisão: seguir a opção intermediária, sem criar spec nova.
  - Motivo: o repositório já tem uma spec funcional do gate em vigor e o problema atual é um gap de comportamento dessa feature, não uma nova frente conceitual independente.
  - Impacto: a correção nasce como ticket + ExecPlan e a spec existente será atualizada no mesmo ciclo da implementação.
- 2026-03-27 - Decisão: preservar a regra estrita atual como sinal forte e adicionar uma noção secundária de redução ancorada.
  - Motivo: resolve o incidente sem abrir o gate para “progresso falso” em outro ticket ou em outro `gapType`.
  - Impacto: testes precisam cobrir casos positivos e negativos de reancoragem.
- 2026-03-27 - Decisão: enriquecer o contexto do prompt antes de ampliar o contrato parseado.
  - Motivo: melhora a qualidade da revalidação com menor custo e menor risco de compatibilidade do que introduzir IDs semânticos persistentes de gap nesta rodada.
  - Impacto: `src/integrations/codex-client.ts` e os prompts passam a carregar histórico estruturado adicional.
- 2026-03-27 - Decisão: manter `src/core/runner.test.ts` apenas como validação integrada já existente, sem editar a suite nesta rodada.
  - Motivo: a nova heurística e o novo contexto já ficaram suficientemente cobertos por `src/core/spec-ticket-validation.test.ts`, `src/integrations/codex-client.test.ts` e pela própria execução verde da suite completa do runner.
  - Impacto: reduzimos a superfície de mudança sem perder evidência integrada do comportamento.

## Outcomes & Retrospective
- Status final: implementação local concluída e validada.
- O que passou a existir ao final:
  - helper de progresso capaz de distinguir `strict` vs `anchored`;
  - stop policy do gate usando a avaliação nova sem perder conservadorismo;
  - prompts e contexto stateful mais explícitos para revalidação/autocorreção;
  - testes cobrindo o incidente real e os guardrails;
  - spec funcional do gate atualizada como documento vivo.
- O que fica pendente fora deste plano:
  - commit/fechamento formal do ticket na mesma mudança;
  - revalidação operacional externa em caso real com remanescente reancorado;
  - qualquer evolução maior para IDs semânticos de gap ou redesign completo do contrato parseado.
- Próximos passos:
  - revisar diff final e decidir sobre commit/fechamento do ticket;
  - depois executar uma rodada real em projeto externo para auditoria operacional.

## Context and Orientation
- Arquivos principais:
  - `src/types/spec-ticket-validation.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/integrations/codex-client.ts`
  - `src/core/spec-ticket-validation.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/core/runner.test.ts`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Ticket de origem:
  - `tickets/open/2026-03-27-spec-ticket-validation-bloqueia-progresso-real-com-gap-reancorado.md`
- Spec funcional impactada:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Caso concreto externo que motivou o plano:
  - projeto: `../caixa-fonte-ids`
  - spec do alvo: `../caixa-fonte-ids/docs/specs/2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacional.md`
  - trace decisório: `../caixa-fonte-ids/.codex-flow-runner/flow-traces/decisions/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-decision.json`
- RFs/CAs cobertos por este plano:
  - RF-08, RF-11, RF-12, RF-13, RF-14
- Assumptions / defaults adotados:
  - `GO` continua exigindo confiança `high`;
  - progresso ancorado só é aceitável com queda no total de gaps;
  - um gap remanescente só pode herdar progresso se preservar o mesmo `gapType` e o mesmo `affectedArtifactPaths`;
  - mudança de ticket ou de `gapType` continua invalidando a noção de continuidade do gap anterior;
  - a primeira versão desta correção não introduz IDs semânticos persistentes no payload do gate.
- Fluxo atual relevante:
  - o loop atual calcula `realGapReductionFromPrevious` com subconjunto estrito de fingerprints (`gapType + affectedArtifactPaths + requirementRefs`);
  - a revalidação recebe `packageContext` atualizado e `appliedCorrectionsSummary` textual;
  - o stop policy encerra imediatamente com `no-real-gap-reduction` quando a heurística retorna `false`.
- Restrições técnicas:
  - Node.js 20+ / TypeScript;
  - sem dependências externas novas;
  - fluxo sequencial preservado;
  - mudança deve permanecer compatível com `/run_specs` e `/run_specs_from_validation`.

## Plan of Work
- Milestone 1 - Definir progresso real com guardrails claros
  - Entregável: helper que diferencie redução estrita e redução ancorada sem contar como progresso gap em outro ticket ou outro `gapType`.
  - Evidência de conclusão: testes unitários/focados passam para caso positivo `3 -> 1` com reancoragem e casos negativos de mudança de ticket/`gapType`.
  - Arquivos esperados:
    - `src/types/spec-ticket-validation.ts`
    - `src/core/spec-ticket-validation.ts`
    - `src/core/spec-ticket-validation.test.ts`
- Milestone 2 - Enriquecer contexto estruturado do gate
  - Entregável: a revalidação recebe um bloco estruturado do histórico anterior de gaps e a autocorreção recebe instrução explícita de checagem final de completude dos `Closure criteria`.
  - Evidência de conclusão: testes do cliente validam a presença do histórico no prompt e dos reforços de instrução.
  - Arquivos esperados:
    - `src/integrations/codex-client.ts`
    - `src/integrations/codex-client.test.ts`
    - `prompts/09-validar-tickets-derivados-da-spec.md`
    - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
- Milestone 3 - Fechar o incidente com cobertura integrada e documento vivo
  - Entregável: runner e spec do gate ficam consistentes com a nova regra de progresso real.
  - Evidência de conclusão: suites focadas e integradas verdes; spec funcional atualizada com a nova semântica.
  - Arquivos esperados:
    - `src/core/runner.test.ts`
    - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' src/types/spec-ticket-validation.ts`, `sed -n '1,240p' src/core/spec-ticket-validation.ts` e `sed -n '1,260p' src/core/spec-ticket-validation.test.ts` para reabrir o helper atual e a suite do gate antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/spec-ticket-validation.ts` para introduzir um helper de avaliação de progresso que retorne, no mínimo, modo `strict | anchored | none` e preserve o fingerprint atual para auditoria.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/spec-ticket-validation.ts` para usar a nova avaliação e impedir bloqueio prematuro quando houver redução ancorada legítima.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/spec-ticket-validation.test.ts` para cobrir:
   - `3 -> 1` no mesmo ticket e mesmo `gapType`, com `requirementRefs` reancoradas;
   - caso negativo com ticket diferente;
   - caso negativo com `gapType` diferente;
   - continuidade do loop para segundo ciclo quando houver progresso ancorado.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/integrations/codex-client.ts` e `src/integrations/codex-client.test.ts` para localizar a construção atual de `appliedCorrectionsSummary` e do prompt de revalidação.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.ts` para injetar no prompt da revalidação um bloco estruturado do passe anterior, incluindo gaps anteriores, fingerprints anteriores e orientação explícita sobre remanescente reancorado.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` para reforçar comparação histórica e checagem final de completude dos `Closure criteria`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.test.ts` para validar o novo contexto estruturado e os reforços contratuais do prompt.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts` apenas se a integração precisar provar que `run_specs` não encerra cedo demais em cenário equivalente ao incidente.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md` para registrar a nova semântica de progresso real e o contexto estruturado adicional da revalidação.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts` para validar o comportamento focal e integrado.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressão completa.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para validar compilação.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/types/spec-ticket-validation.ts src/core/spec-ticket-validation.ts src/core/spec-ticket-validation.test.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/core/runner.test.ts prompts/09-validar-tickets-derivados-da-spec.md prompts/10-autocorrigir-tickets-derivados-da-spec.md docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md` para auditar escopo final.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisito: RF-12, RF-13, RF-14
    - Evidência observável: `src/core/spec-ticket-validation.test.ts` prova que redução material `3 -> 1` com remanescente no mesmo ticket e mesmo `gapType` não gera `no-real-gap-reduction` no primeiro ciclo.
  - Requisito: RF-11, RF-12, RF-14
    - Evidência observável: `src/types/spec-ticket-validation.ts` e `src/core/spec-ticket-validation.ts` distinguem `strict` vs `anchored`, mantendo casos negativos para ticket/gapType diferentes.
  - Requisito: RF-08, RF-11, RF-12
    - Evidência observável: `src/integrations/codex-client.ts` e `src/integrations/codex-client.test.ts` passam a carregar histórico estruturado do passe anterior no prompt de revalidação.
  - Requisito: RF-08, RF-11
    - Evidência observável: `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` instruem remanescente reancorado e checagem final de completude dos `Closure criteria`.
  - Requisito: documento vivo da spec funcional do gate
    - Evidência observável: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md` é atualizada no mesmo ciclo da implementação.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts`
  - Esperado: suites verdes cobrindo o incidente real e os guardrails contra progresso falso.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: regressão completa verde sem mudança de semântica fora do recorte planejado.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde para os novos helpers e payloads de prompt.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: compilação final verde.

## Idempotence and Recovery
- Idempotência:
  - a mudança é local ao runner e aos prompts; reexecutar as suites deve produzir o mesmo resultado para o mesmo fixture;
  - o histórico estruturado adicional no prompt não deve depender de estado externo além dos snapshots já calculados no próprio gate.
- Riscos:
  - afrouxar demais a heurística e contar como progresso um gap de outro ticket;
  - enriquecer o prompt com contexto redundante ou ambíguo e piorar a interpretação do modelo;
  - atualizar a spec funcional sem refletir exatamente o comportamento implementado.
- Recovery / Rollback:
  - se a heurística ancorada abrir falso positivo em testes negativos, reduzir o critério ao mínimo seguro: exigir mesma combinação de `gapType + affectedArtifactPaths` e queda estrita de contagem;
  - se o contexto adicional do prompt gerar regressão de parser ou de comportamento, manter o helper novo e reduzir o enriquecimento textual ao bloco mínimo estruturado de gaps anteriores;
  - se a atualização da spec funcional ficar maior do que o necessário, restringi-la à seção que descreve o stop policy e a observabilidade da revalidação.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-27-spec-ticket-validation-bloqueia-progresso-real-com-gap-reancorado.md`
- Artefatos de evidência do caso real:
  - `../caixa-fonte-ids/.codex-flow-runner/flow-traces/requests/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-request.md`
  - `../caixa-fonte-ids/.codex-flow-runner/flow-traces/responses/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-response.md`
  - `../caixa-fonte-ids/.codex-flow-runner/flow-traces/decisions/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-decision.json`
- Documentos canônicos consultados no planejamento:
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `SPECS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
- Notas:
  - esta frente não exige tocar o projeto alvo `../caixa-fonte-ids`; o caso externo serve como evidência e fixture narrativo de regressão.
  - validações locais executadas com sucesso em 2026-03-27 17:15Z:
    - `npx tsx --test src/core/spec-ticket-validation.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts`
    - `npm test`
    - `npm run check`
    - `npm run build`

## Interfaces and Dependencies
- Interfaces alteradas:
  - helper de avaliação de gaps em `src/types/spec-ticket-validation.ts`;
  - stop policy do loop em `src/core/spec-ticket-validation.ts`;
  - construção do prompt de revalidação/autocorreção em `src/integrations/codex-client.ts`;
  - contrato textual dos prompts `09` e `10`.
- Compatibilidade:
  - o payload parseado do gate pode permanecer o mesmo nesta rodada;
  - `/run_specs` e `/run_specs_from_validation` devem continuar usando o mesmo gate funcional, apenas com semântica de progresso mais robusta;
  - a mudança deve preservar o requisito de `GO` apenas com confiança `high`.
- Dependências externas e mocks:
  - sem novas dependências npm;
  - testes devem reutilizar os stubs/harnesses existentes de `spec-ticket-validation` e `runner`;
  - o caso real de `../caixa-fonte-ids` é referência de evidência, não dependência de execução da suite local.
