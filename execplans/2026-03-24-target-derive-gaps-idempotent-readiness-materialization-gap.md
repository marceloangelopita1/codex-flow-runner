# ExecPlan - Target derive gaps idempotent readiness materialization gap

## Purpose / Big Picture
- Objetivo: introduzir o fluxo `/target_derive_gaps <project-name> <report-path>` para transformar um readiness checkup canonico e elegivel em backlog local acionavel, com validacao forte do relatorio, deduplicacao por `Gap fingerprint`, reuso de ticket aberto equivalente, reabertura explicita de recorrencia, write-back rastreavel no proprio artefato de checkup e versionamento atomico no repo alvo.
- Resultado esperado:
  - o runner passa a aceitar `/target_derive_gaps <project-name> <report-path>` como superficie publica do fluxo, sem trocar implicitamente o projeto ativo global;
  - o fluxo rejeita working tree sujo, projeto invalido, `report-path` nao relativo ao repo alvo, relatorio de outro projeto, relatorio stale, relatorio driftado, relatorio sem elegibilidade explicita para derivacao e payload de gap analysis invalido, sem criar/alterar tickets nem commitar artefatos;
  - a derivacao usa um estagio dedicado de analise estruturada ancorado nos fatos canonicos do checkup, calcula `Gap ID`, `Gap fingerprint`, score e `Priority` deterministicamente em codigo, e materializa apenas gaps readiness com acao local observavel;
  - gaps equivalentes reutilizam o ticket aberto existente, gaps equivalentes ja fechados geram novo ticket com vinculo explicito de recorrencia, gaps dependentes de insumo externo viram `Status: blocked`, e limitacoes do runner ficam apenas no write-back do relatorio;
  - tickets derivados nascem autocontidos com `Source: readiness-checkup`, caminhos do relatorio `.json` e `.md`, SHAs, tipo, dimensao, matriz de prioridade, evidencias, assumptions/defaults, validation notes, superficie local de remediacao e closure criteria observaveis;
  - o relatorio `.json` e o relatorio `.md` recebem write-back de derivacao com `derivation_status`, `derived_at_utc`, resultado por gap e caminhos dos tickets afetados, tudo no mesmo changeset das mutacoes reais em tickets;
  - rerodar o mesmo relatorio com o mesmo mapeamento resulta em `no-op com mapeamento existente`, sem ticket duplicado e sem commit vazio.
- Escopo:
  - tipos, parser, prompt e executor do dominio `target_derive_gaps`;
  - validacao de elegibilidade do report e normalizacao de `report-path`;
  - renderizacao/materializacao de tickets readiness usando o template interno do repo alvo;
  - write-back de derivacao em `docs/checkups/history/<timestamp>-project-readiness-checkup.{json,md}`;
  - wiring minimo em `main.ts`, `runner.ts`, `telegram-bot.ts`, `codex-client.ts` e `README.md` para expor o comando;
  - cobertura automatizada dos closure criteria e smokes manuais herdados da spec/ticket.
