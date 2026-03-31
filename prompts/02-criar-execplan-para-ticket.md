# Prompt: Criar ExecPlan para Ticket

Crie um **novo ExecPlan** para o ticket abaixo (assuma que o plano ainda não existe).

Ticket alvo:
- `<tickets/open/YYYY-MM-DD-slug.md>`

Instruções:
- Leia o ticket por completo.
- **Acesse as referências do ticket** para ter o contexto necessário e produzir um ótimo plano.
- Não implemente código, não feche ticket, não faça commit/push.
- Siga o padrão de `PLANS.md`.
- Aplique o checklist compartilhado em `<WORKFLOW_QUALITY_GATES_PATH>`.
- Se o ticket vier de spec, explicite no plano:
  - a spec de origem;
  - os RFs/CAs cobertos por este ticket;
  - assumptions/defaults escolhidos;
  - quando houver allowlists/enumerações finitas relevantes, os membros explicitos herdados do ticket/spec e, se houver consolidacao, a justificativa objetiva com cobertura positiva dos aceitos e negativa fora do conjunto;
  - matriz `requisito -> validacao observavel`.
- Toda validação deve nascer do closure criterion do ticket, não de checklist genérico; quando houver allowlists/enumerações finitas, a matriz deve preservar os membros explicitos ou a justificativa objetiva para consolidacao.
- Salve o plano em `execplans/<yyyy-mm-dd>-<slug>.md` (mesmo slug do ticket).

No final, informe:
- caminho do arquivo criado;
- resumo curto dos milestones;
- riscos/bloqueios principais.
