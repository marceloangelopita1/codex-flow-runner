# ExecPlan - qualificar referencias canonicas do checklist do workflow em prompts para projetos externos

## Purpose / Big Picture
- Objetivo: fazer com que os prompts operacionais executados com `cwd` em projeto externo referenciem o checklist compartilhado do workflow por um caminho canonicamente resolvivel, em vez de depender de `docs/workflows/codex-quality-gates.md` dentro do repo alvo.
- Resultado esperado:
  - os prompts afetados do fluxo `spec -> tickets -> execplan -> implementacao -> fechamento -> auditoria/retrospectiva` passam a apontar para `../codex-flow-runner/docs/workflows/codex-quality-gates.md` quando o projeto ativo for externo, ou para contexto equivalente resolvido deterministicamente pelo builder;
  - `src/integrations/codex-client.ts` passa a resolver esse contexto para as familias de prompt de spec e ticket antes de gravar `promptText`;
  - `src/integrations/codex-client.test.ts` passa a falhar se um prompt de projeto externo voltar a emitir o caminho nao qualificado do checklist;
  - o escopo estrutural de `target_prepare`, `target_checkup` e `docs/workflows/target-project-compatibility-contract.md` permanece rastreado no ticket irmao de 2026-03-28, sem mistura de changeset.
- Escopo:
  - atualizar os prompts que hoje consomem o checklist compartilhado por literal nao qualificado: `prompts/01`, `02`, `03`, `04`, `08`, `11` e `12`;
  - atualizar o builder de prompts em `src/integrations/codex-client.ts` para resolver a referencia canonica do checklist conforme o contexto do repo;
  - adicionar cobertura automatizada para pelo menos `spec-triage` em projeto externo e para uma etapa da familia de ticket que consome o mesmo checklist.
- Fora de escopo:
  - copiar o checklist para projetos externos via `target_prepare`;
  - passar a exigir o checklist no `target_checkup`;
  - alterar `docs/workflows/target-project-compatibility-contract.md`;
  - fechar ticket, commitar ou publicar o changeset.

## Progress
- [x] 2026-03-31 00:36Z - Ticket alvo, spec de origem, checklist compartilhado, prompts afetados, traces e superficies de codigo/teste relidos; planejamento inicial concluido.
- [x] 2026-03-31 00:47Z - Estrategia canonica de resolucao do checklist aplicada nas familias de prompt de spec e ticket via placeholder `<WORKFLOW_QUALITY_GATES_PATH>` resolvido em `src/integrations/codex-client.ts`.
- [x] 2026-03-31 00:47Z - Cobertura automatizada para projeto externo adicionada e verde em `src/integrations/codex-client.test.ts`, cobrindo `runSpecStage("spec-triage")` e `runStage("implement")`.
- [x] 2026-03-31 00:47Z - Matriz de validacao observavel executada; `rg` confirmou migracao/ausencia do literal antigo, `npx tsx --test src/integrations/codex-client.test.ts` passou com 43 testes verdes, `npm run check` passou com `tsc --noEmit`, e o diff final permaneceu restrito a prompts + `codex-client`.
- [x] 2026-03-31 00:51Z - Revalidacao de fechamento concluida com `GO`; ticket movido para `tickets/closed/` com evidencias por criterio e sem follow-up.

