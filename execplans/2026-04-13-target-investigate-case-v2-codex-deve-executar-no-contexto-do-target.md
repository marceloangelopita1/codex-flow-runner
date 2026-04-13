# ExecPlan - target-investigate-case-v2 Codex deve executar no contexto do target

## Purpose / Big Picture
- Objetivo: ajustar a execução Codex dos estágios target-owned de `/target_investigate_case_v2` para nascer no `cwd` do projeto alvo, preservando o runner como orquestrador e referência operacional explícita no prompt.
- Resultado esperado: `CodexCliTicketFlowClient.runTargetInvestigateCaseV2Stage(...)` chama `runCodexCommand` com `cwd = request.targetProject.path` para `resolve-case`, `assemble-evidence` e `diagnosis`; o prompt continua incluindo `runnerRepoPath`, `runnerReference`, round id, manifesto, runbook e caminhos de artefato.
- Escopo: mudança local em `src/integrations/codex-client.ts`, testes focados em `src/integrations/codex-client.test.ts` e validação por typecheck. O plano cobre apenas estágios target-owned da v2.
- Fora de escopo da implementação: alterar prompts do target, manifesto v2, round preparer, summary/Telegram/trace, schema de artefatos, publication e tickets de target externo. Fechamento do ticket é tratado apenas na etapa operacional posterior; commit e push continuam fora desta etapa.

## Progress
- [x] 2026-04-13 16:54Z - Planejamento inicial concluído com leitura do ticket, `PLANS.md`, `DOCUMENTATION.md`, quality gates, spec de origem, onboarding v2 e superfícies de código/teste.
- [x] 2026-04-13 17:01Z - Implementação concluída em `src/integrations/codex-client.ts` e `src/integrations/codex-client.test.ts`.
- [x] 2026-04-13 17:01Z - Validação final concluída com teste da matriz, typecheck e revisão de diff/cwd.
- [x] 2026-04-13 17:05Z - Ticket fechado em `tickets/closed/` no mesmo changeset da correção preparado para versionamento pelo runner.

## Surprises & Discoveries
- 2026-04-13 16:54Z - `runTargetInvestigateCaseV2Stage(...)` já carrega o prompt canônico a partir de `request.targetProject.path`, mas executa `runCodexCommand` com `cwd: this.repoPath`.
- 2026-04-13 16:54Z - Os testes atuais de `src/integrations/codex-client.test.ts` validam conteúdo do prompt e ausência de superfícies legadas, mas ainda não capturam o `cwd` passado à dependência `runCodexCommand`.
- 2026-04-13 16:54Z - A superfície tipada de estágios v2 neste client é a enumeração finita `resolve-case`, `assemble-evidence` e `diagnosis`; o plano deve preservar prova explícita para os três membros.
- 2026-04-13 17:01Z - O primeiro teste existente construía `CodexCliTicketFlowClient` com `repoPath = fixture.project.path`, o que mascarava o bug de `cwd`; a prova nova usa `repoPath` do runner diferente do target.
- 2026-04-13 17:01Z - O comando `npm test -- src/integrations/codex-client.test.ts` executa a suíte glob completa configurada em `package.json` e o arquivo focado adicional; a evidência observada foi 203 testes passando.

## Decision Log
- 2026-04-13 - Decisão: alterar somente o `cwd` da chamada `runCodexCommand` dentro de `runTargetInvestigateCaseV2Stage(...)`.
  - Motivo: o ticket pede contexto natural de execução no target sem mudar a montagem de prompt, autenticação, preferências de invocação ou fluxos runner-owned.
  - Impacto: reduz blast radius e mantém todos os demais fluxos com o `cwd` atual.
- 2026-04-13 - Decisão: manter `runnerRepoPath` e `runnerReference` como dados explícitos do prompt.
  - Motivo: mesmo executando no target, o Codex precisa conseguir consultar docs, contrato e política de orquestração do runner.
  - Impacto: o target vira contexto natural da sessão, enquanto o runner permanece referência documentada e rastreável.
