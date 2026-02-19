# [SPEC] Controle multi-projeto no Telegram com projeto ativo global

## Metadata
- Spec ID: 2026-02-19-telegram-multi-project-active-selection
- Status: approved
- Owner: mapita
- Created at (UTC): 2026-02-19 17:25Z
- Last reviewed at (UTC): 2026-02-19 17:25Z
- Source: product-need
- Related tickets:
  - A definir
- Related execplans:
  - A definir
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: o runner opera com um unico repositorio (`REPO_PATH`) e nao permite trocar o projeto alvo pelo Telegram.
- Resultado esperado: operador consegue listar projetos elegiveis em `/home/mapita/projetos`, selecionar um projeto ativo por clique (ou comando textual) e executar o fluxo sequencial no projeto selecionado.
- Contexto funcional: manter o runner com processamento sequencial por ticket, adicionando camada de selecao de projeto para operacao remota.

## Jornada de uso
1. Operador configura `PROJECTS_ROOT_PATH=/home/mapita/projetos` e inicia o runner.
2. Runner descobre projetos validos no diretorio raiz e define um projeto ativo global.
3. Operador envia `/projects` para listar projetos e seleciona o desejado por botao inline.
4. Operador dispara `/run-all`; o ciclo `plan -> implement -> close-and-version` roda somente no projeto ativo.
5. Operador acompanha `/status` e notificacoes finais por ticket com identificacao do projeto ativo.

## Requisitos funcionais
- RF-01: substituir `REPO_PATH` por `PROJECTS_ROOT_PATH` como configuracao obrigatoria de ambiente.
- RF-02: listar apenas projetos validos no primeiro nivel de `PROJECTS_ROOT_PATH`.
- RF-03: considerar projeto valido quando existir repositorio git local (`.git`) e pasta `tickets/open/`.
- RF-04: manter exatamente um projeto ativo global quando houver ao menos um projeto valido.
- RF-05: persistir projeto ativo para sobreviver restart do processo.
- RF-06: no bootstrap, restaurar projeto ativo persistido quando ainda valido; caso contrario, usar o primeiro projeto valido em ordem alfabetica.
- RF-07: expor comando `/projects` com listagem paginada e selecao por clique (inline keyboard), marcando visualmente o projeto ativo.
- RF-08: expor comando `/select-project <nome-do-projeto>` como fallback textual para selecao.
- RF-09: bloquear troca de projeto enquanto houver rodada em execucao (`isRunning=true`).
- RF-10: manter `/run-all`, `/pause`, `/resume` e `/status` operando sobre o projeto ativo.
- RF-11: incluir projeto ativo em `/status` e no resumo final por ticket enviado no Telegram.
- RF-12: aplicar o mesmo controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID` aos comandos `/projects` e `/select-project`.
- RF-13: incluir o proprio `codex-flow-runner` na listagem quando ele atender os criterios de projeto valido.

## Nao-escopo
- Execucao paralela de tickets.
- Execucao simultanea de multiplos projetos na mesma rodada.
- Projeto ativo separado por chat/usuario (escopo e global unico por instancia).
- Fallback de compatibilidade para `REPO_PATH` (migracao sera quebra direta).

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Sem `PROJECTS_ROOT_PATH`, o bootstrap falha com erro claro de configuracao obrigatoria.
- [ ] CA-02 - `/projects` lista apenas projetos validos em ordem alfabetica e indica o projeto ativo.
- [ ] CA-03 - Selecionar projeto por botao inline altera o projeto ativo e persiste o estado.
- [ ] CA-04 - Selecionar projeto por `/select-project <nome>` altera o projeto ativo e persiste o estado.
- [ ] CA-05 - Durante execucao em andamento, tentativa de troca responde bloqueio e nao altera o projeto ativo.
- [ ] CA-06 - Apos restart, runner restaura projeto ativo anterior; se invalido, aplica fallback para o primeiro valido.
- [ ] CA-07 - `/run-all` processa tickets apenas do projeto ativo, sem misturar estado de outro projeto.
- [ ] CA-08 - `/status` e resumo final por ticket exibem identificacao do projeto (nome e caminho base).
- [ ] CA-09 - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chats nao autorizados nao conseguem usar comandos de projeto e geram log de auditoria.
- [ ] CA-10 - Quando a quantidade de projetos exceder uma pagina, `/projects` permite navegar por paginas sem perder contexto de selecao.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Escopo funcional aprovado e pronto para derivacao tecnica em ticket/execplan.
  - Contratos de comando Telegram e regras de estado do projeto ativo estao definidos.
- Pendencias em aberto:
  - Implementar descoberta de projetos, persistencia de projeto ativo e novos comandos Telegram.
  - Atualizar estado do runner, notificacoes e documentacao operacional.
  - Entregar cobertura automatizada para comandos, paginacao e fluxo de troca de projeto.
- Evidencias de validacao:
  - A definir apos implementacao.

## Riscos e impacto
- Risco funcional: listar projeto invalido e permitir selecao de alvo que nao roda o fluxo.
- Risco operacional: troca de projeto em meio a rodada causar perda de rastreabilidade.
- Mitigacao: criterio estrito de elegibilidade, bloqueio de troca durante execucao e testes de regressao do fluxo sequencial.

## Decisoes e trade-offs
- 2026-02-19 - Projeto ativo global unico (nao por chat) - simplifica estado operacional e reduz complexidade de concorrencia.
- 2026-02-19 - Selecao principal por clique em `/projects`, com `/select-project` como fallback - melhora UX sem remover canal textual.
- 2026-02-19 - Paginacao da listagem de projetos - evita mensagens longas e limite de teclado inline.
- 2026-02-19 - Migracao com quebra direta para `PROJECTS_ROOT_PATH` - elimina ambiguidades de compatibilidade com `REPO_PATH`.
- 2026-02-19 - Bloqueio de troca de projeto enquanto runner esta em execucao - preserva coerencia e rastreabilidade da rodada.

## Historico de atualizacao
- 2026-02-19 17:25Z - Versao inicial da spec criada e aprovada para derivacao.
