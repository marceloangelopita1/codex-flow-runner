import assert from "node:assert/strict";
import test from "node:test";
import { ProjectSelectionSnapshot } from "../core/project-selection.js";
import {
  CodexChatSessionCancelOptions,
  CodexChatSessionCancelResult,
  CodexChatSessionInputResult,
  CodexChatSessionStartResult,
  DiscoverSpecSessionCancelResult,
  DiscoverSpecSessionInputResult,
  DiscoverSpecSessionStartResult,
  PlanSpecCallbackIgnoredReason,
  RunSelectedTicketRequestResult,
  TargetCheckupRequestResult,
  TargetDeriveRequestResult,
  TargetFlowCancelResult,
  TargetPrepareRequestResult,
  RunnerProjectControlResult,
} from "../core/runner.js";
import { Logger } from "../core/logger.js";
import { ProjectRef } from "../types/project.js";
import {
  CodexFlowPreferencesSnapshot,
  CodexModelSelectionResult,
  CodexModelSelectionSnapshot,
  CodexReasoningSelectionResult,
  CodexReasoningSelectionSnapshot,
  CodexResolvedProjectPreferences,
  CodexSpeedSelectionResult,
  CodexSpeedSelectionSnapshot,
} from "../types/codex-preferences.js";
import { createDefaultDiscoverSpecCategoryCoverageRecord } from "../types/discover-spec.js";
import { RunnerState } from "../types/state.js";
import {
  TicketFinalFailureSummary,
  TicketFinalSuccessSummary,
  TicketTimingSnapshot,
} from "../types/ticket-final-summary.js";
import {
  FlowNotificationDispatchError,
  FlowTimingSnapshot,
  RunAllFlowSummary,
  RunnerFlowSummary,
  RunAllTimingStage,
  RunSpecsFlowSummary,
  RunSpecsFlowTimingStage,
  RunSpecsTicketValidationSummary,
  RunSpecsTriageTimingStage,
} from "../types/flow-timing.js";
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
  targetFlow: null,
  discoverSpecSession: null,
  planSpecSession: null,
  phase: "idle",
  lastMessage: "estado de teste",
  updatedAt: new Date("2026-02-19T00:00:00.000Z"),
  lastNotifiedEvent: null,
  lastNotificationFailure: null,
  ...value,
  codexChatSession: value.codexChatSession ?? null,
  lastCodexChatSessionClosure: value.lastCodexChatSessionClosure ?? null,
  lastRunFlowSummary: value.lastRunFlowSummary ?? null,
  lastRunFlowNotificationEvent: value.lastRunFlowNotificationEvent ?? null,
  lastRunFlowNotificationFailure: value.lastRunFlowNotificationFailure ?? null,
});

const createTicketTimingSnapshot = (
  value: Partial<TicketTimingSnapshot> = {},
): TicketTimingSnapshot => ({
  startedAtUtc: "2026-02-19T14:58:00.000Z",
  finishedAtUtc: "2026-02-19T15:00:00.000Z",
  totalDurationMs: 120000,
  durationsByStageMs: {
    plan: 45000,
    implement: 50000,
    "close-and-version": 25000,
  },
  completedStages: ["plan", "implement", "close-and-version"],
  interruptedStage: null,
  ...value,
});

const createRunSpecsTriageTimingSnapshot = (): FlowTimingSnapshot<RunSpecsTriageTimingStage> => ({
  startedAtUtc: "2026-02-19T15:00:00.000Z",
  finishedAtUtc: "2026-02-19T15:03:00.000Z",
  totalDurationMs: 180000,
  durationsByStageMs: {
    "spec-triage": 90000,
    "spec-close-and-version": 90000,
  },
  completedStages: ["spec-triage", "spec-close-and-version"],
  interruptedStage: null,
});

const createRunAllTimingSnapshot = (
  value: Partial<FlowTimingSnapshot<RunAllTimingStage>> = {},
): FlowTimingSnapshot<RunAllTimingStage> => ({
  startedAtUtc: "2026-02-19T15:04:00.000Z",
  finishedAtUtc: "2026-02-19T15:08:00.000Z",
  totalDurationMs: 240000,
  durationsByStageMs: {
    "select-ticket": 20000,
    plan: 80000,
    implement: 90000,
    "close-and-version": 50000,
  },
  completedStages: ["select-ticket", "plan", "implement", "close-and-version"],
  interruptedStage: null,
  ...value,
});

const createRunSpecsFlowTimingSnapshot = (
  value: Partial<FlowTimingSnapshot<RunSpecsFlowTimingStage>> = {},
): FlowTimingSnapshot<RunSpecsFlowTimingStage> => ({
  startedAtUtc: "2026-02-19T15:00:00.000Z",
  finishedAtUtc: "2026-02-19T15:09:00.000Z",
  totalDurationMs: 540000,
  durationsByStageMs: {
    "spec-triage": 90000,
    "spec-close-and-version": 90000,
    "run-all": 300000,
    "spec-audit": 60000,
  },
  completedStages: ["spec-triage", "spec-close-and-version", "run-all", "spec-audit"],
  interruptedStage: null,
  ...value,
});

const createFlowCodexPreferencesSnapshot = (
  value: Partial<CodexFlowPreferencesSnapshot> = {},
): CodexFlowPreferencesSnapshot => ({
  model: "gpt-5.4",
  reasoningEffort: "xhigh",
  speed: "standard",
  ...value,
});

const createRunSpecsTicketValidationCycleSummary = (
  value: Partial<RunSpecsTicketValidationSummary["cycleHistory"][number]> = {},
): RunSpecsTicketValidationSummary["cycleHistory"][number] => ({
  cycleNumber: 0,
  phase: "initial-validation",
  threadId: "stub-spec-ticket-validation-thread",
  verdict: "GO",
  confidence: "high",
  summary: "Pacote derivado validado com sucesso.",
  openGapFingerprints: [],
  appliedCorrections: [],
  realGapReductionFromPrevious: null,
  ...value,
});

const createRunSpecsTicketValidationSummary = (
  value: Partial<RunSpecsTicketValidationSummary> = {},
): RunSpecsTicketValidationSummary => ({
  verdict: "GO",
  confidence: "high",
  finalReason: "go-with-high-confidence",
  cyclesExecuted: 0,
  validationThreadId: "stub-spec-ticket-validation-thread",
  triageContextInherited: false,
  summary: "Pacote derivado validado com sucesso.",
  gaps: [],
  appliedCorrections: [],
  finalOpenGapFingerprints: [],
  cycleHistory: [createRunSpecsTicketValidationCycleSummary()],
  ...value,
});

const createRunSpecsSpecTriageSummary = (
  value: Partial<NonNullable<RunSpecsFlowSummary["specTriage"]>> = {},
): NonNullable<RunSpecsFlowSummary["specTriage"]> => ({
  specStatusAfterTriage: "approved",
  specTreatmentAfterTriage: "pending",
  derivedTicketsCreated: 2,
  summary: "Triagem atualizou a spec e derivou o pacote inicial de tickets.",
  ...value,
});

const createWorkflowGapAnalysisSummary = (
  value: Partial<NonNullable<RunSpecsFlowSummary["workflowGapAnalysis"]>> = {},
): NonNullable<RunSpecsFlowSummary["workflowGapAnalysis"]> => ({
  classification: "not-systemic",
  confidence: "low",
  publicationEligibility: false,
  inputMode: "spec-and-audit-fallback",
  summary: "Nao ha evidencia suficiente de contribuicao sistemica.",
  causalHypothesis: "O gap observado parece local ao pacote auditado.",
  benefitSummary: "Nenhum ticket automatico de workflow e necessario nesta rodada.",
  findings: [],
  workflowArtifactsConsulted: ["AGENTS.md", "prompts/11-retrospectiva-workflow-apos-spec-audit.md"],
  followUpTicketPaths: [],
  limitation: null,
  historicalReference: null,
  ticketDraft: null,
  ...value,
});

const createRunSpecsDerivationRetrospectiveSummary = (
  value: Partial<NonNullable<RunSpecsFlowSummary["specTicketDerivationRetrospective"]>> = {},
): NonNullable<RunSpecsFlowSummary["specTicketDerivationRetrospective"]> => ({
  decision: "executed",
  summary: "Retrospectiva sistemica da derivacao executada com systemic-hypothesis (medium).",
  reviewedGapHistoryDetected: true,
  structuredInputAvailable: true,
  functionalVerdict: "GO",
  analysis: createWorkflowGapAnalysisSummary({
    inputMode: "spec-ticket-validation-history",
    classification: "systemic-hypothesis",
    confidence: "medium",
    summary: "A derivacao exigiu contexto sistemico adicional antes do /run-all.",
    causalHypothesis: "A ordem de releitura canonica ainda depende de conhecimento implicito.",
    benefitSummary: "Tornar a etapa explicita reduz retrabalho na derivacao.",
    findings: [
      {
        summary: "A retrospectiva pre-run-all precisa reforcar a ordem canonica de releitura.",
        affectedArtifactPaths: ["prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md"],
        requirementRefs: ["RF-12", "CA-05"],
        evidence: ["O pacote derivado precisou de revisao antes de ficar apto."],
      },
    ],
    followUpTicketPaths: ["tickets/open/2026-02-19-flow-a.md"],
  }),
  ...value,
});

const createRunSpecsSpecCloseAndVersionSummary = (
  value: Partial<NonNullable<RunSpecsFlowSummary["specCloseAndVersion"]>> = {},
): NonNullable<RunSpecsFlowSummary["specCloseAndVersion"]> => ({
  closureCompleted: true,
  versioningResult: "committed-and-pushed",
  commitHash: "abc123def456",
  summary: "Fechamento/versionamento da triagem concluido com sucesso.",
  ...value,
});

const createRunSpecsSpecAuditSummary = (
  value: Partial<NonNullable<RunSpecsFlowSummary["specAudit"]>> = {},
): NonNullable<RunSpecsFlowSummary["specAudit"]> => ({
  residualGapsDetected: false,
  followUpTicketsCreated: 0,
  specStatusAfterAudit: "attended",
  summary: "Auditoria final concluiu sem gaps residuais reais.",
  ...value,
});

const createWorkflowImprovementTicketSummary = (
  value: Partial<NonNullable<RunSpecsFlowSummary["workflowImprovementTicket"]>> = {},
): NonNullable<RunSpecsFlowSummary["workflowImprovementTicket"]> => ({
  status: "created-and-pushed",
  targetRepoKind: "current-project",
  targetRepoPath: "/home/mapita/projetos/codex-flow-runner",
  targetRepoDisplayPath: ".",
  ticketFileName: "2026-03-19-workflow-improvement-example.md",
  ticketPath: "tickets/open/2026-03-19-workflow-improvement-example.md",
  detail: "Ticket transversal publicado com commit/push em tickets/open/2026-03-19-workflow-improvement-example.md.",
  limitationCode: null,
  commitHash: "workflow123",
  pushUpstream: "origin/main",
  commitPushId: "workflow123@origin/main",
  gapFingerprints: ["workflow-finding|abc123def456"],
  ...value,
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
  observedModel: null,
  observedReasoningEffort: null,
  observedAt: null,
  activeProjectSnapshot: cloneProject(defaultActiveProject),
  ...value,
});

const createDiscoverSpecSession = (
  value: Partial<NonNullable<RunnerState["discoverSpecSession"]>> = {},
): NonNullable<RunnerState["discoverSpecSession"]> => ({
  chatId: "42",
  phase: "awaiting-brief",
  startedAt: new Date("2026-03-18T12:00:00.000Z"),
  lastActivityAt: new Date("2026-03-18T12:05:00.000Z"),
  waitingCodexSinceAt: null,
  lastCodexActivityAt: null,
  lastCodexStream: null,
  lastCodexPreview: null,
  observedModel: null,
  observedReasoningEffort: null,
  observedAt: null,
  activeProjectSnapshot: cloneProject(defaultActiveProject),
  categoryCoverage: createDefaultDiscoverSpecCategoryCoverageRecord(),
  pendingItems: [],
  latestFinalBlock: null,
  createSpecEligible: false,
  createSpecBlockReason: "A descoberta ainda nao chegou a um bloco final elegivel.",
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
  observedModel: null,
  observedReasoningEffort: null,
  observedAt: null,
  activeProjectSnapshot: cloneProject(defaultActiveProject),
  ...value,
});

const createPlanSpecFinalBlock = (
  value: Partial<PlanSpecFinalBlock> = {},
): PlanSpecFinalBlock => {
  const defaultOutline: PlanSpecFinalBlock["outline"] = {
    objective: "Transformar o planejamento em uma spec rica e reutilizavel.",
    actors: ["Operador do Telegram", "Runner do Codex"],
    journey: [
      "Operador descreve a necessidade.",
      "Codex devolve um bloco final estruturado.",
    ],
    requirements: [
      "RF-01 - Preservar RFs aprovados na spec criada.",
      "RF-02 - Preservar CAs observaveis na materializacao.",
    ],
    acceptanceCriteria: [
      "CA-01 - O resumo final mostra RFs e CAs.",
      "CA-02 - O contexto aprovado chega inteiro na spec criada.",
    ],
    nonScope: ["Nao implementar a feature final nesta etapa."],
    technicalConstraints: ["Manter o protocolo parseavel."],
    mandatoryValidations: ["Conferir se RFs e CAs aparecem na spec."],
    pendingManualValidations: ["Revisar a clareza final com um humano."],
    knownRisks: ["Resumo curto demais reduz a qualidade da spec."],
  };

  return {
    title: value.title ?? "Bridge interativa do Codex",
    summary: value.summary ?? "Sessao /plan com parser e callbacks no Telegram.",
    outline: {
      objective: value.outline?.objective ?? defaultOutline.objective,
      actors: [...(value.outline?.actors ?? defaultOutline.actors)],
      journey: [...(value.outline?.journey ?? defaultOutline.journey)],
      requirements: [...(value.outline?.requirements ?? defaultOutline.requirements)],
      acceptanceCriteria: [
        ...(value.outline?.acceptanceCriteria ?? defaultOutline.acceptanceCriteria),
      ],
      nonScope: [...(value.outline?.nonScope ?? defaultOutline.nonScope)],
      technicalConstraints: [
        ...(value.outline?.technicalConstraints ?? defaultOutline.technicalConstraints),
      ],
      mandatoryValidations: [
        ...(value.outline?.mandatoryValidations ?? defaultOutline.mandatoryValidations),
      ],
      pendingManualValidations: [
        ...(value.outline?.pendingManualValidations ?? defaultOutline.pendingManualValidations),
      ],
      knownRisks: [...(value.outline?.knownRisks ?? defaultOutline.knownRisks)],
    },
    categoryCoverage: value.categoryCoverage
      ? value.categoryCoverage.map((item) => ({ ...item }))
      : [],
    assumptionsAndDefaults: [...(value.assumptionsAndDefaults ?? [])],
    decisionsAndTradeOffs: [...(value.decisionsAndTradeOffs ?? [])],
    criticalAmbiguities: [...(value.criticalAmbiguities ?? [])],
    actions: value.actions
      ? value.actions.map((action) => ({ ...action }))
      : [
          { id: "create-spec", label: "Criar spec" },
          { id: "refine", label: "Refinar" },
          { id: "cancel", label: "Cancelar" },
        ],
  };
};

