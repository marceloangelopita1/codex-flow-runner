# ExecPlan - Observabilidade de callbacks e taxonomia de motivos de bloqueio em /specs e /plan_spec

## Purpose / Big Picture
- Objetivo: fechar o gap do ticket `tickets/closed/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md`, padronizando observabilidade de callbacks e taxonomia minima de bloqueios para `/specs` e `/plan_spec`.
- Resultado esperado:
  - callbacks de `/specs` e `/plan_spec` passam a registrar trilha completa de tentativa, validacoes aplicadas e decisao final.
  - bloqueios passam a ser classificados de forma consistente com a taxonomia minima: `access-denied`, `concurrency`, `stale`, `ineligible`, `invalid-action`, `inactive-session`.
  - logs de callback passam a incluir identificadores operacionais essenciais: `chatId`, `userId` (quando disponivel), `callbackData`, `action`, `specFileName` ou `sessionId`, `result`.
  - mensagens observaveis (toast/chat) permanecem coerentes com a causa de bloqueio sem regressao de UX.
  - cobertura automatizada valida RF-18..RF-20 e CA-16 da spec de origem.
- Escopo:
  - evoluir `src/integrations/telegram-bot.ts` para instrumentar callbacks de `/specs` e `/plan_spec` com log estruturado de tentativa/validacao/decisao.
  - introduzir taxonomia explicita de motivos de bloqueio no fluxo de callback e padronizar mapeamento por branch.
  - ajustar contratos internos necessarios no core (`src/core/runner.ts`) para expor motivo de bloqueio em callbacks de `/plan_spec` sem depender de parsing de mensagem livre.
  - atualizar testes de integracao do bot e do runner para validar diferenciacao de causas e contexto logado.
  - atualizar documento vivo da spec com status/evidencias do recorte de observabilidade entregue.
- Fora de escopo:
  - UX de destaque/trava de botoes e confirmacao dupla de `/plan_spec` (ticket separado: `tickets/open/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md`).
  - alteracoes de semantica do RF-24 sobre sequencialidade/multi-runner (ticket separado: `tickets/open/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`).
  - alteracoes em `/projects` ou em fluxos nao relacionados a callback de `/specs` e `/plan_spec`.

