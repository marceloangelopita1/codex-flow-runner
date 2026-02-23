# ExecPlan - Timeout de inatividade do /codex_chat contado apenas apos resposta entregue

## Purpose / Big Picture
- Objetivo: corrigir o timeout de inatividade de `/codex_chat` para nao encerrar sessao enquanto o runner estiver em processamento ativo da resposta do Codex.
- Resultado esperado:
  - o timeout de 10 minutos passa a contar somente no estado `waiting-user` (apos resposta processada/encaminhada ao operador);
  - enquanto a sessao estiver em `waiting-codex`, o timeout de inatividade do operador nao finaliza a sessao;
  - logs e status deixam explicito quando a janela de inatividade do operador esta ativa;
  - o comportamento fica coberto por testes automatizados de lifecycle.
- Escopo:
  - ajustar a orquestracao de timeout em `src/core/runner.ts` para separar "espera do operador" de "processamento do Codex";
  - ajustar estado/observabilidade para evidenciar o marco de inicio da inatividade do operador;
  - atualizar cobertura em `src/core/runner.test.ts` e, se necessario, `src/integrations/telegram-bot.test.ts`.
- Fora de escopo:
  - alterar valor do timeout (continua 10 minutos);
  - alterar fluxo `/plan_spec`;
  - introduzir paralelizacao de tickets/sessoes;
  - mudar contratos de comando do Telegram alem do necessario para observabilidade de timeout.

## Progress
- [x] 2026-02-23 15:50Z - Planejamento inicial concluido com leitura de ticket, `PLANS.md`, spec e mapeamento do fluxo atual em `runner`/testes.
- [x] 2026-02-23 15:57Z - Semantica de timeout por fase (`waiting-user` vs `waiting-codex`) implementada no core.
- [x] 2026-02-23 15:57Z - Estado e status de `/codex_chat` atualizados para refletir inicio da janela de inatividade do operador.
- [x] 2026-02-23 15:57Z - Cobertura automatizada de regressao de timeout durante processamento longo adicionada e verde.
- [ ] 2026-02-23 15:57Z - Validacao manual no Telegram com evidencia temporal concluida.
- [x] 2026-02-23 15:57Z - Validacao final (`check`, `test`, `build`) concluida sem regressoes.

## Surprises & Discoveries
- 2026-02-23 15:50Z - O timeout de `/codex_chat` e rearmado em `setCodexChatPhase(...)` e tambem em `handleCodexChatSessionEvent(...)`, mantendo contador ativo inclusive durante `waiting-codex` (`src/core/runner.ts`).
- 2026-02-23 15:50Z - O teste atual de timeout de `/codex_chat` cobre sessao ociosa apos start, mas nao cobre processamento longo em `waiting-codex` (`src/core/runner.test.ts`).
- 2026-02-23 15:50Z - O `/status` exibe `lastActivityAt` e atividade do Codex, mas nao explicita claramente o timestamp-base do timeout de inatividade do operador (`src/integrations/telegram-bot.ts`).

## Decision Log
- 2026-02-23 - Decisao: tratar timeout de `/codex_chat` como inatividade do operador apenas quando a sessao estiver em `waiting-user`.
  - Motivo: alinhar comportamento observado com expectativa do ticket (nao expirar durante processamento ativo do runner).
  - Impacto: controle de timer passa a depender explicitamente da fase da sessao.
- 2026-02-23 - Decisao: registrar no estado o marco temporal da janela de inatividade do operador (ex.: `userInactivitySinceAt`) e refletir no status.
  - Motivo: facilitar validacao operacional com timestamps e reduzir ambiguidade de diagnostico.
  - Impacto: evolucao de `src/types/state.ts`, clone em `getState` e asserts de status.
- 2026-02-23 - Decisao: adicionar teste de regressao para garantir que timeout nao dispara em `waiting-codex` mesmo com processamento longo e sem saida intermediaria.
  - Motivo: prevenir retorno do bug em refatoracoes futuras.
  - Impacto: novos cenarios em `src/core/runner.test.ts` com timer controlado.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada automaticamente; validacao manual Telegram pendente.
