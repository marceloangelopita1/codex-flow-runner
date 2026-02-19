# [SPEC] Planejamento de spec via Telegram com conversa Codex em /plan

## Metadata
- Spec ID: 2026-02-19-telegram-plan-spec-conversation
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-02-19 21:06Z
- Last reviewed at (UTC): 2026-02-19 21:33Z
- Source: product-need
- Related tickets:
  - tickets/open/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md
  - tickets/open/2026-02-19-plan-spec-codex-interactive-bridge-and-parser-gap.md
  - tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md
  - tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md
- Related execplans:
  - A definir
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: hoje o runner consegue triar specs (`/specs`, `/run_specs`), mas nao possui uma jornada conversacional para criar uma nova spec a partir de planejamento guiado no Telegram.
- Resultado esperado: operador consegue iniciar um fluxo `/plan_spec`, conversar com o Codex em modo `/plan` (sem alteracoes no projeto durante a conversa), responder perguntas por clique ou texto livre, e no final criar a spec em arquivo com commit/push automatico.
- Contexto funcional: preservar o modelo sequencial do runner e o controle por Telegram, adicionando uma fase de descoberta/refinamento antes da escrita da spec.

## Jornada de uso
1. Operador autorizado envia `/plan_spec`.
2. Bot abre sessao de planejamento e pede o brief inicial na proxima mensagem.
3. Operador envia o contexto inicial em texto livre.
4. Runner abre sessao interativa do Codex no projeto ativo, entra em `/plan` e conduz a conversa.
5. Quando o Codex pede desambiguacao, bot mostra pergunta com opcoes clicaveis e tambem aceita resposta livre.
6. Codex conclui o planejamento e o bot mostra acoes finais: `Criar spec`, `Refinar`, `Cancelar`.
7. Operador escolhe `Criar spec`; runner sai do modo de planejamento e executa prompt dedicado para criar arquivo(s) da spec.
8. Runner executa prompt dedicado para commit/push da spec criada.
9. Bot retorna resultado final com arquivo da spec, status do push e rastreabilidade da sessao.

## Requisitos funcionais
- RF-01: expor comando `/plan_spec` no Telegram para iniciar planejamento de spec.
- RF-02: `/plan_spec` deve aceitar inicio sem argumento; nesse caso, a primeira mensagem de texto livre subsequente deve ser tratada como brief inicial.
- RF-03: expor comandos `/plan_spec_status` e `/plan_spec_cancel`.
- RF-04: deve existir no maximo uma sessao ativa de `/plan_spec` por instancia do runner.
- RF-05: com sessao `/plan_spec` ativa, comandos `/run_all` e `/run_specs` devem ser bloqueados com mensagem explicita.
- RF-06: com sessao `/plan_spec` ativa, troca de projeto (`/projects` callback e `/select_project`) deve ser bloqueada.
- RF-07: o fluxo deve operar sempre sobre o projeto ativo global no momento em que a sessao e iniciada.
- RF-08: o acesso aos novos comandos e callbacks deve respeitar `TELEGRAM_ALLOWED_CHAT_ID`.
- RF-09: a sessao de planejamento deve usar Codex CLI interativo com comando `/plan` literal.
- RF-10: a integracao interativa deve lidar automaticamente com prompt inicial de confianca de diretorio, confirmando continuidade para o projeto ativo.
- RF-11: durante a fase de planejamento, nenhuma alteracao de arquivo do repositorio deve ser executada.
- RF-12: perguntas de desambiguacao devem suportar opcoes clicaveis e resposta por texto livre no Telegram.
- RF-13: para opcoes clicaveis, o bot deve parsear um bloco estruturado de pergunta emitido pelo Codex.
- RF-14: enquanto a sessao estiver ativa, mensagens sem comando (`/`) devem ser roteadas para a conversa de planejamento.
- RF-15: quando o Codex concluir o planejamento, deve existir bloco final parseavel com titulo/resumo para acionar decisoes finais.
- RF-16: ao final do planejamento, o bot deve oferecer botoes `Criar spec`, `Refinar`, `Cancelar`.
- RF-17: ao escolher `Criar spec`, o runner deve executar prompt dedicado fora do modo `/plan` para materializar a spec em `docs/specs/`.
- RF-18: a criacao da spec deve seguir nome `docs/specs/YYYY-MM-DD-<slug>.md`, derivado do titulo final aprovado.
- RF-19: a spec criada pelo fluxo deve iniciar com `Status: approved` e `Spec treatment: pending`.
- RF-20: apos criar a spec, o runner deve executar prompt dedicado de commit/push com mensagem `feat(spec): add <arquivo>.md`.
- RF-21: o prompt de commit/push deve restringir o escopo de arquivos ao artefato da spec e trilha do proprio fluxo.
- RF-22: deve haver timeout de inatividade de 30 minutos para encerrar sessao presa.
- RF-23: em falha da sessao interativa (travamento/parsing impossivel), o fluxo deve abortar com orientacao de retry, sem fallback automatico para outro backend.
- RF-24: quando saida da sessao interativa nao for parseavel com seguranca, o bot deve repassar conteudo bruto saneado ao Telegram.
- RF-25: o fluxo deve persistir trilha de rastreabilidade em pasta dedicada no projeto ativo: `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/`.
- RF-26: o estado operacional deve refletir fase da sessao `/plan_spec` em `/status`, com indicacao de espera por usuario ou por Codex.
- RF-27: logs devem registrar inicio/fim/cancelamento/timeout/falha e acao final da sessao de planejamento.
- RF-28: o fluxo deve manter compatibilidade com o ciclo sequencial existente de tickets e specs ja implementado.

