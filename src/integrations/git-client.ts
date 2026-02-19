import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitVersioning {
  commitTicketClosure(ticketName: string, execPlanPath: string): Promise<void>;
}

export class GitCliVersioning implements GitVersioning {
  constructor(
    private readonly repoPath: string,
    private readonly autoPush: boolean,
  ) {}

  async commitTicketClosure(ticketName: string, execPlanPath: string): Promise<void> {
    await this.git(["add", "-A"]);

    const changed = await this.hasStagedChanges();
    if (!changed) {
      return;
    }

    await this.git([
      "commit",
      "-m",
      `chore(tickets): close ${ticketName}`,
      "-m",
      `ExecPlan: ${execPlanPath}`,
    ]);

    if (this.autoPush) {
      await this.git(["push"]);
    }
  }

  private async hasStagedChanges(): Promise<boolean> {
    try {
      await this.git(["diff", "--cached", "--quiet"]);
      return false;
    } catch {
      return true;
    }
  }

  private async git(args: string[]): Promise<void> {
    await execFileAsync("git", args, { cwd: this.repoPath });
  }
}
