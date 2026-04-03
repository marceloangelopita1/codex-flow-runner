# ExecPlan - Introduzir a superfície operacional do /target_investigate_case no runner

## Purpose / Big Picture
- Objetivo: promover `target-investigate-case` a fluxo target de primeira classe no runner, com comando público dedicado, slot pesado por projeto, milestones canônicos, `/_status`, `/_cancel`, trace local, resumo final e ciclo local de artefatos coerentes com a spec.
- Resultado esperado:
  - `src/types/target-flow.ts`, `src/types/state.ts` e `src/types/flow-timing.ts` passam a modelar `target-investigate-case` como quarto target flow oficial, com os comandos exatos `/target_investigate_case`, `/target_investigate_case_status` e `/target_investigate_case_cancel`;
  - o runner expõe request, status, cancelamento, concorrência por projeto e fronteira de versionamento para o novo fluxo no mesmo plano de controle já usado por `target_prepare`, `target_checkup` e `target_derive_gaps`;
  - o fluxo usa exatamente os milestones externos `preflight`, `case-resolution`, `evidence-collection`, `assessment` e `publication`, sem fallback silencioso para labels de `target_checkup`;
  - uma rodada bem formada aponta caminhos locais estáveis para `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json`, e o summary/traces mostram a fase `publication` mesmo quando o resultado final é no-op local;
  - o Telegram passa a iniciar, acompanhar, cancelar e resumir `/target_investigate_case` com validação manual redigida do resumo final em ambiente real antes do fechamento do ticket.
- Escopo:
  - contrato compartilhado de flow kind, comandos, milestones, slot kind, phase e flow summary para `target-investigate-case`;
  - executor oficial do fluxo no runner, reaproveitando o módulo já existente em `src/core/target-investigate-case.ts` e os helpers de contrato já aterrados no ticket fechado de manifesto/publication;
  - wiring em `runner`, `main`, `telegram-bot` e traces locais para lifecycle real, status/cancel, mensagens de milestone e resumo final;
  - namespace local de artefatos da rodada dentro do projeto alvo, incluindo a fronteira final de `publication` e as semânticas de cancelamento cooperativo vs. tardio;
  - cobertura automatizada dos closure criteria do ticket e smoke/manual validation herdada do resumo final do Telegram.
- Fora de escopo:
  - redefinir manifesto, enums finitos, gates semânticos, `publication_status`, `overall_outcome` ou anti-overfit já codificados em `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.ts`, salvo ajustes mínimos de export/interface necessários para o flow real;
  - capability concreta do piloto `../guiadomus-matricula`, replay/purge do piloto e bloco `## Investigação Causal`, que permanecem no ticket `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md`;
  - criar UX guiada paralela, parser alternativo ou segundo julgamento semântico fora do normalizador e avaliador compartilhados;
  - manter duplicado no mesmo changeset o ownership do follow-up `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md`; se o scaffold deste ticket tornar esse follow-up absorvível, a reconciliação de ownership deve ser explícita antes de fechar o pacote.

## Progress
- [x] 2026-04-03 17:24Z - Planejamento inicial concluído com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, dos tickets irmãos e sucessores relevantes, do ExecPlan fechado do pacote contratual e das superfícies atuais de `target-flow`, `state`, `flow-timing`, `runner`, `main`, `telegram-bot`, `workflow-trace-store` e `target-investigate-case`.
- [x] 2026-04-03 17:57Z - Contrato compartilhado do flow (`kind`, comandos, milestones, phases, slot kind e flow summary) aterrado em `src/types/target-flow.ts`, `src/types/state.ts`, `src/types/flow-timing.ts` e refletido no estado/finalização do runner sem fallback para labels de `target_checkup`.
- [x] 2026-04-03 17:57Z - Executor oficial de `target-investigate-case` aterrado em `src/core/target-investigate-case.ts` com namespace local `investigations/<round-id>/`, artefatos mínimos explícitos, milestones externos canônicos, cancelamento cooperativo/tardio e ponte para o pacote contratual compartilhado.
- [x] 2026-04-03 17:57Z - Wiring em `runner`, `main`, `telegram-bot` e traces concluído com cobertura automatizada de start/status/cancel/lifecycle por projeto, resumo final e persistência do novo flow no trace store.
- [x] 2026-04-03 17:57Z - Matriz automatizada do plano executada com `npm test` e `npm run check` verdes; foram adicionadas provas explícitas para `dossier.json` com `local_path` coerente e para o blocker `round-preparer-unavailable`.
- [ ] 2026-04-03 17:57Z - Validação manual redigida do resumo final do Telegram permanece bloqueada: `npm run dev` iniciou o app com `.env`, mas o long polling falhou em `getMe`, e o bootstrap oficial ainda instancia `ControlledTargetInvestigateCaseExecutor` sem `roundPreparer`, o que impede um smoke útil de `/target_investigate_case` sem materializador real.
- [x] 2026-04-03 18:02Z - Fechamento técnico revalidado: `GO` com validação manual externa pendente, `npm test` (`557/557`) e `npm run check` verdes; o follow-up de wiring foi absorvido e fechado como `duplicate`.

