export type TelegramDeliveryErrorClass =
  | "telegram-rate-limit"
  | "telegram-server"
  | "transport"
  | "non-retryable";

export interface TelegramDeliveryPolicy {
  name: string;
  maxAttempts: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  chunking?: {
    maxChunkLength: number;
    includePartHeader: boolean;
  };
}

export interface TelegramDeliveryLogMessages {
  success: string;
  transientFailure: string;
  definitiveFailure: string;
}

export interface TelegramDeliveryResult {
  destinationChatId: string;
  deliveredAtUtc: string;
  attempts: number;
  maxAttempts: number;
  chunkCount: number;
  policy: string;
  logicalMessageType: string;
  primaryMessageId: number | null;
  messages: TelegramDeliveredMessage[];
}

export interface TelegramDeliveryFailure {
  destinationChatId: string;
  failedAtUtc: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string;
  errorCode?: string;
  errorClass: TelegramDeliveryErrorClass;
  retryable: boolean;
  failedChunkIndex?: number;
  chunkCount: number;
  policy: string;
  logicalMessageType: string;
}

export class TelegramMessageDeliveryDispatchError extends Error {
  constructor(
    message: string,
    public readonly failure: TelegramDeliveryFailure,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "TelegramMessageDeliveryDispatchError";
  }
}

export const isTelegramMessageDeliveryDispatchError = (
  value: unknown,
): value is TelegramMessageDeliveryDispatchError => value instanceof TelegramMessageDeliveryDispatchError;

interface TelegramApiErrorLike {
  response?: {
    error_code?: unknown;
    description?: unknown;
    parameters?: {
      retry_after?: unknown;
    };
  };
  code?: unknown;
  cause?: unknown;
}

interface TelegramDeliveryErrorClassification {
  retryable: boolean;
  errorClass: TelegramDeliveryErrorClass;
  errorCode?: string;
  retryAfterMs?: number;
  message: string;
}

interface TelegramDeliveryLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

interface TelegramDeliveryServiceOptions {
  logger: TelegramDeliveryLogger;
  sendMessage: (chatId: string, text: string, extra?: unknown) => Promise<unknown>;
  wait: (delayMs: number) => Promise<void>;
}

export interface TelegramDeliveredMessage {
  chunkIndex: number;
  messageId: number | null;
}

export interface DeliverTelegramTextMessageInput {
  destinationChatId: string;
  text: string;
  logicalMessageType: string;
  policy: TelegramDeliveryPolicy;
  logMessages: TelegramDeliveryLogMessages;
  context?: Record<string, unknown>;
  extra?: unknown;
  formatChunk?: (value: { chunk: string; chunkIndex: number; chunkCount: number }) => string;
}

const RETRYABLE_TRANSPORT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETUNREACH",
]);

export const TICKET_FINAL_SUMMARY_DELIVERY_POLICY: TelegramDeliveryPolicy = {
  name: "ticket-final-summary",
  maxAttempts: 4,
  baseBackoffMs: 1000,
  maxBackoffMs: 10_000,
};

export const RUN_FLOW_SUMMARY_DELIVERY_POLICY: TelegramDeliveryPolicy = {
  name: "run-flow-summary",
  maxAttempts: 4,
  baseBackoffMs: 1000,
  maxBackoffMs: 10_000,
  chunking: {
    maxChunkLength: 3500,
    includePartHeader: true,
  },
};

export const RUN_SPECS_TRIAGE_MILESTONE_DELIVERY_POLICY: TelegramDeliveryPolicy = {
  name: "run-specs-triage-milestone",
  maxAttempts: 4,
  baseBackoffMs: 1000,
  maxBackoffMs: 10_000,
};

export const INTERACTIVE_TELEGRAM_DELIVERY_POLICY: TelegramDeliveryPolicy = {
  name: "interactive-message",
  maxAttempts: 2,
  baseBackoffMs: 500,
  maxBackoffMs: 2_000,
};

export const CALLBACK_CHAT_DELIVERY_POLICY: TelegramDeliveryPolicy = {
  name: "callback-chat-message",
  maxAttempts: 2,
  baseBackoffMs: 500,
  maxBackoffMs: 2_000,
};

export const TICKET_OPEN_CONTENT_DELIVERY_POLICY: TelegramDeliveryPolicy = {
  name: "ticket-open-content",
  maxAttempts: 2,
  baseBackoffMs: 500,
  maxBackoffMs: 2_000,
  chunking: {
    maxChunkLength: 3500,
    includePartHeader: false,
  },
};

export class TelegramDeliveryService {
  constructor(private readonly options: TelegramDeliveryServiceOptions) {}

