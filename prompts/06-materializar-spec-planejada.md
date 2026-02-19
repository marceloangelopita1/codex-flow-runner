# Prompt: Materializar Spec Planejada

Materialize a spec planejada abaixo fora do modo `/plan`, criando apenas o arquivo de spec esperado.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Titulo final aprovado:
- <SPEC_TITLE>

Resumo final aprovado:
- <SPEC_SUMMARY>

Regras obrigatorias:
- Fluxo sequencial; execute somente esta etapa.
- Nao fechar ticket interno nesta etapa.
- Nao executar commit/push nesta etapa.
- Nao commitar segredos.
- Criar exatamente `docs/specs/YYYY-MM-DD-<slug>.md` no caminho `<SPEC_PATH>`, sem gerar variacoes extras.
- Inicializar metadata da spec com:
  - `Status: approved`
  - `Spec treatment: pending`

Tarefa:
1. Criar o arquivo `<SPEC_PATH>` com base no titulo/resumo finais aprovados.
2. Garantir que o documento siga o padrao de spec do repositorio (`SPECS.md` / `docs/specs/templates/spec-template.md`).
3. Preencher metadata inicial obrigatoria (`Status: approved`, `Spec treatment: pending`).
4. Reportar no final:
   - arquivo criado;
   - confirmacao dos metadados iniciais;
   - pendencias remanescentes (se houver).
