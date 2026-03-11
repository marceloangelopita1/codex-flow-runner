# DOCUMENTATION.md

## Objetivo
Definir como documentar este projeto para a atuacao de IAs programadoras sem desperdicar contexto automaticamente carregado.

Regra central:
- contexto rico e util e melhor que contexto minimo;
- contexto irrelevante, duplicado ou vago piora a execucao e deve ficar fora do auto-load.

## Principios
- `AGENTS.md` deve ficar curto, direto e operacional.
- So regras recorrentes, estaveis e acionaveis devem entrar no contexto carregado automaticamente.
- Detalhes, exemplos, racional, tutoriais e checklists longos devem ficar em documentacao referenciada.
- Ao atualizar documentacao, remover duplicacao e texto obsoleto faz parte da mudanca.
- O melhor lugar para uma regra depende do escopo dela, nao da conveniencia de coloca-la no primeiro arquivo visivel.

## Onde cada conteudo deve morar
| Tipo de conteudo | Lugar | Quando usar |
| --- | --- | --- |
| Regras globais do repositorio, prioridades duraveis e fluxos que ajudam quase toda tarefa | `AGENTS.md` na raiz | Quando a instrucao precisa entrar sempre no contexto |
| Regras de uma subarvore, subsistema ou pasta especifica | `AGENTS.md` local | Quando a instrucao so faz sentido dentro daquele escopo |
| Detalhe tecnico, racional, exemplo, tutorial, checklist longo ou referencia | `README.md` ou documento canonico | Quando a informacao deve ser consultada sob demanda |
| Regras formais de um processo do projeto | Documento canonico da raiz, como `SPECS.md`, `PLANS.md`, `INTERNAL_TICKETS.md` ou `EXTERNAL_PROMPTS.md` | Quando ja existe uma fonte de verdade para aquele processo |
| Workflow grande, repetivel e reutilizavel em varios contextos | Possivel skill futura | Quando o conteudo cresce demais para docs sempre carregadas; nesta versao isso e apenas uma nota de direcao |

## Heuristicas de decisao
- Vai ajudar quase toda tarefa do repositorio e precisa sempre estar visivel para a IA: coloque no `AGENTS.md` da raiz.
- So importa dentro de uma pasta ou subsistema: coloque em um `AGENTS.md` local naquela subarvore.
- E detalhe, racional, exemplo, tutorial, referencia ou checklist longo: coloque em `README.md` ou no documento canonico correto e deixe apenas um ponteiro no `AGENTS.md`.
- E conteudo temporario, ligado a um ticket, incidente, execplan ou experimento: nao coloque em `AGENTS.md`; mantenha no artefato proprio.
- E um fluxo reaproveitavel, extenso e frequente o bastante para merecer encapsulamento: trate como candidato futuro a skill, sem operacionalizar isso aqui.

## Anti-padroes
- Duplicar no `AGENTS.md` uma regra que ja e canonica em outro documento.
- Repetir no `AGENTS.md` local o texto inteiro do `AGENTS.md` da raiz.
- Colocar historico, changelog, notas de reuniao ou contexto de ticket dentro de `AGENTS.md`.
- Escrever instrucoes vagas como `seguir boas praticas` sem dizer o que muda na execucao.
- Empilhar prosa longa, exemplos ou listas extensas em `AGENTS.md` quando um ponteiro resolveria.

## Checklist rapido para editar documentacao
- Que decisao, erro recorrente ou duvida esta mudanca evita?
- Quem precisa ler isso: quase toda tarefa, apenas uma subarvore, ou so consulta humana?
- Isso precisa mesmo ser auto-carregado ou pode ser acessado por ponteiro?
- Ja existe uma fonte de verdade para esse assunto? Se sim, atualize a fonte em vez de copiar.
- Que texto antigo, duplicado ou pouco util deve sair para abrir espaco para o novo contexto?
- Se a regra for local, qual e a fronteira da pasta e quais tarefas justificam um `AGENTS.md` local?

## Nota operacional
- Por padrao do Codex, `AGENTS.md` e o arquivo de instrucoes ativo; `README.md` nao entra automaticamente como instrucao.
- Nesta politica, `README.md` e documentacao de apoio e aprofundamento, nao fallback ativo para instrucoes.
- Esta versao nao altera configuracao do Codex para tratar `README.md` como arquivo de instrucao.

## Referencias externas
- OpenAI Codex `AGENTS.md` guide: <https://developers.openai.com/codex/guides/agents-md>
- OpenAI Codex best practices: <https://developers.openai.com/codex/learn/best-practices>
- OpenAI Codex Prompting Guide: <https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide>
- OpenAI Skills guide: <https://developers.openai.com/api/docs/guides/tools-skills>
