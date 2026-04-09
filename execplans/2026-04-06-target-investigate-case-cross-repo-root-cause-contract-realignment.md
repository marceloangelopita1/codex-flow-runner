# ExecPlan - realinhar runner e target no contrato de root-cause-review do `/target_investigate_case`

## Purpose / Big Picture
- Objetivo:
  realinhar `codex-flow-runner` e `guiadomus-matricula` no contrato compartilhado de `root-cause-review`, eliminando o drift que hoje faz o runner rejeitar `assessment.json` e interromper `/target_investigate_case` antes da publication.
- Resultado esperado:
  o projeto alvo volta a materializar `assessment.json` e `root-cause-review.result.json` em um shape compatível com o runner; o runner aceita o contrato canônico e, durante a migração, consegue diagnosticar claramente qualquer payload legado restante sem falso sucesso; uma rodada real via Telegram para `8555540138269 --workflow extract_address` deixa de falhar por `artifact-validation-failed`.
- Escopo:
  alinhar contrato, prompt, validadores, recomposição, testes e documentação viva nos dois repositórios;
  definir um shape canônico compartilhado para `assessment.root_cause_review` e `root-cause-review.result.json`;
  introduzir, se necessário, bridge temporária runner-side para legado durante a janela de migração;
  executar validação automatizada nos dois repositórios e uma rodada controlada ponta a ponta.
- Fora de escopo:
  corrigir o bug funcional do workflow `extract_address`;
  reabrir descoberta livre de evidência em `semantic-review`;
  alterar a autoridade final runner-side de publication;
  mexer em artefatos históricos fora do necessário para testes/fixtures/documentação.

## Progress
- [x] 2026-04-06 22:35Z - Planejamento inicial concluído após diagnóstico da falha real em produção no Telegram e releitura dos schemas, prompts, manifesto, runbook, specs e execplans correlatos dos dois repositórios.
- [ ] 2026-04-06 22:35Z - Contrato canônico cross-repo congelado e documentado.
- [ ] 2026-04-06 22:35Z - Projeto alvo migrado para emitir o shape canônico e recompor `assessment.json` sem drift.
- [ ] 2026-04-06 22:35Z - Runner ajustado para consumir o shape canônico e, se necessário, suportar bridge temporária de rollout.
- [ ] 2026-04-06 22:35Z - Validação automatizada e rodada controlada ponta a ponta concluídas.

## Surprises & Discoveries
- 2026-04-06 22:00Z - A falha reportada no Telegram não está no parser do comando nem no bot; o comando foi aceito, o entrypoint oficial do target rodou e a quebra ocorreu na validação runner-side de `assessment.json`.
- 2026-04-06 22:00Z - O runner já exige `assessment.root_cause_review.root_cause_status`, `ticket_readiness_status` e `remaining_gaps`, com schema estrito em `src/types/target-investigate-case.ts`, mas o target ainda recompõe `assessment.root_cause_review` no formato legado com `result_verdict`, `ticket_readiness`, `stage_findings`, `qa_escape_analysis` e `next_experiments`.
- 2026-04-06 22:00Z - O prompt e o validador locais de `root-cause-review` no target continuam ancorados em `verdict`, `winning_hypothesis`, `qa_escape_analysis` e `falsification_review`, enquanto o runner já espera `root_cause_status`, `qa_escape` e `remaining_gaps` em `root-cause-review.result.json`.
- 2026-04-06 22:00Z - As specs e execplans de ambos os repositórios registram a frente como atendida/concluída, mas o estado real do código ainda não passa numa rodada ponta a ponta; o alinhamento documental precisa ser tratado como parte do trabalho.
- 2026-04-06 22:00Z - A fila `tickets/open/` do runner está vazia no estado atual do workspace, apesar de histórico e specs ainda referenciarem tickets antes abertos; o plano precisa ser autocontido e não depender desses arquivos como fonte viva.

