# ExecPlan - Ticket transversal de melhoria de workflow no /run_specs

## Purpose / Big Picture
- Objetivo: materializar automaticamente um ticket transversal de melhoria de workflow quando `spec-ticket-validation` identificar causa-raiz `systemic-instruction` com confianca alta, usando o repositorio atual quando o projeto ativo for `codex-flow-runner` e `../codex-flow-runner` quando o projeto ativo for externo, com commit/push quando possivel e observabilidade completa no projeto corrente.
- Resultado esperado:
  - o runner passa a identificar follow-up sistemico elegivel a partir do resultado completo de `spec-ticket-validation`, sem depender de leitura manual da spec;
  - quando o projeto ativo for `codex-flow-runner`, o fluxo cria o ticket em `tickets/open/` do proprio repositorio, executa commit/push do artefato e registra a evidencia no trace/log e no resumo final;
  - quando o projeto ativo for externo e `../codex-flow-runner` estiver acessivel, o fluxo cria o ticket naquele repositorio, executa commit/push la e propaga o resultado observavel de volta ao projeto corrente;
  - quando o repositorio irmao nao existir, estiver inacessivel, ou a publicacao falhar, o fluxo registra uma limitacao operacional nao bloqueante e continua a rodada da spec corrente quando o gate principal estiver em `GO`.
- Escopo:
  - extrair do resultado de `spec-ticket-validation` os gaps sistemicos elegiveis para follow-up;
  - resolver o repositorio alvo (`repo atual` vs `../codex-flow-runner`) e validar a estrutura minima antes de escrever;
  - renderizar/materializar ticket seguindo o contrato de `INTERNAL_TICKETS.md` e `tickets/templates/internal-ticket-template.md`;
  - ampliar o contrato de git para publicar somente os caminhos do follow-up, sem depender de `add -A`;
  - refletir o resultado da publicacao em `RunSpecsTicketValidationSummary`, na secao persistida da spec, no trace/log e no resumo final do Telegram;
  - adicionar testes automatizados cobrindo os tres closure criteria do ticket.
- Fora de escopo:
  - alterar a taxonomia, o prompt ou o parser de `spec-ticket-validation`;
  - criar heuristica generica de agrupamento de backlog sistemico entre specs nao relacionadas;
  - mudar o contrato canonico `spec -> tickets` ja consolidado nos tickets irmaos;
  - exigir rodada manual real de `/run_specs` em projeto externo como criterio para fechar este ticket;
  - fechar ticket, mover para `tickets/closed/`, commitar ou fazer push nesta etapa de planejamento.

## Progress
- [x] 2026-03-19 17:33Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, `DOCUMENTATION.md`, `docs/workflows/codex-quality-gates.md` e das referencias obrigatorias em `src/`.
- [x] 2026-03-19 18:01Z - Contrato do follow-up sistemico, resolucao de repositorio alvo e publicador de ticket implementados.
- [x] 2026-03-19 18:01Z - Runner, spec persistida, traces e resumo do Telegram atualizados com o resultado da publicacao.
- [x] 2026-03-19 18:01Z - Matriz de validacao dos closure criteria executada com sucesso.

