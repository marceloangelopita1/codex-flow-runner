import {
  WORKFLOW_GAP_ANALYSIS_CLASSIFICATIONS,
  WORKFLOW_GAP_ANALYSIS_CONFIDENCE_LEVELS,
  WORKFLOW_GAP_ANALYSIS_INPUT_MODES,
  WORKFLOW_GAP_ANALYSIS_LIMITATION_CODES,
  WorkflowGapAnalysisClassification,
  WorkflowGapAnalysisConfidenceLevel,
  WorkflowGapAnalysisFinding,
  WorkflowGapAnalysisHistoricalReference,
  WorkflowGapAnalysisInputMode,
  WorkflowGapAnalysisLimitationCode,
  WorkflowGapAnalysisResult,
} from "../types/workflow-gap-analysis.js";

const WORKFLOW_GAP_ANALYSIS_BLOCK_OPEN = "[[WORKFLOW_GAP_ANALYSIS]]";
const WORKFLOW_GAP_ANALYSIS_BLOCK_CLOSE = "[[/WORKFLOW_GAP_ANALYSIS]]";
const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

const CLASSIFICATION_ALIASES = new Map<string, WorkflowGapAnalysisClassification>(
  WORKFLOW_GAP_ANALYSIS_CLASSIFICATIONS.map((value) => [value, value]),
);
const CONFIDENCE_ALIASES = new Map<string, WorkflowGapAnalysisConfidenceLevel>(
  WORKFLOW_GAP_ANALYSIS_CONFIDENCE_LEVELS.map((value) => [value, value]),
);
const INPUT_MODE_ALIASES = new Map<string, WorkflowGapAnalysisInputMode>(
  WORKFLOW_GAP_ANALYSIS_INPUT_MODES.map((value) => [value, value]),
);
const LIMITATION_CODE_ALIASES = new Map<string, WorkflowGapAnalysisLimitationCode>(
  WORKFLOW_GAP_ANALYSIS_LIMITATION_CODES.map((value) => [value, value]),
);

export class WorkflowGapAnalysisParserError extends Error {
  constructor(details: string) {
    super(`Falha ao parsear o bloco de workflow-gap-analysis: ${details}`);
    this.name = "WorkflowGapAnalysisParserError";
  }
}

export const parseWorkflowGapAnalysisOutput = (output: string): WorkflowGapAnalysisResult => {
  const normalized = normalizeOutput(output);
  const blockBody = extractBlockBody(normalized);
  const payload = parsePayload(blockBody);

  const classification = normalizeClassification(
    readString(payload.classification, "classification"),
  );
  const confidence = normalizeConfidence(readString(payload.confidence, "confidence"));
  const publicationEligibility = readBoolean(
    payload.publicationEligibility,
    "publicationEligibility",
  );
  const inputMode = normalizeInputMode(readString(payload.inputMode, "inputMode"));
  const findings = parseFindingList(payload.findings);
  const limitation = parseLimitation(payload.limitation);
  const historicalReference = parseHistoricalReference(payload.historicalReference);

  validatePayloadCombination({
    classification,
    confidence,
    publicationEligibility,
    findings,
    limitation,
    historicalReference,
  });

  return {
    classification,
    confidence,
    publicationEligibility,
    inputMode,
    summary: readString(payload.summary, "summary"),
    causalHypothesis: readString(payload.causalHypothesis, "causalHypothesis"),
    benefitSummary: readString(payload.benefitSummary, "benefitSummary"),
    findings,
    workflowArtifactsConsulted: readStringArray(
      payload.workflowArtifactsConsulted,
      "workflowArtifactsConsulted",
    ),
    followUpTicketPaths: readStringArray(payload.followUpTicketPaths, "followUpTicketPaths"),
    limitation,
    historicalReference,
  };
};

const normalizeOutput = (value: string): string =>
  value
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n");

