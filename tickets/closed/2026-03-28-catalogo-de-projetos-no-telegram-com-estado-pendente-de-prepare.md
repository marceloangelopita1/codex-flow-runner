# [TICKET] `/projects` não expõe repositórios Git pendentes de `prepare` no catálogo do Telegram

## Metadata
- Status: closed
- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`
- Priority: P1
- Severity: S2
- Created at (UTC): 2026-03-28 16:47Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Analysis stage (when applicable): product-refinement
- Active project (when applicable): codex-flow-runner
- Target repository (when applicable): codex-flow-runner
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md
- Source spec canonical path (when applicable): docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md
- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, RF-09, RF-10; CA-01, CA-02, CA-03, CA-04, CA-05, CA-06.
- Inherited assumptions/defaults (when applicable): o v1 continua assumindo ao menos um projeto elegível em `PROJECTS_ROOT_PATH`; `pending_prepare` é estado operacional de catálogo, não nova categoria canônica; promoção para `eligible` só ocorre após `/target_prepare` bem-sucedido; diretórios sem `.git` continuam fora do catálogo.
- Inherited RNFs (when applicable): preservar fluxo sequencial; manter o contrato de projeto ativo restrito a itens elegíveis; reduzir retrabalho e melhorar descoberta operacional no Telegram sem aumentar heurística frouxa.
- Inherited technical/documentary constraints (when applicable): preservar descoberta apenas no primeiro nível de `PROJECTS_ROOT_PATH`; não aceitar caminhos arbitrários; não tornar itens `pending_prepare` selecionáveis como projeto ativo; não alterar o contrato binário documentado em `docs/workflows/target-project-compatibility-contract.md`; refletir a mudança na documentação pública/canônica tocada.
- Inherited pending/manual validations (when applicable): validar a UX final em Telegram real com um item `pending_prepare` e um item `eligible` visíveis; validar manualmente a transição observável `pending_prepare -> eligible` após `/target_prepare` bem-sucedido.
- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a
- Smallest plausible explanation (audit/review only): n/a
- Remediation scope (audit/review only): n/a
- Related artifacts:
  - Request file:
  - Response file:
  - Decision file:
- Related docs/execplans:
  - docs/specs/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md
  - docs/specs/2026-02-19-telegram-multi-project-active-selection.md
  - docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md
  - docs/workflows/target-project-compatibility-contract.md
  - INTERNAL_TICKETS.md
  - PLANS.md

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): prioridade manual P1 porque o fluxo `/target_prepare` já existe, mas sua descoberta no plano de controle está incompleta e induz fricção recorrente de onboarding.

## Context
- Workflow area: catálogo de projetos no Telegram, seleção de projeto ativo e onboarding por `/target_prepare`.
- Scenario: operador usa `/projects` como porta de entrada do plano de controle e espera encontrar tanto projetos já operáveis quanto repositórios Git irmãos que ainda precisam passar por `prepare`.
- Input constraints: manter a elegibilidade operacional do projeto ativo inalterada; não criar categoria canônica nova; manter descoberta somente no primeiro nível de `PROJECTS_ROOT_PATH`.

## Problem statement
O runner hoje esconde no Telegram justamente os repositórios Git irmãos que já são candidatos válidos para `/target_prepare`. Como `/projects` só lista itens com `.git` e `tickets/open/`, o catálogo não comunica o estado “pendente de `prepare`” e gera a impressão errada de que é necessário criar manualmente `tickets/open/` antes de usar o onboarding controlado.

## Observed behavior
- O que foi observado:
  - `src/integrations/project-discovery.ts` lista apenas projetos elegíveis (`.git` + `tickets/open/`);
  - `src/core/project-selection.ts` usa essa mesma visão restrita para o snapshot entregue a `/projects`;
  - `src/integrations/telegram-bot.ts` renderiza `/projects` como “Projetos elegíveis” e assume que cada item da lista é selecionável como projeto ativo;
  - `src/integrations/target-project-resolver.ts` já conhece o caso “repo Git ainda inelegível para `/projects`”, mas essa informação não aparece no catálogo;
  - no ambiente atual, `../guiadomus-enrich-matricula` tem `.git`, está no primeiro nível de `PROJECTS_ROOT_PATH`, mas não possui `tickets/open/`, então não aparece em `/projects` apesar de ser um alvo válido para `/target_prepare`.
- Frequencia (unico, recorrente, intermitente): recorrente sempre que um projeto Git irmão ainda não passou por `prepare`.
- Como foi detectado (warning/log/test/assert): leitura direta de `src/integrations/project-discovery.ts`, `src/core/project-selection.ts`, `src/integrations/telegram-bot.ts`, `src/integrations/target-project-resolver.ts` e inspeção local de `../guiadomus-enrich-matricula`.

## Expected behavior
`/projects` deve funcionar como catálogo operacional mais rico, distinguindo itens `eligible` de itens `pending_prepare`. Apenas itens `eligible` seguem selecionáveis como projeto ativo; itens `pending_prepare` devem aparecer com estado claro e com caminho seguro para iniciar `/target_prepare`, sem exigir criação manual de `tickets/open/` e sem mudar implicitamente o projeto ativo.

## Reproduction steps
1. Ler `src/integrations/project-discovery.ts` e confirmar que o catálogo atual só nasce de `listEligibleProjects(...)`.
2. Ler `src/core/project-selection.ts` e confirmar que `listProjects()` depende do mesmo conjunto estrito de projetos elegíveis.
3. Ler `src/integrations/telegram-bot.ts` e confirmar que `buildProjectsReply(...)` rotula a lista como “Projetos elegíveis” e trata todos os itens como seleção de projeto ativo.
4. Ler `src/integrations/target-project-resolver.ts` e confirmar que `/target_prepare` já aceita um repositório Git irmão ainda inelegível em `/projects`.
5. Inspecionar `../guiadomus-enrich-matricula` e confirmar a combinação `.git` presente + `tickets/open/` ausente.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a
- Warnings/codes relevantes:
  - `src/integrations/project-discovery.ts`: critério atual de catálogo depende de `.git` e `tickets/open/`.
  - `src/core/project-selection.ts`: `/projects` hoje recebe apenas projetos elegíveis.
  - `src/integrations/telegram-bot.ts`: a UI atual do catálogo só contempla seleção de projeto ativo.
  - `src/integrations/target-project-resolver.ts`: já existe o conceito operacional de alvo válido para `prepare` sem elegibilidade em `/projects`.
  - `../guiadomus-enrich-matricula`: repositório Git irmão existente e oculto do catálogo por falta de `tickets/open/`.
- Comparativo antes/depois (se houver): antes = o catálogo esconde alvos válidos para onboarding e empurra o operador para tentativa e erro; depois esperado = `/projects` mostra o estado pendente de `prepare`, preserva a segurança da seleção ativa e expõe a próxima ação correta.

## Impact assessment
- Impacto funcional: o plano de controle do Telegram não representa corretamente todos os alvos operacionais já suportados pelo runner.
- Impacto operacional: aumenta confusão no onboarding, incentiva workaround manual em `tickets/open/` e reduz descobribilidade do `/target_prepare`.
- Risco de regressao: médio, porque a mudança toca descoberta, snapshot de catálogo, renderização do Telegram e guardrails de seleção.
- Scope estimado (quais fluxos podem ser afetados): `src/integrations/project-discovery.ts`, `src/types/project.ts`, `src/core/project-selection.ts`, `src/integrations/telegram-bot.ts`, `src/main.ts`, testes dessas camadas e documentação pública/canônica de `/projects` e `/target_prepare`.

## Initial hypotheses (optional)
- A menor entrega segura não relaxa a elegibilidade do projeto ativo; ela cria um catálogo mais rico, com estado `pending_prepare`, e um CTA observável para `target_prepare`.
- A fundação mais segura é separar “catálogo de projetos” de “resolução do projeto ativo”, em vez de sobrecarregar `resolveActiveProject(...)`.

## Proposed solution (optional)
Introduzir um modelo explícito de catálogo para `/projects`, diferenciando `eligible` e `pending_prepare`; manter a seleção ativa restrita aos elegíveis; bloquear `/select_project` para itens pendentes com mensagem acionável; e acoplar a experiência de `/projects` a um CTA seguro para `/target_prepare`, com atualização observável do estado após preparo bem-sucedido.

## Closure criteria
- Requisito/RF/CA coberto: RF-01, RF-02, RF-03; CA-01.
- Evidencia observavel: existe camada de catálogo que distingue explicitamente itens `eligible` e `pending_prepare` no primeiro nível de `PROJECTS_ROOT_PATH`, mantendo diretórios sem `.git` fora da listagem; testes cobrem a presença simultânea de itens elegíveis e pendentes no snapshot entregue ao Telegram.
- Requisito/RF/CA coberto: RF-04, RF-05, RF-06; CA-02, CA-03, CA-05.
- Evidencia observavel: `/projects` renderiza marcadores distintos por estado; itens pendentes não viram projeto ativo por clique nem por `/select_project`; a resposta inclui CTA seguro para `target_prepare`; testes cobrem bloqueio de seleção e preservação do projeto ativo.
- Requisito/RF/CA coberto: RF-07, RF-08; CA-04.
- Evidencia observavel: após `/target_prepare` bem-sucedido em um item antes `pending_prepare`, uma nova leitura de `/projects` mostra esse mesmo item como elegível, sem criação manual de `tickets/open/`; testes automatizados e uma validação manual em Telegram real cobrem a transição.
- Requisito/RF/CA coberto: RF-09, RF-10; CA-06.
- Evidencia observavel: `README.md`, help do bot e demais contratos tocados pela mudança explicam a diferença entre catálogo operacional e elegibilidade do workflow completo, sem redefinir “projeto elegível”.

## Decision log
- 2026-03-28 - Ticket aberto a partir de necessidade explícita do operador: tornar visível, em `/projects`, o estado de repositórios Git irmãos que já são válidos para `/target_prepare` mas ainda não para seleção ativa.

## Closure
- Closed at (UTC): 2026-03-28 17:07Z
- Closure reason: fixed
- Related PR/commit/execplan: execplans/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md; working tree local (sem commit nesta execução)
- Follow-up ticket (required when `Closure reason: split-follow-up`):
- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.