## Surprises & Discoveries
- 2026-03-31 00:36Z - `src/core/runner.ts` ja sabe descrever `../codex-flow-runner` e lista `../codex-flow-runner/docs/workflows/codex-quality-gates.md` como artefato canonico para projeto externo, mas esse contexto nao e injetado nos builders `buildSpecPrompt` e `buildTicketPrompt`.
- 2026-03-31 00:36Z - `src/types/target-prepare.ts` e `src/types/target-checkup.ts` ainda nao propagam/validam o checklist compartilhado; o ticket aberto em `tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md` ja fixa essa fronteira como dono do alinhamento estrutural.
- 2026-03-31 00:36Z - `src/integrations/codex-client.test.ts` ja cobre substituicao de placeholders de spec, ticket e diretoria de plano, mas ainda nao protege a resolucao do checklist compartilhado em contexto externo.
- 2026-03-31 00:47Z - A remediacao coube inteira em `prompts/` + `CodexCliTicketFlowClient`; nao foi necessario tocar `src/core/runner.ts`, porque o builder ja tem `repoPath` suficiente para decidir entre caminho local e contrato canonico `../codex-flow-runner/...`.
- 2026-03-31 00:47Z - `npm run check` neste repositorio permanece reduzido a `tsc --noEmit`, entao a prova tecnica final deste ticket dependeu da combinacao entre a regressao dedicada em `tsx --test` e a auditoria textual dos prompts.

## Decision Log
- 2026-03-31 - Decisao: resolver o checklist compartilhado por placeholder/contexto no builder de prompts, em vez de hardcode repetido ou dependencia de onboarding.
  - Motivo: o closure criterion pede que o prompt gravado em projeto externo ja nasca com referencia resolvivel ao checklist, sem fallback manual posterior.
  - Impacto: os prompts afetados devem migrar para um placeholder comum e `src/integrations/codex-client.ts` deve centralizar a resolucao.
- 2026-03-31 - Decisao: manter `target_prepare`, `target_checkup` e `docs/workflows/target-project-compatibility-contract.md` fora deste changeset.
  - Motivo: esse alinhamento estrutural tem ticket proprio e ja foi explicitado como boundary no ticket executor.
  - Impacto: a validacao final precisa provar que o diff ficou restrito a prompts, builder de prompt e testes.
- 2026-03-31 - Decisao: para repositorio externo, emitir explicitamente `../codex-flow-runner/docs/workflows/codex-quality-gates.md` em vez de calcular um `path.relative(...)` generico a partir do filesystem real.
  - Motivo: o contrato operacional do workflow assume repositorios irmaos e o closure criterion exige um caminho canonico/estavel no `promptText`, inclusive em testes com `repoPath` temporario.
  - Impacto: a resolucao em `CodexCliTicketFlowClient` ficou deterministica e aderente ao contrato documentado do workflow, sem depender do layout fisico usado pela suite.
- 2026-03-31 - Decisao: fechar o ticket como `fixed` sem follow-up.
  - Motivo: a revalidacao final confirmou todos os closure criteria do ticket por evidencia automatizada/textual, sem gap tecnico remanescente e sem dependencia de validacao manual externa.
  - Impacto: o changeset fica pronto para um unico commit/push posterior do runner, incluindo `execplan` e ticket fechado no mesmo pacote.

## Outcomes & Retrospective
- Status final: implementacao, validacao e fechamento tecnico do ticket concluidos com `GO`; pendente apenas do versionamento pelo runner.
- O que deve existir ao final:
  - prompts externos que exigem o checklist deixam de depender de `docs/workflows/codex-quality-gates.md` relativo ao repo alvo;
  - `runSpecStage` e `runStage` passam a gravar `promptText` com a referencia canonica correta para projeto externo;
  - existe teste deterministico que falha se `spec-triage` ou a familia de ticket regressarem para o caminho nao qualificado;
  - o diff deixa explicito que o alinhamento estrutural de onboarding/checkup continua no ticket de 2026-03-28.
- O que fica pendente apos este plano:
  - propagacao/validacao estrutural do checklist no onboarding de projetos externos, rastreada em `tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md`.
