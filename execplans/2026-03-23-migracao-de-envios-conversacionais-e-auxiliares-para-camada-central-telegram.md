# ExecPlan - Migracao de envios conversacionais e auxiliares para camada central Telegram

## Purpose / Big Picture
- Objetivo: concluir a segunda etapa da spec `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`, migrando os envios conversacionais e auxiliares ainda baseados em `bot.telegram.sendMessage(...)` bruto para a camada central ja introduzida em `src/integrations/telegram-delivery.ts`.
- Resultado esperado:
  - `/plan_spec`, `/discover_spec` e `/codex_chat` deixam de escolher transporte localmente e passam a delegar o envio ao componente central com politicas explicitas;
  - a camada central passa a aceitar `reply_markup` e devolver `message_id` ou metadado equivalente sem quebrar o contrato usado hoje pelos envios criticos;
  - leitura de ticket aberto, CTA de implementacao e mensagens auxiliares de callback deixam de duplicar chunking, tratamento de erro e logging ad hoc dentro de `TelegramController`;
  - a cobertura automatizada prova preservacao de `reply_markup`, captura de `message_id`, logging padronizado, politicas leves e equivalencia funcional do ponto de vista do operador;
  - `answerCbQuery(...)` e `editMessageText(...)` continuam fora do nucleo inicial, com o limite de escopo mantido explicito.
- Escopo:
  - evoluir `TelegramDeliveryService` para atender envios leves/interativos;
  - migrar os metodos conversacionais listados no ticket;
  - migrar `sendTicketOpenContent(...)`, `sendImplementSelectedTicketAction(...)` e os helpers `send*CallbackChatMessage(...)`;
  - ampliar testes de integracao/controlador e, se necessario, cobertura focada do servico de entrega.
- Fora de escopo:
  - guardrail documental/automatizado global contra novos `sendMessage(...)` brutos; isso pertence ao ticket `tickets/open/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md`;
  - mover `ctx.reply(...)`, `answerCbQuery(...)` ou `editMessageText(...)` para a camada central nesta rodada;
  - alterar UX textual dos comandos, callbacks ou blocos editoriais alem do necessario para preservar comportamento;
  - introduzir outbox, persistencia local, fila duravel ou reprocessamento apos restart;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-23 14:31Z - Planejamento inicial concluido com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `INTERNAL_TICKETS.md` e das superficies tecnicas citadas em `src/integrations/telegram-bot.ts`.
- [x] 2026-03-23 14:43Z - Contrato da camada central ampliado em `src/integrations/telegram-delivery.ts` com politicas leves explicitas, retorno estruturado de `primaryMessageId/messages` e suporte a formatacao centralizada de chunk sem quebrar os envios criticos ja migrados.
- [x] 2026-03-23 14:43Z - Fluxos `/plan_spec`, `/discover_spec`, `/codex_chat`, leitura de ticket aberto, CTA de implementacao e callbacks auxiliares migrados em `src/integrations/telegram-bot.ts` para a camada central com politicas explicitas, preservando `reply_markup`, `message_id` e o limite de escopo fora de `answerCbQuery(...)`/`editMessageText(...)`.
- [x] 2026-03-23 14:43Z - Cobertura automatizada e auditoria de codigo concluidas com `src/integrations/telegram-bot.test.ts`, novo `src/integrations/telegram-delivery.test.ts` e auditoria por `rg` contra `bot.telegram.sendMessage(...)` fora da camada central.
- [x] 2026-03-23 14:48Z - Validacao final automatizada concluida com `npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts`, `npm test`, `npm run check` e `npm run build`; veredito tecnico `GO` com apenas validacao manual externa pendente.
- [ ] YYYY-MM-DD HH:MMZ - Validacao manual em ambiente real de ao menos um fluxo conversacional com botoes e callback concluida.

