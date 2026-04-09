# target-investigate-case-v2 v1 hard removal

## Purpose / Big Picture
- Objetivo: remover a v1 de `target-investigate-case` do runtime, dos prompts ativos, das superfícies operator-facing e da documentação operacional, deixando apenas o contrato diagnosis-first da v2 como fluxo vivo.
- Resultado esperado: o runner aceita somente `/target_investigate_case_v2`, carrega apenas o manifesto v2, executa somente `preflight -> resolve-case -> assemble-evidence -> diagnosis`, mantém `ticket-projection`/`publication` como continuações opcionais e não expõe mais `assessment.json`, `dossier.*`, `semantic-review`, `causal-debug` ou `root-cause-review` como caminho ativo.
- Escopo: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts`, `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/types/target-flow.ts`, `src/types/state.ts`, testes e documentação/prompt relacionados.
- Fora de escopo: migrar rounds históricos antigos; reescrever tickets/execplans históricos fechados; alterar projeto alvo externo.

## Progress
- [x] 2026-04-09 21:25Z - Leitura de `AGENTS.md`, `DOCUMENTATION.md`, `SPECS.md`, `PLANS.md` e da spec v2 concluída.
- [x] 2026-04-09 21:34Z - Varredura repo-wide dos resíduos v1 concluída.
- [ ] 2026-04-09 21:35Z - Refatoração do runtime e dos tipos para v2-only.
- [ ] 2026-04-09 21:35Z - Limpeza de prompts/docs/superfícies operator-facing.
- [ ] 2026-04-09 21:35Z - Atualização e execução dos testes focados.

## Surprises & Discoveries
- 2026-04-09 21:34Z - A v1 ainda governa não só os tipos e o core, mas também `runner`, `target-flow`, `state`, `workflow-trace-store`, `Telegram` e o `ticket-publisher`; a limpeza coerente exige tocar além do escopo mínimo listado.
- 2026-04-09 21:34Z - O repositório ainda versiona um manifesto legado em `docs/workflows/target-case-investigation-manifest.json`, o que mantém a v1 semanticamente “oficial” para futuras IAs mesmo com a spec v2 atendida.

## Decision Log
- 2026-04-09 - Decisão: tratar `target-investigate-case-v2` como único comando/flow vivo do runner.
  - Motivo: manter dois comandos/flows reintroduz o fallback mental que a tarefa quer eliminar.
  - Impacto: `runner`, `target-flow`, `state`, `Telegram` e testes passam a expor apenas `/target_investigate_case_v2`.
- 2026-04-09 - Decisão: remover prompts e manifestos legados do caminho ativo em vez de manter adaptadores silenciosos.
  - Motivo: a existência desses artefatos como documentação operacional ativa continua ensinando a v1.
  - Impacto: `prompts/16`, `prompts/17` e `docs/workflows/target-case-investigation-manifest.json` serão removidos ou desativados do runtime.

## Outcomes & Retrospective
- Status final: em execução.
- O que funcionou: a spec v2 já descreve claramente o end state e os pontos mínimos de contrato.
- O que ficou pendente: aplicar a limpeza e validar a suíte focada.
- Próximos passos: consolidar tipos/estado v2-only, limpar integrações e finalizar testes/docs.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/types/target-flow.ts`
  - `src/types/state.ts`
- Spec de origem: `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-05, RF-09, RF-11, RF-21, RF-25, RF-27.
- Assumptions / defaults adotados:
  - O único comando suportado daqui para frente será `/target_investigate_case_v2`.
  - `ticket-projection` e `publication` continuam opcionais, mas fora do caminho mínimo.
  - Histórico documental fechado pode permanecer como histórico, desde que não siga ensinando a v1 como fluxo ativo.
- Fluxo atual:
  - O runtime ainda bifurca entre v1 e v2 em múltiplas camadas.
- Restrições técnicas:
  - Não criar camada nova de compatibilidade.
  - Manter publicação runner-side tardia.
  - Preservar `lineage` quando ainda relevante para artefatos da v2.

## Plan of Work
- Milestone 1:
  - Entregável: tipos, estado e runner aceitando apenas o fluxo v2.
  - Evidência de conclusão: não há mais escolha de comando/manifesto/flow entre v1 e v2.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/types/target-flow.ts`, `src/types/state.ts`, `src/core/runner.ts`, `src/core/target-investigate-case.ts`.
- Milestone 2:
  - Entregável: preparer e Codex client sem round materialization v1 nem subetapas legadas.
  - Evidência de conclusão: `semantic-review`, `causal-debug` e `root-cause-review` deixam de ser parte do caminho ativo.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts`, prompts legados.
- Milestone 3:
  - Entregável: Telegram, docs e testes ensinando somente a v2.
  - Evidência de conclusão: comandos, mensagens, prompts e suíte focada referenciam apenas `/target_investigate_case_v2`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, testes focados, docs/workflows e spec viva.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/types/target-investigate-case.ts` para eliminar manifesto/command/runtime legados e consolidar o contrato v2.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/core/target-investigate-case.ts`, `src/types/target-flow.ts`, `src/types/state.ts` e `src/core/runner.ts` para um único fluxo vivo.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts` e `src/integrations/telegram-bot.ts`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Limpar prompts/docs ativos e remover manifesto legado do runner.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar testes focados e rodar `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: existir um único fluxo vivo de investigação de caso.
  - Evidência observável: `rg -n "target-investigate-case\"|target_investigate_case(?!_v2)" src docs/workflows prompts` não retorna caminhos ativos do runtime/docs.
  - Requisito: caminho mínimo diagnosis-first preservado.
  - Evidência observável: testes focados cobrem `preflight -> resolve-case -> assemble-evidence -> diagnosis` e passam.
  - Requisito: publication runner-side continua tardia e opcional.
  - Evidência observável: `src/core/target-investigate-case.test.ts` cobre publicação apenas com `ticket-proposal.json`.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: suíte focada verde.
- Comando: `npm run check`
  - Esperado: tipagem verde após a remoção da v1.

## Idempotence and Recovery
- Idempotência: a limpeza é textual/estrutural; reexecutar os testes e o `rg` repo-wide deve produzir o mesmo estado v2-only.
- Riscos: referências cruzadas em `runner`, `state` e testes podem quebrar a compilação se algum alias legado sobrar.
- Recovery / Rollback: se algum corte amplo quebrar contratos não mapeados, restaurar apenas o menor trecho necessário via patch e documentar o motivo residual.

## Artifacts and Notes
- Diff/patch: nesta árvore local.
- Logs relevantes: execução da suíte focada e `npm run check`.
- Evidências de teste: serão registradas ao final da execução.

## Interfaces and Dependencies
- Interfaces alteradas:
  - comando canônico do fluxo;
  - contrato do manifesto;
  - shape de artefatos e status operator-facing;
  - estados/milestones do runner para `target-investigate-case`.
- Compatibilidade:
  - incompatível com manifesto e comando v1 por design.
- Dependências externas e mocks:
  - Codex CLI, Git e Telegram continuam mockados nos testes.
