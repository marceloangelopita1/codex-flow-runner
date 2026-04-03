# [SPEC] /target_investigate_case para investigação causal de caso produtivo suspeito em projeto alvo

## Metadata
- Spec ID: 2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo
- Status: approved
- Spec treatment: pending
- Owner: mapita
- Created at (UTC): 2026-04-03 16:00Z
- Last reviewed at (UTC): 2026-04-03 16:34Z
- Source: technical-evolution
- Related tickets:
  - tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md
- Related execplans:
  - nenhum ainda
- Related commits:
  - chore(specs): triage 2026-04-03-target-investigate-case-investigacao-causal-de-caso-produtivo-em-projeto-alvo.md (este changeset)
- Fluxo derivado canônico: `spec -> tickets`; triagem inicial = apenas tickets em `tickets/open/`; `ticket -> execplan` quando necessário.

## Objetivo e contexto
- Problema que esta spec resolve: o `codex-flow-runner` já possui fluxos target voltados a preparo do projeto, checkup de readiness e derivação de gaps, mas ainda não possui um fluxo separado e contratualizado para investigar causalmente um caso produtivo suspeito dentro de um projeto alvo. Hoje faltam contrato genérico de entrada, capability explícita no projeto alvo, regras de coleta determinística de evidências, barra mínima de suficiência de evidência, regra anti-overfit e fronteira clara entre recomendação semântica do projeto alvo e decisão final de publication do runner.
- Resultado esperado: o runner passa a oferecer `/target_investigate_case` como fluxo target separado, com milestones estáveis, artefatos locais mínimos, status/cancelamento no mesmo modelo dos demais target flows, capability explícita `case-investigation` no projeto alvo e decisão final conservadora de publication. O projeto alvo continua sendo a autoridade semântica para o caso; o runner continua sendo a autoridade mecânica para gates, policy, publication e rastreabilidade cross-project.
- Contexto funcional: a descoberta desta spec foi ancorada no piloto `../guiadomus-matricula`, onde `propertyId` pode ancorar o caso, mas `requestId`, workflow, janela temporal ou artefato de run podem ser necessários para fechar causalidade; o projeto já possui superfícies relevantes como logs com `requestId`, Mongo, bucket/cache, `workflow_debug`, contratos documentais, goldens e tickets, mas ainda não tem uma capability investigativa operacional consolidada. A spec deve ser genérica para múltiplos projetos alvo e não pode acoplar o runner a `idImovel`, `propertyId` ou a superfícies específicas do piloto.
- Restrições técnicas relevantes:
  - o novo fluxo deve ser separado de `/target_checkup`, reaproveitando apenas o modelo operacional de slots, milestones, traces e cancelamento cooperativo;
  - o runner não pode depender de descoberta livre por IA de logs, tabelas, buckets, comandos ou fontes de evidência;
  - a coleta e o replay devem ser guiados por capability manifest machine-readable do projeto alvo;
  - o projeto alvo emite apenas vereditos semânticos e recomendação estruturada de ticket/publication; o runner emite `publication_status` final e `overall_outcome` final em `publication-decision.json`;
  - sem ticket, a fase `publication` continua existindo como decisão final/no-op, mas não há write-back versionado por default;
  - o artefato versionado padrão de v1 continua sendo apenas o ticket, quando houver;
  - o trace do runner deve minimizar material sensível e não deve copiar `workflow_debug`, `db_payload`, transcript ou payloads brutos do projeto alvo.

## Jornada de uso
1. O operador executa `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`, ou usa uma UX guiada no Telegram que o runner normaliza para esse mesmo contrato canônico.
2. O runner valida projeto alvo, slot pesado por projeto, capability `case-investigation` e manifesto canônico do projeto alvo antes de iniciar o fluxo.
3. O projeto alvo resolve o caso e, quando necessário, resolve ou explicita a ausência de uma tentativa específica, sem que o runner escolha silenciosamente uma tentativa “provável”.
4. O projeto alvo coleta evidências históricas apenas pelas superfícies e estratégias declaradas no capability manifest e, se permitido e necessário, executa replay seguro e observável para complementar causalidade.
5. O projeto alvo produz `case-resolution.json`, `evidence-bundle.json`, `assessment.json` e `dossier.md` ou `dossier.json`, emitindo os vereditos semânticos do caso, a superfície causal e uma recomendação estruturada de ticket/publication.
6. O runner aplica gates mecânicos, thresholds, policy, regra anti-overfit, limites de capability e regras de publication, produz `publication-decision.json` com `publication_status` e `overall_outcome` finais e decide entre no-op local ou publicação de ticket no projeto alvo.
7. O operador acompanha milestones curtos via Telegram e `/status`, recebe um resumo final compacto com decisão, próxima ação e caminho do dossier local, e consulta ticket versionado apenas quando houver elegibilidade final de publication.

