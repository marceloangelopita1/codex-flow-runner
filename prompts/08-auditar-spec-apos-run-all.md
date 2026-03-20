# Prompt: Auditar Spec Após /run_all Encadeado

Faça uma auditoria final da spec abaixo após a rodada encadeada de implementação. Esta etapa pode atualizar a spec e, quando houver gaps residuais, criar tickets de follow-up; ao final, deve versionar e publicar o resultado desta auditoria.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Commit obrigatório:
- <COMMIT_MESSAGE>

Regras obrigatórias:
- Fluxo sequencial; execute somente esta etapa.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Reler a spec, os tickets fechados relacionados, os execplans relacionados e o estado atual do código antes de concluir a auditoria.
- Não reimplementar código nesta etapa.
- Não fechar ticket interno já existente nesta etapa.
- Esta etapa é estritamente uma auditoria funcional da spec do projeto corrente.
- Follow-up funcional da spec pode ser criado aqui quando necessário, mas backlog transversal do workflow não deve ser decidido, promovido nem publicado nesta etapa.
- Se não houver gaps residuais:
  - atualizar a spec para `Status: attended`;
  - atualizar `Spec treatment: done`;
  - registrar evidências finais e auditoria final de entrega.
- Se houver gaps residuais:
  - manter a spec pendente para nova rodada;
  - criar follow-ups autocontidos em `tickets/open/`;
  - registrar para cada gap a causa-raiz na taxonomia fixa:
    - `spec`
    - `ticket`
    - `execplan`
    - `execution`
    - `validation`
    - `external/manual`
- Usar exatamente a mensagem de commit `<COMMIT_MESSAGE>`.

Tarefa:
1. Auditar a implementação entregue contra a spec e suas evidências.
2. Atualizar a spec com o resultado final da auditoria.
3. Criar follow-up tickets apenas para gaps residuais reais.
4. Executar `git add` dos arquivos alterados.
5. Criar commit com a mensagem exata `<COMMIT_MESSAGE>`.
6. Executar push para o branch atual.
7. Reportar no final:
   - status final da spec;
   - se a auditoria encontrou gaps residuais;
   - tickets de follow-up criados (quando houver);
   - causas-raiz registradas;
   - hash do commit;
   - status do push.
8. Incluir obrigatoriamente ao final da resposta o bloco parseável abaixo, sem mudar os nomes dos campos:

```text
[[SPEC_AUDIT_RESULT]]
residual_gaps_detected: yes|no
follow_up_tickets_created: <numero-inteiro>
[[/SPEC_AUDIT_RESULT]]
```
