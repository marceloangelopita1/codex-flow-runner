# ExecPlan - Plano de melhoria continua e trilha auditavel de revisoes periodicas

## Purpose / Big Picture
- Objetivo: materializar o plano de melhoria continua da trilha de check-up nao funcional com ordem sequencial de execucao, responsaveis definidos, criterio objetivo de reavaliacao e trilha auditavel de revisoes periodicas.
- Resultado esperado:
  - existe um plano versionado e operacional para consumo sequencial do backlog derivado do check-up.
  - existe criterio explicito para quando reavaliar backlog (cadencia minima + gatilhos extraordinarios) e quem executa cada etapa.
  - existe rotina auditavel de revisoes periodicas com evidencias registradas em artefatos versionados.
  - a spec de origem fica apta a avancar CA-04 e CA-05 com rastreabilidade objetiva para ticket/execplan/historico.
- Escopo:
  - evoluir `docs/checkups/checkup-nao-funcional.md` com secao dedicada de melhoria continua (backlog sequencial, papeis, reavaliacao, entradas e saidas).
  - criar artefato de historico para a rodada de revisao periodica inicial desta trilha.
  - atualizar `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` em rastreabilidade, status de atendimento e historico da evolucao.
  - harmonizar links de rastreabilidade que ficaram desatualizados entre `tickets/open/` e `tickets/closed/`.
- Fora de escopo:
  - implementar refatoracoes de codigo em `src/`.
  - alterar algoritmo da fila sequencial (`src/integrations/ticket-queue.ts`).
  - fechar ticket, mover arquivo para `tickets/closed/` ou executar commit/push nesta etapa.

## Progress
- [x] 2026-02-21 09:08Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-21 09:12Z - Estrutura de melhoria continua documentada no guia operacional de check-up.
- [x] 2026-02-21 09:12Z - Criterio de reavaliacao e responsaveis formalizados com trilha auditavel.
- [x] 2026-02-21 09:12Z - Rodada inicial de revisao periodica registrada em `docs/checkups/history/`.
- [x] 2026-02-21 09:12Z - Spec de origem atualizada com CA-04/CA-05 e rastreabilidade consistente.
- [x] 2026-02-21 09:12Z - Validacao documental final concluida sem alteracoes de runtime.

## Surprises & Discoveries
- 2026-02-21 09:08Z - A spec de origem ainda referencia `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`, embora o ticket ja esteja em `tickets/closed/`.
- 2026-02-21 09:08Z - O comando de evidencia do ticket para `plano de melhoria continua|criterio de reavaliacao` agora retorna apenas uma ocorrencia em contexto de nao-escopo do guia de check-up, sem plano operacional completo.
- 2026-02-21 09:08Z - Existe historico de priorizacao piloto (`docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`), mas ainda nao existe registro dedicado da rotina periodica de revisao para CA-05.

## Decision Log
- 2026-02-21 - Decisao: consolidar o plano de melhoria continua dentro de `docs/checkups/checkup-nao-funcional.md` em vez de abrir um novo guia paralelo.
  - Motivo: manter uma unica fonte operacional para o ciclo de check-up nao funcional e reduzir fragmentacao documental.
  - Impacto: exige reorganizar secoes do guia para separar baseline, matriz e ciclo continuo sem contradicoes.
- 2026-02-21 - Decisao: criar artefato de rodada periodica em `docs/checkups/history/` nesta mesma entrega.
  - Motivo: CA-05 exige evidencia auditavel observavel, nao apenas descricao de processo.
  - Impacto: passa a existir baseline de auditoria para rodadas futuras com convencao de registro explicita.
- 2026-02-21 - Decisao: tratar consistencia de links `open/closed` da trilha como parte do escopo.
  - Motivo: rastreabilidade incompleta invalida auditabilidade mesmo quando o conteudo tecnico esta correto.
  - Impacto: validacoes de grep e diff devem incluir checagem de paths atualizados em spec/checkup/historico.

## Outcomes & Retrospective
- Status final: execucao concluida com validacao documental local.
- O que funcionou: consolidacao no proprio guia de check-up evitou fragmentacao, e o novo historico periodico fechou a lacuna de auditabilidade para CA-05.
- O que ficou pendente: apenas fechamento operacional do ticket e ciclo de commit/push (fora do escopo desta etapa).
- Proximos passos: mover ticket para `tickets/closed/` e versionar no mesmo changeset de fechamento.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`
  - `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - `docs/checkups/checkup-nao-funcional.md`
  - `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`
  - `SPECS.md`
  - `README.md`
