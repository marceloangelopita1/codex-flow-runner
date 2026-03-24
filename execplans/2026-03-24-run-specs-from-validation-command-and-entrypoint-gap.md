# ExecPlan - comando público e entrada direta de `run-specs` pela validação

## Purpose / Big Picture
- Objetivo: entregar a porta de entrada pública `/run_specs_from_validation <arquivo-da-spec.md>` e o caminho do runner que inicia `run-specs` diretamente em `spec-ticket-validation`, sem retriagem e sem mutação de tickets antes da validação.
- Resultado esperado:
  - o Telegram aceita `/run_specs_from_validation` com o mesmo contrato-base de acesso e parsing de `/run_specs`, acrescido do gate de backlog derivado aberto;
  - o runner expõe uma variante de início de `run-specs` que pula `spec-triage`, reutiliza `buildSpecTicketValidationPackageContext(...)` e preserva `NO_GO`, falha técnica, `GO`, retrospectiva pre-`/run_all`, `spec-close-and-version`, `/run_all` e `spec-audit`;
  - `/run_specs` permanece semanticamente inalterado como caminho de retriagem completa.
- Escopo:
  - comando textual dedicado no Telegram para retomada pela validação;
  - validação acionável de backlog derivado aberto antes de iniciar a rodada;
  - nova porta de entrada do runner para começar em `spec-ticket-validation`;
  - cobertura automatizada em `src/integrations/telegram-bot.test.ts` e `src/core/runner.test.ts`;
  - validações finais exigidas pelo ticket (`npm test`, `npm run check` e roteiro manual no Telegram).
- Fora de escopo:
  - ajustar help textual do bot, `README.md`, documentação operacional ampla ou CTA/botão em `/specs`;
  - fechar RF-15, RF-16, RF-17, RF-18, RF-19 e CA-08, já fatiados no ticket irmão `tickets/open/2026-03-24-run-specs-from-validation-observability-and-docs-gap.md`;
  - generalizar retomada para outras etapas além de `spec-ticket-validation`;
  - fechar ticket, mover arquivo, commitar ou fazer push.

## Progress
- [x] 2026-03-24 18:11Z - Planejamento inicial concluído com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `DOCUMENTATION.md`, de `docs/workflows/codex-quality-gates.md` e das referências de código citadas.
- [x] 2026-03-24 18:30Z - Contrato do comando `/run_specs_from_validation` implementado no Telegram com gate de backlog derivado aberto, respostas acionáveis e wiring em `src/main.ts`.
- [x] 2026-03-24 18:30Z - Runner refatorado para iniciar `run-specs` diretamente em `spec-ticket-validation`, com gate pré-loop de backlog derivado reutilizando `buildSpecTicketValidationPackageContext(...)` e sem regressão em `/run_specs`.
- [x] 2026-03-24 18:30Z - Cobertura automatizada ampliada em `src/integrations/telegram-bot.test.ts` e `src/core/runner.test.ts`; `npm test` e `npm run check` executados com sucesso.
- [ ] 2026-03-24 18:30Z - Roteiro manual no Telegram continua pendente nesta etapa; a execução local cobriu apenas validações automatizadas observáveis.

## Surprises & Discoveries
- 2026-03-24 18:11Z - `buildSpecTicketValidationPackageContext(...)` em `src/core/runner.ts` já reconstrói corretamente o backlog por `Source spec`, `Related tickets` e linhagem `source-spec | spec-related | hybrid`; o gap é de porta de entrada e de reaproveitamento controlado, não de algoritmo de montagem do pacote.
- 2026-03-24 18:11Z - `src/integrations/spec-discovery.ts` hoje valida apenas `Status: approved` e `Spec treatment: pending`; o gate adicional de backlog derivado aberto não pertence a essa camada e deve reaproveitar lógica do runner em vez de duplicar heurística de linhagem no bot.
- 2026-03-24 18:11Z - `runSpecsAndRunAll(...)` foi desenhado assumindo passagem por `spec-triage`; a nova entrada precisa compartilhar a continuação pós-validação sem copiar o restante do fluxo nem quebrar timings/resumos já existentes.
- 2026-03-24 18:11Z - A cobertura atual de `/run_specs` em `src/integrations/telegram-bot.test.ts` e `src/core/runner.test.ts` já modela os casos de uso, bloqueio, `NO_GO` e `GO`; isso reduz risco ao adicionar cenários espelhados para o novo comando.
- 2026-03-24 18:11Z - O ticket irmão de observabilidade/documentação já absorve o trabalho de diferenciar `sourceCommand`/`entryPoint` em summary, trace, `/status`, timings e docs; este plano precisa apenas fazer o mínimo necessário para que o caminho funcional exista sem absorver esse pacote.
- 2026-03-24 18:30Z - `RunSpecsFlowSummary` e os snapshots de timing já toleravam `specTriage` ausente porque o contrato atual marca esses blocos como opcionais; a entrada direta em `spec-ticket-validation` não exigiu ampliar `src/types/flow-timing.ts`.
- 2026-03-24 18:30Z - O gate de backlog derivado aberto pôde ficar no request do runner, antes de iniciar o loop principal, devolvendo bloqueio funcional explícito sem duplicar heurística de linhagem no bot e sem deixar slot preso.

