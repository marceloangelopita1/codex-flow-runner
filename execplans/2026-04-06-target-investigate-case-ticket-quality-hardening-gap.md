# target-investigate-case ticket quality hardening gap

## Purpose / Big Picture
- Objetivo: concluir o hardening runner-side que ainda falta para `causal-debug.result.json` e `ticket-proposal.json`, de modo que `/target_investigate_case` aceite contrato enriquecido backward-compatible, aplique guardrails editoriais observaveis no handoff target-owned e publique filenames coerentes com o escopo declarado pelo target.
- Resultado esperado: o runner continua aceitando o artefato legado do caso ancora, passa a aceitar campos opcionais adicionais ligados a RF-08, endurece a publication quando o contrato enriquecido/`quality_gate` novo for usado e preserva naming coerente com `ticket_scope`/`slug_strategy` sem reabrir a ownership de `rootCauseReview`.
- Escopo: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, fixtures/testes correlatos e, se algum contrato documental local precisar espelhar a mudanca para manter rastreabilidade observavel, somente a documentacao estritamente impactada.
- Fora de escopo: reimplementar `rootCauseReview`, mexer na ordem `semantic-review -> causal-debug -> root-cause-review`, alterar o target project, fechar o ticket, fazer commit/push ou reescrever semanticamente o ticket target-owned no runner.

## Progress
- [x] 2026-04-06 20:55Z - Ticket, specs relacionadas, quality gates, artefatos da rodada ancora e superficies atuais de codigo/teste foram relidos para planejar a execucao.
- [x] 2026-04-06 21:14Z - Baseline do delta remanescente confirmado contra o estado atual do codigo e dos testes: `publication_hints`, slug policy e parte do quality gate ja existiam; a lacuna real estava na trilha estruturada de RF-08 no `ticket-proposal.json` e na exigencia de exposicao explicita dessa trilha no markdown target-owned.
- [x] 2026-04-06 21:14Z - Contrato enriquecido de `causal-debug.result.json` / `ticket-proposal.json` consolidado sem regressao no path legado, com `ticket-proposal.json` aceitando `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness` e `remaining_gaps` sob `quality_gate=target-ticket-quality-v1`.
- [x] 2026-04-06 21:14Z - Publication hardening e politica de naming validados com cobertura positiva/negativa das enumeracoes relevantes, incluindo `generalizable + suggested-slug-only`, fallback legado e rejeicao de markdown enriquecido sem trilha explicita de RF-08.
- [x] 2026-04-06 21:14Z - Matriz final de aceitacao executada com `npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` e `npm run check`, ambos com `exit 0`.

## Surprises & Discoveries
- 2026-04-06 20:55Z - Ja existe um plano anterior em `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening.md` e o codigo atual ja absorveu parte do hardening (`publication_hints`, `quality_gate`, slug policy e testes dedicados); este plano novo precisa partir desse baseline e atacar apenas o delta ainda exigido pelo ticket aberto.
- 2026-04-06 20:55Z - O ticket fechado `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md` ja passou a ser o dono explicito de `rootCauseReview`, gates causais e rollout legado; repetir essa ownership aqui criaria `duplication-gap`.
- 2026-04-06 20:55Z - O artefato ancora `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/ticket-proposal.json` mostra exatamente a degradacao que este ticket quer endurecer: duplicacao sequencial de bullet, narrativa em ingles e `suggested_slug` generalizavel, enquanto `publication-decision.json` ainda registrou filename com prefixo de `case_ref`.
- 2026-04-06 20:55Z - O codigo atual ja tipa `root_cause_classification`, `preventable_stage`, `remediation_scope` e `publication_hints`, mas ainda nao torna totalmente observavel, no contrato/publication deste ticket, a trilha explicita de `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness` e `remaining_gaps` exigida pelo closure criterion alinhado a RF-08.
- 2026-04-06 20:55Z - O caminho de ticket publicado apontado por `publication-decision.json` nao esta mais presente no sibling repo; para esta execucao, os artefatos estaveis e suficientes para regressao sao `causal-debug.result.json`, `ticket-proposal.json`, `publication-decision.json` e os testes locais do runner.
- 2026-04-06 21:14Z - O fixture helper `createTargetRepoFixture(...)` valida `ticket-proposal.json` cedo demais para o caso negativo do path enriquecido; para provar o gate runner-side foi necessario escrever o JSON invalido diretamente no artefato do round e deixar a rejeicao acontecer na leitura real do core.
- 2026-04-06 21:14Z - A fronteira mais limpa para RF-08 ficou em duas camadas: schema do `ticket-proposal.json` exige a trilha estruturada minima quando `quality_gate=target-ticket-quality-v1`, e o publisher exige que o markdown target-owned exponha explicitamente essa trilha sem reescrita runner-side.

