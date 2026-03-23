# ExecPlan - Rendering editorial e chunking com contexto de seção no /run_specs

## Purpose / Big Picture
- Objetivo: reorganizar as mensagens de `/run_specs` no Telegram em seções editoriais estáveis, remover duplicação semântica do gate funcional, separar retrospectivas com rótulos inequívocos e tornar o chunking sensível a fronteiras de seção sem degradar a camada central de entrega.
- Resultado esperado:
  - o milestone de triagem e o resumo final passam a ter hierarquia editorial clara e responsabilidades distintas;
  - `buildRunFlowSummaryMessage(...)` deixa de ser uma montagem essencialmente append-only e passa a renderizar a partir de um modelo de seções/view-models editoriais;
  - `spec-ticket-validation` expõe evolução entre ciclos, gaps finais e revalidação sem repetir literalmente a mesma correção no histórico e no agregado;
  - a retrospectiva da derivação e a retrospectiva pós-`spec-audit` deixam de competir pelo rótulo genérico `Resumo`, e os blocos de timing ficam com escopo autoexplicativo;
  - mensagens longas preservam leitura editorial ao preferir quebra por fronteiras de seção quando houver alternativa razoável;
  - a suíte automatizada trava sucesso, `NO_GO`, falha técnica de triagem, retrospectiva executada/pulada e chunking longo com asserts editoriais específicos.
- Escopo:
  - refatoração do renderer de `/run_specs` em `src/integrations/telegram-bot.ts`;
  - ajuste focal do algoritmo de chunking em `src/integrations/telegram-delivery.ts` ou do contrato entre renderer e delivery para respeitar fronteiras editoriais;
  - ampliação da cobertura em `src/integrations/telegram-bot.test.ts` e testes correlatos do runner quando necessário;
  - preparação de evidências reais de mensagem e registro das três validações manuais herdadas da spec.
- Fora de escopo:
  - redesenhar o contrato funcional dos summaries de fase já entregue pelo ticket fechado `tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md`;
  - alterar a semântica funcional das etapas de `/run_specs`, criar persistência/outbox ou mudar políticas de retry/logging da camada central além do estritamente necessário para chunking editorial;
  - reescrever mensagens Telegram fora do fluxo `/run_specs`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-23 16:57Z - Planejamento inicial concluído com leitura integral do ticket, da spec de origem, do ticket P0 já fechado, de `PLANS.md`, de `SPECS.md`, de `DOCUMENTATION.md`, de `docs/workflows/codex-quality-gates.md` e das superfícies técnicas afetadas.
- [x] 2026-03-23 17:10Z - Arquitetura editorial por seções aplicada ao milestone de triagem e ao resumo final de `/run_specs` em `src/integrations/telegram-bot.ts`, com títulos estáveis para visão geral, blocos pre-/run_all, blocos pos-/run_all, timings e resultado encadeado do `/run_all`.
- [x] 2026-03-23 17:10Z - Chunking orientado por fronteiras de seção implementado em `src/integrations/telegram-delivery.ts`, priorizando `\n\n` antes de `\n` sem alterar retry/logging/policies da camada central.
- [x] 2026-03-23 17:10Z - Cobertura automatizada editorial/chunking concluída em `src/integrations/telegram-bot.test.ts` e `src/integrations/telegram-delivery.test.ts`, incluindo ordem de seções, deduplicação semântica do gate e preservação de fronteira de seção no chunking quando aplicável.
- [ ] 2026-03-23 17:10Z - Exemplos reais de mensagem e validações manuais herdadas continuam pendentes por dependerem de execução externa em chat Telegram autorizado; nenhuma captura real foi produzida nesta etapa local.
- [x] 2026-03-23 17:10Z - Validação final concluída com `npx tsx --test src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts`, `npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`, `npm test`, `npm run check` e `npm run build`.

