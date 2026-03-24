# [SPEC] Retomada do fluxo de spec a partir da validação com `/run_specs_from_validation`

## Metadata
- Spec ID: 2026-03-24-retomada-do-run-specs-a-partir-da-validacao
- Status: approved
- Spec treatment: pending
- Owner:
- Created at (UTC): 2026-03-24 17:51Z
- Last reviewed at (UTC): 2026-03-24 17:51Z
- Source: technical-evolution
- Related tickets:
  - Nenhum neste ciclo.
- Related execplans:
  - Nenhum neste ciclo.
- Related commits:
  - Não registrado neste workspace.
- Fluxo derivado canonico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessario.

## Objetivo e contexto
- Problema que esta spec resolve: hoje o operador consegue reiniciar uma spec apenas pelo caminho completo de `/run_specs <arquivo>`, que sempre volta para `spec-triage`. Quando o pacote derivado para em `NO_GO` em `spec-ticket-validation` e o operador corrige manualmente os tickets abertos, ainda não existe um comando canônico para pedir que o runner continue dali usando o backlog atual, sem retriagem e sem risco de sobrescrever o trabalho manual.
- Resultado esperado: o runner passa a expor um novo comando Telegram `/run_specs_from_validation <arquivo-da-spec.md>` que reutiliza a spec atual e os tickets abertos já derivados, pula `spec-triage`, reexecuta `spec-ticket-validation` e, se houver `GO`, continua o mesmo fluxo já conhecido de `spec-close-and-version -> /run_all -> spec-audit`.
- Contexto funcional: o novo comando deve existir como caminho explícito de recuperação operacional para casos em que a spec continua válida, mas o backlog derivado foi ajustado manualmente após um `NO_GO` ou após uma revisão humana do pacote de tickets.
- Restricoes tecnicas relevantes:
  - manter o fluxo sequencial por projeto, sem paralelização de tickets ou specs dentro do mesmo projeto;
  - preservar `/run_specs <arquivo>` como caminho canônico de retriagem completa da spec;
  - o novo comando deve iniciar diretamente em `spec-ticket-validation`, sem executar `spec-triage`;
  - a validação deve reconstruir o pacote a partir da spec e dos tickets abertos atuais, usando a mesma lógica de linhagem já existente no runner;
  - o primeiro passe de `spec-ticket-validation` continua exigindo contexto novo em relação a execuções anteriores;
  - o novo comando não deve criar, apagar ou regenerar tickets antes da validação;
  - a primeira versão deve ser textual no Telegram, sem adicionar botão novo em `/specs`.

## Jornada de uso
1. Uma spec elegível já passou por `/run_specs`, derivou tickets e o gate `spec-ticket-validation` terminou em `NO_GO` ou exigiu revisão humana do backlog derivado.
2. O operador ajusta manualmente os tickets abertos relacionados à spec, preservando a linhagem por `Source spec` e/ou `Related tickets`.
3. O operador envia `/run_specs_from_validation <arquivo-da-spec.md>` no projeto ativo.
4. O bot valida acesso, formato do argumento, elegibilidade da spec, concorrência do slot e a existência de pelo menos um ticket aberto derivado da spec.
5. O runner inicia o fluxo diretamente em `spec-ticket-validation`, reconstruindo o pacote derivado a partir da spec e dos tickets abertos atuais, sem executar `spec-triage`.
6. Se o gate continuar em `NO_GO`, o fluxo encerra antes de `spec-close-and-version` e antes do `/run_all`, com resumo final e próxima ação apontando para nova correção do backlog e reexecução de `/run_specs_from_validation`.
7. Se o gate chegar a `GO`, o runner executa `spec-ticket-derivation-retrospective` quando aplicável, depois segue para `spec-close-and-version`, encadeia `/run_all`, conclui com `spec-audit` e, quando aplicável, executa `spec-workflow-retrospective`.
8. O operador continua podendo usar `/run_specs <arquivo-da-spec.md>` quando quiser retriagem completa da spec, inclusive nos casos em que a própria spec mudou materialmente ou quando não existir backlog aberto reaproveitável.