- 2026-04-13 - Decisão: validar os três estágios target-owned por iteração parametrizada no teste.
  - Motivo: `cada etapa target-owned` é um conjunto finito pequeno e explícito; consolidar em apenas um estágio deixaria lacuna de evidência.
  - Impacto: o teste deve cobrir positivamente `resolve-case`, `assemble-evidence` e `diagnosis`.
- 2026-04-13 - Decisão: usar no teste um `runnerRepoPath` fixo e diferente do caminho temporário do target.
  - Motivo: a regressão só fica observável quando `this.repoPath` e `request.targetProject.path` são caminhos distintos.
  - Impacto: o teste falha no comportamento anterior e prova que os estágios v2 target-owned passam a nascer no contexto natural do target.

## Outcomes & Retrospective
- Status final: GO; implementação, validação e fechamento do ticket concluídos localmente para versionamento posterior pelo runner.
- O que funcionou:
  - teste parametrizado capturou a regressão de `cwd` antes da correção;
  - mudança de produção ficou restrita ao objeto passado para `runCodexCommand` em `runTargetInvestigateCaseV2Stage(...)`;
  - prompt preservou `runnerRepoPath`, `runnerReference`, round id, manifesto, runbook e paths de artefatos.
- O que ficou pendente:
  - commit/push pelo runner, fora desta etapa.
  - validação manual externa em rodada real para confirmar que Codex respeita `AGENTS.md`, runbook e paths locais do target quando invocado pela v2.
- Próximos passos:
  - runner deve versionar o changeset único com implementação, testes, atualização da spec, ExecPlan e fechamento do ticket.
  - operador humano deve executar a validação real em target aderente quando houver janela operacional.

## Context and Orientation
- Ticket alvo fechado: `tickets/closed/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`.
- ExecPlan: `execplans/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`.
- Spec de origem: `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`.
- Referência operacional lida: `docs/workflows/target-investigate-case-v2-target-onboarding.md`.
- RFs/CAs herdados do ticket: RF-04, RF-05, RF-09, RF-14, CA-04 e CA-06.
- RFs/CAs diretamente cobertos pelos closure criteria do ticket: RF-04, RF-05, RF-14, CA-04 e CA-06. RF-09 entra como contexto herdado porque o prompt declarado pelo target e o `stagePromptPath` devem continuar sendo usados, mas este ticket não muda o manifesto nem os slots canônicos.
- RNFs e restrições herdadas: reduzir dependência de contexto tácito; manter baixo custo cognitivo; preservar fluxo sequencial; manter o runner target-agnostic; não embutir heurísticas específicas do target; target é autoridade semântica do caso.
- Assumptions / defaults adotados:
  - `targetProject.path` é o diretório de trabalho correto para os estágios target-owned da v2;
  - `this.repoPath` continua sendo o cwd correto dos fluxos runner-owned e de fluxos não relacionados;
  - a mudança não deve alterar `promptTemplatePath`, substituição de placeholders, runtime shell guidance, ambiente, preferências Codex ou tratamento de erro;
  - o prompt deve seguir incluindo `runnerRepoPath`, `runnerReference`, `roundId`, `roundDirectory`, `manifestPath`, `runbookPath` quando declarado, `artifactPaths` e `stageArtifacts`;
  - a execução permanece sequencial; este ticket não introduz paralelização de estágios.
- Allowlists/enumerações finitas relevantes:
  - Estágios target-owned cobertos: `resolve-case`, `assemble-evidence`, `diagnosis`. Não há consolidação: a validação deve preservar os três membros explicitamente.
  - Campos de contexto do runner que devem permanecer no prompt: `runnerRepoPath`, `runnerReference`, `roundId` e `artifactPaths`; o closure criterion também cita round id e artifact paths, então o teste deve assertar esses membros sem depender de texto livre frágil.
  - Fluxos fora do conjunto deste ticket: `runStage`, `runSpecStage`, `startPlanSession`, `startDiscoverSession`, `startFreeChatSession`, `startSpecTicketValidationSession`, `runSpecTicketValidationAutoCorrect`, `runTargetPrepare`, `runTargetCheckup` e `runTargetDeriveGapAnalysis`. A validação de não regressão deve confirmar que o diff não altera o `cwd` desses fluxos.
