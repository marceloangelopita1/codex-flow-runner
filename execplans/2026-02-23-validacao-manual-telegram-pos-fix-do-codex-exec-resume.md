# ExecPlan - Validacao manual em Telegram pos-fix do `codex exec resume`

## Purpose / Big Picture
- Objetivo: executar o aceite operacional final do fix de `codex exec resume` em ambiente real de Telegram para os fluxos `/codex_chat` e `/plan_spec`.
- Resultado esperado:
  - segundo turno de `/codex_chat` conclui sem `unexpected argument '-s'`;
  - segundo turno de `/plan_spec` conclui sem `unexpected argument '-s'`;
  - evidencias objetivas (timestamp UTC + trecho curto de resposta/log) ficam registradas no ticket alvo;
  - ticket fica apto a fechamento com `Closure reason: fixed` quando o gate for `GO`.
- Escopo:
  - validacao manual ponta-a-ponta de dois turnos em `/codex_chat`;
  - validacao manual ponta-a-ponta de dois turnos em `/plan_spec`;
  - coleta e consolidacao de evidencias operacionais no ticket;
  - decisao final `GO/NO_GO` para fechamento do follow-up.
- Fora de escopo:
  - alteracao de codigo em `src/`;
  - refatoracao de arquitetura do runner ou do bot Telegram;
  - mudancas de contrato alem do aceite operacional;
  - commit/push antes de concluir gate de validacao.