## Progress
- [x] 2026-02-20 22:41Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md`, spec de origem e evidencias de codigo/teste.
- [x] 2026-02-20 22:54Z - Implementacao da taxonomia e instrumentacao de callbacks concluida em `/specs` e `/plan_spec`, com captura de `userId` e decisao final padronizada.
- [x] 2026-02-20 22:54Z - Cobertura automatizada e validacao final concluidas (`npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`, `npm test`, `npm run check`, `npm run build`).
- [x] 2026-02-20 22:54Z - Spec atualizada com rastreabilidade de RF-18..RF-20 e CA-16.

## Surprises & Discoveries
- 2026-02-20 22:41Z - `CallbackContext` em `src/integrations/telegram-bot.ts` ainda nao carrega `callbackQuery.from.id`, impedindo rastreio consistente por operador nos logs de callback.
- 2026-02-20 22:41Z - `/specs` possui logs pontuais de entrada/erro, mas nao fecha de forma uniforme uma linha final de decisao com `result` + `blockReason` para todos os retornos antecipados.
- 2026-02-20 22:41Z - `/plan_spec` devolve `accepted/ignored` via runner, mas o contrato atual (`PlanSpecCallbackResult`) nao explicita motivo tipado de bloqueio, dificultando taxonomia confiavel no controller.
- 2026-02-20 22:41Z - `SpyLogger` de `src/integrations/telegram-bot.test.ts` captura apenas warnings, o que hoje limita asserts diretos sobre logs de tentativa/decisao em nivel `info`.

## Decision Log
- 2026-02-20 - Decisao: centralizar a taxonomia em um contrato explicito de callback no controller, em vez de inferir causa por texto de mensagem.
  - Motivo: parsing de mensagens livres e fragil para auditoria e tende a quebrar com mudancas de copy.
  - Impacto: adiciona tipos/helpers de classificacao e requer pequenos ajustes de contrato entre runner e bot para `/plan_spec`.
- 2026-02-20 - Decisao: registrar dois momentos obrigatorios por callback (`attempt` e `decision`) e logs de `validation` somente quando houver gate aplicado.
  - Motivo: garante trilha auditavel sem gerar ruido excessivo em logs.
  - Impacto: novos helpers de logging e padronizacao de contexto em todos os `return` antecipados.
- 2026-02-20 - Decisao: manter mensagens para usuario final semanticamente estaveis e evoluir primeiro a instrumentacao/logging.
  - Motivo: reduzir risco de regressao de UX enquanto atende RF-18..RF-20 e CA-16.
  - Impacto: alteracoes de copy ficam limitadas a correcoes pontuais para coerencia de causa quando necessario.
- 2026-02-20 - Decisao: classificar o fechamento como `GO`.
  - Motivo: criterios de aceite do ticket e do plano foram comprovados por testes focados e regressao completa verde.
  - Impacto: ticket pode ser encerrado com `Closure reason: fixed` sem necessidade de split-follow-up.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada; recorte apto para fechamento do ticket.
- O que funcionou: taxonomia tipada no runner + helper unico de auditoria no bot reduziram ambiguidade de causa e facilitaram cobertura de teste por branch.
- O que ficou pendente: sem pendencias neste recorte; itens de UX de `/plan_spec` e RF-24 continuam em tickets separados.
- Proximos passos: concluir fechamento do ticket no mesmo changeset, com commit e push.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts`:
    - `handleSpecsCallbackQuery` e `handleSpecsSelectionFromCallback` concentram callbacks de `/specs` (`src/integrations/telegram-bot.ts:746`, `src/integrations/telegram-bot.ts:833`).
    - `handlePlanSpecCallbackQuery` processa callbacks de `/plan_spec` (`src/integrations/telegram-bot.ts:1017`).
    - interfaces `CallbackContext` e `IncomingUpdateContext` ainda sem `userId` de callback (`src/integrations/telegram-bot.ts:107`, `src/integrations/telegram-bot.ts:118`).
  - `src/core/runner.ts`:
    - `PlanSpecCallbackResult` e handlers de callback retornam `accepted/ignored` sem motivo tipado (`src/core/runner.ts:198`, `src/core/runner.ts:531`, `src/core/runner.ts:546`).
  - `src/integrations/telegram-bot.test.ts`:
    - cobertura atual verifica parte de acesso/bloqueio, mas sem asserts consistentes de taxonomia/log final por callback (`src/integrations/telegram-bot.test.ts:1984`, `src/integrations/telegram-bot.test.ts:2101`).
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`:
    - RF-18..RF-20 e CA-16 pendentes para observabilidade transversal dos callbacks.
- Fluxo atual:
  - `/specs` ja suporta callback com revalidacao e respostas observaveis, mas sem padrao unico de log final por decisao.
  - `/plan_spec` ja responde callback com toast, porem com trilha incompleta de validacoes e motivo de bloqueio padronizado.
- Fluxo alvo deste plano:
  - cada callback de `/specs` e `/plan_spec` gera trilha auditavel previsivel (`attempt -> validations -> decision`) com campos operacionais fixos.
  - qualquer bloqueio cai em uma categoria da taxonomia minima exigida.
- Restricoes tecnicas:
  - manter Node.js 20+ e TypeScript sem novas dependencias.
  - preservar sequencialidade operacional por projeto e nao introduzir paralelizacao de tickets.
  - nao expor dados sensiveis nos logs; manter `callbackData` com limite de tamanho quando necessario.

## Plan of Work
- Milestone 1 - Contrato da taxonomia e payload de auditoria
  - Entregavel: tipos/constantes para `blockReason`, `callbackFlow`, `action`, `result` e estrutura canonica de contexto de observabilidade.
  - Evidencia de conclusao: grep mostra taxonomia declarada e referenciada nos handlers de `/specs` e `/plan_spec`.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, possivelmente `src/core/runner.ts` (contrato de retorno para `/plan_spec`).
- Milestone 2 - Instrumentacao completa de `/specs`
  - Entregavel: logs padronizados para tentativa, validacoes (acesso/parse/contexto/elegibilidade/concorrencia) e decisao final em todos os caminhos de retorno.
  - Evidencia de conclusao: cenarios de callback valido, stale, invalido, inelegivel, concorrencia e acesso negado com `result` e `blockReason` coerentes.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Instrumentacao completa de `/plan_spec` com motivo tipado
  - Entregavel: callbacks de pergunta/final de `/plan_spec` registram tentativa, validacoes e decisao final com causa padronizada, incluindo `sessionId` quando disponivel.
  - Evidencia de conclusao: caminhos `invalid-action`, `inactive-session`, `access-denied`, `accepted` e bloqueios funcionais de acao final diferenciados em logs.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.test.ts`, `src/core/runner.test.ts`.
