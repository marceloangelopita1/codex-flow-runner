# [SPEC] Revisão editorial explícita das documentações propagadas por `/target_prepare`

## Metadata
- Spec ID: 2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-25 16:27Z
- Last reviewed at (UTC): 2026-03-25 16:56Z
- Source: operational-gap
- Related tickets:
  - tickets/open/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md
  - tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md
- Related execplans:
  - nenhum
- Related commits:
  - chore(specs): triage 2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md (este changeset)
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve: o `/target_prepare` hoje propaga para projetos-alvo documentações canônicas do próprio `codex-flow-runner` por cópia exata, por blocos gerenciados e por artefatos textuais gerados pelo runner. Parte dessas superfícies ainda contém português sem acentuação adequada ou com redação editorial inconsistente, o que contraria `DOCUMENTATION.md` e espalha esse problema para outros repositórios.
- Resultado esperado: estabelecer uma revisão explícita, rastreável e completa de todas as documentações que o `/target_prepare` pode alterar, corrigindo português e acentuação nas superfícies propagadas sem quebrar contratos, sem mudar schema de artefatos máquina-legíveis e sem ampliar desnecessariamente o escopo para uma revisão retroativa geral do repositório.
- Contexto funcional:
  - o inventário atual das superfícies propagadas por `copy-exact` está em `src/types/target-prepare.ts` via `TARGET_PREPARE_EXACT_COPY_SOURCES`;
  - o inventário atual das superfícies propagadas por blocos gerenciados está em `src/types/target-prepare.ts` via `TARGET_PREPARE_MERGED_FILE_SOURCES`;
  - o relatório humano gerado pelo runner em `docs/workflows/target-prepare-report.md` nasce de `renderReport()` em `src/core/target-prepare.ts`;
  - durante esta revisão de contexto, foi observado que documentos canônicos como `SPECS.md`, `PLANS.md`, `INTERNAL_TICKETS.md`, `EXTERNAL_PROMPTS.md`, `docs/workflows/discover-spec.md` e o template de spec ainda usam redação parcial ou majoritariamente sem acentuação, o que explica a propagação do problema.
- Restrições técnicas relevantes:
  - preservar o fluxo sequencial e o contrato atual do `target_prepare`;
  - preservar a semântica operacional das documentações revisadas;
  - não renomear campos, paths canônicos, versões ou chaves JSON do manifesto;
  - não transformar esta spec em revisão editorial ampla de todo o repositório fora das superfícies efetivamente propagadas pelo `/target_prepare`.

## Jornada de uso
1. Mantenedor do `codex-flow-runner` identifica ou recebe um relato de erro editorial em documentação propagada pelo `/target_prepare`.
2. O mantenedor abre o inventário das superfícies propagadas e revisa explicitamente cada fonte de verdade documental que o comando copia, mescla ou gera.
3. A implementação corrige português, acentuação e redação nas superfícies em escopo, preservando contrato, estrutura e comportamento esperado do onboarding.
4. O mantenedor valida que `target_prepare` continua convergindo as superfícies gerenciadas e que um repositório alvo de smoke recebe a documentação corrigida.
5. O operador roda `/target_prepare` em um projeto alvo e deixa de propagar os erros editoriais previamente observados.

## Requisitos funcionais
- RF-01: o escopo desta evolução deve cobrir explicitamente todas as superfícies documentais que o `/target_prepare` pode alterar no projeto alvo no estado atual do código, sem depender de memória oral ou interpretação implícita.
- RF-02: a revisão explícita deve incluir todas as superfícies `copy-exact` propagadas hoje pelo runner:
  - `EXTERNAL_PROMPTS.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `SPECS.md`
  - `docs/specs/README.md`
  - `docs/specs/templates/spec-template.md`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/target-project-compatibility-contract.md`
- RF-03: a revisão explícita deve incluir as fontes de verdade dos blocos gerenciados propagados para o projeto alvo:
  - `docs/workflows/target-prepare-managed-agents-section.md`, que alimenta o bloco gerenciado de `AGENTS.md`
  - `docs/workflows/target-prepare-managed-readme-section.md`, que alimenta o bloco gerenciado de `README.md`
