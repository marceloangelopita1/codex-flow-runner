import { promises as fs } from "node:fs";
import path from "node:path";
import { AppEnv } from "../config/env.js";
import { ProjectRef } from "../types/project.js";
import {
  CodexChatSessionClosureReason,
  CodexChatSessionPhase,
  DiscoverSpecSessionPhase,
  PlanSpecSessionPhase,
  RunnerSlotKind,
  RunnerState,
  createInitialState,
} from "../types/state.js";
import {
  createDefaultDiscoverSpecCategoryCoverageRecord,
  createDiscoverSpecCategoryCoverageRecord,
  DiscoverSpecCategoryCoverageRecord,
  DiscoverSpecPendingItem,
  getDiscoverSpecCategoryLabel,
  listDiscoverSpecCategoryCoverage,
} from "../types/discover-spec.js";
import {
  TicketFinalStage,
  TicketFinalSummary,
  TicketTimingSnapshot,
  isTicketNotificationDispatchError,
  TicketNotificationDelivery,
  TicketNotificationFailure,
} from "../types/ticket-final-summary.js";
import {
  FlowTimingSnapshot,
  RunAllCompletionReason,
  RunAllFinalStage,
  RunAllFlowSummary,
  RunAllTimingStage,
  RunnerFlowSummary,
  RunSpecsFlowCompletionReason,
  RunSpecsFlowFinalStage,
  RunSpecsFlowSummary,
  RunSpecsFlowTimingStage,
  RunSpecsTicketValidationSummary,
  RunSpecsTriageFinalStage,
  RunSpecsTriageTimingStage,
} from "../types/flow-timing.js";
import { Logger } from "./logger.js";
import {
  CodexAuthenticationError,
  CodexChatSession,
  CodexChatSessionCloseResult,
  CodexStageDiagnostics,
  CodexChatSessionError,
  CodexChatSessionEvent,
  CodexDiscoverSpecSessionError,
  CodexPlanSessionError,
  CodexStageResult,
  CodexStageExecutionError,
  CodexTicketFlowClient,
  DiscoverSpecSession,
  DiscoverSpecSessionCloseResult,
  DiscoverSpecSessionEvent,
  PlanSpecSession,
  PlanSpecSessionCloseResult,
  PlanSpecSessionEvent,
  SpecFlowStage,
  SpecPlanningSourceCommand,
  SpecRef,
  SpecTicketValidationSessionTurnResult,
  TicketFlowStage,
  isTicketFlowStage,
} from "../integrations/codex-client.js";
import {
  CodexPreferencesService,
} from "./codex-preferences.js";
import {
  FileSystemSpecPlanningTraceStore,
  SpecPlanningTraceSession,
  SpecPlanningTraceStore,
} from "../integrations/spec-planning-trace-store.js";
import {
  FileSystemWorkflowTraceStore,
  WorkflowTraceSourceCommand,
  WorkflowTraceStage,
  WorkflowTraceStore,
} from "../integrations/workflow-trace-store.js";
import {
  GitSyncEvidence,
  GitSyncValidationError,
  GitVersioning,
} from "../integrations/git-client.js";
import { PlanSpecFinalActionId, PlanSpecFinalBlock } from "../integrations/plan-spec-parser.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
import {
  CodexFlowPreferencesSnapshot,
  CodexInvocationPreferences,
  CodexModelSelectionResult,
  CodexModelSelectionSnapshot,
  CodexReasoningSelectionResult,
  CodexReasoningSelectionSnapshot,
  CodexResolvedProjectPreferences,
  CodexSpeedSelectionResult,
  CodexSpeedSelectionSnapshot,
} from "../types/codex-preferences.js";
import { runSpecTicketValidation } from "./spec-ticket-validation.js";
import { SpecTicketValidationResult } from "../types/spec-ticket-validation.js";

type TicketFinalSummaryHandler = (
  summary: TicketFinalSummary,
) => Promise<TicketNotificationDelivery | null> | TicketNotificationDelivery | null;

export interface DiscoverSpecEventHandlers {
  onQuestion?: (
    chatId: string,
    event: Extract<DiscoverSpecSessionEvent, { type: "question" }>,
  ) => Promise<void> | void;
  onFinal?: (
    chatId: string,
    event: Extract<DiscoverSpecSessionEvent, { type: "final" }>,
  ) => Promise<void> | void;
  onOutput: (
    chatId: string,
    event: Extract<DiscoverSpecSessionEvent, { type: "raw-sanitized" }>,
  ) => Promise<void> | void;
  onFailure: (chatId: string, details: string) => Promise<void> | void;
  onLifecycleMessage?: (chatId: string, message: string) => Promise<void> | void;
}

export interface PlanSpecEventHandlers {
  onQuestion: (chatId: string, event: Extract<PlanSpecSessionEvent, { type: "question" }>) => Promise<void> | void;
  onFinal: (chatId: string, event: Extract<PlanSpecSessionEvent, { type: "final" }>) => Promise<void> | void;
  onRawOutput: (
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "raw-sanitized" }>,
  ) => Promise<void> | void;
  onFailure: (chatId: string, details: string) => Promise<void> | void;
  onLifecycleMessage?: (chatId: string, message: string) => Promise<void> | void;
}

export interface CodexChatEventHandlers {
  onOutput: (
    chatId: string,
    event: Extract<CodexChatSessionEvent, { type: "raw-sanitized" }>,
  ) => Promise<void> | void;
  onFailure: (chatId: string, details: string) => Promise<void> | void;
  onLifecycleMessage?: (chatId: string, message: string) => Promise<void> | void;
}

export type RunSpecsTriageOutcome = "success" | "failure";

export interface RunSpecsTriageLifecycleEvent {
  spec: SpecRef;
  outcome: RunSpecsTriageOutcome;
  finalStage: RunSpecsTriageFinalStage;
  nextAction: string;
  timing: FlowTimingSnapshot<RunSpecsTriageTimingStage>;
  details?: string;
}

export interface RunSpecsEventHandlers {
  onTriageMilestone: (event: RunSpecsTriageLifecycleEvent) => Promise<void> | void;
}

export interface RunFlowEventHandlers {
  onFlowCompleted: (event: RunnerFlowSummary) => Promise<void> | void;
}

export interface TicketRunnerOptions {
  discoverSpecSessionTimeoutMs?: number;
  planSpecSessionTimeoutMs?: number;
  codexChatSessionTimeoutMs?: number;
  codexChatOutputFlushDelayMs?: number;
  now?: () => Date;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  specPlanningTraceStoreFactory?: (projectPath: string) => SpecPlanningTraceStore;
  workflowTraceStoreFactory?: (projectPath: string) => WorkflowTraceStore;
  discoverSpecEventHandlers?: DiscoverSpecEventHandlers;
  planSpecEventHandlers?: PlanSpecEventHandlers;
  codexChatEventHandlers?: CodexChatEventHandlers;
  runSpecsEventHandlers?: RunSpecsEventHandlers;
  runFlowEventHandlers?: RunFlowEventHandlers;
  codexPreferencesService?: CodexPreferencesService;
}

interface ActiveDiscoverSpecSession {
  id: number;
  chatId: string;
  project: ProjectRef;
  slotKey: string;
  codexClient: CodexTicketFlowClient;
  session: DiscoverSpecSession;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  heartbeatHandle: ReturnType<typeof setTimeout> | null;
  latestFinalBlock: PlanSpecFinalBlock | null;
  lastCodexActivityLogAt: Date | null;
  lastHeartbeatLifecycleMessageAt: Date | null;
  lastRawOutputForwardAt: Date | null;
  suppressedRawOutputCount: number;
}

interface ActivePlanSpecSession {
  id: number;
  chatId: string;
  project: ProjectRef;
  slotKey: string;
  codexClient: CodexTicketFlowClient;
  session: PlanSpecSession;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  heartbeatHandle: ReturnType<typeof setTimeout> | null;
  latestFinalBlock: PlanSpecFinalBlock | null;
  lastCodexActivityLogAt: Date | null;
  lastHeartbeatLifecycleMessageAt: Date | null;
  lastRawOutputForwardAt: Date | null;
  suppressedRawOutputCount: number;
}

interface ActiveCodexChatSession {
  id: number;
  chatId: string;
  project: ProjectRef;
  slotKey: string;
  codexClient: CodexTicketFlowClient;
  session: CodexChatSession;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  outputFlushHandle: ReturnType<typeof setTimeout> | null;
  turnCompletionFlushArmed: boolean;
  pendingOutputText: string;
  pendingOutputChunks: number;
  lastCodexActivityLogAt: Date | null;
  suppressedCodexActivityCount: number;
  suppressedCodexActivityBytes: number;
}

interface ActiveRunnerSlot {
  key: string;
  kind: RunnerSlotKind;
  project: ProjectRef;
  queue: TicketQueue;
  codexClient: CodexTicketFlowClient;
  codexPreferencesSnapshot: CodexFlowPreferencesSnapshot | null;
  gitVersioning: GitVersioning;
  isStarting: boolean;
  isRunning: boolean;
  isPaused: boolean;
  currentTicket: string | null;
  currentSpec: string | null;
  phase: RunnerState["phase"];
  startedAt: Date;
  loopPromise: Promise<void> | null;
}

interface FlowTimingCollector<Stage extends string> {
  startedAtMs: number;
  startedAtUtc: string;
  durationsByStageMs: Partial<Record<Stage, number>>;
  completedStages: Stage[];
  interruptedStage: Stage | null;
}

interface WorkflowTraceSuccessRequest {
  kind: "ticket" | "spec";
  stage: WorkflowTraceStage;
  targetName: string;
  targetPath: string;
  promptTemplatePath: string;
  promptText: string;
  outputText: string;
  diagnostics?: CodexStageDiagnostics;
  summary: string;
  metadata?: Record<string, unknown>;
  decisionStatus?: "success" | "failure";
  decisionErrorMessage?: string;
}

interface WorkflowTraceFailureRequest {
  kind: "ticket" | "spec";
  stage: WorkflowTraceStage;
  targetName: string;
  targetPath: string;
  error: unknown;
  summary?: string;
  metadata?: Record<string, unknown>;
}

interface TicketProcessingResult {
  succeeded: boolean;
  finalSummary: TicketFinalSummary | null;
}

type SpecTicketValidationTicketSource = "source-spec" | "spec-related";

interface SpecTicketValidationTicketSnapshot {
  fileName: string;
  relativePath: string;
  absolutePath: string;
  content: string;
  source: SpecTicketValidationTicketSource;
}

interface SpecTicketValidationPackageContext {
  specContent: string;
  packageContext: string;
  tickets: SpecTicketValidationTicketSnapshot[];
  lineageSource: "source-spec" | "spec-related" | "hybrid";
}

class RunnerSpecTicketValidationStageError extends Error {
  readonly stage = "spec-ticket-validation";

  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RunnerSpecTicketValidationStageError";
  }
}

type PlanSpecSessionChatRejectedResult =
  | {
      status: "inactive";
      message: string;
    }
  | {
      status: "ignored-chat";
      message: string;
    };

type CodexChatSessionChatRejectedResult =
  | {
      status: "inactive";
      message: string;
    }
  | {
      status: "ignored-chat";
      message: string;
    };

type DiscoverSpecSessionChatRejectedResult =
  | {
      status: "inactive";
      message: string;
    }
  | {
      status: "ignored-chat";
      message: string;
    };

interface TicketLineageMetadata {
  status: string | null;
  parentTicketPath: string | null;
  closureReason: string | null;
}

interface TicketNoGoRecoveryContext {
  rootTicketName: string;
  splitFollowUpRecoveries: number;
  lineageDepth: number;
  ancestryCycleDetected: boolean;
}

type SelectedTicketValidationResult =
  | {
      status: "valid";
      ticketFileName: string;
    }
  | {
      status: "invalid";
      message: string;
    };

type SelectedTicketResolutionResult =
  | {
      status: "resolved";
      ticket: TicketRef;
    }
  | {
      status: "not-found";
      message: string;
    };

interface ResolvedTicketContent {
  path: string;
  content: string;
}

const RUNNER_SLOT_LIMIT = 5;
const DISCOVER_SPEC_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const PLAN_SPEC_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const CODEX_CHAT_SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_NO_GO_RECOVERIES_PER_TICKET = 3;
const MAX_TICKET_PARENT_CHAIN_DEPTH = 100;
const DISCOVER_SPEC_INACTIVE_MESSAGE = "Nenhuma sessão /discover_spec ativa no momento.";
const DISCOVER_SPEC_CHAT_MISMATCH_MESSAGE =
  "Sessão /discover_spec em andamento em outro chat. Use o chat que iniciou a sessão.";
const DISCOVER_SPEC_TIMEOUT_MESSAGE =
  "Sessao /discover_spec encerrada por inatividade de 30 minutos.";
const DISCOVER_SPEC_CANCELLED_MESSAGE = "Sessao /discover_spec cancelada.";
const PLAN_SPEC_INACTIVE_MESSAGE = "Nenhuma sessão /plan_spec ativa no momento.";
const PLAN_SPEC_CHAT_MISMATCH_MESSAGE =
  "Sessão /plan_spec em andamento em outro chat. Use o chat que iniciou a sessão.";
const PLAN_SPEC_TIMEOUT_MESSAGE =
  "Sessao /plan_spec encerrada por inatividade de 30 minutos.";
const PLAN_SPEC_CANCELLED_MESSAGE = "Sessao /plan_spec cancelada.";
const CODEX_CHAT_INACTIVE_MESSAGE = "Nenhuma sessão /codex_chat ativa no momento.";
const CODEX_CHAT_CHAT_MISMATCH_MESSAGE =
  "Sessão /codex_chat em andamento em outro chat. Use o chat que iniciou a sessão.";
const CODEX_CHAT_TIMEOUT_MESSAGE =
  "Sessao /codex_chat encerrada por inatividade de 10 minutos.";
const CODEX_CHAT_CANCELLED_MESSAGE = "Sessao /codex_chat cancelada.";
const PLAN_SPEC_WAITING_CODEX_HEARTBEAT_MS = 30 * 1000;
const PLAN_SPEC_WAITING_CODEX_LIFECYCLE_NOTIFY_EVERY_MS = 2 * 60 * 1000;
const PLAN_SPEC_CODEX_ACTIVITY_LOG_INTERVAL_MS = 10 * 1000;
const PLAN_SPEC_RAW_OUTPUT_FORWARD_MIN_INTERVAL_MS = 2 * 1000;
const CODEX_CHAT_OUTPUT_FLUSH_DELAY_MS = 1200;
const CODEX_CHAT_CODEX_ACTIVITY_LOG_INTERVAL_MS = 10 * 1000;
const TICKET_FILE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/u;
const TICKET_STATUS_METADATA_PATTERN = /^\s*-\s*Status\s*:\s*(.+?)\s*$/imu;
const TICKET_PARENT_METADATA_PATTERN =
  /^\s*-\s*Parent ticket(?:\s*\(optional\))?\s*:\s*(.+?)\s*$/imu;
const TICKET_CLOSURE_REASON_METADATA_PATTERN = /^\s*-\s*Closure reason\s*:\s*(.+?)\s*$/imu;
const TICKET_SOURCE_SPEC_METADATA_PATTERN =
  /^\s*-\s*Source spec(?:\s*\(when applicable\))?\s*:\s*(.+?)\s*$/imu;
const SPEC_RELATED_TICKETS_BLOCK_PATTERN =
  /^\s*-\s*Related tickets\s*:\s*\n((?:^\s{2,}-\s*.+\n?)*)/imu;
const TOP_LEVEL_SECTION_HEADING_PATTERN = /^##\s+/mu;

export interface RunnerRoundDependencies {
  activeProject: ProjectRef;
  queue: TicketQueue;
  codexClient: CodexTicketFlowClient;
  gitVersioning: GitVersioning;
}

export type RunnerRoundDependenciesResolver = () => Promise<RunnerRoundDependencies>;

type RunnerRequestBlockedReason =
  | "codex-auth-missing"
  | "active-project-unavailable"
  | "global-free-text-busy"
  | "project-slot-busy"
  | "runner-capacity-maxed"
  | "codex-preferences-unavailable"
  | "shutdown-in-progress";

type RunnerRequestBlockedResult = {
  status: "blocked";
  reason: RunnerRequestBlockedReason;
  message: string;
  activeProjects?: ProjectRef[];
};

export type RunAllRequestResult =
  | { status: "started" }
  | { status: "already-running" }
  | RunnerRequestBlockedResult;

export type RunSpecsRequestResult =
  | { status: "started" }
  | { status: "already-running" }
  | RunnerRequestBlockedResult;

export type RunSelectedTicketRequestResult =
  | { status: "started" }
  | RunnerRequestBlockedResult
  | {
      status: "ticket-nao-encontrado";
      message: string;
    }
  | {
      status: "ticket-invalido";
      message: string;
    };

type RunSlotPreflightSource = "run-all" | "run-specs" | "run-ticket";

type RunSlotStartPreflightResult =
  | {
      slot: ActiveRunnerSlot;
    }
  | RunnerRequestBlockedResult;

export type SyncActiveProjectResult =
  | { status: "updated" }
  | { status: "blocked-discover-spec" }
  | { status: "blocked-plan-spec" };

export type RunnerProjectControlAction = "pause" | "resume";

export type RunnerProjectControlResult =
  | {
      status: "applied";
      action: RunnerProjectControlAction;
      project: ProjectRef;
      isPaused: boolean;
    }
  | {
      status: "ignored";
      action: RunnerProjectControlAction;
      reason: "active-project-unavailable" | "project-slot-inactive";
      project: ProjectRef | null;
    };

export type PlanSpecSessionStartResult =
  | { status: "started"; message: string }
  | { status: "already-active"; message: string }
  | { status: "blocked-running"; message: string }
  | {
      status: "blocked";
      reason:
        | "active-project-unavailable"
        | "codex-auth-missing"
        | "global-free-text-busy"
        | "project-slot-busy"
        | "runner-capacity-maxed"
        | "codex-preferences-unavailable"
        | "shutdown-in-progress";
      message: string;
      activeProjects?: ProjectRef[];
    }
  | { status: "failed"; message: string };

export type DiscoverSpecSessionStartResult =
  | { status: "started"; message: string }
  | { status: "already-active"; message: string }
  | {
      status: "blocked";
      reason:
        | "active-project-unavailable"
        | "codex-auth-missing"
        | "global-free-text-busy"
        | "project-slot-busy"
        | "runner-capacity-maxed"
        | "codex-preferences-unavailable"
        | "shutdown-in-progress";
      message: string;
      activeProjects?: ProjectRef[];
    }
  | { status: "failed"; message: string };

export type DiscoverSpecSessionInputResult =
  | { status: "accepted"; message: string }
  | { status: "ignored-empty"; message: string }
  | DiscoverSpecSessionChatRejectedResult;

export type DiscoverSpecSessionCancelResult =
  | { status: "cancelled"; message: string }
  | DiscoverSpecSessionChatRejectedResult;

export type PlanSpecSessionInputResult =
  | { status: "accepted"; message: string }
  | { status: "ignored-empty"; message: string }
  | PlanSpecSessionChatRejectedResult;

export type PlanSpecSessionCancelResult =
  | { status: "cancelled"; message: string }
  | PlanSpecSessionChatRejectedResult;

export type CodexChatSessionStartResult =
  | { status: "started"; message: string }
  | { status: "already-active"; message: string }
  | {
      status: "blocked";
      reason:
        | "global-free-text-busy"
        | "active-project-unavailable"
        | "codex-auth-missing"
        | "project-slot-busy"
        | "runner-capacity-maxed"
        | "codex-preferences-unavailable"
        | "shutdown-in-progress";
      message: string;
      activeProjects?: ProjectRef[];
    }
  | { status: "failed"; message: string };

export type CodexChatSessionInputResult =
  | { status: "accepted"; message: string }
  | { status: "ignored-empty"; message: string }
  | CodexChatSessionChatRejectedResult;

export type CodexChatSessionCancelResult =
  | { status: "cancelled"; message: string }
  | CodexChatSessionChatRejectedResult;

export type CodexChatSessionCancelReason = "manual" | "command-handoff";

export interface CodexChatSessionCancelOptions {
  reason?: CodexChatSessionCancelReason;
  triggeringCommand?: string;
}

export type PlanSpecCallbackIgnoredReason =
  | "inactive-session"
  | "concurrency"
  | "ineligible"
  | "invalid-action";

export type PlanSpecCallbackResult =
  | { status: "accepted" }
  | {
      status: "ignored";
      reason: PlanSpecCallbackIgnoredReason;
      message: string;
    };

interface ShutdownDrainTask {
  name: string;
  promise: Promise<void>;
}

export interface RunnerShutdownOptions {
  timeoutMs?: number;
}

export interface RunnerShutdownReport {
  timeoutMs: number;
  durationMs: number;
  timedOut: boolean;
  drainedTasks: string[];
  pendingTasks: string[];
}

