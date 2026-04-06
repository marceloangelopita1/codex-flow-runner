# [SPEC] /target_investigate_case adiciona causal-debug repo-aware e ticket projection target-owned

## Metadata
- Spec ID: 2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-04-06 05:20Z
- Last reviewed at (UTC): 2026-04-06 06:40Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection-gap.md
  - ../guiadomus-matricula/tickets/closed/2026-04-06-case-investigation-repo-aware-causal-debug-and-ticket-projection-gap.md
- Related execplans:
  - execplans/2026-04-06-target-investigate-case-repo-aware-causal-debug-and-ticket-projection-gap.md
- Related commits:
  - local changeset not yet committed
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve:
  o runner ja conseguia materializar rodada, consumir `semantic-review.request.json`, materializar `semantic-review.result.json` e manter a publication runner-side conservadora, mas ainda nao modelava formalmente a etapa posterior em que o target-project usa o proprio repositorio para localizar a menor causa plausivel do erro e preparar a proposta semantica de ticket.
- Resultado esperado:
  o fluxo oficial passa a ser `materializacao -> hipotese causal local -> semantic confirmation bounded -> recomposicao oficial -> causal-debug repo-aware -> ticket projection target-owned -> publication runner-side`, sem fundir bounded review com debug aberto de repositorio e sem transferir para o runner a autoridade sobre a causa minima do target.
- Contexto funcional:
  o caso ancora em `guiadomus-matricula` ja chegava a `semantic-review.request.json` pronto e a sintomas fortes como `extract_address.value.current.complemento="apartamento n"`, mas faltava a etapa repo-aware capaz de ler codigo, prompts, testes, docs e templates do target para preparar uma proposta de ticket melhor antes da publication.
- Restrições técnicas relevantes:
  - `semantic-review` permanece bounded e sem descoberta livre de nova evidencia;
  - o prompt repo-aware precisa morar no target em caminho canônico, generico e explicitamente declarado no manifesto;
  - o runner nao pode inventar a causa minima do target;
  - `ticket-proposal.json` passa a ser precondicao runner-side quando o target recomendar `publish_ticket`;
  - a publication final continua pertencendo exclusivamente ao runner.

## Jornada de uso
1. O runner materializa a rodada no target e espelha apenas os artefatos canonicos da investigacao.
2. O target produz sua hipotese causal local deterministica e o packet bounded de `semantic-review`.
3. O runner executa apenas a confirmacao semantica bounded quando o packet estiver `ready`.
4. O target recompõe `assessment.json` e `dossier` com o resultado bounded e, se o caso estiver confirmado, materializa `causal-debug.request.json`.
5. O runner executa o prompt repo-aware declarado pelo target, persiste `causal-debug.result.json`, recompõe oficialmente o assessment e consome `ticket-proposal.json`.
6. O runner aplica gates mecanicos, exige `ticket-proposal.json` quando houver recomendacao positiva e somente entao publica ou bloqueia o ticket.

## Requisitos funcionais
- RF-01: o runner deve reconhecer formalmente uma subetapa `causal-debug` target-owned e repo-aware, separada de `semantic-review`.
- RF-02: o contrato do manifesto consumido pelo runner deve aceitar um bloco generico `causalDebug` com `promptPath`, artefatos `request/result/ticketProposal`, policy de leitura repo-aware e recomposicao oficial.
- RF-03: o runner deve usar o prompt repo-aware declarado pelo target, em vez de inventar prompt runner-side especifico por projeto.
- RF-04: o `round-preparer` deve materializar `causal-debug.result.json` apenas quando `causal-debug.request.json` estiver presente e elegivel segundo o target.
- RF-05: o runner deve reread/recompor `assessment.json` oficialmente apos `causal-debug.result.json` quando o manifesto declarar `causalDebug.recomposition`.
- RF-06: `ticket-proposal.json` deve ser tratado como artefato target-owned obrigatorio quando `publication_recommendation.recommended_action="publish_ticket"`.
- RF-07: a publication runner-side deve bloquear com gate explicito quando houver recomendacao positiva sem `ticket-proposal.json`.
- RF-08: o publisher do runner deve preferir `ticket-proposal.json` como fonte final de slug, titulo e markdown quando esse artefato estiver presente.

## Assumptions and defaults
- O caminho canonico do prompt repo-aware pertence ao target project e e resolvido a partir do manifesto.
- `causal-debug` so e elegivel depois de confirmacao bounded suficiente.
- `ticket-proposal.json` nao substitui os gates do runner; ele apenas alimenta publication com conteudo target-owned.
- A retrocompatibilidade runner-side com manifests sem `causalDebug` continua apenas para rounds nao elegiveis a publication positiva neste contrato novo.

## Nao-escopo
- Transformar `semantic-review` em auditoria aberta de repositorio.
- Permitir descoberta externa de evidencia durante `causal-debug`.
- Mover para o target a decisao final de publication ou a abertura mecanica do ticket.
- Criar prompt repo-aware ad hoc com nome especifico de dominio ou projeto.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `src/types/target-investigate-case.ts` aceita o bloco `causalDebug` e os artefatos `causal-debug.request.json`, `causal-debug.result.json` e `ticket-proposal.json`.
- [x] CA-02 - `src/integrations/target-investigate-case-round-preparer.ts` executa a etapa repo-aware apenas via prompt declarado pelo target, persiste `causal-debug.result.json` e recompõe o assessment oficial.
- [x] CA-03 - `src/core/target-investigate-case.ts` exige `ticket-proposal.json` quando o target pede `publish_ticket` e bloqueia publication com gate explicito quando esse artefato estiver ausente.
- [x] CA-04 - `src/integrations/target-investigate-case-ticket-publisher.ts` reutiliza `ticket-proposal.json` como fonte preferencial de slug, titulo e markdown.
- [x] CA-05 - `npm run check`, `npm test` e as suites focadas do fluxo passam com o contrato novo.

