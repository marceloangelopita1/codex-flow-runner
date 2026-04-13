# ExecPlan - target-investigate-case-v2 summary deve reportar diagnóstico com warnings

## Purpose / Big Picture
- Objetivo: ajustar as superfícies operator-facing de `/target_investigate_case_v2` para diferenciar diagnóstico produzido com warnings de automação de falha operacional real.
- Resultado esperado: quando a rodada v2 produzir diagnóstico útil ou blocker explícito e também warnings de envelope, o summary final, a trilha de trace e o Telegram abrem com o diagnóstico target-owned e listam os warnings separadamente, sem `round-materialization-failed` nem fase interrompida enganosa.
- Escopo: renderização do summary final usado por runner/trace, payload/metadados de trace do target flow, resposta final do Telegram, detalhes de timing/fase interrompida e testes focados que provem a experiência operator-facing.
- Fora de escopo: mudar a inspeção tolerante de artefatos core já entregue no ticket pai, alterar prompts ou artefatos do target, mudar cwd da execução Codex, atravessar publication quando a automação estiver degradada, fechar este ticket durante a criação deste plano, commit ou push.

## Progress
- [x] 2026-04-13 16:29Z - Planejamento inicial concluído com leitura do ticket alvo, `PLANS.md`, `DOCUMENTATION.md`, quality gates, spec de origem, ticket pai, ticket irmão aberto, rodada real referenciada e superfícies de código/teste.
- [x] 2026-04-13 16:43Z - Implementação de summary, trace, Telegram e timing concluída: `TargetInvestigateCaseFlowSummary` ganhou estado de conclusão degradada, metadata de trace preserva warnings por artefato, Telegram abre com diagnóstico e bloco separado de warnings, e timing de sucesso não renderiza fase interrompida.
- [x] 2026-04-13 16:42Z - Validação inicial de código concluída com `npm test -- src/integrations/telegram-bot.test.ts src/core/runner.test.ts` (script executou 201 testes) e `npm run check`.
- [x] 2026-04-13 16:45Z - Matriz final do ExecPlan concluída com `npm test -- src/integrations/telegram-bot.test.ts src/core/runner.test.ts src/core/target-investigate-case.test.ts src/integrations/workflow-trace-store.test.ts` (201 testes passando) e `npm run check` com exit 0.
- [x] 2026-04-13 16:50Z - Revalidação final de fechamento concluída com a mesma matriz (202 testes passando, incluindo todos os `kind` aceitos de warning na superfície Telegram) e `npm run check` com exit 0.
- [x] 2026-04-13 16:50Z - Ticket fechado como GO e movido para `tickets/closed/` no mesmo changeset da correção, sem executar commit/push.

## Surprises & Discoveries
- 2026-04-13 16:29Z - O ticket pai já fechou a semântica core: `artifactInspectionWarnings` existe em `TargetInvestigateCaseCompletedSummary` e testes core cobrem os três artefatos divergentes.
- 2026-04-13 16:29Z - A rodada real em `../guiadomus-matricula/output/case-investigation/2026-04-12T16-15-14Z/` materializou os cinco artefatos mínimos e `diagnosis.md` abriu com `Veredito: ok`, mas a superfície observada pelo operador tratou a divergência como falha.
- 2026-04-13 16:29Z - `diagnosis.json` da rodada real usa `verdict = ok`, mas diverge do schema recomendado em campos como `confidence = medium_high`; `evidence-index.json` e `case-bundle.json` usam envelopes próprios (`evidence_index_v2` e `case_bundle_v2`).
- 2026-04-13 16:29Z - `buildTargetInvestigateCaseFlowSummary(...)` hoje define sucesso como `finalStage: "publication"` e `completionReason: "completed"` sem estado explícito de automação degradada; o Telegram de resultado concluído também não renderiza `artifactInspectionWarnings`.
- 2026-04-13 16:43Z - O script `npm test -- <arquivos>` mantém o glob `src/**/*.test.ts` do `package.json` e, portanto, executa a suíte inteira além dos caminhos informados; isso reforçou a cobertura observável sem exigir comando alternativo.
- 2026-04-13 16:43Z - A renderização editorial de Telegram usa títulos de seção sem `:`, enquanto o reply direto usa `Warnings de automacao:`; os testes agora validam ambos os formatos sem alterar o padrão editorial existente.
- 2026-04-13 16:50Z - O typecheck confirmou que `artifactLabel` é enumeração finita restrita aos três artefatos target-owned; a cobertura adicional de warnings passou a reutilizar esses labels e validar todos os `kind` aceitos sem inventar novos labels.

