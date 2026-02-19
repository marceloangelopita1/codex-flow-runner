import { AppEnv } from "../config/env.js";
import { RunnerState, createInitialState } from "../types/state.js";
import {
  TicketFinalStage,
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
import { Logger } from "./logger.js";
import {
  CodexAuthenticationError,
  CodexStageResult,
  CodexStageExecutionError,
  CodexTicketFlowClient,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { GitSyncEvidence, GitVersioning } from "../integrations/git-client.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";

type TicketFinalSummaryHandler = (
  summary: TicketFinalSummary,
) => Promise<TicketNotificationDelivery | null> | TicketNotificationDelivery | null;

export type RunAllRequestResult =
  | { status: "started" }
  | { status: "already-running" }
  | {
      status: "blocked";
      reason: "codex-auth-missing";
      message: string;
    };

export class TicketRunner {
  private readonly state: RunnerState = createInitialState();
  private loopPromise: Promise<void> | null = null;
  private isStarting = false;

  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
    private readonly queue: TicketQueue,
    private readonly codexClient: CodexTicketFlowClient,
    private readonly gitVersioning: GitVersioning,
    private readonly onTicketFinalized?: TicketFinalSummaryHandler,
  ) {}

  getState = (): RunnerState => ({
    ...this.state,
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
    this.touch("paused", "Pausa solicitada via Telegram");
  };

  requestResume = (): void => {
    this.state.isPaused = false;
    this.touch("idle", "Runner retomado via Telegram");
  };

  requestRunAll = async (): Promise<RunAllRequestResult> => {
    if (this.state.isRunning || this.loopPromise || this.isStarting) {
      this.logger.warn("Comando /run-all ignorado: runner ja esta em execucao", {
        phase: this.state.phase,
        currentTicket: this.state.currentTicket,
      });
      return { status: "already-running" };
    }

    this.isStarting = true;

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
        error: error instanceof Error ? error.message : String(error),
      });
      this.isStarting = false;
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message,
      };
    }

    this.state.isRunning = true;
    this.loopPromise = this.runForever()
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
      });
    this.isStarting = false;

    return { status: "started" };
  };

  private async runForever(): Promise<void> {
    await this.queue.ensureStructure();
    if (!this.state.isRunning) {
      return;
    }
    this.touch("idle", "Rodada /run-all iniciada");
    const processedTickets = new Set<string>();

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
        return;
      }
    }
  }

  shutdown(): void {
    this.state.isRunning = false;
    this.touch("idle", "Desligamento solicitado");
  }

  private async processTicket(ticket: TicketRef): Promise<boolean> {
    this.state.currentTicket = ticket.name;
    let finalSummary: TicketFinalSummary | null = null;

    try {
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
      finalSummary = this.buildSuccessSummary(ticket.name, execPlanPath, syncEvidence);
      return true;
    } catch (error) {
      const stage = error instanceof CodexStageExecutionError ? error.stage : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.touch("error", `Falha ao processar ${ticket.name}`);
      this.logger.error("Erro no ciclo de ticket", {
        ticket: ticket.name,
        stage,
        error: errorMessage,
      });
      finalSummary = this.buildFailureSummary(
        ticket.name,
        this.resolveFailureStage(stage),
        errorMessage,
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
  ): TicketFinalSummary {
    return {
      ticket,
      status: "success",
      finalStage: "close-and-version",
      timestampUtc: new Date().toISOString(),
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
  ): TicketFinalSummary {
    return {
      ticket,
      status: "failure",
      finalStage,
      timestampUtc: new Date().toISOString(),
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
    this.touch(stage, message);

    const result = await this.codexClient.runStage(stage, ticket);
    if (result.execPlanPath) {
      this.logger.info("ExecPlan reportado pela etapa plan", {
        ticket: ticket.name,
        execPlanPath: result.execPlanPath,
      });
    }

    return result;
  }

  private touch(phase: RunnerState["phase"], message: string): void {
    this.state.phase = phase;
    this.state.lastMessage = message;
    this.state.updatedAt = new Date();
    this.logger.info(message, { phase, currentTicket: this.state.currentTicket });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