- O que funcionou: separacao explicita da janela de inatividade do operador (`userInactivitySinceAt`) e arm/disarm de timeout por fase eliminaram expiracao durante `waiting-codex`.
- O que ficou pendente: validacao manual no Telegram com evidencia temporal e posterior fechamento do ticket em etapa dedicada.
- Proximos passos: executar passo 13 de validacao manual no Telegram e registrar evidencias operacionais antes do fechamento.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - lifecycle da sessao `/codex_chat`, fases, timeout, flush de saida e encerramento.
  - `src/types/state.ts` - contrato de estado da sessao e campos de observabilidade.
  - `src/core/runner.test.ts` - cobertura de timeout, lifecycle e regressao de `/codex_chat`.
  - `src/integrations/telegram-bot.ts` - renderizacao de `/status` e bloco detalhado da sessao `/codex_chat`.
  - `src/integrations/telegram-bot.test.ts` - assert de saida de `/status` para sessao ativa/inativa.
- Fluxo atual:
  - `startCodexChatSession` inicia sessao em `waiting-user` e arma timeout.
  - `submitCodexChatInput` muda para `waiting-codex`.
  - eventos do Codex continuam rearmando timeout, inclusive durante processamento.
  - timeout pode expirar antes do retorno final em cargas longas.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript.
  - preservar fluxo sequencial do runner.
  - nao introduzir dependencias novas.

## Plan of Work
- Milestone 1 - Modelo explicito de inatividade do operador
  - Entregavel: regra formal no core definindo que timeout de inatividade so existe em `waiting-user`.
  - Evidencia de conclusao: codigo em `runner.ts` mostra timer armado/desarmado por fase com logs coerentes.
  - Arquivos esperados: `src/core/runner.ts`.
- Milestone 2 - Estado e observabilidade alinhados ao novo modelo
  - Entregavel: campo temporal de inicio da inatividade do operador e exibicao clara no `/status`.
  - Evidencia de conclusao: `RunnerState` e `/status` expoem timestamp coerente apos resposta entregue.
  - Arquivos esperados: `src/types/state.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`.
- Milestone 3 - Cobertura automatizada de regressao
  - Entregavel: testes cobrindo processamento longo sem timeout indevido e timeout apos retorno ao `waiting-user`.
  - Evidencia de conclusao: novos testes verdes em `runner.test.ts` (e ajustes em `telegram-bot.test.ts` se status mudar).
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Validacao operacional e aceite do ticket
  - Entregavel: roteiro manual no Telegram com evidencia de timestamps e ausencia de timeout durante processamento.
  - Evidencia de conclusao: registro objetivo do cenario reproduzido antes/depois e criterios de fechamento atendidos.
  - Arquivos esperados: logs operacionais e anotacoes no ticket/execucao.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "refreshCodexChatTimeout|setCodexChatPhase|handleCodexChatSessionEvent|handleCodexChatSessionTimeout" src/core/runner.ts` para mapear todos os pontos de arm/disarm do timeout atual.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.ts` para centralizar o controle de timeout de `/codex_chat` por fase, armando somente em `waiting-user` e limpando timer em `waiting-codex`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar transicoes de fase para registrar o marco de inatividade do operador apos resposta encaminhada (e limpar marco durante espera do Codex).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario para observabilidade, evoluir `CodexChatSessionState` em `src/types/state.ts` com campo temporal explicito de inatividade do operador.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir clone correto do novo campo em `getState` dentro de `src/core/runner.ts` para evitar mutacao externa de `Date`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar logs de lifecycle/timeout em `src/core/runner.ts` para registrar fase, `waitingCodexSinceAt` e inicio da inatividade do operador.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.ts` para exibir no `/status` quando a contagem de inatividade esta ativa e desde quando.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar teste em `src/core/runner.test.ts` para provar que sessao em `waiting-codex` nao expira por timeout durante processamento longo.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar teste em `src/core/runner.test.ts` para provar que, apos `turn-complete` + flush para `waiting-user`, o timeout volta a contar e expira apos janela configurada.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar testes de status em `src/integrations/telegram-bot.test.ts` para validar novo bloco temporal de inatividade (se houver mudanca de texto).
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test && npm run build` para regressao completa.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar validacao manual no Telegram:
    - iniciar `/codex_chat`, enviar prompt longo e confirmar ausencia de timeout durante `waiting-codex`;
    - apos resposta final, aguardar janela configurada e confirmar timeout apenas no periodo de espera do operador.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar diff final com `git status --short` e `git diff -- src/core/runner.ts src/types/state.ts src/core/runner.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts`.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: existe cobertura comprovando que timeout nao encerra sessao durante `waiting-codex` e que encerra corretamente apos retorno a `waiting-user`.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: `/status` reflete corretamente fase da sessao e timestamp-base da inatividade do operador.
