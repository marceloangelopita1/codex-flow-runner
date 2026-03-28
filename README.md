# codex-flow-runner

Runner de tickets com **Node.js + TypeScript** para executar um fluxo **sequencial**.

Em termos simples: este projeto liga **Telegram + Codex CLI + Git** para automatizar pequenas entregas em um ou mais repositórios.

## Regra estrutural mais importante

Para o runner descobrir e trocar de projeto corretamente, este repositório e os projetos alvo precisam ficar como diretórios **irmãos** dentro da mesma pasta apontada por `PROJECTS_ROOT_PATH`.

Exemplo correto:

```txt
/home/SEU_USUARIO/projetos/
├── codex-flow-runner/
├── projeto-alvo-a/
└── projeto-alvo-b/
```

Em termos práticos:

- `PROJECTS_ROOT_PATH` aponta para a pasta-pai comum;
- o runner olha apenas para o **primeiro nível** dessa pasta;
- se o projeto alvo estiver em outra raiz ou em uma subpasta mais funda, ele não aparecerá em `/projects`.

## O que este projeto faz, em linguagem simples

Pense nele como um "operador automatizado" que trabalha assim:

1. você coloca um ticket em uma pasta chamada `tickets/open/`;
2. o runner le esse ticket;
3. ele chama o **Codex CLI** para planejar e implementar a mudança;
4. se der certo, ele move o ticket para `tickets/closed/`;
5. ele faz `git commit` e `git push`;
6. ele avisa o resultado pelo Telegram.

Ou seja: em vez de você abrir o projeto, ler o ticket, pedir ajuda ao Codex, editar arquivos, commitar e acompanhar tudo manualmente, este runner tenta fazer esse fluxo de ponta a ponta.

Mas o projeto não para nos tickets.

Ele também consegue trabalhar a partir de **especificacoes (specs)**. Na prática, isso significa que uma pessoa pode descrever em linguagem simples o que quer construir, o runner ajuda a transformar isso em uma spec em Markdown, e depois essa spec pode entrar no fluxo automatizado de implementação.

Isso é importante porque abre um caminho mais acessivel para pessoas sem familiaridade com desenvolvimento de software: em vez de pensar primeiro em arquivos, funções e arquitetura, a pessoa pode começar dizendo simplesmente o que o software deve fazer.

## O que você controla pelo Telegram

Depois de configurar o bot, o Telegram vira um painel de controle simples:

- você pode preparar o projeto ativo ou um repositório Git irmão ainda inelegível em `/projects` por `/target_prepare [project-name]`;
- você pode auditar readiness do projeto ativo ou de um diretório irmão por `/target_checkup [project-name]`;
- você pode derivar gaps readiness de um report canônico por `/target_derive_gaps [project-name] <report-path>`;
- cada fluxo target expõe comandos `*_status` e `*_cancel` para acompanhamento e cancelamento cooperativo antes de versionamento;
- enquanto um fluxo target operacional estiver ativo, `/status` e `/projects` continuam liberados, mas troca de projeto e sessões interativas ficam bloqueadas;
- você pode ver o status do runner;
- pode escolher em qual projeto ele vai trabalhar;
- pode escolher o modelo e o nível de reasoning por projeto;
- pode listar tickets abertos;
- pode criar e refinar uma spec em linguagem natural;
- pode mandar uma spec entrar no fluxo automatizado;
- pode mandar rodar a próxima tarefa da fila;
- pode receber mensagens com resumo do que aconteceu.

## Conceitos importantes

Antes de instalar, vale entender 3 ideias:

- **runner**: é o programa principal deste repositório; é ele quem fica rodando e ouvindo comandos do Telegram;
- **ticket**: é um arquivo `.md` descrevendo uma tarefa;
- **projeto ativo**: é o repositório em que o runner vai trabalhar naquele momento.

E vale acrescentar uma quarta ideia:

- **spec**: é uma especificação do que o sistema deve fazer, escrita em Markdown. Ela pode ser funcional (o que o software deve fazer) ou não funcional (qualidade, operação, segurança, desempenho, observabilidade etc.).

Isso significa que o runner pode estar rodando dentro do repositório `codex-flow-runner`, mas o código que ele vai modificar pode estar em **outro projeto**. Para isso funcionar, `codex-flow-runner` e cada projeto alvo precisam ficar como irmãos imediatos dentro de `PROJECTS_ROOT_PATH`.

## Duas formas de usar o runner

Hoje, existe um jeito bem simples de pensar no projeto:

### Caminho 1: você já sabe qual ticket quer executar

Fluxo:

1. criar um ticket em `tickets/open/`;
2. usar `/run_all`;
3. o runner implementa o ticket e segue o fluxo normal.

### Caminho 2: você ainda não tem ticket, mas sabe o que quer construir

Fluxo:

1. usar `/plan_spec` ou `/discover_spec` no Telegram;
2. descrever em linguagem simples o que você quer;
3. responder as perguntas de refinamento que o fluxo fizer;
4. mandar criar a spec;
5. usar `/run_specs <arquivo>` ou selecionar a spec por `/specs`;
6. em projeto compatível com o workflow completo, o runner faz a triagem da spec, deriva tickets em `tickets/open/`, cria `execplans/` apenas a partir desses tickets quando necessário, encadeia a rodada de implementação e fecha com uma auditoria final da spec.

Esse segundo caminho é o mais interessante para pessoas não técnicas, porque elas podem começar pelo comportamento desejado do sistema, sem precisar escrever tarefas técnicas logo de cara.

## Fluxo de especificacao em linguagem natural

Hoje existem dois jeitos de conduzir essa etapa pelo Telegram:

- `/plan_spec`: caminho mais leve, bom para refinamento rápido;
- `/discover_spec`: caminho mais profundo, pensado para uma entrevista estruturada antes de materializar a spec.

Nos passos abaixo, vou usar `/plan_spec` como exemplo porque ele é o fluxo mais curto. A ideia geral é a mesma em `/discover_spec`, mas com uma entrevista mais aprofundada.

Em termos simples, o fluxo de spec funciona assim:

1. você envia `/plan_spec` no Telegram;
2. o bot inicia uma conversa guiada;
3. você descreve em portugues simples o que quer, por exemplo:
   - "Quero um bot que responda bom dia e mostre a hora atual."
   - "Quero uma pequena aplicacao que cadastre clientes e gere um CSV."
   - "Quero melhorar a observabilidade do sistema e ter logs mais claros."
4. o fluxo pode fazer perguntas para refinar a ideia;
5. ao final, você escolhe a acao de **criar a spec**;
6. o runner cria um arquivo em `docs/specs/` no projeto ativo;
7. essa spec nasce com metadata que a deixa elegivel para a próxima etapa automatizada;
8. depois você pode usar `/specs` e `/run_specs <arquivo>` para transformar a spec em trabalho executável.

Na implementação atual, a spec criada pelo fluxo sai com:

- `Status: approved`
- `Spec treatment: pending`

Por isso ela fica pronta para entrar no fluxo de triagem automatica.

Compatibilidade do projeto alvo com o workflow completo continua sendo pre-requisito operacional do onboarding humano, e não validação semantica de runtime. O resumo canônico desse contrato esta em `docs/workflows/target-project-compatibility-contract.md`.

## Onboarding controlado de projeto alvo

O `/projects` agora funciona como um catálogo operacional:

- projeto elegível = diretório irmão com `.git` e `tickets/open/`, selecionável como projeto ativo;
- projeto pendente de `prepare` = diretório irmão com `.git`, mas ainda sem `tickets/open/`, visível no catálogo e elegível para `/target_prepare`.

Quando um repositório Git irmão ainda está pendente de `prepare` em `/projects`, existe uma etapa operacional explícita:

- `/target_prepare` usa o projeto ativo atual sem trocá-lo;
- `/target_prepare <project-name>` resolve apenas o nome literal do diretório irmão em `PROJECTS_ROOT_PATH`;
- o fluxo exige `.git`, working tree limpo e bloqueia mutações fora da allowlist documental do workflow;
- `AGENTS.md` e `README.md` são mesclados in-place com bloco gerenciado, enquanto os contratos canônicos restantes são sincronizados para a versão atual do runner;
- em sucesso, o próprio repositório alvo recebe `docs/workflows/target-prepare-manifest.json` e `docs/workflows/target-prepare-report.md`;
- commit/push só acontecem depois do pos-check determinístico; em falha, o fluxo não marca o preparo como concluído.

O `target_prepare` não troca implicitamente o projeto ativo do runner. Quando o preparo termina com sucesso e o repositório passa a atender `.git` + `tickets/open/`, ele deixa o estado pendente e passa a aparecer como elegível em `/projects`.

## Readiness audit canônico do projeto alvo

Depois do preparo, o runner também consegue auditar readiness de forma determinística:

- `/target_checkup` usa o projeto ativo atual sem trocá-lo;
- `/target_checkup <project-name>` opera sobre um diretório irmão explícito sem mudar o projeto ativo global;
- o fluxo exige working tree limpo, `HEAD` resolvido e branch simbólica antes de publicar qualquer artefato canônico;
- a coleta do v1 cobre `integridade do preparo`, `operabilidade local`, `saude de validacao/entrega` e `governanca documental`, com `observabilidade` explícita como dimensão opcional e não bloqueante;
- o relatório canônico é gerado em `docs/checkups/history/<timestamp>-project-readiness-checkup.json` e `.md`;
- rodadas concluídas operacionalmente versionam o par `.json` + `.md` mesmo quando o veredito geral é `invalid_for_gap_ticket_derivation`;
- falhas internas antes da fronteira de versionamento não publicam artefato canônico e retornam diagnóstico explícito.

## Derivação idempotente de gaps readiness

Quando um report de `target_checkup` fica elegível para derivação, o runner também consegue transformá-lo em backlog local auditável:

- `/target_derive_gaps <report-path>` usa o projeto ativo atual sem trocá-lo;
- `/target_derive_gaps <project-name> <report-path>` opera sobre um diretório irmão explícito sem mudar o projeto ativo global;
- o fluxo exige working tree limpo e `report-path` explícito relativo ao repositório alvo;
- o fluxo aceita `report-path` apontando para o `.json` ou para o `.md`, mas sempre valida o par canônico do mesmo stem;
- relatórios inválidos, stale, driftados, sem elegibilidade explícita ou pertencentes a outro projeto são recusados sem criar ou alterar tickets;
- a análise estruturada calcula `Gap ID`, `Gap fingerprint`, score e `Priority` deterministicamente em código;
- gaps materializáveis viram tickets readiness autocontidos no próprio projeto alvo; gap equivalente aberto é reutilizado, e gap equivalente já fechado gera novo ticket com vínculo explícito de recorrência;
- gaps bloqueados por dependência externa nascem com `Status: blocked`, enquanto limitações do próprio runner ficam apenas no write-back do report como `not_materialized_runner_limitation`;
- o write-back atualiza o `.json` e o `.md` do report com `derivation_status`, `derived_at_utc`, resultado por gap e caminhos dos tickets afetados no mesmo changeset das mutações reais;
- rerodar o mesmo `report-path` com o mesmo mapeamento retorna `no-op`, sem ticket duplicado e sem commit vazio.

Os três fluxos target agora usam o mesmo modelo de concorrência por projeto dos demais fluxos pesados do runner: projetos diferentes podem executar `/target_prepare`, `/target_checkup`, `/target_derive_gaps`, `/run_all`, `/run_specs`, `/run_ticket`, `/discover_spec`, `/plan_spec` e `/codex_chat` ao mesmo tempo quando houver capacidade global, mas cada projeto continua aceitando no máximo um slot pesado por vez. Em caso de múltiplos fluxos target simultâneos, `/status` lista todos os slots ativos e os comandos `*_status` e `*_cancel` passam a se resolver pelo projeto ativo atual; se houver ambiguidade fora desse escopo, o bot orienta selecionar o projeto correto antes de continuar. Cada fluxo publica milestones curtos no Telegram e no `/status`, além de registrar traces locais em `.codex-flow-runner/flow-traces/target-flows/`.

## Como uma spec vira implementação

Depois que a spec existe no projeto, o caminho real fica assim:

1. `/specs` lista as specs elegiveis do projeto ativo;
2. em projeto compatível com o workflow completo, `/run_specs <arquivo>` inicia `spec-triage` para ler a spec e derivar apenas tickets em `tickets/open/`;
3. o runner executa `spec-ticket-validation`, que revisa o pacote derivado, pode aplicar autocorreções controladas e devolve um veredito funcional `GO` ou `NO_GO`;
4. se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e houver historico revisado de gaps com insumo estruturado suficiente, o runner executa `spec-ticket-derivation-retrospective`, uma retrospectiva sistêmica pre-`/run_all` que não bloqueia a implementação do projeto alvo;
5. se o veredito funcional for `GO`, o runner executa `spec-close-and-version` para fechar e versionar a triagem da spec;
6. so depois disso o fluxo encadeia `/run_all`, que processa os tickets abertos do projeto de forma sequencial;
7. ao terminar o backlog, o fluxo executa `spec-audit` para comparar o estado final do repositório com a spec original;
8. se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e `spec-audit` apontar gap residual real, o runner ainda executa `spec-workflow-retrospective`, que olha para o processo e pode gerar melhoria no proprio workflow.

Se o gate `spec-ticket-validation` terminar em `NO_GO` e voce ajustar manualmente os tickets abertos derivados, existe um caminho de continuidade explicito:

- `/run_specs <arquivo>` faz retriagem completa e volta para `spec-triage`;
- `/run_specs_from_validation <arquivo>` retoma a mesma familia `run-specs` diretamente em `spec-ticket-validation`, reutilizando a spec atual e o backlog aberto atual;
- o resumo final, os traces, o milestone e o `/status` passam a explicitar qual dos dois comandos iniciou a rodada e qual foi o ponto de entrada observavel (`spec-triage` ou `spec-ticket-validation`).

Em outras palavras:

- `/plan_spec` ajuda a transformar uma ideia em spec;
- `/discover_spec` ajuda quando você quer uma descoberta mais guiada e profunda antes de escrever a spec;
- `/run_specs` ajuda a transformar a spec em backlog executável;
- `/run_all` executa os tickets desse backlog.

Isso significa que, em muitos casos, uma pessoa pode sair de um pedido em linguagem natural para uma implementação real passando por um fluxo guiado.

## Resumo do fluxo real

### Quando você usa `/run_all`

1. detectar o próximo ticket elegível em `tickets/open/` por `Priority` (`P0 -> P1 -> P2`; empate com fallback por nome de arquivo), ignorando itens marcados como `Status: blocked`;
2. executar a etapa `plan`, que gera ou atualiza o ExecPlan em `execplans/` quando necessário;
3. executar a etapa `implement`, aplicando a mudança no projeto alvo;
4. executar a etapa `close-and-version`, que fecha o ticket e prepara o estado final esperado;
5. validar o fechamento, mover o ticket para `tickets/closed/` e executar `git commit` + `git push` no mesmo ciclo;
6. refletir tudo isso no status do runner e nas mensagens do Telegram.

### Quando você usa `/run_specs`

