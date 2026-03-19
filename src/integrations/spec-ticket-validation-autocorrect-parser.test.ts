import assert from "node:assert/strict";
import test from "node:test";
import {
  parseSpecTicketValidationAutoCorrectOutput,
  SpecTicketValidationAutoCorrectParserError,
} from "./spec-ticket-validation-autocorrect-parser.js";

const buildValidOutput = (): string =>
  [
    "Analise concluida.",
    "[[SPEC_TICKET_AUTOCORRECT]]",
    "```json",
    JSON.stringify(
      {
        appliedCorrections: [
          {
            description: "Adicionar explicacao de menor causa plausivel ao ticket.",
            affectedArtifactPaths: ["tickets/open/example.md"],
            linkedGapTypes: ["documentation-compliance-gap"],
            outcome: "applied",
          },
        ],
      },
      null,
      2,
    ),
    "```",
    "[[/SPEC_TICKET_AUTOCORRECT]]",
  ].join("\n");

test("parseia bloco valido da autocorrecao com correcoes aplicadas reais", () => {
  const parsed = parseSpecTicketValidationAutoCorrectOutput(buildValidOutput());

  assert.deepEqual(parsed, [
    {
      description: "Adicionar explicacao de menor causa plausivel ao ticket.",
      affectedArtifactPaths: ["tickets/open/example.md"],
      linkedGapTypes: ["documentation-compliance-gap"],
      outcome: "applied",
    },
  ]);
});

test("rejeita resposta sem bloco estruturado da autocorrecao", () => {
  assert.throws(
    () => parseSpecTicketValidationAutoCorrectOutput("{}"),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationAutoCorrectParserError);
      assert.match(error.message, /SPEC_TICKET_AUTOCORRECT/u);
      return true;
    },
  );
});

test("rejeita linkedGapTypes ou outcome fora da taxonomia fechada", () => {
  const invalidGapType = buildValidOutput().replace(
    '"documentation-compliance-gap"',
    '"invented-gap"',
  );
  assert.throws(
    () => parseSpecTicketValidationAutoCorrectOutput(invalidGapType),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationAutoCorrectParserError);
      assert.match(error.message, /linkedGapTypes invalido/u);
      return true;
    },
  );

  const invalidOutcome = buildValidOutput().replace('"applied"', '"done"');
  assert.throws(
    () => parseSpecTicketValidationAutoCorrectOutput(invalidOutcome),
    (error: unknown) => {
      assert.ok(error instanceof SpecTicketValidationAutoCorrectParserError);
      assert.match(error.message, /outcome invalido/u);
      return true;
    },
  );
});
