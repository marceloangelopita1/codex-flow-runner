import { loadEnv } from "./config/env.js";
import { Logger } from "./core/logger.js";
import { TicketRunner } from "./core/runner.js";
import { StubCodexTicketFlowClient } from "./integrations/codex-client.js";
import { FileSystemTicketQueue } from "./integrations/ticket-queue.js";
import { TelegramController } from "./integrations/telegram-bot.js";

const bootstrap = async () => {
  const env = loadEnv();
  const logger = new Logger();

  const queue = new FileSystemTicketQueue(env.REPO_PATH);
  const codex = new StubCodexTicketFlowClient(logger);
  const runner = new TicketRunner(env, logger, queue, codex);

  const telegram = new TelegramController(
    env.TELEGRAM_BOT_TOKEN,
    logger,
    runner.getState,
    { pause: runner.requestPause, resume: runner.requestResume },
    env.TELEGRAM_ALLOWED_CHAT_ID,
  );

  await telegram.start();

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

  await runner.runForever();
};

void bootstrap();
