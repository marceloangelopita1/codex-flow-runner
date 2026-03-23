# [TICKET] Explicitar a barra minima documental do ticket sistemico automatico

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P2
- Severity: S2
- Created at (UTC): 2026-03-23 02:58Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable):
- Active project (when applicable):
- Target repository (when applicable):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
- Source spec canonical path (when applicable): docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-18, RF-21; CA-10
- Inherited assumptions/defaults (when applicable): alinhamentos canonicos e de template nao exigem migracao retroativa em massa; material historico so precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real.
- Inherited RNFs (when applicable): a documentacao precisa tornar a qualidade minima do ticket automatico clara o bastante para outra IA executar o fluxo sem inferencias ocultas.
- Inherited technical/documentary constraints (when applicable): preservar a optionalidade de `Proposed solution` no template geral, nao incluir segredos/dados sensiveis, manter a compatibilidade com o checklist compartilhado de `docs/workflows/codex-quality-gates.md` e nao reescrever retroativamente tickets historicos ja fechados.
- Inherited pending/manual validations (when applicable): nenhuma; as validacoes runtime/manuais desta spec foram herdadas pelos tickets de contrato e renderizacao porque este pacote altera apenas documentacao canonica e template.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a - derivacao pre-implementacao desta spec
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md
  - docs/workflows/codex-quality-gates.md
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md
  - execplans/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a documentacao atual ja exige contexto, evidencia e criterios observaveis em tickets gerais, mas ainda nao explicita a barra minima especifica para tickets automaticos oriundos de retrospectiva sistemica. Sem esse contrato documental, o comportamento pode voltar a derivar para tickets genericos mesmo apos a implementacao tecnica.

## Context
- Workflow area: documentacao canonica de tickets internos e checklist de qualidade compartilhado
- Scenario: a spec exige explicitar, na documentacao canonica, a barra minima de qualidade para tickets automaticos de retrospectiva sistemica.
- Input constraints: manter o template geral reutilizavel para tickets internos em geral, sem obrigar migracao retroativa em massa.

## Problem statement
`INTERNAL_TICKETS.md` e `tickets/templates/internal-ticket-template.md` cobrem bem o ticket interno generico, mas nao deixam explicito o padrao editorial minimo exigido quando o ticket nasce automaticamente de retrospectiva sistemica. O checklist `docs/workflows/codex-quality-gates.md` tambem nao fecha sozinho esse contrato documental, porque trata mais do processo de triagem/execucao do que da superficie final do ticket automatico publicado.

## Observed behavior
- O que foi observado:
  - `INTERNAL_TICKETS.md` descreve barra minima generica para tickets internos e causa-raiz para retrospectivas, sem uma secao dedicada ao ticket automatico sistemico.
  - `tickets/templates/internal-ticket-template.md` oferece seções adequadas, mas nao orienta explicitamente titulo orientado ao problema, contexto filtrado, ausencia de redundancia evitavel, proposta de remediacao concreta e closure criteria por superficie para tickets automaticos de retrospectiva.
  - `docs/workflows/codex-quality-gates.md` menciona o que deve ser carregado para tickets derivados, mas nao fixa a barra minima editorial do ticket sistemico automatico publicado.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura documental direta dos tres arquivos citados pela spec.

## Expected behavior
A documentacao canonica deve explicitar a barra minima de qualidade para tickets automaticos de retrospectiva sistemica, cobrindo pelo menos titulo orientado ao problema, contexto filtrado, ausencia de redundancia evitavel, proposta de remediacao concreta, closure criteria observaveis, comportamento esperado executavel por outra IA e orientacao sobre heranca relevante de assumptions/RNFs/restricoes/validacoes.

## Reproduction steps
1. Ler `INTERNAL_TICKETS.md`.
2. Ler `tickets/templates/internal-ticket-template.md`.
3. Ler `docs/workflows/codex-quality-gates.md`.
4. Confirmar que o contrato documental atual nao explicita a barra minima editorial especifica para tickets automaticos de retrospectiva sistemica.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta triagem documental.
- Warnings/codes relevantes:
  - `INTERNAL_TICKETS.md` exige rastreabilidade, impacto e closure criteria observaveis, mas nao define a barra minima editorial especifica do ticket automatico sistemico.
  - `tickets/templates/internal-ticket-template.md` nao orienta explicitamente quando e como refletir `relevantAssumptionsDefaults`, surfaces afetadas e closure criteria por superficie em tickets automaticos.
  - `docs/workflows/codex-quality-gates.md` nao substitui a necessidade de documentacao canonica dedicada para a superficie final do ticket automatico publicado.
- Comparativo antes/depois (se houver): antes = contrato documental disperso e implicito; depois esperado = barra minima editorial explicita e verificavel nos documentos canonicos.