## Decision Log
- 2026-03-24 - Decisão: manter o escopo estritamente no fechamento dos closure criteria deste ticket e deixar RF-15..RF-19/CA-08 para o ticket irmão.
  - Motivo: a spec derivou dois tickets independentes; reabsorver observabilidade/documentação quebraria a rastreabilidade `spec -> tickets`.
  - Impacto: mudanças em summary/timing/status só entram aqui se forem estritamente necessárias para o caminho funcional compilar e permanecer coerente.
- 2026-03-24 - Decisão: usar `buildSpecTicketValidationPackageContext(...)` como autoridade única para o gate de backlog derivado aberto.
  - Motivo: a regra de linhagem já existe e o ticket exige explicitamente reutilizá-la.
  - Impacto: a validação do novo comando deve chamar o runner ou um helper compartilhado do runner, evitando duplicação em `telegram-bot.ts` ou `spec-discovery.ts`.
- 2026-03-24 - Decisão: refatorar o runner para ter uma continuação compartilhada a partir de `spec-ticket-validation`, em vez de copiar `runSpecsAndRunAll(...)`.
  - Motivo: o fluxo pós-validação (`retrospectiva`, `spec-close-and-version`, `/run_all`, `spec-audit`) já existe e precisa permanecer semanticamente idêntico.
  - Impacto: `src/core/runner.ts` deve ganhar um ponto de entrada novo e um executor comum parametrizado pelo estágio inicial.
- 2026-03-24 - Decisão: manter `/run_specs` inalterado por contrato e provar isso por testes dedicados.
  - Motivo: RF-20 e CA-09 exigem preservação explícita do caminho legado.
  - Impacto: a suíte do runner e do bot precisa cobrir o novo comando e revalidar a semântica antiga no mesmo changeset.
- 2026-03-24 - Decisão: materializar o gate de backlog derivado aberto como validação do request `requestRunSpecsFromValidation(...)`, não como nova regra em `spec-discovery`.
  - Motivo: o ticket exige reutilizar a lógica de linhagem do runner e o bloqueio precisa acontecer antes de iniciar o loop, mas depois dos mesmos gates operacionais de slot/capacidade/autenticação.
  - Impacto: o Telegram continua usando a elegibilidade-base existente (`approved` + `pending`) e recebe do runner o bloqueio acionável específico quando o backlog reaproveitável não existe.
- 2026-03-24 - Decisão: não tocar em `/start`, `README.md`, `/status`, summary editorial nem traces além do necessário para compilar.
  - Motivo: esse pacote pertence explicitamente ao ticket irmão de observabilidade/documentação.
  - Impacto: a entrega atual fecha o caminho funcional e mantém a diferenciação editorial detalhada como pendência rastreada, evitando mistura de escopo.

## Outcomes & Retrospective
- Status final: execução funcional concluída com validações automatizadas verdes; validações manuais no Telegram seguem pendentes.
- O que deve existir ao final:
  - comando `/run_specs_from_validation` registrado e testado no Telegram;
  - gate acionável quando não houver backlog derivado aberto;
  - request/loop do runner capaz de iniciar `run-specs` em `spec-ticket-validation` sem passar por `spec-triage`;
  - cobertura automatizada para sucesso, bloqueios, `NO_GO`, falha técnica, `GO` e preservação de `/run_specs`.
- O que fica pendente após este plano:
  - observabilidade editorial detalhada do novo ponto de entrada;
  - ajustes de help textual, `README.md` e documentação operacional ampla;
  - validações manuais reais em ambiente Telegram.
