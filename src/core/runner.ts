import { AppEnv } from "../config/env.js";
import { RunnerState, createInitialState } from "../types/state.js";
import { Logger } from "./logger.js";
import { CodexTicketFlowClient } from "../integrations/codex-client.js";
import { TicketQueue } from "../integrations/ticket-queue.js";

export class TicketRunner {
  private readonly state: RunnerState = createInitialState();

  constructor(
    private readonly env: AppEnv,
    private readonly logger: Logger,
    private readonly queue: TicketQueue,
    private readonly codexClient: CodexTicketFlowClient,
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

  async runForever(): Promise<void> {
    this.state.isRunning = true;
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

      this.state.currentTicket = ticket;

      try {
        this.touch("plan", `Executando ciclo Codex para ${ticket}`);
        await this.codexClient.runTicketFlow(ticket);
        this.touch("close-and-version", `Ciclo finalizado para ${ticket}`);
      } catch (error) {
        this.touch("error", `Falha ao processar ${ticket}`);
        this.logger.error("Erro no ciclo de ticket", {
          ticket,
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
