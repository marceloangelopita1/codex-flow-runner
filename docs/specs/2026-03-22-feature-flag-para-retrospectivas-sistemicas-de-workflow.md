# [SPEC] Feature flag para retrospectivas sistêmicas de melhoria de workflow no /run_specs

## Metadata
- Spec ID: 2026-03-22-feature-flag-para-retrospectivas-sistemicas-de-workflow
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-22 19:18Z
- Last reviewed at (UTC): 2026-03-22 19:33Z
- Source: technical-evolution
- Related tickets:
  - tickets/open/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md
  - tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md
- Related execplans:
  - Nenhum ainda; criar apenas a partir dos tickets derivados, quando necessário para execução segura.
- Related commits:
  - A definir
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve: o `codex-flow-runner` hoje executa automaticamente duas etapas voltadas à melhoria contínua do próprio workflow durante `/run_specs`: a retrospectiva sistêmica pre-`/run_all` (`spec-ticket-derivation-retrospective`) e a retrospectiva sistêmica pós-`spec-audit` (`spec-workflow-retrospective`). Essas etapas são úteis para evoluir o runner, mas nem sempre são desejáveis em distribuições do projeto voltadas a terceiros, porque introduzem análise sistêmica adicional, publicação automática de ticket transversal e superfícies extras de observabilidade.
- Resultado esperado: introduzir uma feature flag de ambiente, `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`, que controle conjuntamente essas duas etapas. O comportamento padrão passa a ser desligado (`false`), de modo que o fluxo funcional de `/run_specs` continue operando normalmente sem executar retrospectivas sistêmicas nem publicar tickets transversais. Quando a flag estiver ligada (`true`), o comportamento atual dessas etapas deve ser preservado.
- Contexto funcional: `/run_specs` deve continuar priorizando o fluxo funcional da spec do projeto alvo (`spec-triage -> spec-ticket-validation -> spec-close-and-version -> /run_all -> spec-audit`). As retrospectivas sistêmicas passam a ser uma capacidade opcional do runner, explicitamente ativada por configuração local em `.env`, e não uma parte obrigatória do comportamento padrão.
- Restrições técnicas relevantes:
  - manter o fluxo sequencial do runner;
  - usar uma única feature flag para controlar as duas etapas sistêmicas;
  - default da flag deve ser `false`;
  - a flag deve ser lida a partir do ambiente no bootstrap do processo;
  - desligar a flag deve impedir execução, write-back em spec e publication de ticket transversal;
  - com a flag desligada, a observabilidade dessa decisão deve ficar restrita a logs/traces técnicos internos, sem aparecer no resumo final do Telegram;
  - não alterar os contratos parseáveis atuais de `derivation-gap-analysis`, `workflow-gap-analysis` ou `workflow-ticket-publication`;
  - não criar comando de Telegram para ligar/desligar a flag em runtime.

## Jornada de uso
1. Operador mantém o `.env` padrão, sem definir `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` ou definindo `false`.
2. Operador executa `/run_specs <arquivo-da-spec.md>`.
3. Runner executa `spec-triage`, `spec-ticket-validation`, `spec-close-and-version`, `/run_all` e `spec-audit` normalmente.
4. Mesmo que haja histórico revisado de gaps antes do `/run_all` ou gaps residuais reais após `spec-audit`, as etapas `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` não são executadas.
5. O resumo final do `/run_specs` permanece focado no fluxo funcional da spec e não expõe blocos de retrospectiva sistêmica.
6. Operador decide ativar explicitamente a melhoria contínua do workflow e define `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` no `.env`.
7. Após reiniciar o runner, uma nova execução de `/run_specs` volta a poder disparar as duas retrospectivas sistêmicas, seguindo as regras atuais de elegibilidade.
8. Quando a flag estiver ligada e os gatilhos funcionais ocorrerem, o runner pode novamente analisar o próprio workflow e, quando aplicável, abrir ou reutilizar ticket transversal no `codex-flow-runner`.

