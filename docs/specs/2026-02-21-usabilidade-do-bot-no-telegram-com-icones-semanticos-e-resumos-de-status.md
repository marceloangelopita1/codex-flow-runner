# [SPEC] Usabilidade do Bot no Telegram com Ícones Semânticos e Resumos de Status

## Metadata
- Spec ID: 2026-02-21-usabilidade-do-bot-no-telegram-com-icones-semanticos-e-resumos-de-status
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-02-21 16:50Z
- Last reviewed at (UTC): 2026-02-21 17:00Z
- Source: product-need
- Related tickets:
  - Nenhum (triagem final sem gaps pendentes).
- Related execplans:
  - Nenhum.
- Related commits:
  - chore(specs): triage 2026-02-21-usabilidade-do-bot-no-telegram-com-icones-semanticos-e-resumos-de-status.md (este changeset)

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

## Definicao funcional consolidada
### Taxonomia de estados, icones e fallback
| Estado | Icone semantico | Fallback textual | Uso principal |
| --- | --- | --- | --- |
| `inicio` | `▶️` | `[INICIO]` | Inicio de rodada ou fluxo aceito (`/run_all`, `/run_specs`). |
| `progresso` | `🔄` | `[PROGRESSO]` | Transicao entre fases (`plan`, `implement`, `close-and-version`) e atualizacoes de andamento. |
| `bloqueio` | `🧱` | `[BLOQUEIO]` | Bloqueios operacionais sem erro tecnico fatal (acesso, concorrencia, capacidade, elegibilidade). |
| `conclusao` | `✅` | `[CONCLUSAO]` | Finalizacao bem-sucedida da unidade observavel (ticket/processo). |
| `erro` | `❌` | `[ERRO]` | Falha final ou interrupcao por erro tecnico/operacional. |

### Modelos de mensagem curta por estado
- `inicio`: `▶️ [INICIO] <etapa>: <resumo curto>. Proximo: <acao imediata>.`
- `progresso`: `🔄 [PROGRESSO] <etapa>: <resumo curto>. Proximo: <acao imediata>.`
- `bloqueio`: `🧱 [BLOQUEIO] <etapa>: <causa curta>. Acao esperada: <instrucao objetiva>.`
- `conclusao`: `✅ [CONCLUSAO] <etapa>: <resultado curto>. Evidencia: <artefato-chave>.`
- `erro`: `❌ [ERRO] <etapa>: <causa curta>. Acao esperada: <instrucao objetiva>.`

### Campos minimos obrigatorios e regra de consistencia
- Campos obrigatorios em toda mensagem: `estado`, `etapa`, `resumo`.
- Campos condicionais obrigatorios:
  - `proximo passo` para `inicio` e `progresso`.
  - `acao esperada` para `bloqueio` e `erro`.
  - `evidencia` para `conclusao`.
- Regra de consistencia textual:
  - mesmo padrao `<icone> [TAG] <etapa>: <resumo>. <complemento>.`
  - frases curtas e objetivas, sem variacao de terminologia entre estados.
  - usar nomes canonicos de etapa (`spec-triage`, `plan`, `implement`, `close-and-version`, `idle`, `error`).

### Regra de fallback sem icones e limites de tamanho
- Quando o cliente nao renderizar icones, manter apenas prefixo textual `[TAG]` com o mesmo conteudo.
- Limites por mensagem:
  - maximo de 3 linhas;
  - maximo de 220 caracteres no total;
  - resumo principal limitado a 110 caracteres.

### Regra de atualizacao alinhada ao fluxo sequencial e observabilidade
- `inicio`: publicar ao aceitar e iniciar uma rodada/fluxo (`run-all` ou `run-specs`).
- `progresso`: publicar na mudanca de fase e no avancar entre tickets/specs no loop.
- `bloqueio`: publicar quando comando/acao for recusado por gate operacional.
- `conclusao`: publicar no resumo final de sucesso por ticket.
- `erro`: publicar no resumo final de falha por ticket ou erro terminal de fluxo.
- `/status` deve refletir o mesmo estado corrente (`phase`, `currentTicket`, `currentSpec`, `lastMessage`, `updatedAt`) para coerencia com as mensagens enviadas.

## Nao-escopo
- Implementar nesta etapa alterações de código no bot.
- Alterar o fluxo sequencial para processamento paralelo de tickets.
- Redesenhar comandos do Telegram sem relação com padronização de status.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - A spec documenta mapeamento explícito de ícone para cada estado operacional obrigatório.
- [x] CA-02 - A spec documenta modelos de mensagem curta para início, progresso, bloqueio, conclusão e erro.
- [x] CA-03 - A spec define campos mínimos obrigatórios e regra de consistência textual entre estados.
- [x] CA-04 - A spec define regra de fallback sem ícones e limites de tamanho das mensagens.
- [x] CA-05 - A spec conecta os estados padronizados aos marcos do fluxo sequencial e da observabilidade do loop.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Matriz RF:
  - Atendidos: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Matriz CA:
  - Atendidos: CA-01, CA-02, CA-03, CA-04, CA-05.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Itens atendidos:
  - Taxonomia semantica de icones, tags de fallback e uso operacional consolidada.
  - Modelos curtos por estado definidos com estrutura textual unica e vocabulario padronizado.
  - Campos obrigatorios/condicionais por estado definidos com regra de consistencia textual entre mensagens.
  - Regra de fallback sem icones e limites objetivos de tamanho definida para leitura rapida.
  - Regra de atualizacao conectada aos marcos do loop sequencial e coerencia com `/status`.
- Pendencias em aberto:
  - Nenhuma pendencia de triagem da documentacao desta spec.
- Evidencias de validacao:
  - docs/specs/2026-02-21-usabilidade-do-bot-no-telegram-com-icones-semanticos-e-resumos-de-status.md
  - docs/specs/2026-02-19-telegram-run-status-notification.md
  - docs/specs/2026-02-19-approved-spec-triage-run-specs.md
  - src/core/runner.ts
  - src/integrations/telegram-bot.ts
  - src/integrations/telegram-bot.test.ts
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
- 2026-02-21 17:00Z - Triagem final consolidou taxonomia, templates, fallback, limites e matriz RF/CA sem gaps pendentes; spec atualizada para `Status: attended` e `Spec treatment: done`.
