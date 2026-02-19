# Prompt: Encerrar Tratamento de Spec com Commit/Push

Encerre o tratamento da spec abaixo com validacao final, versionamento e push.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Commit obrigatorio:
- <COMMIT_MESSAGE>

Regras obrigatorias:
- Fluxo sequencial; execute somente esta etapa.
- Nao fechar ticket interno nesta etapa.
- Nao commitar segredos.
- Se a triagem nao encontrar gaps pendentes:
  - atualizar a spec para `Status: attended`;
  - registrar evidencias de atendimento.
- Se a triagem encontrar gaps:
  - manter `Status: approved`;
  - registrar pendencias e rastreabilidade para tickets abertos.

Tarefa:
1. Revisar as alteracoes da triagem da spec e validar consistencia da documentacao.
2. Ajustar status/metadados da spec conforme resultado da triagem (com ou sem gaps).
3. Executar `git add` dos arquivos alterados.
4. Criar commit com a mensagem exata `<COMMIT_MESSAGE>`.
5. Executar push para o branch atual.
6. Reportar no final:
   - spec tratada;
   - status final da spec;
   - hash do commit;
   - status do push;
   - pendencias remanescentes (se houver).