## Requisitos funcionais
- RF-01: o runner deve introduzir a variável de ambiente opcional `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`.
- RF-02: `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` deve aceitar os mesmos formatos booleanos já suportados pelo parser de ambiente do projeto.
- RF-03: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` estiver ausente, o valor efetivo deve ser `false`.
- RF-04: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o runner não deve executar `spec-ticket-derivation-retrospective`.
- RF-05: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o runner não deve executar `spec-workflow-retrospective`.
- RF-06: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o runner não deve invocar `derivation-gap-analysis`, `workflow-gap-analysis` nem `workflow-ticket-publication`.
- RF-07: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o runner não deve publicar ticket transversal de workflow em nenhuma etapa do `/run_specs`.
- RF-08: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o runner não deve fazer write-back da seção `Retrospectiva sistemica da derivacao dos tickets` na spec corrente.
- RF-09: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o resumo final do `/run_specs` não deve incluir os blocos `Retrospectiva sistemica da derivacao` nem `Retrospectiva sistemica pos-spec-audit`.
- RF-10: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective` não devem aparecer como `finalStage`, `completedStages` nem como duração medida no snapshot do fluxo.
- RF-11: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`, o fluxo funcional principal deve permanecer inalterado:
  - `spec-ticket-validation` continua decidindo `GO/NO_GO`;
  - `spec-close-and-version` continua dependendo apenas do veredito funcional;
  - `/run_all` continua processando os tickets abertos;
  - `spec-audit` continua sendo a auditoria funcional final.
- RF-12: quando a flag estiver desligada e a retrospectiva pre-`/run_all` teria sido elegível, o runner deve registrar em logs/traces técnicos internos que a etapa foi suprimida por feature flag.
- RF-13: quando a flag estiver desligada e a retrospectiva pós-`spec-audit` teria sido elegível, o runner deve registrar em logs/traces técnicos internos que a etapa foi suprimida por feature flag.
- RF-14: com a flag desligada, essa supressão não deve aparecer em mensagens de milestone, resumo final do Telegram, write-back de spec nem como ticket transversal.
- RF-15: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, o comportamento atual de `spec-ticket-derivation-retrospective` deve permanecer inalterado.
- RF-16: quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true`, o comportamento atual de `spec-workflow-retrospective` deve permanecer inalterado.
- RF-17: a implementação deve usar a mesma flag para as duas etapas; não deve existir uma flag separada para pre-`/run_all` e outra para pós-`spec-audit`.
- RF-18: `.env.example` deve documentar `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`.
- RF-19: `README.md` deve documentar a nova variável de ambiente, seu default e seu efeito sobre o fluxo `/run_specs`.
- RF-20: `README.md` deve deixar explícito que as retrospectivas sistêmicas de melhoria do workflow só rodam quando a flag estiver ligada.
- RF-21: `SPECS.md` deve deixar explícito que a seção `Retrospectiva sistemica da derivacao dos tickets` permanece canônica no modelo de spec, mas sua execução/write-back depende da feature flag estar ligada.
- RF-22: `docs/specs/templates/spec-template.md` deve deixar explícito que, com a flag desligada, a seção de retrospectiva pode permanecer como `n/a` e não recebe write-back automático.
- RF-23: as specs históricas `2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` devem receber nota documental mínima apontando que a ativação futura dessas etapas passou a depender da nova flag, sem reescrever o histórico da entrega já concluída.
- RF-24: o bootstrap do runner deve registrar em log técnico o estado efetivo de `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`.
- RF-25: alterar o valor da flag exige reinício do processo do runner; não há recarga dinâmica da configuração durante a execução.

<!-- Heading canônico: use exatamente "## Assumptions and defaults" nas specs locais. O workflow aceita "## Premissas e defaults" apenas como alias de compatibilidade de leitura para specs externas ou legadas. -->
## Assumptions and defaults
- O nome canônico da nova flag é `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`.
- O default canônico é `false`.
- A mesma flag controla conjuntamente `spec-ticket-derivation-retrospective` e `spec-workflow-retrospective`.
- Com a flag desligada, a implementação deve desligar a etapa inteira, e não apenas a publication de ticket transversal.
- Com a flag desligada, a observabilidade da decisão fica restrita a logs/traces técnicos internos; não deve aparecer no resumo final do operador.
- A mudança deve reutilizar o parser booleano já existente em `src/config/env.ts`.
- Os prompts existentes `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md` e `prompts/11-retrospectiva-workflow-apos-spec-audit.md` permanecem válidos; a mudança ocorre na orquestração e na configuração, não no contrato dos prompts.
- O valor da flag é carregado no bootstrap e passa a valer para toda a vida do processo até o próximo restart.

