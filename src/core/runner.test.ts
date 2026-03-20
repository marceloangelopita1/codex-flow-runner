import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AppEnv } from "../config/env.js";
import {
  CodexAuthenticationError,
  CodexChatSession,
  CodexChatSessionCloseResult,
  CodexChatSessionError,
  CodexStageDiagnostics,
  CodexChatSessionEvent,
  CodexChatSessionStartRequest,
  CodexDiscoverSpecSessionError,
  CodexPlanSessionError,
  CodexStageExecutionError,
  CodexStageResult,
  DiscoverSpecSession,
  DiscoverSpecSessionCloseResult,
  DiscoverSpecSessionEvent,
  DiscoverSpecSessionStartRequest,
  PlanSpecSession,
  PlanSpecSessionCloseResult,
  PlanSpecSessionEvent,
  PlanSpecSessionStartRequest,
  CodexTicketFlowClient,
  SpecTicketValidationAutoCorrectRequest,
  SpecTicketValidationAutoCorrectResult,
  SpecTicketValidationSession,
  SpecTicketValidationSessionStartRequest,
  SpecFlowStage,
  SpecRef,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { GitSyncEvidence, GitVersioning } from "../integrations/git-client.js";
import { PlanSpecFinalBlock, PlanSpecQuestionBlock } from "../integrations/plan-spec-parser.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
import {
  WorkflowStageTraceRecordRequest,
  WorkflowTraceStore,
} from "../integrations/workflow-trace-store.js";
import { FileSystemWorkflowImprovementTicketPublisher } from "../integrations/workflow-improvement-ticket-publisher.js";
import { ProjectRef } from "../types/project.js";
import {
  CodexFlowPreferencesSnapshot,
  CodexInvocationPreferences,
} from "../types/codex-preferences.js";
import { RunnerFlowSummary } from "../types/flow-timing.js";
import {
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationPassResult,
} from "../types/spec-ticket-validation.js";
import {
  TicketFinalSummary,
  TicketNotificationDispatchError,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
import { buildWorkflowImprovementTicketFindingFingerprint } from "../types/workflow-improvement-ticket.js";
import { Logger } from "./logger.js";
import {
  PlanSpecEventHandlers,
  RunFlowEventHandlers,
  RunSpecsEventHandlers,
  RunSpecsTriageLifecycleEvent,
  RunnerRoundDependencies,
  TicketRunner,
  TicketRunnerOptions,
} from "./runner.js";

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

class StubCodexClient implements CodexTicketFlowClient {
  public readonly calls: Array<{
    stage: TicketFlowStage | SpecFlowStage;
    ticketName: string;
    target: "ticket" | "spec";
    spec?: SpecRef;
  }> = [];
  public authChecks = 0;
  public discoverSessionStartCalls = 0;
  public planSessionStartCalls = 0;
  public freeChatSessionStartCalls = 0;
  public specTicketValidationSessionStartCalls = 0;
  public specTicketValidationAutoCorrectCalls = 0;
  public lastDiscoverSession: StubDiscoverSession | null = null;
  public lastPlanSession: StubPlanSession | null = null;
  public lastFreeChatSession: StubCodexChatSession | null = null;
  public lastSpecTicketValidationSession: SpecTicketValidationSession | null = null;
  public lastSpecTicketValidationAutoCorrectRequest:
    | SpecTicketValidationAutoCorrectRequest
    | null = null;
  public invocationPreferences: CodexInvocationPreferences | null;
  public readonly stageOutputs: Partial<Record<TicketFlowStage | SpecFlowStage, string>> = {};
  public specTicketValidationTurns: SpecTicketValidationPassResult[] = [
    createSpecTicketValidationPassResult(),
  ];
  public specTicketValidationAutoCorrectHandler:
    | ((
        request: SpecTicketValidationAutoCorrectRequest,
      ) =>
        | Promise<SpecTicketValidationAppliedCorrection[]>
        | SpecTicketValidationAppliedCorrection[])
    | null = null;
  public specTicketValidationSessionFactory:
    | (() => SpecTicketValidationSession)
    | null = null;
  private fixedInvocationPreferences: CodexInvocationPreferences | null | undefined;

  constructor(
    private readonly shouldFail?: (
      stage: TicketFlowStage | SpecFlowStage,
      target: { name: string },
    ) => boolean,
    private readonly includeExecPlanPath = true,
    private readonly failAuthentication = false,
    private readonly authDelayMs = 0,
    private readonly onStageStart?: (
      stage: TicketFlowStage | SpecFlowStage,
      target: { name: string },
    ) => void,
    private readonly failPlanSessionStart = false,
    private readonly onSpecStageRun?: (stage: SpecFlowStage, spec: SpecRef) => Promise<void> | void,
    private readonly failFreeChatSessionStart = false,
    private readonly stageDiagnostics: Partial<
      Record<TicketFlowStage | SpecFlowStage, CodexStageDiagnostics>
    > = {},
    invocationPreferences: CodexInvocationPreferences | null = {
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      speed: "standard",
    },
  ) {
    this.invocationPreferences = invocationPreferences;
  }

  async ensureAuthenticated(): Promise<void> {
    if (this.authDelayMs > 0) {
      await sleep(this.authDelayMs);
    }
    this.authChecks += 1;
    if (this.failAuthentication) {
      throw new CodexAuthenticationError("sessao ausente");
    }
  }

  async snapshotInvocationPreferences(): Promise<CodexInvocationPreferences | null> {
    const resolved = this.fixedInvocationPreferences ?? this.invocationPreferences;
    return resolved ? { ...resolved } : null;
  }

  forkWithFixedInvocationPreferences(
    preferences: CodexInvocationPreferences | null,
  ): CodexTicketFlowClient {
    this.fixedInvocationPreferences = preferences ? { ...preferences } : null;
    return this;
  }

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    this.calls.push({ stage, ticketName: ticket.name, target: "ticket" });
    this.onStageStart?.(stage, { name: ticket.name });
    const stageDiagnostics = this.stageDiagnostics[stage];

    if (this.shouldFail?.(stage, { name: ticket.name })) {
      throw new CodexStageExecutionError(
        ticket.name,
        stage,
        "falha simulada",
        `/tmp/prompts/${stage}.md`,
        `prompt:${stage}:${ticket.name}`,
        stageDiagnostics,
      );
    }

    return {
      stage,
      output: this.resolveStageOutput(stage),
      diagnostics: {
        stdoutPreview: stageDiagnostics?.stdoutPreview ?? this.resolveStageOutput(stage),
        ...(stageDiagnostics?.stderrPreview ? { stderrPreview: stageDiagnostics.stderrPreview } : {}),
      },
      promptTemplatePath: `/tmp/prompts/${stage}.md`,
      promptText: `prompt:${stage}:${ticket.name}`,
      ...(stage === "plan" && this.includeExecPlanPath
        ? { execPlanPath: `execplans/${ticket.name.replace(/\.md$/u, "")}.md` }
        : {}),
    };
  }

  async runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult> {
    this.calls.push({
      stage,
      ticketName: spec.fileName,
      target: "spec",
      spec: cloneSpecRef(spec),
    });
    this.onStageStart?.(stage, { name: spec.fileName });
    const stageDiagnostics = this.stageDiagnostics[stage];

    if (this.shouldFail?.(stage, { name: spec.fileName })) {
      throw new CodexStageExecutionError(
        spec.fileName,
        stage,
        "falha simulada",
        `/tmp/prompts/${stage}.md`,
        `prompt:${stage}:${spec.fileName}`,
        stageDiagnostics,
      );
    }

    await this.onSpecStageRun?.(stage, spec);

    return {
      stage,
      output: this.resolveStageOutput(stage),
      diagnostics: {
        stdoutPreview: stageDiagnostics?.stdoutPreview ?? this.resolveStageOutput(stage),
        ...(stageDiagnostics?.stderrPreview ? { stderrPreview: stageDiagnostics.stderrPreview } : {}),
      },
      promptTemplatePath: `/tmp/prompts/${stage}.md`,
      promptText: `prompt:${stage}:${spec.fileName}`,
    };
  }

  async startPlanSession(request: PlanSpecSessionStartRequest): Promise<PlanSpecSession> {
    this.planSessionStartCalls += 1;
    if (this.failPlanSessionStart) {
      throw new CodexPlanSessionError("start", "falha simulada");
    }

    const session = new StubPlanSession(request);
    this.lastPlanSession = session;
    return session;
  }

  async startDiscoverSession(request: DiscoverSpecSessionStartRequest): Promise<DiscoverSpecSession> {
    this.discoverSessionStartCalls += 1;
    if (this.failPlanSessionStart) {
      throw new CodexDiscoverSpecSessionError("start", "falha simulada");
    }

    const session = new StubDiscoverSession(request);
    this.lastDiscoverSession = session;
    return session;
  }

  async startFreeChatSession(request: CodexChatSessionStartRequest): Promise<CodexChatSession> {
    this.freeChatSessionStartCalls += 1;
    if (this.failFreeChatSessionStart) {
      throw new CodexChatSessionError("start", "falha simulada");
    }

    const session = new StubCodexChatSession(request);
    this.lastFreeChatSession = session;
    return session;
  }

  async startSpecTicketValidationSession(
    _request: SpecTicketValidationSessionStartRequest,
  ): Promise<SpecTicketValidationSession> {
    this.specTicketValidationSessionStartCalls += 1;
    const session =
      this.specTicketValidationSessionFactory?.() ??
      new StubSpecTicketValidationSession(this.specTicketValidationTurns);
    this.lastSpecTicketValidationSession = session;
    return session;
  }

  async runSpecTicketValidationAutoCorrect(
    request: SpecTicketValidationAutoCorrectRequest,
  ): Promise<SpecTicketValidationAutoCorrectResult> {
    this.specTicketValidationAutoCorrectCalls += 1;
    this.lastSpecTicketValidationAutoCorrectRequest = {
      ...request,
      allowedArtifactPaths: [...request.allowedArtifactPaths],
    };

    const appliedCorrections = this.specTicketValidationAutoCorrectHandler
      ? await this.specTicketValidationAutoCorrectHandler(request)
      : [];

    return {
      output: "stub",
      appliedCorrections,
      promptTemplatePath: "/tmp/prompts/10-autocorrigir-tickets-derivados-da-spec.md",
      promptText: "prompt:spec-ticket-validation-autocorrect",
    };
  }

  private resolveStageOutput(stage: TicketFlowStage | SpecFlowStage): string {
    if (this.stageOutputs[stage]) {
      return this.stageOutputs[stage] ?? "";
    }

    if (stage === "spec-audit") {
      return createSpecAuditOutput({
        residualGapsDetected: false,
        followUpTicketsCreated: 0,
      });
    }

    if (stage === "spec-ticket-derivation-retrospective") {
      return createWorkflowGapAnalysisOutput({
        inputMode: "spec-ticket-validation-history",
      });
    }

    if (stage === "spec-workflow-retrospective") {
      return createWorkflowGapAnalysisOutput();
    }

    return `ok:${stage}`;
  }
}

const createSpecAuditOutput = (value: {
  residualGapsDetected: boolean;
  followUpTicketsCreated: number;
}): string =>
  [
    "Auditoria concluida.",
    "",
    "[[SPEC_AUDIT_RESULT]]",
    `residual_gaps_detected: ${value.residualGapsDetected ? "yes" : "no"}`,
    `follow_up_tickets_created: ${String(value.followUpTicketsCreated)}`,
    "[[/SPEC_AUDIT_RESULT]]",
  ].join("\n");

const createWorkflowGapAnalysisOutput = (value: {
  classification?:
    | "systemic-gap"
    | "systemic-hypothesis"
    | "not-systemic"
    | "emphasis-only"
    | "operational-limitation";
  confidence?: "high" | "medium" | "low";
  publicationEligibility?: boolean;
  inputMode?:
    | "spec-ticket-validation-history"
    | "follow-up-tickets"
    | "spec-and-audit-fallback";
  summary?: string;
  causalHypothesis?: string;
  benefitSummary?: string;
  findings?: Array<{
    summary: string;
    affectedArtifactPaths: string[];
    requirementRefs: string[];
    evidence: string[];
  }>;
  workflowArtifactsConsulted?: string[];
  followUpTicketPaths?: string[];
  historicalReference?:
    | {
        summary: string;
        ticketPath: string | null;
        findingFingerprints: string[];
      }
    | null;
  limitation?:
    | {
        code:
          | "analysis-execution-failed"
          | "invalid-analysis-contract"
          | "workflow-repo-context-missing";
        detail: string;
      }
    | null;
} = {}): string =>
  [
    "Retrospectiva concluida.",
    "",
    "[[WORKFLOW_GAP_ANALYSIS]]",
    "```json",
    JSON.stringify(
      {
        classification: value.classification ?? "not-systemic",
        confidence: value.confidence ?? "low",
        publicationEligibility: value.publicationEligibility ?? false,
        inputMode: value.inputMode ?? "spec-and-audit-fallback",
        summary: value.summary ?? "Nao ha evidencia suficiente de contribuicao sistemica.",
        causalHypothesis:
          value.causalHypothesis ?? "O gap observado parece local ao pacote auditado.",
        benefitSummary:
          value.benefitSummary ?? "Nenhum ticket automatico de workflow e necessario nesta rodada.",
        findings: value.findings ?? [],
        workflowArtifactsConsulted: value.workflowArtifactsConsulted ?? [
          "AGENTS.md",
          "prompts/11-retrospectiva-workflow-apos-spec-audit.md",
        ],
        followUpTicketPaths: value.followUpTicketPaths ?? [],
        limitation: value.limitation ?? null,
        historicalReference: value.historicalReference ?? null,
      },
      null,
      2,
    ),
    "```",
    "[[/WORKFLOW_GAP_ANALYSIS]]",
  ].join("\n");

class StubDiscoverSession implements DiscoverSpecSession {
  public readonly sentInputs: string[] = [];
  public cancelCalls = 0;

  constructor(private readonly request: DiscoverSpecSessionStartRequest) {}

  async sendUserInput(input: string): Promise<void> {
    this.sentInputs.push(input);
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
    this.request.callbacks.onClose?.({
      exitCode: null,
      cancelled: true,
    });
  }

  emitEvent(event: DiscoverSpecSessionEvent): void {
    this.request.callbacks.onEvent(event);
  }

  emitRawOutput(text: string): void {
    this.emitEvent({
      type: "raw-sanitized",
      text,
    });
  }

  fail(details: string): void {
    this.request.callbacks.onFailure(new CodexDiscoverSpecSessionError("runtime", details));
  }

  close(result: DiscoverSpecSessionCloseResult): void {
    this.request.callbacks.onClose?.(result);
  }
}

class StubPlanSession implements PlanSpecSession {
  public readonly sentInputs: string[] = [];
  public cancelCalls = 0;

  constructor(private readonly request: PlanSpecSessionStartRequest) {}

  async sendUserInput(input: string): Promise<void> {
    this.sentInputs.push(input);
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
    this.request.callbacks.onClose?.({
      exitCode: null,
      cancelled: true,
    });
  }

  emitEvent(event: PlanSpecSessionEvent): void {
    this.request.callbacks.onEvent(event);
  }

  emitQuestion(question: PlanSpecQuestionBlock): void {
    this.emitEvent({
      type: "question",
      question,
    });
  }

  emitFinal(finalBlock: PlanSpecFinalBlock): void {
    this.emitEvent({
      type: "final",
      final: finalBlock,
    });
  }

  emitRawOutput(text: string): void {
    this.emitEvent({
      type: "raw-sanitized",
      text,
    });
  }

  fail(details: string): void {
    this.request.callbacks.onFailure(new CodexPlanSessionError("runtime", details));
  }

  close(result: PlanSpecSessionCloseResult): void {
    this.request.callbacks.onClose?.(result);
  }
}

class StubCodexChatSession implements CodexChatSession {
  public readonly sentInputs: string[] = [];
  public cancelCalls = 0;

  constructor(private readonly request: CodexChatSessionStartRequest) {}

  async sendUserInput(input: string): Promise<void> {
    this.sentInputs.push(input);
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
    this.request.callbacks.onClose?.({
      exitCode: null,
      cancelled: true,
    });
  }

  emitEvent(event: CodexChatSessionEvent): void {
    this.request.callbacks.onEvent(event);
  }

  emitRawOutput(text: string): void {
    this.emitEvent({
      type: "raw-sanitized",
      text,
    });
  }

  fail(details: string): void {
    this.request.callbacks.onFailure(new CodexChatSessionError("runtime", details));
  }

  close(result: CodexChatSessionCloseResult): void {
    this.request.callbacks.onClose?.(result);
  }
}

class StubSpecTicketValidationSession implements SpecTicketValidationSession {
  public readonly turns: Array<{
    packageContext: string;
    appliedCorrectionsSummary: string[];
  }> = [];
  public cancelCalls = 0;

  constructor(private readonly scriptedTurns: SpecTicketValidationPassResult[] = []) {}

  async runTurn(request: {
    packageContext: string;
    appliedCorrectionsSummary?: string[];
  }) {
    this.turns.push({
      packageContext: request.packageContext,
      appliedCorrectionsSummary: request.appliedCorrectionsSummary ?? [],
    });

    const scriptedTurn =
      this.scriptedTurns.shift() ??
      this.scriptedTurns[this.scriptedTurns.length - 1] ??
      createSpecTicketValidationPassResult();

    return {
      threadId: "stub-spec-ticket-validation-thread",
      output: "stub",
      parsed: scriptedTurn,
      promptTemplatePath: "/tmp/prompts/09-validar-tickets-derivados-da-spec.md",
      promptText: "prompt:spec-ticket-validation",
    };
  }

  getThreadId(): string | null {
    return "stub-spec-ticket-validation-thread";
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
  }
}

class StubGitVersioning implements GitVersioning {
  public syncChecks = 0;
  public readonly commitClosures: Array<{ ticketName: string; execPlanPath: string }> = [];
  public readonly explicitPathPublishes: Array<{
    paths: string[];
    subject: string;
    bodyParagraphs: string[];
  }> = [];

  constructor(
    private readonly failSyncCheck = false,
    private readonly evidence: GitSyncEvidence = {
      commitHash: "abc123",
      upstream: "origin/main",
      commitPushId: "abc123@origin/main",
    },
    private readonly failCommitClosure = false,
    private readonly commitClosureErrorMessage = "falha simulada no versionamento git",
  ) {}

  async commitTicketClosure(ticketName: string, execPlanPath: string): Promise<void> {
    this.commitClosures.push({ ticketName, execPlanPath });
    if (this.failCommitClosure) {
      throw new Error(this.commitClosureErrorMessage);
    }
  }

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs: string[] = [],
  ): Promise<GitSyncEvidence | null> {
    this.explicitPathPublishes.push({
      paths: [...paths],
      subject,
      bodyParagraphs: [...bodyParagraphs],
    });
    if (this.failCommitClosure) {
      throw new Error(this.commitClosureErrorMessage);
    }

    return this.evidence;
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    this.syncChecks += 1;
    if (this.failSyncCheck) {
      throw new Error("push obrigatorio nao concluido");
    }

    return this.evidence;
  }
}

const env: AppEnv = {
  TELEGRAM_BOT_TOKEN: "test-token",
  TELEGRAM_ALLOWED_CHAT_ID: "42",
  PROJECTS_ROOT_PATH: "/tmp/projects",
  POLL_INTERVAL_MS: 1,
  RUN_ALL_MAX_TICKETS_PER_ROUND: 20,
  SHUTDOWN_DRAIN_TIMEOUT_MS: 30000,
  PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM: false,
};

const activeProjectA: ProjectRef = {
  name: "alpha-project",
  path: "/tmp/projects/alpha-project",
};

const activeProjectB: ProjectRef = {
  name: "beta-project",
  path: "/tmp/projects/beta-project",
};

const defaultQueue: TicketQueue = {
  ensureStructure: async () => undefined,
  nextOpenTicket: async () => null,
  closeTicket: async () => undefined,
};

const ticketA: TicketRef = {
  name: "2026-02-19-flow-a.md",
  openPath: "/tmp/repo/tickets/open/2026-02-19-flow-a.md",
  closedPath: "/tmp/repo/tickets/closed/2026-02-19-flow-a.md",
};

const ticketB: TicketRef = {
  name: "2026-02-19-flow-b.md",
  openPath: "/tmp/repo/tickets/open/2026-02-19-flow-b.md",
  closedPath: "/tmp/repo/tickets/closed/2026-02-19-flow-b.md",
};

const specFileName = "2026-02-19-approved-spec-triage-run-specs.md";

const createPlanSpecOutline = () => ({
  objective: "Transformar o planejamento interativo em uma spec rica e pronta para execucao.",
  actors: ["Operador do Telegram", "Runner do Codex"],
  journey: [
    "Operador descreve a necessidade em linguagem natural.",
    "Codex devolve um bloco final estruturado.",
  ],
  requirements: [
    "RF-01 - O bloco final deve carregar RFs e CAs aprovados.",
    "RF-02 - A spec criada deve preservar jornada e nao-escopo.",
  ],
  acceptanceCriteria: [
    "CA-01 - O runner injeta o contexto estruturado na materializacao.",
    "CA-02 - A spec criada registra RFs, CAs e validacoes pendentes.",
  ],
  nonScope: ["Nao implementar a feature final nesta etapa."],
  technicalConstraints: ["Manter o protocolo parseavel e sequencial."],
  mandatoryValidations: ["Conferir se RFs e CAs aparecem na spec criada."],
  pendingManualValidations: ["Revisar a clareza final da jornada com um humano."],
  knownRisks: ["Resumo comprimido demais degrada a qualidade da spec resultante."],
});

const createPlanSpecFinalBlock = (): PlanSpecFinalBlock => ({
  title: "Bridge interativa do Codex",
  summary: "Sessao /plan com parser e callbacks no Telegram.",
  outline: createPlanSpecOutline(),
  categoryCoverage: [],
  assumptionsAndDefaults: [],
  decisionsAndTradeOffs: [],
  criticalAmbiguities: [],
  actions: [
    { id: "create-spec", label: "Criar spec" },
    { id: "refine", label: "Refinar" },
    { id: "cancel", label: "Cancelar" },
  ],
});

const createDiscoverSpecFinalBlock = (
  value: Partial<PlanSpecFinalBlock> = {},
): PlanSpecFinalBlock => {
  const base = createPlanSpecFinalBlock();
  return {
    ...base,
    ...value,
    outline: {
      ...base.outline,
      ...value.outline,
      actors: [...(value.outline?.actors ?? base.outline.actors)],
      journey: [...(value.outline?.journey ?? base.outline.journey)],
      requirements: [...(value.outline?.requirements ?? base.outline.requirements)],
      acceptanceCriteria: [
        ...(value.outline?.acceptanceCriteria ?? base.outline.acceptanceCriteria),
      ],
      nonScope: [...(value.outline?.nonScope ?? base.outline.nonScope)],
      technicalConstraints: [
        ...(value.outline?.technicalConstraints ?? base.outline.technicalConstraints),
      ],
      mandatoryValidations: [
        ...(value.outline?.mandatoryValidations ?? base.outline.mandatoryValidations),
      ],
      pendingManualValidations: [
        ...(value.outline?.pendingManualValidations ?? base.outline.pendingManualValidations),
      ],
      knownRisks: [...(value.outline?.knownRisks ?? base.outline.knownRisks)],
    },
    categoryCoverage: value.categoryCoverage
      ? value.categoryCoverage.map((item) => ({ ...item }))
      : [
          {
            categoryId: "objective-value",
            label: "Objetivo e valor esperado",
            status: "covered",
            detail: "Objetivo aprovado com valor esperado explicito.",
          },
          {
            categoryId: "actors-journey",
            label: "Atores e jornada",
            status: "covered",
            detail: "Atores centrais e jornada principal descritos.",
          },
          {
            categoryId: "functional-scope",
            label: "Escopo funcional",
            status: "covered",
            detail: "Escopo funcional delimitado.",
          },
          {
            categoryId: "non-scope",
            label: "Nao-escopo",
            status: "covered",
            detail: "Nao-escopo declarado.",
          },
          {
            categoryId: "constraints-dependencies",
            label: "Restricoes tecnicas e dependencias",
            status: "covered",
            detail: "Restricoes e dependencias resolvidas.",
          },
          {
            categoryId: "validations-acceptance",
            label: "Validacoes e criterios de aceite",
            status: "covered",
            detail: "Validacoes obrigatorias e CAs listados.",
          },
          {
            categoryId: "risks",
            label: "Riscos operacionais e funcionais",
            status: "covered",
            detail: "Riscos conhecidos registrados.",
          },
          {
            categoryId: "assumptions-defaults",
            label: "Assumptions e defaults",
            status: "covered",
            detail: "Defaults conscientes aprovados.",
          },
          {
            categoryId: "decisions-tradeoffs",
            label: "Decisoes e trade-offs",
            status: "covered",
            detail: "Trade-offs relevantes aprovados.",
          },
        ],
    assumptionsAndDefaults: [...(value.assumptionsAndDefaults ?? ["Assumir monorepo Node.js 20+."])],
    decisionsAndTradeOffs: [
      ...(value.decisionsAndTradeOffs ?? ["Reutilizar callbacks existentes em vez de criar um novo protocolo."]),
    ],
    criticalAmbiguities: [...(value.criticalAmbiguities ?? [])],
    actions: value.actions ? value.actions.map((action) => ({ ...action })) : base.actions.map((action) => ({ ...action })),
  };
};