- Proximos passos:
  - runner versionar o mesmo changeset de fechamento preparado nesta etapa;
  - manter a evolucao estrutural de onboarding/checkup no ticket irmao de 2026-03-28, fora deste pacote.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md` - ticket executor deste plano.
  - `../caixa-crawler-v2/docs/specs/2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md` - spec de origem do finding sistemico.
  - `docs/workflows/codex-quality-gates.md` - checklist canonico compartilhado que hoje fica inacessivel por path relativo em projeto externo.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/08-auditar-spec-apos-run-all.md`, `prompts/11-retrospectiva-workflow-apos-spec-audit.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` - familia de prompt de spec que roda com `buildSpecPrompt`.
  - `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md`, `prompts/04-encerrar-ticket-commit-push.md` - familia de prompt de ticket que roda com `buildTicketPrompt`.
  - `src/integrations/codex-client.ts` - builder das familias de prompt que precisa resolver a referencia canonica do checklist.
  - `src/integrations/codex-client.test.ts` - cobertura automatizada para prompt building, inclusive contextos de repo externo.
  - `src/core/runner.ts` - referencia existente de como o runner descreve o contexto `../codex-flow-runner` para projeto externo; tocar apenas se a reutilizacao for estritamente necessaria.
  - `src/types/target-prepare.ts`, `src/types/target-checkup.ts`, `docs/workflows/target-project-compatibility-contract.md` - superficies explicitamente fora de escopo e usadas como guardrail de diff.
- Spec de origem:
  - `../caixa-crawler-v2/docs/specs/2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md`
- RFs/CAs cobertos por este plano:
  - `CA-05`
  - `CA-08`
  - `CA-09`
  - `RF-09`
  - `RF-10`
  - `RF-42`
  - `RF-43`
  - `RF-45`
- Assumptions / defaults adotados:
  - em projeto externo compativel com o workflow completo, `codex-flow-runner` continua disponivel como diretorio irmao em `../codex-flow-runner`;
  - o checklist compartilhado continua sendo `docs/workflows/codex-quality-gates.md` quando o prompt roda dentro do proprio `codex-flow-runner` e `../codex-flow-runner/docs/workflows/codex-quality-gates.md` quando o `cwd` e um projeto externo;
  - a referencia canonica precisa aparecer no `promptText` gravado, nao apenas em memoria do agente ou em fallback descrito depois da execucao;
  - a menor prova util para aceite e um teste deterministico no `CodexCliTicketFlowClient`, nao uma rodada end-to-end completa em projeto externo real;
  - o rollout deste ticket fica limitado aos prompts que realmente consomem o checklist segundo o finding aberto no ticket.
- Inherited RNFs e restricoes tecnicas/documentais relevantes:
  - o fluxo continua estritamente sequencial;
  - as etapas de spec executam o Codex com `cwd` no repositorio alvo, entao o path do checklist precisa ser resolvido antes da execucao;
  - o changeset nao deve depender de migracao retroativa de traces historicos;
  - este ticket pode fechar sem alterar `target_prepare`, `target_checkup` ou o contrato de compatibilidade, desde que a estrategia adotada permaneca coerente com o ticket estrutural de 2026-03-28.
- Fluxo atual relevante:
  - `runSpecStage()` constroi prompts de spec em `src/integrations/codex-client.ts` e executa o Codex com `cwd: this.repoPath`, que em projeto externo aponta para o repo alvo;
  - `runStage("plan" | "implement" | "close-and-version")` usa `buildTicketPrompt()`, que hoje tambem nao injeta nenhum contexto adicional sobre o workflow repo;
  - os templates atuais dos prompts carregam literalmente `docs/workflows/codex-quality-gates.md`;
  - traces em projetos externos mostram o agente registrando fallback manual para `../codex-flow-runner/...` depois do fato, sinal de que o prompt gravado saiu sem o contexto correto.
- Restricoes tecnicas:
  - usar apenas os scripts e comandos suportados pelo repo (`npx tsx --test`, `npm run check`);
  - manter o worktree limpo de alteracoes fora do escopo do ticket;
  - preferir um helper central de resolucao para evitar drift entre as familias de prompt.

