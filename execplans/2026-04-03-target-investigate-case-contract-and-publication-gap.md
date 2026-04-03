# ExecPlan - Contratualizar manifesto, artefatos e publication do /target_investigate_case

## Purpose / Big Picture
- Objetivo: materializar o contrato canonico do fluxo `case-investigation` no runner, cobrindo manifesto machine-readable, validacao dos artefatos da investigacao, tabela explicita de combinacoes validas, gates mecanicos de publication, trace minimizado e resumo final seguro.
- Resultado esperado:
  - `docs/workflows/target-case-investigation-manifest.json` existe como caminho canonico fixo e o runner o descobre sem heuristica, aceitando apenas a capability `case-investigation`;
  - o runner valida `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json` com enums finitos explicitos, rejeicao fora do conjunto e matriz codificada de combinacoes validas;
  - a decisao final de publication/no-op usa apenas gates mecanicos, anti-overfit, policy e limites de capability, sem segundo julgamento semantico de dominio;
  - sem ticket, a publication termina em no-op local e sem write-back versionado por default; com ticket elegivel, o unico artefato versionado por default e o ticket;
  - traces e resumo final preservam apenas seletores normalizados, refs, paths, hashes, contagens, vereditos, decisao final e proxima acao, sem copiar `workflow_debug`, `db_payload`, transcript ou payload bruto.
- Escopo:
  - contrato e schema versionado da capability `case-investigation` no runner;
  - validadores e normalizadores dos artefatos e dos seletores canonicos de entrada;
  - tabela de combinacoes validas entre vereditos semanticos, `publication_status` e `overall_outcome`;
  - engine runner-side de publication/no-op, thresholds e vetos anti-overfit;
  - summary/traces minimizados e testes automatizados/manual-validation herdados do ticket.
- Fora de escopo:
  - comandos `/target_investigate_case`, `/_status`, `/_cancel`, milestones visiveis, slot por projeto e cancelamento cooperativo, que pertencem ao ticket `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`;
  - manifesto concreto, replay/purge do piloto e bloco `## Investigacao Causal` no `../guiadomus-matricula`, que pertencem ao ticket `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md`;
  - qualquer reinterpretacao semantica do dominio do caso pelo runner;
  - versionamento de dossier, bundle bruto, transcript, `workflow_debug`, `db_payload` ou payloads sensiveis.

## Progress
- [x] 2026-04-03 16:41Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, do contrato de compatibilidade do projeto alvo, dos tickets irmaos e das superficies atuais de `target-flow`, `state`, `flow-timing`, `target-checkup`, `target-derive`, `runner`, `telegram-bot`, `codex-client` e `workflow-trace-store`.
- [x] 2026-04-03 17:10Z - Contrato `case-investigation`, manifesto canonico e validadores dos artefatos foram implementados em `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` e `docs/workflows/target-case-investigation-manifest.json`, com cobertura positiva/negativa dos enums finitos em `src/core/target-investigate-case.test.ts`.
- [x] 2026-04-03 17:10Z - Engine runner-side de publication/no-op, thresholds, matriz canonica de combinacoes validas e helpers sanitizados de summary/trace ficaram implementados em modulo dedicado, sem criar um control-plane paralelo nem tocar `runner.ts`/`telegram-bot.ts` fora da fronteira declarada.
- [ ] 2026-04-03 17:10Z - Wiring do fluxo novo em `runner.ts`/`telegram-bot.ts`/`workflow-trace-store.ts` e a validacao manual redigida do trace minimizado permanecem bloqueados neste branch porque o scaffold de `/target_investigate_case` ainda nao existe e pertence explicitamente ao ticket irmao `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`.
- [x] 2026-04-03 17:15Z - Revisao final do plano concluiu `NO_GO` para este ticket: o contrato runner-side e a cobertura local do modulo novo foram entregues, mas os closure criteria de wiring real e validacao final permaneceram bloqueados e foram transferidos para o follow-up `tickets/open/2026-04-03-target-investigate-case-contract-package-wiring-gap.md`.

