import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemTicketQueue } from "./ticket-queue.js";

const createTempRepo = async (): Promise<string> => fs.mkdtemp(path.join(os.tmpdir(), "ticket-queue-"));

const cleanupTempRepo = async (repoPath: string): Promise<void> => {
  await fs.rm(repoPath, { recursive: true, force: true });
};

const pathExists = async (value: string): Promise<boolean> => {
  try {
    await fs.stat(value);
    return true;
  } catch {
    return false;
  }
};

test("ensureStructure usa plans quando repositorio ja adota essa convencao", async () => {
  const repoPath = await createTempRepo();
  try {
    await fs.mkdir(path.join(repoPath, "plans"), { recursive: true });
    const queue = new FileSystemTicketQueue(repoPath);

    await queue.ensureStructure();

    assert.equal(await pathExists(path.join(repoPath, "tickets", "open")), true);
    assert.equal(await pathExists(path.join(repoPath, "tickets", "closed")), true);
    assert.equal(await pathExists(path.join(repoPath, "plans")), true);
    assert.equal(await pathExists(path.join(repoPath, "execplans")), false);
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("ensureStructure cria execplans por padrao quando nenhum diretorio de plano existe", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);

    await queue.ensureStructure();

    assert.equal(await pathExists(path.join(repoPath, "tickets", "open")), true);
    assert.equal(await pathExists(path.join(repoPath, "tickets", "closed")), true);
    assert.equal(await pathExists(path.join(repoPath, "execplans")), true);
  } finally {
    await cleanupTempRepo(repoPath);
  }
});
