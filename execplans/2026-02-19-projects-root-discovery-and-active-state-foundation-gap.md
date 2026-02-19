# ExecPlan - Fundacao multi-projeto com PROJECTS_ROOT_PATH, descoberta e projeto ativo persistido

## Purpose / Big Picture
- Objetivo: implementar a fundacao multi-projeto do runner para atender RF-01, RF-02, RF-03, RF-04, RF-05, RF-06 e RF-13 da spec `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`.
- Resultado esperado:
  - `PROJECTS_ROOT_PATH` passa a ser obrigatorio no bootstrap.
  - O runner descobre projetos elegiveis no primeiro nivel de `PROJECTS_ROOT_PATH`, com criterio estrito (`.git` + `tickets/open`).
  - O runner garante exatamente um projeto ativo global quando houver projetos elegiveis.
  - O projeto ativo e persistido em storage local sem dados sensiveis e restaurado no restart.
  - Quando o estado persistido estiver invalido, o bootstrap aplica fallback deterministico para o primeiro projeto elegivel em ordem alfabetica.
  - `codex-flow-runner` entra na lista quando cumprir os criterios.
  - `main.ts` deixa de depender de `REPO_PATH` e passa a inicializar `queue`, `codex` e `git` com o caminho do projeto ativo resolvido.
- Escopo:
  - Migracao de contrato de ambiente (`REPO_PATH` -> `PROJECTS_ROOT_PATH`) em `src/config/env.ts`.
  - Nova camada de descoberta/elegibilidade de projetos baseada em filesystem local.
  - Nova camada de persistencia/restauracao de projeto ativo global.
  - Wiring de bootstrap para resolver projeto ativo antes de instanciar integracoes por repositorio.
  - Cobertura automatizada dos cenarios de configuracao obrigatoria e restauracao/fallback.
  - Atualizacao de `README.md` e status da spec.
- Fora de escopo:
  - Comandos Telegram de selecao/paginacao (`/projects`, `/select-project`) e callbacks inline (ticket separado).
  - Troca dinamica de projeto durante rodada em execucao (`isRunning=true`) e UX associada (ticket separado).
  - Propagacao de contexto do projeto ativo para `/status` e resumo final por ticket (ticket separado).
  - Paralelizacao de tickets ou multiplos projetos por rodada.

## Progress
- [x] 2026-02-19 17:34Z - Planejamento inicial concluido com leitura integral do ticket e referencias (`PLANS.md`, spec, `env.ts`, `main.ts`, `README.md`).
- [x] 2026-02-19 17:37Z - Contrato de ambiente migrado para `PROJECTS_ROOT_PATH` obrigatorio sem fallback para `REPO_PATH`.
- [x] 2026-02-19 17:38Z - Descoberta de projetos elegiveis e persistencia/restauracao do projeto ativo implementadas com testes.
- [x] 2026-02-19 17:38Z - Bootstrap refatorado para inicializar integracoes no projeto ativo resolvido.
- [x] 2026-02-19 17:40Z - Documentacao (`README` + spec) atualizada e validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 17:34Z - `src/config/env.ts` ainda define `REPO_PATH` opcional com default em `process.cwd()`, sem qualquer exigencia de `PROJECTS_ROOT_PATH`.
- 2026-02-19 17:34Z - `src/main.ts` instancia `FileSystemTicketQueue`, `CodexCliTicketFlowClient` e `GitCliVersioning` uma unica vez com `env.REPO_PATH`.
- 2026-02-19 17:34Z - Nao existe modulo dedicado para descoberta de projetos validos nem store de projeto ativo persistido.
- 2026-02-19 17:34Z - `README.md` ainda documenta `REPO_PATH`, entao a migracao exige atualizacao explicita de contrato operacional.
- 2026-02-19 17:34Z - A camada `TicketRunner` ja e agnostica ao caminho do repositorio; o acoplamento de repo unico esta concentrado no bootstrap/composicao.
- 2026-02-19 17:38Z - A validacao de elegibilidade precisou considerar `.git` como metadata existente (arquivo ou diretorio) para evitar falso negativo em repositorios com layout alternativo.

## Decision Log
- 2026-02-19 - Decisao: migracao com quebra direta para `PROJECTS_ROOT_PATH` obrigatorio, sem compatibilidade com `REPO_PATH`.
  - Motivo: exigencia explicita de RF-01 e nao-escopo de compatibilidade na spec.
  - Impacto: `loadEnv`, testes e documentacao operacional precisam ser atualizados de forma coordenada.
