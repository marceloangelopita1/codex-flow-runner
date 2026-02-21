# ExecPlan - Matriz de risco e priorizacao objetiva para refatoracoes criticas

## Purpose / Big Picture
- Objetivo: materializar uma matriz reproduzivel de classificacao de risco/divida tecnica e uma regra objetiva de priorizacao para backlog de refatoracoes criticas derivado do check-up nao funcional.
- Resultado esperado:
  - existe matriz documentada com dimensoes objetivas para `severidade`, `frequencia`, `custo de atraso` e `risco operacional`.
  - existe regra documentada de score e mapeamento para prioridade operacional (`P0`/`P1`/`P2`) sem alterar o consumo sequencial atual da fila.
  - existe ao menos um registro de aplicacao da matriz em ciclo real de backlog derivado da spec alvo, com rastreabilidade.
  - a spec `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` fica apta a avancar CA-02 e CA-03 com evidencia objetiva.
- Escopo:
  - atualizar `docs/checkups/checkup-nao-funcional.md` com matriz, formula de score e regra de mapeamento para `Priority`.
  - atualizar `INTERNAL_TICKETS.md` com orientacao objetiva de uso da matriz para backlog de refatoracoes criticas, preservando a regra de fila `P0 -> P1 -> P2`.
  - atualizar `tickets/templates/internal-ticket-template.md` com campos rastreaveis para registrar classificacao/score quando aplicavel.
  - criar artefato de aplicacao piloto da matriz em backlog derivado da spec alvo.
  - atualizar rastreabilidade e status da spec de origem para refletir a entrega deste escopo.
- Fora de escopo:
  - alterar algoritmo de consumo da fila em `src/integrations/ticket-queue.ts`.
  - implementar refatoracoes tecnicas de codigo identificadas pela matriz.
  - consolidar plano de melhoria continua e trilha periodica completa (RF-09, CA-04, CA-05; ticket irmao dedicado).
  - fechar ticket, mover para `tickets/closed/` ou executar commit/push nesta etapa.

## Progress
- [x] 2026-02-21 08:59Z - Planejamento inicial concluido com leitura integral do ticket, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-21 09:02Z - Matriz de risco e regra de score/mapeamento publicadas em `docs/checkups/checkup-nao-funcional.md` e `INTERNAL_TICKETS.md`.
- [x] 2026-02-21 09:02Z - Aplicacao piloto da matriz registrada em `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`.
- [x] 2026-02-21 09:02Z - Spec de origem atualizada com status de atendimento e evidencias para CA-02/CA-03.
- [x] 2026-02-21 09:02Z - Validacao final documental e auditoria de escopo concluidas (sem alteracoes de runtime).

## Surprises & Discoveries
- 2026-02-21 08:59Z - A spec alvo ja exige explicitamente RF-07, RF-08, CA-02 e CA-03, mas os artefatos operacionais atuais ainda nao definem score reproduzivel com `frequencia` e `custo de atraso`.
- 2026-02-21 08:59Z - `docs/checkups/checkup-nao-funcional.md` declara que matriz/priorizacao ficam em tickets dedicados, confirmando que este gap ainda esta em aberto.
- 2026-02-21 08:59Z - `INTERNAL_TICKETS.md` e `src/integrations/ticket-queue.ts` ja estao alinhados em `Priority`/consumo da fila, entao o gap principal e de governanca de classificacao antes da atribuicao de `Priority`.
- 2026-02-21 08:59Z - Existe ticket irmao para melhoria continua/rastreabilidade periodica; este plano precisa manter fronteira clara para nao invadir RF-09/CA-04/CA-05.

## Decision Log
- 2026-02-21 - Decisao: tratar a entrega como evolucao documental-operacional com aplicacao piloto rastreavel.
  - Motivo: o problema observado e ausencia de criterio objetivo/reproduzivel, nao falha de runtime da fila.
  - Impacto: mudancas concentradas em docs/tickets template/spec, sem alterar codigo de execucao.
- 2026-02-21 - Decisao: explicitar formula de score e thresholds para `P0/P1/P2`, preservando o consumo sequencial existente.
  - Motivo: RF-08 exige criterio objetivo e o ticket pede compatibilidade com regra atual da fila.
  - Impacto: backlog passa a ter criterio uniforme antes do preenchimento de `Priority`.
- 2026-02-21 - Decisao: exigir registro de ao menos um ciclo aplicado com evidencia.
  - Motivo: criterio de fechamento do ticket e CA-03 pedem aplicacao pratica, nao apenas definicao teorica.
  - Impacto: necessidade de criar artefato de rodada/piloto alem da matriz base.

