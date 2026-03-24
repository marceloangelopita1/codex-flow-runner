# ExecPlan - Target checkup readiness audit gap

## Purpose / Big Picture
- Objetivo: introduzir o fluxo `/target_checkup [<project-name>]` para auditar readiness de um projeto alvo preparado, com gate Git deterministico, coleta objetiva de evidencias por dimensao, sintese por IA limitada a fatos coletados, artefatos canonicos `md + json` em `docs/checkups/history/` e versionamento rastreavel mesmo quando o veredito geral for invalido para derivacao.
- Resultado esperado:
  - o runner passa a aceitar `/target_checkup` no projeto ativo e `/target_checkup <project-name>` em alvo explicito, sem trocar o projeto ativo global;
  - o fluxo bloqueia cedo working tree sujo, `HEAD` irresolvivel e branch nao registravel antes de qualquer publicacao canonica;
  - a rodada gera `docs/checkups/history/<timestamp>-project-readiness-checkup.json` e `.md` com `analyzed_head_sha`, `branch`, `working_tree_clean_at_start=true`, `started_at_utc`, `finished_at_utc`, vereditos por dimensao, veredito geral e metadados suficientes para validar SHA/idade/drift no ticket irmao de `target_derive_gaps`;
  - rounds operacionalmente concluidos publicam o par canonico mesmo quando o veredito for `invalid_for_gap_ticket_derivation`, enquanto falhas internas distinguem claramente "nao publicado" de "publicado invalido".
- Escopo:
  - resolvedor de alvo para o caminho sem argumento (projeto ativo) e com argumento explicito (diretorio irmao), preservando o estado global;
  - executor core de `target_checkup` com preflight Git, validacao da integridade do `target_prepare`, coleta deterministica, sintese editorial controlada e write-back canonico no repo alvo;
  - schema forte do relatorio JSON, renderizacao do Markdown humano e regras de validade por SHA/idade/drift;
  - wiring minimo em `runner`, `main`, `telegram-bot` e `README.md` para expor `/target_checkup [<project-name>]`;
  - cobertura automatizada dos closure criteria e smokes manuais herdados do ticket/spec.
