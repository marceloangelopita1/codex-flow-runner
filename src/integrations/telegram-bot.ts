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
  DiscoverSpecSessionCancelResult,
  DiscoverSpecSessionInputResult,
  DiscoverSpecSessionStartResult,
  PlanSpecCallbackIgnoredReason,
  PlanSpecCallbackResult,
  PlanSpecSessionCancelResult,
  PlanSpecSessionInputResult,
  PlanSpecSessionStartResult,
  TargetPrepareRequestResult,
  RunSpecsTriageLifecycleEvent,
  RunnerProjectControlResult,
  RunAllRequestResult,
  RunSpecsFromValidationRequestResult,
  RunSelectedTicketRequestResult,
  RunSpecsRequestResult,
} from "../core/runner.js";
import { ProjectRef } from "../types/project.js";
import {
  CodexModelSelectionResult,
  CodexModelSelectionSnapshot,
  CodexReasoningSelectionResult,
  CodexReasoningSelectionSnapshot,
  CodexResolvedProjectPreferences,
  CodexSpeed,
  CodexSpeedSelectionResult,
  CodexSpeedSelectionSnapshot,
} from "../types/codex-preferences.js";
import { RunnerSlotKind, RunnerState } from "../types/state.js";
import {
  TicketFinalSummary,
  TicketNotificationDispatchError,
  TicketNotificationDelivery,
} from "../types/ticket-final-summary.js";
import {
  FlowNotificationDelivery,
  FlowNotificationDispatchError,
  FlowTimingSnapshot,
  RunAllFlowSummary,
  RunSpecsFlowSummary,
  RunnerFlowSummary,
} from "../types/flow-timing.js";
import {
  CALLBACK_CHAT_DELIVERY_POLICY,
  DeliverTelegramTextMessageInput,
  INTERACTIVE_TELEGRAM_DELIVERY_POLICY,
  isTelegramMessageDeliveryDispatchError,
  RUN_FLOW_SUMMARY_DELIVERY_POLICY,
  RUN_SPECS_TRIAGE_MILESTONE_DELIVERY_POLICY,
  TelegramDeliveryLogMessages,
  TelegramDeliveryResult,
  TelegramDeliveryService,
  TICKET_FINAL_SUMMARY_DELIVERY_POLICY,
  TICKET_OPEN_CONTENT_DELIVERY_POLICY,
} from "./telegram-delivery.js";
import {
  PlanSpecFinalActionId,
  PlanSpecFinalBlock,
  PlanSpecQuestionBlock,
  sanitizePlanSpecRawOutput,
} from "./plan-spec-parser.js";
import { EligibleSpecRef, SpecEligibilityResult } from "./spec-discovery.js";

interface BotControls {
  targetPrepare: (
    projectName: string,
  ) => Promise<TargetPrepareRequestResult> | TargetPrepareRequestResult;
  runAll: () => Promise<RunAllRequestResult> | RunAllRequestResult;
  runSpecs: (specFileName: string) => Promise<RunSpecsRequestResult> | RunSpecsRequestResult;
  runSpecsFromValidation: (
    specFileName: string,
  ) => Promise<RunSpecsFromValidationRequestResult> | RunSpecsFromValidationRequestResult;
  runSelectedTicket: (
    ticketFileName: string,
  ) => Promise<RunSelectedTicketRequestResult> | RunSelectedTicketRequestResult;
  startDiscoverSpecSession: (
    chatId: string,
  ) => Promise<DiscoverSpecSessionStartResult> | DiscoverSpecSessionStartResult;
  submitDiscoverSpecInput: (
    chatId: string,
    input: string,
  ) => Promise<DiscoverSpecSessionInputResult> | DiscoverSpecSessionInputResult;
  cancelDiscoverSpecSession: (
    chatId: string,
  ) => Promise<DiscoverSpecSessionCancelResult> | DiscoverSpecSessionCancelResult;
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
  listCodexModels: () => Promise<CodexModelSelectionSnapshot> | CodexModelSelectionSnapshot;
  selectCodexModel: (
    model: string,
  ) => Promise<CodexModelSelectionResult> | CodexModelSelectionResult;
  listCodexReasoning: () =>
    Promise<CodexReasoningSelectionSnapshot> | CodexReasoningSelectionSnapshot;
  selectCodexReasoning: (
    effort: string,
  ) => Promise<CodexReasoningSelectionResult> | CodexReasoningSelectionResult;
  listCodexSpeed: () => Promise<CodexSpeedSelectionSnapshot> | CodexSpeedSelectionSnapshot;
  selectCodexSpeed: (
    speed: string,
  ) => Promise<CodexSpeedSelectionResult> | CodexSpeedSelectionResult;
  resolveCodexProjectPreferences: (
    project: ProjectRef,
  ) => Promise<CodexResolvedProjectPreferences> | CodexResolvedProjectPreferences;
  onPlanSpecQuestionOptionSelected?: (
    chatId: string,
    optionValue: string,
  ) => Promise<PlanSpecCallbackResult> | PlanSpecCallbackResult;
  onPlanSpecFinalActionSelected?: (
    chatId: string,
    action: PlanSpecFinalActionId,
  ) => Promise<PlanSpecCallbackResult> | PlanSpecCallbackResult;
  onDiscoverSpecQuestionOptionSelected?: (
    chatId: string,
    optionValue: string,
  ) => Promise<PlanSpecCallbackResult> | PlanSpecCallbackResult;
  onDiscoverSpecFinalActionSelected?: (
    chatId: string,
    action: PlanSpecFinalActionId,
  ) => Promise<PlanSpecCallbackResult> | PlanSpecCallbackResult;
}

type ProjectSelectionControlResult =
  | ProjectSelectionResult
  | {
      status: "blocked-discover-spec";
    }
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

type ParsedModelsCallbackData =
  | {
      status: "page";
      contextId: string;
      page: number;
    }
  | {
      status: "select";
      contextId: string;
      model: string;
    }
  | {
      status: "invalid";
    };

type ParsedReasoningCallbackData =
  | {
      status: "page";
      contextId: string;
      page: number;
    }
  | {
      status: "select";
      contextId: string;
      effort: string;
    }
  | {
      status: "invalid";
    };

