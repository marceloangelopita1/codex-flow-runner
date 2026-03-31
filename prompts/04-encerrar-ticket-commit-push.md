# Prompt: Encerrar Ticket e Preparar Versionamento do Runner

Encerre o ticket atual com base no que já foi implementado neste contexto. Primeiro, valide os critérios do ExecPlan e classifique o resultado como `GO` ou `NO_GO`.

Importante: nesta etapa, o versionamento git é responsabilidade exclusiva do runner após a sua resposta. Portanto, você deve preparar os arquivos para um único commit/push posterior, mas **não** deve executar `git add`, `git commit`, `git push`, `git pull`, `git fetch` ou `git ls-remote`.

Regras obrigatórias:
- Reler o diff, o ticket, o ExecPlan e as referências de spec/documentação antes de decidir `GO` ou `NO_GO`.
- Aplicar o checklist compartilhado em `<WORKFLOW_QUALITY_GATES_PATH>`.
- Avalie `GO` vs `NO_GO` apenas por critérios técnicos/funcionais da entrega atual.
- Não use falha de git/versionamento como motivo para `NO_GO`; isso será tratado pelo runner fora desta etapa.
- Deixe o repositório em estado consistente para versionamento: apenas alterações intencionais deste ticket/follow-up, sem artefatos temporários ou lixo local.
- Sempre registrar metadados de fechamento no ticket atual (`Status: closed`, `Closed at (UTC)`, `Closure reason`, `Related PR/commit/execplan`).
- Em `Related PR/commit/execplan`, referencie o ExecPlan e descreva o commit como pertencente ao mesmo changeset de fechamento que será versionado pelo runner.
- Validar cada closure criterion com evidência objetiva antes da decisão final.
- Quando houver gap remanescente, registrar a menor causa-raiz plausível em uma taxonomia fixa:
  - `spec`
  - `ticket`
  - `execplan`
  - `execution`
  - `validation`
  - `systemic-instruction`
  - `external/manual`
- Se a implementação estiver correta e o bloqueio for apenas de validação manual externa ao agente (ex.: Telegram real, operador humano, ambiente externo indisponível), classifique como `GO` com anotação de validação manual pendente.

Fluxo por resultado:
- Se `GO`:
  - fechar o ticket atual normalmente;
  - mover `tickets/open` -> `tickets/closed`;
  - usar `Closure reason: fixed` (ou outro motivo válido, se aplicável).
  - registrar evidências objetivas de cada closure criterion validado.
  - quando houver validação manual externa pendente, registrar explicitamente no ticket fechado:
    - que a entrega técnica foi concluída;
    - qual validação manual ainda é necessária;
    - como executar essa validação e quem é o responsável operacional.
  - não abrir follow-up automático apenas por indisponibilidade de validação manual externa ao agente.
- Se `NO_GO`:
  - não deixar o ticket atual aberto;
  - fechar o ticket atual e mover para `tickets/closed` com `Closure reason: split-follow-up`;
  - registrar no ticket fechado o motivo do `NO_GO` e as pendências principais;
  - registrar a causa-raiz na taxonomia acima e dizer se o ajuste é local ou sistêmico;
  - criar um novo ticket em `tickets/open` com as pendências/falhas remanescentes, incluindo vínculos para o ticket pai e para o ExecPlan;
  - se a pendência remanescente for apenas aguardar insumo/decisão externa sem próximo passo local executável pelo agente, criar o follow-up com `Status: blocked` e explicitar o gatilho de desbloqueio;
  - não criar follow-up `open`/autoexecutável apenas para representar espera passiva por insumo externo/manual;
  - preencher no follow-up, quando aplicável:
    - `Source spec`;
    - `Source requirements (RFs/CAs)`;
    - `Inherited assumptions/defaults`;
    - `Workflow root cause`.
  - quando a implementação já estiver tecnicamente concluída e faltar apenas validação manual externa, preferir `GO` com anotação explícita dessa validação pendente no ticket fechado, em vez de abrir novo follow-up;
  - quando fizer sentido referenciar commit futuro, use formulações textuais como `mesmo changeset de fechamento versionado pelo runner`, sem inventar hash;
  - definir prioridade inicial `P0` no follow-up quando o bloqueio impedir aceite.

Ao final, informe:
- resultado final (`GO` ou `NO_GO`);
- ticket fechado;
- ticket follow-up criado (quando houver);
- evidências usadas para validar cada closure criterion;
- causa-raiz registrada (quando houver gap);
- se há validação manual pendente registrada no ticket fechado;
- arquivos preparados para versionamento pelo runner;
- observações finais para o commit/push posterior (se houver).
