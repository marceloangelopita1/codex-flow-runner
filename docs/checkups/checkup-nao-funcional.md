# Check-up não funcional (operacional)

## Objetivo
Estabelecer um rito recorrente e verificavel para avaliar a saúde não funcional do projeto antes da abertura de novos ciclos de refatoração crítica.

## Escopo
- Definir periodicidade minima do check-up.
- Definir gatilhos extraordinarios para antecipar rodada.
- Executar checklist objetivo dos cinco eixos: código, arquitetura, testes, observabilidade e documentação operacional.
- Gerar saídas rastreáveis para tickets e execplans, mantendo fluxo sequencial.

## Não escopo
- Implementar refatorações técnicas nesta rodada de check-up.
- Alterar algoritmo de consumo da fila sequencial (`P0 -> P1 -> P2`) em `src/integrations/ticket-queue.ts`.
- Alterar o fluxo sequencial do runner.

## Responsáveis e pre-condicoes
- Responsável primario: owner do projeto ativo.
- Apoio técnico: mantenedores dos módulos `src/core` e `src/integrations` quando houver achados nesses domínios.
- Pre-condicoes minimas:
  - projeto com branch local atualizada;
  - comandos `npm run check` e `npm test` disponíveis;
  - acesso aos artefatos operacionais (`README.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`).

## Quando executar

### Periodicidade minima
- Executar 1 rodada de check-up a cada 30 dias corridos por projeto.
- Registrar a rodada até o 5 dia útil após completar o ciclo de 30 dias.
- Se o projeto ficou sem alterações no período, registrar mesmo assim com resultado `sem novos achados`.

### Gatilhos extraordinarios
| Gatilho | Condicao objetiva | Quem dispara | Evidência minima |
| --- | --- | --- | --- |
| Falha recorrente de execução | Duas execuções consecutivas de `/run_all` com erro no mesmo projeto em janela de 24h | Owner do projeto ou operador do bot | Log das duas falhas + ticket aberto com causa preliminar |
| Incidente técnico relevante | Abertura de ticket interno com `Severity: S1` ou `Severity: S2` ligado a regressão técnica | Owner do ticket | Ticket referenciando módulo afetado e impacto |
| Mudança estrutural em área crítica | Fechamento de ticket `P0` que altera 3 ou mais arquivos em `src/core` ou `src/integrations` | Responsável pelo fechamento do ticket | Diff do ticket + nota de impacto arquitetural |
| Mudança em contrato operacional | Alteracao de comandos, fluxo ou pre-condicoes em `README.md` ou docs operacionais obrigatorios | Autor da mudança documental | Diff da documentação + validação de coerencia com runtime |
| Quebra de validação base | Falha em `npm run check` ou `npm test` em duas tentativas seguidas no mesmo contexto de entrega | Responsável pela entrega | Saída dos comandos + ticket/execplan com acao corretiva |

## Checklist operacional dos cinco eixos

### 1. código
- [ ] `COD-01` - Complexidade e acoplamento revisados nas áreas alteradas no ciclo.
  - Critério verificavel: arquivos alterados no período foram inspecionados quanto a funções longas, duplicacao e dependência cíclica aparente.
  - Evidência esperada: lista de arquivos revisados + apontamentos objetivos por arquivo.
  - Saída minima: nota `ok` ou `ajuste necessario` com ticket vinculado quando houver acao.
- [ ] `COD-02` - Padronizacao estatica validada.
  - Critério verificavel: `npm run check` executa sem erro.
  - Evidência esperada: registro do comando e horario de execução.
  - Saída minima: resultado `passou` ou `falhou` com próxima acao definida.
- [ ] `COD-03` - Manutenibilidade protegida nos pontos críticos.
  - Critério verificavel: alterações em áreas centrais incluem nomes consistentes e separacao clara de responsabilidade por módulo.
  - Evidência esperada: exemplos de trechos revisados com justificativa curta.
  - Saída minima: decisão de manter ou abrir item de refatoração.