## Surprises & Discoveries
- 2026-04-03 16:41Z - A infraestrutura atual de target flows conhece apenas `target-prepare`, `target-checkup` e `target-derive`; este plano nao pode presumir que o scaffold de `target-investigate-case` ja exista em `src/types/target-flow.ts`, `src/types/state.ts`, `src/types/flow-timing.ts`, `src/core/runner.ts` ou `src/integrations/telegram-bot.ts`.
- 2026-04-03 16:41Z - `src/integrations/workflow-trace-store.ts` persiste `inputs` e `aiExchanges` genericamente; a garantia de ausencia de material sensivel depende de sanitizar o que o runner passa ao store, nao de um filtro posterior no proprio store.
- 2026-04-03 16:41Z - `src/core/target-checkup.ts` valida `target-prepare-manifest.json` com `JSON.parse` e checks ad hoc; para este ticket, com multiplos enums finitos e combinacoes validas, o caminho mais seguro e centralizar schema/normalizacao em modulo dedicado e usar a dependencia ja existente `zod`.
- 2026-04-03 16:41Z - Os tickets irmaos compartilham arquivos como `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `src/types/flow-timing.ts`; a execucao deste plano precisa ser sequencial e preservar fronteira de ownership para evitar `duplication-gap` e `closure-criteria-gap`.
- 2026-04-03 17:10Z - O branch continua sem qualquer handler, tipo de flow, milestone publica ou resumo final wired para `/target_investigate_case`; sem esse scaffold, qualquer tentativa de editar `runner.ts`/`telegram-bot.ts` para este fluxo exigiria inventar uma superficie paralela, o que o proprio plano veta.
- 2026-04-03 17:10Z - `git diff --name-only` ficou vazio porque todo o changeset desta execucao ainda esta como arquivo novo nao versionado; para revisar fronteira de ownership de forma observavel neste estado, foi necessario complementar com `git status --short`.

## Decision Log
- 2026-04-03 - Decisao: centralizar constantes, enums finitos, schemas `zod`, normalizacao de seletores e a tabela de combinacoes validas em `src/types/target-investigate-case.ts`, com helpers reutilizados pelo executor e pelas superficies de summary/trace.
  - Motivo: o ticket exige cobertura positiva dos membros aceitos e negativa fora do conjunto; espalhar validacoes em varios arquivos aumentaria o risco de drift.
  - Impacto: o modulo novo vira source of truth da capability `case-investigation`, dos artefatos estaveis e dos gates mecanicos.
- 2026-04-03 - Decisao: tratar `assessment.json` como autoridade semantica primaria e limitar o runner a consistencia contratual, thresholds, anti-overfit, policy, capability e publication.
  - Motivo: RF-19 e o ticket vetam um segundo julgamento semantico de dominio.
  - Impacto: a implementacao deve rejeitar payload incoerente ou incompleto, mas nao "corrigir" ou reinterpretar vereditos do projeto alvo.
- 2026-04-03 - Decisao: implementar a sanitizacao antes da persistencia/renderizacao, em helpers usados por `runner`/`telegram`, em vez de tentar redigir payloads apos gravacao do trace.
  - Motivo: o `workflow-trace-store` atual e agnostico ao conteudo e persistiria qualquer JSON recebido.
  - Impacto: testes negativos contra `workflow_debug`, `db_payload`, transcript e payload bruto passam a ser obrigatorios no runner, no Telegram e no trace store.
- 2026-04-03 - Decisao: manter comandos, status/cancel, ambiguidade por projeto e milestones publicos sob ownership do ticket irmao de control-plane; este plano so deve tocar essas superficies quando for necessario plugar o contrato final, o summary e o trace sanitizado.
  - Motivo: a spec ja particionou explicitamente a superficie operacional.
  - Impacto: a validacao manual end-to-end do resumo final depende de o scaffold de control-plane estar disponivel no branch ou ser aterrado imediatamente antes desta execucao.
- 2026-04-03 - Decisao: implementar o caminho positivo de publication atraves de `TargetInvestigateCaseTicketPublisher` injetavel, sem commit/push e sem acoplar este ticket a um renderer especulativo de ticket no projeto alvo.
  - Motivo: a etapa atual proibe commit/push e o control-plane ainda nao existe; ainda assim, o ticket exige prova observavel do caminho `eligible -> ticket-published`.
  - Impacto: os testes conseguem materializar publication positiva em fixture local, enquanto o wiring real do publisher fica para a superficie operacional do fluxo.
- 2026-04-03 - Decisao: aterrar summary e trace minimizados como helpers puros em `src/core/target-investigate-case.ts` e registrar blocker explicito para o wiring no `runner`/Telegram.
  - Motivo: o plano veta criar handler paralelo quando o control-plane irmao ainda nao aterrou no branch.
  - Impacto: o contrato runner-side fica pronto e testado agora, mas a validacao manual de Telegram/trace final permanece pendente do ticket irmao.

## Outcomes & Retrospective
- Status final: execucao runner-side parcial concluida; wiring no control-plane e validacao manual final bloqueados por dependencia explicita do ticket irmao.
- O que precisa existir ao final:
  - manifesto canonico `docs/workflows/target-case-investigation-manifest.json`;
  - tipos/schemas/normalizadores para `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json`;
  - tabela unica de combinacoes validas entre vereditos semanticos, `publication_status` e `overall_outcome`, com thresholds e vetos anti-overfit observaveis;
  - caminho positivo de publication com criacao de ticket e `versioned_artifact_paths` restrito ao ticket;
  - caminho negativo/no-op com `publication` concluida sem write-back versionado por default;
  - summary final e trace minimizados, com validacao manual redigida em rodada ou fixture representativa.
- O que fica pendente fora deste plano:
  - registro dos comandos publicos, slot pesado por projeto, `/status`, `/cancel` e milestones publicos;
  - capability concreta do piloto `../guiadomus-matricula`, incluindo replay/purge e template do ticket causal;
  - qualquer mudanca em prompts ou instrucoes de runtime do projeto alvo.
- Proximos passos:
  - reabrir ticket, spec e tickets irmaos antes de editar codigo;
  - executar Milestone 1 a 4 em ordem;
  - se o scaffold do control-plane nao estiver no branch quando a validacao manual for necessaria, registrar blocker explicito em vez de improvisar uma superficie paralela.

## Context and Orientation
- Ticket de origem:
  - `tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
