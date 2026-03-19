# [SPEC] Retrospectiva sistemica do workflow apos spec-audit

## Metadata
- Spec ID: 2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-19 19:45Z
- Last reviewed at (UTC): 2026-03-19 22:10Z
- Source: technical-evolution
- Related tickets:
  - tickets/open/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md
  - tickets/open/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md
  - tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md
- Related execplans:
  - Nenhum ainda.
- Related commits:
  - Nenhum ainda.
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve: o fluxo atual ja possui `spec-ticket-validation` antes do `/run-all` e `spec-audit` como auditoria final apos a rodada encadeada, mas ainda mistura no prompt de auditoria final resquicios de responsabilidade sobre melhoria de workflow. Isso enfraquece a separacao entre auditoria funcional da spec e aprendizagem sistemica sobre o `codex-flow-runner`, e reduz a precisao sobre quando abrir backlog transversal reaproveitavel.
- Resultado esperado: o runner passa a executar um novo estagio explicito `spec-workflow-retrospective` depois de `spec-audit`, apenas quando houver gaps residuais reais. Esse estagio avalia, em contexto novo, se o workflow atual do `codex-flow-runner` contribuiu materialmente para esses gaps e, somente com `high confidence` e beneficio reaproveitavel, cria ou reutiliza no maximo 1 ticket transversal agregado no `codex-flow-runner`.
- Contexto funcional: `spec-audit` continua sendo a etapa canonica de auditoria funcional da spec do projeto corrente, incluindo abertura de follow-ups funcionais da propria spec quando necessario. A retrospectiva sistemica passa a ser uma etapa posterior, separada, com duas subetapas distintas: `workflow-gap-analysis` e `workflow-ticket-publication`.
- Restricoes tecnicas relevantes:
  - manter o fluxo sequencial do runner;
  - executar `spec-workflow-retrospective` somente quando `spec-audit` encontrar gaps residuais reais;
  - iniciar `workflow-gap-analysis` em contexto novo, sem herdar implicitamente o contexto de `spec-audit`;
  - permitir que `workflow-ticket-publication` reutilize o contexto da propria analise, por depender diretamente do seu resultado;
  - considerar sempre dois contextos quando o projeto auditado for externo: o projeto corrente onde o gap aconteceu e `../codex-flow-runner` como origem potencial da melhoria sistemica;
  - nao alterar a spec nem fazer commit/push no projeto corrente quando ele nao for o proprio `codex-flow-runner`;
  - manter a retrospectiva sistemica como etapa nao bloqueante;
  - abrir ou reutilizar no maximo 1 ticket transversal agregado por rodada auditada.

## Jornada de uso
1. Operador envia `/run_specs <arquivo-da-spec.md>` para uma spec elegivel.
2. O runner executa `spec-triage`, `spec-ticket-validation`, `spec-close-and-version`, `/run-all` e `spec-audit`.
3. O `spec-audit` rele spec, tickets, execplans e codigo final do projeto corrente, identifica gaps residuais e, quando necessario, abre follow-ups funcionais da propria spec.
4. Se o `spec-audit` nao encontrar gaps residuais reais, o fluxo termina sem retrospectiva sistemica.
5. Se o `spec-audit` encontrar gaps residuais reais, o runner inicia `spec-workflow-retrospective` em contexto novo e executa `workflow-gap-analysis`.
6. `workflow-gap-analysis` usa como insumo principal os follow-up tickets funcionais abertos na auditoria; na falta deles, usa a spec e o resultado do `spec-audit` como fallback.
7. A analise compara o que falhou no projeto corrente com o que o `codex-flow-runner` orienta hoje, priorizando leitura de `AGENTS.md`, arquivos canonicos de instrucao, `prompts/` e, quando necessario, trechos de runner/orquestracao.
8. Se a analise concluir que o workflow atual contribuiu materialmente para recorrencia futura evitavel com `high confidence`, o runner executa `workflow-ticket-publication`.
9. `workflow-ticket-publication` cria ou reutiliza no maximo 1 ticket transversal agregado no `codex-flow-runner`, sem bloquear a rodada se a publicacao falhar.
10. O resultado da retrospectiva sistemica aparece em trace/log e no resumo final do `/run_specs`, distinguindo follow-up funcional da spec de follow-up sistemico do workflow.

