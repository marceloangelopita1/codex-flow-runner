import { Dirent, promises as fs } from "node:fs";
import path from "node:path";
import { ProjectRef } from "../types/project.js";

export interface ProjectDiscovery {
  listEligibleProjects(projectsRootPath: string): Promise<ProjectRef[]>;
}

export class FileSystemProjectDiscovery implements ProjectDiscovery {
  async listEligibleProjects(projectsRootPath: string): Promise<ProjectRef[]> {
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(projectsRootPath, { withFileTypes: true });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao listar projetos em PROJECTS_ROOT_PATH (${projectsRootPath}): ${details}`,
      );
    }

    const candidates = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(projectsRootPath, entry.name),
      }));

    const eligible: ProjectRef[] = [];
    for (const candidate of candidates) {
      const [hasGitMetadata, hasOpenTicketsDir] = await Promise.all([
        pathExists(path.join(candidate.path, ".git")),
        isDirectory(path.join(candidate.path, "tickets", "open")),
      ]);

      if (!hasGitMetadata || !hasOpenTicketsDir) {
        continue;
      }

      eligible.push(candidate);
    }

    return eligible.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }
}

const pathExists = async (value: string): Promise<boolean> => {
  try {
    await fs.stat(value);
    return true;
  } catch {
    return false;
  }
};

const isDirectory = async (value: string): Promise<boolean> => {
  try {
    return (await fs.stat(value)).isDirectory();
  } catch {
    return false;
  }
};
