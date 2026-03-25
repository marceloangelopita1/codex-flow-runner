# [TICKET] Falta revisao editorial rastreavel nas fontes copy-exact propagadas por `/target_prepare`

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-25 16:36Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md
- Source spec canonical path (when applicable): docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-02, RF-06, RF-07, RF-08, RF-09, RF-10; CA-01, CA-02, CA-06; restricoes tecnicas/documentais de preservar o contrato atual do `target_prepare`, a semantica operacional das documentacoes revisadas e o escopo limitado as superficies efetivamente propagadas.
- Inherited assumptions/defaults (when applicable): a dor relatada justifica correcao editorial com impacto funcional indireto mesmo sem migracao retroativa ampla; o foco principal sao as fontes de verdade documentais que o runner replica para outros repositorios; se surgir nova superficie `copy-exact` durante a execucao, ela entra automaticamente no escopo; a revisao deve preferir ajustes pequenos e seguros por superficie.
- Inherited RNFs (when applicable): usar portugues correto com acentuacao adequada e coerencia terminologica com `DOCUMENTATION.md`; evitar retrabalho e preservar qualidade por token; nao introduzir regressao de significado operacional nas documentacoes revisadas.
- Inherited technical/documentary constraints (when applicable): preservar fluxo sequencial e o contrato atual do `target_prepare`; manter `TARGET_PREPARE_EXACT_COPY_SOURCES` como inventario fonte de verdade das superficies `copy-exact`; nao ampliar a mudanca para revisao editorial ampla do repositorio fora das superficies propagadas; nao exigir migracao retroativa em massa de material historico fora do conjunto propagado.
- Inherited pending/manual validations (when applicable): revisar diff textual completo de cada superficie `copy-exact` em escopo para confirmar correcao editorial sem drift semantico; rodar smoke de `/target_prepare` em repositorio descartavel e revisar manualmente os arquivos propagados no alvo; confirmar no smoke manual que o bloco gerenciado de `AGENTS.md` continua legivel e sem conflito com conteudo preexistente relevante do projeto alvo, a partir de `docs/workflows/target-prepare-managed-agents-section.md`; confirmar no smoke manual que o bloco gerenciado de `README.md` continua claro para operadores humanos no projeto externo, a partir de `docs/workflows/target-prepare-managed-readme-section.md`; revisar se a correcao editorial do repositorio base elimina a principal classe de erro relatada: perda de acentuacao ao propagar documentacao.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - DOCUMENTATION.md
  - SPECS.md
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md
  - docs/workflows/codex-quality-gates.md
  - execplans/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md
  - src/types/target-prepare.ts
  - docs/workflows/target-prepare-managed-agents-section.md
  - docs/workflows/target-prepare-managed-readme-section.md
  - EXTERNAL_PROMPTS.md
  - PLANS.md
  - docs/specs/README.md
  - docs/specs/templates/spec-template.md
  - docs/workflows/discover-spec.md
  - docs/workflows/target-project-compatibility-contract.md
  - docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): `TARGET_PREPARE_EXACT_COPY_SOURCES` replica estas fontes diretamente para projetos alvo. Enquanto `SPECS.md`, `PLANS.md`, `INTERNAL_TICKETS.md`, `EXTERNAL_PROMPTS.md`, `docs/specs/templates/spec-template.md` e trechos de `docs/workflows/discover-spec.md` permanecerem com redacao inconsistente, todo `/target_prepare` continua propagando o problema cross-repo.

## Context
- Workflow area: `target_prepare` -> superficies `copy-exact` sincronizadas para projetos alvo.
- Scenario: o inventario tecnico de `copy-exact` ja esta definido em `src/types/target-prepare.ts`, mas parte relevante dessas fontes ainda mistura portugues correto com trechos sem acentuacao ou com redacao editorial inconsistente.
- Input constraints: corrigir apenas o conjunto propagado por `TARGET_PREPARE_EXACT_COPY_SOURCES`, manter os mesmos paths, headings canonicos e semantica operacional, e deixar explicito no change trail quais superficies foram revisadas.

## Problem statement
O runner ja sabe exatamente quais documentos canonicamente entram no modo `copy-exact`, mas varias dessas fontes ainda carregam redacao inconsistente com `DOCUMENTATION.md`. Como `/target_prepare` replica o arquivo-fonte literalmente para o repositorio alvo, o problema editorial do repositorio base vira problema operacional em todos os alvos preparados.

