import {
  TicketFinalSummary,
  TicketNotificationDelivery,
  TicketNotificationFailure,
} from "./ticket-final-summary.js";
import {
  FlowNotificationDelivery,
  FlowNotificationFailure,
  RunSpecsEntryPoint,
  RunSpecsSourceCommand,
  RunnerFlowSummary,
} from "./flow-timing.js";
import { ProjectRef } from "./project.js";
import {
  TargetFlowCommand,
  TargetFlowKind,
  TargetFlowMilestone,
  TargetFlowVersionBoundaryState,
} from "./target-flow.js";
import {
  DiscoverSpecCategoryCoverageRecord,
  DiscoverSpecPendingItem,
} from "./discover-spec.js";
import { PlanSpecFinalBlock } from "../integrations/plan-spec-parser.js";

export type RunnerPhase =
  | "idle"
  | "select-spec"
  | "spec-triage"
  | "spec-ticket-validation"
  | "spec-ticket-derivation-retrospective"
  | "spec-close-and-version"
  | "spec-audit"
  | "spec-workflow-retrospective"
  | "select-ticket"
  | "plan"
  | "implement"
  | "close-and-version"
  | "discover-spec-awaiting-brief"
  | "discover-spec-waiting-codex"
  | "discover-spec-waiting-user"
  | "discover-spec-awaiting-final-action"
  | "plan-spec-awaiting-brief"
  | "plan-spec-waiting-codex"
  | "plan-spec-waiting-user"
  | "plan-spec-awaiting-final-action"
  | "target-prepare-preflight"
  | "target-prepare-ai-adjustment"
  | "target-prepare-post-check"
  | "target-prepare-versioning"
  | "target-checkup-preflight"
  | "target-checkup-evidence-collection"
  | "target-checkup-editorial-summary"
  | "target-checkup-versioning"
  | "target-derive-preflight"
  | "target-derive-dedup-prioritization"
  | "target-derive-materialization"
  | "target-derive-versioning"
  | "target-investigate-case-preflight"
  | "target-investigate-case-case-resolution"
  | "target-investigate-case-evidence-collection"
  | "target-investigate-case-assessment"
  | "target-investigate-case-publication"
  | "codex-chat-waiting-user"
  | "codex-chat-waiting-codex"
  | "paused"
  | "error";

export type PlanSpecSessionPhase =
  | "awaiting-brief"
  | "waiting-codex"
  | "waiting-user"
  | "awaiting-final-action";

export type PlanSpecCodexStream = "stdout" | "stderr";

export type DiscoverSpecSessionPhase =
  | "awaiting-brief"
  | "waiting-codex"
  | "waiting-user"
  | "awaiting-final-action";

export type DiscoverSpecCodexStream = "stdout" | "stderr";

export interface DiscoverSpecSessionState {
  sessionId?: number;
  chatId: string;
  phase: DiscoverSpecSessionPhase;
  startedAt: Date;
  lastActivityAt: Date;
  waitingCodexSinceAt: Date | null;
  lastCodexActivityAt: Date | null;
  lastCodexStream: DiscoverSpecCodexStream | null;
  lastCodexPreview: string | null;
  observedModel: string | null;
  observedReasoningEffort: string | null;
  observedAt: Date | null;
  activeProjectSnapshot: ProjectRef;
  categoryCoverage: DiscoverSpecCategoryCoverageRecord;
  pendingItems: DiscoverSpecPendingItem[];
  latestFinalBlock: PlanSpecFinalBlock | null;
  createSpecEligible: boolean;
  createSpecBlockReason: string | null;
}

export interface PlanSpecSessionState {
  sessionId?: number;
  chatId: string;
  phase: PlanSpecSessionPhase;
  startedAt: Date;
  lastActivityAt: Date;
  waitingCodexSinceAt: Date | null;
  lastCodexActivityAt: Date | null;
  lastCodexStream: PlanSpecCodexStream | null;
  lastCodexPreview: string | null;
  observedModel: string | null;
  observedReasoningEffort: string | null;
  observedAt: Date | null;
  activeProjectSnapshot: ProjectRef;
}

export type CodexChatSessionPhase = "waiting-user" | "waiting-codex";

export type CodexChatCodexStream = "stdout" | "stderr";

export type CodexChatSessionClosureReason =
  | "manual"
  | "timeout"
  | "command-handoff"
  | "unexpected-close"
  | "failure"
  | "shutdown";

export interface CodexChatSessionState {
  sessionId?: number;
  chatId: string;
  phase: CodexChatSessionPhase;
  startedAt: Date;
  lastActivityAt: Date;
  waitingCodexSinceAt: Date | null;
  userInactivitySinceAt: Date | null;
  lastCodexActivityAt: Date | null;
  lastCodexStream: CodexChatCodexStream | null;
  lastCodexPreview: string | null;
  observedModel: string | null;
  observedReasoningEffort: string | null;
  observedAt: Date | null;
  activeProjectSnapshot: ProjectRef;
}

export interface CodexChatSessionLastClosureState {
  reason: CodexChatSessionClosureReason;
  closedAt: Date;
  chatId: string;
  sessionId: number | null;
  phase: CodexChatSessionPhase | null;
  message: string;
  activeProjectSnapshot: ProjectRef;
  triggeringCommand: string | null;
}

