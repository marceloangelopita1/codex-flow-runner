# [SPEC] Qualidade informacional e formato editorial das mensagens de `/run_specs` no Telegram

## Metadata
- Spec ID: 2026-03-23-qualidade-informacional-e-formato-editorial-das-mensagens-de-run-specs-no-telegram
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-23 16:09Z
- Last reviewed at (UTC): 2026-03-23 16:09Z
- Source: operational-gap
- Related tickets:
  - n/a
- Related execplans:
  - n/a
- Related commits:
  - n/a
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
- [ ] CA-01 - O marco de triagem de `/run_specs` passa a incluir snapshot funcional de `spec-ticket-validation` e, quando aplicável, de `spec-ticket-derivation-retrospective`, além de `Resultado`, `Fase final` e `Próxima ação`.
- [ ] CA-02 - Em cenário `NO_GO` ou falha técnica pre-`/run_all`, o marco de triagem continua mostrando o melhor contexto funcional já disponível das fases concluídas, sem depender apenas de um campo textual genérico de detalhes.
- [ ] CA-03 - O resumo final de `/run_specs` passa a seguir ordem editorial estável e distinguível entre visão geral, fases pre-`/run_all`, fases pós-`/run_all`, timings e resultado do `/run_all` encadeado.
- [ ] CA-04 - O resumo final passa a exibir resumo dedicado de `spec-triage`, `spec-close-and-version` e `spec-audit` quando essas fases ocorrerem, e não apenas seus nomes e tempos.
- [ ] CA-05 - O bloco de `spec-ticket-validation` deixa de repetir literalmente a mesma correção aplicada em histórico por ciclo e em agregados finais.
- [ ] CA-06 - O bloco de `spec-ticket-derivation-retrospective` deixa de usar rótulos ambíguos ou duplicados para resumos de camadas diferentes, distinguindo claramente execução da retrospectiva e análise sistêmica.
- [ ] CA-07 - Quando o resumo final incluir timings de triagem e do fluxo completo, ambos ficam com escopo claramente distinguível e não soam como duplicação editorial do mesmo bloco.
- [ ] CA-08 - Os testes automatizados de `src/integrations/telegram-bot.test.ts` e os testes correlatos do runner passam a cobrir sucesso, bloqueio por `NO_GO`, falha técnica de triagem, retrospectiva executada, retrospectiva pulada e mensagens longas chunkadas com asserts editoriais específicos.
- [ ] CA-09 - O caminho de envio das mensagens de `/run_specs` continua utilizando a camada robusta central de entrega do Telegram sem regressão em retry, chunking, logging ou estado observável de notificações críticas.
- [ ] CA-10 - Pela leitura isolada do Telegram, o operador passa a conseguir identificar com clareza: se o `/run_all` vai começar ou foi bloqueado, qual foi o resultado do gate, o que mudou entre ciclos de validação quando houver revalidação, se houve achado sistêmico na derivação e qual foi o resultado funcional da auditoria final.

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

## Retrospectiva sistemica da derivacao dos tickets
- Executada: n/a
- Motivo de ativação ou skip:
  - n/a
- Classificação final:
  - n/a
- Confiança:
  - n/a
- Frente causal analisada:
  - n/a
- Achados sistêmicos:
  - n/a
- Artefatos do workflow consultados:
  - n/a
- Elegibilidade de publicação:
  - n/a
- Resultado do ticket transversal ou limitação operacional:
  - n/a
- Nota de uso: quando esta spec vier de `/run_specs`, esta seção deve registrar a retrospectiva pre-`/run_all` como superfície distinta do gate funcional e continua canônica mesmo quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`. Com a flag desligada, a seção pode permanecer `n/a` e não recebe write-back automático. Se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e a execução ocorrer no próprio `codex-flow-runner`, write-back nesta seção é permitido. Em projeto externo, a fonte observável desta fase é trace/log/resumo, e não a spec do projeto alvo.
- Política anti-duplicação: a retrospectiva sistêmica pós-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto histórico, mas não deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - Nenhuma nesta etapa documental; a implementação futura deverá introduzir ou ajustar testes automatizados para cobertura editorial das mensagens de `/run_specs`.
- Validações manuais pendentes:
  - Revisar com exemplos reais de execução se o novo marco de triagem ficou informativo sem virar resumo final prematuro.
  - Validar em mensagens reais se a nova hierarquia visual permanece agradável quando o resumo final for chunkado em mais de uma parte.
  - Confirmar manualmente que operadores conseguem responder mais rápido às perguntas “o que aconteceu?”, “o que mudou?” e “o que faço agora?” usando apenas a mensagem do Telegram.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - O projeto já possui base robusta de entrega no Telegram, evitando que esta spec precise resolver confiabilidade de transporte.
  - O fluxo `/run_specs` já expõe dados estruturados ricos para `spec-ticket-validation` e para parte da `spec-ticket-derivation-retrospective`.
  - O diagnóstico já identificou com clareza os principais gaps desta superfície:
    - marco de triagem limitado por contrato e excessivamente centrado em timing;
    - ausência de resumos estruturados para `spec-triage`, `spec-close-and-version` e `spec-audit`;
    - duplicação de correções na renderização do gate;
    - sobreposição editorial na retrospectiva da derivação;
    - blocos de timing competindo entre si;
    - hierarquia visual fraca no resumo final.
- Pendências em aberto:
  - Derivar tickets para o enriquecimento contratual das fases hoje timing-only.
  - Derivar tickets para o redesign editorial do marco de triagem e do resumo final de `/run_specs`.
  - Ajustar testes automatizados para travar anti-duplicação, cobertura por fase e legibilidade mínima.
  - Executar auditoria final após implementação para confirmar se o ganho de densidade informacional não degradou escaneabilidade.
- Evidências de validação:
  - Análise direta das mensagens de exemplo do `/run_specs`, com identificação de lacunas em `spec-triage`, `spec-ticket-validation` e `spec-ticket-derivation-retrospective`.
  - Releitura de `docs/specs/2026-02-19-telegram-run-status-notification.md`, `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`, `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md` e `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`.
  - Inspeção de `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, `src/core/spec-ticket-validation.ts` e `src/types/flow-timing.ts`, confirmando que parte do problema é editorial e parte depende de enriquecer o contrato interno do summary.

## Auditoria final de entrega
- Auditoria executada em: n/a
- Resultado: n/a
- Tickets/follow-ups abertos a partir da auditoria:
  - n/a
- Causas-raiz sistêmicas identificadas:
  - n/a
- Ajustes genéricos promovidos ao workflow:
  - n/a

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
