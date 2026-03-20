# [SPEC] Check-up Não Funcional de Código e Documentação para Refatorações Críticas

## Metadata
- Spec ID: 2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-21 08:39Z
- Last reviewed at (UTC): 2026-03-20 01:44Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md
  - tickets/closed/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md
  - tickets/closed/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md
- Related execplans:
  - execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md
  - execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md
  - execplans/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: falta um rito tecnico periodico e padronizado para avaliar saude nao funcional do projeto antes de acumular falhas estruturais de alto impacto.
- Resultado esperado: instituir um check-up tecnico periodico cobrindo qualidade de codigo, arquitetura, testes, observabilidade e documentacao operacional, com saidas objetivas para orientar refatoracoes criticas.
- Contexto funcional: o projeto opera com fluxo sequencial de execucao e precisa manter previsibilidade operacional, rastreabilidade e criterio claro de prioridade ao evoluir sua base tecnica.

## Jornada de uso
1. Time responsavel inicia o ciclo periodico de check-up tecnico nao funcional.
2. Projeto e avaliado por eixo (codigo, arquitetura, testes, observabilidade e documentacao operacional) usando checklist comum.
3. Riscos criticos e itens de divida tecnica sao classificados por severidade, impacto e urgencia.
4. Itens priorizados sao convertidos em backlog rastreavel via ticket ou execplan, respeitando fluxo sequencial.
5. Resultado consolidado do check-up registra plano de melhoria continua com responsaveis e revisao futura.

## Requisitos funcionais
- RF-01: definir periodicidade minima do check-up tecnico nao funcional e gatilhos extraordinarios para nova avaliacao.
- RF-02: estabelecer checklist objetivo para qualidade de codigo (complexidade, acoplamento, legibilidade, padronizacao e manutencao).
- RF-03: estabelecer checklist objetivo para arquitetura (limites de camadas, contratos entre modulos e isolamento de integracoes).
- RF-04: estabelecer checklist objetivo para testes (cobertura efetiva por comportamento critico, confiabilidade e lacunas de regressao).
- RF-05: estabelecer checklist objetivo para observabilidade (logs, sinais operacionais, diagnostico de falhas e monitoracao do loop principal).
- RF-06: estabelecer checklist objetivo para documentacao operacional obrigatoria e coerencia com comportamento implementado.
- RF-07: mapear e registrar riscos criticos e divida tecnica com classificacao padronizada e impacto esperado.
- RF-08: definir criterio objetivo de prioridade para refatoracoes, incluindo severidade, frequencia, custo de atraso e risco operacional.
- RF-09: consolidar plano de melhoria continua com ordem sequencial de execucao, rastreabilidade e criterio de reavaliacao.
- RF-10: explicitar como resultados do check-up geram tickets em `tickets/open/` ou execplans em `execplans/`, conforme nivel de clareza do escopo.

