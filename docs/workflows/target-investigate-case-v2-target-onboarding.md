# Onboarding canônico de projeto alvo para `target-investigate-case-v2`

## Objetivo
Este guia existe para tornar a compatibilização de projetos alvo com `target-investigate-case-v2` explícita, auditável, versionada e reutilizável.

Compatibilização de target não pode depender de conversa anterior, memória humana ou prompt solto em chat. A v2 foi desenhada como `diagnosis-first`: o caminho principal precisa responder o caso com clareza e baixo custo cognitivo antes de qualquer continuação opcional.

Use este documento quando um projeto alvo for aderir à v2 pela primeira vez ou quando uma IA futura precisar revisar se a compatibilização continua correta.

## Princípios do contrato
### Runner target-agnostic
O `codex-flow-runner` orquestra a rodada, injeta contexto operacional, valida contrato, persiste rastreabilidade e executa as etapas na ordem certa. Ele não deve aprender semântica específica do target.

### Target como autoridade semântica
O projeto alvo é quem conhece o workflow real, a semântica do caso, os identificadores válidos, os scripts úteis, os logs relevantes, os dados confiáveis e o framing correto do diagnóstico.

### Caminho mínimo primeiro
Na primeira onda, o target precisa deixar sólido apenas:
- `preflight`
- `resolve-case`
- `assemble-evidence`
- `diagnosis`

### Continuações opcionais depois
`deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` existem como extensões tardias. Elas não podem virar pré-requisito para responder o caso.

### Publication tardia
`publication` permanece runner-side, conservadora e posterior ao diagnóstico. O target pode fornecer a autoridade semântica do conteúdo, mas não substitui a decisão final runner-side.

### Namespace autoritativo no target
O namespace autoritativo da rodada vive no projeto alvo em `output/case-investigation/<round-id>`. O espelho em `investigations/<round-id>` é secundário e não deve virar segunda autoridade semântica.

## O que o target precisa implementar na primeira onda
Todos os arquivos abaixo vivem no repositório do projeto alvo, com estes nomes canônicos:

1. `docs/workflows/target-case-investigation-v2-manifest.json`
2. `docs/workflows/target-case-investigation-v2-runbook.md`
3. `docs/workflows/target-investigate-case-v2-resolve-case.md`
4. `docs/workflows/target-investigate-case-v2-assemble-evidence.md`
5. `docs/workflows/target-investigate-case-v2-diagnosis.md`

Se o target tiver comandos ou scripts oficiais, eles podem ser declarados no manifesto desde a primeira onda. Se ainda não existirem, os prompts precisam ser claros o suficiente para orientar uma execução segura sem fallback implícito.

## O que cada arquivo deve fazer
### `docs/workflows/target-case-investigation-v2-manifest.json`
É a fonte de verdade do contrato entre runner e target.

Ele deve declarar, no mínimo:
- `flow = "target-investigate-case-v2"`
- `command = "/target_investigate_case_v2"`
- `roundDirectories.authoritative = "output/case-investigation/<round-id>"`
- `roundDirectories.mirror = "investigations/<round-id>"`
- `minimumPath = ["preflight", "resolve-case", "assemble-evidence", "diagnosis"]`
- `stages.resolveCase`
- `stages.assembleEvidence`
- `stages.diagnosis`
- `publicationPolicy`

Boas regras para o manifesto:
- o `promptPath` de cada estágio deve usar o nome canônico esperado pelo contrato;
- cada estágio target-owned precisa declarar `promptPath`, `entrypoint` ou ambos;
- se o target ainda não suportar um estágio opcional, não declare esse estágio;
- `supportingArtifacts.prompts` deve listar apenas os prompts realmente existentes;
- `supportingArtifacts.docs[0]` deve ser o runbook `docs/workflows/target-case-investigation-v2-runbook.md`, porque o runner hoje trata a primeira entrada de `docs` como referência operacional principal da capability;
- `ticketPublicationPolicy` só deve aparecer quando `ticket-projection` já estiver realmente suportado.