## Nao-escopo
- Criar duas feature flags separadas, uma para o pre-`/run_all` e outra para o pós-`spec-audit`.
- Criar comando de Telegram, callback ou preferência por projeto para ligar/desligar a funcionalidade em runtime.
- Alterar a taxonomia atual de `workflow-gap-analysis` ou os critérios de `publicationEligibility`.
- Manter as análises sistêmicas ativas enquanto desliga apenas a publicação do ticket transversal.
- Alterar a ordem do fluxo funcional principal de `/run_specs`.
- Reescrever retroativamente o histórico completo das specs já atendidas.
- Alterar o contrato parseável dos prompts de retrospectiva.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - `parseEnv` retorna `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` quando a variável está ausente.
- [ ] CA-02 - `parseEnv` aceita `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true|false` com o mesmo contrato booleano já usado pelo projeto.
- [ ] CA-03 - `.env.example` passa a conter `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`.
- [ ] CA-04 - Com a flag desligada e havendo histórico revisado de gaps no `spec-ticket-validation`, `/run_specs` não executa `spec-ticket-derivation-retrospective`.
- [ ] CA-05 - Com a flag desligada e havendo gaps residuais reais após `spec-audit`, `/run_specs` não executa `spec-workflow-retrospective`.
- [ ] CA-06 - Com a flag desligada, o resumo final do `/run_specs` não mostra `Retrospectiva sistemica da derivacao` nem `Retrospectiva sistemica pos-spec-audit`.
- [ ] CA-07 - Com a flag desligada, `spec-audit` permanece como fase final observável do `/run_specs` quando o backlog encadeado conclui com sucesso e não há falha funcional posterior.
- [ ] CA-08 - Com a flag desligada, não há publication de ticket transversal de workflow.
- [ ] CA-09 - Com a flag desligada, a spec corrente não recebe write-back automático na seção `Retrospectiva sistemica da derivacao dos tickets`.
- [ ] CA-10 - Com a flag desligada, logs/traces técnicos internos registram explicitamente que a retrospectiva elegível foi suprimida por feature flag.
- [ ] CA-11 - Com a flag ligada, a retrospectiva pre-`/run_all` continua executando nos mesmos cenários elegíveis de hoje.
- [ ] CA-12 - Com a flag ligada, a retrospectiva pós-`spec-audit` continua executando nos mesmos cenários elegíveis de hoje.
- [ ] CA-13 - `README.md` documenta a flag, o default `false`, a necessidade de restart e o efeito no fluxo `/run_specs`.
- [ ] CA-14 - `SPECS.md` e `docs/specs/templates/spec-template.md` ficam consistentes com a ativação condicional por feature flag.

## Gate de validacao dos tickets derivados
- Veredito atual: n/a
- Gaps encontrados:
  - n/a
- Correcoes aplicadas:
  - n/a
- Causa-raiz provavel:
  - n/a
- Ciclos executados:
  - n/a
- Nota de uso: esta spec ainda não passou por `/run_specs`; quando isso ocorrer, esta seção deve registrar apenas o histórico funcional do gate formal de tickets derivados.
- Política histórica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-22T19:32:36.538Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado cobre o escopo inteiro da spec em dois tickets complementares, sem lacunas objetivas de cobertura, heranca de validacoes manuais ou conformidade documental para a origem `spec-triage`; o ticket P0 concentra runtime/configuracao/testes e o ticket P1 isola o alinhamento documental canonico/historico sem duplicacao material.
- Ciclos executados: 0
- Thread da validacao: 019d1707-c3d6-7d90-8c15-021c44984518
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md [fonte=source-spec]
  - tickets/open/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: GO (high)
  - Resumo: O pacote derivado cobre o escopo inteiro da spec em dois tickets complementares, sem lacunas objetivas de cobertura, heranca de validacoes manuais ou conformidade documental para a origem `spec-triage`; o ticket P0 concentra runtime/configuracao/testes e o ticket P1 isola o alinhamento documental canonico/historico sem duplicacao material.
  - Thread: 019d1707-c3d6-7d90-8c15-021c44984518
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Nenhuma.

## Retrospectiva sistemica da derivacao dos tickets
- Executada: nao
- Motivo de ativacao ou skip: pulada porque o gate funcional nao revisou gaps em nenhum ciclo.
- Classificacao final: n/a
- Confianca: n/a
- Frente causal analisada: n/a
- Achados sistemicos:
  - n/a
- Artefatos do workflow consultados:
  - n/a
- Elegibilidade de publicacao: n/a
- Resultado do ticket transversal ou limitacao operacional:
  - n/a
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Exercitar ao menos uma rodada real com `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` e outra com `true`, confirmando a diferença de comportamento no Telegram, nos logs e no write-back de spec.
- Validacoes manuais pendentes:
  - Confirmar em execução real que alterar a flag no `.env` sem reiniciar o processo não muda o comportamento em voo, reforçando o contrato de bootstrap.
  - Confirmar em execução real que, com a flag desligada, o fluxo permanece legível para um operador externo e não expõe blocos sistêmicos no resumo final.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Resultado da validacao final da triagem: a releitura desta spec, dos 2 tickets derivados, de `SPECS.md`, `DOCUMENTATION.md` e do diff atual confirmou que a triagem esta consistente, sem gap adicional fora da rastreabilidade ja aberta; por isso o documento permanece em `Status: approved` com `Spec treatment: pending`.
