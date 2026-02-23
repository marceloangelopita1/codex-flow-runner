# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (decima terceira rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec`, removendo o bloqueio operacional herdado do `NO_GO` da decima segunda rodada.
- Resultado esperado:
  - `/status` inicial e final registrados no chat autorizado.
  - `/codex_chat` validado em dois turnos no mesmo contexto, sem parser error e sem `unexpected argument '-s'`.
  - `/plan_spec` validado em dois turnos (brief + refinamento), sem parser error.
  - `/plan_spec_status` registrado com estado coerente ao final.
  - correlacao de logs consolidada por `journalctl -u` quando unit existir, ou justificativa objetiva quando indisponivel.
- Escopo:
  - executar preflight operacional com gate de prontidao antes da janela manual;
  - executar validacao manual em ordem sequencial fixa (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias objetivas com janela UTC no ticket da decima terceira rodada;
  - manter este ExecPlan como documento vivo durante a execucao.
- Fora de escopo:
  - alterar codigo em `src/`, contratos, schemas ou testes automatizados;
  - fechar ticket, mover ticket para `tickets/closed/`, commitar ou fazer push;
  - paralelizar validacoes de comandos/tickets.

## Progress
- [x] 2026-02-23 14:44Z - Planejamento inicial concluido com leitura integral do ticket alvo e referencias obrigatorias.
- [x] 2026-02-23 14:46Z - Preflight operacional executado e classificado como `BLOCKED` nesta rodada.
- [ ] 2026-02-23 14:44Z - `/status` inicial registrado no chat autorizado.
- [ ] 2026-02-23 14:44Z - `/codex_chat` validado em dois turnos sem parser error.
- [ ] 2026-02-23 14:44Z - Limpeza de sessao pos `/codex_chat` confirmada com `/status`.
- [ ] 2026-02-23 14:44Z - `/plan_spec` validado em dois turnos sem parser error.
- [ ] 2026-02-23 14:44Z - `/plan_spec_status` registrado e sessao final confirmada sem residuos.
- [x] 2026-02-23 14:46Z - Correlacao de logs consolidada com justificativa objetiva de indisponibilidade da unit `codex-flow-runner.service`.
- [x] 2026-02-23 14:46Z - Ticket atualizado com janela UTC, checklist e gate final `NO_GO`.

## Surprises & Discoveries
- 2026-02-23 14:44Z - O bloqueio operacional da rodada anterior persiste no contexto herdado: host sem cliente Telegram de usuario e sem unit `codex-flow-runner.service` para `journalctl -u`.
- 2026-02-23 14:44Z - O baseline tecnico herdado continua estavel (`codex exec resume --help` sem `-s/--sandbox`; `codex-client.test.ts` com `# pass 229` e `# fail 0`), indicando risco concentrado em operacao manual e evidencias.
- 2026-02-23 14:44Z - A decisao de `GO` continua dependente de validacao em Telegram real com dois turnos por fluxo, nao apenas de testes locais.
- 2026-02-23 14:46Z - `TELEGRAM_ALLOWED_CHAT_ID` permaneceu configurado (`1314750680`) e o runner manual (`tsx src/main.ts`) estava ativo, mas sem cliente Telegram de usuario local para acionar comandos no chat autorizado.
- 2026-02-23 14:46Z - A janela desta execucao encerrou sem steps 10-14 por hard-gate `BLOCKED`; nao houve evidencia nova de `/codex_chat` ou `/plan_spec`.

## Decision Log
- 2026-02-23 - Decisao: manter hard-gate de prontidao antes de qualquer passo manual.
  - Motivo: evitar nova execucao incompleta sem precondicoes minimas para evidencia real.
  - Impacto: rodada encerra em `NO_GO` quando o gate for `BLOCKED`, com rastreabilidade objetiva.
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza -> `/plan_spec`.
  - Motivo: reduzir contaminacao de contexto entre fluxos e simplificar diagnostico do erro alvo em `resume`.
  - Impacto: trilha de evidencias fica comparavel entre rodadas.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (turno 1 + turno 2) e ausencia explicita de parser error.
  - Motivo: o incidente historico ocorre na transicao para `codex exec resume`.
  - Impacto: `GO` so permitido com prova de continuidade em ambos os turnos.
- 2026-02-23 - Decisao: registrar correlacao por service unit quando houver, mantendo fallback documentado quando nao houver.
  - Motivo: preservar auditabilidade em cenarios com runner manual.
  - Impacto: evita lacuna de observabilidade no fechamento da rodada.
- 2026-02-23 14:46Z - Decisao: encerrar a rodada atual em `NO_GO` sem executar steps Telegram (10-14).
  - Motivo: gate `BLOCKED` confirmado por ausencia de cliente Telegram de usuario local (`telegram-cli`, `tg`, `tdl`, `telethon`) e indisponibilidade de `journalctl -u` por falta de unit.
  - Impacto: ticket permanece aberto com pendencias manuais explicitas para nova janela operacional.

## Outcomes & Retrospective
- Status final: concluido com `NO_GO` na janela `2026-02-23 14:46Z` ate `2026-02-23 14:46Z`.
- O que funcionou: preflight e baseline executados de ponta a ponta; `codex exec resume --help` sem `-s/--sandbox`; `npm run test -- src/integrations/codex-client.test.ts` com `# pass 229` e `# fail 0`.
- O que ficou pendente: validacao manual em Telegram real dos steps 10-14 (`/status`, `/codex_chat` em dois turnos, limpeza de sessao, `/plan_spec` em dois turnos e `/plan_spec_status`).
- Proximos passos: abrir nova janela UTC com meio operacional para acionar o bot no chat autorizado e reexecutar este plano a partir do step 10.

## Context and Orientation
- Ticket alvo:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Referencias obrigatorias desta rodada:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
- Fluxo sob validacao:
  - turno inicial via `codex exec`;
  - turnos seguintes via `codex exec resume`;
  - erro alvo historico: parser error com `unexpected argument '-s'` em turnos de `resume`.
- Restricoes tecnicas:
  - fluxo estritamente sequencial por ticket;
  - sem alteracao de codigo nesta etapa;
  - aceite depende de Telegram real em chat autorizado por `TELEGRAM_ALLOWED_CHAT_ID`.

## Plan of Work
- Milestone 1 - Prontidao operacional e baseline da rodada.
  - Entregavel: preflight completo com classificacao `READY` ou `BLOCKED` e justificativa objetiva.
  - Evidencia de conclusao: execution log com checks de ambiente, runner, cliente Telegram e baseline tecnico.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error e sem `unexpected argument '-s'`.
  - Evidencia de conclusao: `/status` inicial + respostas dos dois turnos + confirmacao de limpeza da sessao.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento no mesmo contexto, sem parser error.
  - Evidencia de conclusao: respostas observaveis dos dois turnos + `/plan_spec_status` final coerente.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Milestone 4 - Correlacao e decisao da rodada.
  - Entregavel: gate final `GO` ou `NO_GO` com janela UTC, correlacao de logs e checklist atualizado.
  - Evidencia de conclusao: ticket com rationale objetivo, sem ambiguidades e com rastreabilidade completa.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar o chat autorizado da validacao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar existencia/estado da unit `codex-flow-runner.service`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para registrar runner manual ativo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para checar cliente Telegram de usuario no host.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para checar alternativa Python local.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,80p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico pre-janela manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar gate de prontidao: marcar `READY` quando houver meio operavel para acionar o bot no chat autorizado; caso contrario, marcar `BLOCKED` e pular para os steps 15-18.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar snapshot textual com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto e registrar respostas sem parser error e sem `unexpected argument '-s'`.
12. (workdir: `N/A - Telegram`) Encerrar `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza da sessao.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e refinamento (turno 2), registrando ausencia de parser error.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e registrar limpeza.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva da indisponibilidade.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md` com execution log, checklist e gate final.
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
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
  - Esperado: ticket com evidencias objetivas, checklist atualizado e gate final explicito.
- Criterio final:
  - `GO`: `/codex_chat` e `/plan_spec` aprovados manualmente em dois turnos, com evidencias completas na mesma janela UTC.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencias incompletas/nao auditaveis.

## Idempotence and Recovery
- Idempotencia:
  - plano reexecutavel em nova janela UTC sem alterar codigo;
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
  - se erro alvo reaparecer, anexar janela UTC + logs e abrir follow-up tecnico focado em `codex exec resume`.

## Artifacts and Notes
- Ticket da rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- ExecPlan da rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Referencias obrigatorias utilizadas no planejamento:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-segunda-rodada.md`
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
