# ExecPlan - target-investigate-case-v2 hard cut de evaluation, summary, trace e Telegram

## Purpose / Big Picture
- Objetivo:
  remover a herança estrutural de `assessment.json` e `dossier.*` da avaliação final do v2, das decisões tardias de publication e das superfícies finais do runner.
- Resultado esperado:
  o v2 passa a concluir, resumir e responder ao operador a partir do diagnóstico canônico. publication continua conservadora e tardia, mas deixa de depender de `assessment`/`dossier`.
- Escopo:
  abrir ticket/ExecPlan desta frente;
  ajustar tipos centrais de summary/trace/publication request para o branch v2;
  refatorar `evaluateTargetInvestigateCaseRound(...)` para o caminho mínimo diagnosis-first;
  simplificar o reply do Telegram;
  ajustar testes focados e validações.
- Fora de escopo:
  remover nesta etapa todos os artefatos e contratos legados do código-base inteiro;
  reescrever continuações opcionais além do necessário para publication v2;
  fechar tickets ou fazer commit.

## Progress
- [x] 2026-04-09 18:43Z - Ticket registrado e agora encerrado em `tickets/closed/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md`.
- [x] 2026-04-09 18:43Z - ExecPlan criado em `execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md`.
- [x] 2026-04-09 18:53Z - Tipos centrais de summary/trace/publication request alinhados ao branch v2.
- [x] 2026-04-09 18:53Z - `core` v2 refatorado para avaliar e publicar sem `assessment`/`dossier`.
- [x] 2026-04-09 18:53Z - Telegram e testes focados atualizados e validados.

## Surprises & Discoveries
- 2026-04-09 18:43Z - O preparo v2 já está no desenho certo; o principal desvio remanescente está concentrado em `evaluateTargetInvestigateCaseRound(...)` e nos builders de summary/trace.
- 2026-04-09 18:43Z - O publisher já prefere `ticket_markdown` target-owned; isso permite cortar a dependência real de `assessment` no v2 sem reescrever toda a renderização fallback do ticket.
- 2026-04-09 18:43Z - O contrato de `ticket-proposal.json` ainda referencia `assessment.json`; essa superfície precisa ser revista no mesmo ciclo para evitar uma v2 “sem assessment” apenas no caminho mínimo, mas ainda dependente dele para publication.

## Decision Log
- 2026-04-09 - Decisão: o branch v2 da avaliação final passa a ser explicitamente diagnosis-first.
  - Motivo:
    o preparo stage-aware não resolve o desvio arquitetural se summary/trace/publication continuarem assessment-first.
  - Impacto:
    a avaliação v2 deixa de ler `assessment.json` e `dossier.*` como pré-condição.
- 2026-04-09 - Decisão: publication opcional do v2 passa a depender de `ticket-proposal.json` target-owned e policy do runner, não de `assessment`.
  - Motivo:
    manter publication tardia e conservadora sem reintroduzir artefatos removidos do contrato mínimo.
  - Impacto:
    summary e Telegram passam a carregar um `publicationDecision` runner-side coerente com o diagnóstico, mesmo quando a continuação não é atravessada.

## Outcomes & Retrospective
- Status final:
  concluído para o escopo do passo 3.
- O que funcionou:
  o passo 2 isolou o problema remanescente e tornou o refactor mais localizado;
  o branch v2 do `core` passou a avaliar e publicar a partir de `diagnosis` + `ticket-proposal.json`;
  summary, trace e Telegram ficaram diagnosis-first sem reintroduzir `assessment`/`dossier` no caminho mínimo.
- O que ficou pendente:
  ainda existem contratos legados fora do caminho mínimo e das superfícies finais do v2, mas eles não voltam mais a bloquear o branch diagnosis-first entregue aqui.
