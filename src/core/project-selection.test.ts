import assert from "node:assert/strict";
import test from "node:test";
import { ActiveProjectStore, ActiveProjectStoreLoadResult } from "../integrations/active-project-store.js";
import { ProjectDiscovery } from "../integrations/project-discovery.js";
import { ProjectCatalogEntry, ProjectRef } from "../types/project.js";
import { ActiveProjectSelectionService } from "./project-selection.js";

class StubProjectDiscovery implements ProjectDiscovery {
  constructor(
    private readonly projects: ProjectRef[],
    private readonly catalogProjects: ProjectCatalogEntry[] = projects.map((project) => ({
      ...project,
      catalogStatus: "eligible",
    })),
  ) {}

  async listProjectCatalog(_projectsRootPath: string): Promise<ProjectCatalogEntry[]> {
    return this.catalogProjects.map((project) => ({ ...project }));
  }

  async listEligibleProjects(_projectsRootPath: string): Promise<ProjectRef[]> {
    return this.projects.map((project) => ({ ...project }));
  }
}

class StubActiveProjectStore implements ActiveProjectStore {
  public readonly stateFilePath = "/tmp/.codex-flow-runner/active-project.json";
  public readonly savedProjects: ProjectRef[] = [];

  constructor(private loadResult: ActiveProjectStoreLoadResult) {}

  async load(): Promise<ActiveProjectStoreLoadResult> {
    return this.loadResult;
  }

  async save(project: ProjectRef) {
    this.savedProjects.push({ ...project });
    this.loadResult = {
      status: "loaded",
      project: {
        ...project,
        updatedAt: "2026-02-19T18:30:00.000Z",
      },
    };

    return {
      ...project,
      updatedAt: "2026-02-19T18:30:00.000Z",
    };
  }
}

const projects: ProjectRef[] = [
  { name: "alpha-project", path: "/home/mapita/projetos/alpha-project" },
  { name: "beta-project", path: "/home/mapita/projetos/beta-project" },
  { name: "codex-flow-runner", path: "/home/mapita/projetos/codex-flow-runner" },
];

test("listProjects retorna projetos elegiveis e destaca projeto ativo restaurado", async () => {
  const discovery = new StubProjectDiscovery(projects);
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "beta-project",
      path: "/home/mapita/projetos/beta-project",
      updatedAt: "2026-02-19T18:00:00.000Z",
    },
  });

  const service = new ActiveProjectSelectionService("/home/mapita/projetos", { discovery, store });
  const snapshot = await service.listProjects();

  assert.deepEqual(
    snapshot.projects,
    projects.map((project) => ({
      ...project,
      catalogStatus: "eligible",
    })),
  );
  assert.equal(snapshot.activeProject.name, "beta-project");
  assert.equal(snapshot.activeProject.path, "/home/mapita/projetos/beta-project");
  assert.equal(store.savedProjects.length, 0);
});

test("selectProjectByName persiste novo projeto ativo quando nome existe", async () => {
  const discovery = new StubProjectDiscovery(projects);
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
      updatedAt: "2026-02-19T18:00:00.000Z",
    },
  });

  const service = new ActiveProjectSelectionService("/home/mapita/projetos", { discovery, store });
  const result = await service.selectProjectByName("beta-project");

  assert.equal(result.status, "selected");
  if (result.status === "selected") {
    assert.equal(result.changed, true);
    assert.equal(result.activeProject.name, "beta-project");
    assert.equal(result.activeProject.path, "/home/mapita/projetos/beta-project");
  }

  assert.deepEqual(store.savedProjects, [
    {
      name: "beta-project",
      path: "/home/mapita/projetos/beta-project",
    },
  ]);
});

test("selectProjectByName nao persiste quando projeto ja esta ativo", async () => {
  const discovery = new StubProjectDiscovery(projects);
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
      updatedAt: "2026-02-19T18:00:00.000Z",
    },
  });

  const service = new ActiveProjectSelectionService("/home/mapita/projetos", { discovery, store });
  const result = await service.selectProjectByName("alpha-project");

  assert.equal(result.status, "selected");
  if (result.status === "selected") {
    assert.equal(result.changed, false);
    assert.equal(result.activeProject.name, "alpha-project");
  }

  assert.equal(store.savedProjects.length, 0);
});

test("selectProjectByName retorna not-found com lista disponivel quando nome nao existe", async () => {
  const discovery = new StubProjectDiscovery(projects);
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
      updatedAt: "2026-02-19T18:00:00.000Z",
    },
  });

  const service = new ActiveProjectSelectionService("/home/mapita/projetos", { discovery, store });
  const result = await service.selectProjectByName("nao-existe");

  assert.equal(result.status, "not-found");
  if (result.status === "not-found") {
    assert.equal(result.projectName, "nao-existe");
    assert.deepEqual(
      result.availableProjects.map((project) => project.name),
      ["alpha-project", "beta-project", "codex-flow-runner"],
    );
    assert.equal(result.activeProject.name, "alpha-project");
  }

  assert.equal(store.savedProjects.length, 0);
});

test("selectProjectByName retorna pending-prepare quando item existe no catalogo mas ainda nao e elegivel", async () => {
  const catalogProjects: ProjectCatalogEntry[] = [
    { name: "alpha-project", path: "/home/mapita/projetos/alpha-project", catalogStatus: "eligible" },
    { name: "beta-project", path: "/home/mapita/projetos/beta-project", catalogStatus: "eligible" },
    {
      name: "guiadomus-enrich-matricula",
      path: "/home/mapita/projetos/guiadomus-enrich-matricula",
      catalogStatus: "pending_prepare",
    },
    {
      name: "codex-flow-runner",
      path: "/home/mapita/projetos/codex-flow-runner",
      catalogStatus: "eligible",
    },
  ];
  const discovery = new StubProjectDiscovery(projects, catalogProjects);
  const store = new StubActiveProjectStore({
    status: "loaded",
    project: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
      updatedAt: "2026-02-19T18:00:00.000Z",
    },
  });

  const service = new ActiveProjectSelectionService("/home/mapita/projetos", { discovery, store });
  const result = await service.selectProjectByName("guiadomus-enrich-matricula");

  assert.equal(result.status, "pending-prepare");
  if (result.status === "pending-prepare") {
    assert.equal(result.project.name, "guiadomus-enrich-matricula");
    assert.equal(result.project.catalogStatus, "pending_prepare");
    assert.equal(result.activeProject.name, "alpha-project");
  }

  assert.equal(store.savedProjects.length, 0);
});
