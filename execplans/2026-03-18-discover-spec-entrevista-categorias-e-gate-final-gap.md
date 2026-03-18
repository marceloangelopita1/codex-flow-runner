# ExecPlan - Entrevista profunda, categorias obrigatorias e gate final do /discover_spec

## Purpose / Big Picture
- Objetivo: transformar `/discover_spec` de uma sessao stateful raw em uma entrevista profunda estruturada, com cobertura explicita das categorias obrigatorias, assumptions/defaults e decisoes/trade-offs, mais um gate final que impeça `Criar spec` enquanto houver ambiguidade critica ou categoria pendente.
- Resultado esperado:
  - `/discover_spec` passa a usar um contrato parseavel de pergunta/bloco final, em vez de somente texto raw;
  - o estado da sessao passa a registrar cobertura por categoria, itens `nao aplicavel` com motivo, ambiguidades criticas abertas e o ultimo bloco final aprovado;
  - respostas vagas ou incompletas geram follow-up deterministico, em vez de finalizacao prematura;
  - o resumo final e `/discover_spec_status` mostram assumptions/defaults, decisoes/trade-offs e a matriz de categorias cobertas vs pendentes;
  - `Criar spec` fica bloqueado ate que todas as lacunas criticas estejam tratadas ou explicitadas; `Refinar` retorna ao ciclo de entrevista sem criar arquivos.
- Escopo:
  - estender o protocolo/primer e os eventos da sessao `/discover_spec` em `src/integrations/codex-client.ts`;
  - enriquecer `src/integrations/plan-spec-parser.ts` para aceitar categorias obrigatorias, `nao aplicavel`, assumptions/defaults e decisoes/trade-offs;
  - adicionar estado tipado e gate semantico no runner (`src/types/state.ts`, `src/core/runner.ts`);
  - renderizar pergunta, bloco final e status enriquecidos no Telegram (`src/integrations/telegram-bot.ts`, `src/main.ts`);
  - adicionar cobertura automatizada focada nos closure criteria do ticket;
  - atualizar a spec de origem com rastreabilidade objetiva desta entrega quando o plano for executado.
- Fora de escopo:
  - enriquecer materializacao da spec, `spec_planning/*` e prompts `06/07`; isso pertence ao ticket irmao `tickets/open/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`;
  - transformar `/plan_spec` no fluxo pesado por padrao;
  - introduzir heuristica automatica para escolher entre `/plan_spec` e `/discover_spec`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou dar push nesta etapa.

## Progress
- [x] 2026-03-18 19:56Z - Planejamento inicial concluido com leitura integral do ticket alvo, `PLANS.md`, `docs/workflows/codex-quality-gates.md`, spec de origem, referencias documentais e evidencias de codigo/teste.
- [x] 2026-03-18 20:05Z - Contrato estruturado de `/discover_spec` e parser enriquecido implementados com cobertura de categorias, assumptions/defaults, trade-offs e ambiguidades criticas explicitadas em `[[PLAN_SPEC_FINAL]]`.
- [x] 2026-03-18 20:16Z - Runner passa a rastrear categorias pendentes e ambiguidades criticas, dispara follow-up automatico, bloqueia `Criar spec` em estados inelegiveis e retorna `Refinar` ao ciclo de entrevista.
- [x] 2026-03-18 20:24Z - Telegram passa a renderizar perguntas/finalizacao de `/discover_spec`, callbacks discover-specific sobre o prefixo compartilhado e `/discover_spec_status` enriquecido com cobertura/pedencias/gate.
- [x] 2026-03-18 20:33Z - Matriz de validacao automatizada deste ticket executada com sucesso e spec de origem atualizada com rastreabilidade do subconjunto entregue e blocker residual explicito.

