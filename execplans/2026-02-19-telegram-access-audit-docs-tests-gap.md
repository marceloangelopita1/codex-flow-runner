# ExecPlan - Telegram access audit docs tests gap

## Purpose / Big Picture
- Objetivo: fechar o gap de auditoria, documentacao operacional e cobertura automatizada de autorizacao no bot Telegram.
- Resultado esperado: tentativa nao autorizada gera warning com `chatId` + contexto minimo do evento; README formaliza modo restrito e modo sem restricao; testes automatizados cobrem cenarios autorizado, nao autorizado e sem restricao; spec fica atualizada com evidencias.
- Escopo:
  - Ajustar `src/integrations/telegram-bot.ts` para incluir contexto de evento/comando no log de acesso negado.
  - Documentar contrato operacional de `TELEGRAM_ALLOWED_CHAT_ID` em `README.md`.
  - Introduzir suite minima de testes para autorizacao do bot.
  - Atualizar `docs/specs/2026-02-19-telegram-access-and-control-plane.md` com rastreabilidade da entrega.
- Fora de escopo:
  - Implementar `/run-all` (coberto por `tickets/open/2026-02-19-telegram-run-all-access-control-gap.md`).
  - Alterar fluxo sequencial do runner (`runForever`) ou politica de processamento por ticket.
  - Implementar controle multi-chat ou autenticacao adicional fora de `chat.id`.

## Progress
- [x] 2026-02-19 11:39Z - Planejamento inicial concluido.
- [x] 2026-02-19 11:41Z - Contrato de auditoria de acesso negado implementado no controlador Telegram.
- [x] 2026-02-19 11:41Z - Documentacao de modo restrito/sem restricao atualizada no README.
- [x] 2026-02-19 11:43Z - Testes automatizados de autorizacao implementados e passando.
- [x] 2026-02-19 11:43Z - Spec atualizada com evidencias e revisao final.

## Surprises & Discoveries
- 2026-02-19 11:39Z - O repositorio nao possui script `npm test` nem arquivos de teste; sera necessario definir harness minimo de testes junto desta entrega.
- 2026-02-19 11:39Z - O warning atual de acesso negado registra apenas `{ chatId }`, sem comando/evento para auditoria operacional.
- 2026-02-19 11:41Z - `node --test` com glob quoted (`"src/**/*.test.ts"`) nao encontrou arquivos no ambiente atual; `tsx --test src/**/*.test.ts` funcionou de forma direta.
- 2026-02-19 11:42Z - Dependencias ainda nao estavam instaladas localmente para validacao (`telegraf` ausente), exigindo `npm ci` antes da execucao da suite.

## Decision Log
- 2026-02-19 - Decisao: adotar `node:test` com loader `tsx` para testes TypeScript.
  - Motivo: evitar dependencias novas e manter stack de desenvolvimento enxuta.
  - Impacto: adicionar script de teste em `package.json` (`tsx --test src/**/*.test.ts`) e criar arquivo(s) `*.test.ts`.
- 2026-02-19 - Decisao: padronizar contexto minimo de auditoria com `chatId`, `eventType` e `command`.
  - Motivo: atender CA-03 com dados suficientes para triagem operacional.
  - Impacto: ajuste na assinatura/uso de verificacao de acesso no controlador Telegram.

