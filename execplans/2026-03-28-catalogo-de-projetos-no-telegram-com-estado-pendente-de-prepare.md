# ExecPlan - Catálogo de projetos no Telegram com estado pendente de `prepare`

## Purpose / Big Picture
- Objetivo: evoluir `/projects` de uma lista estrita de projetos elegíveis para um catálogo operacional que também exponha repositórios Git irmãos pendentes de `prepare`, preservando a segurança do projeto ativo e a clareza do contrato de onboarding.
- Resultado esperado:
  - o runner distingue explicitamente, no catálogo, itens `eligible` e `pending_prepare`;
  - `/projects` continua permitindo seleção normal apenas dos itens `eligible`;
  - itens `pending_prepare` passam a ter estado visual claro e CTA seguro para `/target_prepare`;
  - após `target_prepare` bem-sucedido, o item reaparece como elegível em `/projects`;
  - documentação e testes são reconciliados com o novo contrato do catálogo.
- Escopo:
  - modelo de catálogo de projetos e descoberta dos estados `eligible`/`pending_prepare`;
  - snapshot de `/projects` e bloqueio de seleção para itens pendentes;
  - UX do Telegram para renderização dos estados e CTA de `prepare`;
  - documentação pública/canônica e cobertura automatizada das superfícies tocadas.
- Fora de escopo:
  - relaxar a definição de projeto elegível para o workflow completo;
  - tornar itens `pending_prepare` selecionáveis como projeto ativo;
  - descobrir diretórios fora do primeiro nível de `PROJECTS_ROOT_PATH`;
  - criar uma nova categoria canônica de compatibilidade além das já documentadas;
  - aceitar bootstrap do runner sem nenhum projeto elegível neste recorte;
  - alterar o contrato funcional de `/target_checkup` ou `/target_derive_gaps`.

