# Codex Workflow Quality Gates

## Objetivo
Concentrar os checklists estáveis de qualidade do fluxo Codex sem inflar os prompts operacionais.

Este documento é referência compartilhada para:
- triagem de spec;
- criação de ticket derivado;
- criação de ExecPlan;
- execução de ExecPlan;
- fechamento de ticket;
- auditoria final de spec após `/run_specs -> /run_all`.

## Princípios
- Usar a spec como source of truth final quando o trabalho vier de spec.
- Todo handoff deve carregar contexto suficiente para outra IA executar sem inferências ocultas.
- Validação observável vale mais que afirmação genérica de conclusão.
- Quando um gap permanecer, registrar a menor causa-raiz sistêmica plausível sem overfitting.
- Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explícito em reduzir retrabalho e promover a melhoria contínua do workflow.
- O contrato canônico de derivação é `spec -> tickets` na triagem inicial e `ticket -> execplan` quando necessário.
- Alinhamentos canônicos não exigem migração retroativa em massa; material histórico só precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real.
- A barra mínima editorial do ticket sistêmico automático vive em `INTERNAL_TICKETS.md`; este checklist apenas verifica que o contrato canônico foi aplicado sem duplicá-lo aqui.

## Checklist de triagem de spec
- Extrair RFs, CAs, RNFs, restricoes tecnicas/documentais relevantes, assumptions/defaults, validacoes pendentes/manuais e não-escopo da spec.
- Comparar cada RF/CA com evidências objetivas do código atual.
- Para cada gap, apontar evidência concreta e classificar `atendido | parcial | nao atendido`.
- Criar tickets independentes o bastante para outra IA executar sem depender de ticket irmão.
- A derivação inicial da spec cria apenas tickets em `tickets/open/`, mesmo quando o escopo parecer claro.
- Quando a spec trouxer RNFs ou restricoes tecnicas/documentais que impactem implementacao, observabilidade, documentacao ou fechamento, decidir explicitamente quais tickets precisam herdar esses itens e como o aceite deles ficara observavel.
- Quando a spec trouxer `Validacoes pendentes ou manuais`, decidir explicitamente se cada item e relevante para cobertura ou aceite do pacote derivado; quando for, carregar esse contexto para o ticket e/ou para seus criterios de fechamento.
- Em todo ticket derivado, registrar:
  - spec de origem;
  - RFs/CAs e RNFs/restricoes tecnicas/documentais relevantes cobertos;
  - assumptions/defaults relevantes herdados da spec;
  - RNFs e restricoes tecnicas/documentais relevantes herdados da spec, quando influenciarem implementacao, aceite, documentacao ou fechamento;
  - validacoes pendentes ou manuais relevantes herdadas da spec, quando influenciarem cobertura ou aceite;
  - critérios de fechamento observáveis.
- Quando o ticket derivado for um ticket automático de retrospectiva sistêmica, conferir contra `INTERNAL_TICKETS.md` que o rascunho final ficou com título orientado ao problema, contexto filtrado, herança seletiva de contexto e fechamento observável por superfície.

## Checklist de ExecPlan
- Ler ticket inteiro e todas as referências obrigatórias antes de planejar.
- Declarar explicitamente a spec de origem e o subconjunto de RFs/CAs/RNFs/restricoes tecnicas coberto pelo ticket.
- Registrar assumptions/defaults escolhidos para eliminar ambiguidade remanescente.
- Registrar RNFs e restricoes tecnicas/documentais herdados que precisem ser implementados, observados ou validados neste ticket.
- Traduzir critérios de fechamento em matriz `requisito -> validacao observavel`.
- Explicitar riscos residuais e o que não será resolvido neste ticket.

## Checklist de execução
- Reabrir ticket, spec referenciada e ExecPlan antes de alterar código.
- Atualizar `Progress`, `Decision Log` e `Surprises & Discoveries` quando novos fatos surgirem.
- Implementar apenas contra o subconjunto de RFs/CAs/RNFs/restricoes tecnicas declarado no plano.
- Rodar a matriz de validação completa antes de considerar o ticket pronto.
- Confirmar que RNFs, restricoes tecnicas/documentais e obrigacoes de documentacao herdadas ficaram observaveis quando fizerem parte do escopo do ticket.
- Atualizar spec/documentação impactadas no mesmo changeset quando o comportamento descrito mudar.
- Se o plano não for suficiente para uma execução segura, parar com blocker explícito em vez de completar no improviso.

## Checklist de fechamento de ticket
- Reler diff, ticket, ExecPlan e refs da spec antes de decidir `GO` ou `NO_GO`.
- Verificar cada closure criterion com evidência objetiva.
- Quando houver gap remanescente, registrar causa-raiz em uma destas categorias:
  - `spec`
  - `ticket`
  - `execplan`
  - `execution`
  - `validation`
  - `systemic-instruction`
  - `external/manual`
- Promover uma correção para instrução global somente quando a lacuna for claramente genérica ou recorrente em specs independentes.

## Checklist de auditoria final de spec
- Rodar somente após triagem concluída com sucesso e rodada `/run_all` encadeada terminar.
- Comparar o estado final do repositório com a spec original e os tickets fechados desta linhagem.
- Se não houver gaps residuais:
  - atualizar a spec para `Status: attended`;
  - atualizar `Spec treatment: done`;
  - registrar evidências finais e resumo de auditoria.
- Se houver gaps residuais:
  - manter a spec pendente;
  - criar follow-ups completos e autocontidos;
  - registrar causa-raiz por gap;
  - registrar qual instrução sistêmica poderia prevenir recorrência, quando aplicável.

## Loop manual recomendado (2 prompts)
Use este fluxo quando quiser revisão humana assistida após uma rodada automática.

Prompt 1:
`A implementacao da spec foi concluida. Faça uma revisão adversarial comparando spec, tickets fechados, execplans executados, diffs relevantes e testes/validacoes observaveis. Para cada gap, informe criticidade, evidencia objetiva, causa-raiz provável do workflow (spec/ticket/execplan/execution/validation/systemic-instruction/external-manual) e um gap card pronto para virar ticket. Se nao houver gaps relevantes, diga isso explicitamente.`

Prompt 2:
`Com base apenas nos gap cards aprovados, crie os tickets necessarios. Cada ticket deve ser autocontido, explicitar objetivo, resultado esperado, spec/RFs/CAs de origem, evidencias, criterios de fechamento e a causa-raiz registrada na revisão.`
