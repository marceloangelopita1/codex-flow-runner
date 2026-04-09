# ExecPlan - target-investigate-case-v2 lineage enforcement gap

## Purpose / Big Picture
- Objetivo:
  fechar o gap runner-side que ainda deixa `lineage` obrigatoria incompleta no contrato v2 quando a rodada nasce de comandos ou artefatos legados da v1.
- Resultado esperado:
  `case-resolution.json`, `case-bundle.json` e `diagnosis.json` passam a carregar e validar `lineage` de forma observavel no runner quando houver origem v1; `evidence-index.json` pode continuar trazendo `lineage`, mas nao substitui esse trio; `output/case-investigation/<round-id>/` permanece autoritativo e `investigations/<round-id>/` segue como espelho secundario sem reabrir a cadeia opcional v1.
- Escopo:
  endurecer schema, normalizacao, leitura runner-side, round preparation, fixtures e testes focados do pacote v2;
  preservar a fronteira de ownership com o ticket fechado de `diagnosis.*` e com o ticket aberto de continuacoes opcionais;
  validar tudo pelos closure criteria deste ticket e pelos comandos automatizados ja declarados nele.
- Fora de escopo:
  redesenhar `diagnosis.md`, summary final, trace ou Telegram fora do que ja foi fechado no ticket irmao;
  reabrir manifesto, publication tardia, `deep-dive`, `improvement-proposal`, `ticket-projection` ou os adaptadores completos de migracao da v1;
  alterar targets externos, fechar ticket, fazer commit/push ou executar rodada manual fora deste repositorio.

## Progress
- [x] 2026-04-08 23:54Z - Ticket alvo, spec, ticket/execplan pai, quality gates e referencias citadas foram relidos integralmente para fechar escopo e aceite.
- [x] 2026-04-08 23:54Z - Fronteira de ownership consolidada: este follow-up fica apenas com `lineage` em `case-resolution.json` e `case-bundle.json`, mais a prova cruzada com `diagnosis.json`, namespace autoritativo e caminho minimo.
- [x] 2026-04-08 23:54Z - ExecPlan criado em `execplans/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`.
- [x] 2026-04-09 00:12Z - Schema/normalizacao e leitura runner-side passaram a aceitar/preservar `lineage` em `case-resolution.json` e `case-bundle.json`, com gate runner-side explicito para o trio obrigatorio quando a rodada v2 declara origem legada.
- [x] 2026-04-09 00:12Z - Round preparation, fixtures e suites focadas passaram a preservar `lineage` no namespace autoritativo e no espelho secundario, com prova positiva para `case-resolution.json`, `case-bundle.json` e `diagnosis.json`.
- [x] 2026-04-09 00:12Z - Validacao automatizada do ticket concluida com `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` e `npm run check`, ambos em `exit 0`.

## Surprises & Discoveries
- 2026-04-08 23:54Z - `targetInvestigateCaseCaseBundleSchema` ainda e alias direto de `targetInvestigateCaseEvidenceBundleSchema`; por isso `case-bundle.json` segue sem `lineage` runner-side mesmo depois da entrada do contrato v2.
- 2026-04-08 23:54Z - O shape v2 materializado em `materializeV2RoundArtifacts(...)` e `writeV2RoundArtifacts(...)` grava `lineage` em `diagnosis.json` e, em alguns fixtures, em `evidence-index.json`, mas nao em `case-resolution.json` nem em `case-bundle.json`; isso reproduz exatamente o `NO_GO` do ticket pai.
- 2026-04-08 23:54Z - A prova de `RF-24` e `RF-25` ja existe parcialmente no `round-preparer`; o follow-up precisa preservar esse comportamento e apenas completar a rastreabilidade faltante, sem reabrir UX operator-facing nem continuações opcionais.
- 2026-04-09 00:12Z - O menor gate seguro para `RF-23` nao foi tornar `lineage` globalmente obrigatoria em toda rodada v2; a implementacao ficou condicionada a marcadores legados explicitos ja presentes nas entradas de `lineage`, o que fecha o gap do ticket sem acoplar o runner a heuristicas de target nem quebrar cenarios v2 futuros sem heranca da v1.

