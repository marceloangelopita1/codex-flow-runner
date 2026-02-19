import { z } from "zod";

const envSchema = z.object({
  CODEX_API_KEY: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_ALLOWED_CHAT_ID: z.string().min(1).optional(),
  REPO_PATH: z.string().min(1).default(process.cwd()),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  GIT_AUTO_PUSH: z.coerce.boolean().default(false),
});

export type AppEnv = z.infer<typeof envSchema>;

export const loadEnv = (): AppEnv => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuração inválida de ambiente: ${details}`);
  }

  return parsed.data;
};
