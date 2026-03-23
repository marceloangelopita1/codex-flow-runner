# ExecPlan - Contrato de triagem e summaries estruturados do /run_specs

## Purpose / Big Picture
- Objetivo: enriquecer o contrato interno de `/run_specs` para que o milestone de triagem e o resumo final tenham dados estruturados suficientes para cumprir a spec, especialmente nas fases hoje timing-only.
- Resultado esperado:
  - `RunSpecsTriageLifecycleEvent` (ou contrato equivalente) passa a carregar snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective`, preservando o melhor snapshot disponivel em sucesso, `NO_GO` e falha tecnica pre-`/run_all`;
  - `RunSpecsFlowSummary` (ou contrato equivalente) passa a expor summaries proprios de `spec-triage`, `spec-close-and-version` e `spec-audit`, com campos minimos orientados a efeito observavel;
  - a integracao Telegram continua consumindo o caminho central de entrega sem regressao de retry, chunking, logging ou estado observavel;
  - o ticket irmao de rendering editorial/chunking passa a receber insumo contratual suficiente, sem precisar inferir esses dados de `details`.
- Escopo:
  - modelagem de tipos/view-models do fluxo `/run_specs`;
  - contratos parseaveis minimos das etapas `spec-triage`, `spec-close-and-version` e `spec-audit`;
  - preenchimento/clonagem desses summaries no runner;
  - adaptacao minima das superficies consumidoras e dos testes para o novo contrato.
- Fora de escopo:
  - reorganizacao editorial completa das mensagens de Telegram, ordem final de secoes, deduplicacao textual e chunking semantico; isso pertence ao ticket irmao `tickets/open/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`;
  - mudar a semantica funcional das etapas de `/run_specs`;
  - alterar a camada robusta de entrega Telegram alem do necessario para preservar compatibilidade;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-23 16:34Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `SPECS.md`, de `INTERNAL_TICKETS.md`, dos prompts de etapa e das superficies tecnicas afetadas.
- [x] 2026-03-23 16:50Z - Contrato tipado e blocos parseaveis minimos das etapas `spec-triage`, `spec-close-and-version` e `spec-audit` implementados em tipos, prompts e parsers do runner.
- [x] 2026-03-23 16:50Z - Runner passou a emitir snapshots estruturados no milestone de triagem e summaries dedicados de `spec-triage`, `spec-close-and-version` e `spec-audit` no resumo final.
- [x] 2026-03-23 16:50Z - Cobertura automatizada de runner e Telegram atualizada para sucesso, `NO_GO`, falha tecnica pre-`/run_all` e preservacao do caminho central de entrega.
- [x] 2026-03-23 16:50Z - Validacao final (`npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-03-23 16:34Z - Hoje apenas `spec-audit` expõe bloco parseavel dedicado (`[[SPEC_AUDIT_RESULT]]`); `spec-triage` e `spec-close-and-version` ainda dependem de saida livre e sinais implicitos.
- 2026-03-23 16:34Z - `RunSpecsTriageLifecycleEvent` em `src/core/runner.ts` ainda carrega apenas `spec`, `outcome`, `finalStage`, `nextAction`, `timing` e `details`, o que obriga o milestone a degradar para texto generico.
- 2026-03-23 16:34Z - `RunSpecsFlowSummary` em `src/types/flow-timing.ts` ja modela bem `spec-ticket-validation` e `spec-ticket-derivation-retrospective`, mas nao tem summaries proprios para `spec-triage`, `spec-close-and-version` nem `spec-audit`.
- 2026-03-23 16:34Z - `src/integrations/telegram-bot.test.ts` ja cobre bastante do resumo final e do milestone, mas a maior parte das assercoes atuais ainda e baseada em timing e blocos especializados existentes; o contrato novo precisara entrar primeiro para destravar o ticket editorial irmao.
- 2026-03-23 16:50Z - Os stubs de `src/core/runner.test.ts` precisaram deixar de retornar `ok:<stage>` para `spec-triage` e `spec-close-and-version`, porque o novo contrato tornou obrigatorios blocos parseaveis nessas etapas tambem.
- 2026-03-23 16:50Z - `tsc --noEmit` e `tsc -p tsconfig.json` expuseram um estreitamento invalido em um helper generico de parser do runner que os testes em runtime nao capturavam; foi necessario materializar explicitamente o resultado parseado antes do retorno.

