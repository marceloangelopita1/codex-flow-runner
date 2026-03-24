# [TICKET] Falta readiness audit deterministico e versionado para `/target_checkup`

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
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
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01 (superficie `/target_checkup [<project-name>]`), RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18; CA-04, CA-05, CA-06.
- Inherited assumptions/defaults (when applicable): a validade do checkup e amarrada ao snapshot por SHA e expira em 30 dias; o v1 cobre obrigatoriamente integridade do preparo, operabilidade local, saude de validacao/entrega e governanca documental; `observabilidade` e opcional e nao bloqueante; IA/Codex no checkup so sintetiza fatos e nao pode inventar evidencia.
- Inherited RNFs (when applicable): manter fluxo sequencial; preservar o projeto alvo como fonte canonica dos artefatos versionados de readiness; coletar fatos de forma deterministica e barata antes da sintese por IA; distinguir operacionalmente rodada publicada de falha interna sem publicacao.
- Inherited technical/documentary constraints (when applicable): `/target_checkup` sem argumento usa o projeto ativo e com argumento opera sobre alvo explicito sem trocar o projeto ativo global; working tree inicial precisa estar limpo; o artefato canonico so e valido com `git status --porcelain` vazio, `HEAD` resolvido e branch registrada; os artefatos do checkup precisam registrar pelo menos `analyzed_head_sha`, `branch`, `working_tree_clean_at_start=true`, `started_at_utc`, `finished_at_utc` e `report_commit_sha` quando houver versionamento do proprio relatorio; gerar `.md` + `.json` em `docs/checkups/history/`; versionar artefato canonico por padrao mesmo quando o veredito geral for `invalid_for_gap_ticket_derivation`; nao transformar o checkup v1 em analise ampla de arquitetura/manutenibilidade do produto.
- Inherited pending/manual validations (when applicable): validar `target_checkup` em projeto preparado cujo veredito final seja `invalid_for_gap_ticket_derivation`, confirmando versionamento do relatorio mesmo assim; confirmar permissao real de `git push` nos repositorios alvo de teste usados por este fluxo.
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
- Justificativa objetiva (evidencias e impacto): prioridade manual P1 porque o checkup e o gate deterministico que separa preparo concluido de derivacao segura; sem ele nao existe readiness audit rastreavel nem artefato elegivel para `target_derive_gaps`.

## Context
- Workflow area: readiness audit do projeto alvo apos preparo e antes da materializacao de backlog.
- Scenario: operador precisa auditar snapshot limpo, coletar evidencias objetivas e versionar relatorio canonico mesmo quando o resultado for invalido para derivacao.
- Input constraints: o checkup nao pode depender de inferencia frouxa; precisa diferenciar falha interna do runner de rodada validamente publicada com veredito ruim.

## Problem statement
O runner nao possui `target_checkup`, nao gera artefatos canonicos de readiness em `docs/checkups/history/` e nao implementa o gate deterministico exigido pela spec para working tree limpo, integridade do preparo, coleta de evidencias e versionamento `md + json` ligado ao snapshot por SHA.

## Observed behavior
- O que foi observado: a busca por `target_checkup` em `src/` nao retorna implementacao; `src/types/flow-timing.ts` modela apenas fluxos `run-all` e `run-specs`; `src/integrations/workflow-trace-store.ts` restringe `sourceCommand` a `run-all`, `run-specs` e `run-ticket`; `src/integrations/telegram-bot.ts` nao registra comando de checkup; `src/integrations/git-client.ts` possui helper generico de versionamento, mas nao existe executor de readiness audit nem schema de artefato de checkup.
- Frequencia (unico, recorrente, intermitente): recorrente; a capacidade simplesmente nao existe.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/types/flow-timing.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/git-client.ts` e busca textual em `src/`.

## Expected behavior
`/target_checkup` deve operar sobre o projeto ativo ou sobre alvo explicito sem trocar o estado global, falhar cedo em working tree sujo, coletar fatos deterministas, sintetizar o readiness audit com IA apenas sobre fatos observados, gerar `.md` + `.json` em `docs/checkups/history/` com vereditos por dimensao e geral, versionar o resultado mesmo quando invalido para derivacao e deixar claro quando uma falha interna impediu a publicacao canonica.

## Reproduction steps
1. Buscar `target_checkup` em `src/` e confirmar a ausencia de implementacao.
2. Ler `src/integrations/telegram-bot.ts` e confirmar a ausencia do comando e de replies operacionais relacionados.
3. Ler `src/types/flow-timing.ts` e confirmar que nao existe tipo de resumo para checkup target.
4. Ler `src/integrations/workflow-trace-store.ts` e confirmar que o contrato de trace nao cobre checkup target.
5. Ler `src/integrations/git-client.ts` e confirmar que nao existe fluxo de versionamento amarrado a relatorio de readiness.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/types/flow-timing.ts`: nao existe `RunnerFlowSummary` para readiness checkup target.
  - `src/integrations/workflow-trace-store.ts`: traces canonicos atuais aceitam apenas `run-all`, `run-specs` e `run-ticket`.
  - `src/integrations/telegram-bot.ts`: help e handlers nao incluem `/target_checkup`.
  - `src/integrations/git-client.ts`: helper reutilizavel de commit/push existe, mas sem pipeline de audit.
