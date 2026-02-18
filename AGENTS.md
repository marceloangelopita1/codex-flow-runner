# AGENTS.md

## Objetivo do repositório
Este projeto automatiza um fluxo de tickets com Codex SDK, executando um loop sequencial (planejar → implementar → fechar ticket + commit/push) e expondo acompanhamento/controle por Telegram.

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

## Observabilidade
- Logs devem ser simples e legíveis (JSON opcional em evoluções futuras).
- Toda etapa importante do loop deve gerar log e ser refletida no status do bot.

## Segurança e operação
- Não commitar segredos.
- Usar `.env` para configuração local.
- Preparar o app para execução contínua no WSL via `systemd`.