- Fora de escopo:
  - `/target_prepare` e `/target_derive_gaps`;
  - `/_status`, `/_cancel`, slot kinds canonicos, milestones, flow summaries e traces locais de fluxos target, que pertencem ao ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`;
  - analise ampla de arquitetura/manutenibilidade do produto alem das dimensoes obrigatorias do v1;
  - heuristicas frouxas para "adivinhar" comandos do projeto a partir de texto livre arbitrario;
  - abertura automatica de tickets readiness ou publicacao de limitacoes do runner, que pertencem ao ticket `tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`.

## Progress
- [x] 2026-03-24 21:44Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, das referencias documentais do ticket, do ticket irmao de controle operacional e das superficies de codigo citadas no diagnostico.
- [x] 2026-03-24 22:19Z - Contrato de tipos, preflight Git, schema canonico do checkup e helper de validade por SHA/idade/drift implementados em `src/types/target-checkup.ts`, `src/core/target-checkup.ts` e `src/integrations/target-checkup-git-guard.ts`.
- [x] 2026-03-24 22:19Z - Executor de `target_checkup`, coleta deterministica, sintese editorial via Codex e fronteira de versionamento em duas fases implementados, incluindo publicacao invalida-ainda-versionada e falha sem publicacao quando um comando muta o repo.
- [x] 2026-03-24 22:19Z - Wiring em `runner`/`main`/`telegram-bot`/`README.md` concluido com superficie publica `/target_checkup [<project-name>]` e replies observaveis.
- [x] 2026-03-24 22:19Z - Validacao automatizada concluida com `npm test -- src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts` e `npm run check`; smokes manuais herdados seguem pendentes.

## Surprises & Discoveries
- 2026-03-24 21:44Z - `target_prepare` ja estabeleceu uma linha reutilizavel com resolvedor explicito de projeto alvo, Git guard de working tree limpo, helper generico de commit/push e prompt dedicado de Codex; o checkup pode aproveitar esse padrao sem reabrir a arquitetura inteira do runner.
- 2026-03-24 21:44Z - `src/types/state.ts`, `src/types/flow-timing.ts` e `src/integrations/workflow-trace-store.ts` continuam sem modelagem para fluxos target; isso confirma que `/_status`, `/_cancel`, milestones e traces canonicos precisam continuar fora deste plano e no ticket irmao de controle operacional.
- 2026-03-24 21:44Z - `README.md` e o help do Telegram ja publicam `/target_prepare`; para `target_checkup`, existe uma superficie publica pendente que precisa ser atualizada no mesmo ciclo para nao deixar o comando escondido atras da implementacao.
- 2026-03-24 21:44Z - O requisito de `report_commit_sha` "dentro do proprio artefato versionado" e potencialmente auto-referencial se interpretado como o mesmo commit que publica o arquivo; a execucao precisa adotar uma convencao explicita e nao circular antes do fechamento.
- 2026-03-24 22:19Z - A circularidade de `report_commit_sha` nao e apenas um risco teórico: o hash do commit final nunca pode ser gravado dentro do proprio arquivo sem nova regravacao; por isso a implementacao precisou publicar o relatorio em duas fases e validar a cadeia `HEAD atual -> parent == report_commit_sha`.
- 2026-03-24 22:19Z - A descoberta conservadora de comandos ficou mais robusta do que o plano inicial sem abrir heuristica frouxa: o v1 agora aceita `package.json`, `Makefile` e `justfile` como superficies explicitas, mantendo allowlist fechada de nomes de comando.

## Decision Log
- 2026-03-24 - Decisao: criar um dominio dedicado de `target_checkup` (tipos, executor e prompt) reaproveitando `FileSystemTargetProjectResolver`, `GitCliVersioning` e o padrao de injecao ja usado por `target_prepare`.
  - Motivo: o contrato de readiness audit difere materialmente do `prepare` em schema, regras de validade, write-back historico e fronteira "publicado invalido" vs "nao publicado".
  - Impacto: o fluxo novo fica isolado, testavel e preparado para ser consumido pelo ticket irmao de `target_derive_gaps` sem contaminar os tipos do `prepare`.
- 2026-03-24 - Decisao: computar preflight, vereditos por dimensao, veredito geral e elegibilidade para derivacao deterministicamente em codigo; Codex fica restrito a sintese editorial, agrupamento de sintomas e redacao do relatorio humano a partir do payload factual serializado.
  - Motivo: RF-15 proibe IA de inventar fatos ou prontidao; o gate funcional precisa ser observavel mesmo que a sintese editorial mude.
  - Impacto: o JSON vira a fonte canonica para aceite e para o futuro `target_derive_gaps`, enquanto o Markdown permanece como visao humana derivada do mesmo estado.
- 2026-03-24 - Decisao: seguir a mesma fronteira operacional minima do `target_prepare` neste ticket, com guarda dedicada de in-flight e sem ampliar `RunnerSlotKind`, `RunnerFlowSummary` ou traces canonicos.
  - Motivo: a spec ja particionou status/cancel/traces/milestones em um ticket proprio; misturar isso aqui aumentaria risco de deriva e sobreposicao.
  - Impacto: este plano foca a capacidade funcional de checkup; o risco residual fica explicitamente delegado ao ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`.
- 2026-03-24 - Decisao: no v1, executar somente comandos nao interativos descobertos em superficies explicitas e legiveis por maquina, priorizando `package.json`/scripts e artefatos canonicos de preparo; ausencia de declaracao explicita vira evidencia (`gap` ou `blocked`), nunca convite para heuristica frouxa.
  - Motivo: RF-14 exige descoberta objetiva e execucao segura; interpretar texto livre arbitrario como comando suportado violaria esse contrato.
  - Impacto: o fluxo fica mais conservador em repositorios sem metadado explicito de validacao, mas preserva determinismo e reduz risco de mutacao acidental.
- 2026-03-24 - Decisao: tratar branch simbolica ausente ou `HEAD` destacado como snapshot nao elegivel para publicacao canonica no v1.
  - Motivo: RF-11/RF-12 exigem `HEAD` resolvido e branch registrada; em detached HEAD a trilha de versionamento fica ambigua para um relatorio que sera consumido por derivacao posterior.
  - Impacto: o gate inicial fica mais estrito, com comportamento observavel e coberto por teste.