## Decision Log
- 2026-04-13 - Decisão: este plano trata warnings de envelope como estado de sucesso degradado operator-facing, não como novo failure kind.
  - Motivo: RF-29 e CA-09 exigem conclusão como diagnóstico produzido com warnings quando há diagnóstico útil.
  - Impacto: `completionReason`, detalhes de summary e Telegram podem ganhar linguagem específica de warnings, mas `status: completed` deve permanecer para esse caso.
- 2026-04-13 - Decisão: preservar a fronteira com o ticket pai e consumir apenas a superfície core já exposta.
  - Motivo: o ticket pai fechou inspeção tolerante, fallback diagnosis-first e bloqueio conservador de publication em automação degradada.
  - Impacto: a implementação deste ticket deve focar renderização, trace e timing; não deve reabrir readers/schemas de artefatos salvo ajuste mínimo de tipo para transportar warnings.
- 2026-04-13 - Decisão: manter publication tardia e opcional mesmo quando o Telegram abre com diagnóstico.
  - Motivo: warnings de envelope são aceitáveis para leitura humana, mas degradam automações dependentes de shape estruturado.
  - Impacto: a mensagem deve explicar warning/degradação sem sugerir publication ou ticket automático quando o gate conservador bloquear.
- 2026-04-13 - Decisão: a fase interrompida só deve aparecer em encerramentos não concluídos.
  - Motivo: em conclusão com warnings, houve execução de estágios target-owned; reportar `preflight` como interrompido desloca o operador para o problema errado.
  - Impacto: testes de timing devem provar ausência de `Fase interrompida` para `completed` com warnings e preservação para falhas reais.
- 2026-04-13 - Decisão: adicionar `diagnosis-completed-with-artifact-warnings` como `completionReason` específico de sucesso degradado.
  - Motivo: o ticket pede uma superfície operator-facing que diferencie diagnóstico útil com automação degradada de sucesso limpo e de falha operacional.
  - Impacto: `outcome` permanece `success`; trace, summary e Telegram passam a expor o estado degradado sem usar `round-materialization-failed`.
- 2026-04-13 - Decisão: não executar o fechamento operacional do ticket nesta etapa.
  - Motivo: o prompt de execução pediu explicitamente implementar, validar e atualizar artefatos vivos sem fechar ticket nem fazer commit/push.
  - Impacto: o milestone de fechamento permanece pendente mesmo com implementação e validações locais concluídas.

## Outcomes & Retrospective
- Status final: GO técnico; implementação, validação local e fechamento documental do ticket concluídos. Versionamento permanece pendente para o runner executar após esta resposta.
- O que funcionou:
  - o ticket pai deixou uma superfície estruturada (`artifactInspectionWarnings`) para este plano consumir;
  - a rodada real fornece exemplo concreto de diagnóstico útil com envelopes divergentes, sem exigir acoplamento ao domínio do `guiadomus-matricula`.
- O que ficou pendente:
  - versionar em commit/push apenas quando solicitado.
- Próximos passos:
  - runner deve versionar o mesmo changeset de fechamento, sem novo ajuste local obrigatório neste ticket.

