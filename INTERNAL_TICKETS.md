# INTERNAL_TICKETS.md

## Objetivo
Este documento define o processo canônico para abrir e acompanhar tickets internos neste repositório.
Tickets internos existem primeiro para capturar problemas (contexto + evidência), mesmo quando ainda não houver uma solução clara.

## Por que isto existe
- Preservar achados descobertos durante execuções locais, análise de logs e saídas de testes.
- Manter os itens de backlog auditáveis no git.
- Evitar perda de contexto entre diagnóstico e implementação futura.

## Quando abrir um ticket
Abra um ticket quando pelo menos uma condição for verdadeira:
- Uma regressão de qualidade ou padrão de warning se repetir entre execuções (mesma classe de falha).
- Um achado puder bloquear rollout, aceite ou confiança na qualidade do fluxo.
- Um achado tiver impacto de usuário, negócio ou operação (mesmo que parcial).
- Um achado exigir trabalho de follow-up que não será corrigido na mudança atual.
- Um teste/execução revelar divergência entre o comportamento observado e o esperado.

## Quando não abrir um ticket
Não abra ticket para:
- Erros locais pontuais já corrigidos imediatamente na mesma mudança.
- Notas puramente informativas sem necessidade de ação.
- Relatos duplicados sem novas evidências.

Se houver dúvida, abra o ticket e marque severidade baixa.

## Ciclo de vida do ticket
Os arquivos de ticket ficam em `tickets/`:
- `tickets/open/`: backlog ativo (`open`, `in-progress`, `blocked`).
- `tickets/closed/`: tickets fechados (resolved, invalid, duplicate, wont-fix ou split-follow-up com motivo).
- `tickets/templates/`: template(s) de ticket.

Valores de status:
- `open`: criado e aguardando triagem.
- `in-progress`: owner implementando ativamente.
- `blocked`: depende de decisão/input externo.
- `closed`: finalizado com motivo de fechamento.

Regra de fechamento/commit:
- Se um commit/push incluir a implementação que resolve um ticket `open`, esse mesmo commit deve mover o arquivo do ticket para `tickets/closed/`.
- Os metadados de fechamento devem ser preenchidos no mesmo commit (`Status: closed`, `Closed at (UTC)`, `Closure reason` e `Related PR/commit/execplan`).
- `Closure reason: split-follow-up` é permitido quando o ticket atual precisa ser fechado por rastreabilidade enquanto o trabalho pendente restante é movido para um novo ticket.
- Em `split-follow-up`, o mesmo commit deve incluir:
  - fechamento do ticket atual em `tickets/closed/`;
  - criação do novo ticket de follow-up em `tickets/open/`;
  - vínculo explícito entre pai e follow-up (caminho/nome do ticket, execplan relacionado e contexto do commit).
- Guardrail de classificação (`GO` vs `NO_GO`):
  - Use `NO_GO` apenas quando houver evidência técnica/funcional objetiva de que a entrega não é válida no ciclo atual.
  - Se a implementação for considerada correta e o único bloqueio for validação manual externa (fora do alcance da IA), feche como sucesso (`Closure reason: fixed`) e registre a validação manual pendente no ticket fechado.
  - Validação manual externa pendente, sozinha, não é motivo para forçar `split-follow-up`.
  - Se o trabalho remanescente realmente depender de insumo/decisão externa e não houver próximo passo local executável, o follow-up deve ser criado com `Status: blocked`, preservando o backlog sem recolocar o item imediatamente na fila automática.
- Guardrail de runtime para `NO_GO` repetido:
  - o runner aceita no máximo 3 recuperações de follow-up na mesma linhagem (cadeia de `Parent ticket` com ancestrais fechados como `split-follow-up`);
  - quando a linhagem excede esse limite, `/run-all` deve parar imediatamente com status de erro e manter o ticket aberto como trabalho não finalizado.

## Prioridade e severidade
- Priority (`P0`, `P1`, `P2`):
  - `P0`: blocks release or has high operational risk.
  - `P1`: important, should be addressed in the next planned cycle.
  - `P2`: useful improvement, can wait without immediate risk.
- Regra de consumo da fila (`/run-all`):
  - Apenas tickets elegíveis para automação (`Status: open`, `in-progress` ou sem status parseável) são consumidos por ordem de prioridade: `P0` antes de `P1`, e `P1` antes de `P2`.
  - Tickets com `Status: blocked` permanecem visíveis no backlog, mas são ignorados pela fila automática até desbloqueio manual.
  - Em empates na mesma prioridade, a ordem não é um requisito funcional; fallback determinístico por nome de arquivo é aceitável.