## Requisitos funcionais
- RF-01: o runner deve introduzir um novo fluxo target dedicado, `target-investigate-case`, sem ampliar semanticamente o escopo de `/target_checkup`.
- RF-02: o comando canônico do fluxo deve ser `/target_investigate_case`, com comandos complementares `/target_investigate_case_status` e `/target_investigate_case_cancel`, seguindo o padrão operacional dos target flows existentes.
- RF-03: o projeto alvo só é elegível para esse fluxo quando declarar explicitamente a capability adicional `case-investigation`, distinta do contrato atual de compatibilidade com o workflow completo.
- RF-04: a descoberta da capability investigativa deve ocorrer por caminho canônico fixo e previsível, sem heurística; para v1, o runner deve assumir `docs/workflows/target-case-investigation-manifest.json` como caminho padrão obrigatório.
- RF-05: o capability manifest deve ser machine-readable e deve declarar, no mínimo:
  - versão da capability e compatibilidade do contrato;
  - seletores de entrada aceitos;
  - workflows declarados como investigáveis;
  - resolução de caso e tentativa;
  - superfícies permitidas de evidência;
  - consultas, comandos, templates ou estratégias parametrizadas de coleta;
  - schema esperado das saídas por fase;
  - policy de replay;
  - policy de retenção e sensibilidade do dossier local;
  - docs, prompts e scripts operacionais auxiliares;
  - ordem de precedência customizável apenas nas camadas 4-6;
  - política de ticket/publication local do projeto.
- RF-06: o contrato de entrada do fluxo deve ser híbrido: `case-ref` ancora a entidade de negócio ou caso de domínio, e o projeto alvo pode exigir, resolver ou aceitar também `attempt-ref` ou seletores adicionais quando necessários para fechar causalidade com segurança.
- RF-07: o runner não pode escolher silenciosamente uma tentativa específica quando o caso exigir desambiguação; a ausência de resolução segura deve ficar explícita em `case-resolution.json`.
- RF-08: o comando deve aceitar entrada estruturada na forma `/target_investigate_case <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...]`, com normalização equivalente quando a UX do Telegram for guiada.
- RF-09: o projeto alvo pode declarar como investigável qualquer workflow explicitamente suportado pela capability investigativa, inclusive workflows internos ou não públicos, sem limitar o fluxo aos workflows públicos do produto.
- RF-10: o runner deve expor apenas 5 milestones visíveis e estáveis para esse fluxo:
  - `preflight`
  - `case-resolution`
  - `evidence-collection`
  - `assessment`
  - `publication`
- RF-11: subetapas como `assess-real-gap`, `assess-avoidability` e `assess-ticket-eligibility` devem existir como subartefatos ou subetapas internas do `assessment`, não como milestones externas obrigatórias no Telegram.
- RF-12: toda rodada bem formada deve produzir, no mínimo, os seguintes artefatos locais estáveis:
  - `case-resolution.json`
  - `evidence-bundle.json`
  - `assessment.json`
  - `publication-decision.json`
  - `dossier.md` ou `dossier.json`
- RF-13: `case-resolution.json` deve registrar, no mínimo:
  - `case-ref` recebido;
  - seletores opcionais normalizados;
  - caso resolvido;
  - tentativa resolvida ou ausência explícita de tentativa;
  - workflows relevantes;
  - decisão inicial sobre necessidade ou não de replay;
  - razões de resolução ou de inconclusão na etapa.
- RF-14: `evidence-bundle.json` deve registrar, no mínimo:
  - plano de coleta aplicado;
  - fontes históricas consultadas;
  - refs, paths, hashes e contagens dos artefatos sensíveis, sem copiar payload bruto para o trace do runner;
  - replay usado ou não usado;
  - policy de cache/purge aplicada;
  - avaliação de suficiência factual da coleta.
- RF-15: `assessment.json` deve ser emitido pelo projeto alvo como autoridade semântica primária do caso e deve conter, no mínimo:

```json
{
  "houve_gap_real": "yes|no|inconclusive",
  "era_evitavel_internamente": "yes|no|inconclusive|not_applicable",
  "merece_ticket_generalizavel": "yes|no|inconclusive|not_applicable",
  "confidence": "low|medium|high",
  "evidence_sufficiency": "insufficient|partial|sufficient|strong",
  "causal_surface": {},
  "generalization_basis": [],
  "overfit_vetoes": [],
  "ticket_decision_reason": "string",
  "publication_recommendation": {
    "recommended_action": "publish_ticket|do_not_publish|inconclusive",
    "reason": "string",
    "proposed_ticket_scope": "string",
    "suggested_title": "string"
  }
}
```

- RF-16: `assessment.json` não deve carregar `publication_status` final nem `overall_outcome` final; esses campos pertencem ao runner após aplicação de gates mecânicos, policy e publication.
- RF-17: `publication-decision.json` deve ser emitido pelo runner e deve conter, no mínimo:

```json
{
  "publication_status": "eligible|not_eligible|blocked_by_policy|not_applicable",
  "overall_outcome": "no-real-gap|real-gap-not-internally-avoidable|real-gap-not-generalizable|inconclusive-case|inconclusive-project-capability-gap|runner-limitation|ticket-published|ticket-eligible-but-blocked-by-policy",
  "outcome_reason": "string",
  "gates_applied": [],
  "blocked_gates": [],
  "versioned_artifact_paths": [],
  "ticket_path": "string|null",
  "next_action": "string"
}
```