type ParsedSpeedCallbackData =
  | {
      status: "page";
      contextId: string;
      page: number;
    }
  | {
      status: "select";
      contextId: string;
      speed: string;
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

interface EditorialSection {
  title: string;
  lines: string[];
}

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

interface ModelsCallbackContextState {
  chatId: string;
  activeProjectSnapshot: ProjectRef;
}

interface ReasoningCallbackContextState {
  chatId: string;
  activeProjectSnapshot: ProjectRef;
  model: string;
}

interface SpeedCallbackContextState {
  chatId: string;
  activeProjectSnapshot: ProjectRef;
  model: string;
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

type InteractivePlanningFlow = "plan-spec" | "discover-spec";

interface PlanSpecQuestionCallbackContextState {
  flow: InteractivePlanningFlow;
  chatId: string;
  sessionId: number | null;
  messageId: number | null;
  consumed: boolean;
  processing: boolean;
  prompt: string;
  options: PlanSpecQuestionOptionState[];
}

interface PlanSpecFinalCallbackContextState {
  flow: InteractivePlanningFlow;
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
  };
  on?: {
    method?: unknown;
  };
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

type CallbackAuditFlow = "specs" | "tickets-open" | "plan-spec" | "discover-spec" | "run-ticket";
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
const TARGET_PREPARE_USAGE_REPLY = "ℹ️ Uso: /target_prepare <nome-do-projeto>.";
const TARGET_PREPARE_FAILED_REPLY =
  "❌ Falha ao executar /target_prepare. Verifique logs do runner e tente novamente.";
const RUN_SPECS_USAGE_REPLY = "ℹ️ Uso: /run_specs <arquivo-da-spec.md>.";
const RUN_SPECS_FROM_VALIDATION_USAGE_REPLY =
  "ℹ️ Uso: /run_specs_from_validation <arquivo-da-spec.md>.";
const RUN_SPECS_INVALID_SPEC_REPLY_PREFIX = "❌ Argumento inválido para /run_specs:";
const RUN_SPECS_NOT_FOUND_REPLY_PREFIX = "❌ Spec não encontrada para /run_specs:";
const RUN_SPECS_NOT_ELIGIBLE_REPLY_PREFIX = "❌ Spec não elegível para /run_specs:";
const RUN_SPECS_VALIDATION_CRITERIA_REPLY =
  "Critério de elegibilidade: Status: approved e Spec treatment: pending.";
const RUN_SPECS_VALIDATION_FAILED_REPLY =
  "❌ Falha ao validar spec para /run_specs. Verifique logs do runner e tente novamente.";
const RUN_SPECS_AUTH_REQUIRED_REPLY_PREFIX = "❌ ";
const RUN_SPECS_FROM_VALIDATION_INVALID_SPEC_REPLY_PREFIX =
  "❌ Argumento inválido para /run_specs_from_validation:";
const RUN_SPECS_FROM_VALIDATION_NOT_FOUND_REPLY_PREFIX =
  "❌ Spec não encontrada para /run_specs_from_validation:";
const RUN_SPECS_FROM_VALIDATION_NOT_ELIGIBLE_REPLY_PREFIX =
  "❌ Spec não elegível para /run_specs_from_validation:";
const RUN_SPECS_FROM_VALIDATION_VALIDATION_FAILED_REPLY =
  "❌ Falha ao validar spec para /run_specs_from_validation. Verifique logs do runner e tente novamente.";
const RUN_SPECS_FROM_VALIDATION_AUTH_REQUIRED_REPLY_PREFIX = "❌ ";
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
const MODELS_PAGE_SIZE = 5;
const MODELS_CALLBACK_PREFIX = "models:";
const MODELS_CALLBACK_PAGE_PREFIX = "models:page:";
const MODELS_CALLBACK_SELECT_PREFIX = "models:select:";
const MODELS_EMPTY_REPLY =
  "ℹ️ Nenhum modelo selecionavel foi encontrado no catalogo local do Codex.";
const MODELS_LIST_FAILED_REPLY =
  "❌ Falha ao listar modelos do Codex. Verifique logs do runner e tente novamente.";
const MODELS_CALLBACK_INVALID_REPLY = "Ação de modelo inválida.";
const MODELS_CALLBACK_STALE_REPLY = "A lista de modelos expirou. Use /models para atualizar.";
const MODELS_CALLBACK_SELECTION_FAILED_REPLY =
  "❌ Falha ao atualizar o modelo do Codex. Use /models para tentar novamente.";
const REASONING_PAGE_SIZE = 5;
const REASONING_CALLBACK_PREFIX = "reasoning:";
const REASONING_CALLBACK_PAGE_PREFIX = "reasoning:page:";
const REASONING_CALLBACK_SELECT_PREFIX = "reasoning:select:";
const REASONING_EMPTY_REPLY =
  "ℹ️ Nenhum nivel de reasoning suportado foi encontrado para o modelo atual.";
const REASONING_LIST_FAILED_REPLY =
  "❌ Falha ao listar levels de reasoning do Codex. Verifique logs do runner e tente novamente.";
const REASONING_CALLBACK_INVALID_REPLY = "Ação de reasoning inválida.";
const REASONING_CALLBACK_STALE_REPLY =
  "A lista de reasoning expirou. Use /reasoning para atualizar.";
const REASONING_CALLBACK_SELECTION_FAILED_REPLY =
  "❌ Falha ao atualizar o reasoning do Codex. Use /reasoning para tentar novamente.";
const SPEED_PAGE_SIZE = 5;
const SPEED_CALLBACK_PREFIX = "speed:";
const SPEED_CALLBACK_PAGE_PREFIX = "speed:page:";
const SPEED_CALLBACK_SELECT_PREFIX = "speed:select:";
const SPEED_EMPTY_REPLY =
  "ℹ️ Nenhuma opcao de velocidade foi encontrada para o projeto atual.";
const SPEED_LIST_FAILED_REPLY =
  "❌ Falha ao listar velocidades do Codex. Verifique logs do runner e tente novamente.";
const SPEED_CALLBACK_INVALID_REPLY = "Ação de velocidade inválida.";
const SPEED_CALLBACK_STALE_REPLY =
  "A lista de velocidades expirou. Use /speed para atualizar.";
const SPEED_CALLBACK_SELECTION_FAILED_REPLY =
  "❌ Falha ao atualizar a velocidade do Codex. Use /speed para tentar novamente.";
const PLAN_SPEC_CALLBACK_PREFIX = "plan-spec:";
const PLAN_SPEC_CALLBACK_QUESTION_PREFIX = "plan-spec:question:";
const PLAN_SPEC_CALLBACK_FINAL_PREFIX = "plan-spec:final:";
const CODEX_CHAT_CALLBACK_PREFIX = "codex-chat:";
const CODEX_CHAT_CALLBACK_CLOSE_PREFIX = "codex-chat:close:";
const DISCOVER_SPEC_FLOW_FAILED_REPLY_PREFIX = "❌ Falha na sessão interativa /discover_spec:";
const DISCOVER_SPEC_FLOW_FAILED_RETRY_SUFFIX = "Use /discover_spec para tentar novamente.";
const DISCOVER_SPEC_RAW_OUTPUT_REPLY_PREFIX = "🧩 Saída textual do /discover_spec:";
const DISCOVER_SPEC_STATUS_INACTIVE_REPLY = "ℹ️ Nenhuma sessão /discover_spec ativa no momento.";
const DISCOVER_SPEC_INPUT_BRIEF_ACCEPTED_REPLY =
  "✅ Brief inicial recebido na sessão /discover_spec. Aguarde a resposta do Codex.";
const DISCOVER_SPEC_INPUT_ACCEPTED_REPLY = "✅ Mensagem enviada para a sessão /discover_spec.";
const DISCOVER_SPEC_CALLBACK_INVALID_REPLY = "Ação da descoberta inválida.";
const DISCOVER_SPEC_CALLBACK_INACTIVE_REPLY = "Sessão /discover_spec inativa.";
const DISCOVER_SPEC_CALLBACK_STALE_REPLY =
  "A etapa da descoberta mudou. Aguarde a próxima mensagem do /discover_spec.";
const DISCOVER_SPEC_CALLBACK_ALREADY_PROCESSED_REPLY =
  "Seleção já processada. Aguarde a próxima etapa do /discover_spec.";
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
const SELECT_PROJECT_BLOCKED_DISCOVER_SPEC_REPLY =
  "❌ Não é possível trocar o projeto ativo durante uma sessão /discover_spec ativa.";
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
const MAX_TICKET_DIAGNOSTIC_PREVIEW_LENGTH = 900;
const TELEGRAM_HANDLER_TIMEOUT_MS = 30 * 60 * 1000;
const TELEGRAM_LONG_POLLING_CONFLICT_CODE = 409;
const TELEGRAM_GET_UPDATES_METHOD = "getUpdates";
const TELEGRAM_LONG_POLLING_CONFLICT_SNIPPET = "other getupdates request";
const TELEGRAM_BOT_NOT_RUNNING_MESSAGE = "Bot is not running!";
const TICKET_TIMING_STAGE_ORDER = ["plan", "implement", "close-and-version"] as const;
const RUN_SPECS_TRIAGE_TIMING_STAGE_ORDER = [
  "spec-triage",
  "spec-ticket-validation",
  "spec-ticket-derivation-retrospective",
  "spec-close-and-version",
] as const;
const RUN_ALL_TIMING_STAGE_ORDER = ["select-ticket", "plan", "implement", "close-and-version"] as const;
const RUN_SPECS_FLOW_TIMING_STAGE_ORDER = [
  "spec-triage",
  "spec-ticket-validation",
  "spec-ticket-derivation-retrospective",
  "spec-close-and-version",
  "run-all",
  "spec-audit",
  "spec-workflow-retrospective",
] as const;

const START_REPLY_LINES = [
  "🤖 Codex Flow Runner",
  "Automação sequencial de tickets via Codex CLI com controle por Telegram.",
  "",
  "Comandos aceitos:",
  "/start - mostra esta ajuda",
  "/target_prepare <projeto> - prepara um diretorio irmao Git para o workflow completo sem trocar o projeto ativo",
  "/run_all - inicia uma rodada sequencial de tickets abertos (alias legado: /run-all)",
  "/specs - lista specs elegíveis para triagem no projeto ativo",
  "/tickets_open - lista tickets abertos para leitura e execução unitária",
  "/run_specs <arquivo> - executa triagem da spec e, em sucesso, encadeia rodada de tickets",
  "/run_specs_from_validation <arquivo> - retoma o fluxo da spec em spec-ticket-validation usando o backlog aberto atual",
  "/codex_chat - inicia conversa livre com Codex (alias legado: /codex-chat)",
  "/discover_spec - inicia sessão stateful de descoberta profunda de spec",
  "/discover_spec_status - mostra status detalhado da sessão /discover_spec",
  "/discover_spec_cancel - cancela a sessão /discover_spec ativa",
  "/plan_spec - inicia sessão interativa de planejamento de spec",
  "/plan_spec_status - mostra status detalhado da sessão /plan_spec",
  "/plan_spec_cancel - cancela a sessão /plan_spec ativa",
  "/status - mostra o estado atual do runner",
  "/pause - pausa após a etapa corrente",
  "/resume - retoma execução",
  "/projects - lista projetos elegíveis com paginação",
  "/models - lista os modelos do Codex disponíveis para o projeto ativo",
  "/reasoning - lista os niveis de reasoning suportados pelo modelo atual",
  "/speed - escolhe a velocidade do Codex para o projeto ativo",
  "/select_project <nome> - seleciona projeto ativo por nome (alias legado: /select-project)",
];

export class TelegramController {
  private readonly bot: Telegraf;
  private readonly telegramDelivery: TelegramDeliveryService;
  private notificationChatId: string | null;
  private specsCallbackContextCounter = 0;
  private readonly specsCallbackContexts = new Map<string, SpecsCallbackContextState>();
  private ticketsOpenCallbackContextCounter = 0;
  private readonly ticketsOpenCallbackContexts = new Map<string, TicketsOpenCallbackContextState>();
  private modelsCallbackContextCounter = 0;
  private readonly modelsCallbackContexts = new Map<string, ModelsCallbackContextState>();
  private reasoningCallbackContextCounter = 0;
  private readonly reasoningCallbackContexts = new Map<string, ReasoningCallbackContextState>();
  private speedCallbackContextCounter = 0;
  private readonly speedCallbackContexts = new Map<string, SpeedCallbackContextState>();
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
    this.telegramDelivery = new TelegramDeliveryService({
      logger: this.logger,
      sendMessage: (chatId: string, text: string, extra?: unknown) =>
        this.bot.telegram.sendMessage(
          chatId,
          text,
          extra as Parameters<typeof this.bot.telegram.sendMessage>[2],
        ),
      wait: (delayMs: number) => this.waitForTicketFinalSummaryRetry(delayMs),
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
    try {
      const delivery = await this.telegramDelivery.deliverTextMessage({
        destinationChatId,
        text: payload,
        policy: TICKET_FINAL_SUMMARY_DELIVERY_POLICY,
        logicalMessageType: "ticket-final-summary",
        logMessages: {
          success: "Resumo final de ticket enviado no Telegram",
          transientFailure: "Falha transitoria ao enviar resumo final de ticket no Telegram",
          definitiveFailure: "Falha definitiva ao enviar resumo final de ticket no Telegram",
        },
        context: {
          ticket: summary.ticket,
          status: summary.status,
          ...(summary.status === "failure"
            ? {
                telegramMessagePreview: this.limit(payload),
                ...(summary.codexStdoutPreview
                  ? {
                      codexAssistantResponsePreview: this.limitDiagnosticPreview(
                        summary.codexStdoutPreview,
                      ),
                    }
                  : {}),
                ...(summary.codexStderrPreview
                  ? {
                      codexCliTranscriptPreview: this.limitDiagnosticPreview(
                        summary.codexStderrPreview,
                      ),
                    }
                  : {}),
              }
            : {}),
        },
      });

      return {
        channel: "telegram",
        destinationChatId: delivery.destinationChatId,
        deliveredAtUtc: delivery.deliveredAtUtc,
        attempts: delivery.attempts,
        maxAttempts: delivery.maxAttempts,
      };
    } catch (error) {
      if (isTelegramMessageDeliveryDispatchError(error)) {
        throw new TicketNotificationDispatchError(error.message, {
          channel: "telegram",
          destinationChatId: error.failure.destinationChatId,
          failedAtUtc: error.failure.failedAtUtc,
          attempts: error.failure.attempts,
          maxAttempts: error.failure.maxAttempts,
          errorMessage: error.failure.errorMessage,
          ...(error.failure.errorCode ? { errorCode: error.failure.errorCode } : {}),
          errorClass: error.failure.errorClass,
          retryable: error.failure.retryable,
        }, { cause: error });
      }

      throw error;
    }
  }

  async sendDiscoverSpecOutput(chatId: string, rawOutput: string): Promise<void> {
    await this.deliverInteractiveChatMessage({
      chatId,
      text: this.buildDiscoverSpecRawOutputReply(rawOutput),
      logicalMessageType: "discover-spec-raw-output",
      logMessages: {
        success: "Saida bruta de /discover_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar saida bruta de /discover_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar saida bruta de /discover_spec no Telegram",
      },
      context: {
        flow: "discover-spec",
      },
    });
  }

  async sendDiscoverSpecFailure(chatId: string, details?: string): Promise<void> {
    this.planSpecQuestionCallbackContexts.delete(chatId);
    this.planSpecFinalCallbackContexts.delete(chatId);
    await this.deliverInteractiveChatMessage({
      chatId,
      text: this.buildDiscoverSpecInteractiveFailureReply(details),
      logicalMessageType: "discover-spec-failure",
      logMessages: {
        success: "Falha interativa de /discover_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar falha interativa de /discover_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar falha interativa de /discover_spec no Telegram",
      },
      context: {
        flow: "discover-spec",
      },
    });
  }

  async sendDiscoverSpecMessage(chatId: string, message: string): Promise<void> {
    await this.deliverInteractiveChatMessage({
      chatId,
      text: message,
      logicalMessageType: "discover-spec-message",
      logMessages: {
        success: "Mensagem de /discover_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar mensagem de /discover_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar mensagem de /discover_spec no Telegram",
      },
      context: {
        flow: "discover-spec",
      },
    });
  }

  async sendDiscoverSpecQuestion(chatId: string, question: PlanSpecQuestionBlock): Promise<void> {
    const rendered = this.buildInteractivePlanningQuestionReply("discover-spec", question);
    const state = this.getState();
    const delivery = await this.deliverInteractiveChatMessage({
      chatId,
      text: rendered.text,
      extra: rendered.extra,
      logicalMessageType: "discover-spec-question",
      logMessages: {
        success: "Pergunta de /discover_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar pergunta de /discover_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar pergunta de /discover_spec no Telegram",
      },
      context: {
        flow: "discover-spec",
        sessionId: state.discoverSpecSession?.sessionId ?? null,
      },
    });
    this.registerPlanSpecQuestionCallbackContext(
      "discover-spec",
      chatId,
      question,
      delivery.primaryMessageId,
      state.discoverSpecSession?.sessionId ?? null,
    );
  }

  async sendDiscoverSpecFinalization(chatId: string, finalBlock: PlanSpecFinalBlock): Promise<void> {
    const rendered = this.buildInteractivePlanningFinalReply("discover-spec", finalBlock);
    const state = this.getState();
    const delivery = await this.deliverInteractiveChatMessage({
      chatId,
      text: rendered.text,
      extra: rendered.extra,
      logicalMessageType: "discover-spec-finalization",
      logMessages: {
        success: "Finalizacao de /discover_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar finalizacao de /discover_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar finalizacao de /discover_spec no Telegram",
      },
      context: {
        flow: "discover-spec",
        sessionId: state.discoverSpecSession?.sessionId ?? null,
      },
    });
    this.registerPlanSpecFinalCallbackContext(
      "discover-spec",
      chatId,
      finalBlock,
      delivery.primaryMessageId,
      state.discoverSpecSession?.sessionId ?? null,
    );
  }

  async sendPlanSpecQuestion(chatId: string, question: PlanSpecQuestionBlock): Promise<void> {
    const rendered = this.buildInteractivePlanningQuestionReply("plan-spec", question);
    const state = this.getState();
    const delivery = await this.deliverInteractiveChatMessage({
      chatId,
      text: rendered.text,
      extra: rendered.extra,
      logicalMessageType: "plan-spec-question",
      logMessages: {
        success: "Pergunta de /plan_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar pergunta de /plan_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar pergunta de /plan_spec no Telegram",
      },
      context: {
        flow: "plan-spec",
        sessionId: state.planSpecSession?.sessionId ?? null,
      },
    });
    this.registerPlanSpecQuestionCallbackContext(
      "plan-spec",
      chatId,
      question,
      delivery.primaryMessageId,
      state.planSpecSession?.sessionId ?? null,
    );
  }

  async sendPlanSpecFinalization(chatId: string, finalBlock: PlanSpecFinalBlock): Promise<void> {
    const rendered = this.buildInteractivePlanningFinalReply("plan-spec", finalBlock);
    const state = this.getState();
    const delivery = await this.deliverInteractiveChatMessage({
      chatId,
      text: rendered.text,
      extra: rendered.extra,
      logicalMessageType: "plan-spec-finalization",
      logMessages: {
        success: "Finalizacao de /plan_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar finalizacao de /plan_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar finalizacao de /plan_spec no Telegram",
      },
      context: {
        flow: "plan-spec",
        sessionId: state.planSpecSession?.sessionId ?? null,
      },
    });
    this.registerPlanSpecFinalCallbackContext(
      "plan-spec",
      chatId,
      finalBlock,
      delivery.primaryMessageId,
      state.planSpecSession?.sessionId ?? null,
    );
  }

  async sendPlanSpecRawOutput(chatId: string, rawOutput: string): Promise<void> {
    await this.deliverInteractiveChatMessage({
      chatId,
      text: this.buildPlanSpecRawOutputReply(rawOutput),
      logicalMessageType: "plan-spec-raw-output",
      logMessages: {
        success: "Saida bruta de /plan_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar saida bruta de /plan_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar saida bruta de /plan_spec no Telegram",
      },
      context: {
        flow: "plan-spec",
      },
    });
  }

  async sendPlanSpecFailure(chatId: string, details?: string): Promise<void> {
    this.planSpecQuestionCallbackContexts.delete(chatId);
    this.planSpecFinalCallbackContexts.delete(chatId);
    await this.deliverInteractiveChatMessage({
      chatId,
      text: this.buildPlanSpecInteractiveFailureReply(details),
      logicalMessageType: "plan-spec-failure",
      logMessages: {
        success: "Falha interativa de /plan_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar falha interativa de /plan_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar falha interativa de /plan_spec no Telegram",
      },
      context: {
        flow: "plan-spec",
      },
    });
  }

  async sendPlanSpecMessage(chatId: string, message: string): Promise<void> {
    await this.deliverInteractiveChatMessage({
      chatId,
      text: message,
      logicalMessageType: "plan-spec-message",
      logMessages: {
        success: "Mensagem de /plan_spec enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar mensagem de /plan_spec no Telegram",
        definitiveFailure: "Falha definitiva ao enviar mensagem de /plan_spec no Telegram",
      },
      context: {
        flow: "plan-spec",
      },
    });
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

    await this.telegramDelivery.deliverTextMessage({
      destinationChatId: this.notificationChatId,
      text: this.buildRunSpecsTriageMilestoneMessage(event),
      policy: RUN_SPECS_TRIAGE_MILESTONE_DELIVERY_POLICY,
      logicalMessageType: "run-specs-triage-milestone",
      logMessages: {
        success: "Milestone de triagem de /run_specs enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar milestone de triagem de /run_specs no Telegram",
        definitiveFailure: "Falha definitiva ao enviar milestone de triagem de /run_specs no Telegram",
      },
      context: {
        specFileName: event.spec.fileName,
        specPath: event.spec.path,
        sourceCommand: event.sourceCommand,
        entryPoint: event.entryPoint,
        outcome: event.outcome,
        finalStage: event.finalStage,
        nextAction: this.limit(event.nextAction),
        ...(event.details ? { details: this.limit(event.details) } : {}),
      },
    });
  }

  async sendRunFlowSummary(summary: RunnerFlowSummary): Promise<FlowNotificationDelivery | null> {
    if (!this.notificationChatId) {
      this.logger.warn("Resumo final de fluxo nao enviado: chat de notificacao indefinido", {
        flow: summary.flow,
        outcome: summary.outcome,
        finalStage: summary.finalStage,
      });
      return null;
    }

    const destinationChatId = this.notificationChatId;
    const payload = this.buildRunFlowSummaryMessage(summary);
    const flowContext = {
      flow: summary.flow,
      outcome: summary.outcome,
      finalStage: summary.finalStage,
      completionReason: summary.completionReason,
      totalDurationMs: summary.timing.totalDurationMs,
      activeProjectName: summary.activeProjectName,
      activeProjectPath: summary.activeProjectPath,
      ...(summary.flow === "run-all"
        ? {
            processedTicketsCount: summary.processedTicketsCount,
          }
        : {
            specFileName: summary.spec.fileName,
            sourceCommand: summary.sourceCommand,
            entryPoint: summary.entryPoint,
          }),
      ...(summary.codexPreferences
        ? {
            model: summary.codexPreferences.model,
            reasoningEffort: summary.codexPreferences.reasoningEffort,
            speed: summary.codexPreferences.speed,
          }
        : {}),
    };
    try {
      const delivery = await this.telegramDelivery.deliverTextMessage({
        destinationChatId,
        text: payload,
        policy: RUN_FLOW_SUMMARY_DELIVERY_POLICY,
        logicalMessageType: "run-flow-summary",
        logMessages: {
          success: "Resumo final de fluxo enviado no Telegram",
          transientFailure: "Falha transitoria ao enviar resumo final de fluxo no Telegram",
          definitiveFailure: "Falha definitiva ao enviar resumo final de fluxo no Telegram",
        },
        context: flowContext,
      });

      return {
        channel: "telegram",
        destinationChatId: delivery.destinationChatId,
        deliveredAtUtc: delivery.deliveredAtUtc,
        attempts: delivery.attempts,
        maxAttempts: delivery.maxAttempts,
        chunkCount: delivery.chunkCount,
      };
    } catch (error) {
      if (isTelegramMessageDeliveryDispatchError(error)) {
        throw new FlowNotificationDispatchError(error.message, {
          channel: "telegram",
          destinationChatId: error.failure.destinationChatId,
          failedAtUtc: error.failure.failedAtUtc,
          attempts: error.failure.attempts,
          maxAttempts: error.failure.maxAttempts,
          errorMessage: error.failure.errorMessage,
          ...(error.failure.errorCode ? { errorCode: error.failure.errorCode } : {}),
          errorClass: error.failure.errorClass,
          retryable: error.failure.retryable,
          ...(error.failure.failedChunkIndex
            ? { failedChunkIndex: error.failure.failedChunkIndex }
            : {}),
          chunkCount: error.failure.chunkCount,
        }, { cause: error });
      }

      throw error;
    }
  }

  private waitForTicketFinalSummaryRetry(delayMs: number): Promise<void> {
    if (delayMs <= 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  async sendCodexChatOutput(chatId: string, rawOutput: string): Promise<void> {
    const state = this.getState();
    const session = state.codexChatSession;
    const sessionId = session && session.chatId === chatId ? (session.sessionId ?? null) : null;
    const rendered = this.buildCodexChatOutputReply(rawOutput, sessionId);
    await this.deliverInteractiveChatMessage({
      chatId,
      text: rendered.text,
      extra: rendered.extra,
      logicalMessageType: "codex-chat-output",
      logMessages: {
        success: "Saida de /codex_chat enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar saida de /codex_chat no Telegram",
        definitiveFailure: "Falha definitiva ao enviar saida de /codex_chat no Telegram",
      },
      context: {
        flow: "codex-chat",
        sessionId,
      },
    });
  }

  async sendCodexChatFailure(chatId: string, details?: string): Promise<void> {
    await this.deliverInteractiveChatMessage({
      chatId,
      text: this.buildCodexChatInteractiveFailureReply(details),
      logicalMessageType: "codex-chat-failure",
      logMessages: {
        success: "Falha interativa de /codex_chat enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar falha interativa de /codex_chat no Telegram",
        definitiveFailure: "Falha definitiva ao enviar falha interativa de /codex_chat no Telegram",
      },
      context: {
        flow: "codex-chat",
      },
    });
  }

  async sendCodexChatMessage(chatId: string, message: string): Promise<void> {
    await this.deliverInteractiveChatMessage({
      chatId,
      text: message,
      logicalMessageType: "codex-chat-message",
      logMessages: {
        success: "Mensagem de /codex_chat enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar mensagem de /codex_chat no Telegram",
        definitiveFailure: "Falha definitiva ao enviar mensagem de /codex_chat no Telegram",
      },
      context: {
        flow: "codex-chat",
      },
    });
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

    this.bot.command("target_prepare", async (ctx) => {
      await this.handleTargetPrepareCommand(ctx as unknown as CommandContext);
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

    this.bot.command("run_specs_from_validation", async (ctx) => {
      await this.handleRunSpecsFromValidationCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("codex_chat", async (ctx) => {
      await this.handleCodexChatCommand(ctx as unknown as CommandContext, "codex_chat");
    });

    this.bot.hears(CODEX_CHAT_LEGACY_PATTERN, async (ctx) => {
      await this.handleCodexChatCommand(ctx as unknown as CommandContext, "codex-chat");
    });

    this.bot.command("discover_spec", async (ctx) => {
      await this.handleDiscoverSpecCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("discover_spec_status", async (ctx) => {
      await this.handleDiscoverSpecStatusCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("discover_spec_cancel", async (ctx) => {
      await this.handleDiscoverSpecCancelCommand(ctx as unknown as CommandContext);
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
      await this.handleStatusCommand(ctx as unknown as CommandContext);
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

    this.bot.command("models", async (ctx) => {
      await this.handleModelsCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("reasoning", async (ctx) => {
      await this.handleReasoningCommand(ctx as unknown as CommandContext);
    });

    this.bot.command("speed", async (ctx) => {
      await this.handleSpeedCommand(ctx as unknown as CommandContext);
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

  private async handleStatusCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "status",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const state = this.getState();
    const codexPreferencesByProject = await this.resolveStatusCodexPreferences(state);
    await ctx.reply(this.buildStatusReply(state, codexPreferencesByProject));
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

    if (callbackData.startsWith(MODELS_CALLBACK_PREFIX)) {
      await this.handleModelsCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(REASONING_CALLBACK_PREFIX)) {
      await this.handleReasoningCallbackQuery(ctx);
      return;
    }

    if (callbackData.startsWith(SPEED_CALLBACK_PREFIX)) {
      await this.handleSpeedCallbackQuery(ctx);
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
      this.isDiscoverSpecEntryCommand(command) ||
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
    if (route === "discover-spec") {
      await this.handleDiscoverSpecTextMessage(ctx);
      return;
    }

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

  private async handleTargetPrepareCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /target_prepare recebido via Telegram", {
      chatId,
      commandText: this.limit((ctx.message?.text ?? "").trim()),
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "target_prepare",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const projectName = this.parseTargetPrepareCommandProjectName(ctx.message?.text);
    if (!projectName) {
      await ctx.reply(TARGET_PREPARE_USAGE_REPLY);
      return;
    }

    try {
      const result = await this.controls.targetPrepare(projectName);
      await ctx.reply(this.buildTargetPrepareReply(result));
    } catch (error) {
      this.logger.error("Falha ao executar /target_prepare", {
        chatId,
        projectName,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(TARGET_PREPARE_FAILED_REPLY);
    }
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

  private async handleRunSpecsFromValidationCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /run_specs_from_validation recebido via Telegram", {
      chatId,
      commandText: this.limit((ctx.message?.text ?? "").trim()),
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "run_specs_from_validation",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const specFileName = this.parseRunSpecsFromValidationCommandFileName(ctx.message?.text);
    if (!specFileName) {
      await ctx.reply(RUN_SPECS_FROM_VALIDATION_USAGE_REPLY);
      return;
    }

    let validation: SpecEligibilityResult;
    try {
      validation = await this.controls.validateRunSpecsTarget(specFileName);
    } catch (error) {
      this.logger.error("Falha ao validar spec para comando /run_specs_from_validation", {
        chatId,
        specInput: specFileName,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(RUN_SPECS_FROM_VALIDATION_VALIDATION_FAILED_REPLY);
      return;
    }

    if (validation.status !== "eligible") {
      await ctx.reply(
        this.buildRunSpecsValidationReply(validation, "/run_specs_from_validation"),
      );
      return;
    }

    const outcome = await this.buildRunSpecsFromValidationReply({
      chatId,
      specFileName: validation.spec.fileName,
    });
    if (outcome.started) {
      this.captureNotificationChat(chatId);
    }

    await ctx.reply(outcome.reply);
  }

  private async handleDiscoverSpecCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /discover_spec recebido via Telegram", {
      chatId,
      commandText: this.limit((ctx.message?.text ?? "").trim()),
    });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "discover_spec",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.startDiscoverSpecSession(chatId);
    this.captureNotificationChat(chatId);
    await ctx.reply(this.buildDiscoverSpecStartReply(result));
  }

  private async handleDiscoverSpecStatusCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /discover_spec_status recebido via Telegram", { chatId });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "discover_spec_status",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const state = this.getState();
    await ctx.reply(this.buildDiscoverSpecStatusReply(state));
  }

  private async handleDiscoverSpecCancelCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /discover_spec_cancel recebido via Telegram", { chatId });

    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "discover_spec_cancel",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.cancelDiscoverSpecSession(chatId);
    await ctx.reply(this.buildDiscoverSpecCancelReply(result));
  }

  private async handleDiscoverSpecTextMessage(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    const stateBeforeInput = this.getState();
    if (!stateBeforeInput.discoverSpecSession) {
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
        command: "discover_spec",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    const result = await this.controls.submitDiscoverSpecInput(chatId, messageText);
    if (result.status === "accepted") {
      const acceptedReply =
        stateBeforeInput.discoverSpecSession.phase === "awaiting-brief"
          ? DISCOVER_SPEC_INPUT_BRIEF_ACCEPTED_REPLY
          : DISCOVER_SPEC_INPUT_ACCEPTED_REPLY;
      await ctx.reply(acceptedReply);
      return;
    }

    if (result.status === "ignored-empty") {
      return;
    }

    await ctx.reply(result.message);
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

  private async handleModelsCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /models recebido via Telegram", { chatId });
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "models",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    try {
      const snapshot = await this.controls.listCodexModels();
      if (snapshot.models.length === 0) {
        await ctx.reply(MODELS_EMPTY_REPLY);
        return;
      }

      const contextId = this.createModelsCallbackContext(chatId, snapshot.project);
      const rendered = this.buildModelsReply(snapshot, 0, contextId);
      await ctx.reply(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao listar modelos do Codex via comando /models", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(MODELS_LIST_FAILED_REPLY);
    }
  }

  private async handleReasoningCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /reasoning recebido via Telegram", { chatId });
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "reasoning",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    try {
      const snapshot = await this.controls.listCodexReasoning();
      if (snapshot.reasoningLevels.length === 0) {
        await ctx.reply(REASONING_EMPTY_REPLY);
        return;
      }

      const contextId = this.createReasoningCallbackContext(
        chatId,
        snapshot.project,
        snapshot.current.model,
      );
      const rendered = this.buildReasoningReply(snapshot, 0, contextId);
      await ctx.reply(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao listar reasoning do Codex via comando /reasoning", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(REASONING_LIST_FAILED_REPLY);
    }
  }

  private async handleSpeedCommand(ctx: CommandContext): Promise<void> {
    const chatId = ctx.chat.id.toString();
    this.logger.info("Comando /speed recebido via Telegram", { chatId });
    if (
      !this.isAllowed({
        chatId,
        eventType: "command",
        command: "speed",
      })
    ) {
      await ctx.reply(PROJECTS_CALLBACK_UNAUTHORIZED_REPLY);
      return;
    }

    try {
      const snapshot = await this.controls.listCodexSpeed();
      if (snapshot.speedOptions.length === 0) {
        await ctx.reply(SPEED_EMPTY_REPLY);
        return;
      }

      const contextId = this.createSpeedCallbackContext(
        chatId,
        snapshot.project,
        snapshot.current.model,
      );
      const rendered = this.buildSpeedReply(snapshot, 0, contextId);
      await ctx.reply(rendered.text, rendered.extra);
    } catch (error) {
      this.logger.error("Falha ao listar velocidades do Codex via comando /speed", {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      await ctx.reply(SPEED_LIST_FAILED_REPLY);
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
    if (state.discoverSpecSession) {
      await ctx.reply(SELECT_PROJECT_BLOCKED_DISCOVER_SPEC_REPLY);
      return;
    }

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
    if (state.discoverSpecSession) {
      await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_BLOCKED_DISCOVER_SPEC_REPLY);
      return;
    }

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

  private async handleModelsCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(MODELS_CALLBACK_PREFIX)) {
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

    const parsed = this.parseModelsCallbackData(callbackData);
    if (parsed.status === "invalid") {
      await this.safeAnswerCallbackQuery(ctx, MODELS_CALLBACK_INVALID_REPLY);
      return;
    }

    const context = this.modelsCallbackContexts.get(parsed.contextId);
    const state = this.getState();
    if (!context || context.chatId !== chatId || !this.isSameProject(state.activeProject, context.activeProjectSnapshot)) {
      await this.safeAnswerCallbackQuery(ctx, MODELS_CALLBACK_STALE_REPLY);
      return;
    }

    if (parsed.status === "page") {
      try {
        const snapshot = await this.controls.listCodexModels();
        const rendered = this.buildModelsReply(snapshot, parsed.page, parsed.contextId);
        await ctx.editMessageText(rendered.text, rendered.extra);
        await this.safeAnswerCallbackQuery(ctx);
      } catch (error) {
        this.logger.error("Falha ao paginar modelos do Codex via callback", {
          chatId,
          callbackData,
          error: error instanceof Error ? error.message : String(error),
        });
        await this.safeAnswerCallbackQuery(ctx, MODELS_LIST_FAILED_REPLY);
      }
      return;
    }

    try {
      const selection = await this.controls.selectCodexModel(parsed.model);
      const snapshot = await this.controls.listCodexModels();
      const rendered = this.buildModelsReply(
        snapshot,
        this.resolveModelsActivePage(snapshot, parsed.model),
        parsed.contextId,
      );
      await ctx.editMessageText(rendered.text, rendered.extra);
      await this.safeAnswerCallbackQuery(ctx, this.buildSelectModelCallbackReply(selection));
    } catch (error) {
      this.logger.error("Falha ao selecionar modelo do Codex via callback", {
        chatId,
        callbackData,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, MODELS_CALLBACK_SELECTION_FAILED_REPLY);
    }
  }

  private async handleReasoningCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(REASONING_CALLBACK_PREFIX)) {
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

    const parsed = this.parseReasoningCallbackData(callbackData);
    if (parsed.status === "invalid") {
      await this.safeAnswerCallbackQuery(ctx, REASONING_CALLBACK_INVALID_REPLY);
      return;
    }

    const context = this.reasoningCallbackContexts.get(parsed.contextId);
    const state = this.getState();
    if (!context || context.chatId !== chatId || !this.isSameProject(state.activeProject, context.activeProjectSnapshot)) {
      await this.safeAnswerCallbackQuery(ctx, REASONING_CALLBACK_STALE_REPLY);
      return;
    }

    try {
      const snapshot = await this.controls.listCodexReasoning();
      if (snapshot.current.model !== context.model) {
        await this.safeAnswerCallbackQuery(ctx, REASONING_CALLBACK_STALE_REPLY);
        return;
      }

      if (parsed.status === "page") {
        const rendered = this.buildReasoningReply(snapshot, parsed.page, parsed.contextId);
        await ctx.editMessageText(rendered.text, rendered.extra);
        await this.safeAnswerCallbackQuery(ctx);
        return;
      }

      const selection = await this.controls.selectCodexReasoning(parsed.effort);
      const refreshedSnapshot = await this.controls.listCodexReasoning();
      const rendered = this.buildReasoningReply(
        refreshedSnapshot,
        this.resolveReasoningActivePage(refreshedSnapshot),
        parsed.contextId,
      );
      await ctx.editMessageText(rendered.text, rendered.extra);
      await this.safeAnswerCallbackQuery(ctx, this.buildSelectReasoningCallbackReply(selection));
    } catch (error) {
      this.logger.error("Falha ao selecionar reasoning do Codex via callback", {
        chatId,
        callbackData,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, REASONING_CALLBACK_SELECTION_FAILED_REPLY);
    }
  }

  private async handleSpeedCallbackQuery(ctx: CallbackContext): Promise<void> {
    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith(SPEED_CALLBACK_PREFIX)) {
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

    const parsed = this.parseSpeedCallbackData(callbackData);
    if (parsed.status === "invalid") {
      await this.safeAnswerCallbackQuery(ctx, SPEED_CALLBACK_INVALID_REPLY);
      return;
    }

    const context = this.speedCallbackContexts.get(parsed.contextId);
    const state = this.getState();
    if (!context || context.chatId !== chatId || !this.isSameProject(state.activeProject, context.activeProjectSnapshot)) {
      await this.safeAnswerCallbackQuery(ctx, SPEED_CALLBACK_STALE_REPLY);
      return;
    }

    try {
      const snapshot = await this.controls.listCodexSpeed();
      if (snapshot.current.model !== context.model) {
        await this.safeAnswerCallbackQuery(ctx, SPEED_CALLBACK_STALE_REPLY);
        return;
      }

      if (parsed.status === "page") {
        const rendered = this.buildSpeedReply(snapshot, parsed.page, parsed.contextId);
        await ctx.editMessageText(rendered.text, rendered.extra);
        await this.safeAnswerCallbackQuery(ctx);
        return;
      }

      const selection = await this.controls.selectCodexSpeed(parsed.speed);
      const refreshedSnapshot = await this.controls.listCodexSpeed();
      const rendered = this.buildSpeedReply(
        refreshedSnapshot,
        this.resolveSpeedActivePage(refreshedSnapshot),
        parsed.contextId,
      );
      await ctx.editMessageText(rendered.text, rendered.extra);
      await this.safeAnswerCallbackQuery(ctx, this.buildSelectSpeedCallbackReply(selection));
    } catch (error) {
      this.logger.error("Falha ao selecionar velocidade do Codex via callback", {
        chatId,
        callbackData,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, SPEED_CALLBACK_SELECTION_FAILED_REPLY);
    }
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
    const flow = this.resolveInteractivePlanningFlow(state, chatId);
    const session = this.resolveInteractivePlanningSession(state, flow);
    const callbackMessageId = this.resolveCallbackMessageId(ctx.callbackQuery);
    const auditContext = this.createCallbackAuditContext({
      flow,
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
      await this.safeAnswerCallbackQuery(ctx, this.resolveInteractivePlanningInvalidReply(flow));
      return;
    }

    this.logCallbackValidation(auditContext, "payload", "passed");

    if (parsed.status === "question") {
      const questionHandler = flow === "discover-spec"
        ? this.controls.onDiscoverSpecQuestionOptionSelected
        : this.controls.onPlanSpecQuestionOptionSelected;
      if (!questionHandler) {
        this.logCallbackValidation(auditContext, "session-handler", "blocked", "inactive-session");
        this.logCallbackDecision(auditContext, {
          result: "blocked",
          blockReason: "inactive-session",
        });
        await this.safeAnswerCallbackQuery(ctx, this.resolveInteractivePlanningInactiveReply(flow));
        return;
      }

      this.logCallbackValidation(auditContext, "session-handler", "passed");
      const contextValidation = this.validatePlanSpecQuestionCallbackContext({
        flow,
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
        const outcome = await questionHandler(chatId, parsed.optionValue);
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
          flow,
          optionValue: parsed.optionValue,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logCallbackDecision(auditContext, {
          result: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
        await this.safeAnswerCallbackQuery(ctx, this.buildInteractivePlanningFailureReply(flow));
      }
      return;
    }

    const finalActionHandler = flow === "discover-spec"
      ? this.controls.onDiscoverSpecFinalActionSelected
      : this.controls.onPlanSpecFinalActionSelected;
    if (!finalActionHandler) {
      this.logCallbackValidation(auditContext, "session-handler", "blocked", "inactive-session");
      this.logCallbackDecision(auditContext, {
        result: "blocked",
        blockReason: "inactive-session",
      });
      await this.safeAnswerCallbackQuery(ctx, this.resolveInteractivePlanningInactiveReply(flow));
      return;
    }

    this.logCallbackValidation(auditContext, "session-handler", "passed");
    const contextValidation = this.validatePlanSpecFinalCallbackContext({
      flow,
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
      const outcome = await finalActionHandler(chatId, parsed.action);
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
        flow,
        action: parsed.action,
        error: error instanceof Error ? error.message : String(error),
      });
      this.logCallbackDecision(auditContext, {
        result: "failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      await this.safeAnswerCallbackQuery(ctx, this.buildInteractivePlanningFailureReply(flow));
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
      if (selectionResult.status === "blocked-discover-spec") {
        await this.safeAnswerCallbackQuery(ctx, SELECT_PROJECT_BLOCKED_DISCOVER_SPEC_REPLY);
        return;
      }

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

  private parseTargetPrepareCommandProjectName(commandText?: string): string | null {
    if (!commandText) {
      return null;
    }

    const match = commandText.match(/^\/target_prepare(?:@[^\s]+)?(?:\s+(.+))?$/u);
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

  private parseRunSpecsFromValidationCommandFileName(commandText?: string): string | null {
    if (!commandText) {
      return null;
    }

    const match = commandText.match(/^\/run_specs_from_validation(?:@[^\s]+)?(?:\s+(.+))?$/u);
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

  private isDiscoverSpecEntryCommand(command: string): boolean {
    return command === "discover_spec";
  }

  private isPlanSpecEntryCommand(command: string): boolean {
    return command === "plan_spec";
  }

  private resolveActiveFreeTextRoute(
    state: RunnerState,
    chatId: string,
  ): "discover-spec" | "plan-spec" | "codex-chat" | null {
    const discoverSpecSession = state.discoverSpecSession;
    const planSpecSession = state.planSpecSession;
    const codexChatSession = state.codexChatSession;
    if (!discoverSpecSession && !planSpecSession && !codexChatSession) {
      return null;
    }

    const activeSessionsCount = [discoverSpecSession, planSpecSession, codexChatSession].filter(Boolean).length;
    if (activeSessionsCount > 1) {
      this.logger.warn(
        "Conflito de sessoes de texto livre detectado; roteamento unico sera aplicado",
        {
          chatId,
          discoverSpecSessionChatId: discoverSpecSession?.chatId ?? null,
          discoverSpecSessionId: discoverSpecSession?.sessionId ?? null,
          planSpecSessionChatId: planSpecSession?.chatId ?? null,
          planSpecSessionId: planSpecSession?.sessionId ?? null,
          codexChatSessionChatId: codexChatSession?.chatId ?? null,
          codexChatSessionId: codexChatSession?.sessionId ?? null,
        },
      );
    }

    if (discoverSpecSession && discoverSpecSession.chatId === chatId) {
      return "discover-spec";
    }

    if (planSpecSession && planSpecSession.chatId === chatId) {
      return "plan-spec";
    }

    if (codexChatSession && codexChatSession.chatId === chatId) {
      return "codex-chat";
    }

    if (discoverSpecSession) {
      return "discover-spec";
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
    if (result.status === "blocked-discover-spec") {
      return SELECT_PROJECT_BLOCKED_DISCOVER_SPEC_REPLY;
    }

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
    return this.buildInteractivePlanningQuestionReply("plan-spec", question);
  }

  private buildInteractivePlanningQuestionReply(
    flow: InteractivePlanningFlow,
    question: PlanSpecQuestionBlock,
  ): { text: string; extra: ReplyOptions } {
    const options = this.resolvePlanSpecQuestionOptions(question);
    const lines = [
      flow === "discover-spec" ? "🔎 Pergunta da descoberta" : "❓ Pergunta do planejamento",
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
    return this.buildInteractivePlanningFinalReply("plan-spec", finalBlock);
  }

  private buildInteractivePlanningFinalReply(
    flow: InteractivePlanningFlow,
    finalBlock: PlanSpecFinalBlock,
  ): { text: string; extra: ReplyOptions } {
    const lines = [
      flow === "discover-spec" ? "✅ Descoberta consolidada" : "✅ Planejamento concluído",
      `Título: ${finalBlock.title}`,
      "",
      "Resumo:",
      finalBlock.summary,
      "",
      "Objetivo:",
      finalBlock.outline.objective,
      "",
      "Atores:",
      ...this.renderPlanSpecFinalList(finalBlock.outline.actors),
      "",
      "Jornada:",
      ...this.renderPlanSpecFinalList(finalBlock.outline.journey),
      "",
      "RFs:",
      ...this.renderPlanSpecFinalList(finalBlock.outline.requirements),
      "",
      "CAs:",
      ...this.renderPlanSpecFinalList(finalBlock.outline.acceptanceCriteria),
      "",
      "Nao-escopo:",
      ...this.renderPlanSpecFinalList(finalBlock.outline.nonScope),
      ...(finalBlock.outline.technicalConstraints.length > 0
        ? [
            "",
            "Restricoes tecnicas:",
            ...this.renderPlanSpecFinalList(finalBlock.outline.technicalConstraints),
          ]
        : []),
      ...(finalBlock.outline.mandatoryValidations.length > 0
        ? [
            "",
            "Validacoes obrigatorias:",
            ...this.renderPlanSpecFinalList(finalBlock.outline.mandatoryValidations),
          ]
        : []),
      ...(finalBlock.outline.pendingManualValidations.length > 0
        ? [
            "",
            "Validacoes manuais pendentes:",
            ...this.renderPlanSpecFinalList(finalBlock.outline.pendingManualValidations),
          ]
        : []),
      ...(finalBlock.outline.knownRisks.length > 0
        ? [
            "",
            "Riscos conhecidos:",
            ...this.renderPlanSpecFinalList(finalBlock.outline.knownRisks),
          ]
        : []),
      ...(flow === "discover-spec" && finalBlock.categoryCoverage.length > 0
        ? [
            "",
            "Categorias obrigatorias:",
            ...finalBlock.categoryCoverage.map(
              (item) => `- [${item.status}] ${item.label}: ${item.detail}`,
            ),
          ]
        : []),
      ...(flow === "discover-spec" && finalBlock.assumptionsAndDefaults.length > 0
        ? [
            "",
            "Assumptions/defaults:",
            ...this.renderPlanSpecFinalList(finalBlock.assumptionsAndDefaults),
          ]
        : []),
      ...(flow === "discover-spec" && finalBlock.decisionsAndTradeOffs.length > 0
        ? [
            "",
            "Decisoes e trade-offs:",
            ...this.renderPlanSpecFinalList(finalBlock.decisionsAndTradeOffs),
          ]
        : []),
      ...(flow === "discover-spec" && finalBlock.criticalAmbiguities.length > 0
        ? [
            "",
            "Ambiguidades criticas abertas:",
            ...this.renderPlanSpecFinalList(finalBlock.criticalAmbiguities),
          ]
        : []),
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

  private renderPlanSpecFinalList(items: string[]): string[] {
    return items.length > 0 ? items.map((item) => `- ${item}`) : ["- Nenhum declarado"];
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
      context.flow === "discover-spec" ? "🔎 Pergunta da descoberta" : "❓ Pergunta do planejamento",
      context.prompt,
      "",
      "Seleção confirmada:",
    ];

    for (const option of context.options) {
      const marker = option.value === selectedOptionValue ? "✅" : "▫️";
      lines.push(`${marker} ${option.label}`);
    }

    lines.push("", this.resolveInteractivePlanningLockedHint(context.flow));

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
      context.flow === "discover-spec" ? "✅ Descoberta consolidada" : "✅ Planejamento concluído",
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

    lines.push("", this.resolveInteractivePlanningLockedHint(context.flow));

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

  private resolveInteractivePlanningLockedHint(flow: InteractivePlanningFlow): string {
    return flow === "discover-spec"
      ? "Botões travados. Aguarde a próxima etapa do /discover_spec."
      : PLAN_SPEC_CALLBACK_LOCKED_HINT;
  }

  private resolveInteractivePlanningInactiveReply(flow: InteractivePlanningFlow): string {
    return flow === "discover-spec"
      ? DISCOVER_SPEC_CALLBACK_INACTIVE_REPLY
      : PLAN_SPEC_CALLBACK_INACTIVE_REPLY;
  }

  private resolveInteractivePlanningInvalidReply(flow: InteractivePlanningFlow): string {
    return flow === "discover-spec"
      ? DISCOVER_SPEC_CALLBACK_INVALID_REPLY
      : PLAN_SPEC_CALLBACK_INVALID_REPLY;
  }

  private resolveInteractivePlanningStaleReply(flow: InteractivePlanningFlow): string {
    return flow === "discover-spec"
      ? DISCOVER_SPEC_CALLBACK_STALE_REPLY
      : PLAN_SPEC_CALLBACK_STALE_REPLY;
  }

  private resolveInteractivePlanningAlreadyProcessedReply(flow: InteractivePlanningFlow): string {
    return flow === "discover-spec"
      ? DISCOVER_SPEC_CALLBACK_ALREADY_PROCESSED_REPLY
      : PLAN_SPEC_CALLBACK_ALREADY_PROCESSED_REPLY;
  }

  private buildInteractivePlanningFailureReply(flow: InteractivePlanningFlow): string {
    return flow === "discover-spec"
      ? this.buildDiscoverSpecInteractiveFailureReply()
      : this.buildPlanSpecInteractiveFailureReply();
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

  private parseModelsCallbackData(callbackData: string): ParsedModelsCallbackData {
    if (callbackData.startsWith(MODELS_CALLBACK_PAGE_PREFIX)) {
      const payload = callbackData.slice(MODELS_CALLBACK_PAGE_PREFIX.length);
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

    if (callbackData.startsWith(MODELS_CALLBACK_SELECT_PREFIX)) {
      const payload = callbackData.slice(MODELS_CALLBACK_SELECT_PREFIX.length);
      const [contextId, rawModel] = payload.split(":", 2);
      const model = decodeURIComponent(rawModel ?? "");
      if (!contextId || !model) {
        return { status: "invalid" };
      }

      return {
        status: "select",
        contextId,
        model,
      };
    }

    return { status: "invalid" };
  }

  private parseReasoningCallbackData(callbackData: string): ParsedReasoningCallbackData {
    if (callbackData.startsWith(REASONING_CALLBACK_PAGE_PREFIX)) {
      const payload = callbackData.slice(REASONING_CALLBACK_PAGE_PREFIX.length);
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

    if (callbackData.startsWith(REASONING_CALLBACK_SELECT_PREFIX)) {
      const payload = callbackData.slice(REASONING_CALLBACK_SELECT_PREFIX.length);
      const [contextId, rawEffort] = payload.split(":", 2);
      const effort = decodeURIComponent(rawEffort ?? "");
      if (!contextId || !effort) {
        return { status: "invalid" };
      }

      return {
        status: "select",
        contextId,
        effort,
      };
    }

    return { status: "invalid" };
  }

  private parseSpeedCallbackData(callbackData: string): ParsedSpeedCallbackData {
    if (callbackData.startsWith(SPEED_CALLBACK_PAGE_PREFIX)) {
      const payload = callbackData.slice(SPEED_CALLBACK_PAGE_PREFIX.length);
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

    if (callbackData.startsWith(SPEED_CALLBACK_SELECT_PREFIX)) {
      const payload = callbackData.slice(SPEED_CALLBACK_SELECT_PREFIX.length);
      const [contextId, rawSpeed] = payload.split(":", 2);
      const speed = decodeURIComponent(rawSpeed ?? "");
      if (!contextId || !speed) {
        return { status: "invalid" };
      }

      return {
        status: "select",
        contextId,
        speed,
      };
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

  private resolveInteractivePlanningFlow(
    state: RunnerState,
    chatId: string,
  ): InteractivePlanningFlow {
    const questionContext = this.planSpecQuestionCallbackContexts.get(chatId);
    if (questionContext) {
      return questionContext.flow;
    }

    const finalContext = this.planSpecFinalCallbackContexts.get(chatId);
    if (finalContext) {
      return finalContext.flow;
    }

    if (state.discoverSpecSession?.chatId === chatId) {
      return "discover-spec";
    }

    return "plan-spec";
  }

  private resolveInteractivePlanningSession(
    state: RunnerState,
    flow: InteractivePlanningFlow,
  ): RunnerState["planSpecSession"] | RunnerState["discoverSpecSession"] {
    return flow === "discover-spec" ? state.discoverSpecSession : state.planSpecSession;
  }

  private validatePlanSpecQuestionCallbackContext(params: {
    flow: InteractivePlanningFlow;
    chatId: string;
    optionValue: string;
    callbackMessageId: number | null;
    session: RunnerState["planSpecSession"] | RunnerState["discoverSpecSession"];
  }): PlanSpecCallbackContextValidationResult<PlanSpecQuestionCallbackContextState> {
    const { flow, chatId, optionValue, callbackMessageId, session } = params;
    if (!session || session.chatId !== chatId) {
      return {
        status: "blocked",
        validation: "session",
        blockReason: "inactive-session",
        reply: this.resolveInteractivePlanningInactiveReply(flow),
      };
    }

    if (session.phase !== "waiting-user") {
      return {
        status: "blocked",
        validation: "phase",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    const context = this.planSpecQuestionCallbackContexts.get(chatId);
    if (!context) {
      return {
        status: "blocked",
        validation: "context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (context.flow !== flow) {
      return {
        status: "blocked",
        validation: "flow-context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (this.hasPlanSpecCallbackSessionMismatch(context.sessionId, session.sessionId ?? null)) {
      return {
        status: "blocked",
        validation: "session-context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (this.hasPlanSpecCallbackMessageMismatch(context.messageId, callbackMessageId)) {
      return {
        status: "blocked",
        validation: "message-context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (context.processing || context.consumed) {
      return {
        status: "blocked",
        validation: "idempotency",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningAlreadyProcessedReply(flow),
      };
    }

    if (!context.options.some((option) => option.value === optionValue)) {
      return {
        status: "blocked",
        validation: "payload-context",
        blockReason: "invalid-action",
        reply: this.resolveInteractivePlanningInvalidReply(flow),
      };
    }

    return {
      status: "passed",
      context,
    };
  }

  private validatePlanSpecFinalCallbackContext(params: {
    flow: InteractivePlanningFlow;
    chatId: string;
    action: PlanSpecFinalActionId;
    callbackMessageId: number | null;
    session: RunnerState["planSpecSession"] | RunnerState["discoverSpecSession"];
  }): PlanSpecCallbackContextValidationResult<PlanSpecFinalCallbackContextState> {
    const { flow, chatId, action, callbackMessageId, session } = params;
    if (!session || session.chatId !== chatId) {
      return {
        status: "blocked",
        validation: "session",
        blockReason: "inactive-session",
        reply: this.resolveInteractivePlanningInactiveReply(flow),
      };
    }

    if (session.phase !== "awaiting-final-action") {
      return {
        status: "blocked",
        validation: "phase",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    const context = this.planSpecFinalCallbackContexts.get(chatId);
    if (!context) {
      return {
        status: "blocked",
        validation: "context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (context.flow !== flow) {
      return {
        status: "blocked",
        validation: "flow-context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (this.hasPlanSpecCallbackSessionMismatch(context.sessionId, session.sessionId ?? null)) {
      return {
        status: "blocked",
        validation: "session-context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (this.hasPlanSpecCallbackMessageMismatch(context.messageId, callbackMessageId)) {
      return {
        status: "blocked",
        validation: "message-context",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningStaleReply(flow),
      };
    }

    if (context.processing || context.consumed) {
      return {
        status: "blocked",
        validation: "idempotency",
        blockReason: "stale",
        reply: this.resolveInteractivePlanningAlreadyProcessedReply(flow),
      };
    }

    if (!context.actions.some((registeredAction) => registeredAction.id === action)) {
      return {
        status: "blocked",
        validation: "payload-context",
        blockReason: "invalid-action",
        reply: this.resolveInteractivePlanningInvalidReply(flow),
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

  private createModelsCallbackContext(chatId: string, project: ProjectRef): string {
    this.invalidateModelsCallbackContextsForChat(chatId);
    const contextId = this.nextModelsCallbackContextId();
    this.modelsCallbackContexts.set(contextId, {
      chatId,
      activeProjectSnapshot: { ...project },
    });
    return contextId;
  }

  private createReasoningCallbackContext(
    chatId: string,
    project: ProjectRef,
    model: string,
  ): string {
    this.invalidateReasoningCallbackContextsForChat(chatId);
    const contextId = this.nextReasoningCallbackContextId();
    this.reasoningCallbackContexts.set(contextId, {
      chatId,
      activeProjectSnapshot: { ...project },
      model,
    });
    return contextId;
  }

  private createSpeedCallbackContext(
    chatId: string,
    project: ProjectRef,
    model: string,
  ): string {
    this.invalidateSpeedCallbackContextsForChat(chatId);
    const contextId = this.nextSpeedCallbackContextId();
    this.speedCallbackContexts.set(contextId, {
      chatId,
      activeProjectSnapshot: { ...project },
      model,
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

  private invalidateModelsCallbackContextsForChat(chatId: string): void {
    for (const [contextId, context] of this.modelsCallbackContexts.entries()) {
      if (context.chatId === chatId) {
        this.modelsCallbackContexts.delete(contextId);
      }
    }
  }

  private invalidateReasoningCallbackContextsForChat(chatId: string): void {
    for (const [contextId, context] of this.reasoningCallbackContexts.entries()) {
      if (context.chatId === chatId) {
        this.reasoningCallbackContexts.delete(contextId);
      }
    }
  }

  private invalidateSpeedCallbackContextsForChat(chatId: string): void {
    for (const [contextId, context] of this.speedCallbackContexts.entries()) {
      if (context.chatId === chatId) {
        this.speedCallbackContexts.delete(contextId);
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

  private nextModelsCallbackContextId(): string {
    this.modelsCallbackContextCounter += 1;
    return this.modelsCallbackContextCounter.toString(36);
  }

  private nextReasoningCallbackContextId(): string {
    this.reasoningCallbackContextCounter += 1;
    return this.reasoningCallbackContextCounter.toString(36);
  }

  private nextSpeedCallbackContextId(): string {
    this.speedCallbackContextCounter += 1;
    return this.speedCallbackContextCounter.toString(36);
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
    flow: InteractivePlanningFlow,
    chatId: string,
    question: PlanSpecQuestionBlock,
    messageId: number | null,
    sessionId: number | null,
  ): void {
    const options = this.resolvePlanSpecQuestionOptions(question);
    this.planSpecQuestionCallbackContexts.set(chatId, {
      flow,
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
    flow: InteractivePlanningFlow,
    chatId: string,
    finalBlock: PlanSpecFinalBlock,
    messageId: number | null,
    sessionId: number | null,
  ): void {
    const actions = this.resolvePlanSpecFinalActions(finalBlock);
    this.planSpecFinalCallbackContexts.set(chatId, {
      flow,
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

  private buildModelsReply(
    snapshot: CodexModelSelectionSnapshot,
    requestedPage: number,
    contextId: string,
  ): { text: string; extra: ReplyOptions } {
    const totalModels = snapshot.models.length;
    const totalPages = Math.max(1, Math.ceil(totalModels / MODELS_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * MODELS_PAGE_SIZE;
    const pageModels = snapshot.models.slice(start, start + MODELS_PAGE_SIZE);

    const lines = [
      "🧠 Modelos do Codex",
      `Projeto: ${snapshot.project.name}`,
      `Página ${page + 1}/${totalPages}`,
      `Modelo atual: ${this.renderCodexCurrentModelSummary(snapshot.current)}`,
      `Reasoning atual: ${snapshot.current.reasoningEffort}`,
      `Velocidade atual: ${this.renderCodexSpeedLabel(snapshot.current.speed)}`,
      "",
    ];

    for (const [index, model] of pageModels.entries()) {
      const absoluteIndex = start + index;
      const marker = model.active ? "✅" : "▫️";
      const description = model.description?.trim();
      lines.push(
        description
          ? `${absoluteIndex + 1}. ${marker} ${model.displayName} - ${description}`
          : `${absoluteIndex + 1}. ${marker} ${model.displayName}`,
      );
    }

    lines.push("", "Toque em um modelo para selecionar.");

    const inlineKeyboard: InlineKeyboardButton[][] = pageModels.map((model) => {
      const marker = model.active ? "✅" : "▫️";
      return [
        {
          text: `${marker} ${model.displayName}`,
          callback_data: `${MODELS_CALLBACK_SELECT_PREFIX}${contextId}:${encodeURIComponent(model.slug)}`,
        },
      ];
    });

    const pageButtons = this.buildPagedNavigationButtons({
      page,
      totalPages,
      previousPrefix: MODELS_CALLBACK_PAGE_PREFIX,
      nextPrefix: MODELS_CALLBACK_PAGE_PREFIX,
      contextId,
    });
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

  private buildReasoningReply(
    snapshot: CodexReasoningSelectionSnapshot,
    requestedPage: number,
    contextId: string,
  ): { text: string; extra: ReplyOptions } {
    const totalLevels = snapshot.reasoningLevels.length;
    const totalPages = Math.max(1, Math.ceil(totalLevels / REASONING_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * REASONING_PAGE_SIZE;
    const pageLevels = snapshot.reasoningLevels.slice(start, start + REASONING_PAGE_SIZE);

    const lines = [
      "🧩 Reasoning do Codex",
      `Projeto: ${snapshot.project.name}`,
      `Modelo atual: ${this.renderCodexCurrentModelSummary(snapshot.current)}`,
      `Página ${page + 1}/${totalPages}`,
      `Reasoning atual: ${snapshot.current.reasoningEffort}`,
      `Velocidade atual: ${this.renderCodexSpeedLabel(snapshot.current.speed)}`,
      "",
    ];

    for (const [index, level] of pageLevels.entries()) {
      const absoluteIndex = start + index;
      const marker = level.active ? "✅" : "▫️";
      lines.push(`${absoluteIndex + 1}. ${marker} ${level.effort} - ${level.description}`);
    }

    lines.push("", "Toque em um nivel para selecionar.");

    const inlineKeyboard: InlineKeyboardButton[][] = pageLevels.map((level) => {
      const marker = level.active ? "✅" : "▫️";
      return [
        {
          text: `${marker} ${level.effort}`,
          callback_data: `${REASONING_CALLBACK_SELECT_PREFIX}${contextId}:${encodeURIComponent(level.effort)}`,
        },
      ];
    });

    const pageButtons = this.buildPagedNavigationButtons({
      page,
      totalPages,
      previousPrefix: REASONING_CALLBACK_PAGE_PREFIX,
      nextPrefix: REASONING_CALLBACK_PAGE_PREFIX,
      contextId,
    });
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

  private buildSpeedReply(
    snapshot: CodexSpeedSelectionSnapshot,
    requestedPage: number,
    contextId: string,
  ): { text: string; extra: ReplyOptions } {
    const totalSpeeds = snapshot.speedOptions.length;
    const totalPages = Math.max(1, Math.ceil(totalSpeeds / SPEED_PAGE_SIZE));
    const page = Math.min(Math.max(requestedPage, 0), totalPages - 1);
    const start = page * SPEED_PAGE_SIZE;
    const pageSpeedOptions = snapshot.speedOptions.slice(start, start + SPEED_PAGE_SIZE);

    const lines = [
      "⚡ Velocidade do Codex",
      `Projeto: ${snapshot.project.name}`,
      `Modelo atual: ${this.renderCodexCurrentModelSummary(snapshot.current)}`,
      `Página ${page + 1}/${totalPages}`,
      `Velocidade atual: ${this.renderCodexSpeedLabel(snapshot.current.speed)}`,
      "",
    ];

    if (!snapshot.current.fastModeSupported) {
      lines.push("Fast mode indisponivel para o modelo atual.", "");
    }

    for (const [index, speedOption] of pageSpeedOptions.entries()) {
      const absoluteIndex = start + index;
      const marker = speedOption.active ? "✅" : "▫️";
      const availability = speedOption.selectable ? "" : " (indisponivel)";
      lines.push(
        `${absoluteIndex + 1}. ${marker} ${speedOption.label}${availability} - ${speedOption.description}`,
      );
    }

    lines.push("", "Toque em uma velocidade para selecionar.");

    const inlineKeyboard: InlineKeyboardButton[][] = pageSpeedOptions.map((speedOption) => {
      const marker = speedOption.active ? "✅" : "▫️";
      const suffix = speedOption.selectable ? "" : " (indisponivel)";
      return [
        {
          text: `${marker} ${speedOption.label}${suffix}`,
          callback_data: `${SPEED_CALLBACK_SELECT_PREFIX}${contextId}:${encodeURIComponent(speedOption.slug)}`,
        },
      ];
    });

    const pageButtons = this.buildPagedNavigationButtons({
      page,
      totalPages,
      previousPrefix: SPEED_CALLBACK_PAGE_PREFIX,
      nextPrefix: SPEED_CALLBACK_PAGE_PREFIX,
      contextId,
    });
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

  private buildPagedNavigationButtons(params: {
    page: number;
    totalPages: number;
    previousPrefix: string;
    nextPrefix: string;
    contextId: string;
  }): InlineKeyboardButton[] {
    const buttons: InlineKeyboardButton[] = [];
    if (params.page > 0) {
      buttons.push({
        text: "⬅️ Anterior",
        callback_data: `${params.previousPrefix}${params.contextId}:${params.page - 1}`,
      });
    }

    if (params.page < params.totalPages - 1) {
      buttons.push({
        text: "Próxima ➡️",
        callback_data: `${params.nextPrefix}${params.contextId}:${params.page + 1}`,
      });
    }

    return buttons;
  }

  private renderCodexCurrentModelSummary(preferences: CodexResolvedProjectPreferences): string {
    if (preferences.modelSelectable) {
      return preferences.modelDisplayName;
    }

    return `${preferences.modelDisplayName} (atual, indisponivel para selecao)`;
  }

  private buildSelectModelCallbackReply(result: CodexModelSelectionResult): string {
    if (result.status === "selected") {
      if (result.reasoningResetFrom && result.speedResetFrom) {
        return `Modelo atualizado. Reasoning resetado para ${result.current.reasoningEffort} e velocidade resetada para ${this.renderCodexSpeedLabel(result.current.speed)}.`;
      }

      if (result.reasoningResetFrom) {
        return `Modelo atualizado. Reasoning resetado para ${result.current.reasoningEffort}.`;
      }

      if (result.speedResetFrom) {
        return `Modelo atualizado. Velocidade resetada para ${this.renderCodexSpeedLabel(result.current.speed)}.`;
      }

      return `Modelo atualizado para ${result.current.modelDisplayName}.`;
    }

    if (result.status === "not-selectable") {
      return "Modelo indisponivel para selecao.";
    }

    return "Modelo nao encontrado no catalogo.";
  }

  private buildSelectReasoningCallbackReply(result: CodexReasoningSelectionResult): string {
    if (result.status === "selected") {
      return `Reasoning atualizado para ${result.current.reasoningEffort}.`;
    }

    return "Reasoning nao suportado pelo modelo atual.";
  }

  private buildSelectSpeedCallbackReply(result: CodexSpeedSelectionResult): string {
    if (result.status === "selected") {
      return `Velocidade atualizada para ${this.renderCodexSpeedLabel(result.current.speed)}.`;
    }

    return "Velocidade indisponivel para o modelo atual.";
  }

  private resolveModelsActivePage(snapshot: CodexModelSelectionSnapshot, selectedModel: string): number {
    const index = snapshot.models.findIndex((model) => model.slug === selectedModel || model.active);
    if (index < 0) {
      return 0;
    }

    return Math.floor(index / MODELS_PAGE_SIZE);
  }

  private resolveReasoningActivePage(snapshot: CodexReasoningSelectionSnapshot): number {
    const index = snapshot.reasoningLevels.findIndex((level) => level.active);
    if (index < 0) {
      return 0;
    }

    return Math.floor(index / REASONING_PAGE_SIZE);
  }

  private resolveSpeedActivePage(snapshot: CodexSpeedSelectionSnapshot): number {
    const index = snapshot.speedOptions.findIndex((speedOption) => speedOption.active);
    if (index < 0) {
      return 0;
    }

    return Math.floor(index / SPEED_PAGE_SIZE);
  }

  private renderCodexSpeedLabel(speed: CodexSpeed): string {
    return speed === "fast" ? "Fast" : "Standard";
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

  private isSameProject(left: ProjectRef | null | undefined, right: ProjectRef): boolean {
    if (!left) {
      return false;
    }

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
    await this.telegramDelivery.deliverTextMessage({
      destinationChatId: chatId,
      text: content,
      policy: TICKET_OPEN_CONTENT_DELIVERY_POLICY,
      logicalMessageType: "tickets-open-content",
      logMessages: {
        success: "Conteudo de ticket aberto enviado no Telegram",
        transientFailure: "Falha transitoria ao enviar conteudo de ticket aberto no Telegram",
        definitiveFailure: "Falha definitiva ao enviar conteudo de ticket aberto no Telegram",
      },
      context: {
        flow: "tickets-open",
        ticketFileName,
      },
      formatChunk: ({ chunk, chunkIndex, chunkCount }) =>
        [
          `🧾 Ticket aberto: ${ticketFileName}`,
          chunkCount > 1 ? `Parte ${chunkIndex}/${chunkCount}` : "Parte única",
          "",
          chunk,
        ].join("\n"),
    });
  }

  private async sendImplementSelectedTicketAction(chatId: string, ticketFileName: string): Promise<void> {
    const callbackData = this.createImplementTicketCallbackData(chatId, ticketFileName);
    await this.deliverInteractiveChatMessage({
      chatId,
      text: this.buildImplementSelectedTicketReply(ticketFileName),
      extra: {
        reply_markup: {
          inline_keyboard: [[{
            text: IMPLEMENT_SELECTED_TICKET_BUTTON_LABEL,
            callback_data: callbackData,
          }]],
        },
      },
      logicalMessageType: "tickets-open-implement-action",
      logMessages: {
        success: "CTA de implementacao de ticket aberto enviada no Telegram",
        transientFailure: "Falha transitoria ao enviar CTA de implementacao de ticket aberto no Telegram",
        definitiveFailure: "Falha definitiva ao enviar CTA de implementacao de ticket aberto no Telegram",
      },
      context: {
        flow: "tickets-open",
        ticketFileName,
      },
    });
  }

  private async sendSpecsCallbackChatMessage(chatId: string, message: string): Promise<void> {
    await this.sendCallbackChatMessage(chatId, message, {
      flow: "specs",
      logicalMessageType: "specs-callback-message",
      success: "Confirmacao de callback de /specs enviada no Telegram",
      transientFailure: "Falha transitoria ao enviar confirmação de callback de /specs no chat",
      definitiveFailure: "Falha definitiva ao enviar confirmação de callback de /specs no chat",
    });
  }

  private async sendTicketsOpenCallbackChatMessage(chatId: string, message: string): Promise<void> {
    await this.sendCallbackChatMessage(chatId, message, {
      flow: "tickets-open",
      logicalMessageType: "tickets-open-callback-message",
      success: "Confirmacao de callback de /tickets_open enviada no Telegram",
      transientFailure: "Falha transitoria ao enviar confirmação de callback de /tickets_open no chat",
      definitiveFailure: "Falha definitiva ao enviar confirmação de callback de /tickets_open no chat",
    });
  }

  private async sendPlanSpecCallbackChatMessage(chatId: string, message: string): Promise<void> {
    await this.sendCallbackChatMessage(chatId, message, {
      flow: "plan-spec",
      logicalMessageType: "plan-spec-callback-message",
      success: "Confirmacao de callback de /plan_spec enviada no Telegram",
      transientFailure: "Falha transitoria ao enviar confirmação de callback de /plan_spec no chat",
      definitiveFailure: "Falha definitiva ao enviar confirmação de callback de /plan_spec no chat",
    });
  }

  private async sendTicketRunCallbackChatMessage(chatId: string, message: string): Promise<void> {
    await this.sendCallbackChatMessage(chatId, message, {
      flow: "ticket-run",
      logicalMessageType: "ticket-run-callback-message",
      success: "Confirmacao de callback de implementacao de ticket enviada no Telegram",
      transientFailure: "Falha transitoria ao enviar confirmação de callback de implementacao de ticket",
      definitiveFailure: "Falha definitiva ao enviar confirmação de callback de implementacao de ticket",
    });
  }

  private async sendCodexChatCallbackChatMessage(chatId: string, message: string): Promise<void> {
    await this.sendCallbackChatMessage(chatId, message, {
      flow: "codex-chat",
      logicalMessageType: "codex-chat-callback-message",
      success: "Confirmacao de callback de /codex_chat enviada no Telegram",
      transientFailure: "Falha transitoria ao enviar confirmação de callback de /codex_chat no chat",
      definitiveFailure: "Falha definitiva ao enviar confirmação de callback de /codex_chat no chat",
    });
  }

  private async deliverInteractiveChatMessage(input: {
    chatId: string;
    text: string;
    logicalMessageType: string;
    logMessages: TelegramDeliveryLogMessages;
    extra?: unknown;
    context?: Record<string, unknown>;
    formatChunk?: DeliverTelegramTextMessageInput["formatChunk"];
  }): Promise<TelegramDeliveryResult> {
    return this.telegramDelivery.deliverTextMessage({
      destinationChatId: input.chatId,
      text: input.text,
      policy: INTERACTIVE_TELEGRAM_DELIVERY_POLICY,
      logicalMessageType: input.logicalMessageType,
      logMessages: input.logMessages,
      ...(input.extra ? { extra: input.extra } : {}),
      ...(input.context ? { context: input.context } : {}),
      ...(input.formatChunk ? { formatChunk: input.formatChunk } : {}),
    });
  }

  private async sendCallbackChatMessage(
    chatId: string,
    message: string,
    delivery: {
      flow: string;
      logicalMessageType: string;
      success: string;
      transientFailure: string;
      definitiveFailure: string;
    },
  ): Promise<void> {
    if (!chatId || chatId === "unknown") {
      return;
    }

    try {
      await this.telegramDelivery.deliverTextMessage({
        destinationChatId: chatId,
        text: message,
        policy: CALLBACK_CHAT_DELIVERY_POLICY,
        logicalMessageType: delivery.logicalMessageType,
        logMessages: {
          success: delivery.success,
          transientFailure: delivery.transientFailure,
          definitiveFailure: delivery.definitiveFailure,
        },
        context: {
          flow: delivery.flow,
        },
      });
    } catch (error) {
      if (isTelegramMessageDeliveryDispatchError(error)) {
        return;
      }

      throw error;
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

  private async buildRunSpecsFromValidationReply(context: {
    chatId: string;
    specFileName: string;
  }): Promise<{
    reply: string;
    started: boolean;
    status:
      | "started"
      | "already-running"
      | "blocked"
      | "validation-blocked"
      | "validation-failed";
  }> {
    const result = await this.controls.runSpecsFromValidation(context.specFileName);
    const logContext = {
      commandStatus: result.status,
      chatId: context.chatId,
      specFileName: context.specFileName,
      ...(result.status === "blocked" ? { reason: result.reason } : {}),
    };

    if (result.status === "started") {
      this.logger.info("Comando /run_specs_from_validation aceito e fluxo iniciado", logContext);
      return {
        reply: `▶️ Runner iniciado via /run_specs_from_validation para ${context.specFileName}.`,
        started: true,
        status: "started",
      };
    }

    if (result.status === "already-running") {
      this.logger.warn(
        "Comando /run_specs_from_validation ignorado: rodada ja em execucao",
        logContext,
      );
      return { reply: RUN_ALL_ALREADY_RUNNING_REPLY, started: false, status: "already-running" };
    }

    if (result.status === "validation-blocked" || result.status === "validation-failed") {
      this.logger.warn("Comando /run_specs_from_validation bloqueado pela validacao do backlog", {
        ...logContext,
        message: result.message,
      });
      return {
        reply: `❌ ${result.message}`,
        started: false,
        status: result.status,
      };
    }

    this.logger.warn("Comando /run_specs_from_validation bloqueado", {
      ...logContext,
      message: result.message,
    });
    return {
      reply: `${RUN_SPECS_FROM_VALIDATION_AUTH_REQUIRED_REPLY_PREFIX}${result.message}`,
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

  private buildTargetPrepareReply(result: TargetPrepareRequestResult): string {
    if (result.status === "completed") {
      const versioningLine =
        result.summary.versioning.status === "committed-and-pushed"
          ? `${result.summary.versioning.commitHash}@${result.summary.versioning.upstream}`
          : result.summary.versioning.errorMessage;

      return [
        `✅ /target_prepare concluido para ${result.summary.targetProject.name}.`,
        `Elegivel para /projects: ${result.summary.eligibleForProjects ? "sim" : "nao"}`,
        `Compativel com workflow completo: ${result.summary.compatibleWithWorkflowComplete ? "sim" : "nao"}`,
        `Manifesto: ${result.summary.manifestPath}`,
        `Relatorio: ${result.summary.reportPath}`,
        `Versionamento: ${versioningLine}`,
        `Proxima acao: ${result.summary.nextAction}`,
      ].join("\n");
    }

    return `❌ ${result.message}`;
  }

  private buildDiscoverSpecStartReply(result: DiscoverSpecSessionStartResult): string {
    if (result.status === "started") {
      return `🧭 ${result.message}`;
    }

    if (result.status === "already-active") {
      return `ℹ️ ${result.message}`;
    }

    if (result.status === "blocked") {
      return `❌ ${result.message}`;
    }

    return this.buildDiscoverSpecInteractiveFailureReply(result.message);
  }

  private buildDiscoverSpecCancelReply(result: DiscoverSpecSessionCancelResult): string {
    if (result.status === "cancelled") {
      return `✅ ${result.message}`;
    }

    if (result.status === "inactive") {
      return DISCOVER_SPEC_STATUS_INACTIVE_REPLY;
    }

    return `ℹ️ ${result.message}`;
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

  private buildRunSpecsValidationReply(
    validation: Exclude<SpecEligibilityResult, { status: "eligible" }>,
    command: "/run_specs" | "/run_specs_from_validation" = "/run_specs",
  ): string {
    const invalidPrefix =
      command === "/run_specs"
        ? RUN_SPECS_INVALID_SPEC_REPLY_PREFIX
        : RUN_SPECS_FROM_VALIDATION_INVALID_SPEC_REPLY_PREFIX;
    const notFoundPrefix =
      command === "/run_specs"
        ? RUN_SPECS_NOT_FOUND_REPLY_PREFIX
        : RUN_SPECS_FROM_VALIDATION_NOT_FOUND_REPLY_PREFIX;
    const notEligiblePrefix =
      command === "/run_specs"
        ? RUN_SPECS_NOT_ELIGIBLE_REPLY_PREFIX
        : RUN_SPECS_FROM_VALIDATION_NOT_ELIGIBLE_REPLY_PREFIX;
    if (validation.status === "invalid-path") {
      return `${invalidPrefix} ${validation.message}`;
    }

    if (validation.status === "not-found") {
      return [
        `${notFoundPrefix} ${validation.spec.fileName}.`,
        "Verifique se o arquivo existe em docs/specs/.",
      ].join(" ");
    }

    return [
      `${notEligiblePrefix} ${validation.spec.fileName}.`,
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

  private buildDiscoverSpecStatusReply(state: RunnerState): string {
    const session = state.discoverSpecSession;
    if (!session) {
      return DISCOVER_SPEC_STATUS_INACTIVE_REPLY;
    }

    const coverageItems = Object.values(session.categoryCoverage);
    const coveredCategories = coverageItems.filter((item) => item.status !== "pending");
    const pendingCategories = coverageItems.filter((item) => item.status === "pending");

    const lines = [
      "🧭 Sessão /discover_spec ativa",
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

    lines.push("");
    lines.push("Categorias cobertas ou explicitadas:");
    lines.push(
      ...(coveredCategories.length > 0
        ? coveredCategories.map((item) => `- [${item.status}] ${item.label}: ${item.detail}`)
        : ["- Nenhuma categoria resolvida ainda"]),
    );
    lines.push("");
    lines.push("Categorias pendentes:");
    lines.push(
      ...(pendingCategories.length > 0
        ? pendingCategories.map((item) => `- ${item.label}: ${item.detail || "pendente de cobertura explicita"}`)
        : ["- Nenhuma categoria pendente"]),
    );

    if (session.pendingItems.length > 0) {
      lines.push("");
      lines.push("Pendencias criticas abertas:");
      lines.push(...session.pendingItems.map((item) => `- ${item.label}: ${item.detail}`));
    }

    if (session.latestFinalBlock?.assumptionsAndDefaults.length) {
      lines.push("");
      lines.push("Assumptions/defaults:");
      lines.push(...this.renderPlanSpecFinalList(session.latestFinalBlock.assumptionsAndDefaults));
    }

    if (session.latestFinalBlock?.decisionsAndTradeOffs.length) {
      lines.push("");
      lines.push("Decisoes e trade-offs:");
      lines.push(...this.renderPlanSpecFinalList(session.latestFinalBlock.decisionsAndTradeOffs));
    }

    lines.push("");
    lines.push(
      `Criar spec elegivel agora: ${session.createSpecEligible ? "sim" : "nao"}`,
    );
    if (session.createSpecBlockReason) {
      lines.push(`Motivo do gate: ${session.createSpecBlockReason}`);
    }

    return lines.join("\n");
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

  private buildDiscoverSpecRawOutputReply(rawOutput: string): string {
    const sanitized = sanitizePlanSpecRawOutput(rawOutput);
    if (!sanitized) {
      return DISCOVER_SPEC_RAW_OUTPUT_REPLY_PREFIX;
    }

    return [DISCOVER_SPEC_RAW_OUTPUT_REPLY_PREFIX, sanitized].join("\n");
  }

  private buildDiscoverSpecInteractiveFailureReply(details?: string): string {
    return [
      DISCOVER_SPEC_FLOW_FAILED_REPLY_PREFIX,
      details?.trim() || "nao foi possivel interpretar a sessao atual.",
      DISCOVER_SPEC_FLOW_FAILED_RETRY_SUFFIX,
    ].join(" ");
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

  private limitDiagnosticPreview(value: string): string {
    const normalized = value.trim();
    if (normalized.length <= MAX_TICKET_DIAGNOSTIC_PREVIEW_LENGTH) {
      return normalized;
    }

    const headLength = 420;
    const tailLength = MAX_TICKET_DIAGNOSTIC_PREVIEW_LENGTH - headLength - "\n...\n".length;
    return `${normalized.slice(0, headLength)}\n...\n${normalized.slice(-tailLength)}`;
  }

  private buildRunFlowSummaryMessage(summary: RunnerFlowSummary): string {
    const lines = [
      "📣 Resumo final de fluxo",
    ];

    if (summary.flow === "run-all") {
      lines.push(`Fluxo: ${summary.flow}`);
      lines.push(`Projeto ativo: ${summary.activeProjectName}`);
      lines.push(`Caminho do projeto: ${summary.activeProjectPath}`);
      lines.push(`Resultado: ${this.renderOutcome(summary.outcome)}`);
      lines.push(`Fase final: ${summary.finalStage}`);
      lines.push(`Motivo de encerramento: ${summary.completionReason}`);
      lines.push(`Timestamp UTC: ${summary.timestampUtc}`);
      if (summary.codexPreferences) {
        lines.push(
          `Codex utilizado: ${summary.codexPreferences.model} | reasoning ${summary.codexPreferences.reasoningEffort} | velocidade ${this.renderCodexSpeedLabel(summary.codexPreferences.speed)}`,
        );
      } else {
        lines.push("Codex utilizado: snapshot indisponivel");
      }
      lines.push(`Tickets processados: ${summary.processedTicketsCount}/${summary.maxTicketsPerRound}`);
      if (summary.lastProcessedTicket) {
        lines.push(`Último ticket processado: ${summary.lastProcessedTicket}`);
      }
      if (summary.selectionTicket) {
        lines.push(
          summary.completionReason === "blocked-tickets-only"
            ? `Próximo ticket bloqueado: ${summary.selectionTicket}`
            : `Ticket afetado na seleção: ${summary.selectionTicket}`,
        );
      }
      if (summary.details) {
        lines.push(`Detalhes: ${summary.details}`);
      }
      lines.push("Tempos do fluxo");
      lines.push(...this.buildTimingDetailLines(summary.timing, RUN_ALL_TIMING_STAGE_ORDER));
      return lines.join("\n");
    }

    const sections: EditorialSection[] = [
      {
        title: "Visao geral do fluxo",
        lines: this.buildRunSpecsOverviewLines(summary),
      },
    ];

    if (summary.specTriage) {
      sections.push({
        title: "Pre-/run_all: spec-triage",
        lines: this.buildRunSpecsSpecTriageLines(summary.specTriage),
      });
    }
    if (summary.specTicketValidation) {
      sections.push({
        title: "Pre-/run_all: spec-ticket-validation",
        lines: this.buildRunSpecsTicketValidationLines(summary.specTicketValidation),
      });
    }
    if (summary.specTicketDerivationRetrospective) {
      sections.push({
        title: "Pre-/run_all: retrospectiva da derivacao",
        lines: this.buildSpecTicketDerivationRetrospectiveLines(
          summary.specTicketDerivationRetrospective,
        ),
      });
    }
    if (summary.specCloseAndVersion) {
      sections.push({
        title: "Pre-/run_all: spec-close-and-version",
        lines: this.buildRunSpecsSpecCloseAndVersionLines(summary.specCloseAndVersion),
      });
    }
    if (summary.specAudit) {
      sections.push({
        title: "Pos-/run_all: spec-audit",
        lines: this.buildRunSpecsSpecAuditLines(summary.specAudit),
      });
    }
    if (summary.workflowGapAnalysis) {
      sections.push({
        title: "Pos-/run_all: retrospectiva sistemica",
        lines: this.buildWorkflowGapAnalysisDetailLines(summary.workflowGapAnalysis),
      });
    }
    if (summary.workflowImprovementTicket) {
      sections.push({
        title: "Pos-/run_all: ticket transversal",
        lines: this.buildWorkflowImprovementTicketLines(summary.workflowImprovementTicket),
      });
    }

    sections.push({
      title: "Timing do fluxo completo",
      lines: this.buildTimingDetailLines(summary.timing, RUN_SPECS_FLOW_TIMING_STAGE_ORDER),
    });
    sections.push({
      title: "Timing da triagem pre-/run_all",
      lines: this.buildTimingDetailLines(summary.triageTiming, RUN_SPECS_TRIAGE_TIMING_STAGE_ORDER),
    });

    if (summary.runAllSummary) {
      sections.push({
        title: "Resultado do /run_all encadeado",
        lines: this.buildChainedRunAllSummaryLines(summary.runAllSummary),
      });
    }

    return this.renderEditorialMessage(lines, sections);
  }

  private renderOutcome(outcome: "success" | "failure" | "blocked"): string {
    if (outcome === "success") {
      return "sucesso";
    }

    if (outcome === "blocked") {
      return "bloqueado";
    }

    return "falha";
  }

  private renderEditorialMessage(headerLines: string[], sections: EditorialSection[]): string {
    const blocks = [headerLines.join("\n")];
    for (const section of sections) {
      if (section.lines.length === 0) {
        continue;
      }
      blocks.push([section.title, ...section.lines].join("\n"));
    }

    return blocks.join("\n\n");
  }

  private buildRunSpecsOverviewLines(summary: RunSpecsFlowSummary): string[] {
    const sourceCommand = this.resolveRunSpecsSourceCommand(summary.sourceCommand);
    const entryPoint = this.resolveRunSpecsEntryPoint(summary.entryPoint);
    const lines = [
      `Fluxo: ${summary.flow}`,
      `Projeto ativo: ${summary.activeProjectName}`,
      `Caminho do projeto: ${summary.activeProjectPath}`,
      `Spec: ${summary.spec.fileName}`,
      `Caminho da spec: ${summary.spec.path}`,
      `Comando de origem: ${sourceCommand}`,
      `Ponto de entrada: ${entryPoint}`,
      `Resultado: ${this.renderOutcome(summary.outcome)}`,
      `Fase final: ${summary.finalStage}`,
      `Motivo de encerramento: ${summary.completionReason}`,
      `Timestamp UTC: ${summary.timestampUtc}`,
    ];

    if (summary.codexPreferences) {
      lines.push(
        `Codex utilizado: ${summary.codexPreferences.model} | reasoning ${summary.codexPreferences.reasoningEffort} | velocidade ${this.renderCodexSpeedLabel(summary.codexPreferences.speed)}`,
      );
    } else {
      lines.push("Codex utilizado: snapshot indisponivel");
    }

    if (summary.details) {
      lines.push(`Leitura operacional: ${summary.details}`);
    }

    return lines;
  }

  private buildRunSpecsTicketValidationLines(
    summary: NonNullable<RunSpecsFlowSummary["specTicketValidation"]>,
  ): string[] {
    const finalGapCount =
      summary.finalOpenGapFingerprints.length > 0
        ? summary.finalOpenGapFingerprints.length
        : summary.gaps.length;
    const lines = [
      `Veredito: ${summary.verdict}`,
      `Confianca final: ${summary.confidence}`,
      `Motivo final: ${summary.finalReason}`,
      `Ciclos executados: ${summary.cyclesExecuted}`,
      `Revalidacao executada: ${summary.cycleHistory.length > 1 ? `sim (${summary.cycleHistory.length - 1} rodada(s) adicional(is))` : "nao"}`,
      `Contagem final de gaps: ${finalGapCount}`,
      `Sintese final do gate: ${summary.summary}`,
    ];

    if (summary.cycleHistory.length > 1) {
      lines.push("Evolucao por ciclo:");
      for (const cycle of summary.cycleHistory) {
        const reductionLabel =
          cycle.realGapReductionFromPrevious === null
            ? "n/a"
            : cycle.realGapReductionFromPrevious
              ? "sim"
              : "nao";
        lines.push(
          `- ciclo ${cycle.cycleNumber} [${cycle.phase}]: ${cycle.verdict}/${cycle.confidence} | gaps=${cycle.openGapFingerprints.length} | reducao-real=${reductionLabel}`,
        );
        lines.push(`  sinal do ciclo: ${cycle.summary}`);
        if (cycle.appliedCorrections.length > 0) {
          lines.push(
            `  correcoes deste ciclo: ${cycle.appliedCorrections.map((correction) => `${correction.description} (${correction.outcome})`).join("; ")}`,
          );
        }
      }
    }

    if (summary.gaps.length === 0) {
      lines.push("Gaps finais detalhados: nenhum");
    } else {
      lines.push("Gaps finais detalhados:");
      for (const gap of summary.gaps) {
        const requirementSuffix =
          gap.requirementRefs.length > 0
            ? ` [${gap.requirementRefs.join(", ")}]`
            : "";
        lines.push(`- ${gap.gapType}: ${gap.summary}${requirementSuffix}`);
      }
    }

    lines.push(
      `Sintese final das correcoes aplicadas: ${this.buildAppliedCorrectionSummary(summary.appliedCorrections)}`,
    );

    return lines;
  }

  private buildAppliedCorrectionSummary(
    corrections: NonNullable<RunSpecsFlowSummary["specTicketValidation"]>["appliedCorrections"],
  ): string {
    if (!corrections || corrections.length === 0) {
      return "nenhuma";
    }

    const outcomes = new Map<string, number>();
    const affectedArtifacts = new Set<string>();
    const linkedGapTypes = new Set<string>();
    for (const correction of corrections) {
      outcomes.set(correction.outcome, (outcomes.get(correction.outcome) ?? 0) + 1);
      for (const artifactPath of correction.affectedArtifactPaths) {
        affectedArtifacts.add(artifactPath);
      }
      for (const gapType of correction.linkedGapTypes) {
        linkedGapTypes.add(gapType);
      }
    }

    const outcomeSummary = Array.from(outcomes.entries())
      .map(([outcome, count]) => `${outcome}=${count}`)
      .join(", ");
    const artifactPaths = Array.from(affectedArtifacts);
    const artifactSummary =
      artifactPaths.length === 0
        ? "artefatos nao informados"
        : artifactPaths.length <= 2
          ? `artefatos ${artifactPaths.join(", ")}`
          : `${artifactPaths.length} artefatos impactados`;
    const gapSummary =
      linkedGapTypes.size === 0
        ? "sem gap vinculado"
        : linkedGapTypes.size === 1
          ? `frente ${Array.from(linkedGapTypes)[0]}`
          : `${linkedGapTypes.size} frentes de gap`;

    return `${corrections.length} ajuste(s); resultados ${outcomeSummary}; ${artifactSummary}; ${gapSummary}`;
  }

  private buildRunSpecsSpecTriageLines(
    summary: NonNullable<RunSpecsFlowSummary["specTriage"]>,
  ): string[] {
    return [
      `Status da spec apos triagem: ${summary.specStatusAfterTriage}`,
      `Spec treatment apos triagem: ${summary.specTreatmentAfterTriage}`,
      `Tickets derivados criados: ${summary.derivedTicketsCreated}`,
      `Efeito observavel da triagem: ${summary.summary}`,
    ];
  }

  private buildSpecTicketDerivationRetrospectiveLines(
    summary: NonNullable<RunSpecsFlowSummary["specTicketDerivationRetrospective"]>,
  ): string[] {
    const lines = [
      `Decisao: ${summary.decision}`,
      `Gaps revisados detectados: ${summary.reviewedGapHistoryDetected ? "sim" : "nao"}`,
      `Insumos estruturados disponiveis: ${summary.structuredInputAvailable ? "sim" : "nao"}`,
      `Veredito funcional associado: ${summary.functionalVerdict}`,
      `Sintese da retrospectiva: ${summary.summary}`,
    ];

    if (summary.analysis) {
      lines.push("Analise sistemica associada:");
      lines.push(...this.buildWorkflowGapAnalysisDetailLines(summary.analysis));
    }

    if (summary.workflowImprovementTicket) {
      lines.push("Ticket transversal ou limitacao associada:");
      lines.push(...this.buildWorkflowImprovementTicketLines(summary.workflowImprovementTicket));
    }

    return lines;
  }

  private buildRunSpecsSpecCloseAndVersionLines(
    summary: NonNullable<RunSpecsFlowSummary["specCloseAndVersion"]>,
  ): string[] {
    return [
      `Fechamento concluido: ${summary.closureCompleted ? "sim" : "nao"}`,
      `Resultado de versionamento: ${summary.versioningResult}`,
      `Commit hash: ${summary.commitHash ?? "n/a"}`,
      `Resultado observavel: ${summary.summary}`,
    ];
  }

  private buildRunSpecsSpecAuditLines(
    summary: NonNullable<RunSpecsFlowSummary["specAudit"]>,
  ): string[] {
    return [
      `Gaps residuais detectados: ${summary.residualGapsDetected ? "sim" : "nao"}`,
      `Follow-up tickets criados: ${summary.followUpTicketsCreated}`,
      `Status da spec apos auditoria: ${summary.specStatusAfterAudit}`,
      `Resultado observavel da auditoria: ${summary.summary}`,
    ];
  }

  private buildWorkflowGapAnalysisDetailLines(
    summary: NonNullable<RunSpecsFlowSummary["workflowGapAnalysis"]>,
  ): string[] {
    const lines = [
      `Classificacao: ${summary.classification}`,
      `Confianca: ${summary.confidence}`,
      `Modo de entrada: ${summary.inputMode}`,
      `Elegivel para publication: ${summary.publicationEligibility ? "sim" : "nao"}`,
      `Sintese da analise: ${summary.summary}`,
      `Hipotese causal: ${summary.causalHypothesis}`,
      `Beneficio esperado: ${summary.benefitSummary}`,
    ];

    if (summary.followUpTicketPaths.length === 0) {
      lines.push("Follow-ups funcionais considerados: fallback spec + audit");
    } else {
      lines.push(`Follow-ups funcionais considerados: ${summary.followUpTicketPaths.join(", ")}`);
    }

    if (summary.findings.length === 0) {
      lines.push("Achados sistemicos: nenhum");
    } else {
      lines.push("Achados sistemicos:");
      for (const finding of summary.findings) {
        const requirementSuffix =
          finding.requirementRefs.length > 0
            ? ` [${finding.requirementRefs.join(", ")}]`
            : "";
        lines.push(`- ${finding.summary}${requirementSuffix}`);
      }
    }

    if (summary.historicalReference) {
      lines.push("Referencia historica pre-run-all: sim");
      lines.push(`Resumo da referencia historica: ${summary.historicalReference.summary}`);
      lines.push(
        `Ticket/artefato preexistente: ${summary.historicalReference.ticketPath ?? "apenas achados/fingerprints da rodada pre-run-all"}`,
      );
      lines.push(
        `Fingerprints correlacionados: ${summary.historicalReference.findingFingerprints.join(", ")}`,
      );
    }

    if (summary.limitation) {
      lines.push(`Limitacao operacional: ${summary.limitation.code}`);
      lines.push(`Detalhe da limitacao: ${summary.limitation.detail}`);
    }

    return lines;
  }

  private buildWorkflowImprovementTicketLines(
    summary: NonNullable<RunSpecsFlowSummary["workflowImprovementTicket"]>,
  ): string[] {
    const lines = [`Resultado: ${summary.status}`, `Detalhe: ${summary.detail}`];

    if (summary.targetRepoDisplayPath) {
      lines.push(`Repositorio alvo: ${summary.targetRepoDisplayPath}`);
    }
    if (summary.ticketPath) {
      lines.push(`Ticket publicado/reutilizado: ${summary.ticketPath}`);
    }
    if (summary.commitPushId) {
      lines.push(`Commit/push dedicado: ${summary.commitPushId}`);
    }
    if (summary.limitationCode) {
      lines.push(`Limitacao de publication: ${summary.limitationCode}`);
    }

    return lines;
  }

  private buildChainedRunAllSummaryLines(summary: RunAllFlowSummary): string[] {
    const lines = [
      `Resultado: ${this.renderOutcome(summary.outcome)}`,
      `Fase final do /run_all: ${summary.finalStage}`,
      `Motivo de encerramento do /run_all: ${summary.completionReason}`,
      `Tickets processados no /run_all: ${summary.processedTicketsCount}/${summary.maxTicketsPerRound}`,
    ];

    if (summary.lastProcessedTicket) {
      lines.push(`Ultimo ticket processado: ${summary.lastProcessedTicket}`);
    }
    if (summary.selectionTicket) {
      lines.push(
        summary.completionReason === "blocked-tickets-only"
          ? `Proximo ticket bloqueado: ${summary.selectionTicket}`
          : `Ticket afetado na selecao: ${summary.selectionTicket}`,
      );
    }
    if (summary.details) {
      lines.push(`Leitura operacional do /run_all: ${summary.details}`);
    }

    return lines;
  }

  private buildTimingDetailLines<Stage extends string>(
    timing: FlowTimingSnapshot<Stage>,
    orderedStages: readonly Stage[],
  ): string[] {
    const lines = [
      `Tempo total: ${this.formatDurationMs(timing.totalDurationMs)}`,
      "Duracao por fase:",
    ];

    const timedStages = this.listTimedStagesInOrder(timing, orderedStages);
    if (timedStages.length === 0) {
      lines.push("- nenhuma fase medida");
    } else {
      for (const [stage, durationMs] of timedStages) {
        lines.push(`- ${stage}: ${this.formatDurationMs(durationMs)}`);
      }
    }

    if (timing.interruptedStage) {
      lines.push(`Fase interrompida: ${timing.interruptedStage}`);
    }

    return lines;
  }

  private appendTimingLines<Stage extends string>(
    lines: string[],
    title: string,
    timing: FlowTimingSnapshot<Stage>,
    orderedStages: readonly Stage[],
  ): void {
    lines.push(title);
    lines.push(...this.buildTimingDetailLines(timing, orderedStages));
  }

  private listTimedStagesInOrder<Stage extends string>(
    timing: FlowTimingSnapshot<Stage>,
    orderedStages: readonly Stage[],
  ): Array<[string, number]> {
    const orderedDurationEntries: Array<[string, number]> = [];
    for (const stage of orderedStages) {
      const durationMs = timing.durationsByStageMs[stage];
      if (typeof durationMs === "number") {
        orderedDurationEntries.push([stage, durationMs]);
      }
    }

    const orderedStageSet = new Set<string>(orderedStages);
    const extraDurationEntries = Object.entries(timing.durationsByStageMs)
      .filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && !orderedStageSet.has(entry[0]),
      )
      .sort((left, right) => left[0].localeCompare(right[0]));

    return [...orderedDurationEntries, ...extraDurationEntries];
  }

  private formatDurationMs(durationMs: number): string {
    const normalizedDurationMs = Math.max(0, Math.floor(durationMs));
    const totalSeconds = Math.floor(normalizedDurationMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (hours > 0 || minutes > 0) {
      parts.push(`${minutes}m`);
    }
    parts.push(`${seconds}s`);

    return `${parts.join(" ")} (${normalizedDurationMs} ms)`;
  }

  private buildTicketFinalSummaryMessage(summary: TicketFinalSummary): string {
    const status = this.renderOutcome(summary.status);
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
    } else {
      lines.push(`Erro: ${summary.errorMessage}`);
      if (summary.codexStdoutPreview) {
        lines.push("Mensagem final do Codex:");
        lines.push(this.limitDiagnosticPreview(summary.codexStdoutPreview));
      }
      if (summary.codexStderrPreview) {
        lines.push("Transcricao tecnica do Codex CLI:");
        lines.push(this.limitDiagnosticPreview(summary.codexStderrPreview));
      }
    }

    lines.push("Tempos do ticket");
    lines.push(...this.buildTimingDetailLines(summary.timing, TICKET_TIMING_STAGE_ORDER));
    return lines.join("\n");
  }

  private buildRunSpecsTriageMilestoneMessage(event: RunSpecsTriageLifecycleEvent): string {
    const sourceCommand = this.resolveRunSpecsSourceCommand(event.sourceCommand);
    const entryPoint = this.resolveRunSpecsEntryPoint(event.entryPoint);
    const sections: EditorialSection[] = [
      {
        title: "Visao geral da triagem",
        lines: [
          `Spec: ${event.spec.fileName}`,
          `Caminho da spec: ${event.spec.path}`,
          `Comando de origem: ${sourceCommand}`,
          `Ponto de entrada: ${entryPoint}`,
          `Resultado: ${this.renderOutcome(event.outcome)}`,
          `Fase final: ${event.finalStage}`,
          `Proxima acao: ${event.nextAction}`,
          ...(event.details ? [`Leitura operacional: ${event.details}`] : []),
        ],
      },
    ];

    if (event.specTicketValidation) {
      sections.push({
        title: "Snapshot do gate funcional pre-/run_all",
        lines: [
          `Veredito: ${event.specTicketValidation.verdict}`,
          `Confianca final: ${event.specTicketValidation.confidence}`,
          `Motivo final: ${event.specTicketValidation.finalReason}`,
          `Ciclos executados: ${event.specTicketValidation.cyclesExecuted}`,
          `Sintese do gate: ${event.specTicketValidation.summary}`,
        ],
      });
    }

    if (event.specTicketDerivationRetrospective) {
      sections.push({
        title: "Snapshot da retrospectiva da derivacao",
        lines: [
          `Decisao: ${event.specTicketDerivationRetrospective.decision}`,
          `Gaps revisados detectados: ${event.specTicketDerivationRetrospective.reviewedGapHistoryDetected ? "sim" : "nao"}`,
          ...(event.specTicketDerivationRetrospective.analysis
            ? [
                `Classificacao: ${event.specTicketDerivationRetrospective.analysis.classification}`,
                `Confianca: ${event.specTicketDerivationRetrospective.analysis.confidence}`,
              ]
            : []),
          `Sintese da retrospectiva: ${event.specTicketDerivationRetrospective.summary}`,
        ],
      });
    }

    sections.push({
      title: "Timing da triagem pre-/run_all",
      lines: this.buildTimingDetailLines(event.timing, RUN_SPECS_TRIAGE_TIMING_STAGE_ORDER),
    });

    return this.renderEditorialMessage(["🧭 Marco da triagem /run_specs"], sections);
  }

  private async resolveStatusCodexPreferences(
    state: RunnerState,
  ): Promise<Map<string, CodexResolvedProjectPreferences | Error>> {
    const projects = new Map<string, ProjectRef>();
    const registerProject = (project: ProjectRef | null | undefined): void => {
      if (!project) {
        return;
      }

      const key = this.buildProjectKey(project);
      if (!projects.has(key)) {
        projects.set(key, { ...project });
      }
    };

    registerProject(state.activeProject);
    registerProject(state.discoverSpecSession?.activeProjectSnapshot);
    registerProject(state.planSpecSession?.activeProjectSnapshot);
    registerProject(state.codexChatSession?.activeProjectSnapshot);

    const results = new Map<string, CodexResolvedProjectPreferences | Error>();
    await Promise.all(
      Array.from(projects.values()).map(async (project) => {
        try {
          const resolved = await this.controls.resolveCodexProjectPreferences(project);
          results.set(this.buildProjectKey(project), resolved);
        } catch (error) {
          results.set(
            this.buildProjectKey(project),
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }),
    );

    return results;
  }

  private buildStatusReply(
    state: RunnerState,
    codexPreferencesByProject: Map<string, CodexResolvedProjectPreferences | Error> = new Map(),
  ): string {
    const lines = [
      `Runner: ${state.isRunning ? "ativo" : "inativo"}`,
      `Pausado: ${state.isPaused ? "sim" : "não"}`,
      `Fase: ${state.phase}`,
      `Ticket atual: ${state.currentTicket ?? "nenhum"}`,
      `Spec atual: ${state.currentSpec ?? "nenhuma"}`,
      `Projeto ativo: ${state.activeProject?.name ?? "nenhum"}`,
      `Caminho do projeto ativo: ${state.activeProject?.path ?? "(indefinido)"}`,
      `Runners ativos (global): ${state.capacity.used}/${state.capacity.limit}`,
      `Sessão /discover_spec: ${state.discoverSpecSession ? "ativa" : "inativa"}`,
      `Sessão /plan_spec: ${state.planSpecSession ? "ativa" : "inativa"}`,
      `Sessão /codex_chat: ${state.codexChatSession ? "ativa" : "inativa"}`,
      `Última mensagem: ${state.lastMessage}`,
      `Atualizado em: ${state.updatedAt.toISOString()}`,
    ];

    this.appendStatusCodexPreferences(lines, "Projeto ativo", state.activeProject, codexPreferencesByProject);

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
          ...(slot.kind === "run-specs" && slot.runSpecsSourceCommand
            ? [`origem: ${this.resolveRunSpecsSourceCommand(slot.runSpecsSourceCommand)}`]
            : []),
          ...(slot.kind === "run-specs" && slot.runSpecsEntryPoint
            ? [`entrada: ${this.resolveRunSpecsEntryPoint(slot.runSpecsEntryPoint)}`]
            : []),
        ];
        lines.push(details.join(" | "));
      }
    }

    if (state.lastRunFlowSummary) {
      lines.push(
        `Último fluxo concluído: ${state.lastRunFlowSummary.flow} (${state.lastRunFlowSummary.outcome})`,
        `Última fase final de fluxo: ${state.lastRunFlowSummary.finalStage}`,
        `Último motivo de encerramento: ${state.lastRunFlowSummary.completionReason}`,
        `Último fluxo encerrado em: ${state.lastRunFlowSummary.timestampUtc}`,
      );
      if (state.lastRunFlowSummary.flow === "run-specs") {
        lines.push(
          `Última spec de fluxo: ${state.lastRunFlowSummary.spec.fileName}`,
          `Último comando de origem do fluxo: ${this.resolveRunSpecsSourceCommand(state.lastRunFlowSummary.sourceCommand)}`,
          `Último ponto de entrada do fluxo: ${this.resolveRunSpecsEntryPoint(state.lastRunFlowSummary.entryPoint)}`,
        );
      } else {
        if (state.lastRunFlowSummary.lastProcessedTicket) {
          lines.push(`Último ticket processado no fluxo: ${state.lastRunFlowSummary.lastProcessedTicket}`);
        }
        if (state.lastRunFlowSummary.selectionTicket) {
          lines.push(`Último ticket afetado na seleção: ${state.lastRunFlowSummary.selectionTicket}`);
        }
      }
      if (state.lastRunFlowSummary.details) {
        lines.push(`Detalhes do último fluxo: ${state.lastRunFlowSummary.details}`);
      }
    } else {
      lines.push("Último fluxo concluído: nenhum");
    }

    if (!state.lastRunFlowNotificationEvent) {
      lines.push("Último resumo final de fluxo notificado: nenhum");
    } else {
      const { summary, delivery } = state.lastRunFlowNotificationEvent;
      lines.push(
        `Último resumo final de fluxo notificado: ${summary.flow} (${summary.outcome})`,
        `Fase final do fluxo notificado: ${summary.finalStage}`,
        `Fluxo notificado em: ${delivery.deliveredAtUtc}`,
        `Chat do fluxo notificado: ${delivery.destinationChatId}`,
      );
      if (typeof delivery.attempts === "number") {
        lines.push(
          `Tentativas até entrega do fluxo: ${delivery.attempts}/${delivery.maxAttempts ?? delivery.attempts}`,
        );
      }
      if (typeof delivery.chunkCount === "number") {
        lines.push(`Partes do resumo de fluxo enviadas: ${delivery.chunkCount}`);
      }
    }

    if (!state.lastRunFlowNotificationFailure) {
      lines.push("Última falha de notificação de fluxo: nenhuma");
    } else {
      const { summary, failure } = state.lastRunFlowNotificationFailure;
      lines.push(
        `Última falha de notificação de fluxo: ${summary.flow} (${summary.outcome})`,
        `Fase com falha de notificação de fluxo: ${summary.finalStage}`,
        `Falha de fluxo registrada em: ${failure.failedAtUtc}`,
        `Tentativas até falha do fluxo: ${failure.attempts}/${failure.maxAttempts}`,
        `Classe do erro de notificação de fluxo: ${failure.errorClass}`,
        `Erro de notificação de fluxo: ${failure.errorMessage}`,
        `Retentável no fluxo: ${failure.retryable ? "sim" : "nao"}`,
      );
      if (failure.destinationChatId) {
        lines.push(`Chat de notificação de fluxo com falha: ${failure.destinationChatId}`);
      }
      if (failure.errorCode) {
        lines.push(`Código do erro de notificação de fluxo: ${failure.errorCode}`);
      }
      if (typeof failure.failedChunkIndex === "number") {
        lines.push(
          `Parte do resumo de fluxo com falha: ${failure.failedChunkIndex}/${failure.chunkCount ?? failure.failedChunkIndex}`,
        );
      }
    }

    if (state.discoverSpecSession) {
      lines.push(
        `Fase /discover_spec: ${state.discoverSpecSession.phase}`,
        `Projeto da sessão /discover_spec: ${state.discoverSpecSession.activeProjectSnapshot.name}`,
        `Início da sessão /discover_spec: ${state.discoverSpecSession.startedAt.toISOString()}`,
        `Última atividade /discover_spec: ${state.discoverSpecSession.lastActivityAt.toISOString()}`,
        `Última atividade Codex /discover_spec: ${state.discoverSpecSession.lastCodexActivityAt?.toISOString() ?? "(ainda sem saída observável)"}`,
      );
      this.appendStatusCodexPreferences(
        lines,
        "Seleção atual /discover_spec",
        state.discoverSpecSession.activeProjectSnapshot,
        codexPreferencesByProject,
      );
      if (
        state.discoverSpecSession.observedModel &&
        state.discoverSpecSession.observedReasoningEffort
      ) {
        lines.push(
          `Último turn_context /discover_spec: ${state.discoverSpecSession.observedModel} | reasoning ${state.discoverSpecSession.observedReasoningEffort}`,
        );
      }
      if (state.discoverSpecSession.observedAt) {
        lines.push(
          `Turn_context observado em /discover_spec: ${state.discoverSpecSession.observedAt.toISOString()}`,
        );
      }
      if (state.discoverSpecSession.waitingCodexSinceAt) {
        lines.push(
          `Aguardando Codex /discover_spec desde: ${state.discoverSpecSession.waitingCodexSinceAt.toISOString()}`,
        );
      }
      if (state.discoverSpecSession.lastCodexStream) {
        lines.push(`Último stream Codex /discover_spec: ${state.discoverSpecSession.lastCodexStream}`);
      }
      if (state.discoverSpecSession.lastCodexPreview) {
        lines.push(
          `Preview da última saída Codex /discover_spec: ${state.discoverSpecSession.lastCodexPreview}`,
        );
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
      this.appendStatusCodexPreferences(
        lines,
        "Seleção atual /plan_spec",
        state.planSpecSession.activeProjectSnapshot,
        codexPreferencesByProject,
      );
      if (state.planSpecSession.observedModel && state.planSpecSession.observedReasoningEffort) {
        lines.push(
          `Último turn_context /plan_spec: ${state.planSpecSession.observedModel} | reasoning ${state.planSpecSession.observedReasoningEffort}`,
        );
      }
      if (state.planSpecSession.observedAt) {
        lines.push(`Turn_context observado em /plan_spec: ${state.planSpecSession.observedAt.toISOString()}`);
      }
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
      this.appendStatusCodexPreferences(
        lines,
        "Seleção atual /codex_chat",
        state.codexChatSession.activeProjectSnapshot,
        codexPreferencesByProject,
      );
      if (state.codexChatSession.observedModel && state.codexChatSession.observedReasoningEffort) {
        lines.push(
          `Último turn_context /codex_chat: ${state.codexChatSession.observedModel} | reasoning ${state.codexChatSession.observedReasoningEffort}`,
        );
      }
      if (state.codexChatSession.observedAt) {
        lines.push(`Turn_context observado em /codex_chat: ${state.codexChatSession.observedAt.toISOString()}`);
      }
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

  private resolveRunSpecsSourceCommand(
    sourceCommand: RunSpecsFlowSummary["sourceCommand"] | string | null | undefined,
  ): string {
    return sourceCommand && sourceCommand.trim() ? sourceCommand : "/run_specs";
  }

  private resolveRunSpecsEntryPoint(
    entryPoint: RunSpecsFlowSummary["entryPoint"] | string | null | undefined,
  ): string {
    return entryPoint && entryPoint.trim() ? entryPoint : "spec-triage";
  }

  private appendStatusCodexPreferences(
    lines: string[],
    label: string,
    project: ProjectRef | null | undefined,
    codexPreferencesByProject: Map<string, CodexResolvedProjectPreferences | Error>,
  ): void {
    if (!project) {
      lines.push(`${label} Codex: projeto indisponivel`);
      return;
    }

    const key = this.buildProjectKey(project);
    const resolved = codexPreferencesByProject.get(key);
    if (!resolved) {
      lines.push(`${label} Codex: preferências ainda nao resolvidas`);
      return;
    }

    if (resolved instanceof Error) {
      lines.push(`${label} Codex: erro ao resolver preferências (${resolved.message})`);
      return;
    }

    lines.push(
      `${label} Codex: ${resolved.modelDisplayName} | reasoning ${resolved.reasoningEffort} | velocidade ${this.renderCodexSpeedLabel(resolved.speed)} | origem ${this.renderCodexPreferenceSource(resolved.source)}`,
    );
    if (!resolved.modelSelectable) {
      lines.push(`${label} disponibilidade do modelo: atual, indisponivel para nova selecao`);
    }
    if (resolved.reasoningAdjustedFrom) {
      lines.push(
        `${label} reasoning ajustado automaticamente: ${resolved.reasoningAdjustedFrom} -> ${resolved.reasoningEffort}`,
      );
    }
    if (resolved.speedAdjustedFrom) {
      lines.push(
        `${label} velocidade ajustada automaticamente: ${this.renderCodexSpeedLabel(resolved.speedAdjustedFrom)} -> ${this.renderCodexSpeedLabel(resolved.speed)}`,
      );
    }
    if (!resolved.fastModeSupported) {
      lines.push(`${label} fast mode: indisponivel para o modelo atual`);
    }
  }

  private buildProjectKey(project: ProjectRef): string {
    return `${project.name}::${project.path}`;
  }

  private renderCodexPreferenceSource(source: CodexResolvedProjectPreferences["source"]): string {
    if (source === "runner-local") {
      return "runner-local";
    }

    if (source === "codex-config") {
      return "config-local";
    }

    if (source === "mixed") {
      return "misto";
    }

    return "catalogo";
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

    if (kind === "discover-spec") {
      return "/discover_spec";
    }

    return "/plan_spec";
  }
}
