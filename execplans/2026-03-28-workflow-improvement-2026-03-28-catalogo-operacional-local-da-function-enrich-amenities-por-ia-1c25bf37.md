# ExecPlan - alinhar checklist compartilhado entre onboarding, checkup e contrato de compatibilidade em projetos externos

## Purpose / Big Picture
- Objetivo: alinhar `target_prepare`, `target_checkup` e `docs/workflows/target-project-compatibility-contract.md` com a estratégia canônica já adotada pelos prompts para projetos externos, tornando observável que o checklist compartilhado do workflow é resolvido via `../codex-flow-runner/docs/workflows/codex-quality-gates.md`, e não por uma cópia implícita dentro do repositório alvo.
- Resultado esperado:
  - `docs/workflows/target-project-compatibility-contract.md` passa a declarar explicitamente a regra canônica para projetos externos compatíveis com o workflow completo;
  - `target_prepare` deixa de sinalizar `compatibleWithWorkflowComplete: true` sem também explicitar, em artefatos observáveis, como o checklist compartilhado fica resolvível;
  - `target_checkup` passa a validar a mesma estratégia e a evidenciar gap quando o checklist compartilhado não estiver resolvível pelo caminho canônico escolhido;
  - a cobertura automatizada continua verde para `spec-triage` em projeto externo, preservando a correção já entregue no builder de prompts.
- Escopo:
  - ajustar o contrato documental em `docs/workflows/target-project-compatibility-contract.md`;
  - alinhar `src/types/target-prepare.ts`, `src/core/target-prepare.ts` e `src/core/target-prepare.test.ts` para tornar a estratégia observável em manifesto/relatório/resumo;
  - alinhar `src/types/target-checkup.ts`, `src/core/target-checkup.ts` e `src/core/target-checkup.test.ts` para validar a mesma estratégia no readiness audit;
  - tocar `src/core/runner.ts` e/ou um helper pequeno compartilhado apenas se isso for necessário para eliminar drift entre as superfícies que já conhecem o caminho `../codex-flow-runner/...`.
- Fora de escopo:
  - reverter a estratégia já implementada nos prompts para voltar a exigir `docs/workflows/codex-quality-gates.md` dentro do repositório alvo;
  - propagar uma cópia local do checklist para o projeto externo, salvo se a execução provar objetivamente que a estratégia canônica atual é inviável e exigir outro ticket;
  - alterar o projeto externo `../guiadomus-enrich-amenities`;
  - fechar ticket, commitar, fazer push ou implementar qualquer trabalho fora das superfícies estruturais do workflow.

## Progress
- [x] 2026-03-31 00:57Z - Planejamento inicial concluído após leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, do contrato de compatibilidade, das superfícies de `target_prepare`/`target_checkup` e do ExecPlan relacionado que já alinhou os prompts.
- [x] 2026-03-31 01:12Z - Contrato canônico de compatibilidade atualizado para declarar explicitamente a estratégia do checklist compartilhado em projetos externos.
- [x] 2026-03-31 01:12Z - `target_prepare` ajustado para tornar observável, em manifesto/relatório, por que o alvo preparado é compatível com o workflow completo sob a estratégia escolhida.
- [x] 2026-03-31 01:12Z - `target_checkup` ajustado para validar a mesma estratégia e sinalizar gap quando o checklist compartilhado não for resolvível.
- [x] 2026-03-31 01:12Z - Matriz de validação executada contra os closure criteria do ticket, com testes estruturais, tipagem e guardrail da regressão já corrigida nos prompts.

