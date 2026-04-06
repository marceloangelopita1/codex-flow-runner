# Prompt: Revisão semântica bounded de `/target_investigate_case`

Você está executando apenas a subetapa bounded de `semantic-review` para uma rodada já materializada de `/target_investigate_case`.

Objetivo:
- avaliar semanticamente o caso usando somente o packet e o contexto mínimo serializados neste prompt;
- respeitar que o projeto alvo continua sendo a autoridade semântica final do `assessment.json`;
- devolver somente um JSON estrito compatível com `semantic-review.result.json`;
- não descobrir evidência nova e não ler o repositório por conta própria.

Regras obrigatórias:
- Trabalhe apenas com o `semantic-review.request.json` e com o contexto bounded já extraído pelo runner.
- Não leia arquivos, não execute comandos e não procure contexto adicional no repositório alvo.
- Não use superfícies, sinais, paths ou evidências fora das declaradas no packet.
- Não reescreva o contrato do alvo e não tome a autoridade final de `assessment` ou `publication`.
- Quando o packet trouxer `symptom_selection` e `symptom_candidates`, trate-os como priorização bounded já decidida pelo projeto alvo.
- Não promova candidatos alternativos, não invente sintomas novos e não amplie `target_fields` ou `supporting_refs`.
- Se a evidência bounded não for suficiente para confirmar erro nem comportamento esperado, devolva `verdict = "inconclusive"`.
- Replique os `supporting_refs` relevantes do packet apenas quando eles realmente sustentarem o veredito.
- Preencha `field_verdicts` apenas para os campos declarados no packet.
- Reconheça explicitamente as constraints:
  - `declared_surfaces_only = true`
  - `new_evidence_discovery_allowed = false`

JSON de saída obrigatório:
- `schema_version`: `semantic_review_result_v1`
- `generated_at`: string ISO-8601
- `request_artifact`: `semantic-review.request.json`
- `reviewer`:
  - `orchestrator`: `codex-flow-runner`
  - `reviewer_label`: string curta
- `verdict`: `confirmed_error | expected_behavior | inconclusive`
- `issue_type`: `semantic_truncation | contract_mismatch | scope_confusion | data_anomaly | observability_limit | unknown`
- `confidence`: `low | medium | high`
- `owner_hint`: `target-project | runner | shared`
- `actionable`: boolean
- `summary`: string
- `supporting_refs`: array
- `field_verdicts`: array
  - cada item deve ser um objeto estrito com:
    - `field_path`: string exatamente igual a um campo declarado no packet
    - `json_pointer`: string exatamente igual ao ponteiro declarado para o mesmo campo
    - `verdict`: `supports_error | supports_expected_behavior | not_assessed`
    - `summary`: string curta
  - não inclua chaves extras em `field_verdicts` (por exemplo `artifact_path`, `issue_type`, `confidence`)
- `constraints_acknowledged`:
  - `declared_surfaces_only`: true
  - `new_evidence_discovery_allowed`: false

Formato da resposta:
- Responda com JSON puro.
- Não use Markdown.
- Não use cercas de código.
- Não escreva explicações fora do JSON.

## Contexto adicional
- Runner repo de referência: `<RUNNER_REPO_PATH>`
- Referência textual do runner: `<RUNNER_REFERENCE>`
- Projeto alvo: `<TARGET_PROJECT_NAME>`
- Caminho do projeto alvo: `<TARGET_PROJECT_PATH>`
- Manifesto da capability: `<TARGET_INVESTIGATE_CASE_MANIFEST_PATH>`
- Packet de entrada: `<TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_PATH>`
- Artefato de saída esperado: `<TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_PATH>`

## Packet bounded de entrada
<TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_JSON>

Observação:
- O packet pode incluir `symptom_selection.source = operator | strong_candidate | none`.
- O packet pode incluir `symptom_candidates` bounded; use-os apenas como contexto declarado, nunca como gatilho para descoberta livre.

## Contexto mínimo extraído pelo runner
<TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_CONTEXT_JSON>
