# ExecPlan - explicitar reconciliação de backlog aberto na triagem derivada de spec

## Purpose / Big Picture
- Objetivo: endurecer a triagem de spec para que backlog aberto já existente na mesma linhagem seja relido, reconciliado e normalizado antes da abertura de ticket sucessor, reduzindo correções editoriais posteriores no `spec-ticket-validation`.
- Resultado esperado:
  - `prompts/01-avaliar-spec-e-gerar-tickets.md` passa a exigir releitura e reconciliação de tickets abertos da linhagem antes de abrir ticket novo;
  - `docs/workflows/codex-quality-gates.md` passa a tratar como obrigatória a normalização de ownership e `Closure criteria` quando coexistirem ticket histórico aberto e ticket sucessor;
  - a cobertura automatizada prova o contrato instrucional da triagem e ancora o cenário suportado de backlog `hybrid`, sem depender de memória oral do caso concreto;
  - o fluxo continua `spec -> tickets`, sequencial e sem reintroduzir `spec -> execplan`.
- Escopo:
  - atualizar o checklist compartilhado em `docs/workflows/codex-quality-gates.md`;
  - atualizar o prompt `prompts/01-avaliar-spec-e-gerar-tickets.md`;
  - ampliar testes em `src/integrations/codex-client.test.ts` e `src/core/runner.test.ts` para cobrir o contrato de reconciliação e o cenário de backlog aberto `hybrid`;
  - validar que o changeset permaneceu restrito a documentação, prompt e testes, salvo descoberta objetiva de gap adicional.
- Fora de escopo:
  - alterar a semântica do gate `spec-ticket-validation`, sua taxonomia ou o loop de autocorreção;
  - reabrir o contrato canônico `spec -> tickets`;
  - editar prompts `09`, `10` ou `12` sem evidência objetiva de inconsistência residual;
  - introduzir enforcement novo em runtime no `runner` apenas para compensar uma lacuna instrucional;
  - implementar fechamento do ticket, commit ou push nesta etapa.

## Progress
- [x] 2026-04-01 16:38Z - Planejamento inicial concluído com leitura integral do ticket, de `PLANS.md`, do checklist compartilhado, das specs/RFs internas citadas, da spec e dos tickets do caso externo, dos prompts envolvidos, do `runner`, dos testes correlatos e de ExecPlans semelhantes.
- [x] 2026-04-01 16:44Z - `prompts/01-avaliar-spec-e-gerar-tickets.md` e `docs/workflows/codex-quality-gates.md` foram atualizados para exigir reconciliação explícita de backlog aberto por `Source spec`, `Related tickets` e `hybrid`, incluindo a enumeração `reutilizar/atualizar ticket aberto` | `dividir ownership com fronteira observável` | `justificar coexistência` e a normalização do ticket histórico quando o sucessor absorver ownership.
- [x] 2026-04-01 16:45Z - A cobertura automatizada foi ampliada em `src/integrations/codex-client.test.ts` para travar o wording real do prompt de triagem e em `src/core/runner.test.ts` para ancorar explicitamente a topologia `hybrid` com `ticket histórico aberto + ticket sucessor`.
- [x] 2026-04-01 16:47Z - A matriz de validação observável foi executada com `npm test -- src/integrations/codex-client.test.ts src/core/runner.test.ts`, `npm run check` e auditoria de diff; não houve necessidade de alterar `src/core/runner.ts`.

