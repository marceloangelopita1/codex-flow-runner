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

export interface PlanSpecSessionState {
  chatId: string;
  phase: PlanSpecSessionPhase;
  startedAt: Date;
  lastActivityAt: Date;
  activeProjectSnapshot: ProjectRef;
}

export interface RunnerLastNotifiedEvent {
  summary: TicketFinalSummary;
  delivery: TicketNotificationDelivery;
}

export interface RunnerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTicket: string | null;
  currentSpec: string | null;
  activeProject: ProjectRef | null;
  planSpecSession: PlanSpecSessionState | null;
  phase: RunnerPhase;
  lastMessage: string;
  updatedAt: Date;
  lastNotifiedEvent: RunnerLastNotifiedEvent | null;
}

export const createInitialState = (activeProject: ProjectRef | null = null): RunnerState => ({
  isRunning: false,
  isPaused: false,
  currentTicket: null,
  currentSpec: null,
  activeProject: activeProject ? { ...activeProject } : null,
  planSpecSession: null,
  phase: "idle",
  lastMessage: "Runner inicializado",
  updatedAt: new Date(),
  lastNotifiedEvent: null,
});