const cloneSpecRef = (spec: SpecRef): SpecRef => ({
  fileName: spec.fileName,
  path: spec.path,
  ...(spec.plannedTitle ? { plannedTitle: spec.plannedTitle } : {}),
  ...(spec.plannedSummary ? { plannedSummary: spec.plannedSummary } : {}),
  ...(spec.plannedOutline
    ? {
        plannedOutline: {
          objective: spec.plannedOutline.objective,
          actors: [...spec.plannedOutline.actors],
          journey: [...spec.plannedOutline.journey],
          requirements: [...spec.plannedOutline.requirements],
          acceptanceCriteria: [...spec.plannedOutline.acceptanceCriteria],
          nonScope: [...spec.plannedOutline.nonScope],
          technicalConstraints: [...spec.plannedOutline.technicalConstraints],
          mandatoryValidations: [...spec.plannedOutline.mandatoryValidations],
          pendingManualValidations: [...spec.plannedOutline.pendingManualValidations],
          knownRisks: [...spec.plannedOutline.knownRisks],
        },
      }
    : {}),
  ...(spec.sourceCommand ? { sourceCommand: spec.sourceCommand } : {}),
  ...(spec.assumptionsAndDefaults
    ? { assumptionsAndDefaults: [...spec.assumptionsAndDefaults] }
    : {}),
  ...(spec.decisionsAndTradeOffs
    ? { decisionsAndTradeOffs: [...spec.decisionsAndTradeOffs] }
    : {}),
  ...(spec.categoryCoverage
    ? { categoryCoverage: spec.categoryCoverage.map((item) => ({ ...item })) }
    : {}),
  ...(spec.criticalAmbiguities
    ? { criticalAmbiguities: [...spec.criticalAmbiguities] }
    : {}),
  ...(spec.commitMessage ? { commitMessage: spec.commitMessage } : {}),
  ...(spec.tracePaths
    ? {
        tracePaths: {
          requestPath: spec.tracePaths.requestPath,
          responsePath: spec.tracePaths.responsePath,
          decisionPath: spec.tracePaths.decisionPath,
        },
      }
    : {}),
  ...(spec.derivationRetrospectiveContext
    ? { derivationRetrospectiveContext: spec.derivationRetrospectiveContext }
    : {}),
  ...(spec.workflowRetrospectiveContext
    ? { workflowRetrospectiveContext: spec.workflowRetrospectiveContext }
    : {}),
});

const createSummaryCollector = (
  options: { failSend?: boolean; failSendWithDispatchError?: boolean } = {},
) => {
  const summaries: TicketFinalSummary[] = [];
  const deliveries: TicketNotificationDelivery[] = [];
  const onTicketFinalized = (summary: TicketFinalSummary): TicketNotificationDelivery => {
    summaries.push(summary);
    if (options.failSendWithDispatchError) {
      throw new TicketNotificationDispatchError(
        "falha definitiva simulada",
        {
          channel: "telegram",
          destinationChatId: "42",
          failedAtUtc: "2026-02-19T15:06:00.000Z",
          attempts: 4,
          maxAttempts: 4,
          errorMessage: "Service Unavailable",
          errorCode: "503",
          errorClass: "telegram-server",
          retryable: true,
        },
      );
    }
    if (options.failSend) {
      throw new Error("falha ao enviar resumo");
    }

    const delivery: TicketNotificationDelivery = {
      channel: "telegram",
      destinationChatId: "42",
      deliveredAtUtc: "2026-02-19T15:05:00.000Z",
      attempts: 1,
      maxAttempts: 4,
    };
    deliveries.push(delivery);
    return delivery;
  };

  return { summaries, deliveries, onTicketFinalized };
};

const createFlowSummaryCollector = () => {
  const flowSummaries: RunnerFlowSummary[] = [];
  const runFlowEventHandlers: RunFlowEventHandlers = {
    onFlowCompleted: async (event) => {
      flowSummaries.push(event);
    },
  };

  return { flowSummaries, runFlowEventHandlers };
};

const createWorkflowTraceCollector = () => {
  const records: Array<{ projectPath: string; request: WorkflowStageTraceRecordRequest }> = [];
  const workflowTraceStoreFactory = (projectPath: string): WorkflowTraceStore => ({
    recordStageTrace: async (request) => {
      records.push({
        projectPath,
        request: structuredClone(request),
      });
      const traceId = `trace-${records.length}`;
      return {
        traceId,
        requestPath: `.codex-flow-runner/flow-traces/requests/${traceId}-request.md`,
        responsePath: `.codex-flow-runner/flow-traces/responses/${traceId}-response.md`,
        decisionPath: `.codex-flow-runner/flow-traces/decisions/${traceId}-decision.json`,
      };
    },
  });

  return {
    records,
    workflowTraceStoreFactory,
  };
};

const createFlowCodexPreferencesSnapshot = (
  value: Partial<CodexFlowPreferencesSnapshot> = {},
): CodexFlowPreferencesSnapshot => ({
  model: "gpt-5.4",
  reasoningEffort: "xhigh",
  speed: "standard",
  ...value,
});

const createSpecTicketValidationPassResult = (
  value: Partial<SpecTicketValidationPassResult> = {},
): SpecTicketValidationPassResult => ({
  verdict: "GO",
  confidence: "high",
  summary: "Pacote derivado validado com sucesso.",
  gaps: [],
  appliedCorrections: [],
  ...value,
});

const createRoundDependencies = (
  value: Partial<RunnerRoundDependencies> & Pick<RunnerRoundDependencies, "queue" | "codexClient" | "gitVersioning">,
): RunnerRoundDependencies => ({
  activeProject: value.activeProject ?? activeProjectA,
  queue: value.queue,
  codexClient: value.codexClient,
  gitVersioning: value.gitVersioning,
});

const createRunner = (
  logger: SpyLogger,
  initialRoundDependencies: RunnerRoundDependencies,
  options: {
    envOverride?: Partial<AppEnv>;
    onTicketFinalized?: (
      summary: TicketFinalSummary,
    ) => Promise<TicketNotificationDelivery | null> | TicketNotificationDelivery | null;
    resolveRoundDependencies?: () => Promise<RunnerRoundDependencies>;
    runnerOptions?: TicketRunnerOptions;
  } = {},
): TicketRunner => {
  return new TicketRunner(
    {
      ...env,
      ...options.envOverride,
    },
    logger,
    initialRoundDependencies,
    options.resolveRoundDependencies ?? (async () => initialRoundDependencies),
    options.onTicketFinalized,
    options.runnerOptions,
  );
};

const callProcessTicket = async (runner: TicketRunner, value: TicketRef): Promise<boolean> => {
  const internalRunner = runner as unknown as {
    processTicket: (ticketRef: TicketRef) => Promise<boolean>;
  };

  return internalRunner.processTicket(value);
};

const waitForRunnerToStop = async (runner: TicketRunner, timeoutMs = 2000): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!runner.getState().isRunning) {
      return;
    }

    await sleep(5);
  }

  assert.fail("runner nao encerrou dentro do timeout esperado");
};

const waitForPlanSpecSessionToClose = async (
  runner: TicketRunner,
  timeoutMs = 2000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!runner.getState().planSpecSession) {
      return;
    }

    await sleep(5);
  }

  assert.fail("sessao /plan_spec nao encerrou dentro do timeout esperado");
};

const waitForDiscoverSpecSessionToClose = async (
  runner: TicketRunner,
  timeoutMs = 2000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!runner.getState().discoverSpecSession) {
      return;
    }

    await sleep(5);
  }

  assert.fail("sessao /discover_spec nao encerrou dentro do timeout esperado");
};

const waitForCodexChatSessionToClose = async (
  runner: TicketRunner,
  timeoutMs = 2000,
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!runner.getState().codexChatSession) {
      return;
    }

    await sleep(5);
  }

  assert.fail("sessao /codex_chat nao encerrou dentro do timeout esperado");
};

const createTempProjectRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "ticket-runner-plan-spec-"));

const cleanupTempProjectRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

const ensureWorkflowImprovementRepoStructure = async (projectRoot: string): Promise<void> => {
  await fs.mkdir(path.join(projectRoot, "tickets", "open"), { recursive: true });
  await fs.writeFile(path.join(projectRoot, ".git"), "gitdir: ./.git\n", "utf8");
};

const createWorkflowImprovementTicketPublisherHarness = (
  now: Date = new Date("2026-03-19T18:00:00.000Z"),
) => {
  const gitClients = new Map<string, StubGitVersioning>();
  const publisher = new FileSystemWorkflowImprovementTicketPublisher({
    now: () => new Date(now),
    createGitVersioning: (repoPath) => {
      const existing = gitClients.get(repoPath);
      if (existing) {
        return existing;
      }

      const client = new StubGitVersioning(false, {
        commitHash: "workflow123",
        upstream: "origin/main",
        commitPushId: "workflow123@origin/main",
      });
      gitClients.set(repoPath, client);
      return client;
    },
  });

  return {
    publisher,
    gitClients,
  };
};

const writeTicketMetadataFile = async (
  projectRoot: string,
  options: {
    directory: "open" | "closed";
    ticketName: string;
    status: "open" | "closed";
    parentTicketPath?: string;
    closureReason?: string;
    priority?: "P0" | "P1" | "P2";
    sourceSpec?: string;
  },
): Promise<string> => {
  const ticketPath = path.join(projectRoot, "tickets", options.directory, options.ticketName);
  const lines = [
    `# [TICKET] ${options.ticketName}`,
    "",
    "## Metadata",
    `- Status: ${options.status}`,
    `- Priority: ${options.priority ?? "P0"}`,
    `- Parent ticket (optional): ${options.parentTicketPath ?? ""}`,
    `- Closure reason: ${options.closureReason ?? ""}`,
    `- Source spec (when applicable): ${options.sourceSpec ?? ""}`,
    "",
  ];
  await fs.mkdir(path.dirname(ticketPath), { recursive: true });
  await fs.writeFile(ticketPath, `${lines.join("\n")}\n`, "utf8");
  return ticketPath;
};

const createSpecTicketValidationAutoCorrectHandler = (
  projectRoot: string,
  marker = "Cobertura derivada explicitada automaticamente.",
): ((
  request: SpecTicketValidationAutoCorrectRequest,
) => Promise<SpecTicketValidationAppliedCorrection[]>) => {
  return async (request) => {
    const targetRelativePath = request.allowedArtifactPaths[0];
    assert.ok(targetRelativePath, "autocorrecao de teste esperava ao menos um artefato permitido");

    const targetAbsolutePath = path.join(projectRoot, ...targetRelativePath.split("/"));
    const currentContent = await fs.readFile(targetAbsolutePath, "utf8");
    const nextContent = [
      currentContent.trimEnd(),
      `- Auto-correct marker: ${marker}`,
      "",
    ].join("\n");
    await fs.writeFile(targetAbsolutePath, nextContent, "utf8");

    const linkedGapTypes = request.latestPass.gaps
      .filter((gap) => gap.affectedArtifactPaths.includes(targetRelativePath))
      .map((gap) => gap.gapType);

    return [
      {
        description: "Materializar ajuste seguro no ticket derivado apontado pelo gate.",
        affectedArtifactPaths: [targetRelativePath],
        linkedGapTypes: linkedGapTypes.length > 0 ? linkedGapTypes : ["coverage-gap"],
        outcome: "applied",
      },
    ];
  };
};

const buildTicketRef = (projectRoot: string, ticketName: string): TicketRef => ({
  name: ticketName,
  openPath: path.join(projectRoot, "tickets", "open", ticketName),
  closedPath: path.join(projectRoot, "tickets", "closed", ticketName),
});

const createSpecFileContent = (
  title: string,
  summary: string,
  outline = createPlanSpecOutline(),
  options: {
    assumptionsAndDefaults?: string[];
    decisionsAndTradeOffs?: string[];
    relatedTickets?: string[];
    includeTicketValidationSection?: boolean;
  } = {},
): string =>
  [
    `# [SPEC] ${title}`,
    "",
    "## Metadata",
    "- Spec ID: 2026-02-19-bridge-interativa-do-codex",
    "- Status: approved",
    "- Spec treatment: pending",
    "- Owner: mapita",
    "- Created at (UTC): 2026-02-19 22:04Z",
    "- Last reviewed at (UTC): 2026-02-19 22:04Z",
    "- Source: product-need",
    "- Related tickets:",
    ...(
      options.relatedTickets && options.relatedTickets.length > 0
        ? options.relatedTickets
        : ["tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md"]
    ).map((item) => `  - ${item}`),
    "",
    "## Objetivo e contexto",
    `- Problema que esta spec resolve: ${summary}`,
    `- Resultado esperado: ${outline.objective}`,
    `- Contexto funcional: ${outline.actors.join("; ")}`,
    `- Restricoes tecnicas relevantes: ${outline.technicalConstraints.join("; ")}`,
    "",
    "## Jornada de uso",
    ...outline.journey.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Requisitos funcionais",
    ...outline.requirements.map((item) => `- ${item}`),
    "",
    "## Assumptions and defaults",
    ...(options.assumptionsAndDefaults && options.assumptionsAndDefaults.length > 0
      ? options.assumptionsAndDefaults.map((item) => `- ${item}`)
      : ["- Nenhum"]),
    "",
    "## Nao-escopo",
    ...outline.nonScope.map((item) => `- ${item}`),
    "",
    "## Criterios de aceitacao (observaveis)",
    ...outline.acceptanceCriteria.map((item) => `- [ ] ${item}`),
    "",
    "## Validacoes pendentes ou manuais",
    "- Validacoes obrigatorias ainda nao automatizadas:",
    ...outline.mandatoryValidations.map((item) => `  - ${item}`),
    "- Validacoes manuais pendentes:",
    ...outline.pendingManualValidations.map((item) => `  - ${item}`),
    "",
    "## Riscos e impacto",
    `- Risco funcional: ${outline.knownRisks.join("; ")}`,
    "",
    "## Decisoes e trade-offs",
    ...(options.decisionsAndTradeOffs && options.decisionsAndTradeOffs.length > 0
      ? options.decisionsAndTradeOffs.map((item) => `- ${item}`)
      : ["- Nenhum"]),
    "",
    ...(options.includeTicketValidationSection
      ? [
          "## Gate de validacao dos tickets derivados",
          "- Objetivo do gate: validar o pacote derivado antes do /run-all.",
          "",
        ]
      : []),
  ].join("\n");

const setupRunSpecsFixture = async (
  ticketNames: string[] = [ticketA.name, ticketB.name],
  options: {
    projectRoot?: string;
    activeProjectName?: string;
  } = {},
): Promise<{
  projectRoot: string;
  activeProject: ProjectRef;
  tickets: TicketRef[];
}> => {
  const projectRoot = options.projectRoot ?? (await createTempProjectRoot());
  const activeProject: ProjectRef = {
    name: options.activeProjectName ?? activeProjectA.name,
    path: projectRoot,
  };
  const tickets = ticketNames.map((ticketName) => buildTicketRef(projectRoot, ticketName));
  const relatedTickets = ticketNames.map((ticketName) => `tickets/open/${ticketName}`);
  const specPath = path.join(projectRoot, "docs", "specs", specFileName);
  await fs.mkdir(path.dirname(specPath), { recursive: true });
  await fs.writeFile(
    specPath,
    createSpecFileContent(
      "Spec de teste para /run_specs",
      "Validar encadeamento da triagem com gate antes do /run-all.",
      createPlanSpecOutline(),
      {
        relatedTickets,
        includeTicketValidationSection: true,
      },
    ),
    "utf8",
  );

  for (const ticketName of ticketNames) {
    await writeTicketMetadataFile(projectRoot, {
      directory: "open",
      ticketName,
      status: "open",
      sourceSpec: `docs/specs/${specFileName}`,
    });
  }

  return {
    projectRoot,
    activeProject,
    tickets,
  };
};

const createDeferred = <T>() => {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null;
  let reject: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve: (value: T | PromiseLike<T>) => {
      resolve?.(value);
    },
    reject: (reason?: unknown) => {
      reject?.(reason);
    },
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("runner executa etapas em ordem para um ticket e valida sincronismo git", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { summaries, deliveries, onTicketFinalized } = createSummaryCollector();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, true);
  assert.deepEqual(
    codex.calls.map((value) => value.stage),
    ["plan", "implement", "close-and-version"],
  );
  assert.deepEqual(gitVersioning.commitClosures, [
    {
      ticketName: ticketA.name,
      execPlanPath: "execplans/2026-02-19-flow-a.md",
    },
  ]);
  assert.equal(gitVersioning.syncChecks, 1);

  const state = runner.getState();
  assert.equal(state.currentTicket, null);
  assert.equal(state.phase, "idle");
  assert.equal(state.activeProject?.name, activeProjectA.name);
  assert.equal(state.activeProject?.path, activeProjectA.path);
  assert.equal(logger.errors.length, 0);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "success");
  assert.equal(summaries[0]?.finalStage, "close-and-version");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  assert.match(summaries[0]?.timestampUtc ?? "", /^\d{4}-\d{2}-\d{2}T/u);
  assert.equal(summaries[0]?.timing.interruptedStage, null);
  assert.deepEqual(summaries[0]?.timing.completedStages, ["plan", "implement", "close-and-version"]);
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs.plan, "number");
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs.implement, "number");
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs["close-and-version"], "number");
  assert.ok((summaries[0]?.timing.totalDurationMs ?? -1) >= 0);
  if (summaries[0]?.status === "success") {
    assert.equal(summaries[0].execPlanPath, "execplans/2026-02-19-flow-a.md");
    assert.equal(summaries[0].commitPushId, "abc123@origin/main");
    assert.equal(summaries[0].commitHash, "abc123");
    assert.equal(summaries[0].pushUpstream, "origin/main");
  } else {
    assert.fail("resumo deveria ser sucesso");
  }
  assert.equal(deliveries.length, 1);
  assert.equal(state.lastNotifiedEvent?.summary.ticket, ticketA.name);
  assert.equal(state.lastNotifiedEvent?.summary.status, "success");
  assert.equal(state.lastNotifiedEvent?.summary.activeProjectName, activeProjectA.name);
  assert.equal(state.lastNotifiedEvent?.summary.activeProjectPath, activeProjectA.path);
  assert.equal(state.lastNotifiedEvent?.delivery.destinationChatId, "42");
});

test("runner para no stage com falha e registra contexto", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient((stage) => stage === "implement");
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, false);
  assert.deepEqual(
    codex.calls.map((value) => value.stage),
    ["plan", "implement"],
  );
  assert.equal(gitVersioning.commitClosures.length, 0);
  assert.equal(gitVersioning.syncChecks, 0);

  const state = runner.getState();
  assert.equal(state.currentTicket, null);
  assert.equal(state.phase, "error");

  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0]?.message, "Erro no ciclo de ticket");
  assert.equal(logger.errors[0]?.context?.ticket, ticketA.name);
  assert.equal(logger.errors[0]?.context?.stage, "implement");
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "failure");
  assert.equal(summaries[0]?.finalStage, "implement");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  assert.equal(summaries[0]?.timing.interruptedStage, "implement");
  assert.deepEqual(summaries[0]?.timing.completedStages, ["plan"]);
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs.plan, "number");
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs.implement, "number");
  assert.equal(summaries[0]?.timing.durationsByStageMs["close-and-version"], undefined);
  assert.ok((summaries[0]?.timing.totalDurationMs ?? -1) >= 0);
  if (summaries[0]?.status === "failure") {
    assert.match(summaries[0].errorMessage, /falha simulada/u);
  } else {
    assert.fail("resumo deveria ser falha");
  }
  assert.equal(state.lastNotifiedEvent?.summary.status, "failure");
});

test("runner marca erro de close-and-version quando validacao de push falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning(true);
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, false);
  assert.deepEqual(
    codex.calls.map((value) => value.stage),
    ["plan", "implement", "close-and-version"],
  );
  assert.equal(gitVersioning.syncChecks, 1);
  assert.equal(
    logger.errors.find((entry) => entry.message === "Erro no ciclo de ticket")?.context?.stage,
    "close-and-version",
  );
  assert.equal(
    logger.errors.find((entry) => entry.message === "Validacao git falhou apos close-and-version")
      ?.context?.codexAssistantResponsePreview,
    "ok:close-and-version",
  );
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.status, "failure");
  assert.equal(summaries[0]?.finalStage, "close-and-version");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  assert.equal(summaries[0]?.timing.interruptedStage, "close-and-version");
  assert.deepEqual(summaries[0]?.timing.completedStages, ["plan", "implement", "close-and-version"]);
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs.plan, "number");
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs.implement, "number");
  assert.equal(typeof summaries[0]?.timing.durationsByStageMs["close-and-version"], "number");
  assert.ok((summaries[0]?.timing.totalDurationMs ?? -1) >= 0);
  if (summaries[0]?.status === "failure") {
    assert.match(summaries[0].errorMessage, /push obrigatorio nao concluido/u);
    assert.equal(summaries[0].codexStdoutPreview, "ok:close-and-version");
  } else {
    assert.fail("resumo deveria ser falha");
  }
});

test("runner marca erro de close-and-version quando versionamento git controlado falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning(
    false,
    {
      commitHash: "abc123",
      upstream: "origin/main",
      commitPushId: "abc123@origin/main",
    },
    true,
    "git push falhou: autenticacao ausente",
  );
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, false);
  assert.deepEqual(gitVersioning.commitClosures, [
    {
      ticketName: ticketA.name,
      execPlanPath: "execplans/2026-02-19-flow-a.md",
    },
  ]);
  assert.equal(gitVersioning.syncChecks, 0);
  assert.equal(
    logger.errors.find((entry) => entry.message === "Versionamento git falhou apos close-and-version")
      ?.context?.error,
    "git push falhou: autenticacao ausente",
  );
  assert.equal(summaries[0]?.status, "failure");
  assert.equal(summaries[0]?.finalStage, "close-and-version");
  if (summaries[0]?.status === "failure") {
    assert.match(summaries[0].errorMessage, /autenticacao ausente/u);
  } else {
    assert.fail("resumo deveria ser falha");
  }
});

test("runner diagnostica helper de credencial ausente no snap quando stderr do Codex indica /usr/bin/gh inexistente", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(
    undefined,
    true,
    false,
    0,
    undefined,
    false,
    undefined,
    false,
    {
      "close-and-version": {
        stdoutPreview: "ok:close-and-version",
        stderrPreview:
          "/usr/bin/gh auth git-credential get: 1: /usr/bin/gh: not found\nfatal: could not read Username for 'https://github.com': No such device or address",
      },
    },
  );
  const gitVersioning = new StubGitVersioning(true);
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies);

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, false);
  const logEntry = logger.errors.find(
    (entry) => entry.message === "Validacao git falhou apos close-and-version",
  );
  assert.equal(logEntry?.context?.diagnosedCause, "snap-git-credential-helper-missing");
  assert.match(String(logEntry?.context?.diagnosedCauseDetail ?? ""), /HOST_GIT\/HOST_GH/u);
});

