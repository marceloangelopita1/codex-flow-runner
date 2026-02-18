# codex-flow-runner

Esqueleto inicial para um runner de tickets com **Node.js + TypeScript**, integrando:

- loop contínuo para processar tickets em sequência;
- integração com Codex (aqui com stub inicial);
- controle remoto via Telegram (`/status`, `/pause`, `/resume`);
- execução planejada para ambiente WSL com `systemd`.

## Visão geral

Este projeto foi desenhado para automatizar o ciclo:

1. Encontrar o próximo ticket aberto em `tickets/open/`.
2. Rodar o fluxo no mesmo contexto do agente (planejar → implementar → fechar).
3. Repetir até não haver tickets.
4. Permitir controle e observabilidade via Telegram.

> **Status atual:** base estrutural pronta; integração real com Codex SDK ainda pendente (foi criado um cliente `StubCodexTicketFlowClient`).

## Estrutura

```txt
.
├── AGENTS.md
├── README.md
├── docs/
│   └── systemd/
├── execplans/
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── core/
│   │   ├── logger.ts
│   │   └── runner.ts
│   ├── integrations/
│   │   ├── codex-client.ts
│   │   ├── telegram-bot.ts
│   │   └── ticket-queue.ts
│   ├── types/
│   │   └── state.ts
│   └── main.ts
├── tickets/
│   ├── closed/
│   └── open/
├── package.json
└── tsconfig.json
```

## Pré-requisitos

- Node.js 20+
- npm 10+
- Token de bot Telegram (via BotFather)

## Configuração de ambiente

Defina variáveis de ambiente (ex.: em `.env` carregado por shell/systemd):

- `TELEGRAM_BOT_TOKEN` (obrigatório)
- `TELEGRAM_ALLOWED_CHAT_ID` (opcional, restringe acesso)
- `REPO_PATH` (opcional, padrão: diretório atual)
- `POLL_INTERVAL_MS` (opcional, padrão: `5000`)
- `CODEX_API_KEY` (opcional por enquanto; será usado na integração real)

## Scripts

- `npm run dev` → desenvolvimento com watch (`tsx`)
- `npm run build` → compila TS para `dist/`
- `npm start` → executa build gerado
- `npm run check` → valida tipagem sem emitir arquivos

## Próximos passos recomendados

1. Substituir `StubCodexTicketFlowClient` por integração real com Codex SDK.
2. Implementar ordenação de tickets por prioridade/FIFO a partir de metadados do ticket.
3. Adicionar comandos `/tail` e `/skip` no Telegram.
4. Persistir estado/telemetria (arquivo local ou SQLite).
5. Criar testes automatizados (unitários para `runner` e integrações simuladas).

## Execução como serviço no WSL (systemd)

Há um exemplo em `docs/systemd/codex-flow-runner.service`.

Passos gerais:

1. Copiar unit para `/etc/systemd/system/`.
2. Ajustar `WorkingDirectory`, `User` e caminho do `EnvironmentFile`.
3. Executar:
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable codex-flow-runner`
   - `sudo systemctl start codex-flow-runner`
4. Acompanhar logs:
   - `journalctl -u codex-flow-runner -f`