## Gate de validacao dos tickets derivados
- Veredito atual: n/a
- Gaps encontrados:
  - n/a
- Correções aplicadas:
  - n/a
- Causa-raiz provável:
  - a capability anterior encerrava o desenho mecanico do runner cedo demais, antes de existir uma fase repo-aware target-owned entre bounded confirmation e publication.
- Ciclos executados:
  - n/a
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta seção apenas com o veredito, os gaps, as correções e o histórico funcional do gate formal; fora desse fluxo, registrar `n/a` quando não se aplicar.
- Política histórica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: nao
- Motivo de ativação ou skip:
  - esta spec incremental foi aberta diretamente para fechar uma lacuna estrutural multi-repo ja suficientemente compreendida a partir do caso ancora e dos contratos vivos existentes.
- Classificação final:
  - lacuna de arquitetura e contrato cross-repo entre bounded confirmation, debug causal e publication.
- Confiança:
  - alta.
- Frente causal analisada:
  - ausencia de etapa repo-aware target-owned e de `ticket-proposal.json` como fronteira formal antes da publication.
- Achados sistêmicos:
  - `semantic-review` bounded estava correto e deveria ser preservado;
  - a melhoria continua orientada a codigo exigia uma fase adicional, nao um alargamento da fase bounded;
  - a publication runner-side precisava passar a depender de artefato target-owned mais forte do que narrativa em `assessment.json`.
- Artefatos do workflow consultados:
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `src/types/target-investigate-case.ts`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/investigations/2026-04-06T03-21-21Z/assessment.json`
- Elegibilidade de publicação:
  - a nova etapa existe exatamente para tornar publication positiva mais forte e menos narrativa.
- Resultado do ticket transversal ou limitação operacional:
  - o ticket transversal desta frente foi implementado localmente no runner e acompanhado da evolucao espelhada no target.
- Nota de uso: quando esta spec vier de `/run_specs`, esta seção deve registrar a retrospectiva pre-run-all como superfície distinta do gate funcional e continua canônica mesmo quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`. Com a flag desligada, a seção pode permanecer `n/a` e não recebe write-back automático. Se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e a execução ocorrer no próprio `codex-flow-runner`, write-back nesta seção é permitido. Em projeto externo, a fonte observável desta fase é trace/log/resumo, e não a spec do projeto alvo.
- Política anti-duplicação: a retrospectiva sistêmica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto histórico, mas não deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - nenhuma adicional no runner alem das suites automatizadas desta etapa.
- Validações manuais pendentes:
  - eventual rodada Telegram autorizada permanece fora do escopo desta entrega.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Itens atendidos:
  - o manifesto-base do runner agora declara `causalDebug` de forma generica;
  - o runner tipa, descobre e valida `causal-debug.request.json`, `causal-debug.result.json` e `ticket-proposal.json`;
  - o `round-preparer` executa a etapa repo-aware e recompõe o assessment oficial;
  - a publication do runner passou a depender de `ticket-proposal.json` quando o target pede ticket;
  - o publisher prefere o markdown e os metadados estruturados do target.
- Pendências em aberto:
  - nenhuma nesta spec incremental.
- Evidências de validação:
  - `npm run check` -> `exit 0`
  - `npm test` -> `exit 0`
  - `npx tsx --test src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts` -> `exit 0`

## Auditoria final de entrega
- Auditoria executada em:
  - 2026-04-06 06:40Z
- Resultado:
  - GO final desta etapa incremental; a separacao formal entre bounded review, causal-debug repo-aware, ticket projection target-owned e publication runner-side ficou implementada e validada.
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum.
- Causas-raiz sistêmicas identificadas:
  - o contrato anterior terminava na confirmacao bounded e delegava o resto a prosa do assessment, sem artefato target-owned suficiente para publication.
- Ajustes genéricos promovidos ao workflow:
  - o manifesto-base do runner passou a documentar `causalDebug` como parte do contrato generico do fluxo.

## Riscos e impacto
- Risco funcional:
  - medio, porque a publication positiva agora depende de mais artefatos e recomposicoes formais.
- Risco operacional:
  - medio, porque o runner precisa sincronizar mais artefatos cross-repo.
- Mitigação:
  - gates explicitos, testes dedicados do core/preparer/publisher e preservacao da fronteira de autoridade.

## Decisoes e trade-offs
- 2026-04-06 - Reutilizar o prompt repo-aware do target em caminho canonico, em vez de criar um prompt runner-side novo - preserva ownership semantico do target e evita overfit por projeto.
- 2026-04-06 - Exigir `ticket-proposal.json` para `publish_ticket` - publication runner-side continua mecanica, mas passa a depender de conteudo target-owned mais forte.

## Historico de atualizacao
- 2026-04-06 05:20Z - Versão inicial da spec.
- 2026-04-06 06:40Z - Spec concluida com implementacao, testes e rastreabilidade formal.
