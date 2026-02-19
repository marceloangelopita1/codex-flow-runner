# EXTERNAL_PROMPTS.md

## Objetivo
Padronizar prompts para IAs especialistas externas de forma autocontida, sem contexto interno irrelevante e com rastreabilidade de decisao.
Tambem padronizar ciclos de esclarecimento (follow-up) quando uma resposta salva ainda nao for suficiente para decidir mudancas no projeto.

## Principio central
A IA especialista externa nao tem acesso ao nosso codigo.

Por isso, o texto enviado deve ser autoexplicativo e independente do repositorio.

Em `external_prompts/requests/`, cada arquivo e o prompt final literal que sera enviado para a IA externa. Se um trecho nao melhora a qualidade da resposta externa, ele nao deve estar no request.

## Fluxo oficial
1. Criar o request em `external_prompts/requests/<yyyy-mm-dd>-<slug>.md`.
2. Enviar o arquivo de request para a IA especialista externa.
3. Registrar a resposta em `external_prompts/responses/<yyyy-mm-dd>-<slug>.md`.
4. Se ainda houver ambiguidade, criar um request de follow-up em `external_prompts/requests/<yyyy-mm-dd>-<slug>-followup-<nn>.md`, referenciando explicitamente a resposta alvo em `responses/`.
5. Enviar o follow-up e registrar a nova resposta em `external_prompts/responses/<yyyy-mm-dd>-<slug>-followup-<nn>.md`.
6. Repetir os passos 4 e 5 ate que os pontos criticos estejam esclarecidos.
7. Consolidar a decisao aplicavel ao projeto em `external_prompts/decisions/<yyyy-mm-dd>-<slug>.md`.

## Comportamento obrigatorio do Codex
- Sempre que o usuario pedir para "criar", "montar", "escrever" ou "gerar" um prompt externo, o Codex deve salvar o prompt final em `external_prompts/requests/<yyyy-mm-dd>-<slug>.md`.
- Sempre que o usuario pedir um prompt de esclarecimento sobre uma resposta ja salva em `external_prompts/responses/`, o Codex deve criar um follow-up em `external_prompts/requests/<yyyy-mm-dd>-<slug>-followup-<nn>.md`.
- Em follow-up, o Codex deve explicitar no texto do request qual arquivo de `responses/` esta sendo usado como base e quais pontos precisam de clarificacao.
- Nao basta responder apenas no chat: o artefato precisa existir em arquivo no repositorio.
- O arquivo salvo deve ser o texto final literal de envio (copy-paste), sem etapas internas, notas editoriais ou metacomentarios.
- Na resposta ao usuario, o Codex deve informar o caminho do arquivo criado/atualizado.

## Regras nao negociaveis
- Nunca incluir segredos, tokens, chaves, credenciais, cookies, payloads sensiveis ou dados pessoais.
- O request deve ser 100% copy-paste para envio externo.
- Nao incluir referencias internas de codigo ou estrutura do repositorio.
- Nao incluir instrucoes de processo interno no request (ex.: checklist, anotacao editorial, metacomentario de autoria).
- Separar sempre "resposta recebida" de "decisao adotada no projeto".
- Follow-up nunca substitui/edita a resposta original salva: ele complementa com uma nova rodada registrada em arquivo proprio.

## Como solicitar ao Codex
Descreva o problema em linguagem natural e peca para montar o prompt externo final.

O Codex deve:
- produzir um prompt pronto para envio, sem limpeza manual;
- salvar esse prompt em `external_prompts/requests/<yyyy-mm-dd>-<slug>.md`;
- focar no que a IA externa precisa para pesquisar e responder;
- explicitar formato de resposta esperado para facilitar decisao tecnica;
- manter o texto sem referencias internas do projeto;
- evitar no request qualquer conteudo que seja apenas instrucao interna de elaboracao.