## Decision Log
- 2026-04-06 - Decisão: tratar o shape atualmente exigido pelo runner como contrato canônico de interoperabilidade e migrar o target para esse shape.
  - Motivo:
    é o contrato que já está sendo validado em runtime na execução real e o que hoje barra a rodada.
  - Impacto:
    o target deve atualizar prompt, validator local, recomposição de `assessment.json`, runbook e testes para refletir `root_cause_status`, `ticket_readiness_status`, `qa_escape` e `remaining_gaps`.
- 2026-04-06 - Decisão: permitir uma bridge temporária runner-side para o resultado legado apenas durante a migração, desde que ela seja explícita, coberta por testes e removível.
  - Motivo:
    reduz downtime entre os dois repositórios e evita que uma ordem rígida de merge deixe o Telegram quebrado por mais tempo.
  - Impacto:
    o runner pode aceitar, de forma transitória, `verdict -> root_cause_status`, `ticket_readiness.status -> ticket_readiness_status` e `qa_escape_analysis -> qa_escape`, mas deve continuar publicando warnings claros e não pode eternizar o legado silenciosamente.
- 2026-04-06 - Decisão: separar no plano o contrato compartilhado mínimo do enriquecimento narrativo target-owned.
  - Motivo:
    o runner não precisa consumir todos os detalhes narrativos de `winning_hypothesis`, `falsification_review` e `stage_findings`, mas o target pode continuar precisando deles para dossier e ticket.
  - Impacto:
    o Milestone 1 deve decidir, por campo, o que fica no contrato compartilhado e o que permanece opcional e explicitamente permitido apenas se ambos os lados tiparem essas chaves.
- 2026-04-06 - Decisão: incluir correção documental como entregável explícito, e não como consequência implícita do código.
  - Motivo:
    hoje há divergência entre “spec atendida” e comportamento real em produção.
  - Impacto:
    o fechamento do trabalho exige atualizar specs/execplans/runbooks/notas de rollout para refletir o estado verdadeiro após a rodada controlada.

## Outcomes & Retrospective
- Status final:
  pendente de execução.
- O que funcionou até aqui:
  o diagnóstico isolou uma causa concreta e reproduzível, com caminhos exatos nos dois repositórios.
- O que ficou pendente:
  congelar o contrato final, implementar as mudanças, validar o rollout e reconciliar a documentação.
- Próximos passos:
  executar o Milestone 1 deste plano e decidir formalmente o shape canônico/bridge antes do primeiro patch funcional.

## Context and Orientation
- Repositório principal deste plano:
  `/home/mapita/projetos/codex-flow-runner`
- Repositório alvo impactado:
  `/home/mapita/projetos/guiadomus-matricula`
- Caso âncora e evidência operacional:
  comando `/target_investigate_case guiadomus-matricula 8555540138269 --workflow extract_address`;
  rodada materializada em `../guiadomus-matricula/investigations/2026-04-06T21-57-45Z/`;
  trace em `../guiadomus-matricula/.codex-flow-runner/flow-traces/target-flows/20260406t220013z-target_investigate_case-target-investigate-case-guiadomus-matricula.json`.