- Próximos passos:
  decidir se a próxima rodada vai limpar artefatos legados restantes das continuações opcionais ou endurecer mais o contrato target-owned de `ticket-proposal.json`.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/target-investigate-case-ticket-publisher.test.ts`
- Spec de origem:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- RFs/CAs cobertos por este plano:
  - RF-15, RF-18, RF-24, RF-25, RF-26 e RF-27; CA-02, CA-03, CA-04, CA-06 e CA-07.
- Assumptions / defaults adotados:
  - o v2 usa `diagnosis.json` como fonte canônica machine-readable do fluxo mínimo;
  - `ticket-proposal.json` é opcional e só entra quando `publication` for de fato atravessada;
  - `assessment.json` e `dossier.*` deixam de participar do branch v2 de avaliação final.
- Fluxo atual:
  - o v2 já prepara a rodada em `resolve-case -> assemble-evidence -> diagnosis`;
  - a avaliação final ainda lê `assessment`/`dossier`, deriva summary/trace deles e os exibe ao operador.
- Restrições técnicas:
  - manter o fluxo sequencial;
  - usar `apply_patch` para edições manuais;
  - não reabrir a v1 como requisito de compatibilidade desta frente.

## Plan of Work
- Milestone 1:
  - Entregável:
    tipos centrais alinhados ao v2 para summary/trace/publication request.
  - Evidência de conclusão:
    o branch v2 consegue construir summary/trace/publication sem campos obrigatórios de `assessment`/`dossier`.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, possivelmente `src/core/target-investigate-case.ts`.
- Milestone 2:
  - Entregável:
    avaliação final v2 diagnosis-first com publication opcional runner-side sem assessment.
  - Evidência de conclusão:
    `evaluateTargetInvestigateCaseRound(...)` no v2 deixa de ler `assessment.json` e `dossier.*`.
  - Arquivos esperados:
    `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-ticket-publisher.ts`.
- Milestone 3:
  - Entregável:
    reply do Telegram e testes focados coerentes com a nova superfície diagnosis-first.
  - Evidência de conclusão:
    o reply concluído não mostra mais `Dossier local` nem campos assessment-first; as suítes focadas ficam verdes.
  - Arquivos esperados:
    `src/integrations/telegram-bot.ts`, `src/core/target-investigate-case.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/target-investigate-case-ticket-publisher.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/target-investigate-case.ts` para permitir summary/trace/publication request diagnosis-first no branch v2.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/core/target-investigate-case.ts` para avaliar o v2 sem `assessment`/`dossier`, inclusive no gating de publication.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/target-investigate-case-ticket-publisher.ts` para não depender de `assessment` no branch v2 com `ticket-proposal.json` target-owned.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Simplificar `src/integrations/telegram-bot.ts` para a superfície final diagnosis-first.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar os testes focados de `core`, `telegram` e `ticket-publisher`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/core/target-investigate-case.test.ts src/integrations/telegram-bot.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts` e `npm run check`.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito:
    RF-15, RF-18, RF-25, CA-02, CA-03
  - Evidência observável:
    o v2 conclui a rodada mínima usando apenas `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`.
- Matriz requisito -> validação:
  - Requisito:
    RF-24, RF-26, RF-27, CA-04, CA-06
  - Evidência observável:
    `buildTargetInvestigateCaseFinalSummary(...)`, `buildTargetInvestigateCaseTracePayload(...)` e `renderTargetInvestigateCaseFinalSummary(...)` deixam de depender de `assessment`/`dossier` para o branch v2.
- Matriz requisito -> validação:
  - Requisito:
    publication runner-side tardia e conservadora
  - Evidência observável:
    o v2 só atravessa publication quando existir `ticket-proposal.json` e a policy permitir; caso contrário, o `publicationDecision` continua sendo calculado runner-side sem `assessment`.
- Matriz requisito -> validação:
  - Requisito:
    RF-26, RF-27, CA-07
  - Evidência observável:
    o Telegram concluído mostra veredito, porquê, comportamento a mudar, superfície provável, publication status e próxima ação, sem `Dossier local`.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/telegram-bot.test.ts src/integrations/target-investigate-case-ticket-publisher.test.ts`
  - Esperado: `exit 0`.
- Comando: `npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotência:
  - rerodar a suíte não deve reintroduzir `assessment`/`dossier` como pré-condição do v2.
- Riscos:
  - o `core` mistura ainda lógica legada e v2 no mesmo arquivo;
  - a suíte de `npm test -- ...` expande para `src/**/*.test.ts`, então regressões colaterais aparecem cedo.
- Recovery / Rollback:
  - se o branch v2 diagnosis-first quebrar a publication opcional, manter o corte do caminho mínimo e ajustar apenas os gates runner-side do branch opcional, sem voltar a exigir `assessment`/`dossier`.

## Artifacts and Notes
- PR/Diff:
  - working tree local desta rodada.
- Logs relevantes:
  - validações a executar após implementação.
- Evidências de teste:
  - suites focadas e `npm run check`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - summary/trace/publication request do fluxo `target-investigate-case`;
  - branch v2 de `evaluateTargetInvestigateCaseRound(...)`;
  - reply concluído do Telegram.
- Compatibilidade:
  - o passo assume hard cut do v2 diagnosis-first; campos legados podem continuar existindo para outros fluxos, mas deixam de ser requeridos pelo branch v2.
- Dependências externas e mocks:
  - nenhuma dependência externa nova; apenas ajustes em fixtures/stubs do runner.
