# Discover Spec Workflow

## Objetivo
Descrever o fluxo profundo de descoberta de spec no estilo `/discover_spec` para uso direto no Codex/VS Code, sem depender do comando do Telegram.

Este documento e operacional: explica quando entrar nesse modo, como ativar o fluxo por linguagem natural, como conduzir a entrevista e qual artefato final deve ser produzido.

## Quando usar
Use este fluxo quando a demanda ainda estiver ambigua, aberta ou arriscada o bastante para que um refinamento rapido seja insuficiente.

Sinais comuns:
- o usuario quer "uma entrevista detalhada para criar uma spec";
- ha multiplos atores, jornadas, restricoes ou trade-offs relevantes;
- ainda faltam validacoes, nao-escopo, assumptions/defaults ou criterios de aceite claros;
- implementar cedo demais tende a gerar retrabalho.

Se a ideia ja estiver bem definida e o usuario quiser apenas lapidar rapidamente a spec, prefira o fluxo leve no estilo `/plan_spec`.

## Como ativar no Codex/VS Code
Quando o usuario pedir explicitamente uma entrevista detalhada para criar uma spec, trate isso como entrada no fluxo profundo, mesmo fora do Telegram.

Exemplos de gatilho:
- "Quero uma entrevista detalhada para criar uma spec."
- "Vamos seguir o fluxo de discover spec."
- "Quero transformar esta ideia em uma spec com mais profundidade antes de implementar."

Exemplo curto de prompt inicial:

```text
Vamos seguir o fluxo profundo no estilo /discover_spec deste repositorio.
Quero uma entrevista detalhada para criar uma spec.
Minha ideia inicial e: [IDEIA]
Nao implemente ainda.
```

## Contrato operacional
Ao entrar neste fluxo:
- nao pular direto para implementacao;
- nao assumir que a primeira descricao do usuario ja esta pronta para virar ticket ou codigo;
- conduzir uma entrevista estruturada ate que as ambiguidades criticas estejam tratadas;
- produzir uma spec pronta para materializacao no padrao do repositorio.

Quando a resposta do usuario ainda estiver vaga, fazer follow-up em vez de encerrar cedo.

Quando uma indefinicao puder ser resolvida sem bloquear o fluxo, registra-la explicitamente como assumption/default ou nao-escopo, em vez de deixa-la implicita.

## Cobertura minima da entrevista
Antes de considerar a spec pronta, cobrir explicitamente:
- objetivo e valor esperado;
- atores e jornada;
- escopo funcional;
- nao-escopo;
- restricoes tecnicas e dependencias;
- validacoes e criterios de aceite;
- riscos conhecidos;
- assumptions/defaults;
- decisoes e trade-offs.

Nao depender de inferencia silenciosa para fechar essas lacunas.

## Saida esperada
Ao final da entrevista, entregar uma spec pronta para materializacao seguindo `SPECS.md` e o template oficial em `docs/specs/templates/spec-template.md`.

A saida final deve preservar de forma explicita:
- objetivo e contexto;
- atores e jornada;
- requisitos funcionais;
- criterios de aceitacao observaveis;
- nao-escopo;
- restricoes tecnicas relevantes;
- validacoes obrigatorias e manuais pendentes;
- riscos conhecidos;
- assumptions/defaults aprovados;
- decisoes e trade-offs relevantes.

Quando o fluxo for usado para criar de fato uma nova spec no projeto, o resultado esperado e um arquivo em `docs/specs/YYYY-MM-DD-<slug>.md` com metadata inicial:
- `Status: approved`
- `Spec treatment: pending`

## Boas praticas
- Comecar pela intencao do usuario e aprofundar por camadas, sem despejar um questionario inteiro de uma vez.
- Fazer perguntas que reduzam ambiguidade real, nao perguntas cosmeticas.
- Transformar escolhas nao respondidas, quando apropriado, em defaults explicitos e revisaveis.
- Distinguir claramente escopo, nao-escopo e riscos.
- Encerrar a entrevista com uma proposta concreta de spec, nao com um resumo generico.
- Se o usuario pedir apenas o fluxo de descoberta, parar na spec e nao continuar para implementacao sem novo comando.

## Anti-padroes
- Pular da ideia inicial direto para codigo.
- Gerar uma spec com RFs/CAs genericos sem amarrar atores, jornada e validacoes.
- Deixar assumptions/defaults ou trade-offs importantes apenas subentendidos.
- Fechar a entrevista enquanto ainda houver ambiguidade critica nao tratada.
- Tratar o fluxo profundo como obrigatorio para toda e qualquer mudanca simples.

## Relacao com o restante do fluxo
Depois que a spec estiver pronta:
- revisar o texto final contra `SPECS.md`;
- materializar a spec em `docs/specs/` quando isso fizer parte da tarefa;
- derivar ticket em `tickets/open/` quando ainda houver necessidade de refinamento tecnico;
- derivar execplan em `execplans/` quando o escopo ja estiver claro e pronto para execucao;
- seguir o fluxo sequencial normal do repositorio.

## Referencias canonicas
- Padrao de spec: `SPECS.md`
- Template de spec: `docs/specs/templates/spec-template.md`
- Qualidade do workflow: `docs/workflows/codex-quality-gates.md`
- Comportamento implementado do fluxo profundo: `docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`