- Arquivos principais no runner:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/target-investigate-case-root-cause-review.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.test.ts`
- Arquivos principais no target:
  - `docs/workflows/target-case-investigation-manifest.json`
  - `docs/workflows/target-case-investigation-root-cause-review.md`
  - `docs/workflows/target-case-investigation-runbook.md`
  - `utils/case-investigation/root-cause-review.js`
  - `utils/case-investigation/semantic-artifacts.js`
  - `utils/case-investigation/materializer.js`
  - `tests/utils/case-investigation-semantic-artifacts.test.js`
  - `tests/scripts/materialize-case-investigation-round.test.js`
  - `tests/scripts/target-case-investigation-capability.test.js`
- Specs de origem:
  - runner: `docs/history/target-investigate-case/2026-04-06-pre-v2-publication-hardening.md`
  - target: `../guiadomus-matricula/docs/specs/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening.md`
- RFs/CAs cobertos por este plano:
  - runner: RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08; CA-02, CA-03, CA-04, CA-05.
  - target: RF-01, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09; CA-01, CA-02, CA-03, CA-04, CA-05.
- Assumptions / defaults adotados:
  - `publication-decision.json` continua exclusivamente runner-side;
  - `assessment.json` e a semântica causal continuam target-owned;
  - o shape compartilhado mínimo deve ser o menor necessário para o runner validar gates e para o target recompor `assessment.json` e `ticket-proposal.json`;
  - qualquer bridge de compatibilidade será temporária, explícita em código e coberta por testes;
  - a rodada controlada final será rerodada com o mesmo caso âncora antes de considerar a frente concluída.
- Fluxo atual observado:
  - o target materializa `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `dossier.md`, `semantic-review.request.json`, `causal-debug.request.json` e `root-cause-review.request.json`;
  - o runner valida `assessment.json` logo após a materialização inicial;
  - a validação falha antes de `root-cause-review.result.json` existir porque `assessment.root_cause_review` não está no shape exigido pelo runner.
- Restrições técnicas:
  - evitar quebrar manifests/artefatos legados além do estritamente necessário;
  - manter o fluxo sequencial e manifesto-first;
  - não abrir descoberta externa de evidência;
  - preservar tipagem e mensagens de erro diagnósticas nos dois lados.

## Plan of Work
- Milestone 1: congelar o contrato compartilhado e a política de rollout.
  - Entregável:
    matriz explícita campo-a-campo para `root-cause-review.result.json` e `assessment.root_cause_review`, definindo o que é canônico, o que é extensão opcional e o que é legado transitório.
  - Evidência de conclusão:
    manifesto, prompt, schemas/tipos e testes de ambos os repositórios apontam para o mesmo shape compartilhado; a bridge temporária, se mantida, fica registrada no `Decision Log` e em testes.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `docs/workflows/target-case-investigation-manifest.json`, `docs/workflows/target-case-investigation-root-cause-review.md`, runbooks/specs/execplans afetados.
- Milestone 2: migrar o target para emitir o shape canônico sem perder riqueza diagnóstica.
  - Entregável:
    `root-cause-review.result.json` passa a sair no shape acordado; `semantic-artifacts.js` recompõe `assessment.root_cause_review` no shape canônico; dossier/ticket continuam recebendo a narrativa adicional necessária.
  - Evidência de conclusão:
    testes do target passam com o contrato novo; fixtures e materializer produzem `assessment.json` e `root-cause-review.result.json` compatíveis.
  - Arquivos esperados:
    `utils/case-investigation/root-cause-review.js`, `utils/case-investigation/semantic-artifacts.js`, `utils/case-investigation/materializer.js`, docs e testes do target.
- Milestone 3: ajustar o runner para o shape canônico e manter bridge temporária segura, se necessária.
  - Entregável:
    parser, schemas, `round-preparer`, avaliação e publication do runner aceitam o contrato final e rejeitam de forma explícita o que estiver fora da política acordada.
  - Evidência de conclusão:
    testes runner-side cobrem shape canônico, bridge transitória e remoção de ambiguidades na validação de `assessment.json`.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, parser/integrações e testes.
