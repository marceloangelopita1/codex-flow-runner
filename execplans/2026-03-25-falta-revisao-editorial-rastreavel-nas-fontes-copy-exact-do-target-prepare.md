# ExecPlan - Revisao editorial rastreavel das fontes copy-exact do `/target_prepare`

## Purpose / Big Picture
- Objetivo: revisar editorialmente, com rastreabilidade explicita, as oito fontes `copy-exact` propagadas por `/target_prepare`, corrigindo portugues/acentuacao e inconsistencias redacionais minimas sem alterar inventario, paths canonicos, headings canonicos nem o contrato operacional atual.
- Resultado esperado:
  - todas as superficies listadas em `TARGET_PREPARE_EXACT_COPY_SOURCES` ficam explicitamente classificadas na trilha da mudanca como `revisadas` ou `revalidadas`;
  - os arquivos que ainda propagam erro editorial deixam de espalhar perda de acentuacao e wording inconsistente para projetos alvo;
  - o inventario tecnico de `copy-exact` continua com as mesmas oito superficies;
  - um smoke manual de `/target_prepare` em repositorio descartavel comprova que o alvo recebe as versoes corrigidas e que os blocos gerenciados de `AGENTS.md` e `README.md` seguem legiveis.
- Escopo:
  - `EXTERNAL_PROMPTS.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `SPECS.md`
  - `docs/specs/README.md`
  - `docs/specs/templates/spec-template.md`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - rastreabilidade final na spec de origem e no proprio ticket, quando a execucao for concluida.
- Fora de escopo:
  - editar `docs/workflows/target-prepare-managed-agents-section.md` ou `docs/workflows/target-prepare-managed-readme-section.md`;
  - alterar `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts`, `docs/workflows/target-prepare-report.md` ou `docs/workflows/target-prepare-manifest.json`, que pertencem ao ticket irmao `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md` ou a outras garantias ja existentes;
  - renomear `targetPath`, `sourceRelativePath`, markers, paths canonicos, `contractVersion` ou `prepareSchemaVersion`;
  - promover revisao editorial ampla de historico fora das superficies efetivamente propagadas por `copy-exact`.

## Progress
- [x] 2026-03-25 17:01Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `DOCUMENTATION.md`, de `src/types/target-prepare.ts`, das superficies `copy-exact`, das fontes de blocos gerenciados e do ticket irmao do relatorio humano.
- [x] 2026-03-25 17:07Z - Baseline do inventario `copy-exact` e classificacao por superficie (`editar` vs `revalidar sem mudanca`) registrados neste plano e na trilha documental da execucao.
- [x] 2026-03-25 17:15Z - Revisao editorial minima aplicada ao conjunto `copy-exact`, preservando headings, paths e sentido operacional.
- [x] 2026-03-25 17:20Z - Validacao textual completa, teste automatizado focado e smoke manual/equivalente de `/target_prepare` concluidos com evidencia observavel.
- [x] 2026-03-25 17:25Z - Spec de origem e este ExecPlan atualizados com evidencias; pacote `copy-exact` permaneceu pronto para fechamento sem commit/push local nesta etapa.
- [x] 2026-03-25 17:27Z - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; ticket fechado em `GO` e movido para `tickets/closed/`, deixando o repositorio pronto para versionamento posterior pelo runner.

## Surprises & Discoveries
- 2026-03-25 17:01Z - `docs/specs/README.md` faz parte de `TARGET_PREPARE_EXACT_COPY_SOURCES`, mas ainda descreve o contrato antigo em que uma spec pode originar `execplan` diretamente; durante a execucao, tratar essa divergencia como ajuste minimo de coerencia apenas se couber em rewording pequeno e seguro, sem transformar este ticket em limpeza semantica ampla.
- 2026-03-25 17:01Z - As fontes de blocos gerenciados (`docs/workflows/target-prepare-managed-agents-section.md` e `docs/workflows/target-prepare-managed-readme-section.md`) ja estao editorialmente coerentes e ficam fora do pacote de edicao, mas continuam parte obrigatoria do smoke manual herdado do ticket.
- 2026-03-25 17:01Z - `src/core/target-prepare.test.ts` ja exercita sincronizacao de `copy-exact`, merge gerenciado e artefatos canonicos do prepare; para este ticket documental, essa suite focada e a automacao mais aderente aos closure criteria.
- 2026-03-25 17:07Z - Classificacao final por superficie: `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`, `docs/specs/README.md`, `docs/specs/templates/spec-template.md` e `docs/workflows/discover-spec.md` exigiram edicao; `docs/workflows/target-project-compatibility-contract.md` foi revalidado sem diff.
- 2026-03-25 17:11Z - O template de spec continua sujeito a headings literais consumidos pelo workflow/testes (`## Nao-escopo`, `## Criterios de aceitacao (observaveis)`, `## Gate de validacao dos tickets derivados`, `## Validacoes pendentes ou manuais`); por isso o pacote corrigiu o corpo editorial, mas preservou esses headings canonicos sem acentuacao.
- 2026-03-25 17:20Z - O shell desta etapa nao consegue acionar Telegram diretamente, mas `ControlledTargetPrepareExecutor.execute()` e o backend real de `/target_prepare`; o smoke foi executado por esse executor com `CodexCliTicketFlowClient`, guard de Git e versionamento reais, preservando a validacao end-to-end do fluxo.

