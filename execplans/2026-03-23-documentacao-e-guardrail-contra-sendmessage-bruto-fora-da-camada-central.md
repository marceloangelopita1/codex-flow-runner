# ExecPlan - Documentação e guardrail contra `sendMessage(...)` bruto fora da camada central

## Purpose / Big Picture
- Objetivo: concluir a frente documental da spec `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`, registrando uma fonte de verdade canônica para novas mensagens Telegram e adicionando um guardrail automatizado simples contra reintrodução de `bot.telegram.sendMessage(...)` bruto fora da camada central.
- Resultado esperado:
  - o repositório passa a ter documentação operacional canônica, fora da spec, explicando que novas mensagens Telegram devem usar `TelegramDeliveryService` e escolher uma política de entrega;
  - o limite de escopo inicial fica explícito: a centralização obrigatória cobre superfícies baseadas em `sendMessage(...)`, enquanto `answerCbQuery(...)` e `editMessageText(...)` permanecem fora do núcleo nesta primeira evolução;
  - existe um guardrail automatizado simples, versionado junto do código, que falha quando surgem novas chamadas diretas a `bot.telegram.sendMessage(...)` fora das exceções justificadas;
  - a evidência observável do ticket passa a depender de documentação consultável e de auditoria automatizada reexecutável, não de memória do implementador.
- Escopo:
  - escolher e atualizar o documento canônico de projeto para essa regra;
  - registrar caminho oficial da camada central, política de entrega e exceções de escopo aceitas;
  - criar guardrail automatizado focado em auditoria de código para `bot.telegram.sendMessage(...)`;
  - validar a nova documentação e o guardrail contra os closure criteria do ticket.
- Fora de escopo:
  - migrar novas superfícies funcionais para `TelegramDeliveryService`; isso já pertenceu aos tickets técnicos anteriores;
  - colocar `answerCbQuery(...)`, `editMessageText(...)` ou `ctx.reply(...)` dentro da mesma abstração nesta rodada;
  - redesenhar contratos de runtime de `TelegramDeliveryService` ou `TelegramController`;
  - fechar ticket, mover arquivo para `tickets/closed/`, commitar, fazer push ou executar smoke manual externo no Telegram real.

## Progress
- [x] 2026-03-23 14:54Z - Planejamento inicial concluído com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `DOCUMENTATION.md`, do ticket fechado irmão e das superfícies `README.md`, `src/integrations/telegram-bot.ts` e `src/integrations/telegram-delivery.ts`.
- [x] 2026-03-23 14:58Z - Documento canônico atualizado no `README.md` com a regra de uso obrigatório de `TelegramDeliveryService`, seleção explícita de política de entrega, exceção documentada para `answerCbQuery(...)`/`editMessageText(...)` e proibição de duplicação desnecessária no `AGENTS.md`.
- [x] 2026-03-23 14:58Z - Guardrail automatizado versionado em `src/integrations/telegram-sendmessage-guardrail.test.ts`, com allowlist explícito do único uso bruto permitido de `bot.telegram.sendMessage(...)` em `src/integrations/telegram-bot.ts`.
- [x] 2026-03-23 15:01Z - Validação final dos closure criteria concluída com `npx tsx --test src/integrations/telegram-sendmessage-guardrail.test.ts`, regressão complementar `153/153` em `src/integrations/telegram-sendmessage-guardrail.test.ts src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts` e auditorias `rg` confirmando README/spec atualizados, ausência de duplicação no `AGENTS.md` e apenas um call site bruto permitido.

