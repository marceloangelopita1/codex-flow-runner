# ExecPlan - Check-up nao funcional: periodicidade minima, gatilhos extraordinarios e checklist dos 5 eixos

## Purpose / Big Picture
- Objetivo: materializar um artefato operacional de check-up nao funcional recorrente, fora da spec, com periodicidade minima, gatilhos extraordinarios e checklist verificavel para os cinco eixos (codigo, arquitetura, testes, observabilidade e documentacao operacional).
- Resultado esperado:
  - existe um documento operacional dedicado ao check-up nao funcional (nao limitado ao texto da spec).
  - o documento define cadencia minima de execucao e gatilhos objetivos para antecipar nova rodada.
  - o checklist cobre RF-02..RF-06 com criterios verificaveis e linguagem acionavel.
  - a spec de origem passa a apontar explicitamente para o novo artefato e para o ticket/execplan desta entrega.
  - CA-01 fica apto a migrar de "nao atendido" para "atendido" ou "parcialmente atendido" com evidencia objetiva.
- Escopo:
  - criar documento operacional do check-up nao funcional em `docs/checkups/checkup-nao-funcional.md`.
  - definir periodicidade minima e gatilhos extraordinarios alinhados ao contexto do runner sequencial.
  - definir checklist objetivo dos 5 eixos com formato reutilizavel nas proximas rodadas.
  - atualizar `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` em rastreabilidade/status de atendimento (somente o que for impactado por este ticket).
  - atualizar indice/documentacao minima para descoberta do novo artefato, quando necessario.
- Fora de escopo:
  - implementar refatoracoes tecnicas no codigo-fonte.
  - definir matriz de risco/priorizacao (RF-07/RF-08; ticket irmao dedicado).
  - consolidar plano de melhoria continua e trilha periodica completa (RF-09/CA-04/CA-05; ticket irmao dedicado).
  - fechar ticket, mover para `tickets/closed/` ou realizar commit/push.

## Progress
- [x] 2026-02-21 08:49Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-21 08:51Z - Artefato operacional de check-up criado com periodicidade e gatilhos extraordinarios em `docs/checkups/checkup-nao-funcional.md`.
- [x] 2026-02-21 08:51Z - Checklist dos 5 eixos revisado e consolidado com criterios verificaveis e evidencias esperadas por item.
- [x] 2026-02-21 08:51Z - Spec de origem atualizada com rastreabilidade e ajuste da matriz RF/CA impactada, sem invadir escopo dos tickets irmaos.
- [x] 2026-02-21 08:52Z - Validacao final documental concluida com comandos de verificacao e auditoria de diff/status.

## Surprises & Discoveries
- 2026-02-21 08:49Z - O repositorio nao possui hoje pasta/guia operacional dedicado para check-up nao funcional; o conteudo de referencia esta concentrado na spec.
- 2026-02-21 08:49Z - O comando de evidencia do ticket (`rg -n "checklist nao funcional|check-up tecnico|periodicidade minima" docs --glob '!docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md'`) retorna sem ocorrencias, confirmando o gap.
- 2026-02-21 08:49Z - Existem dois tickets irmaos para matriz de risco/priorizacao e melhoria continua; este plano deve evitar sobreposicao de escopo para manter rastreabilidade limpa por ticket.

## Decision Log
- 2026-02-21 - Decisao: criar artefato operacional novo em `docs/checkups/checkup-nao-funcional.md`.
  - Motivo: o ticket exige materializacao fora da spec e o repositorio nao possui guia dedicado para esse rito.
  - Impacto: introduz nova superficie documental em `docs/` e exige link explicito na spec de origem.
- 2026-02-21 - Decisao: limitar este plano a RF-01..RF-06 e CA-01.
  - Motivo: separar entregas por ticket conforme backlog aberto da mesma spec, evitando mistura de responsabilidades.
  - Impacto: matriz de risco/priorizacao e plano de melhoria continua permanecem nos tickets irmaos.
- 2026-02-21 - Decisao: adotar checklist com formato observavel por item (criterio + evidencia esperada + saida).
  - Motivo: `PLANS.md` exige aceitacao por comportamento observavel, mesmo para evolucao documental.
  - Impacto: facilita auditoria e reuso em ciclos periodicos.

