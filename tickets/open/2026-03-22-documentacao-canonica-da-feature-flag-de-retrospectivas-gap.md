# [TICKET] Alinhar documentacao canonica e historico minimo da feature flag de retrospectivas

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-22 19:24Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable):
- Active project (when applicable):
- Target repository (when applicable):
- Request ID: N/A - derivacao manual local a partir da spec 2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow
- Source spec (when applicable): docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md
- Source spec canonical path (when applicable): docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-21, RF-22, RF-23; CA-14
- Inherited assumptions/defaults (when applicable): a secao `Retrospectiva sistemica da derivacao dos tickets` continua canonica no modelo de spec; com a flag desligada a secao pode permanecer `n/a` e nao recebe write-back automatico; o historico das specs ja atendidas nao deve ser reescrito em massa, apenas receber nota minima quando explicitamente tocado por esta entrega.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow.md
  - SPECS.md
  - docs/specs/templates/spec-template.md
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): mesmo depois da feature flag ser implementada, `SPECS.md`, o template oficial e as specs historicas continuarao sugerindo que a retrospectiva sistemica e sempre executada, o que reduz confianca operacional e dificulta onboarding de forks/terceiros.

## Context
- Workflow area: documentacao canonica de specs e rastreabilidade historica minima
- Scenario: a feature flag altera a ativacao padrao das retrospectivas sistemicas, mas o contrato documental global ainda nao explica a condicionalidade nem anota o novo pre-requisito nas specs historicas que introduziram essas etapas
- Input constraints: manter a secao de retrospectiva como parte canonica das specs; nao reescrever o historico funcional das entregas antigas; registrar apenas nota minima de dependencia da flag

## Problem statement
O repositorio ainda documenta a retrospectiva sistemica como comportamento canonico de `/run_specs`, sem destacar que sua execucao/write-back automatico depende da feature flag aprovada nesta spec. O template oficial nao instrui que a secao pode permanecer `n/a` quando a flag estiver desligada, e as specs historicas de 2026-03-19 e 2026-03-20 ainda nao carregam a nota minima de que futuras ativacoes dessas etapas dependem do novo opt-in.

## Observed behavior
- O que foi observado: `SPECS.md` exige a secao `Retrospectiva sistemica da derivacao dos tickets` e o write-back local, mas nao menciona qualquer feature flag de ativacao; `docs/specs/templates/spec-template.md` descreve a secao e a nota de uso sem dizer que `n/a` e esperado quando a flag estiver desligada; as specs historicas `2026-03-19-...` e `2026-03-20-...` descrevem a retrospectiva como capacidade implementada, sem a nota minima pedida por RF-23.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura documental e busca textual nas fontes canonicas e nas specs historicas citadas pela spec alvo

## Expected behavior
`SPECS.md`, o template oficial e as specs historicas relevantes devem deixar explicito que a secao de retrospectiva continua canonica, mas a execucao/write-back automatico depende de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, podendo permanecer `n/a` quando a flag estiver desligada.

## Inherited validations from source spec
- As validacoes manuais da spec sobre rodadas reais com a flag em `false` e `true`, restart e legibilidade do resumo final nao sao herdadas por este ticket porque ele nao altera runtime nem superficies observaveis em execucao. Elas ficam integralmente cobertas pelo ticket irmao `tickets/open/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md`.

## Reproduction steps
1. Ler `SPECS.md` e confirmar que a secao de retrospectiva e descrita como obrigatoria/canonica sem qualquer nota sobre ativacao por feature flag.
2. Ler `docs/specs/templates/spec-template.md` e confirmar que a secao nao explica o caso `n/a` quando a feature flag estiver desligada.
3. Ler `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` e confirmar a ausencia da nota minima exigida pela nova spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - `SPECS.md` documenta a secao canonica e o write-back local, mas nao menciona `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`.
  - `docs/specs/templates/spec-template.md` descreve a secao `Retrospectiva sistemica da derivacao dos tickets`, mas nao diz que ela pode permanecer `n/a` com a flag desligada.
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` ainda narram a capacidade como comportamento ativo, sem nota minima sobre dependencia futura da feature flag.
- Comparativo antes/depois (se houver): antes = contratos canonicos e historicos sugerem retrospectivas sempre ativas; depois esperado = o material canonico e historico explica o opt-in sem reescrever entregas antigas

## Impact assessment
- Impacto funcional: nenhum direto no runtime.
- Impacto operacional: operadores e agentes podem interpretar errado quando esperar write-back/retrospectiva em forks e instalacoes de terceiros.
- Risco de regressao: baixo a medio, restrito a documentacao canonica e historica.
- Scope estimado (quais fluxos podem ser afetados): `SPECS.md`, `docs/specs/templates/spec-template.md`, `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md`, `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`

## Initial hypotheses (optional)
- A correcao deve ser apenas documental e minima: explicitar a flag no contrato canonico e anexar nota curta nas specs historicas, sem reabrir seu historico de atendimento.

## Proposed solution (optional)
Atualizar `SPECS.md` e o template oficial para registrar a condicionalidade por feature flag e adicionar nota minima nas duas specs historicas apontando que futuras ativacoes dessas etapas passaram a depender de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-21, RF-22; CA-14
- Evidencia observavel: `SPECS.md` e `docs/specs/templates/spec-template.md` passam a deixar explicito que a secao `Retrospectiva sistemica da derivacao dos tickets` continua canonica, mas sua execucao/write-back automatico depende de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, podendo permanecer `n/a` com a flag desligada.
- Requisito/RF/CA coberto: RF-23
- Evidencia observavel: `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` recebem nota documental minima apontando a dependencia futura da feature flag, sem reescrever o historico funcional ja concluido.

## Decision log
- 2026-03-22 - Ticket aberto a partir da avaliacao da spec - a mudanca aprovada altera o contrato canonico de ativacao, e esse alinhamento documental ficou separado do ticket P0 de runtime para manter risco e aceite independentes.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