## Surprises & Discoveries
- 2026-04-03 17:24Z - O pacote contratual de `case-investigation` já existe em `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` e `src/core/target-investigate-case.test.ts`, mas ainda sem qualquer executor oficial, flow kind, wiring de runner ou comandos Telegram.
- 2026-04-03 17:24Z - O repositório já possui o plano de controle compartilhado para os target flows atuais; `target-investigate-case` deve reaproveitar esse arcabouço em vez de inventar um lifecycle paralelo.
- 2026-04-03 17:24Z - O trace store de target flows já persiste `inputs`, milestones, `artifactPaths`, `versionedArtifactPaths` e outcome final genericamente; para o novo fluxo, o principal risco é de conteúdo duplicado ou payload incorreto, não de falta de mecanismo de serialização.
- 2026-04-03 17:24Z - O follow-up `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md` foi aberto depois de um `NO_GO` do ticket fechado de manifesto/publication; a execução deste plano precisa relê-lo imediatamente antes de editar arquivos compartilhados para evitar que o scaffold novo crie duplicação de aceite.
- 2026-04-03 17:24Z - Os fixtures atuais do módulo contratual já trabalham com um namespace local do tipo `investigations/<round-id>/...`; isso fornece um default concreto e compatível com a exigência de paths estáveis sem impor versionamento do dossier.
- 2026-04-03 17:57Z - O bootstrap real em `src/main.ts` já consegue subir com `.env`, mas hoje liga `ControlledTargetInvestigateCaseExecutor` sem `roundPreparer`; isso confirma que a superfície operacional deste ticket pode existir sem fingir capability do projeto alvo, desde que o bloqueio seja explícito e testado.
- 2026-04-03 17:57Z - O smoke manual do Telegram não travou por ausência de configuração local: `npm run dev` iniciou normalmente e falhou no long polling do `getMe`, então o bloqueio manual nesta execução é de transporte/ambiente externo, não de parse de env.
- 2026-04-03 17:57Z - O caso alternativo `dossier.json` exige que `local_path` acompanhe exatamente o caminho final da rodada; remapear apenas o filename sem reescrever o conteúdo JSON quebra o contrato de validação.

## Decision Log
- 2026-04-03 - Decisão: usar `src/core/target-investigate-case.ts` como source of truth do parser canônico, do avaliador da rodada, do payload de trace e do summary final, em vez de duplicar parsing/normalização/publication em `runner.ts` ou `telegram-bot.ts`.
  - Motivo: o ticket exige fronteira de ownership explícita e o follow-up bloqueado já identificou o risco de wiring paralelo.
  - Impacto: o executor deste ticket vira a ponte oficial para o módulo compartilhado; as superfícies de runner/Telegram devem importar helpers, não recriá-los.
- 2026-04-03 - Decisão: os milestones externos do flow permanecem exatamente `preflight`, `case-resolution`, `evidence-collection`, `assessment` e `publication`, com `versionBoundaryState` tratado separadamente do nome do milestone.
  - Motivo: RF-10/RF-11 exigem cinco milestones visíveis e estáveis, enquanto RF-42 pede cancelamento antes/depois da fronteira de versionamento.
  - Impacto: o flow usará `publication` como milestone final externo, e o cancelamento tardio será sinalizado quando a execução já tiver cruzado a subfronteira interna de write-back/versionamento dentro desse milestone.