## Decision Log
- 2026-03-23 - Decisao: tratar este ticket como entrega de contrato/dados e manter a reescrita editorial principal no ticket irmao.
  - Motivo: o problema-raiz descrito no ticket e falta de insumo estruturado; misturar redesign de renderer aqui aumentaria o risco de overlap e esconderia o aceite contratual.
  - Impacto: `src/integrations/telegram-bot.ts` so deve receber ajuste minimo para consumir o novo shape sem assumir a responsabilidade do layout final.
- 2026-03-23 - Decisao: introduzir blocos parseaveis minimos para `spec-triage` e `spec-close-and-version`, em vez de derivar summaries de texto livre ou heuristicas de diff/log.
  - Motivo: RF-09 a RF-12 pedem summaries proprios e observaveis; heuristica sobre saida livre seria fragil e dificil de testar.
  - Impacto: os prompts `prompts/01-avaliar-spec-e-gerar-tickets.md` e `prompts/05-encerrar-tratamento-spec-commit-push.md` passam a ter contrato parseavel minimo, semelhante ao padrao ja usado por `spec-audit`.
- 2026-03-23 - Decisao: preservar o melhor snapshot concluido nas falhas pre-`/run_all`, sem sintetizar dados inexistentes.
  - Motivo: RF-06 e CA-02 exigem continuidade informacional real, nao preenchimento artificial.
  - Impacto: o runner deve reter summaries ja produzidos por `spec-ticket-validation` e `spec-ticket-derivation-retrospective` e omitir apenas o que de fato nao chegou a existir.
- 2026-03-23 - Decisao: os novos summaries de fase devem carregar apenas efeito observavel + resumo curto, nao a saida bruta das etapas.
  - Motivo: RF-10, RF-11, RF-12 e RF-20 privilegiam utilidade operacional e texto simples.
  - Impacto: os campos minimos escolhidos abaixo servem como default canonicamente suficiente para este ticket.
- 2026-03-23 - Decisao: manter o milestone de triagem curto e restrito aos snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective`, deixando `spec-triage`, `spec-close-and-version` e `spec-audit` no resumo final.
  - Motivo: o ticket exige checkpoint decisorio mais informativo, mas nao autoriza transformar o milestone no resumo final nem antecipar o redesign editorial do ticket irmao.
  - Impacto: o milestone ganhou dados funcionais minimos do gate pre-`/run_all`, enquanto os summaries de fase dedicados ficaram concentrados em `RunSpecsFlowSummary` e no renderer final.

## Outcomes & Retrospective
- Status final: implementacao concluida, validada localmente e aceita para fechamento operacional em `GO`.
- O que funcionou: o recorte entre contrato de dados e rendering editorial permitiu enriquecer runner, prompts e Telegram sem mexer no fluxo funcional nem na camada robusta de entrega.
- O que ficou pendente: a rodada separada de redesign editorial/chunking prevista no ticket irmao.
- Proximos passos: usar o contrato novo como insumo do ticket `tickets/open/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`, depois fechar a linhagem com auditoria final da spec.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md`
  - `docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md`
  - `src/core/runner.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/05-encerrar-tratamento-spec-commit-push.md`
  - `prompts/08-auditar-spec-apos-run-all.md`
- Spec de origem: `docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md`
- RFs/CAs cobertos por este plano:
  - RF-03, RF-04, RF-05, RF-06, RF-08, RF-09, RF-10, RF-11, RF-12, RF-23
  - CA-01, CA-02, CA-04, CA-09, CA-10
- RNFs e restricoes herdados que precisam ficar observaveis neste ticket:
  - preservar a camada atual de entrega robusta do Telegram;
  - manter compatibilidade com mensagens em texto simples;
  - nao alterar a semantica funcional das fases do `/run_specs`;
  - nao introduzir persistencia/outbox ou novas garantias de entrega;
  - nao transformar o Telegram em copia integral de trace/log bruto;
  - manter o fluxo sequencial e a observabilidade atual do runner.
