# ExecPlan - target-investigate-case-v2 runner contract and minimum path gap

## Purpose / Big Picture
- Objetivo:
  introduzir no runner um contrato v2 explicito para `target-investigate-case`, com identidade propria, manifesto cross-repo, estagios canonicos e caminho minimo diagnosis-first observavel, sem absorver a ownership dos artefatos operator-facing do ticket de `diagnosis.*` nem o desenho completo das continuacoes opcionais do ticket de migracao/publication.
- Resultado esperado:
  o repositorio passa a aceitar `target-investigate-case-v2` / `/target_investigate_case_v2` como fluxo proprio; o manifesto v2 vira fonte de verdade cross-repo para estagios target-owned; o caminho minimo `preflight -> resolve-case -> assemble-evidence -> diagnosis` deixa de depender da cadeia v1 `semantic-review -> causal-debug -> root-cause-review`; os artefatos minimos `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json` ficam materializaveis sob namespace autoritativo do target, com `lineage` explicita quando houver origem v1.
- Escopo:
  introduzir identidade v2 em tipos, constantes, manifesto, parsing e validacao runner-side;
  modelar exatamente os estagios `resolve-case`, `assemble-evidence`, `diagnosis`, `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication`, com cobertura positiva do conjunto aceito e negativa fora dele;
  alinhar o round preparation / executor / prompt loading para permitir o caminho minimo sem depender das continuacoes opcionais ou da cadeia estrutural v1;
  tornar observavel a fronteira target-owned vs runner-side no manifesto v2, incluindo `owner`, `runnerExecutor`, `artifacts`, `policy`, `promptPath` e `publicationPolicy`;
  alinhar namespace autoritativo `output/case-investigation/<round-id>/` vs espelho `investigations/<round-id>/`, incluindo `lineage` e guardas minimos de migracao necessarios para o caminho minimo;
  expandir testes focados e `npm run check` para os closure criteria deste ticket.
- Fora de escopo:
  reescrever o ticket fechado de `diagnosis artifacts and operator surfaces` ou mudar a ownership de summary/trace/Telegram para este plano;
  desenhar completamente as precondicoes tardias de `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` alem do necessario para o caminho minimo parar de depender delas;
  alterar qualquer projeto alvo externo ou iniciar a segunda onda de adocao nos targets aderentes;
  fechar o ticket, fazer commit/push ou executar rodada manual em target externo nesta etapa de planejamento.

