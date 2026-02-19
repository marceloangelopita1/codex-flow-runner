import assert from "node:assert/strict";
import test from "node:test";
import { ProjectSelectionSnapshot } from "../core/project-selection.js";
import { Logger } from "../core/logger.js";
import { ProjectRef } from "../types/project.js";
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

const defaultActiveProject: ProjectRef = {
  name: "codex-flow-runner",
  path: "/home/mapita/projetos/codex-flow-runner",
};

const createState = (value: Partial<RunnerState> = {}): RunnerState => ({
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
  ...value,
});

type ControlCommand =
  | "start"
  | "run-all"
  | "status"
  | "pause"
  | "resume"
  | "projects"
  | "select-project";

interface ControllerOptions {
  allowedChatId?: string;
  runAllStatus?: "started" | "already-running" | "blocked";
  runAllMessage?: string;
  getState?: () => RunnerState;
  projectSnapshot?: ProjectSelectionSnapshot;
  listProjectsErrorMessage?: string;
  forceSelectBlocked?: boolean;
}

const createDefaultProjectSnapshot = (): ProjectSelectionSnapshot => ({
  projects: [
    {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    {
      name: "beta-project",
      path: "/home/mapita/projetos/beta-project",
    },
    {
      name: "codex-flow-runner",
      path: "/home/mapita/projetos/codex-flow-runner",
    },
  ],
  activeProject: {
    name: "codex-flow-runner",
    path: "/home/mapita/projetos/codex-flow-runner",
  },
});

const cloneProject = (project: ProjectRef): ProjectRef => ({
  name: project.name,
  path: project.path,
});

const cloneSnapshot = (snapshot: ProjectSelectionSnapshot): ProjectSelectionSnapshot => ({
  projects: snapshot.projects.map(cloneProject),
  activeProject: cloneProject(snapshot.activeProject),
});

const createController = (options: ControllerOptions = {}) => {
  const logger = new SpyLogger();
  const controlState = {
    runAllCalls: 0,
    listProjectsCalls: 0,
    selectedProjectNames: [] as string[],
  };

  const stateGetter = options.getState ?? (() => createState());
  const mutableSnapshot = cloneSnapshot(options.projectSnapshot ?? createDefaultProjectSnapshot());

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
    listProjects: () => {
      controlState.listProjectsCalls += 1;
      if (options.listProjectsErrorMessage) {
        throw new Error(options.listProjectsErrorMessage);
      }

      return cloneSnapshot(mutableSnapshot);
    },
    selectProjectByName: (projectName: string) => {
      controlState.selectedProjectNames.push(projectName);

      if (options.forceSelectBlocked) {
        return { status: "blocked-running" as const };
      }

      const selected = mutableSnapshot.projects.find((project) => project.name === projectName);
      if (!selected) {
        return {
          status: "not-found" as const,
          projectName,
          availableProjects: mutableSnapshot.projects.map(cloneProject),
          activeProject: cloneProject(mutableSnapshot.activeProject),
        };
      }

      const changed =
        selected.name !== mutableSnapshot.activeProject.name ||
        selected.path !== mutableSnapshot.activeProject.path;
      mutableSnapshot.activeProject = cloneProject(selected);

      return {
        status: "selected" as const,
        activeProject: cloneProject(selected),
        changed,
      };
    },
  };

  const controller = new TelegramController(
    "123456:TEST_TOKEN",
    logger,
    stateGetter,
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

const callIsAllowedCallback = (
  controller: TelegramController,
  chatId: string,
  callbackData: string,
): boolean => {
  const internalController = controller as unknown as {
    isAllowed: (context: {
      chatId: string;
      eventType: "callback-query";
      callbackData: string;
    }) => boolean;
  };

  return internalController.isAllowed({
    chatId,
    eventType: "callback-query",
    callbackData,
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

const callHandleProjectsCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleProjectsCommand: (value: {
      chat: { id: number };
      message?: { text?: string };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleProjectsCommand(context);
};

const callHandleSelectProjectCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleSelectProjectCommand: (value: {
      chat: { id: number };
      message?: { text?: string };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleSelectProjectCommand(context);
};

const callHandleProjectsCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleProjectsCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleProjectsCallbackQuery(context);
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

test("bloqueia callback quando chat nao autorizado e registra contexto", () => {
  const { controller, logger } = createController({ allowedChatId: "42" });

  const allowed = callIsAllowedCallback(controller, "99", "projects:page:0");

  assert.equal(allowed, false);
  assert.equal(logger.warnings.length, 1);
  assert.deepEqual(logger.warnings[0]?.context, {
    chatId: "99",
    eventType: "callback-query",
    callbackData: "projects:page:0",
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
  assert.match(reply, /\/projects/u);
  assert.match(reply, /\/select-project/u);
});

test("/projects responde lista paginada com marcador de projeto ativo", async () => {
  const { controller, controlState } = createController();
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleProjectsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listProjectsCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Projetos elegíveis/u);
  assert.match(replies[0]?.text ?? "", /Projeto ativo: codex-flow-runner/u);
  assert.match(replies[0]?.text ?? "", /✅ codex-flow-runner/u);
});

test("/projects lida com erro de listagem de projetos", async () => {
  const { controller } = createController({ listProjectsErrorMessage: "falha de io" });
  const replies: string[] = [];

  await callHandleProjectsCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Falha ao listar projetos elegíveis/u);
});

test("callback de paginacao atualiza mensagem para pagina solicitada", async () => {
  const pagedSnapshot: ProjectSelectionSnapshot = {
    projects: [
      { name: "alpha", path: "/home/mapita/projetos/alpha" },
      { name: "beta", path: "/home/mapita/projetos/beta" },
      { name: "gamma", path: "/home/mapita/projetos/gamma" },
      { name: "delta", path: "/home/mapita/projetos/delta" },
      { name: "epsilon", path: "/home/mapita/projetos/epsilon" },
      { name: "zeta", path: "/home/mapita/projetos/zeta" },
    ],
    activeProject: {
      name: "alpha",
      path: "/home/mapita/projetos/alpha",
    },
  };
  const { controller } = createController({ projectSnapshot: pagedSnapshot });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleProjectsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "projects:page:1" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Página 2\/2/u);
  assert.match(edits[0]?.text ?? "", /zeta/u);
  assert.equal(answers.length, 1);
});

test("callback de selecao troca projeto ativo e responde confirmacao", async () => {
  const { controller, controlState } = createController();
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleProjectsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "projects:select:1" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.deepEqual(controlState.selectedProjectNames, ["beta-project"]);
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Projeto ativo: beta-project/u);
  assert.equal(answers.length, 1);
  assert.match(answers[0] ?? "", /Projeto ativo alterado para beta-project/u);
});

test("callback de selecao bloqueia troca quando runner esta executando", async () => {
  const runningState = createState({ isRunning: true });
  const { controller, controlState } = createController({
    getState: () => runningState,
  });
  const answers: string[] = [];

  await callHandleProjectsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "projects:select:1" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.selectedProjectNames, []);
  assert.equal(answers.length, 1);
  assert.match(answers[0] ?? "", /Não é possível trocar o projeto ativo/u);
});

test("/select-project valida uso quando argumento nao e informado", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleSelectProjectCommand(controller, {
    chat: { id: 42 },
    message: { text: "/select-project" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.selectedProjectNames.length, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Uso: \/select-project/u);
});

test("/select-project bloqueia troca quando runner esta em execucao", async () => {
  const { controller, controlState } = createController({
    getState: () => createState({ isRunning: true }),
  });
  const replies: string[] = [];

  await callHandleSelectProjectCommand(controller, {
    chat: { id: 42 },
    message: { text: "/select-project beta-project" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.selectedProjectNames.length, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Não é possível trocar o projeto ativo/u);
});

test("/select-project confirma troca quando projeto existe", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleSelectProjectCommand(controller, {
    chat: { id: 42 },
    message: { text: "/select-project beta-project" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.deepEqual(controlState.selectedProjectNames, ["beta-project"]);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Projeto ativo alterado para beta-project/u);
});

test("/select-project responde erro quando projeto nao existe", async () => {
  const { controller } = createController();
  const replies: string[] = [];

  await callHandleSelectProjectCommand(controller, {
    chat: { id: 42 },
    message: { text: "/select-project projeto-invalido" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Projeto projeto-invalido não encontrado/u);
  assert.match(replies[0] ?? "", /Projetos disponíveis:/u);
});

test("callback nao autorizado recebe resposta e gera log de auditoria", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const answers: string[] = [];

  await callHandleProjectsCallbackQuery(controller, {
    chat: { id: 99 },
    callbackQuery: { data: "projects:page:0" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Acesso não autorizado.");
  assert.equal(logger.warnings.length, 1);
  assert.deepEqual(logger.warnings[0]?.context, {
    chatId: "99",
    eventType: "callback-query",
    callbackData: "projects:page:0",
  });
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

  const reply = callBuildStatusReply(controller, createState({ activeProject: defaultActiveProject }));

  assert.match(reply, /Projeto ativo: codex-flow-runner/u);
  assert.match(reply, /Caminho do projeto ativo: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /Último evento notificado: nenhum/u);
});
