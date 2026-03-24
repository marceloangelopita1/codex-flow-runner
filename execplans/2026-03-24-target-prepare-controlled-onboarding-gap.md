# ExecPlan - Target prepare controlled onboarding gap

## Purpose / Big Picture
- Objetivo: introduzir o fluxo `/target_prepare <project-name>` para preparar um diretorio irmao ja versionado em Git, ainda inelegivel para `/projects`, com mutacao controlada por Codex/IA, allowlist forte, pos-check deterministico, manifesto/relatorio canonicos no proprio repo alvo e versionamento seguro sem trocar implicitamente o projeto ativo.
- Resultado esperado:
  - o Telegram passa a aceitar `/target_prepare <project-name>` como entrada publica do fluxo;
  - o runner resolve apenas diretorio irmao explicito dentro de `PROJECTS_ROOT_PATH`, aceita repositorio Git fora da elegibilidade atual de `/projects` e preserva o projeto ativo global;
  - o prepare cria/atualiza apenas superficies permitidas, faz merge in-place de `AGENTS.md` e `README.md`, gera `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md`, e so commita/pusha apos pos-check aprovado;
  - o resumo final informa se o alvo ficou elegivel para `/projects`, se ficou compativel com o workflow completo e qual e a proxima acao recomendada.
- Escopo:
  - resolvedor explicito de projeto alvo irmao fora da descoberta por elegibilidade;
  - pipeline core de `target_prepare` com preflight, prompt dedicado, validacao estrutural, allowlist e fronteira commit/push;
  - artefatos canonicos de preparo no repo alvo;
  - comando Telegram `/target_prepare <project-name>`, wiring em `main.ts` e resumo final rastreavel;
  - cobertura automatizada e smoke validations manuais herdadas pelo ticket.