## Outcomes & Retrospective
- Status final: execucao concluida para o escopo deste plano (sem fechamento de ticket e sem commit/push).
- O que funcionou: contrato de auditoria foi enriquecido, README formalizou os modos de acesso e a suite automatizada passou em Node.js 20.
- O que ficou pendente: CA-01/CA-02 permanecem dependentes da superficie completa apos entrega de `/run-all` no ticket relacionado.
- Proximos passos: executar etapa de fechamento do ticket com versionamento, apos alinhamento com o ticket de `/run-all`.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/telegram-bot.ts` - ponto de autorizacao e log de tentativa negada.
  - `README.md` - documentacao operacional de configuracao e comandos Telegram.
  - `package.json` - scripts de validacao e execucao de testes (`test`, `check`, `build`).
  - `docs/specs/2026-02-19-telegram-access-and-control-plane.md` - requisitos RF-03/RF-04 e CAs vinculados ao ticket.
- Fluxo atual:
  - Handlers registrados: `/status`, `/pause`, `/resume`.
  - `isAllowed(chatId)` retorna `true` quando `TELEGRAM_ALLOWED_CHAT_ID` esta ausente (modo sem restricao implicito).
  - Em negacao, warning atual contem apenas `chatId`.
- Restricoes tecnicas:
  - Projeto em Node.js 20+, TypeScript ESM, sem framework de testes dedicado.
  - Arquitetura em camadas (`src/core`, `src/integrations`, `src/config`) e fluxo sequencial devem ser preservados.

## Plan of Work
- Milestone 1: Contrato de auditoria de acesso Telegram definido e aplicado no codigo.
  - Entregavel: controlador registra tentativa negada com contexto minimo (`chatId`, `eventType`, `command` quando aplicavel).
  - Evidencia de conclusao: diff em `src/integrations/telegram-bot.ts` e busca textual mostrando payload enriquecido.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`.
- Milestone 2: Documentacao operacional dos modos de acesso formalizada.
  - Entregavel: secao explicita no README diferenciando modo restrito (`TELEGRAM_ALLOWED_CHAT_ID` definido) e modo sem restricao (variavel ausente), com impacto nos comandos.
  - Evidencia de conclusao: secao presente e localizada por `rg` com termos dos dois modos.
  - Arquivos esperados: `README.md`.
- Milestone 3: Cobertura automatizada de autorizacao adicionada.
  - Entregavel: script de teste ativo e casos cobrindo autorizado, nao autorizado e sem restricao.
  - Evidencia de conclusao: `npm test` passando com asserts de bloqueio/liberacao e log de auditoria.
  - Arquivos esperados: `package.json`, `src/integrations/telegram-bot.test.ts` (ou equivalente no mesmo dominio).