## Surprises & Discoveries
- 2026-03-31 00:57Z - O problema original já foi parcialmente fechado por outra entrega: `prompts/01`, `02`, `03`, `04`, `08`, `11` e `12` já usam `<WORKFLOW_QUALITY_GATES_PATH>`, e `src/integrations/codex-client.ts` resolve o placeholder para `../codex-flow-runner/docs/workflows/codex-quality-gates.md` quando o repositório ativo é externo.
- 2026-03-31 00:57Z - `src/core/runner.ts` já expõe o checklist compartilhado como artefato do repositório irmão em contexto externo, então o drift atual ficou concentrado em onboarding/checkup/contrato, não mais nos prompts.
- 2026-03-31 00:57Z - `target_prepare` ainda grava `compatibleWithWorkflowComplete: true` e resume “Compatível com workflow completo: sim” sem explicitar a dependência externa do checklist nem validá-la de forma auditável no próprio artefato.
- 2026-03-31 00:57Z - `target_checkup` verifica cópias exatas e documentos obrigatórios dentro do projeto alvo, mas hoje não checa a resolubilidade do checklist compartilhado pela estratégia externa já adotada nos prompts.
- 2026-03-31 00:57Z - Os caminhos de `Request file`, `Response file`, `Decision file` e os `tickets/open/` do projeto irmão citados no ticket não estavam mais presentes no filesystem durante o planejamento; a linha de base segura passou a ser o ticket, a spec de origem, o estado atual do `codex-flow-runner` e o ExecPlan já entregue para a parte de prompts.
- 2026-03-31 01:12Z - O script atual de `npm test -- ...` expande para a suíte inteira (`tsx --test src/**/*.test.ts ...`), então a validação automatizada observou também `runner`, `codex-client` e demais guardrails do repositório, não só os arquivos alvo do plano.

## Decision Log
- 2026-03-31 - Decisão: tratar como canônica a estratégia já implementada de resolver o checklist compartilhado por `../codex-flow-runner/docs/workflows/codex-quality-gates.md` em projetos externos.
  - Motivo: essa estratégia já está codificada e coberta em `src/integrations/codex-client.ts` e evita reabrir um changeset já entregue para o builder de prompts.
  - Impacto: `target_prepare`, `target_checkup` e o contrato de compatibilidade devem se alinhar a essa regra, em vez de reintroduzir uma cópia local do checklist por default.
- 2026-03-31 - Decisão: tornar a estratégia observável em artefatos de preparo e checkup, e não apenas em texto solto do contrato.
  - Motivo: o closure criterion do ticket pede que o target não seja tratado como workflow-complete com checklist inacessível; isso exige evidência auditável, não mera inferência.
  - Impacto: manifesto/relatório do `target_prepare` e evidências do `target_checkup` precisam apontar explicitamente a mesma dependência/resolução.
- 2026-03-31 - Decisão: manter `src/integrations/codex-client.ts` e os templates de prompt como guardrail de regressão, não como foco principal deste plano.
  - Motivo: a parte de prompts já foi corrigida e testada; tocar nela de novo só faz sentido se um helper mínimo compartilhado for a forma mais segura de evitar novo drift textual.
  - Impacto: a validação final deve confirmar que a correção existente continua verde sem exigir reescrita dos prompts.
- 2026-03-31 - Decisão: tratar a ausência dos traces/referências históricas no projeto irmão como descoberta operacional, não como blocker.
  - Motivo: o ticket e o estado atual do repositório já são suficientes para planejar as superfícies remanescentes com segurança.
  - Impacto: o plano registra explicitamente essa limitação e evita depender de reconstrução manual de artefatos que não estão mais acessíveis.
- 2026-03-31 - Decisão: modelar a dependência do checklist compartilhado em `target_prepare` como `workflowCompleteDependencies` explícito no manifesto/relatório e fazer o `target_checkup` validar tanto a declaração quanto a resolubilidade real do caminho canônico.
  - Motivo: isso torna a regra auditável sem reabrir a estratégia já aceita de não copiar `docs/workflows/codex-quality-gates.md` para dentro do projeto alvo.
  - Impacto: `target_prepare` passou a explicar a dependência; `target_checkup` agora acusa `gap` objetivo quando o caminho canônico deixa de resolver o mesmo conteúdo do runner.

## Outcomes & Retrospective
- Status final: implementação e validação concluídas neste repositório; ticket ainda aberto por instrução da etapa.
- O que passou a existir ao final:
  - regra canônica explícita, única e coerente entre contrato, `target_prepare` e `target_checkup` para o checklist compartilhado em projetos externos;
  - `target_prepare` incapaz de afirmar compatibilidade com workflow completo sem também tornar observável a estratégia de acesso ao checklist;
  - `target_checkup` capaz de detectar e relatar objetivamente quando a estratégia canônica está quebrada;
  - cobertura automatizada verde protegendo tanto o alinhamento estrutural novo quanto a regressão já corrigida em `spec-triage`.
