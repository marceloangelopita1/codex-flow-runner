import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import { Logger } from "../core/logger.js";
import {
  buildInteractiveCodexArgs,
  buildNonInteractiveCodexArgs,
  CodexAuthenticationError,
  CodexCliTicketFlowClient,
  CodexPlanSessionError,
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

const spec = {
  fileName: "2026-02-19-approved-spec-triage-run-specs.md",
  path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
};

const plannedSpec = {
  fileName: "2026-02-19-bridge-interativa-do-codex.md",
  path: "docs/specs/2026-02-19-bridge-interativa-do-codex.md",
  plannedTitle: "Bridge interativa do Codex",
  plannedSummary: "Sessao /plan com parser e callbacks no Telegram.",
  tracePaths: {
    requestPath: "spec_planning/requests/20260219t220400z-s1-request.md",
    responsePath: "spec_planning/responses/20260219t220400z-s1-materialize.md",
    decisionPath: "spec_planning/decisions/20260219t220400z-s1-decision.json",
  },
};

class FakeInteractiveProcess {
  public readonly stdout = new PassThrough();
  public readonly stderr = new PassThrough();
  public readonly stdinWrites: string[] = [];
  public readonly killedSignals: string[] = [];
  public stdinEnded = false;
  private readonly lifecycle = new EventEmitter();

  public readonly stdin = {
    write: (chunk: string) => {
      this.stdinWrites.push(chunk);
      return true;
    },
    end: () => {
      this.stdinEnded = true;
    },
  };

  on(event: "close" | "error", listener: (...args: unknown[]) => void): this {
    this.lifecycle.on(event, listener);
    return this;
  }

  emitClose(code: number | null): void {
    this.lifecycle.emit("close", code);
  }

  emitError(error: Error): void {
    this.lifecycle.emit("error", error);
  }

  kill(signal?: NodeJS.Signals): boolean {
    this.killedSignals.push(signal ?? "SIGTERM");
    this.emitClose(null);
    return true;
  }
}

test("runStage(plan) substitui placeholder e nao injeta api key no ambiente", async () => {
  let capturedPrompt = "";
  let capturedEnv: NodeJS.ProcessEnv | undefined;
  const originalCodexApiKey = process.env.CODEX_API_KEY;
  const originalOpenaiApiKey = process.env.OPENAI_API_KEY;
  process.env.CODEX_API_KEY = "ambient-codex";
  process.env.OPENAI_API_KEY = "ambient-openai";

  try {
    const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
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
    });

    const result = await client.runStage("plan", ticket);

    assert.equal(result.stage, "plan");
    assert.equal(result.execPlanPath, "execplans/2026-02-19-example-ticket.md");

    assert.match(capturedPrompt, /tickets\/open\/2026-02-19-example-ticket\.md/u);
    assert.doesNotMatch(capturedPrompt, /YYYY-MM-DD-slug/u);
    assert.match(capturedPrompt, /ExecPlan esperado: `execplans\/2026-02-19-example-ticket\.md`/u);

    assert.equal(capturedEnv?.CODEX_API_KEY, process.env.CODEX_API_KEY);
    assert.equal(capturedEnv?.OPENAI_API_KEY, process.env.OPENAI_API_KEY);
  } finally {
    if (originalCodexApiKey === undefined) {
      delete process.env.CODEX_API_KEY;
    } else {
      process.env.CODEX_API_KEY = originalCodexApiKey;
    }

    if (originalOpenaiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenaiApiKey;
    }
  }
});

test("args nao interativos usam full access explicito por chamada", () => {
  const args = buildNonInteractiveCodexArgs();

  assert.deepEqual(args, [
    "-a",
    "never",
    "exec",
    "--skip-git-repo-check",
    "-s",
    "danger-full-access",
    "--color",
    "never",
    "-",
  ]);
  assert.equal(args.includes("--dangerously-bypass-approvals-and-sandbox"), false);
});

test("args interativos usam full access sem flags exclusivas de codex exec", () => {
  const args = buildInteractiveCodexArgs();

  assert.deepEqual(args, [
    "-s",
    "danger-full-access",
    "-a",
    "never",
    "--color",
    "never",
  ]);
  assert.equal(args.includes("--skip-git-repo-check"), false);
  assert.equal(args.includes("--dangerously-bypass-approvals-and-sandbox"), false);
});

test("runStage(plan) adapta caminho esperado para repositorio com plans", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
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
    });

  const result = await client.runStage("plan", ticket);

  assert.equal(result.execPlanPath, "plans/2026-02-19-example-ticket.md");
  assert.match(capturedPrompt, /Salve o plano em `plans\/<yyyy-mm-dd>-<slug>\.md`/u);
  assert.match(capturedPrompt, /ExecPlan esperado: `plans\/2026-02-19-example-ticket\.md`/u);
});

