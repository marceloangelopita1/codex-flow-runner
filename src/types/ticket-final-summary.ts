export type TicketFinalStatus = "success" | "failure";

export type TicketFinalStage = "plan" | "implement" | "close-and-version";

export interface TicketFinalSummary {
  ticket: string;
  status: TicketFinalStatus;
  finalStage: TicketFinalStage;
  timestampUtc: string;
  errorMessage?: string;
}
