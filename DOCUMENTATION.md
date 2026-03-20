# DOCUMENTATION.md

## Objetivo
Definir como documentar este projeto para a atuação de IAs programadoras sem desperdiçar contexto automaticamente carregado.

Regra central:
- contexto rico e útil é melhor que contexto mínimo;
- contexto irrelevante, duplicado ou vago piora a execução e deve ficar fora do auto-load.

## Princípios
- `AGENTS.md` deve ficar curto, direto e operacional.
- Só regras recorrentes, estáveis e acionáveis devem entrar no contexto carregado automaticamente.
- Detalhes, exemplos, racional, tutoriais e checklists longos devem ficar em documentação referenciada.
- Prompts, documentação, specs, tickets e execplans devem ser escritos em português correto e com acentuação adequada.
- Não é necessária correção retroativa em massa de specs, tickets e execplans já existentes; esse material histórico só precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real.
- Ao atualizar documentação, remover duplicação e texto obsoleto faz parte da mudança.
- O melhor lugar para uma regra depende do escopo dela, não da conveniência de colocá-la no primeiro arquivo visível.

## Onde cada conteúdo deve morar
| Tipo de conteúdo | Lugar | Quando usar |
| --- | --- | --- |
| Regras globais do repositório, prioridades duráveis e fluxos que ajudam quase toda tarefa | `AGENTS.md` na raiz | Quando a instrução precisa entrar sempre no contexto |
| Regras de uma subárvore, subsistema ou pasta específica | `AGENTS.md` local | Quando a instrução só faz sentido dentro daquele escopo |
| Detalhe técnico, racional, exemplo, tutorial, checklist longo ou referência | `README.md` ou documento canônico | Quando a informação deve ser consultada sob demanda |
| Regras formais de um processo do projeto | Documento canônico da raiz, como `SPECS.md`, `PLANS.md`, `INTERNAL_TICKETS.md` ou `EXTERNAL_PROMPTS.md` | Quando já existe uma fonte de verdade para aquele processo |
| Workflow grande, repetível e reutilizável em vários contextos | Possível skill futura | Quando o conteúdo cresce demais para docs sempre carregadas; nesta versão isso é apenas uma nota de direção |

## Heurísticas de decisão
- Vai ajudar quase toda tarefa do repositório e precisa sempre estar visível para a IA: coloque no `AGENTS.md` da raiz.
- Só importa dentro de uma pasta ou subsistema: coloque em um `AGENTS.md` local naquela subárvore.
- É detalhe, racional, exemplo, tutorial, referência ou checklist longo: coloque em `README.md` ou no documento canônico correto e deixe apenas um ponteiro no `AGENTS.md`.
- E conteúdo temporário, ligado a um ticket, incidente, execplan ou experimento: não coloque em `AGENTS.md`; mantenha no artefato próprio.
- É um fluxo reaproveitável, extenso e frequente o bastante para merecer encapsulamento: trate como candidato futuro a skill, sem operacionalizar isso aqui.

## Anti-padrões
- Duplicar no `AGENTS.md` uma regra que já é canônica em outro documento.
- Repetir no `AGENTS.md` local o texto inteiro do `AGENTS.md` da raiz.
- Colocar histórico, changelog, notas de reunião ou contexto de ticket dentro de `AGENTS.md`.
- Escrever instruções vagas como `seguir boas práticas` sem dizer o que muda na execução.
- Empilhar prosa longa, exemplos ou listas extensas em `AGENTS.md` quando um ponteiro resolveria.

## Checklist rápido para editar documentação
- Que decisão, erro recorrente ou dúvida esta mudança evita?
- Quem precisa ler isso: quase toda tarefa, apenas uma subárvore, ou só consulta humana?
- Isso precisa mesmo ser auto-carregado ou pode ser acessado por ponteiro?
- Já existe uma fonte de verdade para esse assunto? Se sim, atualize a fonte em vez de copiar.
- Que texto antigo, duplicado ou pouco útil deve sair para abrir espaço para o novo contexto?
- Se a regra for local, qual é a fronteira da pasta e quais tarefas justificam um `AGENTS.md` local?

## Nota operacional
- Por padrão do Codex, `AGENTS.md` é o arquivo de instruções ativo; `README.md` não entra automaticamente como instrução.
- Nesta política, `README.md` é documentação de apoio e aprofundamento, não fallback ativo para instruções.
- Esta versão não altera configuração do Codex para tratar `README.md` como arquivo de instrução.

## Referências externas
- OpenAI Codex `AGENTS.md` guide: <https://developers.openai.com/codex/guides/agents-md>
- OpenAI Codex best practices: <https://developers.openai.com/codex/learn/best-practices>
- OpenAI Codex Prompting Guide: <https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide>
- OpenAI Skills guide: <https://developers.openai.com/api/docs/guides/tools-skills>