- 2026-03-24 - Decisao: publicar o checkup em duas fases locais (`publish` + `metadata fixup`) e registrar no artefato a convencao `initial-publication-commit-recorded-by-follow-up-metadata-commit`.
  - Motivo: gravar no proprio arquivo o hash do commit final e impossivel sem circularidade; a unica saida auditavel e referenciar o commit inicial de publicacao e exigir que o commit final do arquivo tenha esse SHA como pai imediato.
  - Impacto: `report_commit_sha` passa a ser observavel sem publicar artefato remoto incompleto, e o helper de validade futura consegue checar a cadeia do relatorio por `HEAD`, ultimo commit do arquivo e parent.
- 2026-03-24 - Decisao: expandir a descoberta explicita do v1 para `package.json`, `Makefile` e `justfile`, sempre sob allowlist fechada de nomes (`check`, `typecheck`, `lint`, `test`, `build`, `validate`).
  - Motivo: isso aumenta cobertura de repositorios preparados sem cair em heuristica frouxa baseada em texto livre.
  - Impacto: a dimensao `operabilidade local` fica menos enviesada para Node puro, mas ainda conserva determinismo e bloqueia superficies nao suportadas de forma objetiva.

## Outcomes & Retrospective
- Status final: execucao concluida no codigo e na cobertura automatizada; smokes manuais externos herdados seguem pendentes.
- O que precisa existir ao final:
  - entrada publica `/target_checkup [<project-name>]` no bot, no runner e na documentacao minima;
  - executor de readiness audit com coleta deterministica nas dimensoes `integridade do preparo`, `operabilidade local`, `saude de validacao/entrega` e `governanca documental`, com `observabilidade` opcional e nao bloqueante;
  - artefatos canonicos `md + json` em `docs/checkups/history/` do repo alvo, contendo os campos minimos do ticket e o contrato de validade por SHA/idade/drift;
  - fronteira de versionamento que publique rodadas operacionalmente concluidas, inclusive invalidas para derivacao, e que diferencie falha interna sem publicacao;
  - testes automatizados e smokes manuais que comprovem cada closure criterion relevante.
- O que fica pendente fora deste plano:
  - `/_status`, `/_cancel`, milestones, traces e flow summaries canonicos dos fluxos target;
  - materializacao de tickets readiness e write-back de derivacao em cima do relatorio de checkup;
  - qualquer expansao do checkup para analise ampla de arquitetura/manutenibilidade do produto.
- Proximos passos:
  - executar os smokes manuais herdados via Telegram em repositorio preparado real, incluindo um caso `invalid_for_gap_ticket_derivation` publicado;
  - confirmar permissao real de `git push` nos repositorios alvo de teste usados pelo fluxo;
  - deixar o consumo de `report_commit_sha`/validator pronto para o ticket irmao de `target_derive_gaps`.

