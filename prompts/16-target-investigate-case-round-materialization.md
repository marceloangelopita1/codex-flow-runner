# Prompt: Materializar rodada real do `/target_investigate_case_v2` no projeto alvo

Você está executando apenas a materialização da rodada real de `case-investigation` no repositório alvo atual, seguindo o contrato explicito da v2 quando o manifesto/facts assim declararem.

Objetivo:
- consumir somente a capability declarada pelo projeto alvo;
- acionar primeiro o entrypoint oficial do projeto alvo quando ele estiver declarado no manifesto;
- tratar `output/case-investigation/<round-id>/` do alvo como fonte autoritativa dos artefatos da rodada quando esse namespace estiver declarado nos fatos;
- tratar `investigations/<round-id>/` apenas como espelho runner-side quando ele existir;
- produzir exatamente os artefatos canônicos exigidos pelo runner, com `diagnosis.md` e `diagnosis.json` como artefatos principais operator-facing;
- quando a capability declarar `semanticReview`, emitir apenas o packet bounded `semantic-review.request.json` no mesmo diretório da rodada;
- deixar a decisão final de publication para o runner.

Regras obrigatórias:
- Trabalhe apenas no repositório alvo atual.
- Use somente o manifesto e o runbook declarados neste prompt como fonte operacional da capability.
- Não descubra logs, buckets, comandos, scripts ou superfícies fora do que estiver declarado nesses artefatos.
- Não adivinhe tentativa específica: resolva-a explicitamente ou registre ausência explícita quando o caso não puder ser desambiguado com segurança.
- Use apenas selectors, workflows, superfícies e identificadores de purge presentes nas allowlists serializadas neste prompt.
- Quando houver entrypoint oficial e namespace autoritativo declarados, execute esse entrypoint para materializar a rodada oficial do alvo antes de tocar qualquer espelho runner-side.
- Se o namespace autoritativo do alvo existir, copie os artefatos canônicos dele para o espelho runner-side somente quando os fatos desta rodada pedirem esse espelho, sem reescrever semântica, sem enriquecer enums e sem reinterpretar o conteúdo.
- `diagnosis.md` e `diagnosis.json` devem existir como dupla primária do diagnóstico; `assessment.json` e `dossier.*` continuam apenas como artefatos auxiliares de compatibilidade enquanto o runner ainda depende deles.
- `investigations/<round-id>/`, quando existir, deve ser apenas um espelho runner-side do pacote final do alvo, não uma segunda implementação criativa do `assessment`.
- Se usar replay, mantenha `updateDb=false`, `x-request-id` dedicado, `dryRun` antes de qualquer purge efetivo e registre isso nos artefatos da rodada.
- Grave exatamente estes artefatos canônicos no diretório informado:
  - `case-resolution.json`
  - `evidence-index.json`
  - `case-bundle.json`
  - `assessment.json`
  - `diagnosis.json`
  - `diagnosis.md`
  - `dossier.md` ou `dossier.json`
- Se a capability declarar `semanticReview`, grave também `semantic-review.request.json` no mesmo diretório da rodada quando houver packet bounded pronto ou bloqueado.
- Não grave `semantic-review.result.json`; esse artefato pertence ao runner como executor mecânico do Codex.
- Não crie `publication-decision.json`, não abra ticket e não faça commit/push.
- Se faltar insumo objetivo para uma rodada segura, pare com blocker explícito em vez de improvisar.

Checklist de execução:
1. Confirmar manifesto, runbook, `round-id`, diretório da rodada e artefatos esperados.
2. Resolver o caso sem extrapolar as authorities declaradas.
3. Coletar evidências apenas pelas superfícies/estratégias permitidas.
4. Registrar replay/purge somente quando permitido e de forma auditável.
5. Espelhar os artefatos canônicos exatamente nos caminhos informados, incluindo o packet bounded de `semantic-review` quando a capability o declarar.
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