1. executar `spec-triage` para ler a spec e derivar tickets;
2. executar `spec-ticket-validation`, que valida o pacote derivado e decide se o fluxo pode continuar;
3. executar `spec-ticket-derivation-retrospective` somente quando `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e houver histórico revisado de gaps e insumo estruturado suficiente; se a flag estiver desligada ou o insumo não existir, a etapa não entra no fluxo observável;
4. executar `spec-close-and-version` quando a triagem estiver funcionalmente aprovada;
5. encadear `/run_all` para processar os tickets abertos;
6. executar `spec-audit` ao final do backlog;
7. se `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` e houver gap residual real, executar `spec-workflow-retrospective` para aprender com a rodada e eventualmente gerar melhoria no workflow.

### Quando você usa `/run_specs_from_validation`

1. validar que a spec continua elegivel e que existe backlog aberto derivado reaproveitavel;
2. entrar diretamente em `spec-ticket-validation`, sem executar `spec-triage`;
3. se o veredito continuar `NO_GO`, encerrar antes de `spec-close-and-version` e antes do `/run_all`, orientando nova correção do backlog e reexecução do mesmo comando;
4. se o veredito for `GO`, seguir a mesma familia `run-specs` com `spec-ticket-derivation-retrospective` quando aplicável, `spec-close-and-version`, `/run_all`, `spec-audit` e `spec-workflow-retrospective` quando aplicável;
5. expor em resumo final, milestone, traces e `/status` que a rodada veio de `/run_specs_from_validation` com ponto de entrada `spec-ticket-validation`.

## O papel da pasta `prompts/`

Uma parte essencial desta automacao esta na pasta `prompts/`.

Em termos simples: os arquivos dessa pasta são os "roteiros de trabalho" que o runner entrega ao Codex em cada etapa. Eles dizem ao agente o que ele deve fazer, quais regras do repositório precisa seguir e qual saída e esperada.

Isso é importante porque o runner não chama o Codex de forma solta ou improvisada. Em vez disso, ele escolhe um prompt específico para a etapa atual, injeta o contexto real do trabalho e executa aquela fase com um objetivo bem definido.

Exemplos de etapas:

- `prompts/01-avaliar-spec-e-gerar-tickets.md`: analisar uma spec e abrir tickets quando houver gaps;
- `prompts/09-validar-tickets-derivados-da-spec.md` e `prompts/10-autocorrigir-tickets-derivados-da-spec.md`: validar e corrigir, quando permitido, o pacote derivado antes do `/run_all`;
- `prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md`: registrar a retrospectiva sistêmica pre-`/run_all` quando houver histórico revisado de gaps;
- `prompts/02-criar-execplan-para-ticket.md`: transformar um ticket em plano de execução;
- `prompts/03-executar-execplan-atual.md`: implementar o plano no repositório alvo;
- `prompts/04-encerrar-ticket-commit-push.md`: fechar ticket, versionar e publicar;
- `prompts/05-encerrar-tratamento-spec-commit-push.md`: concluir a triagem da spec e versionar esse resultado;
- `prompts/08-auditar-spec-apos-run-all.md`: auditar a spec depois da execução do backlog;
- `prompts/11-retrospectiva-workflow-apos-spec-audit.md`: fazer a retrospectiva sistêmica pós-`spec-audit`;
- `prompts/06-materializar-spec-planejada.md` e `prompts/07-versionar-spec-planejada-commit-push.md`: materializar e versionar specs criadas via `/plan_spec`.

Na prática, a automacao funciona como uma esteira:

1. o runner identifica a etapa atual;
2. carrega o arquivo correto em `prompts/`;
3. adiciona detalhes concretos, como caminho do ticket, caminho da spec, execplan esperado e commit esperado;
4. envia esse prompt montado para o Codex CLI;
5. valida o resultado e segue para a próxima etapa sequencial.

Por que isso ajuda tanto:

- deixa o comportamento mais repetível e menos dependente de improviso;
- reduz ambiguidade sobre o que o Codex deve fazer em cada fase;
- facilita evoluir o processo sem reescrever o runner inteiro;
- permite auditar e melhorar a automacao mexendo no roteiro certo.

Uma forma didatica de pensar nisso:

- `tickets/` e `docs/specs/` dizem **o que** precisa ser feito;
- `prompts/` diz **como o Codex deve conduzir cada etapa do processo**;
- o runner faz a orquestracao entre essas pecas.

Por isso, mudar um arquivo em `prompts/` pode alterar o comportamento de todas as futuras execuções daquela etapa. Essas mudanças devem ser feitas com cuidado, porque são parte central da lógica operacional do projeto.

## Status atual

O projeto executa o ciclo sequencial por ticket com chamadas reais ao Codex CLI (`plan -> implement -> close-and-version`), mantendo controle operacional por Telegram.

## Licença

Este projeto esta licenciado sob a **The Unlicense**.

Na prática, isso significa uso o mais livre possível: qualquer pessoa pode copiar, modificar, distribuir, vender e reutilizar este projeto para qualquer finalidade.

## Dependência obrigatória do Codex CLI

Este projeto **depende diretamente do Codex CLI** instalado no ambiente local.

Em outras palavras:

- instalar só Node.js, npm e as dependências do repositório **não é suficiente**;
- instalar só a extensão do Codex no VS Code **não é suficiente**;
- o runner precisa encontrar o comando `codex` no PATH do mesmo usuário Linux que executa `npm run dev`, `npm start` ou o serviço `systemd`.

Sem isso, o projeto não consegue executar as etapas reais de planejamento, implementação e fechamento de tickets.

## Guia recomendado para Windows

Se você vai fazer um fork deste projeto e instalar em uma máquina Windows, o caminho recomendado é:

1. usar **WSL** com Ubuntu;
2. instalar **Node.js e npm dentro do WSL**, não no PowerShell;
3. clonar o repositório em uma pasta Linux como `/home/SEU_USUARIO/projetos`, e não em `/mnt/c/...`;
4. abrir o projeto no **VS Code** usando WSL;
5. rodar o app pelo terminal do WSL com `npm run dev`.

Este README foi escrito com esse fluxo em mente.

Se a máquina for Linux nativa, você pode seguir praticamente os mesmos comandos Linux deste guia e simplesmente pular as etapas específicas de instalação do WSL.

## Antes de começar

Para seguir este guia com menos atrito, tenha em maos:

- uma conta no GitHub;
- uma conta OpenAI/ChatGPT com acesso ao Codex;
- o app do Telegram instalado no celular ou desktop;
- permissao para instalar o WSL no Windows;
- um fork deste repositório criado na sua conta.

## Caminho mais curto para a primeira execução

Se a ideia for apenas validar se o fork instala e sobe corretamente, siga esta sequencia:

1. instalar WSL + Ubuntu (ou usar um Linux nativo);
2. instalar `git`, `curl` e `build-essential`;
3. instalar `nvm` e depois Node.js 20;
4. fazer o fork e clonar em `~/projetos/codex-flow-runner`;
5. rodar `npm install` e `npm run check`;
6. instalar o Codex CLI e fazer `codex login`;
7. criar o bot no Telegram e descobrir o `chat id`;
8. copiar `cp .env.example .env` e preencher os valores reais;
9. rodar `npm run dev` e testar `/status` no Telegram.

Se algum passo falhar, pare nele antes de continuar. O restante do README detalha cada etapa com mais calma.

## Checklist rápido de sucesso

Ao final da instalacao, você deve conseguir fazer estas 6 verificacoes:

1. abrir o projeto dentro do WSL em um caminho como `/home/SEU_USUARIO/projetos/codex-flow-runner`;
2. rodar `node -v` e ver `v20` ou superior;
3. rodar `which codex` e `codex --version` sem erro;
4. rodar `npm install` e `npm run check` sem erro;
5. subir o runner com `npm run dev`;
6. receber resposta do bot no Telegram para `/status`.

Se você travar em algum ponto, volte para a ultima verificacao que funcionou. Isso costuma mostrar exatamente qual etapa faltou.

## O que e WSL e como usar

WSL significa **Windows Subsystem for Linux**. Na prática, ele permite rodar um Linux real dentro do Windows. Para este projeto, isso facilita:

- uso do Node.js e npm em um ambiente mais estavel para automacao;
- execução do `codex` CLI no mesmo ambiente onde o projeto esta;
- uso futuro de `systemd` no WSL para deixar o runner ligado continuamente.

Regra simples para evitar confusao:

- comandos com `wsl --...` são executados no **Windows** (PowerShell);
- comandos como `npm install`, `npm run dev`, `git clone` e `codex login` são executados **dentro do Ubuntu/WSL**.

Para abrir o WSL depois de instalar:

- abra o app **Ubuntu** no menu Iniciar; ou
- abra o **Windows Terminal** e escolha o perfil Ubuntu.

Se esta for a sua primeira vez com WSL, uma forma simples de pensar nele e:

- o Windows continua sendo seu sistema principal;
- o Ubuntu dentro do WSL vira o lugar onde você instala Node, npm, git e Codex CLI;
- para este projeto, quase tudo importante acontece dentro do Ubuntu.

Comandos basicos dentro do WSL:

```bash
pwd
ls
cd ~
cd ~/projetos/codex-flow-runner
```

## Instalacao passo a passo no Windows + WSL

### 1) Instale o WSL

No **PowerShell como Administrador**:

```powershell
wsl --install
```

Depois:

1. reinicie o Windows se for solicitado;
2. abra o Ubuntu;
3. crie seu usuário Linux e senha quando o assistente pedir.

Se o WSL já estiver instalado, você pode seguir adiante.

## 2) Instale ferramentas basicas dentro do Ubuntu

Todos os comandos abaixo devem ser executados **no terminal do Ubuntu/WSL**:

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

Verificacao rápida:

- `git --version` deve responder com uma versão valida;
- `curl --version` deve responder normalmente.

## 3) Instale Node.js 20+ e npm dentro do WSL

Este projeto exige **Node.js 20 ou superior**. O jeito mais prático para iniciantes no WSL e usar `nvm`.

Instale o `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Feche e abra o terminal do Ubuntu novamente, ou rode:

```bash
source ~/.nvm/nvm.sh
```

Instale e ative o Node 20:

```bash
nvm install 20
nvm use 20
node -v
npm -v
```

Verificacao rápida:

- `node -v` deve mostrar `v20.x.x` ou superior;
- `npm -v` deve responder normalmente.

Observacao:

- o `npm` vem junto com o Node.js, entao não precisa instalar separadamente;
- se você instalar Node no Windows, isso **não substitui** a instalacao dentro do WSL.

## 4) Faca o fork e clone o repositório

No GitHub:

1. abra este repositório;
2. clique em **Fork**;
3. crie o fork na sua conta.

Depois, no Ubuntu/WSL:

```bash
mkdir -p ~/projetos
cd ~/projetos
git clone https://github.com/SEU_USUARIO/codex-flow-runner.git
cd codex-flow-runner
```

Se ainda não configurou seu Git no WSL:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "voce@example.com"
```

Importante:

- mantenha o projeto em uma pasta Linux como `~/projetos/codex-flow-runner`;
- evite clonar em `/mnt/c/Users/...`, porque esse fluxo costuma ser mais lento e gerar mais problemas de permissao;
- o runner faz commit e push automaticamente no ciclo de fechamento, entao seu `git push` no WSL precisa estar autenticado antes de usar `/run_all`.

Verificacao rápida:

- `git remote -v` deve mostrar a URL do seu fork;
- `git status` deve abrir normalmente dentro do repositório clonado.

## 5) Abra no VS Code

No Windows, instale:

- **Visual Studio Code**
- extensao **WSL** do VS Code
- extensao **OpenAI Codex**

Depois, a partir do terminal do WSL dentro da pasta do projeto:

```bash
code .
```

Isso abre o projeto no VS Code conectado ao Linux do WSL. É o jeito mais simples de editar, rodar terminal e usar a extensao do Codex no mesmo ambiente.

Importante:

- a extensao do Codex no VS Code ajuda no uso do Codex dentro da IDE;
- mesmo assim, este projeto continua precisando do **Codex CLI instalado no WSL**, porque o runner usa o comando `codex` no terminal.

Se `code .` não funcionar:

1. abra o VS Code no Windows;
2. instale ou confirme a extensao **WSL** do VS Code;
3. use o comando **WSL: Open Folder in WSL** na paleta de comandos;
4. abra a pasta `/home/SEU_USUARIO/projetos/codex-flow-runner`.

## 6) Instale as dependências do projeto

Na raiz do projeto:

```bash
npm install
npm run check
```

Se `npm run check` terminar sem erro, o projeto esta com dependências e TypeScript prontos para a primeira execução.

Importante:

- `npm run check` valida TypeScript e imports do projeto, mas não confirma login no Codex, token do Telegram ou permissao de `git push`;
- por isso, a validação real da instalacao continua sendo subir o runner e testar `/status`.

Dica para iniciantes:

- rode `npm install` sem `sudo`.

## 7) Instale e autentique o Codex CLI

### Conta OpenAI e planos compatíveis

Para usar o Codex CLI com login por assinatura, você precisa de uma **conta OpenAI/ChatGPT com acesso ao Codex**.

Os planos da OpenAI podem mudar com o tempo. Entao, em vez de fixar uma informação eterna neste README, aqui vai o critério seguro:

- consulte sempre os links oficiais abaixo antes de configurar uma máquina nova;
- na revisão deste README em **2026-03-13**, a documentação oficial da OpenAI informava que o Codex estava incluido em **ChatGPT Plus, Pro, Business, Edu e Enterprise**;
- a mesma documentação também dizia que, **por tempo limitado**, o Codex estava incluido em **ChatGPT Free e Go**.

Links oficiais de referência:

- [Codex quickstart](https://developers.openai.com/codex/quickstart)
- [Codex overview](https://developers.openai.com/codex/)
- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Codex authentication](https://developers.openai.com/codex/auth)
- [Codex on Windows and WSL](https://developers.openai.com/codex/windows)

Observacoes importantes:

- a CLI é a extensao IDE aceitam login com **ChatGPT** ou com **API key**;
- para um iniciante rodando este projeto localmente, o caminho mais simples costuma ser **entrar com a conta ChatGPT**;
- se você usa login por email e senha na OpenAI, a documentação oficial de autenticacao indica habilitar **MFA** para acessar o Codex.

### Instalacao local do Codex CLI

Este projeto depende do `codex` no PATH do mesmo usuário Linux que vai executar o app.

Instale:

```bash
npm i -g @openai/codex
which codex
codex --version
```

Se `which codex` mostrar um caminho e `codex --version` responder com uma versão, a instalacao local do binario deu certo.

### Login no Codex CLI

Depois autentique:

```bash
codex login
```

O fluxo esperado e:

1. o terminal abre o navegador;
2. você entra com sua conta OpenAI/ChatGPT;
3. a autenticacao retorna para o terminal;
4. o Codex passa a funcionar naquele usuário Linux.

Se o login por navegador não funcionar no seu ambiente, a documentação oficial também lista este fallback:

```bash
codex login --device-auth
```

Se você já usou o Codex CLI no passado via API key e agora quer migrar para o acesso baseado em assinatura, a central de ajuda da OpenAI recomenda atualizar a CLI e depois fazer:

```bash
codex logout
codex
```

### Como validar que deu tudo certo

Use esta sequencia simples de verificacao:

```bash
which codex
codex --version
codex
```

Considere que esta tudo certo quando:

- `which codex` aponta para um executável real;
- `codex --version` responde normalmente;
- `codex` abre a interface interativa sem erro de autenticacao;
- ao fechar e abrir de novo, ele não pede login imediatamente toda vez.

Validação complementar:

- em alguns ambientes, o login fica em cache local e pode aparecer em `~/.codex/auth.json`;
- em outros, o Codex usa o cofre de credenciais do sistema operacional;
- por isso, a verificacao mais confiavel continua sendo `codex` abrir normalmente e aceitar um prompt.

Observacoes:

- faca o login no mesmo usuário Linux que vai rodar `npm run dev` ou o servico `systemd`;
- sem sessão valida no `codex`, o comando `/run_all` falha cedo com instrução para autenticacao.

### Confiar no projeto e preparar um modo realmente automatico

Depois do `codex login`, vale fazer um teste manual simples dentro do repositório que o Codex vai editar.

No próprio `codex-flow-runner`:

```bash
cd ~/projetos/codex-flow-runner
codex
```

Quando o Codex perguntar se deve confiar na pasta, aceite. Depois pode sair da interface.

Por que isso ajuda:

- a documentação oficial informa que o Codex so carrega configuração por projeto em `.codex/config.toml` quando o projeto e confiavel;
- isso evita confusoes futuras se você passar a usar configuracoes locais por repositório;
- na prática, ao marcar um projeto como confiavel, o Codex registra essa confianca no arquivo `~/.codex/config.toml`.

Se você quiser verificar ou ajustar isso manualmente, o formato esperado e este:

```toml
[projects."/home/SEU_USUARIO/projetos/codex-flow-runner"]
trust_level = "trusted"
```

Para outros repositórios que o runner vai gerenciar, a ideia é a mesma: entre na pasta uma vez, rode `codex`, aceite a confianca e so depois use o fluxo automatizado naquele projeto.

### Opcional: deixar suas sessões manuais do Codex sem perguntas e com full access

Pausa rápida de segurança: isso deixa o Codex muito mais autonomo e também mais perigoso. So faz sentido em uma máquina que você controla e em repositórios nos quais você realmente quer delegar edicao e execução de comandos sem confirmacoes.

Este projeto depende justamente desse estilo de execução para automatizar planejamento, implementação e fechamento sem ficar esperando confirmacoes humanas a cada comando. Nas etapas não interativas, o runner usa chamadas equivalentes a `codex exec -a never -s danger-full-access ...`. Ainda assim, se você quiser que suas sessões manuais no terminal sigam a mesma ideia, o caminho mais seguro e criar um **profile** em `~/.codex/config.toml`:

```toml
[profiles.runner_full_access]
approval_policy = "never"
sandbox_mode = "danger-full-access"
```

Depois, quando quiser abrir o Codex nesse modo:

```bash
codex --profile runner_full_access
```

Se você preferir um comando explícito, sem depender de profile:

```bash
codex -a never -s danger-full-access
```

E para uso não interativo:

```bash
codex exec -a never -s danger-full-access "<sua tarefa>"
```

Se você realmente quiser que esse seja o comportamento padrão de todas as suas sessões locais do Codex, pode usar os defaults globais abaixo em `~/.codex/config.toml`:

```toml
approval_policy = "never"
sandbox_mode = "danger-full-access"
```

Mas, para a maioria das pessoas, um profile dedicado e melhor do que tornar esse modo perigoso o default global.

## 8) Crie o bot no Telegram

### Criar o bot

No app do Telegram:

1. procure por **@BotFather**;
2. envie `/newbot`;
3. escolha um nome para o bot;
4. escolha um username terminado em `bot` (ex.: `meu_codex_flow_bot`);
5. copie o token gerado.

Esse token será o valor de `TELEGRAM_BOT_TOKEN`.

### Descobrir o chat ID autorizado

Para a primeira configuração, o jeito mais simples costuma ser usar um bot que mostra seu ID diretamente.

Opcao recomendada para bootstrap:

1. abra [`@my_id_bot`](https://t.me/my_id_bot);
2. clique em **Start**;
3. copie o numero informado pelo bot como seu Telegram ID;
4. use esse numero como `TELEGRAM_ALLOWED_CHAT_ID`.

Se você for autorizar um grupo:

1. adicione o `@my_id_bot` ao grupo;
2. envie uma mensagem no grupo;
3. copie o ID informado pelo bot;
4. se o numero vier negativo, mantenha o sinal `-` no `.env`.

Observacoes:

- esse caminho depende de um bot de terceiros; ele é o mais prático para bootstrap, mas não é um recurso oficial do Telegram;
- se o `@my_id_bot` estiver indisponivel, uma alternativa comum e [`@RawDataBot`](https://t.me/RawDataBot);
- se você preferir não depender de terceiros, use o fallback oficial abaixo com a API do Telegram.

#### Fallback oficial via API (`getUpdates`)

O fallback mais confiavel e usar uma **conversa privada** com o bot que você criou no `@BotFather`.

1. abra o link do bot criado;
2. clique em **Start** ou envie `/start`;
3. no terminal do WSL, rode:

```bash
curl "https://api.telegram.org/botSEU_TOKEN_AQUI/getUpdates"
```

Procure no JSON retornado por um bloco parecido com este:

```json
"chat": {
  "id": 123456789,
  "type": "private"
}
```

Use esse numero como `TELEGRAM_ALLOWED_CHAT_ID`.

Observacoes:

- se o retorno vier com `"result":[]`, envie uma mensagem para o bot e rode o comando novamente;
- se você for usar um grupo, o `chat.id` pode ser negativo; mantenha o sinal `-` no `.env`.

## 9) Crie o arquivo .env

Este repositório já traz um arquivo modelo. Na raiz do projeto, copie:

```bash
cp .env.example .env
```

Depois abra o arquivo `.env` e deixe assim:

```dotenv
TELEGRAM_BOT_TOKEN=COLE_AQUI_O_TOKEN_DO_BOT
TELEGRAM_ALLOWED_CHAT_ID=COLE_AQUI_O_CHAT_ID
PROJECTS_ROOT_PATH=/home/SEU_USUARIO/projetos
POLL_INTERVAL_MS=5000
RUN_ALL_MAX_TICKETS_PER_ROUND=20
SHUTDOWN_DRAIN_TIMEOUT_MS=30000
PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM=false
RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false
```

Explicacao rápida:

- `TELEGRAM_BOT_TOKEN`: token criado pelo `@BotFather`;
- `TELEGRAM_ALLOWED_CHAT_ID`: chat autorizado a controlar o bot;
- `PROJECTS_ROOT_PATH`: pasta-pai onde ficam os projetos que o runner pode gerenciar.
- `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED`: controla as retrospectivas sistêmicas pre-`/run_all` e pós-`spec-audit`; o padrão é `false` e qualquer mudança exige restart do runner.

Para um fork em:

```txt
/home/SEU_USUARIO/projetos/codex-flow-runner
```

o valor correto normalmente será:

```dotenv
PROJECTS_ROOT_PATH=/home/SEU_USUARIO/projetos
```

Importante:

- `PROJECTS_ROOT_PATH` deve apontar para a **pasta-pai**, não para a pasta do repositório;
- `codex-flow-runner` e cada projeto alvo precisam ficar diretamente dentro dessa pasta-pai;
- o runner não faz busca recursiva em subpastas; ele descobre apenas diretórios do primeiro nível;
- o app carrega automaticamente o `.env` da raiz ao iniciar;
- para `npm run dev` e `npm start`, você **não** precisa rodar `source .env`.
- não commite seu `.env`; ele deve ficar apenas na sua máquina.
- se preferir, abra o projeto no VS Code e crie esse arquivo por la.

## 10) Rode o projeto pela primeira vez

Na raiz do projeto:

```bash
npm run dev
```

Com isso, o bot sobe em modo de desenvolvimento e fica ouvindo comandos do Telegram.

Sinais esperados nesta etapa:

- o processo deve continuar rodando no terminal, sem encerrar sozinho;
- se houver erro de `.env`, `codex` ou Telegram, ele normalmente aparece logo na inicializacao.

Primeiros testes sugeridos no Telegram:

1. envie `/start`;
2. envie `/status`;
3. envie `/projects`;
4. envie `/models`;
5. envie `/reasoning`;
6. envie `/speed`;
6. quando quiser iniciar a rodada sequencial, envie `/run_all`.

Observacoes:

- mantenha o terminal aberto enquanto o runner estiver em execução;
- `npm run dev` não faz hot-reload;
- se quiser recarregamento automatico em desenvolvimento, use `npm run dev:watch`.
- para parar o runner manualmente, use `Ctrl+C` no terminal.

## Erros mais comuns na primeira instalacao

- `which codex` não encontra nada: o Codex CLI provavelmente foi instalado no Windows ou em outro usuário. Instale e faca login dentro do mesmo Ubuntu/WSL que executa `npm run dev`.
- `npm run dev` reclama de configuração invalida: quase sempre o problema esta no `.env`, principalmente em `PROJECTS_ROOT_PATH` apontando para a pasta do repositório em vez da pasta-pai.
- o bot não responde a `/status`: confirme se você enviou `/start` para o bot, se `TELEGRAM_BOT_TOKEN` esta correto e se `TELEGRAM_ALLOWED_CHAT_ID` bate exatamente com o chat autorizado.
- `/run_all` falha na hora do push: o Git do WSL ainda não esta autenticado para empurrar para o seu fork ou para o repositório alvo.
- um projeto não aparece em `/projects`: ele precisa estar no primeiro nível de `PROJECTS_ROOT_PATH` e conter pelo menos `.git`; se tiver `.git` mas ainda não tiver `tickets/open/`, ele aparece no catálogo como pendente de `prepare` e deve ser promovido por `/target_prepare`.

## Exemplo prático: criar um segundo projeto "Hello World"

Esta é a melhor forma de entender o que o runner faz na prática.

Neste exemplo, você vai:

1. criar um novo projeto simples dentro de `PROJECTS_ROOT_PATH`;
2. colocar um ticket nesse projeto;
3. usar o Telegram para mandar o runner trabalhar nele;
4. ver o runner criar os arquivos no novo projeto.

### 1) Crie a pasta do novo projeto no lugar certo

Se o seu `.env` estiver com:

```dotenv
PROJECTS_ROOT_PATH=/home/SEU_USUARIO/projetos
```

entao o novo projeto deve ficar como "irmao" do `codex-flow-runner`, por exemplo:

```txt
/home/SEU_USUARIO/projetos/hello-world-runner-demo
```

Isso não é apenas um exemplo de organização. Esse é o formato que o runner usa para descobrir projetos elegíveis.

No WSL:

```bash
cd ~/projetos
mkdir -p hello-world-runner-demo/tickets/open
mkdir -p hello-world-runner-demo/tickets/closed
mkdir -p hello-world-runner-demo/execplans
cd hello-world-runner-demo
git init -b main
```

Crie também um `README.md` simples no projeto novo. Se preferir, faca isso pelo VS Code.

Antes de seguir, faca o bootstrap de confianca do Codex nesse repositório novo:

```bash
cd ~/projetos/hello-world-runner-demo
codex
```

Se aparecer o prompt de confianca da pasta, aceite. Depois saia do Codex. Esse passo e razoavel porque ajuda o CLI a registrar o projeto como confiavel e reduz a chance de atrito futuro quando você testar o Codex manualmente nesse repositório ou passar a usar `.codex/config.toml` local.

Conteúdo sugerido:

```md
# hello-world-runner-demo

