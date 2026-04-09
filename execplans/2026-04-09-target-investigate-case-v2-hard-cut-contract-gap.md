# ExecPlan - target-investigate-case-v2 hard cut do contrato diagnosis-first

## Purpose / Big Picture
- Objetivo:
  executar o passo 1 da correção arquitetural do `target-investigate-case-v2`, cortando no runner o contrato/schema que ainda mantém a herança da v1 como shape estrutural do fluxo.
- Resultado esperado:
  o schema v2 e o manifesto de referência passam a modelar explicitamente o mínimo diagnosis-first; `assessment.json`, `dossier.*` e `publication-decision.json` deixam de ser obrigatoriedade do contrato v2; continuações opcionais deixam de ser exigidas por default.
- Escopo:
  criar ticket e rastreabilidade desta reabertura;
  atualizar a spec para estado pendente;
  ajustar `src/types/target-investigate-case.ts`, o manifesto v2 de referência e os testes diretamente afetados pelo corte contratual;
  aplicar apenas os fallbacks mínimos necessários para o runtime atual continuar íntegro com o novo manifesto.
- Fora de escopo:
  reescrever agora a execução runner-side em `resolve-case -> assemble-evidence -> diagnosis`;
  remover nesta etapa todas as superfícies internas legadas ainda consumidas pelo runtime;
  fechar ticket, fazer commit ou executar compatibilização em target externo.

