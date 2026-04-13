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
- em projeto externo, o checklist compartilhado do workflow permanece canônico no repositório irmão `../codex-flow-runner/docs/workflows/codex-quality-gates.md`; no próprio `codex-flow-runner`, o caminho canônico continua `docs/workflows/codex-quality-gates.md`;
- `target_prepare` e `target_checkup` devem tornar essa dependência observável e auditável, em vez de pressupor uma cópia implícita do checklist dentro do repositório alvo;
- para `target-investigate-case-v2`, o onboarding canônico do target passa por `docs/workflows/target-investigate-case-v2-target-onboarding.md` e pelo prompt reutilizável `docs/workflows/target-investigate-case-v2-target-onboarding-prompt.md`;
- para `target-investigate-case-v2`, o target deve materializar no próprio repositório o manifesto, o runbook e os prompts canônicos da primeira onda, em vez de depender de contexto tácito ou de instruções soltas em conversa;
- a triagem inicial da spec deriva apenas tickets em `tickets/open/`;
- `execplans/` surgem somente a partir de tickets, quando necessário para execução segura;
- para `target-investigate-case-v2`, a primeira onda runner-side já estabilizou o contrato, o slot canônico de `ticket-projection` e a `publication` runner-side; na compatibilização target-side, a primeira onda continua sendo o caminho mínimo diagnosis-first, e `deep-dive`, `improvement-proposal` e `ticket-projection` podem entrar apenas na segunda onda;
- para `target-investigate-case-v2`, compatibilidade operacional não significa submissão a um schema rígido de resposta runner-side: o runner deve orquestrar, registrar warnings de envelope e preservar diagnósticos úteis ou blockers explícitos produzidos pelo target;
- `target-investigate-case-v2` é o único fluxo suportado de investigação de caso; o projeto alvo não deve depender de cadeias auxiliares legadas fora desse contrato;
- o histórico pré-v2 de investigação de caso, quando consultado, fica rebaixado a `docs/history/target-investigate-case/` e não participa do contrato operacional vigente;
- `ticket-proposal.json` continua target-owned e precisa nascer no namespace autoritativo `output/case-investigation/<round-id>/`; `investigations/<round-id>/` pode espelhar a rodada, mas não substitui a autoridade semântica do target;
- exemplos de piloto, como `../guiadomus-matricula`, podem servir de referência histórica, mas não são contrato canônico global;
- essa categoria pressupõe onboarding humano prévio; não é algo que o runner tenta provar semanticamente durante a execução.

## Regra operacional
- compatibilidade do projeto alvo com o workflow completo é pré-requisito operacional do onboarding humano;
- para projeto externo, esse pré-requisito inclui o acesso determinístico ao checklist compartilhado por `../codex-flow-runner/docs/workflows/codex-quality-gates.md`;
- o runner não deve gastar tokens tentando demonstrar em runtime, por análise semântica, se o projeto alvo é ou não compatível com o workflow completo;
- o runner não deve bloquear o caminho mínimo diagnosis-first por validações rígidas de schema dos artefatos target-owned; essas divergências devem aparecer como observabilidade e limitar apenas automações posteriores que dependam de campos específicos;
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
- `docs/workflows/target-investigate-case-v2-target-onboarding.md`
- `docs/workflows/target-investigate-case-v2-target-onboarding-prompt.md`