- Severity (`S1`, `S2`, `S3`):
  - `S1`: high impact.
  - `S2`: medium impact.
  - `S3`: low impact.

## Matriz objetiva para backlog crítico de refatoração
- Escopo:
  - Obrigatória para tickets criados a partir de achados do check-up não funcional que representem dívida técnica/refatoração.
  - Opcional para outros tipos de ticket.
- Fonte de verdade:
  - `docs/checkups/checkup-nao-funcional.md` define dimensões, exemplos e expectativas de rastreabilidade.
- Dimensões (`1` a `5` cada):
  - `severidade`
  - `frequencia`
  - `custo_de_atraso`
  - `risco_operacional`
- Fórmula de score ponderado:
  - `score = (severidade * 3) + (frequencia * 2) + (custo_de_atraso * 3) + (risco_operacional * 2)`
  - faixa de score: `10..50`.
- Mapeamento de prioridade:
  - `P0`: `score >= 40`.
  - `P1`: `score` between `26` and `39`.
  - `P2`: `score` between `10` and `25`.
  - Guardrail: forçar `P0` quando `severidade = 5` e (`custo_de_atraso >= 4` ou `risco_operacional >= 4`).
- Desempate entre candidatos do mesmo nível durante a triagem:
  - maior `custo_de_atraso`;
  - depois maior `severidade`;
  - depois fallback determinístico por nome do arquivo do ticket.
- Requisitos de rastreabilidade quando a matriz se aplica:
  - registrar os quatro valores das dimensões;
  - registrar o `score` final;
  - registrar a `Priority` resultante;
  - adicionar justificativa objetiva com links de evidência.
- Nota de compatibilidade:
  - Esta matriz define como `Priority` é atribuída antes do enfileiramento.
  - Em runtime, `src/integrations/ticket-queue.ts` aplica `Priority` (`P0 -> P1 -> P2`, com fallback por nome em caso de empate) apenas sobre tickets elegíveis; itens `blocked` ficam fora do consumo automático.

## Campos obrigatórios (barra mínima de qualidade)
Todo ticket deve incluir:
- Resumo do problema (o que aconteceu).
- Contexto (onde no pipeline/workflow).
- Comportamento observado vs esperado.
- Rastreabilidade de origem quando aplicável:
  - stage/origem da analise quando o ticket nascer de retrospectiva de workflow;
  - projeto ativo e repositorio alvo quando o ticket cruzar repositorios;
  - spec de origem;
  - caminho humano qualificado por projeto para a spec de origem quando o display diferir da chave canonica;
  - caminho canonico usado para dedupe/reuse quando isso for relevante para automacao;
  - IDs de RF/CA de origem;
  - assumptions/defaults herdados que importam para a implementação.
- Passos de reprodução (quando possível).
- Links de evidência (`requestId`, `Request file`, `Response file`, `Decision file` e/ou saída de teste).
- Avaliação de impacto (escopo + risco).
- Critérios de fechamento observáveis.

Quando um ticket for criado a partir de retrospectiva de workflow (`spec-ticket-derivation-retrospective` ou `spec-workflow-retrospective`) ou de audit/review pós-implementação, inclua também:
- causa-raiz provável do workflow (`spec`, `ticket`, `execplan`, `execution`, `validation`, `systemic-instruction`, `external/manual`);
- por que essa classificação de causa é a menor explicação plausível;
- se a remediação é local ou se deve atualizar uma instrução genérica do repositório.

Não exija esses três campos extras para tickets criados durante derivação pré-implementação que nao sejam retrospectivas sistemicas, como `spec-triage`, a menos que uma regra canônica do repositório seja atualizada explicitamente para ampliar esse contrato.

`Proposed solution` é opcional por design.

## Convenção de nome
Use nome de arquivo:
- `YYYY-MM-DD-<slug>.md`

Exemplos:
- `2026-02-14-telegram-status-reporting-gap.md`
- `2026-02-14-execplan-generation-missing-context.md`

## SLA de triagem
- Meta da primeira triagem: até 2 dias úteis após a criação do ticket.
- Durante a triagem, definir:
  - owner;
  - confirmação de prioridade/severidade;
  - próxima decisão (`implement now`, `plan in ExecPlan`, `close`).

## Relação com ExecPlan
- O ticket captura o problema.
- O ExecPlan define a implementação quando escopo/risco exige execução estruturada.
- Um ticket pode permanecer aberto até que o ExecPlan relacionado seja entregue e validado.

## Política de dados sensíveis
Nunca inclua segredos ou payloads sensíveis brutos em arquivos de ticket.
- Permitido: IDs, trechos redigidos e caminhos de artefatos não sensíveis.
- Não permitido: API keys, tokens, credenciais e payloads sensíveis completos.
