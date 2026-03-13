import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CodexModelCatalogReadError,
  FileSystemCodexModelCatalogReader,
} from "./codex-model-catalog.js";

const createTempHome = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "codex-model-catalog-"));

const cleanupTempHome = async (homePath: string): Promise<void> => {
  await fs.rm(homePath, { recursive: true, force: true });
};

test("read carrega catalogo local do Codex e normaliza campos esperados", async () => {
  const homePath = await createTempHome();

  try {
    const reader = new FileSystemCodexModelCatalogReader(homePath);
    await fs.mkdir(path.dirname(reader.catalogPath), { recursive: true });
    await fs.writeFile(
      reader.catalogPath,
      JSON.stringify(
        {
          models: [
            {
              slug: "gpt-5.3-codex",
              display_name: "gpt-5.3-codex",
              visibility: "list",
              default_reasoning_level: "medium",
              supported_reasoning_levels: [
                { effort: "medium", description: "Balanced" },
              ],
              priority: 20,
            },
            {
              slug: "gpt-5.4",
              display_name: "gpt-5.4",
              description: "Modelo principal",
              visibility: "list",
              default_reasoning_level: "high",
              supported_reasoning_levels: [
                { effort: "high", description: "Deep" },
              ],
              priority: 10,
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const catalog = await reader.read();

    assert.equal(catalog.models.length, 2);
    assert.equal(catalog.models[0]?.slug, "gpt-5.4");
    assert.equal(catalog.models[0]?.displayName, "gpt-5.4");
    assert.equal(catalog.models[0]?.description, "Modelo principal");
    assert.equal(catalog.models[0]?.supportedReasoningLevels[0]?.effort, "high");
  } finally {
    await cleanupTempHome(homePath);
  }
});

test("read falha quando o catalogo local do Codex esta ausente", async () => {
  const homePath = await createTempHome();

  try {
    const reader = new FileSystemCodexModelCatalogReader(homePath);
    await assert.rejects(() => reader.read(), (error: unknown) => {
      assert.ok(error instanceof CodexModelCatalogReadError);
      assert.match(error.message, /nao encontrado/u);
      return true;
    });
  } finally {
    await cleanupTempHome(homePath);
  }
});
