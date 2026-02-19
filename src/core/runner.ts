import { AppEnv } from "../config/env.js";
import { RunnerState, createInitialState } from "../types/state.js";
import { Logger } from "./logger.js";
import { CodexTicketFlowClient } from "../integrations/codex-client.js";
import { TicketQueue } from "../integrations/ticket-queue.js";
import { GitVersioning } from "../integrations/git-client.js";

export class TicketRunner {
  private readonly state: RunnerState = createInitialState();
  private loopPromise: Promise<void> | null = null;

  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
    private readonly queue: TicketQueue,
    private readonly codexClient: CodexTicketFlowClient,
    private readonly gitVersioning: GitVersioning,
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
    this.touch("idle", "Loop principal iniciado");

    while (this.state.isRunning) {
      if (this.state.isPaused) {
        await sleep(this.env.POLL_INTERVAL_MS);
        continue;
      }

      this.touch("select-ticket", "Buscando próximo ticket aberto");
      const ticket = await this.queue.nextOpenTicket();

      if (!ticket) {
        this.touch("idle", "Nenhum ticket aberto encontrado");
        await sleep(this.env.POLL_INTERVAL_MS);
        continue;
      }

      this.state.currentTicket = ticket.name;

      try {
        this.touch("plan", `Gerando ExecPlan para ${ticket.name}`);
        const execPlanPath = await this.codexClient.runTicketFlow(ticket);

        this.touch("implement", `Implementação validada para ${ticket.name}`);

        this.touch("close-and-version", `Fechando ticket ${ticket.name}`);
        await this.queue.closeTicket(ticket);
        await this.gitVersioning.commitTicketClosure(ticket.name, execPlanPath);

        this.touch("idle", `Ticket ${ticket.name} finalizado com sucesso`);
      } catch (error) {
        this.touch("error", `Falha ao processar ${ticket.name}`);
        this.logger.error("Erro no ciclo de ticket", {
          ticket: ticket.name,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        this.state.currentTicket = null;
      }
    }
  }

  shutdown(): void {
    this.state.isRunning = false;
    this.touch("idle", "Desligamento solicitado");
  }

  private touch(phase: RunnerState["phase"], message: string): void {
    this.state.phase = phase;
    this.state.lastMessage = message;
    this.state.updatedAt = new Date();
    this.logger.info(message, { phase, currentTicket: this.state.currentTicket });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