- Fora de escopo:
  - `/target_checkup` e `/target_derive_gaps`;
  - `/_status`, `/_cancel`, milestones canonicos compartilhados, traces locais canonicos e slot/status editorial completo dos fluxos target, que pertencem ao ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`;
  - suporte a caminho arbitrario, criacao de projeto novo, terceira categoria de compatibilidade ou prova semantica ampla de qualidade do projeto alvo;
  - mutacao de `.gitignore`, `.codex/`, `.codex/config.toml`, `package.json`, scripts de automacao, CI, configs locais de runtime ou qualquer superficie fora da allowlist.

## Progress
- [x] 2026-03-24 21:02Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, do contrato de compatibilidade, das superfices de codigo citadas e do ticket irmao de controle operacional para delimitar escopo.
- [x] 2026-03-24 21:30Z - Wiring de `/target_prepare`, resolvedor explicito de alvo e pipeline core de prepare implementados no runner, no bot do Telegram e no cliente Codex.
- [x] 2026-03-24 21:30Z - Allowlist, prompt dedicado, manifesto/relatorio e fronteira de pos-check/versionamento validados em testes automatizados (`npm test` direcionado + `npm run check`).
- [x] 2026-03-24 21:36Z - Revalidacao de fechamento concluida contra diff, ticket, spec e quality gates; o resolvedor foi endurecido para rejeitar `.` como pseudo-diretorio irmao e a suite automatizada foi rerodada com sucesso (`npm test -- ...`, 455 testes aprovados, e `npm run check`).
- [ ] 2026-03-24 21:30Z - Smokes manuais ainda pendentes: repositorio quase vazio real, repositorio com `AGENTS.md`/`README.md` preexistentes e ambiente com permissao real de `git push`.

## Surprises & Discoveries
- 2026-03-24 21:02Z - `src/integrations/project-discovery.ts` so conhece o conceito de projeto elegivel (`.git` + `tickets/open/`), entao `target_prepare` precisa de um resolvedor explicito proprio em vez de reusar a descoberta atual.
- 2026-03-24 21:02Z - `src/main.ts` constroi `CodexCliTicketFlowClient` e `GitCliVersioning` apenas para o projeto ativo; o fluxo target precisa de uma factory adicional para dependencias efemeras do repo alvo sem persistir selecao global.
- 2026-03-24 21:02Z - `src/integrations/codex-client.ts` so modela stages de ticket/spec; para `prepare` o encaixe mais limpo e um caminho dedicado de prompt em vez de forcar a taxonomia atual de ticket flow.
- 2026-03-24 21:02Z - O ticket irmao de controle operacional ja separa explicitamente `/_status`, `/_cancel`, milestones, traces e slot/status target; este plano precisa entregar o fluxo funcional de prepare sem duplicar esse contrato compartilhado.
- 2026-03-24 21:02Z - `README.md` ja documenta a superficie publica do bot, entao a adicao de `/target_prepare` precisa reservar ajuste textual minimo para nao deixar a documentacao publica atras da implementacao.
- 2026-03-24 21:30Z - Foi possivel manter `target_prepare` fora do contrato completo de slot/status do ticket irmao sem perder seguranca local, usando executor dedicado no runner e bloqueio conservador contra outras rodadas/sessoes ativas nesta instancia.
- 2026-03-24 21:30Z - A forma mais forte de validar o pos-check sem inferencia fraca foi tratar a maior parte das docs de workflow como `copy-exact` a partir do proprio runner e restringir `AGENTS.md`/`README.md` a blocos gerenciados com markers deterministas.
- 2026-03-24 21:36Z - A revalidacao de fechamento mostrou que `.` ainda era aceito como nome de projeto; isso nao alterava o caminho feliz principal, mas feria o contrato de "diretorio irmao explicito", entao o guardrail foi endurecido e coberto por teste dedicado antes do fechamento.

## Decision Log
- 2026-03-24 - Decisao: criar um resolvedor explicito de projeto alvo separado da descoberta por elegibilidade.
  - Motivo: `prepare` precisa aceitar repositorio Git ainda sem `tickets/open/`, enquanto `/projects` deve continuar listando apenas projetos elegiveis.
  - Impacto: preserva o contrato atual de `/projects` e evita regressao na selecao do projeto ativo.
- 2026-03-24 - Decisao: tratar `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md` como artefatos canonicos do v1, atualizados in-place no repo alvo.
  - Motivo: o ticket exige prova canonica versionada no proprio projeto alvo, mas nao exige historico por rodada para `prepare`.
  - Impacto: simplifica pos-check, reruns e resumo final, sem impedir um historico futuro se a spec exigir.
- 2026-03-24 - Decisao: exigir working tree limpo no inicio do `target_prepare`.
  - Motivo: sem esse gate, a deteccao de drift fora da allowlist e a fronteira `nao commitar/pushar em caso de falha` ficam ambiguuas e arriscam misturar mudancas preexistentes com o onboarding controlado.
  - Impacto: o v1 fica mais seguro e observavel, ao custo de um preflight mais restritivo que deve ser documentado nas mensagens de erro e no resumo operacional.
- 2026-03-24 - Decisao: permitir apenas o minimo de estado interno adicional necessario para iniciar o fluxo e devolver resumo final, deixando `/_status`, `/_cancel`, traces e slot/status editorial completo para o ticket irmao.
  - Motivo: o backlog derivado da spec particionou explicitamente o controle operacional compartilhado em um ticket separado.
  - Impacto: evita sobreposicao de escopo e reduz risco de reabrir contratos centrais de status/traces antes da hora.
- 2026-03-24 - Decisao: integrar `target_prepare` ao runner por um executor dedicado, sem plugar o fluxo novo no contrato atual de `activeSlots`/milestones.
  - Motivo: o ticket cobre o fluxo funcional de prepare, mas o contrato canonico de `/_status`, `/_cancel`, traces e slot editorial dos fluxos target pertence ao ticket irmao.
  - Impacto: entrega o comando funcional agora e deixa como risco residual apenas o endurecimento canônico de status/bloqueios compartilhados.
- 2026-03-24 - Decisao: validar docs canonicas do prepare por duas estrategias complementares: `copy-exact` para contratos compartilhados e `managed-block` para `AGENTS.md`/`README.md`.
  - Motivo: isso torna o pos-check forte o bastante para bloquear drift fora do contrato sem apagar contexto relevante preexistente nesses dois arquivos.
  - Impacto: reruns convergem para o mesmo bloco gerenciado e o manifesto consegue registrar estrategia de validacao por superficie de modo objetivo.
- 2026-03-24 - Decisao: rejeitar explicitamente `.` como nome de projeto em `/target_prepare`.
  - Motivo: `.` nao representa um diretorio irmao de primeiro nivel e abriria uma excecao desnecessaria ao contrato de resolucao literal dentro de `PROJECTS_ROOT_PATH`.
  - Impacto: endurece o preflight sem ampliar escopo funcional nem alterar o comportamento esperado para nomes validos de projetos.

## Outcomes & Retrospective
- Status final: implementacao funcional concluida com validacao automatizada verde; validacoes manuais externas ainda pendentes.
- O que precisa existir ao final:
  - entrada publica `/target_prepare <project-name>` no bot e no runner;
  - resolvedor explicito de diretorio irmao, sem troca implicita do projeto ativo;
  - mutacao assistida por Codex restrita a allowlist e protegida por validadores deterministas;
  - `AGENTS.md` e `README.md` mesclados in-place, demais docs canonicas gerenciadas na allowlist e manifesto/relatorio canonicos em `docs/workflows/`;
  - commit/push apenas apos pos-check aprovado, com falha deixando diff local e diagnostico explicito;
  - testes cobrindo os cenarios observaveis dos closure criteria e smokes manuais herdados executados.
- O que fica pendente fora deste plano:
  - `/target_checkup`, `/target_derive_gaps` e a camada compartilhada de `/_status`, `/_cancel`, milestones e traces;
  - qualquer ampliacao futura de historico de prepare ou deduplicacao multi-rodada alem do artefato canonico mais recente;
  - qualquer flexibilizacao do preflight de working tree limpo, caso se mostre necessaria em follow-up.
- Proximos passos:
  - executar os smokes manuais herdados do ticket em repositorios Git reais de teste;
  - seguir para os tickets irmaos de `target_checkup`, `target_derive_gaps` e do controle operacional compartilhado dos fluxos target.

## Context and Orientation
- Arquivos e superfices principais lidos no planejamento:
  - `tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/integrations/project-discovery.ts`
  - `src/core/active-project-resolver.ts`
  - `src/core/project-selection.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/git-client.ts`
  - `src/types/state.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/main.ts`
  - `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
