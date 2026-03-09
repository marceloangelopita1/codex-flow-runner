import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Logger } from "../core/logger.js";
import {
  isPlanSpecRawOutputMeaningful,
  PlanSpecFinalBlock,
  PlanSpecParserEvent,
  PlanSpecParserState,
  PlanSpecQuestionBlock,
  createPlanSpecParserState,
  parsePlanSpecOutputChunk,
  sanitizePlanSpecRawOutput,
} from "./plan-spec-parser.js";
import {
  PlanDirectoryName,
  buildExecPlanPath,
  resolvePlanDirectoryName,
} from "./plan-directory.js";
import {
  RuntimeShellGuidance,
  buildRuntimeShellGuidance,
} from "./runtime-shell-guidance.js";
import { TicketRef } from "./ticket-queue.js";

export type TicketFlowStage = "plan" | "implement" | "close-and-version";
export type SpecFlowStage =
  | "spec-triage"
  | "spec-close-and-version"
  | "plan-spec-materialize"
  | "plan-spec-version-and-push";
export type CodexFlowStage = TicketFlowStage | SpecFlowStage;

export interface SpecPlanningTracePaths {
  requestPath: string;
  responsePath: string;
  decisionPath: string;
}

export interface SpecRef {
  fileName: string;
  path: string;
  plannedTitle?: string;
  plannedSummary?: string;
  commitMessage?: string;
  tracePaths?: SpecPlanningTracePaths;
}

export interface CodexStageResult {
  stage: CodexFlowStage;
  output: string;
  execPlanPath?: string;
  diagnostics?: CodexStageDiagnostics;
}

export interface CodexStageDiagnostics {
  stdoutPreview?: string;
  stderrPreview?: string;
}

export interface PlanSpecSessionActivity {
  source: "stdout" | "stderr";
  bytes: number;
  preview: string;
}

export type PlanSpecSessionEvent =
  | {
      type: "question";
      question: PlanSpecQuestionBlock;
    }
  | {
      type: "final";
      final: PlanSpecFinalBlock;
    }
  | {
      type: "raw-sanitized";
      text: string;
    }
  | {
      type: "activity";
      activity: PlanSpecSessionActivity;
    };

export interface PlanSpecSessionCloseResult {
  exitCode: number | null;
  cancelled: boolean;
}

export interface PlanSpecSessionCallbacks {
  onEvent: (event: PlanSpecSessionEvent) => void;
  onFailure: (error: CodexPlanSessionError) => void;
  onClose?: (result: PlanSpecSessionCloseResult) => void;
}

export interface PlanSpecSessionStartRequest {
  initialUserInput?: string;
  callbacks: PlanSpecSessionCallbacks;
}

export interface PlanSpecSession {
  sendUserInput(input: string): Promise<void>;
  cancel(): Promise<void>;
}

export interface CodexChatSessionActivity {
  source: "stdout" | "stderr";
  bytes: number;
  preview: string;
}

export type CodexChatSessionEvent =
  | {
      type: "raw-sanitized";
      text: string;
    }
  | {
      type: "activity";
      activity: CodexChatSessionActivity;
    }
  | {
      type: "turn-complete";
    };

export interface CodexChatSessionCloseResult {
  exitCode: number | null;
  cancelled: boolean;
}

export interface CodexChatSessionCallbacks {
  onEvent: (event: CodexChatSessionEvent) => void;
  onFailure: (error: CodexChatSessionError) => void;
  onClose?: (result: CodexChatSessionCloseResult) => void;
}

export interface CodexChatSessionStartRequest {
  initialUserInput?: string;
  callbacks: CodexChatSessionCallbacks;
}

export interface CodexChatSession {
  sendUserInput(input: string): Promise<void>;
  cancel(): Promise<void>;
}

