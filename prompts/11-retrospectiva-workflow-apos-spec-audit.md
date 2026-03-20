# Prompt: Executar workflow-gap-analysis após spec-audit

Execute a subetapa `workflow-gap-analysis` dentro de `spec-workflow-retrospective`, em contexto novo em relação a `spec-audit`.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Regras obrigatórias:
- Fluxo sequencial; execute somente esta etapa.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Confirmar que esta rodada só chegou aqui porque o `spec-audit` encontrou gaps residuais reais.
- Reler a spec, o resultado do `spec-audit`, os follow-up tickets funcionais quando existirem e o estado atual do repositório antes de concluir.
- Reler também o contexto causal pre-run-all recebido; a mesma frente causal já tratada antes do `/run-all` não pode ser promovida novamente como backlog automático.
- Priorizar, no `codex-flow-runner`, a leitura inicial em:
  - `AGENTS.md`;
  - `DOCUMENTATION.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`;
  - `docs/workflows/codex-quality-gates.md`;
  - `prompts/`;
  - trechos de runner/orquestração apenas quando isso for necessário para sustentar a causa plausível.
- Quando o projeto auditado for externo, considerar dois contextos:
  - o projeto corrente onde o gap ocorreu;
  - `../codex-flow-runner` como origem potencial da melhoria sistêmica.
- Não reexecutar a auditoria funcional da spec.
- Não alterar a spec do projeto corrente nesta etapa.
- Não criar, publicar, fechar ticket, commitar nem fazer push nesta etapa.
- Não promover sugestão meramente de ênfase como gap sistêmico.
- Se o contexto do `codex-flow-runner` estiver indisponível ou insuficiente para uma análise segura, registrar `operational-limitation` em vez de inventar evidência causal.

## Contexto estruturado da retrospectiva
<WORKFLOW_RETROSPECTIVE_CONTEXT>

Tarefa:
1. Confirmar o modo de entrada (`follow-up-tickets` ou `spec-and-audit-fallback`) informado no contexto.
2. Avaliar se instruções, prompts, contratos, validações ou ordem do workflow atual do `codex-flow-runner` contribuíram materialmente para o gap residual auditado.
3. Distinguir explicitamente:
   - `systemic-gap` com `high confidence` e `publicationEligibility=true`;
   - `systemic-hypothesis` com `medium confidence` e sem ticket automático;
   - `not-systemic` ou `emphasis-only` sem ticket automatico;
   - `operational-limitation` quando a análise não puder ser concluída com segurança.
4. Quando o contexto pre-run-all mostrar que a mesma frente causal já foi tratada antes do `/run-all`, registrar apenas referência histórica estruturada e manter `publicationEligibility=false`.
5. Reportar em texto livre:
   - a conclusão causal;
   - os artefatos relidos;
   - as evidências principais;
   - se haveria benefício reaproveitável para specs futuras.
6. Incluir obrigatoriamente ao final da resposta o bloco parseável abaixo, sem texto extra entre o fechamento do bloco e o fim da resposta:

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
      "summary": "achado sistêmico objetivo",
      "affectedArtifactPaths": ["caminho/relativo.md"],
      "requirementRefs": ["RF-00", "CA-00"],
      "evidence": ["evidência observável"]
    }
  ],
  "workflowArtifactsConsulted": ["AGENTS.md", "prompts/..."],
  "followUpTicketPaths": ["tickets/open/..."],
  "limitation": null,
  "historicalReference": {
    "summary": "frente causal ja tratada antes do /run-all",
    "ticketPath": "tickets/open/...",
    "findingFingerprints": ["workflow-finding|abc123def456"]
  }
}
```
[[/WORKFLOW_GAP_ANALYSIS]]

Regras do bloco parseável:
- `publicationEligibility=true` só é válido com `classification=systemic-gap` e `confidence=high`.
- `systemic-hypothesis` deve usar `confidence=medium`.
- `findings` pode ser vazio apenas em `not-systemic`, `emphasis-only` ou `operational-limitation`.
- `limitation` deve ser `null` exceto quando `classification=operational-limitation`.
- `historicalReference` deve ser `null` quando não houver overlap causal pre-run-all.
- Se a mesma frente causal já tiver sido tratada na retrospectiva pre-run-all, `historicalReference` deve apontar para o ticket/achado preexistente e `publicationEligibility` deve permanecer `false`.
- Quando `historicalReference` for objeto, use exatamente:
  - `"summary": "<resumo objetivo>"`
  - `"ticketPath": "tickets/open/..." | null`
  - `"findingFingerprints": ["workflow-finding|..."]`
- Não usar o campo singular `"fingerprint"`; o contrato canônico exige `"findingFingerprints"` como lista.
- Quando `classification=operational-limitation`, use:
  - `"code": "analysis-execution-failed" | "invalid-analysis-contract" | "workflow-repo-context-missing"`
  - `"detail": "<explicação objetiva>"`
