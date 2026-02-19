# ExecPlan - Autenticacao obrigatoria via login do Codex CLI (sem fallback CODEX_API_KEY)

## Purpose / Big Picture
- Objetivo: remover o fallback por `CODEX_API_KEY` e tornar obrigatoria a autenticacao do runner via sessao ativa do `codex` CLI (login da conta ChatGPT) antes de iniciar `/run-all`.
- Resultado esperado: o bot so inicia rodada quando o `codex` CLI estiver autenticado; quando nao estiver, falha cedo com mensagem acionavel ao operador (`codex login`) e sem injetar `CODEX_API_KEY`/`OPENAI_API_KEY` no subprocesso.
- Escopo:
  - Remover `CODEX_API_KEY` do contrato obrigatorio de ambiente do app.
  - Eliminar injecao de `CODEX_API_KEY`/`OPENAI_API_KEY` no `spawn` do `codex exec`.
  - Adicionar preflight de autenticacao do CLI antes da rodada (com erro orientativo).
  - Garantir aviso ao usuario via retorno de comando `/run-all` e estado/logs.
  - Atualizar testes e documentacao operacional (README/spec/service).
- Fora de escopo:
  - Implementar fallback para ambientes headless por API key.
  - Alterar semantica de rodada sequencial/fail-fast ja existente.
  - Criar suporte a multiplos provedores de autenticacao.

## Progress
- [x] 2026-02-19 15:58Z - Planejamento inicial concluido com leitura do ticket e referencias.
- [x] 2026-02-19 16:01Z - Contrato de autenticacao do cliente Codex revisado e sem dependencia de `CODEX_API_KEY`.
- [x] 2026-02-19 16:02Z - Preflight de autenticacao integrado ao inicio de `/run-all` com retorno acionavel ao Telegram.
- [x] 2026-02-19 16:03Z - Testes de `codex-client`, `runner` e `telegram-bot` atualizados para os novos contratos.
- [x] 2026-02-19 16:05Z - README/spec/service atualizados e validacao final (`test/check/build`) concluida.

## Surprises & Discoveries
- 2026-02-19 15:49Z - `codex login status` local retorna `Logged in using ChatGPT`; portanto o ambiente suporta execucao sem API key.
- 2026-02-19 15:49Z - `codex exec` falha com `401 Unauthorized` quando `CODEX_API_KEY` invalida e sobrescreve a sessao ativa do CLI.
- 2026-02-19 15:58Z - `TelegramController` hoje so diferencia `/run-all` entre "iniciado" e "ja em execucao", sem canal para motivo de falha de preflight.
- 2026-02-19 15:58Z - `src/core/runner.test.ts` instancia `AppEnv` com `CODEX_API_KEY`; remover o campo exige ajuste de fixture.

## Decision Log
- 2026-02-19 - Decisao: adotar preflight explicito de autenticacao via `codex login status` antes do inicio da rodada.
  - Motivo: falhar cedo com erro acionavel e evitar execucao parcial com erro tardio na primeira etapa.
  - Impacto: contrato do cliente Codex e fluxo de inicio do runner serao ajustados.
- 2026-02-19 - Decisao: remover injecao de `CODEX_API_KEY` e `OPENAI_API_KEY` no subprocesso do `codex exec`.
  - Motivo: impedir que variavel de ambiente invalida sobrescreva sessao ChatGPT valida do CLI.
  - Impacto: construtor do cliente e testes de ambiente capturado precisam ser atualizados.
- 2026-02-19 - Decisao: expor motivo de falha de `/run-all` para o Telegram (nao apenas log interno).
  - Motivo: requisito explicito de "avisar o usuario" quando nao autenticado.
  - Impacto: contrato `BotControls.runAll` deixa de ser booleano e passa a retornar estado de inicio.

