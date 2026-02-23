# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (quarta rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para os fluxos `/codex_chat` e `/plan_spec`, validando o segundo turno sem regressao para `unexpected argument '-s'`.
- Resultado esperado:
  - `/codex_chat` aprovado em dois turnos no mesmo contexto;
  - `/plan_spec` aprovado em dois turnos (brief inicial + refinamento);
  - evidencias objetivas com timestamps UTC e saidas observaveis consolidadas no ticket;
  - gate final explicito `GO` ou `NO_GO`.
- Escopo:
  - executar preflight operacional e confirmar capacidade real de interacao humana no chat autorizado;
  - rodar validacao manual sequencial (`/codex_chat` antes de `/plan_spec`);
  - registrar evidencias auditaveis e decidir gate final;
  - se `GO`, preparar fechamento do ticket conforme politica do repositorio.
- Fora de escopo:
  - alteracoes de codigo em `src/`;
  - mudancas de arquitetura;
  - paralelizacao de tickets/sessoes;
  - commit/push fora do fluxo de fechamento do ticket.

## Progress
- [x] 2026-02-23 13:36Z - Planejamento inicial da quarta rodada concluido com leitura do ticket alvo, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-23 13:38Z - Preflight operacional concluido com janela UTC, estado do runner e indisponibilidade formal de cliente Telegram de usuario registrada.
- [ ] 2026-02-23 13:36Z - Validacao manual de `/codex_chat` (dois turnos) concluida sem parser error.
- [ ] 2026-02-23 13:36Z - Validacao manual de `/plan_spec` (dois turnos) concluida sem parser error.
- [x] 2026-02-23 13:38Z - Evidencias consolidadas no ticket com gate final `NO_GO`.
- [ ] 2026-02-23 13:36Z - Fechamento do ticket executado (apenas se gate `GO`), com rastreabilidade para este ExecPlan.
- [x] 2026-02-23 13:40Z - Fechamento `NO_GO` aplicado como `split-follow-up`, com criacao de ticket da quinta rodada para continuidade.

## Surprises & Discoveries
- 2026-02-23 13:36Z - As rodadas anteriores fecharam `NO_GO` por bloqueio operacional (ausencia de cliente Telegram de usuario), nao por indicio de regressao tecnica do fix.
- 2026-02-23 13:36Z - O host pode continuar sem `codex-flow-runner.service`; quando isso ocorrer, a correlacao por `journalctl -u` deve virar evidencia de indisponibilidade operacional, sem inferencia de sucesso manual.
- 2026-02-23 13:36Z - Baseline tecnico (`codex exec resume --help` e testes de `codex-client`) e necessario, mas nao substitui aceite manual real no chat autorizado.
- 2026-02-23 13:38Z - Nesta janela, o runner estava ativo por processo manual (`tsx src/main.ts`), mas a ausencia simultanea de cliente Telegram de usuario e unit `systemd` manteve bloqueio para os passos manuais e para correlacao por `journalctl -u`.

## Decision Log
- 2026-02-23 - Decisao: manter fluxo estritamente sequencial com ordem fixa `/codex_chat` -> limpeza -> `/plan_spec`.
  - Motivo: reduzir contaminacao entre contextos e simplificar rastreabilidade.
  - Impacto: evidencia deterministica para gate final.
- 2026-02-23 - Decisao: aplicar fail-fast para bloqueio operacional humano (sem cliente Telegram de usuario ou sem operador no chat).
  - Motivo: evitar falso positivo por validacao apenas em CLI/testes.
  - Impacto: gate obrigatorio `NO_GO` quando os passos manuais nao forem executaveis.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo manual (resposta observavel + ausencia do erro alvo no periodo).
  - Motivo: manter fechamento auditavel do incidente original.
  - Impacto: ticket so fecha com `GO` quando ambos os fluxos passarem integralmente.

## Outcomes & Retrospective
- Status final: execucao parcial concluida com `NO_GO` e fechamento `split-follow-up` (pendencias transferidas para follow-up).
- O que funcionou: preflight operacional, reconfirmacao do contrato `codex exec resume` e baseline tecnico (`# pass 229`, `# fail 0`).
- O que ficou pendente: execucao manual no Telegram real para `/codex_chat` e `/plan_spec` em dois turnos, mais evidencias de `/status` e `/plan_spec_status`.
- Proximos passos: executar nova rodada de validacao manual a partir de `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md` em host com cliente Telegram de usuario e operador humano disponiveis.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `PLANS.md`
- Fluxo atual:
  - turnos iniciais dos fluxos interativos usam `codex exec`;
  - segundos turnos usam `codex exec resume`;
  - defeito historico alvo: parser error `unexpected argument '-s'` no `resume`.
- Restricoes tecnicas e operacionais:
  - sem paralelizacao de tickets/sessoes;
  - validacao somente no chat autorizado (`TELEGRAM_ALLOWED_CHAT_ID`);
  - evidencias com tempo UTC e resultado observavel;
  - ausencia de cliente Telegram de usuario bloqueia aceite manual.