### 2. arquitetura
- [ ] `ARQ-01` - Limites de camadas preservados.
  - Critério verificavel: `src/core` não depende diretamente de Telegram ou filesystem fora das integrações previstas.
  - Evidência esperada: verificacao de imports em arquivos alterados.
  - Saída minima: confirmacao `limites preservados` ou ticket para corrigir violacao.
- [ ] `ARQ-02` - Contratos entre módulos continuam explícitos.
  - Critério verificavel: interfaces/tipos usados entre camadas estao definidos e coerentes com o comportamento atual.
  - Evidência esperada: referência aos arquivos de tipo e pontos de uso.
  - Saída minima: status `coerente` ou lista de ajustes necessários.
- [ ] `ARQ-03` - Integrações externas seguem isoladas.
  - Critério verificavel: chamadas externas permanecem concentradas em `src/integrations` e não vazam para regras de negócio.
  - Evidência esperada: amostragem dos pontos de chamada revisados.
  - Saída minima: registro `isolamento ok` ou acao de correção.

### 3. testes
- [ ] `TST-01` - Suite automatizada basica valida.
  - Critério verificavel: `npm test` executa sem falhas.
  - Evidência esperada: resultado do comando e contexto da rodada.
  - Saída minima: status `verde` ou plano curto de estabilizacao.
- [ ] `TST-02` - Comportamentos críticos alterados possuem cobertura.
  - Critério verificavel: mudanças em fluxo sequencial, ticket queue ou comandos de controle possuem teste correspondente.
  - Evidência esperada: referência para arquivo(s) de teste afetado(s).
  - Saída minima: `coberto` ou ticket para incluir cobertura faltante.
- [ ] `TST-03` - Lacunas de regressão são rastreáveis.
  - Critério verificavel: toda falha repetida gera item explícito de acao com dono e prazo inicial.
  - Evidência esperada: link para ticket/execplan aberto na rodada.
  - Saída minima: backlog atualizado com prioridade inicial.

### 4. observabilidade
- [ ] `OBS-01` - Logs essenciais do loop estao presentes e legíveis.
  - Critério verificavel: inicio/fim de rodada, falhas e transições relevantes aparecem de forma consistente.
  - Evidência esperada: exemplos de logs recentes por tipo de evento.
  - Saída minima: `observabilidade minima ok` ou ajuste necessário no logger.
- [ ] `OBS-02` - Status operacional no Telegram esta coerente.
  - Critério verificavel: comandos de status refletem etapa atual do runner sem ambiguidade.
  - Evidência esperada: amostra de resposta de status e comparacao com logs.
  - Saída minima: confirmacao de coerencia ou ticket de correções.
- [ ] `OBS-03` - Falhas são diagnosticáveis sem contexto externo.
  - Critério verificavel: mensagens de erro incluem causa, etapa e próxima acao recomendada.
  - Evidência esperada: exemplos de erro coletados na rodada.
  - Saída minima: `diagnostico suficiente` ou acao de melhoria.

### 5. documentação operacional
- [ ] `DOC-01` - README e comandos operacionais estao alinhados ao comportamento atual.
  - Critério verificavel: comandos listados em `README.md` existem e refletem aliases e restrições reais.
  - Evidência esperada: checagem cruzada entre README e código/handlers.
  - Saída minima: `alinhado` ou PR/ticket para ajuste documental.
- [ ] `DOC-02` - Guias obrigatorios permanecem coerentes entre si.
  - Critério verificavel: `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md` e `SPECS.md` não se contradizem nas regras centrais.
  - Evidência esperada: itens revisados e eventuais diferencas registradas.
  - Saída minima: `coerente` ou lista de harmonizacao.
