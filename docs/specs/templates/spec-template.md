# [SPEC] <titulo-curto-da-especificacao>

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
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve:
- Resultado esperado:
- Contexto funcional:
- Restricoes tecnicas relevantes:

## Jornada de uso
1. Ator inicia o fluxo em <ponto de entrada>.
2. Sistema executa <comportamento esperado>.
3. Ator valida resultado em <saida/observabilidade>.

## Requisitos funcionais
- RF-01:
- RF-02:
- RF-03:

<!-- Heading canonico: use exatamente "## Assumptions and defaults" nas specs locais. O workflow aceita "## Premissas e defaults" apenas como alias de compatibilidade de leitura para specs externas ou legadas. -->
## Assumptions and defaults
- 

## Nao-escopo
- 

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - <comando/acao + resultado esperado>
- [ ] CA-02 - <comando/acao + resultado esperado>
- [ ] CA-03 - <comando/acao + resultado esperado>

## Gate de validacao dos tickets derivados
- Veredito atual: GO | NO_GO | n/a
- Gaps encontrados:
  - <descrever>
- Correcoes aplicadas:
  - <descrever>
- Causa-raiz provavel:
  - <descrever>
- Ciclos executados:
  - <descrever>
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta secao apenas com o veredito, os gaps, as correcoes e o historico funcional do gate formal; fora desse fluxo, registrar `n/a` quando nao se aplicar.
- Politica historica: alinhamentos desta secao nao exigem migracao retroativa em massa; material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim | nao | n/a
- Motivo de ativacao ou skip:
  - <descrever>
- Classificacao final:
  - <descrever>
- Confianca:
  - <descrever>
- Frente causal analisada:
  - <descrever>
- Achados sistemicos:
  - <descrever>
- Artefatos do workflow consultados:
  - <descrever>
- Elegibilidade de publicacao:
  - <descrever>
- Resultado do ticket transversal ou limitacao operacional:
  - <descrever>
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - 
- Validacoes manuais pendentes:
  - 

## Status de atendimento (documento vivo)
- Estado geral: draft | approved | in_progress | partially_attended | attended | superseded
- Itens atendidos:
  - 
- Pendencias em aberto:
  - 
- Evidencias de validacao:
  - 

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - 
- Causas-raiz sistemicas identificadas:
  - 
- Ajustes genericos promovidos ao workflow:
  - 

## Riscos e impacto
- Risco funcional:
- Risco operacional:
- Mitigacao:

## Decisoes e trade-offs
- YYYY-MM-DD - <decisao> - <motivo/impacto>

## Historico de atualizacao
- YYYY-MM-DD HH:MMZ - Versao inicial da spec.