- RF-04: a revisão explícita deve incluir os textos humanos gerados pelo runner durante o `/target_prepare`, em especial o conteúdo renderizado para `docs/workflows/target-prepare-report.md` por `src/core/target-prepare.ts`.
- RF-05: o manifesto `docs/workflows/target-prepare-manifest.json` continua em escopo apenas no que diz respeito à estabilidade contratual: a implementação não pode traduzir, renomear nem quebrar chaves, paths canônicos, `contractVersion` ou `prepareSchemaVersion` sob pretexto de revisão editorial.
- RF-06: cada superfície documental revisada deve passar a usar português correto, com acentuação adequada, mantendo coerência terminológica com `DOCUMENTATION.md` e sem introduzir regressão de significado operacional.
- RF-07: correções editoriais podem melhorar clareza, fluidez e concordância quando isso não alterar o comportamento documentado; mudanças semânticas de fluxo, contrato ou UX não pertencem a esta spec.
- RF-08: a implementação deve tornar explícito, na própria trilha documental da mudança, que superfícies são propagação-crítica para o `/target_prepare`, para que futuras revisões não deixem arquivos relevantes de fora.
- RF-09: a revisão não deve exigir migração retroativa em massa de specs, tickets, execplans ou documentos históricos que não façam parte do conjunto propagado pelo `/target_prepare`.
- RF-10: a validação final deve demonstrar que o `/target_prepare` continua convergindo os mesmos arquivos e que um repositório alvo recebe as versões editoriais corrigidas das documentações canônicas em escopo.

## Assumptions and defaults
- A dor relatada pelo operador justifica tratar esta revisão como correção com impacto funcional indireto, mesmo que `DOCUMENTATION.md` desestimule correção retroativa ampla de material histórico.
- O foco principal está nas fontes de verdade documentais que o runner replica para outros repositórios, não em toda a documentação local do `codex-flow-runner`.
- `docs/workflows/target-prepare-report.md` é um artefato humano e pode ter redação corrigida; já `docs/workflows/target-prepare-manifest.json` deve preservar contrato máquina-legível.
- Se durante a implementação surgir uma nova superfície propagada pelo `/target_prepare`, ela passa automaticamente a integrar o escopo desta spec.
- A revisão editorial deve preferir ajustes pequenos e seguros por superfície, em vez de reescritas amplas que aumentem risco de drift contratual.

