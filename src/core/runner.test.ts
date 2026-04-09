import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "../config/env.js";
import type { CodexTicketFlowClient } from "../integrations/codex-client.js";
import type { GitVersioning } from "../integrations/git-client.js";
import type { TicketQueue } from "../integrations/ticket-queue.js";
import type { ProjectRef } from "../types/project.js";
import type { TargetInvestigateCaseExecutor } from "./target-investigate-case.js";
import { Logger } from "./logger.js";
import type {
  RunnerRoundDependencies,
  RunnerRoundDependenciesResolver,
} from "./runner.js";
import { TicketRunner } from "./runner.js";

class StubLogger extends Logger {}

const env: AppEnv = {
  TELEGRAM_BOT_TOKEN: "telegram-token",
  TELEGRAM_ALLOWED_CHAT_ID: "123",
  PROJECTS_ROOT_PATH: "/tmp/projects",
  POLL_INTERVAL_MS: 1000,
  RUN_ALL_MAX_TICKETS_PER_ROUND: 20,
  SHUTDOWN_DRAIN_TIMEOUT_MS: 30000,
  PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM: false,
  RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED: false,
};

const activeProject: ProjectRef = {
  name: "codex-flow-runner",
  path: "/home/mapita/projetos/codex-flow-runner",
};

const dependencies: RunnerRoundDependencies = {
  activeProject,
  queue: {} as TicketQueue,
  codexClient: {} as CodexTicketFlowClient,
  gitVersioning: {} as GitVersioning,
};

const createRunner = (
  executor: TargetInvestigateCaseExecutor | null = null,
): TicketRunner => {
  const resolver: RunnerRoundDependenciesResolver = async () => dependencies;
  return new TicketRunner(env, new StubLogger(), dependencies, resolver, undefined, {
    targetInvestigateCaseExecutor: executor ?? undefined,
  });
};

test("requestTargetInvestigateCase usa a superficie v2 na mensagem de executor ausente", async () => {
  const runner = createRunner();

  const result = await runner.requestTargetInvestigateCase(
    "/target_investigate_case_v2 alpha-project case-001",
  );

  assert.equal(result.status, "failed");
  if (result.status !== "failed") {
    return;
  }

  assert.match(result.message, /Executor de \/target_investigate_case_v2 nao configurado/u);
  await runner.shutdown({ timeoutMs: 100 });
});

test("requestTargetInvestigateCase rejeita comandos fora do contrato v2", async () => {
  const runner = createRunner({
    execute: async () => {
      throw new Error("Nao deveria executar quando o comando e invalido.");
    },
  });

  const result = await runner.requestTargetInvestigateCase(
    "/target_investigate_case alpha-project case-001",
  );

  assert.equal(result.status, "failed");
  if (result.status !== "failed") {
    return;
  }

  assert.match(result.message, /Comando invalido/u);
  await runner.shutdown({ timeoutMs: 100 });
});