## Context and Orientation
- Ticket alvo: `tickets/closed/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md`.
- ExecPlan: `execplans/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md`.
- Spec de origem: `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`.
- Ticket pai fechado: `tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`.
- Ticket irmão aberto da mesma spec: `tickets/open/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`.
- RFs/CAs cobertos por este ticket: RF-26, RF-29, CA-07 e CA-09. RF-17a é requisito herdado relevante, mas a tolerância core a envelope divergente pertence ao ticket pai; aqui ela deve aparecer nas superfícies operator-facing.
- RNFs e restrições herdadas: reduzir custo cognitivo e deixar a resposta principal entendível por humano em menos de 2 minutos; manter mensagens diagnosis-first; refletir warnings de envelope sem transformar diagnóstico em falha; manter publication tardia e opcional; preservar fluxo sequencial.
- Assumptions / defaults adotados:
  - `status: completed` com `artifactInspectionWarnings.length > 0` representa diagnóstico produzido com warnings de automação;
  - warnings de envelope não autorizam publication automática quando o gate core já bloqueou por automação degradada;
  - `diagnosis.md` e `diagnosis.json` continuam sendo os artefatos principais exibidos ao operador;
  - o operador deve receber primeiro o veredito, resumo, porquê e próxima ação do diagnóstico; warnings e artefatos vêm depois;
  - falhas reais de preflight, execução Codex, cancelamento, ausência de diagnóstico/blocker e evaluation failure continuam sendo falhas ou bloqueios, com fase interrompida quando aplicável.
- Allowlists/enumerações finitas relevantes:
  - Artefatos target-owned com warnings herdados do ticket pai: `evidence-index.json`, `case-bundle.json`, `diagnosis.json`. A validação deste plano deve preservar os três membros explicitamente no Telegram e no trace, ou justificar objetivamente qualquer consolidação. Não há justificativa para consolidar aqui, porque o closure criterion pede links de artefatos e warnings separados.
  - Tipos de warning herdados: `artifact-missing`, `json-parse-failed`, `recommended-schema-invalid`, `recommended-coherence-invalid`. Este plano não altera a enumeração; deve renderizar qualquer membro recebido de forma legível e não inventar novos kinds sem necessidade.
  - Usabilidade de automação herdada: `full`, `degraded`, `unusable`. A superfície operator-facing deve destacar `degraded` e `unusable` como warnings/degradação, não como falha quando o core completou.
  - Vereditos machine-readable aceitos: `ok`, `not_ok`, `inconclusive`. Este plano não amplia a allowlist; renderiza o valor já normalizado pelo core.
- Fronteira de ownership:
  - Este ticket cobre summary, trace, Telegram e timing/fase interrompida para diagnóstico com warnings.
  - O ticket pai cobre inspeção tolerante, fallback diagnosis-first, warnings estruturados core e bloqueio de publication com automação degradada.
  - O ticket irmão `codex-deve-executar-no-contexto-do-target` cobre cwd/contexto natural da execução Codex no target.
  - A coexistência evita duplication-gap porque cada ticket possui fechamento observável em superfície distinta: core, apresentação operator-facing e execução Codex.
- Arquivos principais:
  - `src/core/runner.ts`: constrói `TargetInvestigateCaseFlowSummary`, completion reason, detalhes de conclusão e metadata do trace.
  - `src/core/target-investigate-case.ts`: constrói `tracePayload`, `finalSummary` e `renderTargetInvestigateCaseFinalSummary(...)`.
  - `src/types/target-investigate-case.ts`: tipos de summary, trace payload e warnings de inspeção.
  - `src/types/flow-timing.ts`: enumeração de completion reasons e shape de summary/timing para target flow.
  - `src/integrations/telegram-bot.ts`: renderiza o reply final e detalhes de timing.
  - `src/integrations/workflow-trace-store.ts`: persiste session trace do target flow com `outcome.metadata`.
  - Testes esperados: `src/integrations/telegram-bot.test.ts`, `src/core/target-investigate-case.test.ts`, `src/core/runner.test.ts` e/ou teste focado novo para summary/trace/timing, `src/integrations/workflow-trace-store.test.ts` se o contrato persistido mudar.
