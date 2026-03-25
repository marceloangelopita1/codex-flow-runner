# ExecPlan - Relatório humano do `/target_prepare` com redação consistente

## Purpose / Big Picture
- Objetivo: revisar o texto humano gerado por `renderReport()` para `docs/workflows/target-prepare-report.md`, substituindo headings e bullets em inglês ou sem acentuação por português correto, sem alterar o contrato máquina-legível do manifesto nem a semântica operacional do fluxo `target_prepare`.
- Resultado esperado:
  - `docs/workflows/target-prepare-report.md` passa a ser gerado em português correto e com acentuação adequada, mantendo o mesmo papel operacional do resumo, do snapshot Git, da lista de superfícies e da próxima ação recomendada;
  - `src/core/target-prepare.test.ts` passa a validar o novo contrato textual observável do relatório, preservando os asserts que blindam `TARGET_PREPARE_CONTRACT_VERSION`, `TARGET_PREPARE_SCHEMA_VERSION` e os paths canônicos do manifesto;
  - um smoke manual de `/target_prepare` em repositório descartável confirma a nova redação do report no alvo e revalida que os blocos gerenciados de `AGENTS.md` e `README.md` continuam legíveis e sem conflito material com o conteúdo preexistente relevante.
- Escopo:
  - `src/core/target-prepare.ts`, com foco em `renderReport()`;
  - `src/core/target-prepare.test.ts`;
  - atualização da spec de origem com evidências e status compatíveis com `SPECS.md` após a validação;
  - smoke manual do fluxo real em repositório descartável irmão.
- Fora de escopo:
  - alterar `src/types/target-prepare.ts`, chaves JSON, `contractVersion`, `prepareSchemaVersion`, paths canônicos ou inventário de superfícies;
  - editar `docs/workflows/target-prepare-managed-agents-section.md` ou `docs/workflows/target-prepare-managed-readme-section.md`;
  - revisar mensagens de runtime fora do relatório humano do `target_prepare`;
  - fechar ticket, mover arquivo para `tickets/closed/` ou fazer commit/push deste repositório nesta etapa.

## Progress
- [x] 2026-03-25 17:33Z - Planejamento inicial concluído com leitura integral do ticket, da spec de origem, de `PLANS.md`, de `docs/workflows/codex-quality-gates.md`, de `DOCUMENTATION.md`, de `SPECS.md`, de `INTERNAL_TICKETS.md`, de `src/core/target-prepare.ts`, de `src/core/target-prepare.test.ts`, de `src/types/target-prepare.ts`, das fontes gerenciadas de `AGENTS.md`/`README.md` e do ExecPlan irmão do pacote `copy-exact`.
- [x] 2026-03-25 17:36Z - `renderReport()` revisado em `src/core/target-prepare.ts` para o contrato final em português, preservando ordem de seções, interpolação dos dados e contrato do manifesto.
- [x] 2026-03-25 17:37Z - `src/core/target-prepare.test.ts` atualizado para o novo wording do relatório; busca de saneamento confirmou remoção total do contrato textual antigo nas superfícies em escopo.
- [x] 2026-03-25 17:38Z - Matriz automatizada do plano executada: `rg` das labels novas em código/teste, `rg` das constantes do manifesto em `src/types/target-prepare.ts` e `npx tsx --test src/core/target-prepare.test.ts` com 4/4 testes verdes.
- [x] 2026-03-25 17:47Z - Smoke executor-driven do fluxo real concluído em `/home/mapita/projetos/target-prepare-report-smoke`, com upstream bare local, `ControlledTargetPrepareExecutor.execute()` + Codex CLI/Git reais, commit/push `45ad9cdb1bf8fe6de60ad3781f97774d63b8b9b3@origin/main`, relatório em português no alvo, markers preservados em `AGENTS.md`/`README.md` e working tree convergente.
- [x] 2026-03-25 17:48Z - Spec de origem atualizada com `CA-04`/`CA-06` atendidos, novas evidências observáveis e pendência operacional limitada ao fechamento formal do ticket.