## Plan of Work
- Milestone 1 - Preflight e desbloqueio operacional.
  - Entregavel: ambiente apto para executar comandos manuais no Telegram real com operador humano.
  - Evidencia de conclusao: janela UTC aberta, estado do runner documentado e cliente Telegram de usuario confirmado (ou bloqueio formal registrado).
  - Arquivos esperados:
    - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem `unexpected argument '-s'` no segundo turno.
  - Evidencia de conclusao: transcricoes curtas com timestamp UTC, mais `/status` antes e depois sem sessao residual.
  - Arquivos esperados:
    - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial e refinamento (segundo turno) concluidos sem parser error.
  - Evidencia de conclusao: resposta observavel do refinamento + saida de `/plan_spec_status` (e `/plan_spec_cancel` se necessario para limpeza).
  - Arquivos esperados:
    - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`
- Milestone 4 - Consolidacao, gate e fechamento.
  - Entregavel: decisao auditavel `GO/NO_GO` registrada no ticket, com fechamento por `fixed` quando `GO` e por `split-follow-up` quando `NO_GO`.
  - Evidencia de conclusao: checklist de validacao preenchido e razao de fechamento coerente (`fixed` ou `split-follow-up`).
  - Arquivos esperados:
    - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md` (se `NO_GO`)

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela de validacao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar chat autorizado configurado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar se a observabilidade por unit esta disponivel.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para comprovar runner ativo por processo manual.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para detectar cliente Telegram de usuario no host.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para checar alternativa Python.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,40p'` para reconfirmar contrato do `resume` sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico antes da validacao manual.
9. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar estado inicial (sem sessao conflitante).
10. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto e registrar respostas com horario UTC.
11. (workdir: `N/A - Telegram`) Encerrar `/codex_chat` via botao e rodar novo `/status` para confirmar limpeza.
12. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e depois refinamento (segundo turno), registrando respostas com horario UTC.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e confirmar limpeza.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Quando houver unit, rodar `journalctl -u codex-flow-runner --since '90 minutes ago' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md` com evidencias, checklist e gate final `GO/NO_GO`.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se gate `GO`, mover o ticket para `tickets/closed/` no mesmo commit da resolucao e apontar este ExecPlan no bloco de `Closure`.

## Validation and Acceptance
- Comando: `/codex_chat` + dois turnos sequenciais no mesmo contexto.
  - Esperado: segundo turno processado sem `unexpected argument '-s'` e com resposta observavel no Telegram.
- Comando: `/plan_spec` + brief inicial + refinamento.
  - Esperado: refinamento processado sem parser error e contexto preservado entre turnos.
- Comando: `/status` (antes e depois) + `/plan_spec_status` (apos fluxo).
  - Esperado: estados coerentes, sem sessao zumbi ou conflito ativo.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Gate|Execution log|Validacao dos criterios|codex_chat|plan_spec|unexpected argument '-s'" tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`.
  - Esperado: ticket com evidencias objetivas de ambos os fluxos e gate final explicito.
- Criterio final:
  - `GO`: ambos os fluxos manuais aprovados em dois turnos, com evidencias completas.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencia incompleta.

## Idempotence and Recovery
- Idempotencia:
  - o plano pode ser repetido abrindo nova janela UTC, sem alterar codigo;
  - os fluxos manuais podem ser reexecutados apos limpeza de sessao (`/status`, `/plan_spec_cancel`, botao de encerramento);
  - registros no ticket devem manter historico incremental por rodada.
- Riscos:
  - ausencia de cliente Telegram de usuario no host;
  - indisponibilidade de operador humano no chat autorizado;
  - ausencia da unit `systemd` reduzindo correlacao por `journalctl -u`;
  - sessao residual contaminando a rodada seguinte.
- Recovery / Rollback:
  - se houver sessao presa, limpar antes de retentar (`/status`, `/plan_spec_cancel`, encerramento manual);
  - se faltar cliente Telegram de usuario, interromper com `NO_GO` formal e executar nova rodada em host apto;
  - se o erro alvo reaparecer, anexar evidencias completas, manter `NO_GO` e abrir follow-up tecnico com rastreabilidade.

## Artifacts and Notes
- Ticket alvo:
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quarta-rodada.md`
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md`
- Referencias obrigatorias usadas neste planejamento:
  - `PLANS.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-terceira-rodada.md`
- Evidencias que devem ser anexadas durante a execucao:
  - inicio/fim da janela UTC;
  - trechos curtos do segundo turno de `/codex_chat` e `/plan_spec`;
  - snapshots de `/status` e `/plan_spec_status`;
  - correlacao de logs da janela (ou justificativa objetiva de indisponibilidade).

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma interface de codigo; plano operacional de validacao.
- Compatibilidade:
  - preserva contrato atual de continuidade (`exec` -> `resume`) sem mudar comportamento funcional.
- Dependencias externas e mocks:
  - Telegram Bot API funcional e bot autenticado;
  - chat autorizado configurado em `TELEGRAM_ALLOWED_CHAT_ID`;
  - runner ativo (`systemd` ou processo manual equivalente);
  - operador humano e cliente Telegram de usuario disponiveis para envio dos comandos reais.
