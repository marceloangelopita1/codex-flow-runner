# Prompt: Criar ExecPlan para Ticket

Crie um **novo ExecPlan** para o ticket abaixo (assuma que o plano ainda não existe).

Ticket alvo:
- `<tickets/open/YYYY-MM-DD-slug.md>`

Instruções:
- Leia o ticket por completo.
- **Acesse as referências do ticket** para ter o contexto necessário e produzir um ótimo plano.
- Não implemente código, não feche ticket, não faça commit/push.
- Siga o padrão de `PLANS.md`.
- Aplique o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Se o ticket vier de spec, explicite no plano:
  - a spec de origem;
  - os RFs/CAs cobertos por este ticket;
  - assumptions/defaults escolhidos;
  - matriz `requisito -> validacao observavel`.
- Toda validacao deve nascer do closure criterion do ticket, nao de checklist generico.
- Salve o plano em `execplans/<yyyy-mm-dd>-<slug>.md` (mesmo slug do ticket).

No final, informe:
- caminho do arquivo criado;
- resumo curto dos milestones;
- riscos/bloqueios principais.