- Fluxo atual:
  - o guia de check-up ja cobre periodicidade, gatilhos e matriz de priorizacao.
  - a spec agora marca CA-04/CA-05 como atendidos e mantem apenas pendencia operacional de fechamento do ticket desta etapa.
  - o ciclo de melhoria continua ficou operacionalizado com reavaliacao e evidencias periodicas auditaveis.
- Restricoes tecnicas:
  - manter fluxo sequencial de backlog e sem paralelizacao de tickets.
  - manter rastreabilidade por artefato versionado (`spec -> ticket -> execplan -> historico`).
  - nao introduzir segredos ou dados sensiveis em documentacao.
- Termos usados neste plano:
  - `plano de melhoria continua`: regra operacional que define backlog sequencial, donos, gatilhos de revisao e saidas por ciclo.
  - `trilha auditavel`: conjunto de evidencias versionadas que permite reconstruir decisoes e reavaliacoes por data.
  - `rodada periodica`: revisao recorrente do backlog nao funcional registrada em arquivo de historico.

## Plan of Work
- Milestone 1 - Modelo operacional de melhoria continua consolidado no guia de check-up.
  - Entregavel: secao dedicada com ordem sequencial de execucao, papeis, entradas, saidas e criterio de reavaliacao.
  - Evidencia de conclusao: `docs/checkups/checkup-nao-funcional.md` contem regras explicitas para RF-09 com linguagem operacional.
  - Arquivos esperados: `docs/checkups/checkup-nao-funcional.md`.
- Milestone 2 - Trilha auditavel de revisao periodica formalizada.
  - Entregavel: convencao de historico (campos obrigatorios + naming) e registro inicial de rodada.
  - Evidencia de conclusao: arquivo novo em `docs/checkups/history/` contendo data, responsavel, gatilho, backlog revisado, decisoes e links para tickets/execplans.
  - Arquivos esperados: `docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md` (ou nome equivalente definido na execucao).
- Milestone 3 - Spec sincronizada com rastreabilidade e aceite parcial/final do escopo.
  - Entregavel: atualizacao de `Related tickets`, `Related execplans`, matriz RF/CA impactada e historico da spec.
  - Evidencia de conclusao: CA-04 e CA-05 passam a ter evidencia objetiva vinculada aos novos artefatos; links `open/closed` ficam coerentes.
  - Arquivos esperados: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`.
- Milestone 4 - Auditoria de consistencia e fronteira de escopo.
  - Entregavel: validacao final de termos obrigatorios, links, e ausencia de mudancas de runtime.
  - Evidencia de conclusao: comandos de verificacao retornam ocorrencias esperadas e `git diff` confirma apenas alteracoes documentais.
  - Arquivos esperados: arquivos dos milestones anteriores e, se necessario para descoberta operacional, `README.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-09|RF-10|CA-04|CA-05|pendencias em aberto|Related tickets|Related execplans" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md` para ancorar criterios alvo e baseline.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "melhoria continua|reavaliacao|revisao periodica|trilha auditavel|Rastreabilidade desta versao" docs/checkups/checkup-nao-funcional.md docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md` para mapear o que ja existe e o que falta.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `docs/checkups/checkup-nao-funcional.md` via `$EDITOR docs/checkups/checkup-nao-funcional.md` para incluir secao de plano de melhoria continua com backlog sequencial (`P0 -> P1 -> P2`), dono por etapa e saidas obrigatorias por ciclo.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) No mesmo arquivo, explicitar criterio de reavaliacao com cadencia minima, gatilhos extraordinarios e regra de recategorizacao de prioridades quando o score mudar.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ainda no guia, documentar a trilha auditavel de revisoes periodicas: local de armazenamento, convencao de nome, campos obrigatorios e requisitos minimos de evidencia.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Garantir estrutura de historico com `mkdir -p docs/checkups/history`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md` via `$EDITOR` registrando a rodada inicial com data, responsavel, gatilho, itens avaliados, decisoes e links para ticket/execplan/spec.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para atualizar rastreabilidade (`Related tickets/execplans`), matriz RF/CA impactada e historico de atualizacao com evidencias da trilha periodica.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar links desatualizados de tickets dessa trilha (`open` vs `closed`) nos artefatos tocados, mantendo coerencia com o estado real do repositorio.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario para descoberta, atualizar `README.md` em "Documentacao operacional" com referencia curta ao registro de revisoes periodicas em `docs/checkups/history/`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "plano de melhoria continua|criterio de reavaliacao|ordem sequencial|responsavel|trilha auditavel|revisao periodica" docs/checkups/checkup-nao-funcional.md docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md` para validar cobertura textual.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CA-04|CA-05|RF-09|tickets/(open|closed)/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md|execplans/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md|docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para validar rastreabilidade da spec.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar escopo com `git status --short` e `git diff -- docs/checkups/checkup-nao-funcional.md docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md README.md` para garantir que a entrega ficou documental e sem mudancas em runtime.

