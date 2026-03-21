# ExecPlan - ticket transversal de workflow com contrato, contexto e rastreabilidade explicitos

## Purpose / Big Picture
- Objetivo: endurecer o contrato humano do ticket transversal automatico de workflow para que ele preserve, sem ambiguidade, a origem real da retrospectiva, o contexto cross-repo, os campos canonicos de audit/review e a trilha request/response/decision que sustentou o follow-up.
- Resultado esperado:
  - o handoff e o publisher passam a distinguir explicitamente retrospectiva pre-`/run-all` de retrospectiva pos-`spec-audit`;
  - tickets transversais publicados em cenarios same-repo e external-repo passam a exibir paths humanos qualificados por projeto, sem quebrar dedupe/reuse;
  - `INTERNAL_TICKETS.md`, o template e os prompts de retrospectiva deixam claro quais campos de audit/review e de rastreabilidade sao obrigatorios nesse fluxo;
  - testes automatizados cobrem o contrato atualizado do ticket gerado.
- Escopo:
  - ajustar contrato documental em `INTERNAL_TICKETS.md` e `tickets/templates/internal-ticket-template.md`;
  - alinhar `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` ao novo contrato;
  - propagar origem da retrospectiva, metadados de projeto e trilha de trace em `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts` e `src/integrations/workflow-improvement-ticket-publisher.ts`;
  - ampliar testes em `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/core/runner.test.ts` e, se necessario, `src/integrations/workflow-trace-store.test.ts`.
- Fora de escopo:
  - alterar a logica substantiva de derivacao de tickets da spec;
  - mudar a politica de fechamento funcional do pacote derivado;
  - introduzir publish em repositorio diferente do workflow para tickets transversais;
  - reescrever historico de tickets antigos.

## Progress
- [x] 2026-03-21 18:13Z - Ticket pai revisado, split follow-up registrado e superficies afetadas mapeadas em docs, prompts, runner, publisher e testes.
- [x] 2026-03-21 18:44Z - Contrato stage-aware/cross-repo-aware do ticket transversal implementado em docs, tipos, runner e publisher.
- [x] 2026-03-21 18:44Z - Validacao final concluida com `npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts`, `npm test -- src/core/runner.test.ts` e `npm run check`.

## Surprises & Discoveries
- 2026-03-21 18:13Z - O mesmo publisher atende `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`, mas hoje renderiza wording fixo de pos-auditoria.
- 2026-03-21 18:13Z - `activeProjectName` e `activeProjectPath` ja existem no handoff tipado, mas o ticket humano ainda nao materializa esses dados.
- 2026-03-21 18:13Z - A trilha `traceId` + `requestPath` + `responsePath` + `decisionPath` ja existe em `workflow-trace-store`, entao o gap e de propagacao/renderizacao, nao de captura bruta.
- 2026-03-21 18:13Z - Dedupe e nome de arquivo do ticket dependem do `sourceSpecPath` canonico e dos fingerprints; por isso o plano deve separar identidade canonica de path humano exibido.

## Decision Log
- 2026-03-21 - Decisao: preservar `sourceSpecPath` como identidade canonica para dedupe/reuse e introduzir campos de exibicao humana qualificados por projeto.
  - Motivo: `findReusableTicket` e `buildTicketFileName` dependem de `sourceSpecPath`, entao trocar esse valor quebraria reuse e hash de arquivo.
  - Impacto: o renderer do ticket precisara distinguir entre path canonico interno e path humano/documental.
- 2026-03-21 - Decisao: tratar origem da retrospectiva como dado estruturado do handoff, nao como texto inferido do `inputMode`.
  - Motivo: o mesmo `inputMode` nao comunica sozinho se a origem foi pre-`/run-all` ou pos-`spec-audit`.
  - Impacto: `WorkflowImprovementTicketHandoff` e `WorkflowImprovementTicketCandidate` provavelmente ganharao um campo explicito como `retrospectiveOrigin` ou equivalente.
- 2026-03-21 - Decisao: alinhar template, publisher e ticket automatico com os campos canonicos `Workflow root cause`, `Smallest plausible explanation`, `Remediation scope`, `Request ID`, `Request file`, `Response file` e campo explicito de `Decision file`.
  - Motivo: o template e `INTERNAL_TICKETS.md` ja tratam esse conjunto como contrato minimo para tickets de audit/review.
  - Impacto: o publisher precisara preencher campos adicionais e o template/documentacao podem precisar nomear `Decision file` explicitamente.