## Decision Log
- 2026-03-25 - Decisao: usar `src/types/target-prepare.ts` como source of truth do escopo e exigir cobertura explicita das mesmas oito superficies listadas em `TARGET_PREPARE_EXACT_COPY_SOURCES`.
  - Motivo: os closure criteria pedem que nenhuma superficie `copy-exact` relevante fique de fora e que o inventario permaneça estavel.
  - Impacto: o pacote fica auditavel, com validacao objetiva por inventario e por diff.
- 2026-03-25 - Decisao: limitar as edicoes a correcoes editoriais minimas e a pequenos ajustes de coerencia estritamente necessarios para manter o texto alinhado ao contrato canonico vigente.
  - Motivo: RF-06/RF-07 exigem portugues correto sem drift semantico; este ticket nao deve virar reforma geral de workflow.
  - Impacto: se uma superficie exigir mudanca semanticamente mais ampla do que um ajuste pequeno e seguro, registrar blocker ou follow-up em vez de expandir o escopo silenciosamente.
- 2026-03-25 - Decisao: tratar o ticket irmao do relatorio humano como boundary firme para qualquer mudanca de codigo, teste ou wording gerado pelo runner.
  - Motivo: o backlog derivado da spec ja separou o lote `copy-exact` do lote `runner-generated` por risco e superficie.
  - Impacto: `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts` e `docs/workflows/target-prepare-report.md` entram apenas como referencias de validacao/boundary neste plano.
- 2026-03-25 - Decisao: usar revisao textual completa, `git diff` focado, `npm test -- src/core/target-prepare.test.ts` e smoke manual com `cmp` entre runner e repo alvo como prova principal de aceite.
  - Motivo: isso traduz diretamente os closure criteria do ticket em evidencias observaveis, sem depender de checklist generico de build/lint.
  - Impacto: a matriz de validacao fica aderente ao problema real de propagacao `copy-exact`.
- 2026-03-25 - Decisao: preservar sem acentuacao os headings canonicos do template de spec que o workflow consome literalmente.
  - Motivo: o ticket exige manter headings canonicos, e `src/core/runner.test.ts` cobre esses nomes de secao em forma literal.
  - Impacto: o pacote melhora portugues e coerencia do template sem introduzir regressao de parsing ou drift contratual.
- 2026-03-25 - Decisao: executar o smoke pelo `ControlledTargetPrepareExecutor` em vez do invólucro Telegram.
  - Motivo: o executor controlado e a fronteira real do `/target_prepare`, enquanto o shell desta etapa nao tem canal Telegram observavel; a execucao direta permitiu validar o mesmo fluxo com Codex CLI, guard de Git, manifesto/relatorio e commit/push reais.
  - Impacto: a evidencia de CA-06 permaneceu end-to-end e auditavel, sem blocker externo artificial de transporte.

