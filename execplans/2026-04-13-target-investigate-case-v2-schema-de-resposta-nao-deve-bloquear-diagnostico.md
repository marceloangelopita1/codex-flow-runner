# ExecPlan - target-investigate-case-v2 schema de resposta não deve bloquear diagnóstico

## Purpose / Big Picture
- Objetivo: corrigir o comportamento core de `/target_investigate_case_v2` para que divergências de envelope em artefatos target-owned sejam registradas como warnings de automação, sem transformar um diagnóstico útil ou blocker explícito em `round-materialization-failed`.
- Resultado esperado: uma rodada v2 com `evidence-index.json`, `case-bundle.json` e `diagnosis.json` em envelope diferente do recomendado conclui como diagnóstico produzido com warnings quando `diagnosis.md` responde o caso, preservando os caminhos dos artefatos materializados e mantendo falha clara quando não há diagnóstico nem blocker explícito.
- Escopo: inspeção tolerante de artefatos v2, propagação de warnings no resultado core da rodada, normalização degradada para summary interno quando o envelope machine-readable não for consumível, hard gate negativo para ausência total de diagnóstico/blocker e testes focados.
- Fora de escopo da implementação core: alterar prompts do target, ajustar cwd da execução Codex, renderizar a mensagem final do Telegram, reformatar trace/timing operator-facing e publicar ticket em projeto alvo. Fora desta etapa de fechamento: commit ou push.

## Progress
- [x] 2026-04-13 15:59Z - Planejamento inicial concluído com leitura do ticket, `PLANS.md`, quality gates, spec de origem, onboarding v2, rodada real referenciada e superfícies de código/teste.
- [x] 2026-04-13 16:18Z - Implementação core concluída: inspeção tolerante dos três artefatos target-owned enumerados, fallback diagnosis-first para summary/trace, publication conservadora em automação degradada e warnings expostos no resultado core.
- [x] 2026-04-13 16:21Z - Validação focada concluída contra os closure criteria do ticket com `npm test -- src/integrations/target-investigate-case-round-preparer.test.ts src/core/target-investigate-case.test.ts` e `npm run check`.
- [x] 2026-04-13 16:24Z - Ticket movido para `tickets/closed/` no mesmo changeset da correção, com evidências de fechamento e validação manual externa registrada.

## Surprises & Discoveries
- 2026-04-13 15:59Z - A rodada real em `../guiadomus-matricula/output/case-investigation/2026-04-12T16-15-14Z/` materializou os cinco artefatos mínimos e `diagnosis.md` abriu com `Veredito: ok`, mas o runner tratou divergência de schema como falha operacional.
- 2026-04-13 15:59Z - `evidence-index.json` do target usa envelope `evidence_index_v2` com `sources[]`, sem os campos runner-side obrigatórios `bundle_artifact` e `entries`.
- 2026-04-13 15:59Z - `case-bundle.json` usa envelope `case_bundle_v2`; `diagnosis.json` tem campos úteis como `verdict`, `why`, `expected_behavior`, `observed_behavior` e `next_action`, mas diverge do schema estrito em campos como `confidence = medium_high`, ausência de `bundle_artifact`/`lineage` e nomes alternativos de evidência.
- 2026-04-13 15:59Z - Existe ticket filho aberto para superfícies operator-facing: `tickets/open/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md`. Este plano deve fornecer o dado core de warnings sem assumir a renderização de Telegram/trace.
- 2026-04-13 16:18Z - A rodada real mostrou que `diagnosis.md` pode ser humano-legível com rótulos inline (`Veredito: ok`) em vez das seções Markdown recomendadas; a execução aceitou essa superfície como fonte humana suficiente sem relaxar a enumeração machine-readable de vereditos.
- 2026-04-13 16:18Z - O script `npm test -- ...` do repositório expande para `tsx --test src/**/*.test.ts ...`; a validação focada acabou executando a suíte completa observável, com 197 testes passando na última execução observável.

## Decision Log
- 2026-04-13 - Decisão: manter preflight, execução Codex, cancelamento, segurança, versionamento e publication como hard gates.
  - Motivo: o ticket só rebaixa divergência de envelope target-owned; falhas que impedem orquestração ou cruzam fronteira de segurança continuam operacionais.
  - Impacto: `codex-execution-failed`, projeto/manifesto inválido, cancelamento e falhas de publication seguem fora da tolerância deste plano.