## Surprises & Discoveries
- 2026-03-23 16:57Z - O ticket P0 já entregou o contrato de dados necessário; o principal risco agora é transformar o novo shape em layout editorial melhor sem reintroduzir acoplamento por concatenação incremental.
- 2026-03-23 16:57Z - `buildRunFlowSummaryMessage(...)` já possui blocos distintos para `spec-triage`, `spec-ticket-validation`, retrospectivas, auditoria e timings, mas ainda os concatena em uma única sequência linear sem modelo explícito de seção.
- 2026-03-23 16:57Z - A duplicação criticada no ticket está concentrada em `appendRunSpecsTicketValidationLines(...)`, que mistura histórico por ciclo e agregado final com o mesmo vocabulário de correções.
- 2026-03-23 16:57Z - O conflito editorial de rótulos está concentrado em `appendSpecTicketDerivationRetrospectiveLines(...)` + `appendWorkflowGapAnalysisDetails(...)`, onde “Resumo” aparece para camadas diferentes dentro do mesmo bloco.
- 2026-03-23 16:57Z - `chunkText(...)` hoje só conhece o último `\n` antes do limite; para cumprir RF-22/CA-08 sem quebrar o contrato central, a solução provavelmente precisa preferir separadores de seção sem espalhar lógica editorial por múltiplas camadas.
- 2026-03-23 17:10Z - O mesmo modelo leve de seções resolveu também o milestone de triagem sem exigir novo contrato de dados; bastou reorganizar o conteúdo já publicado pelo P0 em blocos com responsabilidade mais explícita.
- 2026-03-23 17:10Z - A heurística mínima de preferir `\n\n` no delivery foi suficiente para cumprir o objetivo de chunking editorial; não foi necessário introduzir metadados extras entre renderer e transporte.
- 2026-03-23 17:10Z - A síntese final do gate ficou mais útil quando trocou lista repetida de descrições por resumo agregado de quantidade, resultado, artefatos afetados e frentes de gap, mantendo o detalhe literal só no histórico por ciclo.
- 2026-03-23 17:10Z - A única pendência remanescente fora do repositório é operacional: faltam exemplos reais de Telegram para registrar as três validações manuais herdadas antes do fechamento do ticket.

## Decision Log
- 2026-03-23 - Decisão: tratar este ticket como redesign editorial guiado por seções, não como mera troca cosmética de strings.
  - Motivo: RF-19, RF-20, RF-21 e RF-22 exigem hierarquia visual, agrupamento lógico, utilidade operacional e chunking legível; ajustar rótulos isolados não resolveria a causa-raiz.
  - Impacto: a implementação deve introduzir um modelo intermediário de seções ou view-models editoriais antes da serialização final do texto.
- 2026-03-23 - Decisão: manter `TelegramDeliveryService` como caminho central de entrega e concentrar a inteligência editorial no renderer ou em metadados explícitos consumidos pelo delivery.
  - Motivo: RF-23 e CA-09 proíbem regressão de robustez na camada central já entregue.
  - Impacto: qualquer ajuste em `src/integrations/telegram-delivery.ts` deve ser mínimo, focado em respeitar fronteiras de seção, sem duplicar políticas de retry/logging.
- 2026-03-23 - Decisão: adotar como default que cada seção editorial terá título explícito, linhas agrupadas e separação por linha em branco.
  - Motivo: isso cria fronteiras observáveis para leitura humana e para chunking sem depender de heurística frágil sobre qualquer newline.
  - Impacto: os testes devem validar ordem de seções, rótulos qualificados e, quando houver múltiplas partes, preservação de blocos completos sempre que possível.
- 2026-03-23 - Decisão: a deduplicação do gate será semântica, não apenas textual.
  - Motivo: o ticket pede evitar repetição literal da mesma correção entre histórico e agregado, mas ainda preservar evolução entre ciclos e sinal final do gate.
  - Impacto: o histórico por ciclo deve priorizar mudanças/reduções observáveis e o agregado final deve virar síntese consolidada, não réplica do histórico.
- 2026-03-23 - Decisão: as três validações manuais herdadas da spec permanecem fora do fechamento automático, mas a execução deste plano deve reservar uma etapa explícita para coletar exemplos reais e registrar o resultado de cada uma.
  - Motivo: isso está no closure criterion do ticket e não pode ficar implícito para o fechamento.
  - Impacto: o ticket só ficará pronto com evidência documental dessas validações, mesmo que a comprovação principal continue sendo automatizada.