- Spec de origem: `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09
  - CA-01, CA-02, CA-03
- RNFs e restricoes herdadas que precisam permanecer observaveis neste ticket:
  - manter fluxo sequencial e nao trocar implicitamente o projeto ativo;
  - preservar o projeto alvo como fonte canonica dos artefatos versionados de onboarding;
  - usar IA principalmente para adequacao controlada, sempre ancorada em preflight/pos-check deterministico;
  - aceitar apenas nome explicito de diretorio irmao de primeiro nivel em `PROJECTS_ROOT_PATH`;
  - limitar mutacoes a allowlist explicita e bloquear qualquer drift fora dela;
  - preservar `AGENTS.md` e `README.md` com merge in-place e validacao estrutural;
  - registrar no manifesto/relatorio a versao logica do contrato, a versao/schema do prepare, referencia do runner, timestamp, superficies gerenciadas, estrategia de validacao por superficie, fingerprints/hashes quando aplicavel e allowlist de caminhos autorizados.
- Assumptions / defaults adotados para eliminar ambiguidade:
  - nomes de projeto para `/target_prepare` sao comparados com o nome literal do diretorio irmao de primeiro nivel; o v1 aceita apenas `project-name`, sem barras, `..` ou alias de caminho;
  - o v1 exige working tree limpo no repo alvo antes de iniciar o prompt de adequacao;
  - `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md` sao os caminhos canonicos do v1 para a prova de preparo;
  - "elegivel para `/projects`" apos o prepare significa que o repo alvo passou a satisfazer o contrato atual de descoberta (`.git` + `tickets/open/`);
  - "compativel com workflow completo" apos o prepare significa que o pos-check confirmou todas as superfices obrigatorias do contrato operacional em `docs/workflows/target-project-compatibility-contract.md`; isso nao e prova semantica ampla do produto;
  - o CTA de sucesso deste ticket sera textual e simples (`Rodar /target_checkup <project-name>` ou, se necessario, `Selecionar projeto`), enquanto a camada canonica de CTAs/milestones compartilhados continua no ticket irmao;
  - se a implementacao precisar de algum estado interno minimo para serializar a execucao, ele deve ser o menor possivel e nao deve antecipar o contrato completo de `/_status`/`/_cancel`.
- Fluxo atual relevante (as-is):
  - `FileSystemProjectDiscovery` e `resolveActiveProject` so enxergam projetos elegiveis, impossibilitando preparar um repo Git ainda fora de `/projects`.
  - `TelegramController` nao expoe `/target_prepare`, e o help publico do bot documentado em `README.md` tampouco.
  - `CodexCliTicketFlowClient` possui apenas prompts de ticket/spec e hoje nao tem caminho dedicado para um prompt de onboarding controlado.
  - `GitCliVersioning` fornece commit/push e validacao de sync, mas nao tem guardrails de allowlist, working tree limpo, manifesto/relatorio ou pos-check de prepare.
- Superficies provaveis de implementacao:
  - `src/types/target-prepare.ts`
  - `src/integrations/target-project-resolver.ts`
  - `src/integrations/target-prepare-git-guard.ts`
  - `src/core/target-prepare.ts`
  - `src/integrations/codex-client.ts`
  - `prompts/13-target-prepare-controlled-onboarding.md`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/git-client.test.ts`
  - `README.md`