## Context and Orientation
- Ticket de origem:
  - `tickets/closed/2026-03-24-target-checkup-readiness-audit-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- RFs/CAs cobertos por este plano:
  - RF-01 apenas na superficie `/target_checkup [<project-name>]`;
  - RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18;
  - CA-04, CA-05, CA-06.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - sem argumento, `target_checkup` opera sobre o snapshot atual do projeto ativo; com argumento, resolve o diretorio irmao explicitamente e nao muda o projeto ativo global;
  - a validade do relatorio e medida a partir de `finished_at_utc` e expira em 30 dias corridos, mesmo sem commit novo, conforme a spec;
  - `observabilidade` existe como dimensao opcional, mas no v1 pode sair como `n/a` sem bloquear o veredito geral;
  - somente comandos nao interativos declarados em superficies explicitas e legiveis por maquina entram na execucao segura; ausencia de comando suportado vira evidencia objetiva, nao fallback heuristico;
  - veredito geral e elegibilidade para derivacao dependem de execucao completa, preflight limpo, integridade do preparo aprovada, `analyzed_head_sha` presente, ausencia de drift e idade maxima de 30 dias;
  - branch simbolica ausente ou detached HEAD bloqueiam a publicacao canonica no v1.
- RNFs e restricoes herdados que precisam ficar observaveis neste ticket:
  - manter fluxo sequencial e sem paralelizacao de tickets;
  - preservar o projeto alvo como fonte canonica dos artefatos versionados de readiness;
  - coletar fatos de forma deterministica e barata antes da sintese por IA;
  - distinguir operacionalmente "rodada publicada invalida" de "falha interna sem publicacao";
  - nao transformar o checkup v1 em analise ampla de arquitetura/manutenibilidade do produto.
- Restricoes tecnicas/documentais herdadas:
  - working tree inicial precisa estar limpo;
  - o artefato canonico so e valido com `git status --porcelain` vazio, `HEAD` resolvido e branch registrada;
  - `docs/checkups/history/` no repo alvo e a superficie canonica dos relatorios;
  - a derivacao futura precisa consumir o mesmo schema para validar SHA, idade e drift.
- Validacoes pendentes/manuais herdadas:
  - validar `target_checkup` em projeto preparado cujo veredito final seja `invalid_for_gap_ticket_derivation`, confirmando versionamento do relatorio mesmo assim;
  - confirmar permissao real de `git push` nos repositorios alvo de teste usados por este fluxo.
- Fluxo atual e arquivos principais a reabrir durante a execucao:
  - `src/core/target-prepare.ts`, `src/integrations/target-project-resolver.ts`, `src/integrations/target-prepare-git-guard.ts`, `src/integrations/codex-client.ts` e `src/integrations/git-client.ts` fornecem o padrao reutilizavel de resolvedor, guardas Git, prompt dedicado e commit/push;
  - `src/core/runner.ts`, `src/main.ts`, `src/integrations/telegram-bot.ts` e `README.md` sao as superfices minimas de entrada publica do comando;
  - `src/types/flow-timing.ts`, `src/types/state.ts` e `src/integrations/workflow-trace-store.ts` continuam explicitamente fora de escopo neste ticket;
  - `prompts/13-target-prepare-controlled-onboarding.md` e o proximo numero disponivel em `prompts/` indicam a superficie natural para um prompt dedicado de `target_checkup`.

## Plan of Work
- Milestone 1: Contrato de readiness audit e preflight deterministico
  - Entregavel: tipos e helpers de `target_checkup` cobrindo schema JSON, enums de veredito, dimensoes obrigatorias, metadata minima do snapshot, regras de validade por SHA/idade/drift, nomeacao de artefatos e resultados bloqueado/falha/sucesso.
  - Evidencia de conclusao: testes unitarios conseguem provar dirty tree, branch/head invalidos, dimensoes obrigatorias, naming canonico e funcoes de elegibilidade/invalidacao do relatorio sem depender de Telegram ou Codex.
  - Arquivos esperados: `src/types/target-checkup.ts`, modulo de guardas Git do checkup, `src/core/target-checkup.test.ts` e ajustes pontuais em testes de Git/resolvedor quando necessario.
- Milestone 2: Executor core, coleta objetiva e publicacao canonica
  - Entregavel: executor `ControlledTargetCheckupExecutor` que valida preparo, descobre comandos suportados, executa passos nao interativos seguros com captura de `command`, `exitCode`, `durationMs`, `stdoutSummary` e `stderrSummary`, calcula vereditos em codigo, chama Codex apenas para sintese e escreve `md + json` no repo alvo.
  - Evidencia de conclusao: testes cobrem caminho feliz no projeto ativo, caminho feliz no alvo explicito, relatorio invalido-ainda-versionado, falha interna sem publicacao, dimensoes obrigatorias e proibicao de relatorio "valido" sem base deterministica.
  - Arquivos esperados: `src/core/target-checkup.ts`, possiveis helpers de coleta/report store, `src/integrations/codex-client.ts`, `prompts/14-target-checkup-readiness-audit.md`, `src/integrations/git-client.ts` ou adaptador local de versionamento.
- Milestone 3: Entrada publica e matriz de aceite do ticket
  - Entregavel: `requestTargetCheckup` no runner, executor registrado em `main.ts`, parser/help/replies de `/target_checkup [<project-name>]` no bot, README atualizado e suite de testes cobrindo todos os closure criteria do ticket.
  - Evidencia de conclusao: runner e Telegram respondem corretamente para projeto ativo, alvo explicito, bloqueios de preflight e mensagens de falha/publicacao; `npm test -- ...` e `npm run check` fecham verdes; smokes manuais herdados validam repositorio invalido-ainda-versionado e permissao real de `git push`.
  - Arquivos esperados: `src/core/runner.ts`, `src/main.ts`, `src/integrations/telegram-bot.ts`, `README.md`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "target_prepare|target_checkup|docs/checkups/history|requestTargetPrepare|runTargetPrepare" src README.md prompts` para reabrir o padrao atual de `target_prepare`, confirmar a ausencia de `target_checkup` e listar as superfices que o plano pretende tocar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-checkup.ts` para declarar constantes, enums de dimensao/veredito, tipos de evidencia/execucao de comando, schema JSON, helper de nomeacao `docs/checkups/history/<timestamp>-project-readiness-checkup.*`, regras de elegibilidade para derivacao e tipos de resultado do executor.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em um novo guard de Git do checkup (por exemplo `src/integrations/target-checkup-git-guard.ts`) ou generalizar o guard existente para cobrir `assertCleanWorkingTree`, branch simbolica, `HEAD`, lista de caminhos alterados e verificacao de drift que serao usados antes, durante e depois da coleta.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em novos helpers do dominio de checkup para validar integridade do `target_prepare`, garantir existencia de `docs/checkups/history/`, descobrir comandos explicitamente suportados, executar apenas comandos nao interativos com timeout e serializar resumos deterministas de stdout/stderr.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/codex-client.ts` e criar `prompts/14-target-checkup-readiness-audit.md` para receber o payload factual do checkup, congelar preferencias de invocacao, e limitar o papel do Codex a sintese editorial e agrupamento de gaps sem inventar fatos.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-checkup.ts` para implementar o executor principal: resolver projeto alvo, rodar preflight Git, coletar evidencias por dimensao, calcular vereditos em codigo, gerar o JSON canonico, renderizar o Markdown humano e preparar o conjunto de caminhos a ser versionado.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch na fronteira de versionamento usando `src/integrations/git-client.ts` ou um adaptador local para publicar rounds operacionalmente concluidos mesmo quando `overallVerdict=invalid_for_gap_ticket_derivation`, e para retornar erro observavel sem artefato canonico versionado quando houver falha interna antes da publicacao.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.ts` para adicionar `TargetCheckupRequestResult`, `requestTargetCheckup`, as guardas de concorrencia alinhadas ao padrao atual de `target_prepare`, a resolucao entre projeto ativo e alvo explicito e a preservacao do projeto ativo global.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/main.ts`, `src/integrations/telegram-bot.ts` e `README.md` para registrar o executor, expor `/target_checkup [<project-name>]`, adicionar usage/help/replies observaveis e atualizar a documentacao publica minima do bot sem absorver `/_status`, `/_cancel` ou traces do ticket irmao.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch nos testes focados: criar `src/core/target-checkup.test.ts` e ajustar `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts` e, se necessario, `src/integrations/git-client.test.ts` para cobrir sucesso por projeto ativo, sucesso por alvo explicito, dirty tree, erros de resolucao, schema, dimensoes obrigatorias, invalidacao por SHA/idade/drift, invalid-but-versioned e falha interna sem publicacao.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts` para validar o contrato observavel do ticket.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar integridade tipada do wiring final.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` e, pelo Telegram autorizado, exercitar `/target_checkup` em um projeto ativo preparado e `/target_checkup <project-name>` em um alvo explicito preparado para validar os dois caminhos de selecao sem troca do projeto ativo.
14. (workdir: repo alvo de smoke preparado) Inspecionar `git status --porcelain`, `git log -1 --stat` e `ls docs/checkups/history` apos um caso com veredito `invalid_for_gap_ticket_derivation` para confirmar publicacao do par `.md/.json`, `working_tree_clean_at_start=true`, timestamps, SHAs e versionamento mesmo em rodada invalida.
15. (workdir: repo alvo de smoke preparado) Reproduzir uma falha interna controlada antes da fronteira de versionamento e confirmar que nao houve artefato canonico versionado da rodada; no mesmo ambiente, validar que a permissao real de `git push` existe para o caso feliz herdado pela spec/ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01 (superficie `/target_checkup`), RF-10, RF-11; CA-04.
    - Evidencia observavel: `/target_checkup` aceita projeto ativo por default e alvo explicito por argumento sem trocar o projeto ativo global; working tree sujo bloqueia cedo sem artefato canonico valido; testes cobrem sucesso por alvo explicito, sucesso por projeto ativo, dirty tree e erros de resolucao do alvo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: a suite cobre selecao por projeto ativo vs alvo explicito, preservacao do projeto ativo global, bloqueio por dirty tree e mensagens observaveis para nome invalido, projeto ausente e repo Git invalido.
  - Requisito: RF-12, RF-13, RF-14, RF-15, RF-16; CA-05.
    - Evidencia observavel: o fluxo gera `docs/checkups/history/<timestamp>-project-readiness-checkup.md` e `.json` com `analyzed_head_sha`, `branch`, `working_tree_clean_at_start=true`, `started_at_utc`, `finished_at_utc`, `report_commit_sha` segundo a convencao adotada, vereditos por dimensao e veredito geral; os fatos deterministas capturam comando, exit code, duracao e resumos de stdout/stderr; nenhum relatorio pode sair `valid_for_gap_ticket_derivation` sem base deterministica suficiente.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-checkup.test.ts src/integrations/codex-client.test.ts`
    - Esperado: a suite cobre schema, dimensoes obrigatorias, output `md + json`, captura dos campos minimos, papel limitado da IA na sintese e bloqueio de um relatorio "valido" sem preflight/evidencia deterministica.
  - Requisito: RF-17, RF-18; CA-05, CA-06.
    - Evidencia observavel: rounds operacionalmente concluidos versionam os artefatos canonicos mesmo quando o veredito geral e `invalid_for_gap_ticket_derivation`; falha interna nao publica artefato canonico e devolve mensagem distinguindo "nao publicado" de "publicado invalido"; helpers e testes cobrem validade por SHA/idade/drift para consumo posterior por `target_derive_gaps`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-checkup.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts`
    - Esperado: a suite cobre invalid-but-versioned, falha interna sem publicacao, drift/idade/commit posterior invalidando a derivacao e mensagens operacionais distintas para cada fronteira.
  - Requisito: validacoes manuais herdadas da spec/ticket.
    - Evidencia observavel: existe um caso real em que `target_checkup` termina com `invalid_for_gap_ticket_derivation` e mesmo assim publica o par canonico `md + json`; o ambiente de smoke confirma permissao real de `git push`.
    - Comando: iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`, executar `/target_checkup` pelo Telegram autorizado contra repositorios preparados de smoke e inspecionar `git log -1 --stat`, `git status --porcelain` e `docs/checkups/history/` no repo alvo.
    - Esperado: o caso invalido publica relatorio versionado com os campos minimos do snapshot e o caso de push real fecha com remoto sincronizado; falha interna controlada nao deixa artefato canonico versionado da rodada.
