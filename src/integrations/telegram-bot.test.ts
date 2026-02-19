import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../core/logger.js";
import { RunnerState } from "../types/state.js";
import { TelegramController } from "./telegram-bot.js";

class SpyLogger extends Logger {
  public readonly warnings: Array<{ message: string; context?: Record<string, unknown> }> = [];

  override info(): void {}

  override warn(message: string, context?: Record<string, unknown>): void {
    this.warnings.push({ message, context });
  }

  override error(): void {}
}

const createState = (): RunnerState => ({
  isRunning: false,
  isPaused: false,
  currentTicket: null,
  phase: "idle",
  lastMessage: "estado de teste",
  updatedAt: new Date("2026-02-19T00:00:00.000Z"),
});

type ControlCommand = "run-all" | "status" | "pause" | "resume";

interface ControllerOptions {
  allowedChatId?: string;
  runAllResult?: boolean;
}

const createController = (options: ControllerOptions = {}) => {
  const logger = new SpyLogger();
  const controlState = { runAllCalls: 0 };
  const controls = {
    runAll: () => {
      controlState.runAllCalls += 1;
      return options.runAllResult ?? true;
    },
    pause: () => undefined,
    resume: () => undefined,
  };

  const controller = new TelegramController(
    "123456:TEST_TOKEN",
    logger,
    createState,
    controls,
    options.allowedChatId,
  );

  return { controller, logger, controlState };
};

const callIsAllowed = (
  controller: TelegramController,
  chatId: string,
  command: ControlCommand,
): boolean => {
  const internalController = controller as unknown as {
    isAllowed: (context: {
      chatId: string;
      eventType: "command";
      command: ControlCommand;
    }) => boolean;
  };

  return internalController.isAllowed({
    chatId,
    eventType: "command",
    command,
  });
};

const callBuildRunAllReply = (controller: TelegramController): string => {
  const internalController = controller as unknown as {
    buildRunAllReply: () => string;
  };

  return internalController.buildRunAllReply();
};

test("permite comando quando chat e autorizado no modo restrito", () => {
  const { controller, logger } = createController({ allowedChatId: "42" });

  const allowed = callIsAllowed(controller, "42", "status");

  assert.equal(allowed, true);
  assert.equal(logger.warnings.length, 0);
});

test("bloqueia comando quando chat nao autorizado e registra contexto", () => {
  const { controller, logger } = createController({ allowedChatId: "42" });

  const allowed = callIsAllowed(controller, "99", "pause");

  assert.equal(allowed, false);
  assert.equal(logger.warnings.length, 1);
  assert.equal(logger.warnings[0]?.message, "Tentativa de acesso não autorizado ao bot");
  assert.deepEqual(logger.warnings[0]?.context, {
    chatId: "99",
    eventType: "command",
    command: "pause",
  });
});

test("permite comando de qualquer chat no modo sem restricao", () => {
  const { controller, logger } = createController();

  const allowed = callIsAllowed(controller, "999", "resume");

  assert.equal(allowed, true);
  assert.equal(logger.warnings.length, 0);
});

test("bloqueia /run-all quando chat nao autorizado", () => {
  const { controller, logger } = createController({ allowedChatId: "42" });

  const allowed = callIsAllowed(controller, "99", "run-all");

  assert.equal(allowed, false);
  assert.equal(logger.warnings.length, 1);
  assert.deepEqual(logger.warnings[0]?.context, {
    chatId: "99",
    eventType: "command",
    command: "run-all",
  });
});

test("gera resposta de inicio ao executar /run-all", () => {
  const { controller, controlState } = createController({ runAllResult: true });

  const reply = callBuildRunAllReply(controller);

  assert.equal(reply, "▶️ Runner iniciado via /run-all.");
  assert.equal(controlState.runAllCalls, 1);
});

test("gera resposta de ja em execucao quando /run-all nao inicia nova rodada", () => {
  const { controller, controlState } = createController({ runAllResult: false });

  const reply = callBuildRunAllReply(controller);

  assert.equal(reply, "ℹ️ Runner já está em execução.");
  assert.equal(controlState.runAllCalls, 1);
});
