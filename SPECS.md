# SPECS.md

## Objetivo
Definir o padrão oficial para criacao e manutencao de especificacoes funcionais e jornadas de uso em `docs/specs/`.

Cada spec deve ser um **documento vivo**: além de descrever o comportamento esperado, precisa informar de forma objetiva se já esta atendida, parcialmente atendida ou ainda pendente.
Contrato oficial de derivação: `spec -> tickets` e `ticket -> execplan` quando necessário.

## Onde ficam as specs
- Specs: `docs/specs/`
- Template oficial: `docs/specs/templates/spec-template.md`

## Quando criar uma spec
Crie uma spec quando houver qualquer um destes cenários:
- nova funcionalidade ou mudança relevante de comportamento;
- nova jornada de uso que impacta fluxo do runner;
- necessidade de consolidar regras de negócio antes de implementar;
- alinhamento de critério de aceitacao entre produto e implementação.

## Ciclo de vida da spec (status)
Status permitidos no campo `Status` de cada spec:
- `draft`: especificacao em elaboração.
- `approved`: escopo aprovado e pronto para derivação técnica.
- `in_progress`: implementação em andamento.
- `partially_attended`: parte da spec foi entregue, ainda há pendências.
- `attended`: critérios de aceitacao atendidos e com evidência.
- `superseded`: spec substituida por uma versão mais nova.

## Metadata de tratamento da spec
Campo obrigatorio em `## Metadata` de toda spec:
- `Spec treatment: pending | done`

Semantica operacional:
- `pending`: ainda existe trabalho pendente derivado da spec (ex.: ticket em `tickets/open/`).
- `done`: não existe pendencia aberta derivada da spec no momento.

Regras:
- `Spec treatment` e independente de `Status` e não substitui o ciclo de vida funcional da spec.
- Em caso de divergencia documental, usar `tickets/open/` como fonte de verdade para classificar `pending`.
- Cada spec deve conter exatamente uma linha `Spec treatment`.

## Regra de documento vivo
- Toda mudança de implementação que altera comportamento descrito em spec deve atualizar a própria spec no mesmo ciclo.
- Toda spec em `in_progress` ou `partially_attended` deve listar pendências objetivas.
- Uma spec só pode ir para `attended` quando houver evidência verificavel (ticket fechado, execplan entregue, commit ou validação observavel).
- Toda spec derivada para execução deve explicitar assumptions/defaults adotados quando houver escolhas relevantes que não estejam 100% óbvias no texto original.
- Quando uma spec vier de `/run_specs`, o fluxo deve executar auditoria final após a rodada encadeada de tickets para decidir `attended/done` ou abrir follow-ups com causa-raiz objetiva.

## Rastreabilidade obrigatória
Cada spec deve manter links para os artefatos associados:
- ticket(s) em `tickets/open/` ou `tickets/closed/`;
- execplan(s) em `execplans/`;
- commit(s) relacionados a entrega.

Se o trabalho ainda estiver aberto, referencie o ticket/execplan em andamento.

## Regra de derivação (spec -> execução)
Ao revisar uma spec:
- derivar apenas tickets em `tickets/open/`, mesmo quando o escopo já estiver claro;
- criar execplan somente a partir do ticket, quando necessário para execução segura;
- implementar de forma sequencial e atualizar o status da spec;
- fechar ticket (quando existir) no mesmo commit da entrega.
- alinhamentos canônicos e de template não exigem migração retroativa em massa; material histórico só precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real.

## Convencao de nome para specs
Use:
- `docs/specs/<yyyy-mm-dd>-<slug>.md`

Exemplos:
- `docs/specs/2026-02-19-jornada-processamento-ticket-sequencial.md`
- `docs/specs/2026-02-19-controle-telegram-pause-resume.md`

## Qualidade minima da spec
Toda spec deve conter:
- metadata `Spec treatment` com valor `pending` ou `done`;
- objetivo e contexto;
- jornada(s) de uso e atores;
- requisitos funcionais;
- assumptions/defaults relevantes quando houver escolhas padrão;
- usar o heading canonico `## Assumptions and defaults` nas specs locais; o workflow aceita aliases conhecidos de entrada, como `## Premissas e defaults`, apenas como compatibilidade com specs externas ou legadas;
- critérios de aceitacao observaveis;
- quando a spec participar de `/run_specs`, a seção `Gate de validacao dos tickets derivados` com veredito, gaps, correções, causa-raiz provavel, ciclos executados e histórico estritamente funcional;
- quando a spec participar de `/run_specs`, a seção separada `Retrospectiva sistemica da derivacao dos tickets`, documentando ativacao/skip, classificação, confianca, frente causal, achados, artefatos consultados, elegibilidade de publication e resultado do ticket transversal ou limitação operacional;
- write-back da seção `Retrospectiva sistemica da derivacao dos tickets` só é permitido quando a execução ocorrer no próprio `codex-flow-runner`; em projeto externo, a superficie observavel desta fase e trace/log/resumo;
- restrições técnicas relevantes quando houver;
- validações obrigatórias/manuais pendentes quando houver;
- não-escopo;
- status de atendimento e pendências;
- registro final de auditoria quando o fluxo derivado já tiver sido executado;
- evidências e rastreabilidade.
