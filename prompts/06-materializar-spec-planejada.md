# Prompt: Materializar Spec Planejada

Materialize a spec planejada abaixo fora do modo `/plan`, criando apenas o arquivo de spec esperado.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Fluxo de origem:
- <SPEC_SOURCE_COMMAND>

Título final aprovado:
- <SPEC_TITLE>

Resumo final aprovado:
- <SPEC_SUMMARY>

Objetivo aprovado:
- <SPEC_OBJECTIVE>

Atores aprovados:
<SPEC_ACTORS>

Jornada aprovada:
<SPEC_JOURNEY>

RFs aprovados:
<SPEC_REQUIREMENTS>

CAs aprovados:
<SPEC_ACCEPTANCE_CRITERIA>

Não-escopo aprovado:
<SPEC_NON_SCOPE>

Restrições técnicas aprovadas:
<SPEC_TECHNICAL_CONSTRAINTS>

Validações obrigatórias aprovadas:
<SPEC_MANDATORY_VALIDATIONS>

Validações manuais pendentes:
<SPEC_PENDING_MANUAL_VALIDATIONS>

Riscos conhecidos:
<SPEC_KNOWN_RISKS>

Assumptions and defaults aprovados:
<SPEC_ASSUMPTIONS_AND_DEFAULTS>

Decisões e trade-offs aprovados:
<SPEC_DECISIONS_AND_TRADE_OFFS>

Regras obrigatórias:
- Fluxo sequencial; execute somente esta etapa.
- Não fechar ticket interno nesta etapa.
- Não executar commit/push nesta etapa.
- Não commitar segredos.
- Criar exatamente `docs/specs/YYYY-MM-DD-<slug>.md` no caminho `<SPEC_PATH>`, sem gerar variacoes extras.
- Inicializar metadata da spec com:
  - `Status: approved`
  - `Spec treatment: pending`

Tarefa:
1. Criar o arquivo `<SPEC_PATH>` com base no bloco final estruturado aprovado.
2. Materializar a spec usando todo o contexto estruturado aprovado, sem comprimir RFs/CAs/jornada em um resumo genérico.
3. Garantir que o documento siga o padrão de spec do repositório (`SPECS.md` / `docs/specs/templates/spec-template.md`).
4. Preencher metadata inicial obrigatória (`Status: approved`, `Spec treatment: pending`).
5. Preservar explicitamente:
   - objetivo;
   - atores e jornada;
   - requisitos funcionais;
   - critérios de aceitacao;
   - assumptions/defaults aprovados;
   - decisões e trade-offs relevantes;
   - não-escopo;
   - restrições técnicas;
   - validações obrigatórias;
   - validações manuais pendentes;
   - riscos conhecidos.
6. Reportar no final:
   - arquivo criado;
   - confirmacao dos metadados iniciais;
   - pendências remanescentes (se houver).