- Comparativo antes/depois (se houver): antes = nao ha readiness audit nativo nem artefato versionado; depois esperado = checkup deterministico, artefatos canonicos `md + json` e gate claro para derivacao.

## Impact assessment
- Impacto funcional: o segundo comando da spec nao existe.
- Impacto operacional: o operador nao tem como saber, de forma auditavel, se um projeto preparado esta apto para derivar backlog readiness.
- Risco de regressao: alto, porque o fluxo combina preflight Git, execucao segura de comandos locais, schema de relatorio, sintese por IA e versionamento no projeto alvo.
- Scope estimado (quais fluxos podem ser afetados): `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/telegram-bot.ts`, novas integracoes para coleta/checkup/report, testes de fluxo e docs operacionais.

## Initial hypotheses (optional)
- A entrega segura combina um coletor deterministico de evidencias, um schema forte de relatorio `.md/.json`, e um gate que separa "rodada publicada com gaps" de "falha interna sem artefato canonico".

## Proposed solution (optional)
Nao obrigatorio. Direcao concreta: introduzir executor de `target_checkup` com preflight Git, coleta de fatos por dimensao, sintese controlada por IA, schema versionado de report, write-back em `docs/checkups/history/` e regras explicitas para versionar mesmo resultados invalidos para derivacao.

