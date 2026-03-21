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
const STATUS_METADATA_PATTERN = /^\s*(?:-\s*)?Status\s*:\s*(.+?)\s*$/imu;
const IGNORED_OPEN_TICKET_FILE_NAMES = new Set(["README.md"]);
const RUNNABLE_TICKET_STATUSES = new Set<TicketCandidateStatus>(["open", "in-progress", "unknown"]);

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

export interface TicketBacklogSnapshot {
  runnableTickets: TicketRef[];
  blockedTickets: TicketRef[];
}

type TicketCandidateStatus = "open" | "in-progress" | "blocked" | "closed" | "unknown";

interface TicketCandidate {
  name: string;
  priorityRank: number;
  status: TicketCandidateStatus;
  runnable: boolean;
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
    const backlog = await this.describeOpenBacklog();
    const firstRunnableTicket = backlog.runnableTickets.at(0);
    if (!firstRunnableTicket) {
      return null;
    }

    return firstRunnableTicket;
  }

  async listOpenTickets(): Promise<TicketRef[]> {
    const candidates = await this.listPrioritizedOpenTicketCandidates();
    return candidates.map((candidate) => this.buildTicketRef(candidate.name));
  }

  async describeOpenBacklog(): Promise<TicketBacklogSnapshot> {
    const candidates = await this.listPrioritizedOpenTicketCandidates();
    return {
      runnableTickets: candidates
        .filter((candidate) => candidate.runnable)
        .map((candidate) => this.buildTicketRef(candidate.name)),
      blockedTickets: candidates
        .filter((candidate) => candidate.status === "blocked")
        .map((candidate) => this.buildTicketRef(candidate.name)),
    };
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
    const prioritizedCandidates = await Promise.all(candidates.map((name) => this.readCandidate(name)));

    return prioritizedCandidates.sort((a, b) => {
      const byPriority = a.priorityRank - b.priorityRank;
      if (byPriority !== 0) {
        return byPriority;
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }

  private async readCandidate(ticketName: string): Promise<TicketCandidate> {
    const ticketPath = path.join(this.openDir, ticketName);
    try {
      const ticketContent = await fs.readFile(ticketPath, "utf8");
      const status = this.extractTicketStatus(ticketContent);
      return {
        name: ticketName,
        priorityRank: this.extractPriorityRank(ticketContent),
        status,
        runnable: RUNNABLE_TICKET_STATUSES.has(status),
      };
    } catch {
      return {
        name: ticketName,
        priorityRank: FALLBACK_PRIORITY_RANK,
        status: "unknown",
        runnable: true,
      };
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

  private extractTicketStatus(ticketContent: string): TicketCandidateStatus {
    const rawStatus = ticketContent.match(STATUS_METADATA_PATTERN)?.[1]?.trim().toLowerCase();
    if (!rawStatus) {
      return "unknown";
    }

    if (
      rawStatus === "open" ||
      rawStatus === "in-progress" ||
      rawStatus === "blocked" ||
      rawStatus === "closed"
    ) {
      return rawStatus;
    }

    return "unknown";
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
