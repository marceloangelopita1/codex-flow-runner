# [SPEC] /target_investigate_case_v2 diagnosis-first com contrato explícito entre runner e target project

## Metadata
- Spec ID: 2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction
- Status: attended
- Spec treatment: done
- Owner: mapita
- Created at (UTC): 2026-04-08 20:25Z
- Last reviewed at (UTC): 2026-04-09 21:21Z
- Source: technical-evolution
- Related tickets:
  - tickets/closed/2026-04-09-target-investigate-case-v2-spec-compatibility-closure-gap.md
  - tickets/closed/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md
  - tickets/closed/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
  - tickets/closed/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md
  - tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md
- Related execplans:
  - execplans/2026-04-09-target-investigate-case-v2-spec-compatibility-closure-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-evaluation-summary-trace-hard-cut-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-stage-orchestration-gap.md
  - execplans/2026-04-09-target-investigate-case-v2-hard-cut-contract-gap.md
  - execplans/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - execplans/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md
  - execplans/2026-04-08-target-investigate-case-v2-lineage-enforcement-gap.md
  - execplans/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md
- Related commits:
  - `5e4e961` - fechamento do ticket de `diagnosis.*` e das superfícies operator-facing diagnosis-first.
  - `bb2e497` - fechamento do ticket de contrato runner-side e do caminho mínimo diagnosis-first.
  - `5060863` - fechamento do follow-up de `lineage` nos artefatos mínimos da v2.
  - `4edbbc3` - fechamento do ticket de continuações opcionais, publication tardia e guardrails de migração.
  - fechamento local de 2026-04-09 dos follow-ups de hard cut, orquestração por estágio e superfícies finais diagnosis-first; registrado no commit de fechamento desta trilha local.
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve:
  o desenho anterior de investigação de caso ficou estruturalmente pesado demais para responder a pergunta principal de um caso real: o workflow está certo ou está errado neste caso, por quê e o que precisa mudar. O repositório precisava de um contrato mais curto, mais legível e mais fácil de operar, com diagnóstico claro como produto padrão e não como consequência tardia de uma cadeia auxiliar.
- Resultado esperado:
  reconstruir o fluxo como `target-investigate-case-v2`, diagnosis-first, com contrato explícito entre `codex-flow-runner` e projeto alvo. O caminho padrão deve resolver o caso, reunir as evidências necessárias, produzir um diagnóstico humano-legível e só depois escalar, quando necessário, para aprofundamento causal, proposta de melhoria, projeção de ticket e publication.
- Contexto funcional:
  esta spec é intencionalmente cross-repo. Ela descreve tanto o comportamento que o runner deve orquestrar quanto o comportamento que o projeto alvo deve expor para ser compatível com a v2. A derivação inicial de tickets deverá começar no runner para introduzir o novo contrato e a nova orquestração. Depois disso, cada projeto alvo que quiser aderir à v2 deverá derivar seus próprios tickets de compatibilização a partir desta mesma spec.
- Restrições técnicas relevantes:
  - preservar rastreabilidade consistente entre os artefatos obrigatórios da v2;
  - preservar publication runner-side conservadora, anti-overfit e rastreabilidade cross-repo;
  - não acoplar o runner à lógica, aos dados e aos scripts de um projeto alvo específico;
  - manter o projeto alvo como autoridade semântica do caso, dos insumos relevantes e do framing do workflow;
  - não reintroduzir cadeias auxiliares fora dos estágios canônicos da v2 como pré-condição do caminho mínimo;
  - reduzir custo cognitivo e deixar a resposta principal entendível por um humano em menos de 2 minutos.

## Motivação arquitetural
- O fluxo vivo precisa priorizar:
  - clareza diagnóstica;
  - velocidade de entendimento humano;
  - um artefato principal inequívoco;
  - separação clara entre resposta do caso e eventuais continuações de publication.
- O fluxo vivo não deve voltar a priorizar:
  - cadeias auxiliares longas antes do veredito principal;
  - recomposições obrigatórias fora dos estágios canônicos;
  - superfícies operator-facing publication-first;
  - contrato pesado demais para a pergunta central do caso.

## Modelo de responsabilidades
- Responsabilidades do `codex-flow-runner`:
  - receber a requisição do operador e validar que existe um target compatível;
  - normalizar referências de entrada e abrir uma rodada rastreável;
  - executar as etapas do fluxo na ordem correta;
  - carregar prompts do target pelos slots canônicos declarados em manifesto;
  - injetar contexto operacional padrão, paths, round id e artefatos esperados;
  - validar schemas, persistir traces, refletir status em logs e Telegram e manter a publication runner-side;
  - permanecer target-agnostic: o runner não deve embutir heurísticas sobre onde estão os logs, como ler banco, qual script consulta GCP, qual arquivo do workflow é relevante ou qual é a semântica esperada de cada domínio.