test("requestRunAll encerra rodada quando fila fica vazia", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      return nextTicketCalls === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });
  const request = await runner.requestRunAll();
  assert.deepEqual(request, { status: "started" });

  await waitForRunnerToStop(runner);

  assert.deepEqual(
    codex.calls.map((value) => `${value.ticketName}:${value.stage}`),
    [
      `${ticketA.name}:plan`,
      `${ticketA.name}:implement`,
      `${ticketA.name}:close-and-version`,
    ],
  );
  assert.equal(nextTicketCalls, 2);
  assert.equal(gitVersioning.syncChecks, 1);

  const state = runner.getState();
  assert.equal(state.isRunning, false);
  assert.equal(state.phase, "idle");
  assert.equal(state.activeProject?.name, activeProjectA.name);
  assert.equal(state.lastMessage, "Rodada /run-all finalizada: nenhum ticket aberto restante");
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "success");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
});

test("shutdown gracioso aguarda resumo final em voo antes de concluir", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const summaries: TicketFinalSummary[] = [];
  const summaryStarted = createDeferred<void>();
  const summaryRelease = createDeferred<void>();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      return nextTicketCalls === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, {
    onTicketFinalized: async (summary) => {
      summaries.push(summary);
      summaryStarted.resolve(undefined);
      await summaryRelease.promise;
      return {
        channel: "telegram",
        destinationChatId: "42",
        deliveredAtUtc: "2026-02-19T15:05:00.000Z",
        attempts: 1,
        maxAttempts: 4,
      };
    },
  });

  const runAllResult = await runner.requestRunAll();
  assert.deepEqual(runAllResult, { status: "started" });
  await summaryStarted.promise;

  const shutdownPromise = runner.shutdown({ timeoutMs: 500 });
  const secondShutdownPromise = runner.shutdown({ timeoutMs: 500 });
  assert.strictEqual(secondShutdownPromise, shutdownPromise);

  const pendingBeforeRelease = await Promise.race([
    shutdownPromise.then(() => "resolved"),
    sleep(25).then(() => "pending"),
  ]);
  assert.equal(pendingBeforeRelease, "pending");

  summaryRelease.resolve(undefined);
  const report = await shutdownPromise;

  assert.equal(report.timedOut, false);
  assert.equal(report.pendingTasks.length, 0);
  assert.equal(
    report.drainedTasks.some((task) => task.includes("run-slot:run-all:alpha-project")),
    true,
  );
  assert.equal(summaries.length, 1);
  await waitForRunnerToStop(runner);
  assert.equal(runner.getState().isRunning, false);

  const repeatedReport = await runner.shutdown();
  assert.deepEqual(repeatedReport, report);
});

test("shutdown gracioso respeita timeout de drain e reporta pendencias", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const summaryStarted = createDeferred<void>();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      return nextTicketCalls === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };

  const blockedDeliveryPromise = new Promise<TicketNotificationDelivery>(() => undefined);
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, {
    onTicketFinalized: async () => {
      summaryStarted.resolve(undefined);
      return blockedDeliveryPromise;
    },
  });

  const runAllResult = await runner.requestRunAll();
  assert.deepEqual(runAllResult, { status: "started" });
  await summaryStarted.promise;

  const report = await runner.shutdown({ timeoutMs: 20 });

  assert.equal(report.timedOut, true);
  assert.equal(report.timeoutMs, 20);
  assert.equal(report.pendingTasks.length > 0, true);
  assert.equal(
    report.pendingTasks.some((task) => task.includes("run-slot:run-all:alpha-project")),
    true,
  );
  assert.equal(report.durationMs >= 20, true);
  assert.equal(
    logger.warnings.some(
      (entry) => entry.message === "Shutdown gracioso expirou antes de drenar todas as operacoes",
    ),
    true,
  );
});

test("requestRunSelectedTicket executa somente o ticket selecionado sem varrer backlog", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const rootPath = await createTempProjectRoot();

  try {
    const ticketName = "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md";
    await writeTicketMetadataFile(rootPath, {
      directory: "open",
      ticketName,
      status: "open",
    });

    let ensureStructureCalls = 0;
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => {
        ensureStructureCalls += 1;
      },
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return ticketA;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: { name: "manual-ticket-project", path: rootPath },
      queue,
      codexClient: codex,
      gitVersioning,
    });
    const runner = createRunner(logger, roundDependencies);
    const request = await runner.requestRunSelectedTicket(ticketName);
    assert.deepEqual(request, { status: "started" });

    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.ticketName}:${value.stage}`),
      [`${ticketName}:plan`, `${ticketName}:implement`, `${ticketName}:close-and-version`],
    );
    assert.equal(ensureStructureCalls, 0);
    assert.equal(nextTicketCalls, 0);
    assert.equal(gitVersioning.syncChecks, 1);

    const state = runner.getState();
    assert.equal(state.phase, "idle");
    assert.equal(state.isRunning, false);
    assert.equal(state.currentTicket, null);
  } finally {
    await cleanupTempProjectRoot(rootPath);
  }
});

test("requestRunSelectedTicket bloqueia input invalido sem reservar slot", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  let resolveCalls = 0;
  const runner = createRunner(logger, roundDependencies, {
    resolveRoundDependencies: async () => {
      resolveCalls += 1;
      return roundDependencies;
    },
  });

  const result = await runner.requestRunSelectedTicket("../fora-do-escopo.md");

  assert.equal(result.status, "ticket-invalido");
  if (result.status === "ticket-invalido") {
    assert.match(result.message, /Formato invalido para ticket selecionado/u);
  }
  assert.equal(resolveCalls, 0);
  assert.equal(codex.authChecks, 0);
  assert.equal(runner.getState().isRunning, false);
  assert.equal(runner.getState().capacity.used, 0);
});

test("requestRunSelectedTicket retorna erro funcional quando ticket nao existe mais", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const rootPath = await createTempProjectRoot();

  try {
    const missingTicketName =
      "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md";
    const roundDependencies = createRoundDependencies({
      activeProject: { name: "manual-ticket-project", path: rootPath },
      queue: defaultQueue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies);

    const request = await runner.requestRunSelectedTicket(missingTicketName);

    assert.equal(request.status, "ticket-nao-encontrado");
    if (request.status === "ticket-nao-encontrado") {
      assert.match(request.message, /Ticket selecionado nao encontrado em tickets\/open\//u);
    }
    assert.equal(codex.authChecks, 1);
    assert.equal(codex.calls.length, 0);
    assert.equal(runner.getState().isRunning, false);
    assert.equal(runner.getState().capacity.used, 0);
  } finally {
    await cleanupTempProjectRoot(rootPath);
  }
});

test("requestRunSelectedTicket nao aplica lock global quando /run_all esta ativo em outro projeto", async () => {
  const logger = new SpyLogger();
  const codexA = new StubCodexClient();
  const codexB = new StubCodexClient();

  let releaseWait: () => void = () => undefined;
  const waitForRelease = new Promise<TicketRef | null>((resolve) => {
    releaseWait = () => resolve(null);
  });
  let nextTicketCalls = 0;
  const queueA: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      if (nextTicketCalls === 1) {
        return ticketA;
      }
      return waitForRelease;
    },
    closeTicket: async () => undefined,
  };

  const roundDependenciesA = createRoundDependencies({
    activeProject: activeProjectA,
    queue: queueA,
    codexClient: codexA,
    gitVersioning: new StubGitVersioning(),
  });
  const roundDependenciesB = createRoundDependencies({
    activeProject: activeProjectB,
    queue: defaultQueue,
    codexClient: codexB,
    gitVersioning: new StubGitVersioning(),
  });

  let currentProject: "alpha" | "beta" = "alpha";
  const runner = createRunner(logger, roundDependenciesA, {
    resolveRoundDependencies: async () =>
      currentProject === "alpha" ? roundDependenciesA : roundDependenciesB,
  });

  const runAllResult = await runner.requestRunAll();
  assert.deepEqual(runAllResult, { status: "started" });

  currentProject = "beta";
  const runTicketResult = await runner.requestRunSelectedTicket(
    "2026-02-23-acao-implementar-ticket-selecionado-com-execucao-unitaria.md",
  );
  assert.equal(runTicketResult.status, "ticket-nao-encontrado");
  if (runTicketResult.status === "ticket-nao-encontrado") {
    assert.match(runTicketResult.message, /Ticket selecionado nao encontrado em tickets\/open\//u);
  }

  assert.equal(codexA.authChecks, 1);
  assert.equal(codexB.authChecks, 1);

  releaseWait();
  await waitForRunnerToStop(runner);
});

test("requestRunAll encerra rodada ao atingir limite maximo de tickets", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      if (nextTicketCalls === 1) {
        return ticketA;
      }

      if (nextTicketCalls === 2) {
        return ticketB;
      }

      return null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, {
    onTicketFinalized,
    envOverride: {
      RUN_ALL_MAX_TICKETS_PER_ROUND: 1,
    },
  });
  const request = await runner.requestRunAll();
  assert.deepEqual(request, { status: "started" });

  await waitForRunnerToStop(runner);

  assert.deepEqual(
    codex.calls.map((value) => `${value.ticketName}:${value.stage}`),
    [
      `${ticketA.name}:plan`,
      `${ticketA.name}:implement`,
      `${ticketA.name}:close-and-version`,
    ],
  );
  assert.equal(nextTicketCalls, 1);
  assert.equal(gitVersioning.syncChecks, 1);

  const state = runner.getState();
  assert.equal(state.isRunning, false);
  assert.equal(state.phase, "idle");
  assert.match(state.lastMessage, /limite de 1 tickets atingido/u);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "success");
});

test("requestRunAll permite processar ticket com ate 3 recuperacoes de NO_GO na linhagem", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const rootPath = await createTempProjectRoot();

  try {
    const rootTicketName = "2026-02-23-no-go-root.md";
    const recoveryOneName = "2026-02-23-no-go-recovery-1.md";
    const recoveryTwoName = "2026-02-23-no-go-recovery-2.md";
    const currentTicketName = "2026-02-23-no-go-recovery-3.md";

    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: rootTicketName,
      status: "closed",
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: recoveryOneName,
      status: "closed",
      parentTicketPath: `tickets/closed/${rootTicketName}`,
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: recoveryTwoName,
      status: "closed",
      parentTicketPath: `tickets/closed/${recoveryOneName}`,
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "open",
      ticketName: currentTicketName,
      status: "open",
      parentTicketPath: `tickets/closed/${recoveryTwoName}`,
    });

    const currentTicket = buildTicketRef(rootPath, currentTicketName);
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? currentTicket : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: { name: "lineage-project", path: rootPath },
      queue,
      codexClient: codex,
      gitVersioning,
    });
    const runner = createRunner(logger, roundDependencies);
    const request = await runner.requestRunAll();
    assert.deepEqual(request, { status: "started" });

    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.ticketName}:${value.stage}`),
      [
        `${currentTicketName}:plan`,
        `${currentTicketName}:implement`,
        `${currentTicketName}:close-and-version`,
      ],
    );
    assert.equal(gitVersioning.syncChecks, 1);
    const state = runner.getState();
    assert.equal(state.phase, "idle");
    assert.match(state.lastMessage, /nenhum ticket aberto restante/u);
  } finally {
    await cleanupTempProjectRoot(rootPath);
  }
});

test("requestRunAll interrompe rodada quando ticket excede limite de 3 recuperacoes de NO_GO", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const rootPath = await createTempProjectRoot();

  try {
    const rootTicketName = "2026-02-23-no-go-root.md";
    const recoveryOneName = "2026-02-23-no-go-recovery-1.md";
    const recoveryTwoName = "2026-02-23-no-go-recovery-2.md";
    const recoveryThreeName = "2026-02-23-no-go-recovery-3.md";
    const currentTicketName = "2026-02-23-no-go-recovery-4.md";

    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: rootTicketName,
      status: "closed",
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: recoveryOneName,
      status: "closed",
      parentTicketPath: `tickets/closed/${rootTicketName}`,
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: recoveryTwoName,
      status: "closed",
      parentTicketPath: `tickets/closed/${recoveryOneName}`,
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "closed",
      ticketName: recoveryThreeName,
      status: "closed",
      parentTicketPath: `tickets/closed/${recoveryTwoName}`,
      closureReason: "split-follow-up",
    });
    await writeTicketMetadataFile(rootPath, {
      directory: "open",
      ticketName: currentTicketName,
      status: "open",
      parentTicketPath: `tickets/closed/${recoveryThreeName}`,
    });

    const currentTicket = buildTicketRef(rootPath, currentTicketName);
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => currentTicket,
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: { name: "lineage-project", path: rootPath },
      queue,
      codexClient: codex,
      gitVersioning,
    });
    const runner = createRunner(logger, roundDependencies);
    const request = await runner.requestRunAll();
    assert.deepEqual(request, { status: "started" });

    await waitForRunnerToStop(runner);

    assert.equal(codex.calls.length, 0);
    assert.equal(gitVersioning.syncChecks, 0);
    const state = runner.getState();
    assert.equal(state.phase, "error");
    assert.match(state.lastMessage, /tarefa nao finalizada/u);
    assert.match(state.lastMessage, /limite: 3/u);
    assert.equal(
      logger.errors.some((entry) => entry.message === "Limite de recuperacoes de NO_GO excedido para ticket"),
      true,
    );
  } finally {
    await cleanupTempProjectRoot(rootPath);
  }
});

test("syncActiveProject atualiza estado quando runner esta inativo", () => {
  const logger = new SpyLogger();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: new StubCodexClient(),
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const outcome = runner.syncActiveProject(activeProjectB);

  assert.deepEqual(outcome, { status: "updated" });
  const state = runner.getState();
  assert.equal(state.activeProject?.name, activeProjectB.name);
  assert.equal(state.activeProject?.path, activeProjectB.path);
  assert.match(state.lastMessage, /Projeto ativo atualizado para beta-project/u);
});

test("syncActiveProject permite troca enquanto runner inicia rodada em outro projeto", async () => {
  const logger = new SpyLogger();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: new StubCodexClient(undefined, true, false, 30),
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const runAllPromise = runner.requestRunAll();
  const runAllOutcome = await runAllPromise;
  const syncOutcome = runner.syncActiveProject(activeProjectB);
  await waitForRunnerToStop(runner);

  assert.deepEqual(syncOutcome, { status: "updated" });
  assert.deepEqual(runAllOutcome, { status: "started" });
  const state = runner.getState();
  assert.equal(state.activeProject?.name, activeProjectB.name);
  assert.equal(state.activeProject?.path, activeProjectB.path);
});

test("requestPause e requestResume controlam o slot de ticket do projeto ativo", async () => {
  const logger = new SpyLogger();

  let releaseWait: () => void = () => undefined;
  const waitForRelease = new Promise<TicketRef | null>((resolve) => {
    releaseWait = () => resolve(null);
  });
  let nextTicketCalls = 0;
  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      if (nextTicketCalls === 1) {
        return ticketA;
      }
      return waitForRelease;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: new StubCodexClient(),
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const runAllResult = await runner.requestRunAll();
  assert.deepEqual(runAllResult, { status: "started" });

  const pauseResult = runner.requestPause();
  assert.deepEqual(pauseResult, {
    status: "applied",
    action: "pause",
    project: activeProjectA,
    isPaused: true,
  });

  const pausedState = runner.getState();
  const pausedSlot = pausedState.activeSlots.find((slot) => slot.project.name === activeProjectA.name);
  assert.equal(pausedSlot?.isPaused, true);

  const resumeResult = runner.requestResume();
  assert.deepEqual(resumeResult, {
    status: "applied",
    action: "resume",
    project: activeProjectA,
    isPaused: false,
  });

  const resumedState = runner.getState();
  const resumedSlot = resumedState.activeSlots.find((slot) => slot.project.name === activeProjectA.name);
  assert.equal(resumedSlot?.isPaused, false);

  releaseWait();
  await waitForRunnerToStop(runner);
});

test("requestPause e requestResume retornam ignored quando projeto ativo nao tem slot", () => {
  const logger = new SpyLogger();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: new StubCodexClient(),
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  const idleProject: ProjectRef = {
    name: "idle-project",
    path: "/tmp/projects/idle-project",
  };
  assert.deepEqual(runner.syncActiveProject(idleProject), { status: "updated" });

  const pauseResult = runner.requestPause();
  const resumeResult = runner.requestResume();

  assert.deepEqual(pauseResult, {
    status: "ignored",
    action: "pause",
    reason: "project-slot-inactive",
    project: idleProject,
  });
  assert.deepEqual(resumeResult, {
    status: "ignored",
    action: "resume",
    reason: "project-slot-inactive",
    project: idleProject,
  });
});

test("requestRunAll resolve projeto ativo por rodada e evita mistura entre projetos", async () => {
  const logger = new SpyLogger();
  const codexA = new StubCodexClient();
  const gitVersioningA = new StubGitVersioning();
  let queueANextCalls = 0;
  const queueA: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      queueANextCalls += 1;
      return queueANextCalls === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };

  const codexB = new StubCodexClient();
  const gitVersioningB = new StubGitVersioning();
  let queueBNextCalls = 0;
  const queueB: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      queueBNextCalls += 1;
      return queueBNextCalls === 1 ? ticketB : null;
    },
    closeTicket: async () => undefined,
  };

  const roundA = createRoundDependencies({
    activeProject: activeProjectA,
    queue: queueA,
    codexClient: codexA,
    gitVersioning: gitVersioningA,
  });
  const roundB = createRoundDependencies({
    activeProject: activeProjectB,
    queue: queueB,
    codexClient: codexB,
    gitVersioning: gitVersioningB,
  });

  const { summaries, onTicketFinalized } = createSummaryCollector();
  const resolvedRounds = [roundA, roundB];
  let resolveCalls = 0;
  const resolveRoundDependencies = async (): Promise<RunnerRoundDependencies> => {
    const resolved = resolvedRounds[Math.min(resolveCalls, resolvedRounds.length - 1)];
    resolveCalls += 1;
    return resolved!;
  };

  const runner = createRunner(logger, roundA, {
    onTicketFinalized,
    resolveRoundDependencies,
  });

  assert.deepEqual(await runner.requestRunAll(), { status: "started" });
  await waitForRunnerToStop(runner);

  assert.deepEqual(await runner.requestRunAll(), { status: "started" });
  await waitForRunnerToStop(runner);

  assert.equal(resolveCalls, 2);
  assert.equal(codexA.authChecks, 1);
  assert.equal(codexB.authChecks, 1);

  assert.deepEqual(
    codexA.calls.map((value) => `${value.ticketName}:${value.stage}`),
    [
      `${ticketA.name}:plan`,
      `${ticketA.name}:implement`,
      `${ticketA.name}:close-and-version`,
    ],
  );
  assert.deepEqual(
    codexB.calls.map((value) => `${value.ticketName}:${value.stage}`),
    [
      `${ticketB.name}:plan`,
      `${ticketB.name}:implement`,
      `${ticketB.name}:close-and-version`,
    ],
  );

  assert.equal(summaries.length, 2);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  assert.equal(summaries[1]?.ticket, ticketB.name);
  assert.equal(summaries[1]?.activeProjectName, activeProjectB.name);
  assert.equal(summaries[1]?.activeProjectPath, activeProjectB.path);

  const state = runner.getState();
  assert.equal(state.activeProject?.name, activeProjectB.name);
  assert.equal(state.activeProject?.path, activeProjectB.path);
});

test("requestRunAll emite resumo final para cada ticket concluido na rodada", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      if (nextTicketCalls === 1) {
        return ticketA;
      }

      if (nextTicketCalls === 2) {
        return ticketB;
      }

      return null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });
  const request = await runner.requestRunAll();
  assert.deepEqual(request, { status: "started" });

  await waitForRunnerToStop(runner);

  assert.equal(summaries.length, 2);
  assert.deepEqual(
    summaries.map((value) => ({
      ticket: value.ticket,
      status: value.status,
      activeProjectName: value.activeProjectName,
    })),
    [
      { ticket: ticketA.name, status: "success", activeProjectName: activeProjectA.name },
      { ticket: ticketB.name, status: "success", activeProjectName: activeProjectA.name },
    ],
  );
  assert.equal(summaries[0]?.finalStage, "close-and-version");
  assert.equal(summaries[1]?.finalStage, "close-and-version");
});

test("requestRunAll emite resumo final de fluxo com snapshot temporal em sucesso", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      return nextTicketCalls === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      runFlowEventHandlers,
    },
  });
  const request = await runner.requestRunAll();
  assert.deepEqual(request, { status: "started" });
  await waitForRunnerToStop(runner);

  const runAllSummary = flowSummaries.find((event) => event.flow === "run-all");
  assert.ok(runAllSummary);
  if (runAllSummary?.flow === "run-all") {
    assert.equal(runAllSummary.outcome, "success");
    assert.equal(runAllSummary.completionReason, "queue-empty");
    assert.equal(runAllSummary.finalStage, "select-ticket");
    assert.equal(runAllSummary.processedTicketsCount, 1);
    assert.equal(runAllSummary.maxTicketsPerRound, env.RUN_ALL_MAX_TICKETS_PER_ROUND);
    assert.deepEqual(runAllSummary.codexPreferences, createFlowCodexPreferencesSnapshot());
    assert.equal(runAllSummary.timing.interruptedStage, null);
    assert.equal(typeof runAllSummary.timing.durationsByStageMs["select-ticket"], "number");
    assert.equal(typeof runAllSummary.timing.durationsByStageMs.plan, "number");
    assert.equal(typeof runAllSummary.timing.durationsByStageMs.implement, "number");
    assert.equal(typeof runAllSummary.timing.durationsByStageMs["close-and-version"], "number");
    assert.ok(runAllSummary.timing.totalDurationMs >= 0);
  } else {
    assert.fail("resumo de fluxo /run-all deveria existir");
  }
});

test("requestRunAll e fail-fast: erro no ticket N impede execucao de N+1", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(
    (stage, ticket) => ticket.name === ticketA.name && stage === "implement",
  );
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
  let nextTicketCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      if (nextTicketCalls === 1) {
        return ticketA;
      }

      if (nextTicketCalls === 2) {
        return ticketB;
      }

      return null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, {
    onTicketFinalized,
    runnerOptions: {
      runFlowEventHandlers,
    },
  });
  const request = await runner.requestRunAll();
  assert.deepEqual(request, { status: "started" });

  await waitForRunnerToStop(runner);

  assert.deepEqual(
    codex.calls.map((value) => `${value.ticketName}:${value.stage}`),
    [`${ticketA.name}:plan`, `${ticketA.name}:implement`],
  );
  assert.equal(nextTicketCalls, 1);
  assert.equal(gitVersioning.syncChecks, 0);

  const state = runner.getState();
  assert.equal(state.isRunning, false);
  assert.equal(state.phase, "error");
  assert.equal(state.currentTicket, null);

  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0]?.message, "Erro no ciclo de ticket");
  assert.equal(logger.errors[0]?.context?.ticket, ticketA.name);
  assert.equal(logger.errors[0]?.context?.stage, "implement");
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "failure");
  assert.equal(summaries[0]?.finalStage, "implement");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  const runAllSummary = flowSummaries.find((event) => event.flow === "run-all");
  assert.ok(runAllSummary);
  if (runAllSummary?.flow === "run-all") {
    assert.equal(runAllSummary.outcome, "failure");
    assert.equal(runAllSummary.completionReason, "ticket-failure");
    assert.equal(runAllSummary.finalStage, "implement");
    assert.equal(runAllSummary.processedTicketsCount, 1);
    assert.equal(runAllSummary.ticket, ticketA.name);
    assert.deepEqual(runAllSummary.codexPreferences, createFlowCodexPreferencesSnapshot());
    assert.equal(runAllSummary.timing.interruptedStage, "implement");
    assert.equal(typeof runAllSummary.timing.durationsByStageMs["select-ticket"], "number");
    assert.equal(typeof runAllSummary.timing.durationsByStageMs.plan, "number");
    assert.equal(typeof runAllSummary.timing.durationsByStageMs.implement, "number");
    assert.equal(runAllSummary.timing.durationsByStageMs["close-and-version"], undefined);
    assert.ok(runAllSummary.timing.totalDurationMs >= 0);
  } else {
    assert.fail("resumo de fluxo /run-all deveria existir");
  }
});