- RF-18: o runner deve validar obrigatoriamente a presença e coerência dos três vereditos semânticos, das combinações válidas entre eles, da `causal_surface`, do `confidence`, do `evidence_sufficiency`, da `publication_recommendation`, do `generalization_basis[]` quando aplicável e da ausência de `overfit_vetoes[]` bloqueantes.
- RF-19: o runner não deve fazer um segundo julgamento semântico de domínio; sua atuação deve se limitar a consistência contratual, elegibilidade mecânica de publication, policy, capability, anti-overfit e rastreabilidade cross-project.
- RF-20: a precedência entre “bug real” e “comportamento esperado” deve seguir uma hierarquia explícita e parcialmente fixa:
  - camadas globais fixas e não reordenáveis:
    - contrato/documentação canônica do workflow ou comportamento público aplicável;
    - schemas, taxonomias estruturadas e contratos formais;
    - guardrails e validações determinísticas normativas do runtime;
  - camadas customizáveis pelo projeto alvo, apenas nas posições 4-6:
    - decisões explícitas ainda vigentes e não superseded;
    - goldens e testes alinhados ao contrato atual;
    - evidência histórica do caso e replay investigativo.
- RF-21: quando superfícies de precedência alta entrarem em conflito entre si, o fluxo não deve “escolher bonito”; deve registrar conflito contratual explícito e tender a `inconclusive-case` ou a um ticket local de governança/capability apenas quando isso for generalizável e local ao projeto alvo.
- RF-22: a coleta de evidências deve ser determinística, guiada pelo capability manifest e restrita às superfícies/consultas/comandos/templates declarados pelo projeto alvo.
- RF-23: a IA não deve inventar caminhos de coleta, comandos, fontes ou evidências fora do capability manifest e dos artefatos operacionais explicitamente apontados por ele.
- RF-24: replay investigativo deve ser opcional por projeto e só pode ocorrer quando a capability o declarar como seguro e determinístico; a ordem desejada do fluxo é: evidência histórica primeiro, replay seguro depois, inconclusão quando necessário.
- RF-25: quando o projeto alvo suportar replay, o perfil mínimo obrigatório de segurança deve incluir:
  - `updateDb=false`;
  - `requestId` dedicado da investigação;
  - modo de replay explicitamente declarado nos artefatos e no resumo final;
  - `includeWorkflowDebug=true` apenas quando o projeto o suportar com segurança;
  - política declarada de cache/purge;
  - proibição de mutações não essenciais fora do contrato;
  - proibição de versionamento automático de artefatos brutos do replay;
  - proibição de alterações em Mongo, tickets, docs ou git durante a etapa de replay;
  - namespace local de artefatos separado da operação normal;
  - execução apenas por superfícies declaradas no capability manifest.
- RF-26: purge, quando permitido, deve ser estritamente scoped, auditável e restrito ao que o projeto declarar; o fluxo não pode apagar transcript, documento persistido, ticket ou outro artefato canônico fora do escopo explícito.
- RF-27: a regra de suficiência de evidência deve ser modelada como contrato estruturado com os níveis `insufficient | partial | sufficient | strong`.
- RF-28: o fluxo não deve sair de `inconclusive` por força narrativa; os thresholds mínimos esperados são:
  - para concluir `houve_gap_real=no`, deve existir base suficiente para sustentar comportamento esperado;
  - para concluir `houve_gap_real=yes`, deve existir conflito claro com contrato/guardrail/schema/taxonomia, replay seguro reproduzindo o problema ou sinal determinístico forte do runtime;
  - para concluir `era_evitavel_internamente=yes`, deve existir `causal_surface` local plausível e executável no projeto alvo;
  - para concluir `merece_ticket_generalizavel=yes`, deve existir base explícita de generalização além do gap real e da evitabilidade local.
- RF-29: por default, ticket automático só pode avançar com `evidence_sufficiency=strong`, ou com `evidence_sufficiency=sufficient` quando houver conflito contratual ou guardrail inequívoco, `generalization_basis[]` explícita e zero veto bloqueante.
- RF-30: a regra anti-overfit deve ser explícita, auditável e baseada em estrutura; `generalization_basis[]`, `overfit_vetoes[]` e `ticket_decision_reason` são obrigatórios sempre que houver recomendação semântica positiva de ticket.
- RF-31: bases que podem autorizar ticket a partir de um único caso incluem, no mínimo:
  - violação clara de contrato canônico, schema, warning taxonomy, guardrail ou validação normativa;
  - replay seguro reproduzindo o comportamento sob condições controladas;
  - superfície causal local clara no projeto alvo, com mudança plausivelmente reaproveitável;
  - gap de capability ou observabilidade reproduzível e útil para investigações futuras;
  - conflito claro com decisão ou artefato aprovado ainda vigente, quando essa decisão fizer parte real do contrato atual.
