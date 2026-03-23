# [SPEC] Arquitetura centralizada de entrega robusta de mensagens no Telegram

## Metadata
- Spec ID: 2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram
- Status: attended
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-23 13:36Z
- Last reviewed at (UTC): 2026-03-23 15:05Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md
  - tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md
  - tickets/closed/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md
- Related execplans:
  - execplans/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md
  - execplans/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md
- Related commits:
  - chore(specs): triage 2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md (este changeset)
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve: o projeto já possui sinais importantes de robustez no Telegram, mas eles estão descentralizados. Hoje `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)` concentram retry bounded, classificação de erro, backoff e falha estruturada, enquanto o milestone de `/run_specs` e diversas outras mensagens continuam em caminhos ad hoc com `sendMessage(...)` direto, sem a mesma política de entrega. Isso cria deriva arquitetural: cada nova mensagem ou alerta do Telegram corre o risco de reimplementar parcialmente a robustez, esquecer tratamento de erro ou adotar comportamento inconsistente.
- Resultado esperado: introduzir uma arquitetura centralizada de entrega de mensagens no Telegram, orientada por políticas de envio, de modo que toda nova superfície baseada em `sendMessage(...)` reutilize o mesmo núcleo de classificação de erro, retry bounded, chunking quando aplicável, logging e resultado estruturado, sem necessidade de persistência/outbox nesta iteração.
- Contexto funcional:
  - o runner já emite diversos eventos e mensagens para o Telegram em fluxos operacionais (`/run_all`, `/run_specs`, `/run_ticket`) e conversacionais (`/plan_spec`, `/discover_spec`, `/codex_chat`);
  - o `TelegramController` já é o ponto natural de integração com o bot e hoje acumula tanto composição editorial de mensagem quanto transporte;
  - o `runner` e o `main` já possuem seams úteis por meio de handlers/eventos, o que favorece a centralização do transporte sem redesenhar o domínio;
  - a auditoria manual de 2026-03-23 mostrou que a robustez mais forte está hoje concentrada apenas nos resumos finais, enquanto outros envios seguem frágeis ou best-effort sem contrato único.
- Restrições técnicas relevantes:
  - manter o fluxo sequencial do runner;
  - não introduzir persistência/outbox nesta evolução;
  - preservar Telegraf como biblioteca de integração;
  - evitar duplicação entre regras de transporte e regras editoriais da mensagem;
  - não exigir que toda mensagem use exatamente a mesma severidade/política de retry;
  - preservar as superfícies atuais de observabilidade crítica em `/status` para notificações finais.

## Jornada de uso
1. Uma nova necessidade operacional pede mais uma mensagem, alerta ou resumo no Telegram.
2. O desenvolvedor define o conteúdo da mensagem e escolhe a política de entrega adequada (`critical`, `milestone`, `interactive`, `best-effort` ou equivalente canônico).
3. Um componente central de entrega resolve chat de destino, classificação de erro, retry bounded, backoff, chunking e logging segundo a política escolhida.
4. O chamador recebe um resultado estruturado de entrega ou falha, sem precisar implementar transporte manualmente.
5. O operador recebe mensagens com comportamento consistente; quando houver falha relevante, logs e estado do runner permanecem acionáveis.

## Requisitos funcionais
- RF-01: o projeto deve introduzir um componente central de entrega de mensagens do Telegram, responsável por encapsular o transporte baseado em `sendMessage(...)`.
- RF-02: o componente central deve se tornar o único caminho canônico para novos envios de mensagens ao chat via `bot.telegram.sendMessage(...)`.
- RF-03: a arquitetura deve separar responsabilidade editorial da responsabilidade de transporte:
  - composição do texto e dos blocos continua podendo viver em helpers/controladores;
  - classificação de erro, retry, chunking, logging e decisão de política não podem continuar distribuídos entre métodos isolados.
