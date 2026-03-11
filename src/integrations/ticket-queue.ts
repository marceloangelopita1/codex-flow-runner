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
const IGNORED_OPEN_TICKET_FILE_NAMES = new Set(["README.md"]);

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

export type ReadOpenTicketResult =
  | {
      status: "found";
      ticket: TicketRef;
      content: string;
    }
  | {
      status: "not-found";
      ticketName: string;
    }
  | {
      status: "invalid-name";
      ticketName: string;
    };

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
    const candidates = await this.listPrioritizedOpenTicketCandidates();
    const firstCandidate = candidates.at(0);
    if (!firstCandidate) {
      return null;
    }

    return this.buildTicketRef(firstCandidate.name);
  }

  async listOpenTickets(): Promise<TicketRef[]> {
    const candidates = await this.listPrioritizedOpenTicketCandidates();
    return candidates.map((candidate) => this.buildTicketRef(candidate.name));
  }

  async readOpenTicket(ticketName: string): Promise<ReadOpenTicketResult> {
    const normalizedTicketName = ticketName.trim();
    if (!this.isValidTicketName(normalizedTicketName)) {
      return {
        status: "invalid-name",
        ticketName: normalizedTicketName,
      };
    }

    if (this.shouldIgnoreOpenTicketFile(normalizedTicketName)) {
      return {
        status: "not-found",
        ticketName: normalizedTicketName,
      };
    }

    const ticketPath = path.join(this.openDir, normalizedTicketName);
    try {
      const content = await fs.readFile(ticketPath, "utf8");
      return {
        status: "found",
        ticket: this.buildTicketRef(normalizedTicketName),
        content,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return {
          status: "not-found",
          ticketName: normalizedTicketName,
        };
      }
      throw error;
    }
  }

  async closeTicket(ticket: TicketRef): Promise<void> {
    await fs.mkdir(path.dirname(ticket.closedPath), { recursive: true });
    await fs.rename(ticket.openPath, ticket.closedPath);
  }

  private async listPrioritizedOpenTicketCandidates(): Promise<TicketCandidate[]> {
    let files: string[] = [];
    try {
      files = await fs.readdir(this.openDir);
    } catch {
      return [];
    }

    const candidates = files.filter(
      (file) => file.endsWith(".md") && !this.shouldIgnoreOpenTicketFile(file),
    );
    const prioritizedCandidates = await Promise.all(
      candidates.map(async (name): Promise<TicketCandidate> => ({
        name,
        priorityRank: await this.readPriorityRank(name),
      })),
    );

    return prioritizedCandidates.sort((a, b) => {
      const byPriority = a.priorityRank - b.priorityRank;
      if (byPriority !== 0) {
        return byPriority;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
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

  private buildTicketRef(ticketName: string): TicketRef {
    return {
      name: ticketName,
      openPath: path.join(this.openDir, ticketName),
      closedPath: path.join(this.closedDir, ticketName),
    };
  }

  private shouldIgnoreOpenTicketFile(ticketName: string): boolean {
    return IGNORED_OPEN_TICKET_FILE_NAMES.has(ticketName);
  }

  private isValidTicketName(ticketName: string): boolean {
    return (
      ticketName.length > 0 &&
      ticketName.endsWith(".md") &&
      !ticketName.includes("/") &&
      !ticketName.includes("\\") &&
      !ticketName.includes("..")
    );
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    );
  }
}
