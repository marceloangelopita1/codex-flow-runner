import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface GitCommandResult {
  stdout: string;
  stderr: string;
}

interface GitCliTargetPrepareGuardDependencies {
  runGit: (args: string[]) => Promise<GitCommandResult>;
}

export interface TargetPrepareGitGuard {
  assertCleanWorkingTree(): Promise<void>;
  listChangedPaths(): Promise<string[]>;
  getCurrentBranch(): Promise<string | null>;
  getHeadSha(): Promise<string | null>;
}

export class TargetPrepareWorkingTreeDirtyError extends Error {
  constructor(public readonly statusOutput: string) {
    super(
      [
        "O target_prepare exige working tree limpo antes de iniciar.",
        `Status atual: ${statusOutput || "(nao informado)"}.`,
      ].join(" "),
    );
    this.name = "TargetPrepareWorkingTreeDirtyError";
  }
}

export class GitCliTargetPrepareGuard implements TargetPrepareGitGuard {
  private readonly dependencies: GitCliTargetPrepareGuardDependencies;

  constructor(
    private readonly repoPath: string,
    dependencies: Partial<GitCliTargetPrepareGuardDependencies> = {},
  ) {
    this.dependencies = {
      runGit: async (args) =>
        execFileAsync("git", args, {
          cwd: this.repoPath,
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0",
          },
        }),
      ...dependencies,
    };
  }

  async assertCleanWorkingTree(): Promise<void> {
    const statusOutput = (await this.runGit(["status", "--porcelain", "--untracked-files=all"]))
      .stdout.trim();
    if (statusOutput.length > 0) {
      throw new TargetPrepareWorkingTreeDirtyError(statusOutput);
    }
  }

  async listChangedPaths(): Promise<string[]> {
    const rawOutput = (await this.runGit(["status", "--porcelain", "--untracked-files=all"]))
      .stdout;

    const changedPaths = new Set<string>();
    for (const rawLine of rawOutput.split("\n")) {
      const line = rawLine.trimEnd();
      if (!line.trim()) {
        continue;
      }

      const candidate = line.slice(3).trim();
      if (!candidate) {
        continue;
      }

      if (candidate.includes(" -> ")) {
        for (const entry of candidate.split(" -> ")) {
          if (entry) {
            changedPaths.add(unquoteGitPath(entry));
          }
        }
        continue;
      }

      changedPaths.add(unquoteGitPath(candidate));
    }

    return Array.from(changedPaths).sort((left, right) => left.localeCompare(right, "pt-BR"));
  }

  async getCurrentBranch(): Promise<string | null> {
    try {
      const value = (await this.runGit(["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim();
      return value || null;
    } catch {
      return null;
    }
  }

  async getHeadSha(): Promise<string | null> {
    try {
      const value = (await this.runGit(["rev-parse", "HEAD"])).stdout.trim();
      return value || null;
    } catch {
      return null;
    }
  }

  private async runGit(args: string[]): Promise<GitCommandResult> {
    try {
      return await this.dependencies.runGit(args);
    } catch (error) {
      throw normalizeGitCommandError(args, error);
    }
  }
}

const normalizeGitCommandError = (args: string[], error: unknown): Error => {
  const stderr = readGitCommandOutput(error, "stderr");
  const stdout = readGitCommandOutput(error, "stdout");
  const command = `git ${args.join(" ")}`;
  const details = stderr || stdout;

  if (details) {
    return new Error(`${command} falhou: ${details}`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(String(error));
};

const readGitCommandOutput = (error: unknown, stream: "stdout" | "stderr"): string => {
  if (typeof error !== "object" || error === null || !(stream in error)) {
    return "";
  }

  const value = (error as Record<"stdout" | "stderr", unknown>)[stream];
  if (typeof value === "string") {
    return value.trim();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("utf8").trim();
  }

  return "";
};

const unquoteGitPath = (value: string): string =>
  value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
