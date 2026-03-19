import {
  SPEC_TICKET_VALIDATION_CONFIDENCE_LEVELS,
  SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES,
  SPEC_TICKET_VALIDATION_GAP_TYPES,
  SPEC_TICKET_VALIDATION_PROBABLE_ROOT_CAUSES,
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationConfidenceLevel,
  SpecTicketValidationCorrectionOutcome,
  SpecTicketValidationGap,
  SpecTicketValidationGapType,
  SpecTicketValidationPassResult,
  SpecTicketValidationProbableRootCause,
  SpecTicketValidationVerdict,
} from "../types/spec-ticket-validation.js";

const SPEC_TICKET_VALIDATION_BLOCK_OPEN = "[[SPEC_TICKET_VALIDATION]]";
const SPEC_TICKET_VALIDATION_BLOCK_CLOSE = "[[/SPEC_TICKET_VALIDATION]]";
const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

const GAP_TYPE_ALIASES = new Map<string, SpecTicketValidationGapType>(
  SPEC_TICKET_VALIDATION_GAP_TYPES.map((value) => [value, value]),
);
const ROOT_CAUSE_ALIASES = new Map<string, SpecTicketValidationProbableRootCause>(
  SPEC_TICKET_VALIDATION_PROBABLE_ROOT_CAUSES.map((value) => [value, value]),
);
const CONFIDENCE_ALIASES = new Map<string, SpecTicketValidationConfidenceLevel>(
  SPEC_TICKET_VALIDATION_CONFIDENCE_LEVELS.map((value) => [value, value]),
);
const CORRECTION_OUTCOME_ALIASES = new Map<string, SpecTicketValidationCorrectionOutcome>(
  SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES.map((value) => [value, value]),
);

ROOT_CAUSE_ALIASES.set("external-manual", "external/manual");

export class SpecTicketValidationParserError extends Error {
  constructor(details: string) {
    super(`Falha ao parsear o bloco de spec-ticket-validation: ${details}`);
    this.name = "SpecTicketValidationParserError";
  }
}

export const parseSpecTicketValidationOutput = (
  output: string,
): SpecTicketValidationPassResult => {
  const normalized = normalizeValidationOutput(output);
  const blockBody = extractValidationBlockBody(normalized);
  const payload = parseValidationPayload(blockBody);

  return {
    verdict: normalizeVerdict(readString(payload.verdict, "verdict")),
    confidence: normalizeConfidence(readString(payload.confidence, "confidence")),
    summary: readString(payload.summary, "summary"),
    gaps: parseGapList(payload.gaps),
    appliedCorrections: parseAppliedCorrectionList(payload.appliedCorrections),
  };
};

const normalizeValidationOutput = (value: string): string => {
  return value
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n");
};

const extractValidationBlockBody = (value: string): string => {
  const start = value.indexOf(SPEC_TICKET_VALIDATION_BLOCK_OPEN);
  if (start < 0) {
    throw new SpecTicketValidationParserError(
      "bloco [[SPEC_TICKET_VALIDATION]] ausente na resposta do gate.",
    );
  }

  const contentStart = start + SPEC_TICKET_VALIDATION_BLOCK_OPEN.length;
  const end = value.indexOf(SPEC_TICKET_VALIDATION_BLOCK_CLOSE, contentStart);
  if (end < 0) {
    throw new SpecTicketValidationParserError(
      "bloco [[/SPEC_TICKET_VALIDATION]] ausente na resposta do gate.",
    );
  }

  return value.slice(contentStart, end).trim();
};