- Fora de escopo:
  - `/_status`, `/_cancel`, slot kinds canonicos, milestones, CTAs e traces locais dos fluxos target, que pertencem ao ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`;
  - alteracoes na coleta base de `target_prepare`;
  - refazer a arquitetura completa de `target_checkup`; qualquer mudanca naquele fluxo deve ficar restrita ao schema/write-back do relatorio e a utilitarios realmente necessarios para a derivacao;
  - transformar `target_derive_gaps` em gerador generico de backlog funcional do produto;
  - abrir ticket automatico no `codex-flow-runner` para limitacoes do proprio runner.

## Progress
- [x] 2026-03-24 22:31Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, das referencias documentais do ticket, dos ExecPlans irmaos de `target_prepare` e `target_checkup`, e das superficies atuais de `runner`, `telegram`, `codex-client`, `git-client`, `ticket-queue`, `workflow-improvement-ticket-publisher` e `target-checkup`.
- [x] 2026-03-24 23:09Z - Contrato de tipos, parser estruturado de gap analysis e schema de write-back do report implementados em `src/types/target-derive.ts`, `src/integrations/target-derive-gap-analysis-parser.ts`, `src/types/target-checkup.ts` e `src/core/target-checkup.ts`, com cobertura automatizada dedicada.
- [x] 2026-03-24 23:09Z - Executor de `target_derive_gaps`, deduplicacao por fingerprint, renderizacao de ticket e versionamento atomico implementados com suites automatizadas verdes, incluindo `no-op` do mesmo report, reuso de ticket aberto, recorrencia de ticket fechado e `runner_limitation` sem ticket no alvo.
- [x] 2026-03-24 23:09Z - Wiring publico em `main.ts`, `runner.ts`, `telegram-bot.ts` e `README.md` concluido com replies observaveis, ajuda minima e documentacao operacional do comando.
- [ ] 2026-03-24 22:31Z - Smokes manuais herdados executados: rerun idempotente, recorrencia de gap fechado e permissao real de `git push`.

## Surprises & Discoveries
- 2026-03-24 22:31Z - O schema atual de `TargetCheckupReport` persiste `dimensions`, `editorial_summary_markdown` e `derivation_readiness`, mas nao persiste uma colecao estruturada de gaps nem um bloco de resultados de derivacao; o plano precisa tratar essa ausencia explicitamente em vez de assumir input pronto.
- 2026-03-24 22:31Z - `GitCliVersioning.commitAndPushPaths` ja resolve o caso desejado de um unico commit para tickets + write-back do report; ao contrario do `target_checkup`, nao ha requisito autorreferencial equivalente a `report_commit_sha` que force publicacao em duas fases.
- 2026-03-24 22:31Z - `FileSystemTicketQueue` ja entende `Priority` e `Status: blocked`, mas nao oferece busca por `Gap fingerprint`; a logica mais proxima de dedupe esta privada em `workflow-improvement-ticket-publisher.ts` e nao pode ser reaproveitada sem extracao ou reimplementacao.
- 2026-03-24 22:31Z - `README.md`, o help inicial do Telegram e o wiring de `main.ts`/`runner.ts` hoje publicam apenas `/target_prepare` e `/target_checkup`; `/target_derive_gaps` ainda nao existe em nenhuma dessas superficies.
- 2026-03-24 23:09Z - O rerun do mesmo report gerava diff espurio por se reclassificar automaticamente de `materialized_as_ticket` para `reused_existing_ticket`; a idempotencia forte so fechou quando o executor passou a preservar o resultado previamente gravado em `gap_derivation` para o mesmo `gap_fingerprint`, desde que os caminhos ainda existam.
- 2026-03-24 23:09Z - Reusar o mesmo basename de ticket apos mover o equivalente para `tickets/closed/` quebrava a nocao de recorrencia como novo artefato rastreavel; o materializador precisou reservar tambem o nome aberto correspondente aos tickets fechados para forcar novo arquivo de recorrencia.

## Decision Log
- 2026-03-24 - Decisao: manter a normalizacao estruturada de gaps dentro do proprio `target_derive_gaps`, via prompt dedicado + parser estrito + calculo deterministico de fingerprint/score/prioridade em codigo, em vez de reabrir o pipeline inteiro de `target_checkup` como precondicao funcional.
  - Motivo: o `checkup` atual ja publica fatos canonicos suficientes (`dimensions`, `evidence`, comandos, sumario editorial e `derivation_readiness`), mas nao persiste gaps estruturados; concentrar a normalizacao aqui destrava a funcionalidade sem invalidar obrigatoriamente relatorios ja versionados.
  - Impacto: este ticket toca `codex-client`, adiciona um novo prompt/parser e estende o schema de write-back do report, mas evita depender de uma migracao previa de todos os artefatos do `checkup`.
- 2026-03-24 - Decisao: aceitar `report-path` apontando para o `.json` ou para o `.md`, sempre normalizando para o mesmo stem canonico e usando o `.json` como source of truth para validacao e materializacao.
  - Motivo: a UX atual do `target_checkup` expoe ambos os caminhos no resumo final; exigir um unico formato sem normalizacao aumentaria friccao operacional sem ganho funcional relevante.
  - Impacto: o executor precisa validar a existencia coerente dos dois artefatos irmaos antes de qualquer mutacao e refletir ambos os caminhos nos tickets derivados.
- 2026-03-24 - Decisao: considerar o rerun do mesmo relatorio um `no-op` estrito quando o write-back ja refletir o mesmo mapeamento de gaps para tickets/resultados, sem atualizar `derived_at_utc` nem gerar commit vazio.
  - Motivo: CA-08 exige idempotencia forte e ausencia de commit vazio; regravar timestamp em rerun feliz quebraria exatamente esse contrato.
  - Impacto: o write-back precisa ser comparavel deterministicamente e o executor deve sair cedo antes de qualquer `commitAndPushPaths` quando nao houver diff material.
- 2026-03-24 - Decisao: manter `/_status`, `/_cancel`, milestones canonicos e traces locais fora deste plano, mesmo com o novo comando tocando `runner` e `telegram`.
  - Motivo: a spec ja particionou essa camada em ticket proprio.
  - Impacto: este plano entrega a capacidade funcional de derivacao e a superficie publica minima do comando; o risco residual de UX/operacao compartilhada permanece explicitamente delegado ao ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`.