- 2026-03-23 - Decisão: nomear as seções editoriais do resumo final com prefixos `Pre-/run_all` e `Pos-/run_all`.
  - Motivo: isso torna a cronologia do fluxo observável no próprio texto, reduz ambiguidade entre retrospectiva pre-run_all e retrospectiva pos-spec-audit e fornece fronteiras claras para os asserts e para o chunking.
  - Impacto: os testes passaram a validar ordem e presença dessas seções explícitas em vez de depender de rótulos genéricos como `Resumo ...`.
- 2026-03-23 - Decisão: resumir `Correcoes aplicadas` do gate por contagem/outcome/artefatos/frentes, sem repetir as descrições já exibidas no histórico por ciclo.
  - Motivo: RF-13/RF-14 pedem deduplicação semântica, mas ainda exigem que a evolução do gate permaneça observável.
  - Impacto: a cobertura automatizada ganhou assert negativo para impedir que a mesma descrição literal apareça no histórico e no agregado final.
- 2026-03-23 - Decisão: aplicar a preferência por fronteira de seção no `TelegramDeliveryService` genérico, não apenas no call site de `/run_specs`.
  - Motivo: o ganho é compatível com o contrato central de entrega e preserva um único caminho de chunking para mensagens longas.
  - Impacto: `src/integrations/telegram-delivery.test.ts` passou a travar explicitamente a prioridade de quebra em `\n\n`.

## Outcomes & Retrospective
- Status final: implementação local e validação automatizada concluídas; pendência manual externa permanece aberta.
- O que funcionou: o recorte entre contrato de dados (P0) e apresentação editorial permitiu introduzir um modelo explícito de seções sem alterar a semântica funcional do `/run_specs`; a preferência por `\n\n` no delivery também estabilizou o chunking com impacto mínimo.
- O que ficou pendente: executar `/run_specs <spec-aprovada>` em chat Telegram autorizado, capturar milestone/resumo final reais e registrar no ticket o resultado das três validações manuais herdadas.
- Próximos passos: usar os comandos e a matriz abaixo apenas como referência de reexecução/auditoria; para encerrar o ticket ainda falta a validação manual externa e a atualização documental correspondente no ticket.

## Context and Orientation
- Arquivos principais:
  - `tickets/closed/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`
  - `tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md`
  - `docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.test.ts`
- Spec de origem: `docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md`
- RFs/CAs cobertos por este plano:
  - RF-01, RF-02, RF-07, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24
  - CA-03, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10
- RNFs e restrições herdados que precisam ficar observáveis neste ticket:
  - preservar a camada atual de entrega robusta do Telegram;
  - manter compatibilidade com mensagens em texto simples;
  - não alterar a semântica funcional das fases do `/run_specs`;
  - não introduzir persistência/outbox ou novas garantias de entrega;
  - não transformar o Telegram em cópia integral de trace/log bruto;
  - manter o fluxo sequencial e a observabilidade atual do runner;
  - manter a barra editorial orientada a legibilidade operacional, não a simetria artificial entre fases.
- Assumptions / defaults adotados:
  - o milestone de triagem continua mais curto e decisório do que o resumo final, mesmo após ganhar melhor organização visual;
  - o resumo final será montado a partir de seções editoriais explícitas, cada uma com título, corpo e separação estável por linha em branco;
  - a ordem editorial padrão do resumo final será: visão geral do fluxo -> fases pre-`/run_all` -> fases pós-`/run_all` -> timings -> resultado do `/run_all` encadeado;
  - o bloco de `spec-ticket-validation` deve mostrar evolução do gate por ciclo e síntese final, mas o agregado final não pode repetir literalmente correções já listadas no histórico;
  - a retrospectiva da derivação e a retrospectiva pós-`spec-audit` usarão rótulos qualificados distintos para execução, análise sistêmica e eventual ticket/limitação associada;
  - o chunking continuará centralizado no `TelegramDeliveryService`, mas passará a preferir delimitadores de seção dupla quebra de linha antes de recorrer à quebra por newline simples ou corte duro;
  - os cabeçalhos `Parte x/y` da camada central permanecem válidos; a melhoria aqui é preservar blocos editoriais dentro de cada parte, não substituir o contrato de entrega.
