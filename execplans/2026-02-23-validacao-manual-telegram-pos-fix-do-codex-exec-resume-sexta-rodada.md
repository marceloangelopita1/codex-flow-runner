# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume` (sexta rodada)

## Purpose / Big Picture
- Objetivo: concluir o aceite manual ponta-a-ponta em Telegram real para `/codex_chat` e `/plan_spec`, confirmando que os segundos turnos via `codex exec resume` nao regrediram para `unexpected argument '-s'`.
- Resultado esperado:
  - `/codex_chat` validado em dois turnos no mesmo contexto;
  - `/plan_spec` validado em dois turnos (brief inicial + refinamento);
  - evidencias objetivas com janela UTC, saidas observaveis e correlacao de logs (ou justificativa objetiva de indisponibilidade);
  - gate final explicito (`GO` ou `NO_GO`) registrado no ticket da sexta rodada.
- Escopo:
  - executar preflight operacional e confirmar capacidade real de operacao no chat autorizado;
  - executar validacao manual sequencial (`/codex_chat` antes de `/plan_spec`);
  - consolidar evidencias no ticket aberto da sexta rodada e registrar gate final;
  - atualizar este ExecPlan como documento vivo durante a execucao (Progress, Decision Log, Outcomes).
- Fora de escopo:
  - alteracao de codigo em `src/`;
  - mudanca de arquitetura, contratos ou comportamento do runner;
  - paralelizacao de tickets, sessoes ou validacoes;
  - commit/push e fechamento administrativo do ticket nesta etapa de planejamento.

## Progress
- [x] 2026-02-23 13:53Z - Planejamento inicial da sexta rodada concluido com leitura de `PLANS.md`, ticket alvo e referencias obrigatorias.
- [x] 2026-02-23 13:55Z - Preflight operacional da sexta rodada concluido com bloqueios hard-stop registrados (`telegram-cli/tg/tdl/telethon` ausentes e unit `codex-flow-runner.service` ausente).
- [ ] 2026-02-23 13:55Z - Validacao manual de `/codex_chat` (2 turnos) concluida sem parser error.
- [ ] 2026-02-23 13:55Z - Validacao manual de `/plan_spec` (brief + refinamento) concluida sem parser error.
- [x] 2026-02-23 13:55Z - Evidencias consolidadas no ticket aberto com gate final explicito `NO_GO` nesta etapa.
- [x] 2026-02-23 13:55Z - Execucao desta etapa concluida em fluxo sequencial sem commit/push e sem fechamento administrativo do ticket.
- [x] 2026-02-23 13:58Z - Encerramento administrativo posterior executado com `split-follow-up` no ticket da sexta rodada e abertura da setima rodada.

## Surprises & Discoveries
- 2026-02-23 13:53Z - O bloqueio recorrente nas rodadas anteriores foi operacional (ausencia de cliente Telegram de usuario e ausencia de unit `codex-flow-runner.service`), nao regressao tecnica comprovada no contrato do `resume`.
- 2026-02-23 13:53Z - O baseline tecnico local (`codex exec resume --help` e `codex-client.test.ts`) reduz risco, mas nao substitui aceite manual em Telegram real exigido pelo ticket.
- 2026-02-23 13:53Z - A sexta rodada precisa ser orientada por fail-fast de preflight: sem canal manual real, o gate tende a novo `NO_GO` por evidencia incompleta.
- 2026-02-23 13:55Z - `TELEGRAM_ALLOWED_CHAT_ID` permaneceu configurado (`1314750680`) e o runner manual (`tsx src/main.ts`) continuou ativo, mas o host seguiu sem cliente Telegram de usuario para operar o chat autorizado.
- 2026-02-23 13:55Z - O baseline tecnico permaneceu estavel (`codex exec resume --help` sem `-s/--sandbox` e `npm run test -- src/integrations/codex-client.test.ts` verde com `# pass 229` e `# fail 0`), sem substituir o aceite manual exigido.

## Decision Log
- 2026-02-23 - Decisao: manter ordem sequencial fixa `/codex_chat` -> limpeza -> `/plan_spec`.
  - Motivo: reduz contaminacao de contexto e facilita auditoria do incidente.
  - Impacto: rastreabilidade clara de cada fluxo e dos segundos turnos.
- 2026-02-23 - Decisao: preflight operacional e gate de prontidao antes de qualquer tentativa manual.
  - Motivo: evitar repetir rodada com perda de tempo sem capacidade real de operacao.
  - Impacto: bloqueios viram evidencias objetivas logo no inicio da janela UTC.