- 2026-02-19 - Decisao: usar criterio de elegibilidade estrito no primeiro nivel (`.git` + `tickets/open`) para evitar selecao de diretorios nao executaveis.
  - Motivo: RF-02/RF-03 e mitigacao de risco operacional da spec.
  - Impacto: descoberta precisa ignorar entradas invalidas e ordenar resultados deterministicamente.
- 2026-02-19 - Decisao: persistir estado global em arquivo local sob `PROJECTS_ROOT_PATH/.codex-flow-runner/active-project.json` contendo apenas metadados nao sensiveis (`name`, `path`, `updatedAt`).
  - Motivo: RF-05 pede persistencia entre restart, e o ticket restringe armazenamento de dados sensiveis.
  - Impacto: criar integracao de store com leitura tolerante a estado corrompido e escrita atomica.
- 2026-02-19 - Decisao: quando nao houver nenhum projeto elegivel, bootstrap falha cedo com erro claro.
  - Motivo: nao existe projeto ativo possivel para cumprir RF-04; falha explicita evita operar em alvo incorreto.
  - Impacto: adicionar cobertura de erro no resolver de projeto ativo e mensagem operacional objetiva.
- 2026-02-19 - Decisao: modelar leitura do estado persistido com resultado discriminado (`missing` | `loaded` | `invalid`) em vez de excecao para arquivo invalido.
  - Motivo: permitir fallback seguro com rastreabilidade de motivo sem derrubar bootstrap em caso de state file corrompido.
  - Impacto: `active-project-resolver` consegue diferenciar fallback por ausencia, estado invalido ou estado stale.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - Migracao de contrato de ambiente para `PROJECTS_ROOT_PATH` foi isolada e validada por teste dedicado de config.
  - Descoberta, persistencia e restauracao de projeto ativo ficaram desacopladas em modulos especificos com cobertura automatizada.
  - Bootstrap passou a resolver projeto ativo antes das integracoes de repositorio, preservando o fluxo sequencial existente do runner.
  - Validacao final completa ficou verde (`npm test`, `npm run check`, `npm run build`).
- O que ficou pendente:
  - Fechamento operacional do ticket (mover para `tickets/closed/` + commit/push) em etapa separada.
  - Comandos Telegram de selecao/paginacao de projeto e bloqueio de troca durante execucao (ticket separado).
  - Propagacao do contexto de projeto ativo em `/status` e resumo final por ticket (ticket separado).
- Proximos passos: executar o prompt de fechamento de ticket quando desejado e seguir para os tickets dependentes de selecao/observabilidade multi-projeto.

