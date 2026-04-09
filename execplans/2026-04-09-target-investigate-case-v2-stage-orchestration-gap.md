# ExecPlan - target-investigate-case-v2 orchestration por estágio no caminho mínimo

## Purpose / Big Picture
- Objetivo:
  operacionalizar de verdade o caminho mínimo da v2 como `resolve-case -> assemble-evidence -> diagnosis`, em vez de depender de uma materialização monolítica runner-driven.
- Resultado esperado:
  o runner passa a executar três etapas explícitas, cada uma carregando o `promptPath` do estágio no manifesto do target e validando somente os artefatos mínimos correspondentes. O caminho mínimo deixa de bloquear em `assessment.json` e `dossier.*`.
- Escopo:
  criar ticket/ExecPlan desta nova frente;
  tornar `codex-client` stage-aware para o caminho mínimo v2;
  trocar o `round-preparer` para execução sequencial por estágio;
  ajustar o `core` para não exigir `assessment`/`dossier` no milestone `diagnosis`;
  atualizar prompts, fixtures e testes focados.
- Fora de escopo:
  refatorar nesta etapa as continuações opcionais `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication`;
  fechar tickets ou fazer commit;
  compatibilização em projeto alvo externo.

## Progress
- [x] 2026-04-09 18:10Z - Ticket registrado e agora encerrado em `tickets/closed/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md`.
- [x] 2026-04-09 18:10Z - ExecPlan criado em `execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md`.
- [x] 2026-04-09 19:10Z - Desenho stage-aware do `codex-client` e do `round-preparer` implementado.
- [x] 2026-04-09 19:10Z - Dependência mínima de `assessment`/`dossier` removida do milestone `diagnosis` no `core`.
- [x] 2026-04-09 19:10Z - Testes focados e `npm run check` executados.

## Surprises & Discoveries
- 2026-04-09 18:10Z - Os prompts canônicos por estágio já existem em `docs/workflows/`, o que reduz muito o custo de trocar a execução runner-side.
- 2026-04-09 18:10Z - O `codex-client` hoje já tem a infraestrutura de prompt building e execução; o maior trabalho é introduzir um request/result por estágio sem quebrar os fluxos paralelos do repositório.
- 2026-04-09 18:10Z - O `core` ainda trata `assessment`/`dossier` como parte da prontidão do milestone `diagnosis`, então a mudança precisa atravessar `preparer` e `core` juntas.

## Decision Log
- 2026-04-09 - Decisão: a execução por estágio vai usar o `promptPath` do manifesto como superfície principal do target.
  - Motivo:
    isso concretiza o contrato da spec e mantém o runner target-agnostic.
  - Impacto:
    o prompt monolítico `16-target-investigate-case-round-materialization.md` deixa de ser o backbone do caminho mínimo v2.
- 2026-04-09 - Decisão: a validação runner-side passa a ser incremental por estágio.
  - Motivo:
    isso melhora `failedAtMilestone`, logs e clareza operacional.
  - Impacto:
    o `round-preparer` deixa de validar o pacote inteiro inteiro como um bloco único após uma única chamada ao Codex.

## Outcomes & Retrospective
- Status final:
  concluído para o escopo do passo 2.
- O que funcionou:
  o passo 1 limpou o contrato do manifesto e preparou o terreno;
  a API stage-aware coube bem no `codex-client` sem quebrar a suíte;
  o `round-preparer` passou a validar artefatos por estágio e a refletir melhor `failedAtMilestone`.
- O que ficou pendente:
  a remoção completa de `assessment`/`dossier` do `core` de avaliação, summary/trace e superfícies operator-facing do v2.
- Próximos passos:
  atacar as superfícies restantes de summary/trace/telegram que ainda carregarem herança indevida.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/codex-client.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/core/target-investigate-case.ts`
  - `docs/workflows/target-investigate-case-v2-resolve-case.md`
  - `docs/workflows/target-investigate-case-v2-assemble-evidence.md`
  - `docs/workflows/target-investigate-case-v2-diagnosis.md`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/core/target-investigate-case.test.ts`
- Spec de origem:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  - RF-04, RF-05, RF-06, RF-07, RF-09, RF-12, RF-13, RF-14, RF-15, RF-18, RF-24, RF-25, RF-26, RF-27; CA-02, CA-03, CA-04, CA-06 e CA-07.
- Assumptions / defaults adotados:
  - a execução do caminho mínimo v2 será composta por três etapas explícitas;
  - `assessment` e `dossier` deixam de ser gates do milestone `diagnosis`;
  - continuações opcionais não entram nesta etapa.