- Próximos passos:
  - executar manualmente no Telegram os cenários de backlog válido, ausência de backlog, `NO_GO` e `GO`;
  - usar o ticket irmão para fechar a diferenciação editorial de `sourceCommand`/`entryPoint` em summaries, `/status`, timings e docs;
  - fechar o ticket apenas depois de confirmar também o roteiro manual do Telegram.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-03-24-run-specs-from-validation-command-and-entrypoint-gap.md` - contrato executor do trabalho.
  - `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md` - spec de origem e fonte de RFs/CAs/defaults.
  - `docs/workflows/codex-quality-gates.md` - checklist compartilhado aplicado a este plano.
  - `src/integrations/telegram-bot.ts` - comando, parser, respostas de validação e wiring de handlers.
  - `src/main.ts` - injeção dos controles usados pelo bot.
  - `src/core/runner.ts` - request do fluxo, orquestração `run-specs`, `spec-ticket-validation` e construção do pacote derivado.
  - `src/integrations/spec-discovery.ts` - validação base da elegibilidade da spec.
  - `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` - provas automatizadas pedidas pelo ticket.
- Spec de origem:
  - `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25.
  - CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-09, CA-10, CA-11.
- Assumptions / defaults adotados:
  - o nome canônico do novo comando permanece `/run_specs_from_validation`;
  - `/run_specs` continua significando retriagem completa da spec;
  - `/run_specs_from_validation` significa revalidar o backlog derivado aberto atual e continuar somente em `GO`;
  - ausência de tickets abertos derivados significa ausência de backlog reaproveitável suficiente para entrar pela validação;
  - a primeira versão permanece restrita a comando textual no Telegram, sem botão novo em `/specs`;
  - `spec-ticket-validation` continua sendo a autoridade funcional para `GO | NO_GO`.
- RNFs e restrições herdados que este plano precisa preservar:
  - fluxo sequencial por projeto, sem paralelização de tickets ou specs;
  - primeiro passe de `spec-ticket-validation` em contexto novo, com autocorreção controlada, limite de ciclos, taxonomia de gaps, veredito e write-back funcional preservados;
  - novo caminho inicia diretamente em `spec-ticket-validation` sem executar `spec-triage`;
  - novo caminho não cria, apaga, move ou regenera tickets antes da validação;
  - os mesmos gates operacionais de slot/capacidade/autenticação/projeto ativo de `/run_specs` continuam valendo.
- Fluxo atual relevante:
  - `handleRunSpecsCommand(...)` valida apenas elegibilidade da spec e chama `controls.runSpecs(...)`;
  - `requestRunSpecs(...)` agenda sempre `runSpecsAndRunAll(...)`;
  - `runSpecsAndRunAll(...)` sempre executa `spec-triage` antes de `spec-ticket-validation`;
  - `buildSpecTicketValidationPackageContext(...)` já consegue reconstruir o pacote derivado reaproveitável.
- Não-escopo explícito dentro do fluxo derivado da spec:
  - RF-15, RF-16, RF-17, RF-18, RF-19 e CA-08 ficam para `tickets/open/2026-03-24-run-specs-from-validation-observability-and-docs-gap.md`;
  - `README.md`, `/start`, `/specs` e `src/types/flow-timing.ts` só devem ser tocados aqui se houver necessidade estrita para manter compilação/contrato funcional.

