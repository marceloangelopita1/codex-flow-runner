# ExecPlan - Materializacao de spec planejada e versionamento dedicado no fluxo /plan_spec

## Purpose / Big Picture
- Objetivo: habilitar a acao final `Criar spec` no fluxo `/plan_spec`, materializando uma nova spec em `docs/specs/`, persistindo trilha `spec_planning/*` e finalizando com commit/push dedicado e escopo de arquivos restrito.
- Resultado esperado:
  - ao selecionar `Criar spec`, o runner executa etapa dedicada fora do modo `/plan`;
  - a spec e criada com naming `docs/specs/YYYY-MM-DD-<slug>.md`, derivado do titulo final aprovado;
  - a spec criada inicia com `Status: approved` e `Spec treatment: pending`;
  - o fechamento usa commit exato `feat(spec): add <arquivo>.md`;
  - `git add`/commit incluem apenas a spec criada e artefatos `spec_planning/*` do fluxo;
  - trilha de rastreabilidade e persistida em `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/`.
- Escopo:
  - evoluir `src/core/runner.ts` para executar a acao `create-spec` de ponta a ponta;
  - evoluir `src/integrations/codex-client.ts` com etapas/prompts dedicados para materializacao e versionamento da spec planejada;
  - criar prompts dedicados para `Criar spec` e para commit/push da spec planejada com escopo restrito;
  - adicionar persistencia de trilha `spec_planning/*` no projeto ativo;
  - cobrir CAs deste ticket (CA-11, CA-12, CA-13, CA-14, CA-15, CA-16).
- Fora de escopo:
  - mudancas no fluxo `/run_specs` (triagem de specs existentes) alem do necessario para nao regressao;
  - fechamento do ticket e commit/push desta entrega;
  - cobertura end-to-end completa de toda jornada `/plan_spec` (ticket separado de cobertura automatizada ampla).

## Progress
- [x] 2026-02-19 22:04Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, spec alvo e referencias tecnicas.
- [x] 2026-02-19 23:42Z - Contrato de etapas dedicadas para materializacao/versionamento de spec planejada implementado no cliente Codex.
- [x] 2026-02-19 23:42Z - Acao `Criar spec` implementada no runner com orquestracao fora de `/plan`.
- [x] 2026-02-19 23:42Z - Trilha `spec_planning/requests|responses|decisions` persistida no projeto ativo.
- [x] 2026-02-19 23:42Z - Prompts dedicados de criacao e commit/push da spec planejada criados e validados.
- [x] 2026-02-19 23:43Z - Cobertura automatizada dos CAs do ticket e validacao final (`test`, `check`, `build`) concluidas.

## Surprises & Discoveries
- 2026-02-19 22:04Z - `handlePlanSpecFinalActionSelection` em `src/core/runner.ts` ainda retorna `ignored` para `create-spec` com mensagem explicita de nao habilitado.
- 2026-02-19 22:04Z - `SpecFlowStage` em `src/integrations/codex-client.ts` contem apenas `spec-triage` e `spec-close-and-version`.
- 2026-02-19 22:04Z - `buildSpecCommitMessage` em `src/integrations/codex-client.ts` esta fixo em `chore(specs): triage <arquivo>`, divergindo do commit esperado para `Criar spec`.
- 2026-02-19 22:04Z - O prompt atual de fechamento de spec (`prompts/05-encerrar-tratamento-spec-commit-push.md`) orienta `git add` generico dos arquivos alterados, sem escopo estrito ao artefato esperado.
- 2026-02-19 22:04Z - Nao existe persistencia de `spec_planning/*` no codigo do runner/integracoes (`rg spec_planning src` sem resultados).
- 2026-02-19 22:04Z - O template oficial de spec permanece com `Status: draft`, logo a jornada `Criar spec` precisa forcar metadados iniciais via etapa dedicada sem depender do baseline do template.

## Decision Log
- 2026-02-19 - Decisao: introduzir etapas dedicadas para `Criar spec` separadas de `spec-triage/spec-close-and-version`.
  - Motivo: o fluxo atual de triagem atende specs existentes e nao cobre materializacao de nova spec planejada.
  - Impacto: evolucao de tipos/roteamento no cliente Codex e novos prompts no diretorio `prompts/`.
