import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "../core/logger.js";
import {
  PlanDirectoryName,
  buildExecPlanPath,
  resolvePlanDirectoryName,
} from "./plan-directory.js";
import { TicketRef } from "./ticket-queue.js";

export type TicketFlowStage = "plan" | "implement" | "close-and-version";
export type SpecFlowStage = "spec-triage" | "spec-close-and-version";
export type CodexFlowStage = TicketFlowStage | SpecFlowStage;

export interface SpecRef {
  fileName: string;
  path: string;
}

export interface CodexStageResult {
  stage: CodexFlowStage;
  output: string;
  execPlanPath?: string;
}

export interface CodexTicketFlowClient {
  ensureAuthenticated(): Promise<void>;
  runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult>;
  runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult>;
}

interface CodexCommandRequest {
  cwd: string;
  prompt: string;
  env: NodeJS.ProcessEnv;
}

interface CodexAuthStatusRequest {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

interface CodexCommandResult {
  stdout: string;
  stderr: string;
}

interface CodexClientDependencies {
  loadPromptTemplate: (filePath: string) => Promise<string>;
  runCodexCommand: (request: CodexCommandRequest) => Promise<CodexCommandResult>;
  runCodexAuthStatusCommand: (request: CodexAuthStatusRequest) => Promise<CodexCommandResult>;
  resolvePlanDirectoryName: (repoPath: string) => Promise<PlanDirectoryName>;
}

const TICKET_STAGE_PROMPT_FILES: Record<TicketFlowStage, string> = {
  plan: "02-criar-execplan-para-ticket.md",
  implement: "03-executar-execplan-atual.md",
  "close-and-version": "04-encerrar-ticket-commit-push.md",
};

const SPEC_STAGE_PROMPT_FILES: Record<SpecFlowStage, string> = {
  "spec-triage": "01-avaliar-spec-e-gerar-tickets.md",
  "spec-close-and-version": "05-encerrar-tratamento-spec-commit-push.md",
};

const PROMPTS_DIR = fileURLToPath(new URL("../../prompts/", import.meta.url));

export class CodexStageExecutionError extends Error {
  constructor(
    public readonly ticketName: string,
    public readonly stage: CodexFlowStage,
    details: string,
  ) {
    super(`Falha na etapa ${stage} para ${ticketName}: ${details}`);
    this.name = "CodexStageExecutionError";
  }
}

export class CodexAuthenticationError extends Error {
  constructor(details: string) {
    super(
      [
        "Codex CLI nao autenticado.",
        "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexAuthenticationError";
  }
}

export class CodexCliTicketFlowClient implements CodexTicketFlowClient {
  private readonly dependencies: CodexClientDependencies;

  constructor(
    private readonly repoPath: string,
    private readonly logger: Logger,
    dependencies: Partial<CodexClientDependencies> = {},
  ) {
    this.dependencies = {
      loadPromptTemplate: (filePath: string) => fs.readFile(filePath, "utf8"),
      runCodexCommand: runCodexCommand,
      runCodexAuthStatusCommand: runCodexAuthStatusCommand,
      resolvePlanDirectoryName: resolvePlanDirectoryName,
      ...dependencies,
    };
  }

  async ensureAuthenticated(): Promise<void> {
    try {
      const result = await this.dependencies.runCodexAuthStatusCommand({
        cwd: this.repoPath,
        env: {
          ...process.env,
        },
      });

      if (!isAuthenticatedStatusOutput(result.stdout, result.stderr)) {
        const details = limit((result.stdout || result.stderr).trim() || "sessao ausente");
        throw new CodexAuthenticationError(details);
      }
    } catch (error) {
      if (error instanceof CodexAuthenticationError) {
        throw error;
      }

      const details = errorMessage(error);
      throw new CodexAuthenticationError(limit(details));
    }
  }

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, TICKET_STAGE_PROMPT_FILES[stage]);
    const planDirectory = await this.dependencies.resolvePlanDirectoryName(this.repoPath);
    const execPlanPath = this.expectedExecPlanPath(ticket, planDirectory);
    const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
    const prompt = this.buildTicketPrompt(stage, promptTemplate, ticket, planDirectory, execPlanPath);

    this.logger.info("Executando etapa via Codex CLI", {
      ticket: ticket.name,
      stage,
      promptTemplatePath,
    });

    try {
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
      });

      const stderr = result.stderr.trim();
      if (stderr.length > 0) {
        this.logger.warn("Codex CLI retornou stderr na etapa", {
          ticket: ticket.name,
          stage,
          stderr: limit(stderr),
        });
      }

      this.logger.info("Etapa concluida via Codex CLI", {
        ticket: ticket.name,
        stage,
      });

