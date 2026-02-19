# ExecPlan - Priorizacao de fila por `Priority` e alinhamento de documentacao operacional

## Purpose / Big Picture
- Objetivo: fazer o `/run-all` selecionar o proximo ticket aberto por prioridade de metadata (`P0` antes de `P1`, e `P1` antes de `P2`) e registrar essa regra de forma explicita na documentacao operacional.
- Resultado esperado:
  - `FileSystemTicketQueue.nextOpenTicket()` deixa de usar apenas ordem alfabetica e passa a considerar `Priority` do ticket.
  - Tickets de mesma prioridade permanecem com desempate indiferente para o contrato funcional (implementacao pode usar fallback deterministico por nome).
  - Suite automatizada cobre cenarios de prioridades diferentes e empate de prioridade.
  - Documentos operacionais passam a explicar explicitamente a regra de ordenacao da fila.
- Escopo:
  - Evoluir `src/integrations/ticket-queue.ts` para ler metadata `Priority` dos tickets candidatos e ordenar por ranking.
  - Definir fallback para tickets sem `Priority` valida sem quebrar fluxo sequencial.
  - Adicionar cobertura de testes em `src/integrations/ticket-queue.test.ts` para ranking e empate.
  - Atualizar documentacao operacional relacionada a abertura/triagem e consumo da fila.
- Fora de escopo:
  - Paralelizacao de tickets.
  - Mudanca de semantica de `Severity` na fila (continuara apenas informativa).
  - Alteracoes em comandos Telegram alem da documentacao de comportamento da fila.

## Progress
- [x] 2026-02-19 19:03Z - Planejamento inicial concluido com leitura integral do ticket e referencias.
- [x] 2026-02-19 19:07Z - Implementacao da ordenacao por prioridade concluida em `ticket-queue`.
- [x] 2026-02-19 19:07Z - Cobertura de testes de prioridade e empate concluida.
- [x] 2026-02-19 19:07Z - Documentacao operacional atualizada com regra explicita de ordenacao.
- [x] 2026-02-19 19:07Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-02-19 19:03Z - `src/integrations/ticket-queue.ts` atualmente escolhe o primeiro arquivo apos `localeCompare`, sem ler metadata `Priority`.
- 2026-02-19 19:03Z - `src/integrations/ticket-queue.test.ts` cobre apenas `ensureStructure`; nao ha cobertura para `nextOpenTicket()`.
- 2026-02-19 19:03Z - `INTERNAL_TICKETS.md` define o significado de `P0/P1/P2`, mas nao define ordem de consumo da fila por `/run-all`.
- 2026-02-19 19:03Z - `README.md` descreve fluxo sequencial e passo "detectar proximo ticket", mas sem regra de priorizacao.
- 2026-02-19 19:03Z - O prompt `prompts/01-avaliar-spec-e-gerar-tickets.md` exige classificar gaps por prioridade, porem nao explicita como essa prioridade e consumida pelo runner.
- 2026-02-19 19:07Z - Fallback de `Priority` ausente/invalida foi implementado como menor prioridade efetiva, com teste dedicado para evitar regressao silenciosa.

## Decision Log
- 2026-02-19 - Decisao: implementar ranking de prioridade no adaptador de fila (`P0=0`, `P1=1`, `P2=2`) e manter fallback seguro para metadata ausente/invalida.
  - Motivo: atender criterio funcional do ticket sem alterar contrato externo do runner.
  - Impacto: leitura de conteudo dos arquivos `.md` em `nextOpenTicket()` e ajuste de testes da fila.
- 2026-02-19 - Decisao: manter desempate indiferente no contrato, com fallback de implementacao por nome de arquivo para previsibilidade operacional.
  - Motivo: ticket aceita qualquer ordem em empate, mas fallback deterministico facilita reproducao e diagnostico.
  - Impacto: docs devem deixar claro que desempate nao e requisito funcional estrito.
- 2026-02-19 - Decisao: atualizar docs operacionais de tickets e fluxo (`INTERNAL_TICKETS.md`, `README.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`).
  - Motivo: fechar gap de documentacao citado no ticket com instrucao explicita para triagem e execucao.
  - Impacto: melhora alinhamento entre criacao de backlog e consumo real da fila pelo `/run-all`.

