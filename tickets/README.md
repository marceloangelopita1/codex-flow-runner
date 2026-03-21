# Tickets Internos

Este diretório guarda tickets internos em Markdown para backlog técnico e de qualidade.

## Estrutura
- `tickets/open/`: tickets ativos.
- `tickets/closed/`: tickets encerrados.
- `tickets/templates/`: template oficial para novos tickets.

## Convenção de nome
Use sempre:
- `YYYY-MM-DD-<slug>.md`

Exemplo:
- `2026-02-14-execplan-generation-missing-context.md`

## Como abrir um ticket
Na raiz do repositório:

```bash
mkdir -p tickets/open tickets/closed tickets/templates
TICKET_DATE="$(date -u +%F)"
SLUG="descreva-o-problema"
TICKET_FILE="tickets/open/${TICKET_DATE}-${SLUG}.md"
cp tickets/templates/internal-ticket-template.md "$TICKET_FILE"
```

Depois preencha os campos obrigatórios do template.

## Fluxo de status
- Crie com `Status: open`.
- Atualize para `in-progress` ao iniciar implementação.
- Atualize para `blocked` se faltar decisão/dependência externa.
- Tickets `blocked` continuam no backlog, mas o `/run_all` não os consome até que alguém os destrave manualmente.
- Mova para `tickets/closed/` quando encerrar e registre motivo de fechamento.
- Use `Closure reason: split-follow-up` quando precisar encerrar o ticket atual por rastreabilidade e abrir um novo ticket de continuidade.
- Se o follow-up representar apenas espera por insumo externo/manual sem próximo passo local, abra esse novo ticket já como `Status: blocked`.
- Se um commit/push contém a solução de um ticket em `tickets/open/`, esse mesmo commit deve incluir a movimentação do ticket para `tickets/closed/` e o preenchimento da seção `Closure`.

Exemplo de fechamento:

```bash
mv tickets/open/2026-02-14-exemplo.md tickets/closed/2026-02-14-exemplo.md
```

Checklist mínimo no commit de fechamento:
- arquivo movido de `tickets/open/` para `tickets/closed/`;
- `Status: closed`;
- `Closed at (UTC)`, `Closure reason` e `Related PR/commit/execplan` preenchidos.
- quando `Closure reason: split-follow-up`, incluir no mesmo commit o novo ticket em `tickets/open/` com vínculo ao ticket fechado.

## Relação com planejamento
Quando um ticket exigir mudança complexa (multiarquivo, contrato, alto risco), abrir um ExecPlan em `execplans/` antes de implementar.

## Regra de segurança
Nunca registrar segredos ou payload sensível nos tickets.
Use IDs, caminhos de artefatos e trechos redigidos.
