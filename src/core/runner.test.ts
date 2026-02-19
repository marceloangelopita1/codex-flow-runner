import assert from "node:assert/strict";
import test from "node:test";
import { AppEnv } from "../config/env.js";
import {
  CodexStageExecutionError,
  CodexStageResult,
  CodexTicketFlowClient,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";
import { TicketRunner } from "./runner.js";
import { Logger } from "./logger.js";

class SpyLogger extends Logger {
  public readonly errors: Array<{ message: string; context?: Record<string, unknown> }> = [];

  override info(): void {}

  override warn(): void {}

  override error(message: string, context?: Record<string, unknown>): void {
    this.errors.push({ message, context });
  }
}

class StubCodexClient implements CodexTicketFlowClient {
  public readonly calls: TicketFlowStage[] = [];

  constructor(private readonly failOnStage?: TicketFlowStage) {}

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    this.calls.push(stage);

    if (stage === this.failOnStage) {
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

const env: AppEnv = {
  CODEX_API_KEY: "test-key",
  TELEGRAM_BOT_TOKEN: "test-token",
  REPO_PATH: "/tmp/repo",
  POLL_INTERVAL_MS: 1,
  GIT_AUTO_PUSH: false,
};

const queue: TicketQueue = {
  ensureStructure: async () => undefined,
  nextOpenTicket: async () => null,
  closeTicket: async () => undefined,
};

const ticket: TicketRef = {
  name: "2026-02-19-flow.md",
  openPath: "/tmp/repo/tickets/open/2026-02-19-flow.md",
  closedPath: "/tmp/repo/tickets/closed/2026-02-19-flow.md",
};

const callProcessTicket = async (runner: TicketRunner, value: TicketRef): Promise<void> => {
  const internalRunner = runner as unknown as {
    processTicket: (ticketRef: TicketRef) => Promise<void>;
  };

  await internalRunner.processTicket(value);
};

test("runner executa etapas em ordem para um ticket", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient();
  const runner = new TicketRunner(env, logger, queue, codex);

  await callProcessTicket(runner, ticket);

  assert.deepEqual(codex.calls, ["plan", "implement", "close-and-version"]);

  const state = runner.getState();
  assert.equal(state.currentTicket, null);
  assert.equal(state.phase, "idle");
  assert.equal(logger.errors.length, 0);
});

test("runner para no stage com falha e registra contexto", async () => {
  const logger = new SpyLogger();
  const codex = new StubCodexClient("implement");
  const runner = new TicketRunner(env, logger, queue, codex);

  await callProcessTicket(runner, ticket);

  assert.deepEqual(codex.calls, ["plan", "implement"]);

  const state = runner.getState();
  assert.equal(state.currentTicket, null);
  assert.equal(state.phase, "error");

  assert.equal(logger.errors.length, 1);
  assert.equal(logger.errors[0]?.message, "Erro no ciclo de ticket");
  assert.equal(logger.errors[0]?.context?.ticket, ticket.name);
  assert.equal(logger.errors[0]?.context?.stage, "implement");
});
