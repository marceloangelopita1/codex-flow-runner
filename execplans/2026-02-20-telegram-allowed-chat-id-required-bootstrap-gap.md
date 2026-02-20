# ExecPlan - TELEGRAM_ALLOWED_CHAT_ID obrigatorio no bootstrap multi-runner

## Purpose / Big Picture
- Objetivo: eliminar o gap de bootstrap que ainda permite subir o bot sem `TELEGRAM_ALLOWED_CHAT_ID`, tornando a configuracao obrigatoria e mantendo o bloqueio de acesso para chats nao autorizados.
- Resultado esperado:
  - `parseEnv` falha quando `TELEGRAM_ALLOWED_CHAT_ID` estiver ausente ou vazio, com erro de configuracao acionavel.
  - O bootstrap (`src/main.ts`) nao inicializa `TelegramController` sem esse valor.
  - Com `TELEGRAM_ALLOWED_CHAT_ID` configurado, comandos e callbacks seguem bloqueados para chat nao autorizado.
  - RF-16 e CA-11 da spec ficam atendidos e rastreados.
- Escopo:
  - Ajustar schema/contrato de ambiente em `src/config/env.ts`.
  - Atualizar cobertura de testes em `src/config/env.test.ts`.
  - Revalidar e, se necessario, reforcar testes de bloqueio de acesso em `src/integrations/telegram-bot.test.ts`.
  - Atualizar documentacao operacional (`README.md`) e status de atendimento da spec alvo.
- Fora de escopo:
  - Refatorar contrato Telegram de status global `N/5` e controles por projeto (ticket dedicado `tickets/open/2026-02-20-telegram-multi-runner-status-and-project-scoped-controls-gap.md`).
  - Alteracoes no gerenciador de slots/capacidade do core multi-runner ja entregue.
  - Qualquer mudanca de paralelizacao de tickets dentro do mesmo projeto.

## Progress
- [x] 2026-02-20 16:20Z - Planejamento inicial concluido com leitura do ticket, spec e evidencias de codigo/teste.
- [x] 2026-02-20 16:23Z - Contrato de ambiente atualizado para exigir `TELEGRAM_ALLOWED_CHAT_ID`.
- [x] 2026-02-20 16:23Z - Testes de ambiente e acesso Telegram ajustados/validados.
- [x] 2026-02-20 16:23Z - Documentacao e spec atualizadas com rastreabilidade de atendimento.

## Surprises & Discoveries
- 2026-02-20 16:20Z - O schema atual marca `TELEGRAM_ALLOWED_CHAT_ID` como opcional em `src/config/env.ts`, o que permite bootstrap sem restricao.
- 2026-02-20 16:20Z - A suite de `src/config/env.test.ts` ainda afirma explicitamente o caminho sem `TELEGRAM_ALLOWED_CHAT_ID` como valido.
- 2026-02-20 16:20Z - O `README.md` documenta dois modos de acesso (restrito e sem restricao), mas a spec atual de multi-runner nao suporta oficialmente o modo sem restricao.
- 2026-02-20 16:20Z - A camada Telegram ja possui cobertura robusta de bloqueio para comandos e callbacks quando `allowedChatId` esta definido.

## Decision Log
- 2026-02-20 - Decisao: exigir `TELEGRAM_ALLOWED_CHAT_ID` no schema de ambiente (nao apenas no bootstrap manual).
  - Motivo: falhar cedo e de forma padronizada no ponto central de validacao de configuracao.
  - Impacto: `AppEnv` passa a exigir esse campo em todo fluxo que consome `loadEnv`/`parseEnv`.
- 2026-02-20 - Decisao: manter a regra de autorizacao em `TelegramController` sem relaxamento e validar regressao por testes existentes.
  - Motivo: CA-12 ja depende desse bloqueio e nao pode regredir durante a mudanca de bootstrap.
  - Impacto: foco de alteracao fica em contrato de ambiente + docs + testes, com baixo risco de mudanca funcional no bot.
- 2026-02-20 - Decisao: manter testes unitarios do controlador cobrindo modo sem `allowedChatId`, sem expor esse modo no bootstrap oficial.
  - Motivo: preservar cobertura de comportamento isolado do componente sem reabrir suporte operacional ao modo irrestrito.
  - Impacto: `README` e `parseEnv` ficam estritos, enquanto os testes do controlador continuam abrangentes.