- 2026-04-13 - Decisão: criar uma inspeção tolerante separada da validação normalizada.
  - Motivo: schemas continuam úteis para automação, mas não podem ser o gate cego do caminho mínimo diagnosis-first.
  - Impacto: o runner passa a distinguir `schema recomendado inválido` de `artefato inexistente`, `JSON ilegível` e `diagnóstico ausente`.
- 2026-04-13 - Decisão: quando a automação estiver degradada, não atravessar publication por inferência.
  - Motivo: publication é runner-side, tardia e conservadora; envelope divergente pode bastar para ler diagnóstico, mas não para publicar ticket com segurança.
  - Impacto: a rodada pode concluir como diagnóstico produzido com warnings, mas publication automática permanece bloqueada até haver artefatos machine-readable consumíveis.
- 2026-04-13 - Decisão: este ticket expõe warnings no resultado core; o ticket filho fica dono de mensagem Telegram, trace final e timing/fase interrompida.
  - Motivo: evita duplicação de ownership e separa semântica operacional core de apresentação operator-facing.
  - Impacto: testes deste plano devem provar dados e status core; testes de bot/trace entram no ExecPlan do ticket filho.
- 2026-04-13 - Decisão: expor warnings core como `artifactInspectionWarnings` opcionais em preparation/evaluation/completed summary, sem alterar a renderização Telegram nesta etapa.
  - Motivo: preserva compatibilidade com consumidores existentes e respeita a fronteira com o ticket filho de superfícies operator-facing.
  - Impacto: o dado estruturado fica disponível para a próxima etapa, mas texto final/Telegram/trace permanecem fora do escopo deste changeset.
- 2026-04-13 - Decisão: manter ausência de `evidence-index.json` ou `case-bundle.json` como falha de materialização, e rebaixar divergência/parse/schema desses arquivos para warning quando os arquivos existem e há diagnóstico útil ou blocker explícito.
  - Motivo: o ticket fala de envelope e campos target-owned divergentes, não de pular a materialização dos artefatos mínimos de `assemble-evidence`.
  - Impacto: o caminho positivo cobre explicitamente os três membros enumerados com arquivos existentes e envelopes divergentes; artefato mínimo ausente continua operacionalmente claro.
- 2026-04-13 - Decisão: fechar formalmente o ticket nesta etapa, sem executar versionamento git.
  - Motivo: a instrução operacional atual autoriza o fechamento e delega commit/push ao runner após a resposta.
  - Impacto: o changeset fica preparado com ticket em `tickets/closed/`, evidências de GO e metadados de fechamento; o runner versionará o mesmo changeset depois.

## Outcomes & Retrospective
- Status final: GO técnico; implementação, validação local e fechamento formal do ticket concluídos para versionamento posterior pelo runner.
- O que funcionou:
  - a inspeção tolerante separou schema recomendado de gate operacional;
  - `diagnosis.md` humano ou blocker explícito agora bastam para evitar `round-materialization-failed` indevido;
  - vereditos machine-readable continuam restritos a `ok`, `not_ok` e `inconclusive`;
  - publication automática fica bloqueada quando há automação degradada.
- O que ficou pendente:
  - commit/push pelo runner após esta resposta;
  - renderização operator-facing dos warnings, já atribuída ao ticket filho.
- Próximos passos:
  - o runner deve versionar o changeset preparado, sem novo ajuste funcional neste ticket.
  - executar os tickets filhos de superfície operator-facing/Telegram/trace e contexto natural de execução no target em fluxo sequencial.

