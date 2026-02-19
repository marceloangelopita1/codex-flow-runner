import { ActiveProjectStore } from "../integrations/active-project-store.js";
import { ProjectDiscovery } from "../integrations/project-discovery.js";
import { ProjectRef } from "../types/project.js";
import { resolveActiveProject } from "./active-project-resolver.js";

export interface ProjectSelectionSnapshot {
  projects: ProjectRef[];
  activeProject: ProjectRef;
}

export type ProjectSelectionResult =
  | {
      status: "selected";
      activeProject: ProjectRef;
      changed: boolean;
    }
  | {
      status: "not-found";
      projectName: string;
      availableProjects: ProjectRef[];
      activeProject: ProjectRef;
    };

export interface ProjectSelectionService {
  listProjects(): Promise<ProjectSelectionSnapshot>;
  selectProjectByName(projectName: string): Promise<ProjectSelectionResult>;
}

export interface ProjectSelectionDependencies {
  discovery: ProjectDiscovery;
  store: ActiveProjectStore;
}

export class ActiveProjectSelectionService implements ProjectSelectionService {
  constructor(
    private readonly projectsRootPath: string,
    private readonly dependencies: ProjectSelectionDependencies,
  ) {}

  async listProjects(): Promise<ProjectSelectionSnapshot> {
    const resolution = await resolveActiveProject(this.projectsRootPath, {
      discovery: this.dependencies.discovery,
      store: this.dependencies.store,
    });

    return {
      projects: resolution.eligibleProjects.map(cloneProjectRef),
      activeProject: cloneProjectRef(resolution.activeProject),
    };
  }

  async selectProjectByName(projectName: string): Promise<ProjectSelectionResult> {
    const normalizedName = projectName.trim();
    const snapshot = await this.listProjects();

    const selected = snapshot.projects.find((project) => project.name === normalizedName);
    if (!selected) {
      return {
        status: "not-found",
        projectName: normalizedName,
        availableProjects: snapshot.projects.map(cloneProjectRef),
        activeProject: cloneProjectRef(snapshot.activeProject),
      };
    }

    const changed = !isSameProject(selected, snapshot.activeProject);
    if (changed) {
      await this.dependencies.store.save(selected);
    }

    return {
      status: "selected",
      activeProject: cloneProjectRef(selected),
      changed,
    };
  }
}

const cloneProjectRef = (project: ProjectRef): ProjectRef => ({
  name: project.name,
  path: project.path,
});

const isSameProject = (left: ProjectRef, right: ProjectRef): boolean =>
  left.name === right.name && left.path === right.path;
