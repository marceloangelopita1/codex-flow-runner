# Target Investigate Case Round Materialization Entrypoint Copy Bridge

## Purpose / Big Picture
- Objetivo: corrigir o drift runner-side do `/target_investigate_case` para que a etapa de materializacao da rodada consuma o entrypoint oficial do projeto alvo e espelhe os artefatos resultantes sem reescrever sua semantica.
- Resultado esperado: o runner deixa de falhar quando o pacote canonico do alvo e valido, mesmo que a rodada seja inconclusiva ou `do_not_publish`; o caso real `guiadomus-matricula` em `2026-04-05T19-10-29Z` deve sair de `failure` por enum invalido para o desfecho mecanico coerente com o `assessment.json` bruto do alvo.
- Escopo: prompt runner-side de materializacao, interface do `roundPreparer`, estrategia de resolucao/copias dos artefatos canonicamente emitidos pelo alvo, validacoes automatizadas e probes focados no caso real.
- Fora de escopo:
  - reabrir a semantica do `assessment.json` do alvo;
  - alterar o schema semantico base de `case-investigation` sem necessidade;
  - corrigir bugs antigos ja separados do alvo, como o tuple invalido do round `2026-04-05T16-55-51Z`;
  - mudar a ownership de `publication-decision.json`, que continua runner-side.

## Progress
- [x] 2026-04-05 19:35Z - Planejamento inicial concluido com releitura de `AGENTS.md`, `PLANS.md`, do contrato `/target_investigate_case`, do prompt de materializacao e dos traces reais em `guiadomus-matricula`.
- [x] 2026-04-05 20:18Z - Implementacao do patch runner-side concluida.
- [x] 2026-04-05 20:31Z - Validacao focada concluida com testes direcionados, `tsc --noEmit` e probe do caso real.

## Surprises & Discoveries
- 2026-04-05 19:18Z - O dossier bruto do alvo em `output/case-investigation/2026-04-05T19-10-29Z/` e aceito pelo `evaluateTargetInvestigateCaseRound(...)`; a falha nasce apenas na versao materializada em `investigations/2026-04-05T19-10-29Z/`.
- 2026-04-05 19:19Z - O trace `20260405t191603z-target_investigate_case-target-investigate-case-guiadomus-matricula.json` mostra que o runner falhou ainda antes de completar milestones adicionais porque o `roundPreparer` validou um `evidence-bundle.json` com enum inventado (`runtime-surface-unavailable`) fora do contrato.
- 2026-04-05 19:22Z - O prompt atual manda o agente materializar diretamente em `investigations/<round-id>/`, enquanto o runbook do alvo declara `npm run case-investigation --` e `output/case-investigation/<request-id>/` como superficie oficial; essa duplicidade de ownership e o ponto de drift mais economico para corrigir.
- 2026-04-05 20:07Z - `dossier.json` e um caso especial: o campo `local_path` e auto-referencial e precisa refletir o caminho espelhado em `investigations/`, entao a copia runner-side precisa ajustar so esse ponteiro estrutural para continuar valida sem reinterpretar o restante do artefato.

## Decision Log
- 2026-04-05 - Decisao: tratar a causa-raiz como bug de materializacao runner-side, e nao como falha do `assessment` do alvo.
  - Motivo: o runner aceita o pacote bruto do alvo para o caso `2026-04-05T19-10-29Z`, mas rejeita a copia enriquecida escrita em `investigations/`.
  - Impacto: a correcao principal ficara em `codex-flow-runner`, com foco no `roundPreparer`, no prompt e nos testes de compatibilidade.
- 2026-04-05 - Decisao: preferir executar o entrypoint oficial do alvo e copiar/espelhar os artefatos canonicos resultantes, em vez de pedir ao Codex que "re-materialize" semantica final diretamente em `investigations/`.
  - Motivo: isso preserva a autoridade semantica do alvo e reduz a superficie em que a IA pode introduzir drift de schema.
  - Impacto: o prompt e a interface runner-side precisam orientar explicitamente a rodada para gerar `output/case-investigation/<request-id>/` e depois espelhar em `investigations/<round-id>/`.
- 2026-04-05 - Decisao: manter a informacao de indisponibilidade de runtime fora de `normative_conflicts.kind` se ela nao pertencer ao enum atual do contrato.
  - Motivo: ampliar enums cross-repo sem necessidade aumentaria o risco e o escopo; o bug atual e "onde serializar", nao "falta de enum".
  - Impacto: o runner deve aceitar e/ou registrar o bloqueio em trace/log/detalhes sem mutar `evidence-bundle.json` para fora da allowlist.