## Plan of Work
- Milestone 1: Resolver explicitamente o repo alvo e abrir a entrada publica de `/target_prepare`.
  - Entregavel: existe um resolvedor explicito de diretorio irmao que aceita repo Git ainda inelegivel em `/projects`, `main.ts` consegue construir dependencias efemeras para o alvo e `TelegramController` encaminha `/target_prepare <project-name>` para o runner sem alterar o projeto ativo.
  - Evidencia de conclusao: testes cobrem sucesso, diretorio ausente, repo sem `.git`, repo inelegivel para `/projects` mas elegivel para `prepare`, e preservacao do projeto ativo.
  - Arquivos esperados: `src/integrations/target-project-resolver.ts`, `src/core/target-prepare.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/main.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `README.md`.
- Milestone 2: Executar a adequacao controlada por Codex dentro de allowlist e produzir os artefatos canonicos.
  - Entregavel: um prompt dedicado de prepare roda no repo alvo, com allowlist explicita, merge in-place de `AGENTS.md`/`README.md`, atualizacao das docs canonicas permitidas e geracao de manifesto/relatorio com todos os campos exigidos pelo ticket/spec.
  - Evidencia de conclusao: testes validam o prompt dedicado, a lista de caminhos permitidos, a preservacao de conteudo relevante preexistente e a presenca dos campos obrigatorios em `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md`.
  - Arquivos esperados: `prompts/13-target-prepare-controlled-onboarding.md`, `src/types/target-prepare.ts`, `src/core/target-prepare.ts`, `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `src/core/target-prepare.test.ts`.
