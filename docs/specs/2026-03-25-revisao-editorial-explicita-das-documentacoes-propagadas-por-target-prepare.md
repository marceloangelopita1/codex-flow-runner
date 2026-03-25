# [SPEC] Revisão editorial explícita das documentações propagadas por `/target_prepare`

## Metadata
- Spec ID: 2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-25 16:27Z
- Last reviewed at (UTC): 2026-03-25 16:27Z
- Source: operational-gap
- Related tickets:
  - nenhum
- Related execplans:
  - nenhum
- Related commits:
  - nenhum
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

## Retrospectiva sistemica da derivacao dos tickets
- Executada: n/a
- Motivo de ativacao ou skip:
  - n/a
- Classificacao final:
  - n/a
- Confianca:
  - n/a
- Frente causal analisada:
  - n/a
- Achados sistemicos:
  - n/a
- Artefatos do workflow consultados:
  - `DOCUMENTATION.md`
  - `SPECS.md`
  - `src/types/target-prepare.ts`
  - `src/core/target-prepare.ts`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `docs/workflows/target-prepare-managed-agents-section.md`
  - `docs/workflows/target-prepare-managed-readme-section.md`
- Elegibilidade de publicacao:
  - n/a
- Resultado do ticket transversal ou limitacao operacional:
  - n/a
- Nota de uso: esta seção permanece `n/a` até que a spec participe de `/run_specs`.
- Politica anti-duplicacao: quando esta spec gerar execução futura, a retrospectiva sistêmica deve focar na causa-raiz da derivação e não repetir a própria descrição do problema editorial já consolidada aqui.

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
- Pendencias em aberto:
  - corrigir editorialmente as superfícies em escopo;
  - validar a propagação corrigida em smoke de `/target_prepare`;
  - derivar ticket(s) futuros somente quando houver decisão de execução.
- Evidencias de validacao:
  - leitura de `src/types/target-prepare.ts` para enumerar `TARGET_PREPARE_EXACT_COPY_SOURCES` e `TARGET_PREPARE_MERGED_FILE_SOURCES`;
  - leitura de `src/core/target-prepare.ts` para identificar a geração textual de `docs/workflows/target-prepare-report.md` e o contrato do manifesto;
  - releitura das documentações canônicas atualmente propagadas pelo fluxo para confirmar a presença de inconsistências editoriais e de acentuação;
  - validação de que esta spec nasce apenas como alinhamento documental, sem ticket derivado aberto nesta rodada.

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