- 2026-04-03 - Decisão: o namespace local default da rodada ficará sob `investigations/<round-id>/` dentro do projeto alvo, preservando filenames fixos `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json`.
  - Motivo: isso já aparece nos fixtures do módulo contratual, atende RF-12/CA-05 e mantém o dossier local ao projeto alvo sem poluir o trace do runner.
  - Impacto: o executor precisa ser responsável por gerar `round-id`, garantir diretório local dedicado e reportar paths relativos estáveis nos summaries/traces.
- 2026-04-03 - Decisão: reutilizar a serialização genérica de `workflow-trace-store` e do summary final do runner sempre que ela aceitar o novo flow kind; só endurecer o store se a integração real exigir shape adicional ou teste dedicado para o novo fluxo.
  - Motivo: o mecanismo já existe e o ganho está em plugar o flow corretamente, não em abrir outra taxonomia de trace.
  - Impacto: o plano prioriza mudanças em enums/tipos compartilhados e testes de integração do runner antes de qualquer refatoração ampla do trace store.
- 2026-04-03 - Decisão: o plano tratará a validação manual do resumo final do Telegram como parte explícita do aceite deste ticket, mas o conteúdo semântico e a sanitização fina do payload continuarão reaproveitando os helpers do módulo compartilhado e a fronteira declarada no follow-up bloqueado.
  - Motivo: RF-39/CA-15 já estão no closure criterion deste ticket, porém o `NO_GO` anterior deixou claro que a fonte do conteúdo deve continuar centralizada no pacote contratual.
  - Impacto: a matriz de validação deste plano separa “entrega operacional do resumo” de “source of truth do payload redigido”.
- 2026-04-03 17:57Z - Decisão: manter `ControlledTargetInvestigateCaseExecutor` ligado no bootstrap oficial mesmo sem `roundPreparer`, retornando `round-preparer-unavailable` de forma explícita e rastreável.
  - Motivo: a capability/materialização real continua pertencendo ao ticket do piloto; fabricar artefatos ou inventar coleta neste pacote violaria a fronteira de ownership.
  - Impacto: o runner já expõe o control-plane completo do flow, mas o smoke funcional fim a fim fica objetivamente dependente da futura ligação do materializador oficial.
- 2026-04-03 17:57Z - Decisão: preservar a validação estrita de `dossier.json.local_path` e corrigir a preparação do artefato de teste, em vez de flexibilizar o contrato.
  - Motivo: RF-12/CA-05 exigem paths estáveis explícitos; aceitar `local_path` divergente esconderia erro real de materialização.
  - Impacto: o executor continua rejeitando dossiers incoerentes, e a cobertura automatizada agora prova tanto `dossier.md` quanto `dossier.json` no caminho final real da rodada.

## Outcomes & Retrospective
- Status final: implementação concluída com validação automatizada verde; validação manual do resumo final no Telegram permaneceu bloqueada por falha real de long polling e pela ausência deliberada do materializador oficial no bootstrap.
- O que precisa existir ao final:
  - novo flow `target-investigate-case` modelado nos contratos centrais de tipos, estado e timing;
  - executor oficial com lifecycle observável, paths locais estáveis, `publication` sempre presente e cancelamento seguro/tardio conforme a fronteira de versionamento;
  - comandos `/target_investigate_case`, `/target_investigate_case_status` e `/target_investigate_case_cancel` funcionando no runner e no Telegram;
  - trace local e summary final reais do flow, sem fallback para `target_checkup`;
  - testes automatizados cobrindo concorrência por projeto, status/cancel por projeto ativo/ambíguo, milestones exatos, paths estáveis de artefatos e cancelamento antes/depois da fronteira;
  - registro manual redigido da validação do resumo final do Telegram.
- O que fica pendente fora deste plano:
  - capability concreta do piloto em `../guiadomus-matricula`;
  - ligação de um `roundPreparer` oficial ao executor bootstrapado em `src/main.ts` para permitir execução funcional fim a fim de `/target_investigate_case`;
  - restabelecer um ambiente Telegram utilizável para registrar o resumo final redigido exigido por RF-39/CA-15;
  - qualquer expansão editorial do pacote contratual além do mínimo necessário para o flow real;
  - fechamento administrativo do ticket, commit/push e reconciliação final de backlog fora do changeset de implementação.