## Surprises & Discoveries
- 2026-03-25 17:33Z - Os literais em inglês e sem acentuação do relatório humano estão concentrados em `src/core/target-prepare.ts`; na suíte, os asserts explícitos dessa superfície estão em `src/core/target-prepare.test.ts`.
- 2026-03-25 17:33Z - A busca textual no repositório não encontrou outro código de produção consumindo literalmente `Target Prepare Report`, `Eligible for /projects: yes` ou `Compatible with workflow complete: yes`; o risco de dependência escondida desse wording atual é baixo.
- 2026-03-25 17:33Z - `src/core/target-prepare.test.ts` já exerce um fluxo fim a fim com repositório temporário, manifesto gerado, relatório gerado e preservação de conteúdo preexistente em `AGENTS.md`/`README.md`; a cobertura nova pode se apoiar na mesma malha sem inventar harness paralelo.
- 2026-03-25 17:33Z - O ticket herda validações manuais de `AGENTS.md` e `README.md` por causa de `RF-10`/`CA-06`, embora o código desta entrega não deva editar as fontes desses blocos; o smoke final precisa revalidar essas superfícies para cumprir o aceite completo.
- 2026-03-25 17:33Z - O fluxo real de `target_prepare` sempre faz `git push`; portanto, o repositório descartável do smoke precisa de upstream configurado, preferencialmente para um remoto bare local, senão a validação falha antes do aceite final do ticket.
- 2026-03-25 17:44Z - O shell desta etapa tinha `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ALLOWED_CHAT_ID` configurados, mas não expunha um emissor humano Telegram para disparar o comando; a menor adaptação segura foi acionar diretamente o executor canônico do `/target_prepare`, preservando Codex CLI, Git real, pós-check, geração de manifesto/relatório e versionamento do alvo.
- 2026-03-25 17:47Z - O smoke confirmou na prática a separação de responsabilidades do fluxo: o Codex ajusta apenas as superfícies permitidas e o runner gera `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md` no pós-check; esse detalhe apareceu explicitamente no `## Resumo do Codex` do relatório final.

## Decision Log
- 2026-03-25 - Decisão: preservar a estrutura observável do relatório, alterando apenas labels, headings e notas humanas.
  - Motivo: o ticket pede correção editorial com risco controlado, enquanto `RF-05`/`CA-05` exigem estabilidade de contrato e o fluxo já funciona operacionalmente.
  - Impacto: a implementação deve manter a mesma ordem de seções, os mesmos dados interpolados e a mesma recomendação operacional, mudando só a superfície textual humana.
- 2026-03-25 - Decisão: congelar um conjunto explícito de labels em português para eliminar ambiguidade no plano.
  - Motivo: o ticket exige assumptions/defaults explícitos; deixar a tradução “em aberto” enfraqueceria os testes e o smoke.
  - Impacto: `renderReport()` e a suíte devem convergir para estes rótulos: `# Relatório do target_prepare`, `## Resumo`, `## Snapshot do Git`, `## Caminhos alterados`, `## Superfícies gerenciadas`, `## Resumo do Codex` e `## Notas`, com bullets `Elegível para /projects: sim`, `Compatível com workflow completo: sim` e `Próxima ação recomendada: ...`.
- 2026-03-25 - Decisão: manter `src/types/target-prepare.ts` como boundary firme de não edição, salvo blocker objetivo.
  - Motivo: `RF-05`/`CA-05` falam de estabilidade contratual do manifesto, não de refatoração do domínio.
  - Impacto: qualquer necessidade de tocar versões, chaves ou paths deve ser tratada como desvio de escopo e parada explícita.
- 2026-03-25 - Decisão: usar a suíte focada de `target_prepare` como prova automatizada principal e reservar o smoke manual para a confirmação observável do fluxo real.
  - Motivo: isso traduz diretamente os closure criteria do ticket; `build/lint/check` genéricos não substituem esse aceite.
  - Impacto: a seção `Validation and Acceptance` ficará ancorada em `src/core/target-prepare.test.ts`, no relatório gerado no alvo e na revisão manual de `AGENTS.md`/`README.md`.
