# Codex Workflow Quality Gates

## Objetivo
Concentrar os checklists estaveis de qualidade do fluxo Codex sem inflar os prompts operacionais.

Este documento e referencia compartilhada para:
- triagem de spec;
- criacao de ticket derivado;
- criacao de ExecPlan;
- execucao de ExecPlan;
- fechamento de ticket;
- auditoria final de spec apos `/run_specs -> /run_all`.

## Principios
- Usar a spec como source of truth final quando o trabalho vier de spec.
- Todo handoff deve carregar contexto suficiente para outra IA executar sem inferencias ocultas.
- Validacao observavel vale mais que afirmacao generica de conclusao.
- Quando um gap permanecer, registrar a menor causa-raiz sistêmica plausivel sem overfitting.
- Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.
- O contrato canonico de derivacao e `spec -> tickets` na triagem inicial e `ticket -> execplan` quando necessario.
- Alinhamentos canonicos nao exigem migracao retroativa em massa; material historico so precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real.

## Checklist de triagem de spec
- Extrair RFs, CAs, assumptions/defaults e nao-escopo da spec.
- Comparar cada RF/CA com evidencias objetivas do codigo atual.
- Para cada gap, apontar evidencia concreta e classificar `atendido | parcial | nao atendido`.
- Criar tickets independentes o bastante para outra IA executar sem depender de ticket irmao.
- A derivacao inicial da spec cria apenas tickets em `tickets/open/`, mesmo quando o escopo parecer claro.
- Em todo ticket derivado, registrar:
  - spec de origem;
  - RFs/CAs cobertos;
  - assumptions/defaults relevantes herdados da spec;
  - criterios de fechamento observaveis.

## Checklist de ExecPlan
- Ler ticket inteiro e todas as referencias obrigatorias antes de planejar.
- Declarar explicitamente a spec de origem e o subconjunto de RFs/CAs coberto pelo ticket.
- Registrar assumptions/defaults escolhidos para eliminar ambiguidade remanescente.
- Traduzir criterios de fechamento em matriz `requisito -> validacao observavel`.
- Explicitar riscos residuais e o que nao sera resolvido neste ticket.

## Checklist de execucao
- Reabrir ticket, spec referenciada e ExecPlan antes de alterar codigo.
- Atualizar `Progress`, `Decision Log` e `Surprises & Discoveries` quando novos fatos surgirem.
- Implementar apenas contra o subconjunto de RFs/CAs declarado no plano.
- Rodar a matriz de validacao completa antes de considerar o ticket pronto.
- Atualizar spec/documentacao impactadas no mesmo changeset quando o comportamento descrito mudar.
- Se o plano nao for suficiente para uma execucao segura, parar com blocker explicito em vez de completar no improviso.

## Checklist de fechamento de ticket
- Reler diff, ticket, ExecPlan e refs da spec antes de decidir `GO` ou `NO_GO`.
- Verificar cada closure criterion com evidencia objetiva.
- Quando houver gap remanescente, registrar causa-raiz em uma destas categorias:
  - `spec`
  - `ticket`
  - `execplan`
  - `execution`
  - `validation`
  - `systemic-instruction`
  - `external/manual`
- Promover uma correcao para instrucao global somente quando a lacuna for claramente generica ou recorrente em specs independentes.

## Checklist de auditoria final de spec
- Rodar somente apos triagem concluida com sucesso e rodada `/run_all` encadeada terminar.
- Comparar estado final do repositorio com a spec original e os tickets fechados desta linhagem.
- Se nao houver gaps residuais:
  - atualizar a spec para `Status: attended`;
  - atualizar `Spec treatment: done`;
  - registrar evidencias finais e resumo de auditoria.
- Se houver gaps residuais:
  - manter a spec pendente;
  - criar follow-ups completos e autocontidos;
  - registrar causa-raiz por gap;
  - registrar qual instrucao sistemica poderia prevenir recorrencia, quando aplicavel.

## Loop manual recomendado (2 prompts)
Use este fluxo quando quiser revisao humana assistida apos uma rodada automatica.

Prompt 1:
`A implementacao da spec foi concluida. Faça uma revisão adversarial comparando spec, tickets fechados, execplans executados, diffs relevantes e testes/validacoes observaveis. Para cada gap, informe criticidade, evidencia objetiva, causa-raiz provável do workflow (spec/ticket/execplan/execution/validation/systemic-instruction/external-manual) e um gap card pronto para virar ticket. Se nao houver gaps relevantes, diga isso explicitamente.`

Prompt 2:
`Com base apenas nos gap cards aprovados, crie os tickets necessarios. Cada ticket deve ser autocontido, explicitar objetivo, resultado esperado, spec/RFs/CAs de origem, evidencias, criterios de fechamento e a causa-raiz registrada na revisão.`