## Closure criteria
- Requisito/RF/CA coberto: RF-01 (comando `/target_checkup`), RF-10, RF-11; CA-04.
- Evidencia observavel: `/target_checkup` aceita projeto ativo por default e alvo explicito por argumento sem trocar o projeto ativo global; working tree sujo bloqueia o fluxo cedo, sem artefato canonico valido; testes automatizados cobrem sucesso por alvo explicito, sucesso por projeto ativo, tree sujo e erros de resolucao do alvo.
- Validacao de fechamento: `src/core/target-checkup.ts` resolve o projeto ativo sem argumento, usa `src/integrations/target-project-resolver.ts` para alvo explicito com `commandLabel` dedicado e bloqueia preflight sujo via `src/integrations/target-checkup-git-guard.ts` antes de qualquer write-back canonico; `src/core/runner.ts` preserva o projeto ativo global; `src/integrations/telegram-bot.ts` expoe `/target_checkup [projeto]`; `src/core/target-checkup.test.ts`, `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` cobrem sucesso com projeto ativo, sucesso com alvo explicito, dirty tree e replies observaveis; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-checkup.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/git-client.test.ts` passou em 2026-03-24 22:23Z com 466 testes aprovados.
- Requisito/RF/CA coberto: RF-12, RF-13, RF-14, RF-15, RF-16; CA-05.
- Evidencia observavel: o fluxo gera `docs/checkups/history/<timestamp>-project-readiness-checkup.md` e `.json` com `analyzed_head_sha`, `branch`, `working_tree_clean_at_start=true`, `started_at_utc`, `finished_at_utc`, `report_commit_sha` quando houver versionamento do proprio relatorio, vereditos por dimensao e veredito geral, registrando evidencias deterministicas e sintetizando risco/impacto sem inventar fatos; testes cobrem schema, dimensoes obrigatorias, captura de comando/exit code/duracao/resumos e proibe relatorio "valido" sem base deterministica.
- Validacao de fechamento: `src/types/target-checkup.ts` define schema, dimensoes obrigatorias, naming canonico e regras de validade por SHA/idade/drift; `src/core/target-checkup.ts` coleta evidencias nas dimensoes obrigatorias, limita a IA a sintese editorial via `prompts/14-target-checkup-readiness-audit.md`, escreve `md + json` em `docs/checkups/history/` e computa o veredito geral deterministicamente; `src/integrations/codex-client.ts` injeta apenas o payload factual serializado; `src/core/target-checkup.test.ts` valida schema, dimensoes, captura de comandos e caso `valid_for_gap_ticket_derivation`; `src/integrations/codex-client.test.ts` confirma a injecao do payload factual e dos caminhos de artefato; `README.md` e `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md` foram atualizados no mesmo changeset; `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` passou em 2026-03-24 22:23Z sem erros de TypeScript.
- Requisito/RF/CA coberto: RF-17, RF-18; CA-05, CA-06.
- Evidencia observavel: rodadas concluídas operacionalmente versionam os artefatos canonicos mesmo quando o veredito final e `invalid_for_gap_ticket_derivation`; quando houver versionamento do relatorio, o artefato publicado registra `report_commit_sha`, e o preflight limpo fica observavel por `working_tree_clean_at_start=true`; falha interna nao publica artefato canonico e devolve mensagem distinguindo rodada nao publicada de rodada publicada invalida; testes cobrem versao invalida-ainda-versionada, falha interna sem publicacao e regras de validade por SHA/idade/drift; a validacao manual herdada confirma o caso `invalid_for_gap_ticket_derivation` e permissao real de `git push`.
- Validacao de fechamento: `src/integrations/git-client.ts` publica o checkup em duas fases para registrar `report_commit_sha` pela convencao documentada; `src/integrations/git-client.test.ts` valida a fronteira de commit/push em duas fases; `src/core/target-checkup.test.ts` cobre `invalid_for_gap_ticket_derivation` ainda versionado, falha antes da publicacao quando um comando muta o repo e validacao de idade/drift/cadeia do `report_commit_sha`; o fluxo tecnico foi revalidado em diff/codigo/testes e restaram apenas os smokes manuais externos herdados pela spec.

## Manual validation pending
- Entrega tecnica concluida: sim. O recorte funcional e documental deste ticket esta implementado, revalidado contra o ExecPlan e coberto por testes automatizados locais.
- Validacoes manuais externas ainda necessarias:
  - Exercitar `/target_checkup` via Telegram em repositorio preparado real cujo veredito final seja `invalid_for_gap_ticket_derivation` e confirmar que o par canonico `md + json` foi publicado mesmo assim.
  - Confirmar permissao real de `git push` no remoto dos repositorios alvo de teste usados pelo fluxo.
- Como executar a validacao manual:
  - Preparar um repo de smoke em `/home/mapita/projetos` com `target_prepare` ja concluido e um caso controlado que mantenha o veredito geral invalido para derivacao.
  - Iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`.
  - Acionar `/target_checkup` no chat Telegram autorizado, depois inspecionar `git status --porcelain`, `git log -1 --stat` e os artefatos em `docs/checkups/history/` no repo alvo.
- Responsavel operacional pela validacao manual: operador do runner com acesso ao chat Telegram autorizado, aos repositorios Git de teste e a um remoto com permissao real de `git push`.
- Motivo para nao bloquear o aceite: a entrega tecnica ja foi comprovada por diff, codigo, suite automatizada e typecheck; o restante depende apenas de exercicio operacional externo ao agente.

## Decision log
- 2026-03-24 - Ticket aberto na triagem da spec para isolar o gate funcional entre `prepare` e `derive`; sem checkup versionado o backlog de readiness ficaria sem base canonica para materializacao.
- 2026-03-24 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO` com validacao manual externa pendente.

## Closure
- Closed at (UTC): 2026-03-24 22:23Z
- Closure reason: fixed
- Related PR/commit/execplan: ExecPlan `execplans/2026-03-24-target-checkup-readiness-audit-gap.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Resultado final do fechamento: `GO` (validacao manual externa pendente)
- Checklist aplicado: releitura do diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion.