- O que fica pendente fora deste plano:
  - qualquer mudança de estratégia que substitua o caminho externo por cópia local do checklist;
  - qualquer refatoração ampla para unificar todas as referências de artefatos do runner em uma camada compartilhada maior do que o necessário;
  - alterações no projeto externo de onde o finding surgiu;
  - fechamento do ticket, commit e push desta etapa.
- Próximos passos:
  - revisar o diff final contra o ticket antes da etapa de fechamento;
  - decidir no fechamento se o ticket pode ir para `fixed` sem follow-up adicional.

## Context and Orientation
- Arquivos e superfícies principais:
  - `tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md` - ticket executor deste plano.
  - `../guiadomus-enrich-amenities/docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md` - spec de origem do finding sistêmico.
  - `execplans/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md` - plano já executado que consolidou a estratégia de placeholder/path canônico nos prompts.
  - `docs/workflows/codex-quality-gates.md` - checklist compartilhado canônico cuja acessibilidade em projeto externo precisa ficar explícita e auditável.
  - `docs/workflows/target-project-compatibility-contract.md` - contrato documental que hoje ainda não declara a mesma estratégia dos prompts.
  - `src/integrations/codex-client.ts` e `src/integrations/codex-client.test.ts` - referência viva do comportamento já corrigido para `spec-triage` em projeto externo; usar como guardrail.
  - `src/types/target-prepare.ts`, `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts` - superfícies onde hoje a compatibilidade com workflow completo é marcada sem tornar a estratégia do checklist observável.
  - `src/types/target-checkup.ts`, `src/core/target-checkup.ts`, `src/core/target-checkup.test.ts` - superfícies onde o readiness audit precisa validar a mesma estratégia.
  - `src/core/runner.ts` - já conhece o hint `../codex-flow-runner/docs/workflows/codex-quality-gates.md`; tocar apenas se isso ajudar a reduzir drift textual/estrutural.
- Spec de origem:
  - `../guiadomus-enrich-amenities/docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md`
- RFs/CAs cobertos por este plano:
  - `CA-01`
  - `RF-07`
  - Observação: estes refs vêm da retrospectiva da spec de origem e servem como rastreabilidade do finding. O aceite deste plano deriva exclusivamente dos closure criteria do ticket sistêmico, conforme exigido pelo próprio ticket.
- Assumptions / defaults adotados:
  - a estratégia canônica vigente para projeto externo é resolver o checklist compartilhado por `../codex-flow-runner/docs/workflows/codex-quality-gates.md`;
  - `codex-flow-runner` e os projetos alvo continuam como diretórios irmãos dentro de `PROJECTS_ROOT_PATH`, de modo que o caminho canônico acima é determinístico;
  - o projeto alvo não precisa manter uma cópia local de `docs/workflows/codex-quality-gates.md` se a estratégia externa estiver explicitada e validada de forma observável;
  - `target_prepare` e `target_checkup` devem permanecer pré-requisitos/garantias operacionais do onboarding, não um “preflight semântico” amplo do workflow em runtime;
  - as referências históricas ausentes do projeto irmão não invalidam o ticket, porque o estado atual de código e a spec de origem já mostram o delta remanescente com clareza.
- RNFs e restrições técnicas/documentais herdados relevantes:
  - o checklist compartilhado em `docs/workflows/codex-quality-gates.md` continua sendo a referência canônica para triagem, planejamento, execução e auditoria;
  - projetos externos compatíveis com o workflow completo precisam ter acesso determinístico a todas as superfícies documentais exigidas pelos prompts operacionais;
  - o workflow permanece sequencial; este ticket não abre espaço para paralelização de tickets ou de validações.

## Plan of Work
- Milestone 1: explicitar a regra canônica no contrato de compatibilidade.
  - Entregável: `docs/workflows/target-project-compatibility-contract.md` atualizado para declarar que, em projeto externo, o checklist compartilhado do workflow é resolvido via repositório irmão `../codex-flow-runner`, sem depender de uma cópia local implícita.
  - Evidência de conclusão: leitura do contrato mostra a mesma estratégia usada hoje pelo builder de prompts e deixa claro o que significa “compatível com workflow completo” nesse ponto.
  - Arquivos esperados: `docs/workflows/target-project-compatibility-contract.md`.