## Surprises & Discoveries
- 2026-04-01 16:38Z - O `runner` já suporta backlog aberto reaproveitável por `Source spec`, `Related tickets` e linhagem `hybrid`; o gap causal identificado pelo ticket está concentrado em instrução e cobertura, não em falta de suporte do pacote de validação.
- 2026-04-01 16:38Z - O prompt `prompts/01-avaliar-spec-e-gerar-tickets.md` manda criar ticket(s) e atualizar `Related tickets`, mas hoje não obriga reler e normalizar tickets abertos já existentes antes da abertura de um sucessor.
- 2026-04-01 16:38Z - O caso real em `../guiadomus-scheduler` já fornece um exemplo concreto de backlog híbrido: o ticket histórico de `2026-03-31` permaneceu com ownership e `Closure criteria` sobrepostos até o ciclo de `spec-ticket-validation` revisar ambos os tickets.
- 2026-04-01 16:38Z - A menor superfície de mudança com melhor prova automatizada é `prompt + checklist + testes`; o código de produção do `runner` só deve entrar se a execução encontrar um blocker objetivo além do que o ticket descreve.
- 2026-04-01 16:45Z - O cenário `ticket histórico aberto + ticket sucessor` já é modelável com o helper existente de `buildSpecTicketValidationPackageContext`; a nova prova automatizada confirmou a topologia `hybrid` sem abrir escopo em `src/core/runner.ts`.
- 2026-04-01 16:47Z - O script de `npm test` deste repositório expande para `tsx --test src/**/*.test.ts ...`; ao executar o comando focado do plano, a validação cobriu também a suíte global inteira e permaneceu verde.

## Decision Log
- 2026-04-01 - Decisão: tratar `prompts/01-avaliar-spec-e-gerar-tickets.md` e `docs/workflows/codex-quality-gates.md` como pacote mínimo obrigatório da remediação.
  - Motivo: o próprio ticket, o draft estruturado da retrospectiva e o `decision.json` consolidam essas duas superfícies como a menor causa plausível do problema.
  - Impacto: a execução deve evitar abrir escopo em `runner.ts` ou no gate funcional sem evidência nova.
- 2026-04-01 - Decisão: preservar explicitamente na remediação os três modos finitos de backlog suportado pela validação: `Source spec`, `Related tickets` e `hybrid`.
  - Motivo: o comportamento esperado do ticket cita exatamente esses modos, e a matriz de validação não deve consolidá-los como “linhagem existente” genérica.
  - Impacto: prompt, checklist e testes precisam nomear esses membros explicitamente.
- 2026-04-01 - Decisão: provar a correção com duas camadas complementares de evidência automatizada.
  - Motivo: este é um ticket de `systemic-instruction`; a prova mais honesta é travar o contrato do prompt real e ancorar o cenário `hybrid` suportado no `runner`, em vez de fingir um enforcement semântico que o runtime não faz hoje.
  - Impacto: `src/integrations/codex-client.test.ts` e `src/core/runner.test.ts` entram no escopo; mudanças em código de produção ficam condicionadas a descoberta objetiva.
- 2026-04-01 - Decisão: manter a fronteira de reconciliação da triagem nas três saídas explícitas do ticket.
  - Motivo: o comportamento esperado já define a enumeração relevante para esse ponto da triagem: `reutilizar/atualizar ticket aberto`, `dividir ownership com fronteira observável` ou `justificar coexistência`; se um sucessor absorver ownership, o histórico precisa ser normalizado no mesmo ciclo.
  - Impacto: o wording do prompt e o checklist devem explicitar essa enumeração sem induzir over-splitting de tickets.
- 2026-04-01 - Decisão: não alterar `src/core/runner.ts` nesta execução.
  - Motivo: o novo teste de topologia `hybrid` com ticket histórico + sucessor passou usando a modelagem existente, confirmando que o gap do ticket era estritamente instrucional/documental.
  - Impacto: o changeset permaneceu restrito a `prompt + checklist + testes`, como previsto.
- 2026-04-01 - Decisão: aceitar a execução de `npm test -- src/integrations/codex-client.test.ts src/core/runner.test.ts` como evidência ainda mais forte do que a prevista no plano.
  - Motivo: o script do repositório expande para a suíte `src/**/*.test.ts`, então a validação exercitou também regressão global sem erro.
  - Impacto: o plano mantém a mesma matriz observável, mas passa a registrar que a evidência obtida superou o mínimo inicialmente planejado.

