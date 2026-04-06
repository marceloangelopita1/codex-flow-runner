# [SPEC] /target_investigate_case adiciona root-cause-review target-owned e endurece publication contra causas apenas plausiveis

## Metadata
- Spec ID: 2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening
- Status: approved
- Spec treatment: pending
- Owner: workflow-core
- Created at (UTC): 2026-04-06 19:19Z
- Last reviewed at (UTC): 2026-04-06 19:19Z
- Source: technical-evolution
- Related tickets:
  - `tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
  - `../guiadomus-matricula/tickets/open/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening-gap.md`
- Related execplans:
  - n/a
- Related commits:
  - n/a
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve:
  o runner hoje consegue materializar `semantic-review`, `causal-debug` e `ticket-proposal.json`, mas ainda trata `causal-debug` como gate suficiente para publication positiva quando o target projeta ticket, mesmo que a causa-raiz ainda esteja apenas plausivel ou sem falsificacao suficiente.
- Resultado esperado:
  o runner passa a reconhecer uma etapa adicional `rootCauseReview`, executada a partir de prompt target-owned, e bloqueia publication positiva quando a nova etapa concluir que a causa continua apenas plausivel, nao falsificada ou inconclusiva.
- Contexto funcional:
  a frente nasce de uma analise cross-repo de qualidade epistemologica do fluxo. O problema nao e a fronteira bounded de `semantic-review`; o problema e a falta de uma revisao adversarial stage-aware entre `causal-debug` e `ticket-proposal.json`.
- Restricoes tecnicas relevantes:
  - o runner continua sem inventar causa semantica do target;
  - a publication final continua runner-side;
  - o contrato deve continuar backward-compatible para manifests que ainda nao declararem `rootCauseReview`;
  - o desenho nao pode overfitar o caso ancora nem um workflow especifico.

## Jornada de uso
1. O runner materializa a rodada e executa `semantic-review` bounded, como hoje.
2. O runner executa `causal-debug` repo-aware target-owned, agora tratado como inventario de hipoteses.
3. Se o manifesto declarar a nova etapa, o runner executa `root-cause-review` com prompt target-owned e persiste `root-cause-review.result.json`.
4. O target recompõe `assessment.json` e so libera `ticket-proposal.json` quando `root-cause-review` confirmar a causa e liberar ticket readiness.
5. O runner aplica gates mecanicos e publica ticket apenas quando o target entregar artefatos coerentes com a nova etapa.

## Requisitos funcionais
- RF-01: o runner deve aceitar um bloco `rootCauseReview` no manifesto de `/target_investigate_case`, com `promptPath`, artefatos `request/result`, policy repo-aware e recomposicao oficial.
- RF-02: o `round-preparer` deve descobrir e executar `root-cause-review` somente depois de `causal-debug` e antes da publication runner-side.
- RF-03: o schema de `root-cause-review.result.json` deve distinguir ao menos `root_cause_confirmed`, `plausible_but_unfalsified` e `inconclusive`, alem de um sinal separado de `ticket_readiness`.
- RF-04: o runner deve bloquear `publish_ticket` quando:
  - `root-cause-review.result.json` estiver ausente, invalido ou inconclusivo;
  - a nova etapa concluir `plausible_but_unfalsified`;
  - `ticket-proposal.json` existir, mas contradizer a etapa nova.
- RF-05: o runner deve continuar aceitando manifests legados sem `rootCauseReview`, mas sem tomar isso como sinal semantico de que a causa esta confirmada; a policy de rollout deve continuar manifesto-first.
- RF-06: o runner deve aceitar campos aditivos que carreguem perguntas e respostas sobre hipoteses concorrentes, etapas do extractor, escape do QA, oportunidades de prompt/exemplo e guardrails deterministicos.
- RF-07: o publisher deve continuar preservando o conteudo target-owned, mas a publication runner-side deve ganhar gates causais mais fortes do que o atual quality gate editorial.
- RF-08: o quality gate target-owned deve poder evoluir para exigir que tickets publicados com o contrato novo exponham explicitamente:
  - hipoteses consideradas;
  - por que o QA do extractor nao captou o erro;
  - oportunidades de prompt/exemplos/guardrails;
  - ticket readiness e gaps remanescentes quando houver.

## Assumptions and defaults
- `semantic-review` permanece bounded.
- `causal-debug` continua existindo, mas deixa de ser o ultimo gate antes da publication positiva.
- `rootCauseReview` sera target-owned e runner-executed, assim como `semanticReview` e `causalDebug`.
- O runner continua sem descobrir evidencia nova fora do packet e do prompt target-owned declarados no manifesto.
- O rollout sera aditivo e backwards-compatible primeiro; manifests que declararem a etapa nova ficam sujeitos aos novos gates.

## Nao-escopo
- Reescrever a logica semantica do target no runner.
- Mover `ticket-proposal.json` para o runner.
- Tornar o runner autoridade sobre correcoes de extractor, prompt ou QA do projeto alvo.
- Implementar fixes de workflow especifico nesta spec.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - `src/types/target-investigate-case.ts` aceita `rootCauseReview` no manifesto e tipa `root-cause-review.request.json` e `root-cause-review.result.json`.
- [ ] CA-02 - `src/integrations/target-investigate-case-round-preparer.ts` executa a nova etapa quando declarada pelo target e reread/recompõe os artefatos oficiais depois do resultado.
- [ ] CA-03 - `src/core/target-investigate-case.ts` bloqueia `publish_ticket` quando a nova etapa concluir `plausible_but_unfalsified` ou `inconclusive`.
- [ ] CA-04 - os testes do runner cobrem pelo menos um caso em que `ticket-proposal.json` existe, mas a publication precisa ser bloqueada porque a causa ainda nao foi confirmada.
- [ ] CA-05 - o runner continua aceitando manifests legados sem a etapa nova, sem quebrar o contrato atual durante rollout controlado.

## Gate de validacao dos tickets derivados
- Veredito atual: n/a
- Gaps encontrados:
  - n/a
- Correcoes aplicadas:
  - n/a
- Causa-raiz provavel:
  - n/a
- Ciclos executados:
  - n/a
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta secao apenas com o veredito, os gaps, as correcoes e o historico funcional do gate formal; fora desse fluxo, registrar `n/a` quando nao se aplicar.
- Politica historica: alinhamentos desta secao nao exigem migracao retroativa em massa; material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: nao
- Motivo de ativacao ou skip:
  - a frente nasceu de analise manual cross-repo e ainda nao passou pela trilha `/run_specs`.
- Classificacao final:
  - endurecimento contratual runner-side para confirmar root cause antes de publication.
- Confianca:
  - alta
- Frente causal analisada:
  - o runner atual ainda publica tickets quando o target consegue formular uma causa plausivel, mesmo sem uma revisao adversarial posterior.
- Achados sistemicos:
  - a barra editorial atual do publisher nao substitui um gate causal;
  - a nova etapa precisa existir no contrato machine-readable, nao apenas no markdown do ticket;
  - o runner precisa distinguir melhor ticket pronto de ticket ainda bloqueado por hipotese nao falsificada.
- Artefatos do workflow consultados:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-causal-debug.md`
  - `../guiadomus-matricula/utils/case-investigation/causal-debug.js`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
