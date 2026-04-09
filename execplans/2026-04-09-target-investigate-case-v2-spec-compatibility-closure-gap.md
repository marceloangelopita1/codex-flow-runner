# ExecPlan - target-investigate-case-v2 fechamento real da compatibilidade com a spec

## Purpose / Big Picture
- Objetivo:
  fechar de forma observável a compatibilidade real do `target-investigate-case-v2` com a spec diagnosis-first depois da revisão arquitetural de 2026-04-09, corrigindo os gaps que ainda permanecem apesar dos tickets/execplans já fechados hoje.
- Resultado esperado:
  o runner passa a aceitar o contrato público mínimo descrito na spec, preserva o milestone real das falhas do caminho mínimo e deixa de vazar `assessment`/`dossier` como parte do contrato efetivo do branch v2.
- Escopo:
  reabrir a trilha com rastreabilidade honesta;
  corrigir o contrato público do manifesto v2 no runner;
  corrigir a propagação de `failedAtMilestone` e `failureKind`;
  isolar ou remover o vazamento de artefatos legados do branch v2;
  endurecer testes e evidências de fechamento;
  atualizar a spec como documento vivo para refletir o estado real durante a execução.
- Fora de escopo:
  compatibilizar projetos alvo antes do hard cut runner-side;
  reabrir a v1 como objetivo de design;
  criar dependências externas novas;
  tratar testes verdes atuais como prova suficiente de aderência.

## Progress
- [x] 2026-04-09 19:25Z - Revisão arquitetural consolidada e novo ExecPlan guarda-chuva criado.
- [x] 2026-04-09 19:33Z - Ticket de reabertura registrado em `tickets/open/` com escopo alinhado a este plano.
- [x] 2026-04-09 19:52Z - Spec sincronizada com o estado local pós-implementação (`Status: attended`, `Spec treatment: pending`) enquanto o fechamento formal do ticket aguarda commit.
- [x] 2026-04-09 19:44Z - Contrato público do manifesto v2 endurecido no runner para o shape mínimo da spec.
- [x] 2026-04-09 19:44Z - Propagação correta de milestone/failure no caminho mínimo v2 concluída.
- [x] 2026-04-09 19:44Z - Vazamento de `assessment`/`dossier` removido ou isolado do branch v2.
- [x] 2026-04-09 19:48Z - Validação final concluída com testes focados e `npm run check`.
- [x] 2026-04-09 19:57Z - Fechamento formal concluído com ticket movido para `tickets/closed/` e spec recolocada em `Spec treatment: done`.

## Surprises & Discoveries
- 2026-04-09 19:25Z - Já existem tickets e execplans fechados hoje para contrato, orquestração e superfícies finais do v2, mas a revisão arquitetural confirmou gaps residuais materiais nos três eixos.
- 2026-04-09 19:25Z - A spec está marcada como `attended` / `done`, embora o repositório ainda não aceite o shape mínimo publicado nem preserve corretamente o milestone real em todos os cenários de falha.
- 2026-04-09 19:25Z - A suíte verde atual não prova o hard cut do contrato público, porque fixtures e asserts ainda aceitam shape legado e não verificam a ausência de `assessment`/`dossier` no contexto efetivo do v2.
- 2026-04-09 19:25Z - O caminho mínimo v2 já está suficientemente próximo do desenho desejado; o trabalho remanescente é de hardening contratual e operacional, não de reinvenção completa do fluxo.
- 2026-04-09 19:44Z - Ao flexibilizar `entrypoint` para o contrato público da v2, o TypeScript expôs que os reruns oficiais legados de recomposição ainda dependem de `command` e `scriptPath` completos; esse requisito precisou ficar isolado e explícito só nesses caminhos internos.

## Decision Log
- 2026-04-09 - Decisão: criar um novo ExecPlan guarda-chuva em vez de reaproveitar os três execplans fechados hoje como prova de conclusão.
  - Motivo:
    a revisão atual refutou o fechamento material de parte do trabalho e mostrou risco de falsa sensação de compatibilidade.
  - Impacto:
    os execplans fechados passam a ser histórico útil, mas não critérios de aceitação desta rodada.