## Outcomes & Retrospective
- Status final: execução concluída localmente com sucesso no recorte planejado.
- O que existe ao final:
  - uma instrução canônica de triagem que trata backlog aberto da linhagem como insumo obrigatório antes da criação de ticket sucessor;
  - um checklist compartilhado que classifica como obrigatória a normalização de ownership e `Closure criteria` quando coexistirem ticket histórico e sucessor;
  - testes que deixam observável o cenário `Source spec | Related tickets | hybrid` e o guardrail contra `duplication-gap` e `closure-criteria-gap` puramente editoriais;
  - diff restrito a documentação, prompt e testes; `src/core/runner.ts` permaneceu estável.
- O que fica pendente fora deste plano:
  - qualquer evolução maior do gate funcional ou do publisher de tickets;
  - auditoria operacional posterior em rodada real de `/run_specs` para observar o comportamento já endurecido do prompt em ambiente externo;
  - fechamento formal do ticket e versionamento do changeset.
- Próximos passos:
  - executar os milestones abaixo sem sair do recorte `prompt + documentação + testes`;
  - só tocar `src/core/runner.ts` se um teste novo revelar que a topologia `hybrid` não consegue ser modelada como o ticket pressupõe;
  - registrar no próprio ExecPlan qualquer descoberta que force ajuste de escopo.

## Context and Orientation
- Ticket alvo:
  - `tickets/open/2026-04-01-workflow-improvement-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-4bc986c1.md`
- ExecPlan alvo:
  - `execplans/2026-04-01-workflow-improvement-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-4bc986c1.md`
- Spec de origem do caso que disparou o ticket:
  - caminho qualificado por projeto: `guiadomus-scheduler/docs/specs/2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md`
  - caminho canônico no projeto avaliado: `docs/specs/2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md`
- RFs/CAs cobertos por este plano no `codex-flow-runner`:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md#RF-08`
  - `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md#RF-09`
  - critérios de fechamento do ticket sistêmico atual, que refinam a barra observável dessas duas frentes.
- Assumptions / defaults herdados e adotados:
  - o contrato canônico permanece `spec -> tickets`; esta melhoria não reintroduz `spec -> execplan` direto;
  - o workflow já suporta backlog derivado por `Source spec`, `Related tickets` e linhagem `hybrid` na validação;
  - `spec-ticket-validation` continua sendo o gate pré-`/run-all` e não deve virar etapa obrigatória de limpeza editorial que a triagem poderia evitar.
- RNFs e restrições técnicas/documentais herdados e em escopo:
  - manter fluxo sequencial e foco exclusivo neste repositório do workflow;
  - manter o plano autocontido e executável por outra IA sem depender do trace bruto externo;
  - preservar a taxonomia atual de gaps e a separação entre triagem e `spec-ticket-validation`;
  - tratar este ticket como remediação instrucional/documental/testável, não como redesign de runtime.
- Validações pendentes/manuais herdadas relevantes:
  - o caso concreto do projeto externo já provou que o problema é real e recorrente; esta execução local precisa apenas endurecer a instrução e a cobertura automatizada, não reproduzir novamente a rodada externa;
  - uma rodada futura de `/run_specs` em projeto com backlog híbrido permanece recomendada como auditoria operacional, mas não é pré-requisito para fechar esta correção se os critérios observáveis locais estiverem atendidos.
- Enumerações finitas relevantes que devem permanecer explícitas neste plano:
  - modos de linhagem suportados para backlog aberto: `Source spec`, `Related tickets`, `hybrid`;
  - decisões explícitas que a triagem deve tomar diante de backlog aberto na mesma linhagem: `reutilizar/atualizar ticket aberto`, `dividir ownership com fronteira observável`, `justificar coexistência`;
  - gaps que não podem permanecer apenas por backlog histórico ainda não reconciliado: `duplication-gap`, `closure-criteria-gap`.
