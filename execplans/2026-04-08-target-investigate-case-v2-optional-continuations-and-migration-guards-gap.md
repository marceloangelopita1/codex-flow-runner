# ExecPlan - target-investigate-case-v2 optional continuations and migration guards gap

## Purpose / Big Picture
- Objetivo:
  transformar `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` em continuacoes opcionais e tardias observaveis no contrato v2, enquanto rebaixa `semantic-review`, `causal-debug` e `root-cause-review` a adaptadores de migracao explicitos e documenta a segunda onda de adocao nos targets aderentes.
- Resultado esperado:
  o runner passa a distinguir de forma auditavel o caminho minimo diagnosis-first das continuacoes tardias; `publication-decision.json` deixa de ser artefato obrigatorio do caminho minimo e so aparece quando a rodada realmente atravessar `publication`; `ticket-projection` passa a materializar `ticket-proposal.json` no namespace autoritativo do target com validacao ancorada nas convencoes declaradas pelo proprio projeto alvo; a documentacao de compatibilidade registra runner-first agora e segunda onda target-side depois, sem transformar `../guiadomus-matricula` em contrato global.
- Escopo:
  explicitar no contrato v2 as precondicoes, ordem tardia e ownership de `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication`;
  introduzir guardrails de migracao que limitem a ponte legado-v1 exatamente a `semantic-review`, `causal-debug` e `root-cause-review`, sem recoloca-los como backbone obrigatorio;
  desacoplar a avaliacao runner-side do write sempre obrigatorio de `publication-decision.json` no caminho minimo v2;
  alinhar `ticket-projection` ao namespace autoritativo do target e as convencoes declaradas em `ticketPublicationPolicy` / `ticket-proposal.json`, sem criar contrato paralelo;
  atualizar a documentacao do runner para deixar explicita a segunda onda de tickets nos targets aderentes e a fronteira runner-side vs target-side nesta migracao;
  expandir testes focados e validacoes documentais para os closure criteria deste ticket.
- Fora de escopo:
  reabrir a ownership do ticket fechado de contrato minimo, `lineage` ou namespace v2;
  redesenhar `diagnosis.md`, `diagnosis.json`, summary final, trace ou Telegram alem do estritamente necessario para manter coerencia quando `publication` estiver ausente;
  implementar a segunda onda em qualquer projeto alvo externo;
  reativar publication automatica por default ou remover o conservadorismo runner-side;
  fechar ticket, fazer commit/push ou executar rodada manual em target externo nesta etapa de planejamento.

## Progress
- [x] 2026-04-09 00:20Z - Leitura integral do ticket alvo, da spec de origem, de `PLANS.md` e de `docs/workflows/codex-quality-gates.md` concluida.
- [x] 2026-04-09 00:20Z - Referencias obrigatorias revisadas: `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`, `docs/workflows/target-project-compatibility-contract.md`, `docs/workflows/target-case-investigation-manifest.json`, `docs/workflows/target-case-investigation-v2-manifest.json`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/types/target-investigate-case.ts`, `prompts/16-target-investigate-case-round-materialization.md` e tickets/execplans da mesma linhagem.
- [x] 2026-04-09 00:20Z - Fronteira de ownership com os tickets irmaos fechados consolidada para evitar `duplication-gap` e `closure-criteria-gap`.
- [x] 2026-04-09 00:20Z - ExecPlan criado em `execplans/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md`.
- [x] 2026-04-09 00:54Z - Contrato runtime/documental das continuacoes opcionais implementado com guardrails de migracao explicitos em `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `docs/workflows/target-case-investigation-v2-manifest.json`, `docs/workflows/target-project-compatibility-contract.md` e novos prompts canonicos opcionais da v2.
- [x] 2026-04-09 00:54Z - Validacao final do pacote concluida com testes focados/matriz completa (`npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts`), `npm run check` e revisao textual por `rg`.

