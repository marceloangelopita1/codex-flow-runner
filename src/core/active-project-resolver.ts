import path from "node:path";
import {
  ActiveProjectStore,
  ActiveProjectStoreLoadResult,
} from "../integrations/active-project-store.js";
import { ProjectDiscovery } from "../integrations/project-discovery.js";
import { ProjectRef } from "../types/project.js";

export type ActiveProjectSelectionReason =
  | "restored-persisted"
  | "fallback-missing-persisted"
  | "fallback-invalid-persisted"
  | "fallback-stale-persisted";

export interface ActiveProjectResolution {
  activeProject: ProjectRef;
  eligibleProjects: ProjectRef[];
  selectionReason: ActiveProjectSelectionReason;
}

export interface ActiveProjectResolverDependencies {
  discovery: ProjectDiscovery;
  store: ActiveProjectStore;
}

export class NoEligibleProjectsError extends Error {
  constructor(projectsRootPath: string) {
    super(
      [
        "Nenhum projeto elegivel encontrado em PROJECTS_ROOT_PATH.",
        `Root: ${projectsRootPath}`,
        "Criterio: diretorio de primeiro nivel com .git e tickets/open.",
      ].join(" "),
    );
    this.name = "NoEligibleProjectsError";
  }
}

export const resolveActiveProject = async (
  projectsRootPath: string,
  dependencies: ActiveProjectResolverDependencies,
): Promise<ActiveProjectResolution> => {
  const eligibleProjects = await dependencies.discovery.listEligibleProjects(projectsRootPath);
  if (eligibleProjects.length === 0) {
    throw new NoEligibleProjectsError(projectsRootPath);
  }

  const persisted = await dependencies.store.load();
  if (persisted.status === "loaded") {
    const restored = matchPersistedProject(eligibleProjects, persisted);
    if (restored) {
      return {
        activeProject: restored,
        eligibleProjects,
        selectionReason: "restored-persisted",
      };
    }
  }

  const fallbackProject = eligibleProjects[0];
  if (!fallbackProject) {
    throw new NoEligibleProjectsError(projectsRootPath);
  }
  await dependencies.store.save(fallbackProject);

  return {
    activeProject: fallbackProject,
    eligibleProjects,
    selectionReason: toFallbackReason(persisted),
  };
};

const matchPersistedProject = (
  eligibleProjects: ProjectRef[],
  persisted: Extract<ActiveProjectStoreLoadResult, { status: "loaded" }>,
): ProjectRef | null => {
  const persistedPath = path.resolve(persisted.project.path);

  for (const project of eligibleProjects) {
    if (project.name !== persisted.project.name) {
      continue;
    }

    if (path.resolve(project.path) !== persistedPath) {
      continue;
    }

    return project;
  }

  return null;
};

const toFallbackReason = (
  persisted: ActiveProjectStoreLoadResult,
): Exclude<ActiveProjectSelectionReason, "restored-persisted"> => {
  if (persisted.status === "missing") {
    return "fallback-missing-persisted";
  }

  if (persisted.status === "invalid") {
    return "fallback-invalid-persisted";
  }

  return "fallback-stale-persisted";
};