- 2026-04-09 - Decisão: ordenar a execução como `reabertura honesta -> contrato público -> milestone real -> vazamento legado -> validação final`.
  - Motivo:
    compatibilizar target antes desse corte runner-side consolidaria o contrato errado.
  - Impacto:
    nenhum projeto alvo deve ser ajustado contra a v2 antes de o runner fechar essas três divergências.
- 2026-04-09 - Decisão: ajustar a spec apenas no necessário para refletir o estado real e explicitar extensões opcionais, sem alargar a spec para caber no código atual.
  - Motivo:
    o drift principal está no runner, não na intenção normativa da spec.
  - Impacto:
    a maior parte do trabalho recai no código e nos testes; a spec só recebe correções de status e clarificações pontuais.
- 2026-04-09 - Decisão: manter os caminhos legados de recomposição com requisito explícito de `entrypoint.command` + `entrypoint.scriptPath`, em vez de afrouxar silenciosamente esse contrato interno.
  - Motivo:
    o hard cut da v2 precisa reduzir o contrato público do branch diagnosis-first sem degradar guardrails dos fluxos legados ainda suportados pelo runner.
  - Impacto:
    o contrato público do manifesto v2 fica menor, enquanto os reruns oficiais opcionais falham cedo com mensagem clara se o manifesto não declarar um entrypoint completo.

## Outcomes & Retrospective
- Status final:
  concluído e fechado formalmente.
- O que funcionou:
  a revisão arquitetural isolou com clareza as três frentes que ainda impediam o fechamento real da compatibilidade;
  a normalização runner-side agora aceita o shape público mínimo da spec e mantém defaults internos só como ponte de compatibilidade;
  os testes novos provaram milestone real por estágio e ausência de vazamento legado no contexto mínimo do v2.
- O que ficou pendente:
  nenhuma pendência local runner-side permaneceu aberta ao final desta rodada.
- Próximos passos:
  usar este baseline runner-side para a próxima rodada de compatibilização dos targets aderentes à v2.

## Context and Orientation
- Arquivos principais:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/integrations/target-investigate-case-round-preparer.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/integrations/target-investigate-case-round-preparer.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Spec de origem:
  - `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- Artefatos históricos relevantes:
  - `tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`
  - `tickets/closed/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md`
  - `tickets/closed/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md`
  - `execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`
  - `execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md`
  - `execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md`
- RFs/CAs cobertos por este plano:
  - RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-13, RF-15, RF-18, RF-24, RF-25, RF-26 e RF-27.
  - CA-02, CA-04, CA-05, CA-06 e CA-07.
- Assumptions / defaults adotados:
  - a revisão arquitetural de 2026-04-09 passa a ser a referência mais fiel do estado atual do repositório;
  - o contrato público da v2 deve aceitar o shape mínimo publicado na spec sem campos extras obrigatórios descobertos apenas lendo o código;
  - `assessment` e `dossier` podem sobreviver apenas como ponte interna opcional fora do contrato mínimo do branch v2;
  - `publication` continua runner-side, conservadora e tardia;
  - nenhuma compatibilização target-side deve começar antes do hard cut runner-side.
- Fluxo atual:
  - o runner aceita o manifesto público mínimo da v2 e o normaliza internamente para compatibilidade runner-side;
  - o caminho mínimo diagnosis-first preserva o milestone real em `resolve-case`, `assemble-evidence` e `diagnosis`;
  - o contexto técnico mínimo injetado nos prompts v2 não expõe mais `assessmentPath` nem `dossierPath`;
  - o único passo restante nesta linhagem é o fechamento formal via commit, com movimentação do ticket aberto para `tickets/closed/`.
- Restrições técnicas:
  - manter o runner target-agnostic;
  - preservar fluxo sequencial;
  - não reintroduzir o prompt monolítico legado como backbone;
  - usar `apply_patch` para edições manuais;
  - manter o repositório tipado e com evidência observável de fechamento.

## Plan of Work
- Milestone 1:
  - Entregável:
    reabertura honesta da trilha, com ticket novo e spec refletindo incompatibilidade residual.
  - Evidência de conclusão:
    existe ticket em `tickets/open/` derivado desta spec/revisão; a spec deixa de aparecer como `done` durante a execução; este ExecPlan fica linkado ao ticket.
  - Arquivos esperados:
    `tickets/open/<novo-ticket>.md`, `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`, `execplans/2026-04-09-target-investigate-case-v2-spec-compatibility-closure-gap.md`.
- Milestone 2:
  - Entregável:
    contrato público do manifesto v2 alinhado ao shape mínimo da spec.
  - Evidência de conclusão:
    o runner aceita manifesto v2 literal da spec sem exigir `outputs`, `dossierPolicy`, `supportingArtifacts`, `precedence`, `roundDirectories`, `minimumPath` ou campos equivalentes como obrigatórios; `entrypoint` sem `promptPath` é aceito quando a spec permitir.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, fixtures/testes afetados.
- Milestone 3:
  - Entregável:
    falhas do caminho mínimo v2 preservam o milestone real até a superfície final do preparador.
  - Evidência de conclusão:
    erros forçados em `assemble-evidence` e `diagnosis` retornam `failedAtMilestone` e `failureKind` coerentes com o estágio real, sem colapso para `resolve-case`.
  - Arquivos esperados:
    `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, ajustes auxiliares em `src/core/target-investigate-case.test.ts` e `src/integrations/telegram-bot.test.ts` se necessário.
