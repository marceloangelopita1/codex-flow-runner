# [TICKET] Contratualizar manifesto, artefatos e publication do /target_investigate_case

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P0
- Severity: S1
- Created at (UTC): 2026-04-03 16:11Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID: n/a - triagem local da spec
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-13..RF-35, RF-37..RF-41; CA-02, CA-03, CA-04, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11, CA-13, CA-14, CA-15. Membros explicitos preservados: capability `case-investigation`; manifesto `docs/workflows/target-case-investigation-manifest.json`; vereditos `houve_gap_real=yes|no|inconclusive`, `era_evitavel_internamente=yes|no|inconclusive|not_applicable`, `merece_ticket_generalizavel=yes|no|inconclusive|not_applicable`; `confidence=low|medium|high`; `evidence_sufficiency=insufficient|partial|sufficient|strong`; `publication_status=eligible|not_eligible|blocked_by_policy|not_applicable`; `overall_outcome=no-real-gap|real-gap-not-internally-avoidable|real-gap-not-generalizable|inconclusive-case|inconclusive-project-capability-gap|runner-limitation|ticket-published|ticket-eligible-but-blocked-by-policy`.
- Inherited assumptions/defaults (when applicable): a capability investigativa e camada adicional de onboarding; `assessment.json` e a fonte autoritativa dos vereditos semanticos do projeto alvo; o runner continua como autoridade final de `publication_status` e `overall_outcome`; por default nao existe write-back versionado sem ticket; a barra de publication automatica deve ser conservadora (`strong`, ou `sufficient` apenas com conflito contratual/guardrail inequivoco, `generalization_basis[]` explicita e zero veto bloqueante).
- Inherited RNFs (when applicable): coleta de evidencia deterministica e guiada por manifesto; regra anti-overfit explicita e auditavel; trace minimo sem material sensivel; rastreabilidade cross-project observavel; fluxo sequencial.
- Inherited technical/documentary constraints (when applicable): o runner nao pode descobrir livremente logs, tabelas, buckets, comandos ou fontes de evidencia; a coleta/replay devem ser guiados pelo manifesto machine-readable; o runner nao pode fazer um segundo julgamento semantico de dominio; o trace nao deve copiar `workflow_debug`, `db_payload`, transcript nem payloads brutos; o artefato versionado padrao de v1 continua sendo apenas o ticket quando houver publication elegivel.
- Inherited pending/manual validations (when applicable): definir o schema final versionado do manifesto investigativo; definir a tabela canonica de combinacoes validas entre vereditos semanticos, `publication_status` e `overall_outcome`; validar a politica de retencao e o caminho local do dossier por capability; validar se o trace minimizado do runner e suficiente para auditoria operacional sem exigir abertura imediata do dossier local.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): ticket
- Smallest plausible explanation (audit/review only): os closure criteria do ticket pai exigem wiring observavel em `runner`/`telegram-bot`/`workflow-trace-store` e validacao final de trace/resumo, mas essa superficie depende do scaffold de control-plane ainda aberto no ticket irmao; o branch atual entrega o pacote contratual runner-side e seus testes locais, porem ainda sem um flow real que o consuma.
- Remediation scope (audit/review only): local
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
  - docs/workflows/codex-quality-gates.md
  - docs/workflows/target-project-compatibility-contract.md
  - tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): sem contrato de manifesto, enums, gates de combinacao valida, anti-overfit e publication final, qualquer implementacao do fluxo ficaria sem source of truth mecanica e com alto risco de diagnostico inventado ou publication insegura.

## Context
- Workflow area: target investigate case / manifesto de capability / gates mecanicos / publication cross-project
- Scenario: a spec exige que o projeto alvo emita apenas vereditos semanticos estruturados e que o runner aplique gates mecanicos, policy, anti-overfit e publication final.
- Input constraints: este ticket cobre contrato de entrada/saida, validacoes, thresholds, trace minimo e resumo final; wiring operacional do flow e capability especifica do piloto ficam nos tickets irmaos.

## Problem statement
O repositorio nao possui contrato implementado para a capability `case-investigation`, nem manifesto canonico, schemas dos artefatos da investigacao, tabela de combinacoes validas, validacoes anti-overfit ou regra mecanica de publication/no-op. Hoje a base target existente cobre apenas `target_prepare`, `target_checkup` e `target_derive_gaps`, e o trace local aceita dados genericos sem qualquer filtro especifico para essa investigacao.

