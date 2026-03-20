export const SPEC_TICKET_VALIDATION_GAP_TYPES = [
  "coverage-gap",
  "scope-justification-gap",
  "granularity-gap",
  "duplication-gap",
  "closure-criteria-gap",
  "spec-inheritance-gap",
  "documentation-compliance-gap",
] as const;

export type SpecTicketValidationGapType =
  (typeof SPEC_TICKET_VALIDATION_GAP_TYPES)[number];

export const SPEC_TICKET_VALIDATION_PROBABLE_ROOT_CAUSES = [
  "spec",
  "ticket",
  "execplan",
  "execution",
  "validation",
  "systemic-instruction",
  "external/manual",
] as const;

export type SpecTicketValidationProbableRootCause =
  (typeof SPEC_TICKET_VALIDATION_PROBABLE_ROOT_CAUSES)[number];

export const SPEC_TICKET_VALIDATION_CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
] as const;

export type SpecTicketValidationConfidenceLevel =
  (typeof SPEC_TICKET_VALIDATION_CONFIDENCE_LEVELS)[number];

export const SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES = [
  "applied",
  "skipped",
  "failed",
] as const;

export type SpecTicketValidationCorrectionOutcome =
  (typeof SPEC_TICKET_VALIDATION_CORRECTION_OUTCOMES)[number];

export type SpecTicketValidationVerdict = "GO" | "NO_GO";
export type SpecTicketValidationCyclePhase = "initial-validation" | "revalidation";

export interface SpecTicketValidationAppliedCorrection {
  description: string;
  affectedArtifactPaths: string[];
  linkedGapTypes: SpecTicketValidationGapType[];
  outcome: SpecTicketValidationCorrectionOutcome;
}

export interface SpecTicketValidationGap {
  gapType: SpecTicketValidationGapType;
  summary: string;
  affectedArtifactPaths: string[];
  requirementRefs: string[];
  evidence: string[];
  probableRootCause: SpecTicketValidationProbableRootCause;
  isAutoCorrectable: boolean;
}

export interface SpecTicketValidationPassResult {
  verdict: SpecTicketValidationVerdict;
  confidence: SpecTicketValidationConfidenceLevel;
  summary: string;
  gaps: SpecTicketValidationGap[];
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
}

export interface SpecTicketValidationCycleSnapshot {
  cycleNumber: number;
  phase: SpecTicketValidationCyclePhase;
  threadId: string;
  turnResult: SpecTicketValidationPassResult;
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
  openGapFingerprints: string[];
  realGapReductionFromPrevious: boolean | null;
}

export type SpecTicketValidationFinalReason =
  | "go-with-high-confidence"
  | "no-auto-correctable-gaps"
  | "no-material-auto-correction"
  | "insufficient-confidence"
  | "no-real-gap-reduction"
  | "max-cycles-reached"
  | "technical-failure-partial-history";

export interface SpecTicketValidationResult {
  verdict: SpecTicketValidationVerdict;
  confidence: SpecTicketValidationConfidenceLevel;
  finalReason: SpecTicketValidationFinalReason;
  cyclesExecuted: number;
  validationThreadId: string | null;
  triageContextInherited: false;
  snapshots: SpecTicketValidationCycleSnapshot[];
  finalPass: SpecTicketValidationPassResult;
  finalOpenGapFingerprints: string[];
  allAppliedCorrections: SpecTicketValidationAppliedCorrection[];
}

const normalizeFingerprintToken = (value: string): string => {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
};

const normalizeFingerprintList = (values: string[]): string[] => {
  return values
    .map((value) => normalizeFingerprintToken(value))
    .filter((value) => value.length > 0)
    .sort();
};

export const buildSpecTicketValidationGapFingerprint = (
  gap: Pick<
    SpecTicketValidationGap,
    "gapType" | "affectedArtifactPaths" | "requirementRefs"
  >,
): string => {
  const normalizedArtifacts = normalizeFingerprintList(gap.affectedArtifactPaths);
  const normalizedRequirementRefs = normalizeFingerprintList(gap.requirementRefs);

  return [
    gap.gapType,
    normalizedArtifacts.length > 0 ? normalizedArtifacts.join("&") : "artifact:none",
    normalizedRequirementRefs.length > 0
      ? normalizedRequirementRefs.join("&")
      : "requirement:none",
  ].join("|");
};

export const collectSpecTicketValidationGapFingerprints = (
  gaps: ReadonlyArray<
    Pick<SpecTicketValidationGap, "gapType" | "affectedArtifactPaths" | "requirementRefs">
  >,
): string[] => {
  return [...new Set(gaps.map((gap) => buildSpecTicketValidationGapFingerprint(gap)))].sort();
};

export const hasStrictOpenGapReduction = (
  previousGaps: ReadonlyArray<
    Pick<SpecTicketValidationGap, "gapType" | "affectedArtifactPaths" | "requirementRefs">
  >,
  nextGaps: ReadonlyArray<
    Pick<SpecTicketValidationGap, "gapType" | "affectedArtifactPaths" | "requirementRefs">
  >,
): boolean => {
  const previousFingerprints = collectSpecTicketValidationGapFingerprints(previousGaps);
  const nextFingerprints = collectSpecTicketValidationGapFingerprints(nextGaps);

  if (nextFingerprints.length >= previousFingerprints.length) {
    return false;
  }

  const previousSet = new Set(previousFingerprints);
  return nextFingerprints.every((fingerprint) => previousSet.has(fingerprint));
};

export const hasAutoCorrectableGaps = (
  gaps: ReadonlyArray<Pick<SpecTicketValidationGap, "isAutoCorrectable">>,
): boolean => {
  return gaps.some((gap) => gap.isAutoCorrectable);
};

export const isConfidenceSufficientForGo = (
  verdict: SpecTicketValidationVerdict,
  confidence: SpecTicketValidationConfidenceLevel,
): boolean => {
  return verdict === "GO" && confidence === "high";
};