- Milestone 2: tornar o `target_prepare` auditável sobre essa dependência.
  - Entregável: manifesto, relatório e/ou resumo do `target_prepare` passam a explicitar por qual caminho o checklist compartilhado fica resolvível quando o alvo é marcado como compatível com o workflow completo.
  - Evidência de conclusão: os testes de `target_prepare` observam a regra explicitamente nos artefatos gerados e falham se o prepare continuar afirmando compatibilidade sem essa pista verificável.
  - Arquivos esperados: `src/types/target-prepare.ts`, `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts`.
- Milestone 3: fazer o `target_checkup` validar a mesma estratégia.
  - Entregável: o readiness audit passa a registrar `ok` quando o checklist compartilhado está resolvível pela estratégia canônica e `gap` quando não está, na mesma linguagem de contrato usada pelo prepare.
  - Evidência de conclusão: os testes de `target_checkup` cobrem tanto o caso saudável quanto a quebra objetiva da resolubilidade do checklist.
  - Arquivos esperados: `src/types/target-checkup.ts`, `src/core/target-checkup.ts`, `src/core/target-checkup.test.ts`.
- Milestone 4: revalidar fronteiras e evitar regressão na camada já corrigida.
  - Entregável: a correção já existente para `spec-triage` e demais prompts permanece verde e o diff final fica restrito às superfícies estruturais planejadas, salvo helper mínimo compartilhado.
  - Evidência de conclusão: testes direcionados passam e o diff final não reabre changeset desnecessário em `prompts/` ou na camada de prompt builder.
  - Arquivos esperados: `src/integrations/codex-client.test.ts` sem regressões; `src/core/runner.ts` e `src/core/runner.test.ts` somente se um helper/constante compartilhada for realmente necessário.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md` para reler o ticket e confirmar os closure criteria que governam o aceite.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' execplans/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md` e `rg -n "WORKFLOW_QUALITY_GATES_PATH|codex-quality-gates" src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/core/runner.ts prompts` para fixar a estratégia já vigente na camada de prompts/runner.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `docs/workflows/target-project-compatibility-contract.md` para declarar explicitamente que, em projeto externo compatível com o workflow completo, o checklist compartilhado é resolvido pelo repositório irmão `../codex-flow-runner/docs/workflows/codex-quality-gates.md`, e não por uma superfície local implícita do target.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/target-prepare.ts` para modelar a dependência/estratégia canônica do checklist compartilhado de forma reutilizável pelo prepare, sem adicioná-lo à lista de cópias exatas do target por padrão.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/target-prepare.ts` e `src/core/target-prepare.test.ts` para tornar observável, em manifesto/relatório/resumo e em cobertura automatizada, por que o target preparado pode ser marcado como compatível com o workflow completo sob a estratégia canônica escolhida.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/target-checkup.ts`, `src/core/target-checkup.ts` e `src/core/target-checkup.test.ts` para validar a mesma estratégia do checklist compartilhado e emitir evidência/gap quando ela não estiver resolvível.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a duplicação de strings/regras entre `runner`, `prepare`, `checkup` e `codex-client` continuar arriscando drift, extrair com `apply_patch` um helper mínimo compartilhado e atualizar apenas os consumidores necessários, preservando o comportamento atual dos prompts.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/codex-client.test.ts` para validar a estratégia estrutural e o guardrail da regressão já corrigida nos prompts.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` como sanity check de integridade tipada após a mudança estrutural.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- docs/workflows/target-project-compatibility-contract.md src/types/target-prepare.ts src/core/target-prepare.ts src/core/target-prepare.test.ts src/types/target-checkup.ts src/core/target-checkup.ts src/core/target-checkup.test.ts src/core/runner.ts src/core/runner.test.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts` para auditar o escopo final e confirmar que a camada de prompts não foi reaberta sem necessidade.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisito: closure criterion “`target_checkup` e o contrato de compatibilidade passam a validar exatamente a mesma estratégia escolhida, sem marcar o target como workflow-complete com checklist inacessível.” Refs de origem contextual: `CA-01`, `RF-07`.
  - Evidência observável: o contrato documental descreve a mesma estratégia canônica implementada pelo prepare/checkup, e a suite comprova que o checklist compartilhado fica `ok` quando resolvível e vira `gap` quando essa resolubilidade é quebrada.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/core/target-checkup.test.ts`
  - Esperado: os testes cobrem o caso saudável e o caso quebrado; nenhum artefato/resultado continua afirmando compatibilidade com workflow completo de forma implícita.
  - Comando: `rg -n "codex-quality-gates|../codex-flow-runner|workflow completo" docs/workflows/target-project-compatibility-contract.md src/types/target-prepare.ts src/core/target-prepare.ts src/types/target-checkup.ts src/core/target-checkup.ts`
  - Esperado: as superfícies documentais/estruturais convergem para a mesma regra canônica e não exigem uma cópia local tácita do checklist.
- Matriz requisito -> validação observável:
  - Requisito: closure criterion “`target_prepare` passa a propagar `docs/workflows/codex-quality-gates.md` para o projeto externo ou o runner/prompt passa a injetar a referência externa correta de forma determinística.”
  - Evidência observável: a estratégia escolhida permanece sendo a referência externa determinística já coberta no prompt builder, e o `target_prepare` passa a refletir explicitamente essa mesma regra em seus artefatos.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts src/core/target-prepare.test.ts`
  - Esperado: `src/integrations/codex-client.test.ts` continua exigindo `../codex-flow-runner/docs/workflows/codex-quality-gates.md` em projeto externo, e `src/core/target-prepare.test.ts` mostra que o prepare não depende de cópia local para explicar a compatibilidade.
