import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AppEnv } from "../config/env.js";
import {
  CodexAuthenticationError,
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
import {
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
import { Logger } from "./logger.js";
import {
  PlanSpecEventHandlers,
  RunnerRoundDependencies,
  TicketRunner,
  TicketRunnerOptions,
} from "./runner.js";

class SpyLogger extends Logger {
  public readonly errors: Array<{ message: string; context?: Record<string, unknown> }> = [];

  override info(): void {}

  override warn(): void {}

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
  public lastPlanSession: StubPlanSession | null = null;

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

    return {
      stage,
      output: `ok:${stage}`,
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

    return {
      stage,
      output: `ok:${stage}`,
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

class StubGitVersioning implements GitVersioning {
  public syncChecks = 0;

  constructor(
    private readonly failSyncCheck = false,
    private readonly evidence: GitSyncEvidence = {
      commitHash: "abc123",
      upstream: "origin/main",
      commitPushId: "abc123@origin/main",
    },
  ) {}

  async commitTicketClosure(): Promise<void> {}

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
  PROJECTS_ROOT_PATH: "/tmp/projects",
  POLL_INTERVAL_MS: 1,
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

const createSummaryCollector = (options: { failSend?: boolean } = {}) => {
  const summaries: TicketFinalSummary[] = [];
  const deliveries: TicketNotificationDelivery[] = [];
  const onTicketFinalized = (summary: TicketFinalSummary): TicketNotificationDelivery => {
    summaries.push(summary);
    if (options.failSend) {
      throw new Error("falha ao enviar resumo");
    }

    const delivery: TicketNotificationDelivery = {
      channel: "telegram",
      destinationChatId: "42",
      deliveredAtUtc: "2026-02-19T15:05:00.000Z",
    };
    deliveries.push(delivery);
    return delivery;
  };

  return { summaries, deliveries, onTicketFinalized };
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
    onTicketFinalized?: (
      summary: TicketFinalSummary,
    ) => Promise<TicketNotificationDelivery | null> | TicketNotificationDelivery | null;
    resolveRoundDependencies?: () => Promise<RunnerRoundDependencies>;
    runnerOptions?: TicketRunnerOptions;
  } = {},
): TicketRunner => {
  return new TicketRunner(
    env,
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

const createTempProjectRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "ticket-runner-plan-spec-"));

const cleanupTempProjectRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

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
  assert.equal(logger.errors[0]?.context?.stage, "close-and-version");
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.status, "failure");
  assert.equal(summaries[0]?.finalStage, "close-and-version");
  assert.equal(summaries[0]?.activeProjectName, activeProjectA.name);
  assert.equal(summaries[0]?.activeProjectPath, activeProjectA.path);
  if (summaries[0]?.status === "failure") {
    assert.match(summaries[0].errorMessage, /push obrigatorio nao concluido/u);
  } else {
    assert.fail("resumo deveria ser falha");
  }
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

test("syncActiveProject bloqueia troca quando runner esta iniciando rodada", async () => {
  const logger = new SpyLogger();
  const roundDependencies = createRoundDependencies({
    activeProject: activeProjectA,
    queue: defaultQueue,
    codexClient: new StubCodexClient(undefined, true, false, 30),
    gitVersioning: new StubGitVersioning(),
  });
  const runner = createRunner(logger, roundDependencies);

  const runAllPromise = runner.requestRunAll();
  const syncOutcome = runner.syncActiveProject(activeProjectB);
  const runAllOutcome = await runAllPromise;
  await waitForRunnerToStop(runner);

  assert.deepEqual(syncOutcome, { status: "blocked-running" });
  assert.deepEqual(runAllOutcome, { status: "started" });
  const state = runner.getState();
  assert.equal(state.activeProject?.name, activeProjectA.name);
  assert.equal(state.activeProject?.path, activeProjectA.path);
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

test("requestRunAll e fail-fast: erro no ticket N impede execucao de N+1", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient(
    (stage, ticket) => ticket.name === ticketA.name && stage === "implement",
  );
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
  assert.deepEqual(secondResult, { status: "already-running" });

  await waitForRunnerToStop(runner);
  assert.equal(codex.authChecks, 1);
  assert.equal(resolveCalls, 1);
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
  assert.deepEqual(secondResult, { status: "already-running" });

  await waitForRunnerToStop(runner);
  assert.equal(codex.authChecks, 1);
  assert.equal(resolveCalls, 1);
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

test("runner nao atualiza ultimo evento notificado quando envio do resumo falha", async () => {
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
  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0]?.message, "Falha ao emitir resumo final de ticket");
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
  assert.equal(runAllResult.reason, "plan-spec-active");
  assert.match(runAllResult.message, /plan_spec_cancel/u);
  assert.equal(runSpecsResult.status, "blocked");
  assert.equal(runSpecsResult.reason, "plan-spec-active");
  assert.match(runSpecsResult.message, /plan_spec_cancel/u);
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

test("acao final Criar spec materializa arquivo, persiste trilha spec_planning e executa versionamento dedicado (CA-12..CA-16)", async () => {
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

test("sessao /plan_spec expira por timeout de inatividade e notifica operador", async () => {
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
