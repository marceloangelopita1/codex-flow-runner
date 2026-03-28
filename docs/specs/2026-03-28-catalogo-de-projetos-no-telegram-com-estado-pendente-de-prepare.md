# [SPEC] Catálogo de projetos no Telegram com estado pendente de `prepare`

## Metadata
- Spec ID: 2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare
- Status: partially_attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-03-28 16:47Z
- Last reviewed at (UTC): 2026-03-28 17:07Z
- Source: product-need
- Related tickets:
  - tickets/closed/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md
- Related execplans:
  - execplans/2026-03-28-catalogo-de-projetos-no-telegram-com-estado-pendente-de-prepare.md
- Related commits:
  - A definir
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve: o controle `/projects` hoje mistura descoberta com operabilidade plena. Com isso, um diretório irmão Git válido para `/target_prepare`, mas ainda sem `tickets/open/`, fica invisível no Telegram e passa a impressão errada de que o operador precisa criar a estrutura manualmente antes de conseguir usar o onboarding controlado.
- Resultado esperado: `/projects` passa a exibir, no mesmo catálogo, tanto projetos já elegíveis para o workflow completo quanto repositórios Git irmãos pendentes de `prepare`, com estado observável e CTA seguro, sem relaxar o contrato de seleção do projeto ativo.
- Contexto funcional:
  - a descoberta atual de `/projects` segue o contrato histórico de projeto elegível (`.git` + `tickets/open/`), conforme a spec de multi-projeto;
  - `/target_prepare` já aceita explicitamente um repositório Git irmão ainda inelegível em `/projects`, conforme a spec de onboarding readiness;
  - o gap atual é de catálogo e UX no plano de controle do Telegram, não de capacidade técnica do fluxo `prepare`;
  - esta evolução não cria uma terceira categoria canônica de compatibilidade; ela apenas torna explícito, na listagem, o estado operacional “pendente de `prepare`”.
- Restrições técnicas relevantes:
  - preservar a descoberta somente no primeiro nível de `PROJECTS_ROOT_PATH`;
  - manter a regra de que apenas projeto elegível pode virar projeto ativo;
  - não transformar `/projects` em resolvedor de caminhos arbitrários;
  - não reabrir o contrato binário de compatibilidade definido em `docs/workflows/target-project-compatibility-contract.md`.

## Jornada de uso
1. Operador autorizado envia `/projects` no Telegram.
2. O bot lista projetos elegíveis e repositórios Git irmãos pendentes de `prepare`, cada um com estado visual explícito.
3. Para um item elegível, o operador continua podendo selecioná-lo como projeto ativo.
4. Para um item pendente de `prepare`, o bot oferece uma ação segura e observável para iniciar o onboarding, sem exigir criação manual de `tickets/open/`.
5. Após `/target_prepare` bem-sucedido, o operador executa `/projects` novamente e vê o repositório promovido para a categoria elegível.

## Requisitos funcionais
- RF-01: a camada de catálogo de projetos deve distinguir explicitamente, entre os diretórios irmãos de primeiro nível, pelo menos os estados `eligible` e `pending_prepare`.
- RF-02: `pending_prepare` deve significar “diretório irmão com `.git`, mas ainda sem `tickets/open/`”, sem inferência semântica adicional.
- RF-03: `/projects` deve listar os dois estados no mesmo catálogo paginado, com marcadores editoriais observáveis e texto curto explicando a diferença operacional.
- RF-04: apenas itens `eligible` podem ser selecionados como projeto ativo por callback de `/projects` ou por `/select_project`.
- RF-05: quando o operador tentar selecionar um item `pending_prepare`, o bot deve bloquear a troca de projeto e devolver uma próxima ação explícita para iniciar `/target_prepare`.
- RF-06: a própria experiência de `/projects` deve expor um CTA seguro para `target_prepare` dos itens `pending_prepare`, sem exigir que o operador descubra o nome do diretório apenas por tentativa e erro.
- RF-07: depois de um `/target_prepare` bem-sucedido, o item antes marcado como `pending_prepare` deve aparecer como `eligible` na próxima leitura de `/projects`, sem criação manual prévia de `tickets/open/`.
- RF-08: a evolução deve preservar o contrato atual de projeto ativo, o resolvedor explícito de `/target_prepare` e o contrato binário documentado em `docs/workflows/target-project-compatibility-contract.md`.
- RF-09: diretórios sem `.git` devem continuar fora do catálogo de `/projects`.
- RF-10: a documentação pública e canônica do runner deve refletir que `/projects` agora é um catálogo operacional com dois estados de listagem, sem diluir a definição de “projeto elegível”.

