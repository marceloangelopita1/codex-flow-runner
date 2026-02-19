import { z } from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_ALLOWED_CHAT_ID: z.string().min(1).optional(),
  PROJECTS_ROOT_PATH: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
});

export type AppEnv = z.infer<typeof envSchema>;

const loadDotEnvFromCwd = (): void => {
  try {
    process.loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }

    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Falha ao carregar .env: ${details}`);
  }
};

export const parseEnv = (source: NodeJS.ProcessEnv): AppEnv => {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuracao invalida de ambiente: ${details}`);
  }

  return parsed.data;
};

export const loadEnv = (): AppEnv => {
  loadDotEnvFromCwd();
  return parseEnv(process.env);
};
