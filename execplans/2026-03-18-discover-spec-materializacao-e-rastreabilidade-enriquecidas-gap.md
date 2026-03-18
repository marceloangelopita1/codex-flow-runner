# ExecPlan - Materializacao e rastreabilidade enriquecidas do /discover_spec

## Purpose / Big Picture
- Objetivo: liberar a acao `Criar spec` do `/discover_spec` sem perder os campos enriquecidos da entrevista profunda, reutilizando a pipeline compartilhada de materializacao/versionamento e preservando rastreabilidade explicita em `spec_planning/`.
- Resultado esperado:
  - `handleDiscoverSpecCreateSpecSelection` deixa de retornar blocker fixo e passa a executar a mesma pipeline compartilhada usada por `/plan_spec`;
  - o contrato compartilhado de `create-spec` carrega origem do fluxo, assumptions/defaults e decisoes/trade-offs sem quebrar compatibilidade com `/plan_spec`;
  - a spec criada em `docs/specs/YYYY-MM-DD-<slug>.md` continua nascendo com `Status: approved` e `Spec treatment: pending`, mas agora materializa tambem `Assumptions and defaults` e `Decisoes e trade-offs`;
  - a trilha `spec_planning/requests`, `responses` e `decisions` identifica explicitamente a origem `/discover_spec` e persiste o bloco final enriquecido relevante para auditoria;
  - o prompt de versionamento permanece com escopo estrito aos quatro artefatos esperados da sessao.
- Escopo:
  - evoluir `src/core/runner.ts` para reaproveitar a pipeline compartilhada de `create-spec` tambem a partir de `/discover_spec`;
  - estender `src/integrations/codex-client.ts` e o contrato `SpecRef` com campos enriquecidos e origem do fluxo;
  - estender `src/integrations/spec-planning-trace-store.ts` para request/response/decision com origem explicita e bloco final enriquecido;
  - ajustar `prompts/06-materializar-spec-planejada.md` e revalidar `prompts/07-versionar-spec-planejada-commit-push.md` contra o novo fluxo;
  - adicionar cobertura automatizada focada nos closure criteria em `src/core/runner.test.ts`, `src/integrations/codex-client.test.ts` e `src/integrations/spec-planning-trace-store.test.ts`;
  - atualizar a spec de origem com rastreabilidade objetiva quando a execucao deste plano acontecer.
- Fora de escopo:
  - reabrir temas de sessao Telegram, categorias obrigatorias, follow-up automatico ou gate final de entrevista; isso ja foi tratado nos execplans irmaos fechados;
  - criar uma segunda arquitetura de materializacao/versionamento exclusiva para `/discover_spec`;
  - mudar o comportamento padrao de `/plan_spec`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou dar push nesta etapa de planejamento.

## Progress
- [x] 2026-03-18 20:47Z - Planejamento inicial concluido com leitura integral do ticket alvo, `PLANS.md`, `docs/workflows/codex-quality-gates.md`, spec de origem, docs relacionadas, prompts e evidencias de codigo/teste.
- [x] 2026-03-18 21:05Z - Contrato compartilhado de `create-spec` enriquecido e retrocompativel com `/plan_spec`, com `sourceCommand`, assumptions/defaults, decisoes/trade-offs e helper compartilhado no runner para `/plan_spec` e `/discover_spec`.
- [x] 2026-03-18 21:05Z - Materializacao da spec e trilha `spec_planning/*` enriquecidas com origem `/discover_spec`, incluindo request/response/decision com bloco final relevante para auditoria e prompt `06` atualizado.
- [x] 2026-03-18 21:05Z - Matriz de validacao executada com sucesso (`spec-planning-trace-store`, `codex-client`, `runner`, `rg` de rastreabilidade) e spec de origem atualizada com este subconjunto atendido no working tree.