## Nao-escopo
- Revisar retroativamente toda a documentação histórica do repositório que não seja propagada pelo `/target_prepare`.
- Alterar a allowlist, os markers de blocos gerenciados ou a semântica operacional do onboarding de projeto alvo.
- Traduzir ou renomear chaves JSON, campos tipados, nomes de constantes ou contratos máquina-legíveis do manifesto.
- Reescrever seções do `README.md` local que não façam parte do bloco gerenciado propagado para projetos-alvo.
- Expandir esta spec para uma reforma geral de estilo editorial em prompts, testes, logs ou mensagens de runtime fora do fluxo `target_prepare`.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Existe inventário explícito e verificável das superfícies documentais que o `/target_prepare` propaga hoje, cobrindo `copy-exact`, blocos gerenciados e textos humanos gerados pelo runner.
- [ ] CA-02 - `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`, `docs/specs/README.md`, `docs/specs/templates/spec-template.md`, `docs/workflows/discover-spec.md` e `docs/workflows/target-project-compatibility-contract.md` são revisados no repositório base com português correto e acentuação adequada, sem alterar seus contratos operacionais.
- [ ] CA-03 - `docs/workflows/target-prepare-managed-agents-section.md` e `docs/workflows/target-prepare-managed-readme-section.md` passam a gerar blocos gerenciados editorialmente corretos para `AGENTS.md` e `README.md` dos projetos-alvo.
- [ ] CA-04 - O texto de `docs/workflows/target-prepare-report.md`, gerado por `src/core/target-prepare.ts`, é revisado para português correto sem quebrar o contrato observável do fluxo nem a convergência do pós-check.
- [ ] CA-05 - `docs/workflows/target-prepare-manifest.json` preserva schema, nomes de chave e versões atuais após a mudança.
- [ ] CA-06 - Um repositório alvo de smoke preparado com `/target_prepare` passa a receber as superfícies documentais revisadas, sem repropagar os erros de português observados nesta abertura.

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
- Nota de uso: esta spec foi criada para organizar a correção futura; como ainda não houve derivação nem execução via `/run_specs`, esta seção permanece `n/a`.
- Politica historica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-25T16:51:24.554Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado agora cobre de forma explícita as pendências `copy-exact` e `runner-generated`, herda as validações manuais relevantes da spec para `AGENTS.md` e `README.md`, e torna essas checagens observáveis nos `Closure criteria` ligados a `RF-10`/`CA-06`; não restaram gaps objetivos no backlog derivado.
- Ciclos executados: 1
- Thread da validacao: 019d25e0-7813-7040-8358-f1876a64ce84
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md [fonte=source-spec]
  - tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: NO_GO (high)
  - Resumo: O pacote cobre as pendências de `copy-exact` e do relatório humano, mas ainda não herda nem torna observáveis as validações manuais da spec para os blocos gerenciados propagados em `AGENTS.md` e `README.md`; por isso o backlog derivado permanece incompleto para o aceite da spec.
  - Thread: 019d25e0-7813-7040-8358-f1876a64ce84
  - Fingerprints abertos: closure-criteria-gap|tickets/open/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md&tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md|ca-03&ca-06&rf-03&rf-10, spec-inheritance-gap|tickets/open/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md&tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md|ca-03&ca-06&rf-03&rf-10
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0
- Ciclo 1 [revalidation]: GO (high)
  - Resumo: O pacote derivado agora cobre de forma explícita as pendências `copy-exact` e `runner-generated`, herda as validações manuais relevantes da spec para `AGENTS.md` e `README.md`, e torna essas checagens observáveis nos `Closure criteria` ligados a `RF-10`/`CA-06`; não restaram gaps objetivos no backlog derivado.
  - Thread: 019d25e0-7813-7040-8358-f1876a64ce84
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: sim
  - Correcoes deste ciclo: 2
    - O ticket das fontes `copy-exact` passou a herdar explicitamente as validações manuais de `AGENTS.md` e `README.md` ligadas a `RF-03`/`CA-03`, com rastreabilidade para as fontes gerenciadas, e seus `Closure criteria` de `RF-10`/`CA-06` agora tornam essas checagens observáveis no smoke final. [applied]
    - O ticket do relatório humano passou a herdar explicitamente as validações manuais de `AGENTS.md` e `README.md` ligadas a `RF-03`/`CA-03`, com rastreabilidade para as fontes gerenciadas, e seus `Closure criteria` de `RF-10`/`CA-06` agora tornam essas checagens observáveis no smoke final. [applied]

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- O ticket das fontes `copy-exact` passou a herdar explicitamente as validações manuais de `AGENTS.md` e `README.md` ligadas a `RF-03`/`CA-03`, com rastreabilidade para as fontes gerenciadas, e seus `Closure criteria` de `RF-10`/`CA-06` agora tornam essas checagens observáveis no smoke final.
  - Artefatos afetados: tickets/open/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md
  - Gaps relacionados: spec-inheritance-gap, closure-criteria-gap
  - Resultado: applied
- O ticket do relatório humano passou a herdar explicitamente as validações manuais de `AGENTS.md` e `README.md` ligadas a `RF-03`/`CA-03`, com rastreabilidade para as fontes gerenciadas, e seus `Closure criteria` de `RF-10`/`CA-06` agora tornam essas checagens observáveis no smoke final.
  - Artefatos afetados: tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md
  - Gaps relacionados: spec-inheritance-gap, closure-criteria-gap
  - Resultado: applied

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim
- Motivo de ativacao ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificacao final: not-systemic
- Confianca: high
- Frente causal analisada: A menor causa plausível é execução inicial incompleta do pacote derivado apesar de instruções já suficientes, seguida de correção pelo próprio spec-ticket-validation.
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
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/core/spec-ticket-validation.ts
  - src/core/spec-ticket-validation.test.ts
  - src/types/spec-ticket-validation.ts
- Elegibilidade de publicacao: nao
- Resultado do ticket transversal ou limitacao operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - revisar diff textual completo de cada superfície propagação-crítica para confirmar correção editorial sem drift semântico;
  - validar o texto final gerado para `docs/workflows/target-prepare-report.md` após a implementação;
  - rodar smoke de `/target_prepare` em repositório descartável e revisar manualmente os arquivos propagados no alvo.
