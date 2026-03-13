# codex-flow-runner

Runner de tickets com **Node.js + TypeScript** para executar um fluxo **sequencial**.

Em termos simples: este projeto liga **Telegram + Codex CLI + Git** para automatizar pequenas entregas em um ou mais repositorios.

## O que este projeto faz, em linguagem simples

Pense nele como um "operador automatizado" que trabalha assim:

1. voce coloca um ticket em uma pasta chamada `tickets/open/`;
2. o runner le esse ticket;
3. ele chama o **Codex CLI** para planejar e implementar a mudanca;
4. se der certo, ele move o ticket para `tickets/closed/`;
5. ele faz `git commit` e `git push`;
6. ele avisa o resultado pelo Telegram.

Ou seja: em vez de voce abrir o projeto, ler o ticket, pedir ajuda ao Codex, editar arquivos, commitar e acompanhar tudo manualmente, este runner tenta fazer esse fluxo de ponta a ponta.

Mas o projeto nao para nos tickets.

Ele tambem consegue trabalhar a partir de **especificacoes (specs)**. Na pratica, isso significa que uma pessoa pode descrever em linguagem simples o que quer construir, o runner ajuda a transformar isso em uma spec em Markdown, e depois essa spec pode entrar no fluxo automatizado de implementacao.

Isso e importante porque abre um caminho mais acessivel para pessoas sem familiaridade com desenvolvimento de software: em vez de pensar primeiro em arquivos, funcoes e arquitetura, a pessoa pode comecar dizendo simplesmente o que o software deve fazer.

## O que voce controla pelo Telegram

Depois de configurar o bot, o Telegram vira um painel de controle simples:

- voce pode ver o status do runner;
- pode escolher em qual projeto ele vai trabalhar;
- pode listar tickets abertos;
- pode criar e refinar uma spec em linguagem natural;
- pode mandar uma spec entrar no fluxo automatizado;
- pode mandar rodar a proxima tarefa da fila;
- pode receber mensagens com resumo do que aconteceu.

## Conceitos importantes

Antes de instalar, vale entender 3 ideias:

- **runner**: e o programa principal deste repositorio; e ele quem fica rodando e ouvindo comandos do Telegram;
- **ticket**: e um arquivo `.md` descrevendo uma tarefa;
- **projeto ativo**: e o repositorio em que o runner vai trabalhar naquele momento.

E vale acrescentar uma quarta ideia:

- **spec**: e uma especificacao do que o sistema deve fazer, escrita em Markdown. Ela pode ser funcional (o que o software deve fazer) ou nao funcional (qualidade, operacao, seguranca, desempenho, observabilidade etc.).

Isso significa que o runner pode estar rodando dentro do repositorio `codex-flow-runner`, mas o codigo que ele vai modificar pode estar em **outro projeto**, desde que esse outro projeto esteja dentro de `PROJECTS_ROOT_PATH`.

## Duas formas de usar o runner

Hoje, existe um jeito bem simples de pensar no projeto:

### Caminho 1: voce ja sabe qual ticket quer executar

Fluxo:

1. criar um ticket em `tickets/open/`;
2. usar `/run_all`;
3. o runner implementa o ticket e segue o fluxo normal.

### Caminho 2: voce ainda nao tem ticket, mas sabe o que quer construir

Fluxo:

1. usar `/plan_spec` no Telegram;
2. descrever em linguagem simples o que voce quer;
3. responder as perguntas de refinamento que o fluxo fizer;
4. mandar criar a spec;
5. usar `/run_specs <arquivo>` ou selecionar a spec por `/specs`;
6. o runner faz a triagem da spec, cria tickets ou execplans quando necessario e, em sucesso, encadeia a rodada de implementacao.

Esse segundo caminho e o mais interessante para pessoas nao tecnicas, porque elas podem comecar pelo comportamento desejado do sistema, sem precisar escrever tarefas tecnicas logo de cara.

## Fluxo de especificacao em linguagem natural

Em termos simples, o fluxo de spec funciona assim:

1. voce envia `/plan_spec` no Telegram;
2. o bot inicia uma conversa guiada;
3. voce descreve em portugues simples o que quer, por exemplo:
   - "Quero um bot que responda bom dia e mostre a hora atual."
   - "Quero uma pequena aplicacao que cadastre clientes e gere um CSV."
   - "Quero melhorar a observabilidade do sistema e ter logs mais claros."
