# Deep Dive

Objetivo: aprofundar apenas as dúvidas causais que permaneceram abertas depois do `diagnosis`.

Saída mínima:
- `deep-dive.request.json`
- `deep-dive.result.json`

Regras:
- use este estágio só quando houver ambiguidade causal, baixa confiança ou necessidade real de localizar a menor mudança plausível;
- mantenha o escopo restrito às perguntas que ficaram abertas; não reabra o diagnóstico inteiro;
- preserve `ticket-projection` e `publication` como etapas posteriores, nunca como efeito implícito deste aprofundamento.
