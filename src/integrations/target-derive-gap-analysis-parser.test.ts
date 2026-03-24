import assert from "node:assert/strict";
import test from "node:test";
import {
  TargetDeriveGapAnalysisParserError,
  parseTargetDeriveGapAnalysisOutput,
} from "./target-derive-gap-analysis-parser.js";

const buildOutput = (payload: unknown): string =>
  [
    "texto irrelevante",
    "[[TARGET_DERIVE_GAP_ANALYSIS]]",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "[[/TARGET_DERIVE_GAP_ANALYSIS]]",
  ].join("\n");

test("parseTargetDeriveGapAnalysisOutput aceita bloco estruturado com gap materializavel", () => {
  const result = parseTargetDeriveGapAnalysisOutput(
    buildOutput({
      summary: "Resumo editorial curto.",
      gaps: [
        {
          title: "Falta script seguro para validacao local",
          summary:
            "O projeto nao expoe comando seguro de validacao para comprovar readiness no checkup.",
          gapType: "validation",
          checkupDimension: "validation_delivery_health",
          materializationDecision: "materialize",
          remediationSurface: ["package.json", "README.md"],
          evidence: ["package.json presente sem scripts suportados na allowlist do checkup."],
          assumptionsDefaults: [
            "O projeto usa package.json como superficie canonica para comandos locais.",
          ],
          validationNotes: ["Rodar npm test apos adicionar o script seguro."],
          closureCriteria: ["`npm test` conclui com exit code 0 no projeto alvo."],
          fingerprintBasis: [
            "validation_delivery_health",
            "package.json sem scripts suportados",
            "surface: package.json",
          ],
          priority: {
            severity: 4,
            frequency: 5,
            costOfDelay: 4,
            operationalRisk: 3,
          },
          externalDependency: null,
        },
      ],
    }),
  );

  assert.equal(result.summary, "Resumo editorial curto.");
  assert.equal(result.gaps.length, 1);
  assert.equal(result.gaps[0]?.gapType, "validation");
  assert.equal(result.gaps[0]?.materializationDecision, "materialize");
  assert.deepEqual(result.gaps[0]?.remediationSurface, ["package.json", "README.md"]);
});

test("parseTargetDeriveGapAnalysisOutput rejeita gap sem fingerprintBasis", () => {
  assert.throws(
    () =>
      parseTargetDeriveGapAnalysisOutput(
        buildOutput({
          summary: "Resumo",
          gaps: [
            {
              title: "Gap incompleto",
              summary: "Sem base suficiente.",
              gapType: "documentation",
              checkupDimension: "documentation_governance",
              materializationDecision: "insufficient_specificity",
              remediationSurface: ["README.md"],
              evidence: ["README vazio."],
              assumptionsDefaults: [],
              validationNotes: [],
              closureCriteria: ["README atualizado."],
              fingerprintBasis: [],
              priority: {
                severity: 2,
                frequency: 2,
                costOfDelay: 2,
                operationalRisk: 2,
              },
              externalDependency: null,
            },
          ],
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof TargetDeriveGapAnalysisParserError);
      assert.match(error.message, /fingerprintBasis/u);
      return true;
    },
  );
});

test("parseTargetDeriveGapAnalysisOutput rejeita matriz de prioridade fora da faixa valida", () => {
  assert.throws(
    () =>
      parseTargetDeriveGapAnalysisOutput(
        buildOutput({
          summary: "Resumo",
          gaps: [
            {
              title: "Gap com score invalido",
              summary: "Um eixo saiu da faixa permitida.",
              gapType: "operability",
              checkupDimension: "local_operability",
              materializationDecision: "materialize",
              remediationSurface: ["package.json"],
              evidence: ["Sem script check."],
              assumptionsDefaults: [],
              validationNotes: [],
              closureCriteria: ["Existe comando check suportado."],
              fingerprintBasis: ["local_operability", "package.json sem check"],
              priority: {
                severity: 6,
                frequency: 2,
                costOfDelay: 2,
                operationalRisk: 2,
              },
              externalDependency: null,
            },
          ],
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof TargetDeriveGapAnalysisParserError);
      assert.match(error.message, /entre 1 e 5/u);
      return true;
    },
  );
});

test("parseTargetDeriveGapAnalysisOutput exige externalDependency para gap blocked", () => {
  assert.throws(
    () =>
      parseTargetDeriveGapAnalysisOutput(
        buildOutput({
          summary: "Resumo",
          gaps: [
            {
              title: "Dependencia externa sem dono declarado",
              summary: "Falta decisao de infraestrutura.",
              gapType: "operability",
              checkupDimension: "local_operability",
              materializationDecision: "blocked",
              remediationSurface: ["docs/workflows/"],
              evidence: ["A execucao depende de credenciais fora do repo."],
              assumptionsDefaults: [],
              validationNotes: [],
              closureCriteria: ["A decisao externa fica registrada no repositorio alvo."],
              fingerprintBasis: ["local_operability", "credenciais externas"],
              priority: {
                severity: 3,
                frequency: 3,
                costOfDelay: 4,
                operationalRisk: 3,
              },
              externalDependency: null,
            },
          ],
        }),
      ),
    (error: unknown) => {
      assert.ok(error instanceof TargetDeriveGapAnalysisParserError);
      assert.match(error.message, /externalDependency/u);
      return true;
    },
  );
});
