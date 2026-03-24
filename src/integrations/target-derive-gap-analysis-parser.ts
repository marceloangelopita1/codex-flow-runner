import {
  TARGET_DERIVE_GAP_DECISIONS,
  TARGET_DERIVE_GAP_TYPES,
  TargetDeriveGapAnalysis,
  TargetDeriveGapAnalysisItem,
  TargetDeriveGapDecision,
  TargetDeriveGapType,
} from "../types/target-derive.js";
import {
  TARGET_CHECKUP_DIMENSION_LABELS,
  type TargetCheckupDimensionKey,
} from "../types/target-checkup.js";

const TARGET_DERIVE_BLOCK_OPEN = "[[TARGET_DERIVE_GAP_ANALYSIS]]";
const TARGET_DERIVE_BLOCK_CLOSE = "[[/TARGET_DERIVE_GAP_ANALYSIS]]";
const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

const GAP_TYPE_ALIASES = new Map<string, TargetDeriveGapType>(
  TARGET_DERIVE_GAP_TYPES.map((value) => [normalizeSlug(value), value]),
);
const GAP_DECISION_ALIASES = new Map<string, TargetDeriveGapDecision>(
  TARGET_DERIVE_GAP_DECISIONS.map((value) => [normalizeSlug(value), value]),
);
const DIMENSION_ALIASES = new Map<string, TargetCheckupDimensionKey>(
  Object.keys(TARGET_CHECKUP_DIMENSION_LABELS).map((value) => [
    normalizeSlug(value),
    value as TargetCheckupDimensionKey,
  ]),
);

export class TargetDeriveGapAnalysisParserError extends Error {
  constructor(details: string) {
    super(`Falha ao parsear o bloco de target-derive-gap-analysis: ${details}`);
    this.name = "TargetDeriveGapAnalysisParserError";
  }
}

export const parseTargetDeriveGapAnalysisOutput = (
  output: string,
): TargetDeriveGapAnalysis => {
  const payload = parsePayload(extractBlockBody(normalizeOutput(output)));
  return {
    summary: readString(payload.summary, "summary"),
    gaps: parseGaps(payload.gaps),
  };
};

const normalizeOutput = (value: string): string =>
  value
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n");

const extractBlockBody = (value: string): string => {
  const start = value.indexOf(TARGET_DERIVE_BLOCK_OPEN);
  if (start < 0) {
    throw new TargetDeriveGapAnalysisParserError(
      "bloco [[TARGET_DERIVE_GAP_ANALYSIS]] ausente na resposta do target_derive_gaps.",
    );
  }

  const contentStart = start + TARGET_DERIVE_BLOCK_OPEN.length;
  const end = value.indexOf(TARGET_DERIVE_BLOCK_CLOSE, contentStart);
  if (end < 0) {
    throw new TargetDeriveGapAnalysisParserError(
      "bloco [[/TARGET_DERIVE_GAP_ANALYSIS]] ausente na resposta do target_derive_gaps.",
    );
  }

  return value.slice(contentStart, end).trim();
};

