# Tickets Internos

Este diretorio guarda tickets internos em Markdown para backlog tecnico e de qualidade.

## Estrutura
- `tickets/open/`: tickets ativos.
- `tickets/closed/`: tickets encerrados.
- `tickets/templates/`: template oficial para novos tickets.

## Convencao de nome
Use sempre:
- `YYYY-MM-DD-<slug>.md`

Exemplo:
- `2026-02-14-execplan-generation-missing-context.md`

## Como abrir um ticket
Na raiz do repositorio:

```bash
mkdir -p tickets/open tickets/closed tickets/templates
TICKET_DATE="$(date -u +%F)"
SLUG="descreva-o-problema"
TICKET_FILE="tickets/open/${TICKET_DATE}-${SLUG}.md"
cp tickets/templates/internal-ticket-template.md "$TICKET_FILE"
```

Depois preencha os campos obrigatorios do template.

## Fluxo de status
- Crie com `Status: open`.
- Atualize para `in-progress` ao iniciar implementacao.
- Atualize para `blocked` se faltar decisao/dependencia externa.
- Mova para `tickets/closed/` quando encerrar e registre motivo de fechamento.
- Se um commit/push contem a solucao de um ticket em `tickets/open/`, esse mesmo commit deve incluir a movimentacao do ticket para `tickets/closed/` e o preenchimento da secao `Closure`.

Exemplo de fechamento:

```bash
mv tickets/open/2026-02-14-exemplo.md tickets/closed/2026-02-14-exemplo.md
```

Checklist minimo no commit de fechamento:
- arquivo movido de `tickets/open/` para `tickets/closed/`;
- `Status: closed`;
- `Closed at (UTC)`, `Closure reason` e `Related PR/commit/execplan` preenchidos.

## Relacao com planejamento
Quando um ticket exigir mudanca complexa (multiarquivo, contrato, alto risco), abrir um ExecPlan em `execplans/` antes de implementar.

## Regra de seguranca
Nunca registrar segredos ou payload sensivel nos tickets.
Use IDs, caminhos de artefatos e trechos redigidos.