- Próximos passos:
  - ligar o materializador/capability oficial do projeto alvo no `ControlledTargetInvestigateCaseExecutor`;
  - repetir o smoke manual com `/target_investigate_case`, `/_status` e `/_cancel` em um ambiente Telegram que consiga completar `getMe`/long polling;
  - só considerar o ticket pronto depois do registro manual redigido do resumo final no Telegram.

## Context and Orientation
- Ticket de origem:
  - `tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md`
- Spec de origem:
  - `docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md`
- Tickets relacionados para fronteira de ownership:
  - `tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
  - `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md`
  - `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md`
- Documentos e referências relidos no planejamento:
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `tickets/templates/internal-ticket-template.md`
  - `execplans/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
  - `execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
- RFs/CAs cobertos por este plano:
  - RF-01
  - RF-02
  - RF-10
  - RF-11
  - RF-12
  - RF-36
  - RF-39
  - RF-42
  - CA-01
  - CA-05
  - CA-15
  - CA-16
- Assumptions / defaults adotados para eliminar ambiguidade:
  - o comando canônico do flow continuará sendo `/target_investigate_case`, reaproveitando a constante e o parser já definidos no módulo compartilhado;
  - o namespace local default da rodada será `investigations/<round-id>/`, com os filenames fixos enumerados no ticket;
  - `publication` é sempre o milestone externo final do flow, inclusive em no-op; a transição para `versionBoundaryState=after-versioning` ocorre apenas quando a execução entrar na subfronteira interna de write-back/versionamento dentro desse milestone;
  - a exclusão pesada por projeto deve seguir exatamente o modelo atual dos target flows: bloqueio quando já existir execução ou reserva pendente para o mesmo projeto, sem bloquear projetos distintos;
  - `/_status` e `/_cancel` devem manter a mesma resolução atual: escopo pelo projeto ativo quando disponível, e resposta `ambiguous` quando houver múltiplos fluxos do mesmo tipo ativos em projetos diferentes;
  - nenhuma consolidação será usada para os conjuntos finitos herdados deste ticket; cada membro explícito abaixo precisa de cobertura positiva no aceite.
- RNFs e restrições herdados que precisam ficar observáveis neste ticket:
  - fluxo sequencial, sem paralelização de tickets;
  - milestones visíveis curtos e estáveis;
  - cada etapa importante refletida em logs, `/status` e resumo final;
  - sem segredos ou dados sensíveis no resumo final e no trace do runner;
  - sem ampliar semanticamente `/target_checkup`.
- Allowlists / enumerações finitas herdadas sem consolidação:
  - comandos aceitos deste ticket: `/target_investigate_case`, `/target_investigate_case_status`, `/target_investigate_case_cancel`
  - milestones externos obrigatórios: `preflight`, `case-resolution`, `evidence-collection`, `assessment`, `publication`
  - artefatos mínimos da rodada: `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json`, `dossier.md|dossier.json`
- Fronteira de ownership com tickets irmãos e sucessores:
  - este plano cobre a superfície operacional oficial do flow: comandos, slot, milestones, lifecycle, status/cancel, summary final entregue no Telegram, trace local do flow e paths locais estáveis da rodada;
  - `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md` passa a existir apenas como histórico do remanescente já absorvido; qualquer novo remanescente futuro deve nascer em ticket novo, sem reabrir ownership duplicado;
  - `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md` permanece dono da capability do piloto e do ticket causal no repositório alvo externo;
  - manifesto, gates semânticos e publication conservadora já aterrados no ticket fechado só podem ser tocados aqui quando a integração real exigir pequenos ajustes de interface/export.
- Superfícies de código atuais a reabrir durante a execução:
  - `src/types/target-flow.ts`
  - `src/types/state.ts`
  - `src/types/flow-timing.ts`
  - `src/types/target-investigate-case.ts`
  - `src/core/target-investigate-case.ts`
  - `src/core/runner.ts`
  - `src/main.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/core/target-investigate-case.test.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/workflow-trace-store.test.ts`

## Plan of Work
- Milestone 1: promover `target-investigate-case` ao contrato compartilhado do runner.
  - Entregável: novo flow kind, comandos, milestones, labels, phases, slot kind e flow summary tipados, refletidos no estado e no `/status`.
  - Evidência de conclusão: `target-investigate-case` aparece como flow de primeira classe em `target-flow`, `state`, `flow-timing` e `runner`, sem reaproveitar nomes/labels de `target_checkup`.
  - Arquivos esperados:
    - `src/types/target-flow.ts`
    - `src/types/state.ts`
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `src/core/runner.test.ts`
- Milestone 2: aterrar o executor oficial e o ciclo local de artefatos da rodada.
  - Entregável: executor `TargetInvestigateCaseExecutor`/`ControlledTargetInvestigateCaseExecutor` que resolve projeto, escolhe namespace local `investigations/<round-id>/`, publica milestones externos, usa o módulo compartilhado para avaliar a rodada e distingue cancelamento antes/depois da fronteira de versionamento.
  - Evidência de conclusão: testes tornam observáveis os paths locais estáveis, a presença de `publication` em no-op, o cancelamento cooperativo antes de versionar e o cancelamento tardio depois da fronteira.
  - Arquivos esperados:
    - `src/types/target-investigate-case.ts`
    - `src/core/target-investigate-case.ts`
    - `src/core/target-investigate-case.test.ts`
    - `src/integrations/target-investigate-case-git-guard.ts`, se a execução real exigir guarda dedicada de Git/versionamento
- Milestone 3: plugar o flow no runner, no Telegram e no trace local.
  - Entregável: `requestTargetInvestigateCase`, `cancelTargetInvestigateCase`, instância do executor em `main.ts`, comandos do bot, mensagens de milestone, `/status`, `/cancel` e resumo final reais do fluxo.
  - Evidência de conclusão: runner e Telegram cobrem início, status, cancelamento, ambiguidade por projeto, summary final e serialização do novo flow sem control-plane paralelo.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/main.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/workflow-trace-store.ts`, apenas se a integração real exigir ajuste no store
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`
    - `src/integrations/workflow-trace-store.test.ts`
- Milestone 4: fechar a matriz de validação e reconciliar a fronteira de ownership.
  - Entregável: suites automatizadas verdes, guardrail tipado verde, validação manual redigida do resumo final do Telegram e decisão explícita sobre o que permanece ou não no follow-up bloqueado.
  - Evidência de conclusão: comandos do plano passam, o registro manual identifica a execução avaliada e `rg`/diff mostram reuso do módulo compartilhado sem duplicação de parser/summary/trace logic.
  - Arquivos esperados:
    - o próprio ExecPlan atualizado em `Progress`, `Surprises & Discoveries` e `Decision Log`
    - testes citados acima

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md && sed -n '1,260p' tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md && sed -n '1,260p' docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md` para reabrir o ticket, o sucessor bloqueado e a spec imediatamente antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "target-investigate-case|target_investigate_case|TargetInvestigateCase|requestTargetCheckup|TargetFlowKind|RunnerSlotKind|target-checkup|target-derive" src/core src/integrations src/types src/main.ts` para confirmar o delta real entre o pacote contratual já aterrado e a ausência atual de control-plane.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-flow.ts`, `src/types/state.ts` e `src/types/flow-timing.ts` para adicionar:
   - `TargetFlowKind` e `TargetFlowCommand` de `target-investigate-case`;
   - os milestones externos exatos `preflight`, `case-resolution`, `evidence-collection`, `assessment`, `publication`;
   - `RunnerPhase`, `RunnerSlotKind`, `RunnerFlowSummary` e tipos auxiliares do novo flow.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/types/target-investigate-case.ts` para declarar, quando ainda não existirem, os tipos de lifecycle/execução/sumário do flow real, incluindo `TargetInvestigateCaseExecutionResult`, summary de cancelamento, status de versionamento e helpers tipados consumidos por `flow-timing`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.ts` para introduzir o executor oficial do flow, reaproveitando `parseTargetInvestigateCaseCommand`, `evaluateTargetInvestigateCaseRound`, `buildTargetInvestigateCaseTracePayload` e `buildTargetInvestigateCaseFinalSummary`, além de:
   - resolver o projeto alvo;
   - montar o namespace `investigations/<round-id>/`;
   - emitir milestones externos nos checkpoints corretos;
   - respeitar cancelamento cooperativo antes de write-back/versionamento;
   - sinalizar cancelamento tardio depois da fronteira;
   - preparar paths estáveis dos cinco artefatos mínimos.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se o fluxo real precisar validar working tree limpo ou atravessar commit/push para publication positiva, aplicar patch em um guard dedicado como `src/integrations/target-investigate-case-git-guard.ts`; se a guarda atual puder ser reaproveitada sem drift, documentar essa decisão no `Decision Log` do ExecPlan durante a execução.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/runner.ts` para adicionar `requestTargetInvestigateCase`, `cancelTargetInvestigateCase`, reserva/liberação do slot pesado, `renderSlotCommand`, resolução ativa/ambígua de `/_status` e `/_cancel`, finalização do flow e gravação do trace real.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/main.ts` e `src/integrations/telegram-bot.ts` para:
   - instanciar o executor novo;
   - registrar `/target_investigate_case`, `/target_investigate_case_status` e `/target_investigate_case_cancel`;
   - atualizar help/usage/replies e o rendering do resumo final do flow;
   - preservar a mesma resolução por projeto ativo/ambíguo já usada nos target flows atuais.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/integrations/workflow-trace-store.ts` e/ou `src/integrations/workflow-trace-store.test.ts` apenas no necessário para tornar observável a sessão do novo flow com inputs, milestones, `artifactPaths`, `versionedArtifactPaths` e outcome final, sem abrir taxonomia paralela de trace.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar patch em `src/core/target-investigate-case.test.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` e `src/integrations/workflow-trace-store.test.ts` para cobrir:
    - start/status/cancel do novo flow;
    - milestones exatos e ausência de labels de `target_checkup`;
    - exclusão pesada por projeto e ausência de bloqueio indevido entre projetos distintos;
    - paths estáveis dos cinco artefatos mínimos;
    - cancelamento antes/depois da fronteira de versionamento;
    - summary final do Telegram e trace local reais do flow.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/workflow-trace-store.test.ts` para validar a matriz automatizada principal do ticket.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para fechar o guardrail tipado depois do wiring final.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` e, via Telegram autorizado, executar ao menos uma rodada representativa de `/target_investigate_case <project> <case-ref> --workflow <workflow> --request-id <request-id> --window <window> --symptom <symptom>`, seguida de `/target_investigate_case_status` e, quando seguro para smoke, `/target_investigate_case_cancel`, registrando o resumo final observado de forma redigida.
14. (workdir: projeto alvo usado no smoke) Rodar `find investigations -maxdepth 2 -type f | sort` e `find .codex-flow-runner/flow-traces/target-flows -type f | sort | tail -n 5` para confirmar os paths estáveis dos artefatos da rodada e a persistência do trace local do flow.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "parseTargetInvestigateCaseCommand|evaluateTargetInvestigateCaseRound|buildTargetInvestigateCaseTracePayload|buildTargetInvestigateCaseFinalSummary|renderTargetInvestigateCaseFinalSummary" src/core src/integrations src/main.ts` e `git diff --name-only` para confirmar, no fechamento, que o flow real reutiliza o módulo compartilhado e não criou parser/publication/summary paralelos.

