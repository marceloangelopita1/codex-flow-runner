# [SPEC] /discover_spec para entrevista profunda de alinhamento antes da spec

## Metadata
- Spec ID: 2026-03-18-discover-spec-entrevista-profunda-de-alinhamento
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-03-18 18:49Z
- Last reviewed at (UTC): 2026-03-18 21:17Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md
  - tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md
  - tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md
- Related execplans:
  - execplans/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md
  - execplans/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md
  - execplans/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md
- Related commits:
  - `f03508a` - `chore(tickets): close 2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md`
  - `d87ed5f` - `chore(tickets): close 2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`
  - `499fb95` - `chore(tickets): close 2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`

## Objetivo e contexto
- Problema que esta spec resolve: o fluxo atual de `/plan_spec` e bom para refinamento rapido, mas pode convergir cedo demais em demandas complexas, deixando verdades nao ditas, assumptions implicitos e criterios de aceite incompletos que reduzem a qualidade do fluxo e geram retrabalho.
- Resultado esperado: operador consegue usar um novo comando dedicado, `/discover_spec`, para conduzir uma entrevista mais profunda e estruturada antes da materializacao da spec; ao final, a spec ainda nasce diretamente como `approved`, pronta para entrar na automacao.
- Contexto funcional: o novo fluxo deve coexistir com o `/plan_spec` atual, preservando um caminho leve para mudancas simples e oferecendo um caminho aprofundado para demandas mais ambiguas ou de maior risco.
- Restricoes tecnicas relevantes:
  - manter o fluxo sequencial do runner;
  - reutilizar ao maximo a infraestrutura atual de sessao, parser, materializacao, versionamento e rastreabilidade do fluxo `/plan_spec`;
  - nao transformar o `/plan_spec` existente em um fluxo pesado por padrao;
  - toda spec gerada por `/discover_spec` deve continuar nascendo com `Status: approved` e `Spec treatment: pending`.

## Jornada de uso
1. Operador autorizado envia `/discover_spec`.
2. Bot inicia uma sessao dedicada de descoberta profunda e pede o brief inicial na proxima mensagem.
3. Operador descreve a funcionalidade, mudanca ou problema em linguagem natural.
4. Runner abre uma sessao stateful do Codex no projeto ativo e conduz uma entrevista estruturada para eliminar ambiguidades relevantes antes da spec.
5. O fluxo faz perguntas por texto e, quando apropriado, por opcoes clicaveis, cobrindo objetivo, atores, escopo, nao-escopo, restricoes, validacoes, riscos, assumptions/defaults e trade-offs.
6. Enquanto existir ambiguidade critica sem tratamento explicito, o fluxo continua perguntando; quando uma indefinicao for aceitavel, ela deve ser convertida em assumption/default aprovado ou em nao-escopo declarado.
7. Ao final, o bot apresenta um bloco final estruturado com a proposta completa da spec e as acoes `Criar spec`, `Refinar`, `Cancelar`.
8. Operador escolhe `Criar spec`; runner materializa a spec em `docs/specs/` e executa o mesmo fluxo de versionamento/push dedicado ja usado no planejamento de spec.

## Requisitos funcionais
- RF-01: expor novo comando `/discover_spec` no Telegram para iniciar uma sessao de descoberta profunda antes da criacao da spec.
- RF-02: expor comandos `/discover_spec_status` e `/discover_spec_cancel`.
- RF-03: `/discover_spec` deve aceitar inicio sem argumento; nesse caso, a primeira mensagem livre subsequente deve ser tratada como brief inicial.
- RF-04: deve existir no maximo uma sessao ativa de descoberta profunda por instancia do runner.
- RF-05: `/discover_spec` e `/plan_spec` devem ser mutuamente exclusivos; nao pode existir sessao ativa dos dois fluxos ao mesmo tempo.
- RF-06: com sessao `/discover_spec` ativa, comandos de execucao (`/run_all`, `/run_specs`, `/run_ticket`) e troca de projeto devem ser bloqueados com mensagem explicita, preservando consistencia do contexto.
- RF-07: com sessao `/discover_spec` ativa, comandos de texto livre concorrentes (`/plan_spec` e `/codex_chat`) tambem devem ser bloqueados com mensagem explicita.
- RF-08: o fluxo deve operar sempre sobre o projeto ativo global no momento em que a sessao e iniciada.
- RF-09: a sessao de descoberta profunda deve reutilizar backend stateful com `codex exec`/`codex exec resume` e `--json`, mantendo contexto por `thread_id`.
- RF-10: o fluxo de entrevista deve cobrir explicitamente, antes da finalizacao, as seguintes categorias de entendimento:
  - objetivo e valor esperado;
  - atores e jornada;
  - escopo funcional;
  - nao-escopo;
  - restricoes tecnicas e dependencias;
  - validacoes e criterios de aceite;
  - riscos operacionais/funcionais;
  - assumptions/defaults;
  - decisoes e trade-offs relevantes.