## Requisitos funcionais
- RF-01: o bot Telegram deve expor um novo comando textual `/run_specs_from_validation <arquivo-da-spec.md>`.
- RF-02: o novo comando deve respeitar o mesmo controle de acesso por `TELEGRAM_ALLOWED_CHAT_ID` já aplicado a `/run_specs`.
- RF-03: o novo comando deve aceitar o mesmo formato de entrada de arquivo de spec já aceito por `/run_specs`: `<arquivo-da-spec.md>` ou `docs/specs/<arquivo-da-spec.md>`.
- RF-04: a validação de elegibilidade da spec para `/run_specs_from_validation` deve reutilizar a mesma regra base de `/run_specs`, exigindo `Status: approved` e `Spec treatment: pending`.
- RF-05: além da elegibilidade da spec, o novo comando deve exigir que exista ao menos um ticket aberto derivado da spec no pacote resolvido por `Source spec` e/ou `Related tickets`.
- RF-06: quando não existir nenhum ticket aberto derivado da spec, o comando deve ser bloqueado com mensagem acionável orientando o operador a usar `/run_specs <arquivo-da-spec.md>` para uma retriagem completa.
- RF-07: o novo comando deve iniciar o fluxo diretamente em `spec-ticket-validation`, sem executar `spec-triage`.
- RF-08: o novo comando não deve criar, apagar, mover ou rederivar tickets antes da etapa de validação; ele deve consumir apenas a spec atual e o backlog aberto atual.
- RF-09: a montagem do pacote de validação deve reutilizar a mesma lógica de reconstrução de pacote derivado já usada por `spec-ticket-validation`, incluindo leitura da spec, resolução de `Related tickets`, busca por `Source spec` e fusão de linhagem `source-spec | spec-related | hybrid`.
- RF-10: `spec-ticket-validation` iniciada por `/run_specs_from_validation` deve preservar o mesmo contrato funcional atual:
  - primeiro passe em contexto novo;
  - possibilidade de autocorreção controlada;
  - mesmo limite de ciclos;
  - mesma taxonomia de gaps;
  - mesmo veredito `GO | NO_GO`;
  - mesmo write-back funcional na spec quando aplicável.
- RF-11: quando `spec-ticket-validation` terminar em `NO_GO`, o fluxo deve parar antes de `spec-close-and-version` e antes de `/run_all`.
- RF-12: quando `spec-ticket-validation` falhar tecnicamente, o fluxo deve parar antes de `spec-close-and-version` e antes de `/run_all`, com mensagem orientando reexecução de `/run_specs_from_validation`.
- RF-13: quando `spec-ticket-validation` terminar em `GO`, o runner deve continuar com a mesma sequência do fluxo de spec já existente:
  - `spec-ticket-derivation-retrospective`, quando aplicável;
  - `spec-close-and-version`;
  - `/run_all`;
  - `spec-audit`;
  - `spec-workflow-retrospective`, quando aplicável.
- RF-14: `spec-ticket-derivation-retrospective` deve continuar disponível para o novo comando quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e houver histórico revisado suficiente de gaps na validação funcional.
- RF-15: o resumo final do fluxo, os traces, os milestones e o `/status` devem indicar explicitamente que a rodada `run-specs` entrou por `spec-ticket-validation` via `/run_specs_from_validation`, e não por `spec-triage`.
- RF-16: o resumo final do fluxo deve manter `run-specs` como família de fluxo, evitando a criação de uma segunda taxonomia paralela de summaries apenas por causa da nova porta de entrada.
- RF-17: o modelo de dados do resumo de `run-specs` deve registrar metadados suficientes para distinguir, no mínimo:
  - o comando de origem (`/run_specs` ou `/run_specs_from_validation`);
  - o ponto de entrada do fluxo (`spec-triage` ou `spec-ticket-validation`).
- RF-18: os timings da rodada iniciada por `/run_specs_from_validation` devem refletir apenas as etapas realmente executadas; `spec-triage` não deve aparecer como etapa concluída nessa variante.
- RF-19: o help textual do bot, o README e a documentação operacional do fluxo devem documentar o novo comando e a diferença semântica entre “retriar a spec” e “continuar da validação”.
- RF-20: `/run_specs <arquivo>` deve permanecer funcional e semanticamente inalterado como caminho de retriagem completa da spec.
- RF-21: a primeira versão não deve adicionar botão novo em `/specs`, nem CTA automático de continuação a partir da validação.
- RF-22: a primeira versão não deve tentar generalizar retomada para qualquer etapa arbitrária do fluxo; o recorte desta spec é exclusivamente a retomada a partir de `spec-ticket-validation`.
- RF-23: o comando novo deve obedecer aos mesmos gates operacionais de slot ocupado, capacidade do runner, autenticação do Codex e disponibilidade do projeto ativo já usados em `/run_specs`.
- RF-24: quando a construção do pacote derivado falhar por inconsistência de linhagem entre spec e tickets, o comando deve falhar com orientação explícita ao operador para revisar metadata ou voltar ao caminho completo de `/run_specs`.
- RF-25: o nome canônico do comando nesta primeira versão deve ser `/run_specs_from_validation`, sem alias adicional obrigatório.

