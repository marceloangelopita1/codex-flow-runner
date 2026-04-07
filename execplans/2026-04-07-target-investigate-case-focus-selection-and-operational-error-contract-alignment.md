# ExecPlan - compatibilizar o runner com foco investigativo e erros operacionais bounded do target case-investigation

## Purpose / Big Picture
- Objetivo:
  compatibilizar o `codex-flow-runner` com a evolucao ja implementada em `../guiadomus-matricula` no contrato de `case-investigation`, sem alterar o projeto alvo e preservando retrocompatibilidade runner-side quando isso for razoavel.
- Resultado esperado:
  o runner passa a aceitar o manifesto, o `assessment.json`, o `causal-debug.request.json` e o packet de `semantic-review` emitidos pelo target atual, continua entendendo artefatos legados relevantes e nao bloqueia a orquestracao por drift contratual evitavel.
- Escopo:
  ajustar tipos, schemas, normalizacao, prompt bounded de `semantic-review` e testes do fluxo `target-investigate-case`;
  confirmar o contrato real diretamente no codigo do alvo antes de editar o runner;
  validar a compatibilidade com foco em `currentStateSelection`, `operationalErrorSurface`, `derivedOperationalCandidate`, `bounded_outcome` e readiness repo-aware por `semantic_operational_conflict`.
- Fora de escopo:
  alterar qualquer arquivo em `../guiadomus-matricula`;
  inventar semantica nova no runner;
  afrouxar schemas com `passthrough` generico so para aceitar qualquer payload;
  fazer commit ou push.

## Progress
- [x] 2026-04-07 21:48Z - Leitura inicial de `AGENTS.md`, `DOCUMENTATION.md`, `PLANS.md`, `INTERNAL_TICKETS.md`, `EXTERNAL_PROMPTS.md` e `SPECS.md` concluida.
- [x] 2026-04-07 21:48Z - Leitura comparativa inicial do target e do runner concluida para confirmar os gaps reais.
- [ ] 2026-04-07 21:48Z - Schemas e normalizacao do runner alinhados ao contrato novo do target.
- [ ] 2026-04-07 21:48Z - Prompt bounded de `semantic-review` alinhado a erros operacionais top-level declarados no packet.
- [ ] 2026-04-07 21:48Z - Testes expandidos para manifesto, assessment, causal-debug request e fluxo repo-aware por conflito semantic-operacional.
- [ ] 2026-04-07 21:48Z - Validacao final com `npm test` direcionado e `npm run check` concluida.

## Surprises & Discoveries
- 2026-04-07 21:48Z - O runner ja esta melhor do que a hipotese inicial no gate de `causal-debug`: ele segue `debug_readiness.status === "ready"` e nao depende diretamente de `semantic_confirmation.status === "confirmed_error"` para publication runner-side.
- 2026-04-07 21:48Z - O maior drift atual esta no parsing/modelagem do contrato, nao na ordem da orquestracao: manifesto piloto, `assessment` rico e `causal-debug.request` ficaram mais estreitos que o contrato atual do alvo.
- 2026-04-07 21:48Z - O packet de `semantic-review` do runner ja aceita `field_path` e `json_pointer` genericos, entao `errors[<index>]` e `/errors/<index>` entram naturalmente no schema; o ajuste necessario fica concentrado em prompt, fixtures e cobertura de testes.
- 2026-04-07 21:48Z - A fila `tickets/open/` esta vazia no workspace atual; este plano precisa ser autocontido e ancorado na solicitacao direta do usuario.

## Decision Log
- 2026-04-07 - Decisao: tratar o projeto alvo como fonte de verdade e limitar a mudanca ao runner-side.
  - Motivo:
    a solicitacao pede compatibilizacao precisa com o contrato real ja implementado no alvo.
  - Impacto:
    toda modelagem nova no runner precisa ser confirmada em `manifest.json`, `semantic-review.js`, `semantic-artifacts.js` e `causal-debug.js` do target antes do patch.
- 2026-04-07 - Decisao: ampliar suporte runner-side de forma explicita e aditiva, preservando legado quando razoavel.
  - Motivo:
    o alvo evoluiu contratos sem abandonar totalmente a janela de migracao, e o usuario pediu retrocompatibilidade quando fizer sentido.
  - Impacto:
    os schemas devem modelar explicitamente os novos campos, enquanto a normalizacao continua aceitando shapes legados relevantes onde isso ja faz parte do desenho atual.
