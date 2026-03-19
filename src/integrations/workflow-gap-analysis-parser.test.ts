import assert from "node:assert/strict";
import test from "node:test";
import {
  WorkflowGapAnalysisParserError,
  parseWorkflowGapAnalysisOutput,
} from "./workflow-gap-analysis-parser.js";

const buildOutput = (payload: Record<string, unknown>): string =>
  [
    "Analise concluida.",
    "",
    "[[WORKFLOW_GAP_ANALYSIS]]",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "[[/WORKFLOW_GAP_ANALYSIS]]",
  ].join("\n");

test("parseWorkflowGapAnalysisOutput aceita systemic-gap elegivel para publication", () => {
  const parsed = parseWorkflowGapAnalysisOutput(
    buildOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "follow-up-tickets",
      summary: "O workflow contribuiu materialmente para o gap residual.",
      causalHypothesis: "A retrospectiva pos-auditoria ainda nao tinha contrato parseavel proprio.",
      benefitSummary: "Formalizar o contrato reduz recorrencia futura.",
      findings: [
        {
          summary: "Falta um contrato parseavel dedicado para workflow-gap-analysis.",
          affectedArtifactPaths: ["src/core/runner.ts"],
          requirementRefs: ["RF-05", "CA-05"],
          evidence: ["A etapa placeholder nao distinguia high, medium e low."],
        },
      ],
      workflowArtifactsConsulted: ["AGENTS.md", "prompts/11-retrospectiva-workflow-apos-spec-audit.md"],
      followUpTicketPaths: ["tickets/open/2026-03-19-gap.md"],
      limitation: null,
    }),
  );

  assert.equal(parsed.classification, "systemic-gap");
  assert.equal(parsed.publicationEligibility, true);
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.followUpTicketPaths[0], "tickets/open/2026-03-19-gap.md");
});

test("parseWorkflowGapAnalysisOutput aceita systemic-hypothesis com medium confidence", () => {
  const parsed = parseWorkflowGapAnalysisOutput(
    buildOutput({
      classification: "systemic-hypothesis",
      confidence: "medium",
      publicationEligibility: false,
      inputMode: "spec-and-audit-fallback",
      summary: "Ha hipotese sistemica observavel, mas ainda parcial.",
      causalHypothesis: "A ordem de leitura canonica nao esta forte o bastante.",
      benefitSummary: "Melhorar o prompt pode reduzir retrabalho.",
      findings: [
        {
          summary: "A leitura de AGENTS.md e prompts nao esta forte o bastante.",
          affectedArtifactPaths: ["prompts/11-retrospectiva-workflow-apos-spec-audit.md"],
          requirementRefs: ["RF-12"],
          evidence: ["Foi necessario fallback spec + audit."],
        },
      ],
      workflowArtifactsConsulted: ["../codex-flow-runner/AGENTS.md"],
      followUpTicketPaths: [],
      limitation: null,
    }),
  );

  assert.equal(parsed.classification, "systemic-hypothesis");
  assert.equal(parsed.confidence, "medium");
  assert.equal(parsed.publicationEligibility, false);
});

test("parseWorkflowGapAnalysisOutput rejeita publicationEligibility fora de systemic-gap/high", () => {
  assert.throws(
    () =>
      parseWorkflowGapAnalysisOutput(
        buildOutput({
          classification: "not-systemic",
          confidence: "low",
          publicationEligibility: true,
          inputMode: "spec-and-audit-fallback",
          summary: "Nao ha evidencia sistemica.",
          causalHypothesis: "O problema e local.",
          benefitSummary: "Nenhum.",
          findings: [],
          workflowArtifactsConsulted: ["AGENTS.md"],
          followUpTicketPaths: [],
          limitation: null,
        }),
      ),
    (error) =>
      error instanceof WorkflowGapAnalysisParserError &&
      /publicationEligibility=true/u.test(error.message),
  );
});

test("parseWorkflowGapAnalysisOutput exige limitation em operational-limitation", () => {
  assert.throws(
    () =>
      parseWorkflowGapAnalysisOutput(
        buildOutput({
          classification: "operational-limitation",
          confidence: "low",
          publicationEligibility: false,
          inputMode: "spec-and-audit-fallback",
          summary: "Analise indisponivel.",
          causalHypothesis: "Sem contexto suficiente.",
          benefitSummary: "Nenhum.",
          findings: [],
          workflowArtifactsConsulted: ["../codex-flow-runner/AGENTS.md"],
          followUpTicketPaths: [],
          limitation: null,
        }),
      ),
    (error) =>
      error instanceof WorkflowGapAnalysisParserError &&
      /classification=operational-limitation exige o objeto limitation/u.test(error.message),
  );
});
