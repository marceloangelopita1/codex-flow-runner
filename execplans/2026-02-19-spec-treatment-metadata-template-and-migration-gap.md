# ExecPlan - Padronizar Spec treatment no baseline de specs e template

## Purpose / Big Picture
- Objetivo: padronizar a metadata `Spec treatment` em todo baseline de specs e no template oficial para eliminar excecoes na elegibilidade de `/specs` e `/run_specs`.
- Resultado esperado:
  - todo arquivo de especificacao em `docs/specs/` (exceto `README.md` e pasta `templates/`) contem `- Spec treatment: pending | done` em `## Metadata`;
  - `docs/specs/templates/spec-template.md` passa a exigir `Spec treatment`;
  - `SPECS.md` passa a documentar obrigatoriedade e criterio de uso de `pending | done`;
  - classificacao de elegibilidade fica deterministica para `FileSystemSpecDiscovery`.
- Escopo:
  - migracao documental das specs existentes em `docs/specs/`;
  - atualizacao do template oficial de spec;
  - atualizacao de regras operacionais em `SPECS.md`;
  - validacao final textual dos arquivos migrados.
- Fora de escopo:
  - mudancas em codigo TypeScript (`src/**`);
  - fechamento de ticket e commit/push;
  - mudanca de semantica do campo `Status`;
  - paralelizacao de specs ou tickets.

## Progress
- [x] 2026-02-19 20:16Z - Planejamento inicial concluido com leitura do ticket, `PLANS.md` e referencias obrigatorias.
- [x] 2026-02-19 20:19Z - Regra de migracao `pending|done` aplicada no baseline de specs usando `tickets/open/` como fonte de verdade.
- [x] 2026-02-19 20:19Z - `docs/specs/templates/spec-template.md` atualizado com `Spec treatment`.
- [x] 2026-02-19 20:19Z - `SPECS.md` atualizado com obrigatoriedade e criterio operacional de `Spec treatment`.
- [x] 2026-02-19 20:19Z - Validacao final de consistencia concluida com comandos do plano sem erro.

## Surprises & Discoveries
- 2026-02-19 20:16Z - Apenas `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` contem `Spec treatment`; as demais specs do baseline nao contem o campo.
- 2026-02-19 20:16Z - `docs/specs/templates/spec-template.md` ainda nao inclui `Spec treatment` no bloco de metadata.
- 2026-02-19 20:16Z - `SPECS.md` define status de ciclo de vida, mas nao define explicitamente `Spec treatment`.
- 2026-02-19 20:16Z - No momento do planejamento existe apenas um ticket aberto em `tickets/open/` (o ticket alvo deste ExecPlan).

## Decision Log
- 2026-02-19 - Decisao: tratar `Spec treatment` como metadata operacional independente de `Status`, sem alterar `Status` existente das specs.
  - Motivo: o ticket pede padronizacao de metadata preservando historico e semantica de aprovacao/atendimento.
  - Impacto: migracao restrita ao campo novo, sem reclassificar ciclo de vida funcional.
- 2026-02-19 - Decisao: usar regra de atribuicao `pending` quando houver trabalho pendente da spec; `done` quando nao houver pendencias abertas.
  - Motivo: manter elegibilidade de triagem rastreavel e coerente com backlog aberto.
  - Impacto: specs historicas tendem a `done`; specs ainda em derivacao ficam `pending`.
- 2026-02-19 - Decisao: usar `tickets/open/` como fonte de verdade para pendencias ativas quando houver divergencia documental em links de tickets.
  - Motivo: algumas specs podem conter referencias antigas para `tickets/open/` mesmo com ticket ja fechado.
  - Impacto: reduz risco de marcar `pending` por referencia desatualizada.
- 2026-02-19 - Decisao: template oficial passa a sugerir default `Spec treatment: pending`.
  - Motivo: novas specs normalmente nascem sem tratamento concluido.
  - Impacto: evita criar novas specs sem metadata obrigatoria.

