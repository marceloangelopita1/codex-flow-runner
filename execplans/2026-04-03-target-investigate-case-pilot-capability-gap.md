# ExecPlan - Preparar a capability investigativa e o ticket causal do piloto guiadomus-matricula

## Purpose / Big Picture
- Objetivo: materializar no `../guiadomus-matricula` a capability local `case-investigation` consumivel pelo runner, sem tocar control-plane do runner nem prompts de runtime, via manifesto canonico, docs/prompt-template/scripts operacionais separados, policy de replay/purge/dossier e bloco causal no template interno atual.
- Resultado esperado:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json` existe e declara o contrato machine-readable da capability no piloto;
  - o dossier local da capability fica em `../guiadomus-matricula/output/case-investigation/<request-id>/`, separado de `output/local-runs/` e nao versionado por default;
  - a capability passa a apontar para docs, prompt-template operacional e scripts auxiliares fora de `extractors/workflows/**` e fora de `prompts/`;
  - `../guiadomus-matricula/tickets/templates/internal-ticket-template.md` mantem o template atual e ganha o bloco obrigatorio `## Investigacao Causal` com ordem estavel para `Source: production-observation`;
  - existe validacao observavel, automatizada e manual, cobrindo manifesto, replay/purge seguro, template causal e nota de aceite herdada da spec.
- Escopo:
  - manifesto local da capability no piloto;
  - documentacao operacional do piloto para investigacao causal, incluindo dossier local, replay, purge scoped e superficies historicas;
  - bloco `## Investigacao Causal` no template interno atual, sem template novo;
  - validacao dirigida do contrato via teste local e nota manual de aceite.
- Fora de escopo:
  - qualquer alteracao no runner, no control-plane de `/target_investigate_case` ou nos gates mecanicos de publication ja cobertos pelos tickets irmaos fechados;
  - promover `extract_construction_timeline_v1` ao contrato HTTP publico do piloto;
  - criar prompts de runtime em `prompts/` ou material da capability em `extractors/workflows/**`;
  - corrigir gaps semanticos dos workflows do piloto; este ticket cobre capability, manifesto, policy e template causal.

## Progress
- [x] 2026-04-03 18:12Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, dos tickets irmaos fechados e das referencias do piloto (`README.md`, `docs/local-function-runbook.md`, `docs/workflows/target-prepare-manifest.json`, `tickets/templates/internal-ticket-template.md`, `index.js`, `utils/extractor-registry.js`, `scripts/repo-hygiene-cleanup.js`).
- [x] 2026-04-03 18:29Z - Manifesto local, docs operacionais e template causal implementados no `../guiadomus-matricula`.
- [x] 2026-04-03 18:30Z - Validacao automatizada dirigida do contrato do piloto concluida com `node --test tests/scripts/target-case-investigation-capability.test.js`.
- [x] 2026-04-03 18:33Z - Validacao manual do dossier, replay/purge scoped e nota de aceite herdada da spec registrada em `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md` e em `../guiadomus-matricula/output/case-investigation/case_inv_pilot_20260403_183200/validation.summary.json`.
- [x] 2026-04-03 18:38Z - Fechamento tecnico revalidado; ticket classificado como `GO`, movido para `tickets/closed/` e preparado para versionamento posterior pelo runner.

## Surprises & Discoveries
- 2026-04-03 18:12Z - `../guiadomus-matricula/output/` inteiro ja e ignorado por git, mas `scripts/repo-hygiene-cleanup.js` remove apenas `output/local-runs/<root-item>`; manter o dossier da capability em `output/case-investigation/` evita colisao com a limpeza automatica atual e satisfaz o namespace local separado exigido pela spec.
- 2026-04-03 18:12Z - O inventario atual do piloto e finito e explicito em `../guiadomus-matricula/utils/extractor-registry.js`: seis workflows `supported` e um workflow `implemented_but_unsupported` (`extract_construction_timeline_v1`), o que permite um allowlist investigativo observavel e sem heuristica.
- 2026-04-03 18:12Z - O piloto ja expoe as superficies operacionais relevantes para replay causal (`x-request-id`, `updateDb`, `includeWorkflowDebug`, endpoint de purge scoped, `output/local-runs`, sidecar de `workflow_debug`), mas isso ainda esta espalhado em README/runbook e nao consolidado em uma capability versionada.
- 2026-04-03 18:12Z - O template interno atual e enxuto; a forma mais segura de cumprir RF-43/RF-44 sem criar drift e estender esse mesmo arquivo com um bloco causal fixo, nao abrir um segundo template.
- 2026-04-03 18:32Z - O shell local desta execucao nao possui `curl`; a validacao manual dos endpoints HTTP locais precisou usar `node` 24 com `fetch`, preservando o mesmo contrato `POST /` e `POST /_meta/cache/purge-extractors`.
- 2026-04-03 18:32Z - O preview real do purge com `pdfFileName` + `matriculaNumber` retornou `scope: identifiers`, sem warnings e sem qualquer indicio de purge global, o que permitiu validar a policy scoped mesmo sem `propertyId`.

## Decision Log
- 2026-04-03 - Decisao: usar `output/case-investigation/<request-id>/` como caminho local canonico do dossier da capability.
  - Motivo: `/output` ja e gitignored, enquanto `output/local-runs` fica sob cleanup automatico; separar o dossier da capability evita remocao acidental e satisfaz o requisito de namespace local separado.
  - Impacto: manifesto, docs e nota manual de aceite precisam declarar explicitamente a retencao/sensibilidade desse namespace e sua relacao com `cleanup:repo-hygiene`.
- 2026-04-03 - Decisao: o allowlist inicial de workflows investigaveis sera derivado do registry atual do piloto e preservara os membros explicitos.
  - Motivo: o ticket exige enumeracao finita observavel; hoje o piloto expoe exatamente `extract_address`, `extract_condominium_info`, `extract_inscricao_municipal`, `extract_matricula_risks_v2`, `extract_unit_description_structured_v1`, `extract_value_timeline_v1` e `extract_construction_timeline_v1`.
  - Impacto: qualquer workflow fora desse conjunto continua fora da capability ate revisao explicita do registry e do manifest; isso cobre positivamente os aceitos e negativamente o resto do inventario atual.
- 2026-04-03 - Decisao: os artefatos auxiliares de prompt/template da capability ficarao em `docs/workflows/`, nao em `prompts/` nem em `external_prompts/`.
  - Motivo: a spec/ticket vedam misturar a capability com prompts de runtime, e `external_prompts/` e reservado a requests/responses para IA externa, nao a templates operacionais locais.
  - Impacto: o manifest precisa apontar para markdowns dedicados em `docs/workflows/` para runbook e template causal, mantendo a capability fora da superficie de runtime.
- 2026-04-03 - Decisao: o template interno continuara unico e passara a conter sempre o bloco `## Investigacao Causal`, com instrucao de obrigatoriedade para `Source: production-observation`.
  - Motivo: RF-43 veta template novo em v1 e RF-44 exige heading e ordem estaveis.
  - Impacto: a validacao automatizada deve provar a ordem exata dos subtitulos e a ausencia de template paralelo em `tickets/templates/`.
- 2026-04-03 - Decisao: manter `includeWorkflowDebug=false` na validacao manual observavel desta rodada.
  - Motivo: o caso local usado para validar o fluxo (`8555540138269.pdf`) nao foi tratado como fixture previamente aprovada para transcript e `db_payload`; o objetivo desta rodada era validar dossier, `updateDb=false`, `x-request-id` dedicado e purge scoped sem expandir a superficie sensivel.
  - Impacto: a nota de aceite do piloto reforca `workflow_debug` como opt-in apenas para fixtures redatadas/sinteticas ou sandbox local explicitamente seguro.
- 2026-04-03 - Decisao: aceitar `node`/`fetch` como substituto operacional de `curl` nesta execucao manual.
  - Motivo: o shell local nao possui `curl`, mas o contrato validado e puramente HTTP local; `fetch` em Node 24 exercita o mesmo endpoint e permitiu salvar request/response/headers no dossier sem mudar o escopo do ticket.
  - Impacto: a evidencia manual desta rodada permanece valida e auditavel, mas o ambiente continua dependendo de `node` para esse passo ate que `curl` exista no host.
- 2026-04-03 - Decisao: fechar o ticket como `GO` sem follow-up.
  - Motivo: manifesto, runbook, template causal, teste dirigido e nota manual de aceite cobrem integralmente os closure criteria e os membros explicitos herdados da spec/ticket.
  - Impacto: o repositorio fica pronto para um unico changeset de fechamento/versionamento pelo runner, sem pendencia funcional residual neste ticket.

## Outcomes & Retrospective
- Status final: execucao concluida no piloto, com validacao automatizada e manual registradas; ticket classificado como `GO` e fechado em `tickets/closed/`.
- O que funcionou: o manifesto machine-readable, os docs auxiliares fora do runtime, o bloco causal no template interno e o teste dirigido cobriram o allowlist, as camadas 4-6, o perfil minimo de replay seguro e a ausencia de template paralelo; a rodada manual confirmou dossier local dedicado e purge scoped observavel.
- O que ficou pendente: nenhum blocker tecnico novo neste ticket; commit/push continuam fora de escopo e ficam sob responsabilidade do runner apos esta etapa.
- Proximos passos: versionar em um unico changeset o ExecPlan e o ticket fechado, junto com o changeset do piloto `../guiadomus-matricula`, preservando o dossier local apenas como evidencia nao versionada.

## Context and Orientation
- Repositorio alvo da execucao: `/home/mapita/projetos/guiadomus-matricula`
- Superficies atuais relevantes:
  - `../guiadomus-matricula/docs/workflows/target-prepare-manifest.json`
  - `../guiadomus-matricula/README.md`
  - `../guiadomus-matricula/docs/local-function-runbook.md`
  - `../guiadomus-matricula/tickets/templates/internal-ticket-template.md`
  - `../guiadomus-matricula/index.js`
  - `../guiadomus-matricula/utils/extractor-registry.js`
  - `../guiadomus-matricula/tests/utils/extractor-registry.test.js`
  - `../guiadomus-matricula/scripts/repo-hygiene-cleanup.js`
  - `../guiadomus-matricula/scripts/build-golden-workflow-debug-sidecar.js`
- Superficies novas esperadas ao final:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-causal-ticket-template.md`
  - `../guiadomus-matricula/tests/scripts/target-case-investigation-capability.test.js`
- Spec de origem: `docs/history/target-investigate-case/2026-04-03-pre-v2-foundation.md`
- Ticket de origem: `tickets/closed/2026-04-03-target-investigate-case-pilot-capability-gap.md`
- RFs/CAs cobertos por este plano:
  - RF-05, RF-09, RF-24, RF-25, RF-26, RF-43, RF-44, RF-45
  - CA-12, CA-17
  - validacoes pendentes/manuais herdadas da spec incorporadas ao ticket: workflows internos investigaveis alem dos publicos; superficies historicas que fecham causalidade sem replay; caminho/retencao do dossier por capability; politica real de purge scoped; evolucao do template interno para ordem fixa.
- Fronteira de ownership deste plano:
  - este plano cobre somente a capability concreta do piloto `../guiadomus-matricula`, o manifesto local, a policy de replay/purge/dossier, os artefatos operacionais auxiliares e o bloco causal do template interno;
  - `tickets/closed/2026-04-03-target-investigate-case-runner-control-plane-gap.md` ja cobriu control-plane, status/cancel e traces do runner;
  - `tickets/closed/2026-04-03-target-investigate-case-contract-and-publication-gap.md` ja cobriu contrato runner-side, enums, gates mecanicos e publication.
- Assumptions / defaults adotados:
  - o caminho canonico inicial do manifest permanece `docs/workflows/target-case-investigation-manifest.json`, descoberto sem heuristica pelo runner;
  - o dossier da capability fica em `output/case-investigation/<request-id>/`, separado de `output/local-runs/` e nao versionado por default;
  - o piloto pode reaproveitar superficies ja existentes (`README.md`, `docs/local-function-runbook.md`, `index.js`, `scripts/build-golden-workflow-debug-sidecar.js`, `scripts/repo-hygiene-cleanup.js`, `scripts/start-functions-framework.js`) como auxiliares, desde que o manifest e os docs dedicados tornem isso explicito;
  - o template interno atual sera estendido in place, sem template novo;
  - o allowlist inicial de workflows investigaveis ficara restrito ao inventario atual do registry do piloto; qualquer expansao futura exige mudanca explicita do manifest e da validacao.
- Membros explicitos / allowlists finitas que nao podem ser consolidados genericamente:
  - Seletores aceitos do piloto no manifest:
    - `propertyId`
    - `requestId`
    - `workflow`
    - `window`
    - `runArtifact`
  - Workflows investigaveis iniciais do piloto:
    - `extract_address`
    - `extract_condominium_info`
    - `extract_inscricao_municipal`
    - `extract_matricula_risks_v2`
    - `extract_unit_description_structured_v1`
    - `extract_value_timeline_v1`
    - `extract_construction_timeline_v1`
  - Subtitulos obrigatorios do bloco `## Investigacao Causal`, nesta ordem:
    - `Resolved case`
    - `Resolved attempt`
    - `Investigation inputs`
    - `Replay used`
    - `Verdicts`
    - `Confidence and evidence sufficiency`
    - `Causal surface`
    - `Generalization basis`
    - `Overfit vetoes considered`
    - `Publication decision`
  - Perfil minimo de replay seguro a tornar observavel, sem consolidacao:
    - `updateDb=false`
    - `requestId` dedicado da investigacao
    - replay explicitamente declarado nos artefatos e no resumo
    - `includeWorkflowDebug=true` apenas quando seguro
    - politica declarada de cache/purge
    - proibicao de mutacoes nao essenciais fora do contrato
    - proibicao de versionamento automatico de artefatos brutos do replay
    - proibicao de alteracoes em Mongo, tickets, docs ou git durante replay
    - namespace local separado da operacao normal
    - execucao apenas por superficies declaradas no manifest
  - Identificadores aceitos hoje pelo purge scoped do piloto, a preservar explicitamente se o manifest referenciar o endpoint atual:
    - `propertyId`
    - `pdfFileName`
    - `matriculaNumber`
    - `transcriptHint`
  - Camadas customizaveis permitidas no manifest, apenas nas posicoes 4-6:
    - decisoes explicitas ainda vigentes e nao superseded
    - goldens e testes alinhados ao contrato atual
    - evidencia historica do caso e replay investigativo
  - Justificativa objetiva da enumeracao de workflows: o conjunto acima cobre positivamente todo o inventario atual de workflows do piloto em `utils/extractor-registry.js` e cobre negativamente o restante por exclusao explicita, sem promover chaves fora do registry.
- Fluxo atual relevante:
  - `README.md` e `docs/local-function-runbook.md` ja documentam `updateDb`, `includeWorkflowDebug`, `x-request-id`, `output/local-runs` e o endpoint `/_meta/cache/purge-extractors`;
  - `index.js` aceita `x-request-id`, `updateDb`, `includeWorkflowDebug` e o purge scoped com identificadores finitos;
  - `scripts/repo-hygiene-cleanup.js` remove apenas `output/local-runs/<root-item>`, `plans/*.md` e `tickets/closed/*.md`, nao todo `output/`;
  - o template interno atual nao contem nenhum bloco causal.
- Restricoes tecnicas/documentais:
  - nao criar artefatos da capability em `extractors/workflows/**` nem em `prompts/prompts.js`;
  - nao alterar o contrato HTTP publico para tornar `extract_construction_timeline_v1` selecionavel;
  - nao versionar dossier nem artefatos brutos por default;
  - toda validacao manual precisa virar nota explicita no ticket fechado ou em artefato de aceite equivalente.

## Plan of Work
- Milestone 1: Definir o contrato local da capability `case-investigation` no piloto.
  - Entregavel: manifesto machine-readable com selectors aceitos, workflows investigaveis, resolucao de caso/tentativa, superficies de evidencia, estrategias/comandos/templates permitidos, outputs por fase, policy de replay, retencao/sensibilidade do dossier, docs/templates/scripts auxiliares, precedencia 4-6 e politica local de ticket/publication.
  - Evidencia de conclusao: `docs/workflows/target-case-investigation-manifest.json` existe, parseia sem erro e a validacao dirigida comprova explicitamente os membros aceitos e a rejeicao de membros fora do conjunto.
  - Arquivos esperados: `docs/workflows/target-case-investigation-manifest.json`, `tests/scripts/target-case-investigation-capability.test.js`
- Milestone 2: Externalizar a superficie operacional investigativa fora do runtime.
  - Entregavel: documentacao dedicada da capability no piloto, com namespace local do dossier, policy de retencao/sensibilidade, replay/purge scoped, artefatos esperados e template causal operacional, tudo fora de `extractors/workflows/**` e de `prompts/`.
  - Evidencia de conclusao: `README.md`, `docs/local-function-runbook.md` e novos markdowns em `docs/workflows/` apontam para o mesmo namespace local, os mesmos guardrails de replay/purge e os mesmos scripts auxiliares, sem criar dependencia de runtime prompt.
  - Arquivos esperados: `README.md`, `docs/local-function-runbook.md`, `docs/workflows/target-case-investigation-runbook.md`, `docs/workflows/target-case-investigation-causal-ticket-template.md`
- Milestone 3: Tornar o ticket causal do piloto automatizavel e estavel.
  - Entregavel: `tickets/templates/internal-ticket-template.md` mantem o template atual, mas passa a conter `## Investigacao Causal` com os 10 subtitulos obrigatorios em ordem fixa e instrucao clara de obrigatoriedade para `Source: production-observation`.
  - Evidencia de conclusao: validacao dirigida comprova heading, ordem, compatibilidade com o template atual e ausencia de template paralelo.
  - Arquivos esperados: `tickets/templates/internal-ticket-template.md`, `tests/scripts/target-case-investigation-capability.test.js`
- Milestone 4: Registrar a validacao manual herdada da spec.
  - Entregavel: nota de aceite redigida explicando quais workflows internos alem dos publicos foram declarados como investigaveis, quais superficies historicas ainda fecham causalidade sem replay, qual caminho/retencao do dossier foi aceito e qual policy real de purge scoped foi validada.
  - Evidencia de conclusao: `Progress`, `Decision Log`, `Outcomes & Retrospective` deste ExecPlan e o ticket fechado apontam explicitamente a rodada/inspecao manual usada, o resultado e qualquer ajuste residual.
  - Arquivos esperados: este ExecPlan atualizado, ticket fechado correspondente e, se necessario, nota curta adicional em `docs/workflows/target-case-investigation-runbook.md`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Rodar `find docs/workflows -maxdepth 1 -type f | sort`, `sed -n '1,240p' tickets/templates/internal-ticket-template.md`, `sed -n '1,320p' README.md` e `sed -n '1,260p' docs/local-function-runbook.md` para revalidar o estado inicial antes de editar.
2. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Ler `utils/extractor-registry.js`, `tests/utils/extractor-registry.test.js`, `index.js` e `scripts/repo-hygiene-cleanup.js` para fixar o inventario real de workflows, os identificadores atuais de purge scoped e o namespace local que nao conflita com cleanup.
3. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Criar `docs/workflows/target-case-investigation-manifest.json` com, no minimo:
   - capability fixa `case-investigation`;
   - selectors aceitos `propertyId`, `requestId`, `workflow`, `window`, `runArtifact`;
   - workflows investigaveis explicitos do conjunto aprovado;
   - resolucao de caso e tentativa;
   - superficies de evidencia, queries/comandos/templates permitidos e outputs por fase;
   - policy de replay com o perfil minimo completo;
   - policy de purge scoped com os identificadores aceitos, ou justificativa objetiva se algum for excluido;
   - `dossier_local_path` canonico sob `output/case-investigation/<request-id>/`;
   - retencao/sensibilidade do dossier;
   - docs/templates/scripts auxiliares fora de runtime;
   - precedencia customizavel apenas nas camadas 4-6;
   - politica local de ticket/publication.
4. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Criar `docs/workflows/target-case-investigation-runbook.md` descrevendo:
   - quando investigar por evidencia historica vs. quando escalar para replay seguro;
   - como usar `x-request-id` dedicado, `updateDb=false` e `includeWorkflowDebug` apenas quando seguro;
   - onde o dossier local e criado e como ele deve ser tratado;
   - como usar o purge scoped em `dryRun` antes de qualquer limpeza efetiva;
   - quais superficies historicas do piloto podem encerrar causalidade sem replay.
5. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Criar `docs/workflows/target-case-investigation-causal-ticket-template.md` com o template operacional que servira de fonte para preencher o bloco `## Investigacao Causal`, mantendo essa superficie fora de `prompts/` e de `extractors/workflows/**`.
6. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Atualizar `README.md` e `docs/local-function-runbook.md` para apontar para a capability `case-investigation`, documentar o namespace `output/case-investigation/`, os guardrails de replay/purge e a relacao com os scripts auxiliares ja existentes (`scripts/build-golden-workflow-debug-sidecar.js`, `scripts/repo-hygiene-cleanup.js`, `scripts/start-functions-framework.js`).
7. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Atualizar `tickets/templates/internal-ticket-template.md` adicionando `## Investigacao Causal` com os 10 subtitulos obrigatorios em ordem fixa, mantendo o restante do template atual e deixando explicito que o preenchimento e obrigatorio para `Source: production-observation`.
8. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Criar `tests/scripts/target-case-investigation-capability.test.js` para validar de forma automatizada:
   - parse do manifest;
   - selectors aceitos;
   - workflows investigaveis explicitos e rejeicao fora do conjunto;
   - camadas de precedencia 4-6;
   - membros do perfil minimo de replay seguro;
   - identificadores de purge scoped declarados;
   - existencia dos docs/templates/scripts auxiliares referenciados;
   - heading e ordem do bloco `## Investigacao Causal` no template interno.
9. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js` para fechar a validacao automatizada do contrato do piloto.
10. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Rodar `rg -n "case-investigation|output/case-investigation|Investigacao Causal|updateDb=false|includeWorkflowDebug|x-request-id|purge-extractors" README.md docs/local-function-runbook.md docs/workflows/target-case-investigation-manifest.json docs/workflows/target-case-investigation-runbook.md docs/workflows/target-case-investigation-causal-ticket-template.md tickets/templates/internal-ticket-template.md` para conferir alinhamento textual das superficies alteradas.
11. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Validar manualmente a policy de purge scoped com um preview seguro: iniciar o app com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm start`, depois executar um `curl -sS -X POST http://localhost:8080/_meta/cache/purge-extractors` com `dryRun=true` e um identificador permitido, registrando que o endpoint continua scoped, auditavel e sem purge global.
12. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Validar manualmente o perfil minimo de replay seguro com uma rodada local controlada, usando um `x-request-id` dedicado, `updateDb=false` e `includeWorkflowDebug` apenas se a investigacao escolhida for segura, e armazenando os artefatos sob `output/case-investigation/<request-id>/`.
13. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Atualizar este ExecPlan e o ticket correspondente com a nota manual de aceite, deixando explicito:
   - quais workflows internos alem dos publicos foram declarados como investigaveis;
   - quais superficies historicas do piloto realmente fecham causalidade sem replay;
   - qual caminho/retencao do dossier foi aceito;
   - qual policy real de purge scoped foi validada;
   - se `includeWorkflowDebug` ficou permitido apenas em subconjuntos seguros e quais foram eles.
14. (workdir: `/home/mapita/projetos/guiadomus-matricula`) Se a execucao tiver adicionado qualquer JS alem do teste dirigido, rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` apenas como guardrail complementar; se o changeset ficar restrito a docs/template/teste dirigido, esse passo pode ser pulado sem afetar o aceite do ticket.

## Validation and Acceptance
- Regra de cobertura para allowlists/enumeracoes finitas deste ticket: nao ha consolidacao generica permitida para os subtitulos do bloco causal, o conjunto inicial de workflows investigaveis, o perfil minimo de replay seguro, os identificadores de purge scoped do endpoint atual ou as camadas customizaveis de precedencia 4-6. A prova de aceite deve citar os membros explicitos ou registrar, antes do fechamento, uma justificativa objetiva de exclusao/substituicao para algum membro.
- Matriz requisito -> validacao observavel derivada diretamente dos closure criteria do ticket:
  - Requisito: RF-05, RF-09, RF-45.
    - Evidencia observavel: `docs/workflows/target-case-investigation-manifest.json` existe e declara selectors aceitos `propertyId`, `requestId`, `workflow`, `window`, `runArtifact`; workflows investigaveis `extract_address`, `extract_condominium_info`, `extract_inscricao_municipal`, `extract_matricula_risks_v2`, `extract_unit_description_structured_v1`, `extract_value_timeline_v1`, `extract_construction_timeline_v1`; resolucao de caso/tentativa; superficies de evidencia; estrategias/queries/comandos/templates permitidos; schemas de saida por fase; policy de replay; retencao/sensibilidade do dossier; caminho local canonico `output/case-investigation/<request-id>/`; docs/templates/scripts auxiliares fora de `extractors/workflows/**` e de `prompts/`; precedencia customizavel apenas nas camadas 4-6; politica local de ticket/publication.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js`
    - Esperado: o teste parseia o manifest, confirma cada membro aceito acima e falha para workflow fora do conjunto ou caminho auxiliar apontando para `extractors/workflows/**` ou `prompts/`.
  - Requisito: RF-24, RF-25, RF-26, CA-12.
    - Evidencia observavel: o manifest e a documentacao tornam explicitos `updateDb=false`, `requestId` dedicado, replay declarado nos artefatos, `includeWorkflowDebug` apenas quando seguro, politica de cache/purge declarada, proibicao de mutacoes nao essenciais, proibicao de versionamento automatico de artefatos brutos, proibicao de alterar Mongo/tickets/docs/git durante replay, namespace local separado e execucao apenas por superficies declaradas; o purge scoped preserva explicitamente os identificadores aceitos `propertyId`, `pdfFileName`, `matriculaNumber`, `transcriptHint` e continua sem purge global.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js`
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm start`
    - Esperado: o teste automatizado comprova os membros explicitos do perfil minimo; a validacao manual registra um preview `dryRun` do purge scoped e uma rodada local controlada com `updateDb=false` e `x-request-id` dedicado, sem evidencia de purge global nem de mutacao/versionamento indevido.
  - Requisito: RF-43, RF-44, CA-17.
    - Evidencia observavel: `tickets/templates/internal-ticket-template.md` mantem o template interno atual e passa a conter `## Investigacao Causal` com os subtitulos `Resolved case`, `Resolved attempt`, `Investigation inputs`, `Replay used`, `Verdicts`, `Confidence and evidence sufficiency`, `Causal surface`, `Generalization basis`, `Overfit vetoes considered`, `Publication decision` exatamente nessa ordem, com instrucao de obrigatoriedade para `Source: production-observation` e sem criar template paralelo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; node --test tests/scripts/target-case-investigation-capability.test.js`
    - Comando: `rg -n "^## Investigacao Causal$|^### Resolved case$|^### Resolved attempt$|^### Investigation inputs$|^### Replay used$|^### Verdicts$|^### Confidence and evidence sufficiency$|^### Causal surface$|^### Generalization basis$|^### Overfit vetoes considered$|^### Publication decision$" tickets/templates/internal-ticket-template.md`
    - Esperado: o teste e o `rg` mostram a presenca do bloco e dos 10 subtitulos na ordem exata, sem segundo template em `tickets/templates/`.
  - Requisito: validacoes pendentes/manuais herdadas da spec.
    - Evidencia observavel: o aceite final registra explicitamente quais workflows internos alem dos publicos foram declarados como investigaveis, quais superficies historicas fecham causalidade sem replay, qual caminho local do dossier foi validado, qual retencao real foi aceita para esse dossier e qual policy real de purge scoped foi validada no piloto.
    - Comando: `rg -n "workflows investigaveis|superficies historicas|dossier|retencao|purge scoped" /home/mapita/projetos/codex-flow-runner/execplans/2026-04-03-target-investigate-case-pilot-capability-gap.md docs/workflows/target-case-investigation-runbook.md`
    - Esperado: antes do fechamento, existe texto explicito nesses artefatos registrando a decisao manual sobre os quatro itens acima; ausencia desse registro e `NO_GO`.
- Matriz `requisito -> validacao observavel` consolidada por fechamento:
  - RF-05/RF-09/RF-45 -> manifest canonico parseavel + allowlists explicitas de selectors/workflows + auxiliares fora do runtime + dossier local canonico fora de `output/local-runs`.
  - RF-24/RF-25/RF-26/CA-12 -> replay seguro e purge scoped documentados com membros explicitos e comprovados por teste dirigido + preview/manual run controlado.
  - RF-43/RF-44/CA-17 -> bloco `## Investigacao Causal` no template interno com ordem exata dos 10 subtitulos e obrigatoriedade para `Source: production-observation`.
  - Validacoes manuais herdadas -> nota de aceite registrando workflows internos, superficies historicas sem replay, caminho/retencao do dossier e policy de purge scoped validada.
- Guardrail complementar opcional, fora do aceite minimo:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: usar apenas se o changeset tocar JS alem do teste dirigido; verde sem regressao colateral.

## Idempotence and Recovery
- Idempotencia:
  - rerodar o teste dirigido do manifest/template deve produzir o mesmo resultado para o mesmo conjunto de arquivos, sem depender de ambiente externo;
  - rerodar a validacao manual do purge com `dryRun=true` deve ser inofensivo e nao mutar cache, Mongo, tickets ou git;
  - repetir uma investigacao controlada com novo `x-request-id` deve criar outro namespace sob `output/case-investigation/` sem sobrescrever dossiers anteriores;
  - atualizar o template interno in place preserva o caminho unico do template, evitando drift entre multiplos arquivos de template.
- Riscos:
  - declarar `extract_construction_timeline_v1` como investigavel de forma ambigua e acabar promovendo-o indevidamente ao contrato HTTP publico;
  - apontar o dossier para `output/local-runs` e deixa-lo sujeito ao cleanup automatico existente;
  - documentar `includeWorkflowDebug` como padrao em vez de opt-in seguro;
  - esquecer de registrar a validacao manual exigida, levando a fechamento com criterio documental incompleto.
- Recovery / Rollback:
  - se o manifest apontar para caminhos errados ou para runtime surfaces proibidas, corrigir primeiro o JSON e rerodar o teste dirigido antes de qualquer validacao manual;
  - se o namespace do dossier conflitar com cleanup ou retencao, mover a policy para `output/case-investigation/` e atualizar manifest/docs no mesmo changeset, sem tentar salvar dossies em arvore versionada;
  - se a validacao manual do purge mostrar escopo amplo demais, parar o fechamento, manter o ticket aberto e reduzir a policy documentada para o subconjunto realmente seguro;
  - se o bloco causal do template quebrar tickets de outras fontes, manter o template unico e ajustar apenas a instrucao de obrigatoriedade/placeholder, sem criar template paralelo.

## Artifacts and Notes
- Artefatos principais esperados ao final:
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-manifest.json`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-runbook.md`
  - `../guiadomus-matricula/docs/workflows/target-case-investigation-causal-ticket-template.md`
  - `../guiadomus-matricula/tickets/templates/internal-ticket-template.md`
  - `../guiadomus-matricula/tests/scripts/target-case-investigation-capability.test.js`
- Artefatos operacionais/manuais esperados:
  - preview real de purge scoped com `dryRun=true` salvo em `../guiadomus-matricula/output/case-investigation/case_inv_pilot_20260403_183200/requests/purge.*`;
  - rodada local controlada com `x-request-id` dedicado e `updateDb=false` salva em `../guiadomus-matricula/output/case-investigation/case_inv_pilot_20260403_183200/main.*`;
  - namespace local validado em `../guiadomus-matricula/output/case-investigation/case_inv_pilot_20260403_183200/`;
  - resumo manual salvo em `../guiadomus-matricula/output/case-investigation/case_inv_pilot_20260403_183200/validation.summary.json`;
  - atualizacao deste ExecPlan e do runbook da capability com a nota manual de aceite.
- Notas obrigatorias de aceite:
  - registrar explicitamente se `extract_construction_timeline_v1` ficou aceito como workflow investigavel do piloto ou se houve exclusao justificada;
  - registrar quais superficies historicas reais encerram causalidade sem replay para casos passados;
  - registrar a retencao aprovada do dossier e se `scripts/repo-hygiene-cleanup.js` permanece deliberadamente fora desse namespace;
  - registrar se `includeWorkflowDebug` foi liberado apenas para sandbox/local safe cases e qual foi o criterio usado.
- Evidencias de diff/inspecao uteis no fechamento:
  - `find docs/workflows -maxdepth 1 -type f | sort`
  - `git diff -- README.md docs/local-function-runbook.md docs/workflows/target-case-investigation-manifest.json docs/workflows/target-case-investigation-runbook.md docs/workflows/target-case-investigation-causal-ticket-template.md tickets/templates/internal-ticket-template.md tests/scripts/target-case-investigation-capability.test.js`
  - `find output/case-investigation -maxdepth 2 -type f | sort`

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato local canonico da capability: `docs/workflows/target-case-investigation-manifest.json`
  - documentacao operacional do piloto: `README.md`, `docs/local-function-runbook.md`, `docs/workflows/target-case-investigation-runbook.md`
  - template interno de ticket: `tickets/templates/internal-ticket-template.md`
- Compatibilidade e acoplamentos relevantes:
  - o runner dependera do caminho fixo `docs/workflows/target-case-investigation-manifest.json`, mas este plano nao altera o runner;
  - a capability pode declarar `extract_construction_timeline_v1` como investigavel sem torna-lo selecionavel no contrato HTTP publico; essa fronteira precisa permanecer explicita;
  - o namespace `output/case-investigation/` depende do fato de `/output` ja ser ignorado e de o cleanup atual nao atuar fora de `output/local-runs`;
  - o purge scoped atual depende de `index.js` e dos identificadores aceitos pelo endpoint `/_meta/cache/purge-extractors`;
  - a validacao manual depende de ambiente local com `.env` e app iniciado por `npm start`.
- Dependencias externas e mocks:
  - nenhuma dependencia externa nova deve ser introduzida para esta capability v1;
  - a prova automatizada preferida e teste local via `node --test`, sem mock remoto;
  - a prova manual usa apenas a funcao HTTP local e o endpoint de purge ja existentes, com dados/sandbox do proprio piloto.
