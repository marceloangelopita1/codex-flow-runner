# [TICKET] Falta fluxo controlado de onboarding para `/target_prepare` em projeto irmao ainda nao elegivel

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-24 20:34Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01 (superficie `/target_prepare <project-name>`), RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09; CA-01, CA-02, CA-03.
- Inherited assumptions/defaults (when applicable): a compatibilidade externa continua binaria; `prepare` e fluxo de adequacao observavel, nao prova semantica de perfeicao; o mecanismo principal de mutacao e um prompt dedicado de Codex/IA contido por guardrails deterministas; a prova canonica de preparo precisa ficar versionada no proprio projeto alvo; `prepare` nao deve trocar implicitamente o projeto ativo ao concluir.
- Inherited RNFs (when applicable): manter fluxo sequencial; preservar o projeto alvo como fonte canonica dos artefatos versionados de onboarding; usar IA principalmente para adequacao controlada, sintese e redacao sempre ancorada em fatos deterministas; manter diagnostico observavel quando o gate falhar.
- Inherited technical/documentary constraints (when applicable): aceitar apenas nome explicito de diretorio irmao dentro de `PROJECTS_ROOT_PATH`; nao suportar caminho arbitrario nem criacao de projeto no v1; limitar mutacoes a allowlist explicita; nao tocar `.gitignore`, `.codex/`, `.codex/config.toml`, `package.json`, scripts de automacao, CI, configs locais de runtime nem outras superficies fora da allowlist; `AGENTS.md` e `README.md` precisam ser mesclados in-place com validacao estrutural; o manifesto tecnico legivel por maquina e o relatorio humano do `prepare` precisam ficar versionados em `docs/workflows/` e registrar versao logica do contrato, versao/schema do prepare, referencia do runner, timestamp, superficies gerenciadas, estrategia de validacao por superficie, fingerprints/hashes quando aplicavel e allowlist de caminhos autorizados; commit/push so podem ocorrer apos pos-check deterministico bem-sucedido.
- Inherited pending/manual validations (when applicable): validar `target_prepare` em repositorio quase vazio ja existente em Git; validar `target_prepare` em repositorio com `AGENTS.md` e `README.md` preexistentes e conteudo relevante a preservar; confirmar permissao real de `git push` nos repositorios alvo de teste usados por este fluxo.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - SPECS.md
  - INTERNAL_TICKETS.md
  - docs/workflows/codex-quality-gates.md
  - docs/workflows/target-project-compatibility-contract.md
  - tickets/templates/internal-ticket-template.md
  - docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P0 porque `prepare` e a primeira barreira operacional da spec; sem ele o runner continua incapaz de promover um projeto nao elegivel para o workflow completo e bloqueia todo o restante da jornada.

## Context
- Workflow area: onboarding readiness de projeto alvo externo antes do workflow completo.
- Scenario: operador precisa adequar um diretorio irmao ja versionado em Git, ainda fora da elegibilidade atual de `/projects`, sem trocar o projeto ativo do runner.
- Input constraints: manter o alvo como repositorio canonicamente versionado; usar IA sob allowlist forte; deixar falhas de guardrail observaveis e inspecionaveis localmente.

## Problem statement
O runner atual nao oferece nenhum caminho para preparar um projeto alvo externo antes da elegibilidade de `/projects`. O fluxo so resolve projetos ja considerados elegiveis, nao possui `target_prepare`, nao tem allowlist de mutacao por superficie nem gera manifesto/relatorio de preparo com pos-check deterministico e fronteira explicita de versionamento.