## Requisitos funcionais
- RF-01: o runner deve introduzir um novo estagio explicito `spec-workflow-retrospective` apos `spec-audit`.
- RF-02: `spec-workflow-retrospective` deve executar apenas quando `spec-audit` encontrar gaps residuais reais.
- RF-03: `spec-audit` deve permanecer restrito a auditoria funcional da spec do projeto corrente.
- RF-04: `spec-audit` pode abrir follow-ups funcionais da propria spec quando necessario, mas nao deve decidir nem publicar melhoria sistemica de workflow.
- RF-05: `spec-workflow-retrospective` deve conter duas subetapas distintas, com prompts separados:
  - `workflow-gap-analysis`
  - `workflow-ticket-publication`
- RF-06: `workflow-gap-analysis` deve iniciar em contexto novo, sem herdar implicitamente o contexto conversacional de `spec-audit`.
- RF-07: `workflow-ticket-publication` so deve rodar quando a analise concluir elegibilidade sistemica com `high confidence` e pode reutilizar o contexto da propria analise.
- RF-08: o insumo principal de `workflow-gap-analysis` deve ser o conjunto de follow-up tickets funcionais abertos por `spec-audit`.
- RF-09: quando `spec-audit` identificar gaps residuais reais sem abrir follow-up funcional, `workflow-gap-analysis` deve usar a spec e o resultado da auditoria como fallback.
- RF-10: `workflow-gap-analysis` nao deve confiar apenas em output estruturado anterior; ele deve reler explicitamente a spec do projeto corrente e os artefatos relevantes da auditoria.
- RF-11: quando o projeto corrente nao for o proprio `codex-flow-runner`, `workflow-gap-analysis` deve considerar dois contextos:
  - o projeto corrente onde o gap aconteceu;
  - `../codex-flow-runner`, como origem potencial da melhoria sistemica.
- RF-12: o prompt de `workflow-gap-analysis` deve direcionar a leitura inicial no `codex-flow-runner` para as fontes canonicas do fluxo, priorizando:
  - `AGENTS.md` do projeto;
  - arquivos principais de instrucao do fluxo;
  - a pasta `prompts/`;
  - trechos relevantes de runner/orquestracao apenas quando necessario.
- RF-13: a analise deve avaliar se instrucoes, prompts, contratos, validacoes ou ordem das etapas do `codex-flow-runner` contribuiram materialmente para o gap observado no projeto corrente.
- RF-14: a elegibilidade sistemica deve exigir evidencia razoavel de contribuicao do workflow atual e beneficio reaproveitavel para specs futuras.
- RF-15: melhorias meramente de enfase, sem evidencia concreta de omissao, ambiguidade relevante, contrato incompleto, validacao insuficiente ou ordenacao ruim do fluxo, nao devem gerar ticket automatico.
- RF-16: quando a analise concluir `high confidence`, o runner pode abrir automaticamente ticket transversal agregado de melhoria de workflow.
- RF-17: quando a analise concluir `medium confidence`, o runner deve registrar apenas hipotese sistemica no trace/log e no resumo final, sem abrir ticket automaticamente.
- RF-18: quando a analise concluir `low confidence`, o runner nao deve abrir ticket nem promover hipotese sistemica acionavel.
- RF-19: `workflow-ticket-publication` deve criar ou reutilizar no maximo 1 ticket transversal agregado por rodada auditada, consolidando os gaps sistemicos elegiveis daquela spec.
- RF-20: o ticket transversal agregado deve deixar explicito:
  - qual gap ocorreu no projeto corrente;
  - por que ha evidencia de contribuicao do workflow;
  - qual melhoria no `codex-flow-runner` pode reduzir recorrencia futura.
- RF-21: quando o projeto ativo for o proprio `codex-flow-runner`, `workflow-ticket-publication` deve publicar o ticket transversal no repositorio atual.
- RF-22: quando o projeto ativo for externo, `workflow-ticket-publication` deve publicar o ticket transversal em `../codex-flow-runner`.
- RF-23: a publicacao deve preservar deduplicacao/reuso quando ja existir ticket aberto equivalente no repositorio alvo.
- RF-24: falhas tecnicas em `workflow-gap-analysis` devem ser registradas como limitacao operacional nao bloqueante.
- RF-25: falhas tecnicas em `workflow-ticket-publication` devem ser registradas como limitacao operacional nao bloqueante.
- RF-26: quando o projeto auditado for externo, `spec-workflow-retrospective` nao deve alterar a spec nem fazer commit/push no projeto corrente.
- RF-27: quando o projeto auditado for externo, o unico repositorio elegivel para commit/push desta retrospectiva e o `codex-flow-runner`, se a publicacao do ticket transversal for bem-sucedida.
- RF-28: quando `spec-workflow-retrospective` rodar, ele passa a ser a fase final observavel do `/run_specs`.
- RF-29: o resultado da retrospectiva sistemica deve aparecer obrigatoriamente no trace/log e no resumo final do `/run_specs`.
- RF-30: o resumo final do `/run_specs` deve distinguir explicitamente:
  - follow-ups funcionais da spec;
  - hipotese sistemica sem ticket automatico;
  - ticket transversal sistemico publicado ou reutilizado;
  - limitacao operacional da retrospectiva sistemica, quando houver.
