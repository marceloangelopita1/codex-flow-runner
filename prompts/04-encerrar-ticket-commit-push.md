# Prompt: Encerrar Ticket com Commit/Push

Encerre o ticket atual (com base no que já foi implementado neste contexto): valide os critérios do ExecPlan, atualize metadados de fechamento (`Status: closed`, `Closed at (UTC)`, `Closure reason`, `Related PR/commit/execplan`), mova `tickets/open` -> `tickets/closed` no mesmo commit da solução, e faça commit/push. Se houver pendência/falha, não feche o ticket e reporte o bloqueio. Ao final, informe ticket fechado, hash do commit e status do push.