- Validações manuais herdadas relevantes:
  - revisar com exemplos reais se o novo marco de triagem ficou informativo sem virar resumo final prematuro;
  - validar em mensagens reais se a hierarquia visual permanece agradável quando o resumo final for chunkado em mais de uma parte;
  - confirmar manualmente que operadores conseguem responder mais rápido a “o que aconteceu?”, “o que mudou?” e “o que faço agora?” usando apenas a mensagem do Telegram.
- Fluxo atual relevante:
  - `buildRunFlowSummaryMessage(...)` em `src/integrations/telegram-bot.ts` serializa o resumo final de `/run_specs` por `lines.push(...)` em sequência única;
  - `appendRunSpecsTicketValidationLines(...)` repete correções entre histórico por ciclo e agregado final;
  - `appendSpecTicketDerivationRetrospectiveLines(...)` chama `appendWorkflowGapAnalysisDetails(...)`, que volta a usar “Resumo” para outro nível semântico;
  - `appendTimingLines(...)` gera blocos corretos, mas hoje eles concorrem editorialmente com blocos de decisão;
  - `chunkText(...)` em `src/integrations/telegram-delivery.ts` só procura o último newline antes do limite;
  - `src/integrations/telegram-bot.test.ts` já cobre milestone, resumo final e chunking, mas ainda com asserts editoriais parciais.