## Context and Orientation
- Ticket alvo: `tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md` (aberto originalmente em `tickets/open/`).
- ExecPlan: `execplans/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`.
- Spec de origem: `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`.
- RFs/CAs cobertos por este ticket: RF-04, RF-05, RF-17a, RF-25, RF-29, CA-03, CA-07 e CA-09, com CA-07 coberto aqui apenas no contrato de dados core usado por summary; renderização Telegram/trace fica no ticket filho.
- RNFs e restrições herdadas: reduzir custo cognitivo para leitura humana em menos de 2 minutos; manter o runner target-agnostic; manter o target como autoridade semântica; não acoplar o runner à lógica do `guiadomus-matricula`; preservar fluxo sequencial; não reintroduzir cadeias auxiliares fora de `resolve-case -> assemble-evidence -> diagnosis`.
- Assumptions/defaults adotados:
  - o caminho mínimo não exige `deep-dive`, `improvement-proposal`, `ticket-projection` nem `publication`;
  - o namespace autoritativo da rodada permanece no target em `output/case-investigation/<round-id>/`;
  - `diagnosis.md` é a principal superfície humana quando envelopes JSON divergirem;
  - `diagnosis.json`, `evidence-index.json` e `case-bundle.json` continuam recomendados para automação, mas schema divergente neles vira warning no caminho mínimo;
  - um blocker explícito target-owned pode substituir diagnóstico completo para encerrar a rodada de forma operacionalmente clara;
  - ausência total de diagnóstico útil e de blocker explícito continua falha operacional.
- Allowlists/enumerações finitas relevantes:
  - Artefatos cuja divergência de envelope deve virar warning neste ticket: `evidence-index.json`, `case-bundle.json`, `diagnosis.json`. A validação deve preservar os três membros explicitamente, em um teste positivo com os três divergentes.
  - Vereditos machine-readable aceitos quando disponíveis: `ok`, `not_ok`, `inconclusive`. Este plano não altera essa enumeração; valores fora do conjunto devem gerar warning/degradação, não virar novo valor aceito.
  - Caminho mínimo canônico: `preflight`, `resolve-case`, `assemble-evidence`, `diagnosis`. O plano não deve adicionar dependência de `deep-dive`, `ticket-projection` ou `publication`.
  - Fontes diagnósticas suficientes por ordem conservadora: `diagnosis.md` não vazio e legível, `diagnosis.json` parseável com veredito reconhecido, saída textual do estágio `diagnosis` quando capturada pelo preparer, ou blocker explícito nos artefatos target-owned. Consolidação escolhida: a validação positiva obrigatória cobre `diagnosis.md` e blocker explícito, porque são as duas superfícies observáveis pelo closure criterion; `diagnosis.json` divergente entra como warning e fonte auxiliar quando reconhecível; saída textual Codex só deve ser aceita se a implementação conseguir propagá-la sem inventar artefato target-owned. A validação negativa cobre payloads fora desse conjunto com JSON aleatório/sem diagnóstico e sem blocker, que devem falhar.
- Fronteira de ownership com tickets abertos da mesma linhagem:
  - Este plano cobre o comportamento core que impede `round-materialization-failed` indevido e expõe warnings estruturados no resultado interno.
  - `tickets/open/2026-04-13-target-investigate-case-v2-summary-deve-reportar-diagnostico-com-warnings.md` cobre texto final, Telegram, trace e correção de timing/fase interrompida.
  - `tickets/open/2026-04-13-target-investigate-case-v2-codex-deve-executar-no-contexto-do-target.md` cobre cwd/contexto natural do Codex no target.
- Arquivos principais:
  - `src/integrations/target-investigate-case-round-preparer.ts`: hoje chama `validateCanonicalArtifacts(...)` e transforma schema inválido em falha de `round-materialization`.
  - `src/core/target-investigate-case.ts`: hoje avalia `evidence-index.json`, `case-bundle.json`, `diagnosis.json` e `diagnosis.md` com leitores/schemas rígidos antes de construir summary.
  - `src/types/target-investigate-case.ts`: concentra schemas, tipos de summary/trace, failure kinds e enums de veredito/confiança.
  - `src/test-support/target-investigate-case-fixtures.ts`: gera artefatos canônicos para testes e deve ganhar opção para envelopes divergentes.
  - `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/core/target-investigate-case.test.ts`: devem cobrir o caminho positivo e negativo do closure criterion.
- Referências lidas:
  - `docs/workflows/codex-quality-gates.md`;
  - `docs/workflows/target-investigate-case-v2-target-onboarding.md`;
  - `docs/workflows/target-investigate-case-v2-target-onboarding-prompt.md`;
  - `../guiadomus-matricula/output/case-investigation/2026-04-12T16-15-14Z/{evidence-index.json,case-bundle.json,diagnosis.json,diagnosis.md}`.

