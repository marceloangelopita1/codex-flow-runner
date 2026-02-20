# ExecPlan - /specs com selecao por clique, callback inline e inicio imediato de triagem

## Purpose / Big Picture
- Objetivo: fechar o gap P0/S1 do ticket `tickets/closed/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md`, implementando a jornada de clique em `/specs` com callback inline, revalidacao no clique e inicio imediato de triagem.
- Resultado esperado:
  - `/specs` passa a responder com inline keyboard paginada por item elegivel.
  - callback de item em `/specs` passa a iniciar `runSpecs` sem exigir comando textual adicional.
  - mensagem clicada e editada com destaque (`✅`) e botoes travados.
  - bloqueios de acesso, stale, inelegibilidade e concorrencia retornam motivo observavel sem iniciar nova triagem.
  - cobertura automatizada para o recorte `/specs` (CA-01 a CA-10 da spec de origem).
- Escopo:
  - evoluir `src/integrations/telegram-bot.ts` para renderizacao paginada de `/specs` com callback data contextual e handler `specs:`.
  - adicionar controle de contexto/stale/idempotencia para callbacks de `/specs` no controller.
  - reusar `listEligibleSpecs` + `validateRunSpecsTarget` para revalidar estado no clique.
  - atualizar `src/integrations/telegram-bot.test.ts` com cenarios de sucesso, bloqueio e stale/reuso.
  - atualizar o documento vivo da spec de origem com status/evidencias do recorte entregue.
- Fora de escopo:
  - ajustes de UX de callback em `/plan_spec` (ticket separado: `tickets/open/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md`).
  - taxonomia completa de observabilidade para ambos os fluxos (`/specs` + `/plan_spec`) alem do minimo necessario para este ticket (ticket separado: `tickets/open/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md`).
  - alinhamento documental amplo do RF-24 com multi-runner (ticket separado: `tickets/open/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`).

