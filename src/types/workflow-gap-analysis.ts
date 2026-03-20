import type { WorkflowImprovementTicketHandoff } from "./workflow-improvement-ticket.js";

export const WORKFLOW_GAP_ANALYSIS_CLASSIFICATIONS = [
  "systemic-gap",
  "systemic-hypothesis",
  "not-systemic",
  "emphasis-only",
  "operational-limitation",
] as const;

export type WorkflowGapAnalysisClassification =
  (typeof WORKFLOW_GAP_ANALYSIS_CLASSIFICATIONS)[number];

export const WORKFLOW_GAP_ANALYSIS_CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
] as const;

export type WorkflowGapAnalysisConfidenceLevel =
  (typeof WORKFLOW_GAP_ANALYSIS_CONFIDENCE_LEVELS)[number];

export const WORKFLOW_GAP_ANALYSIS_INPUT_MODES = [
  "spec-ticket-validation-history",
  "follow-up-tickets",
  "spec-and-audit-fallback",
] as const;

export type WorkflowGapAnalysisInputMode =
  (typeof WORKFLOW_GAP_ANALYSIS_INPUT_MODES)[number];

export const WORKFLOW_GAP_ANALYSIS_LIMITATION_CODES = [
  "analysis-execution-failed",
  "invalid-analysis-contract",
  "workflow-repo-context-missing",
] as const;

export type WorkflowGapAnalysisLimitationCode =
  (typeof WORKFLOW_GAP_ANALYSIS_LIMITATION_CODES)[number];

export interface WorkflowGapAnalysisFinding {
  summary: string;
  affectedArtifactPaths: string[];
  requirementRefs: string[];
  evidence: string[];
}

export interface WorkflowGapAnalysisOperationalLimitation {
  code: WorkflowGapAnalysisLimitationCode;
  detail: string;
}

export interface WorkflowGapAnalysisResult {
  classification: WorkflowGapAnalysisClassification;
  confidence: WorkflowGapAnalysisConfidenceLevel;
  publicationEligibility: boolean;
  inputMode: WorkflowGapAnalysisInputMode;
  summary: string;
  causalHypothesis: string;
  benefitSummary: string;
  findings: WorkflowGapAnalysisFinding[];
  workflowArtifactsConsulted: string[];
  followUpTicketPaths: string[];
  limitation: WorkflowGapAnalysisOperationalLimitation | null;
  publicationHandoff?: WorkflowImprovementTicketHandoff;
}

export const createWorkflowGapAnalysisOperationalLimitation = (params: {
  inputMode: WorkflowGapAnalysisInputMode;
  summary: string;
  detail: string;
  followUpTicketPaths?: string[];
  workflowArtifactsConsulted?: string[];
  code?: WorkflowGapAnalysisLimitationCode;
}): WorkflowGapAnalysisResult => ({
  classification: "operational-limitation",
  confidence: "low",
  publicationEligibility: false,
  inputMode: params.inputMode,
  summary: params.summary,
  causalHypothesis: "Analise causal indisponivel por limitacao operacional.",
  benefitSummary: "Nenhum ticket automatico deve ser aberto enquanto a limitacao persistir.",
  findings: [],
  workflowArtifactsConsulted: [...(params.workflowArtifactsConsulted ?? [])],
  followUpTicketPaths: [...(params.followUpTicketPaths ?? [])],
  limitation: {
    code: params.code ?? "analysis-execution-failed",
    detail: params.detail,
  },
});
