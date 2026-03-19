# [TICKET] Unificar contrato de tickets de auditoria/revisao entre docs, template, prompts e gate

## Metadata
- Status: open
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-03-19 20:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
- Source requirements (RFs/CAs, when applicable): RF-08, RF-11, RF-15, RF-16, RF-17; CA-06, CA-10, CA-11, CA-12
- Inherited assumptions/defaults (when applicable): o gate deve validar conformidade documental contra contratos canonicos reais do repositorio; follow-ups de auditoria/revisao precisam ser completos e autocontidos; o contrato historico nao deve depender de inferencia humana para saber quando campos extras sao obrigatorios.
- Workflow root cause (when applicable): systemic-instruction
- Workflow root cause rationale (when applicable): a regra canonica para tickets criados em auditoria/revisao esta distribuida e inconsistente entre `INTERNAL_TICKETS.md`, template, prompts e publisher; o gate passou a cobrar campos que o proprio repositorio nao materializa de forma uniforme.
- Remediation scope (when applicable): generic repository instruction
- Related artifacts:
  - Request file: .codex-flow-runner/flow-traces/requests/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-request.md
  - Response file: .codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md
  - Log file: .codex-flow-runner/flow-traces/decisions/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-decision.json
- Related docs/execplans:
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/08-auditar-spec-apos-run-all.md
  - src/integrations/workflow-improvement-ticket-publisher.ts
  - docs/specs/2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): enquanto o contrato documental nao for unico e operacional, o gate pode bloquear rodadas por falso positivo ou deixar passar tickets realmente incompletos. Isso compromete a confianca do `documentation-compliance-gap`.

## Context
- Workflow area: criacao de tickets em `spec-triage`, follow-ups de `spec-audit`, ticket transversal sistemico e validacao documental do gate
- Scenario: a primeira rodada real do gate marcou `documentation-compliance-gap` em tickets derivados porque eles tinham `Workflow root cause`, mas nao traziam justificativa da menor explicacao plausivel nem escopo da remediacao
- Input constraints: manter tickets autocontidos; nao introduzir um contrato impossivel de satisfazer pelos prompts/templates oficiais; preservar a diferenca entre triagem inicial de spec e follow-up de auditoria/revisao

## Problem statement
O repositorio ainda nao tem um contrato unico e executavel para tickets criados a partir de auditoria/revisao. `INTERNAL_TICKETS.md` exige campos extras apenas para tickets de `post-implementation audit/review`, mas o template oficial nao possui esses campos, o prompt de triagem nao os pede, o publisher sistemico tambem nao os gera e o gate atual pode interpretalos de forma ampla demais. O resultado pratico e um sistema em que a regra existe, mas nao e produzida nem validada de forma consistente.

