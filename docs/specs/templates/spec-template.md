# [SPEC] <titulo-curto-da-especificação>

## Metadata
- Spec ID: <yyyy-mm-dd>-<slug>
- Status: draft
- Spec treatment: pending
- Owner:
- Created at (UTC): YYYY-MM-DD HH:MMZ
- Last reviewed at (UTC): YYYY-MM-DD HH:MMZ
- Source: product-need | technical-evolution | operational-gap
- Related tickets:
  - 
- Related execplans:
  - 
- Related commits:
  - 
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve:
- Resultado esperado:
- Contexto funcional:
- Restrições técnicas relevantes:

## Jornada de uso
1. Ator inicia o fluxo em <ponto de entrada>.
2. Sistema executa <comportamento esperado>.
3. Ator valida resultado em <saída/observabilidade>.

## Requisitos funcionais
- RF-01:
- RF-02:
- RF-03:

<!-- Heading canônico: use exatamente "## Assumptions and defaults" nas specs locais. O workflow aceita "## Premissas e defaults" apenas como alias de compatibilidade de leitura para specs externas ou legadas. -->
## Assumptions and defaults
- 

## Nao-escopo
- 

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - <comando/ação + resultado esperado>
- [ ] CA-02 - <comando/ação + resultado esperado>
- [ ] CA-03 - <comando/ação + resultado esperado>

## Gate de validacao dos tickets derivados
- Veredito atual: GO | NO_GO | n/a
- Gaps encontrados:
  - <descrever>
- Correções aplicadas:
  - <descrever>
- Causa-raiz provável:
  - <descrever>
- Ciclos executados:
  - <descrever>
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta seção apenas com o veredito, os gaps, as correções e o histórico funcional do gate formal; fora desse fluxo, registrar `n/a` quando não se aplicar.
- Política histórica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim | não | n/a
- Motivo de ativação ou skip:
  - <descrever>
- Classificação final:
  - <descrever>
- Confiança:
  - <descrever>
- Frente causal analisada:
  - <descrever>
- Achados sistêmicos:
  - <descrever>
- Artefatos do workflow consultados:
  - <descrever>
- Elegibilidade de publicação:
  - <descrever>
- Resultado do ticket transversal ou limitação operacional:
  - <descrever>
- Nota de uso: quando esta spec vier de `/run_specs`, esta seção deve registrar a retrospectiva pre-run-all como superfície distinta do gate funcional e continua canônica mesmo quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`. Com a flag desligada, a seção pode permanecer `n/a` e não recebe write-back automático. Se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e a execução ocorrer no próprio `codex-flow-runner`, write-back nesta seção é permitido. Em projeto externo, a fonte observável desta fase é trace/log/resumo, e não a spec do projeto alvo.
- Política anti-duplicação: a retrospectiva sistêmica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto histórico, mas não deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - 
- Validações manuais pendentes:
  - 

## Status de atendimento (documento vivo)
- Estado geral: draft | approved | in_progress | partially_attended | attended | superseded
- Itens atendidos:
  - 
- Pendências em aberto:
  - 
- Evidências de validação:
  - 

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - 
- Causas-raiz sistêmicas identificadas:
  - 
- Ajustes genéricos promovidos ao workflow:
  - 

## Riscos e impacto
- Risco funcional:
- Risco operacional:
- Mitigação:

## Decisoes e trade-offs
- YYYY-MM-DD - <decisão> - <motivo/impacto>

## Historico de atualizacao
- YYYY-MM-DD HH:MMZ - Versão inicial da spec.
