# ExecPlan - Selecao de velocidade do Codex via Telegram

## Purpose / Big Picture
- Objetivo: adicionar um comando Telegram para o operador escolher a velocidade do Codex no projeto ativo, traduzindo a UX `standard` vs `fast` para o contrato oficial de `service_tier` do Codex CLI.
- Resultado esperado:
  - existe um comando `/speed` no Telegram com selecao por clique no mesmo estilo de `/models` e `/reasoning`;
  - a escolha e persistida por projeto no estado runner-local, sem editar `~/.codex/config.toml`;
  - o cliente Codex injeta a configuracao necessaria nos proximos turnos e nos slots futuros do runner;
  - `/status`, `/start` e `README.md` refletem a nova preferencia;
  - a implementacao nao quebra compatibilidade com preferencias ja persistidas na versao atual do runner.
- Escopo:
  - evoluir o contrato de preferencias do Codex para incluir velocidade/service tier;
  - ler `service_tier` do `~/.codex/config.toml` como baseline quando nenhuma preferencia runner-local existir;
  - persistir a escolha por projeto com retrocompatibilidade do arquivo `.codex-flow-runner/codex-project-preferences.json`;
  - adicionar `/speed`, callbacks, stale handling, mensagens de status e testes automatizados;
  - injetar `service_tier` nas chamadas relevantes do Codex CLI quando aplicavel.
- Fora de escopo:
  - alterar os comandos `/models` e `/reasoning` alem do necessario para acomodar o novo contrato;
  - expor no Telegram todos os valores tecnicos de `service_tier` documentados pela OpenAI, como `flex`;
  - mudar autenticacao do Codex CLI, fluxo sequencial de tickets ou politica de slots;
  - alterar o catalogo local `~/.codex/models_cache.json`.

## Progress
- [x] 2026-03-13 19:34Z - Planejamento inicial, baseline local do codigo e pesquisa em documentacao oficial consolidados.
- [x] 2026-03-13 19:44Z - Contrato de preferencias do Codex extendido com velocidade e retrocompatibilidade persistida.
- [x] 2026-03-13 19:45Z - CLI do Codex e runner atualizados para aplicar a preferencia de velocidade.
- [x] 2026-03-13 19:47Z - Telegram, `/status`, `/start`, README e cobertura automatizada concluidos.
- [x] 2026-03-13 19:48Z - Validacao final (`npm test`, `npm run check`, `npm run build`) concluida.

## Surprises & Discoveries
- 2026-03-13 19:34Z - A documentacao oficial do Codex separa claramente "troca de modelo" de "Fast mode": fast mode e uma configuracao de `service_tier`, nao um modelo alternativo.
- 2026-03-13 19:34Z - O Codex CLI documenta override por chamada com `-c key=value`, e o projeto ja usa esse mecanismo para `model_reasoning_effort`, o que reduz risco de acoplamento novo.
- 2026-03-13 19:34Z - O `~/.codex/config.toml` local atual tem `model = "gpt-5.4"` e `model_reasoning_effort = "xhigh"`, mas nao possui `service_tier`; isso reduz risco imediato de conflito com configuracao global preexistente.
- 2026-03-13 19:34Z - O schema persistido atual de preferencias do Codex esta em versao `1` e guarda apenas `model` e `reasoningEffort`; adicionar velocidade sem migracao quebraria instalacoes existentes.
- 2026-03-13 19:34Z - O catalogo local de modelos nao expoe um campo explicito de suporte a fast mode; a disponibilidade por modelo precisara ser controlada por regra documentada no runner.
- 2026-03-13 19:34Z - O `codex-cli` local esta em `0.111.0`, entao o plano deve manter compatibilidade com a superficie atual de `exec`, `resume`, `--json` e `-c`.
- 2026-03-13 19:45Z - O caminho `standard` ficou viavel sem ambiguidade ao usar `-c features.fast_mode=false`; para `fast`, o cliente passou a enviar `-c features.fast_mode=true` junto com `-c service_tier="fast"`.
- 2026-03-13 19:46Z - O store legado em `version: 1` pode ser lido sem migracao destrutiva ao normalizar `speed: null` apenas em memoria e gravar `version: 2` na proxima persistencia.

## Decision Log
- 2026-03-13 - Decisao: expor a funcionalidade como `/speed`, e nao como `/fast`.
  - Motivo: o bot ja usa comandos de listagem/selecao (`/projects`, `/models`, `/reasoning`) e o novo comportamento segue o mesmo padrao de UX por lista e callback.
  - Impacto: reduz assimetria de interface e deixa o caminho aberto para outras velocidades/modos sem proliferar comandos.
