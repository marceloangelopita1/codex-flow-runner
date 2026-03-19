# ExecPlan - Alinhar contrato canonico spec -> tickets e qualidade por token

## Purpose / Big Picture
- Objetivo: corrigir a documentacao canonica, o template de spec e o prompt de triagem para refletirem sem ambiguidade o contrato `spec -> tickets` e `ticket -> execplan quando necessario`, explicitar a diretriz transversal de qualidade por token e registrar a politica de migracao historica limitada.
- Resultado esperado:
  - `AGENTS.md`, `SPECS.md` e `docs/workflows/discover-spec.md` deixam de autorizar `spec -> execplan` direto;
  - `AGENTS.md` e docs de workflow relacionadas passam a conter textualmente `Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.`;
  - `docs/specs/templates/spec-template.md` passa a orientar o gate de validacao dos tickets derivados e a politica de migracao historica limitada;
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` reforca o contrato ticket-first sem abrir excecao para `execplan` direto a partir da spec.
- Escopo:
  - alinhar os documentos canonicos e de workflow explicitamente referenciados no ticket;
  - atualizar o template oficial de spec para o gate de validacao e para a politica documental aprovada;
  - ajustar o prompt canonico de triagem de spec para manter o contrato documental coerente com a spec aprovada.
- Fora de escopo:
  - alterar codigo de runtime, runner, Telegram, parser ou testes automatizados;
  - migrar retroativamente em massa specs, tickets ou execplans historicos;
  - fechar o ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa;
  - revisar prompts que ja estao coerentes com `ticket -> execplan` e nao conflitam com o ticket atual, salvo descoberta objetiva durante a execucao.

## Progress
- [x] 2026-03-19 17:10Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, `DOCUMENTATION.md`, `docs/workflows/codex-quality-gates.md` e das referencias documentais/prompt.
- [x] 2026-03-19 17:18Z - `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md` e `docs/workflows/codex-quality-gates.md` alinhados ao contrato `spec -> tickets`, a `ticket -> execplan quando necessario` e a frase oficial de qualidade por token.
- [x] 2026-03-19 17:18Z - `docs/specs/templates/spec-template.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` atualizados com gate de validacao, reforco ticket-first e politica de migracao historica limitada.
- [x] 2026-03-19 17:18Z - Validacao textual final executada com `rg` focado e `git diff`, confirmando presenca do contrato aprovado, ausencia do contrato antigo no escopo planejado e diff restrito ao pacote documental.
- [x] 2026-03-19 17:22Z - Etapa separada de fechamento confirmou `GO`, moveu o ticket para `tickets/closed/` e atualizou referencias cruzadas da spec/execplans para o novo caminho.

## Surprises & Discoveries
- 2026-03-19 17:10Z - A contradicao textual `spec -> execplan` apareceu apenas em `AGENTS.md`, `SPECS.md` e `docs/workflows/discover-spec.md`, o que reduz o escopo de limpeza canonica.
- 2026-03-19 17:10Z - `prompts/01-avaliar-spec-e-gerar-tickets.md` ja materializa tickets em `tickets/open/`; o ajuste ali e de reforco contratual e de alinhamento semantico, nao de inversao de comportamento.
- 2026-03-19 17:10Z - Nenhuma das referencias documentais do ticket hoje contem a frase oficial de qualidade por token nem a politica explicita de migracao historica limitada.
- 2026-03-19 17:10Z - `DOCUMENTATION.md` restringe o crescimento do `AGENTS.md`, entao a frase oficial precisa entrar ali de forma curta e os detalhes operacionais devem ficar concentrados em `SPECS.md` e nos workflows.
- 2026-03-19 17:18Z - O pacote minimo previsto no plano foi suficiente: nenhuma outra superficie fora de `AGENTS.md`, `SPECS.md`, workflows, template e prompt precisou ser alterada para satisfazer os closure criteria documentais.
- 2026-03-19 17:18Z - A validacao negativa do contrato antigo retornou zero matches no escopo auditado, o que confirmou que a remocao da permissao `spec -> execplan` direto nao exigiu rodada adicional de wording.
- 2026-03-19 17:22Z - O fechamento exigiu tambem normalizar referencias cruzadas para o novo caminho em `tickets/closed/`, incluindo a spec de origem e execplans correlatos, para evitar links quebrados apos o versionamento.

## Decision Log
- 2026-03-19 - Decisao: tratar `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/workflows/codex-quality-gates.md`, `docs/specs/templates/spec-template.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` como o pacote minimo desta correcao.
  - Motivo: sao as superficies citadas direta ou indiretamente pelo ticket e pela spec, e cobrem contrato canonico, workflow, template e prompt de triagem sem abrir escopo documental desnecessario.
  - Impacto: a mudanca permanece autocontida e nao exige varredura ampla em artefatos historicos.
- 2026-03-19 - Decisao: manter `AGENTS.md` enxuto, inserindo apenas a formulacao obrigatoria e a regra curta de derivacao, enquanto `SPECS.md` e os workflows carregam o detalhe operacional.
  - Motivo: `DOCUMENTATION.md` proibe inflar o contexto auto-carregado com racional e checklist longos.
  - Impacto: o repositorio ganha um contrato univoco sem degradar a qualidade do contexto carregado automaticamente.
- 2026-03-19 - Decisao: validar este ticket apenas com evidencias textuais/diff, sem `npm test`, `npm run check` ou `npm run build`.
  - Motivo: os closure criteria tratam exclusivamente de conteudo documental e nao exigem alteracao de comportamento de runtime.
  - Impacto: a matriz de validacao sera feita por `rg` focado e auditoria de diff, reduzindo custo e mantendo aderencia ao ticket.
- 2026-03-19 - Decisao: nao editar a spec de origem nesta etapa.
  - Motivo: o contrato ja estava correto na spec `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`; este ticket implementa o alinhamento das superficies canonicas derivadas, e o ticket permanece aberto ate a etapa separada de fechamento.
  - Impacto: o changeset fica restrito ao escopo documental planejado sem antecipar mudancas de status/fechamento da spec.
- 2026-03-19 - Decisao: na etapa separada de fechamento, atualizar a spec de origem e as referencias cruzadas dos execplans para o caminho final em `tickets/closed/`.
  - Motivo: mover o ticket sem ajustar os apontamentos deixaria links quebrados e estado documental inconsistente no mesmo changeset.
  - Impacto: o fechamento permanece restrito a rastreabilidade e consistencia, sem ampliar o escopo funcional do ticket.

## Outcomes & Retrospective
- Status final: execucao documental, validacao textual e etapa separada de fechamento concluidas; ticket validado como `GO` e movido para `tickets/closed/`.
- O que precisa existir ao final:
  - contrato `spec -> tickets` e `ticket -> execplan quando necessario` escrito de forma consistente nas superficies canonicas;
  - frase oficial de qualidade por token presente em `AGENTS.md` e nos workflows relacionados;
  - template de spec com secao/orientacao para `Gate de validacao dos tickets derivados` e nota de migracao historica limitada;
  - prompt de triagem impedindo ambiguidade sobre `execplan` direto a partir da spec.
- O que fica pendente fora deste plano:
  - qualquer migracao manual de artefatos historicos ja existentes que nao sejam tocados por este ticket;
  - revisao de outros prompts/documentos nao citados aqui, caso nao apresentem contradicao objetiva.
- Proximos passos:
  - runner versionar o mesmo changeset de fechamento preparado nesta etapa.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `AGENTS.md`
  - `SPECS.md`
  - `docs/workflows/discover-spec.md`
  - `docs/specs/templates/spec-template.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
