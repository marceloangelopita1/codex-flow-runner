import assert from "node:assert/strict";
import test from "node:test";
import { AppEnv } from "../config/env.js";
import {
  CodexAuthenticationError,
  CodexStageExecutionError,
  CodexStageResult,
  CodexTicketFlowClient,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { GitSyncEvidence, GitVersioning } from "../integrations/git-client.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
import { ProjectRef } from "../types/project.js";
import {
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
import { Logger } from "./logger.js";
import { RunnerRoundDependencies, TicketRunner } from "./runner.js";

class SpyLogger extends Logger {
  public readonly errors: Array<{ message: string; context?: Record<string, unknown> }> = [];

  override info(): void {}

  override warn(): void {}

  override error(message: string, context?: Record<string, unknown>): void {
    this.errors.push({ message, context });
  }
}

class StubCodexClient implements CodexTicketFlowClient {
  public readonly calls: Array<{ stage: TicketFlowStage; ticketName: string }> = [];
  public authChecks = 0;

  constructor(
    private readonly shouldFail?: (stage: TicketFlowStage, ticket: TicketRef) => boolean,
    private readonly includeExecPlanPath = true,
    private readonly failAuthentication = false,
    private readonly authDelayMs = 0,
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
    this.calls.push({ stage, ticketName: ticket.name });

    if (this.shouldFail?.(stage, ticket)) {
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
  } = {},
): TicketRunner => {
  return new TicketRunner(
    env,
    logger,
    initialRoundDependencies,
    options.resolveRoundDependencies ?? (async () => initialRoundDependencies),
    options.onTicketFinalized,
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
