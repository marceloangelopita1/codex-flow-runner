# ExecPlan - target-investigate-case-v2 diagnosis artifacts and operator surfaces

## Purpose / Big Picture
- Objetivo:
  materializar `diagnosis.md` e `diagnosis.json` como artefatos primarios da rodada v2 e tornar as superficies operator-facing do runner diagnosis-first, sem deslocar a autoridade semantica do target nem reabrir publication como manchete principal.
- Resultado esperado:
  o runner valida o contrato de `diagnosis.*`, usa `diagnosis.json` como fonte machine-readable para summary/trace/Telegram e expoe `diagnosis.md` como artefato humano principal, mantendo `publication` como informacao secundaria e opcional.
- Escopo:
  validacao estrutural de `diagnosis.md`;
  schema/tipos de `diagnosis.json` com enum finito explicito;
  descoberta/copia de `diagnosis.*` no pacote da rodada;
  adaptacao de `finalSummary`, `tracePayload`, `RunnerFlowSummary.details` e mensagem final do Telegram para diagnosis-first;
  testes focados de core/runner/round-preparer/Telegram e spot-check manual herdado do ticket.
- Fora de escopo:
  introduzir o comando `/target_investigate_case_v2`, o manifesto v2 e o caminho minimo `preflight -> resolve-case -> assemble-evidence -> diagnosis` como contrato canonico;
  modelar `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como continuações opcionais e tardias;
  mover semantica de dominio do target para o runner;
  fechar ticket, fazer commit/push ou normalizar tickets irmaos nesta etapa.

## Progress
- [x] 2026-04-08 22:14Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md` e de `docs/workflows/codex-quality-gates.md`.
- [x] 2026-04-08 22:14Z - Fronteira de ownership validada contra os tickets irmaos para evitar `duplication-gap` e `closure-criteria-gap`.
- [x] 2026-04-08 22:14Z - ExecPlan criado em `execplans/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md`.
- [x] 2026-04-08 22:41Z - Contrato `diagnosis.*` implementado no runner com schema/tipos/paths para `diagnosis.json`, validacao estrutural das oito secoes canonicas de `diagnosis.md` e carga obrigatoria desses artefatos na avaliacao da rodada.
- [x] 2026-04-08 22:41Z - Summary final, trace, `RunnerFlowSummary.details`, prompt/materializacao e mensagem final do Telegram migrados para diagnosis-first, mantendo `assessment.json`/`dossier.*` apenas como artefatos auxiliares de compatibilidade.
- [x] 2026-04-08 22:41Z - Suites focadas, `npm run check` e `npm test` concluidos com `exit 0`, incluindo cobertura positiva/negativa do enum `ok | not_ok | inconclusive` e das secoes canonicas de `diagnosis.md`.
- [ ] 2026-04-08 22:41Z - Spot-check manual em caso real segue pendente; nao houve rodada operacional `/target_investigate_case_v2` ou target aderente disponivel nesta etapa local do repositório.
- [x] 2026-04-08 22:46Z - Etapa de fechamento releu diff/ticket/spec/quality gates, confirmou `npx tsx --test ...`, `npm run check` e `npm test` com `exit 0`, classificou o resultado como `GO` e registrou a validacao manual externa pendente no ticket fechado sem abrir follow-up.

