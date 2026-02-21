# Check-up nao funcional (operacional)

## Objetivo
Estabelecer um rito recorrente e verificavel para avaliar a saude nao funcional do projeto antes da abertura de novos ciclos de refatoracao critica.

## Escopo
- Definir periodicidade minima do check-up.
- Definir gatilhos extraordinarios para antecipar rodada.
- Executar checklist objetivo dos cinco eixos: codigo, arquitetura, testes, observabilidade e documentacao operacional.
- Gerar saidas rastreaveis para tickets e execplans, mantendo fluxo sequencial.

## Nao escopo
- Implementar refatoracoes tecnicas nesta rodada de check-up.
- Alterar algoritmo de consumo da fila sequencial (`P0 -> P1 -> P2`) em `src/integrations/ticket-queue.ts`.
- Consolidar plano de melhoria continua e trilha periodica completa (RF-09, CA-04, CA-05), tratado em ticket dedicado.
- Alterar o fluxo sequencial do runner.

## Responsaveis e pre-condicoes
- Responsavel primario: owner do projeto ativo.
- Apoio tecnico: mantenedores dos modulos `src/core` e `src/integrations` quando houver achados nesses dominios.
- Pre-condicoes minimas:
  - projeto com branch local atualizada;
  - comandos `npm run check` e `npm test` disponiveis;
  - acesso aos artefatos operacionais (`README.md`, `INTERNAL_TICKETS.md`, `PLANS.md`, `SPECS.md`).

## Quando executar

### Periodicidade minima
- Executar 1 rodada de check-up a cada 30 dias corridos por projeto.
- Registrar a rodada ate o 5 dia util apos completar o ciclo de 30 dias.
- Se o projeto ficou sem alteracoes no periodo, registrar mesmo assim com resultado `sem novos achados`.

### Gatilhos extraordinarios
| Gatilho | Condicao objetiva | Quem dispara | Evidencia minima |
| --- | --- | --- | --- |
| Falha recorrente de execucao | Duas execucoes consecutivas de `/run_all` com erro no mesmo projeto em janela de 24h | Owner do projeto ou operador do bot | Log das duas falhas + ticket aberto com causa preliminar |
| Incidente tecnico relevante | Abertura de ticket interno com `Severity: S1` ou `Severity: S2` ligado a regressao tecnica | Owner do ticket | Ticket referenciando modulo afetado e impacto |
| Mudanca estrutural em area critica | Fechamento de ticket `P0` que altera 3 ou mais arquivos em `src/core` ou `src/integrations` | Responsavel pelo fechamento do ticket | Diff do ticket + nota de impacto arquitetural |
| Mudanca em contrato operacional | Alteracao de comandos, fluxo ou pre-condicoes em `README.md` ou docs operacionais obrigatorios | Autor da mudanca documental | Diff da documentacao + validacao de coerencia com runtime |
| Quebra de validacao base | Falha em `npm run check` ou `npm test` em duas tentativas seguidas no mesmo contexto de entrega | Responsavel pela entrega | Saida dos comandos + ticket/execplan com acao corretiva |

## Checklist operacional dos cinco eixos

### 1. codigo
- [ ] `COD-01` - Complexidade e acoplamento revisados nas areas alteradas no ciclo.
  - Criterio verificavel: arquivos alterados no periodo foram inspecionados quanto a funcoes longas, duplicacao e dependencia ciclica aparente.
  - Evidencia esperada: lista de arquivos revisados + apontamentos objetivos por arquivo.
  - Saida minima: nota `ok` ou `ajuste necessario` com ticket vinculado quando houver acao.
- [ ] `COD-02` - Padronizacao estatica validada.
  - Criterio verificavel: `npm run check` executa sem erro.
  - Evidencia esperada: registro do comando e horario de execucao.
  - Saida minima: resultado `passou` ou `falhou` com proxima acao definida.
- [ ] `COD-03` - Manutenibilidade protegida nos pontos criticos.
  - Criterio verificavel: alteracoes em areas centrais incluem nomes consistentes e separacao clara de responsabilidade por modulo.
  - Evidencia esperada: exemplos de trechos revisados com justificativa curta.
  - Saida minima: decisao de manter ou abrir item de refatoracao.