## Assumptions and defaults
- O nome canônico do novo comando é `/run_specs_from_validation`.
- A semântica canônica de `/run_specs` permanece “retriagem completa da spec”.
- A semântica canônica de `/run_specs_from_validation` passa a ser “revalidar o backlog derivado atual e, se houver `GO`, continuar o fluxo”.
- A família de fluxo observável continua sendo `run-specs`; a nova diferença deve aparecer por metadata de entrada, não por criação de um fluxo paralelo.
- A ausência de tickets abertos derivados da spec indica, por padrão, que o operador não tem backlog reaproveitável suficiente para entrar pela validação.
- A primeira versão deve privilegiar clareza operacional e baixo risco de escopo; por isso, a entrada nova fica restrita ao comando textual no Telegram.
- O gate `spec-ticket-validation` continua sendo a autoridade funcional para decidir `GO` ou `NO_GO` do pacote derivado.

## Nao-escopo
- Substituir `/run_specs <arquivo-da-spec.md>`.
- Adicionar botão ou callback novo em `/specs` nesta primeira versão.
- Permitir retomada a partir de `spec-close-and-version`, `/run_all`, `spec-audit` ou qualquer outra etapa arbitrária.
- Reabrir automaticamente tickets fechados ou consumir tickets em `tickets/closed/`.
- Flexibilizar a elegibilidade da spec além de `Status: approved` e `Spec treatment: pending`.
- Implementar um framework genérico de “resume from stage” para todos os fluxos do runner.
- Alterar a taxonomia funcional de `spec-ticket-validation` ou da retrospectiva sistêmica já existentes.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - `/run_specs_from_validation <arquivo-da-spec.md>` com spec elegível e backlog aberto derivado inicia o runner e entra diretamente em `spec-ticket-validation`, sem executar `spec-triage`.
- [ ] CA-02 - `/run_specs_from_validation` sem argumento retorna mensagem de uso e não inicia execução.
- [ ] CA-03 - `/run_specs_from_validation <arquivo>` com spec inexistente, caminho inválido ou spec não elegível retorna bloqueio explícito e não inicia execução.
- [ ] CA-04 - `/run_specs_from_validation <arquivo>` para spec elegível, mas sem tickets abertos derivados, retorna bloqueio explícito orientando o operador a usar `/run_specs <arquivo-da-spec.md>`.
- [ ] CA-05 - Quando a validação continuar em `NO_GO`, o fluxo encerra antes de `spec-close-and-version` e antes de `/run_all`, com resumo final apontando próxima ação em `/run_specs_from_validation`.
- [ ] CA-06 - Quando a validação chegar a `GO`, o fluxo continua para `spec-close-and-version`, encadeia `/run_all` e termina com `spec-audit`, preservando o comportamento posterior já existente de `/run_specs`.
- [ ] CA-07 - Quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e houver histórico revisado suficiente de gaps, a etapa `spec-ticket-derivation-retrospective` continua sendo executada mesmo quando a rodada entrou por `/run_specs_from_validation`.
- [ ] CA-08 - O resumo final, o milestone de triagem, o trace e o `/status` distinguem explicitamente que a rodada `run-specs` entrou por `spec-ticket-validation` via `/run_specs_from_validation`.
- [ ] CA-09 - `/run_specs <arquivo-da-spec.md>` permanece funcional e continua iniciando obrigatoriamente em `spec-triage`.
- [ ] CA-10 - `/specs` permanece sem novo botão ou CTA de continuação na primeira versão.
- [ ] CA-11 - A suíte automatizada cobre, no mínimo, os cenários de início direto na validação, bloqueio por ausência de backlog derivado, parada em `NO_GO`, continuação em `GO` e preservação semântica de `/run_specs`.

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
- Nota de uso: quando esta spec vier de `/run_specs`, preencher esta secao apenas com o veredito, os gaps, as correcoes e o historico funcional do gate formal; fora desse fluxo, registrar `n/a` quando nao se aplicar.
- Politica historica: alinhamentos desta secao nao exigem migracao retroativa em massa; material historico so deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

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
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional e continua canonica mesmo quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false`. Com a flag desligada, a secao pode permanecer `n/a` e nao recebe write-back automatico. Se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validacoes automatizadas obrigatorias:
  - `npm test`
  - `npm run check`
  - cobertura direcionada para `src/core/runner.test.ts` e `src/integrations/telegram-bot.test.ts`, incluindo cenarios de bloqueio, `NO_GO`, `GO` e preservacao do caminho legado de `/run_specs`
- Validacoes manuais pendentes:
  - Executar `/run_specs_from_validation <arquivo-da-spec.md>` em uma spec com tickets abertos derivados e confirmar, no Telegram, que o fluxo inicia diretamente em `spec-ticket-validation`.
  - Executar o mesmo comando em um caso com `NO_GO` e confirmar que `spec-close-and-version` e `/run_all` nao sao iniciados.
  - Executar o mesmo comando em um caso com `GO` e confirmar que o fluxo segue ate `spec-audit`.
  - Executar o mesmo comando em uma spec elegível sem tickets abertos derivados e confirmar bloqueio acionável orientando o uso de `/run_specs`.
  - Confirmar no `/status` e no resumo final que a rodada foi identificada como entrada por `/run_specs_from_validation`.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - O runner já possui o fluxo `run-specs` completo, com `spec-ticket-validation` separado de `spec-triage`.
  - O runner já reconstrói o pacote derivado da spec a partir da spec e dos tickets abertos atuais para alimentar `spec-ticket-validation`.
  - O fluxo atual já bloqueia `/run_all` quando `spec-ticket-validation` termina em `NO_GO`.
  - O bot Telegram já possui infraestrutura de comando textual, validação de elegibilidade da spec, resumo final de fluxo e milestone de triagem para `run-specs`.
- Pendencias em aberto:
  - Ainda não existe comando público no Telegram para iniciar `run-specs` diretamente em `spec-ticket-validation`.
  - O help, o README, os traces, o resumo final e o `/status` ainda não distinguem um ponto de entrada por validação dentro da família `run-specs`.
  - `/specs` ainda não oferece uma ação explícita de “continuar da validação”, o que permanece intencionalmente fora do escopo da primeira versão desta spec.
- Evidencias de validacao:
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/telegram-bot.ts`
  - `src/integrations/telegram-bot.test.ts`
  - `src/integrations/spec-discovery.ts`
  - `src/types/flow-timing.ts`
  - `README.md`
  - `docs/specs/2026-02-19-approved-spec-triage-run-specs.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md`

