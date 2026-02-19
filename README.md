# codex-flow-runner

Runner de tickets com **Node.js + TypeScript** para executar um fluxo **sequencial**:

1. detectar próximo ticket em `tickets/open/`;
2. gerar/atualizar ExecPlan em `execplans/`;
3. fechar ticket movendo para `tickets/closed/`;
4. criar commit git no mesmo ciclo;
5. expor status e controle por Telegram.

## Status atual (MVP funcional)

O projeto já executa o ciclo completo de fila + fechamento + versionamento.
A implementação de Codex está em modo local (`LocalCodexTicketFlowClient`), gerando ExecPlan automaticamente com base no ticket.

## Estrutura

```txt
src/
├── config/
├── core/
├── integrations/
└── types/
```

Pastas esperadas no repositório alvo:

- `tickets/open/`
- `tickets/closed/`
- `execplans/`

## Variáveis de ambiente

- `TELEGRAM_BOT_TOKEN` (**obrigatório**)
- `TELEGRAM_ALLOWED_CHAT_ID` (opcional)
- `REPO_PATH` (opcional, padrão: diretório atual)
- `POLL_INTERVAL_MS` (opcional, padrão: `5000`)
- `GIT_AUTO_PUSH` (opcional, padrão: `false`)

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run check`

## Controle por Telegram

- `/status` → mostra estado atual
- `/pause` → pausa processamento
- `/resume` → retoma processamento

## Execução com systemd (WSL)

Há uma unit de exemplo em `docs/systemd/codex-flow-runner.service`.