4. o fluxo pode fazer perguntas para refinar a ideia;
5. ao final, voce escolhe a acao de **criar a spec**;
6. o runner cria um arquivo em `docs/specs/` no projeto ativo;
7. essa spec nasce com metadata que a deixa elegivel para a proxima etapa automatizada;
8. depois voce pode usar `/specs` e `/run_specs <arquivo>` para transformar a spec em trabalho executavel.

Na implementacao atual, a spec criada pelo fluxo sai com:

- `Status: approved`
- `Spec treatment: pending`

Por isso ela fica pronta para entrar no fluxo de triagem automatica.

## Como uma spec vira implementacao

Depois que a spec existe no projeto, o caminho fica assim:

1. `/specs` lista as specs elegiveis do projeto ativo;
2. `/run_specs <arquivo>` executa a triagem da spec;
3. essa triagem pode abrir tickets em `tickets/open/` e/ou gerar execplans;
4. quando a triagem conclui com sucesso, o fluxo encadeia a rodada de tickets;
5. a partir dai o comportamento segue a mesma logica do `/run_all`.

Em outras palavras:

- `/plan_spec` ajuda a transformar uma ideia em spec;
- `/run_specs` ajuda a transformar a spec em backlog executavel;
- `/run_all` executa os tickets desse backlog.

Isso significa que, em muitos casos, uma pessoa pode sair de um pedido em linguagem natural para uma implementacao real passando por um fluxo guiado.

## Resumo do fluxo real

1. detectar o proximo ticket em `tickets/open/` por `Priority` (`P0 -> P1 -> P2`; empate com fallback por nome de arquivo);
2. gerar ou atualizar ExecPlan em `execplans/`;
3. fechar o ticket movendo para `tickets/closed/`;
4. executar commit e push git no mesmo ciclo;
5. expor status e controle por Telegram.

## O papel da pasta `prompts/`

Uma parte essencial desta automacao esta na pasta `prompts/`.

Em termos simples: os arquivos dessa pasta sao os "roteiros de trabalho" que o runner entrega ao Codex em cada etapa. Eles dizem ao agente o que ele deve fazer, quais regras do repositorio precisa seguir e qual saida e esperada.

Isso e importante porque o runner nao chama o Codex de forma solta ou improvisada. Em vez disso, ele escolhe um prompt especifico para a etapa atual, injeta o contexto real do trabalho e executa aquela fase com um objetivo bem definido.

Exemplos de etapas:

- `prompts/01-avaliar-spec-e-gerar-tickets.md`: analisar uma spec e abrir tickets quando houver gaps;
- `prompts/02-criar-execplan-para-ticket.md`: transformar um ticket em plano de execucao;
- `prompts/03-executar-execplan-atual.md`: implementar o plano no repositorio alvo;
- `prompts/04-encerrar-ticket-commit-push.md`: fechar ticket, versionar e publicar;
- `prompts/05-07`: concluir tratamento de spec e materializar specs criadas via `/plan_spec`.

Na pratica, a automacao funciona como uma esteira:

1. o runner identifica a etapa atual;
2. carrega o arquivo correto em `prompts/`;
3. adiciona detalhes concretos, como caminho do ticket, caminho da spec, execplan esperado e commit esperado;
4. envia esse prompt montado para o Codex CLI;
5. valida o resultado e segue para a proxima etapa sequencial.

Por que isso ajuda tanto:

- deixa o comportamento mais repetivel e menos dependente de improviso;
- reduz ambiguidade sobre o que o Codex deve fazer em cada fase;
- facilita evoluir o processo sem reescrever o runner inteiro;
- permite auditar e melhorar a automacao mexendo no roteiro certo.

Uma forma didatica de pensar nisso:

- `tickets/` e `docs/specs/` dizem **o que** precisa ser feito;
- `prompts/` diz **como o Codex deve conduzir cada etapa do processo**;
- o runner faz a orquestracao entre essas pecas.

Por isso, mudar um arquivo em `prompts/` pode alterar o comportamento de todas as futuras execucoes daquela etapa. Essas mudancas devem ser feitas com cuidado, porque sao parte central da logica operacional do projeto.

## Status atual

O projeto executa o ciclo sequencial por ticket com chamadas reais ao Codex CLI (`plan -> implement -> close-and-version`), mantendo controle operacional por Telegram.

## Licenca

Este projeto esta licenciado sob a **The Unlicense**.

Na pratica, isso significa uso o mais livre possivel: qualquer pessoa pode copiar, modificar, distribuir, vender e reutilizar este projeto para qualquer finalidade.

## Dependencia obrigatoria do Codex CLI

Este projeto **depende diretamente do Codex CLI** instalado no ambiente local.

Em outras palavras:

