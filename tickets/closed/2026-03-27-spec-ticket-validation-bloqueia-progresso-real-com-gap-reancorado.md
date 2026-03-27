# [TICKET] spec-ticket-validation bloqueia progresso real com gap remanescente reancorado

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-27 16:59Z
- Reporter: Codex
- Owner: Codex
- Source: external-test
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-03-27-spec-ticket-validation-bloqueia-progresso-real-com-gap-reancorado.md
- Parent commit (optional):
- Analysis stage (when applicable): spec-ticket-validation
- Active project (when applicable): caixa-fonte-ids
- Target repository (when applicable): /home/mapita/projetos/caixa-fonte-ids
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source spec canonical path (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs/RNFs/restrições, when applicable): RF-08, RF-11, RF-12, RF-13, RF-14
- Inherited assumptions/defaults (when applicable):
  - o gate continua avaliando o pacote derivado inteiro, não tickets isolados;
  - `GO` continua exigindo confiança `high`;
  - a primeira validação continua iniciando em contexto novo em relação a `spec-triage`;
  - revalidações continuam reutilizando apenas o contexto local do próprio gate.
- Inherited RNFs (when applicable):
  - fluxo sequencial;
  - rastreabilidade objetiva do veredito e dos gaps por ciclo.
- Inherited technical/documentary constraints (when applicable):
  - o loop de autocorreção continua limitado a no máximo 2 ciclos completos de `corrigir -> revalidar`;
  - a correção não deve afrouxar o gate a ponto de aceitar gap novo em outro ticket como se fosse progresso;
  - a mudança deve atualizar a spec funcional do gate no mesmo ciclo da implementação, sem criar taxonomia paralela.
- Inherited pending/manual validations (when applicable):
  - executar ao menos uma nova rodada real em projeto externo após a correção para confirmar que um remanescente reancorado não encerra prematuramente o gate com `no-real-gap-reduction`.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): validation
- Smallest plausible explanation (audit/review only): o comparador atual de `realGapReduction` usa fingerprint rígido por `gapType + affectedArtifactPaths + requirementRefs`, então uma redução material de gaps com refinamento/reancoragem das `requirementRefs` é tratada como ausência de progresso real, mesmo quando o remanescente continua no mesmo ticket e no mesmo tipo de gap.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: ../caixa-fonte-ids/.codex-flow-runner/flow-traces/requests/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-request.md
  - Response file: ../caixa-fonte-ids/.codex-flow-runner/flow-traces/responses/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-response.md
  - Decision file: ../caixa-fonte-ids/.codex-flow-runner/flow-traces/decisions/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-decision.json
- Related docs/execplans:
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md
  - docs/workflows/codex-quality-gates.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - execplans/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md
  - execplans/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md

## Classificação de risco (check-up não funcional, quando aplicável)
- Matriz aplicável: não
- Severidade (1-5): n/a
- Frequência (1-5): n/a
- Custo de atraso (1-5): n/a
- Risco operacional (1-5): n/a
- Score ponderado (10-50): n/a
- Prioridade resultante (`P0` | `P1` | `P2`): P0
- Justificativa objetiva (evidências e impacto):
  - o runner pode bloquear `/run_specs` com `NO_GO` mesmo após redução material de gaps auto-corrigíveis, forçando revisão manual desnecessária do backlog derivado e diminuindo a confiança operacional no gate.

## Context
- Workflow area: run-specs / spec-ticket-validation
- Scenario: em uma rodada real de `/run_specs` no projeto externo `caixa-fonte-ids`, o primeiro passe encontrou 3 gaps, a autocorreção reduziu o pacote para 1 gap remanescente objetivo, mas o runner encerrou o gate com `finalReason: no-real-gap-reduction` porque o gap residual reancorou `requirementRefs`.
- Input constraints:
  - preservar o caráter conservador do gate;
  - não considerar como progresso um gap residual que mude de ticket ou de `gapType`;
  - enriquecer o contexto da revalidação sem depender de memória implícita do modelo;
  - manter o contrato canônico `spec -> tickets -> execplan`.

## Problem statement
O gate funcional de `spec-ticket-validation` hoje confunde redução material de gaps com ausência de progresso real quando o gap remanescente continua no mesmo ticket e no mesmo `gapType`, mas reaparece com `requirementRefs` mais específicas após a autocorreção. Na prática, o runner bloqueia cedo demais um caso que ainda deveria seguir para nova tentativa ou, no mínimo, ser classificado como progresso parcial legítimo.