- Responsabilidades do projeto alvo:
  - declarar em manifesto os estágios suportados, seus prompts canônicos, artefatos e políticas;
  - resolver a execução exata do caso a partir das referências recebidas;
  - saber quais insumos e fontes de dados são necessários para avaliar aquele workflow naquele caso;
  - declarar como esses insumos devem ser coletados, inclusive scripts, comandos, fontes locais, fontes remotas, banco e logs;
  - montar o `case-bundle.json` e contextualizar o workflow para o diagnóstico;
  - fornecer o framing semântico do diagnóstico e dos estágios opcionais;
  - manter autoridade semântica sobre causa, comportamento esperado, mudança necessária e conteúdo do ticket do próprio projeto.
- Responsabilidades compartilhadas:
  - preservar rastreabilidade;
  - manter limites claros de evidência e sensibilidade;
  - evitar overfit a um caso isolado;
  - manter `lineage` coerente quando o target optar por materializá-la na rodada.
- Não-responsabilidades explícitas:
  - o runner não deve virar um catálogo de procedimentos operacionais específicos de target;
  - o target não deve tomar a decisão final de publication runner-side;
  - nem runner nem target devem exigir `deep-dive`, `ticket-projection` ou `publication` para responder o diagnóstico inicial do caso.

## Jornada de uso
1. O operador, via Telegram, aciona `target-investigate-case-v2` informando projeto alvo e referências do caso.
2. O runner valida a compatibilidade do target, abre a rodada e registra o pedido de forma rastreável.
3. O runner executa o estágio `resolve-case`, target-owned, para identificar exatamente qual execução, request, attempt ou rodada está sendo investigada.
4. O runner executa o estágio `assemble-evidence`, target-owned, para coletar ou referenciar os insumos necessários e consolidar o `case-bundle.json`.
5. O runner executa o estágio `diagnosis`, usando o prompt canônico do target para produzir `diagnosis.md` e `diagnosis.json`.
6. Se o diagnóstico já for suficiente, a rodada encerra com próxima ação clara.
7. Se ainda houver ambiguidade causal relevante, o runner pode escalar para `deep-dive`.
8. Se a mudança necessária já estiver clara, o target pode materializar `improvement-proposal.json`.
9. Se a mudança estiver estabilizada e fizer sentido projetar um ticket do projeto alvo, o runner pode executar `ticket-projection`.
10. Só depois, e de forma tardia, runner-side e separada, a rodada pode atravessar `publication`.

## Fluxo canônico da v2
- Estágio `preflight`
  - owner: `codex-flow-runner`
  - objetivo: validar projeto, manifesto, comando, referências mínimas e condições operacionais.
  - prompt: não se aplica como prompt semântico target-owned.
  - saída mínima: contexto operacional da rodada pronto para execução.
- Estágio `resolve-case`
  - owner: `target-project`
  - executor: `codex-flow-runner`
  - objetivo: transformar referências recebidas em uma resolução explícita do caso investigado.
  - pergunta que precisa responder: qual é exatamente a execução, request, attempt ou rodada que estamos avaliando.
  - saída mínima: `case-resolution.json`.
- Estágio `assemble-evidence`
  - owner: `target-project`
  - executor: `codex-flow-runner`
  - objetivo: decidir quais dados são necessários para o caso, coletá-los ou referenciá-los de forma auditável e consolidar o bundle.
  - pergunta que precisa responder: quais evidências realmente precisamos para diagnosticar este caso e onde elas estão.
  - saída mínima: `evidence-index.json` e `case-bundle.json`.
- Estágio `diagnosis`
  - owner: `target-project`
  - executor: `codex-flow-runner`
  - objetivo: avaliar o caso com base no bundle já montado e responder o veredito principal.
  - pergunta que precisa responder: o caso está ok ou não está, por quê e qual é a superfície provável de correção.
  - saída mínima: `diagnosis.md` e `diagnosis.json`.
- Estágio `deep-dive`
  - owner: `target-project`
  - executor: `codex-flow-runner`
  - objetivo: aprofundar apenas os pontos ainda em aberto depois do diagnóstico.
  - condição de uso: opcional; não entra no caminho mínimo.
  - saída mínima: `deep-dive.request.json` e `deep-dive.result.json`, quando acionado.
- Estágio `improvement-proposal`
  - owner: `target-project`
  - executor: `codex-flow-runner`
  - objetivo: explicitar qual comportamento precisa mudar, por que e qual é a menor superfície provável de correção.
  - condição de uso: opcional; só depois de diagnóstico suficiente.
  - saída mínima: `improvement-proposal.json`, quando acionado.