## Validation and Acceptance
- Regra de cobertura para allowlists/enumerações finitas deste ticket: não há consolidação autorizada. Os três comandos, os cinco milestones e os cinco artefatos mínimos precisam aparecer explicitamente na evidência positiva; a ausência de fallback para fora do conjunto faz parte do aceite.
- Matriz requisito -> validação observável derivada diretamente dos closure criteria do ticket:
  - Requisito: RF-01, RF-02, CA-01.
    - Evidência observável: `src/types/target-flow.ts`, `src/core/runner.ts`, `src/main.ts` e `src/integrations/telegram-bot.ts` passam a expor exatamente `/target_investigate_case`, `/target_investigate_case_status` e `/target_investigate_case_cancel`; a suíte cobre início, status e cancelamento por projeto ativo e por cenário ambíguo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes afirmam os três comandos explícitos, a resposta `started` do flow, `/_status` para projeto ativo, `/_cancel` aceito antes da fronteira e `ambiguous` quando houver múltiplos flows do mesmo tipo em projetos diferentes.
  - Requisito: RF-10, RF-11, RF-42, CA-16.
    - Evidência observável: o flow usa exatamente os milestones externos `preflight`, `case-resolution`, `evidence-collection`, `assessment` e `publication` em `state`, `flow-timing`, trace e mensagens; a concorrência pesada continua exclusiva por projeto; o cancelamento é cooperativo antes da fronteira e tardio depois dela, sem fallback silencioso para labels de `target_checkup`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: a suite cobre os cinco milestones explícitos, bloqueio de nova investigação causal no mesmo projeto, ausência de bloqueio indevido entre projetos distintos, aceitação do cancelamento antes da fronteira e mensagem explícita de cancelamento tardio depois da fronteira.
  - Requisito: RF-12, RF-36, CA-05.
    - Evidência observável: uma execução bem formada aponta paths locais estáveis para `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md|dossier.json`; o summary e o trace mostram a fase `publication` mesmo em no-op; o lifecycle de cancelamento torna observável a interrupção segura antes do write-back e a conclusão segura quando o cancelamento chegar tarde.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts`
    - Esperado: os testes aprovam os cinco artefatos mínimos com filenames explícitos, a presença de `publication` em todos os caminhos relevantes e as semânticas de cancelamento antes/depois da fronteira de versionamento.
  - Requisito: RF-39, CA-15, validação manual herdada do resumo final do Telegram.
    - Evidência observável: o resumo final entregue no Telegram pelo flow real inclui, no mínimo, `case-ref`, tentativa resolvida ou ausência explícita, replay usado ou não usado, os três vereditos semânticos, `confidence`, `evidence_sufficiency`, `causal_surface`, decisão final, razão curta, caminho do dossier local, caminho do ticket se houver e próxima ação; o aceite registra explicitamente a execução avaliada, o conteúdo redigido observado, o resultado da validação e quaisquer ajustes aplicados antes do fechamento.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`
    - Esperado: após a rodada manual via Telegram, existe um registro redigido do resumo final com os campos mínimos acima e conclusão explícita sobre “sinal suficiente sem expor material sensível”.
  - Requisito: fronteira de ownership do pacote derivado.
    - Evidência observável: o flow real reutiliza `parseTargetInvestigateCaseCommand`, `evaluateTargetInvestigateCaseRound`, `buildTargetInvestigateCaseTracePayload`, `buildTargetInvestigateCaseFinalSummary` e `renderTargetInvestigateCaseFinalSummary`; o diff não cria parser/publication/summary paralelos e não toca `../guiadomus-matricula/**`.
    - Comando: `rg -n "parseTargetInvestigateCaseCommand|evaluateTargetInvestigateCaseRound|buildTargetInvestigateCaseTracePayload|buildTargetInvestigateCaseFinalSummary|renderTargetInvestigateCaseFinalSummary" src/core src/integrations src/main.ts`
    - Comando: `git diff --name-only`
    - Esperado: as referências apontam para reuso do módulo compartilhado no executor/runner/Telegram, e não para uma segunda implementação concorrente; a revisão de caminhos alterados confirma ausência de mudanças em `../guiadomus-matricula/**`.