## Plan of Work
- Milestone 1: centralizar a referencia canonica do checklist no contrato de prompt.
  - Entregavel: os templates `01`, `02`, `03`, `04`, `08`, `11` e `12` deixam de hardcodar `docs/workflows/codex-quality-gates.md` e passam a usar um placeholder ou marcador resolvido no builder.
  - Evidencia de conclusao: leitura dos templates mostra a migracao consistente do literal para um contrato comum, e `src/integrations/codex-client.ts` passa a substituir esse contrato por path local ou por `../codex-flow-runner/...` conforme o repo.
  - Arquivos esperados: `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md`, `prompts/04-encerrar-ticket-commit-push.md`, `prompts/08-auditar-spec-apos-run-all.md`, `prompts/11-retrospectiva-workflow-apos-spec-audit.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`, `src/integrations/codex-client.ts`.
- Milestone 2: cobrir o comportamento externo com testes de regressao deterministica.
  - Entregavel: `src/integrations/codex-client.test.ts` cobre ao menos `runSpecStage("spec-triage")` com `repoPath` externo e uma etapa da familia de ticket, assertando path qualificado e ausencia do caminho nao qualificado.
  - Evidencia de conclusao: `npx tsx --test src/integrations/codex-client.test.ts` passa verde com asserts especificos para contexto externo.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`.
- Milestone 3: comprovar aceite e fronteira de escopo.
  - Entregavel: a matriz requisito -> validacao observavel fica toda verde e o diff final mostra que o ticket estrutural de onboarding/checkup nao foi absorvido por engano.
  - Evidencia de conclusao: `rg` confirma a migracao dos templates, o teste cobre o prompt externo gravado e `git diff` nao mostra alteracoes em `src/types/target-prepare.ts`, `src/types/target-checkup.ts` ou `docs/workflows/target-project-compatibility-contract.md`.
  - Arquivos esperados: o mesmo conjunto do milestone 1 e 2, sem arquivos extras nas superficies fora de escopo.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' prompts/01-avaliar-spec-e-gerar-tickets.md`, `sed -n '1,220p' prompts/02-criar-execplan-para-ticket.md`, `sed -n '1,220p' prompts/03-executar-execplan-atual.md`, `sed -n '1,220p' prompts/04-encerrar-ticket-commit-push.md`, `sed -n '1,220p' prompts/08-auditar-spec-apos-run-all.md`, `sed -n '1,260p' prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `sed -n '1,260p' prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para reler exatamente onde o checklist compartilhado e exigido.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "codex-quality-gates|buildSpecPrompt|buildTicketPrompt|describeWorkflowRepoContext|../codex-flow-runner" src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/core/runner.ts prompts` para mapear os pontos de substituicao e qualquer helper ja existente.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` os prompts `01`, `02`, `03`, `04`, `08`, `11` e `12` para trocar a referencia literal do checklist por um placeholder compartilhado, preservando o restante do texto operacional.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.ts` para:
   - centralizar a resolucao do placeholder do checklist;
   - aplicar a substituicao tanto em `buildSpecPrompt()` quanto em `buildTicketPrompt()`;
   - usar `docs/workflows/codex-quality-gates.md` no proprio repo e `../codex-flow-runner/docs/workflows/codex-quality-gates.md` em projeto externo, sem tocar `target_prepare`/`target_checkup`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.test.ts` para adicionar a menor prova deterministica suficiente:
   - `runSpecStage("spec-triage")` com `repoPath` externo;
   - pelo menos uma etapa da familia de ticket (`plan`, `implement` ou `close-and-version`) com `repoPath` externo;
   - assertiva positiva para o path qualificado e assertiva negativa para o caminho nao qualificado.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "<WORKFLOW_QUALITY_GATES_PATH>" prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para confirmar que a migracao para o contrato comum ficou completa.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Aplicar( tambem)? o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`|Aplique o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`" prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para verificar que o literal nao qualificado desapareceu dessas superficies.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts` para validar a regressao de projeto externo nas familias de prompt de spec e ticket.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para garantir que a mudanca no builder de prompt nao deixou erro de tipagem ou contrato local quebrado.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/types/target-prepare.ts src/types/target-checkup.ts docs/workflows/target-project-compatibility-contract.md` para auditar o escopo final e confirmar que as superficies do ticket estrutural permaneceram intactas.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: `CA-08`, `CA-09`, `RF-09`, `RF-10` + closure criterion "Em spec-triage de projeto externo, o prompt gravado referencia explicitamente ../codex-flow-runner/docs/workflows/codex-quality-gates.md ou injeta contexto equivalente resolvido pelo runner."
  - Evidencia observavel: `src/integrations/codex-client.test.ts` cobre `runSpecStage("spec-triage")` com `repoPath` externo e valida `result.promptText`/prompt capturado com a referencia canonica qualificada.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: teste verde com assertiva positiva para `../codex-flow-runner/docs/workflows/codex-quality-gates.md` (ou marcador equivalente resolvido) no prompt de `spec-triage`.