- RF-04: o componente central deve suportar políticas de entrega distintas por tipo de mensagem, em vez de impor comportamento idêntico para toda saída.
- RF-05: a política canônica para notificações críticas deve manter retry bounded para falhas transitórias (`429`, `5xx` e erros de transporte retentáveis), com backoff limitado.
- RF-06: a política canônica para notificações críticas deve continuar produzindo resultado estruturado de entrega e falha, compatível com o estado observável do runner.
- RF-07: o milestone de triagem de `/run_specs` deve deixar de depender de envio ad hoc best-effort e passar a usar a camada central com política explícita.
- RF-08: mensagens conversacionais e operacionais não críticas (`/plan_spec`, `/discover_spec`, `/codex_chat`, mensagens auxiliares de callback, conteúdo de ticket aberto e equivalentes) também devem passar pela mesma camada central, ainda que com política mais leve que a dos resumos finais.
- RF-09: a camada central deve suportar envio simples e envio com `reply_markup`, preservando os fluxos que dependem de botões inline.
- RF-10: a camada central deve suportar retorno do `message_id` ou metadado equivalente quando isso for necessário para registrar contexto de callback após o envio.
- RF-11: a camada central deve suportar chunking configurável por política para mensagens potencialmente longas.
- RF-12: a implementação deve reaproveitar a lógica já existente de classificação de erro, retry e backoff onde ela já está madura, em vez de duplicá-la sob outro nome.
- RF-13: as notificações finais por ticket e por fluxo devem continuar registrando no estado do runner:
  - último evento efetivamente entregue;
  - última falha definitiva de notificação;
  - tentativas, classe de erro e destino quando aplicável.
- RF-14: a arquitetura deve permitir que novos tipos de mensagem do Telegram sejam adicionados escolhendo uma política e um formatter, sem copiar regras de retry/classificação/chunking para cada método novo.
- RF-15: a camada central deve produzir logging padronizado por envio, com contexto mínimo consistente: destino, política, tipo lógico da mensagem, tentativas, classe de erro, código de erro e resultado final quando aplicável.
- RF-16: a camada central não deve introduzir dependência de persistência local, fila durável ou reprocessamento após restart do processo nesta iteração.
- RF-17: a mudança não deve alterar o contrato funcional dos comandos e callbacks já expostos ao operador; a evolução é arquitetural e de confiabilidade, não de UX textual por si só.
- RF-18: a arquitetura deve manter compatibilidade com o padrão atual em que `main.ts` conecta handlers de domínio a uma integração Telegram, sem transferir lógica de negócio do runner para o componente de transporte.
- RF-19: a documentação do projeto deve passar a registrar explicitamente que novas mensagens Telegram devem usar a camada central e selecionar uma política de entrega, em vez de chamar o transporte bruto diretamente.
- RF-20: a arquitetura deve deixar explícito que `answerCbQuery(...)` e `editMessageText(...)` não precisam necessariamente entrar na mesma abstração nesta primeira evolução, desde que os envios baseados em `sendMessage(...)` fiquem centralizados e o limite de escopo esteja documentado.

## Assumptions and defaults
- O `TelegramController` permanece como fronteira de integração com Telegraf e pode continuar responsável por registrar comandos, callbacks e helpers editoriais.
- A centralização proposta é prioritariamente para envios baseados em `sendMessage(...)`, que hoje já representam a maior superfície de mensagens e alertas do bot.
- A iteração atual não exige outbox persistente, replay após restart ou garantias de exactly-once.
- Nem toda mensagem deve ter a mesma agressividade de retry:
  - resumos finais e marcos operacionais importantes tendem a exigir política mais robusta;
  - mensagens interativas ou auxiliares podem usar política mais leve;
  - mas a escolha da política precisa ser centralizada e declarativa.
- O núcleo de classificação de erro e backoff já existente para resumos finais é a melhor base inicial para generalização.
- A superfície observável de `/status` deve continuar privilegiando notificações críticas, sem exigir que toda mensagem auxiliar seja persistida no estado do runner.
- O destino de notificação (`notificationChatId`) continua podendo ser resolvido pelo `TelegramController`; o que muda é a padronização do envio após essa resolução.