## Outcomes & Retrospective
- Status final: execucao concluida para o escopo do plano (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou: migracao para login-only foi aplicada sem regressao no fluxo sequencial; preflight de `/run-all` e resposta acionavel no Telegram ficaram cobertos por teste.
- O que ficou pendente: fechar o ticket e mover `tickets/open -> tickets/closed` no commit de encerramento, conforme regra do repositorio.
- Proximos passos: executar o prompt de fechamento do ticket com commit/push, atualizando metadata de fechamento no proprio ticket.

## Context and Orientation
- Arquivos principais:
  - `src/config/env.ts` - hoje exige `CODEX_API_KEY` obrigatoria.
  - `src/main.ts` - injeta `env.CODEX_API_KEY` no `CodexCliTicketFlowClient`.
  - `src/integrations/codex-client.ts` - injeta `CODEX_API_KEY`/`OPENAI_API_KEY` no `spawn`.
  - `src/core/runner.ts` - controla inicio de rodada (`requestRunAll`) e loop principal.
  - `src/integrations/telegram-bot.ts` - mensagens de `/run-all` ao usuario.
  - `src/integrations/codex-client.test.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts` - contratos afetados.
  - `README.md`, `docs/systemd/codex-flow-runner.service`, `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` - documentacao operacional e rastreabilidade.
- Fluxo atual:
  - `/run-all` inicia rodada sequencial imediatamente.
  - Cada stage chama `codex exec` com env sobrescrita por API key.
  - Falha de autenticacao aparece durante execucao de stage, nao como gate explicito de inicio.
- Restricoes tecnicas:
  - Manter arquitetura em camadas (`src/core`, `src/integrations`, `src/config`).
  - Nao introduzir paralelizacao de tickets.
  - Nao commitar segredos; configuracao local em `.env`.

## Plan of Work
- Milestone 1: Contrato de autenticacao migrado para CLI login-only.
  - Entregavel: cliente Codex sem parametro de API key e sem injecao de `CODEX_API_KEY`/`OPENAI_API_KEY` no comando.
  - Evidencia de conclusao: diff em `src/integrations/codex-client.ts` e testes de ambiente atualizados.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `src/main.ts`, `src/config/env.ts`.
- Milestone 2: Preflight de autenticacao antes da rodada com aviso ao usuario.
  - Entregavel: `requestRunAll` (ou ponto equivalente) valida sessao do `codex` CLI e retorna motivo claro quando falhar; Telegram responde com mensagem de acao.
  - Evidencia de conclusao: testes cobrindo cenarios "iniciado", "ja em execucao" e "nao autenticado".
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3: Documentacao e rastreabilidade alinhadas ao novo contrato.
  - Entregavel: README e service docs descrevendo login CLI como pre-requisito; spec atualizada com evidencia da mudanca.
  - Evidencia de conclusao: buscas textuais sem `CODEX_API_KEY` obrigatoria nos docs operacionais e com orientacao de `codex login`.
  - Arquivos esperados: `README.md`, `docs/systemd/codex-flow-runner.service`, `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.
- Milestone 4: Validacao final e auditoria de artefatos.
  - Entregavel: suite automatizada verde + verificacao de contrato de autenticacao.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` sem falhas e diff restrito ao escopo.
  - Arquivos esperados: sem novos arquivos alem dos previstos acima.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para baseline antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CODEX_API_KEY|OPENAI_API_KEY|runAll\\(|RUN_ALL_|CodexCliTicketFlowClient\\(" src README.md docs/systemd` para mapear todos os pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para:
   - remover parametro `apiKey` do construtor;
   - remover injecao de `CODEX_API_KEY`/`OPENAI_API_KEY` do ambiente do `spawn`;
   - adicionar verificacao explicita de autenticacao do CLI (ex.: `codex login status`) com erro orientativo quando ausente/invalida.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` via `$EDITOR src/integrations/codex-client.test.ts` para cobrir:
   - ausencia de propagacao de API keys no ambiente de execucao;
   - sucesso no preflight de autenticacao;
   - falha no preflight com mensagem contendo instrucao `codex login`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/config/env.ts` via `$EDITOR src/config/env.ts` removendo `CODEX_API_KEY` do schema e mantendo tipagem consistente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` via `$EDITOR src/main.ts` para instanciar `CodexCliTicketFlowClient` sem API key.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para validar autenticacao do Codex CLI antes de iniciar rodada e retornar estado/motivo de falha para camada de interface.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts` via `$EDITOR src/integrations/telegram-bot.ts` para responder `/run-all` com mensagem especifica quando o preflight de autenticacao falhar.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` via `$EDITOR ...` para refletir o novo contrato de `runAll` e o aviso ao usuario.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar o contrato novo de autenticacao.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` e `docs/systemd/codex-flow-runner.service` via `$EDITOR ...` removendo requisito de `CODEX_API_KEY` e documentando pre-requisito `codex login` no mesmo usuario do servico.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` com `Last reviewed at (UTC)`, evidencias desta entrega e rastreabilidade de ticket/execplan.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao final completa.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CODEX_API_KEY|OPENAI_API_KEY|codex login|login status|run-all" src README.md docs/systemd docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` e `git status --short` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/codex-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: casos de autenticacao passam, incluindo falha de preflight com instrucao `codex login` e resposta adequada no `/run-all`.
- Comando: `rg -n "CODEX_API_KEY|OPENAI_API_KEY" src/config/env.ts src/main.ts src/integrations/codex-client.ts README.md`
  - Esperado: nenhum uso obrigatorio de `CODEX_API_KEY` no fluxo principal nem injecao de `OPENAI_API_KEY` no cliente Codex.
- Comando: `npm test && npm run check && npm run build`
  - Esperado: suite completa, tipagem e build verdes sem regressao do fluxo sequencial.
- Comando: `rg -n "Last reviewed at|Related tickets|Related execplans|Status de atendimento" docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - Esperado: spec atualizada com evidencias e rastreabilidade desta mudanca.

## Idempotence and Recovery
- Idempotencia:
  - Comandos de teste e validacao podem ser reexecutados sem efeitos colaterais no estado do repositorio.
  - Preflight de autenticacao deve ser somente leitura (sem modificar sessao) e seguro para repeticao.
- Riscos:
  - Contrato de texto/exit code de `codex login status` pode variar por versao do CLI.
  - Mudanca de assinatura de `runAll` pode quebrar handlers/tests se nao for propagada integralmente.
  - Ambientes antigos que dependiam de API key podem parar de iniciar rodada sem ajuste operacional.
- Recovery / Rollback:
  - Encapsular a validacao de autenticacao em funcao unica para ajuste rapido se o formato do CLI mudar.
  - Em falha pos-merge, reverter commit da migracao de contrato e restaurar fluxo anterior temporariamente.
  - Registrar erro com acao explicita (`codex login`) para reduzir MTTR operacional.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-19-codex-cli-auth-chatgpt-only-no-api-key-fallback.md`.
- Spec de referencia: `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.
- PR/Diff alvo:
  - `git diff -- src/config/env.ts src/main.ts src/core/runner.ts src/core/runner.test.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts README.md docs/systemd/codex-flow-runner.service docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
- Evidencias operacionais esperadas:
  - log/estado com mensagem de autenticacao ausente contendo instrucao `codex login`;
  - resposta do Telegram para `/run-all` refletindo falha de preflight;
  - ausencia de dependencia obrigatoria de `CODEX_API_KEY` na documentacao.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `CodexTicketFlowClient` deve expor operacao de validacao de autenticacao (ou equivalente) alem de `runStage`.
  - `CodexCliTicketFlowClient` deixa de receber API key no construtor e passa a depender da sessao do CLI.
  - `BotControls.runAll` pode evoluir de `() => boolean` para retorno com status/motivo para permitir mensagem acionavel no Telegram.
- Compatibilidade:
  - Fluxo sequencial por ticket (`plan -> implement -> close-and-version`) deve permanecer inalterado.
  - Sem alteracao de contrato de pastas (`tickets/open`, `tickets/closed`, `execplans`/`plans`).
  - Deploy deve garantir que o usuario do servico possua sessao valida em `~/.codex`.
- Dependencias externas e mocks:
  - Dependencia externa principal: `codex` CLI (`codex exec` e `codex login status`).
  - Testes devem usar doubles/mocks para comandos de autenticacao, sem chamadas de rede reais.
