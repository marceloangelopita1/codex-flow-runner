# [SPEC] /target_investigate_case adiciona root-cause-review target-owned e endurece publication contra causas apenas plausiveis

## Metadata
- Spec ID: 2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening
- Status: attended
- Spec treatment: done
- Owner: workflow-core
- Created at (UTC): 2026-04-06 19:19Z
- Last reviewed at (UTC): 2026-04-06 19:55Z
- Source: technical-evolution
- Related tickets:
  - `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
  - `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`
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
- [x] CA-01 - `src/types/target-investigate-case.ts` aceita `rootCauseReview` no manifesto e tipa `root-cause-review.request.json` e `root-cause-review.result.json`.
- [x] CA-02 - `src/integrations/target-investigate-case-round-preparer.ts` executa a nova etapa quando declarada pelo target e reread/recompõe os artefatos oficiais depois do resultado.
- [x] CA-03 - `src/core/target-investigate-case.ts` bloqueia `publish_ticket` quando a nova etapa concluir `plausible_but_unfalsified` ou `inconclusive`.
- [x] CA-04 - os testes do runner cobrem pelo menos um caso em que `ticket-proposal.json` existe, mas a publication precisa ser bloqueada porque a causa ainda nao foi confirmada.
- [x] CA-05 - o runner continua aceitando manifests legados sem a etapa nova, sem quebrar o contrato atual durante rollout controlado.

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

### Ultima execucao registrada
- Executada em (UTC): 2026-04-06T19:49:00.036Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: Houve progresso real nesta revalidacao: o total de gaps caiu de 2 para 0. Os dois `closure-criteria-gap` do passe anterior foram resolvidos nos mesmos tickets, sem gap reancorado remanescente, e o pacote agora torna observaveis tanto a revisao manual do rollout legado quanto RF-08 no contrato/publication enriquecido.
- Ciclos executados: 1
- Thread da validacao: 019d644f-f34c-7ad0-9664-3e6284074abe
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md [fonte=source-spec]
  - tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md [fonte=spec-related]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: NO_GO (high)
  - Resumo: O pacote tem fronteira de ownership explicita entre o ticket novo e o ticket historico e cobre a frente principal da spec, mas segue NO_GO porque duas exigencias de aceite ainda nao ficaram observaveis no fechamento: a revisao manual da policy de rollout para manifests legados e a traducao de RF-08 em evidencias objetivas no contrato/publication target-owned.
  - Thread: 019d644f-f34c-7ad0-9664-3e6284074abe
  - Fingerprints abertos: closure-criteria-gap|tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md&tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md|rf-08, closure-criteria-gap|tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md|ca-05&rf-05
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0
- Ciclo 1 [revalidation]: GO (high)
  - Resumo: Houve progresso real nesta revalidacao: o total de gaps caiu de 2 para 0. Os dois `closure-criteria-gap` do passe anterior foram resolvidos nos mesmos tickets, sem gap reancorado remanescente, e o pacote agora torna observaveis tanto a revisao manual do rollout legado quanto RF-08 no contrato/publication enriquecido.
  - Thread: 019d644f-f34c-7ad0-9664-3e6284074abe
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: sim
  - Correcoes deste ciclo: 2
    - Atualizei os Closure criteria do ticket de root-cause-review para exigir trilha observavel da revisao manual da policy de rollout legado no proprio ticket e para tornar explicita a propagacao de root_cause_status, ticket_readiness e gaps remanescentes nos artefatos oficiais antes da publication runner-side. [applied]
    - Atualizei os Closure criteria do ticket de quality hardening para que RF-08 fique observavel no fechamento, exigindo exposicao explicita no contrato/publication enriquecido de hipoteses consideradas, motivo do escape de QA, oportunidades de prompt/exemplos/guardrails e ticket_readiness com gaps remanescentes, alem dos gates runner-side correspondentes. [applied]

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Atualizei os Closure criteria do ticket de root-cause-review para exigir trilha observavel da revisao manual da policy de rollout legado no proprio ticket e para tornar explicita a propagacao de root_cause_status, ticket_readiness e gaps remanescentes nos artefatos oficiais antes da publication runner-side.
  - Artefatos afetados: tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied
- Atualizei os Closure criteria do ticket de quality hardening para que RF-08 fique observavel no fechamento, exigindo exposicao explicita no contrato/publication enriquecido de hipoteses consideradas, motivo do escape de QA, oportunidades de prompt/exemplos/guardrails e ticket_readiness com gaps remanescentes, alem dos gates runner-side correspondentes.
  - Artefatos afetados: tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim
- Motivo de ativacao ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificacao final: not-systemic
- Confianca: high
- Frente causal analisada: Os dois closure-criteria-gap vieram de aplicacao incompleta do contrato de triagem sobre um pacote hibrido com backlog reconciliado, nao de lacuna material nas instrucoes, prompts ou na ordem atual do workflow.
- Achados sistemicos:
  - nenhum
- Artefatos do workflow consultados:
  - AGENTS.md
  - DOCUMENTATION.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - SPECS.md
  - docs/workflows/codex-quality-gates.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md
  - docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
  - docs/specs/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening.md
  - tickets/open/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md
  - tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md
  - src/core/spec-ticket-validation.ts
  - src/core/runner.ts
  - src/integrations/workflow-gap-analysis-parser.ts
- Elegibilidade de publicacao: nao
- Resultado do ticket transversal ou limitacao operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - validar publication runner-side contra um target fixture onde `root-cause-review` exista e retorne `plausible_but_unfalsified`.
- Validacoes manuais pendentes:
  - revisar a policy final de rollout para manifests legados antes de apertar obrigatoriedade ampla.
- Nota de fechamento da triagem: as validacoes acima seguem herdadas pelos tickets abertos relacionados e nao bloqueiam o encerramento documental desta etapa.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Resultado da triagem final: a revalidacao do pacote derivado terminou em `GO`, sem gaps pendentes ou reancorados; por isso a spec passa a `Status: attended` com `Spec treatment: done`, mantendo a execucao futura rastreada nos tickets relacionados.
- Itens atendidos:
  - a triagem runner-side fechou a fronteira de ownership entre `rootCauseReview` e o ticket historico de quality hardening, sem necessidade de ticket sucessor novo;
  - os `Closure criteria` dos tickets derivados agora tornam observaveis a revisao manual do rollout legado, a propagacao de `root_cause_status`, `ticket_readiness` e gaps remanescentes, e RF-08 no contrato/publication enriquecido;
  - a validacao registrada em `2026-04-06T19:49:00.036Z` reduziu os gaps de 2 para 0 e confirmou rastreabilidade suficiente para seguir no fluxo sequencial de tickets.
- Pendencias em aberto:
  - Nenhuma pendencia residual de triagem/documentacao nesta etapa; a execucao segue rastreada em `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md` e `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`.
- Evidencias de validacao:
  - gate `spec-ticket-validation` concluido com `GO` em `2026-04-06T19:49:00.036Z`, com reducao objetiva de 2 gaps para 0;
  - analise cross-repo de 2026-04-06 sobre `case-investigation` e `/target_investigate_case`;
  - atualizacao observavel dos `Closure criteria` em `tickets/closed/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md` e `tickets/open/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`;
  - releitura objetiva de `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/codex-client.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts` e suites associadas durante esta triagem.

## Auditoria final de entrega
- Auditoria executada em:
  - 2026-04-06 19:55Z
- Resultado:
  - GO final do fechamento da triagem; a releitura desta spec, do historico `GO` da validacao e do diff dos dois tickets relacionados confirmou ausencia de gaps pendentes, coerencia documental e backlog pronto para seguir no fluxo sequencial.
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum ticket novo nesta etapa; permanecem apenas os tickets derivados ja rastreados em `Related tickets`.
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
- 2026-04-06 19:33Z - Triagem runner-side concluida; backlog reconciliado com ticket historico de hardening editorial, sem abrir sucessor novo, e pendencias objetivas registradas por superficie.
- 2026-04-06 19:55Z - Fechamento da triagem versionado com validacao final `GO`, sem gaps pendentes; a spec foi promovida para `Status: attended` e `Spec treatment: done`, mantendo a execucao futura rastreada nos tickets abertos relacionados.
