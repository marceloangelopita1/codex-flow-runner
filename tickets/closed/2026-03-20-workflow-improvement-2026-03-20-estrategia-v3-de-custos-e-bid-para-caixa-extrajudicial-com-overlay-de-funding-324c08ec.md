# [TICKET] Melhoria transversal de workflow derivada de estrategia v3 de custos e bid para CAIXA extrajudicial com overlay de funding

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-20 20:30Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md
- Source requirements (RFs/CAs, when applicable): docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes manuais pendentes, docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes obrigatorias ainda nao automatizadas
- Inherited assumptions/defaults (when applicable):
- Workflow root cause (when applicable): systemic-instruction
- Systemic gap fingerprints: ["workflow-finding|b1f0d04e9a51"]
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md
  - ../codex-flow-runner/docs/specs/2026-02-19-approved-spec-triage-run-specs.md
  - ../codex-flow-runner/docs/workflows/codex-quality-gates.md
  - ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o ticket automatico original consolidou duas frentes de melhoria diferentes: qualidade estrutural do ticket transversal gerado pelo workflow e heranca efetiva de validacoes pendentes/manuais na triagem de spec. O split reduz ambiguidade de escopo e permite closure criteria mais observaveis por frente.

## Context
- Workflow area: spec-workflow-retrospective -> workflow-ticket-publication
- Scenario: a retrospectiva sistemica da spec 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
A retrospectiva pos-auditoria da spec 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md encontrou evidencia de que o workflow atual contribuiu materialmente para gaps residuais reaproveitaveis. O follow-up automatico original ficou amplo demais para uma execucao segura porque misturou contrato do ticket transversal e heranca de validacoes pendentes/manuais da spec na triagem derivada.

## Observed behavior
- O que foi observado:
- O contrato operacional de spec-triage nao pede explicitamente que validacoes obrigatorias/manuais pendentes da spec sejam carregadas para os tickets derivados ou seus criterios de fechamento.
- O proprio ticket transversal automatico abriu com contexto de retrospectiva misturado, referencias cross-repo ambiguas e campos de audit/review incompletos.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): workflow-gap-analysis com high confidence apos spec-audit e revisao manual do ticket aberto

## Expected behavior
O workflow deve prevenir ou absorver automaticamente a causa sistemica registrada, reduzindo a recorrencia observada em 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md e em specs futuras equivalentes, com tickets transversais auto-contidos e backlog separado por frente de trabalho.

## Reproduction steps
1. Executar /run_specs para 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md.
2. Revisar o resultado de spec-audit e os follow-ups funcionais abertos para a spec auditada.
3. Observar workflow-gap-analysis e confirmar o diagnostico causal com evidencia suficiente para backlog sistemico reaproveitavel.
4. Reler o ticket automatico publicado e verificar que ele mistura contrato do ticket transversal com a melhoria substantiva da triagem de spec.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = A triagem de spec do codex-flow-runner nao exige herdar validacoes pendentes/manuais da spec para os tickets derivados, e essa omissao contribuiu diretamente para o unico gap que o gate funcional precisou revisar antes do GO.
- Warnings/codes relevantes:
- O contrato operacional de spec-triage nao pede explicitamente que validacoes obrigatorias/manuais pendentes da spec sejam carregadas para os tickets derivados ou seus criterios de fechamento.
  - Requisitos relacionados: docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes manuais pendentes, docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes obrigatorias ainda nao automatizadas
  - Artefatos afetados: ../codex-flow-runner/docs/specs/2026-02-19-approved-spec-triage-run-specs.md, ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - Evidencias: No historico completo do gate funcional, o ciclo 0 ficou em NO_GO porque o pacote nao amarrava validacoes pendentes da spec; o ciclo 1 virou GO apos adicionar ao menos duas dessas validacoes aos tickets de matriz de custos e de bridge downstream. | O checklist de triagem em docs/workflows/codex-quality-gates.md lista RFs, CAs, assumptions/defaults e nao-escopo, sem item equivalente para validacoes pendentes/manuais. | O prompt 01 manda extrair RFs e CAs e preencher source requirements, assumptions/defaults e closure criteria, mas nao menciona herdanca de validacoes pendentes/manuais.
  - Fingerprint: workflow-finding|b1f0d04e9a51
