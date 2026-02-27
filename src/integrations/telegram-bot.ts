import { Telegraf } from "telegraf";
import {
  ProjectSelectionResult,
  ProjectSelectionSnapshot,
} from "../core/project-selection.js";
import { Logger } from "../core/logger.js";
import type {
  CodexChatSessionCancelOptions,
  CodexChatSessionCancelResult,
  CodexChatSessionInputResult,
  CodexChatSessionStartResult,
  PlanSpecCallbackIgnoredReason,
  PlanSpecCallbackResult,
  PlanSpecSessionCancelResult,
  PlanSpecSessionInputResult,
  PlanSpecSessionStartResult,
  RunSpecsTriageLifecycleEvent,
  RunnerProjectControlResult,
  RunAllRequestResult,
  RunSelectedTicketRequestResult,
  RunSpecsRequestResult,
} from "../core/runner.js";
import { ProjectRef } from "../types/project.js";
import { RunnerSlotKind, RunnerState } from "../types/state.js";
import {
  TicketFinalSummary,
  TicketNotificationDispatchError,
  TicketNotificationDelivery,
  TicketNotificationErrorClass,
} from "../types/ticket-final-summary.js";
import {
  PlanSpecFinalActionId,
  PlanSpecFinalBlock,
  PlanSpecQuestionBlock,
  sanitizePlanSpecRawOutput,
} from "./plan-spec-parser.js";
import { EligibleSpecRef, SpecEligibilityResult } from "./spec-discovery.js";

interface BotControls {
  runAll: () => Promise<RunAllRequestResult> | RunAllRequestResult;
  runSpecs: (specFileName: string) => Promise<RunSpecsRequestResult> | RunSpecsRequestResult;
  runSelectedTicket: (
    ticketFileName: string,
  ) => Promise<RunSelectedTicketRequestResult> | RunSelectedTicketRequestResult;
  startCodexChatSession: (
    chatId: string,
  ) => Promise<CodexChatSessionStartResult> | CodexChatSessionStartResult;
  submitCodexChatInput: (
    chatId: string,
    input: string,
  ) => Promise<CodexChatSessionInputResult> | CodexChatSessionInputResult;
  cancelCodexChatSession: (
    chatId: string,
    options?: CodexChatSessionCancelOptions,
  ) => Promise<CodexChatSessionCancelResult> | CodexChatSessionCancelResult;
  startPlanSpecSession: (
    chatId: string,
  ) => Promise<PlanSpecSessionStartResult> | PlanSpecSessionStartResult;
  submitPlanSpecInput: (
    chatId: string,
    input: string,
  ) => Promise<PlanSpecSessionInputResult> | PlanSpecSessionInputResult;
  cancelPlanSpecSession: (
    chatId: string,
  ) => Promise<PlanSpecSessionCancelResult> | PlanSpecSessionCancelResult;
  listEligibleSpecs: () => Promise<EligibleSpecRef[]> | EligibleSpecRef[];
  listOpenTickets: () => Promise<OpenTicketRef[]> | OpenTicketRef[];
  readOpenTicket: (
    ticketFileName: string,
  ) => Promise<OpenTicketReadResult> | OpenTicketReadResult;
  validateRunSpecsTarget: (
    specInput: string,
  ) => Promise<SpecEligibilityResult> | SpecEligibilityResult;
  pause: () => Promise<RunnerProjectControlResult> | RunnerProjectControlResult;
  resume: () => Promise<RunnerProjectControlResult> | RunnerProjectControlResult;
  listProjects: () => Promise<ProjectSelectionSnapshot> | ProjectSelectionSnapshot;
  selectProjectByName: (
    projectName: string,
  ) => Promise<ProjectSelectionControlResult> | ProjectSelectionControlResult;
  onPlanSpecQuestionOptionSelected?: (
    chatId: string,
    optionValue: string,
  ) => Promise<PlanSpecCallbackResult> | PlanSpecCallbackResult;
  onPlanSpecFinalActionSelected?: (
    chatId: string,
    action: PlanSpecFinalActionId,
  ) => Promise<PlanSpecCallbackResult> | PlanSpecCallbackResult;
}

type ProjectSelectionControlResult =
  | ProjectSelectionResult
  | {
      status: "blocked-plan-spec";
    };

interface OpenTicketRef {
  fileName: string;
}

type OpenTicketReadResult =
  | {
      status: "found";
      ticket: OpenTicketRef;
      content: string;
    }
  | {
      status: "not-found";
      ticketFileName: string;
    }
  | {
      status: "invalid-name";
      ticketFileName: string;
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
    from?: {
      id: number | string;
    };
    message?: {
      message_id?: number;
    };
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
    from?: {
      id: number | string;
    };
    message?: {
      message_id?: number;
    };
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

type ParsedPlanSpecCallbackData =
  | {
      status: "question";
      optionValue: string;
    }
  | {
      status: "final";
      action: PlanSpecFinalActionId;
    }
  | {
      status: "invalid";
    };

type ParsedCodexChatCallbackData =
  | {
      status: "close";
      sessionId: number;
    }
  | {
      status: "invalid";
    };

type ParsedSpecsCallbackData =
  | {
      status: "page";
      contextId: string;
      page: number;
    }
  | {
      status: "select";
      contextId: string;
      specIndex: number;
    }
  | {
      status: "invalid";
    };

type ParsedTicketsOpenCallbackData =
  | {
      status: "page";
      contextId: string;
      page: number;
    }
  | {
      status: "select";
      contextId: string;
      ticketIndex: number;
    }
  | {
      status: "invalid";
    };

type ParsedTicketRunCallbackData =
  | {
      status: "execute";
      contextId: string;
    }
  | {
      status: "invalid";
    };

interface SpecsCallbackContextState {
  chatId: string;
  consumed: boolean;
}

interface TicketsOpenCallbackContextState {
  chatId: string;
  consumed: boolean;
}

interface TicketRunCallbackContextState {
  chatId: string;
  ticketFileName: string;
  messageId: number | null;
  consumed: boolean;
  processing: boolean;
}

interface PlanSpecQuestionOptionState {
  value: string;
  label: string;
}

interface PlanSpecFinalActionState {
  id: PlanSpecFinalActionId;
  label: string;
}

interface PlanSpecQuestionCallbackContextState {
  chatId: string;
  sessionId: number | null;
  messageId: number | null;
  consumed: boolean;
  processing: boolean;
  prompt: string;
  options: PlanSpecQuestionOptionState[];
}

interface PlanSpecFinalCallbackContextState {
  chatId: string;
  sessionId: number | null;
  messageId: number | null;
  consumed: boolean;
  processing: boolean;
  title: string;
  summary: string;
  actions: PlanSpecFinalActionState[];
}

interface TelegramApiErrorLike {
  response?: {
    error_code?: unknown;
    description?: unknown;
    parameters?: {
      retry_after?: unknown;
    };
  };
  on?: {
    method?: unknown;
  };
  code?: unknown;
  cause?: unknown;
}

interface TicketNotificationSendErrorClassification {
  retryable: boolean;
  errorClass: TicketNotificationErrorClass;
  errorCode?: string;
  retryAfterMs?: number;
  message: string;
}

type PlanSpecCallbackContextValidationResult<TContext> =
  | {
      status: "passed";
      context: TContext;
    }
  | {
      status: "blocked";
      validation: string;
      blockReason: CallbackBlockReason;
      reply: string;
    };

type CallbackAuditFlow = "specs" | "tickets-open" | "plan-spec" | "run-ticket";
type CallbackDecisionResult = "accepted" | "blocked" | "failed";
type CallbackValidationResult = "passed" | "blocked";
type CallbackBlockReason =
  | PlanSpecCallbackIgnoredReason
  | "access-denied"
  | "stale"
  | "ticket-nao-encontrado"
  | "ticket-invalido"
  | "runner-blocked";

interface CallbackAuditContext {
  flow: CallbackAuditFlow;
  chatId: string;
  callbackData: string;
  action: string;
  userId?: string;
  messageId?: number;
  contextId?: string;
  specFileName?: string;
  ticketFileName?: string;
  sessionId?: number;
}

const RUN_ALL_STARTED_REPLY = "▶️ Runner iniciado via /run_all.";
const RUN_ALL_ALREADY_RUNNING_REPLY = "ℹ️ Runner já está em execução.";
const RUN_ALL_AUTH_REQUIRED_REPLY_PREFIX = "❌ ";
const RUN_SPECS_USAGE_REPLY = "ℹ️ Uso: /run_specs <arquivo-da-spec.md>.";
const RUN_SPECS_INVALID_SPEC_REPLY_PREFIX = "❌ Argumento inválido para /run_specs:";
const RUN_SPECS_NOT_FOUND_REPLY_PREFIX = "❌ Spec não encontrada para /run_specs:";
const RUN_SPECS_NOT_ELIGIBLE_REPLY_PREFIX = "❌ Spec não elegível para /run_specs:";
const RUN_SPECS_VALIDATION_CRITERIA_REPLY =
  "Critério de elegibilidade: Status: approved e Spec treatment: pending.";
const RUN_SPECS_VALIDATION_FAILED_REPLY =
  "❌ Falha ao validar spec para /run_specs. Verifique logs do runner e tente novamente.";
const RUN_SPECS_AUTH_REQUIRED_REPLY_PREFIX = "❌ ";
const UNKNOWN_COMMAND_REPLY = "ℹ️ Comando não reconhecido. Use /start para ver os comandos válidos.";
const SPECS_EMPTY_REPLY =
  "ℹ️ Nenhuma spec elegível encontrada no projeto ativo. " +
  "Critério: Status: approved e Spec treatment: pending.";
const SPECS_LIST_FAILED_REPLY =
  "❌ Falha ao listar specs elegíveis. Verifique logs do runner e tente novamente.";
const SPECS_PAGE_SIZE = 5;
const SPECS_CALLBACK_PREFIX = "specs:";
const SPECS_CALLBACK_PAGE_PREFIX = "specs:page:";
const SPECS_CALLBACK_SELECT_PREFIX = "specs:select:";
const SPECS_CALLBACK_INVALID_REPLY = "Ação de spec inválida.";
const SPECS_CALLBACK_STALE_REPLY = "A lista de specs mudou. Use /specs para atualizar.";
const SPECS_CALLBACK_ALREADY_PROCESSED_REPLY = "Seleção já processada. Use /specs para atualizar.";
const SPECS_CALLBACK_SELECTION_STARTED_REPLY = "Triagem iniciada.";
const SPECS_CALLBACK_SELECTION_ALREADY_RUNNING_REPLY = "Runner já está em execução.";
const SPECS_CALLBACK_SELECTION_BLOCKED_REPLY = "Triagem bloqueada.";
const SPECS_CALLBACK_SELECTION_FAILED_REPLY =
  "❌ Falha ao processar seleção de spec. Use /specs para tentar novamente.";
const SPECS_CALLBACK_LOCKED_HINT = "Botões travados. Use /specs para gerar uma nova lista.";
const TICKETS_OPEN_EMPTY_REPLY = "ℹ️ Nenhum ticket aberto encontrado em tickets/open/.";
const TICKETS_OPEN_LIST_FAILED_REPLY =
  "❌ Falha ao listar tickets abertos. Verifique logs do runner e tente novamente.";
const TICKETS_OPEN_PAGE_SIZE = 5;
const TICKETS_OPEN_CALLBACK_PREFIX = "tickets-open:";
const TICKETS_OPEN_CALLBACK_PAGE_PREFIX = "tickets-open:page:";
const TICKETS_OPEN_CALLBACK_SELECT_PREFIX = "tickets-open:select:";
const TICKETS_OPEN_CALLBACK_INVALID_REPLY = "Ação de ticket aberto inválida.";
const TICKETS_OPEN_CALLBACK_STALE_REPLY =
  "A lista de tickets abertos mudou. Use /tickets_open para atualizar.";
const TICKETS_OPEN_CALLBACK_ALREADY_PROCESSED_REPLY =
  "Seleção já processada. Use /tickets_open para atualizar.";
const TICKETS_OPEN_CALLBACK_LOCKED_HINT = "Botões travados. Use /tickets_open para gerar uma nova lista.";
const TICKETS_OPEN_SELECTION_FAILED_REPLY =
  "❌ Falha ao processar seleção de ticket aberto. Use /tickets_open para tentar novamente.";
const TICKETS_OPEN_TICKET_NOT_FOUND_REPLY =
  "❌ Ticket selecionado nao encontrado em tickets/open/. Use /tickets_open para atualizar.";
const TICKETS_OPEN_TICKET_INVALID_REPLY =
  "❌ Ticket selecionado invalido. Use /tickets_open para atualizar.";
const TICKETS_OPEN_CONTENT_CHUNK_MAX_LENGTH = 3500;
const IMPLEMENT_SELECTED_TICKET_BUTTON_LABEL = "▶️ Implementar este ticket";
const TICKET_RUN_CALLBACK_PREFIX = "ticket-run:";
const TICKET_RUN_CALLBACK_EXECUTE_PREFIX = "ticket-run:execute:";
const TICKET_RUN_CALLBACK_INVALID_REPLY = "Ação de ticket inválida.";
const TICKET_RUN_CALLBACK_STALE_REPLY = "Seleção de ticket expirada. Atualize a lista de tickets.";
const TICKET_RUN_CALLBACK_ALREADY_PROCESSED_REPLY =
  "Ação já processada. Atualize a lista de tickets.";
const TICKET_RUN_CALLBACK_STARTED_REPLY = "Execução do ticket iniciada.";
const TICKET_RUN_CALLBACK_BLOCKED_REPLY = "Execução bloqueada.";
const TICKET_RUN_CALLBACK_NOT_FOUND_REPLY = "Ticket não encontrado.";
const TICKET_RUN_CALLBACK_INVALID_TICKET_REPLY = "Ticket inválido.";
const TICKET_RUN_CALLBACK_FAILED_REPLY =
  "❌ Falha ao processar ação de implementação do ticket. Atualize a lista e tente novamente.";
const TICKET_RUN_CALLBACK_LOCKED_HINT = "Botão travado. Atualize a lista de tickets.";
const PROJECTS_PAGE_SIZE = 5;
const PROJECTS_CALLBACK_PREFIX = "projects:";
const PROJECTS_CALLBACK_PAGE_PREFIX = "projects:page:";
const PROJECTS_CALLBACK_SELECT_PREFIX = "projects:select:";
const PLAN_SPEC_CALLBACK_PREFIX = "plan-spec:";
const PLAN_SPEC_CALLBACK_QUESTION_PREFIX = "plan-spec:question:";
const PLAN_SPEC_CALLBACK_FINAL_PREFIX = "plan-spec:final:";
const CODEX_CHAT_CALLBACK_PREFIX = "codex-chat:";
const CODEX_CHAT_CALLBACK_CLOSE_PREFIX = "codex-chat:close:";
const PLAN_SPEC_CALLBACK_INVALID_REPLY = "Ação de planejamento inválida.";
const PLAN_SPEC_CALLBACK_INACTIVE_REPLY = "Sessão de planejamento inativa.";
const PLAN_SPEC_CALLBACK_ACCEPTED_REPLY = "Resposta registrada.";
const PLAN_SPEC_CALLBACK_STALE_REPLY =
  "A etapa do planejamento mudou. Aguarde a próxima mensagem do /plan_spec.";
const PLAN_SPEC_CALLBACK_ALREADY_PROCESSED_REPLY =
  "Seleção já processada. Aguarde a próxima etapa do /plan_spec.";
const PLAN_SPEC_CALLBACK_LOCKED_HINT = "Botões travados. Aguarde a próxima etapa do /plan_spec.";
const PLAN_SPEC_FLOW_FAILED_REPLY_PREFIX = "❌ Falha na sessão interativa de planejamento:";
const PLAN_SPEC_FLOW_FAILED_RETRY_SUFFIX = "Use /plan_spec para tentar novamente.";
const PLAN_SPEC_RAW_OUTPUT_REPLY_PREFIX = "🧩 Saída não parseável do Codex (saneada):";
const PLAN_SPEC_STATUS_INACTIVE_REPLY = "ℹ️ Nenhuma sessão /plan_spec ativa no momento.";
const PLAN_SPEC_INPUT_BRIEF_ACCEPTED_REPLY = "✅ Brief inicial recebido. Aguarde a resposta do Codex.";
const PLAN_SPEC_INPUT_ACCEPTED_REPLY = "✅ Mensagem enviada para a sessão /plan_spec.";
const CODEX_CHAT_INPUT_ACCEPTED_REPLY = "✅ Mensagem enviada para a sessão /codex_chat.";
const CODEX_CHAT_STATUS_INACTIVE_REPLY = "ℹ️ Nenhuma sessão /codex_chat ativa no momento.";
const CODEX_CHAT_CALLBACK_INVALID_REPLY = "Ação de /codex_chat inválida.";
const CODEX_CHAT_CALLBACK_STALE_REPLY = "Sessão /codex_chat expirada ou substituída.";
const CODEX_CHAT_CALLBACK_ACCEPTED_REPLY = "Sessão /codex_chat encerrada.";
const CODEX_CHAT_CALLBACK_FAILED_REPLY = "Falha ao encerrar /codex_chat.";
const CODEX_CHAT_CLOSE_BUTTON_LABEL = "🛑 Encerrar /codex_chat";
const CODEX_CHAT_FLOW_FAILED_REPLY_PREFIX = "❌ Falha na sessão interativa /codex_chat:";
const CODEX_CHAT_FLOW_FAILED_RETRY_SUFFIX = "Use /codex_chat para tentar novamente.";
const CODEX_CHAT_EMPTY_OUTPUT_REPLY = "ℹ️ O Codex não retornou conteúdo nesta resposta.";
const SELECT_PROJECT_USAGE_REPLY =
  "ℹ️ Uso: /select_project <nome-do-projeto>. Alias legado: /select-project. Use /projects para listar os projetos elegíveis.";
const SELECT_PROJECT_BLOCKED_PLAN_SPEC_REPLY =
  "❌ Não é possível trocar o projeto ativo durante uma sessão /plan_spec ativa.";
const LIST_PROJECTS_FAILED_REPLY =
  "❌ Falha ao listar projetos elegíveis. Verifique logs do runner e tente novamente.";
const SELECT_PROJECT_FAILED_REPLY =
  "❌ Falha ao trocar projeto ativo. Verifique logs do runner e tente novamente.";
const PROJECTS_CALLBACK_INVALID_REPLY = "Ação de projeto inválida.";
const PROJECTS_CALLBACK_STALE_REPLY =
  "A lista de projetos mudou. Atualize com /projects e tente novamente.";
const PROJECTS_CALLBACK_UNAUTHORIZED_REPLY = "Acesso não autorizado.";
const RUN_ALL_LEGACY_PATTERN = /^\/run-all(?:@[^\s]+)?(?:\s+.*)?$/u;
const CODEX_CHAT_LEGACY_PATTERN = /^\/codex-chat(?:@[^\s]+)?(?:\s+.*)?$/u;
const SELECT_PROJECT_LEGACY_PATTERN = /^\/select-project(?:@[^\s]+)?(?:\s+.*)?$/u;
const UNKNOWN_COMMAND_PATTERN = /^\/\S+/u;
const BOT_COMMAND_ENTITY_TYPE = "bot_command";
const MAX_TEXT_PREVIEW_LENGTH = 160;
const TELEGRAM_HANDLER_TIMEOUT_MS = 30 * 60 * 1000;
const TELEGRAM_LONG_POLLING_CONFLICT_CODE = 409;
const TELEGRAM_GET_UPDATES_METHOD = "getUpdates";
const TELEGRAM_LONG_POLLING_CONFLICT_SNIPPET = "other getupdates request";
const TELEGRAM_BOT_NOT_RUNNING_MESSAGE = "Bot is not running!";
const TICKET_FINAL_SUMMARY_MAX_ATTEMPTS = 4;
const TICKET_FINAL_SUMMARY_BASE_BACKOFF_MS = 1000;
const TICKET_FINAL_SUMMARY_MAX_BACKOFF_MS = 10_000;
const RETRYABLE_TRANSPORT_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENETUNREACH",
]);