- Matriz requisito -> validação observável:
  - Requisito: closure criterion “Prompts que hoje referenciam `docs/workflows/codex-quality-gates.md` deixam de depender de um caminho inexistente em projeto externo.”
  - Evidência observável: os templates continuam usando o placeholder compartilhado e a resolução no contexto externo continua coberta por teste de regressão.
  - Comando: `rg -n "<WORKFLOW_QUALITY_GATES_PATH>" prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - Esperado: todas as superfícies de prompt afetadas continuam apontando para o placeholder comum, sem reintroduzir o literal antigo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts`
  - Esperado: os testes de prompt para projeto externo permanecem verdes e falham se o caminho não qualificado voltar a aparecer.
- Matriz requisito -> validação observável:
  - Requisito: closure criterion “Testes cobrindo projeto externo preparado + prompt de `spec-triage` confirmam que o checklist compartilhado fica resolvível antes da derivação de tickets.”
  - Evidência observável: a suíte conjunta cobre o projeto externo preparado/readiness e a resolução do checklist em `spec-triage`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/core/target-checkup.test.ts src/integrations/codex-client.test.ts`
  - Esperado: há cobertura verde para o target preparado/readiness e para `spec-triage`, todos ancorados na mesma estratégia canônica do checklist compartilhado.
- Matriz requisito -> validação observável:
  - Requisito: closure criterion “O fechamento deste ticket deixa explícita a regra canônica para projetos externos, sem depender de inferência sobre como os demais prompts consumidores do checklist serão atualizados em lote.”
  - Evidência observável: a regra final fica explícita em `docs/workflows/target-project-compatibility-contract.md`, nos artefatos do prepare/checkup e no diff final, sem abrir dependência implícita em rollout futuro.
  - Comando: `sed -n '1,220p' docs/workflows/target-project-compatibility-contract.md`
  - Esperado: o documento deixa a regra canônica explícita por si só, em linguagem suficiente para outra IA ou operador seguir sem memória oral adicional.
  - Comando: `git diff -- docs/workflows/target-project-compatibility-contract.md src/types/target-prepare.ts src/core/target-prepare.ts src/core/target-prepare.test.ts src/types/target-checkup.ts src/core/target-checkup.ts src/core/target-checkup.test.ts src/core/runner.ts src/core/runner.test.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts`
  - Esperado: o changeset final fica restrito às superfícies que tornam a regra canônica explícita e auditável, mantendo a camada de prompts apenas como guardrail ou helper mínimo compartilhado, se necessário.

## Idempotence and Recovery
- Idempotência:
  - rerodar `target_prepare` sobre o mesmo target deve continuar produzindo a mesma explicação observável para a compatibilidade com workflow completo, sem criar cópias locais duplicadas do checklist compartilhado;
  - rerodar `target_checkup` sobre o mesmo snapshot deve repetir a mesma evidência/gap para a resolubilidade do checklist, sem depender de estado oculto;
  - rerodar a edição documental do contrato deve convergir para uma única regra explícita, não para múltiplas formulações concorrentes.
- Riscos:
  - reintroduzir drift entre contrato, prepare, checkup, runner e prompt builder, cada um descrevendo o checklist compartilhado de um jeito diferente;
  - manter `compatibleWithWorkflowComplete: true` sem prova auditável suficiente, apenas trocando o texto do relatório;
  - “corrigir” o problema criando uma cópia local do checklist e, com isso, reabrir desnecessariamente a decisão já tomada nos prompts;
  - usar testes que só validem strings estáticas, sem provar o comportamento observável desejado em projeto externo.
- Recovery / Rollback:
  - se a implementação sugerir voltar a copiar `docs/workflows/codex-quality-gates.md` para o target, pausar e confrontar essa necessidade com o ExecPlan já executado em `execplans/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md` antes de ampliar escopo silenciosamente;
  - se a regra exigir um helper compartilhado novo, preferir extração mínima e aditiva, preservando o comportamento público existente e atualizando os testes no mesmo changeset;
  - se a ausência dos traces históricos impedir algum detalhe de wording, usar o ticket aberto e o estado atual do repositório como fonte de verdade e registrar a limitação em `Surprises & Discoveries`, em vez de inventar contexto;
  - se a estratégia externa se mostrar insuficiente para um cenário real não coberto, parar com blocker explícito e abrir follow-up, em vez de misturar uma mudança de estratégia maior neste ticket.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md`