test("runSpecStage(spec-triage) substitui placeholder <SPEC_PATH>", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "",
        "SPEC alvo:",
        "- <SPEC_PATH>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-triage", spec);

  assert.equal(result.stage, "spec-triage");
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.doesNotMatch(capturedPrompt, /<SPEC_PATH>/u);
});

test("runSpecStage(spec-close-and-version) inclui commit padrao e regra de Status attended", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-close-and-version", spec);

  assert.equal(result.stage, "spec-close-and-version");
  assert.match(
    capturedPrompt,
    /chore\(specs\): triage 2026-02-19-approved-spec-triage-run-specs\.md/u,
  );
  assert.match(capturedPrompt, /Status: attended/u);
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
});

test("runSpecStage(plan-spec-materialize) injeta titulo/resumo finais e caminho da spec planejada", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "",
        "Spec alvo: <SPEC_PATH>",
        "Arquivo: <SPEC_FILE_NAME>",
        "Titulo: <SPEC_TITLE>",
        "Resumo: <SPEC_SUMMARY>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("plan-spec-materialize", plannedSpec);

  assert.equal(result.stage, "plan-spec-materialize");
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-bridge-interativa-do-codex\.md/u);
  assert.match(capturedPrompt, /Titulo: Bridge interativa do Codex/u);
  assert.match(capturedPrompt, /Resumo: Sessao \/plan com parser e callbacks no Telegram\./u);
  assert.doesNotMatch(capturedPrompt, /<SPEC_TITLE>|<SPEC_SUMMARY>/u);
});

test("runSpecStage(plan-spec-version-and-push) injeta commit dedicado feat(spec) e trilha spec_planning", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "",
        "Commit: <COMMIT_MESSAGE>",
        "Request: <TRACE_REQUEST_PATH>",
        "Response: <TRACE_RESPONSE_PATH>",
        "Decision: <TRACE_DECISION_PATH>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("plan-spec-version-and-push", plannedSpec);

  assert.equal(result.stage, "plan-spec-version-and-push");
  assert.match(capturedPrompt, /feat\(spec\): add 2026-02-19-bridge-interativa-do-codex\.md/u);
  assert.match(capturedPrompt, /spec_planning\/requests\/20260219t220400z-s1-request\.md/u);
  assert.match(capturedPrompt, /spec_planning\/responses\/20260219t220400z-s1-materialize\.md/u);
  assert.match(capturedPrompt, /spec_planning\/decisions\/20260219t220400z-s1-decision\.json/u);
  assert.doesNotMatch(capturedPrompt, /<TRACE_REQUEST_PATH>|<TRACE_RESPONSE_PATH>|<TRACE_DECISION_PATH>/u);
});

test("runSpecStage(plan-spec-version-and-push) falha quando trilha spec_planning nao e informada", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# Prompt sem placeholders",
    runCodexCommand: async () => ({ stdout: "ok", stderr: "" }),
  });

  await assert.rejects(
    () =>
      client.runSpecStage("plan-spec-version-and-push", {
        fileName: plannedSpec.fileName,
        path: plannedSpec.path,
      }),
    (error: unknown) => {
      assert.ok(error instanceof CodexStageExecutionError);
      assert.match(error.message, /trilha spec_planning completa/u);
      return true;
    },
  );
});

test("ensureAuthenticated falha com instrucao de codex login quando sessao esta ausente", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexAuthStatusCommand: async () => ({
      stdout: "Not logged in",
      stderr: "",
    }),
  });

  await assert.rejects(
    () => client.ensureAuthenticated(),
    (error: unknown) => {
      assert.ok(error instanceof CodexAuthenticationError);
      assert.match(error.message, /codex login/u);
      return true;
    },
  );
});

test("ensureAuthenticated aceita sessao valida do Codex CLI", async () => {
  let checks = 0;
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexAuthStatusCommand: async () => {
      checks += 1;
      return {
        stdout: "Logged in using ChatGPT",
        stderr: "",
      };
    },
  });

  await client.ensureAuthenticated();
  assert.equal(checks, 1);
});

test("ensureAuthenticated propaga falha do comando com erro contextualizado", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexAuthStatusCommand: async () => {
      throw new Error("codex login status terminou com codigo 1: unauthorized");
    },
  });

  await assert.rejects(
    () => client.ensureAuthenticated(),
    (error: unknown) => {
      assert.ok(error instanceof CodexAuthenticationError);
      assert.match(error.message, /codex login status terminou com codigo 1/u);
      return true;
    },
  );
});

test("runStage falhando encapsula erro com stage e ticket", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
      loadPromptTemplate: async () => "# prompt",
      runCodexCommand: async () => {
        throw new Error("codex exec terminou com codigo 1");
      },
      resolvePlanDirectoryName: async () => "execplans",
    });

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

