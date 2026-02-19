import { Telegraf } from "telegraf";
import { Logger } from "../core/logger.js";
import { RunnerState } from "../types/state.js";
import {
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";

interface BotControls {
  runAll: () => boolean;
  pause: () => void;
  resume: () => void;
}

type ControlCommand = "run-all" | "status" | "pause" | "resume";

interface AccessAttemptContext {
  chatId: string;
  eventType: "command";
  command: ControlCommand;
}

const RUN_ALL_STARTED_REPLY = "▶️ Runner iniciado via /run-all.";
const RUN_ALL_ALREADY_RUNNING_REPLY = "ℹ️ Runner já está em execução.";

export class TelegramController {
  private readonly bot: Telegraf;
  private notificationChatId: string | null;

  constructor(
    token: string,
    private readonly logger: Logger,
    private readonly getState: () => RunnerState,
    private readonly controls: BotControls,
    private readonly allowedChatId?: string,
  ) {
    this.bot = new Telegraf(token);
    this.notificationChatId = allowedChatId ?? null;
    this.registerHandlers();
  }

  async start(): Promise<void> {
    await this.bot.launch();
    this.logger.info("Telegram bot iniciado em long polling");
  }

  async stop(signal = "SIGTERM"): Promise<void> {
    await this.bot.stop(signal as "SIGINT" | "SIGTERM");
    this.logger.info("Telegram bot finalizado", { signal });
  }

  async sendTicketFinalSummary(summary: TicketFinalSummary): Promise<TicketNotificationDelivery | null> {
    if (!this.notificationChatId) {
      this.logger.warn("Resumo final de ticket nao enviado: chat de notificacao indefinido", {
        ticket: summary.ticket,
        status: summary.status,
      });
      return null;
    }

    const destinationChatId = this.notificationChatId;
    await this.bot.telegram.sendMessage(
      destinationChatId,
      this.buildTicketFinalSummaryMessage(summary),
    );

    const delivery: TicketNotificationDelivery = {
      channel: "telegram",
      destinationChatId,
      deliveredAtUtc: new Date().toISOString(),
    };

    this.logger.info("Resumo final de ticket enviado no Telegram", {
      ticket: summary.ticket,
      status: summary.status,
      chatId: destinationChatId,
    });

    return delivery;
  }

  private registerHandlers(): void {
    this.bot.command("run-all", async (ctx) => {
      const chatId = ctx.chat.id.toString();
      if (
        !this.isAllowed({
          chatId,
          eventType: "command",
          command: "run-all",
        })
      ) {
        return;
      }

      const reply = this.buildRunAllReply();
      if (reply === RUN_ALL_STARTED_REPLY) {
        this.captureNotificationChat(chatId);
      }

      await ctx.reply(reply);
    });

    this.bot.command("status", async (ctx) => {
      if (
        !this.isAllowed({
          chatId: ctx.chat.id.toString(),
          eventType: "command",
          command: "status",
        })
      ) {
        return;
      }
      const state = this.getState();
      await ctx.reply(this.buildStatusReply(state));
    });

    this.bot.command("pause", async (ctx) => {
      if (
        !this.isAllowed({
          chatId: ctx.chat.id.toString(),
          eventType: "command",
          command: "pause",
        })
      ) {
        return;
      }
      this.controls.pause();
      await ctx.reply("✅ Runner será pausado após a etapa corrente.");
    });

    this.bot.command("resume", async (ctx) => {
      if (
        !this.isAllowed({
          chatId: ctx.chat.id.toString(),
          eventType: "command",
          command: "resume",
        })
      ) {
        return;
      }
      this.controls.resume();
      await ctx.reply("▶️ Runner retomado.");
    });
  }

  private buildRunAllReply(): string {
    if (this.controls.runAll()) {
      return RUN_ALL_STARTED_REPLY;
    }

    return RUN_ALL_ALREADY_RUNNING_REPLY;
  }

  private isAllowed(context: AccessAttemptContext): boolean {
    if (!this.allowedChatId) {
      return true;
    }

    const allowed = this.allowedChatId === context.chatId;
    if (!allowed) {
      this.logger.warn("Tentativa de acesso não autorizado ao bot", { ...context });
    }
    return allowed;
  }

  private captureNotificationChat(chatId: string): void {
    if (this.allowedChatId) {
      this.notificationChatId = this.allowedChatId;
      return;
    }

    this.notificationChatId = chatId;
  }

  private buildTicketFinalSummaryMessage(summary: TicketFinalSummary): string {
    const status = summary.status === "success" ? "sucesso" : "falha";
    const lines = [
      "📣 Resumo final por ticket",
      `Ticket: ${summary.ticket}`,
      `Resultado: ${status}`,
      `Fase final: ${summary.finalStage}`,
      `Timestamp UTC: ${summary.timestampUtc}`,
    ];

    if (summary.status === "success") {
      lines.push(`ExecPlan: ${summary.execPlanPath}`);
      lines.push(`Commit/Push: ${summary.commitPushId}`);
      lines.push(`Commit: ${summary.commitHash}`);
      lines.push(`Upstream: ${summary.pushUpstream}`);
      return lines.join("\n");
    }

    if (summary.status === "failure") {
      lines.push(`Erro: ${summary.errorMessage}`);
    }

    return lines.join("\n");
  }

  private buildStatusReply(state: RunnerState): string {
    const lines = [
      `Runner: ${state.isRunning ? "ativo" : "inativo"}`,
      `Pausado: ${state.isPaused ? "sim" : "não"}`,
      `Fase: ${state.phase}`,
      `Ticket atual: ${state.currentTicket ?? "nenhum"}`,
      `Última mensagem: ${state.lastMessage}`,
      `Atualizado em: ${state.updatedAt.toISOString()}`,
    ];

    if (!state.lastNotifiedEvent) {
      lines.push("Último evento notificado: nenhum");
      return lines.join("\n");
    }

    const { summary, delivery } = state.lastNotifiedEvent;
    lines.push(
      `Último evento notificado: ${summary.ticket} (${summary.status})`,
      `Fase notificada: ${summary.finalStage}`,
      `Notificado em: ${delivery.deliveredAtUtc}`,
      `Chat de notificação: ${delivery.destinationChatId}`,
    );

    if (summary.status === "success") {
      lines.push(
        `ExecPlan notificado: ${summary.execPlanPath}`,
        `Commit/Push notificado: ${summary.commitPushId}`,
      );
    } else {
      lines.push(`Erro notificado: ${summary.errorMessage}`);
    }

    return lines.join("\n");
  }
}
