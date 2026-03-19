# Prompt: Executar Retrospectiva Sistêmica do Workflow apos spec-audit

Execute a etapa `spec-workflow-retrospective` como fronteira observavel posterior ao `spec-audit`. Nesta entrega, a retrospectiva existe para separar a fase sistemica da auditoria funcional; os contratos detalhados de `workflow-gap-analysis` e `workflow-ticket-publication` permanecem em tickets dedicados e nao devem ser absorvidos aqui.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Regras obrigatorias:
- Fluxo sequencial; execute somente esta etapa.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Reler a spec, o resultado do `spec-audit`, os follow-up tickets funcionais criados pela auditoria quando existirem e o estado atual do repositorio antes de concluir.
- Esta etapa so deve existir porque o `spec-audit` ja encontrou gaps residuais reais.
- Nao reexecutar a auditoria funcional da spec.
- Nao alterar a spec do projeto corrente nesta etapa.
- Nao criar nem publicar ticket transversal de workflow nesta entrega.
- Nao fazer commit, push nem fechar tickets nesta etapa.
- Se o contexto nao for suficiente para uma retrospectiva sistemica segura, registrar a limitacao explicitamente no relatorio final em vez de inventar diagnostico causal.

Tarefa:
1. Confirmar que a rodada chegou aqui porque o `spec-audit` encontrou gaps residuais reais.
2. Registrar uma retrospectiva sistemica preliminar, separada da auditoria funcional da spec.
3. Preservar explicitamente a fronteira:
   - follow-up funcional da spec permanece pertencendo ao `spec-audit`;
   - melhoria sistemica de workflow fica pendente para os tickets dedicados desta retrospectiva.
4. Reportar no final:
   - se a retrospectiva sistemica foi executada com contexto suficiente ou com limitacao operacional;
   - quais artefatos foram relidos;
   - quais limites desta entrega permanecem em aberto.