## Plan of Work
- Milestone 1: inspeção tolerante e warnings de artefato.
  - Entregável: helper/type runner-side que lê os artefatos mínimos, registra `exists`, `parseableJson`, `recommendedSchemaValid`, campos reconhecidos, warnings e nível de usabilidade de automação sem lançar erro por schema divergente.
  - Evidência de conclusão: teste focado mostra warnings para `evidence-index.json`, `case-bundle.json` e `diagnosis.json` divergentes, preservando os caminhos dos arquivos.
  - Arquivos esperados: `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` ou helper local equivalente, testes focados.
- Milestone 2: materialização deixa de falhar por envelope divergente quando há diagnóstico útil.
  - Entregável: `CodexCliTargetInvestigateCaseRoundPreparer.prepareRound(...)` troca a validação rígida pós-estágio por inspeção tolerante, retorna `prepared` com warnings quando o diagnóstico humano ou blocker existir, e continua retornando `failed` para ausência total de diagnóstico/blocker.
  - Evidência de conclusão: `src/integrations/target-investigate-case-round-preparer.test.ts` prova que os três envelopes divergentes não produzem `artifact-validation-failed`, e que ausência total de diagnóstico/blocker ainda falha com mensagem clara.
  - Arquivos esperados: `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/target-investigate-case-round-preparer.test.ts`, fixtures.
- Milestone 3: avaliação core conclui com automação degradada e publication conservadora.
  - Entregável: `evaluateTargetInvestigateCaseRound(...)` consegue construir summary interno a partir de diagnóstico humano/JSON parcialmente reconhecido e warnings, sem exigir o schema recomendado de todos os artefatos target-owned; publication não é atravessada quando os artefatos necessários à automação estão degradados.
  - Evidência de conclusão: `src/core/target-investigate-case.test.ts` prova `status: completed`, ausência de `round-materialization-failed`, warnings expostos e `realizedArtifactPaths` preservando os artefatos produzidos.
  - Arquivos esperados: `src/core/target-investigate-case.ts`, `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.test.ts`.