- 2026-03-25 - Decisão: atualizar a spec de origem no mesmo ciclo apenas na medida permitida por `SPECS.md`, sem forçar `Spec treatment: done` se o ticket ainda não tiver sido formalmente fechado.
  - Motivo: a spec é documento vivo, mas `Spec treatment` continua dependente do backlog aberto.
  - Impacto: após a implementação, a spec deve receber novas evidências e status coerente; se o ticket continuar aberto por decisão operacional, manter `Spec treatment: pending`.
- 2026-03-25 - Decisão: aceitar o smoke executor-driven como evidência principal de `CA-06` nesta etapa, em vez de depender do transporte Telegram.
  - Motivo: o shell não consegue emitir a mensagem humana no chat autorizado, mas `ControlledTargetPrepareExecutor.execute()` é a fronteira canônica que materializa o comportamento de `/target_prepare` e permitiu validar o fluxo completo com Codex CLI e Git reais.
  - Impacto: a evidência final do smoke fica ancorada no repositório descartável `/home/mapita/projetos/target-prepare-report-smoke`, no commit/push `45ad9cdb1bf8fe6de60ad3781f97774d63b8b9b3@origin/main`, no relatório gerado pelo runner e na revisão manual dos blocos gerenciados preservados.

## Outcomes & Retrospective
- Status final: execução concluída com validações automatizadas e smoke observável verdes.
- O que já está claro:
  - o escopo técnico permaneceu estreito e bem delimitado pelo ticket;
  - o contrato máquina-legível continuou centralizado em `src/types/target-prepare.ts` e permaneceu intacto no smoke, no manifesto gerado e na suíte;
  - o relatório humano do alvo agora sai com headings, bullets e notas em português correto, sem drift semântico na próxima ação recomendada.
- O que fica pendente:
  - fechar formalmente o ticket em etapa posterior e, quando não houver mais pendência derivada aberta, promover `Spec treatment` para `done`.
- Próximos passos:
  - manter este ExecPlan como evidência de execução até o fechamento do ticket;
  - não ampliar o pacote para revisão editorial mais ampla do runtime;
  - usar o mesmo smoke repo/remote apenas se for necessário reproduzir a convergência do fluxo antes do fechamento.

## Context and Orientation
- Arquivos e referências principais lidos no planejamento:
  - `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md`
  - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
  - `src/core/target-prepare.ts`
  - `src/core/target-prepare.test.ts`
  - `src/types/target-prepare.ts`
  - `docs/workflows/target-prepare-managed-agents-section.md`
  - `docs/workflows/target-prepare-managed-readme-section.md`
  - `execplans/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
- Spec de origem: `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
- RFs/CAs cobertos por este plano:
  - RF-04
  - RF-05
  - RF-06
  - RF-07
  - RF-10
  - CA-04
  - CA-05
  - CA-06
  - validações manuais herdadas de RF-03/CA-03 apenas como parte do smoke final exigido pelo ticket.
- RNFs e restrições técnicas/documentais herdados que precisam permanecer observáveis neste ticket:
  - usar português correto com acentuação adequada e coerência terminológica com `DOCUMENTATION.md`;
  - preservar o contrato atual do `target_prepare`;
  - manter `docs/workflows/target-prepare-report.md` como caminho canônico do artefato humano;
  - não renomear chaves, paths, `contractVersion` nem `prepareSchemaVersion` do manifesto;
  - validar a mudança com testes e smoke do fluxo;
  - manter a mudança pequena e segura, sem transformá-la em revisão editorial geral do runtime.
