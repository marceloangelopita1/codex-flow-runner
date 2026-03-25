# ExecPlan - Target commands default to active project

## Purpose / Big Picture
- Objetivo: alinhar a UX dos comandos target do Telegram ao conceito de projeto ativo global, tornando opcional o parametro `project-name` onde isso fizer sentido e preservando contratos importantes como `report-path` explicito em `/target_derive_gaps`.
- Resultado esperado:
  - `/target_prepare` passa a aceitar ausencia de projeto e usa o projeto ativo atual;
  - `/target_checkup` permanece como baseline do comportamento ja existente;
  - `/target_derive_gaps <report-path>` passa a usar o projeto ativo atual, enquanto `/target_derive_gaps <project-name> <report-path>` continua valido;
  - `/target_derive_gaps` sem `report-path` continua respondendo com uso correto;
  - `/select_project` e `/select-project` permanecem explicitos;
  - `Runner`, parser do Telegram, help `/start`, README, spec e testes ficam consistentes entre si.
- Escopo:
  - revisar o contrato funcional de `prepare`, `checkup` e `derive` quanto ao uso do projeto ativo como default;
  - ajustar assinaturas e resolucao de projeto efetivo no `Runner`;
  - ajustar parser/handlers/mensagens de uso do `TelegramController`;
  - atualizar README e spec canonica do fluxo target;
  - expandir testes para os cenarios de fallback e para os limites de escopo.
- Fora de escopo:
  - alterar o conceito de projeto ativo persistido;
  - mudar o comportamento de `/select_project` ou `/select-project`;
  - introduzir "ultimo report" implicito em `/target_derive_gaps`;
  - implementar novos fluxos target, `/_status`, `/_cancel`, traces ou milestones alem do que ja existe.

## Progress
- [x] 2026-03-25 02:03Z - Planejamento inicial concluido com leitura do pedido do usuario, mapeamento dos comandos afetados, confirmacao do baseline atual em `target_checkup` e leitura dos padroes canônicos de ticket/ExecPlan.
- [x] 2026-03-25 02:09Z - Contrato de comando, parser e runner atualizados.
- [x] 2026-03-25 02:11Z - Documentacao publica e spec canonica atualizadas.
- [x] 2026-03-25 02:15Z - Validacao automatizada e revisao final concluidas.
- [ ] 2026-03-25 02:15Z - Smokes manuais em Telegram real ainda pendentes.

## Surprises & Discoveries
- 2026-03-25 02:03Z - `/target_checkup` ja implementa exatamente o fallback desejado para o projeto ativo; ele deve ser usado como referencia de comportamento e de cobertura de testes.
- 2026-03-25 02:03Z - `/target_derive_gaps` nao pode "simplesmente" usar o projeto ativo quando o comando vier vazio, porque `report-path` continua obrigatorio; a melhora real e permitir a omissao apenas do projeto.
- 2026-03-25 02:03Z - A spec canonica atual documenta `/target_prepare <project-name>` e `/target_derive_gaps <project-name> <report-path>` como contratos obrigatoriamente explicitos, entao a implementacao precisa atualizar a spec no mesmo changeset para evitar divergencia.
- 2026-03-25 02:03Z - `tickets/open/` estava vazio no working tree atual no momento do planejamento, entao este ticket passa a ser a referencia de backlog aberta para o tema.
- 2026-03-25 02:09Z - O parse mais seguro e simples para `/target_derive_gaps` foi tratar um unico argumento como `report-path`, deixando a resolucao de projeto default exclusivamente no runner.
- 2026-03-25 02:14Z - A cobertura existente de `runner` e `telegram-bot` ja isolava bem os contratos afetados, entao foi possivel validar a mudanca sem alargar o escopo para outros modulos target.

## Decision Log
- 2026-03-25 - Decisao: manter `/select_project` e `/select-project` fora do escopo.
  - Motivo: nesses comandos, exigir argumento explicito e parte do proprio significado operacional de "trocar de projeto".
  - Impacto: evita um fallback inutil ou confuso e concentra a mudanca apenas nos comandos target com contexto operacional ja existente.
- 2026-03-25 - Decisao: centralizar o fallback de projeto no `Runner`, nao apenas no `TelegramController`.
  - Motivo: isso reduz duplicacao de regra, deixa o comportamento mais testavel e protege futuras entradas que reutilizem os mesmos metodos.
  - Impacto: assinaturas e logs do runner precisarao distinguir `requestedProjectName` de `effectiveProjectName` quando aplicavel.
- 2026-03-25 - Decisao: interpretar a forma de um unico argumento em `/target_derive_gaps` como `report-path`.
  - Motivo: esse e o unico caso ergonomico novo de valor real; um unico argumento nunca deve ser interpretado como `project-name`, porque `derive` sempre exige `report-path`.
  - Impacto: o parser do Telegram fica simples, previsivel e sem ambiguidade relevante; a validacao forte de `report-path` continua no fluxo atual.

