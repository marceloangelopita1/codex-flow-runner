# codex-flow-runner

Runner de tickets com **Node.js + TypeScript** para executar um fluxo **sequencial**:

1. detectar proximo ticket em `tickets/open/` por `Priority` (`P0 -> P1 -> P2`; empate com fallback por nome de arquivo);
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

- `TELEGRAM_BOT_TOKEN` (**obrigatório**)
- `TELEGRAM_ALLOWED_CHAT_ID` (**obrigatório**)
- `PROJECTS_ROOT_PATH` (**obrigatório**, ex.: `/home/mapita/projetos`)
- `POLL_INTERVAL_MS` (opcional, padrão: `5000`)
- `RUN_ALL_MAX_TICKETS_PER_ROUND` (opcional, padrão: `20`)
- O app carrega automaticamente o arquivo `.env` na raiz do projeto ao iniciar (sem necessidade de `source .env` manual para `npm run dev`/`npm start`).

Regras de bootstrap multi-projeto:
- o runner descobre projetos elegíveis no primeiro nível de `PROJECTS_ROOT_PATH`.
- projeto elegível = diretório que possui `.git` e `tickets/open/`.
- o projeto ativo global é restaurado de `PROJECTS_ROOT_PATH/.codex-flow-runner/active-project.json` quando válido.
- se o estado persistido estiver ausente/inválido/desatualizado, o bootstrap usa fallback para o primeiro projeto elegível em ordem alfabética e persiste a nova seleção.
- não existe fallback de compatibilidade para `REPO_PATH`.

Observacao operacional:
- o ciclo de fechamento/versionamento exige commit + push por ticket (sem modo opcional de push).
- cada comando `/run_all` processa no maximo `RUN_ALL_MAX_TICKETS_PER_ROUND` tickets por rodada; ao atingir o limite, a rodada e encerrada de forma controlada.

Pré-requisito operacional:
- `codex` instalado e disponível no PATH (ex.: `npm i -g @openai/codex`).
- `codex` autenticado no mesmo usuário do processo (executar `codex login` antes de subir o runner).
- Sem sessão válida no `codex` CLI, `/run_all` falha cedo com instrução para autenticação.

## Scripts

- `npm run dev` (execução local sem auto-reload; recomendado para usar `/run_all` no próprio repositório)
- `npm run dev:watch` (desenvolvimento com hot-reload)
- `npm run build`
- `npm start`
- `npm run check`
- `npm test`

## Controle por Telegram

- `/start` → mostra descrição do bot e comandos disponíveis
- `/run_all` → inicia o loop sequencial de processamento de tickets
- `/run-all` → alias legado compatível para `/run_all`
- `/specs` → lista specs elegíveis (`Status: approved` + `Spec treatment: pending`) do projeto ativo
- `/run_specs <arquivo>` → executa triagem da spec informada (aceita `<arquivo>.md` ou `docs/specs/<arquivo>.md`)
- `/status` → mostra estado atual
- `/pause` → pausa processamento
- `/resume` → retoma processamento
- `/projects` → lista projetos elegíveis com paginação e marca o projeto ativo
- `/select_project <nome>` → seleciona projeto ativo por nome (fallback textual)
- `/select-project <nome>` → alias legado compatível para `/select_project`

### Modos de acesso (`TELEGRAM_ALLOWED_CHAT_ID`)

- `TELEGRAM_ALLOWED_CHAT_ID` e obrigatorio no bootstrap.
- Somente o chat com `chat.id` igual ao valor configurado pode executar comandos do bot.
- Tentativas de chat nao autorizado sao bloqueadas e registradas em log com `chatId`, `eventType` e `command`.

## Execução com systemd (WSL)

Este projeto foi preparado para ficar ligado continuamente no WSL via `systemd`.

Pré-requisito do WSL:

```ini
# /etc/wsl.conf
[boot]
systemd=true
```

Depois aplique com `wsl --shutdown` (no Windows) e reabra a distro.

Passo a passo da service:

1. Copie e ajuste a unit de exemplo `docs/systemd/codex-flow-runner.service`:
   - `User=...`
   - `WorkingDirectory=...`
   - `EnvironmentFile=...`
   - `Environment=PATH=...` (deve incluir os diretórios de `node`, `npm` e `codex`)
2. Instale a unit:
   - `sudo cp docs/systemd/codex-flow-runner.service /etc/systemd/system/codex-flow-runner.service`
3. Recarregue e habilite no boot:
   - `sudo systemctl daemon-reload`
   - `sudo systemctl enable --now codex-flow-runner`
4. Verifique:
   - `systemctl status codex-flow-runner`
   - `journalctl -u codex-flow-runner -f`

Notas operacionais:
- Execute `codex login` no mesmo usuário configurado na unit antes de subir o serviço.
- Se o `codex` estiver fora do PATH padrão do `systemd`, adicione explicitamente o diretório na linha `Environment=PATH=...`.
- Para depuração da sessão interativa `/plan_spec`, você pode habilitar:
  - `CODEX_INTERACTIVE_VERBOSE_LOGS=1` para logs detalhados de stdin/stdout da sessão.
  - `CODEX_INTERACTIVE_SCRIPT_LOG_PATH=/tmp/codex-plan-spec.tty.log` para salvar transcript bruto do pseudo-TTY e acompanhar com `tail -f`.

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