- Spec de origem: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-04, RF-05, RF-06, RF-07, RF-28
  - CA-02, CA-03, CA-18, CA-20
- Assumptions / defaults adotados:
  - o contrato oficial passa a ser somente `spec -> tickets` na triagem inicial, com `ticket -> execplan quando necessario` em etapa posterior;
  - `prompts/02-criar-execplan-para-ticket.md` e os prompts de fechamento/auditoria permanecem fora do escopo porque ja operam a partir de ticket ou de execplan existente, nao de spec crua;
  - a frase oficial de qualidade por token deve aparecer literalmente em `AGENTS.md`, `docs/workflows/discover-spec.md` e `docs/workflows/codex-quality-gates.md`;
  - `AGENTS.md` deve receber apenas o minimo necessario para obedecer ao ticket e a `DOCUMENTATION.md`; racional, checklist e exemplos ficam nas docs canonicas/workflows;
  - a politica de migracao historica limitada deve ser escrita onde governa o processo futuro (`SPECS.md`, workflows e template), sem disparar edicao retroativa em massa;
  - a validacao deste ticket e puramente documental e deve provar ausencia/presenca de texto, nao comportamento de runtime.
- Fluxo atual relevante (as-is):
  - `AGENTS.md`, `SPECS.md` e `docs/workflows/discover-spec.md` ainda autorizam `execplan` direto quando o escopo da spec esta claro.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` ja cria tickets, mas nao explicita o contrato como regra canonica nem reforca a ausencia de excecao para `execplan` direto.
  - `docs/specs/templates/spec-template.md` ainda nao orienta explicitamente a secao `Gate de validacao dos tickets derivados` nem a politica de migracao historica limitada.
  - `docs/workflows/codex-quality-gates.md` ja e a referencia compartilhada de qualidade do workflow e o melhor lugar para carregar a diretriz transversal sem inflar `AGENTS.md`.
- Restricoes tecnicas/documentais:
  - manter os arquivos em ASCII, seguindo o padrao atual do repositorio;
  - evitar duplicacao desnecessaria entre `AGENTS.md` e documentos canonicos, conforme `DOCUMENTATION.md`;
  - preservar o fluxo sequencial do projeto e a regra `ticket -> execplan` sem introduzir alternativas paralelas;
  - toda validacao precisa se apoiar apenas nos closure criteria do ticket.

## Plan of Work
- Milestone 1: Normalizar o contrato canonico nas docs de maior autoridade.
  - Entregavel: `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md` e `docs/workflows/codex-quality-gates.md` passam a descrever o mesmo contrato `spec -> tickets` e a mesma diretriz de qualidade por token.
  - Evidencia de conclusao: buscas textuais mostram o contrato aprovado e a frase oficial; buscas por `execplan direto` deixam de retornar ocorrencias nas superfices canonicas conflitantes.
  - Arquivos esperados: `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/workflows/codex-quality-gates.md`
- Milestone 2: Atualizar os artefatos derivados que guiam novas specs e novas triagens.
  - Entregavel: o template oficial de spec passa a orientar `Gate de validacao dos tickets derivados` e a politica de migracao historica limitada; o prompt de triagem reforca que a derivacao inicial cria apenas tickets e mantem a rastreabilidade exigida.
  - Evidencia de conclusao: `docs/specs/templates/spec-template.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` mostram explicitamente o contrato ticket-first e o gate/nota historica esperados.
  - Arquivos esperados: `docs/specs/templates/spec-template.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`
- Milestone 3: Provar o fechamento documental sem ruido fora do escopo.
  - Entregavel: matriz de validacao executada por busca textual e diff focado, demonstrando atendimento integral dos closure criteria do ticket.
  - Evidencia de conclusao: comandos `rg` e `git diff --` produzem a presenca/ausencia exata esperada para contrato, frase oficial e politica historica.
  - Arquivos esperados: diff final restrito aos seis arquivos documentais/prompt planejados.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`, `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`, `DOCUMENTATION.md` e `docs/workflows/codex-quality-gates.md` para confirmar wording exato antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `AGENTS.md` para:
   - substituir a permissao de `execplan` direto por `spec -> tickets` e `ticket -> execplan quando necessario`;
   - inserir de forma curta a frase oficial `Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.`;
   - manter o arquivo curto e sem duplicar explicacoes longas que pertencem a docs referenciadas.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `SPECS.md` para:
   - corrigir a regra de derivacao para criar apenas tickets a partir da spec;
   - declarar explicitamente que `ExecPlan` nasce de ticket quando necessario;
   - registrar que artefatos historicos so exigem ajuste quando forem tocados depois ou quando houver impacto funcional real.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `docs/workflows/discover-spec.md` para:
   - alinhar a secao `Relacao com o restante do fluxo` ao contrato `spec -> tickets`;
   - inserir a frase oficial de qualidade por token em contexto operacional do workflow;
   - explicitar que a materializacao/descoberta da spec nao dispara `execplan` direto.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `docs/workflows/codex-quality-gates.md` para:
   - adicionar a diretriz transversal de qualidade por token nos principios do workflow;
   - registrar que alinhamentos canonicos/template/prompt nao exigem migracao retroativa em massa do historico, salvo artefato tocado ou impacto funcional real;
   - manter o documento como referencia compartilhada, sem transformar o checklist em closure criterion.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `docs/specs/templates/spec-template.md` para:
   - adicionar secao `## Gate de validacao dos tickets derivados` ou orientacao equivalente claramente aplicavel;
   - orientar o preenchimento de veredito, gaps, correcoes, causa-raiz e ciclos quando o fluxo `/run_specs` for usado;
   - registrar no proprio template a nota de politica historica limitada, deixando claro que nao existe migracao retroativa em massa por padrao.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `prompts/01-avaliar-spec-e-gerar-tickets.md` para:
   - reforcar que a derivacao inicial da spec cria apenas tickets em `tickets/open/`, mesmo quando o escopo ja estiver claro;
   - explicitar que `execplan` so pode surgir depois, a partir de ticket, quando necessario;
   - manter as instrucoes de RFs/CAs, assumptions/defaults e closure criteria observaveis coerentes com o contrato aprovado.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n 'spec -> tickets|ticket -> execplan|apenas tickets|tickets/open/' AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md` para confirmar a presenca do contrato canonico e do fluxo ticket-first nas superfices esperadas.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n 'execplan direto|criar execplan direto|derivar execplan em `execplans/` quando o escopo' AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md` e confirmar ausencia de matches remanescentes do contrato antigo.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -nF 'Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.' AGENTS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md` para provar a presenca textual exata da diretriz transversal.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n 'material historico|migracao retroativa em massa|tocado depois|impacto funcional real' SPECS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md docs/specs/templates/spec-template.md` para confirmar a politica de migracao historica limitada nas superfices canonicas/derivadas selecionadas.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md` para auditoria final do escopo, verificando que o changeset ficou restrito ao contrato documental e nao introduziu ruido fora do ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-04, RF-05, RF-06; CA-02, CA-03
    - Evidencia observavel: `AGENTS.md`, `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/specs/templates/spec-template.md` e `prompts/01-avaliar-spec-e-gerar-tickets.md` passam a afirmar o contrato `spec -> tickets` e `ticket -> execplan quando necessario`, sem permissao remanescente de `spec -> execplan` direto.
    - Comando: `rg -n 'spec -> tickets|ticket -> execplan|apenas tickets|tickets/open/' AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md`
    - Esperado: matches relevantes nos cinco arquivos, mostrando a regra canonica e a triagem ticket-first.
    - Comando: `rg -n 'execplan direto|criar execplan direto|derivar execplan em `execplans/` quando o escopo' AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md`
    - Esperado: nenhum match para a permissao antiga de `spec -> execplan` direto.
  - Requisito: RF-07; CA-18
    - Evidencia observavel: `AGENTS.md`, `docs/workflows/discover-spec.md` e `docs/workflows/codex-quality-gates.md` contem textualmente a formulacao oficial de qualidade por token.
    - Comando: `rg -nF 'Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.' AGENTS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md`
    - Esperado: um match por arquivo, sem variacoes textuais da frase oficial.
  - Requisito: RF-28; CA-20
    - Evidencia observavel: `SPECS.md`, `docs/workflows/discover-spec.md`, `docs/workflows/codex-quality-gates.md` e `docs/specs/templates/spec-template.md` deixam explicito que material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real, sem exigir migracao retroativa em massa.
    - Comando: `rg -n 'material historico|migracao retroativa em massa|tocado depois|impacto funcional real' SPECS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md docs/specs/templates/spec-template.md`
    - Esperado: matches nessas superfices descrevendo a politica historica limitada com wording compativel ao ticket.
- Comando complementar de auditoria: `git diff -- AGENTS.md SPECS.md docs/workflows/discover-spec.md docs/workflows/codex-quality-gates.md docs/specs/templates/spec-template.md prompts/01-avaliar-spec-e-gerar-tickets.md`
  - Esperado: diff restrito ao pacote documental/prompt planejado, sem alteracoes de codigo ou mudancas fora do closure criterion.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os `apply_patch` deve convergir para o mesmo wording final, sem duplicar bullets, secoes ou notas no template;
  - os comandos `rg` de validacao devem continuar retornando a mesma presenca/ausencia se o ticket ja estiver corretamente aplicado;
  - o diff final deve permanecer restrito as superfices documentais declaradas.
- Riscos:
  - inserir a frase oficial em `AGENTS.md` com texto divergente do requerido e falhar no `match` exato do closure criterion;
  - espalhar detalhes demais em `AGENTS.md` e violar `DOCUMENTATION.md`;
  - criar wording inconsistente entre docs, por exemplo um arquivo dizer `ticket -> execplan` e outro omitir `quando necessario`;
  - redigir a politica historica de modo a sugerir migracao retroativa em massa.
- Recovery / Rollback:
  - apos cada bloco de edicao, rodar o `rg` correspondente antes de seguir para o proximo arquivo; se houver divergencia textual, corrigir imediatamente em vez de acumular drift;
  - se `AGENTS.md` crescer alem do necessario, reduzir o texto ao contrato + frase oficial e mover explicacoes para `SPECS.md`/workflows;
  - se o template ficar ambiguo sobre migracao historica, reescrever a nota para limitar explicitamente a correcao a artefatos tocados depois ou com impacto funcional real;
  - se surgir outro documento com contradicao objetiva durante a execucao, registrar em `Surprises & Discoveries` e decidir entre inclui-lo no mesmo changeset (se pequeno e diretamente ligado ao closure criterion) ou abrir follow-up.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`