- Spec de origem:
  - `docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md`
- Documentos e referencias relidos para este plano:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`
  - `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md`
  - `execplans/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`
- Superficies de codigo atuais mais relevantes:
  - `src/types/target-flow.ts`
  - `src/types/state.ts`
  - `src/types/flow-timing.ts`
  - `src/types/target-prepare.ts`
  - `src/types/target-checkup.ts`
  - `src/types/target-derive.ts`
  - `src/core/target-checkup.ts`
  - `src/core/target-derive.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `tickets/templates/internal-ticket-template.md`
- RFs/CAs cobertos por este plano:
  - RF-03, RF-04, RF-05;
  - RF-06, RF-07, RF-08, RF-09;
  - RF-13, RF-14, RF-15, RF-16, RF-17, RF-18;
  - RF-19 ate RF-35;
  - RF-37, RF-38, RF-39, RF-40, RF-41;
  - CA-02, CA-03, CA-04, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-13, CA-14, CA-15.
- RNFs e restricoes herdados que condicionam implementacao e aceite:
  - coleta de evidencia deterministica e guiada pelo manifesto;
  - anti-overfit explicito e auditavel;
  - trace minimo, sem material sensivel;
  - fluxo sequencial;
  - sem descoberta livre de logs, tabelas, buckets, comandos ou fontes de evidencia;
  - o runner nao pode fazer segundo julgamento semantico de dominio;
  - sem ticket nao ha write-back versionado por default;
  - o artefato versionado padrao de v1 continua sendo apenas o ticket quando houver publication elegivel.