## Surprises & Discoveries
- 2026-04-08 22:14Z - O runner atual nao precisa apenas mudar renderizacao: `TargetInvestigateCaseArtifactSet`, `buildTargetInvestigateCaseArtifactSet()` e a validacao da rodada ainda estao ancorados em `assessment.json` e `dossier.md`, entao `diagnosis.*` toca descoberta de artefatos, tipos, trace e suites.
- 2026-04-08 22:14Z - `buildTargetInvestigateCaseFinalSummary()`, `buildTargetInvestigateCaseTracePayload()`, `RunnerFlowSummary.details` e `buildTargetInvestigateCaseReply()` hoje derivam a narrativa operator-facing de `assessment` + `publicationDecision`; mudar so o Telegram deixaria drift entre superficies.
- 2026-04-08 22:14Z - A validacao herdada de legibilidade de `diagnosis.md` nao pode ser totalmente automatizada: os testes cobrem shape e contratos finitos, mas o fechamento ainda depende de um spot-check manual em rodada real.
- 2026-04-08 22:41Z - O escopo desta etapa foi executavel sem absorver o ticket irmao de contrato: o comando atual `/target_investigate_case` ja conseguia carregar `diagnosis.*` no namespace runner-side, desde que `assessment.json` e `dossier.*` fossem preservados como compatibilidade temporaria.
- 2026-04-08 22:41Z - A validacao de `diagnosis.json.bundle_artifact` precisou ficar ancorada no `evidence-bundle.json` efetivo da rodada; fixtures de executor que apenas copiavam JSON legado ficaram stale ate receber rewrite explicito do path canonico.

## Decision Log
- 2026-04-08 - Decisao: preservar sem consolidacao os membros finitos herdados do ticket/spec.
  - Motivo:
    os `Closure criteria` exigem observabilidade explicita para `diagnosis.md`, `diagnosis.json`, `diagnosis.json.verdict = ok | not_ok | inconclusive` e para as oito secoes canonicas do markdown; um criterio agregado nao basta.
  - Impacto:
    a matriz de validacao e os testes focados precisam cobrir positivo e negativo para cada conjunto finito relevante.
- 2026-04-08 - Decisao: `diagnosis.json` sera a fonte canonica machine-readable do runner, enquanto `diagnosis.md` sera o artefato humano principal.
  - Motivo:
    o ticket pede surfaces diagnosis-first sem empurrar o runner para julgamento semantico; consumir um artefato estruturado do target reduz inferencia runner-side.
  - Impacto:
    `finalSummary`, `tracePayload`, `RunnerFlowSummary.details` e Telegram devem derivar de campos canonicos do `diagnosis.json`, enquanto `diagnosis.md` fica sujeito a validacao estrutural e spot-check humano.
- 2026-04-08 - Decisao: manter a fronteira de ownership explicita com os tickets irmaos.
  - Motivo:
    o ticket de contrato e dono do comando/manifesto/caminho minimo; o ticket de continuações opcionais e dono de `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication` e guardrails de migracao.
  - Impacto:
    se a execucao deste plano depender de scaffolding ainda nao entregue pelo ticket de contrato, a execucao deve parar com blocker explicito em vez de absorver escopo irmao.
- 2026-04-08 - Decisao: validar `diagnosis.md` por secoes canonicas nao vazias e manter clareza editorial como criterio manual.
  - Motivo:
    o runner pode provar shape e presenca das secoes, mas nao deve reescrever a semantica do diagnostico nem fingir que clareza humana cabe em assert sintetico.
  - Impacto:
    o fechamento exige combinar testes estruturais com spot-check manual documentado.
- 2026-04-08 - Decisao: manter `assessment.json` e `dossier.*` como artefatos auxiliares de compatibilidade nesta etapa.
  - Motivo:
    publication runner-side, ticket publisher e parte da malha legacy ainda dependem desses artefatos; removê-los aqui absorveria escopo dos tickets irmaos de contrato/migracao.
  - Impacto:
    `diagnosis.*` vira a fonte primaria das surfaces operator-facing agora, enquanto a limpeza completa do legado permanece explicitamente fora deste changeset.
- 2026-04-08 - Decisao: estender a matriz automatizada ate suites de `codex-client` e `target-investigate-case-ticket-publisher`.
  - Motivo:
    a introducao de novos artifact paths e campos obrigatorios em `TargetInvestigateCaseFinalSummary`/`TracePayload` alterou fixtures compartilhadas fora das suites centrais listadas inicialmente.
  - Impacto:
    a validacao automatizada cobre tambem drift de prompt injection e contratos de publication que seriam quebrados por tipagem/fixtures stale.

## Outcomes & Retrospective
- Status final:
  implementacao diagnosis-first concluida no runner; validacao manual operacional permanece pendente.