- Referências lidas para este plano:
  - `PLANS.md`;
  - `DOCUMENTATION.md`;
  - `docs/workflows/codex-quality-gates.md`;
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`;
  - `tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`;
  - `execplans/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`;
  - `tickets/open/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`;
  - `../guiadomus-matricula/output/case-investigation/2026-04-12T16-15-14Z/{diagnosis.md,diagnosis.json,evidence-index.json,case-bundle.json}`.

## Plan of Work
- Milestone 1: estado operator-facing de conclusão com warnings.
  - Entregável: `TargetInvestigateCaseFlowSummary` e detalhes de conclusão distinguem sucesso limpo de diagnóstico produzido com warnings, preservando `status: completed` e evitando `round-materialization-failed`.
  - Evidência de conclusão: teste de runner/summary cria resultado `completed` com `artifactInspectionWarnings` para os três artefatos enumerados e espera detalhes/completion reason diagnosis-first com warnings, sem failure reason.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/flow-timing.ts` se for necessário novo completion reason, testes focados.
- Milestone 2: trace registra warnings de envelope como metadado observável.
  - Entregável: trace do target flow persiste warnings de envelope e estado de automação degradada junto do diagnóstico, sem outcome de falha.
  - Evidência de conclusão: teste inspeciona metadata persistida ou objeto de trace e encontra warnings para `evidence-index.json`, `case-bundle.json` e `diagnosis.json`, com `status: "success"` e sem `round-materialization-failed`.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/workflow-trace-store.ts` apenas se o shape persistido precisar mudar, testes focados.
- Milestone 3: Telegram abre com diagnóstico e lista warnings separados.
  - Entregável: resposta final de `/target_investigate_case_v2` mostra diagnóstico produzido com warnings, links/caminhos de artefatos e bloco separado de warnings de automação.
  - Evidência de conclusão: teste de `buildTargetInvestigateCaseReply` espera frase equivalente a `diagnostico produzido com warnings`, caminhos dos artefatos e warning separado para cada membro enumerado.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4: timing/fase interrompida não engana em conclusão degradada.
  - Entregável: timing de fluxo concluído com warnings não renderiza `Fase interrompida`; falhas reais continuam renderizando fase interrompida quando houver interrupção.
  - Evidência de conclusão: teste com summary concluído e warnings espera ausência de `Fase interrompida`; teste existente ou novo de falha preserva o comportamento para interrupção real.
  - Arquivos esperados: `src/core/runner.ts` e/ou `src/integrations/telegram-bot.ts`, testes focados.
- Milestone 5: fechamento operacional do ticket.
  - Entregável: ticket movido para `tickets/closed/` com closure evidence, no mesmo changeset da implementação.
  - Evidência de conclusão: diff mostra implementação, testes e movimento do ticket; nenhum commit/push é feito sem pedido explícito.
  - Arquivos esperados: `tickets/closed/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir o contexto com `sed -n '1,240p' tickets/closed/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md`, `sed -n '1,260p' execplans/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md` e `sed -n '1,220p' tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Mapear consumidores atuais com `rg -n "artifactInspectionWarnings|round-materialization-failed|completionReason|buildTargetInvestigateCaseFlowSummary|buildTargetFlowTraceMetadata|buildTargetInvestigateCaseReply|Fase interrompida|renderTargetInvestigateCaseFinalSummary" src`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.ts` para que `buildTargetInvestigateCaseFlowSummary(...)` inclua nos detalhes e metadata um estado de diagnóstico com warnings quando `result.summary.artifactInspectionWarnings` existir, preservando `outcome: "success"` e os artefatos realizados.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/target-investigate-case.ts` e/ou `src/types/target-investigate-case.ts` somente se necessário para incluir warnings no `tracePayload` ou no render textual do summary final, sem alterar a inspeção core já entregue.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts` para que o reply completed liste primeiro veredito/resumo/próxima ação, depois `diagnosis.md`, `diagnosis.json`, demais artefatos realizados e bloco `Warnings de automação` com artifact label, kind, usability e mensagem.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar a renderização de timing apenas se o comportamento atual ainda permitir `Fase interrompida` em conclusão com warnings; preservar renderização de fase interrompida para `failed`, `blocked` e `cancelled` quando o snapshot tiver interrupção.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para criar `completedResult` com warnings em `evidence-index.json`, `case-bundle.json` e `diagnosis.json`, validando mensagem diagnosis-first e bloco de warnings separado.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar ou atualizar teste de runner/trace que finalize `TargetInvestigateCaseExecutionResult` completed com warnings e valide `outcome.status = "success"`, metadata com warnings e ausência de `round-materialization-failed`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar ou atualizar teste de timing para conclusão com warnings sem `Fase interrompida` e para falha real com `Fase interrompida` preservada.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/telegram-bot.test.ts src/core/runner.test.ts src/core/target-investigate-case.test.ts src/integrations/workflow-trace-store.test.ts`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `git diff --stat` e `git diff -- src/core/runner.ts src/core/target-investigate-case.ts src/types/target-investigate-case.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/integrations/workflow-trace-store.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts src/core/target-investigate-case.test.ts src/integrations/workflow-trace-store.test.ts`.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se todos os closure criteria estiverem provados, mover o ticket para `tickets/closed/`, preencher `Closure` e `Closure evidence`, e não fazer commit/push salvo pedido explícito do usuário.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: RF-26 e CA-07 exigem que summary final e Telegram sejam diagnosis-first.
  - Evidência observável: teste em `src/integrations/telegram-bot.test.ts` chama `buildTargetInvestigateCaseReply(...)` com `status: "completed"` e warnings, e espera que a mensagem abra com conclusão para `/target_investigate_case_v2`, veredito/resumo/porquê/próxima ação do diagnóstico antes do bloco de warnings; a mensagem não deve conter `assessment`, `dossier` nem linguagem publication-first.
- Matriz requisito -> validação:
  - Requisito: RF-29 e CA-09 exigem concluir como diagnóstico produzido com warnings quando há artefato diagnóstico útil e envelope divergente.
  - Evidência observável: teste de runner/summary finaliza um resultado completed com `artifactInspectionWarnings` e espera `outcome: "success"`, `completionReason` que não seja `round-materialization-failed`, detalhes com texto equivalente a `diagnostico produzido com warnings` e `publication` não atravessada quando bloqueada pelo gate core de automação degradada.
- Matriz requisito -> validação:
  - Requisito: closure criterion 1 exige Telegram com links dos artefatos e warnings separados.
  - Evidência observável: o teste de Telegram espera caminhos para `diagnosis.md`, `diagnosis.json` e artefatos realizados, além de um bloco separado de warnings contendo explicitamente `evidence-index.json`, `case-bundle.json` e `diagnosis.json`; cada entrada deve renderizar `kind` e `automationUsability`.
- Matriz requisito -> validação:
  - Requisito: closure criterion 2 exige trace registrar warnings de envelope sem marcar `round-materialization-failed` quando há diagnóstico útil.
  - Evidência observável: teste de trace ou runner inspeciona o payload persistido por `FileSystemWorkflowTraceStore.recordTargetFlowTrace(...)` ou o metadata montado por `buildTargetFlowTraceMetadata(...)`, esperando `outcome.status = "success"`, warnings para os três artefatos enumerados e ausência de `completionReason: "round-materialization-failed"`.
- Matriz requisito -> validação:
  - Requisito: closure criterion 3 exige que timing/fase interrompida não aponte `preflight` de forma enganosa depois da execução de estágios target-owned.
  - Evidência observável: teste de summary/timing constrói conclusão completed com warnings e estágios concluídos, renderiza a notificação ou detalhes de timing e espera ausência de `Fase interrompida`; teste negativo de falha real mantém `Fase interrompida` quando `timing.interruptedStage` estiver definido por interrupção operacional.
- Matriz requisito -> validação:
  - Requisito: allowlist de warnings e artefatos herdada do ticket/spec deve preservar membros explícitos.
  - Evidência observável: fixtures/testes usam os três artefatos `evidence-index.json`, `case-bundle.json` e `diagnosis.json` com `recommended-schema-invalid`, e asserções positivas confirmam cada membro no Telegram e no trace. Não consolidar em contador agregado sem também preservar os nomes dos artefatos.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/telegram-bot.test.ts src/core/runner.test.ts src/core/target-investigate-case.test.ts src/integrations/workflow-trace-store.test.ts`
  - Resultado: 202 testes passaram em 2026-04-13 16:50Z, cobrindo Telegram, trace, summary, timing, três artefatos enumerados e todos os `kind` aceitos de warning na superfície Telegram.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Resultado: `tsc --noEmit` concluiu com exit 0 em 2026-04-13 16:50Z.

