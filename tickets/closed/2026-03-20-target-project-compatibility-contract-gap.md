# [TICKET] Documentar o contrato canonico de compatibilidade do projeto alvo

## Metadata
- Status: closed
- Priority: P2
- Severity: S3
- Created at (UTC): 2026-03-20 01:57Z
- Reporter: Codex
- Owner:
- Source: local-run
- Parent ticket (optional):
- Parent execplan (optional):
- Parent commit (optional):
- Request ID:
- Source spec (when applicable): docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
- Source requirements (RFs/CAs, when applicable): RF-37, RF-38, RF-39, RF-40, RF-41, RF-42; CA-18, CA-19, CA-20
- Inherited assumptions/defaults (when applicable): `docs/workflows/target-project-compatibility-contract.md` e o caminho canonico do contrato; `/discover_spec` e `/plan_spec` podem operar sobre projeto elegivel para descoberta; `/run_specs` e o workflow completo pressupoe projeto compativel com o workflow completo; essa compatibilidade e pre-requisito operacional do onboarding humano e nao validacao semantica de runtime.
- Workflow root cause (required only for tickets created from post-implementation audit/review):
- Smallest plausible explanation (audit/review only):
- Remediation scope (audit/review only):
- Related artifacts:
  - Request file:
  - Response file:
  - Log file:
- Related docs/execplans:
  - docs/specs/2026-03-20-separacao-validacao-funcional-e-retrospectiva-sistemica-da-derivacao-no-pre-run-all.md
  - README.md
  - AGENTS.md
  - docs/workflows/

## Classificacao de risco (check-up nao funcional, quando aplicavel)
- Matriz aplicavel: nao
- Severidade (1-5):
- Frequencia (1-5):
- Custo de atraso (1-5):
- Risco operacional (1-5):
- Score ponderado (10-50):
- Prioridade resultante (`P0` | `P1` | `P2`):
- Justificativa objetiva (evidencias e impacto): o repositorio ainda nao possui `docs/workflows/target-project-compatibility-contract.md`; `README.md` nao aponta para esse contrato e continua sugerindo que a triagem da spec pode gerar `execplans` diretamente; `AGENTS.md` nao tem o ponteiro curto exigido para o contrato de compatibilidade. O gap e documental e de onboarding, sem bloquear diretamente a fila de tickets.

## Context
- Workflow area: documentacao canonica e onboarding operacional
- Scenario: o operador precisa entender quando um projeto pode usar apenas descoberta/refinamento de spec e quando ele esta pronto para o workflow completo com `/run_specs`
- Input constraints: nao introduzir preflight semantico em runtime; manter a documentacao curta em `AGENTS.md` e normativa no documento canonico

## Problem statement
Falta o documento canonico que diferencie `projeto elegivel para descoberta` de `projeto compativel com o workflow completo`. Como consequencia, `README.md` nao resume esse pre-requisito operacional nem aponta para a referencia correta, e `AGENTS.md` nao oferece o ponteiro curto solicitado pela spec.

## Observed behavior
- O que foi observado: `docs/workflows/target-project-compatibility-contract.md` nao existe; `README.md` descreve `/run_specs` como uma triagem que pode abrir tickets e/ou gerar execplans e nao explicita que compatibilidade do projeto alvo e pre-requisito operacional; `AGENTS.md` lista docs obrigatorias, mas nao referencia o contrato de compatibilidade.
- Frequencia (unico, recorrente, intermitente): recorrente
- Como foi detectado (warning/log/test/assert): leitura de `README.md`, `AGENTS.md` e verificacao da ausencia do documento canonico em `docs/workflows/`

## Expected behavior
O repositorio deve ter um documento canonico curto e normativo explicando a diferenca entre elegibilidade para descoberta e compatibilidade com o workflow completo, apontado por `README.md` e resumido por um ponteiro breve em `AGENTS.md`.

## Reproduction steps
1. Verificar que `docs/workflows/target-project-compatibility-contract.md` nao existe.
2. Ler `README.md` e confirmar que nao ha ponteiro para o contrato e que a narrativa de `/run_specs` ainda fala em gerar `execplans` diretamente a partir da triagem da spec.
3. Ler `AGENTS.md` e confirmar que nao existe um ponteiro curto para o contrato de compatibilidade.

## Evidence
- Logs relevantes (trechos curtos e redigidos): n/a nesta analise documental
- Warnings/codes relevantes:
  - ausencia objetiva de `docs/workflows/target-project-compatibility-contract.md`
  - `README.md` descreve `/run_specs` como triagem que pode abrir tickets em `tickets/open/` e/ou gerar `execplans`
  - `AGENTS.md` nao referencia o contrato de compatibilidade do projeto alvo
- Comparativo antes/depois (se houver): antes = contrato difuso e onboarding mais suscetivel a interpretacao incorreta; depois esperado = contrato documental unico, README resumido e AGENTS com ponteiro curto

