# Ticket Projection

Objetivo: transformar um diagnóstico estabilizado em `ticket-proposal.json` no namespace autoritativo do target.

Saída mínima:
- `ticket-proposal.json`

Regras:
- use este estágio só depois de `diagnosis` estabilizado e, quando existir, após `improvement-proposal`;
- a projeção não pode reabrir o diagnóstico;
- o artefato precisa respeitar `ticketPublicationPolicy` e as convenções declaradas pelo próprio projeto alvo;
- `ticket-proposal.json` é a única superfície canônica para a continuação runner-side de publication.