- [ ] `DOC-03` - Rastreabilidade da rodada foi registrada.
  - Critério verificavel: resultados do check-up referenciam spec, ticket e execplan correspondente.
  - Evidência esperada: links para artefatos atualizados na rodada.
  - Saída minima: trilha auditável completa do ciclo.

## Matriz objetiva de classificação de risco e divida técnica
- Aplicar esta matriz quando um achado do check-up gerar backlog de refatoração crítica (ticket ou execplan).
- Escala padrão para cada eixo: `1` (menor impacto) até `5` (maior impacto).

| Eixo | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Severidade | Impacto local sem efeito no fluxo principal | Impacto limitado, com contorno simples | Impacto moderado em módulo crítico ou manutencao | Alto impacto técnico, risco de regressão relevante | Bloqueio de entrega ou potencial de incidente grave |
| Frequência | Raro (`<= 1` ocorrencia por trimestre) | Ocasional (aprox. mensal) | Recorrente (aprox. quinzenal) | Recorrente (aprox. semanal) | Muito recorrente (diario ou em toda rodada) |
| Custo de atraso | Pode esperar mais de 90 dias sem efeito relevante | Pode esperar entre 60 e 90 dias com impacto baixo | Adiar 30-60 dias aumenta retrabalho e risco de acumulacao | Adiar 7-30 dias compromete previsibilidade de entrega | Adiar até 7 dias eleva risco operacional ou de atraso grave |
| Risco operacional | Sem impacto operacional perceptivel | Impacto operacional local, com contencao facil | Aumenta chance de falha operacional ou perda de diagnóstico | Alta chance de incidente, rollback ou interrupção parcial | Incidente quase certo, indisponibilidade ou perda de confiabilidade |

### Fórmula de score
- Calculo obrigatorio:
  - `score = (severidade * 3) + (frequencia * 2) + (custo_de_atraso * 3) + (risco_operacional * 2)`
- Faixa de score: `10` a `50`.
- Registro mínimo para rastreabilidade:
  - valores dos 4 eixos;
  - score final;
  - prioridade resultante (`P0`, `P1` ou `P2`);
  - justificativa objetiva com evidência.

## Mapeamento de score para prioridade operacional
- Objetivo: converter classificação objetiva em `Priority` sem alterar o consumo sequencial atual da fila.

| Regra | Prioridade resultante |
| --- | --- |
| `score >= 40` | `P0` |
| `score` entre `26` e `39` | `P1` |
| `score` entre `10` e `25` | `P2` |
| Guardrail: `severidade = 5` e (`custo_de_atraso >= 4` ou `risco_operacional >= 4`) | `P0` (mesmo com score abaixo de 40) |

### Regras para casos limite e desempate
1. Aplicar primeiro o guardrail de risco extremo.
2. Sem guardrail, aplicar a faixa de score.
3. Se dois itens permanecerem no mesmo nível de prioridade para a rodada:
   - priorizar maior `custo_de_atraso`;
   - depois maior `severidade`;
   - persistindo empate, usar fallback deterministico por nome de arquivo do ticket.

### Exemplos curtos
- Exemplo A: `severidade=3`, `frequencia=4`, `custo_de_atraso=4`, `risco_operacional=3` -> `score=35` -> `P1`.
- Exemplo B: `severidade=5`, `frequencia=2`, `custo_de_atraso=4`, `risco_operacional=4` -> `score=41` e guardrail ativo -> `P0`.

## Saídas obrigatórias da rodada
- Atualizacao de status na spec de origem com impacto observado no ciclo.
- Abertura ou atualizacao de ticket/execplan para cada achado que exigir acao posterior.
- Registro da classificação objetiva dos itens de refatoração crítica (4 eixos, score e prioridade).
- Registro resumido da rodada contendo:
  - data e responsável;
  - gatilho da execução (`periodicidade minima` ou `gatilho extraordinario`);
  - checklist com itens `ok` e `ajuste necessario`;
  - lista de artefatos gerados.