- instalar so Node.js, npm e as dependencias do repositorio **nao e suficiente**;
- instalar so a extensao do Codex no VS Code **nao e suficiente**;
- o runner precisa encontrar o comando `codex` no PATH do mesmo usuario Linux que executa `npm run dev`, `npm start` ou o servico `systemd`.

Sem isso, o projeto nao consegue executar as etapas reais de planejamento, implementacao e fechamento de tickets.

## Guia recomendado para Windows

Se voce vai fazer um fork deste projeto e instalar em uma maquina Windows, o caminho recomendado e:

1. usar **WSL** com Ubuntu;
2. instalar **Node.js e npm dentro do WSL**, nao no PowerShell;
3. clonar o repositorio em uma pasta Linux como `/home/SEU_USUARIO/projetos`, e nao em `/mnt/c/...`;
4. abrir o projeto no **VS Code** usando WSL;
5. rodar o app pelo terminal do WSL com `npm run dev`.

Este README foi escrito com esse fluxo em mente.

Se a maquina for Linux nativo, voce pode seguir praticamente os mesmos comandos Linux deste guia e simplesmente pular as etapas especificas de instalacao do WSL.

## Antes de comecar

Para seguir este guia com menos atrito, tenha em maos:

- uma conta no GitHub;
- uma conta OpenAI/ChatGPT com acesso ao Codex;
- o app do Telegram instalado no celular ou desktop;
- permissao para instalar o WSL no Windows;
- um fork deste repositorio criado na sua conta.

## Caminho mais curto para a primeira execucao

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

## Checklist rapido de sucesso

Ao final da instalacao, voce deve conseguir fazer estas 6 verificacoes:

1. abrir o projeto dentro do WSL em um caminho como `/home/SEU_USUARIO/projetos/codex-flow-runner`;
2. rodar `node -v` e ver `v20` ou superior;
3. rodar `which codex` e `codex --version` sem erro;
4. rodar `npm install` e `npm run check` sem erro;
5. subir o runner com `npm run dev`;
6. receber resposta do bot no Telegram para `/status`.

Se voce travar em algum ponto, volte para a ultima verificacao que funcionou. Isso costuma mostrar exatamente qual etapa faltou.

## O que e WSL e como usar

WSL significa **Windows Subsystem for Linux**. Na pratica, ele permite rodar um Linux real dentro do Windows. Para este projeto, isso facilita:

- uso do Node.js e npm em um ambiente mais estavel para automacao;
- execucao do `codex` CLI no mesmo ambiente onde o projeto esta;
- uso futuro de `systemd` no WSL para deixar o runner ligado continuamente.

Regra simples para evitar confusao:

- comandos com `wsl --...` sao executados no **Windows** (PowerShell);
- comandos como `npm install`, `npm run dev`, `git clone` e `codex login` sao executados **dentro do Ubuntu/WSL**.

Para abrir o WSL depois de instalar:

- abra o app **Ubuntu** no menu Iniciar; ou
- abra o **Windows Terminal** e escolha o perfil Ubuntu.

Se esta for a sua primeira vez com WSL, uma forma simples de pensar nele e:

- o Windows continua sendo seu sistema principal;
- o Ubuntu dentro do WSL vira o lugar onde voce instala Node, npm, git e Codex CLI;
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
3. crie seu usuario Linux e senha quando o assistente pedir.

Se o WSL ja estiver instalado, voce pode seguir adiante.

## 2) Instale ferramentas basicas dentro do Ubuntu

Todos os comandos abaixo devem ser executados **no terminal do Ubuntu/WSL**:

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

Verificacao rapida:

- `git --version` deve responder com uma versao valida;
- `curl --version` deve responder normalmente.

## 3) Instale Node.js 20+ e npm dentro do WSL

Este projeto exige **Node.js 20 ou superior**. O jeito mais pratico para iniciantes no WSL e usar `nvm`.

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

Verificacao rapida:

- `node -v` deve mostrar `v20.x.x` ou superior;
- `npm -v` deve responder normalmente.

Observacao:

- o `npm` vem junto com o Node.js, entao nao precisa instalar separadamente;
- se voce instalar Node no Windows, isso **nao substitui** a instalacao dentro do WSL.

## 4) Faca o fork e clone o repositorio

No GitHub:

1. abra este repositorio;
2. clique em **Fork**;
3. crie o fork na sua conta.

Depois, no Ubuntu/WSL:

```bash
mkdir -p ~/projetos
cd ~/projetos
git clone https://github.com/SEU_USUARIO/codex-flow-runner.git
cd codex-flow-runner
```