## Outcomes & Retrospective
- Status final: etapa de execucao concluida com validacoes verdes, ticket fechado em `GO` e repositorio preparado para versionamento posterior pelo runner.
- O que passou a existir:
  - sete superficies `copy-exact` foram revisadas editorialmente e uma foi explicitamente revalidada sem alteracao (`docs/workflows/target-project-compatibility-contract.md`);
  - o inventario de `TARGET_PREPARE_EXACT_COPY_SOURCES` permaneceu identico;
  - `docs/specs/README.md` foi alinhado ao contrato canonico `spec -> tickets -> execplan quando necessario` com ajuste minimo e seguro;
  - o smoke em `/home/mapita/projetos/target-prepare-copy-exact-smoke` publicou o commit `cff30685c9c56067108dc2e80789db245194e5ca`, com `cmp` sem mismatch nas oito fontes e blocos gerenciados legiveis em `AGENTS.md` e `README.md`.
- O que fica pendente fora deste plano:
  - revisar o relatorio humano gerado em `docs/workflows/target-prepare-report.md`;
  - qualquer ajuste em manifesto/schema/versoes/keys;
  - executar o versionamento deste changeset pelo runner na etapa dedicada.
- Proximos passos:
  - executar o ticket irmao `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md`;
  - rerodar o smoke final da spec apos a revisao do report humano;
  - versionar pelo runner o mesmo changeset de fechamento que agora inclui docs revisadas, spec, ExecPlan e ticket fechado.

## Context and Orientation
- Arquivos e referencias principais lidos no planejamento:
  - `tickets/closed/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
  - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `src/types/target-prepare.ts`
  - `src/core/target-prepare.ts`
  - `src/core/target-prepare.test.ts`
  - `docs/workflows/target-prepare-managed-agents-section.md`
  - `docs/workflows/target-prepare-managed-readme-section.md`
  - `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md`
  - `EXTERNAL_PROMPTS.md`
  - `INTERNAL_TICKETS.md`
  - `SPECS.md`
  - `docs/specs/README.md`
  - `docs/specs/templates/spec-template.md`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/target-project-compatibility-contract.md`