## Progress
- [x] 2026-03-28 16:47Z - Planejamento inicial concluído com leitura de `SPECS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, das specs relacionadas de multi-projeto e onboarding, e das superfícies de código que hoje acoplam catálogo e elegibilidade.
- [x] 2026-03-28 17:07Z - Modelo de catálogo e descoberta por estado implementados.
- [x] 2026-03-28 17:07Z - UX de `/projects` ajustada para exibir estado e CTA de `prepare`.
- [x] 2026-03-28 17:07Z - Testes e documentação reconciliados com o novo contrato.
- [x] 2026-03-28 17:07Z - `npm run check` concluído sem erros após a atualização final.
- [ ] 2026-03-28 17:07Z - Smoke manual em Telegram real ainda pendente fora deste ciclo local.

## Surprises & Discoveries
- 2026-03-28 16:47Z - `src/core/project-selection.ts` hoje usa `resolveActiveProject(...)` diretamente para construir o snapshot de `/projects`, o que acopla catálogo e seleção ativa mais do que o necessário.
- 2026-03-28 16:47Z - `src/integrations/target-project-resolver.ts` já carrega a noção de “repo Git válido para `prepare`, mas ainda inelegível para `/projects`”, então parte da semântica necessária já existe, mas está fora da UI do catálogo.
- 2026-03-28 16:47Z - `buildProjectsReply(...)` em `src/integrations/telegram-bot.ts` assume que toda linha da listagem é um alvo de seleção ativa; para introduzir `pending_prepare`, a renderização e os callbacks precisam se desacoplar.
- 2026-03-28 16:47Z - O bootstrap atual ainda depende de existir ao menos um projeto elegível; para reduzir risco neste ticket, o plano preserva essa premissa e evita abrir, agora, a frente de “modo sem projeto ativo”.
- 2026-03-28 17:07Z - A persistência do projeto ativo precisou continuar gravando apenas `ProjectRef`; o teste de seleção revelou rapidamente que vazar `catalogStatus` para o store quebraria o contrato semântico do estado persistido.

## Decision Log
- 2026-03-28 - Decisão: preservar `resolveActiveProject(...)` e a noção de projeto ativo baseados apenas em itens elegíveis.
  - Motivo: o problema observado é de catálogo/UX, não de contrato operacional do projeto ativo.
  - Impacto: reduz risco de regressão em `/run_all`, `/run_specs`, `/status` e demais fluxos que pressupõem projeto ativo elegível.
- 2026-03-28 - Decisão: introduzir um modelo explícito de catálogo, em vez de sobrecarregar `ProjectRef` com semântica ambígua.
  - Motivo: `ProjectRef` hoje representa um projeto efetivamente operável; um tipo separado evita espalhar condicionais de estado por todo o código.
  - Impacto: aumenta a clareza da API entre discovery, seleção e Telegram, ao custo de tocar mais tipos/testes.
- 2026-03-28 - Decisão: manter `pending_prepare` como estado operacional de catálogo, não como nova categoria canônica de compatibilidade.
  - Motivo: alinhar a UX ao contrato já documentado em `docs/workflows/target-project-compatibility-contract.md`.
  - Impacto: documentação e copy precisam ser cuidadosas para não vender “listado no catálogo” como “pronto para o workflow completo”.
- 2026-03-28 - Decisão: preferir CTA segura e explícita para `prepare` dentro de `/projects`, em vez de exigir memorização manual do nome do diretório.
  - Motivo: a dor relatada é de descobribilidade e ergonomia do onboarding.
  - Impacto: exige novos callbacks/renderizações no Telegram e testes adicionais de UX.

## Outcomes & Retrospective
- Status final: implementação local concluída; smoke manual em Telegram real pendente.
- O que passou a existir:
  - um snapshot de catálogo que entrega ao Telegram itens `eligible` e `pending_prepare`;
  - `/projects` com marcadores editoriais distintos e CTA segura para `prepare`;
  - bloqueio explícito de seleção ativa para itens pendentes;
  - transição observável de `pending_prepare` para `eligible` coberta por teste automatizado após `target_prepare`;
  - documentação e testes cobrindo o novo contrato.
- O que fica pendente fora deste plano:
  - smoke manual em Telegram real para validar a UX final do catálogo e do CTA de `prepare`;
  - suporte a bootstrap sem projeto elegível;
  - exposição de diretórios não Git ou de subdiretórios aninhados;
  - qualquer redefinição do contrato binário de compatibilidade do projeto alvo.
- Próximos passos:
  - validar em Telegram real a experiência final quando houver oportunidade operacional.

## Context and Orientation
- Arquivos principais:
  - `docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md`
  - `src/integrations/project-discovery.ts`
  - `src/integrations/project-discovery.test.ts`
  - `src/types/project.ts`
  - `src/core/project-selection.ts`
  - `src/core/project-selection.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/target-project-resolver.ts`
  - `src/integrations/target-project-resolver.test.ts`
  - `src/main.ts`
  - `README.md`
- Spec de origem: `docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10
  - CA-01, CA-02, CA-03, CA-04, CA-05, CA-06
- Assumptions / defaults adotados:
  - o projeto ativo continua sendo resolvido apenas entre itens elegíveis;
  - `pending_prepare` significa `.git` presente e `tickets/open/` ausente no primeiro nível de `PROJECTS_ROOT_PATH`;
  - diretórios sem `.git` permanecem fora do catálogo;
  - o v1 não cobre bootstrap sem projetos elegíveis;
  - a CTA de `prepare` deve ser segura e observável; se o desenho final exigir confirmação adicional, ela deve permanecer no contexto do próprio `/projects`.
- Fluxo atual:
  - `FileSystemProjectDiscovery` só devolve elegíveis;
  - `ActiveProjectSelectionService.listProjects()` constrói o snapshot de `/projects` a partir de `resolveActiveProject(...)`;
  - `TelegramController.buildProjectsReply(...)` assume que toda linha é selecionável como projeto ativo;
  - `FileSystemTargetProjectResolver` já sabe distinguir `eligibleForProjects`, mas isso não sobe para o catálogo.
- Restrições técnicas:
  - evitar quebrar contratos que assumem `ProjectRef` como projeto operável;
  - preservar paginação e callbacks existentes de `/projects`;
  - não introduzir caminhos arbitrários nem ambiguidade entre “catálogo” e “projeto ativo”.

## Plan of Work
- Milestone 1: Criar um modelo de catálogo que represente estados de descoberta sem quebrar a semântica atual do projeto ativo.
  - Entregável: novo tipo de catálogo e nova consulta de discovery/catálogo, distinguindo `eligible` e `pending_prepare`.
  - Evidência de conclusão: testes de discovery e seleção mostram itens mistos no catálogo e preservam a resolução do projeto ativo apenas entre elegíveis.
  - Arquivos esperados: `src/types/project.ts`, `src/integrations/project-discovery.ts`, `src/integrations/project-discovery.test.ts`, `src/core/project-selection.ts`, `src/core/project-selection.test.ts`.