## Decision Log
- 2026-04-08 - Decisao: nao usar consolidacao para o conjunto finito de artefatos com `lineage` obrigatoria.
  - Motivo:
    o ticket e a spec enumeram explicitamente `case-resolution.json`, `case-bundle.json` e `diagnosis.json`, e o checklist compartilhado exige preservar os membros explicitos quando eles fazem parte do requisito.
  - Impacto:
    a matriz de validacao e os testes precisam ter evidencia positiva para cada um dos tres membros e evidencia negativa de que `evidence-index.json` sozinho nao fecha o aceite.
- 2026-04-08 - Decisao: manter o fix local ao pacote v2 ja introduzido, com schema, normalizacao, round preparation e testes no mesmo changeset.
  - Motivo:
    o ticket declara o gap como local e automatizavel, e explicita esse recorte como a menor correcao segura.
  - Impacto:
    o plano nao reabre manifesto, Telegram, publication tardia ou modelagem ampla das etapas opcionais.
- 2026-04-08 - Decisao: tratar `case-bundle.json` como surface v2 propria, ainda que a compatibilidade com `evidence-bundle.json` precise continuar existindo internamente.
  - Motivo:
    o alias cru atual mascara a ausencia de `lineage` e impede prova observavel para o artefato canonico exigido por `RF-23`.
  - Impacto:
    a execucao deve preferir helper/normalizacao explicita para `case-bundle.json` em vez de continuar aceitando o alias legado como criterio suficiente de aceite.
- 2026-04-08 - Decisao: manter a fronteira de ownership com os tickets irmaos explicitamente registrada neste plano.
  - Motivo:
    ha um ticket fechado de `diagnosis.*` e um ticket aberto de continuacoes opcionais na mesma linhagem; sem isso, a execucao pode reabrir `duplication-gap` ou `closure-criteria-gap`.
  - Impacto:
    este plano so toca `diagnosis.json` na parte de `lineage` e so toca a malha de etapas para preservar `RF-24` e `RF-25`, nao para remodelar UX ou etapas opcionais.
- 2026-04-09 - Decisao: usar origem legada explicitamente declarada nas entradas de `lineage` como gatilho runner-side para a obrigatoriedade do trio.
  - Motivo:
    o pacote atual ja materializava `lineage` em `diagnosis.json` e/ou `evidence-index.json`; reaproveitar esse sinal fecha o gap observado pelo ticket sem promover obrigatoriedade global para qualquer rodada v2.
  - Impacto:
    `case-resolution.json`, `case-bundle.json` e `diagnosis.json` agora falham de forma observavel quando a rodada v2 declara heranca da v1 e algum membro obrigatorio vier sem `lineage`; `evidence-index.json` continua auxiliar e nao fecha aceite sozinho.

## Outcomes & Retrospective
- Status final:
  execucao concluida localmente; implementacao, testes focados e `check` encerrados sem fechar ticket nem fazer commit/push.
- O que funcionou:
  explicitar `case-bundle.json` como surface v2 propria e reaproveitar marcadores legados ja presentes em `lineage` permitiu endurecer o contrato com patch pequeno, sem reabrir manifesto, publication ou etapas opcionais.
- O que ficou pendente:
  apenas o fechamento operacional posterior deste ticket/execplan e o versionamento, que ficaram fora desta etapa por contrato.
- Proximos passos:
  revisar diff final, decidir aceite do ticket pai com base nesta evidencia e, em etapa separada, fechar ticket/commit conforme o workflow sequencial.

## Context and Orientation
- Ticket alvo:
  `tickets/open/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`
- Ticket e ExecPlan pai:
  `tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
  `execplans/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
- Spec de origem:
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  `RF-23`, `RF-24`, `RF-25` e a parcela runner-side de `CA-06`.
- RNFs e restricoes herdadas que precisam ficar observaveis neste ticket:
  preservar publication runner-side conservadora e anti-overfit;
  manter o runner target-agnostic;
  nao acoplar o runner a heuristicas de um target especifico;
  nao reabrir a modelagem completa de `deep-dive`, `improvement-proposal`, `ticket-projection` ou `publication`;
  corrigir o gap de `lineage` nas camadas de schema, normalizacao, round preparation e testes no mesmo changeset.
