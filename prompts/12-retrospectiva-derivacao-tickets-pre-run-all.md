# Prompt: Executar derivation-gap-analysis antes do /run-all

Execute a subetapa `derivation-gap-analysis` dentro de `spec-ticket-derivation-retrospective`, em contexto novo em relação a `spec-ticket-validation`.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Regras obrigatórias:
- Fluxo sequencial; execute somente esta etapa.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Confirmar que esta rodada só chegou aqui porque o gate funcional revisou ao menos 1 gap no histórico completo de `spec-ticket-validation`.
- Reler a spec, o pacote final de tickets derivados, o histórico completo do gate funcional e o estado atual do repositório antes de concluir.
- Priorizar, no `codex-flow-runner`, a leitura inicial em:
  - `AGENTS.md`;
  - `DOCUMENTATION.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`;
  - `docs/workflows/codex-quality-gates.md`;
  - `prompts/`;
  - trechos de runner/orquestração apenas quando isso for necessário para sustentar a causa plausível.
- Quando o projeto avaliado for externo, considerar dois contextos:
  - o projeto corrente onde o gap de derivação ocorreu;
  - `../codex-flow-runner` como origem potencial da melhoria sistêmica.
- Quando citar artefatos em `workflowArtifactsConsulted`, `followUpTicketPaths` ou `findings[*].affectedArtifactPaths`, deixar explicito a qual contexto cada caminho pertence:
  - artefatos do workflow devem usar `../codex-flow-runner/...` quando o projeto avaliado for externo;
  - artefatos do projeto avaliado devem permanecer em caminho relativo ao projeto corrente;
  - nao misturar referencias ambiguas sem contexto de repositorio.
- Não reexecutar o gate funcional nem reclassificar o veredito `GO/NO_GO`.
- Não alterar a spec nem outros artefatos do projeto corrente nesta etapa.
- Não criar, publicar, fechar ticket, commitar nem fazer push nesta etapa.
- Não promover sugestão meramente de ênfase como gap sistêmico.
- Se o contexto do `codex-flow-runner` estiver indisponível ou insuficiente para uma análise segura, registrar `operational-limitation` em vez de inventar evidência causal.

## Contexto estruturado da retrospectiva
<WORKFLOW_RETROSPECTIVE_CONTEXT>

Tarefa:
1. Confirmar o modo de entrada `spec-ticket-validation-history` informado no contexto.
2. Avaliar se instruções, prompts, contratos, validações ou ordem do workflow atual do `codex-flow-runner` contribuíram materialmente para gaps revisados durante a derivação dos tickets.
3. Distinguir explicitamente:
   - `systemic-gap` com `high confidence` e `publicationEligibility=true`;
   - `systemic-hypothesis` com `medium confidence` e sem ticket automático;
   - `not-systemic` ou `emphasis-only` sem ticket automatico;
   - `operational-limitation` quando a análise não puder ser concluída com segurança.
4. Reportar em texto livre:
   - a conclusão causal;
   - os artefatos relidos;
   - as evidências principais;
   - se haveria benefício reaproveitável antes de consumir a fila real do `/run-all`.
   - quando `publicationEligibility=true`, garantir que os caminhos citados permitam ao publisher distinguir projeto avaliado de repositório do workflow sem ambiguidade.
5. Incluir obrigatoriamente ao final da resposta o bloco parseável abaixo, sem texto extra entre o fechamento do bloco e o fim da resposta:

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
      "summary": "achado sistêmico objetivo",
      "affectedArtifactPaths": ["caminho/relativo.md"],
      "requirementRefs": ["RF-00", "CA-00"],
      "evidence": ["evidência observável"]
    }
  ],
  "workflowArtifactsConsulted": ["AGENTS.md", "prompts/..."],
  "followUpTicketPaths": ["tickets/open/..."],
  "limitation": null
}
```
[[/WORKFLOW_GAP_ANALYSIS]]

Regras do bloco parseável:
- `publicationEligibility=true` só é válido com `classification=systemic-gap` e `confidence=high`.
- `systemic-hypothesis` deve usar `confidence=medium`.
- `findings` pode ser vazio apenas em `not-systemic`, `emphasis-only` ou `operational-limitation`.
- `limitation` deve ser `null` exceto quando `classification=operational-limitation`.
- Quando `classification=operational-limitation`, use:
  - `"code": "analysis-execution-failed" | "invalid-analysis-contract" | "workflow-repo-context-missing"`
  - `"detail": "<explicação objetiva>"`