- RF-32: sinais que devem vetar ticket mesmo quando o caso parecer ruim incluem, no mínimo:
  - diagnóstico dependente demais de transcript isolado, wording específico ou OCR ruidoso sem base adicional;
  - ausência de `causal_surface` mínima e local executável;
  - solução proposta apenas editorial, vaga ou do tipo “ajustar prompt para este caso”;
  - anomalia única de dado, cache, operação manual ou entrada excepcional sem base de generalização;
  - divergência que representa apenas preferência qualitativa, e não desvio observável;
  - necessidade de reinterpretar contrato em vez de corrigir divergência contra ele.
- RF-33: quando o caso terminar inconclusivo por limitação local, clara e generalizável do próprio projeto alvo, o fluxo pode recomendar ticket local voltado à menor superfície causal plausível de capability, observabilidade, coleta ou rastreabilidade.
- RF-34: quando a inconclusão decorrer apenas de evidência insuficiente naquele caso isolado, o fluxo deve encerrar sem ticket automático no projeto alvo, preservando apenas trace local, artefatos locais e resumo operacional.
- RF-35: quando a causa principal estiver no próprio runner, o fluxo deve registrar `runner-limitation` como desfecho final e não deve abrir ticket automático no projeto alvo.
- RF-36: a fase `publication` deve existir sempre como fronteira de decisão final do fluxo, mesmo quando o resultado seja no-op local sem ticket.
- RF-37: sem ticket, a fase `publication` não deve gerar write-back versionado por default no projeto alvo.
- RF-38: com ticket elegível, o artefato versionado padrão de v1 deve ser apenas o ticket do projeto alvo; evidência bruta, bundle completo, transcript, `workflow_debug`, `db_payload` e investigação descartável não devem ser versionados por default.
- RF-39: o resumo final do Telegram deve incluir, no mínimo:
  - `case-ref`;
  - tentativa resolvida ou ausência explícita de tentativa;
  - replay usado ou não usado;
  - os três vereditos semânticos;
  - `confidence`;
  - `evidence_sufficiency`;
  - `causal_surface`;
  - decisão final;
  - razão curta;
  - caminho do dossier local ou referência local equivalente;
  - caminho do ticket, se publicado;
  - próxima ação recomendada.
- RF-40: o runner deve preservar rastreabilidade sem poluir o repositório alvo; por default, o `dossier` é local e não versionado, enquanto o trace do runner registra apenas metadados, policies, paths, hashes, contagens, vereditos e decisões.
- RF-41: o trace do runner não deve copiar material sensível do projeto alvo; o payload sensível deve permanecer confinado ao dossier local do projeto alvo, sob retenção e acesso controlados pela capability.
- RF-42: a integração com status, cancelamento, concorrência por projeto e traces locais já existentes deve seguir o mesmo modelo dos target flows atuais, incluindo cancelamento cooperativo até antes de qualquer commit/push e cancelamento tardio após cruzar a fronteira de versionamento.
- RF-43: no piloto `../guiadomus-matricula`, o fluxo deve reutilizar o template interno atual de ticket, sem criar template novo em v1, mas deve exigir um bloco obrigatório e automatizável `## Investigação Causal` quando `Source: production-observation` ou equivalente.
- RF-44: o bloco `## Investigação Causal` do ticket do piloto deve manter heading e ordem estáveis, com pelo menos:
  - `Resolved case`
  - `Resolved attempt`
  - `Investigation inputs`
  - `Replay used`
  - `Verdicts`
  - `Confidence and evidence sufficiency`
  - `Causal surface`
  - `Generalization basis`
  - `Overfit vetoes considered`
  - `Publication decision`
- RF-45: a superfície operacional do projeto alvo para essa capability deve ficar separada da superfície de runtime do produto; no piloto, manifesto, docs, prompts operacionais e scripts auxiliares não devem morar em `extractors/workflows/**` nem em prompts de runtime.

## Assumptions and defaults
- O comando canônico do novo fluxo será `/target_investigate_case`, sem reuso semântico do contrato atual de `/target_checkup`.
- O caminho canônico inicial do capability manifest será `docs/workflows/target-case-investigation-manifest.json`; eventuais mudanças futuras deverão preservar descoberta determinística pelo runner.
- O runner tratará a capability investigativa como camada adicional de onboarding, e não como extensão implícita do contrato atual de compatibilidade com o workflow completo.
- O runner consumirá `assessment.json` como fonte autoritativa dos vereditos semânticos, mas continuará sendo a autoridade final de `publication_status` e `overall_outcome` via `publication-decision.json`.
- Por default, sem ticket não haverá write-back versionado; a fase `publication` continua existindo como decisão final/no-op local.
- Por default, o artefato versionado de v1 será apenas o ticket quando houver publicação elegível; qualquer write-back extra sem ticket fica fora do desenho padrão.
- A barra default de publication automática deve ser conservadora: `strong`, ou `sufficient` apenas com conflito contratual/guardrail inequívoco, `generalization_basis[]` explícita e zero veto bloqueante.
- No piloto `../guiadomus-matricula`, é esperado que parte relevante dos casos só feche causalidade com replay seguro, porque `workflow_debug` histórico é opt-in e não está garantido para todo caso passado.
- O trace do runner deve continuar mínimo por princípio; o dossier local do projeto alvo é a superfície correta para detalhes operacionais e dados sensíveis.

