import { CodexInvocationPreferences } from "./codex-preferences.js";
import { ProjectRef } from "./project.js";

export const TARGET_PREPARE_CONTRACT_VERSION = "1.0";
export const TARGET_PREPARE_SCHEMA_VERSION = "1.0";
export const TARGET_PREPARE_MANIFEST_PATH = "docs/workflows/target-prepare-manifest.json";
export const TARGET_PREPARE_REPORT_PATH = "docs/workflows/target-prepare-report.md";

export const TARGET_PREPARE_ALLOWED_PATHS = [
  "tickets/open/",
  "tickets/closed/",
  "execplans/",
  "docs/specs/",
  "docs/specs/templates/",
  "docs/workflows/",
  "AGENTS.md",
  "README.md",
  "EXTERNAL_PROMPTS.md",
  "INTERNAL_TICKETS.md",
  "PLANS.md",
  "SPECS.md",
] as const;

export const TARGET_PREPARE_REQUIRED_DIRECTORIES = [
  "tickets/open",
  "tickets/closed",
  "execplans",
  "docs/specs",
  "docs/specs/templates",
  "docs/workflows",
] as const;

export const TARGET_PREPARE_EXACT_COPY_SOURCES = [
  {
    targetPath: "EXTERNAL_PROMPTS.md",
    sourceRelativePath: "EXTERNAL_PROMPTS.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "INTERNAL_TICKETS.md",
    sourceRelativePath: "INTERNAL_TICKETS.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "PLANS.md",
    sourceRelativePath: "PLANS.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "SPECS.md",
    sourceRelativePath: "SPECS.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "docs/specs/README.md",
    sourceRelativePath: "docs/specs/README.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "docs/specs/templates/spec-template.md",
    sourceRelativePath: "docs/specs/templates/spec-template.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "docs/workflows/discover-spec.md",
    sourceRelativePath: "docs/workflows/discover-spec.md",
    validationStrategy: "exact-match",
  },
  {
    targetPath: "docs/workflows/target-project-compatibility-contract.md",
    sourceRelativePath: "docs/workflows/target-project-compatibility-contract.md",
    validationStrategy: "exact-match",
  },
] as const;

export const TARGET_PREPARE_MERGED_FILE_SOURCES = [
  {
    targetPath: "AGENTS.md",
    sourceRelativePath: "docs/workflows/target-prepare-managed-agents-section.md",
    markerId: "codex-flow-runner:target-prepare-managed-agents",
    validationStrategy: "managed-block",
  },
  {
    targetPath: "README.md",
    sourceRelativePath: "docs/workflows/target-prepare-managed-readme-section.md",
    markerId: "codex-flow-runner:target-prepare-managed-readme",
    validationStrategy: "managed-block",
  },
] as const;

export type TargetPrepareValidationStrategy =
  | "directory-exists"
  | "exact-match"
  | "managed-block"
  | "runner-generated";

export const renderTargetPrepareManagedBlockStart = (markerId: string): string =>
  `<!-- ${markerId}:start -->`;

export const renderTargetPrepareManagedBlockEnd = (markerId: string): string =>
  `<!-- ${markerId}:end -->`;

export const isTargetPreparePathAllowed = (relativePath: string): boolean => {
  const normalized = relativePath.replace(/\\/gu, "/");

  return TARGET_PREPARE_ALLOWED_PATHS.some((entry) => {
    const normalizedEntry = entry.replace(/\\/gu, "/");
    if (normalizedEntry.endsWith("/")) {
      return normalized.startsWith(normalizedEntry);
    }

    return normalized === normalizedEntry;
  });
};

export interface TargetPrepareResolvedProject extends ProjectRef {
  eligibleForProjects: boolean;
}

export interface TargetPrepareSurfaceEvidence {
  path: string;
  sourcePath: string | null;
  managementMode: "directory" | "copy-exact" | "merge-managed-block" | "runner-generated";
  validationStrategy: TargetPrepareValidationStrategy;
  sha256: string | null;
}

export interface TargetPrepareManifest {
  contractVersion: string;
  prepareSchemaVersion: string;
  generatedAtUtc: string;
  runnerReference: string;
  targetProject: ProjectRef;
  allowlistedPaths: string[];
  changedPaths: string[];
  eligibleForProjects: boolean;
  compatibleWithWorkflowComplete: boolean;
  codexPreferences: CodexInvocationPreferences | null;
  git: {
    branch: string | null;
    headShaAtStart: string | null;
    headShaAtValidation: string | null;
  };
  artifacts: {
    manifestPath: string;
    reportPath: string;
  };
  surfaces: TargetPrepareSurfaceEvidence[];
}

export interface TargetPrepareSummary {
  targetProject: ProjectRef;
  eligibleForProjects: boolean;
  compatibleWithWorkflowComplete: boolean;
  nextAction: string;
  manifestPath: string;
  reportPath: string;
  changedPaths: string[];
  versioning:
    | {
        status: "committed-and-pushed";
        commitHash: string;
        upstream: string;
        commitPushId: string;
      }
    | {
        status: "failed";
        errorMessage: string;
      };
}

export type TargetPrepareExecutionResult =
  | {
      status: "completed";
      summary: TargetPrepareSummary;
    }
  | {
      status: "blocked";
      reason:
        | "invalid-project-name"
        | "project-not-found"
        | "git-repo-missing"
        | "working-tree-dirty"
        | "codex-auth-missing";
      message: string;
    }
  | {
      status: "failed";
      message: string;
    };
