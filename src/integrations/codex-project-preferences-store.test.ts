import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemCodexProjectPreferencesStore } from "./codex-project-preferences-store.js";

const createTempRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "codex-project-preferences-store-"));

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

test("load retorna null quando preferencias do projeto ainda nao existem", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemCodexProjectPreferencesStore(rootPath);
    const loaded = await store.load({
      name: "alpha-project",
      path: "/tmp/projects/alpha-project",
    });

    assert.equal(loaded, null);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("save persiste preferencias por projeto e load restaura o registro", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemCodexProjectPreferencesStore(rootPath);
    const saved = await store.save(
      {
        name: "alpha-project",
        path: "/tmp/projects/alpha-project",
      },
      {
        model: "gpt-5.4",
        reasoningEffort: "xhigh",
      },
    );

    assert.equal(saved.model, "gpt-5.4");
    assert.equal(saved.reasoningEffort, "xhigh");
    assert.equal(saved.source, "runner-local");

    const loaded = await store.load({
      name: "alpha-project",
      path: "/tmp/projects/alpha-project",
    });

    assert.deepEqual(loaded, saved);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("load falha quando o estado persistido possui JSON invalido", async () => {
  const rootPath = await createTempRoot();

  try {
    const store = new FileSystemCodexProjectPreferencesStore(rootPath);
    await fs.mkdir(path.dirname(store.stateFilePath), { recursive: true });
    await fs.writeFile(store.stateFilePath, "{invalid-json", "utf8");

    await assert.rejects(() => store.load({
      name: "alpha-project",
      path: "/tmp/projects/alpha-project",
    }), /JSON invalido/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});
