# Prompt: Encerrar Ticket com Commit/Push

Encerre o ticket atual com base no que ja foi implementado neste contexto. Primeiro, valide os criterios do ExecPlan e classifique o resultado como `GO` ou `NO_GO`.

Regras obrigatorias:
- Sempre mantenha o repositorio limpo ao final da etapa (sem alteracoes locais pendentes).
- Sempre registrar metadados de fechamento no ticket atual (`Status: closed`, `Closed at (UTC)`, `Closure reason`, `Related PR/commit/execplan`).
- Sempre realizar commit/push no mesmo ciclo quando houver alteracoes.
- So classifique como `GO` se commit e push obrigatorios tiverem sido concluidos com evidencia objetiva no repositorio local (working tree limpo e branch sem commits pendentes em relacao ao upstream).
- Qualquer falha de commit/push, ou branch ainda `ahead` do upstream ao final, invalida `GO` e exige `NO_GO`.
- `NO_GO` so deve ser usado quando houver evidencia objetiva de falha tecnica/funcional ou bloqueio que invalide a entrega no ciclo atual.
- Se a implementacao estiver correta e o bloqueio for apenas de validacao manual externa ao agente (ex.: Telegram real, operador humano, ambiente externo indisponivel), classifique como `GO` com anotacao de validacao manual pendente.

Fluxo por resultado:
- Se `GO`:
  - fechar o ticket atual normalmente;
  - mover `tickets/open` -> `tickets/closed` no mesmo commit da solucao;
  - usar `Closure reason: fixed` (ou outro motivo valido, se aplicavel).
  - quando houver validacao manual externa pendente, registrar explicitamente no ticket fechado:
    - que a entrega tecnica foi concluida;
    - qual validacao manual ainda e necessaria;
    - como executar essa validacao e quem e o responsavel operacional.
  - nao abrir follow-up automatico apenas por indisponibilidade de validacao manual externa ao agente.
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
- se ha validacao manual pendente registrada no ticket fechado;
- hash do commit;
- status do push.
