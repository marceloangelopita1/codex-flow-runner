# [SPEC] Gate de validacao dos tickets derivados com GO/NO_GO e melhoria continua do workflow

## Metadata
- Spec ID: 2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-03-19 15:31Z
- Last reviewed at (UTC): 2026-03-19 18:10Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md
  - tickets/closed/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md
  - tickets/closed/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md
  - tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md
- Related execplans:
  - execplans/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md
  - execplans/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md
  - execplans/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md
  - execplans/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md
- Related commits:
  - `ff1b8da` - `chore(tickets): close 2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md`
  - `5e33ed5` - `chore(tickets): close 2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
  - `273e32a` - `chore(tickets): close 2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`
  - `0225a0e` - `chore(tickets): close 2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`

## Objetivo e contexto
- Problema que esta spec resolve: o fluxo atual de `/run_specs` ja possui triagem inicial da spec e auditoria final apos a rodada de tickets, mas ainda nao possui um gate formal entre "tickets gerados" e "iniciar implementacao". Isso permite mismatchs relevantes entre a spec e o pacote derivado de tickets, como cobertura incompleta, granularidade ruim, contextualizacao fraca, closure criteria vagos, heranca incompleta de assumptions/defaults e nao conformidade documental. Alem disso, a documentacao atual ainda permite em alguns pontos a derivacao direta `spec -> execplan`, o que conflita com o contrato desejado do workflow.
- Resultado esperado: o runner passa a executar um novo estagio explicito `spec-ticket-validation` entre `spec-triage` e `spec-close-and-version`, validando e, quando possivel, corrigindo automaticamente o pacote derivado de tickets antes de qualquer `/run-all`, emitindo veredito formal `GO/NO_GO` com rastreabilidade objetiva. Em paralelo, o repositorio passa a explicitar como principio transversal que deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.
- Contexto funcional: a spec continua sendo a source of truth do fluxo derivado; a triagem da spec passa a derivar apenas tickets; execplans passam a nascer somente dentro do fluxo do ticket quando o trabalho exigir esse nivel de detalhamento.
- Restricoes tecnicas relevantes:
  - manter o fluxo sequencial do runner;
  - introduzir `spec-ticket-validation` como estagio nomeado, observavel e separado de `spec-triage`;
  - o primeiro exec da validacao nao deve reutilizar implicitamente o contexto conversacional da triagem;
  - revalidacoes dentro do proprio estagio `spec-ticket-validation` podem reutilizar o mesmo contexto/conversation id da validacao;
  - o loop de autocorrecao deve ter limite fixo de 2 ciclos completos de `corrigir -> revalidar`;
  - falhas para abrir ticket transversal de melhoria de workflow em `codex-flow-runner` nao podem bloquear a continuidade da spec corrente.

## Jornada de uso
1. Operador envia `/run_specs <arquivo-da-spec.md>` para uma spec elegivel (`Status: approved`, `Spec treatment: pending`).
2. Runner executa `spec-triage` e deriva apenas tickets em `tickets/open/`, sem criar `execplans/` diretamente a partir da spec.
3. Runner inicia um novo exec dedicado para `spec-ticket-validation`, separado da triagem, e avalia o pacote derivado de tickets contra a spec.
4. O estagio classifica gaps por taxonomia fixa, registra evidencias objetivas e decide se o pacote esta `GO` ou `NO_GO`.
5. Quando houver gaps corrigiveis e alta confianca de reparo, o estagio aplica correcao automatica nos tickets/documentacao derivada e revalida, preservando o contexto apenas dentro do proprio ciclo de validacao.
6. Se o pacote atingir confianca suficiente, o runner registra veredito `GO`, executa `spec-close-and-version`, encadeia `/run-all` e termina com `spec-audit`.
7. Se, apos no maximo 2 ciclos completos de autocorrecao, nao houver reducao real dos gaps ou a confianca permanecer insuficiente, o runner registra veredito `NO_GO`, bloqueia `/run-all` e encerra a rodada com rastreabilidade do motivo.
8. Quando a menor causa plausivel de um gap for sistemica e houver alta confianca de reaproveitamento, o fluxo abre automaticamente um ticket transversal de melhoria de workflow no repositorio `codex-flow-runner`, faz commit/push desse ticket e menciona o resultado no resumo do `/run_specs`.

## Requisitos funcionais
- RF-01: o runner deve introduzir um novo estagio explicito `spec-ticket-validation` entre `spec-triage` e `spec-close-and-version`.
- RF-02: `spec-ticket-validation` deve rodar em um exec novo, separado da fase `spec-triage`, sem carregar implicitamente o contexto conversacional da triagem.
- RF-03: revalidacoes dentro do proprio estagio `spec-ticket-validation` podem reutilizar o mesmo conversation id/contexto da validacao.
- RF-04: o contrato oficial de derivacao do repositorio deve passar a ser:
  - `spec -> tickets`
  - `ticket -> execplan` quando necessario
  - nunca `spec -> execplan` direto
- RF-05: a triagem da spec deve derivar apenas tickets em `tickets/open/`, mesmo quando o escopo da spec estiver claro.
- RF-06: toda documentacao canonica e template relevante do repositorio deve ser atualizada para refletir o contrato `spec -> tickets` e o principio transversal de qualidade por token da IA/Codex.
- RF-07: o principio transversal oficial do projeto deve ser documentado em `AGENTS.md` e em documentacoes de workflow relacionadas com a seguinte formulacao: `Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.`
- RF-08: `spec-ticket-validation` deve avaliar o pacote derivado de tickets usando criterios objetivos de "necessarios e suficientes", cobrindo no minimo:
  - cobertura de RFs/CAs;
  - justificativa de escopo;
  - granularidade adequada;
  - ausencia de duplicacao desnecessaria;
  - clareza de objetivo/contexto por ticket;
  - closure criteria observaveis;
  - heranca de assumptions/defaults, restricoes e decisoes relevantes;
  - conformidade documental com `INTERNAL_TICKETS.md`, `SPECS.md` e templates aplicaveis.
- RF-09: `spec-ticket-validation` deve classificar gaps pela taxonomia fixa:
  - `coverage-gap`
  - `scope-justification-gap`
  - `granularity-gap`
  - `duplication-gap`
  - `closure-criteria-gap`
  - `spec-inheritance-gap`
  - `documentation-compliance-gap`
- RF-10: o estagio deve emitir veredito formal `GO` ou `NO_GO` antes de qualquer `/run-all`.
- RF-11: o estagio deve registrar lista objetiva de gaps, evidencias, correcao aplicada (quando houver), causa-raiz provavel e confianca final do veredito.
- RF-12: quando o primeiro passe de validacao resultar em `NO_GO` com gaps corrigiveis, o runner deve tentar autocorrecao automatica do pacote derivado e revalidar.
- RF-13: o loop de autocorrecao deve permitir no maximo 2 ciclos completos de `corrigir -> revalidar`.
- RF-14: o runner deve bloquear a continuidade antes do `/run-all` quando:
  - nao houver reducao real dos gaps apos os ciclos permitidos; ou
  - a confianca para `GO` permanecer insuficiente apos os ciclos permitidos.
- RF-15: deve existir uma secao dedicada `Gate de validacao dos tickets derivados` na spec para registrar:
  - veredito `GO/NO_GO`;
  - gaps encontrados;
  - correcoes aplicadas;
  - causa-raiz provavel;
  - ciclos executados;
  - observacoes sobre melhoria sistemica do workflow.
- RF-16: o veredito `GO/NO_GO` e os detalhes do gate devem aparecer obrigatoriamente:
  - na spec;
  - no trace/log da rodada;
  - no resumo final do `/run_specs` enviado ao Telegram.
- RF-17: o resumo final do `/run_specs` deve incluir, alem do veredito:
  - gaps encontrados;
  - correcoes aplicadas;
  - resultado do gate;
  - indicacao de ticket transversal de melhoria de workflow, quando houver;
  - limitacao operacional nao bloqueante, quando nao for possivel abrir esse ticket.
- RF-18: quando houver alta confianca de que a menor causa plausivel de um gap e sistemica e reaproveitavel, `spec-ticket-validation` deve abrir automaticamente um ticket transversal de melhoria de workflow.
- RF-19: quando o projeto ativo for o proprio `codex-flow-runner`, o ticket transversal deve ser criado no repositorio atual.
- RF-20: quando o projeto ativo for outro repositorio, o fluxo deve procurar `../codex-flow-runner` para criar o ticket transversal ali.
- RF-21: se `../codex-flow-runner` nao existir ou nao estiver acessivel, o fluxo deve registrar essa limitacao explicitamente como nao bloqueante e seguir a rodada da spec corrente.
- RF-22: quando o ticket transversal de melhoria de workflow for criado com sucesso, o fluxo deve executar commit/push nesse repositorio e registrar o resultado no trace/log e no resumo do `/run_specs`.
- RF-23: a falha em materializar, commitar ou publicar o ticket transversal de melhoria de workflow nao deve impedir a continuidade da spec corrente quando o veredito da validacao dos tickets derivados for `GO`.
- RF-24: `spec-close-and-version` so pode ser executado apos veredito `GO` em `spec-ticket-validation`.
- RF-25: `/run-all` so pode ser iniciado apos sucesso de `spec-close-and-version` e apenas quando `spec-ticket-validation` tiver concluido com `GO`.
- RF-26: `spec-audit` continua sendo o gate final apos a rodada encadeada de tickets, com semantica separada do novo gate `GO/NO_GO` anterior ao `/run-all`.
- RF-27: o estagio `spec-ticket-validation` deve ser tratado como estagio de timing, estado e observabilidade do runner, com reflexo em logs, status e resumos finais.
- RF-28: a documentacao do fluxo deve deixar explicito que material historico so precisa ser migrado quando for tocado posteriormente ou quando houver impacto funcional real.

## Assumptions and defaults
- O nome canonico do novo estagio e `spec-ticket-validation`.
- O nome canonico da nova secao documental na spec e `Gate de validacao dos tickets derivados`.
- O veredito `GO/NO_GO` deve ser decidido sobre o pacote derivado de tickets como um todo, e nao ticket por ticket isoladamente.
- A melhor estrategia padrao para esse gate e tentar autocorrecao automatica antes de bloquear o fluxo.
- O ticket transversal de melhoria de workflow deve ser aberto automaticamente apenas quando a menor causa plausivel for sistemica e houver alta confianca de reaproveitamento para specs futuras.
- A impossibilidade operacional de abrir esse ticket transversal e importante para observabilidade, mas nao deve se tornar blocker de entrega da spec corrente por si so.
- O repositorio `codex-flow-runner` e esperado em `../codex-flow-runner` quando o projeto ativo for outro, salvo quando o proprio projeto ativo ja for esse repositorio.

## Nao-escopo
- Permitir novamente derivacao direta `spec -> execplan`.
- Paralelizar triagem, validacao ou execucao de tickets derivados da spec.
- Tornar o limite de autocorrecao configuravel nesta primeira versao.
- Bloquear o fluxo da spec corrente apenas porque o ticket transversal de melhoria de workflow nao pode ser aberto.
- Migrar retroativamente todo o historico de specs/tickets/execplans antigos sem necessidade funcional.
- Criar heuristica generica para abrir ticket sistemico com baixa confianca de causa-raiz.
- Alterar a semantica do `spec-audit` final para absorver o novo gate `GO/NO_GO`.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - `/run_specs <arquivo>` para spec elegivel executa a sequencia `spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run-all -> spec-audit` quando o pacote derivado atingir `GO`.
- [x] CA-02 - `spec-triage` nao cria `execplans/` diretamente a partir da spec; a derivacao inicial cria apenas tickets em `tickets/open/`.
- [x] CA-03 - `AGENTS.md`, `SPECS.md`, templates e docs de workflow deixam explicito o contrato `spec -> tickets` e removem a permissao canonica de `spec -> execplan` direto.
- [x] CA-04 - O primeiro exec de `spec-ticket-validation` e iniciado sem reutilizar implicitamente o conversation id/contexto de `spec-triage`.
- [x] CA-05 - Revalidacoes dentro de `spec-ticket-validation` podem reutilizar o mesmo contexto/conversation id da validacao para preservar historico local da etapa.
- [x] CA-06 - O gate classifica gaps apenas dentro da taxonomia fixa aprovada nesta spec e registra evidencias objetivas por gap.
- [x] CA-07 - Quando a primeira validacao identificar gaps corrigiveis, o runner executa autocorrecao e revalidacao automaticamente.
- [x] CA-08 - O loop de autocorrecao executa no maximo 2 ciclos completos de `corrigir -> revalidar`.
- [x] CA-09 - O runner bloqueia a continuidade antes do `/run-all` quando, apos os ciclos permitidos, nao houver reducao real dos gaps ou a confianca para `GO` permanecer insuficiente.
- [x] CA-10 - O veredito `GO/NO_GO`, os gaps e as correcoes aplicadas ficam registrados na secao `Gate de validacao dos tickets derivados` da spec.
- [x] CA-11 - O trace/log da rodada inclui o estagio `spec-ticket-validation`, o veredito final e os ciclos de validacao/autocorrecao executados.
- [x] CA-12 - O resumo final do `/run_specs` enviado ao Telegram inclui veredito `GO/NO_GO`, gaps encontrados, correcoes aplicadas e resultado final da etapa.
- [x] CA-13 - Quando houver alta confianca de causa sistemica e o projeto ativo for `codex-flow-runner`, o fluxo abre automaticamente ticket transversal nesse mesmo repositorio e executa commit/push.
- [x] CA-14 - Quando houver alta confianca de causa sistemica e o projeto ativo for outro repositorio, o fluxo tenta abrir o ticket transversal em `../codex-flow-runner`, executa commit/push quando bem-sucedido e registra o resultado.
- [x] CA-15 - Se `../codex-flow-runner` nao existir ou nao estiver acessivel, o fluxo registra limitacao operacional nao bloqueante no resumo e no trace/log, sem impedir continuidade da spec corrente.
- [x] CA-16 - `spec-close-and-version` nao e executado quando o veredito de `spec-ticket-validation` for `NO_GO`.
- [x] CA-17 - `/run-all` nao e iniciado quando o veredito de `spec-ticket-validation` for `NO_GO`, mesmo que `spec-triage` tenha criado tickets.
- [x] CA-18 - A documentacao do projeto passa a explicitar o principio transversal: `Este projeto deve maximizar a qualidade de cada token produzido pela IA/Codex, com foco explicito em reduzir retrabalho e promover a melhoria continua do workflow.`
- [x] CA-19 - `spec-audit` continua ocorrendo apenas apos `/run-all` encadeado bem-sucedido, preservando semantica distinta do novo gate anterior ao `/run-all`.
- [x] CA-20 - Material historico nao e migrado em massa por obrigacao documental; a propria documentacao deixa claro que a correcao retroativa fica limitada a artefatos tocados depois ou com impacto funcional real.

## Gate de validacao dos tickets derivados
- Objetivo do gate:
  - validar se o pacote derivado de tickets e necessario e suficiente para atender a spec sem depender de trabalho implicito fora dos tickets.
- Criterios objetivos de `necessarios e suficientes`:
  - todo RF e CA relevante da spec esta coberto por pelo menos um ticket;
  - nenhum ticket existe sem vinculo claro e justificavel com a spec;
  - nao ha duplicacao desnecessaria de escopo entre tickets;
  - a granularidade do pacote esta adequada ao fluxo sequencial, sem fragmentacao excessiva nem tickets grandes demais para execucao/validacao segura;
  - cada ticket possui objetivo, contexto e justificativa claros;
  - cada ticket possui criterios de fechamento observaveis, verificaveis e coerentes com a spec;
  - assumptions/defaults, restricoes e decisoes importantes da spec foram herdadas ou explicitadas quando necessario;
  - o pacote total de tickets e suficiente para atender a spec sem depender de trabalho implicito fora do backlog derivado.
- Estrutura minima do veredito:
  - veredito final: `GO` ou `NO_GO`;
  - confianca final do veredito;
  - gaps por taxonomia;
  - evidencias objetivas por gap;
  - correcoes aplicadas automaticamente;
  - causa-raiz provavel por gap;
  - indicacao de potencial melhoria sistemica do workflow.
- Politica de autocorrecao:
  - default = autocorrecao + revalidacao;
  - no maximo 2 ciclos completos de `corrigir -> revalidar`;
  - bloquear antes do `/run-all` apenas quando o pacote permanecer inconsistente ou sem confianca suficiente para `GO`.
- Politica de melhoria sistemica:
  - abrir ticket transversal somente quando a menor causa plausivel for sistemica, reaproveitavel e com beneficio claro para specs futuras;
  - se o ticket transversal nao puder ser criado/publicado, registrar limitacao nao bloqueante e seguir a spec corrente quando o pacote derivado estiver em `GO`.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Nenhuma bloqueante para o atendimento final da spec; os cenarios `repo atual`, `repo irmao acessivel`, `repo irmao ausente` e o encadeamento ate `spec-audit` agora estao cobertos em testes automatizados.
- Validacoes manuais pendentes:
  - Executar ao menos uma rodada real de `/run_specs` em projeto externo com `../codex-flow-runner` acessivel e confirmar resumo do Telegram para abertura bem-sucedida do ticket transversal; esta revalidacao permanece recomendada como auditoria operacional externa e nao configura gap residual da spec.
  - Executar ao menos uma rodada real de `/run_specs` em projeto externo sem `../codex-flow-runner` acessivel e confirmar resumo do Telegram para limitacao nao bloqueante; esta revalidacao permanece recomendada como auditoria operacional externa e nao configura gap residual da spec.
  - Validar manualmente se o resumo do `/run_specs` comunica `GO/NO_GO`, gaps, correcoes aplicadas, resultado do ticket transversal e a etapa `spec-audit` com clareza suficiente para operacao cotidiana; esta verificacao permanece recomendada e nao bloqueia `Status: attended`.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Resultado da auditoria final: a linhagem completa foi relida contra spec, tickets fechados, execplans executados, prompt de auditoria e estado atual do codigo; `CA-19` foi revalidado no runner/testes, nao houve gaps tecnicos residuais e a spec foi promovida para `Status: attended` com `Spec treatment: done`.
- Itens atendidos:
  - `src/core/runner.ts` ja possui a espinha dorsal `spec-triage -> spec-close-and-version -> /run-all -> spec-audit`, que pode ser estendida com o novo gate sem paralelizar tickets.
  - `src/integrations/ticket-queue.ts` ja consome a fila por prioridade `P0 -> P1 -> P2`, com fallback deterministico por nome no empate.
  - `docs/workflows/codex-quality-gates.md` ja oferece checklist compartilhado para triagem/auditoria e taxonomia de causa-raiz reutilizavel.
  - `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` ja possuem infraestrutura de trace e resumo final reutilizavel para um novo estagio de spec.
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` ja orienta a triagem da spec a criar tickets em `tickets/open/`.
  - `src/types/spec-ticket-validation.ts`, `src/integrations/spec-ticket-validation-parser.ts` e `prompts/09-validar-tickets-derivados-da-spec.md` agora materializam o contrato do gate com taxonomia fixa, confianca final, evidencias objetivas e correcoes aplicadas.
  - `src/integrations/codex-client.ts` agora expone sessao stateful dedicada para `spec-ticket-validation`, iniciando o primeiro passe sem reutilizar `thread_id` de `spec-triage` e reaproveitando apenas o contexto local da propria validacao.
  - `src/core/spec-ticket-validation.ts` agora implementa o loop de `autocorrecao -> revalidacao` com limite de 2 ciclos completos, reducao estrita de gaps e bloqueio por confianca insuficiente para `GO`.
  - `tickets/closed/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md` consolidou `CA-04` a `CA-09` com validacao `GO` em testes focados, `npm test`, `npm run check` e `npm run build`.
  - `src/core/runner.ts`, `src/types/flow-timing.ts` e `src/types/state.ts` agora encadeiam `spec-ticket-validation` entre `spec-triage` e `spec-close-and-version`, distinguem `NO_GO` de falha tecnica e propagam o snapshot observavel do gate para o resumo final do fluxo.
  - `src/integrations/workflow-trace-store.ts` e `src/integrations/telegram-bot.ts` agora reconhecem `spec-ticket-validation`, persistem/verbalizam veredito, gaps, correcoes aplicadas e ciclos executados, e os testes cobrem os caminhos `GO` e `NO_GO`.
  - `src/core/runner.test.ts`, `src/integrations/workflow-trace-store.test.ts` e `src/integrations/telegram-bot.test.ts` agora validam a escrita idempotente da secao `Gate de validacao dos tickets derivados`, o bloqueio de `spec-close-and-version`/`/run-all` em `NO_GO` e os snapshots finais expostos ao Telegram/traces.
  - `tickets/closed/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md` consolidou `CA-01`, `CA-10`, `CA-11`, `CA-12`, `CA-16` e `CA-17` com validacao `GO` em testes focados, `npm test`, `npm run check` e `npm run build`.
  - `tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md` consolidou `CA-02`, `CA-03`, `CA-18` e `CA-20` com validacao textual por `git diff` e `rg`, alinhando docs, templates e prompt ao contrato `spec -> tickets`.
  - `src/types/workflow-improvement-ticket.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`, `src/integrations/git-client.ts`, `src/core/runner.ts`, `src/integrations/telegram-bot.ts` e `src/main.ts` agora materializam/publicam o ticket transversal de workflow no repo atual ou em `../codex-flow-runner`, com commit/push por caminhos explicitos, dedupe conservador, limitacao operacional nao bloqueante e reflexo na spec, no trace e no resumo final.
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/integrations/git-client.test.ts`, `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts` agora cobrem `CA-13`, `CA-14` e `CA-15`, incluindo o caso em que o gap sistemico aparece apenas em snapshots anteriores a uma revalidacao `GO`.
  - `src/core/runner.ts` preserva `spec-audit` como etapa separada e posterior apenas ao caminho `GO` de `spec-ticket-validation` e ao `/run-all` bem-sucedido; `src/core/runner.test.ts` cobre o caminho de sucesso com `finalStage: spec-audit` e o caminho de falha especifica em `spec-audit`, fechando `CA-19` sem fundir a semantica do novo gate com a auditoria final.
- Pendencias em aberto:
  - Nenhuma pendencia tecnica residual nem ticket derivado aberto para esta spec.
  - Permanecem apenas validacoes manuais externas registradas em `Validacoes pendentes ou manuais`, sem bloquear `Status: attended` nem `Spec treatment: done`.
- Evidencias de validacao:
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/codex-client.ts`
  - `src/integrations/spec-ticket-validation-parser.ts`
  - `src/integrations/git-client.ts`
  - `src/integrations/ticket-queue.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/workflow-trace-store.test.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/types/flow-timing.ts`
  - `src/types/spec-ticket-validation.ts`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/types/state.ts`
  - `src/main.ts`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/05-encerrar-tratamento-spec-commit-push.md`
  - `prompts/08-auditar-spec-apos-run-all.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `AGENTS.md`
  - `SPECS.md`
  - `docs/workflows/discover-spec.md`
  - `docs/workflows/codex-quality-gates.md`
  - `docs/specs/templates/spec-template.md`
  - Revalidacao final executada em 2026-03-19 18:10Z:
    - releitura integral desta spec, dos tickets fechados relacionados e dos execplans relacionados com o checklist de `docs/workflows/codex-quality-gates.md`;
    - releitura de `src/core/runner.ts`, `src/core/runner.test.ts` e `prompts/08-auditar-spec-apos-run-all.md` para revalidar o encadeamento ate `spec-audit` e fechar `CA-19`;
    - `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`

## Auditoria final de entrega
- Auditoria executada em: 2026-03-19 18:10Z
- Resultado: a releitura integral da spec, dos tickets fechados relacionados, dos execplans relacionados, do prompt de auditoria e do estado atual do codigo/testes confirmou atendimento de RF-01..RF-28 e CA-01..CA-20. `CA-19` foi fechado nesta auditoria pela verificacao de `src/core/runner.ts` e `src/core/runner.test.ts`, que mantem `spec-audit` apenas apos `/run-all` encadeado bem-sucedido e preservam falha especifica dessa etapa quando aplicavel. Nao foram encontrados gaps tecnicos residuais; a spec foi promovida para `Status: attended` e `Spec treatment: done`.
- Tickets/follow-ups abertos a partir da auditoria:
  - Nenhum. As validacoes manuais externas remanescentes sao auditorias operacionais recomendadas e nao configuram gap residual local nem follow-up adicional.
- Tickets/follow-ups concluidos na linhagem auditada:
  - tickets/closed/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md
  - tickets/closed/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md
  - tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md
  - tickets/closed/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md
- Causas-raiz sistemicas identificadas:
  - Nenhuma causa-raiz sistemica residual. As causas-raiz registradas na triagem e na execucao foram absorvidas integralmente pelos tickets fechados desta linhagem.
- Ajustes genericos promovidos ao workflow:
  - Nenhum ajuste generico adicional nesta etapa; a auditoria final nao encontrou recorrencia sistemica nova alem do que ja foi materializado na propria linhagem.

## Riscos e impacto
- Risco funcional: o gate ficar subjetivo demais e bloquear specs boas por falta de criterio operacional claro.
- Risco operacional: o loop de autocorrecao aumentar custo e latencia sem melhorar materialmente a qualidade do pacote derivado.
- Risco de arquitetura: a abertura cross-repo de ticket transversal em `codex-flow-runner` introduzir acoplamento operacional adicional entre repositorios.
- Risco de UX: o resumo do `/run_specs` ficar verboso demais e reduzir legibilidade no Telegram.
- Mitigacao:
  - manter taxonomia fixa, criterios objetivos e veredito formal `GO/NO_GO`;
  - limitar o loop a 2 ciclos completos e exigir reducao real dos gaps;
  - tratar a falha de ticket transversal como limitacao nao bloqueante;
  - resumir o resultado final do gate com estrutura fixa e de alta sinalizacao.

## Decisoes e trade-offs
- 2026-03-19 - Criar `spec-ticket-validation` como estagio explicito em vez de embutir a validacao dentro de `spec-triage` - melhora observabilidade, rastreabilidade, timing e semantica do gate `GO/NO_GO`.
- 2026-03-19 - Fixar o contrato `spec -> tickets` e `ticket -> execplan quando necessario` - reduz ambiguidade do workflow e evita pular o backlog auditavel derivado da spec.
- 2026-03-19 - Permitir continuidade de contexto apenas dentro da propria validacao, e nao entre triagem e validacao - preserva separacao semantica entre as etapas sem perder historico local de correcao/revalidacao.
- 2026-03-19 - Adotar autocorrecao como default, com limite fixo de 2 ciclos completos - maximiza automacao sem permitir loop indefinido de baixa eficiencia.
- 2026-03-19 - Abrir ticket transversal de melhoria de workflow automaticamente quando houver alta confianca de causa sistemica - promove melhoria continua reaproveitavel para specs futuras.
- 2026-03-19 - Tornar nao bloqueante a impossibilidade de abrir/publicar o ticket transversal em `codex-flow-runner` - evita travar a entrega da spec corrente por uma limitacao operacional secundaria.
- 2026-03-19 - Registrar explicitamente na documentacao do projeto o principio de qualidade por token da IA/Codex - transforma a diretriz em criterio transversal de comportamento, validacao e evolucao do workflow.

## Historico de atualizacao
- 2026-03-19 15:31Z - Versao inicial da spec criada a partir de entrevista detalhada para introduzir o gate `spec-ticket-validation`, formalizar o veredito `GO/NO_GO`, corrigir o contrato de derivacao `spec -> tickets` e explicitar o principio transversal de qualidade por token da IA/Codex.
- 2026-03-19 15:41Z - Revisao de gaps contra o codigo atual concluida; tickets P0/P1 abertos para orquestracao/observabilidade do gate, criterios e autocorrecao, ticket transversal de workflow e alinhamento da documentacao canonica.
- 2026-03-19 15:50Z - Validacao final da triagem concluida; consistencia documental confirmada com quatro tickets abertos e manutencao do estado `approved/pending` ate a entrega das pendencias derivadas.
- 2026-03-19 16:17Z - Contrato base de `spec-ticket-validation` implementado e validado localmente (tipos, parser, prompt, sessao stateful e loop de autocorrecao/revalidacao), mantendo `approved/pending` ate a integracao completa no runner e o fechamento formal dos tickets relacionados.
- 2026-03-19 16:23Z - Ticket `tickets/closed/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md` fechado como `fixed` apos validacao `GO` com testes focados, `npm test`, `npm run check` e `npm run build`.
- 2026-03-19 17:02Z - Orquestracao e observabilidade do stage `spec-ticket-validation` integradas ao `/run_specs`, com bloqueio `NO_GO`, secao de gate persistida na spec, traces/Telegram expandidos e validacao automatizada verde (`npx tsx --test src/core/spec-ticket-validation.test.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check`, `npm run build`).
- 2026-03-19 17:06Z - Ticket `tickets/closed/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md` fechado como `fixed` apos releitura do diff, do ExecPlan e da spec de origem, com validacao `GO` pelos testes focados do gate/orquestracao/Telegram (`227/227`), `npm test` (`356/356`), `npm run check` e `npm run build`.
- 2026-03-19 17:22Z - Ticket `tickets/closed/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md` fechado como `fixed` apos alinhar docs, template e prompt ao contrato `spec -> tickets`, a politica de migracao historica limitada e o principio de qualidade por token.
- 2026-03-19 18:01Z - Ticket transversal de workflow implementado com publicador tipado, commit/push por caminhos explicitos, observabilidade no trace/spec/Telegram e cobertura automatizada verde para `CA-13`, `CA-14` e `CA-15` (`npx tsx --test src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/git-client.test.ts src/core/runner.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check`, `npm run build`).
- 2026-03-19 18:05Z - Ticket `tickets/closed/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md` fechado como `fixed` apos releitura do diff, do ExecPlan e da spec de origem, mantendo apenas auditorias operacionais externas como recomendacao.
- 2026-03-19 18:10Z - Auditoria final apos a rodada encadeada revalidou a linhagem inteira sem gaps tecnicos residuais, marcou `CA-19` como atendido, promoveu a spec para `Status: attended` e `Spec treatment: done`, e manteve apenas validacoes manuais externas como recomendacoes operacionais nao bloqueantes.