- Artefatos do caso concreto consultados:
  - `../guiadomus-scheduler/tickets/open/2026-03-31-alinhar-fixture-ou-capacidade-downstream-para-o-replay-local-trigger-crawler.md`
  - `../guiadomus-scheduler/tickets/open/2026-04-01-reclassificar-backlog-residual-historico-da-spec-de-replay-local-trigger-crawler.md`
  - `../guiadomus-scheduler/.codex-flow-runner/flow-traces/decisions/20260401t162208z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-decision.json`
- Superfícies do `codex-flow-runner` com maior probabilidade de mudança:
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `docs/workflows/codex-quality-gates.md`
  - `src/integrations/codex-client.test.ts`
  - `src/core/runner.test.ts`
- Superfícies que devem permanecer estáveis por padrão:
  - `src/core/runner.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/types/spec-ticket-validation.ts`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`

## Plan of Work
- Milestone 1: Tornar a reconciliação de backlog aberto uma regra explícita da triagem.
  - Entregável: `prompts/01-avaliar-spec-e-gerar-tickets.md` e `docs/workflows/codex-quality-gates.md` passam a exigir releitura e reconciliação de tickets abertos da linhagem antes da criação de ticket sucessor.
  - Evidência de conclusão: o texto versionado passa a nomear explicitamente `Source spec`, `Related tickets` e `hybrid`, além das três saídas permitidas para a decisão de triagem e da obrigação de normalizar o ticket histórico quando o sucessor absorver ownership.
  - Arquivos esperados:
    - `prompts/01-avaliar-spec-e-gerar-tickets.md`
    - `docs/workflows/codex-quality-gates.md`
- Milestone 2: Fixar a barra documental de anti-duplicação e fronteira de ownership.
  - Entregável: o checklist compartilhado passa a tratar como verificação obrigatória a normalização de ownership e `Closure criteria` quando coexistirem ticket histórico aberto e ticket sucessor na mesma linhagem.
  - Evidência de conclusão: o checklist deixa observável que `duplication-gap` e `closure-criteria-gap` decorrentes apenas de backlog histórico não reconciliado são falhas evitáveis já na triagem.
  - Arquivos esperados:
    - `docs/workflows/codex-quality-gates.md`
- Milestone 3: Provar o contrato em testes automatizados.
  - Entregável: `src/integrations/codex-client.test.ts` passa a validar o wording real do prompt de triagem, e `src/core/runner.test.ts` passa a ancorar explicitamente o cenário de backlog `hybrid` com ticket histórico + ticket sucessor.
  - Evidência de conclusão: a suíte focada fica verde com asserts explícitos para os modos `Source spec | Related tickets | hybrid`, para a enumeração de decisões de reconciliação e para a ausência de dependência de limpeza editorial posterior.
  - Arquivos esperados:
    - `src/integrations/codex-client.test.ts`
    - `src/core/runner.test.ts`
- Milestone 4: Fechar a correção com validação observável e escopo mínimo.
  - Entregável: testes focados, checagem de consistência e diff final confirmam que a solução permaneceu no recorte planejado.
  - Evidência de conclusão: os comandos de validação abaixo ficam verdes e o diff não introduz mudança semântica indevida em runtime.
  - Arquivos esperados:
    - sem novos arquivos além dos alterados nos milestones anteriores e da atualização deste próprio ExecPlan durante a execução.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `tickets/open/2026-04-01-workflow-improvement-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-4bc986c1.md`, `docs/workflows/codex-quality-gates.md`, `prompts/01-avaliar-spec-e-gerar-tickets.md`, `src/integrations/codex-client.test.ts` e `src/core/runner.test.ts` para reconfirmar o baseline antes de editar.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Related tickets|tickets abertos|hybrid|Source spec|Closure criteria|ownership" prompts/01-avaliar-spec-e-gerar-tickets.md docs/workflows/codex-quality-gates.md src/integrations/codex-client.test.ts src/core/runner.test.ts` para localizar os pontos de wording e as fixtures existentes que mais se aproximam do caso do ticket.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `prompts/01-avaliar-spec-e-gerar-tickets.md` para:
   - exigir releitura de tickets abertos já ligados à spec por `Source spec`, `Related tickets` ou `hybrid`;
   - obrigar decisão explícita entre `reutilizar/atualizar ticket aberto`, `dividir ownership com fronteira observável` ou `justificar coexistência`;
   - explicitar que, se um novo ticket absorver ownership, o ticket histórico precisa ser normalizado no mesmo ciclo para não carregar `Closure criteria` ou aceite funcional duplicados.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `docs/workflows/codex-quality-gates.md` para:
   - incluir no checklist de triagem a reconciliação obrigatória de backlog aberto da mesma linhagem;
   - incluir no checklist de ExecPlan/execução/fechamento a preservação explícita da fronteira de ownership quando houver ticket histórico + sucessor;
   - manter explícitos os membros `Source spec`, `Related tickets`, `hybrid`, bem como os gaps a evitar (`duplication-gap`, `closure-criteria-gap`) quando decorrentes apenas de backlog histórico não reconciliado.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/integrations/codex-client.test.ts` para adicionar um teste que leia o prompt real de `spec-triage` e valide a presença dos guardrails novos, incluindo os três modos de linhagem e a obrigação de normalizar o ticket histórico quando um sucessor for aberto.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar com `apply_patch` `src/core/runner.test.ts` para adicionar ou refinar um cenário de backlog `hybrid` com ticket histórico aberto e ticket sucessor, tornando observável na suite que essa topologia é suportada e é a referência concreta usada pelo contrato instrucional da triagem.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Somente se o passo anterior revelar lacuna objetiva de modelagem, alterar com `apply_patch` `src/core/runner.ts` no menor recorte necessário para manter o cenário `hybrid` testável; se isso não ocorrer, não tocar produção.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Source spec|Related tickets|hybrid|reutilizar/atualizar|dividir ownership|justificar coexistencia|duplication-gap|closure-criteria-gap" prompts/01-avaliar-spec-e-gerar-tickets.md docs/workflows/codex-quality-gates.md src/integrations/codex-client.test.ts src/core/runner.test.ts` para auditar a propagação textual e de testes da regra.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts src/core/runner.test.ts` para validar o contrato do prompt real e o cenário `hybrid` coberto pela suíte.
10. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check` para garantir consistência do pacote após atualizar testes TypeScript.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- prompts/01-avaliar-spec-e-gerar-tickets.md docs/workflows/codex-quality-gates.md src/integrations/codex-client.test.ts src/core/runner.test.ts src/core/runner.ts` para auditar que o changeset permaneceu no escopo planejado e que `src/core/runner.ts` só mudou se houver justificativa objetiva registrada.

## Validation and Acceptance
- Refs de origem relacionadas:
  - `docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md#RF-08`
  - `docs/specs/2026-03-24-retomada-do-run-specs-a-partir-da-validacao.md#RF-09`