## Observed behavior
- O que foi observado:
  - `INTERNAL_TICKETS.md:115-118` exige, para tickets criados de `post-implementation audit/review`, causa-raiz provavel, justificativa de menor explicacao plausivel e indicacao se a remediacao e local ou generica.
  - `tickets/templates/internal-ticket-template.md:3-24` oferece apenas `Workflow root cause`, sem campo estrutural para as duas informacoes adicionais.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md:28-37` nao orienta a triagem inicial a distinguir ticket de auditoria/revisao de ticket de derivacao inicial nem a preencher os campos adicionais.
  - `src/integrations/workflow-improvement-ticket-publisher.ts:321-380` gera ticket sistemico automatico com `Workflow root cause`, mas sem os complementos exigidos pelo contrato canonico de auditoria/revisao.
  - A rodada real registrada em `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md:42-58` marcou `documentation-compliance-gap` justamente por essa inconsistencia.
- Frequencia (unico, recorrente, intermitente): recorrente para qualquer fluxo que crie ticket a partir de auditoria/revisao ou follow-up sistemico
- Como foi detectado (warning/log/test/assert): comparacao entre documentos canonicos, template, publisher e resposta real do gate

## Expected behavior
O repositorio deve deixar explicito, sem ambiguidade, quais classes de ticket existem e quais campos cada classe precisa carregar. O mesmo contrato deve ser produzido pelos prompts/templates oficiais, respeitado pelo publisher sistemico e validado pelo gate. Um ticket de triagem inicial nao pode ser cobrado com campos reservados a auditoria/revisao, e um ticket de auditoria/revisao nao pode sair incompleto porque o template oficial nao o suporta.

## Reproduction steps
1. Ler `INTERNAL_TICKETS.md:115-118` e anotar os campos extras obrigatorios para tickets de `post-implementation audit/review`.
2. Ler `tickets/templates/internal-ticket-template.md:3-24` e verificar que esses campos nao existem como placeholders estruturais.
3. Ler `prompts/01-avaliar-spec-e-gerar-tickets.md:28-37` e confirmar que a triagem inicial nao diferencia explicitamente ticket de auditoria/revisao de ticket derivado da spec.
4. Ler `src/integrations/workflow-improvement-ticket-publisher.ts:321-380` e verificar que o ticket sistemico automatico tambem nao materializa os campos extras.
5. Abrir `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md` e confirmar o `documentation-compliance-gap`.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - `documentation-compliance-gap`
  - `contrariando o contrato obrigatorio de INTERNAL_TICKETS.md para achados de auditoria/revisao`
- Warnings/codes relevantes:
  - `INTERNAL_TICKETS.md:115-118`
  - `tickets/templates/internal-ticket-template.md:3-24`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md:28-37`
  - `src/integrations/workflow-improvement-ticket-publisher.ts:321-380`
  - `.codex-flow-runner/flow-traces/responses/20260319t200113z-run-specs-spec-spec-ticket-validation-2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit-response.md:42-58`
- Comparativo antes/depois (se houver): antes = regra existe apenas em documentacao, mas nao e produzida/validada de forma consistente; depois esperado = template, prompts, publisher e gate concordam sobre quando os campos extras sao obrigatorios e como aparecem

## Impact assessment
- Impacto funcional: o `documentation-compliance-gap` perde confiabilidade e pode bloquear rodadas por divergencia de contrato, nao por qualidade real do ticket.
- Impacto operacional: IAs diferentes podem criar tickets diferentes para o mesmo caso porque o repositorio nao define um caminho unico e executavel.
- Risco de regressao: alto, porque mexe em template, prompts e validacao transversal.
- Scope estimado (quais fluxos podem ser afetados): `spec-triage`, `spec-audit`, ticket transversal sistemico, gate `spec-ticket-validation`, eventuais revisoes manuais e fechamento de tickets

## Initial hypotheses (optional)
- O ajuste mais seguro e classificar explicitamente pelo menos duas familias de ticket: derivacao inicial de spec e ticket de auditoria/revisao.
- O gate pode precisar saber a classe do ticket por estrutura documental objetiva, e nao apenas por heuristica baseada na presenca de `Workflow root cause`.

## Proposed solution (optional)
- Definir um contrato canonico unico para tickets de auditoria/revisao e propaga-lo para template, prompts, publisher e validacao automatica.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-08, RF-11; CA-06
- Evidencia observavel: o repositorio passa a distinguir explicitamente ticket derivado de triagem inicial versus ticket criado em auditoria/revisao, com obrigatoriedade documental clara para cada classe.
- Requisito/RF/CA coberto: RF-15, RF-16, RF-17; CA-10, CA-11, CA-12
- Evidencia observavel: template(s), prompts oficiais e publisher sistemico materializam o mesmo contrato que o gate valida; o resumo/trace da rodada deixa de apontar falso positivo de conformidade documental para tickets que seguem o contrato correto.
- Requisito/RF/CA coberto: confianca do `documentation-compliance-gap`
- Evidencia observavel: testes automatizados cobrem pelo menos tres casos distintos:
  - ticket de triagem inicial que passa sem campos exclusivos de auditoria/revisao;
  - ticket de auditoria/revisao que falha quando esses campos faltam;
  - ticket sistemico automatico que sai completo segundo o contrato oficial.

## Decision log
- 2026-03-19 - Ticket aberto a partir da analise da rodada falha - o contrato de tickets de auditoria/revisao existe em `INTERNAL_TICKETS.md`, mas nao esta operacionalizado no template, nos prompts nem no publisher.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):

