# Target Project Compatibility Contract

## Objetivo
Definir, de forma curta e canônica, quando um projeto alvo está pronto apenas para descoberta/refinamento de spec e quando está pronto para o workflow completo do `codex-flow-runner`.

## Categorias
### Projeto elegível para descoberta
Use esta categoria quando o operador só precisa descobrir, entrevistar ou refinar uma spec no contexto do projeto alvo.

Fluxos permitidos:
- `/discover_spec`
- `/plan_spec`

Contrato:
- o projeto oferece contexto suficiente para discutir o problema, a jornada e as restrições da spec;
- essa elegibilidade não implica que o repositório já esteja pronto para triagem automatizada da spec, execução de tickets ou versionamento pelo runner;
- um projeto pode permanecer apenas nesta categoria durante a fase de descoberta, sem aderir ainda ao workflow completo.

### Projeto compatível com o workflow completo
Use esta categoria quando o operador pretende executar a spec e o backlog derivado pelo workflow completo do runner.

Fluxos permitidos:
- `/run_specs`
- `/run_all`
- ciclo completo `spec -> tickets -> execplan` quando necessário -> implementação sequencial -> fechamento de ticket

Contrato:
- o projeto já foi preparado para o workflow operacional esperado pelo runner, incluindo as estruturas e convenções documentais usadas na triagem da spec e na execução sequencial dos tickets;
- a triagem inicial da spec deriva apenas tickets em `tickets/open/`;
- `execplans/` surgem somente a partir de tickets, quando necessário para execução segura;
- essa categoria pressupõe onboarding humano prévio; não é algo que o runner tenta provar semanticamente durante a execução.

## Regra operacional
- compatibilidade do projeto alvo com o workflow completo é pré-requisito operacional do onboarding humano;
- o runner não deve gastar tokens tentando demonstrar em runtime, por análise semântica, se o projeto alvo é ou não compatível com o workflow completo;
- quando houver dúvida, a decisão correta é ajustar o onboarding/documentação do projeto antes de usar `/run_specs` ou o workflow completo.

## Resumo prático
- Quer descobrir ou refinar uma spec: basta `projeto elegível para descoberta`.
- Quer executar `/run_specs` ou o fluxo completo: precisa `projeto compatível com o workflow completo`.

## Referências
- `AGENTS.md`
- `README.md`
- `SPECS.md`
- `INTERNAL_TICKETS.md`
- `PLANS.md`
- `docs/workflows/codex-quality-gates.md`