- Guardrail complementar de consistência tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de TypeScript após adicionar o novo flow.

## Idempotence and Recovery
- Idempotência:
  - reexecutar `/target_investigate_case_status` não deve mutar slot, artifacts nem trace;
  - repetir `/target_investigate_case_cancel` depois de o fluxo já ter sido encerrado deve responder de forma inofensiva (`inactive` ou equivalente), sem novo write-back;
  - rerodar a mesma investigação em snapshot limpo deve criar uma nova rodada sob `investigations/<round-id>/`, preservando filenames fixos e o histórico anterior sem sobrescrita;
  - o executor deve continuar a usar o mesmo parser/evaluator compartilhados, produzindo o mesmo lifecycle para o mesmo conjunto de artefatos de entrada e o mesmo estado de versionamento.
- Riscos:
  - colisão de ownership com o follow-up `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md` nos arquivos `src/core/target-investigate-case.ts`, `src/core/runner.ts` e `src/integrations/telegram-bot.ts`;
  - ambiguidade sobre a subfronteira de versionamento dentro do milestone externo `publication`;
  - dependência de ambiente Telegram real para a validação manual do resumo final;
  - guarda de Git/versionamento insuficiente se a publication positiva do flow exigir commit/push real sem adaptar a proteção atual dos target flows.