- Milestone 2: Ajustar a camada de seleção para bloquear itens pendentes sem romper a UX atual de projetos elegíveis.
  - Entregável: `selectProjectByName(...)` e resultados de controle conseguem diferenciar “não encontrado” de “pendente de prepare”.
  - Evidência de conclusão: testes cobrem tentativa de seleção textual de item `pending_prepare` com preservação do projeto ativo e mensagem acionável.
  - Arquivos esperados: `src/core/project-selection.ts`, `src/core/project-selection.test.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3: Reconciliar `/projects` no Telegram para renderizar estados distintos e CTA segura de `prepare`.
  - Entregável: resposta paginada com marcadores visuais por estado e callbacks/affordances coerentes para seleção ou `prepare`.
  - Evidência de conclusão: testes de Telegram cobrem renderização mista, bloqueio de seleção indevida e disparo/encaminhamento da CTA de `prepare`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, possivelmente `src/main.ts` se houver ajuste na ligação dos controles.
- Milestone 4: Atualizar documentação e provar a transição observável após `target_prepare`.
  - Entregável: `README.md`, help do bot e spec viva reconciliados; validações automatizadas e smoke manual definidos.
  - Evidência de conclusão: README/help refletem o novo catálogo; suíte focada passa; smoke manual em Telegram real confirma transição `pending_prepare -> eligible`.
  - Arquivos esperados: `README.md`, spec/ticket/execplan tocados quando necessário, testes focados.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md`, `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`, `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md` e `docs/workflows/target-project-compatibility-contract.md` para fixar o contrato final antes das mudanças.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/project.ts` para introduzir um tipo explícito de catálogo, separado de `ProjectRef`, com estado observável (`eligible` | `pending_prepare`) e metadados suficientes para a UI.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/project-discovery.ts` e `src/integrations/project-discovery.test.ts` para adicionar uma leitura de catálogo que liste diretórios irmãos Git relevantes e marque o estado `pending_prepare` quando `tickets/open/` estiver ausente.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/project-selection.ts` e `src/core/project-selection.test.ts` para:
   - preservar a resolução do projeto ativo entre elegíveis;
   - entregar ao Telegram um snapshot de catálogo mais rico;
   - devolver resultado distinto quando `selectProjectByName(...)` apontar para item `pending_prepare`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para:
   - renderizar `/projects` como catálogo operacional, não só como lista de elegíveis;
   - diferenciar visualmente itens `eligible` e `pending_prepare`;
   - bloquear seleção ativa de item pendente com resposta acionável;
   - ligar uma CTA segura para `/target_prepare` a partir do próprio catálogo.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.test.ts` para cobrir renderização, callbacks e mensagens dos estados mistos.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/main.ts` se o wiring precisar expor novos controles/resultados para o catálogo ou CTA de `prepare`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `README.md` e, se necessário, nas specs tocadas no mesmo changeset, para explicar a diferença entre item elegível e item pendente de `prepare` sem redefinir “projeto elegível”.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/project-discovery.test.ts src/core/project-selection.test.ts src/integrations/telegram-bot.test.ts src/integrations/target-project-resolver.test.ts` para validar o contrato automatizado da mudança.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar integridade tipada.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev` e, no Telegram real, validar `/projects` com um item elegível e `../guiadomus-enrich-matricula` como `pending_prepare`.
12. (workdir: projeto alvo preparado manualmente em teste) Executar o fluxo de `prepare` pelo caminho final desenhado em `/projects`, rerodar `/projects` e confirmar a promoção observável para estado elegível.

## Validation and Acceptance
- Matriz requisito -> validação:
  - Requisito: RF-01, RF-02, RF-09; CA-01.
  - Evidência observável: o catálogo distingue `eligible` e `pending_prepare`, preserva a definição estrita de `pending_prepare` e continua escondendo diretórios sem `.git`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/project-discovery.test.ts src/core/project-selection.test.ts`
  - Esperado: a suíte cobre coexistência de itens elegíveis e pendentes no catálogo, sem poluir a lista com diretórios não Git.