- 2026-03-24 23:09Z - Decisao: no rerun do mesmo report, reutilizar o resultado ja persistido em `report.gap_derivation.gap_results` quando o `gap_fingerprint` e a classe de materializacao continuarem compativeis e os `ticket_paths` ainda existirem.
  - Motivo: sem essa ancoragem, a propria deteccao do ticket aberto equivalente convertia o mesmo report em diff espurio (`materialized_as_ticket` -> `reused_existing_ticket`) e violava o contrato de `no-op`.
  - Impacto: o snapshot do write-back permanece estavel no mesmo report, enquanto reports novos continuam podendo enriquecer o ticket aberto equivalente com o caminho canonico mais recente.
- 2026-03-24 23:09Z - Decisao: tratar o basename de um ticket fechado equivalente como nome reservado ao gerar recorrencia em `tickets/open/`.
  - Motivo: RF-25 e o roteiro manual do plano exigem novo ticket com vinculo explicito de recorrencia, nao a reciclarem silenciosa do mesmo caminho anterior.
  - Impacto: recorrencias passam a nascer como artefatos distintos e preservam a trilha historica entre `tickets/closed/` e o novo ticket aberto.

## Outcomes & Retrospective
- Status final: execucao tecnica concluida; smokes manuais externos herdados continuam pendentes.
- O que precisa existir ao final:
  - entrada publica `/target_derive_gaps <project-name> <report-path>` no bot, no runner e na documentacao minima;
  - validacao forte de report por projeto, SHA, idade, drift, working tree limpo e elegibilidade explicita para derivacao;
  - estagio estruturado de gap analysis com parser estrito, `Gap ID`, `Gap fingerprint` estavel e decisao de materializacao observavel;
  - criacao/reuso/recorrencia de tickets readiness autocontidos no proprio projeto alvo;
  - write-back em `json + md` com resultado por gap e caminhos de tickets, no mesmo commit das mutacoes reais;
  - testes cobrindo os closure criteria e smokes manuais herdados descritos neste plano.
- O que foi entregue nesta execucao:
  - executor dedicado de `target_derive_gaps`, prompt/parser estruturados e schema de write-back no report;
  - renderizacao de tickets readiness autocontidos com `Gap ID`, `Gap fingerprint`, dimensao, SHAs, matriz de prioridade, evidencias, assumptions/defaults, validation notes e `Parent ticket` para recorrencia;
  - idempotencia forte no mesmo report, reuso por fingerprint em report novo e recorrencia com novo arquivo quando o equivalente ja estiver fechado;
  - wiring do comando em `runner`, `main`, `telegram` e `README`, com resumo rastreavel de sucesso/no-op/bloqueio.
- O que fica pendente fora deste plano:
  - camada compartilhada de `/_status`, `/_cancel`, milestones, CTAs e traces dos fluxos target;
  - qualquer ampliacao futura do report de `checkup` para carregar gaps estruturados de forma nativa ja na geracao do audit;
  - qualquer publicacao cross-repo automatica de limitacoes do runner detectadas durante a derivacao;
  - os smokes manuais em repo alvo real com Telegram e `git push` funcional.
- Proximos passos:
  - concluir os smokes manuais externos herdados;
  - seguir para o ticket irmao de controle operacional compartilhado quando a capacidade funcional de `derive` estiver verde.