## Surprises & Discoveries
- 2026-03-23 14:31Z - A camada central critica ja aceita `extra`, mas seu resultado ainda retorna apenas metadados agregados de entrega; o gap real para este ticket e expor `message_id`/metadado util sem perder compatibilidade com `sendTicketFinalSummary(...)` e `sendRunFlowSummary(...)`.
- 2026-03-23 14:31Z - Os metodos `sendDiscoverSpecQuestion(...)`, `sendDiscoverSpecFinalization(...)`, `sendPlanSpecQuestion(...)` e `sendPlanSpecFinalization(...)` dependem de `resolveOutgoingMessageId(...)` logo apos o envio; a migracao precisa preservar isso de forma centralizada, nao apenas trocar a chamada de transporte.
- 2026-03-23 14:31Z - `sendTicketOpenContent(...)` ainda faz chunking proprio e `send*CallbackChatMessage(...)` replicam o mesmo padrao de `try/catch` com warning por fluxo; ambos sao bons candidatos para consolidacao por politica na camada central.
- 2026-03-23 14:31Z - O codigo ja deixa claro o limite de escopo da spec: `answerCbQuery(...)` e `editMessageText(...)` continuam essenciais para callbacks, mas nao precisam entrar no mesmo servico nesta iteracao.
- 2026-03-23 14:43Z - Nao existia `src/integrations/telegram-delivery.test.ts`; a cobertura anterior validava a camada central apenas via `telegram-bot.test.ts`, entao foi seguro adicionar um teste unitario dedicado do servico para provar `message_id`, logging e formatacao centralizada de chunk.

## Decision Log
- 2026-03-23 - Decisao: estender o `TelegramDeliveryService` existente em vez de criar um segundo helper paralelo para mensagens interativas.
  - Motivo: RF-02 e RF-14 pedem um caminho canonico unico para novos envios baseados em `sendMessage(...)`.
  - Impacto: o codigo continua com uma unica fronteira de transporte e evita criar duas taxonomias de politica/logging.
- 2026-03-23 - Decisao: introduzir politicas leves explicitas por familia de mensagem, em vez de reaproveitar a politica critica dos resumos finais para tudo.
  - Motivo: a spec exige centralizacao sem impor a mesma agressividade de retry a todas as mensagens.
  - Impacto: callbacks, mensagens interativas e leitura de ticket podem ter retry/logging adequados ao risco sem mascarar o tipo logico da mensagem.
- 2026-03-23 - Decisao: preservar `TelegramController` como responsavel pela composicao editorial e pela resolucao do destino, deixando a camada central focada em transporte declarativo e reutilizavel.
  - Motivo: RF-03, RF-17 e RF-18 pedem separacao entre editorial e transporte sem mover regra de negocio do runner.
  - Impacto: o churn esperado fica restrito a `src/integrations` e testes, sem redesenho de `src/core`.
- 2026-03-23 - Decisao: manter `answerCbQuery(...)` e `editMessageText(...)` fora do servico de entrega nesta rodada.
  - Motivo: RF-20 e o proprio ticket explicitam esse limite de escopo.
  - Impacto: a auditoria final deve aceitar esses pontos como excecoes justificadas, desde que os envios baseados em `sendMessage(...)` dos fluxos alvo tenham sido centralizados.
- 2026-03-23 - Decisao: suportar header editorial por chunk via `formatChunk` no proprio servico, em vez de manter `chunkTicketContent(...)` no controller.
  - Motivo: o ticket pede centralizacao do transporte/chunking sem perder o texto observavel de `tickets_open`.
  - Impacto: `sendTicketOpenContent(...)` delega completamente o loop de envio ao servico, mas o controller ainda define o texto editorial por chunk.

## Outcomes & Retrospective
- Status final: implementacao concluida, validacao automatizada/regressao complementar verdes e veredito tecnico `GO`; validacao manual real ainda pendente.
- O que funcionou:
  - o ticket ja traz o subconjunto de RFs/CAs, restricoes, assumptions/defaults e validacoes manuais relevantes;
  - a spec e o ticket irmao critico deixam claro que a base robusta ja existe e que este trabalho e expansao, nao reinicio.
  - a extensao retrocompativel de `TelegramDeliveryResult` permitiu migrar `message_id` dos fluxos interativos sem reabrir os contratos dos envios criticos.
- O que ficou pendente:
  - validacao manual em chat real autorizado de ao menos um fluxo entre `/plan_spec`, `/discover_spec` ou `/codex_chat`.
