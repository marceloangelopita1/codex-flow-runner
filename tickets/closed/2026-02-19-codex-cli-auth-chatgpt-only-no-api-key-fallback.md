# [TICKET] Autenticacao do runner deve usar apenas login do Codex CLI (sem fallback por API key)

## Metadata
- Status: closed
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-02-19 15:52Z
- Reporter: mapita
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md
  - README.md
  - docs/systemd/codex-flow-runner.service

## Context
- Workflow area: `src/config/env.ts`, `src/main.ts` e `src/integrations/codex-client.ts`
- Scenario: execucao do bot Telegram com usuario assinante ChatGPT Pro, sem `OPENAI_API_KEY`/`CODEX_API_KEY`
- Input constraints: autenticacao deve depender do estado de login do `codex` CLI no usuario do sistema que executa o servico

## Problem statement
O projeto ainda depende de `CODEX_API_KEY` como requisito de bootstrap e injeta essa chave no subprocesso `codex exec`, impedindo o modo operacional desejado (usar autenticacao de conta ChatGPT no CLI e nao API key).

## Observed behavior
- O que foi observado:
  - O schema de ambiente exige `CODEX_API_KEY` obrigatoria.
  - O bootstrap sempre instancia o cliente Codex com `env.CODEX_API_KEY`.
  - O subprocesso de execucao injeta `CODEX_API_KEY` e `OPENAI_API_KEY` no `spawn`, sobrescrevendo o fluxo de autenticacao por login do CLI.
  - `codex exec` sem API key funciona quando `codex login status` indica sessao ativa.
  - `codex exec` com `CODEX_API_KEY=invalid` falha com `401 Unauthorized`, mesmo com sessao ChatGPT ativa.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo + validacao local com `codex login status` e execucoes reais de `codex exec`

## Expected behavior
O runner deve operar exclusivamente com autenticacao do Codex CLI baseada em login de conta ChatGPT. Se o CLI nao estiver autenticado, a execucao deve falhar cedo com mensagem objetiva orientando `codex login`. Nao deve existir fallback por `CODEX_API_KEY`.

## Reproduction steps
1. Verificar `src/config/env.ts` e confirmar `CODEX_API_KEY` obrigatoria.
2. Verificar `src/integrations/codex-client.ts` e confirmar injecao de `CODEX_API_KEY` e `OPENAI_API_KEY` no ambiente do `spawn`.
3. Executar `codex login status` e observar sessao ChatGPT ativa.
4. Executar `codex exec --skip-git-repo-check --color never "Diga apenas OK"` e observar sucesso sem API key.
5. Executar `CODEX_API_KEY=invalid codex exec --skip-git-repo-check --color never "Diga apenas OK"` e observar falha `401 Unauthorized`.

## Evidence
- `src/config/env.ts:4`
- `src/main.ts:18`
- `src/integrations/codex-client.ts:95`
- `src/integrations/codex-client.ts:97`
- `src/integrations/codex-client.ts:98`
- `README.md:33`
- `codex login status` (2026-02-19): `Logged in using ChatGPT`
- `codex exec` sem API key (2026-02-19): sucesso
- `CODEX_API_KEY=invalid codex exec ...` (2026-02-19): `401 Unauthorized`

## Impact assessment
- Impacto funcional: alto, bloqueia o modo de autenticacao desejado para o produto.
- Impacto operacional: alto, risco de erro 401 e comportamento inesperado por chave invalida/ausente em vez de usar login CLI.
- Risco de regressao: medio, altera contrato de configuracao e caminho de autenticacao.
- Scope estimado (quais fluxos podem ser afetados): bootstrap, validacao de ambiente, integracao Codex CLI, mensagens de erro e documentacao operacional/systemd.

## Initial hypotheses (optional)
- A exigencia de `CODEX_API_KEY` foi introduzida para suportar ambientes sem login interativo, mas conflita com o modo de uso alvo (ChatGPT Pro via `codex login`).

## Proposed solution (optional)
Nao obrigatorio. Escopo de implementacao deve remover fallback por API key e adicionar validacao explicita de autenticacao do CLI antes da rodada.

## Closure criteria
- `CODEX_API_KEY` removida do contrato obrigatorio de ambiente do app.
- Cliente Codex deixa de injetar `CODEX_API_KEY`/`OPENAI_API_KEY` no subprocesso.
- Runner (ou bootstrap) valida autenticacao do CLI antes de iniciar processamento e falha com mensagem acionavel quando nao autenticado.
- Testes cobrindo:
  - caminho autenticado (segue execucao);
  - caminho nao autenticado (falha cedo com instrucao `codex login`);
  - ausencia de regressao do fluxo sequencial por ticket.
- README e docs operacionais atualizados para refletir login CLI como pre-requisito.

## Decision log
- 2026-02-19 - Ticket aberto para substituir autenticacao por API key por autenticacao obrigatoria via sessao do Codex CLI, alinhado ao modo operacional desejado do bot Telegram.
- 2026-02-19 - Ticket concluido com migracao para autenticacao login-only no Codex CLI, preflight de `/run-all`, ajustes de testes e atualizacao de documentacao operacional.

## Closure
- Closed at (UTC): 2026-02-19 16:08Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - Commit: definido no commit de fechamento deste ticket (mesmo commit do move `tickets/open` -> `tickets/closed`)
  - ExecPlan: execplans/2026-02-19-codex-cli-auth-chatgpt-only-no-api-key-fallback.md