## Decision Log
- 2026-04-06 - Decisao: este arquivo `...-gap.md` passa a ser o plano canonico de execucao do ticket aberto, enquanto o plano sem `-gap` fica apenas como contexto historico/tecnico.
  - Motivo: o ticket aberto exige um ExecPlan com o mesmo slug e uma fronteira de ownership mais precisa do que a do plano anterior.
  - Impacto: a execucao deve reler o plano antigo apenas para reaproveitar descobertas utilmente, nunca para ampliar o escopo alem do ticket atual.
- 2026-04-06 - Decisao: o hardening adicional deve permanecer aditivo e backward-compatible, ativando exigencias mais fortes apenas no path enriquecido e/ou em `publication_hints.quality_gate=target-ticket-quality-v1`.
  - Motivo: o proprio ticket herda a restricao de rollout gradual e o artefato ancora ainda esta no shape legado.
  - Impacto: fixtures legadas continuam parseando; as exigencias novas ficam observaveis nos testes do path enriquecido.
- 2026-04-06 - Decisao: quando o contrato enriquecido precisar expor contexto causal adicional, reutilizar nomes ja existentes no ecossistema (`competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness`, `remaining_gaps`) em vez de introduzir aliases runner-side paralelos.
  - Motivo: reduz duplicacao semantica entre `root-cause-review.result.json`, `assessment.json` e `ticket-proposal.json`.
  - Impacto: `src/types/target-investigate-case.ts` e os testes devem convergir para um shape minimamente novo, mas semanticamente alinhado ao contrato ja conhecido.
- 2026-04-06 - Decisao: nao criar enum runner-side novo para `ticket_readiness.status` neste ticket; preservar o valor target-owned e validar apenas a presenca/coerencia exigidas pelo path enriquecido.
  - Motivo: a spec/ticket nao fixam uma allowlist nova para esse campo neste escopo, e tipa-lo de forma prematura reabriria ownership sem necessidade.
  - Impacto: o plano vai preservar, como allowlists explicitas deste ticket, apenas `ticket_scope`, `slug_strategy` e `quality_gate`; para `ticket_readiness.status`, os testes usarao os valores observados atuais (`ready`, `blocked`) sem congelar um enum novo aqui.
- 2026-04-06 - Decisao: materializar a trilha de RF-08 diretamente no topo de `ticket-proposal.json`, reutilizando os mesmos nomes ja usados em `root-cause-review.result.json`, em vez de criar um bloco wrapper novo runner-side.
  - Motivo: reduz aliases desnecessarios e mantem a publication target-owned semanticamente alinhada ao contrato causal ja existente.
  - Impacto: o schema, o manifesto canonico e os testes passam a documentar os campos opcionais `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness` e `remaining_gaps` como extensoes aditivas do proposal.
- 2026-04-06 - Decisao: endurecer `quality_gate=target-ticket-quality-v1` em duas etapas observaveis.
  - Motivo: separar "proposal estruturada suficiente" de "markdown target-owned expoe explicitamente essa estrutura" produz falhas mais diagnosticaveis sem quebrar o path legado.
  - Impacto: proposals enriquecidas sem trilha estruturada falham na leitura/schema; proposals estruturadas cujo markdown omite a trilha falham no publisher; tickets legados continuam aceitos.

## Outcomes & Retrospective
- Status final: implementacao e validacao locais concluidas; o ticket permanece aberto apenas porque esta etapa nao inclui fechamento/versionamento.
- O que funcionou: o hardening ficou aditivo e manifesto-first; o path legado continuou verde, e o path enriquecido passou a ter gates observaveis tanto no schema quanto no publisher.
- O que ficou pendente: alinhar o target project para emitir o contrato enriquecido novo de forma estavel durante o rollout e executar o fechamento/versionamento em etapa separada.
- Proximos passos: usar este changeset como base do fechamento formal do ticket, sem reabrir a ownership de `rootCauseReview`.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`
- Ticket de origem: `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`
- Spec de origem: `docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md`
- Spec relacionada que define a fronteira complementar: `docs/history/target-investigate-case/2026-04-06-pre-v2-publication-hardening.md`
- Ticket complementar fechado cuja ownership nao pode ser reaberta aqui: `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
- ExecPlan historico relacionado: `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening.md`
- Artefatos ancora usados como regressao de contexto:
  - `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/causal-debug.result.json`
  - `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/ticket-proposal.json`
  - `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/publication-decision.json`
