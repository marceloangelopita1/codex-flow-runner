# Prompt: Estruturar gaps readiness elegiveis para `/target_derive_gaps`

Voce esta analisando um relatorio canonico de readiness checkup ja validado deterministicamente.

Objetivo:
- agrupar apenas gaps readiness reais por unidade de remediacao;
- propor somente um payload estruturado para o executor local decidir materializacao, dedupe e write-back;
- nunca inventar fatos fora do relatorio serializado.

Regras obrigatorias:
- Use somente os fatos serializados neste prompt.
- Nao invente arquivos, comandos, evidencias, riscos, tickets existentes, recorrencias nem status git.
- Nao tente decidir reuso de ticket aberto, recorrencia de ticket fechado, commit ou push; isso e responsabilidade do codigo.
- Cada gap precisa ser uma unidade real de remediacao, nao uma lista bruta de sintomas desconexos.
- Todo gap precisa carregar `fingerprintBasis` estavel, `priority` valida (1-5 em cada eixo), `remediationSurface` observavel e `closureCriteria` utilizaveis.
- Use `materializationDecision = "materialize"` apenas quando houver acao local executavel no projeto alvo com evidencia suficiente.
- Use `materializationDecision = "blocked"` quando o gap for real, relevante e depender de insumo/decisao externa sem proximo passo local executavel; nesse caso, `externalDependency` e obrigatorio.
- Use `materializationDecision = "informational"` para itens informativos, redundantes ou sem necessidade de ticket.
- Use `materializationDecision = "insufficient_specificity"` quando faltar especificidade suficiente para um ticket autocontido e forte.
- Use `materializationDecision = "runner_limitation"` quando a remediacao morar no proprio runner, e nao no projeto alvo.
- Nao escreva Markdown editorial, explicacoes fora do bloco ou cercas de codigo extras.

Taxonomias permitidas:
- `gapType`: `preparation`, `documentation`, `operability`, `validation`, `observability`, `runner_limitation`
- `checkupDimension`: `preparation_integrity`, `local_operability`, `validation_delivery_health`, `documentation_governance`, `observability`
- `materializationDecision`: `materialize`, `blocked`, `informational`, `insufficient_specificity`, `runner_limitation`

Formato obrigatorio de resposta:
[[TARGET_DERIVE_GAP_ANALYSIS]]
```json
{
  "summary": "resumo curto e auditavel da rodada",
  "gaps": [
    {
      "title": "titulo curto do gap",
      "summary": "descricao objetiva do problema observado",
      "gapType": "validation",
      "checkupDimension": "validation_delivery_health",
      "materializationDecision": "materialize",
      "remediationSurface": ["package.json", "README.md"],
      "evidence": ["evidencia objetiva derivada do relatorio"],
      "assumptionsDefaults": ["assumption/default relevante herdado do relatorio, se houver"],
      "validationNotes": ["como validar a remediacao no projeto alvo"],
      "closureCriteria": ["criterio observavel para encerrar o ticket"],
      "fingerprintBasis": ["base deterministica do fingerprint"],
      "priority": {
        "severity": 4,
        "frequency": 4,
        "costOfDelay": 3,
        "operationalRisk": 3
      },
      "externalDependency": null
    }
  ]
}
```
[[/TARGET_DERIVE_GAP_ANALYSIS]]

Contexto adicional:
- Runner repo de referencia: `<RUNNER_REPO_PATH>`
- Referencia textual do runner: `<RUNNER_REFERENCE>`
- Projeto alvo: `<TARGET_PROJECT_NAME>`
- Caminho do projeto alvo: `<TARGET_PROJECT_PATH>`
- Artefato JSON do relatorio: `<TARGET_DERIVE_REPORT_JSON_PATH>`
- Artefato Markdown do relatorio: `<TARGET_DERIVE_REPORT_MARKDOWN_PATH>`

Payload factual serializado:
<TARGET_DERIVE_FACTS_JSON>
