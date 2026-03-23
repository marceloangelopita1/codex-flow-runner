# Prompt: Encerrar Tratamento de Spec com Commit/Push

Encerre o tratamento da spec abaixo com validação final, versionamento e push.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Commit obrigatorio:
- <COMMIT_MESSAGE>

Regras obrigatórias:
- Fluxo sequencial; execute somente esta etapa.
- Não fechar ticket interno nesta etapa.
- Não commitar segredos.
- Se a triagem não encontrar gaps pendentes:
  - atualizar a spec para `Status: attended`;
  - registrar evidências de atendimento.
- Se a triagem encontrar gaps:
  - manter `Status: approved`;
  - registrar pendências e rastreabilidade para tickets abertos.

Tarefa:
1. Revisar as alterações da triagem da spec e validar consistência da documentação.
2. Ajustar status/metadados da spec conforme resultado da triagem (com ou sem gaps).
3. Executar `git add` dos arquivos alterados.
4. Criar commit com a mensagem exata `<COMMIT_MESSAGE>`.
5. Executar push para o branch atual.
6. Reportar no final:
   - spec tratada;
   - status final da spec;
   - hash do commit;
   - status do push;
   - pendências remanescentes (se houver).

Incluir obrigatoriamente ao final da resposta o bloco parseável abaixo, sem mudar os nomes dos campos:

```text
[[SPEC_CLOSE_AND_VERSION_RESULT]]
closure_completed: yes|no
versioning_result: <resultado-observavel-principal-da-etapa>
commit_hash: <hash-do-commit-ou-none>
summary: <resumo-curto-do-fechamento-versionamento>
[[/SPEC_CLOSE_AND_VERSION_RESULT]]
```