Se ainda nao configurou seu Git no WSL:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "voce@example.com"
```

Importante:

- mantenha o projeto em uma pasta Linux como `~/projetos/codex-flow-runner`;
- evite clonar em `/mnt/c/Users/...`, porque esse fluxo costuma ser mais lento e gerar mais problemas de permissao;
- o runner faz commit e push automaticamente no ciclo de fechamento, entao seu `git push` no WSL precisa estar autenticado antes de usar `/run_all`.

Verificacao rapida:

- `git remote -v` deve mostrar a URL do seu fork;
- `git status` deve abrir normalmente dentro do repositorio clonado.

## 5) Abra no VS Code

No Windows, instale:

- **Visual Studio Code**
- extensao **WSL** do VS Code
- extensao **OpenAI Codex**

Depois, a partir do terminal do WSL dentro da pasta do projeto:

```bash
code .
```

Isso abre o projeto no VS Code conectado ao Linux do WSL. E o jeito mais simples de editar, rodar terminal e usar a extensao do Codex no mesmo ambiente.

Importante:

- a extensao do Codex no VS Code ajuda no uso do Codex dentro da IDE;
- mesmo assim, este projeto continua precisando do **Codex CLI instalado no WSL**, porque o runner usa o comando `codex` no terminal.

Se `code .` nao funcionar:

1. abra o VS Code no Windows;
2. instale ou confirme a extensao **WSL** do VS Code;
3. use o comando **WSL: Open Folder in WSL** na paleta de comandos;
4. abra a pasta `/home/SEU_USUARIO/projetos/codex-flow-runner`.

## 6) Instale as dependencias do projeto

Na raiz do projeto:

```bash
npm install
npm run check
```

Se `npm run check` terminar sem erro, o projeto esta com dependencias e TypeScript prontos para a primeira execucao.

Importante:

- `npm run check` valida TypeScript e imports do projeto, mas nao confirma login no Codex, token do Telegram ou permissao de `git push`;
- por isso, a validacao real da instalacao continua sendo subir o runner e testar `/status`.

Dica para iniciantes:

- rode `npm install` sem `sudo`.

## 7) Instale e autentique o Codex CLI

### Conta OpenAI e planos compativeis

Para usar o Codex CLI com login por assinatura, voce precisa de uma **conta OpenAI/ChatGPT com acesso ao Codex**.

Os planos da OpenAI podem mudar com o tempo. Entao, em vez de fixar uma informacao eterna neste README, aqui vai o criterio seguro:

- consulte sempre os links oficiais abaixo antes de configurar uma maquina nova;
- na revisao deste README em **2026-03-13**, a documentacao oficial da OpenAI informava que o Codex estava incluido em **ChatGPT Plus, Pro, Business, Edu e Enterprise**;
- a mesma documentacao tambem dizia que, **por tempo limitado**, o Codex estava incluido em **ChatGPT Free e Go**.

Links oficiais de referencia:

- [Codex quickstart](https://developers.openai.com/codex/quickstart)
- [Codex overview](https://developers.openai.com/codex/)
- [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan)
- [Codex authentication](https://developers.openai.com/codex/auth)
- [Codex on Windows and WSL](https://developers.openai.com/codex/windows)

Observacoes importantes:

- a CLI e a extensao IDE aceitam login com **ChatGPT** ou com **API key**;
- para um iniciante rodando este projeto localmente, o caminho mais simples costuma ser **entrar com a conta ChatGPT**;
- se voce usa login por email e senha na OpenAI, a documentacao oficial de autenticacao indica habilitar **MFA** para acessar o Codex.

### Instalacao local do Codex CLI

Este projeto depende do `codex` no PATH do mesmo usuario Linux que vai executar o app.

Instale:

```bash
npm i -g @openai/codex
which codex
codex --version
```

Se `which codex` mostrar um caminho e `codex --version` responder com uma versao, a instalacao local do binario deu certo.

### Login no Codex CLI

Depois autentique:

```bash
codex login
```

O fluxo esperado e:

1. o terminal abre o navegador;
2. voce entra com sua conta OpenAI/ChatGPT;
3. a autenticacao retorna para o terminal;
4. o Codex passa a funcionar naquele usuario Linux.

Se o login por navegador nao funcionar no seu ambiente, a documentacao oficial tambem lista este fallback:

```bash
codex login --device-auth
```

Se voce ja usou o Codex CLI no passado via API key e agora quer migrar para o acesso baseado em assinatura, a central de ajuda da OpenAI recomenda atualizar a CLI e depois fazer:

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

- `which codex` aponta para um executavel real;
- `codex --version` responde normalmente;
- `codex` abre a interface interativa sem erro de autenticacao;
- ao fechar e abrir de novo, ele nao pede login imediatamente toda vez.

Validacao complementar:

- em alguns ambientes, o login fica em cache local e pode aparecer em `~/.codex/auth.json`;
- em outros, o Codex usa o cofre de credenciais do sistema operacional;
- por isso, a verificacao mais confiavel continua sendo `codex` abrir normalmente e aceitar um prompt.

Observacoes:

- faca o login no mesmo usuario Linux que vai rodar `npm run dev` ou o servico `systemd`;
- sem sessao valida no `codex`, o comando `/run_all` falha cedo com instrucao para autenticacao.

### Confiar no projeto e preparar um modo realmente automatico

Depois do `codex login`, vale fazer um teste manual simples dentro do repositorio que o Codex vai editar.

No proprio `codex-flow-runner`:

```bash
cd ~/projetos/codex-flow-runner
codex
```

Quando o Codex perguntar se deve confiar na pasta, aceite. Depois pode sair da interface.

Por que isso ajuda:

- a documentacao oficial informa que o Codex so carrega configuracao por projeto em `.codex/config.toml` quando o projeto e confiavel;
- isso evita confusoes futuras se voce passar a usar configuracoes locais por repositorio;
- na pratica, ao marcar um projeto como confiavel, o Codex registra essa confianca no arquivo `~/.codex/config.toml`.

Se voce quiser verificar ou ajustar isso manualmente, o formato esperado e este:

```toml
[projects."/home/SEU_USUARIO/projetos/codex-flow-runner"]
trust_level = "trusted"
```

Para outros repositorios que o runner vai gerenciar, a ideia e a mesma: entre na pasta uma vez, rode `codex`, aceite a confianca e so depois use o fluxo automatizado naquele projeto.

### Opcional: deixar suas sessoes manuais do Codex sem perguntas e com full access

Pausa rapida de seguranca: isso deixa o Codex muito mais autonomo e tambem mais perigoso. So faz sentido em uma maquina que voce controla e em repositorios nos quais voce realmente quer delegar edicao e execucao de comandos sem confirmacoes.

Este projeto depende justamente desse estilo de execucao para automatizar planejamento, implementacao e fechamento sem ficar esperando confirmacoes humanas a cada comando. Nas etapas nao interativas, o runner usa chamadas equivalentes a `codex exec -a never -s danger-full-access ...`. Ainda assim, se voce quiser que suas sessoes manuais no terminal sigam a mesma ideia, o caminho mais seguro e criar um **profile** em `~/.codex/config.toml`:

```toml
[profiles.runner_full_access]
approval_policy = "never"
sandbox_mode = "danger-full-access"
```

Depois, quando quiser abrir o Codex nesse modo:

```bash
codex --profile runner_full_access
```

Se voce preferir um comando explicito, sem depender de profile:

```bash
codex -a never -s danger-full-access
```

E para uso nao interativo:

```bash
codex exec -a never -s danger-full-access "<sua tarefa>"
```

Se voce realmente quiser que esse seja o comportamento padrao de todas as suas sessoes locais do Codex, pode usar os defaults globais abaixo em `~/.codex/config.toml`:

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

Esse token sera o valor de `TELEGRAM_BOT_TOKEN`.

### Descobrir o chat ID autorizado

Para a primeira configuracao, o jeito mais simples costuma ser usar um bot que mostra seu ID diretamente.

Opcao recomendada para bootstrap:

1. abra [`@my_id_bot`](https://t.me/my_id_bot);
2. clique em **Start**;
3. copie o numero informado pelo bot como seu Telegram ID;
4. use esse numero como `TELEGRAM_ALLOWED_CHAT_ID`.

Se voce for autorizar um grupo:

1. adicione o `@my_id_bot` ao grupo;
2. envie uma mensagem no grupo;
3. copie o ID informado pelo bot;
4. se o numero vier negativo, mantenha o sinal `-` no `.env`.

Observacoes:

- esse caminho depende de um bot de terceiros; ele e o mais pratico para bootstrap, mas nao e um recurso oficial do Telegram;
- se o `@my_id_bot` estiver indisponivel, uma alternativa comum e [`@RawDataBot`](https://t.me/RawDataBot);
- se voce preferir nao depender de terceiros, use o fallback oficial abaixo com a API do Telegram.

#### Fallback oficial via API (`getUpdates`)

O fallback mais confiavel e usar uma **conversa privada** com o bot que voce criou no `@BotFather`.

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
- se voce for usar um grupo, o `chat.id` pode ser negativo; mantenha o sinal `-` no `.env`.

## 9) Crie o arquivo .env

Este repositorio ja traz um arquivo modelo. Na raiz do projeto, copie:

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
```