## Progress
- [x] 2026-02-23 13:11Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md` e referencias relacionadas.
- [x] 2026-02-23 13:15Z - Preflight operacional concluido com bloqueio: sem `codex-flow-runner.service` e sem trilha `journalctl -u`.
- [ ] 2026-02-23 - Validacao manual de dois turnos em `/codex_chat` concluida.
- [ ] 2026-02-23 - Validacao manual de dois turnos em `/plan_spec` concluida.
- [x] 2026-02-23 13:15Z - Evidencias tecnicas parciais consolidadas no ticket com timestamps UTC e trechos observaveis.
- [x] 2026-02-23 13:17Z - Gate final registrado como `NO_GO` e fechamento aplicado via `split-follow-up`.

## Surprises & Discoveries
- 2026-02-23 13:11Z - O fix tecnico ja passou em testes automatizados e em execucao local de CLI, mas ainda nao existe evidencia manual em Telegram para o segundo turno dos dois fluxos.
- 2026-02-23 13:11Z - O bot possui comandos de observabilidade suficientes para auditoria da validacao (`/status`, `/plan_spec_status`, logs de lifecycle em `runner.ts`).
- 2026-02-23 13:15Z - O host desta rodada nao possui unit `codex-flow-runner.service`; sem acesso ao chat Telegram real, o aceite manual ficou bloqueado.

## Decision Log
- 2026-02-23 - Decisao: executar validacao em ordem `/codex_chat` -> `/plan_spec`.
  - Motivo: reduzir interferencia de concorrencia, ja que `/codex_chat` e bloqueado quando `/plan_spec` esta ativo.
  - Impacto: roteiro de teste fica deterministico e evita falso negativo por conflito de sessao.
- 2026-02-23 - Decisao: exigir evidencia dupla por fluxo (resposta no Telegram + ausencia de parser error em logs no mesmo intervalo UTC).
  - Motivo: aceite operacional precisa rastreabilidade objetiva, nao apenas percepcao de sucesso no chat.
  - Impacto: fechamento do ticket depende de consolidacao de evidencia textual no proprio arquivo do ticket.
- 2026-02-23 - Decisao: manter saida `NO_GO` se qualquer fluxo falhar no segundo turno.
  - Motivo: o incidente original era exatamente quebra no segundo turno; sucesso parcial nao atende o criterio de fechamento.
  - Impacto: ticket permanece aberto (ou gera novo follow-up, se necessario) ate cobertura completa dos dois fluxos.
- 2026-02-23 13:17Z - Decisao: fechar o ticket atual via `split-follow-up` e abrir novo ticket `P0`.
  - Motivo: os criterios manuais de aceite do ExecPlan permaneceram pendentes nesta rodada.
  - Impacto: rastreabilidade preservada sem manter ticket em aberto indevidamente; pendencias seguem no novo ticket.

## Outcomes & Retrospective
- Status final: `NO_GO` nesta rodada, com fechamento do ticket atual por `split-follow-up`.
- O que funcionou: validacao tecnica de contrato (`exec/resume`) permaneceu consistente em help da CLI e testes automatizados direcionados.
- O que ficou pendente: validacao manual em Telegram (dois turnos em `/codex_chat` e `/plan_spec`) e evidencia operacional no ambiente real.
- Proximos passos: executar o roteiro manual no ambiente com bot ativo e fechar o novo follow-up quando houver evidencias dos dois fluxos.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`
  - `execplans/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md`
  - `tickets/closed/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `README.md`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
- Fluxo atual relevante:
  - primeiro turno de sessoes interativas usa `codex exec`;
  - segundo turno usa `codex exec resume` e deve manter continuidade por `thread_id`;
  - erro alvo desta validacao: parser `unexpected argument '-s'` no caminho de resume;
  - sucesso esperado: respostas normais do Codex no segundo turno de ambos os comandos Telegram.
- Restricoes tecnicas:
  - manter fluxo sequencial do projeto;
  - operar apenas no chat autorizado por `TELEGRAM_ALLOWED_CHAT_ID`;
  - evitar sessao concorrente entre `/codex_chat` e `/plan_spec`.
- Termos do plano:
  - segundo turno: segunda mensagem enviada na mesma sessao ativa;
  - evidencia objetiva: timestamp UTC + trecho curto de resposta/log que comprove sucesso ou falha;
  - gate `GO/NO_GO`: decisao final para fechar ticket (`GO`) ou manter pendencia (`NO_GO`).

## Plan of Work
- Milestone 1 - Preflight e baseline de observabilidade.
  - Entregavel: ambiente pronto para teste manual, com servico ativo e janela de logs definida.
  - Evidencia de conclusao: `/status` inicial sem sessoes ativas e baseline de log coletado.
  - Arquivos esperados: `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md` (anotacao de baseline).
- Milestone 2 - Validacao manual do fluxo `/codex_chat`.
  - Entregavel: dois turnos concluidos sem parser error no segundo turno.
  - Evidencia de conclusao: mensagens Telegram de aceite + trecho de log no mesmo intervalo UTC.
  - Arquivos esperados: `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`.
- Milestone 3 - Validacao manual do fluxo `/plan_spec`.
  - Entregavel: dois turnos concluidos sem parser error no segundo turno.
  - Evidencia de conclusao: mensagens Telegram de aceite + trecho de log no mesmo intervalo UTC.
  - Arquivos esperados: `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`.
- Milestone 4 - Consolidacao de evidencia e decisao de fechamento.
  - Entregavel: ticket atualizado com gate final `GO/NO_GO` e metadados coerentes.
  - Evidencia de conclusao: criterios de fechamento do ticket preenchidos e rastreabilidade pronta para commit.
  - Arquivos esperados:
    - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md` (se `NO_GO`)
    - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md` (se `GO`, apos mover no fechamento).

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `date -u '+%Y-%m-%d %H:%MZ'` para registrar inicio da janela de validacao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `systemctl status codex-flow-runner --no-pager` para confirmar bot ativo no ambiente alvo.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `journalctl -u codex-flow-runner --since '15 minutes ago' --no-pager | tail -n 200` para baseline e para comparar erros apos os testes.
4. (workdir: `N/A - Telegram`) Enviar comando `/status` no chat autorizado e confirmar que `/codex_chat` e `/plan_spec` estao inativos antes do teste.
5. (workdir: `N/A - Telegram`) Enviar comando `/codex_chat` e confirmar mensagem de sessao iniciada.
6. (workdir: `N/A - Telegram`) Enviar mensagem livre de turno 1 (ex.: `Teste turno 1 - codex_chat`) e aguardar resposta.
7. (workdir: `N/A - Telegram`) Enviar mensagem livre de turno 2 (ex.: `Teste turno 2 - codex_chat`) e verificar resposta normal sem parser error.
8. (workdir: `N/A - Telegram`) Encerrar a sessao de chat livre pelo botao `Encerrar /codex_chat` (ou por comando concorrente controlado) e confirmar fechamento.
9. (workdir: `N/A - Telegram`) Enviar `/plan_spec` e depois brief inicial curto para iniciar o fluxo.
10. (workdir: `N/A - Telegram`) Enviar mensagem de refinamento (segundo turno do `/plan_spec`) e verificar continuidade sem parser error.
11. (workdir: `N/A - Telegram`) Enviar `/plan_spec_status` para registrar estado da sessao apos o segundo turno; se necessario, usar `/plan_spec_cancel` para cleanup.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `journalctl -u codex-flow-runner --since '30 minutes ago' --no-pager | rg -n "codex exec resume|unexpected argument '-s'|/codex_chat|/plan_spec"` para extrair evidencia tecnica do periodo.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md` com timestamps UTC, resultado por fluxo e trechos curtos de evidencia.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Closure criteria|Decision log|Evidence|codex_chat|plan_spec|unexpected argument '-s'" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md` para auditar completude das anotacoes.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se gate `GO`, atualizar metadados finais do ticket e mover arquivo com `git mv tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`; se gate `NO_GO`, manter em `tickets/open/` com pendencias explicitas.

