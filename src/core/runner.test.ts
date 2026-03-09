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
  CodexPlanSessionError,
  CodexStageExecutionError,
  CodexStageResult,
  PlanSpecSession,
  PlanSpecSessionCloseResult,
  PlanSpecSessionEvent,
  PlanSpecSessionStartRequest,
  CodexTicketFlowClient,
  SpecFlowStage,
  SpecRef,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { GitSyncEvidence, GitVersioning } from "../integrations/git-client.js";
import { PlanSpecFinalBlock, PlanSpecQuestionBlock } from "../integrations/plan-spec-parser.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
import { ProjectRef } from "../types/project.js";
import { RunnerFlowSummary } from "../types/flow-timing.js";
import {
  TicketFinalSummary,
  TicketNotificationDispatchError,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
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
  public planSessionStartCalls = 0;
  public freeChatSessionStartCalls = 0;
  public lastPlanSession: StubPlanSession | null = null;
  public lastFreeChatSession: StubCodexChatSession | null = null;

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
  ) {}

  async ensureAuthenticated(): Promise<void> {
    if (this.authDelayMs > 0) {
      await sleep(this.authDelayMs);
    }
    this.authChecks += 1;
    if (this.failAuthentication) {
      throw new CodexAuthenticationError("sessao ausente");
    }
  }

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    this.calls.push({ stage, ticketName: ticket.name, target: "ticket" });
    this.onStageStart?.(stage, { name: ticket.name });

    if (this.shouldFail?.(stage, { name: ticket.name })) {
      throw new CodexStageExecutionError(ticket.name, stage, "falha simulada");
    }

    const stageDiagnostics = this.stageDiagnostics[stage];
    return {
      stage,
      output: `ok:${stage}`,
      diagnostics: {
        stdoutPreview: stageDiagnostics?.stdoutPreview ?? `ok:${stage}`,
        ...(stageDiagnostics?.stderrPreview ? { stderrPreview: stageDiagnostics.stderrPreview } : {}),
      },
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

    if (this.shouldFail?.(stage, { name: spec.fileName })) {
      throw new CodexStageExecutionError(spec.fileName, stage, "falha simulada");
    }

    await this.onSpecStageRun?.(stage, spec);

    const stageDiagnostics = this.stageDiagnostics[stage];
    return {
      stage,
      output: `ok:${stage}`,
      diagnostics: {
        stdoutPreview: stageDiagnostics?.stdoutPreview ?? `ok:${stage}`,
        ...(stageDiagnostics?.stderrPreview ? { stderrPreview: stageDiagnostics.stderrPreview } : {}),
      },
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

  async startFreeChatSession(request: CodexChatSessionStartRequest): Promise<CodexChatSession> {
    this.freeChatSessionStartCalls += 1;
    if (this.failFreeChatSessionStart) {
      throw new CodexChatSessionError("start", "falha simulada");
    }

    const session = new StubCodexChatSession(request);
    this.lastFreeChatSession = session;
    return session;
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

class StubGitVersioning implements GitVersioning {
  public syncChecks = 0;
  public readonly commitClosures: Array<{ ticketName: string; execPlanPath: string }> = [];

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

const cloneSpecRef = (spec: SpecRef): SpecRef => ({
  fileName: spec.fileName,
  path: spec.path,
  ...(spec.plannedTitle ? { plannedTitle: spec.plannedTitle } : {}),
  ...(spec.plannedSummary ? { plannedSummary: spec.plannedSummary } : {}),
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

const writeTicketMetadataFile = async (
  projectRoot: string,
  options: {
    directory: "open" | "closed";
    ticketName: string;
    status: "open" | "closed";
    parentTicketPath?: string;
    closureReason?: string;
    priority?: "P0" | "P1" | "P2";
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
    "",
  ];
  await fs.mkdir(path.dirname(ticketPath), { recursive: true });
  await fs.writeFile(ticketPath, `${lines.join("\n")}\n`, "utf8");
  return ticketPath;
};

const buildTicketRef = (projectRoot: string, ticketName: string): TicketRef => ({
  name: ticketName,
  openPath: path.join(projectRoot, "tickets", "open", ticketName),
  closedPath: path.join(projectRoot, "tickets", "closed", ticketName),
});

const createSpecFileContent = (title: string, summary: string): string =>
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
    "  - tickets/open/2026-02-19-plan-spec-spec-materialization-and-versioning-gap.md",
    "",
    "## Objetivo e contexto",
    `- Problema que esta spec resolve: ${summary}`,
    "",
  ].join("\n");

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
      return ticketA;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
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
});

test("requestRunSpecs emite milestone de falha quando spec-close-and-version falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient((stage) => stage === "spec-close-and-version");
  const milestones: RunSpecsTriageLifecycleEvent[] = [];
  const { flowSummaries, runFlowEventHandlers } = createFlowSummaryCollector();
  const queue: TicketQueue = {
    ensureStructure: async () => undefined,
    nextOpenTicket: async () => ticketA,
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
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
  assert.deepEqual(milestones[0]?.timing.completedStages, ["spec-triage"]);
  assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-triage"], "number");
  assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-close-and-version"], "number");
  const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
  assert.ok(runSpecsSummary);
  if (runSpecsSummary?.flow === "run-specs") {
    assert.equal(runSpecsSummary.outcome, "failure");
    assert.equal(runSpecsSummary.completionReason, "triage-failure");
    assert.equal(runSpecsSummary.finalStage, "spec-close-and-version");
    assert.equal(runSpecsSummary.runAllSummary, undefined);
    assert.equal(runSpecsSummary.timing.interruptedStage, "spec-close-and-version");
    assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-triage"], "number");
    assert.equal(
      typeof runSpecsSummary.timing.durationsByStageMs["spec-close-and-version"],
      "number",
    );
    assert.equal(runSpecsSummary.timing.durationsByStageMs["run-all"], undefined);
  } else {
    assert.fail("resumo de fluxo /run_specs deveria existir");
  }
});

test("requestRunSpecs com sucesso encadeia run-all e processa backlog existente", async () => {
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
  const request = await runner.requestRunSpecs(specFileName);
  assert.deepEqual(request, { status: "started" });

  await waitForRunnerToStop(runner);

  assert.deepEqual(
    codex.calls.map((value) => `${value.target}:${value.ticketName}:${value.stage}`),
    [
      `spec:${specFileName}:spec-triage`,
      `spec:${specFileName}:spec-close-and-version`,
      `ticket:${ticketA.name}:plan`,
      `ticket:${ticketA.name}:implement`,
      `ticket:${ticketA.name}:close-and-version`,
      `ticket:${ticketB.name}:plan`,
      `ticket:${ticketB.name}:implement`,
      `ticket:${ticketB.name}:close-and-version`,
    ],
  );
  assert.equal(nextTicketCalls, 3);
  assert.equal(gitVersioning.syncChecks, 2);
  assert.equal(summaries.length, 2);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[1]?.ticket, ticketB.name);

  const state = runner.getState();
  assert.equal(state.isRunning, false);
  assert.equal(state.phase, "idle");
  assert.equal(state.currentSpec, null);
  assert.equal(state.lastMessage, "Rodada /run-all finalizada: nenhum ticket aberto restante");
});

test("requestRunSpecs emite milestone de sucesso antes de iniciar rodada de tickets", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
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
        return ticketA;
      }
      return null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
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
  assert.deepEqual(milestones[0]?.timing.completedStages, ["spec-triage", "spec-close-and-version"]);
  assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-triage"], "number");
  assert.equal(typeof milestones[0]?.timing.durationsByStageMs["spec-close-and-version"], "number");
  assert.equal(firstTicketCallSawMilestone, true);
  const runAllSummary = flowSummaries.find((event) => event.flow === "run-all");
  const runSpecsSummary = flowSummaries.find((event) => event.flow === "run-specs");
  assert.ok(runAllSummary);
  assert.ok(runSpecsSummary);
  if (runAllSummary?.flow === "run-all") {
    assert.equal(runAllSummary.outcome, "success");
    assert.equal(runAllSummary.completionReason, "queue-empty");
    assert.equal(runAllSummary.timing.interruptedStage, null);
    assert.equal(typeof runAllSummary.timing.durationsByStageMs.plan, "number");
  } else {
    assert.fail("resumo /run-all deveria existir no fluxo encadeado");
  }
  if (runSpecsSummary?.flow === "run-specs") {
    assert.equal(runSpecsSummary.outcome, "success");
    assert.equal(runSpecsSummary.completionReason, "completed");
    assert.equal(runSpecsSummary.finalStage, "run-all");
    assert.equal(runSpecsSummary.timing.interruptedStage, null);
    assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["spec-triage"], "number");
    assert.equal(
      typeof runSpecsSummary.timing.durationsByStageMs["spec-close-and-version"],
      "number",
    );
    assert.equal(typeof runSpecsSummary.timing.durationsByStageMs["run-all"], "number");
    assert.equal(runSpecsSummary.runAllSummary?.outcome, "success");
    assert.equal(runSpecsSummary.runAllSummary?.completionReason, "queue-empty");
  } else {
    assert.fail("resumo /run_specs deveria existir");
  }
});