- Assumptions / defaults adotados:
  - o relatório continuará com a mesma ordem de seções e com os mesmos dados interpolados; a mudança fica restrita à camada textual humana;
  - o contrato final em português seguirá estes labels explícitos:
    - `# Relatório do target_prepare`
    - `## Resumo`
    - `- Gerado em (UTC):`
    - `- Referência do runner:`
    - `- Projeto alvo:`
    - `- Caminho do projeto alvo:`
    - `- Elegível para /projects: sim`
    - `- Compatível com workflow completo: sim`
    - `- Próxima ação recomendada: Selecionar o projeto por /select_project <nome> ou pelo menu /projects.`
    - `## Snapshot do Git`
    - `## Caminhos alterados`
    - `## Superfícies gerenciadas`
    - `## Resumo do Codex`
    - `## Notas`
  - as notas finais também convergem para wording explícito: `Manifesto técnico e relatório humano foram gerados pelo runner após pós-check determinístico.` e `Commit/push só são permitidos depois de este relatório existir e de os validadores estarem verdes.`
  - `src/types/target-prepare.ts` deve permanecer sem alterações;
  - a spec de origem só deve ser promovida para `Status: attended` quando o ticket estiver funcionalmente completo e a trilha documental permitir isso sem contradizer `Spec treatment`.
- Fluxo atual relevante:
  - `ControlledTargetPrepareExecutor.execute()` chama `writeGeneratedArtifacts()` depois do pós-check e antes do versionamento;
  - `writeGeneratedArtifacts()` grava manifesto e relatório em `docs/workflows/`;
  - `renderReport()` é hoje a origem canônica do texto de `docs/workflows/target-prepare-report.md`;
  - `src/core/target-prepare.test.ts` já valida manifesto, relatório gerado e preservação do contexto preexistente em `AGENTS.md`/`README.md`.
- Superfícies esperadas para mudança durante a execução:
  - `src/core/target-prepare.ts`
  - `src/core/target-prepare.test.ts`
  - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`

## Plan of Work
- Milestone 1: congelar o novo contrato observável do relatório humano.
  - Entregável: `renderReport()` passa a emitir headings, bullets e notas em português correto, mantendo a mesma estrutura e os mesmos dados do relatório atual.
  - Evidência de conclusão: o diff em `src/core/target-prepare.ts` mostra apenas revisão textual do report; `src/types/target-prepare.ts` permanece intacto.
  - Arquivos esperados:
    - `src/core/target-prepare.ts`
- Milestone 2: reancorar a suíte no novo wording sem perder a blindagem contratual do manifesto.
  - Entregável: `src/core/target-prepare.test.ts` valida o contrato textual em português e mantém os asserts sobre `contractVersion`, `prepareSchemaVersion`, paths canônicos e superfícies gerenciadas.
  - Evidência de conclusão: a suíte focada de `target_prepare` fica verde com o novo relatório.
  - Arquivos esperados:
    - `src/core/target-prepare.test.ts`
- Milestone 3: provar o comportamento do fluxo real em repositório descartável e sincronizar a spec viva.
  - Entregável: um repo de smoke com upstream local recebe o relatório revisado via `/target_prepare`, e a spec de origem registra as novas evidências/pendências sem contradizer `SPECS.md`.
  - Evidência de conclusão: o relatório do alvo contém os labels em português escolhidos, os blocos gerenciados continuam legíveis e a spec passa a documentar o novo estado real do item.
  - Arquivos esperados:
    - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
    - artefatos de smoke apenas no repositório descartável irmão

## Concrete Steps
1. (workdir: `/home/mapita/projetos/codex-flow-runner`) Reabrir os literais atuais do relatório com `rg -n "Target Prepare Report|## Summary|Eligible for /projects|Compatible with workflow complete|Manifesto tecnico|pos-check deterministico" src/core/target-prepare.ts src/core/target-prepare.test.ts` para fixar os pontos exatos de alteração.
2. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/target-prepare.ts` para reescrever apenas o bloco retornado por `renderReport()`, preservando:
   - o caminho `docs/workflows/target-prepare-report.md`;
   - a ordem de seções;
   - a semântica operacional de `eligible`, `compatible` e `recommended next action`;
   - a interpolação dos dados de projeto, Git, superfícies e resumo do Codex.
