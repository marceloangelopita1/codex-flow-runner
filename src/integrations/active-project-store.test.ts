import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemActiveProjectStore } from "./active-project-store.js";

const createTempRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "active-project-store-"));

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

test("load retorna missing quando estado persistido nao existe", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemActiveProjectStore(rootPath);
    const result = await store.load();

    assert.deepEqual(result, { status: "missing" });
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("save persiste projeto ativo e load restaura estado valido", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemActiveProjectStore(rootPath);
    const saved = await store.save({
      name: "codex-flow-runner",
      path: "/home/mapita/projetos/codex-flow-runner",
    });

    assert.equal(saved.name, "codex-flow-runner");
    assert.equal(saved.path, "/home/mapita/projetos/codex-flow-runner");
    assert.match(saved.updatedAt, /^\d{4}-\d{2}-\d{2}T/u);

    const loaded = await store.load();
    assert.equal(loaded.status, "loaded");
    if (loaded.status === "loaded") {
      assert.equal(loaded.project.name, "codex-flow-runner");
      assert.equal(loaded.project.path, "/home/mapita/projetos/codex-flow-runner");
      assert.match(loaded.project.updatedAt, /^\d{4}-\d{2}-\d{2}T/u);
    }
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("load retorna invalid quando arquivo de estado possui JSON invalido", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemActiveProjectStore(rootPath);
    await fs.mkdir(path.dirname(store.stateFilePath), { recursive: true });
    await fs.writeFile(store.stateFilePath, "{invalid-json", "utf8");

    const loaded = await store.load();
    assert.equal(loaded.status, "invalid");
    if (loaded.status === "invalid") {
      assert.match(loaded.reason, /JSON invalido/u);
    }
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("load retorna invalid quando schema do estado persistido e invalido", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemActiveProjectStore(rootPath);
    await fs.mkdir(path.dirname(store.stateFilePath), { recursive: true });
    await fs.writeFile(
      store.stateFilePath,
      JSON.stringify(
        {
          name: "",
          path: "/tmp/projeto",
          updatedAt: "2026-02-19T17:34:00.000Z",
        },
        null,
        2,
      ),
      "utf8",
    );

    const loaded = await store.load();
    assert.equal(loaded.status, "invalid");
    if (loaded.status === "invalid") {
      assert.match(loaded.reason, /Schema invalido/u);
    }
  } finally {
    await cleanupTempRoot(rootPath);
  }
});