- Assumptions / defaults adotados para eliminar ambiguidade:
  a v2 continua sendo contrato explicito e paralelo a v1;
  o caminho minimo diagnosis-first ja foi aterrado e nao deve ser reaberto aqui;
  `output/case-investigation/<round-id>/` continua sendo a fonte autoritativa da rodada;
  `investigations/<round-id>/` permanece apenas como espelho secundario durante a migracao;
  `evidence-index.json` pode continuar carregando `lineage`, mas nao substitui o trio exigido no closure criterion;
  nenhuma validacao manual externa e necessaria para este ticket, porque o gap remanescente e local e automatizavel.
- Allowlists / enumeracoes finitas relevantes herdadas do ticket/spec, sem consolidacao:
  artefatos com `lineage` obrigatoria quando houver origem v1: `case-resolution.json`, `case-bundle.json`, `diagnosis.json`;
  artefato que pode carregar `lineage`, mas nao substitui o conjunto exigido: `evidence-index.json`;
  namespace autoritativo aceito: `output/case-investigation/<round-id>`;
  namespace de espelho aceito: `investigations/<round-id>`;
  caminho minimo que precisa continuar valido: `preflight -> resolve-case -> assemble-evidence -> diagnosis`;
  cadeia que nao pode voltar a ser pre-condicao do caminho minimo: `semantic-review -> causal-debug -> root-cause-review`.
- Fronteira de ownership com tickets da mesma linhagem:
  o ticket pai fechado em `NO_GO` continua dono do contrato v2, do manifesto, do caminho minimo e do namespace autoritativo; este follow-up so conclui a parte remanescente de `lineage` que bloqueou o aceite final dele;
  `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md` continua dono de `diagnosis.md`, summary, trace e Telegram; este plano so toca `diagnosis.json` para completar a rastreabilidade exigida;
  `tickets/open/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md` continua dono de `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication` e dos guardrails tardios de migracao; este plano apenas preserva que eles nao virem dependencia do caminho minimo.
- Arquivos e superficies principais a reler na execucao:
  `src/types/target-investigate-case.ts`
  `src/core/target-investigate-case.ts`
  `src/core/target-investigate-case.test.ts`
  `src/integrations/target-investigate-case-round-preparer.ts`
  `src/integrations/target-investigate-case-round-preparer.test.ts`
  `src/integrations/codex-client.test.ts`
  `docs/workflows/target-case-investigation-v2-manifest.json`
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`

## Plan of Work
- Milestone 1:
  - Entregavel:
    `case-resolution.json` e `case-bundle.json` deixam de depender de shapes implicitos e passam a ter `lineage` runner-side explicita quando a rodada vier da v1, sem quebrar a compatibilidade normalizada que o pacote v2 ainda precisa preservar.
  - Evidencia de conclusao:
    `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.ts` conseguem distinguir os artefatos obrigatorios do conjunto v2, preservar a compatibilidade legada e falhar de forma observavel quando um dos membros obrigatorios vier sem `lineage` no contexto que exige rastreabilidade v1 -> v2.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`
    `src/core/target-investigate-case.ts`
    `src/core/target-investigate-case.test.ts`
- Milestone 2:
  - Entregavel:
    round preparation, fixtures e espelho secundario passam a propagar o mesmo `lineage` do namespace autoritativo para os artefatos obrigatorios, sem aceitar `evidence-index.json` como consolidacao substitutiva.
  - Evidencia de conclusao:
    `src/integrations/target-investigate-case-round-preparer.test.ts` prova que `output/case-investigation/<round-id>/` continua autoritativo, `investigations/<round-id>/` segue como espelho e ambos preservam `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`.
  - Arquivos esperados:
    `src/integrations/target-investigate-case-round-preparer.ts`
    `src/integrations/target-investigate-case-round-preparer.test.ts`