## Outcomes & Retrospective
- Status final: implementacao e validacao concluidas (sem fechamento de ticket e sem commit/push nesta etapa).
- O que funcionou:
  - `parseEnv` passou a rejeitar ausencia/valor vazio de `TELEGRAM_ALLOWED_CHAT_ID`.
  - Cobertura de env foi atualizada para os cenarios obrigatorios de bootstrap.
  - Regressao de acesso Telegram permaneceu verde para comandos e callbacks nao autorizados.
  - `README.md` e spec alvo foram atualizados com obrigatoriedade e rastreabilidade de RF-16/CA-11.
- O que ficou pendente:
  - Encerramento operacional do ticket (mover para `tickets/closed/`, preencher closure e versionar).
- Proximos passos:
  - Executar prompt de encerramento do ticket quando autorizado.

## Context and Orientation
- Arquivos principais:
  - `src/config/env.ts` - schema Zod e erro de configuracao de ambiente.
  - `src/config/env.test.ts` - contrato atual de aceitacao/rejeicao do ambiente.
  - `src/main.ts` - bootstrap que consome `loadEnv()` e injeta `allowedChatId` no `TelegramController`.
  - `src/integrations/telegram-bot.ts` - regra `isAllowed` que bloqueia chat nao autorizado quando `allowedChatId` existe.
  - `src/integrations/telegram-bot.test.ts` - cobertura de comandos/callbacks para acesso autorizado e nao autorizado.
  - `README.md` e `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` - contrato operacional e matriz RF/CA.
- Fluxo atual relevante:
  - `loadEnv()` chama `parseEnv(process.env)` antes de construir o runner.
  - Com schema opcional, bootstrap avanca sem restricao de chat.
  - Em runtime, `isAllowed` libera qualquer chat quando `allowedChatId` esta ausente.
- Restricoes tecnicas:
  - Manter Node.js 20+ e TypeScript sem novas dependencias.
  - Preservar arquitetura em camadas e fluxo sequencial de tickets por projeto.
  - Nao introduzir fallback de acesso irrestrito para o modo multi-runner.

## Plan of Work
- Milestone 1 - Contrato de ambiente endurecido para bootstrap seguro
  - Entregavel: `TELEGRAM_ALLOWED_CHAT_ID` passa a ser obrigatorio no schema de `env`.
  - Evidencia de conclusao: `parseEnv` rejeita ausencia e valor vazio com erro claro apontando o campo.
  - Arquivos esperados: `src/config/env.ts`, `src/config/env.test.ts`.
- Milestone 2 - Regressao de controle de acesso Telegram protegida
  - Entregavel: comportamento de bloqueio para chat nao autorizado permanece inalterado e coberto.
  - Evidencia de conclusao: testes de comando e callback nao autorizados seguem verdes.
  - Arquivos esperados: `src/integrations/telegram-bot.test.ts` (ajustes somente se necessario), possivelmente `src/integrations/telegram-bot.ts`.
- Milestone 3 - Contrato operacional e rastreabilidade atualizados
  - Entregavel: docs deixam explicito que `TELEGRAM_ALLOWED_CHAT_ID` e obrigatorio para execucao suportada.
  - Evidencia de conclusao: `README.md` e spec com RF-16/CA-11 atualizados e ticket referenciado.
  - Arquivos esperados: `README.md`, `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`.
- Milestone 4 - Validacao integrada da entrega
  - Entregavel: testes e build completos sem regressao.
  - Evidencia de conclusao: `npm test`, `npm run check` e `npm run build` concluidos com sucesso.
  - Arquivos esperados: sem novos arquivos; evidencias em logs de execucao.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para baseline de tipagem antes das mudancas.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "TELEGRAM_ALLOWED_CHAT_ID|parseEnv|loadEnv" src/config/env.ts src/config/env.test.ts src/main.ts README.md` para confirmar todos os pontos de contrato.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/config/env.ts` para tornar `TELEGRAM_ALLOWED_CHAT_ID` obrigatorio e manter mensagem de erro objetiva no `parseEnv`.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `src/config/env.test.ts` cobrindo: ausencia de `TELEGRAM_ALLOWED_CHAT_ID` como erro, valor vazio como erro, e caso valido com defaults aplicados.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Revisar `src/main.ts` para garantir que o bootstrap continue apenas com `env` valido e sem fallback adicional para chat irrestrito.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar testes focados de acesso Telegram: `npx tsx --test src/integrations/telegram-bot.test.ts`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se algum teste depender do modo sem restricao para cobertura de unidade, ajustar somente o necessario para separar "contrato do controlador" de "contrato de bootstrap".
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `README.md` removendo a orientacao de uso suportado sem `TELEGRAM_ALLOWED_CHAT_ID` e reforcando exigencia operacional.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` com atendimento de RF-16 e CA-11 e referencia deste ticket/execucao.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar validacao final: `npm test && npm run check && npm run build`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git status --short` e `git diff -- src/config/env.ts src/config/env.test.ts src/integrations/telegram-bot.ts src/integrations/telegram-bot.test.ts README.md docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` para auditoria final dos artefatos.

