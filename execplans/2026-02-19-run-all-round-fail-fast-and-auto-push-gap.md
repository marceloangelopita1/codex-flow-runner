# ExecPlan - Rodada /run-all finita, fail-fast e push obrigatorio

## Purpose / Big Picture
- Objetivo: alinhar o runner com a semantica da spec para que `/run-all` execute uma rodada finita, pare no primeiro erro e exija push apos fechamento de cada ticket.
- Resultado esperado: ao iniciar `/run-all`, a fila atual de `tickets/open/` e processada em ordem ate acabar ou falhar; erro no ticket N interrompe a rodada; ciclo de fechamento/versionamento falha quando o repositorio nao estiver sincronizado com remoto apos `close-and-version`.
- Escopo:
  - Ajustar `TicketRunner` para rodada finita (sem polling infinito quando fila esvaziar).
  - Ajustar `TicketRunner` para fail-fast global da rodada (parar no primeiro erro de ticket).
  - Tornar contrato de push obrigatorio no caminho de versionamento (`git-client`/config) e adicionar verificacao programatica apos `close-and-version`.
  - Cobrir comportamento com testes automatizados de runner e integracao git.
  - Atualizar spec e docs operacionais com rastreabilidade da entrega.
- Fora de escopo:
  - Paralelizacao de tickets.
  - Retry automatico de ticket na mesma rodada.
  - Mudanca de protocolo Telegram alem do necessario para refletir novo estado da rodada.

## Progress
- [x] 2026-02-19 12:32Z - Planejamento inicial concluido com leitura integral do ticket e referencias.
- [x] 2026-02-19 12:38Z - Semantica de rodada finita/fail-fast implementada no runner.
- [x] 2026-02-19 12:39Z - Contrato de push obrigatorio implementado e validado por testes.
- [x] 2026-02-19 12:39Z - Validacao final (`test`, `check`, `build`) concluida.
- [x] 2026-02-19 12:40Z - Spec/documentacao atualizadas com evidencias.

## Surprises & Discoveries
- 2026-02-19 12:32Z - `src/core/runner.ts` continua em polling quando nao ha ticket (`while` + `sleep`), portanto `/run-all` nao encerra a rodada.
- 2026-02-19 12:32Z - `processTicket` captura erro e nao propaga, o que impede fail-fast global da rodada.
- 2026-02-19 12:32Z - `src/integrations/git-client.ts` condiciona `git push` a `autoPush`, e `src/config/env.ts` define `GIT_AUTO_PUSH=false` por padrao.
- 2026-02-19 12:32Z - O prompt `prompts/04-encerrar-ticket-commit-push.md` pede commit/push, mas hoje nao existe verificacao programatica no runner de que o repositorio terminou sincronizado.
- 2026-02-19 12:32Z - `GitCliVersioning` existe, mas nao esta conectado ao fluxo principal atual do runner; isso exige decisao explicita para evitar garantia ilusoria de push obrigatorio.
- 2026-02-19 12:38Z - Sem uma trava para ticket repetido na mesma rodada, um `close-and-version` que nao mova arquivo poderia manter o loop ativo indefinidamente.
- 2026-02-19 12:39Z - A validacao de push obrigatorio precisa checar dois pontos: arvore de trabalho limpa e branch sem commits locais a frente do upstream.

## Decision Log
- 2026-02-19 - Decisao: tratar `/run-all` como rodada finita no `TicketRunner` (encerrar ao encontrar fila vazia).
  - Motivo: atender RF-01/CA-01 com comportamento observavel e sem loop infinito.
  - Impacto: altera transicoes de estado (`isRunning`, `phase`, `lastMessage`) e comportamento reportado por `/status`.
- 2026-02-19 - Decisao: propagar falha de `processTicket` para o loop da rodada e interromper imediatamente os proximos tickets.
  - Motivo: atender RF-06/CA-03 (fail-fast no ticket N).
  - Impacto: runner passa a finalizar rodada em erro ao inves de continuar para o ticket seguinte.
- 2026-02-19 - Decisao: remover opcionalidade de push no caminho de versionamento (eliminar `GIT_AUTO_PUSH` default `false` e padronizar push obrigatorio).
  - Motivo: alinhar contrato do codigo com RF-05 e eliminar configuracao contraditoria.
  - Impacto: altera `src/config/env.ts`, `src/integrations/git-client.ts` e `README.md`; exige ajuste de testes/tipos.
- 2026-02-19 - Decisao: adicionar verificacao programatica pos `close-and-version` para garantir repositorio limpo e sem commits locais pendentes de push.
  - Motivo: reduzir dependencia exclusiva de prompt textual para garantir push.
  - Impacto: novo ponto de integracao com `git` no runner (ou servico injetado) e novos testes de erro operacional.

