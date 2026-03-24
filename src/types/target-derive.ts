import { createHash } from "node:crypto";
import type { ProjectRef } from "./project.js";
import type { TargetCheckupDimensionKey } from "./target-checkup.js";

export const TARGET_DERIVE_GAP_TYPES = [
  "preparation",
  "documentation",
  "operability",
  "validation",
  "observability",
  "runner_limitation",
] as const;

export const TARGET_DERIVE_GAP_DECISIONS = [
  "materialize",
  "blocked",
  "informational",
  "insufficient_specificity",
  "runner_limitation",
] as const;

export const TARGET_DERIVE_RESULT_STATUSES = [
  "materialized_as_ticket",
  "reused_existing_ticket",
  "blocked_ticket_created",
  "not_materialized_informational",
  "not_materialized_insufficient_specificity",
  "not_materialized_runner_limitation",
] as const;

export const TARGET_DERIVE_PRIORITY_LEVELS = ["P0", "P1", "P2"] as const;

export type TargetDeriveGapType = (typeof TARGET_DERIVE_GAP_TYPES)[number];
export type TargetDeriveGapDecision = (typeof TARGET_DERIVE_GAP_DECISIONS)[number];
export type TargetDeriveResultStatus = (typeof TARGET_DERIVE_RESULT_STATUSES)[number];
export type TargetDerivePriorityLevel = (typeof TARGET_DERIVE_PRIORITY_LEVELS)[number];

export interface TargetDerivePriorityInput {
  severity: number;
  frequency: number;
  costOfDelay: number;
  operationalRisk: number;
}

export interface TargetDerivePriorityMatrix extends TargetDerivePriorityInput {
  score: number;
  priority: TargetDerivePriorityLevel;
}

export interface TargetDeriveGapAnalysisItem {
  title: string;
  summary: string;
  gapType: TargetDeriveGapType;
  checkupDimension: TargetCheckupDimensionKey;
  materializationDecision: TargetDeriveGapDecision;
  remediationSurface: string[];
  evidence: string[];
  assumptionsDefaults: string[];
  validationNotes: string[];
  closureCriteria: string[];
  fingerprintBasis: string[];
  priority: TargetDerivePriorityInput;
  externalDependency: string | null;
}

export interface TargetDeriveGapAnalysis {
  summary: string;
  gaps: TargetDeriveGapAnalysisItem[];
}

export interface TargetDeriveNormalizedGap {
  gapId: string;
  gapFingerprint: string;
  title: string;
  summary: string;
  gapType: TargetDeriveGapType;
  checkupDimension: TargetCheckupDimensionKey;
  materializationDecision: TargetDeriveGapDecision;
  remediationSurface: string[];
  evidence: string[];
  assumptionsDefaults: string[];
  validationNotes: string[];
  closureCriteria: string[];
  fingerprintBasis: string[];
  priority: TargetDerivePriorityMatrix;
  externalDependency: string | null;
}

export interface TargetDeriveTicketSummary {
  targetProject: ProjectRef;
  analyzedHeadSha: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
  reportCommitSha: string;
  completionMode: "applied" | "no-op-existing-mapping";
  derivationStatus: "materialized" | "not_materialized";
  changedPaths: string[];
  touchedTicketPaths: string[];
  gapResults: Array<{
    gapId: string;
    gapFingerprint: string;
    result: TargetDeriveResultStatus;
    ticketPaths: string[];
  }>;
  nextAction: string;
  versioning:
    | {
        status: "committed-and-pushed";
        commitHash: string;
        upstream: string;
        commitPushId: string;
      }
    | {
        status: "no-op";
        reason: "existing-mapping";
      };
}

