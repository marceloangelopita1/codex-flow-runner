# [TICKET] Relatorio humano do `/target_prepare` ainda sai com redacao inconsistente

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-25 16:36Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md
- Source spec canonical path (when applicable): docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-04, RF-05, RF-06, RF-07, RF-10; CA-04, CA-05, CA-06; restricoes tecnicas/documentais de preservar o contrato atual do `target_prepare`, a semantica operacional do relatorio e a estabilidade de schema/chaves/versoes do manifesto.
- Inherited assumptions/defaults (when applicable): `docs/workflows/target-prepare-report.md` e artefato humano e pode ter redacao corrigida; `docs/workflows/target-prepare-manifest.json` deve preservar contrato maquina-legivel; o foco continua nas superficies propagadas por `target_prepare`, sem ampliar a mudanca para revisao editorial geral do runtime; a revisao deve preferir ajustes pequenos e seguros.
- Inherited RNFs (when applicable): usar portugues correto com acentuacao adequada e coerencia terminologica com `DOCUMENTATION.md`; manter convergencia observavel do `target_prepare`; nao introduzir regressao de significado operacional no resumo humano gerado pelo runner.
- Inherited technical/documentary constraints (when applicable): preservar fluxo sequencial e o contrato atual do `target_prepare`; nao renomear chaves, paths canonicos, `contractVersion` ou `prepareSchemaVersion` do manifesto; manter o relatorio em `docs/workflows/target-prepare-report.md`; validar a mudanca com testes e smoke do fluxo.
- Inherited pending/manual validations (when applicable): validar o texto final gerado para `docs/workflows/target-prepare-report.md` apos a implementacao; rodar smoke de `/target_prepare` em repositorio descartavel e revisar manualmente o relatorio propagado; confirmar no smoke manual que o bloco gerenciado de `AGENTS.md` continua legivel e sem conflito com conteudo preexistente relevante do projeto alvo, a partir de `docs/workflows/target-prepare-managed-agents-section.md`; confirmar no smoke manual que o bloco gerenciado de `README.md` continua claro para operadores humanos no projeto externo, a partir de `docs/workflows/target-prepare-managed-readme-section.md`; revisar se a correcao editorial elimina a classe de erro relatada sem quebrar a convergencia do pos-check.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - DOCUMENTATION.md
  - SPECS.md
  - INTERNAL_TICKETS.md
  - tickets/templates/internal-ticket-template.md
  - docs/workflows/codex-quality-gates.md
  - src/core/target-prepare.ts
  - src/core/target-prepare.test.ts
  - src/types/target-prepare.ts
  - docs/workflows/target-prepare-managed-agents-section.md
  - docs/workflows/target-prepare-managed-readme-section.md
  - docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o relatorio humano e gerado em toda execucao bem-sucedida de `/target_prepare` e fica versionado no repositorio alvo. O problema e menor que o das fontes `copy-exact`, porque nao contamina o backlog inteiro de docs canonicas, mas continua publico, recorrente e visivel para operadores.

## Context
- Workflow area: geracao do relatorio humano em `docs/workflows/target-prepare-report.md`.
- Scenario: `renderReport()` consolida o resumo observavel do prepare e o resultado e versionado no repositorio alvo junto com o manifesto.
- Input constraints: corrigir apenas o texto humano gerado pelo runner e os testes associados, preservando o mesmo caminho do relatorio, a fronteira de pos-check/versionamento e a estabilidade do manifesto JSON.

## Problem statement
Mesmo com `target_prepare` funcional e com manifesto estavel, o texto gerado em `docs/workflows/target-prepare-report.md` ainda mistura headings em ingles com trechos em portugues sem acentuacao. O artefato humano fica desalinhado de `DOCUMENTATION.md` e repropaga para o projeto alvo a mesma inconsistancia editorial que a spec quer remover.

## Observed behavior
- O que foi observado: `src/core/target-prepare.ts` gera `# Target Prepare Report`, `## Summary`, `Eligible for /projects: yes`, `Compatible with workflow complete: yes` e notas como `Manifesto tecnico e relatorio humano foram gerados pelo runner apos pos-check deterministico.`; `src/core/target-prepare.test.ts` fixa esse contrato textual ao validar as strings em ingles.
- Frequencia (unico, recorrente, intermitente): recorrente em todo `/target_prepare` concluido com sucesso.
- Como foi detectado (warning/log/test/assert): leitura direta de `renderReport()` em `src/core/target-prepare.ts` e dos asserts correspondentes em `src/core/target-prepare.test.ts`.