## Observed behavior
- O que foi observado: `src/types/target-prepare.ts` lista oito superficies `copy-exact`, mas varias fontes ainda exibem termos como `obrigatorio`, `esta`, `nao`, `validacao` e `historico` sem acentuacao em contexto editorial; exemplos objetivos aparecem em `SPECS.md`, `PLANS.md`, `EXTERNAL_PROMPTS.md`, `docs/specs/templates/spec-template.md` e no exemplo textual de `docs/workflows/discover-spec.md`.
- Frequencia (unico, recorrente, intermitente): recorrente em todo `/target_prepare` bem-sucedido que sincroniza as fontes `copy-exact`.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/types/target-prepare.ts` e das fontes listadas em `TARGET_PREPARE_EXACT_COPY_SOURCES`.

## Expected behavior
Todas as superficies `copy-exact` listadas pelo contrato atual devem ficar explicitamente revisadas e rastreaveis na trilha da mudanca: arquivos que ainda propagam erro editorial devem ser corrigidos, arquivos ja adequados devem ser revalidados sem alteracao desnecessaria, e o resultado final deve manter o mesmo contrato operacional enquanto deixa de espalhar perda de acentuacao para os projetos alvo.

## Reproduction steps
1. Ler `src/types/target-prepare.ts` e confirmar o inventario atual de `TARGET_PREPARE_EXACT_COPY_SOURCES`.
2. Abrir as fontes listadas e observar ocorrencias editoriais como `criacao/manutencao`, `ExecPlan e obrigatorio`, `Comportamento obrigatorio`, `esta/estao`, `validacao`, `historico` e `repositorio` sem acentuacao onde o proprio `DOCUMENTATION.md` exige portugues correto.
3. Considerar que `/target_prepare` copia essas superficies por igualdade literal (`exact-match`) para o projeto alvo e, portanto, repropaga o texto com o mesmo problema.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/types/target-prepare.ts`: `TARGET_PREPARE_EXACT_COPY_SOURCES` enumera `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`, `docs/specs/README.md`, `docs/specs/templates/spec-template.md`, `docs/workflows/discover-spec.md` e `docs/workflows/target-project-compatibility-contract.md`.
  - `EXTERNAL_PROMPTS.md`: linhas com `Comportamento obrigatorio`, `esta`, `sensiveis`, `recomendacao` e `edicao`.
  - `PLANS.md`: linhas com `ExecPlan e obrigatorio`, `validacao observavel`, `esta auto-contido` e `estao claros`.
  - `SPECS.md`: linhas com `criacao`, `esta atendida`, `obrigatorio`, `validacao` e `historico`.
  - `docs/specs/templates/spec-template.md`: o template ainda propaga varios headings e notas operacionais sem acentuacao.
  - `docs/workflows/discover-spec.md`: o exemplo de prompt ainda traz `repositorio` sem acento.
- Comparativo antes/depois (se houver): antes = parte das fontes `copy-exact` replica redacao inconsistente; depois esperado = o conjunto propagado fica editorialmente correto, mantendo exatamente o mesmo contrato funcional.

## Impact assessment
- Impacto funcional: a documentacao canonica entregue em projetos alvo continua divergindo da politica de `DOCUMENTATION.md`.
- Impacto operacional: cada onboarding bem-sucedido espalha retrabalho editorial para outros repositorios e dificulta futuras revisoes canonicamente corretas.
- Risco de regressao: medio, porque o modo `copy-exact` exige preservar o mesmo comportamento documental, headings e paths enquanto corrige o texto.
- Scope estimado (quais fluxos podem ser afetados): `src/types/target-prepare.ts` apenas como fonte de inventario/validacao, as oito fontes `copy-exact`, a spec de origem e possiveis testes/docs que dependam literalmente desses textos.

## Initial hypotheses (optional)
- A menor entrega segura e revisar o inventario `copy-exact` superficie por superficie, deixando registrado no ticket/spec quais arquivos exigiram ajuste editorial e quais foram apenas revalidados sem mudanca.

## Proposed solution (optional)
- Corrigir editorialmente as fontes `copy-exact` que ainda propagam erro, preservar o inventario tecnico atual em `TARGET_PREPARE_EXACT_COPY_SOURCES` e atualizar a trilha documental da spec/ticket para deixar explicito que esse conjunto e propagacao-critico para futuras revisoes.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-02, RF-08; CA-01, CA-02.
- Evidencia observavel: o inventario de `TARGET_PREPARE_EXACT_COPY_SOURCES` continua cobrindo as mesmas oito superficies e a trilha da mudanca identifica explicitamente cada uma delas como revisada ou revalidada; nenhum arquivo `copy-exact` relevante fica de fora do pacote.
- Requisito/RF/CA coberto: RF-06, RF-07, RF-09.
- Evidencia observavel: as fontes `copy-exact` em escopo passam a usar portugues correto e acentuacao adequada, mantendo headings canonicos, paths, contratos operacionais e sentido original; o diff permanece restrito as superficies propagadas e a rastreabilidade documental da spec/ticket.
- Requisito/RF/CA coberto: RF-10; CA-06, com validacoes manuais herdadas de RF-03; CA-03.
- Evidencia observavel: apos a mudanca, um smoke manual de `/target_prepare` em repositorio descartavel mostra que os arquivos `copy-exact` propagados no alvo recebem as versoes editoriais corrigidas, a revisao manual dos diffs confirma ausencia de drift semantico, o bloco gerenciado de `AGENTS.md` permanece legivel e sem conflito com conteudo preexistente relevante e o bloco gerenciado de `README.md` continua claro para operadores humanos no alvo.

