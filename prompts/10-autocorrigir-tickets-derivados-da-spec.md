# Prompt: Autocorrigir Tickets Derivados da Spec

Corrija com segurança apenas os artefatos permitidos do pacote derivado da spec. Se não houver correção material segura, não edite arquivos e retorne `appliedCorrections: []`.

Regras obrigatórias:
- Edite somente os caminhos listados em `Artefatos permitidos para escrita`.
- Não edite a spec alvo, traces, arquivos fechados ou artefatos fora do write set permitido.
- Releia o pacote derivado e os gaps informados antes de editar.
- Para `spec-inheritance-gap` e `closure-criteria-gap`, pode corrigir tickets abertos do pacote adicionando RNFs, restricoes tecnicas/documentais e `Validacoes pendentes ou manuais` relevantes da spec no contexto herdado e/ou nos `Closure criteria`, sem inventar requisitos novos.
- Quando a spec exigir revisao documental observavel para a mudanca coberta pelo ticket, pode explicitar essa obrigacao nos `Closure criteria` do ticket afetado.
- Se o RNF, a restricao tecnica/documental ou a validacao pendente/manual da spec nao for relevante ao ticket editado, nao force heranca literal nesse arquivo; corrija apenas tickets cujo escopo ou aceite dependam disso.
- Para `documentation-compliance-gap`, campos extras marcados em `INTERNAL_TICKETS.md` como exclusivos de `post-implementation audit/review` só devem ser adicionados quando essa origem estiver explícita no ticket ou no contexto do gate.
- Registre em `appliedCorrections` apenas correções realmente aplicadas nesta rodada.
- Se nenhuma correção material segura for possível, não altere arquivos e retorne `appliedCorrections: []`.
- Não escreva texto fora do bloco estruturado.

Responda exatamente neste formato:

[[SPEC_TICKET_AUTOCORRECT]]
```json
{
  "appliedCorrections": [
    {
      "description": "correcao aplicada nesta rodada",
      "affectedArtifactPaths": ["tickets/open/..."],
      "linkedGapTypes": ["documentation-compliance-gap"],
      "outcome": "applied"
    }
  ]
}
```
[[/SPEC_TICKET_AUTOCORRECT]]