export type CodexChatOutputNotificationErrorClass =
  | "telegram-rate-limit"
  | "telegram-server"
  | "transport"
  | "non-retryable";

export interface CodexChatOutputDelivery {
  channel: "telegram";
  destinationChatId: string;
  deliveredAtUtc: string;
  attempts?: number;
  maxAttempts?: number;
  chunkCount?: number;
}

export interface CodexChatOutputFailure {
  channel: "telegram";
  destinationChatId?: string;
  failedAtUtc: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string;
  errorCode?: string;
  errorClass: CodexChatOutputNotificationErrorClass;
  retryable: boolean;
  failedChunkIndex?: number;
  chunkCount?: number;
}

export interface RunnerLastCodexChatOutputEvent {
  chatId: string;
  sessionId: number | null;
  delivery: CodexChatOutputDelivery;
}

export interface RunnerLastCodexChatOutputFailure {
  chatId: string;
  sessionId: number | null;
  failure: CodexChatOutputFailure;
}

export interface RunnerLastNotifiedEvent {
  summary: TicketFinalSummary;
  delivery: TicketNotificationDelivery;
}

export interface RunnerLastNotificationFailure {
  summary: TicketFinalSummary;
  failure: TicketNotificationFailure;
}

export interface RunnerLastFlowNotifiedEvent {
  summary: RunnerFlowSummary;
  delivery: FlowNotificationDelivery;
}

export interface RunnerLastFlowNotificationFailure {
  summary: RunnerFlowSummary;
  failure: FlowNotificationFailure;
}

export type RunnerSlotKind =
  | "run-all"
  | "run-specs"
  | "run-ticket"
  | "discover-spec"
  | "plan-spec"
  | "codex-chat"
  | "target-prepare"
  | "target-checkup"
  | "target-derive"
  | "target-investigate-case";

export interface RunnerActiveSlotState {
  project: ProjectRef;
  kind: RunnerSlotKind;
  phase: RunnerPhase;
  currentTicket: string | null;
  currentSpec: string | null;
  runSpecsSourceCommand?: RunSpecsSourceCommand;
  runSpecsEntryPoint?: RunSpecsEntryPoint;
  targetFlowCommand?: TargetFlowCommand;
  targetFlowMilestone?: TargetFlowMilestone;
  targetFlowVersionBoundaryState?: TargetFlowVersionBoundaryState;
  isPaused: boolean;
  startedAt: Date;
}

export interface RunnerTargetFlowState {
  flow: TargetFlowKind;
  command: TargetFlowCommand;
  targetProject: ProjectRef;
  phase: RunnerPhase;
  milestone: TargetFlowMilestone;
  milestoneLabel: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
  cancelRequestedAt: Date | null;
  startedAt: Date;
  updatedAt: Date;
  lastMessage: string;
}

export interface RunnerCapacitySnapshot {
  limit: number;
  used: number;
}

export interface RunnerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTicket: string | null;
  currentSpec: string | null;
  activeProject: ProjectRef | null;
  capacity: RunnerCapacitySnapshot;
  activeSlots: RunnerActiveSlotState[];
  targetFlow: RunnerTargetFlowState | null;
  discoverSpecSession: DiscoverSpecSessionState | null;
  planSpecSession: PlanSpecSessionState | null;
  codexChatSession: CodexChatSessionState | null;
  lastCodexChatSessionClosure: CodexChatSessionLastClosureState | null;
  lastCodexChatOutputEvent: RunnerLastCodexChatOutputEvent | null;
  lastCodexChatOutputFailure: RunnerLastCodexChatOutputFailure | null;
  phase: RunnerPhase;
  lastMessage: string;
  updatedAt: Date;
  lastNotifiedEvent: RunnerLastNotifiedEvent | null;
  lastNotificationFailure: RunnerLastNotificationFailure | null;
  lastRunFlowSummary: RunnerFlowSummary | null;
  lastRunFlowNotificationEvent: RunnerLastFlowNotifiedEvent | null;
  lastRunFlowNotificationFailure: RunnerLastFlowNotificationFailure | null;
}

export const createInitialState = (
  activeProject: ProjectRef | null = null,
  capacityLimit = 5,
): RunnerState => ({
  isRunning: false,
  isPaused: false,
  currentTicket: null,
  currentSpec: null,
  activeProject: activeProject ? { ...activeProject } : null,
  capacity: {
    limit: capacityLimit,
    used: 0,
  },
  activeSlots: [],
  targetFlow: null,
  discoverSpecSession: null,
  planSpecSession: null,
  codexChatSession: null,
  lastCodexChatSessionClosure: null,
  lastCodexChatOutputEvent: null,
  lastCodexChatOutputFailure: null,
  phase: "idle",
  lastMessage: "Runner inicializado",
  updatedAt: new Date(),
  lastNotifiedEvent: null,
  lastNotificationFailure: null,
  lastRunFlowSummary: null,
  lastRunFlowNotificationEvent: null,
  lastRunFlowNotificationFailure: null,
});