## Assumptions and defaults
- O v1 desta evolução continua assumindo que existe ao menos um projeto elegível em `PROJECTS_ROOT_PATH`, normalmente o próprio `codex-flow-runner`; aceitar bootstrap sem nenhum projeto elegível fica fora de escopo deste recorte.
- O estado `pending_prepare` é estritamente operacional e não substitui as categorias canônicas “projeto elegível para descoberta” e “projeto compatível com o workflow completo”.
- A promoção de `pending_prepare` para `eligible` continua dependendo do fluxo real de `/target_prepare`; a mera presença no catálogo não altera estado do projeto.
- O CTA de `prepare` pode ser implementado por callback dedicado ou affordance equivalente, desde que a ação resultante seja segura, observável e não mude implicitamente o projeto ativo.

## Nao-escopo
- Relaxar a definição de projeto elegível para o workflow completo.
- Tornar repositórios `pending_prepare` selecionáveis como projeto ativo antes do preparo.
- Descobrir diretórios aninhados fora do primeiro nível de `PROJECTS_ROOT_PATH`.
- Exibir diretórios que não sejam repositórios Git.
- Redefinir o contrato de `/target_prepare`, `target_checkup` ou `target_derive_gaps` além do necessário para integração com o catálogo.
- Suportar, neste recorte, bootstrap do runner em modo “somente catálogo” sem nenhum projeto elegível.

## Criterios de aceitacao (observaveis)
- [x] CA-01 - Com `codex-flow-runner` elegível e `guiadomus-enrich-matricula` contendo `.git` mas sem `tickets/open/`, `/projects` lista ambos no Telegram com estados visuais distintos.
- [x] CA-02 - Clicar ou tentar selecionar um item `pending_prepare` não altera o projeto ativo e retorna uma orientação acionável para `target_prepare`.
- [x] CA-03 - O catálogo oferece um CTA seguro para iniciar `target_prepare` a partir de um item `pending_prepare`, sem exigir criação manual de `tickets/open/`.
- [x] CA-04 - Após `/target_prepare` bem-sucedido para um projeto anteriormente `pending_prepare`, uma nova execução de `/projects` mostra esse item como elegível.
- [x] CA-05 - `/select_project <nome>` para um item `pending_prepare` retorna bloqueio explícito, preserva o projeto ativo atual e informa a próxima ação correta.
- [x] CA-06 - `README.md`, help do bot e contratos canônicos tocados pela evolução explicam a diferença entre item elegível e item pendente de `prepare`, sem alterar a definição de projeto elegível.

## Gate de validacao dos tickets derivados
- Veredito atual: n/a
- Gaps encontrados:
  - n/a
- Correções aplicadas:
  - n/a
- Causa-raiz provável:
  - n/a
