# ExecPlan - Handoffs do workflow perdem membros explicitos de allowlists da spec

## Purpose / Big Picture
- Objetivo: endurecer o handoff `spec -> ticket -> execplan -> execucao -> fechamento` para que allowlists, enumeracoes finitas e matrizes pequenas de valores aceitos nao possam ser reduzidas a um criterio generico sem preservacao explicita ou justificativa objetiva.
- Resultado esperado:
  - `docs/workflows/codex-quality-gates.md` passa a explicar explicitamente que validacoes genericas como "valor valido" ou "loopback" nao substituem a prova dos membros aceitos quando a spec enumera um conjunto finito;
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md` e `prompts/04-encerrar-ticket-commit-push.md` passam a exigir preservacao explicita dos membros enumerados, ou justificativa objetiva para consolidacao com cobertura positiva dos aceitos e negativa fora do conjunto;
  - a cobertura automatizada do `codex-flow-runner` prova que os prompts reais das etapas de triagem, plano, execucao e fechamento carregam esse guardrail sem regressao do contexto cross-repo nem do contrato atual de prompt;
  - o workflow continua sequencial e ticket-first, sem forcar um ticket por membro da whitelist e sem introduzir acoplamento desnecessario em `runner.ts`.
- Escopo:
  - reforco documental no checklist compartilhado do workflow;
  - reforco operacional nos prompts `01` a `04`;
  - cobertura automatizada focada no contrato de prompt em `src/integrations/codex-client.test.ts`;
  - validacao textual e tipada do pacote alterado.
- Fora de escopo:
  - alterar o projeto funcional `../guiadomus-caixa-trigger-crawler`;
  - corrigir o ticket funcional aberto de IPv6 bracketed ou qualquer runtime do repo alvo;
  - mudar a taxonomia de retrospectiva, parser ou orquestracao do `workflow-gap-analysis`;
  - exigir decomposicao de um RF em um ticket por valor aceito quando bastar manter os membros explicitos na rastreabilidade e na validacao;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push.

## Progress
- [x] 2026-03-30 23:58Z - Planejamento inicial concluido com leitura integral do ticket, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `DOCUMENTATION.md`, de `INTERNAL_TICKETS.md`, de `SPECS.md`, da spec de origem, do ticket funcional fechado/aberto da linhagem, dos prompts `01` a `04`/`08`/`11`/`12`, de `src/integrations/codex-client.ts`, de `src/integrations/codex-client.test.ts` e do trace/decision da retrospectiva sistemica.
- [x] 2026-03-31 01:20Z - Checklist compartilhado e prompts `01` a `04` atualizados com o guardrail para allowlists/enumerações finitas, preservando a opcao de consolidacao somente com justificativa objetiva e cobertura observavel correspondente.
- [x] 2026-03-31 01:24Z - Cobertura automatizada do contrato de prompt atualizada em `src/integrations/codex-client.test.ts`, incluindo leitura dos prompts reais de `spec-triage`, `plan`, `implement` e `close-and-version`.
- [x] 2026-03-31 01:31Z - Validacao final concluida com auditoria textual por `rg`, `npm test -- src/integrations/codex-client.test.ts`, `npm run check` e revisao de diff restrita ao escopo.

## Surprises & Discoveries
- 2026-03-30 23:58Z - O gap causal nao nasceu de ausencia de RF na spec: `RF-27` da spec do projeto alvo enumera explicitamente `127.0.0.1`, `localhost` e `[::1]`, mas o ticket fechado e o ExecPlan funcional correspondente reduziram a prova exigida a "loopback".
- 2026-03-30 23:58Z - O checklist compartilhado ja exige matriz `requisito -> validacao observavel`, porem ainda nao explicita o caso especial de allowlists/enumerações finitas; essa omissao permitiu que um closure criterion agregado passasse pelas etapas seguintes sem reintroduzir os membros perdidos.
- 2026-03-30 23:58Z - Os prompts `02`, `03` e `04` estao corretamente ancorados em ticket/ExecPlan, mas exatamente por isso propagam a perda semantica quando o ticket de entrada ja veio consolidado demais.
- 2026-03-30 23:58Z - A superficie de teste mais barata e aderente para este ticket ja existe em `src/integrations/codex-client.test.ts`: ela consegue provar o contrato dos prompts reais sem abrir escopo em parser, runner ou publisher.
- 2026-03-30 23:58Z - `DOCUMENTATION.md` continua relevante aqui: a explicacao longa deve viver no checklist compartilhado, enquanto os prompts devem reforcar a regra sem duplicar prosa excessiva.
- 2026-03-31 01:24Z - Os testes existentes com templates stubados continuaram uteis para placeholder/path resolution, mas so a leitura dos arquivos reais em `prompts/` provou que o wording versionado do workflow ficou protegido contra regressao editorial.
- 2026-03-31 01:31Z - O comando `npm test -- src/integrations/codex-client.test.ts` executa toda a suite via `tsx --test src/**/*.test.ts src/integrations/codex-client.test.ts`; isso ampliou o sinal de regressao local sem exigir uma segunda rodada dedicada.

## Decision Log
- 2026-03-30 - Decisao: tratar `docs/workflows/codex-quality-gates.md` e os prompts `01` a `04` como pacote minimo da remediacao.
  - Motivo: o ticket pede endurecimento do handoff editorial/operacional entre triagem, plano, execucao e fechamento; o parser e o runner nao foram a menor causa plausivel observada neste caso.
  - Impacto: a implementacao fica concentrada em documentacao compartilhada, prompt templates e testes de contrato, sem refatorar orquestracao.
- 2026-03-30 - Decisao: preservar a opcao de consolidacao de um RF enumerado, desde que a consolidacao venha com justificativa objetiva e com matriz que prove os membros aceitos e a negativa fora do conjunto.
  - Motivo: a assumption/default herdada do ticket diz explicitamente que a remediacao nao deve forcar um ticket por RF; o problema e a perda semantica, nao a consolidacao em si.
  - Impacto: o wording precisa ser forte contra omissao, mas nao pode induzir over-splitting de tickets.
- 2026-03-30 - Decisao: provar o ticket por cobertura automatizada de prompts reais em `src/integrations/codex-client.test.ts`, em vez de inventar enforcement novo no runtime.
  - Motivo: o comportamento alvo do ticket e instrucional; a forma observavel e garantir que o Codex receba o contrato correto em cada etapa.
  - Impacto: os testes devem inspecionar os prompts reais das etapas `spec-triage`, `plan`, `implement` e `close-and-version`, preferencialmente sem acoplar a paragrafo inteiro.
- 2026-03-30 - Decisao: manter `prompts/08`, `prompts/11` e `prompts/12` fora do escopo inicial.
  - Motivo: eles participaram da descoberta causal, mas o closure criterion do ticket foca a cadeia que precisa impedir a perda antes da auditoria final da spec.
  - Impacto: se durante a execucao surgir contradicao objetiva nesses prompts, isso deve entrar como descoberta de escopo, nao como edicao preventiva gratuita.
- 2026-03-31 - Decisao: manter os testes stubados existentes e acrescentar um teste novo que carrega os prompts reais do repositorio.
  - Motivo: os testes antigos continuam cobrindo placeholders e resolucao cross-repo, enquanto o ticket atual exige prova de que o texto efetivamente versionado nas templates carrega o novo guardrail.
  - Impacto: o pacote de testes ficou mais robusto sem mexer em `codex-client.ts` nem enfraquecer a cobertura anterior.

## Outcomes & Retrospective
- Status final: execucao concluida com validacao verde; aguardando apenas a etapa separada de fechamento/versionamento do ticket.
- O que funcionou:
  - `docs/workflows/codex-quality-gates.md` virou a fonte canonica do caso de allowlists/enumerações finitas, sem inflar os prompts com racional duplicado;
  - os prompts `01` a `04` passaram a exigir preservacao explicita dos membros ou consolidacao objetivamente justificada com cobertura observavel;
  - `src/integrations/codex-client.test.ts` agora prova o guardrail sobre os prompts reais versionados, preservando ao mesmo tempo os testes stubados de placeholders.
- O que fica pendente fora deste plano:
  - a correcao funcional do ticket aberto `../guiadomus-caixa-trigger-crawler/tickets/open/2026-03-30-local-http-deve-aceitar-loopback-ipv6.md`;
  - qualquer expansao posterior para auditorias/retrospectivas, caso se conclua que o reforco pre-auditoria ainda nao basta;
  - nova rodada de spec audit no projeto alvo;
  - a etapa posterior de `close-and-version`, que continua fora do escopo desta execucao.
- Proximos passos:
  - usar a etapa de fechamento para decidir `GO`/`NO_GO`, mover o ticket e versionar o changeset quando isso for solicitado;
  - reaplicar a mesma matriz em tickets/specs futuras que trouxerem enums, whitelists ou matrizes pequenas de valores aceitos.

## Context and Orientation
- Ticket alvo:
  - `tickets/open/2026-03-30-workflow-improvement-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-c5f3980b.md`
- ExecPlan alvo:
  - `execplans/2026-03-30-workflow-improvement-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-c5f3980b.md`
- Spec de origem:
  - caminho qualificado por projeto: `guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md`
  - caminho canonico: `docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md`
- RFs/CAs cobertos por este plano:
  - RF-27 da spec de origem, no aspecto sistemico de preservar explicitamente os destinos aceitos `127.0.0.1`, `localhost` e `[::1]` ao longo do handoff do workflow;
  - nao ha CA adicional explicita da spec de origem citada no ticket; o aceite deste plano deriva dos closure criteria do ticket sistemico.
- Assumptions / defaults adotados:
  - tickets e ExecPlans continuam sendo a fonte operacional imediata das etapas de execucao e fechamento; por isso o guardrail precisa existir em ticket/ExecPlan prompts, nao apenas na triagem da spec;
  - a remediacao nao deve impor um ticket por valor aceito; consolidacao segue permitida quando vier acompanhada de justificativa objetiva e de matriz observavel que preserve os membros relevantes;
  - allowlists, enumeracoes finitas e matrizes pequenas sao tratadas da mesma forma para fins deste ticket: um conjunto explicito de valores aceitos nao pode ser resumido a um adjetivo generico sem lastro;
  - a prova automatizada mais aderente para este repositorio e o contrato dos prompts reais, nao um bloqueio semantico adicional em `runner.ts`;
  - o detalhe extenso da regra deve viver em `docs/workflows/codex-quality-gates.md`, com reforco conciso nos prompts `01` a `04`.
- RNFs e restricoes tecnicas/documentais herdados e em escopo:
  - manter fluxo sequencial e remediacao apenas neste repositorio do workflow;
  - preservar o contrato canonico `spec -> tickets` e `ticket -> execplan quando necessario`;
  - manter o pacote autocontido, executavel por outra IA e sem depender de memoria do caso `[::1]`;
  - nao duplicar explicacoes longas no prompt quando o checklist compartilhado puder carregar o detalhe canônico;
  - manter prompts, docs, tickets e ExecPlans em portugues correto e com acentuacao adequada.
- Artefatos causais consultados e relevantes para a execucao:
  - `../guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md`
  - `../guiadomus-caixa-trigger-crawler/tickets/closed/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md`
  - `../guiadomus-caixa-trigger-crawler/execplans/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md`
  - `../guiadomus-caixa-trigger-crawler/tickets/open/2026-03-30-local-http-deve-aceitar-loopback-ipv6.md`
  - `../guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/decisions/20260330t234317z-run-specs-spec-spec-workflow-retrospective-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-decision.json`
- Superficies do `codex-flow-runner` mais provaveis de mudanca:
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/02-criar-execplan-para-ticket.md`
  - `prompts/03-executar-execplan-atual.md`
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `src/integrations/codex-client.test.ts`
- Estado atual relevante:
  - o checklist compartilhado ainda nao diferencia explicitamente criterios agregados validos de perda semantica em allowlists finitas;
  - o prompt `01` pede heranca de RFs/CAs e closure criteria observaveis, mas nao obriga preservar cada membro de uma whitelist finita quando o RF e consolidado;
  - os prompts `02`, `03` e `04` enfatizam forte rastreabilidade ao ticket/ExecPlan, o que torna perigoso qualquer enfraquecimento anterior do closure criterion;
  - `src/integrations/codex-client.test.ts` ja cobre resolucao de template, caminhos cross-repo e partes do contrato de prompt, servindo como base natural para a prova automatizada deste ticket.