- Matriz requisito -> validacao observavel:
  - Requisito: closure criterion "Existe cobertura automatizada que falha se um prompt de projeto externo voltar a emitir o caminho nao qualificado para o checklist."
  - Evidencia observavel: o mesmo arquivo de teste contem assertiva negativa contra `docs/workflows/codex-quality-gates.md` sem qualificacao no contexto externo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: teste verde apenas quando o prompt externo nao contiver o caminho nao qualificado; qualquer regressao futura quebra a suite.
- Matriz requisito -> validacao observavel:
  - Requisito: closure criterion "Ha teste de regressao cobrindo ao menos spec-triage em projeto externo e validando que o prompt final inclui artefatos canonicos qualificados do workflow."
  - Evidencia observavel: `src/integrations/codex-client.test.ts` cobre `spec-triage` externo e pelo menos uma etapa da familia de ticket com o mesmo contrato de resolucao do checklist.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: a suite cita explicitamente os casos de projeto externo para spec e ticket, ambos verdes.
- Matriz requisito -> validacao observavel:
  - Requisito: `CA-05`, `RF-42`, `RF-43`, `RF-45` + closure criterion "Os prompts externos que exigem o checklist compartilhado nao deixam mais o agente depender de docs/workflows/codex-quality-gates.md relativo ao repositorio alvo."
  - Evidencia observavel: os templates afetados usam o placeholder comum e nao mantem o literal nao qualificado do checklist.
  - Comando: `rg -n "<WORKFLOW_QUALITY_GATES_PATH>" prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - Esperado: todas as sete superficies afetadas aparecem na busca, indicando migracao para o contrato comum.
  - Comando: `rg -n "Aplicar( tambem)? o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`|Aplique o checklist compartilhado em \`docs/workflows/codex-quality-gates.md\`" prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - Esperado: nenhum resultado.
- Matriz requisito -> validacao observavel:
  - Requisito: closure criterion "Este ticket pode fechar sem alterar target_prepare, target_checkup ou o contrato de compatibilidade, desde que essas superficies permanecam coerentes com a estrategia canonica rastreada no ticket estrutural de 2026-03-28."
  - Evidencia observavel: o diff final nao contem hunks em `src/types/target-prepare.ts`, `src/types/target-checkup.ts` ou `docs/workflows/target-project-compatibility-contract.md`.
  - Comando: `git diff -- prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md prompts/08-auditar-spec-apos-run-all.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/types/target-prepare.ts src/types/target-checkup.ts docs/workflows/target-project-compatibility-contract.md`
  - Esperado: apenas prompts, `src/integrations/codex-client.ts` e `src/integrations/codex-client.test.ts` aparecem alterados.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a mudanca deve manter um unico placeholder comum nos prompts afetados, sem duplicar instrucoes sobre o checklist;
  - a resolucao do path deve ser deterministica para o mesmo `repoPath`, produzindo sempre `docs/workflows/...` no repo do runner e `../codex-flow-runner/docs/workflows/...` em projeto externo;
  - a suite `src/integrations/codex-client.test.ts` deve continuar reexecutavel sem fixture externa adicional.