Projeto de teste para validar o codex-flow-runner.
```

### 2) Configure um remoto git para esse projeto

Isto é importante porque o runner faz **commit e push obrigatorios** no fechamento do ticket.

Entao, para um teste completo, crie um repositório vazio no GitHub chamado, por exemplo, `hello-world-runner-demo`, e depois rode no WSL:

```bash
git remote add origin https://github.com/SEU_USUARIO/hello-world-runner-demo.git
git add .
git commit -m "chore: bootstrap hello world demo"
git push -u origin main
```

Se você pular essa parte, o projeto pode até ser descoberto pelo runner, mas a rodada completa pode falhar na etapa de `push`.

### 3) Crie um ticket simples nesse projeto novo

Dentro de `hello-world-runner-demo`, crie um arquivo em `tickets/open/`.

Nome sugerido:

```txt
tickets/open/YYYY-MM-DD-criar-hello-world-inicial.md
```

Exemplo usando a data de `2026-03-13`:

```txt
tickets/open/2026-03-13-criar-hello-world-inicial.md
```

Conteúdo sugerido:

```md
# [TICKET] Criar Hello World inicial

## Metadata
- Status: open
- Priority: P2
- Severity: S3
- Created at (UTC): 2026-03-13 12:00Z
- Reporter: voce
- Owner:
- Source: local-run
- Request ID: N/A
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:

## Context
- Workflow area: projeto de teste
- Scenario: validar o fluxo do runner em um repositorio novo
- Input constraints: manter tudo simples e didatico

## Problem statement
Criar um exemplo minimo de Hello World em Node.js neste repositorio.

## Expected behavior
O repositorio deve passar a ter:
- um arquivo `index.js` com `console.log("Hello World");`
- um `package.json` simples com script `start`
- um `README.md` atualizado com instrucoes curtas para rodar o exemplo

## Closure criteria
- `index.js` criado
- `package.json` criado ou atualizado
- `README.md` atualizado
- ticket movido para `tickets/closed/`
```

Para este primeiro teste, esse ticket simples já costuma ser suficiente.

### 4) Inicie o runner no projeto principal

Volte para o repositório `codex-flow-runner` e suba o bot:

```bash
cd ~/projetos/codex-flow-runner
npm run dev
```

### 5) Use o Telegram para selecionar o novo projeto

No chat com o bot:

1. envie `/projects`
2. confirme que `hello-world-runner-demo` apareceu na lista
3. envie `/select_project hello-world-runner-demo`
4. envie `/status`
5. envie `/tickets_open`

Nesse ponto, você deve conseguir ver que o novo projeto foi descoberto e que o ticket esta na fila.

### 6) Rode o ticket pelo Telegram

Agora envie:

```txt
/run_all
```

Se tudo estiver configurado corretamente, o runner deve:

- usar o `hello-world-runner-demo` como projeto ativo;
- ler o ticket criado;
- chamar o Codex CLI;
- criar ou atualizar os arquivos do projeto;
- mover o ticket de `tickets/open/` para `tickets/closed/`;
- fazer commit e push no repositório `hello-world-runner-demo`;
- mandar um resumo no Telegram.

### 7) Veja o resultado no novo projeto

No WSL ou no VS Code, abra:

```txt
/home/SEU_USUARIO/projetos/hello-world-runner-demo
```

Você deve encontrar algo próximo disso:

- `index.js`
- `package.json`
- `README.md` atualizado
- ticket movido para `tickets/closed/`

Se quiser testar o resultado localmente:

```bash
cd ~/projetos/hello-world-runner-demo
npm install
npm start
```

### 8) Se o projeto novo não aparecer no Telegram

Confira estes pontos:

- ele precisa estar dentro de `PROJECTS_ROOT_PATH`;
- ele precisa ter um diretório `.git`;
- se ainda não tiver `tickets/open/`, ele deve aparecer em `/projects` como pendente de `prepare`;
- depois de `/target_prepare` bem-sucedido ou da criação da estrutura compatível, ele passa a ficar elegível para seleção ativa;
- o runner precisa estar em execução no `codex-flow-runner`.

## Exemplo prático: criar um projeto a partir de uma spec

Se a ideia for mostrar o potencial do projeto para alguem não técnico, este costuma ser o exemplo mais interessante.

Imagine que, no projeto `hello-world-runner-demo`, a pessoa ainda não tem tickets prontos, mas sabe o resultado que quer.

No Telegram, ela pode começar assim:

```txt
/plan_spec
```

Depois, quando o fluxo pedir o brief inicial, ela pode responder algo como:

```txt
Quero um projeto bem simples em Node.js que tenha uma pagina de Hello World, um script para iniciar localmente e instrucoes curtas no README para qualquer pessoa rodar.
```

O fluxo pode fazer perguntas de refinamento. Por exemplo:

- se deve ser terminal ou pagina web;
- quais arquivos iniciais devem existir;
- como a pessoa espera validar que funcionou.

Ao final, a pessoa escolhe a opcao de criar a spec.

Resultado esperado:

- uma spec nova aparece em `docs/specs/` dentro do projeto ativo;
- essa spec descreve a ideia de forma mais estruturada;
- ela fica pronta para entrar no fluxo de triagem.

Depois, no mesmo projeto ativo:

1. envie `/specs`
2. localize a spec criada
3. envie `/run_specs <arquivo-da-spec.md>` ou selecione a spec na lista

Quando isso acontecer, o runner vai:

- analisar a spec;
- abrir tickets em `tickets/open/` se houver trabalho a ser detalhado e implementado;
- criar `execplans/` apenas a partir dos tickets que exigirem um plano de execução seguro;
- encadear a rodada de execução desses tickets.

Isso mostra uma ideia importante deste repositório:

- uma pessoa técnica pode usar tickets direto;
- uma pessoa menos técnica pode começar por uma descrição em linguagem natural;
- a spec vira a ponte entre a ideia e a implementação.

## Estrutura do projeto

Arquitetura principal:

```txt
src/
├── config/
├── core/
├── integrations/
└── types/
```

Pastas importantes na raiz deste repositório:

- `prompts/`: roteiros operacionais usados pelo runner para instruir o Codex em cada etapa automatizada;
- `tickets/`: backlog interno do próprio `codex-flow-runner`;
- `docs/specs/`: specs funcionais e operacionais usadas como base para evolucao;
- `execplans/`: planos de execução gerados durante o fluxo.

Pastas esperadas em cada repositório gerenciado pelo runner:

- `tickets/open/`
- `tickets/closed/`
- `execplans/`

Neste fork, essas pastas já existem. Se você quiser que o runner gerencie outros projetos além deste, cada um deles deve ter pelo menos:

- um repositório git local (`.git`);
- `tickets/open/`.

## Como o runner escolhe em qual projeto trabalhar

Regras de descoberta:

- o runner monta o catálogo de `/projects` no primeiro nível de `PROJECTS_ROOT_PATH`;
- projeto elegivel = diretório que possui `.git` e `tickets/open/`;
- projeto pendente de `prepare` = diretório que possui `.git`, mas ainda não possui `tickets/open/`;
- em outras palavras, o runner espera encontrar `codex-flow-runner` e os projetos alvo como pastas irmãs diretas dentro da mesma pasta-pai;
- o projeto ativo global continua sendo restaurado apenas entre os projetos elegiveis a partir de `PROJECTS_ROOT_PATH/.codex-flow-runner/active-project.json` quando valido;
- se o estado persistido estiver ausente, invalido ou desatualizado, o bootstrap usa fallback para o primeiro projeto elegivel em ordem alfabetica e persiste a nova selecao;
- não existe fallback de compatibilidade para `REPO_PATH`.

Exemplo de estrutura valida:

```txt
/home/SEU_USUARIO/projetos/
├── codex-flow-runner/
├── outro-projeto/
└── mais-um-projeto/
```

Nesse caso, o valor de `PROJECTS_ROOT_PATH` continua sendo:

```dotenv
PROJECTS_ROOT_PATH=/home/SEU_USUARIO/projetos
```

## Variaveis de ambiente

Obrigatórias:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `PROJECTS_ROOT_PATH`

Opcionais:

- `POLL_INTERVAL_MS` (padrão: `5000`)
- `RUN_ALL_MAX_TICKETS_PER_ROUND` (padrão: `20`)
- `SHUTDOWN_DRAIN_TIMEOUT_MS` (padrão: `30000`)
- `PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM` (padrão: `false`)
- `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` (padrão: `false`)

Observacoes operacionais:

- o ciclo de fechamento e versionamento exige commit + push por ticket;
- a etapa `close-and-version` prepara o estado final do ticket; o commit e push correspondentes são executados pelo runner após essa etapa;
- antes do commit/push, o runner valida se o ticket realmente saiu de `tickets/open/`, apareceu em `tickets/closed/` e ficou com as metadata obrigatórias de fechamento coerentes;
- cada comando `/run_all` processa no máximo `RUN_ALL_MAX_TICKETS_PER_ROUND` tickets por rodada;
- `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false` mantém `/run_specs` focado no fluxo funcional da spec e suprime as retrospectivas sistêmicas, a publication de ticket transversal e os blocos correspondentes no resumo final;
- `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=true` reabilita as retrospectivas sistêmicas pre-`/run_all` e pós-`spec-audit`;
- alterar `RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED` no `.env` so tem efeito apos reiniciar o processo do runner;
- ao receber `SIGINT` ou `SIGTERM`, o runner entra em shutdown gracioso e aguarda drain bounded de operações em voo por até `SHUTDOWN_DRAIN_TIMEOUT_MS`;
- indisponibilidade de validação manual externa ao agente (ex.: Telegram real indisponível) não deve, sozinha, forçar `NO_GO`; nesse caso, o fechamento pode ser `GO` com anotação explícita de validação manual pendente;
- quando um follow-up depender apenas de insumo externo/manual e não houver próximo passo local executável, ele deve ser criado como `Status: blocked`; a rodada encerra com motivo observável quando restarem apenas tickets bloqueados;
- para uma mesma cadeia de `NO_GO` (`Closure reason: split-follow-up` + `Parent ticket`), o runner aceita no máximo 3 recuperações; ao exceder esse limite, a rodada para em erro e a tarefa permanece não finalizada no backlog.

## Pre-requisitos operacionais

- `codex` instalado e disponível no PATH (ex.: `npm i -g @openai/codex`);
- `codex` autenticado no mesmo usuário do processo (`codex login`);
- autenticacao git configurada no WSL para permitir `git push`.

## Scripts

- `npm run dev` - execução local sem auto-reload; recomendado para a primeira execução
- `npm run dev:watch` - desenvolvimento com hot-reload
- `npm run build`
- `npm start`
- `npm run check`
- `npm test`

Fluxo recomendado para começar:

```bash
npm install
npm run check
npm run dev
```

## Controle por Telegram

- `/start` -> mostra descrição do bot e comandos disponíveis
- `/target_prepare [projeto]` -> prepara o projeto ativo ou um diretório irmão Git explícito para o workflow completo sem trocar o projeto ativo
- `/target_prepare_status` -> mostra status detalhado do `/target_prepare` resolvido para o projeto ativo atual
- `/target_prepare_cancel` -> solicita cancelamento cooperativo do `/target_prepare` resolvido para o projeto ativo atual antes da fronteira de versionamento
- `/target_checkup [projeto]` -> audita readiness do projeto ativo ou de um diretório irmão explícito sem trocar o projeto ativo
- `/target_checkup_status` -> mostra status detalhado do `/target_checkup` resolvido para o projeto ativo atual
- `/target_checkup_cancel` -> solicita cancelamento cooperativo do `/target_checkup` resolvido para o projeto ativo atual antes da fronteira de versionamento
- `/target_derive_gaps [projeto] <report-path>` -> deriva gaps readiness de um report canônico elegível a partir do projeto ativo ou de um projeto explícito, sem trocar o projeto ativo
- `/target_derive_gaps_status` -> mostra status detalhado do `/target_derive_gaps` resolvido para o projeto ativo atual
- `/target_derive_gaps_cancel` -> solicita cancelamento cooperativo do `/target_derive_gaps` resolvido para o projeto ativo atual antes da fronteira de versionamento
- `/run_all` -> inicia o loop sequencial de processamento de tickets
- `/run-all` -> alias legado compatível para `/run_all`
- `/tickets_open` -> lista os tickets abertos do projeto ativo
- `/specs` -> lista specs elegiveis (`Status: approved` + `Spec treatment: pending`) do projeto ativo
- `/run_specs <arquivo>` -> em projeto compatível com o workflow completo, executa triagem da spec informada, encadeia a rodada de tickets e finaliza com `spec-audit`
- `/codex_chat` -> inicia conversa livre com Codex no projeto ativo
- `/codex-chat` -> alias legado compatível para `/codex_chat`
- `/discover_spec` -> inicia sessão stateful de descoberta profunda de spec
- `/discover_spec_status` -> mostra diagnóstico detalhado da sessão `/discover_spec`
- `/discover_spec_cancel` -> encerra manualmente a sessão `/discover_spec`
- `/plan_spec` -> inicia sessão interativa para criar e refinar uma spec em linguagem natural
- `/plan_spec_status` -> mostra diagnóstico detalhado da sessão `/plan_spec`
- `/plan_spec_cancel` -> encerra manualmente a sessão `/plan_spec`
- `/status` -> mostra estado atual
- `/pause` -> pausa processamento
- `/resume` -> retoma processamento
- `/projects` -> lista o catálogo de projetos com paginação, marca o projeto ativo e sinaliza itens pendentes de `prepare`
- `/select_project <nome>` -> seleciona projeto ativo por nome (fallback textual)
- `/select-project <nome>` -> alias legado compatível para `/select_project`
- `/models` -> lista os modelos disponíveis no catalogo local do Codex para o projeto ativo e permite trocar o modelo atual
- `/reasoning` -> lista os niveis de reasoning suportados pelo modelo atual do projeto ativo e permite trocar o effort
- `/speed` -> escolhe a velocidade do Codex no projeto ativo entre `standard` e `fast`

Modelo, reasoning e velocidade são preferencias por projeto. O runner persiste a escolha em `.codex-flow-runner/codex-project-preferences.json` dentro de `PROJECTS_ROOT_PATH`, não altera `~/.codex/config.toml`, aplica a mudança no próximo turno de `/codex_chat` e `/plan_spec`, e congela um snapshot por slot durante `/run_all`, `/run_specs` e execução unitária de ticket.

O fluxo principal também persiste trilhas locais em `.codex-flow-runner/flow-traces/` com `request`, `response` e `decision` por etapa de ticket/spec. Essas trilhas ficam fora do versionamento do projeto e servem para auditoria e melhoria continua dos prompts.

As listas de `/models` e `/reasoning` são lidas dinamicamente do catalogo local do Codex em `~/.codex/models_cache.json`. Se esse catalogo estiver ausente, invalido ou ilegivel, o bot responde com erro observavel em vez de usar fallback hardcoded.

`/speed` usa a configuração oficial de fast mode do Codex CLI. O bot oferece `standard` e `fast`, persiste a escolha por projeto e injeta overrides por turno com `-c features.fast_mode=...`; quando `fast` estiver ativo, também envia `-c service_tier="fast"`. No baseline atual, `fast` fica disponível apenas quando o modelo do projeto suporta Fast mode.

### Confiabilidade do resumo final por ticket

- o envio de `sendTicketFinalSummary` usa retry bounded com `maxAttempts: 4`;
- falhas retentaveis: `429`, `5xx`, `ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, `ENETUNREACH`;
- backoff exponencial bounded: `1s`, `2s`, `4s`, com teto de `10s`; em `429`, `retry_after` do Telegram tem prioridade, também limitado ao teto;
- o estado do runner preserva `lastNotifiedEvent` apenas para entrega confirmada e registra falha definitiva separadamente em `lastNotificationFailure`;
- o `/status` exibe ambos os blocos: ultimo evento entregue e ultima falha definitiva de notificacao.