## Observed behavior
- O que foi observado:
  - o helper atual de fingerprint inclui `requirementRefs` na identidade do gap aberto;
  - a heurística de `realGapReduction` só aceita subconjunto estrito desses fingerprints;
  - a revalidação recebe o pacote atual e um resumo textual de correções, mas não recebe um mapa estruturado do tipo “estes gaps existiam antes, estes foram corrigidos, este remanescente é continuação mais específica”.
- Frequência (único, recorrente, intermitente): recorrente em qualquer caso em que a autocorreção resolva parte do problema e deixe um remanescente reancorado no mesmo ticket.
- Como foi detectado (warning/log/test/assert):
  - trace real de `spec-ticket-validation` no projeto externo `caixa-fonte-ids`;
  - inspeção de `src/types/spec-ticket-validation.ts`, `src/core/spec-ticket-validation.ts` e `src/integrations/codex-client.ts`.

## Expected behavior
Quando a revalidação reduzir materialmente a quantidade de gaps e o remanescente continuar no mesmo `affectedArtifactPaths` e no mesmo `gapType`, o runner deve reconhecer progresso real mesmo que as `requirementRefs` tenham sido refinadas. A revalidação também deve receber histórico estruturado suficiente para tratar esse remanescente como continuação mais específica de um gap anterior, não como ausência total de progresso por default.

## Reproduction steps
1. Ler o trace do caso real em `../caixa-fonte-ids/.codex-flow-runner/flow-traces/decisions/20260327t154312z-run-specs-spec-spec-ticket-validation-2026-03-27-paridade-observacional-entre-logs-reais-do-servico-e-bundle-operacion-decision.json`.
2. Confirmar que o ciclo 0 tem 3 fingerprints abertos e o ciclo 1 tem 1 fingerprint aberto, ainda no mesmo ticket estrutural e no mesmo `gapType`, mas com `requirementRefs` diferentes.
3. Comparar esse comportamento com `src/types/spec-ticket-validation.ts` e `src/core/spec-ticket-validation.ts`, verificando que o runner exige subconjunto estrito dos fingerprints anteriores para reconhecer `realGapReduction`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - ciclo 0: `closure-criteria-gap|tickets/open/2026-03-27-alinhar-trilha-observacional-canonica-ao-fluxo-real-do-servico.md|ca-04&ca-05&rf-04&rf-17`
  - ciclo 1: `closure-criteria-gap|tickets/open/2026-03-27-alinhar-trilha-observacional-canonica-ao-fluxo-real-do-servico.md|ca-01&ca-05`
  - veredito final do caso: `NO_GO` com `finalReason: no-real-gap-reduction`
- Warnings/codes relevantes:
  - `no-real-gap-reduction`
- Comparativo antes/depois (se houver):
  - antes: qualquer reancoragem de `requirementRefs` invalida o progresso, mesmo com redução material;
  - esperado: o gate distingue redução estrita de redução ancorada e só bloqueia por ausência de progresso quando não houver redução de contagem ou quando o remanescente mudar de ticket/`gapType`.

## Impact assessment
- Impacto funcional:
  - o fluxo de `/run_specs` pode interromper uma linhagem válida de correção automática antes do ponto previsto pelo próprio contrato do gate.
- Impacto operacional:
  - alto, porque gera `NO_GO` falso, aumenta retrabalho manual em tickets derivados e enfraquece a confiança no gate funcional.
- Risco de regressão:
  - médio, pois a correção toca heurística de stop policy, prompts e testes do runner.
- Scope estimado (quais fluxos podem ser afetados):
  - `spec-ticket-validation` em `/run_specs`;
  - `spec-ticket-validation` em `/run_specs_from_validation`;
  - tickets derivados cujo gap residual permaneça no mesmo artefato com `requirementRefs` refinadas após autocorreção.

## Initial hypotheses (optional)
- O caminho mais seguro é manter a heurística estrita atual como sinal forte e adicionar uma noção secundária de redução ancorada por `gapType + affectedArtifactPaths`, exigindo queda na contagem total de gaps.
- Aumentar o contexto estruturado da revalidação reduz a chance de o modelo tratar um remanescente refinado como gap “novo” por ausência de histórico explícito.

## Proposed solution (optional)
Introduzir uma avaliação de progresso com dois modos, `strict` e `anchored`, endurecer o contexto estruturado enviado à revalidação e reforçar no prompt de autocorreção a checagem final de completude dos `Closure criteria` herdados. As superfícies mínimas candidatas são `src/types/spec-ticket-validation.ts`, `src/core/spec-ticket-validation.ts`, `src/integrations/codex-client.ts`, `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md` e as suites de teste correspondentes.

## Closure criteria
- Requisito/RF/CA coberto:
  - RF-12, RF-13, RF-14
