import { Telegraf } from "telegraf";
import {
  ProjectSelectionResult,
  ProjectSelectionSnapshot,
} from "../core/project-selection.js";
import { Logger } from "../core/logger.js";
import type { RunAllRequestResult, RunSpecsRequestResult } from "../core/runner.js";
import { ProjectRef } from "../types/project.js";
import { RunnerState } from "../types/state.js";
import {
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";

interface BotControls {
  runAll: () => Promise<RunAllRequestResult> | RunAllRequestResult;
  runSpecs: (specFileName: string) => Promise<RunSpecsRequestResult> | RunSpecsRequestResult;
  pause: () => void;
  resume: () => void;
  listProjects: () => Promise<ProjectSelectionSnapshot> | ProjectSelectionSnapshot;
  selectProjectByName: (
    projectName: string,
  ) => Promise<ProjectSelectionControlResult> | ProjectSelectionControlResult;
}

type ProjectSelectionControlResult =
  | ProjectSelectionResult
  | {
      status: "blocked-running";
    };

type AccessAttemptContext =
  | {
      chatId: string;
      eventType: "command";
      command: string;
    }
  | {
      chatId: string;
      eventType: "callback-query";
      callbackData: string;
    };

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

interface ReplyOptions {
  reply_markup?: {
    inline_keyboard: InlineKeyboardButton[][];
  };
}

interface CommandContext {
  chat: {
    id: number | string;
  };
  message?: {
    text?: string;
    entities?: Array<{
      type: string;
      offset: number;
      length: number;
    }>;
  };
  reply: (text: string, extra?: ReplyOptions) => Promise<unknown>;
}

interface CallbackContext {
  chat?: {
    id: number | string;
  };
  callbackQuery: {
    data?: string;
  };
  answerCbQuery: (text?: string) => Promise<unknown>;
  editMessageText: (text: string, extra?: ReplyOptions) => Promise<unknown>;
}

interface IncomingUpdateContext {
  updateType?: string;
  chat?: {
    id: number | string;
  };
  message?: {
    text?: string;
    entities?: Array<{
      type: string;
      offset: number;
      length: number;
    }>;
  };
  callbackQuery?: {
    data?: string;
  };
}

type ParsedProjectsCallbackData =
  | {
      status: "page";
      page: number;
    }
  | {
      status: "select";
      projectIndex: number;
    }
  | {
      status: "invalid";
    };

const RUN_ALL_STARTED_REPLY = "▶️ Runner iniciado via /run_all.";
const RUN_ALL_ALREADY_RUNNING_REPLY = "ℹ️ Runner já está em execução.";
const RUN_ALL_AUTH_REQUIRED_REPLY_PREFIX = "❌ ";
const RUN_SPECS_USAGE_REPLY = "ℹ️ Uso: /run_specs <arquivo-da-spec.md>.";
const RUN_SPECS_AUTH_REQUIRED_REPLY_PREFIX = "❌ ";
const UNKNOWN_COMMAND_REPLY = "ℹ️ Comando não reconhecido. Use /start para ver os comandos válidos.";
const PROJECTS_PAGE_SIZE = 5;
const PROJECTS_CALLBACK_PREFIX = "projects:";
const PROJECTS_CALLBACK_PAGE_PREFIX = "projects:page:";
const PROJECTS_CALLBACK_SELECT_PREFIX = "projects:select:";
const SELECT_PROJECT_USAGE_REPLY =
  "ℹ️ Uso: /select_project <nome-do-projeto>. Alias legado: /select-project. Use /projects para listar os projetos elegíveis.";
const SELECT_PROJECT_BLOCKED_RUNNING_REPLY =
  "❌ Não é possível trocar o projeto ativo enquanto o runner está em execução.";
const LIST_PROJECTS_FAILED_REPLY =
  "❌ Falha ao listar projetos elegíveis. Verifique logs do runner e tente novamente.";
const SELECT_PROJECT_FAILED_REPLY =
  "❌ Falha ao trocar projeto ativo. Verifique logs do runner e tente novamente.";
const PROJECTS_CALLBACK_INVALID_REPLY = "Ação de projeto inválida.";
const PROJECTS_CALLBACK_STALE_REPLY =
  "A lista de projetos mudou. Atualize com /projects e tente novamente.";
const PROJECTS_CALLBACK_UNAUTHORIZED_REPLY = "Acesso não autorizado.";
const RUN_ALL_LEGACY_PATTERN = /^\/run-all(?:@[^\s]+)?(?:\s+.*)?$/u;
const SELECT_PROJECT_LEGACY_PATTERN = /^\/select-project(?:@[^\s]+)?(?:\s+.*)?$/u;
const UNKNOWN_COMMAND_PATTERN = /^\/\S+/u;
const BOT_COMMAND_ENTITY_TYPE = "bot_command";
const MAX_TEXT_PREVIEW_LENGTH = 160;

const START_REPLY_LINES = [
  "🤖 Codex Flow Runner",
  "Automação sequencial de tickets via Codex CLI com controle por Telegram.",
  "",
  "Comandos aceitos:",
  "/start - mostra esta ajuda",
  "/run_all - inicia uma rodada sequencial de tickets abertos (alias legado: /run-all)",
  "/run_specs <arquivo> - executa triagem da spec e, em sucesso, encadeia rodada de tickets",
  "/status - mostra o estado atual do runner",
  "/pause - pausa após a etapa corrente",
  "/resume - retoma execução",
  "/projects - lista projetos elegíveis com paginação",
  "/select_project <nome> - seleciona projeto ativo por nome (alias legado: /select-project)",
];

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
    this.bot.use(async (ctx, next) => {
      this.logIncomingUpdate(ctx as unknown as IncomingUpdateContext);
      await next();
    });

    this.bot.command("start", async (ctx) => {
      if (
        !this.isAllowed({
          chatId: ctx.chat.id.toString(),
          eventType: "command",
          command: "start",
        })
      ) {
        await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
        return;
      }
      await ctx.reply(this.buildStartReply());
    });

    this.bot.command("run_all", async (ctx) => {
      await this.handleRunAllCommand(ctx as unknown as CommandContext, "run_all");
    });

    this.bot.hears(RUN_ALL_LEGACY_PATTERN, async (ctx) => {
      await this.handleRunAllCommand(ctx as unknown as CommandContext, "run-all");
    });

    this.bot.command("run_specs", async (ctx) => {
      await this.handleRunSpecsCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("status", async (ctx) => {
      if (
        !this.isAllowed({
          chatId: ctx.chat.id.toString(),
          eventType: "command",
          command: "status",
        })
      ) {
        await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
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
        await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
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
        await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
        return;
      }
      this.controls.resume();
      await ctx.reply("▶️ Runner retomado.");
    });

    this.bot.command("projects", async (ctx) => {
      await this.handleProjectsCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("select_project", async (ctx) => {
      await this.handleSelectProjectCommand(ctx as unknown as CommandContext, "select_project");
    });

    this.bot.hears(SELECT_PROJECT_LEGACY_PATTERN, async (ctx) => {
      await this.handleSelectProjectCommand(ctx as unknown as CommandContext, "select-project");
    });

    this.bot.hears(UNKNOWN_COMMAND_PATTERN, async (ctx) => {
      const chatId = ctx.chat.id.toString();
      if (
        !this.isAllowed({
          chatId,
          eventType: "command",
          command: "unknown",
        })
      ) {
        await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
        return;
      }

      const commandText = (ctx.message?.text ?? "").trim();
      this.logger.warn("Comando nao reconhecido via Telegram", {
        chatId,
        commandText: this.limit(commandText),
      });

      await ctx.reply(UNKNOWN_COMMAND_REPLY);
    });

    this.bot.on("callback_query", async (ctx) => {
      await this.handleProjectsCallbackQuery(ctx as unknown as CallbackContext);
    });
  }

  private async handleRunAllCommand(
    ctx: CommandContext,
    command: "run_all" | "run-all",
  ): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /run-all recebido via Telegram", {
      chatId,
      command,
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command,
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const outcome = await this.buildRunAllReply({
      chatId,
      command,
    });
    if (outcome.started) {
      this.captureNotificationChat(chatId);
    }

    await ctx.reply(outcome.reply);
  }

  private async handleRunSpecsCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /run_specs recebido via Telegram", {
      chatId,
      commandText: this.limit((ctx.message?.text ?? "").trim()),
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "run_specs",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const specFileName = this.parseRunSpecsCommandFileName(ctx.message?.text);
    if (!specFileName) {
      await ctx.reply(RUN_SPECS_USAGE_REPLY);
      return;
    }

    const outcome = await this.buildRunSpecsReply({
      chatId,
      specFileName,
    });
    if (outcome.started) {
      this.captureNotificationChat(chatId);
    }

    await ctx.reply(outcome.reply);
  }

  private async handleProjectsCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /projects recebido via Telegram", { chatId });
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "projects",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    try {
      const snapshot = await this.controls.listProjects();
      const rendered = this.buildProjectsReply(snapshot, 0);
      await ctx.reply(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao listar projetos via comando /projects", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(LIST_PROJECTS_FAILED_REPLY);
    }
  }

  private async handleSelectProjectCommand(
    ctx: CommandContext,
    command: "select_project" | "select-project",
  ): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando de selecao de projeto recebido via Telegram", {
      chatId,
      command,
      commandText: this.limit((ctx.message?.text ?? "").trim()),
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command,
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const projectName = this.parseSelectProjectCommandName(ctx.message?.text);
    if (!projectName) {
      await ctx.reply(SELECT_PROJECT_USAGE_REPLY);
      return;
    }

    if (this.getState().isRunning) {
      await ctx.reply(SELECT_PROJECT_BLOCKED_RUNNING_REPLY);
      return;
    }

    try {
      const result = await this.controls.selectProjectByName(projectName);
      await ctx.reply(this.buildSelectProjectReply(result));
    } catch (error) {
      this.logger.error("Falha ao selecionar projeto por comando textual", {
        chatId,
        projectName,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(SELECT_PROJECT_FAILED_REPLY);
    }
  }

  private async handleProjectsCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(PROJECTS_CALLBACK_PREFIX)) {
      return;
    }

    const chatId = this.resolveContextChatId(ctx.chat);
    this.logger.info("Callback de projetos recebido via Telegram", {
      chatId,
      callbackData,
    });
    if (
      !this.isAllowed({
        chatId,
        eventType: "callback-query",
        callbackData,
      })
    ) {
      await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const parsed = this.parseProjectsCallbackData(callbackData);
    if (parsed.status === "invalid") {
      await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_INVALID_REPLY);
      return;
    }

    if (parsed.status === "page") {
      await this.renderProjectsCallbackPage(ctx, parsed.page);
      await this.safeAnswerCallbackQuery(ctx);
      return;
    }

    if (this.getState().isRunning) {
      await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_BLOCKED_RUNNING_REPLY);
      return;
    }

    await this.handleSelectProjectFromCallback(ctx, parsed.projectIndex);
  }

  private async renderProjectsCallbackPage(ctx: CallbackContext, page: number): Promise<void> {
    try {
      const snapshot = await this.controls.listProjects();
      const rendered = this.buildProjectsReply(snapshot, page);
      await ctx.editMessageText(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao paginar listagem de projetos via callback", {
        requestedPage: page,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, LIST_PROJECTS_FAILED_REPLY);
    }
  }

  private async handleSelectProjectFromCallback(
    ctx: CallbackContext,
    projectIndex: number,
  ): Promise<void> {
    try {
      const snapshot = await this.controls.listProjects();
      const targetProject = snapshot.projects[projectIndex];
      if (!targetProject) {
        await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_STALE_REPLY);
        const fallbackPage = this.buildProjectsReply(snapshot, 0);
        await ctx.editMessageText(fallbackPage.text, fallbackPage.extra);
        return;
      }

      const selectionResult = await this.controls.selectProjectByName(targetProject.name);
      if (selectionResult.status === "blocked-running") {
        await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_BLOCKED_RUNNING_REPLY);
        return;
      }

      const refreshedSnapshot = await this.controls.listProjects();
      const activeProjectPage = this.resolveActiveProjectPage(refreshedSnapshot);
      const rendered = this.buildProjectsReply(refreshedSnapshot, activeProjectPage);
      await ctx.editMessageText(rendered.text, rendered.extra);
      await this.safeAnswerCallbackQuery(ctx, this.buildSelectProjectCallbackReply(selectionResult));
    } catch (error) {
      this.logger.error("Falha ao selecionar projeto via callback", {
        projectIndex,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_FAILED_REPLY);
    }
  }

  private parseSelectProjectCommandName(commandText?: string): string | null {
    if (!commandText) {
      return null;
    }

    const match = commandText.match(/^\/(?:select-project|select_project)(?:@[^\s]+)?(?:\s+(.+))?$/u);
    const value = match?.[1]?.trim();
    if (!value) {
      return null;
    }

    return value;
  }

  private parseRunSpecsCommandFileName(commandText?: string): string | null {
    if (!commandText) {
      return null;
    }

    const match = commandText.match(/^\/run_specs(?:@[^\s]+)?(?:\s+(.+))?$/u);
    const value = match?.[1]?.trim();
    if (!value) {
      return null;
    }

    return value;
  }

  private buildSelectProjectReply(result: ProjectSelectionControlResult): string {
    if (result.status === "blocked-running") {
      return SELECT_PROJECT_BLOCKED_RUNNING_REPLY;
    }

    if (result.status === "selected") {
      if (!result.changed) {
        return `ℹ️ Projeto ${result.activeProject.name} já está ativo.`;
      }

      return `✅ Projeto ativo alterado para ${result.activeProject.name}.`;
    }

    const availableProjects = result.availableProjects.map((project) => project.name).join(", ");
    const availableSuffix = availableProjects
      ? ` Projetos disponíveis: ${availableProjects}.`
      : "";

    return [
      `❌ Projeto ${result.projectName} não encontrado.`,
      `Projeto ativo atual: ${result.activeProject.name}.`,
      `Use /projects para listar projetos elegíveis.${availableSuffix}`,
    ].join(" ");
  }

  private buildSelectProjectCallbackReply(result: ProjectSelectionResult): string {
    if (result.status === "selected") {
      if (!result.changed) {
        return `Projeto ${result.activeProject.name} já estava ativo.`;
      }

      return `Projeto ativo alterado para ${result.activeProject.name}.`;
    }

    return PROJECTS_CALLBACK_STALE_REPLY;
  }

  private parseProjectsCallbackData(callbackData: string): ParsedProjectsCallbackData {
    if (callbackData.startsWith(PROJECTS_CALLBACK_PAGE_PREFIX)) {
      const rawPage = callbackData.slice(PROJECTS_CALLBACK_PAGE_PREFIX.length);
      const page = Number.parseInt(rawPage, 10);
      if (!Number.isFinite(page) || page < 0) {
        return { status: "invalid" };
      }

      return { status: "page", page };
    }

    if (callbackData.startsWith(PROJECTS_CALLBACK_SELECT_PREFIX)) {
      const rawIndex = callbackData.slice(PROJECTS_CALLBACK_SELECT_PREFIX.length);
      const projectIndex = Number.parseInt(rawIndex, 10);
      if (!Number.isFinite(projectIndex) || projectIndex < 0) {
        return { status: "invalid" };
      }

      return { status: "select", projectIndex };
    }

    return { status: "invalid" };
  }

  private buildProjectsReply(
    snapshot: ProjectSelectionSnapshot,
    requestedPage: number,
  ): { text: string; extra: ReplyOptions } {
    const totalProjects = snapshot.projects.length;
    const totalPages = Math.max(1, Math.ceil(totalProjects / PROJECTS_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * PROJECTS_PAGE_SIZE;
    const pageProjects = snapshot.projects.slice(start, start + PROJECTS_PAGE_SIZE);

    const lines = [
      "📁 Projetos elegíveis",
      `Página ${page + 1}/${totalPages}`,
      `Projeto ativo: ${snapshot.activeProject.name}`,
      "",
    ];

    for (const [index, project] of pageProjects.entries()) {
      const absoluteIndex = start + index;
      const marker = this.isSameProject(project, snapshot.activeProject) ? "✅" : "▫️";
      lines.push(`${absoluteIndex + 1}. ${marker} ${project.name}`);
    }

    lines.push("", "Toque em um projeto para selecionar.");

    const inlineKeyboard: InlineKeyboardButton[][] = pageProjects.map((project, index) => {
      const absoluteIndex = start + index;
      const marker = this.isSameProject(project, snapshot.activeProject) ? "✅" : "▫️";
      return [
        {
          text: `${marker} ${project.name}`,
          callback_data: `${PROJECTS_CALLBACK_SELECT_PREFIX}${absoluteIndex}`,
        },
      ];
    });

    const pageButtons: InlineKeyboardButton[] = [];
    if (page > 0) {
      pageButtons.push({
        text: "⬅️ Anterior",
        callback_data: `${PROJECTS_CALLBACK_PAGE_PREFIX}${page - 1}`,
      });
    }

    if (page < totalPages - 1) {
      pageButtons.push({
        text: "Próxima ➡️",
        callback_data: `${PROJECTS_CALLBACK_PAGE_PREFIX}${page + 1}`,
      });
    }

    if (pageButtons.length > 0) {
      inlineKeyboard.push(pageButtons);
    }

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      },
    };
  }

  private resolveActiveProjectPage(snapshot: ProjectSelectionSnapshot): number {
    const activeProjectIndex = snapshot.projects.findIndex((project) =>
      this.isSameProject(project, snapshot.activeProject),
    );

    if (activeProjectIndex < 0) {
      return 0;
    }

    return Math.floor(activeProjectIndex / PROJECTS_PAGE_SIZE);
  }

  private isSameProject(left: ProjectRef, right: ProjectRef): boolean {
    return left.name === right.name && left.path === right.path;
  }

  private resolveContextChatId(chat?: { id: number | string }): string {
    if (!chat) {
      return "unknown";
    }

    return chat.id.toString();
  }

  private async safeAnswerCallbackQuery(ctx: CallbackContext, message?: string): Promise<void> {
    try {
      await ctx.answerCbQuery(message);
    } catch (error) {
      this.logger.warn("Falha ao responder callback query", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async buildRunAllReply(context?: {
    chatId: string;
    command: "run_all" | "run-all";
  }): Promise<{ reply: string; started: boolean }> {
    const result = await this.controls.runAll();
    const logContext = {
      commandStatus: result.status,
      ...(context ? { chatId: context.chatId, command: context.command } : {}),
      ...(result.status === "blocked" ? { reason: result.reason } : {}),
    };

    if (result.status === "started") {
      this.logger.info("Comando /run-all aceito e rodada iniciada", logContext);
      return { reply: RUN_ALL_STARTED_REPLY, started: true };
    }

    if (result.status === "already-running") {
      this.logger.warn("Comando /run-all ignorado: rodada ja em execucao", logContext);
      return { reply: RUN_ALL_ALREADY_RUNNING_REPLY, started: false };
    }

    this.logger.warn("Comando /run-all bloqueado", {
      ...logContext,
      message: result.message,
    });
    return {
      reply: `${RUN_ALL_AUTH_REQUIRED_REPLY_PREFIX}${result.message}`,
      started: false,
    };
  }

  private async buildRunSpecsReply(context: {
    chatId: string;
    specFileName: string;
  }): Promise<{ reply: string; started: boolean }> {
    const result = await this.controls.runSpecs(context.specFileName);
    const logContext = {
      commandStatus: result.status,
      chatId: context.chatId,
      specFileName: context.specFileName,
      ...(result.status === "blocked" ? { reason: result.reason } : {}),
    };

    if (result.status === "started") {
      this.logger.info("Comando /run_specs aceito e fluxo iniciado", logContext);
      return {
        reply: `▶️ Runner iniciado via /run_specs para ${context.specFileName}.`,
        started: true,
      };
    }

    if (result.status === "already-running") {
      this.logger.warn("Comando /run_specs ignorado: rodada ja em execucao", logContext);
      return { reply: RUN_ALL_ALREADY_RUNNING_REPLY, started: false };
    }

    this.logger.warn("Comando /run_specs bloqueado", {
      ...logContext,
      message: result.message,
    });
    return {
      reply: `${RUN_SPECS_AUTH_REQUIRED_REPLY_PREFIX}${result.message}`,
      started: false,
    };
  }

  private buildStartReply(): string {
    return START_REPLY_LINES.join("\n");
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

  private logIncomingUpdate(ctx: IncomingUpdateContext): void {
    const chatId = this.resolveContextChatId(ctx.chat);
    const messageText = ctx.message?.text;
    const commandEntity = ctx.message?.entities?.find(
      (entity) => entity.type === BOT_COMMAND_ENTITY_TYPE && entity.offset === 0,
    );
    const command = commandEntity && messageText
      ? messageText.slice(0, commandEntity.length)
      : undefined;

    this.logger.info("Update recebido do Telegram", {
      updateType: ctx.updateType ?? "unknown",
      chatId,
      ...(command ? { command } : {}),
      ...(messageText ? { messageText: this.limit(messageText.trim()) } : {}),
      ...(ctx.callbackQuery?.data ? { callbackData: ctx.callbackQuery.data } : {}),
    });
  }

  private limit(value: string): string {
    if (value.length <= MAX_TEXT_PREVIEW_LENGTH) {
      return value;
    }

    return `${value.slice(0, MAX_TEXT_PREVIEW_LENGTH)}...`;
  }

  private buildTicketFinalSummaryMessage(summary: TicketFinalSummary): string {
    const status = summary.status === "success" ? "sucesso" : "falha";
    const lines = [
      "📣 Resumo final por ticket",
      `Ticket: ${summary.ticket}`,
      `Projeto ativo: ${summary.activeProjectName}`,
      `Caminho do projeto: ${summary.activeProjectPath}`,
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
      `Spec atual: ${state.currentSpec ?? "nenhuma"}`,
      `Projeto ativo: ${state.activeProject?.name ?? "nenhum"}`,
      `Caminho do projeto ativo: ${state.activeProject?.path ?? "(indefinido)"}`,
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
      `Projeto notificado: ${summary.activeProjectName}`,
      `Caminho notificado: ${summary.activeProjectPath}`,
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