- RFs/CAs cobertos por este plano:
  - Source spec: RF-06, RF-07, RF-08; CA-01, CA-03, CA-04.
  - Reforco herdado da spec complementar: manter RF-08 observavel no contrato/publication enriquecido sem puxar para este ticket a ownership de RF-01..RF-05/CA-01..CA-05 de `rootCauseReview`.
- RNFs e restricoes herdados que precisam permanecer observaveis:
  - preservar qualidade editorial minima;
  - evitar duplicacao evitavel;
  - manter ticket executavel por outra IA;
  - nao criar parser paralelo fora de `src/core/target-investigate-case.ts`;
  - nao reabrir a fronteira bounded de `semantic-review`;
  - manter o caminho canonico do manifesto e dos artefatos;
  - revalidar publication com `ticket-proposal.json` legado e com contrato enriquecido antes de considerar a frente concluida.
- Assumptions / defaults adotados:
  - `ticket-proposal.json` continua target-owned e a publication final continua runner-side.
  - O path legado permanece aceito; endurecimento adicional entra apenas quando o contrato enriquecido/hints novos estiverem presentes.
  - O runner nao reconstroi semanticamente `ticket_readiness` nem o motivo do `qa_escape`; ele apenas aceita, valida e publica/bloqueia o que o target declarou de forma estruturada.
  - Se for necessario carregar contexto de revisao causal ate o ticket target-owned, preferir reaproveitar o vocabulário ja existente em `root-cause-review.result.json` em vez de criar um shape sinonimo.
- Allowlists/enumerações finitas relevantes que este plano deve preservar explicitamente:
  - `publication_hints.ticket_scope`: `case-specific | generalizable`
  - `publication_hints.slug_strategy`: `case-ref-prefix | suggested-slug-only`
  - `publication_hints.quality_gate`: `legacy | target-ticket-quality-v1`
  - Dependencia herdada, sem reownership neste ticket: `root_cause_status = root_cause_confirmed | plausible_but_unfalsified | inconclusive`
- Justificativa objetiva para nao consolidar essas enumeracoes:
  - os membros ja existem como contrato tipado no runner, afetam diretamente naming/gating e precisam de cobertura positiva dos aceitos e negativa fora do conjunto; substitui-los por criterios agregados como "slug valido" ou "quality gate valido" apagaria a prova exigida pelo ticket/spec.
- Fronteira de ownership para evitar `duplication-gap` e `closure-criteria-gap`:
  - este ticket e dono apenas do enriquecimento de `causal-debug.result.json` / `ticket-proposal.json`, do quality hardening editorial/publication e da politica de naming runner-side;
  - o ticket fechado de `rootCauseReview` continua dono da etapa nova, da ordem de execucao, dos gates causais e da revisao manual da policy de rollout legado;
  - qualquer mudanca que exija reabrir `rootCauseReview` deve virar blocker explicito, nao expansao silenciosa deste plano.

## Plan of Work
- Milestone 1: congelar o delta real entre o ticket aberto e o estado atual do codigo.
  - Entregavel: mapa objetivo do que ja esta coberto pelo codigo/plano historico e do que ainda falta para os closure criteria atuais, com shape enriquecido minimo escolhido sem reabrir `rootCauseReview`.
  - Evidencia de conclusao: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts` e testes correlatos ficam com um diff coerente apenas nas superficies ainda em aberto; `Surprises & Discoveries`/`Decision Log` do plano registram qualquer descoberta que mude a fronteira.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, testes associados.
- Milestone 2: aceitar o contrato enriquecido e ligar esse contrato ao publisher sem quebrar o path legado.
  - Entregavel: schemas/tipos aceitam o artifact ancora atual e um artifact enriquecido que carregue, com nomenclatura reutilizada, `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness`, `remaining_gaps` e hints editoriais/naming.
  - Evidencia de conclusao: testes do core/tipos passam com shape legado e shape enriquecido; qualquer shape fora das allowlists declaradas continua rejeitado com mensagem observavel.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`, fixtures/builders de proposal/result.
- Milestone 3: endurecer publication e naming no path enriquecido.
  - Entregavel: o publisher preserva markdown target-owned, exige a trilha explicita de RF-08 quando `quality_gate=target-ticket-quality-v1`, e aplica filename coerente com `ticket_scope`/`slug_strategy`.
  - Evidencia de conclusao: testes do publisher cobrem positivamente os membros aceitos das allowlists e negativamente os cenarios fora do conjunto, incluindo `suggested-slug-only` sem `generalizable`, markdown enriquecido sem a trilha explicita requerida e fallback legado ainda aceito.
  - Arquivos esperados: `src/integrations/target-investigate-case-ticket-publisher.ts`, `src/integrations/target-investigate-case-ticket-publisher.test.ts`.