### Camada central para novas mensagens Telegram

Novas mensagens enviadas ao chat via `sendMessage(...)` devem passar por `TelegramDeliveryService`, em [`src/integrations/telegram-delivery.ts`](src/integrations/telegram-delivery.ts). O chamador continua dono do conteúdo da mensagem, mas precisa escolher explicitamente uma política de entrega canônica antes de enviar.

Em termos práticos:

- novos fluxos não devem chamar `bot.telegram.sendMessage(...)` diretamente;
- o ponto de integração canônico fica em `TelegramController`, que injeta o adaptador de transporte no `TelegramDeliveryService`;
- a política de entrega deve ser escolhida de acordo com o tipo de mensagem, como `TICKET_FINAL_SUMMARY_DELIVERY_POLICY`, `RUN_FLOW_SUMMARY_DELIVERY_POLICY`, `RUN_SPECS_TRIAGE_MILESTONE_DELIVERY_POLICY`, `INTERACTIVE_TELEGRAM_DELIVERY_POLICY`, `CALLBACK_CHAT_DELIVERY_POLICY` ou `TICKET_OPEN_CONTENT_DELIVERY_POLICY`;
- se uma exceção legítima ao uso da camada central surgir, ela deve ser documentada no mesmo changeset e adicionada ao allowlist do guardrail automatizado;
- esta regra canônica fica no `README.md`, não deve ser duplicada no `AGENTS.md`.