## Nao-escopo
- Implementar outbox persistente, fila durável ou replay após crash/restart.
- Introduzir garantia formal de exactly-once delivery.
- Criar sistema multicanal fora do Telegram.
- Reescrever todas as mensagens do bot em termos editoriais.
- Mudar os contratos atuais de autenticação, chat autorizado ou seleção de projeto.
- Forçar `answerCbQuery(...)` e `editMessageText(...)` a entrarem na primeira versão da abstração, desde que o escopo fique explicitado.
- Alterar a semântica funcional do runner para privilegiar notificação em detrimento da execução sequencial.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - Existe um componente central e nomeado de entrega Telegram, reutilizado pelos envios baseados em `sendMessage(...)`.
- [ ] CA-02 - `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)` passam a delegar o transporte ao componente central, preservando retry bounded, chunking e falha estruturada.
- [ ] CA-03 - O milestone de triagem de `/run_specs` passa a usar a camada central com política explícita, deixando de ser um envio ad hoc sem retry.
- [ ] CA-04 - Pelo menos os envios de `/plan_spec`, `/discover_spec` e `/codex_chat` passam a usar o mesmo componente central para transporte de mensagens no chat.
- [ ] CA-05 - Fluxos que dependem de `reply_markup` e `message_id` continuam funcionando após a centralização.
- [ ] CA-06 - A política de chunking continua disponível para mensagens longas e deixa de ficar limitada aos resumos finais.
- [ ] CA-07 - `/status` continua refletindo corretamente o último sucesso e a última falha definitiva de notificações críticas.
- [ ] CA-08 - Uma auditoria por `rg` no código mostra que novos envios de mensagem não ficam espalhados em múltiplos caminhos brutos fora da camada central, excetuando pontos explicitamente justificados no escopo.
- [ ] CA-09 - Simulações de falha transitória e falha definitiva seguem produzindo logs e metadados acionáveis por política.
- [ ] CA-10 - A documentação do projeto passa a orientar explicitamente futuras mensagens Telegram a usar a camada central, em vez de chamar `sendMessage(...)` diretamente.
- [ ] CA-11 - A evolução não introduz persistência/outbox nem dependência de storage adicional para entrega.
- [ ] CA-12 - O comportamento textual e funcional dos comandos existentes permanece equivalente do ponto de vista do operador, salvo melhorias de robustez e consistência.

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
- Executada em (UTC): 2026-03-23T13:55:12.949Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: O pacote derivado agora cobre o backlog inteiro da spec sem gaps objetivos de cobertura, heranca ou fechamento observavel; os Closure criteria passaram a explicitar o logging padronizado exigido pela camada central e a ambiguidade de ownership do guardrail de `sendMessage(...)` bruto foi removida.
- Ciclos executados: 1
- Thread da validacao: 019d1af6-b9db-78a2-a2c1-c2d303d4806a
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/closed/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md [fonte=source-spec]
  - tickets/closed/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md [fonte=source-spec]
  - tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: NO_GO (high)
  - Resumo: O pacote cobre o escopo macro da spec, mas ainda tem ambiguidade objetiva de ownership no guardrail de CA-08 e nao torna observavel nos Closure criteria o logging padronizado herdado da camada central para os tickets que implementam e expandem essa arquitetura.
  - Thread: 019d1af6-b9db-78a2-a2c1-c2d303d4806a
  - Fingerprints abertos: closure-criteria-gap|tickets/closed/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md&tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md|ca-09&rf-15, duplication-gap|tickets/closed/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md&tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md|ca-08&rf-19
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0
- Ciclo 1 [revalidation]: GO (high)
  - Resumo: O pacote derivado agora cobre o backlog inteiro da spec sem gaps objetivos de cobertura, heranca ou fechamento observavel; os Closure criteria passaram a explicitar o logging padronizado exigido pela camada central e a ambiguidade de ownership do guardrail de `sendMessage(...)` bruto foi removida.
  - Thread: 019d1af6-b9db-78a2-a2c1-c2d303d4806a
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: sim
  - Correcoes deste ciclo: 2
    - Explicitei nos tickets de implementacao a evidencia observavel de logging padronizado por envio, com os campos minimos exigidos pela spec, nos Closure criteria dos fluxos criticos e conversacionais/auxiliares. [applied]
    - Removi do ticket de migracao a ownership de CA-08/guardrail automatizado contra sendMessage bruto e deixei explicito que essa frente permanece no ticket documental dedicado, eliminando a ambiguidade de escopo. [applied]

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Explicitei nos tickets de implementacao a evidencia observavel de logging padronizado por envio, com os campos minimos exigidos pela spec, nos Closure criteria dos fluxos criticos e conversacionais/auxiliares.
  - Artefatos afetados: tickets/closed/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md, tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied
