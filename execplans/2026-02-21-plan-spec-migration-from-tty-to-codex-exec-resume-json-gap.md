# ExecPlan - Migracao de /plan_spec de TTY para codex exec/resume --json

## Purpose / Big Picture
- Objetivo: migrar o backend da sessao `/plan_spec` de bridge pseudo-TTY interativa para execucao por turno com `codex exec` + `codex exec resume` + `--json`, mantendo a UX atual no Telegram.
- Resultado esperado:
  - `startPlanSession` deixa de depender de `script`/pseudo-TTY no caminho principal.
  - a sessao de `/plan_spec` passa a persistir contexto por `thread_id`.
  - a resposta util usada pelo parser vem de evento `agent_message` (saida deterministica).
  - perguntas (`[[PLAN_SPEC_QUESTION]]`) e bloco final (`[[PLAN_SPEC_FINAL]]`) continuam parseaveis.
  - callbacks finais (`Criar spec`, `Refinar`, `Cancelar`), fases do runner, timeout e mensagens operacionais continuam funcionando.
  - cobertura automatizada prova sessao `exec/resume`, erro acionavel sem `thread_id`/`agent_message` e ausencia de regressao em runner/telegram.
- Escopo:
  - `src/integrations/codex-client.ts` e testes associados.
  - adaptacoes necessarias em `src/core/runner.ts` e `src/core/runner.test.ts`.
  - ajustes em `src/integrations/plan-spec-parser.ts` apenas se indispensavel para o novo backend.
  - ajustes em `src/integrations/telegram-bot.test.ts` para preservar comportamento observavel.
  - atualizacao de documentacao operacional impactada (`README.md` e/ou spec relacionada).
- Fora de escopo:
  - mudanca de regras de concorrencia do runner.
  - alteracao de UX funcional de `/codex_chat` (ja entregue em ticket proprio).
  - paralelizacao de tickets ou sessoes de planejamento.

## Progress
- [x] 2026-02-21 08:22Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, specs relacionadas e evidencias de codigo.
- [x] 2026-02-21 08:22Z - Baseline oficial do Codex CLI (`exec`, `resume`, `--json`, eventos e `thread_id`) revisada e vinculada neste plano.
- [x] 2026-02-21 08:31Z - Backend `/plan_spec` migrado para `codex exec/resume --json` com estado de `thread_id` e parsing por `agent_message`.
- [x] 2026-02-21 08:31Z - Suite automatizada atualizada e validada sem regressao (`codex-client`, `runner`, `telegram-bot`, `npm test`, `check`, `build`).
- [x] 2026-02-21 08:31Z - Documentacao operacional alinhada com fim da dependencia de pseudo-TTY no caminho principal de `/plan_spec`.

## Surprises & Discoveries
- 2026-02-21 08:22Z - `startPlanSession` ainda abre processo interativo com `script`/TTY e bootstrap `/plan`, com heuristicas de readiness/trust prompt.
- 2026-02-21 08:22Z - O parser de `/plan_spec` possui filtros extensos de ruido de TUI/ANSI, refletindo acoplamento com stream de terminal.
- 2026-02-21 08:22Z - `/codex_chat` ja usa `codex exec/resume --json` com parsing de `thread.started` + `item.completed(agent_message)`, servindo como baseline tecnico reaproveitavel.
- 2026-02-21 08:22Z - A documentacao oficial de modo nao interativo confirma fluxo por turno e eventos JSON deterministas (`thread.started`, `item.completed`, `turn.completed`), reduzindo necessidade de heuristica de TTY.
- 2026-02-21 08:31Z - A remocao do backend TTY permitiu eliminar codigo legado de `script`/pseudo-TTY sem impacto nas suites de `runner` e `telegram`.

## Decision Log
- 2026-02-21 - Decisao: migrar `/plan_spec` para sessao por turno com `exec/resume --json` e estado de `thread_id`.
  - Motivo: reduzir complexidade operacional e tornar parsing deterministico, alinhando com backend ja validado de `/codex_chat`.
  - Impacto: substituicao do caminho principal baseado em pseudo-TTY em `codex-client`.
- 2026-02-21 - Decisao: preservar contrato externo de eventos de `/plan_spec` no runner (`question`, `final`, `raw-sanitized`, `activity`) sem alterar UX Telegram.
  - Motivo: minimizar regressao funcional em comandos/callbacks/fases existentes.
  - Impacto: adaptar emissao de eventos no novo backend, em vez de reescrever fluxo de runner.
- 2026-02-21 - Decisao: considerar erro acionavel quando transcript JSON nao trouxer `thread_id` ou `agent_message`.
  - Motivo: criterio explicito do ticket para evitar comportamento silencioso e nao deterministico.
  - Impacto: novos cenarios de falha em `codex-client.test.ts` e propagacao consistente no runner.
