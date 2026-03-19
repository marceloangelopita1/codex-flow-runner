# SPECS.md

## Objetivo
Definir o padrao oficial para criacao e manutencao de especificacoes funcionais e jornadas de uso em `docs/specs/`.

Cada spec deve ser um **documento vivo**: alem de descrever o comportamento esperado, precisa informar de forma objetiva se ja esta atendida, parcialmente atendida ou ainda pendente.
Contrato oficial de derivacao: `spec -> tickets` e `ticket -> execplan` quando necessario.

## Onde ficam as specs
- Specs: `docs/specs/`
- Template oficial: `docs/specs/templates/spec-template.md`

## Quando criar uma spec
Crie uma spec quando houver qualquer um destes cenarios:
- nova funcionalidade ou mudanca relevante de comportamento;
- nova jornada de uso que impacta fluxo do runner;
- necessidade de consolidar regras de negocio antes de implementar;
- alinhamento de criterio de aceitacao entre produto e implementacao.

## Ciclo de vida da spec (status)
Status permitidos no campo `Status` de cada spec:
- `draft`: especificacao em elaboracao.
- `approved`: escopo aprovado e pronto para derivacao tecnica.
- `in_progress`: implementacao em andamento.
- `partially_attended`: parte da spec foi entregue, ainda ha pendencias.
- `attended`: criterios de aceitacao atendidos e com evidencia.
- `superseded`: spec substituida por uma versao mais nova.

## Metadata de tratamento da spec
Campo obrigatorio em `## Metadata` de toda spec:
- `Spec treatment: pending | done`

Semantica operacional:
- `pending`: ainda existe trabalho pendente derivado da spec (ex.: ticket em `tickets/open/`).
- `done`: nao existe pendencia aberta derivada da spec no momento.

Regras:
- `Spec treatment` e independente de `Status` e nao substitui o ciclo de vida funcional da spec.
- Em caso de divergencia documental, usar `tickets/open/` como fonte de verdade para classificar `pending`.
- Cada spec deve conter exatamente uma linha `Spec treatment`.

## Regra de documento vivo
- Toda mudanca de implementacao que altera comportamento descrito em spec deve atualizar a propria spec no mesmo ciclo.
- Toda spec em `in_progress` ou `partially_attended` deve listar pendencias objetivas.
- Uma spec so pode ir para `attended` quando houver evidencia verificavel (ticket fechado, execplan entregue, commit ou validacao observavel).
- Toda spec derivada para execucao deve explicitar assumptions/defaults adotados quando houver escolhas relevantes que nao estejam 100% obvias no texto original.
- Quando uma spec vier de `/run_specs`, o fluxo deve executar auditoria final apos a rodada encadeada de tickets para decidir `attended/done` ou abrir follow-ups com causa-raiz objetiva.

## Rastreabilidade obrigatoria
Cada spec deve manter links para os artefatos associados:
- ticket(s) em `tickets/open/` ou `tickets/closed/`;
- execplan(s) em `execplans/`;
- commit(s) relacionados a entrega.

Se o trabalho ainda estiver aberto, referencie o ticket/execplan em andamento.

## Regra de derivacao (spec -> execucao)
Ao revisar uma spec:
- derivar apenas tickets em `tickets/open/`, mesmo quando o escopo ja estiver claro;
- criar execplan somente a partir do ticket, quando necessario para execucao segura;
- implementar de forma sequencial e atualizar o status da spec;
- fechar ticket (quando existir) no mesmo commit da entrega.
- alinhamentos canonicos e de template nao exigem migracao retroativa em massa; material historico so precisa ser ajustado quando for tocado depois ou quando houver impacto funcional real.

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
- assumptions/defaults relevantes quando houver escolhas padrao;
- criterios de aceitacao observaveis;
- quando a spec participar de `/run_specs`, a secao `Gate de validacao dos tickets derivados` com veredito, gaps, correcoes, causa-raiz provavel e ciclos executados;
- restricoes tecnicas relevantes quando houver;
- validacoes obrigatorias/manuais pendentes quando houver;
- nao-escopo;
- status de atendimento e pendencias;
- registro final de auditoria quando o fluxo derivado ja tiver sido executado;
- evidencias e rastreabilidade.