- Evidência observável:
  - `src/core/spec-ticket-validation.test.ts` cobre um cenário em que 3 gaps auto-corrigíveis caem para 1 gap remanescente no mesmo ticket e no mesmo `gapType`, com `requirementRefs` reancoradas, e o resultado não encerra prematuramente com `no-real-gap-reduction`.
- Requisito/RF/CA coberto:
  - RF-11, RF-12, RF-14
- Evidência observável:
  - `src/types/spec-ticket-validation.ts` e `src/core/spec-ticket-validation.ts` passam a distinguir redução estrita de redução ancorada, aceitando progresso ancorado apenas quando há queda no total de gaps e preservação de `gapType + affectedArtifactPaths`.
- Requisito/RF/CA coberto:
  - RF-08, RF-11, RF-12
- Evidência observável:
  - `src/integrations/codex-client.ts` envia à revalidação um histórico estruturado do passe anterior e `src/integrations/codex-client.test.ts` valida a presença desse contexto no prompt.
- Requisito/RF/CA coberto:
  - RF-08, RF-11
- Evidência observável:
  - `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` passam a instruir explicitamente remanescente reancorado, comparação contra gaps anteriores e checagem final de completude dos `Closure criteria` herdados.
- Requisito/RF/CA coberto:
  - regra de documento vivo da spec funcional do gate
- Evidência observável:
  - a implementação atualiza `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md` no mesmo ciclo, registrando a nova regra de progresso real e o contexto estruturado adicional da revalidação.

## Decision log
- 2026-03-27 - Ticket aberto a partir de incidente real em projeto externo para corrigir `NO_GO` falso no gate funcional. - O problema já tem evidência concreta, recorte técnico claro e risco suficiente para virar backlog executável imediato.
- 2026-03-27 - ExecPlan derivado e execução local iniciada nesta mesma linhagem. - A implementação foi conduzida sem tocar o projeto alvo, mantendo o caso externo apenas como evidência e fixture narrativo de regressão.
- 2026-03-27 - Diff, ExecPlan, spec viva e suites automatizadas relidos antes do fechamento. - A entrega foi considerada `GO` porque a correção local ficou completa, e a validação externa remanescente é apenas auditoria operacional não bloqueante.

## Closure
- Closed at (UTC): 2026-03-27 17:17Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-27-spec-ticket-validation-bloqueia-progresso-real-com-gap-reancorado.md`
  - Commit: mesmo changeset de fechamento versionado manualmente.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-12`, `RF-13`, `RF-14`: [src/core/spec-ticket-validation.test.ts](/home/mapita/projetos/codex-flow-runner/src/core/spec-ticket-validation.test.ts) agora cobre o caso `3 -> 1` com remanescente reancorado no mesmo ticket e mesmo `gapType`, sem encerrar prematuramente com `no-real-gap-reduction`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts` -> pass (`177/177`).
  - `RF-11`, `RF-12`, `RF-14`: [src/types/spec-ticket-validation.ts](/home/mapita/projetos/codex-flow-runner/src/types/spec-ticket-validation.ts) e [src/core/spec-ticket-validation.ts](/home/mapita/projetos/codex-flow-runner/src/core/spec-ticket-validation.ts) distinguem redução estrita e ancorada, preservando os guardrails de ticket/gapType; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` -> pass (`519/519`).
  - `RF-08`, `RF-11`, `RF-12`: [src/integrations/codex-client.ts](/home/mapita/projetos/codex-flow-runner/src/integrations/codex-client.ts), [prompts/09-validar-tickets-derivados-da-spec.md](/home/mapita/projetos/codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md) e [prompts/10-autocorrigir-tickets-derivados-da-spec.md](/home/mapita/projetos/codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md) agora carregam histórico estruturado da rodada anterior e reforçam a checagem final de completude dos `Closure criteria`; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> pass; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` -> pass.
- Entrega tecnica concluida:
  - progresso real do gate agora aceita redução estrita por fingerprint e redução ancorada no mesmo `gapType + affectedArtifactPaths`, desde que a contagem total de gaps caia;
  - a revalidação recebe o passe anterior estruturado, com gaps, evidências e fingerprints anteriores;
  - a autocorreção recebe reforço explícito para não encerrar rodadas com `Closure criteria` ainda parcialmente observáveis.
- Validacao manual externa pendente: sim.
- Validacoes manuais externas ainda necessarias:
  - executar uma nova rodada real em projeto externo com remanescente reancorado para confirmar operacionalmente que o gate segue para novo ciclo em vez de encerrar com `no-real-gap-reduction`;
  - essa validação é recomendada, mas não bloqueia o fechamento técnico deste ticket.
