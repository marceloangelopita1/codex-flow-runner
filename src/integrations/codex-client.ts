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
  parseSpecTicketValidationAutoCorrectOutput,
  SpecTicketValidationAutoCorrectParserError,
} from "./spec-ticket-validation-autocorrect-parser.js";
import {
  parseSpecTicketValidationOutput,
  SpecTicketValidationParserError,
} from "./spec-ticket-validation-parser.js";
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
import { CodexInvocationPreferences } from "../types/codex-preferences.js";
import {
  DISCOVER_SPEC_CATEGORY_DEFINITIONS,
  type DiscoverSpecCategoryCoverage,
} from "../types/discover-spec.js";
import {
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationPassResult,
} from "../types/spec-ticket-validation.js";
import { ProjectRef } from "../types/project.js";

export type TicketFlowStage = "plan" | "implement" | "close-and-version";
export type SpecFlowStage =
  | "spec-triage"
  | "spec-ticket-derivation-retrospective"
  | "spec-close-and-version"
  | "spec-audit"
  | "spec-workflow-retrospective"
  | "plan-spec-materialize"
  | "plan-spec-version-and-push";
export type CodexFlowStage = TicketFlowStage | SpecFlowStage;

export interface SpecPlanningTracePaths {
  requestPath: string;
  responsePath: string;
  decisionPath: string;
}

export type SpecPlanningSourceCommand = "/plan_spec" | "/discover_spec";

export interface SpecRef {
  fileName: string;
  path: string;
  plannedTitle?: string;
  plannedSummary?: string;
  plannedOutline?: PlanSpecFinalBlock["outline"];
  sourceCommand?: SpecPlanningSourceCommand;
  assumptionsAndDefaults?: string[];
  decisionsAndTradeOffs?: string[];
  categoryCoverage?: DiscoverSpecCategoryCoverage[];
  criticalAmbiguities?: string[];
  commitMessage?: string;
  derivationRetrospectiveContext?: string;
  tracePaths?: SpecPlanningTracePaths;
  workflowRetrospectiveContext?: string;
}

export interface CodexStageResult {
  stage: CodexFlowStage;
  output: string;
  execPlanPath?: string;
  diagnostics?: CodexStageDiagnostics;
  promptTemplatePath: string;
  promptText: string;
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
    }
  | {
      type: "turn-context";
      model: string;
      reasoningEffort: string;
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

export interface DiscoverSpecSessionActivity {
  source: "stdout" | "stderr";
  bytes: number;
  preview: string;
}

export type DiscoverSpecSessionEvent =
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
      activity: DiscoverSpecSessionActivity;
    }
  | {
      type: "turn-context";
      model: string;
      reasoningEffort: string;
    }
  | {
      type: "turn-complete";
    };

export interface DiscoverSpecSessionCloseResult {
  exitCode: number | null;
  cancelled: boolean;
}

export interface DiscoverSpecSessionCallbacks {
  onEvent: (event: DiscoverSpecSessionEvent) => void;
  onFailure: (error: CodexDiscoverSpecSessionError) => void;
  onClose?: (result: DiscoverSpecSessionCloseResult) => void;
}

export interface DiscoverSpecSessionStartRequest {
  initialUserInput?: string;
  callbacks: DiscoverSpecSessionCallbacks;
}