- Milestone 4 - Alinhamento de mensagens observaveis e campos de rastreio
  - Entregavel: toasts/chat messages continuam coerentes com causa de bloqueio e logs incluem `chatId`, `userId`, `callbackData`, `action`, `specFileName|sessionId`, `result`.
  - Evidencia de conclusao: testes validam coerencia minima de mensagem e presenca dos identificadores no contexto logado.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Regressao e rastreabilidade de spec
  - Entregavel: suites de teste verdes e spec atualizada com atendimento de RF-18..RF-20 / CA-16.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` verdes + diff na spec de origem.
  - Arquivos esperados: `src/integrations/telegram-bot.test.ts`, `src/core/runner.test.ts`, `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para baseline antes de alterar contratos de callback/log.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "handleSpecsCallbackQuery|handlePlanSpecCallbackQuery|PlanSpecCallbackResult|safeAnswerCallbackQuery|logger\.info|logger\.warn" src/integrations/telegram-bot.ts src/core/runner.ts` para mapear pontos de decisao atuais.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/integrations/telegram-bot.ts` com tipos/constantes de taxonomia (`access-denied`, `concurrency`, `stale`, `ineligible`, `invalid-action`, `inactive-session`) e helper unico para log de callback.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `CallbackContext` e parsing de update/callback para capturar `userId` (`callbackQuery.from.id`) e propagar no payload de auditoria quando disponivel.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar `handleSpecsCallbackQuery` e `handleSpecsSelectionFromCallback` para emitir logs padronizados de `attempt`, `validation` e `decision` em todos os ramos de retorno.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Introduzir classificacao explicita de bloqueio em callbacks de `/specs`:
   - acesso negado -> `access-denied`
   - callback invalido -> `invalid-action`
   - contexto ausente/expirado/reuso -> `stale`
   - spec inelegivel/not-found/invalid-path -> `ineligible`
   - runner ocupado ou bloqueio de inicio -> `concurrency`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `PlanSpecCallbackResult` em `src/core/runner.ts` para opcionalmente transportar motivo tipado em retornos `ignored`, evitando classificacao por texto.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `handlePlanSpecQuestionOptionSelection` e `handlePlanSpecFinalActionSelection` para retornar causa padronizada (ex.: `inactive-session`, `concurrency`, `ineligible`) quando `status` for `ignored`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Instrumentar `handlePlanSpecCallbackQuery` com logs padronizados de tentativa/validacao/decisao, incluindo `action`, `sessionId` (se disponivel) e `result`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` para cobrir taxonomia/log de `/specs` e `/plan_spec`, incluindo cenarios de acesso negado, invalido, stale, inelegivel, inativo e concorrencia.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` para refletir novo contrato tipado de `PlanSpecCallbackResult` sem regressao dos fluxos aceitos.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validacao focada do recorte.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` marcando RF-18..RF-20 e CA-16 conforme evidencias.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/telegram-bot.ts src/core/runner.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: callbacks de `/specs` e `/plan_spec` validam diferenciacao de causas de bloqueio e rastreabilidade de contexto logado (CA-16).
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: contrato de retorno dos callbacks de `/plan_spec` preserva comportamento funcional e adiciona motivo tipado sem regressao.
- Comando: `rg -n "access-denied|concurrency|stale|ineligible|invalid-action|inactive-session" src/integrations/telegram-bot.ts src/core/runner.ts`
  - Esperado: taxonomia minima declarada e efetivamente usada nas decisoes de callback.
- Comando: `rg -n "callback.*attempt|callback.*decision|blockReason|userId|specFileName|sessionId|result" src/integrations/telegram-bot.ts`
  - Esperado: trilha de observabilidade inclui tentativa + decisao e identificadores operacionais essenciais.
- Comando: `npm test && npm run check && npm run build`
  - Esperado: regressao completa verde sem quebrar fluxos de comandos/callbacks existentes.
- Comando: `rg -n "RF-18|RF-19|RF-20|CA-16|Status de atendimento|Evidencias" docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - Esperado: documento vivo atualizado com rastreabilidade da entrega deste recorte.