- Milestone 4:
  - Entregável:
    branch v2 do runner sem vazamento efetivo de `assessment`/`dossier` no contrato técnico mínimo.
  - Evidência de conclusão:
    `artifactPaths` e fatos usados pelos prompts v2 deixam de expor `assessmentPath` e `dossierPath` como parte do contexto mínimo; os tipos do branch v2 não obrigam esses campos.
  - Arquivos esperados:
    `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/codex-client.ts`, testes focados.
- Milestone 5:
  - Entregável:
    pacote de evidências técnicas que permita recolocar a spec em estado concluído sem autoengano.
  - Evidência de conclusão:
    fixtures literais da spec, testes de falha por estágio e testes de ausência de vazamento legado passam; `npm run check` fica verde; a spec pode voltar a `attended` / `done` com base em evidência nova.
  - Arquivos esperados:
    `src/core/target-investigate-case.test.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/telegram-bot.test.ts`, `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar um novo ticket em `tickets/open/` derivado da spec e desta revisão, explicitando que os execplans fechados hoje são histórico e não prova suficiente de fechamento material.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md` para `Status: in_progress` e `Spec treatment: pending`, registrando a reabertura por incompatibilidade residual runner-side.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "outputs|dossierPolicy|supportingArtifacts|precedence|roundDirectories|minimumPath|assessmentPath|dossierPath|failedAtMilestone"` em `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts` e testes focados para confirmar todos os pontos de corte antes do patch.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/target-investigate-case.ts` para separar claramente o contrato público do manifesto v2 do modelo interno normalizado do runner, tornando opcionais ou internas as extensões legadas e aceitando o shape mínimo da spec.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/target-investigate-case.ts` e `src/integrations/target-investigate-case-round-preparer.ts` para consumir o contrato público v2 sem reintroduzir obrigatoriedades legadas nem exigir `promptPath` quando a spec permitir `entrypoint` isolado.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar o `catch` externo de `src/integrations/target-investigate-case-round-preparer.ts` para preservar `TargetInvestigateCaseRoundPreparationFailureError` e manter `failedAtMilestone` / `failureKind` do estágio real.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` e `src/integrations/codex-client.ts` para que o branch v2 tenha um artifact/context set mínimo próprio, sem `assessmentPath` e `dossierPath` nos fatos de prompt do caminho mínimo.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar testes focados para incluir:
   - fixture de manifesto v2 literal da spec;
   - falha forçada em `assemble-evidence` com assert de milestone/kind;
   - falha forçada em `diagnosis` com assert de milestone/kind;
   - asserts de ausência de `assessment`/`dossier` nos fatos de prompt e no contrato mínimo v2.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Só depois da evidência nova, atualizar a spec para `Status: attended` e `Spec treatment: done`, referenciando o ticket e este ExecPlan como base observável de fechamento.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito:
    RF-05, RF-09, CA-06
  - Evidência observável:
    o runner aceita um manifesto v2 literal da spec contendo apenas `flow`, `entrypoint` global quando aplicável, `stages.resolveCase`, `stages.assembleEvidence`, `stages.diagnosis` e `publicationPolicy`, sem exigir campos extras legados como pré-requisito de aderência.