export interface CodexTicketFlowClient {
  ensureAuthenticated(): Promise<void>;
  runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult>;
  runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult>;
  startPlanSession(request: PlanSpecSessionStartRequest): Promise<PlanSpecSession>;
  startFreeChatSession(request: CodexChatSessionStartRequest): Promise<CodexChatSession>;
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

interface CodexExecJsonCommandRequest {
  cwd: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

interface CodexCommandResult {
  stdout: string;
  stderr: string;
}

interface CodexClientDependencies {
  loadPromptTemplate: (filePath: string) => Promise<string>;
  runCodexCommand: (request: CodexCommandRequest) => Promise<CodexCommandResult>;
  runCodexExecJsonCommand: (request: CodexExecJsonCommandRequest) => Promise<CodexCommandResult>;
  runCodexAuthStatusCommand: (request: CodexAuthStatusRequest) => Promise<CodexCommandResult>;
  resolvePlanDirectoryName: (repoPath: string) => Promise<PlanDirectoryName>;
  buildRuntimeShellGuidance: () => RuntimeShellGuidance;
}

const TICKET_STAGE_PROMPT_FILES: Record<TicketFlowStage, string> = {
  plan: "02-criar-execplan-para-ticket.md",
  implement: "03-executar-execplan-atual.md",
  "close-and-version": "04-encerrar-ticket-commit-push.md",
};

const SPEC_STAGE_PROMPT_FILES: Record<SpecFlowStage, string> = {
  "spec-triage": "01-avaliar-spec-e-gerar-tickets.md",
  "spec-close-and-version": "05-encerrar-tratamento-spec-commit-push.md",
  "plan-spec-materialize": "06-materializar-spec-planejada.md",
  "plan-spec-version-and-push": "07-versionar-spec-planejada-commit-push.md",
};

const PROMPTS_DIR = fileURLToPath(new URL("../../prompts/", import.meta.url));
const PLAN_SPEC_INTERACTIVE_RETRY_HINT = "Use /plan_spec para tentar novamente.";
const CODEX_CHAT_INTERACTIVE_RETRY_HINT = "Use /codex_chat para tentar novamente.";
const PLAN_SPEC_PROTOCOL_PRIMER = [
  "Contexto: voce esta em uma ponte Telegram para planejamento de spec.",
  "Responda sempre em blocos parseaveis para automacao.",
  "",
  "Quando precisar de desambiguacao, responda exatamente neste formato:",
  "[[PLAN_SPEC_QUESTION]]",
  "Pergunta: <pergunta objetiva>",
  "Opcoes:",
  "- [slug-opcao-1] Rotulo opcao 1",
  "- [slug-opcao-2] Rotulo opcao 2",
  "[[/PLAN_SPEC_QUESTION]]",
  "",
  "Quando concluir o planejamento, responda exatamente neste formato:",
  "[[PLAN_SPEC_FINAL]]",
  "Titulo: <titulo final da spec>",
  "Resumo: <resumo final objetivo>",
  "Acoes:",
  "- Criar spec",
  "- Refinar",
  "- Cancelar",
  "[[/PLAN_SPEC_FINAL]]",
  "",
  "Nao inclua texto fora dos blocos acima.",
].join("\n");
const CODEX_APPROVAL_NEVER_ARGS = ["-a", "never"] as const;
const CODEX_SANDBOX_FULL_ACCESS_ARGS = [
  "-s",
  "danger-full-access",
];
const CODEX_RESUME_FULL_ACCESS_ARGS = ["--dangerously-bypass-approvals-and-sandbox"] as const;
const CODEX_EXEC_ONLY_ARGS = ["--skip-git-repo-check"] as const;
const CODEX_COLOR_NEVER_ARGS = [
  "--color",
  "never",
] as const;
const CODEX_JSON_OUTPUT_ARGS = ["--json"] as const;
const INTERACTIVE_VERBOSE_LOG_ENV = "CODEX_INTERACTIVE_VERBOSE_LOGS";

export const buildNonInteractiveCodexArgs = (): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_COLOR_NEVER_ARGS,
  "-",
];

const buildFreeChatExecStartArgs = (prompt: string): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  prompt,
];

const buildPlanSpecExecStartArgs = (prompt: string): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  prompt,
];

const buildFreeChatExecResumeArgs = (threadId: string, prompt: string): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  "resume",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_RESUME_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  threadId,
  prompt,
];

const buildPlanSpecExecResumeArgs = (threadId: string, prompt: string): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  "resume",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_RESUME_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  threadId,
  prompt,
];

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