- Milestone 3:
  - Entregavel:
    suite automatizada do pacote fecha o ticket sem regressao para o caminho minimo diagnosis-first ja aterrado.
  - Evidencia de conclusao:
    o comando de testes focados declarado no ticket e `npm run check` terminam em `exit 0`, e a revisao final confirma que a cadeia `semantic-review -> causal-debug -> root-cause-review` nao voltou a ser pre-condicao do fluxo minimo.
  - Arquivos esperados:
    `src/core/target-investigate-case.test.ts`
    `src/integrations/target-investigate-case-round-preparer.test.ts`
    `src/integrations/codex-client.test.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler os anchors do gap com `sed -n '1,260p' tickets/open/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md` e `rg -n "lineage|case-resolution|case-bundle|diagnosis|evidence-index|output/case-investigation|investigations/" src/types/target-investigate-case.ts src/core/target-investigate-case.ts src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.ts src/integrations/target-investigate-case-round-preparer.test.ts` para reancorar o patch antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-investigate-case.ts` para explicitar o contrato de `lineage` em `targetInvestigateCaseCaseResolutionSchema` e `targetInvestigateCaseCaseBundleSchema`, mantendo a compatibilidade com entradas legadas sem continuar usando `case-bundle.json` como alias cego do bundle legado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.ts` para validar `lineage` dos tres artefatos obrigatorios quando o contexto indicar origem v1, reutilizando o contexto ja normalizado da rodada e rejeitando aceite em que apenas `evidence-index.json` carregue rastreabilidade.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/target-investigate-case-round-preparer.ts` para materializar ou preservar `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json` no namespace autoritativo e no espelho secundario, sem recolocar `semantic-review`, `causal-debug` ou `root-cause-review` como dependencias do caminho minimo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.test.ts` e `src/integrations/target-investigate-case-round-preparer.test.ts` para cobrir:
   - sucesso positivo de `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`;
   - falha negativa quando qualquer um desses tres membros vier sem `lineage`, mesmo com `evidence-index.json` carregando o campo;
   - preservacao do namespace autoritativo `output/case-investigation/<round-id>/`, do espelho `investigations/<round-id>/` e da independencia do caminho minimo em relacao a cadeia opcional v1.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/codex-client.test.ts` apenas se a fixture compartilhada ou o contrato de preparacao precisar de alinhamento para o comando de validacao do ticket continuar representativo.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` para validar os closure criteria automatizados diretamente ligados ao follow-up.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar tipagem e coerencia do pacote apos a exigencia adicional de `lineage`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `git diff --stat` e `git diff -- src/types/target-investigate-case.ts src/core/target-investigate-case.ts src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` para garantir que o changeset ficou confinado ao ownership deste follow-up.

## Validation and Acceptance
- Regra de cobertura para allowlists / enumeracoes finitas:
  nao ha consolidacao neste ticket. O aceite precisa provar cobertura positiva de `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`; `evidence-index.json` pode permanecer com `lineage`, mas deve aparecer apenas como apoio, nunca como substituto do trio exigido. A validacao tambem precisa preservar explicitamente `output/case-investigation/<round-id>` como namespace autoritativo e `investigations/<round-id>` como espelho secundario.
- Matriz requisito -> validacao observavel:
  - `RF-23` + parcela runner-side de `CA-06`:
    `src/types/target-investigate-case.ts` passa a expor contrato/normalizacao observavel para `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json` quando a rodada nasce da v1; `src/core/target-investigate-case.test.ts` prova cobertura positiva para cada um dos tres membros explicitos e cobertura negativa de que `evidence-index.json` com `lineage` nao fecha o aceite se qualquer membro obrigatorio estiver sem o campo.
  - `RF-24` + `RF-25`:
    `src/integrations/target-investigate-case-round-preparer.test.ts` prova que `output/case-investigation/<round-id>/` continua sendo a fonte autoritativa, `investigations/<round-id>/` segue apenas como espelho secundario, ambos preservam o mesmo `lineage` nos artefatos obrigatorios e o caminho minimo permanece sem depender da cadeia `semantic-review -> causal-debug -> root-cause-review`.
  - `Validacao automatizada do pacote`:
    o comando de testes focados declarado no ticket e `npm run check` terminam em `exit 0`.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  - Esperado:
    `exit 0`, com casos positivos para `lineage` em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`, casos negativos em que `evidence-index.json` nao substitui um membro obrigatorio ausente, e evidencia de que o namespace autoritativo e o espelho seguem coerentes sem reintroduzir a cadeia opcional v1.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado:
    `exit 0`, sem drift tipado entre schemas, normalizacao, round preparation e suites focadas.
