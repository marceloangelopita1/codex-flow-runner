import assert from "node:assert/strict";
import test from "node:test";
import { ProjectSelectionSnapshot } from "../core/project-selection.js";
import {
  CodexChatSessionCancelOptions,
  CodexChatSessionCancelResult,
  CodexChatSessionInputResult,
  CodexChatSessionStartResult,
  PlanSpecCallbackIgnoredReason,
  RunSelectedTicketRequestResult,
  RunnerProjectControlResult,
} from "../core/runner.js";
import { Logger } from "../core/logger.js";
import { ProjectRef } from "../types/project.js";
import { RunnerState } from "../types/state.js";
import { TicketFinalFailureSummary, TicketFinalSuccessSummary } from "../types/ticket-final-summary.js";
import { PlanSpecFinalActionId, PlanSpecFinalBlock, PlanSpecQuestionBlock } from "./plan-spec-parser.js";
import { EligibleSpecRef, SpecEligibilityResult } from "./spec-discovery.js";
import { TelegramController } from "./telegram-bot.js";

class SpyLogger extends Logger {
  public readonly infos: Array<{ message: string; context?: Record<string, unknown> }> = [];
  public readonly warnings: Array<{ message: string; context?: Record<string, unknown> }> = [];
  public readonly errors: Array<{ message: string; context?: Record<string, unknown> }> = [];

  override info(message: string, context?: Record<string, unknown>): void {
    this.infos.push({ message, context });
  }

  override warn(message: string, context?: Record<string, unknown>): void {
    this.warnings.push({ message, context });
  }

  override error(message: string, context?: Record<string, unknown>): void {
    this.errors.push({ message, context });
  }
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
  lastNotificationFailure: null,
  ...value,
  codexChatSession: value.codexChatSession ?? null,
  lastCodexChatSessionClosure: value.lastCodexChatSessionClosure ?? null,
});

const createPlanSpecSession = (
  value: Partial<NonNullable<RunnerState["planSpecSession"]>> = {},
): NonNullable<RunnerState["planSpecSession"]> => ({
  chatId: "42",
  phase: "awaiting-brief",
  startedAt: new Date("2026-02-19T12:00:00.000Z"),
  lastActivityAt: new Date("2026-02-19T12:05:00.000Z"),
  waitingCodexSinceAt: null,
  lastCodexActivityAt: null,
  lastCodexStream: null,
  lastCodexPreview: null,
  activeProjectSnapshot: cloneProject(defaultActiveProject),
  ...value,
});

const createCodexChatSession = (
  value: Partial<NonNullable<RunnerState["codexChatSession"]>> = {},
): NonNullable<RunnerState["codexChatSession"]> => ({
  sessionId: 7,
  chatId: "42",
  phase: "waiting-user",
  startedAt: new Date("2026-02-21T10:00:00.000Z"),
  lastActivityAt: new Date("2026-02-21T10:01:00.000Z"),
  waitingCodexSinceAt: null,
  userInactivitySinceAt: new Date("2026-02-21T10:01:00.000Z"),
  lastCodexActivityAt: null,
  lastCodexStream: null,
  lastCodexPreview: null,
  activeProjectSnapshot: cloneProject(defaultActiveProject),
  ...value,
});

type ControlCommand =
  | "start"
  | "run_all"
  | "run-all"
  | "codex_chat"
  | "codex-chat"
  | "specs"
  | "tickets_open"
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
      reason: PlanSpecCallbackIgnoredReason;
      message: string;
    };

interface OpenTicketRef {
  fileName: string;
}

type OpenTicketReadResult =
  | {
      status: "found";
      ticket: OpenTicketRef;
      content: string;
    }
  | {
      status: "not-found";
      ticketFileName: string;
    }
  | {
      status: "invalid-name";
      ticketFileName: string;
    };