- Comando complementar de consistencia tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de TypeScript apos adicionar o novo fluxo e os tipos auxiliares.
- Resultados executados nesta rodada:
  - 2026-03-24 22:19Z - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts` -> verde.
  - 2026-03-24 22:19Z - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` -> verde.
  - 2026-03-24 22:19Z - Smokes manuais herdados (`npm run dev` + Telegram + repo alvo preparado com push real) -> nao executados nesta etapa; permanecem como pendencia externa/manual do ticket.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar `target_checkup` sobre o mesmo snapshot limpo deve produzir um novo par timestampado em `docs/checkups/history/`, sem sobrescrever historico anterior e mantendo o mesmo `analyzed_head_sha` ate que o repo mude;
  - o comando sem argumento deve continuar lendo o projeto ativo sem alterar sua selecao global, e o comando com argumento explicito deve continuar atuando no alvo indicado sem side effects globais;
  - regras de validade por SHA/idade/drift precisam convergir para a mesma resposta independentemente do ponto de consumo (`target_checkup` agora, `target_derive_gaps` depois).
- Riscos:
  - `report_commit_sha` pode exigir uma convencao de publicacao explicita para evitar autorreferencia impossivel no proprio artefato;
  - comandos supostamente seguros podem mutar working tree ou depender de runtime/ferramenta indisponivel no host;
  - a descoberta conservadora de comandos pode classificar repositorios legitimos como `blocked` se faltarem superficies machine-readable suficientes;
  - falha de push apos commit local pode deixar a rodada publicada apenas localmente, exigindo recovery antes de qualquer rerun.