## Nao-escopo
- Executar refatoracoes nesta spec.
- Alterar fluxo sequencial do runner para paralelizacao.
- Redefinir processos externos ao repositorio sem relacao com saude tecnica do projeto.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Existe checklist nao funcional periodico documentado cobrindo os cinco eixos definidos na spec.
- [x] CA-02 - Existe matriz de classificacao para riscos criticos e divida tecnica com criterios objetivos e reproduziveis.
- [x] CA-03 - Existe regra documentada de priorizacao para refatoracoes criticas aplicada ao backlog derivado.
- [x] CA-04 - Existe plano de melhoria continua com rastreabilidade para tickets/execplans e ordem sequencial de execucao.
- [x] CA-05 - Evidencias de revisao periodica podem ser auditadas por historico da spec e artefatos relacionados.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Matriz RF:
  - Atendidos: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Matriz CA:
  - Atendidos: CA-01, CA-02, CA-03, CA-04, CA-05.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Itens atendidos:
  - Escopo da avaliacao nao funcional consolidado com objetivo, jornada, requisitos e criterios observaveis.
  - Guia operacional do check-up publicado em `docs/checkups/checkup-nao-funcional.md` com periodicidade minima, gatilhos extraordinarios e checklist verificavel dos 5 eixos.
  - Matriz objetiva de classificacao (`severidade`, `frequencia`, `custo de atraso`, `risco operacional`) com formula de score e mapeamento para `P0/P1/P2` publicada em `docs/checkups/checkup-nao-funcional.md`.
  - Aplicacao piloto da matriz em backlog derivado registrada em `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`, com score calculado e prioridade resultante por item.
  - Plano de melhoria continua formalizado no guia com ordem sequencial `P0 -> P1 -> P2`, responsavel por etapa, entradas/saidas do ciclo e criterio de reavaliacao.
  - Trilha auditavel de revisao periodica inicial registrada em `docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md`.
  - Regra sequencial de consumo do backlog ja esta padronizada em `P0 -> P1 -> P2`, com fallback por nome.
  - Regra de derivacao `spec -> ticket/execplan` e rastreabilidade obrigatoria ja esta documentada.
- Pendencias em aberto:
  - Nenhuma pendencia funcional ou operacional para RF/CA desta spec.
- Evidencias de validacao:
  - docs/checkups/checkup-nao-funcional.md
  - docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md
  - docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md
  - execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md
  - execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md
  - execplans/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md
  - tickets/closed/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md
  - tickets/closed/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md
  - docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md
  - SPECS.md
  - README.md
  - src/integrations/ticket-queue.ts
  - src/integrations/ticket-queue.test.ts

## Riscos e impacto
- Risco funcional: sem check-up recorrente, fragilidades nao funcionais podem evoluir para regressao de comportamento e aumento de incidentes.
- Risco operacional: ausencia de criterio objetivo pode gerar backlog reativo e priorizacao inconsistente de refatoracoes.
- Mitigacao: adotar checklist padronizado, classificacao objetiva de risco e plano sequencial de melhoria continua.

## Decisoes e trade-offs
- 2026-02-21 - Tratar esta iniciativa como spec nao funcional transversal - aumenta governanca tecnica e previsibilidade, com custo inicial de disciplina operacional.

## Historico de atualizacao
- 2026-02-21 08:39Z - Versao inicial da spec criada com `Status: approved` e `Spec treatment: pending`.
- 2026-02-21 08:42Z - Revisao de gaps concluida com matriz RF/CA atualizada e abertura de 3 tickets em `tickets/open/`.
- 2026-02-21 08:46Z - Validacao final da triagem concluida, mantendo `Status: approved` e `Spec treatment: pending` devido a 3 gaps rastreados em `tickets/open/`.
- 2026-02-21 08:51Z - Entrega do check-up nao funcional desta trilha concluida com novo guia operacional em `docs/checkups/checkup-nao-funcional.md`, atualizando RF-01..RF-06 e CA-01 para atendidos no status desta spec.
- 2026-02-21 08:56Z - Ticket `2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap` fechado como `fixed` e movido para `tickets/closed/` no mesmo changeset da entrega.
- 2026-02-21 09:02Z - RF-07/RF-08 e CA-02/CA-03 avancados com matriz objetiva, mapeamento para `P0/P1/P2` e registro piloto em `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`.
- 2026-02-21 09:12Z - RF-09 e CA-04/CA-05 avancados com plano de melhoria continua no guia, criterio de reavaliacao formal e registro de revisao periodica em `docs/checkups/history/2026-02-21-revisao-periodica-checkup-nao-funcional.md`.
- 2026-02-21 09:17Z - Ticket `2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap` fechado como `fixed` e movido para `tickets/closed/` no mesmo changeset.
- 2026-03-20 01:44Z - Spec encerrada documentalmente como atendida; metadata e status final foram consolidados apos revisao do backlog derivado.