## Plan of Work
- Milestone 1: Explicitar no checklist compartilhado a regra de preservacao de allowlists finitas.
  - Entregavel: `docs/workflows/codex-quality-gates.md` passa a nomear explicitamente allowlists, enumeracoes finitas e matrizes pequenas como casos em que ticket, ExecPlan, execucao e fechamento devem preservar membros ou justificar consolidacao com prova observavel.
  - Evidencia de conclusao: leitura por `rg` mostra wording explicito no checklist compartilhado, incluindo a proibicao de aceitar "valor valido" ou equivalente como substituto isolado da prova dos membros aceitos.
  - Arquivos esperados: `docs/workflows/codex-quality-gates.md`.
- Milestone 2: Propagar o guardrail para as etapas `spec-triage`, `plan`, `implement` e `close-and-version`.
  - Entregavel: os prompts `01` a `04` passam a exigir heranca explicita dos membros enumerados, ou justificativa objetiva para consolidacao, com orientacao de cobertura positiva dos aceitos e negativa fora do conjunto.
  - Evidencia de conclusao: os prompts reais mostram o guardrail nas quatro etapas sem contradizer o contrato ticket-first nem inflar o prompt com texto redundante.
  - Arquivos esperados: `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md`, `prompts/04-encerrar-ticket-commit-push.md`.