3. (workdir: `/home/mapita/projetos/codex-flow-runner`) Executar `apply_patch` em `src/core/target-prepare.test.ts` para trocar os asserts do wording antigo pelos labels explícitos em português e manter intactos os asserts que cobrem manifesto, superfícies gerenciadas e preservação de contexto.
4. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `rg -n "Target Prepare Report|Eligible for /projects: yes|Compatible with workflow complete: yes" src/core/target-prepare.ts src/core/target-prepare.test.ts` para confirmar que o contrato textual antigo foi totalmente removido dessas superfícies.
5. (workdir: `/home/mapita/projetos/codex-flow-runner`) Rodar `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/target-prepare.test.ts` para validar automaticamente `CA-04` e `CA-05` contra a suíte mais aderente ao ticket.
6. (workdir: `/home/mapita/projetos`) Preparar um repositório descartável irmão com upstream local bare para o smoke manual do fluxo:
   - `git init --bare target-prepare-report-smoke-remote.git`
   - `mkdir -p target-prepare-report-smoke`
   - `git -C target-prepare-report-smoke init`
   - `git -C target-prepare-report-smoke checkout -B main`
   - criar `README.md` e `AGENTS.md` com conteúdo local relevante e pequeno para testar preservação do merge;
   - `git -C target-prepare-report-smoke add README.md AGENTS.md`
   - `git -C target-prepare-report-smoke commit -m "chore: bootstrap smoke repo"`
   - `git -C target-prepare-report-smoke remote add origin ../target-prepare-report-smoke-remote.git`
   - `git -C target-prepare-report-smoke push -u origin main`
