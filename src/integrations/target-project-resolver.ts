import { promises as fs } from "node:fs";
import path from "node:path";
import { TargetPrepareResolvedProject } from "../types/target-prepare.js";

export interface TargetProjectResolver {
  resolveProject(projectName: string): Promise<TargetPrepareResolvedProject>;
}

export class InvalidTargetProjectNameError extends Error {
  constructor(projectName: string) {
    super(
      [
        "Nome invalido para /target_prepare.",
        `Recebido: ${projectName || "(vazio)"}.`,
        "Use apenas o nome literal do diretorio irmao em PROJECTS_ROOT_PATH, sem barras ou '..'.",
      ].join(" "),
    );
    this.name = "InvalidTargetProjectNameError";
  }
}

export class TargetProjectNotFoundError extends Error {
  constructor(projectName: string, projectsRootPath: string) {
    super(
      [
        `Projeto alvo nao encontrado para /target_prepare: ${projectName}.`,
        `PROJECTS_ROOT_PATH: ${projectsRootPath}.`,
      ].join(" "),
    );
    this.name = "TargetProjectNotFoundError";
  }
}

export class TargetProjectGitMissingError extends Error {
  constructor(projectName: string) {
    super(
      [
        `Projeto alvo ${projectName} nao e um repositorio Git valido para /target_prepare.`,
        "O diretorio precisa existir e conter .git.",
      ].join(" "),
    );
    this.name = "TargetProjectGitMissingError";
  }
}

export class FileSystemTargetProjectResolver implements TargetProjectResolver {
  constructor(private readonly projectsRootPath: string) {}

  async resolveProject(projectName: string): Promise<TargetPrepareResolvedProject> {
    const normalizedName = projectName.trim();
    if (!this.isValidProjectName(normalizedName)) {
      throw new InvalidTargetProjectNameError(projectName);
    }

    const projectPath = path.join(this.projectsRootPath, normalizedName);
    const stats = await safeStat(projectPath);
    if (!stats?.isDirectory()) {
      throw new TargetProjectNotFoundError(normalizedName, this.projectsRootPath);
    }

    const gitMetadataExists = Boolean(await safeStat(path.join(projectPath, ".git")));
    if (!gitMetadataExists) {
      throw new TargetProjectGitMissingError(normalizedName);
    }

    const openTicketsDir = await safeStat(path.join(projectPath, "tickets", "open"));

    return {
      name: normalizedName,
      path: projectPath,
      eligibleForProjects: Boolean(openTicketsDir?.isDirectory()),
    };
  }

  private isValidProjectName(projectName: string): boolean {
    return (
      projectName.length > 0 &&
      projectName !== "." &&
      !projectName.includes("/") &&
      !projectName.includes("\\") &&
      !projectName.includes("..")
    );
  }
}

const safeStat = async (value: string) => {
  try {
    return await fs.stat(value);
  } catch {
    return null;
  }
};