      return {
        stage,
        output: result.stdout,
        ...(stage === "plan" ? { execPlanPath } : {}),
      };
    } catch (error) {
      const details = errorMessage(error);
      throw new CodexStageExecutionError(ticket.name, stage, details);
    }
  }

  async runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, SPEC_STAGE_PROMPT_FILES[stage]);
    const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
    const prompt = this.buildSpecPrompt(stage, promptTemplate, spec);

    this.logger.info("Executando etapa de spec via Codex CLI", {
      spec: spec.fileName,
      specPath: spec.path,
      stage,
      promptTemplatePath,
    });

    try {
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
      });

      const stderr = result.stderr.trim();
      if (stderr.length > 0) {
        this.logger.warn("Codex CLI retornou stderr na etapa de spec", {
          spec: spec.fileName,
          stage,
          stderr: limit(stderr),
        });
      }

      this.logger.info("Etapa de spec concluida via Codex CLI", {
        spec: spec.fileName,
        stage,
      });

      return {
        stage,
        output: result.stdout,
      };
    } catch (error) {
      const details = errorMessage(error);
      throw new CodexStageExecutionError(spec.fileName, stage, details);
    }
  }

  private buildTicketPrompt(
    stage: TicketFlowStage,
    promptTemplate: string,
    ticket: TicketRef,
    planDirectory: PlanDirectoryName,
    execPlanPath: string,
  ): string {
    const ticketPath = `tickets/open/${ticket.name}`;

    const stageTemplate =
      stage === "plan"
        ? this.buildPlanStageTemplate(promptTemplate, ticketPath, planDirectory)
        : promptTemplate;

    return [
      stageTemplate.trimEnd(),
      "",
      "Contexto adicional do ticket alvo:",
      `- Ticket alvo: \`${ticketPath}\``,
      `- ExecPlan esperado: \`${execPlanPath}\``,
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private buildSpecPrompt(stage: SpecFlowStage, promptTemplate: string, spec: SpecRef): string {
    const commitMessage = this.buildSpecCommitMessage(spec.fileName);
    const stageTemplate = promptTemplate
      .replace(/<SPEC_PATH>/gu, spec.path)
      .replace(/<SPEC_FILE_NAME>/gu, spec.fileName)
      .replace(/<COMMIT_MESSAGE>/gu, commitMessage);

    return [
      stageTemplate.trimEnd(),
      "",
      "Contexto adicional da spec alvo:",
      `- Spec alvo: \`${spec.path}\``,
      `- Arquivo da spec: \`${spec.fileName}\``,
      ...(stage === "spec-close-and-version"
        ? [`- Commit esperado: \`${commitMessage}\``]
        : []),
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private buildPlanStageTemplate(
    promptTemplate: string,
    ticketPath: string,
    planDirectory: PlanDirectoryName,
  ): string {
    return promptTemplate
      .replace(/<tickets\/open\/YYYY-MM-DD-slug\.md>/gu, ticketPath)
      .replace(
        /`(?:execplans|plans)\/<yyyy-mm-dd>-<slug>\.md`/giu,
        `\`${planDirectory}/<yyyy-mm-dd>-<slug>.md\``,
      );
  }

  private expectedExecPlanPath(ticket: TicketRef, planDirectory: PlanDirectoryName): string {
    return buildExecPlanPath(planDirectory, ticket.name);
  }

  private buildSpecCommitMessage(specFileName: string): string {
    return `chore(specs): triage ${specFileName}`;
  }
}

export const isTicketFlowStage = (stage: CodexFlowStage): stage is TicketFlowStage =>
  stage === "plan" || stage === "implement" || stage === "close-and-version";

const runCodexCommand = async (request: CodexCommandRequest): Promise<CodexCommandResult> => {
  const args = [
    "exec",
    "--skip-git-repo-check",
    "--dangerously-bypass-approvals-and-sandbox",
    "--color",
    "never",
    "-",
  ];

  return new Promise<CodexCommandResult>((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: request.cwd,
      env: request.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`codex exec terminou com codigo ${String(code)}: ${limit(stderr || stdout)}`));
    });

    child.stdin.write(request.prompt);
    child.stdin.end();
  });
};

const runCodexAuthStatusCommand = async (
  request: CodexAuthStatusRequest,
): Promise<CodexCommandResult> => {
  const args = ["login", "status"];

  return new Promise<CodexCommandResult>((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: request.cwd,
      env: request.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `codex login status terminou com codigo ${String(code)}: ${limit(stderr || stdout)}`,
        ),
      );
    });
  });
};

const isAuthenticatedStatusOutput = (stdout: string, stderr: string): boolean => {
  const normalized = `${stdout}\n${stderr}`.toLowerCase();

  if (normalized.includes("not logged in") || normalized.includes("logged out")) {
    return false;
  }

  if (normalized.includes("logged in")) {
    return true;
  }

  return true;
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const limit = (value: string): string => {
  const MAX = 1000;
  if (value.length <= MAX) {
    return value;
  }

  return `${value.slice(0, MAX)}...`;
};