## Surprises & Discoveries
- 2026-03-23 14:54Z - A documentação de apoio atual (`README.md`) já concentra operação e confiabilidade do Telegram, mas ainda não cita `TelegramDeliveryService` nem a obrigação de escolher política de entrega para novas mensagens.
- 2026-03-23 14:54Z - Após a migração técnica, a auditoria atual mostra só um ponto bruto de `bot.telegram.sendMessage(...)` em `src/integrations/telegram-bot.ts`, usado como adaptador interno para injetar o transporte no `TelegramDeliveryService`; isso é a melhor exceção explícita para o guardrail.
- 2026-03-23 14:54Z - O metadata `Parent ticket` do ticket-alvo aponta para `tickets/open/...migracao...`, mas o artefato real de referência já está em `tickets/closed/...migracao...`; isso não bloqueia a execução, mas o plano deve usar o caminho fechado como contexto válido.
- 2026-03-23 14:58Z - A spec viva ainda tratava a ausência de documentação/guardrail como pendência textual, então a execução precisou registrar o novo estado também no próprio documento de spec, sem promover `Spec treatment: done`.
- 2026-03-23 15:01Z - A primeira versão do guardrail acusou falso positivo ao auditar o próprio arquivo de teste; restringir a varredura para `src/**/*.ts` de produção (excluindo `*.test.ts` e `*.d.ts`) eliminou o ruído sem abrir brecha no contrato arquitetural.

## Decision Log
- 2026-03-23 - Decisão: usar `README.md` como documento canônico desta regra, em vez de expandir `AGENTS.md` ou deixar a orientação somente na spec.
  - Motivo: `DOCUMENTATION.md` orienta que detalhe técnico e referência consultável devem ficar em documentação canônica/README, e o ticket proíbe duplicação desnecessária no `AGENTS.md`.
  - Impacto: a regra fica fácil de encontrar para manutenção futura sem inflar o contexto auto-carregado.
- 2026-03-23 - Decisão: implementar o guardrail como teste dedicado de auditoria de código, lido pelo `tsx --test`, em vez de depender apenas de comando manual com `rg`.
  - Motivo: CA-08 pede barreira automatizada e reexecutável; um teste dedicado entra naturalmente na suíte do repositório e falha em CI/local quando o contrato é quebrado.
  - Impacto: o allowlist de exceções fica explícito e versionado junto do código.
- 2026-03-23 - Decisão: o guardrail vai proteger apenas chamadas diretas a `bot.telegram.sendMessage(...)`, não todo uso de APIs Telegram fora do serviço central.
  - Motivo: a spec e o ticket delimitam esta iteração ao transporte baseado em `sendMessage(...)`, preservando `answerCbQuery(...)` e `editMessageText(...)` fora do núcleo inicial.
  - Impacto: o teste fica preciso, alinhado ao escopo e menos sujeito a falso positivo.
- 2026-03-23 - Decisão: codificar o guardrail como auditoria recursiva de `src/**/*.ts` com allowlist por arquivo e contagem, em vez de amarrar o teste a número de linha.
  - Motivo: o closure criterion exige barreira simples e reexecutável, mas o adaptador permitido pode se mover de linha sem mudar de papel arquitetural.
  - Impacto: a exceção explícita continua auditável com baixa fragilidade estrutural.
- 2026-03-23 - Decisão: excluir `*.test.ts` e `*.d.ts` da auditoria do guardrail.
  - Motivo: o contrato do ticket é sobre regressão arquitetural no código de produção; incluir o próprio teste cria falso positivo e não aumenta a proteção real.
  - Impacto: a auditoria continua simples, objetiva e focada nos call sites que importam para CA-08.

## Outcomes & Retrospective
- Status final: execução concluída com validações observáveis verdes; ticket ainda aberto por estar fora do escopo desta etapa.
- O que funcionou:
  - o ticket já carrega spec de origem, RFs/CAs, restrições documentais e closure criteria observáveis suficientes para um plano auto-contido;
  - a implementação anterior reduziu o problema a uma única exceção técnica justificável, o que simplificou bastante o guardrail;
  - a regra canônica coube bem no `README.md`, perto da seção operacional do Telegram, sem exigir duplicação no `AGENTS.md`;
  - a auditoria estática por allowlist ficou suficiente para CA-08 sem necessidade de AST ou dependência nova.
- O que ficou pendente:
  - fechamento formal do ticket e versionamento, que pertencem à próxima etapa do workflow;
  - smokes manuais externos já conhecidos na spec (`/run_specs` com falha transitória simulada e um fluxo conversacional real).