- Spec de origem: `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-06, RF-07, RF-08, RF-09, RF-10
  - CA-01, CA-02, CA-06
  - validacoes manuais herdadas de RF-03/CA-03, apenas como parte do smoke final exigido pelo ticket.
- RNFs e restricoes tecnicas/documentais herdados que precisam permanecer observaveis neste ticket:
  - usar portugues correto com acentuacao adequada e coerencia terminologica com `DOCUMENTATION.md`;
  - preservar o contrato atual do `target_prepare` e o inventario `TARGET_PREPARE_EXACT_COPY_SOURCES`;
  - manter os mesmos paths, headings canonicos e sentido operacional das docs revisadas;
  - nao ampliar a mudanca para revisao editorial geral fora das superficies propagadas por `copy-exact`;
  - nao exigir migracao retroativa em massa de historico fora do conjunto propagado;
  - manter o fluxo sequencial e a fronteira de fechamento do ticket no mesmo changeset da entrega.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - revisar superficie por superficie com ajustes pequenos e seguros, priorizando correcao editorial sobre reescrita ampla;
  - arquivos ja coerentes podem permanecer sem diff, mas devem aparecer explicitamente como `revalidados` na trilha documental da execucao;
  - `docs/specs/README.md` permanece em escopo porque e superficie `copy-exact`, mesmo que a evidencia inicial do ticket tenha destacado mais fortemente outros arquivos;
  - qualquer mudanca em codigo/testes do fluxo `target_prepare` pertence ao ticket irmao do relatorio humano, salvo blocker objetivo descoberto durante o smoke;
  - o smoke final deve usar um repositorio descartavel irmao com remoto local bare para permitir prova end-to-end sem depender de servico Git externo.
- Fluxo atual relevante (as-is):
  - `TARGET_PREPARE_EXACT_COPY_SOURCES` lista oito superficies propagadas por `exact-match`.
  - Parte relevante dessas fontes ainda mistura portugues correto com trechos sem acentuacao ou com wording editorial inconsistente.
  - `docs/specs/README.md` e uma superficie propagada que ainda expõe contrato desatualizado em relacao ao canone atual `spec -> tickets`.
  - As fontes de blocos gerenciados e a estabilidade contratual do manifesto ja possuem boundary/garantias separadas e nao devem ser confundidas com o lote `copy-exact`.
- Restricoes operacionais do ambiente desta execucao:
  - todo comando `node`/`npm` deve repetir `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` no mesmo comando;
  - os repositorios alvo do smoke devem ficar como diretorios irmaos de `/home/mapita/projetos/codex-flow-runner` dentro de `/home/mapita/projetos`;
  - a execucao deve permanecer sequencial; nao introduzir paralelizacao de tickets ou de superfices que atrapalhe a revisao textual completa.

## Plan of Work
- Milestone 1: Congelar o baseline do inventario `copy-exact` e classificar cada superficie.
  - Entregavel: existe uma lista objetiva das oito superficies em escopo, com classificacao `editar` ou `revalidar sem mudanca`, ancorada em `src/types/target-prepare.ts`.
  - Evidencia de conclusao: o inventario atual de `TARGET_PREPARE_EXACT_COPY_SOURCES` foi rechecado e nenhuma superficie propagada por `copy-exact` ficou sem avaliacao explicita.
  - Arquivos esperados: sem mudanca funcional em `src/types/target-prepare.ts`; possiveis atualizacoes apenas neste ExecPlan durante a execucao.
- Milestone 2: Aplicar revisao editorial minima nas fontes `copy-exact` que ainda propagam erro.
  - Entregavel: as oito docs `copy-exact` ficam com portugues correto e wording coerente com `DOCUMENTATION.md`, preservando headings, paths e comportamento documentado.
  - Evidencia de conclusao: `git diff --word-diff` mostra apenas correcoes editoriais e pequenos ajustes de coerencia necessarios; o pacote permanece restrito as superfices em escopo.
  - Arquivos esperados:
    - `EXTERNAL_PROMPTS.md`
    - `INTERNAL_TICKETS.md`
    - `PLANS.md`
    - `SPECS.md`
    - `docs/specs/README.md`
    - `docs/specs/templates/spec-template.md`
    - `docs/workflows/discover-spec.md`
    - `docs/workflows/target-project-compatibility-contract.md`
- Milestone 3: Tornar a cobertura do inventario rastreavel na propria mudanca.
  - Entregavel: a spec de origem e este ExecPlan registram de forma objetiva quais superfices foram revisadas ou apenas revalidadas, sem perder a relacao com a spec nem com este ExecPlan.
  - Evidencia de conclusao: a trilha documental da entrega aponta explicitamente o pacote `copy-exact` atendido, mantendo a spec em `pending`/`partially_attended` apenas pelo ticket irmao remanescente e pelo ticket atual ainda aberto por instrucao da etapa.
  - Arquivos esperados:
    - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
    - `execplans/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