- O que funcionou:
  o runner agora valida `diagnosis.json`/`diagnosis.md`, carrega `diagnosis.*` como artefatos primarios, abre summary/trace/Telegram com veredito/summary/why/next_action do diagnostico e preserva publication como secundaria;
  a cobertura automatizada fechou tanto o enum finito `ok | not_ok | inconclusive` quanto a matriz das oito secoes canonicas do markdown;
  a migracao permaneceu dentro desta etapa sem exigir manifesto/comando v2 novos.
- O que ficou pendente:
  spot-check manual em caso real validando legibilidade de `diagnosis.md` em menos de 2 minutos e consistencia diagnosis-first no Telegram;
  reconciliacao operacional posterior que anexe essa evidencia manual ao historico da linhagem, sem reabrir este ticket tecnico.
- Proximos passos:
  executar uma rodada operacional aderente para registrar `diagnosis.md`, `diagnosis.json` e a mensagem final do Telegram como evidencia manual;
  manter essa validacao como pendencia operacional externa, sem bloquear o changeset tecnico ja concluido.

## Context and Orientation
- Parent ticket:
  `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md`
- Spec de origem:
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  `RF-15`, `RF-16`, `RF-17`, `RF-18`, `RF-26`, `CA-02`, `CA-03`, `CA-07`.
- RNFs e restricoes herdadas que precisam ficar observaveis neste ticket:
  reduzir custo cognitivo e priorizar legibilidade humana;
  manter o target como autoridade semantica do diagnostico;
  tornar summary, trace e Telegram diagnosis-first;
  nao deslocar o runner para julgamento semantico de dominio;
  nao esconder publication runner-side, mas rebaixa-la a informacao secundaria;
  manter rastreabilidade cross-repo sem exigir que o operador abra varios JSONs auxiliares.
- Assumptions / defaults adotados:
  `diagnosis.md` e `diagnosis.json` sao os artefatos principais da rodada por default;
  o caminho minimo nao depende de `deep-dive`, `ticket-projection` nem `publication`;
  o operador deve conseguir entender `diagnosis.md` em menos de 2 minutos;
  `diagnosis.json` abastece summary/trace/Telegram a partir de `verdict`, `summary`, `why`, `behavior_to_change`, `probable_fix_surface` e `next_action`, sem reinterpretacao runner-side;
  `diagnosis.md` sera validado por heading canonico + conteudo nao vazio em cada secao; avaliacao de clareza editorial permanece manual;
  nao ha consolidacao dos conjuntos finitos herdados porque o ticket exige observabilidade literal deles.
- Members explicitos herdados do ticket/spec, preservados sem consolidacao:
  artefatos primarios: `diagnosis.md` e `diagnosis.json`;
  enum finito de `diagnosis.json.verdict`: `ok`, `not_ok`, `inconclusive`;
  secoes obrigatorias de `diagnosis.md`: `Veredito`, `Workflow avaliado`, `Objetivo esperado`, `O que a evidência mostra`, `Por que o caso está ok ou não está`, `Comportamento que precisa mudar`, `Superfície provável de correção`, `Próxima ação`.
- Fronteira de ownership com tickets irmaos:
  `tickets/open/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md` e dono do comando/manifesto/caminho minimo/namespace v2;
  este ticket e dono de `diagnosis.*`, suas validacoes e das superficies operator-facing diagnosis-first;
  `tickets/open/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md` e dono das continuações opcionais, de `publication` tardia e dos guardrails de migracao.
- Arquivos principais no estado atual:
  `src/types/target-investigate-case.ts`
  `src/core/target-investigate-case.ts`
  `src/core/runner.ts`
  `src/integrations/telegram-bot.ts`
  `src/integrations/target-investigate-case-round-preparer.ts`
  `prompts/16-target-investigate-case-round-materialization.md`
  `src/core/target-investigate-case.test.ts`
  `src/core/runner.test.ts`
  `src/integrations/telegram-bot.test.ts`
  `src/integrations/target-investigate-case-round-preparer.test.ts`
