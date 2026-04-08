import { promises as fs } from "node:fs";
import path from "node:path";
import { AppEnv } from "../config/env.js";
import { ProjectRef } from "../types/project.js";
import {
  CodexChatSessionClosureReason,
  CodexChatOutputDelivery,
  CodexChatOutputFailure,
  CodexChatSessionPhase,
  DiscoverSpecSessionPhase,
  PlanSpecSessionPhase,
  RunnerSlotKind,
  RunnerState,
  RunnerTargetFlowState,
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
  FlowNotificationDelivery,
  FlowNotificationFailure,
  isFlowNotificationDispatchError,
  FlowTimingSnapshot,
  RunAllCompletionReason,
  RunAllFinalStage,
  RunAllFlowSummary,
  RunSpecsDerivationRetrospectiveSummary,
  RunAllTimingStage,
  RunSpecsEntryPoint,
  RunnerFlowSummary,
  RunSpecsSourceCommand,
  RunSpecsSpecAuditSummary,
  RunSpecsSpecCloseAndVersionSummary,
  RunSpecsSpecTriageSummary,
  RunSpecsFlowCompletionReason,
  RunSpecsFlowFinalStage,
  RunSpecsFlowSummary,
  RunSpecsFlowTimingStage,
  RunSpecsTicketValidationSummary,
  RunSpecsTriageFinalStage,
  RunSpecsTriageTimingStage,
  TargetCheckupFlowSummary,
  TargetDeriveFlowSummary,
  TargetInvestigateCaseFlowSummary,
  TargetFlowMilestoneLifecycleEvent,
  TargetPrepareFlowSummary,
} from "../types/flow-timing.js";
import { Logger } from "./logger.js";
import { isTelegramMessageDeliveryDispatchError } from "../integrations/telegram-delivery.js";
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
  TargetFlowTraceRecordRequest,
  WorkflowStageTraceRecord,
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
import { TicketBacklogSnapshot, TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
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
import {
  WorkflowImprovementTicketAnalysisStage,
  WorkflowImprovementTicketCandidate,
  WorkflowImprovementTicketHandoff,
  WorkflowImprovementTicketPublicationResult,
  buildWorkflowImprovementTicketFindingFingerprint,
} from "../types/workflow-improvement-ticket.js";
import {
  WorkflowImprovementTicketPublisher,
} from "../integrations/workflow-improvement-ticket-publisher.js";
import {
  runSpecTicketValidation,
  SpecTicketValidationExecutionError,
} from "./spec-ticket-validation.js";
import {
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationGap,
  SpecTicketValidationResult,
} from "../types/spec-ticket-validation.js";
import {
  WorkflowGapAnalysisInputMode,
  WorkflowGapAnalysisParseResult,
  WorkflowGapAnalysisResult,
  createWorkflowGapAnalysisOperationalLimitation,
} from "../types/workflow-gap-analysis.js";
import {
  WorkflowGapAnalysisParserError,
  parseWorkflowGapAnalysisOutput,
} from "../integrations/workflow-gap-analysis-parser.js";
import {
  TargetPrepareExecutor,
} from "./target-prepare.js";
import { TargetPrepareExecutionResult } from "../types/target-prepare.js";
import { TargetPrepareLifecycleHooks } from "../types/target-prepare.js";
import {
  TargetCheckupExecutor,
} from "./target-checkup.js";
import { TargetCheckupExecutionResult } from "../types/target-checkup.js";
import { TargetCheckupLifecycleHooks } from "../types/target-checkup.js";
import {
  TargetDeriveExecutor,
} from "./target-derive.js";
import { TargetDeriveExecutionResult } from "../types/target-derive.js";
import { TargetDeriveLifecycleHooks } from "../types/target-derive.js";
import {
  describeTargetInvestigateCaseDiagnosisVerdict,
  describeTargetInvestigateCaseInvestigationOutcome,
  parseTargetInvestigateCaseCommand,
  TargetInvestigateCaseExecutor,
} from "./target-investigate-case.js";
import {
  TargetCheckupMilestone,
  TargetDeriveMilestone,
  TargetFlowAiExchange,
  TargetFlowCommand,
  TargetFlowKind,
  TargetFlowMilestone,
  TargetFlowVersionBoundaryState,
  TargetInvestigateCaseMilestone,
  TargetPrepareMilestone,
  renderTargetFlowMilestoneLabel,
  targetFlowKindToCommand,
} from "../types/target-flow.js";
import {
  TargetInvestigateCaseExecutionResult,
  TargetInvestigateCaseLifecycleHooks,
} from "../types/target-investigate-case.js";

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
  ) => Promise<CodexChatOutputDelivery | void> | CodexChatOutputDelivery | void;
  onFailure: (chatId: string, details: string) => Promise<void> | void;
  onLifecycleMessage?: (chatId: string, message: string) => Promise<void> | void;
}

export type RunSpecsTriageOutcome = "success" | "failure" | "blocked";

export interface RunSpecsTriageLifecycleEvent {
  spec: SpecRef;
  outcome: RunSpecsTriageOutcome;
  finalStage: RunSpecsTriageFinalStage;
  sourceCommand: RunSpecsSourceCommand;
  entryPoint: RunSpecsEntryPoint;
  nextAction: string;
  timing: FlowTimingSnapshot<RunSpecsTriageTimingStage>;
  details?: string;
  specTicketValidation?: RunSpecsTicketValidationSummary;
  specTicketDerivationRetrospective?: RunSpecsDerivationRetrospectiveSummary;
}

export interface RunSpecsEventHandlers {
  onTriageMilestone: (event: RunSpecsTriageLifecycleEvent) => Promise<void> | void;
}

export interface RunFlowEventHandlers {
  onFlowCompleted: (
    event: RunnerFlowSummary,
  ) => Promise<FlowNotificationDelivery | null | void> | FlowNotificationDelivery | null | void;
}

export interface TargetFlowEventHandlers {
  onMilestone: (event: TargetFlowMilestoneLifecycleEvent) => Promise<void> | void;
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
  targetFlowEventHandlers?: TargetFlowEventHandlers;
  codexPreferencesService?: CodexPreferencesService;
  workflowImprovementTicketPublisher?: WorkflowImprovementTicketPublisher;
  targetPrepareExecutor?: TargetPrepareExecutor;
  targetCheckupExecutor?: TargetCheckupExecutor;
  targetDeriveExecutor?: TargetDeriveExecutor;
  targetInvestigateCaseExecutor?: TargetInvestigateCaseExecutor;
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
  runSpecsSourceCommand: RunSpecsSourceCommand | null;
  runSpecsEntryPoint: RunSpecsEntryPoint | null;
  phase: RunnerState["phase"];
  startedAt: Date;
  loopPromise: Promise<void> | null;
}

interface TargetFlowTraceMilestoneRecord {
  milestone: TargetFlowMilestone;
  milestoneLabel: string;
  message: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
  recordedAtUtc: string;
}

interface PendingTargetFlowReservation {
  slotKey: string;
  flow: TargetFlowKind;
  command: TargetFlowCommand;
  projectName: string;
  projectPath: string | null;
  startedAt: Date;
}

interface ActiveTargetFlowExecution<Stage extends string = string> {
  slotKey: string;
  flow: TargetFlowKind;
  command: TargetFlowCommand;
  targetProject: ProjectRef;
  phase: RunnerState["phase"];
  milestone: Stage;
  milestoneLabel: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
  cancelRequestedAt: Date | null;
  startedAt: Date;
  updatedAt: Date;
  lastMessage: string;
  timing: FlowTimingCollector<Stage>;
  currentStageStartedAtMs: number;
  traceInputs: Record<string, unknown>;
  traceMilestones: TargetFlowTraceMilestoneRecord[];
  traceAiExchanges: TargetFlowAiExchange[];
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

interface SpecStageTraceValidation {
  summary?: string;
  metadata?: Record<string, unknown>;
}

type RunnerSpecStageResult = CodexStageResult & {
  traceRecord: WorkflowStageTraceRecord | null;
};

interface ParsedSpecStageResult<Summary> {
  summary: Summary;
  outputText: string;
}

type SpecTriageStageResult = ParsedSpecStageResult<RunSpecsSpecTriageSummary>;

type SpecCloseAndVersionStageResult =
  ParsedSpecStageResult<RunSpecsSpecCloseAndVersionSummary>;

type SpecAuditStageResult = ParsedSpecStageResult<RunSpecsSpecAuditSummary>;

interface WorkflowRetrospectiveStageResult {
  analysis: WorkflowGapAnalysisResult;
  publication?: WorkflowImprovementTicketPublicationResult;
}

interface SpecTicketDerivationRetrospectiveContext {
  inputMode: Extract<WorkflowGapAnalysisInputMode, "spec-ticket-validation-history">;
  promptContext: string;
  workflowArtifactsConsulted: string[];
  specContent: string;
  packageContext: SpecTicketValidationPackageContext;
  validationSummary: RunSpecsTicketValidationSummary;
}

interface WorkflowGapAnalysisContext {
  inputMode: WorkflowGapAnalysisInputMode;
  promptContext: string;
  followUpTicketPaths: string[];
  workflowArtifactsConsulted: string[];
  specContent: string;
  preRunHistoricalContext: WorkflowGapAnalysisPreRunHistoricalContext | null;
}

interface WorkflowGapAnalysisPreRunHistoricalFinding {
  summary: string;
  fingerprint: string;
}

interface WorkflowGapAnalysisPreRunHistoricalContext {
  decision: RunSpecsDerivationRetrospectiveSummary["decision"];
  summary: string;
  classification: WorkflowGapAnalysisResult["classification"] | null;
  confidence: WorkflowGapAnalysisResult["confidence"] | null;
  ticketPath: string | null;
  findings: WorkflowGapAnalysisPreRunHistoricalFinding[];
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

interface SpecTicketValidationArtifactSnapshot {
  relativePath: string;
  absolutePath: string;
  content: string | null;
}

class RunnerSpecTicketValidationStageError extends Error {
  readonly stage = "spec-ticket-validation";
  readonly partialSummary?: RunSpecsTicketValidationSummary;
  readonly packageContext?: SpecTicketValidationPackageContext;