- 2026-04-07 - Decisao: nao mexer na orquestracao central se ela ja estiver correta.
  - Motivo:
    o objetivo e compatibilizar com precisao, evitando complexidade extra onde o runner ja segue o contrato novo por meio de `debug_readiness`.
  - Impacto:
    o foco principal fica em `src/types/target-investigate-case.ts`, `prompts/17-target-investigate-case-semantic-review.md` e testes, com possiveis ajustes pontuais no core apenas se um pressuposto escondido for confirmado.

## Outcomes & Retrospective
- Status final:
  em execucao.
- O que funcionou:
  a leitura comparativa inicial ja isolou os pontos de drift com boa precisao.
- O que ficou pendente:
  implementar os patches, expandir testes e rodar validacoes.
- Proximos passos:
  atualizar tipos/normalizacao, ajustar o prompt bounded e fechar a validacao automatizada.

## Context and Orientation
- Repositorio principal:
  `/home/mapita/projetos/codex-flow-runner`
- Repositorio alvo de referencia:
  `/home/mapita/projetos/guiadomus-matricula`
- Arquivos principais do alvo:
  - `../guiadomus-matricula/docs/specs/2026-04-07-case-investigation-focus-selection-and-operational-error-hardening.md`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md`
  - `../guiadomus-matricula/utils/case-investigation/materializer.js`
  - `../guiadomus-matricula/utils/case-investigation/semantic-review.js`
  - `../guiadomus-matricula/utils/case-investigation/semantic-artifacts.js`
  - `../guiadomus-matricula/utils/case-investigation/causal-debug.js`
- Arquivos principais do runner:
  - `src/types/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/core/target-investigate-case.ts`
  - `prompts/17-target-investigate-case-semantic-review.md`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`
- Spec de origem:
  - externa ao runner: `../guiadomus-matricula/docs/specs/2026-04-07-case-investigation-focus-selection-and-operational-error-hardening.md`
- RFs/CAs cobertos por este plano no runner:
  - RF runner-side implicitos desta compatibilizacao: aceitar manifesto atualizado, preservar `assessment` rico, aceitar `causal-debug.request` enriquecido, manter a trilha bounded de `semantic-review` coerente com `errors[]` top-level declarados e nao bloquear readiness repo-aware legitimo.
- Assumptions / defaults adotados:
  - o runner continua autoridade apenas de orquestracao/publication;
  - o target continua autoridade de assessment semantico/causal local;
  - a compatibilizacao deve ser minima e precisa, sem alterar comportamento ja correto;
  - validacoes do alvo serao usadas apenas como referencia de contrato, sem edicoes cross-repo nesta tarefa.
- Fluxo atual relevante:
  - o target materializa a rodada, incluindo artefatos bounded e repo-aware;
  - o runner valida manifesto e artefatos, executa `semantic-review` bounded e segue a readiness declarada pelo target para `causal-debug` e `root-cause-review`;
  - o drift atual aparece principalmente quando o runner parseia contratos mais ricos emitidos pelo alvo.
- Restricoes tecnicas:
  - manter compatibilidade com contratos legados quando isso nao conflitar com a precisao do contrato novo;
  - preservar schemas estruturais estritos;
  - nao depender de contexto oral ou memoria externa para explicar a mudanca.

## Plan of Work
- Milestone 1:
  - Entregavel:
    mapa objetivo dos gaps reais entre target e runner, confirmados em codigo.
  - Evidencia de conclusao:
    lista curta de incompatibilidades reais registrada no `Decision Log` e refletida nos patches.
  - Arquivos esperados:
    nenhum arquivo funcional alterado ainda; apenas este ExecPlan.