## Surprises & Discoveries
- 2026-03-18 20:47Z - O bloqueio atual de `Criar spec` em `/discover_spec` fica concentrado em `src/core/runner.ts`; a entrevista profunda ja produz `latestFinalBlock` com assumptions/defaults e trade-offs, mas o runner ainda interrompe o fluxo antes de entrar na pipeline compartilhada.
- 2026-03-18 20:47Z - A pipeline compartilhada de `create-spec` hoje aceita apenas `plannedTitle`, `plannedSummary`, `plannedOutline` e `tracePaths`; os campos enriquecidos do `PlanSpecFinalBlock` nao chegam nem ao prompt de materializacao nem ao `trace store`.
- 2026-03-18 20:47Z - `FileSystemSpecPlanningTraceStore` persiste request e decision sem nenhum campo de origem (`/plan_spec` vs `/discover_spec`) e sem assumptions/defaults ou decisoes/trade-offs; `writeStageResponse` tambem nao carrega essa origem.
- 2026-03-18 20:47Z - O template oficial de spec ja possui secoes `Assumptions and defaults` e `Decisoes e trade-offs`; o gap esta no prompt/materializacao, nao no padrao documental.
- 2026-03-18 20:47Z - O prompt `07-versionar-spec-planejada-commit-push.md` ja restringe corretamente o escopo de versionamento; o trabalho principal em CA-20 e provar que o novo fluxo continua usando exatamente esse contrato, sem ampliar `git add`.
- 2026-03-18 21:05Z - Para tornar RF-21 observavel nos tres artefatos, nao bastou enriquecer request e decision; a resposta de cada stage tambem precisou ganhar um snapshot minimo do bloco final enriquecido junto do `sourceCommand`.
- 2026-03-18 21:05Z - O texto de `prompts/07-versionar-spec-planejada-commit-push.md` ja era suficiente para CA-20; a mudanca correta foi manter o arquivo estavel e reforcar a prova via `codex-client.test.ts`.

## Decision Log
- 2026-03-18 - Decisao: reutilizar as etapas existentes `plan-spec-materialize` e `plan-spec-version-and-push` em vez de criar etapas discover-specific.
  - Motivo: RF-17 exige reaproveitamento da pipeline compartilhada; criar novas stages duplicaria arquitetura e reduziria compatibilidade.
  - Impacto: `runner`, `SpecRef` e prompts precisam receber campos opcionais adicionais, mas os nomes das etapas e o contrato operacional principal permanecem os mesmos.
- 2026-03-18 - Decisao: transportar os campos enriquecidos como extensoes explicitas do contrato compartilhado (`sourceCommand`, assumptions/defaults, decisoes/trade-offs e, quando util para auditoria, o bloco final enriquecido), sem remodelar `PlanSpecFinalOutline`.
  - Motivo: assumptions/defaults e trade-offs nao pertencem semanticamente ao outline atual; misturar tudo no outline tornaria o contrato mais confuso e fragil.
  - Impacto: `src/integrations/codex-client.ts`, `src/core/runner.ts` e `src/integrations/spec-planning-trace-store.ts` ganham campos novos opcionais e defaults seguros para `/plan_spec`.
- 2026-03-18 - Decisao: persistir a origem `/discover_spec` explicitamente em request, decision e response da trilha `spec_planning/`.
  - Motivo: RF-21 e CA-13 pedem rastreabilidade observavel por artefato, nao apenas inferivel pelo contexto do ticket.
  - Impacto: o `trace store` precisa escrever a origem tambem nos arquivos de response, e os testes devem verificar isso.
- 2026-03-18 - Decisao: ancorar a validacao apenas nos closure criteria do ticket e na cobertura automatizada exigida pelo proprio ticket.
  - Motivo: `docs/workflows/codex-quality-gates.md` exige traducao direta do fechamento em evidencias observaveis, sem checklist generico desconectado do problema.
  - Impacto: a matriz de validacao fica concentrada em RF-17..RF-21, CA-10..CA-13, CA-20 e nos testes nomeados no proprio ticket.
- 2026-03-18 21:05Z - Decisao: extrair a execucao de `create-spec` para um helper compartilhado no runner, parametrizado por `/plan_spec` ou `/discover_spec`.
  - Motivo: a orquestracao ja estava madura no caminho de `/plan_spec`; duplicar esse bloco para `/discover_spec` introduziria drift no fluxo mais sensivel deste ticket.
  - Impacto: a compatibilidade com `/plan_spec` ficou coberta pelos testes existentes, enquanto o novo caminho discover-specific passou a reaproveitar exatamente as mesmas etapas de materializacao/versionamento.