- Proximos passos:
  - executar o smoke manual do fluxo conversacional com botao inline e callback;
  - versionar o mesmo changeset de fechamento pelo runner apos o handoff desta etapa.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md`
  - `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `INTERNAL_TICKETS.md`
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/telegram-delivery.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `execplans/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md`
- Spec de origem: `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- RFs/CAs cobertos por este plano:
  - RF-02, RF-08, RF-09, RF-10, RF-14, RF-15, RF-17, RF-20
  - CA-04, CA-05, CA-09, CA-12
- RNFs e restricoes herdados que precisam ficar observaveis neste ticket:
  - comportamento consistente entre mensagens operacionais e conversacionais;
  - logging padronizado por envio com destino, politica, tipo logico, tentativas, classe/codigo de erro e resultado final quando aplicavel;
  - preservar contratos funcionais ja expostos ao operador;
  - evitar duplicacao entre transporte e regras editoriais;
  - nao exigir a mesma politica para toda mensagem;
  - manter `answerCbQuery(...)` e `editMessageText(...)` fora do nucleo inicial quando justificado;
  - preservar o fluxo sequencial do runner.
- Assumptions / defaults adotados:
  - `TelegramController` continua montando texto, teclado inline e contexto de callback; a camada central recebe esses dados de forma declarativa;
  - a extensao do servico deve ser retrocompativel para os envios criticos ja migrados, preferindo adicionar metadados ao resultado em vez de quebrar os campos existentes;
  - callbacks auxiliares podem usar politica leve com retry limitado ou best-effort explicitamente nomeado, mas ainda com logging padronizado;
  - leitura de ticket aberto deve preservar chunking observavel para o operador, mesmo que o header/chunking passe a ser produzido pelo servico central;
  - a auditoria de codigo deve aceitar como remanescentes apenas o adaptador `sendMessage` dentro da propria camada central e os pontos fora do escopo declarados.
- Validacoes pendentes/manuais herdadas da spec relevantes para este ticket:
  - automatizar cenarios de preservacao de `reply_markup` e `message_id`;
  - auditar por codigo que os envios migrados deixaram de duplicar logica de transporte;
  - validar manualmente ao menos um fluxo conversacional (`/plan_spec`, `/discover_spec` ou `/codex_chat`) com botoes e mensagens coerentes apos a migracao.
- Fluxo atual resumido:
  - `sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)` e `sendRunSpecsTriageMilestone(...)` ja usam `TelegramDeliveryService`;
  - `sendDiscoverSpec*`, `sendPlanSpec*`, `sendCodexChat*`, `sendTicketOpenContent(...)`, `sendImplementSelectedTicketAction(...)` e `send*CallbackChatMessage(...)` agora delegam ao mesmo servico central com politicas explicitas para interactive/callback/ticket-open-content;
  - o registro de callback contexts dos fluxos interativos passou a usar `primaryMessageId` retornado pelo servico central, eliminando a dependencia de `resolveOutgoingMessageId(...)` fora da camada central.
- Restricoes tecnicas:
  - manter integracao com Telegraf;
  - evitar churn desnecessario em `src/core`;
  - nao mover este ticket para a frente de documentacao/guardrail.

## Plan of Work
- Milestone 1: ampliar o contrato do transporte central para cobrir envios leves e interativos.
  - Entregavel: `TelegramDeliveryService` suporta politicas leves, recebe `extra` com `reply_markup` e retorna metadados de mensagens enviados sem quebrar os chamadores criticos existentes.
  - Evidencia de conclusao: testes focados do servico/controlador provam passthrough de `reply_markup`, retorno de `message_id` e logging padronizado por politica.
  - Arquivos esperados:
    - `src/integrations/telegram-delivery.ts`
    - `src/integrations/telegram-delivery.test.ts` ou expansao equivalente em `src/integrations/telegram-bot.test.ts`
- Milestone 2: migrar os fluxos conversacionais centrais e preservar callbacks.
  - Entregavel: `/discover_spec`, `/plan_spec` e `/codex_chat` deixam de usar transporte bruto e continuam registrando/consumindo callback context com `message_id` coerente.
  - Evidencia de conclusao: testes de pergunta, finalizacao, raw output, falha interativa e resposta de `/codex_chat` seguem verdes, com verificacao explicita de delegacao central.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`
