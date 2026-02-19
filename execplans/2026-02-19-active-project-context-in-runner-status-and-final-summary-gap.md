# ExecPlan - Contexto de projeto ativo no runner, /status e resumo final

## Purpose / Big Picture
- Objetivo: atender RF-10 e RF-11 da spec `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`, garantindo que `/run-all`, `/pause`, `/resume` e `/status` operem com contexto explicito do projeto ativo global e que o resumo final por ticket carregue identificacao do projeto.
- Resultado esperado:
  - O runner resolve o projeto ativo corrente antes de iniciar cada rodada e evita executar com integracoes fixadas em projeto stale.
  - O estado exposto em `/status` inclui `nome` e `caminho` do projeto ativo com coerencia durante/apos a rodada.
  - O payload de resumo final por ticket inclui o mesmo contexto de projeto ativo (`nome` + `caminho`) para rastreabilidade operacional.
  - Nao ha mistura de estado entre projetos em rodadas diferentes (CA-07) e `/status` + resumo final ficam aderentes ao projeto processado (CA-08).
- Escopo:
  - Evoluir contratos em `src/types/state.ts` e `src/types/ticket-final-summary.ts` para contexto de projeto ativo.
  - Refatorar `src/core/runner.ts` e `src/main.ts` para resolver dependencias por projeto ativo corrente a cada `/run-all`.
  - Atualizar `src/integrations/telegram-bot.ts` para refletir projeto ativo em `/status` e mensagens de resumo final.
  - Atualizar cobertura em `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` (e testes adicionais de bootstrap se necessario).
  - Atualizar rastreabilidade da spec no bloco "Status de atendimento" apos validacao.
- Fora de escopo:
  - Implementacao de `/projects`, callback inline, paginacao e `/select-project` (ticket separado).
  - Projeto ativo por chat/usuario.
  - Execucao paralela de tickets ou multiplos projetos na mesma rodada.

## Progress
- [x] 2026-02-19 18:12Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, spec e referencias de codigo.
- [x] 2026-02-19 18:03Z - Contratos de estado/resumo final evoluidos para carregar contexto de projeto ativo.
- [x] 2026-02-19 18:03Z - Runner e bootstrap refatorados para resolver projeto ativo por rodada sem acoplamento fixo.
- [x] 2026-02-19 18:03Z - `/status` e resumo final no Telegram atualizados com nome/caminho do projeto.
- [x] 2026-02-19 18:03Z - Testes focados + regressao completa + atualizacao de spec concluidos.

## Surprises & Discoveries
- 2026-02-19 18:00Z - A fundacao multi-projeto ja existe (`resolveActiveProject`, discovery e store), mas `src/main.ts` ainda cria `queue/codex/git` apenas uma vez com `activeProjectPath` do bootstrap.
- 2026-02-19 18:01Z - `RunnerState` (`src/types/state.ts`) nao possui qualquer campo para projeto ativo, entao `/status` nao consegue refletir contexto de projeto.
- 2026-02-19 18:01Z - `TicketFinalSummary` (`src/types/ticket-final-summary.ts`) nao carrega identificacao de projeto, reduzindo auditabilidade entre projetos.
- 2026-02-19 18:02Z - `TelegramController` ja possui caminho de renderizacao centralizado para `/status` e resumo final, o que facilita incluir contexto de projeto sem alterar handlers de comando.
- 2026-02-19 18:03Z - O ticket de comandos de selecao (`tickets/open/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md`) segue aberto; este plano precisa preparar contratos para convivio com essa entrega sem depender dela.

## Decision Log
- 2026-02-19 - Decisao: resolver projeto ativo no inicio de cada `/run-all` (e nao apenas no bootstrap).
  - Motivo: evita executar rodada com projeto stale quando o ativo global mudar entre rodadas.
  - Impacto: `TicketRunner` deixa de depender de `queue/codex/git` fixos no construtor e passa a operar com contexto de rodada.
- 2026-02-19 - Decisao: tornar contexto de projeto ativo parte obrigatoria do contrato de estado e do resumo final.
  - Motivo: RF-11 exige identificacao consistente no `/status` e na notificacao final.
  - Impacto: ajuste coordenado de tipos, builder de mensagens e testes de contrato.