test("requestRunAll bloqueia rodada quando resolucao do projeto ativo falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });

  const runner = createRunner(logger, roundDependencies, {
    resolveRoundDependencies: async () => {
      throw new Error("nenhum projeto elegivel");
    },
  });

  const request = await runner.requestRunAll();

  assert.equal(request.status, "blocked");
  assert.equal(request.reason, "active-project-unavailable");
  assert.match(request.message, /nenhum projeto elegivel/u);
  assert.equal(codex.authChecks, 0);
  assert.equal(codex.calls.length, 0);
  assert.equal(runner.getState().isRunning, false);
  assert.equal(runner.getState().phase, "error");
  assert.match(runner.getState().lastMessage, /Falha ao resolver projeto ativo/u);
  assert.equal(logger.errors[0]?.message, "Falha ao resolver projeto ativo antes da rodada");
});

test("requestRunAll bloqueia rodada quando Codex CLI nao esta autenticado", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(undefined, true, true);
  let ensureStructureCalls = 0;

  const queue: TicketQueue = {
    ensureStructure: async () => {
      ensureStructureCalls += 1;
    },
    nextOpenTicket: async () => ticketA,
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  const request = await runner.requestRunAll();

  assert.equal(request.status, "blocked");
  assert.equal(request.reason, "codex-auth-missing");
  assert.match(request.message, /codex login/u);
  assert.equal(codex.authChecks, 1);
  assert.equal(ensureStructureCalls, 0);
  assert.equal(codex.calls.length, 0);
  assert.equal(runner.getState().isRunning, false);
  assert.equal(runner.getState().phase, "error");
  assert.match(runner.getState().lastMessage, /codex login/u);
  assert.equal(logger.errors[0]?.message, "Falha de autenticacao do Codex CLI antes da rodada");
});

test("requestRunAll evita corrida durante preflight de autenticacao", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(undefined, true, false, 20);
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  let resolveCalls = 0;
  const runner = createRunner(logger, roundDependencies, {
    resolveRoundDependencies: async () => {
      resolveCalls += 1;
      return roundDependencies;
    },
  });

  const firstRequest = runner.requestRunAll();
  const secondRequest = runner.requestRunAll();

  const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);
  assert.deepEqual(firstResult, { status: "started" });
  assert.deepEqual(secondResult, {
    status: "blocked",
    reason: "project-slot-busy",
    message: "Nao e possivel iniciar /run_all: slot do projeto alpha-project ja ocupado por /run_all.",
  });

  await waitForRunnerToStop(runner);
  assert.equal(codex.authChecks, 1);
  assert.equal(resolveCalls, 2);
});

test("requestRunSpecs evita corrida durante preflight de autenticacao", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(undefined, true, false, 20);
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  let resolveCalls = 0;
  const runner = createRunner(logger, roundDependencies, {
    resolveRoundDependencies: async () => {
      resolveCalls += 1;
      return roundDependencies;
    },
  });

  const firstRequest = runner.requestRunSpecs(specFileName);
  const secondRequest = runner.requestRunSpecs(specFileName);

  const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);
  assert.deepEqual(firstResult, { status: "started" });
  assert.deepEqual(secondResult, {
    status: "blocked",
    reason: "project-slot-busy",
    message:
      "Nao e possivel iniciar /run_specs: slot do projeto alpha-project ja ocupado por /run_specs.",
  });

  await waitForRunnerToStop(runner);
  assert.equal(codex.authChecks, 1);
  assert.equal(resolveCalls, 2);
});

test("requestRunAll permite concorrencia entre projetos distintos (CA-01)", async () => {
  const logger = new SpyLogger();
  const codexA = new StubCodexClient();
  const codexB = new StubCodexClient();
  let nextTicketCallsA = 0;
  let nextTicketCallsB = 0;

  const queueA: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCallsA += 1;
      return nextTicketCallsA === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };
  const queueB: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCallsB += 1;
      return nextTicketCallsB === 1 ? ticketB : null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependenciesA = createRoundDependencies({
    activeProject: activeProjectA,
    queue: queueA,
    codexClient: codexA,
    gitVersioning: new StubGitVersioning(),
  });
  const roundDependenciesB = createRoundDependencies({
    activeProject: activeProjectB,
    queue: queueB,
    codexClient: codexB,
    gitVersioning: new StubGitVersioning(),
  });

  let currentProject: "alpha" | "beta" = "alpha";
  const runner = createRunner(logger, roundDependenciesA, {
    resolveRoundDependencies: async () =>
      currentProject === "alpha" ? roundDependenciesA : roundDependenciesB,
  });

  const runAlphaPromise = runner.requestRunAll();
  currentProject = "beta";
  const runBetaPromise = runner.requestRunAll();
  const [runAlphaResult, runBetaResult] = await Promise.all([runAlphaPromise, runBetaPromise]);

  assert.deepEqual(runAlphaResult, { status: "started" });
  assert.deepEqual(runBetaResult, { status: "started" });

  await waitForRunnerToStop(runner);
  assert.equal(codexA.authChecks, 1);
  assert.equal(codexB.authChecks, 1);
  assert.equal(nextTicketCallsA, 2);
  assert.equal(nextTicketCallsB, 2);
});

test("requestRunSpecs inicia em projeto distinto enquanto /run_all esta ativo", async () => {
  const logger = new SpyLogger();
  const codexA = new StubCodexClient();
  const codexB = new StubCodexClient();

  let releaseWait: () => void = () => undefined;
  const waitForRelease = new Promise<TicketRef | null>((resolve) => {
    releaseWait = () => resolve(null);
  });
  let nextTicketCalls = 0;
  const queueA: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => {
      nextTicketCalls += 1;
      if (nextTicketCalls === 1) {
        return ticketA;
      }
      return waitForRelease;
    },
    closeTicket: async () => undefined,
  };

  const roundDependenciesA = createRoundDependencies({
    activeProject: activeProjectA,
    queue: queueA,
    codexClient: codexA,
    gitVersioning: new StubGitVersioning(),
  });
  const roundDependenciesB = createRoundDependencies({
    activeProject: activeProjectB,
    queue: defaultQueue,
    codexClient: codexB,
    gitVersioning: new StubGitVersioning(),
  });

  let currentProject: "alpha" | "beta" = "alpha";
  const runner = createRunner(logger, roundDependenciesA, {
    resolveRoundDependencies: async () =>
      currentProject === "alpha" ? roundDependenciesA : roundDependenciesB,
  });

  const runAllResult = await runner.requestRunAll();
  assert.deepEqual(runAllResult, { status: "started" });

  currentProject = "beta";
  const runSpecsResult = await runner.requestRunSpecs(specFileName);
  assert.deepEqual(runSpecsResult, { status: "started" });

  assert.equal(codexA.authChecks, 1);
  assert.equal(codexB.authChecks, 1);

  releaseWait();
  await waitForRunnerToStop(runner);
});

test("requestRunAll bloqueia por capacidade global com runner-capacity-maxed", async () => {
  const logger = new SpyLogger();

  const createBlockingQueue = (ticket: TicketRef) => {
    let releaseWait: () => void = () => undefined;
    const waitForRelease = new Promise<TicketRef | null>((resolve) => {
      releaseWait = () => {
        resolve(null);
      };
    });

    let nextCalls = 0;
    return {
      queue: {
        ensureStructure: async () => undefined,
        nextOpenTicket: async () => {
          nextCalls += 1;
          if (nextCalls === 1) {
            return ticket;
          }
          return waitForRelease;
        },
        closeTicket: async () => undefined,
      } satisfies TicketQueue,
      release: () => {
        releaseWait();
      },
    };
  };

  const projects: ProjectRef[] = Array.from({ length: 6 }, (_, index) => ({
    name: `project-${index + 1}`,
    path: `/tmp/projects/project-${index + 1}`,
  }));
  const blockers = projects.map((_project, index) =>
    createBlockingQueue(index % 2 === 0 ? ticketA : ticketB),
  );
  const codexClients = projects.map(() => new StubCodexClient());
  const roundDependenciesList = projects.map((project, index) =>
    createRoundDependencies({
      activeProject: project,
      queue: blockers[index].queue,
      codexClient: codexClients[index],
      gitVersioning: new StubGitVersioning(),
    }),
  );

  const initialRoundDependencies = roundDependenciesList[0];
  if (!initialRoundDependencies) {
    throw new Error("Nao foi possivel inicializar dependencias de teste para capacidade global.");
  }

  let currentProjectIndex = 0;
  const runner = createRunner(logger, initialRoundDependencies, {
    resolveRoundDependencies: async () => {
      const dependencies = roundDependenciesList[currentProjectIndex];
      if (!dependencies) {
        throw new Error(`Dependencias nao encontradas para indice ${currentProjectIndex}`);
      }
      return dependencies;
    },
  });

  for (let index = 0; index < 5; index += 1) {
    currentProjectIndex = index;
    const startResult = await runner.requestRunAll();
    assert.deepEqual(startResult, { status: "started" });
  }

  currentProjectIndex = 5;
  const blockedResult = await runner.requestRunAll();
  assert.equal(blockedResult.status, "blocked");
  if (blockedResult.status === "blocked") {
    assert.equal(blockedResult.reason, "runner-capacity-maxed");
    assert.match(
      blockedResult.message,
      /Capacidade maxima de 5 runners ativos atingida/u,
    );
    const activeProjectNames = blockedResult.activeProjects?.map((project) => project.name) ?? [];
    assert.deepEqual(activeProjectNames.sort(), projects.slice(0, 5).map((project) => project.name).sort());
  }

  blockers.slice(0, 5).forEach((blocking) => {
    blocking.release();
  });
  await waitForRunnerToStop(runner);

  currentProjectIndex = 5;
  const retryResult = await runner.requestRunAll();
  assert.deepEqual(retryResult, { status: "started" });
  blockers[5]?.release();
  await waitForRunnerToStop(runner);
});

test("startPlanSpecSession pode coexistir com /run_all em outro projeto (CA-08)", async () => {
  const logger = new SpyLogger();
  const roundDependenciesA = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: new StubCodexClient(),
    gitVersioning: new StubGitVersioning(),
  });
  const roundDependenciesB = createRoundDependencies({
    activeProject: activeProjectB,
    queue: defaultQueue,
    codexClient: new StubCodexClient(),
    gitVersioning: new StubGitVersioning(),
  });

  let activeProjectName: "alpha" | "beta" = "alpha";
  const runner = createRunner(logger, roundDependenciesA, {
    resolveRoundDependencies: async () =>
      activeProjectName === "alpha" ? roundDependenciesA : roundDependenciesB,
  });

  const planSpecStartResult = await runner.startPlanSpecSession("42");
  assert.equal(planSpecStartResult.status, "started");

  activeProjectName = "beta";
  const runAllResult = await runner.requestRunAll();
  assert.deepEqual(runAllResult, { status: "started" });

  const cancelResult = await runner.cancelPlanSpecSession("42");
  assert.equal(cancelResult.status, "cancelled");
  await waitForRunnerToStop(runner);
});

test("requestRunSpecs bloqueia rodada de tickets quando spec-close-and-version falha", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient((stage) => stage === "spec-close-and-version");
    const gitVersioning = new StubGitVersioning();
    let ensureStructureCalls = 0;
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => {
        ensureStructureCalls += 1;
      },
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return fixture.tickets[0] ?? null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning,
    });
    const runner = createRunner(logger, roundDependencies);
    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });

    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
      [
        `spec:${specFileName}:spec-triage`,
        `spec:${specFileName}:spec-close-and-version`,
      ],
    );
    assert.equal(codex.specTicketValidationSessionStartCalls, 1);
    assert.equal(ensureStructureCalls, 0);
    assert.equal(nextTicketCalls, 0);
    assert.equal(gitVersioning.syncChecks, 0);

    const state = runner.getState();
    assert.equal(state.isRunning, false);
    assert.equal(state.phase, "error");
    assert.equal(state.currentSpec, null);
    assert.match(state.lastMessage, /rodada \/run-all bloqueada/u);
    assert.equal(logger.errors.length, 1);
    assert.equal(logger.errors[0]?.message, "Erro no ciclo de triagem de spec");
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs emite milestone de falha quando spec-close-and-version falha", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient((stage) => stage === "spec-close-and-version");
    const milestones: RunSpecsTriageLifecycleEvent[] = [];
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => fixture.tickets[0] ?? null,
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runSpecsEventHandlers: {
          onTriageMilestone: async (event) => {
            milestones.push(event);
          },
        } satisfies RunSpecsEventHandlers,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.equal(milestones.length, 1);
    assert.equal(milestones[0]?.spec.fileName, specFileName);
    assert.equal(milestones[0]?.outcome, "failure");
    assert.equal(milestones[0]?.finalStage, "spec-close-and-version");
    assert.match(milestones[0]?.nextAction ?? "", /Rodada \/run-all bloqueada/u);
    assert.match(milestones[0]?.details ?? "", /falha simulada/u);
    assert.equal(milestones[0]?.timing.interruptedStage, "spec-close-and-version");
    assert.deepEqual(
      milestones[0]?.timing.completedStages,
      [
        "spec-triage",
        "spec-ticket-validation",
        "spec-ticket-derivation-retrospective",
      ],
    );
    assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-triage"], "number");
    assert.equal(
      typeof milestones[0]?.timing.durationsByStageMs["spec-ticket-validation"],
      "number",
    );
    assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-close-and-version"], "number");
    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow === "run-specs") {
      assert.equal(runSpecsSummary.outcome, "failure");
      assert.equal(runSpecsSummary.completionReason, "triage-failure");
      assert.equal(runSpecsSummary.finalStage, "spec-close-and-version");
      assert.equal(runSpecsSummary.runAllSummary, undefined);
      assert.deepEqual(runSpecsSummary.codexPreferences, createFlowCodexPreferencesSnapshot());
      assert.equal(runSpecsSummary.timing.interruptedStage, "spec-close-and-version");
      assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-triage"], "number");
      assert.equal(
        typeof runSpecsSummary.timing.durationsByStageMs["spec-ticket-validation"],
        "number",
      );
      assert.equal(
        runSpecsSummary.specTicketDerivationRetrospective?.decision,
        "skipped-no-reviewed-gaps",
      );
      assert.equal(
        typeof runSpecsSummary.timing.durationsByStageMs["spec-close-and-version"],
        "number",
      );
      assert.equal(runSpecsSummary.timing.durationsByStageMs["run-all"], undefined);
      assert.equal(runSpecsSummary.specTicketValidation?.verdict, "GO");
    } else {
      assert.fail("resumo de fluxo /run_specs deveria existir");
    }
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs encerra com NO_GO em spec-ticket-validation e atualiza a spec", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "medium",
        summary: "Persistem gaps de cobertura e fechamento observavel.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["O pacote derivado ainda nao contem ticket dedicado para o novo gate."],
            probableRootCause: "ticket",
            isAutoCorrectable: false,
          },
        ],
        appliedCorrections: [],
      }),
    ];
    const milestones: RunSpecsTriageLifecycleEvent[] = [];
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return fixture.tickets[0] ?? null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runSpecsEventHandlers: {
          onTriageMilestone: async (event) => {
            milestones.push(event);
          },
        } satisfies RunSpecsEventHandlers,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
      [
        `spec:${specFileName}:spec-triage`,
        `spec:${specFileName}:spec-ticket-derivation-retrospective`,
      ],
    );
    assert.equal(codex.specTicketValidationSessionStartCalls, 1);
    assert.equal(nextTicketCalls, 0);
    assert.equal(milestones.length, 1);
    assert.equal(milestones[0]?.outcome, "blocked");
    assert.equal(milestones[0]?.finalStage, "spec-ticket-derivation-retrospective");
    assert.match(milestones[0]?.nextAction ?? "", /NO_GO/u);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow === "run-specs") {
      assert.equal(runSpecsSummary.outcome, "blocked");
      assert.equal(runSpecsSummary.finalStage, "spec-ticket-derivation-retrospective");
      assert.equal(runSpecsSummary.completionReason, "spec-ticket-validation-no-go");
      assert.equal(runSpecsSummary.runAllSummary, undefined);
      assert.equal(runSpecsSummary.specTicketValidation?.verdict, "NO_GO");
      assert.equal(runSpecsSummary.specTicketValidation?.finalReason, "no-auto-correctable-gaps");
      assert.equal(runSpecsSummary.specTicketDerivationRetrospective?.decision, "executed");
      assert.equal(
        runSpecsSummary.specTicketDerivationRetrospective?.analysis?.inputMode,
        "spec-ticket-validation-history",
      );
      assert.deepEqual(
        runSpecsSummary.timing.completedStages,
        [
          "spec-triage",
          "spec-ticket-validation",
          "spec-ticket-derivation-retrospective",
        ],
      );
      assert.equal(runSpecsSummary.timing.durationsByStageMs["run-all"], undefined);
    } else {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.deepEqual(
      records.map(
        (entry) =>
          `${entry.request.sourceCommand}:${entry.request.kind}:${entry.request.stage}:${entry.request.decision.status}`,
      ),
      [
        "run-specs:spec:spec-triage:success",
        "run-specs:spec:spec-ticket-validation:success",
        "run-specs:spec:spec-ticket-derivation-retrospective:success",
      ],
    );
    assert.equal(records[1]?.request.decision.metadata?.verdict, "NO_GO");
    assert.equal(records[2]?.request.decision.metadata?.inputMode, "spec-ticket-validation-history");

    const specContent = await fs.readFile(
      path.join(fixture.projectRoot, "docs", "specs", specFileName),
      "utf8",
    );
    assert.match(specContent, /^### Ultima execucao registrada$/imu);
    assert.match(specContent, /^\s*-\s*Veredito:\s*NO_GO\s*$/imu);
    assert.match(specContent, /RF-01 ainda sem ticket dedicado\./u);
    assert.match(specContent, /#### Correcoes aplicadas/u);
    assert.match(
      specContent,
      /Nenhuma observacao sistemica registrada neste gate pre-run-all\./u,
    );
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs persiste historico por ciclo em summary, spec e trace quando ha revalidacao", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.specTicketValidationAutoCorrectHandler = createSpecTicketValidationAutoCorrectHandler(
      fixture.projectRoot,
      "Cobertura explicitada na primeira tentativa.",
    );
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "Primeiro passe encontrou gap auto-corrigivel.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["O pacote derivado ainda nao contem ticket dedicado para o novo gate."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "Revalidacao ainda encontrou o mesmo gap.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["Mesmo apos a tentativa, ainda nao existe ticket dedicado suficiente."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
    ];
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => null,
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "blocked");
    assert.equal(runSpecsSummary.specTicketValidation?.cyclesExecuted, 1);
    assert.equal(runSpecsSummary.specTicketValidation?.cycleHistory.length, 2);
    assert.equal(runSpecsSummary.specTicketValidation?.cycleHistory[0]?.phase, "initial-validation");
    assert.equal(runSpecsSummary.specTicketValidation?.cycleHistory[1]?.phase, "revalidation");
    assert.equal(
      runSpecsSummary.specTicketValidation?.cycleHistory[1]?.realGapReductionFromPrevious,
      false,
    );
    assert.equal(
      runSpecsSummary.specTicketValidation?.cycleHistory[1]?.appliedCorrections.length,
      1,
    );

    const traceRecord = records.find((entry) => entry.request.stage === "spec-ticket-validation");
    const traceCycleHistory = traceRecord?.request.decision.metadata?.cycleHistory as
      | Array<{
          cycleNumber?: number;
          phase?: string;
          realGapReductionFromPrevious?: boolean | null;
        }>
      | undefined;
    assert.equal(traceCycleHistory?.length, 2);
    assert.equal(traceCycleHistory?.[0]?.cycleNumber, 0);
    assert.equal(traceCycleHistory?.[0]?.phase, "initial-validation");
    assert.equal(traceCycleHistory?.[1]?.cycleNumber, 1);
    assert.equal(traceCycleHistory?.[1]?.phase, "revalidation");
    assert.equal(traceCycleHistory?.[1]?.realGapReductionFromPrevious, false);
    assert.equal(runSpecsSummary.specTicketDerivationRetrospective?.decision, "executed");
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.analysis?.inputMode,
      "spec-ticket-validation-history",
    );

    const specContent = await fs.readFile(
      path.join(fixture.projectRoot, "docs", "specs", specFileName),
      "utf8",
    );
    assert.match(specContent, /#### Historico por ciclo/u);
    assert.match(specContent, /Ciclo 0 \[initial-validation\]: NO_GO \(high\)/u);
    assert.match(specContent, /Ciclo 1 \[revalidation\]: NO_GO \(high\)/u);
    assert.match(specContent, /Reducao real de gaps vs\. ciclo anterior: nao/u);
    assert.match(specContent, /Correcoes deste ciclo: 1/u);
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs executa retrospectiva pre-run-all quando um gap revisado termina em GO", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.specTicketValidationAutoCorrectHandler = createSpecTicketValidationAutoCorrectHandler(
      fixture.projectRoot,
      "Cobertura corrigida para liberar GO.",
    );
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "Primeiro passe encontrou gap auto-corrigivel.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["O pacote derivado ainda nao contem ticket dedicado para o novo gate."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
      createSpecTicketValidationPassResult({
        verdict: "GO",
        confidence: "high",
        summary: "Pacote derivado ficou apto apos a revisao do gap.",
        gaps: [],
        appliedCorrections: [],
      }),
    ];
    codex.stageOutputs["spec-ticket-derivation-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-hypothesis",
      confidence: "medium",
      publicationEligibility: false,
      inputMode: "spec-ticket-validation-history",
      summary: "A ordem do workflow ainda depende de contexto implicito para revisar gaps de derivacao.",
      causalHypothesis: "O contrato do gate funcional ainda nao orienta com suficiente clareza a releitura sistemica pre-run-all.",
      benefitSummary: "Tornar essa releitura explicita reduz retrabalho antes do consumo do backlog real.",
      findings: [
        {
          summary: "A retrospectiva pre-run-all precisa reforcar a ordem canonica de releitura.",
          affectedArtifactPaths: ["src/core/runner.ts", "prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md"],
          requirementRefs: ["RF-12", "CA-05"],
          evidence: ["O gap foi revisado para GO apenas apos uma correção segura no pacote derivado."],
        },
      ],
      followUpTicketPaths: [`tickets/open/${ticketA.name}`],
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
      [
        `spec:${specFileName}:spec-triage`,
        `spec:${specFileName}:spec-ticket-derivation-retrospective`,
        `spec:${specFileName}:spec-close-and-version`,
        `ticket:${fixture.tickets[0]?.name}:plan`,
        `ticket:${fixture.tickets[0]?.name}:implement`,
        `ticket:${fixture.tickets[0]?.name}:close-and-version`,
        `spec:${specFileName}:spec-audit`,
      ],
    );

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "success");
    assert.equal(runSpecsSummary.specTicketValidation?.verdict, "GO");
    assert.equal(runSpecsSummary.specTicketDerivationRetrospective?.decision, "executed");
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.analysis?.classification,
      "systemic-hypothesis",
    );
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.analysis?.inputMode,
      "spec-ticket-validation-history",
    );
    assert.equal(
      records.some((entry) => entry.request.stage === "spec-ticket-derivation-retrospective"),
      true,
    );
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs executa retrospectiva pre-run-all apos falha tecnica com historico estruturado suficiente", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.specTicketValidationAutoCorrectHandler = async () => {
      throw new Error("falha simulada na autocorrecao");
    };
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "Primeiro passe encontrou gap revisado com insumo estruturado suficiente.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["O pacote derivado ainda nao contem ticket dedicado para o novo gate."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
    ];
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => null,
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "failure");
    assert.equal(runSpecsSummary.finalStage, "spec-ticket-derivation-retrospective");
    assert.equal(runSpecsSummary.completionReason, "spec-ticket-validation-failure");
    assert.equal(
      runSpecsSummary.specTicketValidation?.finalReason,
      "technical-failure-partial-history",
    );
    assert.equal(runSpecsSummary.specTicketDerivationRetrospective?.decision, "executed");
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.functionalVerdict,
      "unavailable",
    );
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.analysis?.inputMode,
      "spec-ticket-validation-history",
    );
    assert.equal(
      records.some((entry) => entry.request.stage === "spec-ticket-derivation-retrospective"),
      true,
    );
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs registra skip explicito da retrospectiva pre-run-all quando o gate falha sem insumos estruturados", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.specTicketValidationSessionFactory = () => ({
      runTurn: async () => {
        throw new Error("falha simulada antes do primeiro passe estruturado");
      },
      getThreadId: () => null,
      cancel: async () => undefined,
    });
    const milestones: RunSpecsTriageLifecycleEvent[] = [];
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => null,
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runSpecsEventHandlers: {
          onTriageMilestone: async (event) => {
            milestones.push(event);
          },
        } satisfies RunSpecsEventHandlers,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.equal(milestones.length, 1);
    assert.equal(milestones[0]?.outcome, "failure");
    assert.equal(milestones[0]?.finalStage, "spec-ticket-validation");
    assert.match(milestones[0]?.details ?? "", /insumos estruturados suficientes/u);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "failure");
    assert.equal(runSpecsSummary.finalStage, "spec-ticket-validation");
    assert.equal(runSpecsSummary.completionReason, "spec-ticket-validation-failure");
    assert.equal(runSpecsSummary.specTicketValidation, undefined);
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.decision,
      "skipped-insufficient-structured-input",
    );
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.structuredInputAvailable,
      false,
    );
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.reviewedGapHistoryDetected,
      false,
    );
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.functionalVerdict,
      "unavailable",
    );
    assert.deepEqual(runSpecsSummary.timing.completedStages, [
      "spec-triage",
      "spec-ticket-derivation-retrospective",
    ]);
    assert.equal(runSpecsSummary.timing.interruptedStage, "spec-ticket-validation");

    const derivationTrace = records.find(
      (entry) => entry.request.stage === "spec-ticket-derivation-retrospective",
    );
    assert.equal(derivationTrace?.request.decision.status, "success");
    assert.equal(
      derivationTrace?.request.decision.metadata?.decision,
      "skipped-insufficient-structured-input",
    );
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs publica ticket transversal na retrospectiva pre-run-all sem alterar a spec do projeto externo", async () => {
  const workspaceRoot = await createTempProjectRoot();
  const externalProjectRoot = path.join(workspaceRoot, "alpha-project");
  const workflowRepoRoot = path.join(workspaceRoot, "codex-flow-runner");
  const fixture = await setupRunSpecsFixture([ticketA.name], {
    projectRoot: externalProjectRoot,
    activeProjectName: "alpha-project",
  });
  let specContentAtRetrospectiveStart = "";
  try {
    await ensureWorkflowImprovementRepoStructure(workflowRepoRoot);
    const logger = new SpyLogger();
    const workflowPublisherHarness = createWorkflowImprovementTicketPublisherHarness();
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage) => {
        if (stage === "spec-ticket-derivation-retrospective") {
          specContentAtRetrospectiveStart = await fs.readFile(
            path.join(fixture.projectRoot, "docs", "specs", specFileName),
            "utf8",
          );
        }
      },
    );
    codex.specTicketValidationAutoCorrectHandler = createSpecTicketValidationAutoCorrectHandler(
      fixture.projectRoot,
      "Cobertura corrigida para habilitar a retrospectiva pre-run-all.",
    );
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "Primeiro passe encontrou gap auto-corrigivel com historico suficiente.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-01 ainda sem ticket dedicado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-01", "CA-01"],
            evidence: ["O pacote derivado ainda nao contem ticket dedicado para o novo gate."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
      createSpecTicketValidationPassResult({
        verdict: "GO",
        confidence: "high",
        summary: "Pacote derivado ficou apto apos a revisao do gap.",
        gaps: [],
        appliedCorrections: [],
      }),
    ];
    codex.stageOutputs["spec-ticket-derivation-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "spec-ticket-validation-history",
      summary: "A derivacao ainda precisa publicar backlog sistemico antes do /run-all.",
      causalHypothesis:
        "A etapa pre-run-all precisa roteamento explicito do ticket transversal para o repo do workflow.",
      benefitSummary:
        "Publicar o backlog agregado antes do /run-all reduz repeticao da mesma causa em specs futuras.",
      findings: [
        {
          summary: "A publication da derivacao precisa continuar fora do projeto alvo externo.",
          affectedArtifactPaths: [
            "src/core/runner.ts",
            "src/integrations/workflow-improvement-ticket-publisher.ts",
          ],
          requirementRefs: ["RF-20", "RF-22", "RF-24", "CA-08", "CA-11"],
          evidence: ["O gap revisado da derivacao gerou backlog sistemico transversal antes do /run-all."],
        },
      ],
      followUpTicketPaths: [`tickets/open/${ticketA.name}`],
      workflowArtifactsConsulted: [
        "../codex-flow-runner/AGENTS.md",
        "../codex-flow-runner/prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md",
      ],
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => null,
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
        workflowImprovementTicketPublisher: workflowPublisherHarness.publisher,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    const derivationSummary = runSpecsSummary.specTicketDerivationRetrospective;
    assert.equal(derivationSummary?.decision, "executed");
    assert.equal(derivationSummary?.analysis?.classification, "systemic-gap");
    assert.equal(derivationSummary?.analysis?.publicationEligibility, true);
    assert.equal(derivationSummary?.workflowImprovementTicket?.status, "created-and-pushed");
    assert.equal(
      derivationSummary?.workflowImprovementTicket?.targetRepoKind,
      "workflow-sibling",
    );
    assert.equal(
      derivationSummary?.workflowImprovementTicket?.targetRepoDisplayPath,
      "../codex-flow-runner",
    );
    assert.equal(runSpecsSummary.workflowImprovementTicket, undefined);
    assert.equal(
      workflowPublisherHarness.gitClients.get(workflowRepoRoot)?.explicitPathPublishes.length,
      1,
    );

    const specContentAfterRun = await fs.readFile(
      path.join(fixture.projectRoot, "docs", "specs", specFileName),
      "utf8",
    );
    assert.equal(specContentAfterRun, specContentAtRetrospectiveStart);
  } finally {
    await cleanupTempProjectRoot(workspaceRoot);
  }
});