- 2026-04-05 - Decisao: permitir uma unica mutacao estrutural no espelhamento de `dossier.json`, regravando somente `local_path` para o destino espelhado em `investigations/`.
  - Motivo: esse campo e intrinsecamente dependente do namespace onde o artefato foi colocado e o validador do runner exige coerencia com o caminho efetivo.
  - Impacto: os artefatos semanticos continuam vindo do alvo; o runner apenas relocaliza com seguranca o ponteiro auto-referencial do dossier JSON quando esse formato existir.

## Outcomes & Retrospective
- Status final: concluido.
- O que funcionou: a correção principal ficou pequena e localizada no `roundPreparer`; o prompt agora orienta o caminho certo, mas a blindagem decisiva veio do espelhamento deterministico runner-side antes da validacao.
- O que ficou pendente: acompanhar o proximo round real end-to-end para confirmar que o materializador assistido nao continua escrevendo ruído em `investigations/` antes do espelhamento.
- Proximos passos: abrir PR do `codex-flow-runner`, rerodar `/target_investigate_case` no `guiadomus-matricula` e confirmar que o status final sai de `failure` para o desfecho mecanico esperado (`not_eligible` / `real-gap-not-generalizable`).

## Context and Orientation
- Arquivos principais:
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `prompts/16-target-investigate-case-round-materialization.md`
  - `src/core/target-investigate-case.ts`
- Spec de origem: `docs/history/target-investigate-case/2026-04-03-pre-v2-foundation.md`
- RFs/CAs cobertos por este plano:
  - RF-04, RF-05, RF-12, RF-18, RF-19, RF-22, RF-23, RF-40, RF-41.
- Assumptions / defaults adotados:
  - o projeto alvo continua sendo a autoridade semantica de `case-resolution.json`, `evidence-bundle.json`, `assessment.json` e `dossier.md`;
  - o runner pode espelhar artefatos para `investigations/<round-id>/`, mas nao deve reinterpretar sua semantica;
  - o comando oficial do alvo continua sendo a fonte canonica de materializacao da rodada;
  - informacoes auxiliares do runner podem aparecer no trace runner-side sem contaminar enums do contrato do alvo.
- Fluxo atual:
  - o runner injeta um prompt que manda o Codex materializar diretamente em `investigations/<round-id>/`;
  - depois o `roundPreparer` valida os artefatos ali escritos e segue para `evaluateTargetInvestigateCaseRound(...)`;
  - se o agente escrever schema driftado, a rodada falha antes do fechamento mecanico.
- Restrições técnicas:
  - sem mudar a fronteira de ownership de `publication-decision.json`;
  - sem introduzir descoberta livre de evidencia;
  - manter compatibilidade com dossiers/artefatos ricos aceitos atualmente nos testes.

## Plan of Work
- Milestone 1: alinhar o contrato runner-side de materializacao com o entrypoint oficial do alvo.
  - Entregavel: prompt/interface deixam explicito que a IA deve executar o comando oficial do alvo e espelhar os artefatos canonicos resultantes, sem reescrita semantica livre.
  - Evidencia de conclusao: o prompt renderizado e/ou a interface do request passa a carregar instrucoes/fatos suficientes para esse caminho e os testes refletem a nova estrategia.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `prompts/16-target-investigate-case-round-materialization.md`, `src/integrations/codex-client.test.ts`.
- Milestone 2: endurecer o `roundPreparer` para tratar o espelhamento como ponte deterministica.
  - Entregavel: o `roundPreparer` valida o resultado canonico e reduz a chance de drift runner-side entre `output/...` e `investigations/...`.
  - Evidencia de conclusao: regressao focada prova que o pacote bruto valido do alvo pode ser consumido sem falha, e que o runner nao aceita mutacao inventada em `investigations/...`.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`.
- Milestone 3: validar a regressao no caso real observado.
  - Entregavel: probe automatizado e/ou teste focado prova que o caso `2026-04-05T19-10-29Z` converge para desfecho mecanico coerente.
  - Evidencia de conclusao: `evaluateTargetInvestigateCaseRound(...)` sobre o pacote canonico e a trilha focada do runner deixam de gerar a falha por enum invalido.
  - Arquivos esperados: suites de teste runner-side e notas em `Outcomes & Retrospective`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts`, `prompts/16-target-investigate-case-round-materialization.md`, `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/integrations/codex-client.test.ts` imediatamente antes dos patches.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar a interface/prompt da materializacao para explicitar o uso do entrypoint oficial do alvo e o espelhamento deterministico para `investigations/<round-id>/`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar o `roundPreparer` para validar o fluxo alinhado e minimizar drift runner-side.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar os testes unitarios do `roundPreparer` e do `codex-client` para cobrir a nova estrategia.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar as suites focadas do runner.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar um probe curto contra o caso real em `../guiadomus-matricula/output/case-investigation/2026-04-05T19-10-29Z/` para registrar o comportamento esperado.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito: a materializacao runner-side deve respeitar o entrypoint oficial do alvo como fonte canonica.
  - Evidencia observavel: o prompt/request da rodada explicita `npm run case-investigation --` e o espelhamento para `investigations/<round-id>/`, sem orientar reescrita semantica direta dos artefatos finais.
  - Requisito: o runner nao deve falhar quando o pacote canonico bruto do alvo ja estiver valido.
  - Evidencia observavel: regressao focada prova que o caso `2026-04-05T19-10-29Z` produz `publication_status=not_eligible` e `overall_outcome=real-gap-not-generalizable`, sem erro de enum.
  - Requisito: o runner nao deve inventar enums fora do contrato em `normative_conflicts.kind`.
  - Evidencia observavel: testes do `roundPreparer` cobrem o caminho de espelhamento sem mutacao e nao serializam `runtime-surface-unavailable` nesse campo.
  - Requisito: a separacao de ownership entre alvo e runner permanece preservada.
  - Evidencia observavel: `publication-decision.json` segue runner-side, enquanto os artefatos semanticos continuam vindo do alvo.
