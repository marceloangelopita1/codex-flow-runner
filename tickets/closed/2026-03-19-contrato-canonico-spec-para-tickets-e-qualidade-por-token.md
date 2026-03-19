# [TICKET] Corrigir contrato canonico spec para tickets e qualidade por token

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 15:41Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-04, RF-05, RF-06, RF-07, RF-28; CA-02, CA-03, CA-18, CA-20
- Inherited assumptions/defaults (when applicable): o contrato oficial deve ser `spec -> tickets` e `ticket -> execplan quando necessario`; triagem de spec cria apenas tickets em `tickets/open/`; a frase oficial sobre qualidade por token deve aparecer textualmente em `AGENTS.md` e docs de workflow relacionadas; material historico so exige ajuste quando for tocado depois ou quando houver impacto funcional real.
- Workflow root cause (when applicable): systemic-instruction
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - AGENTS.md
  - SPECS.md
  - docs/workflows/discover-spec.md
  - docs/specs/templates/spec-template.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - docs/workflows/codex-quality-gates.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a documentacao canonica ainda contradiz a spec aprovada e permite derivacao direta `spec -> execplan`, o que aumenta a chance de backlog incompleto ou fora do contrato desejado.

## Context
- Workflow area: documentacao canonica, templates e prompt de triagem de spec
- Scenario: o repositorio precisa refletir de forma univoca o contrato `spec -> tickets` e a diretriz transversal de qualidade por token
- Input constraints: nao exigir migracao retroativa em massa; alinhar apenas docs/templates/workflows aplicaveis e os prompts canonicos

## Problem statement
As docs canonicas e workflows relacionados ainda nao refletem o contrato aprovado pela spec. `AGENTS.md`, `SPECS.md` e `docs/workflows/discover-spec.md` continuam permitindo `spec -> execplan` direto, e a frase oficial sobre maximizar a qualidade de cada token da IA/Codex nao esta documentada como principio transversal do projeto.

## Observed behavior
- O que foi observado: os documentos de processo continuam descrevendo derivacao direta para ExecPlan quando o escopo estiver claro; o template de spec ainda nao traz indicacao do gate de validacao dos tickets derivados nem orientacao sobre migracao historica limitada; o prompt de triagem cria tickets, mas isso nao corrige a contradicao canonica das docs.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de documentacao e templates

## Expected behavior
As docs canonicas devem declarar sem ambiguidade que a triagem de spec deriva apenas tickets, que ExecPlan nasce de ticket quando necessario, que o projeto precisa maximizar a qualidade de cada token produzido pela IA/Codex e que nao ha obrigacao de migracao retroativa em massa para material historico nao tocado.

## Reproduction steps
1. Ler `AGENTS.md`, `SPECS.md` e `docs/workflows/discover-spec.md`.
2. Verificar que os tres documentos ainda permitem `spec -> execplan` direto.
3. Conferir `docs/specs/templates/spec-template.md` e confirmar a ausencia de orientacao para o gate de validacao dos tickets derivados e para a politica de migracao historica limitada.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `AGENTS.md` ainda diz para criar execplan direto quando o escopo ja estiver claro.
  - `SPECS.md` ainda autoriza `criar execplan direto em execplans/` na regra de derivacao.
  - `docs/workflows/discover-spec.md` ainda orienta derivar execplan direto depois da spec pronta.
  - `docs/specs/templates/spec-template.md` nao traz a secao dedicada ao gate nem a orientacao de migracao historica limitada.
  - `AGENTS.md` e docs de workflow nao contem a formulacao oficial sobre qualidade por token da IA/Codex.
- Comparativo antes/depois (se houver): antes = contrato ambiguo; depois esperado = contrato e principios canonicos alinhados com a spec aprovada

## Impact assessment
- Impacto funcional: prompts e operacoes humanas podem continuar pulando o backlog de tickets derivado da spec.
- Impacto operacional: o repositorio mantem instrucoes conflitantes entre docs, template e spec aprovada.
- Risco de regressao: baixo a medio, concentrado em documentacao e prompts.
- Scope estimado (quais fluxos podem ser afetados): `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/specs/templates/spec-template.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`

## Initial hypotheses (optional)
- O prompt de triagem ja aponta para criacao de tickets, entao o maior problema e a divergencia das instrucoes canonicas e a falta de clausulas explicitas sobre qualidade por token e migracao historica.

## Proposed solution (optional)
Atualizar docs e templates para um contrato unico `spec -> tickets`, reforcar o principio de qualidade por token e explicitar a politica de nao migracao retroativa em massa.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-04, RF-05, RF-06; CA-02, CA-03
- Evidencia observavel: `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, templates e prompts relevantes passam a declarar `spec -> tickets` e `ticket -> execplan quando necessario`, removendo a permissao canonica de `spec -> execplan` direto.
- Requisito/RF/CA coberto: RF-07; CA-18
- Evidencia observavel: `AGENTS.md` e docs de workflow relacionadas passam a conter textualmente `Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.`
- Requisito/RF/CA coberto: RF-28; CA-20
- Evidencia observavel: a documentacao canonica deixa explicito que material historico so precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real, sem exigir migracao retroativa em massa.

## Decision log
- 2026-03-19 - Ticket aberto a partir da avaliacao da spec - as instrucoes canonicas ainda contradizem o contrato aprovado pela spec alvo.
- 2026-03-19 - Diff, ticket, ExecPlan, spec de origem, `DOCUMENTATION.md` e checklist de `docs/workflows/codex-quality-gates.md` relidos na etapa de fechamento; resultado validado como `GO` com base apenas em criterios tecnicos/funcionais da entrega atual.

## Closure
- Closed at (UTC): 2026-03-19 17:22Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-04`, `RF-05`, `RF-06`; `CA-02`, `CA-03`: `git diff -- AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md` mostra o contrato atualizado nas superficies planejadas; `rg -n 'spec -> tickets|ticket -> execplan|apenas tickets|tickets/open/' AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md` retorna matches em `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/specs/templates/spec-template.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md`; `rg -n 'execplan direto|criar execplan direto|derivar execplan em \`execplans/\` quando o escopo' AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md` retorna zero matches para a permissao antiga.
  - `RF-07`; `CA-18`: `rg -nF 'Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.' AGENTS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md` retorna um match textual exato em `AGENTS.md`, `docs/workflows/discover-spec.md` e `docs/workflows/codex-quality-gates.md`.
  - `RF-28`; `CA-20`: `rg -n 'material historico|migracao retroativa em massa|tocado depois|impacto funcional real' SPECS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md docs/specs/templates/spec-template.md` retorna a politica historica limitada em `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/workflows/codex-quality-gates.md` e `docs/specs/templates/spec-template.md`.
- Evidencia objetiva de consistencia para versionamento:
  - `git diff --stat` permanece restrito ao pacote documental/prompt deste ticket mais os ajustes de rastreabilidade do proprio fechamento (`tickets/closed/`, spec de origem e execplans que referenciam o ticket movido), sem alteracoes de runtime.
- Entrega tecnica concluida:
  - `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/workflows/codex-quality-gates.md`, `docs/specs/templates/spec-template.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` agora refletem o contrato `spec -> tickets` e `ticket -> execplan quando necessario`.
  - A frase oficial de qualidade por token foi registrada nas superficies canonicas exigidas.
  - A politica de migracao historica limitada e o gate documental para tickets derivados passaram a constar explicitamente na documentacao e no template oficial.
- Validacao manual externa pendente: nao.
