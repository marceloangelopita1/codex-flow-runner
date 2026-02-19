import { TicketFinalSummary, TicketNotificationDelivery } from "./ticket-final-summary.js";
import { ProjectRef } from "./project.js";

export type RunnerPhase =
  | "idle"
  | "select-ticket"
  | "plan"
  | "implement"
  | "close-and-version"
  | "paused"
  | "error";

export interface RunnerLastNotifiedEvent {
  summary: TicketFinalSummary;
  delivery: TicketNotificationDelivery;
}

export interface RunnerState {
  isRunning: boolean;
  isPaused: boolean;
  currentTicket: string | null;
  activeProject: ProjectRef | null;
  phase: RunnerPhase;
  lastMessage: string;
  updatedAt: Date;
  lastNotifiedEvent: RunnerLastNotifiedEvent | null;
}

export const createInitialState = (activeProject: ProjectRef | null = null): RunnerState => ({
  isRunning: false,
  isPaused: false,
  currentTicket: null,
  activeProject: activeProject ? { ...activeProject } : null,
  phase: "idle",
  lastMessage: "Runner inicializado",
  updatedAt: new Date(),
  lastNotifiedEvent: null,
});