- 2026-03-21 - Decisao: validar o resultado final principalmente por testes do publisher/runner e por leitura do markdown gerado, sem depender de execucao manual completa de `/run_specs`.
  - Motivo: o contrato alterado e local ao handoff/publisher e ja possui cobertura de teste adequada para isolamento.
  - Impacto: os cenarios de same-repo, external-repo e reuse devem ser endurecidos na suite existente.

## Outcomes & Retrospective
- Status final: implementacao, validacao e fechamento do ticket concluidos; versionamento deste changeset em andamento nesta rodada.
- O que deve existir ao final:
  - contrato documental claro para tickets transversais de workflow em `INTERNAL_TICKETS.md` e no template;
  - handoff/publisher capazes de renderizar origem da retrospectiva, contexto de projeto e trilha de trace sem ambiguidade;
  - testes que provem comportamento correto em same-repo, external-repo e reuso de ticket aberto.
- O que fica pendente apos este plano:
  - eventual normalizacao retroativa de tickets antigos, se desejada fora deste escopo;
  - execucao do segundo follow-up sobre heranca de validacoes pendentes/manuais e criterios de fechamento observaveis.
- Proximos passos:
  - executar a implementacao na ordem docs/template -> types/runner/publisher -> testes;
  - gerar um ticket automatico de exemplo em teste para auditar o markdown final;
  - manter este plano atualizado com descobertas e decisoes durante a execucao.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md` - ticket executor deste plano.
  - `tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md` - ticket pai fechado por split-follow-up.
  - `INTERNAL_TICKETS.md` - contrato canonico de tickets internos/audit-review.
  - `tickets/templates/internal-ticket-template.md` - shape minimo do ticket humano.
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md` - retrospectiva pos-`spec-audit`.
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` - retrospectiva pre-`/run-all`.
  - `src/types/workflow-improvement-ticket.ts` - tipos do handoff, candidate e publication result.
  - `src/core/runner.ts` - construcao do handoff e acionamento do publisher.
  - `src/integrations/workflow-improvement-ticket-publisher.ts` - renderizacao, reuse e publish do ticket.
  - `src/integrations/workflow-trace-store.ts` - contrato do trace request/response/decision.
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts` e `src/core/runner.test.ts` - cobertura principal.
- Spec de origem:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
- RFs/CAs cobertos por este plano:
  - n/a como requisito funcional direto da spec externa;
  - cobertura indireta: garantir que o backlog sistemico derivado dessa spec e de futuras specs preserve corretamente os RFs/CAs referenciados, a origem da analise e o repositorio/projeto corretos.
- Assumptions / defaults adotados:
  - o ticket transversal pode nascer tanto de `spec-ticket-derivation-retrospective` quanto de `spec-workflow-retrospective`;
  - quando o projeto ativo for externo, o ticket deve continuar sendo publicado apenas no repositorio do workflow;
  - `sourceSpecPath` permanece como identidade canonica para reuse/hash, enquanto o ticket humano ganha campos adicionais de contexto e display;
  - `decisionPath` deve ser tratado como artefato explicito, sem depender de sobrecarga ambigua em `Log file`;
  - o ticket final deve ser auto-contido para leitura por outra IA sem contexto oral adicional.
- Fluxo atual relevante:
  - o runner monta um handoff minimo a partir do resultado de `workflow-gap-analysis`;
  - o publisher reutiliza `sourceSpecPath` + fingerprints para reuse e nome de arquivo;
  - o markdown atual do ticket assume retrospectiva pos-auditoria, mesmo quando a origem real foi pre-`/run-all`.
- Restricoes tecnicas:
  - nao quebrar reuse de ticket aberto nem o hash/nome do arquivo;
  - manter compatibilidade com publish same-repo e external-repo;
  - manter a superficie do ticket humano auditavel e curta o suficiente para triagem.

## Plan of Work
- Milestone 1: fixar o contrato humano/documental do ticket transversal.
  - Entregavel: `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `prompts/11...` e `prompts/12...` alinhados quanto a origem da retrospectiva, campos de audit/review e trilha de rastreabilidade.
  - Evidencia de conclusao: a documentacao explicita o uso de paths qualificados por projeto, `Decision file` e a diferenca entre retrospectiva pre-`/run-all` e pos-`spec-audit`.
  - Arquivos esperados: `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `prompts/11-retrospectiva-workflow-apos-spec-audit.md`, `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`.