const START_REPLY_LINES = [
  "🤖 Codex Flow Runner",
  "Automação sequencial de tickets via Codex CLI com controle por Telegram.",
  "",
  "Comandos aceitos:",
  "/start - mostra esta ajuda",
  "/run_all - inicia uma rodada sequencial de tickets abertos (alias legado: /run-all)",
  "/specs - lista specs elegíveis para triagem no projeto ativo",
  "/tickets_open - lista tickets abertos para leitura e execução unitária",
  "/run_specs <arquivo> - executa triagem da spec e, em sucesso, encadeia rodada de tickets",
  "/codex_chat - inicia conversa livre com Codex (alias legado: /codex-chat)",
  "/plan_spec - inicia sessão interativa de planejamento de spec",
  "/plan_spec_status - mostra status detalhado da sessão /plan_spec",
  "/plan_spec_cancel - cancela a sessão /plan_spec ativa",
  "/status - mostra o estado atual do runner",
  "/pause - pausa após a etapa corrente",
  "/resume - retoma execução",
  "/projects - lista projetos elegíveis com paginação",
  "/select_project <nome> - seleciona projeto ativo por nome (alias legado: /select-project)",
];

export class TelegramController {
  private readonly bot: Telegraf;
  private notificationChatId: string | null;
  private specsCallbackContextCounter = 0;
  private readonly specsCallbackContexts = new Map<string, SpecsCallbackContextState>();
  private ticketsOpenCallbackContextCounter = 0;
  private readonly ticketsOpenCallbackContexts = new Map<string, TicketsOpenCallbackContextState>();
  private ticketRunCallbackContextCounter = 0;
  private readonly ticketRunCallbackContexts = new Map<string, TicketRunCallbackContextState>();
  private readonly planSpecQuestionCallbackContexts = new Map<string, PlanSpecQuestionCallbackContextState>();
  private readonly planSpecFinalCallbackContexts = new Map<string, PlanSpecFinalCallbackContextState>();
  private launchPromise: Promise<void> | null = null;
  private isStopping = false;

  constructor(
    token: string,
    private readonly logger: Logger,
    private readonly getState: () => RunnerState,
    private readonly controls: BotControls,
    private readonly allowedChatId?: string,
  ) {
    this.bot = new Telegraf(token, {
      handlerTimeout: TELEGRAM_HANDLER_TIMEOUT_MS,
    });
    this.notificationChatId = allowedChatId ?? null;
    this.registerHandlers();
  }

  async start(): Promise<void> {
    if (this.launchPromise) {
      this.logger.warn("Start do Telegram ignorado: long polling ja esta em execucao");
      return;
    }

    this.isStopping = false;

    const launchPromise = this.bot.launch({}, () => {
      this.logger.info("Telegram bot iniciado em long polling");
    });
    this.launchPromise = launchPromise;

    void launchPromise
      .catch((error: unknown) => {
        if (this.isStopping) {
          return;
        }

        if (this.isLongPollingConflictError(error)) {
          this.logger.warn(
            "Conflito no long polling do Telegram: outra instancia do bot esta ativa para este token",
            this.buildLongPollingConflictContext(error),
          );
          return;
        }

        this.logger.error("Falha no long polling do Telegram", {
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        if (this.launchPromise === launchPromise) {
          this.launchPromise = null;
        }
      });
  }

  async stop(signal = "SIGTERM"): Promise<void> {
    this.isStopping = true;

    try {
      this.bot.stop(signal as "SIGINT" | "SIGTERM");
    } catch (error) {
      if (!this.isBotNotRunningError(error)) {
        throw error;
      }

      this.logger.warn("Stop do Telegram ignorado: bot nao estava em execucao", {
        signal,
      });
    }

    if (this.launchPromise) {
      await this.launchPromise.catch(() => undefined);
    }

    this.logger.info("Telegram bot finalizado", { signal });
  }

  private isLongPollingConflictError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const maybeTelegramError = error as TelegramApiErrorLike;
    const errorCode = maybeTelegramError.response?.error_code;
    if (errorCode !== TELEGRAM_LONG_POLLING_CONFLICT_CODE) {
      return false;
    }

    const method = maybeTelegramError.on?.method;
    if (method === TELEGRAM_GET_UPDATES_METHOD) {
      return true;
    }

    const description = maybeTelegramError.response?.description;
    if (typeof description !== "string") {
      return false;
    }

    return description.toLowerCase().includes(TELEGRAM_LONG_POLLING_CONFLICT_SNIPPET);
  }

  private buildLongPollingConflictContext(error: unknown): Record<string, unknown> {
    if (!error || typeof error !== "object") {
      return {};
    }

    const maybeTelegramError = error as TelegramApiErrorLike;
    const description = maybeTelegramError.response?.description;
    const method = maybeTelegramError.on?.method;

    return {
      errorCode: maybeTelegramError.response?.error_code,
      method: typeof method === "string" ? method : undefined,
      description: typeof description === "string" ? description : undefined,
    };
  }

  private isBotNotRunningError(error: unknown): boolean {
    return error instanceof Error && error.message.includes(TELEGRAM_BOT_NOT_RUNNING_MESSAGE);
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
    const payload = this.buildTicketFinalSummaryMessage(summary);

    for (let attempt = 1; attempt <= TICKET_FINAL_SUMMARY_MAX_ATTEMPTS; attempt += 1) {
      try {
        await this.bot.telegram.sendMessage(destinationChatId, payload);

        const delivery: TicketNotificationDelivery = {
          channel: "telegram",
          destinationChatId,
          deliveredAtUtc: new Date().toISOString(),
          attempts: attempt,
          maxAttempts: TICKET_FINAL_SUMMARY_MAX_ATTEMPTS,
        };

        this.logger.info("Resumo final de ticket enviado no Telegram", {
          ticket: summary.ticket,
          status: summary.status,
          chatId: destinationChatId,
          attempt,
          maxAttempts: TICKET_FINAL_SUMMARY_MAX_ATTEMPTS,
        });

        return delivery;
      } catch (error) {
        const classification = this.classifyTicketNotificationSendError(error);
        const isLastAttempt = attempt >= TICKET_FINAL_SUMMARY_MAX_ATTEMPTS;
        const canRetry = classification.retryable && !isLastAttempt;

        const attemptContext = {
          ticket: summary.ticket,
          status: summary.status,
          chatId: destinationChatId,
          attempt,
          maxAttempts: TICKET_FINAL_SUMMARY_MAX_ATTEMPTS,
          errorCode: classification.errorCode,
          errorClass: classification.errorClass,
          error: classification.message,
        };

        if (!canRetry) {
          const failedAtUtc = new Date().toISOString();
          this.logger.error("Falha definitiva ao enviar resumo final de ticket no Telegram", {
            ...attemptContext,
            failedAtUtc,
            retryable: classification.retryable,
          });

          throw new TicketNotificationDispatchError(
            "Falha definitiva ao enviar resumo final de ticket no Telegram",
            {
              channel: "telegram",
              destinationChatId,
              failedAtUtc,
              attempts: attempt,
              maxAttempts: TICKET_FINAL_SUMMARY_MAX_ATTEMPTS,
              errorMessage: classification.message,
              ...(classification.errorCode ? { errorCode: classification.errorCode } : {}),
              errorClass: classification.errorClass,
              retryable: classification.retryable,
            },
            { cause: error },
          );
        }

        const retryDelayMs = this.resolveTicketFinalSummaryRetryDelayMs(classification, attempt);
        this.logger.warn("Falha transitoria ao enviar resumo final de ticket no Telegram", {
          ...attemptContext,
          retryDelayMs,
        });

        await this.waitForTicketFinalSummaryRetry(retryDelayMs);
      }
    }

    return null;
  }

  private classifyTicketNotificationSendError(
    error: unknown,
  ): TicketNotificationSendErrorClassification {
    const apiError = this.readTelegramApiErrorContext(error);
    if (apiError?.errorCode === 429) {
      return {
        retryable: true,
        errorClass: "telegram-rate-limit",
        errorCode: "429",
        retryAfterMs: apiError.retryAfterMs,
        message: apiError.message,
      };
    }

    if (typeof apiError?.errorCode === "number" && apiError.errorCode >= 500 && apiError.errorCode <= 599) {
      return {
        retryable: true,
        errorClass: "telegram-server",
        errorCode: String(apiError.errorCode),
        message: apiError.message,
      };
    }

    const transportErrorCode = this.readTransportErrorCode(error);
    if (transportErrorCode && RETRYABLE_TRANSPORT_ERROR_CODES.has(transportErrorCode)) {
      return {
        retryable: true,
        errorClass: "transport",
        errorCode: transportErrorCode,
        message: this.resolveErrorMessage(error),
      };
    }

    return {
      retryable: false,
      errorClass: "non-retryable",
      ...(apiError?.errorCode !== undefined
        ? { errorCode: String(apiError.errorCode) }
        : transportErrorCode
          ? { errorCode: transportErrorCode }
          : {}),
      message: apiError?.message ?? this.resolveErrorMessage(error),
    };
  }

  private readTelegramApiErrorContext(
    error: unknown,
  ): { errorCode?: number; retryAfterMs?: number; message: string } | null {
    if (!error || typeof error !== "object") {
      return null;
    }

    const maybeTelegramError = error as TelegramApiErrorLike;
    const description = maybeTelegramError.response?.description;
    const messageFromApi = typeof description === "string" ? description : null;
    const message = messageFromApi ?? this.resolveErrorMessage(error);
    const errorCode = this.readNumericValue(maybeTelegramError.response?.error_code);
    const retryAfterSeconds = this.readNumericValue(maybeTelegramError.response?.parameters?.retry_after);
    const retryAfterMs =
      retryAfterSeconds !== undefined ? Math.max(0, Math.floor(retryAfterSeconds * 1000)) : undefined;

    return {
      ...(errorCode !== undefined ? { errorCode } : {}),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      message,
    };
  }

  private readTransportErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== "object") {
      return undefined;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string") {
      return maybeCode.toUpperCase();
    }

    const cause = (error as { cause?: unknown }).cause;
    if (!cause || typeof cause !== "object") {
      return undefined;
    }

    const causeCode = (cause as { code?: unknown }).code;
    if (typeof causeCode === "string") {
      return causeCode.toUpperCase();
    }