const parseValidationPayload = (body: string): Record<string, unknown> => {
  const stripped = stripJsonFence(body);

  try {
    const parsed = JSON.parse(stripped);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new SpecTicketValidationParserError(
        "payload estruturado deve ser um objeto JSON no bloco do gate.",
      );
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SpecTicketValidationParserError) {
      throw error;
    }

    throw new SpecTicketValidationParserError(
      `payload JSON invalido no bloco do gate: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const stripJsonFence = (body: string): string => {
  const trimmed = body.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  return match?.[1]?.trim() ?? trimmed;
};

const readString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SpecTicketValidationParserError(
      `campo obrigatorio "${fieldName}" ausente ou vazio.`,
    );
  }

  return value.trim();
};

const readStringArray = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value)) {
    throw new SpecTicketValidationParserError(
      `campo obrigatorio "${fieldName}" deve ser uma lista.`,
    );
  }

  return value
    .map((entry, index) => {
      if (typeof entry !== "string" || entry.trim().length === 0) {
        throw new SpecTicketValidationParserError(
          `item ${String(index)} de "${fieldName}" deve ser string nao vazia.`,
        );
      }
      return entry.trim();
    })
    .filter((entry) => entry.length > 0);
};

const readBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new SpecTicketValidationParserError(
      `campo obrigatorio "${fieldName}" deve ser booleano.`,
    );
  }

  return value;
};

const parseGapList = (value: unknown): SpecTicketValidationGap[] => {
  if (!Array.isArray(value)) {
    throw new SpecTicketValidationParserError('campo obrigatorio "gaps" deve ser uma lista.');
  }

  return value.map((entry, index) => parseGap(entry, index));
};

const parseGap = (value: unknown, index: number): SpecTicketValidationGap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SpecTicketValidationParserError(
      `gap ${String(index)} deve ser um objeto estruturado.`,
    );
  }

  const payload = value as Record<string, unknown>;
  const evidence = readStringArray(payload.evidence, `gaps[${String(index)}].evidence`);
  if (evidence.length === 0) {
    throw new SpecTicketValidationParserError(
      `gap ${String(index)} precisa registrar pelo menos uma evidencia objetiva.`,
    );
  }

  return {
    gapType: normalizeGapType(readString(payload.gapType, `gaps[${String(index)}].gapType`)),
    summary: readString(payload.summary, `gaps[${String(index)}].summary`),
    affectedArtifactPaths: readStringArray(
      payload.affectedArtifactPaths,
      `gaps[${String(index)}].affectedArtifactPaths`,
    ),
    requirementRefs: readStringArray(
      payload.requirementRefs,
      `gaps[${String(index)}].requirementRefs`,
    ),
    evidence,
    probableRootCause: normalizeRootCause(
      readString(payload.probableRootCause, `gaps[${String(index)}].probableRootCause`),
    ),
    isAutoCorrectable: readBoolean(
      payload.isAutoCorrectable,
      `gaps[${String(index)}].isAutoCorrectable`,
    ),
  };
};

const parseAppliedCorrectionList = (
  value: unknown,
): SpecTicketValidationAppliedCorrection[] => {
  if (!Array.isArray(value)) {
    throw new SpecTicketValidationParserError(
      'campo obrigatorio "appliedCorrections" deve ser uma lista.',
    );
  }

  return value.map((entry, index) => parseAppliedCorrection(entry, index));
};

const parseAppliedCorrection = (
  value: unknown,
  index: number,
): SpecTicketValidationAppliedCorrection => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SpecTicketValidationParserError(
      `correcao aplicada ${String(index)} deve ser um objeto estruturado.`,
    );
  }

  const payload = value as Record<string, unknown>;
  const linkedGapTypes = readStringArray(
    payload.linkedGapTypes,
    `appliedCorrections[${String(index)}].linkedGapTypes`,
  ).map((entry) => normalizeGapType(entry));

  return {
    description: readString(payload.description, `appliedCorrections[${String(index)}].description`),
    affectedArtifactPaths: readStringArray(
      payload.affectedArtifactPaths,
      `appliedCorrections[${String(index)}].affectedArtifactPaths`,
    ),
    linkedGapTypes,
    outcome: normalizeCorrectionOutcome(
      readString(payload.outcome, `appliedCorrections[${String(index)}].outcome`),
    ),
  };
};

const normalizeVerdict = (value: string): SpecTicketValidationVerdict => {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/gu, "_");
  if (normalized === "GO" || normalized === "NO_GO") {
    return normalized;
  }

  throw new SpecTicketValidationParserError(
    `verdict invalido: "${value}". Use apenas GO ou NO_GO.`,
  );
};

const normalizeGapType = (value: string): SpecTicketValidationGapType => {
  const normalized = normalizeSlug(value);
  const resolved = GAP_TYPE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new SpecTicketValidationParserError(
    `gapType invalido: "${value}". Taxonomia permitida: ${SPEC_TICKET_VALIDATION_GAP_TYPES.join(", ")}.`,
  );
};

const normalizeRootCause = (value: string): SpecTicketValidationProbableRootCause => {
  const normalized = normalizeSlug(value, { preserveSlash: true });
  const resolved = ROOT_CAUSE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new SpecTicketValidationParserError(
    `probableRootCause invalido: "${value}". Valores permitidos: ${SPEC_TICKET_VALIDATION_PROBABLE_ROOT_CAUSES.join(", ")}.`,
  );
};

const normalizeConfidence = (value: string): SpecTicketValidationConfidenceLevel => {
  const normalized = normalizeSlug(value);
  const resolved = CONFIDENCE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new SpecTicketValidationParserError(
    `confidence invalido: "${value}". Valores permitidos: ${SPEC_TICKET_VALIDATION_CONFIDENCE_LEVELS.join(", ")}.`,
  );
};

const normalizeCorrectionOutcome = (value: string): SpecTicketValidationCorrectionOutcome => {
  const normalized = normalizeSlug(value);
  const resolved = CORRECTION_OUTCOME_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new SpecTicketValidationParserError(
    `outcome invalido: "${value}". Valores permitidos: ${SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES.join(", ")}.`,
  );
};

const normalizeSlug = (
  value: string,
  options: { preserveSlash?: boolean } = {},
): string => {
  const trimmed = value.trim().toLowerCase();
  const withoutExtraSpacing = trimmed.replace(/\s+/gu, "-").replace(/_+/gu, "-");
  return options.preserveSlash ? withoutExtraSpacing : withoutExtraSpacing.replace(/\//gu, "-");
};
