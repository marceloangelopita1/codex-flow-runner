# ExecPlan - Codex SDK real e ciclo de 3 prompts por ticket

## Purpose / Big Picture
- Objetivo: substituir o `LocalCodexTicketFlowClient` por integracao real com Codex SDK e executar, para cada ticket, as etapas `plan`, `implement` e `close-and-version` com fronteira operacional explicita.
- Resultado esperado: o runner processa cada ticket com tres chamadas reais ao Codex SDK, com logs/estado por etapa e erro enriquecido quando qualquer etapa falhar.
- Escopo:
  - Evoluir contrato de `CodexTicketFlowClient` para operacao por etapa (nao chamada unica).
  - Implementar cliente real de Codex SDK para os tres prompts operacionais do projeto.
  - Ajustar `TicketRunner` para orquestrar etapas em ordem, com rastreabilidade de sucesso/falha por fase.
  - Conectar bootstrap (`src/main.ts`) ao cliente real.
  - Cobrir fluxo com testes de contrato/integracao e atualizar spec com evidencias.
- Fora de escopo:
  - Regras de rodada fail-fast e encerramento finito de `/run-all` (ticket separado: `tickets/open/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md`).
  - Compatibilidade `plans/` vs `execplans/` (ticket separado: `tickets/open/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md`).
  - Paralelizacao de tickets.

## Progress
- [x] 2026-02-19 12:05Z - Planejamento inicial concluido com leitura do ticket e referencias.
- [x] 2026-02-19 12:11Z - Contrato por etapa do cliente Codex definido e documentado no codigo.
- [x] 2026-02-19 12:11Z - Integracao real com Codex SDK implementada para `plan`, `implement` e `close-and-version`.
- [x] 2026-02-19 12:12Z - Runner adaptado para orquestracao por etapa com erro contextual.
- [x] 2026-02-19 12:13Z - Testes, validacoes finais e atualizacao da spec concluidos.

## Surprises & Discoveries
- 2026-02-19 12:05Z - O repositorio atual nao possui dependencia de Codex SDK; somente cliente MVP local em `src/integrations/codex-client.ts`.
- 2026-02-19 12:05Z - O contrato atual expone apenas `runTicketFlow(ticket)`, sem fronteira tecnica para 3 etapas.
- 2026-02-19 12:05Z - `CODEX_API_KEY` existe em `src/config/env.ts`, mas esta opcional; para integracao real sera necessario comportamento explicito quando ausente.
- 2026-02-19 12:05Z - O runner ainda controla fechamento/versionamento localmente apos a etapa de implementacao; sera preciso alinhar com o papel da etapa `close-and-version` sem duplicar acao.
- 2026-02-19 12:09Z - A interface oficial disponivel localmente e via `codex exec` (CLI), entao a integracao real foi implementada com spawn de processo e prompts versionados.

## Decision Log
- 2026-02-19 - Decisao: migrar de chamada unica para contrato por etapa (`plan`, `implement`, `close-and-version`) no cliente Codex.
  - Motivo: garantir observabilidade e propagacao de erro por fase, conforme RF-02/RF-03.
  - Impacto: altera `src/integrations/codex-client.ts`, `src/core/runner.ts` e testes associados.
- 2026-02-19 - Decisao: padronizar erro de integracao com contexto minimo (`ticket`, `stage`, `cause`) antes de propagar para o runner.
  - Motivo: triagem operacional depende de falha contextualizada por etapa.
  - Impacto: novos tipos/objetos de erro e asserts de teste para mensagens de falha.
- 2026-02-19 - Decisao: reutilizar os prompts versionados em `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md` e `prompts/04-encerrar-ticket-commit-push.md` como base das chamadas SDK.
  - Motivo: manter rastreabilidade com o ciclo operacional ja adotado no projeto.
  - Impacto: cliente SDK precisa montar payload por etapa com contexto do ticket alvo.

