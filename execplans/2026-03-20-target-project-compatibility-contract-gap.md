# ExecPlan - contrato canonico de compatibilidade do projeto alvo

## Purpose / Big Picture
- Objetivo: materializar o contrato canonico que separa `projeto elegivel para descoberta` de `projeto compativel com o workflow completo`, alinhando a documentacao de onboarding do repositorio sem introduzir preflight semantico de runtime.
- Resultado esperado:
  - `docs/workflows/target-project-compatibility-contract.md` passa a existir como fonte normativa unica para o contrato de compatibilidade do projeto alvo;
  - `README.md` resume esse contrato como pre-requisito operacional do onboarding humano, aponta para a referencia canonica e deixa de sugerir derivacao direta `spec -> execplan`;
  - `AGENTS.md` ganha apenas um ponteiro curto para o contrato, preservando a politica de contexto enxuto descrita em `DOCUMENTATION.md`.
- Escopo:
  - criar o documento canonico em `docs/workflows/`;
  - ajustar o resumo de onboarding e de derivacao em `README.md`;
  - adicionar em `AGENTS.md` um ponteiro curto, sem duplicar a definicao normativa;
  - validar o fechamento estritamente pelos closure criteria do ticket.
- Fora de escopo:
  - alterar codigo do runner, prompts ou comportamento de `/run_specs`;
  - criar qualquer validacao semantica automatica de compatibilidade em runtime;
  - mexer em tickets irmaos da spec sobre orquestracao pre-run-all, anti-duplicacao pos-auditoria ou write-back da retrospectiva;
  - executar comandos de versionamento git manual (`git add`, `git commit`, `git push`, `git pull`, `git fetch`, `git ls-remote`).

## Progress
- [x] 2026-03-20 03:38Z - Ticket, spec de origem, `PLANS.md`, `docs/workflows/codex-quality-gates.md`, `DOCUMENTATION.md`, `README.md` e `AGENTS.md` lidos para o planejamento.
- [x] 2026-03-20 03:39Z - Documento canonico de compatibilidade criado em `docs/workflows/target-project-compatibility-contract.md`.
- [x] 2026-03-20 03:39Z - `README.md` ajustado para refletir o contrato operacional e a derivacao `spec -> tickets -> execplan`.
- [x] 2026-03-20 03:39Z - `AGENTS.md`, spec de origem e validacoes finais revisadas na mesma rodada documental.

## Surprises & Discoveries
- 2026-03-20 03:38Z - O gap e puramente documental: a spec de origem explicita que o runner atual nao faz preflight semantico de compatibilidade, entao o trabalho aqui e tornar esse contrato claro para humanos e para prompts futuros.
- 2026-03-20 03:38Z - `README.md` repete mais de uma vez a narrativa antiga de que `/run_specs` pode gerar `execplans` diretamente a partir da spec; a correcao precisa cobrir tanto a visao conceitual quanto os exemplos operacionais.
- 2026-03-20 03:38Z - `DOCUMENTATION.md` reforca que `AGENTS.md` deve ficar curto e apontar para a fonte canonica; isso limita deliberadamente o escopo da mudanca em `AGENTS.md`.
- 2026-03-20 03:39Z - A spec de origem tinha uma pendencia em aberto que ficaria semanticamente desatualizada apos a implementacao documental; foi necessario atualizar o documento vivo para registrar que o working tree ja cobre o gap antes da etapa separada de fechamento/versionamento.

## Decision Log
- 2026-03-20 - Decisao: tratar `docs/workflows/target-project-compatibility-contract.md` como unica definicao normativa do contrato de compatibilidade.
  - Motivo: RF-37 e `DOCUMENTATION.md` favorecem uma fonte de verdade unica, com `AGENTS.md` apenas apontando para ela.
  - Impacto: `README.md` e `AGENTS.md` devem resumir e apontar, sem copiar regras extensas.
- 2026-03-20 - Decisao: corrigir explicitamente no `README.md` a narrativa de derivacao para `spec -> tickets -> execplan` em vez de apenas adicionar um link novo.
  - Motivo: o closure criterion do ticket exige que a documentacao deixe de sugerir `execplans` diretos a partir da spec.
  - Impacto: a validacao precisa inspecionar os trechos conceituais e operacionais onde `/run_specs` ainda aparece associado a `execplans`.
- 2026-03-20 - Decisao: manter a compatibilidade do projeto alvo como pre-requisito operacional do onboarding humano, nunca como cheque semantico do runner.
  - Motivo: RF-40 e a spec de origem sao explicitos em evitar gasto de tokens com preflight semantico em runtime.
  - Impacto: o documento canonico deve orientar pessoas e fluxos documentais, nao introduzir novos passos de execucao automatizada.
