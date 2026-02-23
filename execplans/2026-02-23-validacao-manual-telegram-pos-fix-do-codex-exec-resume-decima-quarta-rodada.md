# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (decima quarta rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec`, removendo o bloqueio herdado do `NO_GO` da decima terceira rodada.
- Resultado esperado:
  - `/status` inicial e final registrados no chat autorizado na mesma janela UTC.
  - `/codex_chat` validado em dois turnos no mesmo contexto, sem parser error e sem `unexpected argument '-s'`.
  - `/plan_spec` validado em dois turnos (brief + refinamento), sem parser error.
  - `/plan_spec_status` registrado ao final, com sessao limpa.
  - correlacao de logs por `journalctl -u` quando a unit existir, ou justificativa objetiva de indisponibilidade.
- Escopo:
  - executar preflight operacional com gate de prontidao (`READY`/`BLOCKED`);
  - executar validacao manual sequencial fixa (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias objetivas no ticket da decima quarta rodada;
  - manter este ExecPlan como documento vivo durante a execucao.
- Fora de escopo:
  - alterar codigo em `src/`, contratos, schemas ou testes automatizados;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push;
  - paralelizar validacao de comandos ou tickets.

## Progress
- [x] 2026-02-23 14:51Z - Planejamento inicial concluido com leitura integral do ticket alvo e referencias obrigatorias.
- [x] 2026-02-23 14:53Z - Preflight operacional executado e gate de prontidao registrado como `BLOCKED`.
- [ ] 2026-02-23 14:51Z - `/status` inicial registrado no chat autorizado.
- [ ] 2026-02-23 14:51Z - `/codex_chat` validado em dois turnos no mesmo contexto sem parser error.
- [ ] 2026-02-23 14:51Z - Limpeza de sessao pos `/codex_chat` confirmada com `/status`.
- [ ] 2026-02-23 14:51Z - `/plan_spec` validado em dois turnos sem parser error.
- [ ] 2026-02-23 14:51Z - `/plan_spec_status` registrado e sessao final confirmada sem residuos.
- [x] 2026-02-23 14:53Z - Correlacao de logs consolidada com justificativa objetiva de indisponibilidade da unit `codex-flow-runner.service`.
- [x] 2026-02-23 14:53Z - Ticket atualizado com execution log, checklist e gate final `NO_GO`.

## Surprises & Discoveries
- 2026-02-23 14:51Z - O ticket da decima terceira rodada foi fechado como `split-follow-up` mantendo os mesmos bloqueios operacionais: ausencia de cliente Telegram de usuario no host e ausencia de unit `codex-flow-runner.service`.
- 2026-02-23 14:51Z - O baseline tecnico herdado permaneceu estavel na referencia anterior (`codex exec resume --help` sem `-s/--sandbox`; `codex-client.test.ts` com `# pass 229` e `# fail 0`), concentrando risco no aceite manual real.
- 2026-02-23 14:51Z - O criterio de aceite continua dependente de evidencia em Telegram real com dois turnos por fluxo; testes locais isolados nao liberam `GO`.
- 2026-02-23 14:53Z - `TELEGRAM_ALLOWED_CHAT_ID` permaneceu configurado (`1314750680`) e o runner manual (`tsx src/main.ts`) estava ativo, mas sem cliente Telegram de usuario local para acionar comandos no chat autorizado.
- 2026-02-23 14:53Z - `telegram-cli`, `tg`, `tdl` e `telethon` seguiram ausentes no host; o gate permaneceu `BLOCKED` e os passos manuais 10-15 nao puderam ser executados.
- 2026-02-23 14:53Z - `codex exec resume --help` manteve contrato sem `-s/--sandbox` e o baseline tecnico seguiu verde (`# tests 229`, `# pass 229`, `# fail 0`), reforcando que o bloqueio e estritamente operacional.

## Decision Log
- 2026-02-23 - Decisao: manter hard-gate de prontidao antes dos passos manuais de Telegram.
  - Motivo: evitar nova rodada sem condicoes minimas para produzir evidencia auditavel.
  - Impacto: se gate for `BLOCKED`, registrar `NO_GO` com justificativa objetiva na mesma janela UTC.
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza -> `/plan_spec`.
  - Motivo: reduzir contaminacao de contexto entre fluxos e simplificar diagnostico do erro alvo em `resume`.
  - Impacto: evidencias ficam comparaveis com as rodadas anteriores.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (turno 1 + turno 2) e ausencia explicita de parser error.
  - Motivo: o incidente historico ocorre na transicao para `codex exec resume`.
  - Impacto: `GO` somente com prova de continuidade em ambos os turnos.
- 2026-02-23 - Decisao: nao alterar codigo nesta rodada.
  - Motivo: o objetivo e validacao manual operacional do comportamento ja corrigido.
  - Impacto: rastreabilidade focada em evidencias de execucao real.
- 2026-02-23 14:53Z - Decisao: encerrar a rodada atual em `NO_GO` sem executar os passos manuais de Telegram.
  - Motivo: gate `BLOCKED` confirmado por ausencia de cliente Telegram de usuario no host e indisponibilidade de correlacao por `journalctl -u` devido a ausencia da unit `codex-flow-runner.service`.
  - Impacto: validacao manual ponta-a-ponta segue pendente e dependente de nova janela com meio operacional.

## Outcomes & Retrospective
- Status final: concluido com `NO_GO` na janela `2026-02-23 14:53Z` ate `2026-02-23 14:53Z`.
- O que funcionou: preflight operacional e baseline tecnico executados de ponta a ponta; `codex exec resume --help` sem `-s/--sandbox`; `npm run test -- src/integrations/codex-client.test.ts` com `# pass 229` e `# fail 0`.
- O que ficou pendente: execucao manual dos passos 10-15 no Telegram real (`/status`, `/codex_chat` em dois turnos, limpeza de sessao, `/plan_spec` em dois turnos e `/plan_spec_status`).
- Proximos passos: abrir nova janela UTC com meio operacional para acionar o bot no chat autorizado e reexecutar este ExecPlan a partir do step 10.

## Context and Orientation
- Ticket alvo:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
- Referencias obrigatorias desta rodada:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Fluxo sob validacao:
  - turno inicial via `codex exec`;
  - turnos seguintes via `codex exec resume`;
  - erro alvo historico: parser error com `unexpected argument '-s'` em turnos de `resume`.
- Restricoes tecnicas:
  - fluxo estritamente sequencial por ticket;
  - sem alteracao de codigo nesta etapa;
  - aceite depende de Telegram real no chat autorizado por `TELEGRAM_ALLOWED_CHAT_ID`.

## Plan of Work
- Milestone 1 - Prontidao operacional da rodada.
  - Entregavel: preflight completo com classificacao `READY` ou `BLOCKED` e justificativa objetiva.
  - Evidencia de conclusao: execution log com checks de ambiente, runner, cliente Telegram e baseline tecnico.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error e sem `unexpected argument '-s'`.
  - Evidencia de conclusao: `/status` inicial, respostas dos dois turnos e limpeza de sessao confirmada.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento no mesmo contexto, sem parser error.
  - Evidencia de conclusao: respostas observaveis dos dois turnos + `/plan_spec_status` final coerente.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
- Milestone 4 - Correlacao, checklist e gate final.
  - Entregavel: decisao final `GO` ou `NO_GO` com janela UTC, correlacao de logs e checklist atualizado.
  - Evidencia de conclusao: ticket com rationale objetivo, sem ambiguidade e com rastreabilidade completa.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar o chat autorizado da validacao.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar existencia/estado da unit `codex-flow-runner.service`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para registrar runner manual ativo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para checar cliente Telegram de usuario no host.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para checar alternativa Python local.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,80p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico pre-janela manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar gate de prontidao: marcar `READY` quando houver meio operavel para acionar o bot no chat autorizado; caso contrario, marcar `BLOCKED` e pular para os steps 16-19.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar snapshot textual com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto e registrar respostas sem parser error e sem `unexpected argument '-s'`.
12. (workdir: `N/A - Telegram`) Encerrar `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza da sessao.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e refinamento (turno 2), registrando ausencia de parser error.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e registrar limpeza.
15. (workdir: `N/A - Telegram`) Registrar resumo textual dos resultados manuais da janela (com UTC, comando e resposta observavel) para consolidacao no ticket.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva da indisponibilidade.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md` com execution log, checklist e gate final.
19. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan nas secoes `Progress`, `Surprises & Discoveries`, `Decision Log` e `Outcomes & Retrospective` com o resultado real da rodada.

## Validation and Acceptance
- Comando: `/codex_chat` com dois turnos no mesmo contexto.
  - Esperado: respostas observaveis nos dois turnos, sem parser error e sem `unexpected argument '-s'`.
- Comando: `/plan_spec` com brief inicial + refinamento.
  - Esperado: segundo turno processado com continuidade de contexto e sem parser error.
- Comando: `/status` (antes/depois) e `/plan_spec_status` (final).
  - Esperado: estados coerentes, sem sessao zumbi e sem conflito residual.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
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
  - se o preflight falhar, registrar `NO_GO` com bloqueio objetivo e manter rastreabilidade em novo follow-up;
  - se o erro alvo reaparecer, anexar janela UTC + logs e abrir follow-up tecnico focado em `codex exec resume`.

## Artifacts and Notes
- Ticket da rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
- ExecPlan da rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-quarta-rodada.md`
- Referencias obrigatorias usadas no planejamento:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-decima-terceira-rodada.md`
- Evidencias esperadas durante execucao:
  - inicio/fim da janela UTC;
  - transcricao curta dos turnos de `/codex_chat` e `/plan_spec`;
  - snapshots textuais de `/status` e `/plan_spec_status`;
  - saida de correlacao via `journalctl -u` ou justificativa objetiva de indisponibilidade.

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