- Comando: `rg -n "codexChatSessionTimeoutMs|waiting-codex|waiting-user|userInactivitySinceAt|Sessao /codex_chat expirada" src/core/runner.ts src/types/state.ts src/integrations/telegram-bot.ts`
  - Esperado: semantica de timeout por fase e observabilidade temporal estao explicitas no codigo.
- Comando: `npm run check && npm test && npm run build`
  - Esperado: tipagem, suites e build verdes sem regressao de `/plan_spec` e do fluxo sequencial.
- Validacao manual (Telegram):
  - Esperado: prompt longo nao encerra por timeout durante processamento ativo; timeout de 10 minutos ocorre apenas apos resposta final entregue e periodo real de inatividade do operador.

## Idempotence and Recovery
- Idempotencia:
  - repetir comandos de teste/validacao nao altera estado permanente do repositorio;
  - reprocessar mensagens de evento fora de fase nao deve rearmar timeout indevidamente;
  - cancelar sessao apos timeout ou close continua retornando estado seguro (`inactive`).
- Riscos:
  - corrida entre callback de timeout e transicao `waiting-codex -> waiting-user` no flush final;
  - regressao na exibicao de `/status` por mudanca de contrato de estado (`Date | null`);
  - sessao presa indefinidamente se timer for desarmado sem cobertura adequada de cenarios de retorno ao `waiting-user`.
- Recovery / Rollback:
  - centralizar arm/disarm em helper unico no `runner` para facilitar rollback pontual;
  - manter cleanup de timer no `finalizeCodexChatSession` como fonte unica de encerramento seguro;
  - em regressao operacional, permitir recuperacao imediata via `cancelCodexChatSession` e handoff por comando no Telegram.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-02-23-codex-chat-timeout-de-inatividade-conta-durante-runner-ativo.md`
- Spec relacionada:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
- Contexto historico relevante:
  - `execplans/2026-02-21-codex-chat-core-session-lifecycle-and-free-chat-backend-gap.md`
  - `execplans/2026-02-21-codex-chat-observability-status-and-acceptance-coverage-gap.md`
  - `execplans/2026-02-21-codex-chat-resposta-final-unica-e-anti-flood.md`
- Evidencias esperadas apos execucao:
  - logs `Lifecycle /codex_chat` com fase correta e sem timeout durante `waiting-codex`;
  - resultados de testes automatizados;
  - evidencia manual de timestamps no Telegram (`/status` + mensagem de timeout).

## Interfaces and Dependencies
- Interfaces alteradas:
  - estado de sessao de `/codex_chat` em `src/types/state.ts` (campo temporal de inatividade do operador, se adotado);
  - lifecycle interno e timeout de `/codex_chat` em `src/core/runner.ts`.
  - renderizacao de `/status` em `src/integrations/telegram-bot.ts`.
- Compatibilidade:
  - manter comandos e contratos publicos de `/codex_chat` inalterados (`start`, `submit`, `cancel`);
  - manter timeout nominal de 10 minutos e mensagem de encerramento atual;
  - preservar comportamento de `/plan_spec` e de processamento sequencial do runner.
- Dependencias externas e mocks:
  - sem novas dependencias de runtime;
  - testes seguem com stubs/mocks locais do Codex e Telegram.