## Progress
- [x] 2026-04-08 22:50Z - Leitura integral do ticket alvo, da spec de origem, de `PLANS.md` e de `docs/workflows/codex-quality-gates.md` concluida.
- [x] 2026-04-08 22:50Z - Referencias do ticket revisadas: `src/types/target-investigate-case.ts`, `src/types/target-flow.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `docs/workflows/target-case-investigation-manifest.json`, `prompts/16-target-investigate-case-round-materialization.md`, ticket irmao de continuacoes opcionais e ticket fechado de `diagnosis.*`.
- [x] 2026-04-08 22:50Z - Fronteira de ownership entre os tickets da linhagem v2 consolidada para evitar `duplication-gap` e `closure-criteria-gap`.
- [x] 2026-04-08 22:50Z - ExecPlan criado em `execplans/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`.
- [x] 2026-04-08 23:00Z - Releitura de execucao confirmou dois acoplamentos extras fora do recorte inicial: o routing do comando v2 ainda nao existe em `src/core/runner.ts` / `src/integrations/telegram-bot.ts`, e `investigations/<round-id>/` continua sendo tratado pelo runtime como namespace primario em vez de espelho secundario.
- [x] 2026-04-09 02:35Z - Identidade v2 (`flow`, comando, manifesto, estagios, enums finitos e paths canonicos) implementada de forma aditiva e explicita no runner, incluindo manifesto dedicado e prompts `resolve-case` / `assemble-evidence` / `diagnosis`.
- [x] 2026-04-09 02:35Z - Caminho minimo `preflight -> resolve-case -> assemble-evidence -> diagnosis` desacoplado da cadeia v1 e das continuacoes opcionais no executor e no round preparer.
- [x] 2026-04-09 02:35Z - Namespace autoritativo, `lineage`, artefatos minimos e validacoes negativas/positivas aterrados em testes focados, com wiring minimo de runner/Telegram para `/target_investigate_case_v2`.
- [x] 2026-04-09 02:35Z - Validacao final concluida com `npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` (observado: o script executa a suite inteira `src/**/*.test.ts`) e `npm run check`, ambos em `exit 0`.
- [x] 2026-04-08 23:48Z - Fechamento tecnico revalidado contra os closure criteria: `NO_GO` por gap remanescente de `lineage` em `case-resolution.json` e `case-bundle.json`; follow-up P0 aberto para concluir `RF-23`.

## Surprises & Discoveries
- 2026-04-08 22:50Z - O ticket fechado de `diagnosis.*` ja introduziu `diagnosis.md` e `diagnosis.json` no runner, mas o contrato atual continua ancorado em artefatos e nomenclatura v1 como `evidence-bundle.json`, `assessment`, `investigations/<round-id>` e `/target_investigate_case`; este ticket precisa reconciliar esses artefatos com o caminho minimo v2 sem reabrir a ownership de Telegram/summary.
- 2026-04-08 22:50Z - `src/integrations/target-investigate-case-round-preparer.ts` ainda executa `completeSemanticReviewIfSupported(...)`, `completeCausalDebugIfSupported(...)` e `completeRootCauseReviewIfSupported(...)` em sequencia dentro do preparo da rodada; portanto, o gap do caminho minimo nao se resolve apenas com manifesto/enum, ele exige desacoplamento real da orquestracao.
- 2026-04-08 22:50Z - O prompt `prompts/16-target-investigate-case-round-materialization.md` ja fala em `diagnosis.*` como artefato principal, mas ainda carrega o comando v1, `assessment.json`, `evidence-bundle.json`, `dossier.*` e `investigations/<round-id>` como espinha dorsal; ha drift documental concreto entre a etapa ja fechada de `diagnosis.*` e o contrato minimo pedido por esta spec.
- 2026-04-08 22:50Z - `src/types/target-investigate-case.ts` centraliza constantes, enums finitos, schemas e helpers do fluxo; o lugar mais seguro para aterrar o conjunto canonico v2 e continuar com cobertura positiva/negativa e esse modulo, nao checks ad hoc espalhados.
- 2026-04-08 22:50Z - A spec nao fixa o caminho do arquivo do manifesto v2; para eliminar ambiguidade sem mutacao silenciosa da v1, este plano assume um manifesto v2 distinto por default e registra isso como decisao executiva revisavel apenas se o repositorio ja tiver uma convencao local melhor antes do patch.
- 2026-04-08 23:00Z - O comando v2 nao fica acessivel so com `parseTargetInvestigateCaseCommand(...)`: `src/core/runner.ts`, `src/types/state.ts`, `src/types/target-flow.ts` e `src/integrations/telegram-bot.ts` ainda assumem unicamente `target-investigate-case` / `/target_investigate_case`; sem wiring minimo nessas camadas, o contrato ficaria tipado mas inoperavel para o operador.
- 2026-04-08 23:00Z - A avaliacao runner-side ja tolera a ausencia de `semantic-review`, `causal-debug` e `root-cause-review` quando os packets nao existem; o bloqueio do caminho minimo esta na materializacao automatica desses subfluxos e na escolha do namespace canonico, nao em uma dependencia estrutural inevitavel da fase de avaliacao.
- 2026-04-09 01:40Z - `evaluateTargetInvestigateCaseRound(...)` ainda re-normalizava inputs ja normalizados e rebaixava `/target_investigate_case_v2` para o comando legado; sem preservar `canonicalCommand`, a avaliacao voltava a buscar `docs/workflows/target-case-investigation-manifest.json` e quebrava o contrato v2 apenas na fase de publication/evaluation.
- 2026-04-09 02:00Z - Tornar `evidenceIndexPath` explicito no shape comum revelou um edge case legado: `relativePathExists(projectPath, "")` fazia `fs.access(projectPath)` e tratava o root do projeto como se `evidence-index.json` existisse; foi preciso endurecer o guard para paths vazios antes de reutilizar a malha v1.
- 2026-04-09 02:10Z - O wiring minimo de `/target_investigate_case_v2` exigiu mais do que registrar o comando principal: o runner ainda mapeava `target-investigate-case-v2` para `target-derive-preflight`, e o Telegram precisava de aliases dedicados de `status/cancel` para evitar replies inconsistentes durante o fluxo ativo.

## Decision Log
- 2026-04-08 - Decisao: introduzir a v2 como contrato paralelo explicito ao inves de substituir a v1 in-place.
  - Motivo:
    o ticket e a spec herdam o default de que a v2 entra como novo contrato explicito, nao como mutacao silenciosa da v1.
  - Impacto:
    o plano parte de novos simbolos v2 para comando/flow/manifesto/estagios e preserva a v1 apenas como legado/adaptador, evitando quebrar rounds historicos por sobrescrita implicita.
- 2026-04-08 - Decisao: adotar por default um manifesto dedicado `docs/workflows/target-case-investigation-v2-manifest.json`.
  - Motivo:
    a spec exige contrato explicito, mas nao fixa filename; um arquivo novo reduz ambiguidade, torna a linha v2 auditavel e evita que `docs/workflows/target-case-investigation-manifest.json` mude de semantica sem deixar trilha clara.
  - Impacto:
    se, durante a execucao, o codigo existente mostrar uma convencao local superior e inequivamente v2, a decisao pode ser revista no `Decision Log`, mas o executor nao deve substituir a v1 em silencio.
- 2026-04-08 - Decisao: manter sem consolidacao os conjuntos finitos herdados do ticket/spec.
  - Motivo:
    o checklist de qualidade exige preservar membros explicitos de allowlists/enums pequenos quando eles sao parte do requisito.
  - Impacto:
    a matriz de validacao cobrira explicitamente comando, flow, estagios, artefatos minimos, `diagnosis.json.verdict`, owners/executors canonicos e rejeicao fora do conjunto.
- 2026-04-08 - Decisao: limitar a ownership deste ticket a contrato minimo, manifesto, orquestracao minima, namespace e `lineage`, sem reabsorver superficies operator-facing nem a modelagem completa das continuacoes opcionais.
  - Motivo:
    o ticket fechado de `diagnosis.*` e o ticket aberto de continuacoes opcionais ja delimitam ownership observavel nessa linhagem.
  - Impacto:
    quaisquer ajustes em summary/trace/Telegram ou em precondicoes tardias de `deep-dive`/`publication` so entram aqui se forem estritamente necessarios para os closure criteria do caminho minimo; o restante permanece nos tickets irmaos.
- 2026-04-08 - Decisao: o caminho minimo precisa parar antes da publication, mesmo que a malha atual ainda tenha publication wired.
  - Motivo:
    o closure criterion deste ticket exige que `preflight -> resolve-case -> assemble-evidence -> diagnosis` exista sem depender de `ticket-proposal.json` nem `publication-decision.json`.
  - Impacto:
    a execucao deste plano deve remover publication como dependencia obrigatoria do minimo viavel; o desenho completo da continuacao tardia continua no ticket irmao de migracao/guardrails.
- 2026-04-08 - Decisao: incluir wiring minimo de runner/Telegram para o comando explicito v2, sem absorver UX alem do necessario para o ticket.
  - Motivo:
    a releitura da malha mostrou que aceitar o comando apenas em tipos/core nao torna o contrato executavel pelo operador.
  - Impacto:
    o patch pode tocar `src/core/runner.ts`, `src/types/state.ts` e `src/integrations/telegram-bot.ts` para expor `/target_investigate_case_v2` e os milestones correspondentes, mas sem redesenhar surfaces operator-facing fora do necessario.
- 2026-04-08 - Decisao: preservar `assessment.json` como artefato auxiliar de compatibilidade no v2, mas retirar sua cadeia repo-aware de qualquer obrigatoriedade do caminho minimo.
  - Motivo:
    o ticket fechado de `diagnosis.*` e a malha atual de summary/publication ainda reaproveitam `assessment.json`; removelo totalmente neste ticket aumentaria a blast radius e reabriria ownership alheia.
  - Impacto:
    o runner continua aceitando `assessment.json` quando ele existir, mas a rodada minima v2 deixa de disparar automaticamente `semantic-review`, `causal-debug` e `root-cause-review`, e os testes passam a provar esse desacoplamento.
- 2026-04-09 - Decisao: preservar `canonicalCommand` como autoridade de selecao do manifesto durante toda a avaliacao, em vez de re-normalizar objetos ja parseados.
  - Motivo:
    o bug de execucao mostrou que aceitar `TargetInvestigateCaseNormalizedInput` sem manter o comando recebido degradava silenciosamente a v2 para a v1 apenas no final da rodada.
  - Impacto:
    `loadTargetInvestigateCaseManifest(...)`, o executor e a avaliacao runner-side agora escolhem manifesto/flow/command coerentes tambem quando o input ja chega normalizado pelo lifecycle do runner.
- 2026-04-09 - Decisao: tratar `evidenceIndexPath=""` como ausencia explicita do artefato legado, nunca como path acessivel do projeto.
  - Motivo:
    o contrato comum passou a carregar `evidenceIndexPath`, mas rounds v1 continuam sem esse artefato; sem o guard, a retrocompatibilidade quebrava ao confundir a raiz do projeto com um artefato real.
  - Impacto:
    a avaliacao e o executor continuam aceitando v1 sem `evidence-index.json`, enquanto a v2 segue exigindo o artefato quando o manifesto o declara.

## Outcomes & Retrospective
- Status final:
  implementacao runner-side principal concluida, mas o fechamento tecnico terminou em `NO_GO` porque `lineage` nao ficou observavel em todos os artefatos exigidos pelo ticket.
- O que funcionou:
  a separacao entre contrato v2, artefatos `diagnosis.*` ja aterrados e continuacoes opcionais permitiu introduzir manifesto/namespace/flow v2 sem reabsorver a ownership integral dos tickets irmaos.
- O que ficou pendente:
  `case-resolution.json` e `case-bundle.json` ainda nao tem validacao/evidencia positiva de `lineage` quando a rodada nasce da v1; o fechamento do ticket foi dividido em follow-up local.
- Proximos passos:
  executar o follow-up `tickets/open/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`, preservar o fluxo sequencial e nao reabrir a modelagem completa das continuacoes opcionais.

## Context and Orientation
- Ticket alvo:
  `tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
