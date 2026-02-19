import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../core/logger.js";
import { RunnerState } from "../types/state.js";
import { TicketFinalFailureSummary, TicketFinalSuccessSummary } from "../types/ticket-final-summary.js";
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
  activeProject: {
    name: "codex-flow-runner",
    path: "/home/mapita/projetos/codex-flow-runner",
  },
  phase: "idle",
  lastMessage: "estado de teste",
  updatedAt: new Date("2026-02-19T00:00:00.000Z"),
  lastNotifiedEvent: null,
});

type ControlCommand = "start" | "run-all" | "status" | "pause" | "resume";

interface ControllerOptions {
  allowedChatId?: string;
  runAllStatus?: "started" | "already-running" | "blocked";
  runAllMessage?: string;
}

const createController = (options: ControllerOptions = {}) => {
  const logger = new SpyLogger();
  const controlState = { runAllCalls: 0 };
  const controls = {
    runAll: () => {
      controlState.runAllCalls += 1;
      if (options.runAllStatus === "already-running") {
        return { status: "already-running" as const };
      }

      if (options.runAllStatus === "blocked") {
        return {
          status: "blocked" as const,
          reason: "codex-auth-missing" as const,
          message:
            options.runAllMessage ??
            "Codex CLI nao autenticado. Execute `codex login` no mesmo usuario que roda o runner.",
        };
      }

      return { status: "started" as const };
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

const callBuildRunAllReply = async (
  controller: TelegramController,
): Promise<{ reply: string; started: boolean }> => {
  const internalController = controller as unknown as {
    buildRunAllReply: () => Promise<{ reply: string; started: boolean }>;
  };

  return internalController.buildRunAllReply();
};

const callBuildStartReply = (controller: TelegramController): string => {
  const internalController = controller as unknown as {
    buildStartReply: () => string;
  };

  return internalController.buildStartReply();
};

const callCaptureNotificationChat = (controller: TelegramController, chatId: string): void => {
  const internalController = controller as unknown as {
    captureNotificationChat: (value: string) => void;
  };

  internalController.captureNotificationChat(chatId);
};

const callBuildStatusReply = (controller: TelegramController, state: RunnerState): string => {
  const internalController = controller as unknown as {
    buildStatusReply: (value: RunnerState) => string;
  };

  return internalController.buildStatusReply(state);
};

const mockSendMessage = (controller: TelegramController) => {
  const messages: Array<{ chatId: string; text: string }> = [];
  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: (chatId: string, text: string) => Promise<unknown>;
      };
    };
  };

  internalController.bot.telegram.sendMessage = async (chatId: string, text: string) => {
    messages.push({ chatId, text });
    return Promise.resolve();
  };

  return messages;
};

const createSuccessSummary = (
  value: Partial<TicketFinalSuccessSummary> = {},
): TicketFinalSuccessSummary => ({
  ticket: "2026-02-19-flow-a.md",
  activeProjectName: "codex-flow-runner",
  activeProjectPath: "/home/mapita/projetos/codex-flow-runner",
  status: "success",
  finalStage: "close-and-version",
  timestampUtc: "2026-02-19T15:00:00.000Z",
  execPlanPath: "execplans/2026-02-19-flow-a.md",
  commitPushId: "abc123@origin/main",
  commitHash: "abc123",
  pushUpstream: "origin/main",
  ...value,
});

const createFailureSummary = (
  value: Partial<TicketFinalFailureSummary> = {},
): TicketFinalFailureSummary => ({
  ticket: "2026-02-19-flow-a.md",
  activeProjectName: "codex-flow-runner",
  activeProjectPath: "/home/mapita/projetos/codex-flow-runner",
  status: "failure",
  finalStage: "implement",
  timestampUtc: "2026-02-19T15:00:00.000Z",
  errorMessage: "falha simulada",
  ...value,
});