- 2026-03-13 - Decisao: tratar velocidade como terceira preferencia por projeto do Codex, paralela a `model` e `reasoningEffort`.
  - Motivo: a feature afeta os mesmos pontos de resolucao, persistencia, snapshot por slot e reaplicacao em turnos futuros.
  - Impacto: `src/types/codex-preferences.ts`, `src/core/codex-preferences.ts`, store persistido, runner e Telegram serao evoluidos em conjunto.
- 2026-03-13 - Decisao: a UX do Telegram oferece apenas `standard` e `fast`, mesmo que a documentacao de `service_tier` mencione valores tecnicos adicionais.
  - Motivo: o pedido do produto e selecionar velocidade percebida pelo operador; expor `flex` neste primeiro momento aumentaria ambiguidade e area de suporte.
  - Impacto: valores tecnicos extras ficam fora da UI e, se necessarios, poderao ser tratados em iteracao futura.
- 2026-03-13 - Decisao: `fast` sera disponibilizado apenas quando o modelo ativo suportar fast mode segundo a baseline oficial atual, com allowlist inicial `gpt-5.4`.
  - Motivo: o catalogo local nao informa capacidade de fast mode; a pagina oficial de speed associa fast mode ao `GPT-5.4`.
  - Impacto: `/speed` precisa renderizar indisponibilidade clara quando o projeto estiver em outro modelo.
- 2026-03-13 - Decisao: manter retrocompatibilidade do estado persistido lendo registros legados sem velocidade e gravando o formato novo sem falha de bootstrap.
  - Motivo: o arquivo `.codex-flow-runner/codex-project-preferences.json` ja existe em ambientes reais e nao pode invalidar o runner apos upgrade.
  - Impacto: sera necessario suportar leitura/migracao de schema antigo antes de exigir o novo campo.
- 2026-03-13 - Decisao: a implementacao deve validar primeiro a semantica exata do caminho `standard` contra configuracoes globais com `service_tier = "fast"`.
  - Motivo: a documentacao pesquisada confirma `service_tier = "fast"` e lista `flex | fast` no config reference, mas nao documenta um literal `standard` para override por chamada.
  - Impacto: o executor deve provar em teste/experimento local qual mapeamento e seguro; se nao houver override nao ambiguo para "voltar ao padrao", o bot deve documentar explicitamente que um `service_tier = "fast"` top-level no `~/.codex/config.toml` continua prevalecendo.
- 2026-03-13 - Decisao: materializar `standard` com `-c features.fast_mode=false` e `fast` com `-c features.fast_mode=true` + `-c service_tier="fast"`.
  - Motivo: isso elimina a ambiguidade de um `service_tier = "fast"` global no `~/.codex/config.toml` e mantem a escolha por turno sob controle do runner.
  - Impacto: o cliente Codex agora injeta uma configuracao explicita de fast mode sempre que a preferencia de velocidade estiver resolvida.

## Outcomes & Retrospective
- Status final: implementacao concluida e validada.
- O que funcionou: a arquitetura existente de preferencias por projeto acomodou `speed` com pouca friccao; o padrao de callbacks de `/models` e `/reasoning` foi reutilizado para `/speed`; a compatibilidade do store legado foi mantida com leitura normalizada e escrita em `version: 2`.
- O que ficou pendente: nenhuma pendencia tecnica obrigatoria foi deixada neste execplan.
- Proximos passos: avaliar, em iteracao futura, se vale expor outras opcoes tecnicas de `service_tier` ou metadata dinamica de suporte a fast mode por modelo.

## Context and Orientation
- Arquivos principais:
  - `src/types/codex-preferences.ts` - contrato tipado de preferencias resolvidas e observadas do Codex.
  - `src/core/codex-preferences.ts` - precedencia runner-local -> `~/.codex/config.toml` -> defaults do catalogo.
  - `src/integrations/codex-config.ts` - leitura atual de `model` e `model_reasoning_effort` no top-level do TOML.
  - `src/integrations/codex-project-preferences-store.ts` - persistencia runner-local versionada em `.codex-flow-runner/codex-project-preferences.json`.
  - `src/integrations/codex-client.ts` - montagem de argumentos `codex exec` / `codex exec resume`; hoje injeta apenas `-m <model>` e `-c model_reasoning_effort=...`.
  - `src/core/runner.ts` - API consumida pela camada Telegram para listar/selecionar preferencias do projeto ativo.
  - `src/integrations/telegram-bot.ts` - comandos `/models`, `/reasoning`, `/start` e `/status`, que servem como molde para `/speed`.
  - `src/integrations/telegram-bot.test.ts`, `src/core/codex-preferences.test.ts`, `src/integrations/codex-client.test.ts`, `src/integrations/codex-project-preferences-store.test.ts` - suites que precisam ser atualizadas.