- Aplicação explícita do checklist deste planejamento:
  - o ticket inteiro e as referências obrigatórias foram lidos antes da escrita do plano;
  - a spec de origem, os RFs internos, assumptions/defaults, enumerações finitas relevantes e a matriz `requisito -> validação observável` ficaram explícitos;
  - a validação abaixo deriva dos critérios de fechamento do ticket e do draft estruturado da retrospectiva, não de checklist genérico solto.

### Matriz requisito -> validação observável
| Requisito / closure criterion | Membros explícitos / escopo finito preservado | Validação observável |
| --- | --- | --- |
| A prompt `prompts/01-avaliar-spec-e-gerar-tickets.md` passa a exigir explicitamente releitura e reconciliação de tickets abertos da linhagem antes de abrir ticket novo em rodada de retriagem. | Modos de linhagem: `Source spec`, `Related tickets`, `hybrid`. Saídas de decisão de triagem: `reutilizar/atualizar ticket aberto`, `dividir ownership com fronteira observável`, `justificar coexistência`. Regra adicional: se o sucessor absorver ownership, o histórico deve ser normalizado no mesmo ciclo. | `src/integrations/codex-client.test.ts` passa a ler o prompt real de `spec-triage` e a exigir esses termos/decisões explicitamente. Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts` Esperado: a suíte fica verde e falharia se o prompt voltasse a tratar triagem apenas como criação de ticket novo. |
| O checklist em `docs/workflows/codex-quality-gates.md` passa a tratar como verificação obrigatória a normalização de ownership e `Closure criteria` quando houver ticket histórico aberto e ticket sucessor na mesma linhagem. | Coexistência explícita: `ticket histórico aberto + ticket sucessor`. Gaps a evitar quando o problema for apenas backlog não reconciliado: `duplication-gap`, `closure-criteria-gap`. | O arquivo versionado passa a citar explicitamente a reconciliação obrigatória e os gaps evitáveis. Comando: `rg -n "ticket historico|ticket sucessor|ownership|Closure criteria|duplication-gap|closure-criteria-gap|Source spec|Related tickets|hybrid" docs/workflows/codex-quality-gates.md` Esperado: o `rg` encontra o checklist novo com wording inequívoco sobre reconciliação de backlog aberto e anti-duplicação. |
| Há teste automatizado cobrindo uma spec com backlog aberto `hybrid` em que a triagem abre ticket sucessor sem deixar o ticket histórico carregando aceite funcional ou fechamento duplicado. | Topologia explícita do cenário: backlog `hybrid` com `ticket histórico aberto` + `ticket sucessor`; a prova não pode colapsar a topologia em “backlog existente” genérico. | `src/core/runner.test.ts` passa a ancorar explicitamente o cenário suportado de backlog `hybrid` usado pelo ticket como caso causal. Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/core/runner.test.ts` Esperado: a suíte fica verde com um teste nomeado para backlog `hybrid`/ticket histórico + sucessor, preservando a topologia real que a triagem precisa reconciliar. |
| A evidência de teste mostra que o pacote derivado sai da triagem sem `duplication-gap` ou `closure-criteria-gap` decorrentes apenas de backlog histórico ainda não reconciliado. | Gaps explícitos: `duplication-gap`, `closure-criteria-gap`. Escopo explícito: somente quando a causa for backlog histórico não reconciliado, não outros gaps funcionais legítimos do pacote. | Evidência combinada: o teste de prompt prova que a triagem agora recebe a instrução obrigatória de normalizar o histórico, e o teste do `runner` prova que o cenário `hybrid` concreto continua suportado pelo pacote. Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm test -- src/integrations/codex-client.test.ts src/core/runner.test.ts` Esperado: ambos os testes verdes, ancorando o contrato instrucional e a topologia concreta que antes gerou `duplication-gap` e `closure-criteria-gap` no gate funcional. |

- Comando complementar de consistência tipada:
  - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run check`
  - Esperado: zero erros após atualizar as suítes TypeScript.