Explicacao rapida:

- `TELEGRAM_BOT_TOKEN`: token criado pelo `@BotFather`;
- `TELEGRAM_ALLOWED_CHAT_ID`: chat autorizado a controlar o bot;
- `PROJECTS_ROOT_PATH`: pasta-pai onde ficam os projetos que o runner pode gerenciar.

Para um fork em:

```txt
/home/SEU_USUARIO/projetos/codex-flow-runner
```

o valor correto normalmente sera:

```dotenv
PROJECTS_ROOT_PATH=/home/SEU_USUARIO/projetos
```

Importante:

- `PROJECTS_ROOT_PATH` deve apontar para a **pasta-pai**, nao para a pasta do repositorio;
- o app carrega automaticamente o `.env` da raiz ao iniciar;
- para `npm run dev` e `npm start`, voce **nao** precisa rodar `source .env`.
- nao commite seu `.env`; ele deve ficar apenas na sua maquina.
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
4. quando quiser iniciar a rodada sequencial, envie `/run_all`.

Observacoes:

- mantenha o terminal aberto enquanto o runner estiver em execucao;
- `npm run dev` nao faz hot-reload;
- se quiser recarregamento automatico em desenvolvimento, use `npm run dev:watch`.
- para parar o runner manualmente, use `Ctrl+C` no terminal.

