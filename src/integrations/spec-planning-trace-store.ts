import { promises as fs } from "node:fs";
import path from "node:path";

const TRACE_ROOT_DIR = "spec_planning";
const REQUESTS_DIR = "requests";
const RESPONSES_DIR = "responses";
const DECISIONS_DIR = "decisions";

export type SpecPlanningTraceStage = "plan-spec-materialize" | "plan-spec-version-and-push";

export interface SpecPlanningTraceSessionRequest {
  sessionId: number;
  chatId: string;
  specPath: string;
  specFileName: string;
  specTitle: string;
  specSummary: string;
  commitMessage: string;
  createdAt: Date;
}

export interface SpecPlanningTraceSession {
  traceId: string;
  requestPath: string;
  materializeResponsePath: string;
  versionAndPushResponsePath: string;
  decisionPath: string;
}

export interface SpecPlanningTraceStore {
  startSession(request: SpecPlanningTraceSessionRequest): Promise<SpecPlanningTraceSession>;
  writeStageResponse(
    relativePath: string,
    response: {
      stage: SpecPlanningTraceStage;
      output: string;
      recordedAt: Date;
    },
  ): Promise<void>;
}

export class FileSystemSpecPlanningTraceStore implements SpecPlanningTraceStore {
  constructor(private readonly projectPath: string) {}

  async startSession(request: SpecPlanningTraceSessionRequest): Promise<SpecPlanningTraceSession> {
    await this.ensureBaseStructure();
    const traceId = await this.allocateTraceId(request.createdAt, request.sessionId);

    const session: SpecPlanningTraceSession = {
      traceId,
      requestPath: this.buildRequestPath(traceId),
      materializeResponsePath: this.buildResponsePath(traceId, "materialize"),
      versionAndPushResponsePath: this.buildResponsePath(traceId, "version-and-push"),
      decisionPath: this.buildDecisionPath(traceId),
    };

    await this.writeRelativeFile(session.requestPath, this.buildRequestContent(request));
    await this.writeRelativeFile(
      session.decisionPath,
      JSON.stringify(
        {
          action: "create-spec",
          sessionId: request.sessionId,
          chatId: request.chatId,
          specPath: request.specPath,
          specFileName: request.specFileName,
          specTitle: request.specTitle,
          specSummary: request.specSummary,
          commitMessage: request.commitMessage,
          recordedAtUtc: request.createdAt.toISOString(),
        },
        null,
        2,
      ).concat("\n"),
    );

    return session;
  }

  async writeStageResponse(
    relativePath: string,
    response: {
      stage: SpecPlanningTraceStage;
      output: string;
      recordedAt: Date;
    },
  ): Promise<void> {
    const content = [
      "# Spec planning response",
      "",
      `- Stage: ${response.stage}`,
      `- Recorded at (UTC): ${response.recordedAt.toISOString()}`,
      "",
      "## Output",
      response.output.trim() || "(vazio)",
      "",
    ].join("\n");
    await this.writeRelativeFile(relativePath, content);
  }

  private buildRequestContent(request: SpecPlanningTraceSessionRequest): string {
    return [
      "# Spec planning request",
      "",
      `- Session ID: ${request.sessionId}`,
      `- Chat ID: ${request.chatId}`,
      `- Recorded at (UTC): ${request.createdAt.toISOString()}`,
      `- Spec path: ${request.specPath}`,
      `- Spec file: ${request.specFileName}`,
      `- Commit message: ${request.commitMessage}`,
      "",
      "## Final block",
      `- Title: ${request.specTitle}`,
      `- Summary: ${request.specSummary}`,
      "",
    ].join("\n");
  }

  private async ensureBaseStructure(): Promise<void> {
    await fs.mkdir(this.resolveRelativeDir(REQUESTS_DIR), { recursive: true });
    await fs.mkdir(this.resolveRelativeDir(RESPONSES_DIR), { recursive: true });
    await fs.mkdir(this.resolveRelativeDir(DECISIONS_DIR), { recursive: true });
  }

  private async allocateTraceId(createdAt: Date, sessionId: number): Promise<string> {
    const baseTraceId = `${formatTraceTimestamp(createdAt)}-s${sessionId}`;
    const maxAttempts = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = attempt === 0 ? baseTraceId : `${baseTraceId}-${attempt + 1}`;
      const requestExists = await this.relativePathExists(this.buildRequestPath(candidate));
      const decisionExists = await this.relativePathExists(this.buildDecisionPath(candidate));
      if (!requestExists && !decisionExists) {
        return candidate;
      }
    }

    throw new Error(
      "Nao foi possivel alocar identificador unico para trilha spec_planning da sessao /plan_spec.",
    );
  }

  private async relativePathExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolveRelativeFile(relativePath));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao verificar trilha ${relativePath}: ${details}`);
    }
  }

  private async writeRelativeFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = this.resolveRelativeFile(relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }

  private buildRequestPath(traceId: string): string {
    return path.posix.join(TRACE_ROOT_DIR, REQUESTS_DIR, `${traceId}-request.md`);
  }

  private buildResponsePath(traceId: string, suffix: "materialize" | "version-and-push"): string {
    return path.posix.join(TRACE_ROOT_DIR, RESPONSES_DIR, `${traceId}-${suffix}.md`);
  }

  private buildDecisionPath(traceId: string): string {
    return path.posix.join(TRACE_ROOT_DIR, DECISIONS_DIR, `${traceId}-decision.json`);
  }

  private resolveRelativeDir(relativeDirectory: string): string {
    return path.join(this.projectPath, TRACE_ROOT_DIR, relativeDirectory);
  }

  private resolveRelativeFile(relativePath: string): string {
    const segments = relativePath.split("/");
    return path.join(this.projectPath, ...segments);
  }
}

const formatTraceTimestamp = (value: Date): string =>
  value
    .toISOString()
    .replace(/\.\d{3}Z$/u, "Z")
    .replace(/[-:]/gu, "")
    .toLowerCase();
