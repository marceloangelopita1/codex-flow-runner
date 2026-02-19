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

const writeOpenTicket = async (
  repoPath: string,
  ticketName: string,
  priority?: string,
): Promise<void> => {
  const ticketPath = path.join(repoPath, "tickets", "open", ticketName);
  const lines = [`# [TICKET] ${ticketName}`, "", "## Metadata"];
  if (priority) {
    lines.push(`- Priority: ${priority}`);
  }
  await fs.writeFile(ticketPath, `${lines.join("\n")}\n`, "utf8");
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

test("nextOpenTicket prioriza P0 antes de P1 e P2", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);
    await queue.ensureStructure();

    await Promise.all([
      writeOpenTicket(repoPath, "2026-02-19-zeta.md", "P2"),
      writeOpenTicket(repoPath, "2026-02-19-alpha.md", "P1"),
      writeOpenTicket(repoPath, "2026-02-19-middle.md", "P0"),
    ]);

    const nextTicket = await queue.nextOpenTicket();
    assert.equal(nextTicket?.name, "2026-02-19-middle.md");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("nextOpenTicket usa fallback por nome quando prioridade empata", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);
    await queue.ensureStructure();

    await Promise.all([
      writeOpenTicket(repoPath, "2026-02-19-b.md", "P1"),
      writeOpenTicket(repoPath, "2026-02-19-a.md", "P1"),
      writeOpenTicket(repoPath, "2026-02-19-c.md", "P2"),
    ]);

    const nextTicket = await queue.nextOpenTicket();
    assert.equal(nextTicket?.name, "2026-02-19-a.md");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("nextOpenTicket trata prioridade ausente como menor prioridade", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);
    await queue.ensureStructure();

    await Promise.all([
      writeOpenTicket(repoPath, "2026-02-19-a-sem-prioridade.md"),
      writeOpenTicket(repoPath, "2026-02-19-z-com-p2.md", "P2"),
    ]);

    const nextTicket = await queue.nextOpenTicket();
    assert.equal(nextTicket?.name, "2026-02-19-z-com-p2.md");
  } finally {
    await cleanupTempRepo(repoPath);
  }
});