## Impact assessment
- Impacto funcional: baixo direto, mas aumenta a chance de regressao de qualidade editorial em mudancas futuras.
- Impacto operacional: triagem e revisao futuras ficam dependentes de conhecimento oral ou memoria do mantenedor.
- Risco de regressao: baixo, porque o pacote e documental, mas toca contratos que orientam a execucao futura.
- Scope estimado (quais fluxos podem ser afetados): `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `docs/workflows/codex-quality-gates.md` e, se necessario, uma documentacao de workflow mais especifica.

## Initial hypotheses (optional)
- O ajuste documental mais util provavelmente e adicionar uma secao canonica curta para tickets automaticos de retrospectiva sistemica, sem poluir o template geral nem exigir migracao historica.

## Proposed solution (optional)
- Explicitar nos documentos canonicos a barra minima de qualidade do ticket sistemico automatico, quando herdar assumptions/RNFs/restricoes/validacoes e como tornar o aceite observavel sem forcar retrofits em massa.

## Closure criteria
- Requisito/RF/CA coberto: RF-18, CA-10
- Evidencia observavel: `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md` e a documentacao de workflow relevante passam a explicitar a barra minima de qualidade para tickets automaticos de retrospectiva sistemica, incluindo titulo orientado ao problema, contexto filtrado, ausencia de redundancia evitavel, proposta de remediacao concreta, closure criteria observaveis e comportamento esperado executavel por outra IA.
- Requisito/RF/CA coberto: RF-21
- Evidencia observavel: a documentacao atualizada preserva a optionalidade de `Proposed solution` no template geral, nao exige migracao retroativa em massa e nao altera a semantica do fluxo sequencial nem das retrospectivas.

## Closure validation
- Criterio 1 (`RF-18`, `CA-10`): atendido.
  Evidencia objetiva: `INTERNAL_TICKETS.md` agora inclui a secao `Barra minima adicional para ticket sistemico automatico` com titulo orientado ao problema, contexto filtrado, `Problem statement`/`Expected behavior` autocontidos, remediacao concreta quando houver direcao, `Closure criteria` por superficie e heranca seletiva de assumptions/RNFs/restricoes/validacoes; `tickets/templates/internal-ticket-template.md` espelha essas regras nas superfices de titulo, contexto, comportamento esperado, `Proposed solution` e `Closure criteria`; `docs/workflows/codex-quality-gates.md` passou a apontar `INTERNAL_TICKETS.md` como fonte canonica e a exigir a conferencia desse contrato na triagem. Revalidado em 2026-03-23 04:01Z com `rg -n "ticket sist[eê]mico autom[aá]tico|t[ií]tulo orientado ao problema|contexto filtrado|redund[aâ]ncia|remedia[cç][aã]o concreta|Closure criteria|closure criteria|comportamento esperado|assumptions|RNFs|restri[cç][oõ]es|valida[cç][oõ]es" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md`.
- Criterio 2 (`RF-21`): atendido.
  Evidencia objetiva: `INTERNAL_TICKETS.md` preserva `Proposed solution` como opcional por design e limita a nova barra aos tickets automaticos; `tickets/templates/internal-ticket-template.md` manteve `Proposed solution (optional)` com a instrucao `Nao obrigatorio. Preencher somente se houver direcao clara`; `docs/workflows/codex-quality-gates.md` e `DOCUMENTATION.md` mantem explicita a politica de nao exigir migracao retroativa em massa; a auditoria de escopo mostrou pacote restrito a documentacao canonica, spec viva, este ticket e o ExecPlan, sem alterar prompts, codigo ou testes. Revalidado em 2026-03-23 04:01Z com `rg -n "Proposed solution|opcional|Nao obrigatorio|Preencher somente se houver dire[cç][aã]o clara|nao exigem migra[cç][aã]o retroativa|fluxo sequencial|retrospectiva" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md DOCUMENTATION.md`, `git diff -- INTERNAL_TICKETS.md docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md docs/workflows/codex-quality-gates.md tickets/templates/internal-ticket-template.md execplans/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md` e `git status --short`.

## Manual validation pending
- Nenhuma validacao manual externa pendente para o escopo deste ticket. O proprio ticket herdou `Inherited pending/manual validations: nenhuma`, e o aceite aqui e integralmente documental por leitura, `rg` e auditoria de diff.

## Decision log
- 2026-03-23 - Ticket aberto a partir da triagem da spec - a barra minima documental e um pacote separado porque pode ser entregue sem depender do mesmo changeset tecnico do contrato/publisher.
- 2026-03-23 - Fechamento tecnico revalidado contra diff, ticket, ExecPlan, spec de origem e `docs/workflows/codex-quality-gates.md`; resultado final `GO`.

## Closure
- Closed at (UTC): 2026-03-23 04:01Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md (commit: mesmo changeset de fechamento versionado pelo runner)
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