- Recovery / Rollback:
  - se a execução falhar antes da fronteira de versionamento, corrigir a causa objetiva, limpar apenas o namespace local da rodada inacabada quando necessário e rerodar sem reaproveitar estado parcialmente inválido;
  - se o cancelamento chegar depois da fronteira, permitir a conclusão segura da sequência de `publication` e usar o trace/resultados dessa rodada como source of truth antes de qualquer rerun;
  - se `rg` ou os testes mostrarem duplicação de parser/publication/summary logic fora do módulo compartilhado, interromper a execução, reconciliar a fronteira com o follow-up bloqueado e só então seguir;
  - se a validação manual de Telegram não puder ser executada no ambiente real, não fechar o ticket como concluído: registrar blocker explícito e manter a pendência manual aberta.

## Artifacts and Notes
- Ticket atual:
  - `tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md`
- Spec e contratos consultados:
  - `docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md`
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
- Tickets e ExecPlans usados para delimitar fronteira:
  - `tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
  - `execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md`
  - `tickets/closed/2026-04-03-target-investigate-case-contract-package-wiring-gap.md`
  - `tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md`
  - `execplans/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`
- Artefatos planejados para o flow:
  - trace local em `.codex-flow-runner/flow-traces/target-flows/`
  - namespace local da rodada em `investigations/<round-id>/`
  - `case-resolution.json`
  - `evidence-bundle.json`
  - `assessment.json`
  - `publication-decision.json`
  - `dossier.md` ou `dossier.json`
- Checklist de qualidade aplicado neste planejamento:
  - leitura integral do ticket e das referências obrigatórias;
  - explicitação da spec de origem, do subconjunto RF/CA coberto, dos RNFs e das restrições herdadas;
  - explicitação dos membros finitos relevantes sem consolidação (`comandos`, `milestones`, `artefatos`);
  - matriz requisito -> validação observável derivada dos closure criteria, com validação manual herdada preservada;
  - fronteira de ownership explícita com tickets irmão/sucessor para evitar `duplication-gap`.

## Interfaces and Dependencies
- Interfaces alteradas ou adicionadas:
  - `TargetFlowKind`, `TargetFlowCommand`, labels e milestone unions em `src/types/target-flow.ts`;
  - `RunnerPhase`, `RunnerSlotKind`, `RunnerTargetFlowState` e capacidade do runner em `src/types/state.ts`;
  - `TargetInvestigateCaseFlowSummary` e tipos correlatos em `src/types/flow-timing.ts`;
  - `TargetInvestigateCaseExecutionResult`, summary de cancelamento e contrato de lifecycle em `src/types/target-investigate-case.ts`;
  - `TargetInvestigateCaseExecutor`/`ControlledTargetInvestigateCaseExecutor` em `src/core/target-investigate-case.ts`;
  - `requestTargetInvestigateCase` e `cancelTargetInvestigateCase` em `src/core/runner.ts`;
  - novos controles do bot em `src/integrations/telegram-bot.ts` e injeção em `src/main.ts`.
- Dependências internas reutilizadas:
  - `FileSystemTargetProjectResolver`
  - `GitCliVersioning`
  - guardas Git dos target flows atuais, caso um deles possa ser reaproveitado sem drift
  - `parseTargetInvestigateCaseCommand`
  - `evaluateTargetInvestigateCaseRound`
  - `buildTargetInvestigateCaseTracePayload`
  - `buildTargetInvestigateCaseFinalSummary`
  - `renderTargetInvestigateCaseFinalSummary`
- Compatibilidade e acoplamentos:
  - o flow novo deve respeitar a exclusão pesada por projeto e a resolução ativa/ambígua já existentes nos target flows;
  - o trace local continua usando a infraestrutura atual de `workflow-trace-store`, sem criar raiz paralela;
  - a integração não pode reabrir semanticamente `target_checkup` nem duplicar a capability do piloto externo;
  - qualquer absorção do follow-up bloqueado precisa ser registrada explicitamente no `Decision Log` do ExecPlan durante a execução, antes do fechamento do ticket.
