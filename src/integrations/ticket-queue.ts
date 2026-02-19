import { promises as fs } from "node:fs";
import path from "node:path";
import { resolvePlanDirectoryPath } from "./plan-directory.js";

const PRIORITY_RANK: Readonly<Record<string, number>> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

const FALLBACK_PRIORITY_RANK = 3;
const PRIORITY_METADATA_PATTERN = /^\s*(?:-\s*)?Priority\s*:\s*(P[0-2])\b/imu;

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

interface TicketCandidate {
  name: string;
  priorityRank: number;
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

    const candidates = files.filter((file) => file.endsWith(".md"));
    const prioritizedCandidates = await Promise.all(
      candidates.map(async (name): Promise<TicketCandidate> => ({
        name,
        priorityRank: await this.readPriorityRank(name),
      })),
    );

    const name = prioritizedCandidates
      .sort((a, b) => {
        const byPriority = a.priorityRank - b.priorityRank;
        if (byPriority !== 0) {
          return byPriority;
        }
        return a.name.localeCompare(b.name, "pt-BR");
      })
      .at(0)?.name;
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

  private async readPriorityRank(ticketName: string): Promise<number> {
    const ticketPath = path.join(this.openDir, ticketName);
    try {
      const ticketContent = await fs.readFile(ticketPath, "utf8");
      return this.extractPriorityRank(ticketContent);
    } catch {
      return FALLBACK_PRIORITY_RANK;
    }
  }

  private extractPriorityRank(ticketContent: string): number {
    const priorityMatch = ticketContent.match(PRIORITY_METADATA_PATTERN);
    const priority = priorityMatch?.[1]?.toUpperCase();
    if (!priority) {
      return FALLBACK_PRIORITY_RANK;
    }
    return PRIORITY_RANK[priority] ?? FALLBACK_PRIORITY_RANK;
  }
}