- Elegibilidade de publicacao:
  - a frente existe para deixar publication positiva mais conservadora quando a causa ainda nao estiver confirmada.
- Resultado do ticket transversal ou limitacao operacional:
  - a frente exige mudancas sincronizadas de contrato entre runner e target.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional e continua canonica mesmo quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`. Com a flag desligada, a secao pode permanecer `n/a` e nao recebe write-back automatico. Se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - validar publication runner-side contra um target fixture onde `root-cause-review` exista e retorne `plausible_but_unfalsified`.
- Validacoes manuais pendentes:
  - revisar a policy final de rollout para manifests legados antes de apertar obrigatoriedade ampla.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - direcao contratual da nova etapa definida;
  - fronteira de autoridade target-owned vs publication runner-side preservada na proposta.
- Pendencias em aberto:
  - derivar e executar o ticket runner-side;
  - sincronizar a implementacao com o target project;
  - cobrir o contrato novo com testes e gates.
- Evidencias de validacao:
  - analise cross-repo de 2026-04-06 sobre `case-investigation` e `/target_investigate_case`.

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - `tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
  - `../guiadomus-matricula/tickets/open/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening-gap.md`
- Causas-raiz sistemicas identificadas:
  - publication runner-side ainda depende de um artefato target-owned que nao distingue bem causa confirmada de causa apenas plausivel.
- Ajustes genericos promovidos ao workflow:
  - n/a

## Riscos e impacto
- Risco funcional:
  - medio, porque o runner ganhara mais uma etapa e novos gates antes de publicar ticket.
- Risco operacional:
  - medio, porque o rollout precisa conviver com manifests legados e manifests novos.
- Mitigacao:
  - schema aditivo, gate manifesto-first, testes dedicados e mensagens explicitas de bloqueio.

## Decisoes e trade-offs
- 2026-04-06 - Adicionar `rootCauseReview` como etapa nova, em vez de sobrecarregar `semantic-review` - preserva a fronteira bounded e adiciona a revisao adversarial onde ela faz mais sentido.
- 2026-04-06 - Manter `causal-debug` no fluxo, mas rebaixar seu papel de gate final - reduz overfitting sem remover a leitura repo-aware ja existente.
- 2026-04-06 - Bloquear publication positiva quando a causa continuar apenas plausivel - privilegia precisao epistemologica sobre throughput de backlog.

## Historico de atualizacao
- 2026-04-06 19:19Z - Versao inicial da spec.