## Outcomes & Retrospective
- Status final: implementacao concluida com validacao automatizada verde; smokes manuais externos ainda pendentes.
- O que funcionou: centralizar o fallback no `Runner` evitou duplicacao de regra; o baseline existente de `/target_checkup` serviu como referencia clara; a documentacao publica e a spec foram atualizadas no mesmo changeset do codigo.
- O que ficou pendente: apenas smokes manuais em Telegram real para confirmar a ergonomia final em ambiente operacional.
- Proximos passos: executar os smokes manuais pendentes e, se nao surgirem regressões, manter o contrato novo como baseline dos comandos target.

## Context and Orientation
- Ticket de origem: `tickets/closed/2026-03-24-target-command-project-default-to-active-project-gap.md`
- Arquivos principais:
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/core/target-checkup.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.test.ts`
  - `README.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- Spec de origem: `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-10 e RF-19 do contrato atual dos comandos target.
  - CA-03 e CA-07, na parte em que a superficie publica e o contrato textual do comando precisam continuar observaveis e rastreaveis.
- Assumptions / defaults adotados:
  - o projeto ativo global continua sendo a referencia default apenas para comandos target que operam sobre um projeto, nao para comandos de selecao de projeto;
  - `/target_checkup` ja e o comportamento correto e nao deve ser reescrito alem do necessario para coerencia editorial;
  - `/target_prepare` pode usar o projeto ativo atual sem mudar sua semantica de "atuar sobre um repo alvo";
  - `/target_derive_gaps` continua exigindo `report-path` explicito e nunca deve escolher "o ultimo relatorio" automaticamente;
  - o caso de um unico argumento em `derive` sera tratado como `report-path`;
  - se nao houver projeto ativo disponivel, o erro deve ser explicito e alinhado ao contrato do runner.
- Fluxo atual:
  - `TelegramController` faz o parse textual dos comandos target e hoje falha cedo em `/target_prepare` sem projeto e em `/target_derive_gaps` sem dois argumentos.
  - `Runner` ainda recebe `projectName` obrigatorio em `requestTargetPrepare(...)` e `requestTargetDerive(...)`.
  - `ControlledTargetCheckupExecutor` ja resolve o alvo a partir de `activeProject` quando `projectName` nao e informado.
- Restricoes tecnicas:
  - manter os testes existentes de `/select_project` e dos fluxos target coerentes;
  - nao introduzir duplicacao entre regras do parser do Telegram e regras do runner;
  - atualizar documentacao publica e spec no mesmo changeset da implementacao.

## Plan of Work
- Milestone 1: fechar o contrato funcional da mudanca e ajustar a orquestracao no runner.
  - Entregavel: `requestTargetPrepare(...)` e `requestTargetDerive(...)` aceitam `projectName` opcional ou resolvem explicitamente o projeto efetivo a partir do estado atual, sem quebrar `target_checkup`.
  - Evidencia de conclusao: testes de runner cobrem explicitamente `requestedProjectName = null` com `effectiveProjectName = activeProject.name`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2: atualizar parser, handlers e mensagens do Telegram para os novos formatos.
  - Entregavel: `/target_prepare` aceita ausencia de projeto; `/target_derive_gaps` aceita tanto um argumento (`report-path`) quanto dois (`project-name` + `report-path`); mensagens de uso e `/start` refletem o novo contrato.
  - Evidencia de conclusao: testes do `TelegramController` cobrem caminho feliz e mensagens de uso corretas para os formatos novo e antigo.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3: alinhar documentacao publica e contrato canonico.
  - Entregavel: README e spec do fluxo target passam a documentar `project-name` opcional apenas onde a mudanca e valida.
  - Evidencia de conclusao: os textos do README, do `/start` e da spec ficam consistentes entre si e com a implementacao.
  - Arquivos esperados: `README.md`, `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`.
- Milestone 4: validar limites de escopo e regressao.
  - Entregavel: suites de `runner` e `telegram-bot` passam cobrindo os novos cenarios sem quebrar `/target_checkup` nem `/select_project`.
  - Evidencia de conclusao: `npm test` focado e `npm run check` verdes.
  - Arquivos esperados: suites atualizadas e, se necessario, pequenos ajustes editoriais adicionais.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `tickets/closed/2026-03-24-target-command-project-default-to-active-project-gap.md`, `src/integrations/telegram-bot.ts`, `src/core/runner.ts` e `src/core/target-checkup.ts` para reconfirmar o baseline atual antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para permitir fallback de `projectName` para `activeProject.name` em `/target_prepare` e `/target_derive_gaps`, deixando claro no estado/log qual foi o projeto solicitado versus o efetivo.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para:
   - aceitar `/target_prepare` sem projeto;
   - interpretar `/target_derive_gaps <report-path>` como uso do projeto ativo;
   - manter `/target_derive_gaps <project-name> <report-path>` como formato explicito;
   - atualizar mensagens de uso e `/start`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` para cobrir:
   - `/target_prepare` sem projeto;
   - `/target_prepare` com projeto explicito;
   - `/target_derive_gaps` com um argumento (`report-path`);
   - `/target_derive_gaps` com dois argumentos;
   - ausencia de projeto ativo;
   - nao regressao de `/target_checkup`;
   - nao mudanca de contrato em `/select_project`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` e `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md` para refletir que `project-name` se torna opcional em `prepare` e `derive`, com `report-path` ainda obrigatorio em `derive`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts src/core/target-prepare.test.ts` para validar o contrato atualizado e suas regressões diretas.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar integridade tipada e de imports apos a mudanca.