  async deliverTextMessage(input: DeliverTelegramTextMessageInput): Promise<TelegramDeliveryResult> {
    const chunks = this.buildChunks(input);
    let maxAttemptUsed = 0;
    const messages: TelegramDeliveredMessage[] = [];

    for (const [index, chunk] of chunks.entries()) {
      for (let attempt = 1; attempt <= input.policy.maxAttempts; attempt += 1) {
        try {
          const response = await this.options.sendMessage(input.destinationChatId, chunk, input.extra);
          maxAttemptUsed = Math.max(maxAttemptUsed, attempt);
          messages.push({
            chunkIndex: index + 1,
            messageId: this.readOutgoingMessageId(response),
          });
          break;
        } catch (error) {
          const classification = this.classifySendError(error);
          const isLastAttempt = attempt >= input.policy.maxAttempts;
          const canRetry = classification.retryable && !isLastAttempt;
          const attemptContext = this.buildLogContext(input, {
            attempts: attempt,
            maxAttempts: input.policy.maxAttempts,
            chunkCount: chunks.length,
            failedChunkIndex: index + 1,
            errorClass: classification.errorClass,
            errorCode: classification.errorCode,
            errorMessage: classification.message,
          });

          if (!canRetry) {
            const failedAtUtc = new Date().toISOString();
            const failure: TelegramDeliveryFailure = {
              destinationChatId: input.destinationChatId,
              failedAtUtc,
              attempts: attempt,
              maxAttempts: input.policy.maxAttempts,
              errorMessage: classification.message,
              ...(classification.errorCode ? { errorCode: classification.errorCode } : {}),
              errorClass: classification.errorClass,
              retryable: classification.retryable,
              failedChunkIndex: index + 1,
              chunkCount: chunks.length,
              policy: input.policy.name,
              logicalMessageType: input.logicalMessageType,
            };

            this.options.logger.error(input.logMessages.definitiveFailure, {
              ...attemptContext,
              failedAtUtc,
              retryable: classification.retryable,
              result: "failed",
            });

            throw new TelegramMessageDeliveryDispatchError(input.logMessages.definitiveFailure, failure, {
              cause: error,
            });
          }

          const retryDelayMs = this.resolveRetryDelayMs(input.policy, classification, attempt);
          this.options.logger.warn(input.logMessages.transientFailure, {
            ...attemptContext,
            retryDelayMs,
            retryable: classification.retryable,
            result: "retrying",
          });
          await this.options.wait(retryDelayMs);
        }
      }
    }

    const delivery: TelegramDeliveryResult = {
      destinationChatId: input.destinationChatId,
      deliveredAtUtc: new Date().toISOString(),
      attempts: maxAttemptUsed,
      maxAttempts: input.policy.maxAttempts,
      chunkCount: chunks.length,
      policy: input.policy.name,
      logicalMessageType: input.logicalMessageType,
      primaryMessageId: messages[0]?.messageId ?? null,
      messages,
    };

    this.options.logger.info(input.logMessages.success, {
      ...this.buildLogContext(input, delivery),
      result: "delivered",
    });

    return delivery;
  }

  private buildLogContext(
    input: DeliverTelegramTextMessageInput,
    result: Partial<TelegramDeliveryResult> &
      Partial<TelegramDeliveryFailure> & {
        errorMessage?: string;
      },
  ): Record<string, unknown> {
    return {
      destinationChatId: input.destinationChatId,
      policy: input.policy.name,
      logicalMessageType: input.logicalMessageType,
      ...(input.context ?? {}),
      ...(result.attempts !== undefined ? { attempts: result.attempts } : {}),
      ...(result.maxAttempts !== undefined ? { maxAttempts: result.maxAttempts } : {}),
      ...(result.chunkCount !== undefined ? { chunkCount: result.chunkCount } : {}),
      ...(result.failedChunkIndex !== undefined ? { chunkIndex: result.failedChunkIndex } : {}),
      ...(result.errorClass ? { errorClass: result.errorClass } : {}),
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      ...(result.errorMessage ? { error: result.errorMessage } : {}),
    };
  }