- Validacoes manuais pendentes:
  - confirmar que o bloco gerenciado de `AGENTS.md` permanece legível e não conflita com conteúdo preexistente relevante do projeto alvo;
  - confirmar que o bloco gerenciado de `README.md` continua claro para operadores humanos em um projeto externo real;
  - revisar se a correção editorial do repositório base elimina a principal classe de erro relatada: perda de acentuação ao propagar documentação.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - o problema operacional foi identificado e delimitado;
  - o inventário atual das superfícies propagadas por `/target_prepare` foi revisado a partir do código-fonte;
  - a distinção entre superfícies `copy-exact`, blocos gerenciados e artefatos gerados pelo runner foi explicitada;
  - os guardrails para preservar contrato e schema durante a revisão editorial foram definidos.
  - as superfícies de blocos gerenciados `docs/workflows/target-prepare-managed-agents-section.md` e `docs/workflows/target-prepare-managed-readme-section.md` ja estao editorialmente coerentes com `DOCUMENTATION.md`, e o merge gerenciado continua coberto por `src/core/target-prepare.test.ts`;
  - a estabilidade contratual do manifesto `docs/workflows/target-prepare-manifest.json` ja esta protegida por `src/types/target-prepare.ts` e por asserts em `src/core/target-prepare.test.ts`.
- Pendencias em aberto:
  - executar o ticket `tickets/open/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md` para revisar as fontes `copy-exact` ainda inconsistentes e registrar explicitamente a cobertura do inventario propagado;
  - executar o ticket `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md` para revisar o texto gerado por `renderReport()` sem alterar o contrato do manifesto;
  - validar a propagacao corrigida em smoke de `/target_prepare`, com revisao manual dos diffs e do relatorio humano gerado no alvo.
- Evidencias de validacao:
  - leitura de `src/types/target-prepare.ts` para enumerar `TARGET_PREPARE_EXACT_COPY_SOURCES` e `TARGET_PREPARE_MERGED_FILE_SOURCES`;
  - leitura de `src/core/target-prepare.ts` para identificar a geração textual de `docs/workflows/target-prepare-report.md` e o contrato do manifesto;
  - releitura das documentações canônicas atualmente propagadas pelo fluxo para confirmar a presença de inconsistências editoriais e de acentuação;
  - validacao de que `src/core/target-prepare.test.ts` ja cobre merge gerenciado e estabilidade contratual do manifesto;
  - abertura dos tickets derivados desta triagem em `tickets/open/` para separar o lote documental `copy-exact` do ajuste de codigo/teste do relatorio humano.

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum
- Causas-raiz sistemicas identificadas:
  - nenhuma auditoria final executada ainda; a causa imediata observada é propagação de documentação-base com português inconsistente para projetos-alvo.
- Ajustes genericos promovidos ao workflow:
  - nenhum ainda

## Riscos e impacto
- Risco funcional: baixo, desde que a implementação preserve contratos documentais e schema do manifesto.
- Risco operacional: médio se a revisão editorial reescrever demais textos canônicos e introduzir drift semântico ou quebra de convergência no `target_prepare`.
- Mitigacao:
  - revisar superfície por superfície contra o contrato atual;
  - preservar inventário explícito do que o fluxo propaga;
  - validar a rodada com smoke real em repositório alvo descartável.

## Decisoes e trade-offs
- 2026-03-25 - Focar esta spec apenas nas superfícies documentais propagadas pelo `/target_prepare`, em vez de abrir uma revisão editorial ampla do repositório inteiro. Motivo: atacar diretamente a origem da propagação observada sem ampliar demais o escopo.
- 2026-03-25 - Manter `docs/workflows/target-prepare-manifest.json` sob regime de estabilidade contratual e concentrar a revisão textual humana no report e nas fontes documentais copiadas/mescladas. Motivo: preservar compatibilidade máquina-legível.

## Historico de atualizacao
- 2026-03-25 16:27Z - Versão inicial da spec criada a partir da revisão explícita das superfícies documentais propagadas pelo `/target_prepare`.
- 2026-03-25 16:36Z - Triagem inicial concluida; inventario/manifesto/blocos gerenciados classificados contra o estado atual do repositorio e dois tickets derivados abertos para cobrir as pendencias `copy-exact` e `runner-generated` remanescentes.
- 2026-03-25 16:56Z - Validacao final da triagem concluida; a spec permaneceu em `Status: approved` com `Spec treatment: pending`, com rastreabilidade mantida para os dois tickets abertos e sem gaps residuais no backlog derivado desta etapa.