- Recovery / Rollback:
  - se o preflight falhar por dirty tree, branch ou `HEAD`, corrigir a condicao objetiva no repo alvo e rerodar sem gerar/publicar artefato;
  - se a coleta ou a sintese falharem antes do commit, inspecionar `git status --porcelain`, remover apenas os drafts locais de `docs/checkups/history/<timestamp>-project-readiness-checkup.*` quando existirem e rerodar; em repositorios descartaveis de smoke, prefira recriar o repo a usar comandos destrutivos;
  - se algum comando descoberto mutar o repo, interromper a execucao, endurecer a allowlist/timeout/estrategia de descoberta e rerodar somente apos o repo voltar ao estado limpo;
  - se o push falhar depois do commit local, nao rerodar a coleta; primeiro sincronizar o commit existente com o remoto e so depois prosseguir com qualquer nova rodada.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-24-target-checkup-readiness-audit-gap.md`
- Spec e contratos consultados no planejamento:
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `docs/workflows/target-project-compatibility-contract.md`
- Tickets irmaos usados para delimitar fronteira de escopo:
  - `tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`
  - `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
- Artefatos planejados para o repo alvo:
  - `docs/checkups/history/<timestamp>-project-readiness-checkup.json`
  - `docs/checkups/history/<timestamp>-project-readiness-checkup.md`
