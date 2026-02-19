import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../core/logger.js";
import {
  CodexCliTicketFlowClient,
  CodexStageExecutionError,
} from "./codex-client.js";
import { TicketRef } from "./ticket-queue.js";

class SpyLogger extends Logger {
  override info(): void {}
  override warn(): void {}
  override error(): void {}
}

const ticket: TicketRef = {
  name: "2026-02-19-example-ticket.md",
  openPath: "/tmp/tickets/open/2026-02-19-example-ticket.md",
  closedPath: "/tmp/tickets/closed/2026-02-19-example-ticket.md",
};

test("runStage(plan) substitui placeholder e propaga credenciais para comando", async () => {
  let capturedPrompt = "";
  let capturedEnv: NodeJS.ProcessEnv | undefined;

  const client = new CodexCliTicketFlowClient(
    "/tmp/repo",
    new SpyLogger(),
    "codex-key",
    {
      loadPromptTemplate: async () =>
        [
          "# Prompt: Criar ExecPlan para Ticket",
          "",
          "Ticket alvo:",
          "- `<tickets/open/YYYY-MM-DD-slug.md>`",
        ].join("\n"),
      runCodexCommand: async (request) => {
        capturedPrompt = request.prompt;
        capturedEnv = request.env;
        return { stdout: "ok", stderr: "" };
      },
      resolvePlanDirectoryName: async () => "execplans",
    },
  );

  const result = await client.runStage("plan", ticket);

  assert.equal(result.stage, "plan");
  assert.equal(result.execPlanPath, "execplans/2026-02-19-example-ticket.md");

  assert.match(capturedPrompt, /tickets\/open\/2026-02-19-example-ticket\.md/u);
  assert.doesNotMatch(capturedPrompt, /YYYY-MM-DD-slug/u);
  assert.match(capturedPrompt, /ExecPlan esperado: `execplans\/2026-02-19-example-ticket\.md`/u);

  assert.equal(capturedEnv?.CODEX_API_KEY, "codex-key");
  assert.equal(capturedEnv?.OPENAI_API_KEY, "codex-key");
});

test("runStage(plan) adapta caminho esperado para repositorio com plans", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient(
    "/tmp/repo",
    new SpyLogger(),
    "codex-key",
    {
      loadPromptTemplate: async () =>
        [
          "# Prompt: Criar ExecPlan para Ticket",
          "",
          "Ticket alvo:",
          "- `<tickets/open/YYYY-MM-DD-slug.md>`",
          "",
          "Instrucoes:",
          "- Salve o plano em `execplans/<yyyy-mm-dd>-<slug>.md` (mesmo slug do ticket).",
        ].join("\n"),
      runCodexCommand: async (request) => {
        capturedPrompt = request.prompt;
        return { stdout: "ok", stderr: "" };
      },
      resolvePlanDirectoryName: async () => "plans",
    },
  );

  const result = await client.runStage("plan", ticket);

  assert.equal(result.execPlanPath, "plans/2026-02-19-example-ticket.md");
  assert.match(capturedPrompt, /Salve o plano em `plans\/<yyyy-mm-dd>-<slug>\.md`/u);
  assert.match(capturedPrompt, /ExecPlan esperado: `plans\/2026-02-19-example-ticket\.md`/u);
});

test("runStage falhando encapsula erro com stage e ticket", async () => {
  const client = new CodexCliTicketFlowClient(
    "/tmp/repo",
    new SpyLogger(),
    "codex-key",
    {
      loadPromptTemplate: async () => "# prompt",
      runCodexCommand: async () => {
        throw new Error("codex exec terminou com codigo 1");
      },
      resolvePlanDirectoryName: async () => "execplans",
    },
  );

  await assert.rejects(
    () => client.runStage("implement", ticket),
    (error: unknown) => {
      assert.ok(error instanceof CodexStageExecutionError);
      assert.equal(error.stage, "implement");
      assert.equal(error.ticketName, ticket.name);
      assert.match(error.message, /codex exec terminou com codigo 1/u);
      return true;
    },
  );
});
