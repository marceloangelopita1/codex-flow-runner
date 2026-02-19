import { AppEnv } from "../config/env.js";
import { RunnerState, createInitialState } from "../types/state.js";
import { TicketFinalStage, TicketFinalSummary } from "../types/ticket-final-summary.js";
import { Logger } from "./logger.js";
import {
  CodexStageExecutionError,
  CodexTicketFlowClient,
  TicketFlowStage,
} from "../integrations/codex-client.js";
import { GitVersioning } from "../integrations/git-client.js";
import { TicketQueue, TicketRef } from "../integrations/ticket-queue.js";

type TicketFinalSummaryHandler = (summary: TicketFinalSummary) => Promise<void> | void;

export class TicketRunner {
  private readonly state: RunnerState = createInitialState();
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
    private readonly queue: TicketQueue,
    private readonly codexClient: CodexTicketFlowClient,
    private readonly gitVersioning: GitVersioning,
    private readonly onTicketFinalized?: TicketFinalSummaryHandler,
  ) {}

  getState = (): RunnerState => ({ ...this.state });

  requestPause = (): void => {
    this.state.isPaused = true;
    this.touch("paused", "Pausa solicitada via Telegram");
  };

  requestResume = (): void => {
    this.state.isPaused = false;
    this.touch("idle", "Runner retomado via Telegram");
  };

  requestRunAll = (): boolean => {
    if (this.state.isRunning || this.loopPromise) {
      this.logger.warn("Comando /run-all ignorado: runner ja esta em execucao", {
        phase: this.state.phase,
        currentTicket: this.state.currentTicket,
      });
      return false;
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
      });

    return true;
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
      await this.runStage("plan", ticket, `Executando etapa plan para ${ticket.name}`);
      await this.runStage("implement", ticket, `Executando etapa implement para ${ticket.name}`);
      await this.runStage(
        "close-and-version",
        ticket,
        `Executando etapa close-and-version para ${ticket.name}`,
      );
      await this.assertCloseAndVersion(ticket);

      this.touch("idle", `Ticket ${ticket.name} finalizado com sucesso`);
      finalSummary = this.buildTicketFinalSummary(ticket.name, "success", "close-and-version");
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
      finalSummary = this.buildTicketFinalSummary(
        ticket.name,
        "failure",
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

  private buildTicketFinalSummary(
    ticket: string,
    status: TicketFinalSummary["status"],
    finalStage: TicketFinalStage,
    errorMessage?: string,
  ): TicketFinalSummary {
    return {
      ticket,
      status,
      finalStage,
      timestampUtc: new Date().toISOString(),
      ...(errorMessage ? { errorMessage } : {}),
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
      await this.onTicketFinalized(summary);
    } catch (error) {
      this.logger.error("Falha ao emitir resumo final de ticket", {
        ticket: summary.ticket,
        status: summary.status,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async assertCloseAndVersion(ticket: TicketRef): Promise<void> {
    try {
      await this.gitVersioning.assertSyncedWithRemote();
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new CodexStageExecutionError(ticket.name, "close-and-version", details);
    }
  }

  private async runStage(
    stage: TicketFlowStage,
    ticket: TicketRef,
    message: string,
  ): Promise<void> {
    this.touch(stage, message);

    const result = await this.codexClient.runStage(stage, ticket);
    if (result.execPlanPath) {
      this.logger.info("ExecPlan reportado pela etapa plan", {
        ticket: ticket.name,
        execPlanPath: result.execPlanPath,
      });
    }
  }

  private touch(phase: RunnerState["phase"], message: string): void {
    this.state.phase = phase;
    this.state.lastMessage = message;
    this.state.updatedAt = new Date();
    this.logger.info(message, { phase, currentTicket: this.state.currentTicket });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
