# ExecPlan - Contrato de validacao de tickets derivados com taxonomia fixa e autocorrecao

## Purpose / Big Picture
- Objetivo: introduzir o contrato executavel de `spec-ticket-validation` para avaliar o pacote derivado de tickets com taxonomia fixa, resultado parseavel, contexto stateful restrito a validacao e loop limitado de autocorrecao -> revalidacao.
- Resultado esperado:
  - o primeiro passe de validacao inicia em contexto novo, sem herdar `thread_id` de `spec-triage`;
  - revalidacoes do mesmo gate reutilizam apenas o contexto da propria validacao;
  - o gate retorna resultado tipado com `GO/NO_GO`, confianca final, gaps somente da taxonomia aprovada, evidencias objetivas, causa-raiz provavel e correcoes aplicadas;
  - o loop automatico respeita no maximo 2 ciclos completos e bloqueia quando nao houver reducao real dos gaps ou a confianca para `GO` continuar insuficiente.
- Escopo:
  - definir o contrato tipado e o parser do gate de validacao;
  - criar o prompt/protocolo estruturado da etapa `spec-ticket-validation`;
  - adicionar suporte stateful em `src/integrations/codex-client.ts` para validacao inicial + revalidacoes por `exec/resume`;
  - implementar a politica de autocorrecao/revalidacao como servico reutilizavel no core, pronta para ser consumida pelo ticket irmao de orquestracao;
  - cobrir o contrato com testes automatizados focados.
- Fora de escopo:
  - inserir `spec-ticket-validation` na sequencia completa de `runSpecsAndRunAll` com novo timing/estado/resumo final (ticket irmao `tickets/open/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`);
  - atualizar Telegram, `src/types/flow-timing.ts`, `src/types/state.ts` ou `src/integrations/workflow-trace-store.ts` para exposicao final do gate;
  - abrir o ticket transversal sistemico em `codex-flow-runner` (ticket irmao `tickets/open/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`);
  - fechar ticket, mover para `tickets/closed/`, commitar ou fazer push nesta etapa.

## Progress
- [x] 2026-03-19 15:55Z - Planejamento inicial concluido com leitura integral do ticket, spec de origem, `PLANS.md`, `docs/workflows/codex-quality-gates.md` e referencias de codigo/testes.
- [x] 2026-03-19 16:17Z - Contrato tipado, parser estruturado e prompt dedicado de `spec-ticket-validation` implementados em `src/types/spec-ticket-validation.ts`, `src/integrations/spec-ticket-validation-parser.ts` e `prompts/09-validar-tickets-derivados-da-spec.md`.
- [x] 2026-03-19 16:17Z - Sessao stateful da validacao e protocolo `exec/resume` dedicados implementados em `src/integrations/codex-client.ts`, com testes garantindo contexto local do gate e nao reaproveitamento de `thread_id` externo.
- [x] 2026-03-19 16:17Z - Loop de autocorrecao/revalidacao com limite de 2 ciclos completos implementado em `src/core/spec-ticket-validation.ts`.
- [x] 2026-03-19 16:17Z - Matriz de validacao do plano executada com sucesso (`tsx --test` focado, `npm test`, `npm run check`, `npm run build`).

## Surprises & Discoveries
- 2026-03-19 15:55Z - `src/core/runner.ts` hoje encadeia `spec-triage -> spec-close-and-version -> /run-all -> spec-audit`, entao este ticket precisa entregar um servico reutilizavel sem disputar a mudanca de orquestracao do ticket irmao.
- 2026-03-19 15:55Z - `src/integrations/codex-client.ts` ja possui infraestrutura `exec/resume` com `thread_id` para `/plan_spec`, `/discover_spec` e `/codex_chat`, o que reduz risco de criar um protocolo stateful do zero.
- 2026-03-19 15:55Z - O repositorio ja tem um parser robusto em `src/integrations/plan-spec-parser.ts`; vale reutilizar o padrao de blocos estruturados e sanitizacao para evitar um parser ad hoc mais fragil.
- 2026-03-19 15:55Z - A taxonomia de causa-raiz compartilhada em `docs/workflows/codex-quality-gates.md` ainda nao esta materializada no codigo, mas e a melhor base para `causa-raiz provavel` do novo gate.
- 2026-03-19 16:17Z - `parseCodexExecJsonTranscript(...)` sanitizava `agent_message` com truncamento pensado para previews; isso precisava ser separado para nao corromper payloads estruturados maiores do novo gate.
- 2026-03-19 16:17Z - Nao foi necessario tocar `src/core/runner.ts`: o servico standalone e suficiente para o ticket irmao consumir o contrato sem redefinir parser, tipos ou politica de loop.