## Progress
- [x] 2026-04-09 17:55Z - Revisão das regras do repositório (`AGENTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `DOCUMENTATION.md`, `SPECS.md`) concluída.
- [x] 2026-04-09 17:55Z - Ticket registrado e agora encerrado em `tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`.
- [x] 2026-04-09 17:55Z - ExecPlan criado em `execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`.
- [x] 2026-04-09 18:05Z - Corte contratual aplicado em `src/types/target-investigate-case.ts`, no manifesto v2 de referência e na spec/documentação viva da linhagem.
- [x] 2026-04-09 18:06Z - Testes focados e `npm run check` executados com sucesso.

## Surprises & Discoveries
- 2026-04-09 17:55Z - O repositório não possui tickets abertos no momento, apesar de a revisão arquitetural ter confirmado gaps residuais relevantes no contrato v2.
- 2026-04-09 17:55Z - O passo 1 consegue avançar bastante no contrato/schema sem ainda reescrever a execução stage-by-stage, desde que o runtime receba fallbacks mínimos para manifestos v2 sem outputs legados.
- 2026-04-09 17:55Z - A spec estava marcada como `attended`/`done`; para manter rastreabilidade correta, o ciclo precisa reabri-la documentalmente assim que o novo ticket entra em `tickets/open/`.
- 2026-04-09 18:06Z - `npm test -- ...` continua expandindo para `tsx --test src/**/*.test.ts ...`; mesmo assim a suíte completa permaneceu verde depois do corte contratual, o que dá um sinal melhor de não regressão do que o mínimo inicialmente planejado.

## Decision Log
- 2026-04-09 - Decisão: tratar esta etapa como corte contratual runner-side e não como refactor completo do runtime.
  - Motivo:
    o usuário pediu explicitamente a execução do passo 1, e esse passo já é valioso se deixar o contrato v2 correto antes da reorquestração por estágio.
  - Impacto:
    o resultado desta etapa deve ser descrito como fundação do hard cut, não como correção integral da implementação.
- 2026-04-09 - Decisão: atualizar a spec no mesmo ciclo para `pending`.
  - Motivo:
    `SPECS.md` exige documento vivo e usa `tickets/open/` como fonte de verdade quando houver divergência.
  - Impacto:
    a spec volta a refletir o estado real do repositório até os próximos passos de runtime.
- 2026-04-09 - Decisão: manter apenas fallbacks internos pontuais para `assessment`/`dossier` enquanto o runtime ainda não foi reorquestrado.
  - Motivo:
    o objetivo desta etapa é corrigir o contrato v2 sem quebrar o repositório antes do próximo passo de runtime.
  - Impacto:
    o manifesto e o schema já ficam diagnosis-first, mas o próximo passo ainda precisa remover a dependência operacional restante dessas superfícies no executor/preparer.

## Outcomes & Retrospective
- Status final:
  concluído para o passo 1.
- O que funcionou:
  a revisão arquitetural anterior já deixou claro quais superfícies do contrato precisavam ser cortadas primeiro;
  o hard cut do schema/manifesto exigiu pouco código de sustentação fora dos tipos;
  a suíte focada e o `tsc` confirmaram que o repositório permaneceu íntegro após o corte.
- O que ficou pendente:
  reescrever a execução runner-side em estágios reais `resolve-case -> assemble-evidence -> diagnosis`;
  remover das superfícies internas do runtime a dependência operacional remanescente de `assessment` e `dossier`.
- Próximos passos:
  após este passo, seguir para o refactor runner-side do fluxo stage-by-stage e para a remoção das dependências internas restantes.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `docs/workflows/target-case-investigation-v2-manifest.json`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
- Spec de origem:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  - RF-06, RF-07, RF-08, RF-09, RF-13, RF-15, RF-18, RF-22, RF-25, RF-26, RF-27; CA-02, CA-04, CA-05, CA-06 e CA-07.
- Assumptions / defaults adotados:
  - não haverá mais preocupação com compatibilidade transitória da v1 como objetivo de design;
  - este passo ainda pode manter fallbacks internos estritamente locais para não quebrar o runtime antes do próximo refactor;
  - o contrato v2 deve ser limpo primeiro, mesmo que o runtime ainda precise de um segundo passo para ficar plenamente aderente.
- Fluxo atual:
  - o schema e o manifesto ainda carregam artefatos legados e continuamções opcionais como shape estrutural, apesar da spec diagnosis-first.
- Restrições técnicas:
  - manter o repositório compilável e com testes focados verdes;
  - não reescrever agora o executor stage-by-stage inteiro;
  - usar `apply_patch` para todas as edições manuais.

## Plan of Work
- Milestone 1:
  - Entregável:
    ticket, ExecPlan e spec reabertos com rastreabilidade explícita.
  - Evidência de conclusão:
    novos arquivos em `tickets/open/` e `execplans/`, além da spec marcada como `pending`.
  - Arquivos esperados:
    `tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`, `execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`, `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`.
- Milestone 2:
  - Entregável:
    schema/manifesto v2 cortados para o mínimo diagnosis-first.
  - Evidência de conclusão:
    `src/types/target-investigate-case.ts` rejeita outputs legados no v2, valida apenas o trio obrigatório do caminho mínimo e aceita continuações opcionais somente quando declaradas.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `docs/workflows/target-case-investigation-v2-manifest.json`.
- Milestone 3:
  - Entregável:
    repo íntegro com testes focados e tipagem coerente.
  - Evidência de conclusão:
    `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts` e `npm run check` com `exit 0`.
  - Arquivos esperados:
    `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, testes focados.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar ticket e ExecPlan do hard cut contratual da v2.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar a spec para `Status: in_progress` e `Spec treatment: pending`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/target-investigate-case.ts` para:
   - tornar `outputs.assessment`, `outputs.dossier` e `outputs.publicationDecision` opcionais no schema base;
   - rejeitar esses outputs quando `flow = "target-investigate-case-v2"`;
   - exigir apenas `resolve-case`, `assemble-evidence` e `diagnosis` como estágios obrigatórios;
   - validar os artefatos canônicos desses três estágios.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/workflows/target-case-investigation-v2-manifest.json` para remover os outputs legados do caminho mínimo e alinhar `diagnosis.artifacts` ao par `diagnosis.md`/`diagnosis.json`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar pequenos ajustes de sustentação em `src/core/target-investigate-case.ts` e `src/integrations/target-investigate-case-round-preparer.ts` para aceitar o manifesto v2 sem outputs legados.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar os testes diretamente afetados pelo novo contrato v2.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar os testes focados e `npm run check`.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito:
    RF-06, RF-07, RF-13, RF-15, RF-18, CA-02
  - Evidência observável:
    `src/types/target-investigate-case.ts` aceita o mínimo canônico diagnosis-first e rejeita `outputs.assessment`, `outputs.dossier` e `outputs.publicationDecision` quando `flow = "target-investigate-case-v2"`.
- Matriz requisito -> validação:
  - Requisito:
    RF-08, RF-09, CA-05
  - Evidência observável:
    a validação v2 exige apenas `resolve-case`, `assemble-evidence` e `diagnosis`; os estágios opcionais continuam aceitos, mas não são mais obrigatórios.
- Matriz requisito -> validação:
  - Requisito:
    RF-26, RF-27
  - Evidência observável:
    o manifesto v2 de referência deixa de anunciar artefatos legados como parte estrutural do caminho mínimo.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts`
  - Esperado: `exit 0`.
- Comando: `npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotência:
  - reaplicar o patch não deve reintroduzir outputs legados obrigatórios no manifesto v2 nem tornar os estágios opcionais obrigatórios novamente.
- Riscos:
  - o runtime atual ainda consome superfícies legadas; se os fallbacks mínimos não forem aplicados, o novo manifesto pode quebrar o fluxo antes do próximo passo.
- Recovery / Rollback:
  - se o hard cut do schema quebrar o runtime imediatamente, manter o contrato v2 correto e adicionar apenas fallbacks internos pontuais, sem recolocar os outputs legados como exigência do manifesto.

## Artifacts and Notes
- PR/Diff:
  - working tree local desta rodada.
- Logs relevantes:
  - `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts` -> `exit 0` com `630` testes passando.
  - `npm run check` -> `exit 0`.
- Evidências de teste:
  - corte contratual do manifesto v2 validado em `src/core/target-investigate-case.test.ts`;
  - fixtures v2 do preparer atualizadas para o novo contrato mínimo em `src/integrations/target-investigate-case-round-preparer.test.ts`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato do manifesto v2 em `src/types/target-investigate-case.ts`;
  - manifesto v2 de referência em `docs/workflows/target-case-investigation-v2-manifest.json`.
- Compatibilidade:
  - a etapa assume hard cut do contrato v2; qualquer suporte residual à v1 deixa de ser objetivo de design desta frente.
- Dependências externas e mocks:
  - nenhuma dependência externa nova; apenas fixtures/testes locais do runner.