- Próximos passos:
  - reler ticket/diff/ExecPlan na etapa de `close-and-version`;
  - fechar o ticket com evidência objetiva das validações já executadas, sem reabrir escopo;
  - manter os smokes manuais externos como pendência explícita até sua execução.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md`
  - `tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md`
  - `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `README.md`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-delivery.ts`
  - `src/integrations/telegram-delivery.test.ts`
- Spec de origem: `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- RFs/CAs cobertos por este plano:
  - RF-19
  - CA-08
  - CA-10
- RNFs e restrições herdados que precisam ficar observáveis neste ticket:
  - seguir `DOCUMENTATION.md` e manter a regra fora do `AGENTS.md` quando bastar documentação consultável;
  - evitar duplicação de regra canônica em múltiplos documentos;
  - tornar a orientação futura inequívoca e auditável;
  - deixar explícito que o escopo inicial obrigatório é `sendMessage(...)`, não `answerCbQuery(...)` nem `editMessageText(...)`;
  - manter a fonte de verdade no projeto, não apenas na spec.
- Assumptions / defaults adotados:
  - `README.md` é o melhor documento canônico para esta regra porque já concentra operação e comportamento da integração Telegram acessível sob demanda;
  - o único uso bruto aceitável de `bot.telegram.sendMessage(...)` após a migração é o adaptador interno usado para injetar o transporte no `TelegramDeliveryService` dentro de `src/integrations/telegram-bot.ts`;
  - se uma nova exceção legítima surgir no futuro, ela deve ser explicitada no mesmo changeset em documentação e no allowlist do guardrail, não introduzida silenciosamente;
  - o guardrail pode ler arquivos-fonte diretamente com `node:fs` e regex/asserções simples; não é necessário AST nem dependência nova para esta tarefa.
- Fluxo atual relevante:
  - `TelegramController` instancia `TelegramDeliveryService` no construtor e injeta `this.bot.telegram.sendMessage(...)` como adaptador de transporte;
  - `TelegramDeliveryService` é hoje o caminho canônico de envio para superfícies baseadas em `sendMessage(...)`;
  - a documentação operacional ainda fala de confiabilidade dos resumos finais, mas não documenta explicitamente o contrato geral de centralização.