- Fluxo atual relevante:
  `buildTargetInvestigateCaseArtifactSet()` ainda constroi `assessment.json`, `dossier.md` e `publication-decision.json`;
  `buildTargetInvestigateCaseFinalSummary()` e `buildTargetInvestigateCaseTracePayload()` ainda partem de `assessment` + `publicationDecision`;
  `RunnerFlowSummary.details` e `buildTargetInvestigateCaseReply()` ainda nao consomem um artefato diagnostico canonico.
- Dependencia operacional importante:
  este plano assume que o scaffolding do ticket de contrato ja existe ou sera entregue antes dos passos que consomem o caminho minimo v2; sem isso, a execucao deve parar explicitamente em `blocked`.

## Plan of Work
- Milestone 1 - Contrato `diagnosis.*` observavel no runner
  - Entregavel:
    schemas, tipos, paths e validadores do runner passam a reconhecer `diagnosis.md` e `diagnosis.json` como artefatos primarios da rodada.
  - Evidencia de conclusao:
    os tipos do fluxo aceitam exatamente `diagnosis.json.verdict = ok | not_ok | inconclusive`, rejeitam valores fora do conjunto e exigem as oito secoes canonicas em `diagnosis.md`.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`
    `src/core/target-investigate-case.ts`
    `src/integrations/target-investigate-case-round-preparer.ts`
    `prompts/16-target-investigate-case-round-materialization.md`
    `src/core/target-investigate-case.test.ts`
    `src/integrations/target-investigate-case-round-preparer.test.ts`
- Milestone 2 - Summary e trace diagnosis-first
  - Entregavel:
    `TargetInvestigateCaseFinalSummary`, `TargetInvestigateCaseTracePayload` e `RunnerFlowSummary.details` passam a abrir com o veredito do diagnostico e a tratar publication como continuidade secundaria.
  - Evidencia de conclusao:
    uma rodada completada sem `deep-dive`, `ticket-projection` ou `publication` continua inteligivel e diagnosis-first; quando publication existir, ela aparece depois do diagnostico.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`
    `src/core/target-investigate-case.ts`
    `src/core/runner.ts`
    `src/core/target-investigate-case.test.ts`
    `src/core/runner.test.ts`
- Milestone 3 - Superficies operator-facing diagnosis-first
  - Entregavel:
    o resumo textual final e a mensagem do Telegram passam a destacar `verdict`, `summary`, `why`, `behavior_to_change`, `probable_fix_surface` e `next_action` do `diagnosis`, com paths de artefato claros para o operador.
  - Evidencia de conclusao:
    os testes do bot e do renderer mostram `publication_status` como detalhe secundario e preservam consistencia com o `diagnosis.json` canonico.
  - Arquivos esperados:
    `src/core/target-investigate-case.ts`
    `src/integrations/telegram-bot.ts`
    `src/core/runner.ts`
    `src/integrations/telegram-bot.test.ts`
    `src/core/runner.test.ts`
