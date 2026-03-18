import {
  TicketFinalSummary,
  TicketNotificationDelivery,
  TicketNotificationFailure,
} from "./ticket-final-summary.js";
import { RunnerFlowSummary } from "./flow-timing.js";
import { ProjectRef } from "./project.js";
import {
  DiscoverSpecCategoryCoverageRecord,
  DiscoverSpecPendingItem,
} from "./discover-spec.js";
import { PlanSpecFinalBlock } from "../integrations/plan-spec-parser.js";

export type RunnerPhase =
  | "idle"
  | "select-spec"
  | "spec-triage"
  | "spec-close-and-version"
  | "spec-audit"
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

export interface RunnerLastNotifiedEvent {
  summary: TicketFinalSummary;
  delivery: TicketNotificationDelivery;
}

export interface RunnerLastNotificationFailure {
  summary: TicketFinalSummary;
  failure: TicketNotificationFailure;
}

export type RunnerSlotKind =
  | "run-all"
  | "run-specs"
  | "run-ticket"
  | "discover-spec"
  | "plan-spec"
  | "codex-chat";

export interface RunnerActiveSlotState {
  project: ProjectRef;
  kind: RunnerSlotKind;
  phase: RunnerPhase;
  currentTicket: string | null;
  currentSpec: string | null;
  isPaused: boolean;
  startedAt: Date;
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
  discoverSpecSession: DiscoverSpecSessionState | null;
  planSpecSession: PlanSpecSessionState | null;
  codexChatSession: CodexChatSessionState | null;
  lastCodexChatSessionClosure: CodexChatSessionLastClosureState | null;
  phase: RunnerPhase;
  lastMessage: string;
  updatedAt: Date;
  lastNotifiedEvent: RunnerLastNotifiedEvent | null;
  lastNotificationFailure: RunnerLastNotificationFailure | null;
  lastRunFlowSummary: RunnerFlowSummary | null;
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
  discoverSpecSession: null,
  planSpecSession: null,
  codexChatSession: null,
  lastCodexChatSessionClosure: null,
  phase: "idle",
  lastMessage: "Runner inicializado",
  updatedAt: new Date(),
  lastNotifiedEvent: null,
  lastNotificationFailure: null,
  lastRunFlowSummary: null,
});
