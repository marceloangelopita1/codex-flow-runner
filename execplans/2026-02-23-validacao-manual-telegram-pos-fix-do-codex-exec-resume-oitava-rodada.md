# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (oitava rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec`, validando os segundos turnos com `codex exec resume` sem regressao para `unexpected argument '-s'`.
- Resultado esperado:
  - `/codex_chat` validado em dois turnos no mesmo contexto sem parser error;
  - `/plan_spec` validado em dois turnos (brief inicial + refinamento) sem parser error;
  - evidencias objetivas registradas com janela UTC, saidas observaveis e correlacao de logs (ou justificativa objetiva de indisponibilidade);
  - gate final explicito (`GO` ou `NO_GO`) documentado no ticket da oitava rodada.
- Escopo:
  - executar preflight operacional e confirmar se ha capacidade real para validacao manual no chat autorizado;
  - executar validacao manual sequencial (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias no ticket aberto da oitava rodada;
  - manter este ExecPlan atualizado como documento vivo durante a execucao (Progress, Decision Log, Outcomes).
- Fora de escopo:
  - alterar codigo em `src/` ou contratos internos;
  - mudar arquitetura, pipeline ou regras do runner;
  - paralelizar fluxos de validacao;
  - commit/push e fechamento administrativo do ticket nesta etapa de implementacao.

## Progress
- [x] 2026-02-23 14:08Z - Planejamento inicial da oitava rodada concluido com leitura de `PLANS.md`, ticket alvo e referencias obrigatorias.
- [x] 2026-02-23 14:10Z - Preflight operacional concluido com classificacao objetiva `BLOCKED` (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- [ ] 2026-02-23 14:10Z - Validacao manual de `/codex_chat` (2 turnos) concluida sem parser error.
- [ ] 2026-02-23 14:10Z - Validacao manual de `/plan_spec` (brief + refinamento) concluida sem parser error.
- [x] 2026-02-23 14:10Z - Evidencias consolidadas no ticket da oitava rodada com janela UTC e gate final explicito `NO_GO`.
- [x] 2026-02-23 14:10Z - ExecPlan atualizado com resultado real da rodada (`Progress`, `Decision Log`, `Outcomes`) sem commit/push e sem fechamento de ticket nesta etapa.

## Surprises & Discoveries
- 2026-02-23 14:08Z - A setima rodada confirmou `NO_GO` por bloqueio operacional recorrente (sem cliente Telegram de usuario no host e sem unit `codex-flow-runner.service`).
- 2026-02-23 14:08Z - O baseline tecnico herdado segue favoravel (`codex exec resume --help` sem `-s/--sandbox` e `codex-client.test.ts` verde), mas isso nao substitui a validacao manual obrigatoria em Telegram real.
- 2026-02-23 14:08Z - O ticket da oitava rodada precisa manter fail-fast de preflight: sem canal manual real, o gate deve permanecer `NO_GO` com justificativa objetiva.
- 2026-02-23 14:10Z - O runner manual permaneceu ativo por processo (`tsx src/main.ts`), mas sem cliente Telegram de usuario local os passos 10-14 ficaram bloqueados por hard-stop.
- 2026-02-23 14:10Z - O baseline local foi reconfirmado na rodada (`codex exec resume --help` sem `-s/--sandbox` e `npm run test -- src/integrations/codex-client.test.ts` com `# pass 229`, `# fail 0`), reforcando que o bloqueio e operacional, nao regressao de parser comprovada nesta janela.

## Decision Log
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza de sessao -> `/plan_spec`.
  - Motivo: minimizar contaminacao de contexto e facilitar auditoria do incidente.
  - Impacto: rastreabilidade clara dos segundos turnos em cada fluxo.
- 2026-02-23 - Decisao: tratar preflight operacional como hard-gate antes dos passos manuais no Telegram.
  - Motivo: evitar tentativa sem capacidade real de operacao no chat autorizado.
  - Impacto: bloqueios viram evidencia objetiva no inicio da janela UTC.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (resposta observavel + ausencia explicita do erro alvo).
  - Motivo: garantir aceite auditavel do incidente original.
  - Impacto: `GO` somente com checklist completo e coerente.
- 2026-02-23 - Decisao: registrar correlacao de logs por unit quando disponivel, com fallback de justificativa objetiva quando indisponivel.
  - Motivo: manter observabilidade minima mesmo em ambiente sem `codex-flow-runner.service`.
  - Impacto: reduz ambiguidade de diagnostico entre regressao tecnica e bloqueio operacional.
- 2026-02-23 14:10Z - Decisao: aplicar hard-stop no step 9 e consolidar `NO_GO` sem executar passos manuais 10-14.
  - Motivo: ausencia de cliente Telegram de usuario operavel no host (`telegram-cli`, `tg`, `tdl` e `telethon` ausentes) e indisponibilidade de correlacao por unit.
  - Impacto: validacao manual em Telegram real permanece pendente para nova janela UTC com capacidade operacional minima.

## Outcomes & Retrospective
- Status final: rodada executada com gate `NO_GO` por bloqueio operacional; ticket da oitava rodada permanece aberto.
- O que funcionou: preflight e baseline local completos, com evidencias objetivas (`TELEGRAM_ALLOWED_CHAT_ID`, runner manual ativo, contrato do `resume` e teste de `codex-client` verde).
- O que ficou pendente: execucao manual em Telegram real (`/status`, `/codex_chat` em 2 turnos, `/plan_spec` em 2 turnos, `/plan_spec_status`) e validacao final de ausencia do erro alvo em fluxo ponta-a-ponta.
- Proximos passos: reexecutar este mesmo roteiro em nova janela UTC com cliente Telegram de usuario operavel e, quando possivel, observabilidade por unit dedicada.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-setima-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-setima-rodada.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `PLANS.md`
- Fluxo atual:
  - primeiro turno dos fluxos interativos usa `codex exec`;
  - turnos seguintes usam `codex exec resume`;
  - incidente alvo e parser error `unexpected argument '-s'` durante `resume`.
- Restricoes tecnicas:
  - fluxo estritamente sequencial;
  - evidencias com horario UTC e saida observavel;
  - validacao manual obrigatoria no chat autorizado (`TELEGRAM_ALLOWED_CHAT_ID=1314750680` no baseline herdado);
  - sem mudancas de codigo nesta rodada de validacao manual.

## Plan of Work
- Milestone 1 - Prontidao operacional e baseline.
  - Entregavel: preflight executado com janela UTC, classificacao de prontidao e baseline tecnico local atualizado.
  - Evidencia de conclusao: saidas de ambiente (`TELEGRAM_ALLOWED_CHAT_ID`), disponibilidade de cliente Telegram de usuario, estado do runner e contrato atual de `codex exec resume`.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error.
  - Evidencia de conclusao: `/status` inicial, respostas observaveis dos dois turnos, ausencia do erro alvo e confirmacao de limpeza da sessao.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento (segundo turno) sem parser error.
  - Evidencia de conclusao: respostas observaveis em ambos os turnos, `/plan_spec_status` final e sessao limpa ao encerrar.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
- Milestone 4 - Consolidacao do gate.
  - Entregavel: ticket com checklist atualizado, gate final explicito e riscos remanescentes documentados.
  - Evidencia de conclusao: execution log completo com inicio/fim UTC, decisao `GO/NO_GO` e justificativas objetivas.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar chat autorizado configurado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar se ha unit dedicada para correlacao por `journalctl -u`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para evidenciar runner ativo por processo manual.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para detectar cliente Telegram de usuario no host.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para validar alternativa Python local.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,40p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico pre-validacao manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Avaliar gate de prontidao: se nao houver cliente Telegram de usuario operavel, registrar `BLOCKED` no ticket com hard-stop e seguir direto para consolidacao `NO_GO`.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar estado inicial com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto, registrar respostas observaveis e ausencia do parser error alvo.
12. (workdir: `N/A - Telegram`) Encerrar sessao `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e refinamento (segundo turno), registrando respostas observaveis e horario UTC.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e confirmar limpeza.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Quando a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva de indisponibilidade.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md` com execution log, checklist, gate final e pendencias.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan (`Progress`, `Decision Log`, `Outcomes`) com resultado real da rodada.

## Validation and Acceptance
- Comando: `/codex_chat` + dois turnos sequenciais no mesmo contexto.
  - Esperado: segundo turno processado com resposta observavel e sem `unexpected argument '-s'`.
- Comando: `/plan_spec` + brief inicial + refinamento.
  - Esperado: refinamento processado com resposta observavel, sem parser error e com continuidade de contexto.
- Comando: `/status` (antes e depois) + `/plan_spec_status` (ao final).
  - Esperado: estados coerentes, sem sessao zumbi e sem conflito ativo.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
  - Esperado: ticket com evidencias objetivas dos dois fluxos e gate final explicito.
- Criterio final:
  - `GO`: ambos os fluxos manuais aprovados em dois turnos, com evidencias completas e coerentes.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencia incompleta.

## Idempotence and Recovery
- Idempotencia:
  - o plano pode ser reexecutado abrindo nova janela UTC e mantendo rastreabilidade por rodada;
  - preflight e baseline tecnico podem ser repetidos sem efeitos colaterais de codigo;
  - validacoes manuais podem ser repetidas apos limpeza de sessao (`/status`, encerramento manual de `/codex_chat`, `/plan_spec_cancel` quando necessario).
- Riscos:
  - ausencia de cliente Telegram de usuario no host;
  - indisponibilidade de operador humano no chat autorizado durante a janela;
  - ausencia da unit `codex-flow-runner.service` para correlacao por servico;
  - sessao residual de `/codex_chat` ou `/plan_spec` contaminando reteste.
- Recovery / Rollback:
  - se houver sessao presa, limpar contexto no Telegram antes de nova tentativa;
  - se faltar capacidade operacional minima, encerrar rodada com `NO_GO` objetivo e abrir novo follow-up com rastreabilidade;
  - se o erro alvo reaparecer, anexar evidencias da janela UTC e escalar follow-up tecnico focado no parser de `resume`.

## Artifacts and Notes
- Ticket desta rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
- ExecPlan desta rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-oitava-rodada.md`
- Historico imediato usado no planejamento:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-setima-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-setima-rodada.md`
- Referencia funcional de comportamento esperado:
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
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
  - chat autorizado em `TELEGRAM_ALLOWED_CHAT_ID`;
  - runner ativo (via `systemd` ou processo manual equivalente);
  - operador humano com cliente Telegram de usuario para executar os comandos reais.