- RF-11: cada categoria obrigatoria deve ser marcada como coberta por conteudo explicito ou como `nao aplicavel`, sem depender de inferencia silenciosa.
- RF-12: enquanto houver ambiguidade critica nao tratada, o fluxo nao deve concluir o planejamento com bloco final elegivel para `Criar spec`.
- RF-13: quando uma resposta do operador nao fechar uma ambiguidade critica, o fluxo deve fazer follow-up em vez de avancar prematuramente para a finalizacao.
- RF-14: quando uma ambiguidade critica for conscientemente aceita como default, o fluxo deve registra-la explicitamente como assumption/default ou nao-escopo antes da finalizacao.
- RF-15: o bloco final estruturado de `/discover_spec` deve incluir, alem dos campos ja usados em `/plan_spec`, secoes explicitas para:
  - assumptions/defaults aprovados;
  - decisoes/trade-offs aprovados.
- RF-16: ao final do planejamento, o bot deve oferecer botoes `Criar spec`, `Refinar`, `Cancelar`, com comportamento equivalente ao fluxo atual.
- RF-17: ao escolher `Criar spec`, o runner deve reutilizar o pipeline atual de materializacao/versionamento de spec fora do modo de planejamento, sem duplicar a arquitetura.
- RF-18: a spec criada pelo fluxo deve seguir nome `docs/specs/YYYY-MM-DD-<slug>.md`, derivado do titulo final aprovado.
- RF-19: a spec criada por `/discover_spec` deve iniciar com `Status: approved` e `Spec treatment: pending`.
- RF-20: a materializacao da spec deve preservar explicitamente no documento final:
  - assumptions/defaults aprovados;
  - decisoes e trade-offs relevantes;
  - validacoes obrigatorias e manuais pendentes;
  - riscos conhecidos.
- RF-21: a trilha de rastreabilidade do fluxo deve continuar sendo persistida em `spec_planning/`, com identificacao explicita de que a sessao foi originada por `/discover_spec`.
- RF-22: `/discover_spec_status` deve mostrar fase atual, projeto ativo, timestamps de atividade e quais categorias obrigatorias ja estao cobertas ou ainda pendentes.
- RF-23: `/discover_spec_cancel` deve encerrar a sessao e limpar o estado associado.
- RF-24: deve haver timeout de inatividade de 30 minutos para encerrar sessao presa.
- RF-25: em falha da sessao de descoberta profunda, o fluxo deve abortar com orientacao de retry, sem fallback automatico para outro backend.
- RF-26: quando a saida do Codex nao for parseavel com seguranca, o bot deve repassar conteudo bruto saneado ao Telegram, mantendo observabilidade equivalente ao `/plan_spec`.
- RF-27: o novo fluxo deve respeitar `TELEGRAM_ALLOWED_CHAT_ID` em comandos e callbacks associados.
- RF-28: o `/plan_spec` atual deve permanecer disponivel como caminho leve, sem forcar a entrevista profunda por padrao.

## Assumptions and defaults
- `/discover_spec` e o nome canonico inicial do novo comando.
- O fluxo profundo sera usado quando o operador quiser maximizar alinhamento e reduzir risco de retrabalho em demandas mais ambiguas.
- O pipeline de materializacao/versionamento atual de spec e suficientemente bom para ser reutilizado; a mudanca principal esta na fase de descoberta e na riqueza do bloco final estruturado.
- A entrevista profunda nao precisa provar ausencia absoluta de ambiguidade; ela precisa eliminar ou explicitar toda ambiguidade critica relevante para a qualidade da spec.