test("requestRunSpecs usa follow-up tickets do spec-audit como insumo principal e gera handoff em high confidence", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name], {
    activeProjectName: "codex-flow-runner",
  });
  const followUpTicketName = "2026-03-19-follow-up-auditoria.md";
  let retrospectiveContext = "";
  try {
    await ensureWorkflowImprovementRepoStructure(fixture.projectRoot);
    const logger = new SpyLogger();
    const workflowPublisherHarness = createWorkflowImprovementTicketPublisherHarness();
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage, stageSpec) => {
        if (stage === "spec-audit") {
          await writeTicketMetadataFile(fixture.projectRoot, {
            directory: "open",
            ticketName: followUpTicketName,
            status: "open",
            sourceSpec: `docs/specs/${specFileName}`,
          });
        }

        if (stage === "spec-workflow-retrospective") {
          retrospectiveContext = stageSpec.workflowRetrospectiveContext ?? "";
        }
      },
    );
    codex.specTicketValidationAutoCorrectHandler = createSpecTicketValidationAutoCorrectHandler(
      fixture.projectRoot,
      "Cobertura ajustada para permitir a retrospectiva pre-run-all antes do spec-audit.",
    );
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "O gate funcional encontrou um gap revisavel antes do /run-all.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-35 ainda nao esta refletido de forma observavel no ticket derivado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-35", "CA-17"],
            evidence: ["A rodada precisa revisar um gap antes de liberar a retrospectiva pre-run-all."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
      createSpecTicketValidationPassResult({
        verdict: "GO",
        confidence: "high",
        summary: "O pacote derivado ficou apto apos a revisao do gap.",
        gaps: [],
        appliedCorrections: [],
      }),
    ];
    codex.stageOutputs["spec-ticket-derivation-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-hypothesis",
      confidence: "medium",
      publicationEligibility: false,
      inputMode: "spec-ticket-validation-history",
      summary: "A derivacao observou um gap sistemico distinto antes do /run-all.",
      causalHypothesis:
        "O pre-run-all ja tinha um achado proprio, mas diferente da causa residual pos-auditoria.",
      benefitSummary:
        "Manter o contexto pre-run-all ajuda a provar que a nova publication nao foi bloqueada indevidamente.",
      findings: [
        {
          summary: "A derivacao exigiu reforco na ordem de releitura canonica antes do /run-all.",
          affectedArtifactPaths: ["prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md"],
          requirementRefs: ["RF-12", "CA-05"],
          evidence: ["O pre-run-all encontrou causa distinta da observada depois do spec-audit."],
        },
      ],
    });
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 1,
    });
    codex.stageOutputs["spec-workflow-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "follow-up-tickets",
      summary: "O workflow ainda orienta a leitura causal de forma incompleta apos a auditoria.",
      causalHypothesis:
        "A ausencia de contrato dedicado de workflow-gap-analysis favorece backlog sistemico antes da evidencia residual.",
      benefitSummary:
        "Separar a analise pos-auditoria reduz ruido recorrente em specs futuras.",
      findings: [
        {
          summary: "A retrospectiva pos-auditoria precisa nascer de um contrato parseavel proprio.",
          affectedArtifactPaths: ["src/core/runner.ts", `tickets/open/${followUpTicketName}`],
          requirementRefs: ["RF-05", "RF-16"],
          evidence: ["O follow-up funcional aberto pelo audit aponta lacuna sistemica observavel."],
        },
      ],
      followUpTicketPaths: [`tickets/open/${followUpTicketName}`],
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runFlowEventHandlers,
        workflowImprovementTicketPublisher: workflowPublisherHarness.publisher,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "success");
    assert.equal(runSpecsSummary.finalStage, "spec-workflow-retrospective");
    assert.equal(runSpecsSummary.workflowGapAnalysis?.classification, "systemic-gap");
    assert.equal(runSpecsSummary.workflowGapAnalysis?.publicationEligibility, true);
    assert.equal(runSpecsSummary.workflowGapAnalysis?.historicalReference, null);
    assert.deepEqual(runSpecsSummary.workflowGapAnalysis?.followUpTicketPaths, [
      `tickets/open/${followUpTicketName}`,
    ]);
    assert.equal(
      runSpecsSummary.workflowGapAnalysis?.publicationHandoff?.sourceSpecFileName,
      specFileName,
    );
    assert.equal(
      runSpecsSummary.workflowGapAnalysis?.publicationHandoff?.inputMode,
      "follow-up-tickets",
    );
    assert.equal(
      "workflowImprovementTicket" in (runSpecsSummary.specTicketValidation ?? {}),
      false,
    );
    assert.equal(runSpecsSummary.workflowImprovementTicket?.status, "created-and-pushed");
    assert.equal(runSpecsSummary.workflowImprovementTicket?.targetRepoKind, "current-project");
    assert.equal(runSpecsSummary.workflowImprovementTicket?.targetRepoDisplayPath, ".");
    assert.ok(runSpecsSummary.workflowImprovementTicket?.ticketPath);
    assert.match(retrospectiveContext, /Input mode esperado: follow-up-tickets/u);
    assert.match(retrospectiveContext, new RegExp(followUpTicketName.replace(/\./gu, "\\."), "u"));
    assert.equal(
      workflowPublisherHarness.gitClients.get(fixture.projectRoot)?.explicitPathPublishes.length,
      1,
    );

    const traceRecord = records.find(
      (entry) => entry.request.stage === "spec-workflow-retrospective",
    );
    assert.equal(traceRecord?.request.decision.metadata?.classification, "systemic-gap");
    assert.equal(traceRecord?.request.decision.metadata?.publicationEligibility, true);
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs suprime publication pos-spec-audit quando a mesma frente causal ja foi ticketada no pre-run-all", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name], {
    activeProjectName: "codex-flow-runner",
  });
  const followUpTicketName = "2026-03-19-follow-up-overlap.md";
  let retrospectiveContext = "";
  const overlappingFinding = {
    summary: "A mesma frente causal de orquestracao ja tratada no pre-run-all reapareceu apos a auditoria.",
    affectedArtifactPaths: ["src/core/runner.ts", `tickets/open/${followUpTicketName}`],
    requirementRefs: ["RF-35", "RF-36", "CA-17"],
    evidence: ["O follow-up funcional pos-auditoria reaponta para o mesmo backlog transversal da derivacao."],
  };
  const overlappingFingerprint =
    buildWorkflowImprovementTicketFindingFingerprint(overlappingFinding);
  try {
    await ensureWorkflowImprovementRepoStructure(fixture.projectRoot);
    const logger = new SpyLogger();
    const workflowPublisherHarness = createWorkflowImprovementTicketPublisherHarness();
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage, stageSpec) => {
        if (stage === "spec-audit") {
          await writeTicketMetadataFile(fixture.projectRoot, {
            directory: "open",
            ticketName: followUpTicketName,
            status: "open",
            sourceSpec: `docs/specs/${specFileName}`,
          });
        }

        if (stage === "spec-workflow-retrospective") {
          retrospectiveContext = stageSpec.workflowRetrospectiveContext ?? "";
        }
      },
    );
    codex.specTicketValidationAutoCorrectHandler = createSpecTicketValidationAutoCorrectHandler(
      fixture.projectRoot,
      "Cobertura ajustada para registrar historico revisado antes da retrospectiva pos-spec-audit.",
    );
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "O gate funcional abriu um gap revisavel antes do /run-all.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-35 ainda nao esta refletido no pacote derivado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-35", "CA-17"],
            evidence: ["A rodada precisa de historico revisado para habilitar a retrospectiva pre-run-all."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
      createSpecTicketValidationPassResult({
        verdict: "GO",
        confidence: "high",
        summary: "O pacote derivado ficou apto apos a revisao do gap.",
        gaps: [],
        appliedCorrections: [],
      }),
    ];
    codex.stageOutputs["spec-ticket-derivation-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "spec-ticket-validation-history",
      summary: "A frente causal da derivacao ja justificou ticket transversal antes do /run-all.",
      causalHypothesis:
        "A ordem de orquestracao entre retrospectivas ainda precisa anti-duplicacao explicita.",
      benefitSummary:
        "Consolidar o backlog no pre-run-all evita ticket transversal duplicado apos o spec-audit.",
      findings: [overlappingFinding],
      workflowArtifactsConsulted: [
        "AGENTS.md",
        "prompts/12-retrospectiva-derivacao-tickets-pre-run-all.md",
      ],
    });
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 1,
    });
    codex.stageOutputs["spec-workflow-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "follow-up-tickets",
      summary: "A auditoria tornou o backlog residual visivel, mas a causa raiz continua a mesma.",
      causalHypothesis:
        "Sem anti-duplicacao, a retrospectiva pos-spec-audit tentaria reabrir o mesmo backlog sistemico.",
      benefitSummary:
        "Usar apenas referencia historica preserva a linha causal sem duplicar tickets.",
      findings: [overlappingFinding],
      followUpTicketPaths: [`tickets/open/${followUpTicketName}`],
    });

    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runFlowEventHandlers,
        workflowImprovementTicketPublisher: workflowPublisherHarness.publisher,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.workflowImprovementTicket?.status,
      "created-and-pushed",
    );
    assert.equal(runSpecsSummary.workflowGapAnalysis?.publicationEligibility, false);
    assert.equal(runSpecsSummary.workflowImprovementTicket, undefined);
    assert.equal(
      runSpecsSummary.workflowGapAnalysis?.historicalReference?.ticketPath,
      runSpecsSummary.specTicketDerivationRetrospective?.workflowImprovementTicket?.ticketPath,
    );
    assert.deepEqual(
      runSpecsSummary.workflowGapAnalysis?.historicalReference?.findingFingerprints,
      [overlappingFingerprint],
    );
    assert.equal(
      workflowPublisherHarness.gitClients.get(fixture.projectRoot)?.explicitPathPublishes.length,
      1,
    );
    assert.match(retrospectiveContext, /Contexto causal pre-run-all ja tratado/u);
    assert.match(retrospectiveContext, new RegExp(overlappingFingerprint, "u"));
    assert.match(retrospectiveContext, /historicalReference/u);

    const traceRecord = records.find(
      (entry) => entry.request.stage === "spec-workflow-retrospective",
    );
    assert.equal(traceRecord?.request.decision.metadata?.publicationEligibility, false);
    assert.equal(
      (traceRecord?.request.decision.metadata?.historicalReference as { ticketPath?: string } | null)
        ?.ticketPath,
      runSpecsSummary.specTicketDerivationRetrospective?.workflowImprovementTicket?.ticketPath,
    );
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs referencia apenas achados pre-run-all quando ha overlap causal sem ticket publicado antes do /run-all", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name], {
    activeProjectName: "codex-flow-runner",
  });
  const followUpTicketName = "2026-03-19-follow-up-overlap-sem-ticket.md";
  const overlappingFinding = {
    summary: "A mesma frente causal analisada no pre-run-all reapareceu apos a auditoria, sem ticket previo.",
    affectedArtifactPaths: ["src/core/runner.ts", `tickets/open/${followUpTicketName}`],
    requirementRefs: ["RF-35", "RF-36", "CA-17"],
    evidence: ["A causa observada pos-auditoria coincide com o achado sistemico anterior."],
  };
  const overlappingFingerprint =
    buildWorkflowImprovementTicketFindingFingerprint(overlappingFinding);
  try {
    await ensureWorkflowImprovementRepoStructure(fixture.projectRoot);
    const logger = new SpyLogger();
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage) => {
        if (stage === "spec-audit") {
          await writeTicketMetadataFile(fixture.projectRoot, {
            directory: "open",
            ticketName: followUpTicketName,
            status: "open",
            sourceSpec: `docs/specs/${specFileName}`,
          });
        }
      },
    );
    codex.specTicketValidationAutoCorrectHandler = createSpecTicketValidationAutoCorrectHandler(
      fixture.projectRoot,
      "Cobertura ajustada para registrar achados pre-run-all antes da auditoria.",
    );
    codex.specTicketValidationTurns = [
      createSpecTicketValidationPassResult({
        verdict: "NO_GO",
        confidence: "high",
        summary: "O gate funcional abriu um gap revisavel antes do /run-all.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-36 ainda nao esta refletido no pacote derivado.",
            affectedArtifactPaths: [`tickets/open/${ticketA.name}`],
            requirementRefs: ["RF-36", "CA-17"],
            evidence: ["A rodada precisa de historico revisado para habilitar a retrospectiva pre-run-all."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
        appliedCorrections: [],
      }),
      createSpecTicketValidationPassResult({
        verdict: "GO",
        confidence: "high",
        summary: "O pacote derivado ficou apto apos a revisao do gap.",
        gaps: [],
        appliedCorrections: [],
      }),
    ];
    codex.stageOutputs["spec-ticket-derivation-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-hypothesis",
      confidence: "medium",
      publicationEligibility: false,
      inputMode: "spec-ticket-validation-history",
      summary: "A derivacao ja havia isolado a frente causal, mas sem confianca suficiente para ticket automatico.",
      causalHypothesis:
        "O pre-run-all ja apontava a causa sistemica, mesmo sem publication automatica.",
      benefitSummary:
        "Referenciar os fingerprints preexistentes evita redescobrir a mesma causa apos o spec-audit.",
      findings: [overlappingFinding],
    });
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 1,
    });
    codex.stageOutputs["spec-workflow-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "follow-up-tickets",
      summary: "A auditoria reforcou uma causa sistemica ja conhecida da derivacao.",
      causalHypothesis:
        "Sem referencia historica parseavel, a etapa pos-auditoria tentaria promover a mesma causa.",
      benefitSummary:
        "A referencia historica evita publication duplicada mesmo sem ticket preexistente.",
      findings: [overlappingFinding],
      followUpTicketPaths: [`tickets/open/${followUpTicketName}`],
    });

    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.workflowGapAnalysis?.publicationEligibility, false);
    assert.equal(runSpecsSummary.workflowImprovementTicket, undefined);
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.workflowImprovementTicket,
      undefined,
    );
    assert.equal(runSpecsSummary.workflowGapAnalysis?.historicalReference?.ticketPath, null);
    assert.deepEqual(
      runSpecsSummary.workflowGapAnalysis?.historicalReference?.findingFingerprints,
      [overlappingFingerprint],
    );
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs cai para spec + audit quando nao ha follow-up e registra apenas hipotese em medium confidence", async () => {
  const workspaceRoot = await createTempProjectRoot();
  const externalProjectRoot = path.join(workspaceRoot, "alpha-project");
  const workflowRepoRoot = path.join(workspaceRoot, "codex-flow-runner");
  const fixture = await setupRunSpecsFixture([ticketA.name], {
    projectRoot: externalProjectRoot,
    activeProjectName: "alpha-project",
  });
  let retrospectiveContext = "";
  try {
    await ensureWorkflowImprovementRepoStructure(workflowRepoRoot);
    const logger = new SpyLogger();
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage, stageSpec) => {
        if (stage === "spec-workflow-retrospective") {
          retrospectiveContext = stageSpec.workflowRetrospectiveContext ?? "";
        }
      },
    );
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 0,
    });
    codex.stageOutputs["spec-workflow-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-hypothesis",
      confidence: "medium",
      publicationEligibility: false,
      inputMode: "spec-and-audit-fallback",
      summary:
        "Existe hipotese razoavel de que o workflow nao orienta bem a releitura causal pos-auditoria.",
      causalHypothesis:
        "A ordem atual de leitura canonica ainda depende demais de conhecimento implicito.",
      benefitSummary:
        "Formalizar a ordem de leitura pode reduzir retrabalho, mas a evidencia ainda e parcial.",
      findings: [
        {
          summary:
            "A ordem de leitura canonica do codex-flow-runner ainda nao aparece de forma suficientemente forte na retrospectiva.",
          affectedArtifactPaths: ["prompts/11-retrospectiva-workflow-apos-spec-audit.md"],
          requirementRefs: ["RF-12", "CA-08"],
          evidence: ["A auditoria nao abriu follow-up funcional, exigindo fallback controlado."],
        },
      ],
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "success");
    assert.equal(runSpecsSummary.finalStage, "spec-workflow-retrospective");
    assert.equal(runSpecsSummary.workflowGapAnalysis?.classification, "systemic-hypothesis");
    assert.equal(runSpecsSummary.workflowGapAnalysis?.confidence, "medium");
    assert.equal(runSpecsSummary.workflowGapAnalysis?.publicationEligibility, false);
    assert.equal(runSpecsSummary.workflowGapAnalysis?.publicationHandoff, undefined);
    assert.deepEqual(runSpecsSummary.workflowGapAnalysis?.followUpTicketPaths, []);
    assert.match(retrospectiveContext, /Input mode esperado: spec-and-audit-fallback/u);
    assert.match(retrospectiveContext, /Fallback controlado:/u);
    assert.match(retrospectiveContext, /\.\.\/codex-flow-runner/u);
  } finally {
    await cleanupTempProjectRoot(workspaceRoot);
  }
});