- Milestone 3: Travar a regressao com testes de contrato do prompt.
  - Entregavel: `src/integrations/codex-client.test.ts` cobre os prompts reais das quatro etapas relevantes e prova que o guardrail sobre allowlists finitas esta presente no texto entregue ao Codex.
  - Evidencia de conclusao: a suite direcionada passa com asserts semanticos sobre o novo guardrail e preserva os testes existentes de resolucao cross-repo do checklist compartilhado.
  - Arquivos esperados: `src/integrations/codex-client.test.ts`.
- Milestone 4: Validar o pacote com escopo minimo e sem deriva para runtime/orquestracao.
  - Entregavel: testes verdes, `npm run check` verde e diff restrito a docs/prompts/testes planejados.
  - Evidencia de conclusao: a matriz de validacao abaixo fecha todos os closure criteria do ticket sem tocar `src/core/runner.ts`, parser de retrospectiva ou codigo do projeto alvo.
  - Arquivos esperados: diff final restrito aos arquivos do plano.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `tickets/open/2026-03-30-workflow-improvement-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-c5f3980b.md`, `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`, `prompts/02-criar-execplan-para-ticket.md`, `prompts/03-executar-execplan-atual.md`, `prompts/04-encerrar-ticket-commit-push.md` e os artefatos causais do projeto alvo para manter o wording ancorado no problema real antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar `apply_patch` em `docs/workflows/codex-quality-gates.md` para:
   - explicitar que allowlists, enumeracoes finitas e matrizes pequenas de valores aceitos nao podem ser colapsadas em criterios genericos sem preservar os membros ou justificar a consolidacao;
   - exigir, quando houver consolidacao, prova positiva dos membros aceitos e negativa para fora do conjunto;
   - refletir essa regra nas secoes de triagem, ExecPlan, execucao e fechamento, sem transformar o checklist em closure criterion generico.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar `apply_patch` em `prompts/01-avaliar-spec-e-gerar-tickets.md` para reforcar que a derivacao inicial deve carregar para o ticket os membros explicitos de whitelists/enumerações finitas relevantes, ou justificar objetivamente qualquer consolidacao adotada no closure criterion.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar `apply_patch` em `prompts/02-criar-execplan-para-ticket.md` para exigir que o ExecPlan preserve os membros explicitos herdados do ticket/spec na matriz `requisito -> validacao observavel`, ou registre justificativa objetiva para consolidacao com evidencias positivas/negativas correspondentes.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar `apply_patch` em `prompts/03-executar-execplan-atual.md` para reforcar que a execucao deve implementar e validar contra os membros explicitos declarados na matriz, e que um criterio agregado nao substitui a prova individual quando o ticket/ExecPlan trouxer uma whitelist finita.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar `apply_patch` em `prompts/04-encerrar-ticket-commit-push.md` para deixar explicito que `GO` so e possivel quando cada membro aceito de uma whitelist finita tiver evidencia positiva correspondente, salvo consolidacao objetivamente justificada e validada conforme a matriz do ExecPlan.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Aplicar `apply_patch` em `src/integrations/codex-client.test.ts` para adicionar testes que leem os prompts reais das etapas `spec-triage`, `plan`, `implement` e `close-and-version` e verificam a presenca do novo guardrail semantico sobre allowlists/enumerações finitas.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "allowlists|enumerações finitas|membros explicitos|justificativa objetiva|valor valido|fora do conjunto" docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md` para auditar a propagacao textual do guardrail.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts` para validar o contrato de prompt das etapas afetadas.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para confirmar que o pacote segue tipado e consistente.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md src/integrations/codex-client.test.ts` para auditar que o changeset ficou restrito ao escopo do ticket.

## Validation and Acceptance
- Refs de origem relacionadas: RF-27.
- Aplicacao explicita do quality gate deste planejamento:
  - o ticket inteiro e as referencias obrigatorias foram lidos antes da escrita do plano;
  - a spec de origem, o RF coberto, assumptions/defaults, restricoes herdadas e a matriz `requisito -> validacao observavel` ficaram explicitos;
  - toda validacao abaixo nasce diretamente dos closure criteria do ticket sistemico, nao de checklist generico paralelo.

### Matriz requisito -> validacao observavel
| Requisito / closure criterion | Validacao observavel | Comando / evidencia |
| --- | --- | --- |
| Closure: os quality gates e prompts do workflow passam a exigir que allowlists/enumerações finitas da spec aparecam explicitamente no ticket ou na matriz de validacao, ou tragam justificativa objetiva para consolidacao | O checklist compartilhado e os prompts `01` a `04` citam explicitamente allowlists/enumerações finitas, preservacao de membros, justificativa objetiva para consolidacao e necessidade de cobertura positiva dos aceitos e negativa fora do conjunto | `rg -n "allowlists|enumerações finitas|membros explicitos|justificativa objetiva|fora do conjunto" docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md` |
| Closure: existe cobertura automatizada no `codex-flow-runner` provando que o fluxo nao fecha um ticket derivado enquanto um membro explicito da whitelist original nao tiver evidencia positiva correspondente | `src/integrations/codex-client.test.ts` cobre os prompts reais de `spec-triage`, `plan`, `implement` e `close-and-version`, provando que o contrato entregue ao Codex exige a evidencia positiva dos membros aceitos e nao aceita fechamento apoiado apenas em criterio agregado | `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts` |
| Closure: a documentacao do workflow explica que validacao generica de "valor valido" nao substitui a prova dos membros explicitamente aceitos pela spec quando o requisito for uma whitelist finita | `docs/workflows/codex-quality-gates.md` passa a conter a explicacao canonica do caso, sem depender apenas do texto dos prompts | `rg -n "valor valido|membros explicitamente aceitos|whitelist finita|enumerações finitas" docs/workflows/codex-quality-gates.md` |

- Comando complementar de consistencia tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros de tipos apos atualizar prompts/testes e manter o contrato atual do cliente de prompts.
- Comando complementar de auditoria de escopo:
  - Comando: `git diff -- docs/workflows/codex-quality-gates.md prompts/01-avaliar-spec-e-gerar-tickets.md prompts/02-criar-execplan-para-ticket.md prompts/03-executar-execplan-atual.md prompts/04-encerrar-ticket-commit-push.md src/integrations/codex-client.test.ts`
  - Esperado: diff restrito a checklist compartilhado, prompts da cadeia afetada e testes de contrato; nenhum toque em `src/core/runner.ts` ou no repositorio alvo.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar os patches deve convergir para um unico wording final no checklist e nos prompts, sem duplicar bullets ou parrafos;
  - rerodar `npm test -- src/integrations/codex-client.test.ts` e `npm run check` nao gera efeitos colaterais e apenas revalida o contrato;
  - a auditoria por `rg` deve continuar apontando o mesmo conjunto de palavras-chave quando o guardrail estiver aplicado corretamente.
- Riscos:
  - wording forte demais induzir interpretacao de "um ticket por membro", contrariando a assumption/default do proprio ticket;
  - wording fraco demais continuar aceitando um criterio agregado sem lastro observavel;
  - testes ficarem acoplados a frase exata demais e quebrarem por refino editorial sem perda semantica;
  - duplicar no prompt detalhe demais que deveria permanecer concentrado em `docs/workflows/codex-quality-gates.md`.
- Recovery / Rollback:
  - se o prompt ficar prolixo, reduzir o detalhe ao minimo e deixar a explicacao longa apenas no checklist compartilhado, mantendo nos prompts apenas o guardrail operacional indispensavel;
  - se o texto sugerir over-splitting de tickets, reescrever imediatamente para "preservar membros ou justificar consolidacao" antes de seguir para os testes;
  - se os testes ficarem frageis por wording literal, trocar para asserts sobre fragmentos semanticos e termos-chave, nao sobre paragrafo inteiro;
  - se surgir necessidade real de enforcement adicional em `runner.ts`, parar a execucao deste ticket com descoberta explicita em vez de ampliar escopo silenciosamente.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-30-workflow-improvement-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-c5f3980b.md`
