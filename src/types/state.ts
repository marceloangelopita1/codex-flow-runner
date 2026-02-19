import { TicketFinalSummary, TicketNotificationDelivery } from "./ticket-final-summary.js";

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
  phase: RunnerPhase;
  lastMessage: string;
  updatedAt: Date;
  lastNotifiedEvent: RunnerLastNotifiedEvent | null;
}

export const createInitialState = (): RunnerState => ({
  isRunning: false,
  isPaused: false,
  currentTicket: null,
  phase: "idle",
  lastMessage: "Runner inicializado",
  updatedAt: new Date(),
  lastNotifiedEvent: null,
});
