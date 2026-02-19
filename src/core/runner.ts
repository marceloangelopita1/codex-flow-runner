import { promises as fs } from "node:fs";
import path from "node:path";
import { AppEnv } from "../config/env.js";
import { ProjectRef } from "../types/project.js";
import {
  PlanSpecSessionPhase,
  RunnerState,
  createInitialState,
} from "../types/state.js";
import {
  TicketFinalStage,
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
import { Logger } from "./logger.js";
import {
  CodexAuthenticationError,
  CodexPlanSessionError,
  CodexStageResult,
  CodexStageExecutionError,
  CodexTicketFlowClient,
  PlanSpecSession,
  PlanSpecSessionCloseResult,
  PlanSpecSessionEvent,
  SpecFlowStage,
  SpecRef,
  TicketFlowStage,
  isTicketFlowStage,
} from "../integrations/codex-client.js";
import {
  FileSystemSpecPlanningTraceStore,
  SpecPlanningTraceSession,
  SpecPlanningTraceStore,
} from "../integrations/spec-planning-trace-store.js";
import { GitSyncEvidence, GitVersioning } from "../integrations/git-client.js";
import { PlanSpecFinalActionId, PlanSpecFinalBlock } from "../integrations/plan-spec-parser.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";

type TicketFinalSummaryHandler = (
  summary: TicketFinalSummary,
) => Promise<TicketNotificationDelivery | null> | TicketNotificationDelivery | null;

export interface PlanSpecEventHandlers {
  onQuestion: (chatId: string, event: Extract<PlanSpecSessionEvent, { type: "question" }>) => Promise<void> | void;
  onFinal: (chatId: string, event: Extract<PlanSpecSessionEvent, { type: "final" }>) => Promise<void> | void;
  onRawOutput: (
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "raw-sanitized" }>,
  ) => Promise<void> | void;
  onFailure: (chatId: string, details: string) => Promise<void> | void;
  onLifecycleMessage?: (chatId: string, message: string) => Promise<void> | void;
}

export interface TicketRunnerOptions {
  planSpecSessionTimeoutMs?: number;
  now?: () => Date;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
  specPlanningTraceStoreFactory?: (projectPath: string) => SpecPlanningTraceStore;
  planSpecEventHandlers?: PlanSpecEventHandlers;
}

interface ActivePlanSpecSession {
  id: number;
  chatId: string;
  session: PlanSpecSession;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
  latestFinalBlock: PlanSpecFinalBlock | null;
}

type PlanSpecSessionChatRejectedResult =
  | {
      status: "inactive";
      message: string;
    }
  | {
      status: "ignored-chat";
      message: string;
    };

const PLAN_SPEC_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const PLAN_SPEC_INACTIVE_MESSAGE = "Nenhuma sessão /plan_spec ativa no momento.";
const PLAN_SPEC_CHAT_MISMATCH_MESSAGE =
  "Sessão /plan_spec em andamento em outro chat. Use o chat que iniciou a sessão.";
const PLAN_SPEC_BLOCKED_RUNNING_MESSAGE =
  "Nao e possivel iniciar /plan_spec enquanto o runner esta em execucao.";
const PLAN_SPEC_BLOCKED_RUN_ALL_MESSAGE =
  "Sessao /plan_spec ativa. Finalize com /plan_spec_cancel antes de iniciar /run_all.";
const PLAN_SPEC_BLOCKED_RUN_SPECS_MESSAGE =
  "Sessao /plan_spec ativa. Finalize com /plan_spec_cancel antes de iniciar /run_specs.";
const PLAN_SPEC_TIMEOUT_MESSAGE =
  "Sessao /plan_spec encerrada por inatividade de 30 minutos.";
const PLAN_SPEC_CANCELLED_MESSAGE = "Sessao /plan_spec cancelada.";

export interface RunnerRoundDependencies {
  activeProject: ProjectRef;
  queue: TicketQueue;
  codexClient: CodexTicketFlowClient;
  gitVersioning: GitVersioning;
}

export type RunnerRoundDependenciesResolver = () => Promise<RunnerRoundDependencies>;

export type RunAllRequestResult =
  | { status: "started" }
  | { status: "already-running" }
  | RunnerRequestBlockedResult;

export type RunSpecsRequestResult =
  | { status: "started" }
  | { status: "already-running" }
  | RunnerRequestBlockedResult;

type RunnerRequestBlockedResult = {
  status: "blocked";
  reason: "codex-auth-missing" | "active-project-unavailable" | "plan-spec-active";
  message: string;
};

export type SyncActiveProjectResult =
  | { status: "updated" }
  | { status: "blocked-running" }
  | { status: "blocked-plan-spec" };

export type PlanSpecSessionStartResult =
  | { status: "started"; message: string }
  | { status: "already-active"; message: string }
  | { status: "blocked-running"; message: string }
  | { status: "blocked"; reason: "active-project-unavailable" | "codex-auth-missing"; message: string }
  | { status: "failed"; message: string };

export type PlanSpecSessionInputResult =
  | { status: "accepted"; message: string }
  | { status: "ignored-empty"; message: string }
  | PlanSpecSessionChatRejectedResult;

export type PlanSpecSessionCancelResult =
  | { status: "cancelled"; message: string }
  | PlanSpecSessionChatRejectedResult;

export type PlanSpecCallbackResult =
  | { status: "accepted" }
  | {
      status: "ignored";
      message: string;
    };