## Observed behavior
- O que foi observado: `src/integrations/project-discovery.ts` so lista projetos com `.git` e `tickets/open/`; `src/core/active-project-resolver.ts` falha quando nao ha projeto elegivel e sempre trabalha a partir da lista elegivel; `src/integrations/telegram-bot.ts` nao registra `/target_prepare`; `src/types/state.ts` nao possui fase ou slot kind para fluxo target; `src/integrations/git-client.ts` fornece apenas helper generico de commit/push sem gate de allowlist, manifesto ou pos-check.
- Frequencia (unico, recorrente, intermitente): recorrente em toda tentativa de onboarding de projeto novo para o workflow completo.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/integrations/project-discovery.ts`, `src/core/active-project-resolver.ts`, `src/integrations/telegram-bot.ts`, `src/types/state.ts` e `src/integrations/git-client.ts`.

## Expected behavior
O runner deve aceitar `/target_prepare <project-name>` para um diretorio irmao explicito, mesmo ainda nao elegivel em `/projects`, executar preflight deterministico, invocar a adequacao controlada por Codex/IA apenas dentro da allowlist, validar o resultado com pos-check forte, gerar manifesto + relatorio versionados em `docs/workflows/` e somente entao commitar/pushar as superficies permitidas, sem alterar implicitamente o projeto ativo.

## Reproduction steps
1. Ler `src/integrations/project-discovery.ts` e confirmar que a descoberta atual exige simultaneamente `.git` e `tickets/open/`.
2. Ler `src/core/active-project-resolver.ts` e confirmar que o runner so parte da lista de projetos elegiveis.
3. Ler `src/integrations/telegram-bot.ts` e confirmar a ausencia de `/target_prepare` no help e nos handlers.
4. Ler `src/types/state.ts` e confirmar a ausencia de fases/slots para onboarding target.
5. Ler `src/integrations/git-client.ts` e confirmar que existe apenas versionamento generico, sem contrato de allowlist ou pos-check do prepare.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/integrations/project-discovery.ts`: elegibilidade atual depende de `.git` e `tickets/open/`, o que exclui o estado "precisa de prepare".
  - `src/core/active-project-resolver.ts`: a resolucao do projeto ativo falha quando nao ha elegiveis e nao aceita um alvo explicito fora dessa lista.
  - `src/integrations/telegram-bot.ts`: help e handlers nao incluem `/target_prepare`.
  - `src/types/state.ts`: nao ha `RunnerSlotKind`, `RunnerPhase` ou estado de cancel/status para onboarding target.
  - `src/integrations/git-client.ts`: ha base reutilizavel de commit/push, mas nenhum guardrail de prepare.
- Comparativo antes/depois (se houver): antes = onboarding continua manual e fora do runner; depois esperado = prepare auditavel, com allowlist, manifesto, relatorio e versionamento controlado no repositorio alvo.