- Removi do ticket de migracao a ownership de CA-08/guardrail automatizado contra sendMessage bruto e deixei explicito que essa frente permanece no ticket documental dedicado, eliminando a ambiguidade de escopo.
  - Artefatos afetados: tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md
  - Gaps relacionados: duplication-gap
  - Resultado: applied

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim
- Motivo de ativacao ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificacao final: not-systemic
- Confianca: high
- Frente causal analisada: A menor causa plausivel e lapidacao normal da primeira derivacao de tickets em spec-triage; os prompts, contratos e o gate ja cobriam heranca relevante, closure criteria observaveis e deteccao de duplicacao no pacote.
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
  - src/core/spec-ticket-validation.ts
  - tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
- Elegibilidade de publicacao: nao
- Resultado do ticket transversal ou limitacao operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Nenhuma no recorte de centralizacao de `sendMessage(...)`: a preservacao de `reply_markup`/`message_id`, a migracao dos fluxos conversacionais/auxiliares e a auditoria contra duplicacao de transporte passaram a ter cobertura automatizada nesta etapa.
- Validacoes manuais pendentes:
  - Exercitar em ambiente real um `/run_specs` com milestone seguido de `/run_all`, confirmando que o marco de triagem não se perde diante de falha transitória simulada.
  - Exercitar ao menos um fluxo conversacional (`/plan_spec`, `/discover_spec` ou `/codex_chat`) para confirmar que botões e mensagens continuam coerentes após a centralização.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Resultado da triagem final: a derivacao foi revalidada em 2026-03-23T13:55:12.949Z com veredito `GO`, sem gaps pendentes no pacote documental; por isso a spec foi promovida para `Status: attended`, mantendo `Spec treatment: pending` ate o fechamento dos tickets derivados.
- Itens atendidos:
  - A necessidade arquitetural foi consolidada como evolução explícita do projeto, com foco em eliminar a duplicação de regras de transporte do Telegram.
  - A spec já identifica o que existe hoje e está descentralizado:
    - robustez forte nos resumos finais por ticket e por fluxo;
    - milestone de `/run_specs` ainda frágil;
    - múltiplos envios diretos espalhados em mensagens conversacionais, auxiliares e de callback.
  - O documento já propõe um caminho arquitetural claro:
    - manter composição editorial nos pontos atuais;
    - centralizar transporte em componente único orientado por política;
    - preservar observabilidade crítica em `/status`;
    - não introduzir outbox persistente nesta iteração.
  - O limite de escopo inicial também ficou explícito: priorizar `sendMessage(...)`, sem obrigar a mesma abstração para `answerCbQuery(...)` e `editMessageText(...)` logo na primeira entrega.
  - A triagem documental foi concluída sem gaps pendentes:
    - os três tickets derivados cobrem de forma complementar a fundação crítica da camada central, a migração dos envios conversacionais/auxiliares e a documentação com guardrail contra `sendMessage(...)` bruto;
    - a revalidação registrou `GO` com confiança alta e sem fingerprints abertos.
- Itens parcialmente atendidos:
  - A fundação crítica da camada central já existe em `src/integrations/telegram-delivery.ts` e passou a atender `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)` com política declarativa, retry bounded, classificação de erro, backoff, chunking configurável e logging padronizado por envio; o ticket `tickets/closed/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md` foi fechado com `GO`, restando apenas validação manual externa do milestone em ambiente real.
  - Os fluxos `/plan_spec`, `/discover_spec`, `/codex_chat`, leitura de ticket aberto, CTA de implementação e callbacks auxiliares agora delegam ao `TelegramDeliveryService`, com políticas leves explícitas, preservação de `reply_markup`, retorno estruturado de `message_id` e cobertura automatizada dedicada; a spec permanece com `Spec treatment: pending` porque ainda restam validações manuais externas antes da auditoria final.
  - O projeto agora registra no `README.md` a regra canônica de que novas mensagens Telegram baseadas em `sendMessage(...)` devem usar `TelegramDeliveryService`, escolher política explícita e manter `answerCbQuery(...)`/`editMessageText(...)` fora do núcleo inicial desta evolução; o ticket documental/guardrail foi fechado com `GO`, e a spec segue pendente apenas pelos smokes manuais externos e pela auditoria final do fluxo.
