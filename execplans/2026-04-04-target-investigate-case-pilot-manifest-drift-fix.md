# Correção de drift do manifesto pilot em target investigate case

## Purpose / Big Picture
- Objetivo: restaurar a compatibilidade do `codex-flow-runner` com o manifesto rico/pilot atual de `guiadomus-matricula` no fluxo `/target_investigate_case`.
- Resultado esperado: `loadTargetInvestigateCaseManifest("/home/mapita/projetos/guiadomus-matricula")` volta a carregar o manifesto real sem erro de parse, preservando suporte ao formato pilot anterior.
- Escopo: ajuste mínimo e aditivo no schema/normalização pilot do runner, atualização de fixtures/testes e validação com o manifesto real.
- Fora de escopo: alterar o projeto alvo `guiadomus-matricula`, redesenhar o contrato normalized interno, mudar o fluxo Telegram fora do parse do manifesto.

## Progress
- [x] 2026-04-04 18:27Z - Planejamento inicial e reprodução do drift concluídos.
- [x] 2026-04-04 18:27Z - Schema pilot ajustado para aceitar o shape atual do manifesto rico.
- [x] 2026-04-04 18:27Z - Fixtures e testes atualizados para reproduzir o manifesto real e proteger retrocompatibilidade.
- [x] 2026-04-04 18:27Z - Validação final concluída com repro local e suíte relevante.

## Surprises & Discoveries
- 2026-04-04 18:27Z - O erro do Telegram acontece antes da investigação causal, na carga de `docs/workflows/target-case-investigation-manifest.json`.
- 2026-04-04 18:27Z - O fallback `pilot` do runner está `strict()` e modela um shape antigo, enquanto o manifesto real ganhou `entrypoint` top-level e `phaseOutputs.preflight.artifact`.
- 2026-04-04 18:27Z - O fixture `buildPilotManifestFixture(...)` ainda espelha o contrato antigo, então a suíte atual não captura o drift real.
- 2026-04-04 18:27Z - O normalizador existente não depende semanticamente dos novos campos; bastou ensiná-lo a aceitá-los para restaurar a compatibilidade.

## Decision Log
- 2026-04-04 - Decisão: criar ExecPlan antes do patch.
  - Motivo: a tarefa altera contrato/schema e múltiplos arquivos com impacto de compatibilidade.
  - Impacto: a investigação e a validação ficam rastreáveis e autocontidas.
- 2026-04-04 - Decisão: manter a correção estritamente aditiva no schema pilot.
  - Motivo: o pedido exige aceitar o shape atual do alvo sem quebrar o formato anteriormente suportado.
  - Impacto: o contrato normalized interno continua como autoridade do runner; apenas a porta de entrada pilot fica mais tolerante.

## Outcomes & Retrospective
- Status final: concluído.
- O que funcionou: a correção aditiva no schema pilot resolveu o incidente sem tocar na normalização interna nem no projeto alvo.
- O que ficou pendente: nenhuma pendência local obrigatória para este incidente.
- Próximos passos: validar o fluxo completo via Telegram em operação real quando conveniente, agora sem o bloqueio de parse do manifesto.

## Context and Orientation
- Arquivos principais:
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/core/target-investigate-case.test.ts`
  - `/home/mapita/projetos/guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
- Spec de origem: `docs/history/target-investigate-case/2026-04-03-pre-v2-foundation.md` via capability já materializada no projeto alvo.
- RFs/CAs cobertos por este plano:
  - Compatibilidade do runner com manifesto pilot/rico atual.
  - Carga bem-sucedida do manifesto real em `loadTargetInvestigateCaseManifest(...)`.
  - Cobertura automatizada do shape atual sem perder retrocompatibilidade.
- Assumptions / defaults adotados:
  - O manifesto real de `guiadomus-matricula` é a referência de compatibilidade desejada para este incidente.
  - `entrypoint` top-level e `phaseOutputs.preflight.artifact` são campos informativos/aditivos para o runner neste momento.
  - A normalização para o formato interno não precisa consumir novos campos se eles não alteram o manifesto normalized já derivado.
- Fluxo atual:
  - `loadTargetInvestigateCaseManifest(...)` lê o JSON do alvo.
  - `normalizeTargetInvestigateCaseManifestDocument(...)` tenta primeiro o schema normalized interno e depois o schema pilot.
  - O schema pilot falha por `strict()` ao encontrar campos novos no manifesto real.
