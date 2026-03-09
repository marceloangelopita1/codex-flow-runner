import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitSyncEvidence {
  commitHash: string;
  upstream: string;
  commitPushId: string;
}

export type GitSyncValidationFailureCode =
  | "working-tree-dirty"
  | "upstream-missing"
  | "upstream-unresolved"
  | "ahead-count-invalid"
  | "push-pending"
  | "head-missing";

export interface GitSyncValidationFailureDetails {
  workingTreeStatus?: string;
  upstream?: string;
  ahead?: number;
  rawAhead?: string;
}

export interface GitVersioning {
  commitTicketClosure(ticketName: string, execPlanPath: string): Promise<void>;
  assertSyncedWithRemote(): Promise<GitSyncEvidence>;
}

interface GitCommandResult {
  stdout: string;
  stderr: string;
}

interface GitCliVersioningDependencies {
  runGit: (args: string[]) => Promise<GitCommandResult>;
}

export class GitSyncValidationError extends Error {
  constructor(
    public readonly code: GitSyncValidationFailureCode,
    message: string,
    public readonly details: GitSyncValidationFailureDetails = {},
  ) {
    super(message);
    this.name = "GitSyncValidationError";
  }
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

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    const workingTreeStatus = (await this.runGit(["status", "--porcelain"])).stdout.trim();
    if (workingTreeStatus.length > 0) {
      throw new GitSyncValidationError(
        "working-tree-dirty",
        "Repositorio com alteracoes locais apos close-and-version.",
        {
          workingTreeStatus,
        },
      );
    }

    let upstream = "";
    try {
      upstream = (
        await this.runGit(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
      ).stdout.trim();
    } catch {
      throw new GitSyncValidationError(
        "upstream-missing",
        "Branch atual sem upstream configurado para validar push obrigatorio.",
      );
    }

    if (!upstream) {
      throw new GitSyncValidationError(
        "upstream-unresolved",
        "Nao foi possivel identificar upstream para validar push obrigatorio.",
      );
    }

    const aheadRaw = (await this.runGit(["rev-list", "--count", `${upstream}..HEAD`])).stdout.trim();
    const ahead = Number.parseInt(aheadRaw, 10);
    if (Number.isNaN(ahead)) {
      throw new GitSyncValidationError(
        "ahead-count-invalid",
        `Valor invalido ao validar commits sem push: "${aheadRaw}".`,
        {
          upstream,
          rawAhead: aheadRaw,
        },
      );
    }

    if (ahead > 0) {
      throw new GitSyncValidationError(
        "push-pending",
        `Push obrigatorio nao concluido para ${upstream}: ${ahead} commit(s) sem push.`,
        {
          upstream,
          ahead,
        },
      );
    }

    const commitHash = (await this.runGit(["rev-parse", "HEAD"])).stdout.trim();
    if (!commitHash) {
      throw new GitSyncValidationError(
        "head-missing",
        "Nao foi possivel identificar hash HEAD apos validar push obrigatorio.",
        {
          upstream,
        },
      );
    }

    return {
      commitHash,
      upstream,
      commitPushId: `${commitHash}@${upstream}`,
    };
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