## Observed behavior
- O que foi observado:
  - `find docs/workflows -maxdepth 2 -type f` no runner retorna apenas `codex-quality-gates.md`, `discover-spec.md`, `target-prepare-managed-*.md` e `target-project-compatibility-contract.md`; nao existe `docs/workflows/target-case-investigation-manifest.json`.
  - `rg -n "case-investigation|target-case-investigation-manifest|assessment.json|publication-decision.json|evidence-bundle|dossier" src docs/workflows` so encontra ocorrencias na propria spec alvo, sem tipos, parser ou validacao em `src/`.
  - `src/types/target-prepare.ts` modela somente `TargetPrepareManifest` e `workflowCompleteDependencies`, sem capability adicional para investigacao causal.
  - `src/types/target-checkup.ts` e `src/core/target-checkup.ts` conhecem readiness/documents/prepare manifest, mas nao conhecem manifesto investigativo, `assessment.json`, `publication-decision.json` ou regras de precedencia/anti-overfit.
  - `src/integrations/workflow-trace-store.ts` aceita `inputs`, `aiExchanges`, `artifactPaths` e `versionedArtifactPaths` genericos para target flows, sem schema nem filtro para impedir copia de material sensivel nesta nova capability.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura estatica de `docs/workflows/`, `src/types/target-prepare.ts`, `src/types/target-checkup.ts`, `src/core/target-checkup.ts` e `src/integrations/workflow-trace-store.ts`, mais busca textual no repositorio.

## Expected behavior
O runner deve descobrir deterministicamente a capability `case-investigation`, validar entradas/saidas e combinacoes validas, aplicar somente gates mecanicos/anti-overfit/publication, manter trace minimo e emitir `publication-decision.json`/summary final sem publicar ticket ou write-back fora das condicoes aceitas.

## Reproduction steps
1. Executar `find docs/workflows -maxdepth 2 -type f` e confirmar a ausencia de `target-case-investigation-manifest.json`.
2. Buscar `case-investigation`, `assessment.json` e `publication-decision.json` em `src/` e confirmar que nao ha tipos, parser nem validacao fora da spec.
3. Ler `src/types/target-prepare.ts`, `src/types/target-checkup.ts` e `src/integrations/workflow-trace-store.ts` para confirmar que o contrato target atual nao cobre capability investigativa nem filtros especificos de trace sensivel.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `docs/workflows/`: nenhum manifesto investigativo canonico presente.
  - `src/types/target-prepare.ts`: manifesto atual limita-se a preparo/onboarding.
  - `src/integrations/workflow-trace-store.ts`: `inputs` e `aiExchanges` sao gravados como JSON livre para target flows.
- Comparativo antes/depois (se houver): antes = nao ha contrato nem gate para investigacao causal; depois esperado = manifesto canonico, enums/versionamento, validacoes positivas/negativas e publication final conservadora.

## Impact assessment
- Impacto funcional: o fluxo nao consegue distinguir caso inconclusivo, gap real, evitabilidade interna, ticket generalizavel ou limitacao do runner/projeto de forma auditavel.
- Impacto operacional: cresce o risco de discovery livre por IA, publication indevida e vazamento de `workflow_debug`/payloads no trace do runner.
- Risco de regressao: alto, porque a entrega toca tipos, validadores, lifecycle do flow, traces, resumo Telegram e testes de contrato.
- Scope estimado (quais fluxos podem ser afetados): `docs/workflows/target-project-compatibility-contract.md`, novos tipos/validadores de investigacao causal, `src/core/runner.ts`, `src/integrations/workflow-trace-store.ts`, `src/integrations/telegram-bot.ts` e suites de teste do runner/target flows.

## Initial hypotheses (optional)
- A entrega deve introduzir contratos versionados para manifesto e artefatos, com validacao negativa fora dos enums aceitos e uma tabela canonica unica para as combinacoes validas entre vereditos semanticos e publication final.

## Proposed solution (optional)
- Criar tipos/schemas/validadores para manifesto, `case-resolution.json`, `evidence-bundle.json`, `assessment.json` e `publication-decision.json`; aplicar a tabela de combinacoes validas e os vetos anti-overfit no runner; filtrar o trace para refs/paths/hashes/contagens/vereditos/decisoes; renderizar resumo final apenas com os campos permitidos.

