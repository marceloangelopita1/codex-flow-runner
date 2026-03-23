# ExecPlan - barra mínima documental para ticket sistêmico automático

## Purpose / Big Picture
- Objetivo: explicitar, na documentação canônica do repositório, a barra mínima editorial exigida para tickets automáticos oriundos de retrospectiva sistêmica, sem alterar o contrato funcional já implementado no runner/publisher.
- Resultado esperado:
  - `INTERNAL_TICKETS.md` passa a declarar de forma explícita a barra mínima documental do ticket sistêmico automático;
  - `tickets/templates/internal-ticket-template.md` passa a orientar a autoria desse tipo de ticket sem tornar `Proposed solution` obrigatório no template geral;
  - a documentação de workflow relevante fica alinhada com esse contrato sem substituir a fonte canônica;
  - outra IA consegue executar a partir do ticket publicado sem depender de memória oral ou releitura dos traces completos.
- Escopo:
  - atualizar a documentação canônica e o template de ticket para explicitar título orientado ao problema, contexto filtrado, ausência de redundância evitável, proposta de remediação concreta, closure criteria observáveis, comportamento esperado executável por outra IA e herança relevante de assumptions/RNFs/restrições/validações;
  - alinhar `docs/workflows/codex-quality-gates.md` apenas no que for necessário para apontar ou reforçar o contrato documental final;
  - validar por evidência textual direta que os documentos cobrem RF-18, RF-21 e CA-10 sem ampliar o escopo.
- Fora de escopo:
  - alterar prompts, tipos, parser, runner, publisher ou testes de runtime;
  - reabrir tickets irmãos já fechados desta spec;
  - exigir migração retroativa em massa de tickets históricos;
  - fechar ticket, fazer commit, push ou executar mudanças fora desta etapa documental.

## Progress
- [x] 2026-03-23 03:53Z - Planejamento inicial concluído com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `DOCUMENTATION.md`, de `docs/workflows/codex-quality-gates.md`, de `INTERNAL_TICKETS.md`, de `tickets/templates/internal-ticket-template.md` e de ExecPlans irmãos já entregues.
- [x] 2026-03-23 03:58Z - Contrato documental canônico atualizado em `INTERNAL_TICKETS.md`, incluindo a barra mínima adicional do ticket sistêmico automático e a herança seletiva de validações manuais/pedentes.
- [x] 2026-03-23 03:58Z - Template e documentação de workflow relevante alinhados em `tickets/templates/internal-ticket-template.md` e `docs/workflows/codex-quality-gates.md`, preservando a optionalidade estrutural de `Proposed solution`.
- [x] 2026-03-23 03:58Z - Validação final concluída com `rg` textual dos requisitos, confirmação da optionalidade de `Proposed solution`, auditoria de `git diff` e write-back da spec de origem.

## Surprises & Discoveries
- 2026-03-23 03:53Z - `INTERNAL_TICKETS.md` já cobre bem a barra mínima genérica de tickets internos e a herança seletiva de contexto da spec, mas ainda não isola o caso específico do ticket automático de retrospectiva sistêmica.
- 2026-03-23 03:53Z - `tickets/templates/internal-ticket-template.md` já possui as seções certas, porém o template sozinho não orienta explicitamente o padrão editorial esperado para título, contexto filtrado, remediação concreta e closure criteria por superfície.
- 2026-03-23 03:53Z - `docs/workflows/codex-quality-gates.md` é útil como checklist de processo, mas o próprio ticket deixa claro que ele não deve virar a fonte primária da barra mínima editorial do ticket publicado.
- 2026-03-23 03:53Z - A spec de origem já está pendente apenas por esta lacuna documental; o menor corte seguro é documental e localizado, sem tocar o contrato funcional já coberto pelos tickets irmãos.
- 2026-03-23 03:58Z - O template canônico ainda não espelhava explicitamente a herança seletiva de RNFs, restrições técnicas/documentais e validações pendentes/manuais que o ticket real já usa; alinhar essa superfície era necessário para o contrato ficar autocontido.
- 2026-03-23 03:58Z - A spec viva ainda descrevia CA-10 e a pendência documental como abertos; foi necessário write-back na própria spec para evitar que o artefato ficasse defasado em relação ao changeset desta etapa.

## Decision Log
- 2026-03-23 - Decisão: concentrar o contrato canônico principal em `INTERNAL_TICKETS.md` e refletir a operacionalização no `tickets/templates/internal-ticket-template.md`, usando `docs/workflows/codex-quality-gates.md` apenas como alinhamento complementar.
  - Motivo: o ticket explicita que o quality gate compartilhado não fecha sozinho a superfície final do ticket automático publicado.
  - Impacto: a validação do fechamento precisa provar que a barra mínima ficou explícita nos documentos canônicos, não apenas em checklist de processo.