- Fronteira de ownership com tickets da mesma linhagem:
  - `tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md` cobre tolerância core a envelopes divergentes.
  - `tickets/closed/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md` cobre summary, trace, Telegram e timing para diagnóstico com warnings.
  - Este ticket cobre somente o contexto natural de execução Codex no target.
  - A coexistência evita `duplication-gap` porque cada ticket possui closure criteria em superfície distinta: core de artefatos, apresentação operator-facing e cwd da sessão Codex.
- Arquivos principais:
  - `src/integrations/codex-client.ts`: método `runTargetInvestigateCaseV2Stage(...)`, atualmente chamando `runCodexCommand({ cwd: this.repoPath, ... })`.
  - `src/integrations/codex-client.test.ts`: testes existentes do prompt v2; deve ganhar captura de `cwd` e cobertura parametrizada dos três estágios.
  - `src/test-support/target-investigate-case-fixtures.ts`: fixture já usada pelos testes atuais para criar `targetProject.path`, `roundId`, `roundDirectory` e `artifactPaths`.

## Plan of Work
- Milestone 1: contrato de `cwd` target-owned coberto por teste.
  - Entregável: teste em `src/integrations/codex-client.test.ts` captura o request recebido por `runCodexCommand` e prova `cwd = fixture.project.path` para `resolve-case`, `assemble-evidence` e `diagnosis`.
  - Evidência de conclusão: teste falha no estado atual com `cwd: this.repoPath` e passa após a correção.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`.
- Milestone 2: execução Codex v2 usa o target como cwd natural.
  - Entregável: `runTargetInvestigateCaseV2Stage(...)` passa `cwd: request.targetProject.path` para `runCodexCommand`.
  - Evidência de conclusão: teste focado passa e logs continuam carregando `targetProjectPath`, `roundId`, `stage` e `promptTemplatePath`.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 3: prompt preserva referências do runner e artefatos da rodada.
  - Entregável: testes existentes ou novos continuam assertando `runnerRepoPath`, `runnerReference`, round id, manifesto, runbook, `stageArtifacts` e `artifactPaths` no prompt.
  - Evidência de conclusão: teste focado prova que mudar o cwd não remove contexto do runner nem paths da rodada.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`.