## Idempotence and Recovery
- Idempotencia:
  - logs de callback sao append-only e nao alteram resultado funcional da acao.
  - callback repetido deve continuar tratado de forma segura (`stale`/ja processado) sem iniciar efeito colateral adicional.
  - reexecucao de testes/comandos de validacao nao deve exigir cleanup manual.
- Riscos:
  - aumento de verbosidade de log sem padrao pode reduzir legibilidade operacional.
  - mapeamento incorreto de causa pode gerar diagnostico enganoso (ex.: confundir `stale` com `ineligible`).
  - mudanca de contrato `PlanSpecCallbackResult` pode quebrar testes e chamadores se aplicada parcialmente.
  - captura de `userId` pode ficar indisponivel em alguns cenarios de callback e precisa fallback seguro.
- Recovery / Rollback:
  - manter helper de classificacao centralizado para rollback pontual de taxonomia sem reverter handlers inteiros.
  - se contrato do runner causar regressao, aplicar adaptador temporario no bot para aceitar shape antigo e novo ate estabilizar.
  - em caso de ruido excessivo, reduzir logs intermediarios de validacao mantendo obrigatorios (`attempt` e `decision`).

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md`.
- Referencias obrigatorias consultadas:
  - `PLANS.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.test.ts`
- Tickets correlatos fora deste escopo:
  - `tickets/open/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md`
  - `tickets/open/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`
- Evidencias tecnicas usadas no planejamento:
  - `src/integrations/telegram-bot.ts:823`
  - `src/integrations/telegram-bot.ts:838`
  - `src/integrations/telegram-bot.ts:1460`
  - `src/integrations/telegram-bot.ts:1481`
  - `src/core/runner.ts:531`
  - `src/core/runner.ts:546`
  - `src/integrations/telegram-bot.test.ts:1984`
  - `src/integrations/telegram-bot.test.ts:2101`

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/integrations/telegram-bot.ts`:
    - contrato interno de callback com payload observavel padronizado.
    - extensao de `CallbackContext`/`IncomingUpdateContext` para suportar `userId` de callback.
    - classificacao de `blockReason` e logging consistente de `attempt`/`decision`.
  - `src/core/runner.ts`:
    - `PlanSpecCallbackResult` com motivo tipado para `status: "ignored"`.
  - `src/integrations/telegram-bot.test.ts` e `src/core/runner.test.ts`:
    - cobertura de taxonomia e de campos operacionais em logs/decisoes.
- Compatibilidade:
  - manter API publica do `TelegramController` e bootstrap em `src/main.ts` sem quebra funcional.
  - preservar comportamento de fallback dos comandos existentes (`/run_specs`, `/plan_spec`) e gates de acesso atuais.
  - nao alterar semantica de processamento sequencial do runner.
- Dependencias externas e mocks:
  - sem novas bibliotecas; reuso de `telegraf`, logger interno e stubs existentes.
  - testes continuam sem Telegram/Codex reais, com doubles locais.