## Decision Log
- 2026-03-19 - Decisao: modelar o gate em contrato proprio (`types` + parser + sessao + servico de loop) em vez de espalhar campos em `flow-timing`.
  - Motivo: este ticket cobre o contrato funcional/stateful do gate, enquanto observabilidade do fluxo completo pertence ao ticket irmao.
  - Impacto: entrega aditiva e reaproveitavel; `flow-timing` e Telegram permanecem intocados aqui.
- 2026-03-19 - Decisao: reaproveitar a taxonomia de causa-raiz de `docs/workflows/codex-quality-gates.md` (`spec`, `ticket`, `execplan`, `execution`, `validation`, `systemic-instruction`, `external/manual`) para `causa-raiz provavel`.
  - Motivo: evita taxonomia paralela e mantem rastreabilidade coerente com o workflow ja canonico.
  - Impacto: parser e tipos do gate passam a validar tambem a categoria de causa-raiz.
- 2026-03-19 - Decisao: considerar `reducao real dos gaps` como reducao estrita do conjunto normalizado de gaps ainda abertos, comparando fingerprint por `taxonomia + artefato afetado + requisito(s) referenciado(s)`.
  - Motivo: mera reescrita textual de evidencias nao pode destravar `/run-all`.
  - Impacto: o servico do gate precisa normalizar e comparar gaps entre ciclos.
- 2026-03-19 - Decisao: adotar `low | medium | high` como escala inicial de confianca e tratar apenas `high` como confianca suficiente para `GO` nesta primeira versao.
  - Motivo: o ticket exige criterio objetivo para bloquear `GO` por confianca insuficiente; limiar mais permissivo aumentaria subjetividade logo na primeira entrega.
  - Impacto: parser e testes precisam validar a normalizacao da confianca e o bloqueio para `GO` com `medium`/`low`.
- 2026-03-19 - Decisao: usar bloco `[[SPEC_TICKET_VALIDATION]]` com payload JSON fechado no prompt/parser do gate.
  - Motivo: o contrato precisa ser parseavel e estrito sobre allowlists de gap, confianca e causa-raiz, sem reproduzir um parser textual mais fragil.
  - Impacto: `codex-client` passa a validar deterministicamente respostas invalidas e os testes exercitam taxonomia/shape completos.
- 2026-03-19 - Decisao: manter `triageThreadId` apenas como dado diagnostico ignorado pela sessao do gate, nunca como origem de `resume`.
  - Motivo: o closure criterion exige provar isolamento entre `spec-triage` e `spec-ticket-validation` sem abrir margem para reutilizacao acidental de contexto.
  - Impacto: a API do cliente aceita o contexto anterior apenas para auditoria, enquanto o primeiro turno sempre parte de `exec --json` sem `resume`.
- 2026-03-19 - Decisao: implementar o passo `corrigir` do motor como dependencia injetada (`autoCorrect`) em vez de acoplar mutacao de arquivos diretamente ao servico nesta etapa.
  - Motivo: o ticket precisa entregar a politica auditavel de loop sem antecipar o wiring do runner nem disputar com o ticket irmao de orquestracao/observabilidade.
  - Impacto: o contrato do core ja valida ciclos, reducao real e confianca; a mutacao concreta do pacote derivado fica plugavel e explicita para a integracao seguinte.

## Outcomes & Retrospective
- Status final: execucao concluida para o escopo deste ticket; contrato do gate entregue e validado localmente.
- O que precisa existir ao final:
  - contrato tipado/parseavel do gate em codigo;
  - sessao stateful isolada de `spec-triage`;
  - loop de autocorrecao limitado e auditavel;
  - testes cobrindo os tres closure criteria do ticket.
