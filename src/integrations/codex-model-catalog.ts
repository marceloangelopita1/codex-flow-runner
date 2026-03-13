import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import {
  CodexModelCatalogEntry,
  CodexModelCatalogSnapshot,
  CodexReasoningLevel,
} from "../types/codex-preferences.js";

const reasoningLevelSchema = z.object({
  effort: z.string().min(1),
  description: z.string().catch(""),
});

const modelCatalogEntrySchema = z.object({
  slug: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullish(),
  visibility: z.string().min(1).catch("hide"),
  default_reasoning_level: z.string().min(1),
  supported_reasoning_levels: z.array(reasoningLevelSchema).min(1),
  priority: z.number().int().nullable().optional(),
});

const modelCatalogSchema = z.object({
  models: z.array(modelCatalogEntrySchema).min(1),
});

export interface CodexModelCatalogReader {
  readonly catalogPath: string;
  read(): Promise<CodexModelCatalogSnapshot>;
}

export class CodexModelCatalogReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexModelCatalogReadError";
  }
}

export class FileSystemCodexModelCatalogReader implements CodexModelCatalogReader {
  public readonly catalogPath: string;

  constructor(homePath = os.homedir()) {
    this.catalogPath = path.join(homePath, ".codex", "models_cache.json");
  }

  async read(): Promise<CodexModelCatalogSnapshot> {
    let raw = "";
    let stats;
    try {
      [raw, stats] = await Promise.all([
        fs.readFile(this.catalogPath, "utf8"),
        fs.stat(this.catalogPath),
      ]);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        throw new CodexModelCatalogReadError(
          `Catalogo de modelos do Codex nao encontrado em ${this.catalogPath}.`,
        );
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new CodexModelCatalogReadError(
        `Falha ao ler catalogo de modelos do Codex em ${this.catalogPath}: ${details}`,
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch (error) {
      throw new CodexModelCatalogReadError(
        `JSON invalido no catalogo de modelos do Codex (${this.catalogPath}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const parsed = modelCatalogSchema.safeParse(decoded);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new CodexModelCatalogReadError(
        `Schema invalido no catalogo de modelos do Codex (${this.catalogPath}): ${details}`,
      );
    }

    return {
      fetchedAt: stats.mtime,
      models: parsed.data.models
        .map((entry) => mapCatalogEntry(entry))
        .sort((left, right) => compareCatalogEntries(left, right)),
    };
  }
}

const mapCatalogEntry = (
  entry: z.infer<typeof modelCatalogEntrySchema>,
): CodexModelCatalogEntry => ({
  slug: entry.slug,
  displayName: entry.display_name,
  description: entry.description ?? null,
  visibility: entry.visibility,
  defaultReasoningLevel: entry.default_reasoning_level,
  supportedReasoningLevels: entry.supported_reasoning_levels.map(mapReasoningLevel),
  priority: entry.priority ?? null,
});

const mapReasoningLevel = (
  entry: z.infer<typeof reasoningLevelSchema>,
): CodexReasoningLevel => ({
  effort: entry.effort,
  description: entry.description,
});

const compareCatalogEntries = (
  left: CodexModelCatalogEntry,
  right: CodexModelCatalogEntry,
): number => {
  if (left.priority !== null && right.priority !== null && left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  if (left.priority !== null && right.priority === null) {
    return -1;
  }

  if (left.priority === null && right.priority !== null) {
    return 1;
  }

  return left.displayName.localeCompare(right.displayName, "pt-BR", {
    sensitivity: "base",
  });
};