## Surprises & Discoveries
- 2026-04-09 00:20Z - O manifesto v2 dedicado ja declara `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication`, mas hoje essas etapas carregam apenas `policy.optional=true`; ainda nao ha precondicoes explicitas, ordem tardia observavel nem vinculo claro com a segunda onda target-side.
- 2026-04-09 00:20Z - `src/integrations/target-investigate-case-round-preparer.ts` ja parou de disparar automaticamente `semantic-review`, `causal-debug` e `root-cause-review` no caminho minimo v2, mas `src/core/target-investigate-case.ts` ainda sempre avalia publication e sempre grava `publication-decision.json`; o gap real atual esta no pos-diagnostico e nao mais na materializacao inicial.
- 2026-04-09 00:20Z - O discovery runner-side de `ticket-proposal.json` continua acoplado ao subfluxo legado `causalDebug`, nao a uma continuacao v2 `ticket-projection`; sem reorganizar essa fronteira, o contrato opcional fica declarativo no manifesto, mas nao operacional no runtime.
- 2026-04-09 00:20Z - O contrato de compatibilidade atual explica elegibilidade geral do workflow, mas ainda nao registra a derivacao runner-first da v2, a segunda onda para targets aderentes nem a fronteira objetiva entre adaptadores legados e contrato canonicamente v2.
- 2026-04-09 00:20Z - O repositorio so possui prompts canonicos para `resolve-case`, `assemble-evidence` e `diagnosis`; se a execucao optar por manter `deep-dive`, `improvement-proposal` e `ticket-projection` como etapas target-owned prompt-driven, sera preciso criar seus slots canonicos ou documentar objetivamente a decisao alternativa.
- 2026-04-09 00:54Z - `validateCaseResolution(...)` exige equivalencia exata entre seletores normalizados e `case-resolution.json`, inclusive para opcionais ausentes; os fixtures v2 precisaram distinguir explicitamente cenarios com e sem `window`/`symptom` em vez de relaxar a regra do runtime.
- 2026-04-09 00:54Z - O fixture legado padrao ainda pode materializar `investigations/<round-id>/ticket-proposal.json` quando a recomendacao de publication e positiva; os cenarios v2 do caminho minimo precisaram isolar esse resquicio para provar que a continuacao `ticket-projection` nao foi atravessada.

## Decision Log
- 2026-04-09 - Decisao: preservar sem consolidacao os conjuntos finitos herdados do ticket/spec.
  - Motivo:
    o checklist compartilhado exige cobertura positiva dos membros explicitamente aceitos e negativa fora do conjunto quando isso fizer parte do requisito.
  - Impacto:
    a matriz de validacao deste plano cobrira explicitamente `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`, bem como os adaptadores legados `semantic-review`, `causal-debug` e `root-cause-review`.
- 2026-04-09 - Decisao: reutilizar `ticketPublicationPolicy` e o contrato existente de `ticket-proposal.json` como fonte de verdade das convencoes do target para `ticket-projection`.
  - Motivo:
    o runner ja possui uma superficie observavel para naming, template, causal block e publication quality gate; criar um contrato paralelo neste ticket aumentaria drift e duplicacao semantica.
  - Impacto:
    `ticket-projection` devera apontar para o namespace autoritativo do target e validar aderencia contra convencoes declaradas pelo proprio projeto alvo, reaproveitando a malha atual onde ela ja e canonica.
- 2026-04-09 - Decisao: `publication` passara a ser uma continuacao runner-side opt-in e tardia, nao um write obrigatorio ao final de toda avaliacao v2.
  - Motivo:
    o closure criterion do ticket exige que a publicacao runner-side continue conservadora, mas deixe de ser parte obrigatoria do caminho minimo.
  - Impacto:
    o runtime precisara distinguir claramente rounds que terminam em `diagnosis` daqueles que realmente atravessam a continuacao `publication`, inclusive no tratamento de `publication-decision.json`.
- 2026-04-09 - Decisao: manter compatibilidade com suportes legados da v1 apenas por ponte explicita de migracao, sem remover a retrocompatibilidade runner-side nesta frente.
  - Motivo:
    ha codigo, testes e contratos anteriores ainda ativos; a entrega segura deste ticket e tornar a ponte observavel e opcional, nao apagar a historia da v1 de uma vez.
  - Impacto:
    qualquer uso de `semantic-review`, `causal-debug` e `root-cause-review` em v2 devera ficar marcado como adaptador de migracao e nunca como precondicao implicita do caminho minimo nem de toda continuacao tardia.