- Requisito: RF-03, RF-04, RF-05; CA-02, CA-05.
  - Evidência observável: apenas itens elegíveis são selecionáveis como projeto ativo; tentativa de selecionar item pendente por callback ou `/select_project` retorna bloqueio explícito e preserva o projeto ativo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/project-selection.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: a suíte cobre seleção normal de elegíveis, bloqueio de pendentes e mensagem acionável para `prepare`.
- Requisito: RF-06, RF-07, RF-08; CA-03, CA-04.
  - Evidência observável: `/projects` expõe CTA segura para `prepare`; após sucesso de `target_prepare`, o item muda de estado na próxima leitura do catálogo.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/telegram-bot.test.ts src/integrations/target-project-resolver.test.ts`
  - Esperado: a suíte cobre o encaminhamento/CTA e a coerência do estado esperado após preparo; o smoke manual em Telegram real comprova a transição observável.
- Requisito: RF-10; CA-06.
  - Evidência observável: README/help/documentação tocados explicam a diferença entre catálogo operacional e elegibilidade do workflow completo.
  - Comando: `rg -n "pending_prepare|pendente de prepare|projetos elegiveis|catalogo operacional|/target_prepare" README.md docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md src/integrations/telegram-bot.ts`
  - Esperado: a documentação e o texto público do bot convergem para o novo contrato sem redefinir “projeto elegível”.
- Comando complementar de consistência tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de TypeScript.

## Idempotence and Recovery
- Idempotência:
  - rerodar `/projects` sem mudança no filesystem deve produzir o mesmo estado de catálogo;
  - após `target_prepare` bem-sucedido, rerodar `/projects` deve refletir a promoção do item de forma determinística;
  - tentar selecionar item `pending_prepare` repetidamente deve continuar bloqueando sem alterar o projeto ativo.
- Riscos:
  - misturar “estado de catálogo” com “estado de seleção ativa” e quebrar contratos existentes;
  - CTA de `prepare` ficar ambígua ou acidentalmente mutativa demais;
  - regressão na paginação ou nos callbacks atuais de `/projects`.
- Recovery / Rollback:
  - se a nova modelagem de catálogo complicar demais `ProjectSelectionService`, separar mais explicitamente “listagem” de “seleção” em interfaces distintas antes de seguir;
  - se a CTA de `prepare` se mostrar arriscada em review, cair para confirmação explícita no mesmo contexto do Telegram em vez de disparo direto;
  - se a renderização de `/projects` ficar ruidosa, simplificar o copy e manter os estados com marcadores mínimos, preservando a clareza do contrato;
  - registrar qualquer descoberta nova em `Surprises & Discoveries` e abrir follow-up separado se surgir necessidade de suportar bootstrap sem projeto elegível.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md`
- Spec e contratos consultados:
  - `docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md`
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
- Ambiente de observação que motivou a abertura:
  - `PROJECTS_ROOT_PATH=/home/mapita/projetos/`
  - exemplo real de item pendente: `/home/mapita/projetos/guiadomus-enrich-matricula`
- Artefatos planejados:
  - ajustes em discovery, project selection, Telegram e documentação pública;
  - cobertura automatizada do novo catálogo concluída;
  - smoke manual em Telegram real permanece pendente.
- Evidências de validação executadas neste ciclo:
  - `npm test -- src/integrations/project-discovery.test.ts src/core/project-selection.test.ts src/integrations/telegram-bot.test.ts src/integrations/target-project-resolver.test.ts`
  - `npm run check`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato de discovery/catálogo de projetos;
  - snapshot usado por `/projects`;
  - possivelmente o resultado de `selectProjectByName(...)` para diferenciar item pendente de item inexistente;
  - callbacks/renderização de `/projects` no Telegram.
- Compatibilidade:
  - a compatibilidade funcional de `/run_all`, `/run_specs` e demais fluxos dependentes de projeto ativo deve permanecer inalterada;
  - `/target_prepare` continua sendo o mecanismo real de promoção para elegibilidade, apenas mais visível no catálogo.
- Dependências externas e mocks:
  - mocks/stubs de `ProjectDiscovery`, `ActiveProjectStore` e controles do `TelegramController`;
  - ambiente manual com Telegram real para validar UX final e transição de estado após `prepare`.
