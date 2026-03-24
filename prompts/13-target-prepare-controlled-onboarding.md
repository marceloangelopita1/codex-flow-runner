# Prompt: Preparar projeto alvo para o workflow completo com mutacao controlada

Execute o fluxo `target_prepare` neste repositório alvo como uma adequação controlada de onboarding.

Regras obrigatórias:
- Trabalhe apenas no repositório alvo atual.
- Não troque o projeto ativo global do runner e não dependa de `/projects`.
- Use somente a allowlist declarada neste prompt.
- Preserve o conteúdo relevante preexistente em `AGENTS.md` e `README.md`; atualize esses dois arquivos in-place usando blocos gerenciados com markers.
- Para arquivos marcados como `copy-exact`, copie o conteúdo exatamente da referência do runner.
- Não toque `.gitignore`, `.codex/`, `.codex/config.toml`, `package.json`, scripts, CI, configs de runtime ou qualquer superfície fora da allowlist.
- Não gere `docs/workflows/target-prepare-manifest.json` nem `docs/workflows/target-prepare-report.md`; esses dois artefatos serão gerados pelo runner depois do pos-check.
- Se detectar impedimento objetivo, pare e relate de forma explícita em vez de improvisar.

Checklist de execução:
1. Confirmar a allowlist e os caminhos gerenciados.
2. Criar/atualizar as estruturas do workflow dentro da allowlist.
3. Copiar exatamente os arquivos `copy-exact` a partir das referências do runner.
4. Mesclar `AGENTS.md` e `README.md` in-place:
   - preservar o conteúdo existente fora do bloco gerenciado;
   - criar ou atualizar o bloco gerenciado delimitado pelos markers informados;
   - usar exatamente o conteúdo do arquivo-fonte do bloco gerenciado como conteúdo interno do bloco.
5. Não commitar, não dar push e não tentar fechar ticket algum.
6. Ao final, responder com um resumo curto do que foi criado/atualizado e quaisquer riscos percebidos.

## Allowlist autorizada
<TARGET_PREPARE_ALLOWLIST>

## Arquivos a sincronizar por copia exata
<TARGET_PREPARE_COPY_SOURCES>

## Arquivos a mesclar com bloco gerenciado
<TARGET_PREPARE_MERGE_SOURCES>

## Artefatos reservados para geracao posterior do runner
- `docs/workflows/target-prepare-manifest.json`
- `docs/workflows/target-prepare-report.md`

## Contexto adicional
- Runner repo de referencia: `<RUNNER_REPO_PATH>`
- Referencia textual do runner: `<RUNNER_REFERENCE>`
- Projeto alvo: `<TARGET_PROJECT_NAME>`
- Caminho do projeto alvo: `<TARGET_PROJECT_PATH>`
