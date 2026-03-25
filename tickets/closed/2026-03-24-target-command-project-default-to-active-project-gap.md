# [TICKET] Comandos target do Telegram ainda exigem repeticao manual do projeto ativo

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-25 02:03Z
- Reporter: Codex
- Owner: Codex
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional): execplans/2026-03-24-target-command-project-default-to-active-project.md
- Parent commit (optional):
- Analysis stage (when applicable): manual-analysis
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
- Source spec canonical path (when applicable): docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-10, RF-19, CA-03 e CA-07 do fluxo target atual; este ticket revisa o contrato textual para permitir fallback ao projeto ativo em `/target_prepare` e omissao apenas do projeto em `/target_derive_gaps`, preservando `report-path` explicito e sem introduzir "ultimo relatorio" implicito.
- Inherited assumptions/defaults (when applicable): o projeto ativo global ja existe e e a referencia ergonomica desejada no Telegram; `/target_checkup` ja e o baseline esperado para fallback de projeto; `/target_derive_gaps` continua exigindo `report-path` explicito, entao clicar no comando sem nenhum argumento ainda nao e suficiente; `/select_project` deve continuar exigindo nome explicito porque sua funcao e justamente trocar o projeto ativo.
- Inherited RNFs (when applicable): manter fluxo sequencial; evitar duplicacao de regra entre parser do Telegram e runner; preservar observabilidade/logs/traces do comando solicitado versus projeto efetivo; manter documentacao e ajuda do bot coerentes com o comportamento implementado.
- Inherited technical/documentary constraints (when applicable): centralizar o fallback para projeto ativo no `Runner` ou em helper equivalente de orquestracao, nao apenas na borda do Telegram; nao alterar o contrato de "projeto ativo" persistido; nao introduzir resolucao implicita de "ultimo report" em `/target_derive_gaps`; atualizar README, help de `/start` e spec canonica no mesmo changeset da implementacao.
- Inherited pending/manual validations (when applicable): smoke manual no Telegram real para `/target_prepare` sem argumento e `/target_derive_gaps <report-path>` usando projeto ativo valido; smoke manual para mensagens de erro quando nao houver projeto ativo disponivel.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - README.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - tickets/templates/internal-ticket-template.md
  - docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
  - execplans/2026-03-24-target-command-project-default-to-active-project.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P1 porque o runner ja possui projeto ativo global e um dos comandos target (`/target_checkup`) ja usa esse contexto, mas a UX segue inconsistente em `/target_prepare` e `/target_derive_gaps`, gerando atrito recorrente no Telegram e necessidade de revisar contrato/documentacao/testes em multiplas superficies.

## Context
- Workflow area: plano de controle do Telegram e comandos target de onboarding/readiness.
- Scenario: o operador esta no Telegram, ja tem um projeto ativo selecionado e quer acionar um comando que pede `project-name`, sem precisar repetir um contexto que o runner ja conhece.
- Input constraints: `/target_checkup` ja suporta fallback para o projeto ativo; `/target_prepare` e `/target_derive_gaps` ainda exigem projeto explicito; `/target_derive_gaps` precisa manter `report-path` explicito; `/select_project` deve continuar explicito.

## Problem statement
Os comandos target do Telegram nao seguem uma ergonomia uniforme em relacao ao projeto ativo global. Hoje, `/target_checkup` aceita omissao do projeto e usa o contexto atual corretamente, mas `/target_prepare` e `/target_derive_gaps` continuam exigindo que o operador repita manualmente o nome do projeto, mesmo quando o projeto ativo ja esta selecionado. Isso aumenta atrito no uso cotidiano do bot, deixa o help/documentacao desalinhados com a expectativa de UX e espalha um contrato inconsistente entre parser do Telegram, runner, testes e spec.

## Observed behavior
- O que foi observado:
  - `/target_prepare` responde com mensagem de uso quando o comando chega sem argumento de projeto.
  - `/target_checkup` ja usa o projeto ativo quando nenhum argumento e informado.
  - `/target_derive_gaps` exige dois argumentos e nao aceita o caso ergonomico "usar projeto ativo + report-path explicito".
  - `/start`, README e spec canonica ainda documentam `/target_prepare <project-name>` e `/target_derive_gaps <project-name> <report-path>` como obrigatoriamente explicitos.
