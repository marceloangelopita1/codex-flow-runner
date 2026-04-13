# Runbook canônico da capability `target-investigate-case-v2`

## Objetivo
Este documento define o papel do runbook operacional que cada projeto alvo compatível com a v2 deve manter em `docs/workflows/target-case-investigation-v2-runbook.md`.

O runbook existe para registrar, de forma estável e auditável, o contexto operacional que a IA precisa consultar antes de executar `resolve-case`, `assemble-evidence` e `diagnosis` no domínio real do target.

## O que este runbook deve conter no projeto alvo
O runbook do target deve explicar, no mínimo:
- qual workflow real está sendo investigado;
- quais identificadores de caso o target reconhece;
- quais superfícies de evidência são confiáveis;
- quais comandos, scripts ou ferramentas oficiais existem;
- como diferenciar execução local, remota, em nuvem ou em ambientes distintos;
- quais limitações, permissões e blockers precisam ser explicitados.

## Relação com manifesto e prompts
- o manifesto da v2 declara este arquivo em `supportingArtifacts.docs`;
- o runner usa a primeira entrada de `supportingArtifacts.docs` como runbook operacional principal da capability;
- o runbook complementa os prompts por estágio;
- `resolve-case`, `assemble-evidence` e `diagnosis` continuam sendo os lugares canônicos para instruções semânticas da etapa.
- o runner deve tratar o runbook e os artefatos target-owned como autoridade operacional do target; divergências de envelope JSON recomendado devem virar warnings de automação, não bloqueio do diagnóstico.

## O que o runbook não deve virar
- um segundo manifesto;
- um prompt genérico que substitui os prompts por estágio;
- um catálogo abstrato de “boas práticas” sem referência ao target real;
- uma camada paralela de orquestração competindo com o runner;
- um schema rígido imposto para satisfazer validações runner-side em detrimento da resposta diagnóstica correta.

## Estrutura mínima recomendada para o target
Use a estrutura abaixo como ponto de partida e adapte ao domínio real:

```md
# Runbook de investigação de caso v2

## Escopo do workflow
- O que este target investiga.
- Quais tipos de caso entram ou não entram aqui.

## Referências de entrada aceitas
- IDs, request IDs, execution IDs, correlation IDs, janelas de tempo e aliases aceitos.

## Mapa do workflow real
- Etapas de negócio ou execução relevantes para entender o caso.

## Superfícies operacionais
- Logs, banco, scripts, dashboards, filas, arquivos, APIs e ambientes relevantes.

## Procedimentos oficiais
- Comandos e scripts recomendados para localizar caso e coletar evidências.

## Diferenças por ambiente
- O que muda entre local, remoto, staging, produção ou provedores distintos.

## Blockers e limites
- O que deve ser declarado como blocker em vez de ser inferido ou contornado.
```

## Referências
- `docs/workflows/target-case-investigation-v2-manifest.json`
- `docs/workflows/target-investigate-case-v2-target-onboarding.md`
- `docs/workflows/target-investigate-case-v2-target-onboarding-prompt.md`