- Estágio `ticket-projection`
  - owner: `target-project`
  - executor: `codex-flow-runner`
  - objetivo: transformar um diagnóstico e uma proposta de melhoria já estabilizados em ticket candidato do projeto alvo.
  - condição de uso: opcional; não pode reabrir o diagnóstico.
  - saída mínima: `ticket-proposal.json`, quando acionado.
- Estágio `publication`
  - owner: `codex-flow-runner`
  - objetivo: aplicar a política conservadora de publication e decidir se existe publicação runner-side.
  - condição de uso: opcional e tardia.
  - saída mínima: `publication-decision.json`, quando acionado.

## Contrato de manifesto da v2
- O manifesto v2 deve ser a fonte de verdade para o contrato entre runner e target.
- O runner deve conhecer apenas os nomes canônicos dos estágios e ler do manifesto:
  - `flow = "target-investigate-case-v2"`
  - `entrypoint` global quando houver;
  - `stages.resolveCase`
  - `stages.assembleEvidence`
  - `stages.diagnosis`
  - `stages.deepDive` quando suportado
  - `stages.improvementProposal` quando suportado
  - `stages.ticketProjection` quando suportado
  - `publicationPolicy`
- Cada estágio target-owned deve declarar, no mínimo:
  - `owner = "target-project"`
  - `runnerExecutor = "codex-flow-runner"`
  - `promptPath` quando o estágio usar instrução semântica via Codex
  - `entrypoint` quando houver comando/script oficial
  - `artifacts` de request/result/output
  - `policy` ou equivalente com limites de leitura, evidência e sensibilidade
- Regra canônica de execução:
  - quando `promptPath` e `entrypoint` coexistirem no mesmo estágio, o prompt do target deve usar primeiro o `entrypoint` oficial e tratá-lo como autoridade operacional daquele estágio;
  - quando houver apenas `entrypoint`, o runner pode executá-lo sem prompt target-owned adicional;
  - quando houver apenas `promptPath`, o target assume responsabilidade por instruir com clareza como resolver o estágio sem extrapolar superfícies.
- Exemplo diagnóstico de shape mínimo:

```json
{
  "flow": "target-investigate-case-v2",
  "stages": {
    "resolveCase": {
      "owner": "target-project",
      "runnerExecutor": "codex-flow-runner",
      "promptPath": "docs/workflows/target-investigate-case-v2-resolve-case.md",
      "entrypoint": {
        "command": "npm run case-investigation -- resolve-case"
      }
    },
    "assembleEvidence": {
      "owner": "target-project",
      "runnerExecutor": "codex-flow-runner",
      "promptPath": "docs/workflows/target-investigate-case-v2-assemble-evidence.md"
    },
    "diagnosis": {
      "owner": "target-project",
      "runnerExecutor": "codex-flow-runner",
      "promptPath": "docs/workflows/target-investigate-case-v2-diagnosis.md"
    }
  },
  "publicationPolicy": {
    "semanticAuthority": "target-project",
    "finalPublicationAuthority": "runner"
  }
}
```

## Prompts canônicos e convenção de nomes
- A v2 deve padronizar os slots de prompt por estágio para que o runner saiba exatamente qual contexto está executando.
- Nomes canônicos de estágio:
  - `resolve-case`
  - `assemble-evidence`
  - `diagnosis`
  - `deep-dive`
  - `improvement-proposal`
  - `ticket-projection`
- Convenção recomendada de arquivos no projeto alvo:
  - `docs/workflows/target-investigate-case-v2-resolve-case.md`
  - `docs/workflows/target-investigate-case-v2-assemble-evidence.md`
  - `docs/workflows/target-investigate-case-v2-diagnosis.md`
  - `docs/workflows/target-investigate-case-v2-deep-dive.md`
  - `docs/workflows/target-investigate-case-v2-improvement-proposal.md`
  - `docs/workflows/target-investigate-case-v2-ticket-projection.md`
- Função de cada prompt:
  - `resolve-case`: ensinar o runner a transformar referências de entrada em uma resolução inequívoca do caso, usando apenas as superfícies declaradas pelo target.
  - `assemble-evidence`: ensinar o runner a descobrir quais evidências são necessárias para aquele caso, como coletá-las, onde salvá-las e como indexá-las; este é o prompt que deve mencionar scripts, banco, logs locais, logs remotos, GCP, comandos e critérios de suficiência.
  - `diagnosis`: avaliar o `case-bundle.json` e produzir o veredito principal do caso.
  - `deep-dive`: refinar causa e superfície de correção apenas quando o diagnóstico não bastar.
  - `improvement-proposal`: materializar a mudança necessária sem reabrir a análise inteira.
  - `ticket-projection`: transformar um diagnóstico já estabilizado em ticket candidato do projeto alvo.
