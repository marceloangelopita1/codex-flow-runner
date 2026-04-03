# [TICKET] Preparar a capability investigativa e o ticket causal do piloto guiadomus-matricula

## Metadata
- Status: open
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-04-03 16:11Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): spec-triage
- Active project (when applicable): guiadomus-matricula
- Target repository (when applicable): guiadomus-matricula
- Request ID: n/a - triagem local da spec
- Source spec (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-05 (manifesto populado no piloto), RF-09, RF-24, RF-25, RF-26, RF-43, RF-44, RF-45; CA-12, CA-17. Membros explicitos preservados: bloco `## Investigacao Causal` com `Resolved case`, `Resolved attempt`, `Investigation inputs`, `Replay used`, `Verdicts`, `Confidence and evidence sufficiency`, `Causal surface`, `Generalization basis`, `Overfit vetoes considered`, `Publication decision`; perfil minimo de replay com `updateDb=false`, `requestId` dedicado, replay explicito, `includeWorkflowDebug=true` apenas quando seguro, policy declarada de cache/purge, proibicao de mutacoes nao essenciais, sem versionamento automatico de artefatos brutos, namespace local separado.
- Inherited assumptions/defaults (when applicable): no piloto `../guiadomus-matricula`, parte relevante dos casos so fecha causalidade com replay seguro porque `workflow_debug` historico e opt-in; o piloto deve reutilizar o template interno atual sem criar template novo em v1; manifesto, docs, prompts operacionais e scripts auxiliares da capability investigativa precisam ficar separados da superficie de runtime do produto.
- Inherited RNFs (when applicable): coleta e replay deterministas; sem versionamento default de material sensivel ou bruto; rastreabilidade local suficiente para investigacao causal; fluxo sequencial.
- Inherited technical/documentary constraints (when applicable): a capability do piloto nao pode morar em `extractors/workflows/**` nem em prompts de runtime; purge precisa ser estritamente scoped e auditavel; a secao `## Investigacao Causal` deve manter heading e ordem estaveis.
- Inherited pending/manual validations (when applicable): confirmar no piloto quais superficies historicas realmente permitem fechar causalidade sem replay em casos passados; confirmar quais workflows internos alem dos workflows publicos devem ser declarados como investigaveis; validar a politica de retencao e o caminho local do dossier por capability no projeto alvo; validar a politica de replay seguro e purge scoped no piloto; validar a evolucao do template interno para suportar `## Investigacao Causal` com ordem fixa.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md
  - ../guiadomus-matricula/docs/workflows/target-prepare-manifest.json
  - ../guiadomus-matricula/tickets/templates/internal-ticket-template.md
  - tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): mesmo com o runner pronto, o piloto ancorado na spec continuaria sem capability investigativa explicitamente publicavel e sem bloco de ticket causal reproduzivel, impedindo a validacao end-to-end do desenho.

## Context
- Workflow area: capability investigativa do projeto alvo / manifesto local / ticket template do piloto
- Scenario: a spec ancora o desenho no piloto `../guiadomus-matricula`, que ja possui superficies relevantes (`workflow_debug`, requestId, runbook, output local), mas ainda nao expos a capability investigativa contratualizada.
- Input constraints: este ticket cobre apenas o piloto e sua superficie local; o runner canonico e seus gates ficam nos tickets irmaos.

## Problem statement
O piloto `../guiadomus-matricula` ainda nao possui `docs/workflows/target-case-investigation-manifest.json`, nao declarou quais workflows internos sao investigaveis por essa capability, nao materializou a policy de replay/purge para investigacao causal e nao estendeu seu template interno com o bloco estavel `## Investigacao Causal`. Sem isso, o runner nao tem uma capability concreta para consumir nem consegue publicar ticket causal consistente quando `Source: production-observation`.

## Observed behavior
- O que foi observado:
  - `../guiadomus-matricula/docs/workflows/` contem apenas `discover-spec.md`, `target-prepare-manifest.json`, `target-prepare-report.md` e `target-project-compatibility-contract.md`; nao existe `target-case-investigation-manifest.json`.
  - `../guiadomus-matricula/tickets/templates/internal-ticket-template.md` nao possui secao `## Investigacao Causal` nem os subtitulos obrigatorios da spec.
  - `../guiadomus-matricula/README.md` e `../guiadomus-matricula/docs/local-function-runbook.md` ja descrevem `updateDb`, `includeWorkflowDebug`, `x-request-id` e uso de `workflow_debug`, mas isso ainda nao esta consolidado como capability investigativa versionada e separada da superficie de runtime.
  - o piloto ainda mantem superficies de runtime em `../guiadomus-matricula/extractors/workflows/**` e `../guiadomus-matricula/prompts`, o que reforca a necessidade de manter manifesto/docs/prompts investigativos fora dessas arvores.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura estatica de `../guiadomus-matricula/docs/workflows/`, `../guiadomus-matricula/tickets/templates/internal-ticket-template.md`, `../guiadomus-matricula/README.md`, `../guiadomus-matricula/docs/local-function-runbook.md` e inventario de diretorios do piloto.