- Assumptions / defaults adotados:
  - o milestone de triagem continua mais curto e decisorio que o resumo final, mas deixa de depender apenas de `details`;
  - nem toda fase precisa ter o mesmo volume de campos; o minimo deste ticket e o suficiente para provar efeito operacional e alimentar o ticket editorial irmao;
  - `spec-ticket-validation` e `spec-ticket-derivation-retrospective` continuam sendo as fontes canonicamente fortes do checkpoint pre-`/run_all`; o runner so precisa preserva-las e transporta-las melhor;
  - `spec-triage` passara a expor, no minimo, `specStatusAfterTriage`, `specTreatmentAfterTriage`, `derivedTicketsCreated` e `summary` (nomes exatos podem variar, mas o contrato deve cobrir esse conteudo);
  - `spec-close-and-version` passara a expor, no minimo, `closureCompleted`, `versioningResult`/`commitHash` e `summary`;
  - `spec-audit` passara a expor, no minimo, `residualGapsDetected`, `followUpTicketsCreated`, `specStatusAfterAudit` e `summary`;
  - classificacao/confianca da retrospectiva da derivacao so aparecem quando houver `analysis` estruturada; nao devem ser sintetizadas artificialmente.
- Fluxo atual relevante:
  - `runSpecsAndRunAll(...)` em `src/core/runner.ts` coleta timings e summaries especializados, mas o milestone de triagem recebe apenas campos genericos;
  - `buildRunSpecsFlowSummary(...)` clona `specTicketValidation`, `specTicketDerivationRetrospective`, `workflowGapAnalysis`, `workflowImprovementTicket` e `runAllSummary`, sem espaco dedicado para `spec-triage`, `spec-close-and-version` e `spec-audit`;
  - `buildRunSpecsTriageMilestoneMessage(...)` e `buildRunFlowSummaryMessage(...)` em `src/integrations/telegram-bot.ts` refletem diretamente essa falta de contrato.

## Plan of Work
- Milestone 1 - Formalizar summaries canonicamente parseaveis das fases faltantes
  - Entregavel: novos tipos/resumos dedicados para `spec-triage`, `spec-close-and-version` e `spec-audit`, mais blocos parseaveis minimos nos prompts dessas etapas.
  - Evidencia de conclusao: o runner deixa de depender de `details` para resumir essas fases e os prompts expõem sinal estruturado minimo por etapa.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `prompts/01-avaliar-spec-e-gerar-tickets.md`
    - `prompts/05-encerrar-tratamento-spec-commit-push.md`
    - `prompts/08-auditar-spec-apos-run-all.md`
