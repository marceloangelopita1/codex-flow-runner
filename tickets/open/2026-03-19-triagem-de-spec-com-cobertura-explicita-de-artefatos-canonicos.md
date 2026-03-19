# [TICKET] Exigir cobertura explicita de artefatos canonicos na triagem de specs

## Metadata
- Status: open
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-19 20:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
- Source requirements (RFs/CAs, when applicable): RF-05
- Inherited assumptions/defaults (when applicable): tickets derivados de uma spec devem ser independentes o bastante para outra IA executar sem depender de ticket irmao; requisitos sobre prompts, contratos, estagios, traces e resumos precisam de ownership explicito sobre artefatos canonicos, nao apenas cobertura implita por contexto.
- Workflow root cause (when applicable): systemic-instruction
- Workflow root cause rationale (when applicable): o prompt de triagem e o checklist atual pedem RFs/CAs e closure criteria, mas nao exigem mapear explicitamente quais artefatos canonicos do workflow cada ticket assume como responsabilidade.
- Remediation scope (when applicable): generic repository instruction
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - docs/workflows/codex-quality-gates.md
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md
  - prompts/09-validar-tickets-derivados-da-spec.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a triagem atual consegue produzir tickets coerentes, mas ainda deixa lacunas de cobertura quando o requisito recai sobre artefatos canonicos do workflow. Isso empurra a descoberta do gap para o gate, desperdicando rodada e gerando backlog incompleto.

## Context
- Workflow area: `spec-triage`, especialmente para specs que exigem mudancas em `prompts/`, contratos tipados, resumos, traces ou ordem das etapas
- Scenario: a triagem da spec de retrospectiva sistemica criou um backlog aparentemente coerente em tres frentes, mas o gate detectou que RF-05 ainda nao tinha ownership explicito para o prompt/contrato separado de `workflow-ticket-publication`
- Input constraints: manter o contrato `spec -> tickets`; nao transformar triagem em ExecPlan; continuar criando tickets independentes e implementaveis por IAs diferentes

## Problem statement
O contrato atual de triagem nao obriga a explicitar a relacao entre um requisito sobre artefato canonico e o ticket que realmente vai alteralo. Quando a spec fala de prompts separados, tipos/estagios distintos, blocos de resumo ou traces, a triagem pode distribuir o escopo por "areas" coerentes, mas ainda deixar ownership implicito. O problema so aparece depois, no `spec-ticket-validation`, quando ja houve custo de rodada e criacao de backlog incompleto.

## Observed behavior
- O que foi observado:
  - `prompts/01-avaliar-spec-e-gerar-tickets.md:17-44` pede RFs/CAs, evidencias e closure criteria, mas nao exige um mapeamento explicito `RF/CA -> ticket -> artefato canonico afetado`.
  - `docs/workflows/codex-quality-gates.md:23-33` exige tickets independentes e closure criteria observaveis, mas tambem nao explicita o caso especial de requisitos sobre artefatos canonicos do workflow.
  - A resposta da triagem registrada em `.codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md` agrupou o trabalho em tres tickets tecnicamente razoaveis, mas deixou implicita a cobertura do prompt/contrato dedicado de `workflow-ticket-publication`.
  - O gate posterior marcou `coverage-gap` para RF-05 ao notar que o backlog nao explicitava esse ownership.
- Frequencia (unico, recorrente, intermitente): recorrente em specs que descrevem mudancas de contrato/orquestracao, nao apenas comportamento funcional
- Como foi detectado (warning/log/test/assert): comparacao entre prompt de triagem, resposta da triagem e gap de cobertura registrado no gate

## Expected behavior
Quando um RF/CA disser respeito a um artefato canonico do workflow, a triagem deve explicitar em qual ticket esse artefato sera tratado e qual evidencia de fechamento vai provar a cobertura. Um backlog derivado nao deve depender de "isso provavelmente esta implicito no ticket vizinho" para satisfazer requisitos sobre prompts, templates, contratos, traces, resumos ou ordem do runner.

## Reproduction steps
1. Ler `prompts/01-avaliar-spec-e-gerar-tickets.md:17-44`.
2. Ler `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:50-52` e notar que RF-05 exige duas subetapas com prompts separados.
3. Ler a resposta da triagem em `.codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md`.
4. Comparar com o `coverage-gap` registrado no gate em `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md:22-40`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `coverage-gap`
  - `workflow-ticket-publication precisa ter prompt/contrato separado`
- Warnings/codes relevantes:
  - `prompts/01-avaliar-spec-e-gerar-tickets.md:17-44`
  - `docs/workflows/codex-quality-gates.md:23-33`
  - `docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md:50-52`
  - `.codex-flow-runner/flow-traces/responses/20260319t195913z-run-specs-spec-spec-triage-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md`
  - `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md:22-40`
- Comparativo antes/depois (se houver): antes = backlog coerente por area, mas ownership de artefato canonico pode ficar implicito; depois esperado = cada requisito sobre artefato canonico aponta explicitamente para ticket(s) e caminhos afetados

## Impact assessment
- Impacto funcional: o pacote derivado pode nascer insuficiente mesmo quando parece bem fatiado.
- Impacto operacional: o gate vira descobridor tardio de lacunas que a triagem deveria evitar.
- Risco de regressao: medio, porque muda o prompt/checklist de triagem e pode aumentar a verbosidade dos tickets se o desenho nao for cuidadoso.
- Scope estimado (quais fluxos podem ser afetados): triagem de specs aprovadas, `spec-ticket-validation`, qualidade dos tickets em `tickets/open/`

## Initial hypotheses (optional)
- A forma mais enxuta de resolver isso pode ser adicionar uma secao curta de "artefatos canonicos afetados" nos tickets derivados quando o requisito for desse tipo.
- O gate tambem pode validar essa secao apenas quando houver RF/CA que mentione `prompt`, `template`, `resumo`, `trace`, `estagio`, `state`, `timing` ou equivalente.

## Proposed solution (optional)
- Atualizar o contrato de triagem para exigir mapeamento explicito de ownership quando o requisito recair sobre artefatos canonicos do workflow.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-05 desta spec de retrospectiva e qualidade transversal da triagem
- Evidencia observavel: o processo de triagem passa a exigir mapeamento explicito `requisito -> ticket -> artefato canonico afetado` quando o RF/CA falar de prompts, contratos, traces, resumos, tipos ou ordem de estagios.
- Requisito/RF/CA coberto: independencia dos tickets derivados
- Evidencia observavel: tickets derivados passam a declarar, quando aplicavel, quais arquivos canonicos pretendem alterar e qual evidenica observavel fecha essa responsabilidade, sem depender de contexto implcito de ticket irmao.
- Requisito/RF/CA coberto: prevencao de regressao
- Evidencia observavel: um exemplo ou teste de regressao prova que um RF como "prompts separados" nao pode mais ser considerado coberto por backlog que nao explicite qual ticket assume cada prompt.

## Decision log
- 2026-03-19 - Ticket aberto a partir da rodada falha da spec de retrospectiva - a triagem atual ainda permite backlog com coverage implicita demais para artefatos canonicos do workflow.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