- 2026-02-23 - Decisao: exigir dupla evidencia por fluxo (resposta observavel + ausencia do erro alvo).
  - Motivo: garantir aceite auditavel do incidente original.
  - Impacto: gate `GO` somente com checklist completo e coerente.
- 2026-02-23 13:55Z - Decisao: consolidar esta rodada com gate `NO_GO` e manter ticket `open` (sem fechamento nesta etapa).
  - Motivo: ausencia de cliente Telegram de usuario no host bloqueou os passos manuais obrigatorios 10-14; unit `codex-flow-runner.service` ausente impediu correlacao por `journalctl -u`.
  - Impacto: criterios de aceite manual permanecem pendentes para nova janela operacional no chat autorizado.
- 2026-02-23 13:58Z - Decisao: fechar ticket da sexta rodada como `split-follow-up` e abrir ticket da setima rodada.
  - Motivo: criterios obrigatorios do ExecPlan seguiram sem aceite manual em Telegram real por bloqueio operacional recorrente.
  - Impacto: continuidade preservada com prioridade `P0` e rastreabilidade de pendencias no novo ticket.

## Outcomes & Retrospective
- Status final: rodada consolidada com gate `NO_GO`; ticket da sexta rodada fechado com `split-follow-up` e novo ticket `P0` aberto para continuidade.
- O que funcionou: preflight e baseline tecnico completos com evidencias objetivas (janela UTC, `TELEGRAM_ALLOWED_CHAT_ID`, estado do runner manual, contrato do `resume` e suite de testes verde).
- O que ficou pendente: execucao manual em Telegram real de `/status`, `/codex_chat` (2 turnos), `/plan_spec` (brief + refinamento) e `/plan_spec_status`.
- Proximos passos: executar nova janela UTC em host com cliente Telegram de usuario disponivel e operador humano no chat autorizado, mantendo o mesmo fluxo sequencial e registrando gate final.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `PLANS.md`
- Fluxo atual:
  - turnos iniciais dos fluxos interativos usam `codex exec`;
  - segundos turnos usam `codex exec resume`;
  - defeito historico alvo: parser error `unexpected argument '-s'` no caminho de `resume`.
- Restricoes tecnicas:
  - fluxo estritamente sequencial;
  - evidencias com horario UTC e saida observavel;
  - validacao em chat autorizado (`TELEGRAM_ALLOWED_CHAT_ID`);
  - sem mudancas de codigo durante esta rodada de validacao manual.

## Plan of Work
- Milestone 1 - Prontidao operacional e baseline.
  - Entregavel: preflight executado com janela UTC, chat autorizado confirmado e capacidade operacional classificada como pronta ou bloqueada.
  - Evidencia de conclusao: saidas de `printenv`, status do runner, deteccao de cliente Telegram de usuario, contrato do `resume` e baseline tecnico local.
  - Arquivos esperados: `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
- Milestone 2 - Aceite manual de `/codex_chat`.
  - Entregavel: dois turnos no mesmo contexto sem parser error.
  - Evidencia de conclusao: `/status` inicial, respostas observaveis dos dois turnos, ausencia do erro alvo e confirmacao de limpeza da sessao.
  - Arquivos esperados: `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
- Milestone 3 - Aceite manual de `/plan_spec`.
  - Entregavel: brief inicial + refinamento (segundo turno) sem parser error.
  - Evidencia de conclusao: respostas observaveis em ambos os turnos, `/plan_spec_status` final e limpeza de sessao quando necessario.
  - Arquivos esperados: `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
- Milestone 4 - Consolidacao do gate.
  - Entregavel: ticket da sexta rodada com checklist atualizado, gate final explicito e riscos remanescentes documentados.
  - Evidencia de conclusao: secao de execution log com janela UTC completa, decisao `GO/NO_GO` e justificativas objetivas.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
    - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela UTC.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `printenv TELEGRAM_ALLOWED_CHAT_ID` para confirmar chat autorizado configurado.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para verificar disponibilidade da unit de observabilidade.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se a unit nao existir, rodar `ps -eo pid,lstart,cmd | rg -n "tsx src/main.ts|node .*dist/main.js"` para comprovar runner ativo por processo manual.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `for bin in telegram-cli tg tdl; do command -v "$bin" >/dev/null && echo "$bin=OK" || echo "$bin=MISSING"; done` para detectar cliente Telegram de usuario.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `python -c "import telethon" >/dev/null 2>&1 && echo "telethon=OK" || echo "telethon=MISSING"` para validar alternativa Python.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `codex exec resume --help | sed -n '1,40p'` para reconfirmar contrato sem `-s/--sandbox`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run test -- src/integrations/codex-client.test.ts` para baseline tecnico pre-validacao manual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Avaliar gate de prontidao: se nenhum cliente Telegram de usuario estiver disponivel, registrar bloqueio hard-stop e seguir para consolidacao `NO_GO`.