- Superfícies candidatas para mudança:
  - `README.md`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-delivery.ts`
  - novo teste dedicado em `src/integrations/telegram-sendmessage-guardrail.test.ts` ou arquivo equivalente de mesmo escopo

## Plan of Work
- Milestone 1: consolidar a fonte de verdade documental da integração Telegram.
  - Entregável: nova subseção canônica em `README.md` explicando onde a camada central vive, como escolher política de entrega e quais superfícies permanecem fora do núcleo inicial.
  - Evidência de conclusão: leitura por `rg` mostra a regra no `README.md`, com referência explícita a `TelegramDeliveryService`, política de entrega, `sendMessage(...)` bruto proibido para novos fluxos e exceção de escopo para `answerCbQuery(...)`/`editMessageText(...)`.
  - Arquivos esperados: `README.md`.
- Milestone 2: tornar observável a barreira contra regressão arquitetural.
  - Entregável: teste automatizado focado em auditoria de código que valida o allowlist de chamadas diretas a `bot.telegram.sendMessage(...)`.
  - Evidência de conclusão: o teste passa no estado correto atual e falharia se novos call sites brutos forem introduzidos fora da exceção documentada.
  - Arquivos esperados: novo teste dedicado em `src/integrations/`, com possível ajuste mínimo em teste existente apenas se necessário para compartilhamento de utilitários.
- Milestone 3: fechar o ticket com validação aderente ao closure criterion.
  - Entregável: matriz requisito -> validação executada, provando documentação canônica, guardrail automatizado e não duplicação indevida em `AGENTS.md`.
  - Evidência de conclusão: comandos abaixo retornam exatamente o estado esperado sem depender de checklist genérico.
  - Arquivos esperados: `README.md`, teste de guardrail e eventuais notas de execução no próprio ExecPlan.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "TelegramDeliveryService|bot\\.telegram\\.sendMessage\\(|answerCbQuery|editMessageText|sendMessage\\(" README.md src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts` para confirmar o estado atual da documentação e das exceções técnicas antes da edição.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `README.md` para adicionar uma subseção canônica da integração Telegram com:
   - uso obrigatório de `TelegramDeliveryService` para novas mensagens baseadas em `sendMessage(...)`;
   - exigência explícita de escolher uma política de entrega;
   - indicação do local da camada central (`src/integrations/telegram-delivery.ts`);
   - exceções de escopo inicial documentadas (`answerCbQuery(...)` e `editMessageText(...)`);
   - proibição de duplicar essa regra no `AGENTS.md`.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Criar um teste dedicado, preferencialmente `src/integrations/telegram-sendmessage-guardrail.test.ts`, que leia os arquivos relevantes com `node:fs` e:
   - audite ocorrências de `bot.telegram.sendMessage(` no código-fonte;
   - permita apenas a exceção documentada do adaptador interno do `TelegramController`;
   - falhe com mensagem objetiva quando novo call site bruto aparecer fora do allowlist.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se o teste precisar reduzir acoplamento por linha/regex frágil, ajustar minimamente a forma do adaptador em `src/integrations/telegram-bot.ts` ou reutilizar constantes/utilitários sem alterar o contrato funcional do runtime.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-sendmessage-guardrail.test.ts` para validar o guardrail isoladamente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-sendmessage-guardrail.test.ts src/integrations/telegram-delivery.test.ts src/integrations/telegram-bot.test.ts` para provar que a barreira nova convive com a integração Telegram já centralizada.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar os comandos da seção `Validation and Acceptance` e registrar no próprio plano qualquer descoberta, ajuste de allowlist ou limitação residual.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisito: RF-19, CA-10
    - Evidência observável: existe documentação canônica do projeto orientando explicitamente futuras mensagens Telegram a usar a camada central e a selecionar política de entrega, sem depender da spec como única fonte de verdade.
    - Comando: `rg -n "TelegramDeliveryService|política de entrega|sendMessage\\(|answerCbQuery|editMessageText" README.md`
    - Esperado: o `README.md` contém uma seção canônica que cita `TelegramDeliveryService`, orienta novas mensagens a escolher política de entrega e explicita o limite de escopo para `answerCbQuery(...)`/`editMessageText(...)`.
    - Comando: `rg -n "TelegramDeliveryService|política de entrega|sendMessage\\(" docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md README.md`
    - Esperado: a regra existe no `README.md` como documentação operacional do projeto, não apenas na spec.
  - Requisito: CA-08
    - Evidência observável: existe guardrail automatizado simples que falha quando novas chamadas diretas a `sendMessage(...)` surgem fora das exceções justificadas.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/telegram-sendmessage-guardrail.test.ts`
    - Esperado: o teste fica verde no estado permitido atual e documenta claramente a exceção aceita; qualquer novo call site bruto fora do allowlist faria a suíte falhar.
    - Comando: `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
    - Esperado: a auditoria textual mostra apenas o adaptador interno do `TelegramController`; não aparecem novos envios brutos fora da camada central.
  - Requisito: restrição documental relevante do ticket
    - Evidência observável: a regra não foi duplicada desnecessariamente em `AGENTS.md` e o limite de escopo inicial fica explícito na documentação escolhida.
    - Comando: `rg -n "TelegramDeliveryService|política de entrega|sendMessage\\(" AGENTS.md README.md`
    - Esperado: a orientação canônica aparece no `README.md`; `AGENTS.md` não recebe duplicação desnecessária dessa regra.
    - Comando: `rg -n "answerCbQuery|editMessageText|sendMessage\\(" README.md`
    - Esperado: o `README.md` explicita que a obrigatoriedade inicial cobre envios baseados em `sendMessage(...)`, enquanto `answerCbQuery(...)` e `editMessageText(...)` seguem fora do núcleo nesta etapa.

