# Prompt reutilizável para compatibilizar um projeto alvo com `target-investigate-case-v2`

Use este prompt dentro do repositório do projeto alvo que será compatibilizado.

Este prompt assume o setup padrão em que o projeto alvo e `codex-flow-runner` são diretórios irmãos, usando `../codex-flow-runner` como caminho local do runner.

```md
Você está no repositório de um projeto alvo que precisa aderir ao fluxo `target-investigate-case-v2` do `codex-flow-runner`.

## Objetivo
Implementar a compatibilização documental e operacional mínima do target com a v2, preservando:
- o runner como orquestrador target-agnostic;
- o target como autoridade semântica do caso, das evidências, dos prompts canônicos e do diagnóstico;
- o caminho mínimo `preflight -> resolve-case -> assemble-evidence -> diagnosis`.

Não reintroduza desenho legado, fallback implícito, publication-first, fluxo paralelo ou “v1 com roupa nova”.

## Leitura obrigatória no projeto alvo
Antes de editar qualquer arquivo, procure e leia também as instruções e documentações locais do próprio target que governam arquitetura, convenções, workflows e operação.

Inclua, no mínimo, o que existir entre:
- `AGENTS.md` da raiz e `AGENTS.md` locais;
- `README.md`;
- documentação de arquitetura;
- documentação de workflow/operação;
- convenções de scripts, comandos, tickets e artefatos;
- qualquer documentação que explique o workflow real investigado por este projeto.

Se houver conflito entre o contrato v2 do runner e a documentação, as convenções ou a realidade observável do target, reporte claramente a lacuna antes de improvisar. Não “adapte no escuro”.

## Leitura obrigatória no `codex-flow-runner`
Leia antes de editar qualquer arquivo:
- `../codex-flow-runner/AGENTS.md`
- `../codex-flow-runner/docs/specs/2026-04-08-target-investigate-case-v2-diagnosis-first-reconstruction.md`
- `../codex-flow-runner/docs/workflows/target-project-compatibility-contract.md`
- `../codex-flow-runner/docs/workflows/target-case-investigation-v2-manifest.json`
- `../codex-flow-runner/docs/workflows/target-case-investigation-v2-runbook.md`
- `../codex-flow-runner/docs/workflows/target-investigate-case-v2-target-onboarding.md`
- `../codex-flow-runner/docs/workflows/target-investigate-case-v2-resolve-case.md`
- `../codex-flow-runner/docs/workflows/target-investigate-case-v2-assemble-evidence.md`
- `../codex-flow-runner/docs/workflows/target-investigate-case-v2-diagnosis.md`

Se algum desses arquivos não existir ou não estiver acessível, pare e reporte o blocker com clareza.

## Responsabilidades que não podem se confundir
### Runner
- orquestra a rodada;
- injeta contexto operacional;
- executa as etapas na ordem correta;
- valida apenas pré-condições operacionais, segurança, cancelamento, versionamento e publication;
- inspeciona artefatos target-owned para registrar warnings de automação, sem reprovar o diagnóstico por schema divergente;
- permanece target-agnostic.

### Target
- entende o workflow real do domínio;
- resolve o caso a partir das referências recebidas;
- sabe onde estão dados, logs, scripts, tabelas, dashboards e superfícies de evidência;
- define como coletar evidências com segurança;
- produz o bundle e o diagnóstico;
- continua dono semântico de `ticket-projection`, quando esse estágio existir.

Não ensine o runner a pensar como o target. Ensine o target a se descrever com precisão.

## O que você precisa descobrir no projeto alvo
Mapeie explicitamente:
- como um caso chega nesse projeto;
- quais identificadores permitem localizar a execução certa;
- como diferenciar casos ambíguos, ausentes ou não resolvidos;
- quais dados realmente precisam ser coletados para diagnosticar um caso;
- onde ficam logs, scripts, queries, comandos, arquivos e integrações relevantes;
- como diferenciar coleta local, remota, em nuvem ou em ambientes distintos;
- quais blockers devem ser explicitados em vez de contornados;
- qual é o formato de diagnóstico mais útil para operadores humanos desse projeto.

## Arquivos que você deve criar ou atualizar no target
Implemente primeiro apenas a primeira onda:
- `docs/workflows/target-case-investigation-v2-manifest.json`
- `docs/workflows/target-case-investigation-v2-runbook.md`
- `docs/workflows/target-investigate-case-v2-resolve-case.md`
- `docs/workflows/target-investigate-case-v2-assemble-evidence.md`
- `docs/workflows/target-investigate-case-v2-diagnosis.md`

Só adicione estes arquivos opcionais se eles já puderem nascer claros e realmente úteis:
- `docs/workflows/target-investigate-case-v2-deep-dive.md`
- `docs/workflows/target-investigate-case-v2-improvement-proposal.md`
- `docs/workflows/target-investigate-case-v2-ticket-projection.md`

## Regras para adaptar o contrato ao domínio do target
### Manifesto
- Use o contrato da v2 como base, mas adapte entrypoints, políticas e superfícies ao projeto real.
- Preserve os nomes canônicos dos estágios e dos arquivos.
- Declare apenas estágios opcionais que o target realmente suporta hoje.
- Mantenha `docs/workflows/target-case-investigation-v2-runbook.md` como primeira entrada de `supportingArtifacts.docs`.
- Faça `supportingArtifacts.prompts` listar apenas prompts que realmente existirem.

### Runbook
- Escreva um mapa operacional durável do workflow investigado.
- Explique superfícies reais, termos do domínio, comandos oficiais, diferenças entre ambientes e blockers comuns.
- Não transforme o runbook em prompt gigante de execução passo a passo; ele deve ser referência estável, não script improvisado.

### `resolve-case`
- Explique como localizar exatamente a execução, request, attempt, job ou rodada correta.
- Declare critérios de desambiguação e blockers explícitos.
- Não misture aqui toda a coleta de evidências.

### `assemble-evidence`
- Faça deste prompt o lugar canônico para explicar logs, scripts, banco, dashboards, APIs, arquivos e critérios de suficiência.
- Diga como localizar evidências, como agrupá-las e como distingui-las por ambiente.
- Produza `evidence-index.json` e `case-bundle.json` sem duplicação indiscriminada.
- Escolha o shape que melhor represente a investigação do target. O envelope recomendado pelo runner ajuda consumo automático, mas não deve distorcer nem bloquear o diagnóstico.

### `diagnosis`
- Assuma `case-bundle.json` pronto.
- Produza `diagnosis.md` e `diagnosis.json`.
- Responda o caso com clareza humana, curta e causal.
- Não faça o diagnóstico repetir coleta operacional.
- Priorize uma resposta humana correta. Campos estruturados ajudam summary e automações, mas não devem virar contrato semântico fechado.

## Escopo da primeira onda
Implemente primeiro só:
- `resolve-case`
- `assemble-evidence`
- `diagnosis`

`ticket-projection` continua target-owned, mas não precisa entrar nesta primeira onda se isso complicar demais a compatibilização.

## Guardrails
- Respeite padrões, convenções e boas práticas já existentes no projeto alvo.
- Não edite antes de entender as instruções locais e a documentação operacional do target.
- Não introduza fallback legado nem fluxo paralelo.
- Não esconda decisões importantes atrás de “fica a critério do projeto”.
- Não transforme exemplos do piloto em contrato global.
- Não escreva prompts genéricos demais; cada prompt precisa refletir o workflow real do target.
- Marque claramente o que é obrigatório, o que é opcional e o que é apenas exemplo ilustrativo.
- Não force um schema de resposta só para agradar o runner; quando houver divergência entre envelope recomendado e diagnóstico correto, preserve o diagnóstico e registre a divergência.

## Resultado esperado
Ao final, o target deve estar pronto para materializar o caminho mínimo da v2 e produzir, por rodada mínima:
- `case-resolution.json`
- `evidence-index.json`
- `case-bundle.json`
- `diagnosis.md`
- `diagnosis.json`

Esses nomes orientam as superfícies canônicas da rodada. O runner deve tratar diferenças internas de schema nesses arquivos como warnings de automação no caminho mínimo, não como falha do target, desde que exista diagnóstico útil ou blocker explícito.

## Entrega final obrigatória
No resumo final, informe:
- arquivos criados e alterados;
- decisões tomadas;
- lacunas restantes;
- como validar localmente a compatibilização.

Se você não conseguir validar algo localmente, diga exatamente o que depende do ambiente, dado ou infraestrutura específica do target.
```
