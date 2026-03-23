import assert from "node:assert/strict";
import test from "node:test";
import {
  CALLBACK_CHAT_DELIVERY_POLICY,
  INTERACTIVE_TELEGRAM_DELIVERY_POLICY,
  isTelegramMessageDeliveryDispatchError,
  TelegramDeliveryService,
  TICKET_OPEN_CONTENT_DELIVERY_POLICY,
} from "./telegram-delivery.js";

class SpyLogger {
  public readonly infos: Array<{ message: string; context?: Record<string, unknown> }> = [];
  public readonly warnings: Array<{ message: string; context?: Record<string, unknown> }> = [];
  public readonly errors: Array<{ message: string; context?: Record<string, unknown> }> = [];

  info(message: string, context?: Record<string, unknown>): void {
    this.infos.push({ message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.warnings.push({ message, context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.errors.push({ message, context });
  }
}

const createTelegramError = (errorCode: number, description: string, retryAfterSeconds?: number): Error =>
  Object.assign(new Error(description), {
    response: {
      error_code: errorCode,
      description,
      ...(retryAfterSeconds !== undefined
        ? {
            parameters: {
              retry_after: retryAfterSeconds,
            },
          }
        : {}),
    },
  });

test("retorna message_id e aplica formatacao centralizada de chunks para ticket aberto", async () => {
  const logger = new SpyLogger();
  const sentMessages: Array<{ chatId: string; text: string; extra?: unknown }> = [];
  let nextMessageId = 500;
  const service = new TelegramDeliveryService({
    logger,
    sendMessage: async (chatId, text, extra) => {
      sentMessages.push({ chatId, text, extra });
      const message_id = nextMessageId;
      nextMessageId += 1;
      return Promise.resolve({ message_id });
    },
    wait: async () => Promise.resolve(),
  });

  const delivery = await service.deliverTextMessage({
    destinationChatId: "42",
    text: "linha do ticket\n".repeat(400),
    logicalMessageType: "tickets-open-content",
    policy: TICKET_OPEN_CONTENT_DELIVERY_POLICY,
    logMessages: {
      success: "Conteudo de ticket aberto enviado no Telegram",
      transientFailure: "Falha transitoria ao enviar conteudo de ticket aberto no Telegram",
      definitiveFailure: "Falha definitiva ao enviar conteudo de ticket aberto no Telegram",
    },
    context: {
      flow: "tickets-open",
      ticketFileName: "2026-03-23-exemplo.md",
    },
    formatChunk: ({ chunk, chunkIndex, chunkCount }) =>
      [
        "🧾 Ticket aberto: 2026-03-23-exemplo.md",
        chunkCount > 1 ? `Parte ${chunkIndex}/${chunkCount}` : "Parte única",
        "",
        chunk,
      ].join("\n"),
  });

  assert.equal(sentMessages.length > 1, true);
  assert.equal(delivery.chunkCount, sentMessages.length);
  assert.equal(delivery.primaryMessageId, 500);
  assert.deepEqual(
    delivery.messages.map((message) => message.messageId),
    sentMessages.map((_, index) => 500 + index),
  );
  assert.match(sentMessages[0]?.text ?? "", /🧾 Ticket aberto: 2026-03-23-exemplo\.md/u);
  assert.match(sentMessages[0]?.text ?? "", /Parte 1\/\d+/u);
  assert.equal(logger.infos[0]?.context?.policy, "ticket-open-content");
  assert.equal(logger.infos[0]?.context?.logicalMessageType, "tickets-open-content");
});

test("politica interativa faz retry leve e registra logging padronizado", async () => {
  const logger = new SpyLogger();
  const retryDelays: number[] = [];
  let attempts = 0;
  const service = new TelegramDeliveryService({
    logger,
    sendMessage: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw createTelegramError(429, "Too Many Requests", 2);
      }

      return Promise.resolve({ message_id: 701 });
    },
    wait: async (delayMs) => {
      retryDelays.push(delayMs);
      return Promise.resolve();
    },
  });

  const delivery = await service.deliverTextMessage({
    destinationChatId: "42",
    text: "Pergunta interativa",
    logicalMessageType: "plan-spec-question",
    policy: INTERACTIVE_TELEGRAM_DELIVERY_POLICY,
    logMessages: {
      success: "Pergunta de /plan_spec enviada no Telegram",
      transientFailure: "Falha transitoria ao enviar pergunta de /plan_spec no Telegram",
      definitiveFailure: "Falha definitiva ao enviar pergunta de /plan_spec no Telegram",
    },
    context: {
      flow: "plan-spec",
      sessionId: 17,
    },
  });

  assert.equal(attempts, 2);
  assert.deepEqual(retryDelays, [2000]);
  assert.equal(delivery.attempts, 2);
  assert.equal(delivery.primaryMessageId, 701);
  assert.equal(logger.warnings[0]?.context?.policy, "interactive-message");
  assert.equal(logger.warnings[0]?.context?.logicalMessageType, "plan-spec-question");
  assert.equal(logger.warnings[0]?.context?.errorClass, "telegram-rate-limit");
  assert.equal(logger.infos[0]?.context?.result, "delivered");
});

test("politica de callback falha com erro estruturado e logging definitivo", async () => {
  const logger = new SpyLogger();
  const service = new TelegramDeliveryService({
    logger,
    sendMessage: async () => {
      throw createTelegramError(400, "Bad Request");
    },
    wait: async () => Promise.resolve(),
  });

  await assert.rejects(
    () =>
      service.deliverTextMessage({
        destinationChatId: "42",
        text: "Confirmacao de callback",
        logicalMessageType: "specs-callback-message",
        policy: CALLBACK_CHAT_DELIVERY_POLICY,
        logMessages: {
          success: "Confirmacao de callback de /specs enviada no Telegram",
          transientFailure: "Falha transitoria ao enviar confirmação de callback de /specs no chat",
          definitiveFailure: "Falha definitiva ao enviar confirmação de callback de /specs no chat",
        },
        context: {
          flow: "specs",
        },
      }),
    (error) =>
      isTelegramMessageDeliveryDispatchError(error) &&
      error.failure.errorClass === "non-retryable" &&
      error.failure.errorCode === "400",
  );

  assert.equal(logger.errors[0]?.message, "Falha definitiva ao enviar confirmação de callback de /specs no chat");
  assert.equal(logger.errors[0]?.context?.policy, "callback-chat-message");
  assert.equal(logger.errors[0]?.context?.logicalMessageType, "specs-callback-message");
  assert.equal(logger.errors[0]?.context?.result, "failed");
});