- Milestone 4: Provar a propagacao corrigida no fluxo real de `target_prepare`.
  - Entregavel: a suite automatizada focada passa e um smoke manual/equivalente em repo descartavel confirma que as oito superfices chegam ao alvo por igualdade literal, enquanto `AGENTS.md` e `README.md` continuam legiveis.
  - Evidencia de conclusao: `npm test -- src/core/target-prepare.test.ts` verde, `cmp` sem mismatch entre fonte e alvo nas oito docs, e revisao manual positiva de `AGENTS.md`/`README.md` no repo preparado.
  - Arquivos esperados: nenhum arquivo adicional no runner alem das docs/ticket/spec; artefatos de smoke apenas no repo descartavel irmao.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler ticket, spec, quality gates, `DOCUMENTATION.md`, `src/types/target-prepare.ts` e as oito fontes `copy-exact` com:
   `sed -n '1,260p' tickets/closed/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
   `sed -n '1,320p' docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
   `sed -n '1,260p' PLANS.md`
   `sed -n '1,220p' docs/workflows/codex-quality-gates.md`
   `sed -n '1,220p' DOCUMENTATION.md`
   `rg -n 'targetPath:' src/types/target-prepare.ts`
   `for f in EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md; do sed -n '1,220p' "$f"; done`
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan via `apply_patch`, trocando o item de baseline em `Progress` para `[x]` e registrando em `Surprises & Discoveries` a classificacao objetiva de cada superficie (`editar` vs `revalidar sem mudanca`) antes de tocar qualquer arquivo do pacote.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md` e `SPECS.md` para corrigir acentuacao, concordancia e wording editorial, preservando headings, nomes de secoes, paths e comportamento operacional descrito.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `docs/specs/README.md` e `docs/specs/templates/spec-template.md` para alinhar o texto propagado ao portugues correto e, se necessario, corrigir o wording minimo que ainda contradiga o contrato canônico vigente sem ampliar o escopo alem de um ajuste pequeno e seguro.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `docs/workflows/discover-spec.md` e `docs/workflows/target-project-compatibility-contract.md` para concluir o lote `copy-exact`, mantendo intactos os fluxos e contratos documentados.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar o diff textual completo com:
   `git diff --word-diff -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md`
   e
   `git diff --name-only -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md`
   para confirmar que o pacote ficou restrito as oito superfices `copy-exact` e que nao houve drift semantico aparente.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar a validacao automatizada mais aderente ao ticket com:
   `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts`
8. (workdir: `/home/mapita/projetos`) Preparar um repo descartavel irmao e um remoto bare local para o smoke:
   `git init --bare target-prepare-copy-exact-smoke-remote.git`
   `mkdir -p target-prepare-copy-exact-smoke`
   `cd target-prepare-copy-exact-smoke && git init && git checkout -b main`
   `printf '# Projeto alvo\\n\\nContexto local.\\n' > README.md`
   `printf '# AGENTS local\\n\\nRegra preexistente.\\n' > AGENTS.md`
   `git add README.md AGENTS.md && git commit -m 'chore: bootstrap smoke repo'`
   `git remote add origin ../target-prepare-copy-exact-smoke-remote.git && git push -u origin main`
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Acionar o backend real do `/target_prepare` pelo shell com o mesmo executor controlado usado pelo runner:
   `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx /tmp/run-target-prepare-smoke.mts`
   onde o script instancia `ControlledTargetPrepareExecutor` com `CodexCliTicketFlowClient`, `GitCliTargetPrepareGuard`, `GitCliVersioning` e `FileSystemTargetProjectResolver` reais para o projeto `target-prepare-copy-exact-smoke`.
10. (workdir: `/home/mapita/projetos/target-prepare-copy-exact-smoke`) Depois do smoke bem-sucedido, validar a propagacao literal das oito fontes com:
    `for f in EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md; do cmp -s "/home/mapita/projetos/codex-flow-runner/$f" "/home/mapita/projetos/target-prepare-copy-exact-smoke/$f" || echo "mismatch: $f"; done`
    e inspecionar o pacote versionado com:
    `git show --stat --name-only HEAD`
11. (workdir: `/home/mapita/projetos/target-prepare-copy-exact-smoke`) Confirmar manualmente a legibilidade dos blocos gerenciados e a ausencia de conflito com conteudo preexistente usando:
    `rg -n 'codex-flow-runner:target-prepare-managed-(agents|readme):(start|end)' AGENTS.md README.md`
    `sed -n '1,220p' AGENTS.md`
    `sed -n '1,220p' README.md`
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se todas as validacoes estiverem verdes, executar `apply_patch` na spec de origem e neste ExecPlan para registrar a entrega do pacote `copy-exact`, atualizar evidencias/pendencias de forma compativel com o ticket irmao ainda aberto e manter o ticket atual aberto ate a etapa em que fechamento/commit forem permitidos.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01, RF-02, RF-08; CA-01, CA-02.
    - Evidencia observavel: `src/types/target-prepare.ts` continua listando exatamente as mesmas oito superficies `copy-exact`, e a trilha documental da entrega identifica cada uma delas como `revisada` ou `revalidada`.
    - Comando: `rg -n 'targetPath: "(EXTERNAL_PROMPTS.md|INTERNAL_TICKETS.md|PLANS.md|SPECS.md|docs/specs/README.md|docs/specs/templates/spec-template.md|docs/workflows/discover-spec.md|docs/workflows/target-project-compatibility-contract.md)"' src/types/target-prepare.ts`
    - Esperado: um match por superficie, sem inventario novo/removido neste ticket.
    - Comando: `git diff --word-diff -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md`
    - Esperado: cada superficie em escopo pode ser auditada individualmente como revisada ou mantida sem drift estrutural.
  - Requisito: RF-06, RF-07, RF-09; CA-02.
    - Evidencia observavel: as fontes `copy-exact` em escopo passam a usar portugues correto e acentuacao adequada, mantendo headings canonicos, paths, contratos operacionais e sentido original; o diff permanece restrito ao pacote documental previsto.
    - Comando: `git diff --word-diff -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md`
    - Esperado: apenas correcoes editoriais e pequenos ajustes seguros de coerencia; nenhum rename de path, heading canonico removido ou contrato operacional reescrito.
    - Comando: `git diff --name-only -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md`
    - Esperado: somente superficies `copy-exact` revisadas neste ticket aparecem com diff local; superficies revalidadas sem necessidade de ajuste podem permanecer fora da lista.
  - Requisito: RF-10; CA-06, com validacoes manuais herdadas de RF-03; CA-03.
    - Evidencia observavel: a suite focada do `target_prepare` continua verde, um smoke manual mostra que o alvo recebe exatamente as versoes corrigidas das oito fontes `copy-exact`, e os blocos gerenciados de `AGENTS.md` e `README.md` seguem legiveis e sem conflito material com o conteudo preexistente relevante.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts`
    - Esperado: suite verde cobrindo sincronizacao `copy-exact`, merge gerenciado e artefatos canonicos sem regressao no fluxo.
    - Comando: `for f in EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md; do cmp -s "/home/mapita/projetos/codex-flow-runner/$f" "/home/mapita/projetos/target-prepare-copy-exact-smoke/$f" || echo "mismatch: $f"; done`
    - Esperado: nenhum output; qualquer `mismatch` invalida o aceite ate investigacao.
    - Comando: `git show --stat --name-only HEAD`
    - Esperado: o commit do repo alvo mostra as superfices preparadas pelo fluxo, incluindo o pacote `copy-exact` corrigido e os artefatos canonicos do prepare.
    - Comando: `rg -n 'codex-flow-runner:target-prepare-managed-(agents|readme):(start|end)' AGENTS.md README.md` seguido de leitura manual de `AGENTS.md` e `README.md`
    - Esperado: os markers existem e a revisao humana confirma que os blocos gerenciados continuam claros e nao conflitam com o conteudo local relevante.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar as edicoes documentais deve convergir para o mesmo texto final, sem duplicar headings, bullets ou notas operacionais;
  - superficies ja coerentes podem continuar sem diff; isso deve ser tratado como `revalidacao`, nao como falha de cobertura;
  - reexecutar o smoke em repo ja preparado deve resultar em zero mismatch nas oito fontes `copy-exact`; se houver diff residual, ele deve se concentrar nos artefatos gerados do prepare e nao nas fontes `copy-exact`.
