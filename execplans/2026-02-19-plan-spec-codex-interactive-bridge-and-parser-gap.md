# ExecPlan - Bridge interativa do Codex em /plan e parser conversacional

## Purpose / Big Picture
- Objetivo: implementar a ponte interativa com Codex CLI em modo `/plan` e o parser conversacional necessario para perguntas de desambiguacao e finalizacao do planejamento de spec via Telegram.
- Resultado esperado:
  - o fluxo `/plan_spec` consegue manter conversa interativa real com Codex (stream/TTY), sem fallback para execucao batch quando a sessao falhar;
  - perguntas parseadas geram botoes inline e continuam aceitando resposta por texto livre;
  - bloco final parseavel gera acoes `Criar spec`, `Refinar`, `Cancelar`;
  - quando parsing seguro nao for possivel, o bot repassa saida saneada e acionavel.
- Escopo:
  - adicionar bridge interativa no cliente Codex para sessao stateful em `/plan`.
  - tratar prompt inicial de confianca de diretorio automaticamente para o projeto ativo.
  - definir parser de blocos estruturados (pergunta e finalizacao), com fallback seguro para raw output saneado.
  - integrar callbacks Telegram para opcoes de pergunta e acoes finais do planejamento.
  - garantir semantica de falha explicita (retry orientado, sem fallback backend).
  - cobrir CAs deste ticket: CA-07, CA-08, CA-09, CA-10, CA-19, CA-20.
- Fora de escopo:
  - ciclo de vida completo da sessao (`/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel`, timeout, bloqueios globais), tratado no ticket `tickets/open/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md`.
  - materializacao da spec, commit/push e trilha `spec_planning/*`, tratados no ticket `tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`.
  - cobertura end-to-end completa da jornada `/plan_spec`, tratada no ticket `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`.

## Progress
- [x] 2026-02-19 21:46Z - Planejamento inicial concluido com leitura integral do ticket alvo, `PLANS.md`, spec e referencias de codigo.
- [x] 2026-02-19 21:33Z - Contrato da sessao interativa Codex e parser estruturado definidos.
- [x] 2026-02-19 21:33Z - Bridge interativa `/plan` com auto-trust de diretorio implementada.
- [x] 2026-02-19 21:33Z - Integracao Telegram para opcoes parseadas e acoes finais implementada.
- [x] 2026-02-19 21:33Z - Tratamento de falhas/parsing bruto saneado validado em testes.
- [x] 2026-02-19 21:33Z - Validacao final (`test`, `check`, `build`) e rastreabilidade na spec atualizadas.

## Surprises & Discoveries
- 2026-02-19 21:46Z - `src/integrations/codex-client.ts` hoje opera apenas em modo batch via `codex exec` com escrita unica em `stdin`, sem API de sessao interativa.
- 2026-02-19 21:46Z - `src/integrations/telegram-bot.ts` possui handler de callback apenas para namespace `projects:*`; nao existe parser/roteador para decisoes de planejamento.
- 2026-02-19 21:46Z - Nao ha contrato atual para distinguir output parseavel vs raw output saneado no contexto conversacional.
- 2026-02-19 21:46Z - A especificacao distribui a jornada `/plan_spec` em 4 tickets; este plano precisa explicitar fronteira para evitar sobreposicao com ciclo de vida e materializacao da spec.

## Decision Log
- 2026-02-19 - Decisao: introduzir API dedicada para sessao interativa no cliente Codex, separada de `runStage`/`runSpecStage` batch.
  - Motivo: manter compatibilidade com o fluxo atual de tickets/specs enquanto adiciona conversa stateful para `/plan_spec`.
  - Impacto: altera contrato em `src/integrations/codex-client.ts` e adiciona implementacao/testes especificos da sessao interativa.
- 2026-02-19 - Decisao: parser estruturado com estrategia fail-safe (`parsed-question`, `parsed-final`, `raw-sanitized`, `fatal-error`).
  - Motivo: cumprir RF-13/RF-15/RF-24 sem esconder respostas quando o formato vier fora do esperado.
  - Impacto: novo modulo de parser e cobertura com fixtures de saida parcial/ruidosa.
- 2026-02-19 - Decisao: sem fallback automatico para caminho nao interativo em qualquer erro de sessao.
  - Motivo: requisito explicito do ticket/spec (RF-23, CA-19).
  - Impacto: falhas interrompem a sessao com mensagem de retry acionavel e log estruturado.
- 2026-02-19 - Decisao: callbacks de planejamento usarao namespace proprio no Telegram (ex.: `plan-spec:*`) para coexistir com `projects:*`.
  - Motivo: evitar colisao de parse e preservar auditoria de acesso por callback.
  - Impacto: `telegram-bot.ts` e `telegram-bot.test.ts` passam a rotear mais de um namespace de callback.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada para o escopo deste ticket.