- Regra de clareza:
  - `assemble-evidence` é o lugar correto para o target explicar como encontrar logs, quando usar scripts, como consultar banco e como agrupar insumos na rodada;
  - `diagnosis` não deve repetir instruções operacionais longas de coleta; ele deve assumir que o bundle já está montado;
  - `deep-dive` não deve virar um segundo diagnóstico inteiro; ele deve focar apenas o que ficou em aberto.

## Artefatos canônicos da v2
- Namespace autoritativo da rodada:
  - `output/case-investigation/<round-id>/` no projeto alvo.
- Namespace runner-side durante migração:
  - `investigations/<round-id>/` pode existir como espelho leve de rastreabilidade e compatibilidade;
  - ele não pode se tornar uma segunda autoridade semântica.
- Artefatos obrigatórios do caminho mínimo:
  - `case-resolution.json`
    - registra como as referências recebidas foram resolvidas;
    - deve dizer se o caso foi resolvido, ficou ambíguo ou indisponível;
    - deve apontar claramente a execução selecionada ou o blocker.
  - `evidence-index.json`
    - inventário factual das evidências coletadas ou referenciadas;
    - deve dizer o que foi coletado, onde está, como foi obtido e por que é relevante;
    - pode apontar para arquivos locais, outputs de scripts, registros de banco, locators remotos e notas curtas.
  - `case-bundle.json`
    - pacote curado para diagnóstico;
    - deve conter apenas o contexto necessário para responder o caso;
    - deve referenciar `evidence-index.json`, não duplicar indiscriminadamente todo o inventário bruto.
  - `diagnosis.md`
    - artefato principal para leitura humana;
    - deve ser compreensível em menos de 2 minutos;
    - deve responder de forma direta se o caso está ok ou não está, por quê e o que precisa mudar.
  - `diagnosis.json`
    - equivalente estruturado do diagnóstico;
    - fonte canônica machine-readable para summary, Telegram e automações.
- Diretório local reservado para evidências:
  - `evidence/` dentro da rodada do target, criado quando a coleta materializar arquivos locais;
  - o conteúdo pode ser local-only e não versionado por default;
  - `evidence-index.json` é quem indexa esse diretório e os locators externos relacionados.
- Artefatos opcionais:
  - `deep-dive.request.json`
  - `deep-dive.result.json`
  - `improvement-proposal.json`
  - `ticket-proposal.json`
  - `publication-decision.json`
- Conteúdo mínimo esperado em `diagnosis.json`:
  - `schema_version`
  - `bundle_artifact`
  - `verdict = ok | not_ok | inconclusive`
  - `summary`
  - `why`
  - `expected_behavior`
  - `observed_behavior`
  - `confidence = low | medium | high`
  - `behavior_to_change`
  - `probable_fix_surface`
  - `evidence_used`
  - `next_action`
  - `lineage`

## Formato esperado de `diagnosis.md`
- O artefato principal para humanos deve abrir com um veredito explícito.
- Estrutura recomendada:
  - `Veredito`
  - `Workflow avaliado`
  - `Objetivo esperado`
  - `O que a evidência mostra`
  - `Por que o caso está ok ou não está`
  - `Comportamento que precisa mudar`
  - `Superfície provável de correção`
  - `Próxima ação`
- Regra de qualidade:
  - o operador deve conseguir ler `diagnosis.md` isoladamente e sair com entendimento suficiente do caso sem depender de abrir cinco JSONs auxiliares.

## Requisitos funcionais
- RF-01: a nova linha do fluxo deve se chamar explicitamente `target-investigate-case-v2` ou `/target_investigate_case_v2`.
- RF-02: esta spec deve ser tratada como contrato cross-repo, descrevendo comportamento obrigatório tanto do runner quanto do projeto alvo compatível.
- RF-03: a derivação inicial de tickets desta spec deve começar no runner, mas a adoção completa da v2 exige tickets posteriores nos projetos alvo aderentes.
- RF-04: o runner deve permanecer target-agnostic e não pode embutir lógica específica de coleta, resolução de caso, código relevante ou semântica de workflow de um target.
- RF-05: o projeto alvo deve ser a autoridade para resolver o caso, declarar insumos necessários, instruir coleta, contextualizar o workflow e definir a semântica dos prompts da v2.
- RF-06: o caminho mínimo da v2 deve ser `preflight -> resolve-case -> assemble-evidence -> diagnosis`.
- RF-07: `resolve-case`, `assemble-evidence` e `diagnosis` são estágios obrigatórios da v2.
- RF-08: `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` são estágios opcionais e escalonados.
- RF-09: o target deve declarar no manifesto da v2 os slots canônicos de prompt por estágio suportado.
- RF-10: a nomenclatura canônica de estágios deve ser exatamente:
  - `resolve-case`
  - `assemble-evidence`
  - `diagnosis`
  - `deep-dive`
  - `improvement-proposal`
  - `ticket-projection`
