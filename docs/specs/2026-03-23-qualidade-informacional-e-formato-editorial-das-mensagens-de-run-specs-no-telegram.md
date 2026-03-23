# [SPEC] Qualidade informacional e formato editorial das mensagens de `/run_specs` no Telegram

## Metadata
- Spec ID: 2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-03-23 16:09Z
- Last reviewed at (UTC): 2026-03-23 17:19Z
- Source: operational-gap
- Related tickets:
  - [tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md](../../tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md)
  - [tickets/closed/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md](../../tickets/closed/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md)
- Related execplans:
  - [execplans/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md](../../execplans/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md)
  - [execplans/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md](../../execplans/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md)
- Related commits:
  - chore(specs): audit 2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md (este changeset)
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve: as mensagens de `/run_specs` no Telegram já são robustas do ponto de vista de entrega, mas ainda apresentam deficiência editorial e contratual. O marco de triagem é pouco informativo e excessivamente centrado em timing, enquanto o resumo final concentra dados ricos em alguns blocos e redundância em outros. O operador hoje recebe menos informação do que precisa sobre `spec-triage`, `spec-ticket-validation` e `spec-ticket-derivation-retrospective` em alguns momentos, e informação duplicada ou mal hierarquizada em outros.
- Resultado esperado: definir um contrato editorial canônico para as mensagens de `/run_specs` no Telegram, com conteúdo completo, sem duplicação evitável e com formato mais agradável para leitura operacional. O operador deve conseguir entender rapidamente o que aconteceu em cada fase relevante, o que foi decidido, por que o fluxo prosseguiu ou bloqueou e qual é a próxima ação necessária.
- Contexto funcional:
  - o projeto já possui camada central de entrega robusta para mensagens Telegram, com retry, chunking e logging padronizado;
  - o fluxo `/run_specs` já expõe dados estruturados fortes para `spec-ticket-validation` e parte da `spec-ticket-derivation-retrospective`;
  - o renderer atual do resumo final ainda é predominantemente append-only, o que favorece sobreposição de blocos, repetição textual e hierarquia fraca;
  - o evento do marco de triagem ainda carrega poucos campos, o que limita a qualidade do conteúdo antes mesmo da renderização;
  - algumas fases importantes do `/run_specs` ainda não contam com resumo estruturado próprio no contrato interno, aparecendo apenas por nome de fase e timing.
- Restrições técnicas relevantes:
  - preservar a camada atual de entrega robusta do Telegram;
  - manter compatibilidade com mensagens em texto simples no Telegram;
  - não alterar a semântica funcional das fases do `/run_specs`;
  - não introduzir persistência/outbox ou novas garantias de entrega nesta evolução;
  - não transformar o Telegram em cópia integral de trace/log bruto;
  - manter o fluxo sequencial e a observabilidade atual do runner.

## Jornada de uso
1. O operador executa `/run_specs <arquivo-da-spec.md>` para uma spec elegível.
2. Ao fim da triagem pre-`/run_all`, o bot envia um marco de triagem que funciona como checkpoint decisório, resumindo o resultado da validação, da retrospectiva da derivação e da decisão de seguir ou bloquear o fluxo.
3. Se o gate bloquear ou falhar tecnicamente, o operador entende pelo próprio Telegram em que fase o fluxo parou, qual foi a decisão final e qual ação corretiva é esperada.
4. Se a triagem concluir com sucesso, o operador entende pelo próprio Telegram por que o `/run_all` vai começar, sem precisar inferir isso apenas por timing ou por mensagens posteriores.
5. Ao final do fluxo completo, o bot envia um resumo final com seções estáveis, cobertura das fases relevantes e densidade informacional suficiente para leitura rápida e diagnóstico operacional.
6. O operador consegue decidir se precisa investigar logs/traces, revisar tickets, reexecutar o fluxo ou apenas acompanhar a conclusão, sem reler mensagens duplicadas ou ambíguas.