- O que fica pendente fora deste plano:
  - plugar o gate na sequencia canonica de `/run_specs`;
  - expor veredito/gaps/ciclos em status, traces, spec e Telegram;
  - follow-up sistemico cross-repo.
- Proximos passos:
  - executar os milestones abaixo em ordem;
  - depois encadear o ticket irmao de orquestracao/observabilidade para consumir o contrato entregue aqui.

## Context and Orientation
- Arquivos principais lidos no planejamento:
  - `tickets/open/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md`
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/types/flow-timing.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/integrations/plan-spec-parser.ts`
- Spec de origem: `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-02, RF-03, RF-08, RF-09, RF-11, RF-12, RF-13, RF-14
  - CA-04, CA-05, CA-06, CA-07, CA-08, CA-09
- Assumptions / defaults adotados:
  - o primeiro passe de `spec-ticket-validation` sempre inicia sessao nova e nunca recebe `thread_id` herdado de `spec-triage`;
  - revalidacoes usam o mesmo `thread_id` da validacao corrente enquanto o gate estiver aberto;
  - um ciclo completo significa exatamente `autocorrecao -> revalidacao`; o passe inicial nao conta como ciclo;
  - `GO/NO_GO` vale para o pacote derivado inteiro, nao para tickets isolados;
  - `high` e o limiar minimo de confianca suficiente para `GO` nesta primeira versao;
  - gaps fora da taxonomia aprovada ou resultados sem campos obrigatorios sao tratados como resposta invalida do gate e devem falhar a validacao;
  - `causa-raiz provavel` reutiliza a taxonomia compartilhada de `docs/workflows/codex-quality-gates.md`;
  - este ticket entrega o motor/contrato do gate e nao muda, por si so, a ordem final de `/run_specs`.
- Fluxo atual relevante (as-is):
  - `src/core/runner.ts` executa apenas `spec-triage`, `spec-close-and-version` e `spec-audit` como etapas de spec.
  - `src/integrations/codex-client.ts` tem `runSpecStage(...)` nao interativo para spec e `exec/resume` stateful apenas para `/plan_spec`, `/discover_spec` e `/codex_chat`.
  - `src/types/flow-timing.ts` ainda nao carrega veredito, gaps, confianca ou ciclos do novo gate.
- Restricoes tecnicas:
  - Node.js 20+ com TypeScript; sem novas dependencias externas.
  - fluxo de tickets continua sequencial.
  - contrato do gate precisa ser auto-contido e reutilizavel por outra etapa do runner.
- Termos usados neste plano:
  - `pacote derivado`: conjunto de tickets gerados por `spec-triage` para uma spec.
  - `gap corrigivel`: gap cuja resposta do gate marca possibilidade de autocorrecao automatica sem depender de decisao humana adicional.
  - `gap fingerprint`: chave normalizada usada para comparar se um gap continua aberto entre ciclos.
  - `confianca suficiente`: confianca `high` para permitir `GO`.

## Plan of Work
- Milestone 1 - Contrato tipado e parser fechado do gate
  - Entregavel: tipos canonicos para veredito, confianca, taxonomia de gaps, causa-raiz, correcoes aplicadas e ciclos; parser estruturado que aceita apenas a taxonomia aprovada e valida campos obrigatorios.
  - Evidencia de conclusao: testes de parser aceitam blocos validos e rejeitam gap fora da allowlist, causa-raiz invalida ou campos obrigatorios ausentes.
  - Arquivos esperados:
    - `src/types/spec-ticket-validation.ts`
    - `src/integrations/spec-ticket-validation-parser.ts`
    - `src/integrations/spec-ticket-validation-parser.test.ts`
    - `prompts/09-validar-tickets-derivados-da-spec.md`
- Milestone 2 - Sessao stateful isolada para validacao e revalidacao
  - Entregavel: API dedicada no `codex-client` para iniciar validacao em contexto novo e revalidar via `exec/resume` no mesmo `thread_id` local.
  - Evidencia de conclusao: testes mostram primeiro turno sem `resume`/sem `thread_id` herdado e segundo turno com `resume` no mesmo `thread_id` da validacao.
  - Arquivos esperados:
    - `src/integrations/codex-client.ts`
    - `src/integrations/codex-client.test.ts`