- Spec de origem:
  - `../guiadomus-enrich-amenities/docs/specs/2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia.md`
- ExecPlan relacionado já executado, usado para delimitar a fronteira de escopo:
  - `execplans/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md`
- Referências consultadas no planejamento:
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `INTERNAL_TICKETS.md`
  - `SPECS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/02-criar-execplan-para-ticket.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/core/runner.ts`
  - `src/types/target-prepare.ts`
  - `src/core/target-prepare.ts`
  - `src/core/target-prepare.test.ts`
  - `src/types/target-checkup.ts`
  - `src/core/target-checkup.ts`
  - `src/core/target-checkup.test.ts`
- Limitação observada durante o planejamento:
  - os caminhos de traces (`request/response/decision`) e os `tickets/open/` do projeto irmão citados no ticket não estavam mais acessíveis no filesystem; o plano foi ancorado no ticket, na spec de origem, no estado atual do runner e no ExecPlan já entregue para a parte de prompts.
- Checklist aplicado (`docs/workflows/codex-quality-gates.md`):
  - ticket inteiro e referências estruturais relevantes relidos antes de planejar;
  - spec de origem, RFs/CAs contextualizados, assumptions/defaults e restrições documentais explicitados;
  - closure criteria traduzidos em matriz `requisito -> validação observável`;
  - riscos residuais e fronteiras de escopo declarados antes da execução.

## Interfaces and Dependencies
- Interfaces alteradas ou adicionadas:
  - contrato documental de compatibilidade do projeto alvo em `docs/workflows/target-project-compatibility-contract.md`;
  - contrato estrutural do `target_prepare` para manifesto/relatório/resumo quando marca `compatibleWithWorkflowComplete`;
  - evidências/regras do `target_checkup` para validar a resolubilidade do checklist compartilhado em projeto externo;
  - helper/constante compartilhada apenas se ela for a forma mínima de manter `runner`, `prepare`, `checkup` e `codex-client` sem drift.
- Compatibilidade:
  - preservar a estratégia já corrigida em `src/integrations/codex-client.ts` para projetos externos;
  - preservar a convenção operacional de repositórios irmãos (`../codex-flow-runner`);
  - não alterar o contrato canônico `spec -> tickets` e `ticket -> execplan`;
  - manter compatibilidade do projeto alvo como pré-requisito operacional do onboarding, não como prova semântica ampla em runtime.
- Dependências externas e operacionais:
  - o repositório `codex-flow-runner` precisa continuar acessível como diretório irmão do projeto alvo;
  - os testes dependem do runtime Node do host e, por isso, devem usar sempre o prefixo `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`;
  - nenhuma dependência npm nova é esperada para este ticket.