- Milestone 3: migrar superficies auxiliares e fechar a auditoria de codigo do ticket.
  - Entregavel: leitura de ticket aberto, CTA de implementacao e mensagens auxiliares de callback passam a usar a camada central com politicas explicitas e warnings/logging padronizados.
  - Evidencia de conclusao: auditoria por `rg` e testes mostram que os fluxos alvo nao mantem transporte ad hoc e que a UX textual permanece equivalente para o operador.
  - Arquivos esperados:
    - `src/integrations/telegram-bot.ts`
    - `src/integrations/telegram-bot.test.ts`

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts` para estabelecer a baseline dos envios brutos ainda presentes e confirmar o recorte do ticket antes da edicao.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-delivery.ts` para:
   - aceitar politicas leves declarativas para mensagens interativas/auxiliares;
   - retornar `message_id` ou metadado equivalente por envio/chunk;
   - manter os campos agregados ja consumidos pelos envios criticos;
   - continuar recebendo `extra` para `reply_markup` sem perda de tipagem/compatibilidade.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar ou atualizar cobertura focada do servico em `src/integrations/telegram-delivery.test.ts` (ou, se o recorte final ficar menor, em `src/integrations/telegram-bot.test.ts`) para provar:
   - passthrough de `reply_markup`;
   - retorno de `message_id`;
   - logging padronizado em sucesso, retry e falha definitiva;
   - chunking com metadados coerentes quando a politica o habilitar.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar em `src/integrations/telegram-bot.ts` os metodos `sendDiscoverSpecOutput(...)`, `sendDiscoverSpecFailure(...)`, `sendDiscoverSpecMessage(...)`, `sendDiscoverSpecQuestion(...)` e `sendDiscoverSpecFinalization(...)` para delegarem ao servico central, preservando `reply_markup`, `message_id` e registro de callback context.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar em `src/integrations/telegram-bot.ts` os metodos `sendPlanSpecQuestion(...)`, `sendPlanSpecFinalization(...)`, `sendPlanSpecRawOutput(...)`, `sendPlanSpecFailure(...)` e `sendPlanSpecMessage(...)` com o mesmo contrato central e sem alterar a renderizacao textual dos blocos.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar em `src/integrations/telegram-bot.ts` os metodos `sendCodexChatOutput(...)`, `sendCodexChatFailure(...)` e `sendCodexChatMessage(...)` para a camada central, mantendo o botao inline de encerramento manual e o comportamento da sessao.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Refatorar em `src/integrations/telegram-bot.ts` `sendTicketOpenContent(...)`, `sendImplementSelectedTicketAction(...)`, `sendSpecsCallbackChatMessage(...)`, `sendTicketsOpenCallbackChatMessage(...)`, `sendPlanSpecCallbackChatMessage(...)`, `sendTicketRunCallbackChatMessage(...)` e `sendCodexChatCallbackChatMessage(...)` para usar politicas explicitas da camada central, consolidando chunking/logging/warnings.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `resolveOutgoingMessageId(...)` e/ou os call sites que registram callback contexts para consumirem o novo resultado estruturado do servico, sem depender diretamente do retorno bruto do Telegraf fora da camada central.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/integrations/telegram-bot.test.ts` com cenarios que comprovem:
   - preservacao de teclados inline em `/discover_spec`, `/plan_spec` e `/codex_chat`;
   - captura de `message_id` usada pelos callbacks apos a migracao;
   - logging padronizado e warnings corretos nos helpers auxiliares;
   - equivalencia funcional das mensagens enviadas ao operador.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts` para validar o recorte principal do ticket.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts` e `git diff -- src/integrations/telegram-delivery.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts src/integrations/telegram-delivery.test.ts` para auditar que os fluxos alvo delegam ao servico central e que o diff ficou restrito ao layer de integracao/testes.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`, `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` e `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` como regressao complementar apos o recorte especifico ficar verde.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar manualmente, em chat real autorizado, pelo menos um fluxo entre `/plan_spec`, `/discover_spec` ou `/codex_chat` com botoes inline e callback associado, confirmando visualmente coerencia de mensagem, teclado, callback e ausencia de regressao textual apos a migracao.

