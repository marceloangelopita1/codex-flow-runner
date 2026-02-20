# [TICKET] Padronizar full access explicito por chamada em todas as conversas do Codex CLI

## Metadata
- Status: closed
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-02-20 14:55Z
- Reporter: mapita
- Owner: mapita
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file: N/A
  - Response file: N/A
  - Log file: N/A
- Related docs/execplans:
  - src/integrations/codex-client.ts
  - src/integrations/codex-client.test.ts
  - execplans/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md

## Context
- Workflow area: integracao com Codex CLI para etapas de ticket/spec e sessao interativa de planejamento
- Scenario: todas as conversas acionadas pelo runner devem operar em full access configurado na chamada
- Input constraints: manter fluxo sequencial e sem regressao da autenticacao/login atual

## Problem statement
As chamadas atuais de conversa com o Codex usam `--dangerously-bypass-approvals-and-sandbox`, mas nao padronizam explicitamente o modo de sandbox/aprovacao como `-s danger-full-access -a never`. Isso atende hoje ao efeito pratico de full access, porem deixa o comportamento menos auditavel e menos claro como contrato de execucao por chamada.

## Observed behavior
- O que foi observado:
  - Execucao nao interativa (`codex exec`) usa `--dangerously-bypass-approvals-and-sandbox`.
  - Sessao interativa (`codex`) tambem usa `--dangerously-bypass-approvals-and-sandbox`.
  - Nao ha flags explicitas `-s danger-full-access` e `-a never` nas chamadas de conversa.
  - Nao ha cobertura de teste garantindo explicitamente esse contrato de flags.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): revisao estatica de codigo

## Expected behavior
Todas as chamadas de conversa com Codex (batch e interativa) devem declarar explicitamente full access por chamada, com flags de sandbox/aprovacao alinhadas ao contrato operacional do projeto (ex.: `-s danger-full-access` e `-a never`), com cobertura de teste para evitar regressao.

## Reproduction steps
1. Abrir `src/integrations/codex-client.ts`.
2. Verificar argumentos de `runCodexCommand` e `spawnCodexInteractiveProcess`.
3. Confirmar ausencia de `-s danger-full-access` e `-a never` nas chamadas de conversa.

## Evidence
- `src/integrations/codex-client.ts:629`
- `src/integrations/codex-client.ts:633`
- `src/integrations/codex-client.ts:717`
- `src/integrations/codex-client.ts:722`

## Impact assessment
- Impacto funcional: medio (comportamento atual funciona, mas sem contrato explicito de modo por chamada).
- Impacto operacional: medio (menor clareza/auditabilidade e maior risco de divergencia em upgrades do CLI).
- Risco de regressao: medio (mudanca em argumentos de spawn requer cobertura de testes).
- Scope estimado (quais fluxos podem ser afetados): execucao de etapas de ticket/spec e sessao `/plan_spec` interativa.

## Initial hypotheses (optional)
- O uso de `--dangerously-bypass-approvals-and-sandbox` foi adotado para reduzir friccao de execucao.
- Falta padronizacao explicita de contrato de sandbox/aprovacao por chamada.

## Proposed solution (optional)
Substituir/padronizar argumentos de chamada para declarar explicitamente full access por chamada, mantendo comportamento equivalente e adicionando testes de argumentos para os dois caminhos (batch e interativo).

## Closure criteria
- Chamadas de conversa no cliente Codex usam flags explicitas de full access por chamada.
- Cobertura automatizada valida os argumentos usados em `runCodexCommand` e `spawnCodexInteractiveProcess`.
- Fluxos de ticket/spec e `/plan_spec` seguem funcionando sem regressao.
- Documentacao operacional atualizada se houver mudanca de contrato visivel.

## Decision log
- 2026-02-20 - Ticket aberto para formalizar full access explicito por chamada em todas as conversas Codex do runner.
- 2026-02-20 - Ticket concluido com padronizacao de flags explicitas (`-s danger-full-access -a never`) nos caminhos batch/interativo e cobertura automatizada dedicada.

## Closure
- Closed at (UTC): 2026-02-20 15:01Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - Commit: definido no commit de fechamento deste ticket (mesmo commit do move `tickets/open` -> `tickets/closed`)
  - ExecPlan: execplans/2026-02-20-codex-cli-full-access-mode-per-call-standardization.md