- 2026-03-20 - Decisao: atualizar a spec de origem na mesma rodada documental, sem marcar ticket como fechado.
  - Motivo: o pedido de execucao exige atualizar artefatos vivos impactados quando o comportamento descrito muda, e a spec ficaria desatualizada se continuasse afirmando que o contrato ainda nao foi materializado.
  - Impacto: a rastreabilidade passa a distinguir implementacao no working tree de fechamento/versionamento do ticket.
- 2026-03-20 - Decisao: na etapa de fechamento, promover `GO` apenas com base nas evidencias documentais previstas no proprio ticket e no checklist compartilhado.
  - Motivo: o escopo aprovado e estritamente documental; ausencia de commit/push nesta etapa nao interfere no aceite tecnico/funcional.
  - Impacto: o ticket pode ser encerrado como `fixed` e preparado para o mesmo changeset de fechamento versionado pelo runner.

## Outcomes & Retrospective
- Status final: execucao documental e validacao de fechamento concluidas; ticket encerrado como `fixed` e preparado para versionamento posterior pelo runner.
- O que deve existir ao final:
  - contrato canonico curto e normativo em `docs/workflows/target-project-compatibility-contract.md`;
  - `README.md` coerente com o contrato de onboarding e com a derivacao `spec -> tickets -> execplan`;
  - `AGENTS.md` com ponteiro curto e sem duplicacao normativa.
- O que nao sera resolvido por este plano:
  - enforcement de compatibilidade em codigo;
  - migracao retroativa ampla de artefatos historicos nao tocados;
  - qualquer mudanca de comportamento do runner alem da documentacao.
- Proximos passos:
  - preservar os artefatos alterados para o commit/push posterior executado pelo runner;
  - manter este ExecPlan e a spec como registro vivo da implementacao ja validada no working tree;
  - nao executar comandos de versionamento manual nesta etapa.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-20-target-project-compatibility-contract-gap.md` - problema, escopo, closure criteria e fechamento validado.
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` - spec de origem com RF-37 a RF-42 e CA-18 a CA-20.
  - `docs/workflows/codex-quality-gates.md` - checklist compartilhado exigido para ExecPlan.
  - `PLANS.md` - estrutura e requisitos obrigatorios do plano.
  - `DOCUMENTATION.md` - politica que exige `AGENTS.md` curto e documento canonico como fonte de verdade.
  - `README.md` - onboarding publico e narrativa atual de `/run_specs`.
  - `AGENTS.md` - contexto auto-carregado que precisa receber apenas um ponteiro curto.
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- RFs/CAs cobertos por este plano:
  - RF-37, RF-38, RF-39, RF-40, RF-41, RF-42.
  - CA-18, CA-19, CA-20.
- Assumptions / defaults adotados:
  - `docs/workflows/target-project-compatibility-contract.md` e o caminho canonico definitivo para o contrato;
  - `projeto elegivel para descoberta` significa pronto para `/discover_spec` e `/plan_spec`, sem implicar preparo para o workflow completo;
  - `projeto compativel com o workflow completo` significa pronto para `/run_specs` e para o encadeamento operacional completo do runner;
  - compatibilidade do projeto alvo e responsabilidade de onboarding humano, nao uma validacao semantica automatizada do runner;
  - como `AGENTS.md` e auto-carregado, ele deve apontar para o contrato sem repetir definicoes normativas detalhadas;
  - a correcao do `README.md` deve cobrir as passagens tocadas pelo ticket, sem exigir reescrita integral do documento.
- Fluxo atual relevante:
  - a spec de origem ja consolidou o contrato canonico de derivacao como `spec -> tickets` e `ticket -> execplan` quando necessario;
  - `README.md` ainda mistura essa regra com a narrativa antiga de que a triagem da spec pode gerar `execplans` diretamente;
  - `AGENTS.md` nao aponta para nenhum contrato de compatibilidade do projeto alvo.
- Restricoes tecnicas:
  - manter o plano estritamente documental;
  - seguir a politica de documentacao da raiz;
  - nao inflar `AGENTS.md`;
  - toda validacao deve derivar dos closure criteria do ticket, nao de checklist generico.