- Milestone 2 - Preservar snapshots estruturados no checkpoint pre-`/run_all`
  - Entregavel: `RunSpecsTriageLifecycleEvent` (ou equivalente) carrega snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective`, preservando o melhor estado concluido em sucesso, `NO_GO` e falha tecnica.
  - Evidencia de conclusao: testes de runner cobrem caminho feliz, `NO_GO` e falha tecnica pre-`/run_all` com asserts nos campos minimos do milestone.
  - Arquivos esperados:
    - `src/core/runner.ts`
    - `src/core/runner.test.ts`
- Milestone 3 - Enriquecer o resumo final sem assumir o redesign editorial
  - Entregavel: `RunSpecsFlowSummary` passa a transportar summaries proprios de `spec-triage`, `spec-close-and-version` e `spec-audit`, e as superficies consumidoras sao ajustadas minimamente para aceitar o novo contrato.
  - Evidencia de conclusao: os summaries ficam disponiveis no resumo final e as factories/testes do Telegram continuam operando sobre o caminho central de entrega.
  - Arquivos esperados:
    - `src/types/flow-timing.ts`
    - `src/core/runner.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 4 - Fechar a cobertura observavel dos closure criteria
  - Entregavel: testes automatizados garantem os campos minimos exigidos pelo ticket e preservacao do caminho de entrega Telegram.
  - Evidencia de conclusao: suites focadas e regressao completa passam sem quebra dos contratos de delivery, retry, chunking e logging.
  - Arquivos esperados:
    - `src/core/runner.test.ts`
    - `src/integrations/telegram-bot.test.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RunSpecsTriageLifecycleEvent|RunSpecsFlowSummary|parseSpecAuditStageResult|buildRunSpecsFlowSummary|buildRunSpecsTriageMilestoneMessage|buildRunFlowSummaryMessage" src/core/runner.ts src/types/flow-timing.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para reconfirmar os pontos de alteracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/types/flow-timing.ts` para introduzir interfaces tipadas de summary para `spec-triage`, `spec-close-and-version` e `spec-audit`, e para estender `RunSpecsFlowSummary` com esses blocos.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para estender `RunSpecsTriageLifecycleEvent` com snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective` (ou contrato equivalente) e para propagar os novos summaries em `buildRunSpecsFlowSummary(...)` e nas funcoes de clone.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `prompts/01-avaliar-spec-e-gerar-tickets.md` para adicionar um bloco parseavel minimo da etapa `spec-triage`, contendo ao menos status observavel da spec, impacto sobre o pacote derivado e resumo curto.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `prompts/05-encerrar-tratamento-spec-commit-push.md` para adicionar um bloco parseavel minimo da etapa `spec-close-and-version`, contendo ao menos confirmacao de fechamento/versionamento, principal resultado observavel e resumo curto.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `prompts/08-auditar-spec-apos-run-all.md` e em `src/core/runner.ts` para enriquecer `[[SPEC_AUDIT_RESULT]]` com o resumo funcional minimo do audit e permitir parse deterministico no runner.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.ts` para:
   - parsear os novos blocos de `spec-triage` e `spec-close-and-version`;
   - preencher `spec-triage`, `spec-close-and-version` e `spec-audit` em `RunSpecsFlowSummary`;
   - preservar snapshots de `spec-ticket-validation` e `spec-ticket-derivation-retrospective` no milestone de triagem em sucesso, `NO_GO` e falha tecnica pre-`/run_all`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts` para cobrir:
   - milestone de triagem em sucesso com snapshot funcional completo;
   - milestone em `NO_GO` preservando o melhor snapshot disponivel;
   - milestone em falha tecnica pre-`/run_all` preservando snapshot parcial valido;
   - resumo final com summaries dedicados de `spec-triage`, `spec-close-and-version` e `spec-audit`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` e `src/integrations/telegram-bot.test.ts` apenas no minimo necessario para aceitar o novo shape do contrato e manter as assercoes de entrega central, sem antecipar o redesign editorial do ticket irmao.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar diretamente os closure criteria deste ticket.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para confirmar que os novos contratos nao quebraram suites correlatas do runner.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem dos contratos compartilhados apos o enriquecimento.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir compilacao do fluxo completo.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- prompts/01-avaliar-spec-e-gerar-tickets.md prompts/05-encerrar-tratamento-spec-commit-push.md prompts/08-auditar-spec-apos-run-all.md src/types/flow-timing.ts src/core/runner.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts` para auditoria final de escopo e rastreabilidade.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-03, RF-04, RF-05, RF-06; CA-01, CA-02
    - Evidencia observavel: `RunSpecsTriageLifecycleEvent` ou contrato equivalente passa a carregar snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective`; os testes do runner cobrem sucesso, `NO_GO` e falha tecnica pre-`/run_all`, verificando que o milestone preserva o melhor snapshot disponivel e expoe em `spec-ticket-validation` ao menos `verdict`, `confidence`, `finalReason`, `cyclesExecuted` e `summary`, e em `spec-ticket-derivation-retrospective` ao menos `decision`, `reviewedGapHistoryDetected`, `summary` e, quando houver analise estruturada, `classification` e `confidence`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - Esperado: os testes de `requestRunSpecs` ficam verdes com asserts explicitos sobre os campos minimos do milestone em sucesso, bloqueio por `NO_GO` e falha tecnica pre-`/run_all`.
  - Requisito: RF-08, RF-09, RF-10, RF-11, RF-12; CA-04, CA-10
    - Evidencia observavel: `RunSpecsFlowSummary` ou contrato equivalente passa a expor summaries proprios para `spec-triage`, `spec-close-and-version` e `spec-audit`, com asserts objetivos nos testes de runner para os campos minimos exigidos; o `spec-triage` comunica o efeito observavel sobre a spec e o pacote derivado, o `spec-close-and-version` comunica se o fechamento/versionamento esperado foi concluido e seu principal resultado observavel, e o `spec-audit` comunica o status dos gaps residuais e o efeito funcional da auditoria.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes ficam verdes validando a presenca e os campos minimos dos summaries de `spec-triage`, `spec-close-and-version` e `spec-audit` no contrato final, sem depender apenas de nome de fase e timing.
  - Requisito: RF-23; CA-09
    - Evidencia observavel: o envio continua passando por `TelegramDeliveryService` e pelas policies atuais; os testes de entrega/retry/chunking/logging existentes seguem cobrindo o caminho central sem regressao mesmo apos o enriquecimento contratual.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: assercoes de envio de milestone e resumo final continuam verdes, sem trocar o caminho central de entrega nem perder retry, chunking ou logging observavel.