test("startPlanSession envia /plan, auto-confirma trust e emite pergunta parseada", async () => {
  const interactiveProcess = new FakeInteractiveProcess();
  const events: Array<{ type: string; payload?: unknown }> = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    spawnCodexInteractiveProcess: () =>
      interactiveProcess as unknown as import("node:child_process").ChildProcessWithoutNullStreams,
  });

  const session = await client.startPlanSession({
    initialUserInput: "brief inicial da spec",
    callbacks: {
      onEvent: (event) => events.push({ type: event.type, payload: event }),
      onFailure: (error) => {
        throw error;
      },
    },
  });

  assert.deepEqual(interactiveProcess.stdinWrites.slice(0, 2), ["/plan\n", "brief inicial da spec\n"]);

  interactiveProcess.stdout.write("Do you trust this directory? (yes/no)\n");
  assert.equal(interactiveProcess.stdinWrites.includes("yes\n"), true);
  assert.equal(interactiveProcess.stdinWrites.filter((value) => value === "/plan\n").length >= 2, true);

  interactiveProcess.stdout.write(
    [
      "[[PLAN_SPEC_QUESTION]]",
      "Pergunta: Qual escopo devemos priorizar?",
      "Opcoes:",
      "- [api] API",
      "- [bot] Bot Telegram",
      "[[/PLAN_SPEC_QUESTION]]",
    ].join("\n"),
  );

  const questionEvent = events.find((event) => event.type === "question");
  assert.ok(questionEvent);
  assert.deepEqual(
    (questionEvent?.payload as { question: { options: Array<{ value: string }> } }).question.options,
    [{ value: "api", label: "API" }, { value: "bot", label: "Bot Telegram" }],
  );

  await session.cancel();
});

test("startPlanSession aceita input livre e repassa stderr como raw saneado", async () => {
  const interactiveProcess = new FakeInteractiveProcess();
  const rawEvents: string[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    spawnCodexInteractiveProcess: () =>
      interactiveProcess as unknown as import("node:child_process").ChildProcessWithoutNullStreams,
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: (event) => {
        if (event.type === "raw-sanitized") {
          rawEvents.push(event.text);
        }
      },
      onFailure: () => undefined,
    },
  });

  await session.sendUserInput("resposta em texto livre");
  assert.equal(interactiveProcess.stdinWrites.includes("resposta em texto livre\n"), true);

  interactiveProcess.stderr.write("\u001b[31mErro interativo\u001b[0m\n");
  assert.equal(rawEvents.length, 1);
  assert.equal(rawEvents[0], "Erro interativo");

  await session.cancel();
});

test("sendUserInput apos encerramento da sessao retorna erro de input", async () => {
  const interactiveProcess = new FakeInteractiveProcess();

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    spawnCodexInteractiveProcess: () =>
      interactiveProcess as unknown as import("node:child_process").ChildProcessWithoutNullStreams,
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: () => undefined,
    },
  });
  interactiveProcess.emitClose(0);

  await assert.rejects(
    () => session.sendUserInput("nova mensagem"),
    (error: unknown) => {
      assert.ok(error instanceof CodexPlanSessionError);
      assert.equal(error.phase, "input");
      assert.match(error.message, /sessao interativa ja foi encerrada/u);
      return true;
    },
  );
});

test("falha da sessao interativa retorna erro acionavel sem fallback batch (CA-19)", async () => {
  const interactiveProcess = new FakeInteractiveProcess();
  let batchCalls = 0;
  const failures: CodexPlanSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexCommand: async () => {
      batchCalls += 1;
      return { stdout: "nao deveria executar", stderr: "" };
    },
    spawnCodexInteractiveProcess: () =>
      interactiveProcess as unknown as import("node:child_process").ChildProcessWithoutNullStreams,
  });

  await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });

  interactiveProcess.emitClose(1);

  assert.equal(batchCalls, 0);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /Use \/plan_spec para tentar novamente/u);
  assert.match(failures[0]?.message ?? "", /sem fallback nao interativo/u);
});

test("cancelamento de sessao interativa encerra processo e notifica fechamento", async () => {
  const interactiveProcess = new FakeInteractiveProcess();
  const closes: Array<{ exitCode: number | null; cancelled: boolean }> = [];
  const failures: CodexPlanSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    spawnCodexInteractiveProcess: () =>
      interactiveProcess as unknown as import("node:child_process").ChildProcessWithoutNullStreams,
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
      onClose: (result) => closes.push(result),
    },
  });

  await session.cancel();

  assert.equal(interactiveProcess.stdinEnded, true);
  assert.deepEqual(interactiveProcess.killedSignals, ["SIGTERM"]);
  assert.equal(closes.length, 1);
  assert.equal(closes[0]?.cancelled, true);
  assert.equal(failures.length, 0);
});