- Fluxo atual:
  - o projeto ativo resolve preferencias do Codex por projeto;
  - `/models` e `/reasoning` oferecem selecao paginada com callbacks stale-aware;
  - o runner congela um snapshot de preferencias por slot de ticket e reutiliza o snapshot nos turnos subsequentes daquele slot;
  - `/status` mostra as preferencias resolvidas do projeto ativo, mas nao possui hoje um bloco de velocidade/service tier.
- Restricoes tecnicas:
  - TypeScript em Node.js 20+, sem dependencias novas;
  - manter fluxo sequencial de tickets;
  - nao alterar `~/.codex/config.toml`; a feature deve continuar runner-local;
  - a disponibilidade de fast mode por modelo nao vem do catalogo local, entao a regra precisa estar explicitamente codificada e documentada.
- Baseline oficial obrigatoria:
  - Speed / Fast mode: `https://developers.openai.com/codex/speed`
  - CLI reference (`-c key=value`): `https://developers.openai.com/codex/cli/reference`
  - Config reference (`service_tier`): `https://developers.openai.com/codex/config-reference`

## Plan of Work
- Milestone 1: Contrato e persistencia de velocidade no core.
  - Entregavel: preferencias do Codex passam a carregar velocidade/service tier com precedencia coerente e retrocompatibilidade do store existente.
  - Evidencia de conclusao: testes do store e do resolver comprovam leitura de estado legado, gravacao do estado novo e resolucao da velocidade para o projeto ativo.
  - Arquivos esperados: `src/types/codex-preferences.ts`, `src/core/codex-preferences.ts`, `src/integrations/codex-config.ts`, `src/integrations/codex-project-preferences-store.ts`, testes correlatos.
- Milestone 2: Aplicacao da preferencia no Codex CLI e no runner.
  - Entregavel: o snapshot de preferencias por slot inclui velocidade; o cliente Codex aplica a preferencia nas chamadas `exec` e `exec resume` quando apropriado.
  - Evidencia de conclusao: testes do cliente comprovam a presenca/ausencia do override de velocidade conforme a preferencia resolvida.
  - Arquivos esperados: `src/integrations/codex-client.ts`, `src/integrations/codex-client.test.ts`, `src/core/runner.ts`.
- Milestone 3: UX Telegram, status e documentacao.
  - Entregavel: `/speed` funciona com callbacks, mensagens claras, stale handling, disponibilidade condicionada ao modelo atual e reflexo em `/start`, `/status` e `README.md`.
  - Evidencia de conclusao: testes do Telegram cobrem listagem, selecao, stale e indisponibilidade; README e ajuda do bot listam o novo comando.
  - Arquivos esperados: `src/integrations/telegram-bot.ts`, `src/integrations/telegram-bot.test.ts`, `README.md`.
