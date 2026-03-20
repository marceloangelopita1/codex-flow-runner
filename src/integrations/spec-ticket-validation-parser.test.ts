import assert from "node:assert/strict";
import test from "node:test";
import {
  SpecTicketValidationParserError,
  parseSpecTicketValidationOutput,
} from "./spec-ticket-validation-parser.js";

const buildValidOutput = (): string => {
  return [
    "Analise concluida.",
    "[[SPEC_TICKET_VALIDATION]]",
    "```json",
    JSON.stringify(
      {
        verdict: "GO",
        confidence: "high",
        summary: "Pacote derivado suficiente para prosseguir com /run-all.",
        gaps: [
          {
            gapType: "documentation-compliance-gap",
            summary: "Um ticket ainda usava wording antigo de closure.",
            affectedArtifactPaths: [
              "tickets/open/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md",
            ],
            requirementRefs: ["RF-11", "CA-06"],
            evidence: [
              "Ticket agora explicita evidencias objetivas e taxonomia fixa.",
            ],
            probableRootCause: "ticket",
            isAutoCorrectable: false,
          },
        ],
        appliedCorrections: [
          {
            description: "Normalizar closure criteria do ticket para o protocolo atual.",
            affectedArtifactPaths: [
              "tickets/open/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md",
            ],
            linkedGapTypes: ["documentation-compliance-gap"],
            outcome: "applied",
          },
        ],
      },
      null,
      2,
    ),
    "```",
    "[[/SPEC_TICKET_VALIDATION]]",
  ].join("\n");
};

test("parseia bloco valido com taxonomia aprovada, evidencias, causa-raiz e confianca final", () => {
  const parsed = parseSpecTicketValidationOutput(buildValidOutput());

  assert.equal(parsed.verdict, "GO");
  assert.equal(parsed.confidence, "high");
  assert.match(parsed.summary, /suficiente/u);
  assert.equal(parsed.gaps.length, 1);
  assert.deepEqual(parsed.gaps[0], {
    gapType: "documentation-compliance-gap",
    summary: "Um ticket ainda usava wording antigo de closure.",
    affectedArtifactPaths: [
      "tickets/open/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md",
    ],
    requirementRefs: ["RF-11", "CA-06"],
    evidence: ["Ticket agora explicita evidencias objetivas e taxonomia fixa."],
    probableRootCause: "ticket",
    isAutoCorrectable: false,
  });
  assert.deepEqual(parsed.appliedCorrections, [
    {
      description: "Normalizar closure criteria do ticket para o protocolo atual.",
      affectedArtifactPaths: [
        "tickets/open/2026-03-19-spec-ticket-validation-criterios-taxonomia-e-autocorrecao.md",
      ],
      linkedGapTypes: ["documentation-compliance-gap"],
      outcome: "applied",
    },
  ]);
});

test("rejeita gap fora da allowlist aprovada", () => {
  const output = buildValidOutput().replace(
    '"documentation-compliance-gap"',
    '"unknown-gap"',
  );

  assert.throws(
    () => parseSpecTicketValidationOutput(output),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationParserError);
      assert.match(error.message, /gapType invalido/u);
      return true;
    },
  );
});

test("rejeita confidence ou probableRootCause fora da taxonomia fechada", () => {
  const invalidConfidence = buildValidOutput().replace('"high"', '"strong"');
  assert.throws(
    () => parseSpecTicketValidationOutput(invalidConfidence),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationParserError);
      assert.match(error.message, /confidence invalido/u);
      return true;
    },
  );

  const invalidRootCause = buildValidOutput().replace('"ticket"', '"systemic-instruction"');
  assert.throws(
    () => parseSpecTicketValidationOutput(invalidRootCause),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationParserError);
      assert.match(error.message, /probableRootCause invalido/u);
      return true;
    },
  );
});

test("rejeita bloco com campos obrigatorios ausentes", () => {
  const output = [
    "[[SPEC_TICKET_VALIDATION]]",
    JSON.stringify({
      verdict: "NO_GO",
      confidence: "medium",
      gaps: [],
      appliedCorrections: [],
    }),
    "[[/SPEC_TICKET_VALIDATION]]",
  ].join("\n");

  assert.throws(
    () => parseSpecTicketValidationOutput(output),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationParserError);
      assert.match(error.message, /campo obrigatorio "summary"/u);
      return true;
    },
  );
});
