# EXTERNAL_PROMPTS.md

## Objetivo
Padronizar prompts para IAs especialistas externas de forma autocontida, sem contexto interno irrelevante e com rastreabilidade de decisão.
Também padronizar ciclos de esclarecimento (follow-up) quando uma resposta salva ainda não for suficiente para decidir mudanças no projeto.

## Princípio central
A IA especialista externa não tem acesso ao nosso código.

Por isso, o texto enviado deve ser autoexplicativo e independente do repositório.

Em `external_prompts/requests/`, cada arquivo é o prompt final literal que será enviado para a IA externa. Se um trecho não melhora a qualidade da resposta externa, ele não deve estar no request.

## Fluxo oficial
1. Criar o request em `external_prompts/requests/<yyyy-mm-dd>-<slug>.md`.
2. Enviar o arquivo de request para a IA especialista externa.
3. Registrar a resposta em `external_prompts/responses/<yyyy-mm-dd>-<slug>.md`.
4. Se ainda houver ambiguidade, criar um request de follow-up em `external_prompts/requests/<yyyy-mm-dd>-<slug>-followup-<nn>.md`, referenciando explicitamente a resposta alvo em `responses/`.
5. Enviar o follow-up e registrar a nova resposta em `external_prompts/responses/<yyyy-mm-dd>-<slug>-followup-<nn>.md`.
6. Repetir os passos 4 e 5 até que os pontos críticos estejam esclarecidos.
7. Consolidar a decisão aplicável ao projeto em `external_prompts/decisions/<yyyy-mm-dd>-<slug>.md`.

## Comportamento obrigatorio do Codex
- Sempre que o usuário pedir para "criar", "montar", "escrever" ou "gerar" um prompt externo, o Codex deve salvar o prompt final em `external_prompts/requests/<yyyy-mm-dd>-<slug>.md`.
- Sempre que o usuário pedir um prompt de esclarecimento sobre uma resposta já salva em `external_prompts/responses/`, o Codex deve criar um follow-up em `external_prompts/requests/<yyyy-mm-dd>-<slug>-followup-<nn>.md`.
- Em follow-up, o Codex deve explicitar no texto do request qual arquivo de `responses/` esta sendo usado como base e quais pontos precisam de clarificação.
- Não basta responder apenas no chat: o artefato precisa existir em arquivo no repositório.
- O arquivo salvo deve ser o texto final literal de envio (copy-paste), sem etapas internas, notas editoriais ou metacomentarios.
- Na resposta ao usuário, o Codex deve informar o caminho do arquivo criado/atualizado.

## Regras não negociáveis
- Nunca incluir segredos, tokens, chaves, credenciais, cookies, payloads sensiveis ou dados pessoais.
- O request deve ser 100% copy-paste para envio externo.
- Não incluir referências internas de código ou estrutura do repositório.
- Não incluir instruções de processo interno no request (ex.: checklist, anotação editorial, metacomentário de autoria).
- Separar sempre "resposta recebida" de "decisão adotada no projeto".
- Follow-up nunca substitui/edita a resposta original salva: ele complementa com uma nova rodada registrada em arquivo próprio.

## Como solicitar ao Codex
Descreva o problema em linguagem natural e peca para montar o prompt externo final.

O Codex deve:
- produzir um prompt pronto para envio, sem limpeza manual;
- salvar esse prompt em `external_prompts/requests/<yyyy-mm-dd>-<slug>.md`;
- focar no que a IA externa precisa para pesquisar e responder;
- explicitar formato de resposta esperado para facilitar decisão técnica;
- manter o texto sem referências internas do projeto;
- evitar no request qualquer conteúdo que seja apenas instrução interna de elaboração.

Para follow-up de esclarecimento, descreva:
- qual resposta em `responses/` deve ser usada como base;
- quais pontos estao ambiguos, incompletos ou conflitantes;
- qual formato de resposta facilitaria fechar (ou adiar) a decisão.

Nesses casos, o Codex deve gerar um novo request de follow-up, sem sobrescrever request/response anteriores.

## Estrutura recomendada do request (prompt final)
Todo arquivo em `external_prompts/requests/` deve conter:
- objetivo da consulta;
- problema e contexto funcional necessário;
- pergunta principal clara;
- perguntas secundarias (quando realmente agregarem, até 3 no máximo);
- delimitações técnicas relevantes para a resposta;
- formato esperado da resposta;
- exemplos curtos quando isso reduzir ambiguidade.

Para requests de follow-up, incluir também:
- referência explícita ao arquivo de resposta base em `external_prompts/responses/...`;
- lista objetiva dos pontos a esclarecer;
- instrução para a IA externa responder ponto a ponto;
- pedido explícito para indicar se a recomendacao anterior foi mantida, ajustada ou revertida.

Não inclua no request:
- checklist interno de pre-envio;
- anotacoes editoriais de template (ex.: "(máximo 3)");
- instruções sobre como o prompt foi criado.

Use `external_prompts/templates/request-template.md` como base.

## Checklist interno de segurança (fora do request)
Antes de enviar para a IA externa, confirme internamente:
- [ ] Revisei e removi segredos/tokens/chaves/credenciais.
- [ ] Não inclui dados pessoais ou payload sensivel.
- [ ] O request e autocontido e não depende de contexto interno do repositório.
- [ ] O request esta pronto para envio sem edicao adicional.

## Checklist objetivo de prompt engineering (fora do request)
Antes de enviar, confirme:
- [ ] A tarefa esta clara e específica (sem ambiguidade principal).
- [ ] O contexto fornecido e suficiente para decidir, sem detalhes internos irrelevantes.
- [ ] A pergunta principal pode ser validada objetivamente.
- [ ] As perguntas secundarias (se houver) são poucas e não redundantes.
- [ ] Restrições e limites estao explícitos.
- [ ] O formato de resposta solicitado facilita comparar alternativas e trade-offs.
- [ ] O prompt pede riscos, incertezas e critérios de validação.
- [ ] O texto não contem segredos nem dados sensiveis.

## Anti-padrões (não usar)
- Colocar no request seções de controle interno como "Checklist de segurança pre-envio".
- Colocar no request anotacoes editoriais de template como "(máximo 3)".
- Referenciar arquivo/linha, nomes de arquivos, funções internas ou detalhes de implementação local.
- Explicar o processo interno de criacao do prompt em vez de focar na tarefa da IA externa.
- Enviar histórico excessivo que não muda a recomendacao.
- Pedir "a melhor solução" sem pedir trade-offs, riscos e critérios de validação.
- Criar follow-up sem apontar claramente qual resposta de `responses/` esta sendo esclarecida.
- Sobrescrever a resposta original para "encaixar" esclarecimentos (isso quebra rastreabilidade).

## Formato recomendado da resposta externa
Peca para a IA externa responder de forma estruturada:
- recomendacao principal;
- alternativas e trade-offs;
- riscos e pontos de incerteza;
- critérios de validação;
- próximos passos concretos.

## Convencao de nomes
- Slug: minusculo com hifen (`[a-z0-9-]`), ex.: `regras-usucapiao-evidencia`.
- Arquivo: `<yyyy-mm-dd>-<slug>.md`.
- O mesmo slug/data deve ser reaproveitado entre request/response/decision quando for a trilha principal.
- Follow-up: `<yyyy-mm-dd>-<slug>-followup-<nn>.md` (ex.: `2026-02-13-value-timeline-estrategia-avaliacoes-imovel-followup-01.md`).
- Cada follow-up deve gerar par request/response com o mesmo nome-base (mudando apenas a pasta).
