# Target Project Compatibility Contract

## Objetivo
Definir, de forma curta e canonica, quando um projeto alvo esta pronto apenas para descoberta/refinamento de spec e quando ele esta pronto para o workflow completo do `codex-flow-runner`.

## Categorias
### Projeto elegivel para descoberta
Use esta categoria quando o operador so precisa descobrir, entrevistar ou refinar uma spec no contexto do projeto alvo.

Fluxos permitidos:
- `/discover_spec`
- `/plan_spec`

Contrato:
- o projeto oferece contexto suficiente para discutir o problema, a jornada e as restricoes da spec;
- essa elegibilidade nao implica que o repositorio ja esteja pronto para triagem automatizada da spec, execucao de tickets ou versionamento pelo runner;
- um projeto pode permanecer apenas nesta categoria durante a fase de descoberta, sem aderir ainda ao workflow completo.

### Projeto compativel com o workflow completo
Use esta categoria quando o operador pretende executar a spec e o backlog derivado pelo workflow completo do runner.

Fluxos permitidos:
- `/run_specs`
- `/run_all`
- ciclo completo `spec -> tickets -> execplan` quando necessario -> implementacao sequencial -> fechamento de ticket

Contrato:
- o projeto ja foi preparado para o workflow operacional esperado pelo runner, incluindo as estruturas e convencoes documentais usadas na triagem da spec e na execucao sequencial dos tickets;
- a triagem inicial da spec deriva apenas tickets em `tickets/open/`;
- `execplans/` surgem somente a partir de tickets, quando necessario para execucao segura;
- essa categoria pressupoe onboarding humano previo; nao e algo que o runner tenta provar semanticamente durante a execucao.

## Regra operacional
- compatibilidade do projeto alvo com o workflow completo e pre-requisito operacional do onboarding humano;
- o runner nao deve gastar tokens tentando demonstrar em runtime, por analise semantica, se o projeto alvo e ou nao compativel com o workflow completo;
- quando houver duvida, a decisao correta e ajustar o onboarding/documentacao do projeto antes de usar `/run_specs` ou o workflow completo.

## Resumo pratico
- Quer descobrir ou refinar uma spec: basta `projeto elegivel para descoberta`.
- Quer executar `/run_specs` ou o fluxo completo: precisa `projeto compativel com o workflow completo`.

## Referencias
- `AGENTS.md`
- `README.md`
- `SPECS.md`
- `INTERNAL_TICKETS.md`
- `PLANS.md`
- `docs/workflows/codex-quality-gates.md`
