import { ProjectRef } from "./project.js";

export const TARGET_CHECKUP_CONTRACT_VERSION = "1.0";
export const TARGET_CHECKUP_SCHEMA_VERSION = "1.0";
export const TARGET_CHECKUP_HISTORY_DIR = "docs/checkups/history";
export const TARGET_CHECKUP_REPORT_FILE_SUFFIX = "project-readiness-checkup";
export const TARGET_CHECKUP_MAX_AGE_DAYS = 30;
export const TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION =
  "initial-publication-commit-recorded-by-follow-up-metadata-commit";

export const TARGET_CHECKUP_REQUIRED_DIRECTORIES = [
  "tickets/open",
  "tickets/closed",
  "execplans",
  "docs/specs",
  "docs/specs/templates",
  "docs/workflows",
] as const;

export const TARGET_CHECKUP_REQUIRED_DOCUMENTS = [
  "AGENTS.md",
  "README.md",
  "EXTERNAL_PROMPTS.md",
  "INTERNAL_TICKETS.md",
  "PLANS.md",
  "SPECS.md",
  "docs/specs/README.md",
  "docs/specs/templates/spec-template.md",
  "docs/workflows/discover-spec.md",
  "docs/workflows/target-project-compatibility-contract.md",
] as const;

export const TARGET_CHECKUP_SAFE_COMMAND_NAMES = [
  "check",
  "typecheck",
  "lint",
  "test",
  "build",
  "validate",
] as const;

export type TargetCheckupDimensionKey =
  | "preparation_integrity"
  | "local_operability"
  | "validation_delivery_health"
  | "documentation_governance"
  | "observability";

export type TargetCheckupDimensionVerdict =
  | "ok"
  | "gap"
  | "blocked"
  | "n/a"
  | "execution_failed";

export type TargetCheckupOverallVerdict =
  | "valid_for_gap_ticket_derivation"
  | "invalid_for_gap_ticket_derivation";

export type TargetCheckupCommandSurface = "package-json" | "makefile" | "justfile";

export type TargetCheckupEvidenceStatus =
  | "ok"
  | "gap"
  | "blocked"
  | "execution_failed"
  | "info";

export const TARGET_CHECKUP_DIMENSION_LABELS: Record<TargetCheckupDimensionKey, string> = {
  preparation_integrity: "integridade do preparo",
  local_operability: "operabilidade local",
  validation_delivery_health: "saude de validacao/entrega",
  documentation_governance: "governanca documental",
  observability: "observabilidade",
};

export interface TargetCheckupEvidenceItem {
  code: string;
  status: TargetCheckupEvidenceStatus;
  summary: string;
  detail?: string | null;
  paths?: string[];
}

export interface TargetCheckupCommandExecution {
  command_id: string;
  label: string;
  source: TargetCheckupCommandSurface;
  command: string;
  args: string[];
  working_directory: string;
  exit_code: number | null;
  duration_ms: number;
  stdout_summary: string;
  stderr_summary: string;
}

export interface TargetCheckupDimensionResult {
  key: TargetCheckupDimensionKey;
  label: string;
  verdict: TargetCheckupDimensionVerdict;
  summary: string;
  evidence: TargetCheckupEvidenceItem[];
  commands: TargetCheckupCommandExecution[];
}

export interface TargetCheckupDerivationReadinessSnapshot {
  eligible: boolean;
  checked_at_utc: string;
  expires_at_utc: string | null;
  reasons: string[];
}

export interface TargetCheckupReport {
  contract_version: string;
  schema_version: string;
  target_project: ProjectRef;
  started_at_utc: string;
  finished_at_utc: string;
  analyzed_head_sha: string | null;
  branch: string | null;
  working_tree_clean_at_start: boolean;
  report_commit_sha: string | null;
  report_commit_sha_convention: string | null;
  artifacts: {
    json_path: string;
    markdown_path: string;
  };
  overall_verdict: TargetCheckupOverallVerdict;
  dimensions: TargetCheckupDimensionResult[];
  editorial_summary_markdown: string | null;
  derivation_readiness: TargetCheckupDerivationReadinessSnapshot;
}

