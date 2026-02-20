import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
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
}

interface CodexInteractiveSpawnRequest {
  command: string;
  args: string[];
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

export interface CodexTicketFlowClient {
  ensureAuthenticated(): Promise<void>;
  runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult>;
  runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult>;
  startPlanSession(request: PlanSpecSessionStartRequest): Promise<PlanSpecSession>;
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

interface CodexInteractiveSessionRequest {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

interface CodexCommandResult {
  stdout: string;
  stderr: string;
}

type InteractiveCodexProcess = ChildProcessWithoutNullStreams;

interface CodexClientDependencies {
  loadPromptTemplate: (filePath: string) => Promise<string>;
  runCodexCommand: (request: CodexCommandRequest) => Promise<CodexCommandResult>;
  runCodexAuthStatusCommand: (request: CodexAuthStatusRequest) => Promise<CodexCommandResult>;
  resolvePlanDirectoryName: (repoPath: string) => Promise<PlanDirectoryName>;
  spawnCodexInteractiveProcess: (request: CodexInteractiveSessionRequest) => InteractiveCodexProcess;
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
const PLAN_COMMAND = "/plan";
const INTERACTIVE_RETRY_HINT = "Use /plan_spec para tentar novamente.";
const INTERACTIVE_CONFIRM_KEY = "\r";
const INTERACTIVE_SUBMIT_SEQUENCE = "\r\n";
const INTERACTIVE_QUEUE_KEY = "\t";
const INTERACTIVE_QUEUE_DELAY_MS = 60;
const INTERACTIVE_BOOTSTRAP_FALLBACK_MS = 1500;
const INTERACTIVE_PROMPT_PROBE_MAX_CHARS = 12000;
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
const CODEX_EXEC_ONLY_ARGS = ["--skip-git-repo-check"] as const;
const CODEX_COLOR_NEVER_ARGS = [
  "--color",
  "never",
] as const;
const INTERACTIVE_PSEUDO_TTY_COLUMNS = 120;
const INTERACTIVE_PSEUDO_TTY_ROWS = 40;
const SCRIPT_PSEUDO_TTY_ARGS = [
  "--quiet",
  "--return",
  "--flush",
  "--echo",
  "never",
] as const;
const SCRIPT_PSEUDO_TTY_LOG_FILE = "/dev/null";
const SCRIPT_PSEUDO_TTY_LOG_FILE_ENV = "CODEX_INTERACTIVE_SCRIPT_LOG_PATH";
const INTERACTIVE_VERBOSE_LOG_ENV = "CODEX_INTERACTIVE_VERBOSE_LOGS";
const SHELL_SAFE_ARG_PATTERN = /^[A-Za-z0-9_@%+=:,./-]+$/u;

export const buildNonInteractiveCodexArgs = (): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_COLOR_NEVER_ARGS,
  "-",
];

export const buildInteractiveCodexArgs = (): string[] => [
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_APPROVAL_NEVER_ARGS,
];

export const buildInteractiveCodexSpawnRequest = (): CodexInteractiveSpawnRequest => {
  const codexArgs = buildInteractiveCodexArgs();
  const codexCommand = buildShellCommand("codex", codexArgs);
  const interactiveCommand = buildShellCommand("sh", [
    "-lc",
    `stty cols ${String(INTERACTIVE_PSEUDO_TTY_COLUMNS)} rows ${String(INTERACTIVE_PSEUDO_TTY_ROWS)}; exec ${codexCommand}`,
  ]);
  const transcriptPath = resolveInteractiveTranscriptPath();
  return {
    command: "script",
    args: [
      ...SCRIPT_PSEUDO_TTY_ARGS,
      "--command",
      interactiveCommand,
      transcriptPath,
    ],
  };
};

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
        INTERACTIVE_RETRY_HINT,
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexPlanSessionError";
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
      spawnCodexInteractiveProcess: spawnCodexInteractiveProcess,
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