## Idempotence and Recovery
- Idempotência: renderizações de summary, trace e Telegram devem ser funções puras sobre `TargetInvestigateCaseCompletedSummary`; rerodar a mesma rodada não deve alterar artefatos target-owned nem duplicar warnings.
- Riscos:
  - mensagem longa demais no Telegram pode reduzir legibilidade; manter diagnóstico primeiro e warnings compactos;
  - trocar `completionReason` pode afetar consumidores que esperam apenas `completed`; se necessário, preferir metadata/detalhes com warning e manter enum compatível;
  - expor warnings no trace pode exigir sanitização para não vazar payloads; renderizar apenas label, path relativo, kind, usability e mensagem curta já produzida pelo core;
  - mexer em timing pode esconder falhas reais se a condição for ampla demais.
- Recovery / Rollback:
  - se novo completion reason espalhar tipos demais, reverter essa parte e preservar diferenciação por `details`/metadata sem alterar enum pública;
  - se o Telegram ficar verboso, manter uma linha por artefato e preservar caminhos de diagnóstico, deixando detalhes longos no trace;
  - se a mudança de timing afetar falhas reais, restringir a supressão de `Fase interrompida` apenas a `outcome: "success"` com snapshot concluído.

## Artifacts and Notes
- PR/Diff: a produzir na execução deste plano.
- Logs relevantes: rodada real citada pelo ticket em `../guiadomus-matricula/output/case-investigation/2026-04-12T16-15-14Z/`.
- Evidências de teste esperadas:
  - `npm test -- src/integrations/telegram-bot.test.ts src/core/runner.test.ts src/core/target-investigate-case.test.ts src/integrations/workflow-trace-store.test.ts`;
  - `npm run check`.
