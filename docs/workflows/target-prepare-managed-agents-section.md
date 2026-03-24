## Compatibilidade com codex-flow-runner
- Este repositório foi preparado para o workflow documental e sequencial do `codex-flow-runner`.
- Preserve o contexto auto-carregado em `AGENTS.md` para regras recorrentes, estáveis e acionáveis; detalhes e exemplos devem viver nos documentos referenciados.
- O contrato canônico de derivação continua sendo `spec -> tickets` e `ticket -> execplan` quando necessário.

## Convenções operacionais obrigatórias
- Diretórios esperados:
  - `tickets/open/` para tickets abertos.
  - `tickets/closed/` para tickets fechados.
  - `execplans/` para planos de execução.
  - `docs/specs/` para specs vivas.
  - `docs/workflows/` para contratos e relatórios operacionais.
- Ao fechar ticket, mover o arquivo de `tickets/open/` para `tickets/closed/` no mesmo commit que resolve o ticket.
- Sempre priorize fluxo sequencial; não introduza paralelização de tickets sem mudança explícita de contrato.

## Documentação operacional obrigatória
- `EXTERNAL_PROMPTS.md`
- `INTERNAL_TICKETS.md`
- `PLANS.md`
- `SPECS.md`
- `docs/specs/templates/spec-template.md`
- `docs/workflows/discover-spec.md`
- `docs/workflows/target-project-compatibility-contract.md`

## Segurança e operação
- Não commitar segredos.
- Use `.env` para configuração local quando o projeto precisar de configuração sensível.
- Mantenha o repositório como fonte canônica dos artefatos versionados do workflow.