- RF-11: a convenção recomendada de arquivos para prompts v2 no target deve usar o prefixo `target-investigate-case-v2-<stage>.md`.
- RF-12: `resolve-case` deve materializar `case-resolution.json` com resolução explícita ou blocker explícito; ele não pode selecionar silenciosamente uma execução ambígua.
- RF-13: `assemble-evidence` deve materializar `evidence-index.json` e `case-bundle.json`.
- RF-14: `assemble-evidence` deve ser o estágio responsável por instruções operacionais de coleta, incluindo scripts, banco, logs locais, logs remotos, cloud, GCP e critérios de suficiência, quando aplicável ao target.
- RF-15: `diagnosis` deve produzir `diagnosis.md` e `diagnosis.json` como artefatos principais do caso.
- RF-16: `diagnosis.md` deve responder explicitamente:
  - o caso está ok ou não está;
  - qual é o objetivo esperado do workflow;
  - o que a evidência mostra;
  - por que isso é satisfatório ou insatisfatório;
  - qual comportamento precisa mudar, se houver;
  - qual é a superfície provável de correção;
  - qual é a próxima ação recomendada.
- RF-17: `diagnosis.json` deve usar `verdict = ok | not_ok | inconclusive`.
- RF-18: `diagnosis` não pode depender de `deep-dive`, `ticket-projection` ou `publication` para existir.
- RF-19: `deep-dive` só pode ser acionado quando houver ambiguidade causal, baixa confiança ou necessidade real de localizar a menor mudança plausível.
- RF-20: `improvement-proposal` só pode nascer depois que o diagnóstico já tiver definido com clareza o comportamento que precisa mudar.
- RF-21: `ticket-projection` deve produzir ticket para o projeto alvo, respeitando as convenções do target, sem reabrir a análise diagnóstica.
- RF-22: `publication` deve permanecer runner-side, conservadora e tardia.
- RF-23: `case-resolution.json`, `case-bundle.json` e `diagnosis.json` devem poder carregar `lineage` coerente de rodada quando o target optar por materializar rastreabilidade adicional.
- RF-24: o namespace autoritativo da rodada deve ser o do projeto alvo; espelhos runner-side, quando existirem, devem ser secundários.
- RF-25: a v2 deve reduzir a necessidade de recomposições obrigatórias entre fases; o caminho mínimo não pode depender de cadeias auxiliares fora dos estágios canônicos `resolve-case -> assemble-evidence -> diagnosis`.
- RF-26: artefatos e summaries operator-facing no runner e no Telegram devem ser diagnosis-first, não publication-first.
- RF-27: artefatos históricos ou espelhos secundários nunca podem voltar a competir com o contrato canônico da v2.
- RF-28: a spec deve permanecer diagnóstica e normativa, sem ficar acoplada a um projeto alvo específico; exemplos de piloto são apenas ilustrativos.

<!-- Heading canônico: use exatamente "## Assumptions and defaults" nas specs locais. O workflow aceita "## Premissas e defaults" apenas como alias de compatibilidade de leitura para specs externas ou legadas. -->
## Assumptions and defaults
- a v2 é o único contrato vivo de investigação de caso neste repositório;
- o caminho mínimo da v2 não exige `deep-dive`, `improvement-proposal`, `ticket-projection` nem `publication`;
- o namespace autoritativo da rodada fica no projeto alvo;
- `investigations/<round-id>/` pode existir apenas como espelho secundário de rastreabilidade;
- `diagnosis.md` e `diagnosis.json` são os artefatos principais da rodada por default;
- o primeiro conjunto de tickets derivados desta spec será aberto no runner; a aderência dos targets virá em uma segunda onda de derivação;
- o piloto `../guiadomus-matricula` continua sendo exemplo de referência, mas não define sozinho o contrato da v2.

## Não-escopo
- migrar retroativamente todos os rounds históricos pré-v2;
- exigir que todo target implemente todos os estágios opcionais desde o primeiro dia;
- transformar o runner em catálogo operacional de cada target;
- fundir runner e target em uma única autoridade semântica;
- reabrir publication automática por default;
- tratar `deep-dive` como fase obrigatória do caminho mínimo;
- substituir julgamento humano por gates cegos de artifact completeness.