interface ControllerOptions {
  allowedChatId?: string;
  runAllStatus?: "started" | "already-running" | "blocked";
  runAllMessage?: string;
  runSpecsStatus?: "started" | "already-running" | "blocked";
  runSpecsMessage?: string;
  runSelectedTicketResult?: RunSelectedTicketRequestResult;
  codexChatStartResult?: CodexChatSessionStartResult;
  codexChatInputResult?: CodexChatSessionInputResult;
  codexChatCancelResult?: CodexChatSessionCancelResult;
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
  pauseResult?: RunnerProjectControlResult;
  resumeResult?: RunnerProjectControlResult;
  getState?: () => RunnerState;
  projectSnapshot?: ProjectSelectionSnapshot;
  eligibleSpecs?: EligibleSpecRef[];
  openTickets?: OpenTicketRef[];
  readOpenTicketResult?: OpenTicketReadResult;
  readOpenTicketErrorMessage?: string;
  listEligibleSpecsErrorMessage?: string;
  listProjectsErrorMessage?: string;
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

const cloneOpenTicket = (ticket: OpenTicketRef): OpenTicketRef => ({
  fileName: ticket.fileName,
});

const createDefaultEligibleSpecs = (): EligibleSpecRef[] => [
  {
    fileName: "2026-02-19-approved-spec-triage-run-specs.md",
    specPath: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
  },
];

const createDefaultOpenTickets = (): OpenTicketRef[] => [
  {
    fileName: "2026-02-23-fluxo-telegram-tickets-abertos-listagem-selecao-e-conteudo.md",
  },
];

const createController = (options: ControllerOptions = {}) => {
  const logger = new SpyLogger();
  const controlState = {
    runAllCalls: 0,
    runSpecsCalls: 0,
    runSpecsArgs: [] as string[],
    listOpenTicketsCalls: 0,
    readOpenTicketCalls: 0,
    readOpenTicketArgs: [] as string[],
    runSelectedTicketCalls: 0,
    runSelectedTicketArgs: [] as string[],
    codexChatStartCalls: 0,
    codexChatStartChatIds: [] as string[],
    codexChatInputCalls: 0,
    codexChatInputCallsByChat: [] as { chatId: string; input: string }[],
    codexChatCancelCalls: 0,
    codexChatCancelChatIds: [] as string[],
    codexChatCancelOptions: [] as Array<CodexChatSessionCancelOptions | undefined>,
    planSpecStartCalls: 0,
    planSpecStartChatIds: [] as string[],
    planSpecInputCalls: 0,
    planSpecInputCallsByChat: [] as { chatId: string; input: string }[],
    planSpecCancelCalls: 0,
    planSpecCancelChatIds: [] as string[],
    listEligibleSpecsCalls: 0,
    validateRunSpecsTargetCalls: 0,
    validatedSpecsArgs: [] as string[],
    pauseCalls: 0,
    resumeCalls: 0,
    listProjectsCalls: 0,
    selectedProjectNames: [] as string[],
    planSpecQuestionSelections: [] as string[],
    planSpecFinalActions: [] as PlanSpecFinalActionId[],
  };

  const stateGetter = options.getState ?? (() => createState());
  const mutableSnapshot = cloneSnapshot(options.projectSnapshot ?? createDefaultProjectSnapshot());
  const mutableEligibleSpecs = (options.eligibleSpecs ?? createDefaultEligibleSpecs())
    .map(cloneEligibleSpec);
  const mutableOpenTickets = (options.openTickets ?? createDefaultOpenTickets())
    .map(cloneOpenTicket);

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
    startCodexChatSession: (chatId: string) => {
      controlState.codexChatStartCalls += 1;
      controlState.codexChatStartChatIds.push(chatId);
      if (options.codexChatStartResult) {
        return options.codexChatStartResult;
      }

      return {
        status: "started" as const,
        message: "Sessao /codex_chat iniciada. Envie a proxima mensagem para conversar com o Codex.",
      };
    },
    submitCodexChatInput: (chatId: string, input: string) => {
      controlState.codexChatInputCalls += 1;
      controlState.codexChatInputCallsByChat.push({ chatId, input });
      if (options.codexChatInputResult) {
        return options.codexChatInputResult;
      }

      return {
        status: "accepted" as const,
        message: "Mensagem encaminhada para a sessao /codex_chat.",
      };
    },
    cancelCodexChatSession: (chatId: string, cancelOptions?: CodexChatSessionCancelOptions) => {
      controlState.codexChatCancelCalls += 1;
      controlState.codexChatCancelChatIds.push(chatId);
      controlState.codexChatCancelOptions.push(cancelOptions);
      if (options.codexChatCancelResult) {
        return options.codexChatCancelResult;
      }

      return {
        status: "cancelled" as const,
        message: "Sessao /codex_chat cancelada.",
      };
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
    runSelectedTicket: (ticketFileName: string) => {
      controlState.runSelectedTicketCalls += 1;
      controlState.runSelectedTicketArgs.push(ticketFileName);
      if (options.runSelectedTicketResult) {
        return options.runSelectedTicketResult;
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
    listOpenTickets: () => {
      controlState.listOpenTicketsCalls += 1;
      return mutableOpenTickets.map(cloneOpenTicket);
    },
    readOpenTicket: (ticketFileName: string) => {
      controlState.readOpenTicketCalls += 1;
      controlState.readOpenTicketArgs.push(ticketFileName);
      if (options.readOpenTicketErrorMessage) {
        throw new Error(options.readOpenTicketErrorMessage);
      }
      if (options.readOpenTicketResult) {
        return options.readOpenTicketResult;
      }

      const target = mutableOpenTickets.find((ticket) => ticket.fileName === ticketFileName);
      if (!target) {
        return {
          status: "not-found" as const,
          ticketFileName,
        };
      }

      return {
        status: "found" as const,
        ticket: cloneOpenTicket(target),
        content: [
          `# [TICKET] ${target.fileName}`,
          "",
          "## Metadata",
          "- Status: open",
        ].join("\n"),
      };
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
    pause: () => {
      controlState.pauseCalls += 1;
      if (options.pauseResult) {
        return options.pauseResult;
      }

      return {
        status: "applied" as const,
        action: "pause" as const,
        project: cloneProject(defaultActiveProject),
        isPaused: true,
      };
    },
    resume: () => {
      controlState.resumeCalls += 1;
      if (options.resumeResult) {
        return options.resumeResult;
      }

      return {
        status: "applied" as const,
        action: "resume" as const,
        project: cloneProject(defaultActiveProject),
        isPaused: false,
      };
    },
    listProjects: () => {
      controlState.listProjectsCalls += 1;
      if (options.listProjectsErrorMessage) {
        throw new Error(options.listProjectsErrorMessage);
      }

      return cloneSnapshot(mutableSnapshot);
    },
    selectProjectByName: (projectName: string) => {
      controlState.selectedProjectNames.push(projectName);

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

const callHandleRunAllCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
  command: "run_all" | "run-all" = "run_all",
): Promise<void> => {
  const internalController = controller as unknown as {
    handleRunAllCommand: (
      value: {
        chat: { id: number };
        message?: { text?: string };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
      sourceCommand: "run_all" | "run-all",
    ) => Promise<void>;
  };

  await internalController.handleRunAllCommand(context, command);
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

const callSetTicketFinalSummaryRetryWait = (
  controller: TelegramController,
  wait: (delayMs: number) => Promise<void>,
): void => {
  const internalController = controller as unknown as {
    waitForTicketFinalSummaryRetry: (delayMs: number) => Promise<void>;
  };

  internalController.waitForTicketFinalSummaryRetry = wait;
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

const callHandleCodexChatCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
  command: "codex_chat" | "codex-chat" = "codex_chat",
): Promise<void> => {
  const internalController = controller as unknown as {
    handleCodexChatCommand: (
      value: {
        chat: { id: number };
        message?: { text?: string };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
      sourceCommand: "codex_chat" | "codex-chat",
    ) => Promise<void>;
  };

  await internalController.handleCodexChatCommand(context, command);
};

const callHandleCodexChatTextMessage = async (
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
    handleCodexChatTextMessage: (value: {
      chat: { id: number };
      message?: {
        text?: string;
        entities?: Array<{ type: string; offset: number; length: number }>;
      };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleCodexChatTextMessage(context);
};

const callHandleActiveFreeTextMessage = async (
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
    handleActiveFreeTextMessage: (value: {
      chat: { id: number };
      message?: {
        text?: string;
        entities?: Array<{ type: string; offset: number; length: number }>;
      };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleActiveFreeTextMessage(context);
};

const callHandleCodexChatCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: {
      data?: string;
      from?: { id: number };
      message?: { message_id?: number };
    };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleCodexChatCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: {
        data?: string;
        from?: { id: number };
        message?: { message_id?: number };
      };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleCodexChatCallbackQuery(context);
};

const callHandleCodexChatCommandHandoff = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: {
      text?: string;
      entities?: Array<{ type: string; offset: number; length: number }>;
    };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
  next: () => Promise<void>,
): Promise<void> => {
  const internalController = controller as unknown as {
    handleCodexChatCommandHandoff: (
      value: {
        chat: { id: number };
        message?: {
          text?: string;
          entities?: Array<{ type: string; offset: number; length: number }>;
        };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
      next: () => Promise<void>,
    ) => Promise<void>;
  };

  await internalController.handleCodexChatCommandHandoff(context, next);
};

const callHandlePauseCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePauseCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handlePauseCommand(context);
};

const callHandleResumeCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleResumeCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleResumeCommand(context);
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

const callHandleTicketsOpenCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTicketsOpenCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleTicketsOpenCommand(context);
};

const callHandleSpecsCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string; from?: { id: number } };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleSpecsCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string; from?: { id: number } };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleSpecsCallbackQuery(context);
};

const callHandleTicketsOpenCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string; from?: { id: number } };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTicketsOpenCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string; from?: { id: number } };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleTicketsOpenCallbackQuery(context);
};

const callCreateImplementTicketCallbackData = (
  controller: TelegramController,
  chatId: string,
  ticketFileName: string,
  messageId: number | null = null,
): string => {
  const internalController = controller as unknown as {
    createImplementTicketCallbackData: (
      chatId: string,
      ticketFileName: string,
      messageId?: number | null,
    ) => string;
  };

  return internalController.createImplementTicketCallbackData(chatId, ticketFileName, messageId);
};

const callHandleTicketRunCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: {
      data?: string;
      from?: { id: number };
      message?: { message_id?: number };
    };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTicketRunCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: {
        data?: string;
        from?: { id: number };
        message?: { message_id?: number };
      };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleTicketRunCallbackQuery(context);
};

const callHandleProjectsCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string; from?: { id: number } };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleProjectsCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string; from?: { id: number } };
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
    callbackQuery: {
      data?: string;
      from?: { id: number };
      message?: { message_id?: number };
    };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handlePlanSpecCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: {
        data?: string;
        from?: { id: number };
        message?: { message_id?: number };
      };
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

const mockSendMessage = (
  controller: TelegramController,
  options: {
    startingMessageId?: number;
  } = {},
) => {
  const messages: Array<{
    chatId: string;
    text: string;
    extra?: unknown;
    messageId: number;
  }> = [];
  let nextMessageId = options.startingMessageId ?? 1000;
  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: (chatId: string, text: string, extra?: unknown) => Promise<unknown>;
      };
    };
  };

  internalController.bot.telegram.sendMessage = async (
    chatId: string,
    text: string,
    extra?: unknown,
  ) => {
    const messageId = nextMessageId;
    nextMessageId += 1;
    messages.push({ chatId, text, extra, messageId });
    return Promise.resolve({ message_id: messageId });
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

const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const createTelegramLongPollingConflictError = (): Error & {
  response: { error_code: number; description: string };
  on: { method: string; payload: { timeout: number; offset: number } };
} =>
  Object.assign(new Error("409: Conflict"), {
    response: {
      error_code: 409,
      description:
        "Conflict: terminated by other getUpdates request; make sure that only one bot instance is running",
    },
    on: {
      method: "getUpdates",
      payload: {
        timeout: 50,
        offset: 123,
      },
    },
  });

const createTelegramSendMessageError = (options: {
  errorCode: number;
  description: string;
  retryAfterSeconds?: number;
}): Error & {
  response: {
    error_code: number;
    description: string;
    parameters?: {
      retry_after: number;
    };
  };
} =>
  Object.assign(new Error(`${options.errorCode}: ${options.description}`), {
    response: {
      error_code: options.errorCode,
      description: options.description,
      ...(typeof options.retryAfterSeconds === "number"
        ? {
            parameters: {
              retry_after: options.retryAfterSeconds,
            },
          }
        : {}),
    },
  });

const createTransportError = (
  code: string,
  message = "falha de transporte simulada",
): Error & { code: string } =>
  Object.assign(new Error(message), {
    code,
  });

test("start inicia long polling sem bloquear enquanto loop estiver ativo", async () => {
  const { controller, logger } = createController();
  let launchCalls = 0;
  const internalController = controller as unknown as {
    bot: {
      launch: (config?: unknown, onLaunch?: () => void) => Promise<void>;
    };
  };

  internalController.bot.launch = (_config?: unknown, onLaunch?: () => void) => {
    launchCalls += 1;
    onLaunch?.();
    return new Promise<void>(() => undefined);
  };

  await controller.start();

  assert.equal(launchCalls, 1);
  assert.equal(logger.infos.length, 1);
  assert.equal(logger.infos[0]?.message, "Telegram bot iniciado em long polling");
});

test("start trata conflito 409 de getUpdates sem lancar erro fatal", async () => {
  const { controller, logger } = createController();
  let rejectLaunch: (reason?: unknown) => void = () => undefined;
  const internalController = controller as unknown as {
    bot: {
      launch: (config?: unknown, onLaunch?: () => void) => Promise<void>;
    };
  };

  internalController.bot.launch = () =>
    new Promise<void>((_resolve, reject) => {
      rejectLaunch = reject;
    });

  await controller.start();
  rejectLaunch(createTelegramLongPollingConflictError());
  await flushAsyncWork();

  assert.equal(logger.warnings.length, 1);
  assert.equal(
    logger.warnings[0]?.message,
    "Conflito no long polling do Telegram: outra instancia do bot esta ativa para este token",
  );
  assert.deepEqual(logger.warnings[0]?.context, {
    errorCode: 409,
    method: "getUpdates",
    description:
      "Conflict: terminated by other getUpdates request; make sure that only one bot instance is running",
  });
  assert.equal(logger.errors.length, 0);
});

test("stop nao falha quando bot nao estava em execucao", async () => {
  const { controller, logger } = createController();
  const internalController = controller as unknown as {
    bot: {
      launch: (config?: unknown, onLaunch?: () => void) => Promise<void>;
      stop: (signal?: string) => void;
    };
  };

  internalController.bot.launch = (_config?: unknown, onLaunch?: () => void) => {
    onLaunch?.();
    return Promise.resolve();
  };

  internalController.bot.stop = () => {
    throw new Error("Bot is not running!");
  };

  await controller.start();
  await controller.stop("SIGTERM");

  assert.equal(logger.warnings.length, 1);
  assert.equal(logger.warnings[0]?.message, "Stop do Telegram ignorado: bot nao estava em execucao");
  assert.equal(logger.infos.at(-1)?.message, "Telegram bot finalizado");
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

test("/pause atua no runner do projeto ativo", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandlePauseCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.pauseCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "✅ Runner do projeto codex-flow-runner será pausado após a etapa corrente.");
});

test("/resume atua no runner do projeto ativo", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleResumeCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.resumeCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "▶️ Runner do projeto codex-flow-runner retomado.");
});