## Outcomes & Retrospective
- Status final: execucao concluida para o escopo deste execplan, sem fechamento de ticket/commit nesta etapa.
- O que funcionou: matriz objetiva, formula de score e mapeamento para `P0/P1/P2` ficaram consistentes entre check-up, governanca de tickets e template.
- O que ficou pendente: somente fechamento operacional do ticket em etapa posterior (mover para `tickets/closed/` no commit de fechamento).
- Proximos passos: seguir com ticket irmao de melhoria continua (RF-09, CA-04, CA-05) em execucao dedicada.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
  - `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - `docs/checkups/checkup-nao-funcional.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `src/integrations/ticket-queue.ts`
  - `README.md`
- Fluxo atual:
  - o check-up nao funcional ja possui periodicidade e checklist dos 5 eixos.
  - a fila `/run-all` consome por `Priority` (`P0 -> P1 -> P2`) com fallback por nome.
  - falta um passo padronizado e auditavel que converta risco/divida tecnica em `Priority` antes do enfileiramento.
- Restricoes tecnicas:
  - manter arquitetura em camadas e fluxo sequencial sem paralelizacao de tickets.
  - evitar dependencia de contexto externo ao repositorio.
  - nao incluir segredos em artefatos.
- Termos usados neste plano:
  - `severidade`: impacto tecnico no comportamento/manutencao quando o problema ocorre.
  - `frequencia`: recorrencia observada do problema no uso real ou nas rodadas de check-up.
  - `custo de atraso`: impacto acumulado de adiar a correcao por um ciclo.
  - `risco operacional`: chance de incidente operacional, atraso de entrega ou perda de confiabilidade.

## Plan of Work
- Milestone 1 - Modelo de classificacao objetivo definido.
  - Entregavel: matriz com escalas, definicoes e formula de score para os quatro eixos obrigatorios.
  - Evidencia de conclusao: secao dedicada em `docs/checkups/checkup-nao-funcional.md` contendo tabela de classificacao e regra de calculo reproduzivel.
  - Arquivos esperados: `docs/checkups/checkup-nao-funcional.md`.
- Milestone 2 - Regra de priorizacao operacional formalizada.
  - Entregavel: thresholds claros de score para `P0/P1/P2`, incluindo desempate e regra para casos limite.
  - Evidencia de conclusao: docs explicam como converter score em `Priority` mantendo compatibilidade com `ticket-queue`.
  - Arquivos esperados: `docs/checkups/checkup-nao-funcional.md`, `INTERNAL_TICKETS.md`.
- Milestone 3 - Instrumentacao de rastreabilidade para tickets.
  - Entregavel: template/guia de ticket com campos para registrar score e dimensoes da matriz quando o item vier de check-up.
  - Evidencia de conclusao: novo bloco de classificacao aparece em `tickets/templates/internal-ticket-template.md` e instrucoes de uso em `INTERNAL_TICKETS.md`.
  - Arquivos esperados: `tickets/templates/internal-ticket-template.md`, `INTERNAL_TICKETS.md`.
- Milestone 4 - Aplicacao piloto no backlog derivado da spec.
  - Entregavel: artefato versionado com aplicacao da matriz em ao menos um ciclo (ex.: itens pendentes da spec alvo) e prioridade resultante.
  - Evidencia de conclusao: arquivo de rodada/piloto referencia ticket(s), score calculado, prioridade atribuida e justificativa objetiva.
  - Arquivos esperados: `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md` (ou caminho equivalente definido durante execucao).
- Milestone 5 - Alinhamento final da spec e aceite.
  - Entregavel: spec atualizada com rastreabilidade dos novos artefatos e ajuste de status para CA-02/CA-03.
  - Evidencia de conclusao: `Related docs/execplans`, `Status de atendimento` e `Historico de atualizacao` da spec refletem a entrega sem invadir ticket irmao.
  - Arquivos esperados: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "RF-07|RF-08|CA-02|CA-03" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md` para ancorar criterios alvo.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Priority|Severity|P0|P1|P2|custo de atraso|frequencia|matriz" INTERNAL_TICKETS.md docs/checkups/checkup-nao-funcional.md tickets/templates/internal-ticket-template.md src/integrations/ticket-queue.ts` para registrar baseline e fronteira com regra atual da fila.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `docs/checkups/checkup-nao-funcional.md` via `$EDITOR docs/checkups/checkup-nao-funcional.md` adicionando secao de matriz com definicoes objetivas, escala por eixo e formula de score.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) No mesmo arquivo, adicionar secao de mapeamento score -> `Priority` (`P0/P1/P2`) com exemplos curtos e regra de desempate.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `INTERNAL_TICKETS.md` via `$EDITOR INTERNAL_TICKETS.md` para documentar como aplicar a matriz antes de preencher `Priority` em tickets de refatoracao critica, preservando o consumo da fila ja existente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `tickets/templates/internal-ticket-template.md` via `$EDITOR tickets/templates/internal-ticket-template.md` para incluir bloco de classificacao objetiva (eixos, score final e prioridade resultante) com marcacao de uso quando aplicavel.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar diretorio de historico com `mkdir -p docs/checkups/history` para armazenar evidencias de rodadas.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar `docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md` via `$EDITOR` aplicando a matriz a ao menos um ciclo de backlog derivado da spec (itens avaliados, score, prioridade, justificativa e links).
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Editar `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para atualizar rastreabilidade, matriz RF/CA e historico de atualizacao com evidencia da entrega de RF-07/RF-08 e CA-02/CA-03.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "severidade|frequencia|custo de atraso|risco operacional|score|P0|P1|P2" docs/checkups/checkup-nao-funcional.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md` para validar cobertura da matriz e da regra de priorizacao.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CA-02|CA-03|RF-07|RF-08|priorizacao-refatoracoes-criticas-piloto|matriz" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para validar rastreabilidade na spec.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Auditar com `git status --short` e `git diff -- docs/checkups/checkup-nao-funcional.md docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md` para confirmar escopo final sem alteracao de runtime.