- Assumptions / defaults adotados:
  - a capability investigativa do runner sera representada por um modulo dedicado (`src/types/target-investigate-case.ts`) e nao por extensoes pontuais em `target-checkup`;
  - o caminho canonico do manifesto e fixo: `docs/workflows/target-case-investigation-manifest.json`;
  - `assessment.json` e a fonte autoritativa dos vereditos semanticos; `publication-decision.json` continua sendo a decisao final do runner;
  - a normalizacao dos seletores canonicos (`case-ref`, `workflow`, `request-id`, `window`, `symptom`) pertence a este ticket, mas o registro dos comandos e o controle conversacional continuam no ticket irmao de control-plane;
  - nenhuma consolidacao sera usada para os enums finitos deste plano; cada membro aceito listado abaixo deve ter cobertura positiva e cobertura negativa fora do conjunto;
  - a dependencia `zod` ja presente no repositorio deve ser reutilizada; nenhuma dependencia nova e necessaria.
- Allowlists / enums finitos herdados sem consolidacao:
  - capability aceita: `case-investigation`
  - manifesto canonico aceito: `docs/workflows/target-case-investigation-manifest.json`
  - seletores canonicos aceitos: `case-ref`, `workflow`, `request-id`, `window`, `symptom`
  - `houve_gap_real`: `yes | no | inconclusive`
  - `era_evitavel_internamente`: `yes | no | inconclusive | not_applicable`
  - `merece_ticket_generalizavel`: `yes | no | inconclusive | not_applicable`
  - `confidence`: `low | medium | high`
  - `evidence_sufficiency`: `insufficient | partial | sufficient | strong`
  - `publication_recommendation.recommended_action`: `publish_ticket | do_not_publish | inconclusive`
  - `publication_status`: `eligible | not_eligible | blocked_by_policy | not_applicable`
  - `overall_outcome`: `no-real-gap | real-gap-not-internally-avoidable | real-gap-not-generalizable | inconclusive-case | inconclusive-project-capability-gap | runner-limitation | ticket-published | ticket-eligible-but-blocked-by-policy`
- Fronteira de ownership com tickets irmaos:
  - este plano cobre contrato, validadores, tabelas de combinacao, gates mecanicos, publication, trace minimo e resumo final;
  - `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md` cobre comandos, status/cancel, slot por projeto, milestones publicos e lifecycle do fluxo;
  - `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md` cobre manifesto concreto do piloto, replay/purge do piloto e template `## Investigacao Causal` no repo alvo externo.
- Fluxo atual relevante:
  - `src/core/target-checkup.ts` ja oferece precedente para manifesto em caminho canonico e artefato `.json + .md`;
  - `src/core/target-derive.ts` ja oferece precedente para no-op idempotente, criacao de ticket e restricao de artefatos versionados;
  - `src/core/runner.ts` e `src/integrations/telegram-bot.ts` constroem summaries finais a partir dos summary types;
  - `src/integrations/workflow-trace-store.ts` grava o trace final do flow target sem schema proprio do conteudo.

## Plan of Work
- Milestone 1: formalizar o contrato canonico da capability e dos artefatos.
  - Entregavel: modulo dedicado com constantes, enums finitos, schemas `zod`, normalizadores de seletores, helper de tabela de combinacoes validas e o manifesto `docs/workflows/target-case-investigation-manifest.json`.
  - Evidencia de conclusao: testes cobrem manifesto valido, manifesto ausente, JSON invalido, capability diferente de `case-investigation`, seletores canonicos validos e rejeicao de valores fora dos enums aceitos.
  - Arquivos esperados:
    - `docs/workflows/target-case-investigation-manifest.json`
    - `src/types/target-investigate-case.ts`
    - `src/core/target-investigate-case.ts`
    - `src/core/target-investigate-case.test.ts`
