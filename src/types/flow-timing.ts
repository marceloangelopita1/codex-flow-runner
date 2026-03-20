import { CodexFlowPreferencesSnapshot } from "./codex-preferences.js";
import {
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationCyclePhase,
  SpecTicketValidationConfidenceLevel,
  SpecTicketValidationFinalReason,
  SpecTicketValidationGap,
  SpecTicketValidationVerdict,
} from "./spec-ticket-validation.js";
import { WorkflowGapAnalysisResult } from "./workflow-gap-analysis.js";
import { WorkflowImprovementTicketPublicationResult } from "./workflow-improvement-ticket.js";

export interface FlowTimingSnapshot<Stage extends string = string> {
  startedAtUtc: string;
  finishedAtUtc: string;
  totalDurationMs: number;
  durationsByStageMs: Partial<Record<Stage, number>>;
  completedStages: Stage[];
  interruptedStage: Stage | null;
}

export type RunAllTimingStage = "select-ticket" | "plan" | "implement" | "close-and-version";

export type RunAllFinalStage = RunAllTimingStage | "unknown";

export type RunAllCompletionReason =
  | "queue-empty"
  | "max-tickets-reached"
  | "ticket-failure"
  | "ticket-reappeared"
  | "no-go-limit-exceeded"
  | "stopped";

export interface RunAllFlowSummary {
  flow: "run-all";
  outcome: "success" | "failure";
  finalStage: RunAllFinalStage;
  completionReason: RunAllCompletionReason;
  timestampUtc: string;
  activeProjectName: string;
  activeProjectPath: string;
  processedTicketsCount: number;
  maxTicketsPerRound: number;
  ticket?: string;
  details?: string;
  codexPreferences?: CodexFlowPreferencesSnapshot;
  timing: FlowTimingSnapshot<RunAllTimingStage>;
}

export interface RunSpecsTargetRef {
  fileName: string;
  path: string;
}

export interface RunSpecsTicketValidationSummary {
  verdict: SpecTicketValidationVerdict;
  confidence: SpecTicketValidationConfidenceLevel;
  finalReason: SpecTicketValidationFinalReason;
  cyclesExecuted: number;
  validationThreadId: string | null;
  triageContextInherited: boolean;
  summary: string;
  gaps: SpecTicketValidationGap[];
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
  finalOpenGapFingerprints: string[];
  cycleHistory: RunSpecsTicketValidationCycleSummary[];
}

export interface RunSpecsTicketValidationCycleSummary {
  cycleNumber: number;
  phase: SpecTicketValidationCyclePhase;
  threadId: string;
  verdict: SpecTicketValidationVerdict;
  confidence: SpecTicketValidationConfidenceLevel;
  summary: string;
  openGapFingerprints: string[];
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
  realGapReductionFromPrevious: boolean | null;
}

export type RunSpecsDerivationRetrospectiveDecision =
  | "executed"
  | "skipped-no-reviewed-gaps"
  | "skipped-insufficient-structured-input";

export interface RunSpecsDerivationRetrospectiveSummary {
  decision: RunSpecsDerivationRetrospectiveDecision;
  summary: string;
  reviewedGapHistoryDetected: boolean;
  structuredInputAvailable: boolean;
  functionalVerdict: SpecTicketValidationVerdict | "unavailable";
  analysis?: WorkflowGapAnalysisResult;
  workflowImprovementTicket?: WorkflowImprovementTicketPublicationResult;
}

export type RunSpecsTriageTimingStage =
  | "spec-triage"
  | "spec-ticket-validation"
  | "spec-ticket-derivation-retrospective"
  | "spec-close-and-version";

export type RunSpecsTriageFinalStage = RunSpecsTriageTimingStage | "unknown";

export type RunSpecsFlowTimingStage =
  | RunSpecsTriageTimingStage
  | "run-all"
  | "spec-audit"
  | "spec-workflow-retrospective";

export type RunSpecsFlowFinalStage = RunSpecsFlowTimingStage | "unknown";

export type RunSpecsFlowCompletionReason =
  | "completed"
  | "triage-failure"
  | "spec-ticket-validation-no-go"
  | "spec-ticket-validation-failure"
  | "run-all-failure"
  | "spec-audit-failure"
  | "spec-workflow-retrospective-failure";

export interface RunSpecsFlowSummary {
  flow: "run-specs";
  outcome: "success" | "failure" | "blocked";
  finalStage: RunSpecsFlowFinalStage;
  completionReason: RunSpecsFlowCompletionReason;
  timestampUtc: string;
  activeProjectName: string;
  activeProjectPath: string;
  spec: RunSpecsTargetRef;
  details?: string;
  codexPreferences?: CodexFlowPreferencesSnapshot;
  triageTiming: FlowTimingSnapshot<RunSpecsTriageTimingStage>;
  timing: FlowTimingSnapshot<RunSpecsFlowTimingStage>;
  specTicketValidation?: RunSpecsTicketValidationSummary;
  specTicketDerivationRetrospective?: RunSpecsDerivationRetrospectiveSummary;
  workflowGapAnalysis?: WorkflowGapAnalysisResult;
  workflowImprovementTicket?: WorkflowImprovementTicketPublicationResult;
  runAllSummary?: RunAllFlowSummary;
}

export type RunnerFlowSummary = RunAllFlowSummary | RunSpecsFlowSummary;

export type FlowNotificationErrorClass =
  | "telegram-rate-limit"
  | "telegram-server"
  | "transport"
  | "non-retryable";

export interface FlowNotificationDelivery {
  channel: "telegram";
  destinationChatId: string;
  deliveredAtUtc: string;
  attempts?: number;
  maxAttempts?: number;
  chunkCount?: number;
}

export interface FlowNotificationFailure {
  channel: "telegram";
  destinationChatId?: string;
  failedAtUtc: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string;
  errorCode?: string;
  errorClass: FlowNotificationErrorClass;
  retryable: boolean;
  failedChunkIndex?: number;
  chunkCount?: number;
}

export class FlowNotificationDispatchError extends Error {
  constructor(
    message: string,
    public readonly failure: FlowNotificationFailure,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "FlowNotificationDispatchError";
  }
}

export const isFlowNotificationDispatchError = (
  value: unknown,
): value is FlowNotificationDispatchError => value instanceof FlowNotificationDispatchError;