7. (workdir: `/home/mapita/projetos/codex-flow-runner`) Iniciar o runner em uma sessão dedicada com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`.
8. (workdir: canal Telegram autorizado ao runner) Acionar manualmente `/target_prepare target-prepare-report-smoke` e aguardar a conclusão completa do fluxo antes de inspecionar o repositório alvo.
9. (workdir: `/home/mapita/projetos/target-prepare-report-smoke`) Validar o relatório propagado com:
   - `rg -n "Relatório do target_prepare|Elegível para /projects: sim|Compatível com workflow completo: sim|Próxima ação recomendada" docs/workflows/target-prepare-report.md`
   - `rg -n "Target Prepare Report|Eligible for /projects: yes|Compatible with workflow complete: yes" docs/workflows/target-prepare-report.md`
   - `sed -n '1,220p' docs/workflows/target-prepare-report.md`
   - `git status --porcelain`
10. (workdir: `/home/mapita/projetos/target-prepare-report-smoke`) Revalidar manualmente os blocos gerenciados herdados do ticket com:
    - `rg -n "codex-flow-runner:target-prepare-managed-(agents|readme):(start|end)" AGENTS.md README.md`
    - `sed -n '1,220p' AGENTS.md`
    - `sed -n '1,220p' README.md`
    comparando a legibilidade observada com `docs/workflows/target-prepare-managed-agents-section.md` e `docs/workflows/target-prepare-managed-readme-section.md`.
11. (workdir: `/home/mapita/projetos/codex-flow-runner`) Se as validações acima estiverem verdes, executar `apply_patch` na spec de origem para:
    - atualizar `Status de atendimento`, `Evidencias de validacao` e pendências;
    - marcar `CA-04` como atendido;
    - marcar `CA-06` como atendido apenas se o smoke tiver sido realmente executado com evidência observável;
    - manter `Spec treatment` coerente com a existência ou não do ticket ainda aberto.

## Validation and Acceptance
- Matriz requisito -> validação observável derivada diretamente dos closure criteria do ticket:
  - Requisito: RF-04, RF-06, RF-07; CA-04.
    - Evidência observável: `renderReport()` passa a gerar `docs/workflows/target-prepare-report.md` com headings e bullets em português correto e acentuado, preservando o mesmo sentido operacional do resumo final e da recomendação de próxima ação.
    - Comando: `rg -n "Relatório do target_prepare|Resumo|Elegível para /projects: sim|Compatível com workflow completo: sim|Próxima ação recomendada|Snapshot do Git|Caminhos alterados|Superfícies gerenciadas|Resumo do Codex|Notas" src/core/target-prepare.ts src/core/target-prepare.test.ts`
    - Esperado: o código e a suíte convergem para os labels em português definidos neste plano.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/target-prepare.test.ts`
    - Esperado: a suíte passa validando o relatório gerado com o novo wording, sem regressão da próxima ação recomendada.
  - Requisito: RF-05; CA-05.
    - Evidência observável: `src/types/target-prepare.ts` continua preservando `TARGET_PREPARE_CONTRACT_VERSION`, `TARGET_PREPARE_SCHEMA_VERSION`, caminhos canônicos e chaves do manifesto; a suíte automatizada continua validando essa estabilidade.
    - Comando: `rg -n '^export const TARGET_PREPARE_(CONTRACT_VERSION|SCHEMA_VERSION|MANIFEST_PATH|REPORT_PATH) = ' src/types/target-prepare.ts`
    - Esperado: os valores continuam `1.0`, `1.0`, `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md`.
    - Comando: `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npx tsx --test src/core/target-prepare.test.ts`
    - Esperado: os asserts do manifesto seguem verdes junto com o novo relatório, provando que a revisão editorial não quebrou contrato, path nem versionamento lógico.
  - Requisito: RF-10; CA-06, com validações manuais herdadas de RF-03; CA-03.
    - Evidência observável: a suíte de `src/core/target-prepare.test.ts` e o smoke manual do fluxo real passam com o texto revisado; o repositório alvo usa a nova redação sem quebrar o fluxo, e os blocos gerenciados de `AGENTS.md` e `README.md` permanecem legíveis e sem conflito relevante.
    - Comando: iniciar o runner com `export HOME="/home/mapita"; export PATH="/home/mapita/.nvm/versions/node/v24.14.0/bin:$PATH"; npm run dev`, acionar `/target_prepare target-prepare-report-smoke` no Telegram autorizado e depois rodar `sed -n '1,220p' /home/mapita/projetos/target-prepare-report-smoke/docs/workflows/target-prepare-report.md`.
    - Esperado: o relatório no alvo exibe os labels em português definidos neste plano e mantém a recomendação operacional esperada.
    - Comando: `rg -n "Target Prepare Report|Eligible for /projects: yes|Compatible with workflow complete: yes" /home/mapita/projetos/target-prepare-report-smoke/docs/workflows/target-prepare-report.md`
    - Esperado: nenhum match; qualquer resquício do wording antigo invalida o aceite.
    - Comando: `rg -n "codex-flow-runner:target-prepare-managed-(agents|readme):(start|end)" /home/mapita/projetos/target-prepare-report-smoke/AGENTS.md /home/mapita/projetos/target-prepare-report-smoke/README.md` seguido de leitura manual dos dois arquivos.
    - Esperado: os markers existem e a revisão humana confirma que os blocos continuam claros para operadores, preservando o conteúdo preexistente relevante.
    - Comando: `git -C /home/mapita/projetos/target-prepare-report-smoke status --porcelain`
    - Esperado: working tree limpo após sucesso do fluxo; isso comprova que a mudança não quebrou a convergência operacional do `target_prepare` no cenário de smoke.

## Idempotence and Recovery
- Idempotência:
  - reexecutar a edição de `renderReport()` deve convergir para um único wording final, sem duplicar seções nem alterar os dados interpolados;
  - rerodar `npx tsx --test src/core/target-prepare.test.ts` não gera efeito colateral e deve permanecer verde se o contrato textual e o manifesto estiverem preservados;
  - repetir o smoke em repositório descartável recém-criado deve produzir o mesmo relatório em português e os mesmos markers gerenciados em `AGENTS.md`/`README.md`.
- Riscos:
  - existir algum assert escondido ou documentação de teste ainda acoplada ao wording em inglês;
  - alterar acidentalmente o contrato do manifesto ao tocar código vizinho de `renderReport()`;
  - o smoke falhar por ausência de upstream local, autenticação do Codex CLI ou acesso ao canal Telegram autorizado, sem relação com o wording do relatório;
  - a spec ser promovida de forma incoerente com o backlog ainda aberto.
