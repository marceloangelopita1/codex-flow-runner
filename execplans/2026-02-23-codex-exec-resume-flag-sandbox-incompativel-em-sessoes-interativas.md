# ExecPlan - Compatibilizar full access no `codex exec resume` em sessoes interativas

## Purpose / Big Picture
- Objetivo: corrigir o contrato de argumentos de `codex exec resume` para evitar erro de parser na segunda interacao de `/codex_chat` e `/plan_spec`, preservando o modo de execucao com full access por chamada.
- Resultado esperado:
  - a segunda (e demais) interacoes em `/codex_chat` nao falham com `unexpected argument '-s'`;
  - o caminho de resume de `/plan_spec` permanece funcional e com continuidade por `thread_id`;
  - os builders de argumentos deixam explicita a diferenca entre `exec` inicial e `exec resume`;
  - testes automatizados congelam o contrato de flags validas para resume.
- Escopo:
  - ajustar builders de argumentos de resume em `src/integrations/codex-client.ts`;
  - atualizar testes em `src/integrations/codex-client.test.ts` para validar contrato de resume sem `-s`;
  - validar regressao de fluxo com testes do runner/bot.
- Fora de escopo:
  - alteracoes de UX, comandos ou lifecycle de sessao fora do necessario para corrigir o parser error;
  - mudancas de arquitetura do runner;
  - fechamento do ticket, commit/push.

## Progress
- [x] 2026-02-23 12:07Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md` e referencias tecnicas.
- [x] 2026-02-23 12:07Z - Contrato atual da CLI validado localmente com `codex exec resume --help` (sem `-s/--sandbox` no subcomando).
- [x] 2026-02-23 - Implementacao do ajuste de argumentos de resume concluida em `src/integrations/codex-client.ts`.
- [x] 2026-02-23 - Cobertura automatizada do contrato de resume atualizada e validada em `src/integrations/codex-client.test.ts`.
- [x] 2026-02-23 - Validacao final automatizada concluida (`npx tsx --test src/integrations/codex-client.test.ts`, `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm run check && npm run build`).
- [x] 2026-02-23 12:11Z - Validacao manual local adicional concluida com `codex exec` + `codex exec resume` real sem `unexpected argument '-s'`.
- [ ] 2026-02-23 - Validacao manual em ambiente Telegram pendente (segundo turno de `/codex_chat` e `/plan_spec`).
- [x] 2026-02-23 12:11Z - Gate de fechamento do ticket classificado como `NO_GO`; follow-up `P0` aberto para aceite operacional em Telegram.

## Surprises & Discoveries
- 2026-02-23 12:07Z - `codex exec resume --help` nao lista `-s/--sandbox` nem `-a` como opcoes do subcomando; `--dangerously-bypass-approvals-and-sandbox` continua disponivel.
- 2026-02-23 12:07Z - Os dois builders de resume reaproveitam `CODEX_SANDBOX_FULL_ACCESS_ARGS` hoje, o que explica o erro recorrente em segundo turno.
- 2026-02-23 12:07Z - A suite atual valida uso de `resume` e continuidade por `thread_id`, mas nao protege explicitamente contra injetar flag invalida no caminho de resume.

## Decision Log
- 2026-02-23 - Decisao: separar contrato de flags entre `exec` inicial e `exec resume`.
  - Motivo: o subcomando resume tem conjunto de opcoes diferente; reutilizar `-s danger-full-access` quebra parsing.
  - Impacto: criacao de constante/estrategia especifica para resume em `codex-client.ts`.
- 2026-02-23 - Decisao: usar no resume uma flag de full access compativel com a ajuda atual da CLI (`--dangerously-bypass-approvals-and-sandbox`), mantendo `-a never` no prefixo global ja existente.
  - Motivo: preservar operacao em full access sem usar opcoes invalidas para o subcomando.
  - Impacto: altera apenas o caminho de resume (`/codex_chat` e `/plan_spec`), sem mexer no `exec` inicial.
- 2026-02-23 - Decisao: expandir testes para verificar explicitamente ausencia de `-s` e presenca da flag valida no resume.
  - Motivo: evitar regressao silenciosa em futuros refactors de argumentos.
  - Impacto: ajustes pontuais em `src/integrations/codex-client.test.ts`.

## Outcomes & Retrospective
- Status atual: implementacao concluida com validacoes automatizadas e validacao manual local; fechamento do ticket original classificado como `NO_GO` por pendencia de aceite em Telegram.
- O que funcionou: separacao de contrato entre `exec` inicial (`-s danger-full-access`) e `exec resume` (`--dangerously-bypass-approvals-and-sandbox`) sem alterar lifecycle das sessoes.
- O que ficou pendente: execucao manual de dois turnos reais em `/codex_chat` e `/plan_spec` no bot para confirmar ausencia de parser error no ambiente operacional.
- Proximos passos: executar validacao manual no Telegram via follow-up `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume.md` e concluir aceite operacional.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/codex-client.ts:255`
  - `src/integrations/codex-client.ts:266`
  - `src/integrations/codex-client.ts:668`
  - `src/integrations/codex-client.ts:914`
  - `src/integrations/codex-client.test.ts:333`
  - `src/integrations/codex-client.test.ts:510`
  - `tickets/closed/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
- Fluxo atual:
  - turno inicial de `/codex_chat` e `/plan_spec` usa `codex exec ... --json` com `-s danger-full-access`;
  - turnos seguintes usam `codex exec resume ... --json` e hoje tambem recebem `-s danger-full-access`;
  - no `codex-cli 0.104.0`, esse `-s` em `resume` causa falha de parser com codigo 2.
- Restricoes tecnicas:
  - manter fluxo sequencial do projeto;
  - nao introduzir novas dependencias;
  - preservar contrato funcional de sessoes interativas (mesmo `thread_id`, mesmas callbacks/eventos).

## Plan of Work
- Milestone 1 - Contrato de resume compativel com CLI.
  - Entregavel: estrategia explicita de argumentos para `exec resume` sem `-s`.
  - Evidencia de conclusao: builders de resume nao incluem `CODEX_SANDBOX_FULL_ACCESS_ARGS` e incluem flag valida para full access no resume.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 2 - Aplicacao do ajuste nos dois fluxos interativos.
  - Entregavel: `/plan_spec` e `/codex_chat` compartilham contrato corrigido de resume.
  - Evidencia de conclusao: chamadas a partir de `executeTurn` (plan/chat) geram args compativeis no segundo turno.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 3 - Hardening de testes de contrato de argumentos.
  - Entregavel: testes de sessao interativa validam explicitamente `resume` sem `-s` e com flag de full access suportada.
  - Evidencia de conclusao: falha automatica se `-s` reaparecer no resume.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`.