- O que funcionou: sessao interativa dedicada no cliente Codex, parser fail-safe de blocos estruturados e callbacks `plan-spec:*` no Telegram foram implementados sem regressao do fluxo sequencial atual.
- O que ficou pendente: ciclo de vida completo de `/plan_spec` (comandos/status/cancel/timeout) e materializacao/commit da spec seguem nos tickets dedicados.
- Proximos passos: executar os tickets de ciclo de vida e de materializacao para fechar jornada completa de `/plan_spec`.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/codex-client.ts` - cliente atual do Codex (somente batch) e ponto natural para novo contrato interativo.
  - `src/integrations/codex-client.test.ts` - base de testes para evoluir o contrato do cliente.
  - `src/integrations/telegram-bot.ts` - parsing/roteamento de callbacks e respostas do bot.
  - `src/integrations/telegram-bot.test.ts` - cobertura de comandos e callback query.
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` - fonte dos RFs/CAs desta entrega.
- Fluxo atual:
  - bot controla `/run_all`, `/run_specs`, projetos e status;
  - cliente Codex executa prompts unicos por etapa (`plan`, `implement`, `close-and-version`, `spec-*`);
  - nao existe sessao conversacional persistente para `/plan_spec`.
- Restricoes tecnicas:
  - manter arquitetura em camadas (`src/core`, `src/integrations`, `src/config`).
  - manter processamento sequencial e sem paralelizacao de tickets.
  - nao introduzir fallback silencioso quando interacao falhar.

## Plan of Work
- Milestone 1: Contrato interativo Codex definido e isolado do fluxo batch.
  - Entregavel: interface para iniciar/encerrar sessao `/plan`, enviar input do usuario e receber eventos de output incremental.
  - Evidencia de conclusao: diff em `src/integrations/codex-client.ts` (ou modulo dedicado) com tipos de evento e erros de sessao.
  - Arquivos esperados: `src/integrations/codex-client.ts`, possivelmente `src/types/plan-spec-session.ts`.
- Milestone 2: Bridge interativa `/plan` com auto-trust de diretorio.
  - Entregavel: integracao que abre sessao interativa do Codex, envia `/plan` literal, detecta prompt de confianca de diretorio e responde automaticamente para o projeto ativo.
  - Evidencia de conclusao: testes simulando stream inicial e confirmando auto-resposta de trust + continuidade da sessao.
  - Arquivos esperados: `src/integrations/codex-client.ts`, possivelmente `src/integrations/codex-plan-session.test.ts`.
- Milestone 3: Parser estruturado de perguntas/finalizacao + fallback raw saneado.
  - Entregavel: parser capaz de extrair pergunta/opcoes e bloco final (titulo/resumo/acoes), com downgrade controlado para raw saneado quando formato nao for seguro.
  - Evidencia de conclusao: testes de parser cobrindo input valido, input parcial/ruidoso e input invalido.
  - Arquivos esperados: `src/integrations/plan-spec-parser.ts` (novo), `src/integrations/plan-spec-parser.test.ts` (novo).