## Outcomes & Retrospective
- Status final: implementacao documental concluida e validada para o escopo deste plano, com fechamento do ticket e move para `tickets/closed/`.
- O que funcionou: criacao do guia operacional e atualizacao da spec mantiveram rastreabilidade direta com ticket e execplan.
- O que ficou pendente: concluir tickets irmaos de matriz/priorizacao e melhoria continua.
- Proximos passos: executar os execplans dos gaps restantes da spec em fluxo sequencial.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md`
  - `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `README.md`
  - `docs/specs/README.md`
- Fluxo atual:
  - a spec define RF-01..RF-10 e CA-01..CA-05, com backlog derivado em tickets para os itens ainda pendentes.
  - o guia operacional dedicado ao check-up nao funcional foi publicado em `docs/checkups/checkup-nao-funcional.md`.
  - derivacao spec -> tickets ja ocorreu e este ticket agora possui artefato operacional rastreavel implementado.
- Restricoes tecnicas:
  - manter fluxo sequencial de trabalho no repositorio.
  - evitar dependencia de contexto externo ao proprio repositorio.
  - nao introduzir segredo/dado sensivel em documentacao.
- Termos usados neste plano:
  - "gatilho extraordinario": evento objetivo que antecipa rodada do check-up antes da cadencia minima.
  - "checklist verificavel": item com criterio objetivo e evidencia esperada, sem julgamento subjetivo aberto.

## Plan of Work
- Milestone 1 - Estrutura operacional do check-up definida.
  - Entregavel: documento-base criado em `docs/checkups/checkup-nao-funcional.md` com objetivo, escopo, papeis e pre-condicoes.
  - Evidencia de conclusao: arquivo novo versionado com secoes de uso operacional.
  - Arquivos esperados: `docs/checkups/checkup-nao-funcional.md`.
- Milestone 2 - Periodicidade minima e gatilhos extraordinarios formalizados.
  - Entregavel: secao com cadencia padrao (ex.: mensal/quinzenal) e lista de gatilhos extraordinarios objetivos.
  - Evidencia de conclusao: texto explicita "quando executar", "quem dispara" e "qual evidencia registrar" por gatilho.
  - Arquivos esperados: `docs/checkups/checkup-nao-funcional.md`.
- Milestone 3 - Checklist operacional dos cinco eixos publicado.
  - Entregavel: checklist completo para codigo, arquitetura, testes, observabilidade e documentacao operacional, com criterio verificavel por item.
  - Evidencia de conclusao: cada eixo contem itens acionaveis com evidencias esperadas e saidas minimas.
  - Arquivos esperados: `docs/checkups/checkup-nao-funcional.md`.
