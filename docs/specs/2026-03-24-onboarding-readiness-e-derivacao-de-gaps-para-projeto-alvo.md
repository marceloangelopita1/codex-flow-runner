# [SPEC] Onboarding readiness do projeto alvo com `/target_prepare`, `/target_checkup` e `/target_derive_gaps`

## Metadata
- Spec ID: 2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-24 20:21Z
- Last reviewed at (UTC): 2026-03-24 21:36Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md
  - tickets/open/2026-03-24-target-checkup-readiness-audit-gap.md
  - tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md
  - tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md
- Related execplans:
  - execplans/2026-03-24-target-prepare-controlled-onboarding-gap.md
- Related commits:
  - 
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve: hoje o `codex-flow-runner` pressupoe onboarding humano previo para que um projeto alvo fique compativel com o workflow completo. Falta um fluxo nativo, observavel e auditavel para adequar o projeto alvo, auditar sua prontidao operacional e materializar backlog de remediacao readiness sem transformar o runner em verificador semantico pesado.
- Resultado esperado: o runner passa a oferecer tres comandos top-level para operar sobre projeto alvo externo: `/target_prepare`, `/target_checkup` e `/target_derive_gaps`, com gates determinísticos, uso controlado de IA/Codex, versionamento rastreável e UX consistente no Telegram.
- Contexto funcional:
  - a inspiracao conceitual em `/readiness-report` do Droid / Factory.ai e apenas de produto/UX; nao implica copia literal, dependencia nem compatibilidade arquitetural;
  - o contrato externo de compatibilidade continua binario: `projeto elegivel para descoberta` e `projeto compativel com workflow completo`;
  - `prepare` e etapa operacional de adequacao para promover o projeto ao segundo estado, nao terceira categoria canonica;
  - `checkup -> tickets` entra apenas como trilha operacional de readiness/onboarding/operabilidade/validacao/governanca, sem substituir o contrato funcional canonico `spec -> tickets`.
- Restricoes tecnicas relevantes:
  - manter fluxo sequencial, sem paralelizacao de tickets;
  - preservar o projeto alvo como fonte canonica dos artefatos versionados de onboarding/checkup/tickets;
  - usar IA principalmente para adequacao controlada, sintese e redacao, sempre ancorada em fatos determinísticos;
  - evitar mutacao fora de allowlist explicita no `prepare`;
  - impedir derivacao automatica a partir de checkup invalido, stale ou driftado.

## Jornada de uso
1. Operador autorizado executa `/target_prepare <project-name>`.
2. Runner resolve explicitamente um diretorio irmao dentro de `PROJECTS_ROOT_PATH`, exige diretorio existente com `.git` e roda preflight do alvo.
3. Se o alvo precisar de adequacao, o runner executa prompt dedicado de onboarding para criar/atualizar apenas as superficies permitidas, roda pos-check deterministico, gera manifesto e relatorio de preparo e so entao faz commit/push.
4. Operador executa `/target_checkup` no projeto ativo ou `/target_checkup <project-name>` para um alvo explicito.
5. Runner exige snapshot limpo, valida integridade do preparo, coleta evidencias objetivas, sintetiza o readiness audit e versiona `md + json` em `docs/checkups/history/`, mesmo quando o veredito geral for invalido para derivacao.
6. Se o relatorio estiver explicitamente valido para derivacao, o operador executa `/target_derive_gaps <project-name> <report-path>`.
7. Runner revalida working tree limpo, validade do artefato, ausencia de drift, deduplicacao por fingerprint e materializa apenas tickets readiness elegiveis no projeto alvo, atualizando o proprio artefato de checkup no mesmo changeset.
8. O bot publica milestones curtos, resumo final rastreavel e CTAs contextuais, sem trocar implicitamente o projeto ativo.

