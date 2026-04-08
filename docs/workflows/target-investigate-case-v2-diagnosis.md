# Diagnosis

Objetivo: avaliar o `case-bundle.json` e responder se o caso esta `ok`, `not_ok` ou `inconclusive`.

Saida minima:
- `diagnosis.md`
- `diagnosis.json`

Regras:
- o diagnostico deve ser legivel por humano em menos de 2 minutos;
- `diagnosis.json` e a superficie machine-readable canonica;
- `assessment.json` pode existir apenas como compatibilidade runner-side, sem virar artefato primario.