const extractBlockBody = (value: string): string => {
  const start = value.indexOf(WORKFLOW_GAP_ANALYSIS_BLOCK_OPEN);
  if (start < 0) {
    throw new WorkflowGapAnalysisParserError(
      "bloco [[WORKFLOW_GAP_ANALYSIS]] ausente na resposta da retrospectiva.",
    );
  }

  const contentStart = start + WORKFLOW_GAP_ANALYSIS_BLOCK_OPEN.length;
  const end = value.indexOf(WORKFLOW_GAP_ANALYSIS_BLOCK_CLOSE, contentStart);
  if (end < 0) {
    throw new WorkflowGapAnalysisParserError(
      "bloco [[/WORKFLOW_GAP_ANALYSIS]] ausente na resposta da retrospectiva.",
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
      throw new WorkflowGapAnalysisParserError(
        "payload estruturado deve ser um objeto JSON.",
      );
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof WorkflowGapAnalysisParserError) {
      throw error;
    }

    throw new WorkflowGapAnalysisParserError(
      `payload JSON invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const readString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new WorkflowGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" ausente ou vazio.`,
    );
  }

  return value.trim();
};

const readStringArray = (value: unknown, fieldName: string): string[] => {
  if (!Array.isArray(value)) {
    throw new WorkflowGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" deve ser uma lista.`,
    );
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new WorkflowGapAnalysisParserError(
        `item ${String(index)} de "${fieldName}" deve ser string nao vazia.`,
      );
    }

    return entry.trim();
  });
};

const readBoolean = (value: unknown, fieldName: string): boolean => {
  if (typeof value !== "boolean") {
    throw new WorkflowGapAnalysisParserError(
      `campo obrigatorio "${fieldName}" deve ser booleano.`,
    );
  }

  return value;
};

const parseFindingList = (value: unknown): WorkflowGapAnalysisFinding[] => {
  if (!Array.isArray(value)) {
    throw new WorkflowGapAnalysisParserError('campo obrigatorio "findings" deve ser uma lista.');
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new WorkflowGapAnalysisParserError(
        `finding ${String(index)} deve ser um objeto estruturado.`,
      );
    }

    const payload = entry as Record<string, unknown>;
    const evidence = readStringArray(payload.evidence, `findings[${String(index)}].evidence`);
    if (evidence.length === 0) {
      throw new WorkflowGapAnalysisParserError(
        `finding ${String(index)} precisa registrar pelo menos uma evidencia.`,
      );
    }

    return {
      summary: readString(payload.summary, `findings[${String(index)}].summary`),
      affectedArtifactPaths: readStringArray(
        payload.affectedArtifactPaths,
        `findings[${String(index)}].affectedArtifactPaths`,
      ),
      requirementRefs: readStringArray(
        payload.requirementRefs,
        `findings[${String(index)}].requirementRefs`,
      ),
      evidence,
    };
  });
};

const parseLimitation = (
  value: unknown,
): WorkflowGapAnalysisResult["limitation"] => {
  if (value === null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkflowGapAnalysisParserError(
      'campo "limitation" deve ser null ou um objeto estruturado.',
    );
  }

  const payload = value as Record<string, unknown>;
  return {
    code: normalizeLimitationCode(readString(payload.code, "limitation.code")),
    detail: readString(payload.detail, "limitation.detail"),
  };
};

const parseHistoricalReference = (
  value: unknown,
): WorkflowGapAnalysisHistoricalReference | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkflowGapAnalysisParserError(
      'campo "historicalReference" deve ser null ou um objeto estruturado.',
    );
  }

  const payload = value as Record<string, unknown>;
  const findingFingerprints =
    payload.findingFingerprints === undefined && typeof payload.fingerprint === "string"
      ? [readString(payload.fingerprint, "historicalReference.fingerprint")]
      : readStringArray(
          payload.findingFingerprints,
          "historicalReference.findingFingerprints",
        );
  return {
    summary: readString(payload.summary, "historicalReference.summary"),
    ticketPath:
      payload.ticketPath === null
        ? null
        : readString(payload.ticketPath, "historicalReference.ticketPath"),
    findingFingerprints,
  };
};

