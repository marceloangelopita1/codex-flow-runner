import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitSyncEvidence {
  commitHash: string;
  upstream: string;
  commitPushId: string;
}

export interface GitCheckupPublicationEvidence extends GitSyncEvidence {
  reportCommitHash: string;
  metadataCommitHash: string;
}

export interface GitCheckupPublicationRequest {
  paths: string[];
  publicationSubject: string;
  publicationBodyParagraphs?: string[];
  finalizePublishedArtifacts: (reportCommitHash: string) => Promise<void>;
  metadataSubject: string;
  metadataBodyParagraphs?: string[];
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
  commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs?: string[],
  ): Promise<GitSyncEvidence | null>;
  commitCheckupArtifacts(
    request: GitCheckupPublicationRequest,
  ): Promise<GitCheckupPublicationEvidence | null>;
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
          env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0",
          },
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

    await this.runGit(buildTicketClosureCommitArgs(ticketName, execPlanPath));

    await this.runGit(["push"]);
  }

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs: string[] = [],
  ): Promise<GitSyncEvidence | null> {
    if (paths.length === 0) {
      return null;
    }

    await this.runGit(["add", "--", ...paths]);

    const changed = await this.hasStagedChanges();
    if (!changed) {
      return null;
    }

    const commitArgs = ["commit", "-m", subject];
    for (const paragraph of bodyParagraphs) {
      commitArgs.push("-m", paragraph);
    }

    await this.runGit(commitArgs);
    await this.runGit(["push"]);
    return this.collectPushEvidence({ requireCleanWorkingTree: false });
  }

  async commitCheckupArtifacts(
    request: GitCheckupPublicationRequest,
  ): Promise<GitCheckupPublicationEvidence | null> {
    if (request.paths.length === 0) {
      return null;
    }

    await this.runGit(["add", "--", ...request.paths]);

    const initialChanged = await this.hasStagedChanges();
    if (!initialChanged) {
      return null;
    }

    await this.runGit(
      buildCommitArgs(request.publicationSubject, request.publicationBodyParagraphs ?? []),
    );

    const reportCommitHash = (await this.runGit(["rev-parse", "HEAD"])).stdout.trim();
    if (!reportCommitHash) {
      throw new Error("Nao foi possivel identificar o commit inicial de publicacao do checkup.");
    }

    await request.finalizePublishedArtifacts(reportCommitHash);

    await this.runGit(["add", "--", ...request.paths]);

    const metadataChanged = await this.hasStagedChanges();
    if (!metadataChanged) {
      throw new Error(
        "A atualizacao final de report_commit_sha nao gerou alteracoes staged para o checkup.",
      );
    }

    await this.runGit(buildCommitArgs(request.metadataSubject, request.metadataBodyParagraphs ?? []));
    await this.runGit(["push"]);

    const evidence = await this.collectPushEvidence({ requireCleanWorkingTree: false });
    return {
      ...evidence,
      reportCommitHash,
      metadataCommitHash: evidence.commitHash,
    };
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    return this.collectPushEvidence({ requireCleanWorkingTree: true });
  }

  private async collectPushEvidence(params: {
    requireCleanWorkingTree: boolean;
  }): Promise<GitSyncEvidence> {
    if (params.requireCleanWorkingTree) {
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
    try {
      return await this.dependencies.runGit(args);
    } catch (error) {
      throw normalizeGitCommandError(args, error);
    }
  }
}

const buildCommitArgs = (subject: string, bodyParagraphs: string[]): string[] => {
  const commitArgs = ["commit", "-m", subject];
  for (const paragraph of bodyParagraphs) {
    commitArgs.push("-m", paragraph);
  }

  return commitArgs;
};

const COMMIT_MESSAGE_MAX_LINE_LENGTH = 100;
const TICKET_CLOSE_COMMIT_SUBJECT_PREFIX = "chore(tickets): close ";

const buildTicketClosureCommitArgs = (ticketName: string, execPlanPath: string): string[] =>
  buildCommitArgs(buildTicketClosureCommitSubject(ticketName), [
    formatCommitBodyField("Ticket", ticketName),
    formatCommitBodyField("ExecPlan", execPlanPath),
  ]);

const buildTicketClosureCommitSubject = (ticketName: string): string => {
  const subject = `${TICKET_CLOSE_COMMIT_SUBJECT_PREFIX}${ticketName}`;
  if (subject.length <= COMMIT_MESSAGE_MAX_LINE_LENGTH) {
    return subject;
  }

  const availableLength =
    COMMIT_MESSAGE_MAX_LINE_LENGTH - TICKET_CLOSE_COMMIT_SUBJECT_PREFIX.length;
  const compactTicketReference = buildCompactTicketReference(ticketName, availableLength);
  return `${TICKET_CLOSE_COMMIT_SUBJECT_PREFIX}${compactTicketReference}`;
};

const buildCompactTicketReference = (ticketName: string, maxLength: number): string => {
  const dateNumberMatch = /^(\d{4}-\d{2}-\d{2}(?:-\d+)?)/u.exec(ticketName);
  if (dateNumberMatch?.[1] && dateNumberMatch[1].length <= maxLength) {
    return dateNumberMatch[1];
  }

  return truncateCommitLineValue(ticketName, maxLength);
};

const formatCommitBodyField = (label: string, value: string): string => {
  const inline = `${label}: ${value}`;
  if (inline.length <= COMMIT_MESSAGE_MAX_LINE_LENGTH) {
    return inline;
  }

  return [`${label}:`, ...wrapCommitBodyValue(value)].join("\n");
};

const wrapCommitBodyValue = (value: string): string[] => {
  const indent = "  ";
  const maxChunkLength = COMMIT_MESSAGE_MAX_LINE_LENGTH - indent.length;
  const chunks: string[] = [];
  let remaining = value;

  while (remaining.length > maxChunkLength) {
    const breakIndex = findCommitLineBreakIndex(remaining, maxChunkLength);
    chunks.push(`${indent}${remaining.slice(0, breakIndex)}`);
    remaining = remaining.slice(breakIndex);
  }

  if (remaining.length > 0) {
    chunks.push(`${indent}${remaining}`);
  }

  return chunks;
};

const findCommitLineBreakIndex = (value: string, maxChunkLength: number): number => {
  const slashIndex = value.lastIndexOf("/", maxChunkLength - 1);
  if (slashIndex > 0) {
    return slashIndex + 1;
  }

  const hyphenIndex = value.lastIndexOf("-", maxChunkLength - 1);
  if (hyphenIndex > 0) {
    return hyphenIndex + 1;
  }

  return maxChunkLength;
};

const truncateCommitLineValue = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }

  return `${value.slice(0, maxLength - 3)}...`;
};

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