- Milestone 3: Blindar a fronteira de versionamento com pos-check e diagnostico observavel.
  - Entregavel: o prepare exige working tree limpo no inicio, bloqueia diff fora da allowlist, roda pos-check deterministico antes do commit/push, deixa diff local quando falha e publica resumo final com elegibilidade `/projects`, compatibilidade com workflow completo e proxima acao recomendada.
  - Evidencia de conclusao: testes cobrem caminho feliz, mutacao fora da allowlist, falha de pos-check, falha de push e resumo final rastreavel; em falhas, nao ha carimbo de sucesso canonico.
  - Arquivos esperados: `src/integrations/target-prepare-git-guard.ts`, `src/core/target-prepare.ts`, `src/integrations/git-client.ts` ou wrapper dedicado, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.test.ts`, `src/integrations/git-client.test.ts`.
- Milestone 4: Fechar com suite focada e smoke validations manuais nos repositorios-alvo exigidos pelo ticket.
  - Entregavel: a matriz de validacao automatizada passa e os cenarios manuais herdados exercitam repositorio quase vazio, repositorio com `AGENTS.md`/`README.md` relevantes e permissao real de `git push`.
  - Evidencia de conclusao: `npm test` focado e `npm run check` verdes; smoke manual confirma artefatos, allowlist, preservacao de conteudo e fronteira de versionamento em repo real.
  - Arquivos esperados: suites de teste atualizadas e, se necessario, pequeno ajuste textual em `README.md` para refletir o comando publico.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md`, `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`, `docs/workflows/target-project-compatibility-contract.md` e `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md` para reconfirmar os limites entre fluxo funcional de prepare e controle operacional compartilhado antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para adicionar `src/types/target-prepare.ts` com:
   - tipos do manifesto/relatorio;
   - lista allowlist de caminhos permitidos e superfices proibidas;
   - shape do resultado final do prepare, incluindo `becameEligibleForProjects`, `workflowCompatibility`, `nextRecommendedAction` e diagnosticos de pos-check.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/integrations/target-project-resolver.ts` e testes associados, resolvendo apenas diretorio irmao explicito em `PROJECTS_ROOT_PATH`, rejeitando path arbitrario e retornando metadados suficientes para distinguir `elegivel para /projects` de `elegivel para prepare`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/integrations/target-prepare-git-guard.ts` com preflight de working tree limpo, enumeracao de arquivos alterados, validacao contra allowlist, coleta de hashes/fingerprints e helper de diagnostico para falhas antes do commit/push.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `prompts/13-target-prepare-controlled-onboarding.md` e estender `src/integrations/codex-client.ts`/`src/integrations/codex-client.test.ts` com um caminho dedicado de execucao do prompt de prepare, mantendo o repo alvo como cwd e injetando contexto deterministico do ticket/spec/allowlist.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/core/target-prepare.ts`, centralizando:
   - preflight do alvo;
   - execucao do prompt dedicado;
   - validacao estrutural de `AGENTS.md` e `README.md`;
   - geracao/atualizacao de `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md`;
   - pos-check final e chamada de versionamento apenas quando o gate estiver verde.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` e `src/main.ts` para:
   - adicionar o comando interno `targetPrepare(projectName: string)` ou equivalente no runner;
   - construir dependencias efemeras (`CodexCliTicketFlowClient`, guard de Git/versionamento e resolvedor de alvo) para o repo explicito, sem salvar esse repo como projeto ativo;
   - devolver resultado textual rastreavel com elegibilidade `/projects`, compatibilidade com workflow completo e proxima acao recomendada.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts` e `README.md` para expor `/target_prepare <project-name>`, documentar o uso publico e validar respostas de sucesso/bloqueio/falha sem depender do ticket irmao de `/_status`/`/_cancel`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts`, `src/core/target-prepare.test.ts`, `src/integrations/target-project-resolver.test.ts` e `src/integrations/git-client.test.ts` para cobrir os cenarios exigidos pelos closure criteria: sucesso, diretorio ausente, repo sem `.git`, alvo fora de `/projects` mas valido para prepare, mutacao fora da allowlist, preservacao do projeto ativo, falha de pos-check, falha de push e resumo final rastreavel.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/target-project-resolver.test.ts src/core/target-prepare.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar o contrato automatizado do fluxo.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar integridade tipada do pacote apos o wiring do novo fluxo.