## Requisitos funcionais
- RF-01: o projeto deve definir um contrato editorial canônico para as mensagens Telegram do fluxo `/run_specs`, cobrindo ao menos o marco de triagem e o resumo final de fluxo.
- RF-02: o marco de triagem e o resumo final devem ter responsabilidades distintas e complementares:
  - o marco de triagem atua como checkpoint pre-`/run_all`;
  - o resumo final atua como consolidação do fluxo completo.
- RF-03: o marco de triagem não pode se limitar a resultado, fase final, próxima ação e timings; ele deve incluir snapshot funcional das decisões relevantes já tomadas até aquele ponto.
- RF-04: quando `spec-ticket-validation` tiver sido executada, o marco de triagem deve incluir no mínimo:
  - veredito;
  - confiança final;
  - motivo final;
  - ciclos executados;
  - resumo curto do gate.
- RF-05: quando `spec-ticket-derivation-retrospective` tiver sido executada, o marco de triagem deve incluir no mínimo:
  - decisão;
  - indicação se houve gaps revisados;
  - classificação e confiança da análise quando existirem;
  - resumo curto da retrospectiva.
- RF-06: em casos de bloqueio ou falha técnica antes do `/run_all`, o marco de triagem deve continuar exibindo o melhor snapshot possível das fases já concluídas, em vez de degradar para um texto genérico apoiado apenas em `details`.
- RF-07: o resumo final do `/run_specs` deve adotar uma ordem editorial estável, separando com clareza:
  - visão geral do fluxo;
  - fases pre-`/run_all`;
  - fases pós-`/run_all`;
  - timings;
  - resultado do `/run_all` encadeado.
- RF-08: o resumo final deve representar explicitamente, quando aplicável, as fases `spec-triage`, `spec-ticket-validation`, `spec-ticket-derivation-retrospective`, `spec-close-and-version`, `run-all`, `spec-audit` e `spec-workflow-retrospective`.
- RF-09: as fases `spec-triage`, `spec-close-and-version` e `spec-audit` devem passar a ter resumo estruturado próprio no contrato interno do fluxo sempre que houver informação operacional relevante além de timing.
- RF-10: o resumo estruturado de `spec-triage` deve comunicar ao operador, no mínimo, o efeito observável da triagem sobre a spec e seu pacote derivado, sem reproduzir saída bruta do Codex.
- RF-11: o resumo estruturado de `spec-close-and-version` deve comunicar ao operador, no mínimo, se o fechamento/versionamento esperado da spec foi concluído e qual o resultado observável principal dessa etapa.
- RF-12: o resumo estruturado de `spec-audit` deve comunicar ao operador, no mínimo, o status dos gaps residuais e o efeito funcional da auditoria sobre o desfecho do fluxo.
- RF-13: a renderização de `spec-ticket-validation` deve evitar duplicação semântica entre histórico por ciclo e agregados finais.
- RF-14: quando houver lista agregada de correções aplicadas, ela deve ser semanticamente deduplicada ou substituída por uma forma mais concisa de síntese, sem repetir literalmente a mesma correção em múltiplos lugares do mesmo resumo.
- RF-15: a renderização de `spec-ticket-validation` deve expor de forma mais legível a evolução do gate entre ciclos, incluindo pelo menos redução de gaps, contagem de gaps finais e indicação de revalidação quando houver.
- RF-16: a renderização de `spec-ticket-derivation-retrospective` deve separar com clareza:
  - o status de execução da retrospectiva;
  - a análise sistêmica subjacente;
  - eventual ticket transversal ou limitação operacional associada.
- RF-17: o resumo final não pode usar o mesmo rótulo genérico `Resumo` em sequência para significados diferentes dentro do mesmo bloco sem qualificação explícita.
- RF-18: os blocos de timing devem ser apresentados com escopo claro e sem competir editorialmente com os blocos de decisão. Quando coexistirem timings de triagem e do fluxo completo, a distinção de escopo deve ser autoexplicativa.
- RF-19: o formato das mensagens deve ser mais agradável dentro das restrições de texto simples do Telegram, com:
  - hierarquia visual estável;
  - títulos de seção consistentes;
  - agrupamento lógico de linhas;
  - uso parcimonioso de ícones;
  - separação visual entre blocos principais;
  - ausência de parede de texto ou repetição evitável.