- 2026-04-09 - Decisao: se a execucao mantiver as continuacoes target-owned via prompt semantico, os slots canonicos opcionais serao criados no runner por default.
  - Motivo:
    hoje o repositorio so materializa os prompts canonicos do caminho minimo, e a spec v2 recomenda nomes estaveis tambem para as etapas tardias.
  - Impacto:
    salvo descoberta local superior documentada no `Decision Log`, a execucao deve criar `docs/workflows/target-investigate-case-v2-deep-dive.md`, `docs/workflows/target-investigate-case-v2-improvement-proposal.md` e `docs/workflows/target-investigate-case-v2-ticket-projection.md`.
- 2026-04-09 - Decisao: a primeira onda runner-side desta entrega fica operacional apenas para `ticket-projection` e `publication`; `deep-dive` e `improvement-proposal` permanecem como slots/documentacao canonicos para a segunda onda de adocao target-side.
  - Motivo:
    o ticket pede guardrails, contrato e rollout incremental sem exigir que todo target implemente imediatamente todas as continuacoes opcionais.
  - Impacto:
    manifesto, tipos e prompts deixam as quatro continuacoes observaveis, mas o runtime runner-side desta etapa so atravessa `publication` quando `ticket-projection` target-owned estabiliza `ticket-proposal.json`.
- 2026-04-09 - Decisao: o caminho minimo v2 continua gerando uma decisao semantica de publication para summary/trace, mas `publication-decision.json` so e escrito quando a continuacao `publication` for realmente atravessada.
  - Motivo:
    era necessario preservar superfícies finais coerentes sem reintroduzir o artefato runner-side como obrigatoriedade de todo round v2.
  - Impacto:
    o summary final continua acionavel no caminho minimo diagnosis-first, enquanto o filesystem deixa de sinalizar falsamente que houve publication runner-side.
- 2026-04-09 - Decisao: `ticket_projection.status=ready` passou a ser o gate runtime explicito para exigir `ticket-proposal.json`; a ausencia desse artefato deixou de falhar cenarios v2 que nao atravessaram a continuacao target-owned.
  - Motivo:
    o acoplamento anterior ao discovery legado de `causalDebug` mantinha a v1 como backbone implicito mesmo quando o contrato v2 nao pedia publication.
  - Impacto:
    o runner valida `ticket-proposal.json` no namespace autoritativo apenas quando a propria rodada declara `ticket-projection` pronto, preservando a ponte legada apenas como adaptador de migracao.

## Outcomes & Retrospective
- Status final:
  execucao concluida sem commit/push e sem fechamento do ticket.
- O que funcionou:
  manifesto v2, tipos, runtime e testes passaram a distinguir o caminho minimo diagnosis-first das continuacoes tardias; `publication` ficou opt-in/runner-side com write condicional de artefato; `ticket-projection` passou a validar `ticket-proposal.json` pelo namespace autoritativo do target; a documentacao de compatibilidade agora registra explicitamente runner-first + segunda onda target-side.
- O que ficou pendente:
  a segunda onda de adocao nos projetos alvo continua fora deste repositorio; nao houve commit/push nem fechamento editorial do ticket nesta etapa.