- Spec de origem:
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  `RF-01`, `RF-02`, `RF-04`, `RF-05`, `RF-06`, `RF-07`, `RF-09`, `RF-10`, `RF-11`, `RF-12`, `RF-13`, `RF-14`, `RF-23`, `RF-24`, `RF-25`, `CA-01`, `CA-02`, `CA-04`, `CA-06`.
- RNFs e restricoes herdadas que precisam ficar observaveis neste ticket:
  preservar publication runner-side conservadora e anti-overfit;
  manter o runner target-agnostic;
  reduzir custo cognitivo do caminho minimo;
  nao acoplar o runner a logica, dados, scripts ou superficies de um target especifico;
  nao transformar a v2 em camada obrigatoria sobre `semantic-review -> causal-debug -> root-cause-review`;
  manter o target como autoridade semantica do caso e dos insumos relevantes.
- Assumptions / defaults adotados para eliminar ambiguidade:
  a v2 sera introduzida como contrato aditivo e explicito, convivendo com a v1 durante a migracao;
  por default, o manifesto v2 sera materializado em `docs/workflows/target-case-investigation-v2-manifest.json`, mantendo o manifesto atual como legado v1;
  `output/case-investigation/<round-id>/` sera a fonte autoritativa da rodada v2 no target, e `investigations/<round-id>/` permanecera apenas como espelho secundario enquanto a migracao ainda exigir;
  o caminho minimo termina em `diagnosis` e nao deve criar dependencia obrigatoria de `deep-dive`, `improvement-proposal`, `ticket-projection` ou `publication`;
  o contrato de `diagnosis.*` ja aterrado no repositorio deve ser reutilizado e, quando necessario, ajustado apenas na parte em que conflitar com `case-bundle.json` / `evidence-index.json` e com a orquestracao minima;
  quando houver `promptPath` e `entrypoint` no mesmo estagio target-owned, o `entrypoint` continua autoridade operacional do estagio e o prompt so o contextualiza, como a spec exige.
