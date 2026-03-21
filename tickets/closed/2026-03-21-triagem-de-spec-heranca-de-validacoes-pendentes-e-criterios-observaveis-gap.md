# [TICKET] Herdar validacoes pendentes da spec na triagem e endurecer criterios observaveis do pacote derivado

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-21 18:03Z
- Reporter: Codex
- Owner: Codex
- Source: local-run
- Parent ticket (optional): tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md
- Parent execplan (optional): execplans/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
- Parent commit (optional):
- Request ID: N/A - follow-up manual derivado de revisao do ticket pai
- Source spec (when applicable): ../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md
- Source requirements (RFs/CAs, when applicable): ../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes obrigatorias ainda nao automatizadas, ../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md::Validacoes manuais pendentes
- Inherited assumptions/defaults (when applicable): validacoes obrigatorias/manuais pendentes da spec precisam sobreviver na derivacao quando forem relevantes para cobertura e aceite dos tickets derivados; headings equivalentes como `Assumptions and defaults` e `Premissas e defaults` nao devem zerar a heranca de contexto; o gate deve conseguir detectar e corrigir ausencia dessa heranca antes da rodada real.
- Workflow root cause (required for workflow retrospectives or post-implementation audit/review): systemic-instruction
- Smallest plausible explanation (workflow retrospectives/audit/review): o contrato compartilhado de triagem e validacao prioriza RFs/CAs, assumptions/defaults e nao-escopo, mas nao promove de forma explicita `Validacoes pendentes ou manuais` como item obrigatorio de heranca para os tickets derivados; em paralelo, a extracao de assumptions/defaults depende de heading exato e perde contexto quando a spec usa variante conhecida.
- Remediation scope (workflow retrospectives/audit/review): generic-repository-instruction
- Related artifacts:
  - Request file: N/A - o ticket pai nao preservou a trilha da retrospectiva que o originou
  - Response file: N/A - o ticket pai nao preservou a trilha da retrospectiva que o originou
  - Decision file: N/A - a evidencia veio do historico funcional resumido no ticket pai
- Related docs/execplans:
  - tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md
  - ../codex-flow-runner/docs/specs/2026-02-19-approved-spec-triage-run-specs.md
  - ../codex-flow-runner/docs/workflows/codex-quality-gates.md
  - ../codex-flow-runner/prompts/01-avaliar-spec-e-gerar-tickets.md
  - ../codex-flow-runner/prompts/09-validar-tickets-derivados-da-spec.md
  - ../codex-flow-runner/prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - ../codex-flow-runner/SPECS.md
  - ../codex-flow-runner/docs/specs/templates/spec-template.md
  - ../codex-flow-runner/src/core/runner.ts
  - execplans/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): a ausencia dessa heranca produz pacote derivado incompleto e ciclo extra de `NO_GO -> autocorrecao -> GO` antes mesmo de consumir a fila real; como o contrato de triagem e compartilhado, a lacuna e potencialmente recorrente para outras specs.

## Context
- Workflow area: `spec-triage` -> `spec-ticket-validation` -> `spec-ticket-derivation-retrospective`
- Scenario: uma spec aprovada possui `Validacoes pendentes ou manuais` e assumptions/defaults relevantes que precisam sobreviver para os tickets derivados e para os closure criteria do pacote antes do `/run-all`
- Input constraints: manter o contrato canonico `spec -> tickets`; nao introduzir heuristica frouxa por ticket; tornar a heranca observavel no checklist/prompt/gate e robusta a aliases de heading conhecidos

## Problem statement
O fluxo atual de triagem e validacao do pacote derivado nao torna explicita a heranca de `Validacoes pendentes ou manuais` da spec, mesmo quando elas sao relevantes para cobertura e aceite dos tickets derivados. Alem disso, a extracao de assumptions/defaults para handoffs e tickets sistemicos depende de heading exato, o que perde contexto em projetos alvo que usam variante conhecida como `Premissas e defaults`. O resultado e um pacote derivado que pode parecer suficiente na triagem inicial, mas exigir correcao adicional no gate funcional.

## Observed behavior
- O que foi observado: o checklist compartilhado e o prompt 01 mandam extrair RFs, CAs, assumptions/defaults e nao-escopo, mas nao tratam `Validacoes pendentes ou manuais` como heranca obrigatoria; a spec alvo usava `Premissas e defaults`, mas o extrator de assumptions/defaults do runner procura apenas `Assumptions and defaults`; o gate funcional precisou revisar manualmente o pacote antes do `GO`.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): historico funcional resumido no ticket pai, leitura dos prompts/checklist compartilhados e conferencia da spec alvo externa