- Proximos passos:
  revisar o diff final, decidir o changeset de commit e depois seguir para a etapa separada de fechamento/versionamento do ticket quando apropriado.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `docs/workflows/target-case-investigation-v2-manifest.json`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `prompts/16-target-investigate-case-round-materialization.md`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.test.ts`
- Ticket de origem:
  - `tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md`
- Spec de origem:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  - RF-03
  - RF-08
  - RF-19
  - RF-20
  - RF-21
  - RF-22
  - RF-27
  - RF-28
  - CA-05
  - CA-06 (parcela runner-side)
  - CA-08
  - validacao pendente herdada sobre quais estagios opcionais entram ou nao na primeira onda runner-side
- RNFs e restricoes herdadas que precisam permanecer observaveis:
  - preservar publication runner-side conservadora;
  - manter o contrato target-agnostic;
  - evitar reintroduzir a complexidade da v1 como obrigatoriedade escondida;
  - nao fundir runner e target em uma unica autoridade semantica;
  - nao reabrir publication automatica por default;
  - nao acoplar a v2 ao piloto `../guiadomus-matricula`.
- Assumptions / defaults adotados:
  - o caminho minimo v2 continua sendo apenas `preflight -> resolve-case -> assemble-evidence -> diagnosis`;
  - a primeira implementacao runner-side desta frente pode pousar guardrails, manifestos e docs sem exigir que todos os targets passem a suportar todos os estagios opcionais no primeiro dia;
  - `ticket-projection` deve reutilizar `ticketPublicationPolicy` e o quality gate do `ticket-proposal.json` como fonte declarativa de convencoes do target, em vez de criar uma segunda autoridade;
  - `assessment.json` e outros artefatos de compatibilidade podem continuar existindo, desde que nao voltem a transformar `publication` em fase obrigatoria do caminho minimo;
  - `investigations/<round-id>/` pode continuar como espelho de migracao, mas `ticket-proposal.json` e demais artefatos tardios precisam respeitar o namespace autoritativo `output/case-investigation/<round-id>/` quando a rodada estiver em v2;
  - a decisao sobre quais continuacoes opcionais entram ja na primeira onda runner-side vs. quais ficam para a segunda onda target-side deve ser registrada explicitamente no `Decision Log` da execucao e refletida no fechamento do ticket.
- Membros explicitos de allowlists / enumeracoes finitas relevantes, sem consolidacao:
  - continuacoes opcionais v2: `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`;
  - adaptadores legados aceitos somente como ponte de migracao: `semantic-review`, `causal-debug`, `root-cause-review`;
  - artefato target-owned esperado quando `ticket-projection` for suportado e executado: `ticket-proposal.json`.
- Fronteira de ownership com a mesma linhagem:
  - `tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md` ja resolveu nome proprio, manifesto/caminho minimo, namespace e `lineage`; este plano nao deve reabrir esses closure criteria.
  - `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md` ja resolveu `diagnosis.*`, summary/trace/Telegram diagnosis-first; este plano so pode tocar essas superficies se for estritamente necessario para manter coerencia quando `publication` estiver ausente.
  - este plano e dono exclusivo das continuacoes tardias, da optionalidade runner-side de `publication`, dos guardrails de migracao e da documentacao da segunda onda target-side.
- Fluxo atual observado:
  - o manifesto v2 dedicado ja declara os quatro estagios opcionais, mas sem precondicoes explicitas de uso;
  - o `round-preparer` v2 nao dispara automaticamente a cadeia `semantic-review -> causal-debug -> root-cause-review`;
  - `evaluateTargetInvestigateCaseRound(...)` ainda constroi a decisao de publication em toda rodada e sempre grava `publication-decision.json`;
  - `ticket-proposal.json` ainda e descoberto pelo caminho legado de `causalDebug`, nao como etapa `ticket-projection` do contrato v2;
  - a documentacao de compatibilidade geral ainda nao registra a segunda onda de tickets para targets aderentes.

## Plan of Work
- Milestone 1:
  - Entregavel:
    contrato v2 expandido com regras explicitas para continuacoes opcionais e guardrails de migracao.
  - Evidencia de conclusao:
    tipos e manifesto v2 tornam observaveis as precondicoes de `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication`, alem da lista fechada de adaptadores legados aceitos apenas como ponte de migracao.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`
    `docs/workflows/target-case-investigation-v2-manifest.json`
    eventuais prompts canonicos opcionais em `docs/workflows/`
- Milestone 2:
  - Entregavel:
    runtime do runner desacoplado de publication obrigatoria e de `ticket-proposal.json` legado como unica entrada de continuacao tardia.
  - Evidencia de conclusao:
    rounds v2 podem encerrar no caminho minimo sem `publication-decision.json`; quando a rodada atravessa `ticket-projection`, o runner le `ticket-proposal.json` do namespace autoritativo do target segundo as convencoes declaradas; quando a rodada atravessa `publication`, a decisao runner-side continua conservadora e tardia.
  - Arquivos esperados:
    `src/core/target-investigate-case.ts`
    `src/integrations/target-investigate-case-round-preparer.ts`
    `src/integrations/target-investigate-case-ticket-publisher.ts` se a fronteira de convencoes precisar ser ajustada
- Milestone 3:
  - Entregavel:
    documentacao operacional e de compatibilidade alinhada com runner-first agora e segunda onda target-side depois.
  - Evidencia de conclusao:
    `docs/workflows/target-project-compatibility-contract.md` e o manifesto/documentacao v2 explicam a fronteira entre contrato canonico, adaptadores legados e adocao posterior por targets aderentes, sem acoplamento ao piloto.
  - Arquivos esperados:
    `docs/workflows/target-project-compatibility-contract.md`
    `docs/workflows/target-case-investigation-v2-manifest.json`
    eventuais prompts canonicos opcionais