## Context and Orientation
- Arquivos e superficies principais lidos no planejamento:
  - `tickets/closed/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `execplans/2026-03-24-target-prepare-controlled-onboarding-gap.md`
  - `execplans/2026-03-24-target-checkup-readiness-audit-gap.md`
  - `README.md`
  - `src/core/target-checkup.ts`
  - `src/types/target-checkup.ts`
  - `src/integrations/target-checkup-git-guard.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/git-client.ts`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `docs/checkups/checkup-nao-funcional.md`
- Spec de origem:
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- RFs/CAs cobertos por este plano:
  - RF-01 (superficie `/target_derive_gaps`)
  - RF-19
  - RF-20
  - RF-21
  - RF-22
  - RF-23
  - RF-24
  - RF-25
  - RF-26
  - RF-27
  - RF-28
  - CA-07
  - CA-08
  - CA-09
  - CA-10
  - CA-11
- RNFs e restricoes herdados que condicionam implementacao/aceite:
  - manter fluxo sequencial, sem paralelizacao de tickets;
  - preservar o projeto alvo como fonte canonica dos tickets derivados e do write-back no artefato de checkup;
  - manter derivacao fortemente idempotente;
  - criar apenas tickets autocontidos com evidencia suficiente para outra IA executar sem reler o relatorio inteiro;
  - exigir working tree limpo, projeto explicito e `report-path` explicito relativo ao repo alvo;
  - recusar relatorio invalido, stale, driftado ou pertencente a outro projeto;
  - agrupar por unidade real de remediacao;
  - usar `Status: blocked` quando faltar insumo externo sem proximo passo local executavel;
  - registrar limitacoes do runner como `not_materialized_runner_limitation`, sem abrir ticket automatico no alvo;
  - versionar tickets + update do relatorio no mesmo changeset das mutacoes reais.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - o comando aceita `report-path` apontando para o `.json` ou para o `.md`, mas normaliza sempre para o mesmo stem e usa o `.json` como artefato canonico de leitura;
  - o estagio de Codex de `derive` devolve payload estruturado contendo `fingerprint_basis`, classificacao de materializacao, matriz de prioridade, superficies de remediacao, assumptions/defaults e closure criteria por gap; qualquer payload incompleto ou incoerente invalida a rodada antes de criar tickets;
  - `Gap ID` e `Gap fingerprint` sao calculados deterministicamente em codigo a partir do `fingerprint_basis`, nunca do nome do arquivo do ticket nem do timestamp do relatorio;
  - reuso de ticket aberto equivalente atualiza o proprio ticket existente com os caminhos do relatorio mais recente, SHAs, evidencias e `Decision log` da nova observacao, sem renomear o arquivo;
  - recorrencia de ticket fechado equivalente cria novo ticket em `tickets/open/` com vinculo explicito ao ticket fechado anterior usando `Parent ticket` e registro em `Decision log`;
  - gaps classificados como `not_materialized_informational`, `not_materialized_insufficient_specificity` e `not_materialized_runner_limitation` atualizam apenas o write-back do report e jamais criam ticket no alvo;
  - o write-back de derivacao vive em uma nova secao explicita do report `.json` e em secao correspondente do `.md`, preservando `derivation_readiness` como gate de elegibilidade e evitando sobrescrever semantica existente do `checkup`.
- Fluxo atual relevante:
  - `/target_prepare` e `/target_checkup` ja existem e nao trocam implicitamente o projeto ativo global;
  - `target_checkup` ja calcula validade por SHA/idade/drift com `evaluateTargetCheckupDerivationReadiness`, publica `docs/checkups/history/<timestamp>-project-readiness-checkup.{json,md}` e responde com ambos os caminhos;
  - `ticket-queue` ja processa `Priority` e respeita `Status: blocked`, mas nao busca equivalencia por `Gap fingerprint`;
  - nao existe `target_derive_gaps` em `runner`, `telegram`, `main`, `README`, `codex-client`, `prompts/` ou `src/core/`;
  - o report atual nao possui bloco de resultados de derivacao nem colecao estruturada de gaps; isso precisa ser introduzido neste ticket ou sintetizado deterministicamente a partir dos fatos existentes.
- Restricoes tecnicas e operacionais adicionais:
  - qualquer comando `npm` deste plano deve repetir `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` no mesmo comando;
  - validacoes que dependam de push remoto real devem ocorrer em repo alvo de smoke com upstream funcional;
  - o fluxo deve continuar operando somente sobre diretorios irmaos dentro de `PROJECTS_ROOT_PATH`.

## Plan of Work
- Milestone 1: formalizar o contrato de derivacao e o schema de write-back.
  - Entregavel: tipos dedicados de `target_derive_gaps`, parser estrito do payload estruturado de gap analysis, extensao minima do `TargetCheckupReport` para registrar resultado de derivacao e renderizacao Markdown correspondente.
  - Evidencia de conclusao: testes unitarios validam parsing/normalizacao do payload, rejeicao de output incompleto, normalizacao de `report-path`, e presenca da nova secao de derivacao no `.json` e no `.md`.
  - Arquivos esperados:
    - `src/types/target-derive.ts`
    - `src/types/target-checkup.ts`
    - `src/integrations/target-derive-gap-analysis-parser.ts`
    - `src/integrations/target-derive-gap-analysis-parser.test.ts`
    - `prompts/15-target-derive-gaps-idempotent-readiness-materialization.md`
- Milestone 2: implementar o executor idempotente de materializacao e dedupe.
  - Entregavel: executor que resolve projeto alvo, valida o report contra projeto/SHA/idade/drift, invoca o estagio estruturado de gap analysis, calcula fingerprint/score/prioridade em codigo, decide `materialized | reused | blocked | not_materialized_*`, renderiza tickets e atualiza o report.
  - Evidencia de conclusao: testes cobrem dirty tree, relatorio invalido/stale/driftado/de outro projeto, rerun do mesmo relatorio com `no-op`, reuso de ticket aberto, reabertura de recorrencia fechada e runner limitation sem ticket.
  - Arquivos esperados:
    - `src/core/target-derive.ts`
    - `src/core/target-derive.test.ts`
    - helper(s) novos ou extraidos para busca por fingerprint em `tickets/open/` e `tickets/closed/`
    - possivel guard/helper Git dedicado de derive, se a interface atual de `target-checkup-git-guard` nao puder ser reaproveitada com seguranca
- Milestone 3: expor o comando e fechar a fronteira de versionamento.
  - Entregavel: wiring completo do novo executor em `main.ts`, `runner.ts`, `telegram-bot.ts`, `codex-client.ts` e `README.md`, com replies observaveis e um unico commit para tickets + write-back do report quando houver mutacao real.
  - Evidencia de conclusao: testes de `runner`, `telegram` e `git-client` confirmam parse do comando, respostas para sucesso/no-op/falha, e `commitAndPushPaths` com todos os caminhos esperados no mesmo changeset.
  - Arquivos esperados:
    - `src/main.ts`
    - `src/core/runner.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/codex-client.ts`
    - `src/integrations/git-client.ts` (somente se o resumo/result type precisar de evidencia adicional)
    - `README.md`
- Milestone 4: revalidar aceite funcional e smokes externos herdados.
  - Entregavel: matriz de validacao automatizada verde e roteiro manual executado para rerun idempotente, recorrencia de gap fechado e permissao real de `git push`.
  - Evidencia de conclusao: suites direcionadas verdes e registro manual de `git log -1 --stat`, `git status --porcelain` e paths derivados no repo alvo de smoke.
  - Arquivos esperados:
    - suites atualizadas em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/git-client.test.ts`
    - notas de validacao manual, se houver artefato rastreavel adicional no fechamento do ticket

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir `tickets/closed/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`, `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`, `src/types/target-checkup.ts`, `src/core/target-checkup.ts`, `src/integrations/codex-client.ts`, `src/integrations/git-client.ts`, `src/core/runner.ts` e `src/integrations/telegram-bot.ts` para confirmar o delta real antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/target-checkup.ts` e criar `src/types/target-derive.ts` para modelar:
   - request/result do executor;
   - contrato do payload estruturado de gap analysis;
   - bloco de write-back do report (`derivation_status`, `derived_at_utc`, resultados por gap, caminhos de tickets);
   - utilitarios de `Gap ID`, `Gap fingerprint`, score e `Priority`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `prompts/15-target-derive-gaps-idempotent-readiness-materialization.md` e adicionar em `src/integrations/codex-client.ts` o request/result dedicados de `target_derive_gaps`, enviando somente fatos canonicos do report, caminho do report, contexto do projeto alvo e a orientacao de responder em formato estruturado parseavel.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/target-derive-gap-analysis-parser.ts` com parser estrito e testes em `src/integrations/target-derive-gap-analysis-parser.test.ts`, rejeitando gaps sem `fingerprint_basis`, sem matriz de prioridade valida, sem superficie de remediacao observavel ou sem closure criteria utilizaveis.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/core/target-derive.ts` para:
   - resolver o projeto alvo;
   - normalizar `report-path` para o stem canonico;
   - validar working tree limpo, projeto do report, elegibilidade via `evaluateTargetCheckupDerivationReadiness`, idade e drift;
   - montar o payload factual para o prompt;
   - interpretar o resultado estruturado;
   - calcular `Gap ID`, `Gap fingerprint`, score e `Priority` em codigo;
   - decidir materializacao, reuso, recorrencia, `blocked` e `not_materialized_*`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Extrair ou implementar helper(s) de busca por `Gap fingerprint` em `tickets/open/` e `tickets/closed/`, reaproveitando apenas o que for seguro da logica hoje privada em `workflow-improvement-ticket-publisher.ts` e preservando o contrato de `Status: blocked`/`Priority` do template interno.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar a renderizacao do ticket readiness para preencher o template interno com:
   - `Source: readiness-checkup`
   - caminhos do report `.json` e `.md`
   - `Analyzed head SHA`
   - `Report commit SHA`
   - `Gap ID`
   - `Gap fingerprint`
   - `Gap type`
   - `Checkup dimension`
   - matriz de prioridade completa
   - evidencias objetivas
   - superficie local de remediacao
   - assumptions/defaults
   - validation notes
   - closure criteria observaveis
   - `Parent ticket` quando houver recorrencia de ticket fechado
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Estender `src/core/target-checkup.ts` apenas no que for necessario para persistir/renderizar o bloco de derivacao no report `.json` e `.md`, garantindo que o rerun do mesmo mapeamento seja diff-free e que `derivation_readiness` continue intacto como gate de elegibilidade.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Fechar a fronteira de versionamento usando `commitAndPushPaths` para commitar juntos o report `.json`, o report `.md` e todos os tickets tocados; se o resultado for `no-op`, sair antes de qualquer commit.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Wiring do comando em `src/main.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `README.md`, incluindo parse de `/target_derive_gaps`, replies para sucesso/no-op/falha e ajuda publica minima.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-derive.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts src/integrations/target-derive-gap-analysis-parser.test.ts` para validar os cenarios automatizados dos closure criteria.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` como guardrail tipado complementar apos o wiring final, sem usar esse comando como aceite funcional primario.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` e, em repo alvo de smoke preparado e com push real permitido, executar `/target_checkup <project-name>` para obter um report fresco e elegivel.
14. (workdir: repo alvo de smoke) Executar `/target_derive_gaps <project-name> <report-path>` via Telegram com o `report-path` retornado pelo `target_checkup`; depois inspecionar `git status --porcelain`, `git log -1 --stat`, `tickets/open/`, `docs/checkups/history/<timestamp>-project-readiness-checkup.json` e `.md` para confirmar o mesmo changeset.
15. (workdir: repo alvo de smoke) Reexecutar `/target_derive_gaps` sobre o mesmo `report-path` e confirmar ausencia de novo commit; depois gerar novo `target_checkup` com gap equivalente ainda aberto para validar reuso do ticket existente.
16. (workdir: repo alvo de smoke) Fechar manualmente o ticket equivalente derivado, manter o gap real em aberto no codigo/documentacao do projeto alvo, gerar novo `target_checkup` e rerodar `/target_derive_gaps` para confirmar recorrencia com novo ticket e vinculo explicito ao ticket fechado anterior.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01 (superficie `/target_derive_gaps`), RF-19, RF-20; CA-07.
    - Evidencia observavel: `/target_derive_gaps <project-name> <report-path>` exige projeto explicito, `report-path` explicito relativo ao repo alvo, working tree limpo e relatorio elegivel; relatorios invalidos, stale, driftados, de outro projeto ou sem elegibilidade explicita para derivacao sao recusados sem criar/alterar tickets nem tocar o write-back do report; testes cobrem cada causa de bloqueio.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-derive.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: a suite cobre parse do comando, projeto invalido/ausente, dirty tree, `report-path` invalido, report de outro projeto, `derivation_readiness` invalida, idade expirada e drift de commit, e comprova que nenhuma escrita/commit ocorre nesses cenarios.
  - Requisito: RF-21, RF-22, RF-23, RF-24, RF-25; CA-08, CA-09, CA-11.
    - Evidencia observavel: a derivacao agrupa sintomas coerentes por superficie corretiva, materializa apenas gaps com acao local observavel, cria `Status: blocked` quando falta insumo externo, registra limitacoes do runner como `not_materialized_runner_limitation`, reroda o mesmo relatorio valido em `no-op com mapeamento existente`, reutiliza ticket aberto equivalente em report novo e cria recorrencia quando o equivalente ja estiver fechado.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-derive.test.ts src/integrations/target-derive-gap-analysis-parser.test.ts src/integrations/git-client.test.ts`
    - Esperado: a suite valida parser estrito, calculo deterministico de `Gap fingerprint`/score/prioridade, rerun idempotente sem commit, reuso de ticket aberto, recorrencia de ticket fechado, `Status: blocked` para dependencia externa e `not_materialized_runner_limitation` sem novo ticket no alvo.
  - Requisito: RF-26, RF-27, RF-28; CA-10.
    - Evidencia observavel: tickets derivados nascem no proprio projeto alvo com `Source: readiness-checkup`, caminhos `.json` e `.md`, `Analyzed head SHA`, `Report commit SHA`, `Gap ID`, `Gap fingerprint`, `Gap type`, `Checkup dimension`, matriz completa de prioridade, evidencias, superficie local de remediacao, assumptions/defaults, validation notes e closure criteria; o report recebe write-back com `derivation_status`, `derived_at_utc`, resultado por gap cobrindo `materialized_as_ticket`, `reused_existing_ticket`, `blocked_ticket_created`, `not_materialized_informational`, `not_materialized_insufficient_specificity` e `not_materialized_runner_limitation`, alem dos caminhos dos tickets afetados, tudo no mesmo changeset.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-derive.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts src/integrations/git-client.test.ts`
    - Esperado: os testes afirmam o corpo do ticket derivado, o payload factual enviado ao prompt, o resumo de sucesso/no-op no Telegram e o stage unico de versionamento contendo report `.json`, report `.md` e todos os tickets tocados no mesmo commit.
  - Requisito: validacoes manuais herdadas da spec/ticket.
    - Evidencia observavel: um smoke real confirma rerun idempotente sem novo commit, recorrencia apos fechamento do ticket equivalente e permissao real de `git push` no repo alvo de teste.
    - Comando: iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`, executar `/target_checkup <project-name>` e `/target_derive_gaps <project-name> <report-path>` via Telegram, e inspecionar `git status --porcelain`, `git log -1 --stat`, `tickets/open/`, `tickets/closed/` e `docs/checkups/history/<timestamp>-project-readiness-checkup.{json,md}` no repo alvo de smoke.
    - Esperado: a primeira rodada materializa ou atualiza apenas tickets elegiveis e o write-back do report em um commit realmente enviado ao remoto; rerodar o mesmo report nao gera novo commit; apos fechar o ticket equivalente e gerar novo checkup do mesmo gap, a nova rodada cria ticket de recorrencia com vinculo explicito ao fechado.