Para follow-up de esclarecimento, descreva:
- qual resposta em `responses/` deve ser usada como base;
- quais pontos estao ambiguos, incompletos ou conflitantes;
- qual formato de resposta facilitaria fechar (ou adiar) a decisao.

Nesses casos, o Codex deve gerar um novo request de follow-up, sem sobrescrever request/response anteriores.

## Estrutura recomendada do request (prompt final)
Todo arquivo em `external_prompts/requests/` deve conter:
- objetivo da consulta;
- problema e contexto funcional necessario;
- pergunta principal clara;
- perguntas secundarias (quando realmente agregarem, ate 3 no maximo);
- delimitacoes tecnicas relevantes para a resposta;
- formato esperado da resposta;
- exemplos curtos quando isso reduzir ambiguidade.

Para requests de follow-up, incluir tambem:
- referencia explicita ao arquivo de resposta base em `external_prompts/responses/...`;
- lista objetiva dos pontos a esclarecer;
- instrucao para a IA externa responder ponto a ponto;
- pedido explicito para indicar se a recomendacao anterior foi mantida, ajustada ou revertida.

Nao inclua no request:
- checklist interno de pre-envio;
- anotacoes editoriais de template (ex.: "(maximo 3)");
- instrucoes sobre como o prompt foi criado.

Use `external_prompts/templates/request-template.md` como base.

## Checklist interno de seguranca (fora do request)
Antes de enviar para a IA externa, confirme internamente:
- [ ] Revisei e removi segredos/tokens/chaves/credenciais.
- [ ] Nao inclui dados pessoais ou payload sensivel.
- [ ] O request e autocontido e nao depende de contexto interno do repositorio.
- [ ] O request esta pronto para envio sem edicao adicional.

## Checklist objetivo de prompt engineering (fora do request)
Antes de enviar, confirme:
- [ ] A tarefa esta clara e especifica (sem ambiguidade principal).
- [ ] O contexto fornecido e suficiente para decidir, sem detalhes internos irrelevantes.
- [ ] A pergunta principal pode ser validada objetivamente.
- [ ] As perguntas secundarias (se houver) sao poucas e nao redundantes.
- [ ] Restricoes e limites estao explicitos.
- [ ] O formato de resposta solicitado facilita comparar alternativas e trade-offs.
- [ ] O prompt pede riscos, incertezas e criterios de validacao.
- [ ] O texto nao contem segredos nem dados sensiveis.

## Anti-padroes (nao usar)
- Colocar no request secoes de controle interno como "Checklist de seguranca pre-envio".
- Colocar no request anotacoes editoriais de template como "(maximo 3)".
- Referenciar arquivo/linha, nomes de arquivos, funcoes internas ou detalhes de implementacao local.
- Explicar o processo interno de criacao do prompt em vez de focar na tarefa da IA externa.
- Enviar historico excessivo que nao muda a recomendacao.
- Pedir "a melhor solucao" sem pedir trade-offs, riscos e criterios de validacao.
- Criar follow-up sem apontar claramente qual resposta de `responses/` esta sendo esclarecida.
- Sobrescrever a resposta original para "encaixar" esclarecimentos (isso quebra rastreabilidade).

## Formato recomendado da resposta externa
Peca para a IA externa responder de forma estruturada:
- recomendacao principal;
- alternativas e trade-offs;
- riscos e pontos de incerteza;
- criterios de validacao;
- proximos passos concretos.

## Convencao de nomes
- Slug: minusculo com hifen (`[a-z0-9-]`), ex.: `regras-usucapiao-evidencia`.
- Arquivo: `<yyyy-mm-dd>-<slug>.md`.
- O mesmo slug/data deve ser reaproveitado entre request/response/decision quando for a trilha principal.
- Follow-up: `<yyyy-mm-dd>-<slug>-followup-<nn>.md` (ex.: `2026-02-13-value-timeline-estrategia-avaliacoes-imovel-followup-01.md`).
- Cada follow-up deve gerar par request/response com o mesmo nome-base (mudando apenas a pasta).