## Surprises & Discoveries
- 2026-03-19 17:33Z - `src/core/runner.ts` ja identifica gaps com `probableRootCause = systemic-instruction`, mas hoje apenas grava a frase de que a abertura automatica do ticket transversal "permanece fora do escopo", entao parte da observabilidade ja existe e precisa ser substituida, nao criada do zero.
- 2026-03-19 17:33Z - `RunSpecsTicketValidationSummary` guarda apenas os gaps/correcoes finais; um gap sistemico pode desaparecer apos autocorrecao e ainda assim exigir follow-up, entao a elegibilidade nao pode depender apenas do snapshot final.
- 2026-03-19 17:33Z - `GitCliVersioning` so sabe fazer `commitTicketClosure(...)` com `git add -A`, o que nao serve para publicar um ticket transversal sem arriscar capturar alteracoes nao relacionadas do repositorio alvo.
- 2026-03-19 17:33Z - O bootstrap resolve `queue`, `codexClient` e `gitVersioning` somente para o projeto ativo; qualquer suporte cross-repo precisa ser um fluxo separado e nao pode reutilizar `RunnerRoundDependencies` como se o repositorio irmao fosse o projeto ativo da rodada.
- 2026-03-19 18:01Z - A evidencia de commit/push do follow-up nao pode depender de working tree limpo no repositorio alvo, porque o publish por caminhos explicitos precisa coexistir com alteracoes locais nao relacionadas; por isso a nova operacao de git nao reutiliza `assertSyncedWithRemote()` diretamente.
- 2026-03-19 18:01Z - O ponto de injecao mais estavel para o publicador cross-repo foi `TicketRunnerOptions`, nao `RunnerRoundDependencies`; isso preservou compatibilidade das demais rodadas/testes e manteve o repositorio irmao fora do contrato de dependencia do projeto ativo.
- 2026-03-19 18:01Z - Foi necessario um teste dedicado de `NO_GO` auto-corrigivel -> `GO` para provar que o follow-up nasce de `snapshots` historicos e nao apenas do snapshot final persistido na spec.

## Decision Log
- 2026-03-19 - Decisao: considerar elegivel para follow-up o conjunto de gaps com `probableRootCause = systemic-instruction` observado em qualquer snapshot da rodada de validacao, desde que a confianca final da validacao seja `high`.
  - Motivo: um gap sistemico pode ser corrigido no backlog derivado e desaparecer do snapshot final, mas o aprendizado sistemico continua valido para o workflow.
  - Impacto: o runner precisa extrair candidatos a follow-up a partir de `SpecTicketValidationResult.snapshots`, e nao apenas de `RunSpecsTicketValidationSummary`.
- 2026-03-19 - Decisao: introduzir um publicador dedicado e tipado para o ticket transversal, retornando sucesso, reuso idempotente ou limitacao operacional, em vez de espalhar strings de log ad hoc.
  - Motivo: o resultado precisa ser consumido por trace, spec persistida, resumo final do Telegram e testes automatizados.
  - Impacto: sera necessario um novo contrato de tipos e uma nova superficie de integracao para publicar ticket em repositorio atual ou irmao.
- 2026-03-19 - Decisao: ampliar `GitCliVersioning` com uma operacao de commit/push por caminhos explicitos, sem `git add -A`, e reutiliza-la tanto no repositorio atual quanto no irmao.
  - Motivo: os closure criteria exigem commit/push observavel do ticket transversal, e esse caminho precisa ser possivel de testar por codigo, sem depender do stage Codex de `spec-close-and-version`.
  - Impacto: `src/integrations/git-client.ts` e seus testes precisarao de extensao aditiva, preservando `commitTicketClosure(...)`.
- 2026-03-19 - Decisao: deduplicar de forma conservadora apenas dentro da mesma spec de origem no repositorio alvo, reaproveitando ticket aberto quando houver `Source spec` igual e sobreposicao de gap fingerprints sistemicos.
  - Motivo: evitar duplicacao por rerun da mesma spec sem assumir heuristica global entre specs independentes.
  - Impacto: o publicador precisa ler `tickets/open/` do repositorio alvo antes de criar um novo arquivo.
- 2026-03-19 - Decisao: nesta entrega, publicar follow-up sistemico apenas quando o veredito final do gate for `GO`, mantendo eventual publicacao em `NO_GO` explicitamente fora de escopo.
  - Motivo: alinhar a implementacao ao recorte do ticket/ExecPlan e evitar expandir a semantica do produto sem cobertura especifica.
  - Impacto: rodadas `NO_GO` continuam registrando observacao sistemica na spec, mas nao disparam publicacao cross-repo nesta versao.
