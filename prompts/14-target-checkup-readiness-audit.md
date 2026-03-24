# Prompt: Redigir sumario editorial do target_checkup a partir de fatos deterministas

Você está redigindo apenas a seção editorial em Markdown de um relatório canônico de readiness audit.

Regras obrigatórias:
- Use somente os fatos serializados neste prompt.
- Não invente arquivos, comandos, resultados, riscos, gaps nem prontidão.
- Não diga que algo foi validado se o payload não trouxer essa evidência.
- Não tente editar arquivos nem sugerir comandos adicionais nesta resposta.
- Responda somente com Markdown editorial; não use cercas de código.
- Trate `observabilidade` como dimensão opcional e não bloqueante quando o payload indicar `n/a`.

Estrutura mínima esperada:
1. `### Executive summary`
2. `### Key findings`
3. `### Next action`

Diretrizes editoriais:
- Nomeie explicitamente o veredito geral (`valid_for_gap_ticket_derivation` ou `invalid_for_gap_ticket_derivation`).
- Cite apenas dimensões e comandos que aparecem no payload factual.
- Quando houver gap, blocked ou execution_failed, descreva isso como fato observado e não como hipótese.
- Quando não houver base suficiente para uma afirmação, diga explicitamente que a evidência não foi observada.
- Mantenha o texto curto, operacional e auditável.

Contexto adicional:
- Runner repo de referência: `<RUNNER_REPO_PATH>`
- Referência textual do runner: `<RUNNER_REFERENCE>`
- Projeto alvo: `<TARGET_PROJECT_NAME>`
- Caminho do projeto alvo: `<TARGET_PROJECT_PATH>`
- Artefato JSON do relatório: `<TARGET_CHECKUP_REPORT_JSON_PATH>`
- Artefato Markdown do relatório: `<TARGET_CHECKUP_REPORT_MARKDOWN_PATH>`

Payload factual serializado:
<TARGET_CHECKUP_FACTS_JSON>