## Context and Orientation
- Arquivos principais de referencia:
  - `src/config/env.ts` - contrato de ambiente atual (ainda baseado em `REPO_PATH`).
  - `src/main.ts` - bootstrap que hoje fixa um unico `repoPath`.
  - `README.md` - contrato operacional atual documentado para variaveis de ambiente.
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md` - requisitos RF-01..RF-13 e CA-01..CA-10.
- Superficies que provavelmente serao criadas/evoluidas:
  - `src/core/active-project-resolver.ts` (regra de negocio para restaurar/fallback de projeto ativo).
  - `src/integrations/project-discovery.ts` (descoberta de projetos elegiveis no filesystem).
  - `src/integrations/active-project-store.ts` (persistencia/restauracao de estado global).
  - `src/config/env.ts` e `src/main.ts` (migracao de bootstrap e composicao).
  - Testes dedicados para env/resolver/integracoes de descoberta+store.
- Restricoes tecnicas:
  - Fluxo sequencial por ticket deve permanecer inalterado.
  - Node.js 20+ com TypeScript ESM.
  - Evitar dependencias novas; usar `node:fs` e `node:path`.
  - Nenhum segredo no estado persistido.

## Plan of Work
- Milestone 1 - Contrato de ambiente e modelo base de projeto ativo
  - Entregavel: `PROJECTS_ROOT_PATH` obrigatorio no `AppEnv`, remocao de `REPO_PATH` e tipos/base de dominio para projeto elegivel/ativo.
  - Evidencia de conclusao: testes de `loadEnv` cobrindo erro sem `PROJECTS_ROOT_PATH` (CA-01) e parse valido com raiz configurada.
  - Arquivos esperados: `src/config/env.ts`, `src/config/env.test.ts` (novo), possivel arquivo de tipos em `src/types/`.
- Milestone 2 - Descoberta e elegibilidade de projetos no primeiro nivel
  - Entregavel: integracao de discovery que lista somente diretorios elegiveis (`.git` + `tickets/open`) em ordem alfabetica, incluindo `codex-flow-runner` quando elegivel.
  - Evidencia de conclusao: testes de discovery com fixtures temporarias validando filtros e ordenacao deterministica.
  - Arquivos esperados: `src/integrations/project-discovery.ts` (novo), `src/integrations/project-discovery.test.ts` (novo).
- Milestone 3 - Persistencia/restauracao de projeto ativo com fallback
  - Entregavel: store em arquivo local + resolver de regra para:
    - restaurar projeto persistido quando ainda valido;
    - aplicar fallback para o primeiro elegivel quando estado salvo nao for valido;
    - persistir o projeto efetivamente escolhido.
  - Evidencia de conclusao: testes cobrindo RF-05/RF-06 e CA-06 (restauracao apos restart e fallback alfabetico em estado invalido).
  - Arquivos esperados: `src/integrations/active-project-store.ts` (novo), `src/integrations/active-project-store.test.ts` (novo), `src/core/active-project-resolver.ts` (novo), `src/core/active-project-resolver.test.ts` (novo).
- Milestone 4 - Wiring do bootstrap para usar projeto ativo global
  - Entregavel: `main.ts` resolve projeto ativo antes de inicializar queue/codex/git, e loga contexto de root/projeto ativo com motivo da escolha (restaurado/fallback).
  - Evidencia de conclusao: teste(s) do resolver/bootstrap garantindo repoPath ativo correto; execucao manual controlada confirma logs de bootstrap.
  - Arquivos esperados: `src/main.ts`, possivel `src/main.test.ts` (novo) ou testes focados em `active-project-resolver`.
- Milestone 5 - Documentacao e rastreabilidade de atendimento
  - Entregavel: `README.md` atualizado com `PROJECTS_ROOT_PATH` e fluxo de descoberta/projeto ativo; spec atualizada no bloco "Status de atendimento" para RF-01..RF-06/RF-13 e evidencias de CA-01/CA-06.
  - Evidencia de conclusao: diff objetivo de docs e comandos de validacao completos verdes.
  - Arquivos esperados: `README.md`, `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes da migracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "REPO_PATH|PROJECTS_ROOT_PATH|loadEnv|FileSystemTicketQueue\(|CodexCliTicketFlowClient\(|GitCliVersioning\(" src README.md docs/specs/2026-02-19-telegram-multi-project-active-selection.md` para mapear pontos de contrato.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/config/env.ts` para remover `REPO_PATH`, exigir `PROJECTS_ROOT_PATH` e manter validacoes atuais de Telegram/polling.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/config/env.test.ts` com cenarios: ausencia de `PROJECTS_ROOT_PATH` falha com erro claro (CA-01), configuracao valida retorna raiz configurada.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/integrations/project-discovery.ts` para varrer somente o primeiro nivel de `PROJECTS_ROOT_PATH`, validar criterio `.git` + `tickets/open` e ordenar por nome (`localeCompare`).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/integrations/project-discovery.test.ts` com repos temporarios para provar filtro de elegibilidade, ordenacao alfabetica e inclusao de `codex-flow-runner` quando elegivel.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/integrations/active-project-store.ts` com leitura/escrita do arquivo `PROJECTS_ROOT_PATH/.codex-flow-runner/active-project.json`, tolerando arquivo ausente/corrompido.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/integrations/active-project-store.test.ts` cobrindo persistencia idempotente, restauracao e tratamento seguro de estado invalido.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/core/active-project-resolver.ts` para decidir projeto ativo (restaura valido, senao fallback alfabetico, e persiste resultado) e falhar cedo sem elegiveis.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar `src/core/active-project-resolver.test.ts` cobrindo RF-04/RF-05/RF-06/RF-13 e CA-06.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/main.ts` para usar o resolver antes de instanciar `FileSystemTicketQueue`, `CodexCliTicketFlowClient` e `GitCliVersioning`, mantendo fluxo sequencial do runner.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` removendo `REPO_PATH`, documentando `PROJECTS_ROOT_PATH` obrigatorio, criterios de elegibilidade e comportamento de restauracao/fallback.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-multi-project-active-selection.md` no bloco "Status de atendimento" com itens atendidos e evidencias de CA-01/CA-06 apos validacao.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/config/env.test.ts src/integrations/project-discovery.test.ts src/integrations/active-project-store.test.ts src/core/active-project-resolver.test.ts` para validacao focada da fundacao multi-projeto.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/config/env.ts src/main.ts src/config/env.test.ts src/integrations/project-discovery.ts src/integrations/project-discovery.test.ts src/integrations/active-project-store.ts src/integrations/active-project-store.test.ts src/core/active-project-resolver.ts src/core/active-project-resolver.test.ts README.md docs/specs/2026-02-19-telegram-multi-project-active-selection.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/config/env.test.ts`
  - Esperado: sem `PROJECTS_ROOT_PATH` ocorre erro de configuracao obrigatoria com mensagem clara (CA-01); com valor valido, parse de ambiente e bem-sucedido.
- Comando: `npx tsx --test src/integrations/project-discovery.test.ts`
  - Esperado: somente diretorios com `.git` + `tickets/open` sao listados; ordem alfabetica no primeiro nivel e preservada.
- Comando: `npx tsx --test src/integrations/active-project-store.test.ts src/core/active-project-resolver.test.ts`
  - Esperado: projeto ativo e restaurado apos restart quando valido; estado invalido aciona fallback para primeiro elegivel e novo persist (CA-06).
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao dos fluxos sequenciais existentes.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem sem erros e build concluido.
- Comando: `rg -n "PROJECTS_ROOT_PATH|RF-01|RF-06|RF-13|CA-01|CA-06" README.md docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - Esperado: documentacao e spec refletem novo contrato e evidencias de atendimento do ticket.

