# Piloto de priorizacao de refatoracoes criticas (2026-02-21)

## Objetivo
Registrar um ciclo real de aplicacao da matriz objetiva de risco/divida tecnica no backlog derivado da spec `2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas`.

## Contexto da rodada
- Data (UTC): 2026-02-21 09:02Z
- Responsavel: mapita
- Gatilho: fechamento do gap de matriz e priorizacao objetiva (RF-07/RF-08, CA-02/CA-03)
- Ticket foco desta rodada: `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
- ExecPlan foco desta rodada: `execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`

## Metodo aplicado
- Formula:
  - `score = (severidade * 3) + (frequencia * 2) + (custo_de_atraso * 3) + (risco_operacional * 2)`
- Mapeamento:
  - `P0`: `score >= 40`
  - `P1`: `score` entre `26` e `39`
  - `P2`: `score` entre `10` e `25`
  - Guardrail `P0`: `severidade = 5` e (`custo_de_atraso >= 4` ou `risco_operacional >= 4`)

## Itens avaliados no backlog derivado
| Item | Tipo | Severidade | Frequencia | Custo de atraso | Risco operacional | Score | Priority resultante |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md` | Gap de governanca de priorizacao | 3 | 4 | 4 | 3 | 35 | `P1` |
| `tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md` | Gap de governanca de melhoria continua | 2 | 3 | 2 | 2 | 22 | `P2` |

## Justificativas objetivas
- `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`:
  - frequencia recorrente e custo de atraso alto porque sem criterio unico a triagem de refatoracoes criticas fica subjetiva;
  - risco operacional moderado por afetar consistencia de backlog e previsibilidade do ciclo.
- `tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`:
  - impacto mais gradual e de governanca, com menor custo de atraso imediato;
  - permanece relevante para CA-04/CA-05, mas sem gatilho de criticidade `P0/P1` nesta rodada.

## Resultado do piloto
- A matriz reproduziu a prioridade ja registrada nos tickets avaliados (`P1` e `P2`).
- Nao houve necessidade de alterar o runtime de fila; a regra sequencial `P0 -> P1 -> P2` permanece suficiente apos classificacao objetiva.

## Rastreabilidade
- Spec de origem: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
- Guia operacional: `docs/checkups/checkup-nao-funcional.md`
- Ticket da entrega: `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
- ExecPlan da entrega: `execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
