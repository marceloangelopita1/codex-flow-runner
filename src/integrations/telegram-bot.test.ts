import assert from "node:assert/strict";
import test from "node:test";
import { ProjectSelectionSnapshot } from "../core/project-selection.js";
import { Logger } from "../core/logger.js";
import { ProjectRef } from "../types/project.js";
import { RunnerState } from "../types/state.js";
import { TicketFinalFailureSummary, TicketFinalSuccessSummary } from "../types/ticket-final-summary.js";
import { PlanSpecFinalActionId, PlanSpecFinalBlock, PlanSpecQuestionBlock } from "./plan-spec-parser.js";
import { EligibleSpecRef, SpecEligibilityResult } from "./spec-discovery.js";
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
  currentSpec: null,
  activeProject: {
    name: "codex-flow-runner",
    path: "/home/mapita/projetos/codex-flow-runner",
  },
  capacity: {
    limit: 5,
    used: 0,
  },
  activeSlots: [],
  planSpecSession: null,
  phase: "idle",
  lastMessage: "estado de teste",
  updatedAt: new Date("2026-02-19T00:00:00.000Z"),
  lastNotifiedEvent: null,
  ...value,
});

const createPlanSpecSession = (
  value: Partial<NonNullable<RunnerState["planSpecSession"]>> = {},
): NonNullable<RunnerState["planSpecSession"]> => ({
  chatId: "42",
  phase: "awaiting-brief",
  startedAt: new Date("2026-02-19T12:00:00.000Z"),
  lastActivityAt: new Date("2026-02-19T12:05:00.000Z"),
  activeProjectSnapshot: cloneProject(defaultActiveProject),
  ...value,
});

type ControlCommand =
  | "start"
  | "run_all"
  | "run-all"
  | "specs"
  | "run_specs"
  | "plan_spec"
  | "plan_spec_status"
  | "plan_spec_cancel"
  | "status"
  | "pause"
  | "resume"
  | "projects"
  | "select_project"
  | "select-project";

type PlanSpecControlOutcome =
  | {
      status: "accepted";
    }
  | {
      status: "ignored";
      message: string;
    };