- Tickets funcionais considerados: fallback controlado em spec + resultado do spec-audit
- Hipotese causal consolidada: o prompt de spec-triage e o checklist compartilhado modelam a derivacao em torno de RFs/CAs, assumptions/defaults e nao-escopo, mas nao incluem a transferencia obrigatoria de validacoes pendentes/manuais da spec para contexto ou closure criteria dos tickets; em paralelo, o ticket transversal automatico nao materializa com nitidez suficiente sua propria origem, contexto e rastreabilidade.
- Beneficio esperado consolidado: dividir o backlog em follow-ups menores permite endurecer o contrato humano do ticket transversal e a heranca de validacoes da spec sem misturar closure criteria, riscos e validacoes.
- Comparativo antes/depois (se houver): antes = um unico ticket amplo misturando contrato do ticket transversal e heranca de validacoes da spec; depois esperado = dois follow-ups menores, com closure criteria especificos e ExecPlans dedicados.

## Impact assessment
- Impacto funcional: novos pacotes derivados podem repetir a mesma lacuna sistemica e novos tickets transversais podem continuar nascendo com contexto opaco.
- Impacto operacional: o runner depende de follow-up manual para melhorar o proprio workflow e o backlog sistemico fica menos claro para triagem.
- Risco de regressao: medio, porque as correcoes tendem a tocar instrucoes canonicas, prompts, validacoes, renderer do ticket e ordem das etapas compartilhadas.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/docs/specs/2026-02-19-approved-spec-triage-run-specs.md, ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md, ../codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md, ../codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md, ../codex-flow-runner/src/core/runner.ts, ../codex-flow-runner/src/integrations/workflow-improvement-ticket-publisher.ts.

## Initial hypotheses (optional)
- O backlog fica mais seguro se o ticket transversal automatico tiver contrato proprio endurecido e se a melhoria substantiva de heranca de validacoes pendentes/manuais da spec for tratada em ticket independente.

## Proposed solution (optional)
- Dividir o trabalho em dois follow-ups menores:
- um para endurecer contrato, contexto e rastreabilidade do ticket transversal de workflow;
- outro para herdar validacoes pendentes/manuais da spec na triagem e endurecer os criterios observaveis do pacote derivado.

## Closure criteria
- Requisito/RF/CA coberto: docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes manuais pendentes, docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes obrigatorias ainda nao automatizadas
- Evidencia observavel: o escopo amplo deste ticket e redistribuido em dois follow-ups menores, cada um com objetivo, evidencias e closure criteria observaveis, sem perda de rastreabilidade com o ticket original.

## Decision log
- 2026-03-20 - Ticket aberto automaticamente a partir da retrospectiva sistemica pos-auditoria - follow-up sistemico reaproveitavel identificado com high confidence.
- 2026-03-21 - Revisao manual do ticket concluiu que o escopo mistura duas frentes de melhoria com riscos e superficies diferentes; seguir com split-follow-up melhora clareza, planejamento e rastreabilidade.

## Closure
- Closed at (UTC): 2026-03-21 18:03Z
- Closure reason: split-follow-up
- Related PR/commit/execplan:
  - Follow-up ticket: `tickets/closed/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md`
  - Follow-up ticket: `tickets/open/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md`
  - ExecPlan: `execplans/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md`
  - ExecPlan: `execplans/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md`
- Follow-up ticket (required when `Closure reason: split-follow-up`): tickets/closed/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md ; tickets/open/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
- Resultado final do fechamento: split-follow-up preparatorio, sem implementacao de codigo nesta mudanca.
- Motivo do split:
  - o ticket automatico original mistura contrato do ticket transversal de workflow com regras de heranca de contexto da spec na triagem;
  - as duas frentes tocam artefatos compartilhados, mas possuem objetivos, riscos e validacoes diferentes o bastante para merecer tickets e ExecPlans separados.
- Pendencias redistribuidas:
  - follow-up 1: origem da retrospectiva, contexto cross-repo, paths humanos, campos de audit/review e rastreabilidade request/response/decision do ticket transversal;
  - follow-up 2: heranca de assumptions/defaults e de validacoes pendentes/manuais, endurecimento do checklist/prompt de triagem e criterios observaveis do pacote derivado.