## Nao-escopo
- Implementar a correção do gap detectado no projeto alvo.
- Transformar `/target_investigate_case` em mera ampliação semântica de `/target_checkup`.
- Permitir que a IA descubra livremente logs, tabelas, buckets, consultas ou comandos fora do capability manifest.
- Tornar replay obrigatório para todos os projetos alvo.
- Versionar por default bundle bruto de investigação, transcript, `workflow_debug`, `db_payload`, payloads sensíveis ou análise descartável.
- Criar um template novo de ticket para o piloto no v1.
- Misturar prompts ou instruções operacionais da capability investigativa com prompts de runtime do produto.
- Acoplar o contrato global do runner a `idImovel`, `propertyId` ou outra semântica de domínio do piloto.
- Resolver nesta spec a implementação da capability no `../guiadomus-matricula`; a spec define o contrato e a jornada, não a entrega técnica.

## Criterios de aceitacao (observaveis)
- [ ] CA-01 - `/target_investigate_case <project> <case-ref>` inicia um novo slot target dedicado, sem reusar semanticamente `/target_checkup`, e expõe `/target_investigate_case_status` e `/target_investigate_case_cancel`.
- [ ] CA-02 - A ausência ou invalidade de `docs/workflows/target-case-investigation-manifest.json` bloqueia o fluxo em `preflight` com erro observável e sem heurística.
- [ ] CA-03 - O runner normaliza a entrada estruturada do operador e registra apenas seletores, refs, paths, hashes, contagens, vereditos e decisões no trace local.
- [ ] CA-04 - Quando a resolução do caso exigir tentativa específica e ela não puder ser fechada com segurança, o fluxo não escolhe uma tentativa provável e registra a ausência de resolução segura em `case-resolution.json`.
- [ ] CA-05 - Toda rodada bem formada gera `case-resolution.json`, `evidence-bundle.json`, `assessment.json`, `publication-decision.json` e `dossier.md` ou `dossier.json`.
- [ ] CA-06 - `assessment.json` é emitido pelo projeto alvo com os três vereditos semânticos em enum, `confidence`, `evidence_sufficiency`, `causal_surface`, `generalization_basis[]`, `overfit_vetoes[]` e uma `publication_recommendation` estruturada.
- [ ] CA-07 - `publication-decision.json` é emitido pelo runner com `publication_status`, `overall_outcome`, `outcome_reason`, gates aplicados, bloqueios, próxima ação e caminhos versionados quando houver.
- [ ] CA-08 - Sem ticket, a fase `publication` é executada e concluída como decisão final/no-op local, sem write-back versionado por default no projeto alvo.
- [ ] CA-09 - Com ticket elegível, o fluxo cria ticket no projeto alvo e o resumo final registra caminho do ticket e metadado de versionamento correspondente.
- [ ] CA-10 - O runner bloqueia publication quando faltarem vereditos, `causal_surface`, `generalization_basis[]` obrigatória, evidência mínima ou quando houver `overfit_vetoes[]` bloqueantes.
- [ ] CA-11 - O trace do runner não copia transcript, `workflow_debug`, `db_payload`, logs brutos ou payloads de banco; apenas aponta refs, paths ou hashes do dossier local do projeto alvo.
- [ ] CA-12 - Quando replay for usado no piloto, os artefatos e o resumo final registram `updateDb=false`, `requestId` dedicado, replay explícito, policy de cache/purge e namespace local separado.
- [ ] CA-13 - Conflito entre superfícies de precedência alta gera conflito contratual explícito e tende a `inconclusive-case` ou a ticket local de governança/capability, sem escolha interpretativa silenciosa.
- [ ] CA-14 - Se a causa principal estiver no runner, o desfecho final é `runner-limitation` e não há ticket automático no projeto alvo.
- [ ] CA-15 - O resumo final no Telegram inclui `case-ref`, tentativa resolvida ou ausência explícita, replay usado ou não, três vereditos, `confidence`, `evidence_sufficiency`, `causal_surface`, decisão final, razão curta, caminho do dossier local, caminho do ticket se houver e próxima ação.
- [ ] CA-16 - A concorrência por projeto, o cancelamento cooperativo até antes de commit/push e a resolução de ambiguidade de `/_status` e `/_cancel` seguem o mesmo modelo dos target flows atuais.
- [ ] CA-17 - No piloto `../guiadomus-matricula`, tickets `Source: production-observation` usam o template interno atual com seção `## Investigação Causal` em ordem estável e preenchida automaticamente pelo fluxo.

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
- Nota de uso: esta spec nasceu de `/discover_spec` e ainda não foi executada por `/run_specs`; por isso, esta seção permanece `n/a` até existir uma rodada formal desse fluxo.
- Política histórica: alinhamentos desta seção não exigem migração retroativa em massa; material histórico só deve ser ajustado quando for tocado depois ou quando houver impacto funcional real.

