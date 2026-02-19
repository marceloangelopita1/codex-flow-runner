import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ProjectRef } from "../types/project.js";

const activeProjectStateSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  updatedAt: z.string().min(1),
});

export interface PersistedActiveProject extends ProjectRef {
  updatedAt: string;
}

export type ActiveProjectStoreLoadResult =
  | { status: "missing" }
  | { status: "loaded"; project: PersistedActiveProject }
  | { status: "invalid"; reason: string };

export interface ActiveProjectStore {
  readonly stateFilePath: string;
  load(): Promise<ActiveProjectStoreLoadResult>;
  save(project: ProjectRef): Promise<PersistedActiveProject>;
}

export class FileSystemActiveProjectStore implements ActiveProjectStore {
  public readonly stateDirectoryPath: string;
  public readonly stateFilePath: string;

  constructor(projectsRootPath: string) {
    this.stateDirectoryPath = path.join(projectsRootPath, ".codex-flow-runner");
    this.stateFilePath = path.join(this.stateDirectoryPath, "active-project.json");
  }

  async load(): Promise<ActiveProjectStoreLoadResult> {
    let raw = "";
    try {
      raw = await fs.readFile(this.stateFilePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { status: "missing" };
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao ler estado de projeto ativo em ${this.stateFilePath}: ${details}`);
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch (error) {
      return {
        status: "invalid",
        reason: `JSON invalido no estado persistido (${this.stateFilePath}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }

    const parsed = activeProjectStateSchema.safeParse(decoded);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return {
        status: "invalid",
        reason: `Schema invalido no estado persistido (${this.stateFilePath}): ${details}`,
      };
    }

    return {
      status: "loaded",
      project: parsed.data,
    };
  }

  async save(project: ProjectRef): Promise<PersistedActiveProject> {
    const persisted: PersistedActiveProject = {
      name: project.name,
      path: project.path,
      updatedAt: new Date().toISOString(),
    };

    await fs.mkdir(this.stateDirectoryPath, { recursive: true });
    const tempFilePath = `${this.stateFilePath}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tempFilePath, JSON.stringify(persisted, null, 2).concat("\n"), "utf8");
    await fs.rename(tempFilePath, this.stateFilePath);

    return persisted;
  }
}