const validatePayloadCombination = (value: {
  classification: WorkflowGapAnalysisClassification;
  confidence: WorkflowGapAnalysisConfidenceLevel;
  publicationEligibility: boolean;
  findings: WorkflowGapAnalysisFinding[];
  limitation: WorkflowGapAnalysisResult["limitation"];
  historicalReference: WorkflowGapAnalysisHistoricalReference | null;
}): void => {
  if (value.publicationEligibility) {
    if (value.classification !== "systemic-gap" || value.confidence !== "high") {
      throw new WorkflowGapAnalysisParserError(
        "publicationEligibility=true exige classification=systemic-gap e confidence=high.",
      );
    }
  }

  if (value.classification === "systemic-hypothesis" && value.confidence !== "medium") {
    throw new WorkflowGapAnalysisParserError(
      "classification=systemic-hypothesis exige confidence=medium.",
    );
  }

  if (value.classification === "operational-limitation") {
    if (value.limitation === null) {
      throw new WorkflowGapAnalysisParserError(
        "classification=operational-limitation exige o objeto limitation.",
      );
    }
    if (value.publicationEligibility) {
      throw new WorkflowGapAnalysisParserError(
        "classification=operational-limitation nao pode habilitar publicationEligibility.",
      );
    }
  } else if (value.limitation !== null) {
    throw new WorkflowGapAnalysisParserError(
      "o objeto limitation so pode ser informado em classification=operational-limitation.",
    );
  }

  if (
    (value.classification === "systemic-gap" ||
      value.classification === "systemic-hypothesis") &&
    value.findings.length === 0
  ) {
    throw new WorkflowGapAnalysisParserError(
      "classificacoes sistemicas precisam informar ao menos um finding.",
    );
  }

  if (value.historicalReference !== null) {
    if (value.publicationEligibility) {
      throw new WorkflowGapAnalysisParserError(
        "historicalReference nao pode coexistir com publicationEligibility=true.",
      );
    }
    if (value.historicalReference.findingFingerprints.length === 0) {
      throw new WorkflowGapAnalysisParserError(
        "historicalReference precisa listar ao menos um fingerprint preexistente.",
      );
    }
    if (value.classification === "operational-limitation") {
      throw new WorkflowGapAnalysisParserError(
        "historicalReference nao pode ser usado com classification=operational-limitation.",
      );
    }
  }
};

const normalizeClassification = (value: string): WorkflowGapAnalysisClassification => {
  const normalized = normalizeSlug(value);
  const resolved = CLASSIFICATION_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new WorkflowGapAnalysisParserError(
    `classification invalido: "${value}". Taxonomia permitida: ${WORKFLOW_GAP_ANALYSIS_CLASSIFICATIONS.join(", ")}.`,
  );
};

const normalizeConfidence = (value: string): WorkflowGapAnalysisConfidenceLevel => {
  const normalized = normalizeSlug(value);
  const resolved = CONFIDENCE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new WorkflowGapAnalysisParserError(
    `confidence invalido: "${value}". Valores permitidos: ${WORKFLOW_GAP_ANALYSIS_CONFIDENCE_LEVELS.join(", ")}.`,
  );
};

const normalizeInputMode = (value: string): WorkflowGapAnalysisInputMode => {
  const normalized = normalizeSlug(value);
  const resolved = INPUT_MODE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new WorkflowGapAnalysisParserError(
    `inputMode invalido: "${value}". Valores permitidos: ${WORKFLOW_GAP_ANALYSIS_INPUT_MODES.join(", ")}.`,
  );
};

const normalizeLimitationCode = (value: string): WorkflowGapAnalysisLimitationCode => {
  const normalized = normalizeSlug(value);
  const resolved = LIMITATION_CODE_ALIASES.get(normalized);
  if (resolved) {
    return resolved;
  }

  throw new WorkflowGapAnalysisParserError(
    `limitation.code invalido: "${value}". Valores permitidos: ${WORKFLOW_GAP_ANALYSIS_LIMITATION_CODES.join(", ")}.`,
  );
};

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/gu, "-");
