# [SPEC] Usabilidade do Bot no Telegram com Ícones Semânticos e Resumos de Status

## Metadata
- Spec ID: 2026-02-21-usabilidade-do-bot-no-telegram-com-icones-semanticos-e-resumos-de-status
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-02-21 16:50Z
- Last reviewed at (UTC): 2026-02-21 16:50Z
- Source: product-need
- Related tickets:
  - A definir
- Related execplans:
  - A definir
- Related commits:
  - A definir

## Objetivo e contexto
- Problema que esta spec resolve: mensagens do bot no Telegram ainda podem variar em formato e tamanho, dificultando leitura rápida e identificação imediata de estado operacional.
- Resultado esperado: definir uma especificação funcional para padronizar mensagens do bot com ícones por tipo de ação e resultado, junto de textos curtos e consistentes para status (início, progresso, bloqueio, conclusão e erro), melhorando leitura rápida, clareza operacional e acompanhamento do fluxo sequencial.
- Contexto funcional: o runner opera em fluxo sequencial de tickets e precisa refletir cada etapa importante no status do bot com consistência visual e textual.

## Jornada de uso
1. Operador inicia uma execução pelo Telegram.
2. Bot publica mensagem de início com ícone semântico e resumo curto do estado atual.
3. Durante a execução, bot publica atualizações de progresso mantendo padrão de ícone, estrutura e tamanho de texto.
4. Em caso de bloqueio ou erro, bot publica mensagem com ícone específico, causa resumida e ação esperada.
5. Ao concluir, bot publica status final com ícone de conclusão e resumo consolidado da execução.

## Requisitos funcionais
- RF-01: definir taxonomia de ícones semânticos para os estados `inicio`, `progresso`, `bloqueio`, `conclusao` e `erro`.
- RF-02: definir modelo textual curto e consistente para cada estado, com vocabulário operacional padronizado.
- RF-03: definir campos mínimos obrigatórios por mensagem de status (ex.: etapa, contexto do item atual e próximo passo quando aplicável).
- RF-04: padronizar o formato de mensagens de status para todo o fluxo sequencial, evitando variações entre comandos e etapas internas.
- RF-05: definir regra de atualização de status no Telegram alinhada aos marcos do loop principal e à observabilidade do sistema.
- RF-06: definir regra de clareza para mensagens de bloqueio e erro, incluindo orientação objetiva de ação esperada.
- RF-07: definir fallback textual quando ícones não forem renderizados pelo cliente Telegram.
- RF-08: definir limites de tamanho para preservar leitura rápida sem perda de contexto essencial.

## Nao-escopo
- Implementar nesta etapa alterações de código no bot.
- Alterar o fluxo sequencial para processamento paralelo de tickets.
- Redesenhar comandos do Telegram sem relação com padronização de status.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - A spec documenta mapeamento explícito de ícone para cada estado operacional obrigatório.
- [ ] CA-02 - A spec documenta modelos de mensagem curta para início, progresso, bloqueio, conclusão e erro.
- [ ] CA-03 - A spec define campos mínimos obrigatórios e regra de consistência textual entre estados.
- [ ] CA-04 - A spec define regra de fallback sem ícones e limites de tamanho das mensagens.
- [ ] CA-05 - A spec conecta os estados padronizados aos marcos do fluxo sequencial e da observabilidade do loop.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Escopo funcional aprovado para padronização de mensagens do bot no Telegram.
  - Requisitos e critérios observáveis definidos para orientar derivação técnica.
- Pendencias em aberto:
  - Derivar ticket em `tickets/open/` ou execplan em `execplans/` para implementação da padronização.
  - Implementar os modelos e validar comportamento em execução real do fluxo sequencial.
- Evidencias de validacao:
  - docs/specs/2026-02-21-usabilidade-do-bot-no-telegram-com-icones-semanticos-e-resumos-de-status.md
  - SPECS.md
  - docs/specs/templates/spec-template.md

## Riscos e impacto
- Risco funcional: sem padronização, operadores podem interpretar incorretamente o estado da execução.
- Risco operacional: mensagens longas ou inconsistentes podem reduzir capacidade de reação em incidentes e bloqueios.
- Mitigacao: adotar taxonomia única de ícones, textos curtos padronizados e critérios observáveis para validação.

## Decisoes e trade-offs
- 2026-02-21 - Priorizar legibilidade e consistência em mensagens de status do Telegram - reduz ambiguidade operacional com baixo impacto arquitetural.

## Historico de atualizacao
- 2026-02-21 16:50Z - Versão inicial da spec criada com `Status: approved` e `Spec treatment: pending`.
