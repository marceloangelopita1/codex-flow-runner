# Diagnosis

Objetivo: avaliar o `case-bundle.json` e responder se o caso está `ok`, `not_ok` ou `inconclusive`.

Saída mínima:
- `diagnosis.md`
- `diagnosis.json`

Regras:
- o diagnóstico deve ser legível por humano em menos de 2 minutos;
- `diagnosis.json` é a superfície machine-readable canônica;
- o caminho mínimo termina com `case-resolution.json`, `evidence-index.json`, `case-bundle.json`, `diagnosis.md` e `diagnosis.json`;
- divergências de schema no JSON devem ser registradas como warnings de automação pelo runner, sem invalidar uma resposta diagnóstica útil.