- Milestone 4: Rastreabilidade da spec atualizada apos validacao.
  - Entregavel: spec com `Last reviewed at (UTC)` atualizado, evidencias da entrega e status refletindo CAs atendidos por este ticket.
  - Evidencia de conclusao: diff da spec com referencias a arquivos de implementacao/teste.
  - Arquivos esperados: `docs/specs/2026-02-19-telegram-access-and-control-plane.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para registrar baseline de tipagem antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "isAllowed|Tentativa de acesso nao autorizado|bot\\.command" src/integrations/telegram-bot.ts` para mapear pontos de alteracao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` via `$EDITOR src/integrations/telegram-bot.ts` para incluir contexto minimo de evento na verificacao/log de acesso.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Tentativa de acesso|chatId|eventType|command" src/integrations/telegram-bot.ts` para confirmar contrato de auditoria no codigo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar README via `$EDITOR README.md` com secao de modos de acesso Telegram (restrito e sem restricao).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "modo restrito|modo sem restricao|TELEGRAM_ALLOWED_CHAT_ID" README.md` para validar presenca da documentacao operacional.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar scripts de teste via `$EDITOR package.json`, adicionando comando de execucao automatizada (`tsx --test src/**/*.test.ts`).
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar testes via `$EDITOR src/integrations/telegram-bot.test.ts` cobrindo autorizado, nao autorizado e modo sem restricao com assercoes de log/comportamento.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm ci` para garantir dependencias instaladas no ambiente local.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para validar a suite nova.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm run build` para confirmar integridade de tipagem e build.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar spec via `$EDITOR docs/specs/2026-02-19-telegram-access-and-control-plane.md` com evidencias, status de atendimento e timestamp de revisao.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Last reviewed at|Status de atendimento|Evidencias de validacao|telegram-bot\\.test" docs/specs/2026-02-19-telegram-access-and-control-plane.md` para validar rastreabilidade.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/integrations/telegram-bot.ts README.md package.json docs/specs/2026-02-19-telegram-access-and-control-plane.md` para auditoria final dos artefatos da entrega.

## Validation and Acceptance
- Comando: `npm test`
  - Esperado: todos os testes passam cobrindo cenarios autorizado, nao autorizado e sem restricao, sem chamadas indevidas de controle em caso nao autorizado.
- Comando: `rg -n "Tentativa de acesso|chatId|eventType|command" src/integrations/telegram-bot.ts`
  - Esperado: evidencia de log com contexto minimo de evento junto de `chatId` (CA-03).
- Comando: `rg -n "modo restrito|modo sem restricao|TELEGRAM_ALLOWED_CHAT_ID" README.md`
  - Esperado: documentacao explicita dos dois modos operacionais de acesso (CA-04).
- Comando: `npm run check && npm run build`
  - Esperado: zero erro de tipagem e build concluido.
- Comando: `rg -n "Last reviewed at|tickets/open/2026-02-19-telegram-access-audit-docs-tests-gap.md|src/integrations/telegram-bot\\.test\\.ts" docs/specs/2026-02-19-telegram-access-and-control-plane.md`
  - Esperado: spec atualizada com rastreabilidade e evidencias da entrega.

## Idempotence and Recovery
- Idempotencia:
  - `npm test`, `npm run check` e `npm run build` podem ser reexecutados sem efeitos colaterais no estado de runtime.
  - Mudancas de documentacao e codigo sao deterministicas e revisaveis por diff.
- Riscos:
  - Acoplamento com internals do `Telegraf` pode dificultar teste direto de handlers.
  - Mudanca de assinatura de verificacao de acesso pode introduzir regressao em comandos existentes se nao houver cobertura completa.
  - Diferenca entre "sem restricao" e "restrito" pode ficar ambigua se README e comportamento divergirem.
- Recovery / Rollback:
  - Se a abordagem de teste acoplar demais no framework, extrair/adaptar helper de autorizacao para unidade pura e manter teste no nivel de contrato.
  - Em falha de build/teste apos alteracao no controlador, reverter apenas o trecho novo do contrato de contexto e reaplicar incrementalmente com testes por etapa.
  - Em inconsistencia de docs, priorizar alinhar README ao comportamento implementado e registrar decisao na spec antes de fechar ticket.

## Artifacts and Notes
- PR/Diff: `git diff -- src/integrations/telegram-bot.ts README.md package.json docs/specs/2026-02-19-telegram-access-and-control-plane.md src/integrations/telegram-bot.test.ts`
- Logs relevantes: `npm test` (3 passed, 0 failed), `npm run check` (ok) e `npm run build` (ok).
- Evidencias de teste: casos nomeados para autorizado, nao autorizado e sem restricao; assercoes de payload de warning para acesso negado.
- Nota operacional: este plano depende de manter o fluxo sequencial do runner intacto e nao conflita com o ticket de `/run-all`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - Contrato interno de autorizacao no `TelegramController` (entrada deve carregar contexto de evento/comando para auditoria).
  - Contrato operacional documentado de `TELEGRAM_ALLOWED_CHAT_ID` no README.
- Compatibilidade:
  - Sem mudanca esperada em variaveis de ambiente existentes; somente formalizacao do comportamento quando `TELEGRAM_ALLOWED_CHAT_ID` esta ausente.
  - Handlers existentes (`/status`, `/pause`, `/resume`) devem manter comportamento funcional, com observabilidade ampliada em negacoes.
- Dependencias externas e mocks:
  - Dependencia externa principal: `telegraf`.
  - Testes devem preferir doubles/mocks locais para logger e contexto de evento, evitando chamadas de rede Telegram.