test("requestRunSpecs publica ticket transversal no repo irmao sem alterar a spec do projeto externo durante a retrospectiva", async () => {
  const workspaceRoot = await createTempProjectRoot();
  const externalProjectRoot = path.join(workspaceRoot, "alpha-project");
  const workflowRepoRoot = path.join(workspaceRoot, "codex-flow-runner");
  const fixture = await setupRunSpecsFixture([ticketA.name], {
    projectRoot: externalProjectRoot,
    activeProjectName: "alpha-project",
  });
  const followUpTicketName = "2026-03-19-follow-up-externo.md";
  let specContentAtRetrospectiveStart = "";
  try {
    await ensureWorkflowImprovementRepoStructure(workflowRepoRoot);
    const logger = new SpyLogger();
    const workflowPublisherHarness = createWorkflowImprovementTicketPublisherHarness();
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage) => {
        if (stage === "spec-audit") {
          await writeTicketMetadataFile(fixture.projectRoot, {
            directory: "open",
            ticketName: followUpTicketName,
            status: "open",
            sourceSpec: `docs/specs/${specFileName}`,
          });
        }

        if (stage === "spec-workflow-retrospective") {
          specContentAtRetrospectiveStart = await fs.readFile(
            path.join(fixture.projectRoot, "docs", "specs", specFileName),
            "utf8",
          );
        }
      },
    );
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 1,
    });
    codex.stageOutputs["spec-workflow-retrospective"] = createWorkflowGapAnalysisOutput({
      classification: "systemic-gap",
      confidence: "high",
      publicationEligibility: true,
      inputMode: "follow-up-tickets",
      summary: "O workflow publicou backlog sistemico no repo errado em cenarios externos.",
      causalHypothesis:
        "A publication pos-auditoria precisa resolver explicitamente o repo irmao do workflow.",
      benefitSummary:
        "Direcionar a publication para ../codex-flow-runner evita side effects no projeto auditado.",
      findings: [
        {
          summary: "A publication precisa ser roteada para o repo irmao do workflow.",
          affectedArtifactPaths: [
            "src/core/runner.ts",
            "src/integrations/workflow-improvement-ticket-publisher.ts",
          ],
          requirementRefs: ["RF-22", "RF-26", "RF-27", "CA-11"],
          evidence: ["O follow-up funcional do projeto externo exige backlog transversal fora do repo auditado."],
        },
      ],
      followUpTicketPaths: [`tickets/open/${followUpTicketName}`],
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
        workflowImprovementTicketPublisher: workflowPublisherHarness.publisher,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.workflowImprovementTicket?.status, "created-and-pushed");
    assert.equal(runSpecsSummary.workflowImprovementTicket?.targetRepoKind, "workflow-sibling");
    assert.equal(
      runSpecsSummary.workflowImprovementTicket?.targetRepoDisplayPath,
      "../codex-flow-runner",
    );
    const publishedTicketPath = runSpecsSummary.workflowImprovementTicket?.ticketPath;
    assert.ok(publishedTicketPath);
    const publishedTicketAbsolutePath = path.join(
      workflowRepoRoot,
      ...(publishedTicketPath ?? "").split("/"),
    );
    assert.equal(
      await fs
        .access(publishedTicketAbsolutePath)
        .then(() => true)
        .catch(() => false),
      true,
    );
    assert.equal(
      workflowPublisherHarness.gitClients.get(externalProjectRoot),
      undefined,
    );
    assert.equal(
      workflowPublisherHarness.gitClients.get(workflowRepoRoot)?.explicitPathPublishes.length,
      1,
    );

    const specContentAfterRun = await fs.readFile(
      path.join(fixture.projectRoot, "docs", "specs", specFileName),
      "utf8",
    );
    assert.equal(specContentAfterRun, specContentAtRetrospectiveStart);
  } finally {
    await cleanupTempProjectRoot(workspaceRoot);
  }
});

test("requestRunSpecs degrada falha tecnica da retrospectiva para operational-limitation sem falhar o /run_specs", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient((stage) => stage === "spec-workflow-retrospective");
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 0,
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "success");
    assert.equal(runSpecsSummary.finalStage, "spec-workflow-retrospective");
    assert.equal(runSpecsSummary.completionReason, "completed");
    assert.equal(runSpecsSummary.workflowGapAnalysis?.classification, "operational-limitation");
    assert.equal(
      runSpecsSummary.workflowGapAnalysis?.limitation?.code,
      "analysis-execution-failed",
    );
    assert.equal(runSpecsSummary.runAllSummary?.outcome, "success");
    assert.equal(runner.getState().phase, "idle");
    assert.equal(
      typeof runSpecsSummary.timing.durationsByStageMs["spec-workflow-retrospective"],
      "number",
    );

    const traceRecord = records.find(
      (entry) => entry.request.stage === "spec-workflow-retrospective",
    );
    assert.equal(traceRecord?.request.decision.status, "failure");
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs com sucesso encadeia run-all e processa backlog existente", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name, ticketB.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    const gitVersioning = new StubGitVersioning();
    const { summaries, onTicketFinalized } = createSummaryCollector();
    let nextTicketCalls = 0;

    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        if (nextTicketCalls === 1) {
          return fixture.tickets[0] ?? null;
        }

        if (nextTicketCalls === 2) {
          return fixture.tickets[1] ?? null;
        }

        return null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning,
    });
    const runner = createRunner(logger, roundDependencies, { onTicketFinalized });
    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });

    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
      [
        `spec:${specFileName}:spec-triage`,
        `spec:${specFileName}:spec-close-and-version`,
        `ticket:${fixture.tickets[0]?.name}:plan`,
        `ticket:${fixture.tickets[0]?.name}:implement`,
        `ticket:${fixture.tickets[0]?.name}:close-and-version`,
        `ticket:${fixture.tickets[1]?.name}:plan`,
        `ticket:${fixture.tickets[1]?.name}:implement`,
        `ticket:${fixture.tickets[1]?.name}:close-and-version`,
        `spec:${specFileName}:spec-audit`,
      ],
    );
    assert.equal(codex.specTicketValidationSessionStartCalls, 1);
    assert.equal(nextTicketCalls, 3);
    assert.equal(gitVersioning.syncChecks, 2);
    assert.equal(summaries.length, 2);
    assert.equal(summaries[0]?.ticket, fixture.tickets[0]?.name);
    assert.equal(summaries[1]?.ticket, fixture.tickets[1]?.name);
    const lastRunFlowSummary = runner.getState().lastRunFlowSummary;
    assert.equal(
      lastRunFlowSummary?.flow === "run-specs"
        ? lastRunFlowSummary.specTicketDerivationRetrospective?.decision
        : null,
      "skipped-no-reviewed-gaps",
    );

    const state = runner.getState();
    assert.equal(state.isRunning, false);
    assert.equal(state.phase, "idle");
    assert.equal(state.currentSpec, null);
    assert.equal(state.lastMessage, `Fluxo /run_specs finalizado para ${specFileName}`);
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs executa spec-workflow-retrospective quando spec-audit encontra gaps residuais", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.stageOutputs["spec-audit"] = createSpecAuditOutput({
      residualGapsDetected: true,
      followUpTicketsCreated: 1,
    });
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    let nextTicketCalls = 0;

    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
      [
        `spec:${specFileName}:spec-triage`,
        `spec:${specFileName}:spec-close-and-version`,
        `ticket:${fixture.tickets[0]?.name}:plan`,
        `ticket:${fixture.tickets[0]?.name}:implement`,
        `ticket:${fixture.tickets[0]?.name}:close-and-version`,
        `spec:${specFileName}:spec-audit`,
        `spec:${specFileName}:spec-workflow-retrospective`,
      ],
    );

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "success");
    assert.equal(runSpecsSummary.finalStage, "spec-workflow-retrospective");
    assert.equal(runSpecsSummary.completionReason, "completed");
    assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-audit"], "number");
    assert.equal(
      typeof runSpecsSummary.timing.durationsByStageMs["spec-workflow-retrospective"],
      "number",
    );
    assert.deepEqual(runSpecsSummary.timing.completedStages, [
      "spec-triage",
      "spec-ticket-validation",
      "spec-ticket-derivation-retrospective",
      "spec-close-and-version",
      "run-all",
      "spec-audit",
      "spec-workflow-retrospective",
    ]);
    assert.equal(
      runSpecsSummary.specTicketDerivationRetrospective?.decision,
      "skipped-no-reviewed-gaps",
    );
    assert.equal(runner.getState().phase, "idle");
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs emite milestone de sucesso antes de iniciar rodada de tickets", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.invocationPreferences = {
      model: "gpt-5.4",
      reasoningEffort: "high",
      speed: "fast",
    };
    const milestones: RunSpecsTriageLifecycleEvent[] = [];
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    let nextTicketCalls = 0;
    let firstTicketCallSawMilestone = false;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        if (nextTicketCalls === 1) {
          firstTicketCallSawMilestone = milestones.length === 1;
          return fixture.tickets[0] ?? null;
        }
        return null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runSpecsEventHandlers: {
          onTriageMilestone: async (event) => {
            milestones.push(event);
          },
        } satisfies RunSpecsEventHandlers,
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.equal(milestones.length, 1);
    assert.equal(milestones[0]?.spec.fileName, specFileName);
    assert.equal(milestones[0]?.outcome, "success");
    assert.equal(milestones[0]?.finalStage, "spec-close-and-version");
    assert.match(milestones[0]?.nextAction ?? "", /iniciando rodada \/run-all/u);
    assert.equal(milestones[0]?.timing.interruptedStage, null);
    assert.deepEqual(
      milestones[0]?.timing.completedStages,
      [
        "spec-triage",
        "spec-ticket-validation",
        "spec-ticket-derivation-retrospective",
        "spec-close-and-version",
      ],
    );
    assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-triage"], "number");
    assert.equal(
      typeof milestones[0]?.timing.durationsByStageMs["spec-ticket-validation"],
      "number",
    );
    assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-close-and-version"], "number");
    assert.equal(firstTicketCallSawMilestone, true);
    const runAllSummary = flowSummaries.find((event) => event.flow === "run-all");
    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runAllSummary);
    assert.ok(runSpecsSummary);
    if (runAllSummary?.flow === "run-all") {
      assert.equal(runAllSummary.outcome, "success");
      assert.equal(runAllSummary.completionReason, "queue-empty");
      assert.deepEqual(
        runAllSummary.codexPreferences,
        createFlowCodexPreferencesSnapshot({
          reasoningEffort: "high",
          speed: "fast",
        }),
      );
      assert.equal(runAllSummary.timing.interruptedStage, null);
      assert.equal(typeof runAllSummary.timing.durationsByStageMs.plan, "number");
    } else {
      assert.fail("resumo /run-all deveria existir no fluxo encadeado");
    }
    if (runSpecsSummary?.flow === "run-specs") {
      assert.equal(runSpecsSummary.outcome, "success");
      assert.equal(runSpecsSummary.completionReason, "completed");
      assert.equal(runSpecsSummary.finalStage, "spec-audit");
      assert.deepEqual(
        runSpecsSummary.codexPreferences,
        createFlowCodexPreferencesSnapshot({
          reasoningEffort: "high",
          speed: "fast",
        }),
      );
      assert.equal(runSpecsSummary.timing.interruptedStage, null);
      assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-triage"], "number");
      assert.equal(
        typeof runSpecsSummary.timing.durationsByStageMs["spec-ticket-validation"],
        "number",
      );
      assert.equal(
        typeof runSpecsSummary.timing.durationsByStageMs["spec-close-and-version"],
        "number",
      );
      assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["run-all"], "number");
      assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-audit"], "number");
      assert.equal(runSpecsSummary.specTicketValidation?.verdict, "GO");
      assert.equal(runSpecsSummary.runAllSummary?.outcome, "success");
      assert.equal(runSpecsSummary.runAllSummary?.completionReason, "queue-empty");
      assert.deepEqual(
        runSpecsSummary.runAllSummary?.codexPreferences,
        createFlowCodexPreferencesSnapshot({
          reasoningEffort: "high",
          speed: "fast",
        }),
      );
    } else {
      assert.fail("resumo /run_specs deveria existir");
    }
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs marca falha especifica quando spec-audit falha apos run-all", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient((stage) => stage === "spec-audit");
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.deepEqual(
      codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
      [
        `spec:${specFileName}:spec-triage`,
        `spec:${specFileName}:spec-close-and-version`,
        `ticket:${fixture.tickets[0]?.name}:plan`,
        `ticket:${fixture.tickets[0]?.name}:implement`,
        `ticket:${fixture.tickets[0]?.name}:close-and-version`,
        `spec:${specFileName}:spec-audit`,
      ],
    );
    assert.equal(runner.getState().phase, "error");
    assert.equal(runner.getState().currentSpec, null);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow === "run-specs") {
      assert.equal(runSpecsSummary.outcome, "failure");
      assert.equal(runSpecsSummary.finalStage, "spec-audit");
      assert.equal(runSpecsSummary.completionReason, "spec-audit-failure");
      assert.equal(runSpecsSummary.specTicketValidation?.verdict, "GO");
      assert.equal(runSpecsSummary.runAllSummary?.outcome, "success");
      assert.equal(runSpecsSummary.timing.interruptedStage, "spec-audit");
      assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-audit"], "number");
    } else {
      assert.fail("resumo /run_specs deveria existir");
    }
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs falha com blocker explicito quando spec-audit nao expõe sinal de gaps residuais", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    codex.stageOutputs["spec-audit"] = "Auditoria concluida sem bloco parseavel.";
    const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        runFlowEventHandlers,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
    assert.ok(runSpecsSummary);
    if (runSpecsSummary?.flow !== "run-specs") {
      assert.fail("resumo /run_specs deveria existir");
    }

    assert.equal(runSpecsSummary.outcome, "failure");
    assert.equal(runSpecsSummary.finalStage, "spec-audit");
    assert.equal(runSpecsSummary.completionReason, "spec-audit-failure");
    assert.match(runSpecsSummary.details ?? "", /\[\[SPEC_AUDIT_RESULT\]\]/u);
    assert.equal(runSpecsSummary.timing.interruptedStage, "spec-audit");
    assert.equal(runner.getState().phase, "error");
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("runner persiste trilhas do fluxo principal para tickets e specs", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const codex = new StubCodexClient();
    const gitVersioning = new StubGitVersioning();
    const { workflowTraceStoreFactory, records } = createWorkflowTraceCollector();
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning,
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        workflowTraceStoreFactory,
      },
    });

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    assert.deepEqual(
      records.map(
        (entry) =>
          `${entry.request.sourceCommand}:${entry.request.kind}:${entry.request.stage}:${entry.request.decision.status}`,
      ),
      [
        "run-specs:spec:spec-triage:success",
        "run-specs:spec:spec-ticket-validation:success",
        "run-specs:spec:spec-ticket-derivation-retrospective:success",
        "run-specs:spec:spec-close-and-version:success",
        "run-specs:ticket:plan:success",
        "run-specs:ticket:implement:success",
        "run-specs:ticket:close-and-version:success",
        "run-specs:spec:spec-audit:success",
      ],
    );
    assert.equal(records.every((entry) => entry.projectPath === fixture.activeProject.path), true);
    assert.equal(records[1]?.request.decision.metadata?.verdict, "GO");
    assert.equal(records[1]?.request.decision.metadata?.cyclesExecuted, 0);
    assert.equal(
      records[2]?.request.decision.metadata?.decision,
      "skipped-no-reviewed-gaps",
    );
    assert.equal(records[4]?.request.targetName, fixture.tickets[0]?.name);
    assert.equal(records[4]?.request.decision.metadata?.execPlanPath, "execplans/2026-02-19-flow-a.md");
    assert.equal(records[6]?.request.decision.metadata?.commitHash, "abc123");
    assert.equal(records[6]?.request.decision.metadata?.pushUpstream, "origin/main");
    assert.equal(records[7]?.request.decision.metadata?.residualGapsDetected, false);
    assert.equal(records[7]?.request.decision.metadata?.followUpTicketsCreated, 0);
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("requestRunSpecs expoe fase e currentSpec durante triagem e transita para fase de ticket", async () => {
  const fixture = await setupRunSpecsFixture([ticketA.name]);
  try {
    const logger = new SpyLogger();
    const stageSnapshots: Array<{
      stage: TicketFlowStage | SpecFlowStage;
      phase: string;
      currentSpec: string | null;
      currentTicket: string | null;
    }> = [];
    let runner: TicketRunner | null = null;
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      (stage) => {
        if (!runner) {
          return;
        }
        const state = runner.getState();
        stageSnapshots.push({
          stage,
          phase: state.phase,
          currentSpec: state.currentSpec,
          currentTicket: state.currentTicket,
        });
      },
    );
    let nextTicketCalls = 0;
    const queue: TicketQueue = {
      ensureStructure: async () => undefined,
      nextOpenTicket: async () => {
        nextTicketCalls += 1;
        return nextTicketCalls === 1 ? (fixture.tickets[0] ?? null) : null;
      },
      closeTicket: async () => undefined,
    };

    const roundDependencies = createRoundDependencies({
      activeProject: fixture.activeProject,
      queue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    runner = createRunner(logger, roundDependencies);

    const request = await runner.requestRunSpecs(specFileName);
    assert.deepEqual(request, { status: "started" });
    await waitForRunnerToStop(runner);

    const specSnapshot = stageSnapshots.find((value) => value.stage === "spec-triage");
    const ticketSnapshot = stageSnapshots.find((value) => value.stage === "plan");
    assert.equal(specSnapshot?.phase, "spec-triage");
    assert.equal(specSnapshot?.currentSpec, specFileName);
    assert.equal(specSnapshot?.currentTicket, null);
    assert.equal(codex.specTicketValidationSessionStartCalls, 1);
    assert.equal(ticketSnapshot?.phase, "plan");
    assert.equal(ticketSnapshot?.currentSpec, null);
    assert.equal(ticketSnapshot?.currentTicket, fixture.tickets[0]?.name ?? null);
  } finally {
    await cleanupTempProjectRoot(fixture.projectRoot);
  }
});

test("runner falha quando etapa plan nao retorna execPlanPath obrigatorio", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(undefined, false);
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, false);
  assert.deepEqual(
    codex.calls.map((value) => value.stage),
    ["plan"],
  );
  assert.equal(gitVersioning.syncChecks, 0);
  assert.equal(summaries[0]?.status, "failure");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  if (summaries[0]?.status === "failure") {
    assert.match(summaries[0].errorMessage, /nao retornou caminho de ExecPlan/u);
  } else {
    assert.fail("resumo deveria ser falha");
  }
});

test("runner preserva ultimo evento entregue e registra falha definitiva quando envio do resumo falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector({ failSend: true });
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);

  assert.equal(succeeded, true);
  assert.equal(summaries.length, 1);
  assert.equal(runner.getState().lastNotifiedEvent, null);
  assert.equal(runner.getState().lastNotificationFailure?.summary.ticket, ticketA.name);
  assert.equal(runner.getState().lastNotificationFailure?.failure.errorClass, "non-retryable");
  assert.equal(runner.getState().lastNotificationFailure?.failure.attempts, 1);
  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0]?.message, "Falha ao emitir resumo final de ticket");
});

test("runner registra metadados de tentativa quando integracao reporta falha definitiva estruturada", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector({
    failSendWithDispatchError: true,
  });
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const succeeded = await callProcessTicket(runner, ticketA);
  const state = runner.getState();

  assert.equal(succeeded, true);
  assert.equal(summaries.length, 1);
  assert.equal(state.lastNotifiedEvent, null);
  assert.equal(state.lastNotificationFailure?.summary.ticket, ticketA.name);
  assert.equal(state.lastNotificationFailure?.failure.destinationChatId, "42");
  assert.equal(state.lastNotificationFailure?.failure.attempts, 4);
  assert.equal(state.lastNotificationFailure?.failure.maxAttempts, 4);
  assert.equal(state.lastNotificationFailure?.failure.errorClass, "telegram-server");
  assert.equal(state.lastNotificationFailure?.failure.errorCode, "503");
  assert.equal(state.lastNotificationFailure?.failure.retryable, true);
});

test("runner mantém ultimo evento entregue ao registrar nova falha definitiva de notificacao", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning();
  let callbackCalls = 0;
  const onTicketFinalized = (summary: TicketFinalSummary): TicketNotificationDelivery => {
    callbackCalls += 1;
    if (callbackCalls === 1) {
      return {
        channel: "telegram",
        destinationChatId: "42",
        deliveredAtUtc: "2026-02-19T15:05:00.000Z",
        attempts: 1,
        maxAttempts: 4,
      };
    }

    throw new TicketNotificationDispatchError(
      "falha definitiva simulada no segundo envio",
      {
        channel: "telegram",
        destinationChatId: "42",
        failedAtUtc: "2026-02-19T15:06:00.000Z",
        attempts: 4,
        maxAttempts: 4,
        errorMessage: "Service Unavailable",
        errorCode: "503",
        errorClass: "telegram-server",
        retryable: true,
      },
    );
  };
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning,
  });
  const runner = createRunner(logger, roundDependencies, { onTicketFinalized });

  const firstSucceeded = await callProcessTicket(runner, ticketA);
  const secondSucceeded = await callProcessTicket(runner, ticketB);
  const state = runner.getState();

  assert.equal(firstSucceeded, true);
  assert.equal(secondSucceeded, true);
  assert.equal(callbackCalls, 2);
  assert.equal(state.lastNotifiedEvent?.summary.ticket, ticketA.name);
  assert.equal(state.lastNotificationFailure?.summary.ticket, ticketB.name);
});

test("startDiscoverSpecSession inicia sessao unica global com snapshot de projeto", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const firstStart = await runner.startDiscoverSpecSession("42");
  const secondStart = await runner.startDiscoverSpecSession("42");

  assert.equal(firstStart.status, "started");
  assert.equal(secondStart.status, "already-active");
  assert.equal(codex.discoverSessionStartCalls, 1);
  assert.equal(codex.authChecks, 1);

  const state = runner.getState();
  assert.equal(state.phase, "discover-spec-awaiting-brief");
  assert.equal(state.discoverSpecSession?.chatId, "42");
  assert.equal(state.discoverSpecSession?.phase, "awaiting-brief");
  assert.equal(state.discoverSpecSession?.activeProjectSnapshot.name, activeProjectA.name);
  assert.equal(state.discoverSpecSession?.activeProjectSnapshot.path, activeProjectA.path);
});

test("sessao /discover_spec bloqueia /plan_spec e /codex_chat concorrentes", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startDiscoverSpecSession("42");

  const planSpecResult = await runner.startPlanSpecSession("42");
  const codexChatResult = await runner.startCodexChatSession("42");

  assert.equal(planSpecResult.status, "blocked");
  if (planSpecResult.status === "blocked") {
    assert.equal(planSpecResult.reason, "global-free-text-busy");
    assert.match(planSpecResult.message, /sessao global de texto livre ativa em \/discover_spec/u);
  }

  assert.equal(codexChatResult.status, "blocked");
  if (codexChatResult.status === "blocked") {
    assert.equal(codexChatResult.reason, "global-free-text-busy");
    assert.match(codexChatResult.message, /sessao global de texto livre ativa em \/discover_spec/u);
  }
});

test("submitDiscoverSpecInput encaminha brief, repassa saida textual e volta para waiting-user", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const outputs: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      discoverSpecEventHandlers: {
        onOutput: (_chatId, event) => {
          outputs.push(event.text);
        },
        onFailure: () => undefined,
      },
    },
  });
  await runner.startDiscoverSpecSession("42");

  const inputResult = await runner.submitDiscoverSpecInput("42", "Brief inicial da descoberta");
  assert.equal(inputResult.status, "accepted");
  assert.deepEqual(codex.lastDiscoverSession?.sentInputs, ["Brief inicial da descoberta"]);

  codex.lastDiscoverSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 42,
      preview: "seguindo entrevista",
    },
  });
  codex.lastDiscoverSession?.emitEvent({
    type: "turn-context",
    model: "gpt-5.4",
    reasoningEffort: "high",
  });
  codex.lastDiscoverSession?.emitRawOutput("Pergunta livre do discover");
  codex.lastDiscoverSession?.emitEvent({ type: "turn-complete" });
  await sleep(0);

  const state = runner.getState();
  assert.equal(state.phase, "discover-spec-waiting-user");
  assert.equal(state.discoverSpecSession?.phase, "waiting-user");
  assert.equal(state.discoverSpecSession?.lastCodexStream, "stdout");
  assert.equal(state.discoverSpecSession?.lastCodexPreview, "seguindo entrevista");
  assert.equal(state.discoverSpecSession?.observedModel, "gpt-5.4");
  assert.equal(state.discoverSpecSession?.observedReasoningEffort, "high");
  assert.deepEqual(outputs, ["Pergunta livre do discover"]);
});