- Matriz requisito -> validação:
  - Requisito:
    RF-06, RF-07, RF-08, CA-05
  - Evidência observável:
    `resolve-case`, `assemble-evidence` e `diagnosis` continuam obrigatórios; `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` só são validados quando declarados no manifesto.
- Matriz requisito -> validação:
  - Requisito:
    RF-06, RF-13, RF-15, RF-18, CA-02, CA-04
  - Evidência observável:
    o caminho mínimo v2 conclui e falha de modo coerente por estágio, usando apenas `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`, sem colapsar falhas de estágios tardios para `resolve-case`.
- Matriz requisito -> validação:
  - Requisito:
    RF-24, RF-25, RF-26, RF-27, CA-07
  - Evidência observável:
    `artifactPaths`, fatos de prompt, summary e Telegram do branch v2 deixam de tratar `assessment`/`dossier` como parte do contrato mínimo ou da leitura operator-facing.
- Comando: `npm test -- src/integrations/target-investigate-case-round-preparer.test.ts`
  - Esperado: `exit 0`, incluindo testes explícitos que provem `failedAtMilestone = "assemble-evidence"` e `failedAtMilestone = "diagnosis"` em falhas forçadas.
- Comando: `npm test -- src/core/target-investigate-case.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: `exit 0`, incluindo fixture de manifesto literal da spec e asserts de ausência de `assessment`/`dossier` no branch v2.
- Comando: `npm run check`
  - Esperado: `exit 0`.

## Idempotence and Recovery
- Idempotência:
  - reaplicar o trabalho não deve voltar a alargar o contrato público do manifesto v2 nem recolocar `assessment`/`dossier` como parte do contexto mínimo;
  - as novas fixtures devem continuar representando o shape literal da spec, não o shape legado do código.
- Riscos:
  - o runner ainda mistura contratos legados e v2 no mesmo arquivo, principalmente em `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.ts`;
  - a remoção do vazamento legado pode afetar continuações opcionais ou publication se os limites não forem explicitados direito;
  - o status da spec pode voltar a ser fechado cedo demais se os testes novos não forem realmente observáveis.
- Recovery / Rollback:
  - se o corte do manifesto quebrar o runtime, preservar a separação entre contrato público e normalização interna, em vez de recolocar campos legados como obrigatórios no schema público;
  - se a correção do `catch` externo quebrar a superfície de erro existente, preservar o envelope tipado da falha e adaptar o branch de wrapping, em vez de voltar ao colapso em `resolve-case`;
  - se a remoção de `assessment`/`dossier` afetar publication opcional, isolar os campos legados apenas no branch opcional necessário, sem devolvê-los ao caminho mínimo v2.

## Artifacts and Notes
- Request / análise de origem:
  - revisão arquitetural local de 2026-04-09 focada em aderência do `target-investigate-case-v2` à spec diagnosis-first.
- Artefatos históricos:
  - `tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`
  - `tickets/closed/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md`
  - `tickets/closed/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md`
  - `execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md`
  - `execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md`
  - `execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md`
- Logs relevantes:
  - `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` -> `exit 0` em 2026-04-09 19:48Z, com 634 testes passando.
  - `npm run check` -> `exit 0` em 2026-04-09 19:47Z.
- Evidências esperadas nesta rodada:
  - diff do hard cut runner-side;
  - fixtures literais da spec;
  - asserts de milestone real;
  - asserts de ausência de vazamento legado;
  - `npm run check` verde depois das novas coberturas.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato público do manifesto `target-investigate-case-v2`;
  - normalização interna runner-side do manifesto;
  - contrato de falha do `target-investigate-case-round-preparer`;
  - artifact/context set injetado no `codex-client` para o branch v2;
  - testes e fixtures que hoje servem como evidência contratual do fluxo.
- Compatibilidade:
  - este plano assume hard cut do contrato público da v2;
  - compatibilidade legada, quando ainda necessária, deve ficar isolada em adaptadores internos e fora do caminho mínimo;
  - a próxima onda de compatibilização target-side depende do fechamento desta rodada runner-side.
- Dependências externas e mocks:
  - nenhuma dependência externa nova;
  - ajustes apenas em fixtures/stubs locais do runner e nos manifestos de teste do fluxo v2.