- Pendencias em aberto:
  - Nao ha gaps pendentes de triagem nem tickets derivados abertos desta spec; permanecem apenas pendencias operacionais externas antes da auditoria final:
  - A validacao manual em ambiente real do milestone de `/run_specs` com falha transitoria simulada ainda permanece pendente para fechamento operacional do ticket critico.
  - A validacao manual em ambiente real de ao menos um fluxo entre `/plan_spec`, `/discover_spec` ou `/codex_chat` ainda permanece pendente como smoke operacional externo da migracao conversacional/auxiliar, apesar do ticket tecnico correspondente ter sido fechado com `GO`.
- Evidencias de validacao:
  - Validacao final da triagem registrada em 2026-03-23T13:55:12.949Z com veredito `GO`, confianca `high` e nenhum gap pendente.
  - Auditoria manual em 2026-03-23 dos pontos de integração em `src/integrations/telegram-bot.ts`, `src/main.ts` e `src/core/runner.ts`.
  - Releitura da spec `docs/specs/2026-02-19-telegram-run-status-notification.md`, que já consolidou robustez forte para resumos finais e milestone de `/run_specs`.
  - Releitura dos contratos estruturados em `src/types/ticket-final-summary.ts` e `src/types/flow-timing.ts`.
  - Identificação de envios descentralizados em superfícies conversacionais, callbacks e mensagens auxiliares no `TelegramController`.
  - Implementação da camada central crítica em `src/integrations/telegram-delivery.ts`, com delegação dos três envios críticos a partir de `src/integrations/telegram-bot.ts`.
  - Implementação da segunda etapa em 2026-03-23 com extensão de `src/integrations/telegram-delivery.ts` para `primaryMessageId/messages`, políticas leves e formatação centralizada de chunk, além da migração dos fluxos conversacionais/auxiliares em `src/integrations/telegram-bot.ts`.
  - Validação automatizada em 2026-03-23 por `npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts` cobrindo `reply_markup`, `message_id`, logging padronizado, políticas leves, callbacks auxiliares e chunking de `tickets_open`.
  - Auditoria automatizada em 2026-03-23 por `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`, restando apenas o adaptador interno da camada central.
  - Implementação em 2026-03-23 da documentação canônica no `README.md` para novas mensagens Telegram, com referência explícita a `TelegramDeliveryService`, escolha de política de entrega e limite inicial de escopo para `answerCbQuery(...)`/`editMessageText(...)`.
  - Validação automatizada em 2026-03-23 por `npx tsx --test src/integrations/telegram-sendmessage-guardrail.test.ts`, codificando o allowlist explícito do único uso bruto permitido de `bot.telegram.sendMessage(...)`.
  - Validação automatizada em 2026-03-23 por `npx tsx --test src/integrations/telegram-bot.test.ts` cobrindo sucesso, retry, falha definitiva, chunking, logging padronizado e milestone robusto de `/run_specs`.
  - Validação automatizada em 2026-03-23 por `npx tsx --test src/core/runner.test.ts src/integrations/telegram-bot.test.ts` confirmando preservação de `/status` e dos contratos de notificação do runner.
  - Regressão completa validada em 2026-03-23 por `npm test`, `npm run check` e `npm run build`.

## Auditoria final de entrega
- Auditoria executada em: n/a
- Resultado: n/a
- Tickets/follow-ups abertos a partir da auditoria:
  - n/a
- Causas-raiz sistemicas identificadas:
  - n/a
- Ajustes genericos promovidos ao workflow:
  - n/a

## Riscos e impacto
- Risco funcional: sem centralização, novos envios podem continuar nascendo com tratamentos de erro divergentes, causando perda silenciosa de mensagens operacionais importantes.
- Risco operacional: um desenho excessivamente genérico pode tornar a integração Telegram mais difícil de evoluir do que hoje, especialmente em fluxos interativos com `reply_markup`.
- Mitigacao:
  - centralizar transporte sem centralizar indevidamente a lógica de negócio;
  - adotar políticas explícitas por tipo de mensagem, em vez de um comportamento único para tudo;
  - migrar por etapas, começando pelos pontos já críticos e mais frágeis;
  - manter testes focados em transporte, não apenas em conteúdo textual.