- Milestone 2: propagar contexto estruturado do runner ate o ticket publicado.
  - Entregavel: tipos, handoff e publisher atualizados para carregar origem da retrospectiva, metadados de projeto/repositorio e trilha `traceId`/`requestPath`/`responsePath`/`decisionPath`.
  - Evidencia de conclusao: o ticket gerado em teste exibe origem correta, paths humanos qualificados e campos completos de audit/review sem alterar a identidade canonica usada em dedupe.
  - Arquivos esperados: `src/types/workflow-improvement-ticket.ts`, `src/core/runner.ts`, `src/integrations/workflow-improvement-ticket-publisher.ts`.
- Milestone 3: provar estabilidade do contrato atualizado.
  - Entregavel: testes cobrindo publish same-repo, external-repo, reuse de ticket aberto e shape do markdown gerado nas duas retrospectivas.
  - Evidencia de conclusao: a suite relevante passa e asserta explicitamente wording/stage corretos, paths qualificados e trilha de rastreabilidade.
  - Arquivos esperados: `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/core/runner.test.ts`, possivelmente `src/integrations/workflow-trace-store.test.ts`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' INTERNAL_TICKETS.md` e `sed -n '1,220p' tickets/templates/internal-ticket-template.md` para reler o contrato canonico dos campos obrigatorios.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `sed -n '1,220p' prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `sed -n '1,220p' prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para localizar o wording atual das duas retrospectivas.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "workflow-gap-analysis pos-auditoria|Request ID|Response file|Log file|sourceSpecPath|traceId|decisionPath" src/types/workflow-improvement-ticket.ts src/core/runner.ts src/integrations/workflow-improvement-ticket-publisher.ts` para mapear pontos de troca de contrato.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md`, `prompts/11-retrospectiva-workflow-apos-spec-audit.md` e `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` para exigir explicitamente origem da retrospectiva, contexto cross-repo qualificado e `Decision file`.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/types/workflow-improvement-ticket.ts` para adicionar campos estruturados de origem da retrospectiva, projeto/contexto humano e trace da etapa.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.ts` para preencher os novos campos do handoff a partir da etapa executada e da trace gravada.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-improvement-ticket-publisher.ts` para renderizar o ticket com wording stage-aware, paths qualificados por projeto e campos canonicos de audit/review/rastreabilidade, preservando `sourceSpecPath` para dedupe.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/workflow-improvement-ticket-publisher.test.ts`, `src/core/runner.test.ts` e, se a trilha for validada diretamente, `src/integrations/workflow-trace-store.test.ts`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts src/integrations/workflow-trace-store.test.ts` para validar publish, wording e rastreabilidade.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para garantir compatibilidade tipada apos a ampliacao do contrato.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md prompts/11-retrospectiva-workflow-apos-spec-audit.md prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md src/types/workflow-improvement-ticket.ts src/core/runner.ts src/integrations/workflow-improvement-ticket-publisher.ts src/integrations/workflow-improvement-ticket-publisher.test.ts src/integrations/workflow-trace-store.test.ts` para auditar escopo final antes do fechamento.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: tickets transversais identificam corretamente a retrospectiva de origem e nao reutilizam wording de pos-auditoria em origem pre-`/run-all`.
  - Evidencia observavel: testes do publisher/runner exercitam as duas origens e fazem assercao direta de texto/stage distintos no markdown gerado.
  - Comando: `npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts src/core/runner.test.ts`
  - Esperado: cenarios cobrindo `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` passam com asserts explicitos sobre o wording do ticket.