## Erros mais comuns na primeira instalacao

- `which codex` nao encontra nada: o Codex CLI provavelmente foi instalado no Windows ou em outro usuario. Instale e faca login dentro do mesmo Ubuntu/WSL que executa `npm run dev`.
- `npm run dev` reclama de configuracao invalida: quase sempre o problema esta no `.env`, principalmente em `PROJECTS_ROOT_PATH` apontando para a pasta do repositorio em vez da pasta-pai.
- o bot nao responde a `/status`: confirme se voce enviou `/start` para o bot, se `TELEGRAM_BOT_TOKEN` esta correto e se `TELEGRAM_ALLOWED_CHAT_ID` bate exatamente com o chat autorizado.
- `/run_all` falha na hora do push: o Git do WSL ainda nao esta autenticado para empurrar para o seu fork ou para o repositorio alvo.
- um projeto nao aparece em `/projects`: ele precisa estar no primeiro nivel de `PROJECTS_ROOT_PATH` e conter pelo menos `.git` e `tickets/open/`.

## Exemplo pratico: criar um segundo projeto "Hello World"

Esta e a melhor forma de entender o que o runner faz na pratica.

Neste exemplo, voce vai:

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

No WSL:

```bash
cd ~/projetos
mkdir -p hello-world-runner-demo/tickets/open
mkdir -p hello-world-runner-demo/tickets/closed
mkdir -p hello-world-runner-demo/execplans
cd hello-world-runner-demo
git init -b main
```

Crie tambem um `README.md` simples no projeto novo. Se preferir, faca isso pelo VS Code.

Antes de seguir, faca o bootstrap de confianca do Codex nesse repositorio novo:

```bash
cd ~/projetos/hello-world-runner-demo
codex
```

Se aparecer o prompt de confianca da pasta, aceite. Depois saia do Codex. Esse passo e razoavel porque ajuda o CLI a registrar o projeto como confiavel e reduz a chance de atrito futuro quando voce testar o Codex manualmente nesse repositorio ou passar a usar `.codex/config.toml` local.

Conteudo sugerido:

```md
# hello-world-runner-demo

Projeto de teste para validar o codex-flow-runner.
```

### 2) Configure um remoto git para esse projeto

Isto e importante porque o runner faz **commit e push obrigatorios** no fechamento do ticket.

Entao, para um teste completo, crie um repositorio vazio no GitHub chamado, por exemplo, `hello-world-runner-demo`, e depois rode no WSL:

```bash
git remote add origin https://github.com/SEU_USUARIO/hello-world-runner-demo.git
git add .
git commit -m "chore: bootstrap hello world demo"
git push -u origin main
```

Se voce pular essa parte, o projeto pode ate ser descoberto pelo runner, mas a rodada completa pode falhar na etapa de `push`.

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

Conteudo sugerido:

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

Para este primeiro teste, esse ticket simples ja costuma ser suficiente.

### 4) Inicie o runner no projeto principal

Volte para o repositorio `codex-flow-runner` e suba o bot:

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

Nesse ponto, voce deve conseguir ver que o novo projeto foi descoberto e que o ticket esta na fila.

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
- fazer commit e push no repositorio `hello-world-runner-demo`;
- mandar um resumo no Telegram.

