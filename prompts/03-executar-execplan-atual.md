# Prompt: Executar ExecPlan Atual

Execute o ExecPlan atual como contrato de execucao. Implemente, valide e atualize os artefatos vivos; nao feche ticket nem faca commit/push nesta etapa.

Regras obrigatorias:
- Reler o ticket, a spec referenciada (quando existir) e o ExecPlan antes de alterar codigo.
- Aplicar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Nao criar um novo plano. Se descobrir fatos que mudam o entendimento, atualize o ExecPlan atual em:
  - `Progress`
  - `Surprises & Discoveries`
  - `Decision Log`
- Implementar apenas contra o subconjunto de RFs/CAs declarado no ticket/ExecPlan.
- Executar a matriz de validacao definida no ExecPlan antes de encerrar a etapa.
- Atualizar spec/documentacao impactadas no mesmo changeset quando o comportamento descrito mudar.
- Se o plano ou o ticket nao forem suficientes para uma execucao segura, pare com blocker explicito e registre o motivo nos artefatos, em vez de completar por suposicao silenciosa.

Tarefa:
1. Confirmar o contexto alvo do ticket, da spec referenciada e do ExecPlan.
2. Implementar o trabalho previsto, mantendo o ExecPlan como documento vivo.
3. Rodar todas as validacoes observaveis previstas no plano.
4. Atualizar a spec/documentacao impactadas, quando aplicavel.
5. Reportar no final:
   - o que foi implementado;
   - quais validacoes foram executadas e com qual resultado;
   - riscos residuais;
   - blockers/pendencias objetivas, se houver.