- Milestone 3 - Motor de autocorrecao e stop policy no core
  - Entregavel: servico do core que executa `validar -> corrigir -> revalidar`, limita a 2 ciclos completos, mede reducao real de gaps e normaliza `GO/NO_GO`.
  - Evidencia de conclusao: testes simulam casos de `GO` imediato, `NO_GO` corrigivel que vira `GO`, `NO_GO` por ausencia de reducao real e `NO_GO` por confianca insuficiente.
  - Arquivos esperados:
    - `src/core/spec-ticket-validation.ts`
    - `src/core/spec-ticket-validation.test.ts`
    - `src/core/runner.ts` apenas se for necessario um seam aditivo para hospedar o servico sem alterar a ordem do fluxo.
- Milestone 4 - Superficie pronta para consumo pelo ticket irmao
  - Entregavel: contratos/exportacoes estaveis para que o ticket de orquestracao possa plugar o stage sem redefinir parser, tipos ou politicas de loop.
  - Evidencia de conclusao: o diff final mostra dependencia clara de `runner`/observabilidade apenas para consumo, nao para redefinicao do gate.
  - Arquivos esperados:
    - mesmos arquivos dos milestones anteriores, com exports publicos/additivos quando necessario.
- Milestone 5 - Validacao automatizada focada nos closure criteria
  - Entregavel: suites focadas verdes cobrindo contexto, taxonomia, confianca, ciclos e bloqueios.
  - Evidencia de conclusao: comandos de teste dedicados passam sem depender do ticket irmao de orquestracao.
  - Arquivos esperados:
    - artefatos de teste + diff dos arquivos acima.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "SpecFlowStage|runSpecStage\\(|startPlanSession|startDiscoverSession|startFreeChatSession|threadId|spec-triage|spec-close-and-version" src/integrations/codex-client.ts src/core/runner.ts src/integrations/codex-client.test.ts src/core/runner.test.ts` para fixar os pontos de extensao e os testes existentes.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/types/spec-ticket-validation.ts` com:
   - unions fechadas de `gapType`, `verdict`, `confidenceLevel` e `probableRootCause`;
   - tipos para gap, correcao aplicada, snapshot por ciclo e resultado consolidado do gate;
   - helpers puros para normalizar gap fingerprints e comparar reducao real entre ciclos.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/integrations/spec-ticket-validation-parser.ts`, reaproveitando o padrao de sanitizacao/blocos estruturados de `src/integrations/plan-spec-parser.ts` para parsear o resultado do gate e validar allowlists obrigatorias.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/integrations/spec-ticket-validation-parser.test.ts` cobrindo:
   - bloco valido com gaps apenas da taxonomia aprovada;
   - rejeicao de gap fora da allowlist;
   - rejeicao de confianca/causa-raiz invalidas;
   - parse de evidencias, correcoes aplicadas e resultado final.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `prompts/09-validar-tickets-derivados-da-spec.md` com protocolo estruturado do gate, incluindo:
   - campos obrigatorios do veredito;
   - allowlist textual da taxonomia de gaps;
   - instrucao explicita de que o primeiro passe nao herda contexto de `spec-triage`;
   - instrucao explicita de que revalidacoes reutilizam o contexto da validacao corrente;
   - instrucao de registrar evidencias objetivas, causa-raiz provavel, confianca final e correcoes aplicadas.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/codex-client.ts` para adicionar uma interface dedicada de sessao/execucao de `spec-ticket-validation`, reaproveitando `exec/resume` com `thread_id` proprio do gate e sem alterar ainda a ordem canonica de `run_specs`.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/integrations/codex-client.test.ts` para provar que:
   - o primeiro turno de validacao usa `codex exec --json` sem `resume`;
   - a revalidacao usa `resume` com o mesmo `thread_id` da validacao;
   - nenhum `thread_id` externo de `spec-triage` e reaproveitado;
   - respostas sem `thread_id`/`agent_message` ou com payload invalido falham de forma deterministica.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/core/spec-ticket-validation.ts` com o motor do gate:
   - passe inicial de validacao;
   - decisao sobre gaps corrigiveis;
   - ate 2 ciclos completos de `autocorrecao -> revalidacao`;
   - bloqueio por ausencia de reducao real;
   - bloqueio por `GO` com confianca abaixo do limiar.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` para criar `src/core/spec-ticket-validation.test.ts` cobrindo, no minimo:
   - `GO` no primeiro passe;
   - `NO_GO` com gaps corrigiveis que vira `GO` apos autocorrecao e revalidacao;
   - parada no segundo ciclo completo sem terceira tentativa;
   - `NO_GO` quando a quantidade/conjunto de gaps abertos nao reduz;
   - `NO_GO` quando o parser retorna `GO` com confianca `medium` ou `low`.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se o servico precisar ser hospedado pelo runner para wiring futuro, executar `apply_patch` em `src/core/runner.ts` apenas para adicionar seam/injecao aditiva, sem alterar nesta etapa a sequencia `spec-triage -> spec-close-and-version -> /run-all -> spec-audit`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-ticket-validation-parser.test.ts src/integrations/codex-client.test.ts src/core/spec-ticket-validation.test.ts` para validar parser, sessao stateful e loop do gate.
12. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se `src/core/runner.ts` tiver sido tocado, rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/runner.test.ts` para garantir que o seam aditivo nao regressou comportamento existente.
13. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test` para regressao completa apos os testes focados.
14. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para validar tipagem.
15. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run build` para validar compilacao.
16. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- src/types/spec-ticket-validation.ts src/integrations/spec-ticket-validation-parser.ts src/integrations/spec-ticket-validation-parser.test.ts src/integrations/codex-client.ts src/integrations/codex-client.test.ts src/core/spec-ticket-validation.ts src/core/spec-ticket-validation.test.ts src/core/runner.ts prompts/09-validar-tickets-derivados-da-spec.md` para auditoria final do escopo.

## Validation and Acceptance
- Matriz requisito -> validacao observavel:
  - Requisito: RF-02, RF-03; CA-04, CA-05
    - Evidencia observavel: testes demonstram que o primeiro passe de `spec-ticket-validation` inicia sem `resume`/sem `thread_id` herdado de `spec-triage`, enquanto a revalidacao do mesmo gate reutiliza o `thread_id` obtido na propria validacao.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/codex-client.test.ts src/core/spec-ticket-validation.test.ts`
    - Esperado: asserts verificam chamada inicial sem `resume`, revalidacao com `resume` no mesmo `thread_id` e ausencia de reaproveitamento de contexto externo ao gate.
  - Requisito: RF-08, RF-09, RF-11; CA-06
    - Evidencia observavel: o resultado parseado aceita apenas `coverage-gap`, `scope-justification-gap`, `granularity-gap`, `duplication-gap`, `closure-criteria-gap`, `spec-inheritance-gap` e `documentation-compliance-gap`, registrando evidencias objetivas, causa-raiz provavel, correcoes aplicadas e confianca final.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/integrations/spec-ticket-validation-parser.test.ts src/core/spec-ticket-validation.test.ts`
    - Esperado: parser/suites verdes para payload valido; payload com gap fora da taxonomia, causa-raiz invalida ou campo obrigatorio ausente falha deterministicamente.
  - Requisito: RF-12, RF-13, RF-14; CA-07, CA-08, CA-09
    - Evidencia observavel: testes cobrem autocorrecao automatica seguida de revalidacao, limite maximo de 2 ciclos completos e bloqueio por ausencia de reducao real dos gaps ou por confianca insuficiente para `GO`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/spec-ticket-validation.test.ts`
    - Esperado: cenarios de `NO_GO -> autocorrecao -> GO`, parada no segundo ciclo completo e `NO_GO` final por gaps estagnados ou confianca `medium/low`.

