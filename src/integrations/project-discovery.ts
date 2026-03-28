import { Dirent, promises as fs } from "node:fs";
import path from "node:path";
import { ProjectCatalogEntry, ProjectRef } from "../types/project.js";

export interface ProjectDiscovery {
  listProjectCatalog(projectsRootPath: string): Promise<ProjectCatalogEntry[]>;
  listEligibleProjects(projectsRootPath: string): Promise<ProjectRef[]>;
}

export class FileSystemProjectDiscovery implements ProjectDiscovery {
  async listProjectCatalog(projectsRootPath: string): Promise<ProjectCatalogEntry[]> {
    const candidates = await this.listDirectoryCandidates(projectsRootPath);
    const catalog: ProjectCatalogEntry[] = [];

    for (const candidate of candidates) {
      const [hasGitMetadata, hasOpenTicketsDir] = await Promise.all([
        pathExists(path.join(candidate.path, ".git")),
        isDirectory(path.join(candidate.path, "tickets", "open")),
      ]);

      if (!hasGitMetadata) {
        continue;
      }

      catalog.push({
        ...candidate,
        catalogStatus: hasOpenTicketsDir ? "eligible" : "pending_prepare",
      });
    }

    return catalog.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }

  async listEligibleProjects(projectsRootPath: string): Promise<ProjectRef[]> {
    const catalog = await this.listProjectCatalog(projectsRootPath);
    return catalog
      .filter((entry) => entry.catalogStatus === "eligible")
      .map(({ name, path: projectPath }) => ({
        name,
        path: projectPath,
      }));
  }

  private async listDirectoryCandidates(projectsRootPath: string): Promise<ProjectRef[]> {
    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(projectsRootPath, { withFileTypes: true });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Falha ao listar projetos em PROJECTS_ROOT_PATH (${projectsRootPath}): ${details}`,
      );
    }

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(projectsRootPath, entry.name),
      }));
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