- Spec e artefatos causais consultados:
  - `../guiadomus-caixa-trigger-crawler/docs/specs/2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler.md`
  - `../guiadomus-caixa-trigger-crawler/tickets/closed/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md`
  - `../guiadomus-caixa-trigger-crawler/execplans/2026-03-30-dispatch-local-http-e-observabilidade-da-ponte-trigger-crawler.md`
  - `../guiadomus-caixa-trigger-crawler/tickets/open/2026-03-30-local-http-deve-aceitar-loopback-ipv6.md`
  - `../guiadomus-caixa-trigger-crawler/.codex-flow-runner/flow-traces/decisions/20260330t234317z-run-specs-spec-spec-workflow-retrospective-2026-03-30-ponte-local-http-do-trigger-para-o-crawler-no-replay-do-scheduler-decision.json`
- Documentos e superficies do workflow consultados:
  - `AGENTS.md`
  - `DOCUMENTATION.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `SPECS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/02-criar-execplan-para-ticket.md`
  - `prompts/03-executar-execplan-atual.md`
  - `prompts/04-encerrar-ticket-commit-push.md`
  - `prompts/08-auditar-spec-apos-run-all.md`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
- Checklist aplicado neste planejamento:
  - leitura integral do ticket e das referencias obrigatorias antes de planejar;
  - declaracao explicita da spec de origem, do RF coberto, das assumptions/defaults e das restricoes herdadas;
  - traducao literal dos closure criteria em matriz de validacao observavel;
  - declaracao do que fica fora de escopo e dos principais riscos de wording/teste.
- Evidencias esperadas ao final da execucao:
  - diff do checklist compartilhado e dos prompts `01` a `04`;
  - diff dos testes de `src/integrations/codex-client.test.ts`;
  - saida verde de `npm test -- src/integrations/codex-client.test.ts` com 532 testes `pass`;
  - saida verde de `npm run check`;
  - `rg` mostrando os termos-chave do guardrail propagados nas superficies certas.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato textual do checklist compartilhado em `docs/workflows/codex-quality-gates.md`;
  - contrato textual dos prompts `01` a `04`;
  - cobertura automatizada do cliente que constroi e entrega esses prompts ao Codex.
- Compatibilidade:
  - o fluxo continua `spec -> tickets` e `ticket -> execplan quando necessario`;
  - o workflow continua sequencial e nao muda a fila, o parser de retrospectiva ou a publication cross-repo;
  - a resolucao de `<WORKFLOW_QUALITY_GATES_PATH>` para projeto externo deve permanecer funcionando como hoje;
  - o pacote nao deve tocar o repositorio alvo nem o `workflow-gap-analysis` em runtime.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova e esperada;
  - os testes devem reutilizar o harness existente de `CodexCliTicketFlowClient` e os prompt templates reais do repositorio;
  - o caso `[::1]` permanece apenas como evidencia causal; a remediacao implementada aqui deve ser generica e reaproveitavel para outras specs com enums/whitelists finitas.
