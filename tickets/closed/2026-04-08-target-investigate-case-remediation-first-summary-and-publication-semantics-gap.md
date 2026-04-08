# [TICKET] target-investigate-case nao pode colapsar remediacao acionavel em desfecho inconclusivo generico

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-08 02:41Z
- Reporter: Codex
- Owner: Codex
- Source: production-observation
- Parent ticket (optional): N/A
- Parent execplan (optional): execplans/2026-04-08-target-investigate-case-remediation-first-summary-and-publication-semantics-gap.md
- Parent commit (optional): N/A
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): /home/mapita/projetos/guiadomus-matricula
- Request ID: 2026-04-08T01-39-50Z
- Source spec (when applicable): /home/mapita/projetos/guiadomus-matricula/docs/specs/2026-04-08-case-investigation-remediation-first-outcome-and-publication-separation.md
- Source spec canonical path (when applicable): docs/specs/2026-04-08-case-investigation-remediation-first-outcome-and-publication-separation.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable):
  - RF-02, RF-04, RF-08, RF-09 e a parcela runner-side de CA-04 e CA-09.
  - Membros explicitos que precisam ficar observaveis: separacao entre desfecho investigativo/remediacao e `publication_status`, surfaces operator-facing remediation-first, linguagem equivalente a "ha remediacao acionavel; publication automatica segue bloqueada", preservacao do gate estrito de `ticket-proposal.json`.
- Inherited assumptions/defaults (when applicable):
  - publication automatica continua conservadora e continua dependendo de `ticket-proposal.json`.
  - o runner nao deve inventar remediacao; deve exibir o que o target materializar em `assessment.primary_remediation` e/ou no novo artefato target-owned de remediacao.
  - caminhos realmente inconclusivos devem continuar existindo quando o target nao tiver remediacao dominante.
- Inherited RNFs (when applicable):
  - manter fronteira clara entre diagnostico target-owned e publication mecanica runner-side;
  - melhorar a legibilidade operator-facing sem abrir nova interpretacao de dominio no runner;
  - manter traces e summaries minimos, mas semanticamente suficientes.
- Inherited technical/documentary constraints (when applicable):
  - nao relaxar publication positiva sem `ticket-proposal.json`;
  - reutilizar o contrato target-owned em vez de duplicar logica causal no runner;
  - preservar a sequencialidade do flow e o contrato de `target-investigate-case`.
- Inherited pending/manual validations (when applicable):
  - spot-check em Telegram real continua necessario para validar a mensagem final com a linguagem remediation-first;
  - o runner deve ser validado junto com o ticket target-owned irmao para garantir que summary e Telegram refletem o novo artefato/shape final sem drift.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): spec
- Smallest plausible explanation (audit/review only): o runner foi projetado com publication gating como manchete final e ainda nao tem uma surface de primeira classe para exibir "remediacao acionavel ja identificada" quando a publication segue bloqueada.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-08T01-39-50Z/assessment.json
  - Response file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-08T01-39-50Z/publication-decision.json
  - Decision file: /home/mapita/projetos/guiadomus-matricula/investigations/2026-04-08T01-39-50Z/dossier.md
- Related docs/execplans:
  - /home/mapita/projetos/guiadomus-matricula/docs/specs/2026-04-08-case-investigation-remediation-first-outcome-and-publication-separation.md
  - /home/mapita/projetos/guiadomus-matricula/tickets/closed/2026-04-08-case-investigation-publication-cannot-eclipse-primary-remediation-gap.md
  - src/core/target-investigate-case.ts
  - src/integrations/telegram-bot.ts

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a rodada ancora ja encontrou uma remediacao local forte, mas o runner ainda destaca `publication_status`/`overall_outcome` e pode fazer o operador ler o caso como inconclusivo quando a acao correta ja existe.

## Context
- Workflow area: `/target_investigate_case` / evaluation / final summary / publication decision / Telegram
- Scenario: a rodada `investigations/2026-04-08T01-39-50Z/` em `guiadomus-matricula` materializou `primary_remediation.execution_readiness=ready` e `publication_dependency=publication_only`, mas o resumo final e a mensagem operator-facing continuam publication-first.
- Input constraints:
  - o runner deve continuar consumindo um contrato target-owned e nao reinterpretar causalidade local por conta propria;
  - publication positiva continua dependendo de `ticket-proposal.json`;
  - o output final precisa distinguir "ha remediacao acionavel" de "a publication automatica saiu ou nao".

Para tickets automaticos de retrospectiva sistemica, mantenha apenas o contexto filtrado necessario para remediacao; nao replique a spec inteira nem o trace bruto.

## Problem statement
O runner ainda resume `target-investigate-case` pela lente de `publication_status`, `overall_outcome` e `next_action` publication-centric. Assim, quando o target ja encontrou uma remediacao forte mas a publication automatica segue bloqueada, o operador continua vendo um desfecho que parece genericamente inconclusivo ou apenas "nao elegivel", sem uma mensagem clara de que a melhor melhoria do projeto ja foi identificada.

## Observed behavior
- O que foi observado:
  - `src/core/target-investigate-case.ts` monta o summary final com destaque para `ticket_readiness_status`, `publication_status`, `overall_outcome` e `next_action`, mas sem um bloco remediation-first equivalente.
  - a matriz final ainda pode rotular esses casos com saidas equivalentes a `inconclusive-case` ou `inconclusive-project-capability-gap`.
  - `src/integrations/telegram-bot.ts` resume o fechamento em publication status, overall outcome e next action, sem evidenciar `primary_remediation`.