- RF-20: o contrato editorial deve privilegiar legibilidade operacional, resumindo sinais importantes em vez de despejar todos os campos internos disponíveis.
- RF-21: a implementação deve evoluir a montagem das mensagens de `/run_specs` para um modelo mais orientado a seções ou view-models editoriais, reduzindo o acoplamento atual de concatenação incremental de linhas.
- RF-22: o chunking de mensagens longas deve preservar a compreensão editorial, evitando quebrar a leitura no meio de uma seção quando houver alternativa razoável.
- RF-23: a evolução desta spec não deve reduzir a robustez já entregue pela camada central de envio do Telegram nem enfraquecer os sinais críticos hoje refletidos no estado do runner.
- RF-24: a suíte de testes automatizados deve passar a cobrir qualidade editorial mínima das mensagens de `/run_specs`, incluindo presença de informação por fase, ausência de duplicação textual evitável e comportamento consistente em cenários de sucesso, bloqueio, falha técnica e retrospectiva executada/pulada.

## Assumptions and defaults
- O Telegram continuará sendo tratado como superfície operacional de leitura rápida, não como substituto integral de logs, traces ou artefatos persistidos.
- O marco de triagem deve ser significativamente mais informativo do que hoje, mas ainda mais curto e decisório do que o resumo final.
- O resumo final pode ser mais detalhado do que o marco de triagem, desde que preserve hierarquia visual e leitura escaneável.
- Nem toda fase precisa expor o mesmo volume de dados; o critério canônico é utilidade operacional, não simetria artificial.
- `spec-ticket-validation` e `spec-ticket-derivation-retrospective` já têm base contratual suficiente para melhorias editoriais imediatas.
- `spec-triage`, `spec-close-and-version` e `spec-audit` provavelmente exigirão enriquecimento do contrato interno, e não apenas ajuste de renderer.
- O formato alvo permanece compatível com texto simples e chunking do Telegram, sem depender de Markdown complexo, mídia ou anexos.