- Arquivos e superficies principais a reler na execucao:
  `src/types/target-investigate-case.ts`
  `src/types/target-flow.ts`
  `src/core/target-investigate-case.ts`
  `src/integrations/target-investigate-case-round-preparer.ts`
  `src/integrations/codex-client.ts`
  `docs/workflows/target-case-investigation-manifest.json`
  `prompts/16-target-investigate-case-round-materialization.md`
  `src/core/target-investigate-case.test.ts`
  `src/integrations/target-investigate-case-round-preparer.test.ts`
  `src/integrations/codex-client.test.ts`
- Fronteira de ownership com tickets irmaos:
  `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md` continua dono das superficies `diagnosis.*`, summary, trace e Telegram; este plano so toca essas superficies se uma mudanca minima de nome/path/shape for inevitavel para manter o caminho minimo coerente.
  `tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md` continua dono da modelagem tardia de `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication` e dos guardrails de migracao; este plano so deve remover dependencias obrigatorias dessas etapas sobre o caminho minimo, nao desenhar toda a continuacao.
- Allowlists / enumeracoes finitas herdadas e sem consolidacao neste plano:
  comando canonico v2: `/target_investigate_case_v2`;
  flow canonico v2: `target-investigate-case-v2`;
  estagios aceitos exatamente: `resolve-case`, `assemble-evidence`, `diagnosis`, `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`;
  caminho minimo aceito exatamente: `preflight -> resolve-case -> assemble-evidence -> diagnosis`;
  artefatos minimos obrigatorios do caminho minimo: `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md`, `diagnosis.json`;
  ownership declarativa minima por estagio target-owned: `owner = "target-project"` e `runnerExecutor = "codex-flow-runner"`;
  `diagnosis.json.verdict` aceito exatamente: `ok`, `not_ok`, `inconclusive`;
  `publicationPolicy` minima: `semanticAuthority = "target-project"` e `finalPublicationAuthority = "runner"`;
  nomes legados que precisam falhar ou ficar explicitamente fora do conjunto v2 quando usados como estagio canonico: `case-resolution`, `evidence-collection`, `assessment`, `semantic-review`, `causal-debug`, `root-cause-review`, `remediation-proposal`.

