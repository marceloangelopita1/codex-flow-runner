# Discover Spec Workflow

## Objetivo
Descrever o fluxo profundo de descoberta de spec no estilo `/discover_spec` para uso direto no Codex/VS Code, sem depender do comando do Telegram.

Este documento é operacional: explica quando entrar nesse modo, como ativar o fluxo por linguagem natural, como conduzir a entrevista e qual artefato final deve ser produzido.

## Quando usar
Use este fluxo quando a demanda ainda estiver ambígua, aberta ou arriscada o bastante para que um refinamento rápido seja insuficiente.

Sinais comuns:
- o usuário quer "uma entrevista detalhada para criar uma spec";
- há múltiplos atores, jornadas, restrições ou trade-offs relevantes;
- ainda faltam validações, não-escopo, assumptions/defaults ou critérios de aceite claros;
- implementar cedo demais tende a gerar retrabalho.

Se a ideia já estiver bem definida e o usuário quiser apenas lapidar rapidamente a spec, prefira o fluxo leve no estilo `/plan_spec`.

## Como ativar no Codex/VS Code
Quando o usuário pedir explicitamente uma entrevista detalhada para criar uma spec, trate isso como entrada no fluxo profundo, mesmo fora do Telegram.

Exemplos de gatilho:
- "Quero uma entrevista detalhada para criar uma spec."
- "Vamos seguir o fluxo de discover spec."
- "Quero transformar esta ideia em uma spec com mais profundidade antes de implementar."

Exemplo curto de prompt inicial:

```text
Vamos seguir o fluxo profundo no estilo /discover_spec deste repositório.
Quero uma entrevista detalhada para criar uma spec.
Minha ideia inicial é: [IDEIA]
Não implemente ainda.
```

## Contrato operacional
Ao entrar neste fluxo:
- não pular direto para implementação;
- não assumir que a primeira descrição do usuário já está pronta para virar ticket ou código;
- conduzir uma entrevista estruturada até que as ambiguidades críticas estejam tratadas;
- produzir uma spec pronta para materialização no padrão do repositório.
- Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explícito em reduzir retrabalho e promover a melhoria contínua do workflow.

Quando a resposta do usuário ainda estiver vaga, fazer follow-up em vez de encerrar cedo.

Quando uma indefinição puder ser resolvida sem bloquear o fluxo, registre-a explicitamente como assumption/default ou não-escopo, em vez de deixá-la implícita.

## Cobertura mínima da entrevista
Antes de considerar a spec pronta, cobrir explicitamente:
- objetivo e valor esperado;
- atores e jornada;
- escopo funcional;
- não-escopo;
- restrições técnicas e dependências;
- validações e critérios de aceite;
- riscos conhecidos;
- assumptions/defaults;
- decisões e trade-offs.

Não depender de inferência silenciosa para fechar essas lacunas.

## Saída esperada
Ao final da entrevista, entregar uma spec pronta para materialização seguindo `SPECS.md` e o template oficial em `docs/specs/templates/spec-template.md`.

A saída final deve preservar de forma explícita:
- objetivo e contexto;
- atores e jornada;
- requisitos funcionais;
- critérios de aceitação observáveis;
- não-escopo;
- restrições técnicas relevantes;
- validações obrigatórias e manuais pendentes;
- riscos conhecidos;
- assumptions/defaults aprovados;
- decisões e trade-offs relevantes.

Quando o fluxo for usado para criar de fato uma nova spec no projeto, o resultado esperado é um arquivo em `docs/specs/YYYY-MM-DD-<slug>.md` com metadata inicial:
- `Status: approved`
- `Spec treatment: pending`

## Boas práticas
- Começar pela intenção do usuário e aprofundar por camadas, sem despejar um questionário inteiro de uma vez.
- Fazer perguntas que reduzam ambiguidade real, não perguntas cosméticas.
- Transformar escolhas não respondidas, quando apropriado, em defaults explícitos e revisáveis.
- Distinguir claramente escopo, não-escopo e riscos.
- Encerrar a entrevista com uma proposta concreta de spec, não com um resumo genérico.
- Se o usuário pedir apenas o fluxo de descoberta, parar na spec e não continuar para implementação sem novo comando.

## Anti-padrões
- Pular da ideia inicial direto para código.
- Gerar uma spec com RFs/CAs genéricos sem amarrar atores, jornada e validações.
- Deixar assumptions/defaults ou trade-offs importantes apenas subentendidos.
- Fechar a entrevista enquanto ainda houver ambiguidade crítica não tratada.
- Tratar o fluxo profundo como obrigatório para toda e qualquer mudança simples.

## Relação com o restante do fluxo
Depois que a spec estiver pronta:
- revisar o texto final contra `SPECS.md`;
- materializar a spec em `docs/specs/` quando isso fizer parte da tarefa;
- derivar apenas tickets em `tickets/open/`, mesmo quando o escopo já estiver claro;
- criar execplan somente a partir do ticket, quando necessário para execução segura;
- alinhar material histórico apenas quando ele for tocado depois ou quando houver impacto funcional real; não existe migração retroativa em massa por padrão;
- seguir o fluxo sequencial normal do repositório.

## Referências canônicas
- Padrão de spec: `SPECS.md`
- Template de spec: `docs/specs/templates/spec-template.md`
- Qualidade do workflow: `docs/workflows/codex-quality-gates.md`
- Comportamento implementado do fluxo profundo: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`