- Sustentacao obrigatoria dos criterios acima:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: a suite completa passa, sustentando que o contrato novo nao introduziu regressao lateral nos fluxos do runner.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: a tipagem valida que o novo contrato foi propagado por todas as superficies consumidoras relevantes.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: a build conclui com sucesso, confirmando que os novos tipos/prompts/consumidores ficaram consistentes no fluxo completo.

## Idempotence and Recovery
- Idempotencia:
  - rerodar os parsers e testes nao deve criar efeitos colaterais fora do working tree local;
  - reexecutar a rodada de implementacao deve manter um unico contrato canonico por etapa, sem duplicar summaries ou blocos parseaveis.
- Riscos:
  - alterar os prompts `spec-triage` e `spec-close-and-version` sem fechar simultaneamente o parser no runner pode quebrar o contrato da etapa;
  - o resumo contratual deste ticket pode vazar para o escopo do ticket editorial irmao se `telegram-bot.ts` for redesenhado demais;
  - falhas pre-`/run_all` podem continuar degradando para `details` se o runner nao preservar explicitamente o ultimo snapshot valido.
- Recovery / Rollback:
  - implementar primeiro os tipos e parsers aceitando o novo bloco, depois atualizar os prompts e por ultimo tornar os testes estritos, evitando janela longa com contrato quebrado;
  - se o parse de uma etapa nova ficar instavel, manter a mudanca isolada ao prompt/parser daquela etapa e restaurar temporariamente o comportamento anterior antes de prosseguir com as demais;
  - se `telegram-bot.ts` comecar a assumir layout editorial fora do recorte, reduzir a adaptacao ao minimo necessario para compilar e preservar a entrega robusta, empurrando o restante para o ticket irmao.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md`
- Ticket correlato fora do escopo direto:
  - `tickets/open/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`
- Referencias obrigatorias consumidas no planejamento:
  - `PLANS.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/05-encerrar-tratamento-spec-commit-push.md`
  - `prompts/08-auditar-spec-apos-run-all.md`
  - `src/core/runner.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Nota de qualidade: o checklist de `docs/workflows/codex-quality-gates.md` foi aplicado na criacao deste plano, e a matriz de validacao acima foi derivada diretamente dos closure criteria do ticket, nao de checklist generico.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `RunSpecsTriageLifecycleEvent` em `src/core/runner.ts`;
  - novos summaries tipados de `spec-triage`, `spec-close-and-version` e `spec-audit` em `src/types/flow-timing.ts`;
  - `RunSpecsFlowSummary` e helpers de clone/construcao em `src/core/runner.ts`;
  - contratos parseaveis das etapas `spec-triage`, `spec-close-and-version` e `spec-audit` nos prompts correspondentes.
- Compatibilidade:
  - o fluxo sequencial de `/run_specs` permanece inalterado;
  - o caminho de entrega Telegram continua centralizado em `TelegramDeliveryService` e suas policies atuais;
  - o ticket editorial irmao passa a consumir um contrato mais rico, sem depender de deducoes por `details`.
- Dependencias externas e mocks:
  - testes do runner continuam dependendo dos stubs/mocks locais de Codex e dos outputs dos prompts de etapa;
  - testes do Telegram continuam usando mocks locais de envio, sem rede real.
