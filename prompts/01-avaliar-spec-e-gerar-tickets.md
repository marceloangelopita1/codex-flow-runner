# Prompt: Avaliar Spec e Gerar Tickets

Quero uma avaliação de gaps de implementação para a spec abaixo, sem implementar código nesta etapa.

SPEC alvo:
- <SPEC_PATH>

Regras do repositório (obrigatórias):
- Seguir `SPECS.md`, `INTERNAL_TICKETS.md` e `tickets/templates/internal-ticket-template.md`.
- Aplicar também o checklist compartilhado em `docs/workflows/codex-quality-gates.md`.
- Tickets novos devem ser criados em `tickets/open/` com nome `YYYY-MM-DD-<slug>.md`.
- A derivação inicial da spec cria apenas tickets em `tickets/open/`, mesmo quando o escopo estiver claro; `execplan` só pode surgir depois, a partir de ticket, quando necessário.
- Não incluir segredos/dados sensíveis.
- Fluxo é sequencial.
- Priorizar gaps considerando consumo real da fila: `/run-all` processa `P0` antes de `P1` e `P1` antes de `P2` (empate sem ordem funcional obrigatória).

Tarefa:
1. Ler a spec alvo e extrair RFs, critérios de aceitação (CAs), RNFs, restricoes tecnicas/documentais relevantes, assumptions/defaults, validacoes pendentes ou manuais e nao-escopo.
2. Comparar com o estado atual do código e classificar cada item como:
   - atendido
   - parcialmente atendido
   - não atendido
3. Para cada gap, explicar evidência objetiva (arquivo/função/comportamento observado).
4. Propor agrupamento de trabalho em 1 ou mais tickets, conforme escopo:
   - Mesmo contexto técnico e alta dependência: agrupar no mesmo ticket.
   - Contextos independentes ou risco diferente: separar em tickets distintos.
   - Gap grande: quebrar em tickets menores com entregáveis claros.
   - Se a spec trouxer `Validacoes pendentes ou manuais`, decidir explicitamente quais delas sao relevantes para cobertura ou aceite de cada ticket proposto.
5. Criar os ticket(s) em `tickets/open/` usando o template oficial e preenchendo, quando aplicável:
   - `Source spec`;
   - `Source requirements (RFs/CAs/RNFs/restricoes tecnicas relevantes)`;
   - `Inherited assumptions/defaults`;
   - heranca explicita de RNFs e restricoes tecnicas/documentais relevantes da spec quando elas influenciarem implementacao, aceite, documentacao ou fechamento do ticket;
   - heranca explicita de `Validacoes pendentes ou manuais` da spec quando elas forem relevantes para o escopo, cobertura ou aceite do ticket;
   - closure criteria mapeados para evidências observáveis, inclusive quando a spec exigir revisao documental ou outra obrigacao tecnica verificavel.
   - Se alguma validacao pendente/manual presente na spec nao for herdada por nenhum ticket, justificar objetivamente por que ela nao e relevante ao pacote derivado atual.
6. Atualizar a spec:
   - `Last reviewed at (UTC)` com timestamp atual;
   - `Related tickets` com os novos tickets;
   - seção `Status de atendimento` com pendências objetivas.
   - Manter `Status: approved` (a menos que você justifique claramente outra mudança).

Saída esperada no chat:
- Matriz RF/CA x status (atendido/parcial/não atendido).
- Lista dos gaps priorizados (P0/P1/P2, S1/S2/S3).
- Assumptions/defaults relevantes herdados da spec.
- RNFs e restricoes tecnicas/documentais relevantes herdados da spec e onde eles foram refletidos.
- Validacoes pendentes/manuais relevantes herdadas da spec e onde elas foram refletidas.
- Quais tickets foram criados e por quê.
- Caminhos dos arquivos criados/atualizados.
