import { loadEnv } from "./config/env.js";
import { resolveActiveProject } from "./core/active-project-resolver.js";
import { Logger } from "./core/logger.js";
import { ActiveProjectSelectionService } from "./core/project-selection.js";
import { RunnerRoundDependencies, TicketRunner } from "./core/runner.js";
import { FileSystemActiveProjectStore } from "./integrations/active-project-store.js";
import { CodexCliTicketFlowClient } from "./integrations/codex-client.js";
import { GitCliVersioning } from "./integrations/git-client.js";
import { FileSystemProjectDiscovery } from "./integrations/project-discovery.js";
import { FileSystemSpecDiscovery } from "./integrations/spec-discovery.js";
import { FileSystemTicketQueue } from "./integrations/ticket-queue.js";
import { TelegramController } from "./integrations/telegram-bot.js";
import {
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "./types/ticket-final-summary.js";

type DependencyResolutionSource = "bootstrap" | "run-all";

const bootstrap = async () => {
  const env = loadEnv();
  const logger = new Logger();

  const projectDiscovery = new FileSystemProjectDiscovery();
  const specDiscovery = new FileSystemSpecDiscovery();
  const activeProjectStore = new FileSystemActiveProjectStore(env.PROJECTS_ROOT_PATH);
  const projectSelection = new ActiveProjectSelectionService(env.PROJECTS_ROOT_PATH, {
    discovery: projectDiscovery,
    store: activeProjectStore,
  });

  const resolveRunnerRoundDependencies = async (
    source: DependencyResolutionSource,
  ): Promise<RunnerRoundDependencies> => {
    const activeProjectResolution = await resolveActiveProject(env.PROJECTS_ROOT_PATH, {
      discovery: projectDiscovery,
      store: activeProjectStore,
    });

    const activeProjectPath = activeProjectResolution.activeProject.path;
    logger.info("Projeto ativo global resolvido", {
      source,
      projectsRootPath: env.PROJECTS_ROOT_PATH,
      activeProjectName: activeProjectResolution.activeProject.name,
      activeProjectPath,
      selectionReason: activeProjectResolution.selectionReason,
      eligibleProjectsCount: activeProjectResolution.eligibleProjects.length,
      stateFilePath: activeProjectStore.stateFilePath,
    });

    return {
      activeProject: activeProjectResolution.activeProject,
      queue: new FileSystemTicketQueue(activeProjectPath),
      codexClient: new CodexCliTicketFlowClient(activeProjectPath, logger),
      gitVersioning: new GitCliVersioning(activeProjectPath),
    };
  };

  const initialRoundDependencies = await resolveRunnerRoundDependencies("bootstrap");
  let telegram: TelegramController | null = null;

  const notifyTicketFinalSummary = async (
    summary: TicketFinalSummary,
  ): Promise<TicketNotificationDelivery | null> => {
    if (!telegram) {
      logger.warn("Resumo final de ticket nao enviado: Telegram indisponivel no bootstrap", {
        ticket: summary.ticket,
        status: summary.status,
      });
      return null;
    }

    return telegram.sendTicketFinalSummary(summary);
  };

  const runner = new TicketRunner(
    env,
    logger,
    initialRoundDependencies,
    () => resolveRunnerRoundDependencies("run-all"),
    notifyTicketFinalSummary,
    {
      planSpecEventHandlers: {
        onQuestion: async (chatId, event) => {
          if (!telegram) {
            logger.warn("Pergunta de /plan_spec nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendPlanSpecQuestion(chatId, event.question);
        },
        onFinal: async (chatId, event) => {
          if (!telegram) {
            logger.warn("Finalizacao de /plan_spec nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendPlanSpecFinalization(chatId, event.final);
        },
        onRawOutput: async (chatId, event) => {
          if (!env.PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM) {
            return;
          }

          if (!telegram) {
            logger.warn("Saida raw de /plan_spec nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendPlanSpecRawOutput(chatId, event.text);
        },
        onFailure: async (chatId, details) => {
          if (!telegram) {
            logger.warn("Falha de /plan_spec nao enviada: Telegram indisponivel", {
              chatId,
              details,
            });
            return;
          }
          await telegram.sendPlanSpecFailure(chatId, details);
        },
        onLifecycleMessage: async (chatId, message) => {
          if (!telegram) {
            logger.warn("Mensagem de lifecycle de /plan_spec nao enviada: Telegram indisponivel", {
              chatId,
              message,
            });
            return;
          }
          await telegram.sendPlanSpecMessage(chatId, message);
        },
      },
      codexChatEventHandlers: {
        onOutput: async (chatId, event) => {
          if (!telegram) {
            logger.warn("Saida de /codex_chat nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendCodexChatOutput(chatId, event.text);
        },
        onFailure: async (chatId, details) => {
          if (!telegram) {
            logger.warn("Falha de /codex_chat nao enviada: Telegram indisponivel", {
              chatId,
              details,
            });
            return;
          }
          await telegram.sendCodexChatFailure(chatId, details);
        },
        onLifecycleMessage: async (chatId, message) => {
          if (!telegram) {
            logger.warn("Mensagem de lifecycle de /codex_chat nao enviada: Telegram indisponivel", {
              chatId,
              message,
            });
            return;
          }
          await telegram.sendCodexChatMessage(chatId, message);
        },
      },
      runSpecsEventHandlers: {
        onTriageMilestone: async (event) => {
          if (!telegram) {
            logger.warn(
              "Milestone de triagem de /run_specs nao enviada: Telegram indisponivel",
              {
                specFileName: event.spec.fileName,
                outcome: event.outcome,
                finalStage: event.finalStage,
              },
            );
            return;
          }

          await telegram.sendRunSpecsTriageMilestone(event);
        },
      },
    },
  );

  const resolveActiveProjectPath = (operation: "specs" | "tickets"): string => {
    const activeProject = runner.getState().activeProject;
    if (!activeProject) {
      throw new Error(`Projeto ativo indisponivel para operacoes de ${operation}.`);
    }

    return activeProject.path;
  };

  telegram = new TelegramController(
    env.TELEGRAM_BOT_TOKEN,
    logger,
    runner.getState,
    {
      runAll: runner.requestRunAll,
      runSpecs: runner.requestRunSpecs,
      runSelectedTicket: runner.requestRunSelectedTicket,
      startCodexChatSession: runner.startCodexChatSession,
      submitCodexChatInput: runner.submitCodexChatInput,
      cancelCodexChatSession: runner.cancelCodexChatSession,
      startPlanSpecSession: runner.startPlanSpecSession,
      submitPlanSpecInput: runner.submitPlanSpecInput,
      cancelPlanSpecSession: runner.cancelPlanSpecSession,
      listEligibleSpecs: () =>
        specDiscovery.listEligibleSpecs(resolveActiveProjectPath("specs")),
      validateRunSpecsTarget: (specInput) =>
        specDiscovery.validateSpecEligibility(resolveActiveProjectPath("specs"), specInput),
      listOpenTickets: async () => {
        const queue = new FileSystemTicketQueue(resolveActiveProjectPath("tickets"));
        const tickets = await queue.listOpenTickets();
        return tickets.map((ticket) => ({
          fileName: ticket.name,
        }));
      },
      readOpenTicket: async (ticketFileName) => {
        const queue = new FileSystemTicketQueue(resolveActiveProjectPath("tickets"));
        const result = await queue.readOpenTicket(ticketFileName);
        if (result.status === "found") {
          return {
            status: "found" as const,
            ticket: {
              fileName: result.ticket.name,
            },
            content: result.content,
          };
        }

        return {
          status: result.status,
          ticketFileName: result.ticketName,
        };
      },
      pause: runner.requestPause,
      resume: runner.requestResume,
      onPlanSpecQuestionOptionSelected: runner.handlePlanSpecQuestionOptionSelection,
      onPlanSpecFinalActionSelected: runner.handlePlanSpecFinalActionSelection,
      listProjects: projectSelection.listProjects.bind(projectSelection),
      selectProjectByName: async (projectName) => {
        const previousActiveProject = runner.getState().activeProject;
        const selection = await projectSelection.selectProjectByName(projectName);
        if (selection.status !== "selected") {
          return selection;
        }

        const sync = runner.syncActiveProject(selection.activeProject);
        if (sync.status === "blocked-plan-spec") {
          if (selection.changed && previousActiveProject) {
            try {
              await activeProjectStore.save(previousActiveProject);
            } catch (error) {
              logger.error("Falha ao restaurar projeto ativo persistido apos bloqueio de troca", {
                projectName: previousActiveProject.name,
                projectPath: previousActiveProject.path,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return {
            status: sync.status,
          };
        }

        return selection;
      },
    },
    env.TELEGRAM_ALLOWED_CHAT_ID,
  );

  await telegram.start();
  logger.info("Encaminhamento de saida raw /plan_spec para Telegram", {
    enabled: env.PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM,
  });
  logger.info("Runner aguardando comando /run-all no Telegram", {
    activeProjectName: initialRoundDependencies.activeProject.name,
    activeProjectPath: initialRoundDependencies.activeProject.path,
  });

  let shutdownPromise: Promise<void> | null = null;
  const handleShutdown = (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    if (shutdownPromise) {
      logger.warn("Sinal adicional recebido durante shutdown em andamento", {
        signal,
      });
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      const shutdownStartedAt = Date.now();
      logger.warn("Sinal recebido, iniciando shutdown gracioso", {
        signal,
        timeoutMs: env.SHUTDOWN_DRAIN_TIMEOUT_MS,
      });

      const drain = await runner.shutdown({
        timeoutMs: env.SHUTDOWN_DRAIN_TIMEOUT_MS,
      });
      logger.info("Drain do runner finalizado", {
        signal,
        timeoutMs: drain.timeoutMs,
        timedOut: drain.timedOut,
        pendingTasks: drain.pendingTasks,
        durationMs: drain.durationMs,
      });

      await telegram.stop(signal);
      logger.info("Shutdown gracioso concluido", {
        signal,
        durationMs: Date.now() - shutdownStartedAt,
      });
      process.exit(0);
    })().catch((error) => {
      logger.error("Falha durante shutdown gracioso", {
        signal,
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });

    return shutdownPromise;
  };

  process.on("SIGINT", () => {
    void handleShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void handleShutdown("SIGTERM");
  });
};

void bootstrap();