## Nao-escopo
- Reescrever todas as mensagens do bot no Telegram fora do fluxo `/run_specs`.
- Alterar a lógica funcional do gate `spec-ticket-validation`, da retrospectiva da derivação, do `run-all` ou da auditoria final.
- Introduzir persistência/outbox, replay, garantia de exactly-once ou novas políticas de entrega.
- Transformar as mensagens do Telegram em espelho completo de request/response/decision ou do trace bruto do workflow.
- Mudar o contrato funcional de comandos, callbacks, autenticação, seleção de projeto ou locks de concorrência.
- Redesenhar nesta spec as mensagens de `/run_all`, `/run_ticket`, `/plan_spec`, `/discover_spec` ou `/codex_chat`, salvo referências necessárias para consistência de estilo.
- Exigir HTML, Markdown avançado, arquivos anexos, tabelas renderizadas ou qualquer recurso fora do envelope atual de texto do Telegram.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - O marco de triagem de `/run_specs` passa a incluir snapshot funcional de `spec-ticket-validation` e, quando aplicável, de `spec-ticket-derivation-retrospective`, além de `Resultado`, `Fase final` e `Próxima ação`.
- [x] CA-02 - Em cenário `NO_GO` ou falha técnica pre-`/run_all`, o marco de triagem continua mostrando o melhor contexto funcional já disponível das fases concluídas, sem depender apenas de um campo textual genérico de detalhes.
- [x] CA-03 - O resumo final de `/run_specs` passa a seguir ordem editorial estável e distinguível entre visão geral, fases pre-`/run_all`, fases pós-`/run_all`, timings e resultado do `/run_all` encadeado.
- [x] CA-04 - O resumo final passa a exibir resumo dedicado de `spec-triage`, `spec-close-and-version` e `spec-audit` quando essas fases ocorrerem, e não apenas seus nomes e tempos.
- [x] CA-05 - O bloco de `spec-ticket-validation` deixa de repetir literalmente a mesma correção aplicada em histórico por ciclo e em agregados finais.
- [x] CA-06 - O bloco de `spec-ticket-derivation-retrospective` deixa de usar rótulos ambíguos ou duplicados para resumos de camadas diferentes, distinguindo claramente execução da retrospectiva e análise sistêmica.
- [x] CA-07 - Quando o resumo final incluir timings de triagem e do fluxo completo, ambos ficam com escopo claramente distinguível e não soam como duplicação editorial do mesmo bloco.
- [x] CA-08 - Os testes automatizados de `src/integrations/telegram-bot.test.ts` e os testes correlatos do runner passam a cobrir sucesso, bloqueio por `NO_GO`, falha técnica de triagem, retrospectiva executada, retrospectiva pulada e mensagens longas chunkadas com asserts editoriais específicos.
- [x] CA-09 - O caminho de envio das mensagens de `/run_specs` continua utilizando a camada robusta central de entrega do Telegram sem regressão em retry, chunking, logging ou estado observável de notificações críticas.
- [x] CA-10 - Pela leitura isolada do Telegram, o operador passa a conseguir identificar com clareza: se o `/run_all` vai começar ou foi bloqueado, qual foi o resultado do gate, o que mudou entre ciclos de validação quando houver revalidação, se houve achado sistêmico na derivação e qual foi o resultado funcional da auditoria final.

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
- Nota de uso: esta seção ainda não passou por `/run_specs`; quando isso ocorrer, ela deve registrar apenas o histórico funcional do gate formal dos tickets derivados desta spec.
- Política histórica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-03-23T16:26:13.421Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado cobre o escopo da spec em dois tickets complementares, com particionamento coerente entre contrato de summaries e renderer editorial/chunking; a unica lacuna residual de observabilidade nos Closure criteria do ticket P0 foi corrigida nesta rodada.
- Ciclos executados: 0
- Thread da validacao: 019d1b82-281f-7f00-a87c-b5cc64cc18d2
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/closed/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md [fonte=source-spec]
  - tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: GO (high)
  - Resumo: O pacote derivado cobre o escopo da spec em dois tickets complementares, com particionamento coerente entre contrato de summaries e renderer editorial/chunking; a unica lacuna residual de observabilidade nos Closure criteria do ticket P0 foi corrigida nesta rodada.
  - Thread: 019d1b82-281f-7f00-a87c-b5cc64cc18d2
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 1
    - Refinado o Closure criteria do ticket de contrato para explicitar os campos minimos observaveis do snapshot de `spec-ticket-validation` e `spec-ticket-derivation-retrospective` no milestone pre-`/run_all`, com asserts exigidos nos testes do runner. [applied]

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Refinado o Closure criteria do ticket de contrato para explicitar os campos minimos observaveis do snapshot de `spec-ticket-validation` e `spec-ticket-derivation-retrospective` no milestone pre-`/run_all`, com asserts exigidos nos testes do runner.
  - Artefatos afetados: tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim
- Motivo de ativacao ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificacao final: not-systemic
- Confianca: high
- Frente causal analisada: A menor causa plausivel e uma falha local de redacao na derivacao inicial do ticket, nao uma insuficiencia material de prompts, contratos, validacoes ou ordem do workflow.
- Achados sistemicos:
  - nenhum
- Artefatos do workflow consultados:
  - AGENTS.md
  - DOCUMENTATION.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - SPECS.md
  - docs/workflows/codex-quality-gates.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/integrations/codex-client.ts
  - src/integrations/workflow-gap-analysis-parser.test.ts