- 2026-03-19 - Decisao: usar `TicketRunnerOptions.workflowImprovementTicketPublisher` para plugar o publicador real no bootstrap e os dublês nos testes.
  - Motivo: o fluxo de follow-up depende do projeto ativo, mas nao precisa contaminar o contrato de `RunnerRoundDependencies`.
  - Impacto: `src/main.ts` injeta o publicador real e os testes do runner controlam o comportamento cross-repo sem alterar bootstrap/round deps de outras suites.

## Outcomes & Retrospective
- Status final: implementacao concluida, validada localmente e fechada como `GO`; o versionamento do changeset permanece para o runner.
- O que passou a existir:
  - um contrato tipado para o resultado da publicacao do ticket transversal em `src/types/workflow-improvement-ticket.ts`;
  - um publicador dedicado com resolucao `repo atual` vs `../codex-flow-runner`, dedupe conservador e escrita atomica;
  - commit/push por caminhos explicitos em `src/integrations/git-client.ts`, sem `git add -A` no novo fluxo;
  - `run_specs` refletindo `created-and-pushed`, `reused-open-ticket`, `not-needed` ou `operational-limitation` na spec persistida, no trace e no resumo final do Telegram;
  - testes automatizados cobrindo os cenarios `repo atual`, `repo irmao acessivel`, `repo irmao indisponivel` e o caso em que o gap sistemico some do snapshot final apos revalidacao.
- O que fica pendente fora deste plano:
  - rodada manual real em projeto externo para auditoria operacional do Telegram;
  - qualquer heuristica futura de consolidacao de tickets sistemicos entre specs distintas;
  - eventual publicacao do ticket transversal tambem em rodadas `NO_GO`, caso isso seja exigido depois como comportamento explicito do produto.