test("/pause informa quando projeto ativo nao possui runner em execucao", async () => {
  const { controller, controlState } = createController({
    pauseResult: {
      status: "ignored",
      action: "pause",
      reason: "project-slot-inactive",
      project: {
        name: "beta-project",
        path: "/home/mapita/projetos/beta-project",
      },
    },
  });
  const replies: string[] = [];

  await callHandlePauseCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.pauseCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Nenhum runner em execução no projeto ativo beta-project.");
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
  assert.match(reply, /\/tickets_open/u);
  assert.match(reply, /\/run_specs/u);
  assert.match(reply, /\/codex_chat/u);
  assert.match(reply, /\/codex-chat/u);
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

test("/codex_chat e alias /codex-chat iniciam a mesma sessao (CA-01/CA-02)", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  const context = {
    chat: { id: 42 },
    message: { text: "/codex_chat" },
    reply: async (text: string) => {
      replies.push(text);
      return Promise.resolve();
    },
  };

  await callHandleCodexChatCommand(controller, context, "codex_chat");
  await callHandleCodexChatCommand(
    controller,
    {
      ...context,
      message: { text: "/codex-chat" },
    },
    "codex-chat",
  );

  assert.equal(controlState.codexChatStartCalls, 2);
  assert.deepEqual(controlState.codexChatStartChatIds, ["42", "42"]);
  assert.equal(replies.length, 2);
  assert.match(replies[0] ?? "", /Sessao \/codex_chat iniciada/u);
  assert.match(replies[1] ?? "", /Sessao \/codex_chat iniciada/u);
});

test("mensagem livre em sessao /codex_chat ativa e roteada para o runner (CA-03)", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        codexChatSession: createCodexChatSession({
          sessionId: 17,
          chatId: "42",
          phase: "waiting-user",
        }),
      }),
  });
  const replies: string[] = [];

  await callHandleCodexChatTextMessage(controller, {
    chat: { id: 42 },
    message: { text: "Quais passos para corrigir este bug?" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.codexChatInputCalls, 1);
  assert.deepEqual(controlState.codexChatInputCallsByChat, [{
    chatId: "42",
    input: "Quais passos para corrigir este bug?",
  }]);
  assert.deepEqual(replies, ["✅ Mensagem enviada para a sessão /codex_chat."]);
});

test("gate de texto livre roteia para uma unica sessao quando houver estado inconsistente (CA-06)", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        planSpecSession: createPlanSpecSession({
          chatId: "42",
          phase: "waiting-user",
        }),
        codexChatSession: createCodexChatSession({
          sessionId: 17,
          chatId: "42",
          phase: "waiting-user",
        }),
      }),
  });
  const replies: string[] = [];

  await callHandleActiveFreeTextMessage(controller, {
    chat: { id: 42 },
    message: {
      text: "Quero continuar o planejamento sem enviar no chat livre do Codex.",
    },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.planSpecInputCalls, 1);
  assert.equal(controlState.codexChatInputCalls, 0);
  assert.deepEqual(controlState.planSpecInputCallsByChat, [{
    chatId: "42",
    input: "Quero continuar o planejamento sem enviar no chat livre do Codex.",
  }]);
  assert.deepEqual(replies, ["✅ Mensagem enviada para a sessão /plan_spec."]);
});

test("saida de /codex_chat enviada ao Telegram inclui botao inline de encerramento (CA-04)", async () => {
  const { controller } = createController({
    getState: () =>
      createState({
        codexChatSession: createCodexChatSession({
          sessionId: 23,
          chatId: "42",
        }),
      }),
  });
  const sentMessages = mockSendMessage(controller);

  await controller.sendCodexChatOutput("42", "Resposta saneada do Codex");

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.equal(sentMessages[0]?.text, "Resposta saneada do Codex");
  assert.deepEqual(sentMessages[0]?.extra, {
    reply_markup: {
      inline_keyboard: [[{
        text: "🛑 Encerrar /codex_chat",
        callback_data: "codex-chat:close:23",
      }]],
    },
  });
});

test("callback de encerramento manual fecha sessao ativa e confirma no chat (CA-05)", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        codexChatSession: createCodexChatSession({
          sessionId: 31,
          chatId: "42",
        }),
      }),
    codexChatCancelResult: {
      status: "cancelled",
      message: "Sessao /codex_chat cancelada.",
    },
  });
  const sentMessages = mockSendMessage(controller);
  const answers: Array<string | undefined> = [];

  await callHandleCodexChatCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "codex-chat:close:31",
      from: { id: 42 },
      message: { message_id: 911 },
    },
    answerCbQuery: async (text?: string) => {
      answers.push(text);
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.codexChatCancelCalls, 1);
  assert.deepEqual(controlState.codexChatCancelChatIds, ["42"]);
  assert.deepEqual(answers, ["Sessão /codex_chat encerrada."]);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.equal(sentMessages[0]?.text, "✅ Sessao /codex_chat cancelada.");
});

test("callback stale de /codex_chat nao fecha sessao nova (CA-05)", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        codexChatSession: createCodexChatSession({
          sessionId: 89,
          chatId: "42",
        }),
      }),
  });
  const sentMessages = mockSendMessage(controller);
  const answers: Array<string | undefined> = [];

  await callHandleCodexChatCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "codex-chat:close:31",
      from: { id: 42 },
      message: { message_id: 912 },
    },
    answerCbQuery: async (text?: string) => {
      answers.push(text);
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.codexChatCancelCalls, 0);
  assert.deepEqual(answers, ["Sessão /codex_chat expirada ou substituída."]);
  assert.equal(sentMessages.length, 0);
});

