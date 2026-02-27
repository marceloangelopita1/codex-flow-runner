export type TicketFinalStatus = "success" | "failure";

export type TicketFinalStage = "plan" | "implement" | "close-and-version";

export type TicketNotificationErrorClass =
  | "telegram-rate-limit"
  | "telegram-server"
  | "transport"
  | "non-retryable";

interface TicketFinalSummaryBase {
  ticket: string;
  finalStage: TicketFinalStage;
  timestampUtc: string;
  activeProjectName: string;
  activeProjectPath: string;
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
  attempts?: number;
  maxAttempts?: number;
}

export interface TicketNotificationFailure {
  channel: "telegram";
  destinationChatId?: string;
  failedAtUtc: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string;
  errorCode?: string;
  errorClass: TicketNotificationErrorClass;
  retryable: boolean;
}

export class TicketNotificationDispatchError extends Error {
  constructor(
    message: string,
    public readonly failure: TicketNotificationFailure,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TicketNotificationDispatchError";
  }
}

export const isTicketNotificationDispatchError = (
  value: unknown,
): value is TicketNotificationDispatchError => value instanceof TicketNotificationDispatchError;