- Milestone 4: não regressão de fluxos não relacionados.
  - Entregável: revisão do diff confirma que somente a chamada de `runCodexCommand` em `runTargetInvestigateCaseV2Stage(...)` mudou de cwd; chamadas em fluxos runner-owned continuam usando `this.repoPath`.
  - Evidência de conclusão: `git diff -- src/integrations/codex-client.ts` mostra a alteração restrita e `npm run check` passa.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 5: fechamento operacional futuro.
  - Entregável: ticket movido de `tickets/open/` para `tickets/closed/` com `Closure` preenchido e referência a este ExecPlan, no mesmo changeset da correção.
  - Evidência de conclusão: diff mostra implementação, testes e movimento do ticket; nenhum commit/push é feito sem pedido explícito.
  - Arquivos esperados: `tickets/closed/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir o contexto com `sed -n '1,220p' tickets/closed/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`, `sed -n '1,260p' execplans/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md`, `sed -n '1,260p' docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md` e `sed -n '1,220p' docs/workflows/target-investigate-case-v2-target-onboarding.md`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Mapear a superfície exata com `rg -n "runTargetInvestigateCaseV2Stage|runCodexCommand\\(|cwd: this\\.repoPath|cwd: request\\.targetProject\\.path|runnerRepoPath|runnerReference|artifactPaths" src/integrations/codex-client.ts src/integrations/codex-client.test.ts`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` para capturar o request de `runCodexCommand` e assertar `request.cwd === fixture.project.path` em execução parametrizada para `resolve-case`, `assemble-evidence` e `diagnosis`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) No mesmo teste ou em teste complementar, assertar que o prompt ainda contém `codex-flow-runner@local`, `/home/mapita/projetos/codex-flow-runner`, `fixture.roundId`, `fixture.roundDirectory`, o manifesto, o runbook quando declarado e os artifact paths serializados.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` apenas em `runTargetInvestigateCaseV2Stage(...)`, trocando `cwd: this.repoPath` por `cwd: request.targetProject.path`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `git diff -- src/integrations/codex-client.ts src/integrations/codex-client.test.ts` para confirmar que nenhuma chamada de fluxo não relacionado teve `cwd` alterado.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se todos os closure criteria estiverem provados, mover o ticket para `tickets/closed/`, preencher `Closure` com este ExecPlan e evidências de validação executadas, mantendo o movimento no mesmo changeset da correção. Não fazer commit/push salvo pedido explícito.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: RF-04 e CA-06 exigem que o runner continue target-agnostic e preserve a fronteira runner/target.
  - Evidência observável: diff de `src/integrations/codex-client.ts` altera apenas o `cwd` da invocação Codex v2 target-owned para `request.targetProject.path`, sem adicionar scripts, paths, heurísticas ou semântica do `guiadomus-matricula`.
- Matriz requisito -> validação:
  - Requisito: RF-05 exige que o target seja a autoridade semântica dos estágios de resolução, coleta e diagnóstico.
  - Evidência observável: teste em `src/integrations/codex-client.test.ts` executa `runTargetInvestigateCaseV2Stage(...)` e espera que `runCodexCommand` receba `cwd = targetProject.path`, permitindo que Codex herde naturalmente `AGENTS.md`, runbook, scripts e paths locais do target.
- Matriz requisito -> validação:
  - Requisito: RF-14 e CA-04 exigem que `assemble-evidence` seja responsável por instruções operacionais de coleta no target.
  - Evidência observável: caso parametrizado para `stage: "assemble-evidence"` espera `cwd = targetProject.path`, `stagePromptPath` do prompt de assemble-evidence e artifact paths de `evidence-index.json`/`case-bundle.json` ainda presentes no prompt.
- Matriz requisito -> validação:
  - Requisito: closure criterion 1 exige que `CodexCliTicketFlowClient.runTargetInvestigateCaseV2Stage` prove `cwd = targetProject.path`.
  - Evidência observável: teste parametrizado cobre explicitamente `resolve-case`, `assemble-evidence` e `diagnosis`, captura o request de `runCodexCommand` para cada membro e espera `cwd` igual ao caminho da fixture do target, não ao `repoPath` passado ao client.
- Matriz requisito -> validação:
  - Requisito: closure criterion 2 exige que o prompt ainda inclua `runnerRepoPath`, `runnerReference`, round id e artifact paths.
  - Evidência observável: teste assertivo sobre `capturedPrompt` encontra `/home/mapita/projetos/codex-flow-runner`, `codex-flow-runner@local`, `fixture.roundId`, `fixture.roundDirectory`, manifesto, runbook e JSON de `artifactPaths`; os testes existentes de ausência de superfícies legadas continuam passando.
- Matriz requisito -> validação:
  - Requisito: closure criterion 3 exige que nenhum fluxo não relacionado mude de cwd.
  - Evidência observável: `git diff -- src/integrations/codex-client.ts` mostra mudança restrita ao bloco de `runTargetInvestigateCaseV2Stage(...)`; `rg -n "cwd: this\\.repoPath|cwd: request\\.targetProject\\.path" src/integrations/codex-client.ts` confirma que fluxos runner-owned permanecem em `this.repoPath` e somente a v2 target-owned usa `request.targetProject.path`.
- Matriz requisito -> validação:
  - Requisito: RF-09 herdado exige que prompts declarados pelo target continuem sendo usados pelos slots canônicos.
  - Evidência observável: teste existente ou ampliado espera `promptTemplatePath = path.join(targetProject.path, stagePromptPath)` quando `stagePromptPath` existe, e caso entrypoint-only mantém `promptTemplatePath = "[entrypoint-only-stage:<stage>]"` sem carregar template externo.
- Matriz requisito -> validação:
  - Requisito: RNFs herdados exigem reduzir contexto tácito e custo cognitivo.
  - Evidência observável: prompt final preserva bloco `Contexto adicional do target-investigate-case v2` com runner repo, referência textual do runner, etapa, artefatos obrigatórios e facts JSON; a mudança de `cwd` não obriga o prompt a compensar com instrução para entrar manualmente no target.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts`
  - Esperado: suíte de testes do client passa, incluindo cobertura de `cwd` para `resolve-case`, `assemble-evidence` e `diagnosis`, além dos testes existentes de prompt diagnosis-first e entrypoint-only.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: `tsc --noEmit` conclui com exit 0.