export interface TargetCheckupSummary {
  targetProject: ProjectRef;
  analyzedHeadSha: string;
  branch: string;
  overallVerdict: TargetCheckupOverallVerdict;
  reportJsonPath: string;
  reportMarkdownPath: string;
  reportCommitSha: string;
  changedPaths: string[];
  nextAction: string;
  versioning: {
    status: "committed-and-pushed";
    metadataCommitHash: string;
    reportCommitHash: string;
    upstream: string;
    commitPushId: string;
  };
}

export type TargetCheckupExecutionResult =
  | {
      status: "completed";
      summary: TargetCheckupSummary;
    }
  | {
      status: "blocked";
      reason:
        | "active-project-unavailable"
        | "invalid-project-name"
        | "project-not-found"
        | "git-repo-missing"
        | "working-tree-dirty"
        | "head-unresolved"
        | "branch-unresolved"
        | "codex-auth-missing";
      message: string;
    }
  | {
      status: "failed";
      message: string;
    };

export interface TargetCheckupDerivationValidationContext {
  currentHeadSha?: string | null;
  reportLastCommitSha?: string | null;
  reportLastCommitParentSha?: string | null;
  now?: Date;
}

export const TARGET_CHECKUP_REQUIRED_DIMENSIONS: TargetCheckupDimensionKey[] = [
  "preparation_integrity",
  "local_operability",
  "validation_delivery_health",
  "documentation_governance",
];

export const buildTargetCheckupReportFileStem = (value: Date): string =>
  `${value.toISOString().replace(/\.\d{3}Z$/u, "Z").replace(/:/gu, "-")}-${TARGET_CHECKUP_REPORT_FILE_SUFFIX}`;

export const evaluateTargetCheckupDerivationReadiness = (
  report: TargetCheckupReport,
  context: TargetCheckupDerivationValidationContext,
): TargetCheckupDerivationReadinessSnapshot => {
  const now = context.now ?? new Date();
  const reasons: string[] = [];
  const finishedAt = safeParseDate(report.finished_at_utc);
  const preparationIntegrity = report.dimensions.find(
    (dimension) => dimension.key === "preparation_integrity",
  );

  if (!report.working_tree_clean_at_start) {
    reasons.push("working-tree-not-clean-at-start");
  }

  if (!report.analyzed_head_sha) {
    reasons.push("analyzed-head-missing");
  }

  if (!report.branch) {
    reasons.push("branch-missing");
  }

  if (preparationIntegrity?.verdict !== "ok") {
    reasons.push("preparation-integrity-not-ok");
  }

  if (report.overall_verdict !== "valid_for_gap_ticket_derivation") {
    reasons.push("overall-verdict-invalid");
  }

  if (!report.report_commit_sha) {
    reasons.push("report-commit-sha-missing");
  }

  if (
    report.report_commit_sha_convention !== TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION
  ) {
    reasons.push("report-commit-convention-invalid");
  }

  const expiresAtUtc = finishedAt
    ? new Date(finishedAt.getTime() + TARGET_CHECKUP_MAX_AGE_DAYS * DAY_IN_MS).toISOString()
    : null;

  if (!finishedAt) {
    reasons.push("finished-at-invalid");
  } else if (finishedAt.getTime() + TARGET_CHECKUP_MAX_AGE_DAYS * DAY_IN_MS < now.getTime()) {
    reasons.push("report-expired");
  }

  if ("currentHeadSha" in context && !context.currentHeadSha) {
    reasons.push("current-head-missing");
  }

  if ("reportLastCommitSha" in context && !context.reportLastCommitSha) {
    reasons.push("report-last-commit-missing");
  }

  if (
    context.currentHeadSha &&
    context.reportLastCommitSha &&
    context.currentHeadSha !== context.reportLastCommitSha
  ) {
    reasons.push("head-drifted-after-report");
  }

  if (
    report.report_commit_sha &&
    "reportLastCommitParentSha" in context &&
    context.reportLastCommitParentSha &&
    context.reportLastCommitParentSha !== report.report_commit_sha
  ) {
    reasons.push("report-commit-chain-broken");
  }

  if (
    report.report_commit_sha &&
    "reportLastCommitParentSha" in context &&
    !context.reportLastCommitParentSha
  ) {
    reasons.push("report-last-commit-parent-missing");
  }

  return {
    eligible: reasons.length === 0,
    checked_at_utc: now.toISOString(),
    expires_at_utc: expiresAtUtc,
    reasons,
  };
};

const safeParseDate = (value: string): Date | null => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