10. (workdir: `N/A - Telegram`) Executar `/status` no chat autorizado e registrar estado inicial com horario UTC.
11. (workdir: `N/A - Telegram`) Executar `/codex_chat`, enviar turno 1 e turno 2 no mesmo contexto, registrar respostas observaveis e ausencia de parser error.
12. (workdir: `N/A - Telegram`) Encerrar sessao `/codex_chat` (botao de encerramento) e executar novo `/status` para confirmar limpeza.
13. (workdir: `N/A - Telegram`) Executar `/plan_spec`, enviar brief inicial e refinamento (segundo turno), registrando respostas e horario UTC.
14. (workdir: `N/A - Telegram`) Executar `/plan_spec_status`; se houver sessao residual, executar `/plan_spec_cancel` e confirmar limpeza.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar fim da janela UTC.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Quando a unit existir, rodar `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"`; se nao existir, registrar justificativa objetiva de indisponibilidade.
17. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar o ticket aberto da sexta rodada com execution log, checklist, gate final e pendencias.
18. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar este ExecPlan (`Progress`, `Decision Log`, `Outcomes`) com resultado real da rodada.

## Validation and Acceptance
- Comando: `/codex_chat` + dois turnos sequenciais no mesmo contexto.
  - Esperado: segundo turno processado com resposta observavel e sem `unexpected argument '-s'`.
- Comando: `/plan_spec` + brief inicial + refinamento.
  - Esperado: refinamento processado sem parser error e com continuidade de contexto.
- Comando: `/status` (antes e depois) + `/plan_spec_status` (ao final).
  - Esperado: estados coerentes, sem sessao zumbi ou conflito ativo.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-utc>' --until '<fim-utc>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"` (quando unit existir).
  - Esperado: nenhuma ocorrencia do erro alvo na janela validada.
- Comando: `rg -n "Execution log|Gate|Validation checklist|codex_chat|plan_spec|unexpected argument '-s'" tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
  - Esperado: ticket com evidencias objetivas dos dois fluxos e gate final explicito.
- Criterio final:
  - `GO`: ambos os fluxos manuais aprovados em dois turnos, com evidencias completas e coerentes.
  - `NO_GO`: bloqueio operacional, parser error, perda de contexto ou evidencia incompleta.

## Idempotence and Recovery
- Idempotencia:
  - o plano pode ser reexecutado abrindo nova janela UTC e preservando rastreabilidade por rodada;
  - preflight e baseline tecnico podem ser rerodados sem efeitos colaterais de codigo;
  - validacoes manuais podem ser repetidas apos limpeza de sessao (`/status`, encerramento manual de `/codex_chat`, `/plan_spec_cancel` quando necessario).
- Riscos:
  - ausencia de cliente Telegram de usuario no host;
  - indisponibilidade de operador humano no chat autorizado;
  - ausencia da unit `codex-flow-runner.service` para correlacao por `journalctl -u`;
  - sessao residual de `/codex_chat` ou `/plan_spec` contaminando reteste.
- Recovery / Rollback:
  - se houver sessao presa, limpar contexto no Telegram antes de nova tentativa;
  - se faltar capacidade operacional minima, encerrar rodada com `NO_GO` objetivo e preparar novo follow-up com rastreabilidade;
  - se o erro alvo reaparecer, anexar evidencias da janela UTC e escalar follow-up tecnico focado no parser de `resume`.

## Artifacts and Notes
- Ticket desta rodada:
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
- Follow-up desta rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-setima-rodada.md`
- ExecPlan desta rodada:
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-sexta-rodada.md`
- Referencias obrigatorias usadas no planejamento:
  - `PLANS.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `execplans/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md`
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-quinta-rodada.md`
- Evidencias a coletar durante execucao:
  - inicio/fim da janela UTC;
  - transcricoes curtas dos segundos turnos de `/codex_chat` e `/plan_spec`;
  - snapshots de `/status` e `/plan_spec_status`;
  - correlacao por `journalctl -u` ou justificativa objetiva de indisponibilidade.

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma interface de codigo; este plano cobre validacao operacional manual.
- Compatibilidade:
  - preserva contrato atual de fluxos interativos (`codex exec` no turno inicial e `codex exec resume` nos turnos seguintes).
- Dependencias externas e mocks:
  - Telegram Bot API funcional e bot autenticado;
  - chat autorizado em `TELEGRAM_ALLOWED_CHAT_ID`;
  - runner ativo (via `systemd` ou processo manual equivalente);
  - operador humano com cliente Telegram de usuario para executar os comandos reais.
