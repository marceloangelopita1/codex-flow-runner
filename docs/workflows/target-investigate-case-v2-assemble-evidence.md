# Assemble Evidence

Objetivo: decidir quais evidências são necessárias, como coletá-las e como indexá-las auditavelmente.

Saída mínima:
- `evidence-index.json`
- `case-bundle.json`

Regras:
- use apenas superfícies e estratégias declaradas no manifesto;
- `case-bundle.json` deve referenciar `evidence-index.json`;
- evite duplicação indiscriminada do inventário bruto;
- trate o envelope JSON como guia de automação, não como motivo para distorcer a evidência ou bloquear o diagnóstico.