## Impact assessment
- Impacto funcional: o primeiro comando da spec nao existe.
- Impacto operacional: projetos externos continuam exigindo onboarding manual nao rastreado, com alto risco de inconsistencias em `AGENTS.md`, `README.md` e docs canonicas.
- Risco de regressao: alto, porque a mudanca toca resolucao de projeto alvo, mutacao assistida por IA, validacao deterministica, versionamento e documentacao canonica.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/state.ts`, `src/integrations/telegram-bot.ts`, integracoes novas para resolver projeto alvo explicito e validar surfaces permitidas, alem de testes e docs relacionadas ao contrato de onboarding.

## Initial hypotheses (optional)
- A menor entrega segura combina um resolvedor explicito de projeto irmao, um executor de prepare com allowlist/manifesto/relatorio, e um pos-check deterministico que governa a fronteira entre diff local e commit/push.

## Proposed solution (optional)
Nao obrigatorio. Direcao concreta: introduzir fluxo dedicado de `target_prepare` com preflight, prompt de adequacao, validacao estrutural de `AGENTS.md`/`README.md`, manifesto tecnico legivel por maquina, relatorio humano em `docs/workflows/` e bloqueio de versionamento sempre que houver drift fora da allowlist ou falha no pos-check.

## Closure criteria
- Requisito/RF/CA coberto: RF-01 (comando `/target_prepare`), RF-02, RF-03; CA-03.
- Evidencia observavel: existe entrada publica para `/target_prepare <project-name>` que resolve apenas diretorio irmao explicito em `PROJECTS_ROOT_PATH`, aceita repositorio Git ainda nao elegivel em `/projects`, nao usa caminho arbitrario, nao cria projeto novo e nao altera automaticamente o projeto ativo; o resumo final informa explicitamente se o alvo ficou elegivel para `/projects`, se ficou compativel com o workflow completo e qual e a proxima acao recomendada; testes automatizados cobrem sucesso, diretorio ausente, repo sem `.git`, alvo inelegivel para `/projects` mas elegivel para `prepare`, preservacao do projeto ativo e o resumo final rastreavel exigido por `CA-03`.
- Validacao de fechamento: `src/integrations/target-project-resolver.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `src/main.ts` agora expoem o fluxo e restringem a resolucao ao nome literal do diretorio irmao; o guardrail adicional contra `.` foi consolidado em `src/integrations/target-project-resolver.ts` e `src/integrations/target-project-resolver.test.ts`; `src/core/runner.test.ts` valida preservacao do projeto ativo global; `src/integrations/telegram-bot.test.ts` valida o resumo final rastreavel; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/target-project-resolver.test.ts src/core/target-prepare.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts` passou em 2026-03-24 21:36Z com 455 testes aprovados.
- Requisito/RF/CA coberto: RF-04, RF-05, RF-06, RF-07, RF-08; CA-01, CA-02.
- Evidencia observavel: o prepare limita mutacoes a allowlist explicita, bloqueia mudanca fora dela, faz merge/atualizacao in-place de `AGENTS.md` e `README.md`, cria/atualiza as demais docs canonicas permitidas, gera manifesto tecnico + relatorio humano em `docs/workflows/`, e registra de forma observavel versao logica do contrato, versao/schema do prepare, referencia do runner, timestamp, superficies gerenciadas, estrategia de validacao por superficie, fingerprints/hashes quando aplicavel e allowlist de caminhos autorizados; testes cobrem caminho feliz, tentativa de mutacao fora da allowlist e preservacao de conteudo relevante preexistente.
- Validacao de fechamento: `src/types/target-prepare.ts` define a allowlist, o schema e as estrategias de validacao; `src/core/target-prepare.ts` valida superfices gerenciadas, escreve `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md` e exige convergencia exata/managed-block; `prompts/13-target-prepare-controlled-onboarding.md` limita a mutacao assistida; `src/integrations/codex-client.test.ts` confirma injecao de allowlist/fontes gerenciadas no prompt; `src/core/target-prepare.test.ts` cobre caminho feliz, mutacao fora da allowlist e preservacao de contexto preexistente em `AGENTS.md`/`README.md`; `README.md` e `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md` foram atualizados no mesmo changeset para refletir a nova superficie publica e o status vivo da jornada.
- Requisito/RF/CA coberto: RF-09; CA-01, CA-02.
- Evidencia observavel: commit/push so acontecem apos pos-check deterministico aprovado; falhas deixam diff local e diagnostico explicito, sem marcar preparo como concluido; testes cobrem sucesso, falha de pos-check e falha de push; a validacao manual herdada exercita repositorio quase vazio, repositorio com `AGENTS.md`/`README.md` relevantes e permissao real de `git push`.
- Validacao de fechamento: `src/core/target-prepare.ts` so chama `commitAndPushPaths` depois do preflight, da validacao estrutural e da rechecagem de allowlist; `src/core/target-prepare.test.ts` cobre falha por drift fora da allowlist e falha de push apos o pos-check com diagnostico explicito; `src/integrations/git-client.test.ts` valida que `commitAndPushPaths` versiona apenas caminhos explicitamente permitidos e confirma a evidencia de push; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` passou em 2026-03-24 21:36Z sem erros de TypeScript.

## Manual validation pending
- Entrega tecnica concluida: sim. O recorte funcional e documental deste ticket esta implementado, revalidado contra o ExecPlan e coberto por testes automatizados locais.
- Validacoes manuais externas ainda necessarias:
  - Exercitar `/target_prepare` em repositorio Git real quase vazio ja existente e confirmar criacao das superfices canonicas no alvo.
  - Exercitar `/target_prepare` em repositorio com `AGENTS.md` e `README.md` preexistentes relevantes e confirmar preservacao do contexto local fora do bloco gerenciado.
  - Confirmar permissao real de `git push` no remoto do repositorio alvo de teste e a fronteira de diagnostico quando houver falha de push.
- Como executar a validacao manual:
  - Preparar os repositorios de smoke descritos no ExecPlan em `/home/mapita/projetos`.
  - Iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`.
  - Acionar `/target_prepare <project-name>` no chat Telegram autorizado e inspecionar `git status --porcelain`, `git log -1 --stat` e os artefatos `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md` no repo alvo.
- Responsavel operacional pela validacao manual: operador do runner com acesso ao chat Telegram autorizado, aos repositorios Git de teste e a um remoto com permissao real de `git push`.
- Motivo para nao bloquear o aceite: a implementacao tecnica ja foi comprovada por diff, codigo, suite automatizada e validacao tipada; o restante depende apenas de exercicio operacional externo ao agente.

## Decision log
- 2026-03-24 - Ticket aberto na triagem da spec para isolar o primeiro degrau funcional do onboarding readiness; sem `prepare` o runner nao consegue promover um alvo nao elegivel ao estado compativel com workflow completo.
- 2026-03-24 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO` com validacao manual externa pendente.

## Closure
- Closed at (UTC): 2026-03-24 21:36Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-03-24-target-prepare-controlled-onboarding-gap.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Checklist aplicado: releitura do diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion.