8. (workdir: Telegram real autorizado + `/home/mapita/projetos/codex-flow-runner`) Fazer smoke manual de `/target_prepare` sem argumento, `/target_checkup` sem argumento e `/target_derive_gaps <report-path>` com projeto ativo valido para confirmar a ergonomia real do bot e as mensagens de erro quando faltarem pre-condicoes.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito: `/target_prepare` usa projeto ativo quando `project-name` e omitido.
  - Evidencia observavel: o comando sem argumento deixa de responder "uso obrigatorio" e passa a operar sobre o projeto ativo atual; o formato explicito continua funcionando.
  - Requisito: `/target_checkup` permanece baseline e sem regressao.
  - Evidencia observavel: os testes e o comportamento manual do comando continuam aceitando os formatos sem argumento e com argumento explicito.
  - Requisito: `/target_derive_gaps` aceita omissao apenas do projeto, mantendo `report-path` obrigatorio.
  - Evidencia observavel: um argumento unico e tratado como `report-path`; dois argumentos continuam sendo `project-name + report-path`; comando vazio continua retornando uso correto.
  - Requisito: `/select_project` fica fora do escopo.
  - Evidencia observavel: os testes existentes de `/select_project` continuam validando argumento obrigatorio, sem necessidade de relaxar o contrato.
  - Requisito: documentacao publica e spec canonica ficam coerentes com a implementacao.
  - Evidencia observavel: README, `/start` e spec descrevem exatamente os formatos aceitos apos a mudanca.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts src/core/target-prepare.test.ts`
  - Esperado: suites verdes cobrindo os cenarios novos e sem regressao nos fluxos target relacionados.
- Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de TypeScript e imports apos a atualizacao das assinaturas e mensagens.
- Comando: smoke manual no Telegram autorizado.
  - Esperado: `/target_prepare` sem argumento usa o projeto ativo; `/target_derive_gaps <report-path>` usa o projeto ativo; `/target_derive_gaps` vazio continua pedindo `report-path`; `/select_project` continua pedindo nome explicito.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a mudanca sobre o mesmo branch deve apenas estabilizar parser, runner, docs e testes sem criar caminhos paralelos de contrato;
  - reruns manuais dos comandos devem continuar respeitando o mesmo projeto ativo ate que o operador faca `/select_project`.
- Riscos:
  - espalhar a regra de fallback em mais de um lugar e criar divergencia futura;
  - quebrar o parse de `/target_derive_gaps` ao diferenciar um argumento de dois;
  - atualizar README sem atualizar a spec ou vice-versa.
- Recovery / Rollback:
  - se o parser de `derive` ficar ambiguo ou confuso, retornar ao parse simples e mover a logica de discriminacao explicitamente para helper bem testado;
  - se a mudanca gerar regressao em `target_checkup`, restaurar o baseline existente e reaplicar a alteracao apenas em `prepare`/`derive`;
  - se a documentacao ficar desalinhada, bloquear fechamento ate README, `/start` e spec estarem reconciliados no mesmo changeset.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-03-24-target-command-project-default-to-active-project-gap.md`
- Arquivos de referencia do mapeamento:
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/core/target-checkup.ts`
  - `README.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
- Evidencias de validacao executadas:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/core/target-checkup.test.ts src/core/target-derive.test.ts src/core/target-prepare.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `BotControls.targetPrepare(...)`
  - `BotControls.targetDerive(...)`
  - `TicketRunner.requestTargetPrepare(...)`
  - `TicketRunner.requestTargetDerive(...)`
  - parser e mensagens de uso do `TelegramController`
- Compatibilidade:
  - o contrato de `project-name` explicito continua suportado;
  - o contrato de `report-path` explicito em `derive` continua obrigatorio;
  - `/select_project` e `/select-project` permanecem inalterados;
  - `target_checkup` permanece a referencia de comportamento para fallback ao projeto ativo.
- Dependencias externas e mocks:
  - os testes de `telegram-bot` e `runner` precisam de stubs/fixtures atualizados para diferenciar projeto solicitado e projeto efetivo;
  - o smoke manual depende de um projeto ativo valido e de chat Telegram autorizado.