- Milestone 4: validar ponta a ponta e reconciliar documentação viva.
  - Entregável:
    suites dos dois repositórios verdes, rodada real do caso âncora sem `artifact-validation-failed` e documentação atualizada para refletir o estado real do rollout.
  - Evidência de conclusão:
    comandos de teste com `exit 0`, rodada controlada concluída e specs/execplans/runbooks sem declarar “done” acima do que o runtime comprova.
  - Arquivos esperados:
    specs e execplans correlatos nos dois repositórios, além de traces/artefatos da rodada controlada.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-root-cause-review.ts` e os testes correlatos para mapear o shape exato hoje exigido pelo runner.
2. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Reabrir `docs/workflows/target-case-investigation-root-cause-review.md`, `utils/case-investigation/root-cause-review.js`, `utils/case-investigation/semantic-artifacts.js`, `utils/case-investigation/materializer.js` e os testes locais para mapear o shape efetivamente emitido pelo target.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/types/target-investigate-case.ts` para explicitar no próprio código o contrato compartilhado final, incluindo comentários/nomes consistentes para bridge transitória quando existir.
4. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Atualizar `docs/workflows/target-case-investigation-root-cause-review.md`, `utils/case-investigation/root-cause-review.js` e `utils/case-investigation/semantic-artifacts.js` para emitir:
   `root_cause_status` em vez de `verdict`;
   `ticket_readiness_status` e `remaining_gaps` no bloco de `assessment.root_cause_review`;
   `qa_escape` no shape acordado;
   campos narrativos adicionais apenas quando explicitamente permitidos pelo contrato compartilhado.
5. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Ajustar `docs/workflows/target-case-investigation-manifest.json`, `docs/workflows/target-case-investigation-runbook.md` e os testes/documentação do target para refletir o contrato realmente emitido.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/target-investigate-case-root-cause-review.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/core/target-investigate-case.ts` e `src/integrations/target-investigate-case-ticket-publisher.ts` para consumir o contrato final e, se necessário, manter bridge transitória com warning/testes explícitos.
7. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js tests/utils/case-investigation-semantic-artifacts.test.js tests/scripts/materialize-case-investigation-round.test.js` para validar o alvo.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts` para validar o runner.
9. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run case-investigation -- --property-id 8555540138269 --workflow extract_address --round-request-id <novo-round-id> --replay-mode historical-only --force` para validar a recomposição local com o contrato final.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar a rodada controlada real de `/target_investigate_case guiadomus-matricula 8555540138269 --workflow extract_address` e comparar trace, `assessment.json`, `root-cause-review.result.json` e resumo final do Telegram.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar specs/execplans/documentação viva nos dois repositórios para corrigir qualquer divergência entre estado declarado e comportamento efetivamente validado.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito:
    `assessment.root_cause_review` compartilhado entre target e runner usa o mesmo shape mínimo canônico.
  - Evidência observável:
    `assessment.json` gerado pelo target contém `root_cause_status`, `ticket_readiness_status` e `remaining_gaps`, e o runner o lê sem `artifact-validation-failed`.
  - Requisito:
    `root-cause-review.result.json` deixa de divergir entre prompt, validator local e parser runner-side.
  - Evidência observável:
    o prompt do target, o validator local e o schema do runner apontam para o mesmo campo de veredito (`root_cause_status`) e para a mesma modelagem de `ticket_readiness`, `qa_escape` e `remaining_gaps`.
  - Requisito:
    a riqueza diagnóstica necessária para dossier/ticket continua disponível sem quebrar o contrato compartilhado.
  - Evidência observável:
    testes do target continuam cobrindo hipóteses concorrentes, análise por etapa, escape do QA e próximos experimentos, seja no contrato compartilhado ou em extensões explicitamente permitidas.
  - Requisito:
    qualquer bridge de legado no runner é explícita e temporária.
  - Evidência observável:
    existe teste cobrindo payload legado aceito por bridge, com anotação clara de transição; não há normalização silenciosa sem cobertura.
  - Requisito:
    a rodada âncora via Telegram deixa de falhar por incompatibilidade contratual.
  - Evidência observável:
    o trace final não contém `round-materialization-failed` por `root_cause_review` incompatível; o resumo final não mostra `artifact-validation-failed` para `root_cause_status`, `ticket_readiness_status` ou `remaining_gaps`.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js tests/utils/case-investigation-semantic-artifacts.test.js tests/scripts/materialize-case-investigation-round.test.js`
  - Esperado:
    `exit 0`.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts`
  - Esperado:
    `exit 0`.