### `docs/workflows/target-case-investigation-v2-runbook.md`
É o mapa operacional estável da capability no target.

Ele deve responder:
- qual workflow real está sendo investigado naquele domínio;
- quais identificadores e referências de entrada costumam chegar;
- quais superfícies de dados podem ser consultadas com segurança;
- quais scripts, comandos ou ferramentas oficiais existem;
- como diferenciar execução local, remota, em nuvem ou em ambientes distintos;
- quais blockers precisam ser explicitados em vez de contornados.

O runbook não substitui os prompts por estágio. Ele dá contexto operacional durável para que os prompts sejam mais curtos, mais específicos e menos dependentes de conhecimento tácito.

### `docs/workflows/target-investigate-case-v2-resolve-case.md`
É o prompt responsável por transformar referências de entrada em um caso resolvido com precisão.

Ele deve instruir a IA a:
- identificar qual execução, request, attempt, job ou rodada está sendo investigada;
- desambiguar referências com critérios explícitos;
- registrar blocker explícito quando não houver resolução segura;
- produzir `case-resolution.json` sem adivinhar silenciosamente.

Ele não deve virar um prompt de coleta ampla. O objetivo aqui é localizar o caso certo, não montar o diagnóstico inteiro.

### `docs/workflows/target-investigate-case-v2-assemble-evidence.md`
É o prompt operacional mais importante da primeira onda.

Ele deve instruir a IA a:
- decidir quais evidências são necessárias para aquele caso;
- explicar onde essas evidências ficam naquele target;
- indicar como usar scripts, banco, logs locais, logs remotos, APIs, dashboards ou arquivos;
- diferenciar coleta local e remota quando isso mudar o procedimento;
- salvar ou referenciar as evidências de forma auditável;
- produzir `evidence-index.json` e `case-bundle.json`.

Este é o lugar certo para o target explicar:
- como descobrir logs;
- como localizar requests, execuções ou correlações;
- quais scripts oficiais usar;
- quando consultar banco;
- quando consultar sistemas externos;
- como agrupar evidências relevantes para o caso.

### `docs/workflows/target-investigate-case-v2-diagnosis.md`
É o prompt responsável por responder o caso com base no bundle já pronto.

Ele deve instruir a IA a:
- partir de `case-bundle.json` como insumo principal;
- produzir `diagnosis.md` legível por humano em menos de 2 minutos;
- produzir `diagnosis.json` como superfície machine-readable canônica;
- responder com clareza se o caso está `ok`, `not_ok` ou `inconclusive`;
- explicitar `why`, `expected_behavior`, `observed_behavior`, `behavior_to_change`, `probable_fix_surface` e `next_action`.

`diagnosis` não deve repetir a coleta operacional inteira nem reabrir `assemble-evidence` em nova roupa.

## O que pode ficar para segunda onda
Os itens abaixo podem ser deixados para uma segunda etapa de adoção, desde que o caminho mínimo já esteja sólido:

- `docs/workflows/target-investigate-case-v2-deep-dive.md`
- `docs/workflows/target-investigate-case-v2-improvement-proposal.md`
- `docs/workflows/target-investigate-case-v2-ticket-projection.md`
- comandos e automações sofisticadas que não sejam necessárias para materializar `resolve-case -> assemble-evidence -> diagnosis`
- `ticketPublicationPolicy`, se o target ainda não estiver pronto para projetar ticket com segurança

`ticket-projection` continua target-owned, mas não precisa entrar na primeira onda se isso for aumentar ambiguidade ou complexidade cedo demais.

## Boas práticas por estágio
### `resolve-case`
- Declare critérios de desambiguação concretos.
- Prefira falhar com blocker explícito a selecionar o caso errado.
- Escreva como o target reconhece “caso resolvido”, “ambíguo” e “indisponível”.
- Separe resolução do caso de coleta de evidências.