## Validation and Acceptance
- Comando: `rg -n "severidade|frequencia|custo de atraso|risco operacional|score" docs/checkups/checkup-nao-funcional.md`
  - Esperado: matriz contem as quatro dimensoes obrigatorias e regra de calculo reproduzivel.
- Comando: `rg -n "P0|P1|P2|mapeamento|threshold|prioridade" docs/checkups/checkup-nao-funcional.md INTERNAL_TICKETS.md`
  - Esperado: regra de conversao de score para prioridade esta explicita e alinhada ao consumo sequencial da fila.
- Comando: `test -f docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`
  - Esperado: existe artefato de aplicacao piloto versionado para backlog derivado da spec.
- Comando: `rg -n "score|Priority|ticket|execplan|spec" docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md`
  - Esperado: aplicacao piloto mostra itens avaliados, score e prioridade com links rastreaveis.
- Comando: `rg -n "CA-02|CA-03|RF-07|RF-08|docs/checkups/history/2026-02-21-priorizacao-refatoracoes-criticas-piloto.md|execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
  - Esperado: spec reflete avanco dos criterios de aceitacao deste escopo com evidencias objetivas.
- Comando: `git diff -- src/integrations/ticket-queue.ts`
  - Esperado: sem alteracoes no runtime da fila, preservando compatibilidade do fluxo sequencial atual.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar comandos de `rg`, `test -f`, `git status` e `git diff` nao altera estado do repositorio.
  - reaplicar a matriz no piloto para os mesmos itens deve resultar no mesmo score/prioridade, desde que os dados de entrada nao mudem.
  - atualizacoes documentais sao incrementais e auditaveis no historico da spec/checkup.
- Riscos:
  - thresholds de score mal calibrados podem concentrar backlog em `P0`/`P1` e reduzir discriminacao pratica.
  - divergencia entre `docs/checkups/checkup-nao-funcional.md` e `INTERNAL_TICKETS.md` pode reintroduzir subjetividade.
  - piloto com evidencias insuficientes pode nao comprovar CA-03.
  - sobreposicao com escopo do ticket irmao de melhoria continua pode gerar rastreabilidade confusa.
- Recovery / Rollback:
  - se thresholds ficarem desequilibrados, revisar apenas tabela de mapeamento mantendo os quatro eixos e registrar ajuste no `Decision Log`.
  - se houver divergencia documental, definir `docs/checkups/checkup-nao-funcional.md` como fonte principal e alinhar demais arquivos no mesmo changeset.
  - se o piloto nao atingir evidencia minima, repetir a rodada com backlog adicional e registrar novo artefato em `docs/checkups/history/`.
  - se houver invasao de escopo do ticket irmao, mover trecho excedente para backlog correspondente e manter aqui somente RF-07/RF-08 + CA-02/CA-03.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`.
- ExecPlan desta entrega: `execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`.
- Spec de origem:
  - `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
- Referencias de processo e baseline:
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
  - `README.md`
  - `tickets/templates/internal-ticket-template.md`
  - `docs/checkups/checkup-nao-funcional.md`
  - `src/integrations/ticket-queue.ts`
- Ticket relacionado fora de escopo direto:
  - `tickets/open/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`
- Evidencias de baseline do gap:
  - `rg -n "custo de atraso|frequencia|matriz|score" docs/checkups/checkup-nao-funcional.md INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md`
  - `rg -n "RF-07|RF-08|CA-02|CA-03" docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato documental de classificacao/priorizacao no check-up (`docs/checkups/checkup-nao-funcional.md`).
  - governanca de abertura/triagem de tickets (`INTERNAL_TICKETS.md` e `tickets/templates/internal-ticket-template.md`).
  - status/rastreabilidade da spec (`docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`).
- Compatibilidade:
  - sem mudanca de API, schema de runtime ou contrato de `TicketQueue`.
  - regra de consumo da fila permanece `P0 -> P1 -> P2` com fallback por nome.
  - fluxo sequencial do runner permanece inalterado.
- Dependencias externas e mocks:
  - nao ha dependencia externa de runtime.
  - validacao prevista e documental/auditavel por comandos locais (`rg`, `git diff`, `test -f`).