## Plan of Work
- Milestone 1: definir a fonte de verdade do contrato de compatibilidade.
  - Entregavel: `docs/workflows/target-project-compatibility-contract.md` criado com definicoes claras para `projeto elegivel para descoberta` e `projeto compativel com o workflow completo`, incluindo a regra de que a compatibilidade e pre-requisito operacional e nao validacao semantica de runtime.
  - Evidencia de conclusao: leitura do arquivo mostra as duas categorias, os comandos/fluxos aplicaveis e a restricao de nao gastar tokens com preflight semantico.
  - Arquivos esperados: `docs/workflows/target-project-compatibility-contract.md`.
- Milestone 2: alinhar as superfices de onboarding publico.
  - Entregavel: `README.md` atualizado para apontar para o contrato canonico, resumir o pre-requisito operacional e substituir a narrativa antiga por `spec -> tickets -> execplan`.
  - Evidencia de conclusao: os trechos de `/run_specs` e de fluxo de derivacao deixam de sugerir `execplans` diretos a partir da spec e passam a apontar para o documento canonico.
  - Arquivos esperados: `README.md`.
- Milestone 3: alinhar o contexto auto-carregado sem duplicacao.
  - Entregavel: `AGENTS.md` com um ponteiro curto para o contrato de compatibilidade, coerente com `DOCUMENTATION.md`.
  - Evidencia de conclusao: `AGENTS.md` menciona o contrato e seu path canonico, mas nao replica definicoes extensas nem checklist detalhado.
  - Arquivos esperados: `AGENTS.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,240p' tickets/closed/2026-03-20-target-project-compatibility-contract-gap.md` para reler o ticket e confirmar os closure criteria registrados.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '120,180p' docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` para fixar RF-37 a RF-42 e CA-18 a CA-20 como contrato de origem.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' DOCUMENTATION.md` para relembrar a restricao de manter `AGENTS.md` curto e transferir o conteudo normativo para documento canonico.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar com `apply_patch` o arquivo `docs/workflows/target-project-compatibility-contract.md`, cobrindo:
   - definicao de `projeto elegivel para descoberta`;
   - definicao de `projeto compativel com o workflow completo`;
   - quais fluxos (`/discover_spec`, `/plan_spec`, `/run_specs`, workflow completo) dependem de cada categoria;
   - explicacao explicita de que compatibilidade e pre-requisito operacional do onboarding humano, nao validacao semantica de runtime.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "run_specs|execplans|discover_spec|plan_spec|compatib" README.md` para localizar todas as passagens do `README.md` que ainda conflitam com o contrato aprovado.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `README.md` para:
   - inserir um resumo curto do contrato de compatibilidade com link para `docs/workflows/target-project-compatibility-contract.md`;
   - trocar a narrativa de derivacao para `spec -> tickets -> execplan`;
   - remover dos trechos tocados a sugestao de que a triagem da spec gera `execplans` diretamente.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `AGENTS.md` para adicionar apenas um ponteiro curto para `docs/workflows/target-project-compatibility-contract.md`, sem duplicar o texto normativo do novo documento.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "target-project-compatibility-contract|pre-requisito operacional|validacao semantica|spec -> tickets|ticket -> execplan" docs/workflows/target-project-compatibility-contract.md README.md AGENTS.md` para confirmar a presenca dos conceitos centrais exigidos pelo ticket.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "gerar execplans|gera execplans|tickets em \`tickets/open/\` e/ou gerar execplans|triagem pode abrir tickets em \`tickets/open/\` e/ou gerar execplans" README.md` para confirmar que a narrativa antiga deixou de existir nos trechos ajustados.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- docs/workflows/target-project-compatibility-contract.md README.md AGENTS.md` para auditar o escopo final antes da etapa de implementacao/fechamento do ticket.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-37, RF-38, RF-39, RF-40; CA-18.
  - Evidencia observavel: existe um documento canonico em `docs/workflows/target-project-compatibility-contract.md` diferenciando `projeto elegivel para descoberta` de `projeto compativel com o workflow completo`, explicando que `/discover_spec` e `/plan_spec` operam na primeira categoria, que `/run_specs` e o workflow completo pressupoem a segunda, e que isso e pre-requisito operacional do onboarding humano, nao validacao semantica de runtime.
  - Comando: `sed -n '1,240p' docs/workflows/target-project-compatibility-contract.md`
  - Esperado: o arquivo existe e contem explicitamente as duas categorias, os fluxos associados e a restricao contra preflight semantico em runtime.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-41; CA-19.
  - Evidencia observavel: `README.md` resume o contrato de compatibilidade, aponta para o documento canonico e deixa claro que a compatibilidade do projeto alvo e pre-requisito operacional do onboarding humano.
  - Comando: `rg -n "target-project-compatibility-contract|pre-requisito operacional|validacao semantica" README.md`
  - Esperado: ha trechos no `README.md` apontando para o documento canonico e descrevendo a compatibilidade como pre-requisito operacional, nao como cheque semantico do runner.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: RF-41, RF-42; CA-19, CA-20.
  - Evidencia observavel: o `README.md` e `AGENTS.md` alinham o contrato de derivacao com `spec -> tickets -> execplan`, e `AGENTS.md` faz apenas um apontamento curto para o documento canonico.
  - Comando: `rg -n "spec -> tickets|ticket -> execplan|target-project-compatibility-contract" README.md AGENTS.md`
  - Esperado: `README.md` reflete a derivacao correta e `AGENTS.md` referencia o contrato canonico sem reproduzir definicoes extensas.
