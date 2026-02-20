# Prompt: Encerrar Ticket com Commit/Push

Encerre o ticket atual com base no que ja foi implementado neste contexto. Primeiro, valide os criterios do ExecPlan e classifique o resultado como `GO` ou `NO_GO`.

Regras obrigatorias:
- Sempre mantenha o repositorio limpo ao final da etapa (sem alteracoes locais pendentes).
- Sempre registrar metadados de fechamento no ticket atual (`Status: closed`, `Closed at (UTC)`, `Closure reason`, `Related PR/commit/execplan`).
- Sempre realizar commit/push no mesmo ciclo quando houver alteracoes.

Fluxo por resultado:
- Se `GO`:
  - fechar o ticket atual normalmente;
  - mover `tickets/open` -> `tickets/closed` no mesmo commit da solucao;
  - usar `Closure reason: fixed` (ou outro motivo valido, se aplicavel).
- Se `NO_GO`:
  - nao deixar o ticket atual aberto;
  - fechar o ticket atual e mover para `tickets/closed` com `Closure reason: split-follow-up`;
  - registrar no ticket fechado o motivo do `NO_GO` e as pendencias principais;
  - criar um novo ticket em `tickets/open` com as pendencias/falhas remanescentes, incluindo vinculos para o ticket pai, execplan e commit relacionado;
  - definir prioridade inicial `P0` no follow-up quando o bloqueio impedir aceite.

Se houver bloqueio tecnico real para commit/push (ex.: erro de git), reporte o bloqueio explicitamente e nao declare sucesso.

Ao final, informe:
- resultado final (`GO` ou `NO_GO`);
- ticket fechado;
- ticket follow-up criado (quando houver);
- hash do commit;
- status do push.