## Idempotence and Recovery
- Idempotencia:
  - Reexecutar discovery nao altera estado persistido quando o projeto ativo atual continua valido.
  - Reexecutar resolver com mesmo conjunto elegivel mantem projeto ativo estavel (sem churn de selecao).
  - Reexecutar testes/comandos de validacao nao produz efeito colateral persistente alem de artefatos temporarios de teste.
- Riscos:
  - Migracao quebrar inicializacao local de quem ainda usa apenas `REPO_PATH` em `.env`.
  - Descoberta incluir diretorio invalido por validacao incompleta de elegibilidade.
  - Estado persistido corrompido causar escolha indevida se parser nao for defensivo.
  - Nenhum projeto elegivel disponivel apos boot em ambiente novo.
- Recovery / Rollback:
  - Implementar migracao em passos pequenos (env -> discovery -> store -> resolver -> main) com testes por milestone.
  - Em falha por `.env` desatualizado, erro deve instruir explicitamente uso de `PROJECTS_ROOT_PATH`.
  - Se state file estiver invalido, ignorar restore, logar motivo e reescrever com fallback alfabetico.
  - Se nao houver elegiveis, abortar bootstrap com erro claro e sem iniciar runner (fail-fast seguro).

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-projects-root-discovery-and-active-state-foundation-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`.
- Tickets relacionados (fora de escopo deste plano):
  - `tickets/open/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md`
  - `tickets/open/2026-02-19-active-project-context-in-runner-status-and-final-summary-gap.md`
- Artefatos esperados de evidencia:
  - Diff dos arquivos de config/bootstrap/discovery/store/resolver e testes.
  - Saidas dos comandos de teste, typecheck e build.
  - Trechos de log de bootstrap indicando `projectsRoot`, projeto ativo escolhido e motivo da escolha (restore/fallback).

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/config/env.ts` (`AppEnv`) passa a expor `PROJECTS_ROOT_PATH` obrigatorio e remove `REPO_PATH`.
  - Novas interfaces de descoberta e persistencia de projeto ativo (`src/integrations/*`).
  - Nova interface/contrato de resolucao de projeto ativo no core (`src/core/active-project-resolver.ts`).
  - `src/main.ts` deixa de receber `repoPath` fixo de env e passa a consumir projeto ativo resolvido.
- Compatibilidade:
  - Quebra intencional de contrato de ambiente (sem fallback para `REPO_PATH`).
  - Fluxo sequencial por ticket permanece igual apos bootstrap, mudando apenas a origem do `repoPath`.
  - Tickets de comandos Telegram e propagacao de contexto continuam dependentes desta fundacao.
- Dependencias externas e mocks:
  - Sem novas bibliotecas; usar apenas APIs Node (`fs`, `path`, `os`) e `zod` ja existente.
  - Testes usam diretorios temporarios locais e doubles para evitar I/O de rede.