- Milestone 2: implementar a leitura dos artefatos e os gates mecanicos de publication.
  - Entregavel: executor/helper runner-side que valida `case-resolution.json`, `evidence-bundle.json`, `assessment.json` e emite `publication-decision.json` com thresholds, vetos anti-overfit, `next_action`, `ticket_path` e `versioned_artifact_paths` restrito ao ticket.
  - Evidencia de conclusao: testes tornam observaveis o caminho `eligible -> ticket-published`, o caminho `eligible -> blocked_by_policy`, os caminhos no-op locais, `runner-limitation`, conflito contratual e rejeicao de combinacoes invalidas ou payloads incompletos.
  - Arquivos esperados:
    - `src/core/target-investigate-case.ts`
    - `src/core/target-investigate-case.test.ts`
    - `tickets/templates/internal-ticket-template.md` apenas se o renderer do ticket atual exigir ajuste runner-side minimo e genrico
- Milestone 3: endurecer trace e resumo final sem duplicar o control-plane.
  - Entregavel: payload sanitizado para trace, summary final com os campos minimos obrigatorios e cobertura negativa para ausencia de material sensivel.
  - Evidencia de conclusao: testes em `runner`, `telegram` e `workflow-trace-store` comprovam a presenca dos campos obrigatorios e a ausencia de `workflow_debug`, `db_payload`, transcript e payloads brutos.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/workflow-trace-store.ts` ou helper adjacente, se for necessario tipar/sanitizar melhor o payload de trace
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `src/integrations/workflow-trace-store.test.ts`
- Milestone 4: fechar a validacao observavel e a fronteira com tickets irmaos.
  - Entregavel: suite automatizada verde, validacao manual redigida do trace minimizado e revisao objetiva do diff para confirmar a fronteira de ownership.
  - Evidencia de conclusao: comandos do plano passam, a validacao manual cita uma rodada ou fixture representativa com resultado explicito e o diff nao toca `../guiadomus-matricula/**`.
  - Arquivos esperados:
    - `src/core/target-investigate-case.test.ts`
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `src/integrations/workflow-trace-store.test.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "target-investigate-case|case-investigation|publication-decision|assessment.json|case-resolution|evidence-bundle" src docs tickets/open` para confirmar o estado real do branch e verificar se o ticket irmao de control-plane ja aterrou algum scaffold que este plano precise reutilizar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir com `sed -n '1,260p'` o ticket atual, a spec de origem, os dois tickets irmaos, `src/types/target-flow.ts`, `src/types/state.ts`, `src/types/flow-timing.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `src/integrations/workflow-trace-store.ts` antes de editar, para confirmar a fronteira de ownership no estado atual.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/types/target-investigate-case.ts` e `docs/workflows/target-case-investigation-manifest.json` para definir:
   - versoes de contrato e schema;
   - capability fixa `case-investigation`;
   - seletores canonicos aceitos (`case-ref`, `workflow`, `request-id`, `window`, `symptom`);
   - schemas `zod` de `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json`;
   - enums finitos herdados do ticket/spec;
   - helper unico da tabela de combinacoes validas entre vereditos, `publication_status` e `overall_outcome`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar ou criar `src/core/target-investigate-case.ts` para carregar o manifesto pelo caminho canonico sem heuristica, validar capability, normalizar seletores, ler os artefatos estaveis da rodada e construir `publication-decision.json` sem reinterpretar semanticamente o dominio.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) No mesmo modulo ou em helper dedicado reutilizado por ele, codificar explicitamente:
   - thresholds de `evidence_sufficiency`;
   - exigencia de `generalization_basis[]` quando houver publication positiva;
   - veto por `overfit_vetoes[]` bloqueante;
   - mapeamentos aceitos de `recommended_action` para `publication_status` e `overall_outcome`;
   - caminhos especiais `inconclusive-case`, `inconclusive-project-capability-gap`, `runner-limitation`, `ticket-eligible-but-blocked-by-policy` e `ticket-published`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reutilizar apenas as partes mecanicas existentes de `GitVersioning`, `TargetProjectResolver`, renderer de ticket interno e helpers de `target-derive`; se algum helper atual misturar semantica que pertence ao projeto alvo, extrair somente a parte neutra em vez de copiar a logica inteira.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Integrar o contrato final aos summaries e traces ja expostos pelo fluxo, limitando as edicoes compartilhadas a:
   - tipos/summaries finais em `src/types/flow-timing.ts`;
   - serializacao sanitizada em `src/core/runner.ts`;
   - renderizacao do resumo final em `src/integrations/telegram-bot.ts`;
   - eventuais ajustes em `src/integrations/workflow-trace-store.ts` apenas se um helper de sanitizacao ou shape mais estrito for necessario.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se o handler/UX guiada de `/target_investigate_case` ja existir no branch, substituir qualquer parsing ad hoc por um normalizador compartilhado que converja para `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`; se o handler ainda nao existir, parar com blocker explicito e nao criar uma superficie paralela fora do ticket de control-plane.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Escrever/atualizar testes em:
   - `src/core/target-investigate-case.test.ts` para manifesto, schemas, enums, combinacoes validas, thresholds, no-op local, bloqueio por policy e publication positiva com ticket;
   - `src/core/runner.test.ts` para summary/traces do fluxo;
   - `src/integrations/telegram-bot.test.ts` para o resumo final minimo e redigido;
   - `src/integrations/workflow-trace-store.test.ts` para persistencia sem payload sensivel.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts` para validar os closure criteria automatizados do ticket.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` como guardrail tipado complementar apos o wiring final, sem usar typecheck como aceite funcional principal.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Quando o control-plane irmao ja estiver disponivel no branch, rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`, executar uma rodada representativa de `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]` via Telegram e inspecionar com `find .codex-flow-runner/flow-traces/target-flows -type f | sort | tail -n 1` e `sed -n '1,240p' <trace-file>` o trace final, alem de `sed -n '1,240p' <publication-decision-path>`, para registrar a validacao manual redigida do trace minimizado.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff --name-only` e revisar objetivamente os caminhos alterados para confirmar que este ticket nao tocou `../guiadomus-matricula/**`, nao duplicou ownership do template causal do piloto e nao criou um control-plane paralelo fora do ticket irmao.

## Validation and Acceptance
- Regra de cobertura para allowlists/enums finitos: nenhuma consolidacao esta autorizada neste plano. Cada conjunto explicito listado em `Context and Orientation` precisa de cobertura positiva para todos os membros aceitos e cobertura negativa fora do conjunto.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-03, RF-04, RF-05, CA-02.
    - Evidencia observavel: `docs/workflows/target-case-investigation-manifest.json` existe, e o loader aceita apenas o caminho canonico e a capability `case-investigation`; testes cobrem manifesto valido, manifesto ausente, JSON invalido e capability divergente.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts`
    - Esperado: a suite passa com um caso positivo para o manifesto canonico e falha observavelmente para arquivo ausente, JSON invalido e capability diferente de `case-investigation`, sem heuristica de busca em outros caminhos.
  - Requisito: RF-06, RF-07, RF-08, RF-09, RF-13, RF-14, RF-15, RF-16, CA-03, CA-04, CA-06.
    - Evidencia observavel: o normalizador aceita apenas a forma canonica `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`; `case-resolution.json` e o trace local registram apenas `case-ref` e seletores opcionais ja normalizados; `assessment.json` aceita exatamente `houve_gap_real=yes|no|inconclusive`, `era_evitavel_internamente=yes|no|inconclusive|not_applicable`, `merece_ticket_generalizavel=yes|no|inconclusive|not_applicable`, `confidence=low|medium|high`, `evidence_sufficiency=insufficient|partial|sufficient|strong` e `publication_recommendation.recommended_action=publish_ticket|do_not_publish|inconclusive`, rejeitando valores fora do conjunto.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts`
    - Esperado: a suite cobre cada membro aceito dos enums acima, rejeita membros fora do conjunto, confirma a ausencia de escolha silenciosa de tentativa e torna observavel a normalizacao identica entre comando canonico e UX guiada quando essa UX ja estiver disponivel no branch.
  - Requisito: RF-17, RF-18, CA-07, CA-10.
    - Evidencia observavel: `publication-decision.json` aceita exatamente `publication_status=eligible|not_eligible|blocked_by_policy|not_applicable` e `overall_outcome=no-real-gap|real-gap-not-internally-avoidable|real-gap-not-generalizable|inconclusive-case|inconclusive-project-capability-gap|runner-limitation|ticket-published|ticket-eligible-but-blocked-by-policy`; a tabela de combinacoes validas entre os tres vereditos semanticos, `publication_status` e `overall_outcome` fica codificada em uma fonte unica com casos positivos e negativos.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts`
    - Esperado: os testes percorrem os membros aceitos de `publication_status` e `overall_outcome`, aprovam apenas tuplas validas da tabela e rejeitam combinacoes invalidas, campos ausentes, `causal_surface` ausente, `generalization_basis[]` obrigatoria ausente e vetos bloqueantes.
  - Requisito: RF-19 ate RF-35, CA-08, CA-09, CA-13, CA-14.
    - Evidencia observavel: o runner aplica apenas consistencia contratual, thresholds, precedence, capability, anti-overfit e policy; nao reinterpreta dominio; `runner-limitation` nunca publica ticket; casos no-op concluem `publication` sem write-back versionado; o caminho positivo de publication cria ticket, preenche `ticket_path` e mantem `versioned_artifact_paths` restrito ao ticket; `evidence_sufficiency=strong` funciona como barra default, e `sufficient` so passa quando houver conflito contratual/guardrail inequivoco, `generalization_basis[]` explicita e zero veto bloqueante.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts`
    - Esperado: a suite cobre publication positiva, `blocked_by_policy`, `not_applicable`, `runner-limitation`, `inconclusive-case`, `inconclusive-project-capability-gap`, conflito contratual explicito e confirma que o runner apenas valida e decide mecanicamente, sem sobrescrever os vereditos semanticos recebidos.
  - Requisito: RF-37, RF-38, RF-39, RF-40, RF-41, CA-11, CA-15, validacao manual herdada do trace minimizado.
    - Evidencia observavel: traces e resumo final carregam somente seletores normalizados, refs, paths, hashes, contagens, vereditos, decisao final, proxima acao e caminho do dossier local; o resumo final inclui `case-ref`, tentativa resolvida ou ausencia explicita, replay usado ou nao, os tres vereditos, `confidence`, `evidence_sufficiency`, `causal_surface`, decisao final, razao curta, caminho do dossier local, `ticket_path` quando houver e proxima acao; testes e a validacao manual comprovam ausencia de transcript, `workflow_debug`, `db_payload` e payload bruto.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts`
    - Esperado: as suites automatizadas aprovam a presenca do conjunto minimo de campos e a ausencia dos campos proibidos; a validacao manual redigida cita a rodada ou fixture avaliada, o resultado da auditoria do trace, o conteudo redigido observado no resumo final e qualquer ajuste necessario antes do fechamento.
  - Requisito: fronteira de ownership do pacote derivado.
    - Evidencia observavel: o diff final deste ticket fica restrito a contrato, gates mecanicos, publication, summary/trace minimizados e testes runner-side; nao toca `../guiadomus-matricula/**` nem cria um control-plane paralelo.
    - Comando: `git diff --name-only`
    - Esperado: a revisao de caminhos confirma ausencia de alteracoes em `../guiadomus-matricula/**`, ausencia de template causal do piloto neste changeset e ausencia de duplicacao editorial/funcional dos closure criteria do ticket irmao de control-plane.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a validacao sobre o mesmo conjunto de artefatos validos deve produzir o mesmo `publication-decision.json`, os mesmos vereditos finais e o mesmo `ticket_path` quando ja houver publication realizada, sem duplicar ticket;
  - o loader do manifesto e o normalizador de seletores devem ser deterministas e sem heuristica;
  - a tabela de combinacoes validas deve ser derivada de uma fonte unica e imutavel por rodada, evitando divergencia entre runtime e testes.
- Riscos:
  - conflito de merge/ownership com o ticket irmao de control-plane nos arquivos `runner.ts`, `telegram-bot.ts` e `flow-timing.ts`;
  - vazamento involuntario de payload sensivel se a sanitizacao ficar espalhada ou depender de disciplina manual;
  - duplicacao de ticket na publication positiva se a recuperacao de `ticket_path` nao for tratada de forma deterministica.
- Recovery / Rollback:
  - se a rodada falhar antes da fronteira de versionamento, descartar `publication-decision.json` local e rerodar a partir dos mesmos artefatos normalizados, sem ticket publicado;
  - se falhar depois de o ticket ter sido criado, usar `ticket_path` e o estado versionado como source of truth para retomar/reparar, em vez de tentar republicar;
  - se um teste detectar `workflow_debug`, `db_payload`, transcript ou payload bruto no trace, parar a execucao e corrigir a sanitizacao antes de qualquer rodada manual adicional;
  - se o scaffold de control-plane ainda nao existir quando este plano precisar validar resumo final/Telegram, registrar blocker explicito e interromper a rodada em vez de criar um handler paralelo.

## Artifacts and Notes
- Artefatos principais esperados ao final:
  - `docs/workflows/target-case-investigation-manifest.json`
  - `case-resolution.json`
  - `evidence-bundle.json`
  - `assessment.json`
  - `publication-decision.json`
  - `dossier.md` ou `dossier.json`
  - trace minimizado em `.codex-flow-runner/flow-traces/target-flows/*.json`
  - ticket em `tickets/open/` apenas quando `publication_status=eligible`
- Notas de aceite obrigatorias:
  - registrar no fechamento do ticket uma validacao manual redigida com a execucao ou fixture avaliada, o resultado observado para o trace minimizado, o resumo final observado e os ajustes feitos antes do fechamento;
  - se a validacao depender do control-plane irmao, citar explicitamente a dependencia e o commit/branch usado.
- Evidencias de diff e testes:
  - suites automatizadas listadas em `Validation and Acceptance`;
  - `git diff --name-only` para checar a fronteira de ownership;
  - `find .codex-flow-runner/flow-traces/target-flows -type f | sort | tail -n 1` e `sed -n '1,240p' <trace-file>` para a auditoria manual final.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato canonico do manifesto: `docs/workflows/target-case-investigation-manifest.json`
  - modulo de tipos/schemas: `src/types/target-investigate-case.ts`
  - executor/helper runner-side de contract/publication: `src/core/target-investigate-case.ts`
  - summary types e metadados finais do fluxo: `src/types/flow-timing.ts`
  - serializacao de trace/summaries: `src/core/runner.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/workflow-trace-store.ts` ou helper adjacente
- Compatibilidade:
  - o fluxo deve continuar separado semanticamente de `target_checkup`;
  - descoberta de manifesto permanece deterministica e sem heuristica;
  - por default nao pode haver write-back versionado sem ticket;
  - o unico artefato versionado padrao de v1 em publication positiva continua sendo o ticket.
- Dependencias externas e mocks:
  - `zod` ja existe em `package.json` e deve ser reutilizado para schema/normalizacao;
  - a publication positiva pode reutilizar o template interno atual em `tickets/templates/internal-ticket-template.md`, sem introduzir template novo neste ticket;
  - a validacao manual end-to-end do resumo final depende de o ticket `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md` ja ter aterrado o comando/surface do fluxo no branch;
  - a validacao real em projeto externo depende do ticket `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md` para disponibilizar a capability concreta no piloto.