## Plan of Work
- Milestone 1 - Formalizar o modelo editorial de seções para `/run_specs`
  - Entregável: helpers ou view-models explícitos representam seções do milestone de triagem e do resumo final, com ordem, títulos e fronteiras claras.
  - Evidência de conclusão: `buildRunFlowSummaryMessage(...)` e, quando necessário, `buildRunSpecsTriageMilestoneMessage(...)` deixam de depender apenas de uma lista linear de `lines.push(...)` para estruturar o layout.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 2 - Remover duplicação e ambiguidade dos blocos funcionais
  - Entregável: `spec-ticket-validation` passa a separar evolução por ciclo e síntese final sem repetição literal de correções; retrospectivas e timings recebem rótulos qualificados e escopo autoexplicativo.
  - Evidência de conclusão: asserts textuais negativos/positivos provam ausência de duplicação evitável e presença dos novos rótulos editoriais.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 3 - Tornar o chunking sensível a fronteiras editoriais
  - Entregável: mensagens longas priorizam quebra em fronteiras de seção quando houver alternativa razoável, preservando o caminho central de entrega.
  - Evidência de conclusão: testes de chunking validam contagem de partes, cabeçalho `Parte x/y` e preservação de blocos inteiros/ordem editorial quando o resumo excede o limite.
  - Arquivos esperados:
    - `src/integrations/telegram-delivery.ts`
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 4 - Fechar a cobertura observável e a evidência manual do ticket
  - Entregável: a suíte automatizada cobre os cenários exigidos pelo closure criterion e o ticket recebe exemplos reais de mensagem + resultado das três validações manuais herdadas.
  - Evidência de conclusão: testes direcionados e regressão completa verdes; ticket documentado com exemplos reais do Telegram e conclusão objetiva de cada validação manual.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.test.ts`
    - `src/core/runner.test.ts` se algum helper/summary compartilhado precisar de ajuste
    - artefatos/documentação de fechamento do ticket

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "buildRunFlowSummaryMessage|buildRunSpecsTriageMilestoneMessage|appendRunSpecsTicketValidationLines|appendSpecTicketDerivationRetrospectiveLines|appendWorkflowGapAnalysisDetails|appendTimingLines|chunkText" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts` para reconfirmar os pontos exatos de refatoração antes da implementação.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para introduzir um modelo explícito de seções/view-models editoriais do `/run_specs`, com helpers responsáveis por montar seções completas antes da serialização final.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para reorganizar a ordem editorial do resumo final em blocos estáveis de visão geral, fases pre-`/run_all`, fases pós-`/run_all`, timings e resultado do `/run_all` encadeado, mantendo o milestone mais curto e decisório.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para refatorar `spec-ticket-validation` em duas camadas complementares:
   - evolução por ciclo com foco em veredito, gaps, redução real e revalidação;
   - síntese final sem repetição literal das mesmas correções já exibidas no histórico.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.ts` para qualificar os rótulos da retrospectiva da derivação, da análise sistêmica pós-`spec-audit` e dos timings, eliminando o reuso ambíguo de `Resumo` e deixando o escopo de cada bloco autoexplicativo.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-delivery.ts` para permitir chunking orientado por fronteiras de seção, priorizando dupla quebra de linha ou outro delimitador editorial explícito antes de recorrer ao newline simples ou corte duro, sem alterar retry/logging/policies.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/telegram-bot.test.ts` para cobrir:
   - resumo final em sucesso com ordem editorial estável;
   - `NO_GO` e falha técnica de triagem com seções coerentes;
   - retrospectiva executada e retrospectiva pulada com rótulos distintos;
   - asserts negativos para duplicação textual de correções;
   - chunking longo com verificação de fronteira de seção quando aplicável.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/runner.test.ts` apenas se algum cenário compartilhado de `/run_specs` precisar ser ajustado para refletir a nova superfície editorial sem alterar o contrato funcional do runner.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para validar diretamente os cenários editoriais e de chunking exigidos pelo ticket.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para confirmar que a reorganização editorial não quebrou suites correlatas do runner/Telegram.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar a tipagem após a introdução de helpers/modelos editoriais e eventual ajuste de chunking.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para garantir compilação do fluxo completo.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts src/integrations/telegram-bot.test.ts src/core/runner.test.ts` para auditoria final de escopo e para reler o diff contra ticket + spec + ExecPlan antes do fechamento.
14. (workdir: `n/a - chat Telegram autorizado`) Executar manualmente `/run_specs <spec-aprovada>` após a implementação, capturar o milestone de triagem e o resumo final reais, e registrar no ticket:
   - exemplos reais das mensagens;
   - resultado da validação “marco informativo sem virar resumo final prematuro”;
   - resultado da validação de hierarquia visual em mensagem chunkada;
   - resultado da validação “o que aconteceu / o que mudou / o que faço agora?” usando apenas o Telegram.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisito: RF-01, RF-02, RF-07; CA-03
    - Evidência observável: milestone e resumo final passam a usar ordem editorial estável, com seções distinguíveis para visão geral, fases pre-`/run_all`, fases pós-`/run_all`, timings e resultado do `/run_all`; os testes validam títulos/ordem e a separação de responsabilidade entre checkpoint de triagem e consolidação final.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: os cenários de resumo final e milestone ficam verdes com asserts explícitos sobre rótulos e ordem editorial das seções.
  - Requisito: RF-13, RF-14, RF-15; CA-05, CA-10
    - Evidência observável: o bloco de `spec-ticket-validation` mostra evolução entre ciclos, contagem de gaps finais e revalidação quando houver, sem repetir literalmente a mesma correção em histórico e agregado; existem asserts negativos para duplicação textual evitável.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: os testes de resumo `/run_specs` passam verificando histórico por ciclo, síntese final, gaps finais e ausência de repetição literal de correções.
  - Requisito: RF-16, RF-17, RF-18; CA-06, CA-07
    - Evidência observável: a retrospectiva da derivação separa execução, análise sistêmica e ticket/limitação associada; rótulos deixam de reutilizar `Resumo` sem qualificação; timings de triagem e fluxo completo ficam com escopo autoexplicativo.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: os testes ficam verdes exigindo rótulos qualificados para retrospectivas e timings, sem ambiguidade entre camadas.
  - Requisito: RF-19, RF-20, RF-21, RF-22, RF-24; CA-08
    - Evidência observável: o renderer passa a ser orientado a seções/view-models editoriais; a suíte cobre sucesso, `NO_GO`, falha técnica de triagem, retrospectiva executada, retrospectiva pulada e mensagens longas chunkadas com asserts editoriais específicos, incluindo verificação de fronteira de seção quando aplicável.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts src/core/runner.test.ts`
    - Esperado: os cenários exigidos pelo ticket passam com asserts específicos de layout editorial e comportamento de chunking.
  - Requisito: RF-23; CA-09
    - Evidência observável: `sendRunSpecsTriageMilestone(...)` e `sendRunFlowSummary(...)` continuam usando `TelegramDeliveryService` com logging/retry/chunking centralizados, e os testes existentes de entrega permanecem verdes.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-bot.test.ts`
    - Esperado: a cobertura de entrega do Telegram segue verde sem bypass do caminho central nem regressão de retry/chunking/logging.
  - Requisito: validações manuais herdadas da spec
    - Evidência observável: o ticket registra exemplos reais de mensagem após a implementação e documenta o resultado das três validações manuais herdadas, mesmo permanecendo como cheque manual externo ao fechamento automático.
    - Comando: execução manual em chat Telegram autorizado de `/run_specs <spec-aprovada>` com captura do milestone de triagem e do resumo final reais.
    - Esperado: o ticket passa a conter os exemplos reais e o resultado explícito de cada validação manual herdada.
- Sustentação obrigatória dos critérios acima:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: a suite completa passa sem regressão lateral nos fluxos de runner e Telegram.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: a tipagem valida a propagação consistente dos helpers/modelos editoriais e de qualquer ajuste de chunking.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: a build conclui com sucesso.

## Idempotence and Recovery
- Idempotência:
  - rerodar os testes e a refatoração do renderer não deve produzir efeitos colaterais fora do working tree local;
  - reexecutar o plano deve manter uma única ordenação editorial canônica e um único mecanismo de chunking com preferência por fronteiras de seção, sem caminhos paralelos competindo entre si.
- Riscos:
  - redesenhar `telegram-bot.ts` demais e reabrir escopo contratual já resolvido pelo ticket P0;
  - introduzir chunking “inteligente” demais no delivery e acoplar lógica editorial ao transporte genérico;
  - endurecer asserts textuais de forma frágil e produzir testes sensíveis a detalhes cosméticos irrelevantes;
  - eliminar duplicação do gate de forma excessiva e perder evidência útil de evolução entre ciclos.
- Recovery / Rollback:
  - introduzir primeiro o modelo de seções no renderer, depois ajustar chunking e só então apertar os asserts editoriais, reduzindo o raio de falha;
  - se o chunking por seção causar regressão, preservar a refatoração editorial no renderer e recuar temporariamente para o comportamento atual de newline simples até estabilizar a heurística;
  - se a síntese do gate esconder demais a evolução, restaurar o histórico por ciclo como fonte detalhada e reduzir apenas o agregado final;
  - se algum teste ficar brittle, reescrever a asserção para checar semântica observável de seção/ordem/duplicação em vez de snapshots extensos de mensagem inteira.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-23-run-specs-telegram-editorial-rendering-and-chunking.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram.md`