- 2026-03-23 - Decisão: preservar `Proposed solution` como seção opcional do template geral, mas documentar quando o ticket sistêmico automático deve trazer proposta de remediação concreta.
  - Motivo: RF-21 e as restrições herdadas do ticket proíbem transformar o template geral em contrato mais rígido do que o necessário.
  - Impacto: a documentação deve separar “optionalidade estrutural do template” de “expectativa editorial do ticket automático quando houver direção concreta”.
- 2026-03-23 - Decisão: derivar toda a validação deste plano diretamente dos dois closure criteria do ticket.
  - Motivo: a instrução operacional exige que o aceite nasça do fechamento do ticket, e não de checklist genérico de documentação.
  - Impacto: `Validation and Acceptance` abaixo usa apenas RF-18, RF-21, CA-10 e as restrições herdadas como base de evidência.
- 2026-03-23 - Decisão: incluir write-back na spec de origem e ampliar a auditoria de diff para cobrir esse arquivo.
  - Motivo: a execução documental mudou o estado de atendimento de CA-10 e deixou a spec inconsistente se ela continuasse apontando a lacuna como aberta.
  - Impacto: a validação final precisa considerar `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md` como artefato vivo impactado por este ticket.

## Outcomes & Retrospective
- Status final: execução documental concluída; este plano foi usado como evidência na etapa de fechamento formal do ticket no mesmo changeset, e a auditoria final da spec permanece para etapa separada.
- O que existirá ao final:
  - um contrato documental explícito para tickets automáticos de retrospectiva sistêmica;
  - um template que continue genérico, mas que oriente corretamente esse caso especial;
  - uma validação textual objetiva mostrando que o contrato ficou observável nas superfícies corretas;
  - a spec de origem atualizada para refletir que CA-10 já foi implementado.
- O que fica pendente após este plano:
  - executar a auditoria final da spec quando a linhagem for encerrada.
- Próximos passos:
  - usar este ExecPlan como evidência de execução no changeset de fechamento do ticket;
  - manter o corte restrito à documentação se surgir qualquer ajuste residual dessa frente.