- Matriz requisito -> validacao observavel:
  - Requisito: quando o projeto ativo for externo, o ticket explicita projeto ativo, repositorio alvo e referencias cross-repo sem ambiguidade, preservando dedupe/reuse.
  - Evidencia observavel: o ticket de teste de external-repo mostra paths humanos qualificados por projeto enquanto o reuse continua dependente do `sourceSpecPath` canonico.
  - Comando: `npm test -- src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - Esperado: os testes de external-repo e reuse continuam verdes e verificam os novos campos humanos sem regressao no comportamento de dedupe.
- Matriz requisito -> validacao observavel:
  - Requisito: o ticket automatico preenche `Workflow root cause`, `Smallest plausible explanation`, `Remediation scope`, `Request ID`, `Request file`, `Response file` e `Decision file`.
  - Evidencia observavel: documentacao/template e markdown gerado contem todos os campos previstos.
  - Comando: `rg -n "Smallest plausible explanation|Remediation scope|Request ID|Request file|Response file|Decision file" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md src/integrations/workflow-improvement-ticket-publisher.ts`
  - Esperado: todos os campos aparecem na documentacao canonica e no renderer do ticket.
- Matriz requisito -> validacao observavel:
  - Requisito: a ampliacao do contrato nao quebra a tipagem nem a integracao com trace/publisher.
  - Evidencia observavel: TypeScript e suite relevante passam sem erros.
  - Comando: `npm run check`
  - Esperado: compilacao sem erros de tipos.

## Idempotence and Recovery
- Idempotencia:
  - rerodar a implementacao deve atualizar o mesmo contrato e as mesmas secoes do markdown, sem duplicar campos ou variar o `sourceSpecPath` canonico;
  - os testes de reuse precisam continuar encontrando o mesmo ticket quando `sourceSpecPath` e fingerprints coincidirem;
  - a renderizacao de paths humanos deve ser deterministica para same-repo e external-repo.
- Riscos:
  - acoplar o wording do ticket diretamente ao `inputMode`, perpetuando ambiguidade de origem;
  - substituir `sourceSpecPath` pelo path humano e quebrar dedupe/hash;
  - introduzir nomenclatura conflitante entre `Log file` e `Decision file`;
  - ajustar prompts/documentacao sem atualizar o renderer, gerando contrato divergente.
- Recovery / Rollback:
  - se o novo contrato quebrar reuse, restaurar `sourceSpecPath` como chave canonica e mover toda a semantica humana para campos adicionais;
  - se o ticket final ficar prolixo demais, manter os mesmos dados em metadados sucintos, sem remover campos obrigatorios;
  - se houver divergencia entre template e publisher, usar `tickets/templates/internal-ticket-template.md` + `INTERNAL_TICKETS.md` como fonte normativa de desempate.

## Artifacts and Notes
- Ticket executor:
  - `tickets/closed/2026-03-21-ticket-transversal-de-workflow-contrato-contexto-e-rastreabilidade-gap.md`
- Ticket pai:
  - `tickets/closed/2026-03-20-workflow-improvement-2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding-324c08ec.md`
- Spec externa que motivou o gap:
  - `../guiadomus-enrich-costs-and-bid/docs/specs/2026-03-20-estrategia-v3-de-custos-e-bid-para-caixa-extrajudicial-com-overlay-de-funding.md`
- Referencias principais do planejamento:
  - `PLANS.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `prompts/11-retrospectiva-workflow-apos-spec-audit.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/types/workflow-improvement-ticket.ts`
  - `src/core/runner.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.ts`
  - `src/integrations/workflow-trace-store.ts`
  - `src/integrations/workflow-improvement-ticket-publisher.test.ts`
  - `src/core/runner.test.ts`
- Observacao operacional:
  - este plano prepara a implementacao, mas nao exige executar `/run_specs` de ponta a ponta para comprovar o contrato; a validacao local por testes e leitura do markdown gerado e suficiente para aceite tecnico.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `WorkflowImprovementTicketHandoff` e `WorkflowImprovementTicketCandidate` em `src/types/workflow-improvement-ticket.ts`;
  - possivel shape textual do ticket em `src/integrations/workflow-improvement-ticket-publisher.ts`;
  - contrato documental do template e de `INTERNAL_TICKETS.md`.
- Compatibilidade:
  - manter compatibilidade com publish same-repo e external-repo;
  - manter `sourceSpecPath` como chave canonica de reuse/hash;
  - manter `workflow-trace-store` como origem unica de `requestPath`/`responsePath`/`decisionPath`.
- Dependencias externas e mocks:
  - nenhuma dependencia npm nova esperada;
  - mocks principais ja existem em `src/integrations/workflow-improvement-ticket-publisher.test.ts`;
  - a principal dependencia cruzada e a ordem em que `runner.ts` captura a trace da etapa e monta o handoff para o publisher.