- Comando complementar de auditoria de escopo:
  - Comando: `git diff -- prompts/01-avaliar-spec-e-gerar-tickets.md docs/workflows/codex-quality-gates.md src/integrations/codex-client.test.ts src/core/runner.test.ts src/core/runner.ts`
  - Esperado: diff restrito ao recorte do ticket; `src/core/runner.ts` só aparece se houver descoberta objetiva registrada neste plano.

## Idempotence and Recovery
- Idempotência:
  - reaplicar os patches deve convergir para um único wording final em prompt e checklist, sem duplicar bullets ou parágrafos;
  - rerodar os testes focados não produz artefatos persistentes e apenas revalida o contrato instrucional e o cenário `hybrid`;
  - a auditoria por `rg` deve continuar encontrando exatamente os membros explícitos preservados neste plano.
- Riscos:
  - wording fraco demais continuar permitindo abertura de ticket sucessor sem normalização do histórico;
  - wording forte demais induzir over-splitting ou transformar o gate funcional em obrigação editorial excessiva;
  - o teste do `runner` ficar abstrato demais e perder a topologia concreta `ticket histórico + ticket sucessor`;
  - surgir um blocker real em `src/core/runner.ts` e a execução tentar “compensar” isso com texto apenas.
- Recovery / Rollback:
  - se o prompt ficar prolixo, reduzir o racional e manter apenas as decisões operacionais mínimas, deixando a explicação mais longa no checklist compartilhado;
  - se o checklist induzir comportamento além do ticket, reescrever imediatamente para focar apenas em reconciliação de backlog aberto da mesma linhagem;
  - se o teste do `runner` exigir tocar produção sem justificativa forte, interromper a execução e registrar blocker explícito em vez de ampliar escopo silenciosamente;
  - se uma mudança em `src/core/runner.ts` se mostrar necessária, mantê-la no menor corte possível e refletir isso em `Surprises & Discoveries`, `Decision Log` e `Validation and Acceptance`.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-04-01-workflow-improvement-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-4bc986c1.md`
- Artefatos causais consultados:
  - `../guiadomus-scheduler/.codex-flow-runner/flow-traces/decisions/20260401t162208z-run-specs-spec-spec-ticket-derivation-retrospective-2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar-decision.json`
  - `../guiadomus-scheduler/docs/specs/2026-03-30-evoluir-replay-local-da-pipeline-para-trigger-e-crawler-auxiliar.md`
  - `../guiadomus-scheduler/tickets/open/2026-03-31-alinhar-fixture-ou-capacidade-downstream-para-o-replay-local-trigger-crawler.md`
  - `../guiadomus-scheduler/tickets/open/2026-04-01-reclassificar-backlog-residual-historico-da-spec-de-replay-local-trigger-crawler.md`
- Documentos e superfícies do workflow consultados no planejamento:
  - `AGENTS.md`
  - `DOCUMENTATION.md`
  - `INTERNAL_TICKETS.md`
  - `PLANS.md`
  - `SPECS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `prompts/01-avaliar-spec-e-gerar-tickets.md`
  - `prompts/09-validar-tickets-derivados-da-spec.md`
  - `prompts/10-autocorrigir-tickets-derivados-da-spec.md`
  - `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`
  - `src/integrations/codex-client.ts`
  - `src/integrations/codex-client.test.ts`
  - `src/core/runner.ts`
  - `src/core/runner.test.ts`
  - `src/core/spec-ticket-validation.ts`
  - `src/types/spec-ticket-validation.ts`