## Outcomes & Retrospective
- Status final: implementacao, validacao e encerramento operacional do ticket concluidos.
- O que funcionou: runner passou a encerrar rodada finita, interromper no primeiro erro e validar sincronismo git apos `close-and-version`; suite automatizada cobre os cenarios novos.
- O que ficou pendente: nenhum pendente tecnico identificado neste escopo.
- Proximos passos: apenas monitoramento pos-merge para confirmar comportamento em execucoes reais do bot.

## Context and Orientation
- Arquivos principais:
  - `src/core/runner.ts` - controla o loop da rodada (`runForever`) e o tratamento de erro por ticket.
  - `src/core/runner.test.ts` - cobertura atual de ordem de etapas e erro local de `processTicket`.
  - `src/integrations/git-client.ts` - contrato de commit/push e verificacao de sincronismo remoto no fechamento.
  - `src/config/env.ts` - schema de configuracao sem flag de push opcional.
  - `prompts/04-encerrar-ticket-commit-push.md` - instrucao operacional de fechamento com commit/push.
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` - RF-05/RF-06 e CAs atualizados para rodada finita/fail-fast/push obrigatorio.
  - `README.md` - contrato operacional publicado para variaveis de ambiente e fluxo.
- Fluxo atual:
  - `/run-all` inicia rodada finita e encerra automaticamente quando a fila de tickets aberta se esgota.
  - Em erro de qualquer ticket, a rodada interrompe imediatamente (fail-fast).
  - Apos `close-and-version`, o runner valida repo limpo e sem commits locais sem push.
  - O cliente git faz push obrigatorio apos commit quando houver alteracao staged.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM, arquitetura em camadas (`src/core`, `src/integrations`, `src/config`).
  - Fluxo obrigatoriamente sequencial (sem paralelizacao de tickets).
  - Sem segredos em codigo/documentacao.
- Termos usados neste plano:
  - "Rodada finita": execucao iniciada por `/run-all` que termina automaticamente quando a fila atual acaba ou ocorre falha.
  - "Fail-fast": primeiro erro de ticket encerra a rodada e impede execucao de tickets seguintes.
  - "Push obrigatorio": ao final de fechamento bem-sucedido, nao pode haver commit local pendente sem push.

## Plan of Work
- Milestone 1: Runner com semantica de rodada finita.
  - Entregavel: loop de execucao encerra automaticamente quando nao houver ticket aberto na rodada atual.
  - Evidencia de conclusao: teste cobrindo fila vazia e verificacao de `isRunning=false` apos encerramento.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 2: Runner fail-fast no primeiro erro de ticket.
  - Entregavel: erro no ticket N interrompe rodada e impede processamento de N+1 na mesma execucao `/run-all`.
  - Evidencia de conclusao: teste com dois tickets em sequencia onde o segundo nao e executado apos falha do primeiro.
  - Arquivos esperados: `src/core/runner.ts`, `src/core/runner.test.ts`.
- Milestone 3: Push obrigatorio com validacao programatica.
  - Entregavel: caminho de versionamento deixa de ser opcional para push e o runner valida estado do repositorio apos `close-and-version`.
  - Evidencia de conclusao: testes cobrindo sucesso com repo sincronizado e falha quando houver commit local nao enviado.
  - Arquivos esperados: `src/integrations/git-client.ts`, `src/integrations/git-client.test.ts` (novo), `src/config/env.ts`, `src/core/runner.ts`, `src/main.ts`, `README.md`.
- Milestone 4: Rastreabilidade completa da spec.
  - Entregavel: spec atualizada com status dos CAs, evidencias, ticket/execplan e data de revisao.
  - Evidencia de conclusao: `docs/specs/...` com CA-01/CA-02/CA-03 atualizados e links para artefatos.
  - Arquivos esperados: `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para baseline antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "runForever|while \\(this\\.state\\.isRunning\\)|processTicket\\(|GIT_AUTO_PUSH|autoPush|close-and-version" src README.md` para mapear todos os pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` via `$EDITOR src/core/runner.ts` para:
   - encerrar rodada quando a fila estiver vazia;
   - interromper rodada no primeiro erro de ticket;
   - manter mensagem/estado observavel de encerramento por sucesso ou erro.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/core/runner.test.ts` via `$EDITOR src/core/runner.test.ts` com cenarios de rodada finita e fail-fast entre tickets.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/git-client.ts` via `$EDITOR src/integrations/git-client.ts` para remover push opcional e padronizar push obrigatorio quando houver commit.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `src/integrations/git-client.test.ts` via `$EDITOR src/integrations/git-client.test.ts` cobrindo:
   - push executado apos commit;
   - falha propagada quando push falhar;
   - caminho sem alteracoes staged continua sem commit/push.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/config/env.ts` e `README.md` via `$EDITOR ...` para remover/adequar `GIT_AUTO_PUSH` ao novo contrato obrigatorio.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Integrar verificacao pos `close-and-version` no fluxo do runner (servico injetado ou verificacao direta de estado git) para falhar quando houver divergencia local/remota.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `src/main.ts` e testes associados para injetar/configurar a dependencia de verificacao de push no bootstrap.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/core/runner.test.ts src/integrations/git-client.test.ts` para validar os contratos novos de forma focada.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para validacao final completa.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md` com `Last reviewed at (UTC)`, status dos CAs e evidencias desta entrega.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CA-01|CA-02|CA-03|run-all|push|Last reviewed at|run-all-round-fail-fast-and-auto-push-gap" docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md README.md src/core/runner.ts src/integrations/git-client.ts` para auditoria de rastreabilidade.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/git-client.ts src/integrations/git-client.test.ts src/config/env.ts src/main.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md README.md` para conferenca final dos artefatos.

## Validation and Acceptance
- Comando: `npx tsx --test src/core/runner.test.ts`
  - Esperado: casos comprovam que a rodada encerra ao esvaziar fila e que erro no ticket N impede execucao de N+1.
- Comando: `npx tsx --test src/integrations/git-client.test.ts`
  - Esperado: push e obrigatorio apos commit e falhas de push sao propagadas.
- Comando: `npm test`
  - Esperado: suite completa passa sem regressao em comandos Telegram e fluxo por etapas.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build concluem sem erro.
- Comando: `rg -n "GIT_AUTO_PUSH" src README.md`
  - Esperado: nenhum uso restante de opcionalidade de push que contrarie o novo contrato.
- Comando: `rg -n "CA-01|CA-02|CA-03|Estado geral|Last reviewed at" docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - Esperado: spec atualizada com evidencia observavel do atendimento dos gaps.