    return undefined;
  }

  private resolveTicketFinalSummaryRetryDelayMs(
    classification: TicketNotificationSendErrorClassification,
    attempt: number,
  ): number {
    if (classification.retryAfterMs !== undefined) {
      return Math.min(TICKET_FINAL_SUMMARY_MAX_BACKOFF_MS, classification.retryAfterMs);
    }

    const exponentialBackoffMs =
      TICKET_FINAL_SUMMARY_BASE_BACKOFF_MS * Math.pow(2, Math.max(attempt - 1, 0));
    return Math.min(TICKET_FINAL_SUMMARY_MAX_BACKOFF_MS, exponentialBackoffMs);
  }

  private waitForTicketFinalSummaryRetry(delayMs: number): Promise<void> {
    if (delayMs <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  private readNumericValue(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  async sendPlanSpecQuestion(chatId: string, question: PlanSpecQuestionBlock): Promise<void> {
    const rendered = this.buildPlanSpecQuestionReply(question);
    const sentMessage = await this.bot.telegram.sendMessage(chatId, rendered.text, rendered.extra);
    const state = this.getState();
    this.registerPlanSpecQuestionCallbackContext(
      chatId,
      question,
      this.resolveOutgoingMessageId(sentMessage),
      state.planSpecSession?.sessionId ?? null,
    );
  }

  async sendPlanSpecFinalization(chatId: string, finalBlock: PlanSpecFinalBlock): Promise<void> {
    const rendered = this.buildPlanSpecFinalReply(finalBlock);
    const sentMessage = await this.bot.telegram.sendMessage(chatId, rendered.text, rendered.extra);
    const state = this.getState();
    this.registerPlanSpecFinalCallbackContext(
      chatId,
      finalBlock,
      this.resolveOutgoingMessageId(sentMessage),
      state.planSpecSession?.sessionId ?? null,
    );
  }

  async sendPlanSpecRawOutput(chatId: string, rawOutput: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, this.buildPlanSpecRawOutputReply(rawOutput));
  }

  async sendPlanSpecFailure(chatId: string, details?: string): Promise<void> {
    this.planSpecQuestionCallbackContexts.delete(chatId);
    this.planSpecFinalCallbackContexts.delete(chatId);
    await this.bot.telegram.sendMessage(chatId, this.buildPlanSpecInteractiveFailureReply(details));
  }

  async sendPlanSpecMessage(chatId: string, message: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, message);
  }

  async sendRunSpecsTriageMilestone(event: RunSpecsTriageLifecycleEvent): Promise<void> {
    if (!this.notificationChatId) {
      this.logger.warn("Milestone de triagem de /run_specs nao enviada: chat de notificacao indefinido", {
        specFileName: event.spec.fileName,
        specPath: event.spec.path,
        outcome: event.outcome,
        finalStage: event.finalStage,
      });
      return;
    }

    await this.bot.telegram.sendMessage(
      this.notificationChatId,
      this.buildRunSpecsTriageMilestoneMessage(event),
    );
  }

  async sendCodexChatOutput(chatId: string, rawOutput: string): Promise<void> {
    const state = this.getState();
    const session = state.codexChatSession;
    const sessionId = session && session.chatId === chatId ? (session.sessionId ?? null) : null;
    const rendered = this.buildCodexChatOutputReply(rawOutput, sessionId);
    await this.bot.telegram.sendMessage(chatId, rendered.text, rendered.extra);
  }

  async sendCodexChatFailure(chatId: string, details?: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, this.buildCodexChatInteractiveFailureReply(details));
  }

  async sendCodexChatMessage(chatId: string, message: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, message);
  }

  createImplementTicketCallbackData(
    chatId: string,
    ticketFileName: string,
    messageId: number | null = null,
  ): string {
    const normalizedTicketFileName = ticketFileName.trim();
    if (!normalizedTicketFileName) {
      throw new Error("ticketFileName obrigatorio para criar callback de implementacao");
    }

    const contextId = this.createTicketRunCallbackContext(
      chatId,
      normalizedTicketFileName,
      messageId,
    );
    return this.buildTicketRunExecuteCallbackData(contextId);
  }

  private registerHandlers(): void {
    this.bot.catch((error, ctx) => {
      this.logger.error("Falha nao tratada ao processar update do Telegram", {
        error: error instanceof Error ? error.message : String(error),
        updateType: (ctx as unknown as IncomingUpdateContext).updateType,
        chatId: this.resolveContextChatId((ctx as unknown as IncomingUpdateContext).chat),
      });
    });

    this.bot.use(async (ctx, next) => {
      this.logIncomingUpdate(ctx as unknown as IncomingUpdateContext);
      await next();
    });

    this.bot.use(async (ctx, next) => {
      await this.handleCodexChatCommandHandoff(ctx as unknown as CommandContext, next);
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

    this.bot.command("specs", async (ctx) => {
      await this.handleSpecsCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("tickets_open", async (ctx) => {
      await this.handleTicketsOpenCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("run_specs", async (ctx) => {
      await this.handleRunSpecsCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("codex_chat", async (ctx) => {
      await this.handleCodexChatCommand(ctx as unknown as CommandContext, "codex_chat");
    });

    this.bot.hears(CODEX_CHAT_LEGACY_PATTERN, async (ctx) => {
      await this.handleCodexChatCommand(ctx as unknown as CommandContext, "codex-chat");
    });

    this.bot.command("plan_spec", async (ctx) => {
      await this.handlePlanSpecCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("plan_spec_status", async (ctx) => {
      await this.handlePlanSpecStatusCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("plan_spec_cancel", async (ctx) => {
      await this.handlePlanSpecCancelCommand(ctx as unknown as CommandContext);
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
      await this.handlePauseCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("resume", async (ctx) => {
      await this.handleResumeCommand(ctx as unknown as CommandContext);
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

    this.bot.on("text", async (ctx) => {
      await this.handleActiveFreeTextMessage(ctx as unknown as CommandContext);
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
      await this.handleCallbackQuery(ctx as unknown as CallbackContext);
    });
  }

  private async handlePauseCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "pause",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.pause();
    await ctx.reply(this.buildRunnerProjectControlReply(result));
  }

  private async handleResumeCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "resume",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.resume();
    await ctx.reply(this.buildRunnerProjectControlReply(result));
  }

  private async handleCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData) {
      return;
    }

    if (callbackData.startsWith(SPECS_CALLBACK_PREFIX)) {
      await this.handleSpecsCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(TICKETS_OPEN_CALLBACK_PREFIX)) {
      await this.handleTicketsOpenCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(TICKET_RUN_CALLBACK_PREFIX)) {
      await this.handleTicketRunCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(PROJECTS_CALLBACK_PREFIX)) {
      await this.handleProjectsCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(CODEX_CHAT_CALLBACK_PREFIX)) {
      await this.handleCodexChatCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(PLAN_SPEC_CALLBACK_PREFIX)) {
      await this.handlePlanSpecCallbackQuery(ctx);
    }
  }

  private async handleCodexChatCommandHandoff(
    ctx: CommandContext,
    next: () => Promise<void>,
  ): Promise<void> {
    const command = this.parseCommandNameFromMessage(ctx.message);
    if (!command) {
      await next();
      return;
    }

    const state = this.getState();
    const session = state.codexChatSession;
    const chatId = ctx.chat.id.toString();
    if (
      !session ||
      session.chatId !== chatId ||
      this.isCodexChatEntryCommand(command) ||
      this.isPlanSpecEntryCommand(command)
    ) {
      await next();
      return;
    }

    this.logger.info("Sessao /codex_chat encerrada por troca de comando no mesmo update", {
      chatId,
      previousSessionId: session.sessionId ?? null,
      nextCommand: command,
    });

    try {
      await this.controls.cancelCodexChatSession(chatId, {
        reason: "command-handoff",
        triggeringCommand: command,
      });
    } catch (error) {
      this.logger.error("Falha ao encerrar sessao /codex_chat durante handoff de comando", {
        chatId,
        nextCommand: command,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await next();
  }

  private async handleCodexChatCommand(
    ctx: CommandContext,
    command: "codex_chat" | "codex-chat",
  ): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /codex_chat recebido via Telegram", {
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

    const result = await this.controls.startCodexChatSession(chatId);
    this.captureNotificationChat(chatId);
    await ctx.reply(this.buildCodexChatStartReply(result));
  }

  private async handleActiveFreeTextMessage(ctx: CommandContext): Promise<void> {
    const messageText = (ctx.message?.text ?? "").trim();
    if (!messageText || this.parseCommandNameFromMessage(ctx.message)) {
      return;
    }

    const chatId = ctx.chat.id.toString();
    const route = this.resolveActiveFreeTextRoute(this.getState(), chatId);
    if (route === "plan-spec") {
      await this.handlePlanSpecTextMessage(ctx);
      return;
    }

    if (route === "codex-chat") {
      await this.handleCodexChatTextMessage(ctx);
    }
  }

  private async handleCodexChatTextMessage(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    const stateBeforeInput = this.getState();
    const activeSession = stateBeforeInput.codexChatSession;
    if (!activeSession || activeSession.chatId !== chatId) {
      return;
    }

    const messageText = (ctx.message?.text ?? "").trim();
    if (!messageText || this.parseCommandNameFromMessage(ctx.message)) {
      return;
    }

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "codex_chat",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.submitCodexChatInput(chatId, messageText);
    if (result.status === "accepted") {
      await ctx.reply(CODEX_CHAT_INPUT_ACCEPTED_REPLY);
      return;
    }

    if (result.status === "ignored-empty") {
      return;
    }

    await ctx.reply(this.buildCodexChatInputReply(result));
  }

  private async handleCodexChatCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(CODEX_CHAT_CALLBACK_PREFIX)) {
      return;
    }

    const chatId = this.resolveContextChatId(ctx.chat);
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

    const parsed = this.parseCodexChatCallbackData(callbackData);
    if (parsed.status === "invalid") {
      await this.safeAnswerCallbackQuery(ctx, CODEX_CHAT_CALLBACK_INVALID_REPLY);
      return;
    }

    const state = this.getState();
    const session = state.codexChatSession;
    if (!session || session.chatId !== chatId) {
      await this.safeAnswerCallbackQuery(ctx, CODEX_CHAT_STATUS_INACTIVE_REPLY);
      return;
    }

    if (typeof session.sessionId !== "number" || session.sessionId !== parsed.sessionId) {
      await this.safeAnswerCallbackQuery(ctx, CODEX_CHAT_CALLBACK_STALE_REPLY);
      return;
    }

    try {
      const result = await this.controls.cancelCodexChatSession(chatId);
      await this.safeAnswerCallbackQuery(ctx, this.buildCodexChatCancelCallbackToast(result));
      if (result.status === "cancelled") {
        await this.sendCodexChatCallbackChatMessage(chatId, this.buildCodexChatCancelReply(result));
      }
    } catch (error) {
      this.logger.error("Falha ao encerrar sessao /codex_chat via callback", {
        chatId,
        callbackData,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, CODEX_CHAT_CALLBACK_FAILED_REPLY);
    }
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

    let validation: SpecEligibilityResult;
    try {
      validation = await this.controls.validateRunSpecsTarget(specFileName);
    } catch (error) {
      this.logger.error("Falha ao validar spec para comando /run_specs", {
        chatId,
        specInput: specFileName,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(RUN_SPECS_VALIDATION_FAILED_REPLY);
      return;
    }

    if (validation.status !== "eligible") {
      await ctx.reply(this.buildRunSpecsValidationReply(validation));
      return;
    }

    const outcome = await this.buildRunSpecsReply({
      chatId,
      specFileName: validation.spec.fileName,
    });
    if (outcome.started) {
      this.captureNotificationChat(chatId);
    }

    await ctx.reply(outcome.reply);
  }

  private async handlePlanSpecCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /plan_spec recebido via Telegram", {
      chatId,
      commandText: this.limit((ctx.message?.text ?? "").trim()),
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "plan_spec",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.startPlanSpecSession(chatId);
    this.captureNotificationChat(chatId);
    await ctx.reply(this.buildPlanSpecStartReply(result));
  }

  private async handlePlanSpecStatusCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /plan_spec_status recebido via Telegram", { chatId });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "plan_spec_status",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const state = this.getState();
    await ctx.reply(this.buildPlanSpecStatusReply(state));
  }

  private async handlePlanSpecCancelCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /plan_spec_cancel recebido via Telegram", { chatId });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "plan_spec_cancel",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.cancelPlanSpecSession(chatId);
    await ctx.reply(this.buildPlanSpecCancelReply(result));
  }

  private async handlePlanSpecTextMessage(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    const stateBeforeInput = this.getState();
    if (!stateBeforeInput.planSpecSession) {
      return;
    }

    const messageText = (ctx.message?.text ?? "").trim();
    if (!messageText || this.isCommandMessage(ctx.message)) {
      return;
    }

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "plan_spec",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.submitPlanSpecInput(chatId, messageText);
    if (result.status === "accepted") {
      const acceptedReply =
        stateBeforeInput.planSpecSession.phase === "awaiting-brief"
          ? PLAN_SPEC_INPUT_BRIEF_ACCEPTED_REPLY
          : PLAN_SPEC_INPUT_ACCEPTED_REPLY;
      await ctx.reply(acceptedReply);
      return;
    }

    if (result.status === "ignored-empty") {
      return;
    }

    await ctx.reply(result.message);
  }

  private async handleSpecsCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /specs recebido via Telegram", { chatId });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "specs",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    try {
      const specs = await this.controls.listEligibleSpecs();
      if (specs.length === 0) {
        await ctx.reply(SPECS_EMPTY_REPLY);
        return;
      }

      const contextId = this.createSpecsCallbackContext(chatId);
      const rendered = this.buildSpecsReply(specs, contextId, 0);
      await ctx.reply(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao listar specs elegiveis via comando /specs", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(SPECS_LIST_FAILED_REPLY);
    }
  }

  private async handleTicketsOpenCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /tickets_open recebido via Telegram", { chatId });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "tickets_open",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    try {
      const tickets = await this.controls.listOpenTickets();
      if (tickets.length === 0) {
        await ctx.reply(TICKETS_OPEN_EMPTY_REPLY);
        return;
      }

      const contextId = this.createTicketsOpenCallbackContext(chatId);
      const rendered = this.buildTicketsOpenReply(tickets, contextId, 0);
      await ctx.reply(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao listar tickets abertos via comando /tickets_open", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(TICKETS_OPEN_LIST_FAILED_REPLY);
    }
  }

  private async handleTicketsOpenCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(TICKETS_OPEN_CALLBACK_PREFIX)) {
      return;
    }

    const chatId = this.resolveContextChatId(ctx.chat);
    const userId = this.resolveCallbackUserId(ctx.callbackQuery);
    let auditContext = this.createCallbackAuditContext({
      flow: "tickets-open",
      chatId,
      callbackData,
      action: "unknown",
      userId,
    });
    this.logCallbackAttempt(auditContext);

    if (
      !this.isAllowed({
        chatId,
        eventType: "callback-query",
        callbackData,
      })
    ) {
      this.logCallbackValidation(auditContext, "access", "blocked", "access-denied");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "access-denied",
      });
      await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "access", "passed");
    const parsed = this.parseTicketsOpenCallbackData(callbackData);
    if (parsed.status === "invalid") {
      auditContext = {
        ...auditContext,
        action: "invalid",
      };
      this.logCallbackValidation(auditContext, "payload", "blocked", "invalid-action");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "invalid-action",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_CALLBACK_INVALID_REPLY);
      return;
    }

    auditContext = {
      ...auditContext,
      action: parsed.status,
      contextId: parsed.contextId,
    };
    this.logCallbackValidation(auditContext, "payload", "passed");

    const callbackContext = this.ticketsOpenCallbackContexts.get(parsed.contextId);
    if (!callbackContext || callbackContext.chatId !== chatId) {
      this.logCallbackValidation(auditContext, "context", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_CALLBACK_STALE_REPLY);
      await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_CALLBACK_STALE_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "context", "passed");

    if (callbackContext.consumed) {
      this.logCallbackValidation(auditContext, "idempotency", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_CALLBACK_ALREADY_PROCESSED_REPLY);
      return;
    }

    if (parsed.status === "page") {
      await this.renderTicketsOpenCallbackPage(ctx, chatId, parsed.contextId, parsed.page, auditContext);
      return;
    }

    await this.handleTicketsOpenSelectionFromCallback(
      ctx,
      chatId,
      parsed.contextId,
      parsed.ticketIndex,
      callbackContext,
      auditContext,
    );
  }

  private async renderTicketsOpenCallbackPage(
    ctx: CallbackContext,
    chatId: string,
    contextId: string,
    page: number,
    auditContext: CallbackAuditContext,
  ): Promise<void> {
    try {
      const tickets = await this.controls.listOpenTickets();
      if (tickets.length === 0) {
        this.logCallbackValidation(auditContext, "list-refresh", "blocked", "stale");
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: "stale",
        });
        this.ticketsOpenCallbackContexts.delete(contextId);
        await ctx.editMessageText(TICKETS_OPEN_EMPTY_REPLY, {
          reply_markup: {
            inline_keyboard: [],
          },
        });
        await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_CALLBACK_STALE_REPLY);
        await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_CALLBACK_STALE_REPLY);
        return;
      }

      this.logCallbackValidation(auditContext, "list-refresh", "passed");
      const rendered = this.buildTicketsOpenReply(tickets, contextId, page);
      await ctx.editMessageText(rendered.text, rendered.extra);
      await this.safeAnswerCallbackQuery(ctx);
      this.logCallbackDecision(auditContext, {
        result: "accepted",
      });
    } catch (error) {
      this.logger.error("Falha ao paginar listagem de tickets abertos via callback", {
        requestedPage: page,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_LIST_FAILED_REPLY);
      await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_LIST_FAILED_REPLY);
    }
  }

  private async handleTicketsOpenSelectionFromCallback(
    ctx: CallbackContext,
    chatId: string,
    contextId: string,
    ticketIndex: number,
    callbackContext: TicketsOpenCallbackContextState,
    auditContext: CallbackAuditContext,
  ): Promise<void> {
    try {
      const tickets = await this.controls.listOpenTickets();
      const targetTicket = tickets[ticketIndex];
      if (!targetTicket) {
        this.logCallbackValidation(auditContext, "target-ticket", "blocked", "stale");
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: "stale",
        });
        await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_CALLBACK_STALE_REPLY);
        await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_CALLBACK_STALE_REPLY);
        return;
      }

      const selectionAuditContext: CallbackAuditContext = {
        ...auditContext,
        ticketFileName: targetTicket.fileName,
      };
      this.logCallbackValidation(selectionAuditContext, "target-ticket", "passed");

      callbackContext.consumed = true;
      this.ticketsOpenCallbackContexts.set(contextId, callbackContext);

      const readResult = await this.controls.readOpenTicket(targetTicket.fileName);
      if (readResult.status === "not-found") {
        this.logCallbackValidation(selectionAuditContext, "read-ticket", "blocked", "ticket-nao-encontrado");
        this.logCallbackDecision(selectionAuditContext, {
          result: "blocked",
          blockReason: "ticket-nao-encontrado",
        });
        await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_NOT_FOUND_REPLY);
        await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_TICKET_NOT_FOUND_REPLY);
        return;
      }

      if (readResult.status === "invalid-name") {
        this.logCallbackValidation(selectionAuditContext, "read-ticket", "blocked", "ticket-invalido");
        this.logCallbackDecision(selectionAuditContext, {
          result: "blocked",
          blockReason: "ticket-invalido",
        });
        await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_INVALID_TICKET_REPLY);
        await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_TICKET_INVALID_REPLY);
        return;
      }

      this.logCallbackValidation(selectionAuditContext, "read-ticket", "passed");

      await this.safeEditTicketsOpenCallbackSelectionMessage(ctx, readResult.ticket.fileName);
      await this.sendTicketOpenContent(chatId, readResult.ticket.fileName, readResult.content);
      await this.sendImplementSelectedTicketAction(chatId, readResult.ticket.fileName);
      await this.safeAnswerCallbackQuery(ctx, "Ticket carregado.");
      this.logCallbackDecision(selectionAuditContext, {
        result: "accepted",
      });
    } catch (error) {
      this.logger.error("Falha ao executar callback de selecao de ticket aberto", {
        chatId,
        ticketIndex,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, TICKETS_OPEN_SELECTION_FAILED_REPLY);
      await this.sendTicketsOpenCallbackChatMessage(chatId, TICKETS_OPEN_SELECTION_FAILED_REPLY);
    }
  }

  private async handleSpecsCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(SPECS_CALLBACK_PREFIX)) {
      return;
    }

    const chatId = this.resolveContextChatId(ctx.chat);
    const userId = this.resolveCallbackUserId(ctx.callbackQuery);
    let auditContext = this.createCallbackAuditContext({
      flow: "specs",
      chatId,
      callbackData,
      action: "unknown",
      userId,
    });
    this.logCallbackAttempt(auditContext);

    if (
      !this.isAllowed({
        chatId,
        eventType: "callback-query",
        callbackData,
      })
    ) {
      this.logCallbackValidation(auditContext, "access", "blocked", "access-denied");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "access-denied",
      });
      await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "access", "passed");
    const parsed = this.parseSpecsCallbackData(callbackData);
    if (parsed.status === "invalid") {
      auditContext = {
        ...auditContext,
        action: "invalid",
      };
      this.logCallbackValidation(auditContext, "payload", "blocked", "invalid-action");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "invalid-action",
      });
      await this.safeAnswerCallbackQuery(ctx, SPECS_CALLBACK_INVALID_REPLY);
      return;
    }

    auditContext = {
      ...auditContext,
      action: parsed.status,
      contextId: parsed.contextId,
    };
    this.logCallbackValidation(auditContext, "payload", "passed");

    const callbackContext = this.specsCallbackContexts.get(parsed.contextId);
    if (!callbackContext || callbackContext.chatId !== chatId) {
      this.logCallbackValidation(auditContext, "context", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, SPECS_CALLBACK_STALE_REPLY);
      await this.sendSpecsCallbackChatMessage(chatId, SPECS_CALLBACK_STALE_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "context", "passed");

    if (callbackContext.consumed) {
      this.logCallbackValidation(auditContext, "idempotency", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, SPECS_CALLBACK_ALREADY_PROCESSED_REPLY);
      return;
    }

    if (parsed.status === "page") {
      await this.renderSpecsCallbackPage(ctx, chatId, parsed.contextId, parsed.page, auditContext);
      return;
    }

    await this.handleSpecsSelectionFromCallback(
      ctx,
      chatId,
      parsed.contextId,
      parsed.specIndex,
      callbackContext,
      auditContext,
    );
  }

  private async handleTicketRunCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(TICKET_RUN_CALLBACK_PREFIX)) {
      return;
    }

    const chatId = this.resolveContextChatId(ctx.chat);
    const userId = this.resolveCallbackUserId(ctx.callbackQuery);
    const callbackMessageId = this.resolveCallbackMessageId(ctx.callbackQuery);
    let auditContext = this.createCallbackAuditContext({
      flow: "run-ticket",
      chatId,
      callbackData,
      action: "unknown",
      userId,
      ...(typeof callbackMessageId === "number" ? { messageId: callbackMessageId } : {}),
    });
    this.logCallbackAttempt(auditContext);

    if (
      !this.isAllowed({
        chatId,
        eventType: "callback-query",
        callbackData,
      })
    ) {
      this.logCallbackValidation(auditContext, "access", "blocked", "access-denied");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "access-denied",
      });
      await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "access", "passed");
    const parsed = this.parseTicketRunCallbackData(callbackData);
    if (parsed.status === "invalid") {
      auditContext = {
        ...auditContext,
        action: "invalid",
      };
      this.logCallbackValidation(auditContext, "payload", "blocked", "invalid-action");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "invalid-action",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_INVALID_REPLY);
      return;
    }

    auditContext = {
      ...auditContext,
      action: parsed.status,
      contextId: parsed.contextId,
    };
    this.logCallbackValidation(auditContext, "payload", "passed");

    const callbackContext = this.ticketRunCallbackContexts.get(parsed.contextId);
    if (!callbackContext || callbackContext.chatId !== chatId) {
      this.logCallbackValidation(auditContext, "context", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_STALE_REPLY);
      await this.sendTicketRunCallbackChatMessage(chatId, TICKET_RUN_CALLBACK_STALE_REPLY);
      return;
    }

    auditContext = {
      ...auditContext,
      ticketFileName: callbackContext.ticketFileName,
    };

    if (this.hasPlanSpecCallbackMessageMismatch(callbackContext.messageId, callbackMessageId)) {
      this.logCallbackValidation(auditContext, "message-context", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_STALE_REPLY);
      await this.sendTicketRunCallbackChatMessage(chatId, TICKET_RUN_CALLBACK_STALE_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "context", "passed");

    if (callbackContext.processing || callbackContext.consumed) {
      this.logCallbackValidation(auditContext, "idempotency", "blocked", "stale");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "stale",
      });
      await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_ALREADY_PROCESSED_REPLY);
      return;
    }

    callbackContext.processing = true;
    this.ticketRunCallbackContexts.set(parsed.contextId, callbackContext);

    try {
      const runResult = await this.controls.runSelectedTicket(callbackContext.ticketFileName);
      const outcomeReply = this.buildRunSelectedTicketReply(runResult, callbackContext.ticketFileName);
      const outcomeToast = this.buildTicketRunSelectionToast(runResult);

      callbackContext.processing = false;
      callbackContext.consumed = true;
      this.ticketRunCallbackContexts.set(parsed.contextId, callbackContext);

      if (runResult.status === "started") {
        this.captureNotificationChat(chatId);
        this.logCallbackValidation(auditContext, "runner", "passed");
      } else if (runResult.status === "ticket-nao-encontrado") {
        this.logCallbackValidation(auditContext, "runner", "blocked", "ticket-nao-encontrado");
      } else if (runResult.status === "ticket-invalido") {
        this.logCallbackValidation(auditContext, "runner", "blocked", "ticket-invalido");
      } else {
        this.logCallbackValidation(auditContext, "runner", "blocked", "runner-blocked");
      }

      await this.safeEditTicketRunCallbackSelectionMessage(
        ctx,
        callbackContext.ticketFileName,
        outcomeReply,
      );
      await this.safeAnswerCallbackQuery(ctx, outcomeToast);
      await this.sendTicketRunCallbackChatMessage(chatId, outcomeReply);
      this.logCallbackDecision(auditContext, this.buildTicketRunDecision(runResult));
    } catch (error) {
      callbackContext.processing = false;
      this.ticketRunCallbackContexts.set(parsed.contextId, callbackContext);
      this.logger.error("Falha ao executar callback de implementacao de ticket", {
        chatId,
        ticketFileName: callbackContext.ticketFileName,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, TICKET_RUN_CALLBACK_FAILED_REPLY);
      await this.sendTicketRunCallbackChatMessage(chatId, TICKET_RUN_CALLBACK_FAILED_REPLY);
    }
  }

  private async renderSpecsCallbackPage(
    ctx: CallbackContext,
    chatId: string,
    contextId: string,
    page: number,
    auditContext: CallbackAuditContext,
  ): Promise<void> {
    try {
      const specs = await this.controls.listEligibleSpecs();
      if (specs.length === 0) {
        this.logCallbackValidation(auditContext, "list-refresh", "blocked", "stale");
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: "stale",
        });
        this.specsCallbackContexts.delete(contextId);
        await ctx.editMessageText(SPECS_EMPTY_REPLY, {
          reply_markup: {
            inline_keyboard: [],
          },
        });
        await this.safeAnswerCallbackQuery(ctx, SPECS_CALLBACK_STALE_REPLY);
        await this.sendSpecsCallbackChatMessage(chatId, SPECS_CALLBACK_STALE_REPLY);
        return;
      }

      this.logCallbackValidation(auditContext, "list-refresh", "passed");
      const rendered = this.buildSpecsReply(specs, contextId, page);
      await ctx.editMessageText(rendered.text, rendered.extra);
      await this.safeAnswerCallbackQuery(ctx);
      this.logCallbackDecision(auditContext, {
        result: "accepted",
      });
    } catch (error) {
      this.logger.error("Falha ao paginar listagem de specs via callback", {
        requestedPage: page,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, SPECS_LIST_FAILED_REPLY);
      await this.sendSpecsCallbackChatMessage(chatId, SPECS_LIST_FAILED_REPLY);
    }
  }

  private async handleSpecsSelectionFromCallback(
    ctx: CallbackContext,
    chatId: string,
    contextId: string,
    specIndex: number,
    callbackContext: SpecsCallbackContextState,
    auditContext: CallbackAuditContext,
  ): Promise<void> {
    try {
      const specs = await this.controls.listEligibleSpecs();
      const targetSpec = specs[specIndex];
      if (!targetSpec) {
        this.logCallbackValidation(auditContext, "target-spec", "blocked", "stale");
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: "stale",
        });
        await this.safeAnswerCallbackQuery(ctx, SPECS_CALLBACK_STALE_REPLY);
        await this.sendSpecsCallbackChatMessage(chatId, SPECS_CALLBACK_STALE_REPLY);
        return;
      }

      const selectionAuditContext: CallbackAuditContext = {
        ...auditContext,
        specFileName: targetSpec.fileName,
      };
      this.logCallbackValidation(selectionAuditContext, "target-spec", "passed");

      callbackContext.consumed = true;
      this.specsCallbackContexts.set(contextId, callbackContext);

      let validation: SpecEligibilityResult;
      try {
        validation = await this.controls.validateRunSpecsTarget(targetSpec.fileName);
      } catch (error) {
        this.logger.error("Falha ao validar spec em callback de /specs", {
          chatId,
          specInput: targetSpec.fileName,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logCallbackDecision(selectionAuditContext, {
          result: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
        await this.safeAnswerCallbackQuery(ctx, RUN_SPECS_VALIDATION_FAILED_REPLY);
        await this.sendSpecsCallbackChatMessage(chatId, RUN_SPECS_VALIDATION_FAILED_REPLY);
        return;
      }

      if (validation.status !== "eligible") {
        this.logCallbackValidation(selectionAuditContext, "eligibility", "blocked", "ineligible");
        this.logCallbackDecision(selectionAuditContext, {
          result: "blocked",
          blockReason: "ineligible",
        });
        const validationReply = this.buildRunSpecsValidationReply(validation);
        await this.safeAnswerCallbackQuery(ctx, this.buildSpecsValidationToast(validation));
        await this.sendSpecsCallbackChatMessage(chatId, validationReply);
        return;
      }

      const eligibleAuditContext: CallbackAuditContext = {
        ...selectionAuditContext,
        specFileName: validation.spec.fileName,
      };
      this.logCallbackValidation(eligibleAuditContext, "eligibility", "passed");

      const runOutcome = await this.buildRunSpecsReply({
        chatId,
        specFileName: validation.spec.fileName,
      });
      if (runOutcome.started) {
        this.captureNotificationChat(chatId);
      }

      await this.safeEditSpecsCallbackSelectionMessage(
        ctx,
        specs,
        validation.spec.fileName,
        runOutcome.reply,
      );
      await this.safeAnswerCallbackQuery(ctx, this.buildSpecsSelectionToast(runOutcome.status));
      await this.sendSpecsCallbackChatMessage(chatId, runOutcome.reply);
      this.logCallbackDecision(eligibleAuditContext, {
        result: runOutcome.status === "started" ? "accepted" : "blocked",
        ...(runOutcome.status === "started" ? {} : { blockReason: "concurrency" }),
      });
    } catch (error) {
      this.logger.error("Falha ao executar callback de selecao de /specs", {
        chatId,
        specIndex,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, SPECS_CALLBACK_SELECTION_FAILED_REPLY);
      await this.sendSpecsCallbackChatMessage(chatId, SPECS_CALLBACK_SELECTION_FAILED_REPLY);
    }
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

    const state = this.getState();
    if (state.planSpecSession) {
      await ctx.reply(SELECT_PROJECT_BLOCKED_PLAN_SPEC_REPLY);
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

    const state = this.getState();
    if (state.planSpecSession) {
      await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_BLOCKED_PLAN_SPEC_REPLY);
      return;
    }

    if (parsed.status === "page") {
      await this.renderProjectsCallbackPage(ctx, parsed.page);
      await this.safeAnswerCallbackQuery(ctx);
      return;
    }

    await this.handleSelectProjectFromCallback(ctx, parsed.projectIndex);
  }

  private async handlePlanSpecCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(PLAN_SPEC_CALLBACK_PREFIX)) {
      return;
    }

    const chatId = this.resolveContextChatId(ctx.chat);
    const userId = this.resolveCallbackUserId(ctx.callbackQuery);
    const parsed = this.parsePlanSpecCallbackData(callbackData);
    const action = this.resolvePlanSpecCallbackAction(parsed);
    const state = this.getState();
    const session = state.planSpecSession;
    const callbackMessageId = this.resolveCallbackMessageId(ctx.callbackQuery);
    const auditContext = this.createCallbackAuditContext({
      flow: "plan-spec",
      chatId,
      callbackData,
      action,
      userId,
      sessionId: session?.sessionId,
      ...(typeof callbackMessageId === "number" ? { messageId: callbackMessageId } : {}),
    });

    this.logCallbackAttempt(auditContext);
    if (
      !this.isAllowed({
        chatId,
        eventType: "callback-query",
        callbackData,
      })
    ) {
      this.logCallbackValidation(auditContext, "access", "blocked", "access-denied");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "access-denied",
      });
      await this.safeAnswerCallbackQuery(ctx, PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "access", "passed");
    if (parsed.status === "invalid") {
      this.logCallbackValidation(auditContext, "payload", "blocked", "invalid-action");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "invalid-action",
      });
      await this.safeAnswerCallbackQuery(ctx, PLAN_SPEC_CALLBACK_INVALID_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "payload", "passed");

    if (parsed.status === "question") {
      if (!this.controls.onPlanSpecQuestionOptionSelected) {
        this.logCallbackValidation(auditContext, "session-handler", "blocked", "inactive-session");
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: "inactive-session",
        });
        await this.safeAnswerCallbackQuery(ctx, PLAN_SPEC_CALLBACK_INACTIVE_REPLY);
        return;
      }

      this.logCallbackValidation(auditContext, "session-handler", "passed");
      const contextValidation = this.validatePlanSpecQuestionCallbackContext({
        chatId,
        optionValue: parsed.optionValue,
        callbackMessageId,
        session,
      });
      if (contextValidation.status === "blocked") {
        this.logCallbackValidation(
          auditContext,
          contextValidation.validation,
          "blocked",
          contextValidation.blockReason,
        );
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: contextValidation.blockReason,
        });
        await this.safeAnswerCallbackQuery(ctx, contextValidation.reply);
        return;
      }

      this.logCallbackValidation(auditContext, "context", "passed");
      this.setPlanSpecQuestionContextProcessing(chatId, true);
      try {
        const outcome = await this.controls.onPlanSpecQuestionOptionSelected(
          chatId,
          parsed.optionValue,
        );
        if (outcome.status === "accepted") {
          this.setPlanSpecQuestionContextAccepted(chatId);
          await this.safeEditPlanSpecQuestionCallbackSelectionMessage(
            ctx,
            contextValidation.context,
            parsed.optionValue,
          );
          await this.safeAnswerCallbackQuery(ctx, PLAN_SPEC_CALLBACK_ACCEPTED_REPLY);
          await this.sendPlanSpecCallbackChatMessage(
            chatId,
            this.buildPlanSpecQuestionSelectionConfirmationReply(
              contextValidation.context,
              parsed.optionValue,
            ),
          );
          this.logCallbackDecision(auditContext, {
            result: "accepted",
          });
          return;
        }

        this.setPlanSpecQuestionContextProcessing(chatId, false);
        await this.safeAnswerCallbackQuery(ctx, outcome.message);
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: outcome.reason,
        });
      } catch (error) {
        this.setPlanSpecQuestionContextProcessing(chatId, false);
        this.logger.error("Falha ao processar callback de pergunta do planejamento", {
          optionValue: parsed.optionValue,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logCallbackDecision(auditContext, {
          result: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
        await this.safeAnswerCallbackQuery(ctx, this.buildPlanSpecInteractiveFailureReply());
      }
      return;
    }

    if (!this.controls.onPlanSpecFinalActionSelected) {
      this.logCallbackValidation(auditContext, "session-handler", "blocked", "inactive-session");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "inactive-session",
      });
      await this.safeAnswerCallbackQuery(ctx, PLAN_SPEC_CALLBACK_INACTIVE_REPLY);
      return;
    }

    this.logCallbackValidation(auditContext, "session-handler", "passed");
    const contextValidation = this.validatePlanSpecFinalCallbackContext({
      chatId,
      action: parsed.action,
      callbackMessageId,
      session,
    });
    if (contextValidation.status === "blocked") {
      this.logCallbackValidation(
        auditContext,
        contextValidation.validation,
        "blocked",
        contextValidation.blockReason,
      );
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: contextValidation.blockReason,
      });
      await this.safeAnswerCallbackQuery(ctx, contextValidation.reply);
      return;
    }

    this.logCallbackValidation(auditContext, "context", "passed");
    this.setPlanSpecFinalContextProcessing(chatId, true);
    try {
      const outcome = await this.controls.onPlanSpecFinalActionSelected(chatId, parsed.action);
      if (outcome.status === "accepted") {
        this.setPlanSpecFinalContextAccepted(chatId);
        await this.safeEditPlanSpecFinalCallbackSelectionMessage(
          ctx,
          contextValidation.context,
          parsed.action,
        );
        await this.safeAnswerCallbackQuery(ctx, PLAN_SPEC_CALLBACK_ACCEPTED_REPLY);
        await this.sendPlanSpecCallbackChatMessage(
          chatId,
          this.buildPlanSpecFinalSelectionConfirmationReply(contextValidation.context, parsed.action),
        );
        this.logCallbackDecision(auditContext, {
          result: "accepted",
        });
        return;
      }

      this.setPlanSpecFinalContextProcessing(chatId, false);
      await this.safeAnswerCallbackQuery(ctx, outcome.message);
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: outcome.reason,
      });
    } catch (error) {
      this.setPlanSpecFinalContextProcessing(chatId, false);
      this.logger.error("Falha ao processar callback de finalizacao do planejamento", {
        action: parsed.action,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, this.buildPlanSpecInteractiveFailureReply());
    }
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
      if (selectionResult.status === "blocked-plan-spec") {
        await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_BLOCKED_PLAN_SPEC_REPLY);
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

  private parseCommandNameFromMessage(
    message?: {
      text?: string;
      entities?: Array<{
        type: string;
        offset: number;
        length: number;
      }>;
    },
  ): string | null {
    const token = this.extractCommandTokenFromMessage(message);
    if (!token) {
      return null;
    }

    const tokenWithoutSlash = token.startsWith("/") ? token.slice(1) : token;
    const commandName = tokenWithoutSlash.split("@", 2)[0]?.trim().toLowerCase();
    if (!commandName) {
      return null;
    }

    return commandName;
  }

  private extractCommandTokenFromMessage(
    message?: {
      text?: string;
      entities?: Array<{
        type: string;
        offset: number;
        length: number;
      }>;
    },
  ): string | null {
    const messageText = message?.text;
    if (!messageText) {
      return null;
    }

    const commandEntity = message.entities?.find(
      (entity) => entity.type === BOT_COMMAND_ENTITY_TYPE && entity.offset === 0,
    );
    if (commandEntity && commandEntity.length > 0) {
      const tokenFromEntity = messageText.slice(0, commandEntity.length).trim();
      if (tokenFromEntity.startsWith("/") && tokenFromEntity.length > 1) {
        return tokenFromEntity;
      }
    }

    const normalizedText = messageText.trimStart();
    if (!normalizedText.startsWith("/")) {
      return null;
    }

    const fallbackToken = normalizedText.split(/\s+/u, 1)[0]?.trim() ?? "";
    if (!fallbackToken.startsWith("/") || fallbackToken.length <= 1) {
      return null;
    }

    return fallbackToken;
  }

  private isCodexChatEntryCommand(command: string): boolean {
    return command === "codex_chat" || command === "codex-chat";
  }

  private isPlanSpecEntryCommand(command: string): boolean {
    return command === "plan_spec";
  }

  private resolveActiveFreeTextRoute(
    state: RunnerState,
    chatId: string,
  ): "plan-spec" | "codex-chat" | null {
    const planSpecSession = state.planSpecSession;
    const codexChatSession = state.codexChatSession;
    if (!planSpecSession && !codexChatSession) {
      return null;
    }

    if (planSpecSession && codexChatSession) {
      this.logger.warn(
        "Conflito de sessoes de texto livre detectado; roteamento unico sera aplicado",
        {
          chatId,
          planSpecSessionChatId: planSpecSession.chatId,
          planSpecSessionId: planSpecSession.sessionId ?? null,
          codexChatSessionChatId: codexChatSession.chatId,
          codexChatSessionId: codexChatSession.sessionId ?? null,
        },
      );
    }

    if (planSpecSession && planSpecSession.chatId === chatId) {
      return "plan-spec";
    }

    if (codexChatSession && codexChatSession.chatId === chatId) {
      return "codex-chat";
    }

    if (planSpecSession) {
      return "plan-spec";
    }

    return "codex-chat";
  }

  private parseCodexChatCallbackData(callbackData: string): ParsedCodexChatCallbackData {
    if (!callbackData.startsWith(CODEX_CHAT_CALLBACK_CLOSE_PREFIX)) {
      return { status: "invalid" };
    }

    const rawSessionId = callbackData.slice(CODEX_CHAT_CALLBACK_CLOSE_PREFIX.length).trim();
    const sessionId = Number.parseInt(rawSessionId, 10);
    if (!Number.isFinite(sessionId) || sessionId < 1) {
      return { status: "invalid" };
    }

    return {
      status: "close",
      sessionId,
    };
  }

  private buildCodexChatCloseCallbackData(sessionId: number): string {
    return `${CODEX_CHAT_CALLBACK_CLOSE_PREFIX}${String(sessionId)}`;
  }

  private buildCodexChatOutputReply(
    rawOutput: string,
    sessionId: number | null,
  ): { text: string; extra?: ReplyOptions } {
    const text = rawOutput.trim() || CODEX_CHAT_EMPTY_OUTPUT_REPLY;
    if (typeof sessionId !== "number") {
      return { text };
    }

    return {
      text,
      extra: {
        reply_markup: {
          inline_keyboard: [[{
            text: CODEX_CHAT_CLOSE_BUTTON_LABEL,
            callback_data: this.buildCodexChatCloseCallbackData(sessionId),
          }]],
        },
      },
    };
  }

  private buildCodexChatStartReply(result: CodexChatSessionStartResult): string {
    if (result.status === "started") {
      return `💬 ${result.message}`;
    }

    if (result.status === "already-active") {
      return `ℹ️ ${result.message}`;
    }

    if (result.status === "blocked") {
      return `❌ ${result.message}`;
    }

    return this.buildCodexChatInteractiveFailureReply(result.message);
  }

  private buildCodexChatInputReply(
    result: Exclude<CodexChatSessionInputResult, {
      status: "accepted";
    }>,
  ): string {
    if (result.status === "ignored-empty") {
      return "";
    }

    if (result.status === "inactive") {
      return CODEX_CHAT_STATUS_INACTIVE_REPLY;
    }

    return `ℹ️ ${result.message}`;
  }

  private buildCodexChatCancelReply(result: CodexChatSessionCancelResult): string {
    if (result.status === "cancelled") {
      return `✅ ${result.message}`;
    }

    if (result.status === "inactive") {
      return CODEX_CHAT_STATUS_INACTIVE_REPLY;
    }

    return `ℹ️ ${result.message}`;
  }

  private buildCodexChatCancelCallbackToast(result: CodexChatSessionCancelResult): string {
    if (result.status === "cancelled") {
      return CODEX_CHAT_CALLBACK_ACCEPTED_REPLY;
    }

    if (result.status === "inactive") {
      return CODEX_CHAT_STATUS_INACTIVE_REPLY;
    }

    return result.message;
  }

  private buildCodexChatInteractiveFailureReply(details?: string): string {
    return [
      CODEX_CHAT_FLOW_FAILED_REPLY_PREFIX,
      details?.trim() || "não foi possível interpretar a sessão atual.",
      CODEX_CHAT_FLOW_FAILED_RETRY_SUFFIX,
    ].join(" ");
  }

  private buildSelectProjectReply(result: ProjectSelectionControlResult): string {
    if (result.status === "blocked-plan-spec") {
      return SELECT_PROJECT_BLOCKED_PLAN_SPEC_REPLY;
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

  private buildSpecsReply(
    specs: EligibleSpecRef[],
    contextId: string,
    requestedPage: number,
  ): { text: string; extra: ReplyOptions } {
    const activeProjectName = this.getState().activeProject?.name ?? "desconhecido";
    const totalSpecs = specs.length;
    const totalPages = Math.max(1, Math.ceil(totalSpecs / SPECS_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * SPECS_PAGE_SIZE;
    const pageSpecs = specs.slice(start, start + SPECS_PAGE_SIZE);

    const lines = [
      "📚 Specs elegíveis para /run_specs",
      `Página ${page + 1}/${totalPages}`,
      `Projeto ativo: ${activeProjectName}`,
      RUN_SPECS_VALIDATION_CRITERIA_REPLY,
      "",
    ];

    for (const [index, spec] of pageSpecs.entries()) {
      const absoluteIndex = start + index;
      lines.push(`${absoluteIndex + 1}. ▫️ ${spec.fileName}`);
    }

    lines.push(
      "",
      "Toque em uma spec para iniciar a triagem.",
      "Fallback manual: /run_specs <arquivo-da-spec.md>.",
    );

    const inlineKeyboard: InlineKeyboardButton[][] = pageSpecs.map((spec, index) => {
      const absoluteIndex = start + index;
      return [
        {
          text: `▶️ ${spec.fileName}`,
          callback_data: this.buildSpecsSelectCallbackData(contextId, absoluteIndex),
        },
      ];
    });

    const pageButtons: InlineKeyboardButton[] = [];
    if (page > 0) {
      pageButtons.push({
        text: "⬅️ Anterior",
        callback_data: this.buildSpecsPageCallbackData(contextId, page - 1),
      });
    }
    if (page < totalPages - 1) {
      pageButtons.push({
        text: "Próxima ➡️",
        callback_data: this.buildSpecsPageCallbackData(contextId, page + 1),
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

  private buildTicketsOpenReply(
    tickets: OpenTicketRef[],
    contextId: string,
    requestedPage: number,
  ): { text: string; extra: ReplyOptions } {
    const activeProjectName = this.getState().activeProject?.name ?? "desconhecido";
    const totalTickets = tickets.length;
    const totalPages = Math.max(1, Math.ceil(totalTickets / TICKETS_OPEN_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * TICKETS_OPEN_PAGE_SIZE;
    const pageTickets = tickets.slice(start, start + TICKETS_OPEN_PAGE_SIZE);

    const lines = [
      "🗂️ Tickets abertos",
      `Página ${page + 1}/${totalPages}`,
      `Projeto ativo: ${activeProjectName}`,
      "Diretório: tickets/open/",
      "",
    ];

    for (const [index, ticket] of pageTickets.entries()) {
      const absoluteIndex = start + index;
      lines.push(`${absoluteIndex + 1}. ▫️ ${ticket.fileName}`);
    }

    lines.push(
      "",
      "Toque em um ticket para ler o conteúdo completo.",
      'Após a leitura, use o botão "Implementar este ticket" para executar somente esse ticket.',
    );

    const inlineKeyboard: InlineKeyboardButton[][] = pageTickets.map((ticket, index) => {
      const absoluteIndex = start + index;
      return [
        {
          text: `🧾 ${ticket.fileName}`,
          callback_data: this.buildTicketsOpenSelectCallbackData(contextId, absoluteIndex),
        },
      ];
    });

    const pageButtons: InlineKeyboardButton[] = [];
    if (page > 0) {
      pageButtons.push({
        text: "⬅️ Anterior",
        callback_data: this.buildTicketsOpenPageCallbackData(contextId, page - 1),
      });
    }

    if (page < totalPages - 1) {
      pageButtons.push({
        text: "Próxima ➡️",
        callback_data: this.buildTicketsOpenPageCallbackData(contextId, page + 1),
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

  private buildLockedTicketsOpenReply(ticketFileName: string): { text: string; extra: ReplyOptions } {
    const activeProjectName = this.getState().activeProject?.name ?? "desconhecido";
    const lines = [
      "🗂️ Tickets abertos",
      `Projeto ativo: ${activeProjectName}`,
      `✅ Selecionado: ${ticketFileName}`,
      TICKETS_OPEN_CALLBACK_LOCKED_HINT,
    ];

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: [],
        },
      },
    };
  }

  private buildImplementSelectedTicketReply(ticketFileName: string): string {
    const activeProjectName = this.getState().activeProject?.name ?? "desconhecido";
    return [
      "🧾 Ticket selecionado",
      `Projeto ativo: ${activeProjectName}`,
      `Ticket: ${ticketFileName}`,
      "",
      "Ação disponível:",
      'Toque em "Implementar este ticket" para iniciar execução unitária.',
    ].join("\n");
  }

  private buildLockedSpecsReply(
    selectedSpecFileName: string,
    outcomeReply: string,
  ): { text: string; extra: ReplyOptions } {
    const activeProjectName = this.getState().activeProject?.name ?? "desconhecido";
    const lines = [
      "📚 Specs elegíveis para /run_specs",
      `Projeto ativo: ${activeProjectName}`,
      RUN_SPECS_VALIDATION_CRITERIA_REPLY,
      "",
      `✅ Selecionada: ${selectedSpecFileName}`,
      SPECS_CALLBACK_LOCKED_HINT,
      "",
      `Resultado: ${outcomeReply}`,
    ];

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: [],
        },
      },
    };
  }

  private buildLockedTicketRunReply(
    ticketFileName: string,
    outcomeReply: string,
  ): { text: string; extra: ReplyOptions } {
    const activeProjectName = this.getState().activeProject?.name ?? "desconhecido";
    const lines = [
      "🧾 Ticket selecionado",
      `Projeto ativo: ${activeProjectName}`,
      `Ticket: ${ticketFileName}`,
      "✅ Ação: Implementar este ticket",
      TICKET_RUN_CALLBACK_LOCKED_HINT,
      "",
      `Resultado: ${outcomeReply}`,
    ];

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: [],
        },
      },
    };
  }

  private buildPlanSpecQuestionReply(
    question: PlanSpecQuestionBlock,
  ): { text: string; extra: ReplyOptions } {
    const options = this.resolvePlanSpecQuestionOptions(question);
    const lines = [
      "❓ Pergunta do planejamento",
      question.prompt,
      "",
      "Você pode responder por botão ou texto livre.",
    ];

    const inlineKeyboard: InlineKeyboardButton[][] = options.map((option) => [
      {
        text: option.label,
        callback_data: this.buildPlanSpecQuestionCallbackData(option.value),
      },
    ]);

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      },
    };
  }

  private buildPlanSpecFinalReply(finalBlock: PlanSpecFinalBlock): { text: string; extra: ReplyOptions } {
    const lines = [
      "✅ Planejamento concluído",
      `Título: ${finalBlock.title}`,
      "",
      "Resumo:",
      finalBlock.summary,
      "",
      "Escolha a próxima ação:",
    ];

    const actions = this.resolvePlanSpecFinalActions(finalBlock);

    const inlineKeyboard: InlineKeyboardButton[][] = actions.map((action) => [
      {
        text: action.label,
        callback_data: this.buildPlanSpecFinalCallbackData(action.id),
      },
    ]);

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      },
    };
  }

  private resolvePlanSpecQuestionOptions(
    question: PlanSpecQuestionBlock,
  ): PlanSpecQuestionOptionState[] {
    return question.options.slice(0, 10).map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }

  private resolvePlanSpecFinalActions(finalBlock: PlanSpecFinalBlock): PlanSpecFinalActionState[] {
    const actions = finalBlock.actions.length > 0
      ? finalBlock.actions
      : [
          { id: "create-spec" as const, label: "Criar spec" },
          { id: "refine" as const, label: "Refinar" },
          { id: "cancel" as const, label: "Cancelar" },
        ];
    return actions.map((action) => ({
      id: action.id,
      label: action.label,
    }));
  }

  private buildLockedPlanSpecQuestionReply(
    context: PlanSpecQuestionCallbackContextState,
    selectedOptionValue: string,
  ): { text: string; extra: ReplyOptions } {
    const lines = [
      "❓ Pergunta do planejamento",
      context.prompt,
      "",
      "Seleção confirmada:",
    ];

    for (const option of context.options) {
      const marker = option.value === selectedOptionValue ? "✅" : "▫️";
      lines.push(`${marker} ${option.label}`);
    }

    lines.push("", PLAN_SPEC_CALLBACK_LOCKED_HINT);

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: [],
        },
      },
    };
  }

  private buildLockedPlanSpecFinalReply(
    context: PlanSpecFinalCallbackContextState,
    selectedAction: PlanSpecFinalActionId,
  ): { text: string; extra: ReplyOptions } {
    const lines = [
      "✅ Planejamento concluído",
      `Título: ${context.title}`,
      "",
      "Resumo:",
      context.summary,
      "",
      "Ação confirmada:",
    ];

    for (const action of context.actions) {
      const marker = action.id === selectedAction ? "✅" : "▫️";
      lines.push(`${marker} ${action.label}`);
    }

    lines.push("", PLAN_SPEC_CALLBACK_LOCKED_HINT);

    return {
      text: lines.join("\n"),
      extra: {
        reply_markup: {
          inline_keyboard: [],
        },
      },
    };
  }

  private resolvePlanSpecQuestionOptionLabel(
    context: PlanSpecQuestionCallbackContextState,
    selectedOptionValue: string,
  ): string {
    const option = context.options.find((item) => item.value === selectedOptionValue);
    return option?.label ?? selectedOptionValue;
  }

  private resolvePlanSpecFinalActionLabel(
    context: PlanSpecFinalCallbackContextState,
    selectedAction: PlanSpecFinalActionId,
  ): string {
    const action = context.actions.find((item) => item.id === selectedAction);
    return action?.label ?? selectedAction;
  }

  private buildPlanSpecQuestionSelectionConfirmationReply(
    context: PlanSpecQuestionCallbackContextState,
    selectedOptionValue: string,
  ): string {
    return `✅ ${PLAN_SPEC_CALLBACK_ACCEPTED_REPLY} ${this.resolvePlanSpecQuestionOptionLabel(context, selectedOptionValue)}`;
  }

  private buildPlanSpecFinalSelectionConfirmationReply(
    context: PlanSpecFinalCallbackContextState,
    selectedAction: PlanSpecFinalActionId,
  ): string {
    return `✅ ${PLAN_SPEC_CALLBACK_ACCEPTED_REPLY} ${this.resolvePlanSpecFinalActionLabel(context, selectedAction)}`;
  }

  private buildPlanSpecRawOutputReply(rawOutput: string): string {
    const sanitized = sanitizePlanSpecRawOutput(rawOutput);
    if (!sanitized) {
      return PLAN_SPEC_RAW_OUTPUT_REPLY_PREFIX;
    }

    return [PLAN_SPEC_RAW_OUTPUT_REPLY_PREFIX, sanitized].join("\n");
  }

  private buildPlanSpecInteractiveFailureReply(details?: string): string {
    return [
      PLAN_SPEC_FLOW_FAILED_REPLY_PREFIX,
      details?.trim() || "não foi possível interpretar a sessão atual.",
      PLAN_SPEC_FLOW_FAILED_RETRY_SUFFIX,
    ].join(" ");
  }

  private buildPlanSpecQuestionCallbackData(optionValue: string): string {
    return `${PLAN_SPEC_CALLBACK_QUESTION_PREFIX}${optionValue}`;
  }

  private buildPlanSpecFinalCallbackData(action: PlanSpecFinalActionId): string {
    return `${PLAN_SPEC_CALLBACK_FINAL_PREFIX}${action}`;
  }

  private buildSpecsPageCallbackData(contextId: string, page: number): string {
    return `${SPECS_CALLBACK_PAGE_PREFIX}${contextId}:${page}`;
  }

  private buildSpecsSelectCallbackData(contextId: string, specIndex: number): string {
    return `${SPECS_CALLBACK_SELECT_PREFIX}${contextId}:${specIndex}`;
  }

  private buildTicketsOpenPageCallbackData(contextId: string, page: number): string {
    return `${TICKETS_OPEN_CALLBACK_PAGE_PREFIX}${contextId}:${page}`;
  }

  private buildTicketsOpenSelectCallbackData(contextId: string, ticketIndex: number): string {
    return `${TICKETS_OPEN_CALLBACK_SELECT_PREFIX}${contextId}:${ticketIndex}`;
  }

  private buildTicketRunExecuteCallbackData(contextId: string): string {
    return `${TICKET_RUN_CALLBACK_EXECUTE_PREFIX}${contextId}`;
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

  private parsePlanSpecCallbackData(callbackData: string): ParsedPlanSpecCallbackData {
    if (callbackData.startsWith(PLAN_SPEC_CALLBACK_QUESTION_PREFIX)) {
      const optionValue = callbackData.slice(PLAN_SPEC_CALLBACK_QUESTION_PREFIX.length).trim();
      if (!optionValue) {
        return { status: "invalid" };
      }

      return {
        status: "question",
        optionValue,
      };
    }

    if (callbackData.startsWith(PLAN_SPEC_CALLBACK_FINAL_PREFIX)) {
      const rawAction = callbackData.slice(PLAN_SPEC_CALLBACK_FINAL_PREFIX.length).trim();
      if (rawAction === "create-spec" || rawAction === "refine" || rawAction === "cancel") {
        return {
          status: "final",
          action: rawAction,
        };
      }
    }

    return { status: "invalid" };
  }

  private resolvePlanSpecCallbackAction(parsed: ParsedPlanSpecCallbackData): string {
    if (parsed.status === "question") {
      return "question";
    }

    if (parsed.status === "final") {
      return parsed.action;
    }

    return "invalid";
  }

  private validatePlanSpecQuestionCallbackContext(params: {
    chatId: string;
    optionValue: string;
    callbackMessageId: number | null;
    session: RunnerState["planSpecSession"];
  }): PlanSpecCallbackContextValidationResult<PlanSpecQuestionCallbackContextState> {
    const { chatId, optionValue, callbackMessageId, session } = params;
    if (!session || session.chatId !== chatId) {
      return {
        status: "blocked",
        validation: "session",
        blockReason: "inactive-session",
        reply: PLAN_SPEC_CALLBACK_INACTIVE_REPLY,
      };
    }

    if (session.phase !== "waiting-user") {
      return {
        status: "blocked",
        validation: "phase",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    const context = this.planSpecQuestionCallbackContexts.get(chatId);
    if (!context) {
      return {
        status: "blocked",
        validation: "context",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    if (this.hasPlanSpecCallbackSessionMismatch(context.sessionId, session.sessionId ?? null)) {
      return {
        status: "blocked",
        validation: "session-context",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    if (this.hasPlanSpecCallbackMessageMismatch(context.messageId, callbackMessageId)) {
      return {
        status: "blocked",
        validation: "message-context",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    if (context.processing || context.consumed) {
      return {
        status: "blocked",
        validation: "idempotency",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_ALREADY_PROCESSED_REPLY,
      };
    }

    if (!context.options.some((option) => option.value === optionValue)) {
      return {
        status: "blocked",
        validation: "payload-context",
        blockReason: "invalid-action",
        reply: PLAN_SPEC_CALLBACK_INVALID_REPLY,
      };
    }

    return {
      status: "passed",
      context,
    };
  }

  private validatePlanSpecFinalCallbackContext(params: {
    chatId: string;
    action: PlanSpecFinalActionId;
    callbackMessageId: number | null;
    session: RunnerState["planSpecSession"];
  }): PlanSpecCallbackContextValidationResult<PlanSpecFinalCallbackContextState> {
    const { chatId, action, callbackMessageId, session } = params;
    if (!session || session.chatId !== chatId) {
      return {
        status: "blocked",
        validation: "session",
        blockReason: "inactive-session",
        reply: PLAN_SPEC_CALLBACK_INACTIVE_REPLY,
      };
    }

    if (session.phase !== "awaiting-final-action") {
      return {
        status: "blocked",
        validation: "phase",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    const context = this.planSpecFinalCallbackContexts.get(chatId);
    if (!context) {
      return {
        status: "blocked",
        validation: "context",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    if (this.hasPlanSpecCallbackSessionMismatch(context.sessionId, session.sessionId ?? null)) {
      return {
        status: "blocked",
        validation: "session-context",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    if (this.hasPlanSpecCallbackMessageMismatch(context.messageId, callbackMessageId)) {
      return {
        status: "blocked",
        validation: "message-context",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_STALE_REPLY,
      };
    }

    if (context.processing || context.consumed) {
      return {
        status: "blocked",
        validation: "idempotency",
        blockReason: "stale",
        reply: PLAN_SPEC_CALLBACK_ALREADY_PROCESSED_REPLY,
      };
    }

    if (!context.actions.some((registeredAction) => registeredAction.id === action)) {
      return {
        status: "blocked",
        validation: "payload-context",
        blockReason: "invalid-action",
        reply: PLAN_SPEC_CALLBACK_INVALID_REPLY,
      };
    }

    return {
      status: "passed",
      context,
    };
  }

  private hasPlanSpecCallbackSessionMismatch(
    contextSessionId: number | null,
    sessionId: number | null,
  ): boolean {
    if (typeof contextSessionId !== "number" || typeof sessionId !== "number") {
      return false;
    }

    return contextSessionId !== sessionId;
  }

  private hasPlanSpecCallbackMessageMismatch(
    contextMessageId: number | null,
    callbackMessageId: number | null,
  ): boolean {
    if (typeof contextMessageId !== "number" || typeof callbackMessageId !== "number") {
      return false;
    }

    return contextMessageId !== callbackMessageId;
  }

  private parseSpecsCallbackData(callbackData: string): ParsedSpecsCallbackData {
    if (callbackData.startsWith(SPECS_CALLBACK_PAGE_PREFIX)) {
      const payload = callbackData.slice(SPECS_CALLBACK_PAGE_PREFIX.length);
      const [contextId, rawPage] = payload.split(":", 2);
      const page = Number.parseInt(rawPage ?? "", 10);
      if (!contextId || !Number.isFinite(page) || page < 0) {
        return { status: "invalid" };
      }

      return {
        status: "page",
        contextId,
        page,
      };
    }

    if (callbackData.startsWith(SPECS_CALLBACK_SELECT_PREFIX)) {
      const payload = callbackData.slice(SPECS_CALLBACK_SELECT_PREFIX.length);
      const [contextId, rawIndex] = payload.split(":", 2);
      const specIndex = Number.parseInt(rawIndex ?? "", 10);
      if (!contextId || !Number.isFinite(specIndex) || specIndex < 0) {
        return { status: "invalid" };
      }

      return {
        status: "select",
        contextId,
        specIndex,
      };
    }

    return { status: "invalid" };
  }

  private parseTicketsOpenCallbackData(callbackData: string): ParsedTicketsOpenCallbackData {
    if (callbackData.startsWith(TICKETS_OPEN_CALLBACK_PAGE_PREFIX)) {
      const payload = callbackData.slice(TICKETS_OPEN_CALLBACK_PAGE_PREFIX.length);
      const [contextId, rawPage] = payload.split(":", 2);
      const page = Number.parseInt(rawPage ?? "", 10);
      if (!contextId || !Number.isFinite(page) || page < 0) {
        return { status: "invalid" };
      }

      return {
        status: "page",
        contextId,
        page,
      };
    }

    if (callbackData.startsWith(TICKETS_OPEN_CALLBACK_SELECT_PREFIX)) {
      const payload = callbackData.slice(TICKETS_OPEN_CALLBACK_SELECT_PREFIX.length);
      const [contextId, rawIndex] = payload.split(":", 2);
      const ticketIndex = Number.parseInt(rawIndex ?? "", 10);
      if (!contextId || !Number.isFinite(ticketIndex) || ticketIndex < 0) {
        return { status: "invalid" };
      }

      return {
        status: "select",
        contextId,
        ticketIndex,
      };
    }

    return { status: "invalid" };
  }

  private parseTicketRunCallbackData(callbackData: string): ParsedTicketRunCallbackData {
    if (!callbackData.startsWith(TICKET_RUN_CALLBACK_EXECUTE_PREFIX)) {
      return { status: "invalid" };
    }

    const contextId = callbackData.slice(TICKET_RUN_CALLBACK_EXECUTE_PREFIX.length).trim();
    if (!contextId) {
      return { status: "invalid" };
    }

    return {
      status: "execute",
      contextId,
    };
  }

  private createSpecsCallbackContext(chatId: string): string {
    this.invalidateSpecsCallbackContextsForChat(chatId);
    const contextId = this.nextSpecsCallbackContextId();
    this.specsCallbackContexts.set(contextId, {
      chatId,
      consumed: false,
    });
    return contextId;
  }

  private createTicketsOpenCallbackContext(chatId: string): string {
    this.invalidateTicketsOpenCallbackContextsForChat(chatId);
    const contextId = this.nextTicketsOpenCallbackContextId();
    this.ticketsOpenCallbackContexts.set(contextId, {
      chatId,
      consumed: false,
    });
    return contextId;
  }

  private invalidateSpecsCallbackContextsForChat(chatId: string): void {
    for (const [contextId, context] of this.specsCallbackContexts.entries()) {
      if (context.chatId === chatId) {
        this.specsCallbackContexts.delete(contextId);
      }
    }
  }

  private invalidateTicketsOpenCallbackContextsForChat(chatId: string): void {
    for (const [contextId, context] of this.ticketsOpenCallbackContexts.entries()) {
      if (context.chatId === chatId) {
        this.ticketsOpenCallbackContexts.delete(contextId);
      }
    }
  }

  private nextSpecsCallbackContextId(): string {
    this.specsCallbackContextCounter += 1;
    return this.specsCallbackContextCounter.toString(36);
  }

  private nextTicketsOpenCallbackContextId(): string {
    this.ticketsOpenCallbackContextCounter += 1;
    return this.ticketsOpenCallbackContextCounter.toString(36);
  }

  private createTicketRunCallbackContext(
    chatId: string,
    ticketFileName: string,
    messageId: number | null,
  ): string {
    this.invalidateTicketRunCallbackContextsForChat(chatId);
    const contextId = this.nextTicketRunCallbackContextId();
    this.ticketRunCallbackContexts.set(contextId, {
      chatId,
      ticketFileName,
      messageId,
      consumed: false,
      processing: false,
    });
    return contextId;
  }

  private invalidateTicketRunCallbackContextsForChat(chatId: string): void {
    for (const [contextId, context] of this.ticketRunCallbackContexts.entries()) {
      if (context.chatId === chatId) {
        this.ticketRunCallbackContexts.delete(contextId);
      }
    }
  }

  private nextTicketRunCallbackContextId(): string {
    this.ticketRunCallbackContextCounter += 1;
    return this.ticketRunCallbackContextCounter.toString(36);
  }

  private registerPlanSpecQuestionCallbackContext(
    chatId: string,
    question: PlanSpecQuestionBlock,
    messageId: number | null,
    sessionId: number | null,
  ): void {
    const options = this.resolvePlanSpecQuestionOptions(question);
    this.planSpecQuestionCallbackContexts.set(chatId, {
      chatId,
      sessionId,
      messageId,
      consumed: false,
      processing: false,
      prompt: question.prompt,
      options,
    });
    this.planSpecFinalCallbackContexts.delete(chatId);
  }

  private registerPlanSpecFinalCallbackContext(
    chatId: string,
    finalBlock: PlanSpecFinalBlock,
    messageId: number | null,
    sessionId: number | null,
  ): void {
    const actions = this.resolvePlanSpecFinalActions(finalBlock);
    this.planSpecFinalCallbackContexts.set(chatId, {
      chatId,
      sessionId,
      messageId,
      consumed: false,
      processing: false,
      title: finalBlock.title,
      summary: finalBlock.summary,
      actions,
    });
    this.planSpecQuestionCallbackContexts.delete(chatId);
  }

  private setPlanSpecQuestionContextProcessing(chatId: string, processing: boolean): void {
    const context = this.planSpecQuestionCallbackContexts.get(chatId);
    if (!context) {
      return;
    }

    context.processing = processing;
    this.planSpecQuestionCallbackContexts.set(chatId, context);
  }

  private setPlanSpecQuestionContextAccepted(chatId: string): void {
    const context = this.planSpecQuestionCallbackContexts.get(chatId);
    if (!context) {
      return;
    }

    context.processing = false;
    context.consumed = true;
    this.planSpecQuestionCallbackContexts.set(chatId, context);
  }

  private setPlanSpecFinalContextProcessing(chatId: string, processing: boolean): void {
    const context = this.planSpecFinalCallbackContexts.get(chatId);
    if (!context) {
      return;
    }

    context.processing = processing;
    this.planSpecFinalCallbackContexts.set(chatId, context);
  }

  private setPlanSpecFinalContextAccepted(chatId: string): void {
    const context = this.planSpecFinalCallbackContexts.get(chatId);
    if (!context) {
      return;
    }

    context.processing = false;
    context.consumed = true;
    this.planSpecFinalCallbackContexts.set(chatId, context);
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

  private resolveCallbackUserId(
    callbackQuery?: {
      from?: {
        id: number | string;
      };
    },
  ): string | undefined {
    if (!callbackQuery?.from) {
      return undefined;
    }

    return callbackQuery.from.id.toString();
  }

  private resolveCallbackMessageId(
    callbackQuery?: {
      message?: {
        message_id?: number;
      };
    },
  ): number | null {
    if (typeof callbackQuery?.message?.message_id !== "number") {
      return null;
    }

    return callbackQuery.message.message_id;
  }

  private resolveOutgoingMessageId(message: unknown): number | null {
    if (!message || typeof message !== "object") {
      return null;
    }

    const value = (message as { message_id?: unknown }).message_id;
    if (typeof value !== "number") {
      return null;
    }

    return value;
  }

  private createCallbackAuditContext(value: CallbackAuditContext): CallbackAuditContext {
    return {
      ...value,
      callbackData: this.limit(value.callbackData),
    };
  }

  private buildCallbackAuditPayload(context: CallbackAuditContext): Record<string, unknown> {
    return {
      callbackFlow: context.flow,
      chatId: context.chatId,
      callbackData: context.callbackData,
      action: context.action,
      ...(context.userId ? { userId: context.userId } : {}),
      ...(typeof context.messageId === "number" ? { messageId: context.messageId } : {}),
      ...(context.contextId ? { contextId: context.contextId } : {}),
      ...(context.specFileName ? { specFileName: context.specFileName } : {}),
      ...(context.ticketFileName ? { ticketFileName: context.ticketFileName } : {}),
      ...(typeof context.sessionId === "number" ? { sessionId: context.sessionId } : {}),
    };
  }

  private logCallbackAttempt(context: CallbackAuditContext): void {
    this.logger.info("Callback recebido via Telegram", {
      ...this.buildCallbackAuditPayload(context),
      callbackStage: "attempt",
    });
  }

  private logCallbackValidation(
    context: CallbackAuditContext,
    validation: string,
    validationResult: CallbackValidationResult,
    blockReason?: CallbackBlockReason,
  ): void {
    this.logger.info("Validacao de callback executada", {
      ...this.buildCallbackAuditPayload(context),
      callbackStage: "validation",
      validation,
      validationResult,
      ...(blockReason ? { blockReason } : {}),
    });
  }

  private logCallbackDecision(
    context: CallbackAuditContext,
    decision: {
      result: CallbackDecisionResult;
      blockReason?: CallbackBlockReason;
      detail?: string;
    },
  ): void {
    this.logger.info("Decisao final de callback registrada", {
      ...this.buildCallbackAuditPayload(context),
      callbackStage: "decision",
      result: decision.result,
      ...(decision.blockReason ? { blockReason: decision.blockReason } : {}),
      ...(decision.detail ? { detail: this.limit(decision.detail) } : {}),
    });
  }

  private buildSpecsSelectionToast(status: "started" | "already-running" | "blocked"): string {
    if (status === "started") {
      return SPECS_CALLBACK_SELECTION_STARTED_REPLY;
    }

    if (status === "already-running") {
      return SPECS_CALLBACK_SELECTION_ALREADY_RUNNING_REPLY;
    }

    return SPECS_CALLBACK_SELECTION_BLOCKED_REPLY;
  }

  private buildSpecsValidationToast(
    validation: Exclude<SpecEligibilityResult, {
      status: "eligible";
    }>,
  ): string {
    if (validation.status === "invalid-path") {
      return "Spec inválida.";
    }

    if (validation.status === "not-found") {
      return "Spec não encontrada.";
    }

    return "Spec não elegível.";
  }

  private async safeEditSpecsCallbackSelectionMessage(
    ctx: CallbackContext,
    specs: EligibleSpecRef[],
    selectedSpecFileName: string,
    outcomeReply: string,
  ): Promise<void> {
    const rendered = this.buildLockedSpecsReply(selectedSpecFileName, outcomeReply);

    try {
      await ctx.editMessageText(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.warn("Falha ao editar mensagem de /specs para destacar selecao", {
        selectedSpecFileName,
        listedSpecsCount: specs.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async safeEditTicketsOpenCallbackSelectionMessage(
    ctx: CallbackContext,
    ticketFileName: string,
  ): Promise<void> {
    const rendered = this.buildLockedTicketsOpenReply(ticketFileName);

    try {
      await ctx.editMessageText(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.warn("Falha ao editar mensagem de /tickets_open para destacar selecao", {
        ticketFileName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async safeEditTicketRunCallbackSelectionMessage(
    ctx: CallbackContext,
    ticketFileName: string,
    outcomeReply: string,
  ): Promise<void> {
    const rendered = this.buildLockedTicketRunReply(ticketFileName, outcomeReply);

    try {
      await ctx.editMessageText(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.warn("Falha ao editar mensagem de acao de ticket para destacar selecao", {
        ticketFileName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async safeEditPlanSpecQuestionCallbackSelectionMessage(
    ctx: CallbackContext,
    context: PlanSpecQuestionCallbackContextState,
    selectedOptionValue: string,
  ): Promise<void> {
    const rendered = this.buildLockedPlanSpecQuestionReply(context, selectedOptionValue);

    try {
      await ctx.editMessageText(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.warn("Falha ao editar mensagem de /plan_spec para destacar selecao de pergunta", {
        chatId: context.chatId,
        messageId: context.messageId,
        selectedOptionValue,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async safeEditPlanSpecFinalCallbackSelectionMessage(
    ctx: CallbackContext,
    context: PlanSpecFinalCallbackContextState,
    selectedAction: PlanSpecFinalActionId,
  ): Promise<void> {
    const rendered = this.buildLockedPlanSpecFinalReply(context, selectedAction);

    try {
      await ctx.editMessageText(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.warn("Falha ao editar mensagem de /plan_spec para destacar acao final", {
        chatId: context.chatId,
        messageId: context.messageId,
        selectedAction,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendTicketOpenContent(
    chatId: string,
    ticketFileName: string,
    content: string,
  ): Promise<void> {
    const chunks = this.chunkTicketContent(content, TICKETS_OPEN_CONTENT_CHUNK_MAX_LENGTH);
    const totalChunks = chunks.length;

    for (const [index, chunk] of chunks.entries()) {
      const chunkHeader = totalChunks > 1 ? `Parte ${index + 1}/${totalChunks}` : "Parte única";
      const message = [
        `🧾 Ticket aberto: ${ticketFileName}`,
        chunkHeader,
        "",
        chunk,
      ].join("\n");
      await this.bot.telegram.sendMessage(chatId, message);
    }
  }

  private async sendImplementSelectedTicketAction(chatId: string, ticketFileName: string): Promise<void> {
    const callbackData = this.createImplementTicketCallbackData(chatId, ticketFileName);
    await this.bot.telegram.sendMessage(chatId, this.buildImplementSelectedTicketReply(ticketFileName), {
      reply_markup: {
        inline_keyboard: [[{
          text: IMPLEMENT_SELECTED_TICKET_BUTTON_LABEL,
          callback_data: callbackData,
        }]],
      },
    });
  }

  private chunkTicketContent(content: string, maxChunkLength: number): string[] {
    const normalizedContent = content.replace(/\r\n/g, "\n");
    const source = normalizedContent.length > 0 ? normalizedContent : "(arquivo vazio)";
    if (source.length <= maxChunkLength) {
      return [source];
    }

    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < source.length) {
      const maxEnd = Math.min(cursor + maxChunkLength, source.length);
      let chunkEnd = maxEnd;

      if (maxEnd < source.length) {
        const breakAt = source.lastIndexOf("\n", maxEnd - 1);
        if (breakAt >= cursor) {
          chunkEnd = breakAt + 1;
        }
      }

      if (chunkEnd <= cursor) {
        chunkEnd = maxEnd;
      }

      chunks.push(source.slice(cursor, chunkEnd));
      cursor = chunkEnd;
    }

    return chunks;
  }

  private async sendSpecsCallbackChatMessage(chatId: string, message: string): Promise<void> {
    if (!chatId || chatId === "unknown") {
      return;
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar confirmação de callback de /specs no chat", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendTicketsOpenCallbackChatMessage(chatId: string, message: string): Promise<void> {
    if (!chatId || chatId === "unknown") {
      return;
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar confirmação de callback de /tickets_open no chat", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendPlanSpecCallbackChatMessage(chatId: string, message: string): Promise<void> {
    if (!chatId || chatId === "unknown") {
      return;
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar confirmação de callback de /plan_spec no chat", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendTicketRunCallbackChatMessage(chatId: string, message: string): Promise<void> {
    if (!chatId || chatId === "unknown") {
      return;
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar confirmação de callback de implementacao de ticket", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async sendCodexChatCallbackChatMessage(chatId: string, message: string): Promise<void> {
    if (!chatId || chatId === "unknown") {
      return;
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      this.logger.warn("Falha ao enviar confirmação de callback de /codex_chat no chat", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
  }): Promise<{ reply: string; started: boolean; status: "started" | "already-running" | "blocked" }> {
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
        status: "started",
      };
    }

    if (result.status === "already-running") {
      this.logger.warn("Comando /run_specs ignorado: rodada ja em execucao", logContext);
      return { reply: RUN_ALL_ALREADY_RUNNING_REPLY, started: false, status: "already-running" };
    }

    this.logger.warn("Comando /run_specs bloqueado", {
      ...logContext,
      message: result.message,
    });
    return {
      reply: `${RUN_SPECS_AUTH_REQUIRED_REPLY_PREFIX}${result.message}`,
      started: false,
      status: "blocked",
    };
  }

  private buildRunSelectedTicketReply(
    result: RunSelectedTicketRequestResult,
    ticketFileName: string,
  ): string {
    if (result.status === "started") {
      return `▶️ Execução iniciada para o ticket ${ticketFileName}.`;
    }

    return `❌ ${result.message}`;
  }

  private buildTicketRunSelectionToast(result: RunSelectedTicketRequestResult): string {
    if (result.status === "started") {
      return TICKET_RUN_CALLBACK_STARTED_REPLY;
    }

    if (result.status === "ticket-nao-encontrado") {
      return TICKET_RUN_CALLBACK_NOT_FOUND_REPLY;
    }

    if (result.status === "ticket-invalido") {
      return TICKET_RUN_CALLBACK_INVALID_TICKET_REPLY;
    }

    return TICKET_RUN_CALLBACK_BLOCKED_REPLY;
  }

  private buildTicketRunDecision(result: RunSelectedTicketRequestResult): {
    result: CallbackDecisionResult;
    blockReason?: CallbackBlockReason;
  } {
    if (result.status === "started") {
      return { result: "accepted" };
    }

    if (result.status === "ticket-nao-encontrado") {
      return {
        result: "blocked",
        blockReason: "ticket-nao-encontrado",
      };
    }

    if (result.status === "ticket-invalido") {
      return {
        result: "blocked",
        blockReason: "ticket-invalido",
      };
    }

    return {
      result: "blocked",
      blockReason: "runner-blocked",
    };
  }

  private buildRunSpecsValidationReply(validation: Exclude<SpecEligibilityResult, {
    status: "eligible";
  }>): string {
    if (validation.status === "invalid-path") {
      return `${RUN_SPECS_INVALID_SPEC_REPLY_PREFIX} ${validation.message}`;
    }

    if (validation.status === "not-found") {
      return [
        `${RUN_SPECS_NOT_FOUND_REPLY_PREFIX} ${validation.spec.fileName}.`,
        "Verifique se o arquivo existe em docs/specs/.",
      ].join(" ");
    }

    return [
      `${RUN_SPECS_NOT_ELIGIBLE_REPLY_PREFIX} ${validation.spec.fileName}.`,
      RUN_SPECS_VALIDATION_CRITERIA_REPLY,
      `Metadata atual: Status: ${this.renderMetadataValue(validation.metadata.status)};`,
      `Spec treatment: ${this.renderMetadataValue(validation.metadata.specTreatment)}.`,
    ].join(" ");
  }

  private buildPlanSpecStartReply(result: PlanSpecSessionStartResult): string {
    if (result.status === "started") {
      return `🧭 ${result.message}`;
    }

    if (result.status === "already-active") {
      return `ℹ️ ${result.message}`;
    }

    if (result.status === "blocked-running") {
      return `❌ ${result.message}`;
    }

    if (result.status === "blocked") {
      return `❌ ${result.message}`;
    }

    return this.buildPlanSpecInteractiveFailureReply(result.message);
  }

  private buildPlanSpecCancelReply(result: PlanSpecSessionCancelResult): string {
    if (result.status === "cancelled") {
      return `✅ ${result.message}`;
    }

    if (result.status === "inactive") {
      return PLAN_SPEC_STATUS_INACTIVE_REPLY;
    }

    return `ℹ️ ${result.message}`;
  }

  private buildRunnerProjectControlReply(result: RunnerProjectControlResult): string {
    if (result.status === "applied") {
      if (result.action === "pause") {
        return `✅ Runner do projeto ${result.project.name} será pausado após a etapa corrente.`;
      }

      return `▶️ Runner do projeto ${result.project.name} retomado.`;
    }

    if (result.reason === "active-project-unavailable") {
      const command = result.action === "pause" ? "/pause" : "/resume";
      return `ℹ️ Nenhum projeto ativo selecionado para ${command}.`;
    }

    const projectName = result.project?.name ?? "desconhecido";
    return `ℹ️ Nenhum runner em execução no projeto ativo ${projectName}.`;
  }

  private buildPlanSpecStatusReply(state: RunnerState): string {
    const session = state.planSpecSession;
    if (!session) {
      return PLAN_SPEC_STATUS_INACTIVE_REPLY;
    }

    const lines = [
      "🧭 Sessão /plan_spec ativa",
      `Fase: ${session.phase}`,
      `Projeto da sessão: ${session.activeProjectSnapshot.name}`,
      `Caminho do projeto da sessão: ${session.activeProjectSnapshot.path}`,
      `Chat da sessão: ${session.chatId}`,
      `Iniciada em: ${session.startedAt.toISOString()}`,
      `Última atividade: ${session.lastActivityAt.toISOString()}`,
      `Última atividade do Codex: ${session.lastCodexActivityAt?.toISOString() ?? "(ainda sem saída observável)"}`,
    ];

    if (session.waitingCodexSinceAt) {
      lines.push(`Aguardando Codex desde: ${session.waitingCodexSinceAt.toISOString()}`);
    }

    if (session.lastCodexStream) {
      lines.push(`Último stream do Codex: ${session.lastCodexStream}`);
    }

    if (session.lastCodexPreview) {
      lines.push(`Preview da última saída do Codex: ${session.lastCodexPreview}`);
    }

    return lines.join("\n");
  }

  private buildStartReply(): string {
    return START_REPLY_LINES.join("\n");
  }

  private isCommandMessage(
    message?: {
      text?: string;
      entities?: Array<{
        type: string;
        offset: number;
        length: number;
      }>;
    },
  ): boolean {
    const commandEntity = message?.entities?.find(
      (entity) => entity.type === BOT_COMMAND_ENTITY_TYPE && entity.offset === 0,
    );

    return Boolean(commandEntity);
  }

  private renderMetadataValue(value: string | null): string {
    if (!value) {
      return "(ausente)";
    }

    return value;
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
    const callbackUserId = this.resolveCallbackUserId(ctx.callbackQuery);
    const command = this.extractCommandTokenFromMessage(ctx.message) ?? undefined;

    this.logger.info("Update recebido do Telegram", {
      updateType: ctx.updateType ?? "unknown",
      chatId,
      ...(callbackUserId ? { userId: callbackUserId } : {}),
      ...(command ? { command } : {}),
      ...(messageText ? { messageText: this.limit(messageText.trim()) } : {}),
      ...(ctx.callbackQuery?.data ? { callbackData: this.limit(ctx.callbackQuery.data) } : {}),
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

  private buildRunSpecsTriageMilestoneMessage(event: RunSpecsTriageLifecycleEvent): string {
    const outcomeLabel = event.outcome === "success" ? "sucesso" : "falha";
    const lines = [
      "🧭 Marco da triagem /run_specs",
      `Spec: ${event.spec.fileName}`,
      `Caminho da spec: ${event.spec.path}`,
      `Resultado: ${outcomeLabel}`,
      `Fase final: ${event.finalStage}`,
      `Proxima acao: ${event.nextAction}`,
    ];

    if (event.details) {
      lines.push(`Detalhes: ${event.details}`);
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
      `Runners ativos (global): ${state.capacity.used}/${state.capacity.limit}`,
      `Sessão /plan_spec: ${state.planSpecSession ? "ativa" : "inativa"}`,
      `Sessão /codex_chat: ${state.codexChatSession ? "ativa" : "inativa"}`,
      `Última mensagem: ${state.lastMessage}`,
      `Atualizado em: ${state.updatedAt.toISOString()}`,
    ];

    if (state.activeSlots.length === 0) {
      lines.push("Slots ativos: nenhum");
    } else {
      lines.push("Slots ativos:");
      for (const [index, slot] of state.activeSlots.entries()) {
        const details = [
          `${index + 1}. ${slot.project.name} (${this.renderRunnerSlotCommand(slot.kind)})`,
          `fase: ${slot.phase}`,
          `pausado: ${slot.isPaused ? "sim" : "nao"}`,
          `ticket: ${slot.currentTicket ?? "nenhum"}`,
          `spec: ${slot.currentSpec ?? "nenhuma"}`,
        ];
        lines.push(details.join(" | "));
      }
    }

    if (state.planSpecSession) {
      lines.push(
        `Fase /plan_spec: ${state.planSpecSession.phase}`,
        `Projeto da sessão /plan_spec: ${state.planSpecSession.activeProjectSnapshot.name}`,
        `Início da sessão /plan_spec: ${state.planSpecSession.startedAt.toISOString()}`,
        `Última atividade /plan_spec: ${state.planSpecSession.lastActivityAt.toISOString()}`,
        `Última atividade Codex /plan_spec: ${state.planSpecSession.lastCodexActivityAt?.toISOString() ?? "(ainda sem saída observável)"}`,
      );
      if (state.planSpecSession.waitingCodexSinceAt) {
        lines.push(
          `Aguardando Codex /plan_spec desde: ${state.planSpecSession.waitingCodexSinceAt.toISOString()}`,
        );
      }
      if (state.planSpecSession.lastCodexStream) {
        lines.push(`Último stream Codex /plan_spec: ${state.planSpecSession.lastCodexStream}`);
      }
    }

    if (state.codexChatSession) {
      lines.push(
        `Fase /codex_chat: ${state.codexChatSession.phase}`,
        `Projeto da sessão /codex_chat: ${state.codexChatSession.activeProjectSnapshot.name}`,
        `Caminho do projeto da sessão /codex_chat: ${state.codexChatSession.activeProjectSnapshot.path}`,
        `Início da sessão /codex_chat: ${state.codexChatSession.startedAt.toISOString()}`,
        `Última atividade /codex_chat: ${state.codexChatSession.lastActivityAt.toISOString()}`,
        `Aguardando Codex /codex_chat: ${state.codexChatSession.phase === "waiting-codex" ? "sim" : "nao"}`,
        `Inatividade do operador /codex_chat: ${state.codexChatSession.userInactivitySinceAt ? "ativa" : "pausada"}`,
        `Última atividade Codex /codex_chat: ${state.codexChatSession.lastCodexActivityAt?.toISOString() ?? "(ainda sem saída observável)"}`,
      );
      if (state.codexChatSession.userInactivitySinceAt) {
        lines.push(
          `Inatividade do operador /codex_chat desde: ${state.codexChatSession.userInactivitySinceAt.toISOString()}`,
        );
      } else {
        lines.push("Inatividade do operador /codex_chat pausada durante processamento do Codex.");
      }
      if (state.codexChatSession.waitingCodexSinceAt) {
        lines.push(
          `Aguardando Codex /codex_chat desde: ${state.codexChatSession.waitingCodexSinceAt.toISOString()}`,
        );
      }
      if (state.codexChatSession.lastCodexStream) {
        lines.push(`Último stream Codex /codex_chat: ${state.codexChatSession.lastCodexStream}`);
      }
      if (state.codexChatSession.lastCodexPreview) {
        lines.push(
          `Preview da última saída Codex /codex_chat: ${state.codexChatSession.lastCodexPreview}`,
        );
      }
    } else if (state.lastCodexChatSessionClosure) {
      const closure = state.lastCodexChatSessionClosure;
      lines.push(
        `Último encerramento /codex_chat: ${this.renderCodexChatClosureReason(closure.reason)} em ${closure.closedAt.toISOString()}`,
        `Fase no encerramento /codex_chat: ${closure.phase ?? "(desconhecida)"}`,
        `Projeto no encerramento /codex_chat: ${closure.activeProjectSnapshot.name}`,
        `Caminho no encerramento /codex_chat: ${closure.activeProjectSnapshot.path}`,
      );
      if (closure.triggeringCommand) {
        lines.push(`Comando que encerrou /codex_chat: /${closure.triggeringCommand}`);
      }
    }

    if (!state.lastNotifiedEvent) {
      lines.push("Último evento notificado: nenhum");
    } else {
      const { summary, delivery } = state.lastNotifiedEvent;
      lines.push(
        `Último evento notificado: ${summary.ticket} (${summary.status})`,
        `Projeto notificado: ${summary.activeProjectName}`,
        `Caminho notificado: ${summary.activeProjectPath}`,
        `Fase notificada: ${summary.finalStage}`,
        `Notificado em: ${delivery.deliveredAtUtc}`,
        `Chat de notificação: ${delivery.destinationChatId}`,
      );

      if (typeof delivery.attempts === "number") {
        lines.push(
          `Tentativas até entrega: ${delivery.attempts}/${delivery.maxAttempts ?? delivery.attempts}`,
        );
      }

      if (summary.status === "success") {
        lines.push(
          `ExecPlan notificado: ${summary.execPlanPath}`,
          `Commit/Push notificado: ${summary.commitPushId}`,
        );
      } else {
        lines.push(`Erro notificado: ${summary.errorMessage}`);
      }
    }

    if (!state.lastNotificationFailure) {
      lines.push("Última falha de notificação: nenhuma");
      return lines.join("\n");
    }

    const { summary, failure } = state.lastNotificationFailure;
    lines.push(
      `Última falha de notificação: ${summary.ticket} (${summary.status})`,
      `Projeto com falha de notificação: ${summary.activeProjectName}`,
      `Caminho com falha de notificação: ${summary.activeProjectPath}`,
      `Fase com falha de notificação: ${summary.finalStage}`,
      `Falha registrada em: ${failure.failedAtUtc}`,
      `Tentativas até falha definitiva: ${failure.attempts}/${failure.maxAttempts}`,
      `Classe do erro de notificação: ${failure.errorClass}`,
      `Erro de notificação: ${failure.errorMessage}`,
      `Retentável: ${failure.retryable ? "sim" : "nao"}`,
    );
    if (failure.destinationChatId) {
      lines.push(`Chat de notificação com falha: ${failure.destinationChatId}`);
    }
    if (failure.errorCode) {
      lines.push(`Código do erro de notificação: ${failure.errorCode}`);
    }

    return lines.join("\n");
  }

  private renderCodexChatClosureReason(
    reason: NonNullable<RunnerState["lastCodexChatSessionClosure"]>["reason"],
  ): string {
    if (reason === "command-handoff") {
      return "troca de comando";
    }

    if (reason === "unexpected-close") {
      return "encerramento inesperado";
    }

    if (reason === "failure") {
      return "falha";
    }

    if (reason === "shutdown") {
      return "desligamento";
    }

    return reason;
  }

  private renderRunnerSlotCommand(kind: RunnerSlotKind): string {
    if (kind === "run-all") {
      return "/run_all";
    }

    if (kind === "run-specs") {
      return "/run_specs";
    }

    if (kind === "run-ticket") {
      return "/run_ticket";
    }

    if (kind === "codex-chat") {
      return "/codex_chat";
    }

    return "/plan_spec";
  }
}
