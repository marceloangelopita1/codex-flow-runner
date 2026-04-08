# ExecPlan - target-investigate-case remediation-first no runner

## Purpose / Big Picture
- Objetivo:
  fazer o `codex-flow-runner` apresentar `target-investigate-case` de forma remediation-first sem relaxar o gate conservador de publication automatica.
- Resultado esperado:
  o runner passa a aceitar o manifesto target-owned com `remediation-proposal.json`, expor um eixo investigativo/remediation-first separado do eixo de publication em `summary` e `trace`, e renderizar o resumo final/Telegram com a mensagem "ha remediacao acionavel; publication automatica segue bloqueada" quando esse for o caso.
- Escopo:
  compatibilidade de manifesto e artefatos do fluxo `target-investigate-case`;
  extensao de tipos/schemas internos para separar resultado investigativo de `publication_status`/`overall_outcome`;
  atualizacao de `src/core/target-investigate-case.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e testes associados.
- Fora de escopo:
  mudar a barra de `ticket-proposal.json` ou publication positiva;
  reinterpretar causalidade local alem do que o target ja materializa;
  alterar o target novamente.

## Progress
- [x] 2026-04-08 03:30Z - Planejamento inicial concluido com leitura do ticket, da spec cross-repo, do `AGENTS.md` e das superficies do runner afetadas.
- [x] 2026-04-08 03:30Z - Descoberta registrada: o runner atual tambem precisa aceitar `phaseOutputs["remediation-proposal"]` no manifesto do target para manter compatibilidade contratual.
- [x] 2026-04-08 03:30Z - ExecPlan aberto e vinculado ao ticket.
- [x] 2026-04-08 03:47Z - Implementacao remediation-first concluida em tipos, core, summary e Telegram, incluindo compatibilidade com `remediation-proposal.json` no manifesto target-owned.
- [x] 2026-04-08 03:51Z - Testes focados, `npm run check` e `npm test` revalidados com `exit 0`.
- [x] 2026-04-08 03:51Z - Ticket fechado com rastreabilidade atualizada.

## Surprises & Discoveries
- 2026-04-08 03:30Z - O target ja promoveu `remediation-proposal.json` ao manifesto oficial; sem compatibilidade runner-side para esse `phaseOutputs`, o fluxo fica vulneravel a drift de contrato mesmo antes da UX final remediation-first.
- 2026-04-08 03:30Z - O runner ja carrega `assessment.primary_remediation` no schema interno, entao o maior gap nao e falta de modelagem base, e sim ausencia de uma surface separada para o resultado investigativo e do artefato novo do target.
- 2026-04-08 03:30Z - `overall_outcome` atual e publication-centric por desenho; para atender a spec sem relaxar gates, a melhor estrategia e adicionar um eixo investigativo separado, em vez de forcar `overall_outcome` a carregar as duas semanticas ao mesmo tempo.

## Decision Log
- 2026-04-08 - Decisao: separar `resultado investigativo/remediacao` de `publication_status` por meio de novos campos estruturados em `finalSummary` e `tracePayload`, em vez de substituir `overall_outcome`.
  - Motivo:
    `overall_outcome` continua util como veredito mecanico runner-side de publication, mas nao deve mais ser a manchete do caso quando o target ja encontrou uma remediacao pronta.
  - Impacto:
    `summary.details`, `renderTargetInvestigateCaseFinalSummary()` e Telegram passam a usar primeiro o novo eixo investigativo.
- 2026-04-08 - Decisao: manter `overall_outcome` sem novos enums nesta entrega.
  - Motivo:
    o problema principal e de surface operator-facing e de separacao de eixos, nao de insuficiencia do enum publication-side; isso reduz churn contratual desnecessario.
  - Impacto:
    a classificacao operator-facing deixa de depender diretamente de `overall_outcome`, mas o artefato `publication-decision.json` permanece estavel.
- 2026-04-08 - Decisao: aceitar `phaseOutputs["remediation-proposal"]` e rastrear `remediation-proposal.json` como artefato opcional oficial do flow.
  - Motivo:
    o target ja materializa esse contrato; o runner precisa permanecer repo-aware sem depender de inferencia textual.
  - Impacto:
    schemas de manifesto, fixtures e descoberta de artefatos precisam ser atualizados junto das surfaces finais.
- 2026-04-08 - Decisao: manter a regra de `publication` intacta e elevar apenas as surfaces operator-facing para remediation-first.
  - Motivo:
    a spec pede mudanca de mentalidade e UX sem enfraquecer o gate conservador de `ticket-proposal.json`.
  - Impacto:
    `overall_outcome` continua publication-centric para automacao, enquanto `investigation_outcome` vira a manchete humana do caso.

## Outcomes & Retrospective
- Status final:
  concluido.
- O que funcionou:
  a separacao entre `investigation_outcome` e `publication_status` resolveu o problema central sem churn contratual em `overall_outcome`;
  a compatibilidade com `remediation-proposal.json` ficou coberta pelos mesmos testes do flow, reduzindo risco de drift cross-repo;
  a UX final do runner e do Telegram agora destaca remediacao acionavel antes do bloqueio de publication.
- O que ficou pendente:
  spot-check manual em Telegram real continua desejavel como validacao operator-facing, mas nao bloqueia o fechamento tecnico deste ticket.
- Proximos passos:
  executar o spot-check manual em ambiente com Telegram real quando houver uma rodada remediation-first disponivel;
  acompanhar os proximos casos para confirmar que a nova surface reduz leituras equivocadas de `inconclusive-case`.

## Context and Orientation
- Parent ticket:
  `tickets/closed/2026-04-08-target-investigate-case-remediation-first-summary-and-publication-semantics-gap.md`
- Parent spec:
  `/home/mapita/projetos/guiadomus-matricula/docs/specs/2026-04-08-case-investigation-remediation-first-outcome-and-publication-separation.md`
- Target repo relacionado:
  `/home/mapita/projetos/guiadomus-matricula`
- RFs/CAs cobertos por este plano:
  RF-08, RF-09 e a parcela runner-side de CA-04/CA-09 da spec cross-repo.
- Arquivos principais:
  `src/types/target-investigate-case.ts`
  `src/core/target-investigate-case.ts`
  `src/core/runner.ts`
  `src/integrations/telegram-bot.ts`
  `src/core/target-investigate-case.test.ts`
  `src/core/runner.test.ts`
  `src/integrations/telegram-bot.test.ts`
- Assumptions / defaults adotados:
  `publication` continua estritamente gated por `ticket-proposal.json`;
  o runner exibe apenas a remediacao target-owned ja materializada, sem inferir novas correcoes;
  `assessment.primary_remediation.status="recommended"` com `execution_readiness="ready"` define remediacao acionavel;
  `remediation-proposal.json` e opcional e so aparece quando existir no namespace da rodada.
- Restricoes tecnicas:
  preservar compatibilidade com rounds antigos que ainda nao tenham `primary_remediation` ou `remediation-proposal.json`;
  evitar duplicar logica causal do target no runner;
  manter os testes do flow como autoridade observavel do comportamento final.

## Plan of Work
- Milestone 1 - Compatibilidade contratual com o target remediation-first
  - Entregavel:
    schemas de manifesto e artefatos aceitam `remediation-proposal.json` sem regressao em rounds antigos.
  - Evidencia de conclusao:
    fixtures/manifests de teste passam a validar com o novo `phaseOutputs["remediation-proposal"]`.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`
