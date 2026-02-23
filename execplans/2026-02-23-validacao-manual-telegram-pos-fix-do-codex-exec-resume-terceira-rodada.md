# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (terceira rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual em Telegram real para confirmar que o segundo turno de `/codex_chat` e `/plan_spec` nao regressou para `unexpected argument '-s'` apos o fix de `codex exec resume`.
- Resultado esperado:
  - dois turnos bem-sucedidos em `/codex_chat`, sem parser error no segundo turno;
  - dois turnos bem-sucedidos em `/plan_spec`, sem parser error no segundo turno;
  - evidencias objetivas com timestamp UTC registradas no ticket alvo;
  - gate final `GO` para permitir fechamento com `Closure reason: fixed`.
- Escopo:
  - preparar preflight operacional para validacao manual real;
  - executar roteiro sequencial (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias no ticket com decisao auditavel `GO/NO_GO`.
- Fora de escopo:
  - mudancas de codigo em `src/`;
  - alteracoes de arquitetura;
  - commit/push;
  - fechamento sem cumprir criterios manuais de aceite.

## Progress
- [x] 2026-02-23 13:30Z - Planejamento da terceira rodada concluido com leitura do ticket alvo, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-23 13:31Z - Preflight operacional concluido com janela UTC iniciada, `TELEGRAM_ALLOWED_CHAT_ID` confirmado e estado do runner identificado (unit ausente + processo manual ativo).
- [ ] 2026-02-23 13:31Z - Validacao manual de `/codex_chat` (dois turnos) concluida sem parser error. (Bloqueado: sem cliente Telegram de usuario no terminal para enviar comandos reais ao bot)
- [ ] 2026-02-23 13:31Z - Validacao manual de `/plan_spec` (dois turnos) concluida sem parser error. (Bloqueado pelo mesmo impedimento operacional)
- [x] 2026-02-23 13:32Z - Evidencias consolidadas no ticket e gate final `NO_GO` registrado (ticket mantido aberto nesta etapa).

## Surprises & Discoveries
- 2026-02-23 13:30Z - Rodadas anteriores ficaram `NO_GO` por bloqueio operacional, nao por regressao tecnica comprovada.
- 2026-02-23 13:31Z - O host segue sem `codex-flow-runner.service`; runner continua ativo por processo manual (`tsx src/main.ts`), reduzindo observabilidade por `journalctl -u`.
- 2026-02-23 13:30Z - Telegram Bot API e testes focados em `codex-client` estavam saudaveis, mas isso nao substitui o aceite manual ponta-a-ponta.
- 2026-02-23 13:32Z - Nenhum cliente Telegram de usuario foi encontrado no terminal (`telegram-cli`, `tg`, `tdl`, `telethon` ausentes), bloqueando os passos manuais do plano.

## Decision Log
- 2026-02-23 - Decisao: manter execucao estritamente sequencial (`/codex_chat` antes de `/plan_spec`).
  - Motivo: reduzir conflito de contexto entre sessoes e facilitar correlacao das evidencias.
  - Impacto: trilha deterministica para gate final.
- 2026-02-23 - Decisao: exigir evidencia dupla por fluxo (saida observavel no Telegram + ausencia do erro alvo no periodo validado).
  - Motivo: garantir fechamento auditavel do incidente original.
  - Impacto: sem as duas evidencias, resultado obrigatorio e `NO_GO`.
- 2026-02-23 - Decisao: tratar indisponibilidade de cliente Telegram de usuario como bloqueio operacional formal.
  - Motivo: evitar falso positivo com validacao apenas via CLI/testes.
  - Impacto: se bloquear novamente, registrar `NO_GO` e pendencias objetivas no ticket.
- 2026-02-23 13:32Z - Decisao: encerrar esta execucao com `NO_GO` sem fechamento do ticket.
  - Motivo: instrucao da etapa atual exige implementar/validar sem fechar ticket nem versionar.
  - Impacto: ticket permanece aberto com evidencias atualizadas e pendencias manuais explicitas.

## Outcomes & Retrospective
- Status final desta execucao: `NO_GO` (ticket mantido aberto).
- O que funcionou: preflight tecnico, confirmacao do contrato `codex exec resume`, baseline de testes (`229/229`) e consolidacao de evidencias no ticket.
- O que ficou pendente: validacao manual real em chat autorizado com dois turnos por fluxo (`/codex_chat` e `/plan_spec`), incluindo `/status` e `/plan_spec_status`.
- Proximos passos: repetir os passos 7-11 do plano em ambiente com operador humano e cliente Telegram disponivel para buscar gate `GO`.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `src/integrations/codex-client.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
- Fluxo atual relevante:
  - primeiro turno de sessoes interativas usa `codex exec`;
  - segundo turno usa `codex exec resume`;
  - bug historico era parser error `unexpected argument '-s'` no `resume`.
- Restricoes tecnicas:
  - fluxo sequencial (sem paralelismo de tickets/sessoes);
  - chat deve ser o autorizado por `TELEGRAM_ALLOWED_CHAT_ID`;
  - evidencia de aceite precisa estar no ticket com timestamp UTC.

## Plan of Work
- Milestone 1 - Preflight e desbloqueio operacional.
  - Entregavel: ambiente validavel com canal humano no Telegram e baseline tecnico registrado.
  - Evidencia de conclusao: janela UTC iniciada, estado do runner identificado e capacidade de envio manual confirmada.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem erro de parser no segundo turno.
  - Evidencia de conclusao: trecho do segundo turno + timestamp UTC + encerramento limpo da sessao.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento (segundo turno) processados sem parser error.
  - Evidencia de conclusao: resposta observavel do refinamento + snapshot de `/plan_spec_status`.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
- Milestone 4 - Consolidacao e gate final.
  - Entregavel: ticket com evidencias completas e decisao `GO/NO_GO` justificada.
  - Evidencia de conclusao: checklist de closure criteria preenchido e gate explicito no ticket.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md` (se `NO_GO`)
    - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md` (se `GO`, apenas na etapa de fechamento).

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para marcar inicio da janela.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar chat autorizado configurado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para identificar se a observabilidade principal e via unit.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` e registrar processo manual do runner.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,40p'` para reconfirmar contrato da CLI sem `-s/--sandbox` no `resume`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico antes da rodada manual.
7. (workdir: `N/A - Telegram`) Confirmar disponibilidade de operador humano no chat autorizado e executar `/status` para snapshot inicial sem sessao conflitante.
8. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 sequenciais no mesmo contexto e verificar ausencia de `unexpected argument '-s'`.
9. (workdir: `N/A - Telegram`) Encerrar `/codex_chat` por botao de encerramento (ou handoff controlado) e validar estado limpo com `/status`.
10. (workdir: `N/A - Telegram`) Executar `/plan_spec` com brief inicial, enviar mensagem de refinamento (segundo turno) e verificar ausencia de parser error.
11. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, usar `/plan_spec_cancel` e confirmar limpeza.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para marcar fim da janela.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Quando houver unit, rodar `journalctl -u codex-flow-runner --since '60 minutes ago' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar o ticket alvo com evidencias UTC, trechos observaveis e gate `GO/NO_GO`.

## Validation and Acceptance
- Comando: `/codex_chat` + duas mensagens sequenciais no mesmo contexto.
  - Esperado: segundo turno concluido sem `unexpected argument '-s'`.
- Comando: `/plan_spec` + brief inicial + refinamento (segundo turno).
  - Esperado: resposta de refinamento sem parser error e contexto preservado.
- Comando: `/status` (antes/depois) e `/plan_spec_status` (apos fluxo).
  - Esperado: estados coerentes, sem sessao zumbi ou conflito ativo.
- Comando: `journalctl -u codex-flow-runner --since '<inicio>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo no intervalo validado.
- Comando: `rg -n "Execution log|Gate|Validacao dos criterios|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`.
  - Esperado: ticket com evidencias objetivas dos dois fluxos e gate final explicito.
- Criterio final:
  - `GO`: ambos os fluxos aprovados em segundo turno com evidencias completas.
  - `NO_GO`: falha de parser, perda de contexto, ou impossibilidade de executar validacao manual real.

## Idempotence and Recovery
- Idempotencia:
  - plano pode ser repetido sem mudar codigo;
  - sessoes podem ser reiniciadas apos encerramento manual;
  - nova janela UTC pode ser aberta para nova tentativa com rastreabilidade.
- Riscos:
  - ausencia de cliente/operador Telegram humano para executar comandos reais;
  - indisponibilidade do bot/chat autorizado no momento da rodada;
  - sem `systemd`, observabilidade por `journalctl -u` pode ficar indisponivel;
  - sessao residual de `/codex_chat` ou `/plan_spec` contaminando o proximo fluxo.
- Recovery / Rollback:
  - se sessao ficar presa, encerrar via botao, `/status` e `/plan_spec_cancel` antes de repetir;
  - se bot estiver indisponivel, restaurar runner/autenticacao e reiniciar a partir do passo 1;
  - se o erro alvo reaparecer, registrar evidencias, manter `NO_GO` e abrir follow-up tecnico.

## Artifacts and Notes
- Ticket alvo:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
- Referencias usadas no planejamento:
  - `PLANS.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`
- Evidencias a anexar durante a execucao:
  - timestamps UTC de inicio/fim;
  - trecho curto do segundo turno de `/codex_chat`;
  - trecho curto do segundo turno de `/plan_spec`;
  - resultado de `/status` e `/plan_spec_status`;
  - correlacao de logs disponiveis no periodo.

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma (plano operacional; sem alteracao de contrato de codigo).
- Compatibilidade:
  - deve preservar o fluxo atual de continuidade por sessao (`exec` -> `resume`) sem alterar UX.
- Dependencias externas e mocks:
  - Telegram Bot API disponivel;
  - `TELEGRAM_ALLOWED_CHAT_ID` configurado para o chat de validacao;
  - runner ativo (`systemd` ou processo manual equivalente);
  - `codex` CLI autenticado para execucoes interativas.
