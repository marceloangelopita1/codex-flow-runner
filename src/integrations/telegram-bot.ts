import { Telegraf } from "telegraf";
import { Logger } from "../core/logger.js";
import { RunnerState } from "../types/state.js";

interface BotControls {
  pause: () => void;
  resume: () => void;
}

interface AccessAttemptContext {
  chatId: string;
  eventType: "command";
  command?: string;
}

export class TelegramController {
  private readonly bot: Telegraf;

  constructor(
    token: string,
    private readonly logger: Logger,
    private readonly getState: () => RunnerState,
    private readonly controls: BotControls,
    private readonly allowedChatId?: string,
  ) {
    this.bot = new Telegraf(token);
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

  private registerHandlers(): void {
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
      await ctx.reply(
        [
          `Runner: ${state.isRunning ? "ativo" : "inativo"}`,
          `Pausado: ${state.isPaused ? "sim" : "não"}`,
          `Fase: ${state.phase}`,
          `Ticket atual: ${state.currentTicket ?? "nenhum"}`,
          `Última mensagem: ${state.lastMessage}`,
          `Atualizado em: ${state.updatedAt.toISOString()}`,
        ].join("\n"),
      );
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
}