### 7) Veja o resultado no novo projeto

No WSL ou no VS Code, abra:

```txt
/home/SEU_USUARIO/projetos/hello-world-runner-demo
```

Voce deve encontrar algo proximo disso:

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

### 8) Se o projeto novo nao aparecer no Telegram

Confira estes pontos:

- ele precisa estar dentro de `PROJECTS_ROOT_PATH`;
- ele precisa ter um diretorio `.git`;
- ele precisa ter `tickets/open/`;
- o nome do projeto deve aparecer em `/projects`;
- o runner precisa estar em execucao no `codex-flow-runner`.

## Exemplo pratico: criar um projeto a partir de uma spec

Se a ideia for mostrar o potencial do projeto para alguem nao tecnico, este costuma ser o exemplo mais interessante.

Imagine que, no projeto `hello-world-runner-demo`, a pessoa ainda nao tem tickets prontos, mas sabe o resultado que quer.

No Telegram, ela pode comecar assim:

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
- gerar execplans quando o escopo ja estiver claro;
- encadear a rodada de execucao desses tickets.

Isso mostra uma ideia importante deste repositorio:

- uma pessoa tecnica pode usar tickets direto;
- uma pessoa menos tecnica pode comecar por uma descricao em linguagem natural;
- a spec vira a ponte entre a ideia e a implementacao.

## Estrutura do projeto

Arquitetura principal:

```txt
src/
├── config/
├── core/
├── integrations/
└── types/
```

Pastas importantes na raiz deste repositorio:

- `prompts/`: roteiros operacionais usados pelo runner para instruir o Codex em cada etapa automatizada;
- `tickets/`: backlog interno do proprio `codex-flow-runner`;
- `docs/specs/`: specs funcionais e operacionais usadas como base para evolucao;
- `execplans/`: planos de execucao gerados durante o fluxo.

Pastas esperadas em cada repositorio gerenciado pelo runner:

- `tickets/open/`
- `tickets/closed/`
- `execplans/`

Neste fork, essas pastas ja existem. Se voce quiser que o runner gerencie outros projetos alem deste, cada um deles deve ter pelo menos:

- um repositorio git local (`.git`);
- `tickets/open/`.

## Como o runner escolhe em qual projeto trabalhar

Regras de descoberta:

- o runner descobre projetos elegiveis no primeiro nivel de `PROJECTS_ROOT_PATH`;
- projeto elegivel = diretorio que possui `.git` e `tickets/open/`;
- o projeto ativo global e restaurado de `PROJECTS_ROOT_PATH/.codex-flow-runner/active-project.json` quando valido;
- se o estado persistido estiver ausente, invalido ou desatualizado, o bootstrap usa fallback para o primeiro projeto elegivel em ordem alfabetica e persiste a nova selecao;
- nao existe fallback de compatibilidade para `REPO_PATH`.

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

Obrigatorias:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `PROJECTS_ROOT_PATH`

Opcionais:

- `POLL_INTERVAL_MS` (padrao: `5000`)
- `RUN_ALL_MAX_TICKETS_PER_ROUND` (padrao: `20`)
- `SHUTDOWN_DRAIN_TIMEOUT_MS` (padrao: `30000`)
- `PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM` (padrao: `false`)

Observacoes operacionais:

- o ciclo de fechamento e versionamento exige commit + push por ticket;
- a etapa `close-and-version` prepara o estado final do ticket; o commit e push correspondentes sao executados pelo runner apos essa etapa;
- cada comando `/run_all` processa no maximo `RUN_ALL_MAX_TICKETS_PER_ROUND` tickets por rodada;
- ao receber `SIGINT` ou `SIGTERM`, o runner entra em shutdown gracioso e aguarda drain bounded de operacoes em voo por ate `SHUTDOWN_DRAIN_TIMEOUT_MS`;
- indisponibilidade de validacao manual externa ao agente (ex.: Telegram real indisponivel) nao deve, sozinha, forcar `NO_GO`; nesse caso, o fechamento pode ser `GO` com anotacao explicita de validacao manual pendente;
- para uma mesma cadeia de `NO_GO` (`Closure reason: split-follow-up` + `Parent ticket`), o runner aceita no maximo 3 recuperacoes; ao exceder esse limite, a rodada para em erro e a tarefa permanece nao finalizada no backlog.

## Pre-requisitos operacionais

- `codex` instalado e disponivel no PATH (ex.: `npm i -g @openai/codex`);
- `codex` autenticado no mesmo usuario do processo (`codex login`);
- autenticacao git configurada no WSL para permitir `git push`.

