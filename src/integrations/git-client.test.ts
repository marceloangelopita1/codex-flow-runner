import assert from "node:assert/strict";
import test from "node:test";
import { GitCliVersioning } from "./git-client.js";

interface CallResult {
  stdout: string;
  stderr: string;
}

test("commitTicketClosure faz push automaticamente apos commit", async () => {
  const calls: string[][] = [];
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      calls.push(args);
      if (args[0] === "diff") {
        throw new Error("ha alteracoes staged");
      }

      return { stdout: "", stderr: "" };
    },
  });

  await client.commitTicketClosure("2026-02-19-ticket.md", "execplans/2026-02-19-ticket.md");

  assert.deepEqual(calls, [
    ["add", "-A"],
    ["diff", "--cached", "--quiet"],
    [
      "commit",
      "-m",
      "chore(tickets): close 2026-02-19-ticket.md",
      "-m",
      "ExecPlan: execplans/2026-02-19-ticket.md",
    ],
    ["push"],
  ]);
});

test("commitTicketClosure nao faz commit/push quando nao ha alteracoes staged", async () => {
  const calls: string[][] = [];
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      calls.push(args);
      return { stdout: "", stderr: "" };
    },
  });

  await client.commitTicketClosure("2026-02-19-ticket.md", "execplans/2026-02-19-ticket.md");

  assert.deepEqual(calls, [
    ["add", "-A"],
    ["diff", "--cached", "--quiet"],
  ]);
});

test("commitTicketClosure propaga erro quando push falha", async () => {
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      if (args[0] === "diff") {
        throw new Error("ha alteracoes staged");
      }

      if (args[0] === "push") {
        throw new Error("push falhou");
      }

      return { stdout: "", stderr: "" };
    },
  });

  await assert.rejects(
    () => client.commitTicketClosure("2026-02-19-ticket.md", "execplans/2026-02-19-ticket.md"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /push falhou/u);
      return true;
    },
  );
});

test("commitTicketClosure inclui stderr do git quando push falha no wrapper controlado", async () => {
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      if (args[0] === "diff") {
        throw new Error("ha alteracoes staged");
      }

      if (args[0] === "push") {
        const error = new Error("Command failed");
        Object.assign(error, {
          stderr: "fatal: could not read Username for 'https://github.com': No such device or address",
        });
        throw error;
      }

      return { stdout: "", stderr: "" };
    },
  });

  await assert.rejects(
    () => client.commitTicketClosure("2026-02-19-ticket.md", "execplans/2026-02-19-ticket.md"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /git push falhou:/u);
      assert.match(error.message, /could not read Username/u);
      return true;
    },
  );
});

test("assertSyncedWithRemote valida repositorio limpo e sem commits pendentes", async () => {
  const calls: string[][] = [];
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      calls.push(args);
      if (args[0] === "status") {
        return { stdout: "", stderr: "" };
      }

      if (args[0] === "rev-parse" && args[1] === "--abbrev-ref") {
        return { stdout: "origin/main\n", stderr: "" };
      }

      if (args[0] === "rev-list") {
        return { stdout: "0\n", stderr: "" };
      }

      if (args[0] === "rev-parse" && args[1] === "HEAD") {
        return { stdout: "abc123\n", stderr: "" };
      }

      return { stdout: "", stderr: "" };
    },
  });

  const evidence = await client.assertSyncedWithRemote();

  assert.deepEqual(calls, [
    ["status", "--porcelain"],
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    ["rev-list", "--count", "origin/main..HEAD"],
    ["rev-parse", "HEAD"],
  ]);
  assert.deepEqual(evidence, {
    commitHash: "abc123",
    upstream: "origin/main",
    commitPushId: "abc123@origin/main",
  });
});

test("assertSyncedWithRemote falha quando ha alteracoes locais", async () => {
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      if (args[0] === "status") {
        return { stdout: " M src/core/runner.ts\n", stderr: "" };
      }

      return { stdout: "", stderr: "" };
    },
  });

  await assert.rejects(
    () => client.assertSyncedWithRemote(),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /alteracoes locais/u);
      return true;
    },
  );
});

test("assertSyncedWithRemote falha quando branch esta sem push", async () => {
  const client = new GitCliVersioning("/tmp/repo", {
    runGit: async (args): Promise<CallResult> => {
      if (args[0] === "status") {
        return { stdout: "", stderr: "" };
      }

      if (args[0] === "rev-parse") {
        return { stdout: "origin/main\n", stderr: "" };
      }

      if (args[0] === "rev-list") {
        return { stdout: "2\n", stderr: "" };
      }

      return { stdout: "", stderr: "" };
    },
  });

  await assert.rejects(
    () => client.assertSyncedWithRemote(),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /2 commit\(s\) sem push/u);
      return true;
    },
  );
});