### `assemble-evidence`
- Liste superfícies reais do target, não categorias genéricas.
- Diga quais comandos, scripts, tabelas, diretórios, logs ou dashboards consultar.
- Explique quando usar cada fonte e o que ela deve comprovar.
- Registre evidência ausente ou inacessível de forma explícita.
- Use `evidence-index.json` como inventário factual e `case-bundle.json` como pacote curado para diagnóstico.

### `diagnosis`
- Assuma que o bundle já está montado.
- Escreva para leitura humana rápida.
- Use o veredito como abertura do documento.
- Diferencie claramente comportamento esperado, observado e mudança necessária.
- Mantenha o texto curto, causal e objetivo.

### Evitar duplicação de bundle
- Não copie todo o inventário bruto para dentro de `case-bundle.json`.
- Deixe material bruto em arquivos próprios, outputs referenciados ou diretório `evidence/`.
- Faça o bundle apontar para as evidências e carregar apenas o contexto necessário para o veredito.

### Explicitar blockers com segurança
- Se o target não conseguir resolver o caso com segurança, `resolve-case` deve dizer isso claramente.
- Se o target não conseguir coletar a evidência necessária, `assemble-evidence` deve registrar a lacuna, o impacto e a próxima ação segura.
- Evite “seguir mesmo assim” quando isso só desloca ambiguidade para o diagnóstico.

## Antipadrões
- Empurrar complexidade do fluxo antigo para dentro dos prompts da v2.
- Fazer `diagnosis` repetir coleta operacional ou busca exploratória.
- Deixar `assemble-evidence` genérico a ponto de não ensinar nada útil sobre o target.
- Transformar `deep-dive` em pré-requisito escondido do caminho mínimo.
- Fazer do target um segundo runner, com orquestração paralela, controle de etapas ou publicação própria competindo com o runner.
- Reintroduzir `publication-first` como superfície principal.
- Declarar estágios opcionais “por completude” sem conseguir executá-los de verdade.
- Misturar exemplo de piloto com contrato global.

## Checklist de prontidão
Um target está pronto para a primeira onda da v2 quando:

1. Existe um manifesto válido em `docs/workflows/target-case-investigation-v2-manifest.json`.
2. Existe um runbook real em `docs/workflows/target-case-investigation-v2-runbook.md`.
3. Existem os prompts canônicos de `resolve-case`, `assemble-evidence` e `diagnosis`.
4. O manifesto declara exatamente o caminho mínimo `preflight -> resolve-case -> assemble-evidence -> diagnosis`.
5. O namespace autoritativo da rodada é `output/case-investigation/<round-id>`.
6. Um caso mínimo consegue produzir:
   - `case-resolution.json`
   - `evidence-index.json`
   - `case-bundle.json`
   - `diagnosis.md`
   - `diagnosis.json`
7. `assemble-evidence` explica de forma operacional onde estão dados, logs, scripts e critérios de suficiência do target.
8. `diagnosis` responde o caso a partir do bundle pronto, sem depender de `deep-dive`, `ticket-projection` ou `publication`.
9. O target não reintroduz superfícies legadas como caminho principal.
10. Fica claro o que é obrigatório, o que é opcional e o que é apenas exemplo ilustrativo.

Sinais de que a compatibilização ainda não ficou boa:
- o target depende de conversa humana para descobrir onde ficam as evidências;
- os prompts falam em termos genéricos demais e não apontam superfícies reais;
- o bundle virou cópia bruta do inventário;
- o diagnóstico precisa reexecutar coleta;
- o fluxo só “funciona” quando alguém já conhece o piloto original.

## Referências
- `docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- `docs/workflows/target-project-compatibility-contract.md`
- `docs/workflows/target-case-investigation-v2-manifest.json`
- `docs/workflows/target-case-investigation-v2-runbook.md`
- `docs/workflows/target-investigate-case-v2-resolve-case.md`
- `docs/workflows/target-investigate-case-v2-assemble-evidence.md`
- `docs/workflows/target-investigate-case-v2-diagnosis.md`
- `docs/workflows/target-investigate-case-v2-target-onboarding-prompt.md`
