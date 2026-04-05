# ExecPlan - Milestone 3 do semantic-review runner-side em `/target_investigate_case`

## Purpose / Big Picture
- Objetivo: implementar no `codex-flow-runner` a orquestração runner-side do subfluxo auxiliar `semantic-review` para `/target_investigate_case`, consumindo apenas o packet bounded emitido pelo projeto alvo e persistindo `semantic-review.result.json` no dossier local quando a revisão estiver pronta.
- Resultado esperado:
  - o loader do manifesto passa a reconhecer a seção `semanticReview` do projeto alvo;
  - o runner detecta `semantic-review.request.json` dentro do dossier local da rodada;
  - quando `review_readiness.status = "ready"`, o runner monta contexto mínimo apenas com paths e `json_pointers` declarados, chama o Codex, valida a resposta estruturada e grava `semantic-review.result.json`;
  - quando `review_readiness.status = "blocked"`, o runner não chama o Codex, não inventa resultado e registra o skip de forma observável;
  - quando o packet/manifesto estiver ausente, o fluxo atual continua sem regressão;
  - o trace do runner continua minimizado, sem copiar transcript bruto, `workflow_debug`, `db_payload` ou payloads sensíveis do alvo.
- Escopo:
  - novos tipos/schemas do manifesto e dos artefatos auxiliares de `semantic-review`;
  - helper bounded para resolver slices por `json_pointer`;
  - integração com `codex-client` e prompt dedicado;
  - persistência runner-side de `semantic-review.result.json`;
  - status mínimo do subfluxo no trace do runner;
  - cobertura automatizada dos cenários `absent`, `blocked`, `ready`, inválidos e regressão.
- Fora de escopo:
  - consumir `semantic-review.result.json` dentro de `assessment.json`;
  - alterar semântica de publication do fluxo além do necessário para o artefato auxiliar;
  - modificar `../guiadomus-matricula/**`;
  - corrigir o bug funcional de `extract_address`;
  - resolver o `check:specs` pendente do projeto alvo.

## Progress
- [x] 2026-04-05 15:47Z - Planejamento inicial concluído com leitura de `AGENTS.md`, `PLANS.md`, `DOCUMENTATION.md`, da spec runner-side, dos módulos centrais de `/target_investigate_case`, dos testes atuais do runner e do material de referência do alvo.
- [x] 2026-04-05 16:16Z - Tipos/schemas do runner foram expandidos para reconhecer `semanticReview`, `semantic-review.request.json` e `semantic-review.result.json`, incluindo normalização do manifesto pilot rico, novos paths auxiliares e trace mínimo tipado.
- [x] 2026-04-05 16:16Z - A orquestração bounded do Codex foi implementada para `semantic-review`, com helper de slices por `json_pointer`, prompt dedicado, persistência validada do resultado e degradação segura para `absent|blocked|invalid|failed`.
- [x] 2026-04-05 16:16Z - O trace minimizado foi atualizado com metadados mínimos do subfluxo sem vazamento de payload bruto, e os mocks tipados do runner/Telegram foram alinhados ao contrato novo.
- [x] 2026-04-05 16:16Z - Testes focados, `npm run check` e `npm test` foram executados e registrados; o ajuste final incluiu corrigir um drift no manifesto de referência local e em alguns mocks tipados.

## Surprises & Discoveries
- 2026-04-05 15:47Z - O ponto mais seguro para plugar o Milestone 3 no runner é o `TargetInvestigateCaseRoundPreparer`: a rodada já foi materializada no alvo, mas ainda estamos antes da avaliação final runner-side e sem ampliar as milestones públicas.
- 2026-04-05 15:47Z - Como o alvo ainda não consome `semantic-review.result.json` no `assessment.json`, falhas do subfluxo runner-side precisam degradar com observabilidade local e trace mínimo, sem quebrar silenciosamente o fluxo já existente.
- 2026-04-05 15:47Z - O manifesto real do piloto continua no shape “rico/pilot”; portanto o suporte a `semanticReview` precisa entrar na normalização do manifesto, não apenas no schema interno já simplificado.
- 2026-04-05 16:16Z - Ao tornar `semantic_review` e os novos artifact paths obrigatórios nos tipos finais do fluxo, alguns mocks de `runner.test.ts`, `telegram-bot.test.ts` e o manifesto de referência em `docs/workflows/target-case-investigation-manifest.json` precisaram ser atualizados para remover drift contratual local.