## Decision log
- 2026-03-25 - Ticket aberto na triagem da spec porque o problema mais amplo de propagacao editorial esta concentrado primeiro nas fontes `copy-exact`, que sao replicadas literalmente para qualquer projeto preparado.
- 2026-03-25 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md`; o resultado final ficou `GO` porque os tres closure criteria foram confirmados com evidencia objetiva e nao restou gap tecnico/funcional neste recorte.

## Closure
- Closed at (UTC): 2026-03-25 17:27Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
  - PR: N/A
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Resultado final do fechamento: `GO`
- Checklist aplicado: releitura do diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion antes da decisao final.
- Evidencia objetiva por closure criterion:
  - `RF-01`, `RF-02`, `RF-08`, `CA-01`, `CA-02`: `src/types/target-prepare.ts` continua listando exatamente as mesmas oito superficies em `TARGET_PREPARE_EXACT_COPY_SOURCES`; a classificacao por superficie ficou registrada no ExecPlan (`sete editadas`, `uma revalidada sem diff`); `git diff --name-only` no runner mostrou alteracoes apenas em `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`, `docs/specs/README.md`, `docs/specs/templates/spec-template.md`, `docs/workflows/discover-spec.md` e na trilha documental da spec, sem superifice `copy-exact` relevante fora do pacote.
  - `RF-06`, `RF-07`, `RF-09`: `git diff --word-diff -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md` confirmou apenas correcoes editoriais e pequenos ajustes seguros de coerencia, preservando paths, headings canonicos e contrato operacional; `docs/workflows/target-project-compatibility-contract.md` foi explicitamente revalidado sem necessidade de diff.
  - `RF-10`, `CA-06`, com validacoes manuais herdadas de `RF-03` e `CA-03`: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts` passou com `514` testes e `0` falhas; o smoke no repo `/home/mapita/projetos/target-prepare-copy-exact-smoke` confirmou `cmp` sem mismatch nas oito fontes `copy-exact`, commit preparado `cff30685c9c56067108dc2e80789db245194e5ca` e markers/legibilidade positivos dos blocos gerenciados em `AGENTS.md` e `README.md`.
- Entrega tecnica concluida:
  - sete superficies `copy-exact` receberam correcao editorial segura;
  - `docs/workflows/target-project-compatibility-contract.md` foi revalidado sem diff;
  - a spec e o ExecPlan registraram explicitamente quais superficies foram revisadas ou apenas revalidadas.
- Validacoes executadas:
  - `rg -n 'targetPath: "(EXTERNAL_PROMPTS.md|INTERNAL_TICKETS.md|PLANS.md|SPECS.md|docs/specs/README.md|docs/specs/templates/spec-template.md|docs/workflows/discover-spec.md|docs/workflows/target-project-compatibility-contract.md)"' src/types/target-prepare.ts`
  - `git diff --name-only`
  - `git diff --word-diff -- EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-prepare.test.ts`
  - `for f in EXTERNAL_PROMPTS.md INTERNAL_TICKETS.md PLANS.md SPECS.md docs/specs/README.md docs/specs/templates/spec-template.md docs/workflows/discover-spec.md docs/workflows/target-project-compatibility-contract.md; do cmp -s "/home/mapita/projetos/codex-flow-runner/$f" "/home/mapita/projetos/target-prepare-copy-exact-smoke/$f" || echo "mismatch: $f"; done`
  - `git -C /home/mapita/projetos/target-prepare-copy-exact-smoke show --stat --name-only --format=fuller HEAD`
  - `rg -n 'codex-flow-runner:target-prepare-managed-(agents|readme):(start|end)' /home/mapita/projetos/target-prepare-copy-exact-smoke/AGENTS.md /home/mapita/projetos/target-prepare-copy-exact-smoke/README.md`
- Validacao manual externa pendente: nao.
