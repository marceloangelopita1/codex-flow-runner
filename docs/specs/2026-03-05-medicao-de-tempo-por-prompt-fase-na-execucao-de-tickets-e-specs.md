# [SPEC] Medicao de tempo por prompt/fase na execucao de tickets e specs

## Metadata
- Spec ID: 2026-03-05-medicao-de-tempo-por-prompt-fase-na-execucao-de-tickets-e-specs
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-05 01:57Z
- Last reviewed at (UTC): 2026-03-05 02:05Z
- Source: technical-evolution
- Related tickets:
  - tickets/open/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md
  - tickets/open/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md
- Related execplans:
  - A definir
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: os fluxos de execucao nao exibem medicao consolidada de duracao por prompt/fase nem tempo total da execucao, dificultando identificacao de gargalos.
- Resultado esperado: adicionar medicao de duracao por prompt/fase e tempo total da execucao, exibindo esses dados no resumo final para os fluxos de rodar ticket individual, rodar todos os tickets abertos e rodar specs, com foco em identificar gargalos.
- Contexto funcional: aumentar observabilidade operacional sem alterar a regra de processamento sequencial dos fluxos de tickets e specs.

## Jornada de uso
1. Operador inicia um fluxo de execucao: rodar ticket individual, rodar todos os tickets abertos ou rodar specs.
2. Sistema mede duracao de cada prompt/fase executada durante o fluxo.
3. Sistema mede o tempo total da execucao do fluxo.
4. Ao finalizar (sucesso ou falha), sistema publica resumo final com tempos por prompt/fase e tempo total.
5. Operador usa os tempos apresentados para identificar etapas com maior latencia.

## Requisitos funcionais
- RF-01: medir duracao por prompt/fase no fluxo de rodar ticket individual.
- RF-02: medir duracao por prompt/fase no fluxo de rodar todos os tickets abertos.
- RF-03: medir duracao por prompt/fase no fluxo de rodar specs.
- RF-04: calcular e registrar tempo total de execucao em cada um dos tres fluxos.
- RF-05: exibir no resumo final os tempos por prompt/fase e o tempo total em formato legivel e deterministico.
- RF-06: manter rastreabilidade temporal mesmo quando o fluxo terminar com falha, exibindo as medicoes coletadas ate o ponto de interrupcao.
- RF-07: preservar o comportamento sequencial dos fluxos, sem introduzir paralelizacao de tickets.
- RF-08: manter compatibilidade com logs e status existentes, adicionando apenas informacao de duracao necessaria para diagnostico de gargalos.

## Nao-escopo
- Persistencia historica de metricas em banco de dados.
- Dashboards externos ou telemetria fora do resumo final dos fluxos.
- Alterar politica de concorrencia para execucao paralela.
- Reprojetar mensagens de status alem do necessario para incluir os tempos.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Ao rodar ticket individual, o resumo final inclui duracao de cada prompt/fase executada e tempo total da execucao.
- [ ] CA-02 - Ao rodar todos os tickets abertos, o resumo final inclui duracao de cada prompt/fase executada e tempo total da execucao.
- [ ] CA-03 - Ao rodar specs, o resumo final inclui duracao de cada prompt/fase executada e tempo total da execucao.
- [ ] CA-04 - Em caso de falha durante qualquer fluxo, o resumo final ainda apresenta medicoes coletadas ate a falha e o tempo total acumulado ate a interrupcao.
- [x] CA-05 - A execucao permanece sequencial apos a entrega, sem processamento paralelo de tickets.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - RF-01, RF-02 e RF-03 atendidos no nivel de medicao/log por fase (`durationMs`) no runner.
  - RF-07 e CA-05 atendidos: execucao de tickets permanece sequencial por fluxo.
- Pendencias em aberto:
  - RF-04 parcialmente atendido: faltam tempos totais consolidados no fechamento dos tres fluxos, especialmente no `/run_specs`.
  - RF-05 nao atendido: resumos finais atuais nao exibem tempos por fase nem tempo total em formato deterministico.
  - RF-06 nao atendido: em falha, resumos finais nao carregam medicoes parciais coletadas ate a interrupcao.
  - RF-08 parcialmente atendido: compatibilidade com logs/status foi mantida, mas sem adicionar a informacao temporal minima exigida no resumo final.
  - CA-01, CA-02, CA-03 e CA-04 permanecem pendentes e foram derivados nos tickets:
    - `tickets/open/2026-03-05-contrato-de-medicao-temporal-por-fase-e-fluxo-no-runner.md`
    - `tickets/open/2026-03-05-resumos-finais-com-tempos-no-telegram-para-run-ticket-run-all-e-run-specs.md`
- Evidencias de validacao:
  - `src/core/runner.ts:3034-3152`, `src/core/runner.ts:3656-3703`.
  - `src/core/runner.ts:3526-3560`, `src/types/ticket-final-summary.ts:11-32`.
  - `src/integrations/telegram-bot.ts:4548-4590`.

## Riscos e impacto
- Risco funcional: medicoes inconsistentes entre fases podem levar a leitura incorreta de gargalos.
- Risco operacional: instrumentacao excessiva pode aumentar ruido de logs ou overhead de execucao.
- Mitigacao: usar medicao monotonicamente confiavel, formato de resumo padronizado e validacao objetiva via criterios de aceitacao.

## Decisoes e trade-offs
- 2026-03-05 - Priorizar medicao por prompt/fase e tempo total no resumo final, sem persistencia historica nesta iteracao.
- 2026-03-05 - Manter escopo restrito aos fluxos de ticket individual, todos os tickets abertos e specs para reduzir risco de regressao.

## Historico de atualizacao
- 2026-03-05 01:57Z - Versao inicial da spec criada com `Status: approved` e `Spec treatment: pending`.
- 2026-03-05 02:03Z - Revisao de gaps concluida; tickets derivados para contrato temporal no runner e publicacao de resumos finais com tempos no Telegram.
- 2026-03-05 02:05Z - Validacao final da triagem concluida, mantendo `Status: approved` e `Spec treatment: pending` devido aos gaps rastreados em `tickets/open/`.