- Restrições técnicas:
  - Não alterar `guiadomus-matricula`.
  - Manter a correção mínima, aditiva e segura.
  - Preservar compatibilidade com o shape pilot já suportado.

## Plan of Work
- Milestone 1:
  - Entregável: schema pilot do runner aceita o manifesto rico atual sem relaxar validações relevantes.
  - Evidência de conclusão: `loadTargetInvestigateCaseManifest("/home/mapita/projetos/guiadomus-matricula")` retorna `status: "loaded"`.
  - Arquivos esperados: `src/types/target-investigate-case.ts`.
- Milestone 2:
  - Entregável: fixture e testes reproduzem o shape real e protegem o contrato suportado.
  - Evidência de conclusão: suíte de testes da feature passa incluindo caso com `entrypoint` e `preflight.artifact`.
  - Arquivos esperados: `src/core/target-investigate-case.test.ts`.
- Milestone 3:
  - Entregável: validação final documentada com comandos e resultados observáveis.
  - Evidência de conclusão: repro real e testes executados com sucesso, registrados neste plano.
  - Arquivos esperados: este ExecPlan atualizado.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Inspecionar `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts` e o manifesto real em `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json` para localizar o drift.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/target-investigate-case.ts` para aceitar os campos aditivos do manifesto pilot atual sem remover suporte ao shape anterior.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/target-investigate-case.test.ts` para refletir o shape real do manifesto rico e cobrir o caminho que falhava.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar a suíte relevante e o comando de reprodução real para validar a correção.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este plano com descobertas finais, decisões e evidências observáveis.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: o runner deve aceitar o manifesto rico atual de `guiadomus-matricula`.
  - Evidência observável: o comando `npx tsx -e 'import { loadTargetInvestigateCaseManifest } from "./src/core/target-investigate-case.ts"; (async () => { const result = await loadTargetInvestigateCaseManifest("/home/mapita/projetos/guiadomus-matricula"); console.log(JSON.stringify(result, null, 2)); })();'` imprime `status: "loaded"`.
  - Requisito: a retrocompatibilidade com o shape pilot anterior deve ser preservada.
  - Evidência observável: os testes existentes de normalização continuam passando sem exigir os campos novos.
  - Requisito: a falha real precisa ter cobertura automatizada.
  - Evidência observável: a suíte inclui fixture/caso com `entrypoint` top-level e `phaseOutputs.preflight.artifact`, e esse caso passa.
- Comando: `node --test src/core/target-investigate-case.test.ts`
  - Esperado: testes da feature passam.
- Comando: `npx tsx -e 'import { loadTargetInvestigateCaseManifest } from "./src/core/target-investigate-case.ts"; (async () => { const result = await loadTargetInvestigateCaseManifest("/home/mapita/projetos/guiadomus-matricula"); console.log(JSON.stringify(result, null, 2)); })();'`
  - Esperado: manifesto real carrega com `status: "loaded"`.

## Idempotence and Recovery
- Idempotência: a mudança é local ao runner e repetir os testes/repro não altera estado persistente do projeto alvo.
- Riscos: relaxar demais o schema pilot e mascarar regressões reais do manifesto.
- Recovery / Rollback: reverter apenas o patch em `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.test.ts` caso os testes revelem regressão; como a mudança é aditiva, o rollback é direto.

## Artifacts and Notes
- PR/Diff: mudanças locais em `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts` e neste ExecPlan.
- Logs relevantes: erro reproduzido inicialmente com `pilot: Unrecognized key(s) in object: 'entrypoint'` e `pilot: Unrecognized key(s) in object: 'artifact'`.
- Evidencias de teste:
  - `npm run check` passou.
  - `npx tsx --test src/core/target-investigate-case.test.ts` passou com `15/15`.
  - `npx tsx -e 'import { loadTargetInvestigateCaseManifest } from "./src/core/target-investigate-case.ts"; (async () => { const result = await loadTargetInvestigateCaseManifest("/home/mapita/projetos/guiadomus-matricula"); console.log(JSON.stringify(result, null, 2)); })();'` retornou `status: "loaded"`.

## Interfaces and Dependencies
- Interfaces alteradas: schema `targetInvestigateCasePilotManifestSchema` e fixture de manifesto rico em testes.
- Compatibilidade: preserva o formato normalized interno e amplia a compatibilidade de entrada do formato pilot.
- Dependencias externas e mocks: depende apenas do manifesto real em `/home/mapita/projetos/guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json` para a validação de integração local.