## Validation and Acceptance
- Nota de qualidade: a matriz abaixo nasce diretamente dos closure criteria do ticket e dos itens herdados da spec que ele explicitamente carrega; o checklist generico foi usado apenas para garantir completude do handoff.
- Matriz requisito -> validacao observavel:
  - Requisito: RF-02, RF-08, CA-04
    - Evidencia observavel: `/plan_spec`, `/discover_spec` e `/codex_chat` passam a usar a camada central para transporte das mensagens enviadas ao chat.
    - Comando: `rg -n "sendDiscoverSpec|sendPlanSpec|sendCodexChat|deliverTextMessage|bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
    - Esperado: os metodos desses tres fluxos delegam para o servico central; `sendMessage(...)` bruto nao permanece nesses call sites.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes desses fluxos continuam verdes apos a migracao, sem perda de comportamento observavel.
  - Requisito: RF-09, RF-10, CA-05
    - Evidencia observavel: a camada central aceita `reply_markup` e retorna `message_id` ou metadado equivalente; os fluxos que dependem disso continuam cobertos por testes automatizados.
    - Comando: `rg -n "reply_markup|message_id|messageId|resolveOutgoingMessageId|deliverTextMessage" src/integrations/telegram-delivery.ts src/integrations/telegram-bot.ts`
    - Esperado: o contrato central expõe metadado suficiente para callback context e os metodos interativos nao dependem mais do retorno bruto fora da camada central.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: assercoes de teclado inline e registro de callback seguem verdes para `/discover_spec`, `/plan_spec` e `/codex_chat`.
  - Requisito: RF-14
    - Evidencia observavel: auditoria por `rg` e/ou testes dedicados mostram que os fluxos migrados (`/plan_spec`, `/discover_spec`, `/codex_chat`, callbacks auxiliares e leitura de ticket aberto) deixam de manter transporte ad hoc e passam a delegar o envio a camada central com politica explicita.
    - Comando: `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
    - Esperado: restam apenas o adaptador do proprio servico central e excecoes fora do escopo declaradas; os helpers do ticket nao aparecem mais como envios brutos.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: leitura de ticket aberto, CTA de implementacao e mensagens auxiliares de callback seguem cobertas e comportamentalmente equivalentes.
  - Requisito: RF-15, CA-09
    - Evidencia observavel: testes automatizados e/ou asserts de integracao comprovam que os envios conversacionais e auxiliares migrados produzem logging padronizado por envio com destino, politica, tipo logico da mensagem, tentativas, classe/codigo de erro e resultado final quando aplicavel, sem alterar a UX textual observada pelo operador.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: cenarios de sucesso, retry e falha definitiva verificam os campos minimos de log exigidos pela spec para politicas leves e interativas.
  - Requisito: RF-17, RF-20, CA-12
    - Evidencia observavel: os comandos e callbacks existentes mantem comportamento funcional equivalente do ponto de vista do operador, e `answerCbQuery(...)`/`editMessageText(...)` seguem fora do nucleo inicial com limite de escopo documentado na implementacao.
    - Comando: `rg -n "answerCbQuery|editMessageText|deliverTextMessage" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
    - Esperado: `answerCbQuery(...)` e `editMessageText(...)` permanecem no controller/callback flow, enquanto os envios baseados em `sendMessage(...)` dos fluxos alvo foram centralizados.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts`
    - Esperado: os testes existentes de callbacks, destaces e respostas de confirmacao continuam verdes sem regressao textual.
  - Requisito: validacao manual pendente relevante
    - Evidencia observavel: execucao manual em ambiente real de ao menos um fluxo conversacional confirma coerencia de botoes, mensagens e callback apos a migracao.
    - Comando: execucao manual de `/plan_spec`, `/discover_spec` ou `/codex_chat` em chat autorizado, percorrendo ao menos uma etapa com `reply_markup` e callback associado.
    - Esperado: mensagem chega com o teclado correto, o callback funciona, a confirmacao aparece no chat e a UX textual permanece coerente com o comportamento anterior.
- Regressao complementar obrigatoria:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test`
  - Esperado: suite completa verde sem regressao em runner, Telegram e estado.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: tipagem verde apos a extensao do contrato do servico de entrega.
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build`
  - Esperado: build concluida com sucesso.