## Surprises & Discoveries
- 2026-03-18 19:56Z - `CodexExecResumeDiscoverSession` hoje segue o caminho de free chat: emite apenas `raw-sanitized`, `activity`, `turn-context` e `turn-complete`, sem primer estruturado nem eventos de pergunta/final.
- 2026-03-18 19:56Z - `DiscoverSpecSessionState` e os replies de status em `runner`/`telegram-bot` guardam somente lifecycle, projeto e timestamps; nao existe mapa tipado de categorias, ambiguidades abertas ou ultimo bloco final.
- 2026-03-18 19:56Z - Toda a superficie de callbacks para pergunta/finalizacao no Telegram e exclusiva de `/plan_spec`; `/discover_spec` ainda nao registra contexto de botoes nem path de `Refinar`/`Criar spec`.
- 2026-03-18 19:56Z - O gate compartilhado atual (`validatePlanSpecFinalBlockForMaterialization`) valida apenas objetivo, atores, jornada, RFs, CAs e nao-escopo; assumptions/defaults, trade-offs e status de cobertura sao invisiveis para a elegibilidade.
- 2026-03-18 19:56Z - O ticket foi corretamente separado do irmao de materializacao: aqui a mudanca precisa parar no protocolo, estado, gate e UX; `spec_planning/*` e prompts de materializacao/versionamento nao devem virar dependencia oculta deste plano.
- 2026-03-18 20:08Z - O parser generico por regex parava a secao `Categorias obrigatorias` no meio das bullets porque os labels `Assumptions/defaults` e `Decisoes e trade-offs` tambem apareciam como categorias; foi necessario trocar essas secoes discover-specific para parsing por headers de linha.
- 2026-03-18 20:19Z - Reutilizar a pipeline atual de `Criar spec` diretamente em `/discover_spec` faria a materializacao perder assumptions/defaults e trade-offs no documento final; o comportamento seguro deste plano passou a ser manter blocker explicito ate o ticket irmao.

## Decision Log
- 2026-03-18 - Decisao: reutilizar os marcadores estruturados `[[PLAN_SPEC_QUESTION]]` e `[[PLAN_SPEC_FINAL]]`, estendendo o schema compartilhado em vez de inventar um segundo protocolo de callbacks para `/discover_spec`.
  - Motivo: parser, callbacks Telegram e fluxo de sessao de `/plan_spec` ja sao estaveis; duplicar marcadores criaria mais superficie de regressao sem ganho funcional.
  - Impacto: `src/integrations/plan-spec-parser.ts` vira contrato compartilhado entre `/plan_spec` e `/discover_spec`, com campos novos opcionais para manter retrocompatibilidade.
- 2026-03-18 - Decisao: representar cobertura de categorias como estado tipado com slugs estaveis e status explicito (`covered`, `not-applicable`, `pending`) em vez de deduzir isso do texto renderizado.
  - Motivo: RF-11, RF-12, RF-22 e CA-04/CA-07/CA-14 exigem observabilidade e gating deterministico; heuristica em string renderizada seria fragil.
  - Impacto: `src/types/state.ts`, `src/core/runner.ts` e `src/integrations/telegram-bot.ts` precisarao de novos tipos, snapshots e renderizacao.
- 2026-03-18 - Decisao: definir ambiguidade critica como uma lista explicita de itens pendentes no estado da sessao, usada tanto para follow-up quanto para o bloqueio de `Criar spec`.
  - Motivo: isso reduz subjetividade do gate e permite testes observaveis com brief vago, defaults conscientes e nao-escopo declarado.
  - Impacto: o runner deve manter pendencias tipadas, montar prompts de follow-up a partir delas e rejeitar `Criar spec` enquanto a lista nao estiver vazia.
- 2026-03-18 - Decisao: limitar este plano a compatibilidade com o pipeline compartilhado de `Criar spec`, sem assumir persistencia final dos campos enriquecidos em `docs/specs/` ou `spec_planning/*`.
  - Motivo: RF-17..RF-21 e CA-10..CA-13/CA-20 pertencem ao ticket irmao de materializacao/rastreabilidade.
  - Impacto: os testes deste ticket devem provar gate, follow-up, `Refinar` e status enriquecido; a preservacao downstream de assumptions/defaults e trade-offs continua sendo validada no ticket irmao.