## Auditoria final de entrega
- Auditoria executada em:
- Resultado:
- Tickets/follow-ups abertos a partir da auditoria:
  - 
- Causas-raiz sistemicas identificadas:
  - 
- Ajustes genericos promovidos ao workflow:
  - 

## Riscos e impacto
- Risco funcional: o operador pode usar `/run_specs_from_validation` quando a própria spec mudou materialmente e, nesse caso, pular `spec-triage` seria inadequado para o backlog atual.
- Risco operacional: se os resumos e o `/status` não diferenciarem claramente o ponto de entrada, o suporte operacional pode interpretar a rodada como uma retriagem completa quando, na verdade, foi uma continuação pela validação.
- Mitigacao:
  - nome de comando explícito e orientado à etapa de entrada;
  - bloqueio quando não houver backlog derivado reaproveitável;
  - manutenção de `/run_specs` como caminho de retriagem completa;
  - observabilidade explícita de `sourceCommand` e `entryPoint` em status, milestone, resumo final e traces.

## Decisoes e trade-offs
- 2026-03-24 - Adotar um novo comando dedicado em vez de um modificador em `/run_specs` - reduz ambiguidade operacional, simplifica parsing no Telegram e deixa mais claro quando a intenção é “continuar da validação”, não “retriar a spec”.
- 2026-03-24 - Manter a família de fluxo observável como `run-specs` e distinguir a nova porta de entrada por metadata - evita duplicação desnecessária de summaries, testes e contratos de timing para um fluxo que continua semanticamente pertencendo a `run-specs`.
- 2026-03-24 - Exigir backlog derivado aberto para permitir a entrada por validação - impede rodadas vazias ou semanticamente ambíguas e preserva `/run_specs` como caminho certo para recriar backlog.
- 2026-03-24 - Lançar a primeira versão apenas com comando textual no Telegram - reduz escopo, preserva a UX atual de `/specs` e deixa a expansão por botão para uma etapa posterior, se o valor se confirmar.
- 2026-03-24 - Preservar o mesmo gate funcional de `spec-ticket-validation` sem criar taxonomia paralela para a retomada - reduz retrabalho arquitetural e mantém a mesma semântica de `GO/NO_GO`.

## Historico de atualizacao
- 2026-03-24 17:51Z - Versao inicial da spec criada para formalizar a retomada de `run-specs` a partir de `spec-ticket-validation` por meio do novo comando `/run_specs_from_validation`.