## Idempotence and Recovery
- Idempotência: a mudança é determinística por request; rerodar o mesmo estágio usa sempre o mesmo `targetProject.path` como `cwd` e não altera artefatos por si só além do comportamento normal da etapa executada.
- Riscos:
  - Codex executado no target pode deixar de resolver caminhos relativos ao runner se o prompt não preservar `runnerRepoPath`;
  - testes parametrizados podem ficar verbosos se duplicarem toda a fixture de cada estágio;
  - algum fluxo runner-owned pode depender acidentalmente do helper comum se a alteração for feita em ponto amplo demais.
- Recovery / Rollback:
  - se o target cwd quebrar acesso a docs do runner, manter `cwd = targetProject.path` e reforçar apenas as referências explícitas de `runnerRepoPath` no prompt, porque o requisito central é execução no target;
  - se a parametrização de teste ficar frágil, usar tabela pequena com estágio, prompt path e artefatos esperados, preservando os três membros;
  - se o diff tocar fluxos não relacionados, recuar essas alterações e restringir o patch ao objeto passado para `runCodexCommand` em `runTargetInvestigateCaseV2Stage(...)`.

## Artifacts and Notes
- PR/Diff: implementação local sem commit/push nesta etapa; `src/integrations/codex-client.ts` altera apenas o `cwd` de `runTargetInvestigateCaseV2Stage(...)` para `request.targetProject.path`; `src/integrations/codex-client.test.ts` adiciona cobertura parametrizada dos três estágios target-owned.
- Logs relevantes: o ticket cita a rodada real `output/case-investigation/2026-04-12T16-15-14Z` no target `guiadomus-matricula`; este plano não depende de executar esse target real.
- Evidências de teste esperadas:
  - `npm test -- src/integrations/codex-client.test.ts` com 203 testes passando em 2026-04-13 17:01Z;
  - `npm run check` com `exit 0` em 2026-04-13 17:01Z;
  - revisão de diff restrita a `src/integrations/codex-client.ts` e `src/integrations/codex-client.test.ts`;
  - `rg -n "cwd: this\\.repoPath|cwd: request\\.targetProject\\.path" src/integrations/codex-client.ts` confirmando somente a v2 target-owned com `request.targetProject.path`.
- Nota sobre dados reais: usar o target real apenas como contexto operacional do problema; testes devem usar fixtures locais e não depender de `../guiadomus-matricula`.
- Checklist de ExecPlan aplicado: ticket e referências obrigatórias lidos; spec, RFs/CAs/RNFs/restrições explicitados; assumptions/defaults registrados; allowlist de estágios target-owned preservada explicitamente; matriz requisito -> validação observável derivada dos closure criteria; riscos, não-escopo, idempotência e recovery descritos.

## Interfaces and Dependencies
- Interfaces alteradas:
  - comportamento de `CodexCliTicketFlowClient.runTargetInvestigateCaseV2Stage(...)`: `runCodexCommand.cwd` passa de `this.repoPath` para `request.targetProject.path` nos estágios v2 target-owned.
- Interfaces preservadas:
  - assinatura de `TargetInvestigateCaseV2StageCodexRequest` e `TargetInvestigateCaseV2StageCodexResult`;
  - shape do prompt, `promptTemplatePath`, `promptText`, diagnostics, env e invocation preferences;
  - comportamento de fluxos runner-owned e fluxos de prepare/checkup/derive.
- Compatibilidade:
  - `stagePromptPath` continua resolvido contra `targetProject.path`;
  - `runnerRepoPath` e `runnerReference` continuam disponíveis no prompt para acesso explícito ao runner;
  - execução entrypoint-only continua sem carregar template externo.
- Dependências externas e mocks:
  - sem novas dependências npm;
  - testes devem usar stubs de `runCodexCommand`, `loadPromptTemplate` e fixtures locais;
  - comandos Node devem repetir o prefixo obrigatório `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.