## Validation and Acceptance
- Comando: `rg -n "plano de melhoria continua|ordem sequencial|criterio de reavaliacao|responsavel" docs/checkups/checkup-nao-funcional.md`
  - Esperado: o guia operacional contem plano continuo completo com cadeia sequencial e governanca definida.
- Comando: `test -f docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md`
  - Esperado: existe artefato versionado de revisao periodica para trilha auditavel.
- Comando: `rg -n "Data|Responsavel|Gatilho|itens avaliados|decisoes|ticket|execplan|spec" docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md`
  - Esperado: o historico contem campos minimos para auditoria e reconstrucao da rodada.
- Comando: `rg -n "CA-04|CA-05|RF-09|docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md|execplans/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - Esperado: spec aponta evidencias objetivas para o gap deste ticket e registra o avanco do atendimento.
- Comando: `git diff -- src`
  - Esperado: sem alteracoes em codigo de runtime, validando escopo documental/processual.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar comandos de busca (`rg`, `test -f`, `git diff`) nao altera estado do repositorio.
  - reabrir e refinar o plano em `docs/checkups/checkup-nao-funcional.md` preserva uma fonte unica e evita duplicidade de guias.
  - para novas rodadas periodicas, criar novo arquivo em `docs/checkups/history/` por data mantém trilha incremental sem sobrescrever evidencia anterior.
- Riscos:
  - ambiguidades em "quem revisa" e "quando reavaliar" podem manter CA-04 parcial mesmo com novo texto.
  - divergencia entre estado real de tickets (`open`/`closed`) e links na spec pode quebrar auditabilidade de CA-05.
  - registrar historico sem campos minimos reduz valor de auditoria e dificulta reproducao.
- Recovery / Rollback:
  - se o plano ficar generico, reescrever secoes no formato "condicao -> responsavel -> evidencias -> saida".
  - se houver links inconsistentes, usar `tickets/open/` e `tickets/closed/` como fonte de verdade e reaplicar apenas os paths.
  - se o arquivo de historico for criado com nome inadequado, renomear no mesmo changeset e atualizar referencias cruzadas na spec/guia.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`.
- ExecPlan desta entrega: `execplans/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`.
- Spec de origem:
  - `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
- Artefatos operacionais relacionados:
  - `docs/checkups/checkup-nao-funcional.md`
  - `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`
  - `SPECS.md`
  - `README.md`
- Evidencias de baseline usadas no planejamento:
  - `rg -n "plano de melhoria continua|criterio de reavaliacao" docs --glob '!docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md'`
  - `rg -n "CA-04|CA-05|RF-09" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato documental de governanca continua no guia `docs/checkups/checkup-nao-funcional.md`.
  - contrato de evidencias periodicas em `docs/checkups/history/`.
  - status/rastreabilidade da spec em `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`.
- Compatibilidade:
  - sem mudanca de API, schema ou fluxo de runtime.
  - preserva consumo sequencial de backlog (`P0 -> P1 -> P2`) ja definido no projeto.
  - permanece compativel com as regras de derivacao e rastreabilidade de `SPECS.md`.
- Dependencias externas e mocks:
  - nao ha dependencia externa de runtime.
  - validacao prevista e local/documental (`rg`, `test -f`, `git diff`).