## Requisitos funcionais
- RF-01: expor os comandos `/target_prepare <project-name>`, `/target_checkup [<project-name>]` e `/target_derive_gaps <project-name> <report-path>`, mais seus pares `/_status` e `/_cancel`.
- RF-02: `/target_prepare` deve aceitar apenas nome explicito de diretorio irmao em `PROJECTS_ROOT_PATH`, exigir diretorio existente e repositorio Git valido, sem suportar caminho arbitrario nem criacao de projeto novo no v1.
- RF-03: o `prepare` deve poder atuar antes da elegibilidade atual de `/projects`, mas nao pode depender de projeto ativo nem auto-selecionar o alvo ao concluir.
- RF-04: o `prepare` deve limitar mutacoes a uma allowlist explicita de diretorios/arquivos do workflow: `tickets/open/`, `tickets/closed/`, `execplans/`, `docs/specs/`, `docs/specs/templates/`, `docs/workflows/`, `AGENTS.md`, `README.md`, `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`, `docs/specs/templates/spec-template.md` e `docs/workflows/target-project-compatibility-contract.md`.
- RF-05: o `prepare` nao pode tocar `.gitignore`, `.codex/`, `.codex/config.toml`, `package.json`, scripts de automacao, CI, configs locais de runtime nem outras superficies de produto/infra fora da allowlist.
- RF-06: o `prepare` deve usar mecanismo principal de mutacao via prompt dedicado de Codex/IA, contido por preflight deterministico barato, escopo de caminhos permitido e pos-check deterministico forte.
- RF-07: `AGENTS.md` e `README.md` do alvo devem ser mesclados/atualizados in-place com validacao estrutural; as demais docs canonicas gerenciadas pelo runner devem ser criadas/atualizadas para a versao/padrao atual com validacao deterministica forte.
- RF-08: o `prepare` deve gerar, no proprio projeto alvo, um manifesto tecnico legivel por maquina e um relatorio humano versionados em `docs/workflows/`, registrando versao logica do contrato, versao/schema do prepare, referencia do runner, timestamp, superficies gerenciadas, estrategia de validacao por superficie, fingerprints/hashes quando aplicavel e allowlist de caminhos autorizados.
- RF-09: o `prepare` so pode fazer commit/push depois de passar no pos-check deterministico; se falhar, nao pode commitar/pushar, nao pode carimbar o projeto como preparado e deve deixar diff local + diagnostico explicito do que falhou.
- RF-10: `/target_checkup` sem argumento deve usar o projeto ativo; com `<project-name>` deve operar sobre alvo explicito sem trocar o projeto ativo global.
- RF-11: o `checkup` deve falhar cedo quando o working tree inicial estiver sujo; o artefato canonico so e valido quando `git status --porcelain` estiver vazio, `HEAD` resolvido e branch registrada.
- RF-12: o `checkup` deve registrar em seus artefatos pelo menos `analyzed_head_sha`, `branch`, `working_tree_clean_at_start=true`, `started_at_utc`, `finished_at_utc` e `report_commit_sha` quando houver versionamento do proprio relatorio.
- RF-13: o `checkup` v1 deve cobrir obrigatoriamente as dimensoes `integridade do preparo`, `operabilidade local`, `saude de validacao/entrega` e `governanca documental`; `observabilidade` e opcional e nao bloqueante; `arquitetura/manutenibilidade ampla do produto` fica fora do v1.
- RF-14: o `checkup` deve coletar fatos de forma deterministica, incluindo existencia e integridade de superficies obrigatorias, descoberta objetiva de comandos/pre-requisitos em superficies explicitas, execucao segura de comandos nao interativos suportados pelo projeto e captura de comando, exit code, duracao e stdout/stderr resumidos.
- RF-15: IA/Codex no `checkup` so pode sintetizar fatos, agrupar sintomas em gaps reais, redigir relatorio e enquadrar risco/impacto; nao pode inventar arquivo, comando, resultado, evidencia nem afirmar prontidao sem sustentacao do gate deterministico.
- RF-16: o `checkup` deve gerar `md + json` em `docs/checkups/history/<timestamp>-project-readiness-checkup.*`, com vereditos por dimensao (`ok | gap | blocked | n/a | execution_failed`) e veredito geral (`valid_for_gap_ticket_derivation | invalid_for_gap_ticket_derivation`).
- RF-17: quando o `checkup` completar operacionalmente, seus artefatos canonicos devem ser versionados por padrao mesmo que o veredito geral seja invalido para derivacao; se houver falha interna no meio da execucao, nao deve haver artefato canonico versionado dessa rodada.
- RF-18: um artefato de `checkup` so pode habilitar `/target_derive_gaps` se tiver execucao completa, preflight limpo aprovado, integridade do preparo aprovada, `analyzed_head_sha` registrado, veredito geral `valid_for_gap_ticket_derivation`, ausencia de commit novo posterior e idade maxima de 30 dias.
- RF-19: `/target_derive_gaps` deve exigir working tree limpo, projeto explicito e `report-path` explicito relativo ao repo alvo; nao pode usar "ultimo relatorio" implicitamente.
- RF-20: o `derive` deve verificar que o relatorio pertence ao projeto indicado, continua valido para derivacao e nao sofreu drift de commit que o invalide.
- RF-21: o `derive` deve materializar backlog por unidade real de remediacao, agrupando sintomas coerentes em um mesmo ticket quando a superficie corretiva for a mesma, em vez de abrir um ticket por item bruto de checklist.
- RF-22: o `derive` deve criar ticket apenas para gap com acao local executavel, evidencia suficiente, superficie de remediacao identificavel e criterio de fechamento observavel; itens informativos, vagos, redundantes ou sem acao concreta nao devem virar ticket.
- RF-23: o `derive` deve criar `Status: blocked` quando o gap for real e relevante, mas depender de insumo/decisao externa sem proximo passo local executavel.
- RF-24: gaps cuja remediacao mora no proprio runner devem ser registrados no resultado da derivacao como `runner_limitation_detected`/`not_materialized_runner_limitation`, sem criar ticket automatico no projeto alvo no v1.
- RF-25: o `derive` deve ser fortemente idempotente: sobre o mesmo checkup deve retornar `no-op com mapeamento existente`; sobre checkup novo deve reutilizar/atualizar ticket aberto equivalente por `gap_fingerprint`; se o equivalente ja estiver fechado, deve abrir novo ticket com vinculo explicito de recorrencia.
- RF-26: tickets derivados do checkup devem nascer no proprio projeto alvo com `Gap type` readiness (`preparation | documentation | operability | validation | observability | runner_limitation`) separado da `Priority`, que continua vindo da matriz objetiva ja existente de `severidade`, `frequencia`, `custo_de_atraso` e `risco_operacional`.
- RF-27: tickets derivados devem ser autocontidos e carregar no minimo `Source: readiness-checkup`, caminhos do relatorio `.md` e `.json`, `Analyzed head SHA`, `Report commit SHA` quando existir, `Gap ID`/`Gap fingerprint`, `Gap type`, `Checkup dimension`, evidencias objetivas, matriz de priorizacao completa, superficie local de remediacao, assumptions/defaults, validation notes e closure criteria observaveis.
- RF-28: quando houver materializacao real, o `derive` deve atualizar o proprio artefato de checkup com `derivation_status`, `derived_at_utc`, resultado por gap (`materialized_as_ticket`, `reused_existing_ticket`, `blocked_ticket_created`, `not_materialized_informational`, `not_materialized_insufficient_specificity`, `not_materialized_runner_limitation`) e caminhos dos tickets afetados, versionando isso no mesmo changeset dos tickets.
- RF-29: `target_prepare`, `target_checkup` e `target_derive_gaps` devem ocupar o mesmo slot global operacional dos fluxos pesados existentes; durante execucao ativa, `/status` e `/projects` permanecem permitidos, enquanto `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados.
- RF-30: o cancelamento deve ser cooperativo e best-effort; o status do fluxo deve informar etapa atual e se a execucao ainda esta antes ou depois da fronteira de versionamento; antes de commit/push o cancelamento deve preferir encerrar sem versionar; depois da fronteira pode ser recusado ou tratado como tardio com mensagem explicita.
- RF-31: cada fluxo deve publicar milestones curtos e canonicos no Telegram e em `/status`: `prepare` (`preflight`, `adequacao por IA`, `pos-check`, `versionamento`), `checkup` (`preflight`, `coleta de evidencias`, `sintese/redacao`, `versionamento`) e `derive` (`preflight`, `deduplicacao/priorizacao`, `materializacao`, `versionamento`).
- RF-32: os resumos finais devem expor proxima acao contextual e CTAs seguros: `prepare -> Rodar checkup neste projeto` e opcionalmente `Selecionar projeto`; `checkup valido -> Derivar gaps`; `checkup invalido -> sem CTA de derivacao`; erros/bloqueios devem preferir mensagem textual clara com proxima acao explicita.
- RF-33: os tres fluxos devem persistir trilhas locais auxiliares em `.codex-flow-runner/flow-traces/` com comando, projeto alvo, milestone, inputs relevantes, requests/responses/decisions de IA quando existirem, resultados determinísticos, sucesso/falha/cancelamento e caminhos dos artefatos versionados.

## Assumptions and defaults
- A inspiracao em `/readiness-report` do Droid / Factory.ai e apenas de produto/UX.
- O contrato externo de compatibilidade continua com apenas dois estados oficiais: `projeto elegivel para descoberta` e `projeto compativel com workflow completo`.
- `prepare` e fluxo de adequacao observavel e auditavel, nao tentativa de provar semanticamente que o projeto e "perfeito".
- O mecanismo principal de mutacao do `prepare` e um prompt dedicado de Codex/IA, sempre contido por guardrails determinísticos fortes.
- A prova canonica de preparo fica versionada dentro do projeto alvo, nao apenas em rastro oculto/local do runner.
- A validade do `checkup` e amarrada ao snapshot por SHA e expira em 30 dias, mesmo sem commit novo.
- `target_derive_gaps` nao e gerador generico de backlog; so materializa remediacoes readiness ja evidenciadas por checkup valido.
- O desenho permanece em tres comandos top-level porque eles possuem precondicoes, efeitos e artefatos distintos.
- A entrega deve ser implementada por multiplos tickets/execplans derivados desta spec, e nao por um unico ticket monolitico.

## Nao-escopo
- Criar projeto novo fora de Git ou fora de `PROJECTS_ROOT_PATH`.
- Introduzir terceira categoria canonica de compatibilidade entre descoberta e workflow completo.
- Tocar `.gitignore`, `.codex/`, `.codex/config.toml`, `package.json`, scripts de automacao, CI, runtime local ou superficies de produto/infra fora da allowlist do `prepare`.
- Realizar analise ampla de arquitetura/manutenibilidade do codigo do produto no `checkup` v1.
- Abrir automaticamente tickets cross-repo no `codex-flow-runner` quando a limitacao for do proprio runner.
- Transformar `checkup -> tickets` em atalho generico para backlog funcional do projeto.
- Introduzir `resume` de sessao no v1.
- Permitir execucao concorrente desses fluxos com outros fluxos pesados do runner.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - `/target_prepare <project-name>` em repositorio Git existente, ainda nao elegivel em `/projects`, consegue criar/atualizar apenas as superficies permitidas, gerar manifesto/relatorio de preparo, passar no pos-check e fazer commit/push por caminhos explicitos.
- [ ] CA-02 - Se o `prepare` tocar caminho fora da allowlist ou falhar no pos-check, o fluxo nao commita/pusha, nao marca sucesso canonico e retorna diagnostico explicito das verificacoes falhas, deixando diff local para inspecao.
- [ ] CA-03 - `prepare` bem-sucedido nao altera automaticamente o projeto ativo e o resumo final informa se o alvo passou a ficar elegivel para `/projects`, se ficou compativel com workflow completo e qual e a proxima acao recomendada.
- [ ] CA-04 - `/target_checkup` com working tree sujo falha cedo, nao produz artefato canonico valido e orienta limpeza/commit antes da rodada.
- [ ] CA-05 - `checkup` bem-sucedido gera `docs/checkups/history/<timestamp>-project-readiness-checkup.md` e `.json`, contendo `analyzed_head_sha`, branch, timestamps, vereditos por dimensao e veredito geral, e versiona ambos por padrao mesmo quando o resultado for `invalid_for_gap_ticket_derivation`.
- [ ] CA-06 - Falha interna do `checkup` nao versiona artefato canonico da rodada; o operador recebe falha operacional explicita distinguindo "artefato local nao publicado" de "rodada publicada".
- [ ] CA-07 - `/target_derive_gaps <project-name> <report-path>` recusa relatorio invalido, stale, pertencente a outro projeto, driftado por commit novo ou sem elegibilidade explicita para derivacao, sem criar/alterar tickets.
- [ ] CA-08 - Reexecutar `derive` sobre o mesmo relatorio valido resulta em `no-op com mapeamento existente`, sem tickets duplicados e sem commit vazio.
- [ ] CA-09 - Reexecutar `derive` sobre relatorio novo com gap equivalente reutiliza/atualiza ticket aberto existente; se o equivalente ja estiver fechado, cria novo ticket com vinculo de recorrencia.
- [ ] CA-10 - Ticket derivado do checkup nasce autocontido, com caminho do relatorio `.md`, caminho do `.json`, `Gap fingerprint`, dimensao, evidencias objetivas, matriz de prioridade, superficies locais de remediacao e closure criteria observaveis suficientes para outra IA executar sem reler o relatorio inteiro.
- [ ] CA-11 - Gap cuja remediacao mora no runner aparece no write-back da derivacao como `not_materialized_runner_limitation`, sem abrir ticket automatico no projeto alvo.
- [ ] CA-12 - Durante execucao ativa de qualquer um dos tres comandos, `/status` e `/projects` seguem disponiveis, enquanto `/select_project`, `/discover_spec`, `/plan_spec`, `/run_specs`, `/run_all` e `/codex_chat` ficam bloqueados com mensagem explicita.
- [ ] CA-13 - Cada fluxo expoe `/_status` e `/_cancel`; cancelar antes da fronteira de versionamento encerra sem commit/push; apos a fronteira, o bot responde com tratamento explicito de cancelamento tardio.
- [ ] CA-14 - Os tres fluxos geram traces locais em `.codex-flow-runner/flow-traces/` com comando, projeto, milestone, resultado, artefatos e eventos de sucesso/falha/cancelamento.

## Gate de validacao dos tickets derivados
- Veredito atual: n/a
- Gaps encontrados:
  - n/a
- Correcoes aplicadas:
  - n/a
- Causa-raiz provavel:
  - n/a
- Ciclos executados:
  - n/a
- Nota de uso: `n/a` ate esta spec participar de `/run_specs`.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-24T20:51:37.204Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado agora cobre o backlog inteiro da spec com particao coerente entre `prepare`, `checkup`, `derive` e controle operacional compartilhado; as herancas documentais relevantes ficaram explicitas nos tickets aplicaveis e os `Closure criteria` tornaram esse contrato observavel na revalidacao atual.
- Ciclos executados: 1
- Thread da validacao: 019d2196-3788-7d92-a38d-fefbcaa03c78
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-03-24-target-checkup-readiness-audit-gap.md [fonte=source-spec]
  - tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md [fonte=source-spec]
  - tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md [fonte=source-spec]
  - tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: NO_GO (high)
  - Resumo: O pacote cobre os quatro blocos macro da spec, mas ainda deixa contratos documentais centrais de `prepare`, `checkup` e `derive` implícitos demais nos tickets aplicáveis; com isso, o aceite do backlog derivado ainda não fica objetivamente observável.
  - Thread: 019d2196-3788-7d92-a38d-fefbcaa03c78
  - Fingerprints abertos: closure-criteria-gap|tickets/open/2026-03-24-target-checkup-readiness-audit-gap.md&tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md&tickets/open/2026-03-24-target-prepare-controlled-onboarding-gap.md|ca-03&rf-08&rf-12&rf-27&rf-28, spec-inheritance-gap|tickets/open/2026-03-24-target-checkup-readiness-audit-gap.md&tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md&tickets/open/2026-03-24-target-prepare-controlled-onboarding-gap.md|rf-08&rf-12&rf-27&rf-28
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0
- Ciclo 1 [revalidation]: GO (high)
  - Resumo: O pacote derivado agora cobre o backlog inteiro da spec com particao coerente entre `prepare`, `checkup`, `derive` e controle operacional compartilhado; as herancas documentais relevantes ficaram explicitas nos tickets aplicaveis e os `Closure criteria` tornaram esse contrato observavel na revalidacao atual.
  - Thread: 019d2196-3788-7d92-a38d-fefbcaa03c78
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: sim
  - Correcoes deste ciclo: 3
    - Explicitei no ticket de `target_prepare` os campos obrigatorios herdados de RF-08 para o manifesto/relatorio em `docs/workflows/` e ajustei os `Closure criteria` para exigir o resumo final rastreavel de CA-03 e a observabilidade desses campos. [applied]
    - Explicitei no ticket de `target_checkup` os campos obrigatorios de RF-12 (`working_tree_clean_at_start=true`, `report_commit_sha` quando houver versionamento e demais metadados do snapshot) e ajustei os `Closure criteria` para tornar esses itens observaveis no aceite. [applied]
    - Explicitei no ticket de `target_derive_gaps` os campos autocontidos exigidos por RF-27 e o write-back completo exigido por RF-28, incluindo `Gap ID`, SHAs, caminhos do relatorio, `derivation_status`, `derived_at_utc` e a taxonomia completa de resultados por gap, alem de refletir isso nos `Closure criteria`. [applied]

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Explicitei no ticket de `target_prepare` os campos obrigatorios herdados de RF-08 para o manifesto/relatorio em `docs/workflows/` e ajustei os `Closure criteria` para exigir o resumo final rastreavel de CA-03 e a observabilidade desses campos.
  - Artefatos afetados: tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md
  - Gaps relacionados: spec-inheritance-gap, closure-criteria-gap
  - Resultado: applied
- Explicitei no ticket de `target_checkup` os campos obrigatorios de RF-12 (`working_tree_clean_at_start=true`, `report_commit_sha` quando houver versionamento e demais metadados do snapshot) e ajustei os `Closure criteria` para tornar esses itens observaveis no aceite.
  - Artefatos afetados: tickets/open/2026-03-24-target-checkup-readiness-audit-gap.md
  - Gaps relacionados: spec-inheritance-gap, closure-criteria-gap
  - Resultado: applied
- Explicitei no ticket de `target_derive_gaps` os campos autocontidos exigidos por RF-27 e o write-back completo exigido por RF-28, incluindo `Gap ID`, SHAs, caminhos do relatorio, `derivation_status`, `derived_at_utc` e a taxonomia completa de resultados por gap, alem de refletir isso nos `Closure criteria`.
  - Artefatos afetados: tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md
  - Gaps relacionados: spec-inheritance-gap, closure-criteria-gap
  - Resultado: applied

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim
- Motivo de ativacao ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificacao final: not-systemic
- Confianca: high
- Frente causal analisada: A menor causa plausivel e uma omissao local na redacao inicial de tres tickets; nao houve falta material de prompt, contrato, validacao ou ordem no codex-flow-runner.
- Achados sistemicos:
  - nenhum
- Artefatos do workflow consultados:
  - AGENTS.md
  - DOCUMENTATION.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - SPECS.md
  - docs/workflows/codex-quality-gates.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - prompts/11-retrospectiva-workflow-apos-spec-audit.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/spec-ticket-validation.ts
  - src/core/runner.ts
  - src/integrations/workflow-gap-analysis-parser.ts
- Elegibilidade de publicacao: nao
- Resultado do ticket transversal ou limitacao operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - validar `target_prepare` em repositorio quase vazio ja existente em Git;
  - validar `target_prepare` em repositorio com `AGENTS.md` e `README.md` preexistentes e conteudo relevante a preservar;
  - validar `target_checkup` em projeto preparado cujo veredito final seja `invalid_for_gap_ticket_derivation`, confirmando versionamento do relatorio mesmo assim;
  - validar `target_derive_gaps` em rerun idempotente e em recorrencia de gap anteriormente fechado.
- Validacoes manuais pendentes:
  - exercitar os CTAs e callbacks reais do Telegram nos tres fluxos;
  - confirmar permissao real de `git push` nos repositorios alvo de teste.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Escopo funcional, contrato operacional, restricoes, guardrails, UX e rastreabilidade do v1 foram definidos.
  - Existem fundacoes parciais reutilizaveis no runner atual para a entrega: descoberta de diretorios irmaos elegiveis por primeiro nivel, fila `P0 -> P1 -> P2` com suporte a `Status: blocked`, helper de commit/push, slot/capacidade para fluxos atuais e traces locais base em `.codex-flow-runner/flow-traces/`.
  - A jornada `target_prepare` agora possui implementacao funcional fechada tecnicamente em `GO`: o runner expoe `/target_prepare <project-name>`, resolve repo Git irmao ainda inelegivel em `/projects`, rejeita pseudo-caminhos como `.`, aplica prompt dedicado com allowlist forte, valida merge gerenciado de `AGENTS.md`/`README.md`, gera manifesto + relatorio canonicos no repo alvo e cruza a fronteira de commit/push apenas apos pos-check deterministico.
- Pendencias em aberto:
  - Nenhum RF/CA da jornada `target_checkup` esta atendido integralmente; faltam preflight Git limpo, coleta deterministica por dimensao, schema canonico `md + json`, regras de validade por SHA/idade/drift e versionamento mesmo para resultado invalido (`tickets/open/2026-03-24-target-checkup-readiness-audit-gap.md`).
  - Nenhum RF/CA da jornada `target_derive_gaps` esta atendido integralmente; faltam validacao do relatorio, materializacao idempotente por `Gap fingerprint`, tickets readiness autocontidos e write-back do resultado por gap no proprio checkup (`tickets/open/2026-03-24-target-derive-gaps-idempotent-readiness-materialization-gap.md`).
  - Nenhum RF/CA de controle operacional compartilhado dos fluxos target esta atendido integralmente; faltam slot/bloqueios, `/_status`, `/_cancel`, milestones, CTAs e traces canonicos para `prepare`, `checkup` e `derive` (`tickets/open/2026-03-24-target-flows-telegram-status-cancel-and-traces-gap.md`).
- Evidencias de validacao:
  - entrevista profunda concluida com decisoes explicitas sobre contrato, preparo, checkup, derivacao, deduplicacao, prioridade, versionamento, UX e observabilidade.

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - 
- Causas-raiz sistemicas identificadas:
  - 
- Ajustes genericos promovidos ao workflow:
  - 

## Riscos e impacto
- Risco funcional: `prepare` degradar mal em projetos com documentacao preexistente relevante e gerar merge ruim em `AGENTS.md` ou `README.md`.
- Risco operacional: o gate deterministico do `checkup` ficar fraco demais e permitir derivacao sobre snapshot inadequado, ou forte demais e bloquear cenarios validos de readiness.
- Risco de escopo: a trilha `checkup -> tickets` comecar a ser usada como backlog generico de produto.
- Mitigacao:
  - limitar `prepare` a allowlist forte, manifesto versionado e pos-check deterministico;
  - amarrar validade do `checkup` a SHA, tempo maximo e veredito explicito;
  - manter `Gap type` readiness e exigencia de evidencia/acao/closure criteria para toda materializacao.

## Decisoes e trade-offs
- 2026-03-24 - Manter tres comandos top-level (`/target_prepare`, `/target_checkup`, `/target_derive_gaps`) em vez de fundi-los - preserva clareza operacional, idempotencia e rastreabilidade por fase.
- 2026-03-24 - Manter apenas duas categorias canonicas de compatibilidade externa - evita inflar o contrato com estado intermediario; `prepare` permanece etapa operacional de promocao ao workflow completo.
- 2026-03-24 - Usar IA como mecanismo principal de adequacao no `prepare`, mas contida por allowlist, preflight e pos-check fortes - maximiza adaptacao com controle de escopo e confiabilidade.
- 2026-03-24 - Versionar `checkup` bem-sucedido mesmo quando invalido para derivacao - preserva trilha auditavel canonica da rodada sem confundir "rodada registrada" com "derivacao habilitada".
- 2026-03-24 - Nao abrir ticket automatico no projeto alvo para limitacoes do proprio runner no v1 - evita complexidade cross-repo precoce e impede backlog incorreto no alvo.
- 2026-03-24 - Reaproveitar a matriz objetiva de prioridade ja existente para todo ticket derivado de checkup - mantem coerencia com a fila sequencial `P0 -> P1 -> P2` e evita taxonomia paralela de prioridade.
- 2026-03-24 - Manter esta frente em uma unica spec e quebrar a entrega em multiplos tickets/execplans - os tres comandos compartilham o mesmo modelo de artefatos e contrato; a separacao mais saudavel e de execucao, nao de visao.

## Historico de atualizacao
- 2026-03-24 20:21Z - Versao inicial da spec consolidada apos entrevista profunda cobrindo contrato de compatibilidade, onboarding via `prepare`, readiness audit via `checkup`, derivacao conservadora de gaps, UX de Telegram, status/cancel e rastreabilidade local/canonica.
- 2026-03-24 20:34Z - Triagem inicial concluida contra o estado atual do codigo; 4 tickets abertos para cobrir `target_prepare`, `target_checkup`, `target_derive_gaps` e a camada compartilhada de Telegram/status/cancel/traces.
- 2026-03-24 21:30Z - Execucao do ticket de `target_prepare` implementou o comando `/target_prepare <project-name>`, o resolvedor explicito de repo irmao, o prompt dedicado com allowlist forte, o pos-check deterministico e a geracao/versionamento de manifesto + relatorio canonicos no repo alvo; permaneceram pendentes apenas as validacoes manuais externas e os tickets irmaos de `checkup`, `derive` e controle operacional compartilhado.
- 2026-03-24 21:36Z - Fechamento tecnico do ticket `target_prepare` concluido em `GO` com validacao manual externa pendente; o resolvedor foi endurecido para rejeitar `.` como pseudo-diretorio irmao e o ticket passou a viver em `tickets/closed/2026-03-24-target-prepare-controlled-onboarding-gap.md`.