- 2026-02-21 - Decisao: manter parser de blocos `PLAN_SPEC_*` sobre o texto de `agent_message` e reduzir dependencia de filtros especificos de TTY apenas quando seguro.
  - Motivo: preservar compatibilidade de perguntas/bloco final sem manter acoplamento desnecessario ao terminal.
  - Impacto: possiveis ajustes pequenos em `plan-spec-parser` e respectivos testes.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada.
- O que funcionou: migracao de `/plan_spec` para `exec/resume --json` manteve contrato de eventos/UX e simplificou o backend.
- O que ficou pendente: nenhum pendente tecnico neste escopo; fechamento operacional do ticket fica para etapa de close/version.
- Proximos passos: revisar diff final e seguir para o prompt de fechamento de ticket quando solicitado.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/integrations/plan-spec-parser.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `README.md`
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
- Fluxo atual:
  - `/plan_spec` usa sessao por turno com `codex exec/resume --json`, persistencia de `thread_id` e parsing de `agent_message`.
  - `/codex_chat` usa `codex exec/resume --json` e extrai `agent_message` de transcript estruturado.
  - runner controla fases e timeout de `/plan_spec` e encaminha perguntas/final/raw para Telegram.
- Baseline oficial obrigatoria (lida e referenciada):
  - Codex CLI overview/reference: `https://developers.openai.com/codex/cli/reference`
  - Non-interactive mode (`exec`, `resume`, `--json`, eventos): `https://developers.openai.com/codex/noninteractive`
  - Event stream/app server semantics (suporte aos tipos de evento): `https://developers.openai.com/codex/app-server`
- Restricoes tecnicas:
  - manter fluxo sequencial do projeto (sem paralelizacao de tickets).
  - nao introduzir novas dependencias de runtime sem necessidade.
  - manter contratos operacionais de `/plan_spec` observaveis pelo bot.

## Plan of Work
- Milestone 1 - Baseline de migracao e contrato tecnico de sessao.
  - Entregavel: desenho final do backend `/plan_spec` por turno (`start` sem `thread_id`, `resume` com `thread_id`, ambos com `--json`).
  - Evidencia de conclusao: diff em `codex-client.ts` com estrutura de sessao nao-interativa e sem caminho principal TTY.
  - Arquivos esperados: `src/integrations/codex-client.ts`.
- Milestone 2 - Implementacao do backend `exec/resume --json` para `/plan_spec`.
  - Entregavel: nova sessao de `/plan_spec` baseada em execucao por turno, mantendo callbacks/eventos esperados pelo runner.
  - Evidencia de conclusao: testes de `codex-client` mostram persistencia de `thread_id`, parsing de `agent_message` e ausencia de bootstrap TTY.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 3 - Compatibilidade funcional do runner e parser.
  - Entregavel: fases de `/plan_spec`, timeout, callbacks finais e fallback raw continuam consistentes com o comportamento atual.
  - Evidencia de conclusao: `runner.test.ts` e `telegram-bot.test.ts` verdes nos cenarios de sessao ativa/pergunta/final/falha.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, possivelmente `src/integrations/plan-spec-parser.ts`.
- Milestone 4 - Hardening de erros acionaveis e regressao.
  - Entregavel: tratamento explicito para transcript invalido (sem `thread_id`/`agent_message`) e mensagens de erro acionaveis.
  - Evidencia de conclusao: testes dedicados cobrindo falhas e comportamento esperado no runner.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`, `src/core/runner.test.ts`.
- Milestone 5 - Alinhamento documental e aceite final.
  - Entregavel: docs operacionais atualizadas removendo/ajustando instrucoes exclusivas de TTY quando nao forem mais necessarias.
  - Evidencia de conclusao: referencias em `README.md` e/ou spec refletindo backend atual de `/plan_spec`.
  - Arquivos esperados: `README.md`, `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` (se aplicavel).

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes da migracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec --help && codex exec resume --help` para validar flags disponiveis na CLI local e alinhar com os links oficiais deste plano.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "startPlanSession|CodexInteractivePlanSession|buildInteractiveCodexSpawnRequest|spawnCodexInteractiveProcess|parseCodexExecJsonTranscript" src/integrations/codex-client.ts src/integrations/codex-client.test.ts` para mapear pontos de troca.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` via `$EDITOR src/integrations/codex-client.ts` para implementar sessao `/plan_spec` em `exec/resume --json` com estado de `thread_id`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reaproveitar e/ou generalizar parsing de transcript JSON para capturar `thread.started` e `item.completed` com `item.type = agent_message`, mantendo sanitizacao segura.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir que a saida entregue ao parser de `PLAN_SPEC_*` venha apenas de `agent_message`, evitando ruido de terminal.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar erro acionavel quando faltar `thread_id` no primeiro turno ou `agent_message` no turno corrente.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/core/runner.ts` somente onde necessario para manter fase/status/timeout do `/plan_spec` com o novo backend por turno.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/plan-spec-parser.ts` apenas se houver lacuna de compatibilidade ao consumir texto de `agent_message` em vez de stream TTY.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` para cobrir: start com `exec --json`, resume com `thread_id`, erro sem `thread_id`, erro sem `agent_message`, e ausencia de dependencia TTY no caminho principal.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` para garantir ausencia de regressao de lifecycle/callbacks/mensagens de `/plan_spec`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts` para validacao focada de integracao + parser.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validar regressao de fluxo no core e no bot.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar documentacao operacional impactada em `README.md` e/ou `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar resultado com `git status --short` e `git diff -- src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/core/runner.ts src/core/runner.test.ts src/integrations/plan-spec-parser.ts src/integrations/plan-spec-parser.test.ts src/integrations/telegram-bot.test.ts README.md docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: cobertura prova sessao `/plan_spec` com `exec/resume --json`, persistencia de `thread_id` e extração de `agent_message`.
- Comando: `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: sem regressao de fase/status/timeout, perguntas/final parseaveis e callbacks finais funcionando.
- Comando: `rg -n "startPlanSession|exec|resume|--json|thread_id|agent_message" src/integrations/codex-client.ts`
  - Esperado: caminho principal de `/plan_spec` baseado em `exec/resume --json` com estado de `thread_id`.