- Riscos:
  - ajustar wording alem do necessario e introduzir drift semantico em processo/documentacao;
  - esquecer `docs/specs/README.md` por ele ser curto e nao ter sido destacado no corpo principal da evidencia inicial;
  - misturar neste ticket mudancas do relatorio humano gerado pelo runner;
  - ficar sem evidencia manual de `/target_prepare` por indisponibilidade de Telegram autorizado ou por repositorio de smoke mal preparado.
- Recovery / Rollback:
  - apos cada lote de arquivos, rodar imediatamente o `git diff --word-diff` focado; se algum hunk sugerir mudanca semantica indevida, corrigir o proprio texto via `apply_patch` antes de prosseguir;
  - se surgir necessidade de mudanca mais ampla que um ajuste editorial pequeno e seguro, registrar em `Surprises & Discoveries`, parar a execucao e abrir follow-up em vez de ampliar o escopo silenciosamente;
  - se o smoke falhar por problema do repo alvo, recriar o repositorio descartavel e o remoto bare do zero, em vez de tentar reaproveitar estado quebrado;
  - se o smoke falhar por indisponibilidade externa/manual do Telegram autorizado, registrar blocker explicito e nao fechar o ticket sem deixar claro qual parte da CA-06 permaneceu pendente.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
- Spec de origem:
  - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
