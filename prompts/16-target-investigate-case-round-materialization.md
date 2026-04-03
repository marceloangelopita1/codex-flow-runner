# Prompt: Materializar rodada real do `/target_investigate_case` no projeto alvo

Você está executando apenas a materialização da rodada real de `case-investigation` no repositório alvo atual.

Objetivo:
- consumir somente a capability declarada pelo projeto alvo;
- preparar a rodada em `investigations/<round-id>/`;
- produzir exatamente os artefatos canônicos exigidos pelo runner;
- deixar a decisão final de publication para o runner.

Regras obrigatórias:
- Trabalhe apenas no repositório alvo atual.
- Use somente o manifesto e o runbook declarados neste prompt como fonte operacional da capability.
- Não descubra logs, buckets, comandos, scripts ou superfícies fora do que estiver declarado nesses artefatos.
- Não adivinhe tentativa específica: resolva-a explicitamente ou registre ausência explícita quando o caso não puder ser desambiguado com segurança.
- Use apenas selectors, workflows, superfícies e identificadores de purge presentes nas allowlists serializadas neste prompt.
- Se usar replay, mantenha `updateDb=false`, `x-request-id` dedicado, `dryRun` antes de qualquer purge efetivo e registre isso nos artefatos da rodada.
- Grave exatamente estes artefatos canônicos no diretório informado:
  - `case-resolution.json`
  - `evidence-bundle.json`
  - `assessment.json`
  - `dossier.md` ou `dossier.json`
- Não crie `publication-decision.json`, não abra ticket e não faça commit/push.
- Se faltar insumo objetivo para uma rodada segura, pare com blocker explícito em vez de improvisar.

Checklist de execução:
1. Confirmar manifesto, runbook, `round-id`, diretório da rodada e artefatos esperados.
2. Resolver o caso sem extrapolar as authorities declaradas.
3. Coletar evidências apenas pelas superfícies/estratégias permitidas.
4. Registrar replay/purge somente quando permitido e de forma auditável.
5. Materializar os artefatos canônicos exatamente nos caminhos informados.
6. Responder com um resumo curto dizendo o que foi materializado ou qual blocker impediu a rodada.

## Contexto adicional
- Runner repo de referência: `<RUNNER_REPO_PATH>`
- Referência textual do runner: `<RUNNER_REFERENCE>`
- Projeto alvo: `<TARGET_PROJECT_NAME>`
- Caminho do projeto alvo: `<TARGET_PROJECT_PATH>`
- Manifesto da capability: `<TARGET_INVESTIGATE_CASE_MANIFEST_PATH>`
- Runbook operacional: `<TARGET_INVESTIGATE_CASE_RUNBOOK_PATH>`
- Round ID: `<TARGET_INVESTIGATE_CASE_ROUND_ID>`
- Diretório da rodada: `<TARGET_INVESTIGATE_CASE_ROUND_DIRECTORY>`

## Caminhos canônicos dos artefatos da rodada
<TARGET_INVESTIGATE_CASE_ARTIFACT_PATHS_JSON>

## Contexto factual serializado
<TARGET_INVESTIGATE_CASE_FACTS_JSON>
