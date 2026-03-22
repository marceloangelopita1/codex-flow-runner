# AGENTS.md

## Objetivo do repositório
Este projeto automatiza um workflow sequencial com Codex CLI, Git e Telegram para operar tickets e specs em um projeto ativo: triagem de spec, derivação de tickets, execução sequencial, fechamento/versionamento e acompanhamento operacional.

## Documentação para IA
- Preserve o contexto auto-carregado para regras recorrentes, estáveis e acionáveis; detalhes, exemplos e racional devem viver em documentação referenciada.
- Ao criar ou alterar documentação do projeto, siga a política oficial em `DOCUMENTATION.md`.
- Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explícito em reduzir retrabalho e promover a melhoria contínua do workflow.

## Regras de implementação
- Linguagem padrão: TypeScript em Node.js 20+.
- Evite dependências desnecessárias; prefira módulos internos pequenos e composáveis.
- Mantenha arquitetura em camadas:
  - `src/core`: loop principal e regras de negócio.
  - `src/integrations`: integrações externas (Codex, Telegram, filesystem).
  - `src/config`: leitura/validação de configuração.
- Sempre priorize fluxo **sequencial** (sem paralelização de tickets).

## Projetos alvo
- O runner descobre projetos elegíveis apenas no primeiro nível de `PROJECTS_ROOT_PATH`.
- `codex-flow-runner` e os projetos alvo devem ficar como diretórios irmãos dentro dessa pasta-pai.

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
  - Criar um ticket em `tickets/open/` para materializar o trabalho derivado da spec.
  - Criar um execplan apenas a partir do ticket, quando necessário para execução segura.
- O contrato oficial de derivação é `spec -> tickets` e `ticket -> execplan` quando necessário.
- O contrato de compatibilidade do projeto alvo fica em `docs/workflows/target-project-compatibility-contract.md`; mantenha aqui apenas esse ponteiro e trate compatibilidade com o workflow completo como pré-requisito operacional, não como cheque semântico de runtime.
- O ciclo esperado é: revisar specs -> criar ticket -> criar execplan quando necessário -> implementar em fluxo sequencial -> fechar ticket e manter rastreabilidade com a spec de origem.

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