- Proximos passos:
  - executar, quando oportuno, as rodadas manuais externas listadas na spec para auditar Telegram e ambiente cross-repo real;
  - versionar o changeset correspondente pelo runner.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/closed/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `src/main.ts`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/types/spec-ticket-validation.ts`
  - `src/types/flow-timing.ts`
  - `src/types/state.ts`
  - `src/integrations/git-client.ts`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/spec-discovery.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
- Spec de origem: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-18, RF-19, RF-20, RF-21, RF-22, RF-23
  - CA-13, CA-14, CA-15
- Assumptions / defaults adotados:
  - a elegibilidade do ticket transversal nesta primeira versao sera: confianca final `high` na rodada de validacao + pelo menos um gap com `probableRootCause = systemic-instruction` visto em qualquer snapshot do gate;
  - o ticket gerado deve seguir a estrutura canonica de ticket interno, preenchendo `Source spec`, `Source requirements`, `Inherited assumptions/defaults` relevantes da spec, `Workflow root cause: systemic-instruction` e closure criteria observaveis;
  - quando nao houver gap sistemico elegivel, o resultado explicitado no resumo sera `not-needed`, sem IO adicional;
  - reruns da mesma spec nao devem criar ticket duplicado no mesmo repositorio alvo quando ja existir follow-up aberto da mesma linhagem;
  - limitacoes de materializacao, commit ou push do follow-up sao nao bloqueantes para um veredito principal `GO`; o resultado deve ser registrado e a rodada principal continua;
  - o repositorio externo permitido para este ticket e somente `../codex-flow-runner`; nao havera descoberta global alternativa nesta entrega.
- Fluxo atual relevante (as-is):
  - `src/main.ts` injeta `FileSystemTicketQueue`, `CodexCliTicketFlowClient` e `GitCliVersioning` a partir de um unico `activeProjectPath`;
  - `src/core/runner.ts` executa `spec-ticket-validation`, persiste a secao `Gate de validacao dos tickets derivados` e ja coleta traces/resumos, mas ainda nao cria follow-up sistemico;
  - `src/integrations/telegram-bot.ts` mostra veredito, gaps e correcoes do gate, sem qualquer bloco para o resultado do ticket transversal;
  - `src/integrations/git-client.ts` so publica fechamento de ticket comum com `git add -A`, o que nao e seguro para o novo caso cross-repo.
- Restricoes tecnicas:
  - fluxo continua estritamente sequencial;
  - nenhuma nova dependencia externa;
  - a evidencia do follow-up precisa aparecer no projeto corrente mesmo quando o ticket for criado em `../codex-flow-runner`;
  - a validacao deste plano deve derivar dos closure criteria do ticket, nao do checklist generico.
- Termos usados neste plano:
  - `follow-up sistemico`: ticket transversal de melhoria de workflow aberto para reaproveitamento futuro no backlog de `codex-flow-runner`.
  - `repositorio alvo`: repositorio onde o ticket transversal sera materializado (`repo atual` ou `../codex-flow-runner`).
  - `resultado de publicacao`: status estruturado do follow-up (`not-needed`, `created-and-pushed`, `reused-open-ticket`, `operational-limitation`).

## Plan of Work
- Milestone 1 - Elegibilidade sistemica e resolucao do repositorio alvo
  - Entregavel: helper(s) que extraem do `SpecTicketValidationResult` os gaps sistemicos elegiveis, resolvem `repo atual` vs `../codex-flow-runner` e montam um payload de follow-up com requisitos, evidencias e fingerprints para dedupe.
  - Evidencia de conclusao: testes provam que o candidato nasce de snapshots do gate, nao so do resumo final, e que o caminho alvo muda corretamente conforme `activeProject.name`.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - possivelmente `src/types/workflow-improvement-ticket.ts`
    - possivelmente `src/integrations/workflow-improvement-ticket-publisher.ts`
- Milestone 2 - Publicacao do ticket transversal com commit/push observavel
  - Entregavel: integracao que cria o ticket no repositorio alvo, faz dedupe conservador em `tickets/open/`, publica apenas os caminhos do follow-up via git e devolve resultado tipado com evidencia de commit/push ou limitacao operacional.
  - Evidencia de conclusao: testes unitarios cobrem `created-and-pushed`, reuso idempotente e limitacoes por repositorio inacessivel ou falha de git, sem usar `git add -A`.
  - Arquivos esperados:
    - `src/integrations/git-client.ts`
    - `src/integrations/git-client.test.ts`
    - novo arquivo de integracao para o publicador e seus testes
- Milestone 3 - Runner, spec e Telegram passam a refletir o follow-up
  - Entregavel: `RunSpecsTicketValidationSummary` e a secao persistida da spec passam a incluir o resultado do ticket transversal; o trace/log e o resumo final do Telegram exibem ticket criado/publicado ou limitacao nao bloqueante.
  - Evidencia de conclusao: testes de runner e Telegram mostram o novo bloco observavel para os cenarios `repo atual`, `repo irmao acessivel` e `repo irmao indisponivel`.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 4 - Regressao e auditoria final do escopo
  - Entregavel: suites focadas para CA-13/14/15, seguidas de regressao geral do repositorio.
  - Evidencia de conclusao: testes focados, `npm test`, `npm run check` e `npm run build` verdes; diff final limitado as superficies deste ticket.
  - Arquivos esperados:
    - apenas testes/ajustes finais nas superficies acima

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "systemic-instruction|RunSpecsTicketValidationSummary|commitTicketClosure|spec-ticket-validation|appendRunSpecsTicketValidationLines" src/core/runner.ts src/integrations/git-client.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts` para fixar os pontos exatos de alteracao antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar, se necessario, `src/types/workflow-improvement-ticket.ts` com:
   - enums/status de publicacao (`not-needed`, `created-and-pushed`, `reused-open-ticket`, `operational-limitation`);
   - payload do candidato sistemico (spec de origem, gap fingerprints, RFs/CAs, evidencias);
   - shape do resultado observavel (repositorio alvo, ticket path, commit/push evidence, motivo de limitacao).
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/integrations/workflow-improvement-ticket-publisher.ts` e um teste dedicado cobrindo:
   - resolucao do repositorio alvo no repo atual e no repo irmao;
   - validacao minima de `.git` + `tickets/open/`;
   - dedupe conservador por `Source spec` + overlap de fingerprints;
   - escrita atomica do ticket em `tickets/open/`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/git-client.ts` e `src/integrations/git-client.test.ts` para adicionar uma operacao aditiva de commit/push por caminhos explicitos, preservando `commitTicketClosure(...)` e proibindo `git add -A` no novo fluxo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/flow-timing.ts` para anexar o resultado do ticket transversal a `RunSpecsTicketValidationSummary`, mantendo compatibilidade com o resto do resumo de `/run_specs`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para:
   - extrair os candidatos sistemicos a partir de `SpecTicketValidationResult.snapshots`;
   - acionar o publicador de forma nao bloqueante apos o gate;
   - registrar resultado tipado no resumo do gate, na secao persistida da spec, no metadata de trace e nos logs;
   - continuar a rodada normalmente quando o veredito principal for `GO` e a publicacao retornar `operational-limitation`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts` para renderizar um bloco enxuto do follow-up sistemico no resumo final de `/run_specs`, exibindo ticket criado/publicado ou limitacao nao bloqueante.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts` para cobrir, no minimo:
   - projeto ativo = `codex-flow-runner`, gap sistemico elegivel, ticket criado no repo atual com evidencia de commit/push e reflexo no resumo;
   - projeto ativo externo com `../codex-flow-runner` acessivel, ticket criado no repo irmao e resultado registrado no projeto corrente;
   - projeto ativo externo sem `../codex-flow-runner`, limitacao nao bloqueante e fluxo `/run_specs` seguindo para `spec-close-and-version`, `/run-all` e `spec-audit` quando o gate principal estiver em `GO`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar os tres cenarios de aceite e o contrato de publicacao.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` como regressao complementar apos os testes focados.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem e contratos expandidos.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir compilacao limpa do fluxo final.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/git-client.ts src/integrations/git-client.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/types/flow-timing.ts src/types/state.ts src/types/workflow-improvement-ticket.ts src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts` para auditoria final do escopo realmente tocado.

## Validation and Acceptance
- Nota de metodo: a matriz abaixo cobre integralmente os closure criteria do ticket. Os comandos de regressao geral em `Concrete Steps` sao protecao complementar, nao substituto do aceite.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-18, RF-19, RF-22; CA-13
    - Evidencia observavel: quando o projeto ativo for `codex-flow-runner` e o gate produzir gap sistemico elegivel, o runner cria ticket em `tickets/open/` do proprio repositorio, registra `created-and-pushed` com evidencia de commit/push e propaga o resultado para trace/log e resumo final de `/run_specs`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes mostrando ticket criado no repo atual, metadata com `targetRepoPath`/`ticketPath`/`commitPushId` e mensagem final do Telegram contendo o follow-up publicado.
  - Requisito: RF-20, RF-22; CA-14
    - Evidencia observavel: quando o projeto ativo for externo e `../codex-flow-runner` estiver acessivel, o fluxo resolve esse repositorio, materializa ali o ticket transversal, executa commit/push e registra no projeto corrente o caminho do ticket e a evidencia de publicacao.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes comprovando criacao no repositorio irmao, commit/push observavel e resumo final do projeto corrente apontando para `../codex-flow-runner`.
  - Requisito: RF-21, RF-23; CA-15
    - Evidencia observavel: quando `../codex-flow-runner` nao existir ou nao estiver acessivel, o follow-up retorna `operational-limitation`, o trace/log e o resumo final registram a limitacao, e a rodada principal continua quando o veredito do gate permanecer `GO`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: testes verdes comprovando limitacao nao bloqueante, `run_specs` concluindo o caminho `spec-close-and-version -> /run-all -> spec-audit` no caso `GO`, e mensagem final exibindo a limitacao operacional em vez de sucesso de publicacao.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a mesma spec com o mesmo conjunto de fingerprints sistemicos nao deve criar novo ticket no repositorio alvo quando ja existir follow-up aberto da mesma linhagem;
  - quando nao houver gap sistemico elegivel, o publicador nao deve tocar filesystem nem git;
  - rerodar o cenario `repo irmao indisponivel` deve gerar a mesma limitacao observavel sem efeitos colaterais fora do projeto corrente.
- Riscos:
  - usar apenas os gaps finais e perder follow-up sistemico que foi autocorrigido no backlog derivado;
  - dedupe conservador demais e abrir ticket duplicado em reruns da mesma spec;
  - dedupe amplo demais e reciclar ticket de outra spec que so parece semelhante;
  - commit bem-sucedido com push falho no repositorio alvo deixar a branch local adiantada.
- Recovery / Rollback:
  - validar `.git`, `tickets/open/` e permissao de escrita antes de criar o ticket; se a estrutura minima falhar, retornar `operational-limitation` sem modificar disco;
  - escrever o ticket via arquivo temporario + `rename` atomico; se a escrita falhar, remover o temporario e nao prosseguir para git;
  - fazer `git add -- <caminhos>` apenas dos artefatos do follow-up; nunca usar `git add -A` nesse fluxo;
  - se o commit ocorrer e o push falhar, nao tentar rollback automatico do commit; registrar a limitacao `push-failed`, manter o ticket materializado como evidencia local e fazer o rerun detectar/reutilizar esse follow-up em vez de duplicar o backlog.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`
