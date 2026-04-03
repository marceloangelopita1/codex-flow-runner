import path from "node:path";
import { loadEnv } from "./config/env.js";
import { resolveActiveProject } from "./core/active-project-resolver.js";
import { DefaultCodexPreferencesService } from "./core/codex-preferences.js";
import { Logger } from "./core/logger.js";
import { ActiveProjectSelectionService } from "./core/project-selection.js";
import { ControlledTargetCheckupExecutor } from "./core/target-checkup.js";
import { ControlledTargetDeriveExecutor } from "./core/target-derive.js";
import { ControlledTargetInvestigateCaseExecutor } from "./core/target-investigate-case.js";
import { ControlledTargetPrepareExecutor } from "./core/target-prepare.js";
import { RunnerRoundDependencies, TicketRunner } from "./core/runner.js";
import { FileSystemActiveProjectStore } from "./integrations/active-project-store.js";
import { FileSystemCodexLocalConfigReader } from "./integrations/codex-config.js";
import { CodexCliTicketFlowClient } from "./integrations/codex-client.js";
import { FileSystemCodexModelCatalogReader } from "./integrations/codex-model-catalog.js";
import { FileSystemCodexProjectPreferencesStore } from "./integrations/codex-project-preferences-store.js";
import { GitCliVersioning } from "./integrations/git-client.js";
import { FileSystemProjectDiscovery } from "./integrations/project-discovery.js";
import { FileSystemSpecDiscovery } from "./integrations/spec-discovery.js";
import { FileSystemTicketQueue } from "./integrations/ticket-queue.js";
import { GitCliTargetCheckupGuard } from "./integrations/target-checkup-git-guard.js";
import { GitCliTargetDeriveGuard } from "./integrations/target-derive-git-guard.js";
import { CodexCliTargetInvestigateCaseRoundPreparer } from "./integrations/target-investigate-case-round-preparer.js";
import { GitCliTargetPrepareGuard } from "./integrations/target-prepare-git-guard.js";
import { FileSystemTargetProjectResolver } from "./integrations/target-project-resolver.js";
import { TelegramController } from "./integrations/telegram-bot.js";
import { FileSystemWorkflowImprovementTicketPublisher } from "./integrations/workflow-improvement-ticket-publisher.js";
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
  const codexProjectPreferencesStore = new FileSystemCodexProjectPreferencesStore(
    env.PROJECTS_ROOT_PATH,
  );
  const projectSelection = new ActiveProjectSelectionService(env.PROJECTS_ROOT_PATH, {
    discovery: projectDiscovery,
    store: activeProjectStore,
  });
  const runnerRepoPath = path.resolve(process.cwd());
  const targetProjectResolver = new FileSystemTargetProjectResolver(env.PROJECTS_ROOT_PATH);
  const createTargetCodexClient = (project: { name: string; path: string }) =>
    new CodexCliTicketFlowClient(
      project.path,
      logger,
      {},
      {
        resolveInvocationPreferences: async () => {
          const resolved = await codexPreferencesService.resolveProjectPreferences(project);
          return {
            model: resolved.model,
            reasoningEffort: resolved.reasoningEffort,
            speed: resolved.speed,
          };
        },
      },
    );
  const createTargetGitVersioning = (project: { path: string }) => new GitCliVersioning(project.path);
  const codexPreferencesService = new DefaultCodexPreferencesService(
    {
      catalogReader: new FileSystemCodexModelCatalogReader(),
      configReader: new FileSystemCodexLocalConfigReader(),
      store: codexProjectPreferencesStore,
    },
    logger,
  );

  const resolveRunnerRoundDependencies = async (
    source: DependencyResolutionSource,
  ): Promise<RunnerRoundDependencies> => {
    const activeProjectResolution = await resolveActiveProject(env.PROJECTS_ROOT_PATH, {
      discovery: projectDiscovery,
      store: activeProjectStore,
    });

    const activeProjectPath = activeProjectResolution.activeProject.path;
    const activeProjectRef = {
      ...activeProjectResolution.activeProject,
    };
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
      codexClient: new CodexCliTicketFlowClient(
        activeProjectPath,
        logger,
        {},
        {
          resolveInvocationPreferences: async () => {
            const resolved = await codexPreferencesService.resolveProjectPreferences(activeProjectRef);
            return {
              model: resolved.model,
              reasoningEffort: resolved.reasoningEffort,
              speed: resolved.speed,
            };
          },
        },
      ),
      gitVersioning: new GitCliVersioning(activeProjectPath),
    };
  };

  const initialRoundDependencies = await resolveRunnerRoundDependencies("bootstrap");
  const targetPrepareExecutor = new ControlledTargetPrepareExecutor({
    logger,
    targetProjectResolver,
    createCodexClient: createTargetCodexClient,
    createGitVersioning: createTargetGitVersioning,
    createGitGuard: (project) => new GitCliTargetPrepareGuard(project.path),
    runnerRepoPath,
  });
  const targetCheckupExecutor = new ControlledTargetCheckupExecutor({
    logger,
    targetProjectResolver,
    createCodexClient: createTargetCodexClient,
    createGitVersioning: createTargetGitVersioning,
    createGitGuard: (project) => new GitCliTargetCheckupGuard(project.path),
    runnerRepoPath,
  });
  const targetDeriveExecutor = new ControlledTargetDeriveExecutor({
    logger,
    targetProjectResolver,
    createCodexClient: createTargetCodexClient,
    createGitVersioning: createTargetGitVersioning,
    createGitGuard: (project) => new GitCliTargetDeriveGuard(project.path),
    runnerRepoPath,
  });
  const targetInvestigateCaseExecutor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver,
    roundPreparer: new CodexCliTargetInvestigateCaseRoundPreparer({
      logger,
      runnerRepoPath,
      createCodexClient: createTargetCodexClient,
      createGitVersioning: createTargetGitVersioning,
    }),
  });
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
      workflowImprovementTicketPublisher: new FileSystemWorkflowImprovementTicketPublisher(),
      discoverSpecEventHandlers: {
        onQuestion: async (chatId, event) => {
          if (!telegram) {
            logger.warn("Pergunta de /discover_spec nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendDiscoverSpecQuestion(chatId, event.question);
        },
        onFinal: async (chatId, event) => {
          if (!telegram) {
            logger.warn("Finalizacao de /discover_spec nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendDiscoverSpecFinalization(chatId, event.final);
        },
        onOutput: async (chatId, event) => {
          if (!env.PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM) {
            return;
          }

          if (!telegram) {
            logger.warn("Saida de /discover_spec nao enviada: Telegram indisponivel", {
              chatId,
            });
            return;
          }
          await telegram.sendDiscoverSpecOutput(chatId, event.text);
        },
        onFailure: async (chatId, details) => {
          if (!telegram) {
            logger.warn("Falha de /discover_spec nao enviada: Telegram indisponivel", {
              chatId,
              details,
            });
            return;
          }
          await telegram.sendDiscoverSpecFailure(chatId, details);
        },
        onLifecycleMessage: async (chatId, message) => {
          if (!telegram) {
            logger.warn("Mensagem de lifecycle de /discover_spec nao enviada: Telegram indisponivel", {
              chatId,
              message,
            });
            return;
          }
          await telegram.sendDiscoverSpecMessage(chatId, message);
        },
      },
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
          const delivery = await telegram.sendCodexChatOutput(chatId, event.text);
          return {
            channel: "telegram" as const,
            destinationChatId: delivery.destinationChatId,
            deliveredAtUtc: delivery.deliveredAtUtc,
            attempts: delivery.attempts,
            maxAttempts: delivery.maxAttempts,
            chunkCount: delivery.chunkCount,
          };
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
      runFlowEventHandlers: {
        onFlowCompleted: async (event) => {
          if (!telegram) {
            logger.warn("Resumo final de fluxo nao enviado: Telegram indisponivel", {
              flow: event.flow,
              outcome: event.outcome,
              finalStage: event.finalStage,
            });
            return;
          }

          return telegram.sendRunFlowSummary(event);
        },
      },
      targetFlowEventHandlers: {
        onMilestone: async (event) => {
          if (!telegram) {
            logger.warn("Milestone de fluxo target nao enviada: Telegram indisponivel", {
              flow: event.flow,
              command: event.command,
              targetProjectName: event.targetProjectName,
              targetProjectPath: event.targetProjectPath,
              milestone: event.milestone,
            });
            return;
          }

          await telegram.sendTargetFlowMilestone(event);
        },
      },
      codexPreferencesService,
      targetPrepareExecutor,
      targetCheckupExecutor,
      targetDeriveExecutor,
      targetInvestigateCaseExecutor,
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
      targetPrepare: runner.requestTargetPrepare,
      targetCheckup: runner.requestTargetCheckup,
      targetDerive: runner.requestTargetDerive,
      targetInvestigateCase: runner.requestTargetInvestigateCase,
      cancelTargetPrepare: runner.cancelTargetPrepare,
      cancelTargetCheckup: runner.cancelTargetCheckup,
      cancelTargetDerive: runner.cancelTargetDerive,
      cancelTargetInvestigateCase: runner.cancelTargetInvestigateCase,
      runAll: runner.requestRunAll,
      runSpecs: runner.requestRunSpecs,
      runSpecsFromValidation: runner.requestRunSpecsFromValidation,
      runSelectedTicket: runner.requestRunSelectedTicket,
      startDiscoverSpecSession: runner.startDiscoverSpecSession,
      submitDiscoverSpecInput: runner.submitDiscoverSpecInput,
      cancelDiscoverSpecSession: runner.cancelDiscoverSpecSession,
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
      listCodexModels: runner.listActiveProjectCodexModels,
      selectCodexModel: runner.selectActiveProjectCodexModel,
      listCodexReasoning: runner.listActiveProjectCodexReasoning,
      selectCodexReasoning: runner.selectActiveProjectCodexReasoning,
      listCodexSpeed: runner.listActiveProjectCodexSpeed,
      selectCodexSpeed: runner.selectActiveProjectCodexSpeed,
      resolveCodexProjectPreferences: runner.resolveCodexProjectPreferences,
      onDiscoverSpecQuestionOptionSelected: runner.handleDiscoverSpecQuestionOptionSelection,
      onDiscoverSpecFinalActionSelected: runner.handleDiscoverSpecFinalActionSelection,
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

        if (sync.status === "blocked-target-flow") {
          if (selection.changed && previousActiveProject) {
            try {
              await activeProjectStore.save(previousActiveProject);
            } catch (error) {
              logger.error("Falha ao restaurar projeto ativo persistido apos bloqueio de target flow", {
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
  logger.info("Feature flag de retrospectivas sistemicas do /run_specs", {
    featureFlag: "RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED",
    enabled: env.RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED,
    defaultValue: false,
    requiresRestart: true,
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