test("handoff por comando encerra /codex_chat e executa novo comando no mesmo update (CA-07)", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        codexChatSession: createCodexChatSession({
          sessionId: 50,
          chatId: "42",
        }),
      }),
  });
  const replies: string[] = [];
  const context = {
    chat: { id: 42 },
    message: {
      text: "/run_all",
      entities: [{
        type: "bot_command",
        offset: 0,
        length: 8,
      }],
    },
    reply: async (text: string) => {
      replies.push(text);
      return Promise.resolve();
    },
  };

  await callHandleCodexChatCommandHandoff(controller, context, async () => {
    await callHandleRunAllCommand(controller, context, "run_all");
  });

  assert.equal(controlState.codexChatCancelCalls, 1);
  assert.deepEqual(controlState.codexChatCancelOptions, [{
    reason: "command-handoff",
    triggeringCommand: "run_all",
  }]);
  assert.equal(controlState.runAllCalls, 1);
  assert.deepEqual(replies, ["▶️ Runner iniciado via /run_all."]);
});

test("handoff preserva /codex_chat quando comando seguinte for /plan_spec (CA-04)", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        codexChatSession: createCodexChatSession({
          sessionId: 51,
          chatId: "42",
        }),
      }),
    planSpecStartResult: {
      status: "blocked",
      message:
        "Nao e possivel iniciar /plan_spec enquanto houver sessao global de texto livre ativa em /codex_chat. Encerre a sessao /codex_chat atual e tente novamente.",
    },
  });
  const replies: string[] = [];
  const context = {
    chat: { id: 42 },
    message: {
      text: "/plan_spec",
      entities: [{
        type: "bot_command",
        offset: 0,
        length: 10,
      }],
    },
    reply: async (text: string) => {
      replies.push(text);
      return Promise.resolve();
    },
  };

  await callHandleCodexChatCommandHandoff(controller, context, async () => {
    await callHandlePlanSpecCommand(controller, context);
  });

  assert.equal(controlState.codexChatCancelCalls, 0);
  assert.equal(controlState.planSpecStartCalls, 1);
  assert.match(
    replies[0] ?? "",
    /sessao global de texto livre ativa em \/codex_chat/u,
  );
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
  assert.match(replies[0] ?? "", /Última atividade do Codex: \(ainda sem saída observável\)/u);
});

test("/plan_spec_status inclui diagnostico do Codex durante espera", async () => {
  const state = createState({
    phase: "plan-spec-waiting-codex",
    planSpecSession: createPlanSpecSession({
      phase: "waiting-codex",
      waitingCodexSinceAt: new Date("2026-02-19T12:10:00.000Z"),
      lastCodexActivityAt: new Date("2026-02-19T12:12:30.000Z"),
      lastCodexStream: "stderr",
      lastCodexPreview: "planner em andamento",
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
  assert.match(replies[0] ?? "", /Aguardando Codex desde: 2026-02-19T12:10:00.000Z/u);
  assert.match(replies[0] ?? "", /Última atividade do Codex: 2026-02-19T12:12:30.000Z/u);
  assert.match(replies[0] ?? "", /Último stream do Codex: stderr/u);
  assert.match(replies[0] ?? "", /Preview da última saída do Codex: planner em andamento/u);
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

test("/specs lista somente specs elegiveis com teclado inline paginado (CA-01)", async () => {
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
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listEligibleSpecsCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Specs elegíveis para \/run_specs/u);
  assert.match(replies[0]?.text ?? "", /Página 1\/1/u);
  assert.match(replies[0]?.text ?? "", /2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(replies[0]?.text ?? "", /2026-02-20-outra-spec-pending\.md/u);
  const inlineKeyboard = (replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard;
  assert.equal(inlineKeyboard?.length, 2);
  assert.match(inlineKeyboard?.[0]?.[0]?.callback_data ?? "", /^specs:select:[a-z0-9]+:0$/u);
  assert.match(inlineKeyboard?.[1]?.[0]?.callback_data ?? "", /^specs:select:[a-z0-9]+:1$/u);
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

test("/tickets_open lista tickets abertos com teclado inline paginado", async () => {
  const { controller, controlState } = createController({
    openTickets: [
      { fileName: "2026-02-23-ticket-a.md" },
      { fileName: "2026-02-23-ticket-b.md" },
    ],
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listOpenTicketsCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Tickets abertos/u);
  assert.match(replies[0]?.text ?? "", /2026-02-23-ticket-a\.md/u);
  assert.match(replies[0]?.text ?? "", /2026-02-23-ticket-b\.md/u);
  const inlineKeyboard = (replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard;
  assert.equal(inlineKeyboard?.length, 2);
  assert.match(inlineKeyboard?.[0]?.[0]?.callback_data ?? "", /^tickets-open:select:[a-z0-9]+:0$/u);
  assert.match(inlineKeyboard?.[1]?.[0]?.callback_data ?? "", /^tickets-open:select:[a-z0-9]+:1$/u);
});

test("/tickets_open responde mensagem clara quando nao ha tickets abertos", async () => {
  const { controller } = createController({
    openTickets: [],
  });
  const replies: string[] = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Nenhum ticket aberto encontrado em tickets/open/.");
});

test("/tickets_open suporta paginacao por callback sem perder contexto", async () => {
  const { controller, controlState } = createController({
    openTickets: [
      { fileName: "2026-02-23-ticket-01.md" },
      { fileName: "2026-02-23-ticket-02.md" },
      { fileName: "2026-02-23-ticket-03.md" },
      { fileName: "2026-02-23-ticket-04.md" },
      { fileName: "2026-02-23-ticket-05.md" },
      { fileName: "2026-02-23-ticket-06.md" },
    ],
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const inlineKeyboard = (replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard;
  const nextPageCallback = inlineKeyboard?.[5]?.[0]?.callback_data ?? "";

  await callHandleTicketsOpenCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: nextPageCallback },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listOpenTicketsCalls, 2);
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Página 2\/2/u);
  assert.match(edits[0]?.text ?? "", /2026-02-23-ticket-06\.md/u);
  assert.equal(answers.length, 1);
});

test("callback de /tickets_open envia conteudo completo em chunks e oferece botao de implementacao", async () => {
  const ticketFileName = "2026-02-23-ticket-longo.md";
  const longContent = `${"Linha de teste longa.\n".repeat(280)}\nFim.`;
  const { controller, controlState } = createController({
    openTickets: [{ fileName: ticketFileName }],
    readOpenTicketResult: {
      status: "found",
      ticket: { fileName: ticketFileName },
      content: longContent,
    },
  });
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleTicketsOpenCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData, from: { id: 42 } },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.readOpenTicketCalls, 1);
  assert.deepEqual(controlState.readOpenTicketArgs, [ticketFileName]);
  assert.equal(answers[0], "Ticket carregado.");
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Selecionado: 2026-02-23-ticket-longo\.md/u);
  assert.ok(sentMessages.length >= 3);
  assert.match(sentMessages[0]?.text ?? "", /Parte 1\//u);
  const actionMessage = sentMessages[sentMessages.length - 1];
  assert.match(actionMessage?.text ?? "", /Implementar este ticket/u);
  const actionKeyboard = (actionMessage?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard;
  assert.equal(actionKeyboard?.[0]?.[0]?.text, "▶️ Implementar este ticket");
  assert.match(actionKeyboard?.[0]?.[0]?.callback_data ?? "", /^ticket-run:execute:[a-z0-9]+$/u);
});

test("callback de /tickets_open informa ticket removido entre lista e selecao", async () => {
  const ticketFileName = "2026-02-23-ticket-removido.md";
  const { controller, controlState } = createController({
    openTickets: [{ fileName: ticketFileName }],
    readOpenTicketResult: {
      status: "not-found",
      ticketFileName,
    },
  });
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleTicketsOpenCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.readOpenTicketCalls, 1);
  assert.equal(controlState.runSelectedTicketCalls, 0);
  assert.deepEqual(answers, ["Ticket não encontrado."]);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Ticket selecionado nao encontrado em tickets\/open\//u);
});

test("/specs suporta paginacao por callback sem perder contexto (CA-07)", async () => {
  const { controller, controlState } = createController({
    eligibleSpecs: [
      { fileName: "2026-02-20-spec-01.md", specPath: "docs/specs/2026-02-20-spec-01.md" },
      { fileName: "2026-02-20-spec-02.md", specPath: "docs/specs/2026-02-20-spec-02.md" },
      { fileName: "2026-02-20-spec-03.md", specPath: "docs/specs/2026-02-20-spec-03.md" },
      { fileName: "2026-02-20-spec-04.md", specPath: "docs/specs/2026-02-20-spec-04.md" },
      { fileName: "2026-02-20-spec-05.md", specPath: "docs/specs/2026-02-20-spec-05.md" },
      { fileName: "2026-02-20-spec-06.md", specPath: "docs/specs/2026-02-20-spec-06.md" },
    ],
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const inlineKeyboard = (replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard;
  const nextPageCallback = inlineKeyboard?.[5]?.[0]?.callback_data ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: nextPageCallback },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listEligibleSpecsCalls, 2);
  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Página 2\/2/u);
  assert.match(edits[0]?.text ?? "", /2026-02-20-spec-06\.md/u);
  assert.equal(answers.length, 1);
});

test("callback de /specs inicia triagem no clique e trava mensagem selecionada (CA-02/CA-03/CA-04/CA-05)", async () => {
  const { controller, controlState } = createController({
    eligibleSpecs: [
      {
        fileName: "2026-02-19-approved-spec-triage-run-specs.md",
        specPath: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
      },
    ],
  });
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 1);
  assert.deepEqual(controlState.runSpecsArgs, ["2026-02-19-approved-spec-triage-run-specs.md"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Triagem iniciada.");
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /✅ Selecionada: 2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(edits[0]?.text ?? "", /Botões travados/u);
  const lockedKeyboard = (edits[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard;
  assert.deepEqual(lockedKeyboard, []);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.match(
    sentMessages[0]?.text ?? "",
    /Runner iniciado via \/run_specs para 2026-02-19-approved-spec-triage-run-specs\.md/u,
  );
});

test("callback stale de /specs e bloqueado sem iniciar triagem (CA-08)", async () => {
  const { controller, controlState } = createController();
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });
  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async () => Promise.resolve(),
  });

  const staleCallbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: staleCallbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "A lista de specs mudou. Use /specs para atualizar.");
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.equal(sentMessages[0]?.text, "A lista de specs mudou. Use /specs para atualizar.");
});

test("callback stale de /specs registra attempt/validation/decision com blockReason (CA-16)", async () => {
  const { controller, logger } = createController();
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });
  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async () => Promise.resolve(),
  });

  const staleCallbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: staleCallbackData,
      from: { id: 7001 },
    },
    answerCbQuery: async () => Promise.resolve(),
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(
    logger.infos.some((entry) =>
      entry.message === "Callback recebido via Telegram" &&
      entry.context?.callbackFlow === "specs" &&
      entry.context?.callbackStage === "attempt" &&
      entry.context?.chatId === "42" &&
      entry.context?.userId === "7001",
    ),
    true,
  );
  assert.equal(
    logger.infos.some((entry) =>
      entry.message === "Validacao de callback executada" &&
      entry.context?.callbackFlow === "specs" &&
      entry.context?.validation === "context" &&
      entry.context?.validationResult === "blocked" &&
      entry.context?.blockReason === "stale",
    ),
    true,
  );
  assert.equal(
    logger.infos.some((entry) =>
      entry.message === "Decisao final de callback registrada" &&
      entry.context?.callbackFlow === "specs" &&
      entry.context?.result === "blocked" &&
      entry.context?.blockReason === "stale",
    ),
    true,
  );
});

test("callback de /specs revalida elegibilidade e bloqueia spec inelegivel (CA-09)", async () => {
  const { controller, controlState } = createController({
    runSpecsValidationResult: {
      status: "not-eligible",
      spec: {
        fileName: "2026-02-19-approved-spec-triage-run-specs.md",
        specPath: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
      },
      metadata: {
        status: "approved",
        specTreatment: null,
      },
    },
  });
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Spec não elegível.");
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Spec não elegível para \/run_specs/u);
  assert.match(sentMessages[0]?.text ?? "", /Spec treatment: \(ausente\)/u);
});

test("callback de /specs respeita concorrencia e e idempotente em clique repetido (CA-10)", async () => {
  const { controller, controlState } = createController({
    runSpecsStatus: "already-running",
  });
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });
  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsCalls, 1);
  assert.equal(answers.length, 2);
  assert.equal(answers[0], "Runner já está em execução.");
  assert.equal(answers[1], "Seleção já processada. Use /specs para atualizar.");
  assert.equal(edits.length, 1);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Runner já está em execução/u);
});

