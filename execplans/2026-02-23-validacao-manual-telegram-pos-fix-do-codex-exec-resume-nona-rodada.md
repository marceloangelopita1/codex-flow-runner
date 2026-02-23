# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (nona rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec`, validando os segundos turnos com `codex exec resume` sem regressao para `unexpected argument '-s'`.
- Resultado esperado:
  - `/codex_chat` validado em dois turnos no mesmo contexto, sem parser error;
  - `/plan_spec` validado em dois turnos (brief inicial + refinamento), sem parser error;
  - evidencias objetivas registradas com janela UTC, saidas observaveis e correlacao de logs (ou justificativa objetiva quando a unit nao existir);
  - gate final explicito (`GO` ou `NO_GO`) registrado no ticket da nona rodada.
- Escopo:
  - executar preflight operacional e confirmar capacidade real para validacao manual no chat autorizado;
  - validar manualmente os fluxos em ordem sequencial fixa (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias no ticket aberto da nona rodada;
  - atualizar este ExecPlan como documento vivo durante a execucao (`Progress`, `Decision Log`, `Outcomes`).
- Fora de escopo:
  - alterar codigo em `src/`, testes ou contratos internos;
  - fechar ticket, commitar ou fazer push;
  - paralelizar validacao de comandos ou tickets.

## Progress
- [x] 2026-02-23 14:16Z - Planejamento inicial da nona rodada concluido com leitura de `PLANS.md`, ticket alvo e referencias obrigatorias.
- [x] 2026-02-23 14:18Z - Preflight operacional executado e classificado como `BLOCKED` (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- [ ] 2026-02-23 14:18Z - Validacao manual de `/codex_chat` (2 turnos) concluida sem parser error.
- [ ] 2026-02-23 14:18Z - Limpeza de sessao e `/status` pos `/codex_chat` validados.
- [ ] 2026-02-23 14:18Z - Validacao manual de `/plan_spec` (brief + refinamento) e `/plan_spec_status` concluida sem parser error.
- [x] 2026-02-23 14:18Z - Evidencias consolidadas no ticket com gate final explicito `NO_GO` nesta etapa.
- [x] 2026-02-23 14:18Z - ExecPlan atualizado com resultado real da rodada, sem fechamento de ticket e sem commit/push.

## Surprises & Discoveries
- 2026-02-23 14:16Z - A oitava rodada encerrou com `NO_GO` por bloqueio operacional recorrente (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- 2026-02-23 14:16Z - O baseline tecnico herdado permanece favoravel (`codex exec resume --help` sem `-s/--sandbox` e `codex-client.test.ts` verde), mas isso nao substitui aceite manual em Telegram real.
- 2026-02-23 14:16Z - A nona rodada precisa manter fail-fast no preflight: sem capacidade operacional minima, encerrar como `NO_GO` com justificativa objetiva e rastreavel.
- 2026-02-23 14:18Z - O preflight repetiu o bloqueio operacional: `telegram-cli`, `tg`, `tdl` e `telethon` ausentes, com `codex-flow-runner.service` indisponivel.
- 2026-02-23 14:18Z - Mesmo sem unit `systemd`, o runner manual permaneceu ativo (`tsx src/main.ts`), mas isso nao habilita validacao manual sem cliente Telegram de usuario.
- 2026-02-23 14:18Z - O baseline local foi reconfirmado nesta rodada (`codex exec resume --help` sem `-s/--sandbox` e `npm run test -- src/integrations/codex-client.test.ts` com `# pass 229`, `# fail 0`), reforcando bloqueio estritamente operacional.

## Decision Log
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza de sessao -> `/plan_spec`.
  - Motivo: reduzir contaminacao de contexto e facilitar auditoria do incidente.
  - Impacto: rastreabilidade clara dos segundos turnos em cada fluxo.
- 2026-02-23 - Decisao: aplicar preflight operacional como hard-gate antes dos passos manuais em Telegram.
  - Motivo: evitar execucao parcial sem canal real de validacao.
  - Impacto: bloqueios viram evidencia objetiva no inicio da janela UTC.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (resposta observavel + ausencia do erro alvo).
  - Motivo: garantir aceite auditavel da correcao em `codex exec resume`.
  - Impacto: `GO` somente com checklist completo e coerente.
- 2026-02-23 14:18Z - Decisao: aplicar hard-stop no step 9 e encerrar a rodada desta etapa com gate `NO_GO`.
  - Motivo: ausencia de cliente Telegram de usuario operavel no host e indisponibilidade da unit `codex-flow-runner.service` para correlacao por servico.
  - Impacto: steps 10-14 permanecem pendentes e exigem nova janela UTC com capacidade operacional minima.

## Outcomes & Retrospective
- Status final: rodada executada com gate `NO_GO` por bloqueio operacional; ticket da nona rodada permanece aberto.
- O que funcionou: preflight e baseline local completos, com evidencias objetivas (`TELEGRAM_ALLOWED_CHAT_ID`, runner manual ativo, contrato atual de `codex exec resume` e testes verdes).
- O que ficou pendente: execucao manual em Telegram real (`/status`, `/codex_chat` em 2 turnos, `/plan_spec` em 2 turnos e `/plan_spec_status`) e correlacao por unit quando disponivel.
- Proximos passos: repetir os steps 10-16 em nova janela UTC com cliente Telegram de usuario operavel e manter rastreabilidade no mesmo ticket.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `PLANS.md`
- Fluxo atual:
  - primeiro turno dos fluxos interativos usa `codex exec`;
  - turnos seguintes usam `codex exec resume`;
  - incidente alvo e parser error `unexpected argument '-s'` durante `resume`.
- Restricoes tecnicas:
  - fluxo estritamente sequencial por ticket;
  - evidencias com horario UTC e comportamento observavel;
  - validacao manual obrigatoria no chat autorizado (`TELEGRAM_ALLOWED_CHAT_ID`);
  - nesta etapa, sem alteracoes de codigo.

## Plan of Work
- Milestone 1 - Prontidao operacional da nona rodada.
  - Entregavel: preflight executado e classificado (`READY` ou `BLOCKED`) com janela UTC.
  - Evidencia de conclusao: disponibilidade de chat autorizado, runner operante e cliente Telegram de usuario identificado (ou bloqueio objetivo documentado).
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error e com limpeza de sessao validada.
  - Evidencia de conclusao: `/status` inicial, respostas dos dois turnos, ausencia do erro alvo e `/status` pos encerramento.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento (segundo turno) sem parser error e com `/plan_spec_status` coerente.
  - Evidencia de conclusao: respostas observaveis nos dois turnos, status final registrado e sessao sem residuos.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
- Milestone 4 - Consolidacao e gate final.
  - Entregavel: ticket atualizado com execution log completo, checklist final e decisao `GO/NO_GO`.
  - Evidencia de conclusao: janela UTC de inicio/fim, correlacao de logs (ou justificativa objetiva) e riscos remanescentes explicitados.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar chat autorizado configurado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar disponibilidade de unit para correlacao por `journalctl -u`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para evidenciar runner ativo por processo manual.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para detectar cliente Telegram de usuario.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para validar alternativa Python local.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,60p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico pre-validacao manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Avaliar gate de prontidao: se nao houver cliente Telegram de usuario operavel, registrar `BLOCKED` no ticket e encerrar a rodada com `NO_GO` objetivo.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar estado inicial com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto, registrando respostas observaveis e ausencia do parser error alvo.
12. (workdir: `N/A - Telegram`) Encerrar sessao `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e refinamento (segundo turno), registrando respostas observaveis e ausencia do parser error alvo.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e confirmar limpeza.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Quando a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva de indisponibilidade.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md` com execution log, checklist e gate final.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan (`Progress`, `Decision Log`, `Outcomes`) com o resultado real da nona rodada.

## Validation and Acceptance
- Comando: `/codex_chat` + dois turnos sequenciais no mesmo contexto.
  - Esperado: segundo turno processado com resposta observavel e sem `unexpected argument '-s'`.
- Comando: `/plan_spec` + brief inicial + refinamento.
  - Esperado: refinamento processado com resposta observavel, sem parser error e com continuidade de contexto.
- Comando: `/status` (antes e depois) + `/plan_spec_status` (ao final).
  - Esperado: estados coerentes, sem sessao zumbi e sem conflito ativo.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
  - Esperado: ticket com evidencias objetivas dos dois fluxos e gate final explicito.
- Criterio final:
  - `GO`: ambos os fluxos manuais aprovados em dois turnos, com evidencias completas e coerentes.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencia incompleta.

## Idempotence and Recovery
- Idempotencia:
  - o plano pode ser reexecutado em nova janela UTC mantendo rastreabilidade por rodada;
  - preflight e baseline tecnico podem ser repetidos sem efeito colateral de codigo;
  - validacoes manuais podem ser repetidas apos limpeza de sessao (`/status`, encerramento manual de `/codex_chat`, `/plan_spec_cancel` quando necessario).
- Riscos:
  - ausencia de cliente Telegram de usuario no host;
  - indisponibilidade de operador humano no chat autorizado durante a janela;
  - indisponibilidade da unit `codex-flow-runner.service` para correlacao por servico;
  - sessao residual de `/codex_chat` ou `/plan_spec` contaminando reteste.
- Recovery / Rollback:
  - se houver sessao presa, limpar contexto no Telegram antes de repetir a rodada;
  - se faltar capacidade operacional minima, encerrar a rodada com `NO_GO` objetivo e abrir follow-up com rastreabilidade;
  - se o erro alvo reaparecer, anexar evidencias da janela UTC e escalar follow-up tecnico focado no parser de `resume`.

## Artifacts and Notes
- Ticket desta rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
- ExecPlan desta rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-nona-rodada.md`
- Referencias utilizadas no planejamento:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
- Evidencias a coletar durante execucao:
  - inicio/fim da janela UTC;
  - transcricoes curtas dos segundos turnos de `/codex_chat` e `/plan_spec`;
  - snapshots de `/status` e `/plan_spec_status`;
  - correlacao por `journalctl -u` ou justificativa objetiva de indisponibilidade.

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma interface de codigo; este plano cobre validacao operacional manual.
- Compatibilidade:
  - preserva o contrato atual dos fluxos interativos (`codex exec` no turno inicial e `codex exec resume` nos turnos seguintes).
- Dependencias externas e mocks:
  - Telegram Bot API funcional e bot autenticado;
  - chat autorizado definido em `TELEGRAM_ALLOWED_CHAT_ID`;
  - runner ativo (via `systemd` ou processo manual equivalente);
  - operador humano com cliente Telegram de usuario para executar comandos reais.