type ControlCommand =
  | "start"
  | "target_prepare"
  | "target_prepare_status"
  | "target_prepare_cancel"
  | "target_checkup"
  | "target_checkup_status"
  | "target_checkup_cancel"
  | "target_derive_gaps"
  | "target_derive_gaps_status"
  | "target_derive_gaps_cancel"
  | "run_all"
  | "run-all"
  | "codex_chat"
  | "codex-chat"
  | "discover_spec"
  | "discover_spec_status"
  | "discover_spec_cancel"
  | "specs"
  | "tickets_open"
  | "run_specs"
  | "run_specs_from_validation"
  | "plan_spec"
  | "plan_spec_status"
  | "plan_spec_cancel"
  | "status"
  | "pause"
  | "resume"
  | "projects"
  | "models"
  | "reasoning"
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
  targetPrepareResult?: TargetPrepareRequestResult;
  targetCheckupResult?: TargetCheckupRequestResult;
  targetDeriveResult?: TargetDeriveRequestResult;
  targetPrepareCancelResult?: TargetFlowCancelResult;
  targetCheckupCancelResult?: TargetFlowCancelResult;
  targetDeriveCancelResult?: TargetFlowCancelResult;
  runAllStatus?: "started" | "already-running" | "blocked";
  runAllMessage?: string;
  runSpecsStatus?: "started" | "already-running" | "blocked";
  runSpecsMessage?: string;
  runSpecsFromValidationStatus?:
    | "started"
    | "already-running"
    | "blocked"
    | "validation-blocked"
    | "validation-failed";
  runSpecsFromValidationMessage?: string;
  runSelectedTicketResult?: RunSelectedTicketRequestResult;
  codexChatStartResult?: CodexChatSessionStartResult;
  codexChatInputResult?: CodexChatSessionInputResult;
  codexChatCancelResult?: CodexChatSessionCancelResult;
  discoverSpecStartResult?: DiscoverSpecSessionStartResult;
  discoverSpecInputResult?: DiscoverSpecSessionInputResult;
  discoverSpecCancelResult?: DiscoverSpecSessionCancelResult;
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
  codexModelSnapshot?: CodexModelSelectionSnapshot;
  codexReasoningSnapshot?: CodexReasoningSelectionSnapshot;
  codexSpeedSnapshot?: CodexSpeedSelectionSnapshot;
  selectCodexModelResult?: CodexModelSelectionResult;
  selectCodexReasoningResult?: CodexReasoningSelectionResult;
  selectCodexSpeedResult?: CodexSpeedSelectionResult;
  resolveCodexPreferencesErrorMessage?: string;
  listCodexModelsErrorMessage?: string;
  listCodexReasoningErrorMessage?: string;
  listCodexSpeedErrorMessage?: string;
  forceSelectBlockedPlanSpec?: boolean;
  forceSelectBlockedDiscoverSpec?: boolean;
  disablePlanSpecCallbacks?: boolean;
  disableDiscoverSpecCallbacks?: boolean;
  planSpecQuestionCallbackOutcome?: PlanSpecControlOutcome;
  planSpecFinalCallbackOutcome?: PlanSpecControlOutcome;
  discoverSpecQuestionCallbackOutcome?: PlanSpecControlOutcome;
  discoverSpecFinalCallbackOutcome?: PlanSpecControlOutcome;
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

const createResolvedCodexPreferences = (
  value: Partial<CodexResolvedProjectPreferences> = {},
): CodexResolvedProjectPreferences => ({
  model: "gpt-5.4",
  reasoningEffort: "xhigh",
  speed: "standard",
  updatedAt: new Date("2026-03-13T00:00:00.000Z"),
  source: "runner-local",
  sources: {
    model: "runner-local",
    reasoningEffort: "runner-local",
    speed: "runner-local",
  },
  catalogFetchedAt: new Date("2026-03-13T00:00:00.000Z"),
  modelDisplayName: "gpt-5.4",
  modelDescription: "Modelo principal de teste",
  modelVisibility: "list",
  modelSelectable: true,
  supportedReasoningLevels: [
    { effort: "low", description: "Fast responses" },
    { effort: "medium", description: "Balanced reasoning" },
    { effort: "high", description: "Deep reasoning" },
    { effort: "xhigh", description: "Extra deep reasoning" },
  ],
  defaultReasoningEffort: "medium",
  reasoningAdjustedFrom: null,
  fastModeSupported: true,
  speedAdjustedFrom: null,
  ...value,
  project: cloneProject(value.project ?? defaultActiveProject),
});

const createCodexModelSnapshot = (
  value: Partial<CodexModelSelectionSnapshot> = {},
): CodexModelSelectionSnapshot => {
  const current = value.current ?? createResolvedCodexPreferences();
  return {
    project: cloneProject(value.project ?? current.project),
    current,
    models: value.models ?? [
      {
        slug: "gpt-5.4",
        displayName: "gpt-5.4",
        description: "Modelo principal de teste",
        visibility: "list",
        selectable: true,
        active: current.model === "gpt-5.4",
        defaultReasoningEffort: "medium",
        supportedReasoningLevels: current.supportedReasoningLevels,
      },
      {
        slug: "gpt-5.3-codex",
        displayName: "gpt-5.3-codex",
        description: "Modelo alternativo",
        visibility: "list",
        selectable: true,
        active: current.model === "gpt-5.3-codex",
        defaultReasoningEffort: "medium",
        supportedReasoningLevels: current.supportedReasoningLevels,
      },
    ],
  };
};

const createCodexReasoningSnapshot = (
  value: Partial<CodexReasoningSelectionSnapshot> = {},
): CodexReasoningSelectionSnapshot => {
  const current = value.current ?? createResolvedCodexPreferences();
  return {
    project: cloneProject(value.project ?? current.project),
    current,
    reasoningLevels: value.reasoningLevels ?? current.supportedReasoningLevels.map((level) => ({
      ...level,
      active: level.effort === current.reasoningEffort,
    })),
  };
};