- Spec de origem:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Checklist aplicado no planejamento:
  - leitura integral do ticket e de todas as referencias obrigatorias;
  - declaracao explicita da spec de origem e do subconjunto de RFs/CAs;
  - registro de assumptions/defaults para eliminar ambiguidade do caso cross-repo;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - mapeamento de riscos residuais, nao-escopo e estrategia de recovery.
- Referencias tecnicas consumidas:
  - `src/main.ts`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/types/spec-ticket-validation.ts`
  - `src/types/flow-timing.ts`
  - `src/types/state.ts`
  - `src/integrations/git-client.ts`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/spec-discovery.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/git-client.test.ts`
- Artefatos esperados ao final da execucao:
  - contrato tipado do resultado do follow-up sistemico;
  - ticket transversal criado no repo correto ou limitacao operacional registrada;
  - metadata atualizada no trace da etapa `spec-ticket-validation`;
  - secao `Gate de validacao dos tickets derivados` da spec refletindo o resultado do follow-up;
  - resumo final do Telegram com o bloco do ticket transversal.
- Validacoes executadas nesta etapa:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` -> verde
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` -> verde
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> verde
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` -> verde
- Validacoes manuais deliberadamente fora do aceite deste ticket:
  - rodada real de `/run_specs` em projeto externo com `../codex-flow-runner` acessivel;
  - rodada real de `/run_specs` em projeto externo sem `../codex-flow-runner`;
  - essas verificacoes continuam uteis para auditoria final da spec, mas nao sao closure criteria deste ticket.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - novo contrato tipado para o follow-up sistemico em `src/types/workflow-improvement-ticket.ts` (ou arquivo equivalente);
  - `RunSpecsTicketValidationSummary` em `src/types/flow-timing.ts`;
  - `GitVersioning` em `src/integrations/git-client.ts`, com metodo aditivo para publicar caminhos especificos;
  - novo publicador de ticket transversal em `src/integrations/`;
  - `appendRunSpecsTicketValidationLines(...)` em `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - o fluxo continua sequencial;
  - `spec-ticket-validation` continua sendo o stage que decide o veredito do pacote derivado; este ticket apenas adiciona o follow-up sistemico e sua observabilidade;
  - falhas do follow-up permanecem nao bloqueantes para o caminho principal `GO`, conforme RF-23.
- Dependencias externas e mocks:
  - filesystem do repositorio atual e, opcionalmente, de `../codex-flow-runner`;
  - git CLI com upstream configurado apenas para os cenarios reais de sucesso; nos testes, o wrapper de git deve ser mockado;
  - `StubCodexClient` e novas fixtures de projeto/repositorio em `src/core/runner.test.ts` para simular `repo atual`, `repo irmao acessivel` e `repo irmao ausente`.
