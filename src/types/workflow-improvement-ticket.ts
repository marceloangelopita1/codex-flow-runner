import { createHash } from "node:crypto";

export type WorkflowImprovementTicketHandoffInputMode =
  | "spec-ticket-validation-history"
  | "follow-up-tickets"
  | "spec-and-audit-fallback";

export type WorkflowImprovementTicketAnalysisStage =
  | "spec-ticket-derivation-retrospective"
  | "spec-workflow-retrospective";

export interface WorkflowImprovementTicketTraceReference {
  traceId: string;
  requestPath: string;
  responsePath: string;
  decisionPath: string;
}

export interface WorkflowImprovementTicketDraftFinding {
  summary: string;
  affectedArtifactPaths: string[];
  requirementRefs: string[];
  evidence: string[];
}

export interface WorkflowImprovementTicketDraft {
  title: string;
  problemStatement: string;
  expectedBehavior: string;
  proposedSolution: string;
  reproductionSteps: string[];
  impactFunctional: string;
  impactOperational: string;
  regressionRisk: string;
  relevantAssumptionsDefaults: string[];
  closureCriteria: string[];
  affectedWorkflowSurfaces: string[];
}

export interface WorkflowImprovementTicketHandoff {
  analysisStage: WorkflowImprovementTicketAnalysisStage;
  activeProjectName: string;
  activeProjectPath: string;
  sourceSpecPath: string;
  sourceSpecFileName: string;
  sourceSpecTitle: string;
  inheritedAssumptionsDefaults: string[];
  inputMode: WorkflowImprovementTicketHandoffInputMode;
  analysisSummary: string;
  causalHypothesis: string;
  benefitSummary: string;
  ticketDraft: WorkflowImprovementTicketDraft;
  followUpTicketPaths: string[];
  workflowArtifactsConsulted: string[];
  trace: WorkflowImprovementTicketTraceReference | null;
  findings: WorkflowImprovementTicketDraftFinding[];
}

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

export interface WorkflowImprovementTicketFindingCandidate {
  fingerprint: string;
  summary: string;
  affectedArtifactPaths: string[];
  requirementRefs: string[];
  evidence: string[];
}

export interface WorkflowImprovementTicketCandidate {
  analysisStage: WorkflowImprovementTicketAnalysisStage;
  activeProjectName: string;
  activeProjectPath: string;
  sourceSpecPath: string;
  sourceSpecFileName: string;
  sourceSpecTitle: string;
  sourceRequirements: string[];
  inheritedAssumptionsDefaults: string[];
  inputMode: WorkflowImprovementTicketHandoffInputMode;
  analysisSummary: string;
  causalHypothesis: string;
  benefitSummary: string;
  ticketDraft: WorkflowImprovementTicketDraft;
  followUpTicketPaths: string[];
  workflowArtifactsConsulted: string[];
  trace: WorkflowImprovementTicketTraceReference | null;
  findings: WorkflowImprovementTicketFindingCandidate[];
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

export const buildWorkflowImprovementTicketFindingFingerprint = (
  finding: WorkflowImprovementTicketDraftFinding,
): string => {
  const digest = createHash("sha1")
    .update(finding.summary.trim())
    .update("\n")
    .update(
      [...finding.affectedArtifactPaths]
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "pt-BR"))
        .join("\n"),
    )
    .update("\n")
    .update(
      [...finding.requirementRefs]
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "pt-BR"))
        .join("\n"),
    )
    .update("\n")
    .update(
      [...finding.evidence]
        .map((value) => value.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, "pt-BR"))
        .join("\n"),
    )
    .digest("hex")
    .slice(0, 12);

  return `workflow-finding|${digest}`;
};