- Nota metodológica:
  - este ticket é de `systemic-instruction`; por isso a principal evidência automatizada deve travar o contrato textual entregue ao Codex e o cenário suportado de backlog `hybrid`, sem simular enforcement semântico inexistente no runtime atual.
- Checklist aplicado neste planejamento:
  - leitura integral do ticket e das referências obrigatórias antes de planejar;
  - declaração explícita da spec de origem, dos RFs internos, assumptions/defaults e enumerações finitas relevantes;
  - tradução literal dos critérios de fechamento em matriz `requisito -> validação observável`;
  - explicitação de riscos, não-escopo e dependências antes da execução.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato textual da triagem em `prompts/01-avaliar-spec-e-gerar-tickets.md`;
  - checklist compartilhado do workflow em `docs/workflows/codex-quality-gates.md`;
  - cobertura automatizada de prompt real e de cenário `hybrid` em `src/integrations/codex-client.test.ts` e `src/core/runner.test.ts`.
- Compatibilidade:
  - o fluxo continua `spec -> tickets` e `ticket -> execplan` quando necessário;
  - a topologia `Source spec | Related tickets | hybrid` continua sendo suportada e agora passa a ser explicitamente carregada no contrato da triagem;
  - não há mudança planejada na taxonomia de gaps, no `/run_specs_from_validation`, no publisher de tickets ou na semântica do `spec-ticket-validation`.
- Dependências externas e mocks:
  - nenhuma dependência npm nova é esperada;
  - os testes devem reutilizar o harness existente de `CodexCliTicketFlowClient` e os fixtures/helpers já presentes em `src/core/runner.test.ts`;
  - o caso externo em `../guiadomus-scheduler` permanece evidência causal e não dependência de execução da suíte local.