interface ControllerOptions {
  allowedChatId?: string;
  runAllStatus?: "started" | "already-running" | "blocked";
  runAllMessage?: string;
  runSpecsStatus?: "started" | "already-running" | "blocked";
  runSpecsMessage?: string;
  planSpecStartResult?: {
    status: "started" | "already-active" | "blocked-running" | "blocked" | "failed";
    message: string;
  };
  planSpecInputResult?: {
    status: "accepted" | "ignored-empty" | "inactive" | "ignored-chat";
    message: string;
  };
  planSpecCancelResult?: {
    status: "cancelled" | "inactive" | "ignored-chat";
    message: string;
  };
  runSpecsValidationResult?: SpecEligibilityResult;
  getState?: () => RunnerState;
  projectSnapshot?: ProjectSelectionSnapshot;
  eligibleSpecs?: EligibleSpecRef[];
  listEligibleSpecsErrorMessage?: string;
  listProjectsErrorMessage?: string;
  forceSelectBlocked?: boolean;
  forceSelectBlockedPlanSpec?: boolean;
  disablePlanSpecCallbacks?: boolean;
  planSpecQuestionCallbackOutcome?: PlanSpecControlOutcome;
  planSpecFinalCallbackOutcome?: PlanSpecControlOutcome;
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

const cloneEligibleSpec = (spec: EligibleSpecRef): EligibleSpecRef => ({
  fileName: spec.fileName,
  specPath: spec.specPath,
});

const createDefaultEligibleSpecs = (): EligibleSpecRef[] => [
  {
    fileName: "2026-02-19-approved-spec-triage-run-specs.md",
    specPath: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
  },
];

const createController = (options: ControllerOptions = {}) => {
  const logger = new SpyLogger();
  const controlState = {
    runAllCalls: 0,
    runSpecsCalls: 0,
    runSpecsArgs: [] as string[],
    planSpecStartCalls: 0,
    planSpecStartChatIds: [] as string[],
    planSpecInputCalls: 0,
    planSpecInputCallsByChat: [] as { chatId: string; input: string }[],
    planSpecCancelCalls: 0,
    planSpecCancelChatIds: [] as string[],
    listEligibleSpecsCalls: 0,
    validateRunSpecsTargetCalls: 0,
    validatedSpecsArgs: [] as string[],
    listProjectsCalls: 0,
    selectedProjectNames: [] as string[],
    planSpecQuestionSelections: [] as string[],
    planSpecFinalActions: [] as PlanSpecFinalActionId[],
  };

  const stateGetter = options.getState ?? (() => createState());
  const mutableSnapshot = cloneSnapshot(options.projectSnapshot ?? createDefaultProjectSnapshot());
  const mutableEligibleSpecs = (options.eligibleSpecs ?? createDefaultEligibleSpecs())
    .map(cloneEligibleSpec);

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
    startPlanSpecSession: (chatId: string) => {
      controlState.planSpecStartCalls += 1;
      controlState.planSpecStartChatIds.push(chatId);
      if (options.planSpecStartResult) {
        if (options.planSpecStartResult.status === "blocked") {
          return {
            status: "blocked" as const,
            reason: "codex-auth-missing" as const,
            message: options.planSpecStartResult.message,
          };
        }

        if (options.planSpecStartResult.status === "failed") {
          return {
            status: "failed" as const,
            message: options.planSpecStartResult.message,
          };
        }

        return {
          status: options.planSpecStartResult.status,
          message: options.planSpecStartResult.message,
        } as const;
      }

      return {
        status: "started" as const,
        message: "Sessao /plan_spec iniciada. Envie a proxima mensagem com o brief inicial.",
      };
    },
    submitPlanSpecInput: (chatId: string, input: string) => {
      controlState.planSpecInputCalls += 1;
      controlState.planSpecInputCallsByChat.push({ chatId, input });
      if (options.planSpecInputResult) {
        return options.planSpecInputResult;
      }

      return {
        status: "accepted" as const,
        message: "Mensagem encaminhada para a sessao /plan_spec.",
      };
    },
    cancelPlanSpecSession: (chatId: string) => {
      controlState.planSpecCancelCalls += 1;
      controlState.planSpecCancelChatIds.push(chatId);
      if (options.planSpecCancelResult) {
        return options.planSpecCancelResult;
      }

      return {
        status: "cancelled" as const,
        message: "Sessao /plan_spec cancelada.",
      };
    },
    runSpecs: (specFileName: string) => {
      controlState.runSpecsCalls += 1;
      controlState.runSpecsArgs.push(specFileName);
      if (options.runSpecsStatus === "already-running") {
        return { status: "already-running" as const };
      }

      if (options.runSpecsStatus === "blocked") {
        return {
          status: "blocked" as const,
          reason: "codex-auth-missing" as const,
          message:
            options.runSpecsMessage ??
            "Codex CLI nao autenticado. Execute `codex login` no mesmo usuario que roda o runner.",
        };
      }

      return { status: "started" as const };
    },
    listEligibleSpecs: () => {
      controlState.listEligibleSpecsCalls += 1;
      if (options.listEligibleSpecsErrorMessage) {
        throw new Error(options.listEligibleSpecsErrorMessage);
      }

      return mutableEligibleSpecs.map(cloneEligibleSpec);
    },
    validateRunSpecsTarget: (specInput: string) => {
      controlState.validateRunSpecsTargetCalls += 1;
      controlState.validatedSpecsArgs.push(specInput);

      if (options.runSpecsValidationResult) {
        return options.runSpecsValidationResult;
      }

      const normalized = specInput.startsWith("docs/specs/")
        ? specInput.slice("docs/specs/".length)
        : specInput;

      if (
        !normalized.endsWith(".md") ||
        normalized.includes("/") ||
        normalized.includes("\\") ||
        normalized.includes("..")
      ) {
        return {
          status: "invalid-path" as const,
          input: specInput,
          message:
            "Formato invalido para spec. Use apenas <arquivo-da-spec.md> ou docs/specs/<arquivo-da-spec.md>.",
        };
      }

      return {
        status: "eligible" as const,
        spec: {
          fileName: normalized,
          specPath: `docs/specs/${normalized}`,
        },
        metadata: {
          status: "approved",
          specTreatment: "pending",
        },
      };
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
      if (options.forceSelectBlockedPlanSpec) {
        return { status: "blocked-plan-spec" as const };
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
    onPlanSpecQuestionOptionSelected: options.disablePlanSpecCallbacks
      ? undefined
      : (chatId: string, optionValue: string) => {
        controlState.planSpecInputCallsByChat.push({
          chatId,
          input: `callback:${optionValue}`,
        });
        controlState.planSpecQuestionSelections.push(optionValue);
        return options.planSpecQuestionCallbackOutcome ?? { status: "accepted" as const };
      },
    onPlanSpecFinalActionSelected: options.disablePlanSpecCallbacks
      ? undefined
      : (chatId: string, action: PlanSpecFinalActionId) => {
        controlState.planSpecInputCallsByChat.push({
          chatId,
          input: `final:${action}`,
        });
        controlState.planSpecFinalActions.push(action);
        return options.planSpecFinalCallbackOutcome ?? { status: "accepted" as const };
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
    buildRunAllReply: (context?: {
      chatId: string;
      command: "run_all" | "run-all";
    }) => Promise<{ reply: string; started: boolean }>;
  };

  return internalController.buildRunAllReply();
};

const callBuildRunSpecsReply = async (
  controller: TelegramController,
  specFileName: string,
): Promise<{ reply: string; started: boolean }> => {
  const internalController = controller as unknown as {
    buildRunSpecsReply: (context: {
      chatId: string;
      specFileName: string;
    }) => Promise<{ reply: string; started: boolean }>;
  };

  return internalController.buildRunSpecsReply({
    chatId: "42",
    specFileName,
  });
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
  command: "select_project" | "select-project" = "select-project",
): Promise<void> => {
  const internalController = controller as unknown as {
    handleSelectProjectCommand: (
      value: {
        chat: { id: number };
        message?: { text?: string };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
      sourceCommand: "select_project" | "select-project",
    ) => Promise<void>;
  };

  await internalController.handleSelectProjectCommand(context, command);
};

const callHandleRunSpecsCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleRunSpecsCommand: (value: {
      chat: { id: number };
      message?: { text?: string };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleRunSpecsCommand(context);
};

const callHandlePlanSpecCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePlanSpecCommand: (value: {
      chat: { id: number };
      message?: { text?: string };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handlePlanSpecCommand(context);
};

const callHandlePlanSpecStatusCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePlanSpecStatusCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handlePlanSpecStatusCommand(context);
};

const callHandlePlanSpecCancelCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePlanSpecCancelCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handlePlanSpecCancelCommand(context);
};

const callHandlePlanSpecTextMessage = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: {
      text?: string;
      entities?: Array<{ type: string; offset: number; length: number }>;
    };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePlanSpecTextMessage: (value: {
      chat: { id: number };
      message?: {
        text?: string;
        entities?: Array<{ type: string; offset: number; length: number }>;
      };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handlePlanSpecTextMessage(context);
};

const callHandleSpecsCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleSpecsCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleSpecsCommand(context);
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

const callHandlePlanSpecCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePlanSpecCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handlePlanSpecCallbackQuery(context);
};

const callBuildPlanSpecQuestionReply = (
  controller: TelegramController,
  question: PlanSpecQuestionBlock,
): { text: string; extra: unknown } => {
  const internalController = controller as unknown as {
    buildPlanSpecQuestionReply: (value: PlanSpecQuestionBlock) => { text: string; extra: unknown };
  };

  return internalController.buildPlanSpecQuestionReply(question);
};

const callBuildPlanSpecFinalReply = (
  controller: TelegramController,
  finalBlock: PlanSpecFinalBlock,
): { text: string; extra: unknown } => {
  const internalController = controller as unknown as {
    buildPlanSpecFinalReply: (value: PlanSpecFinalBlock) => { text: string; extra: unknown };
  };

  return internalController.buildPlanSpecFinalReply(finalBlock);
};

const callBuildPlanSpecRawOutputReply = (
  controller: TelegramController,
  rawOutput: string,
): string => {
  const internalController = controller as unknown as {
    buildPlanSpecRawOutputReply: (value: string) => string;
  };

  return internalController.buildPlanSpecRawOutputReply(rawOutput);
};

const callBuildPlanSpecInteractiveFailureReply = (
  controller: TelegramController,
  details?: string,
): string => {
  const internalController = controller as unknown as {
    buildPlanSpecInteractiveFailureReply: (value?: string) => string;
  };

  return internalController.buildPlanSpecInteractiveFailureReply(details);
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

  assert.equal(reply.reply, "▶️ Runner iniciado via /run_all.");
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

test("gera resposta de inicio ao executar /run_specs", async () => {
  const { controller, controlState } = createController({ runSpecsStatus: "started" });

  const reply = await callBuildRunSpecsReply(
    controller,
    "2026-02-19-approved-spec-triage-run-specs.md",
  );

  assert.equal(
    reply.reply,
    "▶️ Runner iniciado via /run_specs para 2026-02-19-approved-spec-triage-run-specs.md.",
  );
  assert.equal(reply.started, true);
  assert.equal(controlState.runSpecsCalls, 1);
  assert.deepEqual(controlState.runSpecsArgs, ["2026-02-19-approved-spec-triage-run-specs.md"]);
});

test("gera resposta de ja em execucao quando /run_specs nao inicia novo fluxo", async () => {
  const { controller, controlState } = createController({ runSpecsStatus: "already-running" });

  const reply = await callBuildRunSpecsReply(
    controller,
    "2026-02-19-approved-spec-triage-run-specs.md",
  );

  assert.equal(reply.reply, "ℹ️ Runner já está em execução.");
  assert.equal(reply.started, false);
  assert.equal(controlState.runSpecsCalls, 1);
});

test("gera resposta acionavel quando /run_specs e bloqueado", async () => {
  const { controller, controlState } = createController({
    runSpecsStatus: "blocked",
    runSpecsMessage: "Codex CLI nao autenticado. Execute `codex login` e tente novamente.",
  });

  const reply = await callBuildRunSpecsReply(
    controller,
    "2026-02-19-approved-spec-triage-run-specs.md",
  );

  assert.equal(
    reply.reply,
    "❌ Codex CLI nao autenticado. Execute `codex login` e tente novamente.",
  );
  assert.equal(reply.started, false);
  assert.equal(controlState.runSpecsCalls, 1);
});

test("mensagem de /start descreve o bot e os comandos aceitos", () => {
  const { controller } = createController();

  const reply = callBuildStartReply(controller);

  assert.match(reply, /Codex Flow Runner/u);
  assert.match(reply, /Comandos aceitos:/u);
  assert.match(reply, /\/start/u);
  assert.match(reply, /\/run_all/u);
  assert.match(reply, /\/run-all/u);
  assert.match(reply, /\/specs/u);
  assert.match(reply, /\/run_specs/u);
  assert.match(reply, /\/plan_spec/u);
  assert.match(reply, /\/plan_spec_status/u);
  assert.match(reply, /\/plan_spec_cancel/u);
  assert.match(reply, /\/status/u);
  assert.match(reply, /\/pause/u);
  assert.match(reply, /\/resume/u);
  assert.match(reply, /\/projects/u);
  assert.match(reply, /\/select_project/u);
  assert.match(reply, /\/select-project/u);
});

test("/run_specs sem argumento retorna mensagem de uso e nao inicia execucao", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(controlState.validateRunSpecsTargetCalls, 0);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Uso: /run_specs <arquivo-da-spec.md>.");
});

test("/run_specs com argumento inicia fluxo de triagem", async () => {
  const { controller, controlState } = createController({ runSpecsStatus: "started" });
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs 2026-02-19-approved-spec-triage-run-specs.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.deepEqual(controlState.validatedSpecsArgs, [
    "2026-02-19-approved-spec-triage-run-specs.md",
  ]);
  assert.equal(controlState.runSpecsCalls, 1);
  assert.deepEqual(controlState.runSpecsArgs, ["2026-02-19-approved-spec-triage-run-specs.md"]);
  assert.equal(replies.length, 1);
  assert.equal(
    replies[0],
    "▶️ Runner iniciado via /run_specs para 2026-02-19-approved-spec-triage-run-specs.md.",
  );
});

test("/run_specs retorna already-running quando runner ja esta ocupado", async () => {
  const { controller, controlState } = createController({ runSpecsStatus: "already-running" });
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs 2026-02-19-approved-spec-triage-run-specs.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Runner já está em execução.");
});

test("/plan_spec inicia sessao e solicita brief inicial (CA-01)", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandlePlanSpecCommand(controller, {
    chat: { id: 42 },
    message: { text: "/plan_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecStartCalls, 1);
  assert.deepEqual(controlState.planSpecStartChatIds, ["42"]);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Sessao \/plan_spec iniciada/u);
  assert.match(replies[0] ?? "", /brief inicial/u);
});

test("/plan_spec responde sessao ja ativa quando runner reporta already-active", async () => {
  const { controller, controlState } = createController({
    planSpecStartResult: {
      status: "already-active",
      message: "Ja existe uma sessao /plan_spec em andamento nesta instancia.",
    },
  });
  const replies: string[] = [];

  await callHandlePlanSpecCommand(controller, {
    chat: { id: 42 },
    message: { text: "/plan_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecStartCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Ja existe uma sessao /plan_spec em andamento nesta instancia.");
});

test("/plan_spec retorna bloqueio explicito quando runner esta ocupado", async () => {
  const { controller, controlState } = createController({
    planSpecStartResult: {
      status: "blocked-running",
      message: "Nao e possivel iniciar /plan_spec enquanto o runner esta em execucao.",
    },
  });
  const replies: string[] = [];

  await callHandlePlanSpecCommand(controller, {
    chat: { id: 42 },
    message: { text: "/plan_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecStartCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(
    replies[0],
    "❌ Nao e possivel iniciar /plan_spec enquanto o runner esta em execucao.",
  );
});

test("/plan_spec retorna erro acionavel quando sessao interativa falha no start", async () => {
  const { controller, controlState } = createController({
    planSpecStartResult: {
      status: "failed",
      message: "Falha ao iniciar sessao /plan_spec: timeout no codex.",
    },
  });
  const replies: string[] = [];

  await callHandlePlanSpecCommand(controller, {
    chat: { id: 42 },
    message: { text: "/plan_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecStartCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Falha na sessão interativa de planejamento/u);
  assert.match(replies[0] ?? "", /Falha ao iniciar sessao \/plan_spec: timeout no codex/u);
  assert.match(replies[0] ?? "", /Use \/plan_spec para tentar novamente/u);
});

test("primeira mensagem livre apos /plan_spec e roteada como brief inicial (CA-02)", async () => {
  const state = createState({
    phase: "plan-spec-awaiting-brief",
    planSpecSession: createPlanSpecSession({
      phase: "awaiting-brief",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
  });
  const replies: string[] = [];

  await callHandlePlanSpecTextMessage(controller, {
    chat: { id: 42 },
    message: {
      text: "Precisamos planejar a sessão /plan_spec com timeout e guardrails.",
      entities: [],
    },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecInputCalls, 1);
  assert.deepEqual(controlState.planSpecInputCallsByChat, [
    {
      chatId: "42",
      input: "Precisamos planejar a sessão /plan_spec com timeout e guardrails.",
    },
  ]);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Brief inicial recebido/u);
});

test("mensagem livre de /plan_spec ignora input vazio sem responder no chat", async () => {
  const state = createState({
    phase: "plan-spec-waiting-user",
    planSpecSession: createPlanSpecSession({
      phase: "waiting-user",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
    planSpecInputResult: {
      status: "ignored-empty",
      message: "Mensagem vazia ignorada na sessao /plan_spec.",
    },
  });
  const replies: string[] = [];

  await callHandlePlanSpecTextMessage(controller, {
    chat: { id: 42 },
    message: {
      text: "   ",
      entities: [],
    },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecInputCalls, 0);
  assert.equal(replies.length, 0);
});

test("/plan_spec_status exibe fase, projeto e ultima atividade da sessao (CA-05)", async () => {
  const state = createState({
    phase: "plan-spec-waiting-user",
    planSpecSession: createPlanSpecSession({
      phase: "waiting-user",
      startedAt: new Date("2026-02-19T12:00:00.000Z"),
      lastActivityAt: new Date("2026-02-19T12:15:00.000Z"),
    }),
  });
  const { controller } = createController({
    getState: () => state,
  });
  const replies: string[] = [];

  await callHandlePlanSpecStatusCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Sessão \/plan_spec ativa/u);
  assert.match(replies[0] ?? "", /Fase: waiting-user/u);
  assert.match(replies[0] ?? "", /Projeto da sessão: codex-flow-runner/u);
  assert.match(replies[0] ?? "", /Última atividade: 2026-02-19T12:15:00.000Z/u);
});

test("/plan_spec_cancel encerra sessao ativa (CA-06)", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandlePlanSpecCancelCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecCancelCalls, 1);
  assert.deepEqual(controlState.planSpecCancelChatIds, ["42"]);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Sessao \/plan_spec cancelada/u);
});

test("/plan_spec_cancel informa ausencia de sessao ativa", async () => {
  const { controller, controlState } = createController({
    planSpecCancelResult: {
      status: "inactive",
      message: "Nenhuma sessão /plan_spec ativa no momento.",
    },
  });
  const replies: string[] = [];

  await callHandlePlanSpecCancelCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecCancelCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Nenhuma sessão /plan_spec ativa no momento.");
});

test("/plan_spec_cancel preserva mensagem quando cancelamento ocorre em outro chat", async () => {
  const { controller, controlState } = createController({
    planSpecCancelResult: {
      status: "ignored-chat",
      message: "Sessão /plan_spec em andamento em outro chat. Use o chat que iniciou a sessão.",
    },
  });
  const replies: string[] = [];

  await callHandlePlanSpecCancelCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecCancelCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(
    replies[0],
    "ℹ️ Sessão /plan_spec em andamento em outro chat. Use o chat que iniciou a sessão.",
  );
});

test("durante sessao /plan_spec ativa, troca de projeto por comando e callback fica bloqueada (CA-04)", async () => {
  const state = createState({
    planSpecSession: createPlanSpecSession({
      phase: "waiting-user",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
  });
  const commandReplies: string[] = [];
  const callbackReplies: string[] = [];

  await callHandleSelectProjectCommand(controller, {
    chat: { id: 42 },
    message: { text: "/select-project beta-project" },
    reply: async (text) => {
      commandReplies.push(text);
      return Promise.resolve();
    },
  });

  await callHandleProjectsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "projects:page:1" },
    answerCbQuery: async (text) => {
      callbackReplies.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.selectedProjectNames.length, 0);
  assert.equal(commandReplies.length, 1);
  assert.match(commandReplies[0] ?? "", /sessão \/plan_spec ativa/u);
  assert.equal(callbackReplies.length, 1);
  assert.match(callbackReplies[0] ?? "", /sessão \/plan_spec ativa/u);
});

test("com TELEGRAM_ALLOWED_CHAT_ID, chat nao autorizado nao usa /plan_spec* (CA-18)", async () => {
  const { controller, controlState } = createController({ allowedChatId: "42" });
  const replies: string[] = [];

  await callHandlePlanSpecCommand(controller, {
    chat: { id: 99 },
    message: { text: "/plan_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });
  await callHandlePlanSpecStatusCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });
  await callHandlePlanSpecCancelCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecStartCalls, 0);
  assert.equal(controlState.planSpecCancelCalls, 0);
  assert.deepEqual(replies, [
    "Acesso não autorizado.",
    "Acesso não autorizado.",
    "Acesso não autorizado.",
  ]);
});

test("/specs lista somente specs elegiveis (CA-01)", async () => {
  const { controller, controlState } = createController({
    eligibleSpecs: [
      {
        fileName: "2026-02-19-approved-spec-triage-run-specs.md",
        specPath: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
      },
      {
        fileName: "2026-02-20-outra-spec-pending.md",
        specPath: "docs/specs/2026-02-20-outra-spec-pending.md",
      },
    ],
  });
  const replies: string[] = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listEligibleSpecsCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Specs elegíveis para \/run_specs/u);
  assert.match(replies[0] ?? "", /2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(replies[0] ?? "", /2026-02-20-outra-spec-pending\.md/u);
});

test("/specs responde mensagem clara quando nao ha specs elegiveis", async () => {
  const { controller } = createController({
    eligibleSpecs: [],
  });
  const replies: string[] = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Nenhuma spec elegível/u);
});

test("/run_specs bloqueia spec inexistente sem iniciar runner (CA-03)", async () => {
  const { controller, controlState } = createController({
    runSpecsValidationResult: {
      status: "not-found",
      spec: {
        fileName: "spec-inexistente.md",
        specPath: "docs/specs/spec-inexistente.md",
      },
    },
  });
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs spec-inexistente.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Spec não encontrada/u);
  assert.match(replies[0] ?? "", /docs\/specs/u);
});

test("/run_specs bloqueia spec nao elegivel sem iniciar runner (CA-03)", async () => {
  const { controller, controlState } = createController({
    runSpecsValidationResult: {
      status: "not-eligible",
      spec: {
        fileName: "2026-02-19-telegram-access-and-control-plane.md",
        specPath: "docs/specs/2026-02-19-telegram-access-and-control-plane.md",
      },
      metadata: {
        status: "approved",
        specTreatment: null,
      },
    },
  });
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs 2026-02-19-telegram-access-and-control-plane.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Spec não elegível/u);
  assert.match(replies[0] ?? "", /Spec treatment: \(ausente\)/u);
});

test("/run_specs bloqueia argumento invalido sem iniciar runner", async () => {
  const { controller, controlState } = createController({
    runSpecsValidationResult: {
      status: "invalid-path",
      input: "../../etc/passwd",
      message:
        "Formato invalido para spec. Use apenas <arquivo-da-spec.md> ou docs/specs/<arquivo-da-spec.md>.",
    },
  });
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs ../../etc/passwd" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Argumento inválido/u);
});

test("com TELEGRAM_ALLOWED_CHAT_ID, chat nao autorizado nao executa /specs (CA-11)", async () => {
  const { controller, controlState, logger } = createController({ allowedChatId: "42" });
  const replies: string[] = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listEligibleSpecsCalls, 0);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "Acesso não autorizado.");
  assert.equal(logger.warnings.length, 1);
});

test("com TELEGRAM_ALLOWED_CHAT_ID, chat nao autorizado nao executa /run_specs (CA-11)", async () => {
  const { controller, controlState, logger } = createController({ allowedChatId: "42" });
  const replies: string[] = [];

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 99 },
    message: { text: "/run_specs 2026-02-19-approved-spec-triage-run-specs.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 0);
  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "Acesso não autorizado.");
  assert.equal(logger.warnings.length, 1);
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

test("pergunta parseada gera teclado inline com opcoes clicaveis (CA-07)", () => {
  const { controller } = createController();
  const question: PlanSpecQuestionBlock = {
    prompt: "Qual escopo devemos priorizar?",
    options: [
      { value: "api", label: "API pública" },
      { value: "bot", label: "Bot Telegram" },
    ],
  };

  const rendered = callBuildPlanSpecQuestionReply(controller, question);

  assert.match(rendered.text, /Pergunta do planejamento/u);
  assert.match(rendered.text, /responder por botão ou texto livre/u);
  const extra = rendered.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ callback_data: string; text: string }>>;
    };
  };
  assert.deepEqual(extra.reply_markup?.inline_keyboard?.[0]?.[0], {
    text: "API pública",
    callback_data: "plan-spec:question:api",
  });
});

test("bloco final parseado gera botoes Criar spec, Refinar e Cancelar (CA-09)", () => {
  const { controller } = createController();
  const finalBlock: PlanSpecFinalBlock = {
    title: "Bridge interativa do Codex",
    summary: "Sessao /plan com parser e callbacks no Telegram.",
    actions: [
      { id: "create-spec", label: "Criar spec" },
      { id: "refine", label: "Refinar" },
      { id: "cancel", label: "Cancelar" },
    ],
  };

  const rendered = callBuildPlanSpecFinalReply(controller, finalBlock);

  assert.match(rendered.text, /Planejamento concluído/u);
  assert.match(rendered.text, /Título: Bridge interativa do Codex/u);
  const extra = rendered.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ callback_data: string; text: string }>>;
    };
  };
  assert.deepEqual(
    extra.reply_markup?.inline_keyboard?.map((row) => row[0]?.callback_data),
    [
      "plan-spec:final:create-spec",
      "plan-spec:final:refine",
      "plan-spec:final:cancel",
    ],
  );
});

test("callback de pergunta registra opcao e permite texto livre em paralelo (CA-08)", async () => {
  const { controller, controlState } = createController();
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "plan-spec:question:api" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.planSpecQuestionSelections, ["api"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Resposta registrada.");
});

test("callback final de Refinar retorna ao ciclo sem criar arquivo (CA-10)", async () => {
  const { controller, controlState } = createController({
    planSpecFinalCallbackOutcome: {
      status: "ignored",
      message: "Refino solicitado, continue a conversa.",
    },
  });
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "plan-spec:final:refine" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.planSpecFinalActions, ["refine"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Refino solicitado, continue a conversa.");
});

test("callback final de Criar spec confirma selecao quando runner aceita acao", async () => {
  const { controller, controlState } = createController({
    planSpecFinalCallbackOutcome: {
      status: "accepted",
    },
  });
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "plan-spec:final:create-spec" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.planSpecFinalActions, ["create-spec"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Resposta registrada.");
});

test("callback final de Criar spec devolve erro acionavel quando runner rejeita acao", async () => {
  const { controller, controlState } = createController({
    planSpecFinalCallbackOutcome: {
      status: "ignored",
      message: "Falha ao criar spec planejada: conflito de slug.",
    },
  });
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "plan-spec:final:create-spec" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.planSpecFinalActions, ["create-spec"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Falha ao criar spec planejada: conflito de slug.");
});

test("callback de planejamento invalido recebe mensagem de erro", async () => {
  const { controller, controlState } = createController();
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "plan-spec:final:desconhecida" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.planSpecFinalActions, []);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Ação de planejamento inválida.");
});

test("callback de planejamento sem sessao ativa retorna mensagem acionavel", async () => {
  const { controller, controlState } = createController({
    disablePlanSpecCallbacks: true,
  });
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: "plan-spec:question:api" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.deepEqual(controlState.planSpecQuestionSelections, []);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Sessão de planejamento inativa.");
});

test("callback de planejamento nao autorizado e bloqueado", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const answers: string[] = [];

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 99 },
    callbackQuery: { data: "plan-spec:question:api" },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Acesso não autorizado.");
  assert.equal(logger.warnings.length, 1);
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
  assert.match(replies[0] ?? "", /Uso: \/select_project/u);
});

test("/select_project com underscore seleciona projeto corretamente", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleSelectProjectCommand(
    controller,
    {
      chat: { id: 42 },
      message: { text: "/select_project beta-project" },
      reply: async (text) => {
        replies.push(text);
        return Promise.resolve();
      },
    },
    "select_project",
  );

  assert.equal(controlState.selectedProjectNames.length, 1);
  assert.equal(controlState.selectedProjectNames[0], "beta-project");
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Projeto ativo alterado para beta-project/u);
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

test("resposta raw de planejamento e saneada antes de enviar (CA-20)", () => {
  const { controller } = createController();

  const reply = callBuildPlanSpecRawOutputReply(controller, "\u001b[31mFalha\u001b[0m\r\nDetalhe");

  assert.match(reply, /Saída não parseável do Codex/u);
  assert.match(reply, /Falha\nDetalhe/u);
});

test("mensagem de falha interativa orienta retry (CA-19)", () => {
  const { controller } = createController();

  const reply = callBuildPlanSpecInteractiveFailureReply(
    controller,
    "timeout ao aguardar resposta do Codex",
  );

  assert.match(reply, /Falha na sessão interativa de planejamento/u);
  assert.match(reply, /timeout ao aguardar resposta do Codex/u);
  assert.match(reply, /Use \/plan_spec para tentar novamente/u);
});

test("envia mensagens de pergunta/final/raw/falha do planejamento no Telegram", async () => {
  const { controller } = createController({ allowedChatId: "42" });
  const sentMessages = mockSendMessage(controller);

  await controller.sendPlanSpecQuestion("42", {
    prompt: "Qual escopo?",
    options: [{ value: "api", label: "API" }],
  });
  await controller.sendPlanSpecFinalization("42", {
    title: "Bridge de planejamento",
    summary: "Resumo final da conversa.",
    actions: [
      { id: "create-spec", label: "Criar spec" },
      { id: "refine", label: "Refinar" },
      { id: "cancel", label: "Cancelar" },
    ],
  });
  await controller.sendPlanSpecRawOutput("42", "\u001b[31mConteudo bruto\u001b[0m");
  await controller.sendPlanSpecFailure("42", "sessao caiu");

  assert.equal(sentMessages.length, 4);
  assert.match(sentMessages[0]?.text ?? "", /Pergunta do planejamento/u);
  assert.match(sentMessages[1]?.text ?? "", /Planejamento concluído/u);
  assert.match(sentMessages[2]?.text ?? "", /Saída não parseável do Codex/u);
  assert.match(sentMessages[3]?.text ?? "", /Falha na sessão interativa de planejamento/u);
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
  assert.match(reply, /Spec atual: nenhuma/u);
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
  assert.match(reply, /Spec atual: nenhuma/u);
  assert.match(reply, /Último evento notificado: nenhum/u);
});

test("status exibe spec atual durante triagem", () => {
  const { controller } = createController();

  const reply = callBuildStatusReply(
    controller,
    createState({
      isRunning: true,
      phase: "spec-triage",
      currentSpec: "2026-02-19-approved-spec-triage-run-specs.md",
      currentTicket: null,
    }),
  );

  assert.match(reply, /Fase: spec-triage/u);
  assert.match(reply, /Spec atual: 2026-02-19-approved-spec-triage-run-specs\.md/u);
});