- Matriz requisito -> validacao observavel:
  - Requisitos cobertos: closure criterion adicional do ticket sobre narrativa de derivacao.
  - Evidencia observavel: os trechos ajustados do `README.md` deixam de sugerir derivacao direta `spec -> execplan`.
  - Comando: `rg -n "gerar execplans|gera execplans|tickets em \`tickets/open/\` e/ou gerar execplans|triagem pode abrir tickets em \`tickets/open/\` e/ou gerar execplans" README.md`
  - Esperado: nenhum match nos trechos narrativos antigos que ligavam a triagem da spec diretamente a `execplans`.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a execucao deve apenas atualizar o mesmo documento canonico e os mesmos trechos de `README.md`/`AGENTS.md`, sem criar duplicacao de secoes ou links;
  - a inclusao do ponteiro em `AGENTS.md` deve ser feita em local unico e estavel para evitar repeticao em reruns;
  - como o trabalho e documental, repetir as validacoes deve produzir o mesmo resultado observavel sem side effects.
- Riscos:
  - escrever um contrato amplo demais em `AGENTS.md`, violando `DOCUMENTATION.md`;
  - atualizar `README.md` em apenas um trecho e deixar outra passagem relevante sugerindo `spec -> execplan`;
  - transformar o documento canonico em checklist operacional longo demais, em vez de contrato curto e normativo;
  - usar wording ambiguo que pareca introduzir validacao automatica de compatibilidade.
- Recovery / Rollback:
  - se o novo documento ficar prolixo, enxugar e mover detalhes excedentes para exemplos minimos, preservando a regra normativa central;
  - se aparecer mais de uma passagem conflitante no `README.md`, ampliar a busca por termos relacionados e corrigir todas no mesmo changeset;
  - se `AGENTS.md` crescer alem de um ponteiro curto, reduzir o texto e deixar apenas a referencia ao documento canonico;
  - se surgir ambiguidade entre elegibilidade para descoberta e compatibilidade completa, voltar a redacao da spec de origem como contrato de desempate.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-20-target-project-compatibility-contract-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`
- Referencias lidas no planejamento:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `README.md`
  - `AGENTS.md`
  - `INTERNAL_TICKETS.md`
  - `execplans/2026-03-20-separacao-do-gate-funcional-e-write-back-da-retrospectiva-da-derivacao-gap.md`
  - `execplans/2026-03-20-spec-ticket-derivation-retrospective-pre-run-all-orquestracao-gap.md`
- Checklist aplicado (`docs/workflows/codex-quality-gates.md`):
  - ticket inteiro e referencias obrigatorias lidos antes de planejar;
  - spec de origem, RFs/CAs e assumptions/defaults explicitados;
  - closure criteria convertidos em matriz `requisito -> validacao observavel`;
  - riscos residuais e nao-escopo declarados;
  - validacoes derivadas do fechamento do ticket, nao de checklist generico.
- Observacao operacional:
  - este plano nao depende de comandos `node`/`npm`/`npx`; se a execucao futura introduzir algum, deve repetir o prefixo de ambiente exigido pelo host.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato documental em `docs/workflows/target-project-compatibility-contract.md`;
  - onboarding e narrativa de derivacao em `README.md`;
  - contexto auto-carregado em `AGENTS.md`.
- Compatibilidade:
  - preservar o contrato canonico de derivacao `spec -> tickets` e `ticket -> execplan` quando necessario;
  - manter `/discover_spec` e `/plan_spec` como fluxos validos para projeto elegivel para descoberta;
  - manter `/run_specs` e o workflow completo dependentes de projeto previamente compativel com o workflow completo;
  - nao introduzir enforcement de runtime.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova;
  - nenhuma fixture ou mock de codigo necessaria;
  - dependencia principal e a consistencia textual com a spec de origem e com `DOCUMENTATION.md`.
