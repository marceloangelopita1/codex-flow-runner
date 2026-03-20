# Prompt: Executar derivation-gap-analysis antes do /run-all

Execute a subetapa `derivation-gap-analysis` dentro de `spec-ticket-derivation-retrospective`, em contexto novo em relacao a `spec-ticket-validation`.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Regras obrigatorias:
- Fluxo sequencial; execute somente esta etapa.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Confirmar que esta rodada so chegou aqui porque o gate funcional revisou ao menos 1 gap no historico completo de `spec-ticket-validation`.
- Reler a spec, o pacote final de tickets derivados, o historico completo do gate funcional e o estado atual do repositorio antes de concluir.
- Priorizar, no `codex-flow-runner`, a leitura inicial em:
  - `AGENTS.md`;
  - `DOCUMENTATION.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`;
  - `docs/workflows/codex-quality-gates.md`;
  - `prompts/`;
  - trechos de runner/orquestracao apenas quando isso for necessario para sustentar a causa plausivel.
- Quando o projeto avaliado for externo, considerar dois contextos:
  - o projeto corrente onde o gap de derivacao ocorreu;
  - `../codex-flow-runner` como origem potencial da melhoria sistemica.
- Nao reexecutar o gate funcional nem reclassificar o veredito `GO/NO_GO`.
- Nao alterar a spec nem outros artefatos do projeto corrente nesta etapa.
- Nao criar, publicar, fechar ticket, commitar nem fazer push nesta etapa.
- Nao promover sugestao meramente de enfase como gap sistemico.
- Se o contexto do `codex-flow-runner` estiver indisponivel ou insuficiente para uma analise segura, registrar `operational-limitation` em vez de inventar evidencia causal.

## Contexto estruturado da retrospectiva
<WORKFLOW_RETROSPECTIVE_CONTEXT>

Tarefa:
1. Confirmar o modo de entrada `spec-ticket-validation-history` informado no contexto.
2. Avaliar se instrucoes, prompts, contratos, validacoes ou ordem do workflow atual do `codex-flow-runner` contribuiram materialmente para gaps revisados durante a derivacao dos tickets.
3. Distinguir explicitamente:
   - `systemic-gap` com `high confidence` e `publicationEligibility=true`;
   - `systemic-hypothesis` com `medium confidence` e sem ticket automatico;
   - `not-systemic` ou `emphasis-only` sem ticket automatico;
   - `operational-limitation` quando a analise nao puder ser concluida com seguranca.
4. Reportar em texto livre:
   - a conclusao causal;
   - os artefatos relidos;
   - as evidencias principais;
   - se haveria beneficio reaproveitavel antes de consumir a fila real do `/run-all`.
5. Incluir obrigatoriamente ao final da resposta o bloco parseavel abaixo, sem texto extra entre o fechamento do bloco e o fim da resposta:

[[WORKFLOW_GAP_ANALYSIS]]
```json
{
  "classification": "systemic-gap|systemic-hypothesis|not-systemic|emphasis-only|operational-limitation",
  "confidence": "high|medium|low",
  "publicationEligibility": true,
  "inputMode": "spec-ticket-validation-history",
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