- Ticket irmao usado para delimitar fronteira:
  - `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md`
- Referencias documentais consultadas no planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `EXTERNAL_PROMPTS.md`
  - `INTERNAL_TICKETS.md`
  - `SPECS.md`
  - `docs/specs/README.md`
  - `docs/specs/templates/spec-template.md`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `docs/workflows/target-prepare-managed-agents-section.md`
  - `docs/workflows/target-prepare-managed-readme-section.md`
  - `src/types/target-prepare.ts`
  - `src/core/target-prepare.ts`
  - `src/core/target-prepare.test.ts`
- Evidencias esperadas ao final da execucao:
  - diff textual focado nas oito superfices `copy-exact`;
  - suite `src/core/target-prepare.test.ts` verde;
  - repo descartavel preparado com `cmp` sem mismatch nas oito fontes;
  - revisao manual positiva dos blocos gerenciados de `AGENTS.md` e `README.md`.
- Evidencias efetivamente obtidas nesta etapa:
  - `rg -n 'targetPath: ...' src/types/target-prepare.ts` confirmou as mesmas oito superficies do inventario `copy-exact`;
  - `git diff --word-diff` confirmou o pacote restrito a sete superficies revisadas, com `docs/workflows/target-project-compatibility-contract.md` revalidado sem diff;
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts` terminou verde (514 testes / 0 falhas, porque o script `npm test` expande a suite completa antes do filtro);
  - o smoke no repo `/home/mapita/projetos/target-prepare-copy-exact-smoke` gerou o commit `cff30685c9c56067108dc2e80789db245194e5ca` em `origin/main`, com `cmp` sem mismatch, markers presentes e blocos legiveis em `AGENTS.md` e `README.md`.
- Checklist de qualidade aplicado neste planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita de spec de origem, RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - explicacao dos riscos residuais, do nao-escopo e da estrategia de recuperacao.

## Interfaces and Dependencies
- Interfaces/superficies impactadas:
  - `TARGET_PREPARE_EXACT_COPY_SOURCES` em `src/types/target-prepare.ts` como inventario canônico do pacote;
  - as oito docs propagadas por `exact-match`;
  - a trilha documental da spec de origem e do ticket no fechamento;
  - o contrato de propagacao do `target_prepare`, exercitado pela suite `src/core/target-prepare.test.ts` e pelo smoke manual.
- Compatibilidade:
  - os valores de `targetPath`, `sourceRelativePath`, markers de bloco gerenciado, paths canonicos e versoes do manifesto devem permanecer intactos;
  - `AGENTS.md` e `README.md` continuam sendo validados apenas como superficies herdadas do smoke, nao como docs a serem editadas neste ticket;
  - o ticket irmao do relatorio humano continua responsavel por qualquer mudanca em `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts` ou `docs/workflows/target-prepare-report.md`.
- Dependencias externas e operacionais:
  - runtime Node do host com prefixo `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` em todos os comandos `npm`;
  - canal equivalente ao backend do `/target_prepare` para o smoke manual; nesta etapa, o shell usou diretamente o `ControlledTargetPrepareExecutor`, que e a mesma fronteira executada pelo runner;
  - repositorio descartavel irmao e remoto bare local dentro de `/home/mapita/projetos` para validar o fluxo sem depender de servico Git externo;
  - working tree limpo no repo de smoke antes de rodar o prepare.