- Milestone 4: manter gates runner-side e observabilidade consistentes.
  - Entregavel: `evaluateTargetInvestigateCaseRound(...)` continua bloqueando publication quando `ticket-proposal.json` estiver ausente/invalido e torna observavel o caso em que o contrato enriquecido foi enviado sem a trilha explicita requerida para publication.
  - Evidencia de conclusao: suites focadas do core continuam verdes e registram o gate certo sem reabrir a ownership causal de `rootCauseReview`.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`, suites correlatas.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md` e reler `docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md`, `docs/history/target-investigate-case/2026-04-06-pre-v2-publication-hardening.md`, `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening.md` e `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md` antes de qualquer edicao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "publication_hints|ticket_scope|slug_strategy|quality_gate|competing_hypotheses|qa_escape|prompt_guardrail_opportunities|ticket_readiness|remaining_gaps" src/types/target-investigate-case.ts src/core/target-investigate-case.ts src/integrations/target-investigate-case-ticket-publisher.ts src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts` para confirmar o delta exato e evitar reabrir superficies do ticket complementar.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/target-investigate-case.ts` para aceitar o shape enriquecido minimo em `causal-debug.result.json` e/ou `ticket-proposal.json`, reaproveitando nomenclatura ja existente para `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness`, `remaining_gaps` e preservando as allowlists explicitas de `ticket_scope`, `slug_strategy` e `quality_gate`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar builders/fixtures/testes em `src/core/target-investigate-case.test.ts` para cobrir, com evidencia observavel, o artefato ancora legado e pelo menos um artefato enriquecido que exercite a trilha explicita de RF-08 no path novo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/target-investigate-case-ticket-publisher.ts` para: preservar o markdown target-owned; endurecer a validacao do path enriquecido sob `quality_gate=target-ticket-quality-v1`; e manter naming coerente com `ticket_scope`/`slug_strategy` sem reintroduzir prefixo de `case_ref` em ticket explicitamente generalizavel.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/target-investigate-case-ticket-publisher.test.ts` para cobrir positiva e negativamente os membros aceitos das allowlists relevantes, incluindo fallback legado, `case-ref-prefix`, `suggested-slug-only`, `legacy` e `target-ticket-quality-v1`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/target-investigate-case.ts` somente no necessario para manter gates explicitos quando `ticket-proposal.json` estiver ausente/invalido e para tornar observavel o caso em que o contrato enriquecido chega sem a trilha obrigatoria do path novo, sem tocar na ordem/gates de `rootCauseReview`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/integrations/codex-client.test.ts` apenas se o novo contract handoff exigir fixtures ou asserts adicionais para manter a trilha observavel entre artefato, assessment e publication.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` para validar as superficies diretamente ligadas aos closure criteria.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para garantir que o contrato ajustado nao degrada o pacote maior do runner.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-06 / CA-01 do ticket aberto.
    - Evidencia observavel: `src/types/target-investigate-case.ts` aceita o artefato ancora legado e um shape enriquecido com `competing_hypotheses`, `qa_escape`, `prompt_guardrail_opportunities`, `ticket_readiness`, `remaining_gaps` e `publication_hints`, sem quebrar backward compatibility.
    - Cobertura de allowlists finitas: `src/core/target-investigate-case.test.ts` e/ou testes dedicados aceitam positivamente `ticket_scope=case-specific|generalizable`, `slug_strategy=case-ref-prefix|suggested-slug-only` e `quality_gate=legacy|target-ticket-quality-v1`, e rejeitam negativamente o caso fora do conjunto ja documentado (`suggested-slug-only` quando `ticket_scope!=generalizable`).
  - Requisito: RF-08 / CA-04 do ticket aberto.
    - Evidencia observavel: `src/integrations/target-investigate-case-ticket-publisher.ts` e `src/integrations/target-investigate-case-ticket-publisher.test.ts` tornam observavel que, quando o contrato enriquecido e `quality_gate=target-ticket-quality-v1` forem usados, a publication target-owned preserva ou exige exposicao explicita de `competing_hypotheses`, do motivo de `qa_escape`, das `prompt_guardrail_opportunities` e de `ticket_readiness` com `remaining_gaps` quando houver.
    - Cobertura de naming/allowlists: os testes provam positivamente `case-specific + case-ref-prefix` e `generalizable + suggested-slug-only`, e negativamente rejeitam combinacoes fora da regra ou markdown enriquecido sem a trilha explicita exigida pelo path novo.
  - Requisito: RF-07 / CA-03 do ticket aberto.
    - Evidencia observavel: `src/core/target-investigate-case.ts` e `src/core/target-investigate-case.test.ts` permanecem verdes mantendo gates explicitos para `ticket-proposal.json` ausente/invalido e para proposal enriquecida que nao atenda o path novo; a publication runner-side nao acontece nesses cenarios.
    - Fronteira de ownership preservada: os testes continuam tratando `rootCauseReview` apenas como dependencia herdada; nao ha regressao na ordem da etapa nem reownership dos gates causais ja cobertos pelo ticket fechado complementar.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  - Esperado: `exit 0`, com cobertura observavel dos cenarios legado/enriquecido e dos membros explicitos das allowlists citadas acima.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotencia:
  - a evolucao deve permanecer aditiva; reexecutar os passos com o mesmo diff nao pode mudar o comportamento do path legado nem produzir naming diferente para o mesmo par `ticket_scope`/`slug_strategy`;
  - os testes devem continuar deterministas usando apenas fixtures locais e artefatos versionados/redigidos.
- Riscos:
  - endurecer demais o path legado e bloquear proposals atuais do target antes da migracao conjunta;
  - reabrir acidentalmente ownership de `rootCauseReview` ao tentar propagar contexto causal adicional;
  - criar regressao de dedupe/naming para tickets ja publicados com prefixo de `case_ref`;
  - aceitar um shape enriquecido paralelo demais ao contrato ja existente, elevando custo de manutencao.
- Recovery / Rollback:
  - manter todo campo novo opcional primeiro e preso ao path enriquecido/`quality_gate` novo;
  - se a nova politica de naming causar risco de dedupe, manter `case-ref-prefix` como fallback para qualquer proposal que nao declare explicitamente `generalizable + suggested-slug-only`;
  - se a trilha explicita de RF-08 exigir dados ainda nao emitidos pelo target, bloquear apenas o path enriquecido e preservar o legado, registrando o blocker no ticket em vez de improvisar inferencia runner-side;
  - se a implementacao exigir reabrir `rootCauseReview`, parar e abrir blocker explicito, porque isso foge do escopo deste ticket.

## Artifacts and Notes
- Ticket alvo: `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`
- ExecPlan atual: `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`
- ExecPlan historico relacionado: `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening.md`
- Ticket complementar fechado: `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
- Spec de origem: `docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md`
- Spec complementar: `docs/history/target-investigate-case/2026-04-06-pre-v2-publication-hardening.md`
- Plano complementar no target project: `../guiadomus-matricula/execplans/2026-04-06-case-investigation-ticket-quality-hardening.md`
- Artefatos do caso ancora:
  - `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/causal-debug.result.json`
  - `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/ticket-proposal.json`
  - `../guiadomus-matricula/investigations/2026-04-06T16-30-09Z/publication-decision.json`