test("permite comando quando chat e autorizado no modo restrito", () => {
  const { controller, logger } = createController({ allowedChatId: "42" });

  const allowed = callIsAllowed(controller, "42", "start");

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

test("gera resposta de inicio ao executar /run-all", async () => {
  const { controller, controlState } = createController({ runAllStatus: "started" });

  const reply = await callBuildRunAllReply(controller);

  assert.equal(reply.reply, "▶️ Runner iniciado via /run-all.");
  assert.equal(reply.started, true);
  assert.equal(controlState.runAllCalls, 1);
});

test("gera resposta de ja em execucao quando /run-all nao inicia nova rodada", async () => {
  const { controller, controlState } = createController({ runAllStatus: "already-running" });

  const reply = await callBuildRunAllReply(controller);

  assert.equal(reply.reply, "ℹ️ Runner já está em execução.");
  assert.equal(reply.started, false);
  assert.equal(controlState.runAllCalls, 1);
});

test("gera resposta acionavel quando /run-all e bloqueado por autenticacao", async () => {
  const { controller, controlState } = createController({
    runAllStatus: "blocked",
    runAllMessage: "Codex CLI nao autenticado. Execute `codex login` e tente novamente.",
  });

  const reply = await callBuildRunAllReply(controller);

  assert.equal(
    reply.reply,
    "❌ Codex CLI nao autenticado. Execute `codex login` e tente novamente.",
  );
  assert.equal(reply.started, false);
  assert.equal(controlState.runAllCalls, 1);
});

test("mensagem de /start descreve o bot e os comandos aceitos", () => {
  const { controller } = createController();

  const reply = callBuildStartReply(controller);

  assert.match(reply, /Codex Flow Runner/u);
  assert.match(reply, /Comandos aceitos:/u);
  assert.match(reply, /\/start/u);
  assert.match(reply, /\/run-all/u);
  assert.match(reply, /\/status/u);
  assert.match(reply, /\/pause/u);
  assert.match(reply, /\/resume/u);
});

test("envia resumo final para chat autorizado configurado", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const sentMessages = mockSendMessage(controller);

  const delivery = await controller.sendTicketFinalSummary(createSuccessSummary());

  assert.equal(logger.warnings.length, 0);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.match(sentMessages[0]?.text ?? "", /Ticket: 2026-02-19-flow-a\.md/u);
  assert.match(sentMessages[0]?.text ?? "", /Projeto ativo: codex-flow-runner/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Caminho do projeto: \/home\/mapita\/projetos\/codex-flow-runner/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Resultado: sucesso/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: close-and-version/u);
  assert.match(sentMessages[0]?.text ?? "", /Timestamp UTC: 2026-02-19T15:00:00.000Z/u);
  assert.match(sentMessages[0]?.text ?? "", /ExecPlan: execplans\/2026-02-19-flow-a\.md/u);
  assert.match(sentMessages[0]?.text ?? "", /Commit\/Push: abc123@origin\/main/u);
  assert.equal(delivery?.channel, "telegram");
  assert.equal(delivery?.destinationChatId, "42");
  assert.match(delivery?.deliveredAtUtc ?? "", /^\d{4}-\d{2}-\d{2}T/u);
});

test("nao envia resumo final quando modo sem restricao nao tem chat de notificacao", async () => {
  const { controller, logger } = createController();
  const sentMessages = mockSendMessage(controller);

  const delivery = await controller.sendTicketFinalSummary(createSuccessSummary());

  assert.equal(sentMessages.length, 0);
  assert.equal(delivery, null);
  assert.equal(logger.warnings.length, 1);
  assert.equal(
    logger.warnings[0]?.message,
    "Resumo final de ticket nao enviado: chat de notificacao indefinido",
  );
  assert.deepEqual(logger.warnings[0]?.context, {
    ticket: "2026-02-19-flow-a.md",
    status: "success",
  });
});

test("envia resumo final de falha para chat que iniciou /run-all no modo sem restricao", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  const delivery = await controller.sendTicketFinalSummary(createFailureSummary());

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "99");
  assert.match(sentMessages[0]?.text ?? "", /Resultado: falha/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: implement/u);
  assert.match(sentMessages[0]?.text ?? "", /Projeto ativo: codex-flow-runner/u);
  assert.match(sentMessages[0]?.text ?? "", /Erro: falha simulada/u);
  assert.equal(delivery?.destinationChatId, "99");
});

test("status inclui ultimo evento notificado em sucesso com rastreabilidade", () => {
  const { controller } = createController();
  const state: RunnerState = {
    ...createState(),
    isRunning: true,
    phase: "idle",
    lastNotifiedEvent: {
      summary: createSuccessSummary(),
      delivery: {
        channel: "telegram",
        destinationChatId: "42",
        deliveredAtUtc: "2026-02-19T15:10:00.000Z",
      },
    },
  };

  const reply = callBuildStatusReply(controller, state);

  assert.match(reply, /Projeto ativo: codex-flow-runner/u);
  assert.match(reply, /Caminho do projeto ativo: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /Último evento notificado: 2026-02-19-flow-a\.md \(success\)/u);
  assert.match(reply, /Projeto notificado: codex-flow-runner/u);
  assert.match(reply, /Caminho notificado: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /ExecPlan notificado: execplans\/2026-02-19-flow-a\.md/u);
  assert.match(reply, /Commit\/Push notificado: abc123@origin\/main/u);
});

test("status informa ausencia de evento notificado", () => {
  const { controller } = createController();

  const reply = callBuildStatusReply(controller, createState());

  assert.match(reply, /Projeto ativo: codex-flow-runner/u);
  assert.match(reply, /Caminho do projeto ativo: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /Último evento notificado: nenhum/u);
});