## Idempotence and Recovery
- Idempotencia:
  - rerodar o mesmo `report-path` com o mesmo mapeamento registrado precisa retornar `no-op com mapeamento existente`, sem regravar `derived_at_utc`, sem duplicar tickets e sem commit vazio;
  - rerodar com report novo e gap equivalente aberto precisa atualizar o ticket existente, preservando filename e enriquecendo metadados/evidencias sem perder rastreabilidade anterior;
  - rerodar com report novo e gap equivalente fechado precisa criar novo ticket com vinculo explicito de recorrencia, sem reabrir in-place o ticket em `tickets/closed/`;
  - gaps insuficientes, informativos ou de limitacao do runner precisam convergir sempre para `not_materialized_*`, alterando apenas o report quando ainda nao houver write-back equivalente.
- Riscos:
  - o payload atual do `checkup` pode nao oferecer fatos suficientes para um `fingerprint_basis` estavel em alguns gaps; nesses casos, a implementacao precisa cair para `not_materialized_insufficient_specificity`, nunca para ticket fraco ou duplicado;
  - fingerprint basis excessivamente largo pode colapsar gaps distintos; fingerprint basis estreito demais pode impedir reuso entre reports equivalentes;
  - o write-back em `json + md` pode divergir se a serializacao nao compartilhar a mesma estrutura de dados in-memory;
  - falha de push apos commit local pode deixar o repo alvo a frente do remoto, exigindo recovery antes de qualquer rerun;
  - o ticket irmao de controle operacional compartilhado continua aberto, entao replies/status ainda ficarao com a camada minima deste ticket.