## Outcomes & Retrospective
- Status final: implementacao e validacao desta etapa concluidas conforme escopo do plano.
- O que funcionou: ranking por `Priority` (`P0 -> P1 -> P2`) entrou em `nextOpenTicket`, com desempate por nome e fallback seguro para metadata ausente/invalida.
- O que ficou pendente: fechamento do ticket e commit/push permanecem pendentes por restricao explicita desta etapa.
- Proximos passos: executar etapa de fechamento/versionamento quando autorizado no fluxo sequencial.

## Context and Orientation
- Arquivos principais:
  - `src/integrations/ticket-queue.ts` - ponto de selecao do proximo ticket (`nextOpenTicket`) atualmente alfabetico.
  - `src/integrations/ticket-queue.test.ts` - suite da fila, hoje sem cenarios de ordenacao por prioridade.
  - `src/core/runner.ts` - orquestra `/run-all` e consome `queue.nextOpenTicket()`; nao precisa mudar contrato, apenas comportamento do adaptador.
  - `INTERNAL_TICKETS.md` - politica de prioridade/severidade, ainda sem regra de ordenacao da fila.
  - `README.md` - documentacao operacional do fluxo sequencial e comandos.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` - prompt de triagem/criacao de tickets com classificacao de prioridade.
- Fluxo atual:
  - Runner entra em `select-ticket` e chama `nextOpenTicket()` a cada iteracao da rodada.
  - A fila lista `tickets/open/*.md` e seleciona por ordem de nome.
  - Resultado: prioridade do metadata nao afeta sequenciamento real.
- Restricoes tecnicas:
  - Node.js 20+, TypeScript ESM.
  - Fluxo sequencial obrigatorio (sem paralelizacao).
  - Sem introduzir dependencias externas para parsing simples de metadata.
- Termos usados neste plano:
  - "Ranking de prioridade": ordenacao numerica (`P0` mais urgente, `P2` menos urgente).
  - "Desempate": criterio aplicado quando dois tickets compartilham mesma prioridade.

## Plan of Work
- Milestone 1: Contrato de prioridade implementado no adaptador de fila.
  - Entregavel: `nextOpenTicket()` passa a ordenar candidatos por `Priority` antes de selecionar o ticket.
  - Evidencia de conclusao: leitura do metadata no codigo e selecao de ticket de maior prioridade em teste automatizado.
  - Arquivos esperados: `src/integrations/ticket-queue.ts`.
- Milestone 2: Cobertura automatizada de prioridade e empate.
  - Entregavel: testes novos cobrindo pelo menos dois cenarios obrigatorios: prioridade diferente e empate de prioridade.
  - Evidencia de conclusao: `npx tsx --test src/integrations/ticket-queue.test.ts` verde com nomes de casos representando os cenarios do ticket.
  - Arquivos esperados: `src/integrations/ticket-queue.test.ts`.
- Milestone 3: Documentacao operacional alinhada ao comportamento da fila.
  - Entregavel: regra explicita de ordenacao (`P0 -> P1 -> P2`) documentada, incluindo regra de desempate no contrato funcional.
  - Evidencia de conclusao: ocorrencias de texto verificaveis em docs e prompt operacional.
  - Arquivos esperados: `INTERNAL_TICKETS.md`, `README.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Milestone 4: Validacao integrada e rastreabilidade final.
  - Entregavel: validacoes de teste, tipagem e build executadas sem regressao e diff final focado no escopo.
  - Evidencia de conclusao: comandos de validacao verdes e artefatos listados no diff final.
  - Arquivos esperados: arquivos dos milestones anteriores, sem alteracoes fora de escopo.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check && npm test` para baseline antes das alteracoes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "nextOpenTicket|localeCompare|Priority" src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts INTERNAL_TICKETS.md README.md` para mapear todos os pontos de mudanca.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/ticket-queue.ts` via `$EDITOR src/integrations/ticket-queue.ts` para:
   - ler metadata `Priority` de cada ticket candidato;
   - aplicar ranking `P0` > `P1` > `P2`;
   - manter fallback seguro para metadata ausente/invalida sem quebrar execucao.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/ticket-queue.test.ts` via `$EDITOR src/integrations/ticket-queue.test.ts` adicionando fixtures temporarias e casos de ordenacao por prioridade.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Incluir no mesmo arquivo de testes um caso de empate de prioridade com assert de contrato (ordem indiferente ou fallback documentado).
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/ticket-queue.test.ts` para validar isoladamente o comportamento da fila.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `INTERNAL_TICKETS.md` via `$EDITOR INTERNAL_TICKETS.md` para explicitar que a fila de `/run-all` prioriza `P0`, depois `P1`, depois `P2`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` via `$EDITOR README.md` no trecho de fluxo operacional para registrar a mesma regra de priorizacao.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `prompts/01-avaliar-spec-e-gerar-tickets.md` via `$EDITOR prompts/01-avaliar-spec-e-gerar-tickets.md` para alinhar triagem de prioridade com o criterio consumido pela fila.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test && npm run check && npm run build` para regressao completa apos as mudancas.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "P0|P1|P2|prior" INTERNAL_TICKETS.md README.md prompts/01-avaliar-spec-e-gerar-tickets.md src/integrations/ticket-queue.ts` para auditoria rapida da consistencia documental e tecnica.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts INTERNAL_TICKETS.md README.md prompts/01-avaliar-spec-e-gerar-tickets.md` para conferencia final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/ticket-queue.test.ts`
  - Esperado: casos comprovam que ticket `P0` e selecionado antes de `P1/P2` e que empate de prioridade respeita o contrato definido.
- Comando: `npm test`
  - Esperado: suite completa verde, sem regressao do fluxo sequencial por ticket.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build concluem sem erro.
- Comando: `rg -n "P0|P1|P2|/run-all|prior" INTERNAL_TICKETS.md README.md prompts/01-avaliar-spec-e-gerar-tickets.md`
  - Esperado: docs operacionais mencionam explicitamente a ordenacao por prioridade e regra de desempate.

## Idempotence and Recovery
- Idempotencia:
  - Reexecutar os testes nao altera estado persistente do repositorio.
  - Com o mesmo conjunto de tickets, o ranking por prioridade permanece consistente entre execucoes.
- Riscos:
  - Parsing de metadata pode falhar em tickets com formato divergente do template.
  - Leitura de varios arquivos por rodada aumenta custo de I/O em backlog grande.
  - Regra de fallback para prioridade ausente/invalida pode gerar expectativa operacional diferente se nao ficar documentada.
- Recovery / Rollback:
  - Em falha de parsing, aplicar fallback para menor prioridade e registrar comportamento em teste/documentacao.
  - Se houver regressao operacional, reverter apenas mudanca da fila e manter docs consistentes com comportamento efetivo.
  - Se custo de I/O ficar alto, evoluir para cache em rodada futura (fora deste ticket), mantendo contrato funcional atual.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-ticket-priority-ordering-and-documentation-gap.md`.
- Referencias usadas no planejamento:
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/ticket-queue.test.ts`
  - `src/core/runner.ts`
  - `INTERNAL_TICKETS.md`
  - `README.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `PLANS.md`
- PR/Diff alvo: `git diff -- src/integrations/ticket-queue.ts src/integrations/ticket-queue.test.ts INTERNAL_TICKETS.md README.md prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Logs relevantes: saida de `npx tsx --test src/integrations/ticket-queue.test.ts`, `npm test`, `npm run check`, `npm run build`.
- Evidencias de aceite: nomes dos testes novos + trechos documentais com regra `P0 -> P1 -> P2`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - Comportamento de `TicketQueue.nextOpenTicket()` passa a considerar metadata `Priority` antes de ordem por nome.
  - Contrato de tipo `TicketRef` nao precisa mudar para entregar este escopo.
- Compatibilidade:
  - Fluxo sequencial por ticket permanece inalterado.
  - Em empate de prioridade, contrato funcional continua aceitando qualquer ordem; fallback interno pode permanecer deterministico.
- Dependencias externas e mocks:
  - Sem novas dependencias de runtime.
  - Testes continuam com `node:test` e filesystem temporario (`node:fs`, `os.tmpdir`) para fixtures locais.
