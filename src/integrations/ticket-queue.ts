import { promises as fs } from "node:fs";
import path from "node:path";

export interface TicketQueue {
  nextOpenTicket(): Promise<string | null>;
}

export class FileSystemTicketQueue implements TicketQueue {
  constructor(private readonly repoPath: string) {}

  async nextOpenTicket(): Promise<string | null> {
    const openDir = path.join(this.repoPath, "tickets", "open");

    let files: string[] = [];
    try {
      files = await fs.readdir(openDir);
    } catch {
      return null;
    }

    const candidates = files
      .filter((file) => file.endsWith(".md"))
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    return candidates[0] ?? null;
  }
}