- 2026-03-18 - Decisao: reutilizar o mesmo prefixo de callback `plan-spec:*` no Telegram, adicionando apenas contexto tipado de fluxo (`plan-spec` vs `discover-spec`) em vez de introduzir um segundo namespace de botoes.
  - Motivo: os fluxos sao mutuamente exclusivos; reaproveitar o callback existente reduz duplicacao e mantem lock/idempotencia numa unica superficie de teste.
  - Impacto: `src/integrations/telegram-bot.ts` ganhou roteamento discover-specific sem quebrar os callbacks existentes de `/plan_spec`.
- 2026-03-18 - Decisao: quando o bloco final de `/discover_spec` ficar semanticamente elegivel, ainda assim manter `Criar spec` bloqueado com mensagem explicita ate o ticket irmao de materializacao/rastreabilidade ser executado.
  - Motivo: permitir a criacao da spec nesta etapa induziria uma materializacao parcialmente perdida, contrariando RF-20/CA-12/CA-13 embora este plano nao deva absorver o ticket irmao.
  - Impacto: o subconjunto deste ticket termina com gate/UX corretos e blocker objetivo documentado; a liberacao efetiva de `Criar spec` fica para `tickets/open/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`.

## Outcomes & Retrospective
- Status final: implementacao e validacao automatizada concluidas no working tree; fechamento formal do ticket ocorreu em etapa posterior de close-out em 2026-03-18 20:40Z.
- O que funcionou: o contrato estruturado compartilhado suportou `/discover_spec` sem regressao visivel em `/plan_spec`; o runner passou a tratar pendencias como estado tipado e o Telegram reaproveitou os callbacks existentes com roteamento por fluxo.
- O que ficou pendente: `Criar spec` de `/discover_spec` permanece bloqueado por design ate o ticket irmao de materializacao/rastreabilidade enriquecer os artefatos finais e a trilha `spec_planning/`.
- Proximos passos: atacar `tickets/open/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md` para liberar `Criar spec` sem perda de rastreabilidade.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`
  - `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`
  - `src/integrations/codex-client.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/types/state.ts`
  - `src/core/runner.ts`
  - `src/main.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/plan-spec-parser.test.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Spec de origem: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.
- RFs cobertos por este plano: RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16 e RF-22.
- CAs cobertos por este plano: CA-04, CA-05, CA-06, CA-07, CA-08 e CA-14.
- Assumptions / defaults adotados para eliminar ambiguidade remanescente:
  - `/discover_spec` deve reutilizar o mesmo modelo de blocos parseaveis e callbacks do `/plan_spec`; a diferenca esta no conteudo exigido, nao no wire format do Telegram.
  - As categorias obrigatorias serao rastreadas com estes slugs estaveis, espelhando RF-10: `objective-value`, `actors-journey`, `functional-scope`, `non-scope`, `constraints-dependencies`, `validations-acceptance`, `risks`, `assumptions-defaults`, `decisions-tradeoffs`.
  - Uma categoria so e considerada resolvida quando houver conteudo explicito ou marcacao `nao aplicavel` com motivo observavel; ausencia de secao ou lista vazia continua contando como pendencia.
  - `Criar spec` so fica elegivel quando nao houver ambiguidades criticas abertas e todas as categorias obrigatorias estiverem resolvidas; a elegibilidade nao deve depender de inferencia silenciosa sobre o texto livre.
  - `Refinar` deve voltar a conversa para a entrevista usando contexto tipado das pendencias atuais e sem criar arquivos no projeto.
- Fluxo atual:
  - `/discover_spec` ja possui sessao stateful, timeout, cancelamento, raw output saneado e bloqueios de concorrencia, mas ainda responde como chat raw e nao como entrevista guiada.
  - `/plan_spec` ja possui parser estruturado, callbacks de pergunta/final e gate basico de materializacao; este plano deve reaproveitar essa base sem forcar o caminho pesado no fluxo leve.
- Restricoes tecnicas:
  - manter `/plan_spec` leve e retrocompativel;
  - nao introduzir dependencia de inferencia silenciosa do modelo para decidir cobertura ou gating;
  - manter fluxo sequencial do runner, sem paralelizacao de tickets;
  - comandos `node`/`npm`/`npx` do plano devem usar o prefixo de ambiente exigido pelo host.