## Outcomes & Retrospective
- Status final: execucao concluida para o escopo deste plano (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou: cliente real por etapa com `codex exec` entrou em producao no bootstrap e os testes de contrato do fluxo principal passaram.
- O que ficou pendente: pendencias de rodada finita/fail-fast, push obrigatorio e compatibilidade `plans/` seguem em tickets separados.
- Proximos passos: executar prompt de encerramento para atualizar ticket/metadados e versionar os artefatos.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/codex-client.ts` - cliente atual (MVP local) e contrato de integracao.
  - `src/core/runner.ts` - orquestracao do ciclo por ticket e transicoes de fase.
  - `src/main.ts` - bootstrap/injecao do cliente Codex no runner.
  - `src/config/env.ts` - variaveis de ambiente para autenticacao/configuracao.
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` - RFs/CAs de referencia.
  - `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md`, `prompts/04-encerrar-ticket-commit-push.md` - prompts operacionais canonicos.
- Fluxo atual:
  - Runner chama `codexClient.runStage(...)` em tres fases explicitas por ticket.
  - Cada fase usa prompt versionado e execucao real via `codex exec`.
  - Falhas da fase sao propagadas com contexto (`ticket`, `stage`) para triagem.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM, sem paralelizacao de tickets.
  - Arquitetura em camadas deve ser preservada (`src/core`, `src/integrations`, `src/config`).
  - Sem commit de segredos; uso de `.env` para chaves locais.

## Plan of Work
- Milestone 1: Contrato de integracao por etapa definido e pronto para SDK real.
  - Entregavel: interface do cliente Codex separando `plan`, `implement` e `close-and-version`, com tipo de retorno/erro padrao.
  - Evidencia de conclusao: diff em `src/integrations/codex-client.ts` e busca textual mostrando metodos por etapa.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 2: Cliente Codex SDK real implementado com montagem de prompt por etapa.
  - Entregavel: nova implementacao em `src/integrations/` usando Codex SDK real e `CODEX_API_KEY`, capaz de executar as tres etapas com contexto do ticket.
  - Evidencia de conclusao: codigo do adapter + logs de etapa + testes de contrato do cliente.
  - Arquivos esperados: `src/integrations/codex-sdk-client.ts` (ou equivalente), `src/config/env.ts`, `package.json`/`package-lock.json` (se houver dependencia nova).
- Milestone 3: Runner adaptado para orquestracao sequencial de 3 etapas com rastreabilidade.
  - Entregavel: `TicketRunner` chama etapas em ordem, atualiza fase antes/depois de cada chamada e propaga erro contextualizado.
  - Evidencia de conclusao: testes cobrindo ordem `plan -> implement -> close-and-version` e quebra ao erro da etapa corrente.
  - Arquivos esperados: `src/core/runner.ts`, `src/types/state.ts`, `src/core/runner.test.ts` (ou teste equivalente).
- Milestone 4: Bootstrap, validacao final e rastreabilidade de spec concluidos.
  - Entregavel: `src/main.ts` injeta cliente real por padrao; spec atualizada com evidencias do ticket/execplan/commit.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` verdes e diff da spec atualizado.
  - Arquivos esperados: `src/main.ts`, `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para registrar baseline de tipagem antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CodexTicketFlowClient|LocalCodexTicketFlowClient|runTicketFlow" src/integrations/codex-client.ts src/core/runner.ts src/main.ts` para mapear pontos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para definir contrato por etapa e tipos de resultado/erro.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar cliente real em `src/integrations/` via `$EDITOR src/integrations/codex-sdk-client.ts`, incluindo leitura dos prompts operacionais e execucao via Codex SDK.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar dependencias/configuracao via `$EDITOR package.json` e `$EDITOR src/config/env.ts` (incluindo validacao de `CODEX_API_KEY` para modo real).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para executar as 3 etapas explicitamente em ordem e propagar erro com `ticket` + `stage`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` via `$EDITOR src/main.ts` para injetar o cliente Codex SDK real no bootstrap.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar/atualizar testes via `$EDITOR src/core/runner.test.ts` e `$EDITOR src/integrations/codex-client.test.ts` cobrindo ordem de etapas, sucesso e falha por etapa.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para validar os testes de contrato/integracao adicionados.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para garantir integridade de tipos e build.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar a spec via `$EDITOR docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` com status de atendimento e evidencias.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "LocalCodexTicketFlowClient|close-and-version|Last reviewed at|Status de atendimento|2026-02-19-codex-sdk-real-three-prompt-flow-gap" src/main.ts src/core/runner.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` para validar rastreabilidade final.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/integrations/codex-client.ts src/integrations/codex-sdk-client.ts src/core/runner.ts src/main.ts src/config/env.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md package.json` para auditoria final dos artefatos.

## Validation and Acceptance
- Comando: `npm test`
  - Esperado: testes cobrindo fluxo sequencial `plan -> implement -> close-and-version` passam, incluindo caso de falha por etapa com erro contextual.
- Comando: `rg -n "plan|implement|close-and-version" src/core/runner.ts src/integrations/codex-client.ts`
  - Esperado: runner e cliente exibem fronteiras explicitas das 3 etapas operacionais.
- Comando: `rg -n "LocalCodexTicketFlowClient|Codex SDK|CODEX_API_KEY" src/main.ts src/integrations/*.ts src/config/env.ts`
  - Esperado: bootstrap usando cliente real e configuracao de autenticacao explicita para integracao SDK.
- Comando: `npm run check && npm run build`
  - Esperado: zero erro de tipagem e build concluido.
- Comando: `rg -n "Status de atendimento|Related tickets|Related execplans|Last reviewed at" docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - Esperado: spec atualizada com evidencias desta entrega.

## Idempotence and Recovery
- Idempotencia:
  - `npm test`, `npm run check` e `npm run build` podem ser reexecutados sem efeitos colaterais de estado.
  - Reexecucao do runner deve manter fluxo sequencial por ticket, sem paralelizacao de etapas.
- Riscos:
  - Divergencia entre expectativa de "Codex SDK real" e API efetivamente disponivel no ambiente.
  - Falhas de autenticacao/rede (`CODEX_API_KEY`, timeout, rate limit) durante etapas.
  - Duplicidade de fechamento/versionamento se etapa `close-and-version` e camada local tentarem fechar o mesmo ticket.
- Recovery / Rollback:
  - Encapsular integracao SDK em adapter isolado para permitir rollback rapido no bootstrap para cliente local em caso de incidente.
  - Em erro de etapa, interromper ciclo do ticket atual com erro contextual e evitar avancar para a proxima etapa.
  - Se fechamento duplicado aparecer, definir fonte unica de verdade para `close-and-version` e remover caminho redundante antes de retomar validacao.

## Artifacts and Notes
- PR/Diff: `git diff -- src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/core/runner.ts src/core/runner.test.ts src/main.ts src/config/env.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md README.md`
- Logs relevantes: saida de `npm test`, `npm run check`, `npm run build` e logs de runner por etapa (`plan`, `implement`, `close-and-version`).
- Evidencias de teste: casos para ordem de etapas, sucesso completo e falha contextual por etapa.
- Ticket de origem: `tickets/open/2026-02-19-codex-sdk-real-three-prompt-flow-gap.md`.
- Dependencias de backlog relacionadas: `tickets/open/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md` e `tickets/open/2026-02-19-plan-dir-compat-and-ticket-flow-tests-gap.md`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - Contrato `CodexTicketFlowClient` (de chamada unica para execucao por etapa).
  - Orquestracao do `TicketRunner` para chamar 3 etapas explicitas.
  - Bootstrap em `src/main.ts` para injecao da implementacao SDK real.
- Compatibilidade:
  - Fluxo sequencial de tickets deve ser preservado.
  - Nao introduzir dependencia de paralelizacao nem mudanca de pasta de tickets neste ticket.
  - Ajustes em fechamento/versionamento devem considerar compatibilidade com ticket separado de fail-fast/auto-push.
- Dependencias externas e mocks:
  - Dependencia externa principal: Codex CLI oficial (`@openai/codex`) executado via `codex exec`, autenticado por `CODEX_API_KEY`.
  - Testes devem usar doubles/mocks do adapter de comando para evitar chamadas de rede reais na suite local.