- Frequencia (unico, recorrente, intermitente): recorrente sempre que o operador usa comandos target no Telegram partindo de um projeto ativo ja selecionado.
- Como foi detectado (warning/log/test/assert): leitura direta dos handlers/parsers em `src/integrations/telegram-bot.ts`, das assinaturas em `src/core/runner.ts`, do fallback existente em `src/core/target-checkup.ts` e dos contratos documentais em `README.md` e `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`.

## Expected behavior
O runner deve tratar o projeto ativo como default sempre que isso fizer sentido ergonomico nos comandos target do Telegram:
- `/target_prepare` sem argumento deve usar o projeto ativo atual.
- `/target_checkup` deve permanecer como esta.
- `/target_derive_gaps <report-path>` deve usar o projeto ativo atual, enquanto `/target_derive_gaps <project-name> <report-path>` continua valido para alvo explicito.
- `/target_derive_gaps` sem nenhum argumento ainda deve orientar o uso correto, porque `report-path` continua obrigatorio.
- `/select_project` e `/select-project` devem continuar exigindo argumento explicito.
- O comportamento deve ficar consistente entre parser, runner, logs/traces, testes, help `/start`, README e spec canonica.

## Reproduction steps
1. Ler `src/integrations/telegram-bot.ts` e confirmar que `parseTargetPrepareCommandProjectName(...)` retorna `null` quando `/target_prepare` chega sem argumento.
2. Ler `src/integrations/telegram-bot.ts` e confirmar que `handleTargetPrepareCommand(...)` responde `Uso: /target_prepare <nome-do-projeto>.` quando o parser retorna `null`.
3. Ler `src/core/target-checkup.ts` e confirmar que `resolveTargetProject(...)` ja usa `activeProject` quando `projectName` nao e informado.
4. Ler `src/integrations/telegram-bot.ts` e confirmar que `parseTargetDeriveCommandArgs(...)` exige dois argumentos, impedindo o caso "projeto ativo + report-path".
5. Ler `README.md` e a spec de onboarding/readiness e confirmar que a documentacao publica ainda trata `/target_prepare` e `/target_derive_gaps` como sempre explicitos.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/integrations/telegram-bot.ts`: `TARGET_PREPARE_USAGE_REPLY` e `TARGET_DERIVE_USAGE_REPLY` ainda exigem projeto explicito.
  - `src/integrations/telegram-bot.ts`: `handleTargetPrepareCommand(...)` bloqueia o comando sem projeto; `handleTargetCheckupCommand(...)` nao faz esse bloqueio; `handleTargetDeriveCommand(...)` depende de parser com dois argumentos obrigatorios.
  - `src/core/runner.ts`: `requestTargetPrepare(projectName: string)` e `requestTargetDerive(projectName: string, reportPath: string)` ainda codificam projeto explicito na assinatura.
  - `src/core/target-checkup.ts`: o fallback para `activeProject` ja existe e fornece o baseline desejado.
  - `README.md` e `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`: contrato textual ainda esta no formato obrigatoriamente explicito para `prepare` e `derive`.
- Comparativo antes/depois (se houver): antes = operador precisa repetir o nome do projeto ativo em comandos target mesmo com contexto selecionado; depois esperado = o projeto ativo passa a ser o default ergonomico sempre que a semantica do comando comportar isso.

## Impact assessment
- Impacto funcional: baixo a medio. O sistema ja funciona, mas com UX inconsistente e friccao desnecessaria.
- Impacto operacional: medio. O operador precisa lembrar e repetir `project-name` em comandos que poderiam reutilizar contexto ja persistido, aumentando chance de erro de uso e custo cognitivo no Telegram.
- Risco de regressao: medio. A mudanca toca parser do Telegram, assinaturas do runner, testes, mensagens de ajuda e spec/documentacao publica.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/telegram-bot.ts`, `src/core/runner.ts`, possivel helper de resolucao de projeto efetivo, `README.md`, spec canonica de onboarding/readiness, e suites de teste de `telegram-bot` e `runner`.