## Nao-escopo
- Remover, renomear ou degradar o `/plan_spec` atual.
- Fazer selecao automatica entre `/plan_spec` e `/discover_spec` com base em heuristica de complexidade.
- Criar tickets ou execplans automaticamente durante a entrevista profunda.
- Paralelizar sessoes de descoberta profunda por chat ou usuario.
- Garantir matematicamente que nenhuma ambiguidade residual exista; o objetivo e tornar ambiguidades criticas explicitas e tratadas.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/discover_spec` sem argumento abre sessao e solicita o brief inicial, sem iniciar rodada de tickets.
- [x] CA-02 - `/plan_spec` continua disponivel e nao executa a entrevista profunda por padrao.
- [x] CA-03 - durante sessao `/discover_spec` ativa, `/plan_spec`, `/codex_chat`, `/run_all`, `/run_specs`, `/run_ticket` e troca de projeto retornam bloqueio explicito e nao iniciam execucao.
- [x] CA-04 - a entrevista profunda cobre todas as categorias obrigatorias definidas na spec, registrando conteudo explicito ou `nao aplicavel`.
- [x] CA-05 - com brief inicial vago ou ambiguo, o fluxo faz perguntas de follow-up em vez de emitir bloco final prematuramente.
- [x] CA-06 - o bloco final de `/discover_spec` inclui titulo, resumo, objetivo, atores, jornada, RFs, CAs, nao-escopo, restricoes tecnicas, validacoes obrigatorias, validacoes manuais pendentes, riscos conhecidos, assumptions/defaults e decisoes/trade-offs.
- [x] CA-07 - quando ainda houver ambiguidade critica sem tratamento explicito, a acao `Criar spec` e rejeitada com mensagem orientando refinamento.
- [x] CA-08 - ao escolher `Refinar`, a conversa retorna ao ciclo de entrevista sem criar arquivos.
- [x] CA-09 - ao escolher `Cancelar`, nenhuma spec e criada e a sessao e encerrada.
- [x] CA-10 - ao escolher `Criar spec`, runner executa pipeline dedicado fora de `/plan` e cria `docs/specs/YYYY-MM-DD-<slug>.md`.
- [x] CA-11 - a spec criada contem metadata inicial `Status: approved` e `Spec treatment: pending`.
- [x] CA-12 - a spec criada materializa explicitamente `Assumptions and defaults` e `Decisoes e trade-offs` a partir da entrevista.
- [x] CA-13 - a trilha da sessao e persistida em `spec_planning/` com identificacao explicita do modo `/discover_spec`.
- [x] CA-14 - `/discover_spec_status` exibe fase atual, projeto ativo, timestamps relevantes e cobertura das categorias obrigatorias.
- [x] CA-15 - `/discover_spec_cancel` encerra a sessao e limpa estado associado.
- [x] CA-16 - apos 30 minutos sem atividade, sessao expira automaticamente com mensagem de timeout.
- [x] CA-17 - com `TELEGRAM_ALLOWED_CHAT_ID` configurado, chat nao autorizado nao consegue usar `/discover_spec`, `/discover_spec_status`, `/discover_spec_cancel` nem callbacks associados.
- [x] CA-18 - em falha da sessao, bot retorna erro acionavel e orienta retry sem iniciar fallback automatico.
- [x] CA-19 - em resposta do Codex nao parseavel, bot repassa conteudo bruto saneado no Telegram.
- [x] CA-20 - ao final da criacao da spec, o versionamento continua restrito a artefatos esperados da spec e da trilha da sessao, sem espalhar escopo de commit.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Exercitar o fluxo completo com Telegram, Codex CLI autenticado e git remoto real para revalidar materializacao, trilha `spec_planning/*` e push dedicado fora do ambiente de testes.
- Validacoes manuais pendentes:
  - Exercitar o fluxo completo em Telegram real com demanda simples e demanda complexa, comparando friccao do `/plan_spec` com profundidade do `/discover_spec`.
  - Confirmar que o resumo final e o status exibido em `/discover_spec_status` permanecem legiveis em conversas longas.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Itens atendidos:
  - A base atual de `/plan_spec` ja entrega sessao stateful via Telegram com `codex exec`/`codex exec resume --json`, preservacao de `thread_id`, timeout de 30 minutos, cancelamento, repasse de saida raw saneada e acoes finais reutilizaveis.
  - O runner ja possui guards de texto livre global entre `/plan_spec` e `/codex_chat`, snapshot do projeto ativo no start da sessao e bloqueio de troca de projeto enquanto `/plan_spec` esta ativo.
  - A pipeline de materializacao/versionamento de spec e a trilha `spec_planning/` ja existem, incluindo naming `docs/specs/YYYY-MM-DD-<slug>.md`, metadata inicial `Status: approved` + `Spec treatment: pending` e escopo restrito de versionamento.
  - O `/plan_spec` atual segue disponivel como caminho leve, o que ja atende o objetivo de nao forcar a entrevista profunda por padrao.
  - O working tree atual implementa o subconjunto de sessao/Telegram/bloqueios de `/discover_spec` para RF-01..RF-09 e RF-23..RF-27, com comandos `/discover_spec`, `/discover_spec_status` e `/discover_spec_cancel`, sessao global unica, snapshot do projeto ativo, timeout, cancelamento, retry hint dedicado, raw output saneado e bloqueios explicitos para `/plan_spec`, `/codex_chat`, execucoes e troca de projeto.
  - O working tree atual implementa o subconjunto de entrevista profunda de `/discover_spec` para RF-10..RF-16 e RF-22, com primer estruturado, parsing compartilhado de pergunta/bloco final enriquecidos, cobertura tipada das 9 categorias obrigatorias, assumptions/defaults, decisoes/trade-offs, ambiguidades criticas, follow-up automatico, gate de elegibilidade, `Refinar` discover-specific e `/discover_spec_status` com cobertura/pedencias/gate observaveis.
  - O working tree atual implementa o subconjunto de materializacao/rastreabilidade enriquecidas para RF-17..RF-21 e CA-10..CA-13, CA-20, liberando `Criar spec` em `/discover_spec` sobre a pipeline compartilhada, estendendo `SpecRef`, `spec_planning/requests|responses|decisions` e o prompt de materializacao com `sourceCommand`, assumptions/defaults e decisoes/trade-offs sem quebrar `/plan_spec`.
  - A acao final `Cancelar` de `/discover_spec` foi revalidada nesta auditoria: o runner encerra a sessao sem materializar spec em `src/core/runner.ts`, enquanto a renderizacao compartilhada do bloco final continua expondo `Criar spec`, `Refinar` e `Cancelar` em `src/integrations/telegram-bot.ts`.
  - A cobertura automatizada observavel desse subconjunto foi consolidada em `src/integrations/plan-spec-parser.test.ts`, `src/integrations/codex-client.test.ts`, `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`, executadas com sucesso durante o ExecPlan `execplans/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md`.
  - A cobertura automatizada observavel do subconjunto RF-17..RF-21 / CA-10..CA-13 / CA-20 foi consolidada em `src/integrations/spec-planning-trace-store.test.ts`, `src/integrations/codex-client.test.ts` e `src/core/runner.test.ts`, executadas com sucesso durante o ExecPlan `execplans/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`.
  - O ticket `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md` foi revalidado como `GO` e fechado em 2026-03-18 20:40Z, consolidando o subconjunto RF-10..RF-16 e RF-22 sem follow-up local.
  - O ticket `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md` foi revalidado como `GO` e fechado em 2026-03-18 21:10Z, consolidando o subconjunto RF-17..RF-21 / CA-10..CA-13 / CA-20; permaneceu apenas validacao manual operacional do fluxo real.
  - A cobertura automatizada observavel deste subconjunto foi consolidada em `src/core/runner.test.ts`, `src/integrations/codex-client.test.ts` e `src/integrations/telegram-bot.test.ts`, executadas com sucesso durante o ExecPlan `execplans/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md`.
  - O ticket `tickets/closed/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md` foi validado como `GO` e fechado em 2026-03-18 19:47Z, consolidando este subconjunto da spec sem follow-up local.
  - A revalidacao final da linhagem executada em 2026-03-18 21:17Z passou verde em `src/core/runner.test.ts`, `src/integrations/telegram-bot.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/plan-spec-parser.test.ts` e `src/integrations/spec-planning-trace-store.test.ts`, alem de `npm run check` e `npm run build`.
- Pendencias em aberto:
  - Nenhuma pendencia tecnica ou ticket derivado aberto.
  - Permanecem apenas validacoes manuais externas registradas em `Validacoes pendentes ou manuais`, sem bloquear `Status: attended` nem `Spec treatment: done`.
- Evidencias de validacao:
  - Revisao estatica consolidada em `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/types/state.ts`, `src/integrations/codex-client.ts`, `src/integrations/plan-spec-parser.ts`, `src/integrations/spec-planning-trace-store.ts`, `prompts/06-materializar-spec-planejada.md` e `prompts/07-versionar-spec-planejada-commit-push.md`.
  - Validacoes automatizadas executadas em 2026-03-18 19:47Z:
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts`
  - Validacoes automatizadas executadas em 2026-03-18 20:33Z:
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/plan-spec-parser.test.ts src/integrations/codex-client.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts`
  - Validacoes automatizadas executadas em 2026-03-18 20:40Z:
    - `rg -n "CA-04|CA-05|CA-06|CA-07|CA-08|CA-14|RF-10|RF-11|RF-12|RF-13|RF-14|RF-15|RF-16|RF-22|discover-spec-entrevista-categorias-e-gate-final-gap" src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts`
  - Validacoes automatizadas executadas em 2026-03-18 21:05Z:
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts`
    - `rg -n "RF-17|RF-18|RF-19|RF-20|RF-21|CA-10|CA-11|CA-12|CA-13|CA-20|discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap" docs/specs/2026-03-18-discover-spec-entrevista-profunda-de-alinhamento.md src/core/runner.test.ts src/integrations/codex-client.test.ts src/integrations/spec-planning-trace-store.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-planning-trace-store.test.ts src/integrations/codex-client.test.ts src/core/runner.test.ts`
  - Revalidacao final executada em 2026-03-18 21:17Z:
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/codex-client.test.ts src/integrations/plan-spec-parser.test.ts src/integrations/spec-planning-trace-store.test.ts`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
    - Releitura estatica de `CA-09`/cancelamento final em `src/core/runner.ts` e `src/integrations/telegram-bot.ts`, confirmando callback `Cancelar` sem materializacao de spec.
  - Tickets de gap derivados e vinculados na propria spec: `tickets/closed/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md`, `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md` e `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md`.

## Auditoria final de entrega
- Auditoria executada em: 2026-03-18 21:17Z
- Resultado: estado final do repositorio, tickets fechados da linhagem, execplans executados e evidencias atuais do codigo/testes estao consistentes com RF-01..RF-28 e CA-01..CA-20. `Status` foi promovido para `attended` e `Spec treatment` para `done`. `CA-09` foi revalidado nesta auditoria pela leitura do path de callback `Cancelar` em `src/core/runner.ts` e da renderizacao compartilhada do bloco final em `src/integrations/telegram-bot.ts`.
- Tickets/follow-ups abertos a partir da auditoria:
  - Nenhum. A unica pendencia restante e validacao manual externa ja registrada, que nao configura gap local nem follow-up de workflow segundo `INTERNAL_TICKETS.md`.
- Tickets/follow-ups concluidos na linhagem auditada:
  - tickets/closed/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md
  - tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md
  - tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md
- Causas-raiz sistemicas identificadas:
  - Nenhuma causa-raiz sistemica residual. As causas-raiz anteriormente registradas na triagem foram absorvidas integralmente pelos tickets fechados desta linhagem.
- Ajustes genericos promovidos ao workflow:
  - Nenhum ajuste generico adicional nesta etapa; a auditoria final nao encontrou recorrencia sistemica nova.

## Riscos e impacto
- Risco funcional: a entrevista profunda virar um fluxo excessivamente longo e aumentar friccao sem ganho proporcional em demandas simples.
- Risco operacional: duplicar demais a arquitetura entre `/plan_spec` e `/discover_spec`, aumentando custo de manutencao.
- Risco de UX: o gate de "ambiguidade critica" ficar subjetivo demais e gerar sensacao de bloqueio arbitrario.
- Mitigacao:
  - manter `/plan_spec` como caminho leve e `/discover_spec` como caminho profundo;
  - reutilizar backend, rastreabilidade e versionamento do fluxo atual;
  - tornar explicitas as categorias obrigatorias e os criterios para permitir finalizacao.

## Decisoes e trade-offs
- 2026-03-18 - Criar um comando dedicado `/discover_spec` em vez de transformar `/plan_spec` no fluxo pesado por padrao - preserva baixa friccao para casos simples e adiciona profundidade apenas quando desejado.
- 2026-03-18 - Manter a spec criada por `/discover_spec` nascendo diretamente como `approved` - preserva automacao e evita etapa intermediaria de draft manual.
- 2026-03-18 - Reutilizar pipeline atual de materializacao/versionamento e trilha `spec_planning/` - reduz duplicacao arquitetural e concentra a mudanca na fase de entendimento.
- 2026-03-18 - Tratar ambiguidades criticas por cobertura explicita, assumptions/defaults ou nao-escopo, em vez de exigir certeza absoluta - mantem o fluxo pragmatico sem mascarar lacunas relevantes.

## Historico de atualizacao
- 2026-03-18 18:49Z - Versao inicial da spec criada com escopo fechado para introduzir `/discover_spec` como entrevista profunda antes da criacao automatizada de spec.
- 2026-03-18 18:59Z - Revisao de gaps concluida; abertos 3 tickets para sessao/Telegram, protocolo de entrevista/gate final e materializacao/rastreabilidade enriquecidas.
- 2026-03-18 19:06Z - Validacao final da triagem concluida; mantidos `Status: approved` e `Spec treatment: pending` com 3 gaps rastreados em `tickets/open/`.
- 2026-03-18 19:40Z - ExecPlan `execplans/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md` executado no working tree; RF-01..RF-09 e RF-23..RF-27 passaram a contar com implementacao e testes automatizados, enquanto os tickets irmaos mantiveram o restante da spec em aberto.
- 2026-03-18 19:47Z - Ticket `tickets/closed/2026-03-18-discover-spec-sessao-telegram-e-bloqueios-gap.md` fechado como `fixed` apos revalidacao `GO`; permaneceram abertos apenas os gaps de entrevista profunda e materializacao/rastreabilidade enriquecidas.
- 2026-03-18 20:33Z - ExecPlan `execplans/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md` executado no working tree; RF-10..RF-16 e RF-22 passaram a contar com protocolo estruturado, estado/gate tipados, follow-up automatico, callbacks de finalizacao e status enriquecido, enquanto `Criar spec` segue bloqueado ate o ticket irmao de materializacao/rastreabilidade enriquecidas.
- 2026-03-18 20:40Z - Ticket `tickets/closed/2026-03-18-discover-spec-entrevista-categorias-e-gate-final-gap.md` fechado como `fixed` apos revalidacao `GO`; permaneceu aberto apenas o gap de materializacao/rastreabilidade enriquecidas.
- 2026-03-18 21:05Z - ExecPlan `execplans/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md` executado no working tree; `/discover_spec` passou a reutilizar a pipeline compartilhada de `create-spec` com origem explicita e materializacao/trilha enriquecidas, enquanto o ticket correspondente permaneceu aberto apenas porque esta etapa nao fecha ticket nem faz commit/push.
- 2026-03-18 21:10Z - Ticket `tickets/closed/2026-03-18-discover-spec-materializacao-e-rastreabilidade-enriquecidas-gap.md` fechado como `fixed` apos revalidacao `GO`; restou apenas validacao manual operacional do fluxo real.
- 2026-03-18 21:17Z - Auditoria final apos a rodada encadeada revalidou a linhagem inteira sem gaps tecnicos residuais, marcou `CA-09` como atendido, promoveu a spec para `Status: attended` e `Spec treatment: done`, e manteve apenas validacoes manuais externas como pendencias nao bloqueantes.