## Critérios de aceitação (observáveis)
- [x] CA-01 - existe um contrato v2 explícito, com nome próprio, estágios canônicos e manifesto cross-repo para runner e target.
- [x] CA-02 - o caminho mínimo da v2 materializa `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json` sem exigir `deep-dive`, `ticket-proposal.json` nem `publication-decision.json`.
- [x] CA-03 - `diagnosis.md` responde claramente se o caso está ok ou não está, por quê, o que precisa mudar e qual é a superfície provável de correção.
- [x] CA-04 - o estágio `assemble-evidence` é explicitamente responsável por instruções de coleta e por indexar as evidências necessárias do caso.
- [x] CA-05 - `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` existem como continuações opcionais e tardias.
- [x] CA-06 - a semântica do caso continua target-owned, enquanto a publication final continua runner-side.
- [x] CA-07 - o summary final do runner e a resposta no Telegram passam a ser diagnosis-first.
- [x] CA-08 - a mesma spec consegue derivar tickets tanto para o runner quanto, depois, para projetos alvo aderentes.

## Gate de validação dos tickets derivados
- Veredito atual: GO
- Gaps encontrados:
  - nenhum
- Correções aplicadas:
  - atualização dos `Closure criteria` do ticket de contrato runner-side para exigir observabilidade do shape mínimo do manifesto v2, da fronteira target-owned/runner-side, da `publicationPolicy` e da convenção de `promptPath` por estágio;
  - atualização dos `Closure criteria` do ticket de continuações opcionais para exigir `ticket-proposal.json` e evidência objetiva de aderência às convenções declaradas pelo projeto alvo.
- Causa-raiz provável:
  - a primeira redação dos tickets aplicou de forma incompleta o contrato de triagem aos `Closure criteria`, e a lacuna foi corrigida na revalidação.
- Ciclos executados:
  - 2 (`initial-validation` + `revalidation`)
- Nota de uso: quando a spec vier de `/run_specs`, preencher esta seção apenas com o veredito, os gaps, as correções e o histórico funcional do gate formal; fora desse fluxo, registrar `n/a` quando não se aplicar.
- Política histórica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Última execução registrada
- Executada em (UTC): 2026-04-08T21:59:25.628Z
- Veredito: GO
- Confiança final: high
- Motivo final: go-with-high-confidence
- Resumo: GO: houve progresso real em relação ao passe anterior. A quantidade total de gaps caiu de 2 para 0, e os dois `closure-criteria-gap` anteriores nos mesmos tickets foram efetivamente resolvidos nesta revalidação: o ticket de contrato agora torna observáveis o shape mínimo do manifesto v2, a fronteira target-owned/runner-side, `publicationPolicy` e a convenção de `promptPath`; o ticket de continuações opcionais agora torna observáveis `ticket-proposal.json` e a aderência às convenções declaradas pelo projeto alvo.
- Ciclos executados no pacote: 2
- Thread da validação: 019d6f14-2a6a-7932-96aa-a404a970da1d
- Contexto de triagem herdado: não
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/closed/2026-04-08-target-investigate-case-v2-diagnosis-artifacts-and-operator-surfaces-gap.md [fonte=source-spec]
  - tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md [fonte=source-spec]
  - tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md [fonte=source-spec]

#### Histórico por ciclo
- Ciclo 0 [initial-validation]: NO_GO (high)
  - Resumo: NO_GO: o pacote cobre as três frentes principais da spec runner-side, mas ainda deixa dois requisitos herdados sem fechamento observável suficiente. O ticket de contrato não prova o shape mínimo do manifesto v2 nem a semântica target-owned/promptPath exigidas pela spec, e o ticket de continuações opcionais não torna observável a saída e o contrato de `ticket-projection` para o projeto alvo.
  - Thread: 019d6f14-2a6a-7932-96aa-a404a970da1d
  - Fingerprints abertos: closure-criteria-gap|tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md|ca-05&rf-21, closure-criteria-gap|tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md|ca-06&rf-05&rf-09&rf-11
  - Redução real de gaps vs. ciclo anterior: n/a
  - Correções deste ciclo: 0
- Ciclo 1 [revalidation]: GO (high)
  - Resumo: GO: houve progresso real em relação ao passe anterior. A quantidade total de gaps caiu de 2 para 0, e os dois `closure-criteria-gap` anteriores nos mesmos tickets foram efetivamente resolvidos nesta revalidação: o ticket de contrato agora torna observáveis o shape mínimo do manifesto v2, a fronteira target-owned/runner-side, `publicationPolicy` e a convenção de `promptPath`; o ticket de continuações opcionais agora torna observáveis `ticket-proposal.json` e a aderência às convenções declaradas pelo projeto alvo.
  - Thread: 019d6f14-2a6a-7932-96aa-a404a970da1d
  - Fingerprints abertos: nenhum
  - Redução real de gaps vs. ciclo anterior: sim
  - Correções deste ciclo: 2
    - Atualizados os Closure criteria do ticket de contrato runner-side para exigir observabilidade do shape mínimo do manifesto v2, da fronteira target-owned/runner-side, da `publicationPolicy` e da convenção de `promptPath` por estágio. [applied]
    - Atualizados os Closure criteria do ticket de continuações opcionais para exigir que `ticket-projection` materialize `ticket-proposal.json` e registre evidência objetiva de aderência às convenções declaradas pelo projeto alvo. [applied]