- Milestone 4: Validacao e fechamento tecnico.
  - Entregavel: suite direcionada e suite completa verdes, com diff restrito ao escopo da feature.
  - Evidencia de conclusao: `npm test`, `npm run check` e `npm run build` executam sem regressao.
  - Arquivos esperados: sem novos arquivos alem dos alterados nos milestones anteriores.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "CodexInvocationPreferences|reasoningEffort|codex-project-preferences|/models|/reasoning|service_tier" src README.md` para reconfirmar todos os pontos de contrato atingidos pela feature.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/types/codex-preferences.ts` para incluir o novo campo de velocidade/service tier nas estruturas resolvidas, persistidas e de snapshot consumidas pelo runner e pelo cliente Codex.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-config.ts` para ler `service_tier` do top-level do `~/.codex/config.toml`, preservando o parser simples atual.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-project-preferences-store.ts` para suportar o novo campo com retrocompatibilidade de leitura do schema atual e escrita atomica do schema novo.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/codex-preferences.ts` para resolver velocidade com a mesma ordem de precedencia das demais preferencias, aplicar a allowlist inicial de fast mode por modelo e expor operacoes `list/select` equivalentes.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Validar a semantica do caminho `standard` na camada de invocacao do Codex CLI usando a baseline oficial e testes locais de argumentos; se nao houver override nao ambiguo para anular `service_tier = "fast"` global, registrar a limitacao explicitamente no codigo e na documentacao desta feature.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/codex-client.ts` para incluir o override de velocidade nos helpers de argumentos de `exec` e `exec resume`, sem afetar `model` e `model_reasoning_effort`.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/core/runner.ts` para expor `list/select` de velocidade do projeto ativo e incluir a nova preferencia no snapshot congelado por slot.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `src/integrations/telegram-bot.ts` para adicionar `/speed`, contextos/callbacks dedicados, renderizacao paginada ou enxuta, replies de sucesso/erro/stale e mensagens de indisponibilidade quando fast nao for suportado pelo modelo atual.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar `/start`, o bloco de preferencias do `/status` e `README.md` para mencionar a nova preferencia e seu comportamento por projeto.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Adicionar ou ajustar testes em `src/integrations/codex-project-preferences-store.test.ts`, `src/core/codex-preferences.test.ts`, `src/integrations/codex-client.test.ts` e `src/integrations/telegram-bot.test.ts`.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npx tsx --test src/integrations/codex-project-preferences-store.test.ts src/core/codex-preferences.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` para validacao direcionada da feature.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm test` para regressao completa da suite.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run check` para validar tipagem e contratos.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `npm run build` para validar empacotamento.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/types/codex-preferences.ts src/core/codex-preferences.ts src/integrations/codex-config.ts src/integrations/codex-project-preferences-store.ts src/integrations/codex-client.ts src/core/runner.ts src/integrations/telegram-bot.ts README.md` para auditoria final de escopo.

## Validation and Acceptance
- Comando: `npx tsx --test src/integrations/codex-project-preferences-store.test.ts src/core/codex-preferences.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts`
  - Esperado: testes da feature passam e comprovam schema retrocompativel, resolucao da velocidade, injecao de argumentos CLI e UX Telegram.
- Comando: `npm test`
  - Esperado: suite completa verde sem regressao dos fluxos existentes de `/models`, `/reasoning`, `/codex_chat`, `/plan_spec` e slots de ticket.
- Comando: `npm run check`
  - Esperado: sem erros de tipo ou contrato.
- Comando: `npm run build`
  - Esperado: build concluida com sucesso.
- Evidencias funcionais adicionais:
  - `/start` passa a listar `/speed`.
  - `/speed` mostra o projeto ativo, a velocidade atual e a disponibilidade do modo `fast`.
  - quando o modelo ativo for `gpt-5.4`, selecionar `fast` resulta em argumentos do Codex CLI contendo override de `service_tier` coerente com a decisao implementada;
  - quando o modelo ativo nao suportar fast mode, a UI orienta claramente o operador e nao promete selecao impossivel;
  - um arquivo legado `.codex-flow-runner/codex-project-preferences.json` sem campo de velocidade continua carregando sem erro.

## Idempotence and Recovery
- Idempotencia:
  - a leitura do store legado deve continuar segura em repetidas execucoes;
  - reexecutar testes e comandos de validacao nao altera dados de negocio nem tickets;
  - a selecao de velocidade deve afetar apenas turnos futuros, sem interromper slot ou sessao interativa em andamento.
- Riscos:
  - interpretacao incorreta do caminho `standard` se a CLI nao oferecer override claro contra `service_tier = "fast"` no config global;
  - quebrar retrocompatibilidade do arquivo persistido ao endurecer schema sem migracao;
  - prometer `fast` para modelos sem suporte oficial por falta de metadata no catalogo local.
- Recovery / Rollback:
  - se a semantica de `standard` permanecer ambigua, limitar a feature a `fast` explicito + `standard` apenas como estado sem override e documentar a precedencia do config global;
  - se o schema novo causar falha de leitura, restaurar temporariamente compatibilidade de parser antes de insistir no novo campo;
  - se a UI do Telegram regredir, reverter apenas `/speed` e o novo campo de preferencias, preservando `/models` e `/reasoning`.

## Artifacts and Notes
- ExecPlan de origem desta iteracao: este arquivo.
- Referencias oficiais usadas na pesquisa:
  - `https://developers.openai.com/codex/speed`
  - `https://developers.openai.com/codex/cli/reference`
  - `https://developers.openai.com/codex/config-reference`
- Referencias locais relevantes:
  - `docs/specs/2026-03-13-selecao-dinamica-de-modelo-e-reasoning-do-codex-via-telegram.md`
  - `src/integrations/codex-client.ts`
  - `src/core/codex-preferences.ts`
  - `src/integrations/telegram-bot.ts`
- Evidencias esperadas durante a execucao:
  - diff dos tipos e do store persistido;
  - logs de selecao de velocidade no runner/Telegram;
  - saida verde dos testes direcionados e da suite completa.

## Interfaces and Dependencies
- Interfaces alteradas:
  - `CodexInvocationPreferences` e estruturas resolvidas/persistidas correlatas;
  - `CodexPreferencesService` e API do runner para listagem/selecao da nova preferencia;
  - callbacks/contextos e rendering de comandos Telegram.
- Compatibilidade:
  - o runner deve continuar lendo estado legado sem exigir apagao manual do arquivo `.codex-flow-runner/codex-project-preferences.json`;
  - fluxos existentes de modelo e reasoning devem permanecer intactos;
  - a feature deve continuar respeitando o snapshot por slot ja usado em `/run_all`, `/run_specs` e execucao unitaria de ticket.
- Dependencias externas e mocks:
  - Codex CLI `0.111.0` ou compativel com `-c key=value`;
  - documentacao oficial de speed/config reference como baseline de comportamento;
  - testes devem seguir com doubles locais, sem chamadas reais ao Telegram nem ao Codex.