- RF-31: o prompt e o contrato operacional de `spec-audit` devem ser atualizados para remover qualquer resquicio de responsabilidade sobre melhoria de workflow e reforcar seu foco exclusivo na auditoria funcional da spec.

## Assumptions and defaults
- O nome canonico do novo estagio e `spec-workflow-retrospective`.
- Os nomes canonicos das duas subetapas sao `workflow-gap-analysis` e `workflow-ticket-publication`.
- A retrospectiva sistemica e sempre posterior ao `spec-audit`.
- A retrospectiva sistemica so existe quando `spec-audit` encontrar gaps residuais reais.
- Follow-up funcional da spec e follow-up sistemico do workflow sao artefatos distintos e devem permanecer separados.
- O insumo principal da analise sistemica sao os follow-up tickets funcionais abertos por `spec-audit`.
- Na ausencia excepcional desses tickets, a analise usa a spec e o resultado da auditoria como fallback.
- Abertura automatica de ticket transversal exige `high confidence`, evidencia forte e utilidade reaproveitavel.
- `Medium confidence` gera apenas hipotese sistemica observada em trace/log e resumo final.
- `Low confidence` nao gera ticket automatico.
- O ticket transversal automatico deve ser no maximo 1 artefato agregado por rodada auditada.
- A leitura no `codex-flow-runner` deve comecar pelas fontes canonicas do fluxo, evitando exploracao ampla do repositorio por padrao.
- Quando a retrospectiva sistemica roda, ela passa a ser a fase final observavel de sucesso do `/run_specs`.

## Nao-escopo
- Fundir retrospectiva sistemica dentro do proprio `spec-audit`.
- Alterar a semantica de `spec-ticket-validation`.
- Permitir abertura automatica de ticket transversal com `medium confidence`.
- Criar taxonomia fixa obrigatoria de contribuicao sistemica.
- Abrir 1 ticket transversal por gap individual.
- Alterar a spec do projeto corrente quando ele for externo apenas para registrar retrospectiva sistemica.
- Fazer commit/push no projeto corrente externo por causa desta retrospectiva.
- Vasculhar o repositorio inteiro do `codex-flow-runner` por padrao, sem priorizacao das fontes canonicas.
- Tornar a retrospectiva sistemica uma etapa bloqueante do encerramento da rodada principal.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Quando `spec-audit` encontrar gaps residuais reais, o `/run_specs` executa `spec-workflow-retrospective` apos a auditoria funcional.
- [ ] CA-02 - Quando `spec-audit` nao encontrar gaps residuais reais, `spec-workflow-retrospective` nao roda e `spec-audit` permanece como etapa final daquele fluxo.
- [ ] CA-03 - `spec-audit` continua abrindo apenas follow-ups funcionais da propria spec e nao tenta abrir ticket transversal de workflow.
- [ ] CA-04 - `workflow-gap-analysis` inicia em contexto novo em relacao ao `spec-audit`.
- [ ] CA-05 - `workflow-ticket-publication` so roda quando `workflow-gap-analysis` concluir elegibilidade com `high confidence`.
- [ ] CA-06 - Com `medium confidence`, o fluxo nao abre ticket automatico e registra apenas hipotese sistemica no trace/log e no resumo final.
- [ ] CA-07 - Com `low confidence` ou sugestao meramente de enfase, o fluxo nao abre ticket automatico.
- [ ] CA-08 - `workflow-gap-analysis` usa como insumo principal os follow-up tickets funcionais abertos por `spec-audit`; na falta deles, usa a spec e o resultado da auditoria como fallback.
- [ ] CA-09 - Em projeto externo, a analise prioriza leitura de `AGENTS.md`, arquivos canonicos de instrucao e `prompts/` em `../codex-flow-runner`, expandindo para trechos de runner/orquestracao apenas quando necessario.
- [ ] CA-10 - Com `high confidence`, o fluxo cria ou reutiliza no maximo 1 ticket transversal agregado e registra o resultado no trace/log e no resumo final.
- [ ] CA-11 - Quando o projeto auditado for externo, `spec-workflow-retrospective` nao altera a spec nem faz commit/push no projeto corrente.
- [ ] CA-12 - Quando a publicacao for necessaria em projeto externo, ela ocorre em `../codex-flow-runner`, com deduplicacao/reuso quando houver ticket equivalente aberto.
- [ ] CA-13 - Falhas tecnicas na analise ou na publicacao sao registradas como limitacao operacional nao bloqueante no trace/log e no resumo final.
- [ ] CA-14 - Quando `spec-workflow-retrospective` roda, ele passa a aparecer como fase final observavel do `/run_specs`.
- [ ] CA-15 - O prompt de `spec-audit` deixa de instruir abertura ou promocao de melhoria sistemica de workflow e reforca o foco exclusivo na auditoria funcional da spec.
- [ ] CA-16 - Quando o proprio projeto corrente for `codex-flow-runner`, o ticket transversal agregado pode ser publicado no mesmo repositorio, preservando deduplicacao/reuso e registrando o resultado no trace/log e no resumo final.

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
- Observacoes de melhoria sistemica:
  - n/a nesta fase inicial da spec. Quando esta spec for executada por `/run_specs`, esta secao deve registrar o gate formal de validacao dos tickets derivados conforme `SPECS.md`.
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta secao com o veredito, os gaps e as correcoes do gate formal; fora desse fluxo, registrar `n/a` quando nao se aplicar.
- Politica historica: alinhamentos desta secao nao exigem migracao retroativa em massa; material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-19T22:09:56.374Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado inteiro esta consistente com a spec alvo: os 3 tickets cobrem conjuntamente RF-01..RF-31 e CA-01..CA-16, seguem a particao esperada pela propria secao de pendencias da spec e atendem ao contrato canonico de `INTERNAL_TICKETS.md` para tickets derivados de spec-triage sem gaps objetivos remanescentes nesta rodada.
- Ciclos executados: 0
- Thread da validacao: 019d0824-4cdc-7e41-9083-32e8b0b43744
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md [fonte=source-spec]
  - tickets/open/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md [fonte=source-spec]
  - tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: GO (high)
  - Resumo: O pacote derivado inteiro esta consistente com a spec alvo: os 3 tickets cobrem conjuntamente RF-01..RF-31 e CA-01..CA-16, seguem a particao esperada pela propria secao de pendencias da spec e atendem ao contrato canonico de `INTERNAL_TICKETS.md` para tickets derivados de spec-triage sem gaps objetivos remanescentes nesta rodada.
  - Thread: 019d0824-4cdc-7e41-9083-32e8b0b43744
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Nenhuma.