## Progress
- [x] 2026-02-20 22:26Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md`, spec de origem e evidencias de codigo/teste.
- [x] 2026-02-20 22:38Z - Implementacao de `/specs` com callback inline, stale/idempotencia e destaque/trava concluida.
- [x] 2026-02-20 22:38Z - Cobertura automatizada CA-01..CA-10 e validacao final (`npx tsx --test src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check`, `npm run build`) concluidas.
- [x] 2026-02-20 22:38Z - Documento vivo da spec atualizado com rastreabilidade do recorte entregue.

## Surprises & Discoveries
- 2026-02-20 22:26Z - `handleCallbackQuery` ainda roteia apenas prefixos `projects:` e `plan-spec:`; `specs:` nao existe no baseline.
- 2026-02-20 22:26Z - `handleSpecsCommand` responde texto puro (`buildSpecsReply`) sem teclado inline, sem contexto de pagina e sem marcador de mensagem.
- 2026-02-20 22:26Z - `buildRunSpecsReply` ja centraliza gate de concorrencia/blocked de `requestRunSpecs`, entao o callback de `/specs` pode reutilizar esse caminho para evitar divergencia de regra.
- 2026-02-20 22:26Z - os testes atuais de `/specs` validam apenas listagem textual; nao ha cobertura de callback, stale, clique repetido ou edicao de mensagem clicada.

## Decision Log
- 2026-02-20 - Decisao: manter este ExecPlan estritamente no fluxo `/specs` e nao absorver mudancas de `/plan_spec`.
  - Motivo: ja existem tickets separados para `/plan_spec` e observabilidade transversal; misturar escopos aumenta risco de regressao e dificulta aceite objetivo.
  - Impacto: este plano entrega CA-01..CA-10 do recorte `/specs` e deixa CA-12+ para tickets dedicados.
- 2026-02-20 - Decisao: usar callback data curta e defensiva para `/specs` (tipo de acao + pagina + indice + marcador de contexto).
  - Motivo: limite de payload do Telegram e necessidade de detectar stale/reuso sem carregar nome completo de arquivo.
  - Impacto: exige parser dedicado de callback de `/specs` e tabela em memoria de contexto valido.
- 2026-02-20 - Decisao: revalidar elegibilidade no clique via `validateRunSpecsTarget` antes de iniciar `runSpecs`.
  - Motivo: a lista renderizada pode ficar desatualizada entre exibicao e clique.
  - Impacto: callbacks podem ser bloqueados por `not-found`/`not-eligible` mesmo com item visivel na listagem original.
- 2026-02-20 - Decisao: tratar edicao da mensagem clicada como best effort, sem invalidar inicio de triagem ja aceito.
  - Motivo: RF-21 da spec exige consistencia do fluxo principal mesmo com falha do `editMessageText`.
  - Impacto: fluxo deve logar falha de edicao e ainda devolver confirmacao observavel ao operador.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada; recorte `/specs` apto para fechamento de ticket.
- O que funcionou: abordagem incremental em `telegram-bot.ts` + testes dedicados cobriu callback inline, stale/idempotencia e UX de destaque/trava sem regressao dos fluxos existentes.
- O que ficou pendente: nao ha pendencia neste recorte; itens de `/plan_spec`, observabilidade ampla e RF-24 permanecem rastreados em tickets dedicados.
- Proximos passos: seguir com fechamento do ticket pai no mesmo changeset da solucao.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts`:
    - `handleSpecsCommand` (listagem atual sem inline keyboard).
    - `handleCallbackQuery` (roteamento de callbacks sem branch `specs:`).
    - `buildRunSpecsReply` (gate de concorrencia e retorno observavel de `requestRunSpecs`).
  - `src/integrations/spec-discovery.ts`:
    - `listEligibleSpecs` para renderizar pagina.
    - `validateSpecEligibility` para revalidacao no clique.
  - `src/core/runner.ts`:
    - `requestRunSpecs` retorna `started | already-running | blocked`, preservando gate de concorrencia do runner.
  - `src/integrations/telegram-bot.test.ts`:
    - baseline possui testes de `/specs` apenas textuais, sem callback.
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`:
    - requisitos RF-01..RF-12 e CAs CA-01..CA-10 para o recorte `/specs`.
- Fluxo atual:
  - operador usa `/specs` e recebe lista textual com instrucao manual para `/run_specs <arquivo>`.
  - nao ha callback de `/specs`; clique nao inicia triagem.
- Fluxo alvo deste plano:
  - `/specs` responde com lista paginada e botoes por item elegivel.
  - clique valido inicia triagem imediatamente e confirma em toast + mensagem no chat.
  - mensagem clicada recebe destaque de escolha e botoes travados.
  - callbacks stale/inelegiveis/concorrentes sao bloqueados de forma observavel e idempotente.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM, sem dependencias externas novas.
  - manter comportamento sequencial do fluxo de triagem por projeto (sem abrir execucao paralela adicional via callback).
  - manter fallback manual `/run_specs <arquivo>` funcional e documentado.

## Plan of Work
- Milestone 1 - Contrato de renderizacao e callback de `/specs`
  - Entregavel: builder de resposta de `/specs` com pagina, inline keyboard e callback data contextual (item + navegacao).
  - Evidencia de conclusao: testes unitarios do controller validando presenca de botoes por item, botoes de paginacao e callback data parseavel.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 2 - Handler `specs:` com validacoes de acesso, stale e elegibilidade
  - Entregavel: novo branch em `handleCallbackQuery` para `specs:` com parser defensivo, revalidacao de contexto e bloqueios observaveis.
  - Evidencia de conclusao: testes cobrindo callback invalido, stale/contexto expirado e callback nao autorizado.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3 - Inicio imediato de triagem no clique e gate de concorrencia
  - Entregavel: clique valido chama fluxo de `runSpecs` via caminho ja consolidado (`buildRunSpecsReply`), preservando gate de concorrencia e mensagens de bloqueio.
  - Evidencia de conclusao: testes garantindo que clique valido dispara `runSpecs` e que `already-running`/`blocked` nao iniciam nova triagem.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4 - UX de confirmacao (destaque + trava + confirmacao dupla)
  - Entregavel: apos clique valido, mensagem clicada e editada com destaque `✅` e botoes desabilitados; operador recebe toast + mensagem no chat.
  - Evidencia de conclusao: testes verificando `editMessageText` com destaque/trava e envio de confirmacao adicional por chat.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 5 - Regressao, aceite e rastreabilidade
  - Entregavel: cobertura CA-01..CA-10 verde e spec atualizada como documento vivo com evidencias do recorte entregue.
  - Evidencia de conclusao: `npm test`, `npm run check`, `npm run build` sem erro + diff na spec de origem.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para registrar baseline antes da mudanca.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "handleSpecsCommand|buildSpecsReply|handleCallbackQuery|buildRunSpecsReply|PLAN_SPEC_CALLBACK_PREFIX|PROJECTS_CALLBACK_PREFIX" src/integrations/telegram-bot.ts` para mapear pontos exatos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Evoluir `src/integrations/telegram-bot.ts` para trocar `buildSpecsReply` textual por renderizador paginado de `/specs` que retorne `{ text, extra }` com `inline_keyboard` por item elegivel e navegacao.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar prefixos, parser e construtores de callback data de `/specs` com marcador de contexto (para stale/reuso).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar branch `specs:` em `handleCallbackQuery` e criar `handleSpecsCallbackQuery` com: gate de acesso, parse defensivo, validacao de contexto vigente e resposta para callback invalido/stale.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar selecao por clique no handler de `/specs`: resolver item alvo, revalidar elegibilidade via `validateRunSpecsTarget`, chamar `buildRunSpecsReply` e bloquear inicio em casos `already-running`/`blocked`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar confirmacao dupla no clique de `/specs`: `answerCbQuery` + mensagem no chat, com mensagens distintas para sucesso e bloqueios observaveis.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar edicao best effort da mensagem clicada para destaque `✅` e travamento de botoes, com log explicito se `editMessageText` falhar.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Implementar comportamento idempotente para callback repetido da mesma mensagem/contexto (sem nova chamada de `runSpecs`, retorno observavel de stale/ja processado).
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar helper de testes em `src/integrations/telegram-bot.test.ts` para suportar cenarios de callback `/specs`, captura de `editMessageText` e confirmacoes no chat.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar testes de `/specs` cobrindo, no minimo: lista paginada com botoes, clique valido iniciando triagem, destaque/trava da mensagem, stale, inelegibilidade no clique, concorrencia e acesso nao autorizado.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/telegram-bot.test.ts` para validacao focada da superficie Telegram.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` no bloco de status de atendimento/evidencias para o recorte CA-01..CA-10.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: cenarios de `/specs` cobrem CA-01..CA-10 (listagem paginada, clique valido, bloqueios e stale/reuso) sem regressao em callbacks existentes.
- Comando: `rg -n "specs:|/specs|answerCbQuery|editMessageText|runSpecs" src/integrations/telegram-bot.ts`
  - Esperado: branch `specs:` presente no roteador de callbacks, parser dedicado e fluxo de clique ligado a `runSpecs` com resposta observavel.