## Validation and Acceptance
- Comando: `/codex_chat` + duas mensagens sequenciais no mesmo chat.
  - Esperado: segundo turno responde normalmente, sem `unexpected argument '-s'`.
- Comando: `/plan_spec` + brief inicial + mensagem de refinamento no mesmo chat.
  - Esperado: segundo turno continua a sessao ativa sem parser error.
- Comando: `/status` (antes e depois dos testes).
  - Esperado: estado de sessoes coerente com as transicoes observadas (ativacao/encerramento) e sem sessao zumbi.
- Comando: `journalctl -u codex-flow-runner --since '<inicio-da-validacao>' --no-pager | rg -n "unexpected argument '-s'|error: unexpected argument"`.
  - Esperado: nenhuma ocorrencia no intervalo validado.
- Comando: `rg -n "[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}Z|codex_chat|plan_spec" tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`.
  - Esperado: ticket contem evidencias objetivas para os dois fluxos, com timestamps UTC.
- Criterio de aceite final:
  - `GO`: ambos fluxos validados no segundo turno + evidencias registradas.
  - `NO_GO`: qualquer falha de parser ou perda de continuidade em um dos fluxos.

## Idempotence and Recovery
- Idempotencia:
  - o roteiro pode ser repetido sem alterar codigo;
  - sessao `/codex_chat` pode ser encerrada e reiniciada para nova rodada de validacao;
  - sessao `/plan_spec` pode ser cancelada com `/plan_spec_cancel` e retomada sem efeitos permanentes no codigo.
- Riscos:
  - bot fora do ar ou sem autenticacao do Codex CLI no momento do teste;
  - falso negativo por conflito de sessao ativa (ex.: `/plan_spec` bloqueando `/codex_chat`);
  - perda de evidencia por nao registrar timestamps/logs imediatamente apos cada passo.
- Recovery / Rollback:
  - se houver sessao presa, usar `/plan_spec_cancel` ou encerramento manual de `/codex_chat`, depois confirmar com `/status`;
  - se servico estiver indisponivel, reiniciar com `sudo systemctl restart codex-flow-runner` e repetir preflight;
  - se erro `unexpected argument '-s'` reaparecer, registrar evidencia, manter gate `NO_GO` e nao fechar ticket ate novo ajuste tecnico.

## Artifacts and Notes
- Ticket alvo:
  - `tickets/closed/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume.md`
- Follow-up aberto nesta rodada:
  - `tickets/open/2026-02-23-validacao-manual-telegram-pos-fix-do-codex-exec-resume-segunda-rodada.md`
- Referencias usadas no planejamento:
  - `execplans/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md`
  - `tickets/closed/2026-02-23-codex-exec-resume-flag-sandbox-incompativel-em-sessoes-interativas.md`
  - `docs/specs/2026-02-21-comando-dedicado-codex-chat-para-conversa-livre-com-contexto-persistente-no-telegram.md`
  - `README.md`
  - `src/integrations/telegram-bot.ts`
  - `src/core/runner.ts`
- Evidencias esperadas para anexar no ticket:
  - timestamp UTC de inicio/fim da validacao por fluxo;
  - trecho curto da resposta de turno 2 em `/codex_chat` e `/plan_spec`;
  - trecho curto de log sem ocorrencia de `unexpected argument '-s'` no intervalo.

## Interfaces and Dependencies
- Interfaces alteradas:
  - nenhuma interface de codigo; este plano valida contrato operacional existente.
- Compatibilidade:
  - deve preservar comportamento atual de sessoes interativas e continuidade por `thread_id`;
  - nao deve introduzir mudanca de UX alem da confirmacao de funcionamento dos fluxos atuais.
- Dependencias externas e mocks:
  - Telegram Bot API operacional e chat autorizado (`TELEGRAM_ALLOWED_CHAT_ID`);
  - `codex` CLI autenticado no usuario do processo (`codex login`);
  - servico `codex-flow-runner` ativo no ambiente validado (via `systemd` ou execucao local equivalente).