Escopo inicial desta arquitetura:

- a obrigatoriedade atual cobre superfícies baseadas em `sendMessage(...)`;
- `answerCbQuery(...)` e `editMessageText(...)` continuam fora do núcleo nesta primeira evolução, desde que esse limite permaneça explícito e não seja confundido com permissão para novos `sendMessage(...)` brutos.

### Modos de acesso (`TELEGRAM_ALLOWED_CHAT_ID`)

- `TELEGRAM_ALLOWED_CHAT_ID` e obrigatorio no bootstrap;
- somente o chat com `chat.id` igual ao valor configurado pode executar comandos do bot;
- tentativas de chat não autorizado são bloqueadas e registradas em log com `chatId`, `eventType` e `command`.

## Execução continua com systemd no WSL

Depois que `npm run dev` estiver funcionando, você pode configurar execução continua via `systemd`.

Pre-requisito do WSL:

```ini
# /etc/wsl.conf
[boot]
systemd=true
```

Depois aplique com `wsl --shutdown` no Windows e reabra a distro.

Passo a passo da service:

1. copie e ajuste a unit de exemplo `docs/systemd/codex-flow-runner.service`:
   - `User=...`
   - `WorkingDirectory=...`
   - `EnvironmentFile=...`
   - `Environment=PATH=...` (deve incluir os diretórios de `node`, `npm` e `codex`)
2. instale a unit:

```bash
sudo cp docs/systemd/codex-flow-runner.service /etc/systemd/system/codex-flow-runner.service
```

3. recarregue e habilite no boot:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now codex-flow-runner
```

4. verifique:

```bash
systemctl status codex-flow-runner
journalctl -u codex-flow-runner -f
```

Notas operacionais:

- execute `codex login` no mesmo usuário configurado na unit antes de subir o servico;
- se o `codex` estiver fora do PATH padrão do `systemd`, adicione explicitamente o diretório na linha `Environment=PATH=...`;
- mantenha `TimeoutStopSec` maior que `SHUTDOWN_DRAIN_TIMEOUT_MS` (recomendado: margem de pelo menos 10s) para evitar corte prematuro durante o drain;
- para depuracao da sessão `/plan_spec`, você pode habilitar `CODEX_INTERACTIVE_VERBOSE_LOGS=1` para logs detalhados dos turnos `codex exec/resume --json`.

## Documentação operacional

Este repositório possui os seguintes documentos canônicos para evolução operacional:

- `EXTERNAL_PROMPTS.md`: padrão para requests, responses e decisions de IA externa
- `INTERNAL_TICKETS.md`: ciclo oficial de abertura, triagem e fechamento de tickets internos
- `PLANS.md`: padrão de ExecPlan para criação de planos em `execplans/`
- `SPECS.md`: padrão de especificações funcionais e jornadas em `docs/specs/`, com status vivo de atendimento
- `docs/checkups/checkup-nao-funcional.md`: rito operacional do check-up não funcional
- `docs/checkups/history/`: registros versionados de revisão periódica

Estruturas associadas:

- `external_prompts/requests/`
- `external_prompts/responses/`
- `external_prompts/decisions/`
- `external_prompts/templates/`
- `tickets/templates/internal-ticket-template.md`
- `docs/specs/templates/spec-template.md`
