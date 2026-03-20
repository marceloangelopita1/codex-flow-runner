# [TICKET] Melhoria transversal de workflow derivada de estratégia v3 de custos e bid para CAIXA extrajudicial com overlay de funding

## Metadata
- Status: open
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
- Source requirements (RFs/CAs, when applicable): docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validações manuais pendentes, docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validações obrigatórias ainda não automatizadas
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
- Justificativa objetiva (evidencias e impacto): gaps sistemicos observados com alta confianca durante workflow-gap-analysis pos-auditoria.

## Context
- Workflow area: spec-workflow-retrospective -> workflow-ticket-publication
- Scenario: a retrospectiva sistemica da spec 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md concluiu elegibilidade automatica com input mode spec-ticket-validation-history.
- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.

## Problem statement
A retrospectiva pos-auditoria da spec 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md encontrou evidencia de que o workflow atual contribuiu materialmente para gaps residuais reaproveitaveis. O follow-up precisa capturar a menor correcao plausivel no proprio workflow para reduzir recorrencia em specs futuras.

## Observed behavior
- O que foi observado:
- O contrato operacional de spec-triage nao pede explicitamente que validacoes obrigatorias/manuais pendentes da spec sejam carregadas para os tickets derivados ou seus criterios de fechamento.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): workflow-gap-analysis com high confidence apos spec-audit

## Expected behavior
O workflow deve prevenir ou absorver automaticamente a causa sistemica registrada, reduzindo a recorrencia observada em 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md e em specs futuras equivalentes.

## Reproduction steps
1. Executar /run_specs para 2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md.
2. Revisar o resultado de spec-audit e os follow-ups funcionais abertos para a spec auditada.
3. Observar workflow-gap-analysis e confirmar o diagnostico causal com evidencia suficiente para backlog sistemico reaproveitavel.

## Evidence
- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = A triagem de spec do codex-flow-runner nao exige herdar validacoes pendentes/manuais da spec para os tickets derivados, e essa omissao contribuiu diretamente para o unico gap que o gate funcional precisou revisar antes do GO.
- Warnings/codes relevantes:
- O contrato operacional de spec-triage nao pede explicitamente que validacoes obrigatorias/manuais pendentes da spec sejam carregadas para os tickets derivados ou seus criterios de fechamento.
  - Requisitos relacionados: docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validações manuais pendentes, docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validações obrigatórias ainda não automatizadas
  - Artefatos afetados: ../codex-flow-runner/docs/specs/2026-02-19-approved-spec-triage-run-specs.md, ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - Evidencias: No historico completo do gate funcional, o ciclo 0 ficou em NO_GO porque o pacote nao amarrava validacoes pendentes da spec; o ciclo 1 virou GO apos adicionar ao menos duas dessas validacoes aos tickets de matriz de custos e de bridge downstream. | O checklist de triagem em docs/workflows/codex-quality-gates.md lista RFs, CAs, assumptions/defaults e nao-escopo, sem item equivalente para validacoes pendentes/manuais. | O prompt 01 manda extrair RFs e CAs e preencher source requirements, assumptions/defaults e closure criteria, mas nao menciona herdanca de validacoes pendentes/manuais.
  - Fingerprint: workflow-finding|b1f0d04e9a51
- Tickets funcionais considerados: fallback controlado em spec + resultado do spec-audit
- Hipotese causal consolidada: O prompt de spec-triage e o checklist compartilhado modelam a derivacao em torno de RFs/CAs, assumptions/defaults e nao-escopo, mas nao incluem a transferencia obrigatoria de validacoes pendentes/manuais da spec para contexto ou closure criteria dos tickets.
- Beneficio esperado consolidado: Adicionar essa heranca explicitamente no prompt/checklist de triagem reduz pacotes derivados incompletos, evita um ciclo extra de NO_GO -> autocorrecao -> GO e preserva validacoes operacionais relevantes antes do /run-all.
- Comparativo antes/depois (se houver): fingerprints sistemicos = workflow-finding|b1f0d04e9a51

## Impact assessment
- Impacto funcional: novos pacotes derivados podem repetir a mesma lacuna sistemica.
- Impacto operacional: o runner depende de follow-up manual para melhorar o proprio workflow.
- Risco de regressao: medio, porque a correcao tende a tocar instrucoes canonicas, prompts, validacoes ou ordem das etapas compartilhadas.
- Scope estimado (quais fluxos podem ser afetados): ../codex-flow-runner/docs/specs/2026-02-19-approved-spec-triage-run-specs.md, ../codex-flow-runner/docs/workflows/codex-quality-gates.md, ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md.

## Initial hypotheses (optional)
- O prompt de spec-triage e o checklist compartilhado modelam a derivacao em torno de RFs/CAs, assumptions/defaults e nao-escopo, mas nao incluem a transferencia obrigatoria de validacoes pendentes/manuais da spec para contexto ou closure criteria dos tickets.

## Proposed solution (optional)
- Adicionar essa heranca explicitamente no prompt/checklist de triagem reduz pacotes derivados incompletos, evita um ciclo extra de NO_GO -> autocorrecao -> GO e preserva validacoes operacionais relevantes antes do /run-all.

## Closure criteria
- Requisito/RF/CA coberto: docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validações manuais pendentes, docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validações obrigatórias ainda não automatizadas
- Evidencia observavel: a causa sistemica registrada neste ticket deixa de reaparecer em uma rodada equivalente de workflow-gap-analysis/workflow-ticket-publication, com rastreabilidade objetiva nos artefatos afetados.

## Decision log
- 2026-03-20 - Ticket aberto automaticamente a partir da retrospectiva sistemica pos-auditoria - follow-up sistemico reaproveitavel identificado com high confidence.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