## Expected behavior
O piloto deve expor uma capability `case-investigation` consumivel pelo runner, com manifesto local canonico, docs/prompts/scripts auxiliares fora da superficie de runtime, replay/purge scoped declarados e secao `## Investigacao Causal` automatizavel no template interno atual.

## Reproduction steps
1. Executar `find ../guiadomus-matricula/docs/workflows -maxdepth 1 -type f | sort` e confirmar a ausencia de `target-case-investigation-manifest.json`.
2. Ler `../guiadomus-matricula/tickets/templates/internal-ticket-template.md` e confirmar que nao existe `## Investigacao Causal`.
3. Ler `../guiadomus-matricula/README.md` e `../guiadomus-matricula/docs/local-function-runbook.md` para verificar que `updateDb=false`, `includeWorkflowDebug` e `x-request-id` existem como superfices operacionais, mas ainda sem manifesto/capability investigativa dedicada.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `../guiadomus-matricula/docs/workflows/`: capability investigativa ausente.
  - `../guiadomus-matricula/tickets/templates/internal-ticket-template.md`: template atual sem bloco causal.
  - `../guiadomus-matricula/docs/local-function-runbook.md`: recomenda `includeWorkflowDebug=true` e `x-request-id` unico por run, o que mostra superficie de replay/trace reutilizavel, mas ainda nao empacotada na capability desejada.
- Comparativo antes/depois (se houver): antes = piloto preparado apenas para onboarding/readiness e runtime comum; depois esperado = piloto com manifesto investigativo, policy declarada e ticket causal automatizavel.

## Impact assessment
- Impacto funcional: o piloto nao consegue sustentar a capability `case-investigation` exigida pela spec nem produzir ticket causal no formato esperado.
- Impacto operacional: a investigacao continua dependente de runbook e julgamento manual ad hoc, sem manifesto canonicamente consumivel pelo runner.
- Risco de regressao: medio, porque a entrega toca documentacao operacional, manifesto, template de ticket e possivelmente scripts auxiliares no repositorio alvo.
- Scope estimado (quais fluxos podem ser afetados): `../guiadomus-matricula/docs/workflows/*`, `../guiadomus-matricula/docs/local-function-runbook.md`, `../guiadomus-matricula/README.md`, `../guiadomus-matricula/tickets/templates/internal-ticket-template.md` e eventuais prompts/scripts auxiliares da capability.

## Initial hypotheses (optional)
- A menor entrega segura e versionar um manifesto especifico da capability, referenciando seletivamente as superficies locais ja existentes (`requestId`, `workflow_debug`, cache/purge, output local`) e estender o template atual com o bloco causal obrigatorio.

## Proposed solution (optional)
- Criar `docs/workflows/target-case-investigation-manifest.json` no piloto, registrar workflows investigaveis, selectors e politicas de replay/purge/dossier, mover instrucoes operacionais da capability para docs/prompts/scripts dedicados fora da runtime tree e adaptar o template interno atual com `## Investigacao Causal`.

## Closure criteria
- Requisito/RF/CA coberto: RF-05, RF-09, RF-45
- Evidencia observavel: `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json` existe e declara selectors aceitos, workflows investigaveis, resolucao de caso/tentativa, superfices de evidencia, estrategias/consultas/comandos permitidos, schemas de saida, policy de replay, policy de retencao/sensibilidade do dossier e o caminho local canonico do dossier por capability, docs/prompts/scripts auxiliares e precedencia customizavel apenas nas camadas 4-6, sem morar em `extractors/workflows/**` nem em prompts de runtime; a validacao manual explicita confirma que o caminho local escolhido para o dossier e sua retencao sao compatveis com a capability investigativa do piloto.
- Requisito/RF/CA coberto: RF-24, RF-25, RF-26, CA-12
- Evidencia observavel: o manifesto e a documentacao do piloto tornam observavel o perfil minimo de replay seguro (`updateDb=false`, `requestId` dedicado, replay explicito, `includeWorkflowDebug` somente quando seguro, cache/purge declarados, proibicao de mutacoes nao essenciais, namespace local separado e sem versionamento automatico de artefatos brutos), com cobertura documental positiva dos membros aceitos.
- Requisito/RF/CA coberto: RF-43, RF-44, CA-17
- Evidencia observavel: `../guiadomus-matricula/tickets/templates/internal-ticket-template.md` ou o renderer equivalente do piloto mantem o template interno atual e passa a exigir o bloco `## Investigacao Causal` com heading/ordem estaveis e preenchimento automatizavel para `Source: production-observation`.
- Requisito/RF/CA coberto: validacoes pendentes/manuais herdadas da spec
- Evidencia observavel: o ticket ou seus artefatos de aceite registram explicitamente quais workflows internos alem dos publicos foram declarados como investigaveis, quais superfices historicas ainda fecham causalidade sem replay, qual caminho local de dossier por capability foi validado, qual politica real de retencao foi aceita para esse dossier e qual politica real de purge scoped foi validada no piloto.

## Decision log
- 2026-04-03 - Ticket aberto na triagem inicial da spec. Fronteira observavel: este ticket cobre somente a capability concreta do piloto e o template causal; o runner canonico e seus gates permanecem nos tickets irmaos do mesmo pacote.

## Closure
- Closed at (UTC):
- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up
- Related PR/commit/execplan:
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
