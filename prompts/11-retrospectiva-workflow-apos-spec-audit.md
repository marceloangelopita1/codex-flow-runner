# Prompt: Executar workflow-gap-analysis apos spec-audit

Execute a subetapa `workflow-gap-analysis` dentro de `spec-workflow-retrospective`, em contexto novo em relacao a `spec-audit`.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Regras obrigatorias:
- Fluxo sequencial; execute somente esta etapa.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Confirmar que esta rodada so chegou aqui porque o `spec-audit` encontrou gaps residuais reais.
- Reler a spec, o resultado do `spec-audit`, os follow-up tickets funcionais quando existirem e o estado atual do repositorio antes de concluir.
- Priorizar, no `codex-flow-runner`, a leitura inicial em:
  - `AGENTS.md`;
  - `DOCUMENTATION.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`;
  - `docs/workflows/codex-quality-gates.md`;
  - `prompts/`;
  - trechos de runner/orquestracao apenas quando isso for necessario para sustentar a causa plausivel.
- Quando o projeto auditado for externo, considerar dois contextos:
  - o projeto corrente onde o gap ocorreu;
  - `../codex-flow-runner` como origem potencial da melhoria sistemica.
- Nao reexecutar a auditoria funcional da spec.
- Nao alterar a spec do projeto corrente nesta etapa.
- Nao criar, publicar, fechar ticket, commitar nem fazer push nesta etapa.
- Nao promover sugestao meramente de enfase como gap sistemico.
- Se o contexto do `codex-flow-runner` estiver indisponivel ou insuficiente para uma analise segura, registrar `operational-limitation` em vez de inventar evidencia causal.

## Contexto estruturado da retrospectiva
<WORKFLOW_RETROSPECTIVE_CONTEXT>

Tarefa:
1. Confirmar o modo de entrada (`follow-up-tickets` ou `spec-and-audit-fallback`) informado no contexto.
2. Avaliar se instrucoes, prompts, contratos, validacoes ou ordem do workflow atual do `codex-flow-runner` contribuiram materialmente para o gap residual auditado.
3. Distinguir explicitamente:
   - `systemic-gap` com `high confidence` e `publicationEligibility=true`;
   - `systemic-hypothesis` com `medium confidence` e sem ticket automatico;
   - `not-systemic` ou `emphasis-only` sem ticket automatico;
   - `operational-limitation` quando a analise nao puder ser concluida com seguranca.
4. Reportar em texto livre:
   - a conclusao causal;
   - os artefatos relidos;
   - as evidencias principais;
   - se haveria beneficio reaproveitavel para specs futuras.
5. Incluir obrigatoriamente ao final da resposta o bloco parseavel abaixo, sem texto extra entre o fechamento do bloco e o fim da resposta:

[[WORKFLOW_GAP_ANALYSIS]]
```json
{
  "classification": "systemic-gap|systemic-hypothesis|not-systemic|emphasis-only|operational-limitation",
  "confidence": "high|medium|low",
  "publicationEligibility": true,
  "inputMode": "follow-up-tickets|spec-and-audit-fallback",
  "summary": "resumo objetivo da conclusao",
  "causalHypothesis": "menor causa plausivel do workflow",
  "benefitSummary": "como a melhoria reduziria recorrencia futura",
  "findings": [
    {
      "summary": "achado sistemico objetivo",
      "affectedArtifactPaths": ["caminho/relativo.md"],
      "requirementRefs": ["RF-00", "CA-00"],
      "evidence": ["evidencia observavel"]
    }
  ],
  "workflowArtifactsConsulted": ["AGENTS.md", "prompts/..."],
  "followUpTicketPaths": ["tickets/open/..."],
  "limitation": null
}
```
[[/WORKFLOW_GAP_ANALYSIS]]

Regras do bloco parseavel:
- `publicationEligibility=true` so e valido com `classification=systemic-gap` e `confidence=high`.
- `systemic-hypothesis` deve usar `confidence=medium`.
- `findings` pode ser vazio apenas em `not-systemic`, `emphasis-only` ou `operational-limitation`.
- `limitation` deve ser `null` exceto quando `classification=operational-limitation`.
- Quando `classification=operational-limitation`, use:
  - `"code": "analysis-execution-failed" | "invalid-analysis-contract" | "workflow-repo-context-missing"`
  - `"detail": "<explicacao objetiva>"`