const createCodexSpeedSnapshot = (
  value: Partial<CodexSpeedSelectionSnapshot> = {},
): CodexSpeedSelectionSnapshot => {
  const current = value.current ?? createResolvedCodexPreferences();
  return {
    project: cloneProject(value.project ?? current.project),
    current,
    speedOptions: value.speedOptions ?? [
      {
        slug: "standard",
        label: "Standard",
        description: "Modo padrao",
        selectable: true,
        active: current.speed === "standard",
      },
      {
        slug: "fast",
        label: "Fast",
        description: current.fastModeSupported ? "Fast mode" : "Indisponivel",
        selectable: current.fastModeSupported,
        active: current.speed === "fast",
      },
    ],
  };
};

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
    targetPrepareCalls: 0,
    targetPrepareArgs: [] as Array<string | null | undefined>,
    targetCheckupCalls: 0,
    targetCheckupArgs: [] as Array<string | null | undefined>,
    targetDeriveCalls: 0,
    targetDeriveArgs: [] as Array<{ projectName: string | null | undefined; reportPath: string }>,
    targetPrepareCancelCalls: 0,
    targetCheckupCancelCalls: 0,
    targetDeriveCancelCalls: 0,
    runAllCalls: 0,
    runSpecsCalls: 0,
    runSpecsArgs: [] as string[],
    runSpecsFromValidationCalls: 0,
    runSpecsFromValidationArgs: [] as string[],
    listOpenTicketsCalls: 0,
    readOpenTicketCalls: 0,
    readOpenTicketArgs: [] as string[],
    runSelectedTicketCalls: 0,
    runSelectedTicketArgs: [] as string[],
    discoverSpecStartCalls: 0,
    discoverSpecStartChatIds: [] as string[],
    discoverSpecInputCalls: 0,
    discoverSpecInputCallsByChat: [] as { chatId: string; input: string }[],
    discoverSpecCancelCalls: 0,
    discoverSpecCancelChatIds: [] as string[],
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
    listCodexModelsCalls: 0,
    selectCodexModelCalls: 0,
    selectedCodexModels: [] as string[],
    listCodexReasoningCalls: 0,
    selectCodexReasoningCalls: 0,
    selectedCodexReasoningLevels: [] as string[],
    listCodexSpeedCalls: 0,
    selectCodexSpeedCalls: 0,
    selectedCodexSpeeds: [] as string[],
    resolveCodexProjectPreferencesCalls: [] as ProjectRef[],
    planSpecQuestionSelections: [] as string[],
    planSpecFinalActions: [] as PlanSpecFinalActionId[],
    discoverSpecQuestionSelections: [] as string[],
    discoverSpecFinalActions: [] as PlanSpecFinalActionId[],
  };

  const stateGetter = options.getState ?? (() => createState());
  const mutableSnapshot = cloneSnapshot(options.projectSnapshot ?? createDefaultProjectSnapshot());
  let mutableCodexModelSnapshot = createCodexModelSnapshot(options.codexModelSnapshot);
  let mutableCodexReasoningSnapshot = createCodexReasoningSnapshot(options.codexReasoningSnapshot);
  let mutableCodexSpeedSnapshot = createCodexSpeedSnapshot(options.codexSpeedSnapshot);
  const mutableEligibleSpecs = (options.eligibleSpecs ?? createDefaultEligibleSpecs())
    .map(cloneEligibleSpec);
  const mutableOpenTickets = (options.openTickets ?? createDefaultOpenTickets())
    .map(cloneOpenTicket);

  const controls = {
    targetPrepare: (projectName?: string | null) => {
      controlState.targetPrepareCalls += 1;
      controlState.targetPrepareArgs.push(projectName);
      if (options.targetPrepareResult) {
        return options.targetPrepareResult;
      }

      const resolvedProjectName = projectName ?? defaultActiveProject.name;
      return {
        status: "completed" as const,
        summary: {
          targetProject: {
            name: resolvedProjectName,
            path: `/home/mapita/projetos/${resolvedProjectName}`,
          },
          eligibleForProjects: true,
          compatibleWithWorkflowComplete: true,
          nextAction: `Selecionar o projeto por /select_project ${resolvedProjectName} ou pelo menu /projects.`,
          manifestPath: "docs/workflows/target-prepare-manifest.json",
          reportPath: "docs/workflows/target-prepare-report.md",
          changedPaths: [
            "AGENTS.md",
            "README.md",
            "docs/workflows/target-prepare-manifest.json",
            "docs/workflows/target-prepare-report.md",
          ],
          versioning: {
            status: "committed-and-pushed" as const,
            commitHash: "prepare123",
            upstream: "origin/main",
            commitPushId: "prepare123@origin/main",
          },
        },
      };
    },
    cancelTargetPrepare: () => {
      controlState.targetPrepareCancelCalls += 1;
      return (
        options.targetPrepareCancelResult ?? {
          status: "inactive" as const,
          message: "Nenhuma execucao /target_prepare ativa no momento.",
        }
      );
    },
    targetCheckup: (projectName?: string | null) => {
      controlState.targetCheckupCalls += 1;
      controlState.targetCheckupArgs.push(projectName);
      if (options.targetCheckupResult) {
        return options.targetCheckupResult;
      }

      const resolvedProjectName = projectName ?? "codex-flow-runner";
      return {
        status: "completed" as const,
        summary: {
          targetProject: {
            name: resolvedProjectName,
            path: `/home/mapita/projetos/${resolvedProjectName}`,
          },
          analyzedHeadSha: "abc123",
          branch: "main",
          overallVerdict: "invalid_for_gap_ticket_derivation" as const,
          reportJsonPath:
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.json",
          reportMarkdownPath:
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.md",
          reportCommitSha: "report123",
          changedPaths: [
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.json",
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.md",
          ],
          nextAction:
            "Corrija os gaps registrados, garanta novo snapshot limpo e rerode /target_checkup.",
          versioning: {
            status: "committed-and-pushed" as const,
            metadataCommitHash: "meta456",
            reportCommitHash: "report123",
            upstream: "origin/main",
            commitPushId: "meta456@origin/main",
          },
        },
      };
    },
    cancelTargetCheckup: () => {
      controlState.targetCheckupCancelCalls += 1;
      return (
        options.targetCheckupCancelResult ?? {
          status: "inactive" as const,
          message: "Nenhuma execucao /target_checkup ativa no momento.",
        }
      );
    },
    targetDerive: (projectName: string | null | undefined, reportPath: string) => {
      controlState.targetDeriveCalls += 1;
      controlState.targetDeriveArgs.push({ projectName, reportPath });
      if (options.targetDeriveResult) {
        return options.targetDeriveResult;
      }

      const resolvedProjectName = projectName ?? defaultActiveProject.name;
      return {
        status: "completed" as const,
        summary: {
          targetProject: {
            name: resolvedProjectName,
            path: `/home/mapita/projetos/${resolvedProjectName}`,
          },
          analyzedHeadSha: "abc123",
          reportJsonPath: "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.json",
          reportMarkdownPath:
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.md",
          reportCommitSha: "report123",
          completionMode: "applied" as const,
          derivationStatus: "materialized" as const,
          changedPaths: [
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.json",
            "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.md",
            "tickets/open/2026-03-24-readiness-gap-example-abc123.md",
          ],
          touchedTicketPaths: [
            "tickets/open/2026-03-24-readiness-gap-example-abc123.md",
          ],
          gapResults: [
            {
              gapId: "readiness-gap-id|abc123def456",
              gapFingerprint: "readiness-gap|abc123def456",
              result: "materialized_as_ticket" as const,
              ticketPaths: ["tickets/open/2026-03-24-readiness-gap-example-abc123.md"],
            },
          ],
          nextAction:
            "Revise os tickets readiness derivados no projeto alvo e siga o fluxo sequencial normal de execucao.",
          versioning: {
            status: "committed-and-pushed" as const,
            commitHash: "derive123",
            upstream: "origin/main",
            commitPushId: "derive123@origin/main",
          },
        },
      };
    },
    cancelTargetDerive: () => {
      controlState.targetDeriveCancelCalls += 1;
      return (
        options.targetDeriveCancelResult ?? {
          status: "inactive" as const,
          message: "Nenhuma execucao /target_derive_gaps ativa no momento.",
        }
      );
    },
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
    startDiscoverSpecSession: (chatId: string) => {
      controlState.discoverSpecStartCalls += 1;
      controlState.discoverSpecStartChatIds.push(chatId);
      if (options.discoverSpecStartResult) {
        return options.discoverSpecStartResult;
      }

      return {
        status: "started" as const,
        message: "Sessao /discover_spec iniciada. Envie a proxima mensagem com o brief inicial.",
      };
    },
    submitDiscoverSpecInput: (chatId: string, input: string) => {
      controlState.discoverSpecInputCalls += 1;
      controlState.discoverSpecInputCallsByChat.push({ chatId, input });
      if (options.discoverSpecInputResult) {
        return options.discoverSpecInputResult;
      }

      return {
        status: "accepted" as const,
        message: "Mensagem encaminhada para a sessao /discover_spec.",
      };
    },
    cancelDiscoverSpecSession: (chatId: string) => {
      controlState.discoverSpecCancelCalls += 1;
      controlState.discoverSpecCancelChatIds.push(chatId);
      if (options.discoverSpecCancelResult) {
        return options.discoverSpecCancelResult;
      }

      return {
        status: "cancelled" as const,
        message: "Sessao /discover_spec cancelada.",
      };
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
    runSpecsFromValidation: (specFileName: string) => {
      controlState.runSpecsFromValidationCalls += 1;
      controlState.runSpecsFromValidationArgs.push(specFileName);
      if (options.runSpecsFromValidationStatus === "already-running") {
        return { status: "already-running" as const };
      }

      if (options.runSpecsFromValidationStatus === "validation-blocked") {
        return {
          status: "validation-blocked" as const,
          message:
            options.runSpecsFromValidationMessage ??
            "Nao existe backlog derivado aberto reaproveitavel para a spec informada.",
        };
      }

      if (options.runSpecsFromValidationStatus === "validation-failed") {
        return {
          status: "validation-failed" as const,
          message:
            options.runSpecsFromValidationMessage ??
            "Falha ao validar o backlog derivado aberto para a spec informada.",
        };
      }

      if (options.runSpecsFromValidationStatus === "blocked") {
        return {
          status: "blocked" as const,
          reason: "codex-auth-missing" as const,
          message:
            options.runSpecsFromValidationMessage ??
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
    listCodexModels: () => {
      controlState.listCodexModelsCalls += 1;
      if (options.listCodexModelsErrorMessage) {
        throw new Error(options.listCodexModelsErrorMessage);
      }

      return createCodexModelSnapshot(mutableCodexModelSnapshot);
    },
    selectCodexModel: (model: string) => {
      controlState.selectCodexModelCalls += 1;
      controlState.selectedCodexModels.push(model);
      if (options.selectCodexModelResult) {
        return options.selectCodexModelResult;
      }

      const target = mutableCodexModelSnapshot.models.find((entry) => entry.slug === model);
      if (!target) {
        return {
          status: "not-found" as const,
          model,
          current: createResolvedCodexPreferences(mutableCodexModelSnapshot.current),
          availableModels: mutableCodexModelSnapshot.models.map((entry) => entry.slug),
        };
      }

      const previousModel = mutableCodexModelSnapshot.current.model;
      const previousSpeed = mutableCodexModelSnapshot.current.speed;
      const speedResetFrom =
        previousSpeed === "fast" && target.slug !== "gpt-5.4" ? ("fast" as const) : null;
      mutableCodexModelSnapshot = createCodexModelSnapshot({
        ...mutableCodexModelSnapshot,
        current: createResolvedCodexPreferences({
          ...mutableCodexModelSnapshot.current,
          model: target.slug,
          modelDisplayName: target.displayName,
          modelDescription: target.description,
          modelVisibility: target.visibility,
          modelSelectable: target.selectable,
          fastModeSupported: target.slug === "gpt-5.4",
          speed: target.slug === "gpt-5.4" ? mutableCodexModelSnapshot.current.speed : "standard",
          supportedReasoningLevels: target.supportedReasoningLevels.map((level) => ({ ...level })),
        }),
        models: mutableCodexModelSnapshot.models.map((entry) => ({
          ...entry,
          active: entry.slug === target.slug,
        })),
      });
      mutableCodexReasoningSnapshot = createCodexReasoningSnapshot({
        current: createResolvedCodexPreferences({
          ...mutableCodexReasoningSnapshot.current,
          model: target.slug,
          modelDisplayName: target.displayName,
          modelDescription: target.description,
          modelVisibility: target.visibility,
          modelSelectable: target.selectable,
          fastModeSupported: target.slug === "gpt-5.4",
          speed: target.slug === "gpt-5.4" ? mutableCodexReasoningSnapshot.current.speed : "standard",
          supportedReasoningLevels: target.supportedReasoningLevels.map((level) => ({ ...level })),
        }),
      });
      mutableCodexSpeedSnapshot = createCodexSpeedSnapshot({
        current: createResolvedCodexPreferences({
          ...mutableCodexSpeedSnapshot.current,
          model: target.slug,
          modelDisplayName: target.displayName,
          modelDescription: target.description,
          modelVisibility: target.visibility,
          modelSelectable: target.selectable,
          fastModeSupported: target.slug === "gpt-5.4",
          speed: target.slug === "gpt-5.4" ? mutableCodexSpeedSnapshot.current.speed : "standard",
          supportedReasoningLevels: target.supportedReasoningLevels.map((level) => ({ ...level })),
        }),
      });

      return {
        status: "selected" as const,
        current: createResolvedCodexPreferences(mutableCodexModelSnapshot.current),
        previousModel,
        reasoningResetFrom: null,
        speedResetFrom,
      };
    },
    listCodexReasoning: () => {
      controlState.listCodexReasoningCalls += 1;
      if (options.listCodexReasoningErrorMessage) {
        throw new Error(options.listCodexReasoningErrorMessage);
      }

      return createCodexReasoningSnapshot(mutableCodexReasoningSnapshot);
    },
    selectCodexReasoning: (effort: string) => {
      controlState.selectCodexReasoningCalls += 1;
      controlState.selectedCodexReasoningLevels.push(effort);
      if (options.selectCodexReasoningResult) {
        return options.selectCodexReasoningResult;
      }

      const supported = mutableCodexReasoningSnapshot.reasoningLevels.find((level) => level.effort === effort);
      if (!supported) {
        return {
          status: "not-supported" as const,
          effort,
          current: createResolvedCodexPreferences(mutableCodexReasoningSnapshot.current),
          supportedEfforts: mutableCodexReasoningSnapshot.reasoningLevels.map((level) => level.effort),
        };
      }

      const previousReasoningEffort = mutableCodexReasoningSnapshot.current.reasoningEffort;
      mutableCodexReasoningSnapshot = createCodexReasoningSnapshot({
        ...mutableCodexReasoningSnapshot,
        current: createResolvedCodexPreferences({
          ...mutableCodexReasoningSnapshot.current,
          reasoningEffort: effort,
        }),
        reasoningLevels: mutableCodexReasoningSnapshot.reasoningLevels.map((level) => ({
          ...level,
          active: level.effort === effort,
        })),
      });
      mutableCodexModelSnapshot = createCodexModelSnapshot({
        ...mutableCodexModelSnapshot,
        current: createResolvedCodexPreferences({
          ...mutableCodexModelSnapshot.current,
          reasoningEffort: effort,
        }),
      });

      return {
        status: "selected" as const,
        current: createResolvedCodexPreferences(mutableCodexReasoningSnapshot.current),
        previousReasoningEffort,
      };
    },
    listCodexSpeed: () => {
      controlState.listCodexSpeedCalls += 1;
      if (options.listCodexSpeedErrorMessage) {
        throw new Error(options.listCodexSpeedErrorMessage);
      }

      return createCodexSpeedSnapshot(mutableCodexSpeedSnapshot);
    },
    selectCodexSpeed: (speed: string) => {
      controlState.selectCodexSpeedCalls += 1;
      controlState.selectedCodexSpeeds.push(speed);
      if (options.selectCodexSpeedResult) {
        return options.selectCodexSpeedResult;
      }

      const supported = mutableCodexSpeedSnapshot.speedOptions.find((option) => option.slug === speed);
      if (!supported || !supported.selectable) {
        return {
          status: "not-supported" as const,
          speed,
          current: createResolvedCodexPreferences(mutableCodexSpeedSnapshot.current),
          supportedSpeeds: mutableCodexSpeedSnapshot.speedOptions
            .filter((option) => option.selectable)
            .map((option) => option.slug),
        };
      }

      const previousSpeed = mutableCodexSpeedSnapshot.current.speed;
      mutableCodexSpeedSnapshot = createCodexSpeedSnapshot({
        ...mutableCodexSpeedSnapshot,
        current: createResolvedCodexPreferences({
          ...mutableCodexSpeedSnapshot.current,
          speed: supported.slug,
        }),
        speedOptions: mutableCodexSpeedSnapshot.speedOptions.map((option) => ({
          ...option,
          active: option.slug === supported.slug,
        })),
      });
      mutableCodexModelSnapshot = createCodexModelSnapshot({
        ...mutableCodexModelSnapshot,
        current: createResolvedCodexPreferences({
          ...mutableCodexModelSnapshot.current,
          speed: supported.slug,
        }),
      });
      mutableCodexReasoningSnapshot = createCodexReasoningSnapshot({
        ...mutableCodexReasoningSnapshot,
        current: createResolvedCodexPreferences({
          ...mutableCodexReasoningSnapshot.current,
          speed: supported.slug,
        }),
      });

      return {
        status: "selected" as const,
        current: createResolvedCodexPreferences(mutableCodexSpeedSnapshot.current),
        previousSpeed,
      };
    },
    resolveCodexProjectPreferences: (project: ProjectRef) => {
      controlState.resolveCodexProjectPreferencesCalls.push(cloneProject(project));
      if (options.resolveCodexPreferencesErrorMessage) {
        throw new Error(options.resolveCodexPreferencesErrorMessage);
      }

      return createResolvedCodexPreferences({
        ...mutableCodexModelSnapshot.current,
        project,
      });
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

      if (options.forceSelectBlockedDiscoverSpec) {
        return { status: "blocked-discover-spec" as const };
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
    onDiscoverSpecQuestionOptionSelected: options.disableDiscoverSpecCallbacks
      ? undefined
      : (chatId: string, optionValue: string) => {
        controlState.discoverSpecInputCallsByChat.push({
          chatId,
          input: `callback:${optionValue}`,
        });
        controlState.discoverSpecQuestionSelections.push(optionValue);
        return options.discoverSpecQuestionCallbackOutcome ?? { status: "accepted" as const };
      },
    onDiscoverSpecFinalActionSelected: options.disableDiscoverSpecCallbacks
      ? undefined
      : (chatId: string, action: PlanSpecFinalActionId) => {
        controlState.discoverSpecInputCallsByChat.push({
          chatId,
          input: `final:${action}`,
        });
        controlState.discoverSpecFinalActions.push(action);
        return options.discoverSpecFinalCallbackOutcome ?? { status: "accepted" as const };
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

const callHandleTargetPrepareCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTargetPrepareCommand: (
      value: {
        chat: { id: number };
        message?: { text?: string };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
    ) => Promise<void>;
  };

  await internalController.handleTargetPrepareCommand(context);
};

const callHandleTargetCheckupCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTargetCheckupCommand: (
      value: {
        chat: { id: number };
        message?: { text?: string };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
    ) => Promise<void>;
  };

  await internalController.handleTargetCheckupCommand(context);
};

const callHandleTargetDeriveCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTargetDeriveCommand: (
      value: {
        chat: { id: number };
        message?: { text?: string };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
    ) => Promise<void>;
  };

  await internalController.handleTargetDeriveCommand(context);
};

const callHandleTargetPrepareStatusCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTargetPrepareStatusCommand: (
      value: {
        chat: { id: number };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
    ) => Promise<void>;
  };

  await internalController.handleTargetPrepareStatusCommand(context);
};

const callHandleTargetPrepareCancelCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTargetPrepareCancelCommand: (
      value: {
        chat: { id: number };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
    ) => Promise<void>;
  };

  await internalController.handleTargetPrepareCancelCommand(context);
};

const callHandleTargetCheckupCancelCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleTargetCheckupCancelCommand: (
      value: {
        chat: { id: number };
        reply: (text: string, extra?: unknown) => Promise<unknown>;
      },
    ) => Promise<void>;
  };

  await internalController.handleTargetCheckupCancelCommand(context);
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

const callBuildRunSpecsFromValidationReply = async (
  controller: TelegramController,
  specFileName: string,
): Promise<{ reply: string; started: boolean }> => {
  const internalController = controller as unknown as {
    buildRunSpecsFromValidationReply: (context: {
      chatId: string;
      specFileName: string;
    }) => Promise<{ reply: string; started: boolean }>;
  };

  return internalController.buildRunSpecsFromValidationReply({
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

const callBuildStatusReply = (
  controller: TelegramController,
  state: RunnerState,
  codexPreferencesByProject: Map<string, CodexResolvedProjectPreferences | Error> = new Map(),
): string => {
  const internalController = controller as unknown as {
    buildStatusReply: (
      value: RunnerState,
      codexPreferencesByProject?: Map<string, CodexResolvedProjectPreferences | Error>,
    ) => string;
  };

  return internalController.buildStatusReply(state, codexPreferencesByProject);
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

const callHandleModelsCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleModelsCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleModelsCommand(context);
};

const callHandleReasoningCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleReasoningCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleReasoningCommand(context);
};

const callHandleSpeedCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleSpeedCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleSpeedCommand(context);
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

const callHandleRunSpecsFromValidationCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleRunSpecsFromValidationCommand: (value: {
      chat: { id: number };
      message?: { text?: string };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleRunSpecsFromValidationCommand(context);
};

const callHandleDiscoverSpecCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    message?: { text?: string };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleDiscoverSpecCommand: (value: {
      chat: { id: number };
      message?: { text?: string };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleDiscoverSpecCommand(context);
};

const callHandleDiscoverSpecStatusCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleDiscoverSpecStatusCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleDiscoverSpecStatusCommand(context);
};

const callHandleDiscoverSpecCancelCommand = async (
  controller: TelegramController,
  context: {
    chat: { id: number };
    reply: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleDiscoverSpecCancelCommand: (value: {
      chat: { id: number };
      reply: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleDiscoverSpecCancelCommand(context);
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

const callHandleModelsCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string; from?: { id: number } };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleModelsCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string; from?: { id: number } };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleModelsCallbackQuery(context);
};

const callHandleReasoningCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string; from?: { id: number } };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleReasoningCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string; from?: { id: number } };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleReasoningCallbackQuery(context);
};

const callHandleSpeedCallbackQuery = async (
  controller: TelegramController,
  context: {
    chat?: { id: number };
    callbackQuery: { data?: string; from?: { id: number } };
    answerCbQuery: (text?: string) => Promise<unknown>;
    editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
  },
): Promise<void> => {
  const internalController = controller as unknown as {
    handleSpeedCallbackQuery: (value: {
      chat?: { id: number };
      callbackQuery: { data?: string; from?: { id: number } };
      answerCbQuery: (text?: string) => Promise<unknown>;
      editMessageText: (text: string, extra?: unknown) => Promise<unknown>;
    }) => Promise<void>;
  };

  await internalController.handleSpeedCallbackQuery(context);
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
): TicketFinalSuccessSummary => {
  const baseTiming = createTicketTimingSnapshot();
  const base: TicketFinalSuccessSummary = {
    ticket: "2026-02-19-flow-a.md",
    activeProjectName: "codex-flow-runner",
    activeProjectPath: "/home/mapita/projetos/codex-flow-runner",
    status: "success",
    finalStage: "close-and-version",
    timestampUtc: "2026-02-19T15:00:00.000Z",
    timing: baseTiming,
    execPlanPath: "execplans/2026-02-19-flow-a.md",
    commitPushId: "abc123@origin/main",
    commitHash: "abc123",
    pushUpstream: "origin/main",
  };
  return {
    ...base,
    ...value,
    timing: value.timing ?? baseTiming,
  };
};

const createFailureSummary = (
  value: Partial<TicketFinalFailureSummary> = {},
): TicketFinalFailureSummary => {
  const baseTiming = createTicketTimingSnapshot({
    finishedAtUtc: "2026-02-19T14:59:10.000Z",
    totalDurationMs: 70000,
    durationsByStageMs: {
      plan: 45000,
      implement: 25000,
    },
    completedStages: ["plan"],
    interruptedStage: "implement",
  });
  const base: TicketFinalFailureSummary = {
    ticket: "2026-02-19-flow-a.md",
    activeProjectName: "codex-flow-runner",
    activeProjectPath: "/home/mapita/projetos/codex-flow-runner",
    status: "failure",
    finalStage: "implement",
    timestampUtc: "2026-02-19T15:00:00.000Z",
    timing: baseTiming,
    errorMessage: "falha simulada",
  };
  return {
    ...base,
    ...value,
    timing: value.timing ?? baseTiming,
  };
};

const createRunAllFlowSummary = (
  value: Partial<RunAllFlowSummary> = {},
): RunAllFlowSummary => {
  const baseTiming = createRunAllTimingSnapshot();
  const base: RunAllFlowSummary = {
    flow: "run-all",
    outcome: "success",
    finalStage: "select-ticket",
    completionReason: "queue-empty",
    timestampUtc: "2026-02-19T15:08:00.000Z",
    activeProjectName: "codex-flow-runner",
    activeProjectPath: "/home/mapita/projetos/codex-flow-runner",
    processedTicketsCount: 2,
    maxTicketsPerRound: 5,
    codexPreferences: createFlowCodexPreferencesSnapshot(),
    timing: baseTiming,
  };

  return {
    ...base,
    ...value,
    timing: value.timing ?? baseTiming,
  };
};

const createRunSpecsFlowSummary = (
  value: Partial<RunSpecsFlowSummary> = {},
): RunSpecsFlowSummary => {
  const baseTiming = createRunSpecsFlowTimingSnapshot();
  const baseTriageTiming = createRunSpecsTriageTimingSnapshot();
  const baseCodexPreferences = createFlowCodexPreferencesSnapshot({
    model: "gpt-5.4",
    reasoningEffort: "high",
    speed: "fast",
  });
  const base: RunSpecsFlowSummary = {
    flow: "run-specs",
    outcome: "success",
    finalStage: "spec-audit",
    completionReason: "completed",
    timestampUtc: "2026-02-19T15:09:00.000Z",
    activeProjectName: "codex-flow-runner",
    activeProjectPath: "/home/mapita/projetos/codex-flow-runner",
    codexPreferences: baseCodexPreferences,
    spec: {
      fileName: "2026-02-19-approved-spec-triage-run-specs.md",
      path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
    },
    sourceCommand: "/run_specs",
    entryPoint: "spec-triage",
    triageTiming: baseTriageTiming,
    timing: baseTiming,
    runAllSummary: createRunAllFlowSummary({
      codexPreferences: baseCodexPreferences,
    }),
  };

  return {
    ...base,
    ...value,
    triageTiming: value.triageTiming ?? baseTriageTiming,
    timing: value.timing ?? baseTiming,
  };
};

const assertOrderedSubstrings = (text: string, substrings: string[]): void => {
  let previousIndex = -1;
  for (const substring of substrings) {
    const currentIndex = text.indexOf(substring);
    assert.notEqual(currentIndex, -1, `trecho ausente: ${substring}`);
    assert.ok(currentIndex > previousIndex, `ordem inesperada para: ${substring}`);
    previousIndex = currentIndex;
  }
};

const countOccurrences = (text: string, substring: string): number =>
  text.split(substring).length - 1;

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

test("handleTargetPrepareCommand usa o projeto ativo quando nenhum argumento e informado", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetPrepareCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_prepare" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetPrepareCalls, 1);
  assert.deepEqual(controlState.targetPrepareArgs, [null]);
  assert.match(replies[0] ?? "", /\/target_prepare concluido para codex-flow-runner/u);
  assert.match(replies[0] ?? "", /Elegivel para \/projects: sim/u);
});

test("handleTargetPrepareCommand responde com resumo final rastreavel no caminho feliz", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetPrepareCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_prepare alpha-project" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetPrepareCalls, 1);
  assert.deepEqual(controlState.targetPrepareArgs, ["alpha-project"]);
  assert.match(replies[0] ?? "", /\/target_prepare concluido para alpha-project/u);
  assert.match(replies[0] ?? "", /Elegivel para \/projects: sim/u);
  assert.match(replies[0] ?? "", /Compativel com workflow completo: sim/u);
  assert.match(replies[0] ?? "", /Manifesto: docs\/workflows\/target-prepare-manifest\.json/u);
  assert.match(replies[0] ?? "", /Proxima acao: Selecionar o projeto/u);
});

test("handleTargetPrepareCommand responde com CTA de acompanhamento quando o fluxo inicia de forma assincrona", async () => {
  const { controller, controlState } = createController({
    targetPrepareResult: {
      status: "started",
      message: "Execucao /target_prepare iniciada para alpha-project.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetPrepareCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_prepare alpha-project" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetPrepareCalls, 1);
  assert.deepEqual(controlState.targetPrepareArgs, ["alpha-project"]);
  assert.match(replies[0] ?? "", /Execucao \/target_prepare iniciada para alpha-project/u);
  assert.match(replies[0] ?? "", /\/target_prepare_status/u);
  assert.match(replies[0] ?? "", /\/target_prepare_cancel/u);
});

test("handleTargetPrepareCommand propaga bloqueio objetivo do executor", async () => {
  const { controller, controlState } = createController({
    targetPrepareResult: {
      status: "blocked",
      reason: "project-not-found",
      message: "Projeto alvo nao encontrado para /target_prepare: missing-project.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetPrepareCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_prepare missing-project" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetPrepareCalls, 1);
  assert.deepEqual(controlState.targetPrepareArgs, ["missing-project"]);
  assert.deepEqual(replies, ["❌ Projeto alvo nao encontrado para /target_prepare: missing-project."]);
});

test("handleTargetPrepareStatusCommand informa ausencia quando nao ha fluxo ativo", async () => {
  const { controller } = createController();
  const replies: string[] = [];

  await callHandleTargetPrepareStatusCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.deepEqual(replies, ["ℹ️ Nenhuma execucao /target_prepare ativa no momento."]);
});

test("handleTargetPrepareStatusCommand renderiza milestone e fronteira do fluxo ativo", async () => {
  const state = createState({
    targetFlow: {
      flow: "target-prepare",
      command: "/target_prepare",
      targetProject: {
        name: "alpha-project",
        path: "/home/mapita/projetos/alpha-project",
      },
      phase: "target-prepare-ai-adjustment",
      milestone: "ai-adjustment",
      milestoneLabel: "adequacao por IA",
      versionBoundaryState: "before-versioning",
      cancelRequestedAt: null,
      startedAt: new Date("2026-03-24T23:00:00.000Z"),
      updatedAt: new Date("2026-03-24T23:01:00.000Z"),
      lastMessage: "Adequacao por IA em andamento.",
    },
  });
  const { controller } = createController({
    getState: () => state,
  });
  const replies: string[] = [];

  await callHandleTargetPrepareStatusCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.match(replies[0] ?? "", /Status de \/target_prepare/u);
  assert.match(replies[0] ?? "", /Projeto alvo: alpha-project/u);
  assert.match(replies[0] ?? "", /Milestone atual: adequacao por IA/u);
  assert.match(replies[0] ?? "", /Fronteira de versionamento: before-versioning/u);
  assert.match(replies[0] ?? "", /Detalhe: Adequacao por IA em andamento\./u);
});

test("handleTargetPrepareCancelCommand confirma cancelamento cooperativo aceito", async () => {
  const { controller, controlState } = createController({
    targetPrepareCancelResult: {
      status: "accepted",
      message:
        "Cancelamento de /target_prepare solicitado. O fluxo sera encerrado no proximo checkpoint seguro antes de versionar.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetPrepareCancelCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetPrepareCancelCalls, 1);
  assert.deepEqual(replies, [
    "✅ Cancelamento de /target_prepare solicitado. O fluxo sera encerrado no proximo checkpoint seguro antes de versionar.",
  ]);
});

test("handleTargetCheckupCommand usa o projeto ativo quando nenhum argumento e informado", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetCheckupCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_checkup" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetCheckupCalls, 1);
  assert.deepEqual(controlState.targetCheckupArgs, [null]);
  assert.match(replies[0] ?? "", /\/target_checkup concluido para codex-flow-runner/u);
  assert.match(replies[0] ?? "", /Veredito geral: invalid_for_gap_ticket_derivation/u);
  assert.match(replies[0] ?? "", /report_commit_sha: report123/u);
});

test("handleTargetCheckupCommand aceita alvo explicito e responde com resumo rastreavel", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetCheckupCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_checkup alpha-project" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetCheckupCalls, 1);
  assert.deepEqual(controlState.targetCheckupArgs, ["alpha-project"]);
  assert.match(replies[0] ?? "", /\/target_checkup concluido para alpha-project/u);
  assert.match(replies[0] ?? "", /Relatorio JSON: docs\/checkups\/history\//u);
  assert.match(replies[0] ?? "", /Versionamento final: meta456@origin\/main/u);
});

test("handleTargetCheckupCommand propaga bloqueio objetivo do executor", async () => {
  const { controller, controlState } = createController({
    targetCheckupResult: {
      status: "blocked",
      reason: "working-tree-dirty",
      message: "O target_checkup exige working tree limpo antes de iniciar.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetCheckupCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_checkup alpha-project" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetCheckupCalls, 1);
  assert.deepEqual(controlState.targetCheckupArgs, ["alpha-project"]);
  assert.deepEqual(replies, ["❌ O target_checkup exige working tree limpo antes de iniciar."]);
});

test("handleTargetCheckupCancelCommand traduz cancelamento tardio depois da fronteira", async () => {
  const { controller, controlState } = createController({
    targetCheckupCancelResult: {
      status: "late",
      message:
        "/target_checkup ja cruzou a fronteira de versionamento; cancelamento tardio nao sera aplicado automaticamente.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetCheckupCancelCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetCheckupCancelCalls, 1);
  assert.deepEqual(replies, [
    "ℹ️ /target_checkup ja cruzou a fronteira de versionamento; cancelamento tardio nao sera aplicado automaticamente.",
  ]);
});

test("handleTargetDeriveCommand exige report-path explicito quando nenhum argumento e informado", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetDeriveCommand(controller, {
    chat: { id: 42 },
    message: { text: "/target_derive_gaps" },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetDeriveCalls, 0);
  assert.deepEqual(replies, ["ℹ️ Uso: /target_derive_gaps [nome-do-projeto] <report-path>."]);
});

test("handleTargetDeriveCommand usa o projeto ativo quando apenas report-path e informado", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetDeriveCommand(controller, {
    chat: { id: 42 },
    message: {
      text: "/target_derive_gaps docs/checkups/history/report.json",
    },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetDeriveCalls, 1);
  assert.deepEqual(controlState.targetDeriveArgs, [
    {
      projectName: null,
      reportPath: "docs/checkups/history/report.json",
    },
  ]);
  assert.match(replies[0] ?? "", /\/target_derive_gaps concluido para codex-flow-runner/u);
  assert.match(replies[0] ?? "", /Status da derivacao: materialized/u);
});

test("handleTargetDeriveCommand aceita args explicitos e responde com resumo rastreavel", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleTargetDeriveCommand(controller, {
    chat: { id: 42 },
    message: {
      text: "/target_derive_gaps alpha-project docs/checkups/history/report.json",
    },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetDeriveCalls, 1);
  assert.deepEqual(controlState.targetDeriveArgs, [
    {
      projectName: "alpha-project",
      reportPath: "docs/checkups/history/report.json",
    },
  ]);
  assert.match(replies[0] ?? "", /\/target_derive_gaps concluido para alpha-project/u);
  assert.match(replies[0] ?? "", /Status da derivacao: materialized/u);
  assert.match(replies[0] ?? "", /Versionamento: derive123@origin\/main/u);
});

test("handleTargetDeriveCommand responde com CTA de acompanhamento quando o fluxo inicia de forma assincrona", async () => {
  const { controller, controlState } = createController({
    targetDeriveResult: {
      status: "started",
      message: "Execucao /target_derive_gaps iniciada para alpha-project.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetDeriveCommand(controller, {
    chat: { id: 42 },
    message: {
      text: "/target_derive_gaps alpha-project docs/checkups/history/report.json",
    },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetDeriveCalls, 1);
  assert.match(replies[0] ?? "", /Execucao \/target_derive_gaps iniciada para alpha-project/u);
  assert.match(replies[0] ?? "", /\/target_derive_gaps_status/u);
  assert.match(replies[0] ?? "", /\/target_derive_gaps_cancel/u);
});

test("handleTargetDeriveCommand propaga bloqueio objetivo do executor", async () => {
  const { controller, controlState } = createController({
    targetDeriveResult: {
      status: "blocked",
      reason: "report-drifted",
      message:
        "O repositorio recebeu commit novo depois do ultimo write-back do report; gere um novo /target_checkup antes de derivar novamente.",
    },
  });
  const replies: string[] = [];

  await callHandleTargetDeriveCommand(controller, {
    chat: { id: 42 },
    message: {
      text: "/target_derive_gaps alpha-project docs/checkups/history/report.json",
    },
    reply: async (text) => {
      replies.push(String(text));
      return {};
    },
  });

  assert.equal(controlState.targetDeriveCalls, 1);
  assert.deepEqual(controlState.targetDeriveArgs, [
    {
      projectName: "alpha-project",
      reportPath: "docs/checkups/history/report.json",
    },
  ]);
  assert.deepEqual(replies, [
    "❌ O repositorio recebeu commit novo depois do ultimo write-back do report; gere um novo /target_checkup antes de derivar novamente.",
  ]);
});

test("envia resumo final de fluxo target com fronteira de versionamento e proxima acao", async () => {
  const { controller } = createController({ allowedChatId: "42" });
  const sentMessages = mockSendMessage(controller);

  const summary: RunnerFlowSummary = {
    flow: "target-prepare",
    command: "/target_prepare",
    outcome: "success",
    finalStage: "versioning",
    completionReason: "completed",
    timestampUtc: "2026-03-24T23:15:00.000Z",
    targetProjectName: "alpha-project",
    targetProjectPath: "/home/mapita/projetos/alpha-project",
    versionBoundaryState: "after-versioning",
    nextAction:
      "Selecionar o projeto por /select_project alpha-project ou pelo menu /projects.",
    artifactPaths: [
      "docs/workflows/target-prepare-manifest.json",
      "docs/workflows/target-prepare-report.md",
    ],
    versionedArtifactPaths: [
      "AGENTS.md",
      "README.md",
      "docs/workflows/target-prepare-manifest.json",
      "docs/workflows/target-prepare-report.md",
    ],
    details: "Versionamento: prepare123@origin/main",
    timing: {
      startedAtUtc: "2026-03-24T23:14:00.000Z",
      finishedAtUtc: "2026-03-24T23:15:00.000Z",
      totalDurationMs: 60000,
      durationsByStageMs: {
        preflight: 10000,
        "ai-adjustment": 20000,
        "post-check": 15000,
        versioning: 15000,
      },
      completedStages: ["preflight", "ai-adjustment", "post-check", "versioning"],
      interruptedStage: null,
    },
    summary: {
      targetProject: {
        name: "alpha-project",
        path: "/home/mapita/projetos/alpha-project",
      },
      eligibleForProjects: true,
      compatibleWithWorkflowComplete: true,
      nextAction:
        "Selecionar o projeto por /select_project alpha-project ou pelo menu /projects.",
      manifestPath: "docs/workflows/target-prepare-manifest.json",
      reportPath: "docs/workflows/target-prepare-report.md",
      changedPaths: [
        "AGENTS.md",
        "README.md",
        "docs/workflows/target-prepare-manifest.json",
        "docs/workflows/target-prepare-report.md",
      ],
      versioning: {
        status: "committed-and-pushed",
        commitHash: "prepare123",
        upstream: "origin/main",
        commitPushId: "prepare123@origin/main",
      },
    },
  };

  await controller.sendRunFlowSummary(summary);

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Fluxo: \/target_prepare/u);
  assert.match(sentMessages[0]?.text ?? "", /Projeto alvo: alpha-project/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: sucesso/u);
  assert.match(sentMessages[0]?.text ?? "", /Fronteira de versionamento: after-versioning/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Proxima acao: Selecionar o projeto por \/select_project alpha-project/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Resumo deterministico/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 1m 0s \(60000 ms\)/u);
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

test("gera resposta de inicio ao executar /run_specs_from_validation", async () => {
  const { controller, controlState } = createController({
    runSpecsFromValidationStatus: "started",
  });

  const reply = await callBuildRunSpecsFromValidationReply(
    controller,
    "2026-02-19-approved-spec-triage-run-specs.md",
  );

  assert.equal(
    reply.reply,
    "▶️ Runner iniciado via /run_specs_from_validation para 2026-02-19-approved-spec-triage-run-specs.md.",
  );
  assert.equal(reply.started, true);
  assert.equal(controlState.runSpecsFromValidationCalls, 1);
  assert.deepEqual(controlState.runSpecsFromValidationArgs, [
    "2026-02-19-approved-spec-triage-run-specs.md",
  ]);
});

test("gera resposta acionavel quando /run_specs_from_validation e bloqueado por backlog", async () => {
  const { controller, controlState } = createController({
    runSpecsFromValidationStatus: "validation-blocked",
    runSpecsFromValidationMessage:
      "Nao existe backlog derivado aberto reaproveitavel para 2026-02-19-approved-spec-triage-run-specs.md. Use /run_specs <arquivo-da-spec.md> para retriagem completa.",
  });

  const reply = await callBuildRunSpecsFromValidationReply(
    controller,
    "2026-02-19-approved-spec-triage-run-specs.md",
  );

  assert.equal(
    reply.reply,
    "❌ Nao existe backlog derivado aberto reaproveitavel para 2026-02-19-approved-spec-triage-run-specs.md. Use /run_specs <arquivo-da-spec.md> para retriagem completa.",
  );
  assert.equal(reply.started, false);
  assert.equal(controlState.runSpecsFromValidationCalls, 1);
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
  assert.match(reply, /\/target_prepare \[projeto\]/u);
  assert.match(reply, /\/target_derive_gaps \[projeto\] <report-path>/u);
  assert.match(reply, /\/run_all/u);
  assert.match(reply, /\/run-all/u);
  assert.match(reply, /\/specs/u);
  assert.match(reply, /\/tickets_open/u);
  assert.match(reply, /\/run_specs/u);
  assert.match(reply, /\/run_specs_from_validation/u);
  assert.match(reply, /\/codex_chat/u);
  assert.match(reply, /\/codex-chat/u);
  assert.match(reply, /\/discover_spec/u);
  assert.match(reply, /\/discover_spec_status/u);
  assert.match(reply, /\/discover_spec_cancel/u);
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

test("/run_specs_from_validation sem argumento retorna mensagem de uso e nao inicia execucao", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleRunSpecsFromValidationCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs_from_validation" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.runSpecsFromValidationCalls, 0);
  assert.equal(controlState.validateRunSpecsTargetCalls, 0);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Uso: /run_specs_from_validation <arquivo-da-spec.md>.");
});

test("/run_specs_from_validation com argumento inicia fluxo direto em validacao", async () => {
  const { controller, controlState } = createController({
    runSpecsFromValidationStatus: "started",
  });
  const replies: string[] = [];

  await callHandleRunSpecsFromValidationCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs_from_validation 2026-02-19-approved-spec-triage-run-specs.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.deepEqual(controlState.validatedSpecsArgs, [
    "2026-02-19-approved-spec-triage-run-specs.md",
  ]);
  assert.equal(controlState.runSpecsFromValidationCalls, 1);
  assert.deepEqual(controlState.runSpecsFromValidationArgs, [
    "2026-02-19-approved-spec-triage-run-specs.md",
  ]);
  assert.equal(replies.length, 1);
  assert.equal(
    replies[0],
    "▶️ Runner iniciado via /run_specs_from_validation para 2026-02-19-approved-spec-triage-run-specs.md.",
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

test("/discover_spec inicia sessao e solicita brief inicial (CA-01)", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleDiscoverSpecCommand(controller, {
    chat: { id: 42 },
    message: { text: "/discover_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.discoverSpecStartCalls, 1);
  assert.deepEqual(controlState.discoverSpecStartChatIds, ["42"]);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Sessao \/discover_spec iniciada/u);
  assert.match(replies[0] ?? "", /brief inicial/u);
});

test("primeira mensagem livre apos /discover_spec e roteada como brief inicial (CA-01)", async () => {
  const state = createState({
    phase: "discover-spec-awaiting-brief",
    discoverSpecSession: createDiscoverSpecSession({
      phase: "awaiting-brief",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
  });
  const replies: string[] = [];

  await callHandleActiveFreeTextMessage(controller, {
    chat: { id: 42 },
    message: {
      text: "Precisamos descobrir melhor o fluxo de entrevista e seus bloqueios.",
      entities: [],
    },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.discoverSpecInputCalls, 1);
  assert.equal(controlState.planSpecInputCalls, 0);
  assert.equal(controlState.codexChatInputCalls, 0);
  assert.deepEqual(controlState.discoverSpecInputCallsByChat, [{
    chatId: "42",
    input: "Precisamos descobrir melhor o fluxo de entrevista e seus bloqueios.",
  }]);
  assert.deepEqual(replies, [
    "✅ Brief inicial recebido na sessão /discover_spec. Aguarde a resposta do Codex.",
  ]);
});

test("/discover_spec_status exibe fase, projeto e ultima atividade da sessao (CA-15)", async () => {
  const state = createState({
    phase: "discover-spec-waiting-user",
    discoverSpecSession: createDiscoverSpecSession({
      phase: "waiting-user",
      startedAt: new Date("2026-03-18T12:00:00.000Z"),
      lastActivityAt: new Date("2026-03-18T12:15:00.000Z"),
    }),
  });
  const { controller } = createController({
    getState: () => state,
  });
  const replies: string[] = [];

  await callHandleDiscoverSpecStatusCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Sessão \/discover_spec ativa/u);
  assert.match(replies[0] ?? "", /Fase: waiting-user/u);
  assert.match(replies[0] ?? "", /Projeto da sessão: codex-flow-runner/u);
  assert.match(replies[0] ?? "", /Última atividade: 2026-03-18T12:15:00.000Z/u);
  assert.match(replies[0] ?? "", /Última atividade do Codex: \(ainda sem saída observável\)/u);
});

test("/discover_spec_status inclui cobertura de categorias, pendencias e gate final (CA-14)", async () => {
  const categoryCoverage = createDefaultDiscoverSpecCategoryCoverageRecord();
  categoryCoverage["objective-value"] = {
    categoryId: "objective-value",
    label: "Objetivo e valor esperado",
    status: "covered",
    detail: "Objetivo e valor aprovados pelo operador.",
  };
  categoryCoverage["assumptions-defaults"] = {
    categoryId: "assumptions-defaults",
    label: "Assumptions e defaults",
    status: "covered",
    detail: "Default de monorepo aprovado.",
  };
  categoryCoverage["decisions-tradeoffs"] = {
    categoryId: "decisions-tradeoffs",
    label: "Decisoes e trade-offs",
    status: "pending",
    detail: "Ainda falta decidir a estrategia de gate final.",
  };

  const state = createState({
    phase: "discover-spec-waiting-user",
    discoverSpecSession: createDiscoverSpecSession({
      phase: "waiting-user",
      categoryCoverage,
      pendingItems: [
        {
          kind: "category",
          key: "decisions-tradeoffs",
          label: "Decisoes e trade-offs",
          detail: "Ainda falta decidir a estrategia de gate final.",
        },
      ],
      latestFinalBlock: createPlanSpecFinalBlock({
        categoryCoverage: Object.values(categoryCoverage),
        assumptionsAndDefaults: ["Assumir monorepo Node.js 20+ como base."],
        decisionsAndTradeOffs: ["Reutilizar callbacks existentes."],
      }),
      createSpecEligible: false,
      createSpecBlockReason: "A descoberta ainda possui lacunas criticas.",
    }),
  });
  const { controller } = createController({
    getState: () => state,
  });
  const replies: string[] = [];

  await callHandleDiscoverSpecStatusCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Categorias cobertas ou explicitadas:/u);
  assert.match(replies[0] ?? "", /\[covered\] Objetivo e valor esperado/u);
  assert.match(replies[0] ?? "", /Categorias pendentes:/u);
  assert.match(replies[0] ?? "", /Decisoes e trade-offs: Ainda falta decidir a estrategia de gate final/u);
  assert.match(replies[0] ?? "", /Assumptions\/defaults:/u);
  assert.match(replies[0] ?? "", /Criar spec elegivel agora: nao/u);
});

test("/discover_spec_cancel encerra sessao ativa (CA-15)", async () => {
  const { controller, controlState } = createController();
  const replies: string[] = [];

  await callHandleDiscoverSpecCancelCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.discoverSpecCancelCalls, 1);
  assert.deepEqual(controlState.discoverSpecCancelChatIds, ["42"]);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Sessao \/discover_spec cancelada/u);
});

test("/discover_spec_cancel informa ausencia de sessao ativa", async () => {
  const { controller, controlState } = createController({
    discoverSpecCancelResult: {
      status: "inactive",
      message: "Nenhuma sessão /discover_spec ativa no momento.",
    },
  });
  const replies: string[] = [];

  await callHandleDiscoverSpecCancelCommand(controller, {
    chat: { id: 42 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.discoverSpecCancelCalls, 1);
  assert.equal(replies.length, 1);
  assert.equal(replies[0], "ℹ️ Nenhuma sessão /discover_spec ativa no momento.");
});

test("durante sessao /discover_spec ativa, troca de projeto por comando e callback fica bloqueada (CA-03)", async () => {
  const state = createState({
    discoverSpecSession: createDiscoverSpecSession({
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
  assert.match(commandReplies[0] ?? "", /sessão \/discover_spec ativa/u);
  assert.equal(callbackReplies.length, 1);
  assert.match(callbackReplies[0] ?? "", /sessão \/discover_spec ativa/u);
});

test("com TELEGRAM_ALLOWED_CHAT_ID, chat nao autorizado nao usa /discover_spec* (CA-17)", async () => {
  const { controller, controlState } = createController({ allowedChatId: "42" });
  const replies: string[] = [];

  await callHandleDiscoverSpecCommand(controller, {
    chat: { id: 99 },
    message: { text: "/discover_spec" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });
  await callHandleDiscoverSpecStatusCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });
  await callHandleDiscoverSpecCancelCommand(controller, {
    chat: { id: 99 },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.discoverSpecStartCalls, 0);
  assert.equal(controlState.discoverSpecCancelCalls, 0);
  assert.deepEqual(replies, [
    "Acesso não autorizado.",
    "Acesso não autorizado.",
    "Acesso não autorizado.",
  ]);
});

test("saida raw e falha de /discover_spec sao enviadas ao Telegram com labels dedicadas (CA-18, CA-19)", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);

  await controller.sendDiscoverSpecOutput("42", "Entrevista em andamento.");
  await controller.sendDiscoverSpecFailure("42", "Falha ao iniciar sessao /discover_spec: timeout no codex.");

  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.equal(
    sentMessages[0]?.text,
    "🧩 Saída textual do /discover_spec:\nEntrevista em andamento.",
  );
  assert.equal(sentMessages[1]?.chatId, "42");
  assert.match(sentMessages[1]?.text ?? "", /Falha na sessão interativa \/discover_spec/u);
  assert.match(sentMessages[1]?.text ?? "", /timeout no codex/u);
  assert.match(sentMessages[1]?.text ?? "", /Use \/discover_spec para tentar novamente/u);
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

test("/run_specs_from_validation bloqueia spec inexistente sem iniciar runner", async () => {
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

  await callHandleRunSpecsFromValidationCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs_from_validation spec-inexistente.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsFromValidationCalls, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Spec não encontrada para \/run_specs_from_validation/u);
});

test("/run_specs_from_validation bloqueia spec nao elegivel sem iniciar runner", async () => {
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

  await callHandleRunSpecsFromValidationCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs_from_validation 2026-02-19-telegram-access-and-control-plane.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsFromValidationCalls, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Spec não elegível para \/run_specs_from_validation/u);
  assert.match(replies[0] ?? "", /Spec treatment: \(ausente\)/u);
});

test("/run_specs_from_validation bloqueia argumento invalido sem iniciar runner", async () => {
  const { controller, controlState } = createController({
    runSpecsValidationResult: {
      status: "invalid-path",
      input: "../../etc/passwd",
      message:
        "Formato invalido para spec. Use apenas <arquivo-da-spec.md> ou docs/specs/<arquivo-da-spec.md>.",
    },
  });
  const replies: string[] = [];

  await callHandleRunSpecsFromValidationCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs_from_validation ../../etc/passwd" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsFromValidationCalls, 0);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Argumento inválido para \/run_specs_from_validation/u);
});

test("/run_specs_from_validation bloqueia ausencia de backlog derivado aberto", async () => {
  const { controller, controlState } = createController({
    runSpecsFromValidationStatus: "validation-blocked",
    runSpecsFromValidationMessage:
      "Nao existe backlog derivado aberto reaproveitavel para 2026-02-19-approved-spec-triage-run-specs.md. Use /run_specs <arquivo-da-spec.md> para uma retriagem completa.",
  });
  const replies: string[] = [];

  await callHandleRunSpecsFromValidationCommand(controller, {
    chat: { id: 42 },
    message: { text: "/run_specs_from_validation 2026-02-19-approved-spec-triage-run-specs.md" },
    reply: async (text) => {
      replies.push(text);
      return Promise.resolve();
    },
  });

  assert.equal(controlState.validateRunSpecsTargetCalls, 1);
  assert.equal(controlState.runSpecsFromValidationCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0] ?? "", /Nao existe backlog derivado aberto reaproveitavel/u);
  assert.match(replies[0] ?? "", /\/run_specs/u);
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

test("/models responde lista paginada com marcador do modelo atual", async () => {
  const { controller, controlState } = createController();
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleModelsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listCodexModelsCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Modelos do Codex/u);
  assert.match(replies[0]?.text ?? "", /Modelo atual: gpt-5\.4/u);
  assert.match(replies[0]?.text ?? "", /✅ gpt-5\.4/u);
});

test("callback de /models seleciona modelo e atualiza a mensagem", async () => {
  const { controller, controlState } = createController();
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleModelsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[1]?.[0]?.callback_data) ?? "";

  await callHandleModelsCallbackQuery(controller, {
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

  assert.equal(controlState.selectCodexModelCalls, 1);
  assert.deepEqual(controlState.selectedCodexModels, ["gpt-5.3-codex"]);
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Modelo atual: gpt-5\.3-codex/u);
  assert.deepEqual(answers, ["Modelo atualizado para gpt-5.3-codex."]);
});

test("callback de /models fica stale quando o projeto ativo muda", async () => {
  const alphaProject = { name: "alpha-project", path: "/home/mapita/projetos/alpha-project" };
  const betaProject = { name: "beta-project", path: "/home/mapita/projetos/beta-project" };
  let currentState = createState({ activeProject: cloneProject(alphaProject) });
  const { controller, controlState } = createController({
    getState: () => currentState,
    codexModelSnapshot: createCodexModelSnapshot({
      project: alphaProject,
      current: createResolvedCodexPreferences({
        project: alphaProject,
      }),
    }),
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];

  await callHandleModelsCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  currentState = createState({ activeProject: cloneProject(betaProject) });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[0]?.[0]?.callback_data) ?? "";

  await callHandleModelsCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: { data: callbackData },
    answerCbQuery: async (text) => {
      answers.push(text ?? "");
      return Promise.resolve();
    },
    editMessageText: async () => Promise.resolve(),
  });

  assert.equal(controlState.selectCodexModelCalls, 0);
  assert.deepEqual(answers, ["A lista de modelos expirou. Use /models para atualizar."]);
});

test("/reasoning responde lista com marcador do effort atual", async () => {
  const { controller, controlState } = createController({
    codexReasoningSnapshot: createCodexReasoningSnapshot({
      current: createResolvedCodexPreferences({
        reasoningEffort: "high",
      }),
    }),
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleReasoningCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listCodexReasoningCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Reasoning do Codex/u);
  assert.match(replies[0]?.text ?? "", /Reasoning atual: high/u);
  assert.match(replies[0]?.text ?? "", /✅ high/u);
});

test("/speed responde lista com marcador da velocidade atual", async () => {
  const { controller, controlState } = createController({
    codexSpeedSnapshot: createCodexSpeedSnapshot({
      current: createResolvedCodexPreferences({
        speed: "fast",
      }),
    }),
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpeedCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.equal(controlState.listCodexSpeedCalls, 1);
  assert.equal(replies.length, 1);
  assert.match(replies[0]?.text ?? "", /Velocidade do Codex/u);
  assert.match(replies[0]?.text ?? "", /Velocidade atual: Fast/u);
  assert.match(replies[0]?.text ?? "", /✅ Fast/u);
});

test("callback de /speed seleciona fast e atualiza a mensagem", async () => {
  const { controller, controlState } = createController();
  const replies: Array<{ text: string; extra?: unknown }> = [];
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpeedCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  const callbackData = ((replies[0]?.extra as {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ callback_data: string }>>;
    };
  })?.reply_markup?.inline_keyboard?.[1]?.[0]?.callback_data) ?? "";

  await callHandleSpeedCallbackQuery(controller, {
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

  assert.equal(controlState.selectCodexSpeedCalls, 1);
  assert.deepEqual(controlState.selectedCodexSpeeds, ["fast"]);
  assert.equal(edits.length, 1);
  assert.match(edits[0]?.text ?? "", /Velocidade atual: Fast/u);
  assert.deepEqual(answers, ["Velocidade atualizada para Fast."]);
});

test("/speed informa quando fast mode nao esta disponivel para o modelo atual", async () => {
  const { controller } = createController({
    codexSpeedSnapshot: createCodexSpeedSnapshot({
      current: createResolvedCodexPreferences({
        model: "gpt-5.3-codex",
        modelDisplayName: "gpt-5.3-codex",
        fastModeSupported: false,
        speed: "standard",
      }),
      speedOptions: [
        {
          slug: "standard",
          label: "Standard",
          description: "Modo padrao",
          selectable: true,
          active: true,
        },
        {
          slug: "fast",
          label: "Fast",
          description: "Disponivel apenas quando o modelo atual suporta Fast mode.",
          selectable: false,
          active: false,
        },
      ],
    }),
  });
  const replies: Array<{ text: string; extra?: unknown }> = [];

  await callHandleSpeedCommand(controller, {
    chat: { id: 42 },
    reply: async (text, extra) => {
      replies.push({ text, extra });
      return Promise.resolve();
    },
  });

  assert.match(replies[0]?.text ?? "", /Fast mode indisponivel para o modelo atual/u);
  assert.match(replies[0]?.text ?? "", /Fast \(indisponivel\)/u);
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
  const finalBlock = createPlanSpecFinalBlock();

  const rendered = callBuildPlanSpecFinalReply(controller, finalBlock);

  assert.match(rendered.text, /Planejamento concluído/u);
  assert.match(rendered.text, /Título: Bridge interativa do Codex/u);
  assert.match(rendered.text, /Objetivo:/u);
  assert.match(rendered.text, /RFs:/u);
  assert.match(rendered.text, /CAs:/u);
  assert.match(rendered.text, /Nao-escopo:/u);
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

test("pergunta de /discover_spec reutiliza callback compartilhado sem misturar com /plan_spec", async () => {
  const state = createState({
    phase: "discover-spec-waiting-user",
    discoverSpecSession: createDiscoverSpecSession({
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

  await controller.sendDiscoverSpecQuestion("42", {
    prompt: "Qual lacuna critica devemos fechar primeiro?",
    options: [
      { value: "scope", label: "Escopo funcional" },
      { value: "tradeoff", label: "Trade-off principal" },
    ],
  });

  await callHandlePlanSpecCallbackQuery(controller, {
    chat: { id: 42 },
    callbackQuery: {
      data: "plan-spec:question:scope",
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

  assert.deepEqual(controlState.discoverSpecQuestionSelections, ["scope"]);
  assert.deepEqual(controlState.planSpecQuestionSelections, []);
  assert.equal(answers[0], "Resposta registrada.");
  assert.match(edits[0]?.text ?? "", /Pergunta da descoberta/u);
  assert.match(edits[0]?.text ?? "", /✅ Escopo funcional/u);
});

test("finalizacao de /discover_spec renderiza secoes enriquecidas e callback final roteia para o fluxo correto (CA-06)", async () => {
  const state = createState({
    phase: "discover-spec-awaiting-final-action",
    discoverSpecSession: createDiscoverSpecSession({
      sessionId: 33,
      phase: "awaiting-final-action",
    }),
  });
  const { controller, controlState } = createController({
    getState: () => state,
    discoverSpecFinalCallbackOutcome: {
      status: "accepted",
    },
  });
  const sentMessages = mockSendMessage(controller, { startingMessageId: 930 });
  const answers: string[] = [];
  const edits: Array<{ text: string; extra?: unknown }> = [];

  await controller.sendDiscoverSpecFinalization("42", createPlanSpecFinalBlock({
    categoryCoverage: [
      {
        categoryId: "objective-value",
        label: "Objetivo e valor esperado",
        status: "covered",
        detail: "Objetivo aprovado pelo operador.",
      },
      {
        categoryId: "decisions-tradeoffs",
        label: "Decisoes e trade-offs",
        status: "covered",
        detail: "Trade-off principal ja decidido.",
      },
    ],
    assumptionsAndDefaults: ["Assumir monorepo Node.js 20+ como base."],
    decisionsAndTradeOffs: ["Reutilizar callbacks existentes."],
  }));

  assert.match(sentMessages[0]?.text ?? "", /Descoberta consolidada/u);
  assert.match(sentMessages[0]?.text ?? "", /Categorias obrigatorias:/u);
  assert.match(sentMessages[0]?.text ?? "", /Assumptions\/defaults:/u);
  assert.match(sentMessages[0]?.text ?? "", /Decisoes e trade-offs:/u);

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

  assert.deepEqual(controlState.discoverSpecFinalActions, ["refine"]);
  assert.deepEqual(controlState.planSpecFinalActions, []);
  assert.equal(answers[0], "Resposta registrada.");
  assert.match(edits[0]?.text ?? "", /Descoberta consolidada/u);
  assert.match(edits[0]?.text ?? "", /✅ Refinar/u);
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

  await controller.sendPlanSpecFinalization("42", createPlanSpecFinalBlock());

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

  await controller.sendPlanSpecFinalization("42", createPlanSpecFinalBlock());

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

  await controller.sendPlanSpecFinalization("42", createPlanSpecFinalBlock());

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

test("/select-project fica bloqueado enquanto um fluxo target estiver ativo", async () => {
  const { controller, controlState } = createController({
    getState: () =>
      createState({
        targetFlow: {
          flow: "target-checkup",
          command: "/target_checkup",
          targetProject: {
            name: "alpha-project",
            path: "/home/mapita/projetos/alpha-project",
          },
          phase: "target-checkup-evidence-collection",
          milestone: "evidence-collection",
          milestoneLabel: "coleta de evidencias",
          versionBoundaryState: "before-versioning",
          cancelRequestedAt: null,
          startedAt: new Date("2026-03-24T23:20:00.000Z"),
          updatedAt: new Date("2026-03-24T23:21:00.000Z"),
          lastMessage: "Coleta de evidencias em andamento.",
        },
      }),
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
  assert.deepEqual(replies, [
    "❌ Não é possível trocar o projeto ativo enquanto um fluxo target operacional estiver em andamento.",
  ]);
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
  await controller.sendPlanSpecFinalization(
    "42",
    createPlanSpecFinalBlock({
      title: "Bridge de planejamento",
      summary: "Resumo final da conversa.",
    }),
  );
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
    sourceCommand: "/run_specs",
    entryPoint: "spec-triage",
    nextAction: "Triagem concluida; iniciando rodada /run-all para processar tickets abertos.",
    specTicketValidation: createRunSpecsTicketValidationSummary({
      summary: "Gate aprovou o pacote derivado antes do /run-all.",
    }),
    specTicketDerivationRetrospective: createRunSpecsDerivationRetrospectiveSummary({
      decision: "executed",
      summary: "Retrospectiva pre-run-all concluiu com hipótese sistêmica fraca.",
    }),
    timing: createRunSpecsTriageTimingSnapshot(),
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
    sourceCommand: "/run_specs",
    entryPoint: "spec-triage",
    nextAction: "Triagem concluida; iniciando rodada /run-all para processar tickets abertos.",
    specTicketValidation: createRunSpecsTicketValidationSummary({
      summary: "Gate aprovou o pacote derivado antes do /run-all.",
    }),
    specTicketDerivationRetrospective: createRunSpecsDerivationRetrospectiveSummary({
      decision: "executed",
      summary: "Retrospectiva pre-run-all concluiu com hipótese sistêmica fraca.",
    }),
    timing: createRunSpecsTriageTimingSnapshot(),
  });

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.match(sentMessages[0]?.text ?? "", /Marco da triagem \/run_specs/u);
  assert.match(sentMessages[0]?.text ?? "", /Spec: 2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(sentMessages[0]?.text ?? "", /Comando de origem: \/run_specs/u);
  assert.match(sentMessages[0]?.text ?? "", /Ponto de entrada: spec-triage/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: sucesso/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: spec-close-and-version/u);
  assert.match(sentMessages[0]?.text ?? "", /Proxima acao:/u);
  assert.match(sentMessages[0]?.text ?? "", /Visao geral da triagem/u);
  assert.match(sentMessages[0]?.text ?? "", /Snapshot do gate funcional pre-\/run_all/u);
  assert.match(sentMessages[0]?.text ?? "", /Veredito: GO/u);
  assert.match(sentMessages[0]?.text ?? "", /Sintese do gate: Gate aprovou o pacote derivado antes do \/run-all\./u);
  assert.match(sentMessages[0]?.text ?? "", /Snapshot da retrospectiva da derivacao/u);
  assert.match(sentMessages[0]?.text ?? "", /Decisao: executed/u);
  assert.match(sentMessages[0]?.text ?? "", /Sintese da retrospectiva: Retrospectiva pre-run-all concluiu com hipótese sistêmica fraca\./u);
  assert.match(sentMessages[0]?.text ?? "", /Timing da triagem pre-\/run_all/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 3m 0s \(180000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- spec-triage: 1m 30s \(90000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- spec-close-and-version: 1m 30s \(90000 ms\)/u);
});

test("reenvia milestone de triagem /run_specs em falha transitoria com logging padronizado", async () => {
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
        retryAfterSeconds: 2,
      });
    }

    return Promise.resolve({ chatId, text, message_id: 700 + attempts });
  };

  await controller.sendRunSpecsTriageMilestone({
    spec: {
      fileName: "2026-02-19-approved-spec-triage-run-specs.md",
      path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
    },
    outcome: "success",
    finalStage: "spec-close-and-version",
    sourceCommand: "/run_specs",
    entryPoint: "spec-triage",
    nextAction: "Triagem concluida; iniciando rodada /run-all para processar tickets abertos.",
    timing: createRunSpecsTriageTimingSnapshot(),
  });

  assert.equal(attempts, 2);
  assert.deepEqual(retryDelaysMs, [2000]);
  assert.equal(
    logger.warnings[0]?.message,
    "Falha transitoria ao enviar milestone de triagem de /run_specs no Telegram",
  );
  assert.equal(logger.warnings[0]?.context?.policy, "run-specs-triage-milestone");
  assert.equal(logger.warnings[0]?.context?.logicalMessageType, "run-specs-triage-milestone");
  assert.equal(logger.warnings[0]?.context?.destinationChatId, "42");
  assert.equal(logger.warnings[0]?.context?.errorClass, "telegram-rate-limit");
  assert.equal(logger.warnings[0]?.context?.errorCode, "429");
  assert.equal(
    logger.infos.find(
      (entry) => entry.message === "Milestone de triagem de /run_specs enviada no Telegram",
    )?.context?.result,
    "delivered",
  );
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
    sourceCommand: "/run_specs_from_validation",
    entryPoint: "spec-ticket-validation",
    nextAction: "Rodada /run-all bloqueada. Corrija a falha de fechamento e reexecute /run_specs.",
    details: "falha simulada",
    specTicketValidation: createRunSpecsTicketValidationSummary(),
    specTicketDerivationRetrospective: createRunSpecsDerivationRetrospectiveSummary({
      decision: "skipped-no-reviewed-gaps",
      summary: "Retrospectiva pre-run-all foi pulada sem gaps revisados.",
      analysis: undefined,
    }),
    timing: {
      ...createRunSpecsTriageTimingSnapshot(),
      finishedAtUtc: "2026-02-19T15:01:00.000Z",
      totalDurationMs: 60000,
      durationsByStageMs: {
        "spec-triage": 40000,
        "spec-close-and-version": 20000,
      },
      completedStages: ["spec-triage"],
      interruptedStage: "spec-close-and-version",
    },
  });

  assert.equal(sentMessages.length, 2);
  assert.equal(sentMessages[1]?.chatId, "42");
  assert.match(sentMessages[1]?.text ?? "", /Resultado: falha/u);
  assert.match(sentMessages[1]?.text ?? "", /Fase final: spec-close-and-version/u);
  assert.match(sentMessages[1]?.text ?? "", /Leitura operacional: falha simulada/u);
  assert.match(sentMessages[1]?.text ?? "", /Snapshot do gate funcional pre-\/run_all/u);
  assert.match(sentMessages[1]?.text ?? "", /Snapshot da retrospectiva da derivacao/u);
  assert.match(sentMessages[1]?.text ?? "", /Tempo total: 1m 0s \(60000 ms\)/u);
  assert.match(sentMessages[1]?.text ?? "", /- spec-triage: 40s \(40000 ms\)/u);
  assert.match(sentMessages[1]?.text ?? "", /- spec-close-and-version: 20s \(20000 ms\)/u);
  assert.match(sentMessages[1]?.text ?? "", /Fase interrompida: spec-close-and-version/u);
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
  assert.match(sentMessages[0]?.text ?? "", /Tempos do ticket/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 2m 0s \(120000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- plan: 45s \(45000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- implement: 50s \(50000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- close-and-version: 25s \(25000 ms\)/u);
  assert.equal(delivery?.channel, "telegram");
  assert.equal(delivery?.destinationChatId, "42");
  assert.match(delivery?.deliveredAtUtc ?? "", /^\d{4}-\d{2}-\d{2}T/u);
  assert.equal(delivery?.attempts, 1);
  assert.equal(delivery?.maxAttempts, 4);
  assert.equal(logger.infos[0]?.context?.policy, "ticket-final-summary");
  assert.equal(logger.infos[0]?.context?.logicalMessageType, "ticket-final-summary");
  assert.equal(logger.infos[0]?.context?.destinationChatId, "42");
  assert.equal(logger.infos[0]?.context?.result, "delivered");
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
  const { controller, logger } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  const delivery = await controller.sendTicketFinalSummary(
    createFailureSummary({
      codexStdoutPreview: [
        "Resultado final: NO_GO",
        "",
        "- Push: falhou",
        "- Motivo: origin/main permaneceu ahead 1",
      ].join("\n"),
      codexStderrPreview:
        "OpenAI Codex v0.111.0\n...\nfalha final: push nao foi concluido e o repositorio ficou ahead 1",
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "99");
  assert.match(sentMessages[0]?.text ?? "", /Resultado: falha/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: implement/u);
  assert.match(sentMessages[0]?.text ?? "", /Projeto ativo: codex-flow-runner/u);
  assert.match(sentMessages[0]?.text ?? "", /Erro: falha simulada/u);
  assert.match(sentMessages[0]?.text ?? "", /Mensagem final do Codex:/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado final: NO_GO/u);
  assert.match(sentMessages[0]?.text ?? "", /- Push: falhou/u);
  assert.match(sentMessages[0]?.text ?? "", /Transcricao tecnica do Codex CLI:/u);
  assert.match(sentMessages[0]?.text ?? "", /OpenAI Codex v0\.111\.0/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 1m 10s \(70000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- plan: 45s \(45000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- implement: 25s \(25000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase interrompida: implement/u);
  assert.equal(delivery?.destinationChatId, "99");
  assert.equal(
    logger.infos.find((entry) => entry.message === "Resumo final de ticket enviado no Telegram")
      ?.context?.codexAssistantResponsePreview,
    ["Resultado final: NO_GO", "", "- Push: falhou", "- Motivo: origin/main permaneceu ahead 1"].join(
      "\n",
    ),
  );
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
  assert.equal(logger.warnings[0]?.context?.policy, "ticket-final-summary");
  assert.equal(logger.warnings[0]?.context?.logicalMessageType, "ticket-final-summary");
  assert.equal(logger.warnings[0]?.context?.destinationChatId, "42");
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

test("nao envia resumo final de fluxo quando chat de notificacao nao foi capturado", async () => {
  const { controller, logger } = createController();
  const sentMessages = mockSendMessage(controller);

  await controller.sendRunFlowSummary(createRunAllFlowSummary());

  assert.equal(sentMessages.length, 0);
  assert.equal(logger.warnings.length, 1);
  assert.equal(
    logger.warnings[0]?.message,
    "Resumo final de fluxo nao enviado: chat de notificacao indefinido",
  );
  assert.deepEqual(logger.warnings[0]?.context, {
    flow: "run-all",
    outcome: "success",
    finalStage: "select-ticket",
  });
});

test("envia resumo final de fluxo /run-all com tempos para chat configurado", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const sentMessages = mockSendMessage(controller);

  await controller.sendRunFlowSummary(createRunAllFlowSummary());

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "42");
  assert.match(sentMessages[0]?.text ?? "", /Resumo final de fluxo/u);
  assert.match(sentMessages[0]?.text ?? "", /Fluxo: run-all/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: sucesso/u);
  assert.match(sentMessages[0]?.text ?? "", /Motivo de encerramento: queue-empty/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Codex utilizado: gpt-5\.4 \| reasoning xhigh \| velocidade Standard/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Tickets processados: 2\/5/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempos do fluxo/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 4m 0s \(240000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- select-ticket: 20s \(20000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- plan: 1m 20s \(80000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- implement: 1m 30s \(90000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- close-and-version: 50s \(50000 ms\)/u);
  assert.equal(logger.warnings.length, 0);
  assert.equal(logger.infos[0]?.message, "Resumo final de fluxo enviado no Telegram");
  assert.equal(logger.infos[0]?.context?.policy, "run-flow-summary");
  assert.equal(logger.infos[0]?.context?.logicalMessageType, "run-flow-summary");
  assert.equal(logger.infos[0]?.context?.destinationChatId, "42");
  assert.equal(logger.infos[0]?.context?.result, "delivered");
});

test("envia resumo final de fluxo /run-all distinguindo ultimo ticket processado de bloqueio na selecao", async () => {
  const { controller } = createController({ allowedChatId: "42" });
  const sentMessages = mockSendMessage(controller);

  await controller.sendRunFlowSummary(
    createRunAllFlowSummary({
      completionReason: "blocked-tickets-only",
      processedTicketsCount: 1,
      lastProcessedTicket: "2026-02-19-ticket-processado.md",
      selectionTicket: "2026-02-19-ticket-bloqueado.md",
      details: "Restam apenas tickets com Status: blocked.",
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Motivo de encerramento: blocked-tickets-only/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Último ticket processado: 2026-02-19-ticket-processado\.md/u,
  );
  assert.match(
    sentMessages[0]?.text ?? "",
    /Próximo ticket bloqueado: 2026-02-19-ticket-bloqueado\.md/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Detalhes: Restam apenas tickets com Status: blocked\./u);
});

test("envia resumo final de fluxo /run-specs com spec-audit no snapshot de sucesso", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      specTriage: createRunSpecsSpecTriageSummary(),
      specTicketValidation: createRunSpecsTicketValidationSummary({
        summary: "Pacote derivado aprovado antes do /run-all.",
      }),
      specCloseAndVersion: createRunSpecsSpecCloseAndVersionSummary(),
      specAudit: createRunSpecsSpecAuditSummary(),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "99");
  const successSummaryText = sentMessages[0]?.text ?? "";
  assert.match(successSummaryText, /Fluxo: run-specs/u);
  assert.match(successSummaryText, /Comando de origem: \/run_specs/u);
  assert.match(successSummaryText, /Ponto de entrada: spec-triage/u);
  assert.match(successSummaryText, /Resultado: sucesso/u);
  assert.match(successSummaryText, /Fase final: spec-audit/u);
  assert.match(successSummaryText, /Motivo de encerramento: completed/u);
  assert.match(successSummaryText, /Pre-\/run_all: spec-triage/u);
  assert.match(successSummaryText, /Tickets derivados criados: 2/u);
  assert.match(successSummaryText, /Pre-\/run_all: spec-ticket-validation/u);
  assert.match(successSummaryText, /Pre-\/run_all: spec-close-and-version/u);
  assert.match(successSummaryText, /Commit hash: abc123def456/u);
  assert.match(successSummaryText, /Pos-\/run_all: spec-audit/u);
  assert.match(successSummaryText, /Status da spec apos auditoria: attended/u);
  assert.match(successSummaryText, /Veredito: GO/u);
  assert.match(successSummaryText, /Gaps finais detalhados: nenhum/u);
  assert.match(successSummaryText, /Tempo total: 9m 0s \(540000 ms\)/u);
  assert.match(successSummaryText, /- run-all: 5m 0s \(300000 ms\)/u);
  assert.match(successSummaryText, /- spec-audit: 1m 0s \(60000 ms\)/u);
  assert.match(successSummaryText, /Resultado do \/run_all encadeado/u);
  assert.match(successSummaryText, /Motivo de encerramento do \/run_all: queue-empty/u);
  assertOrderedSubstrings(successSummaryText, [
    "Visao geral do fluxo",
    "Pre-/run_all: spec-triage",
    "Pre-/run_all: spec-ticket-validation",
    "Pre-/run_all: spec-close-and-version",
    "Pos-/run_all: spec-audit",
    "Timing do fluxo completo",
    "Timing da triagem pre-/run_all",
    "Resultado do /run_all encadeado",
  ]);
});

test("envia resumo final de fluxo /run-specs com spec-workflow-retrospective como fase final", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      finalStage: "spec-workflow-retrospective",
      timing: createRunSpecsFlowTimingSnapshot({
        finishedAtUtc: "2026-02-19T15:10:00.000Z",
        totalDurationMs: 600000,
        durationsByStageMs: {
          "spec-triage": 90000,
          "spec-close-and-version": 90000,
          "run-all": 300000,
          "spec-audit": 60000,
          "spec-workflow-retrospective": 60000,
        },
        completedStages: [
          "spec-triage",
          "spec-close-and-version",
          "run-all",
          "spec-audit",
          "spec-workflow-retrospective",
        ],
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: spec-workflow-retrospective/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /- spec-workflow-retrospective: 1m 0s \(60000 ms\)/u,
  );
});

test("envia resumo final de /run-specs sem blocos sistemicos quando a feature flag os suprimiu", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      finalStage: "spec-audit",
      timing: createRunSpecsFlowTimingSnapshot({
        finishedAtUtc: "2026-02-19T15:09:00.000Z",
        totalDurationMs: 540000,
        durationsByStageMs: {
          "spec-triage": 90000,
          "spec-close-and-version": 90000,
          "run-all": 300000,
          "spec-audit": 60000,
        },
        completedStages: ["spec-triage", "spec-close-and-version", "run-all", "spec-audit"],
      }),
      triageTiming: createRunSpecsTriageTimingSnapshot(),
      specTicketDerivationRetrospective: undefined,
      workflowGapAnalysis: undefined,
      workflowImprovementTicket: undefined,
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: spec-audit/u);
  assert.doesNotMatch(sentMessages[0]?.text ?? "", /Retrospectiva sistemica da derivacao/u);
  assert.doesNotMatch(sentMessages[0]?.text ?? "", /Retrospectiva sistemica pos-spec-audit/u);
  assert.doesNotMatch(
    sentMessages[0]?.text ?? "",
    /spec-ticket-derivation-retrospective|spec-workflow-retrospective/u,
  );
});

test("envia resumo final de /run-specs com resultado de workflow-gap-analysis elegivel para publication", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      workflowGapAnalysis: createWorkflowGapAnalysisSummary({
        classification: "systemic-gap",
        confidence: "high",
        publicationEligibility: true,
        inputMode: "follow-up-tickets",
        summary: "O workflow contribuiu materialmente para o gap residual.",
        causalHypothesis: "A retrospectiva pos-auditoria ainda nao tinha contrato parseavel proprio.",
        benefitSummary: "Formalizar o contrato reduz recorrencia futura.",
        followUpTicketPaths: ["tickets/open/2026-03-19-gap.md"],
        findings: [
          {
            summary: "Falta um contrato parseavel dedicado para workflow-gap-analysis.",
            affectedArtifactPaths: ["src/core/runner.ts"],
            requirementRefs: ["RF-05", "CA-05"],
            evidence: ["A etapa placeholder nao distinguia high, medium e low."],
          },
        ],
      }),
      workflowImprovementTicket: createWorkflowImprovementTicketSummary(),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Pos-\/run_all: retrospectiva sistemica/u);
  assert.match(sentMessages[0]?.text ?? "", /Classificacao: systemic-gap/u);
  assert.match(sentMessages[0]?.text ?? "", /Elegivel para publication: sim/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Follow-ups funcionais considerados: tickets\/open\/2026-03-19-gap\.md/u,
  );
  assert.match(
    sentMessages[0]?.text ?? "",
    /Falta um contrato parseavel dedicado para workflow-gap-analysis\./u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Pos-\/run_all: ticket transversal/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: created-and-pushed/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Ticket publicado\/reutilizado: tickets\/open\/2026-03-19-workflow-improvement-example\.md/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Commit\/push dedicado: workflow123@origin\/main/u);
});

test("envia resumo final de /run-specs com referencia historica pre-run-all sem novo ticket pos-spec-audit", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      workflowGapAnalysis: createWorkflowGapAnalysisSummary({
        classification: "systemic-gap",
        confidence: "high",
        publicationEligibility: false,
        inputMode: "follow-up-tickets",
        summary: "A mesma frente causal reapareceu apos o spec-audit, mas ja tinha sido tratada.",
        causalHypothesis: "A auditoria so confirmou um backlog sistemico ja conhecido no pre-run-all.",
        benefitSummary: "Referenciar o contexto existente evita ticket transversal duplicado.",
        findings: [
          {
            summary: "A mesma frente causal do pre-run-all reapareceu apos a auditoria.",
            affectedArtifactPaths: ["src/core/runner.ts"],
            requirementRefs: ["RF-35", "CA-17"],
            evidence: ["O fingerprint coincide com o achado da retrospectiva pre-run-all."],
          },
        ],
        historicalReference: {
          summary: "Frente causal ja tratada na retrospectiva pre-run-all; manter apenas referencia historica.",
          ticketPath: "tickets/open/2026-03-19-workflow-improvement-example.md",
          findingFingerprints: ["workflow-finding|abc123def456"],
        },
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Pos-\/run_all: retrospectiva sistemica/u);
  assert.match(sentMessages[0]?.text ?? "", /Elegivel para publication: nao/u);
  assert.match(sentMessages[0]?.text ?? "", /Referencia historica pre-run-all: sim/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Resumo da referencia historica: Frente causal ja tratada na retrospectiva pre-run-all; manter apenas referencia historica\./u,
  );
  assert.match(
    sentMessages[0]?.text ?? "",
    /Ticket\/artefato preexistente: tickets\/open\/2026-03-19-workflow-improvement-example\.md/u,
  );
  assert.doesNotMatch(sentMessages[0]?.text ?? "", /Ticket transversal pos-spec-audit/u);
});

test("envia resumo final de /run-specs distinguindo gate funcional, retrospectiva da derivacao e retrospectiva pos-spec-audit quando todas existem", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      specTicketValidation: createRunSpecsTicketValidationSummary({
        summary: "Gate funcional concluiu com GO e historico revisado.",
      }),
      specTicketDerivationRetrospective: createRunSpecsDerivationRetrospectiveSummary({
        summary: "Retrospectiva da derivacao concluiu antes do /run-all.",
      }),
      workflowGapAnalysis: createWorkflowGapAnalysisSummary({
        summary: "Retrospectiva pos-spec-audit concluiu apos o /run-all.",
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Pre-\/run_all: spec-ticket-validation/u);
  assert.match(sentMessages[0]?.text ?? "", /Pre-\/run_all: retrospectiva da derivacao/u);
  assert.match(sentMessages[0]?.text ?? "", /Pos-\/run_all: retrospectiva sistemica/u);
});

test("envia resumo final de /run-specs distinguindo retrospectiva da derivacao pre-run-all", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      specTicketDerivationRetrospective: createRunSpecsDerivationRetrospectiveSummary({
        workflowImprovementTicket: createWorkflowImprovementTicketSummary({
          detail: "Ticket transversal agregado da derivacao foi publicado antes do /run-all.",
        }),
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Pre-\/run_all: retrospectiva da derivacao/u);
  assert.match(sentMessages[0]?.text ?? "", /Decisao: executed/u);
  assert.match(sentMessages[0]?.text ?? "", /Modo de entrada: spec-ticket-validation-history/u);
  assert.match(sentMessages[0]?.text ?? "", /Ticket transversal ou limitacao associada:/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Ticket transversal agregado da derivacao foi publicado antes do \/run-all\./u,
  );
});

test("envia resumo final de fluxo /run-specs com tempos e snapshot parcial em falha", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      outcome: "failure",
      finalStage: "run-all",
      completionReason: "run-all-failure",
      details: "falha simulada no run-all encadeado",
      specTriage: createRunSpecsSpecTriageSummary(),
      specCloseAndVersion: createRunSpecsSpecCloseAndVersionSummary(),
      timing: createRunSpecsFlowTimingSnapshot({
        finishedAtUtc: "2026-02-19T15:02:45.000Z",
        totalDurationMs: 165000,
        durationsByStageMs: {
          "spec-triage": 90000,
          "spec-close-and-version": 45000,
          "run-all": 30000,
        },
        completedStages: ["spec-triage", "spec-close-and-version"],
        interruptedStage: "run-all",
      }),
      runAllSummary: createRunAllFlowSummary({
        outcome: "failure",
        finalStage: "implement",
        completionReason: "ticket-failure",
        processedTicketsCount: 1,
        codexPreferences: createFlowCodexPreferencesSnapshot({
          model: "gpt-5.4",
          reasoningEffort: "high",
          speed: "fast",
        }),
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.chatId, "99");
  assert.match(sentMessages[0]?.text ?? "", /Fluxo: run-specs/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: falha/u);
  assert.match(sentMessages[0]?.text ?? "", /Motivo de encerramento: run-all-failure/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Codex utilizado: gpt-5\.4 \| reasoning high \| velocidade Fast/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Spec: 2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(sentMessages[0]?.text ?? "", /Leitura operacional: falha simulada no run-all encadeado/u);
  assert.match(sentMessages[0]?.text ?? "", /Pre-\/run_all: spec-triage/u);
  assert.match(sentMessages[0]?.text ?? "", /Pre-\/run_all: spec-close-and-version/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 2m 45s \(165000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /- run-all: 30s \(30000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase interrompida: run-all/u);
  assert.match(sentMessages[0]?.text ?? "", /Timing da triagem pre-\/run_all/u);
  assert.match(sentMessages[0]?.text ?? "", /Tempo total: 3m 0s \(180000 ms\)/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado do \/run_all encadeado/u);
  assert.match(sentMessages[0]?.text ?? "", /Motivo de encerramento do \/run_all: ticket-failure/u);
});

test("envia resumo final de fluxo /run-specs com NO_GO antes do /run-all", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      outcome: "blocked",
      finalStage: "spec-ticket-validation",
      completionReason: "spec-ticket-validation-no-go",
      sourceCommand: "/run_specs_from_validation",
      entryPoint: "spec-ticket-validation",
      details: "Backlog derivado ainda nao esta seguro para seguir ao /run-all.",
      timing: createRunSpecsFlowTimingSnapshot({
        finishedAtUtc: "2026-02-19T15:02:15.000Z",
        totalDurationMs: 135000,
        durationsByStageMs: {
          "spec-ticket-validation": 75000,
        },
        completedStages: ["spec-ticket-validation"],
        interruptedStage: null,
      }),
      triageTiming: {
        ...createRunSpecsTriageTimingSnapshot(),
        finishedAtUtc: "2026-02-19T15:02:15.000Z",
        totalDurationMs: 135000,
        durationsByStageMs: {
          "spec-ticket-validation": 75000,
        },
        completedStages: ["spec-ticket-validation"],
        interruptedStage: null,
      },
      runAllSummary: undefined,
      specTicketValidation: createRunSpecsTicketValidationSummary({
        verdict: "NO_GO",
        confidence: "medium",
        finalReason: "no-auto-correctable-gaps",
        cyclesExecuted: 0,
        summary: "Persistem gaps de cobertura e fechamento observavel.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: ["tickets/open/2026-02-19-flow-a.md"],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["O unico ticket aberto nao cobre o gate antes do /run-all."],
            probableRootCause: "ticket",
            isAutoCorrectable: false,
          },
        ],
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Comando de origem: \/run_specs_from_validation/u);
  assert.match(sentMessages[0]?.text ?? "", /Ponto de entrada: spec-ticket-validation/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: bloqueado/u);
  assert.match(sentMessages[0]?.text ?? "", /Fase final: spec-ticket-validation/u);
  assert.match(
    sentMessages[0]?.text ?? "",
    /Motivo de encerramento: spec-ticket-validation-no-go/u,
  );
  assert.match(sentMessages[0]?.text ?? "", /Veredito: NO_GO/u);
  assert.match(sentMessages[0]?.text ?? "", /Confianca final: medium/u);
  assert.match(sentMessages[0]?.text ?? "", /Contagem final de gaps: 1/u);
  assert.match(sentMessages[0]?.text ?? "", /Gaps finais detalhados:/u);
  assert.match(sentMessages[0]?.text ?? "", /coverage-gap: RF-01 ainda sem ticket dedicado\./u);
  assert.doesNotMatch(sentMessages[0]?.text ?? "", /Resultado do \/run_all encadeado/u);
  assert.doesNotMatch(sentMessages[0]?.text ?? "", /Pre-\/run_all: spec-triage/u);
  assert.doesNotMatch(sentMessages[0]?.text ?? "", /- spec-triage:/u);
});

test("envia historico por ciclo no resumo de /run-specs quando houve revalidacao", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");
  const repeatedCorrection: RunSpecsTicketValidationSummary["appliedCorrections"][number] = {
    description: "Adicionar cobertura explicita de RF-01 no ticket derivado.",
    affectedArtifactPaths: ["tickets/open/2026-02-19-flow-a.md"],
    linkedGapTypes: ["coverage-gap"],
    outcome: "applied",
  };

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      outcome: "blocked",
      finalStage: "spec-ticket-validation",
      completionReason: "spec-ticket-validation-no-go",
      runAllSummary: undefined,
      specTicketValidation: createRunSpecsTicketValidationSummary({
        verdict: "NO_GO",
        confidence: "high",
        finalReason: "no-real-gap-reduction",
        cyclesExecuted: 1,
        summary: "Persistem gaps apos a revalidacao.",
        cycleHistory: [
          createRunSpecsTicketValidationCycleSummary({
            cycleNumber: 0,
            phase: "initial-validation",
            verdict: "NO_GO",
            confidence: "high",
            summary: "Primeiro passe encontrou gap auto-corrigivel.",
            openGapFingerprints: ["coverage-gap|tickets/open/2026-02-19-flow-a.md|rf-01"],
            appliedCorrections: [],
            realGapReductionFromPrevious: null,
          }),
          createRunSpecsTicketValidationCycleSummary({
            cycleNumber: 1,
            phase: "revalidation",
            verdict: "NO_GO",
            confidence: "high",
            summary: "Revalidacao ainda encontrou o mesmo gap.",
            openGapFingerprints: ["coverage-gap|tickets/open/2026-02-19-flow-a.md|rf-01"],
            appliedCorrections: [repeatedCorrection],
            realGapReductionFromPrevious: false,
          }),
        ],
        appliedCorrections: [repeatedCorrection],
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  const cycleHistoryText = sentMessages[0]?.text ?? "";
  assert.match(cycleHistoryText, /Evolucao por ciclo:/u);
  assert.match(
    cycleHistoryText,
    /ciclo 0 \[initial-validation\]: NO_GO\/high \| gaps=1 \| reducao-real=n\/a/u,
  );
  assert.match(
    cycleHistoryText,
    /ciclo 1 \[revalidation\]: NO_GO\/high \| gaps=1 \| reducao-real=nao/u,
  );
  assert.match(
    cycleHistoryText,
    /correcoes deste ciclo: Adicionar cobertura explicita de RF-01 no ticket derivado\. \(applied\)/u,
  );
  assert.match(cycleHistoryText, /Sintese final das correcoes aplicadas: 1 ajuste\(s\);/u);
  assert.equal(
    countOccurrences(cycleHistoryText, "Adicionar cobertura explicita de RF-01 no ticket derivado."),
    1,
  );
});

test("envia resumo final de /run-specs com limitacao operacional da retrospectiva sistemica", async () => {
  const { controller } = createController();
  const sentMessages = mockSendMessage(controller);
  callCaptureNotificationChat(controller, "99");

  await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      workflowGapAnalysis: createWorkflowGapAnalysisSummary({
        classification: "operational-limitation",
        confidence: "low",
        publicationEligibility: false,
        inputMode: "spec-and-audit-fallback",
        summary: "workflow-gap-analysis nao concluiu de forma confiavel.",
        causalHypothesis: "Analise causal indisponivel por limitacao operacional.",
        benefitSummary: "Nenhum ticket automatico deve ser aberto enquanto a limitacao persistir.",
        limitation: {
          code: "workflow-repo-context-missing",
          detail: "Repositorio codex-flow-runner nao encontrado em ../codex-flow-runner.",
        },
      }),
      workflowImprovementTicket: createWorkflowImprovementTicketSummary({
        status: "operational-limitation",
        targetRepoKind: "workflow-sibling",
        targetRepoPath: "/tmp/codex-flow-runner",
        targetRepoDisplayPath: "../codex-flow-runner",
        ticketFileName: null,
        ticketPath: null,
        detail: "Repositorio codex-flow-runner nao encontrado em ../codex-flow-runner.",
        limitationCode: "target-repo-missing",
        commitHash: null,
        pushUpstream: null,
        commitPushId: null,
      }),
    }),
  );

  assert.equal(sentMessages.length, 1);
  assert.match(sentMessages[0]?.text ?? "", /Pos-\/run_all: retrospectiva sistemica/u);
  assert.match(sentMessages[0]?.text ?? "", /Classificacao: operational-limitation/u);
  assert.match(sentMessages[0]?.text ?? "", /Limitacao operacional: workflow-repo-context-missing/u);
  assert.match(sentMessages[0]?.text ?? "", /Detalhe da limitacao: Repositorio codex-flow-runner nao encontrado/u);
  assert.match(sentMessages[0]?.text ?? "", /Pos-\/run_all: ticket transversal/u);
  assert.match(sentMessages[0]?.text ?? "", /Resultado: operational-limitation/u);
  assert.match(sentMessages[0]?.text ?? "", /Limitacao de publication: target-repo-missing/u);
});

test("envio de resumo final de fluxo grande usa chunking e retorna delivery estruturado", async () => {
  const { controller } = createController({ allowedChatId: "42" });
  const sentMessages = mockSendMessage(controller);

  const delivery = await controller.sendRunFlowSummary(
    createRunSpecsFlowSummary({
      details: "linha extensa\n".repeat(600),
    }),
  );

  assert.ok(delivery);
  assert.equal(sentMessages.length > 1, true);
  assert.equal(delivery?.chunkCount, sentMessages.length);
  assert.match(sentMessages[0]?.text ?? "", /Parte 1\//u);
});

test("envio de resumo final de fluxo falha com erro estruturado quando o Telegram rejeita o envio", async () => {
  const { controller, logger } = createController({ allowedChatId: "42" });
  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: () => Promise<unknown>;
      };
    };
  };

  let sendAttempts = 0;
  internalController.bot.telegram.sendMessage = async () => {
    sendAttempts += 1;
    throw new Error("falha de transporte simulada");
  };

  await assert.rejects(
    () => controller.sendRunFlowSummary(createRunAllFlowSummary()),
    (error) =>
      error instanceof FlowNotificationDispatchError &&
      error.failure.errorClass === "non-retryable",
  );

  assert.equal(sendAttempts, 1);
  assert.equal(logger.errors.length, 1);
  assert.equal(
    logger.errors[0]?.message,
    "Falha definitiva ao enviar resumo final de fluxo no Telegram",
  );
  assert.equal(logger.errors[0]?.context?.flow, "run-all");
  assert.equal(logger.errors[0]?.context?.outcome, "success");
  assert.equal(logger.errors[0]?.context?.finalStage, "select-ticket");
  assert.equal(logger.errors[0]?.context?.chunkIndex, 1);
  assert.equal(logger.errors[0]?.context?.policy, "run-flow-summary");
  assert.equal(logger.errors[0]?.context?.logicalMessageType, "run-flow-summary");
  assert.equal(logger.errors[0]?.context?.destinationChatId, "42");
});

test("status inclui modelo e reasoning selecionados e observados", () => {
  const { controller } = createController();
  const state = createState({
    activeProject: cloneProject(defaultActiveProject),
    planSpecSession: createPlanSpecSession({
      observedModel: "gpt-5.4",
      observedReasoningEffort: "xhigh",
      observedAt: new Date("2026-03-13T10:00:00.000Z"),
    }),
    codexChatSession: createCodexChatSession({
      observedModel: "gpt-5.4",
      observedReasoningEffort: "high",
      observedAt: new Date("2026-03-13T10:05:00.000Z"),
    }),
  });
  const codexPreferences = new Map<string, CodexResolvedProjectPreferences | Error>([
    [
      `${defaultActiveProject.name}::${defaultActiveProject.path}`,
      createResolvedCodexPreferences({
        project: defaultActiveProject,
        model: "gpt-5.4",
        reasoningEffort: "xhigh",
      }),
    ],
  ]);

  const reply = callBuildStatusReply(controller, state, codexPreferences);

  assert.match(reply, /Projeto ativo Codex: gpt-5\.4 \| reasoning xhigh \| velocidade Standard \| origem runner-local/u);
  assert.match(reply, /Seleção atual \/plan_spec Codex: gpt-5\.4 \| reasoning xhigh \| velocidade Standard/u);
  assert.match(reply, /Último turn_context \/plan_spec: gpt-5\.4 \| reasoning xhigh/u);
  assert.match(reply, /Seleção atual \/codex_chat Codex: gpt-5\.4 \| reasoning xhigh \| velocidade Standard/u);
  assert.match(reply, /Último turn_context \/codex_chat: gpt-5\.4 \| reasoning high/u);
});

test("status inclui ultimo fluxo concluido com fase final e motivo de encerramento", () => {
  const { controller } = createController();
  const state = createState({
    lastRunFlowSummary: createRunSpecsFlowSummary({
      outcome: "failure",
      finalStage: "spec-ticket-validation",
      completionReason: "spec-ticket-validation-failure",
      sourceCommand: "/run_specs_from_validation",
      entryPoint: "spec-ticket-validation",
      details:
        "Nao foi possivel derivar com seguranca o pacote de tickets da spec; nenhum ticket aberto da linhagem foi encontrado.",
    }),
  });

  const reply = callBuildStatusReply(controller, state);

  assert.match(reply, /Último fluxo concluído: run-specs \(failure\)/u);
  assert.match(reply, /Última fase final de fluxo: spec-ticket-validation/u);
  assert.match(reply, /Último motivo de encerramento: spec-ticket-validation-failure/u);
  assert.match(reply, /Última spec de fluxo: 2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(reply, /Último comando de origem do fluxo: \/run_specs_from_validation/u);
  assert.match(reply, /Último ponto de entrada do fluxo: spec-ticket-validation/u);
  assert.match(reply, /Detalhes do último fluxo: Nao foi possivel derivar com seguranca o pacote de tickets da spec/u);
});

test("status inclui rastreabilidade do ultimo ticket processado e do ticket afetado na selecao do run-all", () => {
  const { controller } = createController();
  const state = createState({
    lastRunFlowSummary: createRunAllFlowSummary({
      completionReason: "blocked-tickets-only",
      lastProcessedTicket: "2026-02-19-ticket-processado.md",
      selectionTicket: "2026-02-19-ticket-bloqueado.md",
      details: "Restam apenas tickets blocked no backlog.",
    }),
  });

  const reply = callBuildStatusReply(controller, state);

  assert.match(reply, /Último fluxo concluído: run-all \(success\)/u);
  assert.match(reply, /Último ticket processado no fluxo: 2026-02-19-ticket-processado\.md/u);
  assert.match(reply, /Último ticket afetado na seleção: 2026-02-19-ticket-bloqueado\.md/u);
  assert.match(reply, /Detalhes do último fluxo: Restam apenas tickets blocked no backlog\./u);
});

test("status inclui rastreabilidade da notificacao do resumo final de fluxo e sua falha", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      lastRunFlowSummary: createRunSpecsFlowSummary(),
      lastRunFlowNotificationEvent: {
        summary: createRunSpecsFlowSummary(),
        delivery: {
          channel: "telegram",
          destinationChatId: "42",
          deliveredAtUtc: "2026-02-19T15:09:30.000Z",
          attempts: 2,
          maxAttempts: 4,
          chunkCount: 3,
        },
      },
      lastRunFlowNotificationFailure: {
        summary: createRunAllFlowSummary({
          outcome: "failure",
          finalStage: "implement",
          completionReason: "ticket-failure",
        }),
        failure: {
          channel: "telegram",
          destinationChatId: "42",
          failedAtUtc: "2026-02-19T15:12:00.000Z",
          attempts: 4,
          maxAttempts: 4,
          errorMessage: "message is too long",
          errorCode: "400",
          errorClass: "non-retryable",
          retryable: false,
          failedChunkIndex: 2,
          chunkCount: 3,
        },
      },
    }),
  );

  assert.match(reply, /Último resumo final de fluxo notificado: run-specs \(success\)/u);
  assert.match(reply, /Fase final do fluxo notificado: spec-audit/u);
  assert.match(reply, /Tentativas até entrega do fluxo: 2\/4/u);
  assert.match(reply, /Partes do resumo de fluxo enviadas: 3/u);
  assert.match(reply, /Última falha de notificação de fluxo: run-all \(failure\)/u);
  assert.match(reply, /Fase com falha de notificação de fluxo: implement/u);
  assert.match(reply, /Código do erro de notificação de fluxo: 400/u);
  assert.match(reply, /Parte do resumo de fluxo com falha: 2\/3/u);
});

test("status detalha fluxo target ativo e o ultimo target flow concluido", () => {
  const { controller } = createController();
  const reply = callBuildStatusReply(
    controller,
    createState({
      isRunning: true,
      phase: "target-checkup-evidence-collection",
      capacity: {
        limit: 5,
        used: 1,
      },
      activeSlots: [
        {
          project: {
            name: "alpha-project",
            path: "/home/mapita/projetos/alpha-project",
          },
          kind: "target-checkup",
          phase: "target-checkup-evidence-collection",
          currentTicket: null,
          currentSpec: null,
          isPaused: false,
          targetFlowCommand: "/target_checkup",
          targetFlowMilestone: "evidence-collection",
          targetFlowVersionBoundaryState: "before-versioning",
          startedAt: new Date("2026-03-24T23:20:00.000Z"),
        },
      ],
      targetFlow: {
        flow: "target-checkup",
        command: "/target_checkup",
        targetProject: {
          name: "alpha-project",
          path: "/home/mapita/projetos/alpha-project",
        },
        phase: "target-checkup-evidence-collection",
        milestone: "evidence-collection",
        milestoneLabel: "coleta de evidencias",
        versionBoundaryState: "before-versioning",
        cancelRequestedAt: new Date("2026-03-24T23:21:30.000Z"),
        startedAt: new Date("2026-03-24T23:20:00.000Z"),
        updatedAt: new Date("2026-03-24T23:21:00.000Z"),
        lastMessage: "Coleta de evidencias em andamento.",
      },
      lastRunFlowSummary: {
        flow: "target-derive",
        command: "/target_derive_gaps",
        outcome: "cancelled",
        finalStage: "materialization",
        completionReason: "cancelled",
        timestampUtc: "2026-03-24T23:19:00.000Z",
        targetProjectName: "beta-project",
        targetProjectPath: "/home/mapita/projetos/beta-project",
        versionBoundaryState: "before-versioning",
        nextAction: "Revise o working tree antes de decidir o proximo passo.",
        artifactPaths: ["tickets/open/2026-03-24-gap-beta.md"],
        versionedArtifactPaths: [],
        details: "Cancelado em materializacao.",
        timing: {
          startedAtUtc: "2026-03-24T23:18:00.000Z",
          finishedAtUtc: "2026-03-24T23:19:00.000Z",
          totalDurationMs: 60000,
          durationsByStageMs: {
            preflight: 10000,
            "dedup-prioritization": 20000,
            materialization: 30000,
          },
          completedStages: ["preflight", "dedup-prioritization"],
          interruptedStage: "materialization",
        },
      },
    }),
  );

  assert.match(reply, /Fluxo target ativo: \/target_checkup/u);
  assert.match(reply, /1\. alpha-project \(\/target_checkup\)/u);
  assert.match(reply, /milestone: evidence-collection/u);
  assert.match(reply, /Último fluxo concluído: target-derive \(cancelled\)/u);
  assert.match(reply, /Último comando target: \/target_derive_gaps/u);
  assert.match(reply, /Fase do fluxo target: target-checkup-evidence-collection/u);
  assert.match(reply, /Milestone target atual: coleta de evidencias/u);
  assert.match(reply, /Cancelamento target solicitado em: 2026-03-24T23:21:30\.000Z/u);
  assert.match(reply, /Detalhe do fluxo target: Coleta de evidencias em andamento\./u);
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
        runSpecsSourceCommand: "/run_specs_from_validation",
        runSpecsEntryPoint: "spec-ticket-validation",
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
  assert.match(reply, /origem: \/run_specs_from_validation/u);
  assert.match(reply, /entrada: spec-ticket-validation/u);
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
