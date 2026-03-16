import { promises as fs } from "node:fs";
import path from "node:path";
import type { CodexStageDiagnostics, SpecFlowStage, TicketFlowStage } from "./codex-client.js";

const TRACE_ROOT_DIR = ".codex-flow-runner/flow-traces";
const REQUESTS_DIR = "requests";
const RESPONSES_DIR = "responses";
const DECISIONS_DIR = "decisions";

export type WorkflowTraceStage = TicketFlowStage | Extract<SpecFlowStage, "spec-triage" | "spec-close-and-version" | "spec-audit">;
export type WorkflowTraceTargetKind = "ticket" | "spec";
export type WorkflowTraceSourceCommand = "run-all" | "run-specs" | "run-ticket";

export interface WorkflowTraceDecision {
  status: "success" | "failure";
  summary: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStageTraceRecordRequest {
  kind: WorkflowTraceTargetKind;
  stage: WorkflowTraceStage;
  sourceCommand: WorkflowTraceSourceCommand;
  targetName: string;
  targetPath: string;
  promptTemplatePath: string;
  promptText: string;
  outputText: string;
  diagnostics?: CodexStageDiagnostics;
  decision: WorkflowTraceDecision;
  recordedAt: Date;
}

export interface WorkflowStageTraceRecord {
  traceId: string;
  requestPath: string;
  responsePath: string;
  decisionPath: string;
}

export interface WorkflowTraceStore {
  recordStageTrace(request: WorkflowStageTraceRecordRequest): Promise<WorkflowStageTraceRecord>;
}

export class FileSystemWorkflowTraceStore implements WorkflowTraceStore {
  constructor(private readonly projectPath: string) {}

  async recordStageTrace(
    request: WorkflowStageTraceRecordRequest,
  ): Promise<WorkflowStageTraceRecord> {
    await this.ensureBaseStructure();
    const traceId = await this.allocateTraceId(request);

    const record: WorkflowStageTraceRecord = {
      traceId,
      requestPath: this.buildRequestPath(traceId),
      responsePath: this.buildResponsePath(traceId),
      decisionPath: this.buildDecisionPath(traceId),
    };

    await this.writeRelativeFile(record.requestPath, this.buildRequestContent(request));
    await this.writeRelativeFile(record.responsePath, this.buildResponseContent(request));
    await this.writeRelativeFile(
      record.decisionPath,
      JSON.stringify(
        {
          kind: request.kind,
          stage: request.stage,
          sourceCommand: request.sourceCommand,
          targetName: request.targetName,
          targetPath: request.targetPath,
          recordedAtUtc: request.recordedAt.toISOString(),
          decision: request.decision,
          diagnostics: request.diagnostics ?? null,
        },
        null,
        2,
      ).concat("\n"),
    );

    return record;
  }

  private buildRequestContent(request: WorkflowStageTraceRecordRequest): string {
    return [
      "# Workflow stage request",
      "",
      `- Kind: ${request.kind}`,
      `- Stage: ${request.stage}`,
      `- Source command: ${request.sourceCommand}`,
      `- Target name: ${request.targetName}`,
      `- Target path: ${request.targetPath}`,
      `- Prompt template path: ${request.promptTemplatePath}`,
      `- Recorded at (UTC): ${request.recordedAt.toISOString()}`,
      "",
      "## Prompt",
      request.promptText.trim() || "(vazio)",
      "",
    ].join("\n");
  }

  private buildResponseContent(request: WorkflowStageTraceRecordRequest): string {
    return [
      "# Workflow stage response",
      "",
      `- Kind: ${request.kind}`,
      `- Stage: ${request.stage}`,
      `- Target name: ${request.targetName}`,
      `- Recorded at (UTC): ${request.recordedAt.toISOString()}`,
      ...(request.diagnostics?.stdoutPreview
        ? [`- Stdout preview: ${request.diagnostics.stdoutPreview}`]
        : []),
      ...(request.diagnostics?.stderrPreview
        ? [`- Stderr preview: ${request.diagnostics.stderrPreview}`]
        : []),
      "",
      "## Output",
      request.outputText.trim() || "(vazio)",
      "",
    ].join("\n");
  }

  private async ensureBaseStructure(): Promise<void> {
    await fs.mkdir(this.resolveRelativeDir(REQUESTS_DIR), { recursive: true });
    await fs.mkdir(this.resolveRelativeDir(RESPONSES_DIR), { recursive: true });
    await fs.mkdir(this.resolveRelativeDir(DECISIONS_DIR), { recursive: true });
  }

  private async allocateTraceId(request: WorkflowStageTraceRecordRequest): Promise<string> {
    const targetSlug = normalizeSlug(request.targetName.replace(/\.md$/u, ""));
    const baseTraceId = [
      formatTraceTimestamp(request.recordedAt),
      request.sourceCommand,
      request.kind,
      request.stage,
      targetSlug,
    ]
      .filter(Boolean)
      .join("-");

    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const candidate = attempt === 0 ? baseTraceId : `${baseTraceId}-${attempt + 1}`;
      const requestExists = await this.relativePathExists(this.buildRequestPath(candidate));
      const decisionExists = await this.relativePathExists(this.buildDecisionPath(candidate));
      if (!requestExists && !decisionExists) {
        return candidate;
      }
    }

    throw new Error(
      "Nao foi possivel alocar identificador unico para trilha do fluxo principal desta etapa.",
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

  private buildResponsePath(traceId: string): string {
    return path.posix.join(TRACE_ROOT_DIR, RESPONSES_DIR, `${traceId}-response.md`);
  }

  private buildDecisionPath(traceId: string): string {
    return path.posix.join(TRACE_ROOT_DIR, DECISIONS_DIR, `${traceId}-decision.json`);
  }

  private resolveRelativeDir(relativeDirectory: string): string {
    return path.join(this.projectPath, TRACE_ROOT_DIR, relativeDirectory);
  }

  private resolveRelativeFile(relativePath: string): string {
    return path.join(this.projectPath, ...relativePath.split("/"));
  }
}

const formatTraceTimestamp = (value: Date): string =>
  value
    .toISOString()
    .replace(/\.\d{3}Z$/u, "Z")
    .replace(/[-:]/gu, "")
    .toLowerCase();

const normalizeSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-+/u, "")
    .replace(/-+$/u, "")
    .slice(0, 80);