### Ultima execucao registrada
- Executada em (UTC): 2026-04-03T16:29:55.535Z
- Veredito: GO
- Confianca final: high
- Motivo final: go-with-high-confidence
- Resumo: Houve progresso real nesta revalidacao: o total de gaps caiu de 2 para 0. Os dois `closure-criteria-gap` remanescentes do passe anterior foram resolvidos nos mesmos tickets do runner, sem surgir gap reancorado adicional, e o pacote derivado agora torna observaveis tanto os requisitos principais quanto as validacoes manuais herdadas relevantes para aceite.
- Ciclos executados: 3
- Thread da validacao: 019d5424-b449-7883-bfab-ec9d7a7d1f9f
- Contexto de triagem herdado: nao
- Linhagem do pacote: hybrid
- Tickets avaliados:
  - tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md [fonte=source-spec]
  - tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md [fonte=source-spec]
  - tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md [fonte=source-spec]

#### Historico por ciclo
- Ciclo 0 [initial-validation]: NO_GO (high)
  - Resumo: O pacote derivado tem fronteiras de escopo coerentes e cobre a maior parte da spec, mas ainda nao fecha GO porque permanecem 3 gaps objetivos de aceite: o ticket de contrato/publication nao torna observaveis a normalizacao de entrada, o caminho positivo de publication e o conjunto minimo do resumo final; o ticket de control-plane nao torna observaveis concorrencia por projeto nem as semanticas de cancelamento na fronteira de versionamento; e o ticket do piloto nao herdou de forma aplicavel a validacao pendente sobre retencao/caminho local do dossier.
  - Thread: 019d5424-b449-7883-bfab-ec9d7a7d1f9f
  - Fingerprints abertos: closure-criteria-gap|tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md|ca-03&ca-09&ca-15&rf-08&rf-39, closure-criteria-gap|tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md|ca-16&rf-42, spec-inheritance-gap|tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md|rf-05
  - Reducao real de gaps vs. ciclo anterior: n/a
  - Correcoes deste ciclo: 0
- Ciclo 1 [revalidation]: NO_GO (high)
  - Resumo: Houve progresso real nesta revalidacao: o total de gaps caiu de 3 para 2. O `spec-inheritance-gap` do ticket do piloto foi resolvido, e os dois `closure-criteria-gap` anteriores nos tickets do runner nao permanecem com o mesmo escopo amplo; eles ficaram reancorados em validacoes manuais herdadas mais especificas. Ainda assim, o pacote segue `NO_GO` porque duas validacoes manuais relevantes para aceite continuam sem criterio de fechamento observavel.
  - Thread: 019d5424-b449-7883-bfab-ec9d7a7d1f9f
  - Fingerprints abertos: closure-criteria-gap|tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md|ca-11&rf-40&rf-41, closure-criteria-gap|tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md|ca-15&rf-39
  - Reducao real de gaps vs. ciclo anterior: sim
  - Correcoes deste ciclo: 3
    - Ampliei os Closure criteria do ticket de contrato/publication para tornar observaveis a normalizacao do comando canonico e da UX guiada, o caminho positivo de publication com ticket elegivel e o conjunto minimo completo do resumo final exigido pela spec. [applied]
    - Ampliei os Closure criteria do ticket de control-plane para tornar observaveis a exclusao de slot pesado por projeto, a resolucao de ambiguidade em status/cancel e as semanticas de cancelamento cooperativo antes da fronteira de versionamento e tardio depois dela. [applied]
    - Herdei no ticket do piloto a validacao pendente sobre politica de retencao e caminho local do dossier por capability e tornei essa validacao observavel nos Closure criteria do manifesto/aceite do piloto. [applied]
- Ciclo 2 [revalidation]: GO (high)
  - Resumo: Houve progresso real nesta revalidacao: o total de gaps caiu de 2 para 0. Os dois `closure-criteria-gap` remanescentes do passe anterior foram resolvidos nos mesmos tickets do runner, sem surgir gap reancorado adicional, e o pacote derivado agora torna observaveis tanto os requisitos principais quanto as validacoes manuais herdadas relevantes para aceite.
  - Thread: 019d5424-b449-7883-bfab-ec9d7a7d1f9f
  - Fingerprints abertos: nenhum
  - Reducao real de gaps vs. ciclo anterior: sim
  - Correcoes deste ciclo: 2
    - Adicionados aos Closure criteria do ticket de contrato/publication os requisitos de evidencia observavel para a validacao manual herdada de que o trace minimizado do runner permite auditoria operacional sem exigir abertura imediata do dossier local, com registro explicito da execucao avaliada, resultado e ajustes necessarios. [applied]
    - Adicionados aos Closure criteria do ticket de control-plane os requisitos de evidencia observavel para a validacao manual herdada em ambiente real do resumo final do Telegram, exigindo registro explicito da execucao avaliada, conteudo redigido observado, resultado da validacao e ajustes aplicados antes do fechamento. [applied]

#### Gaps encontrados
- Nenhum.