## Idempotence and Recovery
- Idempotencia:
  - o `thread_id` da validacao deve existir apenas durante uma rodada do gate e ser descartado no encerramento do resultado consolidado;
  - reexecutar as suites focadas e os comandos de regressao nao deve gerar efeito colateral fora dos arquivos alterados;
  - o servico de loop deve produzir o mesmo veredito para a mesma sequencia de respostas parseadas.
- Riscos:
  - parser muito permissivo permitir gap fora da taxonomia e enfraquecer o `GO/NO_GO`;
  - parser muito estrito rejeitar respostas validas e criar falso `NO_GO`;
  - autocorrecao em disco pode deixar tickets parcialmente editados se o processo falhar entre correcao e revalidacao;
  - sobreposicao de escopo com o ticket irmao de orquestracao caso `runner.ts` seja alterado alem do necessario.
- Recovery / Rollback:
  - antes de aplicar autocorrecao, capturar snapshot do conteudo dos tickets/docs tocados no ciclo; se a correcao falhar antes da revalidacao consolidada, restaurar o snapshot e abortar o gate com erro objetivo;
  - se o `thread_id` nao vier do Codex ou mudar inesperadamente entre revalidacoes, cancelar a sessao atual e reiniciar somente o passe inicial em contexto novo; nunca reutilizar contexto de `spec-triage`;
  - se o comparador de `reducao real` gerar duvida durante a implementacao, manter a regra conservadora (sem reducao estrita = `NO_GO`) e registrar a decisao no proprio plano/diff;
  - se qualquer ajuste em `runner.ts` conflitar com o ticket irmao, reduzir a mudanca ao servico standalone em `src/core/spec-ticket-validation.ts` e deixar o wiring para o ticket de orquestracao.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md`
- Spec de origem:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md`
- Checklist aplicado no planejamento:
  - leitura integral do ticket e das referencias obrigatorias;
  - explicitude de spec de origem, RFs/CAs cobertos, assumptions/defaults e nao-escopo;
  - traducao dos closure criteria em matriz `requisito -> validacao observavel`;
  - riscos residuais e fronteira com tickets irmaos declarados.