## Plan of Work
- Milestone 1:
  - Entregavel:
    identidade v2 explicita no runner, incluindo `TargetFlowKind`/`TargetFlowCommand`/milestones v2, constantes v2, manifesto dedicado e validadores dos conjuntos finitos.
  - Evidencia de conclusao:
    o loader/validator aceita `/target_investigate_case_v2`, `target-investigate-case-v2` e exatamente os sete estagios canonicos, enquanto rejeita nomes fora do conjunto.
  - Arquivos esperados:
    `src/types/target-flow.ts`
    `src/types/target-investigate-case.ts`
    `docs/workflows/target-case-investigation-v2-manifest.json`
    testes correlatos do fluxo
- Milestone 2:
  - Entregavel:
    orquestracao runner-side do caminho minimo diagnosis-first sem dependencia estrutural da cadeia v1 ou de artefatos opcionais tardios.
  - Evidencia de conclusao:
    a execucao/preparo da rodada consegue atravessar `preflight -> resolve-case -> assemble-evidence -> diagnosis`, exige `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`, e nao exige `ticket-proposal.json` nem `publication-decision.json`.
  - Arquivos esperados:
    `src/core/target-investigate-case.ts`
    `src/integrations/target-investigate-case-round-preparer.ts`
    `prompts/16-target-investigate-case-round-materialization.md`
    `src/integrations/codex-client.ts` se o carregamento de prompt/stage precisar ser ajustado