export class CodexPlanSessionError extends Error {
  constructor(
    public readonly phase: "start" | "input" | "runtime",
    details: string,
  ) {
    super(
      [
        "Falha na sessao interativa de planejamento no Codex CLI.",
        PLAN_SPEC_INTERACTIVE_RETRY_HINT,
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexPlanSessionError";
  }
}

export class CodexChatSessionError extends Error {
  constructor(
    public readonly phase: "start" | "input" | "runtime",
    details: string,
  ) {
    super(
      [
        "Falha na sessao interativa de conversa livre no Codex CLI.",
        CODEX_CHAT_INTERACTIVE_RETRY_HINT,
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexChatSessionError";
  }
}

export class CodexCliTicketFlowClient implements CodexTicketFlowClient {
  private readonly dependencies: CodexClientDependencies;
  private readonly runtimeShellGuidance: RuntimeShellGuidance;

  constructor(
    private readonly repoPath: string,
    private readonly logger: Logger,
    dependencies: Partial<CodexClientDependencies> = {},
  ) {
    this.dependencies = {
      loadPromptTemplate: (filePath: string) => fs.readFile(filePath, "utf8"),
      runCodexCommand: runCodexCommand,
      runCodexExecJsonCommand: runCodexExecJsonCommand,
      runCodexAuthStatusCommand: runCodexAuthStatusCommand,
      resolvePlanDirectoryName: resolvePlanDirectoryName,
      buildRuntimeShellGuidance: buildRuntimeShellGuidance,
      ...dependencies,
    };
    this.runtimeShellGuidance = this.dependencies.buildRuntimeShellGuidance();
    this.logger.info("Guia operacional de shell preparado para o Codex CLI", {
      repoPath: this.repoPath,
      codexExecutablePath: this.runtimeShellGuidance.codexExecutablePath,
      isSnapCodex: this.runtimeShellGuidance.isSnapCodex,
      homePath: this.runtimeShellGuidance.homePath,
      nodeExecutablePath: this.runtimeShellGuidance.nodeExecutablePath,
      npmExecutablePath: this.runtimeShellGuidance.npmExecutablePath,
    });
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

      const diagnostics = buildCodexStageDiagnostics(result.stdout, result.stderr);
      if (diagnostics?.stderrPreview) {
        this.logger.warn("Codex CLI retornou diagnostico em stderr na etapa", {
          ticket: ticket.name,
          stage,
          codexCliTranscriptPreview: diagnostics.stderrPreview,
          ...(diagnostics.stdoutPreview
            ? { codexAssistantResponsePreview: diagnostics.stdoutPreview }
            : {}),
        });
      }

      this.logger.info("Etapa concluida via Codex CLI", {
        ticket: ticket.name,
        stage,
      });

      return {
        stage,
        output: result.stdout,
        ...(diagnostics ? { diagnostics } : {}),
        ...(stage === "plan" ? { execPlanPath } : {}),
      };
    } catch (error) {
      const details = errorMessage(error);
      throw new CodexStageExecutionError(ticket.name, stage, details);
    }
  }

  async runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, SPEC_STAGE_PROMPT_FILES[stage]);

    this.logger.info("Executando etapa de spec via Codex CLI", {
      spec: spec.fileName,
      specPath: spec.path,
      stage,
      promptTemplatePath,
    });

    try {
      const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
      const prompt = this.buildSpecPrompt(stage, promptTemplate, spec);
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
      });

      const diagnostics = buildCodexStageDiagnostics(result.stdout, result.stderr);
      if (diagnostics?.stderrPreview) {
        this.logger.warn("Codex CLI retornou diagnostico em stderr na etapa de spec", {
          spec: spec.fileName,
          stage,
          codexCliTranscriptPreview: diagnostics.stderrPreview,
          ...(diagnostics.stdoutPreview
            ? { codexAssistantResponsePreview: diagnostics.stdoutPreview }
            : {}),
        });
      }

      this.logger.info("Etapa de spec concluida via Codex CLI", {
        spec: spec.fileName,
        stage,
      });

      return {
        stage,
        output: result.stdout,
        ...(diagnostics ? { diagnostics } : {}),
      };
    } catch (error) {
      const details = errorMessage(error);
      throw new CodexStageExecutionError(spec.fileName, stage, details);
    }
  }

  async startPlanSession(request: PlanSpecSessionStartRequest): Promise<PlanSpecSession> {
    this.logger.info("Iniciando sessao de planejamento via Codex CLI exec/resume", {
      repoPath: this.repoPath,
      mode: "plan-spec",
      interactiveVerboseLogs: isInteractiveVerboseLogsEnabled(),
    });

    try {
      return new CodexExecResumePlanSession(
        this.repoPath,
        request,
        this.logger,
        this.dependencies.runCodexExecJsonCommand,
      );
    } catch (error) {
      throw new CodexPlanSessionError("start", errorMessage(error));
    }
  }

  async startFreeChatSession(request: CodexChatSessionStartRequest): Promise<CodexChatSession> {
    this.logger.info("Iniciando sessao de chat livre via Codex CLI exec/resume", {
      repoPath: this.repoPath,
      mode: "free-chat",
    });

    try {
      return new CodexExecResumeFreeChatSession(
        this.repoPath,
        request,
        this.logger,
        this.dependencies.runCodexExecJsonCommand,
      );
    } catch (error) {
      throw new CodexChatSessionError("start", errorMessage(error));
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
      this.runtimeShellGuidance.text,
      "",
      "Contexto adicional do ticket alvo:",
      `- Ticket alvo: \`${ticketPath}\``,
      `- ExecPlan esperado: \`${execPlanPath}\``,
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private buildSpecPrompt(stage: SpecFlowStage, promptTemplate: string, spec: SpecRef): string {
    const commitMessage = spec.commitMessage ?? this.buildSpecCommitMessage(stage, spec.fileName);
    const plannedTitle = spec.plannedTitle?.trim() ?? "";
    const plannedSummary = spec.plannedSummary?.trim() ?? "";
    const traceRequestPath = spec.tracePaths?.requestPath ?? "";
    const traceResponsePath = spec.tracePaths?.responsePath ?? "";
    const traceDecisionPath = spec.tracePaths?.decisionPath ?? "";

    if (stage === "plan-spec-materialize" && (!plannedTitle || !plannedSummary)) {
      throw new Error(
        "Etapa plan-spec-materialize exige titulo e resumo finais aprovados da sessao /plan_spec.",
      );
    }

    if (
      stage === "plan-spec-version-and-push" &&
      (!traceRequestPath || !traceResponsePath || !traceDecisionPath)
    ) {
      throw new Error(
        "Etapa plan-spec-version-and-push exige trilha spec_planning completa (request/response/decision).",
      );
    }

    const stageTemplate = promptTemplate
      .replace(/<SPEC_PATH>/gu, spec.path)
      .replace(/<SPEC_FILE_NAME>/gu, spec.fileName)
      .replace(/<COMMIT_MESSAGE>/gu, commitMessage)
      .replace(/<SPEC_TITLE>/gu, plannedTitle)
      .replace(/<SPEC_SUMMARY>/gu, plannedSummary)
      .replace(/<TRACE_REQUEST_PATH>/gu, traceRequestPath)
      .replace(/<TRACE_RESPONSE_PATH>/gu, traceResponsePath)
      .replace(/<TRACE_DECISION_PATH>/gu, traceDecisionPath);

    return [
      stageTemplate.trimEnd(),
      "",
      this.runtimeShellGuidance.text,
      "",
      "Contexto adicional da spec alvo:",
      `- Spec alvo: \`${spec.path}\``,
      `- Arquivo da spec: \`${spec.fileName}\``,
      ...(stage === "spec-close-and-version" || stage === "plan-spec-version-and-push"
        ? [`- Commit esperado: \`${commitMessage}\``]
        : []),
      ...(stage === "plan-spec-materialize"
        ? [
            `- Titulo final aprovado: \`${plannedTitle}\``,
            `- Resumo final aprovado: \`${plannedSummary}\``,
          ]
        : []),
      ...(stage === "plan-spec-version-and-push"
        ? [
            `- Trilha request: \`${traceRequestPath}\``,
            `- Trilha response: \`${traceResponsePath}\``,
            `- Trilha decision: \`${traceDecisionPath}\``,
          ]
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

  private buildSpecCommitMessage(stage: SpecFlowStage, specFileName: string): string {
    if (stage === "plan-spec-version-and-push") {
      return `feat(spec): add ${specFileName}`;
    }

    return `chore(specs): triage ${specFileName}`;
  }
}

class CodexExecResumePlanSession implements PlanSpecSession {
  private parserState: PlanSpecParserState = createPlanSpecParserState();
  private closed = false;
  private cancelled = false;
  private failureNotified = false;
  private threadId: string | null = null;
  private protocolPrimerInjected = false;
  private writePipeline: Promise<void> = Promise.resolve();

  constructor(
    private readonly repoPath: string,
    private readonly request: PlanSpecSessionStartRequest,
    private readonly logger: Logger,
    private readonly runCodexExecJsonCommand: (
      request: CodexExecJsonCommandRequest,
    ) => Promise<CodexCommandResult>,
  ) {
    const initialUserInput = this.request.initialUserInput?.trim();
    if (initialUserInput) {
      void this.sendUserInput(initialUserInput).catch((error) => {
        this.notifyFailure("start", errorMessage(error));
      });
    }
  }

  async sendUserInput(input: string): Promise<void> {
    const normalized = input.trim();
    if (!normalized) {
      return;
    }

    if (this.closed) {
      throw new CodexPlanSessionError("input", "A sessao interativa ja foi encerrada.");
    }

    const prompt = this.decorateFirstUserInput(normalized);
    await this.enqueueWriteOperation(async () => {
      await this.executeTurn(prompt);
    });
  }

  async cancel(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.cancelled = true;
    this.closed = true;
    this.flushPendingParserOutput();
    this.notifyClose({
      exitCode: null,
      cancelled: true,
    });
  }

  private async executeTurn(prompt: string): Promise<void> {
    const args = this.threadId
      ? buildPlanSpecExecResumeArgs(this.threadId, prompt)
      : buildPlanSpecExecStartArgs(prompt);
    this.logVerbose("Sessao /plan_spec executando codex exec", {
      hasThreadId: Boolean(this.threadId),
      promptLength: prompt.length,
    });

    let result: CodexCommandResult;
    try {
      result = await this.runCodexExecJsonCommand({
        cwd: this.repoPath,
        args,
        env: {
          ...process.env,
        },
      });
    } catch (error) {
      this.notifyFailure("runtime", errorMessage(error));
      throw error;
    }

    if (this.closed) {
      return;
    }

    const parsed = parseCodexExecJsonTranscript(result.stdout, result.stderr);
    this.emitActivityObservation("stdout", result.stdout);
    this.emitActivityObservation("stderr", result.stderr);

    const previousThreadId = this.threadId;
    if (parsed.threadId) {
      this.threadId = parsed.threadId;
    }

    if (!this.threadId) {
      const details = "Codex exec nao retornou thread_id para manter contexto de /plan_spec.";
      this.notifyFailure("runtime", details);
      throw new CodexPlanSessionError("runtime", details);
    }

    if (previousThreadId && parsed.threadId && parsed.threadId !== previousThreadId) {
      this.logger.warn("Sessao /plan_spec recebeu thread_id diferente durante resume", {
        previousThreadId,
        nextThreadId: parsed.threadId,
      });
    }

    const finalMessage = parsed.agentMessage;
    if (!finalMessage) {
      const details =
        "Codex exec nao retornou agent_message no modo --json para manter resposta deterministica de /plan_spec.";
      this.notifyFailure("runtime", details);
      throw new CodexPlanSessionError("runtime", details);
    }

    const parsedOutput = parsePlanSpecOutputChunk(this.parserState, finalMessage);
    this.parserState = parsedOutput.state;
    for (const event of parsedOutput.events) {
      this.forwardParserEvent(event);
    }
  }

  private enqueueWriteOperation(operation: () => Promise<void>): Promise<void> {
    const scheduled = this.writePipeline.then(async () => operation());
    this.writePipeline = scheduled.catch(() => undefined);
    return scheduled;
  }

  private emitActivityObservation(source: "stdout" | "stderr", chunk: string): void {
    if (!chunk) {
      return;
    }

    this.emitEvent({
      type: "activity",
      activity: {
        source,
        bytes: chunk.length,
        preview: this.buildActivityPreview(chunk),
      },
    });
  }

  private buildActivityPreview(chunk: string): string {
    const sanitized = sanitizePlanSpecRawOutput(chunk);
    if (!sanitized || !isPlanSpecRawOutputMeaningful(sanitized)) {
      return "";
    }

    return limit(sanitized.replace(/\r/gu, "\\r").replace(/\n/gu, "\\n"));
  }

  private forwardParserEvent(event: PlanSpecParserEvent): void {
    if (event.type === "question") {
      this.emitEvent({
        type: "question",
        question: event.question,
      });
      return;
    }

    if (event.type === "final") {
      this.emitEvent({
        type: "final",
        final: event.final,
      });
      return;
    }

    this.emitEvent({
      type: "raw-sanitized",
      text: event.text,
    });
  }

  private emitEvent(event: PlanSpecSessionEvent): void {
    if (this.closed && event.type !== "activity") {
      return;
    }

    try {
      this.request.callbacks.onEvent(event);
    } catch (error) {
      this.logger.warn("Falha ao entregar evento da sessao interativa", {
        eventType: event.type,
        error: errorMessage(error),
      });
    }
  }

  private notifyFailure(phase: "start" | "input" | "runtime", details: string): void {
    if (this.failureNotified) {
      return;
    }

    this.failureNotified = true;
    const error = new CodexPlanSessionError(phase, details);
    try {
      this.request.callbacks.onFailure(error);
    } catch (callbackError) {
      this.logger.warn("Falha ao executar callback de erro da sessao interativa", {
        error: errorMessage(callbackError),
      });
    }
  }

  private notifyClose(result: PlanSpecSessionCloseResult): void {
    if (!this.request.callbacks.onClose) {
      return;
    }

    try {
      this.request.callbacks.onClose(result);
    } catch (error) {
      this.logger.warn("Falha ao executar callback onClose da sessao interativa", {
        error: errorMessage(error),
      });
    }
  }

  private flushPendingParserOutput(): void {
    if (!this.parserState.pendingChunk.trim()) {
      return;
    }

    const pending = sanitizePlanSpecRawOutput(this.parserState.pendingChunk);
    if (pending && isPlanSpecRawOutputMeaningful(pending)) {
      this.emitEvent({
        type: "raw-sanitized",
        text: pending,
      });
    }
    this.parserState = createPlanSpecParserState();
  }

  private decorateFirstUserInput(input: string): string {
    if (this.protocolPrimerInjected) {
      return input;
    }

    this.protocolPrimerInjected = true;
    return [PLAN_SPEC_PROTOCOL_PRIMER, "", `Brief do operador: ${input}`].join("\n");
  }

  private logVerbose(message: string, context: Record<string, unknown>): void {
    if (!isInteractiveVerboseLogsEnabled()) {
      return;
    }

    this.logger.info(message, context);
  }
}

class CodexExecResumeFreeChatSession implements CodexChatSession {
  private closed = false;
  private cancelled = false;
  private failureNotified = false;
  private threadId: string | null = null;
  private writePipeline: Promise<void> = Promise.resolve();

  constructor(
    private readonly repoPath: string,
    private readonly request: CodexChatSessionStartRequest,
    private readonly logger: Logger,
    private readonly runCodexExecJsonCommand: (
      request: CodexExecJsonCommandRequest,
    ) => Promise<CodexCommandResult>,
  ) {
    const initialUserInput = this.request.initialUserInput?.trim();
    if (initialUserInput) {
      void this.sendUserInput(initialUserInput).catch((error) => {
        this.notifyFailure("start", errorMessage(error));
      });
    }
  }

  async sendUserInput(input: string): Promise<void> {
    const normalized = input.trim();
    if (!normalized) {
      return;
    }

    if (this.closed) {
      throw new CodexChatSessionError("input", "A sessao interativa ja foi encerrada.");
    }

    await this.enqueueWriteOperation(async () => {
      await this.executeTurn(normalized);
    });
  }

  async cancel(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.cancelled = true;
    this.closed = true;
    this.notifyClose({
      exitCode: null,
      cancelled: true,
    });
  }

  private async executeTurn(prompt: string): Promise<void> {
    const args = this.threadId
      ? buildFreeChatExecResumeArgs(this.threadId, prompt)
      : buildFreeChatExecStartArgs(prompt);
    this.logVerbose("Sessao /codex_chat executando codex exec", {
      hasThreadId: Boolean(this.threadId),
      promptLength: prompt.length,
    });

    let result: CodexCommandResult;
    try {
      result = await this.runCodexExecJsonCommand({
        cwd: this.repoPath,
        args,
        env: {
          ...process.env,
        },
      });
    } catch (error) {
      this.notifyFailure("runtime", errorMessage(error));
      throw error;
    }

    if (this.closed) {
      return;
    }

    const parsed = parseCodexExecJsonTranscript(result.stdout, result.stderr);
    this.emitActivityObservation("stdout", result.stdout);
    this.emitActivityObservation("stderr", result.stderr);

    const previousThreadId = this.threadId;
    if (parsed.threadId) {
      this.threadId = parsed.threadId;
    }

    if (!this.threadId) {
      const details = "Codex exec nao retornou thread_id para manter contexto de /codex_chat.";
      this.notifyFailure("runtime", details);
      throw new CodexChatSessionError(
        "runtime",
        details,
      );
    }

    if (previousThreadId && parsed.threadId && parsed.threadId !== previousThreadId) {
      this.logger.warn("Sessao /codex_chat recebeu thread_id diferente durante resume", {
        previousThreadId,
        nextThreadId: parsed.threadId,
      });
    }

    const finalMessage = parsed.agentMessage;
    if (!finalMessage) {
      const details =
        "Codex exec nao retornou agent_message no modo --json para manter resposta deterministica de /codex_chat.";
      this.notifyFailure("runtime", details);
      throw new CodexChatSessionError("runtime", details);
    }

    this.emitEvent({
      type: "raw-sanitized",
      text: finalMessage,
    });
    this.emitEvent({
      type: "turn-complete",
    });
  }

  private enqueueWriteOperation(operation: () => Promise<void>): Promise<void> {
    const scheduled = this.writePipeline.then(async () => operation());
    this.writePipeline = scheduled.catch(() => undefined);
    return scheduled;
  }

  private emitActivityObservation(source: "stdout" | "stderr", chunk: string): void {
    if (!chunk) {
      return;
    }

    this.emitEvent({
      type: "activity",
      activity: {
        source,
        bytes: chunk.length,
        preview: this.buildActivityPreview(chunk),
      },
    });
  }

  private buildActivityPreview(chunk: string): string {
    const sanitized = sanitizePlanSpecRawOutput(chunk);
    if (!sanitized) {
      return "";
    }

    return limit(sanitized.replace(/\r/gu, "\\r").replace(/\n/gu, "\\n"));
  }

  private emitEvent(event: CodexChatSessionEvent): void {
    if (this.closed && event.type !== "activity") {
      return;
    }

    try {
      this.request.callbacks.onEvent(event);
    } catch (error) {
      this.logger.warn("Falha ao entregar evento da sessao interativa", {
        eventType: event.type,
        error: errorMessage(error),
      });
    }
  }

  private notifyFailure(phase: "start" | "input" | "runtime", details: string): void {
    if (this.failureNotified) {
      return;
    }

    this.failureNotified = true;
    const error = new CodexChatSessionError(phase, details);
    try {
      this.request.callbacks.onFailure(error);
    } catch (callbackError) {
      this.logger.warn("Falha ao executar callback de erro da sessao interativa", {
        error: errorMessage(callbackError),
      });
    }
  }

  private notifyClose(result: CodexChatSessionCloseResult): void {
    if (!this.request.callbacks.onClose) {
      return;
    }

    try {
      this.request.callbacks.onClose(result);
    } catch (error) {
      this.logger.warn("Falha ao executar callback onClose da sessao interativa", {
        error: errorMessage(error),
      });
    }
  }

  private logVerbose(message: string, context: Record<string, unknown>): void {
    if (!isInteractiveVerboseLogsEnabled()) {
      return;
    }

    this.logger.info(message, context);
  }
}

interface CodexExecJsonTranscript {
  threadId: string | null;
  agentMessage: string | null;
}

const parseCodexExecJsonTranscript = (
  stdout: string,
  stderr: string,
): CodexExecJsonTranscript => {
  let threadId: string | null = null;
  let agentMessage: string | null = null;
  const lines = `${stdout}\n${stderr}`.split(/\r?\n/gu);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const event = tryParseJsonObject(trimmed);
    if (!event) {
      continue;
    }

    const eventType = safeString((event as { type?: unknown }).type);
    if (eventType === "thread.started") {
      const candidateThreadId = safeString((event as { thread_id?: unknown }).thread_id);
      if (candidateThreadId) {
        threadId = candidateThreadId;
      }
      continue;
    }

    if (eventType !== "item.completed") {
      continue;
    }

    const item = (event as { item?: unknown }).item;
    if (!item || typeof item !== "object") {
      continue;
    }

    const itemType = safeString((item as { type?: unknown }).type);
    if (itemType !== "agent_message") {
      continue;
    }

    const itemText = safeString((item as { text?: unknown }).text);
    if (!itemText) {
      continue;
    }

    const sanitized = sanitizePlanSpecRawOutput(itemText).trim();
    agentMessage = sanitized || itemText.trim();
  }

  return {
    threadId,
    agentMessage,
  };
};

const tryParseJsonObject = (value: string): Record<string, unknown> | null => {
  if (!value.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const safeString = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const isTicketFlowStage = (stage: CodexFlowStage): stage is TicketFlowStage =>
  stage === "plan" || stage === "implement" || stage === "close-and-version";

const runCodexCommand = async (request: CodexCommandRequest): Promise<CodexCommandResult> => {
  return runCodexCliCommand({
    cwd: request.cwd,
    env: request.env,
    args: buildNonInteractiveCodexArgs(),
    stdin: request.prompt,
    commandName: "codex exec",
  });
};

const runCodexExecJsonCommand = async (
  request: CodexExecJsonCommandRequest,
): Promise<CodexCommandResult> => {
  return runCodexCliCommand({
    cwd: request.cwd,
    env: request.env,
    args: request.args,
    commandName: "codex exec",
  });
};

const runCodexAuthStatusCommand = async (
  request: CodexAuthStatusRequest,
): Promise<CodexCommandResult> => {
  return runCodexCliCommand({
    cwd: request.cwd,
    env: request.env,
    args: ["login", "status"],
    commandName: "codex login status",
  });
};

const runCodexCliCommand = async (params: {
  cwd: string;
  env: NodeJS.ProcessEnv;
  args: string[];
  commandName: string;
  stdin?: string;
}): Promise<CodexCommandResult> => {
  return new Promise<CodexCommandResult>((resolve, reject) => {
    const child = spawn("codex", params.args, {
      cwd: params.cwd,
      env: params.env,
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

      reject(
        new Error(
          [
            `${params.commandName} terminou com codigo ${String(code)}:`,
            summarizeCodexCliOutput(stderr) ?? summarizeCodexCliOutput(stdout) ?? "sem saida capturada",
          ].join(" "),
        ),
      );
    });

    if (typeof params.stdin === "string") {
      child.stdin.write(params.stdin);
    }
    child.stdin.end();
  });
};

const isInteractiveVerboseLogsEnabled = (): boolean => {
  const configured = process.env[INTERACTIVE_VERBOSE_LOG_ENV]?.trim().toLowerCase();
  return configured === "1" || configured === "true";
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

const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;
const MAX_CLI_OUTPUT_PREVIEW_LENGTH = 1200;
const CLI_OUTPUT_PREVIEW_HEAD_LENGTH = 420;

const buildCodexStageDiagnostics = (
  stdout: string,
  stderr: string,
): CodexStageDiagnostics | undefined => {
  const stdoutPreview = summarizeCodexCliOutput(stdout);
  const stderrPreview = summarizeCodexCliOutput(stderr);

  if (!stdoutPreview && !stderrPreview) {
    return undefined;
  }

  return {
    ...(stdoutPreview ? { stdoutPreview } : {}),
    ...(stderrPreview ? { stderrPreview } : {}),
  };
};

const summarizeCodexCliOutput = (value: string): string | undefined => {
  const sanitized = sanitizeCodexCliOutput(value);
  if (!sanitized) {
    return undefined;
  }

  if (sanitized.length <= MAX_CLI_OUTPUT_PREVIEW_LENGTH) {
    return sanitized;
  }

  const tailLength = MAX_CLI_OUTPUT_PREVIEW_LENGTH - CLI_OUTPUT_PREVIEW_HEAD_LENGTH - "\n...\n".length;
  return `${sanitized.slice(0, CLI_OUTPUT_PREVIEW_HEAD_LENGTH)}\n...\n${sanitized.slice(-tailLength)}`;
};

const sanitizeCodexCliOutput = (value: string): string => {
  return value
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
};