- Referencias tecnicas consumidas:
  - `src/core/runner.ts`
  - `src/integrations/codex-client.ts`
  - `src/types/flow-timing.ts`
  - `src/integrations/plan-spec-parser.ts`
  - `src/core/runner.test.ts`
  - `src/integrations/codex-client.test.ts`
- Tickets correlatos fora do escopo direto:
  - `tickets/open/2026-03-19-spec-ticket-validation-orquestracao-e-observabilidade.md`
  - `tickets/open/2026-03-19-ticket-transversal-de-melhoria-de-workflow-no-run-specs.md`
  - `tickets/open/2026-03-19-contrato-canonico-spec-para-tickets-e-qualidade-por-token.md`
- Artefatos esperados ao final da execucao:
  - novo prompt dedicado da validacao;
  - tipos do gate em `src/types`;
  - parser/testes focados;
  - servico do core para loop de validacao;
  - diff final pronto para ser consumido pelo ticket irmao de orquestracao.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - novo contrato `SpecTicketValidationResult` e tipos auxiliares em `src/types/spec-ticket-validation.ts`;
  - novo parser estruturado da etapa em `src/integrations/spec-ticket-validation-parser.ts`;
  - nova interface de sessao/executor de `spec-ticket-validation` em `src/integrations/codex-client.ts`;
  - novo servico do core para rodar o loop de validacao/autocorrecao.
- Compatibilidade:
  - a sequencia publica de `/run_specs` nao muda neste ticket; qualquer mudanca observavel de fluxo fica para o ticket de orquestracao;
  - o contrato novo deve ser aditivo, para que o ticket irmao apenas o consuma em vez de redefini-lo;
  - a taxonomia de causa-raiz permanece alinhada ao documento canonico `docs/workflows/codex-quality-gates.md`.
- Dependencias externas e mocks:
  - sem novas dependencias npm;
  - testes continuam usando stubs locais de Codex/runner e transcripts simulados de `exec --json`;
  - o prompt `prompts/09-validar-tickets-derivados-da-spec.md` e dependencia direta do novo contrato;
  - o ticket irmao de orquestracao depende deste contrato para expor timing, status, trace e resumo final.