## Initial hypotheses (optional)
- A menor entrega segura e tratar o fallback de projeto no `Runner`, deixando o `TelegramController` responsavel apenas por parsear "com ou sem projeto" e por manter a UX/mensagens coerentes.
- No caso de `/target_derive_gaps`, o formato mais simples e seguro e interpretar a forma de um unico argumento como `report-path`, nunca como `project-name`.

## Proposed solution (optional)
Direcao concreta:
- evoluir `/target_prepare` para `/target_prepare [project-name]`;
- manter `/target_checkup [project-name]` como baseline;
- evoluir `/target_derive_gaps` para aceitar tanto `/target_derive_gaps <report-path>` quanto `/target_derive_gaps <project-name> <report-path>`, sempre preservando `report-path` explicito;
- manter `/select_project` fora do escopo da mudanca;
- atualizar help, README, spec e testes no mesmo changeset.

## Closure criteria
- Requisito/RF/CA coberto: fallback ergonomico de projeto ativo em `/target_prepare`.
- Evidencia observavel: `/target_prepare` sem argumento usa o projeto ativo atual, `/target_prepare <project-name>` continua operando sobre alvo explicito, e o runner registra de forma observavel o projeto solicitado versus o projeto efetivo quando aplicavel; testes automatizados cobrem ambos os caminhos.
- Requisito/RF/CA coberto: preservacao do baseline atual de `/target_checkup`.
- Evidencia observavel: `/target_checkup` continua aceitando sem argumento e com argumento explicito, sem regressao funcional ou editorial em help/documentacao/testes.
- Requisito/RF/CA coberto: fallback ergonomico de projeto ativo em `/target_derive_gaps` sem "ultimo report" implicito.
- Evidencia observavel: `/target_derive_gaps <report-path>` usa o projeto ativo atual; `/target_derive_gaps <project-name> <report-path>` continua valido; `/target_derive_gaps` sem argumentos continua falhando com orientacao de uso; nenhum caminho usa report implicito nem muda o projeto ativo.
- Requisito/RF/CA coberto: coerencia documental e contratual.
- Evidencia observavel: help `/start`, mensagens de uso, README e `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md` refletem o novo contrato; a spec deixa explicito que apenas o parametro `project-name` se torna opcional em `prepare` e `derive`, enquanto `report-path` segue obrigatorio em `derive`.
- Requisito/RF/CA coberto: fora de escopo preservado.
- Evidencia observavel: `/select_project` e `/select-project` continuam exigindo nome explicito e seus testes existentes permanecem coerentes; a mudanca nao altera a persistencia de projeto ativo nem introduz selecao implicita de outro projeto.

## Manual validation pending
- Entrega tecnica concluida: sim. O fallback para projeto ativo em `/target_prepare` e o fallback opcional de projeto em `/target_derive_gaps` foram implementados, documentados e validados por testes automatizados.
- Validacoes manuais externas ainda necessarias:
  - Exercitar `/target_prepare` sem argumento em Telegram real com um projeto ativo selecionado.
  - Exercitar `/target_derive_gaps <report-path>` em Telegram real com projeto ativo elegivel.
  - Confirmar a mensagem de bloqueio quando nao houver projeto ativo e o operador omitir `project-name`.
- Motivo para nao bloquear o aceite: a implementacao ficou coberta por suite automatizada focada em runner e Telegram, e o restante depende apenas de smoke operacional externo ao agente.

## Decision log
- 2026-03-24 - Ticket aberto a partir de solicitacao explicita de UX para alinhar comandos target com o conceito ja existente de projeto ativo global no Telegram, sem antecipar implementacao nesta rodada.
- 2026-03-25 - Implementacao concluida com fallback centralizado no `Runner`, parse atualizado no `TelegramController`, help/README/spec reconciliados e validacao automatizada verde.

## Closure
- Closed at (UTC): 2026-03-25 02:15Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-03-24-target-command-project-default-to-active-project.md
- Follow-up ticket (required when `Closure reason: split-follow-up`): n/a
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