## Closure criteria
- Requisito/RF/CA coberto: RF-03, RF-04, RF-05, CA-02
- Evidencia observavel: existe contrato machine-readable para `docs/workflows/target-case-investigation-manifest.json`; o runner descobre esse caminho sem heuristica; testes cobrem manifesto valido, manifesto ausente, JSON invalido e capability diferente de `case-investigation`.
- Requisito/RF/CA coberto: RF-06..RF-18, CA-03, CA-04, CA-06, CA-07, CA-10
- Evidencia observavel: tipos/parsers/validadores de `case-resolution.json`, `evidence-bundle.json`, `assessment.json` e `publication-decision.json` aceitam todos os membros explicitamente permitidos e rejeitam valores fora do conjunto; a matriz de combinacoes validas entre vereditos, `publication_status` e `overall_outcome` fica codificada e coberta por testes; o contrato de entrada aceita apenas a forma canonica `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`, com cobertura observavel da normalizacao equivalente da UX guiada do Telegram para os mesmos seletores; `case-resolution.json` e o trace local registram apenas `case-ref` e seletores opcionais ja normalizados, sem variantes nao canonicas ou payload bruto.
- Requisito/RF/CA coberto: RF-19..RF-35, CA-08, CA-09, CA-13, CA-14
- Evidencia observavel: o runner aplica apenas consistencia contratual, capability, thresholds, precedence, replay policy checks e anti-overfit; nao reinterpreta dominio; `runner-limitation` impede ticket automatico no projeto alvo; casos inconclusivos ou nao generalizaveis terminam em no-op local com `publication` concluida; quando `publication_status=eligible`, testes e fixtures tornam observavel o caminho positivo de publication com criacao do ticket no projeto alvo, `ticket_path` preenchido em `publication-decision.json`, `versioned_artifact_paths` restrito ao ticket e resumo final registrando o caminho do ticket e o metadado de versionamento correspondente.
- Requisito/RF/CA coberto: RF-37..RF-41, CA-11, CA-15
- Evidencia observavel: traces e resumo final carregam apenas seletores normalizados, refs, paths, hashes, contagens, vereditos, decisao final, proxima acao e caminho do dossier local; o resumo final do Telegram torna observavel, no minimo, `case-ref`, tentativa resolvida ou ausencia explicita de tentativa, replay usado ou nao usado, os tres vereditos semanticos, `confidence`, `evidence_sufficiency`, `causal_surface`, decisao final, razao curta, caminho do dossier local ou referencia equivalente, `ticket_path` quando houver publication e a proxima acao recomendada; testes garantem ausencia de transcript, `workflow_debug`, `db_payload` e payloads brutos no trace do runner.
- Requisito/RF/CA coberto: validacao manual herdada de rastreabilidade operacional do trace minimizado
- Evidencia observavel: o aceite do ticket registra explicitamente uma validacao manual redigida, feita sobre uma rodada ou fixture representativa, confirmando que o trace minimizado do runner permite auditar `publication_status`, `overall_outcome`, gates, refs/paths/hashes/contagens e proxima acao sem exigir abertura imediata do `dossier` local; esse registro identifica qual execucao foi avaliada, qual foi o resultado da validacao e quais ajustes no trace/resumo foram necessarios antes do fechamento.
- Requisito/RF/CA coberto: fronteira de ownership do pacote derivado
- Evidencia observavel: os closure criteria do ticket deixam explicito que wiring de comandos/status/cancel e capability concreta do piloto continuam nos tickets irmaos, sem duplicar coverage editorialmente.

## Decision log
- 2026-04-03 - Ticket aberto na triagem inicial da spec. Fronteira observavel: este ticket concentra contrato, gates mecanicos e publication; `2026-04-03-target-investigate-case-runner-control-plane-gap.md` fica com control-plane/status/cancel; `2026-04-03-target-investigate-case-pilot-capability-gap.md` fica com manifesto e ticket causal do piloto.
- 2026-04-03 17:15Z - Validacao final do ExecPlan concluiu `NO_GO`.
  - Motivo: o changeset atual materializa manifesto, schemas, matriz de combinacoes, engine runner-side de publication e helpers puros de summary/trace com cobertura local, mas o branch ainda nao possui wiring observavel em `src/core/runner.ts`, `src/integrations/telegram-bot.ts` ou `src/integrations/workflow-trace-store.ts` para satisfazer os closure criteria de UX guiada, resumo final do Telegram, trace persistido e validacao final do pacote no flow real.
  - Pendencias principais transferidas para follow-up:
    - plugar o pacote `target-investigate-case` ao flow real sem criar control-plane paralelo ao ticket irmao;
    - tornar observavel a normalizacao equivalente da UX guiada do Telegram para os mesmos seletores canonicos;
    - persistir trace minimizado e resumo final via superficies reais do runner/Telegram;
    - registrar a validacao redigida do trace minimizado em fixture ou rodada representativa apos o wiring.