- Recovery / Rollback:
  - se o relatorio for invalido, stale, driftado ou de outro projeto, nao force edicao manual do report; corrija a causa objetiva e gere novo `target_checkup` antes de rerodar `target_derive_gaps`;
  - se o parser do payload estruturado falhar antes do commit, corrigir prompt/parser, garantir `git status --porcelain` limpo e rerodar sobre o mesmo report, sem alterar manualmente tickets no meio;
  - se houver diff local antes do commit por falha de renderizacao ou write-back, inspecionar `git status --porcelain` e remover/restaurar apenas os arquivos tocados por esta rodada; em repositorios descartaveis de smoke, prefira recriar o repo em vez de usar limpeza destrutiva;
  - se o push falhar depois do commit local, nao rerodar `target_derive_gaps`; primeiro sincronize o commit existente com o remoto e so depois considere nova rodada;
  - se uma descoberta nova exigir `/_status`, `/_cancel`, traces ou milestones canonicos, registrar em `Surprises & Discoveries` e mover o remanescente para o ticket irmao em vez de ampliar este escopo silenciosamente.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`
- Spec e contratos consultados:
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `docs/checkups/checkup-nao-funcional.md`
- ExecPlans irmaos consultados para alinhamento de arquitetura e formato:
  - `execplans/2026-03-24-target-prepare-controlled-onboarding-gap.md`
  - `execplans/2026-03-24-target-checkup-readiness-audit-gap.md`
- Ticket irmao usado para delimitar fronteira de escopo:
  - `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