test("callback de Implementar este ticket inicia execucao unitaria e trava contexto", async () => {
  const { controller, controlState } = createController();
  const sentMessages = mockSendMessage(controller);
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];
  const ticketFileName = "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md";
  const callbackData = callCreateImplementTicketCallbackData(controller, "42", ticketFileName, 901);

  await callHandleTicketRunCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: callbackData,
      from: { id: 42 },
      message: { message_id: 901 },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.runSelectedTicketCalls, 1);
  assert.deepEqual(controlState.runSelectedTicketArgs, [ticketFileName]);
  assert.deepEqual(answers, ["Execução do ticket iniciada."]);
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Ação: Implementar este ticket/u);
  assert.match(edits[0]?.text ?? "", /Botão travado/u);
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.match(
    sentMessages[0]?.text ?? "",
    /Execução iniciada para o ticket 2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria\.md/u,
  );
});

test("callback de Implementar este ticket traduz bloqueio de concorrencia", async () => {
  const { controller, controlState } = createController({
    runSelectedTicketResult: {
      status: "blocked",
      reason: "project-slot-busy",
      message:
        "Nao e possivel iniciar /run_ticket: slot do projeto alpha-project ja ocupado por /run_all.",
    },
  });
  const sentMessages = mockSendMessage(controller);
  const answers: string[] = [];
  const ticketFileName = "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md";
  const callbackData = callCreateImplementTicketCallbackData(controller, "42", ticketFileName, 902);

  await callHandleTicketRunCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: callbackData,
      from: { id: 42 },
      message: { message_id: 902 },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.runSelectedTicketCalls, 1);
  assert.deepEqual(answers, ["Execução bloqueada."]);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /slot do projeto alpha-project ja ocupado/u);
});

test("callback de Implementar este ticket informa ticket removido sem iniciar execucao", async () => {
  const { controller, controlState } = createController({
    runSelectedTicketResult: {
      status: "ticket-nao-encontrado",
      message:
        "Ticket selecionado nao encontrado em tickets/open/: 2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md.",
    },
  });
  const sentMessages = mockSendMessage(controller);
  const answers: string[] = [];
  const ticketFileName = "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md";
  const callbackData = callCreateImplementTicketCallbackData(controller, "42", ticketFileName, 903);

  await callHandleTicketRunCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: callbackData,
      from: { id: 42 },
      message: { message_id: 903 },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.runSelectedTicketCalls, 1);
  assert.deepEqual(answers, ["Ticket não encontrado."]);
  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Ticket selecionado nao encontrado/u);
});