- Milestone 4 - Validacao de regressao funcional.
  - Entregavel: suite focada + regressao do runner/bot verde.
  - Evidencia de conclusao: comandos de teste executados com sucesso e sem quebra de lifecycle.
  - Arquivos esperados: sem novos arquivos alem dos alterados acima.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec --help && codex exec resume --help` para registrar contrato atual de flags.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "buildFreeChatExecResumeArgs|buildPlanSpecExecResumeArgs|CODEX_SANDBOX_FULL_ACCESS_ARGS" src/integrations/codex-client.ts` para mapear pontos de ajuste.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` para introduzir args especificos de full access no caminho `exec resume`, sem `-s`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir que `buildFreeChatExecResumeArgs` e `buildPlanSpecExecResumeArgs` usem somente opcoes aceitas por `codex exec resume` (incluindo `--json` e `--skip-git-repo-check`).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Preservar `build*ExecStartArgs` com contrato atual de `exec` inicial, evitando mudanca desnecessaria fora do bug.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` para adicionar asserts de contrato de args no segundo turno de `startPlanSession`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` para adicionar asserts de contrato de args no segundo turno de `startFreeChatSession`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts` para validar cobertura focada do cliente.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar regressao de lifecycle/UX de erro.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para validar tipagem e build.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/codex-client.ts src/integrations/codex-client.test.ts` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: testes de `startPlanSession` e `startFreeChatSession` passam e comprovam resume sem `-s`.
- Comando: `rg -n "\"resume\"|dangerously-bypass-approvals-and-sandbox|-s\"|CODEX_SANDBOX_FULL_ACCESS_ARGS" src/integrations/codex-client.ts`
  - Esperado: builders de resume mostram flag compativel com resume e nao reutilizam `-s` no resume.
- Comando: `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: sem regressao de fase/status/mensagens de `/plan_spec` e `/codex_chat`.
- Comando: `npm run check && npm run build`
  - Esperado: sem erros de tipo e build concluida.
- Comando manual: iniciar `/codex_chat`, enviar duas mensagens seguidas no mesmo chat.
  - Esperado: segundo turno responde normalmente (sem `unexpected argument '-s'`) e preserva contexto.
- Comando manual: iniciar `/plan_spec`, enviar brief inicial e uma segunda mensagem de refinamento.
  - Esperado: `resume` funciona sem parser error e a sessao segue ativa.

## Idempotence and Recovery
- Idempotencia:
  - reaplicar mensagens em sessoes existentes continua usando o mesmo `thread_id` e nao cria sessao paralela;
  - reexecucao da suite de testes nao gera efeitos colaterais de estado persistente no repositorio.
- Riscos:
  - divergencia futura de flags suportadas por novas versoes do Codex CLI;
  - ajuste aplicado em apenas um builder de resume (plan ou chat), deixando regressao parcial;
  - cobertura de teste insuficiente para proteger ordem/presenca de argumentos criticos.
- Recovery / Rollback:
  - rollback localizado em `src/integrations/codex-client.ts` (builders de resume) sem tocar no runner;
  - manter asserts de contrato nos testes para detectar imediatamente retorno de flag invalida;
  - se a flag de full access escolhida para resume se mostrar incompativel em ambiente alvo, trocar para alternativa suportada documentada pelo `codex exec resume --help` e atualizar testes no mesmo changeset.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md`
- Evidencias tecnicas usadas no planejamento:
  - `src/integrations/codex-client.ts:255`
  - `src/integrations/codex-client.ts:266`
  - `src/integrations/codex-client.ts:668`
  - `src/integrations/codex-client.ts:914`
  - `src/integrations/codex-client.test.ts:333`
  - `src/integrations/codex-client.test.ts:510`
  - saida local de `codex exec resume --help` (2026-02-23) confirmando ausencia de `-s/--sandbox` no subcomando.
- Artefatos relacionados:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `tickets/closed/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md`
  - `PLANS.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato interno de montagem de args para `runCodexExecJsonCommand` em sessoes interativas de resume.
- Compatibilidade:
  - interface publica `CodexTicketFlowClient` permanece inalterada;
  - comportamento esperado de callbacks/eventos de `/plan_spec` e `/codex_chat` deve permanecer igual.
- Dependencias externas e mocks:
  - dependencia principal: binario `codex` (CLI) com suporte a `exec`, `exec resume`, `--json`;
  - testes continuam usando mocks/stubs de `runCodexExecJsonCommand`, sem necessidade de chamada real ao Telegram.