- Milestone 4:
  - Entregavel:
    cobertura automatizada e revisao final dos closure criteria deste ticket.
  - Evidencia de conclusao:
    suites focadas e `npm run check` terminam em `exit 0`, com validacoes positivas e negativas para as continuacoes opcionais, adaptadores legados e a optionalidade runner-side de `publication`.
  - Arquivos esperados:
    `src/core/target-investigate-case.test.ts`
    `src/integrations/target-investigate-case-round-preparer.test.ts`
    `src/integrations/target-investigate-case-ticket-publisher.test.ts`
    `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` apenas se a optionalidade de `publication` exigir ajuste minimo de surfaces

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n 'deep-dive|improvement-proposal|ticket-projection|publication|semantic-review|causal-debug|root-cause-review|ticket-proposal|publication-decision|ticketPublicationPolicy' src docs/workflows prompts` para reabrir todos os anchors que ainda tratam continuacoes tardias e adaptadores legados de forma implicita.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-investigate-case.ts` para modelar explicitamente:
   - as precondicoes aceitas para `deep-dive`, derivadas diretamente do ticket/spec (`ambiguidade causal`, `baixa confianca`, `necessidade real de localizar a menor mudanca plausivel`);
   - o gate de `improvement-proposal` apos diagnostico suficiente;
   - o gate de `ticket-projection` sem reabrir o diagnostico e com dependencia das convencoes declaradas pelo target;
   - `publication` como continuacao runner-side tardia;
   - a lista fechada de adaptadores de migracao aceitos (`semantic-review`, `causal-debug`, `root-cause-review`) apenas como ponte explicita.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `docs/workflows/target-case-investigation-v2-manifest.json` para refletir os mesmos guardrails, incluindo:
   - ordem tardia e precondicoes observaveis dos quatro estagios opcionais;
   - referencia explicita ao namespace autoritativo do target para `ticket-proposal.json`;
   - vinculo com `ticketPublicationPolicy` quando `ticket-projection` for suportado;
   - bloco documental de migracao/segunda onda sem transformar o piloto em contrato canonicamente global.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a implementacao mantiver os estagios opcionais target-owned via prompt semantico, criar ou atualizar `docs/workflows/target-investigate-case-v2-deep-dive.md`, `docs/workflows/target-investigate-case-v2-improvement-proposal.md` e `docs/workflows/target-investigate-case-v2-ticket-projection.md`; se a escolha final for entrypoint-only, registrar a justificativa objetiva no `Decision Log` e ajustar o manifesto para refletir isso sem ambiguidade.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.ts` para:
   - parar de escrever `publication-decision.json` quando a rodada v2 encerrar apenas no caminho minimo;
   - tornar a construcao da `publicationDecision` dependente de a rodada ter atravessado a continuacao `publication`;
   - desacoplar `ticket-proposal.json` do discovery exclusivamente legado de `causalDebug` e alinhar o consumo a `ticket-projection` quando a rodada estiver em v2;
   - manter `semantic-review`, `causal-debug` e `root-cause-review` apenas como pontes de migracao explicitamente declaradas.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/target-investigate-case-round-preparer.ts` para refletir o novo contrato tardio, preservando o namespace autoritativo do target, o espelho runner-side opcional e a opcionalidade dos adaptadores legados quando a rodada estiver em v2.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/target-investigate-case-ticket-publisher.ts` apenas no necessario para garantir que a publication runner-side continue consumindo `ticket-proposal.json` segundo as convencoes declaradas pelo target, sem assumir contrato paralelo nem reescrever a ownership semantica do ticket.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `docs/workflows/target-project-compatibility-contract.md` para documentar runner-first nesta frente, segunda onda posterior para targets aderentes, fronteira objetiva entre adaptadores legados e contrato v2 e ausencia de acoplamento canonicamente obrigatorio ao piloto `../guiadomus-matricula`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/integrations/target-investigate-case-ticket-publisher.test.ts` para cobrir positiva e negativamente:
   - os membros explicitos `deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`;
   - os adaptadores de migracao `semantic-review`, `causal-debug`, `root-cause-review` apenas como ponte;
   - ausencia de `publication-decision.json` no caminho minimo;
   - materializacao de `ticket-proposal.json` no namespace autoritativo quando `ticket-projection` for suportado e executado;
   - rejeicao de reabertura diagnostica ou de convencoes target-owned ausentes quando `ticket-projection` tentar atravessar publication.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/codex-client.test.ts` somente se a optionalidade de `publication` exigir ajustes minimos de wiring, reply ou trace para manter surfaces coerentes sem reabrir o ticket fechado de diagnosis-first.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts` para validar os closure criteria automatizados diretamente ligados a continuacoes opcionais, migration guards e publication tardia.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar coerencia tipada do novo contrato v2 e da optionalidade runner-side de `publication`.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n 'segunda onda|targets aderentes|adaptador(es)? de migracao|ticket-projection|publication|ticketPublicationPolicy' docs/workflows/target-project-compatibility-contract.md docs/workflows/target-case-investigation-v2-manifest.json src/core/target-investigate-case.ts` e revisar manualmente o diff para confirmar que os guardrails documentais e runtime ficaram observaveis no mesmo changeset.

## Validation and Acceptance
- Regra de cobertura para allowlists / enumeracoes finitas:
  nenhuma consolidacao sera usada neste ticket. A validacao precisa preservar explicitamente os quatro estagios opcionais v2 (`deep-dive`, `improvement-proposal`, `ticket-projection`, `publication`) e os tres adaptadores legados aceitos somente como ponte (`semantic-review`, `causal-debug`, `root-cause-review`), com cobertura positiva do conjunto aceito e negativa fora dele quando isso fizer parte do closure criterion.
- Matriz requisito -> validacao observavel:
  - `RF-08 + RF-19 + RF-20 + RF-21 + CA-05`:
    `src/types/target-investigate-case.ts`, `docs/workflows/target-case-investigation-v2-manifest.json` e os testes passam a modelar `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como continuacoes opcionais e tardias; `deep-dive` so e aceito quando houver ambiguidade causal, baixa confianca ou necessidade real de localizar a menor mudanca plausivel; `improvement-proposal` so aparece depois de diagnostico suficiente; `ticket-projection` nao pode reabrir o diagnostico e, quando suportado e executado, materializa `ticket-proposal.json` no namespace autoritativo do target com evidencia objetiva de aderencia a `ticketPublicationPolicy` / convencoes declaradas pelo proprio projeto alvo; testes negativos rejeitam tentativa de pular direto do caminho minimo para um estagio tardio sem os gates declarados.
  - `RF-22 + parcela runner-side de CA-06`:
    `src/core/target-investigate-case.ts` e `src/integrations/target-investigate-case-round-preparer.ts` deixam observavel que `publication` continua runner-side e conservadora, mas nao faz parte obrigatoria do caminho minimo; o runner so avalia/escreve `publication-decision.json` quando a rodada realmente atravessar a continuacao `publication`, e nao em todo fluxo v2 por default.
  - `RF-03 + RF-27 + RF-28 + CA-08`:
    `docs/workflows/target-project-compatibility-contract.md`, `docs/workflows/target-case-investigation-v2-manifest.json` e o runtime registram que a derivacao inicial da v2 ficou runner-side e que a segunda onda vira depois nos targets aderentes; `semantic-review`, `causal-debug` e `root-cause-review` ficam explicitamente limitados a adaptadores de migracao e nao a backbone obrigatorio; a documentacao nao usa `../guiadomus-matricula` como contrato canonico.
  - `Validacao pendente herdada`:
    o fechamento do ticket registra objetivamente, no proprio ticket e/ou no `Decision Log` do ExecPlan, quais estagios opcionais entram ja na primeira implementacao runner-side e quais ficam para a onda target-side, com justificativa e guardrails de migracao observaveis.
  - `Validacao automatizada/documental do pacote`:
    testes focados provam que o caminho minimo nao dispara automaticamente continuacoes opcionais nem adaptadores legados; manifesto v2 e contrato de compatibilidade sao atualizados no mesmo changeset; `npm run check` permanece verde.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts`
  - Esperado:
    `exit 0`, com casos positivos para os quatro estagios opcionais, casos negativos para disparo automatico indevido no caminho minimo, ausencia de `publication-decision.json` quando `publication` nao for atravessada, materializacao de `ticket-proposal.json` no namespace autoritativo quando `ticket-projection` rodar e rejeicao explicita de dependencias legadas fora da ponte de migracao declarada.
- Comando:
  `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado:
    `exit 0`, sem drift tipado entre manifesto v2, runtime, publisher, runner wiring e suites.