#### Gaps encontrados
- Nenhum.

#### Correções aplicadas
- Atualizados os Closure criteria do ticket de contrato runner-side para exigir observabilidade do shape mínimo do manifesto v2, da fronteira target-owned/runner-side, da `publicationPolicy` e da convenção de `promptPath` por estágio.
  - Artefatos afetados: tickets/closed/2026-04-08-target-investigate-case-v2-runner-contract-and-minimum-path-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied
- Atualizados os Closure criteria do ticket de continuações opcionais para exigir que `ticket-projection` materialize `ticket-proposal.json` e registre evidência objetiva de aderência às convenções declaradas pelo projeto alvo.
  - Artefatos afetados: tickets/closed/2026-04-08-target-investigate-case-v2-optional-continuations-and-migration-guards-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied

## Retrospectiva sistêmica da derivação dos tickets
- Executada: sim
- Motivo de ativação ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificação final: not-systemic
- Confiança: high
- Frente causal analisada: a primeira redação dos tickets aplicou de forma incompleta um contrato de triagem já existente para herança observável de requisitos e `Closure criteria`; não houve lacuna material nas instruções, validações ou ordem do workflow.
- Achados sistêmicos:
  - nenhum
- Artefatos do workflow consultados:
  - AGENTS.md
  - DOCUMENTATION.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - SPECS.md
  - docs/workflows/codex-quality-gates.md
  - docs/workflows/target-project-compatibility-contract.md
  - docs/workflows/target-case-investigation-v2-manifest.json
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - prompts/12-retrospectiva-derivação-tickets-pre-run-all.md
  - src/core/runner.ts
  - src/core/spec-ticket-validation.ts
  - src/types/spec-ticket-validation.ts
- Elegibilidade de publicação: não
- Resultado do ticket transversal ou limitação operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta seção deve registrar a retrospectiva pre-run-all como superfície distinta do gate funcional. Se a execução ocorrer no próprio `codex-flow-runner`, write-back nesta seção é permitido. Em projeto externo, a fonte observável desta fase é trace/log/resumo, e não a spec do projeto alvo.
- Política anti-duplicação: a retrospectiva sistêmica pós-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto histórico, mas não deve reavaliar nem reticketar a mesma frente causal.

## Validações pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - nenhuma bloqueando o fechamento runner-side desta spec; manifesto v2, schemas canônicos, `lineage`, namespace autoritativo, summary final e integração com Telegram ficaram cobertos por código, tickets fechados e validações automatizadas.
- Validações manuais pendentes:
  - validar a legibilidade de `diagnosis.md` em caso real de target aderente; permanece como verificação operacional externa/manual e não bloqueia o fechamento deste pacote runner-side.
  - escolher o primeiro target de adoção da v2 em repositório externo; permanece como passo operacional posterior e não configura gap residual local desta auditoria.

## Status de atendimento (documento vivo)
- Estado geral: attended
- Itens atendidos:
  - motivação diagnosis-first consolidada em contrato explícito;
  - responsabilidades entre runner e target descritas de forma normativa;
  - nome próprio do fluxo, manifesto dedicado e namespace autoritativo da v2 existem no runner;
  - o contrato runner-side da v2 aceita o shape público mínimo da spec e normaliza internamente apenas o necessário para compatibilidade transitória runner-side;
  - a orquestração runner-side materializa `resolve-case -> assemble-evidence -> diagnosis` como estágios reais e preserva o milestone/failure real nas falhas do caminho mínimo;
  - `diagnosis.md`/`diagnosis.json`, summary final do runner, publication tardia runner-side e Telegram operam com superfícies diagnosis-first no branch v2;
  - o contexto técnico mínimo do branch v2 deixou de expor superfícies pré-v2 como parte do contrato efetivo dos prompts por estágio.
- Pendências em aberto:
  - nenhuma pendência local runner-side permanece aberta nesta linhagem da spec.
- Evidências de validação:
  - revisão arquitetural crítica de 2026-04-09 comparando a spec com `src/types/target-investigate-case.ts`, `src/core/target-investigate-case.ts`, `src/integrations/target-investigate-case-round-preparer.ts`, `src/integrations/codex-client.ts`, `src/integrations/telegram-bot.ts`, `docs/workflows/target-case-investigation-v2-manifest.json` e testes focados;
  - fixture literal da spec em `docs/workflows/target-case-investigation-v2-manifest.json` e cobertura dedicada em `src/core/target-investigate-case.test.ts`;
  - `npm test -- src/core/target-investigate-case.test.ts src/integrations/target-investigate-case-round-preparer.test.ts src/integrations/codex-client.test.ts src/integrations/telegram-bot.test.ts` com 634 testes passando em 2026-04-09 19:48Z;
  - `npm run check` com `exit 0`.