- 2026-02-19 - Decisao: manter bloqueio fail-fast quando o projeto ativo nao puder ser resolvido.
  - Motivo: priorizar seguranca operacional e impedir execucao no alvo errado.
  - Impacto: `/run-all` precisa retornar erro acionavel com log contextualizado quando discovery/store nao produzirem projeto valido.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - Contratos de `RunnerState` e `TicketFinalSummary` passaram a propagar contexto de projeto ativo em todo o fluxo.
  - `TicketRunner` agora resolve dependencias por projeto no inicio de cada rodada e evita acoplamento stale entre rodadas.
  - `/status` e resumo final no Telegram passaram a exibir nome/caminho do projeto ativo, com rastreabilidade coerente.
  - Validacao automatizada completa ficou verde (`npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check`, `npm run build`).
- O que ficou pendente:
  - Fechamento operacional do ticket (mover para `tickets/closed/` + commit/push) em etapa separada.
- Proximos passos:
  - Executar o prompt de fechamento quando desejado e seguir para o ticket de comandos `/projects` e `/select-project`.

## Context and Orientation
- Arquivos principais:
  - `src/main.ts` - bootstrap atual resolve projeto uma vez e fixa integracoes no processo.
  - `src/core/runner.ts` - ciclo sequencial `plan -> implement -> close-and-version` e emissao de resumo final.
  - `src/types/state.ts` - contrato de estado usado por `/status`.
  - `src/types/ticket-final-summary.ts` - contrato de payload da notificacao final.
  - `src/integrations/telegram-bot.ts` - renderizacao de `/status` e mensagem de resumo.
- Dependencias reutilizaveis ja existentes:
  - `src/core/active-project-resolver.ts`.
  - `src/integrations/active-project-store.ts`.
  - `src/integrations/project-discovery.ts`.
- Fluxo atual relevante:
  - Bootstrap resolve projeto ativo global.
  - Integracoes de repo (`queue`, `codex`, `git`) sao instanciadas uma vez e reaproveitadas indefinidamente.
  - `/status` e resumo final refletem apenas estado generico do runner, sem projeto.
- Restricoes tecnicas:
  - Manter processamento sequencial por ticket.
  - Evitar novas dependencias.
  - Preservar contratos de acesso Telegram existentes (`TELEGRAM_ALLOWED_CHAT_ID`).

## Plan of Work
- Milestone 1 - Contrato de contexto de projeto no dominio
  - Entregavel: tipos de estado e resumo final passam a incluir identificacao obrigatoria do projeto ativo (`name` + `path`) no contexto operacional e notificacoes.
  - Evidencia de conclusao: testes de tipo/runner/telegram validam presenca obrigatoria desses campos em sucesso e falha.
  - Arquivos esperados: `src/types/state.ts`, `src/types/ticket-final-summary.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts`.
