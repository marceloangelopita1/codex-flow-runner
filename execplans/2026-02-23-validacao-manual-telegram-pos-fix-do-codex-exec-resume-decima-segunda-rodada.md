# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (decima segunda rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec` apos `NO_GO` da decima primeira rodada.
- Resultado esperado:
  - `/codex_chat` validado em dois turnos no mesmo contexto, sem parser error e sem `unexpected argument '-s'`.
  - `/plan_spec` validado em dois turnos (brief + refinamento), sem parser error.
  - `/status` (antes/depois) e `/plan_spec_status` registrados com janela UTC.
  - correlacao de logs registrada por `journalctl -u` quando a unit existir, ou justificativa objetiva de indisponibilidade.
- Escopo:
  - executar preflight operacional com gate de prontidao antes da janela manual;
  - executar validacao manual sequencial fixa (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias objetivas no ticket da decima segunda rodada;
  - manter este ExecPlan como documento vivo durante a execucao.
- Fora de escopo:
  - alterar codigo em `src/`, contratos, testes automatizados ou comportamento do bot;
  - fechar ticket, mover ticket para `tickets/closed/`, commitar ou fazer push;
  - paralelizar validacoes de comandos/tickets.

## Progress
- [x] 2026-02-23 14:37Z - Planejamento inicial concluido com leitura do ticket alvo e referencias obrigatorias.
- [x] 2026-02-23 14:39Z - Preflight operacional executado e classificado como `BLOCKED` (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- [ ] 2026-02-23 14:37Z - `/status` inicial registrado no chat autorizado.
- [ ] 2026-02-23 14:37Z - `/codex_chat` validado em dois turnos no mesmo contexto sem parser error.
- [ ] 2026-02-23 14:37Z - Limpeza de sessao pos `/codex_chat` validada com `/status`.
- [ ] 2026-02-23 14:37Z - `/plan_spec` validado em dois turnos (`brief` + refinamento) sem parser error.
- [ ] 2026-02-23 14:37Z - `/plan_spec_status` registrado e sessao final confirmada sem residuos.
- [x] 2026-02-23 14:39Z - Correlacao de logs consolidada via justificativa objetiva (`STEP16_REASON=unit codex-flow-runner.service not found`).
- [x] 2026-02-23 14:39Z - Ticket atualizado com evidencias da janela UTC e gate final `NO_GO` (ticket mantido aberto nesta etapa).

## Surprises & Discoveries
- 2026-02-23 14:37Z - O bloqueio operacional herdado da decima primeira rodada persiste como risco central: sem cliente Telegram de usuario no host e, possivelmente, sem unit `codex-flow-runner.service`.
- 2026-02-23 14:37Z - O baseline tecnico herdado indica estabilidade de contrato (`codex exec resume --help` sem `-s/--sandbox`; `codex-client.test.ts` com `# pass 229` e `# fail 0`), sugerindo risco predominantemente operacional.
- 2026-02-23 14:37Z - O criterio de `GO` continua dependente de evidencia manual real em Telegram autorizado, nao apenas de testes automatizados locais.
- 2026-02-23 14:39Z - O preflight desta rodada repetiu o bloqueio operacional com ausencia simultanea de `telegram-cli`, `tg`, `tdl` e `telethon`, inviabilizando os passos manuais 10-14 no chat autorizado.
- 2026-02-23 14:39Z - Mesmo sem unit `systemd`, o runner manual permaneceu ativo (`tsx src/main.ts`), reforcando que o impeditivo atual e de instrumento de operacao humana no Telegram.
- 2026-02-23 14:39Z - O baseline local foi reconfirmado na mesma janela (`codex exec resume --help` sem `-s/--sandbox`; `npm run test -- src/integrations/codex-client.test.ts` com `# pass 229` e `# fail 0`), sem sinal de regressao de contrato CLI.

## Decision Log
- 2026-02-23 - Decisao: manter hard-gate de prontidao antes da execucao manual.
  - Motivo: impedir nova rodada sem precondicoes minimas para evidencia real no Telegram.
  - Impacto: quando `BLOCKED`, o plano registra `NO_GO` com rastreabilidade objetiva.
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza de sessao -> `/plan_spec`.
  - Motivo: reduzir contaminacao de contexto entre fluxos e facilitar auditoria do erro alvo.
  - Impacto: diagnostico fica mais objetivo por etapa.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (turno 1 + turno 2) com ausencia explicita de parser error.
  - Motivo: o incidente historico ocorre em `resume`, tipicamente apos o primeiro turno.
  - Impacto: `GO` so e permitido com prova de continuidade nos dois comandos.
- 2026-02-23 - Decisao: registrar correlacao via `journalctl -u` quando houver unit, ou justificativa objetiva quando nao houver.
  - Motivo: manter trilha auditavel mesmo em execucao manual do runner.
  - Impacto: evita lacuna de observabilidade no fechamento da rodada.
- 2026-02-23 14:39Z - Decisao: aplicar hard-stop no step 9 com gate `NO_GO` nesta etapa.
  - Motivo: ausencia de cliente Telegram de usuario operavel no host e indisponibilidade da unit `codex-flow-runner.service` para correlacao por servico.
  - Impacto: validacoes manuais obrigatorias (`/status`, `/codex_chat`, `/plan_spec`, `/plan_spec_status`) permanecem pendentes para nova janela UTC operacional.

## Outcomes & Retrospective
- Status final: execucao concluida nesta etapa com gate `NO_GO` (ticket mantido aberto; sem fechamento/commit/push).
- O que funcionou: preflight completo, baseline tecnico reconfirmado e registro de evidencias objetivas na janela UTC.
- O que ficou pendente: validacoes manuais em Telegram real (`/status`, `/codex_chat` em 2 turnos, limpeza de sessao, `/plan_spec` em 2 turnos e `/plan_spec_status`).
- Proximos passos: repetir os steps 10-16 em nova janela UTC com cliente Telegram de usuario operavel no host e, preferencialmente, com unit `codex-flow-runner.service` ativa para correlacao via `journalctl -u`.

## Context and Orientation
- Ticket alvo:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- Referencias obrigatorias desta rodada:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-primeira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-primeira-rodada.md`
- Fluxo atual sob validacao:
  - turno inicial via `codex exec`;
  - turnos seguintes via `codex exec resume`;
  - erro alvo historico: parser error com `unexpected argument '-s'` em turnos de `resume`.
- Restricoes tecnicas:
  - fluxo estritamente sequencial por ticket;
  - sem alteracao de codigo nesta etapa;
  - aceite depende de Telegram real em chat autorizado por `TELEGRAM_ALLOWED_CHAT_ID`.

## Plan of Work
- Milestone 1 - Gate de prontidao operacional.
  - Entregavel: preflight completo com classificacao `READY` ou `BLOCKED` e justificativa objetiva.
  - Evidencia de conclusao: execution log no ticket com saidas de ambiente e status do runner.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error e sem `unexpected argument '-s'`.
  - Evidencia de conclusao: `/status` inicial, respostas dos dois turnos e confirmacao de limpeza da sessao.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento no mesmo contexto sem parser error.
  - Evidencia de conclusao: respostas observaveis nos dois turnos e `/plan_spec_status` final coerente.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- Milestone 4 - Correlacao e gate final da rodada.
  - Entregavel: decisao final `GO` ou `NO_GO` com janela UTC, correlacao de logs e checklist atualizado.
  - Evidencia de conclusao: ticket com checklist completo e rationale do gate sem ambiguidades.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar o chat autorizado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar se a unit `codex-flow-runner.service` existe e esta ativa.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para registrar runner manual ativo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para checar cliente Telegram de usuario no host.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para checar alternativa Python local.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,80p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico antes da janela manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar gate de prontidao: classificar `READY` quando houver meio operavel para acionar Telegram real; caso contrario, registrar `BLOCKED` com motivo objetivo e pular para os steps 15-18.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar snapshot textual com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto e registrar respostas observaveis sem erro alvo.
12. (workdir: `N/A - Telegram`) Encerrar `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza de sessao.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e refinamento (segundo turno), registrando ausencia de parser error.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e confirmar limpeza.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva de indisponibilidade.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md` com execution log, checklist e gate final.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan nas secoes `Progress`, `Surprises & Discoveries`, `Decision Log` e `Outcomes & Retrospective` com o resultado real da rodada.

## Validation and Acceptance
- Comando: `/codex_chat` com dois turnos no mesmo contexto.
  - Esperado: respostas observaveis nos dois turnos, sem parser error e sem `unexpected argument '-s'`.
- Comando: `/plan_spec` com brief inicial + refinamento.
  - Esperado: segundo turno processado com continuidade de contexto e sem parser error.
- Comando: `/status` (antes/depois) e `/plan_spec_status` (final).
  - Esperado: estados coerentes, sem sessao zumbi e sem conflito residual.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
  - Esperado: ticket contem evidencias objetivas, checklist atualizado e gate final explicito.
- Criterio final:
  - `GO`: `/codex_chat` e `/plan_spec` aprovados manualmente em dois turnos, com evidencias completas e coerentes na mesma janela UTC.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencias incompletas/nao auditaveis.

## Idempotence and Recovery
- Idempotencia:
  - o plano pode ser reexecutado em nova janela UTC sem alterar codigo;
  - preflight e baseline tecnico podem ser repetidos sem efeitos colaterais funcionais;
  - validacoes manuais podem ser repetidas apos limpeza explicita das sessoes.
- Riscos:
  - ausencia recorrente de cliente Telegram de usuario no host;
  - indisponibilidade de operador no chat autorizado durante a janela;
  - inexistencia da unit `codex-flow-runner.service` para correlacao por servico;
  - sessao residual de `/codex_chat` ou `/plan_spec` contaminando retestes.
- Recovery / Rollback:
  - se houver sessao presa, encerrar `/codex_chat` manualmente e executar `/plan_spec_cancel` antes de novo ciclo;
  - se preflight falhar, registrar `NO_GO` com bloqueio objetivo e manter rastreabilidade em follow-up;
  - se erro alvo reaparecer, anexar janela UTC + logs e escalar follow-up tecnico focado em `codex exec resume`.

## Artifacts and Notes
- Ticket da rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- ExecPlan da rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- Referencias obrigatorias utilizadas no planejamento:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-primeira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-primeira-rodada.md`
- Evidencias esperadas durante execucao:
  - inicio/fim da janela UTC;
  - transcricao curta dos turnos de `/codex_chat` e `/plan_spec`;
  - snapshots textuais de `/status` e `/plan_spec_status`;
  - saida de correlacao via `journalctl -u` ou justificativa de indisponibilidade.

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma interface de codigo nesta etapa (plano operacional de validacao manual).
- Compatibilidade:
  - preserva o contrato atual de sessao (`codex exec` no primeiro turno e `codex exec resume` nos turnos seguintes).
- Dependencias externas e mocks:
  - Telegram Bot API funcional e bot autenticado;
  - chat autorizado configurado via `TELEGRAM_ALLOWED_CHAT_ID`;
  - runner ativo (via `systemd` ou processo manual);
  - operador humano com acesso ao chat autorizado para execucao real dos comandos.