## Auditoria final de entrega
- Auditoria executada em:
  - 2026-04-09 19:52Z
- Resultado:
  - a implementação local runner-side desta reabertura foi concluída e revalidada.
  - o runner agora aceita o manifesto público mínimo da v2, preserva milestone real de falha no caminho mínimo e remove superfícies pré-v2 do contexto técnico mínimo do branch v2.
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum.
- Causas-raiz sistêmicas identificadas:
  - a validação final anterior aceitou a implementação com base no comportamento já implementado e nos testes atuais, sem provar aderência integral ao contrato diagnosis-first da spec.
- Ajustes genéricos promovidos ao workflow:
  - nenhum; não houve promoção de backlog transversal nesta etapa.

## Riscos e impacto
- Risco funcional:
  - targets aderentes podem implementar somente parte do contrato e produzir bundles fracos ou diagnósticos inconsistentes.
- Risco operacional:
  - se `assemble-evidence` ficar vago, a complexidade do desenho anterior pode reaparecer disfarçada de coleta improvisada.
- Mitigação:
  - padronizar slots de prompt, artefatos, manifesto e responsabilidades;
  - fazer a primeira onda de implementação no runner antes da adoção em targets;
  - exigir blockers explícitos em `resolve-case` e `assemble-evidence` quando o target não conseguir fechar o caso com segurança.

## Decisões e trade-offs
- 2026-04-08 - manter `deep-dive`, `improvement-proposal`, `ticket-projection` e `publication` como continuações opcionais - reduz custo cognitivo do caminho mínimo e preserva evolução tardia quando necessária.
- 2026-04-08 - tratar `resolve-case` e `assemble-evidence` como estágios formais da v2 - evita que a coleta de contexto fique implícita, improvisada ou escondida dentro do diagnóstico.
- 2026-04-08 - definir prompts canônicos por estágio no target - mantém o runner target-agnostic sem perder direcionamento semântico do projeto alvo.
- 2026-04-08 - eleger o namespace do projeto alvo como fonte autoritativa da rodada - reduz duplicação semântica e mantém o conhecimento operacional perto das evidências reais.

## Histórico de atualização
- 2026-04-08 20:25Z - Versão inicial da spec.
- 2026-04-08 21:12Z - Reescrita estrutural da spec para explicitar contrato runner-target, estágios formais anteriores ao diagnóstico, prompts canônicos e artefatos obrigatórios da v2.
- 2026-04-08 21:44Z - Triagem runner-side concluída com comparação contra o código atual, derivação de três tickets em `tickets/open/`, atualização de `Related tickets`, `Last reviewed at (UTC)` e pendências objetivas no `Status de atendimento`, mantendo `Status: approved`.
- 2026-04-08 22:07Z - Validação final da triagem com normalização documental, deduplicação do histórico do gate e manutenção de `Status: approved` / `Spec treatment: pending` por existirem tickets abertos.
- 2026-04-09 01:05Z - Auditoria final pós-`/run_all` concluída: releitura da linhagem completa, confirmação de ausência de gaps residuais locais, atualização de `Related tickets`/`Related execplans`, e fechamento documental da spec como `Status: attended` / `Spec treatment: done`.
- 2026-04-09 17:55Z - Revisão arquitetural crítica reabriu a spec: `Status` voltou para `in_progress`, `Spec treatment` voltou para `pending`, e um novo ticket/ExecPlan local foi criado para o hard cut contratual do v2 no runner.
- 2026-04-09 18:56Z - Fechamento local da linhagem reaberta: os três follow-ups do v2 foram encerrados, `Status` voltou para `attended` e `Spec treatment` voltou para `done`.
- 2026-04-09 19:52Z - Execução local do novo ExecPlan de compatibilidade concluída: o runner passou a aceitar o shape público mínimo da v2, preservar milestone real no caminho mínimo e esconder superfícies pré-v2 do contexto mínimo; `Status` permaneceu `attended`, mas `Spec treatment` voltou para `pending` até o commit que fechará o ticket local remanescente.
- 2026-04-09 19:57Z - Fechamento formal da trilha reaberta: o ticket local remanescente foi movido para `tickets/closed/`, `Spec treatment` voltou para `done` e a spec permanece `attended` com evidência runner-side observável.
- 2026-04-09 21:21Z - Limpeza semântica final concluída: a spec passou a se declarar explicitamente v2-only, as referências pré-v2 foram rebaixadas para histórico fora de `docs/specs/` e a narrativa normativa deixou de tratar o desenho anterior como contrato alternativo ou rollout ativo.
