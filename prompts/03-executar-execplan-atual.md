# Prompt: Executar ExecPlan Atual

Execute o ExecPlan atual como contrato de execução. Implemente, valide e atualize os artefatos vivos; não feche ticket nem faça commit/push nesta etapa.

Regras obrigatórias:
- Reler o ticket, a spec referenciada (quando existir) e o ExecPlan antes de alterar código.
- Aplicar o checklist compartilhado em `<WORKFLOW_QUALITY_GATES_PATH>`.
- Não criar um novo plano. Se descobrir fatos que mudam o entendimento, atualize o ExecPlan atual em:
  - `Progress`
  - `Surprises & Discoveries`
  - `Decision Log`
- Implementar apenas contra o subconjunto de RFs/CAs declarado no ticket/ExecPlan.
- Executar a matriz de validação definida no ExecPlan antes de encerrar a etapa.
- Atualizar spec/documentação impactadas no mesmo changeset quando o comportamento descrito mudar.
- Se o plano ou o ticket não forem suficientes para uma execução segura, pare com blocker explícito e registre o motivo nos artefatos, em vez de completar por suposição silenciosa.

Tarefa:
1. Confirmar o contexto alvo do ticket, da spec referenciada e do ExecPlan.
2. Implementar o trabalho previsto, mantendo o ExecPlan como documento vivo.
3. Rodar todas as validações observáveis previstas no plano.
4. Atualizar a spec/documentação impactadas, quando aplicável.
5. Reportar no final:
   - o que foi implementado;
   - quais validações foram executadas e com qual resultado;
   - riscos residuais;
   - blockers/pendências objetivas, se houver.