- Frequencia (unico, recorrente, intermitente): recorrente para qualquer target que produza remediacao local acionavel antes de atingir a barra de publication automatica.
- Como foi detectado (warning/log/test/assert): leitura do caso ancora, do summary renderizado no runner e do trecho final da mensagem de Telegram.

## Expected behavior
O runner deve comunicar primeiro o desfecho investigativo remediation-first e so depois o estado da publication automatica. Quando existir remediacao acionavel e a publication ainda estiver bloqueada, a classificacao operator-facing deve refletir essa combinacao explicitamente, em vez de colapsar o caso para inconclusao generica.

## Reproduction steps
1. Ler `/home/mapita/projetos/guiadomus-matricula/investigations/2026-04-08T01-39-50Z/assessment.json` e confirmar `primary_remediation.execution_readiness=ready` com `publication_dependency=publication_only`.
2. Ler `/home/mapita/projetos/guiadomus-matricula/investigations/2026-04-08T01-39-50Z/publication-decision.json` e observar que o veredito final continua publication-centric.
3. Inspecionar `src/core/target-investigate-case.ts` e `src/integrations/telegram-bot.ts` para confirmar que o resumo final e a mensagem de Telegram nao promovem a remediacao principal a surface de primeira classe.

## Evidence
- Logs relevantes (trechos curtos e redigidos):
  - N/A
- Warnings/codes relevantes:
  - `publication_status=not_eligible`
  - `overall_outcome=inconclusive-project-capability-gap`
  - `next_action=Continuar a falsificacao...` ou equivalente publication-centric
  - `assessment.primary_remediation.execution_readiness=ready`
  - `assessment.primary_remediation.publication_dependency=publication_only`
- Comparativo antes/depois (se houver):
  - antes: summary e Telegram destacam publication e outcome generico.
  - depois esperado: summary e Telegram destacam primeiro a remediacao principal e explicam em segundo plano por que a publication segue bloqueada.

## Impact assessment
- Impacto funcional: o operador pode interpretar uma investigacao boa como inconclusiva e deixar de agir sobre uma melhoria local ja bem sustentada.
- Impacto operacional: a qualidade do loop de investigacao e a confianca no workflow caem, porque a surface final nao responde claramente "o que corrigir agora".
- Risco de regressao: medio, porque a frente toca summary, types, decision matrix, renderizacao final e mensagem de Telegram.
- Scope estimado (quais fluxos podem ser afetados): `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, `src/integrations/telegram-bot.ts` e testes associados do flow `/target_investigate_case`.

## Initial hypotheses (optional)
- O runner preservou bem o gate conservador de publication, mas ainda nao separa "resultado investigativo" de "eligibilidade de publication" na UX final do fluxo.

## Proposed solution (optional)
Nao obrigatorio. Preencher somente se houver direcao clara. Para ticket automatico de retrospectiva sistemica, quando houver direcao concreta, nomeie as superficies de workflow/documentacao que precisam mudar.

- Adicionar ao summary final e ao payload de trace uma surface remediation-first derivada do contrato target-owned.
- Atualizar a matriz de `overall_outcome`/mensagem final para representar explicitamente o caso "remediacao acionavel identificada; publication automatica bloqueada".
- Atualizar o resumo de Telegram para mostrar a remediacao principal antes de publication status.
- Manter `ticket-proposal.json` como precondicao de publication positiva, sem esconder a remediacao quando ele nao existir.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket. Para ticket automatico de retrospectiva sistemica, prefira criterios por superficie afetada e evite usar "nao recorrencia" como criterio unico.
- Requisito/RF/CA coberto: RF-08 / CA-04
- Evidencia observavel: `src/core/target-investigate-case.ts` e `src/integrations/telegram-bot.ts` passam a renderizar primeiro a remediacao principal target-owned e, so depois, `publication_status` e `overall_outcome`.
- Requisito/RF/CA coberto: RF-09
- Evidencia observavel: a classificacao final mostrada ao operador distingue explicitamente o caso "ha remediacao acionavel; publication automatica segue bloqueada", sem reutilizar `inconclusive-case` ou equivalente generico para esse caminho.
- Requisito/RF/CA coberto: RF-04
- Evidencia observavel: um caso com remediacao target-owned e sem `ticket-proposal.json` continua `not_eligible` para publication positiva, mas o summary final e a mensagem operator-facing nao escondem a remediacao ja encontrada.
- Requisito/RF/CA coberto: parcela runner-side de CA-09
- Evidencia observavel: os testes focados do runner para `/target_investigate_case` cobrem o caminho remediation-first com publication bloqueada, e `npm run check` / `npm test` terminam em `exit 0`.

## Decision log
- 2026-04-08 - Ticket aberto a partir da spec remediation-first do target - a fronteira runner-side continua sendo UX final, decision matrix e Telegram, sem reinterpretar causalidade local.
- 2026-04-08 - Execucao iniciada com ExecPlan proprio no runner, incluindo compatibilidade com `phaseOutputs["remediation-proposal"]` do target e separacao explicita entre eixo investigativo/remediacao e publication.
- 2026-04-08 - Execucao concluida com `investigation_outcome` estruturado no summary/trace, manifesto compativel com `remediation-proposal.json` e surfaces do runner/Telegram remediation-first sem relaxar o gate de publication.

## Closure
- Closed at (UTC): 2026-04-08 03:51Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-04-08-target-investigate-case-remediation-first-summary-and-publication-semantics-gap.md; validado com `npm run check` e `npm test`
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