12. (workdir: `/home/mapita/projetos`) Preparar um repo descartavel quase vazio com `mkdir -p target-prepare-smoke-empty && cd target-prepare-smoke-empty && git init && git checkout -b main && git commit --allow-empty -m "chore: bootstrap"`; depois, em outra sessao, iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` em `/home/mapita/projetos/codex-flow-runner` e acionar manualmente `/target_prepare target-prepare-smoke-empty` no Telegram autorizado para confirmar criacao das superfices canonicas e comportamento de versionamento.
13. (workdir: `/home/mapita/projetos`) Preparar um repo descartavel com `AGENTS.md` e `README.md` preexistentes relevantes, repetir a rodada manual de `/target_prepare`, e inspecionar `git diff -- AGENTS.md README.md docs/workflows/target-prepare-manifest.json docs/workflows/target-prepare-report.md` para verificar merge in-place e preservacao do conteudo relevante.
14. (workdir: repo alvo manual em teste) Se o remoto real estiver configurado, rodar `git remote -v` antes da rodada manual, executar `/target_prepare <project-name>` e confirmar `git status --porcelain` limpo ao final de sucesso e `git log -1 --stat` contendo apenas caminhos da allowlist; em falha de push, corrigir autenticacao e validar que o diagnostico deixa clara a fronteira entre commit local e push remoto.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-01, RF-02, RF-03; CA-03.
    - Evidencia observavel: existe entrada publica `/target_prepare <project-name>`; o fluxo resolve somente diretorio irmao explicito de primeiro nivel, rejeita caminho arbitrario, diretorio ausente e repo sem `.git`, aceita repo Git ainda inelegivel em `/projects`, preserva o projeto ativo global e devolve resumo final com `elegivel para /projects`, `compativel com workflow completo` e `proxima acao recomendada`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/target-project-resolver.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: a suite cobre sucesso, diretorio ausente, repo sem `.git`, alvo inelegivel para `/projects` mas elegivel para prepare, preservacao do projeto ativo e renderizacao do resumo final rastreavel.
  - Requisito: RF-04, RF-05, RF-06, RF-07, RF-08; CA-01, CA-02.
    - Evidencia observavel: o prepare limita mutacoes a allowlist explicita, bloqueia caminhos fora dela, atualiza `AGENTS.md` e `README.md` in-place, cria/atualiza apenas as demais docs canonicas permitidas, e gera `docs/workflows/target-prepare-manifest.json` + `docs/workflows/target-prepare-report.md` com versao logica do contrato, versao/schema do prepare, referencia do runner, timestamp, superficies gerenciadas, estrategia de validacao por superficie, hashes/fingerprints quando aplicavel e allowlist de caminhos autorizados.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/integrations/codex-client.test.ts src/integrations/target-project-resolver.test.ts`
    - Esperado: a suite cobre caminho feliz, tentativa de mutacao fora da allowlist, preservacao de conteudo relevante preexistente em `AGENTS.md`/`README.md` e presenca dos campos obrigatorios no manifesto/relatorio.
  - Requisito: RF-09; CA-01, CA-02.
    - Evidencia observavel: commit/push so ocorrem apos pos-check deterministico aprovado; falhas deixam diff local e diagnostico explicito, sem marcar o prepare como concluido; sucesso retorna evidencia de versionamento apenas para caminhos permitidos.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts`
    - Esperado: a suite cobre sucesso, falha de pos-check e falha de push, demonstrando ausencia de commit/push antes do gate verde e diagnostico explicito quando a fronteira de versionamento nao e atravessada com sucesso.
  - Requisito: validacoes manuais herdadas do ticket.
    - Evidencia observavel: o fluxo funciona em repositorio quase vazio ja existente em Git, em repositorio com `AGENTS.md`/`README.md` relevantes a preservar e em ambiente onde `git push` real e permitido.
    - Comando: iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` em `/home/mapita/projetos/codex-flow-runner`, acionar `/target_prepare <project-name>` pelo Telegram autorizado nos repositorios de smoke preparados nos passos 12 a 14 e inspecionar os artefatos/versionamento no repo alvo.
    - Esperado: em sucesso, os artefatos canonicos existem no repo alvo, o diff final versionado fica restrito a allowlist e o resumo final informa elegibilidade, compatibilidade e proxima acao; em falha operacional, o diagnostico deixa a causa explicita e nao marca preparo como concluido.
