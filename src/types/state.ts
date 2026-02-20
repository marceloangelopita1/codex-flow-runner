import { TicketFinalSummary, TicketNotificationDelivery } from "./ticket-final-summary.js";
import { ProjectRef } from "./project.js";

export type RunnerPhase =
  | "idle"
  | "select-spec"
  | "spec-triage"
  | "spec-close-and-version"
  | "select-ticket"
  | "plan"
  | "implement"
  | "close-and-version"
  | "plan-spec-awaiting-brief"
  | "plan-spec-waiting-codex"
  | "plan-spec-waiting-user"
  | "plan-spec-awaiting-final-action"
  | "paused"
  | "error";

export type PlanSpecSessionPhase =
  | "awaiting-brief"
  | "waiting-codex"
  | "waiting-user"
  | "awaiting-final-action";

export type PlanSpecCodexStream = "stdout" | "stderr";

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
  activeProjectSnapshot: ProjectRef;
}

export interface RunnerLastNotifiedEvent {
  summary: TicketFinalSummary;
  delivery: TicketNotificationDelivery;
}

export type RunnerSlotKind = "run-all" | "run-specs" | "plan-spec";

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
  planSpecSession: PlanSpecSessionState | null;
  phase: RunnerPhase;
  lastMessage: string;
  updatedAt: Date;
  lastNotifiedEvent: RunnerLastNotifiedEvent | null;
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
  planSpecSession: null,
  phase: "idle",
  lastMessage: "Runner inicializado",
  updatedAt: new Date(),
  lastNotifiedEvent: null,
});