  private classifySendError(error: unknown): TelegramDeliveryErrorClassification {
    const apiError = this.readTelegramApiErrorContext(error);
    if (apiError?.errorCode === 429) {
      return {
        retryable: true,
        errorClass: "telegram-rate-limit",
        errorCode: "429",
        retryAfterMs: apiError.retryAfterMs,
        message: apiError.message,
      };
    }

    if (typeof apiError?.errorCode === "number" && apiError.errorCode >= 500 && apiError.errorCode <= 599) {
      return {
        retryable: true,
        errorClass: "telegram-server",
        errorCode: String(apiError.errorCode),
        message: apiError.message,
      };
    }

    const transportErrorCode = this.readTransportErrorCode(error);
    if (transportErrorCode && RETRYABLE_TRANSPORT_ERROR_CODES.has(transportErrorCode)) {
      return {
        retryable: true,
        errorClass: "transport",
        errorCode: transportErrorCode,
        message: this.resolveErrorMessage(error),
      };
    }

    return {
      retryable: false,
      errorClass: "non-retryable",
      ...(apiError?.errorCode !== undefined
        ? { errorCode: String(apiError.errorCode) }
        : transportErrorCode
          ? { errorCode: transportErrorCode }
          : {}),
      message: apiError?.message ?? this.resolveErrorMessage(error),
    };
  }

  private resolveRetryDelayMs(
    policy: TelegramDeliveryPolicy,
    classification: TelegramDeliveryErrorClassification,
    attempt: number,
  ): number {
    if (classification.retryAfterMs !== undefined) {
      return Math.min(policy.maxBackoffMs, classification.retryAfterMs);
    }

    const exponentialBackoffMs = policy.baseBackoffMs * Math.pow(2, Math.max(attempt - 1, 0));
    return Math.min(policy.maxBackoffMs, exponentialBackoffMs);
  }

  private readTelegramApiErrorContext(
    error: unknown,
  ): { errorCode?: number; retryAfterMs?: number; message: string } | null {
    if (!error || typeof error !== "object") {
      return null;
    }

    const maybeTelegramError = error as TelegramApiErrorLike;
    const description = maybeTelegramError.response?.description;
    const messageFromApi = typeof description === "string" ? description : null;
    const message = messageFromApi ?? this.resolveErrorMessage(error);
    const errorCode = this.readNumericValue(maybeTelegramError.response?.error_code);
    const retryAfterSeconds = this.readNumericValue(maybeTelegramError.response?.parameters?.retry_after);
    const retryAfterMs =
      retryAfterSeconds !== undefined ? Math.max(0, Math.floor(retryAfterSeconds * 1000)) : undefined;

    return {
      ...(errorCode !== undefined ? { errorCode } : {}),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      message,
    };
  }

  private readTransportErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== "object") {
      return undefined;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string") {
      return maybeCode.toUpperCase();
    }

    const cause = (error as { cause?: unknown }).cause;
    if (!cause || typeof cause !== "object") {
      return undefined;
    }

    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") {
      return causeCode.toUpperCase();
    }

    return undefined;
  }

  private readNumericValue(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private readOutgoingMessageId(message: unknown): number | null {
    if (!message || typeof message !== "object") {
      return null;
    }

    const value = (message as { message_id?: unknown }).message_id;
    return typeof value === "number" ? value : null;
  }

  private buildChunks(input: DeliverTelegramTextMessageInput): string[] {
    const rawChunks = this.chunkText(input.text, input.policy.chunking?.maxChunkLength);
    if (!input.formatChunk) {
      return this.formatChunks(rawChunks, input.policy);
    }

    return rawChunks.map((chunk, index) =>
      input.formatChunk?.({
        chunk,
        chunkIndex: index + 1,
        chunkCount: rawChunks.length,
      }) ?? chunk,
    );
  }

  private formatChunks(rawChunks: string[], policy: TelegramDeliveryPolicy): string[] {
    return rawChunks.map((chunk, index) =>
      rawChunks.length <= 1 || !policy.chunking?.includePartHeader
        ? chunk
        : [`Parte ${index + 1}/${rawChunks.length}`, "", chunk].join("\n"),
    );
  }

  private chunkText(content: string, maxChunkLength?: number): string[] {
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const source = normalizedContent.length > 0 ? normalizedContent : "(arquivo vazio)";
    if (!maxChunkLength || source.length <= maxChunkLength) {
      return [source];
    }

    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < source.length) {
      const maxEnd = Math.min(cursor + maxChunkLength, source.length);
      let chunkEnd = maxEnd;

      if (maxEnd < source.length) {
        const sectionBreakAt = source.lastIndexOf("\n\n", maxEnd - 1);
        if (sectionBreakAt >= cursor) {
          chunkEnd = sectionBreakAt + 2;
        } else {
          const breakAt = source.lastIndexOf("\n", maxEnd - 1);
          if (breakAt >= cursor) {
            chunkEnd = breakAt + 1;
          }
        }
      }

      if (chunkEnd <= cursor) {
        chunkEnd = maxEnd;
      }

      chunks.push(source.slice(cursor, chunkEnd));
      cursor = chunkEnd;
    }

    return chunks;
  }
}