export type TargetDeriveExecutionResult =
  | {
      status: "completed";
      summary: TargetDeriveTicketSummary;
    }
  | {
      status: "blocked";
      reason:
        | "invalid-project-name"
        | "project-not-found"
        | "git-repo-missing"
        | "working-tree-dirty"
        | "head-unresolved"
        | "report-path-invalid"
        | "report-not-found"
        | "report-invalid"
        | "report-project-mismatch"
        | "report-ineligible"
        | "report-drifted"
        | "codex-auth-missing";
      message: string;
    }
  | {
      status: "failed";
      message: string;
    };

export interface TargetDeriveGapAnalysisCodexRequest {
  targetProject: ProjectRef;
  runnerRepoPath: string;
  runnerReference: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
  reportFactsJson: string;
}

export interface TargetDeriveGapAnalysisCodexResult {
  output: string;
  diagnostics?: {
    stdoutPreview?: string;
    stderrPreview?: string;
  };
  promptTemplatePath: string;
  promptText: string;
}

export const computeTargetDerivePriority = (
  input: TargetDerivePriorityInput,
): TargetDerivePriorityMatrix => {
  const score =
    input.severity * 3 +
    input.frequency * 2 +
    input.costOfDelay * 3 +
    input.operationalRisk * 2;
  const priority = determineTargetDerivePriority({
    ...input,
    score,
  });

  return {
    ...input,
    score,
    priority,
  };
};

export const buildTargetDeriveGapFingerprint = (
  gap: Pick<
    TargetDeriveNormalizedGap,
    "gapType" | "checkupDimension" | "remediationSurface" | "fingerprintBasis"
  >,
): string => {
  const digest = createHash("sha1")
    .update(gap.gapType)
    .update("\n")
    .update(gap.checkupDimension)
    .update("\n")
    .update(normalizeFingerprintList(gap.remediationSurface))
    .update("\n")
    .update(normalizeFingerprintList(gap.fingerprintBasis))
    .digest("hex")
    .slice(0, 12);

  return `readiness-gap|${digest}`;
};

export const buildTargetDeriveGapId = (params: {
  reportJsonPath: string;
  title: string;
  gapFingerprint: string;
}): string => {
  const digest = createHash("sha1")
    .update(params.reportJsonPath)
    .update("\n")
    .update(params.title.trim())
    .update("\n")
    .update(params.gapFingerprint)
    .digest("hex")
    .slice(0, 12);

  return `readiness-gap-id|${digest}`;
};

export const mapDecisionToResultStatus = (
  decision: TargetDeriveGapDecision,
  reusedExistingTicket: boolean,
): TargetDeriveResultStatus => {
  if (decision === "materialize" && reusedExistingTicket) {
    return "reused_existing_ticket";
  }

  if (decision === "materialize") {
    return "materialized_as_ticket";
  }

  if (decision === "blocked") {
    return "blocked_ticket_created";
  }

  if (decision === "informational") {
    return "not_materialized_informational";
  }

  if (decision === "insufficient_specificity") {
    return "not_materialized_insufficient_specificity";
  }

  return "not_materialized_runner_limitation";
};

export const computeGapDerivationStatus = (
  results: Array<{
    result: TargetDeriveResultStatus;
  }>,
): "materialized" | "not_materialized" =>
  results.some((entry) =>
    entry.result === "materialized_as_ticket" ||
    entry.result === "reused_existing_ticket" ||
    entry.result === "blocked_ticket_created",
  )
    ? "materialized"
    : "not_materialized";

const determineTargetDerivePriority = (
  matrix: TargetDerivePriorityInput & { score: number },
): TargetDerivePriorityLevel => {
  if (
    matrix.severity === 5 &&
    (matrix.costOfDelay >= 4 || matrix.operationalRisk >= 4)
  ) {
    return "P0";
  }

  if (matrix.score >= 40) {
    return "P0";
  }

  if (matrix.score >= 26) {
    return "P1";
  }

  return "P2";
};

const normalizeFingerprintList = (values: string[]): string =>
  [...values]
    .map((value) => value.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "pt-BR"))
    .join("\n");
