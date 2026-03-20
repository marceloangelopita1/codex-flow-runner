# Prompt: Versionar Spec Planejada com Commit/Push Dedicado

Finalize a entrega da spec planejada com commit/push dedicado e escopo de arquivos estrito.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Commit obrigatorio:
- <COMMIT_MESSAGE>

Trilha obrigatória do fluxo:
- request: <TRACE_REQUEST_PATH>
- response: <TRACE_RESPONSE_PATH>
- decision: <TRACE_DECISION_PATH>

Regras obrigatórias:
- Fluxo sequencial; execute somente esta etapa.
- Não fechar ticket interno nesta etapa.
- Não commitar segredos.
- Não incluir arquivos fora da spec alvo e da trilha `spec_planning/*` desta sessão.
- Usar exatamente a mensagem de commit `<COMMIT_MESSAGE>`.

Tarefa:
1. Validar se apenas os artefatos esperados foram alterados (`<SPEC_PATH>`, `<TRACE_REQUEST_PATH>`, `<TRACE_RESPONSE_PATH>`, `<TRACE_DECISION_PATH>`).
2. Executar `git add <SPEC_PATH> <TRACE_REQUEST_PATH> <TRACE_RESPONSE_PATH> <TRACE_DECISION_PATH>`.
3. Criar commit com a mensagem exata `<COMMIT_MESSAGE>`.
4. Executar push para o branch atual.
5. Reportar no final:
   - arquivos versionados;
   - hash do commit;
   - status do push;
   - pendências remanescentes (se houver).