- Milestone 4 - Rastreabilidade e status da spec alinhados.
  - Entregavel: spec de origem atualizada com link do novo artefato, referencias ao ticket/execplan e ajuste da matriz RF/CA impactada (sem invadir escopo dos tickets irmaos).
  - Evidencia de conclusao: `Related docs/execplans`, `Status de atendimento` e `Historico de atualizacao` da spec refletem a entrega deste ticket.
  - Arquivos esperados: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`.
- Milestone 5 - Validacao documental e auditoria final.
  - Entregavel: verificacao de consistencia textual, links e fronteira de escopo com tickets irmaos.
  - Evidencia de conclusao: comandos de busca/inspecao retornam as novas ocorrencias e nao introduzem contradicoes com `SPECS.md`/`INTERNAL_TICKETS.md`.
  - Arquivos esperados: arquivos dos milestones anteriores e, se necessario para descoberta do artefato, `README.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-01|RF-02|RF-03|RF-04|RF-05|RF-06|CA-01" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para ancorar os requisitos alvo deste ticket.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar pasta de documentacao operacional com `mkdir -p docs/checkups`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `docs/checkups/checkup-nao-funcional.md` via `$EDITOR docs/checkups/checkup-nao-funcional.md` com secoes: objetivo, cadencia, gatilhos, checklist por eixo, saidas e rastreabilidade.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Preencher periodicidade minima e gatilhos extraordinarios com linguagem objetiva (quando, condicao, responsavel, evidencias).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Preencher checklist dos cinco eixos com itens verificaveis e evidencias esperadas por item.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para incluir o novo artefato em rastreabilidade e ajustar apenas RF/CA impactados por este ticket.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se necessario para descoberta operacional, atualizar `README.md` na secao "Documentacao operacional" adicionando referencia curta para `docs/checkups/checkup-nao-funcional.md`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "check-up nao funcional|periodicidade|minima|gatilho|checklist|codigo|arquitetura|testes|observabilidade|documentacao operacional" docs/checkups/checkup-nao-funcional.md docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para validar cobertura textual.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-07|RF-08|RF-09|CA-02|CA-03|CA-04|CA-05" docs/checkups/checkup-nao-funcional.md` para garantir que o documento nao invada escopo dos tickets irmaos de matriz/priorizacao e melhoria continua.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar com `git status --short` e `git diff -- docs/checkups/checkup-nao-funcional.md docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md README.md` para confirmar escopo final.

## Validation and Acceptance
- Comando: `test -f docs/checkups/checkup-nao-funcional.md`
  - Esperado: arquivo operacional do check-up existe fora da spec.
- Comando: `rg -n "periodicidade minima|gatilho(s)? extraordinario(s)?" docs/checkups/checkup-nao-funcional.md`
  - Esperado: documento explicita cadencia minima e gatilhos objetivos de antecipacao.
- Comando: `rg -n "codigo|arquitetura|testes|observabilidade|documentacao operacional" docs/checkups/checkup-nao-funcional.md`
  - Esperado: checklist contem os cinco eixos obrigatorios da spec.
- Comando: `rg -n "checkup-nao-funcional-periodicidade-e-checklists-gap|execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md|docs/checkups/checkup-nao-funcional.md" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - Esperado: spec referencia ticket, execplan e novo artefato operacional.
- Comando: `rg -n "CA-01|RF-01|RF-02|RF-03|RF-04|RF-05|RF-06" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - Esperado: matriz de atendimento reflete avanco deste ticket sem marcar como atendidos itens fora de escopo.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os comandos de `rg` e auditoria nao altera estado do repositorio.
  - reabrir/editar o arquivo `docs/checkups/checkup-nao-funcional.md` apenas consolida o mesmo artefato, sem gerar duplicidade.
  - atualizar a spec de forma incremental mantem historico auditavel sem depender de ordem implicita.
- Riscos:
  - sobreposicao acidental com escopo dos tickets irmaos (matriz/priorizacao e melhoria continua).
  - criterios de checklist ficarem subjetivos e nao auditaveis.
  - atualizar matriz RF/CA da spec sem evidencia suficiente.
- Recovery / Rollback:
  - se houver sobreposicao de escopo, mover o conteudo excedente para ticket/execplan irmao e manter neste artefato apenas RF-01..RF-06.
  - se algum item de checklist ficar ambiguo, reescrever no formato condicao + evidencia esperada + resultado.
  - se a atualizacao da spec gerar incoerencia, reverter apenas o trecho de status/rastreabilidade e reaplicar com base nas evidencias efetivamente entregues.

## Artifacts and Notes
- Ticket de origem: `tickets/closed/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md`.
- ExecPlan deste ticket: `execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md`.
- Spec de origem:
  - `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
- Referencias de processo consultadas:
  - `PLANS.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
- Tickets relacionados (fora de escopo direto deste plano):
  - `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
  - `tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`
- Evidencias de baseline do gap:
  - `rg -n "checklist nao funcional|check-up tecnico|periodicidade minima" docs --glob '!docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md'` (sem ocorrencias antes da execucao).

## Interfaces and Dependencies
- Interfaces alteradas:
  - superficie documental nova: `docs/checkups/checkup-nao-funcional.md`.
  - rastreabilidade/status da spec: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`.
  - opcionalmente, indice de documentacao operacional em `README.md`.
- Compatibilidade:
  - sem alteracao de contrato de runtime, API, schema de payload ou fluxo do runner.
  - preserva fluxo sequencial do backlog (`P0 -> P1 -> P2`) e separacao por tickets.
- Dependencias externas e mocks:
  - nao ha dependencia externa de runtime.
  - validacao e puramente documental, baseada em grep/rastreabilidade no proprio repositorio.
