# [SPEC] Selecao e Implementacao Manual de Ticket via Telegram

## Metadata
- Spec ID: 2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-02-23 16:08Z
- Last reviewed at (UTC): 2026-02-23 16:08Z
- Source: product-need
- Related tickets:
  - A definir na derivacao da spec.
- Related execplans:
  - A definir na derivacao da spec.
- Related commits:
  - N/A (spec-only nesta etapa).

## Objetivo e contexto
- Problema que esta spec resolve: o bot ainda nao oferece um fluxo guiado para escolher manualmente um ticket aberto, inspecionar seu conteudo completo no chat e executar apenas esse ticket no loop sequencial.
- Resultado esperado: adicionar um fluxo de "Tickets abertos" no Telegram que lista arquivos em `tickets/open/`, permite selecionar um ticket, envia o conteudo completo em multiplas mensagens quando necessario e oferece acao explicita para implementar somente o ticket selecionado.
- Contexto funcional: o runner deve manter processamento estritamente sequencial, com no maximo 1 ticket em execucao por vez, com logs e status claros em todas as etapas.

## Jornada de uso
1. Operador aciona o fluxo "Tickets abertos" por comando dedicado ou botao equivalente no menu principal do bot.
2. Bot lista os arquivos disponiveis em `tickets/open/` em ordem deterministica e com seletor por ticket.
3. Operador seleciona um ticket especifico na lista.
4. Bot valida se o ticket ainda existe e envia o conteudo completo no chat, quebrando em multiplas mensagens quando o tamanho exceder limite do Telegram.
5. Bot exibe o botao "Implementar este ticket" associado ao ticket selecionado.
6. Operador aciona "Implementar este ticket".
7. Sistema valida lock de concorrencia (sem outra execucao em andamento), inicia o loop sequencial apenas para o ticket escolhido, publica status de progresso e registra logs por etapa.
8. Ao concluir com sucesso, fluxo de fechamento padrao move o arquivo de `tickets/open/` para `tickets/closed/` no mesmo commit da implementacao.

## Requisitos funcionais
- RF-01: disponibilizar comando/entrada de UI "Tickets abertos" no bot Telegram.
- RF-02: listar tickets de `tickets/open/` em formato navegavel no chat (ex.: botoes inline), com identificador unico por arquivo.
- RF-03: manter ordenacao deterministica da lista para evitar variacao entre chamadas consecutivas sem mudanca de estado.
- RF-04: ao selecionar ticket, carregar conteudo atual do arquivo e enviar integralmente no chat.
- RF-05: quando o conteudo exceder limite de mensagem do Telegram, quebrar em partes mantendo ordem e continuidade.
- RF-06: apos exibicao do conteudo, mostrar acao "Implementar este ticket" vinculada ao ticket selecionado.
- RF-07: ao acionar implementacao manual, executar somente o ticket escolhido no loop sequencial, sem disparar execucao de outros tickets.
- RF-08: bloquear inicio quando houver execucao em andamento e retornar mensagem de bloqueio clara ao operador.
- RF-09: validar erros de ticket inexistente/removido entre listagem e selecao, com resposta explicita e orientacao para atualizar a lista.
- RF-10: validar diretorio vazio (sem tickets abertos) e responder com status informativo sem erro tecnico.
- RF-11: aplicar trava de concorrencia global para garantir no maximo 1 ticket em processamento por vez em todo o runner.
- RF-12: emitir logs e atualizacoes de status no bot em cada marco: listagem, selecao, envio de conteudo, tentativa de implementacao, lock adquirido/negado, inicio, progresso, conclusao ou falha.
- RF-13: preservar regra de fechamento padrao: mover ticket para `tickets/closed/` no mesmo commit que resolve o ticket.

## Nao-escopo
- Alterar o modelo sequencial para execucao paralela de tickets.
- Redesenhar fluxos nao relacionados a tickets abertos (ex.: comandos de specs) nesta iteracao.
- Introduzir persistencia externa nova apenas para este fluxo (banco de dados, filas dedicadas).

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Ao acionar "Tickets abertos", o bot lista tickets de `tickets/open/`; se vazio, retorna mensagem explicita de nenhum ticket disponivel.
- [ ] CA-02 - Ao selecionar um ticket valido, o bot envia todo o conteudo do arquivo no chat e respeita quebra em multiplas mensagens quando necessario.
- [ ] CA-03 - Apos envio do conteudo, o bot exibe o botao "Implementar este ticket" para o ticket selecionado.
- [ ] CA-04 - Se o ticket nao existir mais no momento da selecao/execucao, o bot retorna erro funcional claro sem iniciar o loop.
- [ ] CA-05 - Se houver execucao em andamento, "Implementar este ticket" e recusado com mensagem de bloqueio e sem alterar estado de execucao atual.
- [ ] CA-06 - Quando permitido, a acao "Implementar este ticket" inicia execucao sequencial apenas do ticket escolhido.
- [ ] CA-07 - Durante a execucao manual, logs e status no bot refletem marcos principais (inicio, progresso por etapa, conclusao/erro).
- [ ] CA-08 - Em sucesso, o ticket processado e movido de `tickets/open/` para `tickets/closed/` no mesmo commit de entrega.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - Escopo funcional aprovado para derivacao tecnica e implementacao.
- Pendencias em aberto:
  - Criar ticket ou execplan de implementacao com desenho tecnico detalhado.
  - Implementar comandos/UI Telegram, validacoes e lock de concorrencia.
  - Validar criterios de aceitacao com testes e evidencia operacional.
- Evidencias de validacao:
  - docs/specs/2026-02-23-selecao-e-implementacao-manual-de-ticket-via-telegram.md

## Riscos e impacto
- Risco funcional: selecao de ticket desatualizada pode gerar tentativa de execucao de arquivo removido.
- Risco operacional: sem lock global consistente, pode ocorrer corrida entre fluxos manuais e fluxos automaticos.
- Mitigacao: revalidar existencia do arquivo imediatamente antes da execucao e centralizar lock de concorrencia unico no runner.

## Decisoes e trade-offs
- 2026-02-23 - Priorizar implementacao manual de ticket com lock global unico - garante previsibilidade operacional e preserva arquitetura sequencial.
- 2026-02-23 - Entregar conteudo completo no chat com chunking - aumenta transparencia para operador com custo de maior volume de mensagens.

## Historico de atualizacao
- 2026-02-23 16:08Z - Versao inicial da spec criada com `Status: approved` e `Spec treatment: pending`.