- Artefatos planejados para o runner:
  - `src/types/target-derive.ts`
  - `src/core/target-derive.ts`
  - `src/core/target-derive.test.ts`
  - `src/types/target-checkup.ts`
  - `src/core/target-checkup.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/target-derive-gap-analysis-parser.ts`
  - `src/integrations/target-derive-gap-analysis-parser.test.ts`
  - helper(s) de busca/renderizacao de tickets readiness e possivel guard Git dedicado
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `README.md`
  - `prompts/15-target-derive-gaps-idempotent-readiness-materialization.md`
- Artefatos planejados para o repo alvo:
  - tickets derivados em `tickets/open/`
  - write-back em `docs/checkups/history/<timestamp>-project-readiness-checkup.json`
  - write-back em `docs/checkups/history/<timestamp>-project-readiness-checkup.md`
- Checklist de qualidade aplicado neste planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita de spec de origem, RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - explicacao do que fica fora de escopo e dos riscos residuais antes da execucao;
  - validacoes de aceite derivadas do closure criterion do ticket, e nao de checklist generico.

## Interfaces and Dependencies
- Interfaces alteradas ou adicionadas:
  - entrada publica do bot: `/target_derive_gaps <project-name> <report-path>`;
  - novo executor e result types de `target_derive_gaps` no runner;
  - request/result dedicados no `CodexCliTicketFlowClient` para analise estruturada de gaps readiness;
  - parser estrito de gap analysis;
  - extensao do `TargetCheckupReport` para persistir o bloco de resultados de derivacao;
  - contrato editorial dos tickets derivados do checkup, baseado em `tickets/templates/internal-ticket-template.md`.