- Riscos:
  - qualificar indevidamente o checklist como `../codex-flow-runner/...` mesmo quando o `repoPath` for o proprio `codex-flow-runner`;
  - migracao parcial deixar uma das sete superficies ainda com o literal nao qualificado;
  - duplicar a logica de resolucao entre `buildSpecPrompt()` e `buildTicketPrompt()`, reabrindo drift futuro;
  - invadir por engano o escopo do ticket estrutural e tocar `target_prepare`, `target_checkup` ou o contrato de compatibilidade.
- Recovery / Rollback:
  - manter a resolucao em helper unico no builder e reaproveita-lo nas duas familias de prompt;
  - se a substituicao por placeholder gerar ambiguidades, cair para um bloco de contexto explicitamente resolvido no builder, mas ainda com cobertura automatizada e sem reintroduzir o literal nao qualificado;
  - se a implementacao pedir mudanca estrutural em onboarding/checkup para funcionar, parar e registrar blocker apontando para o ticket de 2026-03-28 em vez de ampliar este changeset;
  - se uma etapa da familia de ticket nao puder ser coberta sem excesso de mocking, priorizar `spec-triage` como prova minima e documentar objetivamente a limitacao antes de prosseguir.

## Artifacts and Notes
- Ticket executor:
  - `tickets/closed/2026-03-27-workflow-improvement-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-cb4850ca.md`
- Spec de origem:
  - `../caixa-crawler-v2/docs/specs/2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia.md`
- Ticket estrutural relacionado, fora de escopo deste plano:
  - `tickets/open/2026-03-28-workflow-improvement-2026-03-28-catalogo-operacional-local-da-function-enrich-amenities-por-ia-1c25bf37.md`
- Traces e evidencias consultadas no planejamento:
  - `../caixa-crawler-v2/.codex-flow-runner/flow-traces/requests/20260328t050710z-run-specs-spec-spec-workflow-retrospective-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-request.md`
  - `../caixa-crawler-v2/.codex-flow-runner/flow-traces/responses/20260328t050710z-run-specs-spec-spec-workflow-retrospective-2026-03-27-base-operacional-local-de-rodadas-da-function-por-ia-response.md`
- Referencias principais do planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/02-criar-execplan-para-ticket.md`
  - `prompts/03-executar-execplan-atual.md`
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `prompts/08-auditar-spec-apos-run-all.md`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
- Observacao operacional:
  - o worktree de `codex-flow-runner` estava limpo no momento do planejamento (`git status --short` sem saida), entao qualquer diff futuro desta tarefa deve ser facilmente auditavel contra o escopo declarado.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato textual dos prompts `01`, `02`, `03`, `04`, `08`, `11` e `12`, que passam a depender de um placeholder comum para o checklist compartilhado;
  - interface interna de `src/integrations/codex-client.ts` para resolucao do checklist compartilhado em builders de spec e ticket;
  - cobertura automatizada de `src/integrations/codex-client.test.ts` para contexto de projeto externo.
- Compatibilidade:
  - preservar o comportamento atual dos prompts quando o repo ativo for o proprio `codex-flow-runner`;
  - preservar a convencao de projetos irmaos em `../codex-flow-runner` para contexto externo;
  - nao alterar o contrato `spec -> tickets` e `ticket -> execplan`;
  - nao introduzir dependencia nova de pacote ou de configuracao externa.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova e esperada;
  - a suite `tsx --test` existente deve ser suficiente para a prova de regressao;
  - o plano depende apenas da convencao operacional de diretorios irmaos ja declarada em `AGENTS.md` e herdada pelo ticket.