## Plan of Work
- Milestone 1: Contrato estruturado da entrevista profunda.
  - Entregavel: `/discover_spec` passa a injetar um primer dedicado de entrevista profunda e a emitir eventos estruturados de pergunta/final com schema rico para categorias, `nao aplicavel`, assumptions/defaults e decisoes/trade-offs.
  - Evidencia de conclusao: testes em `plan-spec-parser` e `codex-client` mostram parsing e emissao de blocos estruturados para `/discover_spec`, sem quebrar blocos antigos de `/plan_spec`.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/plan-spec-parser.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/plan-spec-parser.test.ts`.
- Milestone 2: Estado tipado e gate semantico no runner.
  - Entregavel: o runner passa a armazenar cobertura por categoria, ambiguidades criticas abertas, ultimo bloco final enriquecido e motivos de bloqueio de `Criar spec`; respostas vagas geram follow-up em vez de finalizacao.
  - Evidencia de conclusao: `src/core/runner.test.ts` prova brief vago com follow-up, defaults conscientemente aceitos, bloqueio de `Criar spec` enquanto houver pendencias e `Refinar` sem criacao de arquivos.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 3: UX Telegram para entrevista, resumo final e status.
  - Entregavel: `/discover_spec` passa a publicar perguntas parseadas, bloco final com novas secoes e callbacks, alem de status com categorias cobertas/pendentes e timestamps.
  - Evidencia de conclusao: `src/integrations/telegram-bot.test.ts` prova renderizacao do resumo final, callbacks de `Refinar`/`Criar spec` bloqueado, idempotencia e `discover_spec_status` com matriz de cobertura.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/main.ts`.
- Milestone 4: Rastreabilidade e validacao focada nos closure criteria.
  - Entregavel: matriz RF/CA -> teste/observacao consolidada, com a spec de origem atualizada para refletir atendimento parcial deste subconjunto e a permanencia do ticket irmao de materializacao.
  - Evidencia de conclusao: suites-alvo verdes, busca textual por CA-04..CA-08/CA-14 encontra evidencias explicitas, e a spec registra este execplan/ticket como parte do atendimento parcial.
  - Arquivos esperados: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "startDiscoverSession|DiscoverSpecSessionEvent|PLAN_SPEC_PROTOCOL_PRIMER|PlanSpecFinalBlock|buildDiscoverSpecStatusReply|onPlanSpecFinalActionSelected|discoverSpecSession" src/integrations/codex-client.ts src/integrations/plan-spec-parser.ts src/types/state.ts src/core/runner.ts src/integrations/telegram-bot.ts src/main.ts` para congelar todos os pontos de acoplamento entre `/discover_spec`, parser, runner e Telegram.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/plan-spec-parser.ts` para estender o schema compartilhado do bloco final com categorias obrigatorias, status por categoria, `nao aplicavel` com motivo, assumptions/defaults e decisoes/trade-offs, mantendo retrocompatibilidade com blocos antigos de `/plan_spec`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/plan-spec-parser.test.ts` cobrindo parse do bloco final enriquecido, campos opcionais vazios, marcacao `nao aplicavel`, persistencia de retrocompatibilidade e casos de chunking/raw fallback.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/codex-client.ts` para adicionar um primer especifico de entrevista profunda, usar o parser estruturado tambem em `/discover_spec` e emitir eventos de pergunta/final adequados em vez de apenas texto raw.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/codex-client.test.ts` provando que `/discover_spec` injeta o primer correto, preserva `thread_id` em `codex exec`/`resume --json`, emite pergunta/final estruturados e continua entregando raw saneado apenas como fallback.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/state.ts` e nos tipos privados de `src/core/runner.ts` para guardar mapa de categorias, ambiguidades criticas abertas, ultimo bloco final enriquecido e elegibilidade de `Criar spec` na sessao `/discover_spec`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.ts` para: interpretar eventos estruturados de `/discover_spec`; atualizar estado tipado; disparar follow-up quando houver ambiguidade critica; bloquear `Criar spec` enquanto existirem categorias/ambiguidades pendentes; e fazer `Refinar` voltar ao ciclo de entrevista sem criar arquivos.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.test.ts` cobrindo os cenarios de closure criteria: brief vago gera follow-up (CA-05), assumptions/defaults e `nao-escopo` resolvem pendencias criticas (CA-07), `Criar spec` bloqueado enquanto houver lacunas (CA-07) e `Refinar` nao chama materializacao/versionamento (CA-08).
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/telegram-bot.ts` e `src/main.ts` para introduzir handlers discover-specific de pergunta/final, callbacks de acoes finais e status com cobertura de categorias cobertas/pendentes, assumptions/defaults e trade-offs.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/telegram-bot.test.ts` para provar renderizacao do bloco final enriquecido, lock/idempotencia dos callbacks, `Refinar` retornando ao ciclo e `/discover_spec_status` exibindo categorias cobertas/pendentes (CA-14).
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/plan-spec-parser.test.ts src/integrations/codex-client.test.ts` para validar o contrato estruturado de protocolo/parser do Milestone 1.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts` para validar follow-up, gate final e `Refinar` no Milestone 2.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts` para validar UX/status/callbacks do Milestone 3.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` para registrar o subconjunto RF-10..RF-16/RF-22 como atendido ou parcialmente atendido, referenciando este execplan e mantendo o ticket irmao de materializacao aberto.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CA-04|CA-05|CA-06|CA-07|CA-08|CA-14|RF-10|RF-11|RF-12|RF-13|RF-14|RF-15|RF-16|RF-22|discover-spec-entrevista-categorias-e-gate-final-gap" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md` para auditoria final de rastreabilidade.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts` para a passada final da matriz de validacao deste ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:

