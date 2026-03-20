# PLANS.md - Padrão de ExecPlan

## Finalidade
Este documento define o padrão de ExecPlan deste repositório.

Um ExecPlan é um plano executável, auto-contido e auditável, pensado para tarefas complexas e longas. Quem executa o plano deve conseguir concluir o trabalho apenas com:
- o estado atual do repositório;
- o próprio arquivo do plano.

## Quando ExecPlan e obrigatorio
ExecPlan e obrigatorio quando houver qualquer um dos cenários abaixo:
- mudança em multiplos arquivos com dependências entre si;
- alteracao de arquitetura, pipeline ou fluxo do runner;
- mudança de contrato (payload, schema, shape de output, validações críticas);
- migração/versionamento/cache com possível impacto em compatibilidade;
- tarefa longa com marcos intermediários e risco de deriva.

ExecPlan e opcional para mudanças pequenas, locais e de baixo risco.

## Onde salvar os planos
Salvar cada plano em:
- `execplans/<yyyy-mm-dd>-<slug>.md`

Exemplos:
- `execplans/2026-02-19-melhorar-status-telegram.md`
- `execplans/2026-02-19-hardening-ciclo-sequencial.md`

## Regras não negociáveis
- O plano deve ser auto-contido (sem depender de contexto implicito ou memoria externa).
- Todo critério de aceitacao deve ser observavel por comportamento (comando + resultado esperado).
- Todo passo de execução deve indicar comando e diretório de execução.
- O plano deve explicitar escopo, não-escopo, riscos e dependências.
- Termos específicos do projeto devem ser explicados no próprio plano.
- O plano é documento vivo: atualizar `Progress`, `Decision Log` e descobertas durante a execução.
- Passos arriscados devem incluir estratégia de recuperação (retry, rollback ou alternativa segura).
- Todo ExecPlan derivado de ticket originado por spec deve explicitar:
  - spec de origem;
  - RFs/CAs cobertos por este ticket;
  - assumptions/defaults escolhidos para eliminar ambiguidade;
  - matriz `requisito -> validacao observavel`.

## Estrutura obrigatória do ExecPlan
Todo arquivo em `execplans/*.md` deve conter as seções abaixo, nesta ordem, com estes titulos:

1. `Purpose / Big Picture`
2. `Progress`
3. `Surprises & Discoveries`
4. `Decision Log`
5. `Outcomes & Retrospective`
6. `Context and Orientation`
7. `Plan of Work`
8. `Concrete Steps`
9. `Validation and Acceptance`
10. `Idempotence and Recovery`
11. `Artifacts and Notes`
12. `Interfaces and Dependencies`

### Regras por seção
- `Purpose / Big Picture`: objetivo de negócio/técnico, sucesso esperado e limites.
- `Progress`: checklist operacional com timestamp (`[ ]`/`[x]`) e status objetivo.
- `Surprises & Discoveries`: fatos descobertos durante execução que alteram entendimento.
- `Decision Log`: decisões tomadas com data, motivo e impacto.
- `Outcomes & Retrospective`: resultado final, pendências e lições.
- `Context and Orientation`: contexto local de código, caminhos e pontos de entrada.
- `Context and Orientation`: deve incluir, quando aplicável, spec de origem, RF/CA subset e assumptions/defaults adotados.
- `Plan of Work`: marcos (milestones) narrativos com entregaveis claros.
- `Concrete Steps`: passos concretos com comandos e diretório.
- `Validation and Acceptance`: como validar e o que comprova aceitação.
- `Validation and Acceptance`: deve conter matriz objetiva relacionando cada closure criterion/requisito relevante a uma evidência observável.
- `Idempotence and Recovery`: como repetir sem quebrar e como recuperar falhas.
- `Artifacts and Notes`: links para diffs, logs, snapshots, outputs relevantes.
- `Interfaces and Dependencies`: APIs, schemas, contratos e acoplamentos impactados.

## Padrões de milestones
- Milestones devem contar a historia da entrega (narrativa de incremento).
- `Progress` rastreia trabalho granular e status operacional.
- Cada milestone deve declarar:
  - o que existira ao final;
  - como provar que funciona;
  - quais arquivos/superficies serão afetados.

## Template pronto (copiar e usar)
Use este template como base para novos planos em `execplans/*.md`:

```md
# <Titulo do plano>

## Purpose / Big Picture
- Objetivo:
- Resultado esperado:
- Escopo:
- Fora de escopo:

## Progress
- [ ] YYYY-MM-DD HH:MMZ - Planejamento inicial concluido.
- [ ] YYYY-MM-DD HH:MMZ - Implementacao concluida.
- [ ] YYYY-MM-DD HH:MMZ - Validacao final concluida.

## Surprises & Discoveries
- YYYY-MM-DD HH:MMZ - <descoberta>

## Decision Log
- YYYY-MM-DD - Decisao: <decisao>
  - Motivo:
  - Impacto:

## Outcomes & Retrospective
- Status final:
- O que funcionou:
- O que ficou pendente:
- Proximos passos:

## Context and Orientation
- Arquivos principais:
- Spec de origem:
- RFs/CAs cobertos por este plano:
- Assumptions / defaults adotados:
- Fluxo atual:
- Restricoes tecnicas:

## Plan of Work
- Milestone 1:
  - Entregavel:
  - Evidencia de conclusao:
  - Arquivos esperados:
- Milestone 2:
  - Entregavel:
  - Evidencia de conclusao:
  - Arquivos esperados:

## Concrete Steps
1. (workdir: `<path>`) Rodar `<comando>` para <objetivo>.
2. (workdir: `<path>`) Alterar `<arquivo>` para <objetivo>.
3. (workdir: `<path>`) Rodar `<comando>` para validar.

## Validation and Acceptance
- Matriz requisito -> validacao:
  - Requisito:
  - Evidencia observavel:
- Comando: `<comando>`
  - Esperado: `<resultado observavel>`
- Comando: `<comando>`
  - Esperado: `<resultado observavel>`

## Idempotence and Recovery
- Idempotencia:
- Riscos:
- Recovery / Rollback:

## Artifacts and Notes
- PR/Diff:
- Logs relevantes:
- Evidencias de teste:

## Interfaces and Dependencies
- Interfaces alteradas:
- Compatibilidade:
- Dependencias externas e mocks:
```

## Checklist de qualidade do plano
Antes de aprovar execução, confirme:
- O plano esta auto-contido e sem dependências implicitas.
- Há critérios de aceitacao observaveis para cada mudança relevante.
- Todos os comandos tem diretório explícito quando necessário.
- Escopo e fora de escopo estao claros.
- Há milestones narrativos e progresso operacional separados.
- Há estratégia de idempotencia e recuperação para passos arriscados.
- Interfaces/dependências impactadas foram mapeadas.
- A spec de origem, RFs/CAs cobertos e assumptions/defaults adotados ficaram explícitos.
- Existe matriz requisito -> validação para todos os critérios de fechamento relevantes.
- O plano pode ser executado por outra pessoa sem decisões adicionais.
