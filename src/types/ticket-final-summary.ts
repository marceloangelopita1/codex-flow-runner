export type TicketFinalStatus = "success" | "failure";

export type TicketFinalStage = "plan" | "implement" | "close-and-version";

interface TicketFinalSummaryBase {
  ticket: string;
  finalStage: TicketFinalStage;
  timestampUtc: string;
}

export interface TicketFinalSuccessSummary extends TicketFinalSummaryBase {
  status: "success";
  execPlanPath: string;
  commitPushId: string;
  commitHash: string;
  pushUpstream: string;
}

export interface TicketFinalFailureSummary extends TicketFinalSummaryBase {
  status: "failure";
  errorMessage: string;
}

export type TicketFinalSummary = TicketFinalSuccessSummary | TicketFinalFailureSummary;

export interface TicketNotificationDelivery {
  channel: "telegram";
  destinationChatId: string;
  deliveredAtUtc: string;
}