test("requestRunAll, requestRunSpecs, requestRunSelectedTicket e syncActiveProject ficam bloqueados durante /discover_spec", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startDiscoverSpecSession("42");

  const runAllResult = await runner.requestRunAll();
  const runSpecsResult = await runner.requestRunSpecs(specFileName);
  const runTicketResult = await runner.requestRunSelectedTicket(ticketA.name);
  const syncResult = runner.syncActiveProject(activeProjectB);

  assert.equal(runAllResult.status, "blocked");
  assert.equal(runAllResult.reason, "project-slot-busy");
  assert.equal(runSpecsResult.status, "blocked");
  assert.equal(runSpecsResult.reason, "project-slot-busy");
  assert.equal(runTicketResult.status, "blocked");
  assert.equal(runTicketResult.reason, "project-slot-busy");
  assert.deepEqual(syncResult, { status: "blocked-discover-spec" });
});

test("sessao /discover_spec expira por inatividade e notifica timeout", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const lifecycleMessages: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      discoverSpecSessionTimeoutMs: 20,
      discoverSpecEventHandlers: {
        onOutput: () => undefined,
        onFailure: () => undefined,
        onLifecycleMessage: (_chatId, message) => {
          lifecycleMessages.push(message);
        },
      },
    },
  });

  const startResult = await runner.startDiscoverSpecSession("42");
  assert.equal(startResult.status, "started");
  await waitForDiscoverSpecSessionToClose(runner, 1000);
  await sleep(0);

  assert.equal(runner.getState().discoverSpecSession, null);
  assert.equal(runner.getState().phase, "idle");
  assert.equal(lifecycleMessages.length, 1);
  assert.match(lifecycleMessages[0] ?? "", /inatividade de 30 minutos/u);
});

test("falha da sessao /discover_spec encerra estado e preserva hint de retry acionavel", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const failures: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      discoverSpecEventHandlers: {
        onOutput: () => undefined,
        onFailure: (_chatId, details) => {
          failures.push(details);
        },
      },
    },
  });
  await runner.startDiscoverSpecSession("42");

  codex.lastDiscoverSession?.fail("timeout no codex");
  await waitForDiscoverSpecSessionToClose(runner, 1000);
  await sleep(0);

  assert.equal(runner.getState().discoverSpecSession, null);
  assert.equal(runner.getState().phase, "error");
  assert.equal(failures.length, 1);
  assert.match(failures[0] ?? "", /Use \/discover_spec para tentar novamente/u);
});

test("bloco final parcial de /discover_spec gera follow-up automatico e snapshot tipado (CA-05, CA-07, CA-14)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const lifecycleMessages: string[] = [];
  const finals: PlanSpecFinalBlock[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      discoverSpecEventHandlers: {
        onFinal: (_chatId, event) => {
          finals.push(event.final);
        },
        onOutput: () => undefined,
        onFailure: () => undefined,
        onLifecycleMessage: (_chatId, message) => {
          lifecycleMessages.push(message);
        },
      },
    },
  });

  await runner.startDiscoverSpecSession("42");
  await runner.submitDiscoverSpecInput("42", "Brief inicial ainda vago");

  codex.lastDiscoverSession?.emitEvent({
    type: "final",
    final: createDiscoverSpecFinalBlock({
      categoryCoverage: [
        {
          categoryId: "objective-value",
          label: "Objetivo e valor esperado",
          status: "covered",
          detail: "Objetivo consolidado.",
        },
        {
          categoryId: "decisions-tradeoffs",
          label: "Decisoes e trade-offs",
          status: "pending",
          detail: "Falta decidir entre follow-up automatico ou bloqueio manual.",
        },
      ],
      assumptionsAndDefaults: [],
      decisionsAndTradeOffs: [],
      criticalAmbiguities: [
        "Definir se o gate final bloqueia totalmente `Criar spec` antes do ticket irmao.",
      ],
    }),
  });
  await sleep(0);

  const state = runner.getState();
  assert.equal(state.phase, "discover-spec-waiting-codex");
  assert.equal(state.discoverSpecSession?.phase, "waiting-codex");
  assert.equal(state.discoverSpecSession?.createSpecEligible, false);
  assert.equal(state.discoverSpecSession?.pendingItems.length, 9);
  assert.match(
    state.discoverSpecSession?.createSpecBlockReason ?? "",
    /lacunas criticas/u,
  );
  assert.deepEqual(finals, []);
  assert.equal(codex.lastDiscoverSession?.sentInputs.length, 2);
  assert.match(codex.lastDiscoverSession?.sentInputs[1] ?? "", /Pendencias atuais:/u);
  assert.match(codex.lastDiscoverSession?.sentInputs[1] ?? "", /Decisoes e trade-offs/u);
  assert.equal(lifecycleMessages.length, 1);
  assert.match(lifecycleMessages[0] ?? "", /lacunas criticas/u);
});

test("acao Refinar de /discover_spec retoma a entrevista sem materializar artefatos (CA-08)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      discoverSpecEventHandlers: {
        onFinal: () => undefined,
        onOutput: () => undefined,
        onFailure: () => undefined,
      },
    },
  });

  await runner.startDiscoverSpecSession("42");
  codex.lastDiscoverSession?.emitEvent({
    type: "final",
    final: createDiscoverSpecFinalBlock(),
  });
  await sleep(0);

  const outcome = await runner.handleDiscoverSpecFinalActionSelection("42", "refine");
  assert.deepEqual(outcome, { status: "accepted" });
  assert.equal(runner.getState().discoverSpecSession?.phase, "waiting-codex");
  assert.equal(codex.lastDiscoverSession?.cancelCalls, 0);
  assert.equal(codex.calls.some((call) => call.stage === "plan-spec-materialize"), false);
  assert.equal(codex.calls.some((call) => call.stage === "plan-spec-version-and-push"), false);
  assert.match(
    codex.lastDiscoverSession?.sentInputs[codex.lastDiscoverSession.sentInputs.length - 1] ?? "",
    /Revise o ultimo bloco final/u,
  );
});

test("acao Criar spec de /discover_spec reutiliza pipeline compartilhada e persiste origem/enriquecimento (CA-10, CA-11, CA-12, CA-13, CA-20)", async () => {
  const projectRoot = await createTempProjectRoot();

  try {
    const logger = new SpyLogger();
    const activeProject: ProjectRef = {
      name: "discover-spec-project",
      path: projectRoot,
    };
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage, spec) => {
        if (stage !== "plan-spec-materialize") {
          return;
        }

        const absoluteSpecPath = path.join(projectRoot, ...spec.path.split("/"));
        await fs.mkdir(path.dirname(absoluteSpecPath), { recursive: true });
        await fs.writeFile(
          absoluteSpecPath,
          createSpecFileContent(
            spec.plannedTitle ?? "",
            spec.plannedSummary ?? "",
            spec.plannedOutline,
            {
              assumptionsAndDefaults: spec.assumptionsAndDefaults,
              decisionsAndTradeOffs: spec.decisionsAndTradeOffs,
            },
          ),
          "utf8",
        );
      },
    );
    const roundDependencies = createRoundDependencies({
      activeProject,
      queue: defaultQueue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const lifecycleMessages: string[] = [];
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        now: () => new Date("2026-02-19T22:04:00.000Z"),
        discoverSpecEventHandlers: {
          onFinal: () => undefined,
          onOutput: () => undefined,
          onFailure: () => undefined,
          onLifecycleMessage: (_chatId, message) => {
            lifecycleMessages.push(message);
          },
        },
      },
    });

    await runner.startDiscoverSpecSession("42");
    codex.lastDiscoverSession?.emitEvent({
      type: "final",
      final: createDiscoverSpecFinalBlock(),
    });
    await sleep(0);

    const outcome = await runner.handleDiscoverSpecFinalActionSelection("42", "create-spec");
    assert.deepEqual(outcome, { status: "accepted" });

    const expectedFileName = "2026-02-19-bridge-interativa-do-codex.md";
    const expectedSpecPath = path.join(projectRoot, "docs", "specs", expectedFileName);
    const specContent = await fs.readFile(expectedSpecPath, "utf8");
    assert.match(specContent, /^\s*-\s*Status\s*:\s*approved\s*$/imu);
    assert.match(specContent, /^\s*-\s*Spec treatment\s*:\s*pending\s*$/imu);
    assert.match(specContent, /^## Assumptions and defaults$/imu);
    assert.match(specContent, /Assumir monorepo Node\.js 20\+\./u);
    assert.match(specContent, /^## Decisoes e trade-offs$/imu);
    assert.match(specContent, /Reutilizar callbacks existentes em vez de criar um novo protocolo\./u);

    const materializeCall = codex.calls.find((value) => value.stage === "plan-spec-materialize");
    const versionCall = codex.calls.find((value) => value.stage === "plan-spec-version-and-push");
    assert.ok(materializeCall);
    assert.ok(versionCall);
    assert.equal(materializeCall?.spec?.sourceCommand, "/discover_spec");
    assert.equal(materializeCall?.spec?.assumptionsAndDefaults?.length, 1);
    assert.equal(materializeCall?.spec?.decisionsAndTradeOffs?.length, 1);
    assert.equal(versionCall?.spec?.sourceCommand, "/discover_spec");
    assert.match(versionCall?.spec?.tracePaths?.requestPath ?? "", /^spec_planning\/requests\//u);
    assert.match(versionCall?.spec?.tracePaths?.responsePath ?? "", /^spec_planning\/responses\//u);
    assert.match(versionCall?.spec?.tracePaths?.decisionPath ?? "", /^spec_planning\/decisions\//u);

    const requestPath = path.join(projectRoot, versionCall?.spec?.tracePaths?.requestPath ?? "");
    const responsePath = path.join(projectRoot, versionCall?.spec?.tracePaths?.responsePath ?? "");
    const decisionPath = path.join(projectRoot, versionCall?.spec?.tracePaths?.decisionPath ?? "");
    await fs.access(requestPath);
    await fs.access(responsePath);
    await fs.access(decisionPath);

    const requestContent = await fs.readFile(requestPath, "utf8");
    const responseContent = await fs.readFile(responsePath, "utf8");
    const decisionRaw = await fs.readFile(decisionPath, "utf8");
    assert.match(requestContent, /Source command: \/discover_spec/u);
    assert.match(requestContent, /### Assumptions and defaults/u);
    assert.match(requestContent, /Assumir monorepo Node\.js 20\+\./u);
    assert.match(requestContent, /### Decisions and trade-offs/u);
    assert.match(responseContent, /Source command: \/discover_spec/u);
    assert.match(responseContent, /## Final block snapshot/u);
    assert.match(responseContent, /Reutilizar callbacks existentes/u);
    const decision = JSON.parse(decisionRaw) as {
      sourceCommand: string;
      assumptionsAndDefaults: string[];
      decisionsAndTradeOffs: string[];
    };
    assert.equal(decision.sourceCommand, "/discover_spec");
    assert.equal(decision.assumptionsAndDefaults[0], "Assumir monorepo Node.js 20+.");
    assert.match(decision.decisionsAndTradeOffs[0] ?? "", /Reutilizar callbacks existentes/u);

    const responseFiles = await fs.readdir(path.join(projectRoot, "spec_planning", "responses"));
    assert.equal(responseFiles.length >= 2, true);
    assert.equal(runner.getState().discoverSpecSession, null);
    assert.equal(runner.getState().phase, "idle");
    assert.equal(codex.lastDiscoverSession?.cancelCalls, 1);
    assert.equal(lifecycleMessages.some((value) => /Spec criada e versionada com sucesso/u.test(value)), true);
  } finally {
    await cleanupTempProjectRoot(projectRoot);
  }
});

test("startPlanSpecSession inicia sessao unica global com snapshot de projeto", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const firstStart = await runner.startPlanSpecSession("42");
  const secondStart = await runner.startPlanSpecSession("42");

  assert.equal(firstStart.status, "started");
  assert.equal(secondStart.status, "already-active");
  assert.equal(codex.planSessionStartCalls, 1);
  assert.equal(codex.authChecks, 1);

  const state = runner.getState();
  assert.equal(state.phase, "plan-spec-awaiting-brief");
  assert.equal(state.planSpecSession?.chatId, "42");
  assert.equal(state.planSpecSession?.phase, "awaiting-brief");
  assert.equal(state.planSpecSession?.activeProjectSnapshot.name, activeProjectA.name);
  assert.equal(state.planSpecSession?.activeProjectSnapshot.path, activeProjectA.path);
});

test("startPlanSpecSession bloqueia inicio quando /codex_chat estiver ativo (CA-04)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startCodexChatSession("42");

  const result = await runner.startPlanSpecSession("42");

  assert.equal(result.status, "blocked");
  if (result.status === "blocked") {
    assert.equal(result.reason, "global-free-text-busy");
    assert.match(result.message, /sessao global de texto livre ativa em \/codex_chat/u);
  }
  assert.equal(codex.planSessionStartCalls, 0);
});

test("startPlanSpecSession bloqueia inicio durante rodada em andamento", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(undefined, true, false, 20);
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const runAllPromise = runner.requestRunAll();
  const startResult = await runner.startPlanSpecSession("42");
  const runAllResult = await runAllPromise;
  await waitForRunnerToStop(runner);

  assert.equal(startResult.status, "blocked");
  if (startResult.status === "blocked") {
    assert.equal(startResult.reason, "project-slot-busy");
  }
  assert.match(startResult.message, /slot do projeto alpha-project/i);
  assert.deepEqual(runAllResult, { status: "started" });
  assert.equal(codex.planSessionStartCalls, 0);
});

test("startPlanSpecSession retorna falha acionavel quando sessao interativa nao inicia", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(undefined, true, false, 0, undefined, true);
  const failures: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      planSpecEventHandlers: {
        onQuestion: () => undefined,
        onFinal: () => undefined,
        onRawOutput: () => undefined,
        onFailure: (_chatId, details) => {
          failures.push(details);
        },
      },
    },
  });

  const result = await runner.startPlanSpecSession("42");

  assert.equal(result.status, "failed");
  assert.match(result.message, /falha simulada/u);
  assert.equal(runner.getState().planSpecSession, null);
  assert.equal(runner.getState().phase, "error");
  assert.equal(failures.length, 1);
  assert.match(failures[0] ?? "", /falha simulada/u);
});

test("submitPlanSpecInput encaminha brief inicial e transita para espera do Codex", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const inputResult = await runner.submitPlanSpecInput("42", "Brief inicial da spec");
  codex.lastPlanSession?.emitQuestion({
    prompt: "Qual modulo?",
    options: [{ value: "api", label: "API" }],
  });
  await sleep(0);

  assert.equal(inputResult.status, "accepted");
  assert.deepEqual(codex.lastPlanSession?.sentInputs, ["Brief inicial da spec"]);

  const state = runner.getState();
  assert.equal(state.phase, "plan-spec-waiting-user");
  assert.equal(state.planSpecSession?.phase, "waiting-user");
});

test("sessao /plan_spec registra atividade observada do Codex para diagnostico", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const inputResult = await runner.submitPlanSpecInput("42", "Brief inicial da spec");
  assert.equal(inputResult.status, "accepted");
  codex.lastPlanSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 42,
      preview: "processando plano",
    },
  });
  await sleep(0);

  const state = runner.getState();
  assert.equal(state.planSpecSession?.phase, "waiting-codex");
  assert.match(state.planSpecSession?.waitingCodexSinceAt?.toISOString() ?? "", /^\d{4}-\d{2}-\d{2}T/u);
  assert.equal(state.planSpecSession?.lastCodexStream, "stdout");
  assert.equal(state.planSpecSession?.lastCodexPreview, "processando plano");
  assert.match(state.planSpecSession?.lastCodexActivityAt?.toISOString() ?? "", /^\d{4}-\d{2}-\d{2}T/u);
});

test("saida raw em bootstrap de /plan_spec e suprimida enquanto aguarda brief inicial", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const rawOutputs: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      planSpecEventHandlers: {
        onQuestion: () => undefined,
        onFinal: () => undefined,
        onRawOutput: (_chatId, event) => {
          rawOutputs.push(event.text);
        },
        onFailure: () => undefined,
      },
    },
  });

  await runner.startPlanSpecSession("42");
  codex.lastPlanSession?.emitRawOutput("OpenAI Codex bootstrap");
  await sleep(0);

  assert.deepEqual(rawOutputs, []);
  assert.equal(runner.getState().planSpecSession?.phase, "awaiting-brief");
});

test("saida raw em waiting-codex e limitada para evitar flood", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const rawOutputs: string[] = [];
  let nowMs = Date.parse("2026-02-20T20:56:50.000Z");
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      now: () => new Date(nowMs),
      planSpecEventHandlers: {
        onQuestion: () => undefined,
        onFinal: () => undefined,
        onRawOutput: (_chatId, event) => {
          rawOutputs.push(event.text);
        },
        onFailure: () => undefined,
      },
    },
  });

  await runner.startPlanSpecSession("42");
  const inputResult = await runner.submitPlanSpecInput("42", "brief inicial");
  assert.equal(inputResult.status, "accepted");

  codex.lastPlanSession?.emitRawOutput("chunk 1");
  codex.lastPlanSession?.emitRawOutput("chunk 2");
  codex.lastPlanSession?.emitRawOutput("chunk 3");
  await sleep(0);
  assert.equal(rawOutputs.length, 1);
  assert.deepEqual(rawOutputs, ["chunk 1"]);

  nowMs += 2500;
  codex.lastPlanSession?.emitRawOutput("chunk 4");
  await sleep(0);
  assert.equal(rawOutputs.length, 2);
  assert.deepEqual(rawOutputs, ["chunk 1", "chunk 4"]);
});

test("submitPlanSpecInput diferencia chat incorreto e sessao inativa", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const wrongChatResult = await runner.submitPlanSpecInput("99", "mensagem fora do chat da sessao");
  const cancelResult = await runner.cancelPlanSpecSession("42");
  const inactiveResult = await runner.submitPlanSpecInput("42", "mensagem apos cancelamento");

  assert.equal(wrongChatResult.status, "ignored-chat");
  assert.match(wrongChatResult.message, /outro chat/u);
  assert.equal(cancelResult.status, "cancelled");
  assert.equal(inactiveResult.status, "inactive");
  assert.match(inactiveResult.message, /Nenhuma sessão \/plan_spec ativa/u);
});

test("callbacks de /plan_spec retornam motivo tipado para bloqueios funcionais", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const wrongChatOutcome = await runner.handlePlanSpecQuestionOptionSelection("99", "api");
  assert.equal(wrongChatOutcome.status, "ignored");
  if (wrongChatOutcome.status === "ignored") {
    assert.equal(wrongChatOutcome.reason, "inactive-session");
    assert.match(wrongChatOutcome.message, /outro chat/u);
  }

  const invalidActionOutcome = await runner.handlePlanSpecFinalActionSelection("42", "create-spec");
  assert.equal(invalidActionOutcome.status, "ignored");
  if (invalidActionOutcome.status === "ignored") {
    assert.equal(invalidActionOutcome.reason, "invalid-action");
    assert.match(invalidActionOutcome.message, /so pode ser executada apos o bloco final/u);
  }

  const cancelOutcome = await runner.cancelPlanSpecSession("42");
  assert.equal(cancelOutcome.status, "cancelled");

  const inactiveOutcome = await runner.handlePlanSpecFinalActionSelection("42", "refine");
  assert.equal(inactiveOutcome.status, "ignored");
  if (inactiveOutcome.status === "ignored") {
    assert.equal(inactiveOutcome.reason, "inactive-session");
    assert.match(inactiveOutcome.message, /Nenhuma sessão \/plan_spec ativa/u);
  }
});

test("submitPlanSpecInput retorna ack imediato e encerra sessao com erro quando envio para o Codex falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const failures: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      planSpecEventHandlers: {
        onQuestion: () => undefined,
        onFinal: () => undefined,
        onRawOutput: () => undefined,
        onFailure: (_chatId, details) => {
          failures.push(details);
        },
      },
    },
  });
  await runner.startPlanSpecSession("42");
  const failingSession = codex.lastPlanSession as unknown as {
    sendUserInput: (input: string) => Promise<void>;
  };
  failingSession.sendUserInput = async () => {
    throw new Error("falha de escrita interativa");
  };

  const inputResult = await runner.submitPlanSpecInput("42", "brief inicial");
  await waitForPlanSpecSessionToClose(runner, 1000);
  await sleep(0);

  assert.equal(inputResult.status, "accepted");
  assert.match(inputResult.message, /Brief inicial enviado para o Codex/u);
  assert.equal(runner.getState().planSpecSession, null);
  assert.equal(runner.getState().phase, "error");
  assert.equal(failures.length, 1);
  assert.match(failures[0] ?? "", /falha de escrita interativa/u);
});

test("requestRunAll e requestRunSpecs ficam bloqueados durante sessao /plan_spec ativa", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const runAllResult = await runner.requestRunAll();
  const runSpecsResult = await runner.requestRunSpecs(specFileName);

  assert.equal(runAllResult.status, "blocked");
  assert.equal(runAllResult.reason, "project-slot-busy");
  assert.match(runAllResult.message, /slot do projeto alpha-project/u);
  assert.equal(runSpecsResult.status, "blocked");
  assert.equal(runSpecsResult.reason, "project-slot-busy");
  assert.match(runSpecsResult.message, /slot do projeto alpha-project/u);
  assert.equal(codex.calls.length, 0);
});

test("syncActiveProject bloqueia troca de projeto enquanto sessao /plan_spec estiver ativa", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const syncResult = runner.syncActiveProject(activeProjectB);

  assert.deepEqual(syncResult, { status: "blocked-plan-spec" });
  assert.equal(runner.getState().activeProject?.name, activeProjectA.name);
});

test("cancelPlanSpecSession encerra sessao ativa e limpa estado associado", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const cancelResult = await runner.cancelPlanSpecSession("42");
  const secondCancelResult = await runner.cancelPlanSpecSession("42");

  assert.equal(cancelResult.status, "cancelled");
  assert.equal(secondCancelResult.status, "inactive");
  assert.equal(codex.lastPlanSession?.cancelCalls, 1);
  assert.equal(runner.getState().planSpecSession, null);
  assert.equal(runner.getState().phase, "idle");
});

test("startCodexChatSession inicia sessao unica global com snapshot de projeto (CA-01, CA-09)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const firstStart = await runner.startCodexChatSession("42");
  const secondStart = await runner.startCodexChatSession("42");

  assert.equal(firstStart.status, "started");
  assert.equal(secondStart.status, "already-active");
  assert.equal(codex.freeChatSessionStartCalls, 1);
  assert.equal(codex.authChecks, 1);

  const state = runner.getState();
  assert.equal(state.phase, "codex-chat-waiting-user");
  assert.equal(state.codexChatSession?.chatId, "42");
  assert.equal(state.codexChatSession?.phase, "waiting-user");
  assert.equal(state.codexChatSession?.activeProjectSnapshot.name, activeProjectA.name);
  assert.equal(state.codexChatSession?.activeProjectSnapshot.path, activeProjectA.path);
  assert.equal(state.lastCodexChatSessionClosure, null);
  assert.equal(
    logger.infos.some((entry) => entry.message === "Lifecycle /codex_chat: session-started"),
    true,
  );
});

test("startCodexChatSession bloqueia inicio quando /plan_spec estiver ativo (CA-08)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startPlanSpecSession("42");

  const result = await runner.startCodexChatSession("42");

  assert.equal(result.status, "blocked");
  if (result.status === "blocked") {
    assert.equal(result.reason, "global-free-text-busy");
    assert.match(result.message, /sessao global de texto livre ativa em \/plan_spec/u);
  }
  assert.equal(codex.freeChatSessionStartCalls, 0);
});