## Outcomes & Retrospective
- Status final: implementacao documental concluida e validada neste repositorio.
- O que funcionou: checklist do plano cobriu migracao, padrao de template e regra normativa em `SPECS.md` sem alterar codigo TypeScript.
- O que ficou pendente: etapa posterior de fechamento do ticket e versionamento (commit/push), fora de escopo desta execucao.
- Proximos passos: seguir etapa operacional de fechamento quando autorizado.

## Context and Orientation
- Arquivos principais:
  - `tickets/open/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
  - `docs/specs/2026-02-19-telegram-access-and-control-plane.md`
  - `docs/specs/2026-02-19-telegram-run-status-notification.md`
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - `docs/specs/templates/spec-template.md`
  - `SPECS.md`
- Fluxo atual:
  - elegibilidade de triagem em `src/integrations/spec-discovery.ts` exige `Status: approved` e `Spec treatment: pending`;
  - ausencia de `Spec treatment` hoje torna specs automaticamente nao elegiveis em `/specs` e `/run_specs`;
  - sem padrao no template, o problema tende a se repetir em novas specs.
- Restricoes tecnicas e operacionais:
  - fluxo do projeto permanece sequencial;
  - nao adicionar dependencias;
  - mudanca documental deve ser auto-contida e auditavel por comandos de texto.
- Baseline de migracao identificado no planejamento:
  - Ja contem campo: `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`.
  - Faltando campo: `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`, `docs/specs/2026-02-19-telegram-access-and-control-plane.md`, `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`, `docs/specs/2026-02-19-telegram-run-status-notification.md`.

## Plan of Work
- Milestone 1: Congelar regra de classificacao `pending|done` e matriz de migracao por spec.
  - Entregavel: criterio explicito de atribuicao e tabela simples arquivo -> valor de `Spec treatment`.
  - Evidencia de conclusao: anotacao no proprio ExecPlan (`Decision Log`) e diff dos arquivos de spec com valores coerentes.
  - Arquivos esperados: `execplans/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`, `docs/specs/2026-02-19-*.md`.
- Milestone 2: Atualizar padrao para novas specs.
  - Entregavel: `docs/specs/templates/spec-template.md` com campo `Spec treatment`.
  - Evidencia de conclusao: `rg -n "Spec treatment" docs/specs/templates/spec-template.md` retorna linha no bloco `## Metadata`.
  - Arquivos esperados: `docs/specs/templates/spec-template.md`.
- Milestone 3: Atualizar governanca em `SPECS.md`.
  - Entregavel: regra oficial de obrigatoriedade de `Spec treatment` e semantica de `pending|done`.
  - Evidencia de conclusao: `rg -n "Spec treatment|pending|done" SPECS.md` retorna secao normativa.
  - Arquivos esperados: `SPECS.md`.
- Milestone 4: Migrar baseline de specs existentes sem alterar `Status`.
  - Entregavel: todas as specs versionadas em `docs/specs/` com `Spec treatment: pending | done`.
  - Evidencia de conclusao: validacao automatizada mostra 1 campo valido por arquivo de spec.
  - Arquivos esperados: `docs/specs/2026-02-19-*.md`.