- Milestone 3:
  - Entregavel:
    fronteira cross-repo observavel no manifesto v2, com estagios target-owned, `promptPath`/`entrypoint`, `artifacts`, `policy`, `publicationPolicy`, namespace autoritativo e `lineage` alinhados a v2.
  - Evidencia de conclusao:
    o manifesto v2 rejeita estagio target-owned sem `owner`, `runnerExecutor`, `artifacts`, `policy` ou `promptPath` quando houver instrucao semantica; `output/case-investigation/<round-id>/` aparece como fonte primaria; `investigations/<round-id>/` fica explicitamente secundario.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`
    `docs/workflows/target-case-investigation-v2-manifest.json`
    `src/core/target-investigate-case.ts`
    `src/integrations/target-investigate-case-round-preparer.ts`
- Milestone 4:
  - Entregavel:
    cobertura automatizada e revisao final da fronteira de ownership sem regressao silenciosa para os tickets irmaos.
  - Evidencia de conclusao:
    suites focadas e `npm run check` terminam em `exit 0`, e o diff final mostra que o changeset ficou concentrado em contrato minimo, orquestracao, manifesto, prompt/loading e testes.
  - Arquivos esperados:
    `src/core/target-investigate-case.test.ts`
    `src/integrations/target-investigate-case-round-preparer.test.ts`
    `src/integrations/codex-client.test.ts`
    eventuais fixtures compartilhadas estritamente necessarias

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n 'TARGET_INVESTIGATE_CASE_(COMMAND|MANIFEST_PATH|ROUNDS_DIR)|target-investigate-case|case-resolution|evidence-bundle|assessment|semantic-review|causal-debug|root-cause-review|publication-decision' src docs prompts` para reabrir todos os anchors v1 que precisam ser substituidos ou preservados explicitamente como legado.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-flow.ts` para introduzir kind/comando/milestones v2 de forma aditiva, mantendo a v1 explicita durante a migracao e garantindo que a lista canonica de estagios v2 nao aceite nomes fora do conjunto.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-investigate-case.ts` para:
   - introduzir constantes/paths/schema version do contrato v2;
   - modelar manifesto v2 e seus estagios target-owned;
   - alinhar artefatos minimos `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md`, `diagnosis.json`;
   - exigir `lineage` nos schemas relevantes quando a rodada nascer da v1;
   - validar `publicationPolicy` com `semanticAuthority = "target-project"` e `finalPublicationAuthority = "runner"`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `docs/workflows/target-case-investigation-v2-manifest.json` com o shape minimo v2, incluindo `flow = "target-investigate-case-v2"`, `stages.resolveCase`, `stages.assembleEvidence`, `stages.diagnosis`, slots opcionais suportados, `publicationPolicy`, namespace autoritativo do target e convencao de `promptPath` `docs/workflows/target-investigate-case-v2-<stage>.md`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.ts` para carregar o contrato v2, mapear o caminho minimo, validar que `resolve-case`/`assemble-evidence`/`diagnosis` existem e parar antes das continuacoes opcionais por default; se a rodada vier da v1, registrar `lineage` explicitamente em `case-resolution.json`, `case-bundle.json` e `diagnosis.json`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/target-investigate-case-round-preparer.ts` e, se necessario, em `src/integrations/codex-client.ts` para remover a dependencia obrigatoria de `semantic-review -> causal-debug -> root-cause-review`, copiar/materializar o namespace autoritativo `output/case-investigation/<round-id>/` e manter `investigations/<round-id>/` apenas como espelho secundario controlado.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `prompts/16-target-investigate-case-round-materialization.md` somente na parte necessaria para refletir comando/flow/stages/artefatos/namespace v2 do caminho minimo, sem absorver a ownership completa das continuacoes opcionais.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/integrations/codex-client.test.ts` para cobrir:
   - comando e flow v2;
   - sete estagios aceitos e rejeicao fora do conjunto;
   - artefatos minimos obrigatorios;
   - exigencia de `owner`, `runnerExecutor`, `artifacts`, `policy`, `promptPath` e `publicationPolicy`;
   - independencia do caminho minimo em relacao a `semantic-review`, `causal-debug`, `root-cause-review`, `ticket-proposal.json` e `publication-decision.json`;
   - namespace autoritativo e `lineage`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` para validar os closure criteria automatizados diretamente ligados ao contrato minimo v2.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar tipagem/coerencia do novo contrato v2 no repositorio.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff --name-only` e `git diff --stat` para revisar a fronteira final do changeset e confirmar que este ticket nao absorveu a ownership integral do ticket fechado de `diagnosis.*` nem a modelagem completa das continuacoes opcionais do ticket irmao ainda aberto.

## Validation and Acceptance
- Regra de cobertura para allowlists / enumeracoes finitas:
  nenhuma consolidacao sera usada neste ticket. A matriz abaixo preserva explicitamente comando, flow, estagios, ownership minima, artefatos minimos, `publicationPolicy`, namespace e `diagnosis.json.verdict`; a validacao deve provar cobertura positiva do conjunto aceito e negativa fora dele quando isso faz parte do closure criterion.
- Matriz requisito -> validacao observavel:
  - `RF-01 + RF-09 + RF-10 + RF-11 + CA-01`:
    `src/types/target-investigate-case.ts`, `src/types/target-flow.ts`, `src/core/target-investigate-case.ts` e o manifesto/documentacao v2 aceitam exatamente `flow = "target-investigate-case-v2"`, comando `/target_investigate_case_v2` e estagios `resolve-case`, `assemble-evidence`, `diagnosis`, `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`, rejeitando nomes fora do conjunto como `assessment`, `case-resolution`, `evidence-collection`, `semantic-review`, `causal-debug`, `root-cause-review` e `remediation-proposal`.
  - `RF-02 + RF-05 + RF-09 + RF-11 + CA-06`:
    o manifesto v2 vira a fonte de verdade cross-repo runner/target; o validador rejeita qualquer estagio target-owned sem `owner = "target-project"`, `runnerExecutor = "codex-flow-runner"`, `artifacts` e `policy`; quando o estagio usa instrucao semantica via Codex, `promptPath` passa a ser obrigatorio e segue a convencao `docs/workflows/target-investigate-case-v2-<stage>.md`; quando houver `entrypoint`, o contrato explicita que ele continua a autoridade operacional; `publicationPolicy` prova `semanticAuthority = "target-project"` e `finalPublicationAuthority = "runner"`.
  - `RF-06 + RF-07 + RF-12 + RF-13 + RF-14 + CA-02 + CA-04`:
    o runner consegue orquestrar `preflight -> resolve-case -> assemble-evidence -> diagnosis` sem exigir `deep-dive`, `ticket-proposal.json` ou `publication-decision.json`, materializando `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`; `assemble-evidence` fica explicitamente responsavel pelas instrucoes operacionais de coleta e pela indexacao auditavel das evidencias do caso.
  - `RF-23 + RF-24 + RF-25 + parcela runner-side de CA-06`:
    `case-resolution.json`, `case-bundle.json` e `diagnosis.json` carregam `lineage` quando a rodada nasce da v1; `output/case-investigation/<round-id>/` passa a ser a fonte primaria da rodada; `investigations/<round-id>/`, quando existir, fica apenas como espelho secundario; testes provam que o caminho minimo nao depende mais da cadeia `semantic-review -> causal-debug -> root-cause-review`.
  - `Validacoes pendentes herdadas`:
    o fechamento registra validacao observavel do manifesto v2 e dos novos schemas canonicos no runner, alem de prova explicita da separacao entre namespace autoritativo do target e espelho runner-side durante a migracao.
  - `Validacao automatizada do pacote`:
    as suites focadas de tipos/core/preparer/codex-client cobrindo o contrato v2 terminam em `exit 0`, junto com `npm run check`.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  - Esperado:
    `exit 0`, com casos positivos para o comando v2, `flow` v2, os sete estagios canonicos, `owner`/`runnerExecutor`/`publicationPolicy` aceitos, artefatos minimos obrigatorios, `diagnosis.json.verdict = ok|not_ok|inconclusive`, `lineage`/namespace autoritativo quando aplicavel, e casos negativos para estagios e nomes legados fora do conjunto.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado:
    `exit 0`, sem drift tipado entre `target-flow`, manifesto v2, executor, round preparer e suites.
- Comando:
  `rg -n 'target-investigate-case-v2|/target_investigate_case_v2|resolveCase|assembleEvidence|publicationPolicy|output/case-investigation' docs/workflows/target-case-investigation-v2-manifest.json src/types/target-investigate-case.ts src/core/target-investigate-case.ts`
  - Esperado:
    os anchors textuais do contrato v2 aparecem nas superfices corretas, e a revisao manual nao encontra o conjunto legado v1 sendo tratado como conjunto canonico v2.

## Idempotence and Recovery
- Idempotencia:
  a v2 e introduzida de forma aditiva e explicita; rerodar os mesmos testes no mesmo estado deve produzir o mesmo conjunto de aprovacoes/rejeicoes sem mutar silenciosamente a v1;
  o manifesto v2 e o conjunto de estagios aceitos devem ser derivados de uma unica fonte de verdade runner-side para evitar drift entre runtime, prompt loading e testes;
  `output/case-investigation/<round-id>/` deve continuar sendo a autoridade semantica da rodada, com `investigations/<round-id>/` apenas como espelho, de forma que repetir a sincronizacao nao crie uma segunda fonte de verdade.
- Riscos:
  o ticket fechado de `diagnosis.*` pode ter deixado fixtures e helpers ainda presos a `evidence-bundle.json`, exigindo reconciliacao cuidadosa para `case-bundle.json`;
  o `round-preparer` hoje chama automaticamente a cadeia v1, entao o desacoplamento do caminho minimo pode tocar mais pontos do que os observados inicialmente;
  a escolha do path exato do manifesto v2 e uma decisao deste plano; se surgir precedencia local melhor durante a execucao, isso precisa ser documentado para nao virar divergencia editorial;
  ha risco de overlap com o ticket irmao de continuacoes opcionais se a implementacao tentar desenhar toda a publication tardia em vez de so retirar sua obrigatoriedade do caminho minimo.
- Recovery / Rollback:
  se a introducao do manifesto v2 em arquivo novo revelar dependencia rigida de um path unico no codigo atual, adicionar adaptador explicito e documentado em vez de substituir o manifesto v1 in-place;
  se o desacoplamento do caminho minimo quebrar o fluxo atual por acoplamento escondido em `publication` ou na cadeia v1, restaurar a parte afetada e reintroduzir a mudanca por gate/branching explicito, mantendo blocker claro no `Progress`;
  se fixtures herdadas do ticket fechado de `diagnosis.*` quebrarem por rename de artefato, corrigir as fixtures na mesma rodada em vez de rebaixar novamente `evidence-bundle.json` a contrato primario;
  se a execucao comecar a absorver ownership integral de `deep-dive`, `ticket-projection` ou `publication`, parar e registrar blocker, porque essa modelagem pertence ao ticket irmao aberto.

## Artifacts and Notes
- Ticket alvo:
  `tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
