# AGENTS.md

## Objetivo do repositório
Este projeto automatiza um fluxo de tickets com Codex SDK, executando um loop sequencial (planejar → implementar → fechar ticket + commit/push) e expondo acompanhamento/controle por Telegram.

## Documentacao para IA
- Preserve o contexto auto-carregado para regras recorrentes, estaveis e acionaveis; detalhe, exemplos e racional devem viver em documentacao referenciada.
- Ao criar ou alterar documentacao do projeto, siga a politica oficial em `DOCUMENTATION.md`.

## Regras de implementação
- Linguagem padrão: TypeScript em Node.js 20+.
- Evite dependências desnecessárias; prefira módulos internos pequenos e composáveis.
- Mantenha arquitetura em camadas:
  - `src/core`: loop principal e regras de negócio.
  - `src/integrations`: integrações externas (Codex, Telegram, filesystem).
  - `src/config`: leitura/validação de configuração.
- Sempre priorize fluxo **sequencial** (sem paralelização de tickets).

## Tickets e ExecPlans
- Convenção esperada:
  - `tickets/open/` para tickets abertos.
  - `tickets/closed/` para tickets fechados.
  - `execplans/` para planos de execução.
- Ao fechar ticket, mover arquivo de `tickets/open/` para `tickets/closed/` no mesmo commit que resolve o ticket.

## Especificações e ciclo de evolução
- `docs/specs/` deve conter arquivos Markdown com especificações funcionais e jornadas de uso.
- Cada spec em `docs/specs/` deve ser documento vivo com status explícito de atendimento.
- As specs são a base para identificar evoluções no projeto.
- Para elicitação de novas specs direto no Codex/VS Code, existem dois modos:
  - fluxo leve no estilo `/plan_spec`, para refinamento rápido;
  - fluxo profundo no estilo `/discover_spec`, para entrevista estruturada antes de materializar a spec.
- Quando o pedido do usuário no Codex/VS Code for claramente de descoberta/refinamento de spec, conduzir a conversa no modo apropriado em vez de pular direto para implementação.
- Quando o usuário pedir uma entrevista detalhada para criar uma spec, seguir `docs/workflows/discover-spec.md`.
- Quando uma evolução for identificada a partir das specs:
  - Criar um ticket em `tickets/open/` quando ainda for necessário detalhar/refinar o trabalho.
  - Criar um execplan direto em `execplans/` quando o escopo já estiver claro e pronto para execução.
- O ciclo esperado é: revisar specs → criar ticket ou execplan → implementar em fluxo sequencial → fechar ticket (quando existir) e manter rastreabilidade com a spec de origem.

## Observabilidade
- Logs devem ser simples e legíveis (JSON opcional em evoluções futuras).
- Toda etapa importante do loop deve gerar log e ser refletida no status do bot.

## Segurança e operação
- Não commitar segredos.
- Usar `.env` para configuração local.
- Preparar o app para execução contínua no WSL via `systemd`.

## Documentação operacional obrigatória
- `EXTERNAL_PROMPTS.md`: padrão para prompts externos e trilha request/response/decision.
- `INTERNAL_TICKETS.md`: padrão de tickets internos e ciclo de fechamento.
- `PLANS.md`: padrão de ExecPlan para criação e execução em `execplans/`.
- `SPECS.md`: padrão para criação/manutenção de specs e jornada de uso em `docs/specs/`.
- `docs/workflows/discover-spec.md`: fluxo profundo para entrevista detalhada e criação de spec no estilo `/discover_spec`.