## Idempotence and Recovery
- Idempotencia:
  - reexecutar a migracao deve manter um unico caminho canonico para os envios `sendMessage(...)` do escopo, sem criar wrappers concorrentes;
  - rerodar testes e auditorias nao gera efeitos colaterais fora do working tree;
  - repetir o smoke manual pode reenviar mensagens interativas, mas nao deve exigir cleanup persistente nem alterar o contrato do runner.
- Riscos:
  - quebrar o registro de callback context ao abstrair `message_id` de perguntas/finalizacoes;
  - aplicar a politica critica em mensagens que deveriam continuar leves, aumentando ruido operacional;
  - mover chunking/editorial de ticket aberto para o servico sem preservar o conteudo observavel dos chunks;
  - deixar warnings heterogeneos demais nos helpers auxiliares, reduzindo o ganho de padronizacao;
  - reintroduzir chamadas brutas a `sendMessage(...)` por nao fechar todas as superficies listadas no ticket.
- Recovery / Rollback:
  - se a extensao do resultado do servico causar regressao nos envios criticos, preservar os campos atuais e adicionar metadados novos como opcionais/derivados, em vez de substituir o shape existente;
  - se a captura de `message_id` falhar nos fluxos interativos, restaurar temporariamente o call site critico e reduzir o recorte ate o contrato central cobrir o caso sem perda funcional;
  - se o chunking de ticket aberto ficar regressivo, manter o formatter/header local e delegar apenas o envio/chunk loop ao servico como passo intermediario seguro;
  - se os callbacks auxiliares ficarem excessivamente acoplados a uma politica errada, separar politicas por familia sem reabrir o desenho do servico.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md`
- Spec de origem:
  - `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- ExecPlan relacionado ja entregue:
  - `execplans/2026-03-23-camada-central-de-entrega-telegram-para-notificacoes-criticas.md`
- Superficies tecnicas alvo confirmadas no planejamento:
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
- Evidencias de auditoria usadas para o planejamento:
  - `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts`
  - leitura dos metodos `sendDiscoverSpec*`, `sendPlanSpec*`, `sendCodexChat*`, `sendTicketOpenContent(...)`, `sendImplementSelectedTicketAction(...)` e `send*CallbackChatMessage(...)`
  - leitura dos testes de `/tickets_open`, `/plan_spec`, `/discover_spec`, `/codex_chat` e dos envios criticos ja centralizados
- Nota de qualidade aplicada:
  - ticket inteiro e referencias obrigatorias foram lidos antes do plano;
  - spec de origem, subconjunto de RFs/CAs, RNFs/restricoes, assumptions/defaults e validacoes manuais relevantes ficaram explicitos;
  - a validacao principal foi amarrada exclusivamente aos closure criteria do ticket.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - `TelegramDeliveryService.deliverTextMessage(...)` deve continuar aceitando `destinationChatId`, `text`, `policy`, `logicalMessageType`, `logMessages`, `context` e `extra`, mas passar a expor metadados de mensagem suficientes para `reply_markup`/`message_id`;
  - `TelegramDeliveryResult` provavelmente precisara de campos adicionais nao destrutivos, como `messageIds`, `messages` ou `primaryMessageId`, preservando `attempts`, `maxAttempts`, `chunkCount`, `policy` e `logicalMessageType`;
  - `TelegramController` deve consumir o novo resultado para registro de callback contexts e para unificar envios leves/auxiliares.
- Compatibilidade:
  - os envios criticos ja migrados (`sendTicketFinalSummary(...)`, `sendRunFlowSummary(...)`, `sendRunSpecsTriageMilestone(...)`) nao devem perder contrato nem observabilidade;
  - `answerCbQuery(...)` e `editMessageText(...)` permanecem fora da interface do servico nesta iteracao;
  - a UX textual e os teclados inline dos fluxos interativos precisam permanecer equivalentes para o operador.
- Dependencias externas e mocks:
  - Telegraf continua como integracao de bot; o servico central segue encapsulando `bot.telegram.sendMessage(...)`;
  - os testes existentes usam mocking do `sendMessage`, do logger e de respostas de callback; a ampliacao do contrato deve continuar compativel com essa estrategia;
  - nao ha novas dependencias externas previstas.