## Expected behavior
O relatorio humano gerado por `renderReport()` deve sair em portugues correto e com acentuacao adequada, preservando o mesmo papel operacional no fluxo, a convergencia do pos-check e a estabilidade do manifesto tecnico associado.

## Reproduction steps
1. Abrir `src/core/target-prepare.ts` e ler `renderReport()`.
2. Observar headings e bullets em ingles ou sem acentuacao no corpo retornado.
3. Abrir `src/core/target-prepare.test.ts` e confirmar que a suite ainda espera esse texto atual em ingles no report gerado.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/core/target-prepare.ts`: `renderReport()` retorna `# Target Prepare Report`, `## Summary`, `Eligible for /projects: yes`, `Compatible with workflow complete: yes`, `Manifesto tecnico` e `pos-check deterministico`.
  - `src/core/target-prepare.test.ts`: a suite valida explicitamente `Eligible for /projects: yes` e `Compatible with workflow complete: yes`, o que mostra que a superficie gerada ainda nao foi revisada editorialmente.
  - `src/types/target-prepare.ts`: o manifesto continua com `TARGET_PREPARE_CONTRACT_VERSION`, `TARGET_PREPARE_SCHEMA_VERSION` e caminhos canonicos estaveis que precisam ser preservados durante a remediacao.
- Comparativo antes/depois (se houver): antes = relatorio humano gerado com redacao inconsistente; depois esperado = mesmo artefato operacional, mas com texto humano editorialmente correto e testes atualizados para o novo contrato observavel.

## Impact assessment
- Impacto funcional: o resumo humano versionado do `target_prepare` continua abaixo da barra editorial do repositorio.
- Impacto operacional: operadores e projetos alvo recebem um artefato canonicamente versionado com linguagem inconsistente logo apos o onboarding.
- Risco de regressao: medio, porque a remediacao toca codigo e testes do fluxo, embora o contrato maquina-legivel do manifesto deva permanecer intacto.
- Scope estimado (quais fluxos podem ser afetados): `src/core/target-prepare.ts`, `src/core/target-prepare.test.ts` e qualquer documentacao/resumo que referencie literalmente o texto atual do report.

## Initial hypotheses (optional)
- A menor entrega segura e revisar somente o texto retornado por `renderReport()` e ajustar a suite para o novo contrato editorial, sem alterar o schema do manifesto, os paths de artefato ou a logica de convergencia.

## Proposed solution (optional)
- Reescrever o report gerado para portugues correto, manter a mesma estrutura observavel de resumo/git snapshot/caminhos/superficies/resumo do Codex/notas e revalidar a estabilidade do manifesto com a suite existente.

## Closure criteria
- Requisito/RF/CA coberto: RF-04, RF-06, RF-07; CA-04.
- Evidencia observavel: `src/core/target-prepare.ts` passa a gerar `docs/workflows/target-prepare-report.md` com headings e bullets em portugues correto e acentuado, preservando o mesmo sentido operacional do resumo final e da recomendacao de proxima acao.
- Requisito/RF/CA coberto: RF-05; CA-05.
- Evidencia observavel: `src/types/target-prepare.ts` continua preservando `TARGET_PREPARE_CONTRACT_VERSION`, `TARGET_PREPARE_SCHEMA_VERSION`, caminhos canonicos e chaves do manifesto; a suite automatizada continua validando essa estabilidade.
- Requisito/RF/CA coberto: RF-10; CA-06, com validacoes manuais herdadas de RF-03; CA-03.
- Evidencia observavel: a suite de `src/core/target-prepare.test.ts` e validacoes correlatas passam com o texto revisado, e um smoke manual de `/target_prepare` em repositorio descartavel confirma que o relatorio gerado no alvo usa a nova redacao sem quebrar o fluxo, que o bloco gerenciado de `AGENTS.md` permanece legivel e sem conflito com conteudo preexistente relevante e que o bloco gerenciado de `README.md` continua claro para operadores humanos.

## Decision log
- 2026-03-25 - Ticket aberto na triagem da spec como pacote separado porque a revisao do report entra em codigo e testes, com risco diferente do lote puramente documental das fontes `copy-exact`.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