export class TicketRunner {
  private readonly state: RunnerState;
  private readonly activeSlots = new Map<string, ActiveRunnerSlot>();
  private readonly initialRoundDependencies: RunnerRoundDependencies;
  private startRequestsInFlight = 0;
  private readonly now: () => Date;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private readonly discoverSpecSessionTimeoutMs: number;
  private readonly planSpecSessionTimeoutMs: number;
  private readonly codexChatSessionTimeoutMs: number;
  private readonly codexChatOutputFlushDelayMs: number;
  private readonly specPlanningTraceStoreFactory: (projectPath: string) => SpecPlanningTraceStore;
  private readonly workflowTraceStoreFactory: (projectPath: string) => WorkflowTraceStore;
  private readonly discoverSpecEventHandlers?: DiscoverSpecEventHandlers;
  private readonly planSpecEventHandlers?: PlanSpecEventHandlers;
  private readonly codexChatEventHandlers?: CodexChatEventHandlers;
  private readonly runSpecsEventHandlers?: RunSpecsEventHandlers;
  private readonly runFlowEventHandlers?: RunFlowEventHandlers;
  private readonly codexPreferencesService?: CodexPreferencesService;
  private activeDiscoverSpecSession: ActiveDiscoverSpecSession | null = null;
  private activePlanSpecSession: ActivePlanSpecSession | null = null;
  private activeCodexChatSession: ActiveCodexChatSession | null = null;
  private nextDiscoverSpecSessionId = 1;
  private nextPlanSpecSessionId = 1;
  private nextCodexChatSessionId = 1;
  private isShuttingDown = false;
  private shutdownPromise: Promise<RunnerShutdownReport> | null = null;
  private completedShutdownReport: RunnerShutdownReport | null = null;

  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
    initialRoundDependencies: RunnerRoundDependencies,
    private readonly resolveRoundDependencies: RunnerRoundDependenciesResolver,
    private readonly onTicketFinalized?: TicketFinalSummaryHandler,
    options: TicketRunnerOptions = {},
  ) {
    this.initialRoundDependencies = {
      activeProject: { ...initialRoundDependencies.activeProject },
      queue: initialRoundDependencies.queue,
      codexClient: initialRoundDependencies.codexClient,
      gitVersioning: initialRoundDependencies.gitVersioning,
    };
    this.state = createInitialState(initialRoundDependencies.activeProject, RUNNER_SLOT_LIMIT);
    this.now = options.now ?? (() => new Date());
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.discoverSpecSessionTimeoutMs =
      options.discoverSpecSessionTimeoutMs ?? DISCOVER_SPEC_SESSION_TIMEOUT_MS;
    this.planSpecSessionTimeoutMs =
      options.planSpecSessionTimeoutMs ?? PLAN_SPEC_SESSION_TIMEOUT_MS;
    this.codexChatSessionTimeoutMs =
      options.codexChatSessionTimeoutMs ?? CODEX_CHAT_SESSION_TIMEOUT_MS;
    this.codexChatOutputFlushDelayMs =
      options.codexChatOutputFlushDelayMs ?? CODEX_CHAT_OUTPUT_FLUSH_DELAY_MS;
    this.specPlanningTraceStoreFactory =
      options.specPlanningTraceStoreFactory ??
      ((projectPath: string) => new FileSystemSpecPlanningTraceStore(projectPath));
    this.workflowTraceStoreFactory =
      options.workflowTraceStoreFactory ??
      ((projectPath: string) => new FileSystemWorkflowTraceStore(projectPath));
    this.discoverSpecEventHandlers = options.discoverSpecEventHandlers;
    this.planSpecEventHandlers = options.planSpecEventHandlers;
    this.codexChatEventHandlers = options.codexChatEventHandlers;
    this.runSpecsEventHandlers = options.runSpecsEventHandlers;
    this.runFlowEventHandlers = options.runFlowEventHandlers;
    this.codexPreferencesService = options.codexPreferencesService;
    this.state.updatedAt = this.now();
    this.syncStateFromSlots();
  }

  getState = (): RunnerState => ({
    ...this.state,
    capacity: { ...this.state.capacity },
    activeSlots: this.state.activeSlots.map((slot) => ({
      ...slot,
      project: { ...slot.project },
      startedAt: new Date(slot.startedAt),
    })),
    ...(this.state.activeProject
      ? {
          activeProject: { ...this.state.activeProject },
        }
      : {}),
    ...(this.state.discoverSpecSession
      ? {
          discoverSpecSession: {
            ...this.state.discoverSpecSession,
            activeProjectSnapshot: { ...this.state.discoverSpecSession.activeProjectSnapshot },
            categoryCoverage: Object.fromEntries(
              Object.entries(this.state.discoverSpecSession.categoryCoverage).map(([key, value]) => [
                key,
                { ...value },
              ]),
            ) as DiscoverSpecCategoryCoverageRecord,
            pendingItems: this.state.discoverSpecSession.pendingItems.map((item) => ({ ...item })),
            latestFinalBlock: this.state.discoverSpecSession.latestFinalBlock
              ? this.clonePlanSpecFinalBlock(this.state.discoverSpecSession.latestFinalBlock)
              : null,
            startedAt: new Date(this.state.discoverSpecSession.startedAt),
            lastActivityAt: new Date(this.state.discoverSpecSession.lastActivityAt),
            ...(this.state.discoverSpecSession.waitingCodexSinceAt
              ? {
                  waitingCodexSinceAt: new Date(this.state.discoverSpecSession.waitingCodexSinceAt),
                }
              : {}),
            ...(this.state.discoverSpecSession.lastCodexActivityAt
              ? {
                  lastCodexActivityAt: new Date(this.state.discoverSpecSession.lastCodexActivityAt),
                }
              : {}),
            ...(this.state.discoverSpecSession.observedAt
              ? {
                  observedAt: new Date(this.state.discoverSpecSession.observedAt),
                }
              : {}),
          },
        }
      : {}),
    ...(this.state.planSpecSession
      ? {
          planSpecSession: {
            ...this.state.planSpecSession,
            activeProjectSnapshot: { ...this.state.planSpecSession.activeProjectSnapshot },
            startedAt: new Date(this.state.planSpecSession.startedAt),
            lastActivityAt: new Date(this.state.planSpecSession.lastActivityAt),
            ...(this.state.planSpecSession.waitingCodexSinceAt
              ? {
                  waitingCodexSinceAt: new Date(this.state.planSpecSession.waitingCodexSinceAt),
                }
              : {}),
            ...(this.state.planSpecSession.lastCodexActivityAt
              ? {
                  lastCodexActivityAt: new Date(this.state.planSpecSession.lastCodexActivityAt),
                }
              : {}),
            ...(this.state.planSpecSession.observedAt
              ? {
                  observedAt: new Date(this.state.planSpecSession.observedAt),
                }
              : {}),
          },
        }
      : {}),
    ...(this.state.codexChatSession
      ? {
          codexChatSession: {
            ...this.state.codexChatSession,
            activeProjectSnapshot: { ...this.state.codexChatSession.activeProjectSnapshot },
            startedAt: new Date(this.state.codexChatSession.startedAt),
            lastActivityAt: new Date(this.state.codexChatSession.lastActivityAt),
            ...(this.state.codexChatSession.waitingCodexSinceAt
              ? {
                  waitingCodexSinceAt: new Date(this.state.codexChatSession.waitingCodexSinceAt),
                }
              : {}),
            ...(this.state.codexChatSession.userInactivitySinceAt
              ? {
                  userInactivitySinceAt: new Date(
                    this.state.codexChatSession.userInactivitySinceAt,
                  ),
                }
              : {}),
            ...(this.state.codexChatSession.lastCodexActivityAt
              ? {
                  lastCodexActivityAt: new Date(this.state.codexChatSession.lastCodexActivityAt),
                }
              : {}),
            ...(this.state.codexChatSession.observedAt
              ? {
                  observedAt: new Date(this.state.codexChatSession.observedAt),
                }
              : {}),
          },
        }
      : {}),
    ...(this.state.lastCodexChatSessionClosure
      ? {
          lastCodexChatSessionClosure: {
            ...this.state.lastCodexChatSessionClosure,
            closedAt: new Date(this.state.lastCodexChatSessionClosure.closedAt),
            activeProjectSnapshot: {
              ...this.state.lastCodexChatSessionClosure.activeProjectSnapshot,
            },
          },
        }
      : {}),
    ...(this.state.lastNotifiedEvent
      ? {
          lastNotifiedEvent: {
            summary: this.cloneTicketFinalSummary(this.state.lastNotifiedEvent.summary),
            delivery: { ...this.state.lastNotifiedEvent.delivery },
          },
        }
      : {}),
    ...(this.state.lastNotificationFailure
      ? {
          lastNotificationFailure: {
            summary: this.cloneTicketFinalSummary(this.state.lastNotificationFailure.summary),
            failure: { ...this.state.lastNotificationFailure.failure },
          },
        }
      : {}),
    ...(this.state.lastRunFlowSummary
      ? {
          lastRunFlowSummary: this.cloneRunnerFlowSummary(this.state.lastRunFlowSummary),
        }
      : {}),
  });

  requestPause = (): RunnerProjectControlResult => this.requestProjectControl("pause");

  requestResume = (): RunnerProjectControlResult => this.requestProjectControl("resume");

  resolveCodexProjectPreferences = async (
    project: ProjectRef,
  ): Promise<CodexResolvedProjectPreferences> => {
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.resolveProjectPreferences(project);
  };

  listActiveProjectCodexModels = async (): Promise<CodexModelSelectionSnapshot> => {
    const activeProject = this.requireActiveProjectForCodexPreferences("listar modelos");
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.listModels(activeProject);
  };

  selectActiveProjectCodexModel = async (model: string): Promise<CodexModelSelectionResult> => {
    const activeProject = this.requireActiveProjectForCodexPreferences("selecionar modelo");
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.selectModel(activeProject, model);
  };

  listActiveProjectCodexReasoning = async (): Promise<CodexReasoningSelectionSnapshot> => {
    const activeProject = this.requireActiveProjectForCodexPreferences("listar reasoning");
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.listReasoning(activeProject);
  };

  selectActiveProjectCodexReasoning = async (
    effort: string,
  ): Promise<CodexReasoningSelectionResult> => {
    const activeProject = this.requireActiveProjectForCodexPreferences("selecionar reasoning");
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.selectReasoning(activeProject, effort);
  };

  listActiveProjectCodexSpeed = async (): Promise<CodexSpeedSelectionSnapshot> => {
    const activeProject = this.requireActiveProjectForCodexPreferences("listar velocidade");
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.listSpeed(activeProject);
  };

  selectActiveProjectCodexSpeed = async (
    speed: string,
  ): Promise<CodexSpeedSelectionResult> => {
    const activeProject = this.requireActiveProjectForCodexPreferences("selecionar velocidade");
    if (!this.codexPreferencesService) {
      throw new Error("Servico de preferencias do Codex nao configurado no runner.");
    }

    return this.codexPreferencesService.selectSpeed(activeProject, speed);
  };

  syncActiveProject = (project: ProjectRef): SyncActiveProjectResult => {
    if (this.isDiscoverSpecSessionActive()) {
      return { status: "blocked-discover-spec" };
    }

    if (this.isPlanSpecSessionActive()) {
      return { status: "blocked-plan-spec" };
    }

    this.state.activeProject = { ...project };
    this.syncStateFromSlots();
    this.state.lastMessage = `Projeto ativo atualizado para ${project.name} via Telegram`;
    this.state.updatedAt = this.now();

    this.logger.info("Projeto ativo sincronizado manualmente no estado do runner", {
      activeProjectName: project.name,
      activeProjectPath: project.path,
      phase: this.state.phase,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
    });

    return { status: "updated" };
  };

  private requireActiveProjectForCodexPreferences(action: string): ProjectRef {
    if (!this.state.activeProject) {
      throw new Error(`Projeto ativo indisponivel para ${action} do Codex.`);
    }

    return { ...this.state.activeProject };
  }

  startDiscoverSpecSession = async (
    chatId: string,
  ): Promise<DiscoverSpecSessionStartResult> => {
    this.logger.info("Solicitacao de inicio de sessao /discover_spec recebida", {
      chatId,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/discover_spec");
    }

    if (this.isDiscoverSpecSessionActive()) {
      return {
        status: "already-active",
        message: "Ja existe uma sessao /discover_spec em andamento nesta instancia.",
      };
    }

    const globalFreeTextBusy = this.buildGlobalFreeTextBusyResult("/discover_spec");
    if (globalFreeTextBusy) {
      return globalFreeTextBusy;
    }

    let roundDependencies: RunnerRoundDependencies;
    try {
      roundDependencies = await this.resolveRoundDependencies();
      this.state.activeProject = { ...roundDependencies.activeProject };
      this.syncStateFromSlots();
    } catch (error) {
      const message = this.buildActiveProjectResolutionErrorMessage(error, "discover-spec");
      this.touch("error", message);
      this.logger.error("Falha ao resolver projeto ativo para iniciar /discover_spec", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/discover_spec");
    }

    const globalFreeTextBusyAfterResolution = this.buildGlobalFreeTextBusyResult("/discover_spec");
    if (globalFreeTextBusyAfterResolution) {
      return globalFreeTextBusyAfterResolution;
    }

    const reservation = this.reserveSlot(roundDependencies, "discover-spec");
    if (reservation.status === "blocked") {
      return {
        status: "blocked",
        reason: reservation.reason,
        message: reservation.message,
        ...(reservation.activeProjects ? { activeProjects: reservation.activeProjects } : {}),
      };
    }

    const slot = reservation.slot;
    try {
      await slot.codexClient.ensureAuthenticated();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message =
        error instanceof CodexAuthenticationError
          ? error.message
          : [
              "Falha ao validar autenticacao do Codex CLI.",
              "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
            ].join(" ");
      this.touch("error", message);
      this.logger.error("Falha de autenticacao do Codex CLI ao iniciar /discover_spec", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    try {
      await slot.codexClient.snapshotInvocationPreferences();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message = this.buildCodexPreferencesResolutionErrorMessage(slot.project, error);
      this.touch("error", message);
      this.logger.error("Falha ao resolver preferencias do Codex ao iniciar /discover_spec", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-preferences-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      this.releaseSlot(slot.key);
      return this.buildShutdownBlockedResult("/discover_spec");
    }

    const sessionId = this.nextDiscoverSpecSessionId;
    this.nextDiscoverSpecSessionId += 1;

    try {
      const session = await slot.codexClient.startDiscoverSession({
        callbacks: {
          onEvent: (event) => {
            void this.handleDiscoverSpecSessionEvent(sessionId, event);
          },
          onFailure: (error) => {
            void this.handleDiscoverSpecSessionFailure(sessionId, error);
          },
          onClose: (result) => {
            void this.handleDiscoverSpecSessionClose(sessionId, result);
          },
        },
      });

      const now = this.now();
      const initialCategoryCoverage = createDefaultDiscoverSpecCategoryCoverageRecord();
      this.state.discoverSpecSession = {
        sessionId,
        chatId,
        phase: "awaiting-brief",
        startedAt: now,
        lastActivityAt: now,
        waitingCodexSinceAt: null,
        lastCodexActivityAt: null,
        lastCodexStream: null,
        lastCodexPreview: null,
        observedModel: null,
        observedReasoningEffort: null,
        observedAt: null,
        activeProjectSnapshot: { ...slot.project },
        categoryCoverage: initialCategoryCoverage,
        pendingItems: this.buildDiscoverSpecCategoryPendingItems(initialCategoryCoverage),
        latestFinalBlock: null,
        createSpecEligible: false,
        createSpecBlockReason: "A descoberta profunda ainda nao chegou a um bloco final elegivel.",
      };
      this.activeDiscoverSpecSession = {
        id: sessionId,
        chatId,
        project: { ...slot.project },
        slotKey: slot.key,
        codexClient: slot.codexClient,
        session,
        timeoutHandle: null,
        heartbeatHandle: null,
        latestFinalBlock: null,
        lastCodexActivityLogAt: null,
        lastHeartbeatLifecycleMessageAt: null,
        lastRawOutputForwardAt: null,
        suppressedRawOutputCount: 0,
      };

      slot.isStarting = false;
      slot.isRunning = true;
      slot.phase = "discover-spec-awaiting-brief";
      this.syncStateFromSlots();

      this.refreshDiscoverSpecTimeout(sessionId);
      this.touchSlot(
        slot,
        "discover-spec-awaiting-brief",
        "Sessao /discover_spec iniciada e aguardando brief inicial",
      );

      return {
        status: "started",
        message: "Sessao /discover_spec iniciada. Envie a proxima mensagem com o brief inicial.",
      };
    } catch (error) {
      this.releaseSlot(slot.key);
      const details = error instanceof Error ? error.message : String(error);
      const message =
        error instanceof CodexDiscoverSpecSessionError
          ? error.message
          : `Falha ao iniciar sessao /discover_spec: ${details}`;
      this.touch("error", message);
      this.logger.error("Falha ao iniciar sessao interativa /discover_spec", {
        error: details,
      });
      await this.emitDiscoverSpecFailure(chatId, message);
      return {
        status: "failed",
        message,
      };
    }
  };

  submitDiscoverSpecInput = async (
    chatId: string,
    input: string,
  ): Promise<DiscoverSpecSessionInputResult> => {
    const session = this.resolveDiscoverSpecSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    const normalizedInput = input.trim();
    if (!normalizedInput) {
      return {
        status: "ignored-empty",
        message: "Mensagem vazia ignorada na sessao /discover_spec.",
      };
    }

    const isInitialBrief = this.state.discoverSpecSession?.phase === "awaiting-brief";
    try {
      const pendingSend = session.session.sendUserInput(normalizedInput);
      this.setDiscoverSpecPhase(
        "waiting-codex",
        "discover-spec-waiting-codex",
        isInitialBrief
          ? "Brief inicial enviado ao Codex na sessao /discover_spec"
          : "Mensagem enviada ao Codex na sessao /discover_spec",
      );

      void pendingSend.catch((error) => {
        void this.handleDiscoverSpecSessionFailure(session.id, error);
      });

      return {
        status: "accepted",
        message: isInitialBrief
          ? "Brief inicial enviado para o Codex."
          : "Mensagem encaminhada para a sessao /discover_spec.",
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      await this.handleDiscoverSpecSessionFailure(session.id, error);
      return {
        status: "inactive",
        message: `Falha ao encaminhar mensagem para a sessao /discover_spec: ${details}`,
      };
    }
  };

  cancelDiscoverSpecSession = async (
    chatId: string,
  ): Promise<DiscoverSpecSessionCancelResult> => {
    const session = this.resolveDiscoverSpecSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    await this.finalizeDiscoverSpecSession(session.id, {
      mode: "cancel",
      phase: "idle",
      message: DISCOVER_SPEC_CANCELLED_MESSAGE,
    });

    return {
      status: "cancelled",
      message: DISCOVER_SPEC_CANCELLED_MESSAGE,
    };
  };

  startPlanSpecSession = async (chatId: string): Promise<PlanSpecSessionStartResult> => {
    this.logger.info("Solicitacao de inicio de sessao /plan_spec recebida", {
      chatId,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/plan_spec");
    }

    if (this.isPlanSpecSessionActive()) {
      return {
        status: "already-active",
        message: "Ja existe uma sessao /plan_spec em andamento nesta instancia.",
      };
    }

    const globalFreeTextBusy = this.buildGlobalFreeTextBusyResult("/plan_spec");
    if (globalFreeTextBusy) {
      return globalFreeTextBusy;
    }

    let roundDependencies: RunnerRoundDependencies;
    try {
      roundDependencies = await this.resolveRoundDependencies();
      this.state.activeProject = { ...roundDependencies.activeProject };
      this.syncStateFromSlots();
    } catch (error) {
      const message = this.buildActiveProjectResolutionErrorMessage(error, "plan-spec");
      this.touch("error", message);
      this.logger.error("Falha ao resolver projeto ativo para iniciar /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/plan_spec");
    }

    const globalFreeTextBusyAfterResolution = this.buildGlobalFreeTextBusyResult("/plan_spec");
    if (globalFreeTextBusyAfterResolution) {
      return globalFreeTextBusyAfterResolution;
    }

    const reservation = this.reserveSlot(roundDependencies, "plan-spec");
    if (reservation.status === "blocked") {
      return {
        status: "blocked",
        reason: reservation.reason,
        message: reservation.message,
        ...(reservation.activeProjects ? { activeProjects: reservation.activeProjects } : {}),
      };
    }

    const slot = reservation.slot;
    try {
      await slot.codexClient.ensureAuthenticated();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message =
        error instanceof CodexAuthenticationError
          ? error.message
          : [
              "Falha ao validar autenticacao do Codex CLI.",
              "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
            ].join(" ");
      this.touch("error", message);
      this.logger.error("Falha de autenticacao do Codex CLI ao iniciar /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    try {
      await slot.codexClient.snapshotInvocationPreferences();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message = this.buildCodexPreferencesResolutionErrorMessage(slot.project, error);
      this.touch("error", message);
      this.logger.error("Falha ao resolver preferencias do Codex ao iniciar /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-preferences-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      this.releaseSlot(slot.key);
      return this.buildShutdownBlockedResult("/plan_spec");
    }

    const sessionId = this.nextPlanSpecSessionId;
    this.nextPlanSpecSessionId += 1;

    try {
      const session = await slot.codexClient.startPlanSession({
        callbacks: {
          onEvent: (event) => {
            void this.handlePlanSpecSessionEvent(sessionId, event);
          },
          onFailure: (error) => {
            void this.handlePlanSpecSessionFailure(sessionId, error);
          },
          onClose: (result) => {
            void this.handlePlanSpecSessionClose(sessionId, result);
          },
        },
      });

      const now = this.now();
      this.state.planSpecSession = {
        sessionId,
        chatId,
        phase: "awaiting-brief",
        startedAt: now,
        lastActivityAt: now,
        waitingCodexSinceAt: null,
        lastCodexActivityAt: null,
        lastCodexStream: null,
        lastCodexPreview: null,
        observedModel: null,
        observedReasoningEffort: null,
        observedAt: null,
        activeProjectSnapshot: { ...slot.project },
      };
      this.activePlanSpecSession = {
        id: sessionId,
        chatId,
        project: { ...slot.project },
        slotKey: slot.key,
        codexClient: slot.codexClient,
        session,
        timeoutHandle: null,
        heartbeatHandle: null,
        latestFinalBlock: null,
        lastCodexActivityLogAt: null,
        lastHeartbeatLifecycleMessageAt: null,
        lastRawOutputForwardAt: null,
        suppressedRawOutputCount: 0,
      };

      slot.isStarting = false;
      slot.isRunning = true;
      slot.phase = "plan-spec-awaiting-brief";
      this.syncStateFromSlots();

      this.refreshPlanSpecTimeout(sessionId);
      this.touchSlot(slot, "plan-spec-awaiting-brief", "Sessao /plan_spec iniciada e aguardando brief inicial");

      return {
        status: "started",
        message: "Sessao /plan_spec iniciada. Envie a proxima mensagem com o brief inicial.",
      };
    } catch (error) {
      this.releaseSlot(slot.key);
      const details = error instanceof Error ? error.message : String(error);
      const message =
        error instanceof CodexPlanSessionError
          ? error.message
          : `Falha ao iniciar sessao /plan_spec: ${details}`;
      this.touch("error", message);
      this.logger.error("Falha ao iniciar sessao interativa /plan_spec", {
        error: details,
      });
      await this.emitPlanSpecFailure(chatId, message);
      return {
        status: "failed",
        message,
      };
    }
  };

  submitPlanSpecInput = async (
    chatId: string,
    input: string,
  ): Promise<PlanSpecSessionInputResult> => {
    const session = this.resolvePlanSpecSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    const normalizedInput = input.trim();
    if (!normalizedInput) {
      return {
        status: "ignored-empty",
        message: "Mensagem vazia ignorada na sessao /plan_spec.",
      };
    }

    const isInitialBrief = this.state.planSpecSession?.phase === "awaiting-brief";
    try {
      const pendingSend = session.session.sendUserInput(normalizedInput);
      this.setPlanSpecPhase(
        "waiting-codex",
        "plan-spec-waiting-codex",
        isInitialBrief
          ? "Brief inicial enviado ao Codex na sessao /plan_spec"
          : "Mensagem enviada ao Codex na sessao /plan_spec",
      );

      void pendingSend.catch((error) => {
        void this.handlePlanSpecSessionFailure(session.id, error);
      });

      return {
        status: "accepted",
        message: isInitialBrief
          ? "Brief inicial enviado para o Codex."
          : "Mensagem encaminhada para a sessao /plan_spec.",
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      await this.handlePlanSpecSessionFailure(session.id, error);
      return {
        status: "inactive",
        message: `Falha ao encaminhar mensagem para a sessao /plan_spec: ${details}`,
      };
    }
  };

  cancelPlanSpecSession = async (chatId: string): Promise<PlanSpecSessionCancelResult> => {
    const session = this.resolvePlanSpecSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    await this.finalizePlanSpecSession(session.id, {
      mode: "cancel",
      phase: "idle",
      message: PLAN_SPEC_CANCELLED_MESSAGE,
    });

    return {
      status: "cancelled",
      message: PLAN_SPEC_CANCELLED_MESSAGE,
    };
  };

  startCodexChatSession = async (chatId: string): Promise<CodexChatSessionStartResult> => {
    this.logger.info("Solicitacao de inicio de sessao /codex_chat recebida", {
      chatId,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/codex_chat");
    }

    if (this.isCodexChatSessionActive()) {
      return {
        status: "already-active",
        message: "Ja existe uma sessao /codex_chat em andamento nesta instancia.",
      };
    }

    const globalFreeTextBusy = this.buildGlobalFreeTextBusyResult("/codex_chat");
    if (globalFreeTextBusy) {
      return globalFreeTextBusy;
    }

    let roundDependencies: RunnerRoundDependencies;
    try {
      roundDependencies = await this.resolveRoundDependencies();
      this.state.activeProject = { ...roundDependencies.activeProject };
      this.syncStateFromSlots();
    } catch (error) {
      const message = this.buildActiveProjectResolutionErrorMessage(error, "codex-chat");
      this.touch("error", message);
      this.logger.error("Falha ao resolver projeto ativo para iniciar /codex_chat", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/codex_chat");
    }

    const globalFreeTextBusyAfterResolution = this.buildGlobalFreeTextBusyResult("/codex_chat");
    if (globalFreeTextBusyAfterResolution) {
      return globalFreeTextBusyAfterResolution;
    }

    const reservation = this.reserveSlot(roundDependencies, "codex-chat");
    if (reservation.status === "blocked") {
      return reservation;
    }

    const slot = reservation.slot;
    try {
      await slot.codexClient.ensureAuthenticated();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message =
        error instanceof CodexAuthenticationError
          ? error.message
          : [
              "Falha ao validar autenticacao do Codex CLI.",
              "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
            ].join(" ");
      this.touch("error", message);
      this.logger.error("Falha de autenticacao do Codex CLI ao iniciar /codex_chat", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    try {
      await slot.codexClient.snapshotInvocationPreferences();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message = this.buildCodexPreferencesResolutionErrorMessage(slot.project, error);
      this.touch("error", message);
      this.logger.error("Falha ao resolver preferencias do Codex ao iniciar /codex_chat", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-preferences-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      this.releaseSlot(slot.key);
      return this.buildShutdownBlockedResult("/codex_chat");
    }

    const sessionId = this.nextCodexChatSessionId;
    this.nextCodexChatSessionId += 1;

    try {
      const session = await slot.codexClient.startFreeChatSession({
        callbacks: {
          onEvent: (event) => {
            void this.handleCodexChatSessionEvent(sessionId, event);
          },
          onFailure: (error) => {
            void this.handleCodexChatSessionFailure(sessionId, error);
          },
          onClose: (result) => {
            void this.handleCodexChatSessionClose(sessionId, result);
          },
        },
      });

      const now = this.now();
      this.state.codexChatSession = {
        sessionId,
        chatId,
        phase: "waiting-user",
        startedAt: now,
        lastActivityAt: now,
        waitingCodexSinceAt: null,
        userInactivitySinceAt: now,
        lastCodexActivityAt: null,
        lastCodexStream: null,
        lastCodexPreview: null,
        observedModel: null,
        observedReasoningEffort: null,
        observedAt: null,
        activeProjectSnapshot: { ...slot.project },
      };
      this.activeCodexChatSession = {
        id: sessionId,
        chatId,
        project: { ...slot.project },
        slotKey: slot.key,
        codexClient: slot.codexClient,
        session,
        timeoutHandle: null,
        outputFlushHandle: null,
        turnCompletionFlushArmed: false,
        pendingOutputText: "",
        pendingOutputChunks: 0,
        lastCodexActivityLogAt: null,
        suppressedCodexActivityCount: 0,
        suppressedCodexActivityBytes: 0,
      };

      slot.isStarting = false;
      slot.isRunning = true;
      slot.phase = "codex-chat-waiting-user";
      this.syncStateFromSlots();

      this.refreshCodexChatTimeout(sessionId);
      this.touchSlot(
        slot,
        "codex-chat-waiting-user",
        "Sessao /codex_chat iniciada e aguardando mensagem do operador",
      );
      this.logger.info("Lifecycle /codex_chat: session-started", {
        chatId,
        sessionId,
        phase: "waiting-user",
        userInactivitySinceAt: now.toISOString(),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });

      return {
        status: "started",
        message: "Sessao /codex_chat iniciada. Envie a proxima mensagem para conversar com o Codex.",
      };
    } catch (error) {
      this.releaseSlot(slot.key);
      const details = error instanceof Error ? error.message : String(error);
      const message =
        error instanceof CodexChatSessionError
          ? error.message
          : `Falha ao iniciar sessao /codex_chat: ${details}`;
      this.touch("error", message);
      this.logger.error("Falha ao iniciar sessao interativa /codex_chat", {
        error: details,
      });
      await this.emitCodexChatFailure(chatId, message);
      return {
        status: "failed",
        message,
      };
    }
  };

  submitCodexChatInput = async (
    chatId: string,
    input: string,
  ): Promise<CodexChatSessionInputResult> => {
    const session = this.resolveCodexChatSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    const normalizedInput = input.trim();
    if (!normalizedInput) {
      return {
        status: "ignored-empty",
        message: "Mensagem vazia ignorada na sessao /codex_chat.",
      };
    }

    try {
      await this.flushCodexChatOutput(session.id, "new-input");
      const pendingSend = session.session.sendUserInput(normalizedInput);
      this.setCodexChatPhase(
        "waiting-codex",
        "codex-chat-waiting-codex",
        "Mensagem enviada ao Codex na sessao /codex_chat",
      );
      this.logger.info("Lifecycle /codex_chat: input-forwarded", {
        chatId,
        sessionId: session.id,
        phase: "waiting-codex",
        inputLength: normalizedInput.length,
        activeProjectName: this.state.codexChatSession?.activeProjectSnapshot.name,
        activeProjectPath: this.state.codexChatSession?.activeProjectSnapshot.path,
      });

      void pendingSend.catch((error) => {
        void this.handleCodexChatSessionFailure(session.id, error);
      });

      return {
        status: "accepted",
        message: "Mensagem encaminhada para a sessao /codex_chat.",
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      await this.handleCodexChatSessionFailure(session.id, error);
      return {
        status: "inactive",
        message: `Falha ao encaminhar mensagem para a sessao /codex_chat: ${details}`,
      };
    }
  };

  cancelCodexChatSession = async (
    chatId: string,
    options: CodexChatSessionCancelOptions = {},
  ): Promise<CodexChatSessionCancelResult> => {
    const session = this.resolveCodexChatSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    const reason = options.reason ?? "manual";
    await this.finalizeCodexChatSession(session.id, {
      mode: "cancel",
      phase: "idle",
      message: CODEX_CHAT_CANCELLED_MESSAGE,
      closureReason: reason === "command-handoff" ? "command-handoff" : "manual",
      triggeringCommand: options.triggeringCommand,
    });

    return {
      status: "cancelled",
      message: CODEX_CHAT_CANCELLED_MESSAGE,
    };
  };

  handleDiscoverSpecQuestionOptionSelection = async (
    chatId: string,
    optionValue: string,
  ): Promise<PlanSpecCallbackResult> => {
    const result = await this.submitDiscoverSpecInput(chatId, optionValue);
    if (result.status === "accepted") {
      return { status: "accepted" };
    }

    const reason =
      result.status === "inactive" || result.status === "ignored-chat"
        ? "inactive-session"
        : "invalid-action";
    return {
      status: "ignored",
      reason,
      message: result.message,
    };
  };

  handleDiscoverSpecFinalActionSelection = async (
    chatId: string,
    action: PlanSpecFinalActionId,
  ): Promise<PlanSpecCallbackResult> => {
    const session = this.resolveDiscoverSpecSessionForChat(chatId);
    if ("status" in session) {
      return {
        status: "ignored",
        reason: "inactive-session",
        message: session.message,
      };
    }

    if (action === "cancel") {
      await this.finalizeDiscoverSpecSession(session.id, {
        mode: "cancel",
        phase: "idle",
        message: DISCOVER_SPEC_CANCELLED_MESSAGE,
      });
      return { status: "accepted" };
    }

    if (action === "create-spec") {
      return this.handleDiscoverSpecCreateSpecSelection(session);
    }

    return this.requestDiscoverSpecRefinement(session);
  };

  handlePlanSpecQuestionOptionSelection = async (
    chatId: string,
    optionValue: string,
  ): Promise<PlanSpecCallbackResult> => {
    const result = await this.submitPlanSpecInput(chatId, optionValue);
    if (result.status === "accepted") {
      return { status: "accepted" };
    }

    const reason =
      result.status === "inactive" || result.status === "ignored-chat"
        ? "inactive-session"
        : "invalid-action";
    return {
      status: "ignored",
      reason,
      message: result.message,
    };
  };

  private async handleDiscoverSpecCreateSpecSelection(
    session: ActiveDiscoverSpecSession,
  ): Promise<PlanSpecCallbackResult> {
    const discoverSpecSession = this.state.discoverSpecSession;
    if (!discoverSpecSession) {
      return {
        status: "ignored",
        reason: "inactive-session",
        message: DISCOVER_SPEC_INACTIVE_MESSAGE,
      };
    }

    if (discoverSpecSession.phase !== "awaiting-final-action") {
      return {
        status: "ignored",
        reason: "invalid-action",
        message:
          "Acao `Criar spec` so pode ser executada apos um bloco final elegivel de /discover_spec. Use `Refinar` para continuar a entrevista.",
      };
    }

    const finalBlock = session.latestFinalBlock ?? discoverSpecSession.latestFinalBlock;
    if (!finalBlock) {
      return {
        status: "ignored",
        reason: "invalid-action",
        message:
          "Bloco final da descoberta indisponivel para `Criar spec`. Solicite `Refinar` e conclua novamente.",
      };
    }

    if (!discoverSpecSession.createSpecEligible) {
      return {
        status: "ignored",
        reason: "invalid-action",
        message: `${discoverSpecSession.createSpecBlockReason ?? "A descoberta ainda possui lacunas criticas."} Use \`Refinar\` para continuar a entrevista.`,
      };
    }

    const finalBlockValidationError = this.validatePlanSpecFinalBlockForMaterialization(finalBlock);
    if (finalBlockValidationError) {
      return {
        status: "ignored",
        reason: "invalid-action",
        message: `${finalBlockValidationError} Use \`Refinar\` para completar a descoberta antes de criar a spec.`,
      };
    }

    return this.executeCreateSpecFromFinalBlock({
      sourceCommand: "/discover_spec",
      sessionId: session.id,
      chatId: session.chatId,
      slotKey: session.slotKey,
      activeProject: discoverSpecSession.activeProjectSnapshot,
      codexClient: session.codexClient,
      finalBlock,
      waitingPhase: "discover-spec-waiting-codex",
      finalizeSession: (sessionId, options) =>
        this.finalizeDiscoverSpecSession(sessionId, options),
      emitLifecycleMessage: (chatId, message) =>
        this.emitDiscoverSpecLifecycleMessage(chatId, message),
      emitFailure: (chatId, details) => this.emitDiscoverSpecFailure(chatId, details),
    });
  }

  private async requestDiscoverSpecRefinement(
    session: ActiveDiscoverSpecSession,
  ): Promise<PlanSpecCallbackResult> {
    const discoverSpecSession = this.state.discoverSpecSession;
    if (!discoverSpecSession) {
      return {
        status: "ignored",
        reason: "inactive-session",
        message: DISCOVER_SPEC_INACTIVE_MESSAGE,
      };
    }

    const pendingItems = discoverSpecSession.pendingItems;
    const refinementPrompt = pendingItems.length > 0
      ? this.buildDiscoverSpecRefinementPrompt(pendingItems)
      : [
          "Refinar a descoberta de /discover_spec.",
          "Revise o ultimo bloco final, valide assumptions/defaults e trade-offs, e faca a proxima pergunta objetiva necessaria.",
        ].join("\n");

    try {
      discoverSpecSession.createSpecEligible = false;
      discoverSpecSession.createSpecBlockReason =
        pendingItems.length > 0
          ? this.buildDiscoverSpecBlockReason(pendingItems)
          : "Refinamento solicitado pelo operador.";
      const pendingSend = session.session.sendUserInput(refinementPrompt);
      this.setDiscoverSpecPhase(
        "waiting-codex",
        "discover-spec-waiting-codex",
        "Sessao /discover_spec retomou a entrevista por solicitacao de refinamento",
      );
      void pendingSend.catch((error) => {
        void this.handleDiscoverSpecSessionFailure(session.id, error);
      });
      return { status: "accepted" };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      await this.handleDiscoverSpecSessionFailure(session.id, error);
      return {
        status: "ignored",
        reason: "inactive-session",
        message: `Falha ao retomar a entrevista de /discover_spec: ${details}`,
      };
    }
  }

  handlePlanSpecFinalActionSelection = async (
    chatId: string,
    action: PlanSpecFinalActionId,
  ): Promise<PlanSpecCallbackResult> => {
    const session = this.resolvePlanSpecSessionForChat(chatId);
    if ("status" in session) {
      return {
        status: "ignored",
        reason: "inactive-session",
        message: session.message,
      };
    }

    if (action === "cancel") {
      await this.finalizePlanSpecSession(session.id, {
        mode: "cancel",
        phase: "idle",
        message: PLAN_SPEC_CANCELLED_MESSAGE,
      });
      return { status: "accepted" };
    }

    if (action === "create-spec") {
      return this.handlePlanSpecCreateSpecSelection(session);
    }

    const result = await this.submitPlanSpecInput(
      chatId,
      "Refinar. Continue o planejamento e faca as perguntas necessarias.",
    );
    if (result.status === "accepted") {
      return { status: "accepted" };
    }

    const reason =
      result.status === "inactive" || result.status === "ignored-chat"
        ? "inactive-session"
        : "invalid-action";
    return {
      status: "ignored",
      reason,
      message: result.message,
    };
  };

  private async handlePlanSpecCreateSpecSelection(
    session: ActivePlanSpecSession,
  ): Promise<PlanSpecCallbackResult> {
    const planSpecSession = this.state.planSpecSession;
    if (!planSpecSession) {
      return {
        status: "ignored",
        reason: "inactive-session",
        message: PLAN_SPEC_INACTIVE_MESSAGE,
      };
    }

    if (planSpecSession.phase !== "awaiting-final-action") {
      return {
        status: "ignored",
        reason: "invalid-action",
        message:
          "Acao `Criar spec` so pode ser executada apos o bloco final do planejamento. Use `Refinar` para continuar.",
      };
    }

    const finalBlock = session.latestFinalBlock;
    if (!finalBlock) {
      return {
        status: "ignored",
        reason: "invalid-action",
        message:
          "Bloco final do planejamento indisponivel para `Criar spec`. Solicite `Refinar` e conclua novamente.",
      };
    }

    const finalBlockValidationError = this.validatePlanSpecFinalBlockForMaterialization(finalBlock);
    if (finalBlockValidationError) {
      return {
        status: "ignored",
        reason: "invalid-action",
        message: `${finalBlockValidationError} Use \`Refinar\` para completar o planejamento antes de criar a spec.`,
      };
    }

    return this.executeCreateSpecFromFinalBlock({
      sourceCommand: "/plan_spec",
      sessionId: session.id,
      chatId: session.chatId,
      slotKey: session.slotKey,
      activeProject: planSpecSession.activeProjectSnapshot,
      codexClient: session.codexClient,
      finalBlock,
      waitingPhase: "plan-spec-waiting-codex",
      finalizeSession: (sessionId, options) => this.finalizePlanSpecSession(sessionId, options),
      emitLifecycleMessage: (chatId, message) => this.emitPlanSpecLifecycleMessage(chatId, message),
      emitFailure: (chatId, details) => this.emitPlanSpecFailure(chatId, details),
    });
  }

  private async executeCreateSpecFromFinalBlock(params: {
    sourceCommand: SpecPlanningSourceCommand;
    sessionId: number;
    chatId: string;
    slotKey: string;
    activeProject: ProjectRef;
    codexClient: CodexTicketFlowClient;
    finalBlock: PlanSpecFinalBlock;
    waitingPhase: Extract<RunnerState["phase"], "discover-spec-waiting-codex" | "plan-spec-waiting-codex">;
    finalizeSession: (
      sessionId: number,
      options: {
        mode: "cancel";
        phase: RunnerState["phase"];
        message: string;
        notifyMessage?: string;
        releaseSlot?: boolean;
      },
    ) => Promise<void>;
    emitLifecycleMessage: (chatId: string, message: string) => Promise<void>;
    emitFailure: (chatId: string, details: string) => Promise<void>;
  }): Promise<PlanSpecCallbackResult> {
    const createdAt = this.now();
    const spec = this.buildPlannedSpecRef(params.finalBlock.title, createdAt);
    const commitMessage = `feat(spec): add ${spec.fileName}`;
    const sourceLabel = params.sourceCommand;
    const failureMessagePrefix = this.buildCreateSpecFailureMessage(params.sourceCommand);

    try {
      await this.assertSpecPathAvailable(params.activeProject.path, spec.path);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return {
        status: "ignored",
        reason: "ineligible",
        message: details,
      };
    }

    let traceSession: SpecPlanningTraceSession;
    const traceStore = this.specPlanningTraceStoreFactory(params.activeProject.path);
    try {
      traceSession = await traceStore.startSession({
        sourceCommand: params.sourceCommand,
        sessionId: params.sessionId,
        chatId: params.chatId,
        specPath: spec.path,
        specFileName: spec.fileName,
        specTitle: params.finalBlock.title,
        specSummary: params.finalBlock.summary,
        specOutline: this.clonePlanSpecFinalOutline(params.finalBlock.outline),
        assumptionsAndDefaults: [...params.finalBlock.assumptionsAndDefaults],
        decisionsAndTradeOffs: [...params.finalBlock.decisionsAndTradeOffs],
        categoryCoverage: params.finalBlock.categoryCoverage.map((item) => ({ ...item })),
        criticalAmbiguities: [...params.finalBlock.criticalAmbiguities],
        commitMessage,
        createdAt,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error("Falha ao persistir trilha spec_planning antes da acao create-spec", {
        sourceCommand: params.sourceCommand,
        sessionId: params.sessionId,
        chatId: params.chatId,
        specPath: spec.path,
        error: details,
      });
      return {
        status: "ignored",
        reason: "ineligible",
        message: `Falha ao persistir trilha spec_planning: ${details}`,
      };
    }

    const slot = this.activeSlots.get(params.slotKey);
    if (slot) {
      slot.isStarting = true;
      slot.currentSpec = spec.fileName;
      slot.phase = params.waitingPhase;
      this.syncStateFromSlots();
    }

    let specExecutionClient: CodexTicketFlowClient = params.codexClient;
    try {
      const fixedPreferences = await params.codexClient.snapshotInvocationPreferences();
      specExecutionClient = params.codexClient.forkWithFixedInvocationPreferences(fixedPreferences);
      this.logger.info(`Preferencias do Codex snapshotadas para acao create-spec de ${sourceLabel}`, {
        sourceCommand: params.sourceCommand,
        sessionId: params.sessionId,
        chatId: params.chatId,
        activeProjectName: params.activeProject.name,
        activeProjectPath: params.activeProject.path,
        specFileName: spec.fileName,
        model: fixedPreferences?.model ?? null,
        reasoningEffort: fixedPreferences?.reasoningEffort ?? null,
        speed: fixedPreferences?.speed ?? null,
      });

      await params.finalizeSession(params.sessionId, {
        mode: "cancel",
        phase: params.waitingPhase,
        message: `Sessao ${sourceLabel} encerrada para executar Criar spec: ${spec.fileName}`,
        notifyMessage: `Executando Criar spec para ${spec.path}.`,
        releaseSlot: false,
      });

      const materializeSpec = this.buildCreateSpecStageSpecRef({
        spec,
        finalBlock: params.finalBlock,
        sourceCommand: params.sourceCommand,
      });
      if (slot) {
        this.touchSlot(
          slot,
          params.waitingPhase,
          `Executando etapa plan-spec-materialize para ${spec.fileName}`,
        );
      } else {
        this.touch(
          params.waitingPhase,
          `Executando etapa plan-spec-materialize para ${spec.fileName}`,
        );
      }
      const materializeResult = await specExecutionClient.runSpecStage(
        "plan-spec-materialize",
        materializeSpec,
      );
      await traceStore.writeStageResponse(
        traceSession.materializeResponsePath,
        this.buildSpecPlanningTraceStageResponse({
          stage: "plan-spec-materialize",
          sourceCommand: params.sourceCommand,
          spec,
          finalBlock: params.finalBlock,
          output: materializeResult.output,
          recordedAt: this.now(),
        }),
      );
      await this.assertPlannedSpecMetadata(params.activeProject.path, spec.path);

      const versionSpec = this.buildCreateSpecStageSpecRef({
        spec,
        finalBlock: params.finalBlock,
        sourceCommand: params.sourceCommand,
        commitMessage,
        tracePaths: {
          requestPath: traceSession.requestPath,
          responsePath: traceSession.materializeResponsePath,
          decisionPath: traceSession.decisionPath,
        },
      });
      if (slot) {
        this.touchSlot(
          slot,
          params.waitingPhase,
          `Executando etapa plan-spec-version-and-push para ${spec.fileName}`,
        );
      } else {
        this.touch(
          params.waitingPhase,
          `Executando etapa plan-spec-version-and-push para ${spec.fileName}`,
        );
      }
      const versionResult = await specExecutionClient.runSpecStage(
        "plan-spec-version-and-push",
        versionSpec,
      );
      await traceStore.writeStageResponse(
        traceSession.versionAndPushResponsePath,
        this.buildSpecPlanningTraceStageResponse({
          stage: "plan-spec-version-and-push",
          sourceCommand: params.sourceCommand,
          spec,
          finalBlock: params.finalBlock,
          output: versionResult.output,
          recordedAt: this.now(),
        }),
      );

      if (slot) {
        this.touchSlot(slot, "idle", `Spec criada e versionada com sucesso: ${spec.path}`);
      } else {
        this.touch("idle", `Spec criada e versionada com sucesso: ${spec.path}`);
      }
      await params.emitLifecycleMessage(
        params.chatId,
        `Spec criada e versionada com sucesso: ${spec.path}`,
      );
      return { status: "accepted" };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      if (slot) {
        this.touchSlot(
          slot,
          "error",
          `Falha ao executar acao Criar spec para ${spec.fileName}: ${details}`,
        );
      } else {
        this.touch(
          "error",
          `Falha ao executar acao Criar spec para ${spec.fileName}: ${details}`,
        );
      }
      this.logger.error(`Falha na acao final create-spec da sessao ${sourceLabel}`, {
        sourceCommand: params.sourceCommand,
        sessionId: params.sessionId,
        chatId: params.chatId,
        specFileName: spec.fileName,
        specPath: spec.path,
        error: details,
      });
      await params.emitFailure(params.chatId, `${failureMessagePrefix}: ${details}`);
      return {
        status: "ignored",
        reason: "ineligible",
        message: `${failureMessagePrefix}: ${details}`,
      };
    } finally {
      if (slot) {
        slot.currentSpec = null;
        slot.isStarting = false;
        slot.isRunning = false;
      }
      this.releaseSlot(params.slotKey);
    }
  }

  requestRunAll = async (): Promise<RunAllRequestResult> => {
    this.logger.info("Solicitacao de rodada recebida", {
      command: "run-all",
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
    });

    this.startRequestsInFlight += 1;
    try {
      const preflightOutcome = await this.prepareRunSlotStart("run-all");
      if ("status" in preflightOutcome) {
        return preflightOutcome;
      }

      const { slot } = preflightOutcome;
      this.startRunSlotLoop(slot, async () => {
        await this.runForever(slot);
      });

      this.logger.info("Rodada /run-all agendada no loop principal", {
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });

      return { status: "started" };
    } finally {
      this.startRequestsInFlight = Math.max(0, this.startRequestsInFlight - 1);
    }
  };

  requestRunSpecs = async (specFileName: string): Promise<RunSpecsRequestResult> => {
    const normalizedSpecFileName = this.normalizeSpecFileName(specFileName);
    const spec: SpecRef = {
      fileName: normalizedSpecFileName,
      path: this.resolveSpecPath(normalizedSpecFileName),
    };

    this.logger.info("Solicitacao de triagem de spec recebida", {
      command: "run-specs",
      specFileName: spec.fileName,
      specPath: spec.path,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
    });

    this.startRequestsInFlight += 1;
    try {
      const preflightOutcome = await this.prepareRunSlotStart("run-specs");
      if ("status" in preflightOutcome) {
        return preflightOutcome;
      }

      const { slot } = preflightOutcome;
      this.startRunSlotLoop(slot, () => this.runSpecsAndRunAll(slot, spec));

      this.logger.info("Fluxo /run_specs agendado no loop principal", {
        specFileName: spec.fileName,
        specPath: spec.path,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });

      return { status: "started" };
    } finally {
      this.startRequestsInFlight = Math.max(0, this.startRequestsInFlight - 1);
    }
  };

  requestRunSelectedTicket = async (ticketInput: string): Promise<RunSelectedTicketRequestResult> => {
    const normalizedTicket = this.normalizeSelectedTicketFileName(ticketInput);
    if (normalizedTicket.status === "invalid") {
      this.logger.warn("Solicitacao de execucao unitaria rejeitada por ticket invalido", {
        command: "run-ticket",
        ticketInput,
        message: normalizedTicket.message,
      });
      return {
        status: "ticket-invalido",
        message: normalizedTicket.message,
      };
    }

    const ticketFileName = normalizedTicket.ticketFileName;
    this.logger.info("Solicitacao de execucao unitaria de ticket recebida", {
      command: "run-ticket",
      ticketFileName,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
    });

    this.startRequestsInFlight += 1;
    try {
      const preflightOutcome = await this.prepareRunSlotStart("run-ticket");
      if ("status" in preflightOutcome) {
        return preflightOutcome;
      }

      const { slot } = preflightOutcome;
      let ticketResolution: SelectedTicketResolutionResult;
      try {
        ticketResolution = await this.resolveSelectedOpenTicket(slot.project.path, ticketFileName);
      } catch (error) {
        this.releaseSlot(slot.key);
        const details = error instanceof Error ? error.message : String(error);
        const message = [
          `Falha ao validar ticket selecionado ${ticketFileName}.`,
          "Verifique permissao/leitura em tickets/open/ e tente novamente.",
          `Detalhes: ${details}`,
        ].join(" ");
        this.touch("error", message);
        this.logger.error("Falha ao validar ticket selecionado antes da execucao unitaria", {
          command: "run-ticket",
          ticketFileName,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
          error: details,
        });
        return {
          status: "blocked",
          reason: "active-project-unavailable",
          message,
        };
      }

      if (ticketResolution.status === "not-found") {
        this.releaseSlot(slot.key);
        this.touch("idle", ticketResolution.message);
        this.logger.warn("Execucao unitaria bloqueada: ticket selecionado nao encontrado", {
          command: "run-ticket",
          ticketFileName,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        return {
          status: "ticket-nao-encontrado",
          message: ticketResolution.message,
        };
      }

      const selectedTicket = ticketResolution.ticket;
      this.startRunSlotLoop(slot, () => this.runSelectedTicketOnce(slot, selectedTicket));
      this.logger.info("Execucao unitaria do ticket selecionado agendada no loop principal", {
        command: "run-ticket",
        ticketFileName: selectedTicket.name,
        ticketOpenPath: selectedTicket.openPath,
        ticketClosedPath: selectedTicket.closedPath,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return { status: "started" };
    } finally {
      this.startRequestsInFlight = Math.max(0, this.startRequestsInFlight - 1);
    }
  };

  private buildGlobalFreeTextBusyResult(
    requestedCommand: "/discover_spec" | "/plan_spec" | "/codex_chat",
  ): {
    status: "blocked";
    reason: "global-free-text-busy";
    message: string;
  } | null {
    const hasActiveDiscoverSpecSession = this.isDiscoverSpecSessionActive();
    const hasActivePlanSpecSession = this.isPlanSpecSessionActive();
    const hasActiveCodexChatSession = this.isCodexChatSessionActive();
    const activeCommand = hasActiveDiscoverSpecSession
      ? "/discover_spec"
      : hasActivePlanSpecSession
        ? "/plan_spec"
        : hasActiveCodexChatSession
          ? "/codex_chat"
          : null;

    if (!activeCommand || activeCommand === requestedCommand) {
      return null;
    }

    const message = [
      `Nao e possivel iniciar ${requestedCommand} enquanto houver sessao global de texto livre ativa em ${activeCommand}.`,
      `Encerre a sessao ${activeCommand} atual e tente novamente.`,
    ].join(" ");
    this.logger.warn("Solicitacao de sessao interativa bloqueada por lock global de texto livre", {
      requestedCommand,
      activeCommand,
      hasActiveDiscoverSpecSession,
      hasActivePlanSpecSession,
      hasActiveCodexChatSession,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    return {
      status: "blocked",
      reason: "global-free-text-busy",
      message,
    };
  }

  private isDiscoverSpecSessionActive(): boolean {
    return Boolean(this.activeDiscoverSpecSession && this.state.discoverSpecSession);
  }

  private resolveDiscoverSpecSessionForChat(
    chatId: string,
  ): ActiveDiscoverSpecSession | DiscoverSpecSessionChatRejectedResult {
    if (!this.activeDiscoverSpecSession || !this.state.discoverSpecSession) {
      return {
        status: "inactive",
        message: DISCOVER_SPEC_INACTIVE_MESSAGE,
      };
    }

    if (this.activeDiscoverSpecSession.chatId !== chatId) {
      return {
        status: "ignored-chat",
        message: DISCOVER_SPEC_CHAT_MISMATCH_MESSAGE,
      };
    }

    return this.activeDiscoverSpecSession;
  }

  private isPlanSpecSessionActive(): boolean {
    return Boolean(this.activePlanSpecSession && this.state.planSpecSession);
  }

  private resolvePlanSpecSessionForChat(
    chatId: string,
  ): ActivePlanSpecSession | PlanSpecSessionChatRejectedResult {
    if (!this.activePlanSpecSession || !this.state.planSpecSession) {
      return {
        status: "inactive",
        message: PLAN_SPEC_INACTIVE_MESSAGE,
      };
    }

    if (this.activePlanSpecSession.chatId !== chatId) {
      return {
        status: "ignored-chat",
        message: PLAN_SPEC_CHAT_MISMATCH_MESSAGE,
      };
    }

    return this.activePlanSpecSession;
  }

  private isCodexChatSessionActive(): boolean {
    return Boolean(this.activeCodexChatSession && this.state.codexChatSession);
  }

  private resolveCodexChatSessionForChat(
    chatId: string,
  ): ActiveCodexChatSession | CodexChatSessionChatRejectedResult {
    if (!this.activeCodexChatSession || !this.state.codexChatSession) {
      return {
        status: "inactive",
        message: CODEX_CHAT_INACTIVE_MESSAGE,
      };
    }

    if (this.activeCodexChatSession.chatId !== chatId) {
      return {
        status: "ignored-chat",
        message: CODEX_CHAT_CHAT_MISMATCH_MESSAGE,
      };
    }

    return this.activeCodexChatSession;
  }

  private setCodexChatPhase(
    phase: CodexChatSessionPhase,
    runnerPhase: RunnerState["phase"],
    message: string,
  ): void {
    const codexChatSession = this.state.codexChatSession;
    const activeSession = this.activeCodexChatSession;
    if (!codexChatSession || !activeSession) {
      return;
    }

    const now = this.now();
    const previousPhase = codexChatSession.phase;
    codexChatSession.phase = phase;
    codexChatSession.lastActivityAt = now;
    if (phase === "waiting-codex") {
      if (!codexChatSession.waitingCodexSinceAt) {
        codexChatSession.waitingCodexSinceAt = now;
      }
      codexChatSession.userInactivitySinceAt = null;
    } else {
      codexChatSession.waitingCodexSinceAt = null;
      codexChatSession.userInactivitySinceAt = now;
    }
    this.refreshCodexChatTimeout(activeSession.id);

    const slot = this.activeSlots.get(activeSession.slotKey);
    if (slot) {
      this.touchSlot(slot, runnerPhase, message);
    } else {
      this.touch(runnerPhase, message);
    }

    this.logger.info("Lifecycle /codex_chat: phase-transition", {
      chatId: activeSession.chatId,
      sessionId: activeSession.id,
      previousPhase,
      phase,
      reason: message,
      waitingCodexSinceAt: codexChatSession.waitingCodexSinceAt?.toISOString() ?? null,
      userInactivitySinceAt: codexChatSession.userInactivitySinceAt?.toISOString() ?? null,
      activeProjectName: codexChatSession.activeProjectSnapshot.name,
      activeProjectPath: codexChatSession.activeProjectSnapshot.path,
    });
  }

  private refreshCodexChatTimeout(sessionId: number): void {
    const activeSession = this.activeCodexChatSession;
    const codexChatSession = this.state.codexChatSession;
    if (!activeSession || !codexChatSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
      activeSession.timeoutHandle = null;
    }

    if (codexChatSession.phase !== "waiting-user") {
      return;
    }

    activeSession.timeoutHandle = this.setTimer(() => {
      void this.handleCodexChatSessionTimeout(sessionId);
    }, this.codexChatSessionTimeoutMs);
    activeSession.timeoutHandle.unref?.();
  }

  private scheduleCodexChatTurnCompletionFlush(sessionId: number): void {
    const activeSession = this.activeCodexChatSession;
    if (!activeSession || activeSession.id !== sessionId || !activeSession.turnCompletionFlushArmed) {
      return;
    }

    if (activeSession.outputFlushHandle) {
      this.clearTimer(activeSession.outputFlushHandle);
      activeSession.outputFlushHandle = null;
    }

    activeSession.outputFlushHandle = this.setTimer(() => {
      activeSession.outputFlushHandle = null;
      void this.flushCodexChatOutput(sessionId, "turn-complete");
    }, this.codexChatOutputFlushDelayMs);
    activeSession.outputFlushHandle.unref?.();
  }

  private rescheduleCodexChatTurnCompletionFlushIfArmed(sessionId: number): void {
    const activeSession = this.activeCodexChatSession;
    if (!activeSession || activeSession.id !== sessionId || !activeSession.turnCompletionFlushArmed) {
      return;
    }

    this.scheduleCodexChatTurnCompletionFlush(sessionId);
  }

  private clearCodexChatOutputBuffer(activeSession: ActiveCodexChatSession): void {
    if (activeSession.outputFlushHandle) {
      this.clearTimer(activeSession.outputFlushHandle);
      activeSession.outputFlushHandle = null;
    }

    activeSession.turnCompletionFlushArmed = false;
    activeSession.pendingOutputText = "";
    activeSession.pendingOutputChunks = 0;
  }

  private bufferCodexChatOutput(activeSession: ActiveCodexChatSession, chunkText: string): void {
    const normalized = chunkText.trim();
    if (!normalized) {
      return;
    }

    if (activeSession.pendingOutputText.length === 0) {
      activeSession.pendingOutputText = normalized;
    } else {
      activeSession.pendingOutputText = `${activeSession.pendingOutputText}\n${normalized}`;
    }
    activeSession.pendingOutputChunks += 1;
  }

  private async flushCodexChatOutput(
    sessionId: number,
    reason: "turn-complete" | "new-input",
  ): Promise<void> {
    const activeSession = this.activeCodexChatSession;
    const codexChatSession = this.state.codexChatSession;
    if (!activeSession || !codexChatSession || activeSession.id !== sessionId) {
      return;
    }

    const outputText = activeSession.pendingOutputText.trim();
    const outputChunks = activeSession.pendingOutputChunks;
    this.clearCodexChatOutputBuffer(activeSession);
    if (!outputText) {
      return;
    }

    if (reason === "turn-complete" && codexChatSession.phase === "waiting-codex") {
      this.setCodexChatPhase(
        "waiting-user",
        "codex-chat-waiting-user",
        "Sessao /codex_chat aguardando nova mensagem do operador",
      );
    }

    this.logger.info("Lifecycle /codex_chat: output-forwarded", {
      chatId: activeSession.chatId,
      sessionId,
      outputLength: outputText.length,
      outputChunks,
      flushReason: reason,
      phase: this.state.codexChatSession?.phase,
      activeProjectName: this.state.codexChatSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.codexChatSession?.activeProjectSnapshot.path,
    });
    await this.emitCodexChatOutput(activeSession.chatId, {
      type: "raw-sanitized",
      text: outputText,
    });
  }

  private async handleCodexChatSessionTimeout(sessionId: number): Promise<void> {
    const activeSession = this.activeCodexChatSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    this.logger.warn("Sessao /codex_chat expirada por inatividade", {
      chatId: activeSession.chatId,
      timeoutMs: this.codexChatSessionTimeoutMs,
      phase: this.state.codexChatSession?.phase,
      waitingCodexSinceAt: this.state.codexChatSession?.waitingCodexSinceAt?.toISOString() ?? null,
      userInactivitySinceAt:
        this.state.codexChatSession?.userInactivitySinceAt?.toISOString() ?? null,
      lastCodexActivityAt:
        this.state.codexChatSession?.lastCodexActivityAt?.toISOString() ?? null,
      lastCodexStream: this.state.codexChatSession?.lastCodexStream ?? null,
      lastCodexPreview: this.state.codexChatSession?.lastCodexPreview ?? null,
      activeProjectName: this.state.codexChatSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.codexChatSession?.activeProjectSnapshot.path,
    });

    await this.finalizeCodexChatSession(sessionId, {
      mode: "cancel",
      phase: "idle",
      message: CODEX_CHAT_TIMEOUT_MESSAGE,
      notifyMessage: CODEX_CHAT_TIMEOUT_MESSAGE,
      closureReason: "timeout",
    });
  }

  private async handleCodexChatSessionEvent(
    sessionId: number,
    event: CodexChatSessionEvent,
  ): Promise<void> {
    const activeSession = this.activeCodexChatSession;
    const codexChatSession = this.state.codexChatSession;
    if (!activeSession || !codexChatSession || activeSession.id !== sessionId) {
      return;
    }

    codexChatSession.lastActivityAt = this.now();

    if (event.type === "activity") {
      this.recordCodexChatActivity(activeSession, codexChatSession, sessionId, event);
      this.rescheduleCodexChatTurnCompletionFlushIfArmed(sessionId);
      return;
    }

    if (event.type === "turn-context") {
      this.recordCodexChatTurnContext(activeSession, codexChatSession, sessionId, event);
      return;
    }

    if (event.type === "turn-complete") {
      activeSession.turnCompletionFlushArmed = true;
      this.scheduleCodexChatTurnCompletionFlush(sessionId);
      return;
    }

    if (codexChatSession.phase !== "waiting-codex" && activeSession.pendingOutputChunks === 0) {
      return;
    }

    this.bufferCodexChatOutput(activeSession, event.text);
    this.rescheduleCodexChatTurnCompletionFlushIfArmed(sessionId);
  }

  private async handleCodexChatSessionFailure(sessionId: number, error: unknown): Promise<void> {
    const activeSession = this.activeCodexChatSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    const details = error instanceof Error ? error.message : String(error);
    this.logger.error("Falha na sessao /codex_chat", {
      chatId: activeSession.chatId,
      error: details,
      phase: this.state.codexChatSession?.phase,
      activeProjectName: this.state.codexChatSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.codexChatSession?.activeProjectSnapshot.path,
    });

    await this.finalizeCodexChatSession(sessionId, {
      mode: "cancel",
      phase: "error",
      message: "Falha na sessao /codex_chat",
      closureReason: "failure",
    });
    await this.emitCodexChatFailure(activeSession.chatId, details);
  }

  private recordCodexChatActivity(
    activeSession: ActiveCodexChatSession,
    codexChatSession: NonNullable<RunnerState["codexChatSession"]>,
    sessionId: number,
    event: Extract<CodexChatSessionEvent, { type: "activity" }>,
  ): void {
    const now = this.now();
    const preview = event.activity.preview.trim();
    codexChatSession.lastCodexActivityAt = now;
    if (preview.length > 0) {
      codexChatSession.lastCodexStream = event.activity.source;
      codexChatSession.lastCodexPreview = preview;
    } else {
      return;
    }

    const shouldLogActivity =
      !activeSession.lastCodexActivityLogAt ||
      now.getTime() - activeSession.lastCodexActivityLogAt.getTime() >=
        CODEX_CHAT_CODEX_ACTIVITY_LOG_INTERVAL_MS;
    if (!shouldLogActivity) {
      activeSession.suppressedCodexActivityCount += 1;
      activeSession.suppressedCodexActivityBytes += event.activity.bytes;
      return;
    }

    const suppressedEvents = activeSession.suppressedCodexActivityCount;
    const suppressedBytes = activeSession.suppressedCodexActivityBytes;
    activeSession.suppressedCodexActivityCount = 0;
    activeSession.suppressedCodexActivityBytes = 0;
    activeSession.lastCodexActivityLogAt = now;

    this.logger.info("Lifecycle /codex_chat: codex-activity", {
      chatId: activeSession.chatId,
      sessionId,
      phase: codexChatSession.phase,
      source: event.activity.source,
      bytes: event.activity.bytes,
      preview: codexChatSession.lastCodexPreview,
      ...(suppressedEvents > 0 ? { suppressedEvents, suppressedBytes } : {}),
      activeProjectName: codexChatSession.activeProjectSnapshot.name,
      activeProjectPath: codexChatSession.activeProjectSnapshot.path,
    });
  }

  private recordCodexChatTurnContext(
    activeSession: ActiveCodexChatSession,
    codexChatSession: NonNullable<RunnerState["codexChatSession"]>,
    sessionId: number,
    event: Extract<CodexChatSessionEvent, { type: "turn-context" }>,
  ): void {
    const observedAt = this.now();
    codexChatSession.observedModel = event.model;
    codexChatSession.observedReasoningEffort = event.reasoningEffort;
    codexChatSession.observedAt = observedAt;
    codexChatSession.lastActivityAt = observedAt;

    this.logger.info("Lifecycle /codex_chat: turn-context observado", {
      chatId: activeSession.chatId,
      sessionId,
      model: event.model,
      reasoningEffort: event.reasoningEffort,
      activeProjectName: codexChatSession.activeProjectSnapshot.name,
      activeProjectPath: codexChatSession.activeProjectSnapshot.path,
    });
  }

  private async handleCodexChatSessionClose(
    sessionId: number,
    result: CodexChatSessionCloseResult,
  ): Promise<void> {
    const activeSession = this.activeCodexChatSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (result.cancelled) {
      await this.finalizeCodexChatSession(sessionId, {
        mode: "closed",
        phase: "idle",
        message: CODEX_CHAT_CANCELLED_MESSAGE,
        closureReason: "manual",
      });
      return;
    }

    const message = `Sessao /codex_chat encerrada inesperadamente (exit code: ${String(result.exitCode)}).`;
    this.logger.warn("Sessao /codex_chat encerrada sem cancelamento explicito", {
      chatId: activeSession.chatId,
      exitCode: result.exitCode,
      activeProjectName: this.state.codexChatSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.codexChatSession?.activeProjectSnapshot.path,
    });
    await this.finalizeCodexChatSession(sessionId, {
      mode: "closed",
      phase: "error",
      message,
      closureReason: "unexpected-close",
    });
    await this.emitCodexChatFailure(activeSession.chatId, message);
  }

  private async finalizeCodexChatSession(
    sessionId: number,
    options: {
      mode: "cancel" | "closed";
      phase: RunnerState["phase"];
      message: string;
      closureReason: CodexChatSessionClosureReason;
      notifyMessage?: string;
      releaseSlot?: boolean;
      triggeringCommand?: string;
    },
  ): Promise<void> {
    const activeSession = this.activeCodexChatSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
      activeSession.timeoutHandle = null;
    }
    this.clearCodexChatOutputBuffer(activeSession);

    const codexChatSession = this.state.codexChatSession;
    const closedAt = this.now();
    this.state.lastCodexChatSessionClosure = {
      reason: options.closureReason,
      closedAt,
      chatId: activeSession.chatId,
      sessionId: codexChatSession?.sessionId ?? activeSession.id,
      phase: codexChatSession?.phase ?? null,
      message: options.message,
      activeProjectSnapshot: {
        ...(codexChatSession?.activeProjectSnapshot ?? activeSession.project),
      },
      triggeringCommand: options.triggeringCommand ?? null,
    };

    this.activeCodexChatSession = null;
    this.state.codexChatSession = null;

    if (options.mode === "cancel") {
      try {
        await activeSession.session.cancel();
      } catch (error) {
        this.logger.warn("Falha ao cancelar processo da sessao /codex_chat", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const shouldReleaseSlot = options.releaseSlot ?? true;
    if (shouldReleaseSlot) {
      this.releaseSlot(activeSession.slotKey);
    }

    const slot = this.activeSlots.get(activeSession.slotKey);
    if (slot) {
      slot.phase = options.phase;
      slot.isStarting = false;
      slot.isRunning = true;
      this.syncStateFromSlots();
      this.touchSlot(slot, options.phase, options.message);
    } else {
      this.touch(options.phase, options.message);
    }

    this.logger.info("Lifecycle /codex_chat: session-finalized", {
      chatId: activeSession.chatId,
      sessionId: this.state.lastCodexChatSessionClosure?.sessionId ?? sessionId,
      reason: options.closureReason,
      phase: this.state.lastCodexChatSessionClosure?.phase ?? null,
      triggeringCommand: options.triggeringCommand ?? null,
      message: options.message,
      activeProjectName: this.state.lastCodexChatSessionClosure?.activeProjectSnapshot.name,
      activeProjectPath: this.state.lastCodexChatSessionClosure?.activeProjectSnapshot.path,
    });

    if (options.notifyMessage) {
      await this.emitCodexChatLifecycleMessage(activeSession.chatId, options.notifyMessage);
    }
  }

  private async emitCodexChatOutput(
    chatId: string,
    event: Extract<CodexChatSessionEvent, { type: "raw-sanitized" }>,
  ): Promise<void> {
    if (!this.codexChatEventHandlers) {
      return;
    }

    try {
      await this.codexChatEventHandlers.onOutput(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar saida de /codex_chat para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitCodexChatFailure(chatId: string, details: string): Promise<void> {
    if (!this.codexChatEventHandlers) {
      return;
    }

    try {
      await this.codexChatEventHandlers.onFailure(chatId, details);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar erro de /codex_chat para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitCodexChatLifecycleMessage(chatId: string, message: string): Promise<void> {
    if (!this.codexChatEventHandlers?.onLifecycleMessage) {
      return;
    }

    try {
      await this.codexChatEventHandlers.onLifecycleMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar mensagem de lifecycle de /codex_chat", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private setDiscoverSpecPhase(
    phase: DiscoverSpecSessionPhase,
    runnerPhase: RunnerState["phase"],
    message: string,
  ): void {
    const discoverSpecSession = this.state.discoverSpecSession;
    const activeSession = this.activeDiscoverSpecSession;
    if (!discoverSpecSession || !activeSession) {
      return;
    }

    const now = this.now();
    discoverSpecSession.phase = phase;
    discoverSpecSession.lastActivityAt = now;
    if (phase === "waiting-codex") {
      if (!discoverSpecSession.waitingCodexSinceAt) {
        discoverSpecSession.waitingCodexSinceAt = now;
      }
    } else {
      discoverSpecSession.waitingCodexSinceAt = null;
    }
    this.refreshDiscoverSpecTimeout(activeSession.id);
    this.refreshDiscoverSpecCodexHeartbeat(activeSession.id);

    const slot = this.activeSlots.get(activeSession.slotKey);
    if (slot) {
      this.touchSlot(slot, runnerPhase, message);
      return;
    }

    this.touch(runnerPhase, message);
  }

  private refreshDiscoverSpecTimeout(sessionId: number): void {
    const activeSession = this.activeDiscoverSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
    }

    activeSession.timeoutHandle = this.setTimer(() => {
      void this.handleDiscoverSpecSessionTimeout(sessionId);
    }, this.discoverSpecSessionTimeoutMs);
    activeSession.timeoutHandle.unref?.();
  }

  private refreshDiscoverSpecCodexHeartbeat(sessionId: number): void {
    const activeSession = this.activeDiscoverSpecSession;
    const discoverSpecSession = this.state.discoverSpecSession;
    if (!activeSession || !discoverSpecSession || activeSession.id !== sessionId) {
      return;
    }

    this.clearDiscoverSpecCodexHeartbeat(sessionId);
    if (discoverSpecSession.phase !== "waiting-codex") {
      return;
    }

    activeSession.heartbeatHandle = this.setTimer(() => {
      void this.handleDiscoverSpecCodexHeartbeat(sessionId);
    }, PLAN_SPEC_WAITING_CODEX_HEARTBEAT_MS);
    activeSession.heartbeatHandle.unref?.();
  }

  private clearDiscoverSpecCodexHeartbeat(sessionId: number): void {
    const activeSession = this.activeDiscoverSpecSession;
    if (!activeSession || activeSession.id !== sessionId || !activeSession.heartbeatHandle) {
      return;
    }

    this.clearTimer(activeSession.heartbeatHandle);
    activeSession.heartbeatHandle = null;
  }

  private async handleDiscoverSpecCodexHeartbeat(sessionId: number): Promise<void> {
    const activeSession = this.activeDiscoverSpecSession;
    const discoverSpecSession = this.state.discoverSpecSession;
    if (!activeSession || !discoverSpecSession || activeSession.id !== sessionId) {
      return;
    }

    activeSession.heartbeatHandle = null;
    if (discoverSpecSession.phase !== "waiting-codex") {
      return;
    }

    const now = this.now();
    const waitingSince =
      discoverSpecSession.waitingCodexSinceAt ?? discoverSpecSession.lastActivityAt;
    const waitingMs = Math.max(0, now.getTime() - waitingSince.getTime());
    const lastCodexAgeMs = discoverSpecSession.lastCodexActivityAt
      ? Math.max(0, now.getTime() - discoverSpecSession.lastCodexActivityAt.getTime())
      : null;

    this.logger.info("Sessao /discover_spec ainda aguardando retorno do Codex", {
      chatId: activeSession.chatId,
      phase: discoverSpecSession.phase,
      waitingMs,
      timeoutMs: this.discoverSpecSessionTimeoutMs,
      lastCodexAgeMs,
      lastCodexStream: discoverSpecSession.lastCodexStream,
      lastCodexPreview: discoverSpecSession.lastCodexPreview,
      activeProjectName: discoverSpecSession.activeProjectSnapshot.name,
      activeProjectPath: discoverSpecSession.activeProjectSnapshot.path,
    });

    const lastLifecycleAt = activeSession.lastHeartbeatLifecycleMessageAt;
    if (
      !lastLifecycleAt ||
      now.getTime() - lastLifecycleAt.getTime() >= PLAN_SPEC_WAITING_CODEX_LIFECYCLE_NOTIFY_EVERY_MS
    ) {
      activeSession.lastHeartbeatLifecycleMessageAt = now;
      const waitingSeconds = Math.floor(waitingMs / 1000);
      const codexTail = discoverSpecSession.lastCodexPreview
        ? ` Última saída observada (${discoverSpecSession.lastCodexStream ?? "stdout"}): ${discoverSpecSession.lastCodexPreview.slice(0, 160)}`
        : " Ainda sem saída observável do Codex CLI.";
      await this.emitDiscoverSpecLifecycleMessage(
        activeSession.chatId,
        `Sessao /discover_spec aguardando resposta do Codex ha ${String(waitingSeconds)}s.${codexTail}`,
      );
    }

    this.refreshDiscoverSpecCodexHeartbeat(sessionId);
  }

  private async handleDiscoverSpecSessionTimeout(sessionId: number): Promise<void> {
    const activeSession = this.activeDiscoverSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    this.logger.warn("Sessao /discover_spec expirada por inatividade", {
      chatId: activeSession.chatId,
      timeoutMs: this.discoverSpecSessionTimeoutMs,
      phase: this.state.discoverSpecSession?.phase,
      waitingCodexSinceAt: this.state.discoverSpecSession?.waitingCodexSinceAt?.toISOString() ?? null,
      lastCodexActivityAt:
        this.state.discoverSpecSession?.lastCodexActivityAt?.toISOString() ?? null,
      lastCodexStream: this.state.discoverSpecSession?.lastCodexStream ?? null,
      lastCodexPreview: this.state.discoverSpecSession?.lastCodexPreview ?? null,
      activeProjectName: this.state.discoverSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.discoverSpecSession?.activeProjectSnapshot.path,
    });

    await this.finalizeDiscoverSpecSession(sessionId, {
      mode: "cancel",
      phase: "idle",
      message: DISCOVER_SPEC_TIMEOUT_MESSAGE,
      notifyMessage: DISCOVER_SPEC_TIMEOUT_MESSAGE,
    });
  }

  private async handleDiscoverSpecSessionEvent(
    sessionId: number,
    event: DiscoverSpecSessionEvent,
  ): Promise<void> {
    const activeSession = this.activeDiscoverSpecSession;
    const discoverSpecSession = this.state.discoverSpecSession;
    if (!activeSession || !discoverSpecSession || activeSession.id !== sessionId) {
      return;
    }

    discoverSpecSession.lastActivityAt = this.now();
    this.refreshDiscoverSpecTimeout(sessionId);

    if (event.type === "activity") {
      this.recordDiscoverSpecCodexActivity(activeSession, discoverSpecSession, event);
      this.refreshDiscoverSpecCodexHeartbeat(sessionId);
      return;
    }

    if (event.type === "turn-context") {
      this.recordDiscoverSpecTurnContext(activeSession, discoverSpecSession, sessionId, event);
      this.refreshDiscoverSpecCodexHeartbeat(sessionId);
      return;
    }

    if (event.type === "question") {
      discoverSpecSession.createSpecEligible = false;
      discoverSpecSession.createSpecBlockReason =
        discoverSpecSession.pendingItems.length > 0
          ? this.buildDiscoverSpecBlockReason(discoverSpecSession.pendingItems)
          : "A entrevista de /discover_spec ainda esta em andamento.";
      this.setDiscoverSpecPhase(
        "waiting-user",
        "discover-spec-waiting-user",
        "Sessao /discover_spec aguardando resposta do operador",
      );
      await this.emitDiscoverSpecQuestion(activeSession.chatId, event);
      return;
    }

    if (event.type === "final") {
      const latestFinalBlock = this.clonePlanSpecFinalBlock(event.final);
      const evaluation = this.evaluateDiscoverSpecFinalBlock(latestFinalBlock);
      activeSession.latestFinalBlock = latestFinalBlock;
      discoverSpecSession.latestFinalBlock = latestFinalBlock;
      discoverSpecSession.categoryCoverage = evaluation.categoryCoverage;
      discoverSpecSession.pendingItems = evaluation.pendingItems;
      discoverSpecSession.createSpecEligible = evaluation.pendingItems.length === 0;
      discoverSpecSession.createSpecBlockReason = evaluation.blockReason;

      if (evaluation.pendingItems.length > 0) {
        await this.requestDiscoverSpecFollowUpForPendingItems(
          sessionId,
          activeSession,
          discoverSpecSession,
          evaluation.pendingItems,
        );
        return;
      }

      this.setDiscoverSpecPhase(
        "awaiting-final-action",
        "discover-spec-awaiting-final-action",
        "Sessao /discover_spec aguardando acao final do operador",
      );
      await this.emitDiscoverSpecFinal(activeSession.chatId, event);
      return;
    }

    if (event.type === "turn-complete") {
      if (discoverSpecSession.phase !== "awaiting-final-action") {
        this.setDiscoverSpecPhase(
          "waiting-user",
          "discover-spec-waiting-user",
          "Sessao /discover_spec aguardando resposta do operador",
        );
      }
      return;
    }

    if (discoverSpecSession.phase === "awaiting-brief") {
      this.logger.info(
        "Saida raw da sessao /discover_spec suprimida durante aguardando brief inicial",
        {
          chatId: activeSession.chatId,
          preview: event.text.slice(0, 180),
        },
      );
      return;
    }

    if (this.shouldThrottleDiscoverSpecRawOutput(activeSession, discoverSpecSession)) {
      return;
    }

    this.logger.info("Sessao /discover_spec recebeu saida textual do Codex", {
      chatId: activeSession.chatId,
      phase: discoverSpecSession.phase,
      preview: event.text.slice(0, 180),
      activeProjectName: discoverSpecSession.activeProjectSnapshot.name,
      activeProjectPath: discoverSpecSession.activeProjectSnapshot.path,
    });
    await this.emitDiscoverSpecOutput(activeSession.chatId, event);
  }

  private async requestDiscoverSpecFollowUpForPendingItems(
    sessionId: number,
    activeSession: ActiveDiscoverSpecSession,
    discoverSpecSession: NonNullable<RunnerState["discoverSpecSession"]>,
    pendingItems: DiscoverSpecPendingItem[],
  ): Promise<void> {
    const followUpPrompt = this.buildDiscoverSpecRefinementPrompt(pendingItems);
    const lifecycleMessage = this.buildDiscoverSpecPendingItemsLifecycleMessage(pendingItems);
    this.logger.info("Sessao /discover_spec solicitando follow-up para pendencias criticas", {
      chatId: activeSession.chatId,
      sessionId,
      pendingItems: pendingItems.map((item) => ({
        kind: item.kind,
        key: item.key,
        label: item.label,
        detail: item.detail,
      })),
      activeProjectName: discoverSpecSession.activeProjectSnapshot.name,
      activeProjectPath: discoverSpecSession.activeProjectSnapshot.path,
    });

    try {
      const pendingSend = activeSession.session.sendUserInput(followUpPrompt);
      this.setDiscoverSpecPhase(
        "waiting-codex",
        "discover-spec-waiting-codex",
        "Sessao /discover_spec solicitou follow-up para tratar pendencias criticas",
      );
      await this.emitDiscoverSpecLifecycleMessage(activeSession.chatId, lifecycleMessage);
      void pendingSend.catch((error) => {
        void this.handleDiscoverSpecSessionFailure(sessionId, error);
      });
    } catch (error) {
      await this.handleDiscoverSpecSessionFailure(sessionId, error);
    }
  }

  private evaluateDiscoverSpecFinalBlock(finalBlock: PlanSpecFinalBlock): {
    categoryCoverage: DiscoverSpecCategoryCoverageRecord;
    pendingItems: DiscoverSpecPendingItem[];
    blockReason: string | null;
  } {
    const categoryCoverage = createDiscoverSpecCategoryCoverageRecord(finalBlock.categoryCoverage);
    const pendingItems = this.buildDiscoverSpecCategoryPendingItems(categoryCoverage);
    for (const [index, ambiguity] of finalBlock.criticalAmbiguities.entries()) {
      const detail = ambiguity.trim();
      if (!detail) {
        continue;
      }

      pendingItems.push({
        kind: "ambiguity",
        key: `ambiguity-${index + 1}`,
        label: `Ambiguidade critica ${index + 1}`,
        detail,
      });
    }

    return {
      categoryCoverage,
      pendingItems,
      blockReason: pendingItems.length > 0
        ? this.buildDiscoverSpecBlockReason(pendingItems)
        : null,
    };
  }

  private buildDiscoverSpecCategoryPendingItems(
    categoryCoverage: DiscoverSpecCategoryCoverageRecord,
  ): DiscoverSpecPendingItem[] {
    return listDiscoverSpecCategoryCoverage(categoryCoverage)
      .filter((item) => item.status === "pending")
      .map((item) => ({
        kind: "category" as const,
        key: item.categoryId,
        label: item.label || getDiscoverSpecCategoryLabel(item.categoryId),
        detail: item.detail || "Categoria obrigatoria ainda sem cobertura explicita ou motivo de nao aplicabilidade.",
      }));
  }

  private buildDiscoverSpecBlockReason(pendingItems: readonly DiscoverSpecPendingItem[]): string {
    const details = pendingItems
      .slice(0, 3)
      .map((item) => `${item.label}: ${item.detail}`)
      .join("; ");
    const suffix = pendingItems.length > 3 ? " ..." : "";
    return `A descoberta ainda possui lacunas criticas: ${details}${suffix}`;
  }

  private buildDiscoverSpecPendingItemsLifecycleMessage(
    pendingItems: readonly DiscoverSpecPendingItem[],
  ): string {
    const lines = [
      "🧭 A descoberta ainda possui lacunas criticas; solicitei follow-up ao Codex antes de liberar `Criar spec`.",
      "Pendencias atuais:",
      ...pendingItems.map((item) => `- ${item.label}: ${item.detail}`),
    ];

    return lines.join("\n");
  }

  private buildDiscoverSpecRefinementPrompt(
    pendingItems: readonly DiscoverSpecPendingItem[],
  ): string {
    const lines = [
      "Refinar a entrevista de /discover_spec.",
      "Ainda existem pendencias criticas antes da finalizacao elegivel.",
      "Pendencias atuais:",
      ...pendingItems.map((item, index) => `${index + 1}. ${item.label}: ${item.detail}`),
      "",
      "Faca a menor pergunta objetiva necessaria para fechar a pendencia mais critica.",
      "Se todas as pendencias ja puderem ser tratadas com defaults ou nao-escopo aprovados, devolva um novo [[PLAN_SPEC_FINAL]] completo e consistente.",
    ];

    return lines.join("\n");
  }

  private clonePlanSpecFinalBlock(finalBlock: PlanSpecFinalBlock): PlanSpecFinalBlock {
    return {
      title: finalBlock.title,
      summary: finalBlock.summary,
      outline: this.clonePlanSpecFinalOutline(finalBlock.outline),
      categoryCoverage: finalBlock.categoryCoverage.map((item) => ({ ...item })),
      assumptionsAndDefaults: [...finalBlock.assumptionsAndDefaults],
      decisionsAndTradeOffs: [...finalBlock.decisionsAndTradeOffs],
      criticalAmbiguities: [...finalBlock.criticalAmbiguities],
      actions: finalBlock.actions.map((action) => ({ ...action })),
    };
  }

  private recordDiscoverSpecTurnContext(
    activeSession: ActiveDiscoverSpecSession,
    discoverSpecSession: NonNullable<RunnerState["discoverSpecSession"]>,
    sessionId: number,
    event: Extract<DiscoverSpecSessionEvent, { type: "turn-context" }>,
  ): void {
    const observedAt = this.now();
    discoverSpecSession.observedModel = event.model;
    discoverSpecSession.observedReasoningEffort = event.reasoningEffort;
    discoverSpecSession.observedAt = observedAt;
    discoverSpecSession.lastActivityAt = observedAt;

    this.logger.info("Lifecycle /discover_spec: turn-context observado", {
      chatId: activeSession.chatId,
      sessionId,
      model: event.model,
      reasoningEffort: event.reasoningEffort,
      activeProjectName: discoverSpecSession.activeProjectSnapshot.name,
      activeProjectPath: discoverSpecSession.activeProjectSnapshot.path,
    });
  }

  private shouldThrottleDiscoverSpecRawOutput(
    activeSession: ActiveDiscoverSpecSession,
    discoverSpecSession: NonNullable<RunnerState["discoverSpecSession"]>,
  ): boolean {
    if (discoverSpecSession.phase !== "waiting-codex") {
      return false;
    }

    const now = this.now();
    const lastForwardAt = activeSession.lastRawOutputForwardAt;
    if (
      lastForwardAt &&
      now.getTime() - lastForwardAt.getTime() < PLAN_SPEC_RAW_OUTPUT_FORWARD_MIN_INTERVAL_MS
    ) {
      activeSession.suppressedRawOutputCount += 1;
      return true;
    }

    if (activeSession.suppressedRawOutputCount > 0) {
      this.logger.info("Saida raw do Codex suprimida para evitar flood na sessao /discover_spec", {
        chatId: activeSession.chatId,
        phase: discoverSpecSession.phase,
        suppressedChunks: activeSession.suppressedRawOutputCount,
        minIntervalMs: PLAN_SPEC_RAW_OUTPUT_FORWARD_MIN_INTERVAL_MS,
        activeProjectName: discoverSpecSession.activeProjectSnapshot.name,
        activeProjectPath: discoverSpecSession.activeProjectSnapshot.path,
      });
      activeSession.suppressedRawOutputCount = 0;
    }

    activeSession.lastRawOutputForwardAt = now;
    return false;
  }

  private recordDiscoverSpecCodexActivity(
    activeSession: ActiveDiscoverSpecSession,
    discoverSpecSession: NonNullable<RunnerState["discoverSpecSession"]>,
    event: Extract<DiscoverSpecSessionEvent, { type: "activity" }>,
  ): void {
    const now = this.now();
    const preview = event.activity.preview.trim();
    discoverSpecSession.lastCodexActivityAt = now;
    if (preview.length > 0) {
      discoverSpecSession.lastCodexStream = event.activity.source;
      discoverSpecSession.lastCodexPreview = preview;
    } else {
      return;
    }

    const shouldLogActivity =
      !activeSession.lastCodexActivityLogAt ||
      now.getTime() - activeSession.lastCodexActivityLogAt.getTime() >=
        PLAN_SPEC_CODEX_ACTIVITY_LOG_INTERVAL_MS;
    if (!shouldLogActivity) {
      return;
    }

    activeSession.lastCodexActivityLogAt = now;
    this.logger.info("Atividade do Codex observada na sessao /discover_spec", {
      chatId: activeSession.chatId,
      phase: discoverSpecSession.phase,
      source: event.activity.source,
      bytes: event.activity.bytes,
      preview: discoverSpecSession.lastCodexPreview,
      activeProjectName: discoverSpecSession.activeProjectSnapshot.name,
      activeProjectPath: discoverSpecSession.activeProjectSnapshot.path,
    });
  }

  private async handleDiscoverSpecSessionFailure(
    sessionId: number,
    error: unknown,
  ): Promise<void> {
    const activeSession = this.activeDiscoverSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    const details = error instanceof Error ? error.message : String(error);
    this.logger.error("Falha na sessao /discover_spec", {
      chatId: activeSession.chatId,
      error: details,
      phase: this.state.discoverSpecSession?.phase,
      activeProjectName: this.state.discoverSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.discoverSpecSession?.activeProjectSnapshot.path,
    });

    await this.finalizeDiscoverSpecSession(sessionId, {
      mode: "cancel",
      phase: "error",
      message: "Falha na sessao /discover_spec",
    });
    await this.emitDiscoverSpecFailure(activeSession.chatId, details);
  }

  private async handleDiscoverSpecSessionClose(
    sessionId: number,
    result: DiscoverSpecSessionCloseResult,
  ): Promise<void> {
    const activeSession = this.activeDiscoverSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (result.cancelled) {
      await this.finalizeDiscoverSpecSession(sessionId, {
        mode: "closed",
        phase: "idle",
        message: DISCOVER_SPEC_CANCELLED_MESSAGE,
      });
      return;
    }

    const message = `Sessao /discover_spec encerrada inesperadamente (exit code: ${String(result.exitCode)}).`;
    this.logger.warn("Sessao /discover_spec encerrada sem cancelamento explicito", {
      chatId: activeSession.chatId,
      exitCode: result.exitCode,
      activeProjectName: this.state.discoverSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.discoverSpecSession?.activeProjectSnapshot.path,
    });
    await this.finalizeDiscoverSpecSession(sessionId, {
      mode: "closed",
      phase: "error",
      message,
    });
    await this.emitDiscoverSpecFailure(activeSession.chatId, message);
  }

  private async finalizeDiscoverSpecSession(
    sessionId: number,
    options: {
      mode: "cancel" | "closed";
      phase: RunnerState["phase"];
      message: string;
      notifyMessage?: string;
      releaseSlot?: boolean;
    },
  ): Promise<void> {
    const activeSession = this.activeDiscoverSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
    }
    if (activeSession.heartbeatHandle) {
      this.clearTimer(activeSession.heartbeatHandle);
    }

    this.activeDiscoverSpecSession = null;
    this.state.discoverSpecSession = null;

    if (options.mode === "cancel") {
      try {
        await activeSession.session.cancel();
      } catch (error) {
        this.logger.warn("Falha ao cancelar processo da sessao /discover_spec", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const shouldReleaseSlot = options.releaseSlot ?? true;
    if (shouldReleaseSlot) {
      this.releaseSlot(activeSession.slotKey);
    }

    const slot = this.activeSlots.get(activeSession.slotKey);
    if (slot) {
      slot.phase = options.phase;
      slot.isStarting = false;
      slot.isRunning = true;
      this.syncStateFromSlots();
      this.touchSlot(slot, options.phase, options.message);
    } else {
      this.touch(options.phase, options.message);
    }

    if (options.notifyMessage) {
      await this.emitDiscoverSpecLifecycleMessage(activeSession.chatId, options.notifyMessage);
    }
  }

  private async emitDiscoverSpecOutput(
    chatId: string,
    event: Extract<DiscoverSpecSessionEvent, { type: "raw-sanitized" }>,
  ): Promise<void> {
    if (!this.discoverSpecEventHandlers) {
      return;
    }

    try {
      await this.discoverSpecEventHandlers.onOutput(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar saida de /discover_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitDiscoverSpecQuestion(
    chatId: string,
    event: Extract<DiscoverSpecSessionEvent, { type: "question" }>,
  ): Promise<void> {
    if (!this.discoverSpecEventHandlers?.onQuestion) {
      return;
    }

    try {
      await this.discoverSpecEventHandlers.onQuestion(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar pergunta de /discover_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitDiscoverSpecFinal(
    chatId: string,
    event: Extract<DiscoverSpecSessionEvent, { type: "final" }>,
  ): Promise<void> {
    if (!this.discoverSpecEventHandlers?.onFinal) {
      return;
    }

    try {
      await this.discoverSpecEventHandlers.onFinal(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar finalizacao de /discover_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitDiscoverSpecFailure(chatId: string, details: string): Promise<void> {
    if (!this.discoverSpecEventHandlers) {
      return;
    }

    try {
      await this.discoverSpecEventHandlers.onFailure(chatId, details);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar erro de /discover_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitDiscoverSpecLifecycleMessage(chatId: string, message: string): Promise<void> {
    if (!this.discoverSpecEventHandlers?.onLifecycleMessage) {
      return;
    }

    try {
      await this.discoverSpecEventHandlers.onLifecycleMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar mensagem de lifecycle de /discover_spec", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private setPlanSpecPhase(
    phase: PlanSpecSessionPhase,
    runnerPhase: RunnerState["phase"],
    message: string,
  ): void {
    const planSpecSession = this.state.planSpecSession;
    const activeSession = this.activePlanSpecSession;
    if (!planSpecSession || !activeSession) {
      return;
    }

    const now = this.now();
    planSpecSession.phase = phase;
    planSpecSession.lastActivityAt = now;
    if (phase === "waiting-codex") {
      if (!planSpecSession.waitingCodexSinceAt) {
        planSpecSession.waitingCodexSinceAt = now;
      }
    } else {
      planSpecSession.waitingCodexSinceAt = null;
    }
    this.refreshPlanSpecTimeout(activeSession.id);
    this.refreshPlanSpecCodexHeartbeat(activeSession.id);

    const slot = this.activeSlots.get(activeSession.slotKey);
    if (slot) {
      this.touchSlot(slot, runnerPhase, message);
      return;
    }

    this.touch(runnerPhase, message);
  }

  private refreshPlanSpecTimeout(sessionId: number): void {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
    }

    activeSession.timeoutHandle = this.setTimer(() => {
      void this.handlePlanSpecSessionTimeout(sessionId);
    }, this.planSpecSessionTimeoutMs);
    activeSession.timeoutHandle.unref?.();
  }

  private refreshPlanSpecCodexHeartbeat(sessionId: number): void {
    const activeSession = this.activePlanSpecSession;
    const planSpecSession = this.state.planSpecSession;
    if (!activeSession || !planSpecSession || activeSession.id !== sessionId) {
      return;
    }

    this.clearPlanSpecCodexHeartbeat(sessionId);
    if (planSpecSession.phase !== "waiting-codex") {
      return;
    }

    activeSession.heartbeatHandle = this.setTimer(() => {
      void this.handlePlanSpecCodexHeartbeat(sessionId);
    }, PLAN_SPEC_WAITING_CODEX_HEARTBEAT_MS);
    activeSession.heartbeatHandle.unref?.();
  }

  private clearPlanSpecCodexHeartbeat(sessionId: number): void {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId || !activeSession.heartbeatHandle) {
      return;
    }

    this.clearTimer(activeSession.heartbeatHandle);
    activeSession.heartbeatHandle = null;
  }

  private async handlePlanSpecCodexHeartbeat(sessionId: number): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    const planSpecSession = this.state.planSpecSession;
    if (!activeSession || !planSpecSession || activeSession.id !== sessionId) {
      return;
    }

    activeSession.heartbeatHandle = null;
    if (planSpecSession.phase !== "waiting-codex") {
      return;
    }

    const now = this.now();
    const waitingSince = planSpecSession.waitingCodexSinceAt ?? planSpecSession.lastActivityAt;
    const waitingMs = Math.max(0, now.getTime() - waitingSince.getTime());
    const lastCodexAgeMs = planSpecSession.lastCodexActivityAt
      ? Math.max(0, now.getTime() - planSpecSession.lastCodexActivityAt.getTime())
      : null;

    this.logger.info("Sessao /plan_spec ainda aguardando retorno do Codex", {
      chatId: activeSession.chatId,
      phase: planSpecSession.phase,
      waitingMs,
      timeoutMs: this.planSpecSessionTimeoutMs,
      lastCodexAgeMs,
      lastCodexStream: planSpecSession.lastCodexStream,
      lastCodexPreview: planSpecSession.lastCodexPreview,
      activeProjectName: planSpecSession.activeProjectSnapshot.name,
      activeProjectPath: planSpecSession.activeProjectSnapshot.path,
    });

    const lastLifecycleAt = activeSession.lastHeartbeatLifecycleMessageAt;
    if (
      !lastLifecycleAt ||
      now.getTime() - lastLifecycleAt.getTime() >= PLAN_SPEC_WAITING_CODEX_LIFECYCLE_NOTIFY_EVERY_MS
    ) {
      activeSession.lastHeartbeatLifecycleMessageAt = now;
      const waitingSeconds = Math.floor(waitingMs / 1000);
      const codexTail = planSpecSession.lastCodexPreview
        ? ` Última saída observada (${planSpecSession.lastCodexStream ?? "stdout"}): ${planSpecSession.lastCodexPreview.slice(0, 160)}`
        : " Ainda sem saída observável do Codex CLI.";
      await this.emitPlanSpecLifecycleMessage(
        activeSession.chatId,
        `Sessao /plan_spec aguardando resposta do Codex ha ${String(waitingSeconds)}s.${codexTail}`,
      );
    }

    this.refreshPlanSpecCodexHeartbeat(sessionId);
  }

  private async handlePlanSpecSessionTimeout(sessionId: number): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    this.logger.warn("Sessao /plan_spec expirada por inatividade", {
      chatId: activeSession.chatId,
      timeoutMs: this.planSpecSessionTimeoutMs,
      phase: this.state.planSpecSession?.phase,
      waitingCodexSinceAt: this.state.planSpecSession?.waitingCodexSinceAt?.toISOString() ?? null,
      lastCodexActivityAt:
        this.state.planSpecSession?.lastCodexActivityAt?.toISOString() ?? null,
      lastCodexStream: this.state.planSpecSession?.lastCodexStream ?? null,
      lastCodexPreview: this.state.planSpecSession?.lastCodexPreview ?? null,
      activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.planSpecSession?.activeProjectSnapshot.path,
    });

    await this.finalizePlanSpecSession(sessionId, {
      mode: "cancel",
      phase: "idle",
      message: PLAN_SPEC_TIMEOUT_MESSAGE,
      notifyMessage: PLAN_SPEC_TIMEOUT_MESSAGE,
    });
  }

  private async handlePlanSpecSessionEvent(
    sessionId: number,
    event: PlanSpecSessionEvent,
  ): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    const planSpecSession = this.state.planSpecSession;
    if (!activeSession || !planSpecSession || activeSession.id !== sessionId) {
      return;
    }

    planSpecSession.lastActivityAt = this.now();
    this.refreshPlanSpecTimeout(sessionId);

    if (event.type === "activity") {
      this.recordPlanSpecCodexActivity(activeSession, planSpecSession, event);
      this.refreshPlanSpecCodexHeartbeat(sessionId);
      return;
    }

    if (event.type === "turn-context") {
      this.recordPlanSpecTurnContext(activeSession, planSpecSession, sessionId, event);
      this.refreshPlanSpecCodexHeartbeat(sessionId);
      return;
    }

    if (event.type === "question") {
      activeSession.latestFinalBlock = null;
      this.setPlanSpecPhase(
        "waiting-user",
        "plan-spec-waiting-user",
        "Sessao /plan_spec aguardando resposta do operador",
      );
      await this.emitPlanSpecQuestion(activeSession.chatId, event);
      return;
    }

    if (event.type === "final") {
      activeSession.latestFinalBlock = this.clonePlanSpecFinalBlock(event.final);
      this.setPlanSpecPhase(
        "awaiting-final-action",
        "plan-spec-awaiting-final-action",
        "Sessao /plan_spec aguardando acao final do operador",
      );
      await this.emitPlanSpecFinal(activeSession.chatId, event);
      return;
    }

    if (planSpecSession.phase === "awaiting-brief") {
      this.logger.info("Saida raw da sessao /plan_spec suprimida durante aguardando brief inicial", {
        chatId: activeSession.chatId,
        preview: event.text.slice(0, 180),
      });
      return;
    }

    if (this.shouldThrottlePlanSpecRawOutput(activeSession, planSpecSession)) {
      return;
    }

    this.logger.info("Sessao /plan_spec recebeu saida nao parseavel do Codex", {
      chatId: activeSession.chatId,
      phase: planSpecSession.phase,
      preview: event.text.slice(0, 180),
      activeProjectName: planSpecSession.activeProjectSnapshot.name,
      activeProjectPath: planSpecSession.activeProjectSnapshot.path,
    });
    await this.emitPlanSpecRawOutput(activeSession.chatId, event);
  }

  private recordPlanSpecTurnContext(
    activeSession: ActivePlanSpecSession,
    planSpecSession: NonNullable<RunnerState["planSpecSession"]>,
    sessionId: number,
    event: Extract<PlanSpecSessionEvent, { type: "turn-context" }>,
  ): void {
    const observedAt = this.now();
    planSpecSession.observedModel = event.model;
    planSpecSession.observedReasoningEffort = event.reasoningEffort;
    planSpecSession.observedAt = observedAt;
    planSpecSession.lastActivityAt = observedAt;

    this.logger.info("Lifecycle /plan_spec: turn-context observado", {
      chatId: activeSession.chatId,
      sessionId,
      model: event.model,
      reasoningEffort: event.reasoningEffort,
      activeProjectName: planSpecSession.activeProjectSnapshot.name,
      activeProjectPath: planSpecSession.activeProjectSnapshot.path,
    });
  }

  private shouldThrottlePlanSpecRawOutput(
    activeSession: ActivePlanSpecSession,
    planSpecSession: NonNullable<RunnerState["planSpecSession"]>,
  ): boolean {
    if (planSpecSession.phase !== "waiting-codex") {
      return false;
    }

    const now = this.now();
    const lastForwardAt = activeSession.lastRawOutputForwardAt;
    if (
      lastForwardAt &&
      now.getTime() - lastForwardAt.getTime() < PLAN_SPEC_RAW_OUTPUT_FORWARD_MIN_INTERVAL_MS
    ) {
      activeSession.suppressedRawOutputCount += 1;
      return true;
    }

    if (activeSession.suppressedRawOutputCount > 0) {
      this.logger.info("Saida raw do Codex suprimida para evitar flood na sessao /plan_spec", {
        chatId: activeSession.chatId,
        phase: planSpecSession.phase,
        suppressedChunks: activeSession.suppressedRawOutputCount,
        minIntervalMs: PLAN_SPEC_RAW_OUTPUT_FORWARD_MIN_INTERVAL_MS,
        activeProjectName: planSpecSession.activeProjectSnapshot.name,
        activeProjectPath: planSpecSession.activeProjectSnapshot.path,
      });
      activeSession.suppressedRawOutputCount = 0;
    }

    activeSession.lastRawOutputForwardAt = now;
    return false;
  }

  private recordPlanSpecCodexActivity(
    activeSession: ActivePlanSpecSession,
    planSpecSession: NonNullable<RunnerState["planSpecSession"]>,
    event: Extract<PlanSpecSessionEvent, { type: "activity" }>,
  ): void {
    const now = this.now();
    const preview = event.activity.preview.trim();
    planSpecSession.lastCodexActivityAt = now;
    if (preview.length > 0) {
      planSpecSession.lastCodexStream = event.activity.source;
      planSpecSession.lastCodexPreview = preview;
    } else {
      return;
    }

    const shouldLogActivity =
      !activeSession.lastCodexActivityLogAt ||
      now.getTime() - activeSession.lastCodexActivityLogAt.getTime() >=
        PLAN_SPEC_CODEX_ACTIVITY_LOG_INTERVAL_MS;
    if (!shouldLogActivity) {
      return;
    }

    activeSession.lastCodexActivityLogAt = now;
    this.logger.info("Atividade do Codex observada na sessao /plan_spec", {
      chatId: activeSession.chatId,
      phase: planSpecSession.phase,
      source: event.activity.source,
      bytes: event.activity.bytes,
      preview: planSpecSession.lastCodexPreview,
      activeProjectName: planSpecSession.activeProjectSnapshot.name,
      activeProjectPath: planSpecSession.activeProjectSnapshot.path,
    });
  }

  private async handlePlanSpecSessionFailure(sessionId: number, error: unknown): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    const details = error instanceof Error ? error.message : String(error);
    this.logger.error("Falha na sessao /plan_spec", {
      chatId: activeSession.chatId,
      error: details,
      phase: this.state.planSpecSession?.phase,
      activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.planSpecSession?.activeProjectSnapshot.path,
    });

    await this.finalizePlanSpecSession(sessionId, {
      mode: "cancel",
      phase: "error",
      message: "Falha na sessao /plan_spec",
    });
    await this.emitPlanSpecFailure(activeSession.chatId, details);
  }

  private async handlePlanSpecSessionClose(
    sessionId: number,
    result: PlanSpecSessionCloseResult,
  ): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (result.cancelled) {
      await this.finalizePlanSpecSession(sessionId, {
        mode: "closed",
        phase: "idle",
        message: PLAN_SPEC_CANCELLED_MESSAGE,
      });
      return;
    }

    const message = `Sessao /plan_spec encerrada inesperadamente (exit code: ${String(result.exitCode)}).`;
    this.logger.warn("Sessao /plan_spec encerrada sem cancelamento explicito", {
      chatId: activeSession.chatId,
      exitCode: result.exitCode,
      activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.planSpecSession?.activeProjectSnapshot.path,
    });
    await this.finalizePlanSpecSession(sessionId, {
      mode: "closed",
      phase: "error",
      message,
    });
    await this.emitPlanSpecFailure(activeSession.chatId, message);
  }

  private async finalizePlanSpecSession(
    sessionId: number,
    options: {
      mode: "cancel" | "closed";
      phase: RunnerState["phase"];
      message: string;
      notifyMessage?: string;
      releaseSlot?: boolean;
    },
  ): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
    }
    if (activeSession.heartbeatHandle) {
      this.clearTimer(activeSession.heartbeatHandle);
    }

    this.activePlanSpecSession = null;
    this.state.planSpecSession = null;

    if (options.mode === "cancel") {
      try {
        await activeSession.session.cancel();
      } catch (error) {
        this.logger.warn("Falha ao cancelar processo da sessao /plan_spec", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const shouldReleaseSlot = options.releaseSlot ?? true;
    if (shouldReleaseSlot) {
      this.releaseSlot(activeSession.slotKey);
    }

    const slot = this.activeSlots.get(activeSession.slotKey);
    if (slot) {
      slot.phase = options.phase;
      slot.isStarting = false;
      slot.isRunning = true;
      this.syncStateFromSlots();
      this.touchSlot(slot, options.phase, options.message);
    } else {
      this.touch(options.phase, options.message);
    }

    if (options.notifyMessage) {
      await this.emitPlanSpecLifecycleMessage(activeSession.chatId, options.notifyMessage);
    }
  }

  private async emitPlanSpecQuestion(
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "question" }>,
  ): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onQuestion(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar pergunta de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecFinal(
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "final" }>,
  ): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onFinal(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar finalizacao de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecRawOutput(
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "raw-sanitized" }>,
  ): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onRawOutput(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar saida bruta de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecFailure(chatId: string, details: string): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onFailure(chatId, details);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar erro de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecLifecycleMessage(chatId: string, message: string): Promise<void> {
    if (!this.planSpecEventHandlers?.onLifecycleMessage) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onLifecycleMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar mensagem de lifecycle de /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitRunSpecsTriageMilestone(event: RunSpecsTriageLifecycleEvent): Promise<void> {
    if (!this.runSpecsEventHandlers) {
      return;
    }

    try {
      await this.runSpecsEventHandlers.onTriageMilestone({
        ...event,
        spec: { ...event.spec },
        timing: this.cloneFlowTimingSnapshot(event.timing),
      });
    } catch (error) {
      this.logger.warn("Falha ao encaminhar milestone de triagem de /run_specs para integracao", {
        specFileName: event.spec.fileName,
        specPath: event.spec.path,
        outcome: event.outcome,
        finalStage: event.finalStage,
        totalDurationMs: event.timing.totalDurationMs,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitRunFlowCompleted(event: RunnerFlowSummary): Promise<void> {
    this.state.lastRunFlowSummary = this.cloneRunnerFlowSummary(event);
    this.state.updatedAt = new Date(event.timestampUtc);

    if (!this.runFlowEventHandlers) {
      return;
    }

    try {
      await this.runFlowEventHandlers.onFlowCompleted(this.cloneRunnerFlowSummary(event));
    } catch (error) {
      this.logger.warn("Falha ao encaminhar resumo final de fluxo para integracao", {
        flow: event.flow,
        outcome: event.outcome,
        finalStage: event.finalStage,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async prepareRunSlotStart(
    source: RunSlotPreflightSource,
  ): Promise<RunSlotStartPreflightResult> {
    const command =
      source === "run-all" ? "/run-all" : source === "run-specs" ? "/run_specs" : "/run_ticket";

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult(command);
    }

    let roundDependencies: RunnerRoundDependencies;
    try {
      roundDependencies = await this.resolveRoundDependencies();
      this.state.activeProject = { ...roundDependencies.activeProject };
      this.syncStateFromSlots();
    } catch (error) {
      const message = this.buildActiveProjectResolutionErrorMessage(error, source);
      this.touch("error", message);
      this.logger.error("Falha ao resolver projeto ativo antes da rodada", {
        command,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult(command);
    }

    const reservation = this.reserveSlot(roundDependencies, source);
    if (reservation.status === "blocked") {
      return reservation;
    }

    const slot = reservation.slot;
    try {
      await slot.codexClient.ensureAuthenticated();
    } catch (error) {
      this.releaseSlot(slot.key);
      const message =
        error instanceof CodexAuthenticationError
          ? error.message
          : [
              "Falha ao validar autenticacao do Codex CLI.",
              "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
            ].join(" ");
      this.touch("error", message);
      this.logger.error("Falha de autenticacao do Codex CLI antes da rodada", {
        command,
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    if (this.isShuttingDown) {
      this.releaseSlot(slot.key);
      return this.buildShutdownBlockedResult(command);
    }

    try {
      const fixedPreferences = await slot.codexClient.snapshotInvocationPreferences();
      slot.codexPreferencesSnapshot = this.normalizeFlowCodexPreferencesSnapshot(fixedPreferences);
      slot.codexClient = slot.codexClient.forkWithFixedInvocationPreferences(fixedPreferences);
      this.logger.info("Preferencias do Codex snapshotadas para slot multi-etapa", {
        command,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
        model: slot.codexPreferencesSnapshot?.model ?? null,
        reasoningEffort: slot.codexPreferencesSnapshot?.reasoningEffort ?? null,
        speed: slot.codexPreferencesSnapshot?.speed ?? null,
      });
    } catch (error) {
      this.releaseSlot(slot.key);
      const message = this.buildCodexPreferencesResolutionErrorMessage(slot.project, error);
      this.touch("error", message);
      this.logger.error("Falha ao snapshotar preferencias do Codex antes da rodada", {
        command,
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return {
        status: "blocked",
        reason: "codex-preferences-unavailable",
        message,
      };
    }

    slot.isStarting = false;
    slot.phase = "idle";
    this.syncStateFromSlots();

    this.logger.info("Autenticacao do Codex CLI validada para rodada", {
      command,
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
    });

    return { slot };
  }

  private startRunSlotLoop(slot: ActiveRunnerSlot, loopFactory: () => Promise<void>): void {
    slot.isRunning = true;
    slot.isStarting = false;
    this.syncStateFromSlots();

    slot.loopPromise = loopFactory()
      .catch((error) => {
        slot.isRunning = false;
        this.touchSlot(slot, "error", "Falha fatal no loop principal");
        this.logger.error("Erro fatal no loop principal", {
          error: error instanceof Error ? error.message : String(error),
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
      })
      .finally(() => {
        slot.loopPromise = null;
        slot.isStarting = false;
        slot.isRunning = false;
        slot.isPaused = false;
        slot.currentSpec = null;
        slot.currentTicket = null;
        this.releaseSlot(slot.key);
      });
  }

  private async runSpecsAndRunAll(slot: ActiveRunnerSlot, spec: SpecRef): Promise<void> {
    const triageTimingCollector = this.createFlowTimingCollector<RunSpecsTriageTimingStage>();
    const flowTimingCollector = this.createFlowTimingCollector<RunSpecsFlowTimingStage>();
    let runAllSummary: RunAllFlowSummary | undefined;
    let flowSummary: RunSpecsFlowSummary | null = null;
    let specTicketValidationSummary: RunSpecsTicketValidationSummary | undefined;
    let triageCompleted = false;
    slot.currentSpec = spec.fileName;
    this.touchSlot(slot, "select-spec", `Triagem da spec ${spec.fileName} iniciada`);

    const runTimedTriageStage = async (
      stage: Extract<RunSpecsTriageTimingStage, "spec-triage" | "spec-close-and-version">,
      message: string,
    ): Promise<void> => {
      const stageStartedAt = Date.now();
      try {
        await this.runSpecStage(slot, stage, spec, message);
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageFailure(triageTimingCollector, stage, durationMs);
        this.recordFlowStageFailure(flowTimingCollector, stage, durationMs);
        throw error;
      }
    };

    const runTimedSpecTicketValidationStage = async (
      message: string,
    ): Promise<RunSpecsTicketValidationSummary> => {
      const stage: Extract<RunSpecsTriageTimingStage, "spec-ticket-validation"> =
        "spec-ticket-validation";
      const stageStartedAt = Date.now();
      try {
        const execution = await this.runSpecTicketValidationStage(slot, spec, message);
        specTicketValidationSummary = execution.summary;
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        return execution.summary;
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageFailure(triageTimingCollector, stage, durationMs);
        this.recordFlowStageFailure(flowTimingCollector, stage, durationMs);
        if (error instanceof RunnerSpecTicketValidationStageError) {
          throw error;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new RunnerSpecTicketValidationStageError(errorMessage, error);
      }
    };

    const runTimedSpecAuditStage = async (message: string): Promise<void> => {
      const stage: Extract<RunSpecsFlowTimingStage, "spec-audit"> = "spec-audit";
      const stageStartedAt = Date.now();
      try {
        slot.currentSpec = spec.fileName;
        await this.runSpecStage(slot, stage, spec, message);
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageFailure(flowTimingCollector, stage, durationMs);
        throw error;
      }
    };

    try {
      await runTimedTriageStage(
        "spec-triage",
        `Executando etapa spec-triage para ${spec.fileName}`,
      );
      const validationSummary = await runTimedSpecTicketValidationStage(
        `Executando etapa spec-ticket-validation para ${spec.fileName}`,
      );
      if (validationSummary.verdict !== "GO") {
        const triageTiming = this.buildFlowTimingSnapshot(triageTimingCollector);
        this.logger.info("Gate spec-ticket-validation bloqueou continuidade do /run_specs", {
          spec: spec.fileName,
          specPath: spec.path,
          verdict: validationSummary.verdict,
          confidence: validationSummary.confidence,
          finalReason: validationSummary.finalReason,
          cyclesExecuted: validationSummary.cyclesExecuted,
          durationMs: triageTiming.totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        await this.emitRunSpecsTriageMilestone({
          spec: { ...spec },
          outcome: "failure",
          finalStage: "spec-ticket-validation",
          nextAction:
            "Rodada /run-all bloqueada pelo veredito NO_GO em spec-ticket-validation. Corrija os gaps e reexecute /run_specs.",
          details: validationSummary.summary,
          timing: triageTiming,
        });
        slot.currentSpec = null;
        this.touchSlot(
          slot,
          "idle",
          `Fluxo /run_specs bloqueado pelo gate spec-ticket-validation para ${spec.fileName}`,
        );
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: "spec-ticket-validation",
          completionReason: "spec-ticket-validation-no-go",
          details: validationSummary.summary,
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: validationSummary,
          runAllSummary,
        });
        return;
      }
      await runTimedTriageStage(
        "spec-close-and-version",
        `Executando etapa spec-close-and-version para ${spec.fileName}`,
      );
      const triageTiming = this.buildFlowTimingSnapshot(triageTimingCollector);
      this.logger.info("Triagem de spec concluida com sucesso", {
        spec: spec.fileName,
        specPath: spec.path,
        durationMs: triageTiming.totalDurationMs,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      await this.emitRunSpecsTriageMilestone({
        spec: { ...spec },
        outcome: "success",
        finalStage: "spec-close-and-version",
        nextAction:
          "Triagem e gate concluidos; iniciando rodada /run-all para processar tickets abertos.",
        timing: triageTiming,
      });
      triageCompleted = true;
      slot.currentSpec = null;
      this.touchSlot(
        slot,
        "idle",
        `Triagem da spec ${spec.fileName} concluida; iniciando rodada /run-all`,
      );
      runAllSummary = await this.runForever(slot);
      if (runAllSummary.outcome === "success") {
        this.recordFlowStageCompletion(
          flowTimingCollector,
          "run-all",
          runAllSummary.timing.totalDurationMs,
        );
        await runTimedSpecAuditStage(`Executando etapa spec-audit para ${spec.fileName}`);
        slot.currentSpec = null;
        this.touchSlot(slot, "idle", `Fluxo /run_specs finalizado para ${spec.fileName}`);
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "success",
          finalStage: "spec-audit",
          completionReason: "completed",
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: specTicketValidationSummary,
          runAllSummary,
        });
      } else {
        this.recordFlowStageFailure(
          flowTimingCollector,
          "run-all",
          runAllSummary.timing.totalDurationMs,
        );
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: "run-all",
          completionReason: "run-all-failure",
          details:
            runAllSummary.details ??
            "Fluxo /run-all interrompido durante a execucao encadeada de /run_specs.",
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: specTicketValidationSummary,
          runAllSummary,
        });
      }
    } catch (error) {
      const stage =
        (error instanceof CodexStageExecutionError &&
          (error.stage === "spec-triage" ||
            error.stage === "spec-close-and-version" ||
            error.stage === "spec-audit")) ||
        error instanceof RunnerSpecTicketValidationStageError
          ? error.stage
          : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      slot.isRunning = false;
      const finalStage: RunSpecsTriageFinalStage =
        stage === "spec-triage" ||
        stage === "spec-ticket-validation" ||
        stage === "spec-close-and-version"
          ? stage
          : "unknown";
      const triageFailed = !triageCompleted;

      if (triageFailed) {
        const failedAtCloseAndVersion = stage === "spec-close-and-version";
        const failedAtTicketValidation = stage === "spec-ticket-validation";
        const nextAction = failedAtCloseAndVersion
          ? "Rodada /run-all bloqueada. Corrija a falha de fechamento e reexecute /run_specs."
          : failedAtTicketValidation
            ? "Gate spec-ticket-validation interrompido por falha tecnica. Corrija a falha e reexecute /run_specs."
          : "Triagem interrompida antes do fechamento. Corrija a falha e reexecute /run_specs.";
        this.touchSlot(
          slot,
          "error",
          failedAtCloseAndVersion
            ? `Falha ao encerrar triagem da spec ${spec.fileName}; rodada /run-all bloqueada`
            : failedAtTicketValidation
              ? `Falha ao executar spec-ticket-validation da spec ${spec.fileName}; rodada /run-all bloqueada`
            : `Falha ao executar triagem da spec ${spec.fileName}`,
        );
        this.logger.error("Erro no ciclo de triagem de spec", {
          spec: spec.fileName,
          specPath: spec.path,
          stage,
          error: errorMessage,
          durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        await this.emitRunSpecsTriageMilestone({
          spec: { ...spec },
          outcome: "failure",
          finalStage,
          nextAction,
          details: errorMessage,
          timing: this.buildFlowTimingSnapshot(triageTimingCollector),
        });
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage,
          completionReason: failedAtTicketValidation
            ? "spec-ticket-validation-failure"
            : "triage-failure",
          details: errorMessage,
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: specTicketValidationSummary,
          runAllSummary,
        });
      } else if (stage === "spec-audit") {
        this.touchSlot(slot, "error", `Falha na auditoria final da spec ${spec.fileName}`);
        this.logger.error("Erro no fluxo /run_specs durante spec-audit", {
          spec: spec.fileName,
          specPath: spec.path,
          stage: "spec-audit",
          error: errorMessage,
          durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: "spec-audit",
          completionReason: "spec-audit-failure",
          details: errorMessage,
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: specTicketValidationSummary,
          runAllSummary,
        });
      } else {
        this.recordFlowStageFailure(flowTimingCollector, "run-all", 0);
        this.touchSlot(slot, "error", `Falha no /run-all encadeado apos triagem da spec ${spec.fileName}`);
        this.logger.error("Erro no fluxo /run_specs durante /run-all encadeado", {
          spec: spec.fileName,
          specPath: spec.path,
          stage: "run-all",
          error: errorMessage,
          durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: "run-all",
          completionReason: "run-all-failure",
          details: errorMessage,
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: specTicketValidationSummary,
          runAllSummary,
        });
      }
    } finally {
      const summary =
        flowSummary ??
        this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: "unknown",
          completionReason: "triage-failure",
          details: "Fluxo /run_specs interrompido antes da emissao do resumo final.",
          triageTimingCollector,
          flowTimingCollector,
          specTicketValidation: specTicketValidationSummary,
          runAllSummary,
        });
      await this.emitRunFlowCompleted(summary);
      slot.currentSpec = null;
      this.syncStateFromSlots();
    }
  }

  private async runSpecTicketValidationStage(
    slot: ActiveRunnerSlot,
    spec: SpecRef,
    message: string,
  ): Promise<{ summary: RunSpecsTicketValidationSummary }> {
    const phase: RunnerState["phase"] = "spec-ticket-validation";
    this.touchSlot(slot, phase, message);

    let packageContext: SpecTicketValidationPackageContext | null = null;
    let latestTurn: SpecTicketValidationSessionTurnResult | null = null;

    try {
      packageContext = await this.buildSpecTicketValidationPackageContext(slot.project.path, spec);
      const result = await runSpecTicketValidation(
        {
          startSession: async (request) => {
            const session = await slot.codexClient.startSpecTicketValidationSession(request);
            return {
              runTurn: async (turnRequest) => {
                const turn = await session.runTurn(turnRequest);
                latestTurn = turn;
                return turn;
              },
              getThreadId: () => session.getThreadId(),
              cancel: async () => {
                await session.cancel();
              },
            };
          },
          autoCorrect: async () => {
            const refreshedPackageContext = await this.buildSpecTicketValidationPackageContext(
              slot.project.path,
              spec,
            );
            return {
              packageContext: refreshedPackageContext.packageContext,
              appliedCorrections: [],
            };
          },
        },
        {
          spec,
          initialPackageContext: packageContext.packageContext,
          triageThreadId: null,
        },
      );

      const summary = this.buildRunSpecsTicketValidationSummary(result);
      await this.persistSpecTicketValidationExecution({
        projectPath: slot.project.path,
        spec,
        packageContext,
        summary,
      });

      this.logger.info("Etapa spec-ticket-validation concluida no runner", {
        spec: spec.fileName,
        specPath: spec.path,
        verdict: summary.verdict,
        confidence: summary.confidence,
        finalReason: summary.finalReason,
        cyclesExecuted: summary.cyclesExecuted,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });

      if (latestTurn !== null) {
        const completedTurn = latestTurn as SpecTicketValidationSessionTurnResult;
        await this.recordWorkflowTraceSuccess(slot, {
          kind: "spec",
          stage: "spec-ticket-validation",
          targetName: spec.fileName,
          targetPath: spec.path,
          promptTemplatePath: completedTurn.promptTemplatePath,
          promptText: completedTurn.promptText,
          outputText: completedTurn.output,
          diagnostics: completedTurn.diagnostics,
          summary: `Etapa spec-ticket-validation concluida com veredito ${summary.verdict}.`,
          metadata: this.buildSpecTicketValidationTraceMetadata(summary, packageContext),
        });
      }

      return { summary };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (latestTurn !== null) {
        const failedTurn = latestTurn as SpecTicketValidationSessionTurnResult;
        await this.recordWorkflowTraceSuccess(slot, {
          kind: "spec",
          stage: "spec-ticket-validation",
          targetName: spec.fileName,
          targetPath: spec.path,
          promptTemplatePath: failedTurn.promptTemplatePath,
          promptText: failedTurn.promptText,
          outputText: failedTurn.output,
          diagnostics: failedTurn.diagnostics,
          summary: "Etapa spec-ticket-validation falhou no runner.",
          metadata: packageContext
            ? this.buildSpecTicketValidationTraceMetadata(undefined, packageContext)
            : undefined,
          decisionStatus: "failure",
          decisionErrorMessage: errorMessage,
        });
      }

      throw error instanceof RunnerSpecTicketValidationStageError
        ? error
        : new RunnerSpecTicketValidationStageError(errorMessage, error);
    }
  }

  private async buildSpecTicketValidationPackageContext(
    projectPath: string,
    spec: SpecRef,
  ): Promise<SpecTicketValidationPackageContext> {
    const specAbsolutePath = this.resolveProjectRelativePath(projectPath, spec.path);
    let specContent = "";
    try {
      specContent = await fs.readFile(specAbsolutePath, "utf8");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao ler spec ${spec.path} para spec-ticket-validation: ${details}`);
    }

    const sourceSpecTickets = await this.listOpenTicketsForSpec(projectPath, spec);
    const relatedTicketPaths = this.extractRelatedOpenTicketPaths(specContent);
    const fallbackTickets = await this.resolveRelatedOpenTickets(
      projectPath,
      relatedTicketPaths,
      sourceSpecTickets.length === 0,
    );
    const tickets = this.mergeSpecTicketValidationTickets(sourceSpecTickets, fallbackTickets);

    if (tickets.length === 0) {
      throw new Error(
        `Nao foi possivel derivar com seguranca o pacote de tickets da spec ${spec.path}; nenhum ticket aberto da linhagem foi encontrado.`,
      );
    }

    const lineageSource =
      sourceSpecTickets.length > 0 && fallbackTickets.length > 0
        ? "hybrid"
        : sourceSpecTickets.length > 0
          ? "source-spec"
          : "spec-related";

    return {
      specContent,
      tickets,
      lineageSource,
      packageContext: this.renderSpecTicketValidationPackageContext(
        spec,
        specContent,
        tickets,
        lineageSource,
      ),
    };
  }

  private async listOpenTicketsForSpec(
    projectPath: string,
    spec: SpecRef,
  ): Promise<SpecTicketValidationTicketSnapshot[]> {
    const openTicketsDir = path.join(projectPath, "tickets", "open");
    let fileNames: string[] = [];

    try {
      fileNames = (await fs.readdir(openTicketsDir))
        .filter((entry) => entry.endsWith(".md"))
        .sort((left, right) => left.localeCompare(right, "pt-BR"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao listar tickets abertos para spec-ticket-validation: ${details}`);
    }

    const tickets: Array<SpecTicketValidationTicketSnapshot | null> = await Promise.all(
      fileNames.map(async (fileName) => {
        const relativePath = path.posix.join("tickets", "open", fileName);
        const absolutePath = this.resolveProjectRelativePath(projectPath, relativePath);
        const content = await fs.readFile(absolutePath, "utf8");
        const sourceSpec = this.normalizeTicketReference(
          this.normalizeTicketMetadataValue(
            content.match(TICKET_SOURCE_SPEC_METADATA_PATTERN)?.[1],
          ),
        );
        if (!this.ticketReferencesSpec(projectPath, sourceSpec, spec)) {
          return null;
        }

        return {
          fileName,
          relativePath,
          absolutePath,
          content,
          source: "source-spec",
        };
      }),
    );

    return tickets.filter((ticket): ticket is SpecTicketValidationTicketSnapshot => ticket !== null);
  }

  private extractRelatedOpenTicketPaths(specContent: string): string[] {
    const metadataSection = this.extractTopLevelSectionContent(specContent, "Metadata");
    if (!metadataSection) {
      return [];
    }

    const relatedTicketsBlock = metadataSection.match(SPEC_RELATED_TICKETS_BLOCK_PATTERN)?.[1];
    if (!relatedTicketsBlock) {
      return [];
    }

    return relatedTicketsBlock
      .split("\n")
      .map((line) => line.match(/^\s*-\s*(.+?)\s*$/u)?.[1] ?? "")
      .map((value) => this.normalizeTicketReference(value))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace(/\\/gu, "/"))
      .filter((value) => value.startsWith("tickets/open/"));
  }

  private async resolveRelatedOpenTickets(
    projectPath: string,
    relativePaths: string[],
    strict: boolean,
  ): Promise<SpecTicketValidationTicketSnapshot[]> {
    const snapshots: SpecTicketValidationTicketSnapshot[] = [];
    const missingPaths: string[] = [];

    for (const relativePath of relativePaths) {
      const normalizedRelativePath = this.normalizeRepositoryPathReference(projectPath, relativePath);
      const fileName = path.posix.basename(normalizedRelativePath);
      const absolutePath = this.resolveProjectRelativePath(projectPath, normalizedRelativePath);
      try {
        const content = await fs.readFile(absolutePath, "utf8");
        snapshots.push({
          fileName,
          relativePath: normalizedRelativePath,
          absolutePath,
          content,
          source: "spec-related",
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          missingPaths.push(normalizedRelativePath);
          continue;
        }

        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Falha ao ler ticket relacionado ${normalizedRelativePath} durante spec-ticket-validation: ${details}`,
        );
      }
    }

    if (strict && missingPaths.length > 0) {
      throw new Error(
        `A spec referencia tickets abertos inexistentes para spec-ticket-validation: ${missingPaths.join(", ")}.`,
      );
    }

    return snapshots;
  }

  private mergeSpecTicketValidationTickets(
    primary: SpecTicketValidationTicketSnapshot[],
    secondary: SpecTicketValidationTicketSnapshot[],
  ): SpecTicketValidationTicketSnapshot[] {
    const merged = new Map<string, SpecTicketValidationTicketSnapshot>();

    for (const ticket of [...primary, ...secondary]) {
      const existing = merged.get(ticket.relativePath);
      if (!existing) {
        merged.set(ticket.relativePath, ticket);
        continue;
      }

      if (existing.source === "source-spec") {
        continue;
      }

      merged.set(ticket.relativePath, ticket);
    }

    return Array.from(merged.values()).sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath, "pt-BR"),
    );
  }

  private renderSpecTicketValidationPackageContext(
    spec: SpecRef,
    specContent: string,
    tickets: SpecTicketValidationTicketSnapshot[],
    lineageSource: SpecTicketValidationPackageContext["lineageSource"],
  ): string {
    const lines = [
      "# Pacote derivado da spec",
      "",
      `- Spec alvo: ${spec.path}`,
      `- Linhagem resolvida por: ${lineageSource}`,
      `- Tickets abertos derivados: ${tickets.length}`,
      "",
      "## Spec",
      `- Caminho: ${spec.path}`,
      "",
      specContent.trim() || "(spec vazia)",
      "",
      "## Tickets derivados",
      ...tickets.flatMap((ticket, index) => [
        `### ${index + 1}. ${ticket.relativePath}`,
        `- Fonte da linhagem: ${ticket.source}`,
        "",
        ticket.content.trim() || "(ticket vazio)",
        "",
      ]),
    ];

    return lines.join("\n").trim();
  }

  private buildRunSpecsTicketValidationSummary(
    result: SpecTicketValidationResult,
  ): RunSpecsTicketValidationSummary {
    return {
      verdict: result.verdict,
      confidence: result.confidence,
      finalReason: result.finalReason,
      cyclesExecuted: result.cyclesExecuted,
      validationThreadId: result.validationThreadId,
      triageContextInherited: result.triageContextInherited,
      summary: result.finalPass.summary,
      gaps: result.finalPass.gaps.map((gap) => ({
        gapType: gap.gapType,
        summary: gap.summary,
        affectedArtifactPaths: [...gap.affectedArtifactPaths],
        requirementRefs: [...gap.requirementRefs],
        evidence: [...gap.evidence],
        probableRootCause: gap.probableRootCause,
        isAutoCorrectable: gap.isAutoCorrectable,
      })),
      appliedCorrections: result.allAppliedCorrections.map((correction) => ({
        description: correction.description,
        affectedArtifactPaths: [...correction.affectedArtifactPaths],
        linkedGapTypes: [...correction.linkedGapTypes],
        outcome: correction.outcome,
      })),
      finalOpenGapFingerprints: [...result.finalOpenGapFingerprints],
    };
  }

  private buildSpecTicketValidationTraceMetadata(
    summary: RunSpecsTicketValidationSummary | undefined,
    packageContext: SpecTicketValidationPackageContext,
  ): Record<string, unknown> {
    return {
      ...(summary
        ? {
            verdict: summary.verdict,
            confidence: summary.confidence,
            finalReason: summary.finalReason,
            cyclesExecuted: summary.cyclesExecuted,
            validationThreadId: summary.validationThreadId,
            triageContextInherited: summary.triageContextInherited,
            summary: summary.summary,
            gaps: summary.gaps.map((gap) => ({
              gapType: gap.gapType,
              summary: gap.summary,
              affectedArtifactPaths: [...gap.affectedArtifactPaths],
              requirementRefs: [...gap.requirementRefs],
              probableRootCause: gap.probableRootCause,
              isAutoCorrectable: gap.isAutoCorrectable,
            })),
            appliedCorrections: summary.appliedCorrections.map((correction) => ({
              description: correction.description,
              affectedArtifactPaths: [...correction.affectedArtifactPaths],
              linkedGapTypes: [...correction.linkedGapTypes],
              outcome: correction.outcome,
            })),
            finalOpenGapFingerprints: [...summary.finalOpenGapFingerprints],
          }
        : {}),
      ticketCount: packageContext.tickets.length,
      ticketPaths: packageContext.tickets.map((ticket) => ticket.relativePath),
      lineageSource: packageContext.lineageSource,
    };
  }

  private async persistSpecTicketValidationExecution(params: {
    projectPath: string;
    spec: SpecRef;
    packageContext: SpecTicketValidationPackageContext;
    summary: RunSpecsTicketValidationSummary;
  }): Promise<void> {
    const specAbsolutePath = this.resolveProjectRelativePath(params.projectPath, params.spec.path);
    let originalContent = "";
    try {
      originalContent = await fs.readFile(specAbsolutePath, "utf8");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao reler spec ${params.spec.path} antes de persistir o gate de validacao: ${details}`,
      );
    }

    const sectionBody = this.extractTopLevelSectionContent(
      originalContent,
      "Gate de validacao dos tickets derivados",
    );
    const executionBlock = this.renderSpecTicketValidationExecutionBlock(params);
    const nextSectionBody = this.upsertSpecTicketValidationExecutionBlock(
      sectionBody,
      executionBlock,
    );
    const nextContent = this.replaceTopLevelSectionContent(
      originalContent,
      "Gate de validacao dos tickets derivados",
      nextSectionBody,
    );

    if (nextContent === originalContent) {
      return;
    }

    const tempPath = `${specAbsolutePath}.spec-ticket-validation.tmp`;
    try {
      await fs.writeFile(tempPath, nextContent, "utf8");
      await fs.rename(tempPath, specAbsolutePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      await fs.writeFile(specAbsolutePath, originalContent, "utf8").catch(() => undefined);
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao persistir a secao \`Gate de validacao dos tickets derivados\` em ${params.spec.path}: ${details}`,
      );
    }
  }

  private renderSpecTicketValidationExecutionBlock(params: {
    packageContext: SpecTicketValidationPackageContext;
    summary: RunSpecsTicketValidationSummary;
  }): string {
    const systemicGaps = params.summary.gaps.filter(
      (gap) => gap.probableRootCause === "systemic-instruction",
    );
    const lines = [
      "### Ultima execucao registrada",
      `- Executada em (UTC): ${this.now().toISOString()}`,
      `- Veredito: ${params.summary.verdict}`,
      `- Confianca final: ${params.summary.confidence}`,
      `- Motivo final: ${params.summary.finalReason}`,
      `- Resumo: ${params.summary.summary}`,
      `- Ciclos executados: ${params.summary.cyclesExecuted}`,
      `- Thread da validacao: ${params.summary.validationThreadId ?? "indisponivel"}`,
      `- Contexto de triagem herdado: ${params.summary.triageContextInherited ? "sim" : "nao"}`,
      `- Linhagem do pacote: ${params.packageContext.lineageSource}`,
      "- Tickets avaliados:",
      ...params.packageContext.tickets.map(
        (ticket) => `  - ${ticket.relativePath} [fonte=${ticket.source}]`,
      ),
      "",
      "#### Gaps encontrados",
      ...(params.summary.gaps.length === 0
        ? ["- Nenhum."]
        : params.summary.gaps.flatMap((gap) => [
            `- ${gap.gapType}: ${gap.summary}`,
            `  - Artefatos afetados: ${gap.affectedArtifactPaths.join(", ") || "nenhum"}`,
            `  - Requisitos referenciados: ${gap.requirementRefs.join(", ") || "nenhum"}`,
            `  - Evidencias: ${gap.evidence.join(" | ") || "nenhuma"}`,
            `  - Causa-raiz provavel: ${gap.probableRootCause}`,
            `  - Autocorretavel: ${gap.isAutoCorrectable ? "sim" : "nao"}`,
          ])),
      "",
      "#### Correcoes aplicadas",
      ...(params.summary.appliedCorrections.length === 0
        ? ["- Nenhuma."]
        : params.summary.appliedCorrections.flatMap((correction) => [
            `- ${correction.description}`,
            `  - Artefatos afetados: ${correction.affectedArtifactPaths.join(", ") || "nenhum"}`,
            `  - Gaps relacionados: ${correction.linkedGapTypes.join(", ") || "nenhum"}`,
            `  - Resultado: ${correction.outcome}`,
          ])),
      "",
      "#### Observacoes sobre melhoria sistemica do workflow",
      ...(systemicGaps.length === 0
        ? ["- Nenhuma observacao sistemica registrada nesta execucao."]
        : [
            `- ${systemicGaps.length} gap(s) terminaram com causa-raiz \`systemic-instruction\`; a abertura automatica de ticket transversal permanece fora do escopo deste ticket.`,
          ]),
    ];

    return lines.join("\n");
  }

  private upsertSpecTicketValidationExecutionBlock(
    sectionBody: string | null,
    executionBlock: string,
  ): string {
    const normalizedExecutionBlock = executionBlock.trim();
    if (!sectionBody || !sectionBody.trim()) {
      return normalizedExecutionBlock;
    }

    const markerPattern = /^###\s+Ultima execucao registrada\s*$/imu;
    if (!markerPattern.test(sectionBody)) {
      return `${sectionBody.trimEnd()}\n\n${normalizedExecutionBlock}`;
    }

    return sectionBody.replace(
      /^###\s+Ultima execucao registrada\s*$[\s\S]*$/imu,
      normalizedExecutionBlock,
    ).trimEnd();
  }

  private ticketReferencesSpec(
    projectPath: string,
    sourceSpec: string | null,
    spec: SpecRef,
  ): boolean {
    if (!sourceSpec) {
      return false;
    }

    const normalizedReference = this.normalizeRepositoryPathReference(projectPath, sourceSpec);
    const normalizedSpecPath = this.normalizeRepositoryPathReference(projectPath, spec.path);
    return (
      normalizedReference === normalizedSpecPath ||
      path.posix.basename(normalizedReference) === spec.fileName
    );
  }

  private normalizeRepositoryPathReference(projectPath: string, reference: string): string {
    const stripped = reference.trim().replace(/^`|`$/gu, "").replace(/\\/gu, "/");
    if (!stripped) {
      return stripped;
    }

    const relativeReference = path.isAbsolute(stripped)
      ? path.relative(projectPath, stripped).replace(/\\/gu, "/")
      : stripped;

    return path.posix.normalize(relativeReference.replace(/^\.\//u, ""));
  }

  private extractTopLevelSectionContent(content: string, heading: string): string | null {
    const range = this.findTopLevelSectionRange(content, heading);
    if (!range) {
      return null;
    }

    return content.slice(range.bodyStart, range.end).trimEnd();
  }

  private replaceTopLevelSectionContent(
    content: string,
    heading: string,
    nextBody: string,
  ): string {
    const normalizedBody = nextBody.trim();
    const range = this.findTopLevelSectionRange(content, heading);
    if (!range) {
      return `${content.trimEnd()}\n\n## ${heading}\n${normalizedBody}\n`;
    }

    const before = content.slice(0, range.bodyStart);
    const after = content.slice(range.end).replace(/^\n*/u, "");
    return `${before}${normalizedBody}${after ? `\n\n${after}` : "\n"}`;
  }

  private findTopLevelSectionRange(
    content: string,
    heading: string,
  ): { bodyStart: number; end: number } | null {
    const headingPattern = new RegExp(`^##\\s+${this.escapeRegExp(heading)}\\s*$`, "imu");
    const headingMatch = headingPattern.exec(content);
    if (!headingMatch || headingMatch.index === undefined) {
      return null;
    }

    let bodyStart = headingMatch.index + headingMatch[0].length;
    if (content.startsWith("\r\n", bodyStart)) {
      bodyStart += 2;
    } else if (content.startsWith("\n", bodyStart)) {
      bodyStart += 1;
    }

    const remainder = content.slice(bodyStart);
    const nextHeadingMatch = remainder.match(TOP_LEVEL_SECTION_HEADING_PATTERN);
    return {
      bodyStart,
      end:
        nextHeadingMatch && nextHeadingMatch.index !== undefined
          ? bodyStart + nextHeadingMatch.index
          : content.length,
    };
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  }

  private normalizeSpecFileName(specFileName: string): string {
    const trimmed = specFileName.trim();
    if (trimmed.startsWith("docs/specs/")) {
      return trimmed.slice("docs/specs/".length);
    }

    return trimmed;
  }

  private normalizeSelectedTicketFileName(ticketInput: string): SelectedTicketValidationResult {
    const trimmed = ticketInput.trim();
    if (!trimmed) {
      return {
        status: "invalid",
        message:
          "Formato invalido para ticket selecionado. Use apenas <yyyy-mm-dd-slug.md> ou tickets/open/<arquivo.md>.",
      };
    }

    const normalizedSeparators = trimmed.replace(/\\/gu, "/");
    const withoutOpenPrefix = normalizedSeparators.startsWith("tickets/open/")
      ? normalizedSeparators.slice("tickets/open/".length)
      : normalizedSeparators;

    if (
      !withoutOpenPrefix ||
      withoutOpenPrefix.includes("/") ||
      withoutOpenPrefix.includes("..") ||
      !TICKET_FILE_NAME_PATTERN.test(withoutOpenPrefix)
    ) {
      return {
        status: "invalid",
        message:
          "Formato invalido para ticket selecionado. Use apenas <yyyy-mm-dd-slug.md> ou tickets/open/<arquivo.md>.",
      };
    }

    return {
      status: "valid",
      ticketFileName: withoutOpenPrefix,
    };
  }

  private resolveSpecPath(specFileName: string): string {
    if (specFileName.startsWith("docs/specs/")) {
      return specFileName;
    }

    return `docs/specs/${specFileName}`;
  }

  private buildPlannedSpecRef(title: string, createdAt: Date): SpecRef {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      throw new Error(
        "Titulo final vazio no bloco de planejamento. Use `Refinar` para informar um titulo valido.",
      );
    }

    const slug = normalizedTitle
      .normalize("NFKD")
      .replace(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .replace(/-{2,}/gu, "-");

    if (!slug) {
      throw new Error(
        "Nao foi possivel derivar slug do titulo final. Use `Refinar` com titulo contendo letras ou numeros.",
      );
    }

    const datePrefix = createdAt.toISOString().slice(0, 10);
    const fileName = `${datePrefix}-${slug}.md`;
    return {
      fileName,
      path: this.resolveSpecPath(fileName),
    };
  }

  private buildCreateSpecFailureMessage(sourceCommand: SpecPlanningSourceCommand): string {
    return sourceCommand === "/plan_spec"
      ? "Falha ao criar spec planejada"
      : "Falha ao criar spec a partir de /discover_spec";
  }

  private buildCreateSpecStageSpecRef(params: {
    spec: SpecRef;
    finalBlock: PlanSpecFinalBlock;
    sourceCommand: SpecPlanningSourceCommand;
    commitMessage?: string;
    tracePaths?: SpecRef["tracePaths"];
  }): SpecRef {
    return {
      fileName: params.spec.fileName,
      path: params.spec.path,
      plannedTitle: params.finalBlock.title,
      plannedSummary: params.finalBlock.summary,
      plannedOutline: this.clonePlanSpecFinalOutline(params.finalBlock.outline),
      sourceCommand: params.sourceCommand,
      assumptionsAndDefaults: [...params.finalBlock.assumptionsAndDefaults],
      decisionsAndTradeOffs: [...params.finalBlock.decisionsAndTradeOffs],
      categoryCoverage: params.finalBlock.categoryCoverage.map((item) => ({ ...item })),
      criticalAmbiguities: [...params.finalBlock.criticalAmbiguities],
      ...(params.commitMessage ? { commitMessage: params.commitMessage } : {}),
      ...(params.tracePaths
        ? {
            tracePaths: {
              requestPath: params.tracePaths.requestPath,
              responsePath: params.tracePaths.responsePath,
              decisionPath: params.tracePaths.decisionPath,
            },
          }
        : {}),
    };
  }

  private buildSpecPlanningTraceStageResponse(params: {
    stage: "plan-spec-materialize" | "plan-spec-version-and-push";
    sourceCommand: SpecPlanningSourceCommand;
    spec: SpecRef;
    finalBlock: PlanSpecFinalBlock;
    output: string;
    recordedAt: Date;
  }): {
    stage: "plan-spec-materialize" | "plan-spec-version-and-push";
    sourceCommand: SpecPlanningSourceCommand;
    specPath: string;
    specFileName: string;
    specTitle: string;
    specSummary: string;
    assumptionsAndDefaults: string[];
    decisionsAndTradeOffs: string[];
    categoryCoverage: PlanSpecFinalBlock["categoryCoverage"];
    criticalAmbiguities: string[];
    output: string;
    recordedAt: Date;
  } {
    return {
      stage: params.stage,
      sourceCommand: params.sourceCommand,
      specPath: params.spec.path,
      specFileName: params.spec.fileName,
      specTitle: params.finalBlock.title,
      specSummary: params.finalBlock.summary,
      assumptionsAndDefaults: [...params.finalBlock.assumptionsAndDefaults],
      decisionsAndTradeOffs: [...params.finalBlock.decisionsAndTradeOffs],
      categoryCoverage: params.finalBlock.categoryCoverage.map((item) => ({ ...item })),
      criticalAmbiguities: [...params.finalBlock.criticalAmbiguities],
      output: params.output,
      recordedAt: params.recordedAt,
    };
  }

  private clonePlanSpecFinalOutline(
    outline: PlanSpecFinalBlock["outline"],
  ): PlanSpecFinalBlock["outline"] {
    return {
      objective: outline.objective,
      actors: [...outline.actors],
      journey: [...outline.journey],
      requirements: [...outline.requirements],
      acceptanceCriteria: [...outline.acceptanceCriteria],
      nonScope: [...outline.nonScope],
      technicalConstraints: [...outline.technicalConstraints],
      mandatoryValidations: [...outline.mandatoryValidations],
      pendingManualValidations: [...outline.pendingManualValidations],
      knownRisks: [...outline.knownRisks],
    };
  }

  private async assertSpecPathAvailable(projectPath: string, relativeSpecPath: string): Promise<void> {
    const absoluteSpecPath = this.resolveProjectRelativePath(projectPath, relativeSpecPath);
    try {
      await fs.access(absoluteSpecPath);
      throw new Error(
        `Ja existe ${relativeSpecPath}. Use \`Refinar\` e ajuste o titulo final para gerar novo slug.`,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      if (error instanceof Error && /Ja existe/u.test(error.message)) {
        throw error;
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao validar colisao de arquivo da spec: ${details}`);
    }
  }

  private async resolveSelectedOpenTicket(
    projectPath: string,
    ticketFileName: string,
  ): Promise<SelectedTicketResolutionResult> {
    const ticket: TicketRef = {
      name: ticketFileName,
      openPath: this.resolveProjectRelativePath(projectPath, `tickets/open/${ticketFileName}`),
      closedPath: this.resolveProjectRelativePath(projectPath, `tickets/closed/${ticketFileName}`),
    };

    try {
      await fs.access(ticket.openPath);
      return {
        status: "resolved",
        ticket,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          status: "not-found",
          message: [
            `Ticket selecionado nao encontrado em tickets/open/: ${ticketFileName}.`,
            "Atualize a lista de tickets e tente novamente.",
          ].join(" "),
        };
      }

      throw error;
    }
  }

  private async assertPlannedSpecMetadata(projectPath: string, relativeSpecPath: string): Promise<void> {
    const absoluteSpecPath = this.resolveProjectRelativePath(projectPath, relativeSpecPath);
    let content = "";
    try {
      content = await fs.readFile(absoluteSpecPath, "utf8");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao ler spec criada ${relativeSpecPath}: ${details}`);
    }

    if (!/^\s*-\s*Status\s*:\s*approved\s*$/imu.test(content)) {
      throw new Error(
        `Spec criada sem metadata obrigatoria \`Status: approved\` em ${relativeSpecPath}.`,
      );
    }

    if (!/^\s*-\s*Spec treatment\s*:\s*pending\s*$/imu.test(content)) {
      throw new Error(
        `Spec criada sem metadata obrigatoria \`Spec treatment: pending\` em ${relativeSpecPath}.`,
      );
    }
  }

  private resolveProjectRelativePath(projectPath: string, relativePath: string): string {
    return path.join(projectPath, ...relativePath.split("/"));
  }

  private normalizeTicketMetadataValue(rawValue: string | undefined): string | null {
    if (!rawValue) {
      return null;
    }

    const normalized = rawValue.trim().replace(/^`|`$/gu, "");
    if (!normalized) {
      return null;
    }

    if (/^(?:n\/a|na|none|null|-)$/iu.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private normalizeTicketReference(rawValue: string | null): string | null {
    if (!rawValue) {
      return null;
    }

    const normalized = rawValue.trim().replace(/^`|`$/gu, "");
    if (!normalized) {
      return null;
    }

    if (/^(?:n\/a|na|none|null|pendente|a definir|-)\.?$/iu.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private parseTicketLineageMetadata(ticketContent: string): TicketLineageMetadata {
    const status = this.normalizeTicketMetadataValue(
      ticketContent.match(TICKET_STATUS_METADATA_PATTERN)?.[1],
    );
    const parentTicketPath = this.normalizeTicketReference(
      this.normalizeTicketMetadataValue(ticketContent.match(TICKET_PARENT_METADATA_PATTERN)?.[1]),
    );
    const closureReason = this.normalizeTicketMetadataValue(
      ticketContent.match(TICKET_CLOSURE_REASON_METADATA_PATTERN)?.[1],
    );

    return {
      status: status?.toLowerCase() ?? null,
      parentTicketPath,
      closureReason: closureReason?.toLowerCase() ?? null,
    };
  }

  private isSplitFollowUpClosure(metadata: TicketLineageMetadata): boolean {
    return metadata.status === "closed" && metadata.closureReason === "split-follow-up";
  }

  private resolveTicketReferenceCandidates(projectPath: string, reference: string): string[] {
    const normalizedReference = reference.replace(/\\/gu, "/").trim();
    const ticketFileName = path.basename(normalizedReference);
    const candidates = new Set<string>();

    if (path.isAbsolute(normalizedReference)) {
      candidates.add(normalizedReference);
    } else {
      candidates.add(path.join(projectPath, ...normalizedReference.split("/")));
    }

    if (ticketFileName) {
      candidates.add(path.join(projectPath, "tickets", "closed", ticketFileName));
      candidates.add(path.join(projectPath, "tickets", "open", ticketFileName));
    }

    return [...candidates];
  }

  private async resolveTicketReference(
    projectPath: string,
    reference: string,
  ): Promise<ResolvedTicketContent | null> {
    for (const candidatePath of this.resolveTicketReferenceCandidates(projectPath, reference)) {
      try {
        const content = await fs.readFile(candidatePath, "utf8");
        return {
          path: candidatePath,
          content,
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }

        throw error;
      }
    }

    return null;
  }

  private async evaluateNoGoRecoveryContext(
    slot: ActiveRunnerSlot,
    ticket: TicketRef,
  ): Promise<TicketNoGoRecoveryContext> {
    let currentTicketContent = "";
    try {
      currentTicketContent = await fs.readFile(ticket.openPath, "utf8");
    } catch {
      return {
        rootTicketName: ticket.name,
        splitFollowUpRecoveries: 0,
        lineageDepth: 0,
        ancestryCycleDetected: false,
      };
    }

    const currentMetadata = this.parseTicketLineageMetadata(currentTicketContent);
    let parentReference = currentMetadata.parentTicketPath;
    let rootTicketName = ticket.name;
    let splitFollowUpRecoveries = 0;
    let lineageDepth = 0;
    let ancestryCycleDetected = false;
    const visitedParents = new Set<string>();

    while (parentReference && lineageDepth < MAX_TICKET_PARENT_CHAIN_DEPTH) {
      const resolvedParent = await this.resolveTicketReference(slot.project.path, parentReference);
      if (!resolvedParent) {
        rootTicketName = path.basename(parentReference);
        break;
      }

      const normalizedParentPath = path.normalize(resolvedParent.path);
      if (visitedParents.has(normalizedParentPath)) {
        ancestryCycleDetected = true;
        break;
      }

      visitedParents.add(normalizedParentPath);
      rootTicketName = path.basename(resolvedParent.path);
      const parentMetadata = this.parseTicketLineageMetadata(resolvedParent.content);
      if (this.isSplitFollowUpClosure(parentMetadata)) {
        splitFollowUpRecoveries += 1;
      }

      parentReference = parentMetadata.parentTicketPath;
      lineageDepth += 1;
    }

    return {
      rootTicketName,
      splitFollowUpRecoveries,
      lineageDepth,
      ancestryCycleDetected,
    };
  }

  private async runForever(slot: ActiveRunnerSlot): Promise<RunAllFlowSummary> {
    const roundTimingCollector = this.createFlowTimingCollector<RunAllTimingStage>();
    const processedTickets = new Set<string>();
    const maxTicketsPerRound = this.env.RUN_ALL_MAX_TICKETS_PER_ROUND;
    const finalizeRound = async (params: {
      outcome: RunAllFlowSummary["outcome"];
      finalStage: RunAllFinalStage;
      completionReason: RunAllCompletionReason;
      ticket?: string;
      details?: string;
    }): Promise<RunAllFlowSummary> => {
      if (params.outcome === "failure" && params.finalStage !== "unknown") {
        this.markFlowInterrupted(roundTimingCollector, params.finalStage);
      }
      const summary = this.buildRunAllFlowSummary({
        slot,
        processedTicketsCount: processedTickets.size,
        maxTicketsPerRound,
        outcome: params.outcome,
        finalStage: params.finalStage,
        completionReason: params.completionReason,
        ticket: params.ticket,
        details: params.details,
        timingCollector: roundTimingCollector,
      });
      await this.emitRunFlowCompleted(summary);
      return summary;
    };

    this.logger.info("Preparando estrutura da rodada /run-all", {
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
    });
    await slot.queue.ensureStructure();
    if (!slot.isRunning || !this.activeSlots.has(slot.key)) {
      this.logger.warn("Rodada /run-all encerrada antes de iniciar processamento", {
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return finalizeRound({
        outcome: "failure",
        finalStage: "unknown",
        completionReason: "stopped",
        details: "Rodada /run-all encerrada antes de iniciar processamento.",
      });
    }
    this.touchSlot(slot, "idle", "Rodada /run-all iniciada");
    this.logger.info("Loop da rodada /run-all iniciado", {
      pollIntervalMs: this.env.POLL_INTERVAL_MS,
      maxTicketsPerRound,
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
    });

    while (slot.isRunning && this.activeSlots.has(slot.key)) {
      if (processedTickets.size >= maxTicketsPerRound) {
        slot.isRunning = false;
        this.touchSlot(
          slot,
          "idle",
          `Rodada /run-all finalizada: limite de ${maxTicketsPerRound} tickets atingido`,
        );
        this.logger.info("Rodada /run-all finalizada por limite de tickets", {
          processedTicketsCount: processedTickets.size,
          maxTicketsPerRound,
          durationMs: this.buildFlowTimingSnapshot(roundTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        return finalizeRound({
          outcome: "success",
          finalStage: "select-ticket",
          completionReason: "max-tickets-reached",
        });
      }

      if (slot.isPaused) {
        await sleep(this.env.POLL_INTERVAL_MS);
        continue;
      }

      this.touchSlot(slot, "select-ticket", "Buscando proximo ticket aberto");
      const selectTicketStartedAt = Date.now();
      const ticket = await slot.queue.nextOpenTicket();
      this.recordFlowStageCompletion(
        roundTimingCollector,
        "select-ticket",
        Date.now() - selectTicketStartedAt,
      );

      if (!ticket) {
        slot.isRunning = false;
        this.touchSlot(slot, "idle", "Rodada /run-all finalizada: nenhum ticket aberto restante");
        this.logger.info("Rodada /run-all finalizada sem tickets pendentes", {
          processedTicketsCount: processedTickets.size,
          durationMs: this.buildFlowTimingSnapshot(roundTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        return finalizeRound({
          outcome: "success",
          finalStage: "select-ticket",
          completionReason: "queue-empty",
        });
      }

      if (processedTickets.has(ticket.name)) {
        slot.isRunning = false;
        this.touchSlot(slot, "error", `Rodada interrompida: ticket ${ticket.name} reapareceu na fila`);
        this.logger.error("Falha de fechamento detectada no ticket da rodada", {
          ticket: ticket.name,
          reason: "ticket reaberto/nao movido apos close-and-version",
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        return finalizeRound({
          outcome: "failure",
          finalStage: "select-ticket",
          completionReason: "ticket-reappeared",
          ticket: ticket.name,
          details: `Ticket ${ticket.name} reapareceu na fila apos tentativa de fechamento.`,
        });
      }

      const noGoRecoveryContext = await this.evaluateNoGoRecoveryContext(slot, ticket);
      if (noGoRecoveryContext.ancestryCycleDetected) {
        this.logger.warn("Ciclo detectado na cadeia de Parent ticket durante analise de NO_GO", {
          ticket: ticket.name,
          rootTicketName: noGoRecoveryContext.rootTicketName,
          lineageDepth: noGoRecoveryContext.lineageDepth,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
      }

      if (noGoRecoveryContext.splitFollowUpRecoveries > MAX_NO_GO_RECOVERIES_PER_TICKET) {
        slot.isRunning = false;
        this.touchSlot(
          slot,
          "error",
          `Rodada /run-all interrompida: tarefa nao finalizada para ${ticket.name} apos ${noGoRecoveryContext.splitFollowUpRecoveries} recuperacoes de NO_GO (limite: ${MAX_NO_GO_RECOVERIES_PER_TICKET}).`,
        );
        this.logger.error("Limite de recuperacoes de NO_GO excedido para ticket", {
          ticket: ticket.name,
          rootTicketName: noGoRecoveryContext.rootTicketName,
          splitFollowUpRecoveries: noGoRecoveryContext.splitFollowUpRecoveries,
          maxNoGoRecoveriesPerTicket: MAX_NO_GO_RECOVERIES_PER_TICKET,
          lineageDepth: noGoRecoveryContext.lineageDepth,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        return finalizeRound({
          outcome: "failure",
          finalStage: "select-ticket",
          completionReason: "no-go-limit-exceeded",
          ticket: ticket.name,
          details:
            `Ticket ${ticket.name} excedeu o limite de ${MAX_NO_GO_RECOVERIES_PER_TICKET} recuperacoes de NO_GO.`,
        });
      }

      const ticketProcessing = await this.processTicketInSlot(slot, ticket);
      const ticketSummary = ticketProcessing.finalSummary;
      const succeeded = ticketProcessing.succeeded;
      processedTickets.add(ticket.name);
      if (ticketSummary) {
        this.mergeTicketTimingIntoRunAllCollector(roundTimingCollector, ticketSummary.timing);
      }
      if (!succeeded) {
        slot.isRunning = false;
        const ticketFailureDetails =
          ticketSummary?.status === "failure" ? ticketSummary.errorMessage : undefined;
        const finalStage = ticketSummary?.finalStage ?? this.resolveRunAllFinalStageFromRunnerPhase(slot.phase);
        this.logger.warn("Rodada /run-all interrompida por falha de ticket", {
          ticket: ticket.name,
          processedTicketsCount: processedTickets.size,
          finalStage,
          durationMs: this.buildFlowTimingSnapshot(roundTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
        });
        return finalizeRound({
          outcome: "failure",
          finalStage,
          completionReason: "ticket-failure",
          ticket: ticket.name,
          details:
            ticketFailureDetails ??
            `Ticket ${ticket.name} falhou durante a rodada /run-all no estagio ${finalStage}.`,
        });
      }
    }

    return finalizeRound({
      outcome: "failure",
      finalStage: this.resolveRunAllFinalStageFromRunnerPhase(slot.phase),
      completionReason: "stopped",
      details: "Rodada /run-all interrompida externamente antes de concluir o backlog.",
    });
  }

  private async runSelectedTicketOnce(slot: ActiveRunnerSlot, ticket: TicketRef): Promise<void> {
    const startedAt = Date.now();
    this.touchSlot(slot, "select-ticket", `Execucao manual iniciada para ${ticket.name}`);
    this.logger.info("Execucao manual de ticket selecionado iniciada", {
      ticket: ticket.name,
      openPath: ticket.openPath,
      closedPath: ticket.closedPath,
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
    });

    const ticketProcessing = await this.processTicketInSlot(slot, ticket);
    if (!ticketProcessing.succeeded) {
      slot.isRunning = false;
      this.logger.warn("Execucao manual de ticket selecionado finalizada com falha", {
        ticket: ticket.name,
        durationMs: Date.now() - startedAt,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      return;
    }

    slot.isRunning = false;
    this.touchSlot(slot, "idle", `Execucao manual finalizada para ${ticket.name}`);
    this.logger.info("Execucao manual de ticket selecionado concluida com sucesso", {
      ticket: ticket.name,
      durationMs: Date.now() - startedAt,
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
    });
  }

  shutdown(options: RunnerShutdownOptions = {}): Promise<RunnerShutdownReport> {
    if (this.completedShutdownReport) {
      return Promise.resolve(this.cloneShutdownReport(this.completedShutdownReport));
    }

    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    const timeoutMs = this.resolveShutdownDrainTimeoutMs(options.timeoutMs);
    const startedAt = Date.now();
    this.isShuttingDown = true;

    this.touch("idle", "Desligamento solicitado: iniciando drain de operacoes em voo");
    this.logger.warn("Shutdown gracioso iniciado no runner", {
      timeoutMs,
      activeSlotsCount: this.activeSlots.size,
      runSlotsCount: this.getRunSlots().length,
      hasDiscoverSpecSession: Boolean(this.activeDiscoverSpecSession),
      hasPlanSpecSession: Boolean(this.activePlanSpecSession),
      hasCodexChatSession: Boolean(this.activeCodexChatSession),
    });

    this.shutdownPromise = this.executeGracefulShutdownDrain(timeoutMs, startedAt)
      .then((report) => {
        this.completedShutdownReport = this.cloneShutdownReport(report);
        return report;
      })
      .finally(() => {
        this.shutdownPromise = null;
      });

    return this.shutdownPromise;
  }

  private resolveShutdownDrainTimeoutMs(candidate?: number): number {
    if (Number.isInteger(candidate) && (candidate ?? 0) > 0) {
      return candidate as number;
    }

    return this.env.SHUTDOWN_DRAIN_TIMEOUT_MS;
  }

  private async executeGracefulShutdownDrain(
    timeoutMs: number,
    startedAt: number,
  ): Promise<RunnerShutdownReport> {
    for (const slot of this.getRunSlots()) {
      slot.isRunning = false;
      slot.isPaused = false;
    }
    this.syncStateFromSlots();

    const drainTasks = this.collectShutdownDrainTasks();
    const drainResult = await this.awaitShutdownDrainTasks(drainTasks, timeoutMs);
    this.releaseCompletedRunSlotsAfterShutdown();

    const report: RunnerShutdownReport = {
      timeoutMs,
      durationMs: Date.now() - startedAt,
      timedOut: drainResult.timedOut,
      drainedTasks: drainResult.drainedTasks,
      pendingTasks: drainResult.pendingTasks,
    };

    if (report.timedOut) {
      this.touch(
        "idle",
        `Desligamento solicitado: drain expirou com ${report.pendingTasks.length} pendencia(s)`,
      );
      this.logger.warn("Shutdown gracioso expirou antes de drenar todas as operacoes", {
        timeoutMs: report.timeoutMs,
        durationMs: report.durationMs,
        drainedTasks: report.drainedTasks,
        pendingTasks: report.pendingTasks,
      });
    } else {
      this.touch("idle", "Desligamento solicitado: drain concluido");
      this.logger.info("Shutdown gracioso concluiu drain de operacoes em voo", {
        timeoutMs: report.timeoutMs,
        durationMs: report.durationMs,
        drainedTasks: report.drainedTasks,
      });
    }

    return report;
  }

  private collectShutdownDrainTasks(): ShutdownDrainTask[] {
    const drainTasks: ShutdownDrainTask[] = [];
    for (const slot of this.getRunSlots()) {
      if (slot.loopPromise) {
        drainTasks.push({
          name: this.buildShutdownRunSlotTaskName(slot),
          promise: slot.loopPromise.then(() => undefined),
        });
      } else {
        this.releaseSlot(slot.key);
      }
    }

    const activePlanSpecSession = this.activePlanSpecSession;
    if (activePlanSpecSession) {
      drainTasks.push({
        name: `plan-spec-session:${String(activePlanSpecSession.id)}`,
        promise: this.finalizePlanSpecSession(activePlanSpecSession.id, {
          mode: "cancel",
          phase: "idle",
          message: "Desligamento solicitado",
        }),
      });
    }

    const activeDiscoverSpecSession = this.activeDiscoverSpecSession;
    if (activeDiscoverSpecSession) {
      drainTasks.push({
        name: `discover-spec-session:${String(activeDiscoverSpecSession.id)}`,
        promise: this.finalizeDiscoverSpecSession(activeDiscoverSpecSession.id, {
          mode: "cancel",
          phase: "idle",
          message: "Desligamento solicitado",
        }),
      });
    }

    const activeCodexChatSession = this.activeCodexChatSession;
    if (activeCodexChatSession) {
      drainTasks.push({
        name: `codex-chat-session:${String(activeCodexChatSession.id)}`,
        promise: this.finalizeCodexChatSession(activeCodexChatSession.id, {
          mode: "cancel",
          phase: "idle",
          message: "Desligamento solicitado",
          closureReason: "shutdown",
        }),
      });
    }

    return drainTasks;
  }

  private async awaitShutdownDrainTasks(
    drainTasks: ShutdownDrainTask[],
    timeoutMs: number,
  ): Promise<{ timedOut: boolean; drainedTasks: string[]; pendingTasks: string[] }> {
    if (drainTasks.length === 0) {
      return {
        timedOut: false,
        drainedTasks: [],
        pendingTasks: [],
      };
    }

    const completed = new Set<string>();
    const wrappedTasks = drainTasks.map((task) =>
      task.promise
        .catch((error) => {
          this.logger.warn("Falha durante drain de shutdown", {
            task: task.name,
            error: error instanceof Error ? error.message : String(error),
          });
        })
        .finally(() => {
          completed.add(task.name);
        }),
    );

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;

    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutHandle = this.setTimer(() => {
        resolve("timeout");
      }, timeoutMs);
    });

    const completion = Promise.all(wrappedTasks).then<"drained">(() => "drained");
    const outcome: "drained" | "timeout" = await Promise.race([completion, timeoutPromise]);
    timedOut = outcome === "timeout";

    if (timeoutHandle) {
      this.clearTimer(timeoutHandle);
    }

    if (!timedOut) {
      await Promise.allSettled(wrappedTasks);
    }

    const drainedTasks = drainTasks.filter((task) => completed.has(task.name)).map((task) => task.name);
    const pendingTasks = drainTasks.filter((task) => !completed.has(task.name)).map((task) => task.name);

    return {
      timedOut,
      drainedTasks,
      pendingTasks,
    };
  }

  private releaseCompletedRunSlotsAfterShutdown(): void {
    for (const slot of this.getRunSlots()) {
      if (!slot.loopPromise) {
        this.releaseSlot(slot.key);
      }
    }
  }

  private buildShutdownRunSlotTaskName(slot: ActiveRunnerSlot): string {
    return `run-slot:${slot.kind}:${slot.project.name}:${slot.project.path}`;
  }

  private cloneShutdownReport(report: RunnerShutdownReport): RunnerShutdownReport {
    return {
      timeoutMs: report.timeoutMs,
      durationMs: report.durationMs,
      timedOut: report.timedOut,
      drainedTasks: [...report.drainedTasks],
      pendingTasks: [...report.pendingTasks],
    };
  }

  private async processTicket(ticket: TicketRef): Promise<boolean> {
    const activeProject = this.state.activeProject ?? { ...this.initialRoundDependencies.activeProject };
    this.state.activeProject = { ...activeProject };

    const fallbackSlot: ActiveRunnerSlot = {
      key: "__legacy-process-ticket__",
      kind: "run-all",
      project: { ...activeProject },
      queue: this.initialRoundDependencies.queue,
      codexClient: this.initialRoundDependencies.codexClient,
      codexPreferencesSnapshot: null,
      gitVersioning: this.initialRoundDependencies.gitVersioning,
      isStarting: false,
      isRunning: true,
      isPaused: false,
      currentTicket: null,
      currentSpec: null,
      phase: this.state.phase,
      startedAt: this.now(),
      loopPromise: null,
    };

    const result = await this.processTicketInSlot(fallbackSlot, ticket, true);
    return result.succeeded;
  }

  private async processTicketInSlot(
    slot: ActiveRunnerSlot,
    ticket: TicketRef,
    updateGlobalStateDirectly = false,
  ): Promise<TicketProcessingResult> {
    const ticketTimingCollector = this.createFlowTimingCollector<TicketFinalStage>();
    const stageDiagnostics: Partial<Record<TicketFlowStage, CodexStageDiagnostics>> = {};
    slot.currentTicket = ticket.name;
    let finalSummary: TicketFinalSummary | null = null;
    let closeAndVersionResult: CodexStageResult | null = null;
    const activeProject = { ...slot.project };
    this.logger.info("Processando ticket da rodada atual", {
      ticket: ticket.name,
      openPath: ticket.openPath,
      closedPath: ticket.closedPath,
      activeProjectName: activeProject.name,
      activeProjectPath: activeProject.path,
    });

    try {
      const planResult = await this.runStage(
        slot,
        "plan",
        ticket,
        `Executando etapa plan para ${ticket.name}`,
        updateGlobalStateDirectly,
        ticketTimingCollector,
      );
      this.recordStageDiagnostics(stageDiagnostics, "plan", planResult.diagnostics);
      const execPlanPath = this.resolveExecPlanPath(ticket, planResult.execPlanPath);
      const implementResult = await this.runStage(
        slot,
        "implement",
        ticket,
        `Executando etapa implement para ${ticket.name}`,
        updateGlobalStateDirectly,
        ticketTimingCollector,
      );
      this.recordStageDiagnostics(stageDiagnostics, "implement", implementResult.diagnostics);
      closeAndVersionResult = await this.runStage(
        slot,
        "close-and-version",
        ticket,
        `Executando etapa close-and-version para ${ticket.name}`,
        updateGlobalStateDirectly,
        ticketTimingCollector,
      );
      this.recordStageDiagnostics(
        stageDiagnostics,
        "close-and-version",
        closeAndVersionResult.diagnostics,
      );
      await this.commitCloseAndVersion(
        slot,
        ticket,
        execPlanPath,
        closeAndVersionResult.diagnostics,
      );
      const syncEvidence = await this.assertCloseAndVersion(
        slot,
        ticket,
        closeAndVersionResult.diagnostics,
      );

      if (updateGlobalStateDirectly) {
        this.touch("idle", `Ticket ${ticket.name} finalizado com sucesso`);
      } else {
        this.touchSlot(slot, "idle", `Ticket ${ticket.name} finalizado com sucesso`);
      }
      this.logger.info("Ticket finalizado com sucesso na rodada atual", {
        ticket: ticket.name,
        durationMs: this.buildFlowTimingSnapshot(ticketTimingCollector).totalDurationMs,
        commitHash: syncEvidence.commitHash,
        pushUpstream: syncEvidence.upstream,
        activeProjectName: activeProject.name,
        activeProjectPath: activeProject.path,
      });
      await this.recordWorkflowTraceSuccess(slot, {
        kind: "ticket",
        stage: "close-and-version",
        targetName: ticket.name,
        targetPath: ticket.openPath,
        promptTemplatePath: closeAndVersionResult.promptTemplatePath,
        promptText: closeAndVersionResult.promptText,
        outputText: closeAndVersionResult.output,
        diagnostics: closeAndVersionResult.diagnostics,
        summary: "Etapa close-and-version concluida com sucesso no runner, incluindo versionamento git.",
        metadata: {
          commitHash: syncEvidence.commitHash,
          pushUpstream: syncEvidence.upstream,
          commitPushId: syncEvidence.commitPushId,
        },
      });
      finalSummary = this.buildSuccessSummary(
        ticket.name,
        execPlanPath,
        syncEvidence,
        activeProject,
        this.buildFlowTimingSnapshot(ticketTimingCollector),
      );
      return {
        succeeded: true,
        finalSummary: this.cloneTicketFinalSummary(finalSummary),
      };
    } catch (error) {
      const stage =
        error instanceof CodexStageExecutionError && isTicketFlowStage(error.stage)
          ? error.stage
          : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const finalStage = this.resolveFailureStage(stage, slot.phase);
      const finalStageDiagnostics = this.resolveStageDiagnostics(stageDiagnostics, finalStage);
      this.markFlowInterrupted(ticketTimingCollector, finalStage);
      if (updateGlobalStateDirectly) {
        this.touch("error", `Falha ao processar ${ticket.name}`);
      } else {
        this.touchSlot(slot, "error", `Falha ao processar ${ticket.name}`);
      }
      this.logger.error("Erro no ciclo de ticket", {
        ticket: ticket.name,
        stage,
        error: errorMessage,
        durationMs: this.buildFlowTimingSnapshot(ticketTimingCollector).totalDurationMs,
        activeProjectName: activeProject.name,
        activeProjectPath: activeProject.path,
        ...this.buildCodexDiagnosticsLogContext(finalStageDiagnostics),
      });
      if (finalStage === "close-and-version" && closeAndVersionResult) {
        await this.recordWorkflowTraceSuccess(slot, {
          kind: "ticket",
          stage: "close-and-version",
          targetName: ticket.name,
          targetPath: ticket.openPath,
          promptTemplatePath: closeAndVersionResult.promptTemplatePath,
          promptText: closeAndVersionResult.promptText,
          outputText: closeAndVersionResult.output,
          diagnostics: closeAndVersionResult.diagnostics,
          summary: "Etapa close-and-version executada pelo Codex, mas falhou na validacao posterior do runner.",
          metadata: {
            outcome: "runner-post-validation-failure",
            errorMessage,
          },
          decisionStatus: "failure",
          decisionErrorMessage: errorMessage,
        });
      }

      finalSummary = this.buildFailureSummary(
        ticket.name,
        finalStage,
        errorMessage,
        activeProject,
        this.buildFlowTimingSnapshot(ticketTimingCollector),
        finalStageDiagnostics,
      );
      return {
        succeeded: false,
        finalSummary: this.cloneTicketFinalSummary(finalSummary),
      };
    } finally {
      if (finalSummary) {
        await this.publishTicketFinalSummary(finalSummary);
      }
      slot.currentTicket = null;
      if (updateGlobalStateDirectly) {
        this.state.currentTicket = null;
      }
      this.syncStateFromSlots();
    }
  }

  private resolveExecPlanPath(ticket: TicketRef, execPlanPath?: string): string {
    if (execPlanPath) {
      return execPlanPath;
    }

    throw new CodexStageExecutionError(
      ticket.name,
      "plan",
      "Etapa plan nao retornou caminho de ExecPlan para rastreabilidade obrigatoria.",
    );
  }

  private buildSuccessSummary(
    ticket: string,
    execPlanPath: string,
    syncEvidence: GitSyncEvidence,
    activeProject: ProjectRef,
    timing: TicketTimingSnapshot,
  ): TicketFinalSummary {
    return {
      ticket,
      status: "success",
      finalStage: "close-and-version",
      timestampUtc: new Date().toISOString(),
      activeProjectName: activeProject.name,
      activeProjectPath: activeProject.path,
      timing,
      execPlanPath,
      commitPushId: syncEvidence.commitPushId,
      commitHash: syncEvidence.commitHash,
      pushUpstream: syncEvidence.upstream,
    };
  }

  private buildFailureSummary(
    ticket: string,
    finalStage: TicketFinalStage,
    errorMessage: string,
    activeProject: ProjectRef,
    timing: TicketTimingSnapshot,
    diagnostics?: CodexStageDiagnostics,
  ): TicketFinalSummary {
    return {
      ticket,
      status: "failure",
      finalStage,
      timestampUtc: new Date().toISOString(),
      activeProjectName: activeProject.name,
      activeProjectPath: activeProject.path,
      timing,
      errorMessage,
      ...(diagnostics?.stdoutPreview ? { codexStdoutPreview: diagnostics.stdoutPreview } : {}),
      ...(diagnostics?.stderrPreview ? { codexStderrPreview: diagnostics.stderrPreview } : {}),
    };
  }

  private resolveFailureStage(stage?: TicketFlowStage, fallbackPhase?: RunnerState["phase"]): TicketFinalStage {
    if (stage) {
      return stage;
    }

    if (
      fallbackPhase === "plan" ||
      fallbackPhase === "implement" ||
      fallbackPhase === "close-and-version"
    ) {
      return fallbackPhase;
    }

    return "close-and-version";
  }

  private async publishTicketFinalSummary(summary: TicketFinalSummary): Promise<void> {
    if (!this.onTicketFinalized) {
      return;
    }

    try {
      const delivery = await this.onTicketFinalized(summary);
      if (!delivery) {
        return;
      }

      this.state.lastNotifiedEvent = {
        summary: this.cloneTicketFinalSummary(summary),
        delivery: { ...delivery },
      };
      this.state.updatedAt = new Date(delivery.deliveredAtUtc);
    } catch (error) {
      const notificationFailure = this.buildNotificationFailureState(summary, error);
      this.state.lastNotificationFailure = notificationFailure;
      this.state.updatedAt = new Date(notificationFailure.failure.failedAtUtc);
      this.logger.error("Falha ao emitir resumo final de ticket", {
        ticket: summary.ticket,
        status: summary.status,
        error: error instanceof Error ? error.message : String(error),
        attempts: notificationFailure.failure.attempts,
        maxAttempts: notificationFailure.failure.maxAttempts,
        errorCode: notificationFailure.failure.errorCode,
        errorClass: notificationFailure.failure.errorClass,
        retryable: notificationFailure.failure.retryable,
        destinationChatId: notificationFailure.failure.destinationChatId,
      });
    }
  }

  private buildNotificationFailureState(
    summary: TicketFinalSummary,
    error: unknown,
  ): NonNullable<RunnerState["lastNotificationFailure"]> {
    if (isTicketNotificationDispatchError(error)) {
      return {
        summary: this.cloneTicketFinalSummary(summary),
        failure: { ...error.failure },
      };
    }

    const fallbackFailure: TicketNotificationFailure = {
      channel: "telegram",
      failedAtUtc: this.now().toISOString(),
      attempts: 1,
      maxAttempts: 1,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorClass: "non-retryable",
      retryable: false,
    };

    return {
      summary: this.cloneTicketFinalSummary(summary),
      failure: fallbackFailure,
    };
  }

  private async assertCloseAndVersion(
    slot: ActiveRunnerSlot,
    ticket: TicketRef,
    diagnostics?: CodexStageDiagnostics,
  ): Promise<GitSyncEvidence> {
    try {
      return await slot.gitVersioning.assertSyncedWithRemote();
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error("Validacao git falhou apos close-and-version", {
        ticket: ticket.name,
        ...(error instanceof GitSyncValidationError ? { failureCode: error.code, ...error.details } : {}),
        ...(error instanceof GitSyncValidationError ? {} : { error: details }),
        ...this.buildCloseAndVersionFailureHintLogContext(diagnostics),
        ...this.buildCodexDiagnosticsLogContext(diagnostics),
      });
      throw new CodexStageExecutionError(ticket.name, "close-and-version", details);
    }
  }

  private async commitCloseAndVersion(
    slot: ActiveRunnerSlot,
    ticket: TicketRef,
    execPlanPath: string,
    diagnostics?: CodexStageDiagnostics,
  ): Promise<void> {
    this.logger.info("Executando versionamento git controlado pelo runner", {
      ticket: ticket.name,
      execPlanPath,
    });

    try {
      await slot.gitVersioning.commitTicketClosure(ticket.name, execPlanPath);
      this.logger.info("Versionamento git concluido pelo runner apos close-and-version", {
        ticket: ticket.name,
        execPlanPath,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error("Versionamento git falhou apos close-and-version", {
        ticket: ticket.name,
        execPlanPath,
        error: details,
        ...this.buildCloseAndVersionFailureHintLogContext(diagnostics),
        ...this.buildCodexDiagnosticsLogContext(diagnostics),
      });
      throw new CodexStageExecutionError(ticket.name, "close-and-version", details);
    }
  }

  private buildCloseAndVersionFailureHintLogContext(
    diagnostics?: CodexStageDiagnostics,
  ): Record<string, unknown> {
    const stderrPreview = diagnostics?.stderrPreview ?? "";
    if (!stderrPreview) {
      return {};
    }

    if (
      /gh auth git-credential/u.test(stderrPreview) &&
      /\/usr\/bin\/gh: not found/u.test(stderrPreview)
    ) {
      return {
        diagnosedCause: "snap-git-credential-helper-missing",
        diagnosedCauseDetail:
          "Codex executou git remoto com o git interno do Snap; o helper configurado !/usr/bin/gh auth git-credential nao existe nesse sandbox. Use o bridge HOST_GIT/HOST_GH do host no mesmo comando.",
      };
    }

    if (/could not read Username for 'https:\/\/github\.com'/u.test(stderrPreview)) {
      return {
        diagnosedCause: "git-https-authentication-failed",
      };
    }

    return {};
  }

  private buildCodexDiagnosticsLogContext(
    diagnostics?: CodexStageDiagnostics,
  ): Record<string, unknown> {
    if (!diagnostics) {
      return {};
    }

    return {
      ...(diagnostics.stdoutPreview
        ? { codexAssistantResponsePreview: diagnostics.stdoutPreview }
        : {}),
      ...(diagnostics.stderrPreview
        ? { codexCliTranscriptPreview: diagnostics.stderrPreview }
        : {}),
    };
  }

  private recordStageDiagnostics(
    collector: Partial<Record<TicketFlowStage, CodexStageDiagnostics>>,
    stage: TicketFlowStage,
    diagnostics?: CodexStageDiagnostics,
  ): void {
    if (!diagnostics) {
      return;
    }

    collector[stage] = diagnostics;
  }

  private resolveStageDiagnostics(
    collector: Partial<Record<TicketFlowStage, CodexStageDiagnostics>>,
    stage: TicketFinalStage,
  ): CodexStageDiagnostics | undefined {
    return collector[stage];
  }

  private async runStage(
    slot: ActiveRunnerSlot,
    stage: TicketFlowStage,
    ticket: TicketRef,
    message: string,
    updateGlobalStateDirectly = false,
    timingCollector?: FlowTimingCollector<TicketFlowStage>,
  ): Promise<CodexStageResult> {
    const stageStartedAt = Date.now();
    if (updateGlobalStateDirectly) {
      this.state.currentTicket = ticket.name;
      this.touch(stage, message);
    } else {
      this.touchSlot(slot, stage, message);
    }

    try {
      const result = await slot.codexClient.runStage(stage, ticket);
      const durationMs = Date.now() - stageStartedAt;
      this.recordFlowStageCompletion(timingCollector, stage, durationMs);
      if (result.execPlanPath) {
        this.logger.info("ExecPlan reportado pela etapa plan", {
          ticket: ticket.name,
          execPlanPath: result.execPlanPath,
        });
      }
      this.logger.info("Etapa concluida no runner", {
        ticket: ticket.name,
        stage,
        durationMs,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      if (stage !== "close-and-version") {
        await this.recordWorkflowTraceSuccess(slot, {
          kind: "ticket",
          stage,
          targetName: ticket.name,
          targetPath: ticket.openPath,
          promptTemplatePath: result.promptTemplatePath,
          promptText: result.promptText,
          outputText: result.output,
          diagnostics: result.diagnostics,
          summary: `Etapa ${stage} concluida com sucesso no runner.`,
          metadata:
            stage === "plan" && result.execPlanPath
              ? {
                  execPlanPath: result.execPlanPath,
                }
              : undefined,
        });
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - stageStartedAt;
      this.recordFlowStageFailure(timingCollector, stage, durationMs);
      await this.recordWorkflowTraceFailure(slot, {
        kind: "ticket",
        stage,
        targetName: ticket.name,
        targetPath: ticket.openPath,
        error,
      });
      throw error;
    }
  }

  private async runSpecStage(
    slot: ActiveRunnerSlot,
    stage: Extract<SpecFlowStage, "spec-triage" | "spec-close-and-version" | "spec-audit">,
    spec: SpecRef,
    message: string,
  ): Promise<CodexStageResult> {
    const stageStartedAt = Date.now();
    const phase: RunnerState["phase"] = stage;
    this.touchSlot(slot, phase, message);

    try {
      const result = await slot.codexClient.runSpecStage(stage, spec);
      this.logger.info("Etapa de spec concluida no runner", {
        spec: spec.fileName,
        specPath: spec.path,
        stage,
        durationMs: Date.now() - stageStartedAt,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      await this.recordWorkflowTraceSuccess(slot, {
        kind: "spec",
        stage,
        targetName: spec.fileName,
        targetPath: spec.path,
        promptTemplatePath: result.promptTemplatePath,
        promptText: result.promptText,
        outputText: result.output,
        diagnostics: result.diagnostics,
        summary: `Etapa ${stage} concluida com sucesso no runner.`,
      });

      return result;
    } catch (error) {
      await this.recordWorkflowTraceFailure(slot, {
        kind: "spec",
        stage,
        targetName: spec.fileName,
        targetPath: spec.path,
        error,
      });
      throw error;
    }
  }

  private resolveWorkflowTraceSourceCommand(
    slot: ActiveRunnerSlot,
  ): WorkflowTraceSourceCommand | null {
    if (slot.kind === "run-all") {
      return "run-all";
    }

    if (slot.kind === "run-specs") {
      return "run-specs";
    }

    if (slot.kind === "run-ticket") {
      return "run-ticket";
    }

    return null;
  }

  private async recordWorkflowTraceSuccess(
    slot: ActiveRunnerSlot,
    request: WorkflowTraceSuccessRequest,
  ): Promise<void> {
    await this.recordWorkflowTrace(slot, {
      ...request,
      decisionStatus: request.decisionStatus ?? "success",
    });
  }

  private async recordWorkflowTraceFailure(
    slot: ActiveRunnerSlot,
    request: WorkflowTraceFailureRequest,
  ): Promise<void> {
    if (!(request.error instanceof CodexStageExecutionError)) {
      return;
    }

    const promptTemplatePath = request.error.promptTemplatePath?.trim() ?? "";
    const promptText = request.error.promptText?.trim() ?? "";
    if (!promptTemplatePath || !promptText) {
      return;
    }

    const diagnostics = request.error.diagnostics;
    await this.recordWorkflowTrace(slot, {
      kind: request.kind,
      stage: request.stage,
      targetName: request.targetName,
      targetPath: request.targetPath,
      promptTemplatePath,
      promptText,
      outputText: diagnostics?.stdoutPreview ?? "",
      diagnostics,
      summary: request.summary ?? `Etapa ${request.stage} falhou no runner.`,
      metadata: request.metadata,
      decisionStatus: "failure",
      decisionErrorMessage: request.error.message,
    });
  }

  private async recordWorkflowTrace(
    slot: ActiveRunnerSlot,
    request: WorkflowTraceSuccessRequest & {
      decisionStatus: "success" | "failure";
      decisionErrorMessage?: string;
    },
  ): Promise<void> {
    const sourceCommand = this.resolveWorkflowTraceSourceCommand(slot);
    if (!sourceCommand) {
      return;
    }

    try {
      const traceStore = this.workflowTraceStoreFactory(slot.project.path);
      await traceStore.recordStageTrace({
        kind: request.kind,
        stage: request.stage,
        sourceCommand,
        targetName: request.targetName,
        targetPath: request.targetPath,
        promptTemplatePath: request.promptTemplatePath,
        promptText: request.promptText,
        outputText: request.outputText,
        diagnostics: request.diagnostics,
        decision: {
          status: request.decisionStatus,
          summary: request.summary,
          ...(request.decisionErrorMessage
            ? { errorMessage: request.decisionErrorMessage }
            : {}),
          ...(request.metadata ? { metadata: request.metadata } : {}),
        },
        recordedAt: this.now(),
      });
    } catch (error) {
      this.logger.warn("Falha ao persistir trilha do fluxo principal", {
        stage: request.stage,
        targetName: request.targetName,
        targetPath: request.targetPath,
        sourceCommand,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private createFlowTimingCollector<Stage extends string>(startedAtMs = Date.now()): FlowTimingCollector<Stage> {
    return {
      startedAtMs,
      startedAtUtc: new Date(startedAtMs).toISOString(),
      durationsByStageMs: {},
      completedStages: [],
      interruptedStage: null,
    };
  }

  private recordFlowStageCompletion<Stage extends string>(
    collector: FlowTimingCollector<Stage> | undefined,
    stage: Stage,
    durationMs: number,
  ): void {
    if (!collector) {
      return;
    }

    this.addFlowStageDuration(collector, stage, durationMs);
    if (!collector.completedStages.includes(stage)) {
      collector.completedStages.push(stage);
    }
  }

  private recordFlowStageFailure<Stage extends string>(
    collector: FlowTimingCollector<Stage> | undefined,
    stage: Stage,
    durationMs: number,
  ): void {
    if (!collector) {
      return;
    }

    this.addFlowStageDuration(collector, stage, durationMs);
    this.markFlowInterrupted(collector, stage);
  }

  private addFlowStageDuration<Stage extends string>(
    collector: FlowTimingCollector<Stage>,
    stage: Stage,
    durationMs: number,
  ): void {
    const normalizedDurationMs = Math.max(0, Math.floor(durationMs));
    collector.durationsByStageMs[stage] =
      (collector.durationsByStageMs[stage] ?? 0) + normalizedDurationMs;
  }

  private markFlowInterrupted<Stage extends string>(
    collector: FlowTimingCollector<Stage>,
    stage: Stage,
  ): void {
    if (collector.interruptedStage) {
      return;
    }

    collector.interruptedStage = stage;
  }

  private buildFlowTimingSnapshot<Stage extends string>(
    collector: FlowTimingCollector<Stage>,
    finishedAtMs = Date.now(),
  ): FlowTimingSnapshot<Stage> {
    return {
      startedAtUtc: collector.startedAtUtc,
      finishedAtUtc: new Date(finishedAtMs).toISOString(),
      totalDurationMs: Math.max(0, finishedAtMs - collector.startedAtMs),
      durationsByStageMs: { ...collector.durationsByStageMs },
      completedStages: [...collector.completedStages],
      interruptedStage: collector.interruptedStage,
    };
  }

  private normalizeFlowCodexPreferencesSnapshot(
    preferences: CodexInvocationPreferences | null,
  ): CodexFlowPreferencesSnapshot | null {
    if (!preferences) {
      return null;
    }

    const model = preferences.model.trim();
    const reasoningEffort = preferences.reasoningEffort.trim();
    if (!model || !reasoningEffort) {
      return null;
    }

    return {
      model,
      reasoningEffort,
      speed: preferences.speed ?? "standard",
    };
  }

  private validatePlanSpecFinalBlockForMaterialization(
    finalBlock: PlanSpecFinalBlock,
  ): string | null {
    const missingFields: string[] = [];
    if (!finalBlock.outline.objective.trim()) {
      missingFields.push("objetivo");
    }
    if (finalBlock.outline.actors.length === 0) {
      missingFields.push("atores");
    }
    if (finalBlock.outline.journey.length === 0) {
      missingFields.push("jornada");
    }
    if (finalBlock.outline.requirements.length === 0) {
      missingFields.push("RFs");
    }
    if (finalBlock.outline.acceptanceCriteria.length === 0) {
      missingFields.push("CAs");
    }
    if (finalBlock.outline.nonScope.length === 0) {
      missingFields.push("nao-escopo");
    }

    if (missingFields.length === 0) {
      return null;
    }

    return `Bloco final do planejamento incompleto para materializar a spec; faltam: ${missingFields.join(", ")}.`;
  }

  private cloneFlowCodexPreferencesSnapshot(
    snapshot: CodexFlowPreferencesSnapshot,
  ): CodexFlowPreferencesSnapshot {
    return {
      model: snapshot.model,
      reasoningEffort: snapshot.reasoningEffort,
      speed: snapshot.speed,
    };
  }

  private cloneFlowTimingSnapshot<Stage extends string>(
    snapshot: FlowTimingSnapshot<Stage>,
  ): FlowTimingSnapshot<Stage> {
    return {
      startedAtUtc: snapshot.startedAtUtc,
      finishedAtUtc: snapshot.finishedAtUtc,
      totalDurationMs: snapshot.totalDurationMs,
      durationsByStageMs: { ...snapshot.durationsByStageMs },
      completedStages: [...snapshot.completedStages],
      interruptedStage: snapshot.interruptedStage,
    };
  }

  private mergeTicketTimingIntoRunAllCollector(
    collector: FlowTimingCollector<RunAllTimingStage>,
    timing: TicketTimingSnapshot,
  ): void {
    for (const stage of ["plan", "implement", "close-and-version"] as const) {
      const durationMs = timing.durationsByStageMs[stage];
      if (typeof durationMs === "number") {
        this.addFlowStageDuration(collector, stage, durationMs);
      }
      if (timing.completedStages.includes(stage) && !collector.completedStages.includes(stage)) {
        collector.completedStages.push(stage);
      }
    }

    if (timing.interruptedStage) {
      this.markFlowInterrupted(collector, timing.interruptedStage);
    }
  }

  private resolveRunAllFinalStageFromRunnerPhase(phase: RunnerState["phase"]): RunAllFinalStage {
    if (
      phase === "select-ticket" ||
      phase === "plan" ||
      phase === "implement" ||
      phase === "close-and-version"
    ) {
      return phase;
    }

    return "unknown";
  }

  private buildRunAllFlowSummary(params: {
    slot: ActiveRunnerSlot;
    processedTicketsCount: number;
    maxTicketsPerRound: number;
    outcome: RunAllFlowSummary["outcome"];
    finalStage: RunAllFinalStage;
    completionReason: RunAllCompletionReason;
    ticket?: string;
    details?: string;
    timingCollector: FlowTimingCollector<RunAllTimingStage>;
  }): RunAllFlowSummary {
    return {
      flow: "run-all",
      outcome: params.outcome,
      finalStage: params.finalStage,
      completionReason: params.completionReason,
      timestampUtc: this.now().toISOString(),
      activeProjectName: params.slot.project.name,
      activeProjectPath: params.slot.project.path,
      processedTicketsCount: params.processedTicketsCount,
      maxTicketsPerRound: params.maxTicketsPerRound,
      ...(params.ticket ? { ticket: params.ticket } : {}),
      ...(params.details ? { details: params.details } : {}),
      ...(params.slot.codexPreferencesSnapshot
        ? {
            codexPreferences: this.cloneFlowCodexPreferencesSnapshot(
              params.slot.codexPreferencesSnapshot,
            ),
          }
        : {}),
      timing: this.buildFlowTimingSnapshot(params.timingCollector),
    };
  }

  private buildRunSpecsFlowSummary(params: {
    slot: ActiveRunnerSlot;
    spec: SpecRef;
    outcome: RunSpecsFlowSummary["outcome"];
    finalStage: RunSpecsFlowFinalStage;
    completionReason: RunSpecsFlowCompletionReason;
    details?: string;
    triageTimingCollector: FlowTimingCollector<RunSpecsTriageTimingStage>;
    flowTimingCollector: FlowTimingCollector<RunSpecsFlowTimingStage>;
    specTicketValidation?: RunSpecsTicketValidationSummary;
    runAllSummary?: RunAllFlowSummary;
  }): RunSpecsFlowSummary {
    return {
      flow: "run-specs",
      outcome: params.outcome,
      finalStage: params.finalStage,
      completionReason: params.completionReason,
      timestampUtc: this.now().toISOString(),
      activeProjectName: params.slot.project.name,
      activeProjectPath: params.slot.project.path,
      spec: {
        fileName: params.spec.fileName,
        path: params.spec.path,
      },
      ...(params.details ? { details: params.details } : {}),
      ...(params.slot.codexPreferencesSnapshot
        ? {
            codexPreferences: this.cloneFlowCodexPreferencesSnapshot(
              params.slot.codexPreferencesSnapshot,
            ),
          }
        : {}),
      triageTiming: this.buildFlowTimingSnapshot(params.triageTimingCollector),
      timing: this.buildFlowTimingSnapshot(params.flowTimingCollector),
      ...(params.specTicketValidation
        ? {
            specTicketValidation: this.cloneRunSpecsTicketValidationSummary(
              params.specTicketValidation,
            ),
          }
        : {}),
      ...(params.runAllSummary
        ? {
            runAllSummary: this.cloneRunAllFlowSummary(params.runAllSummary),
          }
        : {}),
    };
  }

  private cloneTicketFinalSummary(summary: TicketFinalSummary): TicketFinalSummary {
    if (summary.status === "success") {
      return {
        ...summary,
        timing: this.cloneFlowTimingSnapshot(summary.timing),
      };
    }

    return {
      ...summary,
      timing: this.cloneFlowTimingSnapshot(summary.timing),
    };
  }

  private cloneRunAllFlowSummary(summary: RunAllFlowSummary): RunAllFlowSummary {
    return {
      ...summary,
      ...(summary.codexPreferences
        ? {
            codexPreferences: this.cloneFlowCodexPreferencesSnapshot(summary.codexPreferences),
          }
        : {}),
      timing: this.cloneFlowTimingSnapshot(summary.timing),
    };
  }

  private cloneRunSpecsTicketValidationSummary(
    summary: RunSpecsTicketValidationSummary,
  ): RunSpecsTicketValidationSummary {
    return {
      verdict: summary.verdict,
      confidence: summary.confidence,
      finalReason: summary.finalReason,
      cyclesExecuted: summary.cyclesExecuted,
      validationThreadId: summary.validationThreadId,
      triageContextInherited: summary.triageContextInherited,
      summary: summary.summary,
      gaps: summary.gaps.map((gap) => ({
        gapType: gap.gapType,
        summary: gap.summary,
        affectedArtifactPaths: [...gap.affectedArtifactPaths],
        requirementRefs: [...gap.requirementRefs],
        evidence: [...gap.evidence],
        probableRootCause: gap.probableRootCause,
        isAutoCorrectable: gap.isAutoCorrectable,
      })),
      appliedCorrections: summary.appliedCorrections.map((correction) => ({
        description: correction.description,
        affectedArtifactPaths: [...correction.affectedArtifactPaths],
        linkedGapTypes: [...correction.linkedGapTypes],
        outcome: correction.outcome,
      })),
      finalOpenGapFingerprints: [...summary.finalOpenGapFingerprints],
    };
  }

  private cloneRunnerFlowSummary(summary: RunnerFlowSummary): RunnerFlowSummary {
    if (summary.flow === "run-all") {
      return this.cloneRunAllFlowSummary(summary);
    }

    return {
      ...summary,
      spec: { ...summary.spec },
      ...(summary.codexPreferences
        ? {
            codexPreferences: this.cloneFlowCodexPreferencesSnapshot(summary.codexPreferences),
          }
        : {}),
      triageTiming: this.cloneFlowTimingSnapshot(summary.triageTiming),
      timing: this.cloneFlowTimingSnapshot(summary.timing),
      ...(summary.specTicketValidation
        ? {
            specTicketValidation: this.cloneRunSpecsTicketValidationSummary(
              summary.specTicketValidation,
            ),
          }
        : {}),
      ...(summary.runAllSummary
        ? {
            runAllSummary: this.cloneRunAllFlowSummary(summary.runAllSummary),
          }
        : {}),
    };
  }

  private reserveSlot(
    roundDependencies: RunnerRoundDependencies,
    kind: RunnerSlotKind,
  ): { status: "reserved"; slot: ActiveRunnerSlot } | RunnerRequestBlockedResult {
    const slotKey = this.buildSlotKey(roundDependencies.activeProject);
    const existing = this.activeSlots.get(slotKey);
    if (existing) {
      const requestedCommand = this.renderSlotCommand(kind);
      const existingCommand = this.renderSlotCommand(existing.kind);
      return {
        status: "blocked",
        reason: "project-slot-busy",
        message:
          `Nao e possivel iniciar ${requestedCommand}: slot do projeto ${roundDependencies.activeProject.name} ` +
          `ja ocupado por ${existingCommand}.`,
      };
    }

    if (this.activeSlots.size >= RUNNER_SLOT_LIMIT) {
      const activeProjects = this.getActiveProjects();
      return {
        status: "blocked",
        reason: "runner-capacity-maxed",
        message: this.buildCapacityMaxedMessage(activeProjects),
        activeProjects,
      };
    }

    const slot: ActiveRunnerSlot = {
      key: slotKey,
      kind,
      project: { ...roundDependencies.activeProject },
      queue: roundDependencies.queue,
      codexClient: roundDependencies.codexClient,
      codexPreferencesSnapshot: null,
      gitVersioning: roundDependencies.gitVersioning,
      isStarting: true,
      isRunning: false,
      isPaused: false,
      currentTicket: null,
      currentSpec: null,
      phase: "idle",
      startedAt: this.now(),
      loopPromise: null,
    };

    this.activeSlots.set(slotKey, slot);
    this.syncStateFromSlots();
    this.logger.info("Slot de projeto reservado", {
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
      kind,
      usedSlots: this.activeSlots.size,
      maxSlots: RUNNER_SLOT_LIMIT,
    });

    return {
      status: "reserved",
      slot,
    };
  }

  private releaseSlot(slotKey: string): void {
    const slot = this.activeSlots.get(slotKey);
    if (!slot) {
      return;
    }

    slot.codexPreferencesSnapshot = null;
    this.activeSlots.delete(slotKey);
    this.syncStateFromSlots();
    this.logger.info("Slot de projeto liberado", {
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
      kind: slot.kind,
      usedSlots: this.activeSlots.size,
      maxSlots: RUNNER_SLOT_LIMIT,
    });
  }

  private requestProjectControl(action: RunnerProjectControlAction): RunnerProjectControlResult {
    const activeProject = this.state.activeProject ? { ...this.state.activeProject } : null;
    if (!activeProject) {
      this.logger.warn("Controle de runner ignorado: projeto ativo indisponivel", {
        action,
      });
      return {
        status: "ignored",
        action,
        reason: "active-project-unavailable",
        project: null,
      };
    }

    const slot = this.activeSlots.get(this.buildSlotKey(activeProject));
    if (
      !slot ||
      slot.kind === "discover-spec" ||
      slot.kind === "plan-spec" ||
      slot.kind === "codex-chat"
    ) {
      this.logger.info("Controle de runner ignorado: sem slot de execucao no projeto ativo", {
        action,
        activeProjectName: activeProject.name,
        activeProjectPath: activeProject.path,
      });
      return {
        status: "ignored",
        action,
        reason: "project-slot-inactive",
        project: activeProject,
      };
    }

    if (action === "pause") {
      slot.isPaused = true;
      slot.phase = "paused";
      this.touchSlot(slot, "paused", "Pausa solicitada via Telegram");
      return {
        status: "applied",
        action,
        project: { ...slot.project },
        isPaused: true,
      };
    }

    slot.isPaused = false;
    if (slot.phase === "paused") {
      slot.phase = "idle";
    }
    this.touchSlot(slot, "idle", "Runner retomado via Telegram");
    return {
      status: "applied",
      action,
      project: { ...slot.project },
      isPaused: false,
    };
  }

  private getRunSlots(): ActiveRunnerSlot[] {
    return Array.from(this.activeSlots.values()).filter((slot) => this.isTicketSlotKind(slot.kind));
  }

  private getActiveProjects(): ProjectRef[] {
    return Array.from(this.activeSlots.values()).map((slot) => ({ ...slot.project }));
  }

  private buildSlotKey(project: ProjectRef): string {
    return `${project.name}::${project.path}`;
  }

  private renderSlotCommand(kind: RunnerSlotKind): string {
    if (kind === "run-all") {
      return "/run_all";
    }

    if (kind === "run-specs") {
      return "/run_specs";
    }

    if (kind === "run-ticket") {
      return "/run_ticket";
    }

    if (kind === "codex-chat") {
      return "/codex_chat";
    }

    if (kind === "discover-spec") {
      return "/discover_spec";
    }

    return "/plan_spec";
  }

  private isTicketSlotKind(kind: RunnerSlotKind): boolean {
    return kind === "run-all" || kind === "run-specs" || kind === "run-ticket";
  }

  private buildCapacityMaxedMessage(activeProjects: ProjectRef[]): string {
    const activeProjectNames = activeProjects.map((project) => project.name).join(", ");
    const suffix = activeProjectNames
      ? ` Projetos em execucao: ${activeProjectNames}.`
      : "";

    return `Capacidade maxima de ${RUNNER_SLOT_LIMIT} runners ativos atingida.${suffix}`;
  }

  private buildShutdownBlockedResult(command: string): {
    status: "blocked";
    reason: "shutdown-in-progress";
    message: string;
  } {
    return {
      status: "blocked",
      reason: "shutdown-in-progress",
      message: `Nao e possivel iniciar ${command}: shutdown gracioso em andamento.`,
    };
  }

  private buildActiveProjectResolutionErrorMessage(
    error: unknown,
    source:
      | "run-all"
      | "run-specs"
      | "run-ticket"
      | "discover-spec"
      | "plan-spec"
      | "codex-chat",
  ): string {
    const details = error instanceof Error ? error.message : String(error);
    const command =
      source === "run-all"
        ? "/run-all"
        : source === "run-specs"
          ? "/run_specs"
          : source === "run-ticket"
            ? "/run_ticket"
            : source === "discover-spec"
              ? "/discover_spec"
            : source === "plan-spec"
              ? "/plan_spec"
              : "/codex_chat";
    return [
      `Falha ao resolver projeto ativo para rodada ${command}.`,
      "Verifique PROJECTS_ROOT_PATH, descoberta e estado persistido do projeto ativo.",
      `Detalhes: ${details}`,
    ].join(" ");
  }

  private buildCodexPreferencesResolutionErrorMessage(
    project: ProjectRef,
    error: unknown,
  ): string {
    const details = error instanceof Error ? error.message : String(error);
    return [
      `Falha ao resolver modelo e reasoning do Codex para o projeto ${project.name}.`,
      "Verifique o catalogo local em ~/.codex/models_cache.json e a configuracao em ~/.codex/config.toml.",
      `Detalhes: ${details}`,
    ].join(" ");
  }

  private syncStateFromSlots(): void {
    const slots = Array.from(this.activeSlots.values()).sort(
      (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
    );

    this.state.capacity = {
      limit: RUNNER_SLOT_LIMIT,
      used: slots.length,
    };
    this.state.activeSlots = slots.map((slot) => ({
      project: { ...slot.project },
      kind: slot.kind,
      phase: slot.phase,
      currentTicket: slot.currentTicket,
      currentSpec: slot.currentSpec,
      isPaused: slot.isPaused,
      startedAt: new Date(slot.startedAt),
    }));

    this.state.isRunning = slots.some(
      (slot) => this.isTicketSlotKind(slot.kind) && (slot.isStarting || slot.isRunning || Boolean(slot.loopPromise)),
    );

    const activeProject = this.state.activeProject;
    if (activeProject) {
      const activeSlot = this.activeSlots.get(this.buildSlotKey(activeProject));
      if (activeSlot) {
        this.state.isPaused = activeSlot.isPaused;
        this.state.currentTicket = activeSlot.currentTicket;
        this.state.currentSpec = activeSlot.currentSpec;
        this.state.phase = activeSlot.phase;
      } else {
        this.state.isPaused = false;
        this.state.currentTicket = null;
        this.state.currentSpec = null;
        if (
          !this.isDiscoverSpecSessionActive() &&
          !this.isPlanSpecSessionActive() &&
          !this.isCodexChatSessionActive() &&
          this.state.phase !== "error"
        ) {
          this.state.phase = "idle";
        }
      }
    }

    this.state.updatedAt = this.now();
  }

  private isSameProject(left: ProjectRef | null, right: ProjectRef): boolean {
    if (!left) {
      return false;
    }

    return left.name === right.name && left.path === right.path;
  }

  private touchSlot(slot: ActiveRunnerSlot, phase: RunnerState["phase"], message: string): void {
    slot.phase = phase;
    this.syncStateFromSlots();
    this.state.lastMessage = message;
    if (this.isSameProject(this.state.activeProject, slot.project)) {
      this.state.phase = phase;
      this.state.currentTicket = slot.currentTicket;
      this.state.currentSpec = slot.currentSpec;
      this.state.isPaused = slot.isPaused;
    }
    this.state.updatedAt = this.now();

    this.logger.info(message, {
      phase,
      currentTicket: slot.currentTicket,
      currentSpec: slot.currentSpec,
      activeProjectName: slot.project.name,
      activeProjectPath: slot.project.path,
    });
  }

  private touch(phase: RunnerState["phase"], message: string): void {
    this.state.phase = phase;
    this.state.lastMessage = message;
    this.state.updatedAt = this.now();
    this.logger.info(message, {
      phase,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
