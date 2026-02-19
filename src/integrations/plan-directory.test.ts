import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolvePlanDirectoryName } from "./plan-directory.js";

const createTempRepo = async (): Promise<string> => fs.mkdtemp(path.join(os.tmpdir(), "plan-dir-"));

const cleanupTempRepo = async (repoPath: string): Promise<void> => {
  await fs.rm(repoPath, { recursive: true, force: true });
};

test("resolvePlanDirectoryName usa plans quando apenas plans existe", async () => {
  const repoPath = await createTempRepo();
  try {
    await fs.mkdir(path.join(repoPath, "plans"), { recursive: true });

    const resolved = await resolvePlanDirectoryName(repoPath);
    assert.equal(resolved, "plans");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("resolvePlanDirectoryName usa execplans quando apenas execplans existe", async () => {
  const repoPath = await createTempRepo();
  try {
    await fs.mkdir(path.join(repoPath, "execplans"), { recursive: true });

    const resolved = await resolvePlanDirectoryName(repoPath);
    assert.equal(resolved, "execplans");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("resolvePlanDirectoryName usa plans quando ambos existem e so plans tem markdown", async () => {
  const repoPath = await createTempRepo();
  try {
    await fs.mkdir(path.join(repoPath, "plans"), { recursive: true });
    await fs.mkdir(path.join(repoPath, "execplans"), { recursive: true });
    await fs.writeFile(path.join(repoPath, "plans", "2026-02-19-sample.md"), "# sample\n");

    const resolved = await resolvePlanDirectoryName(repoPath);
    assert.equal(resolved, "plans");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("resolvePlanDirectoryName usa execplans quando ambos existem e execplans tem markdown", async () => {
  const repoPath = await createTempRepo();
  try {
    await fs.mkdir(path.join(repoPath, "plans"), { recursive: true });
    await fs.mkdir(path.join(repoPath, "execplans"), { recursive: true });
    await fs.writeFile(path.join(repoPath, "execplans", "2026-02-19-sample.md"), "# sample\n");

    const resolved = await resolvePlanDirectoryName(repoPath);
    assert.equal(resolved, "execplans");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("resolvePlanDirectoryName usa execplans quando nenhum diretorio existe", async () => {
  const repoPath = await createTempRepo();
  try {
    const resolved = await resolvePlanDirectoryName(repoPath);
    assert.equal(resolved, "execplans");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});
