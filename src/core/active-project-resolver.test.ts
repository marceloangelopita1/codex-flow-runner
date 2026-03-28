import assert from "node:assert/strict";
import test from "node:test";
import {
  ActiveProjectResolution,
  NoEligibleProjectsError,
  resolveActiveProject,
} from "./active-project-resolver.js";
import {
  ActiveProjectStore,
  ActiveProjectStoreLoadResult,
  PersistedActiveProject,
} from "../integrations/active-project-store.js";
import { ProjectDiscovery } from "../integrations/project-discovery.js";
import { ProjectCatalogEntry, ProjectRef } from "../types/project.js";

class StubProjectDiscovery implements ProjectDiscovery {
  constructor(private readonly projects: ProjectRef[]) {}

  async listProjectCatalog(_projectsRootPath: string): Promise<ProjectCatalogEntry[]> {
    return this.projects.map((project) => ({
      ...project,
      catalogStatus: "eligible",
    }));
  }

  async listEligibleProjects(_projectsRootPath: string): Promise<ProjectRef[]> {
    return this.projects;
  }
}

class StubActiveProjectStore implements ActiveProjectStore {
  public readonly stateFilePath = "/tmp/.codex-flow-runner/active-project.json";
  public savedProjects: ProjectRef[] = [];
  public loadCalls = 0;

  constructor(private readonly loadResult: ActiveProjectStoreLoadResult) {}

  async load(): Promise<ActiveProjectStoreLoadResult> {
    this.loadCalls += 1;
    return this.loadResult;
  }

  async save(project: ProjectRef): Promise<PersistedActiveProject> {
    this.savedProjects.push(project);
    return {
      ...project,
      updatedAt: "2026-02-19T18:00:00.000Z",
    };
  }
}

const eligibleProjects: ProjectRef[] = [
  { name: "alpha", path: "/home/mapita/projetos/alpha" },
  { name: "codex-flow-runner", path: "/home/mapita/projetos/codex-flow-runner" },
];

const assertResolution = (
  resolution: ActiveProjectResolution,
  expected: {
    name: string;
    reason:
      | "restored-persisted"
      | "fallback-missing-persisted"
      | "fallback-invalid-persisted"
      | "fallback-stale-persisted";
  },
): void => {
  assert.equal(resolution.activeProject.name, expected.name);
  assert.equal(resolution.selectionReason, expected.reason);
  assert.deepEqual(resolution.eligibleProjects, eligibleProjects);
};

test("resolveActiveProject falha quando nao existe nenhum projeto elegivel", async () => {
  const store = new StubActiveProjectStore({ status: "missing" });
  const discovery = new StubProjectDiscovery([]);

  await assert.rejects(
    () => resolveActiveProject("/home/mapita/projetos", { discovery, store }),
    NoEligibleProjectsError,
  );

  assert.equal(store.savedProjects.length, 0);
});

test("resolveActiveProject restaura projeto persistido quando ainda elegivel", async () => {
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "codex-flow-runner",
      path: "/home/mapita/projetos/codex-flow-runner",
      updatedAt: "2026-02-19T17:59:00.000Z",
    },
  });
  const discovery = new StubProjectDiscovery(eligibleProjects);

  const resolution = await resolveActiveProject("/home/mapita/projetos", { discovery, store });

  assertResolution(resolution, {
    name: "codex-flow-runner",
    reason: "restored-persisted",
  });
  assert.equal(store.savedProjects.length, 0);
});

test("resolveActiveProject aplica fallback para primeiro projeto elegivel quando estado falta", async () => {
  const store = new StubActiveProjectStore({ status: "missing" });
  const discovery = new StubProjectDiscovery(eligibleProjects);

  const resolution = await resolveActiveProject("/home/mapita/projetos", { discovery, store });

  assertResolution(resolution, {
    name: "alpha",
    reason: "fallback-missing-persisted",
  });
  assert.deepEqual(store.savedProjects, [eligibleProjects[0]!]);
});

test("resolveActiveProject aplica fallback quando estado persistido e invalido", async () => {
  const store = new StubActiveProjectStore({
    status: "invalid",
    reason: "JSON invalido",
  });
  const discovery = new StubProjectDiscovery(eligibleProjects);

  const resolution = await resolveActiveProject("/home/mapita/projetos", { discovery, store });

  assertResolution(resolution, {
    name: "alpha",
    reason: "fallback-invalid-persisted",
  });
  assert.deepEqual(store.savedProjects, [eligibleProjects[0]!]);
});

test("resolveActiveProject aplica fallback quando projeto persistido nao e mais elegivel", async () => {
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "legacy-repo",
      path: "/home/mapita/projetos/legacy-repo",
      updatedAt: "2026-02-19T17:59:00.000Z",
    },
  });
  const discovery = new StubProjectDiscovery(eligibleProjects);

  const resolution = await resolveActiveProject("/home/mapita/projetos", { discovery, store });

  assertResolution(resolution, {
    name: "alpha",
    reason: "fallback-stale-persisted",
  });
  assert.deepEqual(store.savedProjects, [eligibleProjects[0]!]);
});
