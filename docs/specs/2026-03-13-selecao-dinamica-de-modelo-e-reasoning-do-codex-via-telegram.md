# [SPEC] Selecao dinamica de modelo e reasoning do Codex via Telegram

## Metadata
- Spec ID: 2026-03-13-selecao-dinamica-de-modelo-e-reasoning-do-codex-via-telegram
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-03-13 19:12Z
- Last reviewed at (UTC): 2026-03-13 19:14Z
- Source: product-need
- Related tickets:
  - Nenhum.
- Related execplans:
  - Nenhum.
- Related commits:
  - Workspace changes ainda nao commitados.

## Objetivo e contexto
- Problema que esta spec resolve: o bot Telegram operava sempre com o modelo e o reasoning efetivos do ambiente local do Codex, sem expor lista dinamica de opcoes, sem permitir selecao por projeto e sem observabilidade clara do que estava ativo.
- Resultado esperado: adicionar os comandos `/models` e `/reasoning`, com selecao por clique, destaque visual do item ativo, persistencia runner-local por projeto e propagacao consistente para os proximos turnos/sessoes do Codex.
- Contexto funcional: o runner ja possui projeto ativo global no Telegram, sessoes interativas (`/codex_chat` e `/plan_spec`) e runs multi-etapa (`/run_all`, `/run_specs`, ticket unitario). A nova capacidade precisa respeitar esse modelo operacional sem alterar `~/.codex/config.toml` nem introduzir listas hardcoded.

## Jornada de uso
1. Operador seleciona o projeto ativo via `/projects` e, em seguida, envia `/models`.
2. Bot consulta o catalogo local do Codex, lista os modelos selecionaveis com paginacao e marca com `✅` o modelo atualmente resolvido para aquele projeto.
3. Operador escolhe um novo modelo; o runner persiste a preferencia no armazenamento runner-local e, se necessario, reajusta o reasoning para o default suportado pelo novo modelo, informando isso na confirmacao.
4. Operador envia `/reasoning`; o bot mostra apenas os niveis suportados pelo modelo atual e marca com `✅` o effort ativo.
5. As mudancas passam a valer no proximo turno das sessoes interativas e no proximo slot das execucoes multi-etapa, enquanto `/status` e os logs passam a refletir a preferencia selecionada e, quando observavel, o valor efetivamente usado pelo Codex.

## Requisitos funcionais
- RF-01: disponibilizar os comandos `/models` e `/reasoning` no bot Telegram, ambos com selecao por clique e callbacks reutilizaveis no estilo de `/projects`.
- RF-02: obter a lista de modelos a partir do catalogo local do Codex (`~/.codex/models_cache.json`), sem fallback hardcoded; se o catalogo estiver ausente, invalido ou ilegivel, retornar erro funcional observavel ao operador e registrar log.
- RF-03: exibir como opcoes clicaveis apenas modelos selecionaveis no catalogo; se o modelo atualmente resolvido deixar de ser selecionavel, ele deve continuar visivel no resumo como "atual/indisponivel", mas nao como opcao de clique.
- RF-04: resolver as preferencias de Codex por projeto com a ordem de precedencia: preferencia salva pelo runner, configuracao local atual do Codex (`model`, `model_reasoning_effort`) e default dinamico derivado do catalogo.
- RF-05: obter a lista de reasoning dinamicamente a partir de `supported_reasoning_levels` do modelo atualmente resolvido para o projeto.
- RF-06: ao trocar o modelo, se o reasoning atual nao for suportado pelo novo modelo, reajustar automaticamente para `default_reasoning_level` e informar o reset ao operador.
- RF-07: persistir modelo e reasoning em armazenamento runner-local por projeto, sem editar `~/.codex/config.toml`.
- RF-08: considerar callbacks de `/models` e `/reasoning` como scoped ao projeto ativo no momento da renderizacao; se o projeto ativo mudar antes do clique, a mensagem deve ser tratada como stale e o bot deve orientar reabrir o comando.
- RF-09: considerar callbacks de `/reasoning` stale tambem quando o modelo atual do projeto mudar entre a renderizacao da lista e o clique.
- RF-10: aplicar as mudancas de modelo/reasoning no proximo turno de `/codex_chat` e `/plan_spec`, sem interromper o turno em andamento.
- RF-11: congelar um snapshot de modelo/reasoning no inicio de cada slot de run multi-etapa, mantendo o slot corrente estavel ate o fim e aplicando eventuais mudancas apenas no proximo slot.
- RF-12: injetar `-m <model>` e `-c model_reasoning_effort=\"<effort>\"` nas invocacoes relevantes do Codex CLI, incluindo `exec` e `exec resume`.
- RF-13: incluir no `/status` o modelo e o reasoning selecionados para o projeto ativo e, quando observavel a partir do transcript/eventos do Codex, tambem o ultimo modelo/reasoning efetivamente usados em sessoes interativas.
- RF-14: registrar logs para origem do catalogo, selecoes de modelo/reasoning, resets automaticos de reasoning, callbacks stale e falhas de leitura do catalogo.