- Nota sobre dados reais: usar a rodada real apenas para orientar a forma genérica dos warnings; não copiar semântica de domínio, property id ou lógica do `guiadomus-matricula` para o runner.
- Checklist de ExecPlan aplicado: ticket e referências obrigatórias lidos; spec, RFs/CAs/RNF/restrições explicitados; assumptions/defaults registrados; matriz requisito -> validação observável derivada dos closure criteria; allowlist de artefatos/warnings preservada explicitamente; riscos, não-escopo, idempotência e recovery descritos.

## Interfaces and Dependencies
- Interfaces alteradas:
  - provável enriquecimento de `TargetInvestigateCaseFlowSummary.details` e `outcome.metadata` com warnings de automação;
  - possível extensão de `TargetInvestigateCaseTracePayload` ou metadata do target flow para carregar `artifactInspectionWarnings`;
  - renderização de `buildTargetInvestigateCaseReply(...)` para completed com warnings;
  - renderização de timing/fase interrompida apenas para conclusão degradada, se necessário.
- Compatibilidade:
  - `TargetInvestigateCaseArtifactInspectionWarning` já existe e deve ser reutilizado;
  - `status: completed` deve permanecer para diagnóstico com warnings;
  - falhas operacionais reais continuam mapeadas para `round-materialization-failed` ou `round-evaluation-failed` conforme o ponto de falha;
  - Telegram e trace continuam v2-only e diagnosis-first.
- Dependências externas e mocks:
  - sem novas dependências npm;
  - testes devem usar fixtures/stubs locais, não a rodada real nem o repositório `../guiadomus-matricula`;
  - comandos Node devem repetir o prefixo obrigatório `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.