- 2026-02-19 - Decisao: persistir `spec_planning/*` por integracao Node (filesystem), nao apenas por instrucao textual de prompt.
  - Motivo: garantir rastreabilidade deterministica mesmo se a resposta do Codex variar.
  - Impacto: novo modulo em `src/integrations` e pontos de chamada no lifecycle de `/plan_spec`.
- 2026-02-19 - Decisao: derivar `docs/specs/YYYY-MM-DD-<slug>.md` a partir do titulo final parseado; em colisao de arquivo existente, falhar com mensagem acionavel para refino/correcao.
  - Motivo: evita sobrescrita silenciosa e mantem naming auditavel.
  - Impacto: adiciona validacao de existencia e caminho de erro antes de materializar/commitar.
- 2026-02-19 - Decisao: manter `docs/specs/templates/spec-template.md` sem mudar default global para este ticket e forcar `Status: approved` + `Spec treatment: pending` no prompt/fluxo de criacao planejada.
  - Motivo: preservar semantica do template generico (`draft`) para outros cenarios fora de `/plan_spec`.
  - Impacto: requisito de metadado inicial passa a ser contrato explicito da etapa `Criar spec`.

## Outcomes & Retrospective
- Status final: implementado e validado localmente (sem fechamento de ticket e sem commit/push, conforme escopo desta etapa).
- O que funcionou: milestones executados em sequencia com cobertura automatizada para CA-11..CA-16 e regressao completa verde.
- O que ficou pendente: apenas etapa operacional posterior de fechamento de ticket e versionamento final da entrega.
- Proximos passos: executar prompt de encerramento do ticket em etapa dedicada para commit/push e movimentacao para `tickets/closed/`.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - lifecycle `/plan_spec`, callbacks finais e gate de comandos concorrentes.
  - `src/types/state.ts` - estado/fases de sessao usadas por `/status` e Telegram.
  - `src/integrations/codex-client.ts` - mapeamento de prompts e execucao de etapas via Codex CLI.
  - `src/integrations/plan-spec-parser.ts` - contrato do bloco final (`title`, `summary`, `actions`) usado para naming e decisao.
  - `src/integrations/telegram-bot.ts` - callback `plan-spec:final:*` e mensagens ao operador.
  - `prompts/05-encerrar-tratamento-spec-commit-push.md` - baseline de fechamento hoje acoplado a triagem.
  - `docs/specs/templates/spec-template.md` - baseline de metadata de spec.
  - `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` - RFs/CAs de origem (RF-17..RF-21, RF-25; CA-11..CA-16).
- Fluxo atual:
  - sessao `/plan_spec` conversa com Codex em `/plan` e chega ao bloco final com botoes;
  - `Refinar` volta para conversa;
  - `Cancelar` encerra sessao;
  - `Criar spec` ainda nao dispara etapas de materializacao/versionamento.
- Restricoes tecnicas:
  - manter arquitetura em camadas (`src/core`, `src/integrations`, `src/config`);
  - manter fluxo sequencial, sem paralelizacao de tickets;
  - nao introduzir dependencias novas sem necessidade.

## Plan of Work
- Milestone 1: Contrato de etapas `Criar spec` no cliente Codex.
  - Entregavel: contrato e roteamento para etapas dedicadas de materializacao e fechamento da spec planejada, com commit message `feat(spec): add <arquivo>.md`.
  - Evidencia de conclusao: `codex-client` mapeia prompts dedicados e testes validam placeholders/commit message esperados.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `prompts/06-*.md`, `prompts/07-*.md`.
- Milestone 2: Orquestracao da acao `create-spec` no runner fora de `/plan`.
  - Entregavel: ao selecionar `create-spec`, runner valida contexto final, encerra sessao interativa, executa etapa de criacao e depois etapa de versionamento dedicado.
  - Evidencia de conclusao: testes em `runner` mostram sequencia deterministica (`create-spec` aceito, execucao de duas etapas, encerramento correto de sessao) e bloqueio seguro em erros.
  - Arquivos esperados: `src/core/runner.ts`, possivelmente `src/types/state.ts`, `src/core/runner.test.ts`.