- Elegibilidade de publicacao: nao
- Resultado do ticket transversal ou limitacao operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - Nenhuma no escopo local desta implementação; a cobertura automatizada editorial/chunking foi adicionada em `src/integrations/telegram-bot.test.ts` e `src/integrations/telegram-delivery.test.ts`.
- Validações manuais pendentes:
  - Nenhuma como bloqueio residual desta spec após a auditoria final.
- Smokes operacionais externos recomendados (não bloqueantes para `Status: attended` e `Spec treatment: done`):
  - Revisar com exemplos reais de execução se o novo marco de triagem ficou informativo sem virar resumo final prematuro.
  - Validar em mensagens reais se a nova hierarquia visual permanece agradável quando o resumo final for chunkado em mais de uma parte.
  - Confirmar manualmente que operadores conseguem responder mais rápido às perguntas “o que aconteceu?”, “o que mudou?” e “o que faço agora?” usando apenas a mensagem do Telegram.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Resultado da auditoria final: em 2026-03-23T17:19:39Z a releitura desta spec, dos 2 tickets fechados relacionados, dos 2 execplans relacionados, de `docs/workflows/codex-quality-gates.md`, do estado atual do código e das validações observáveis do repositório confirmou atendimento de RF-01..RF-24 e CA-01..CA-10, sem gap funcional residual local; por isso a spec passa a `Status: attended` com `Spec treatment: done`.
- Itens atendidos:
  - O projeto já possui base robusta de entrega no Telegram, evitando que esta spec precise resolver confiabilidade de transporte.
  - O fluxo `/run_specs` agora expõe no milestone de triagem snapshots estruturados de `spec-ticket-validation` e `spec-ticket-derivation-retrospective`, inclusive em cenarios de `NO_GO` e falha tecnica pre-`/run_all`.
  - O resumo final de `/run_specs` agora carrega summaries dedicados de `spec-triage`, `spec-close-and-version` e `spec-audit`, com campos minimos observaveis voltados a efeito funcional.
  - Os prompts de `spec-triage`, `spec-close-and-version` e `spec-audit` agora publicam blocos parseaveis minimos para sustentar esse contrato sem heuristica sobre texto livre.
  - O milestone de triagem e o resumo final de `/run_specs` agora são renderizados a partir de seções editoriais estáveis, com distinção explícita entre visão geral, blocos pre-`/run_all`, blocos pos-`/run_all`, timings e resultado encadeado do `/run_all`.
  - `spec-ticket-validation` agora expõe revalidação, contagem final de gaps e evolução por ciclo sem repetir literalmente a mesma correção no histórico e no agregado final.
  - A retrospectiva da derivação, a retrospectiva pos-`spec-audit` e os blocos de timing agora usam rótulos qualificados e escopo autoexplicativo, sem reuso ambíguo de `Resumo`.
  - O chunking de mensagens longas agora prefere fronteiras de seção (`\n\n`) antes de recorrer a `\n`, preservando melhor a leitura editorial sem bypass da camada central de entrega.
  - A suíte automatizada agora trava a qualidade editorial mínima exigida para sucesso, `NO_GO`, falha técnica de triagem, retrospectiva executada/pulada e chunking longo com preservação de fronteira de seção quando aplicável.
- Pendências em aberto:
  - Nenhuma lacuna funcional residual foi encontrada no projeto corrente durante esta auditoria final.
  - Permanecem apenas smokes operacionais externos recomendados em `Validacoes pendentes ou manuais`, sem bloquear `Status: attended` nem `Spec treatment: done`.
- Evidências de validação:
  - Execucao nesta auditoria de `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts`, cobrindo milestone, resumo final, snapshots parciais, `NO_GO`, falha tecnica pre-`/run_all`, retrospectiva executada/pulada e chunking com preferencia por fronteira de secao.
  - Execucao nesta auditoria de `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`, sustentando o contrato novo nas suites completas do repositório sem regressões observáveis.
  - Execucao nesta auditoria de `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` e `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`, confirmando tipagem e compilação do fluxo completo com o contrato editorial final.
  - Releitura de `docs/specs/2026-02-19-telegram-run-status-notification.md`, `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`, `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` e `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`.
  - Releitura dos tickets fechados `tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md` e `tickets/closed/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`, dos execplans homônimos e inspeção das superfícies `src/core/runner.ts`, `src/types/flow-timing.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/telegram-delivery.ts` e testes correlatos.