export interface DiscoverSpecSession {
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
      type: "turn-context";
      model: string;
      reasoningEffort: string;
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

export interface SpecTicketValidationSessionStartRequest {
  spec: SpecRef;
  triageThreadId?: string | null;
}

export interface SpecTicketValidationSessionTurnRequest {
  packageContext: string;
  appliedCorrectionsSummary?: string[];
}

export interface SpecTicketValidationSessionTurnResult {
  threadId: string;
  output: string;
  parsed: SpecTicketValidationPassResult;
  diagnostics?: CodexStageDiagnostics;
  promptTemplatePath: string;
  promptText: string;
}

export interface SpecTicketValidationSession {
  runTurn(
    request: SpecTicketValidationSessionTurnRequest,
  ): Promise<SpecTicketValidationSessionTurnResult>;
  getThreadId(): string | null;
  cancel(): Promise<void>;
}

export interface SpecTicketValidationAutoCorrectRequest {
  spec: SpecRef;
  cycleNumber: number;
  packageContext: string;
  latestPass: SpecTicketValidationPassResult;
  allowedArtifactPaths: string[];
}

export interface SpecTicketValidationAutoCorrectResult {
  output: string;
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
  diagnostics?: CodexStageDiagnostics;
  promptTemplatePath: string;
  promptText: string;
}

export interface TargetPrepareCopySource {
  targetPath: string;
  sourcePath: string;
}

export interface TargetPrepareMergeSource extends TargetPrepareCopySource {
  markerId: string;
}

export interface TargetPrepareCodexRequest {
  targetProject: ProjectRef;
  runnerRepoPath: string;
  runnerReference: string;
  allowlistedPaths: string[];
  copySources: TargetPrepareCopySource[];
  mergeSources: TargetPrepareMergeSource[];
}

export interface TargetPrepareCodexResult {
  output: string;
  diagnostics?: CodexStageDiagnostics;
  promptTemplatePath: string;
  promptText: string;
}

export interface TargetPrepareCodexClient {
  ensureAuthenticated(): Promise<void>;
  snapshotInvocationPreferences(): Promise<CodexInvocationPreferences | null>;
  forkWithFixedInvocationPreferences(
    preferences: CodexInvocationPreferences | null,
  ): TargetPrepareCodexClient;
  runTargetPrepare(request: TargetPrepareCodexRequest): Promise<TargetPrepareCodexResult>;
}

export interface TargetCheckupCodexRequest {
  targetProject: ProjectRef;
  runnerRepoPath: string;
  runnerReference: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
  reportFactsJson: string;
}

export interface TargetCheckupCodexResult {
  output: string;
  diagnostics?: CodexStageDiagnostics;
  promptTemplatePath: string;
  promptText: string;
}

export interface TargetCheckupCodexClient {
  ensureAuthenticated(): Promise<void>;
  snapshotInvocationPreferences(): Promise<CodexInvocationPreferences | null>;
  forkWithFixedInvocationPreferences(
    preferences: CodexInvocationPreferences | null,
  ): TargetCheckupCodexClient;
  runTargetCheckup(request: TargetCheckupCodexRequest): Promise<TargetCheckupCodexResult>;
}

export interface CodexTicketFlowClient {
  ensureAuthenticated(): Promise<void>;
  snapshotInvocationPreferences(): Promise<CodexInvocationPreferences | null>;
  forkWithFixedInvocationPreferences(
    preferences: CodexInvocationPreferences | null,
  ): CodexTicketFlowClient;
  runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult>;
  runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult>;
  startPlanSession(request: PlanSpecSessionStartRequest): Promise<PlanSpecSession>;
  startDiscoverSession(request: DiscoverSpecSessionStartRequest): Promise<DiscoverSpecSession>;
  startFreeChatSession(request: CodexChatSessionStartRequest): Promise<CodexChatSession>;
  startSpecTicketValidationSession(
    request: SpecTicketValidationSessionStartRequest,
  ): Promise<SpecTicketValidationSession>;
  runSpecTicketValidationAutoCorrect(
    request: SpecTicketValidationAutoCorrectRequest,
  ): Promise<SpecTicketValidationAutoCorrectResult>;
}

interface CodexCommandRequest {
  cwd: string;
  prompt: string;
  env: NodeJS.ProcessEnv;
  preferences?: CodexInvocationPreferences | null;
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

export interface CodexCliTicketFlowClientOptions {
  resolveInvocationPreferences?: () =>
    | Promise<CodexInvocationPreferences | null>
    | CodexInvocationPreferences
    | null;
}

const TICKET_STAGE_PROMPT_FILES: Record<TicketFlowStage, string> = {
  plan: "02-criar-execplan-para-ticket.md",
  implement: "03-executar-execplan-atual.md",
  "close-and-version": "04-encerrar-ticket-commit-push.md",
};

const SPEC_STAGE_PROMPT_FILES: Record<SpecFlowStage, string> = {
  "spec-triage": "01-avaliar-spec-e-gerar-tickets.md",
  "spec-ticket-derivation-retrospective":
    "12-retrospectiva-derivacao-tickets-pre-run-all.md",
  "spec-close-and-version": "05-encerrar-tratamento-spec-commit-push.md",
  "spec-audit": "08-auditar-spec-apos-run-all.md",
  "spec-workflow-retrospective": "11-retrospectiva-workflow-apos-spec-audit.md",
  "plan-spec-materialize": "06-materializar-spec-planejada.md",
  "plan-spec-version-and-push": "07-versionar-spec-planejada-commit-push.md",
};

const PROMPTS_DIR = fileURLToPath(new URL("../../prompts/", import.meta.url));
const PLAN_SPEC_INTERACTIVE_RETRY_HINT = "Use /plan_spec para tentar novamente.";
const DISCOVER_SPEC_INTERACTIVE_RETRY_HINT = "Use /discover_spec para tentar novamente.";
const CODEX_CHAT_INTERACTIVE_RETRY_HINT = "Use /codex_chat para tentar novamente.";
const SPEC_TICKET_VALIDATION_RETRY_HINT =
  "Use /run_specs para reiniciar a validacao de tickets derivados.";
const SPEC_TICKET_VALIDATION_PROMPT_FILE = "09-validar-tickets-derivados-da-spec.md";
const SPEC_TICKET_VALIDATION_AUTOCORRECT_PROMPT_FILE =
  "10-autocorrigir-tickets-derivados-da-spec.md";
const TARGET_PREPARE_PROMPT_FILE = "13-target-prepare-controlled-onboarding.md";
const TARGET_CHECKUP_PROMPT_FILE = "14-target-checkup-readiness-audit.md";
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
  "Objetivo: <objetivo central da spec>",
  "Atores:",
  "- <ator principal>",
  "Jornada:",
  "- <passo principal da jornada>",
  "RFs:",
  "- <RF-01 descricao objetiva>",
  "CAs:",
  "- <CA-01 validacao observavel>",
  "Nao-escopo:",
  "- <item fora de escopo>",
  "Restricoes tecnicas:",
  "- <restricao tecnica ou 'Nenhum'>",
  "Validacoes obrigatorias:",
  "- <validacao obrigatoria ou 'Nenhum'>",
  "Validacoes manuais pendentes:",
  "- <validacao manual pendente ou 'Nenhum'>",
  "Riscos conhecidos:",
  "- <risco conhecido ou 'Nenhum'>",
  "Acoes:",
  "- Criar spec",
  "- Refinar",
  "- Cancelar",
  "[[/PLAN_SPEC_FINAL]]",
  "",
  "Nao comprima RFs, CAs, jornada, riscos e nao-escopo em um unico resumo.",
  "Nao inclua texto fora dos blocos acima.",
].join("\n");
const DISCOVER_SPEC_PROTOCOL_PRIMER = [
  "Contexto: voce esta em uma ponte Telegram para /discover_spec.",
  "Conduza uma entrevista profunda e stateful para eliminar ambiguidades criticas antes da spec.",
  "Responda sempre em blocos parseaveis para automacao.",
  "",
  "Antes de concluir, cubra explicitamente estas categorias obrigatorias:",
  ...DISCOVER_SPEC_CATEGORY_DEFINITIONS.map(
    (definition) => `- [${definition.id}] ${definition.label}`,
  ),
  "",
  "Quando ainda houver ambiguidade critica ou categoria pendente, responda exatamente neste formato:",
  "[[PLAN_SPEC_QUESTION]]",
  "Pergunta: <pergunta objetiva que feche a lacuna mais critica>",
  "Opcoes:",
  "- [slug-opcao-1] Rotulo opcao 1",
  "- [slug-opcao-2] Rotulo opcao 2",
  "[[/PLAN_SPEC_QUESTION]]",
  "",
  "Quando concluir a descoberta, responda exatamente neste formato:",
  "[[PLAN_SPEC_FINAL]]",
  "Titulo: <titulo final da spec>",
  "Resumo: <resumo final objetivo>",
  "Objetivo: <objetivo central da spec>",
  "Atores:",
  "- <ator principal>",
  "Jornada:",
  "- <passo principal da jornada>",
  "RFs:",
  "- <RF-01 descricao objetiva>",
  "CAs:",
  "- <CA-01 validacao observavel>",
  "Nao-escopo:",
  "- <item fora de escopo ou default aprovado>",
  "Restricoes tecnicas:",
  "- <restricao tecnica ou dependencia relevante ou 'Nenhum'>",
  "Validacoes obrigatorias:",
  "- <validacao obrigatoria ou 'Nenhum'>",
  "Validacoes manuais pendentes:",
  "- <validacao manual pendente ou 'Nenhum'>",
  "Riscos conhecidos:",
  "- <risco conhecido ou 'Nenhum'>",
  "Categorias obrigatorias:",
  ...DISCOVER_SPEC_CATEGORY_DEFINITIONS.map(
    (definition) =>
      `- [${definition.id}][covered] ${definition.label}: <evidencia explicita, motivo de nao aplicavel ou pendencia>`,
  ),
  "Assumptions/defaults:",
  "- <assumption/default aprovado ou 'Nenhum'>",
  "Decisoes e trade-offs:",
  "- <decisao aprovada ou 'Nenhum'>",
  "Ambiguidades criticas abertas:",
  "- <pendencia critica ou 'Nenhum'>",
  "Acoes:",
  "- Criar spec",
  "- Refinar",
  "- Cancelar",
  "[[/PLAN_SPEC_FINAL]]",
  "",
  "Use [covered], [not-applicable] ou [pending] em cada categoria obrigatoria.",
  "Nao marque [covered] sem conteudo explicito do operador ou default aprovado.",
  "Use [not-applicable] apenas quando houver motivo observavel.",
  "Se qualquer categoria permanecer [pending] ou houver ambiguidade critica aberta, prefira continuar perguntando em vez de finalizar.",
  "Nao comprima RFs, CAs, jornada, riscos e nao-escopo em um unico resumo.",
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

const buildInvocationPreferenceArgs = (
  preferences: CodexInvocationPreferences | null = null,
): string[] => {
  if (!preferences) {
    return [];
  }

  const model = preferences.model.trim();
  const reasoningEffort = preferences.reasoningEffort.trim();
  if (!model || !reasoningEffort) {
    return [];
  }

  const speedArgs = buildSpeedPreferenceArgs(preferences);

  return [
    "-m",
    model,
    "-c",
    `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
    ...speedArgs,
  ];
};

const buildSpeedPreferenceArgs = (preferences: CodexInvocationPreferences): string[] => {
  if (preferences.speed === "fast") {
    return [
      "-c",
      "features.fast_mode=true",
      "-c",
      `service_tier=${JSON.stringify("fast")}`,
    ];
  }

  return [
    "-c",
    "features.fast_mode=false",
  ];
};

export const buildNonInteractiveCodexArgs = (
  preferences: CodexInvocationPreferences | null = null,
): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_COLOR_NEVER_ARGS,
  ...buildInvocationPreferenceArgs(preferences),
  "-",
];

const buildFreeChatExecStartArgs = (
  prompt: string,
  preferences: CodexInvocationPreferences | null = null,
): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  ...buildInvocationPreferenceArgs(preferences),
  prompt,
];

const buildPlanSpecExecStartArgs = (
  prompt: string,
  preferences: CodexInvocationPreferences | null = null,
): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_SANDBOX_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  ...buildInvocationPreferenceArgs(preferences),
  prompt,
];

const buildFreeChatExecResumeArgs = (
  threadId: string,
  prompt: string,
  preferences: CodexInvocationPreferences | null = null,
): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  "resume",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_RESUME_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  ...buildInvocationPreferenceArgs(preferences),
  threadId,
  prompt,
];

const buildPlanSpecExecResumeArgs = (
  threadId: string,
  prompt: string,
  preferences: CodexInvocationPreferences | null = null,
): string[] => [
  ...CODEX_APPROVAL_NEVER_ARGS,
  "exec",
  "resume",
  ...CODEX_EXEC_ONLY_ARGS,
  ...CODEX_RESUME_FULL_ACCESS_ARGS,
  ...CODEX_JSON_OUTPUT_ARGS,
  ...buildInvocationPreferenceArgs(preferences),
  threadId,
  prompt,
];

const buildSpecTicketValidationExecStartArgs = (
  prompt: string,
  preferences: CodexInvocationPreferences | null = null,
): string[] => buildFreeChatExecStartArgs(prompt, preferences);

const buildSpecTicketValidationExecResumeArgs = (
  threadId: string,
  prompt: string,
  preferences: CodexInvocationPreferences | null = null,
): string[] => buildFreeChatExecResumeArgs(threadId, prompt, preferences);

export class CodexStageExecutionError extends Error {
  constructor(
    public readonly ticketName: string,
    public readonly stage: CodexFlowStage,
    details: string,
    public readonly promptTemplatePath?: string,
    public readonly promptText?: string,
    public readonly diagnostics?: CodexStageDiagnostics,
  ) {
    super(`Falha na etapa ${stage} para ${ticketName}: ${details}`);
    this.name = "CodexStageExecutionError";
  }
}

class CodexCliCommandError extends Error {
  constructor(
    message: string,
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
  ) {
    super(message);
    this.name = "CodexCliCommandError";
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

export class CodexDiscoverSpecSessionError extends Error {
  constructor(
    public readonly phase: "start" | "input" | "runtime",
    details: string,
  ) {
    super(
      [
        "Falha na sessao interativa de descoberta de spec no Codex CLI.",
        DISCOVER_SPEC_INTERACTIVE_RETRY_HINT,
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexDiscoverSpecSessionError";
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

export class CodexSpecTicketValidationSessionError extends Error {
  constructor(
    public readonly phase: "start" | "input" | "runtime",
    details: string,
  ) {
    super(
      [
        "Falha na sessao stateful de spec-ticket-validation no Codex CLI.",
        SPEC_TICKET_VALIDATION_RETRY_HINT,
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexSpecTicketValidationSessionError";
  }
}

export class CodexSpecTicketValidationAutoCorrectError extends Error {
  constructor(
    public readonly phase: "start" | "input" | "runtime",
    details: string,
  ) {
    super(
      [
        "Falha na etapa de autocorrecao de spec-ticket-validation no Codex CLI.",
        SPEC_TICKET_VALIDATION_RETRY_HINT,
        `Detalhes: ${details}`,
      ].join(" "),
    );
    this.name = "CodexSpecTicketValidationAutoCorrectError";
  }
}

export class CodexCliTicketFlowClient implements CodexTicketFlowClient {
  private readonly dependencies: CodexClientDependencies;
  private readonly runtimeShellGuidance: RuntimeShellGuidance;
  private readonly resolveInvocationPreferences: () => Promise<CodexInvocationPreferences | null>;

  constructor(
    private readonly repoPath: string,
    private readonly logger: Logger,
    dependencies: Partial<CodexClientDependencies> = {},
    options: CodexCliTicketFlowClientOptions = {},
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
    this.resolveInvocationPreferences = async () => {
      const resolved = await options.resolveInvocationPreferences?.();
      return resolved ?? null;
    };
    this.logger.info("Guia operacional de shell preparado para o Codex CLI", {
      repoPath: this.repoPath,
      codexExecutablePath: this.runtimeShellGuidance.codexExecutablePath,
      isSnapCodex: this.runtimeShellGuidance.isSnapCodex,
      homePath: this.runtimeShellGuidance.homePath,
      nodeExecutablePath: this.runtimeShellGuidance.nodeExecutablePath,
      npmExecutablePath: this.runtimeShellGuidance.npmExecutablePath,
      ...(this.runtimeShellGuidance.isSnapCodex
        ? {
            hostGitExecutablePath: this.runtimeShellGuidance.hostGitExecutablePath,
            hostGitExecPath: this.runtimeShellGuidance.hostGitExecPath,
            hostGhExecutablePath: this.runtimeShellGuidance.hostGhExecutablePath,
          }
        : {}),
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

  async snapshotInvocationPreferences(): Promise<CodexInvocationPreferences | null> {
    return this.resolveInvocationPreferences();
  }

  forkWithFixedInvocationPreferences(
    preferences: CodexInvocationPreferences | null,
  ): CodexCliTicketFlowClient {
    return new CodexCliTicketFlowClient(this.repoPath, this.logger, this.dependencies, {
      resolveInvocationPreferences: async () => preferences,
    });
  }

  async runStage(stage: TicketFlowStage, ticket: TicketRef): Promise<CodexStageResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, TICKET_STAGE_PROMPT_FILES[stage]);
    let execPlanPath: string | undefined;
    let prompt = "";
    try {
      const planDirectory = await this.dependencies.resolvePlanDirectoryName(this.repoPath);
      execPlanPath = this.expectedExecPlanPath(ticket, planDirectory);
      const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
      prompt = this.buildTicketPrompt(stage, promptTemplate, ticket, planDirectory, execPlanPath);

      this.logger.info("Executando etapa via Codex CLI", {
        ticket: ticket.name,
        stage,
        promptTemplatePath,
      });

      const preferences = await this.snapshotInvocationPreferences();
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
        preferences,
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
        ...(stage === "plan" && execPlanPath ? { execPlanPath } : {}),
        promptTemplatePath,
        promptText: prompt,
      };
    } catch (error) {
      const details = errorMessage(error);
      const diagnostics =
        error instanceof CodexCliCommandError
          ? buildCodexStageDiagnostics(error.stdout, error.stderr)
          : undefined;
      throw new CodexStageExecutionError(
        ticket.name,
        stage,
        details,
        promptTemplatePath,
        prompt,
        diagnostics,
      );
    }
  }

  async runSpecStage(stage: SpecFlowStage, spec: SpecRef): Promise<CodexStageResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, SPEC_STAGE_PROMPT_FILES[stage]);
    let prompt = "";
    try {
      const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
      prompt = this.buildSpecPrompt(stage, promptTemplate, spec);

      this.logger.info("Executando etapa de spec via Codex CLI", {
        spec: spec.fileName,
        specPath: spec.path,
        stage,
        promptTemplatePath,
      });

      const preferences = await this.snapshotInvocationPreferences();
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
        preferences,
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
        promptTemplatePath,
        promptText: prompt,
      };
    } catch (error) {
      const details = errorMessage(error);
      const diagnostics =
        error instanceof CodexCliCommandError
          ? buildCodexStageDiagnostics(error.stdout, error.stderr)
          : undefined;
      throw new CodexStageExecutionError(
        spec.fileName,
        stage,
        details,
        promptTemplatePath,
        prompt,
        diagnostics,
      );
    }
  }

  async runTargetPrepare(request: TargetPrepareCodexRequest): Promise<TargetPrepareCodexResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, TARGET_PREPARE_PROMPT_FILE);
    let prompt = "";
    try {
      const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
      prompt = this.buildTargetPreparePrompt(promptTemplate, request);

      this.logger.info("Executando target_prepare via Codex CLI", {
        targetProjectName: request.targetProject.name,
        targetProjectPath: request.targetProject.path,
        promptTemplatePath,
      });

      const preferences = await this.snapshotInvocationPreferences();
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
        preferences,
      });

      const diagnostics = buildCodexStageDiagnostics(result.stdout, result.stderr);
      if (diagnostics?.stderrPreview) {
        this.logger.warn("Codex CLI retornou diagnostico em stderr no target_prepare", {
          targetProjectName: request.targetProject.name,
          codexCliTranscriptPreview: diagnostics.stderrPreview,
          ...(diagnostics.stdoutPreview
            ? { codexAssistantResponsePreview: diagnostics.stdoutPreview }
            : {}),
        });
      }

      this.logger.info("target_prepare concluido via Codex CLI", {
        targetProjectName: request.targetProject.name,
        targetProjectPath: request.targetProject.path,
      });

      return {
        output: result.stdout,
        ...(diagnostics ? { diagnostics } : {}),
        promptTemplatePath,
        promptText: prompt,
      };
    } catch (error) {
      const details = errorMessage(error);
      const diagnostics =
        error instanceof CodexCliCommandError
          ? buildCodexStageDiagnostics(error.stdout, error.stderr)
          : undefined;
      throw new CodexStageExecutionError(
        request.targetProject.name,
        "implement",
        details,
        promptTemplatePath,
        prompt,
        diagnostics,
      );
    }
  }

  async runTargetCheckup(request: TargetCheckupCodexRequest): Promise<TargetCheckupCodexResult> {
    const promptTemplatePath = path.join(PROMPTS_DIR, TARGET_CHECKUP_PROMPT_FILE);
    let prompt = "";
    try {
      const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
      prompt = this.buildTargetCheckupPrompt(promptTemplate, request);

      this.logger.info("Executando target_checkup via Codex CLI", {
        targetProjectName: request.targetProject.name,
        targetProjectPath: request.targetProject.path,
        promptTemplatePath,
      });

      const preferences = await this.snapshotInvocationPreferences();
      const result = await this.dependencies.runCodexCommand({
        cwd: this.repoPath,
        prompt,
        env: {
          ...process.env,
        },
        preferences,
      });

      const diagnostics = buildCodexStageDiagnostics(result.stdout, result.stderr);
      if (diagnostics?.stderrPreview) {
        this.logger.warn("Codex CLI retornou diagnostico em stderr no target_checkup", {
          targetProjectName: request.targetProject.name,
          codexCliTranscriptPreview: diagnostics.stderrPreview,
          ...(diagnostics.stdoutPreview
            ? { codexAssistantResponsePreview: diagnostics.stdoutPreview }
            : {}),
        });
      }

      this.logger.info("target_checkup concluido via Codex CLI", {
        targetProjectName: request.targetProject.name,
        targetProjectPath: request.targetProject.path,
      });

      return {
        output: result.stdout,
        ...(diagnostics ? { diagnostics } : {}),
        promptTemplatePath,
        promptText: prompt,
      };
    } catch (error) {
      const details = errorMessage(error);
      const diagnostics =
        error instanceof CodexCliCommandError
          ? buildCodexStageDiagnostics(error.stdout, error.stderr)
          : undefined;
      throw new CodexStageExecutionError(
        request.targetProject.name,
        "implement",
        details,
        promptTemplatePath,
        prompt,
        diagnostics,
      );
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
        this.resolveInvocationPreferences,
      );
    } catch (error) {
      throw new CodexPlanSessionError("start", errorMessage(error));
    }
  }

  async startDiscoverSession(
    request: DiscoverSpecSessionStartRequest,
  ): Promise<DiscoverSpecSession> {
    this.logger.info("Iniciando sessao de descoberta de spec via Codex CLI exec/resume", {
      repoPath: this.repoPath,
      mode: "discover-spec",
      interactiveVerboseLogs: isInteractiveVerboseLogsEnabled(),
    });

    try {
      return new CodexExecResumeDiscoverSession(
        this.repoPath,
        request,
        this.logger,
        this.dependencies.runCodexExecJsonCommand,
        this.resolveInvocationPreferences,
      );
    } catch (error) {
      throw new CodexDiscoverSpecSessionError("start", errorMessage(error));
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
        this.resolveInvocationPreferences,
      );
    } catch (error) {
      throw new CodexChatSessionError("start", errorMessage(error));
    }
  }

  async startSpecTicketValidationSession(
    request: SpecTicketValidationSessionStartRequest,
  ): Promise<SpecTicketValidationSession> {
    this.logger.info("Iniciando sessao stateful de spec-ticket-validation via Codex CLI exec/resume", {
      repoPath: this.repoPath,
      specPath: request.spec.path,
      specFileName: request.spec.fileName,
      mode: "spec-ticket-validation",
      ignoresTriageThreadId: true,
    });

    const promptTemplatePath = path.join(PROMPTS_DIR, SPEC_TICKET_VALIDATION_PROMPT_FILE);

    try {
      const promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
      return new CodexExecResumeSpecTicketValidationSession(
        this.repoPath,
        request,
        this.logger,
        this.dependencies.runCodexExecJsonCommand,
        this.resolveInvocationPreferences,
        promptTemplatePath,
        promptTemplate,
        this.runtimeShellGuidance.text,
      );
    } catch (error) {
      throw new CodexSpecTicketValidationSessionError("start", errorMessage(error));
    }
  }

  async runSpecTicketValidationAutoCorrect(
    request: SpecTicketValidationAutoCorrectRequest,
  ): Promise<SpecTicketValidationAutoCorrectResult> {
    const packageContext = request.packageContext.trim();
    if (!packageContext) {
      throw new CodexSpecTicketValidationAutoCorrectError(
        "input",
        "O pacote derivado a autocorrigir nao pode ser vazio.",
      );
    }

    this.logger.info("Executando autocorrecao do pacote derivado da spec via Codex CLI", {
      repoPath: this.repoPath,
      specPath: request.spec.path,
      specFileName: request.spec.fileName,
      cycleNumber: request.cycleNumber,
      allowedArtifactCount: request.allowedArtifactPaths.length,
    });

    const promptTemplatePath = path.join(
      PROMPTS_DIR,
      SPEC_TICKET_VALIDATION_AUTOCORRECT_PROMPT_FILE,
    );

    let promptTemplate = "";
    try {
      promptTemplate = await this.dependencies.loadPromptTemplate(promptTemplatePath);
    } catch (error) {
      throw new CodexSpecTicketValidationAutoCorrectError("start", errorMessage(error));
    }

    const prompt = this.buildSpecTicketValidationAutoCorrectPrompt(promptTemplate, request);
    const preferences = await this.resolveInvocationPreferences();

    let result: CodexCommandResult;
    try {
      result = await this.dependencies.runCodexExecJsonCommand({
        cwd: this.repoPath,
        args: buildSpecTicketValidationExecStartArgs(prompt, preferences),
        env: {
          ...process.env,
        },
      });
    } catch (error) {
      throw new CodexSpecTicketValidationAutoCorrectError("runtime", errorMessage(error));
    }

    const parsedTranscript = parseCodexExecJsonTranscript(result.stdout, result.stderr);
    if (!parsedTranscript.agentMessage) {
      throw new CodexSpecTicketValidationAutoCorrectError(
        "runtime",
        "Codex exec nao retornou agent_message no modo --json para a autocorrecao do gate.",
      );
    }

    let appliedCorrections: SpecTicketValidationAppliedCorrection[];
    try {
      appliedCorrections = parseSpecTicketValidationAutoCorrectOutput(parsedTranscript.agentMessage);
    } catch (error) {
      if (error instanceof SpecTicketValidationAutoCorrectParserError) {
        throw new CodexSpecTicketValidationAutoCorrectError("runtime", error.message);
      }
      throw error;
    }

    const diagnostics = buildCodexStageDiagnostics(result.stdout, result.stderr);
    return {
      output: parsedTranscript.agentMessage,
      appliedCorrections,
      ...(diagnostics ? { diagnostics } : {}),
      promptTemplatePath,
      promptText: prompt,
    };
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
    const plannedOutline = spec.plannedOutline;
    const sourceCommand = spec.sourceCommand ?? "/plan_spec";
    const assumptionsAndDefaults = spec.assumptionsAndDefaults ?? [];
    const decisionsAndTradeOffs = spec.decisionsAndTradeOffs ?? [];
    const categoryCoverage = spec.categoryCoverage ?? [];
    const criticalAmbiguities = spec.criticalAmbiguities ?? [];
    const traceRequestPath = spec.tracePaths?.requestPath ?? "";
    const traceResponsePath = spec.tracePaths?.responsePath ?? "";
    const traceDecisionPath = spec.tracePaths?.decisionPath ?? "";
    const retrospectiveContext =
      stage === "spec-ticket-derivation-retrospective"
        ? spec.derivationRetrospectiveContext?.trim()
        : spec.workflowRetrospectiveContext?.trim();

    if (
      stage === "plan-spec-materialize" &&
      (!plannedTitle ||
        !plannedSummary ||
        !plannedOutline ||
        !plannedOutline.objective.trim() ||
        plannedOutline.actors.length === 0 ||
        plannedOutline.journey.length === 0 ||
        plannedOutline.requirements.length === 0 ||
        plannedOutline.acceptanceCriteria.length === 0 ||
        plannedOutline.nonScope.length === 0)
    ) {
      throw new Error(
        [
          "Etapa plan-spec-materialize exige contexto estruturado aprovado da sessao /plan_spec ou /discover_spec.",
          "Campos minimos: titulo, resumo, objetivo, atores, jornada, RFs, CAs e nao-escopo.",
        ].join(" "),
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
      .replace(/<SPEC_SOURCE_COMMAND>/gu, sourceCommand)
      .replace(/<SPEC_OBJECTIVE>/gu, plannedOutline?.objective.trim() ?? "")
      .replace(/<SPEC_ACTORS>/gu, this.renderPlanSpecOutlineList(plannedOutline?.actors))
      .replace(/<SPEC_JOURNEY>/gu, this.renderPlanSpecOutlineList(plannedOutline?.journey))
      .replace(/<SPEC_REQUIREMENTS>/gu, this.renderPlanSpecOutlineList(plannedOutline?.requirements))
      .replace(
        /<SPEC_ACCEPTANCE_CRITERIA>/gu,
        this.renderPlanSpecOutlineList(plannedOutline?.acceptanceCriteria),
      )
      .replace(/<SPEC_NON_SCOPE>/gu, this.renderPlanSpecOutlineList(plannedOutline?.nonScope))
      .replace(
        /<SPEC_TECHNICAL_CONSTRAINTS>/gu,
        this.renderPlanSpecOutlineList(plannedOutline?.technicalConstraints),
      )
      .replace(
        /<SPEC_MANDATORY_VALIDATIONS>/gu,
        this.renderPlanSpecOutlineList(plannedOutline?.mandatoryValidations),
      )
      .replace(
        /<SPEC_PENDING_MANUAL_VALIDATIONS>/gu,
        this.renderPlanSpecOutlineList(plannedOutline?.pendingManualValidations),
      )
      .replace(
        /<SPEC_KNOWN_RISKS>/gu,
        this.renderPlanSpecOutlineList(plannedOutline?.knownRisks),
      )
      .replace(
        /<SPEC_ASSUMPTIONS_AND_DEFAULTS>/gu,
        this.renderPlanSpecOutlineList(assumptionsAndDefaults),
      )
      .replace(
        /<SPEC_DECISIONS_AND_TRADE_OFFS>/gu,
        this.renderPlanSpecOutlineList(decisionsAndTradeOffs),
      )
      .replace(
        /<SPEC_CATEGORY_COVERAGE>/gu,
        this.renderDiscoverSpecCategoryCoverageList(categoryCoverage),
      )
      .replace(
        /<SPEC_CRITICAL_AMBIGUITIES>/gu,
        this.renderPlanSpecOutlineList(criticalAmbiguities),
      )
      .replace(
        /<WORKFLOW_RETROSPECTIVE_CONTEXT>/gu,
        retrospectiveContext || "- Contexto adicional nao informado.",
      )
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
      ...(stage === "spec-close-and-version" ||
      stage === "spec-audit" ||
      stage === "plan-spec-version-and-push"
        ? [`- Commit esperado: \`${commitMessage}\``]
        : []),
      ...(stage === "plan-spec-materialize"
        ? [
            `- Fluxo de origem: \`${sourceCommand}\``,
            `- Titulo final aprovado: \`${plannedTitle}\``,
            `- Resumo final aprovado: \`${plannedSummary}\``,
            `- Objetivo aprovado: \`${plannedOutline?.objective.trim() ?? ""}\``,
            `- Atores aprovados: ${this.renderPlanSpecOutlineSummary(plannedOutline?.actors)}`,
            `- RFs aprovados: ${this.renderPlanSpecOutlineSummary(plannedOutline?.requirements)}`,
            `- CAs aprovados: ${this.renderPlanSpecOutlineSummary(plannedOutline?.acceptanceCriteria)}`,
            `- Assumptions/defaults aprovados: ${this.renderPlanSpecOutlineSummary(assumptionsAndDefaults)}`,
            `- Decisoes/trade-offs aprovados: ${this.renderPlanSpecOutlineSummary(decisionsAndTradeOffs)}`,
          ]
        : []),
      ...(stage === "plan-spec-version-and-push"
        ? [
            `- Fluxo de origem: \`${sourceCommand}\``,
            `- Trilha request: \`${traceRequestPath}\``,
            `- Trilha response: \`${traceResponsePath}\``,
            `- Trilha decision: \`${traceDecisionPath}\``,
          ]
        : []),
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private buildSpecTicketValidationAutoCorrectPrompt(
    promptTemplate: string,
    request: SpecTicketValidationAutoCorrectRequest,
  ): string {
    const autoCorrectableGaps = request.latestPass.gaps.filter((gap) => gap.isAutoCorrectable);

    return [
      promptTemplate.trimEnd(),
      "",
      this.runtimeShellGuidance.text,
      "",
      "Contexto adicional da autocorrecao atual:",
      `- Spec alvo: \`${request.spec.path}\``,
      `- Arquivo da spec: \`${request.spec.fileName}\``,
      `- Ciclo de autocorrecao: \`${request.cycleNumber}\``,
      "- Natureza desta rodada: pre-run-all / pacote derivado de spec-triage.",
      "",
      "## Artefatos permitidos para escrita",
      ...(request.allowedArtifactPaths.length > 0
        ? request.allowedArtifactPaths.map((entry) => `- ${entry}`)
        : ["- Nenhum"]),
      "",
      "## Gaps auto-corrigiveis do ultimo passe",
      ...(autoCorrectableGaps.length > 0
        ? autoCorrectableGaps.flatMap((gap) => [
            `- ${gap.gapType}: ${gap.summary}`,
            `  - Artefatos afetados: ${gap.affectedArtifactPaths.join(", ") || "nenhum"}`,
            `  - Requisitos: ${gap.requirementRefs.join(", ") || "nenhum"}`,
            `  - Evidencias: ${gap.evidence.join(" | ") || "nenhuma"}`,
          ])
        : ["- Nenhum"]),
      "",
      "## Pacote derivado atual",
      request.packageContext.trim(),
      "",
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private buildTargetPreparePrompt(
    promptTemplate: string,
    request: TargetPrepareCodexRequest,
  ): string {
    const stageTemplate = promptTemplate
      .replace(
        /<TARGET_PREPARE_ALLOWLIST>/gu,
        request.allowlistedPaths.map((entry) => `- \`${entry}\``).join("\n"),
      )
      .replace(
        /<TARGET_PREPARE_COPY_SOURCES>/gu,
        request.copySources
          .map(
            (entry) =>
              `- copy-exact \`${entry.targetPath}\` <= \`${entry.sourcePath}\``,
          )
          .join("\n"),
      )
      .replace(
        /<TARGET_PREPARE_MERGE_SOURCES>/gu,
        request.mergeSources
          .map(
            (entry) =>
              `- merge-managed-block \`${entry.targetPath}\` <= \`${entry.sourcePath}\` | marker: \`${entry.markerId}\``,
          )
          .join("\n"),
      )
      .replace(/<RUNNER_REPO_PATH>/gu, request.runnerRepoPath)
      .replace(/<RUNNER_REFERENCE>/gu, request.runnerReference)
      .replace(/<TARGET_PROJECT_NAME>/gu, request.targetProject.name)
      .replace(/<TARGET_PROJECT_PATH>/gu, request.targetProject.path);

    return [
      stageTemplate.trimEnd(),
      "",
      this.runtimeShellGuidance.text,
      "",
      "Contexto adicional do target_prepare:",
      `- Projeto alvo: \`${request.targetProject.name}\``,
      `- Caminho do projeto alvo: \`${request.targetProject.path}\``,
      `- Runner repo de referencia: \`${request.runnerRepoPath}\``,
      `- Referencia textual do runner: \`${request.runnerReference}\``,
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private buildTargetCheckupPrompt(
    promptTemplate: string,
    request: TargetCheckupCodexRequest,
  ): string {
    const stageTemplate = promptTemplate
      .replace(/<RUNNER_REPO_PATH>/gu, request.runnerRepoPath)
      .replace(/<RUNNER_REFERENCE>/gu, request.runnerReference)
      .replace(/<TARGET_PROJECT_NAME>/gu, request.targetProject.name)
      .replace(/<TARGET_PROJECT_PATH>/gu, request.targetProject.path)
      .replace(/<TARGET_CHECKUP_REPORT_JSON_PATH>/gu, request.reportJsonPath)
      .replace(/<TARGET_CHECKUP_REPORT_MARKDOWN_PATH>/gu, request.reportMarkdownPath)
      .replace(/<TARGET_CHECKUP_FACTS_JSON>/gu, request.reportFactsJson);

    return [
      stageTemplate.trimEnd(),
      "",
      this.runtimeShellGuidance.text,
      "",
      "Contexto adicional do target_checkup:",
      `- Projeto alvo: \`${request.targetProject.name}\``,
      `- Caminho do projeto alvo: \`${request.targetProject.path}\``,
      `- Runner repo de referencia: \`${request.runnerRepoPath}\``,
      `- Referencia textual do runner: \`${request.runnerReference}\``,
      `- Artefato JSON do relatorio: \`${request.reportJsonPath}\``,
      `- Artefato Markdown do relatorio: \`${request.reportMarkdownPath}\``,
      "- Responda somente com Markdown editorial derivado dos fatos serializados.",
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private renderPlanSpecOutlineList(values?: string[]): string {
    if (!values || values.length === 0) {
      return "- Nenhum";
    }

    return values.map((value) => `- ${value}`).join("\n");
  }

  private renderPlanSpecOutlineSummary(values?: string[]): string {
    if (!values || values.length === 0) {
      return "nenhum declarado";
    }

    return values.map((value) => `\`${value}\``).join(", ");
  }

  private renderDiscoverSpecCategoryCoverageList(
    values?: DiscoverSpecCategoryCoverage[],
  ): string {
    if (!values || values.length === 0) {
      return "- Nenhum";
    }

    return values
      .map((value) => {
        const detail = value.detail.trim() || "sem detalhe adicional";
        return `- ${value.label} [${value.status}]: ${detail}`;
      })
      .join("\n");
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

    if (stage === "spec-audit") {
      return `chore(specs): audit ${specFileName}`;
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
    private readonly resolveInvocationPreferences: () => Promise<CodexInvocationPreferences | null>,
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
    const preferences = await this.resolveInvocationPreferences();
    const args = this.threadId
      ? buildPlanSpecExecResumeArgs(this.threadId, prompt, preferences)
      : buildPlanSpecExecStartArgs(prompt, preferences);
    this.logVerbose("Sessao /plan_spec executando codex exec", {
      hasThreadId: Boolean(this.threadId),
      promptLength: prompt.length,
      model: preferences?.model ?? null,
      reasoningEffort: preferences?.reasoningEffort ?? null,
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
    if (parsed.turnContext) {
      this.emitEvent({
        type: "turn-context",
        model: parsed.turnContext.model,
        reasoningEffort: parsed.turnContext.reasoningEffort,
      });
    }

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

class CodexExecResumeDiscoverSession implements DiscoverSpecSession {
  private parserState: PlanSpecParserState = createPlanSpecParserState();
  private closed = false;
  private cancelled = false;
  private failureNotified = false;
  private threadId: string | null = null;
  private protocolPrimerInjected = false;
  private writePipeline: Promise<void> = Promise.resolve();

  constructor(
    private readonly repoPath: string,
    private readonly request: DiscoverSpecSessionStartRequest,
    private readonly logger: Logger,
    private readonly runCodexExecJsonCommand: (
      request: CodexExecJsonCommandRequest,
    ) => Promise<CodexCommandResult>,
    private readonly resolveInvocationPreferences: () => Promise<CodexInvocationPreferences | null>,
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
      throw new CodexDiscoverSpecSessionError("input", "A sessao interativa ja foi encerrada.");
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
    const preferences = await this.resolveInvocationPreferences();
    const args = this.threadId
      ? buildFreeChatExecResumeArgs(this.threadId, prompt, preferences)
      : buildFreeChatExecStartArgs(prompt, preferences);
    this.logVerbose("Sessao /discover_spec executando codex exec", {
      hasThreadId: Boolean(this.threadId),
      promptLength: prompt.length,
      model: preferences?.model ?? null,
      reasoningEffort: preferences?.reasoningEffort ?? null,
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
    if (parsed.turnContext) {
      this.emitEvent({
        type: "turn-context",
        model: parsed.turnContext.model,
        reasoningEffort: parsed.turnContext.reasoningEffort,
      });
    }

    const previousThreadId = this.threadId;
    if (parsed.threadId) {
      this.threadId = parsed.threadId;
    }

    if (!this.threadId) {
      const details = "Codex exec nao retornou thread_id para manter contexto de /discover_spec.";
      this.notifyFailure("runtime", details);
      throw new CodexDiscoverSpecSessionError("runtime", details);
    }

    if (previousThreadId && parsed.threadId && parsed.threadId !== previousThreadId) {
      this.logger.warn("Sessao /discover_spec recebeu thread_id diferente durante resume", {
        previousThreadId,
        nextThreadId: parsed.threadId,
      });
    }

    const finalMessage = parsed.agentMessage;
    if (!finalMessage) {
      const details =
        "Codex exec nao retornou agent_message no modo --json para manter resposta deterministica de /discover_spec.";
      this.notifyFailure("runtime", details);
      throw new CodexDiscoverSpecSessionError("runtime", details);
    }

    const parsedOutput = parsePlanSpecOutputChunk(this.parserState, finalMessage);
    this.parserState = parsedOutput.state;
    const hasStructuredEvent = parsedOutput.events.some(
      (event) => event.type === "question" || event.type === "final",
    );
    for (const event of parsedOutput.events) {
      this.forwardParserEvent(event);
    }
    if (!hasStructuredEvent) {
      this.emitEvent({ type: "turn-complete" });
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

  private emitEvent(event: DiscoverSpecSessionEvent): void {
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
    const error = new CodexDiscoverSpecSessionError(phase, details);
    try {
      this.request.callbacks.onFailure(error);
    } catch (callbackError) {
      this.logger.warn("Falha ao executar callback de erro da sessao interativa", {
        error: errorMessage(callbackError),
      });
    }
  }

  private notifyClose(result: DiscoverSpecSessionCloseResult): void {
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
    return [DISCOVER_SPEC_PROTOCOL_PRIMER, "", `Brief do operador: ${input}`].join("\n");
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
    private readonly resolveInvocationPreferences: () => Promise<CodexInvocationPreferences | null>,
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
    const preferences = await this.resolveInvocationPreferences();
    const args = this.threadId
      ? buildFreeChatExecResumeArgs(this.threadId, prompt, preferences)
      : buildFreeChatExecStartArgs(prompt, preferences);
    this.logVerbose("Sessao /codex_chat executando codex exec", {
      hasThreadId: Boolean(this.threadId),
      promptLength: prompt.length,
      model: preferences?.model ?? null,
      reasoningEffort: preferences?.reasoningEffort ?? null,
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
    if (parsed.turnContext) {
      this.emitEvent({
        type: "turn-context",
        model: parsed.turnContext.model,
        reasoningEffort: parsed.turnContext.reasoningEffort,
      });
    }

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

class CodexExecResumeSpecTicketValidationSession implements SpecTicketValidationSession {
  private closed = false;
  private threadId: string | null = null;
  private writePipeline: Promise<void> = Promise.resolve();

  constructor(
    private readonly repoPath: string,
    private readonly request: SpecTicketValidationSessionStartRequest,
    private readonly logger: Logger,
    private readonly runCodexExecJsonCommand: (
      request: CodexExecJsonCommandRequest,
    ) => Promise<CodexCommandResult>,
    private readonly resolveInvocationPreferences: () => Promise<CodexInvocationPreferences | null>,
    private readonly promptTemplatePath: string,
    private readonly promptTemplate: string,
    private readonly runtimeShellGuidanceText: string,
  ) {}

  async runTurn(
    request: SpecTicketValidationSessionTurnRequest,
  ): Promise<SpecTicketValidationSessionTurnResult> {
    const packageContext = request.packageContext.trim();
    if (!packageContext) {
      throw new CodexSpecTicketValidationSessionError(
        "input",
        "O pacote derivado a validar nao pode ser vazio.",
      );
    }

    if (this.closed) {
      throw new CodexSpecTicketValidationSessionError(
        "input",
        "A sessao stateful de spec-ticket-validation ja foi encerrada.",
      );
    }

    let turnResult: SpecTicketValidationSessionTurnResult | null = null;
    await this.enqueueWriteOperation(async () => {
      turnResult = await this.executeTurn(request);
    });

    if (!turnResult) {
      throw new CodexSpecTicketValidationSessionError(
        "runtime",
        "A sessao stateful nao retornou resultado para o turno atual.",
      );
    }

    return turnResult;
  }

  getThreadId(): string | null {
    return this.threadId;
  }

  async cancel(): Promise<void> {
    this.closed = true;
  }

  private async executeTurn(
    request: SpecTicketValidationSessionTurnRequest,
  ): Promise<SpecTicketValidationSessionTurnResult> {
    const prompt = this.buildPrompt(request);
    const preferences = await this.resolveInvocationPreferences();
    const args = this.threadId
      ? buildSpecTicketValidationExecResumeArgs(this.threadId, prompt, preferences)
      : buildSpecTicketValidationExecStartArgs(prompt, preferences);
    this.logVerbose("Sessao spec-ticket-validation executando codex exec", {
      hasThreadId: Boolean(this.threadId),
      promptLength: prompt.length,
      model: preferences?.model ?? null,
      reasoningEffort: preferences?.reasoningEffort ?? null,
      triageThreadIgnored: Boolean(this.request.triageThreadId),
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
      throw new CodexSpecTicketValidationSessionError("runtime", errorMessage(error));
    }

    if (this.closed) {
      throw new CodexSpecTicketValidationSessionError(
        "runtime",
        "A sessao foi encerrada antes da consolidacao do turno atual.",
      );
    }

    const parsedTranscript = parseCodexExecJsonTranscript(result.stdout, result.stderr);
    const previousThreadId = this.threadId;
    if (parsedTranscript.threadId) {
      this.threadId = parsedTranscript.threadId;
    }

    if (!this.threadId) {
      throw new CodexSpecTicketValidationSessionError(
        "runtime",
        "Codex exec nao retornou thread_id para manter contexto de spec-ticket-validation.",
      );
    }

    if (previousThreadId && parsedTranscript.threadId && parsedTranscript.threadId !== previousThreadId) {
      this.logger.warn("Sessao spec-ticket-validation recebeu thread_id diferente durante resume", {
        previousThreadId,
        nextThreadId: parsedTranscript.threadId,
      });
    }

    if (!parsedTranscript.agentMessage) {
      throw new CodexSpecTicketValidationSessionError(
        "runtime",
        "Codex exec nao retornou agent_message no modo --json para spec-ticket-validation.",
      );
    }

    let parsed: SpecTicketValidationPassResult;
    try {
      parsed = parseSpecTicketValidationOutput(parsedTranscript.agentMessage);
    } catch (error) {
      if (error instanceof SpecTicketValidationParserError) {
        throw new CodexSpecTicketValidationSessionError("runtime", error.message);
      }
      throw error;
    }

    const diagnostics = buildCodexStageDiagnostics(result.stdout, result.stderr);

    return {
      threadId: this.threadId,
      output: parsedTranscript.agentMessage,
      parsed,
      ...(diagnostics ? { diagnostics } : {}),
      promptTemplatePath: this.promptTemplatePath,
      promptText: prompt,
    };
  }

  private buildPrompt(request: SpecTicketValidationSessionTurnRequest): string {
    const appliedCorrectionsSummary = request.appliedCorrectionsSummary ?? [];

    return [
      this.promptTemplate.trimEnd(),
      "",
      this.runtimeShellGuidanceText,
      "",
      "Contexto adicional do gate atual:",
      `- Spec alvo: \`${this.request.spec.path}\``,
      `- Arquivo da spec: \`${this.request.spec.fileName}\``,
      `- Rodada atual: \`${this.threadId ? "revalidation" : "initial-validation"}\``,
      "- O contexto da triagem nao deve ser reutilizado nesta sessao.",
      "",
      "## Pacote derivado sob avaliacao",
      request.packageContext.trim(),
      "",
      "## Correcoes aplicadas desde a rodada anterior",
      ...(appliedCorrectionsSummary.length > 0
        ? appliedCorrectionsSummary.map((entry) => `- ${entry}`)
        : ["- Nenhuma"]),
      "",
      "- Execute somente esta etapa no repositorio alvo e mantenha fluxo sequencial.",
    ].join("\n");
  }

  private enqueueWriteOperation(operation: () => Promise<void>): Promise<void> {
    const scheduled = this.writePipeline.then(async () => operation());
    this.writePipeline = scheduled.catch(() => undefined);
    return scheduled;
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
  turnContext: CodexInvocationPreferences | null;
}

const parseCodexExecJsonTranscript = (
  stdout: string,
  stderr: string,
): CodexExecJsonTranscript => {
  let threadId: string | null = null;
  let agentMessage: string | null = null;
  let turnContext: CodexInvocationPreferences | null = null;
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

    if (eventType === "turn_context") {
      const payload = (event as { payload?: unknown }).payload;
      if (payload && typeof payload === "object") {
        const model = safeString((payload as { model?: unknown }).model);
        const reasoningEffort =
          safeString((payload as { effort?: unknown }).effort) ||
          readNestedReasoningEffort(payload);
        if (model && reasoningEffort) {
          turnContext = {
            model,
            reasoningEffort,
          };
        }
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

    const sanitized = sanitizeStructuredAssistantMessage(itemText).trim();
    agentMessage = sanitized || itemText.trim();
  }

  return {
    threadId,
    agentMessage,
    turnContext,
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

const readNestedReasoningEffort = (value: unknown): string => {
  if (!value || typeof value !== "object") {
    return "";
  }

  const collaborationMode = (value as { collaboration_mode?: unknown }).collaboration_mode;
  if (!collaborationMode || typeof collaborationMode !== "object") {
    return "";
  }

  const settings = (collaborationMode as { settings?: unknown }).settings;
  if (!settings || typeof settings !== "object") {
    return "";
  }

  return safeString((settings as { reasoning_effort?: unknown }).reasoning_effort);
};

const sanitizeStructuredAssistantMessage = (value: string): string => {
  return value
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
};

export const isTicketFlowStage = (stage: CodexFlowStage): stage is TicketFlowStage =>
  stage === "plan" || stage === "implement" || stage === "close-and-version";

const runCodexCommand = async (request: CodexCommandRequest): Promise<CodexCommandResult> => {
  return runCodexCliCommand({
    cwd: request.cwd,
    env: request.env,
    args: buildNonInteractiveCodexArgs(request.preferences ?? null),
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
        new CodexCliCommandError(
          [
            `${params.commandName} terminou com codigo ${String(code)}:`,
            summarizeCodexCliOutput(stderr) ?? summarizeCodexCliOutput(stdout) ?? "sem saida capturada",
          ].join(" "),
          stdout,
          stderr,
          code,
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