- Itens atendidos:
  - A necessidade e o escopo desta mudança foram consolidados nesta spec com decisão explícita de produto: feature flag única, default desligado e observabilidade restrita a logs/traces internos quando a flag estiver `false`.
  - A spec já identifica as superfícies principais da mudança: configuração (`src/config/env.ts`, `.env.example`), orquestração (`src/core/runner.ts`), resumo final (`src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`) e documentação canônica (`README.md`, `SPECS.md`, template de spec e notas mínimas nas specs históricas relevantes).
  - A triagem inicial desta spec foi concluída com derivação de 2 tickets em `tickets/open/`, separados entre runtime/configuração e alinhamento documental canônico/histórico.
- Pendencias em aberto:
  - `tickets/open/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md`: implementar `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` com default `false`, log técnico de bootstrap, guard nas duas retrospectivas e supressão de publication/write-back/resumo/timing quando `false`, preservando o comportamento atual quando `true`.
  - `tickets/open/2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md`: atualizar `.env.example`, `README.md` e testes automatizados para refletir o contrato operacional da flag, incluindo restart obrigatório.
  - `tickets/open/2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md`: alinhar `SPECS.md`, `docs/specs/templates/spec-template.md` e as specs históricas `2026-03-19-...` e `2026-03-20-...` com a ativação condicional por feature flag, sem reescrever histórico funcional.
- Evidencias de validacao:
  - Leitura do contrato atual em `README.md`, `SPECS.md` e `docs/specs/templates/spec-template.md`.
  - Leitura das specs antecedentes `2026-03-19-retrospectiva-sistemica-do-workflow-apos-spec-audit.md` e `2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`.
  - Leitura do estado atual de configuração e orquestração em `src/config/env.ts`, `src/config/env.test.ts`, `src/core/runner.ts`, `src/types/flow-timing.ts` e `src/integrations/telegram-bot.ts`.
  - Revisão de gaps concluída em 2026-03-22 19:24Z, com classificação `atendido | parcialmente atendido | não atendido` por RF/CA e abertura dos tickets derivados acima.
  - Validacao final da triagem concluida em 2026-03-22 19:33Z, confirmando consistencia entre `Status: approved`, `Spec treatment: pending`, as pendencias abertas e a rastreabilidade para os 2 tickets em `tickets/open/`.

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - 
- Causas-raiz sistemicas identificadas:
  - 
- Ajustes genericos promovidos ao workflow:
  - 

## Riscos e impacto
- Risco funcional: desligar as retrospectivas por padrão pode reduzir a captura automática de melhorias sistêmicas do próprio workflow.
- Risco operacional: se a documentação não deixar claro o default desligado, operadores podem esperar tickets transversais e retrospectivas que não vão acontecer.
- Mitigacao:
  - documentar a flag em `.env.example` e `README.md` com default explícito;
  - manter logs/traces técnicos internos quando a etapa elegível for suprimida por feature flag;
  - preservar o comportamento atual integralmente quando a flag estiver ligada.

## Decisoes e trade-offs
- 2026-03-22 - Usar uma única feature flag para as duas etapas sistêmicas - reduz complexidade operacional e deixa o comportamento opcional mais fácil de explicar para terceiros.
- 2026-03-22 - Adotar default `false` - privilegia um comportamento mais neutro para forks e instalações de terceiros, exigindo opt-in explícito para melhoria contínua do próprio workflow.
- 2026-03-22 - Com a flag desligada, expor a decisão apenas em logs/traces técnicos internos - mantém o resumo do operador focado no fluxo funcional da spec, sem ruído adicional.
- 2026-03-22 - Não alterar os prompts existentes - limita a mudança ao controle de ativação e reduz risco de regressão no contrato atual quando a flag estiver ligada.

## Historico de atualizacao
- 2026-03-22 19:18Z - Versão inicial da spec criada com `Status: approved` e `Spec treatment: pending`, consolidando a adoção da feature flag `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` para controlar as retrospectivas sistêmicas pre-`/run_all` e pós-`spec-audit`.
- 2026-03-22 19:24Z - Revisão de gaps de implementação concluída sem alteração de código; tickets `2026-03-22-feature-flag-para-retrospectivas-sistemicas-no-run-specs-gap.md` e `2026-03-22-documentacao-canonica-da-feature-flag-de-retrospectivas-gap.md` foram abertos em `tickets/open/`, e o status permaneceu `approved` com `Spec treatment: pending`.
- 2026-03-22 19:33Z - Validacao final da triagem concluida com releitura da spec, dos tickets derivados, de `SPECS.md`, `DOCUMENTATION.md` e do diff atual; o documento permaneceu em `Status: approved` e `Spec treatment: pending` por ainda depender dos 2 tickets abertos.