## Nao-escopo
- Editar o arquivo global `~/.codex/config.toml` a partir do Telegram.
- Manter listas estaticas de modelos ou reasoning dentro do runner.
- Cobrir gerenciamento de modelo para Codex Cloud tasks fora do CLI local.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/models` mostra lista dinamica do catalogo local do Codex, com paginacao e `✅` no modelo ativo do projeto atual.
- [x] CA-02 - `/reasoning` mostra apenas os niveis suportados pelo modelo atual e marca com `✅` o effort ativo.
- [x] CA-03 - Trocar modelo ou reasoning em um projeto nao altera as preferencias de outro projeto.
- [x] CA-04 - Ao trocar para um modelo que nao suporta o reasoning atual, o sistema reseta para o default do novo modelo e informa isso ao operador.
- [x] CA-05 - Catalogo ausente, invalido ou ilegivel retorna erro observavel, sem usar fallback hardcoded.
- [x] CA-06 - Callback de lista antiga falha como stale quando o projeto ativo muda; no caso de `/reasoning`, tambem falha quando o modelo muda entre renderizacao e clique.
- [x] CA-07 - Mudanca feita durante `/codex_chat` ou `/plan_spec` passa a valer no proximo turno, sem interromper o turno em andamento.
- [x] CA-08 - Mudanca feita durante `/run_all`, `/run_specs` ou execucao unitaria de ticket nao altera o slot corrente e passa a valer apenas no proximo slot daquele projeto.
- [x] CA-09 - `/status` reflete a preferencia resolvida do projeto ativo e, quando disponivel, o ultimo modelo/reasoning observados na sessao interativa.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Matriz RF:
  - Atendidos: RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Matriz CA:
  - Atendidos: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09.
  - Parcialmente atendidos: nenhum.
  - Nao atendidos: nenhum.
- Itens atendidos:
  - Contrato tipado e servico central de preferencias do Codex por projeto entregues com resolucao de precedencia, derivacao de opcoes dinamicas e persistencia runner-local (`src/types/codex-preferences.ts`, `src/core/codex-preferences.ts`, `src/core/codex-preferences.test.ts`).
  - Leitura dinamica do catalogo local e da configuracao local do Codex implementadas sem fallback hardcoded, com tratamento explicito de erro (`src/integrations/codex-model-catalog.ts`, `src/integrations/codex-model-catalog.test.ts`, `src/integrations/codex-config.ts`).
  - Persistencia runner-local por projeto implementada em `.codex-flow-runner/codex-project-preferences.json` no espaco operacional do runner (`src/integrations/codex-project-preferences-store.ts`, `src/integrations/codex-project-preferences-store.test.ts`).
  - Integracao do runner e do cliente Codex CLI concluida com snapshot por slot, atualizacao no proximo turno para sessoes interativas, injecao de `-m`/`-c` e captura do contexto efetivamente observado no transcript (`src/core/runner.ts`, `src/core/runner.test.ts`, `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `src/types/state.ts`).
  - Camada Telegram evoluida com `/models`, `/reasoning`, controles de stale, paginacao, marcador visual do item ativo e bloco de modelo/reasoning no `/status` (`src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `src/main.ts`, `README.md`).
- Pendencias em aberto:
  - Nenhuma pendencia tecnica.
  - Validacao manual externa pendente: confirmar a UX em um bot Telegram real com catalogo do Codex disponivel no ambiente operacional.
- Evidencias de validacao:
  - `npm run check`
  - `npm test`
  - `src/core/codex-preferences.ts`
  - `src/integrations/codex-model-catalog.ts`
  - `src/integrations/codex-project-preferences-store.ts`
  - `src/integrations/codex-client.ts`
  - `src/core/runner.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/main.ts`

## Riscos e impacto
- Risco funcional: catalogo local do Codex invalido ou desatualizado pode impedir a renderizacao das listas ou tornar a preferencia persistida incompativel com o ambiente corrente.
- Risco operacional: mudancas de modelo durante execucao poderiam gerar comportamento inconsistente se nao houvesse separacao entre proximo turno e slot corrente.
- Mitigacao: falhar de forma observavel sem fallback hardcoded, revalidar preferencias contra o catalogo em toda resolucao, reajustar reasoning automaticamente quando necessario e congelar snapshot por slot nas execucoes multi-etapa.

## Decisoes e trade-offs
- 2026-03-13 - Usar o catalogo local do Codex como fonte de verdade para modelos e reasoning - evita drift e reduz manutencao manual quando novos modelos sao lancados ou removidos.
- 2026-03-13 - Persistir preferencias por projeto em armazenamento runner-local - preserva isolamento operacional entre projetos sem alterar a configuracao global do Codex.
- 2026-03-13 - Aplicar mudancas no proximo turno das sessoes interativas e no proximo slot das runs multi-etapa - equilibra flexibilidade no Telegram com previsibilidade durante execucao.

## Historico de atualizacao
- 2026-03-13 19:12Z - Versao inicial da spec criada para registrar a necessidade de selecao dinamica de modelo e reasoning via Telegram.
- 2026-03-13 19:14Z - Implementacao concluida com `/models`, `/reasoning`, persistencia por projeto, integracao com Codex CLI, atualizacao de `/status` e cobertura automatizada; spec atualizada para `Status: attended` e `Spec treatment: done`.