## Idempotence and Recovery
- Idempotência:
  - reexecutar a edição do `README.md` deve convergir para uma única seção canônica, sem espalhar a mesma regra por múltiplos arquivos;
  - rerodar o teste de guardrail não gera efeitos colaterais e só depende do estado versionado do código-fonte;
  - repetir a auditoria por `rg` deve continuar apontando o mesmo allowlist explícito quando não houver novas regressões.
- Riscos:
  - escolher um local ruim no `README.md` e tornar a regra pouco descobrível, apesar de correta;
  - criar um guardrail frágil demais, acoplado a número de linha em vez de semântica mínima;
  - confundir exceção técnica justificada com permissão ampla para novos envios brutos;
  - duplicar a regra no `AGENTS.md` ou em múltiplos documentos e contrariar `DOCUMENTATION.md`.
- Recovery / Rollback:
  - se a seção escolhida no `README.md` ficar escondida ou redundante, mover o texto para uma subseção mais próxima da integração Telegram sem criar segunda fonte de verdade;
  - se o teste de guardrail ficar frágil por regex/linha, substituir por auditoria de arquivo com allowlist declarativo por caminho e assinatura, sem adicionar dependências;
  - se surgir necessidade legítima de nova exceção, documentá-la explicitamente no `README.md` e no allowlist do teste no mesmo changeset; não usar bypass silencioso;
  - se qualquer ajuste no adaptador do controller ameaçar alterar comportamento de runtime, reverter a mudança estrutural e manter o guardrail baseado somente em leitura estática dos arquivos.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-23-documentacao-e-guardrail-contra-sendmessage-bruto-fora-da-camada-central.md`
- Ticket fechado relacionado:
  - `tickets/closed/2026-03-23-migracao-de-envios-conversacionais-e-auxiliares-para-camada-central-telegram.md`
- Spec de origem:
  - `docs/specs/2026-03-23-arquitetura-centralizada-de-entrega-robusta-de-mensagens-no-telegram.md`
- Documentos de regra consultados:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
- Evidências de auditoria usadas no planejamento:
  - `rg -n "bot\\.telegram\\.sendMessage\\(" src/integrations/telegram-bot.ts src/integrations/telegram-delivery.ts`
  - leitura do construtor de `TelegramController` em `src/integrations/telegram-bot.ts`
  - leitura do contrato de `TelegramDeliveryService` em `src/integrations/telegram-delivery.ts`
  - leitura da cobertura atual em `src/integrations/telegram-delivery.test.ts`
- Nota de qualidade aplicada:
  - o plano foi derivado após leitura integral do ticket e das referências obrigatórias;
  - os closure criteria foram traduzidos em validações observáveis sem depender de checklist genérico;
  - spec de origem, RFs/CAs, assumptions/defaults, restrições documentais e risco residual ficaram explícitos.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - documentação operacional em `README.md` ganhará uma seção canônica para integração Telegram e uso obrigatório da camada central;
  - a suíte de testes ganhará um teste dedicado de auditoria estática para `bot.telegram.sendMessage(...)`;
  - nenhum contrato público de runtime precisa mudar para cumprir este ticket, exceto eventual ajuste mínimo não funcional que torne o guardrail menos frágil.
- Compatibilidade:
  - `TelegramDeliveryService` permanece como caminho canônico para envios baseados em `sendMessage(...)`;
  - `answerCbQuery(...)` e `editMessageText(...)` seguem fora da obrigatoriedade inicial e devem continuar funcionando como hoje;
  - o ticket não deve alterar UX textual nem políticas de entrega existentes.
- Dependências externas e mocks:
  - o guardrail depende apenas do código versionado local e de `node:fs`, sem novas bibliotecas;
  - a auditoria textual complementar depende de `rg`;
  - os testes existentes de `src/integrations/telegram-delivery.test.ts` e `src/integrations/telegram-bot.test.ts` continuam sendo a malha de regressão mais próxima da integração Telegram.
