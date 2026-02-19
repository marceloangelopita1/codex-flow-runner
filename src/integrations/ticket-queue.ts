import { promises as fs } from "node:fs";
import path from "node:path";
import { resolvePlanDirectoryPath } from "./plan-directory.js";

export interface TicketRef {
  name: string;
  openPath: string;
  closedPath: string;
}

export interface TicketQueue {
  nextOpenTicket(): Promise<TicketRef | null>;
  ensureStructure(): Promise<void>;
  closeTicket(ticket: TicketRef): Promise<void>;
}

export class FileSystemTicketQueue implements TicketQueue {
  private readonly openDir: string;
  private readonly closedDir: string;

  constructor(private readonly repoPath: string) {
    this.openDir = path.join(this.repoPath, "tickets", "open");
    this.closedDir = path.join(this.repoPath, "tickets", "closed");
  }

  async ensureStructure(): Promise<void> {
    const planDirectoryPath = await resolvePlanDirectoryPath(this.repoPath);

    await Promise.all([
      fs.mkdir(this.openDir, { recursive: true }),
      fs.mkdir(this.closedDir, { recursive: true }),
      fs.mkdir(planDirectoryPath, { recursive: true }),
    ]);
  }

  async nextOpenTicket(): Promise<TicketRef | null> {
    let files: string[] = [];
    try {
      files = await fs.readdir(this.openDir);
    } catch {
      return null;
    }

    const candidates = files
      .filter((file) => file.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    const name = candidates[0];
    if (!name) {
      return null;
    }

    return {
      name,
      openPath: path.join(this.openDir, name),
      closedPath: path.join(this.closedDir, name),
    };
  }

  async closeTicket(ticket: TicketRef): Promise<void> {
    await fs.mkdir(path.dirname(ticket.closedPath), { recursive: true });
    await fs.rename(ticket.openPath, ticket.closedPath);
  }
}