#### Correcoes aplicadas
- Ampliei os Closure criteria do ticket de contrato/publication para tornar observaveis a normalizacao do comando canonico e da UX guiada, o caminho positivo de publication com ticket elegivel e o conjunto minimo completo do resumo final exigido pela spec.
  - Artefatos afetados: tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied
- Ampliei os Closure criteria do ticket de control-plane para tornar observaveis a exclusao de slot pesado por projeto, a resolucao de ambiguidade em status/cancel e as semanticas de cancelamento cooperativo antes da fronteira de versionamento e tardio depois dela.
  - Artefatos afetados: tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied
- Herdei no ticket do piloto a validacao pendente sobre politica de retencao e caminho local do dossier por capability e tornei essa validacao observavel nos Closure criteria do manifesto/aceite do piloto.
  - Artefatos afetados: tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md
  - Gaps relacionados: spec-inheritance-gap
  - Resultado: applied
- Adicionados aos Closure criteria do ticket de contrato/publication os requisitos de evidencia observavel para a validacao manual herdada de que o trace minimizado do runner permite auditoria operacional sem exigir abertura imediata do dossier local, com registro explicito da execucao avaliada, resultado e ajustes necessarios.
  - Artefatos afetados: tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied
- Adicionados aos Closure criteria do ticket de control-plane os requisitos de evidencia observavel para a validacao manual herdada em ambiente real do resumo final do Telegram, exigindo registro explicito da execucao avaliada, conteudo redigido observado, resultado da validacao e ajustes aplicados antes do fechamento.
  - Artefatos afetados: tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md
  - Gaps relacionados: closure-criteria-gap
  - Resultado: applied

## Retrospectiva sistemica da derivacao dos tickets
- Executada: sim
- Motivo de ativacao ou skip: executada porque o gate funcional revisou gaps em pelo menos um ciclo.
- Classificacao final: not-systemic
- Confianca: high
- Frente causal analisada: As instruções, prompts e validações atuais já cobriam a herança de validações pendentes/manuais, a reconciliação de ownership e os closure criteria observáveis; a primeira derivação saiu incompleta localmente e o próprio spec-ticket-validation a trouxe para GO.
- Achados sistemicos:
  - nenhum
- Artefatos do workflow consultados:
  - AGENTS.md
  - DOCUMENTATION.md
  - INTERNAL_TICKETS.md
  - PLANS.md
  - SPECS.md
  - docs/workflows/codex-quality-gates.md
  - prompts/01-avaliar-spec-e-gerar-tickets.md
  - prompts/09-validar-tickets-derivados-da-spec.md
  - prompts/10-autocorrigir-tickets-derivados-da-spec.md
  - prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md
  - src/core/runner.ts
  - src/core/runner.test.ts
  - src/core/spec-ticket-validation.ts
  - src/core/spec-ticket-validation.test.ts
  - src/types/spec-ticket-validation.ts
  - tickets/closed/2026-03-21-triagem-de-spec-heranca-de-validacoes-pendentes-e-criterios-observaveis-gap.md
- Elegibilidade de publicacao: nao
- Resultado do ticket transversal ou limitacao operacional:
  - Nenhum ticket transversal publicado nesta rodada.
- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.
- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.

## Validacoes pendentes ou manuais
- Validações obrigatórias ainda não automatizadas:
  - definir o schema final versionado do `docs/workflows/target-case-investigation-manifest.json`;
  - definir a tabela canônica de combinações válidas entre vereditos semânticos, `publication_status` e `overall_outcome`;
  - validar a política de retenção e o caminho local do `dossier` por capability no projeto alvo;
  - validar a política de replay seguro e de purge scoped no piloto `../guiadomus-matricula`;
  - validar a evolução do template interno do piloto para suportar `## Investigação Causal` com ordem fixa.
- Validações manuais pendentes:
  - confirmar no piloto quais superfícies históricas realmente permitem fechar causalidade sem replay em casos passados;
  - confirmar no piloto quais workflows internos além dos workflows públicos devem ser declarados como investigáveis;
  - validar em ambiente real se o resumo final do Telegram mantém sinal suficiente sem expor material sensível;
  - validar se o trace minimizado do runner é suficiente para auditoria operacional sem exigir abertura imediata do dossier local do projeto alvo.

## Status de atendimento (documento vivo)
- Estado geral: approved
- Itens atendidos:
  - o escopo funcional do novo fluxo foi delimitado como target flow separado, distinto de `/target_checkup`;
  - a separação de autoridade entre projeto alvo e runner foi fechada: vereditos semânticos e recomendação estruturada no projeto alvo, `publication_status` e `overall_outcome` finais no runner;
  - a regra de no-op sem ticket foi fechada: `publication` sempre existe como fase final, mas sem write-back versionado por default;
  - a barra de anti-overfit, suficiência de evidência, precedência contratual e sensibilidade do trace foi explicitada;
  - a ancoragem do piloto `../guiadomus-matricula` foi realizada com análise de identificador concreto do caso, logs, banco, storage, prompts, documentação, tickets e observabilidade.
  - a triagem inicial desta spec foi concluida, com derivacao em tres tickets separados por fronteira observavel entre control-plane do runner, contrato/gates/publication e capability do piloto.
