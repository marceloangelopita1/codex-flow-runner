# Prompt: Materializar Spec Planejada

Materialize a spec planejada abaixo fora do modo `/plan`, criando apenas o arquivo de spec esperado.

Spec alvo:
- <SPEC_PATH>

Arquivo da spec:
- <SPEC_FILE_NAME>

Fluxo de origem:
- <SPEC_SOURCE_COMMAND>

Titulo final aprovado:
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

Nao-escopo aprovado:
<SPEC_NON_SCOPE>

Restricoes tecnicas aprovadas:
<SPEC_TECHNICAL_CONSTRAINTS>

Validacoes obrigatorias aprovadas:
<SPEC_MANDATORY_VALIDATIONS>

Validacoes manuais pendentes:
<SPEC_PENDING_MANUAL_VALIDATIONS>

Riscos conhecidos:
<SPEC_KNOWN_RISKS>

Assumptions and defaults aprovados:
<SPEC_ASSUMPTIONS_AND_DEFAULTS>

Decisoes e trade-offs aprovados:
<SPEC_DECISIONS_AND_TRADE_OFFS>

Regras obrigatorias:
- Fluxo sequencial; execute somente esta etapa.
- Nao fechar ticket interno nesta etapa.
- Nao executar commit/push nesta etapa.
- Nao commitar segredos.
- Criar exatamente `docs/specs/YYYY-MM-DD-<slug>.md` no caminho `<SPEC_PATH>`, sem gerar variacoes extras.
- Inicializar metadata da spec com:
  - `Status: approved`
  - `Spec treatment: pending`

Tarefa:
1. Criar o arquivo `<SPEC_PATH>` com base no bloco final estruturado aprovado.
2. Materializar a spec usando todo o contexto estruturado aprovado, sem comprimir RFs/CAs/jornada em um resumo generico.
3. Garantir que o documento siga o padrao de spec do repositorio (`SPECS.md` / `docs/specs/templates/spec-template.md`).
4. Preencher metadata inicial obrigatoria (`Status: approved`, `Spec treatment: pending`).
5. Preservar explicitamente:
   - objetivo;
   - atores e jornada;
   - requisitos funcionais;
   - criterios de aceitacao;
   - assumptions/defaults aprovados;
   - decisoes e trade-offs relevantes;
   - nao-escopo;
   - restricoes tecnicas;
   - validacoes obrigatorias;
   - validacoes manuais pendentes;
   - riscos conhecidos.
6. Reportar no final:
   - arquivo criado;
   - confirmacao dos metadados iniciais;
   - pendencias remanescentes (se houver).