test("requestRunSpecs expoe fase e currentSpec durante triagem e transita para fase de ticket", async () => {
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
      return nextTicketCalls === 1 ? ticketA : null;
    },
    closeTicket: async () => undefined,
  };

  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
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
  assert.equal(ticketSnapshot?.phase, "plan");
  assert.equal(ticketSnapshot?.currentSpec, null);
  assert.equal(ticketSnapshot?.currentTicket, ticketA.name);
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
  codex.lastPlanSession?.emitFinal({
    title: "Bridge interativa do Codex",
    summary: "Sessao /plan com parser e callbacks no Telegram.",
    actions: [
      { id: "create-spec", label: "Criar spec" },
      { id: "refine", label: "Refinar" },
      { id: "cancel", label: "Cancelar" },
    ],
  });
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
          createSpecFileContent(spec.plannedTitle ?? "", spec.plannedSummary ?? ""),
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
    codex.lastPlanSession?.emitFinal({
      title: "Bridge interativa do Codex",
      summary: "Sessao /plan com parser e callbacks no Telegram.",
      actions: [
        { id: "create-spec", label: "Criar spec" },
        { id: "refine", label: "Refinar" },
        { id: "cancel", label: "Cancelar" },
      ],
    });
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
    codex.lastPlanSession?.emitFinal({
      title: "Bridge interativa do Codex",
      summary: "Sessao /plan com parser e callbacks no Telegram.",
      actions: [
        { id: "create-spec", label: "Criar spec" },
        { id: "refine", label: "Refinar" },
        { id: "cancel", label: "Cancelar" },
      ],
    });
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
          createSpecFileContent(spec.plannedTitle ?? "", spec.plannedSummary ?? ""),
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
    codex.lastPlanSession?.emitFinal({
      title: "Bridge interativa do Codex",
      summary: "Sessao /plan com parser e callbacks no Telegram.",
      actions: [
        { id: "create-spec", label: "Criar spec" },
        { id: "refine", label: "Refinar" },
        { id: "cancel", label: "Cancelar" },
      ],
    });
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