- Milestone 4: Integracao Telegram para opcoes clicaveis, texto livre e acoes finais.
  - Entregavel: bot renderiza teclado inline para pergunta parseada, aceita clique e texto livre no mesmo contexto, e publica botoes finais `Criar spec`, `Refinar`, `Cancelar`.
  - Evidencia de conclusao: testes de callback/texto cobrindo CA-07, CA-08, CA-09 e CA-10.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5: Falha acionavel sem fallback + rastreabilidade de spec.
  - Entregavel: falha interativa encerra com orientacao de retry sem chamar backend alternativo; resposta nao parseavel e repassada saneada; spec atualizada com evidencias.
  - Evidencia de conclusao: testes e busca textual mostrando ausencia de fallback automatico e atualizacao de `Status de atendimento`.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/telegram-bot.ts`, `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "runStage|runSpecStage|codex exec|callback_query|projects:" src/integrations/codex-client.ts src/integrations/telegram-bot.ts src/integrations/*.test.ts` para mapear pontos de edicao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para introduzir contrato de sessao interativa `/plan` (start/send/cancel + eventos).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar parser estruturado em `src/integrations/plan-spec-parser.ts` via `$EDITOR ...` com estrategia de parsing incremental e saneamento de raw output.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Integrar parser e bridge no cliente interativo via `$EDITOR src/integrations/codex-client.ts`, incluindo auto-tratamento do prompt de confianca de diretorio.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/integrations/telegram-bot.ts` via `$EDITOR ...` para rotear callback namespace de planejamento (`plan-spec:*`), renderizar opcoes parseadas e acoes finais.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir no bot mensagem de erro acionavel para falha interativa e envio de raw saneado quando parsing seguro falhar.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar/criar testes via `$EDITOR src/integrations/codex-client.test.ts`, `$EDITOR src/integrations/plan-spec-parser.test.ts` e `$EDITOR src/integrations/telegram-bot.test.ts` cobrindo CAs do ticket.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts src/integrations/telegram-bot.test.ts` para validacao focada.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` via `$EDITOR ...` com evidencias de atendimento deste ticket (RFs/CAs aplicaveis).
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "plan-spec-codex-interactive-bridge-and-parser-gap|CA-07|CA-08|CA-09|CA-10|CA-19|CA-20|Last reviewed at" docs/specs/2026-02-19-telegram-plan-spec-conversation.md` para checagem final de rastreabilidade.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/integrations/codex-client.ts src/integrations/telegram-bot.ts src/integrations/*.test.ts docs/specs/2026-02-19-telegram-plan-spec-conversation.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/plan-spec-parser.test.ts`
  - Esperado: parser identifica bloco de pergunta (opcoes) e bloco final (titulo/resumo/acoes), e sinaliza fallback raw saneado quando necessario.
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: sessao interativa envia `/plan`, trata prompt de confianca de diretorio e em erro retorna falha acionavel sem fallback para `runStage` batch.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: pergunta parseada gera teclado inline (CA-07), texto livre continua aceito no mesmo contexto (CA-08), bloco final gera `Criar spec`/`Refinar`/`Cancelar` (CA-09), `Refinar` retorna ao ciclo sem criar arquivo (CA-10).
- Comando: `rg -n "fallback|runStage\(\"plan\"|plan-spec:" src/integrations/codex-client.ts src/integrations/telegram-bot.ts`
  - Esperado: fluxo interativo dedicado identificado; ausencia de fallback automatico para backend nao interativo em falhas de sessao (CA-19).
- Comando: `npm test && npm run check && npm run build`
  - Esperado: suite completa verde, sem regressao no fluxo sequencial atual.
- Comando: `rg -n "CA-07|CA-08|CA-09|CA-10|CA-19|CA-20" docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - Esperado: status da spec atualizado com rastreabilidade objetiva para este ticket.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar parsing sobre o mesmo chunk deve produzir o mesmo estado/resultado sem duplicar eventos finais;
  - reexecutar testes e validacoes de build/tipagem nao gera efeito colateral de runtime.
- Riscos:
  - variacao de output do Codex interativo quebrar parse estrito;
  - exigencia real de TTY para certos prompts interativos;
  - overlap com ticket de ciclo de vida se interfaces de sessao nao forem estabilizadas antes.
- Recovery / Rollback:
  - isolar bridge interativa em adaptador para rollback rapido sem tocar fluxo batch existente;
  - em erro de parser, usar caminho `raw-sanitized` em vez de abortar prematuramente;
  - em falha de sessao, encerrar contexto ativo com mensagem de retry e log detalhado para reabertura manual;
  - se houver bloqueio por dependencia de ciclo de vida, congelar merge desta entrega ate alinhar contrato unico de sessao.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-plan-spec-codex-interactive-bridge-and-parser-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.
- Tickets relacionados:
  - `tickets/open/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md`
  - `tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`
  - `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`
- Evidencias tecnicas usadas no planejamento:
  - `src/integrations/codex-client.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/telegram-bot.test.ts`
- Comandos de validacao previstos:
  - `npx tsx --test src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts src/integrations/telegram-bot.test.ts`
  - `npm test`
  - `npm run check`
  - `npm run build`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `CodexTicketFlowClient` (ou interface adjacente) para suportar sessao interativa de planejamento (`start/send/cancel` + eventos estruturados).
  - `TelegramController` para rotear callbacks de planejamento e responder a eventos parseados/falhas do parser.
  - tipos de evento de planejamento (pergunta/finalizacao/raw/falha) para desacoplamento entre bridge e camada Telegram.
- Compatibilidade:
  - fluxo atual `plan -> implement -> close-and-version` para tickets permanece inalterado.
  - nenhuma paralelizacao de tickets deve ser introduzida.
  - comportamento de bloqueio global de comandos fica sob responsabilidade do ticket de ciclo de vida; este plano apenas consome esse estado/contrato.
- Dependencias externas e mocks:
  - dependencia operacional principal: Codex CLI em modo interativo.
  - testes devem usar doubles de processo/stream para evitar chamadas reais ao Codex/Telegram.
  - se PTY real for indispensavel, avaliar dependencia minima e isola-la atras de adaptador testavel.
