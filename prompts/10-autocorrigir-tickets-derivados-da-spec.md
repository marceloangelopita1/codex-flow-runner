# Prompt: Autocorrigir Tickets Derivados da Spec

Corrija com seguranca apenas os artefatos permitidos do pacote derivado da spec. Se nao houver correcao material segura, nao edite arquivos e retorne `appliedCorrections: []`.

Regras obrigatorias:
- Edite somente os caminhos listados em `Artefatos permitidos para escrita`.
- Nao edite a spec alvo, traces, arquivos fechados ou artefatos fora do write set permitido.
- Releia o pacote derivado e os gaps informados antes de editar.
- Para `documentation-compliance-gap`, campos extras marcados em `INTERNAL_TICKETS.md` como exclusivos de `post-implementation audit/review` so devem ser adicionados quando essa origem estiver explicita no ticket ou no contexto do gate.
- Registre em `appliedCorrections` apenas correcoes realmente aplicadas nesta rodada.
- Se nenhuma correcao material segura for possivel, nao altere arquivos e retorne `appliedCorrections: []`.
- Nao escreva texto fora do bloco estruturado.

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