## Closure
- Closed at (UTC): 2026-04-03 17:15Z
- Closure reason: split-follow-up
- Related PR/commit/execplan: ExecPlan `execplans/2026-04-03-target-investigate-case-contract-and-publication-gap.md`; commit pertencente ao mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): tickets/open/2026-04-03-target-investigate-case-contract-package-wiring-gap.md
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
- Resultado final do fechamento: `NO_GO`
- Checklist aplicado: releitura do diff atual, do ticket, do ExecPlan, da spec de origem, de `docs/workflows/target-project-compatibility-contract.md` e de `docs/workflows/codex-quality-gates.md`, com validacao objetiva de cada closure criterion antes da decisao final.
- Evidencia objetiva por closure criterion:
  - `RF-03`, `RF-04`, `RF-05`, `CA-02`: `docs/workflows/target-case-investigation-manifest.json` foi criado com capability fixa `case-investigation`; `src/types/target-investigate-case.ts` e `src/core/target-investigate-case.ts` codificam o caminho canonico e o loader sem heuristica; `src/core/target-investigate-case.test.ts` cobre manifesto valido, ausente, JSON invalido e capability divergente. Resultado: `parcial`, porque a descoberta ainda nao esta plugada a um flow real do runner.
  - `RF-06..RF-18`, `CA-03`, `CA-04`, `CA-06`, `CA-07`, `CA-10`: `src/types/target-investigate-case.ts` codifica os enums finitos, schemas de `case-resolution.json`, `evidence-bundle.json`, `assessment.json` e `publication-decision.json`, alem da matriz `TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS`; `src/core/target-investigate-case.ts` implementa parser do comando canonico, normalizacao de seletores e validacoes de consistencia; `src/core/target-investigate-case.test.ts` cobre os membros aceitos dos enums, rejeicao fora do conjunto e combinacoes invalidas. Resultado: `parcial`, porque a equivalencia com UX guiada do Telegram e o trace local real ainda nao ficaram observaveis fora do modulo novo.
  - `RF-19..RF-35`, `CA-08`, `CA-09`, `CA-13`, `CA-14`: `src/core/target-investigate-case.ts` aplica gates mecanicos, thresholds, vetos anti-overfit, `runner-limitation`, no-op local e publication positiva com `ticketPublisher` injetavel; `src/core/target-investigate-case.test.ts` cobre os caminhos `no-real-gap`, `blocked_by_policy`, `ticket-published`, `sufficient` com e sem conflito normativo e `runner-limitation`. Resultado: `parcial`, porque esse comportamento ainda nao esta integrado ao lifecycle real do runner nem ao publisher real do flow.
  - `RF-37..RF-41`, `CA-11`, `CA-15`: o changeset adiciona apenas helpers puros `buildTargetInvestigateCaseTracePayload`, `buildTargetInvestigateCaseFinalSummary` e `renderTargetInvestigateCaseFinalSummary` em `src/core/target-investigate-case.ts`, com asserts negativos locais contra `workflow_debug`, `db_payload` e `transcript`; `rg -n "targetInvestigateCase|target-investigate-case|target_investigate_case|case-investigation" src/core src/integrations src/types` mostra que `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `src/integrations/workflow-trace-store.ts` ainda nao consomem esse pacote. Resultado: `nao atendido`.
  - Validacao manual herdada do trace minimizado: nao existe no ticket fechado um registro de validacao redigida sobre rodada ou fixture representativa apos wiring real do flow; o branch atual so oferece validacao automatizada do modulo novo. Resultado: `nao atendido`.
  - Fronteira de ownership do pacote derivado: o diff ficou restrito a `docs/workflows/target-case-investigation-manifest.json`, `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts` e `src/core/target-investigate-case.test.ts`; nao houve alteracao em `../guiadomus-matricula/**` nem criacao de control-plane paralelo. Resultado: `atendido`.
- Validacoes executadas:
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/target-investigate-case.test.ts`
  - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - `rg -n "targetInvestigateCase|target-investigate-case|target_investigate_case|case-investigation" src/core src/integrations src/types`
- Causa-raiz registrada: `ticket`
- Escopo da remediacao: `local`
- Gatilho de desbloqueio do follow-up: aterragem do scaffold de `target-investigate-case` no ticket irmao `tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`, para que o pacote contratual atual possa ser plugado sem criar superficie paralela.