## Expected behavior
A triagem da spec deve herdar de forma explicita validacoes pendentes/manuais relevantes e assumptions/defaults equivalentes para os tickets derivados, e o gate do pacote deve tratar a ausencia dessa heranca como gap observavel antes do `/run-all`.

## Reproduction steps
1. Ler a spec alvo externa e observar as secoes `Premissas e defaults` e `Validacoes pendentes ou manuais`.
2. Ler `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` e verificar que a heranca obrigatoria dessas validacoes nao esta explicita.
3. Ler `prompts/09-validar-tickets-derivados-da-spec.md` e confirmar que hoje o gate nao explicita essa ausencia como caso esperado de `spec-inheritance-gap`/`closure-criteria-gap`.

## Evidence
- Logs relevantes (trechos curtos e redigidos): o ticket pai registrou que o ciclo 0 ficou em `NO_GO` porque o pacote derivado nao amarrava validacoes pendentes da spec; o ciclo 1 virou `GO` apos carregar ao menos duas dessas validacoes para tickets funcionais.
- Warnings/codes relevantes:
  - `docs/workflows/codex-quality-gates.md` lista RFs, CAs, assumptions/defaults e nao-escopo, sem item equivalente para `Validacoes pendentes ou manuais`.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` nao manda herdar explicitamente essas validacoes para contexto ou closure criteria dos tickets.
  - `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` nao tornam essa omissao uma verificacao/auto-correcao explicita.
  - `src/core/runner.ts` extrai assumptions/defaults a partir de heading exato em ingles, o que nao cobre `Premissas e defaults`.
- Comparativo antes/depois (se houver): antes = pacote derivado pode depender de revisao corretiva do gate para incorporar validacoes pendentes relevantes; depois esperado = triagem e gate absorvem essa heranca de forma deterministica e observavel

## Impact assessment
- Impacto funcional: tickets derivados podem parecer completos e ainda assim omitir validacoes criticas da spec.
- Impacto operacional: o runner gasta uma rodada adicional de validacao/autocorrecao para corrigir uma omissao contratual evitavel.
- Risco de regressao: medio, porque o ajuste toca checklist compartilhado, prompt de triagem, gate funcional, auto-correcao e extracao de contexto.
- Scope estimado (quais fluxos podem ser afetados): `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/09-validar-tickets-derivados-da-spec.md`, `prompts/10-autocorrigir-tickets-derivados-da-spec.md`, `SPECS.md`, `docs/specs/templates/spec-template.md`, `src/core/runner.ts` e testes associados

## Initial hypotheses (optional)
- A correcao mais robusta e promover `Validacoes pendentes ou manuais` a item explicito do contrato compartilhado de triagem e do gate do pacote derivado, e tratar aliases conhecidos de headings de spec como entrada valida para heranca de assumptions/defaults.

## Proposed solution (optional)
- Atualizar checklist e prompt de triagem para obrigar a heranca dessas validacoes quando relevantes, endurecer o gate para detectar sua ausencia como `spec-inheritance-gap`/`closure-criteria-gap`, permitir autocorrecao segura e tornar a extracao de assumptions/defaults resiliente a headings equivalentes.

## Closure criteria
- Requisito/RF/CA coberto: contrato compartilhado de triagem de spec
- Evidencia observavel: `docs/workflows/codex-quality-gates.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` passam a tratar `Validacoes pendentes ou manuais` como item explicito de heranca quando presente na spec e relevante para os tickets derivados.
- Requisito/RF/CA coberto: heranca de assumptions/defaults
- Evidencia observavel: o fluxo passa a suportar ao menos `Assumptions and defaults` e `Premissas e defaults` para extrair contexto de heranca usado na derivacao.
- Requisito/RF/CA coberto: gate do pacote derivado
- Evidencia observavel: `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md` passam a tornar observavel e corrigivel a ausencia dessa heranca antes do `/run-all`.
- Requisito/RF/CA coberto: prova funcional do contrato
- Evidencia observavel: testes ou fixture deterministica mostram uma spec com validacoes pendentes/manuais gerando tickets derivados que carregam essas validacoes no contexto e/ou nos closure criteria relevantes.

## Decision log
- 2026-03-21 - Ticket aberto manualmente a partir da revisao do ticket pai - a melhoria substantiva que motivou o follow-up automatico precisa ser isolada em ticket proprio, com evidencias e closure criteria mais especificos do que o backlog sistemico amplo original.
- 2026-03-21 - Implementacao concluida com checklist/prompt/gate endurecidos, extracao alias-aware para `Assumptions and defaults`/`Premissas e defaults` e prova automatizada do contexto herdado na retrospectiva pre-`/run-all`.

## Closure
- Closed at (UTC): 2026-03-21 19:08Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
- Follow-up ticket (required when `Closure reason: split-follow-up`):