- Spec de origem:
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- Referencias revisadas para este plano:
  `src/types/target-investigate-case.ts`
  `src/types/target-flow.ts`
  `src/core/target-investigate-case.ts`
  `src/integrations/target-investigate-case-round-preparer.ts`
  `docs/workflows/target-case-investigation-manifest.json`
  `prompts/16-target-investigate-case-round-materialization.md`
  `tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md`
  `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md`
- Artefatos esperados ao final da execucao:
  diff focado em contrato v2, manifesto v2, orquestracao minima, namespace/lineage, prompt/loading e testes;
  saida dos testes focados e de `npm run check`;
  manifest/documentacao v2 refletindo explicitamente comando, flow, estagios e fronteira target-owned/runner-side.
- Nota operacional:
  este plano assume execucao exclusivamente no `codex-flow-runner`; qualquer adocao em projeto alvo externo fica para a segunda onda explicitamente fora de escopo neste ticket.

## Interfaces and Dependencies
- Interfaces alteradas:
  `TargetFlowKind`, `TargetFlowCommand` e milestones v2 em `src/types/target-flow.ts`;
  constantes, schemas, validadores, `artifactPaths`, manifesto e enums finitos v2 em `src/types/target-investigate-case.ts`;
  loader/executor do fluxo em `src/core/target-investigate-case.ts`;
  round preparation / sync do namespace e prompt loading em `src/integrations/target-investigate-case-round-preparer.ts` e possivelmente `src/integrations/codex-client.ts`;
  prompt de materializacao `prompts/16-target-investigate-case-round-materialization.md`;
  manifesto/documentacao v2 em `docs/workflows/target-case-investigation-v2-manifest.json`.
- Compatibilidade:
  a v1 deve continuar explicitamente disponivel durante a migracao, sem perder rastreabilidade;
  a v2 nao pode depender da cadeia `semantic-review -> causal-debug -> root-cause-review` para concluir o caminho minimo;
  `diagnosis.*` continua sendo artefato principal da rodada, mas a ownership de renderizacao/operator surfaces permanece com o ticket fechado da linhagem, salvo ajustes minimos de compatibilidade;
  `publication` continua runner-side por politica, mas nao pode permanecer como obrigacao do caminho minimo.
- Dependencias externas e mocks:
  fixtures dos testes locais para manifesto/round preparation/codex client precisarao refletir o shape v2;
  a segunda onda em projetos alvo aderentes e dependencia posterior declarada pela spec, nao pre-requisito para concluir este ticket runner-side;
  o ticket agora fechado `tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md` permanece dependencia editorial para o desenho tardio completo das continuacoes opcionais e dos guardrails de migracao.