- Comando: `rg -n '"root_cause_status"|"ticket_readiness_status"|"remaining_gaps"' /home/mapita/projetos/guiadomus-matricula/investigations/<novo-round-id>/assessment.json`
  - Esperado:
    presença dos três campos canônicos no artefato recomposto.
- Comando: `rg -n '"root_cause_status"|"ticket_readiness"|"qa_escape"|"remaining_gaps"' /home/mapita/projetos/guiadomus-matricula/investigations/<novo-round-id>/root-cause-review.result.json`
  - Esperado:
    presença do shape canônico acordado.
- Comando: `rg -n "round-materialization-failed|artifact-validation-failed|root_cause_review" /home/mapita/projetos/guiadomus-matricula/.codex-flow-runner/flow-traces/target-flows/<novo-trace>.json`
  - Esperado:
    ausência de falha por incompatibilidade contratual de `root_cause_review`.

## Idempotence and Recovery
- Idempotência:
  rerodar os testes e a rodada controlada com o mesmo contrato deve produzir o mesmo shape de artefatos e o mesmo gating;
  a bridge transitória, se existir, deve ser determinística e reversível.
- Riscos:
  escolher como canônico um shape que preserve pouco demais para o target;
  preservar extensão demais no contrato compartilhado e voltar a criar drift;
  mascarar o problema com bridge runner-side e nunca completar a migração do target;
  manter specs/documentação em estado “done” sem uma rodada real validada.
- Recovery / Rollback:
  se o target ainda não puder migrar tudo de uma vez, manter bridge runner-side apenas para a janela de rollout e registrar prazo/condição de remoção;
  se a bridge gerar ambiguidade, preferir falha explícita com mensagem diagnóstica a normalização silenciosa;
  se a rodada real continuar falhando, congelar o rollout documental e registrar follow-up específico com o novo artefato/trace antes de tentar novo patch.

## Artifacts and Notes
- Evidência operacional principal:
  - `../guiadomus-matricula/investigations/2026-04-06T21-57-45Z/assessment.json`
  - `../guiadomus-matricula/investigations/2026-04-06T21-57-45Z/root-cause-review.request.json`
  - `../guiadomus-matricula/.codex-flow-runner/flow-traces/target-flows/20260406t220013z-target_investigate_case-target-investigate-case-guiadomus-matricula.json`
- Execplans e specs históricos relevantes:
  - `execplans/2026-04-05-target-investigate-case-target-contract-alignment.md`
  - `execplans/2026-04-06-target-investigate-case-root-cause-review-and-ticket-readiness-hardening-gap.md`
  - `execplans/2026-04-06-target-investigate-case-ticket-quality-hardening-gap.md`
  - `../guiadomus-matricula/execplans/2026-04-06-case-investigation-root-cause-review-and-ticket-readiness-hardening-gap.md`
  - `../guiadomus-matricula/execplans/2026-04-06-case-investigation-ticket-quality-hardening.md`
- Nota operacional:
  o plano parte do princípio de que os artefatos e a documentação atuais estão em drift; por isso, validação de aceite depende de comportamento observado e não apenas de status documental.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato compartilhado de `root-cause-review.result.json`;
  - contrato compartilhado de `assessment.root_cause_review`;
  - manifesto e runbook da capability no target;
  - parser e validação runner-side da etapa `root-cause-review`;
  - testes/documentação viva ligados ao fluxo `/target_investigate_case`.
- Compatibilidade:
  - rollout manifesto-first deve ser preservado;
  - manifests/artefatos legados podem ter bridge temporária, mas não devem continuar como fonte de verdade indefinidamente;
  - `publication-decision.json` continua runner-side e `assessment.json` continua target-owned.
- Dependências externas e mocks:
  - suites locais dos dois repositórios;
  - rodada real controlada via Telegram para confirmar o comportamento de produção;
  - nenhum serviço externo novo além do que o fluxo já usa hoje.