- Compatibilidade:
  - o projeto ativo global nao pode ser trocado automaticamente por `target_derive_gaps`;
  - `target_derive_gaps` depende de report canonico gerado por `target_checkup` e deve reutilizar `evaluateTargetCheckupDerivationReadiness` em vez de reinventar a regra de SHA/idade/drift;
  - `Priority` continua seguindo a matriz objetiva existente, preservando a fila sequencial `P0 -> P1 -> P2` ja consumida por `ticket-queue`;
  - `RunnerSlotKind`, `RunnerFlowSummary`, traces locais canonicos, `/_status` e `/_cancel` continuam dependentes do ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`.
- Dependencias externas e operacionais:
  - autenticacao valida do Codex CLI para o novo prompt de gap analysis;
  - Git do host com permissao real de `push` no repo alvo para os smokes manuais;
  - `PROJECTS_ROOT_PATH` apontando para a pasta-pai que contem `codex-flow-runner` e os repositorios irmaos preparados;
  - runtime Node do host via `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` em todos os comandos `npm`;
  - templates/docs do repo alvo no padrao esperado pelo workflow (`tickets/open/`, `tickets/closed/`, `execplans/`, `PLANS.md`, `INTERNAL_TICKETS.md`) para que os tickets derivados nascam compativeis com o restante da automacao.
