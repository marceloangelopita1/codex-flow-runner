# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (decima rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec`, com foco nos segundos turnos via `codex exec resume`.
- Resultado esperado:
  - `/codex_chat` validado em dois turnos no mesmo contexto, sem parser error e sem `unexpected argument '-s'`;
  - `/plan_spec` validado em dois turnos (brief + refinamento), sem parser error;
  - evidencias objetivas registradas com janela UTC;
  - correlacao de logs registrada por `journalctl -u` quando a unit existir, ou justificativa objetiva de indisponibilidade.
- Escopo:
  - executar preflight operacional antes da validacao manual;
  - executar validacoes manuais em ordem sequencial fixa;
  - consolidar evidencias no ticket da decima rodada;
  - manter este ExecPlan como documento vivo durante a execucao.
- Fora de escopo:
  - alterar codigo em `src/`, testes automatizados ou contratos;
  - fechar ticket, commitar ou fazer push;
  - paralelizar validacao de comandos/tickets.

## Progress
- [x] 2026-02-23 14:23Z - Planejamento inicial da decima rodada concluido com leitura do ticket alvo e referencias.
- [x] 2026-02-23 14:25Z - Preflight operacional executado e classificado como `BLOCKED` (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- [ ] 2026-02-23 14:23Z - `/status` inicial registrado no chat autorizado.
- [ ] 2026-02-23 14:23Z - `/codex_chat` validado em dois turnos no mesmo contexto sem parser error.
- [ ] 2026-02-23 14:23Z - Limpeza de sessao pos `/codex_chat` validada com `/status`.
- [ ] 2026-02-23 14:23Z - `/plan_spec` validado em dois turnos (`brief` + refinamento) sem parser error.
- [ ] 2026-02-23 14:23Z - `/plan_spec_status` registrado e sessao final confirmada sem residuos.
- [x] 2026-02-23 14:25Z - Correlacao de logs consolidada (justificativa objetiva: `codex-flow-runner.service` indisponivel no host).
- [x] 2026-02-23 14:25Z - Ticket atualizado com gate final explicito `NO_GO` (ticket mantido aberto nesta etapa).

## Surprises & Discoveries
- 2026-02-23 14:21Z - A nona rodada foi fechada como `split-follow-up` por bloqueio operacional recorrente (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- 2026-02-23 14:21Z - O baseline tecnico herdado permaneceu verde (`codex exec resume --help` sem `-s/--sandbox` e `codex-client.test.ts` com `# pass 229` e `# fail 0`), mas sem substituir aceite manual em Telegram real.
- 2026-02-23 14:21Z - O principal risco da decima rodada continua sendo operacional, nao de implementacao.
- 2026-02-23 14:25Z - O preflight da decima rodada repetiu o bloqueio operacional: `telegram-cli`, `tg`, `tdl` e `telethon` ausentes no host.
- 2026-02-23 14:25Z - Mesmo sem unit `systemd`, o runner manual permaneceu ativo (`tsx src/main.ts`), mas isso nao habilita a execucao dos passos manuais no Telegram sem cliente de usuario.
- 2026-02-23 14:25Z - O baseline local foi reconfirmado nesta rodada (`codex exec resume --help` sem `-s/--sandbox` e `npm run test -- src/integrations/codex-client.test.ts` com `# pass 229`, `# fail 0`), reforcando bloqueio estritamente operacional.

## Decision Log
- 2026-02-23 - Decisao: manter hard-gate de preflight antes de qualquer passo manual no Telegram.
  - Motivo: impedir validacao parcial sem canal real operavel.
  - Impacto: bloqueios operacionais ficam explicitos no inicio da janela UTC.
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza de sessao -> `/plan_spec`.
  - Motivo: reduzir contaminacao de contexto entre fluxos.
  - Impacto: evidencias ficam mais auditaveis por fluxo.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (resposta observavel + ausencia do erro alvo).
  - Motivo: incidente original foi parser error em segundo turno de `resume`.
  - Impacto: `GO` somente com prova objetiva dos dois fluxos completos.
- 2026-02-23 14:25Z - Decisao: aplicar hard-stop no step 9 e encerrar esta execucao com gate `NO_GO`.
  - Motivo: ausencia de cliente Telegram de usuario operavel no host (`telegram-cli`, `tg`, `tdl`, `telethon`) e unit `codex-flow-runner.service` indisponivel para correlacao por servico.
  - Impacto: steps 10-14 permanecem pendentes e dependem de nova janela UTC com capacidade operacional minima.

## Outcomes & Retrospective
- Status final: execucao concluida nesta etapa com gate `NO_GO` por bloqueio operacional; ticket da decima rodada permanece aberto.
- O que funcionou: preflight completo, baseline local reconfirmado e evidencias objetivas consolidadas no ticket.
- O que ficou pendente: validacoes manuais reais em Telegram (`/status`, `/codex_chat` em 2 turnos, limpeza de sessao, `/plan_spec` em 2 turnos e `/plan_spec_status`).
- Proximos passos: repetir os steps 10-16 em nova janela UTC com cliente Telegram de usuario operavel no host e, idealmente, com unit `codex-flow-runner.service` disponivel para correlacao por `journalctl -u`.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `PLANS.md`
- Fluxo atual:
  - primeiro turno usa `codex exec`;
  - turnos seguintes usam `codex exec resume`;
  - erro alvo historico: parser error com `unexpected argument '-s'` em sessoes interativas.
- Restricoes tecnicas:
  - fluxo estritamente sequencial por ticket;
  - sem alteracao de codigo nesta etapa;
  - aceite depende de Telegram real no chat autorizado.

## Plan of Work
- Milestone 1 - Prontidao operacional da decima rodada.
  - Entregavel: preflight executado com classificacao `READY` ou `BLOCKED`.
  - Evidencia de conclusao: capacidade operacional minima comprovada (ou bloqueio objetivo registrado).
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error.
  - Evidencia de conclusao: `/status` inicial, respostas observaveis e limpeza de sessao confirmada.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento sem parser error e com status final coerente.
  - Evidencia de conclusao: respostas observaveis dos dois turnos e `/plan_spec_status` consistente.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
- Milestone 4 - Consolidacao final e gate.
  - Entregavel: ticket atualizado com janela UTC, correlacao de logs e decisao `GO` ou `NO_GO`.
  - Evidencia de conclusao: checklist do ticket fechado tecnicamente para a rodada.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar chat autorizado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar disponibilidade da unit.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para registrar runner ativo por processo manual.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para checar cliente Telegram de usuario.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para validar alternativa Python local.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,80p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico antes da validacao manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar gate de prontidao: se nao houver cliente Telegram de usuario operavel, registrar `BLOCKED` no ticket e encerrar a rodada com `NO_GO`.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar o estado inicial com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`; enviar turno 1 e turno 2 no mesmo contexto, registrando resposta observavel e ausencia do erro alvo.
12. (workdir: `N/A - Telegram`) Encerrar `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`; enviar brief inicial e refinamento (segundo turno), registrando ausencia de parser error.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e confirmar limpeza.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md` com execution log, checklist e gate final.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan nas secoes `Progress`, `Decision Log` e `Outcomes & Retrospective` com o resultado real.

## Validation and Acceptance
- Comando: `/codex_chat` com dois turnos no mesmo contexto.
  - Esperado: respostas observaveis nos dois turnos, sem `unexpected argument '-s'` ou parser error.
- Comando: `/plan_spec` com brief inicial + refinamento.
  - Esperado: segundo turno processado, sem parser error, com continuidade de contexto.
- Comando: `/status` (antes/depois) e `/plan_spec_status` (final).
  - Esperado: estados coerentes, sem sessao zumbi e sem conflito residual.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
  - Esperado: evidencias objetivas e gate final explicito no ticket da rodada.
- Criterio final:
  - `GO`: ambos os fluxos aprovados manualmente em dois turnos, com evidencias completas e coerentes.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencias incompletas.

## Idempotence and Recovery
- Idempotencia:
  - o plano pode ser reexecutado em nova janela UTC sem alteracoes de codigo;
  - preflight e baseline tecnico podem ser repetidos sem efeitos colaterais funcionais;
  - validacoes manuais podem ser repetidas apos limpeza explicita das sessoes.
- Riscos:
  - ausencia recorrente de cliente Telegram de usuario no host;
  - indisponibilidade de operador no chat autorizado durante a janela;
  - inexistencia da unit `codex-flow-runner.service` para correlacao por servico;
  - sessao residual de `/codex_chat` ou `/plan_spec` contaminando reteste.
- Recovery / Rollback:
  - se houver sessao presa, limpar com encerramento manual (`/codex_chat`) e `/plan_spec_cancel` antes de novo ciclo;
  - se preflight falhar, registrar `NO_GO` com bloqueio objetivo e abrir novo follow-up rastreavel;
  - se erro alvo reaparecer, anexar evidencias da janela UTC e escalar follow-up tecnico focado em `codex exec resume`.

## Artifacts and Notes
- Ticket da rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
- ExecPlan da rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-rodada.md`
- Referencias usadas:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
- Evidencias esperadas durante execucao:
  - inicio/fim da janela UTC;
  - transcricao curta dos turnos de `/codex_chat` e `/plan_spec`;
  - snapshots de `/status` e `/plan_spec_status`;
  - saida de correlacao via `journalctl -u` ou justificativa de indisponibilidade.

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma interface de codigo nesta etapa (plano operacional de validacao).
- Compatibilidade:
  - preserva o contrato atual (`codex exec` no turno inicial e `codex exec resume` nos turnos seguintes).
- Dependencias externas e mocks:
  - Telegram Bot API funcional e bot autenticado;
  - chat autorizado por `TELEGRAM_ALLOWED_CHAT_ID`;
  - runner ativo (via `systemd` ou processo manual);
  - operador humano com cliente Telegram de usuario para execucao real dos comandos.