## Impact assessment
- Impacto funcional: baixo no runtime atual, porque o runner nao faz preflight semantico de compatibilidade.
- Impacto operacional: medio, porque operadores podem acionar `/run_specs` em projetos nao preparados e interpretar a falha como problema semantico do runner.
- Risco de regressao: baixo, limitado a documentacao e alinhamento de onboarding.
- Scope estimado (quais fluxos podem ser afetados): `docs/workflows/target-project-compatibility-contract.md`, `README.md`, `AGENTS.md`

## Initial hypotheses (optional)
- O comportamento atual do runner ja nao gasta tokens com um preflight de compatibilidade dedicado; a lacuna principal esta em tornar esse contrato explicito para humanos e para instrucoes de IA.

## Proposed solution (optional)
Criar o documento canonico em `docs/workflows/target-project-compatibility-contract.md`, ajustar `README.md` para apontar para ele e corrigir a narrativa de derivacao `spec -> tickets -> execplan`, e adicionar em `AGENTS.md` apenas um ponteiro curto sem duplicacao normativa.

## Closure criteria
Defina evidencias objetivas para encerrar o ticket.
- Requisito/RF/CA coberto: RF-37, RF-38, RF-39, RF-40, RF-41, RF-42; CA-18, CA-19, CA-20
- Evidencia observavel: o novo documento canonico existe em `docs/workflows/target-project-compatibility-contract.md`; `README.md` passa a resumir o contrato como pre-requisito operacional e aponta para o documento; `AGENTS.md` passa a conter apenas um ponteiro curto para esse contrato; a narrativa de derivacao deixa de sugerir `execplans` diretos a partir da spec.

## Decision log
- 2026-03-20 - Ticket aberto a partir da avaliacao da spec - o contrato de compatibilidade do projeto alvo ainda nao foi materializado na documentacao canonica nem resumido nas superfices de onboarding.
- 2026-03-20 - Diff, ticket, ExecPlan, spec de origem e checklist de `docs/workflows/codex-quality-gates.md` relidos na etapa de fechamento; os closure criteria foram validados com evidencia objetiva apenas sobre a entrega documental atual.

## Closure
- Closed at (UTC): 2026-03-20 03:41Z
- Closure reason: fixed
- Related PR/commit/execplan:
  - ExecPlan: `execplans/2026-03-20-target-project-compatibility-contract-gap.md`
  - Commit: mesmo changeset de fechamento versionado pelo runner.
- Follow-up ticket (required when `Closure reason: split-follow-up`): N/A
- Resultado final do fechamento: `GO`
- Evidencia objetiva por closure criterion:
  - `RF-37`, `RF-38`, `RF-39`, `RF-40`; `CA-18`: `docs/workflows/target-project-compatibility-contract.md` existe e registra as duas categorias do contrato, os fluxos permitidos e a regra de pre-requisito operacional sem preflight semantico de runtime nas linhas 3-40; validacao executada com `nl -ba docs/workflows/target-project-compatibility-contract.md | sed -n '1,120p'`.
  - `RF-41`; `CA-19`: `README.md` resume o contrato como pre-requisito operacional, aponta para o documento canonico e atualiza o fluxo de `/run_specs` para triagem em projeto compativel com o workflow completo e derivacao `spec -> tickets -> execplan` nas linhas 65-113; validacao executada com `nl -ba README.md | sed -n '64,125p'`.
  - `RF-42`; `CA-20`: `AGENTS.md` passou a conter apenas um ponteiro curto para o contrato canonico, sem duplicacao normativa, nas linhas 36-41; validacao executada com `nl -ba AGENTS.md | sed -n '32,48p'`.
  - Closure criterion adicional sobre narrativa de derivacao: `README.md` nao contem mais sugestao de derivacao direta `spec -> execplan`; validacao executada com `rg -n 'spec -> execplan|triagem pode abrir tickets|gerar execplans|gera execplans' README.md` -> sem matches.
- Entrega tecnica concluida:
  - o contrato canonico do projeto alvo foi materializado em documento unico;
  - `README.md` passou a orientar onboarding e derivacao pelo fluxo `spec -> tickets -> execplan`;
  - `AGENTS.md` permaneceu enxuto, com apenas o ponteiro curto exigido por `DOCUMENTATION.md`.
- Validacoes executadas:
  - `nl -ba docs/workflows/target-project-compatibility-contract.md | sed -n '1,120p'`
  - `nl -ba README.md | sed -n '64,125p'`
  - `nl -ba AGENTS.md | sed -n '32,48p'`
  - `rg -n 'spec -> execplan|triagem pode abrir tickets|gerar execplans|gera execplans' README.md` -> sem matches.
- Validacao manual externa pendente: nao.
