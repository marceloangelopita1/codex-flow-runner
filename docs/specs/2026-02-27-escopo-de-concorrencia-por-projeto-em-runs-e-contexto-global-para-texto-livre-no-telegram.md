# [SPEC] Escopo de concorrencia por projeto em runs e contexto global para texto livre no Telegram

## Metadata
- Spec ID: 2026-02-27-escopo-de-concorrencia-por-projeto-em-runs-e-contexto-global-para-texto-livre-no-telegram
- Status: superseded
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-27 04:10Z
- Last reviewed at (UTC): 2026-03-20 01:44Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md
  - tickets/closed/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md
- Related execplans:
  - execplans/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md
  - execplans/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: lock global unico para runs pode bloquear execucoes entre projetos diferentes sem necessidade, reduzindo throughput operacional.
- Resultado esperado: Definir que `/run_all` e `/run_specs` usam lock por projeto (sem bloqueio cruzado entre projetos), mantendo sequencialidade no mesmo projeto, e que somente fluxos de texto livre (`/plan_spec` e `/codex_chat`) compartilham lock global unico com bloqueios, status e logs observaveis.
- Contexto funcional: consolidar modelo de concorrencia com dois dominios explicitos (runs por projeto e texto livre global) para evitar regressao de comportamento no bot Telegram.

## Jornada de uso
1. Operador seleciona `projeto-a` e inicia `/run_all`.
2. Com `projeto-a` ocupado, operador seleciona `projeto-b` e inicia `/run_specs`.
3. Sistema permite execucao em `projeto-b` sem bloqueio cruzado.
4. Nova tentativa de run em `projeto-a` recebe bloqueio por slot ocupado no proprio projeto.
5. Operador inicia `/plan_spec`, ativando sessao global de texto livre.
6. Enquanto a sessao de texto livre estiver ativa, tentativa de abrir `/codex_chat` recebe bloqueio global.
7. `/status` e logs exibem estado dos locks por projeto e do lock global de texto livre.

## Requisitos funcionais
- RF-01: `/run_all` e `/run_specs` devem usar lock de execucao escopado por projeto.
- RF-02: run ativo em um projeto nao pode bloquear run em projeto diferente.
- RF-03: cada projeto deve manter no maximo um run ativo por vez, preservando sequencialidade interna.
- RF-04: bloqueio de run deve indicar motivo observavel e acionavel (ex.: `project-slot-busy`).
- RF-05: deve existir lock global unico compartilhado apenas por `/plan_spec` e `/codex_chat`.
- RF-06: `/plan_spec` e `/codex_chat` devem ser mutuamente exclusivos enquanto a sessao global estiver ativa.
- RF-07: lock global de texto livre nao deve bloquear `/run_all` e `/run_specs` em outros projetos.
- RF-08: `/status` deve expor separadamente estado de locks por projeto e estado da sessao global de texto livre.
- RF-09: logs devem registrar motivo de bloqueio com taxonomia minima (`project-slot-busy`, `runner-capacity-maxed`, `global-free-text-busy`).

## Nao-escopo
- Paralelizacao de tickets dentro do mesmo projeto.
- Criacao de multiplos locks de texto livre por usuario/chat.
- Mudancas de politica de permissao de chats no Telegram.
- Mudanca de capacidade maxima global de runners nesta entrega.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Com run ativo em `projeto-a`, iniciar run em `projeto-b` deve iniciar normalmente.
- [ ] CA-02 - Com run ativo em `projeto-a`, nova tentativa de run em `projeto-a` deve retornar `project-slot-busy`.
- [ ] CA-03 - Com sessao `/plan_spec` ativa, tentativa de abrir `/codex_chat` deve retornar `global-free-text-busy`.
- [ ] CA-04 - Com sessao `/codex_chat` ativa, tentativa de abrir `/plan_spec` deve retornar `global-free-text-busy`.
- [ ] CA-05 - Com sessao global de texto livre ativa, `/run_all` e `/run_specs` em projeto diferente devem seguir elegiveis quando houver capacidade.
- [ ] CA-06 - `/status` deve mostrar em um mesmo snapshot os locks por projeto e a sessao global de texto livre.
- [ ] CA-07 - Logs de bloqueio devem registrar motivo taxonomico e contexto de projeto quando aplicavel.

## Status de atendimento (documento vivo)
- Estado geral: superseded
- Itens atendidos:
  - O escopo desta versao foi absorvido e entregue pela spec sucessora `docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md`.
  - A rastreabilidade funcional desta frente passou a viver nos tickets e execplans derivados da spec sucessora.
- Pendencias em aberto:
  - Nenhuma pendencia aberta nesta versao; ela foi substituida pela spec sucessora e nao deve mais ser tratada como backlog implementavel.
- Evidencias de validacao:
  - docs/specs/2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre.md
  - tickets/closed/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md
  - tickets/closed/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md
  - execplans/2026-02-27-concorrencia-de-runs-por-projeto-sem-ticket-lock-global.md
  - execplans/2026-02-27-lock-global-de-texto-livre-entre-plan-spec-e-codex-chat.md

## Riscos e impacto
- Risco funcional: combinacao incorreta de locks pode causar corrida de estado ou bloqueio indevido.
- Risco operacional: lock global em runs reduz capacidade de processamento entre projetos.
- Mitigacao: separar explicitamente escopos de lock e rastrear bloqueios com motivos padronizados.

## Decisoes e trade-offs
- 2026-02-27 - Adotar lock por projeto para runs - preserva concorrencia entre projetos e sequencialidade interna.
- 2026-02-27 - Manter lock global unico para texto livre (`/plan_spec` e `/codex_chat`) - evita mistura de contexto conversacional.
- 2026-02-27 - Exigir bloqueios observaveis em `/status` e logs - facilita diagnostico operacional.

## Historico de atualizacao
- 2026-02-27 04:10Z - Versao inicial da spec materializada a partir do titulo e resumo finais aprovados.
- 2026-03-20 01:44Z - Esta versao foi marcada como `superseded`; o escopo e a execucao foram consolidados na spec sucessora `2026-02-27-escopo-de-concorrencia-por-projeto-e-contexto-global-para-texto-livre`.