## Context and Orientation
- Ticket executor:
  - `tickets/closed/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
- RFs/CAs cobertos por este plano:
  - RF-18
  - RF-21
  - CA-10
- RNFs e restrições técnicas/documentais herdados da spec/ticket:
  - a documentação precisa deixar a qualidade mínima do ticket automático clara o bastante para outra IA executar o fluxo sem inferências ocultas;
  - preservar a optionalidade de `Proposed solution` no template geral;
  - não incluir segredos ou dados sensíveis;
  - manter compatibilidade com `docs/workflows/codex-quality-gates.md`;
  - não reescrever retroativamente tickets históricos já fechados;
  - não alterar a semântica de `publicationEligibility`, da taxonomia `workflow-gap-analysis`, da sequencialidade do fluxo nem da regra de no máximo 1 ticket sistêmico por retrospectiva.
- Assumptions / defaults adotados:
  - a fonte canônica desta barra mínima deve viver em documentação já reconhecida do processo de tickets, e não em um documento novo;
  - a “documentação de workflow relevante” mencionada no ticket é `docs/workflows/codex-quality-gates.md`, salvo descoberta objetiva de outra superfície canônica durante a execução;
  - a herança relevante de assumptions/RNFs/restrições/validações deve ser descrita como orientação editorial para tickets automáticos, sem obrigar cópia literal de todo o contexto da spec;
  - como o ticket informa `Inherited pending/manual validations: nenhuma`, o aceite deste pacote é exclusivamente documental e por leitura/diff observável.
- Termos do projeto relevantes:
  - `ticket sistêmico automático`: ticket transversal criado a partir de retrospectiva sistêmica do workflow.
  - `barra mínima documental`: conjunto explícito de qualidades editoriais mínimas exigidas para que o ticket seja executável por outra IA.
  - `contexto filtrado`: somente o contexto necessário para remediação, sem despejar contexto irrelevante da spec de origem.
  - `closure criteria por superfície`: critérios de fechamento associados às superfícies/documentos que precisam mudar.
- Arquivos principais:
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `docs/workflows/codex-quality-gates.md`
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
  - `tickets/closed/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`

## Plan of Work
- Milestone 1: consolidar o contrato documental canônico do ticket sistêmico automático.
  - Entregável: `INTERNAL_TICKETS.md` com seção ou orientação explícita para a barra mínima editorial desse tipo de ticket, incluindo o que deve estar presente e o que não deve ser redundante.
  - Evidência de conclusão: leitura textual do documento mostra, sem inferência externa, os itens exigidos pelo closure criterion principal.
  - Arquivos esperados: `INTERNAL_TICKETS.md`.
- Milestone 2: alinhar o template geral sem quebrar sua reutilização.
  - Entregável: `tickets/templates/internal-ticket-template.md` com instruções suficientes para refletir a barra mínima do ticket automático, preservando `Proposed solution` como opcional no template geral.
  - Evidência de conclusão: leitura do template deixa claro como representar título, contexto, herança seletiva e fechamento observável no caso automático, sem transformar o template em formulário rígido demais para outros tickets.
  - Arquivos esperados: `tickets/templates/internal-ticket-template.md`.
- Milestone 3: ajustar a documentação de workflow relevante e validar o fechamento.
  - Entregável: `docs/workflows/codex-quality-gates.md` alinhado ao contrato canônico final, write-back da spec de origem quando necessário e uma auditoria de diff provando que o pacote ficou restrito às superfícies documentais.
  - Evidência de conclusão: a matriz de validação fica verde por leitura direta e o diff não invade superfícies funcionais do runner.
  - Arquivos esperados: `docs/workflows/codex-quality-gates.md`, `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`.

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler `tickets/closed/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`, `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`, `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md` e `docs/workflows/codex-quality-gates.md` para confirmar wording, restrições herdadas e a menor superfície documental necessária.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `INTERNAL_TICKETS.md` para explicitar a barra mínima do ticket sistêmico automático, cobrindo título orientado ao problema, contexto filtrado, ausência de redundância evitável, proposta de remediação concreta, closure criteria observáveis, comportamento esperado executável por outra IA e herança relevante de contexto.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Alterar `tickets/templates/internal-ticket-template.md` para orientar esse caso especial de ticket automático, preservando a optionalidade estrutural de `Proposed solution` e sem introduzir obrigatoriedade retroativa para tickets genéricos.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Ajustar `docs/workflows/codex-quality-gates.md` apenas se necessário para refletir a nova fonte canônica e evitar contradição ou duplicação obsoleta.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Atualizar a spec de origem se o changeset desta etapa alterar o estado observado de atendimento ou deixar a documentação viva inconsistente.
6. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reler os trechos alterados e remover duplicação ou texto obsoleto, conforme `DOCUMENTATION.md`, garantindo que o contrato final permaneça autocontido e sem prosa redundante.
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "ticket sist[eê]mico autom[aá]tico|t[ií]tulo orientado ao problema|contexto filtrado|redund[aâ]ncia|remedia[cç][aã]o concreta|Closure criteria|comportamento esperado|assumptions|RNFs|restri[cç][oõ]es|valida[cç][oõ]es" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md` para confirmar a presença explícita dos pontos exigidos.
8. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Proposed solution|opcional|Nao obrigatorio|Preencher somente se houver dire[cç][aã]o clara" tickets/templates/internal-ticket-template.md INTERNAL_TICKETS.md` para comprovar que o template geral continua preservando a optionalidade de `Proposed solution`.
9. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `git diff -- INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md execplans/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md` para auditar que o pacote permaneceu documental e restrito ao escopo deste ticket.

## Validation and Acceptance
- Matriz requisito -> validação observável:
  - Requisito: RF-18, CA-10
  - Evidência observável: `INTERNAL_TICKETS.md`, `tickets/templates/internal-ticket-template.md` e a documentação de workflow relevante passam a explicitar a barra mínima de qualidade do ticket automático de retrospectiva sistêmica, incluindo título orientado ao problema, contexto filtrado, ausência de redundância evitável, proposta de remediação concreta, closure criteria observáveis, comportamento esperado executável por outra IA e orientação sobre herança relevante de assumptions/RNFs/restrições/validações.
  - Comando: `rg -n "ticket sist[eê]mico autom[aá]tico|t[ií]tulo orientado ao problema|contexto filtrado|redund[aâ]ncia|remedia[cç][aã]o concreta|closure criteria|comportamento esperado|assumptions|RNFs|restri[cç][oõ]es|valida[cç][oõ]es" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md`
  - Esperado: os três documentos exibem, de forma textual e inequívoca, os elementos editoriais exigidos pelo ticket, sem depender de interpretação implícita.
- Matriz requisito -> validação observável:
  - Requisito: RF-21
  - Evidência observável: a documentação atualizada preserva a optionalidade de `Proposed solution` no template geral, não exige migração retroativa em massa e não altera a semântica do fluxo sequencial nem das retrospectivas.
  - Comando: `rg -n "Proposed solution|opcional|Nao obrigatorio|Preencher somente se houver dire[cç][aã]o clara|nao exigem migra[cç][aã]o retroativa|fluxo sequencial|retrospectiva" INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md DOCUMENTATION.md`
  - Esperado: permanece explícito que `Proposed solution` é opcional no template geral, que alinhamentos canônicos não exigem retrofit em massa e que não houve reinterpretação do fluxo sequencial ou da retrospectiva sistêmica.
