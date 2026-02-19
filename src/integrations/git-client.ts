import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitVersioning {
  commitTicketClosure(ticketName: string, execPlanPath: string): Promise<void>;
  assertSyncedWithRemote(): Promise<void>;
}

interface GitCommandResult {
  stdout: string;
  stderr: string;
}

interface GitCliVersioningDependencies {
  runGit: (args: string[]) => Promise<GitCommandResult>;
}

export class GitCliVersioning implements GitVersioning {
  private readonly dependencies: GitCliVersioningDependencies;

  constructor(
    private readonly repoPath: string,
    dependencies: Partial<GitCliVersioningDependencies> = {},
  ) {
    this.dependencies = {
      runGit: async (args) =>
        execFileAsync("git", args, {
          cwd: this.repoPath,
        }),
      ...dependencies,
    };
  }

  async commitTicketClosure(ticketName: string, execPlanPath: string): Promise<void> {
    await this.runGit(["add", "-A"]);

    const changed = await this.hasStagedChanges();
    if (!changed) {
      return;
    }

    await this.runGit([
      "commit",
      "-m",
      `chore(tickets): close ${ticketName}`,
      "-m",
      `ExecPlan: ${execPlanPath}`,
    ]);

    await this.runGit(["push"]);
  }

  async assertSyncedWithRemote(): Promise<void> {
    const workingTreeStatus = (await this.runGit(["status", "--porcelain"])).stdout.trim();
    if (workingTreeStatus.length > 0) {
      throw new Error("Repositorio com alteracoes locais apos close-and-version.");
    }

    let upstream = "";
    try {
      upstream = (
        await this.runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
      ).stdout.trim();
    } catch {
      throw new Error("Branch atual sem upstream configurado para validar push obrigatorio.");
    }

    if (!upstream) {
      throw new Error("Nao foi possivel identificar upstream para validar push obrigatorio.");
    }

    const aheadRaw = (await this.runGit(["rev-list", "--count", `${upstream}..HEAD`])).stdout.trim();
    const ahead = Number.parseInt(aheadRaw, 10);
    if (Number.isNaN(ahead)) {
      throw new Error(`Valor invalido ao validar commits sem push: "${aheadRaw}".`);
    }

    if (ahead > 0) {
      throw new Error(`Push obrigatorio nao concluido: ${ahead} commit(s) sem push.`);
    }
  }

  private async hasStagedChanges(): Promise<boolean> {
    try {
      await this.runGit(["diff", "--cached", "--quiet"]);
      return false;
    } catch {
      return true;
    }
  }

  private async runGit(args: string[]): Promise<GitCommandResult> {
    return this.dependencies.runGit(args);
  }
}