test("callback de Implementar este ticket e idempotente em clique repetido", async () => {
  const { controller, controlState } = createController();
  const answers: string[] = [];
  const ticketFileName = "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md";
  const callbackData = callCreateImplementTicketCallbackData(controller, "42", ticketFileName, 904);

  const callbackContext = {
    chat: { id: 42 },
    callbackQuery: {
      data: callbackData,
      from: { id: 42 },
      message: { message_id: 904 },
    },
    answerCbQuery: async (text?: string) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  };

  await callHandleTicketRunCallbackQuery(controller, callbackContext);
  await callHandleTicketRunCallbackQuery(controller, callbackContext);

  assert.equal(controlState.runSelectedTicketCalls, 1);
  assert.deepEqual(answers, [
    "Execução do ticket iniciada.",
    "Ação já processada. Atualize a lista de tickets.",
  ]);
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

test("com TELEGRAM_ALLOWED_CHAT_ID, chat nao autorizado nao executa /tickets_open", async () => {
  const { controller, controlState, logger } = createController({ allowedChatId: "42" });
  const replies: string[] = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listOpenTicketsCalls, 0);
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

test("com TELEGRAM_ALLOWED_CHAT_ID, callback de /specs em chat nao autorizado e bloqueado (CA-11)", async () => {
  const { controller, controlState, logger } = createController({ allowedChatId: "42" });
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 99 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.runSpecsCalls, 0);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Acesso não autorizado.");
  assert.equal(logger.warnings.length, 1);
  assert.deepEqual(logger.warnings[0]?.context, {
    chatId: "99",
    eventType: "callback-query",
    callbackData,
  });
});

test("com TELEGRAM_ALLOWED_CHAT_ID, callback de /tickets_open em chat nao autorizado e bloqueado", async () => {
  const { controller, controlState, logger } = createController({ allowedChatId: "42" });
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];

  await callHandleTicketsOpenCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleTicketsOpenCallbackQuery(controller, {
    chat: { id: 99 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.readOpenTicketCalls, 0);
  assert.deepEqual(answers, ["Acesso não autorizado."]);
  assert.equal(logger.warnings.length, 1);
  assert.deepEqual(logger.warnings[0]?.context, {
    chatId: "99",
    eventType: "callback-query",
    callbackData,
  });
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

test("callback de selecao permite troca durante execucao em outro projeto", async () => {
  const runningState = createState({ isRunning: true });
  const { controller, controlState } = createController({
    getState: () => runningState,
  });
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

test("callback de pergunta do /plan_spec destaca escolha, trava botoes e confirma no chat (CA-12, CA-14)", async () => {
  const state = createState({
    phase: "plan-spec-waiting-user",
    planSpecSession: createPlanSpecSession({
      sessionId: 17,
      phase: "waiting-user",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 700 });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await controller.sendPlanSpecQuestion("42", {
    prompt: "Qual escopo devemos priorizar?",
    options: [
      { value: "api", label: "API pública" },
      { value: "bot", label: "Bot Telegram" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:question:api",
      message: { message_id: sentMessages[0]?.messageId },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.deepEqual(controlState.planSpecQuestionSelections, ["api"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Resposta registrada.");
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Seleção confirmada:/u);
  assert.match(edits[0]?.text ?? "", /✅ API pública/u);
  assert.deepEqual(
    (
      edits[0]?.extra as {
        reply_markup?: { inline_keyboard?: unknown[] };
      }
    ).reply_markup?.inline_keyboard,
    [],
  );
  assert.equal(sentMessages.length, 2);
  assert.match(sentMessages[1]?.text ?? "", /Resposta registrada\./u);
  assert.match(sentMessages[1]?.text ?? "", /API pública/u);
});

test("callback final do /plan_spec destaca acao, trava botoes e confirma no chat (CA-13, CA-14)", async () => {
  const state = createState({
    phase: "plan-spec-awaiting-final-action",
    planSpecSession: createPlanSpecSession({
      sessionId: 21,
      phase: "awaiting-final-action",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
    planSpecFinalCallbackOutcome: {
      status: "accepted",
    },
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 810 });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await controller.sendPlanSpecFinalization("42", {
    title: "Bridge interativa do Codex",
    summary: "Sessao /plan com parser e callbacks no Telegram.",
    actions: [
      { id: "create-spec", label: "Criar spec" },
      { id: "refine", label: "Refinar" },
      { id: "cancel", label: "Cancelar" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:final:create-spec",
      message: { message_id: sentMessages[0]?.messageId },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.deepEqual(controlState.planSpecFinalActions, ["create-spec"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Resposta registrada.");
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Ação confirmada:/u);
  assert.match(edits[0]?.text ?? "", /✅ Criar spec/u);
  assert.deepEqual(
    (
      edits[0]?.extra as {
        reply_markup?: { inline_keyboard?: unknown[] };
      }
    ).reply_markup?.inline_keyboard,
    [],
  );
  assert.equal(sentMessages.length, 2);
  assert.match(sentMessages[1]?.text ?? "", /Resposta registrada\./u);
  assert.match(sentMessages[1]?.text ?? "", /Criar spec/u);
});

test("callback final de Refinar retorna ao ciclo sem lock quando runner rejeita acao", async () => {
  const state = createState({
    phase: "plan-spec-awaiting-final-action",
    planSpecSession: createPlanSpecSession({
      sessionId: 22,
      phase: "awaiting-final-action",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
    planSpecFinalCallbackOutcome: {
      status: "ignored",
      reason: "invalid-action",
      message: "Refino solicitado, continue a conversa.",
    },
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 830 });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await controller.sendPlanSpecFinalization("42", {
    title: "Bridge interativa do Codex",
    summary: "Sessao /plan com parser e callbacks no Telegram.",
    actions: [
      { id: "create-spec", label: "Criar spec" },
      { id: "refine", label: "Refinar" },
      { id: "cancel", label: "Cancelar" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:final:refine",
      message: { message_id: sentMessages[0]?.messageId },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.deepEqual(controlState.planSpecFinalActions, ["refine"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Refino solicitado, continue a conversa.");
  assert.equal(edits.length, 0);
  assert.equal(sentMessages.length, 1);
});

test("callback stale de /plan_spec por mensagem divergente e bloqueado sem side effects (CA-15)", async () => {
  const state = createState({
    phase: "plan-spec-waiting-user",
    planSpecSession: createPlanSpecSession({
      sessionId: 31,
      phase: "waiting-user",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 900 });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await controller.sendPlanSpecQuestion("42", {
    prompt: "Qual escopo devemos priorizar?",
    options: [
      { value: "api", label: "API pública" },
      { value: "bot", label: "Bot Telegram" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:question:api",
      message: { message_id: sentMessages[0]!.messageId + 1 },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text, extra) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.deepEqual(controlState.planSpecQuestionSelections, []);
  assert.equal(answers.length, 1);
  assert.match(answers[0] ?? "", /A etapa do planejamento mudou/u);
  assert.equal(edits.length, 0);
  assert.equal(sentMessages.length, 1);
});

test("callback repetido de /plan_spec e idempotente sem reenviar input (CA-22, CA-23)", async () => {
  const state = createState({
    phase: "plan-spec-waiting-user",
    planSpecSession: createPlanSpecSession({
      sessionId: 32,
      phase: "waiting-user",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 950 });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await controller.sendPlanSpecQuestion("42", {
    prompt: "Qual escopo devemos priorizar?",
    options: [
      { value: "api", label: "API pública" },
      { value: "bot", label: "Bot Telegram" },
    ],
  });

  const callbackContext = {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:question:api",
      message: { message_id: sentMessages[0]?.messageId },
    },
    answerCbQuery: async (text?: string) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async (text: string, extra?: unknown) => {
      edits.push({ text, extra });
      return Promise.resolve();
    },
  };

  await callHandlePlanSpecCallbackQuery(controller, callbackContext);
  await callHandlePlanSpecCallbackQuery(controller, callbackContext);

  assert.deepEqual(controlState.planSpecQuestionSelections, ["api"]);
  assert.equal(answers.length, 2);
  assert.equal(answers[0], "Resposta registrada.");
  assert.match(answers[1] ?? "", /Seleção já processada/u);
  assert.equal(edits.length, 1);
  assert.equal(sentMessages.length, 2);
});

test("falha de editMessageText em /plan_spec nao quebra callback aceito e gera warning (CA-21)", async () => {
  const state = createState({
    phase: "plan-spec-waiting-user",
    planSpecSession: createPlanSpecSession({
      sessionId: 41,
      phase: "waiting-user",
    }),
  });
  const { controller, controlState, logger } = createController({
    getState: () => state,
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 1000 });
  const answers: string[] = [];

  await controller.sendPlanSpecQuestion("42", {
    prompt: "Qual escopo devemos priorizar?",
    options: [
      { value: "api", label: "API pública" },
      { value: "bot", label: "Bot Telegram" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:question:api",
      message: { message_id: sentMessages[0]?.messageId },
    },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => {
      throw new Error("forbidden");
    },
  });

  assert.deepEqual(controlState.planSpecQuestionSelections, ["api"]);
  assert.equal(answers.length, 1);
  assert.equal(answers[0], "Resposta registrada.");
  assert.equal(sentMessages.length, 2);
  assert.equal(
    logger.warnings.some((entry) =>
      entry.message === "Falha ao editar mensagem de /plan_spec para destacar selecao de pergunta"
    ),
    true,
  );
});

test("callback de /plan_spec registra decision com reason tipado e sessionId (CA-16)", async () => {
  const state = createState({
    phase: "plan-spec-awaiting-final-action",
    planSpecSession: createPlanSpecSession({
      sessionId: 17,
      phase: "awaiting-final-action",
    }),
  });
  const { controller, logger } = createController({
    getState: () => state,
    planSpecFinalCallbackOutcome: {
      status: "ignored",
      reason: "ineligible",
      message: "Falha ao criar spec planejada: conflito de slug.",
    },
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 1100 });

  await controller.sendPlanSpecFinalization("42", {
    title: "Bridge interativa do Codex",
    summary: "Sessao /plan com parser e callbacks no Telegram.",
    actions: [
      { id: "create-spec", label: "Criar spec" },
      { id: "refine", label: "Refinar" },
      { id: "cancel", label: "Cancelar" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:final:create-spec",
      from: { id: 7002 },
      message: { message_id: sentMessages[0]?.messageId },
    },
    answerCbQuery: async () => Promise.resolve(),
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(
    logger.infos.some((entry) =>
      entry.message === "Callback recebido via Telegram" &&
      entry.context?.callbackFlow === "plan-spec" &&
      entry.context?.callbackStage === "attempt" &&
      entry.context?.action === "create-spec" &&
      entry.context?.sessionId === 17 &&
      entry.context?.userId === "7002" &&
      entry.context?.messageId === sentMessages[0]?.messageId,
    ),
    true,
  );
  assert.equal(
    logger.infos.some((entry) =>
      entry.message === "Decisao final de callback registrada" &&
      entry.context?.callbackFlow === "plan-spec" &&
      entry.context?.action === "create-spec" &&
      entry.context?.result === "blocked" &&
      entry.context?.blockReason === "ineligible" &&
      entry.context?.sessionId === 17,
    ),
    true,
  );
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

test("/select-project permite troca durante execucao em outro projeto", async () => {
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

  assert.equal(controlState.selectedProjectNames.length, 1);
  assert.equal(controlState.selectedProjectNames[0], "beta-project");
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Projeto ativo alterado para beta-project/u);
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

test("nao envia milestone de triagem /run_specs quando chat de notificacao nao foi capturado", async () => {
  const { controller, logger } = createController();
  const sentMessages = mockSendMessage(controller);

  await controller.sendRunSpecsTriageMilestone({
    spec: {
      fileName: "2026-02-19-approved-spec-triage-run-specs.md",
      path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
    },
    outcome: "success",
    finalStage: "spec-close-and-version",
    nextAction: "Triagem concluida; iniciando rodada /run-all para processar tickets abertos.",
  });

  assert.equal(sentMessages.length, 0);
  assert.equal(logger.warnings.length, 1);
  assert.equal(
    logger.warnings[0]?.message,
    "Milestone de triagem de /run_specs nao enviada: chat de notificacao indefinido",
  );
  assert.equal(
    logger.warnings[0]?.context?.specFileName,
    "2026-02-19-approved-spec-triage-run-specs.md",
  );
});

test("envia milestone de triagem /run_specs para chat capturado pelo comando /run_specs", async () => {
  const { controller } = createController({ runSpecsStatus: "started" });
  const sentMessages = mockSendMessage(controller);

  await callHandleRunSpecsCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs 2026-02-19-approved-spec-triage-run-specs.md" },
    reply: async () => Promise.resolve(),
  });

  await controller.sendRunSpecsTriageMilestone({
    spec: {
      fileName: "2026-02-19-approved-spec-triage-run-specs.md",
      path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
    },
    outcome: "success",
    finalStage: "spec-close-and-version",
    nextAction: "Triagem concluida; iniciando rodada /run-all para processar tickets abertos.",
  });

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.match(sentMessages[0]?.text ?? "", /Marco da triagem \/run_specs/u);
  assert.match(sentMessages[0]?.text ?? "", /Spec: 2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: sucesso/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: spec-close-and-version/u);
  assert.match(sentMessages[0]?.text ?? "", /Proxima acao:/u);
});

test("envia milestone de triagem /run_specs para chat capturado por callback de /specs", async () => {
  const { controller } = createController({
    eligibleSpecs: [
      {
        fileName: "2026-02-19-approved-spec-triage-run-specs.md",
        specPath: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
      },
    ],
  });
  const sentMessages = mockSendMessage(controller);
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpecsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleSpecsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async () => Promise.resolve(),
    editMessageText: async () => Promise.resolve(),
  });

  await controller.sendRunSpecsTriageMilestone({
    spec: {
      fileName: "2026-02-19-approved-spec-triage-run-specs.md",
      path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
    },
    outcome: "failure",
    finalStage: "spec-close-and-version",
    nextAction: "Rodada /run-all bloqueada. Corrija a falha de fechamento e reexecute /run_specs.",
    details: "falha simulada",
  });

  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[1]?.chatId, "42");
  assert.match(sentMessages[1]?.text ?? "", /Resultado: falha/u);
  assert.match(sentMessages[1]?.text ?? "", /Fase final: spec-close-and-version/u);
  assert.match(sentMessages[1]?.text ?? "", /Detalhes: falha simulada/u);
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
  assert.equal(delivery?.attempts, 1);
  assert.equal(delivery?.maxAttempts, 4);
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

test("reenvia resumo final em falhas transitorias e entrega com metadados de tentativa", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const retryDelaysMs: number[] = [];
  callSetTicketFinalSummaryRetryWait(controller, async (delayMs: number) => {
    retryDelaysMs.push(delayMs);
  });

  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: (chatId: string, text: string, extra?: unknown) => Promise<unknown>;
      };
    };
  };

  let attempts = 0;
  internalController.bot.telegram.sendMessage = async (chatId: string, text: string) => {
    attempts += 1;
    if (attempts === 1) {
      throw createTelegramSendMessageError({
        errorCode: 429,
        description: "Too Many Requests",
        retryAfterSeconds: 3,
      });
    }
    if (attempts === 2) {
      throw createTransportError("EAI_AGAIN");
    }

    return Promise.resolve({ chatId, text, message_id: 100 + attempts });
  };

  const delivery = await controller.sendTicketFinalSummary(createSuccessSummary());

  assert.equal(attempts, 3);
  assert.deepEqual(retryDelaysMs, [3000, 2000]);
  assert.equal(delivery?.destinationChatId, "42");
  assert.equal(delivery?.attempts, 3);
  assert.equal(delivery?.maxAttempts, 4);
  assert.equal(
    logger.warnings.filter(
      (entry) => entry.message === "Falha transitoria ao enviar resumo final de ticket no Telegram",
    ).length,
    2,
  );
});

test("falha nao retentavel encerra envio sem retries adicionais", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const retryDelaysMs: number[] = [];
  callSetTicketFinalSummaryRetryWait(controller, async (delayMs: number) => {
    retryDelaysMs.push(delayMs);
  });

  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: () => Promise<unknown>;
      };
    };
  };

  let attempts = 0;
  internalController.bot.telegram.sendMessage = async () => {
    attempts += 1;
    throw createTelegramSendMessageError({
      errorCode: 400,
      description: "Bad Request",
    });
  };

  let capturedError: unknown;
  try {
    await controller.sendTicketFinalSummary(createSuccessSummary());
    assert.fail("envio deveria falhar em erro nao retentavel");
  } catch (error) {
    capturedError = error;
  }

  assert.equal(attempts, 1);
  assert.deepEqual(retryDelaysMs, []);
  assert.equal((capturedError as Error).name, "TicketNotificationDispatchError");
  const failure = (capturedError as { failure?: Record<string, unknown> }).failure;
  assert.equal(failure?.attempts, 1);
  assert.equal(failure?.maxAttempts, 4);
  assert.equal(failure?.retryable, false);
  assert.equal(failure?.errorClass, "non-retryable");
  assert.equal(failure?.errorCode, "400");
  assert.equal(
    logger.errors.filter(
      (entry) => entry.message === "Falha definitiva ao enviar resumo final de ticket no Telegram",
    ).length,
    1,
  );
});

test("encerra com falha definitiva apos exaurir tentativas retentaveis", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const retryDelaysMs: number[] = [];
  callSetTicketFinalSummaryRetryWait(controller, async (delayMs: number) => {
    retryDelaysMs.push(delayMs);
  });

  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: () => Promise<unknown>;
      };
    };
  };

  let attempts = 0;
  internalController.bot.telegram.sendMessage = async () => {
    attempts += 1;
    throw createTelegramSendMessageError({
      errorCode: 503,
      description: "Service Unavailable",
    });
  };

  let capturedError: unknown;
  try {
    await controller.sendTicketFinalSummary(createFailureSummary());
    assert.fail("envio deveria falhar apos limite de tentativas");
  } catch (error) {
    capturedError = error;
  }

  assert.equal(attempts, 4);
  assert.deepEqual(retryDelaysMs, [1000, 2000, 4000]);
  const failure = (capturedError as { failure?: Record<string, unknown> }).failure;
  assert.equal(failure?.attempts, 4);
  assert.equal(failure?.maxAttempts, 4);
  assert.equal(failure?.retryable, true);
  assert.equal(failure?.errorClass, "telegram-server");
  assert.equal(failure?.errorCode, "503");
  assert.equal(
    logger.warnings.filter(
      (entry) => entry.message === "Falha transitoria ao enviar resumo final de ticket no Telegram",
    ).length,
    3,
  );
  assert.equal(
    logger.errors.filter(
      (entry) => entry.message === "Falha definitiva ao enviar resumo final de ticket no Telegram",
    ).length,
    1,
  );
});

test("status inclui ultimo evento notificado em sucesso com rastreabilidade", () => {
  const { controller } = createController();
  const state: RunnerState = {
    ...createState(),
    isRunning: true,
    capacity: {
      limit: 5,
      used: 2,
    },
    activeSlots: [
      {
        project: {
          name: "alpha-project",
          path: "/home/mapita/projetos/alpha-project",
        },
        kind: "run-all",
        phase: "implement",
        currentTicket: "2026-02-20-alpha.md",
        currentSpec: null,
        isPaused: false,
        startedAt: new Date("2026-02-20T16:00:00.000Z"),
      },
      {
        project: {
          name: "beta-project",
          path: "/home/mapita/projetos/beta-project",
        },
        kind: "run-specs",
        phase: "paused",
        currentTicket: null,
        currentSpec: "2026-02-20-beta.md",
        isPaused: true,
        startedAt: new Date("2026-02-20T16:01:00.000Z"),
      },
    ],
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
  assert.match(reply, /Runners ativos \(global\): 2\/5/u);
  assert.match(reply, /Slots ativos:/u);
  assert.match(reply, /1\. alpha-project \(\/run_all\)/u);
  assert.match(reply, /2\. beta-project \(\/run_specs\)/u);
  assert.match(reply, /Spec atual: nenhuma/u);
  assert.match(reply, /Último evento notificado: 2026-02-19-flow-a\.md \(success\)/u);
  assert.match(reply, /Projeto notificado: codex-flow-runner/u);
  assert.match(reply, /Caminho notificado: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /ExecPlan notificado: execplans\/2026-02-19-flow-a\.md/u);
  assert.match(reply, /Commit\/Push notificado: abc123@origin\/main/u);
  assert.match(reply, /Última falha de notificação: nenhuma/u);
});

test("status inclui falha definitiva de notificacao separada do ultimo evento entregue", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      lastNotifiedEvent: {
        summary: createSuccessSummary(),
        delivery: {
          channel: "telegram",
          destinationChatId: "42",
          deliveredAtUtc: "2026-02-19T15:10:00.000Z",
          attempts: 2,
          maxAttempts: 4,
        },
      },
      lastNotificationFailure: {
        summary: createFailureSummary(),
        failure: {
          channel: "telegram",
          destinationChatId: "42",
          failedAtUtc: "2026-02-19T15:12:00.000Z",
          attempts: 4,
          maxAttempts: 4,
          errorMessage: "Service Unavailable",
          errorCode: "503",
          errorClass: "telegram-server",
          retryable: true,
        },
      },
    }),
  );

  assert.match(reply, /Último evento notificado: 2026-02-19-flow-a\.md \(success\)/u);
  assert.match(reply, /Tentativas até entrega: 2\/4/u);
  assert.match(reply, /Última falha de notificação: 2026-02-19-flow-a\.md \(failure\)/u);
  assert.match(reply, /Falha registrada em: 2026-02-19T15:12:00\.000Z/u);
  assert.match(reply, /Tentativas até falha definitiva: 4\/4/u);
  assert.match(reply, /Classe do erro de notificação: telegram-server/u);
  assert.match(reply, /Código do erro de notificação: 503/u);
  assert.match(reply, /Retentável: sim/u);
});

test("status renderiza slot de execucao unitaria com comando /run_ticket", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      isRunning: true,
      capacity: {
        limit: 5,
        used: 1,
      },
      activeSlots: [
        {
          project: cloneProject(defaultActiveProject),
          kind: "run-ticket",
          phase: "implement",
          currentTicket: "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md",
          currentSpec: null,
          isPaused: false,
          startedAt: new Date("2026-02-23T16:45:00.000Z"),
        },
      ],
    }),
  );

  assert.match(reply, /Slots ativos:/u);
  assert.match(reply, /\/run_ticket/u);
});

test("status inclui bloco detalhado de /codex_chat quando sessao esta ativa (CA-06)", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      codexChatSession: createCodexChatSession({
        phase: "waiting-codex",
        startedAt: new Date("2026-02-21T10:00:00.000Z"),
        lastActivityAt: new Date("2026-02-21T10:03:00.000Z"),
        waitingCodexSinceAt: new Date("2026-02-21T10:02:00.000Z"),
        userInactivitySinceAt: null,
        lastCodexActivityAt: new Date("2026-02-21T10:02:30.000Z"),
        lastCodexStream: "stdout",
        lastCodexPreview: "resposta parcial do codex",
      }),
    }),
  );

  assert.match(reply, /Sessão \/codex_chat: ativa/u);
  assert.match(reply, /Fase \/codex_chat: waiting-codex/u);
  assert.match(reply, /Projeto da sessão \/codex_chat: codex-flow-runner/u);
  assert.match(reply, /Caminho do projeto da sessão \/codex_chat: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /Início da sessão \/codex_chat: 2026-02-21T10:00:00\.000Z/u);
  assert.match(reply, /Última atividade \/codex_chat: 2026-02-21T10:03:00\.000Z/u);
  assert.match(reply, /Aguardando Codex \/codex_chat: sim/u);
  assert.match(reply, /Inatividade do operador \/codex_chat: pausada/u);
  assert.match(
    reply,
    /Inatividade do operador \/codex_chat pausada durante processamento do Codex\./u,
  );
  assert.match(reply, /Aguardando Codex \/codex_chat desde: 2026-02-21T10:02:00\.000Z/u);
  assert.match(reply, /Último stream Codex \/codex_chat: stdout/u);
  assert.match(reply, /Preview da última saída Codex \/codex_chat: resposta parcial do codex/u);
});

test("status explicita janela ativa de inatividade do operador em /codex_chat", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      codexChatSession: createCodexChatSession({
        phase: "waiting-user",
        userInactivitySinceAt: new Date("2026-02-21T10:04:00.000Z"),
      }),
    }),
  );

  assert.match(reply, /Inatividade do operador \/codex_chat: ativa/u);
  assert.match(
    reply,
    /Inatividade do operador \/codex_chat desde: 2026-02-21T10:04:00\.000Z/u,
  );
});

test("status inclui ultimo encerramento de /codex_chat quando sessao esta inativa (CA-07)", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      codexChatSession: null,
      lastCodexChatSessionClosure: {
        reason: "command-handoff",
        closedAt: new Date("2026-02-21T10:05:00.000Z"),
        chatId: "42",
        sessionId: 12,
        phase: "waiting-user",
        message: "Sessao /codex_chat cancelada.",
        activeProjectSnapshot: cloneProject(defaultActiveProject),
        triggeringCommand: "run_all",
      },
    }),
  );

  assert.match(reply, /Sessão \/codex_chat: inativa/u);
  assert.match(reply, /Último encerramento \/codex_chat: troca de comando em 2026-02-21T10:05:00\.000Z/u);
  assert.match(reply, /Fase no encerramento \/codex_chat: waiting-user/u);
  assert.match(reply, /Projeto no encerramento \/codex_chat: codex-flow-runner/u);
  assert.match(reply, /Comando que encerrou \/codex_chat: \/run_all/u);
});

test("status informa ausencia de evento notificado", () => {
  const { controller } = createController();

  const reply = callBuildStatusReply(controller, createState({ activeProject: defaultActiveProject }));

  assert.match(reply, /Projeto ativo: codex-flow-runner/u);
  assert.match(reply, /Caminho do projeto ativo: \/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(reply, /Runners ativos \(global\): 0\/5/u);
  assert.match(reply, /Slots ativos: nenhum/u);
  assert.match(reply, /Spec atual: nenhuma/u);
  assert.match(reply, /Último evento notificado: nenhum/u);
  assert.match(reply, /Última falha de notificação: nenhuma/u);
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
