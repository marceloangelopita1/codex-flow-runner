import { loadEnv } from "./config/env.js";
import { resolveActiveProject } from "./core/active-project-resolver.js";
import { Logger } from "./core/logger.js";
import { TicketRunner } from "./core/runner.js";
import { FileSystemActiveProjectStore } from "./integrations/active-project-store.js";
import { CodexCliTicketFlowClient } from "./integrations/codex-client.js";
import { GitCliVersioning } from "./integrations/git-client.js";
import { FileSystemProjectDiscovery } from "./integrations/project-discovery.js";
import { FileSystemTicketQueue } from "./integrations/ticket-queue.js";
import { TelegramController } from "./integrations/telegram-bot.js";
import {
  TicketFinalSummary,
  TicketNotificationDelivery,
} from "./types/ticket-final-summary.js";

const bootstrap = async () => {
  const env = loadEnv();
  const logger = new Logger();

  const projectDiscovery = new FileSystemProjectDiscovery();
  const activeProjectStore = new FileSystemActiveProjectStore(env.PROJECTS_ROOT_PATH);
  const activeProjectResolution = await resolveActiveProject(env.PROJECTS_ROOT_PATH, {
    discovery: projectDiscovery,
    store: activeProjectStore,
  });

  const activeProjectPath = activeProjectResolution.activeProject.path;
  logger.info("Projeto ativo global resolvido no bootstrap", {
    projectsRootPath: env.PROJECTS_ROOT_PATH,
    activeProjectName: activeProjectResolution.activeProject.name,
    activeProjectPath,
    selectionReason: activeProjectResolution.selectionReason,
    eligibleProjectsCount: activeProjectResolution.eligibleProjects.length,
    stateFilePath: activeProjectStore.stateFilePath,
  });

  const queue = new FileSystemTicketQueue(activeProjectPath);
  const codex = new CodexCliTicketFlowClient(activeProjectPath, logger);
  const gitVersioning = new GitCliVersioning(activeProjectPath);
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
    queue,
    codex,
    gitVersioning,
    notifyTicketFinalSummary,
  );

  telegram = new TelegramController(
    env.TELEGRAM_BOT_TOKEN,
    logger,
    runner.getState,
    {
      runAll: runner.requestRunAll,
      pause: runner.requestPause,
      resume: runner.requestResume,
    },
    env.TELEGRAM_ALLOWED_CHAT_ID,
  );

  await telegram.start();
  logger.info("Runner aguardando comando /run-all no Telegram", {
    activeProjectName: activeProjectResolution.activeProject.name,
    activeProjectPath,
  });

  const handleShutdown = async (signal: "SIGINT" | "SIGTERM") => {
    logger.warn("Sinal recebido, encerrando...", { signal });
    runner.shutdown();
    await telegram.stop(signal);
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void handleShutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void handleShutdown("SIGTERM");
  });
};

void bootstrap();
