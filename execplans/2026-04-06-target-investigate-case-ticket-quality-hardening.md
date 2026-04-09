# target-investigate-case ticket quality hardening

## Purpose / Big Picture
- Objetivo: alinhar `/target_investigate_case` ao endurecimento editorial do projeto alvo, preservando a autoridade semantica target-owned sem degradar o ticket na fronteira runner-side.
- Resultado esperado: o runner passa a aceitar o contrato enriquecido de `causal-debug.result.json` e `ticket-proposal.json`, aplica guardrails minimos de qualidade na publication e deixa de impor naming que contradiga um ticket explicitamente reutilizavel.
- Escopo: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, fixtures/testes do fluxo e, se necessario, docs/specs que formalizam o contrato.
- Fora de escopo: reescrever o conteudo semantico do ticket no runner, mover `ticket-proposal.json` para o runner ou reabrir a fronteira bounded de `semantic-review`.

## Progress
- [x] 2026-04-06 17:07Z - Planejamento inicial concluido.
- [x] 2026-04-06 17:15Z - Ticket runner-side aberto em `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md` para restaurar a linhagem `spec -> ticket -> execplan`.
- [x] 2026-04-06 17:23Z - Contrato runner-side refinado com campos opcionais aditivos para classificacao causal, remediation scope e publication hints de ticket.
- [x] 2026-04-06 17:24Z - Publisher atualizado com quality gate estrutural opt-in para `ticket_markdown` target-owned e politica de slug coerente com ticket generalizavel.
- [x] 2026-04-06 17:25Z - Validacao runner-side concluida com `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts` e `npm run check`.

## Surprises & Discoveries
- 2026-04-06 17:07Z - Quando `ticket-proposal.json.ticket_markdown` existe, o publisher usa esse markdown quase verbatim; a fronteira runner-side hoje valida pouco mais do que headings do bloco causal.
- 2026-04-06 17:07Z - O nome final do arquivo publicado sempre prefixa `case_ref`, mesmo quando o ticket e claramente generalizavel e o target ja forneceu um `suggested_slug` proprio.
- 2026-04-06 17:07Z - Se o target enriquecer `ticket-proposal.json` com metadados editoriais ou de escopo, o runner atual vai rejeitar esses campos por causa do schema estrito.
- 2026-04-06 17:23Z - O comando `npm test -- ...` ainda executa toda a suite via `tsx --test src/**/*.test.ts ...`; isso foi util como validacao mais ampla porque mostrou que os schemas aditivos nao vazaram regressao fora do fluxo alvo.

## Decision Log
- 2026-04-06 - Decisao: manter o runner como autoridade final de publication, mas nao como reescritor semantico do ticket.
  - Motivo: a spec vigente separa semantic ownership do target e publication authority do runner.
  - Impacto: o runner deve validar e preservar, nao substituir, o conteudo target-owned.
- 2026-04-06 - Decisao: qualquer evolucao de contrato entre target e runner deve nascer aditiva e backward-compatible.
  - Motivo: existem targets e fixtures que podem ainda produzir `ticket_proposal_v1` sem os metadados novos.
  - Impacto: schemas, loaders e testes precisam aceitar rollout gradual antes de apertar obrigatoriedade.
- 2026-04-06 - Decisao: quality gate editorial reforcado no publisher sera opt-in via `publication_hints.quality_gate`.
  - Motivo: o target atual ainda nao emite o contrato enriquecido, entao endurecimento imediato e obrigatorio quebraria o rollout cross-repo.
  - Impacto: tickets legados continuam aceitos; tickets que declararem `target-ticket-quality-v1` passam a receber validacao estrutural minima no runner.
- 2026-04-06 - Decisao: `suggested-slug-only` so vale quando `ticket_scope=generalizable`.
  - Motivo: evita que um identificador de caso desapareca de tickets ainda case-specific por acidente.
  - Impacto: o runner continua prefixando `case_ref` por default e so publica slug puro quando o target declarar explicitamente backlog reutilizavel.

## Outcomes & Retrospective
- Status final: implementacao runner-side concluida localmente e validada; versionamento/fechamento formal do ticket ainda pendem.
- O que funcionou: a evolucao aditiva do schema permitiu aceitar hints futuros sem quebrar o shape atual; os testes novos cobriram tanto o caso positivo de slug generalizavel quanto o caso negativo de markdown ruim sob quality gate opt-in.
- O que ficou pendente: alinhar o target project para passar a emitir os campos opcionais novos e decidir o changeset final de versionamento/fechamento do ticket no runner.
- Proximos passos: implementar a frente complementar no target project e depois versionar/fechar o ticket runner-side no mesmo changeset.

## Context and Orientation
- Arquivos principais: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-ticket-publisher.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, `src/core/runner.test.ts`.
- Spec de origem: `docs/history/target-investigate-case/2026-04-06-pre-v2-escalation.md`.
- Ticket de origem: `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`.
- RFs/CAs cobertos por este plano: RF-06, RF-07, RF-08; CA-01, CA-03, CA-04.
- Assumptions / defaults adotados: o target continuara emitindo `ticket-proposal.json`; a authority final continua runner-side; o rollout precisa continuar aceitando o contrato atual enquanto o target e o runner nao forem implantados juntos.
- Fluxo atual: discovery dos artefatos target-owned -> validacao runner-side -> publication via `target-investigate-case-ticket-publisher.ts`.
- Restricoes tecnicas: nao criar um parser paralelo fora do contrato `target-investigate-case`, nao depender de heuristica sem path canonico e nao duplicar a responsabilidade semantica que pertence ao target.