- Milestone 2 - Runner por contexto de rodada (projeto ativo corrente)
  - Entregavel: `TicketRunner` resolve projeto ativo antes de cada rodada e usa integracoes construidas para esse projeto durante toda a rodada, sem reutilizar instancia stale de rodada anterior.
  - Evidencia de conclusao: teste cobrindo duas rodadas com mudanca de projeto ativo entre elas e execucao direcionada ao projeto correto.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`, `src/main.ts`.
- Milestone 3 - Observabilidade Telegram com projeto ativo
  - Entregavel: `/status` exibe nome/caminho do projeto ativo; resumo final por ticket enviado no Telegram inclui o mesmo contexto.
  - Evidencia de conclusao: testes de `telegram-bot` com asserts textuais para projeto ativo em `/status` e na notificacao final.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - Validacao, rastreabilidade e alinhamento de spec
  - Entregavel: validacao completa verde e spec atualizada refletindo atendimento de RF-10/RF-11 e CA-07/CA-08 (quando comprovado pelos testes).
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` verdes + diff da spec com evidencias.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-multi-project-active-selection.md` (se houver mudanca de status/evidencia).

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes da refatoracao de contratos.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "TicketRunner\(|createInitialState|TicketFinalSummary|buildStatusReply|sendTicketFinalSummary|resolveActiveProject" src` para mapear pontos exatos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/state.ts` para incluir contexto de projeto ativo no estado exposto pelo runner.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/ticket-final-summary.ts` para incluir `activeProjectName` e `activeProjectPath` no contrato base de resumo final.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/core/runner.ts` para:
   - resolver projeto ativo no inicio da rodada;
   - construir/usar dependencias de queue/codex/git associadas ao projeto resolvido;
   - preencher contexto de projeto no estado e no resumo final emitido.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar `src/main.ts` para fornecer ao runner um mecanismo de resolucao de projeto ativo + criacao de integracoes por projeto, preservando bootstrap e logs existentes.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para incluir nome/caminho do projeto ativo no `/status` e no resumo final por ticket.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` com cenarios de roteamento por projeto ativo entre rodadas e propagacao do contexto no `TicketFinalSummary`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com asserts de projeto ativo em `/status` e nas mensagens de sucesso/falha.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` para validacao focada dos contratos alterados.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-telegram-multi-project-active-selection.md` no bloco de status/evidencias conforme resultado de RF-10/RF-11 e CA-07/CA-08.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/main.ts src/core/runner.ts src/types/state.ts src/types/ticket-final-summary.ts src/integrations/telegram-bot.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-19-telegram-multi-project-active-selection.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: runner resolve projeto ativo por rodada, nao mistura estado entre projetos e inclui contexto de projeto no resumo final (CA-07).
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: `/status` e mensagem final exibem nome/caminho do projeto ativo em sucesso e falha (CA-08).
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao no fluxo sequencial e no controle Telegram existente.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erros apos evolucao dos contratos.
- Comando: `rg -n "RF-10|RF-11|CA-07|CA-08" docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - Esperado: spec com status/evidencias atualizados de forma objetiva apos validacao.

## Idempotence and Recovery
- Idempotencia:
  - Reexecutar `/run-all` sem troca de projeto deve reutilizar o mesmo projeto ativo resolvido, sem efeitos colaterais adicionais.
  - Reexecutar testes e comandos de validacao nao produz mudancas persistentes fora dos arquivos alterados.
- Riscos:
  - Refatoracao de construtor/contratos do runner pode quebrar chamadas existentes em `main.ts` e testes.
  - Estado de projeto ativo pode ficar stale se a transicao entre rodadas nao limpar/reaplicar contexto corretamente.
  - Mudancas de tipo em `TicketFinalSummary` podem quebrar pontos que assumiam payload antigo.
- Recovery / Rollback:
  - Migrar em ordem: tipos -> runner/main -> telegram -> testes, mantendo build compilando a cada etapa.
  - Em falha de resolucao de projeto ativo, abortar rodada antes de processar ticket e manter log acionavel.
  - Se regressao aparecer em `/status`, restaurar builder anterior temporariamente e reaplicar contexto com testes orientados a contrato.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-active-project-context-in-runner-status-and-final-summary-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`.
- Dependencias de trilha (relacionadas):
  - `tickets/closed/2026-02-19-projects-root-discovery-and-active-state-foundation-gap.md`.
  - `tickets/open/2026-02-19-telegram-project-selection-commands-and-pagination-gap.md`.
- Evidencias esperadas:
  - Diff dos arquivos de tipos/runner/main/telegram/testes.
  - Saida dos comandos de teste, typecheck e build.
  - Trechos de `/status` e resumo final com nome/caminho do projeto ativo.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/types/state.ts` - adicionar contexto de projeto ativo ao `RunnerState`.
  - `src/types/ticket-final-summary.ts` - incluir identificacao de projeto no payload base do resumo final.
  - `src/core/runner.ts` - trocar dependencias fixas por resolucao de contexto de rodada e propagacao de projeto no estado/resumo.
  - `src/integrations/telegram-bot.ts` - renderizar contexto de projeto em `/status` e notificacao final.
  - `src/main.ts` - adaptar composicao para fornecer resolucao de projeto e integracoes por projeto ao runner.
- Compatibilidade:
  - Fluxo sequencial por ticket e sem paralelizacao deve permanecer inalterado.
  - Comandos atuais (`/run-all`, `/pause`, `/resume`, `/status`) devem manter semantica operacional, adicionando apenas contexto de projeto.
  - Ticket de selecao de projeto podera reutilizar o contrato introduzido aqui para trocar projeto entre rodadas.
- Dependencias externas e mocks:
  - Sem bibliotecas novas; reutilizar `telegraf`, `zod` e APIs Node existentes.
  - Testes permanecem com doubles/mocks locais (sem rede e sem chamadas reais ao Telegram).