const parsePayload = (body: string): Record<string, unknown> => {
  const trimmed = body.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu)?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(fenced);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TargetDeriveGapAnalysisParserError(
        "payload estruturado deve ser um objeto JSON.",
      );
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof TargetDeriveGapAnalysisParserError) {
      throw error;
    }

    throw new TargetDeriveGapAnalysisParserError(
      `payload JSON invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const parseGaps = (value: unknown): TargetDeriveGapAnalysisItem[] => {
  if (!Array.isArray(value)) {
    throw new TargetDeriveGapAnalysisParserError('campo obrigatorio "gaps" deve ser uma lista.');
  }

  return value.map((entry, index) => parseGap(entry, index));
};

const parseGap = (value: unknown, index: number): TargetDeriveGapAnalysisItem => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TargetDeriveGapAnalysisParserError(
      `gap ${String(index)} deve ser um objeto estruturado.`,
    );
  }

  const payload = value as Record<string, unknown>;
  const materializationDecision = normalizeGapDecision(
    readString(payload.materializationDecision, `gaps[${String(index)}].materializationDecision`),
  );
  const remediationSurface = readNonEmptyStringArray(
    payload.remediationSurface,
    `gaps[${String(index)}].remediationSurface`,
  );
  const closureCriteria = readNonEmptyStringArray(
    payload.closureCriteria,
    `gaps[${String(index)}].closureCriteria`,
  );
  const fingerprintBasis = readNonEmptyStringArray(
    payload.fingerprintBasis,
    `gaps[${String(index)}].fingerprintBasis`,
  );

  if (materializationDecision === "blocked" && payload.externalDependency == null) {
    throw new TargetDeriveGapAnalysisParserError(
      `gaps[${String(index)}].externalDependency e obrigatorio quando materializationDecision=blocked.`,
    );
  }

  return {
    title: readString(payload.title, `gaps[${String(index)}].title`),
    summary: readString(payload.summary, `gaps[${String(index)}].summary`),
    gapType: normalizeGapType(readString(payload.gapType, `gaps[${String(index)}].gapType`)),
    checkupDimension: normalizeDimension(
      readString(payload.checkupDimension, `gaps[${String(index)}].checkupDimension`),
    ),
    materializationDecision,
    remediationSurface,
    evidence: readNonEmptyStringArray(payload.evidence, `gaps[${String(index)}].evidence`),
    assumptionsDefaults: readStringArray(
      payload.assumptionsDefaults,
      `gaps[${String(index)}].assumptionsDefaults`,
    ),
    validationNotes: readStringArray(
      payload.validationNotes,
      `gaps[${String(index)}].validationNotes`,
    ),
    closureCriteria,
    fingerprintBasis,
    priority: parsePriority(payload.priority, index),
    externalDependency:
      payload.externalDependency == null
        ? null
        : readString(payload.externalDependency, `gaps[${String(index)}].externalDependency`),
  };
};

const parsePriority = (
  value: unknown,
  index: number,
): TargetDeriveGapAnalysisItem["priority"] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TargetDeriveGapAnalysisParserError(
      `gaps[${String(index)}].priority deve ser um objeto estruturado.`,
    );
  }

  const payload = value as Record<string, unknown>;
  return {
    severity: readPriorityValue(payload.severity, `gaps[${String(index)}].priority.severity`),
    frequency: readPriorityValue(payload.frequency, `gaps[${String(index)}].priority.frequency`),
    costOfDelay: readPriorityValue(
      payload.costOfDelay,
      `gaps[${String(index)}].priority.costOfDelay`,
    ),
    operationalRisk: readPriorityValue(
      payload.operationalRisk,
      `gaps[${String(index)}].priority.operationalRisk`,
    ),
  };
};

const readPriorityValue = (value: unknown, fieldName: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TargetDeriveGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" deve ser inteiro entre 1 e 5.`,
    );
  }

  if (value < 1 || value > 5) {
    throw new TargetDeriveGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" deve estar entre 1 e 5.`,
    );
  }

  return value;
};

const readString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TargetDeriveGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" ausente ou vazio.`,
    );
  }

  return value.trim();
};

const readStringArray = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value)) {
    throw new TargetDeriveGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" deve ser uma lista.`,
    );
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new TargetDeriveGapAnalysisParserError(
        `item ${String(index)} de "${fieldName}" deve ser string nao vazia.`,
      );
    }

    return entry.trim();
  });
};

const readNonEmptyStringArray = (value: unknown, fieldName: string): string[] => {
  const entries = readStringArray(value, fieldName);
  if (entries.length === 0) {
    throw new TargetDeriveGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" deve conter ao menos um item.`,
    );
  }

  return entries;
};

const normalizeGapType = (value: string): TargetDeriveGapType => {
  const normalized = normalizeSlug(value);
  const resolved = GAP_TYPE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new TargetDeriveGapAnalysisParserError(
    `gapType invalido: "${value}". Valores permitidos: ${TARGET_DERIVE_GAP_TYPES.join(", ")}.`,
  );
};

const normalizeGapDecision = (value: string): TargetDeriveGapDecision => {
  const normalized = normalizeSlug(value);
  const resolved = GAP_DECISION_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new TargetDeriveGapAnalysisParserError(
    `materializationDecision invalido: "${value}". Valores permitidos: ${TARGET_DERIVE_GAP_DECISIONS.join(", ")}.`,
  );
};

const normalizeDimension = (value: string): TargetCheckupDimensionKey => {
  const normalized = normalizeSlug(value);
  const resolved = DIMENSION_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new TargetDeriveGapAnalysisParserError(
    `checkupDimension invalido: "${value}". Valores permitidos: ${Object.keys(
      TARGET_CHECKUP_DIMENSION_LABELS,
    ).join(", ")}.`,
  );
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/gu, "-");
}