### 2. arquitetura
- [ ] `ARQ-01` - Limites de camadas preservados.
  - Criterio verificavel: `src/core` nao depende diretamente de Telegram ou filesystem fora das integracoes previstas.
  - Evidencia esperada: verificacao de imports em arquivos alterados.
  - Saida minima: confirmacao `limites preservados` ou ticket para corrigir violacao.
- [ ] `ARQ-02` - Contratos entre modulos continuam explicitos.
  - Criterio verificavel: interfaces/tipos usados entre camadas estao definidos e coerentes com o comportamento atual.
  - Evidencia esperada: referencia aos arquivos de tipo e pontos de uso.
  - Saida minima: status `coerente` ou lista de ajustes necessarios.
- [ ] `ARQ-03` - Integracoes externas seguem isoladas.
  - Criterio verificavel: chamadas externas permanecem concentradas em `src/integrations` e nao vazam para regras de negocio.
  - Evidencia esperada: amostragem dos pontos de chamada revisados.
  - Saida minima: registro `isolamento ok` ou acao de correcao.

### 3. testes
- [ ] `TST-01` - Suite automatizada basica valida.
  - Criterio verificavel: `npm test` executa sem falhas.
  - Evidencia esperada: resultado do comando e contexto da rodada.
  - Saida minima: status `verde` ou plano curto de estabilizacao.
- [ ] `TST-02` - Comportamentos criticos alterados possuem cobertura.
  - Criterio verificavel: mudancas em fluxo sequencial, ticket queue ou comandos de controle possuem teste correspondente.
  - Evidencia esperada: referencia para arquivo(s) de teste afetado(s).
  - Saida minima: `coberto` ou ticket para incluir cobertura faltante.
- [ ] `TST-03` - Lacunas de regressao sao rastreaveis.
  - Criterio verificavel: toda falha repetida gera item explicito de acao com dono e prazo inicial.
  - Evidencia esperada: link para ticket/execplan aberto na rodada.
  - Saida minima: backlog atualizado com prioridade inicial.

### 4. observabilidade
- [ ] `OBS-01` - Logs essenciais do loop estao presentes e legiveis.
  - Criterio verificavel: inicio/fim de rodada, falhas e transicoes relevantes aparecem de forma consistente.
  - Evidencia esperada: exemplos de logs recentes por tipo de evento.
  - Saida minima: `observabilidade minima ok` ou ajuste necessario no logger.
- [ ] `OBS-02` - Status operacional no Telegram esta coerente.
  - Criterio verificavel: comandos de status refletem etapa atual do runner sem ambiguidade.
  - Evidencia esperada: amostra de resposta de status e comparacao com logs.
  - Saida minima: confirmacao de coerencia ou ticket de correcoes.
- [ ] `OBS-03` - Falhas sao diagnosticaveis sem contexto externo.
  - Criterio verificavel: mensagens de erro incluem causa, etapa e proxima acao recomendada.
  - Evidencia esperada: exemplos de erro coletados na rodada.
  - Saida minima: `diagnostico suficiente` ou acao de melhoria.

### 5. documentacao operacional
- [ ] `DOC-01` - README e comandos operacionais estao alinhados ao comportamento atual.
  - Criterio verificavel: comandos listados em `README.md` existem e refletem aliases e restricoes reais.
  - Evidencia esperada: checagem cruzada entre README e codigo/handlers.
  - Saida minima: `alinhado` ou PR/ticket para ajuste documental.
- [ ] `DOC-02` - Guias obrigatorios permanecem coerentes entre si.
  - Criterio verificavel: `EXTERNAL_PROMPTS.md`, `INTERNAL_TICKETS.md`, `PLANS.md` e `SPECS.md` nao se contradizem nas regras centrais.
  - Evidencia esperada: itens revisados e eventuais diferencas registradas.
  - Saida minima: `coerente` ou lista de harmonizacao.
- [ ] `DOC-03` - Rastreabilidade da rodada foi registrada.
  - Criterio verificavel: resultados do check-up referenciam spec, ticket e execplan correspondente.
  - Evidencia esperada: links para artefatos atualizados na rodada.
  - Saida minima: trilha auditavel completa do ciclo.

## Matriz objetiva de classificacao de risco e divida tecnica
- Aplicar esta matriz quando um achado do check-up gerar backlog de refatoracao critica (ticket ou execplan).
- Escala padrao para cada eixo: `1` (menor impacto) ate `5` (maior impacto).