- Milestone 4 - Validacao automatizada e spot-check manual
  - Entregavel:
    a matriz automatizada fecha os contratos finitos e o fechamento registra evidencias reais de legibilidade/consistencia diagnosis-first.
  - Evidencia de conclusao:
    suites focadas + `npm run check` + regressao ampla terminam em `exit 0`, e um caso real confirma `diagnosis.md` legivel e Telegram consistente.
  - Arquivos esperados:
    `src/core/target-investigate-case.test.ts`
    `src/integrations/target-investigate-case-round-preparer.test.ts`
    `src/core/runner.test.ts`
    `src/integrations/telegram-bot.test.ts`
    `src/integrations/workflow-trace-store.test.ts` quando os arrays de artefatos mudarem
    o proprio ticket e este ExecPlan atualizados com a evidencia manual

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "assessment.json|dossier.md|publication-decision.json|buildTargetInvestigateCaseFinalSummary|buildTargetInvestigateCaseTracePayload|buildTargetInvestigateCaseReply|artifactPaths" src/core src/types src/integrations` para reconfirmar os pontos ainda publication-first e a blast radius real da migracao para `diagnosis.*`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-investigate-case.ts` para introduzir schema/type de `diagnosis.json`, validador estrutural de `diagnosis.md`, novos `diagnosisMdPath`/`diagnosisJsonPath` em `TargetInvestigateCaseArtifactPaths` e `TargetInvestigateCaseArtifactSet`, e campos diagnosis-first em `TargetInvestigateCaseFinalSummary` e `TargetInvestigateCaseTracePayload`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.ts` para localizar, validar e carregar `diagnosis.md` e `diagnosis.json`, falhar com blocker explicito quando o shape estiver fora do contrato herdado e usar o diagnostico como fonte primaria de summary/trace/renderizacao final.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/target-investigate-case-round-preparer.ts` e em `prompts/16-target-investigate-case-round-materialization.md` somente na porcao necessaria para que a rodada copie/espelhe `diagnosis.md` e `diagnosis.json` como artefatos primarios; se a migracao do caminho minimo v2 ainda nao tiver pousado pelo ticket irmao de contrato, parar aqui com blocker explicito em vez de absorver manifesto/estagios irmaos.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.ts` e `src/integrations/telegram-bot.ts` para que `details`, resumo final e mensagem de conclusao abram com o veredito do `diagnosis`, deixem `publication_status` em segundo plano e permaneçam inteligiveis sem `deep-dive`, `ticket-projection` ou `publication`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e, se os arrays de artefatos/versioned artifacts mudarem, `src/integrations/workflow-trace-store.test.ts`, cobrindo explicitamente os membros finitos do enum e das secoes canonicas.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts` para validar o contrato diagnosis-first nas suites focadas.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` e depois `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para confirmar tipagem e regressao ampla do repositorio.
9. (workdir: `n/a` - ambiente operacional/Telegram) Acionar uma rodada real diagnosis-first em target aderente, anexar no historico da linhagem o `diagnosis.json.verdict`, o texto relevante de `diagnosis.md` e a mensagem final do Telegram, e registrar se a leitura do markdown ficou realmente entendivel em menos de 2 minutos; se nao houver target aderente ou caso real disponivel nesta etapa, registrar a pendencia `external/manual` no ticket fechado sem reabrir follow-up tecnico.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - `RF-15 + RF-17 + CA-02`: a rodada materializa `diagnosis.md` e `diagnosis.json`; o schema aceita exatamente `verdict = ok`, `not_ok`, `inconclusive`; os testes provam parse positivo para os tres membros e falha para pelo menos um valor fora do conjunto.
  - `RF-16 + CA-03`: `diagnosis.md` exige exatamente as secoes `Veredito`, `Workflow avaliado`, `Objetivo esperado`, `O que a evidência mostra`, `Por que o caso está ok ou não está`, `Comportamento que precisa mudar`, `Superfície provável de correção`, `Próxima ação`; os testes provam presenca positiva de cada secao e falha quando qualquer heading obrigatorio falta, e renomeado ou fica vazio.
  - `RF-18 + RF-26 + CA-07`: `renderTargetInvestigateCaseFinalSummary()`, `TargetInvestigateCaseTracePayload`, `RunnerFlowSummary.details` e Telegram passam a abrir com `verdict`/`summary`/`why`/`next_action` do `diagnosis`, continuam inteligiveis sem `deep-dive`, `ticket-projection` ou `publication`, e deixam `publication_status` fora da manchete principal.
  - `Assumptions/defaults herdados`: `diagnosis.md` permanece compreensivel isoladamente, sem exigir abertura de varios JSONs auxiliares para entender objetivo, evidencia, porque o caso esta ok ou nao esta, comportamento a mudar, superficie provavel de correcao e proxima acao.
  - `Validacao pendente herdada`: o fechamento registra um spot-check manual em caso real confirmando que `diagnosis.md` foi entendido por um operador em menos de 2 minutos e que a mensagem do Telegram preservou o mesmo veredito diagnosis-first.
  - `Validacao automatizada do pacote`: as suites focadas de core/runner/round-preparer/Telegram e `npm run check` terminam em `exit 0`; `npm test` tambem termina em `exit 0` como regressao ampla recomendada para uma frente com alto risco de drift.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts`
  - Esperado:
    `exit 0` com cobertura positiva/negativa para `diagnosis.json.verdict`, para as oito secoes de `diagnosis.md` e para a narrativa diagnosis-first em core/runner/Telegram.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado:
    `exit 0` com tipos/schemas/paths diagnosis-first coerentes.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado:
    `exit 0` sem regressao nas suites amplas do repositorio.
- Comando operacional:
  `/target_investigate_case_v2 ...`
  - Esperado:
    a rodada grava `diagnosis.md` e `diagnosis.json` no namespace autoritativo esperado, o Telegram abre com o mesmo veredito diagnosis-first e o historico registra a evidencia manual; se esse comando nao puder ser executado nesta etapa por ausencia de target aderente, a entrega tecnica ainda pode ser encerrada como `GO/fixed` desde que a pendencia `external/manual` fique explicitamente registrada no ticket fechado.

## Idempotence and Recovery
- Idempotencia:
  a execucao deve ser repetivel sem reinterpretar semantica do target; reexecutar as suites e rerodar a leitura dos artefatos deve produzir o mesmo veredito diagnosis-first para o mesmo round.
- Riscos:
  dependencia ainda nao pousada do ticket de contrato v2;
  grande blast radius em fixtures por mudanca de artifact paths e summary/trace;
  tentacao de inferir `diagnosis` a partir de `assessment` e `publicationDecision`, perpetuando a hierarquia errada da v1;
  ausencia de target aderente para o spot-check manual final.
- Recovery / Rollback:
  se o ticket de contrato ainda nao tiver entregue o scaffolding v2 necessario, parar em `blocked` e consumir primeiro aquele changeset;
  se a mudanca quebrar compatibilidade com rounds antigos, introduzir adaptacao explicita e temporaria para legado sem recolocar `assessment.json` como fonte de verdade do diagnostico;
  se a alteracao do Telegram ou do resumo final gerar drift, reancorar ambas as superficies nos mesmos campos canonicos de `diagnosis.json` antes de prosseguir;
  se o spot-check manual nao puder ser executado por dependencia externa, registrar `external/manual` no ticket fechado e manter a pendencia apenas como validacao operacional posterior.

## Artifacts and Notes
- Ticket alvo:
  `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md`
- Spec de origem:
  `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- Ticket irmao de contrato:
  `tickets/open/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
- Ticket irmao de continuações opcionais:
  `tickets/open/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md`
- Docs/prompt correlatos:
  `docs/workflows/codex-quality-gates.md`
  `prompts/16-target-investigate-case-round-materialization.md`
- Evidencias esperadas ao final da execucao:
  diff com schema/type/path diagnosis-first;
  saida das suites focadas e de `npm run check`/`npm test`;
  um round real contendo `diagnosis.md`, `diagnosis.json`, payload de trace diagnosis-first e texto final do Telegram consistente com o veredito.

## Interfaces and Dependencies
- Interfaces alteradas:
  `TargetInvestigateCaseArtifactPaths`
  `TargetInvestigateCaseArtifactSet`
  schema/type de `diagnosis.json`
  validador estrutural de `diagnosis.md`
  `TargetInvestigateCaseFinalSummary`
  `TargetInvestigateCaseTracePayload`
  `RunnerFlowSummary.details`
  mensagem final de `/target_investigate_case`
- Compatibilidade:
  o runner deve continuar target-agnostic e nao pode deduzir diagnostico por heuristica runner-side;
  publication continua runner-side, mas nao pode mais ser a manchete principal;
  qualquer compatibilidade com legado deve ser explicita e temporaria, sem sabotar a autoridade de `diagnosis.json`.
- Dependencias externas e mocks:
  depende do scaffolding entregue pelo ticket irmao de contrato para o fluxo v2;
  nao depende do ticket irmao de continuações opcionais para fechar os `Closure criteria` deste ticket;
  os testes devem continuar usando fixtures/stubs locais do runner;
  o spot-check manual depende de um target aderente e de um caso real executavel em ambiente operacional.