- Comando:
  `rg -n 'segunda onda|targets aderentes|adaptador(es)? de migracao|ticket-projection|publication|ticketPublicationPolicy' docs/workflows/target-project-compatibility-contract.md docs/workflows/target-case-investigation-v2-manifest.json src/core/target-investigate-case.ts`
  - Esperado:
    a revisao textual encontra a segunda onda target-side, os adaptadores de migracao limitados ao conjunto aceito, o vinculo de `ticket-projection` com convencoes declaradas pelo target e a optionalidade tardia de `publication` nas superficies corretas.

## Idempotence and Recovery
- Idempotencia:
  as mudancas devem ser aditivas e explicitas para v2; rerodar os mesmos testes no mesmo estado deve manter o caminho minimo sem `publication` obrigatoria e sem recolocar a cadeia v1 como espinha dorsal;
  `ticketPublicationPolicy` continua sendo a fonte de verdade para convencoes de ticket target-owned, evitando contrato paralelo e drift entre `ticket-projection` e publication runner-side;
  o namespace autoritativo do target continua sendo a primeira autoridade para `ticket-proposal.json`; o espelho runner-side, quando existir, nao deve virar segunda fonte de verdade.
- Riscos:
  `publicationDecision` hoje atravessa core, summary, trace e parte do wiring do runner; tornala opcional no fluxo v2 pode tocar mais superficies do que o ticket deixa explicito;
  `ticket-proposal.json` ainda esta acoplado ao discovery legado de `causalDebug`, entao o desacoplamento pode exigir mexer em helpers e fixtures alem do que o ticket cita nominalmente;
  ainda nao existe target real aderente a esses estagios opcionais v2 no repositorio atual, entao parte da prova sera por fixtures/documentacao runner-side;
  criar prompts canonicos opcionais sem uma convencao local firme pode introduzir ruido se a execucao nao registrar a decisao final com clareza.