## Idempotence and Recovery
- Idempotencia:
  - Reexecutar `/run-all` apos fim de rodada inicia nova rodada limpa sem duplicar execucao da rodada anterior.
  - Comandos de validacao (`npm test`, `npm run check`, `npm run build`) sao repetiveis sem efeitos colaterais.
- Riscos:
  - Mudanca de semantica do loop pode impactar expectativa de "daemon continuo" para operadores atuais.
  - Verificacao de push pode falhar em repositorios sem upstream configurado ou com estado git atipico.
  - Ajuste de contrato em `env` pode quebrar configuracoes locais que ainda dependam de `GIT_AUTO_PUSH`.
- Recovery / Rollback:
  - Em regressao operacional do loop, manter fallback controlado por flag interna temporaria durante diagnostico, registrando decisao.
  - Em falha de verificacao de push por ausencia de upstream, retornar erro explicito e orientar setup remoto antes de nova rodada.
  - Se nova validacao causar falso positivo, isolar regra em helper testavel e ajustar heuristica antes de reativar bloqueio em producao.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-19-run-all-round-fail-fast-and-auto-push-gap.md`.
- Spec de referencia: `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`.
- Prompt operacional relacionado ao fechamento: `prompts/04-encerrar-ticket-commit-push.md`.
- PR/Diff alvo: `git diff -- src/core/runner.ts src/core/runner.test.ts src/integrations/git-client.ts src/integrations/git-client.test.ts src/config/env.ts src/main.ts docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md README.md`.
- Logs relevantes: saida de `npm test`, `npm run check`, `npm run build` e logs do runner durante rodada completa com sucesso/falha.
- Evidencias de aceite: nomes dos testes adicionados para rodada finita, fail-fast e push obrigatorio + atualizacao de CA-01/CA-02/CA-03 na spec.

## Interfaces and Dependencies
- Interfaces alteradas:
  - Contrato interno do `TicketRunner` para explicitar encerramento de rodada por fila vazia e erro fail-fast.
  - Contrato de `GitCliVersioning` para remover push opcional e refletir push obrigatorio.
  - Possivel nova interface de verificacao git pos fechamento (injetada no runner para manter testabilidade).
- Compatibilidade:
  - Comandos Telegram permanecem os mesmos (`/run-all`, `/status`, `/pause`, `/resume`), com mudanca de comportamento no termino da rodada.
  - Fluxo continua sequencial por ticket, sem execucao paralela.
- Dependencias externas e mocks:
  - `codex` CLI segue como executor das etapas de ticket.
  - `git` CLI passa a ser dependencia operacional explicita para verificacao de sincronismo remoto.
  - Testes devem usar doubles/mocks para chamadas de processo sempre que possivel, evitando dependencia de rede remota real.
