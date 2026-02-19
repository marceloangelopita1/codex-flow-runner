import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "../core/logger.js";
import { TicketRef } from "./ticket-queue.js";

export type TicketFlowStage = "plan" | "implement" | "close-and-version";

export interface CodexStageResult {
  stage: TicketFlowStage;
  output: string;
  execPlanPath?: string;
}

export interface CodexTicketFlowClient {
  runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult>;
}

interface CodexCommandRequest {
  cwd: string;
  prompt: string;
  env: NodeJS.ProcessEnv;
}

interface CodexCommandResult {
  stdout: string;
  stderr: string;
}

interface CodexClientDependencies {
  loadPromptTemplate: (filePath: string) => Promise<string>;
  runCodexCommand: (request: CodexCommandRequest) => Promise<CodexCommandResult>;
}

const STAGE_PROMPT_FILES: Record<TicketFlowStage, string> = {
  plan: "02-criar-execplan-para-ticket.md",
  implement: "03-executar-execplan-atual.md",
  "close-and-version": "04-encerrar-ticket-commit-push.md",
};

const PROMPTS_DIR = fileURLToPath(new URL("../../prompts/", import.meta.url));

export class CodexStageExecutionError extends Error {
  constructor(
    public readonly ticketName: string,
    public readonly stage: TicketFlowStage,
    details: string,
  ) {
    super(`Falha na etapa ${stage} para ${ticketName}: ${details}`);
    this.name = "CodexStageExecutionError";
  }
}

export class CodexCliTicketFlowClient implements CodexTicketFlowClient {
  private readonly dependencies: CodexClientDependencies;

  constructor(
    private readonly repoPath: string,
    private readonly logger: Logger,
    private readonly apiKey: string,
    dependencies: Partial<CodexClientDependencies> = {},
  ) {
    this.dependencies = {
      loadPromptTemplate: (filePath: string) => fs.readFile(filePath, "utf8"),
      runCodexCommand: runCodexCommand,
      ...dependencies,
    };
  }

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, STAGE_PROMPT_FILES[stage]);
    const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
    const prompt = this.buildPrompt(stage, promptTemplate, ticket);

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
          CODEX_API_KEY: this.apiKey,
          OPENAI_API_KEY: this.apiKey,
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
        ...(stage === "plan" ? { execPlanPath: this.expectedExecPlanPath(ticket) } : {}),
      };
    } catch (error) {
      const details = errorMessage(error);
      throw new CodexStageExecutionError(ticket.name, stage, details);
    }
  }

  private buildPrompt(stage: TicketFlowStage, promptTemplate: string, ticket: TicketRef): string {
    const ticketPath = `tickets/open/${ticket.name}`;

    const stageTemplate =
      stage === "plan"
        ? promptTemplate.replace(/<tickets\/open\/YYYY-MM-DD-slug\.md>/gu, ticketPath)
        : promptTemplate;

    return [
      stageTemplate.trimEnd(),
      "",
      "Contexto adicional do ticket alvo:",
      `- Ticket alvo: \`${ticketPath}\``,
      `- ExecPlan esperado: \`${this.expectedExecPlanPath(ticket)}\``,
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private expectedExecPlanPath(ticket: TicketRef): string {
    return `execplans/${ticket.name.replace(/\.md$/u, "")}.md`;
  }
}

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