- Recovery / Rollback:
  se a optionalidade de `publication` quebrar demasiadas superficies obrigatorias, reintroduzir a mudanca atras de branching explicito por `flow=v2` em vez de degradar o contrato inteiro;
  se o consumo de `ticket-proposal.json` pelo caminho v2 conflitar com a ponte legada, manter o path legado disponivel apenas sob adaptador declarado e registrar blocker claro antes de misturar as duas semanticas;
  se a documentacao de segunda onda permanecer ambigua durante a execucao, parar com blocker explicito em vez de improvisar contrato target-specific;
  se a criacao dos prompts opcionais se mostrar errada para a convencao local, reverter apenas esses prompts e registrar a alternativa entrypoint-only no `Decision Log`, mantendo os guardrails de ordem/precondicao intactos.

## Artifacts and Notes
- Ticket alvo:
  - `tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md`
- Spec de origem:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- Tickets relacionados da mesma linhagem:
  - `tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md`
  - `tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md`
  - `tickets/closed/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md`
- Contratos/documentos atuais relevantes:
  - `docs/workflows/target-case-investigation-v2-manifest.json`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `prompts/16-target-investigate-case-round-materialization.md`
- Evidencias esperadas ao final da execucao:
  - diff concentrado em manifesto/tipos/runtime/docs/testes da fronteira tardia;
  - logs de `npm test -- ...` e `npm run check`;
  - revisao manual da documentacao de segunda onda e dos guardrails de migracao no diff final.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato v2 de `stages.*` no manifesto/tipos, especialmente `deepDive`, `improvementProposal`, `ticketProjection` e `publication`;
  - descoberta/consumo de `ticket-proposal.json` no runtime v2;
  - optionalidade de `publication-decision.json` para rounds que encerram no caminho minimo;
  - documentacao operacional de compatibilidade e segunda onda target-side.
- Compatibilidade:
  - o caminho minimo v2 e os tickets fechados de contrato/diagnosis devem permanecer atendidos;
  - a ponte com a v1 continua suportada apenas por adaptadores declarados e nunca como obrigatoriedade implicita;
  - o piloto `../guiadomus-matricula` pode continuar como referencia historica, mas nao deve aparecer como contrato canonico.
- Dependencias externas e mocks:
  - nenhuma dependencia externa nova deve ser introduzida;
  - as provas automatizadas devem continuar usando fixtures locais do runner;
  - a adocao real em targets externos permanece como fase posterior e manual, fora deste changeset runner-side.
