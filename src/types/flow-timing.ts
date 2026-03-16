import { CodexFlowPreferencesSnapshot } from "./codex-preferences.js";

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

export type RunSpecsTriageTimingStage = "spec-triage" | "spec-close-and-version";

export type RunSpecsTriageFinalStage = RunSpecsTriageTimingStage | "unknown";

export type RunSpecsFlowTimingStage = RunSpecsTriageTimingStage | "run-all" | "spec-audit";

export type RunSpecsFlowFinalStage = RunSpecsFlowTimingStage | "unknown";

export type RunSpecsFlowCompletionReason =
  | "completed"
  | "triage-failure"
  | "run-all-failure"
  | "spec-audit-failure";

export interface RunSpecsFlowSummary {
  flow: "run-specs";
  outcome: "success" | "failure";
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
  runAllSummary?: RunAllFlowSummary;
}

export type RunnerFlowSummary = RunAllFlowSummary | RunSpecsFlowSummary;