- Recovery / Rollback:
  - se a suíte focada falhar por dependência residual do wording antigo, localizar o call site com `rg` e ajustar apenas a superfície textual necessária; não abrir refatoração ampla;
  - se algum diff tocar `src/types/target-prepare.ts` sem necessidade, reverter esse arquivo e retomar a edição exclusivamente em `renderReport()`/testes;
  - se o smoke falhar por ambiente (`origin`, Codex auth, Telegram), recriar o repo descartável e/ou restaurar a pré-condição externa antes de repetir o fluxo; não classificar o wording como regressão sem isolar a causa;
  - se a validação manual do smoke não puder ser executada nesta etapa, registrar explicitamente a pendência na spec e no ticket, sem inventar `CA-06` como atendido.

## Artifacts and Notes
- Ticket de origem:
  - `tickets/open/2026-03-25-relatorio-humano-do-target-prepare-ainda-sai-com-redacao-inconsistente.md`
- Spec de origem:
  - `docs/specs/2026-03-25-revisao-editorial-explicita-das-documentacoes-propagadas-por-target-prepare.md`
- Documentos de regra consultados:
  - `PLANS.md`
  - `docs/workflows/codex-quality-gates.md`
  - `DOCUMENTATION.md`
  - `SPECS.md`
  - `INTERNAL_TICKETS.md`
- Referências técnicas consultadas:
  - `src/core/target-prepare.ts`
  - `src/core/target-prepare.test.ts`
  - `src/types/target-prepare.ts`
  - `docs/workflows/target-prepare-managed-agents-section.md`
  - `docs/workflows/target-prepare-managed-readme-section.md`
  - `README.md`
- Evidências geradas na execução:
  - smoke repo: `/home/mapita/projetos/target-prepare-report-smoke`
  - smoke remote bare: `/home/mapita/projetos/target-prepare-report-smoke-remote.git`
  - commit/push do smoke: `45ad9cdb1bf8fe6de60ad3781f97774d63b8b9b3@origin/main`
  - relatório gerado: `/home/mapita/projetos/target-prepare-report-smoke/docs/workflows/target-prepare-report.md`
  - manifesto gerado: `/home/mapita/projetos/target-prepare-report-smoke/docs/workflows/target-prepare-manifest.json`
- ExecPlan irmão usado como contexto operacional do smoke:
  - `execplans/2026-03-25-falta-revisao-editorial-rastreavel-nas-fontes-copy-exact-do-target-prepare.md`
- Nota de qualidade aplicada:
  - este plano foi derivado após leitura integral do ticket e das referências obrigatórias;
  - a matriz de validação nasce diretamente dos closure criteria do ticket;
  - spec de origem, RFs/CAs, assumptions/defaults, restrições herdadas e riscos residuais ficaram explícitos.

## Interfaces and Dependencies
- Interfaces alteradas (planejadas):
  - contrato textual humano de `renderReport()` em `src/core/target-prepare.ts`;
  - asserts textuais da suíte em `src/core/target-prepare.test.ts`;
  - trilha documental da spec viva, após validação real.
- Compatibilidade:
  - `src/types/target-prepare.ts` deve permanecer compatível byte a byte nos valores contratuais principais;
  - `docs/workflows/target-prepare-report.md` continua no mesmo path e continua sendo artefato humano gerado pelo runner;
  - nenhum consumidor de produção conhecido deve depender do wording antigo em inglês.
- Dependências externas e operacionais:
  - `Codex CLI` autenticado para o smoke real de `/target_prepare`;
  - repositório descartável irmão com upstream local bare para permitir `push`;
  - canal Telegram autorizado ao runner para a etapa manual do smoke, salvo substituição consciente por caminho equivalente que use o backend real do `target_prepare`;
  - Node host em `/home/mapita/.nvm/versions/node/v24.14.0/bin` para todos os comandos `node`/`npm`/`npx`.