- Artefatos planejados para o runner:
  - `src/types/target-checkup.ts`
  - `src/core/target-checkup.ts`
  - guard/helper(s) Git e de coleta deterministica associados ao checkup
  - `prompts/14-target-checkup-readiness-audit.md`
  - suites de `target-checkup`, `runner`, `telegram-bot`, `codex-client` e `git-client`
- Checklist de qualidade aplicado neste planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita de spec de origem, RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - explicacao do que fica fora de escopo e dos riscos residuais antes da execucao.

## Interfaces and Dependencies
- Interfaces alteradas ou adicionadas:
  - entrada publica do bot: `/target_checkup [<project-name>]`;
  - `TargetCheckupExecutionResult`/`TargetCheckupRequestResult` e tipos auxiliares de report/validade/evidencia;
  - novo executor de dominio para readiness audit, injetado em `main.ts` e consumido por `runner.ts`;
  - novo caminho dedicado em `CodexCliTicketFlowClient` para sintese do checkup;
  - contrato canonico de artefatos do repo alvo em `docs/checkups/history/`.
- Compatibilidade:
  - o projeto ativo global nao pode ser trocado automaticamente por `target_checkup`;
  - `target_prepare` continua sendo precondicao operacional observavel para a dimensao `integridade do preparo`;
  - `target_derive_gaps` deve reutilizar o schema/validator deste ticket, em vez de reinventar a regra de SHA/idade/drift;
  - `RunnerSlotKind`, `RunnerFlowSummary`, traces locais canonicos, `/_status` e `/_cancel` permanecem dependentes do ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`.
- Dependencias externas e operacionais:
  - autenticacao valida do Codex CLI para a etapa de sintese;
  - Git do host com permissao real de `push` no repo alvo para os smokes manuais;
  - `PROJECTS_ROOT_PATH` apontando para a pasta-pai que contem `codex-flow-runner` e os repositorios irmaos preparados de teste;
  - runtime Node do host via `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` em todos os comandos `npm`.