- Risco residual conhecido: mesmo após a centralização, continuará existindo a ambiguidade rara de entrega em cenários extremos de timeout de transporte sem outbox persistente, o que fica explicitamente fora do escopo desta spec.

## Decisoes e trade-offs
- 2026-03-23 - Centralizar o transporte, não a regra de negócio das mensagens - reduz duplicação sem forçar o runner a conhecer detalhes operacionais do Telegram.
- 2026-03-23 - Adotar políticas de entrega por classe de mensagem - evita tanto a fragilidade de envios best-effort quanto o custo indevido de aplicar retry forte em toda saída.
- 2026-03-23 - Reaproveitar a lógica madura já existente nos resumos finais - acelera a evolução e reduz risco de regressão.
- 2026-03-23 - Não incluir outbox persistente nesta iteração - mantém o escopo compatível com a necessidade atual e evita superprojeto.
- 2026-03-23 - Tratar `answerCbQuery(...)` e `editMessageText(...)` como fora do núcleo inicial - concentra o primeiro ganho onde o problema hoje é mais frequente: mensagens enviadas ao chat por `sendMessage(...)`.

## Historico de atualizacao
- 2026-03-23 13:36Z - Versão inicial da spec criada com `Status: approved` e `Spec treatment: pending`, consolidando a necessidade de uma arquitetura centralizada e orientada por políticas para entrega robusta de mensagens no Telegram, sem criação de ticket nesta etapa.
- 2026-03-23 13:43Z - Triagem da spec concluída com derivação de três tickets em `tickets/open/`, atualização de `Related tickets`, `Last reviewed at (UTC)` e pendências objetivas do `Status de atendimento`, mantendo `Status: approved`.
- 2026-03-23 14:00Z - Validacao final da triagem consolidada com veredito `GO` e nenhum gap pendente no pacote derivado; a spec foi promovida para `Status: attended`, manteve `Spec treatment: pending` por causa dos tickets abertos e teve as evidencias/documentacao de fechamento revisadas para o commit de triagem.
- 2026-03-23 14:25Z - Ticket critico da fundacao da camada central fechado em `tickets/closed/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md` com veredito `GO`; a spec permaneceu com `Spec treatment: pending` porque ainda restam os tickets de migracao conversacional/auxiliar, documentacao/guardrail e a validacao manual externa do milestone.
- 2026-03-23 14:43Z - Ticket de migracao conversacional/auxiliar implementado em codigo com extensao de `TelegramDeliveryService`, migracao dos call sites de `src/integrations/telegram-bot.ts`, novo `src/integrations/telegram-delivery.test.ts` e revalidacao automatizada; a spec permaneceu com `Spec treatment: pending` por causa do smoke manual real e do ticket documental/guardrail ainda aberto.
- 2026-03-23 14:48Z - Ticket `tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md` fechado com `GO` apos releitura final, auditoria de codigo, recorte automatizado (`152/152`) e regressao complementar (`npm test`, `npm run check`, `npm run build`); a spec permaneceu com `Spec treatment: pending` porque ainda restam o smoke manual externo e o ticket documental/guardrail.
- 2026-03-23 14:58Z - A etapa de execução do ticket documental/guardrail adicionou a regra canônica no `README.md`, versionou o teste `src/integrations/telegram-sendmessage-guardrail.test.ts` e atualizou as evidências vivas da spec; `Spec treatment` permaneceu `pending` porque esta etapa não fecha ticket e ainda restam validações manuais externas.
- 2026-03-23 15:05Z - Ticket `tickets/closed/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md` fechado com `GO` após releitura final do diff, do ExecPlan, da spec, de `DOCUMENTATION.md`, dos quality gates e das validações automatizadas (`1/1` no guardrail isolado; `153/153` na regressão complementar); `Spec treatment` permaneceu `pending` porque os smokes manuais externos e a auditoria final da spec ainda não ocorreram.
