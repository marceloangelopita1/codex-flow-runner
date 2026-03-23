# [SPEC] Arquitetura centralizada de entrega robusta de mensagens no Telegram

## Metadata
- Spec ID: 2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-03-23 13:36Z
- Last reviewed at (UTC): 2026-03-23 13:36Z
- Source: technical-evolution
- Related tickets:
  - Nenhum por enquanto.
- Related execplans:
  - Nenhum por enquanto.
- Related commits:
  - Nenhum por enquanto.
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

## Retrospectiva sistemica da derivacao dos tickets
- Executada: n/a
- Motivo de ativacao ou skip:
  - n/a
- Classificacao final:
  - n/a
- Confianca:
  - n/a
- Frente causal analisada:
  - n/a
- Achados sistemicos:
  - n/a
- Artefatos do workflow consultados:
  - n/a
- Elegibilidade de publicacao:
  - n/a
- Resultado do ticket transversal ou limitacao operacional:
  - n/a
- Nota de uso: esta spec ainda não passou por `/run_specs`; quando isso ocorrer, esta seção deve registrar a retrospectiva pre-`/run_all` como superfície distinta do gate funcional.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes obrigatorias ainda nao automatizadas:
  - Validar por testes automatizados cenários de retry, falha definitiva, chunking e preservação de `reply_markup`/`message_id` na nova camada central.
  - Validar por auditoria automatizada do código que os envios baseados em `sendMessage(...)` migrados deixaram de duplicar lógica de transporte.
- Validacoes manuais pendentes:
  - Exercitar em ambiente real um `/run_specs` com milestone seguido de `/run_all`, confirmando que o marco de triagem não se perde diante de falha transitória simulada.
  - Exercitar ao menos um fluxo conversacional (`/plan_spec`, `/discover_spec` ou `/codex_chat`) para confirmar que botões e mensagens continuam coerentes após a centralização.

## Status de atendimento (documento vivo)
- Estado geral: approved
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
- Pendencias em aberto:
  - Derivar ticket(s) de implementação a partir desta spec.
  - Definir o shape canônico das políticas de entrega e do retorno estruturado da nova camada.
  - Executar a migração gradual dos pontos atuais de envio para o componente central.
- Evidencias de validacao:
  - Auditoria manual em 2026-03-23 dos pontos de integração em `src/integrations/telegram-bot.ts`, `src/main.ts` e `src/core/runner.ts`.
  - Releitura da spec `docs/specs/2026-02-19-telegram-run-status-notification.md`, que já consolidou robustez forte para resumos finais e milestone de `/run_specs`.
  - Releitura dos contratos estruturados em `src/types/ticket-final-summary.ts` e `src/types/flow-timing.ts`.
  - Identificação de envios descentralizados em superfícies conversacionais, callbacks e mensagens auxiliares no `TelegramController`.

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