- Comando: `npm test`
  - Esperado: suite completa verde, incluindo comandos/callbacks antigos (`/projects`, `/plan_spec`, `/run_specs`) sem regressao.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build sem erro apos ampliar contrato interno de callback de `/specs`.
- Comando: `rg -n "CA-01|CA-02|CA-03|CA-04|CA-05|CA-06|CA-07|CA-08|CA-09|CA-10|Last reviewed at" docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - Esperado: documento vivo atualizado com rastreabilidade dos criterios deste ticket.

## Idempotence and Recovery
- Idempotencia:
  - callback de `/specs` para contexto ja consumido deve retornar resposta observavel sem reiniciar triagem.
  - reexecucao dos comandos de teste/validacao nao altera estado funcional alem de artefatos temporarios de teste.
- Riscos:
  - payload de callback exceder limite do Telegram se incluir contexto em excesso.
  - lista de specs mudar entre render e clique, gerando selecao incorreta sem validacao defensiva.
  - falha no `editMessageText` mascarar sucesso operacional se nao houver fallback de confirmacao no chat.
  - corrida de cliques rapidos disparar mais de uma tentativa de triagem se lock/idempotencia for incompleto.
- Recovery / Rollback:
  - manter fallback `/run_specs <arquivo>` sempre funcional para operacao manual em caso de incidente no callback.
  - se callback data/contexto ficar invalido, responder stale e instruir `"Use /specs para atualizar a lista"`.
  - em falha de edicao de mensagem, manter confirmacao no chat + log de erro, sem reverter triagem ja iniciada.
  - se regressao atingir callbacks existentes, isolar rollback no branch `specs:` sem desfazer `projects:` e `plan-spec:`.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-20-specs-click-selection-inline-callback-and-triage-start-gap.md`.
- Referencias obrigatorias consultadas:
  - `docs/specs/2026-02-20-ux-de-selecao-por-clique-com-destaque-e-confirmacao-em-specs-e-plan-spec.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/spec-discovery.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.test.ts`
- Dependencias relacionadas fora de escopo imediato:
  - `tickets/open/2026-02-20-plan-spec-callback-highlight-lock-and-double-confirmation-gap.md`
  - `tickets/open/2026-02-20-callback-observability-and-block-reason-taxonomy-gap.md`
  - `tickets/open/2026-02-20-rf24-sequentiality-alignment-with-multi-runner-mode-gap.md`
- Evidencias esperadas ao concluir execucao do plano:
  - diff com callback `specs:` e inline keyboard em `/specs`.
  - asserts de teste comprovando bloqueio de stale/inelegibilidade/concorrencia.
  - update da spec de origem com status do recorte entregue.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `src/integrations/telegram-bot.ts`:
    - `handleCallbackQuery` deve aceitar prefixo `specs:`.
    - novos parsers/builders para callback data de `/specs`.
    - renderizador de `/specs` passa de texto puro para `text + inline keyboard`.
    - estado interno para controle de contexto/stale/idempotencia de callbacks de `/specs`.
  - `src/integrations/telegram-bot.test.ts`:
    - helpers de callback precisam cobrir casos de `/specs` com edicao de mensagem e confirmacao no chat.
- Compatibilidade:
  - `BotControls` existente deve ser reutilizado (`listEligibleSpecs`, `validateRunSpecsTarget`, `runSpecs`) sem quebra de contrato publico com `src/main.ts`.
  - `/run_specs <arquivo>` permanece funcional como fallback manual.
  - fluxo do runner continua respeitando gates de concorrencia ja existentes (`already-running`/`blocked`).
- Dependencias externas e mocks:
  - sem novas bibliotecas.
  - reuso de `telegraf` (inline keyboard, callback query, `answerCbQuery`, `editMessageText`).
  - testes seguem com doubles locais, sem Telegram real e sem rede.
