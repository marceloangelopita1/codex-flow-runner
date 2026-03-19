import {
  SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES,
  SPEC_TICKET_VALIDATION_GAP_TYPES,
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationCorrectionOutcome,
  SpecTicketValidationGapType,
} from "../types/spec-ticket-validation.js";

const SPEC_TICKET_AUTOCORRECT_BLOCK_OPEN = "[[SPEC_TICKET_AUTOCORRECT]]";
const SPEC_TICKET_AUTOCORRECT_BLOCK_CLOSE = "[[/SPEC_TICKET_AUTOCORRECT]]";
const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

const GAP_TYPE_ALIASES = new Map<string, SpecTicketValidationGapType>(
  SPEC_TICKET_VALIDATION_GAP_TYPES.map((value) => [value, value]),
);
const CORRECTION_OUTCOME_ALIASES = new Map<string, SpecTicketValidationCorrectionOutcome>(
  SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES.map((value) => [value, value]),
);

export class SpecTicketValidationAutoCorrectParserError extends Error {
  constructor(details: string) {
    super(`Falha ao parsear o bloco de spec-ticket-autocorrect: ${details}`);
    this.name = "SpecTicketValidationAutoCorrectParserError";
  }
}

export const parseSpecTicketValidationAutoCorrectOutput = (
  output: string,
): SpecTicketValidationAppliedCorrection[] => {
  const normalized = normalizeAutoCorrectOutput(output);
  const blockBody = extractAutoCorrectBlockBody(normalized);
  const payload = parseAutoCorrectPayload(blockBody);
  return parseAppliedCorrectionList(payload.appliedCorrections);
};

const normalizeAutoCorrectOutput = (value: string): string => {
  return value
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n");
};

const extractAutoCorrectBlockBody = (value: string): string => {
  const start = value.indexOf(SPEC_TICKET_AUTOCORRECT_BLOCK_OPEN);
  if (start < 0) {
    throw new SpecTicketValidationAutoCorrectParserError(
      "bloco [[SPEC_TICKET_AUTOCORRECT]] ausente na resposta da autocorrecao.",
    );
  }

  const contentStart = start + SPEC_TICKET_AUTOCORRECT_BLOCK_OPEN.length;
  const end = value.indexOf(SPEC_TICKET_AUTOCORRECT_BLOCK_CLOSE, contentStart);
  if (end < 0) {
    throw new SpecTicketValidationAutoCorrectParserError(
      "bloco [[/SPEC_TICKET_AUTOCORRECT]] ausente na resposta da autocorrecao.",
    );
  }

  return value.slice(contentStart, end).trim();
};

const parseAutoCorrectPayload = (body: string): Record<string, unknown> => {
  const stripped = stripJsonFence(body);

  try {
    const parsed = JSON.parse(stripped);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new SpecTicketValidationAutoCorrectParserError(
        "payload estruturado deve ser um objeto JSON no bloco da autocorrecao.",
      );
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SpecTicketValidationAutoCorrectParserError) {
      throw error;
    }

    throw new SpecTicketValidationAutoCorrectParserError(
      `payload JSON invalido no bloco da autocorrecao: ${error instanceof Error ? error.message : String(error)}`,
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
    throw new SpecTicketValidationAutoCorrectParserError(
      `campo obrigatorio "${fieldName}" ausente ou vazio.`,
    );
  }

  return value.trim();
};

const readStringArray = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value)) {
    throw new SpecTicketValidationAutoCorrectParserError(
      `campo obrigatorio "${fieldName}" deve ser uma lista.`,
    );
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new SpecTicketValidationAutoCorrectParserError(
        `item ${String(index)} de "${fieldName}" deve ser string nao vazia.`,
      );
    }

    return entry.trim();
  });
};

const parseAppliedCorrectionList = (
  value: unknown,
): SpecTicketValidationAppliedCorrection[] => {
  if (!Array.isArray(value)) {
    throw new SpecTicketValidationAutoCorrectParserError(
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
    throw new SpecTicketValidationAutoCorrectParserError(
      `correcao aplicada ${String(index)} deve ser um objeto estruturado.`,
    );
  }

  const payload = value as Record<string, unknown>;
  return {
    description: readString(payload.description, `appliedCorrections[${String(index)}].description`),
    affectedArtifactPaths: readStringArray(
      payload.affectedArtifactPaths,
      `appliedCorrections[${String(index)}].affectedArtifactPaths`,
    ),
    linkedGapTypes: readStringArray(
      payload.linkedGapTypes,
      `appliedCorrections[${String(index)}].linkedGapTypes`,
    ).map((entry) => normalizeGapType(entry)),
    outcome: normalizeCorrectionOutcome(
      readString(payload.outcome, `appliedCorrections[${String(index)}].outcome`),
    ),
  };
};

const normalizeGapType = (value: string): SpecTicketValidationGapType => {
  const normalized = normalizeSlug(value);
  const resolved = GAP_TYPE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new SpecTicketValidationAutoCorrectParserError(
    `linkedGapTypes invalido: "${value}". Taxonomia permitida: ${SPEC_TICKET_VALIDATION_GAP_TYPES.join(", ")}.`,
  );
};

const normalizeCorrectionOutcome = (
  value: string,
): SpecTicketValidationCorrectionOutcome => {
  const normalized = normalizeSlug(value);
  const resolved = CORRECTION_OUTCOME_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new SpecTicketValidationAutoCorrectParserError(
    `outcome invalido: "${value}". Valores permitidos: ${SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES.join(", ")}.`,
  );
};

const normalizeSlug = (value: string): string => value.trim().toLowerCase().replace(/\s+/gu, "-");