- Comando complementar de consistencia tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de TypeScript apos adicionar o novo fluxo e seus tipos auxiliares.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar `/target_prepare` em repo ja preparado deve convergir para os mesmos caminhos gerenciados, atualizando `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md` in-place, sem espalhar artefatos duplicados;
  - o resolvedor explicito de alvo deve continuar mantendo o projeto ativo inalterado em toda reexecucao;
  - reruns sem drift devem resultar em diff vazio ou diff restrito aos artefatos canonicos que realmente mudarem por timestamp/schema.
- Riscos:
  - o prompt dedicado tocar superficie fora da allowlist;
  - `AGENTS.md` ou `README.md` perderem conteudo relevante durante o merge in-place;
  - o pos-check classificar incorretamente um repo como compativel com workflow completo;
  - falha de push deixar commit local a frente do remoto sem resumo claro para o operador.
- Recovery / Rollback:
  - se o preflight falhar, corrigir a condicao objetiva (`.git`, nome do diretorio, working tree limpo, upstream/autenticacao quando aplicavel) e rerodar o fluxo sem alterar o projeto ativo;
  - se o prompt gerar diff fora da allowlist ou validacao estrutural falhar, inspecionar `git status --porcelain` e `git diff --name-only`, ajustar prompt/validator e rerodar; em repositorios descartaveis de smoke, prefira recriar o repo do zero em vez de usar comandos destrutivos;
  - se o push falhar apos commit local, corrigir autenticacao/upstream no repo alvo e sincronizar o commit existente em vez de rerodar a etapa de mutacao por IA;
  - registrar qualquer descoberta nova em `Surprises & Discoveries` e, se tocar `/_status`, `/_cancel`, traces ou milestones compartilhados, mover a parte remanescente para o ticket irmao em vez de ampliar este escopo silenciosamente.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md`
- Spec e contratos consultados:
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `docs/workflows/codex-quality-gates.md`
  - `PLANS.md`
- Ticket irmao usado para delimitar fronteira de escopo:
  - `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
- Artefatos planejados para o repo alvo:
  - `docs/workflows/target-prepare-manifest.json`
  - `docs/workflows/target-prepare-report.md`
- Artefatos planejados para o runner:
  - `prompts/13-target-prepare-controlled-onboarding.md`
  - modulo(s) de types/core/integrations para resolvedor explicito, guardrails Git e orquestracao do prepare
  - suites de `runner`, `telegram-bot`, `codex-client`, `git-client` e testes dedicados do fluxo
- Checklist de qualidade aplicado neste planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - declaracao explicita de spec de origem, RFs/CAs, RNFs/restricoes e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - explicacao do que fica fora de escopo e dos riscos residuais antes da execucao.

## Interfaces and Dependencies
- Interfaces alteradas ou adicionadas:
  - entrada publica do bot: `/target_prepare <project-name>`;
  - `BotControls`/`TicketRunner` com metodo dedicado para iniciar prepare em repo explicito;
  - factory adicional em `main.ts` para criar dependencias de repo alvo sem depender do projeto ativo;
  - caminho dedicado no `CodexCliTicketFlowClient` para executar o prompt de prepare;
  - contrato de artefatos canonicos do repo alvo em `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md`.
- Compatibilidade:
  - `/projects` e `resolveActiveProject` devem continuar usando apenas a elegibilidade atual (`.git` + `tickets/open/`);
  - o projeto ativo global nao pode ser alterado automaticamente por `target_prepare`;
  - a camada canonica de `/_status`, `/_cancel`, slot kinds target, traces e milestones compartilhados continua dependente do ticket `tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`.
- Dependencias externas e operacionais:
  - acesso ao Telegram autorizado para validar a entrada publica real;
  - Git do host autenticado no repo alvo para os smokes que exercitam `push`;
  - `PROJECTS_ROOT_PATH` apontando para a pasta-pai que contem `codex-flow-runner` e os repositorios irmaos de teste;
  - runtime Node do host via `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";` em todos os comandos `npm`.