- Spec de origem:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Checklist aplicado no planejamento:
  - leitura integral do ticket e de todas as referencias obrigatorias;
  - declaracao explicita de spec de origem, RFs/CAs cobertos e assumptions/defaults;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - declaracao de riscos residuais, fora de escopo e estrategia de recuperacao.
- Referencias tecnicas/documentais consumidas:
  - `AGENTS.md`
  - `SPECS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/codex-quality-gates.md`
  - `docs/specs/templates/spec-template.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
- Achados objetivos que guiam a execucao:
  - a permissao explicita de `spec -> execplan` direto hoje aparece apenas em `AGENTS.md`, `SPECS.md` e `docs/workflows/discover-spec.md`;
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` ja cria tickets, entao o ajuste ali e de reforco contratual;
  - a frase oficial de qualidade por token e a politica historica limitada ainda nao aparecem nas superfices referenciais do ticket.
- Artefatos esperados ao final da execucao:
  - diff documental enxuto nas seis superfices planejadas;
  - nenhuma alteracao de codigo de runtime;
  - evidencias textuais usadas no fechamento do ticket e prontas para versionamento pelo runner.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato auto-carregado em `AGENTS.md`;
  - contrato canonico de derivacao e manutencao em `SPECS.md`;
  - workflow de descoberta em `docs/workflows/discover-spec.md`;
  - referencia compartilhada de qualidade em `docs/workflows/codex-quality-gates.md`;
  - template oficial de spec em `docs/specs/templates/spec-template.md`;
  - prompt canonico de triagem em `prompts/01-avaliar-spec-e-gerar-tickets.md`.
- Compatibilidade:
  - nenhuma API, schema de runtime ou comportamento de producao sera alterado neste ticket;
  - a mudanca e compatível com o fluxo sequencial existente e reduz ambiguidade para derivacoes futuras;
  - `prompts/02-criar-execplan-para-ticket.md` continua sendo o ponto correto para gerar ExecPlan, preservando o contrato `ticket -> execplan`.
- Dependencias externas e mocks:
  - nao ha dependencias externas, mocks ou chamadas de rede;
  - a execucao depende apenas do wording aprovado no ticket, na spec de origem e nas docs canonicas citadas.
