import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const DIRECT_SEND_MESSAGE_PATTERN = /bot\.telegram\.sendMessage\(/g;
const ALLOWLIST = new Map([["src/integrations/telegram-bot.ts", 1]]);

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const readTypeScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return readTypeScriptFiles(absolutePath);
      }

      if (
        !entry.isFile() ||
        !absolutePath.endsWith(".ts") ||
        absolutePath.endsWith(".test.ts") ||
        absolutePath.endsWith(".d.ts")
      ) {
        return [];
      }

      return [absolutePath];
    }),
  );

  return files.flat();
};

test("guardrail impede novos call sites brutos de bot.telegram.sendMessage fora da camada central", async () => {
  const sourceRoot = join(repoRoot, "src");
  const files = await readTypeScriptFiles(sourceRoot);
  const findings: Array<{ file: string; count: number }> = [];

  for (const absolutePath of files) {
    const content = await readFile(absolutePath, "utf8");
    const matches = content.match(DIRECT_SEND_MESSAGE_PATTERN);
    if (!matches?.length) {
      continue;
    }

    findings.push({
      file: relative(repoRoot, absolutePath),
      count: matches.length,
    });
  }

  findings.sort((left, right) => left.file.localeCompare(right.file));

  const actual = new Map(findings.map((entry) => [entry.file, entry.count]));

  assert.deepEqual(
    actual,
    ALLOWLIST,
    [
      "Novos usos diretos de bot.telegram.sendMessage(...) foram detectados fora do allowlist da camada central.",
      `Encontrado: ${JSON.stringify(findings)}`,
      `Esperado: ${JSON.stringify(Array.from(ALLOWLIST.entries()).map(([file, count]) => ({ file, count })))}`,
      "Se a excecao for legitima, documente-a no README.md e atualize este guardrail no mesmo changeset.",
    ].join("\n"),
  );

  const telegramBotPath = join(repoRoot, "src/integrations/telegram-bot.ts");
  const telegramBotContent = await readFile(telegramBotPath, "utf8");
  const adapterSnippet = `sendMessage: (chatId: string, text: string, extra?: unknown) =>
        this.bot.telegram.sendMessage(`;

  assert.match(
    telegramBotContent,
    new RegExp(adapterSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "A excecao permitida precisa continuar sendo o adaptador interno do TelegramController.",
  );
});
