# Prompt: Validar Tickets Derivados da Spec

Valide o pacote derivado de tickets da spec alvo e decida `GO` ou `NO_GO` com critério objetivo.

Regras obrigatórias:
- O primeiro passe desta etapa deve iniciar em contexto novo; não reutilize implicitamente contexto ou `thread_id` de `spec-triage`.
- Revalidacoes desta mesma etapa podem reutilizar apenas o contexto da validação corrente.
- Avalie o pacote derivado inteiro, nunca ticket isolado fora do contexto do backlog derivado.
- Para `documentation-compliance-gap`, aplique o contrato documental conforme a origem do ticket:
  - campos extras marcados em `INTERNAL_TICKETS.md` como exclusivos de `post-implementation audit/review` so são obrigatorios quando o próprio ticket ou o contexto do gate indicarem explicitamente essa origem;
  - tickets derivados de `spec-triage` não devem receber `documentation-compliance-gap` por ausencia desses campos exclusivos, salvo se o contrato canônico do repositório tiver sido ampliado explicitamente no próprio contexto fornecido.
- Use apenas a taxonomia fixa abaixo:
  - `coverage-gap`
  - `scope-justification-gap`
  - `granularity-gap`
  - `duplication-gap`
  - `closure-criteria-gap`
  - `spec-inheritance-gap`
  - `documentation-compliance-gap`
- Para cada gap, registre evidências objetivas, causa-raiz provavel, `isAutoCorrectable` e referências de RF/CA quando existirem.
- `probableRootCause` deve usar apenas:
  - `spec`
  - `ticket`
  - `execplan`
  - `execution`
  - `validation`
  - `external/manual`
- `confidence` deve usar apenas `low`, `medium` ou `high`.
- `verdict` deve usar apenas `GO` ou `NO_GO`.
- `appliedCorrections` deve listar apenas correções realmente aplicadas nesta rodada.
- Não escreva texto fora do bloco estruturado.

Responda exatamente neste formato:

[[SPEC_TICKET_VALIDATION]]
```json
{
  "verdict": "GO | NO_GO",
  "confidence": "low | medium | high",
  "summary": "resumo objetivo do veredito",
  "gaps": [
    {
      "gapType": "coverage-gap",
      "summary": "descricao objetiva do gap",
      "affectedArtifactPaths": ["tickets/open/..."],
      "requirementRefs": ["RF-01", "CA-01"],
      "evidence": ["evidencia objetiva 1"],
      "probableRootCause": "ticket",
      "isAutoCorrectable": true
    }
  ],
  "appliedCorrections": [
    {
      "description": "correcao aplicada nesta rodada",
      "affectedArtifactPaths": ["tickets/open/..."],
      "linkedGapTypes": ["coverage-gap"],
      "outcome": "applied"
    }
  ]
}
```
[[/SPEC_TICKET_VALIDATION]]
