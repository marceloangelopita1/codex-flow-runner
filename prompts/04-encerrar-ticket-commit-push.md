# Prompt: Encerrar Ticket e Preparar Versionamento do Runner

Encerre o ticket atual com base no que ja foi implementado neste contexto. Primeiro, valide os criterios do ExecPlan e classifique o resultado como `GO` ou `NO_GO`.

Importante: nesta etapa, o versionamento git e responsabilidade exclusiva do runner apos a sua resposta. Portanto, voce deve preparar os arquivos para um unico commit/push posterior, mas **nao** deve executar `git add`, `git commit`, `git push`, `git pull`, `git fetch` ou `git ls-remote`.

Regras obrigatorias:
- Avalie `GO` vs `NO_GO` apenas por criterios tecnicos/funcionais da entrega atual.
- Nao use falha de git/versionamento como motivo para `NO_GO`; isso sera tratado pelo runner fora desta etapa.
- Deixe o repositorio em estado consistente para versionamento: apenas alteracoes intencionais deste ticket/follow-up, sem artefatos temporarios ou lixo local.
- Sempre registrar metadados de fechamento no ticket atual (`Status: closed`, `Closed at (UTC)`, `Closure reason`, `Related PR/commit/execplan`).
- Em `Related PR/commit/execplan`, referencie o ExecPlan e descreva o commit como pertencente ao mesmo changeset de fechamento que sera versionado pelo runner.
- Se a implementacao estiver correta e o bloqueio for apenas de validacao manual externa ao agente (ex.: Telegram real, operador humano, ambiente externo indisponivel), classifique como `GO` com anotacao de validacao manual pendente.

Fluxo por resultado:
- Se `GO`:
  - fechar o ticket atual normalmente;
  - mover `tickets/open` -> `tickets/closed`;
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
  - criar um novo ticket em `tickets/open` com as pendencias/falhas remanescentes, incluindo vinculos para o ticket pai e para o ExecPlan;
  - quando fizer sentido referenciar commit futuro, use formulacoes textuais como `mesmo changeset de fechamento versionado pelo runner`, sem inventar hash;
  - definir prioridade inicial `P0` no follow-up quando o bloqueio impedir aceite.

Ao final, informe:
- resultado final (`GO` ou `NO_GO`);
- ticket fechado;
- ticket follow-up criado (quando houver);
- se ha validacao manual pendente registrada no ticket fechado;
- arquivos preparados para versionamento pelo runner;
- observacoes finais para o commit/push posterior (se houver).