## Decision Log
- 2026-04-05 - Decisão: tratar `semantic-review` como artefato auxiliar local do flow, sem criar nova milestone pública.
  - Motivo: a spec já reserva subetapas internas dentro de `assessment`, e o pedido do Milestone 3 veda promover esse subfluxo a milestone externa.
  - Impacto: o wiring fica concentrado entre a materialização e a avaliação runner-side, enquanto os cinco milestones públicos permanecem inalterados.
- 2026-04-05 - Decisão: montar o contexto para o Codex runner-side a partir de slices resolvidos pelo próprio runner, e não por descoberta livre do agente no repositório alvo.
  - Motivo: o packet do alvo define explicitamente a fronteira de autoridade e quais superfícies podem ser usadas.
  - Impacto: a implementação precisa ter helper de leitura bounded por `artifact_path`/`path` + `json_pointer`, e o prompt novo deve receber apenas esse contexto mínimo.
- 2026-04-05 - Decisão: falhas de `semantic-review` não devem interromper a avaliação/publication atual enquanto o Milestone 4 não existir.
  - Motivo: nesta etapa o resultado ainda não altera `assessment.json`, então o comportamento mais seguro é degradar de forma observável e preservar o fluxo já estável.
  - Impacto: request inválido, resposta inválida ou falha do Codex entram como status local do subfluxo no trace, sem resultado sintético e sem mutar a semântica atual de publication.
- 2026-04-05 - Decisão: referenciar explicitamente o plano-fonte do alvo `../guiadomus-matricula/execplans/2026-04-05-case-investigation-semantic-review-via-codex-runner.md`.
  - Motivo: a evolução é cross-repo e o pedido do usuário exige rastreabilidade entre os dois lados do handshake.
  - Impacto: este plano e a documentação alterada no runner devem citar o plano do alvo como fonte do contrato novo.

## Outcomes & Retrospective
- Status final: concluído localmente no `codex-flow-runner`.
- O que funcionou: a arquitetura atual do runner já separa bem materialização da rodada, avaliação runner-side e trace final, o que permitiu encaixar `semantic-review` sem reabrir o flow público; o helper bounded por `json_pointer` também manteve a fronteira de autoridade do alvo intacta.
- O que ficou pendente: validação manual externa via Telegram autorizado e o Milestone 4 no projeto alvo, onde `semantic-review.result.json` ainda não recompõe `assessment.json`.
- Próximos passos: validar ponta a ponta em caso seguro autorizado quando houver operador disponível e acompanhar a integração do Milestone 4 em `../guiadomus-matricula`.

## Context and Orientation
- Ticket/escopo de origem no runner: continuação técnica do fluxo `/target_investigate_case`, sobre a base já entregue em `execplans/2026-04-03-target-investigate-case-round-preparer-bootstrap-gap.md`.
- Spec de origem no runner: `docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md`
- Plano-fonte do alvo que define o handshake desta etapa: `../guiadomus-matricula/execplans/2026-04-05-case-investigation-semantic-review-via-codex-runner.md`
- Arquivos principais do runner:
  - `src/core/target-investigate-case.ts`
  - `src/types/target-investigate-case.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `prompts/16-target-investigate-case-round-materialization.md`
- Arquivos principais de referência no alvo:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md`
  - `../guiadomus-matricula/utils/case-investigation/semantic-review.js`
  - `../guiadomus-matricula/utils/case-investigation/materializer.js`
  - `../guiadomus-matricula/tests/utils/case-investigation-semantic-review.test.js`
  - `../guiadomus-matricula/tests/scripts/materialize-case-investigation-round.test.js`