- Milestone 3: Naming e metadata inicial obrigatorios da nova spec.
  - Entregavel: nome `docs/specs/YYYY-MM-DD-<slug>.md` derivado do titulo final; prompt/materializacao forca `Status: approved` e `Spec treatment: pending`.
  - Evidencia de conclusao: testes e validacoes textuais asseguram naming e metadados esperados; colisao de arquivo existente gera erro acionavel.
  - Arquivos esperados: `src/core/runner.ts`, `src/integrations/codex-client.ts`, prompts dedicados e testes.
- Milestone 4: Persistencia da trilha `spec_planning/*`.
  - Entregavel: criacao de artefatos em `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/` com contexto da sessao e decisao final.
  - Evidencia de conclusao: testes com filesystem temporario verificam diretorios/arquivos criados e referencias cruzadas para spec gerada e commit esperado.
  - Arquivos esperados: novo modulo em `src/integrations` (ex.: `spec-planning-trace-store.ts`) + testes e uso em `runner`.
- Milestone 5: Prompt de fechamento com escopo estrito de versionamento.
  - Entregavel: prompt de commit/push dedicado para spec planejada restringe explicitamente `git add` ao arquivo de spec criado e artefatos `spec_planning/*` da mesma sessao.
  - Evidencia de conclusao: testes do `codex-client` e `rg` validam mensagem de commit exata e ausencia de `git add` amplo.
  - Arquivos esperados: `prompts/07-*.md`, `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`.