- Pendências em aberto:
  - implementar a superficie operacional de `/target_investigate_case` no runner, incluindo slot dedicado, milestones, status/cancel, traces e ciclo local de artefatos (`tickets/open/2026-04-03-target-investigate-case-runner-control-plane-gap.md`);
  - introduzir manifesto canonico, validacoes de artefatos, tabela de combinacoes validas, regra anti-overfit, publication/no-op e trace minimizado no runner (`tickets/open/2026-04-03-target-investigate-case-contract-and-publication-gap.md`);
  - preparar a capability investigativa do piloto `../guiadomus-matricula`, incluindo manifesto local, policy de replay/purge e o bloco `## Investigacao Causal` no template interno (`tickets/open/2026-04-03-target-investigate-case-pilot-capability-gap.md`).
- Evidências de validação:
  - entrevista estruturada de `/discover_spec` conduzida em 2026-04-03, cobrindo unidade do caso, replay, capability, contrato do manifesto, precedência, anti-overfit, artefatos, desfechos finais, ticketing e rastreabilidade;
  - leitura dos documentos canônicos do runner sobre `/discover_spec`, compatibilidade de projeto alvo, target flows, traces, status e Telegram;
  - leitura do piloto `../guiadomus-matricula` sobre runbook local, `workflow_debug`, contratos de workflow, modelo de dados, governança de prompts e template de ticket;
  - fechamento explícito das decisões de produto/contrato necessárias para derivação posterior em tickets.
  - validacao final da triagem concluida em 2026-04-03 16:34Z, com releitura da spec, dos 3 tickets derivados, de `SPECS.md`, `DOCUMENTATION.md` e do diff atual; o documento permaneceu em `Status: approved` com `Spec treatment: pending` por ainda depender desses tickets abertos.

## Auditoria final de entrega
- Auditoria executada em: n/a
- Resultado: n/a - spec aprovada para derivação, ainda sem implementação entregue
- Tickets/follow-ups abertos a partir da auditoria:
  - nenhum ainda
- Causas-raiz sistêmicas identificadas:
  - n/a
- Ajustes genéricos promovidos ao workflow:
  - n/a

## Riscos e impacto
- Risco funcional: sem manifesto suficientemente determinístico, o fluxo pode voltar a depender de descoberta livre por IA e produzir diagnósticos pouco auditáveis.
- Risco operacional: no piloto `../guiadomus-matricula`, a investigação histórica sem replay seguro tende a produzir taxa alta de inconclusão se a capability não fechar bem suas superfícies.
- Risco de backlog: sem `generalization_basis[]`, `overfit_vetoes[]` e gates conservadores, o fluxo pode gerar tickets elegantes, mas pobres em generalização e caros de executar.
- Mitigação:
  - manter a autoridade semântica do caso no projeto alvo e a autoridade mecânica de publication no runner;
  - fixar precedência alta global, capability manifest canônico e artefatos mínimos por fase;
  - manter traces do runner minimizados e dossiê local sob retenção própria do projeto alvo;
  - exigir superfície causal local clara e evidência suficiente antes de qualquer publication automática.

## Decisoes e trade-offs
- 2026-04-03 - Criar `/target_investigate_case` como novo fluxo target separado em vez de ampliar `/target_checkup` - preserva coesão semântica e reduz acoplamento entre readiness do projeto e investigação causal de caso produtivo.
- 2026-04-03 - Deixar a semântica do caso no projeto alvo e a decisão final de publication no runner - evita dupla interpretação de domínio e mantém um gate cross-project forte contra nonsense elegante.
- 2026-04-03 - Fixar globalmente as camadas 1-3 da precedência contratual e permitir customização apenas nas camadas 4-6 - preserva comparabilidade entre projetos e reduz risco de autojustificação do manifesto.
- 2026-04-03 - Manter poucas milestones externas e um conjunto mínimo fixo de artefatos locais - melhora auditabilidade sem inflar Telegram, `/status` ou o contrato do runner.
- 2026-04-03 - Preferir dossier local rico e trace do runner mínimo - preserva rastreabilidade sem poluir o repositório ou vazar material sensível no trace compartilhado do runner.
- 2026-04-03 - Sem ticket, `publication` permanece como fase de decisão final/no-op e não gera write-back versionado por default - reduz ruído e mantém o artefato versionado de v1 restrito ao ticket quando houver ganho generalizável claro.

## Historico de atualizacao
- 2026-04-03 16:00Z - Versão inicial da spec.
- 2026-04-03 16:11Z - Triagem inicial concluída: spec revisada contra o estado atual do runner/piloto e pacote derivado em três tickets abertos.
- 2026-04-03 16:34Z - Validação final da triagem concluída com releitura da spec, dos 3 tickets derivados, de `SPECS.md`, `DOCUMENTATION.md` e do diff atual; o documento permaneceu em `Status: approved` com `Spec treatment: pending` por ainda depender dos tickets abertos.