test("submitCodexChatInput encaminha mensagem e retorna para espera do operador apos saida (CA-03)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const outputs: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      codexChatOutputFlushDelayMs: 1,
      codexChatEventHandlers: {
        onOutput: (_chatId, event) => {
          outputs.push(event.text);
        },
        onFailure: () => undefined,
      },
    },
  });
  await runner.startCodexChatSession("42");

  const inputResult = await runner.submitCodexChatInput("42", "Como melhorar este modulo?");
  codex.lastFreeChatSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 42,
      preview: "resposta parcial",
    },
  });
  codex.lastFreeChatSession?.emitRawOutput("Resposta final do Codex");
  codex.lastFreeChatSession?.emitEvent({
    type: "turn-complete",
  });
  await sleep(20);

  assert.equal(inputResult.status, "accepted");
  assert.deepEqual(codex.lastFreeChatSession?.sentInputs, ["Como melhorar este modulo?"]);
  assert.deepEqual(outputs, ["Resposta final do Codex"]);

  const state = runner.getState();
  assert.equal(state.phase, "codex-chat-waiting-user");
  assert.equal(state.codexChatSession?.phase, "waiting-user");
  assert.equal(state.codexChatSession?.lastCodexStream, "stdout");
  assert.equal(state.codexChatSession?.lastCodexPreview, "resposta parcial");
  assert.equal(
    logger.infos.some((entry) => entry.message === "Lifecycle /codex_chat: phase-transition"),
    true,
  );
  assert.equal(
    logger.infos.some((entry) => entry.message === "Lifecycle /codex_chat: output-forwarded"),
    true,
  );
});

test("submitCodexChatInput agrega chunks e encaminha uma unica resposta no /codex_chat", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const outputs: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      codexChatOutputFlushDelayMs: 5,
      codexChatEventHandlers: {
        onOutput: (_chatId, event) => {
          outputs.push(event.text);
        },
        onFailure: () => undefined,
      },
    },
  });
  await runner.startCodexChatSession("42");

  const inputResult = await runner.submitCodexChatInput("42", "Detalhe a mudanca");
  codex.lastFreeChatSession?.emitRawOutput("Primeira parte");
  codex.lastFreeChatSession?.emitRawOutput("Segunda parte");
  codex.lastFreeChatSession?.emitRawOutput("Terceira parte");
  codex.lastFreeChatSession?.emitEvent({
    type: "turn-complete",
  });
  await sleep(40);

  assert.equal(inputResult.status, "accepted");
  assert.equal(outputs.length, 1);
  assert.match(outputs[0] ?? "", /Primeira parte/u);
  assert.match(outputs[0] ?? "", /Segunda parte/u);
  assert.match(outputs[0] ?? "", /Terceira parte/u);
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-user");
  const forwardedLogs = logger.infos.filter(
    (entry) => entry.message === "Lifecycle /codex_chat: output-forwarded",
  );
  assert.equal(forwardedLogs.length, 1);
  assert.equal(forwardedLogs[0]?.context?.outputChunks, 3);
});

test("submitCodexChatInput aguarda sinal de turno concluido para encaminhar saida no /codex_chat", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const outputs: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      codexChatOutputFlushDelayMs: 5,
      codexChatEventHandlers: {
        onOutput: (_chatId, event) => {
          outputs.push(event.text);
        },
        onFailure: () => undefined,
      },
    },
  });
  await runner.startCodexChatSession("42");

  const inputResult = await runner.submitCodexChatInput("42", "Quais foram os ultimos commits?");
  codex.lastFreeChatSession?.emitEvent({
    type: "turn-complete",
  });
  await sleep(1);

  assert.equal(inputResult.status, "accepted");
  assert.equal(outputs.length, 0);
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-codex");

  codex.lastFreeChatSession?.emitRawOutput("• Vou verificar o historico Git local.");
  codex.lastFreeChatSession?.emitRawOutput("1. abc123 - resumo final");
  await sleep(20);

  assert.equal(outputs.length, 1);
  assert.match(outputs[0] ?? "", /historico Git/u);
  assert.match(outputs[0] ?? "", /abc123/u);
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-user");
});

test("sessao /codex_chat limita log de atividade do Codex e ignora preview vazio", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  let nowMs = Date.parse("2026-02-21T10:00:00.000Z");
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      now: () => new Date(nowMs),
    },
  });
  await runner.startCodexChatSession("42");

  codex.lastFreeChatSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 180,
      preview: "",
    },
  });

  codex.lastFreeChatSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 190,
      preview: "primeira saida util",
    },
  });

  nowMs += 1000;
  codex.lastFreeChatSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 222,
      preview: "segunda saida util",
    },
  });

  nowMs += 11_000;
  codex.lastFreeChatSession?.emitEvent({
    type: "activity",
    activity: {
      source: "stdout",
      bytes: 210,
      preview: "terceira saida util",
    },
  });

  await sleep(0);

  const activityLogs = logger.infos.filter(
    (entry) => entry.message === "Lifecycle /codex_chat: codex-activity",
  );
  assert.equal(activityLogs.length, 2);
  assert.equal(activityLogs[0]?.context?.preview, "primeira saida util");
  assert.equal(activityLogs[1]?.context?.preview, "terceira saida util");
  assert.equal(activityLogs[1]?.context?.suppressedEvents, 1);
  assert.equal(activityLogs[1]?.context?.suppressedBytes, 222);
  assert.equal(runner.getState().codexChatSession?.lastCodexPreview, "terceira saida util");
});

test("submitCodexChatInput diferencia chat incorreto e sessao inativa", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startCodexChatSession("42");

  const wrongChatResult = await runner.submitCodexChatInput("99", "mensagem fora do chat da sessao");
  const cancelResult = await runner.cancelCodexChatSession("42");
  const inactiveResult = await runner.submitCodexChatInput("42", "mensagem apos cancelamento");

  assert.equal(wrongChatResult.status, "ignored-chat");
  assert.match(wrongChatResult.message, /outro chat/u);
  assert.equal(cancelResult.status, "cancelled");
  assert.equal(inactiveResult.status, "inactive");
  assert.match(inactiveResult.message, /Nenhuma sessão \/codex_chat ativa/u);
  assert.equal(runner.getState().lastCodexChatSessionClosure?.reason, "manual");
  assert.equal(
    logger.infos.some((entry) => entry.message === "Lifecycle /codex_chat: session-finalized"),
    true,
  );
});

test("cancelCodexChatSession registra motivo de troca de comando quando sinalizado (CA-07)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);
  await runner.startCodexChatSession("42");

  const cancelResult = await runner.cancelCodexChatSession("42", {
    reason: "command-handoff",
    triggeringCommand: "run_all",
  });

  assert.equal(cancelResult.status, "cancelled");
  assert.equal(runner.getState().lastCodexChatSessionClosure?.reason, "command-handoff");
  assert.equal(runner.getState().lastCodexChatSessionClosure?.triggeringCommand, "run_all");
  assert.equal(
    logger.infos.some(
      (entry) =>
        entry.message === "Lifecycle /codex_chat: session-finalized" &&
        entry.context?.reason === "command-handoff",
    ),
    true,
  );
});

test("sessao /codex_chat nao expira por timeout enquanto estiver em waiting-codex", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const lifecycleMessages: Array<{ chatId: string; message: string }> = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      codexChatSessionTimeoutMs: 20,
      codexChatEventHandlers: {
        onOutput: async () => undefined,
        onFailure: async () => undefined,
        onLifecycleMessage: async (chatId, message) => {
          lifecycleMessages.push({ chatId, message });
        },
      },
    },
  });

  const startResult = await runner.startCodexChatSession("42");
  assert.equal(startResult.status, "started");

  const inputResult = await runner.submitCodexChatInput("42", "prompt longo");
  assert.equal(inputResult.status, "accepted");
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-codex");
  assert.equal(runner.getState().codexChatSession?.userInactivitySinceAt, null);

  await sleep(50);

  assert.equal(codex.lastFreeChatSession?.cancelCalls, 0);
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-codex");
  assert.equal(runner.getState().lastCodexChatSessionClosure, null);
  assert.equal(lifecycleMessages.length, 0);
  assert.equal(
    logger.warnings.some((entry) => entry.message === "Sessao /codex_chat expirada por inatividade"),
    false,
  );
});

test("sessao /codex_chat volta a expirar por inatividade apos retornar para waiting-user", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const outputs: string[] = [];
  const lifecycleMessages: Array<{ chatId: string; message: string }> = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      codexChatSessionTimeoutMs: 40,
      codexChatOutputFlushDelayMs: 1,
      codexChatEventHandlers: {
        onOutput: async (_chatId, event) => {
          outputs.push(event.text);
        },
        onFailure: async () => undefined,
        onLifecycleMessage: async (chatId, message) => {
          lifecycleMessages.push({ chatId, message });
        },
      },
    },
  });

  const startResult = await runner.startCodexChatSession("42");
  assert.equal(startResult.status, "started");
  assert.match(
    runner.getState().codexChatSession?.userInactivitySinceAt?.toISOString() ?? "",
    /^\d{4}-\d{2}-\d{2}T/u,
  );

  const inputResult = await runner.submitCodexChatInput("42", "responda com detalhes");
  assert.equal(inputResult.status, "accepted");
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-codex");
  assert.equal(runner.getState().codexChatSession?.userInactivitySinceAt, null);

  codex.lastFreeChatSession?.emitRawOutput("resposta final");
  codex.lastFreeChatSession?.emitEvent({
    type: "turn-complete",
  });
  await sleep(10);

  assert.deepEqual(outputs, ["resposta final"]);
  assert.equal(runner.getState().codexChatSession?.phase, "waiting-user");
  assert.match(
    runner.getState().codexChatSession?.userInactivitySinceAt?.toISOString() ?? "",
    /^\d{4}-\d{2}-\d{2}T/u,
  );

  await waitForCodexChatSessionToClose(runner, 1000);

  assert.equal(codex.lastFreeChatSession?.cancelCalls, 1);
  assert.equal(runner.getState().codexChatSession, null);
  assert.equal(runner.getState().lastCodexChatSessionClosure?.reason, "timeout");
  assert.equal(lifecycleMessages.length, 1);
  assert.equal(lifecycleMessages[0]?.chatId, "42");
});

test("sessao /codex_chat expira por timeout de inatividade e notifica operador (CA-06)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const lifecycleMessages: Array<{ chatId: string; message: string }> = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      codexChatSessionTimeoutMs: 20,
      codexChatEventHandlers: {
        onOutput: async () => undefined,
        onFailure: async () => undefined,
        onLifecycleMessage: async (chatId, message) => {
          lifecycleMessages.push({ chatId, message });
        },
      },
    },
  });

  const startResult = await runner.startCodexChatSession("42");
  assert.equal(startResult.status, "started");
  await waitForCodexChatSessionToClose(runner, 1000);

  assert.equal(codex.lastFreeChatSession?.cancelCalls, 1);
  assert.equal(runner.getState().codexChatSession, null);
  assert.equal(runner.getState().phase, "idle");
  assert.equal(runner.getState().lastCodexChatSessionClosure?.reason, "timeout");
  assert.equal(lifecycleMessages.length, 1);
  assert.equal(lifecycleMessages[0]?.chatId, "42");
  assert.match(lifecycleMessages[0]?.message ?? "", /inatividade de 10 minutos/u);
  assert.equal(
    logger.warnings.some((entry) => entry.message === "Sessao /codex_chat expirada por inatividade"),
    true,
  );
  assert.equal(
    logger.infos.some(
      (entry) =>
        entry.message === "Lifecycle /codex_chat: session-finalized" &&
        entry.context?.reason === "timeout",
    ),
    true,
  );
});

test("acao final Cancelar encerra sessao /plan_spec sem executar criacao de spec (CA-11)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  await runner.startPlanSpecSession("42");
  codex.lastPlanSession?.emitFinal(createPlanSpecFinalBlock());
  await sleep(0);

  const outcome = await runner.handlePlanSpecFinalActionSelection("42", "cancel");

  assert.deepEqual(outcome, { status: "accepted" });
  assert.equal(runner.getState().planSpecSession, null);
  assert.equal(runner.getState().phase, "idle");
  assert.equal(codex.lastPlanSession?.cancelCalls, 1);
  assert.equal(
    codex.calls.some(
      (value) =>
        value.stage === "plan-spec-materialize" || value.stage === "plan-spec-version-and-push",
    ),
    false,
  );
});

test("acao final Criar spec bloqueia materializacao quando o bloco final estruturado esta incompleto", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  await runner.startPlanSpecSession("42");
  codex.lastPlanSession?.emitFinal({
    ...createPlanSpecFinalBlock(),
    outline: {
      ...createPlanSpecOutline(),
      requirements: [],
      acceptanceCriteria: [],
    },
  });
  await sleep(0);

  const outcome = await runner.handlePlanSpecFinalActionSelection("42", "create-spec");

  assert.equal(outcome.status, "ignored");
  if (outcome.status === "ignored") {
    assert.equal(outcome.reason, "invalid-action");
    assert.match(outcome.message, /faltam: RFs, CAs/u);
  }
  assert.notEqual(runner.getState().planSpecSession, null);
  assert.equal(
    codex.calls.some((value) => value.stage === "plan-spec-materialize"),
    false,
  );
});

test("encerramento inesperado da sessao /plan_spec move estado para erro e orienta retry", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const failures: string[] = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      planSpecEventHandlers: {
        onQuestion: () => undefined,
        onFinal: () => undefined,
        onRawOutput: () => undefined,
        onFailure: (_chatId, details) => {
          failures.push(details);
        },
      },
    },
  });
  await runner.startPlanSpecSession("42");

  codex.lastPlanSession?.close({
    exitCode: 5,
    cancelled: false,
  });
  await sleep(0);

  assert.equal(runner.getState().planSpecSession, null);
  assert.equal(runner.getState().phase, "error");
  assert.equal(failures.length, 1);
  assert.match(failures[0] ?? "", /encerrada inesperadamente/u);
  assert.match(failures[0] ?? "", /exit code: 5/u);
});

test("acao final Criar spec materializa arquivo, persiste trilha spec_planning e executa versionamento dedicado (CA-12, CA-13, CA-14, CA-15, CA-16)", async () => {
  const projectRoot = await createTempProjectRoot();

  try {
    const logger = new SpyLogger();
    const activeProject: ProjectRef = {
      name: "plan-spec-project",
      path: projectRoot,
    };
    const codex = new StubCodexClient(
      undefined,
      true,
      false,
      0,
      undefined,
      false,
      async (stage, spec) => {
        if (stage !== "plan-spec-materialize") {
          return;
        }

        const absoluteSpecPath = path.join(projectRoot, ...spec.path.split("/"));
        await fs.mkdir(path.dirname(absoluteSpecPath), { recursive: true });
        await fs.writeFile(
          absoluteSpecPath,
          createSpecFileContent(
            spec.plannedTitle ?? "",
            spec.plannedSummary ?? "",
            spec.plannedOutline,
          ),
          "utf8",
        );
      },
    );
    const roundDependencies = createRoundDependencies({
      activeProject,
      queue: defaultQueue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const lifecycleMessages: string[] = [];
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        now: () => new Date("2026-02-19T22:04:00.000Z"),
        planSpecEventHandlers: {
          onQuestion: () => undefined,
          onFinal: () => undefined,
          onRawOutput: () => undefined,
          onFailure: () => undefined,
          onLifecycleMessage: (_chatId, message) => {
            lifecycleMessages.push(message);
          },
        },
      },
    });

    await runner.startPlanSpecSession("42");
    codex.lastPlanSession?.emitFinal(createPlanSpecFinalBlock());
    await sleep(0);

    const outcome = await runner.handlePlanSpecFinalActionSelection("42", "create-spec");
    assert.deepEqual(outcome, { status: "accepted" });

    const expectedFileName = "2026-02-19-bridge-interativa-do-codex.md";
    const expectedSpecPath = path.join(projectRoot, "docs", "specs", expectedFileName);
    const specContent = await fs.readFile(expectedSpecPath, "utf8");
    assert.match(specContent, /^\s*-\s*Status\s*:\s*approved\s*$/imu);
    assert.match(specContent, /^\s*-\s*Spec treatment\s*:\s*pending\s*$/imu);

    const materializeCall = codex.calls.find((value) => value.stage === "plan-spec-materialize");
    const versionCall = codex.calls.find((value) => value.stage === "plan-spec-version-and-push");
    assert.ok(materializeCall);
    assert.ok(versionCall);
    assert.equal(materializeCall?.spec?.path, `docs/specs/${expectedFileName}`);
    assert.equal(
      materializeCall?.spec?.plannedOutline?.objective,
      "Transformar o planejamento interativo em uma spec rica e pronta para execucao.",
    );
    assert.equal(materializeCall?.spec?.plannedOutline?.requirements.length, 2);
    assert.equal(versionCall?.spec?.commitMessage, `feat(spec): add ${expectedFileName}`);
    assert.match(versionCall?.spec?.tracePaths?.requestPath ?? "", /^spec_planning\/requests\//u);
    assert.match(versionCall?.spec?.tracePaths?.responsePath ?? "", /^spec_planning\/responses\//u);
    assert.match(versionCall?.spec?.tracePaths?.decisionPath ?? "", /^spec_planning\/decisions\//u);

    const requestPath = path.join(projectRoot, versionCall?.spec?.tracePaths?.requestPath ?? "");
    const responsePath = path.join(projectRoot, versionCall?.spec?.tracePaths?.responsePath ?? "");
    const decisionPath = path.join(projectRoot, versionCall?.spec?.tracePaths?.decisionPath ?? "");
    await fs.access(requestPath);
    await fs.access(responsePath);
    await fs.access(decisionPath);

    const requestContent = await fs.readFile(requestPath, "utf8");
    const decisionRaw = await fs.readFile(decisionPath, "utf8");
    assert.match(requestContent, /### Requirements/u);
    assert.match(requestContent, /RF-01 - O bloco final deve carregar RFs e CAs aprovados\./u);
    assert.match(requestContent, /### Pending manual validations/u);
    const decision = JSON.parse(decisionRaw) as {
      specOutline: {
        pendingManualValidations: string[];
      };
    };
    assert.equal(decision.specOutline.pendingManualValidations.length, 1);

    const responseFiles = await fs.readdir(path.join(projectRoot, "spec_planning", "responses"));
    assert.equal(responseFiles.length >= 2, true);
    assert.equal(runner.getState().planSpecSession, null);
    assert.equal(runner.getState().phase, "idle");
    assert.equal(codex.lastPlanSession?.cancelCalls, 1);
    assert.equal(lifecycleMessages.some((value) => /Spec criada e versionada com sucesso/u.test(value)), true);
  } finally {
    await cleanupTempProjectRoot(projectRoot);
  }
});

test("acao Criar spec bloqueia colisao de arquivo e mantem sessao ativa para refino", async () => {
  const projectRoot = await createTempProjectRoot();

  try {
    const expectedFileName = "2026-02-19-bridge-interativa-do-codex.md";
    const existingSpecPath = path.join(projectRoot, "docs", "specs", expectedFileName);
    await fs.mkdir(path.dirname(existingSpecPath), { recursive: true });
    await fs.writeFile(existingSpecPath, "# spec existente\n", "utf8");

    const logger = new SpyLogger();
    const activeProject: ProjectRef = {
      name: "plan-spec-project",
      path: projectRoot,
    };
    const codex = new StubCodexClient();
    const roundDependencies = createRoundDependencies({
      activeProject,
      queue: defaultQueue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        now: () => new Date("2026-02-19T22:04:00.000Z"),
      },
    });

    await runner.startPlanSpecSession("42");
    codex.lastPlanSession?.emitFinal(createPlanSpecFinalBlock());
    await sleep(0);

    const outcome = await runner.handlePlanSpecFinalActionSelection("42", "create-spec");
    assert.equal(outcome.status, "ignored");
    if (outcome.status === "ignored") {
      assert.equal(outcome.reason, "ineligible");
      assert.match(outcome.message, /Ja existe docs\/specs\/2026-02-19-bridge-interativa-do-codex\.md/u);
      assert.match(outcome.message, /Refinar/u);
    }

    assert.equal(runner.getState().planSpecSession?.phase, "awaiting-final-action");
    assert.equal(codex.lastPlanSession?.cancelCalls, 0);
    assert.equal(
      codex.calls.some((value) => value.stage === "plan-spec-materialize"),
      false,
    );
  } finally {
    await cleanupTempProjectRoot(projectRoot);
  }
});

test("falha em etapa de Criar spec encerra sessao com erro acionavel sem corromper estado", async () => {
  const projectRoot = await createTempProjectRoot();

  try {
    const logger = new SpyLogger();
    const failures: string[] = [];
    const activeProject: ProjectRef = {
      name: "plan-spec-project",
      path: projectRoot,
    };
    const codex = new StubCodexClient(
      (stage) => stage === "plan-spec-version-and-push",
      true,
      false,
      0,
      undefined,
      false,
      async (stage, spec) => {
        if (stage !== "plan-spec-materialize") {
          return;
        }

        const absoluteSpecPath = path.join(projectRoot, ...spec.path.split("/"));
        await fs.mkdir(path.dirname(absoluteSpecPath), { recursive: true });
        await fs.writeFile(
          absoluteSpecPath,
          createSpecFileContent(
            spec.plannedTitle ?? "",
            spec.plannedSummary ?? "",
            spec.plannedOutline,
          ),
          "utf8",
        );
      },
    );
    const roundDependencies = createRoundDependencies({
      activeProject,
      queue: defaultQueue,
      codexClient: codex,
      gitVersioning: new StubGitVersioning(),
    });
    const runner = createRunner(logger, roundDependencies, {
      runnerOptions: {
        now: () => new Date("2026-02-19T22:04:00.000Z"),
        planSpecEventHandlers: {
          onQuestion: () => undefined,
          onFinal: () => undefined,
          onRawOutput: () => undefined,
          onFailure: (_chatId, details) => {
            failures.push(details);
          },
        },
      },
    });

    await runner.startPlanSpecSession("42");
    codex.lastPlanSession?.emitFinal(createPlanSpecFinalBlock());
    await sleep(0);

    const outcome = await runner.handlePlanSpecFinalActionSelection("42", "create-spec");
    assert.equal(outcome.status, "ignored");
    if (outcome.status === "ignored") {
      assert.equal(outcome.reason, "ineligible");
      assert.match(outcome.message, /Falha ao criar spec planejada/u);
      assert.match(outcome.message, /falha simulada/u);
    }

    assert.equal(runner.getState().planSpecSession, null);
    assert.equal(runner.getState().phase, "error");
    assert.equal(runner.getState().currentSpec, null);
    assert.equal(failures.length, 1);
    assert.match(failures[0] ?? "", /Falha ao criar spec planejada/u);
  } finally {
    await cleanupTempProjectRoot(projectRoot);
  }
});

test("sessao /plan_spec expira por timeout de inatividade e notifica operador (CA-17)", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const lifecycleMessages: Array<{ chatId: string; message: string }> = [];
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: codex,
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies, {
    runnerOptions: {
      planSpecSessionTimeoutMs: 20,
      planSpecEventHandlers: {
        onQuestion: async () => undefined,
        onFinal: async () => undefined,
        onRawOutput: async () => undefined,
        onFailure: async () => undefined,
        onLifecycleMessage: async (chatId, message) => {
          lifecycleMessages.push({ chatId, message });
        },
      } satisfies PlanSpecEventHandlers,
    },
  });

  const startResult = await runner.startPlanSpecSession("42");
  assert.equal(startResult.status, "started");
  await waitForPlanSpecSessionToClose(runner, 1000);

  assert.equal(codex.lastPlanSession?.cancelCalls, 1);
  assert.equal(runner.getState().planSpecSession, null);
  assert.equal(runner.getState().phase, "idle");
  assert.equal(lifecycleMessages.length, 1);
  assert.equal(lifecycleMessages[0]?.chatId, "42");
  assert.match(lifecycleMessages[0]?.message ?? "", /inatividade de 30 minutos/u);
});