- Validacoes manuais herdadas:
  nenhuma; o proprio ticket registra que o gap remanescente e local e automatizavel.

## Idempotence and Recovery
- Idempotencia:
  a execucao deve ser aditiva sobre o pacote v2 ja introduzido; rerodar testes ou preparar nova rodada v2 no mesmo estado deve preservar `output/case-investigation/<round-id>/` como autoridade, `investigations/<round-id>/` como derivado e o mesmo conjunto explicito de artefatos com `lineage` exigida;
  fixtures negativas e positivas devem ser deterministicas, para que a ausencia de `lineage` em qualquer membro obrigatorio continue produzindo falha reproduzivel.
- Riscos:
  tornar `lineage` obrigatoria de forma global, em vez de condicionada ao contexto de origem v1, pode quebrar rounds que nao deveriam herdar esse requisito;
  remover o alias de `case-bundle.json` de forma ingênua pode gerar regressao ampla na compatibilidade com `evidence-bundle.json`;
  ha risco de scope creep para `diagnosis.*` operator-facing ou para as continuações opcionais se o patch tentar resolver mais do que o closure criterion pede.
- Recovery / Rollback:
  se a exigencia de `lineage` quebrar cenarios que nao sao de origem v1, reintroduzir a obrigatoriedade por gate explicito ligado ao contexto da rodada, em vez de afrouxar novamente o ticket;
  se a separacao entre `case-bundle.json` e o bundle legado gerar regressao ampla, extrair helper de normalizacao compartilhado e manter `targetInvestigateCaseCaseBundleSchema` como surface v2 explicita, em vez de voltar ao alias cru;
  se o espelho `investigations/<round-id>/` divergir do namespace autoritativo, restaurar primeiro a copia derivada a partir de `output/case-investigation/<round-id>/` e so depois reexecutar os testes de round preparation;
  se a execucao comecar a tocar summary, Telegram ou publication alem do minimo necessario para estes testes, parar e registrar blocker porque esse ownership pertence aos tickets irmaos.

## Artifacts and Notes
- ExecPlan desta etapa:
  `execplans/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`
- Ticket alvo:
  `tickets/open/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`
- Spec de origem:
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- Ticket e ExecPlan pai:
  `tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
  `execplans/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
- Tickets irmaos para fronteira de ownership:
  `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md`
  `tickets/open/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md`
- Contratos e testes que ancoram este follow-up:
  `src/types/target-investigate-case.ts`
  `src/core/target-investigate-case.ts`
  `src/core/target-investigate-case.test.ts`
  `src/integrations/target-investigate-case-round-preparer.ts`
  `src/integrations/target-investigate-case-round-preparer.test.ts`
  `docs/workflows/target-case-investigation-v2-manifest.json`
- Logs relevantes esperados na execucao:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`

## Interfaces and Dependencies
- Interfaces alteradas:
  `targetInvestigateCaseCaseResolutionSchema` e o tipo `TargetInvestigateCaseCaseResolution`;
  `targetInvestigateCaseCaseBundleSchema` e o tipo `TargetInvestigateCaseCaseBundle`;
  leitura/avaliacao runner-side em `src/core/target-investigate-case.ts` para os artefatos obrigatorios do pacote v2;
  materializacao e espelhamento de artefatos em `src/integrations/target-investigate-case-round-preparer.ts`.
- Compatibilidade:
  rounds legados continuam podendo usar bridges e normalizacao existentes, mas a aceitacao runner-side de rounds v2 originados da v1 passa a exigir `lineage` explicita em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`;
  `evidence-index.json` continua permitido como artefato auxiliar com `lineage`, sem virar consolidacao substitutiva do trio;
  `output/case-investigation/<round-id>/` continua sendo a unica fonte autoritativa da rodada, com `investigations/<round-id>/` apenas como espelho de compatibilidade.
- Dependencias externas e mocks:
  as suites continuam usando fixtures locais, filesystem temporario, `StubCodexClient` e versionamento mockado;
  nenhum target externo precisa ser alterado para executar este follow-up local no runner.