## Plan of Work
- Milestone 1: contrato público do novo comando no Telegram.
  - Entregável: `telegram-bot.ts` passa a reconhecer `/run_specs_from_validation`, reaproveita a validação-base da spec, aplica o gate adicional de backlog derivado aberto e responde com mensagens acionáveis para sucesso, falta de argumento, argumento inválido, spec inexistente, spec inelegível e ausência de backlog.
  - Evidência de conclusão: `src/integrations/telegram-bot.test.ts` cobre sucesso, uso incorreto, spec inválida/inelegível e ausência de backlog derivado sem iniciar o runner.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/main.ts`.
- Milestone 2: validação reutilizável de elegibilidade para retomada pela validação.
  - Entregável: existe um contrato explícito no runner para validar se uma spec pode entrar por `/run_specs_from_validation`, combinando elegibilidade da spec com a construção bem-sucedida do pacote derivado aberto.
  - Evidência de conclusão: o bot não precisa duplicar lógica de linhagem; o caminho sem backlog responde com bloqueio acionável orientando `/run_specs`.
  - Arquivos esperados: `src/core/runner.ts`, possivelmente tipos locais no próprio arquivo e `src/main.ts`.
- Milestone 3: porta de entrada do runner pulando `spec-triage`.
  - Entregável: o runner ganha um request para iniciar `run-specs` em `spec-ticket-validation`, compartilhando a continuação existente para retrospectiva, `spec-close-and-version`, `/run_all` e `spec-audit`.
  - Evidência de conclusão: `src/core/runner.test.ts` prova `NO_GO`, falha técnica, `GO` e ausência de `spec-triage` no caminho novo, enquanto `/run_specs` continua passando por `spec-triage`.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 4: regressão controlada e validações finais do ticket.
  - Entregável: a suíte focada e a suíte geral passam; o roteiro manual no Telegram fica executável para confirmar bloqueio sem backlog, parada em `NO_GO` e continuidade até `spec-audit` em `GO`.
  - Evidência de conclusão: `npm test`, `npm run check` e os cenários manuais descritos no ticket tornam-se observáveis sem necessidade de inferência adicional.
  - Arquivos esperados: testes atualizados e eventuais ajustes mínimos de integração necessários para compilação.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,260p' tickets/open/2026-03-24-run-specs-from-validation-command-and-entrypoint-gap.md` e `sed -n '1,260p' docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md` imediatamente antes da execução para reconfirmar closure criteria, RFs/CAs e defaults herdados.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "run_specs_from_validation|handleRunSpecsCommand|parseRunSpecsCommandFileName|requestRunSpecs|runSpecsAndRunAll|buildSpecTicketValidationPackageContext" src/integrations/telegram-bot.ts src/core/runner.ts src/main.ts src/integrations/spec-discovery.ts` para mapear os pontos exatos de extensão sem reabrir escopo.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/telegram-bot.ts` para:
   - adicionar constantes de uso/erro específicas de `/run_specs_from_validation`;
   - registrar o novo handler textual;
   - criar parser dedicado do comando;
   - introduzir um fluxo de validação que reutilize a elegibilidade da spec e aplique o gate adicional de backlog derivado aberto;
   - responder com mensagem acionável orientando `/run_specs <arquivo-da-spec.md>` quando não houver backlog reaproveitável.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/main.ts` para injetar no bot os novos controles necessários, mantendo os gates operacionais e o projeto ativo já usados por `/run_specs`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar com `apply_patch` `src/core/runner.ts` para introduzir um contrato explícito de validação da retomada pela validação, reutilizando `buildSpecTicketValidationPackageContext(...)` como fonte de verdade para backlog derivado aberto e falhas de linhagem.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Continuar em `src/core/runner.ts` com `apply_patch` para adicionar `requestRunSpecsFromValidation(...)` e um executor compartilhado de `run-specs` parametrizado pelo estágio inicial, garantindo que o caminho novo pule `spec-triage` mas preserve:
   - `spec-ticket-validation`;
   - retrospectiva pre-`/run_all` quando aplicável;
   - parada em `NO_GO` ou falha técnica antes de `spec-close-and-version` e `/run_all`;
   - continuidade para `spec-close-and-version`, `/run_all` e `spec-audit` em `GO`;
   - semântica atual de `/run_specs`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar com `apply_patch` apenas o mínimo necessário em `src/core/runner.ts` e dependências locais para que summaries/timings internos tolerem o caminho sem `spec-triage`, sem absorver o pacote editorial do ticket irmão.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `src/integrations/telegram-bot.test.ts` para cobrir `/run_specs_from_validation` em pelo menos: sucesso, falta de argumento, caminho inválido, spec inexistente, spec inelegível, ausência de backlog derivado, `already-running`, bloqueio operacional e chat não autorizado.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar com `apply_patch` `src/core/runner.test.ts` para cobrir:
   - início direto em `spec-ticket-validation`;
   - parada em `NO_GO` antes de `spec-close-and-version` e `/run_all`;
   - parada em falha técnica antes de `spec-close-and-version` e `/run_all`;
   - continuidade em `GO` até `spec-audit`;
   - preservação do contrato de primeiro passe em contexto novo, autocorreção controlada, limite de ciclos, taxonomia de gaps e write-back funcional;
   - preservação semântica de `/run_specs` iniciando em `spec-triage`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validar diretamente os cenários amarrados aos closure criteria.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para confirmar ausência de regressão na suíte completa, incluindo `/run_specs`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para verificar tipagem e contratos após ampliar bot + runner.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "/run_specs_from_validation|requestRunSpecsFromValidation|spec-ticket-validation|buildSpecTicketValidationPackageContext|/run_specs" src/integrations/telegram-bot.ts src/core/runner.ts src/main.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para auditar se o escopo ficou restrito ao ticket funcional.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar manualmente no Telegram, fora do shell, os cenários descritos no ticket e registrar as evidências operacionais mínimas: início direto em `spec-ticket-validation`, bloqueio por ausência de backlog, parada em `NO_GO` antes de `spec-close-and-version`/`/run_all` e continuidade até `spec-audit` em `GO`.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisitos cobertos: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-23, RF-24, RF-25; CA-01, CA-02, CA-03, CA-04.
  - Evidência observável: o bot aceita `/run_specs_from_validation <arquivo-da-spec.md>`, aplica o mesmo controle de acesso/parsing/elegibilidade-base de `/run_specs`, bloqueia ausência de backlog derivado com orientação para `/run_specs` e não inicia o runner em cenários inválidos.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: testes verdes cobrindo sucesso, falta de argumento, caminho inválido, spec inexistente, spec inelegível, ausência de backlog derivado e preservação dos mesmos gates operacionais de `/run_specs`.
  - Comando: `rg -n "/run_specs_from_validation|Uso: /run_specs_from_validation|Spec não encontrada para /run_specs_from_validation|Spec não elegível para /run_specs_from_validation|/run_specs <arquivo-da-spec.md>" src/integrations/telegram-bot.ts`
  - Esperado: o código contém parser, mensagens acionáveis e orientação explícita de fallback para `/run_specs` quando não houver backlog reaproveitável.
- Matriz requisito -> validação observável:
  - Requisitos cobertos: RF-07, RF-08, RF-09, RF-11, RF-12, RF-13, RF-14, RF-20, RF-21, RF-22; CA-05, CA-06, CA-07, CA-09, CA-10, CA-11.
  - Evidência observável: o runner passa a ter um caminho que entra em `spec-ticket-validation` sem executar `spec-triage`, sem rederivar tickets antes da validação, preserva a retrospectiva pre-`/run_all` quando aplicável, para em `NO_GO` ou falha técnica antes de `spec-close-and-version`/`/run_all`, continua em `GO` até `spec-audit` e mantém `/run_specs` começando por `spec-triage`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: testes verdes cobrindo início direto na validação, parada em `NO_GO`, parada em falha técnica, continuidade em `GO`, execução ou supressão correta da retrospectiva pre-`/run_all` e preservação semântica do caminho legado `/run_specs`.
  - Comando: `rg -n "requestRunSpecsFromValidation|runSpecsAndRunAll|spec-triage|spec-ticket-validation|buildSpecTicketValidationPackageContext" src/core/runner.ts`
  - Esperado: existe um request/caminho novo que reaproveita a montagem do pacote derivado e mantém o caminho legado separado e preservado.
- Matriz requisito -> validação observável:
  - Requisitos cobertos: RF-10.
  - Evidência observável: a rodada iniciada por `/run_specs_from_validation` mantém o mesmo contrato funcional atual de `spec-ticket-validation`: primeiro passe em contexto novo, autocorreção controlada, mesmo limite de ciclos, mesma taxonomia de gaps, mesmo veredito `GO | NO_GO` e mesmo write-back funcional quando aplicável.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
  - Esperado: há asserts explícitos no caminho novo e no legado provando contexto novo no primeiro passe, preservação de ciclos/correções/gaps/veredito e ausência de regressão no write-back funcional.
- Matriz requisito -> validação observável:
  - Requisitos cobertos: validações herdadas da spec e último closure criterion do ticket.
  - Evidência observável: a cobertura direcionada de `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` fica verde; `npm test` e `npm run check` concluem sem regressão; o roteiro manual do Telegram torna observável o início direto na validação, o bloqueio sem backlog, a parada em `NO_GO` e a continuidade até `spec-audit` em `GO`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: suíte completa verde, inclusive caminhos existentes de `/run_specs`.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde após a ampliação de contratos entre bot e runner.
  - Comando manual: `/run_specs_from_validation <arquivo-da-spec.md>` no Telegram em cenários com backlog válido, sem backlog, `NO_GO` e `GO`.
  - Esperado: bloqueio acionável sem backlog; parada antes de `spec-close-and-version` e `/run_all` em `NO_GO`; continuidade até `spec-audit` em `GO`.

## Idempotence and Recovery
- Idempotência:
  - reexecutar `/run_specs_from_validation` sobre a mesma spec deve apenas reconstruir o pacote derivado aberto atual e reentrar no gate funcional, sem criar/apagar/regenerar tickets antes da validação;
  - rerodar a suíte de testes e os comandos de validação não deve gerar efeitos colaterais além dos artefatos normais do ambiente de teste;
  - `/run_specs` deve continuar produzindo a mesma semântica de retriagem completa após a mudança.
- Riscos:
  - duplicar no bot a lógica de backlog derivado e divergir de `buildSpecTicketValidationPackageContext(...)`;
  - copiar `runSpecsAndRunAll(...)` e introduzir deriva entre o caminho novo e o legado;
  - quebrar consumidores internos de summary/timing por assumirem `spec-triage` sempre presente;
  - relaxar inadvertidamente o contrato de `/run_specs` ao tentar compartilhar demais o executor.
- Recovery / Rollback:
  - se a validação de backlog começar a divergir, remover a duplicação e expor no runner um helper/resultado dedicado reaproveitado pelo bot;
  - se a refatoração compartilhada do executor ficar arriscada, preferir dois request methods finos apontando para um helper comum apenas a partir de `spec-ticket-validation`, sem alterar o fluxo legado além do necessário;
  - se summaries/timings exigirem `spec-triage`, fazer o menor ajuste estrutural possível para aceitar `specTriage` ausente e deixar a diferenciação editorial completa para o ticket irmão;
  - se `/run_specs` sofrer regressão, bloquear fechamento do ticket até a suíte comprovar novamente a entrada obrigatória em `spec-triage`.

## Artifacts and Notes
- Ticket executor:
  - `tickets/open/2026-03-24-run-specs-from-validation-command-and-entrypoint-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md`
- Ticket irmão explicitamente fora de escopo deste plano:
  - `tickets/open/2026-03-24-run-specs-from-validation-observability-and-docs-gap.md`
- Referências lidas para este planejamento:
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/integrations/spec-discovery.ts`
  - `src/main.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Checklist aplicado do `docs/workflows/codex-quality-gates.md`:
  - ticket inteiro e referências obrigatórias lidos antes de planejar;
  - spec de origem, subconjunto de RFs/CAs, assumptions/defaults, RNFs e restrições explicitados;
  - closure criteria traduzidos para matriz objetiva de validação;
  - riscos residuais e não-escopo declarados;
  - validações derivadas dos closure criteria do ticket, não de checklist genérico.
- Nota operacional obrigatória deste host:
  - todos os comandos com `node`/`npm`/`npx` neste plano já estão escritos com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH";`.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `BotControls` em `src/integrations/telegram-bot.ts` deve ganhar uma entrada dedicada para iniciar a retomada pela validação e, preferencialmente, outra para validar elegibilidade completa desse caminho sem duplicação de linhagem no bot;
  - `src/main.ts` deve injetar os novos controles preservando o projeto ativo e os gates existentes;
  - `src/core/runner.ts` deve expor request/validação específicos para `/run_specs_from_validation` e um executor compartilhado do fluxo pós-validação;
  - `src/integrations/telegram-bot.test.ts` e `src/core/runner.test.ts` devem refletir o novo contrato público e a preservação do legado.
- Compatibilidade:
  - `/run_specs` permanece funcional e semanticamente inalterado;
  - o fluxo continua pertencendo à família `run-specs`, sem generalizar retomada para outras etapas;
  - o novo caminho continua sujeito aos mesmos bloqueios de capacidade, slot, autenticação do Codex e projeto ativo já usados por `/run_specs`;
  - não deve haver botão novo em `/specs` nem alteração obrigatória de `README.md`/help textual neste ticket.
- Dependências externas e mocks:
  - `FileSystemSpecDiscovery` continua sendo a fonte da elegibilidade-base da spec;
  - `buildSpecTicketValidationPackageContext(...)` é a dependência normativa para detectar backlog derivado aberto e inconsistências de linhagem;
  - a suíte existente de `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` deve ser reutilizada como harness principal, sem dependência nova de rede;
  - validação manual no Telegram continua dependência operacional do fechamento deste ticket.