## Validation and Acceptance
- Comando: `npx tsx --test src/config/env.test.ts`
  - Esperado: falha quando `TELEGRAM_ALLOWED_CHAT_ID` ausente/vazio e sucesso no caso valido com `POLL_INTERVAL_MS` default.
- Comando: `npx tsx --test src/integrations/telegram-bot.test.ts`
  - Esperado: casos de chat nao autorizado continuam bloqueados em comandos e callbacks (sem regressao de CA-12).
- Comando: `npm test`
  - Esperado: suite completa verde, incluindo testes de env e Telegram.
- Comando: `npm run check && npm run build`
  - Esperado: tipagem e build concluidos sem erro.
- Comando: `rg -n "RF-16|CA-11|TELEGRAM_ALLOWED_CHAT_ID" docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md README.md`
  - Esperado: documentacao e spec refletem obrigatoriedade de bootstrap e rastreabilidade da entrega.

## Idempotence and Recovery
- Idempotencia:
  - Reexecutar validacoes (`npm test`, `npm run check`, `npm run build`) nao produz efeitos colaterais persistentes.
  - Reaplicar alteracoes de docs/spec e deterministico e verificavel por diff.
- Riscos:
  - Quebra operacional em ambientes existentes sem `TELEGRAM_ALLOWED_CHAT_ID` configurado.
  - Mensagem de erro de configuracao pouco acionavel se a validacao nao explicitar claramente o campo ausente.
  - Regressao acidental em testes que usam controlador Telegram sem chat restrito por conveniencia de fixture.
- Recovery / Rollback:
  - Em incidente de rollout, corrigir imediatamente `.env`/unit `systemd` com `TELEGRAM_ALLOWED_CHAT_ID` antes de qualquer tentativa de flexibilizar contrato.
  - Se a mensagem de erro ficar ambigua, ajustar validacao de `parseEnv` com mensagem explicita e reexecutar suite.
  - Em regressao de teste Telegram, isolar fixture afetada para manter cobertura de unidade sem reabrir modo irrestrito no bootstrap.

## Artifacts and Notes
- Ticket de origem: `tickets/open/2026-02-20-telegram-allowed-chat-id-required-bootstrap-gap.md`.
- Spec de referencia: `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md` (RF-16, CA-11, CA-12).
- Arquivos alterados:
  - `src/config/env.ts`
  - `src/config/env.test.ts`
  - `src/core/runner.test.ts`
  - `README.md`
  - `docs/specs/2026-02-20-telegram-multi-project-parallel-runners.md`
- Logs/comandos executados para auditoria:
  - `npm run check` (baseline) - sucesso.
  - `npx tsx --test src/config/env.test.ts`
  - `npx tsx --test src/integrations/telegram-bot.test.ts`
  - `npm test && npm run check && npm run build` - sucesso (166 testes passando, sem erro de tipagem/build).

## Interfaces and Dependencies
- Interfaces alteradas:
  - `AppEnv` em `src/config/env.ts` passa a exigir `TELEGRAM_ALLOWED_CHAT_ID` como campo obrigatorio.
  - Contrato operacional documentado em `README.md` deixa de listar modo sem restricao como caminho suportado.
- Compatibilidade:
  - Ambiente sem `TELEGRAM_ALLOWED_CHAT_ID` deixa de ser compativel por desenho (fail-fast no bootstrap).
  - Contratos de comandos Telegram e aliases permanecem compativeis; apenas o gate de bootstrap e endurecido.
- Dependencias externas e mocks:
  - Sem novas dependencias.
  - Testes seguem com doubles locais de logger/contexto Telegram, sem chamadas reais de rede.