- Milestone 2:
  - Entregavel:
    manifesto, `assessment` e `causal-debug.request` aceitos pelo runner com modelagem explicita dos campos novos.
  - Evidencia de conclusao:
    `loadTargetInvestigateCaseManifest`, `targetInvestigateCaseAssessmentSchema` e `targetInvestigateCaseCausalDebugRequestSchema` passam com fixtures do contrato novo.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts` e testes correlatos.
- Milestone 3:
  - Entregavel:
    prompt de `semantic-review` alinhado a superficies operacionais bounded top-level declaradas pelo packet.
  - Evidencia de conclusao:
    teste do prompt cobre a instrucao sobre `errors[]` correlatos ao workflow e a restricao de continuar bounded.
  - Arquivos esperados:
    `prompts/17-target-investigate-case-semantic-review.md`, `src/integrations/codex-client.test.ts`.
- Milestone 4:
  - Entregavel:
    cobertura automatizada expandida para os cenarios novos e validacao runner-side concluida.
  - Evidencia de conclusao:
    suites afetadas verdes e `npm run check` sem erro.
  - Arquivos esperados:
    `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts` e eventuais testes correlatos.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir os trechos de `src/types/target-investigate-case.ts` responsaveis por manifesto piloto, normalizacao de manifesto, `assessment`, `case-resolution` e `causal-debug.request`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Confirmar no alvo os campos novos e suas relacoes formais em `materializer.js`, `semantic-review.js`, `semantic-artifacts.js` e `causal-debug.js`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Patchar `src/types/target-investigate-case.ts` para aceitar e preservar explicitamente os campos novos do manifesto e dos artefatos ricos.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `prompts/17-target-investigate-case-semantic-review.md` para reconhecer `errors[]` top-level correlatos ao workflow como superficie bounded valida quando declarada no packet.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Expandir os testes existentes de manifesto, `assessment`, `causal-debug.request`, prompt e fluxo `debug_readiness.status = ready`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts` e `npm run check`.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito:
    manifesto piloto do target com `currentStateSelection`, `operationalErrorSurface`, `derivedOperationalCandidate` e `boundedOutcomeStatuses` e aceito pelo runner.
  - Evidencia observavel:
    teste de carregamento/normalizacao do manifesto passa com fixture que contem esses blocos.
  - Requisito:
    `assessment.json` rico preserva `semantic_confirmation`, `bounded_outcome` e `causal_hypothesis`.
  - Evidencia observavel:
    teste de schema/normalizacao passa e os campos continuam acessiveis no objeto normalizado.
  - Requisito:
    `causal-debug.request.json` aceita o bloco `bounded_outcome`.
  - Evidencia observavel:
    teste de schema passa com fixture contendo `bounded_outcome.status`, flags booleanas e `summary`.
  - Requisito:
    o runner nao presume erro semantico estrito para seguir com `causal-debug` quando o target marcou conflito acionavel.
  - Evidencia observavel:
    teste de avaliacao/round confirma que `debug_readiness.status = ready` com `semantic_operational_conflict` nao e rejeitado por pressuposto runner-side escondido.
  - Requisito:
    o prompt bounded de `semantic-review` deixa explicito o tratamento de `errors[]` top-level declarados no packet.
  - Evidencia observavel:
    teste de prompt encontra a instrucao textual correspondente e continua reforcando as restricoes bounded.
- Comando:
  `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts`
  - Esperado:
    `exit 0`.
- Comando:
  `npm run check`
  - Esperado:
    `tsc --noEmit` sem erros.

## Idempotence and Recovery
- Idempotencia:
  os patches sao estruturais e deterministas; rerodar os testes no mesmo estado deve produzir o mesmo resultado.
- Riscos:
  preservar pouco demais do `assessment` rico e continuar perdendo informacao relevante;
  preservar demais e introduzir acoplamento desnecessario do runner a campos que ele nao precisa;
  ajustar prompt sem alinhar fixtures/testes e deixar a cobertura enganosa.
- Recovery / Rollback:
  se um campo novo do alvo conflitar com a modelagem atual do runner, preferir falha diagnostica explicita a normalizacao silenciosa;
  se um ajuste de schema quebrar contratos legados, restaurar compatibilidade com uniao/normalizacao aditiva em vez de remover o suporte novo.

## Artifacts and Notes
- Artefatos consultados:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/utils/case-investigation/materializer.js`
  - `../guiadomus-matricula/utils/case-investigation/semantic-review.js`
  - `../guiadomus-matricula/utils/case-investigation/semantic-artifacts.js`
  - `../guiadomus-matricula/utils/case-investigation/causal-debug.js`
- Notas:
  - esta tarefa nasce de solicitacao direta do usuario; nao ha ticket aberto local no workspace atual para servir como ancora do plano.

## Interfaces and Dependencies
- Interfaces alteradas:
  - manifesto piloto normalizado de `target-investigate-case`;
  - normalizacao runner-side de `assessment.json`;
  - schema runner-side de `causal-debug.request.json`;
  - prompt bounded de `semantic-review`.
- Compatibilidade:
  - manter suporte a contratos legados onde o runner ja usa uniao/normalizacao aditiva;
  - aceitar explicitamente os campos novos sem transformar os contratos em `passthrough` generico.
- Dependencias externas e mocks:
  - dependencia de referencia apenas no repositorio irmao `../guiadomus-matricula`;
  - fixtures e mocks dos testes locais precisam reproduzir o contrato novo do target com fidelidade suficiente.