## Nao-escopo
- Sessao de planejamento paralela por chat/usuario.
- Fallback automatico para backend nao interativo (`exec/resume`) em caso de falha da sessao `/plan`.
- Execucao concorrente de planejamento e rodada de tickets.
- Criacao de tickets/execplans automaticos a partir desta nova jornada (escopo desta spec e criar spec).
- Mudanca do criterio de elegibilidade de `/specs` e `/run_specs`.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - `/plan_spec` sem argumento abre sessao e solicita o brief inicial, sem iniciar rodada de tickets.
- [ ] CA-02 - primeira mensagem livre apos `/plan_spec` e encaminhada como contexto inicial para o Codex no modo `/plan`.
- [ ] CA-03 - durante sessao ativa, `/run_all` e `/run_specs` retornam bloqueio explicito e nao iniciam execucao.
- [ ] CA-04 - durante sessao ativa, tentativa de trocar projeto por `/select_project` ou callback de `/projects` retorna bloqueio e nao altera projeto ativo.
- [ ] CA-05 - comando `/plan_spec_status` exibe fase atual, projeto ativo e timestamp da ultima atividade.
- [ ] CA-06 - comando `/plan_spec_cancel` encerra a sessao e limpa estado associado.
- [x] CA-07 - perguntas de desambiguacao parseadas geram teclado inline com opcoes clicaveis.
- [x] CA-08 - alem dos botoes, o bot aceita resposta livre em texto durante a mesma pergunta.
- [x] CA-09 - ao receber bloco final do planejamento, o bot mostra botoes `Criar spec`, `Refinar`, `Cancelar`.
- [x] CA-10 - ao escolher `Refinar`, a conversa retorna ao ciclo de perguntas sem criar arquivos.
- [ ] CA-11 - ao escolher `Cancelar`, nenhuma spec e criada e a sessao e encerrada.
- [ ] CA-12 - ao escolher `Criar spec`, runner executa prompt dedicado fora de `/plan` e cria `docs/specs/YYYY-MM-DD-<slug>.md`.
- [ ] CA-13 - arquivo criado contem metadata inicial `Status: approved` e `Spec treatment: pending`.
- [ ] CA-14 - apos criacao da spec, runner executa prompt de commit/push com mensagem `feat(spec): add <arquivo>.md`.
- [ ] CA-15 - commit/push inclui apenas artefatos do fluxo definidos no prompt de fechamento.
- [ ] CA-16 - trilha de sessao e persistida em `spec_planning/requests/`, `spec_planning/responses/`, `spec_planning/decisions/`.
- [ ] CA-17 - apos 30 minutos sem atividade, sessao expira automaticamente com mensagem de timeout.
- [ ] CA-18 - com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chat nao autorizado nao consegue usar `/plan_spec`, `/plan_spec_status`, `/plan_spec_cancel` nem callbacks associados.
- [x] CA-19 - em falha da sessao interativa, bot retorna erro acionavel e orienta retry sem iniciar fallback automatico.
- [x] CA-20 - em resposta interativa nao parseavel, bot repassa conteudo bruto saneado no Telegram.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID` ja aplicado nos comandos/callbacks atuais do bot.
  - Runner ja possui fluxo sequencial de `/run_all` e `/run_specs`, com estado observavel em `/status`.
  - Troca de projeto ja possui bloqueio durante execucao de rodada em andamento.
  - Fila sequencial ja prioriza `P0` antes de `P1` e `P1` antes de `P2`.
  - Bridge interativa `/plan` do Codex implementada com sessao stateful, parser estruturado de pergunta/finalizacao, fallback `raw-sanitized`, tratamento de trust de diretorio e falha acionavel sem fallback batch (`src/integrations/codex-client.ts`, `src/integrations/plan-spec-parser.ts`).
  - Telegram integra callbacks `plan-spec:*`, renderiza teclado de pergunta e botoes finais `Criar spec`/`Refinar`/`Cancelar`, com suporte a retorno de falha e raw saneado (`src/integrations/telegram-bot.ts`).
- Pendencias em aberto:
  - [P0/S1] Orquestrar ciclo de vida da sessao `/plan_spec` (comandos, bloqueios de conflito, timeout, status e cancelamento). Ticket: `tickets/open/2026-02-19-plan-spec-session-lifecycle-and-command-guards-gap.md`. RFs/CAs: RF-01..RF-08, RF-14, RF-22, RF-26, RF-27, RF-28; CA-01..CA-06, CA-17, CA-18.
  - [P1/S2] Implementar `Criar spec` fora de `/plan` com naming/metadata, commit `feat(spec): add <arquivo>.md`, escopo restrito e trilha `spec_planning/*`. Ticket: `tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md`. RFs/CAs: RF-11, RF-17..RF-21, RF-25; CA-11..CA-16.
  - [P2/S3] Adicionar cobertura automatizada completa da jornada `/plan_spec` (happy path e falhas). Ticket: `tickets/open/2026-02-19-plan-spec-automated-test-coverage-gap.md`. RFs/CAs: validacao transversal de CA-01..CA-20 e regressao de RF-28.
- Evidencias de validacao:
  - Revisao de gaps concluida em 2026-02-19 21:13Z com evidencia em `src/`, `prompts/` e abertura de tickets em `tickets/open/`.
  - Validacao final da triagem executada em 2026-02-19 21:18Z, mantendo `Status: approved` e `Spec treatment: pending` devido a gaps rastreados em tickets abertos.
  - Implementacao e testes deste ticket executados em 2026-02-19 21:33Z com cobertura dedicada em `src/integrations/codex-client.test.ts`, `src/integrations/plan-spec-parser.test.ts`, `src/integrations/telegram-bot.test.ts` e regressao verde em `npm test && npm run check && npm run build`.

## Riscos e impacto
- Risco funcional: parsing instavel da saida interativa do Codex gerar UX inconsistente no Telegram.
- Risco operacional: sessao interativa travar e ficar presa, bloqueando comandos de execucao.
- Risco de rastreabilidade: commit incluir arquivos fora do escopo esperado se prompt de fechamento nao for restritivo.
- Mitigacao: contrato de bloco estruturado, timeout de sessao, cancelamento explicito, e prompt de commit com escopo controlado.

## Decisoes e trade-offs
- 2026-02-19 - Usar `/plan` literal no Codex interativo - atende requisito de modo de planejamento explicitamente solicitado.
- 2026-02-19 - Sessao unica global - simplifica concorrencia e preserva consistencia com fluxo sequencial.
- 2026-02-19 - Bloquear `/run_all`, `/run_specs` e troca de projeto durante `/plan_spec` - evita conflito de contexto.
- 2026-02-19 - Aceitar clique e texto livre para desambiguacao - melhora UX sem perder flexibilidade.
- 2026-02-19 - Criar spec e depois commit/push com prompts separados fora de `/plan` - separa planejamento de mutacao de arquivos.
- 2026-02-19 - Timeout de 30 minutos - evita sessao zumbi sem exigir intervencao manual imediata.
- 2026-02-19 - Em falha interativa, abortar e pedir retry - reduz complexidade e evita comportamento oculto.

## Historico de atualizacao
- 2026-02-19 21:06Z - Versao inicial da spec criada e aprovada para derivacao tecnica.
- 2026-02-19 21:13Z - Revisao de gaps concluida; 4 tickets abertos em `tickets/open/` para implementacao sequencial da jornada `/plan_spec`.
- 2026-02-19 21:18Z - Validacao final da triagem concluida; status/metadados confirmados com pendencias rastreadas para tickets abertos.
- 2026-02-19 21:33Z - Ticket de bridge interativa/parser concluido com CAs CA-07..CA-10, CA-19 e CA-20 marcados como atendidos.