- Comando: `rg -n "buildInteractiveCodexSpawnRequest|spawnCodexInteractiveProcess|CODEX_INTERACTIVE_SCRIPT_LOG_PATH" src/integrations/codex-client.ts src/integrations/codex-client.test.ts`
  - Esperado: nenhuma dependencia de pseudo-TTY no caminho principal de `/plan_spec` (qualquer uso remanescente deve estar explicitamente fora desse fluxo).
- Comando: `npm test && npm run check && npm run build`
  - Esperado: suite completa verde sem regressao do runner sequencial.
- Comando: `rg -n "plan_spec|exec/resume|tty|pseudo-tty" README.md docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - Esperado: documentacao operacional coerente com backend migrado, sem instrucoes obsoletas de TTY quando nao mais aplicaveis.

## Idempotence and Recovery
- Idempotencia:
  - repetir envio de input com mesma sessao e `thread_id` deve continuar no mesmo contexto, sem abrir sessao paralela.
  - repetir cancelamento/encerramento de sessao inativa deve retornar estado seguro sem excecao.
  - reexecutar validacoes (`test`, `check`, `build`) nao deve alterar artefatos funcionais.
- Riscos:
  - transcript JSON sem `thread_id` no turno inicial impedir continuidade da conversa.
  - transcript JSON sem `agent_message` quebrar contrato de resposta deterministica.
  - diferencas de latencia por turno impactarem telemetria de heartbeat do `/plan_spec`.
  - ajuste parcial de parser manter filtros de ruido TTY desnecessarios e introduzir falso-positivo.
- Recovery / Rollback:
  - manter implementacao isolada em classe/superficie dedicada no `codex-client` para rollback localizado.
  - em falha de transcript, encerrar sessao com erro acionavel e instruir retry sem fallback silencioso.
  - preservar testes legados de `/plan_spec` e `/codex_chat` para detectar regressao antes de merge.
  - se houver regressao ampla, restaurar caminho anterior temporariamente em branch de hotfix e reexecutar migracao por milestone.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-21-plan-spec-migration-from-tty-to-codex-exec-resume-json-gap.md`.
- Specs relacionadas:
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
- Referencias de processo:
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
- Baseline oficial Codex CLI (obrigatoria no ticket):
  - `https://developers.openai.com/codex/cli/reference`
  - `https://developers.openai.com/codex/noninteractive`
  - `https://developers.openai.com/codex/app-server`
- Evidencias tecnicas de partida:
  - `src/integrations/codex-client.ts:294`
  - `src/integrations/codex-client.ts:503`
  - `src/integrations/codex-client.ts:653`
  - `src/integrations/codex-client.ts:526`
  - `src/integrations/codex-client.ts:1100`
  - `src/integrations/codex-client.ts:1258`
  - `src/integrations/plan-spec-parser.ts:11`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato de sessao `/plan_spec` em `src/integrations/codex-client.ts` (backend por turno com `thread_id`).
  - possiveis ajustes no contrato de eventos consumido por `src/core/runner.ts`.
  - suites de teste de `codex-client`, `runner`, `telegram-bot` e parser para cobrir novo caminho.
- Compatibilidade:
  - manter comportamento funcional de `/plan_spec` no Telegram (perguntas, bloco final, callbacks e mensagens operacionais).
  - manter coexistencia com `/codex_chat` sem regressao do fluxo ja entregue.
  - manter operacao sequencial do runner e bloqueios atuais.
- Dependencias externas e mocks:
  - dependencia externa principal: Codex CLI com suporte a `exec`, `resume` e `--json`.
  - testes devem permanecer com mocks/stubs locais, sem necessidade de chamadas reais a Telegram/Codex.
