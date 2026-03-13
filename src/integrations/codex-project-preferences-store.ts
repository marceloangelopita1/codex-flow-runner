import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { CodexPreferenceSource } from "../types/codex-preferences.js";
import { ProjectRef } from "../types/project.js";

const persistedPreferenceSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  model: z.string().min(1),
  reasoningEffort: z.string().min(1),
  updatedAt: z.string().min(1),
  source: z.literal("runner-local"),
});

const persistedStoreSchema = z.object({
  version: z.literal(1),
  projects: z.record(persistedPreferenceSchema),
});

export interface PersistedCodexProjectPreference extends ProjectRef {
  model: string;
  reasoningEffort: string;
  updatedAt: string;
  source: Extract<CodexPreferenceSource, "runner-local">;
}

export interface CodexProjectPreferencesStore {
  readonly stateFilePath: string;
  load(project: ProjectRef): Promise<PersistedCodexProjectPreference | null>;
  save(project: ProjectRef, preferences: { model: string; reasoningEffort: string }): Promise<PersistedCodexProjectPreference>;
}

export class CodexProjectPreferencesStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexProjectPreferencesStoreError";
  }
}

export class FileSystemCodexProjectPreferencesStore implements CodexProjectPreferencesStore {
  public readonly stateDirectoryPath: string;
  public readonly stateFilePath: string;

  constructor(projectsRootPath: string) {
    this.stateDirectoryPath = path.join(projectsRootPath, ".codex-flow-runner");
    this.stateFilePath = path.join(this.stateDirectoryPath, "codex-project-preferences.json");
  }

  async load(project: ProjectRef): Promise<PersistedCodexProjectPreference | null> {
    const store = await this.readStore();
    return store.projects[project.path] ?? null;
  }

  async save(
    project: ProjectRef,
    preferences: { model: string; reasoningEffort: string },
  ): Promise<PersistedCodexProjectPreference> {
    const store = await this.readStore();
    const persisted: PersistedCodexProjectPreference = {
      name: project.name,
      path: project.path,
      model: preferences.model,
      reasoningEffort: preferences.reasoningEffort,
      updatedAt: new Date().toISOString(),
      source: "runner-local",
    };

    store.projects[project.path] = persisted;
    await this.writeStore(store);
    return persisted;
  }

  private async readStore(): Promise<z.infer<typeof persistedStoreSchema>> {
    let raw = "";
    try {
      raw = await fs.readFile(this.stateFilePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          version: 1,
          projects: {},
        };
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new CodexProjectPreferencesStoreError(
        `Falha ao ler preferencias persistidas do Codex em ${this.stateFilePath}: ${details}`,
      );
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch (error) {
      throw new CodexProjectPreferencesStoreError(
        `JSON invalido no estado persistido de preferencias do Codex (${this.stateFilePath}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const parsed = persistedStoreSchema.safeParse(decoded);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new CodexProjectPreferencesStoreError(
        `Schema invalido no estado persistido de preferencias do Codex (${this.stateFilePath}): ${details}`,
      );
    }

    return parsed.data;
  }

  private async writeStore(store: z.infer<typeof persistedStoreSchema>): Promise<void> {
    await fs.mkdir(this.stateDirectoryPath, { recursive: true });
    const tempFilePath = `${this.stateFilePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tempFilePath, JSON.stringify(store, null, 2).concat("\n"), "utf8");
    await fs.rename(tempFilePath, this.stateFilePath);
  }
}