- Nota operacional: o path apontado por `publication-decision.json` para o ticket publicado nao esta mais disponivel no sibling repo; a regressao runner-side deve usar os artefatos estruturados acima e os testes locais como verdade observavel.

## Interfaces and Dependencies
- Interfaces alteradas:
  - schema de `causal-debug.result.json` no runner, apenas no subconjunto necessario para carregar metadados adicionais do path enriquecido;
  - schema de `ticket-proposal.json`, especialmente no bloco de hints/editorial-publication;
  - quality gate do publisher para markdown target-owned e politica de slug/filename.
- Compatibilidade:
  - o artefato ancora legado `ticket_proposal_v1` precisa continuar aceito;
  - os membros explicitos de `ticket_scope`, `slug_strategy` e `quality_gate` precisam continuar um-para-um com as allowlists ja documentadas;
  - `rootCauseReview` continua dependencia consumida, nao superficie a ser redesenhada neste ticket.
- Dependencias externas e mocks:
  - depende de o target project eventualmente emitir o contrato enriquecido; ate la, o runner deve permanecer compatível com o path legado;
  - as suites locais devem continuar usando apenas fixtures/mocks do proprio repositorio, sem rede nem servicos externos reais.
- Acoplamentos que exigem cuidado:
  - `src/core/target-investigate-case.ts` descobre/valida artefatos e nao deve ganhar parser paralelo;
  - `src/integrations/target-investigate-case-ticket-publisher.ts` depende dos headings canonicos do template causal do target e nao pode substituir o conteudo target-owned por reescrita runner-side;
  - qualquer evolucao documental local so deve ser feita se a mudanca de contrato ficar sem rastreabilidade observavel sem ela.