- Matriz requisito -> validação observável:
  - Requisito: escopo restrito do ticket
  - Evidência observável: o diff final do pacote toca apenas as superfícies documentais previstas neste ticket, a spec viva impactada e o próprio ExecPlan.
  - Comando: `git diff -- INTERNAL_TICKETS.md tickets/templates/internal-ticket-template.md docs/workflows/codex-quality-gates.md docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md execplans/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`
  - Esperado: não aparecem mudanças em prompts, código TypeScript, testes ou arquivos de tickets fora do necessário para esta etapa.

## Idempotence and Recovery
- Idempotência:
  - reexecutar a edição não deve criar seções duplicadas nem espalhar a mesma regra por múltiplos lugares sem necessidade;
  - a documentação final deve continuar apontando para a fonte canônica certa em vez de duplicar texto integral entre arquivos;
  - como o pacote é apenas documental, reexecutar a validação textual deve produzir o mesmo resultado sem efeitos colaterais.
- Riscos:
  - duplicar o contrato entre `INTERNAL_TICKETS.md` e `docs/workflows/codex-quality-gates.md`, contrariando `DOCUMENTATION.md`;
  - endurecer demais o template geral e transformar `Proposed solution` em requisito estrutural indevido;
  - escrever regras vagas que continuem exigindo inferência humana/da IA no momento de abrir ou executar o ticket automático;
  - expandir o escopo para o contrato funcional já resolvido pelos tickets irmãos.
- Recovery / Rollback:
  - se surgir duplicação excessiva, manter o contrato detalhado apenas em `INTERNAL_TICKETS.md` e reduzir os outros documentos a orientação ou ponteiro compatível;
  - se o template ficar rígido demais para tickets genéricos, restaurar sua neutralidade estrutural e mover a orientação específica para notas textuais ou exemplos do caso automático;
  - se aparecer necessidade real de mudança funcional, parar a execução e abrir blocker/follow-up explícito em vez de alterar código fora deste ticket.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/closed/2026-03-23-barra-minima-documental-para-ticket-sistemico-automatico-gap.md`
- Spec de origem:
  - `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`
- Referências obrigatórias lidas para este plano:
  - `PLANS.md`
  - `DOCUMENTATION.md`
  - `docs/workflows/codex-quality-gates.md`
  - `INTERNAL_TICKETS.md`
  - `tickets/templates/internal-ticket-template.md`
  - `execplans/2026-03-23-workflow-ticket-draft-estruturado-e-validacao-contratual-gap.md`
  - `execplans/2026-03-23-workflow-ticket-renderizacao-editorial-e-filtro-de-contexto-gap.md`
- Checklist aplicado de `docs/workflows/codex-quality-gates.md`:
  - ticket inteiro e referências obrigatórias lidos antes de planejar;
  - spec de origem, RFs/CAs, RNFs/restrições e assumptions/defaults herdados explicitados;
  - assumptions/defaults adotados registrados para eliminar ambiguidade remanescente;
  - critérios de fechamento traduzidos para matriz `requisito -> validação observável`;
  - riscos residuais, não-escopo e limites do ticket declarados.
- Nota de escopo:
  - a validação deste plano nasce exclusivamente dos closure criteria do ticket e das restrições herdadas; `PLANS.md`, `DOCUMENTATION.md` e o checklist de quality gates foram usados apenas para completar a forma e a disciplina do plano.

## Interfaces and Dependencies
- Interfaces alteradas:
  - contrato documental de tickets internos em `INTERNAL_TICKETS.md`;
  - template de ticket em `tickets/templates/internal-ticket-template.md`;
  - alinhamento complementar do workflow em `docs/workflows/codex-quality-gates.md`;
  - write-back do estado de atendimento da spec em `docs/specs/2026-03-23-qualidade-editorial-e-contratual-do-ticket-transversal-de-melhoria-de-workflow.md`.
- Compatibilidade:
  - manter compatibilidade com a spec de origem e com o contrato já implementado pelos tickets irmãos;
  - manter o template geral reutilizável para tickets internos em geral;
  - manter a política de não migração retroativa em massa para material histórico;
  - manter o fluxo sequencial e o sentido atual das retrospectivas sistêmicas.
- Dependências externas e mocks:
  - nenhuma dependência externa nova;
  - nenhuma validação com Node/npm é necessária para este pacote, porque o aceite é puramente documental e textual.