- Ciclos executados:
  - n/a
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta seção apenas com o veredito, os gaps, as correções e o histórico funcional do gate formal; fora desse fluxo, registrar `n/a` quando não se aplicar.
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
- Nota de uso: quando esta spec vier de `/run_specs`, esta seção deve registrar a retrospectiva pre-run-all como superfície distinta do gate funcional e continua canônica mesmo quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`. Com a flag desligada, a seção pode permanecer `n/a` e não recebe write-back automático. Se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e a execução ocorrer no próprio `codex-flow-runner`, write-back nesta seção é permitido. Em projeto externo, a fonte observável desta fase é trace/log/resumo, e não a spec do projeto alvo.
- Política anti-duplicação: a retrospectiva sistêmica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto histórico, mas não deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - validar a UX final de `/projects` em Telegram real com ao menos um item `pending_prepare` e um item `eligible` na mesma página;
  - validar o comportamento do CTA de `prepare` em Telegram real para evitar acionamento acidental ou ambíguo.
- Validações manuais pendentes:
  - confirmar, em ambiente real, a transição observável `pending_prepare -> eligible` após `/target_prepare` bem-sucedido em um projeto alvo real.

## Status de atendimento (documento vivo)
- Estado geral: partially_attended
- Itens atendidos:
  - o runner já possui fluxo `/target_prepare [project-name]` para repositório Git irmão ainda inelegível;
  - o contrato binário de compatibilidade do projeto alvo já está documentado em `docs/workflows/target-project-compatibility-contract.md`;
  - `/projects` passou a expor um catálogo operacional com estados `eligible` e `pending_prepare`;
  - o catálogo do Telegram agora bloqueia seleção ativa de itens pendentes e expõe CTA segura para `/target_prepare`;
  - a próxima leitura de `/projects` após `target_prepare` bem-sucedido promove o item para elegível em testes automatizados;
  - a documentação pública foi reconciliada com a nova distinção entre elegibilidade e catálogo.
- Pendências em aberto:
  - executar smoke manual em Telegram real para validar a UX final e a transição observável em ambiente interativo.
- Evidências de validação:
  - `docs/specs/2026-02-19-telegram-multi-project-active-selection.md`
  - `docs/specs/2026-03-24-onboarding-readiness-e-derivacao-de-gaps-para-projeto-alvo.md`
  - `docs/workflows/target-project-compatibility-contract.md`
  - `src/integrations/project-discovery.ts`
  - `src/core/project-selection.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/project-discovery.test.ts`
  - `src/core/project-selection.test.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/target-project-resolver.ts`
  - `README.md`

## Auditoria final de entrega
- Auditoria executada em: 2026-03-28 17:07Z
- Resultado: implementação local concluída com cobertura automatizada; smoke manual em Telegram real ainda pendente
- Tickets/follow-ups abertos a partir da auditoria:
  - n/a
- Causas-raiz sistêmicas identificadas:
  - n/a
- Ajustes genéricos promovidos ao workflow:
  - n/a

## Riscos e impacto
- Risco funcional: confundir “listado no catálogo” com “selecionável para o workflow completo”.
- Risco operacional: um CTA de `prepare` mal desenhado pode disparar uma mutação pesada de forma pouco explícita.
- Mitigação:
  - manter seleção do projeto ativo restrita a itens `eligible`;
  - tornar o estado `pending_prepare` editorialmente claro;
  - exigir CTA/confirmacão observável para `prepare`;
  - cobrir em testes a não alteração do projeto ativo e a transição de estado após `target_prepare`.

## Decisoes e trade-offs
- 2026-03-28 - Tratar `pending_prepare` como estado de catálogo, não como nova categoria canônica de compatibilidade. Motivo: melhorar UX sem diluir o contrato já documentado.
- 2026-03-28 - Preservar a definição de projeto elegível para seleção ativa (`.git` + `tickets/open/`) e atacar a dor por catálogo/CTA. Motivo: reduzir risco de regressão no runner e manter a fronteira operacional explícita.
- 2026-03-28 - Manter diretórios sem `.git` fora do catálogo. Motivo: evitar ruído operacional no Telegram e focar apenas em alvos plausíveis para `target_prepare`.

## Historico de atualizacao
- 2026-03-28 16:47Z - Versão inicial da spec criada a partir da necessidade de tornar visível, em `/projects`, o estado de repositórios Git irmãos pendentes de `prepare`.
- 2026-03-28 17:07Z - Implementação local concluída com catálogo `eligible`/`pending_prepare`, CTA de `/target_prepare`, documentação reconciliada e validação automatizada; smoke manual em Telegram real permanece pendente.
