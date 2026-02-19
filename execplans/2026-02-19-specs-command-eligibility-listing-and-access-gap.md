# ExecPlan - /specs com listagem de elegibilidade e bloqueio de /run_specs invalido

## Purpose / Big Picture
- Objetivo: implementar a superficie `/specs` no bot Telegram e fechar o gap de validacao de existencia/elegibilidade em `/run_specs <arquivo-da-spec.md>`, sempre no contexto do projeto ativo.
- Resultado esperado:
  - `/specs` lista apenas specs elegiveis (`Status: approved` + `Spec treatment: pending`) do projeto ativo;
  - `/run_specs <arquivo>` bloqueia com mensagem explicita quando a spec nao existe ou nao e elegivel;
  - `/specs` e `/run_specs` continuam obedecendo o mesmo controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID`;
  - cobertura automatizada para CA-01, CA-03 e CA-11 da spec de origem.
- Escopo:
  - criar modulo dedicado de descoberta/parse de metadata de specs em `docs/specs/`;
  - adicionar comando `/specs` no `TelegramController`;
  - validar elegibilidade de `/run_specs` antes de acionar `controls.runSpecs(...)`;
  - atualizar wiring de `src/main.ts` para injetar servico de listagem/validacao de specs;
  - atualizar testes e rastreabilidade na spec de origem.
- Fora de escopo:
  - migracao global do baseline de metadata `Spec treatment` em todas as specs (ticket separado: `tickets/open/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`);
  - alteracoes no fluxo de orquestracao de stages de spec/ticket ja implementado no `TicketRunner`;
  - paralelizacao de specs ou tickets.

## Progress
- [x] 2026-02-19 20:02Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-19 20:12Z - Contrato de descoberta/validacao de specs implementado em `src/integrations/spec-discovery.ts`.
- [x] 2026-02-19 20:12Z - Comando `/specs` e bloqueios de `/run_specs` implementados no Telegram.
- [x] 2026-02-19 20:12Z - Testes automatizados para CA-01, CA-03 e CA-11 implementados e verdes.
- [x] 2026-02-19 20:12Z - Spec de origem atualizada com status de atendimento e evidencias.
- [x] 2026-02-19 20:12Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 20:02Z - `src/integrations/telegram-bot.ts` nao registra `/specs`; hoje somente `/run_specs` existe para specs e aceita qualquer argumento textual apos parser simples.
- 2026-02-19 20:02Z - `src/main.ts` nao injeta nenhuma API de listagem/validacao de specs no `TelegramController`.
- 2026-02-19 20:02Z - Nao existe modulo de descoberta de specs em `src/core` ou `src/integrations`; toda regra de elegibilidade ainda esta ausente no codigo.
- 2026-02-19 20:02Z - No estado atual de `docs/specs/`, apenas `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` declara `Spec treatment`, aumentando a importancia de mensagens claras para specs nao elegiveis por metadata incompleta.

## Decision Log
- 2026-02-19 - Decisao: criar um modulo dedicado de descoberta/parse de specs em `src/integrations` (filesystem), com contrato reutilizavel para listagem e validacao.
  - Motivo: centralizar leitura de `docs/specs/` e evitar duplicacao de regex/logica entre `/specs` e `/run_specs`.
  - Impacto: novo arquivo de integracao + testes proprios de parser/elegibilidade.
- 2026-02-19 - Decisao: aplicar a validacao de existencia/elegibilidade de `/run_specs` no `TelegramController`, antes de chamar `controls.runSpecs`.
  - Motivo: atender CA-03 no fluxo de comando sem expandir desnecessariamente o contrato do `TicketRunner` nesta etapa.
  - Impacto: `BotControls` passa a receber operacoes de specs (listar/validar) alem de `runSpecs`.
- 2026-02-19 - Decisao: tratar `Spec treatment` ausente como nao elegivel, com mensagem explicita de bloqueio.
  - Motivo: regra da spec exige metadata explicita para determinismo; ausencia nao pode resultar em falso-positivo de elegibilidade.
  - Impacto: algumas specs aprovadas permanecerao fora da listagem ate migracao do ticket P2.
- 2026-02-19 - Decisao: normalizar entrada de `/run_specs` aceitando `docs/specs/<arquivo>.md` ou `<arquivo>.md`, rejeitando caminhos invalidos.
  - Motivo: reduzir risco de path traversal e manter comportamento deterministico no projeto ativo.
  - Impacto: parser/validacao deve retornar erro objetivo para entrada malformada sem iniciar execucao.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas para o escopo deste ExecPlan (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou: contrato dedicado de specs evitou duplicacao no bot e simplificou cobertura de validacao (`eligible`, `not-found`, `not-eligible`, `invalid-path`).
- O que ficou pendente: apenas o ciclo posterior de fechamento operacional do ticket (movimentacao `tickets/open -> tickets/closed` + commit/push), fora desta etapa.
- Proximos passos: seguir etapa de fechamento do ticket quando autorizado, preservando rastreabilidade com esta entrega.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts` - registro de comandos, parse de `/run_specs`, mensagens e gate de acesso `isAllowed`.
  - `src/main.ts` - wiring entre bot, runner e servicos auxiliares.
  - `src/core/runner.ts` - entrada `requestRunSpecs(...)` atualmente sem validacao de elegibilidade de spec.
  - `src/integrations/telegram-bot.test.ts` - cobertura atual de comandos Telegram; ainda sem casos de `/specs` e sem bloqueio de elegibilidade em `/run_specs`.
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` - regra de elegibilidade e CAs pendentes (CA-01, CA-03, CA-11).
- Fluxo atual:
  - operador pode enviar `/run_specs <arquivo>`, o bot valida apenas presenca de argumento e delega para `controls.runSpecs`.
  - nao existe comando para listar specs elegiveis.
  - nao existe bloqueio explicito para spec inexistente ou nao elegivel.
- Fluxo alvo:
  - operador usa `/specs` para listar somente specs elegiveis do projeto ativo;
  - operador usa `/run_specs <arquivo>` e recebe bloqueio explicito se a spec nao existir ou nao cumprir metadata;
  - apenas spec elegivel segue para `controls.runSpecs`.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM, arquitetura em camadas e fluxo sequencial.
  - comando deve operar no projeto ativo atual (resolvido/sincronizado pelo estado do runner).
  - sem dependencias externas novas para parser de metadata.
- Definicoes operacionais deste plano:
  - Spec elegivel: arquivo em `docs/specs/*.md` com `Status: approved` e `Spec treatment: pending`.
  - Spec nao elegivel: qualquer arquivo que nao cumpra ambas as condicoes (incluindo metadata ausente/invalida).

## Plan of Work
- Milestone 1: Base de descoberta e elegibilidade de specs criada.
  - Entregavel: modulo de integracao para listar specs do projeto ativo e extrair metadata relevante (`Status`, `Spec treatment`) com classificacao de elegibilidade.
  - Evidencia de conclusao: testes dedicados do modulo cobrindo spec elegivel, spec inexistente, metadata ausente e metadata divergente.
  - Arquivos esperados: `src/integrations/spec-discovery.ts` (novo), `src/integrations/spec-discovery.test.ts` (novo).
- Milestone 2: Comando `/specs` integrado ao Telegram com acesso controlado.
  - Entregavel: handler `/specs` com gate `isAllowed`, resposta deterministica e legivel listando apenas specs elegiveis.
  - Evidencia de conclusao: testes do bot cobrindo lista com itens, lista vazia e bloqueio para chat nao autorizado.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 3: Validacao de `/run_specs <arquivo>` para existencia/elegibilidade.
  - Entregavel: fluxo de `/run_specs` valida alvo no projeto ativo antes de chamar `controls.runSpecs`, retornando bloqueio explicito para inexistente/nao elegivel.
  - Evidencia de conclusao: testes do bot garantindo que `controls.runSpecs` nao e chamado quando a validacao falha.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`.
- Milestone 4: Wiring de dependencia e coerencia documental.
  - Entregavel: `src/main.ts` injeta operacoes de specs no controller; help/documentacao refletem comando `/specs`.
  - Evidencia de conclusao: busca textual mostra comando registrado no bot e documentado no README/help.
  - Arquivos esperados: `src/main.ts`, `README.md` (se necessario), `src/integrations/telegram-bot.ts`.
- Milestone 5: Validacao final e rastreabilidade da spec.
  - Entregavel: suite de testes e verificacoes de tipagem/build verdes, com update da spec de origem marcando CA-01/CA-03/CA-11.
  - Evidencia de conclusao: comandos de validacao sem erro + diff da spec com `Last reviewed at (UTC)` e status de atendimento atualizado.
  - Arquivos esperados: `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para registrar baseline antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "run_specs|command\\(\"projects\"|isAllowed|BotControls" src/integrations/telegram-bot.ts src/main.ts src/core/runner.ts` para mapear pontos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/spec-discovery.ts` via `$EDITOR src/integrations/spec-discovery.ts` com:
   - listagem de `docs/specs/*.md` no projeto ativo;
   - parser de metadata para `Status` e `Spec treatment`;
   - validacao de elegibilidade e resultado explicito para `eligible`, `not-found` e `not-eligible`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/spec-discovery.test.ts` via `$EDITOR src/integrations/spec-discovery.test.ts` cobrindo cenarios de elegibilidade, metadata ausente e caminho inexistente.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` via `$EDITOR src/integrations/telegram-bot.ts` para:
   - incluir comando `/specs`;
   - usar novo controle de listagem de specs elegiveis;
   - validar `/run_specs <arquivo>` com o novo controle antes de `buildRunSpecsReply`;
   - responder bloqueios explicitos para arquivo inexistente, metadata nao elegivel e entrada invalida.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/main.ts` via `$EDITOR src/main.ts` para instanciar e injetar dependencia de descoberta/validacao de specs no `TelegramController`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar help textual em `src/integrations/telegram-bot.ts` (`/start`) e, se necessario, `README.md` para refletir `/specs`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` via `$EDITOR src/integrations/telegram-bot.test.ts` com casos para:
   - `/specs` listando somente elegiveis (CA-01);
   - `/run_specs <arquivo>` bloqueando inexistente/nao elegivel (CA-03);
   - chat nao autorizado bloqueado em `/specs` e `/run_specs` (CA-11).
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/spec-discovery.test.ts src/integrations/telegram-bot.test.ts` para validacao focada.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para validacao final completa.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` via `$EDITOR ...` com `Last reviewed at (UTC)` e marcacao de CA-01/CA-03/CA-11.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/integrations/spec-discovery.ts src/integrations/spec-discovery.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/main.ts docs/specs/2026-02-19-approved-spec-triage-run-specs.md README.md` para auditoria final.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/spec-discovery.test.ts`
  - Esperado: parser/listagem valida elegibilidade apenas com `Status: approved` + `Spec treatment: pending`; casos nao elegiveis e inexistentes sao cobertos.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: CA-01, CA-03 e CA-11 cobertos com asserts de mensagem e sem chamada indevida de `controls.runSpecs` em casos bloqueados.
- Comando: `rg -n "command\\(\"specs\"|/specs|Spec treatment|nao elegivel|nao encontrada" src/integrations/telegram-bot.ts src/main.ts src/integrations/spec-discovery.ts`
  - Esperado: registro de `/specs`, regras de elegibilidade e mensagens de bloqueio aparecem de forma consistente.
- Comando: `npm test`
  - Esperado: suite completa verde, sem regressao nos comandos existentes (`/run_all`, `/status`, `/projects`, `/select_project`).
- Comando: `npm run check && npm run build`
  - Esperado: contratos de tipos e build sem erro apos ampliar controles do bot.
- Comando: `rg -n "CA-01|CA-03|CA-11|Last reviewed at" docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
  - Esperado: spec de origem atualizada com rastreabilidade dos criterios atendidos.

## Idempotence and Recovery
- Idempotencia:
  - listagem/validacao de specs e operacao read-only; reexecucao nao altera estado do repositorio;
  - comandos de validacao (`npm test`, `npm run check`, `npm run build`) podem ser executados repetidamente sem efeitos colaterais permanentes.
- Riscos:
  - diversidade de metadata nas specs atuais pode gerar bloqueios frequentes por ausencia de `Spec treatment`;
  - regressao em `telegram-bot.ts` pode afetar comandos existentes se o parser de comandos for alterado de forma ampla;
  - validacao insuficiente de caminho pode abrir brecha para entrada malformada em `/run_specs`.
- Recovery / Rollback:
  - em regressao de comandos Telegram, restaurar comportamento de `/run_specs` para baseline e reintroduzir validacao em passos menores (primeiro parser, depois mensagens);
  - em falha de parser de metadata, degradar para `not-eligible` com log claro, sem iniciar execucao de spec;
  - se houver conflito com ticket de migracao de metadata, manter regra estrita de elegibilidade e registrar no `Decision Log` os casos bloqueados aguardando ticket P2.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-specs-command-eligibility-listing-and-access-gap.md`.
- Referencias obrigatorias consultadas:
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
- Dependencia de backlog relacionada: `tickets/open/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`.
- Evidencias esperadas de aceite:
  - nomes de testes novos/cobrindo CA-01, CA-03 e CA-11;
  - saida verde de `npm test`, `npm run check` e `npm run build`;
  - diff com comando `/specs` e bloqueios explicitos de `/run_specs`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `BotControls` em `src/integrations/telegram-bot.ts` deve incluir operacoes para listagem/validacao de specs do projeto ativo.
  - `TelegramController` passa a consumir novo contrato de specs para `/specs` e pre-validacao de `/run_specs`.
- Compatibilidade:
  - `TicketRunner.requestRunSpecs(...)` pode permanecer com contrato atual (`started | already-running | blocked`) pois o bloqueio de elegibilidade ocorre no controller.
  - comandos existentes devem manter semantica atual e mesmo gate de autorizacao por `TELEGRAM_ALLOWED_CHAT_ID`.
  - fluxo permanece sequencial, sem paralelizacao.
- Dependencias externas e mocks:
  - sem novas bibliotecas; usar `node:fs`/`node:path` para descoberta de specs.
  - testes de integracao de specs devem usar diretorios temporarios locais, sem rede e sem Telegram real.