- Fluxo atual:
  - o `round-preparer` chama um único método monolítico no `codex-client`;
  - o `codex-client` monta o prompt a partir de `prompts/16-target-investigate-case-round-materialization.md`;
  - o `core` ainda exige artefatos legados no fim do milestone `diagnosis`.
- Restrições técnicas:
  - manter o fluxo sequencial;
  - não embutir semântica de target no runner;
  - usar `apply_patch` para edições manuais.

## Plan of Work
- Milestone 1:
  - Entregável:
    `codex-client` stage-aware para o caminho mínimo v2.
  - Evidência de conclusão:
    existe request/result por estágio e o prompt monolítico deixa de ser usado no caminho mínimo v2.
  - Arquivos esperados:
    `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 2:
  - Entregável:
    `round-preparer` executando e validando `resolve-case`, `assemble-evidence` e `diagnosis` em sequência.
  - Evidência de conclusão:
    `failedAtMilestone` e validação de artefatos passam a refletir o estágio real.
  - Arquivos esperados:
    `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`.
- Milestone 3:
  - Entregável:
    `core` alinhado ao caminho mínimo sem `assessment`/`dossier`.
  - Evidência de conclusão:
    o milestone `diagnosis` aceita o par `diagnosis.md`/`diagnosis.json` como prontidão mínima do diagnóstico.
  - Arquivos esperados:
    `src/core/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`, ajustes auxiliares em `src/integrations/telegram-bot.test.ts` e `src/integrations/codex-client.test.ts` se necessário.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Introduzir tipos e API de execução por estágio em `src/integrations/codex-client.ts`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Substituir o uso do prompt monolítico por carregamento do `promptPath` do estágio declarado no manifesto.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/target-investigate-case-round-preparer.ts` para executar `resolve-case`, `assemble-evidence` e `diagnosis` em sequência e validar artefatos por estágio.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/target-investigate-case.ts` para o milestone `diagnosis` não exigir `assessment` nem `dossier`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar os prompts canônicos do target em `docs/workflows/target-investigate-case-v2-*.md` quando o texto ainda carregar resquício de compatibilidade legada indevida.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar testes focados de `core`, `round-preparer`, `codex-client` e `telegram` conforme o novo fluxo.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` e `npm run check`.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito:
    RF-06, RF-07, RF-12, RF-13, RF-14, RF-15, CA-02, CA-04
  - Evidência observável:
    o `round-preparer` executa e valida `resolve-case`, `assemble-evidence` e `diagnosis` em sequência, e cada fase materializa apenas os artefatos mínimos do estágio.
- Matriz requisito -> validação:
  - Requisito:
    RF-04, RF-05, RF-09, CA-06
  - Evidência observável:
    o `codex-client` passa a carregar `promptPath` do estágio declarado pelo target e deixa de depender do prompt monolítico no caminho mínimo v2.
- Matriz requisito -> validação:
  - Requisito:
    RF-15, RF-18, RF-25, RF-26, RF-27, CA-03, CA-07
  - Evidência observável:
    o milestone `diagnosis` do `core` aceita o diagnóstico mínimo sem exigir `assessment`/`dossier`, e as superfícies operator-facing continuam diagnosis-first.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: `exit 0`.
- Comando: `npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotência:
  - rerodar a suíte não deve reintroduzir o prompt monolítico nem voltar a exigir `assessment`/`dossier` no caminho mínimo.
- Riscos:
  - a mudança cruza muitas superfícies centrais do runner;
  - a suíte de `npm test -- ...` expande para `src/**/*.test.ts`, então qualquer regressão lateral aparece cedo.
- Recovery / Rollback:
  - se a troca para execução por estágio quebrar o fluxo, manter a API stage-aware e ajustar a sequência/validação incremental, em vez de reintroduzir o caminho monolítico como backbone.

## Artifacts and Notes
- PR/Diff:
  - working tree local desta rodada.
- Logs relevantes:
  - validações a executar após a implementação.
- Evidências de teste:
  - suites focadas e `npm run check`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - cliente Codex para `target-investigate-case`;
  - preparação de rodada v2;
  - gating do milestone `diagnosis` no core.
- Compatibilidade:
  - a etapa assume hard cut do caminho mínimo v2; o prompt monolítico e os artefatos legados deixam de ser backbone desta frente.
- Dependências externas e mocks:
  - nenhuma dependência externa nova; apenas ajustes nos stubs/fixtures locais do runner.