- RFs/CAs cobertos por este plano:
  - RF-05
  - RF-10
  - RF-11
  - RF-12
  - RF-18
  - RF-19
  - RF-40
  - RF-41
  - CA-05
  - CA-06
  - CA-10
  - CA-11
- Assumptions / defaults adotados:
  - o manifesto do alvo continua sendo aceito no shape pilot rico, com normalização local no runner;
  - `semantic-review.request.json` e `semantic-review.result.json` vivem no mesmo diretório da rodada (`investigations/<round-id>/`) e são artefatos auxiliares locais;
  - o runner só pode ler o request e os arquivos/pointers declarados por ele;
  - ausência de `semanticReview` ou do request não deve alterar o fluxo atual;
  - o resultado do subfluxo não será usado para recompor `assessment.json` nesta etapa;
  - a degradação segura prefere status observável no trace a erros silenciosos ou resultados sintéticos.
- Restrições técnicas:
  - nenhum vazamento de transcript bruto, `workflow_debug`, `db_payload` ou payload sensível no trace do runner;
  - nenhuma descoberta livre de evidência fora do packet;
  - nenhum paralelo de tickets ou mudança na fronteira de versionamento/publication já existente;
  - nenhuma modificação no projeto-alvo.

## Plan of Work
- Milestone 1:
  - Entregável: manifesto e tipos internos passam a reconhecer o contrato novo de `semanticReview` e os artefatos auxiliares locais.
  - Evidência de conclusão: o loader aceita manifesto com `semanticReview`, continua aceitando manifesto sem a seção e rejeita drift contratual relevante.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`.
- Milestone 2:
  - Entregável: helper bounded de contexto mínimo e prompt dedicado para o Codex, operando apenas com refs/pointers declarados.
  - Evidência de conclusão: `ready` chama o Codex com contexto mínimo; `blocked` não chama; request inválido ou resultado inválido degradam com status observável.
  - Arquivos esperados: `src/integrations/codex-client.ts`, novo prompt em `prompts/`, possivelmente helper novo em `src/integrations/`.
- Milestone 3:
  - Entregável: `roundPreparer` integra o subfluxo auxiliar e persiste `semantic-review.result.json` quando houver resultado válido.
  - Evidência de conclusão: o artefato é gravado no dossier local quando `ready`, e o fluxo principal continua funcionando quando `absent|blocked|failed`.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, testes de integração runner-side.
- Milestone 4:
  - Entregável: trace payload runner-side passa a registrar apenas metadados mínimos do subfluxo.
  - Evidência de conclusão: testes mostram status/paths/schema/verdict mínimos no trace e ausência de payload bruto sensível.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/target-investigate-case.ts` para introduzir o contrato de `semanticReview` no manifesto pilot/internal e os schemas `semantic-review.request/result`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar helper bounded para resolver paths relativos seguros e extrair apenas os slices declarados por `json_pointer`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Estender `src/integrations/codex-client.ts` com request/result/client específicos para a revisão semântica e adicionar prompt dedicado em `prompts/`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Integrar o subfluxo ao `src/integrations/target-investigate-case-round-preparer.ts`, persistindo `semantic-review.result.json` apenas quando houver resultado válido.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/target-investigate-case.ts` para descobrir os artefatos auxiliares e registrar trace minimizado do subfluxo sem alterar as milestones visíveis.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar/expandir `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/integrations/codex-client.test.ts`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar testes focados do fluxo, depois `npm run check` e `npm test`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan com progresso, decisões finais e resultados observados.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: o runner reconhece a seção `semanticReview` do manifesto.
  - Evidência observável: teste de loader/normalização aceita manifesto com `semanticReview` válido e continua aceitando ausência da seção.
  - Requisito: o runner detecta `semantic-review.request.json` sem promover milestone pública nova.
  - Evidência observável: `roundPreparer`/avaliação operam com artefato auxiliar local e os milestones externos continuam `preflight`, `case-resolution`, `evidence-collection`, `assessment`, `publication`.
  - Requisito: `review_readiness.status = "blocked"` não chama o Codex.
  - Evidência observável: teste runner-side prova zero invocações do cliente Codex e nenhum `semantic-review.result.json` sintético.
  - Requisito: `review_readiness.status = "ready"` chama o Codex, valida a resposta e persiste `semantic-review.result.json`.
  - Evidência observável: teste runner-side observa chamada ao cliente, arquivo persistido e schema válido.
  - Requisito: request inválido, resposta inválida e falha do Codex degradam com segurança e observabilidade.
  - Evidência observável: testes registram status `failed` ou equivalente no trace mínimo, sem quebrar o fluxo atual nem inventar resultado.
  - Requisito: o trace continua minimizado.
  - Evidência observável: testes inspecionam o trace e confirmam ausência de transcript bruto, `workflow_debug`, `db_payload` e payloads sensíveis.
  - Requisito: o fluxo atual continua funcionando quando o packet não existe.
  - Evidência observável: testes de regressão pré-existentes ou novos passam sem `semanticReview`.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  - Resultado observado: `exit 0`; o script atual expandiu para a suíte inteira e terminou com `578` testes `pass`, cobrindo manifesto, packet `absent|blocked|ready`, request inválido, resposta inválida e trace minimizado.
- Comando: `npm run check`
  - Resultado observado: `exit 0`.
- Comando: `npm test`
  - Resultado observado: `exit 0` com `578` testes `pass`.

## Idempotence and Recovery
- Idempotência:
  - rerodar a mesma rodada deve continuar produzindo o mesmo resultado para o mesmo packet bounded, sobrescrevendo apenas o artefato auxiliar `semantic-review.result.json` quando houver nova execução válida;
  - se o packet estiver ausente ou bloqueado, o comportamento permanece o mesmo em reruns;
  - o helper bounded lê somente caminhos relativos seguros e não altera outros artefatos.
- Riscos:
  - vazar payload bruto do alvo no prompt, no trace ou em mensagens de erro;
  - expandir indevidamente a autoridade semântica do runner;
  - transformar falha auxiliar do `semantic-review` em quebra do fluxo principal;
  - introduzir drift contratual entre o manifesto rico do alvo e a normalização local do runner.
- Recovery / Rollback:
  - se a chamada ao Codex ou a validação do resultado falhar, registrar status observável do subfluxo e seguir com a avaliação atual;
  - se a normalização do manifesto regredir, reverter primeiro o suporte a `semanticReview` mantendo compatibilidade com o flow atual;
  - se o prompt bounded vazar contexto demais, reduzir o contexto serializado ao packet + slices mínimos e rerodar a matriz de trace.

## Artifacts and Notes
- ExecPlan atual: `execplans/2026-04-05-target-investigate-case-semantic-review-runner-milestone-3.md`
- Plano-fonte do alvo: `../guiadomus-matricula/execplans/2026-04-05-case-investigation-semantic-review-via-codex-runner.md`
- Artefatos auxiliares esperados nesta etapa:
  - `semantic-review.request.json`
  - `semantic-review.result.json`
- Suites prioritárias:
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`

## Interfaces and Dependencies
- Interfaces alteradas:
  - manifesto normalizado de `target-investigate-case` no runner;
  - contrato runner-side de `semantic-review.request.json`;
  - contrato runner-side de `semantic-review.result.json`;
  - trace payload mínimo do flow `/target_investigate_case`;
  - integração de prompt/cliente Codex para a revisão semântica bounded.
- Compatibilidade:
  - o manifesto sem `semanticReview` continua válido;
  - `assessment.json` continua sendo a autoridade semântica final nesta etapa;
  - `publication-decision.json` continua exclusivamente runner-side;
  - o subfluxo auxiliar não altera as milestones públicas.
- Dependências externas e mocks:
  - `codex-client` precisa ser mockável para cenários `ready`, falha e resposta inválida;
  - o contrato do packet é derivado do alvo, mas a implementação do runner não modifica `../guiadomus-matricula/**`;
  - os testes devem usar fixtures locais e não depender de serviços externos reais.