- Ticket correlato já entregue:
  - `tickets/closed/2026-03-23-run-specs-telegram-triage-and-phase-summary-contract.md`
- Referências obrigatórias consumidas no planejamento:
  - `PLANS.md`
  - `SPECS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/core/runner.test.ts`
- Artefatos esperados ao final da execução:
  - diff restrito ao renderer/editorial, ao chunking necessário e aos testes correlatos;
  - outputs de teste cobrindo os closure criteria do ticket;
  - registro, no ticket, de exemplos reais de mensagens do Telegram e do resultado das três validações manuais herdadas.
- Nota de qualidade: o checklist de `docs/workflows/codex-quality-gates.md` foi aplicado na criação deste plano; a matriz de validação acima nasce diretamente dos closure criteria do ticket e não de checklist genérico.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - helpers de renderização do `/run_specs` em `src/integrations/telegram-bot.ts`;
  - possível contrato auxiliar entre renderer e `TelegramDeliveryService` para sinalizar fronteiras de seção ou utilizar delimitadores editoriais explícitos;
  - testes de Telegram em `src/integrations/telegram-bot.test.ts` e, se necessário, cenários compartilhados em `src/core/runner.test.ts`.
- Compatibilidade:
  - o fluxo sequencial de `/run_specs` permanece inalterado;
  - o contrato funcional de summaries entregue pelo ticket P0 permanece a fonte de dados canônica;
  - o caminho de entrega continua centralizado em `TelegramDeliveryService`;
  - o formato final continua compatível com texto simples no Telegram.
- Dependências externas e mocks:
  - os testes do Telegram continuam usando mocks locais de envio, sem rede real;
  - a validação manual depende de chat Telegram autorizado e de uma spec apta a produzir milestone + resumo final reais;
  - qualquer exemplo real coletado para o ticket deve ser tratado como evidência operacional, não como novo contrato parseável.
