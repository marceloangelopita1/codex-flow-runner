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

test("listOpenTickets retorna lista completa em ordem deterministica de prioridade e nome", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);
    await queue.ensureStructure();

    await Promise.all([
      writeOpenTicket(repoPath, "2026-02-19-z-sem-prioridade.md"),
      writeOpenTicket(repoPath, "2026-02-19-c-p1.md", "P1"),
      writeOpenTicket(repoPath, "2026-02-19-a-p0.md", "P0"),
      writeOpenTicket(repoPath, "2026-02-19-b-p1.md", "P1"),
    ]);

    const listedTickets = await queue.listOpenTickets();
    assert.deepEqual(
      listedTickets.map((ticket) => ticket.name),
      [
        "2026-02-19-a-p0.md",
        "2026-02-19-b-p1.md",
        "2026-02-19-c-p1.md",
        "2026-02-19-z-sem-prioridade.md",
      ],
    );
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("readOpenTicket retorna conteudo completo quando ticket existe", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);
    await queue.ensureStructure();

    const ticketName = "2026-02-19-ticket-longo.md";
    await writeOpenTicket(repoPath, ticketName, "P1");

    const result = await queue.readOpenTicket(ticketName);
    assert.equal(result.status, "found");
    if (result.status !== "found") {
      return;
    }

    assert.equal(result.ticket.name, ticketName);
    assert.match(result.content, /# \[TICKET\] 2026-02-19-ticket-longo\.md/u);
    assert.match(result.content, /- Priority: P1/u);
  } finally {
    await cleanupTempRepo(repoPath);
  }
});

test("readOpenTicket retorna not-found para ticket ausente em tickets/open", async () => {
  const repoPath = await createTempRepo();
  try {
    const queue = new FileSystemTicketQueue(repoPath);
    await queue.ensureStructure();

    const result = await queue.readOpenTicket("2026-02-19-inexistente.md");
    assert.deepEqual(result, {
      status: "not-found",
      ticketName: "2026-02-19-inexistente.md",
    });
  } finally {
    await cleanupTempRepo(repoPath);
  }
});