## Auditoria final de entrega
- Auditoria executada em: 2026-03-23T17:19:39Z
- Resultado: a releitura integral desta spec, dos 2 tickets fechados relacionados, dos 2 execplans relacionados, do checklist `docs/workflows/codex-quality-gates.md`, do estado atual do código e das suites executadas nesta auditoria confirmou atendimento de RF-01..RF-24 e CA-01..CA-10. Não foram encontrados gaps técnicos residuais; a spec permanece em `Status: attended` com `Spec treatment: done`.
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum
- Causas-raiz sistêmicas identificadas:
  - nenhuma
- Ajustes genéricos promovidos ao workflow:
  - nenhum

## Riscos e impacto
- Risco funcional: aumentar densidade informacional sem critério pode produzir mensagens mais completas porém mais cansativas e menos úteis para operação rápida.
- Risco operacional: enriquecer os contratos internos de fase sem delimitação clara pode espalhar novamente responsabilidade editorial por múltiplas camadas do runner.
- Mitigação:
  - separar explicitamente contrato de dados, responsabilidade editorial e transporte;
  - tratar milestone e resumo final como superfícies com papéis diferentes;
  - travar em testes tanto presença de informação relevante quanto ausência de duplicação evitável;
  - validar leitura chunkada em cenários reais e não apenas em snapshots felizes.

## Decisoes e trade-offs
- 2026-03-23 - Tratar esta evolução como melhoria editorial e contratual de `/run_specs`, e não como novo problema de robustez de entrega - evita misturar escopos já cobertos pela camada central de Telegram.
- 2026-03-23 - Priorizar utilidade operacional e legibilidade sobre simetria artificial entre fases - reconhece que algumas fases exigem resumos leves e outras exigem maior profundidade.
- 2026-03-23 - Exigir enriquecimento contratual de fases hoje timing-only quando houver sinal operacional relevante - evita depender apenas de “embelezamento” do renderer onde faltam dados estruturados.

## Historico de atualizacao
- 2026-03-23 16:09Z - Versão inicial da spec.
- 2026-03-23 16:17Z - Spec revisada contra o estado atual do codigo; tickets derivados para contrato de summaries e renderer editorial/chunking.
- 2026-03-23 16:29Z - Triagem validada para versionamento; status mantido como approved com pendencias rastreadas nos tickets abertos.
- 2026-03-23 16:50Z - Contrato interno de milestone e summaries do `/run_specs` enriquecido no codigo, com validacao automatizada local; pendencia principal remanescente ficou concentrada no ticket editorial/chunking e na auditoria final da spec.
- 2026-03-23 16:53Z - Ticket de contrato fechado como `fixed` em `tickets/closed/`; a spec permanece pendente apenas pelo ticket editorial/chunking e pela auditoria final.
- 2026-03-23 17:10Z - Renderer editorial por secoes, deduplicacao semantica do gate e chunking com fronteira de secao implementados e validados localmente; permanecem pendentes apenas as validacoes manuais com exemplos reais e a auditoria final da spec.
- 2026-03-23 17:14Z - Ticket editorial/chunking fechado como `fixed` com resultado final `GO`; seguem pendentes apenas as validacoes manuais externas em Telegram real e a auditoria final da spec.
- 2026-03-23 17:19Z - Auditoria final apos a rodada encadeada releu a spec, os 2 tickets fechados, os 2 execplans, `docs/workflows/codex-quality-gates.md`, o estado atual do codigo e as suites `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts`, `npm test`, `npm run check` e `npm run build`; sem gaps residuais funcionais locais, a spec foi promovida para `Status: attended` com `Spec treatment: done`.