  async startPlanSession(request: PlanSpecSessionStartRequest): Promise<PlanSpecSession> {
    const spawnRequest = buildInteractiveCodexSpawnRequest();
    this.logger.info("Iniciando sessao interativa de planejamento via Codex CLI", {
      repoPath: this.repoPath,
      mode: PLAN_COMMAND,
      interactiveTranscriptPath: spawnRequest.args[spawnRequest.args.length - 1],
      interactiveVerboseLogs: isInteractiveVerboseLogsEnabled(),
    });

    try {
      const childProcess = this.dependencies.spawnCodexInteractiveProcess({
        cwd: this.repoPath,
        env: {
          ...process.env,
        },
      });

      return new CodexInteractivePlanSession(childProcess, request, this.logger);
    } catch (error) {
      throw new CodexPlanSessionError("start", errorMessage(error));
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

class CodexInteractivePlanSession implements PlanSpecSession {
  private parserState: PlanSpecParserState = createPlanSpecParserState();
  private promptReadyProbeBuffer = "";
  private closed = false;
  private cancelled = false;
  private failureNotified = false;
  private trustPromptHandled = false;
  private protocolPrimerInjected = false;
  private promptReadyDetected = false;
  private planCommandBootstrapped = false;
  private planCommandBootstrapInFlight = false;
  private bootstrapFallbackHandle: ReturnType<typeof setTimeout> | null = null;
  private writePipeline: Promise<void> = Promise.resolve();
  private readonly pendingInputs: Array<{
    value: string;
    phase: "start" | "input";
    resolve: () => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(
    private readonly process: InteractiveCodexProcess,
    private readonly request: PlanSpecSessionStartRequest,
    private readonly logger: Logger,
  ) {
    this.process.stdout.on("data", (chunk: Buffer | string) => {
      this.handleStdoutChunk(chunk.toString());
    });
    this.process.stderr.on("data", (chunk: Buffer | string) => {
      this.handleStderrChunk(chunk.toString());
    });
    this.process.on("error", (error) => {
      this.notifyFailure("runtime", errorMessage(error));
    });
    this.process.on("close", (code) => {
      this.handleClose(code);
    });

    const initialUserInput = this.request.initialUserInput?.trim();
    if (initialUserInput) {
      this.pendingInputs.push({
        value: this.decorateFirstUserInput(initialUserInput),
        phase: "start",
        resolve: () => undefined,
        reject: () => undefined,
      });
      this.scheduleBootstrapFallback();
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

    const decorated = this.decorateFirstUserInput(normalized);
    if (!this.planCommandBootstrapped) {
      const pending = new Promise<void>((resolve, reject) => {
        this.pendingInputs.push({
          value: decorated,
          phase: "input",
          resolve,
          reject,
        });
      });

      this.logger.info("Input de /plan_spec enfileirado aguardando bootstrap do modo /plan", {
        promptReadyDetected: this.promptReadyDetected,
        pendingInputs: this.pendingInputs.length,
      });
      this.scheduleBootstrapFallback();
      if (this.promptReadyDetected) {
        void this.bootstrapPlanMode().catch(() => undefined);
      }

      return pending;
    }

    await this.sendInteractiveInput(decorated, "input");
  }

  async cancel(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.cancelled = true;
    this.process.stdin.end();
    this.process.kill("SIGTERM");
  }

  private handleStdoutChunk(chunk: string): void {
    if (!chunk) {
      return;
    }

    this.emitActivityObservation("stdout", chunk);
    this.promptReadyProbeBuffer = appendInteractivePromptProbeBuffer(
      this.promptReadyProbeBuffer,
      chunk,
    );

    if (!this.trustPromptHandled && isDirectoryTrustPrompt(chunk)) {
      this.trustPromptHandled = true;
      this.logger.info("Prompt de confianca de diretorio detectado e confirmado automaticamente");
      this.write(`yes${INTERACTIVE_CONFIRM_KEY}`, "start");
    }

    if (!this.promptReadyDetected && isInteractivePromptReady(this.promptReadyProbeBuffer)) {
      this.promptReadyDetected = true;
    }

    if (this.promptReadyDetected && !this.planCommandBootstrapped && !this.planCommandBootstrapInFlight) {
      this.logger.info("Prompt interativo do Codex pronto; enviando /plan");
      void this.bootstrapPlanMode().catch(() => undefined);
    }

    const parsed = parsePlanSpecOutputChunk(this.parserState, chunk);
    this.parserState = parsed.state;
    this.logVerbose("Sessao interativa /plan_spec recebeu chunk stdout", {
      chunkLength: chunk.length,
      parsedEvents: parsed.events.map((event) => event.type),
      pendingChunkLength: this.parserState.pendingChunk.length,
      preview: limit(sanitizePlanSpecRawOutput(chunk).replace(/\r/gu, "\\r").replace(/\n/gu, "\\n")),
    });
    for (const event of parsed.events) {
      this.forwardParserEvent(event);
    }
  }

  private handleStderrChunk(chunk: string): void {
    this.emitActivityObservation("stderr", chunk);
    const sanitized = sanitizePlanSpecRawOutput(chunk);
    if (!sanitized || !isPlanSpecRawOutputMeaningful(sanitized)) {
      return;
    }

    this.logger.warn("Sessao interativa do Codex retornou stderr", {
      stderr: limit(sanitized),
    });
    this.emitEvent({
      type: "raw-sanitized",
      text: sanitized,
    });
  }

  private handleClose(code: number | null): void {
    this.closed = true;
    this.promptReadyProbeBuffer = "";
    this.clearBootstrapFallback();
    this.rejectPendingInputs(new Error("Sessao interativa encerrada antes de concluir mensagens pendentes."));
    this.logVerbose("Sessao interativa /plan_spec encerrada", {
      exitCode: code,
      cancelled: this.cancelled,
      pendingChunkLength: this.parserState.pendingChunk.length,
    });
    if (this.parserState.pendingChunk.trim().length > 0) {
      const pending = sanitizePlanSpecRawOutput(this.parserState.pendingChunk);
      if (pending && isPlanSpecRawOutputMeaningful(pending)) {
        this.emitEvent({
          type: "raw-sanitized",
          text: pending,
        });
      }
      this.parserState = createPlanSpecParserState();
    }

    if (!this.cancelled && code !== 0) {
      this.notifyFailure(
        "runtime",
        `sessao interativa terminou com codigo ${String(code)} sem fallback nao interativo`,
      );
    }

    if (this.request.callbacks.onClose) {
      try {
        this.request.callbacks.onClose({
          exitCode: code,
          cancelled: this.cancelled,
        });
      } catch (error) {
        this.logger.warn("Falha ao executar callback onClose da sessao interativa", {
          error: errorMessage(error),
        });
      }
    }
  }

  private async bootstrapPlanMode(): Promise<void> {
    if (this.closed || this.planCommandBootstrapped || this.planCommandBootstrapInFlight) {
      return;
    }

    this.clearBootstrapFallback();
    this.planCommandBootstrapInFlight = true;
    try {
      await this.sendInteractiveInput(PLAN_COMMAND, "start");
      this.planCommandBootstrapped = true;
      this.clearBootstrapFallback();
      await this.flushPendingInputs();
    } catch (error) {
      this.rejectPendingInputs(error);
      throw error;
    } finally {
      this.planCommandBootstrapInFlight = false;
    }
  }

  private scheduleBootstrapFallback(): void {
    if (this.closed || this.planCommandBootstrapped || this.planCommandBootstrapInFlight) {
      return;
    }

    if (this.bootstrapFallbackHandle) {
      return;
    }

    this.bootstrapFallbackHandle = setTimeout(() => {
      this.bootstrapFallbackHandle = null;
      if (this.closed || this.planCommandBootstrapped || this.planCommandBootstrapInFlight) {
        return;
      }

      this.logger.warn(
        "Prompt interativo nao detectado no tempo esperado; aplicando bootstrap /plan por fallback",
        {
          fallbackDelayMs: INTERACTIVE_BOOTSTRAP_FALLBACK_MS,
          pendingInputs: this.pendingInputs.length,
        },
      );
      void this.bootstrapPlanMode().catch(() => undefined);
    }, INTERACTIVE_BOOTSTRAP_FALLBACK_MS);
    this.bootstrapFallbackHandle.unref?.();
  }

  private clearBootstrapFallback(): void {
    if (!this.bootstrapFallbackHandle) {
      return;
    }

    clearTimeout(this.bootstrapFallbackHandle);
    this.bootstrapFallbackHandle = null;
  }

  private async flushPendingInputs(): Promise<void> {
    while (this.pendingInputs.length > 0) {
      const next = this.pendingInputs.shift();
      if (!next) {
        continue;
      }

      try {
        await this.sendInteractiveInput(next.value, next.phase);
        next.resolve();
      } catch (error) {
        next.reject(error);
        throw error;
      }
    }
  }

  private rejectPendingInputs(error: unknown): void {
    while (this.pendingInputs.length > 0) {
      const next = this.pendingInputs.shift();
      next?.reject(error);
    }
  }

  private emitActivityObservation(source: "stdout" | "stderr", chunk: string): void {
    const preview = this.buildActivityPreview(chunk);
    this.emitEvent({
      type: "activity",
      activity: {
        source,
        bytes: chunk.length,
        preview,
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

  private sendInteractiveInput(value: string, phase: "start" | "input"): Promise<void> {
    return this.enqueueWriteOperation(async () => {
      this.write(`${value}${INTERACTIVE_SUBMIT_SEQUENCE}`, phase);
      await this.wait(INTERACTIVE_QUEUE_DELAY_MS);
      this.write(INTERACTIVE_QUEUE_KEY, phase);
    });
  }

  private enqueueWriteOperation(operation: () => Promise<void>): Promise<void> {
    const scheduled = this.writePipeline.then(async () => operation());
    this.writePipeline = scheduled.catch(() => undefined);
    return scheduled;
  }

  private wait(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
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

  private write(value: string, phase: "start" | "input"): void {
    try {
      this.logVerbose("Sessao interativa /plan_spec enviou input para Codex", {
        phase,
        bytes: value.length,
        preview: limit(value.replace(/\r/gu, "\\r").replace(/\n/gu, "\\n")),
      });
      this.process.stdin.write(value);
    } catch (error) {
      this.notifyFailure(phase, errorMessage(error));
      throw new CodexPlanSessionError(phase, errorMessage(error));
    }
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

export const isTicketFlowStage = (stage: CodexFlowStage): stage is TicketFlowStage =>
  stage === "plan" || stage === "implement" || stage === "close-and-version";

const runCodexCommand = async (request: CodexCommandRequest): Promise<CodexCommandResult> => {
  const args = buildNonInteractiveCodexArgs();

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

const spawnCodexInteractiveProcess = (
  request: CodexInteractiveSessionRequest,
): InteractiveCodexProcess => {
  const spawnRequest = buildInteractiveCodexSpawnRequest();

  return spawn(spawnRequest.command, spawnRequest.args, {
    cwd: request.cwd,
    env: request.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
};

const isDirectoryTrustPrompt = (value: string): boolean => {
  const normalized = sanitizePlanSpecRawOutput(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    normalized.includes("trust this directory") ||
    normalized.includes("do you trust") ||
    normalized.includes("allow this directory") ||
    normalized.includes("continue in this directory") ||
    normalized.includes("confiar neste diretorio") ||
    normalized.includes("confianca de diretorio")
  );
};

const isInteractivePromptReady = (value: string): boolean => {
  const normalized = sanitizePlanSpecRawOutput(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();

  if (!normalized) {
    return false;
  }

  return normalized.includes("for shortcuts") && /\b\d+%\s*context left\b/u.test(normalized);
};

const appendInteractivePromptProbeBuffer = (current: string, chunk: string): string => {
  const combined = `${current}${chunk}`;
  if (combined.length <= INTERACTIVE_PROMPT_PROBE_MAX_CHARS) {
    return combined;
  }

  return combined.slice(combined.length - INTERACTIVE_PROMPT_PROBE_MAX_CHARS);
};

const resolveInteractiveTranscriptPath = (): string => {
  const configured = process.env[SCRIPT_PSEUDO_TTY_LOG_FILE_ENV]?.trim();
  if (configured && configured.length > 0) {
    return configured;
  }

  return SCRIPT_PSEUDO_TTY_LOG_FILE;
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

const buildShellCommand = (command: string, args: readonly string[]): string =>
  [command, ...args].map(shellEscape).join(" ");

const shellEscape = (value: string): string => {
  if (SHELL_SAFE_ARG_PATTERN.test(value)) {
    return value;
  }

  return `'${value.replace(/'/gu, `'\"'\"'`)}'`;
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