- Milestone 6: Cobertura dos CAs do ticket e rastreabilidade da spec.
  - Entregavel: testes cobrindo CA-11..CA-16 e atualizacao da spec de origem com status/evidencias desta entrega.
  - Evidencia de conclusao: suites focadas + regressao completa verdes; `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` atualizado com rastreabilidade objetiva.
  - Arquivos esperados: `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`, `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "create-spec|spec-close-and-version|buildSpecCommitMessage|spec_planning" src/core/runner.ts src/integrations/codex-client.ts src/integrations/telegram-bot.ts` para mapear pontos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar prompts dedicados via `$EDITOR prompts/06-materializar-spec-planejada.md` e `$EDITOR prompts/07-versionar-spec-planejada-commit-push.md` com placeholders necessarios (`<SPEC_PATH>`, `<SPEC_FILE_NAME>`, `<COMMIT_MESSAGE>`, trilha `spec_planning/*`).
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/integrations/codex-client.ts` para suportar etapas dedicadas da jornada `Criar spec`, sem quebrar `spec-triage/spec-close-and-version`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar builder de commit da jornada planejada para retornar `feat(spec): add <arquivo>.md` e garantir interpolacao correta no prompt de fechamento.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar/ligar persistencia de rastreabilidade em `spec_planning/requests|responses|decisions` (novo modulo em `src/integrations`) e integrar com lifecycle do `runner`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/core/runner.ts` para armazenar contexto final parseado (titulo/resumo), derivar caminho da spec, validar colisao e executar fluxo `create-spec` fora de `/plan`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir no `runner` que `cancel` continua sem criar spec (CA-11) e que erro em qualquer etapa encerra com mensagem acionavel sem corromper estado de sessao.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/integrations/telegram-bot.ts` se necessario para refletir feedback de sucesso/falha da acao `Criar spec` e manter callbacks coerentes.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/codex-client.test.ts` cobrindo prompt/materializacao/versionamento dedicado e commit message exata.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` cobrindo CA-11..CA-16 (cancelamento sem criacao, create-spec com naming/metadata, commit dedicado, escopo restrito e trilha `spec_planning/*`).
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para callback `plan-spec:final:create-spec` com respostas de sucesso e caminhos de erro.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar validacao focada: `npx tsx --test src/integrations/codex-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar regressao completa: `npm test && npm run check && npm run build`.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-plan-spec-conversation.md` marcando CAs atendidos e adicionando evidencias desta entrega.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/integrations/codex-client.ts src/integrations/telegram-bot.ts src/integrations/*.test.ts src/core/*.test.ts prompts/06-materializar-spec-planejada.md prompts/07-versionar-spec-planejada-commit-push.md docs/specs/2026-02-19-telegram-plan-spec-conversation.md` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: cobre cancelamento final sem criacao de arquivo (CA-11) e fluxo `create-spec` com execucao dedicada fora de `/plan` (CA-12).
- Comando: `npx tsx --test src/integrations/codex-client.test.ts`
  - Esperado: prompt de materializacao injeta spec path esperado e prompt de versionamento injeta commit `feat(spec): add <arquivo>.md` (CA-14).
- Comando: `rg -n "Status: approved|Spec treatment: pending" prompts/06-materializar-spec-planejada.md`
  - Esperado: prompt dedicado exige metadados iniciais obrigatorios na spec criada (CA-13).
- Comando: `rg -n "git add .*docs/specs/|spec_planning/requests|spec_planning/responses|spec_planning/decisions" prompts/07-versionar-spec-planejada-commit-push.md`
  - Esperado: escopo de `git add` e commit limitado ao artefato da spec e trilha do fluxo (CA-15).
- Comando: `rg -n "spec_planning/requests|spec_planning/responses|spec_planning/decisions" src/core/runner.ts src/integrations/*.ts`
  - Esperado: persistencia da trilha `spec_planning/*` implementada no fluxo da sessao (CA-16).
- Comando: `npm test && npm run check && npm run build`
  - Esperado: regressao completa verde sem quebrar fluxo sequencial existente.
- Comando: `rg -n "CA-11|CA-12|CA-13|CA-14|CA-15|CA-16" docs/specs/2026-02-19-telegram-plan-spec-conversation.md`
  - Esperado: spec atualizada com status/evidencias dos CAs deste ticket.

## Idempotence and Recovery
- Idempotencia:
  - callback `create-spec` nao deve disparar nova materializacao quando a sessao ja estiver encerrada ou fora da fase final;
  - reexecucao de testes e comandos de validacao nao altera estado funcional do repositorio;
  - persistencia de trilha deve evitar sobrescrita silenciosa (nome deterministico com sufixo de sessao/timestamp quando necessario).
- Riscos:
  - colisao de slug/data gerar conflito com spec existente;
  - corrida entre encerramento da sessao interativa e inicio da etapa batch de criacao da spec;
  - prompt de fechamento ainda permitir escopo amplo de `git add` por instrucao ambigua;
  - aumento de superficie de testes por mudanca de contrato no `CodexTicketFlowClient`.
- Recovery / Rollback:
  - em colisao de arquivo de spec, abortar `create-spec` com orientacao para `Refinar`/novo titulo, sem sobrescrever arquivo existente;
  - em falha de materializacao, manter sessao encerrada com erro acionavel e permitir nova tentativa via `/plan_spec`;
  - em falha de commit/push, manter artefatos locais para auditoria (`docs/specs/*` e `spec_planning/*`) e repetir apenas etapa de fechamento apos ajuste;
  - se regressao atingir `run_specs` legado, isolar feature flag/branch de etapas planejadas para rollback rapido sem afetar triagem existente.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`.
- ExecPlan desta entrega: `execplans/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-plan-spec-conversation.md`.
- Prompts de referencia consultados:
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/05-encerrar-tratamento-spec-commit-push.md`
- Evidencias tecnicas consultadas:
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `docs/specs/templates/spec-template.md`
- Tickets relacionados:
  - concluido: `execplans/2026-02-19-plan-spec-codex-interactive-bridge-and-parser-gap.md`
  - concluido: `execplans/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md`
  - pendente complementar: `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato de etapas de spec no `CodexTicketFlowClient` para suportar fluxo dedicado de materializacao/versionamento da spec planejada;
  - `TicketRunner` para orquestrar `create-spec` com dados do bloco final e trilha `spec_planning/*`;
  - estado de sessao `/plan_spec` (se necessario) para armazenar contexto final usado na derivacao de nome/caminho.
- Compatibilidade:
  - fluxo legado de tickets (`plan -> implement -> close-and-version`) deve permanecer inalterado;
  - fluxo legado de triagem de specs por `/run_specs` deve manter comportamento atual;
  - sem paralelizacao de tickets/sessoes introduzida.
- Dependencias externas e mocks:
  - sem novas dependencias obrigatorias; uso de `node:fs`/`node:path` para persistencia de trilha;
  - testes continuam com stubs/mocks locais para Codex/Telegram, sem chamadas reais externas.
