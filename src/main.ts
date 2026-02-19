import { loadEnv } from "./config/env.js";
import { Logger } from "./core/logger.js";
import { TicketRunner } from "./core/runner.js";
import { LocalCodexTicketFlowClient } from "./integrations/codex-client.js";
import { GitCliVersioning } from "./integrations/git-client.js";
import { FileSystemTicketQueue } from "./integrations/ticket-queue.js";
import { TelegramController } from "./integrations/telegram-bot.js";

const bootstrap = async () => {
  const env = loadEnv();
  const logger = new Logger();

  const queue = new FileSystemTicketQueue(env.REPO_PATH);
  const codex = new LocalCodexTicketFlowClient(env.REPO_PATH, logger);
  const gitVersioning = new GitCliVersioning(env.REPO_PATH, env.GIT_AUTO_PUSH);
  const runner = new TicketRunner(env, logger, queue, codex, gitVersioning);

  const telegram = new TelegramController(
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
  logger.info("Runner aguardando comando /run-all no Telegram");

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