- 2026-03-18 21:05Z - Decisao: preservar `prompts/07-versionar-spec-planejada-commit-push.md` sem edicao textual.
  - Motivo: o prompt ja restringia `git add` aos quatro artefatos esperados; editar o texto traria ruido sem aumentar garantias reais.
  - Impacto: CA-20 ficou evidenciado por teste automatizado no builder de prompt, sem ampliar o escopo documental nem operacional do stage.

## Outcomes & Retrospective
- Status final: executado no working tree; implementacao, validacao e atualizacao da spec foram concluidas sem fechar ticket nem realizar commit/push.
- O que funcionou: a extracao do helper compartilhado de `create-spec` permitiu ligar `/discover_spec` a mesma pipeline de `/plan_spec`, enquanto `SpecRef`, prompt builder e `spec_planning/*` passaram a transportar origem e campos enriquecidos de forma retrocompativel.
- O que ficou pendente: etapa de fechamento do ticket, commit/push dedicado e revalidacao manual ponta a ponta com Telegram + Codex CLI + git remoto reais.
- Proximos passos: usar a etapa de fechamento para reler diff/ticket/spec/ExecPlan, decidir `GO/NO_GO`, fechar o ticket no commit correspondente e consolidar a auditoria final da spec.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md` - problema, evidencias e closure criteria.
  - `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` - spec de origem e rastreabilidade da linhagem.
  - `src/core/runner.ts` - blocker atual de `Criar spec` em `/discover_spec` e pipeline compartilhada de `create-spec`.
  - `src/integrations/codex-client.ts` - contrato `SpecRef`, prompt builder e stages `plan-spec-materialize` / `plan-spec-version-and-push`.
  - `src/integrations/spec-planning-trace-store.ts` - persistencia de request/response/decision em `spec_planning/*`.
  - `prompts/06-materializar-spec-planejada.md` - instrucao de materializacao da spec.
  - `prompts/07-versionar-spec-planejada-commit-push.md` - instrucao de commit/push com escopo estrito.
  - `src/core/runner.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/spec-planning-trace-store.test.ts` - superfices onde os closure criteria devem virar evidencia automatizada.
- Spec de origem: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.
- RFs cobertos por este plano: RF-17, RF-18, RF-19, RF-20 e RF-21.
- CAs cobertos por este plano: CA-10, CA-11, CA-12, CA-13 e CA-20.
- Assumptions / defaults adotados:
  - a pipeline compartilhada correta continua sendo `plan-spec-materialize` + `plan-spec-version-and-push`; o plano nao criara um fluxo batch paralelo para `/discover_spec`;
  - `PlanSpecFinalBlock` ja e a source of truth dos campos enriquecidos da entrevista; a implementacao deve derivar o payload downstream a partir dele, nao reconstruir os campos a partir de texto raw;
  - os novos campos do contrato compartilhado devem ser opcionais e defaultar para vazio ou `/plan_spec` quando a origem for o fluxo leve, preservando retrocompatibilidade;
  - a rastreabilidade minima obrigatoria do bloco enriquecido para este ticket inclui origem do fluxo, assumptions/defaults, decisoes/trade-offs, validacoes manuais pendentes e riscos conhecidos;
  - o escopo de versionamento continua limitado a `<SPEC_PATH>`, `<TRACE_REQUEST_PATH>`, `<TRACE_RESPONSE_PATH>` e `<TRACE_DECISION_PATH>`.
- Fluxo atual:
  - `/discover_spec` ja chega a um `latestFinalBlock` enriquecido e elegivel;
  - ao selecionar `Criar spec`, o runner ainda retorna um blocker fixo para evitar perda de dados;
  - `/plan_spec` ja executa a pipeline completa de create-spec, mas so com o outline antigo e sem metadados de origem na trilha.
- Restricoes tecnicas:
  - manter arquitetura em camadas e fluxo sequencial;
  - nao introduzir dependencias novas;
  - nao ampliar escopo de commit/push nem gerar artefatos extras fora da spec alvo e da trilha da sessao;
  - manter o documento final aderente ao template de spec existente, que ja contem as secoes enriquecidas necessarias.

## Plan of Work
- Milestone 1: Contrato compartilhado de `create-spec` passa a aceitar origem e campos enriquecidos.
  - Entregavel: `runner`, `SpecRef` e o `trace store` carregam `sourceCommand` e os campos enriquecidos relevantes do `PlanSpecFinalBlock`, mantendo `/plan_spec` retrocompativel.
  - Evidencia de conclusao: `src/core/runner.test.ts` e `src/integrations/spec-planning-trace-store.test.ts` provam que `/discover_spec` entra na pipeline compartilhada e que request/decision recebem origem + campos enriquecidos.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/integrations/spec-planning-trace-store.ts`, `src/core/runner.test.ts`, `src/integrations/spec-planning-trace-store.test.ts`.
- Milestone 2: Materializacao da spec preserva as secoes enriquecidas no documento final.
  - Entregavel: prompt `06` e builder de prompt passam a carregar assumptions/defaults, decisoes/trade-offs, validacoes manuais pendentes, riscos e contexto de origem.
  - Evidencia de conclusao: `src/integrations/codex-client.test.ts` prova placeholders/contexto completos; `src/core/runner.test.ts` prova que a spec criada contem `Assumptions and defaults` e `Decisoes e trade-offs`, alem da metadata inicial obrigatoria.
  - Arquivos esperados: `prompts/06-materializar-spec-planejada.md`, `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `src/core/runner.test.ts`.
- Milestone 3: Trilha `spec_planning/*` e guard de versionamento ficam consistentes para o novo fluxo.
  - Entregavel: request/response/decision registram explicitamente origem `/discover_spec` e o bloco enriquecido relevante; o prompt `07` continua com escopo estrito, com prova automatizada de que isso tambem vale para a execucao iniciada por `/discover_spec`.
  - Evidencia de conclusao: `src/integrations/spec-planning-trace-store.test.ts` valida headers/campos de origem nos tres artefatos; `src/integrations/codex-client.test.ts` valida que o prompt de versionamento continua restrito aos quatro arquivos esperados.
  - Arquivos esperados: `src/integrations/spec-planning-trace-store.ts`, `src/integrations/spec-planning-trace-store.test.ts`, `prompts/07-versionar-spec-planejada-commit-push.md` se houver ajuste textual minimo, `src/integrations/codex-client.test.ts`.
- Milestone 4: Auditoria final da linhagem da spec.
  - Entregavel: spec de origem atualizada com atendimento do subconjunto RF-17..RF-21 / CA-10..CA-13 / CA-20 e evidencias objetivas deste execplan.
  - Evidencia de conclusao: `rg` encontra as referencias deste ticket/execplan e dos RFs/CAs correspondentes na spec e nas suites.
  - Arquivos esperados: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "handleDiscoverSpecCreateSpecSelection|handlePlanSpecCreateSpecSelection|traceStore.startSession|plan-spec-materialize|plan-spec-version-and-push|spec_planning" src/core/runner.ts src/integrations/codex-client.ts src/integrations/spec-planning-trace-store.ts` para confirmar os pontos exatos de orquestracao compartilhada.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/codex-client.ts` para estender `SpecRef` com campos opcionais de origem e dados enriquecidos (`sourceCommand`, assumptions/defaults, decisoes/trade-offs e outros campos de auditoria que precisem seguir para prompt/trilha), mantendo defaults seguros para `/plan_spec`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/spec-planning-trace-store.ts` para estender `SpecPlanningTraceSessionRequest` e `writeStageResponse`, persistindo request/response/decision com `sourceCommand` explicito e o bloco final enriquecido relevante para auditoria.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.ts` para extrair ou generalizar a execucao compartilhada de `create-spec`, removendo o blocker fixo de `/discover_spec` e fazendo esse fluxo enviar os campos enriquecidos para `traceStore.startSession` e `runSpecStage(...)`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `prompts/06-materializar-spec-planejada.md` para exigir explicitamente a materializacao de `Assumptions and defaults`, `Decisoes e trade-offs`, validacoes manuais pendentes e riscos conhecidos, alinhado ao template oficial de spec.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `prompts/07-versionar-spec-planejada-commit-push.md`; se o texto atual ja for suficiente para CA-20, manter o arquivo e reforcar a prova via teste; se faltar referencia minima ao contrato expandido, aplicar apenas ajuste textual que preserve o mesmo escopo estrito de arquivos.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/codex-client.test.ts` para transformar RF-20/CA-12 e CA-20 em casos de teste: placeholders novos, ausencia de placeholders sobrando, origem do fluxo disponivel no prompt e escopo de versionamento inalterado.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/spec-planning-trace-store.test.ts` para provar que request, response e decision passam a incluir origem `/discover_spec` e campos enriquecidos observaveis.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.test.ts` para cobrir o caminho feliz de `Criar spec` a partir de `/discover_spec`, validando nome `docs/specs/YYYY-MM-DD-<slug>.md`, metadata inicial, secoes enriquecidas no arquivo e trilha `spec_planning/*` com origem explicita.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts` para validar contrato compartilhado, prompt builder e persistencia da trilha.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts` para validar a orquestracao end-to-end do `create-spec` iniciado por `/discover_spec`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` para registrar o subconjunto RF-17..RF-21 / CA-10..CA-13 / CA-20 como atendido ou parcialmente atendido, referenciando este execplan e as evidencias automatizadas.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-17|RF-18|RF-19|RF-20|RF-21|CA-10|CA-11|CA-12|CA-13|CA-20|discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap" docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/spec-planning-trace-store.test.ts` para auditoria final de rastreabilidade.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts` para a passada final da matriz de validacao deste ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:

| Requisito / closure criterion | Validacao observavel |
| --- | --- |
| RF-17, RF-18, RF-19; CA-10, CA-11 | `src/core/runner.test.ts` prova que `handleDiscoverSpecFinalActionSelection("create-spec")` deixa de retornar blocker fixo, executa a pipeline compartilhada e cria `docs/specs/YYYY-MM-DD-<slug>.md`; o arquivo gerado contem `Status: approved` e `Spec treatment: pending`. |
| RF-20; CA-12 | `src/integrations/codex-client.test.ts` prova que o prompt `plan-spec-materialize` recebe assumptions/defaults, decisoes/trade-offs, validacoes manuais pendentes e riscos conhecidos sem placeholders sobrando; `src/core/runner.test.ts` prova que a spec gerada materializa `Assumptions and defaults` e `Decisoes e trade-offs` no documento final. |
| RF-21; CA-13 | `src/integrations/spec-planning-trace-store.test.ts` prova que `spec_planning/requests`, `responses` e `decisions` registram explicitamente a origem `/discover_spec` e persistem o bloco final enriquecido relevante; `src/core/runner.test.ts` confirma esses artefatos no fluxo end-to-end. |
| CA-20 | `src/integrations/codex-client.test.ts` prova que o prompt `plan-spec-version-and-push` continua restrito a `<SPEC_PATH>`, `<TRACE_REQUEST_PATH>`, `<TRACE_RESPONSE_PATH>` e `<TRACE_DECISION_PATH>`, sem ampliar o escopo de versionamento ao executar o novo fluxo. |
| Cobertura automatizada exigida pelo ticket | A passada final `npx tsx --test` sobre `spec-planning-trace-store`, `codex-client` e `runner` fica verde, e a busca `rg` encontra RF-17..RF-21 / CA-10..CA-13 / CA-20 referenciados na spec e nas suites relevantes. |

- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts`
  - Esperado: as suites demonstram request/response/decision com origem `/discover_spec`, persistencia dos campos enriquecidos relevantes e prompt de materializacao/versionamento com placeholders completos e escopo estrito.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: a suite demonstra que `/discover_spec` reaproveita a pipeline compartilhada, cria a spec com naming esperado e metadata inicial obrigatoria, materializa as secoes enriquecidas e persiste a trilha `spec_planning/*` com origem explicita.
- Comando: `rg -n "RF-17|RF-18|RF-19|RF-20|RF-21|CA-10|CA-11|CA-12|CA-13|CA-20|discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap" docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/spec-planning-trace-store.test.ts`
  - Esperado: cada RF/CA relevante aparece explicitamente na spec atualizada e/ou nos testes usados como evidencia, mantendo rastreabilidade auditavel.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts`
  - Esperado: a matriz completa do ticket passa em conjunto, demonstrando convergencia entre runner, trace store e prompt builder no mesmo contrato observavel.

## Idempotence and Recovery
- Idempotencia:
  - os campos novos do contrato compartilhado devem permanecer opcionais para que `/plan_spec` continue funcionando quando assumptions/defaults e trade-offs nao existirem;
  - reexecutar as suites focadas nao cria side effects persistentes fora dos diretorios temporarios usados pelos testes;
  - colisao de `docs/specs/YYYY-MM-DD-<slug>.md` deve continuar abortando o fluxo com mensagem acionavel, sem sobrescrita silenciosa.
- Riscos:
  - tornar campos enriquecidos obrigatorios no contrato compartilhado e quebrar o caminho atual de `/plan_spec`;
  - atualizar o prompt `06` de modo incompleto e continuar gerando spec sem `Assumptions and defaults` ou `Decisoes e trade-offs`;
  - persistir origem apenas em request/decision e esquecer responses, deixando RF-21 parcialmente atendido;
  - mexer desnecessariamente no prompt `07` e ampliar sem querer o escopo de versionamento.
- Recovery / Rollback:
  - manter os novos campos como extensoes opcionais com defaults seguros; se `/plan_spec` regredir, isolar a origem discover-specific em wrappers finos no runner em vez de aprofundar a abstracao compartilhada;
  - se a materializacao continuar omitindo secoes enriquecidas, preservar o blocker de `/discover_spec` ate que o prompt `06` e a prova automatizada estejam corretos, em vez de liberar uma entrega parcial;
  - se o texto atual de `prompts/07-versionar-spec-planejada-commit-push.md` ja satisfizer CA-20, preferir teste adicional a uma edicao desnecessaria do prompt.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`.
- ExecPlan desta entrega: `execplans/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`.
- Spec de referencia: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.
- Execplans da mesma linhagem ja concluidos:
  - `execplans/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md`
  - `execplans/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`
- Documentacao/processo consultados:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
- Evidencias tecnicas consultadas durante o planejamento:
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/spec-planning-trace-store.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `prompts/06-materializar-spec-planejada.md`
  - `prompts/07-versionar-spec-planejada-commit-push.md`
  - `src/core/runner.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/spec-planning-trace-store.test.ts`
- Nota de sequenciamento: este plano deve ser executado sem absorver mudancas de Telegram ou de protocolo de entrevista; a fronteira correta termina quando `Criar spec` de `/discover_spec` usa a pipeline compartilhada sem perda de rastreabilidade nem de campos enriquecidos.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `SpecRef` em `src/integrations/codex-client.ts`, com origem do fluxo e campos enriquecidos adicionais para materializacao/trilha;
  - `SpecPlanningTraceSessionRequest` e o contrato de `writeStageResponse` em `src/integrations/spec-planning-trace-store.ts`;
  - orquestracao compartilhada de `create-spec` em `src/core/runner.ts`, hoje duplicada entre um caminho funcional (`/plan_spec`) e um blocker (`/discover_spec`);
  - placeholders e contexto do prompt `06`, e possivelmente o texto do prompt `07` se for necessario explicitar compatibilidade sem alterar escopo.
- Compatibilidade:
  - `/plan_spec` deve continuar materializando specs mesmo sem assumptions/defaults ou trade-offs adicionais;
  - o naming `docs/specs/YYYY-MM-DD-<slug>.md`, a metadata inicial e o conjunto de quatro artefatos versionados nao podem mudar;
  - a trilha `spec_planning/*` permanece com a mesma estrutura de diretorios (`requests`, `responses`, `decisions`), apenas com mais campos observaveis.
- Dependencias externas e mocks:
  - a dependencia operacional principal continua sendo o Codex CLI usado pelas stages compartilhadas, mas os testes devem permanecer 100% stubados;
  - a persistencia local continua baseada em `node:fs` e `node:path`;
  - nao ha necessidade de novas dependencias de runtime ou de mudar o template oficial de spec.