- Milestone 4: fechamento técnico do ticket.
  - Entregável: ticket movido para `tickets/closed/` no mesmo changeset da correção, com referência ao ExecPlan e evidências de validação.
  - Evidência de conclusão: diff mostra implementação, testes e movimento do ticket, sem commit/push nesta etapa se o usuário não pedir.
  - Arquivos esperados: `tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reancorar o escopo com `sed -n '1,220p' tickets/open/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md` e `rg -n "validateCanonicalArtifacts|artifact-validation-failed|round-materialization|diagnosis\\.json|diagnosis\\.md|evidence-index|case-bundle|finalSummary" src/integrations/target-investigate-case-round-preparer.ts src/core/target-investigate-case.ts src/types/target-investigate-case.ts src/**/*.test.ts`.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar tipos/helper de inspeção tolerante em `src/types/target-investigate-case.ts` e/ou `src/core/target-investigate-case.ts`, mantendo o helper target-agnostic e limitado aos nomes canônicos dos artefatos.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/target-investigate-case-round-preparer.ts` para substituir o gate rígido de `validateCanonicalArtifacts(...)` por inspeção tolerante, acumulando warnings para schema recomendado inválido em `evidence-index.json`, `case-bundle.json` e `diagnosis.json`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/target-investigate-case.ts` para aceitar avaliação degradada quando houver diagnóstico útil ou blocker explícito, usando valores conservadores para summary interno e bloqueando publication automática quando a automação estiver degradada.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/test-support/target-investigate-case-fixtures.ts` com opções para escrever envelopes divergentes semelhantes à rodada real, sem copiar semântica específica do `guiadomus-matricula`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes positivos e negativos em `src/integrations/target-investigate-case-round-preparer.test.ts` e `src/core/target-investigate-case.test.ts` para os closure criteria.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/target-investigate-case-round-preparer.test.ts src/core/target-investigate-case.test.ts` para validar materialização e avaliação core.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para provar que a superfície tipada de warnings/resultados compila após as mudanças exigidas pelos closure criteria.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `git diff --stat` e `git diff -- src/types/target-investigate-case.ts src/core/target-investigate-case.ts src/integrations/target-investigate-case-round-preparer.ts src/test-support/target-investigate-case-fixtures.ts src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts tickets/open/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md tickets/closed/2026-04-13-target-investigate-case-v2-schema-de-resposta-nao-deve-bloquear-diagnostico.md`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Mover o ticket de `tickets/open/` para `tickets/closed/` no mesmo changeset da correção e preencher `Closure` com o ExecPlan e validações executadas. Não fazer commit/push salvo pedido explícito do usuário.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: RF-17a e CA-09 exigem que divergências de envelope em `diagnosis.json`, `evidence-index.json` ou `case-bundle.json` sejam warnings de automação, não falha operacional, quando houver diagnóstico humano suficiente.
  - Evidência observável: teste em `src/integrations/target-investigate-case-round-preparer.test.ts` escreve os três artefatos com envelopes divergentes, mais `diagnosis.md` respondendo o caso, e espera `status: "prepared"`, warnings contendo explicitamente `evidence-index.json`, `case-bundle.json` e `diagnosis.json`, sem `failureKind: "artifact-validation-failed"`.
- Matriz requisito -> validação:
  - Requisito: RF-29 e closure criterion 1 exigem que a mesma classe de divergência não produza `round-materialization-failed` quando `diagnosis.md` responde o caso.
  - Evidência observável: teste em `src/core/target-investigate-case.test.ts` executa `ControlledTargetInvestigateCaseExecutor` com artefatos divergentes e espera `status: "completed"`, `finalSummary.diagnosis.verdict` derivado de fonte reconhecida ou fallback conservador, `artifactInspectionWarnings.length > 0` e ausência de resultado `failed`.
- Matriz requisito -> validação:
  - Requisito: closure criterion 2 exige que ausência total de diagnóstico ou blocker explícito ainda falhe de forma operacional clara.
  - Evidência observável: teste negativo remove `diagnosis.md`/`diagnosis.json` e não registra blocker; espera `status: "failed"`, `failureSurface` em materialização/avaliação conforme ponto de detecção, mensagem citando ausência de diagnóstico ou blocker explícito, e `nextAction` orientando materializar diagnóstico ou blocker em vez de revisar schema.
- Matriz requisito -> validação:
  - Requisito: o conjunto finito de fontes aceitas para encerrar sem falha operacional deve preservar diagnóstico humano e blocker explícito, sem aceitar payload arbitrário como diagnóstico.
  - Evidência observável: teste positivo sem `diagnosis.md`/`diagnosis.json`, mas com blocker explícito em artefato target-owned, encerra sem `round-materialization-failed` e expõe o blocker; teste negativo com JSON parseável porém sem campos diagnósticos nem blocker falha. Se a implementação aceitar saída textual Codex, adicionar caso positivo específico para output textual do estágio `diagnosis`; se não aceitar, registrar em `Surprises & Discoveries` que essa fonte ficou fora por não haver superfície persistida segura.
- Matriz requisito -> validação:
  - Requisito: a enumeração de vereditos machine-readable continua restrita a `ok`, `not_ok` e `inconclusive`, sem transformar valores fora do conjunto em novos estados.
  - Evidência observável: teste degradado usa `diagnosis.json` com campo fora de allowlist relevante, como `confidence = medium_high` ou veredito inválido, e espera warning/degradação; quando o veredito for inválido, o summary deve usar fallback conservador de `diagnosis.md`/blocker ou `inconclusive`, nunca o valor inválido como veredito aceito.
- Matriz requisito -> validação:
  - Requisito: closure criterion 3 exige que o resultado final exponha warnings de envelope e preserve caminhos dos artefatos produzidos.
  - Evidência observável: teste core espera warnings com `artifactPath` para `evidence-index.json`, `case-bundle.json` e `diagnosis.json`, e `summary.realizedArtifactPaths` contendo os cinco artefatos mínimos materializados quando existirem.
- Matriz requisito -> validação:
  - Requisito: RF-04 e RF-05 exigem runner target-agnostic e target como autoridade semântica.
  - Evidência observável: revisão do diff confirma que a inspeção usa apenas nomes canônicos, validade JSON, campos recomendados e blockers explícitos, sem strings, scripts, paths ou semântica específicos do `guiadomus-matricula`.
- Matriz requisito -> validação:
  - Requisito: RF-25 exige que o caminho mínimo não dependa de cadeias auxiliares fora de `resolve-case -> assemble-evidence -> diagnosis`.
  - Evidência observável: testes existentes e novos mantêm milestones `preflight`, `resolve-case`, `assemble-evidence`, `diagnosis`; nenhum teste positivo exige `deep-dive`, `ticket-projection` ou `publication`.
- Matriz requisito -> validação:
  - Requisito: CA-03 exige que `diagnosis.md` responda o caso de forma humana; CA-07 fica limitado neste plano ao dado core diagnosis-first.
  - Evidência observável: fixture positiva contém `diagnosis.md` com veredito e próxima ação; teste core usa esse documento como fonte primária quando JSON está degradado e expõe caminho de `diagnosis.md` no resultado. A renderização Telegram/trace de CA-07 fica no ticket filho.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/target-investigate-case-round-preparer.test.ts src/core/target-investigate-case.test.ts`
  - Esperado: testes focados passam e cobrem os casos positivos/negativos acima.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: TypeScript compila a nova superfície de warnings/resultados sem erro.