#### Observacoes sobre melhoria sistemica do workflow
- Resultado do ticket transversal: not-needed
  - Detalhe: Nenhum gap sistemico elegivel exigiu ticket transversal nesta execucao.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Cobrir em testes a nova sequencia de sucesso/encerramento quando `spec-workflow-retrospective` roda apos `spec-audit`.
  - Cobrir em testes a separacao entre `workflow-gap-analysis` e `workflow-ticket-publication`.
  - Cobrir em testes os comportamentos `high`, `medium` e `low confidence`.
  - Cobrir em testes a ausencia de alteracao da spec e de commit/push no projeto corrente quando o projeto auditado for externo.
  - Cobrir em testes a criacao ou reuso de 1 unico ticket transversal agregado e as limitacoes operacionais nao bloqueantes.
- Validacoes manuais pendentes:
  - Executar uma rodada real de `/run_specs` em projeto externo com gaps residuais reais e `../codex-flow-runner` acessivel, validando o resumo final e o ticket transversal agregado.
  - Executar uma rodada real equivalente sem `../codex-flow-runner` acessivel, validando a limitacao operacional nao bloqueante.
  - Executar uma rodada real no proprio `codex-flow-runner`, validando o caso especial de publicacao no mesmo repositorio e a legibilidade do resumo final no Telegram.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Ja existe infraestrutura reutilizavel para publicar ou reutilizar 1 ticket transversal com deduplicacao, commit/push e suporte a repo atual ou `../codex-flow-runner`, implementada em `src/integrations/workflow-improvement-ticket-publisher.ts`; ela permanece util, mas ainda esta conectada ao estagio errado.
  - Ja existe infraestrutura de observabilidade reutilizavel para resumo final e traces de `/run_specs`, incluindo propagacao de resultados sistemicos hoje associados a `spec-ticket-validation` em `src/core/runner.ts`, `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts`.