- Milestone 5: Validar consistencia e preparar rastreabilidade para fechamento posterior.
  - Entregavel: checklist de validacao executado e diff final auditado.
  - Evidencia de conclusao: comandos de validacao sem saida de erro e `git diff` apenas nos arquivos esperados.
  - Arquivos esperados: mesmos arquivos dos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "^- Spec ID:|^- Status:|^- Spec treatment:" docs/specs/*.md` para registrar baseline de metadata antes da migracao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `ls -1 tickets/open` para confirmar pendencias abertas no momento da atribuicao `pending|done`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `docs/specs/templates/spec-template.md` para incluir `- Spec treatment: pending` em `## Metadata`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `SPECS.md` para explicitar que toda spec deve conter `Spec treatment` e definir regra de uso de `pending` (ainda em tratamento) e `done` (tratamento concluido).
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar cada spec de `docs/specs/2026-02-19-*.md` que ainda nao possui o campo, inserindo `- Spec treatment: <pending|done>` sem alterar `Status`.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `docs/specs/2026-02-19-approved-spec-triage-run-specs.md` para manter/ajustar valor do campo conforme pendencias reais apos a migracao.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar:
   - `for f in docs/specs/2026-02-19-*.md; do rg -q "^- Spec treatment: (pending|done)$" "$f" || echo "invalid:$f"; done`
   - `for f in docs/specs/2026-02-19-*.md; do c=$(rg -c "^- Spec treatment:" "$f"); [ "$c" -eq 1 ] || echo "count:$f:$c"; done`
   para validar formato e cardinalidade do campo.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Spec treatment" docs/specs/templates/spec-template.md SPECS.md docs/specs/2026-02-19-*.md` para verificar cobertura completa da regra.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- docs/specs/templates/spec-template.md SPECS.md docs/specs/2026-02-19-*.md` para auditoria final.

## Validation and Acceptance
- Comando: `rg -n "^- Spec treatment:" docs/specs/2026-02-19-*.md`
  - Esperado: todas as specs versionadas retornam exatamente uma linha de `Spec treatment`.
- Comando: `for f in docs/specs/2026-02-19-*.md; do rg -q "^- Spec treatment: (pending|done)$" "$f" || echo "invalid:$f"; done`
  - Esperado: nenhum output `invalid:*`.
- Comando: `for f in docs/specs/2026-02-19-*.md; do c=$(rg -c "^- Spec treatment:" "$f"); [ "$c" -eq 1 ] || echo "count:$f:$c"; done`
  - Esperado: nenhum output `count:*`.
- Comando: `rg -n "Spec treatment" docs/specs/templates/spec-template.md`
  - Esperado: template oficial contem o campo no bloco de metadata.
- Comando: `rg -n "Spec treatment|pending|done" SPECS.md`
  - Esperado: guia oficial documenta obrigatoriedade e semantica operacional do campo.
- Comando: `git diff -- docs/specs/templates/spec-template.md SPECS.md docs/specs/2026-02-19-*.md`
  - Esperado: diff restrito ao escopo documental deste ticket.

## Idempotence and Recovery
- Idempotencia:
  - insercao do campo e idempotente quando validada por cardinalidade (`1` por arquivo);
  - comandos de validacao podem ser reexecutados sem efeitos colaterais.
- Riscos:
  - atribuir `pending|done` incorretamente em spec com rastreabilidade desatualizada;
  - inserir campo fora do bloco `## Metadata`, quebrando parse esperado;
  - duplicar o campo em um mesmo arquivo durante edicoes manuais.
- Recovery / Rollback:
  - usar `git diff` para localizar rapidamente atribuicoes incorretas;
  - corrigir valor/posicao do campo e reexecutar validacoes de formato/cardinalidade;
  - se houver ambiguidade de classificacao, priorizar estado real de `tickets/open/` e registrar ajuste em `Decision Log`.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`.
- ExecPlan desta entrega: `execplans/2026-02-19-spec-treatment-metadata-template-and-migration-gap.md`.
- Referencias consultadas:
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
  - `docs/specs/2026-02-19-telegram-access-and-control-plane.md`
  - `docs/specs/2026-02-19-telegram-run-status-notification.md`
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - `docs/specs/2026-02-19-guiadomus-codex-sdk-ticket-execution.md`
  - `docs/specs/templates/spec-template.md`
  - `SPECS.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `src/integrations/spec-discovery.ts`
- Evidencias esperadas de aceite:
  - saida dos comandos de `Validation and Acceptance`;
  - diff documental limitado ao escopo do ticket;
  - ausencia de spec sem `Spec treatment`.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato documental de metadata de spec (cabecalho `## Metadata`);
  - template oficial de criacao de specs;
  - guia de governanca (`SPECS.md`).
- Compatibilidade:
  - `FileSystemSpecDiscovery` continua compativel, pois ja interpreta `Spec treatment`;
  - maior determinismo para `/specs` e `/run_specs`, sem dependencia de excecoes por metadata ausente;
  - `Status` permanece inalterado para preservar semantica historica.
- Dependencias externas e mocks:
  - nenhuma dependencia externa nova;
  - validacao baseada em comandos shell locais (`rg`, `git diff`, `ls`).