## Scripts

- `npm run dev` - execucao local sem auto-reload; recomendado para a primeira execucao
- `npm run dev:watch` - desenvolvimento com hot-reload
- `npm run build`
- `npm start`
- `npm run check`
- `npm test`

Fluxo recomendado para comecar:

```bash
npm install
npm run check
npm run dev
```

## Controle por Telegram

- `/start` -> mostra descricao do bot e comandos disponiveis
- `/run_all` -> inicia o loop sequencial de processamento de tickets
- `/run-all` -> alias legado compativel para `/run_all`
- `/tickets_open` -> lista os tickets abertos do projeto ativo
- `/specs` -> lista specs elegiveis (`Status: approved` + `Spec treatment: pending`) do projeto ativo
- `/run_specs <arquivo>` -> executa triagem da spec informada e, em sucesso, encadeia a rodada de tickets
- `/codex_chat` -> inicia conversa livre com Codex no projeto ativo
- `/codex-chat` -> alias legado compativel para `/codex_chat`
- `/plan_spec` -> inicia sessao interativa para criar e refinar uma spec em linguagem natural
- `/plan_spec_status` -> mostra diagnostico detalhado da sessao `/plan_spec`
- `/plan_spec_cancel` -> encerra manualmente a sessao `/plan_spec`
- `/status` -> mostra estado atual
- `/pause` -> pausa processamento
- `/resume` -> retoma processamento
- `/projects` -> lista projetos elegiveis com paginacao e marca o projeto ativo
- `/select_project <nome>` -> seleciona projeto ativo por nome (fallback textual)
- `/select-project <nome>` -> alias legado compativel para `/select_project`

### Confiabilidade do resumo final por ticket

- o envio de `sendTicketFinalSummary` usa retry bounded com `maxAttempts: 4`;
- falhas retentaveis: `429`, `5xx`, `ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, `ENETUNREACH`;
- backoff exponencial bounded: `1s`, `2s`, `4s`, com teto de `10s`; em `429`, `retry_after` do Telegram tem prioridade, tambem limitado ao teto;
- o estado do runner preserva `lastNotifiedEvent` apenas para entrega confirmada e registra falha definitiva separadamente em `lastNotificationFailure`;
- o `/status` exibe ambos os blocos: ultimo evento entregue e ultima falha definitiva de notificacao.

### Modos de acesso (`TELEGRAM_ALLOWED_CHAT_ID`)

- `TELEGRAM_ALLOWED_CHAT_ID` e obrigatorio no bootstrap;
- somente o chat com `chat.id` igual ao valor configurado pode executar comandos do bot;
- tentativas de chat nao autorizado sao bloqueadas e registradas em log com `chatId`, `eventType` e `command`.

## Execucao continua com systemd no WSL

Depois que `npm run dev` estiver funcionando, voce pode configurar execucao continua via `systemd`.

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
   - `Environment=PATH=...` (deve incluir os diretorios de `node`, `npm` e `codex`)
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

- execute `codex login` no mesmo usuario configurado na unit antes de subir o servico;
- se o `codex` estiver fora do PATH padrao do `systemd`, adicione explicitamente o diretorio na linha `Environment=PATH=...`;
- mantenha `TimeoutStopSec` maior que `SHUTDOWN_DRAIN_TIMEOUT_MS` (recomendado: margem de pelo menos 10s) para evitar corte prematuro durante o drain;
- para depuracao da sessao `/plan_spec`, voce pode habilitar `CODEX_INTERACTIVE_VERBOSE_LOGS=1` para logs detalhados dos turnos `codex exec/resume --json`.

## Documentacao operacional

Este repositorio possui os seguintes documentos canonicos para evolucao operacional:

- `EXTERNAL_PROMPTS.md`: padrao para requests, responses e decisions de IA externa
- `INTERNAL_TICKETS.md`: ciclo oficial de abertura, triagem e fechamento de tickets internos
- `PLANS.md`: padrao de ExecPlan para criacao de planos em `execplans/`
- `SPECS.md`: padrao de especificacoes funcionais e jornadas em `docs/specs/`, com status vivo de atendimento
- `docs/checkups/checkup-nao-funcional.md`: rito operacional do check-up nao funcional
- `docs/checkups/history/`: registros versionados de revisao periodica

Estruturas associadas:

- `external_prompts/requests/`
- `external_prompts/responses/`
- `external_prompts/decisions/`
- `external_prompts/templates/`
- `tickets/templates/internal-ticket-template.md`
- `docs/specs/templates/spec-template.md`
