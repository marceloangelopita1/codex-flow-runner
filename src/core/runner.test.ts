import assert from "node:assert/strict";
import test from "node:test";
import { AppEnv } from "../config/env.js";
import {
  CodexStageExecutionError,
  CodexStageResult,
  CodexTicketFlowClient,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { GitVersioning } from "../integrations/git-client.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
import { TicketFinalSummary } from "../types/ticket-final-summary.js";
import { Logger } from "./logger.js";
import { TicketRunner } from "./runner.js";

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

  constructor(
    private readonly shouldFail?: (stage: TicketFlowStage, ticket: TicketRef) => boolean,
  ) {}

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    this.calls.push({ stage, ticketName: ticket.name });

    if (this.shouldFail?.(stage, ticket)) {
      throw new CodexStageExecutionError(ticket.name, stage, "falha simulada");
    }

    return {
      stage,
      output: `ok:${stage}`,
      ...(stage === "plan"
        ? { execPlanPath: `execplans/${ticket.name.replace(/\.md$/u, "")}.md` }
        : {}),
    };
  }
}

class StubGitVersioning implements GitVersioning {
  public syncChecks = 0;

  constructor(private readonly failSyncCheck = false) {}

  async commitTicketClosure(): Promise<void> {}

  async assertSyncedWithRemote(): Promise<void> {
    this.syncChecks += 1;
    if (this.failSyncCheck) {
      throw new Error("push obrigatorio nao concluido");
    }
  }
}

const env: AppEnv = {
  CODEX_API_KEY: "test-key",
  TELEGRAM_BOT_TOKEN: "test-token",
  REPO_PATH: "/tmp/repo",
  POLL_INTERVAL_MS: 1,
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

const createSummaryCollector = () => {
  const summaries: TicketFinalSummary[] = [];
  const onTicketFinalized = (summary: TicketFinalSummary): void => {
    summaries.push(summary);
  };

  return { summaries, onTicketFinalized };
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
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const runner = new TicketRunner(
    env,
    logger,
    defaultQueue,
    codex,
    gitVersioning,
    onTicketFinalized,
  );

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
  assert.equal(logger.errors.length, 0);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "success");
  assert.equal(summaries[0]?.finalStage, "close-and-version");
  assert.match(summaries[0]?.timestampUtc ?? "", /^\d{4}-\d{2}-\d{2}T/u);
  assert.equal(summaries[0]?.errorMessage, undefined);
});

test("runner para no stage com falha e registra contexto", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient((stage) => stage === "implement");
  const gitVersioning = new StubGitVersioning();
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const runner = new TicketRunner(
    env,
    logger,
    defaultQueue,
    codex,
    gitVersioning,
    onTicketFinalized,
  );

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
  assert.match(summaries[0]?.errorMessage ?? "", /falha simulada/u);
});

test("runner marca erro de close-and-version quando validacao de push falha", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const gitVersioning = new StubGitVersioning(true);
  const { summaries, onTicketFinalized } = createSummaryCollector();
  const runner = new TicketRunner(
    env,
    logger,
    defaultQueue,
    codex,
    gitVersioning,
    onTicketFinalized,
  );

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
  assert.match(summaries[0]?.errorMessage ?? "", /push obrigatorio nao concluido/u);
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

  const runner = new TicketRunner(env, logger, queue, codex, gitVersioning, onTicketFinalized);
  assert.equal(runner.requestRunAll(), true);

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
  assert.equal(state.lastMessage, "Rodada /run-all finalizada: nenhum ticket aberto restante");
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.ticket, ticketA.name);
  assert.equal(summaries[0]?.status, "success");
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

  const runner = new TicketRunner(env, logger, queue, codex, gitVersioning, onTicketFinalized);
  assert.equal(runner.requestRunAll(), true);

  await waitForRunnerToStop(runner);

  assert.equal(summaries.length, 2);
  assert.deepEqual(
    summaries.map((value) => ({ ticket: value.ticket, status: value.status })),
    [
      { ticket: ticketA.name, status: "success" },
      { ticket: ticketB.name, status: "success" },
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

  const runner = new TicketRunner(env, logger, queue, codex, gitVersioning, onTicketFinalized);
  assert.equal(runner.requestRunAll(), true);

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
});