## Idempotence and Recovery
- Idempotência: a inspeção deve ser pura e derivada dos artefatos já existentes; rerodar a mesma rodada não deve sobrescrever artefatos target-owned nem transformar warnings em erros acumulativos.
- Riscos:
  - normalização degradada pode mascarar ausência real de diagnóstico se a detecção de fonte útil for permissiva demais;
  - adicionar warnings a tipos compartilhados pode exigir ajustes em consumers existentes;
  - tolerar JSON parseável porém semanticamente pobre pode confundir publication se ela não for explicitamente bloqueada em modo degradado.
- Recovery / Rollback:
  - se a nova superfície tipada se espalhar demais, manter `artifactInspectionWarnings` no resultado core mais próximo do executor e deixar renderização para o ticket filho;
  - se a detecção de diagnóstico textual ficar ambígua, reduzir o aceite automático para `diagnosis.md` legível ou blocker explícito e registrar follow-up para Codex-output-only;
  - se publication tentar atravessar com automação degradada, adicionar gate conservador local que force `publication_status = not_eligible` ou equivalente sem publicar ticket.

## Artifacts and Notes
- PR/Diff: mesmo changeset de fechamento versionado pelo runner, sem hash local nesta etapa.
- Logs relevantes: rodada real referenciada pelo ticket em `../guiadomus-matricula/output/case-investigation/2026-04-12T16-15-14Z/`.
- Evidências de teste esperadas:
  - `npm test -- src/integrations/target-investigate-case-round-preparer.test.ts src/core/target-investigate-case.test.ts`;
  - `npm run check`.
- Nota sobre dados reais: usar a rodada real apenas para modelar divergência genérica de envelope; não copiar semântica de domínio ou valores específicos para o runner.

## Interfaces and Dependencies
- Interfaces alteradas:
  - provável extensão de `TargetInvestigateCaseRoundPreparationResult` e/ou `TargetInvestigateCaseCompletedSummary` com warnings de inspeção;
  - possível novo tipo `TargetInvestigateCaseArtifactInspectionWarning` com `artifactPath`, `artifactLabel`, `kind`, `message` e `automationUsability`;
  - possível helper de avaliação degradada para `TargetInvestigateCaseFinalSummary`.
- Compatibilidade:
  - schemas recomendados continuam existindo para automações;
  - divergência de schema vira warning somente no caminho mínimo diagnosis-first com diagnóstico útil ou blocker explícito;
  - falhas de preflight, manifesto, execução Codex, cancelamento, segurança, versionamento e publication permanecem hard gates.
- Dependências externas e mocks:
  - sem novas dependências npm;
  - fixtures locais devem simular envelopes divergentes com objetos JSON genéricos;
  - não executar comandos no target real nem depender de `../guiadomus-matricula` para os testes automatizados.