## Plano de melhoria continua
### Ordem sequencial do backlog e responsável por etapa
| Etapa | Regra operacional | Responsável primario | Saída obrigatória |
| --- | --- | --- | --- |
| `P0` | Resolver todos os itens `P0` antes de iniciar `P1` | owner do projeto ativo | ticket fechado em `tickets/closed/` + execplan atualizado |
| `P1` | Iniciar somente quando não houver `P0` pendente | owner do ticket com apoio do maintainer do módulo afetado | rastreabilidade `ticket -> execplan -> spec` atualizada |
| `P2` | Executar apenas quando `P0` e `P1` da rodada estiverem sem bloqueio | owner do projeto ou delegado formal no ticket | backlog remanescente priorizado para próxima revisão periódica |

- Regra fixa: o fluxo permanece sequencial (`P0 -> P1 -> P2`) e sem paralelizacao de tickets.
- Toda etapa deve registrar dono explícito (`Responsavel`) no ticket ou no registro da revisão periódica.

### Entradas e saídas por ciclo
- Entradas minimas:
  - estado atual de `tickets/open/` e `tickets/closed/`;
  - histórico mais recente em `docs/checkups/history/`;
  - status vivo da spec de origem.
- Saídas minimas:
  - backlog ordenado por prioridade com justificativa objetiva;
  - decisão por item (`executar agora`, `postergar`, `reclassificar`);
  - links atualizados para ticket, execplan e spec.

### Critério de reavaliacao
- Cadencia minima: uma revisão periódica a cada 30 dias corridos por projeto.
- Gatilhos extraordinarios: qualquer condicao listada em `## Gatilhos extraordinarios` antecipa a revisão periódica.
- Regra de recategorizacao:
  - recalcular `score` do item ao fim de cada rodada ou quando houver gatilho extraordinario;
  - se o novo `score` mudar de faixa (`P0/P1/P2`), atualizar `Priority` do ticket e reordenar a fila sequencial;
  - se o `score` variar `>= 5` pontos sem mudar de faixa, manter prioridade e registrar justificativa na rodada.

### Trilha auditável da revisão periódica
- Local oficial: `docs/checkups/history/`.
- Convencao de nome: `YYYY-MM-DD-revisao-periodica-checkup-nao-funcional.md`.
- Campos obrigatorios por registro:
  - `Data (UTC)`;
  - `Responsavel`;
  - `Gatilho`;
  - `itens avaliados` (com prioridade/score quando aplicável);
  - `decisoes` da rodada;
  - links para `ticket`, `execplan` e `spec`.
- Evidência minima:
  - referência ao comando/artefato usado para validar status da rodada;
  - lista do backlog revisado e acao definida por item;
  - rastreabilidade cruzada com a spec de origem.

## Rastreabilidade desta versão
- Spec de origem: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
- Ticket desta entrega: `tickets/closed/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`
- ExecPlan desta entrega: `execplans/2026-02-21-plano-de-melhoria-continua-e-rastreabilidade-de-revisoes-gap.md`
- Ticket anterior desta trilha: `tickets/closed/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
- ExecPlan anterior desta trilha: `execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`

## Histórico de atualizacao
- 2026-02-21 08:51Z - Versão inicial do guia operacional criada com periodicidade minima, gatilhos extraordinarios e checklist dos cinco eixos.
- 2026-02-21 08:56Z - Rastreabilidade atualizada após fechamento do ticket da entrega e move para `tickets/closed/`.
- 2026-02-21 09:02Z - Matriz objetiva de risco/divida técnica, fórmula de score e regra de mapeamento para `P0/P1/P2` adicionadas com regras de desempate.
- 2026-02-21 09:12Z - Plano de melhoria continua consolidado com ordem sequencial, critério de reavaliacao e trilha auditável de revisão periódica.
- 2026-02-21 09:17Z - Ticket da entrega de melhoria continua fechado e rastreabilidade atualizada para `tickets/closed/`.