- Pendencias em aberto:
  - `tickets/open/2026-03-19-retrospectiva-pos-spec-audit-orquestracao-e-separacao-gap.md`: introduzir `spec-workflow-retrospective` apos `spec-audit`, tornar a fase final observavel condicional e remover de `spec-audit` qualquer resquicio de responsabilidade sobre melhoria sistemica.
  - `tickets/open/2026-03-19-workflow-gap-analysis-pos-auditoria-contrato-e-contexto-gap.md`: criar o contrato dedicado de `workflow-gap-analysis`, com contexto novo, uso prioritario dos follow-up tickets funcionais da auditoria, fallback controlado e criterio formal para `high | medium | low confidence`.
  - `tickets/open/2026-03-19-workflow-ticket-publication-pos-auditoria-cross-repo-gap.md`: reaproveitar o publisher cross-repo atual apenas no pos-`spec-audit`, preservando deduplicacao/reuso e garantindo que a retrospectiva em projeto externo nao altere a spec nem faca commit/push no projeto corrente.
  - Distinguir no trace/log e no resumo final do `/run_specs` os artefatos funcionais da spec, a hipotese sistemica sem ticket automatico, o ticket transversal publicado/reutilizado e a limitacao operacional da retrospectiva.
- Evidencias de validacao:
  - Entrevista de alinhamento concluida em 2026-03-19 19:45Z, consolidando objetivo, jornada, RFs, CAs, nao-escopo, restricoes, riscos, assumptions/defaults e trade-offs para a retrospectiva sistemica.
  - Releitura do contrato atual em `SPECS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `docs/workflows/discover-spec.md`, `prompts/08-auditar-spec-apos-run-all.md`, `prompts/09-validar-tickets-derivados-da-spec.md`, `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md` e `src/core/runner.ts`.
  - Avaliacao de gaps concluida em 2026-03-19 22:03Z com releitura de `src/core/runner.ts`, `src/integrations/codex-client.ts`, `src/types/flow-timing.ts`, `src/types/state.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`, `prompts/08-auditar-spec-apos-run-all.md` e `docs/workflows/codex-quality-gates.md`, resultando na abertura dos tickets relacionados acima.
  - Validacao final desta etapa concluida em 2026-03-19 22:10Z, confirmando consistencia entre status `approved`, `Spec treatment: pending`, secao de pendencias e os 3 tickets abertos vinculados.

## Auditoria final de entrega
- Auditoria executada em:
  - n/a
- Resultado:
  - n/a
- Tickets/follow-ups abertos a partir da auditoria:
  - n/a
- Causas-raiz sistemicas identificadas:
  - n/a
- Ajustes genericos promovidos ao workflow:
  - n/a

## Riscos e impacto
- Risco funcional: a analise sistemica abrir ticket transversal com excesso de sensibilidade e gerar ruido no backlog do `codex-flow-runner`.
- Risco operacional: a introducao do novo estagio aumentar a complexidade observavel do `/run_specs`, especialmente em cenarios cross-repo.
- Mitigacao:
  - exigir `high confidence`, evidencia razoavel e utilidade reaproveitavel para abertura automatica;
  - manter `medium confidence` apenas como hipotese em trace/log e resumo final;
  - limitar a no maximo 1 ticket transversal agregado por rodada;
  - manter a retrospectiva como etapa nao bloqueante.

## Decisoes e trade-offs
- 2026-03-19 - Separar auditoria funcional e retrospectiva sistemica em estagios distintos - reduz mistura de objetivos e melhora a precisao sobre quando abrir backlog transversal de workflow.
- 2026-03-19 - Usar dois prompts separados (`workflow-gap-analysis` e `workflow-ticket-publication`) - reduz vies entre diagnostico causal e publicacao de ticket.
- 2026-03-19 - Agregar no maximo 1 ticket transversal por rodada auditada - privilegia aprendizado sistemico sobre fragmentacao excessiva do backlog.
- 2026-03-19 - Priorizar leitura de `AGENTS.md`, docs canonicos e `prompts/` no `codex-flow-runner` - aumenta a chance de uma analise causal boa sem exigir leitura exaustiva do repositorio.
- 2026-03-19 - Nao alterar o projeto corrente externo durante a retrospectiva sistemica - preserva a separacao entre o escopo funcional da spec auditada e o backlog transversal do `codex-flow-runner`.

## Historico de atualizacao
- 2026-03-19 19:45Z - Versao inicial da spec materializada a partir de entrevista detalhada, com escopo aprovado para introduzir `spec-workflow-retrospective` apos `spec-audit`.
- 2026-03-19 22:03Z - Avaliacao de gaps contra o estado atual concluida; tickets derivados abertos para orquestracao/separacao de etapas, contrato de `workflow-gap-analysis` e adaptacao da publicacao cross-repo pos-auditoria.
- 2026-03-19 22:10Z - Validacao final da triagem concluida; status mantido em `approved` com `Spec treatment: pending` e rastreabilidade fechada para os 3 tickets abertos.