- Milestone 2 - Eixo investigativo separado no core do runner
  - Entregavel:
    `finalSummary`, `tracePayload` e `summary.details` passam a carregar um resultado investigativo/remediation-first separado de publication.
  - Evidencia de conclusao:
    o caso com `primary_remediation.recommended + ready + publication_only` deixa de ter `inconclusive-*` como manchete principal.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/core/runner.ts`, `src/core/target-investigate-case.test.ts`, `src/core/runner.test.ts`
- Milestone 3 - Surfaces operator-facing remediation-first
  - Entregavel:
    Telegram e resumo textual final mostram primeiro a remediacao principal e so depois o estado de publication automatica.
  - Evidencia de conclusao:
    testes do bot e do renderer cobrem a frase equivalente a "ha remediacao acionavel; publication automatica segue bloqueada".
  - Arquivos esperados:
    `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/core/target-investigate-case.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar os schemas/tipos do flow em `src/types/target-investigate-case.ts` para aceitar `remediation-proposal` no manifesto e adicionar o eixo investigativo/remediation-first ao summary/trace.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/target-investigate-case.ts` para descobrir o artefato opcional de remediacao, popular os novos campos e renderizar o resumo remediation-first.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.ts` para usar detalhes remediation-first em vez de publication-first.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts` para mostrar primeiro o resultado investigativo/remediacao e so depois publication.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar os testes focados do flow em `src/core/target-investigate-case.test.ts`, `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` e `npm test`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Fechar o ticket movendo-o para `tickets/closed/` e registrar o estado final neste plano.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito:
    RF-08 / CA-04 - summary final e Telegram mostram primeiro a remediacao principal e o desfecho investigativo.
  - Evidencia observavel:
    os testes do renderer e do Telegram exibem linguagem remediation-first antes de `publication_status`.
  - Requisito:
    RF-09 - o caso com remediacao pronta e publication bloqueada nao aparece mais para o operador como inconclusao generica.
  - Evidencia observavel:
    testes focados do core/Telegram comprovam a frase equivalente a "ha remediacao acionavel; publication automatica segue bloqueada".
  - Requisito:
    compatibilidade cross-repo do manifesto target-owned.
  - Evidencia observavel:
    o runner aceita `phaseOutputs["remediation-proposal"]` e continua aceitando manifests antigos sem esse membro.
- Comando:
  `npm run check`
  - Esperado:
    `exit 0` com tipos atualizados e fixtures coerentes.
  - Resultado:
    executado em 2026-04-08 03:44Z com `exit 0`.
- Comando:
  `npm test`
  - Esperado:
    `exit 0` com suites do flow e do Telegram verdes.
  - Resultado:
    executado em 2026-04-08 03:51Z com `exit 0` e 612 testes passando.

## Idempotence and Recovery
- Idempotencia:
  as mudancas sao aditivas ao contrato do runner; rounds antigos sem `remediation-proposal.json` continuam validos e devem renderizar sem regressao.
- Riscos:
  drift entre `finalSummary`, `tracePayload` e fixtures extensas do runner;
  manifest target-owned mais rico quebrando parse estrito do runner.
- Recovery / Rollback:
  se a separacao de eixos gerar ruido excessivo, manter `overall_outcome` intacto e reduzir a mudanca a surfaces operator-facing; se a compatibilidade de manifesto quebrar fixtures antigas, tornar novos membros opcionais e revalidar.

## Artifacts and Notes
- Ticket alvo:
  `tickets/closed/2026-04-08-target-investigate-case-remediation-first-summary-and-publication-semantics-gap.md`
- Spec cross-repo:
  `/home/mapita/projetos/guiadomus-matricula/docs/specs/2026-04-08-case-investigation-remediation-first-outcome-and-publication-separation.md`
- Ticket/ExecPlan irmao ja concluido no target:
  `/home/mapita/projetos/guiadomus-matricula/tickets/closed/2026-04-08-case-investigation-publication-cannot-eclipse-primary-remediation-gap.md`
  `/home/mapita/projetos/guiadomus-matricula/execplans/2026-04-08-case-investigation-publication-cannot-eclipse-primary-remediation-gap.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  contrato interno de manifesto normalizado do flow `target-investigate-case`;
  `TargetInvestigateCaseFinalSummary`;
  `TargetInvestigateCaseTracePayload`;
  surfaces operator-facing do runner e do Telegram.
- Compatibilidade:
  rounds antigos continuam aceitos; `remediation-proposal.json` e opcional.
- Dependencias externas e mocks:
  nenhuma dependencia nova; usar apenas fixtures/tests existentes do runner.