export class TicketRunner {
  private readonly state: RunnerState;
  private loopPromise: Promise<void> | null = null;
  private isStarting = false;
  private queue: TicketQueue;
  private codexClient: CodexTicketFlowClient;
  private gitVersioning: GitVersioning;
  private readonly now: () => Date;
  private readonly setTimer: typeof setTimeout;
  private readonly clearTimer: typeof clearTimeout;
  private readonly planSpecSessionTimeoutMs: number;
  private readonly specPlanningTraceStoreFactory: (projectPath: string) => SpecPlanningTraceStore;
  private readonly planSpecEventHandlers?: PlanSpecEventHandlers;
  private activePlanSpecSession: ActivePlanSpecSession | null = null;
  private nextPlanSpecSessionId = 1;

  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
    initialRoundDependencies: RunnerRoundDependencies,
    private readonly resolveRoundDependencies: RunnerRoundDependenciesResolver,
    private readonly onTicketFinalized?: TicketFinalSummaryHandler,
    options: TicketRunnerOptions = {},
  ) {
    this.queue = initialRoundDependencies.queue;
    this.codexClient = initialRoundDependencies.codexClient;
    this.gitVersioning = initialRoundDependencies.gitVersioning;
    this.state = createInitialState(initialRoundDependencies.activeProject);
    this.now = options.now ?? (() => new Date());
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
    this.planSpecSessionTimeoutMs =
      options.planSpecSessionTimeoutMs ?? PLAN_SPEC_SESSION_TIMEOUT_MS;
    this.specPlanningTraceStoreFactory =
      options.specPlanningTraceStoreFactory ??
      ((projectPath: string) => new FileSystemSpecPlanningTraceStore(projectPath));
    this.planSpecEventHandlers = options.planSpecEventHandlers;
    this.state.updatedAt = this.now();
  }

  getState = (): RunnerState => ({
    ...this.state,
    ...(this.state.activeProject
      ? {
          activeProject: { ...this.state.activeProject },
        }
      : {}),
    ...(this.state.planSpecSession
      ? {
          planSpecSession: {
            ...this.state.planSpecSession,
            activeProjectSnapshot: { ...this.state.planSpecSession.activeProjectSnapshot },
            startedAt: new Date(this.state.planSpecSession.startedAt),
            lastActivityAt: new Date(this.state.planSpecSession.lastActivityAt),
          },
        }
      : {}),
    ...(this.state.lastNotifiedEvent
      ? {
          lastNotifiedEvent: {
            summary: { ...this.state.lastNotifiedEvent.summary },
            delivery: { ...this.state.lastNotifiedEvent.delivery },
          },
        }
      : {}),
  });

  requestPause = (): void => {
    this.state.isPaused = true;
    if (this.isPlanSpecSessionActive()) {
      this.logger.info("Pausa solicitada durante sessao /plan_spec ativa", {
        phase: this.state.phase,
        planSpecPhase: this.state.planSpecSession?.phase,
      });
      return;
    }
    this.touch("paused", "Pausa solicitada via Telegram");
  };

  requestResume = (): void => {
    this.state.isPaused = false;
    if (this.isPlanSpecSessionActive()) {
      this.logger.info("Resume solicitado durante sessao /plan_spec ativa", {
        phase: this.state.phase,
        planSpecPhase: this.state.planSpecSession?.phase,
      });
      return;
    }
    this.touch("idle", "Runner retomado via Telegram");
  };

  syncActiveProject = (project: ProjectRef): SyncActiveProjectResult => {
    if (this.state.isRunning || this.loopPromise || this.isStarting) {
      return { status: "blocked-running" };
    }

    if (this.isPlanSpecSessionActive()) {
      return { status: "blocked-plan-spec" };
    }

    this.state.activeProject = { ...project };
    this.state.lastMessage = `Projeto ativo atualizado para ${project.name} via Telegram`;
    this.state.updatedAt = this.now();

    this.logger.info("Projeto ativo sincronizado manualmente no estado do runner", {
      activeProjectName: project.name,
      activeProjectPath: project.path,
      phase: this.state.phase,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
    });

    return { status: "updated" };
  };

  startPlanSpecSession = async (chatId: string): Promise<PlanSpecSessionStartResult> => {
    this.logger.info("Solicitacao de inicio de sessao /plan_spec recebida", {
      chatId,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      hasActivePlanSpecSession: this.isPlanSpecSessionActive(),
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    if (this.isBusy()) {
      return {
        status: "blocked-running",
        message: PLAN_SPEC_BLOCKED_RUNNING_MESSAGE,
      };
    }

    if (this.isPlanSpecSessionActive()) {
      return {
        status: "already-active",
        message: "Ja existe uma sessao /plan_spec em andamento nesta instancia.",
      };
    }

    try {
      const roundDependencies = await this.resolveRoundDependencies();
      this.applyRoundDependencies(roundDependencies);
    } catch (error) {
      const message = this.buildActiveProjectResolutionErrorMessage(error, "plan-spec");
      this.touch("error", message);
      this.logger.error("Falha ao resolver projeto ativo para iniciar /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    try {
      await this.codexClient.ensureAuthenticated();
    } catch (error) {
      const message =
        error instanceof CodexAuthenticationError
          ? error.message
          : [
              "Falha ao validar autenticacao do Codex CLI.",
              "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
            ].join(" ");
      this.touch("error", message);
      this.logger.error("Falha de autenticacao do Codex CLI ao iniciar /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: this.state.activeProject?.name,
        activeProjectPath: this.state.activeProject?.path,
      });
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    const activeProject = this.state.activeProject;
    if (!activeProject) {
      const message =
        "Falha ao iniciar /plan_spec: projeto ativo indisponivel no estado do runner.";
      this.touch("error", message);
      this.logger.error("Projeto ativo indisponivel ao iniciar /plan_spec");
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    const sessionId = this.nextPlanSpecSessionId;
    this.nextPlanSpecSessionId += 1;

    try {
      const session = await this.codexClient.startPlanSession({
        callbacks: {
          onEvent: (event) => {
            void this.handlePlanSpecSessionEvent(sessionId, event);
          },
          onFailure: (error) => {
            void this.handlePlanSpecSessionFailure(sessionId, error);
          },
          onClose: (result) => {
            void this.handlePlanSpecSessionClose(sessionId, result);
          },
        },
      });

      const now = this.now();
      this.state.planSpecSession = {
        chatId,
        phase: "awaiting-brief",
        startedAt: now,
        lastActivityAt: now,
        activeProjectSnapshot: { ...activeProject },
      };
      this.activePlanSpecSession = {
        id: sessionId,
        chatId,
        session,
        timeoutHandle: null,
        latestFinalBlock: null,
      };

      this.refreshPlanSpecTimeout(sessionId);
      this.touch("plan-spec-awaiting-brief", "Sessao /plan_spec iniciada e aguardando brief inicial");

      return {
        status: "started",
        message: "Sessao /plan_spec iniciada. Envie a proxima mensagem com o brief inicial.",
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      const message =
        error instanceof CodexPlanSessionError
          ? error.message
          : `Falha ao iniciar sessao /plan_spec: ${details}`;
      this.touch("error", message);
      this.logger.error("Falha ao iniciar sessao interativa /plan_spec", {
        error: details,
      });
      await this.emitPlanSpecFailure(chatId, message);
      return {
        status: "failed",
        message,
      };
    }
  };

  submitPlanSpecInput = async (
    chatId: string,
    input: string,
  ): Promise<PlanSpecSessionInputResult> => {
    const session = this.resolvePlanSpecSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    const normalizedInput = input.trim();
    if (!normalizedInput) {
      return {
        status: "ignored-empty",
        message: "Mensagem vazia ignorada na sessao /plan_spec.",
      };
    }

    const isInitialBrief = this.state.planSpecSession?.phase === "awaiting-brief";
    try {
      await session.session.sendUserInput(normalizedInput);
      this.setPlanSpecPhase(
        "waiting-codex",
        "plan-spec-waiting-codex",
        isInitialBrief
          ? "Brief inicial enviado ao Codex na sessao /plan_spec"
          : "Mensagem enviada ao Codex na sessao /plan_spec",
      );
      return {
        status: "accepted",
        message: isInitialBrief
          ? "Brief inicial enviado para o Codex."
          : "Mensagem encaminhada para a sessao /plan_spec.",
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      await this.handlePlanSpecSessionFailure(session.id, error);
      return {
        status: "inactive",
        message: `Falha ao encaminhar mensagem para a sessao /plan_spec: ${details}`,
      };
    }
  };

  cancelPlanSpecSession = async (chatId: string): Promise<PlanSpecSessionCancelResult> => {
    const session = this.resolvePlanSpecSessionForChat(chatId);
    if ("status" in session) {
      return session;
    }

    await this.finalizePlanSpecSession(session.id, {
      mode: "cancel",
      phase: "idle",
      message: PLAN_SPEC_CANCELLED_MESSAGE,
    });

    return {
      status: "cancelled",
      message: PLAN_SPEC_CANCELLED_MESSAGE,
    };
  };

  handlePlanSpecQuestionOptionSelection = async (
    chatId: string,
    optionValue: string,
  ): Promise<PlanSpecCallbackResult> => {
    const result = await this.submitPlanSpecInput(chatId, optionValue);
    if (result.status === "accepted") {
      return { status: "accepted" };
    }

    return {
      status: "ignored",
      message: result.message,
    };
  };

  handlePlanSpecFinalActionSelection = async (
    chatId: string,
    action: PlanSpecFinalActionId,
  ): Promise<PlanSpecCallbackResult> => {
    const session = this.resolvePlanSpecSessionForChat(chatId);
    if ("status" in session) {
      return {
        status: "ignored",
        message: session.message,
      };
    }

    if (action === "cancel") {
      await this.finalizePlanSpecSession(session.id, {
        mode: "cancel",
        phase: "idle",
        message: PLAN_SPEC_CANCELLED_MESSAGE,
      });
      return { status: "accepted" };
    }

    if (action === "create-spec") {
      return this.handlePlanSpecCreateSpecSelection(session);
    }

    const result = await this.submitPlanSpecInput(
      chatId,
      "Refinar. Continue o planejamento e faca as perguntas necessarias.",
    );
    if (result.status === "accepted") {
      return { status: "accepted" };
    }

    return {
      status: "ignored",
      message: result.message,
    };
  };

  private async handlePlanSpecCreateSpecSelection(
    session: ActivePlanSpecSession,
  ): Promise<PlanSpecCallbackResult> {
    const planSpecSession = this.state.planSpecSession;
    if (!planSpecSession) {
      return {
        status: "ignored",
        message: PLAN_SPEC_INACTIVE_MESSAGE,
      };
    }

    if (planSpecSession.phase !== "awaiting-final-action") {
      return {
        status: "ignored",
        message:
          "Acao `Criar spec` so pode ser executada apos o bloco final do planejamento. Use `Refinar` para continuar.",
      };
    }

    const finalBlock = session.latestFinalBlock;
    if (!finalBlock) {
      return {
        status: "ignored",
        message:
          "Bloco final do planejamento indisponivel para `Criar spec`. Solicite `Refinar` e conclua novamente.",
      };
    }

    const createdAt = this.now();
    const spec = this.buildPlannedSpecRef(finalBlock.title, createdAt);
    const commitMessage = `feat(spec): add ${spec.fileName}`;
    const activeProject = planSpecSession.activeProjectSnapshot;

    try {
      await this.assertSpecPathAvailable(activeProject.path, spec.path);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return {
        status: "ignored",
        message: details,
      };
    }

    let traceSession: SpecPlanningTraceSession;
    const traceStore = this.specPlanningTraceStoreFactory(activeProject.path);
    try {
      traceSession = await traceStore.startSession({
        sessionId: session.id,
        chatId: session.chatId,
        specPath: spec.path,
        specFileName: spec.fileName,
        specTitle: finalBlock.title,
        specSummary: finalBlock.summary,
        commitMessage,
        createdAt,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error("Falha ao persistir trilha spec_planning antes da acao create-spec", {
        sessionId: session.id,
        chatId: session.chatId,
        specPath: spec.path,
        error: details,
      });
      return {
        status: "ignored",
        message: `Falha ao persistir trilha spec_planning: ${details}`,
      };
    }

    this.isStarting = true;
    this.state.currentSpec = spec.fileName;
    try {
      await this.finalizePlanSpecSession(session.id, {
        mode: "cancel",
        phase: "plan-spec-waiting-codex",
        message: `Sessao /plan_spec encerrada para executar Criar spec: ${spec.fileName}`,
        notifyMessage: `Executando Criar spec para ${spec.path}.`,
      });

      this.touch(
        "plan-spec-waiting-codex",
        `Executando etapa plan-spec-materialize para ${spec.fileName}`,
      );
      const materializeResult = await this.codexClient.runSpecStage("plan-spec-materialize", {
        fileName: spec.fileName,
        path: spec.path,
        plannedTitle: finalBlock.title,
        plannedSummary: finalBlock.summary,
      });
      await traceStore.writeStageResponse(traceSession.materializeResponsePath, {
        stage: "plan-spec-materialize",
        output: materializeResult.output,
        recordedAt: this.now(),
      });
      await this.assertPlannedSpecMetadata(activeProject.path, spec.path);

      this.touch(
        "plan-spec-waiting-codex",
        `Executando etapa plan-spec-version-and-push para ${spec.fileName}`,
      );
      const versionResult = await this.codexClient.runSpecStage("plan-spec-version-and-push", {
        fileName: spec.fileName,
        path: spec.path,
        commitMessage,
        tracePaths: {
          requestPath: traceSession.requestPath,
          responsePath: traceSession.materializeResponsePath,
          decisionPath: traceSession.decisionPath,
        },
      });
      await traceStore.writeStageResponse(traceSession.versionAndPushResponsePath, {
        stage: "plan-spec-version-and-push",
        output: versionResult.output,
        recordedAt: this.now(),
      });

      this.touch("idle", `Spec criada e versionada com sucesso: ${spec.path}`);
      await this.emitPlanSpecLifecycleMessage(
        session.chatId,
        `Spec criada e versionada com sucesso: ${spec.path}`,
      );
      return { status: "accepted" };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.touch(
        "error",
        `Falha ao executar acao Criar spec para ${spec.fileName}: ${details}`,
      );
      this.logger.error("Falha na acao final create-spec da sessao /plan_spec", {
        sessionId: session.id,
        chatId: session.chatId,
        specFileName: spec.fileName,
        specPath: spec.path,
        error: details,
      });
      await this.emitPlanSpecFailure(session.chatId, `Falha ao criar spec planejada: ${details}`);
      return {
        status: "ignored",
        message: `Falha ao criar spec planejada: ${details}`,
      };
    } finally {
      this.state.currentSpec = null;
      this.isStarting = false;
    }
  }

  requestRunAll = async (): Promise<RunAllRequestResult> => {
    this.logger.info("Solicitacao de rodada recebida", {
      command: "run-all",
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    if (this.isPlanSpecSessionActive()) {
      this.logger.warn("Comando /run-all bloqueado por sessao /plan_spec ativa", {
        phase: this.state.phase,
        planSpecPhase: this.state.planSpecSession?.phase,
        activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      });
      return {
        status: "blocked",
        reason: "plan-spec-active",
        message: PLAN_SPEC_BLOCKED_RUN_ALL_MESSAGE,
      };
    }

    if (this.isBusy()) {
      this.logger.warn("Comando /run-all ignorado: runner ja esta em execucao", {
        phase: this.state.phase,
        currentTicket: this.state.currentTicket,
        currentSpec: this.state.currentSpec,
      });
      return { status: "already-running" };
    }

    this.isStarting = true;
    this.logger.info("Inicializando rodada /run-all", {
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    const preflightOutcome = await this.prepareRoundStart("run-all");
    if (preflightOutcome) {
      this.isStarting = false;
      return preflightOutcome;
    }

    this.startLoop(() => this.runForever());

    this.logger.info("Rodada /run-all agendada no loop principal", {
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    return { status: "started" };
  };

  requestRunSpecs = async (specFileName: string): Promise<RunSpecsRequestResult> => {
    const normalizedSpecFileName = this.normalizeSpecFileName(specFileName);
    const spec: SpecRef = {
      fileName: normalizedSpecFileName,
      path: this.resolveSpecPath(normalizedSpecFileName),
    };

    this.logger.info("Solicitacao de triagem de spec recebida", {
      command: "run-specs",
      specFileName: spec.fileName,
      specPath: spec.path,
      phase: this.state.phase,
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    if (this.isPlanSpecSessionActive()) {
      this.logger.warn("Comando /run_specs bloqueado por sessao /plan_spec ativa", {
        specFileName: spec.fileName,
        phase: this.state.phase,
        planSpecPhase: this.state.planSpecSession?.phase,
        activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      });
      return {
        status: "blocked",
        reason: "plan-spec-active",
        message: PLAN_SPEC_BLOCKED_RUN_SPECS_MESSAGE,
      };
    }

    if (this.isBusy()) {
      this.logger.warn("Comando /run_specs ignorado: runner ja esta em execucao", {
        phase: this.state.phase,
        currentTicket: this.state.currentTicket,
        currentSpec: this.state.currentSpec,
      });
      return { status: "already-running" };
    }

    this.isStarting = true;
    this.logger.info("Inicializando fluxo /run_specs", {
      specFileName: spec.fileName,
      specPath: spec.path,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    const preflightOutcome = await this.prepareRoundStart("run-specs");
    if (preflightOutcome) {
      this.isStarting = false;
      return preflightOutcome;
    }

    this.startLoop(() => this.runSpecsAndRunAll(spec));

    this.logger.info("Fluxo /run_specs agendado no loop principal", {
      specFileName: spec.fileName,
      specPath: spec.path,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    return { status: "started" };
  };

  private isPlanSpecSessionActive(): boolean {
    return Boolean(this.activePlanSpecSession && this.state.planSpecSession);
  }

  private resolvePlanSpecSessionForChat(
    chatId: string,
  ): ActivePlanSpecSession | PlanSpecSessionChatRejectedResult {
    if (!this.activePlanSpecSession || !this.state.planSpecSession) {
      return {
        status: "inactive",
        message: PLAN_SPEC_INACTIVE_MESSAGE,
      };
    }

    if (this.activePlanSpecSession.chatId !== chatId) {
      return {
        status: "ignored-chat",
        message: PLAN_SPEC_CHAT_MISMATCH_MESSAGE,
      };
    }

    return this.activePlanSpecSession;
  }

  private setPlanSpecPhase(
    phase: PlanSpecSessionPhase,
    runnerPhase: RunnerState["phase"],
    message: string,
  ): void {
    const planSpecSession = this.state.planSpecSession;
    const activeSession = this.activePlanSpecSession;
    if (!planSpecSession || !activeSession) {
      return;
    }

    planSpecSession.phase = phase;
    planSpecSession.lastActivityAt = this.now();
    this.refreshPlanSpecTimeout(activeSession.id);
    this.touch(runnerPhase, message);
  }

  private refreshPlanSpecTimeout(sessionId: number): void {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
    }

    activeSession.timeoutHandle = this.setTimer(() => {
      void this.handlePlanSpecSessionTimeout(sessionId);
    }, this.planSpecSessionTimeoutMs);
    activeSession.timeoutHandle.unref?.();
  }

  private async handlePlanSpecSessionTimeout(sessionId: number): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    this.logger.warn("Sessao /plan_spec expirada por inatividade", {
      chatId: activeSession.chatId,
      timeoutMs: this.planSpecSessionTimeoutMs,
      activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.planSpecSession?.activeProjectSnapshot.path,
    });

    await this.finalizePlanSpecSession(sessionId, {
      mode: "cancel",
      phase: "idle",
      message: PLAN_SPEC_TIMEOUT_MESSAGE,
      notifyMessage: PLAN_SPEC_TIMEOUT_MESSAGE,
    });
  }

  private async handlePlanSpecSessionEvent(
    sessionId: number,
    event: PlanSpecSessionEvent,
  ): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    const planSpecSession = this.state.planSpecSession;
    if (!activeSession || !planSpecSession || activeSession.id !== sessionId) {
      return;
    }

    planSpecSession.lastActivityAt = this.now();
    this.refreshPlanSpecTimeout(sessionId);

    if (event.type === "question") {
      activeSession.latestFinalBlock = null;
      this.setPlanSpecPhase(
        "waiting-user",
        "plan-spec-waiting-user",
        "Sessao /plan_spec aguardando resposta do operador",
      );
      await this.emitPlanSpecQuestion(activeSession.chatId, event);
      return;
    }

    if (event.type === "final") {
      activeSession.latestFinalBlock = {
        title: event.final.title,
        summary: event.final.summary,
        actions: event.final.actions.map((action) => ({ ...action })),
      };
      this.setPlanSpecPhase(
        "awaiting-final-action",
        "plan-spec-awaiting-final-action",
        "Sessao /plan_spec aguardando acao final do operador",
      );
      await this.emitPlanSpecFinal(activeSession.chatId, event);
      return;
    }

    this.touch(this.state.phase, "Sessao /plan_spec recebeu saida nao parseavel do Codex");
    await this.emitPlanSpecRawOutput(activeSession.chatId, event);
  }

  private async handlePlanSpecSessionFailure(sessionId: number, error: unknown): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    const details = error instanceof Error ? error.message : String(error);
    this.logger.error("Falha na sessao /plan_spec", {
      chatId: activeSession.chatId,
      error: details,
      phase: this.state.planSpecSession?.phase,
      activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.planSpecSession?.activeProjectSnapshot.path,
    });

    await this.finalizePlanSpecSession(sessionId, {
      mode: "cancel",
      phase: "error",
      message: "Falha na sessao /plan_spec",
    });
    await this.emitPlanSpecFailure(activeSession.chatId, details);
  }

  private async handlePlanSpecSessionClose(
    sessionId: number,
    result: PlanSpecSessionCloseResult,
  ): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (result.cancelled) {
      await this.finalizePlanSpecSession(sessionId, {
        mode: "closed",
        phase: "idle",
        message: PLAN_SPEC_CANCELLED_MESSAGE,
      });
      return;
    }

    const message = `Sessao /plan_spec encerrada inesperadamente (exit code: ${String(result.exitCode)}).`;
    this.logger.warn("Sessao /plan_spec encerrada sem cancelamento explicito", {
      chatId: activeSession.chatId,
      exitCode: result.exitCode,
      activeProjectName: this.state.planSpecSession?.activeProjectSnapshot.name,
      activeProjectPath: this.state.planSpecSession?.activeProjectSnapshot.path,
    });
    await this.finalizePlanSpecSession(sessionId, {
      mode: "closed",
      phase: "error",
      message,
    });
    await this.emitPlanSpecFailure(activeSession.chatId, message);
  }

  private async finalizePlanSpecSession(
    sessionId: number,
    options: {
      mode: "cancel" | "closed";
      phase: RunnerState["phase"];
      message: string;
      notifyMessage?: string;
    },
  ): Promise<void> {
    const activeSession = this.activePlanSpecSession;
    if (!activeSession || activeSession.id !== sessionId) {
      return;
    }

    if (activeSession.timeoutHandle) {
      this.clearTimer(activeSession.timeoutHandle);
    }

    this.activePlanSpecSession = null;
    this.state.planSpecSession = null;

    if (options.mode === "cancel") {
      try {
        await activeSession.session.cancel();
      } catch (error) {
        this.logger.warn("Falha ao cancelar processo da sessao /plan_spec", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.touch(options.phase, options.message);

    if (options.notifyMessage) {
      await this.emitPlanSpecLifecycleMessage(activeSession.chatId, options.notifyMessage);
    }
  }

  private async emitPlanSpecQuestion(
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "question" }>,
  ): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onQuestion(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar pergunta de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecFinal(
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "final" }>,
  ): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onFinal(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar finalizacao de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecRawOutput(
    chatId: string,
    event: Extract<PlanSpecSessionEvent, { type: "raw-sanitized" }>,
  ): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onRawOutput(chatId, event);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar saida bruta de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecFailure(chatId: string, details: string): Promise<void> {
    if (!this.planSpecEventHandlers) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onFailure(chatId, details);
    } catch (error) {
      this.logger.warn("Falha ao encaminhar erro de /plan_spec para integracao", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async emitPlanSpecLifecycleMessage(chatId: string, message: string): Promise<void> {
    if (!this.planSpecEventHandlers?.onLifecycleMessage) {
      return;
    }

    try {
      await this.planSpecEventHandlers.onLifecycleMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar mensagem de lifecycle de /plan_spec", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private isBusy(): boolean {
    return this.state.isRunning || Boolean(this.loopPromise) || this.isStarting;
  }

  private startLoop(loopFactory: () => Promise<void>): void {
    this.state.isRunning = true;
    this.loopPromise = loopFactory()
      .catch((error) => {
        this.state.isRunning = false;
        this.touch("error", "Falha fatal no loop principal");
        this.logger.error("Erro fatal no loop principal", {
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.loopPromise = null;
        this.isStarting = false;
        this.state.currentSpec = null;
      });
    this.isStarting = false;
  }

  private async prepareRoundStart(
    source: "run-all" | "run-specs",
  ): Promise<RunnerRequestBlockedResult | null> {
    const command = source === "run-all" ? "/run-all" : "/run_specs";

    try {
      const roundDependencies = await this.resolveRoundDependencies();
      this.applyRoundDependencies(roundDependencies);
    } catch (error) {
      const message = this.buildActiveProjectResolutionErrorMessage(error, source);
      this.touch("error", message);
      this.logger.error("Falha ao resolver projeto ativo antes da rodada", {
        command,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: "blocked",
        reason: "active-project-unavailable",
        message,
      };
    }

    try {
      await this.codexClient.ensureAuthenticated();
    } catch (error) {
      const message =
        error instanceof CodexAuthenticationError
          ? error.message
          : [
              "Falha ao validar autenticacao do Codex CLI.",
              "Execute `codex login` no mesmo usuario que roda o runner e tente novamente.",
            ].join(" ");
      this.touch("error", message);
      this.logger.error("Falha de autenticacao do Codex CLI antes da rodada", {
        command,
        error: error instanceof Error ? error.message : String(error),
        activeProjectName: this.state.activeProject?.name,
        activeProjectPath: this.state.activeProject?.path,
      });
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    this.logger.info("Autenticacao do Codex CLI validada para rodada", {
      command,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    return null;
  }

  private async runSpecsAndRunAll(spec: SpecRef): Promise<void> {
    const specStartedAt = Date.now();
    this.state.currentSpec = spec.fileName;
    this.touch("select-spec", `Triagem da spec ${spec.fileName} iniciada`);

    try {
      await this.runSpecStage(
        "spec-triage",
        spec,
        `Executando etapa spec-triage para ${spec.fileName}`,
      );
      await this.runSpecStage(
        "spec-close-and-version",
        spec,
        `Executando etapa spec-close-and-version para ${spec.fileName}`,
      );
      this.logger.info("Triagem de spec concluida com sucesso", {
        spec: spec.fileName,
        specPath: spec.path,
        durationMs: Date.now() - specStartedAt,
      });
      this.state.currentSpec = null;
      this.touch("idle", `Triagem da spec ${spec.fileName} concluida; iniciando rodada /run-all`);
      await this.runForever();
    } catch (error) {
      const stage =
        error instanceof CodexStageExecutionError &&
        (error.stage === "spec-triage" || error.stage === "spec-close-and-version")
          ? error.stage
          : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const failedAtCloseAndVersion = stage === "spec-close-and-version";
      this.state.isRunning = false;
      this.touch(
        "error",
        failedAtCloseAndVersion
          ? `Falha ao encerrar triagem da spec ${spec.fileName}; rodada /run-all bloqueada`
          : `Falha ao executar triagem da spec ${spec.fileName}`,
      );
      this.logger.error("Erro no ciclo de triagem de spec", {
        spec: spec.fileName,
        specPath: spec.path,
        stage,
        error: errorMessage,
        durationMs: Date.now() - specStartedAt,
      });
    } finally {
      this.state.currentSpec = null;
    }
  }

  private normalizeSpecFileName(specFileName: string): string {
    const trimmed = specFileName.trim();
    if (trimmed.startsWith("docs/specs/")) {
      return trimmed.slice("docs/specs/".length);
    }

    return trimmed;
  }

  private resolveSpecPath(specFileName: string): string {
    if (specFileName.startsWith("docs/specs/")) {
      return specFileName;
    }

    return `docs/specs/${specFileName}`;
  }

  private buildPlannedSpecRef(title: string, createdAt: Date): SpecRef {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      throw new Error(
        "Titulo final vazio no bloco de planejamento. Use `Refinar` para informar um titulo valido.",
      );
    }

    const slug = normalizedTitle
      .normalize("NFKD")
      .replace(/[\u0300-\u036F]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .replace(/-{2,}/gu, "-");

    if (!slug) {
      throw new Error(
        "Nao foi possivel derivar slug do titulo final. Use `Refinar` com titulo contendo letras ou numeros.",
      );
    }

    const datePrefix = createdAt.toISOString().slice(0, 10);
    const fileName = `${datePrefix}-${slug}.md`;
    return {
      fileName,
      path: this.resolveSpecPath(fileName),
    };
  }

  private async assertSpecPathAvailable(projectPath: string, relativeSpecPath: string): Promise<void> {
    const absoluteSpecPath = this.resolveProjectRelativePath(projectPath, relativeSpecPath);
    try {
      await fs.access(absoluteSpecPath);
      throw new Error(
        `Ja existe ${relativeSpecPath}. Use \`Refinar\` e ajuste o titulo final para gerar novo slug.`,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }

      if (error instanceof Error && /Ja existe/u.test(error.message)) {
        throw error;
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao validar colisao de arquivo da spec: ${details}`);
    }
  }

  private async assertPlannedSpecMetadata(projectPath: string, relativeSpecPath: string): Promise<void> {
    const absoluteSpecPath = this.resolveProjectRelativePath(projectPath, relativeSpecPath);
    let content = "";
    try {
      content = await fs.readFile(absoluteSpecPath, "utf8");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao ler spec criada ${relativeSpecPath}: ${details}`);
    }

    if (!/^\s*-\s*Status\s*:\s*approved\s*$/imu.test(content)) {
      throw new Error(
        `Spec criada sem metadata obrigatoria \`Status: approved\` em ${relativeSpecPath}.`,
      );
    }

    if (!/^\s*-\s*Spec treatment\s*:\s*pending\s*$/imu.test(content)) {
      throw new Error(
        `Spec criada sem metadata obrigatoria \`Spec treatment: pending\` em ${relativeSpecPath}.`,
      );
    }
  }

  private resolveProjectRelativePath(projectPath: string, relativePath: string): string {
    return path.join(projectPath, ...relativePath.split("/"));
  }

  private async runForever(): Promise<void> {
    const roundStartedAt = Date.now();
    this.logger.info("Preparando estrutura da rodada /run-all", {
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });
    await this.queue.ensureStructure();
    if (!this.state.isRunning) {
      this.logger.warn("Rodada /run-all encerrada antes de iniciar processamento", {
        activeProjectName: this.state.activeProject?.name,
        activeProjectPath: this.state.activeProject?.path,
      });
      return;
    }
    this.touch("idle", "Rodada /run-all iniciada");
    const processedTickets = new Set<string>();
    this.logger.info("Loop da rodada /run-all iniciado", {
      pollIntervalMs: this.env.POLL_INTERVAL_MS,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });

    while (this.state.isRunning) {
      if (this.state.isPaused) {
        await sleep(this.env.POLL_INTERVAL_MS);
        continue;
      }

      this.touch("select-ticket", "Buscando proximo ticket aberto");
      const ticket = await this.queue.nextOpenTicket();

      if (!ticket) {
        this.state.isRunning = false;
        this.touch("idle", "Rodada /run-all finalizada: nenhum ticket aberto restante");
        this.logger.info("Rodada /run-all finalizada sem tickets pendentes", {
          processedTicketsCount: processedTickets.size,
          durationMs: Date.now() - roundStartedAt,
          activeProjectName: this.state.activeProject?.name,
          activeProjectPath: this.state.activeProject?.path,
        });
        return;
      }

      if (processedTickets.has(ticket.name)) {
        this.state.isRunning = false;
        this.touch("error", `Rodada interrompida: ticket ${ticket.name} reapareceu na fila`);
        this.logger.error("Falha de fechamento detectada no ticket da rodada", {
          ticket: ticket.name,
          reason: "ticket reaberto/nao movido apos close-and-version",
        });
        return;
      }

      const succeeded = await this.processTicket(ticket);
      processedTickets.add(ticket.name);
      if (!succeeded) {
        this.state.isRunning = false;
        this.logger.warn("Rodada /run-all interrompida por falha de ticket", {
          ticket: ticket.name,
          processedTicketsCount: processedTickets.size,
          durationMs: Date.now() - roundStartedAt,
          activeProjectName: this.state.activeProject?.name,
          activeProjectPath: this.state.activeProject?.path,
        });
        return;
      }
    }
  }

  shutdown(): void {
    this.state.isRunning = false;
    if (this.activePlanSpecSession) {
      void this.finalizePlanSpecSession(this.activePlanSpecSession.id, {
        mode: "cancel",
        phase: "idle",
        message: "Desligamento solicitado",
      });
      return;
    }
    this.touch("idle", "Desligamento solicitado");
  }

  private async processTicket(ticket: TicketRef): Promise<boolean> {
    const ticketStartedAt = Date.now();
    this.state.currentTicket = ticket.name;
    let finalSummary: TicketFinalSummary | null = null;
    const activeProject = this.state.activeProject ? { ...this.state.activeProject } : null;
    this.logger.info("Processando ticket da rodada atual", {
      ticket: ticket.name,
      openPath: ticket.openPath,
      closedPath: ticket.closedPath,
      activeProjectName: activeProject?.name,
      activeProjectPath: activeProject?.path,
    });

    try {
      if (!activeProject) {
        throw new CodexStageExecutionError(
          ticket.name,
          "plan",
          "Projeto ativo ausente no estado do runner para a rodada atual.",
        );
      }

      const planResult = await this.runStage("plan", ticket, `Executando etapa plan para ${ticket.name}`);
      const execPlanPath = this.resolveExecPlanPath(ticket, planResult.execPlanPath);
      await this.runStage("implement", ticket, `Executando etapa implement para ${ticket.name}`);
      await this.runStage(
        "close-and-version",
        ticket,
        `Executando etapa close-and-version para ${ticket.name}`,
      );
      const syncEvidence = await this.assertCloseAndVersion(ticket);

      this.touch("idle", `Ticket ${ticket.name} finalizado com sucesso`);
      this.logger.info("Ticket finalizado com sucesso na rodada atual", {
        ticket: ticket.name,
        durationMs: Date.now() - ticketStartedAt,
        commitHash: syncEvidence.commitHash,
        pushUpstream: syncEvidence.upstream,
      });
      finalSummary = this.buildSuccessSummary(ticket.name, execPlanPath, syncEvidence, activeProject);
      return true;
    } catch (error) {
      const stage =
        error instanceof CodexStageExecutionError && isTicketFlowStage(error.stage)
          ? error.stage
          : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.touch("error", `Falha ao processar ${ticket.name}`);
      this.logger.error("Erro no ciclo de ticket", {
        ticket: ticket.name,
        stage,
        error: errorMessage,
        durationMs: Date.now() - ticketStartedAt,
      });

      const fallbackProject = activeProject ?? {
        name: "projeto-ativo-indefinido",
        path: "(indefinido)",
      };
      finalSummary = this.buildFailureSummary(
        ticket.name,
        this.resolveFailureStage(stage),
        errorMessage,
        fallbackProject,
      );
      return false;
    } finally {
      if (finalSummary) {
        await this.publishTicketFinalSummary(finalSummary);
      }
      this.state.currentTicket = null;
    }
  }

  private resolveExecPlanPath(ticket: TicketRef, execPlanPath?: string): string {
    if (execPlanPath) {
      return execPlanPath;
    }

    throw new CodexStageExecutionError(
      ticket.name,
      "plan",
      "Etapa plan nao retornou caminho de ExecPlan para rastreabilidade obrigatoria.",
    );
  }

  private buildSuccessSummary(
    ticket: string,
    execPlanPath: string,
    syncEvidence: GitSyncEvidence,
    activeProject: ProjectRef,
  ): TicketFinalSummary {
    return {
      ticket,
      status: "success",
      finalStage: "close-and-version",
      timestampUtc: new Date().toISOString(),
      activeProjectName: activeProject.name,
      activeProjectPath: activeProject.path,
      execPlanPath,
      commitPushId: syncEvidence.commitPushId,
      commitHash: syncEvidence.commitHash,
      pushUpstream: syncEvidence.upstream,
    };
  }

  private buildFailureSummary(
    ticket: string,
    finalStage: TicketFinalStage,
    errorMessage: string,
    activeProject: ProjectRef,
  ): TicketFinalSummary {
    return {
      ticket,
      status: "failure",
      finalStage,
      timestampUtc: new Date().toISOString(),
      activeProjectName: activeProject.name,
      activeProjectPath: activeProject.path,
      errorMessage,
    };
  }

  private resolveFailureStage(stage?: TicketFlowStage): TicketFinalStage {
    if (stage) {
      return stage;
    }

    if (
      this.state.phase === "plan" ||
      this.state.phase === "implement" ||
      this.state.phase === "close-and-version"
    ) {
      return this.state.phase;
    }

    return "close-and-version";
  }

  private async publishTicketFinalSummary(summary: TicketFinalSummary): Promise<void> {
    if (!this.onTicketFinalized) {
      return;
    }

    try {
      const delivery = await this.onTicketFinalized(summary);
      if (!delivery) {
        return;
      }

      this.state.lastNotifiedEvent = {
        summary: { ...summary },
        delivery: { ...delivery },
      };
      this.state.updatedAt = new Date(delivery.deliveredAtUtc);
    } catch (error) {
      this.logger.error("Falha ao emitir resumo final de ticket", {
        ticket: summary.ticket,
        status: summary.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async assertCloseAndVersion(ticket: TicketRef): Promise<GitSyncEvidence> {
    try {
      return await this.gitVersioning.assertSyncedWithRemote();
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new CodexStageExecutionError(ticket.name, "close-and-version", details);
    }
  }

  private async runStage(
    stage: TicketFlowStage,
    ticket: TicketRef,
    message: string,
  ): Promise<CodexStageResult> {
    const stageStartedAt = Date.now();
    this.touch(stage, message);

    const result = await this.codexClient.runStage(stage, ticket);
    if (result.execPlanPath) {
      this.logger.info("ExecPlan reportado pela etapa plan", {
        ticket: ticket.name,
        execPlanPath: result.execPlanPath,
      });
    }
    this.logger.info("Etapa concluida no runner", {
      ticket: ticket.name,
      stage,
      durationMs: Date.now() - stageStartedAt,
    });

    return result;
  }

  private async runSpecStage(
    stage: SpecFlowStage,
    spec: SpecRef,
    message: string,
  ): Promise<CodexStageResult> {
    const stageStartedAt = Date.now();
    const phase: RunnerState["phase"] =
      stage === "spec-triage" || stage === "spec-close-and-version"
        ? stage
        : "plan-spec-waiting-codex";
    this.touch(phase, message);

    const result = await this.codexClient.runSpecStage(stage, spec);
    this.logger.info("Etapa de spec concluida no runner", {
      spec: spec.fileName,
      specPath: spec.path,
      stage,
      durationMs: Date.now() - stageStartedAt,
    });

    return result;
  }

  private applyRoundDependencies(roundDependencies: RunnerRoundDependencies): void {
    this.queue = roundDependencies.queue;
    this.codexClient = roundDependencies.codexClient;
    this.gitVersioning = roundDependencies.gitVersioning;
    this.state.activeProject = { ...roundDependencies.activeProject };
    this.state.updatedAt = this.now();

    this.logger.info("Projeto ativo aplicado para rodada /run-all", {
      activeProjectName: roundDependencies.activeProject.name,
      activeProjectPath: roundDependencies.activeProject.path,
    });
  }

  private buildActiveProjectResolutionErrorMessage(
    error: unknown,
    source: "run-all" | "run-specs" | "plan-spec",
  ): string {
    const details = error instanceof Error ? error.message : String(error);
    const command =
      source === "run-all" ? "/run-all" : source === "run-specs" ? "/run_specs" : "/plan_spec";
    return [
      `Falha ao resolver projeto ativo para rodada ${command}.`,
      "Verifique PROJECTS_ROOT_PATH, descoberta e estado persistido do projeto ativo.",
      `Detalhes: ${details}`,
    ].join(" ");
  }

  private touch(phase: RunnerState["phase"], message: string): void {
    this.state.phase = phase;
    this.state.lastMessage = message;
    this.state.updatedAt = this.now();
    this.logger.info(message, {
      phase,
      currentTicket: this.state.currentTicket,
      currentSpec: this.state.currentSpec,
      activeProjectName: this.state.activeProject?.name,
      activeProjectPath: this.state.activeProject?.path,
    });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