| Requisito / closure criterion | Validacao observavel |
| --- | --- |
| RF-10, RF-11, RF-15; CA-04, CA-06 | `src/integrations/plan-spec-parser.test.ts` prova que o bloco final enriquecido aceita as 9 categorias obrigatorias, `nao aplicavel` com motivo, assumptions/defaults e decisoes/trade-offs; `src/integrations/codex-client.test.ts` prova que `/discover_spec` injeta o protocolo estruturado e emite pergunta/final parseados; `src/integrations/telegram-bot.test.ts` prova que o resumo final renderiza essas secoes de forma observavel. |
| RF-12, RF-13, RF-14; CA-05, CA-07 | `src/core/runner.test.ts` prova que brief/resposta vagos mantem ambiguidades criticas abertas, geram follow-up e bloqueiam `Criar spec` ate que a pendencia seja convertida em assumption/default ou nao-escopo explicito. |
| RF-16; CA-08 | `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` provam que `Refinar` retorna ao ciclo de entrevista, preserva a sessao e nao chama materializacao/versionamento nem cria arquivos. |
| RF-22; CA-14 | `src/integrations/telegram-bot.test.ts` prova que `/discover_spec_status` exibe fase, projeto, timestamps e a lista de categorias cobertas vs pendentes; `src/core/runner.test.ts` prova que o snapshot tipado de cobertura/pendencia e atualizado conforme as respostas e eventos estruturados da sessao. |
| Cobertura automatizada exigida pelo ticket | A passada final `npx tsx --test` sobre `runner`, `telegram-bot`, `codex-client` e `plan-spec-parser` fica verde e a busca `rg` encontra referencias explicitas para CA-04, CA-05, CA-06, CA-07, CA-08 e CA-14 nos testes/spec. |

- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/plan-spec-parser.test.ts src/integrations/codex-client.test.ts`
  - Esperado: a suite demonstra parsing e emissao de pergunta/final estruturados para `/discover_spec`, com categorias obrigatorias, `nao aplicavel`, assumptions/defaults e trade-offs, sem regressao nos blocos atuais de `/plan_spec`.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: a suite demonstra follow-up diante de ambiguidades criticas, bloqueio de `Criar spec` enquanto houver pendencias, desbloqueio apenas quando as pendencias forem explicitadas e `Refinar` sem criacao de arquivos.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: a suite demonstra renderizacao do bloco final enriquecido, callbacks discover-specific para acoes finais e `/discover_spec_status` exibindo categorias cobertas/pendentes, assumptions/defaults e trade-offs.
- Comando: `rg -n "CA-04|CA-05|CA-06|CA-07|CA-08|CA-14" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`
  - Esperado: cada CA relevante aparece explicitamente em testes e/ou na secao de evidencias da spec, garantindo rastreabilidade auditavel.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts`
  - Esperado: a matriz completa deste ticket passa em conjunto, demonstrando que protocolo, runner e Telegram convergem para o mesmo contrato observavel.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar as suites-alvo nao cria side effects persistentes nem depende de Telegram/Codex reais;
  - os campos novos do parser devem permanecer opcionais para que blocos antigos de `/plan_spec` continuem validos;
  - cancelar, expirar ou reiniciar `/discover_spec` deve limpar completamente o mapa de categorias/ambiguidades da sessao anterior.
- Riscos:
  - regressao em `/plan_spec` por compartilhamento de parser, tipos e callbacks;
  - gate de ambiguidade critica ficar permissivo ou arbitrario se as pendencias nao forem tipadas com motivo observavel;
  - permitir `Criar spec` em `/discover_spec` antes do ticket irmao pode levar a uma materializacao que ainda perca assumptions/defaults e trade-offs no documento final.
- Recovery / Rollback:
  - manter os campos novos como extensao opcional e retrocompativel; se `/plan_spec` regredir, isolar a logica discover-specific em wrappers em vez de aprofundar a abstracao compartilhada;
  - se o gate ficar dificil de provar em teste, reduzir o criterio para um conjunto pequeno e tipado de pendencias explicitas, em vez de heuristica textual;
  - se a integracao com o pipeline compartilhado de `Criar spec` ficar enganosa antes do ticket irmao, preservar neste ticket apenas a validacao/rejeicao observavel e registrar blocker explicito em vez de inventar persistencia parcial.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`.
- Spec de referencia: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`.
- Ticket irmao que nao deve ser absorvido por este plano: `tickets/open/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`.
- Documentacao/processo consultados:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
- Evidencias tecnicas consultadas durante o planejamento:
  - `src/integrations/codex-client.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/types/state.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/plan-spec-parser.test.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Nota de sequenciamento: executar este plano antes do ticket de materializacao so e seguro se a entrega mantiver a fronteira clara de escopo; o ticket irmao continua necessario para que os campos enriquecidos cheguem ao artefato final da spec.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `PlanSpecFinalBlock` / `PlanSpecFinalOutline` (ou tipos compartilhados equivalentes) para suportar categorias, `nao aplicavel`, assumptions/defaults e decisoes/trade-offs;
  - `DiscoverSpecSessionEvent` e `DiscoverSpecEventHandlers` para suportar pergunta/final estruturados, nao apenas raw output;
  - `DiscoverSpecSessionState` e possiveis tipos auxiliares para cobertura por categoria, ambiguidades abertas e elegibilidade de `Criar spec`;
  - controles do `TelegramController` e callbacks discover-specific de finalizacao/status.
- Compatibilidade:
  - `/plan_spec` deve continuar parseando e renderizando blocos sem as secoes novas;
  - `/discover_spec`, `/plan_spec` e `/codex_chat` continuam mutuamente exclusivos como sessoes globais de texto livre;
  - a persistencia enriquecida em `spec_planning/*` e no prompt de materializacao continua fora deste contrato e sera tratada pelo ticket irmao.
- Dependencias externas e mocks:
  - dependencia operacional principal continua sendo o Codex CLI em `exec` / `resume --json` com `thread_id`;
  - Telegram segue mockado em `src/integrations/telegram-bot.test.ts`;
  - `runner` e `codex-client` devem continuar usando stubs/doubles para evitar chamadas reais ao Codex durante a validacao.
