# codex-flow-runner

Runner de tickets com **Node.js + TypeScript** para executar um fluxo **sequencial**:

1. detectar próximo ticket em `tickets/open/`;
2. gerar/atualizar ExecPlan em `execplans/`;
3. fechar ticket movendo para `tickets/closed/`;
4. criar commit git no mesmo ciclo;
5. expor status e controle por Telegram.

## Status atual

O projeto executa o ciclo sequencial por ticket com chamadas reais ao Codex CLI (`plan -> implement -> close-and-version`), mantendo controle operacional por Telegram.

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

- `CODEX_API_KEY` (**obrigatório**)
- `TELEGRAM_BOT_TOKEN` (**obrigatório**)
- `TELEGRAM_ALLOWED_CHAT_ID` (opcional)
- `REPO_PATH` (opcional, padrão: diretório atual)
- `POLL_INTERVAL_MS` (opcional, padrão: `5000`)

Observacao operacional:
- o ciclo de fechamento/versionamento exige commit + push por ticket (sem modo opcional de push).

Pré-requisito operacional:
- `codex` instalado e disponível no PATH (ex.: `npm i -g @openai/codex`).

## Scripts

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run check`
- `npm test`

## Controle por Telegram

- `/run-all` → inicia o loop sequencial de processamento de tickets
- `/status` → mostra estado atual
- `/pause` → pausa processamento
- `/resume` → retoma processamento

### Modos de acesso (`TELEGRAM_ALLOWED_CHAT_ID`)

- Modo restrito (`TELEGRAM_ALLOWED_CHAT_ID` configurado):
  - Somente o chat com `chat.id` igual ao valor configurado pode executar comandos do bot.
  - Tentativas de chat nao autorizado sao bloqueadas e registradas em log com `chatId`, `eventType` e `command`.
- Modo sem restricao (`TELEGRAM_ALLOWED_CHAT_ID` ausente):
  - O bot aceita comandos de qualquer chat.
  - Indicado apenas para ambiente de desenvolvimento controlado.

## Execução com systemd (WSL)

Há uma unit de exemplo em `docs/systemd/codex-flow-runner.service`.

## Documentacao operacional

Este repositorio agora possui quatro documentos canonicos para evolucao operacional:

- `EXTERNAL_PROMPTS.md`: padrao para requests/responses/decisions de IA externa.
- `INTERNAL_TICKETS.md`: ciclo oficial de abertura, triagem e fechamento de tickets internos.
- `PLANS.md`: padrao de ExecPlan para criacao de planos em `execplans/`.
- `SPECS.md`: padrao de especificacoes funcionais/jornadas em `docs/specs/`, com status vivo de atendimento.

Estruturas associadas:

- `external_prompts/requests/`
- `external_prompts/responses/`
- `external_prompts/decisions/`
- `external_prompts/templates/`
- `tickets/templates/internal-ticket-template.md`
- `docs/specs/templates/spec-template.md`