- Comando: `npm test -- src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/core/target-investigate-case.test.ts`
  - Esperado: `exit 0`, incluindo cobertura da estrategia de materializacao/espelhamento e da compatibilidade com os artefatos canônicos.
  - Resultado observado: `exit 0` em 579 testes; regressao nova `CodexCliTargetInvestigateCaseRoundPreparer espelha o dossier autoritativo antes da validacao e neutraliza drift runner-side` passou.
- Comando: `npx tsx --eval '<probe do evaluateTargetInvestigateCaseRound sobre ../guiadomus-matricula/output/case-investigation/2026-04-05T19-10-29Z>'`
  - Esperado: `publication_status=not_eligible` e `overall_outcome=real-gap-not-generalizable`, sem excecao.
  - Resultado observado: `{"publication_status":"not_eligible","overall_outcome":"real-gap-not-generalizable"}` com limpeza do artefato temporario `publication-decision.runner-probe.json`.
- Comando: `npm run check`
  - Esperado: `exit 0` com TypeScript consistente apos o patch.
  - Resultado observado: `exit 0`.

## Idempotence and Recovery
- Idempotência:
  - rerodar a rodada com o mesmo dossier bruto do alvo deve preservar o mesmo resultado mecanico no runner;
  - rerodar os testes focados nao deve depender de artefatos externos persistidos.
- Riscos:
  - endurecer demais o prompt e quebrar fixtures/testes atuais que ainda simulam escrita direta em `investigations/`;
  - deslocar acidentalmente a responsabilidade de espelhamento para o alvo;
  - criar caminho de copia que carregue artefatos sensiveis fora do contrato.
- Recovery / Rollback:
  - se a estrategia de entrypoint+espelho ficar incompleta, manter o caminho atual apenas com validacao adicional que rejeite drift sem mutar o pacote;
  - se algum teste de compatibilidade rica quebrar, reduzir a mudanca ao menor hardening que preserve o pacote canonico bruto como verdade.

## Artifacts and Notes
- Traces reais usados como evidencia:
  - `../guiadomus-matricula/.codex-flow-runner/flow-traces/target-flows/20260405t191603z-target_investigate_case-target-investigate-case-guiadomus-matricula.json`
  - `../guiadomus-matricula/.codex-flow-runner/flow-traces/target-flows/20260405t165907z-target_investigate_case-target-investigate-case-guiadomus-matricula.json`
- Dossiers reais usados como comparativo:
  - `../guiadomus-matricula/output/case-investigation/2026-04-05T19-10-29Z/`
  - `../guiadomus-matricula/investigations/2026-04-05T19-10-29Z/`
- Artefatos temporarios de probe nao devem ser mantidos no repositório.
- Patch principal entregue em:
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/codex-client.ts`
  - `prompts/16-target-investigate-case-round-materialization.md`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`

## Interfaces and Dependencies
- Interfaces alteradas:
  - request/prompt interno de `runTargetInvestigateCaseRoundMaterialization(...)`;
  - comportamento do `CodexCliTargetInvestigateCaseRoundPreparer`.
- Compatibilidade:
  - manter compatibilidade com o manifesto rico do piloto e com os contratos de `evaluateTargetInvestigateCaseRound(...)`;
  - preservar `publication-decision.json` runner-side e `semantic-review.result.json` como artefato runner-side auxiliar.
- Dependencias externas e mocks:
  - sem novos servicos externos;
  - testes continuam usando `StubCodexClient` e fixtures locais, sem CLI real, Telegram real ou alvo real executando.