  constructor(
    message: string,
    cause?: unknown,
    partialSummary?: RunSpecsTicketValidationSummary,
    packageContext?: SpecTicketValidationPackageContext,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RunnerSpecTicketValidationStageError";
    this.partialSummary = partialSummary;
    this.packageContext = packageContext;
  }
}

class RunnerSpecStageContractError extends Error {
  constructor(
    readonly stage: Extract<
      SpecFlowStage,
      | "spec-triage"
      | "spec-ticket-derivation-retrospective"
      | "spec-close-and-version"
      | "spec-audit"
      | "spec-workflow-retrospective"
    >,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RunnerSpecStageContractError";
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
  closedAtUtc: string | null;
  relatedChangeset: string | null;
  followUpTicketPath: string | null;
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
  /^\s*-\s*(?:Parent ticket(?:\s*\(optional\))?|Ticket pai(?:\s*\(opcional\))?)\s*:\s*(.+?)\s*$/imu;
const TICKET_CLOSURE_REASON_METADATA_PATTERN = /^\s*-\s*Closure reason\s*:\s*(.+?)\s*$/imu;
const TICKET_CLOSED_AT_METADATA_PATTERN = /^\s*-\s*Closed at \(UTC\)\s*:\s*(.+?)\s*$/imu;
const TICKET_RELATED_CHANGESET_METADATA_PATTERN =
  /^\s*-\s*Related PR\/commit\/execplan\s*:\s*(.+?)\s*$/imu;
const TICKET_FOLLOW_UP_METADATA_PATTERN =
  /^\s*-\s*Follow-up ticket(?:\s*\(required when `Closure reason: split-follow-up`\))?\s*:\s*(.+?)\s*$/imu;
const TICKET_SOURCE_SPEC_METADATA_PATTERN =
  /^\s*-\s*(?:Source spec(?:\s*\(when applicable\))?|Spec pai(?:\s*\(opcional\))?)\s*:\s*(.+?)\s*$/imu;
const SPEC_RELATED_TICKETS_BLOCK_PATTERN =
  /^\s*-\s*(?:Related tickets|Tickets relacionados)\s*:\s*\n((?:^\s{2,}-\s*.+\n?)*)/imu;
const TOP_LEVEL_SECTION_HEADING_PATTERN = /^##\s+/mu;
const VALID_TICKET_CLOSURE_REASONS = new Set([
  "fixed",
  "duplicate",
  "invalid",
  "wont-fix",
  "split-follow-up",
]);

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

export type RunSpecsFromValidationRequestResult =
  | { status: "started" }
  | { status: "already-running" }
  | RunnerRequestBlockedResult
  | {
      status: "validation-blocked";
      message: string;
    }
  | {
      status: "validation-failed";
      message: string;
    };

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

export type TargetPrepareRequestResult =
  | {
      status: "started";
      message: string;
    }
  | TargetPrepareExecutionResult
  | RunnerRequestBlockedResult;

export type TargetCheckupRequestResult =
  | {
      status: "started";
      message: string;
    }
  | TargetCheckupExecutionResult
  | RunnerRequestBlockedResult;

export type TargetDeriveRequestResult =
  | {
      status: "started";
      message: string;
    }
  | TargetDeriveExecutionResult
  | RunnerRequestBlockedResult;

export type TargetInvestigateCaseRequestResult =
  | {
      status: "started";
      message: string;
    }
  | TargetInvestigateCaseExecutionResult
  | RunnerRequestBlockedResult;

export type TargetFlowCancelResult =
  | {
      status: "accepted";
      message: string;
    }
  | {
      status: "late";
      message: string;
    }
  | {
      status: "inactive";
      message: string;
    }
  | {
      status: "ambiguous";
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
  | { status: "blocked-plan-spec" }
  | { status: "blocked-target-flow" };

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
  private readonly targetFlowEventHandlers?: TargetFlowEventHandlers;
  private readonly codexPreferencesService?: CodexPreferencesService;
  private readonly workflowImprovementTicketPublisher: WorkflowImprovementTicketPublisher | null;
  private readonly targetPrepareExecutor: TargetPrepareExecutor | null;
  private readonly targetCheckupExecutor: TargetCheckupExecutor | null;
  private readonly targetDeriveExecutor: TargetDeriveExecutor | null;
  private readonly targetInvestigateCaseExecutor: TargetInvestigateCaseExecutor | null;
  private activeDiscoverSpecSession: ActiveDiscoverSpecSession | null = null;
  private activePlanSpecSession: ActivePlanSpecSession | null = null;
  private activeCodexChatSession: ActiveCodexChatSession | null = null;
  private readonly activeTargetFlows = new Map<string, ActiveTargetFlowExecution>();
  private readonly pendingTargetFlows = new Map<string, PendingTargetFlowReservation>();
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
    this.targetFlowEventHandlers = options.targetFlowEventHandlers;
    this.codexPreferencesService = options.codexPreferencesService;
    this.workflowImprovementTicketPublisher = options.workflowImprovementTicketPublisher ?? null;
    this.targetPrepareExecutor = options.targetPrepareExecutor ?? null;
    this.targetCheckupExecutor = options.targetCheckupExecutor ?? null;
    this.targetDeriveExecutor = options.targetDeriveExecutor ?? null;
    this.targetInvestigateCaseExecutor = options.targetInvestigateCaseExecutor ?? null;
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
    ...(this.state.targetFlow
      ? {
          targetFlow: {
            ...this.state.targetFlow,
            targetProject: { ...this.state.targetFlow.targetProject },
            startedAt: new Date(this.state.targetFlow.startedAt),
            updatedAt: new Date(this.state.targetFlow.updatedAt),
            ...(this.state.targetFlow.cancelRequestedAt
              ? {
                  cancelRequestedAt: new Date(this.state.targetFlow.cancelRequestedAt),
                }
              : {}),
          },
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
    ...(this.state.lastCodexChatOutputEvent
      ? {
          lastCodexChatOutputEvent: {
            ...this.state.lastCodexChatOutputEvent,
            delivery: { ...this.state.lastCodexChatOutputEvent.delivery },
          },
        }
      : {}),
    ...(this.state.lastCodexChatOutputFailure
      ? {
          lastCodexChatOutputFailure: {
            ...this.state.lastCodexChatOutputFailure,
            failure: { ...this.state.lastCodexChatOutputFailure.failure },
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
    ...(this.state.lastRunFlowNotificationEvent
      ? {
          lastRunFlowNotificationEvent: {
            summary: this.cloneRunnerFlowSummary(
              this.state.lastRunFlowNotificationEvent.summary,
            ),
            delivery: { ...this.state.lastRunFlowNotificationEvent.delivery },
          },
        }
      : {}),
    ...(this.state.lastRunFlowNotificationFailure
      ? {
          lastRunFlowNotificationFailure: {
            summary: this.cloneRunnerFlowSummary(
              this.state.lastRunFlowNotificationFailure.summary,
            ),
            failure: { ...this.state.lastRunFlowNotificationFailure.failure },
          },
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
      this.startRunSlotLoop(slot, () =>
        this.runSpecsFlow(slot, spec, {
          entryPoint: "spec-triage",
          sourceCommand: "/run_specs",
        }),
      );

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

  requestRunSpecsFromValidation = async (
    specFileName: string,
  ): Promise<RunSpecsFromValidationRequestResult> => {
    const normalizedSpecFileName = this.normalizeSpecFileName(specFileName);
    const spec: SpecRef = {
      fileName: normalizedSpecFileName,
      path: this.resolveSpecPath(normalizedSpecFileName),
    };

    this.logger.info("Solicitacao de retomada de spec pela validacao recebida", {
      command: "run-specs-from-validation",
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
      const eligibility = await this.validateRunSpecsFromValidationBacklog(slot.project.path, spec);
      if (eligibility.status !== "eligible") {
        this.releaseSlot(slot.key);
        this.logger.warn(
          eligibility.status === "validation-blocked"
            ? "Comando /run_specs_from_validation bloqueado antes da execucao"
            : "Falha ao validar backlog para /run_specs_from_validation",
          {
            specFileName: spec.fileName,
            specPath: spec.path,
            activeProjectName: slot.project.name,
            activeProjectPath: slot.project.path,
            message: eligibility.message,
          },
        );
        return eligibility;
      }

      this.startRunSlotLoop(slot, () =>
        this.runSpecsFlow(slot, spec, {
          entryPoint: "spec-ticket-validation",
          sourceCommand: "/run_specs_from_validation",
        }),
      );

      this.logger.info("Fluxo /run_specs_from_validation agendado no loop principal", {
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

  requestTargetPrepare = async (
    projectName?: string | null,
  ): Promise<TargetPrepareRequestResult> => {
    const requestedProjectName = this.normalizeRequestedTargetProjectName(projectName);
    this.logger.info("Solicitacao de /target_prepare recebida", {
      requestedProjectName,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
      activeTargetFlowsCount: this.activeTargetFlows.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/target_prepare");
    }

    if (!this.targetPrepareExecutor) {
      return {
        status: "failed",
        message: "Executor de /target_prepare nao configurado nesta instancia do runner.",
      };
    }

    const targetProjectResolution = this.resolveTargetProjectCommandInput(
      "/target_prepare",
      requestedProjectName,
    );
    if (targetProjectResolution.status === "blocked") {
      this.touch("error", targetProjectResolution.message);
      this.logger.warn("Fluxo target bloqueado por projeto ativo ausente", {
        command: "/target_prepare",
        requestedProjectName,
        activeProjectName: this.state.activeProject?.name ?? null,
        activeProjectPath: this.state.activeProject?.path ?? null,
      });
      return targetProjectResolution;
    }

    return this.startTargetPrepareFlow(targetProjectResolution);
  };

  requestTargetCheckup = async (
    projectName?: string | null,
  ): Promise<TargetCheckupRequestResult> => {
    const requestedProjectName = this.normalizeRequestedTargetProjectName(projectName);
    this.logger.info("Solicitacao de /target_checkup recebida", {
      requestedProjectName,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
      activeTargetFlowsCount: this.activeTargetFlows.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/target_checkup");
    }

    if (!this.targetCheckupExecutor) {
      return {
        status: "failed",
        message: "Executor de /target_checkup nao configurado nesta instancia do runner.",
      };
    }

    const targetProjectResolution = this.resolveTargetProjectCommandInput(
      "/target_checkup",
      requestedProjectName,
    );
    if (targetProjectResolution.status === "blocked") {
      this.touch("error", targetProjectResolution.message);
      this.logger.warn("Fluxo target bloqueado por projeto ativo ausente", {
        command: "/target_checkup",
        requestedProjectName,
        activeProjectName: this.state.activeProject?.name ?? null,
        activeProjectPath: this.state.activeProject?.path ?? null,
      });
      return targetProjectResolution;
    }

    return this.startTargetCheckupFlow(targetProjectResolution);
  };

  requestTargetDerive = async (
    projectName: string | null | undefined,
    reportPath: string,
  ): Promise<TargetDeriveRequestResult> => {
    const requestedProjectName = this.normalizeRequestedTargetProjectName(projectName);
    this.logger.info("Solicitacao de /target_derive_gaps recebida", {
      requestedProjectName,
      reportPath,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
      activeTargetFlowsCount: this.activeTargetFlows.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult("/target_derive_gaps");
    }

    if (!this.targetDeriveExecutor) {
      return {
        status: "failed",
        message: "Executor de /target_derive_gaps nao configurado nesta instancia do runner.",
      };
    }

    const targetProjectResolution = this.resolveTargetProjectCommandInput(
      "/target_derive_gaps",
      requestedProjectName,
    );
    if (targetProjectResolution.status === "blocked") {
      this.touch("error", targetProjectResolution.message);
      this.logger.warn("Fluxo target bloqueado por projeto ativo ausente", {
        command: "/target_derive_gaps",
        requestedProjectName,
        reportPath,
        activeProjectName: this.state.activeProject?.name ?? null,
        activeProjectPath: this.state.activeProject?.path ?? null,
      });
      return targetProjectResolution;
    }

    return this.startTargetDeriveFlow(targetProjectResolution, reportPath);
  };

  requestTargetInvestigateCase = async (
    commandText: string,
  ): Promise<TargetInvestigateCaseRequestResult> => {
    const trimmedCommand = commandText.trim();
    const requestedCommand = trimmedCommand.startsWith("/target_investigate_case_v2")
      ? "/target_investigate_case_v2"
      : "/target_investigate_case";
    this.logger.info(`Solicitacao de ${requestedCommand} recebida`, {
      commandText: trimmedCommand,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActiveDiscoverSpecSession: this.isDiscoverSpecSessionActive(),
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      hasActiveCodexChatSession: this.isCodexChatSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
      activeSlotsCount: this.activeSlots.size,
      activeTargetFlowsCount: this.activeTargetFlows.size,
    });

    if (this.isShuttingDown) {
      return this.buildShutdownBlockedResult(requestedCommand);
    }

    if (!this.targetInvestigateCaseExecutor) {
      return {
        status: "failed",
        message: `Executor de ${requestedCommand} nao configurado nesta instancia do runner.`,
      };
    }

    let normalizedInput;
    try {
      normalizedInput = parseTargetInvestigateCaseCommand(trimmedCommand);
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    return this.startTargetInvestigateCaseFlow(normalizedInput);
  };

  cancelTargetPrepare = async (): Promise<TargetFlowCancelResult> =>
    this.cancelTargetFlow("target-prepare");

  cancelTargetCheckup = async (): Promise<TargetFlowCancelResult> =>
    this.cancelTargetFlow("target-checkup");

  cancelTargetDerive = async (): Promise<TargetFlowCancelResult> =>
    this.cancelTargetFlow("target-derive");

  cancelTargetInvestigateCase = async (): Promise<TargetFlowCancelResult> =>
    this.cancelTargetFlow("target-investigate-case");

  private async startTargetPrepareFlow(params: {
    requestedProjectName: string | null;
    effectiveProjectName: string;
    effectiveProjectPath: string | null;
  }): Promise<TargetPrepareRequestResult> {
    const startedAt = this.now();
    const reservation = this.reserveTargetFlowProjectSlot({
      command: "/target_prepare",
      flow: "target-prepare",
      projectName: params.effectiveProjectName,
      projectPath: params.effectiveProjectPath,
      startedAt,
    });
    if (reservation.status === "blocked") {
      return reservation;
    }
    const outcome = await this.startTargetFlowRequest<TargetPrepareMilestone, TargetPrepareExecutionResult>({
      flow: "target-prepare",
      startedAt,
      reservation: reservation.reservation,
      inputs: {
        requestedProjectName: params.requestedProjectName,
        effectiveProjectName: params.effectiveProjectName,
        effectiveProjectPath: params.effectiveProjectPath,
      },
      execute: (hooks: TargetPrepareLifecycleHooks) =>
        this.targetPrepareExecutor!.execute(params.effectiveProjectName, hooks),
    });

    if (outcome.kind === "terminal") {
      return outcome.result;
    }

    const active = outcome.active;
    void outcome.runPromise.then(async (result) => {
      await this.finalizeTargetPrepareFlow(active, result);
    });
    return {
      status: "started",
      message: `Execucao /target_prepare iniciada para ${active.targetProject.name}.`,
    };
  }

  private async startTargetCheckupFlow(
    params: {
      requestedProjectName: string | null;
      effectiveProjectName: string;
      effectiveProjectPath: string | null;
    },
  ): Promise<TargetCheckupRequestResult> {
    const startedAt = this.now();
    const activeProjectSnapshot = this.state.activeProject ? { ...this.state.activeProject } : null;
    const reservation = this.reserveTargetFlowProjectSlot({
      command: "/target_checkup",
      flow: "target-checkup",
      projectName: params.effectiveProjectName,
      projectPath: params.effectiveProjectPath,
      startedAt,
    });
    if (reservation.status === "blocked") {
      return reservation;
    }
    const outcome = await this.startTargetFlowRequest<TargetCheckupMilestone, TargetCheckupExecutionResult>({
      flow: "target-checkup",
      startedAt,
      reservation: reservation.reservation,
      inputs: {
        requestedProjectName: params.requestedProjectName,
        effectiveProjectName: params.effectiveProjectName,
        effectiveProjectPath: params.effectiveProjectPath,
        activeProjectName: activeProjectSnapshot?.name ?? null,
        activeProjectPath: activeProjectSnapshot?.path ?? null,
      },
      execute: (hooks: TargetCheckupLifecycleHooks) =>
        this.targetCheckupExecutor!.execute(
          {
            activeProject: activeProjectSnapshot,
            projectName: params.requestedProjectName,
          },
          hooks,
        ),
    });

    if (outcome.kind === "terminal") {
      return outcome.result;
    }

    const active = outcome.active;
    void outcome.runPromise.then(async (result) => {
      await this.finalizeTargetCheckupFlow(active, result);
    });
    return {
      status: "started",
      message: `Execucao /target_checkup iniciada para ${active.targetProject.name}.`,
    };
  }

  private async startTargetDeriveFlow(
    params: {
      requestedProjectName: string | null;
      effectiveProjectName: string;
      effectiveProjectPath: string | null;
    },
    reportPath: string,
  ): Promise<TargetDeriveRequestResult> {
    const startedAt = this.now();
    const reservation = this.reserveTargetFlowProjectSlot({
      command: "/target_derive_gaps",
      flow: "target-derive",
      projectName: params.effectiveProjectName,
      projectPath: params.effectiveProjectPath,
      startedAt,
    });
    if (reservation.status === "blocked") {
      return reservation;
    }
    const outcome = await this.startTargetFlowRequest<TargetDeriveMilestone, TargetDeriveExecutionResult>({
      flow: "target-derive",
      startedAt,
      reservation: reservation.reservation,
      inputs: {
        requestedProjectName: params.requestedProjectName,
        effectiveProjectName: params.effectiveProjectName,
        effectiveProjectPath: params.effectiveProjectPath,
        reportPath,
      },
      execute: (hooks: TargetDeriveLifecycleHooks) =>
        this.targetDeriveExecutor!.execute(
          {
            projectName: params.effectiveProjectName,
            reportPath,
          },
          hooks,
        ),
    });

    if (outcome.kind === "terminal") {
      return outcome.result;
    }

    const active = outcome.active;
    void outcome.runPromise.then(async (result) => {
      await this.finalizeTargetDeriveFlow(active, result);
    });
    return {
      status: "started",
      message: `Execucao /target_derive_gaps iniciada para ${active.targetProject.name}.`,
    };
  }

  private async startTargetInvestigateCaseFlow(
    normalizedInput: ReturnType<typeof parseTargetInvestigateCaseCommand>,
  ): Promise<TargetInvestigateCaseRequestResult> {
    const command = normalizedInput.canonicalCommand.startsWith("/target_investigate_case_v2")
      ? "/target_investigate_case_v2"
      : "/target_investigate_case";
    const flow =
      command === "/target_investigate_case_v2"
        ? ("target-investigate-case-v2" as const)
        : ("target-investigate-case" as const);
    const startedAt = this.now();
    const reservation = this.reserveTargetFlowProjectSlot({
      command,
      flow,
      projectName: normalizedInput.projectName,
      projectPath: null,
      startedAt,
    });
    if (reservation.status === "blocked") {
      return reservation;
    }

    const outcome = await this.startTargetFlowRequest<
      TargetInvestigateCaseMilestone,
      TargetInvestigateCaseExecutionResult
    >({
      flow,
      startedAt,
      reservation: reservation.reservation,
      inputs: {
        canonicalCommand: normalizedInput.canonicalCommand,
        projectName: normalizedInput.projectName,
        caseRef: normalizedInput.caseRef,
        workflow: normalizedInput.workflow ?? null,
        requestId: normalizedInput.requestId ?? null,
        window: normalizedInput.window ?? null,
        symptom: normalizedInput.symptom ?? null,
      },
      execute: (hooks: TargetInvestigateCaseLifecycleHooks) =>
        this.targetInvestigateCaseExecutor!.execute(
          {
            input: normalizedInput,
          },
          hooks,
        ),
    });

    if (outcome.kind === "terminal") {
      return outcome.result;
    }

    const active = outcome.active;
    void outcome.runPromise.then(async (result) => {
      await this.finalizeTargetInvestigateCaseFlow(active, result);
    });

    return {
      status: "started",
      message: `Execucao ${command} iniciada para ${active.targetProject.name}.`,
    };
  }

  private normalizeRequestedTargetProjectName(projectName?: string | null): string | null {
    const normalizedName = projectName?.trim() ?? "";
    return normalizedName || null;
  }

  private resolveTargetProjectCommandInput(
    command: "/target_prepare" | "/target_checkup" | "/target_derive_gaps",
    requestedProjectName: string | null,
  ):
    | {
        status: "resolved";
        requestedProjectName: string | null;
        effectiveProjectName: string;
        effectiveProjectPath: string | null;
      }
    | RunnerRequestBlockedResult {
    if (requestedProjectName) {
      return {
        status: "resolved",
        requestedProjectName,
        effectiveProjectName: requestedProjectName,
        effectiveProjectPath: null,
      };
    }

    if (!this.state.activeProject) {
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message: [
          `Nao e possivel iniciar ${command} sem argumento porque nao existe projeto ativo selecionado.`,
          "Use /select_project ou /projects para definir o projeto ativo, ou informe <nome-do-projeto> explicitamente.",
        ].join(" "),
      };
    }

    return {
      status: "resolved",
      requestedProjectName: null,
      effectiveProjectName: this.state.activeProject.name,
      effectiveProjectPath: this.state.activeProject.path,
    };
  }

  private async startTargetFlowRequest<
    Stage extends TargetFlowMilestone,
    Result extends
      | TargetPrepareExecutionResult
      | TargetCheckupExecutionResult
      | TargetDeriveExecutionResult
      | TargetInvestigateCaseExecutionResult,
  >(params: {
    flow: TargetFlowKind;
    startedAt: Date;
    reservation: PendingTargetFlowReservation;
    inputs: Record<string, unknown>;
    execute:
      | ((hooks: TargetPrepareLifecycleHooks) => Promise<Result>)
      | ((hooks: TargetCheckupLifecycleHooks) => Promise<Result>)
      | ((hooks: TargetDeriveLifecycleHooks) => Promise<Result>)
      | ((hooks: TargetInvestigateCaseLifecycleHooks) => Promise<Result>);
  }):
    Promise<
      | {
          kind: "started";
          active: ActiveTargetFlowExecution<Stage>;
          runPromise: Promise<Result>;
        }
      | {
          kind: "terminal";
          result: Result;
        }
    > {
    type RuntimeHooks = {
      onMilestone: (event: {
        flow: TargetFlowKind;
        command: TargetFlowCommand;
        targetProject: ProjectRef;
        milestone: Stage;
        milestoneLabel: string;
        message: string;
        versionBoundaryState: TargetFlowVersionBoundaryState;
        recordedAtUtc: string;
      }) => Promise<void>;
      onAiExchange: (event: TargetFlowAiExchange) => Promise<void>;
      isCancellationRequested: () => boolean;
    };

    let activated = false;
    let activeExecution: ActiveTargetFlowExecution<Stage> | null = null;
    let resolveGate:
      | ((value: { status: "started" } | { status: "terminal"; result: Result }) => void)
      | null = null;
    const gate = new Promise<{ status: "started" } | { status: "terminal"; result: Result }>(
      (resolve) => {
        resolveGate = resolve;
      },
    );

    const hooks: RuntimeHooks = {
      onMilestone: async (event: {
        flow: TargetFlowKind;
        command: TargetFlowCommand;
        targetProject: ProjectRef;
        milestone: Stage;
        milestoneLabel: string;
        message: string;
        versionBoundaryState: TargetFlowVersionBoundaryState;
        recordedAtUtc: string;
      }) => {
        activeExecution = await this.handleTargetFlowMilestone<Stage>({
          slotKey: params.reservation.slotKey,
          flow: params.flow,
          startedAt: params.startedAt,
          inputs: params.inputs,
          event,
        });
        if (!activated) {
          activated = true;
          resolveGate?.({ status: "started" });
        }
      },
      onAiExchange: async (event: TargetFlowAiExchange) => {
        if (!activeExecution) {
          return;
        }

        activeExecution.traceAiExchanges.push({
          stageLabel: event.stageLabel,
          promptTemplatePath: event.promptTemplatePath,
          promptText: event.promptText,
          outputText: event.outputText,
          ...(event.diagnostics ? { diagnostics: { ...event.diagnostics } } : {}),
        });
      },
      isCancellationRequested: () => Boolean(activeExecution?.cancelRequestedAt),
    };

    const runPromise = (params.execute as (hooks: RuntimeHooks) => Promise<Result>)(hooks)
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        return {
          status: "failed",
          message,
        } as Result;
      })
      .then((result) => {
        if (!activated) {
          resolveGate?.({ status: "terminal", result });
        }
        return result;
      });

    const gateResult = await gate;
    if (gateResult.status === "terminal") {
      this.releasePendingTargetFlowReservation(params.reservation.slotKey);
      return {
        kind: "terminal",
        result: gateResult.result,
      };
    }

    if (!activeExecution) {
      this.releasePendingTargetFlowReservation(params.reservation.slotKey);
      return {
        kind: "terminal",
        result: {
          status: "failed",
          message: "Fluxo target iniciou sem publicar milestone inicial observavel.",
        } as Result,
      };
    }

    return {
      kind: "started",
      active: activeExecution,
      runPromise,
    };
  }

  private async handleTargetFlowMilestone<Stage extends TargetFlowMilestone>(params: {
    slotKey: string;
    flow: TargetFlowKind;
    startedAt: Date;
    inputs: Record<string, unknown>;
    event: {
      flow: TargetFlowKind;
      command: TargetFlowCommand;
      targetProject: ProjectRef;
      milestone: Stage;
      milestoneLabel: string;
      message: string;
      versionBoundaryState: TargetFlowVersionBoundaryState;
      recordedAtUtc: string;
    };
  }): Promise<ActiveTargetFlowExecution<Stage>> {
    const eventTimestamp = new Date(params.event.recordedAtUtc);
    const recordedAt = Number.isNaN(eventTimestamp.getTime()) ? this.now() : eventTimestamp;
    let active = this.activeTargetFlows.get(params.slotKey) as ActiveTargetFlowExecution<Stage> | null;

    if (!active) {
      active = {
        slotKey: params.slotKey,
        flow: params.flow,
        command: params.event.command,
        targetProject: { ...params.event.targetProject },
        phase: this.mapTargetFlowPhase(params.flow, params.event.milestone),
        milestone: params.event.milestone,
        milestoneLabel: params.event.milestoneLabel,
        versionBoundaryState: params.event.versionBoundaryState,
        cancelRequestedAt: null,
        startedAt: params.startedAt,
        updatedAt: recordedAt,
        lastMessage: params.event.message,
        timing: this.createFlowTimingCollector<Stage>(params.startedAt.getTime()),
        currentStageStartedAtMs: params.startedAt.getTime(),
        traceInputs: { ...params.inputs },
        traceMilestones: [],
        traceAiExchanges: [],
      };
      this.pendingTargetFlows.delete(params.slotKey);
      this.activeTargetFlows.set(params.slotKey, active);
    } else if (active.milestone !== params.event.milestone) {
      this.recordFlowStageCompletion(
        active.timing,
        active.milestone,
        recordedAt.getTime() - active.currentStageStartedAtMs,
      );
      active.currentStageStartedAtMs = recordedAt.getTime();
      active.milestone = params.event.milestone;
    }

    active.phase = this.mapTargetFlowPhase(params.flow, params.event.milestone);
    active.milestoneLabel = params.event.milestoneLabel;
    active.versionBoundaryState = params.event.versionBoundaryState;
    active.updatedAt = recordedAt;
    active.lastMessage = params.event.message;
    active.traceMilestones.push({
      milestone: params.event.milestone,
      milestoneLabel: params.event.milestoneLabel,
      message: params.event.message,
      versionBoundaryState: params.event.versionBoundaryState,
      recordedAtUtc: params.event.recordedAtUtc,
    });

    this.syncStateFromSlots();
    this.state.lastMessage = params.event.message;
    this.state.updatedAt = recordedAt;

    await this.emitTargetFlowMilestone({
      flow: params.flow,
      command: params.event.command,
      targetProjectName: params.event.targetProject.name,
      targetProjectPath: params.event.targetProject.path,
      milestone: params.event.milestone,
      milestoneLabel: params.event.milestoneLabel,
      message: params.event.message,
      versionBoundaryState: params.event.versionBoundaryState,
      timestampUtc: params.event.recordedAtUtc,
    });

    return active;
  }

  private cancelTargetFlow(flow: TargetFlowKind): TargetFlowCancelResult {
    const command = targetFlowKindToCommand(flow);
    const resolution = this.resolveTargetFlowForControl(flow);
    if (resolution.status === "inactive") {
      return {
        status: "inactive",
        message: `Nenhuma execucao ${command} ativa no momento.`,
      };
    }

    if (resolution.status === "ambiguous") {
      return {
        status: "ambiguous",
        message: resolution.message,
      };
    }

    const activeTargetFlow = resolution.targetFlow;
    const activeCommand = activeTargetFlow.command;
    if (activeTargetFlow.versionBoundaryState === "after-versioning") {
      return {
        status: "late",
        message: `${activeCommand} ja cruzou a fronteira de versionamento; cancelamento tardio nao sera aplicado automaticamente.`,
      };
    }

    if (!activeTargetFlow.cancelRequestedAt) {
      activeTargetFlow.cancelRequestedAt = this.now();
      activeTargetFlow.updatedAt = this.now();
      activeTargetFlow.lastMessage = `Cancelamento solicitado para ${activeCommand}.`;
      this.syncStateFromSlots();
      this.state.lastMessage = activeTargetFlow.lastMessage;
      this.state.updatedAt = activeTargetFlow.updatedAt;
    }

    return {
      status: "accepted",
      message: `Cancelamento de ${activeCommand} solicitado. O fluxo sera encerrado no proximo checkpoint seguro antes de versionar.`,
    };
  }

  private async finalizeTargetPrepareFlow(
    active: ActiveTargetFlowExecution<TargetPrepareMilestone>,
    result: TargetPrepareExecutionResult,
  ): Promise<void> {
    const summary = this.buildTargetPrepareFlowSummary(active, result);
    await this.completeTargetFlow(active, summary);
  }

  private async finalizeTargetCheckupFlow(
    active: ActiveTargetFlowExecution<TargetCheckupMilestone>,
    result: TargetCheckupExecutionResult,
  ): Promise<void> {
    const summary = this.buildTargetCheckupFlowSummary(active, result);
    await this.completeTargetFlow(active, summary);
  }

  private async finalizeTargetDeriveFlow(
    active: ActiveTargetFlowExecution<TargetDeriveMilestone>,
    result: TargetDeriveExecutionResult,
  ): Promise<void> {
    const summary = this.buildTargetDeriveFlowSummary(active, result);
    await this.completeTargetFlow(active, summary);
  }

  private async finalizeTargetInvestigateCaseFlow(
    active: ActiveTargetFlowExecution<TargetInvestigateCaseMilestone>,
    result: TargetInvestigateCaseExecutionResult,
  ): Promise<void> {
    const summary = this.buildTargetInvestigateCaseFlowSummary(active, result);
    await this.completeTargetFlow(active, summary);
  }

  private async completeTargetFlow(
    active: ActiveTargetFlowExecution,
    summary:
      | TargetPrepareFlowSummary
      | TargetCheckupFlowSummary
      | TargetDeriveFlowSummary
      | TargetInvestigateCaseFlowSummary,
  ): Promise<void> {
    this.activeTargetFlows.delete(active.slotKey);
    this.pendingTargetFlows.delete(active.slotKey);

    this.syncStateFromSlots();
    this.state.lastMessage = this.buildTargetFlowFinalMessage(summary);
    this.state.updatedAt = this.now();

    await this.recordTargetFlowTrace(active, summary);
    await this.emitRunFlowCompleted(summary);
  }

  private buildTargetPrepareFlowSummary(
    active: ActiveTargetFlowExecution<TargetPrepareMilestone>,
    result: TargetPrepareExecutionResult,
  ): TargetPrepareFlowSummary {
    const finishedAt = this.now().getTime();
    const timing =
      result.status === "completed"
        ? this.completeTargetFlowTiming(active, finishedAt)
        : this.interruptTargetFlowTiming(active, finishedAt);

    if (result.status === "completed") {
      return {
        flow: "target-prepare",
        command: "/target_prepare",
        outcome: "success",
        finalStage: "versioning",
        completionReason: "completed",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: "after-versioning",
        nextAction: result.summary.nextAction,
        artifactPaths: uniqueSorted([
          result.summary.manifestPath,
          result.summary.reportPath,
          ...result.summary.changedPaths,
        ]),
        versionedArtifactPaths: [...result.summary.changedPaths],
        details:
          result.summary.versioning.status === "committed-and-pushed"
            ? `Versionamento: ${result.summary.versioning.commitHash}@${result.summary.versioning.upstream}`
            : `Versionamento: ${result.summary.versioning.errorMessage}`,
        timing,
        summary: result.summary,
      };
    }

    if (result.status === "cancelled") {
      return {
        flow: "target-prepare",
        command: "/target_prepare",
        outcome: "cancelled",
        finalStage: result.summary.cancelledAtMilestone,
        completionReason: "cancelled",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: active.versionBoundaryState,
        nextAction: result.summary.nextAction,
        artifactPaths: [...result.summary.changedPaths],
        versionedArtifactPaths: [],
        details: `Cancelado em ${renderTargetFlowMilestoneLabel("target-prepare", result.summary.cancelledAtMilestone)}.`,
        timing,
      };
    }

    return {
      flow: "target-prepare",
      command: "/target_prepare",
      outcome: result.status === "blocked" ? "blocked" : "failure",
      finalStage: active.milestone,
      completionReason: result.status === "blocked" ? "blocked" : "failed",
      timestampUtc: new Date(finishedAt).toISOString(),
      targetProjectName: active.targetProject.name,
      targetProjectPath: active.targetProject.path,
      versionBoundaryState: active.versionBoundaryState,
      nextAction:
        result.status === "blocked"
          ? "Corrija o bloqueio objetivo reportado e rerode o fluxo."
          : "Revise o estado local do repositorio alvo antes de rerodar.",
      artifactPaths: [],
      versionedArtifactPaths: [],
      details: result.message,
      timing,
    };
  }

  private buildTargetCheckupFlowSummary(
    active: ActiveTargetFlowExecution<TargetCheckupMilestone>,
    result: TargetCheckupExecutionResult,
  ): TargetCheckupFlowSummary {
    const finishedAt = this.now().getTime();
    const timing =
      result.status === "completed"
        ? this.completeTargetFlowTiming(active, finishedAt)
        : this.interruptTargetFlowTiming(active, finishedAt);

    if (result.status === "completed") {
      return {
        flow: "target-checkup",
        command: "/target_checkup",
        outcome: "success",
        finalStage: "versioning",
        completionReason: "completed",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: "after-versioning",
        nextAction: result.summary.nextAction,
        artifactPaths: uniqueSorted([
          result.summary.reportJsonPath,
          result.summary.reportMarkdownPath,
          ...result.summary.changedPaths,
        ]),
        versionedArtifactPaths: [...result.summary.changedPaths],
        details: `Veredito geral: ${result.summary.overallVerdict}.`,
        timing,
        summary: result.summary,
      };
    }

    if (result.status === "cancelled") {
      return {
        flow: "target-checkup",
        command: "/target_checkup",
        outcome: "cancelled",
        finalStage: result.summary.cancelledAtMilestone,
        completionReason: "cancelled",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: active.versionBoundaryState,
        nextAction: result.summary.nextAction,
        artifactPaths: [...result.summary.changedPaths],
        versionedArtifactPaths: [],
        details: `Cancelado em ${renderTargetFlowMilestoneLabel("target-checkup", result.summary.cancelledAtMilestone)}.`,
        timing,
      };
    }

    return {
      flow: "target-checkup",
      command: "/target_checkup",
      outcome: result.status === "blocked" ? "blocked" : "failure",
      finalStage: active.milestone,
      completionReason: result.status === "blocked" ? "blocked" : "failed",
      timestampUtc: new Date(finishedAt).toISOString(),
      targetProjectName: active.targetProject.name,
      targetProjectPath: active.targetProject.path,
      versionBoundaryState: active.versionBoundaryState,
      nextAction:
        result.status === "blocked"
          ? "Corrija o bloqueio objetivo reportado e rerode o fluxo."
          : "Revise o artefato local e o working tree do projeto alvo antes de rerodar.",
      artifactPaths: [],
      versionedArtifactPaths: [],
      details: result.message,
      timing,
    };
  }

  private buildTargetDeriveFlowSummary(
    active: ActiveTargetFlowExecution<TargetDeriveMilestone>,
    result: TargetDeriveExecutionResult,
  ): TargetDeriveFlowSummary {
    const finishedAt = this.now().getTime();
    const timing =
      result.status === "completed"
        ? this.completeTargetFlowTiming(active, finishedAt)
        : this.interruptTargetFlowTiming(active, finishedAt);

    if (result.status === "completed") {
      return {
        flow: "target-derive",
        command: "/target_derive_gaps",
        outcome: "success",
        finalStage: "versioning",
        completionReason: "completed",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState:
          result.summary.versioning.status === "committed-and-pushed"
            ? "after-versioning"
            : active.versionBoundaryState,
        nextAction: result.summary.nextAction,
        artifactPaths: uniqueSorted([
          result.summary.reportJsonPath,
          result.summary.reportMarkdownPath,
          ...result.summary.touchedTicketPaths,
          ...result.summary.changedPaths,
        ]),
        versionedArtifactPaths: [...result.summary.changedPaths],
        details: `Status da derivacao: ${result.summary.derivationStatus}.`,
        timing,
        summary: result.summary,
      };
    }

    if (result.status === "cancelled") {
      return {
        flow: "target-derive",
        command: "/target_derive_gaps",
        outcome: "cancelled",
        finalStage: result.summary.cancelledAtMilestone,
        completionReason: "cancelled",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: active.versionBoundaryState,
        nextAction: result.summary.nextAction,
        artifactPaths: [...result.summary.changedPaths],
        versionedArtifactPaths: [],
        details: `Cancelado em ${renderTargetFlowMilestoneLabel("target-derive", result.summary.cancelledAtMilestone)}.`,
        timing,
      };
    }

    return {
      flow: "target-derive",
      command: "/target_derive_gaps",
      outcome: result.status === "blocked" ? "blocked" : "failure",
      finalStage: active.milestone,
      completionReason: result.status === "blocked" ? "blocked" : "failed",
      timestampUtc: new Date(finishedAt).toISOString(),
      targetProjectName: active.targetProject.name,
      targetProjectPath: active.targetProject.path,
      versionBoundaryState: active.versionBoundaryState,
      nextAction:
        result.status === "blocked"
          ? "Corrija o bloqueio objetivo reportado e rerode o fluxo."
          : "Revise o report e o estado local do repositorio alvo antes de rerodar.",
      artifactPaths: [],
      versionedArtifactPaths: [],
      details: result.message,
      timing,
    };
  }

  private buildTargetInvestigateCaseFlowSummary(
    active: ActiveTargetFlowExecution<TargetInvestigateCaseMilestone>,
    result: TargetInvestigateCaseExecutionResult,
  ): TargetInvestigateCaseFlowSummary {
    const finishedAt = this.now().getTime();
    const timing =
      result.status === "completed"
        ? this.completeTargetFlowTiming(active, finishedAt)
        : this.interruptTargetFlowTiming(active, finishedAt);

    if (result.status === "completed") {
      return {
        flow: active.flow as "target-investigate-case" | "target-investigate-case-v2",
        command: active.command,
        outcome: "success",
        finalStage: "publication",
        completionReason: "completed",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: result.summary.versionBoundaryState,
        nextAction: result.summary.nextAction,
        artifactPaths: uniqueSorted([
          ...result.summary.realizedArtifactPaths,
          ...result.summary.publicationDecision.versioned_artifact_paths,
        ]),
        versionedArtifactPaths: [...result.summary.publicationDecision.versioned_artifact_paths],
        details:
          `Diagnostico: ${result.summary.finalSummary.diagnosis.verdict} - ${result.summary.finalSummary.diagnosis.summary}. ` +
          `Investigacao: ${describeTargetInvestigateCaseInvestigationOutcome(result.summary.finalSummary)} ` +
          `Publication: ${result.summary.publicationDecision.publication_status}/${result.summary.publicationDecision.overall_outcome}. ` +
          `${describeTargetInvestigateCaseDiagnosisVerdict(result.summary.finalSummary.diagnosis.verdict)}`,
        timing,
        summary: result.summary.finalSummary,
      };
    }

    if (result.status === "cancelled") {
      return {
        flow: active.flow as "target-investigate-case" | "target-investigate-case-v2",
        command: active.command,
        outcome: "cancelled",
        finalStage: result.summary.cancelledAtMilestone,
        completionReason: "cancelled",
        timestampUtc: new Date(finishedAt).toISOString(),
        targetProjectName: result.summary.targetProject.name,
        targetProjectPath: result.summary.targetProject.path,
        versionBoundaryState: result.summary.versionBoundaryState,
        nextAction: result.summary.nextAction,
        artifactPaths: [...result.summary.artifactPaths],
        versionedArtifactPaths: [],
        details:
          `Cancelado em ${renderTargetFlowMilestoneLabel(active.flow, result.summary.cancelledAtMilestone)}.`,
        timing,
      };
    }

    return {
      flow: active.flow as "target-investigate-case" | "target-investigate-case-v2",
      command: active.command,
      outcome: result.status === "blocked" ? "blocked" : "failure",
      finalStage:
        result.status === "failed"
          ? (result.summary?.failedAtMilestone ?? active.milestone)
          : active.milestone,
      completionReason:
        result.status === "blocked"
          ? "blocked"
          : this.mapTargetInvestigateCaseFailureCompletionReason(result),
      timestampUtc: new Date(finishedAt).toISOString(),
      targetProjectName: active.targetProject.name,
      targetProjectPath: active.targetProject.path,
      versionBoundaryState:
        result.status === "failed"
          ? (result.summary?.versionBoundaryState ?? active.versionBoundaryState)
          : active.versionBoundaryState,
      nextAction:
        result.status === "blocked"
          ? "Corrija o bloqueio objetivo reportado e rerode o fluxo."
          : result.summary?.nextAction ??
            "Revise o namespace local de investigacao antes de rerodar.",
      artifactPaths: result.status === "failed" ? [...(result.summary?.artifactPaths ?? [])] : [],
      versionedArtifactPaths: [],
      details:
        result.status === "failed"
          ? this.renderTargetInvestigateCaseFailureDetails(result)
          : result.message,
      timing,
    };
  }

  private mapTargetInvestigateCaseFailureCompletionReason(
    result: Extract<TargetInvestigateCaseExecutionResult, { status: "failed" }>,
  ): TargetInvestigateCaseFlowSummary["completionReason"] {
    if (!result.summary) {
      return "failed";
    }

    if (result.summary.failureSurface === "semantic-review") {
      return "semantic-review-failed";
    }

    if (result.summary.failureSurface === "causal-debug") {
      return "causal-debug-failed";
    }

    if (result.summary.failureSurface === "round-evaluation") {
      return "round-evaluation-failed";
    }

    return "round-materialization-failed";
  }

  private renderTargetInvestigateCaseFailureDetails(
    result: Extract<TargetInvestigateCaseExecutionResult, { status: "failed" }>,
  ): string {
    if (!result.summary) {
      return result.message;
    }

    return [
      `Falha operacional em ${result.summary.failureSurface}`,
      `tipo=${result.summary.failureKind}`,
      result.summary.message,
    ].join("; ");
  }

  private completeTargetFlowTiming<Stage extends string>(
    active: ActiveTargetFlowExecution<Stage>,
    finishedAtMs: number,
  ): FlowTimingSnapshot<Stage> {
    this.recordFlowStageCompletion(
      active.timing,
      active.milestone,
      finishedAtMs - active.currentStageStartedAtMs,
    );
    return this.buildFlowTimingSnapshot(active.timing, finishedAtMs);
  }

  private interruptTargetFlowTiming<Stage extends string>(
    active: ActiveTargetFlowExecution<Stage>,
    finishedAtMs: number,
  ): FlowTimingSnapshot<Stage> {
    this.markFlowInterrupted(active.timing, active.milestone);
    return this.buildFlowTimingSnapshot(active.timing, finishedAtMs);
  }

  private buildTargetFlowFinalMessage(
    summary:
      | TargetPrepareFlowSummary
      | TargetCheckupFlowSummary
      | TargetDeriveFlowSummary
      | TargetInvestigateCaseFlowSummary,
  ): string {
    if (summary.outcome === "success") {
      return `${summary.command.replace("/", "")} concluido para ${summary.targetProjectName}`;
    }

    if (summary.outcome === "cancelled") {
      return `${summary.command.replace("/", "")} cancelado para ${summary.targetProjectName}`;
    }

    return summary.details ?? `${summary.command.replace("/", "")} encerrado com ${summary.outcome}`;
  }

  private mapTargetFlowPhase(
    flow: TargetFlowKind,
    milestone: TargetFlowMilestone,
  ): RunnerState["phase"] {
    if (flow === "target-prepare") {
      if (milestone === "preflight") {
        return "target-prepare-preflight";
      }
      if (milestone === "ai-adjustment") {
        return "target-prepare-ai-adjustment";
      }
      if (milestone === "post-check") {
        return "target-prepare-post-check";
      }
      return "target-prepare-versioning";
    }

    if (flow === "target-checkup") {
      if (milestone === "preflight") {
        return "target-checkup-preflight";
      }
      if (milestone === "evidence-collection") {
        return "target-checkup-evidence-collection";
      }
      if (milestone === "editorial-summary") {
        return "target-checkup-editorial-summary";
      }
      return "target-checkup-versioning";
    }

    if (flow === "target-investigate-case") {
      if (milestone === "preflight") {
        return "target-investigate-case-preflight";
      }
      if (milestone === "case-resolution") {
        return "target-investigate-case-case-resolution";
      }
      if (milestone === "evidence-collection") {
        return "target-investigate-case-evidence-collection";
      }
      if (milestone === "assessment") {
        return "target-investigate-case-assessment";
      }
      return "target-investigate-case-publication";
    }

    if (flow === "target-investigate-case-v2") {
      if (milestone === "preflight") {
        return "target-investigate-case-v2-preflight";
      }
      if (milestone === "resolve-case") {
        return "target-investigate-case-v2-resolve-case";
      }
      if (milestone === "assemble-evidence") {
        return "target-investigate-case-v2-assemble-evidence";
      }
      if (milestone === "diagnosis") {
        return "target-investigate-case-v2-diagnosis";
      }
      if (milestone === "deep-dive") {
        return "target-investigate-case-v2-deep-dive";
      }
      if (milestone === "improvement-proposal") {
        return "target-investigate-case-v2-improvement-proposal";
      }
      if (milestone === "ticket-projection") {
        return "target-investigate-case-v2-ticket-projection";
      }
      return "target-investigate-case-v2-publication";
    }

    if (milestone === "preflight") {
      return "target-derive-preflight";
    }
    if (milestone === "dedup-prioritization") {
      return "target-derive-dedup-prioritization";
    }
    if (milestone === "materialization") {
      return "target-derive-materialization";
    }
    return "target-derive-versioning";
  }

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
      const delivery = await this.codexChatEventHandlers.onOutput(chatId, event);
      if (delivery) {
        const sessionId =
          this.state.codexChatSession?.chatId === chatId
            ? (this.state.codexChatSession.sessionId ?? null)
            : null;
        this.state.lastCodexChatOutputEvent = {
          chatId,
          sessionId,
          delivery,
        };
        this.state.lastCodexChatOutputFailure = null;
      }
    } catch (error) {
      const sessionId =
        this.state.codexChatSession?.chatId === chatId
          ? (this.state.codexChatSession.sessionId ?? null)
          : null;
      const failure = this.buildCodexChatOutputFailure(chatId, error);
      this.state.lastCodexChatOutputFailure = {
        chatId,
        sessionId,
        failure,
      };
      this.logger.warn("Falha ao encaminhar saida de /codex_chat para integracao", {
        chatId,
        sessionId,
        error: failure.errorMessage,
        errorClass: failure.errorClass,
        ...(failure.errorCode ? { errorCode: failure.errorCode } : {}),
        ...(failure.destinationChatId ? { destinationChatId: failure.destinationChatId } : {}),
        attempts: failure.attempts,
        maxAttempts: failure.maxAttempts,
        retryable: failure.retryable,
        ...(failure.failedChunkIndex !== undefined
          ? { chunkIndex: failure.failedChunkIndex, chunkCount: failure.chunkCount }
          : failure.chunkCount !== undefined
            ? { chunkCount: failure.chunkCount }
            : {}),
      });
    }
  }

  private buildCodexChatOutputFailure(chatId: string, error: unknown): CodexChatOutputFailure {
    if (isTelegramMessageDeliveryDispatchError(error)) {
      return {
        channel: "telegram",
        destinationChatId: error.failure.destinationChatId,
        failedAtUtc: error.failure.failedAtUtc,
        attempts: error.failure.attempts,
        maxAttempts: error.failure.maxAttempts,
        errorMessage: error.failure.errorMessage,
        ...(error.failure.errorCode ? { errorCode: error.failure.errorCode } : {}),
        errorClass: error.failure.errorClass,
        retryable: error.failure.retryable,
        ...(error.failure.failedChunkIndex !== undefined
          ? { failedChunkIndex: error.failure.failedChunkIndex }
          : {}),
        ...(error.failure.chunkCount !== undefined ? { chunkCount: error.failure.chunkCount } : {}),
      };
    }

    const details = error instanceof Error ? error.message : String(error);
    return {
      channel: "telegram",
      destinationChatId: chatId,
      failedAtUtc: this.now().toISOString(),
      attempts: 1,
      maxAttempts: 1,
      errorMessage: details,
      errorClass: "non-retryable",
      retryable: false,
    };
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
        ...(event.specTicketValidation
          ? {
              specTicketValidation: this.cloneRunSpecsTicketValidationSummary(
                event.specTicketValidation,
              ),
            }
          : {}),
        ...(event.specTicketDerivationRetrospective
          ? {
              specTicketDerivationRetrospective:
                this.cloneRunSpecsDerivationRetrospectiveSummary(
                  event.specTicketDerivationRetrospective,
                ),
            }
          : {}),
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

  private async emitTargetFlowMilestone(event: TargetFlowMilestoneLifecycleEvent): Promise<void> {
    if (!this.targetFlowEventHandlers) {
      return;
    }

    try {
      await this.targetFlowEventHandlers.onMilestone({
        ...event,
      });
    } catch (error) {
      this.logger.error("Falha ao emitir milestone de fluxo target", {
        flow: event.flow,
        command: event.command,
        targetProjectName: event.targetProjectName,
        targetProjectPath: event.targetProjectPath,
        milestone: event.milestone,
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
      const delivery = await this.runFlowEventHandlers.onFlowCompleted(
        this.cloneRunnerFlowSummary(event),
      );
      if (!delivery) {
        return;
      }

      this.state.lastRunFlowNotificationEvent = {
        summary: this.cloneRunnerFlowSummary(event),
        delivery: { ...delivery },
      };
      this.state.lastRunFlowNotificationFailure = null;
      this.state.updatedAt = new Date(delivery.deliveredAtUtc);
    } catch (error) {
      const notificationFailure = this.buildRunFlowNotificationFailureState(event, error);
      this.state.lastRunFlowNotificationFailure = notificationFailure;
      this.state.updatedAt = new Date(notificationFailure.failure.failedAtUtc);
      this.logger.warn("Falha ao encaminhar resumo final de fluxo para integracao", {
        flow: event.flow,
        outcome: event.outcome,
        finalStage: event.finalStage,
        attempts: notificationFailure.failure.attempts,
        maxAttempts: notificationFailure.failure.maxAttempts,
        errorCode: notificationFailure.failure.errorCode,
        errorClass: notificationFailure.failure.errorClass,
        retryable: notificationFailure.failure.retryable,
        destinationChatId: notificationFailure.failure.destinationChatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private buildRunFlowNotificationFailureState(
    summary: RunnerFlowSummary,
    error: unknown,
  ): NonNullable<RunnerState["lastRunFlowNotificationFailure"]> {
    if (isFlowNotificationDispatchError(error)) {
      return {
        summary: this.cloneRunnerFlowSummary(summary),
        failure: { ...error.failure },
      };
    }

    const fallbackFailure: FlowNotificationFailure = {
      channel: "telegram",
      failedAtUtc: this.now().toISOString(),
      attempts: 1,
      maxAttempts: 1,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorClass: "non-retryable",
      retryable: false,
    };

    return {
      summary: this.cloneRunnerFlowSummary(summary),
      failure: fallbackFailure,
    };
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

  private async runSpecsFlow(
    slot: ActiveRunnerSlot,
    spec: SpecRef,
    options: {
      entryPoint: RunSpecsEntryPoint;
      sourceCommand: "/run_specs" | "/run_specs_from_validation";
    },
  ): Promise<void> {
    const triageTimingCollector = this.createFlowTimingCollector<RunSpecsTriageTimingStage>();
    const flowTimingCollector = this.createFlowTimingCollector<RunSpecsFlowTimingStage>();
    const startedFromValidation = options.entryPoint === "spec-ticket-validation";
    const sourceCommand = options.sourceCommand;
    const flowDescription = startedFromValidation
      ? "retomada pela validacao da spec"
      : "triagem da spec";
    const flowStartMessage = startedFromValidation
      ? `Retomada da spec ${spec.fileName} em spec-ticket-validation iniciada`
      : `Triagem da spec ${spec.fileName} iniciada`;
    const runAllStartMessage = startedFromValidation
      ? "Validacao retomada e gate concluidos; iniciando rodada /run-all para processar tickets abertos."
      : "Triagem e gate concluidos; iniciando rodada /run-all para processar tickets abertos.";
    let runAllSummary: RunAllFlowSummary | undefined;
    let flowSummary: RunSpecsFlowSummary | null = null;
    let specTriageSummary: RunSpecsSpecTriageSummary | undefined;
    let specTicketValidationSummary: RunSpecsTicketValidationSummary | undefined;
    let specTicketValidationPackageContext: SpecTicketValidationPackageContext | undefined;
    let specTicketDerivationRetrospectiveSummary:
      | RunSpecsDerivationRetrospectiveSummary
      | undefined;
    let specCloseAndVersionSummary: RunSpecsSpecCloseAndVersionSummary | undefined;
    let specAuditSummary: RunSpecsSpecAuditSummary | undefined;
    let workflowGapAnalysisSummary: WorkflowGapAnalysisResult | undefined;
    let workflowImprovementTicketSummary: WorkflowImprovementTicketPublicationResult | undefined;
    let triageCompleted = false;
    slot.currentSpec = spec.fileName;
    slot.runSpecsEntryPoint = options.entryPoint;
    slot.runSpecsSourceCommand = options.sourceCommand;
    this.touchSlot(slot, "select-spec", flowStartMessage);

    const runTimedStructuredTriageStage = async <Summary>(params: {
      stage: Extract<RunSpecsTriageTimingStage, "spec-triage" | "spec-close-and-version">;
      message: string;
      parseResult: (outputText: string) => ParsedSpecStageResult<Summary>;
      buildTraceMetadata: (summary: Summary) => Record<string, unknown>;
      buildTraceSummary: (summary: Summary) => string;
    }): Promise<Summary> => {
      const { stage, message, parseResult, buildTraceMetadata, buildTraceSummary } = params;
      let parsedStageResult: ParsedSpecStageResult<Summary> | null = null;
      const stageStartedAt = Date.now();
      try {
        await this.runSpecStage(slot, stage, spec, message, {
          validateResult: (result) => {
            parsedStageResult = parseResult(result.output);
            return {
              summary: buildTraceSummary(parsedStageResult.summary),
              metadata: buildTraceMetadata(parsedStageResult.summary),
            };
          },
        });
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        const finalizedParsedStageResult = parsedStageResult as ParsedSpecStageResult<Summary> | null;
        if (!finalizedParsedStageResult) {
          throw new RunnerSpecStageContractError(
            stage,
            `${stage} terminou sem expor o resultado parseavel obrigatorio.`,
          );
        }
        return finalizedParsedStageResult.summary;
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageFailure(triageTimingCollector, stage, durationMs);
        this.recordFlowStageFailure(flowTimingCollector, stage, durationMs);
        throw error;
      }
    };

    const runTimedSpecTriageStage = async (
      message: string,
    ): Promise<RunSpecsSpecTriageSummary> =>
      runTimedStructuredTriageStage({
        stage: "spec-triage",
        message,
        parseResult: (outputText) => this.parseSpecTriageStageResult(outputText),
        buildTraceSummary: (summary) => summary.summary,
        buildTraceMetadata: (summary) => ({
          specStatusAfterTriage: summary.specStatusAfterTriage,
          specTreatmentAfterTriage: summary.specTreatmentAfterTriage,
          derivedTicketsCreated: summary.derivedTicketsCreated,
        }),
      });

    const runTimedSpecCloseAndVersionStage = async (
      message: string,
    ): Promise<RunSpecsSpecCloseAndVersionSummary> =>
      runTimedStructuredTriageStage({
        stage: "spec-close-and-version",
        message,
        parseResult: (outputText) => this.parseSpecCloseAndVersionStageResult(outputText),
        buildTraceSummary: (summary) => summary.summary,
        buildTraceMetadata: (summary) => ({
          closureCompleted: summary.closureCompleted,
          versioningResult: summary.versioningResult,
          commitHash: summary.commitHash,
        }),
      });

    const runTimedSpecTicketValidationStage = async (
      message: string,
    ): Promise<{
      summary: RunSpecsTicketValidationSummary;
      packageContext: SpecTicketValidationPackageContext;
    }> => {
      const stage: Extract<RunSpecsTriageTimingStage, "spec-ticket-validation"> =
        "spec-ticket-validation";
      const stageStartedAt = Date.now();
      try {
        const execution = await this.runSpecTicketValidationStage(slot, spec, message);
        specTicketValidationSummary = execution.summary;
        specTicketValidationPackageContext = execution.packageContext;
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        return execution;
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

    const runTimedSpecTicketDerivationRetrospectiveStage = async (
      message: string,
      validationSummary: RunSpecsTicketValidationSummary | undefined,
      packageContext: SpecTicketValidationPackageContext | undefined,
      functionalVerdict: RunSpecsDerivationRetrospectiveSummary["functionalVerdict"] =
        validationSummary?.verdict ?? "unavailable",
    ): Promise<RunSpecsDerivationRetrospectiveSummary> => {
      const stage: Extract<
        RunSpecsTriageTimingStage,
        "spec-ticket-derivation-retrospective"
      > = "spec-ticket-derivation-retrospective";
      const stageStartedAt = Date.now();
      const reviewedGapHistoryDetected = validationSummary
        ? this.hasReviewedSpecTicketValidationGapHistory(validationSummary)
        : false;
      const structuredInputAvailable = validationSummary
        ? this.hasStructuredSpecTicketValidationStructuredInputs(validationSummary)
        : false;
      const finalizeSummary = async (
        summary: RunSpecsDerivationRetrospectiveSummary,
      ): Promise<RunSpecsDerivationRetrospectiveSummary> => {
        await this.persistSpecTicketDerivationRetrospectiveExecutionIfAllowed({
          project: slot.project,
          spec,
          summary,
        });
        return summary;
      };

      const finalizeSkip = async (
        decision: Extract<
          RunSpecsDerivationRetrospectiveSummary["decision"],
          "skipped-no-reviewed-gaps" | "skipped-insufficient-structured-input"
        >,
        summaryText: string,
      ): Promise<RunSpecsDerivationRetrospectiveSummary> => {
        const summary: RunSpecsDerivationRetrospectiveSummary = {
          decision,
          summary: summaryText,
          reviewedGapHistoryDetected,
          structuredInputAvailable,
          functionalVerdict,
        };
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        await this.recordWorkflowTraceSuccess(slot, {
          kind: "spec",
          stage,
          targetName: spec.fileName,
          targetPath: spec.path,
          promptTemplatePath: "(skip-no-prompt)",
          promptText: "Retrospectiva pre-run-all pulada sem invocacao ao Codex.",
          outputText: summaryText,
          summary: summaryText,
          metadata: this.buildSpecTicketDerivationRetrospectiveTraceMetadata(summary),
        });
        return finalizeSummary(summary);
      };

      if (!structuredInputAvailable || !packageContext) {
        return finalizeSkip(
          "skipped-insufficient-structured-input",
          "Retrospectiva sistemica da derivacao nao executada: o gate funcional falhou antes de produzir insumos estruturados suficientes.",
        );
      }

      if (!reviewedGapHistoryDetected) {
        return finalizeSkip(
          "skipped-no-reviewed-gaps",
          "Retrospectiva sistemica da derivacao nao executada: o gate funcional nao revisou gaps em nenhum ciclo.",
        );
      }

      if (!validationSummary) {
        throw new Error(
          "Resumo estruturado de spec-ticket-validation ausente ao preparar a retrospectiva pre-run-all.",
        );
      }

      try {
        slot.currentSpec = spec.fileName;
        const context = await this.buildSpecTicketDerivationRetrospectiveContext(
          slot.project,
          spec,
          packageContext,
          validationSummary,
        );
        const retrospectiveSpec: SpecRef = {
          ...spec,
          derivationRetrospectiveContext: context.promptContext,
        };
        let parsedResult: WorkflowGapAnalysisResult | null = null;
        const retrospectiveStageResult = await this.runSpecStage(
          slot,
          "spec-ticket-derivation-retrospective",
          retrospectiveSpec,
          message,
          {
            validateResult: (result) => {
              parsedResult = this.finalizeWorkflowGapAnalysisResult(
                "spec-ticket-derivation-retrospective",
                this.parseWorkflowGapAnalysisStageResult(
                  "spec-ticket-derivation-retrospective",
                  result.output,
                  context,
                ),
                slot.project,
                spec,
                context.specContent,
              );
              return {
                summary: this.renderWorkflowGapAnalysisTraceSummary(parsedResult),
                metadata: this.buildWorkflowGapAnalysisTraceMetadata(parsedResult),
              };
            },
          },
        );

        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        const finalizedParsedResult = parsedResult as WorkflowGapAnalysisResult | null;
        if (!finalizedParsedResult) {
          throw new RunnerSpecStageContractError(
            "spec-ticket-derivation-retrospective",
            "derivation-gap-analysis terminou sem expor o resultado parseavel obrigatorio.",
          );
        }
        if (
          finalizedParsedResult.publicationEligibility &&
          !finalizedParsedResult.publicationHandoff
        ) {
          throw new RunnerSpecStageContractError(
            "spec-ticket-derivation-retrospective",
            "derivation-gap-analysis marcou publicationEligibility=true sem publicationHandoff.",
          );
        }

        const publicationHandoff = finalizedParsedResult.publicationHandoff
          ? this.attachWorkflowImprovementTraceToHandoff(
              finalizedParsedResult.publicationHandoff,
              retrospectiveStageResult.traceRecord,
            )
          : undefined;
        if (publicationHandoff) {
          finalizedParsedResult.publicationHandoff = publicationHandoff;
        }

        const publication =
          finalizedParsedResult.publicationEligibility &&
          publicationHandoff
            ? await this.publishWorkflowImprovementTicketIfNeeded(
                slot.project,
                spec,
                publicationHandoff,
              )
            : undefined;

        return finalizeSummary({
          decision: "executed",
          summary:
            finalizedParsedResult.classification === "operational-limitation"
              ? "Retrospectiva sistemica da derivacao executada com limitacao operacional nao bloqueante."
              : `Retrospectiva sistemica da derivacao executada com ${finalizedParsedResult.classification} (${finalizedParsedResult.confidence}).`,
          reviewedGapHistoryDetected,
          structuredInputAvailable,
          functionalVerdict,
          analysis: finalizedParsedResult,
          ...(publication ? { workflowImprovementTicket: publication } : {}),
        });
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(triageTimingCollector, stage, durationMs);
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        const analysis = this.convertWorkflowGapAnalysisFailureToOperationalLimitation({
          error,
          stage: "spec-ticket-derivation-retrospective",
          spec,
          activeProject: slot.project,
          inputMode: "spec-ticket-validation-history",
          workflowArtifactsConsulted:
            slot.project.name === "codex-flow-runner"
              ? ["AGENTS.md", "prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md"]
              : [
                  "../codex-flow-runner/AGENTS.md",
                  "../codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md",
                ],
          summary:
            "Retrospectiva sistemica da derivacao nao concluiu de forma confiavel nesta rodada.",
        });
        const summary: RunSpecsDerivationRetrospectiveSummary = {
          decision: "executed",
          summary:
            "Retrospectiva sistemica da derivacao executada com limitacao operacional nao bloqueante.",
          reviewedGapHistoryDetected,
          structuredInputAvailable,
          functionalVerdict,
          analysis,
        };
        this.logger.warn(
          "Retrospectiva pre-run-all degradou para limitacao operacional nao bloqueante",
          {
            spec: spec.fileName,
            specPath: spec.path,
            activeProjectName: slot.project.name,
            activeProjectPath: slot.project.path,
            detail: analysis.limitation?.detail,
            limitationCode: analysis.limitation?.code,
          },
        );
        return finalizeSummary(summary);
      }
    };

    const recordSuppressedSpecTicketDerivationRetrospectiveIfEligible = async (
      validationSummary: RunSpecsTicketValidationSummary | undefined,
      packageContext: SpecTicketValidationPackageContext | undefined,
      functionalVerdict: RunSpecsDerivationRetrospectiveSummary["functionalVerdict"] =
        validationSummary?.verdict ?? "unavailable",
    ): Promise<void> => {
      const reviewedGapHistoryDetected = validationSummary
        ? this.hasReviewedSpecTicketValidationGapHistory(validationSummary)
        : false;
      const structuredInputAvailable = validationSummary
        ? this.hasStructuredSpecTicketValidationStructuredInputs(validationSummary)
        : false;
      if (!reviewedGapHistoryDetected || !structuredInputAvailable || !packageContext) {
        return;
      }

      const summary =
        "Retrospectiva sistemica da derivacao suprimida por RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false.";
      this.logger.info("Retrospectiva pre-run-all suprimida por feature flag", {
        spec: spec.fileName,
        specPath: spec.path,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
        featureFlag: "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED",
        featureFlagEnabled: false,
        functionalVerdict,
      });
      await this.recordWorkflowTraceSuccess(slot, {
        kind: "spec",
        stage: "spec-ticket-derivation-retrospective",
        targetName: spec.fileName,
        targetPath: spec.path,
        promptTemplatePath: "(suppressed-by-feature-flag)",
        promptText:
          "Retrospectiva pre-run-all suprimida sem invocacao ao Codex porque RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false.",
        outputText: summary,
        summary,
        metadata: {
          suppressedByFeatureFlag: true,
          featureFlag: "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED",
          featureFlagEnabled: false,
          reviewedGapHistoryDetected,
          structuredInputAvailable,
          functionalVerdict,
          ticketCount: packageContext.tickets.length,
          ticketPaths: packageContext.tickets.map((ticket) => ticket.relativePath),
          lineageSource: packageContext.lineageSource,
        },
      });
    };

    const runTimedSpecAuditStage = async (message: string): Promise<SpecAuditStageResult> => {
      const stage: Extract<RunSpecsFlowTimingStage, "spec-audit"> = "spec-audit";
      const stageStartedAt = Date.now();
      try {
        slot.currentSpec = spec.fileName;
        let auditStageResult: SpecAuditStageResult | null = null;
        await this.runSpecStage(slot, stage, spec, message, {
          validateResult: (result) => {
            auditStageResult = this.parseSpecAuditStageResult(result.output);
            return {
              summary: auditStageResult.summary.residualGapsDetected
                ? "Etapa spec-audit concluiu com gaps residuais reais."
                : "Etapa spec-audit concluiu sem gaps residuais reais.",
              metadata: {
                residualGapsDetected: auditStageResult.summary.residualGapsDetected,
                followUpTicketsCreated: auditStageResult.summary.followUpTicketsCreated,
                specStatusAfterAudit: auditStageResult.summary.specStatusAfterAudit,
              },
            };
          },
        });
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        if (!auditStageResult) {
          throw new RunnerSpecStageContractError(
            stage,
            "spec-audit terminou sem expor o resultado minimo de gaps residuais.",
          );
        }
        return auditStageResult;
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageFailure(flowTimingCollector, stage, durationMs);
        throw error;
      }
    };

    const runTimedSpecWorkflowRetrospectiveStage = async (
      message: string,
      auditStageResult: SpecAuditStageResult,
      preAuditOpenTickets: SpecTicketValidationTicketSnapshot[],
      preRunRetrospectiveSummary: RunSpecsDerivationRetrospectiveSummary | undefined,
    ): Promise<WorkflowRetrospectiveStageResult> => {
      const stage: Extract<RunSpecsFlowTimingStage, "spec-workflow-retrospective"> =
        "spec-workflow-retrospective";
      const stageStartedAt = Date.now();
      try {
        slot.currentSpec = spec.fileName;
        const context = await this.buildWorkflowGapAnalysisContext(
          slot.project,
          spec,
          auditStageResult,
          preAuditOpenTickets,
          preRunRetrospectiveSummary,
        );
        const retrospectiveSpec: SpecRef = {
          ...spec,
          workflowRetrospectiveContext: context.promptContext,
        };
        let parsedResult: WorkflowGapAnalysisResult | null = null;
        const retrospectiveStageResult = await this.runSpecStage(
          slot,
          stage,
          retrospectiveSpec,
          message,
          {
            validateResult: (result) => {
              const parsedOutput = this.parseWorkflowGapAnalysisStageResult(
                stage,
                result.output,
                context,
              );
              parsedResult = this.finalizeWorkflowGapAnalysisResult(
                stage,
                {
                  analysis: this.applyWorkflowGapAnalysisAntiDuplication(
                    parsedOutput.analysis,
                    context.preRunHistoricalContext,
                  ),
                  ticketDraftContractError: parsedOutput.ticketDraftContractError,
                },
                slot.project,
                spec,
                context.specContent,
              );
              return {
                summary: this.renderWorkflowGapAnalysisTraceSummary(parsedResult),
                metadata: this.buildWorkflowGapAnalysisTraceMetadata(parsedResult),
              };
            },
          },
        );
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        const finalizedParsedResult = parsedResult as WorkflowGapAnalysisResult | null;
        if (!finalizedParsedResult) {
          throw new RunnerSpecStageContractError(
            stage,
            "workflow-gap-analysis terminou sem expor o resultado parseavel obrigatorio.",
          );
        }
        if (
          finalizedParsedResult.publicationEligibility &&
          !finalizedParsedResult.publicationHandoff
        ) {
          throw new RunnerSpecStageContractError(
            stage,
            "workflow-gap-analysis marcou publicationEligibility=true sem publicationHandoff.",
          );
        }
        const publicationHandoff = finalizedParsedResult.publicationHandoff
          ? this.attachWorkflowImprovementTraceToHandoff(
              finalizedParsedResult.publicationHandoff,
              retrospectiveStageResult.traceRecord,
            )
          : undefined;
        if (publicationHandoff) {
          finalizedParsedResult.publicationHandoff = publicationHandoff;
        }

        const publication =
          finalizedParsedResult.publicationEligibility &&
          publicationHandoff
            ? await this.publishWorkflowImprovementTicketIfNeeded(
                slot.project,
                spec,
                publicationHandoff,
              )
            : undefined;

        if (finalizedParsedResult.historicalReference) {
          this.logger.info(
            "Retrospectiva pos-spec-audit referenciou frente causal preexistente sem nova publication",
            {
              spec: spec.fileName,
              specPath: spec.path,
              activeProjectName: slot.project.name,
              activeProjectPath: slot.project.path,
              historicalTicketPath: finalizedParsedResult.historicalReference.ticketPath,
              matchedFingerprints:
                finalizedParsedResult.historicalReference.findingFingerprints,
            },
          );
        }

        return {
          analysis: finalizedParsedResult,
          ...(publication ? { publication } : {}),
        };
      } catch (error) {
        const durationMs = Date.now() - stageStartedAt;
        this.recordFlowStageCompletion(flowTimingCollector, stage, durationMs);
        const analysis = this.convertWorkflowGapAnalysisFailureToOperationalLimitation(
          {
            error,
            stage,
            spec,
            activeProject: slot.project,
            inputMode:
              auditStageResult.summary.followUpTicketsCreated > 0
                ? "follow-up-tickets"
                : "spec-and-audit-fallback",
            workflowArtifactsConsulted:
              slot.project.name === "codex-flow-runner"
                ? ["AGENTS.md", "prompts/11-retrospectiva-workflow-apos-spec-audit.md"]
                : [
                    "../codex-flow-runner/AGENTS.md",
                    "../codex-flow-runner/prompts/11-retrospectiva-workflow-apos-spec-audit.md",
                  ],
            summary: "workflow-gap-analysis nao concluiu de forma confiavel para a retrospectiva pos-auditoria",
          },
        );
        this.logger.warn(
          "workflow-gap-analysis degradou para limitacao operacional nao bloqueante",
          {
            spec: spec.fileName,
            specPath: spec.path,
            activeProjectName: slot.project.name,
            activeProjectPath: slot.project.path,
            detail: analysis.limitation?.detail,
            limitationCode: analysis.limitation?.code,
          },
        );
        return { analysis };
      }
    };

    const recordSuppressedSpecWorkflowRetrospectiveIfEligible = async (
      auditStageResult: SpecAuditStageResult,
      preAuditOpenTickets: SpecTicketValidationTicketSnapshot[],
      preRunRetrospectiveSummary: RunSpecsDerivationRetrospectiveSummary | undefined,
    ): Promise<void> => {
      if (!auditStageResult.summary.residualGapsDetected) {
        return;
      }

      const summary =
        "Retrospectiva sistemica pos-spec-audit suprimida por RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false.";
      this.logger.info("Retrospectiva pos-spec-audit suprimida por feature flag", {
        spec: spec.fileName,
        specPath: spec.path,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
        featureFlag: "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED",
        featureFlagEnabled: false,
        followUpTicketsCreated: auditStageResult.summary.followUpTicketsCreated,
      });
      await this.recordWorkflowTraceSuccess(slot, {
        kind: "spec",
        stage: "spec-workflow-retrospective",
        targetName: spec.fileName,
        targetPath: spec.path,
        promptTemplatePath: "(suppressed-by-feature-flag)",
        promptText:
          "Retrospectiva pos-spec-audit suprimida sem invocacao ao Codex porque RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED=false.",
        outputText: summary,
        summary,
        metadata: {
          suppressedByFeatureFlag: true,
          featureFlag: "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED",
          featureFlagEnabled: false,
          residualGapsDetected: auditStageResult.summary.residualGapsDetected,
          followUpTicketsCreated: auditStageResult.summary.followUpTicketsCreated,
          preAuditOpenTicketCount: preAuditOpenTickets.length,
          preAuditOpenTicketPaths: preAuditOpenTickets.map((ticket) => ticket.relativePath),
          preRunRetrospectiveDecision: preRunRetrospectiveSummary?.decision ?? null,
        },
      });
    };

    try {
      if (!startedFromValidation) {
        specTriageSummary = await runTimedSpecTriageStage(
          `Executando etapa spec-triage para ${spec.fileName}`,
        );
      }
      let validationExecution:
        | {
            summary: RunSpecsTicketValidationSummary;
            packageContext: SpecTicketValidationPackageContext;
          }
        | undefined;
      try {
        validationExecution = await runTimedSpecTicketValidationStage(
          `Executando etapa spec-ticket-validation para ${spec.fileName}`,
        );
      } catch (error) {
        if (!(error instanceof RunnerSpecTicketValidationStageError)) {
          throw error;
        }

        specTicketValidationSummary = error.partialSummary ?? specTicketValidationSummary;
        specTicketValidationPackageContext = error.packageContext ?? specTicketValidationPackageContext;
        if (this.env.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED) {
          specTicketDerivationRetrospectiveSummary =
            await runTimedSpecTicketDerivationRetrospectiveStage(
              `Executando etapa spec-ticket-derivation-retrospective para ${spec.fileName}`,
              specTicketValidationSummary,
              specTicketValidationPackageContext,
              "unavailable",
            );
        } else {
          await recordSuppressedSpecTicketDerivationRetrospectiveIfEligible(
            specTicketValidationSummary,
            specTicketValidationPackageContext,
            "unavailable",
          );
        }

        const triageTiming = this.buildFlowTimingSnapshot(triageTimingCollector);
        const finalStage: RunSpecsTriageFinalStage =
          specTicketDerivationRetrospectiveSummary?.decision === "executed"
            ? "spec-ticket-derivation-retrospective"
            : "spec-ticket-validation";
        const details = [
          error.message,
          specTicketDerivationRetrospectiveSummary?.summary,
        ]
          .filter(Boolean)
          .join(" ");
        this.touchSlot(
          slot,
          "error",
          `Falha ao executar spec-ticket-validation da spec ${spec.fileName}; rodada /run-all bloqueada para ${sourceCommand}`,
        );
        this.logger.error(
          startedFromValidation
            ? "Erro no ciclo funcional de run-specs"
            : "Erro no ciclo de triagem de spec",
          {
          spec: spec.fileName,
          specPath: spec.path,
          stage: "spec-ticket-validation",
          error: error.message,
          durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
          sourceCommand,
          derivationRetrospectiveDecision: specTicketDerivationRetrospectiveSummary?.decision,
          },
        );
        await this.emitRunSpecsTriageMilestone({
          spec: { ...spec },
          outcome: "failure",
          finalStage,
          sourceCommand,
          entryPoint: options.entryPoint,
          nextAction:
            `Gate spec-ticket-validation interrompido por falha tecnica. Corrija a falha e reexecute ${sourceCommand}.`,
          details,
          timing: triageTiming,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
        });
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage,
          completionReason: "spec-ticket-validation-failure",
          sourceCommand,
          entryPoint: options.entryPoint,
          details,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
          runAllSummary,
        });
        return;
      }

      const validationSummary = validationExecution.summary;
      if (this.env.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED) {
        specTicketDerivationRetrospectiveSummary =
          await runTimedSpecTicketDerivationRetrospectiveStage(
            `Executando etapa spec-ticket-derivation-retrospective para ${spec.fileName}`,
            validationSummary,
            validationExecution.packageContext,
          );
      } else {
        await recordSuppressedSpecTicketDerivationRetrospectiveIfEligible(
          validationSummary,
          validationExecution.packageContext,
        );
      }
      if (validationSummary.verdict !== "GO") {
        const finalStage: RunSpecsTriageFinalStage =
          specTicketDerivationRetrospectiveSummary?.decision === "executed"
            ? "spec-ticket-derivation-retrospective"
            : "spec-ticket-validation";
        const triageTiming = this.buildFlowTimingSnapshot(triageTimingCollector);
        this.logger.info("Gate spec-ticket-validation bloqueou continuidade do fluxo run-specs", {
          spec: spec.fileName,
          specPath: spec.path,
          verdict: validationSummary.verdict,
          confidence: validationSummary.confidence,
          finalReason: validationSummary.finalReason,
          cyclesExecuted: validationSummary.cyclesExecuted,
          durationMs: triageTiming.totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
          sourceCommand,
        });
        await this.emitRunSpecsTriageMilestone({
          spec: { ...spec },
          outcome: "blocked",
          finalStage,
          sourceCommand,
          entryPoint: options.entryPoint,
          nextAction:
            `Rodada /run-all bloqueada pelo veredito NO_GO em spec-ticket-validation. Corrija os gaps e reexecute ${sourceCommand}.`,
          details: [validationSummary.summary, specTicketDerivationRetrospectiveSummary?.summary]
            .filter(Boolean)
            .join(" "),
          timing: triageTiming,
          specTicketValidation: validationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
        });
        slot.currentSpec = null;
        this.touchSlot(
          slot,
          "idle",
          `Fluxo ${sourceCommand} bloqueado pelo gate spec-ticket-validation para ${spec.fileName}`,
        );
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "blocked",
          finalStage,
          completionReason: "spec-ticket-validation-no-go",
          sourceCommand,
          entryPoint: options.entryPoint,
          details: [validationSummary.summary, specTicketDerivationRetrospectiveSummary?.summary]
            .filter(Boolean)
            .join(" "),
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: validationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          runAllSummary,
        });
        return;
      }
      specCloseAndVersionSummary = await runTimedSpecCloseAndVersionStage(
        `Executando etapa spec-close-and-version para ${spec.fileName}`,
      );
      const triageTiming = this.buildFlowTimingSnapshot(triageTimingCollector);
      this.logger.info("Ciclo inicial de run-specs concluido com sucesso", {
        spec: spec.fileName,
        specPath: spec.path,
        durationMs: triageTiming.totalDurationMs,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
        sourceCommand,
        entryPoint: options.entryPoint,
      });
      await this.emitRunSpecsTriageMilestone({
        spec: { ...spec },
        outcome: "success",
        finalStage: "spec-close-and-version",
        sourceCommand,
        entryPoint: options.entryPoint,
        nextAction: runAllStartMessage,
        timing: triageTiming,
        specTicketValidation: validationSummary,
        specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
      });
      triageCompleted = true;
      slot.currentSpec = null;
      this.touchSlot(
        slot,
        "idle",
        startedFromValidation
          ? `Retomada pela validacao da spec ${spec.fileName} concluida; iniciando rodada /run-all`
          : `Triagem da spec ${spec.fileName} concluida; iniciando rodada /run-all`,
      );
      runAllSummary = await this.runForever(slot);
      if (runAllSummary.outcome === "success") {
        this.recordFlowStageCompletion(
          flowTimingCollector,
          "run-all",
          runAllSummary.timing.totalDurationMs,
        );
        const preAuditOpenTickets = await this.listOpenTicketsForSpec(slot.project.path, spec);
        const specAuditResult = await runTimedSpecAuditStage(
          `Executando etapa spec-audit para ${spec.fileName}`,
        );
        specAuditSummary = specAuditResult.summary;
        let finalStage: RunSpecsFlowFinalStage = "spec-audit";
        if (specAuditResult.summary.residualGapsDetected) {
          if (this.env.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED) {
            const retrospectiveResult = await runTimedSpecWorkflowRetrospectiveStage(
              `Executando etapa spec-workflow-retrospective para ${spec.fileName}`,
              specAuditResult,
              preAuditOpenTickets,
              specTicketDerivationRetrospectiveSummary,
            );
            workflowGapAnalysisSummary = retrospectiveResult.analysis;
            workflowImprovementTicketSummary = retrospectiveResult.publication;
            finalStage = "spec-workflow-retrospective";
          } else {
            await recordSuppressedSpecWorkflowRetrospectiveIfEligible(
              specAuditResult,
              preAuditOpenTickets,
              specTicketDerivationRetrospectiveSummary,
            );
          }
        }
        slot.currentSpec = null;
        this.touchSlot(slot, "idle", `Fluxo ${sourceCommand} finalizado para ${spec.fileName}`);
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "success",
          finalStage,
          completionReason: "completed",
          sourceCommand,
          entryPoint: options.entryPoint,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
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
          sourceCommand,
          entryPoint: options.entryPoint,
          details:
            runAllSummary.details ??
            `Fluxo /run-all interrompido durante a execucao encadeada de ${sourceCommand}.`,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
          runAllSummary,
        });
      }
    } catch (error) {
      const stage =
        (error instanceof CodexStageExecutionError &&
          (error.stage === "spec-triage" ||
            error.stage === "spec-ticket-derivation-retrospective" ||
            error.stage === "spec-close-and-version" ||
            error.stage === "spec-audit" ||
            error.stage === "spec-workflow-retrospective")) ||
        error instanceof RunnerSpecTicketValidationStageError ||
        error instanceof RunnerSpecStageContractError
          ? error.stage
          : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      slot.isRunning = false;
      const finalStage: RunSpecsTriageFinalStage =
        stage === "spec-triage" ||
        stage === "spec-ticket-validation" ||
        stage === "spec-ticket-derivation-retrospective" ||
        stage === "spec-close-and-version"
          ? stage
          : "unknown";
      const triageFailed = !triageCompleted;

      if (triageFailed) {
        const failedAtCloseAndVersion = stage === "spec-close-and-version";
        const failedAtTicketValidation = stage === "spec-ticket-validation";
        const failedAtDerivationRetrospective = stage === "spec-ticket-derivation-retrospective";
        const nextAction = failedAtCloseAndVersion
          ? `Rodada /run-all bloqueada. Corrija a falha de fechamento e reexecute ${sourceCommand}.`
          : failedAtTicketValidation
            ? `Gate spec-ticket-validation interrompido por falha tecnica. Corrija a falha e reexecute ${sourceCommand}.`
          : failedAtDerivationRetrospective
            ? `Retrospectiva sistemica da derivacao falhou antes do fechamento. Corrija a falha e reexecute ${sourceCommand}.`
          : `Fluxo interrompido antes do fechamento. Corrija a falha e reexecute ${sourceCommand}.`;
        this.touchSlot(
          slot,
          "error",
          failedAtCloseAndVersion
            ? `Falha ao concluir ${flowDescription} ${spec.fileName}; rodada /run-all bloqueada`
            : failedAtTicketValidation
              ? `Falha ao executar spec-ticket-validation da spec ${spec.fileName}; rodada /run-all bloqueada para ${sourceCommand}`
            : failedAtDerivationRetrospective
              ? `Falha na retrospectiva sistemica da derivacao da spec ${spec.fileName}`
            : `Falha ao executar ${flowDescription} ${spec.fileName}`,
        );
        this.logger.error(
          startedFromValidation
            ? "Erro no ciclo funcional de run-specs"
            : "Erro no ciclo de triagem de spec",
          {
          spec: spec.fileName,
          specPath: spec.path,
          stage,
          error: errorMessage,
          durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
          sourceCommand,
          entryPoint: options.entryPoint,
          },
        );
        await this.emitRunSpecsTriageMilestone({
          spec: { ...spec },
          outcome: "failure",
          finalStage,
          sourceCommand,
          entryPoint: options.entryPoint,
          nextAction,
          details: errorMessage,
          timing: this.buildFlowTimingSnapshot(triageTimingCollector),
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
        });
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage,
          completionReason: failedAtTicketValidation
            ? "spec-ticket-validation-failure"
            : "triage-failure",
          sourceCommand,
          entryPoint: options.entryPoint,
          details: errorMessage,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
          runAllSummary,
        });
      } else if (stage === "spec-audit" || stage === "spec-workflow-retrospective") {
        const failedAtRetrospective = stage === "spec-workflow-retrospective";
        this.touchSlot(
          slot,
          "error",
          failedAtRetrospective
            ? `Falha na retrospectiva sistemica da spec ${spec.fileName}`
            : `Falha na auditoria final da spec ${spec.fileName}`,
        );
        this.logger.error(
          failedAtRetrospective
            ? `Erro no fluxo ${sourceCommand} durante spec-workflow-retrospective`
            : `Erro no fluxo ${sourceCommand} durante spec-audit`,
          {
            spec: spec.fileName,
            specPath: spec.path,
            stage,
            error: errorMessage,
            durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
            activeProjectName: slot.project.name,
            activeProjectPath: slot.project.path,
            sourceCommand,
          },
        );
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: stage,
          completionReason: failedAtRetrospective
            ? "spec-workflow-retrospective-failure"
            : "spec-audit-failure",
          sourceCommand,
          entryPoint: options.entryPoint,
          details: errorMessage,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
          runAllSummary,
        });
      } else {
        this.recordFlowStageFailure(flowTimingCollector, "run-all", 0);
        this.touchSlot(
          slot,
          "error",
          `Falha no /run-all encadeado apos ${flowDescription} ${spec.fileName}`,
        );
        this.logger.error(`Erro no fluxo ${sourceCommand} durante /run-all encadeado`, {
          spec: spec.fileName,
          specPath: spec.path,
          stage: "run-all",
          error: errorMessage,
          durationMs: this.buildFlowTimingSnapshot(flowTimingCollector).totalDurationMs,
          activeProjectName: slot.project.name,
          activeProjectPath: slot.project.path,
          sourceCommand,
        });
        flowSummary = this.buildRunSpecsFlowSummary({
          slot,
          spec,
          outcome: "failure",
          finalStage: "run-all",
          completionReason: "run-all-failure",
          sourceCommand,
          entryPoint: options.entryPoint,
          details: errorMessage,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
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
          sourceCommand,
          entryPoint: options.entryPoint,
          details: `Fluxo ${sourceCommand} interrompido antes da emissao do resumo final.`,
          triageTimingCollector,
          flowTimingCollector,
          specTriage: specTriageSummary,
          specTicketValidation: specTicketValidationSummary,
          specTicketDerivationRetrospective: specTicketDerivationRetrospectiveSummary,
          specCloseAndVersion: specCloseAndVersionSummary,
          specAudit: specAuditSummary,
          workflowGapAnalysis: workflowGapAnalysisSummary,
          workflowImprovementTicket: workflowImprovementTicketSummary,
          runAllSummary,
        });
      await this.emitRunFlowCompleted(summary);
      slot.currentSpec = null;
      slot.runSpecsSourceCommand = null;
      slot.runSpecsEntryPoint = null;
      this.syncStateFromSlots();
    }
  }

  private async runSpecTicketValidationStage(
    slot: ActiveRunnerSlot,
    spec: SpecRef,
    message: string,
  ): Promise<{
    summary: RunSpecsTicketValidationSummary;
    packageContext: SpecTicketValidationPackageContext;
  }> {
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
          autoCorrect: async (request) => {
            const currentPackageContext = await this.buildSpecTicketValidationPackageContext(
              slot.project.path,
              spec,
            );
            const allowedArtifactPaths = this.collectSpecTicketValidationAutoCorrectArtifactPaths(
              slot.project.path,
              spec,
              request.latestPass.gaps,
            );
            if (allowedArtifactPaths.length === 0) {
              return {
                packageContext: currentPackageContext.packageContext,
                appliedCorrections: [],
                materialChangesApplied: false,
              };
            }

            const snapshots = await this.captureSpecTicketValidationArtifactSnapshots(
              slot.project.path,
              allowedArtifactPaths,
            );
            try {
              const autoCorrection = await slot.codexClient.runSpecTicketValidationAutoCorrect({
                spec,
                cycleNumber: request.cycleNumber,
                packageContext: currentPackageContext.packageContext,
                latestPass: request.latestPass,
                allowedArtifactPaths,
              });
              const refreshedPackageContext = await this.buildSpecTicketValidationPackageContext(
                slot.project.path,
                spec,
              );
              const materialChangesApplied =
                refreshedPackageContext.packageContext !== currentPackageContext.packageContext;

              if (!materialChangesApplied) {
                await this.restoreSpecTicketValidationArtifactSnapshots(snapshots);
                if (autoCorrection.appliedCorrections.length > 0) {
                  this.logger.warn(
                    "Autocorrecao do gate reportou correcoes, mas nao alterou materialmente o pacote derivado",
                    {
                      spec: spec.fileName,
                      specPath: spec.path,
                      cycleNumber: request.cycleNumber,
                      activeProjectName: slot.project.name,
                      activeProjectPath: slot.project.path,
                    },
                  );
                }

                return {
                  packageContext: currentPackageContext.packageContext,
                  appliedCorrections: [],
                  materialChangesApplied: false,
                };
              }

              if (autoCorrection.appliedCorrections.length === 0) {
                await this.restoreSpecTicketValidationArtifactSnapshots(snapshots);
                throw new Error(
                  "A etapa de autocorrecao alterou materialmente o pacote derivado sem registrar `appliedCorrections`.",
                );
              }

              packageContext = refreshedPackageContext;
              return {
                packageContext: refreshedPackageContext.packageContext,
                appliedCorrections: autoCorrection.appliedCorrections,
                materialChangesApplied: true,
              };
            } catch (error) {
              await this.restoreSpecTicketValidationArtifactSnapshots(snapshots);
              throw error;
            }
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

      return { summary, packageContext };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const partialSummary =
        error instanceof SpecTicketValidationExecutionError &&
        error.partialResult.snapshots.length > 0
          ? this.buildRunSpecsTicketValidationSummaryFromPartialExecution(error.partialResult)
          : undefined;
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
            ? this.buildSpecTicketValidationTraceMetadata(partialSummary, packageContext)
            : undefined,
          decisionStatus: "failure",
          decisionErrorMessage: errorMessage,
        });
      }

      throw error instanceof RunnerSpecTicketValidationStageError
        ? error
        : new RunnerSpecTicketValidationStageError(
            errorMessage,
            error,
            partialSummary,
            packageContext ?? undefined,
          );
    }
  }

  private async validateRunSpecsFromValidationBacklog(
    projectPath: string,
    spec: SpecRef,
  ): Promise<
    | { status: "eligible" }
    | {
        status: "validation-blocked";
        message: string;
      }
    | {
        status: "validation-failed";
        message: string;
      }
  > {
    try {
      await this.buildSpecTicketValidationPackageContext(projectPath, spec);
      return { status: "eligible" };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      if (
        details.includes("nenhum ticket aberto da linhagem foi encontrado") ||
        details.startsWith(
          "A spec referencia tickets abertos inexistentes para spec-ticket-validation:",
        )
      ) {
        return {
          status: "validation-blocked",
          message: [
            `Nao existe backlog derivado aberto reaproveitavel para ${spec.fileName}.`,
            "Revise a linhagem entre a spec e os tickets abertos atuais ou use /run_specs <arquivo-da-spec.md> para uma retriagem completa.",
          ].join(" "),
        };
      }

      return {
        status: "validation-failed",
        message: [
          `Falha ao validar o backlog derivado aberto para ${spec.fileName}.`,
          "Verifique logs/permissoes do projeto ativo e tente novamente.",
          `Detalhes: ${details}`,
        ].join(" "),
      };
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
    const relatedTicketPaths = this.extractRelatedOpenTicketPaths(specContent, spec.path);
    const fallbackTickets = await this.resolveRelatedOpenTickets(
      projectPath,
      relatedTicketPaths,
      sourceSpecTickets.length === 0,
    );
    const tickets = this.mergeSpecTicketValidationTickets(sourceSpecTickets, fallbackTickets);

    if (tickets.length === 0) {
      throw new Error(
        `Nao foi possivel derivar com seguranca o pacote de tickets da spec ${spec.path}; nenhum ticket aberto da linhagem foi encontrado. Verifique a metadata de linhagem entre spec e tickets (Source spec/Spec pai, Related tickets/Tickets relacionados) e use caminhos parseaveis para o repositorio.`,
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

  private extractRelatedOpenTicketPaths(specContent: string, specPath: string): string[] {
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
      .map((value) => this.normalizeSpecRelativeRepositoryPath(specPath, value))
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
      "- Natureza deste pacote: triagem inicial de spec antes do /run-all.",
      "",
      "## Notas contratuais do gate",
      "- `documentation-compliance-gap` deve seguir o contrato canonico de `INTERNAL_TICKETS.md`.",
      "- Campos extras exclusivos de `post-implementation audit/review` so sao obrigatorios quando essa origem estiver explicita no ticket ou no proprio contexto do gate.",
      "- Tickets derivados de `spec-triage` nao devem receber esse gap apenas por ausencia desses campos exclusivos.",
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

  private hasReviewedSpecTicketValidationGapHistory(
    summary: RunSpecsTicketValidationSummary,
  ): boolean {
    return summary.cycleHistory.some(
      (cycle) => cycle.openGapFingerprints.length > 0 || cycle.appliedCorrections.length > 0,
    );
  }

  private hasStructuredSpecTicketValidationStructuredInputs(
    summary: RunSpecsTicketValidationSummary,
  ): boolean {
    return summary.cycleHistory.length > 0 && summary.validationThreadId !== null;
  }

  private async buildSpecTicketDerivationRetrospectiveContext(
    activeProject: ProjectRef,
    spec: SpecRef,
    packageContext: SpecTicketValidationPackageContext,
    validationSummary: RunSpecsTicketValidationSummary,
  ): Promise<SpecTicketDerivationRetrospectiveContext> {
    const workflowContext = await this.describeWorkflowRepoContext(activeProject);
    const cycleHistoryLines =
      validationSummary.cycleHistory.length > 0
        ? validationSummary.cycleHistory.flatMap((cycle) => {
            const reductionLabel =
              cycle.realGapReductionFromPrevious === null
                ? "n/a"
                : cycle.realGapReductionFromPrevious
                  ? "sim"
                  : "nao";
            return [
              `### Ciclo ${String(cycle.cycleNumber)} [${cycle.phase}]`,
              `- Veredito: ${cycle.verdict}`,
              `- Confianca: ${cycle.confidence}`,
              `- Resumo: ${cycle.summary}`,
              `- Gaps abertos: ${String(cycle.openGapFingerprints.length)}`,
              `- Reducao real de gaps vs. ciclo anterior: ${reductionLabel}`,
              ...(cycle.appliedCorrections.length > 0
                ? [
                    "- Correcoes aplicadas neste ciclo:",
                    ...cycle.appliedCorrections.map(
                      (correction) =>
                        `  - ${correction.description} (${correction.outcome}) [${correction.affectedArtifactPaths.join(", ") || "sem artefato"}]`,
                    ),
                  ]
                : ["- Correcoes aplicadas neste ciclo: nenhuma"]),
              "",
            ];
          })
        : ["- Nenhum ciclo estruturado disponivel."];

    const promptContext = [
      "# Contexto estruturado do derivation-gap-analysis",
      "",
      `- Projeto avaliado: ${activeProject.name}`,
      `- Caminho do projeto avaliado: ${activeProject.path}`,
      `- Spec alvo: ${spec.path}`,
      "- Natureza desta etapa: retrospectiva sistemica pre-run-all em contexto novo, separada do gate funcional.",
      "- Input mode esperado: spec-ticket-validation-history",
      `- Veredito funcional final utilizavel: ${validationSummary.verdict}`,
      `- Confianca funcional final: ${validationSummary.confidence}`,
      `- Motivo funcional final: ${validationSummary.finalReason}`,
      `- Ciclos executados pelo gate funcional: ${String(validationSummary.cyclesExecuted)}`,
      `- Gaps revisados no historico: ${this.hasReviewedSpecTicketValidationGapHistory(validationSummary) ? "sim" : "nao"}`,
      `- Contexto do codex-flow-runner a consultar: ${workflowContext.displayPath}`,
      `- Estado do contexto do codex-flow-runner: ${workflowContext.status}`,
      "",
      "## Fontes canonicas priorizadas no codex-flow-runner",
      ...workflowContext.artifactHints.map((entry) => `- ${entry}`),
      "",
      "## Package final de tickets derivados",
      packageContext.packageContext,
      "",
      "## Historico completo do gate funcional",
      ...cycleHistoryLines,
      "## Sinais finais do gate funcional",
      `- Gaps finais abertos: ${String(validationSummary.finalOpenGapFingerprints.length)}`,
      `- Correcoes acumuladas: ${String(validationSummary.appliedCorrections.length)}`,
      `- Thread da validacao: ${validationSummary.validationThreadId ?? "indisponivel"}`,
      "",
      "## Regras de decisao obrigatorias",
      "- Esta etapa nunca altera o desfecho funcional do projeto alvo.",
      "- `publicationEligibility=true` so e valido com `classification=systemic-gap` e `confidence=high`.",
      "- `systemic-hypothesis` registra apenas hipotese sistemica, sem ticket automatico.",
      "- Em projeto externo, a etapa e read-only sobre spec/tickets/execplans/documentacao do projeto alvo.",
      "- Se o contexto do codex-flow-runner nao estiver disponivel para sustentacao causal segura, use `operational-limitation`.",
    ]
      .join("\n")
      .trim();

    return {
      inputMode: "spec-ticket-validation-history",
      promptContext,
      workflowArtifactsConsulted: workflowContext.artifactHints,
      specContent: packageContext.specContent,
      packageContext,
      validationSummary,
    };
  }

  private buildWorkflowGapAnalysisPreRunHistoricalContext(
    summary: RunSpecsDerivationRetrospectiveSummary | undefined,
  ): WorkflowGapAnalysisPreRunHistoricalContext | null {
    if (!summary) {
      return null;
    }

    const analysis = summary.analysis;
    return {
      decision: summary.decision,
      summary: summary.summary,
      classification: analysis?.classification ?? null,
      confidence: analysis?.confidence ?? null,
      ticketPath: summary.workflowImprovementTicket?.ticketPath ?? null,
      findings:
        analysis?.findings.map((finding) => ({
          summary: finding.summary,
          fingerprint: buildWorkflowImprovementTicketFindingFingerprint(finding),
        })) ?? [],
    };
  }

  private async buildWorkflowGapAnalysisContext(
    activeProject: ProjectRef,
    spec: SpecRef,
    auditStageResult: SpecAuditStageResult,
    preAuditOpenTickets: SpecTicketValidationTicketSnapshot[],
    preRunRetrospectiveSummary: RunSpecsDerivationRetrospectiveSummary | undefined,
  ): Promise<WorkflowGapAnalysisContext> {
    const specAbsolutePath = this.resolveProjectRelativePath(activeProject.path, spec.path);
    let specContent = "";
    try {
      specContent = await fs.readFile(specAbsolutePath, "utf8");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao ler spec ${spec.path} para workflow-gap-analysis: ${details}`,
      );
    }

    const postAuditOpenTickets = await this.listOpenTicketsForSpec(activeProject.path, spec);
    const preAuditPaths = new Set(preAuditOpenTickets.map((ticket) => ticket.relativePath));
    const followUpTickets = postAuditOpenTickets.filter(
      (ticket) => !preAuditPaths.has(ticket.relativePath),
    );
    const inputMode: WorkflowGapAnalysisInputMode =
      followUpTickets.length > 0 ? "follow-up-tickets" : "spec-and-audit-fallback";
    const workflowContext = await this.describeWorkflowRepoContext(activeProject);
    const fallbackReason =
      inputMode === "spec-and-audit-fallback"
        ? auditStageResult.summary.followUpTicketsCreated > 0
          ? `spec-audit declarou ${String(auditStageResult.summary.followUpTicketsCreated)} follow-up(s), mas nenhum novo ticket ligado a spec foi resolvido por delta observavel.`
          : "spec-audit nao abriu follow-up funcional; usar spec + resultado do audit e obrigatorio."
        : null;
    const workflowArtifactsConsulted = workflowContext.artifactHints;
    const preRunHistoricalContext = this.buildWorkflowGapAnalysisPreRunHistoricalContext(
      preRunRetrospectiveSummary,
    );
    const preRunHistoricalLines =
      preRunHistoricalContext === null
        ? ["- Retrospectiva pre-run-all indisponivel nesta rodada."]
        : [
            `- Decisao pre-run-all: ${preRunHistoricalContext.decision}`,
            `- Resumo pre-run-all: ${preRunHistoricalContext.summary}`,
            `- Classificacao pre-run-all: ${preRunHistoricalContext.classification ?? "n/a"}`,
            `- Confianca pre-run-all: ${preRunHistoricalContext.confidence ?? "n/a"}`,
            `- Ticket transversal preexistente: ${preRunHistoricalContext.ticketPath ?? "nenhum"}`,
            preRunHistoricalContext.findings.length === 0
              ? "- Fingerprints/achados pre-run-all reaproveitaveis: nenhum"
              : `- Fingerprints pre-run-all ja tratados: ${preRunHistoricalContext.findings.map((finding) => finding.fingerprint).join(", ")}`,
            "- Regra anti-duplicacao: se a mesma frente causal ja estiver coberta por algum fingerprint pre-run-all, registre apenas `historicalReference` e mantenha `publicationEligibility=false`.",
            ...(preRunHistoricalContext.findings.length > 0
              ? [
                  "",
                  "### Achados causais pre-run-all ja tratados",
                  ...preRunHistoricalContext.findings.flatMap((finding, index) => [
                    `${index + 1}. ${finding.fingerprint}`,
                    `   - Resumo: ${finding.summary}`,
                  ]),
                ]
              : []),
          ];
    const promptContext = [
      "# Contexto estruturado do workflow-gap-analysis",
      "",
      `- Projeto auditado: ${activeProject.name}`,
      `- Caminho do projeto auditado: ${activeProject.path}`,
      `- Spec alvo: ${spec.path}`,
      `- Natureza desta etapa: retrospectiva pos-auditoria em contexto novo, sem herdar implicitamente o contexto de spec-audit.`,
      `- Input mode esperado: ${inputMode}`,
      `- Follow-up tickets declarados por spec-audit: ${String(auditStageResult.summary.followUpTicketsCreated)}`,
      `- Follow-up tickets resolvidos por delta observavel: ${String(followUpTickets.length)}`,
      `- Contexto do codex-flow-runner a consultar: ${workflowContext.displayPath}`,
      `- Estado do contexto do codex-flow-runner: ${workflowContext.status}`,
      "",
      "## Fontes canonicas priorizadas no codex-flow-runner",
      ...workflowArtifactsConsulted.map((entry) => `- ${entry}`),
      "",
      "## Resultado bruto do spec-audit",
      auditStageResult.outputText.trim(),
      "",
      "## Tickets abertos antes do spec-audit",
      ...(preAuditOpenTickets.length > 0
        ? preAuditOpenTickets.map((ticket) => `- ${ticket.relativePath}`)
        : ["- Nenhum"]),
      "",
      "## Tickets abertos depois do spec-audit",
      ...(postAuditOpenTickets.length > 0
        ? postAuditOpenTickets.map((ticket) => `- ${ticket.relativePath}`)
        : ["- Nenhum"]),
      "",
      "## Contexto causal pre-run-all ja tratado",
      ...preRunHistoricalLines,
      "",
      "## Insumos principais da analise",
      ...(followUpTickets.length > 0
        ? followUpTickets.flatMap((ticket, index) => [
            `### ${index + 1}. ${ticket.relativePath}`,
            ticket.content.trim() || "(ticket vazio)",
            "",
          ])
        : [
            "- Nenhum follow-up funcional novo foi resolvido por delta observavel.",
            `- Fallback controlado: ${fallbackReason ?? "n/a"}`,
            "",
            "## Spec alvo (fallback)",
            specContent.trim() || "(spec vazia)",
            "",
          ]),
      "## Regras de decisao obrigatorias",
      "- `publicationEligibility=true` so e valido com `classification=systemic-gap` e `confidence=high`.",
      "- `systemic-hypothesis` registra apenas hipotese sistemica, sem ticket automatico.",
      "- `not-systemic` e `emphasis-only` nao devem promover backlog automatico.",
      "- Se o contexto do codex-flow-runner nao estiver disponivel para sustentacao causal segura, use `operational-limitation`.",
    ]
      .join("\n")
      .trim();

    return {
      inputMode,
      promptContext,
      followUpTicketPaths: followUpTickets.map((ticket) => ticket.relativePath),
      workflowArtifactsConsulted,
      specContent,
      preRunHistoricalContext,
    };
  }

  private applyWorkflowGapAnalysisAntiDuplication(
    result: WorkflowGapAnalysisResult,
    preRunHistoricalContext: WorkflowGapAnalysisPreRunHistoricalContext | null,
  ): WorkflowGapAnalysisResult {
    if (preRunHistoricalContext === null || preRunHistoricalContext.findings.length === 0) {
      if (result.historicalReference === null) {
        return result;
      }

      return {
        ...result,
        historicalReference: null,
      };
    }

    const knownFingerprints = new Set(
      preRunHistoricalContext.findings.map((finding) => finding.fingerprint),
    );
    const overlappingFindingFingerprints = result.findings
      .map((finding) => buildWorkflowImprovementTicketFindingFingerprint(finding))
      .filter((fingerprint) => knownFingerprints.has(fingerprint));
    const referencedFingerprints =
      result.historicalReference?.findingFingerprints.filter((fingerprint) =>
        knownFingerprints.has(fingerprint),
      ) ?? [];
    const matchedFingerprints = this.sortUniqueStrings([
      ...overlappingFindingFingerprints,
      ...referencedFingerprints,
    ]);

    if (matchedFingerprints.length === 0) {
      if (result.historicalReference === null) {
        return result;
      }

      return {
        ...result,
        historicalReference: null,
      };
    }

    const { publicationHandoff: _publicationHandoff, ...rest } = result;
    return {
      ...rest,
      publicationEligibility: false,
      historicalReference: {
        summary:
          result.historicalReference?.summary ??
          "Publication automatica suprimida porque a mesma frente causal ja foi tratada na retrospectiva pre-run-all.",
        ticketPath: preRunHistoricalContext.ticketPath,
        findingFingerprints: matchedFingerprints,
      },
    };
  }

  private async describeWorkflowRepoContext(activeProject: ProjectRef): Promise<{
    displayPath: string;
    status: string;
    artifactHints: string[];
  }> {
    if (activeProject.name === "codex-flow-runner") {
      return {
        displayPath: ".",
        status: "repositorio corrente",
        artifactHints: [
          "AGENTS.md",
          "DOCUMENTATION.md",
          "INTERNAL_TICKETS.md",
          "PLANS.md",
          "SPECS.md",
          "docs/workflows/codex-quality-gates.md",
          "prompts/",
        ],
      };
    }

    const siblingPath = path.resolve(activeProject.path, "..", "codex-flow-runner");
    const siblingExists = await fs
      .access(siblingPath)
      .then(() => true)
      .catch(() => false);

    return {
      displayPath: "../codex-flow-runner",
      status: siblingExists ? "repositorio irmao acessivel" : "repositorio irmao ausente",
      artifactHints: [
        "../codex-flow-runner/AGENTS.md",
        "../codex-flow-runner/DOCUMENTATION.md",
        "../codex-flow-runner/INTERNAL_TICKETS.md",
        "../codex-flow-runner/PLANS.md",
        "../codex-flow-runner/SPECS.md",
        "../codex-flow-runner/docs/workflows/codex-quality-gates.md",
        "../codex-flow-runner/prompts/",
      ],
    };
  }

  private parseWorkflowGapAnalysisStageResult(
    stage: Extract<
      SpecFlowStage,
      "spec-ticket-derivation-retrospective" | "spec-workflow-retrospective"
    >,
    outputText: string,
    context: Pick<WorkflowGapAnalysisContext, "inputMode">,
  ): WorkflowGapAnalysisParseResult {
    let parsed: WorkflowGapAnalysisParseResult;
    try {
      parsed = parseWorkflowGapAnalysisOutput(outputText);
    } catch (error) {
      if (error instanceof WorkflowGapAnalysisParserError) {
        throw new RunnerSpecStageContractError(stage, error.message);
      }
      throw error;
    }

    if (parsed.analysis.inputMode !== context.inputMode) {
      throw new RunnerSpecStageContractError(
        stage,
        `workflow-gap-analysis retornou inputMode=${parsed.analysis.inputMode}, mas o contexto exigia ${context.inputMode}.`,
      );
    }

    return {
      analysis: {
        ...parsed.analysis,
        workflowArtifactsConsulted: [...parsed.analysis.workflowArtifactsConsulted],
        followUpTicketPaths: [...parsed.analysis.followUpTicketPaths],
        findings: parsed.analysis.findings.map((finding) => ({
          summary: finding.summary,
          affectedArtifactPaths: [...finding.affectedArtifactPaths],
          requirementRefs: [...finding.requirementRefs],
          evidence: [...finding.evidence],
        })),
        ticketDraft: parsed.analysis.ticketDraft
          ? {
              title: parsed.analysis.ticketDraft.title,
              problemStatement: parsed.analysis.ticketDraft.problemStatement,
              expectedBehavior: parsed.analysis.ticketDraft.expectedBehavior,
              proposedSolution: parsed.analysis.ticketDraft.proposedSolution,
              reproductionSteps: [...parsed.analysis.ticketDraft.reproductionSteps],
              impactFunctional: parsed.analysis.ticketDraft.impactFunctional,
              impactOperational: parsed.analysis.ticketDraft.impactOperational,
              regressionRisk: parsed.analysis.ticketDraft.regressionRisk,
              relevantAssumptionsDefaults: [
                ...parsed.analysis.ticketDraft.relevantAssumptionsDefaults,
              ],
              closureCriteria: [...parsed.analysis.ticketDraft.closureCriteria],
              affectedWorkflowSurfaces: [
                ...parsed.analysis.ticketDraft.affectedWorkflowSurfaces,
              ],
            }
          : null,
      },
      ticketDraftContractError: parsed.ticketDraftContractError,
    };
  }

  private finalizeWorkflowGapAnalysisResult(
    stage: Extract<
      SpecFlowStage,
      "spec-ticket-derivation-retrospective" | "spec-workflow-retrospective"
    >,
    parsed: WorkflowGapAnalysisParseResult,
    activeProject: ProjectRef,
    spec: SpecRef,
    specContent: string,
  ): WorkflowGapAnalysisResult {
    const analysis = parsed.analysis;

    if (!analysis.publicationEligibility) {
      return analysis;
    }

    if (parsed.ticketDraftContractError || analysis.ticketDraft === null) {
      const detail = parsed.ticketDraftContractError
        ? parsed.ticketDraftContractError
        : 'campo obrigatorio "ticketDraft" ausente para publicationEligibility=true.';
      const degraded = createWorkflowGapAnalysisOperationalLimitation({
        inputMode: analysis.inputMode,
        summary:
          "Retrospectiva sistemica identificou backlog elegivel, mas o ticketDraft contratual nao estava publicavel com seguranca.",
        detail: `${activeProject.name}: ${stage} retornou publicationEligibility=true sem ticketDraft valido. ${detail}`,
        followUpTicketPaths: [...analysis.followUpTicketPaths],
        workflowArtifactsConsulted: [...analysis.workflowArtifactsConsulted],
        code: "invalid-analysis-contract",
      });

      this.logger.warn(
        "Retrospectiva sistemica suprimiu publication por ticketDraft ausente ou invalido",
        {
          spec: spec.fileName,
          stage,
          activeProjectName: activeProject.name,
          activeProjectPath: activeProject.path,
          inputMode: analysis.inputMode,
          detail,
        },
      );

      return degraded;
    }

    return {
      ...analysis,
      publicationHandoff: this.buildWorkflowImprovementTicketHandoffFromGapAnalysis(
        stage,
        activeProject,
        spec,
        specContent,
        analysis,
      ),
    };
  }

  private buildWorkflowImprovementTicketHandoffFromGapAnalysis(
    analysisStage: WorkflowImprovementTicketAnalysisStage,
    activeProject: ProjectRef,
    spec: SpecRef,
    specContent: string,
    result: WorkflowGapAnalysisResult,
  ): WorkflowImprovementTicketHandoff {
    if (result.ticketDraft === null) {
      throw new RunnerSpecStageContractError(
        analysisStage,
        "workflow-gap-analysis marcou publicationEligibility=true sem ticketDraft valido.",
      );
    }

    return {
      analysisStage,
      activeProjectName: activeProject.name,
      activeProjectPath: activeProject.path,
      sourceSpecPath: spec.path,
      sourceSpecFileName: spec.fileName,
      sourceSpecTitle: this.extractSpecTitle(specContent, spec.fileName),
      inheritedAssumptionsDefaults: [...result.ticketDraft.relevantAssumptionsDefaults],
      inputMode: result.inputMode,
      analysisSummary: result.summary,
      causalHypothesis: result.causalHypothesis,
      benefitSummary: result.benefitSummary,
      ticketDraft: {
        title: result.ticketDraft.title,
        problemStatement: result.ticketDraft.problemStatement,
        expectedBehavior: result.ticketDraft.expectedBehavior,
        proposedSolution: result.ticketDraft.proposedSolution,
        reproductionSteps: [...result.ticketDraft.reproductionSteps],
        impactFunctional: result.ticketDraft.impactFunctional,
        impactOperational: result.ticketDraft.impactOperational,
        regressionRisk: result.ticketDraft.regressionRisk,
        relevantAssumptionsDefaults: [
          ...result.ticketDraft.relevantAssumptionsDefaults,
        ],
        closureCriteria: [...result.ticketDraft.closureCriteria],
        affectedWorkflowSurfaces: [...result.ticketDraft.affectedWorkflowSurfaces],
      },
      followUpTicketPaths: [...result.followUpTicketPaths],
      workflowArtifactsConsulted: [...result.workflowArtifactsConsulted],
      trace: null,
      findings: result.findings.map((finding) => ({
        summary: finding.summary,
        affectedArtifactPaths: [...finding.affectedArtifactPaths],
        requirementRefs: [...finding.requirementRefs],
        evidence: [...finding.evidence],
      })),
    };
  }

  private attachWorkflowImprovementTraceToHandoff(
    handoff: WorkflowImprovementTicketHandoff,
    traceRecord: WorkflowStageTraceRecord | null,
  ): WorkflowImprovementTicketHandoff {
    return {
      ...handoff,
      ticketDraft: {
        title: handoff.ticketDraft.title,
        problemStatement: handoff.ticketDraft.problemStatement,
        expectedBehavior: handoff.ticketDraft.expectedBehavior,
        proposedSolution: handoff.ticketDraft.proposedSolution,
        reproductionSteps: [...handoff.ticketDraft.reproductionSteps],
        impactFunctional: handoff.ticketDraft.impactFunctional,
        impactOperational: handoff.ticketDraft.impactOperational,
        regressionRisk: handoff.ticketDraft.regressionRisk,
        relevantAssumptionsDefaults: [
          ...handoff.ticketDraft.relevantAssumptionsDefaults,
        ],
        closureCriteria: [...handoff.ticketDraft.closureCriteria],
        affectedWorkflowSurfaces: [...handoff.ticketDraft.affectedWorkflowSurfaces],
      },
      trace: traceRecord
        ? {
            traceId: traceRecord.traceId,
            requestPath: traceRecord.requestPath,
            responsePath: traceRecord.responsePath,
            decisionPath: traceRecord.decisionPath,
          }
        : null,
    };
  }

  private renderWorkflowGapAnalysisTraceSummary(result: WorkflowGapAnalysisResult): string {
    if (result.historicalReference) {
      return `workflow-gap-analysis concluiu com ${result.classification} (${result.confidence}) e reaproveitou referencia historica pre-run-all.`;
    }

    return result.classification === "operational-limitation"
      ? "workflow-gap-analysis concluiu com limitacao operacional nao bloqueante."
      : `workflow-gap-analysis concluiu com ${result.classification} (${result.confidence}).`;
  }

  private buildWorkflowGapAnalysisTraceMetadata(
    result: WorkflowGapAnalysisResult,
  ): Record<string, unknown> {
    return {
      classification: result.classification,
      confidence: result.confidence,
      publicationEligibility: result.publicationEligibility,
      inputMode: result.inputMode,
      summary: result.summary,
      causalHypothesis: result.causalHypothesis,
      benefitSummary: result.benefitSummary,
      findings: result.findings.map((finding) => ({
        summary: finding.summary,
        affectedArtifactPaths: [...finding.affectedArtifactPaths],
        requirementRefs: [...finding.requirementRefs],
        evidence: [...finding.evidence],
      })),
      workflowArtifactsConsulted: [...result.workflowArtifactsConsulted],
      followUpTicketPaths: [...result.followUpTicketPaths],
      limitation: result.limitation
        ? {
            code: result.limitation.code,
            detail: result.limitation.detail,
          }
        : null,
      historicalReference: result.historicalReference
        ? {
            summary: result.historicalReference.summary,
            ticketPath: result.historicalReference.ticketPath,
            findingFingerprints: [...result.historicalReference.findingFingerprints],
          }
        : null,
      ticketDraft: result.ticketDraft
        ? {
            title: result.ticketDraft.title,
            problemStatement: result.ticketDraft.problemStatement,
            expectedBehavior: result.ticketDraft.expectedBehavior,
            proposedSolution: result.ticketDraft.proposedSolution,
            reproductionSteps: [...result.ticketDraft.reproductionSteps],
            impactFunctional: result.ticketDraft.impactFunctional,
            impactOperational: result.ticketDraft.impactOperational,
            regressionRisk: result.ticketDraft.regressionRisk,
            relevantAssumptionsDefaults: [
              ...result.ticketDraft.relevantAssumptionsDefaults,
            ],
            closureCriteria: [...result.ticketDraft.closureCriteria],
            affectedWorkflowSurfaces: [
              ...result.ticketDraft.affectedWorkflowSurfaces,
            ],
          }
        : null,
      publicationHandoff: result.publicationHandoff
        ? {
            analysisStage: result.publicationHandoff.analysisStage,
            sourceSpecPath: result.publicationHandoff.sourceSpecPath,
            inputMode: result.publicationHandoff.inputMode,
            ticketDraft: {
              title: result.publicationHandoff.ticketDraft.title,
              problemStatement: result.publicationHandoff.ticketDraft.problemStatement,
              expectedBehavior: result.publicationHandoff.ticketDraft.expectedBehavior,
              proposedSolution: result.publicationHandoff.ticketDraft.proposedSolution,
              reproductionSteps: [
                ...result.publicationHandoff.ticketDraft.reproductionSteps,
              ],
              impactFunctional: result.publicationHandoff.ticketDraft.impactFunctional,
              impactOperational: result.publicationHandoff.ticketDraft.impactOperational,
              regressionRisk: result.publicationHandoff.ticketDraft.regressionRisk,
              relevantAssumptionsDefaults: [
                ...result.publicationHandoff.ticketDraft.relevantAssumptionsDefaults,
              ],
              closureCriteria: [
                ...result.publicationHandoff.ticketDraft.closureCriteria,
              ],
              affectedWorkflowSurfaces: [
                ...result.publicationHandoff.ticketDraft.affectedWorkflowSurfaces,
              ],
            },
            workflowArtifactsConsulted: [
              ...result.publicationHandoff.workflowArtifactsConsulted,
            ],
            trace: result.publicationHandoff.trace
              ? {
                  traceId: result.publicationHandoff.trace.traceId,
                  requestPath: result.publicationHandoff.trace.requestPath,
                  responsePath: result.publicationHandoff.trace.responsePath,
                  decisionPath: result.publicationHandoff.trace.decisionPath,
                }
              : null,
            findings: result.publicationHandoff.findings.map((finding) => ({
              summary: finding.summary,
              affectedArtifactPaths: [...finding.affectedArtifactPaths],
              requirementRefs: [...finding.requirementRefs],
            })),
          }
        : null,
    };
  }

  private convertWorkflowGapAnalysisFailureToOperationalLimitation(
    params: {
      error: unknown;
      stage: Extract<
        SpecFlowStage,
        "spec-ticket-derivation-retrospective" | "spec-workflow-retrospective"
      >;
      spec: SpecRef;
      activeProject: ProjectRef;
      inputMode: WorkflowGapAnalysisInputMode;
      workflowArtifactsConsulted: string[];
      summary: string;
    },
  ): WorkflowGapAnalysisResult {
    const details = params.error instanceof Error ? params.error.message : String(params.error);
    const code =
      params.error instanceof RunnerSpecStageContractError
        ? "invalid-analysis-contract"
        : "analysis-execution-failed";

    return createWorkflowGapAnalysisOperationalLimitation({
      inputMode: params.inputMode,
      summary: `${params.summary} (${params.spec.fileName}).`,
      detail: `${params.activeProject.name}: ${details}`,
      followUpTicketPaths: [],
      workflowArtifactsConsulted: [...params.workflowArtifactsConsulted],
      code,
    });
  }

  private collectSpecTicketValidationAutoCorrectArtifactPaths(
    projectPath: string,
    spec: SpecRef,
    gaps: readonly SpecTicketValidationGap[],
  ): string[] {
    const allowed = new Set<string>();

    for (const gap of gaps) {
      if (!gap.isAutoCorrectable) {
        continue;
      }

      for (const artifactPath of gap.affectedArtifactPaths) {
        const normalized = this.normalizeRepositoryPathReference(projectPath, artifactPath);
        if (!normalized || normalized === spec.path || !normalized.startsWith("tickets/open/")) {
          continue;
        }

        const absolutePath = this.resolveProjectRelativePath(projectPath, normalized);
        const relativeFromProject = path.relative(projectPath, absolutePath);
        if (!relativeFromProject || relativeFromProject.startsWith("..") || path.isAbsolute(relativeFromProject)) {
          continue;
        }

        allowed.add(normalized);
      }
    }

    return [...allowed].sort((left, right) => left.localeCompare(right, "pt-BR"));
  }

  private async captureSpecTicketValidationArtifactSnapshots(
    projectPath: string,
    relativePaths: readonly string[],
  ): Promise<SpecTicketValidationArtifactSnapshot[]> {
    return Promise.all(
      relativePaths.map(async (relativePath) => {
        const absolutePath = this.resolveProjectRelativePath(projectPath, relativePath);
        try {
          return {
            relativePath,
            absolutePath,
            content: await fs.readFile(absolutePath, "utf8"),
          } satisfies SpecTicketValidationArtifactSnapshot;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return {
              relativePath,
              absolutePath,
              content: null,
            } satisfies SpecTicketValidationArtifactSnapshot;
          }

          const details = error instanceof Error ? error.message : String(error);
          throw new Error(
            `Falha ao capturar snapshot de ${relativePath} antes da autocorrecao do gate: ${details}`,
          );
        }
      }),
    );
  }

  private async restoreSpecTicketValidationArtifactSnapshots(
    snapshots: readonly SpecTicketValidationArtifactSnapshot[],
  ): Promise<void> {
    for (const snapshot of snapshots) {
      if (snapshot.content === null) {
        await fs.rm(snapshot.absolutePath, { force: true }).catch(() => undefined);
        continue;
      }

      await fs.mkdir(path.dirname(snapshot.absolutePath), { recursive: true });
      await fs.writeFile(snapshot.absolutePath, snapshot.content, "utf8");
    }
  }

  private async publishWorkflowImprovementTicketIfNeeded(
    activeProject: ProjectRef,
    spec: SpecRef,
    handoff: WorkflowImprovementTicketHandoff,
  ): Promise<WorkflowImprovementTicketPublicationResult | undefined> {
    const candidate = this.buildWorkflowImprovementTicketCandidate(handoff);
    const targetRepoKind =
      activeProject.name === "codex-flow-runner" ? "current-project" : "workflow-sibling";
    const targetRepoPath =
      targetRepoKind === "current-project"
        ? activeProject.path
        : path.resolve(activeProject.path, "..", "codex-flow-runner");
    const targetRepoDisplayPath = targetRepoKind === "current-project" ? "." : "../codex-flow-runner";

    if (this.workflowImprovementTicketPublisher === null) {
      const publication: WorkflowImprovementTicketPublicationResult = {
        status: "operational-limitation",
        targetRepoKind,
        targetRepoPath,
        targetRepoDisplayPath,
        ticketFileName: null,
        ticketPath: null,
        detail: "Workflow improvement ticket publisher nao configurado no runner.",
        limitationCode: "unexpected-error",
        commitHash: null,
        pushUpstream: null,
        commitPushId: null,
        gapFingerprints: [...candidate.gapFingerprints],
      };

      this.logger.warn("Ticket transversal de workflow nao pode ser publicado por configuracao ausente", {
        spec: spec.fileName,
        sourceSpecPath: handoff.sourceSpecPath,
        activeProjectName: activeProject.name,
        activeProjectPath: activeProject.path,
      });

      return publication;
    }

    try {
      const publication = await this.workflowImprovementTicketPublisher.publish(candidate);
      const logContext = {
        spec: spec.fileName,
        sourceSpecPath: candidate.sourceSpecPath,
        sourceRequirements: candidate.sourceRequirements,
        activeProjectName: activeProject.name,
        activeProjectPath: activeProject.path,
        publicationStatus: publication.status,
        targetRepoKind: publication.targetRepoKind,
        targetRepoPath: publication.targetRepoPath,
        targetRepoDisplayPath: publication.targetRepoDisplayPath,
        ticketPath: publication.ticketPath,
        commitPushId: publication.commitPushId,
        limitationCode: publication.limitationCode,
      };

      if (publication.status === "operational-limitation") {
        this.logger.warn("Ticket transversal de workflow registrou limitacao operacional", {
          ...logContext,
          analysisStage: candidate.analysisStage,
          traceId: candidate.trace?.traceId ?? null,
          detail: publication.detail,
        });
      } else {
        this.logger.info("Ticket transversal de workflow processado", {
          ...logContext,
          analysisStage: candidate.analysisStage,
          traceId: candidate.trace?.traceId ?? null,
          detail: publication.detail,
        });
      }

      return publication;
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      const publication: WorkflowImprovementTicketPublicationResult = {
        status: "operational-limitation",
        targetRepoKind,
        targetRepoPath,
        targetRepoDisplayPath,
        ticketFileName: null,
        ticketPath: null,
        detail: `Falha inesperada ao publicar ticket transversal de workflow: ${details}`,
        limitationCode: "unexpected-error",
        commitHash: null,
        pushUpstream: null,
        commitPushId: null,
        gapFingerprints: [...candidate.gapFingerprints],
      };

      this.logger.warn("Ticket transversal de workflow falhou de forma inesperada", {
        spec: spec.fileName,
        activeProjectName: activeProject.name,
        activeProjectPath: activeProject.path,
        error: details,
      });

      return publication;
    }
  }

  private buildWorkflowImprovementTicketCandidate(
    handoff: WorkflowImprovementTicketHandoff,
  ): WorkflowImprovementTicketCandidate {
    const findings = handoff.findings.map((finding) => ({
      fingerprint: buildWorkflowImprovementTicketFindingFingerprint(finding),
      summary: finding.summary,
      affectedArtifactPaths: this.sortUniqueStrings([...finding.affectedArtifactPaths]),
      requirementRefs: this.sortUniqueStrings([...finding.requirementRefs]),
      evidence: this.sortUniqueStrings([...finding.evidence]),
    }));
    return {
      analysisStage: handoff.analysisStage,
      activeProjectName: handoff.activeProjectName,
      activeProjectPath: handoff.activeProjectPath,
      sourceSpecPath: handoff.sourceSpecPath,
      sourceSpecFileName: handoff.sourceSpecFileName,
      sourceSpecTitle: handoff.sourceSpecTitle,
      sourceRequirements: this.sortUniqueStrings(findings.flatMap((finding) => finding.requirementRefs)),
      inheritedAssumptionsDefaults: this.sortUniqueStrings([
        ...handoff.inheritedAssumptionsDefaults,
      ]),
      inputMode: handoff.inputMode,
      analysisSummary: handoff.analysisSummary,
      causalHypothesis: handoff.causalHypothesis,
      benefitSummary: handoff.benefitSummary,
      ticketDraft: {
        title: handoff.ticketDraft.title,
        problemStatement: handoff.ticketDraft.problemStatement,
        expectedBehavior: handoff.ticketDraft.expectedBehavior,
        proposedSolution: handoff.ticketDraft.proposedSolution,
        reproductionSteps: this.sortUniqueStrings([
          ...handoff.ticketDraft.reproductionSteps,
        ]),
        impactFunctional: handoff.ticketDraft.impactFunctional,
        impactOperational: handoff.ticketDraft.impactOperational,
        regressionRisk: handoff.ticketDraft.regressionRisk,
        relevantAssumptionsDefaults: this.sortUniqueStrings([
          ...handoff.ticketDraft.relevantAssumptionsDefaults,
        ]),
        closureCriteria: this.sortUniqueStrings([
          ...handoff.ticketDraft.closureCriteria,
        ]),
        affectedWorkflowSurfaces: this.sortUniqueStrings([
          ...handoff.ticketDraft.affectedWorkflowSurfaces,
        ]),
      },
      followUpTicketPaths: this.sortUniqueStrings([...handoff.followUpTicketPaths]),
      workflowArtifactsConsulted: this.sortUniqueStrings([...handoff.workflowArtifactsConsulted]),
      trace: handoff.trace
        ? {
            traceId: handoff.trace.traceId,
            requestPath: handoff.trace.requestPath,
            responsePath: handoff.trace.responsePath,
            decisionPath: handoff.trace.decisionPath,
          }
        : null,
      findings,
      gapFingerprints: findings.map((finding) => finding.fingerprint),
    };
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
      cycleHistory: result.snapshots.map((snapshot) => ({
        cycleNumber: snapshot.cycleNumber,
        phase: snapshot.phase,
        threadId: snapshot.threadId,
        verdict: snapshot.turnResult.verdict,
        confidence: snapshot.turnResult.confidence,
        summary: snapshot.turnResult.summary,
        openGapFingerprints: [...snapshot.openGapFingerprints],
        appliedCorrections: snapshot.appliedCorrections.map((correction) => ({
          description: correction.description,
          affectedArtifactPaths: [...correction.affectedArtifactPaths],
          linkedGapTypes: [...correction.linkedGapTypes],
          outcome: correction.outcome,
        })),
        realGapReductionFromPrevious: snapshot.realGapReductionFromPrevious,
      })),
    };
  }

  private buildRunSpecsTicketValidationSummaryFromPartialExecution(partialResult: {
    cyclesExecuted: number;
    snapshots: Array<{
      cycleNumber: number;
      phase: RunSpecsTicketValidationSummary["cycleHistory"][number]["phase"];
      threadId: string;
      turnResult: {
        verdict: RunSpecsTicketValidationSummary["verdict"];
        confidence: RunSpecsTicketValidationSummary["confidence"];
        summary: string;
        gaps: SpecTicketValidationGap[];
      };
      appliedCorrections: SpecTicketValidationAppliedCorrection[];
      openGapFingerprints: string[];
      realGapReductionFromPrevious: boolean | null;
    }>;
    validationThreadId: string | null;
  }): RunSpecsTicketValidationSummary {
    const lastSnapshot = partialResult.snapshots[partialResult.snapshots.length - 1];
    if (!lastSnapshot) {
      throw new Error("Resumo parcial de spec-ticket-validation exige ao menos um snapshot.");
    }

    const cycleHistory = partialResult.snapshots.map((snapshot) => ({
      cycleNumber: snapshot.cycleNumber,
      phase: snapshot.phase,
      threadId: snapshot.threadId,
      verdict: snapshot.turnResult.verdict,
      confidence: snapshot.turnResult.confidence,
      summary: snapshot.turnResult.summary,
      openGapFingerprints: [...snapshot.openGapFingerprints],
      appliedCorrections: snapshot.appliedCorrections.map((correction) => ({
        description: correction.description,
        affectedArtifactPaths: [...correction.affectedArtifactPaths],
        linkedGapTypes: [...correction.linkedGapTypes],
        outcome: correction.outcome,
      })),
      realGapReductionFromPrevious: snapshot.realGapReductionFromPrevious,
    }));

    return {
      verdict: lastSnapshot.turnResult.verdict,
      confidence: lastSnapshot.turnResult.confidence,
      finalReason: "technical-failure-partial-history",
      cyclesExecuted: partialResult.cyclesExecuted,
      validationThreadId: partialResult.validationThreadId,
      triageContextInherited: false,
      summary: lastSnapshot.turnResult.summary,
      gaps: lastSnapshot.turnResult.gaps.map((gap) => ({
        gapType: gap.gapType,
        summary: gap.summary,
        affectedArtifactPaths: [...gap.affectedArtifactPaths],
        requirementRefs: [...gap.requirementRefs],
        evidence: [...gap.evidence],
        probableRootCause: gap.probableRootCause,
        isAutoCorrectable: gap.isAutoCorrectable,
      })),
      appliedCorrections: cycleHistory.flatMap((cycle) =>
        cycle.appliedCorrections.map((correction) => ({
          description: correction.description,
          affectedArtifactPaths: [...correction.affectedArtifactPaths],
          linkedGapTypes: [...correction.linkedGapTypes],
          outcome: correction.outcome,
        })),
      ),
      finalOpenGapFingerprints: [...lastSnapshot.openGapFingerprints],
      cycleHistory,
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
            cycleHistory: summary.cycleHistory.map((cycle) => ({
              cycleNumber: cycle.cycleNumber,
              phase: cycle.phase,
              threadId: cycle.threadId,
              verdict: cycle.verdict,
              confidence: cycle.confidence,
              summary: cycle.summary,
              openGapFingerprints: [...cycle.openGapFingerprints],
              appliedCorrections: cycle.appliedCorrections.map((correction) => ({
                description: correction.description,
                affectedArtifactPaths: [...correction.affectedArtifactPaths],
                linkedGapTypes: [...correction.linkedGapTypes],
                outcome: correction.outcome,
              })),
              realGapReductionFromPrevious: cycle.realGapReductionFromPrevious,
            })),
          }
        : {}),
      ticketCount: packageContext.tickets.length,
      ticketPaths: packageContext.tickets.map((ticket) => ticket.relativePath),
      lineageSource: packageContext.lineageSource,
    };
  }

  private buildRunSpecsTraceMetadata(
    slot: ActiveRunnerSlot,
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (slot.kind !== "run-specs" || !slot.runSpecsSourceCommand || !slot.runSpecsEntryPoint) {
      return metadata;
    }

    return {
      sourceCommand: slot.runSpecsSourceCommand,
      entryPoint: slot.runSpecsEntryPoint,
      ...(metadata ?? {}),
    };
  }

  private buildSpecTicketDerivationRetrospectiveTraceMetadata(
    summary: RunSpecsDerivationRetrospectiveSummary,
  ): Record<string, unknown> {
    return {
      decision: summary.decision,
      summary: summary.summary,
      reviewedGapHistoryDetected: summary.reviewedGapHistoryDetected,
      structuredInputAvailable: summary.structuredInputAvailable,
      functionalVerdict: summary.functionalVerdict,
      analysis: summary.analysis
        ? this.buildWorkflowGapAnalysisTraceMetadata(summary.analysis)
        : null,
      workflowImprovementTicket: summary.workflowImprovementTicket
        ? {
            status: summary.workflowImprovementTicket.status,
            targetRepoKind: summary.workflowImprovementTicket.targetRepoKind,
            targetRepoDisplayPath: summary.workflowImprovementTicket.targetRepoDisplayPath,
            ticketPath: summary.workflowImprovementTicket.ticketPath,
            limitationCode: summary.workflowImprovementTicket.limitationCode,
          }
        : null,
    };
  }

  private async persistSpecTicketDerivationRetrospectiveExecutionIfAllowed(params: {
    project: ProjectRef;
    spec: SpecRef;
    summary: RunSpecsDerivationRetrospectiveSummary;
  }): Promise<void> {
    if (params.project.name !== "codex-flow-runner") {
      return;
    }

    try {
      await this.persistSpecTicketDerivationRetrospectiveExecution({
        projectPath: params.project.path,
        spec: params.spec,
        summary: params.summary,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        "Falha ao persistir a retrospectiva sistemica da derivacao na spec corrente",
        {
          spec: params.spec.fileName,
          specPath: params.spec.path,
          activeProjectName: params.project.name,
          activeProjectPath: params.project.path,
          error: details,
        },
      );
    }
  }

  private async persistSpecTicketDerivationRetrospectiveExecution(params: {
    projectPath: string;
    spec: SpecRef;
    summary: RunSpecsDerivationRetrospectiveSummary;
  }): Promise<void> {
    const specAbsolutePath = this.resolveProjectRelativePath(params.projectPath, params.spec.path);
    let originalContent = "";
    try {
      originalContent = await fs.readFile(specAbsolutePath, "utf8");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao reler spec ${params.spec.path} antes de persistir a retrospectiva da derivacao: ${details}`,
      );
    }

    const nextSectionBody = this.renderSpecTicketDerivationRetrospectiveSection(params.summary);
    const nextContent = this.replaceTopLevelSectionContent(
      originalContent,
      "Retrospectiva sistemica da derivacao dos tickets",
      nextSectionBody,
    );

    if (nextContent === originalContent) {
      return;
    }

    const tempPath = `${specAbsolutePath}.spec-ticket-derivation-retrospective.tmp`;
    try {
      await fs.writeFile(tempPath, nextContent, "utf8");
      await fs.rename(tempPath, specAbsolutePath);
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      await fs.writeFile(specAbsolutePath, originalContent, "utf8").catch(() => undefined);
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao persistir a secao \`Retrospectiva sistemica da derivacao dos tickets\` em ${params.spec.path}: ${details}`,
      );
    }
  }

  private renderSpecTicketDerivationRetrospectiveSection(
    summary: RunSpecsDerivationRetrospectiveSummary,
  ): string {
    const analysis = summary.analysis;
    const lines = [
      `- Executada: ${summary.decision === "executed" ? "sim" : "nao"}`,
      `- Motivo de ativacao ou skip: ${this.describeSpecTicketDerivationRetrospectiveDecision(summary)}`,
      `- Classificacao final: ${analysis?.classification ?? "n/a"}`,
      `- Confianca: ${analysis?.confidence ?? "n/a"}`,
      `- Frente causal analisada: ${analysis?.causalHypothesis ?? "n/a"}`,
      "- Achados sistemicos:",
      ...this.renderSpecTicketDerivationRetrospectiveFindings(analysis),
      "- Artefatos do workflow consultados:",
      ...this.renderSpecTicketDerivationRetrospectiveWorkflowArtifacts(analysis),
      `- Elegibilidade de publicacao: ${analysis ? (analysis.publicationEligibility ? "sim" : "nao") : "n/a"}`,
      "- Resultado do ticket transversal ou limitacao operacional:",
      ...this.renderSpecTicketDerivationRetrospectiveResultLines(summary),
      "- Nota de uso: quando esta spec vier de `/run_specs`, esta secao deve registrar a retrospectiva pre-run-all como superficie distinta do gate funcional. Se a execucao ocorrer no proprio `codex-flow-runner`, write-back nesta secao e permitido. Em projeto externo, a fonte observavel desta fase e trace/log/resumo, e nao a spec do projeto alvo.",
      "- Politica anti-duplicacao: a retrospectiva sistemica pos-`spec-audit` pode referenciar achados ou tickets desta etapa como contexto historico, mas nao deve reavaliar nem reticketar a mesma frente causal.",
    ];

    return lines.join("\n");
  }

  private describeSpecTicketDerivationRetrospectiveDecision(
    summary: RunSpecsDerivationRetrospectiveSummary,
  ): string {
    if (summary.decision === "executed") {
      return "executada porque o gate funcional revisou gaps em pelo menos um ciclo.";
    }

    if (summary.decision === "skipped-no-reviewed-gaps") {
      return "pulada porque o gate funcional nao revisou gaps em nenhum ciclo.";
    }

    return "pulada porque o gate funcional falhou antes de produzir insumos estruturados suficientes.";
  }

  private renderSpecTicketDerivationRetrospectiveFindings(
    analysis: WorkflowGapAnalysisResult | undefined,
  ): string[] {
    if (!analysis) {
      return ["  - n/a"];
    }

    if (analysis.findings.length === 0) {
      return ["  - nenhum"];
    }

    return analysis.findings.map((finding) => {
      const requirementSuffix =
        finding.requirementRefs.length > 0 ? ` [${finding.requirementRefs.join(", ")}]` : "";
      return `  - ${finding.summary}${requirementSuffix}`;
    });
  }

  private renderSpecTicketDerivationRetrospectiveWorkflowArtifacts(
    analysis: WorkflowGapAnalysisResult | undefined,
  ): string[] {
    if (!analysis) {
      return ["  - n/a"];
    }

    if (analysis.workflowArtifactsConsulted.length === 0) {
      return ["  - nenhum"];
    }

    return analysis.workflowArtifactsConsulted.map((artifactPath) => `  - ${artifactPath}`);
  }

  private renderSpecTicketDerivationRetrospectiveResultLines(
    summary: RunSpecsDerivationRetrospectiveSummary,
  ): string[] {
    if (summary.workflowImprovementTicket) {
      return this.renderWorkflowImprovementTicketLines(summary.workflowImprovementTicket).map(
        (line) => `  ${line}`,
      );
    }

    if (summary.analysis?.limitation) {
      return [
        `  - Limitacao: ${summary.analysis.limitation.code}`,
        `    - Detalhe: ${summary.analysis.limitation.detail}`,
      ];
    }

    if (summary.analysis) {
      return ["  - Nenhum ticket transversal publicado nesta rodada."];
    }

    return ["  - n/a"];
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
      "#### Historico por ciclo",
      ...params.summary.cycleHistory.flatMap((cycle) => {
        const reductionLabel =
          cycle.realGapReductionFromPrevious === null
            ? "n/a"
            : cycle.realGapReductionFromPrevious
              ? "sim"
              : "nao";

        return [
          `- Ciclo ${cycle.cycleNumber} [${cycle.phase}]: ${cycle.verdict} (${cycle.confidence})`,
          `  - Resumo: ${cycle.summary}`,
          `  - Thread: ${cycle.threadId}`,
          `  - Fingerprints abertos: ${cycle.openGapFingerprints.join(", ") || "nenhum"}`,
          `  - Reducao real de gaps vs. ciclo anterior: ${reductionLabel}`,
          `  - Correcoes deste ciclo: ${cycle.appliedCorrections.length}`,
          ...(cycle.appliedCorrections.length === 0
            ? []
            : cycle.appliedCorrections.map(
                (correction) =>
                  `    - ${correction.description} [${correction.outcome}]`,
              )),
        ];
      }),
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

  private normalizeSpecRelativeRepositoryPath(specPath: string, reference: string): string {
    const normalizedReference = reference.trim().replace(/^`|`$/gu, "").replace(/\\/gu, "/");
    if (!normalizedReference) {
      return normalizedReference;
    }

    if (path.posix.isAbsolute(normalizedReference)) {
      return path.posix.normalize(normalizedReference);
    }

    if (!normalizedReference.startsWith(".")) {
      return path.posix.normalize(normalizedReference);
    }

    return path.posix.normalize(path.posix.join(path.posix.dirname(specPath), normalizedReference));
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

  private extractSpecTitle(specContent: string, fallback: string): string {
    const match = specContent.match(/^#\s+\[SPEC\]\s+(.+?)\s*$/imu);
    return match?.[1]?.trim() || fallback;
  }

  private extractTopLevelBulletItems(content: string, heading: string): string[] {
    const sectionContent = this.extractTopLevelSectionContent(content, heading);
    if (!sectionContent) {
      return [];
    }

    return this.extractBulletItemsFromSectionContent(sectionContent);
  }

  private extractTopLevelBulletItemsFromHeadings(
    content: string,
    headings: readonly string[],
  ): string[] {
    for (const heading of headings) {
      const sectionContent = this.extractTopLevelSectionContent(content, heading);
      if (sectionContent !== null) {
        return this.extractBulletItemsFromSectionContent(sectionContent);
      }
    }

    return [];
  }

  private extractBulletItemsFromSectionContent(sectionContent: string): string[] {
    return sectionContent
      .split(/\r?\n/gu)
      .map((line) => line.match(/^\s*-\s+(.+?)\s*$/u)?.[1]?.trim() ?? null)
      .filter((value): value is string => value !== null && value.length > 0);
  }

  private sortUniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
  }

  private renderWorkflowImprovementTicketLines(
    result: WorkflowImprovementTicketPublicationResult,
  ): string[] {
    const lines = [`- Resultado do ticket transversal: ${result.status}`, `  - Detalhe: ${result.detail}`];

    if (result.targetRepoDisplayPath) {
      lines.push(`  - Repositorio alvo: ${result.targetRepoDisplayPath}`);
    }
    if (result.ticketPath) {
      lines.push(`  - Ticket: ${result.ticketPath}`);
    }
    if (result.commitPushId) {
      lines.push(`  - Commit/push: ${result.commitPushId}`);
    }
    if (result.limitationCode) {
      lines.push(`  - Limitacao: ${result.limitationCode}`);
    }

    return lines;
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

    const markdownLinkTarget = normalized.match(/^\[[^\]]+?\]\((.+?)\)$/u)?.[1]?.trim();
    return markdownLinkTarget || normalized;
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
    const closedAtUtc = this.normalizeTicketMetadataValue(
      ticketContent.match(TICKET_CLOSED_AT_METADATA_PATTERN)?.[1],
    );
    const relatedChangeset = this.normalizeTicketMetadataValue(
      ticketContent.match(TICKET_RELATED_CHANGESET_METADATA_PATTERN)?.[1],
    );
    const followUpTicketPath = this.normalizeTicketReference(
      this.normalizeTicketMetadataValue(ticketContent.match(TICKET_FOLLOW_UP_METADATA_PATTERN)?.[1]),
    );

    return {
      status: status?.toLowerCase() ?? null,
      parentTicketPath,
      closureReason: closureReason?.toLowerCase() ?? null,
      closedAtUtc,
      relatedChangeset,
      followUpTicketPath,
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
    let lastProcessedTicket: string | undefined;
    const finalizeRound = async (params: {
      outcome: RunAllFlowSummary["outcome"];
      finalStage: RunAllFinalStage;
      completionReason: RunAllCompletionReason;
      lastProcessedTicket?: string;
      selectionTicket?: string;
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
        lastProcessedTicket: params.lastProcessedTicket,
        selectionTicket: params.selectionTicket,
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
          lastProcessedTicket,
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
        const backlogSnapshot = await this.describeOpenTicketBacklog(slot.queue);
        const nextBlockedTicket = backlogSnapshot?.blockedTickets.at(0);
        slot.isRunning = false;
        if (nextBlockedTicket) {
          this.touchSlot(
            slot,
            "idle",
            "Rodada /run-all finalizada: restam apenas tickets blocked fora da fila automatica",
          );
          this.logger.info("Rodada /run-all finalizada com backlog apenas bloqueado", {
            processedTicketsCount: processedTickets.size,
            blockedTicketsCount: backlogSnapshot?.blockedTickets.length ?? 0,
            nextBlockedTicket: nextBlockedTicket.name,
            durationMs: this.buildFlowTimingSnapshot(roundTimingCollector).totalDurationMs,
            activeProjectName: slot.project.name,
            activeProjectPath: slot.project.path,
          });
          return finalizeRound({
            outcome: "success",
            finalStage: "select-ticket",
            completionReason: "blocked-tickets-only",
            lastProcessedTicket,
            selectionTicket: nextBlockedTicket.name,
            details:
              "Restam apenas tickets com `Status: blocked`; a fila automatica nao os consome ate desbloqueio manual.",
          });
        }

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
          lastProcessedTicket,
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
          lastProcessedTicket: ticket.name,
          selectionTicket: ticket.name,
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
          lastProcessedTicket,
          selectionTicket: ticket.name,
          details:
            `Ticket ${ticket.name} excedeu o limite de ${MAX_NO_GO_RECOVERIES_PER_TICKET} recuperacoes de NO_GO.`,
        });
      }

      const ticketProcessing = await this.processTicketInSlot(slot, ticket);
      const ticketSummary = ticketProcessing.finalSummary;
      const succeeded = ticketProcessing.succeeded;
      processedTickets.add(ticket.name);
      lastProcessedTicket = ticket.name;
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
          lastProcessedTicket: ticket.name,
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
      lastProcessedTicket,
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
      runSpecsSourceCommand: null,
      runSpecsEntryPoint: null,
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
    const shouldValidateCloseArtifacts = await this.pathExists(ticket.openPath);
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
      if (shouldValidateCloseArtifacts) {
        await this.validateCloseAndVersionArtifacts(
          slot,
          ticket,
          closeAndVersionResult.diagnostics,
        );
      }
      await this.commitCloseAndVersion(
        slot,
        ticket,
        execPlanPath,
        closeAndVersionResult.diagnostics,
      );
      const syncEvidence = await this.assertCloseAndVersionGitSync(
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

  private async validateCloseAndVersionArtifacts(
    slot: ActiveRunnerSlot,
    ticket: TicketRef,
    diagnostics?: CodexStageDiagnostics,
  ): Promise<void> {
    const validationIssues: string[] = [];
    const openPathStillExists = await this.pathExists(ticket.openPath);
    if (openPathStillExists) {
      validationIssues.push("o arquivo ainda permanece em `tickets/open/` apos close-and-version");
    }

    let closedTicketContent = "";
    try {
      closedTicketContent = await fs.readFile(ticket.closedPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        validationIssues.push("o ticket nao foi encontrado em `tickets/closed/` apos close-and-version");
      } else {
        throw error;
      }
    }

    if (closedTicketContent) {
      const metadata = this.parseTicketLineageMetadata(closedTicketContent);
      if (metadata.status !== "closed") {
        validationIssues.push("a metadata obrigatoria `Status: closed` nao foi gravada no ticket fechado");
      }
      if (!metadata.closedAtUtc) {
        validationIssues.push("a metadata obrigatoria `Closed at (UTC)` nao foi preenchida");
      }
      if (!metadata.closureReason || !VALID_TICKET_CLOSURE_REASONS.has(metadata.closureReason)) {
        validationIssues.push("a metadata `Closure reason` esta ausente ou fora da taxonomia permitida");
      }
      if (!metadata.relatedChangeset) {
        validationIssues.push("a metadata obrigatoria `Related PR/commit/execplan` nao foi preenchida");
      }

      if (metadata.closureReason === "split-follow-up") {
        if (!metadata.followUpTicketPath) {
          validationIssues.push(
            "o fechamento `split-follow-up` nao declarou `Follow-up ticket` no ticket fechado",
          );
        } else {
          const resolvedFollowUp = await this.resolveTicketReference(
            slot.project.path,
            metadata.followUpTicketPath,
          );
          if (!resolvedFollowUp) {
            validationIssues.push(
              `o follow-up declarado (${metadata.followUpTicketPath}) nao foi encontrado no projeto`,
            );
          } else {
            const normalizedOpenDir = `${path.normalize(path.join(slot.project.path, "tickets", "open"))}${path.sep}`;
            const normalizedResolvedPath = path.normalize(resolvedFollowUp.path);
            if (!normalizedResolvedPath.startsWith(normalizedOpenDir)) {
              validationIssues.push(
                `o follow-up declarado (${metadata.followUpTicketPath}) nao aponta para \`tickets/open/\``,
              );
            }
          }
        }
      }
    }

    if (validationIssues.length === 0) {
      return;
    }

    const details = `Validacao pos-close-and-version falhou: ${validationIssues.join("; ")}.`;
    this.logger.error("Validacao estrutural do ticket falhou apos close-and-version", {
      ticket: ticket.name,
      openPath: ticket.openPath,
      closedPath: ticket.closedPath,
      validationIssues,
      ...this.buildCloseAndVersionFailureHintLogContext(diagnostics),
      ...this.buildCodexDiagnosticsLogContext(diagnostics),
    });
    throw new CodexStageExecutionError(ticket.name, "close-and-version", details);
  }

  private async assertCloseAndVersionGitSync(
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

  private async describeOpenTicketBacklog(
    queue: TicketQueue,
  ): Promise<TicketBacklogSnapshot | null> {
    const maybeQueue = queue as TicketQueue & {
      describeOpenBacklog?: () => Promise<TicketBacklogSnapshot>;
    };
    if (typeof maybeQueue.describeOpenBacklog !== "function") {
      return null;
    }

    return maybeQueue.describeOpenBacklog();
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.stat(targetPath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
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
    stage: Extract<
      SpecFlowStage,
      | "spec-triage"
      | "spec-ticket-derivation-retrospective"
      | "spec-close-and-version"
      | "spec-audit"
      | "spec-workflow-retrospective"
    >,
    spec: SpecRef,
    message: string,
    options?: {
      validateResult?: (
        result: CodexStageResult,
      ) => Promise<SpecStageTraceValidation | void> | SpecStageTraceValidation | void;
    },
  ): Promise<RunnerSpecStageResult> {
    const stageStartedAt = Date.now();
    const phase: RunnerState["phase"] = stage;
    this.touchSlot(slot, phase, message);

    try {
      const result = await slot.codexClient.runSpecStage(stage, spec);
      let traceValidation: SpecStageTraceValidation | undefined;
      try {
        traceValidation = (await options?.validateResult?.(result)) ?? undefined;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.recordWorkflowTraceSuccess(slot, {
          kind: "spec",
          stage,
          targetName: spec.fileName,
          targetPath: spec.path,
          promptTemplatePath: result.promptTemplatePath,
          promptText: result.promptText,
          outputText: result.output,
          diagnostics: result.diagnostics,
          summary: `Etapa ${stage} falhou ao validar o contrato retornado.`,
          decisionStatus: "failure",
          decisionErrorMessage: errorMessage,
        });
        throw error;
      }
      this.logger.info("Etapa de spec concluida no runner", {
        spec: spec.fileName,
        specPath: spec.path,
        stage,
        durationMs: Date.now() - stageStartedAt,
        activeProjectName: slot.project.name,
        activeProjectPath: slot.project.path,
      });
      const traceRecord = await this.recordWorkflowTraceSuccess(slot, {
        kind: "spec",
        stage,
        targetName: spec.fileName,
        targetPath: spec.path,
        promptTemplatePath: result.promptTemplatePath,
        promptText: result.promptText,
        outputText: result.output,
        diagnostics: result.diagnostics,
        summary: traceValidation?.summary ?? `Etapa ${stage} concluida com sucesso no runner.`,
        metadata: traceValidation?.metadata,
      });

      return {
        ...result,
        traceRecord,
      };
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
  ): Promise<WorkflowStageTraceRecord | null> {
    return this.recordWorkflowTrace(slot, {
      ...request,
      decisionStatus: request.decisionStatus ?? "success",
    });
  }

  private async recordWorkflowTraceFailure(
    slot: ActiveRunnerSlot,
    request: WorkflowTraceFailureRequest,
  ): Promise<WorkflowStageTraceRecord | null> {
    if (!(request.error instanceof CodexStageExecutionError)) {
      return null;
    }

    const promptTemplatePath = request.error.promptTemplatePath?.trim() ?? "";
    const promptText = request.error.promptText?.trim() ?? "";
    if (!promptTemplatePath || !promptText) {
      return null;
    }

    const diagnostics = request.error.diagnostics;
    return this.recordWorkflowTrace(slot, {
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
  ): Promise<WorkflowStageTraceRecord | null> {
    const sourceCommand = this.resolveWorkflowTraceSourceCommand(slot);
    if (!sourceCommand) {
      return null;
    }

    const decisionMetadata = this.buildRunSpecsTraceMetadata(slot, request.metadata);

    try {
      const traceStore = this.workflowTraceStoreFactory(slot.project.path);
      return await traceStore.recordStageTrace({
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
          ...(decisionMetadata ? { metadata: decisionMetadata } : {}),
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
      return null;
    }
  }

  private async recordTargetFlowTrace(
    active: ActiveTargetFlowExecution,
    summary:
      | TargetPrepareFlowSummary
      | TargetCheckupFlowSummary
      | TargetDeriveFlowSummary
      | TargetInvestigateCaseFlowSummary,
  ): Promise<void> {
    const traceRequest: TargetFlowTraceRecordRequest = {
      flow: active.flow,
      sourceCommand: active.command,
      targetProjectName: active.targetProject.name,
      targetProjectPath: active.targetProject.path,
      inputs: { ...active.traceInputs },
      milestones: active.traceMilestones.map((milestone) => ({
        milestone: milestone.milestone,
        milestoneLabel: milestone.milestoneLabel,
        message: milestone.message,
        versionBoundaryState: milestone.versionBoundaryState,
        recordedAtUtc: milestone.recordedAtUtc,
      })),
      aiExchanges: active.traceAiExchanges.map((exchange) => ({
        stageLabel: exchange.stageLabel,
        promptTemplatePath: exchange.promptTemplatePath,
        promptText: exchange.promptText,
        outputText: exchange.outputText,
        ...(exchange.diagnostics ? { diagnostics: { ...exchange.diagnostics } } : {}),
      })),
      artifactPaths: [...summary.artifactPaths],
      versionedArtifactPaths: [...summary.versionedArtifactPaths],
      outcome: {
        status: summary.outcome,
        summary: this.buildTargetFlowFinalMessage(summary),
        ...(summary.outcome === "failure" || summary.outcome === "blocked"
          ? { errorMessage: summary.details ?? this.buildTargetFlowFinalMessage(summary) }
          : {}),
        metadata: this.buildTargetFlowTraceMetadata(summary),
      },
      recordedAt: this.now(),
    };

    try {
      const traceStore = this.workflowTraceStoreFactory(active.targetProject.path);
      await traceStore.recordTargetFlowTrace(traceRequest);
    } catch (error) {
      this.logger.warn("Falha ao persistir trilha de fluxo target", {
        flow: active.flow,
        command: active.command,
        targetProjectName: active.targetProject.name,
        targetProjectPath: active.targetProject.path,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private buildTargetFlowTraceMetadata(
    summary:
      | TargetPrepareFlowSummary
      | TargetCheckupFlowSummary
      | TargetDeriveFlowSummary
      | TargetInvestigateCaseFlowSummary,
  ): Record<string, unknown> {
    return {
      completionReason: summary.completionReason,
      finalStage: summary.finalStage,
      nextAction: summary.nextAction,
      versionBoundaryState: summary.versionBoundaryState,
      totalDurationMs: summary.timing.totalDurationMs,
      ...(summary.summary
        ? {
            summary: JSON.parse(JSON.stringify(summary.summary)) as Record<string, unknown>,
          }
        : {}),
      ...(summary.details ? { details: summary.details } : {}),
    };
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
    lastProcessedTicket?: string;
    selectionTicket?: string;
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
      ...(params.lastProcessedTicket ? { lastProcessedTicket: params.lastProcessedTicket } : {}),
      ...(params.selectionTicket ? { selectionTicket: params.selectionTicket } : {}),
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
    sourceCommand: RunSpecsSourceCommand;
    entryPoint: RunSpecsEntryPoint;
    details?: string;
    triageTimingCollector: FlowTimingCollector<RunSpecsTriageTimingStage>;
    flowTimingCollector: FlowTimingCollector<RunSpecsFlowTimingStage>;
    specTriage?: RunSpecsSpecTriageSummary;
    specTicketValidation?: RunSpecsTicketValidationSummary;
    specTicketDerivationRetrospective?: RunSpecsDerivationRetrospectiveSummary;
    specCloseAndVersion?: RunSpecsSpecCloseAndVersionSummary;
    specAudit?: RunSpecsSpecAuditSummary;
    workflowGapAnalysis?: WorkflowGapAnalysisResult;
    workflowImprovementTicket?: WorkflowImprovementTicketPublicationResult;
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
      sourceCommand: params.sourceCommand,
      entryPoint: params.entryPoint,
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
      ...(params.specTriage
        ? {
            specTriage: this.cloneRunSpecsSpecTriageSummary(params.specTriage),
          }
        : {}),
      ...(params.specTicketValidation
        ? {
            specTicketValidation: this.cloneRunSpecsTicketValidationSummary(
              params.specTicketValidation,
            ),
          }
        : {}),
      ...(params.specTicketDerivationRetrospective
        ? {
            specTicketDerivationRetrospective:
              this.cloneRunSpecsDerivationRetrospectiveSummary(
                params.specTicketDerivationRetrospective,
              ),
          }
        : {}),
      ...(params.specCloseAndVersion
        ? {
            specCloseAndVersion: this.cloneRunSpecsSpecCloseAndVersionSummary(
              params.specCloseAndVersion,
            ),
          }
        : {}),
      ...(params.specAudit
        ? {
            specAudit: this.cloneRunSpecsSpecAuditSummary(params.specAudit),
          }
        : {}),
      ...(params.workflowGapAnalysis
        ? {
            workflowGapAnalysis: this.cloneWorkflowGapAnalysisResult(
              params.workflowGapAnalysis,
            ),
          }
        : {}),
      ...(params.workflowImprovementTicket
        ? {
            workflowImprovementTicket: this.cloneWorkflowImprovementTicketPublicationResult(
              params.workflowImprovementTicket,
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
      cycleHistory: summary.cycleHistory.map((cycle) => ({
        cycleNumber: cycle.cycleNumber,
        phase: cycle.phase,
        threadId: cycle.threadId,
        verdict: cycle.verdict,
        confidence: cycle.confidence,
        summary: cycle.summary,
        openGapFingerprints: [...cycle.openGapFingerprints],
        appliedCorrections: cycle.appliedCorrections.map((correction) => ({
          description: correction.description,
          affectedArtifactPaths: [...correction.affectedArtifactPaths],
          linkedGapTypes: [...correction.linkedGapTypes],
          outcome: correction.outcome,
        })),
        realGapReductionFromPrevious: cycle.realGapReductionFromPrevious,
      })),
    };
  }

  private cloneRunSpecsSpecTriageSummary(
    summary: RunSpecsSpecTriageSummary,
  ): RunSpecsSpecTriageSummary {
    return {
      specStatusAfterTriage: summary.specStatusAfterTriage,
      specTreatmentAfterTriage: summary.specTreatmentAfterTriage,
      derivedTicketsCreated: summary.derivedTicketsCreated,
      summary: summary.summary,
    };
  }

  private cloneRunSpecsDerivationRetrospectiveSummary(
    summary: RunSpecsDerivationRetrospectiveSummary,
  ): RunSpecsDerivationRetrospectiveSummary {
    return {
      decision: summary.decision,
      summary: summary.summary,
      reviewedGapHistoryDetected: summary.reviewedGapHistoryDetected,
      structuredInputAvailable: summary.structuredInputAvailable,
      functionalVerdict: summary.functionalVerdict,
      ...(summary.analysis
        ? {
            analysis: this.cloneWorkflowGapAnalysisResult(summary.analysis),
          }
        : {}),
      ...(summary.workflowImprovementTicket
        ? {
            workflowImprovementTicket: this.cloneWorkflowImprovementTicketPublicationResult(
              summary.workflowImprovementTicket,
            ),
          }
        : {}),
    };
  }

  private cloneRunSpecsSpecCloseAndVersionSummary(
    summary: RunSpecsSpecCloseAndVersionSummary,
  ): RunSpecsSpecCloseAndVersionSummary {
    return {
      closureCompleted: summary.closureCompleted,
      versioningResult: summary.versioningResult,
      commitHash: summary.commitHash,
      summary: summary.summary,
    };
  }

  private cloneRunSpecsSpecAuditSummary(
    summary: RunSpecsSpecAuditSummary,
  ): RunSpecsSpecAuditSummary {
    return {
      residualGapsDetected: summary.residualGapsDetected,
      followUpTicketsCreated: summary.followUpTicketsCreated,
      specStatusAfterAudit: summary.specStatusAfterAudit,
      summary: summary.summary,
    };
  }

  private cloneWorkflowGapAnalysisResult(
    result: WorkflowGapAnalysisResult,
  ): WorkflowGapAnalysisResult {
    return {
      classification: result.classification,
      confidence: result.confidence,
      publicationEligibility: result.publicationEligibility,
      inputMode: result.inputMode,
      summary: result.summary,
      causalHypothesis: result.causalHypothesis,
      benefitSummary: result.benefitSummary,
      findings: result.findings.map((finding) => ({
        summary: finding.summary,
        affectedArtifactPaths: [...finding.affectedArtifactPaths],
        requirementRefs: [...finding.requirementRefs],
        evidence: [...finding.evidence],
      })),
      workflowArtifactsConsulted: [...result.workflowArtifactsConsulted],
      followUpTicketPaths: [...result.followUpTicketPaths],
      limitation: result.limitation
        ? {
            code: result.limitation.code,
            detail: result.limitation.detail,
          }
        : null,
      historicalReference: result.historicalReference
        ? {
            summary: result.historicalReference.summary,
            ticketPath: result.historicalReference.ticketPath,
            findingFingerprints: [...result.historicalReference.findingFingerprints],
          }
        : null,
      ticketDraft: result.ticketDraft
        ? {
            title: result.ticketDraft.title,
            problemStatement: result.ticketDraft.problemStatement,
            expectedBehavior: result.ticketDraft.expectedBehavior,
            proposedSolution: result.ticketDraft.proposedSolution,
            reproductionSteps: [...result.ticketDraft.reproductionSteps],
            impactFunctional: result.ticketDraft.impactFunctional,
            impactOperational: result.ticketDraft.impactOperational,
            regressionRisk: result.ticketDraft.regressionRisk,
            relevantAssumptionsDefaults: [
              ...result.ticketDraft.relevantAssumptionsDefaults,
            ],
            closureCriteria: [...result.ticketDraft.closureCriteria],
            affectedWorkflowSurfaces: [
              ...result.ticketDraft.affectedWorkflowSurfaces,
            ],
          }
        : null,
      ...(result.publicationHandoff
        ? {
            publicationHandoff: {
              analysisStage: result.publicationHandoff.analysisStage,
              activeProjectName: result.publicationHandoff.activeProjectName,
              activeProjectPath: result.publicationHandoff.activeProjectPath,
              sourceSpecPath: result.publicationHandoff.sourceSpecPath,
              sourceSpecFileName: result.publicationHandoff.sourceSpecFileName,
              sourceSpecTitle: result.publicationHandoff.sourceSpecTitle,
              inheritedAssumptionsDefaults: [
                ...result.publicationHandoff.inheritedAssumptionsDefaults,
              ],
              inputMode: result.publicationHandoff.inputMode,
              analysisSummary: result.publicationHandoff.analysisSummary,
              causalHypothesis: result.publicationHandoff.causalHypothesis,
              benefitSummary: result.publicationHandoff.benefitSummary,
              ticketDraft: {
                title: result.publicationHandoff.ticketDraft.title,
                problemStatement: result.publicationHandoff.ticketDraft.problemStatement,
                expectedBehavior: result.publicationHandoff.ticketDraft.expectedBehavior,
                proposedSolution: result.publicationHandoff.ticketDraft.proposedSolution,
                reproductionSteps: [
                  ...result.publicationHandoff.ticketDraft.reproductionSteps,
                ],
                impactFunctional: result.publicationHandoff.ticketDraft.impactFunctional,
                impactOperational: result.publicationHandoff.ticketDraft.impactOperational,
                regressionRisk: result.publicationHandoff.ticketDraft.regressionRisk,
                relevantAssumptionsDefaults: [
                  ...result.publicationHandoff.ticketDraft.relevantAssumptionsDefaults,
                ],
                closureCriteria: [
                  ...result.publicationHandoff.ticketDraft.closureCriteria,
                ],
                affectedWorkflowSurfaces: [
                  ...result.publicationHandoff.ticketDraft.affectedWorkflowSurfaces,
                ],
              },
              followUpTicketPaths: [...result.publicationHandoff.followUpTicketPaths],
              workflowArtifactsConsulted: [
                ...result.publicationHandoff.workflowArtifactsConsulted,
              ],
              trace: result.publicationHandoff.trace
                ? {
                    traceId: result.publicationHandoff.trace.traceId,
                    requestPath: result.publicationHandoff.trace.requestPath,
                    responsePath: result.publicationHandoff.trace.responsePath,
                    decisionPath: result.publicationHandoff.trace.decisionPath,
                  }
                : null,
              findings: result.publicationHandoff.findings.map((finding) => ({
                summary: finding.summary,
                affectedArtifactPaths: [...finding.affectedArtifactPaths],
                requirementRefs: [...finding.requirementRefs],
                evidence: [...finding.evidence],
              })),
            },
          }
        : {}),
    };
  }

  private cloneWorkflowImprovementTicketPublicationResult(
    result: WorkflowImprovementTicketPublicationResult,
  ): WorkflowImprovementTicketPublicationResult {
    return {
      status: result.status,
      targetRepoKind: result.targetRepoKind,
      targetRepoPath: result.targetRepoPath,
      targetRepoDisplayPath: result.targetRepoDisplayPath,
      ticketFileName: result.ticketFileName,
      ticketPath: result.ticketPath,
      detail: result.detail,
      limitationCode: result.limitationCode,
      commitHash: result.commitHash,
      pushUpstream: result.pushUpstream,
      commitPushId: result.commitPushId,
      gapFingerprints: [...result.gapFingerprints],
    };
  }

  private cloneRunnerFlowSummary(summary: RunnerFlowSummary): RunnerFlowSummary {
    if (summary.flow === "run-all") {
      return this.cloneRunAllFlowSummary(summary);
    }

    if (summary.flow === "run-specs") {
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
        ...(summary.specTriage
          ? {
              specTriage: this.cloneRunSpecsSpecTriageSummary(summary.specTriage),
            }
          : {}),
        ...(summary.specTicketValidation
          ? {
              specTicketValidation: this.cloneRunSpecsTicketValidationSummary(
                summary.specTicketValidation,
              ),
            }
          : {}),
        ...(summary.specTicketDerivationRetrospective
          ? {
              specTicketDerivationRetrospective:
                this.cloneRunSpecsDerivationRetrospectiveSummary(
                  summary.specTicketDerivationRetrospective,
                ),
            }
          : {}),
        ...(summary.specCloseAndVersion
          ? {
              specCloseAndVersion: this.cloneRunSpecsSpecCloseAndVersionSummary(
                summary.specCloseAndVersion,
              ),
            }
          : {}),
        ...(summary.specAudit
          ? {
              specAudit: this.cloneRunSpecsSpecAuditSummary(summary.specAudit),
            }
          : {}),
        ...(summary.workflowGapAnalysis
          ? {
              workflowGapAnalysis: this.cloneWorkflowGapAnalysisResult(
                summary.workflowGapAnalysis,
              ),
            }
          : {}),
        ...(summary.workflowImprovementTicket
          ? {
              workflowImprovementTicket: this.cloneWorkflowImprovementTicketPublicationResult(
                summary.workflowImprovementTicket,
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

    return {
      ...summary,
      ...(summary.codexPreferences
        ? {
            codexPreferences: this.cloneFlowCodexPreferencesSnapshot(summary.codexPreferences),
          }
        : {}),
      timing: this.cloneFlowTimingSnapshot(summary.timing),
      artifactPaths: [...summary.artifactPaths],
      versionedArtifactPaths: [...summary.versionedArtifactPaths],
      ...(summary.summary
        ? {
            summary: JSON.parse(JSON.stringify(summary.summary)) as typeof summary.summary,
          }
        : {}),
    } as RunnerFlowSummary;
  }

  private parseSpecTriageStageResult(outputText: string): SpecTriageStageResult {
    const blockContent = this.extractRequiredSpecStageBlock(
      "spec-triage",
      outputText,
      "SPEC_TRIAGE_RESULT",
    );
    return {
      summary: {
        specStatusAfterTriage: this.readRequiredSpecStageField(
          "spec-triage",
          blockContent,
          "spec_status_after_triage",
        ),
        specTreatmentAfterTriage: this.readRequiredSpecStageField(
          "spec-triage",
          blockContent,
          "spec_treatment_after_triage",
        ),
        derivedTicketsCreated: this.readRequiredSpecStageIntegerField(
          "spec-triage",
          blockContent,
          "derived_tickets_created",
        ),
        summary: this.readRequiredSpecStageField("spec-triage", blockContent, "summary"),
      },
      outputText,
    };
  }

  private parseSpecCloseAndVersionStageResult(
    outputText: string,
  ): SpecCloseAndVersionStageResult {
    const blockContent = this.extractRequiredSpecStageBlock(
      "spec-close-and-version",
      outputText,
      "SPEC_CLOSE_AND_VERSION_RESULT",
    );
    const commitHash = this.readRequiredSpecStageField(
      "spec-close-and-version",
      blockContent,
      "commit_hash",
    );
    return {
      summary: {
        closureCompleted: this.readRequiredSpecStageBooleanField(
          "spec-close-and-version",
          blockContent,
          "closure_completed",
        ),
        versioningResult: this.readRequiredSpecStageField(
          "spec-close-and-version",
          blockContent,
          "versioning_result",
        ),
        commitHash: this.normalizeOptionalSpecStageText(commitHash),
        summary: this.readRequiredSpecStageField(
          "spec-close-and-version",
          blockContent,
          "summary",
        ),
      },
      outputText,
    };
  }

  private parseSpecAuditStageResult(outputText: string): SpecAuditStageResult {
    const blockContent = this.extractRequiredSpecStageBlock(
      "spec-audit",
      outputText,
      "SPEC_AUDIT_RESULT",
    );
    return {
      summary: {
        residualGapsDetected: this.readRequiredSpecStageBooleanField(
          "spec-audit",
          blockContent,
          "residual_gaps_detected",
        ),
        followUpTicketsCreated: this.readRequiredSpecStageIntegerField(
          "spec-audit",
          blockContent,
          "follow_up_tickets_created",
        ),
        specStatusAfterAudit: this.readRequiredSpecStageField(
          "spec-audit",
          blockContent,
          "spec_status_after_audit",
        ),
        summary: this.readRequiredSpecStageField("spec-audit", blockContent, "summary"),
      },
      outputText,
    };
  }

  private extractRequiredSpecStageBlock(
    stage: RunnerSpecStageContractError["stage"],
    outputText: string,
    blockName: string,
  ): string {
    const blockMatch = outputText.match(
      new RegExp(`\\[\\[${blockName}\\]\\]([\\s\\S]*?)\\[\\[\\/${blockName}\\]\\]`, "u"),
    );
    if (!blockMatch) {
      throw new RunnerSpecStageContractError(
        stage,
        `${stage} nao expôs o bloco [[${blockName}]] obrigatorio.`,
      );
    }

    return blockMatch[1] ?? "";
  }

  private readRequiredSpecStageField(
    stage: RunnerSpecStageContractError["stage"],
    blockContent: string,
    fieldName: string,
  ): string {
    const match = blockContent.match(new RegExp(`^${fieldName}:\\s*(.+)$`, "imu"));
    const value = match?.[1]?.trim();
    if (!value) {
      throw new RunnerSpecStageContractError(
        stage,
        `${stage} nao informou o campo obrigatorio ${fieldName}.`,
      );
    }

    return value;
  }

  private readRequiredSpecStageBooleanField(
    stage: RunnerSpecStageContractError["stage"],
    blockContent: string,
    fieldName: string,
  ): boolean {
    const value = this.readRequiredSpecStageField(stage, blockContent, fieldName).toLowerCase();
    if (value !== "yes" && value !== "no") {
      throw new RunnerSpecStageContractError(
        stage,
        `${stage} retornou ${fieldName} invalido; use yes ou no.`,
      );
    }

    return value === "yes";
  }

  private readRequiredSpecStageIntegerField(
    stage: RunnerSpecStageContractError["stage"],
    blockContent: string,
    fieldName: string,
  ): number {
    const rawValue = this.readRequiredSpecStageField(stage, blockContent, fieldName);
    const parsedValue = Number.parseInt(rawValue, 10);
    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      throw new RunnerSpecStageContractError(
        stage,
        `${stage} retornou ${fieldName} invalido; use inteiro >= 0.`,
      );
    }

    return parsedValue;
  }

  private normalizeOptionalSpecStageText(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    if (normalized === "none" || normalized === "n/a" || normalized === "null" || normalized === "-") {
      return null;
    }

    return value;
  }

  private reserveSlot(
    roundDependencies: RunnerRoundDependencies,
    kind: RunnerSlotKind,
  ): { status: "reserved"; slot: ActiveRunnerSlot } | RunnerRequestBlockedResult {
    const slotKey = this.buildSlotKey(roundDependencies.activeProject);
    const requestedCommand = this.renderSlotCommand(kind);
    const existing = this.activeSlots.get(slotKey);
    if (existing) {
      const existingCommand = this.renderSlotCommand(existing.kind);
      return this.buildProjectSlotBusyResult(
        requestedCommand,
        roundDependencies.activeProject.name,
        existingCommand,
      );
    }

    const targetFlowOccupancy = this.findProjectOccupancy({
      name: roundDependencies.activeProject.name,
      path: roundDependencies.activeProject.path,
    });
    if (targetFlowOccupancy && targetFlowOccupancy.kind !== "runner-slot") {
      return this.buildProjectSlotBusyResult(
        requestedCommand,
        targetFlowOccupancy.kind === "pending-target-flow"
          ? targetFlowOccupancy.projectName
          : targetFlowOccupancy.project.name,
        targetFlowOccupancy.command,
        targetFlowOccupancy.kind === "pending-target-flow"
          ? undefined
          : [{ ...targetFlowOccupancy.project }],
      );
    }

    if (this.getUsedProjectSlotCount() >= RUNNER_SLOT_LIMIT) {
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
      runSpecsSourceCommand: null,
      runSpecsEntryPoint: null,
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

  private getActiveTargetFlows(): ActiveTargetFlowExecution[] {
    return Array.from(this.activeTargetFlows.values()).sort(
      (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
    );
  }

  private getActiveProjects(): ProjectRef[] {
    const projects = Array.from(this.activeSlots.values()).map((slot) => ({ ...slot.project }));
    for (const activeTargetFlow of this.getActiveTargetFlows()) {
      projects.push({ ...activeTargetFlow.targetProject });
    }
    return projects;
  }

  private buildSlotKey(project: ProjectRef): string {
    return `${project.name}::${project.path}`;
  }

  private buildTargetSlotKey(projectName: string): string {
    return projectName;
  }

  private matchesProjectRef(
    project: ProjectRef,
    requestedProject: {
      name: string;
      path: string | null;
    },
  ): boolean {
    return project.name === requestedProject.name;
  }

  private findTargetFlowForProject(requestedProject: {
    name: string;
    path: string | null;
  }): ActiveTargetFlowExecution | null {
    const activeTargetFlow = this.activeTargetFlows.get(
      this.buildTargetSlotKey(requestedProject.name),
    );
    if (!activeTargetFlow) {
      return null;
    }

    return this.matchesProjectRef(activeTargetFlow.targetProject, requestedProject)
      ? activeTargetFlow
      : null;
  }

  private findPendingTargetFlowForProject(requestedProject: {
    name: string;
    path: string | null;
  }): PendingTargetFlowReservation | null {
    const pendingTargetFlow = this.pendingTargetFlows.get(
      this.buildTargetSlotKey(requestedProject.name),
    );
    if (!pendingTargetFlow) {
      return null;
    }

    if (
      requestedProject.path &&
      pendingTargetFlow.projectPath &&
      pendingTargetFlow.projectPath !== requestedProject.path
    ) {
      return null;
    }

    return pendingTargetFlow;
  }

  private getUsedProjectSlotCount(): number {
    return this.activeSlots.size + this.activeTargetFlows.size + this.pendingTargetFlows.size;
  }

  private findProjectOccupancy(
    requestedProject: {
      name: string;
      path: string | null;
    },
  ):
    | {
        kind: "runner-slot";
        command: string;
        project: ProjectRef;
      }
    | {
        kind: "target-flow";
        command: TargetFlowCommand;
        project: ProjectRef;
      }
    | {
        kind: "pending-target-flow";
        command: TargetFlowCommand;
        projectName: string;
      }
    | null {
    for (const slot of this.activeSlots.values()) {
      if (!this.matchesProjectRef(slot.project, requestedProject)) {
        continue;
      }

      return {
        kind: "runner-slot",
        command: this.renderSlotCommand(slot.kind),
        project: { ...slot.project },
      };
    }

    const activeTargetFlow = this.findTargetFlowForProject(requestedProject);
    if (activeTargetFlow) {
      return {
        kind: "target-flow",
        command: activeTargetFlow.command,
        project: { ...activeTargetFlow.targetProject },
      };
    }

    const pendingTargetFlow = this.findPendingTargetFlowForProject(requestedProject);
    if (pendingTargetFlow) {
      return {
        kind: "pending-target-flow",
        command: pendingTargetFlow.command,
        projectName: pendingTargetFlow.projectName,
      };
    }

    return null;
  }

  private buildProjectSlotBusyResult(
    requestedCommand: string,
    requestedProjectName: string,
    activeCommand: string,
    activeProjects?: ProjectRef[],
  ): RunnerRequestBlockedResult {
    return {
      status: "blocked",
      reason: "project-slot-busy",
      message:
        `Nao e possivel iniciar ${requestedCommand}: slot do projeto ${requestedProjectName} ` +
        `ja ocupado por ${activeCommand}.`,
      ...(activeProjects?.length ? { activeProjects } : {}),
    };
  }

  private reserveTargetFlowProjectSlot(params: {
    flow: TargetFlowKind;
    command: TargetFlowCommand;
    projectName: string;
    projectPath: string | null;
    startedAt: Date;
  }):
    | {
        status: "reserved";
        reservation: PendingTargetFlowReservation;
      }
    | RunnerRequestBlockedResult {
    const occupancy = this.findProjectOccupancy({
      name: params.projectName,
      path: params.projectPath,
    });
    if (occupancy) {
      return this.buildProjectSlotBusyResult(
        params.command,
        occupancy.kind === "pending-target-flow" ? occupancy.projectName : occupancy.project.name,
        occupancy.command,
        occupancy.kind === "pending-target-flow" ? undefined : [{ ...occupancy.project }],
      );
    }

    if (this.getUsedProjectSlotCount() >= RUNNER_SLOT_LIMIT) {
      const activeProjects = this.getActiveProjects();
      return {
        status: "blocked",
        reason: "runner-capacity-maxed",
        message: this.buildCapacityMaxedMessage(activeProjects),
        activeProjects,
      };
    }

    const reservation: PendingTargetFlowReservation = {
      slotKey: this.buildTargetSlotKey(params.projectName),
      flow: params.flow,
      command: params.command,
      projectName: params.projectName,
      projectPath: params.projectPath,
      startedAt: params.startedAt,
    };
    this.pendingTargetFlows.set(reservation.slotKey, reservation);
    this.syncStateFromSlots();
    this.logger.info("Slot target reservado", {
      targetFlow: params.flow,
      command: params.command,
      targetProjectName: params.projectName,
      targetProjectPath: params.projectPath,
      usedSlots: this.getUsedProjectSlotCount(),
      maxSlots: RUNNER_SLOT_LIMIT,
    });

    return {
      status: "reserved",
      reservation,
    };
  }

  private releasePendingTargetFlowReservation(slotKey: string): void {
    if (!this.pendingTargetFlows.delete(slotKey)) {
      return;
    }

    this.syncStateFromSlots();
  }

  private resolveTargetFlowForControl(flow: TargetFlowKind):
    | {
        status: "active";
        targetFlow: ActiveTargetFlowExecution;
      }
    | {
        status: "inactive";
      }
    | {
        status: "ambiguous";
        message: string;
      } {
    const matchesFlow = (candidateFlow: TargetFlowKind): boolean =>
      flow === "target-investigate-case"
        ? candidateFlow === "target-investigate-case" ||
          candidateFlow === "target-investigate-case-v2"
        : candidateFlow === flow;
    const activeProjectName = this.state.activeProject?.name;
    if (activeProjectName) {
      const scopedTargetFlow = this.activeTargetFlows.get(this.buildTargetSlotKey(activeProjectName));
      if (scopedTargetFlow && matchesFlow(scopedTargetFlow.flow)) {
        return {
          status: "active",
          targetFlow: scopedTargetFlow,
        };
      }
    }

    const matchingTargetFlows = this.getActiveTargetFlows().filter((targetFlow) =>
      matchesFlow(targetFlow.flow),
    );
    if (matchingTargetFlows.length === 0) {
      return { status: "inactive" };
    }

    if (matchingTargetFlows.length === 1) {
      return {
        status: "active",
        targetFlow: matchingTargetFlows[0]!,
      };
    }

    return {
      status: "ambiguous",
      message: [
        `Existem ${matchingTargetFlows.length} execucoes ${targetFlowKindToCommand(flow)} ativas em projetos diferentes.`,
        "Selecione o projeto correspondente e tente novamente, ou use /status para identificar o slot certo.",
      ].join(" "),
    };
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

    if (kind === "target-prepare") {
      return "/target_prepare";
    }

    if (kind === "target-checkup") {
      return "/target_checkup";
    }

    if (kind === "target-derive") {
      return "/target_derive_gaps";
    }

    if (kind === "target-investigate-case") {
      return "/target_investigate_case";
    }

    if (kind === "target-investigate-case-v2") {
      return "/target_investigate_case_v2";
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

  private mapTargetFlowKindToSlotKind(flow: TargetFlowKind): Extract<
    RunnerSlotKind,
    | "target-prepare"
    | "target-checkup"
    | "target-derive"
    | "target-investigate-case"
    | "target-investigate-case-v2"
  > {
    if (flow === "target-prepare") {
      return "target-prepare";
    }

    if (flow === "target-checkup") {
      return "target-checkup";
    }

    if (flow === "target-derive") {
      return "target-derive";
    }

    if (flow === "target-investigate-case-v2") {
      return "target-investigate-case-v2";
    }

    return "target-investigate-case";
  }

  private buildTargetFlowStateSnapshot(active: ActiveTargetFlowExecution): RunnerTargetFlowState {
    return {
      flow: active.flow,
      command: active.command,
      targetProject: { ...active.targetProject },
      phase: active.phase,
      milestone: active.milestone as TargetFlowMilestone,
      milestoneLabel: active.milestoneLabel,
      versionBoundaryState: active.versionBoundaryState,
      cancelRequestedAt: active.cancelRequestedAt ? new Date(active.cancelRequestedAt) : null,
      startedAt: new Date(active.startedAt),
      updatedAt: new Date(active.updatedAt),
      lastMessage: active.lastMessage,
    };
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

  private selectTargetFlowStateSnapshot(): RunnerTargetFlowState | null {
    const activeProjectName = this.state.activeProject?.name;
    if (activeProjectName) {
      const scopedTargetFlow = this.activeTargetFlows.get(this.buildTargetSlotKey(activeProjectName));
      if (scopedTargetFlow) {
        return this.buildTargetFlowStateSnapshot(scopedTargetFlow);
      }
    }

    const targetFlows = this.getActiveTargetFlows();
    if (targetFlows.length === 1) {
      return this.buildTargetFlowStateSnapshot(targetFlows[0]!);
    }

    return null;
  }

  private syncStateFromSlots(): void {
    const slots = Array.from(this.activeSlots.values()).sort(
      (left, right) => left.startedAt.getTime() - right.startedAt.getTime(),
    );
    const targetFlows = this.getActiveTargetFlows();
    const targetFlow = this.selectTargetFlowStateSnapshot();
    const renderedTargetSlots = targetFlows.map((activeTargetFlow) => ({
      project: { ...activeTargetFlow.targetProject },
      kind: this.mapTargetFlowKindToSlotKind(activeTargetFlow.flow),
      phase: activeTargetFlow.phase,
      currentTicket: null,
      currentSpec: null,
      targetFlowCommand: activeTargetFlow.command,
      targetFlowMilestone: activeTargetFlow.milestone as TargetFlowMilestone,
      targetFlowVersionBoundaryState: activeTargetFlow.versionBoundaryState,
      isPaused: false,
      startedAt: new Date(activeTargetFlow.startedAt),
    }));

    this.state.capacity = {
      limit: RUNNER_SLOT_LIMIT,
      used: slots.length + targetFlows.length + this.pendingTargetFlows.size,
    };
    this.state.activeSlots = [
      ...slots.map((slot) => ({
        project: { ...slot.project },
        kind: slot.kind,
        phase: slot.phase,
        currentTicket: slot.currentTicket,
        currentSpec: slot.currentSpec,
        ...(slot.runSpecsSourceCommand
          ? { runSpecsSourceCommand: slot.runSpecsSourceCommand }
          : {}),
        ...(slot.runSpecsEntryPoint ? { runSpecsEntryPoint: slot.runSpecsEntryPoint } : {}),
        isPaused: slot.isPaused,
        startedAt: new Date(slot.startedAt),
      })),
      ...renderedTargetSlots,
    ];
    this.state.targetFlow = targetFlow;

    this.state.isRunning = slots.some(
      (slot) => this.isTicketSlotKind(slot.kind) && (slot.isStarting || slot.isRunning || Boolean(slot.loopPromise)),
    );
    if (targetFlows.length > 0) {
      this.state.isRunning = true;
    }

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
          !this.isCodexChatSessionActive()
        ) {
          this.state.phase = targetFlow?.phase ?? (this.state.phase === "error" ? "error" : "idle");
        }
      }
    } else if (
      !this.isDiscoverSpecSessionActive() &&
      !this.isPlanSpecSessionActive() &&
      !this.isCodexChatSessionActive()
    ) {
      this.state.phase = targetFlow?.phase ?? (this.state.phase === "error" ? "error" : "idle");
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

const uniqueSorted = (values: string[]): string[] => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
