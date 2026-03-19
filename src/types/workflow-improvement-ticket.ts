import {
  SpecTicketValidationConfidenceLevel,
  SpecTicketValidationFinalReason,
  SpecTicketValidationGapType,
} from "./spec-ticket-validation.js";

export type WorkflowImprovementTicketPublicationStatus =
  | "not-needed"
  | "created-and-pushed"
  | "reused-open-ticket"
  | "operational-limitation";

export type WorkflowImprovementTicketTargetRepoKind =
  | "current-project"
  | "workflow-sibling"
  | "unresolved";

export type WorkflowImprovementTicketLimitationCode =
  | "target-repo-missing"
  | "target-repo-inaccessible"
  | "target-repo-invalid"
  | "ticket-write-failed"
  | "git-publish-failed"
  | "unexpected-error";

export interface WorkflowImprovementTicketGapCandidate {
  fingerprint: string;
  gapType: SpecTicketValidationGapType;
  summary: string;
  affectedArtifactPaths: string[];
  requirementRefs: string[];
  evidence: string[];
}

export interface WorkflowImprovementTicketCandidate {
  activeProjectName: string;
  activeProjectPath: string;
  sourceSpecPath: string;
  sourceSpecFileName: string;
  sourceSpecTitle: string;
  sourceRequirements: string[];
  inheritedAssumptionsDefaults: string[];
  validationSummary: string;
  finalValidationConfidence: SpecTicketValidationConfidenceLevel;
  finalValidationReason: SpecTicketValidationFinalReason;
  gaps: WorkflowImprovementTicketGapCandidate[];
  gapFingerprints: string[];
}

export interface WorkflowImprovementTicketPublicationResult {
  status: WorkflowImprovementTicketPublicationStatus;
  targetRepoKind: WorkflowImprovementTicketTargetRepoKind;
  targetRepoPath: string | null;
  targetRepoDisplayPath: string | null;
  ticketFileName: string | null;
  ticketPath: string | null;
  detail: string;
  limitationCode: WorkflowImprovementTicketLimitationCode | null;
  commitHash: string | null;
  pushUpstream: string | null;
  commitPushId: string | null;
  gapFingerprints: string[];
}