| Eixo | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Severidade | Impacto local sem efeito no fluxo principal | Impacto limitado, com contorno simples | Impacto moderado em modulo critico ou manutencao | Alto impacto tecnico, risco de regressao relevante | Bloqueio de entrega ou potencial de incidente grave |
| Frequencia | Raro (`<= 1` ocorrencia por trimestre) | Ocasional (aprox. mensal) | Recorrente (aprox. quinzenal) | Recorrente (aprox. semanal) | Muito recorrente (diario ou em toda rodada) |
| Custo de atraso | Pode esperar mais de 90 dias sem efeito relevante | Pode esperar entre 60 e 90 dias com impacto baixo | Adiar 30-60 dias aumenta retrabalho e risco de acumulacao | Adiar 7-30 dias compromete previsibilidade de entrega | Adiar ate 7 dias eleva risco operacional ou de atraso grave |
| Risco operacional | Sem impacto operacional perceptivel | Impacto operacional local, com contencao facil | Aumenta chance de falha operacional ou perda de diagnostico | Alta chance de incidente, rollback ou interrupcao parcial | Incidente quase certo, indisponibilidade ou perda de confiabilidade |

### Formula de score
- Calculo obrigatorio:
  - `score = (severidade * 3) + (frequencia * 2) + (custo_de_atraso * 3) + (risco_operacional * 2)`
- Faixa de score: `10` a `50`.
- Registro minimo para rastreabilidade:
  - valores dos 4 eixos;
  - score final;
  - prioridade resultante (`P0`, `P1` ou `P2`);
  - justificativa objetiva com evidencia.

## Mapeamento de score para prioridade operacional
- Objetivo: converter classificacao objetiva em `Priority` sem alterar o consumo sequencial atual da fila.

| Regra | Prioridade resultante |
| --- | --- |
| `score >= 40` | `P0` |
| `score` entre `26` e `39` | `P1` |
| `score` entre `10` e `25` | `P2` |
| Guardrail: `severidade = 5` e (`custo_de_atraso >= 4` ou `risco_operacional >= 4`) | `P0` (mesmo com score abaixo de 40) |

### Regras para casos limite e desempate
1. Aplicar primeiro o guardrail de risco extremo.
2. Sem guardrail, aplicar a faixa de score.
3. Se dois itens permanecerem no mesmo nivel de prioridade para a rodada:
   - priorizar maior `custo_de_atraso`;
   - depois maior `severidade`;
   - persistindo empate, usar fallback deterministico por nome de arquivo do ticket.

### Exemplos curtos
- Exemplo A: `severidade=3`, `frequencia=4`, `custo_de_atraso=4`, `risco_operacional=3` -> `score=35` -> `P1`.
- Exemplo B: `severidade=5`, `frequencia=2`, `custo_de_atraso=4`, `risco_operacional=4` -> `score=41` e guardrail ativo -> `P0`.

## Saidas obrigatorias da rodada
- Atualizacao de status na spec de origem com impacto observado no ciclo.
- Abertura ou atualizacao de ticket/execplan para cada achado que exigir acao posterior.
- Registro da classificacao objetiva dos itens de refatoracao critica (4 eixos, score e prioridade).
- Registro resumido da rodada contendo:
  - data e responsavel;
  - gatilho da execucao (`periodicidade minima` ou `gatilho extraordinario`);
  - checklist com itens `ok` e `ajuste necessario`;
  - lista de artefatos gerados.

## Rastreabilidade desta versao
- Spec de origem: `docs/specs/2026-02-21-check-up-nao-funcional-de-codigo-e-documentacao-para-refatoracoes-criticas.md`
- Ticket desta entrega: `tickets/open/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
- ExecPlan desta entrega: `execplans/2026-02-21-matriz-de-risco-e-priorizacao-de-refatoracoes-gap.md`
- Ticket anterior desta trilha: `tickets/closed/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md`
- ExecPlan anterior desta trilha: `execplans/2026-02-21-checkup-nao-funcional-periodicidade-e-checklists-gap.md`

## Historico de atualizacao
- 2026-02-21 08:51Z - Versao inicial do guia operacional criada com periodicidade minima, gatilhos extraordinarios e checklist dos cinco eixos.
- 2026-02-21 08:56Z - Rastreabilidade atualizada apos fechamento do ticket da entrega e move para `tickets/closed/`.
- 2026-02-21 09:02Z - Matriz objetiva de risco/divida tecnica, formula de score e regra de mapeamento para `P0/P1/P2` adicionadas com regras de desempate.