## Plan of Work
- Milestone 1: aceitar o contrato enriquecido sem quebrar o shape atual.
  - Entregavel: tipos/schemas do runner aceitam campos aditivos em `causal-debug.result.json` e/ou `ticket-proposal.json` ligados a classificacao causal, etapa evitavel ou escopo/naming do ticket.
  - Evidencia de conclusao: fixtures e testes do core aceitam tanto o shape atual quanto o shape enriquecido.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`, fixtures ligadas a publication.
- Milestone 2: endurecer publication e naming policy.
  - Entregavel: o publisher valida melhor `ticket_markdown`, preserva o conteudo target-owned e aplica naming coerente com o escopo reutilizavel do ticket quando esse sinal estiver disponivel.
  - Evidencia de conclusao: testes do publisher cobrem o caso atual e o caso enriquecido, inclusive a estrategia de slug/nome do arquivo.
  - Arquivos esperados: `src/integrations/target-investigate-case-ticket-publisher.ts`, `src/integrations/target-investigate-case-ticket-publisher.test.ts`.
- Milestone 3: manter observabilidade e orchestration alinhadas.
  - Entregavel: o core e o round preparer continuam apontando para os mesmos artefatos e falham com mensagem explicita quando o target produzir proposal invalida ou parcialmente enriquecida.
  - Evidencia de conclusao: suites do core/runner permanecem verdes e as mensagens de gate continuam explicitas.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, testes associados.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir `src/types/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`, `src/core/target-investigate-case.ts` e os testes ligados a `ticketProposal` para consolidar o menor conjunto de superficies alteradas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar os schemas/tipos para aceitar de forma aditiva os metadados que o target passara a emitir para melhorar qualidade editorial e naming do ticket.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/target-investigate-case-ticket-publisher.ts` para aplicar quality gates minimos em `ticket_markdown`, revisar a politica de filename/slug quando o ticket for explicitamente reutilizavel e manter preferencia por conteudo target-owned.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/target-investigate-case.ts` e `src/integrations/target-investigate-case-round-preparer.ts` apenas no necessario para discovery, mensagens de gate e compatibilidade do rollout.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` para validar a frente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` e qualquer comando documental/especifico necessario para fechar a matriz de aceitacao do runner.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito: o runner aceita o contrato enriquecido de `causal-debug.result.json` e `ticket-proposal.json` sem quebrar fixtures legadas.
  - Evidencia observavel: `src/types/target-investigate-case.ts` aceita os campos aditivos; testes do core cobrem shape legado e shape novo.
  - Requisito: o publisher preserva o markdown target-owned, mas rejeita degradacoes estruturais obvias e aplica naming coerente com o escopo do ticket.
  - Evidencia observavel: `src/integrations/target-investigate-case-ticket-publisher.test.ts` cobre headings obrigatorios, duplicacao estrutural minima, artefatos obrigatorios e a politica de slug/filename.
  - Requisito: a orchestration runner-side continua apontando mensagens explicitas quando faltar proposal valida ou quando o rollout entre target e runner estiver desalinhado.
  - Evidencia observavel: `src/core/target-investigate-case.test.ts` e `src/integrations/target-investigate-case-round-preparer.test.ts` mantem gates observaveis e compatibilidade com a publication positiva.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: `exit 0`.
- Comando: `npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotencia: as mudancas ficam restritas ao contrato e ao publisher de `/target_investigate_case`; reexecutar os passos deve manter publication deterministica para o mesmo `ticket-proposal.json`.
- Riscos: drift com o target project, endurecimento excessivo que bloqueie proposals legadas, quebra de dedupe/slug ou regressao em suites grandes do runner.
- Recovery / Rollback: manter a evolucao de schema como aditiva; se o target ainda nao estiver emitindo os campos novos, preservar o comportamento legado; se a politica nova de filename gerar risco de dedupe, manter fallback documentado ate a migracao conjunta.

## Artifacts and Notes
- Diagnostico alvo que motivou a frente: `/home/mapita/projetos/guiadomus-matricula/tickets/open/2026-04-06-8555540138269-extract-address-v10-cache-invalidation-after-complemento-fix-gap.md`.
- Ticket runner-side aberto nesta execucao: `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`.
- Plano complementar no target project: `/home/mapita/projetos/guiadomus-matricula/execplans/2026-04-06-case-investigation-ticket-quality-hardening.md`.
- Artefatos de referencia da rodada ancora: `/home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T16-30-09Z/causal-debug.result.json`, `/home/mapita/projetos/guiadomus-matricula/investigations/2026-04-06T16-30-09Z/ticket-proposal.json`.

## Interfaces and Dependencies
- Interfaces alteradas: schema de `causal-debug.result.json`, schema de `ticket-proposal.json`, publication policy do publisher e naming/dedupe do ticket aberto.
- Compatibilidade: qualquer campo novo deve ser opcional primeiro; o runner deve continuar aceitando o contrato atual durante o rollout.
- Dependencias externas e mocks: depende do target project emitir o contrato atualizado; suites runner-side devem continuar usando fixtures locais e nao chamar servicos externos reais.
