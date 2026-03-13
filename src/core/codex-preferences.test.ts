import assert from "node:assert/strict";
import test from "node:test";
import { CodexLocalConfigReader, CodexLocalConfigSnapshot } from "../integrations/codex-config.js";
import { CodexModelCatalogReader } from "../integrations/codex-model-catalog.js";
import {
  CodexProjectPreferencesStore,
  PersistedCodexProjectPreference,
} from "../integrations/codex-project-preferences-store.js";
import { CodexModelCatalogSnapshot } from "../types/codex-preferences.js";
import { ProjectRef } from "../types/project.js";
import { DefaultCodexPreferencesService } from "./codex-preferences.js";

class StubCatalogReader implements CodexModelCatalogReader {
  public readonly catalogPath = "/tmp/.codex/models_cache.json";

  constructor(private readonly snapshot: CodexModelCatalogSnapshot) {}

  async read(): Promise<CodexModelCatalogSnapshot> {
    return {
      fetchedAt: new Date(this.snapshot.fetchedAt),
      models: this.snapshot.models.map((model) => ({
        ...model,
        supportedReasoningLevels: model.supportedReasoningLevels.map((level) => ({ ...level })),
      })),
    };
  }
}

class StubConfigReader implements CodexLocalConfigReader {
  public readonly configPath = "/tmp/.codex/config.toml";

  constructor(private readonly snapshot: CodexLocalConfigSnapshot) {}

  async read(): Promise<CodexLocalConfigSnapshot> {
    return {
      loadedAt: new Date(this.snapshot.loadedAt),
      model: this.snapshot.model,
      reasoningEffort: this.snapshot.reasoningEffort,
      serviceTier: this.snapshot.serviceTier,
      fastModeEnabled: this.snapshot.fastModeEnabled,
    };
  }
}

class StubPreferencesStore implements CodexProjectPreferencesStore {
  public readonly stateFilePath = "/tmp/.codex-flow-runner/codex-project-preferences.json";
  private readonly entries = new Map<string, PersistedCodexProjectPreference>();

  constructor(initial?: PersistedCodexProjectPreference) {
    if (initial) {
      this.entries.set(initial.path, { ...initial });
    }
  }

  async load(project: ProjectRef): Promise<PersistedCodexProjectPreference | null> {
    const value = this.entries.get(project.path);
    return value ? { ...value } : null;
  }

  async save(
    project: ProjectRef,
    preferences: { model: string; reasoningEffort: string; speed: "standard" | "fast" },
  ): Promise<PersistedCodexProjectPreference> {
    const persisted: PersistedCodexProjectPreference = {
      name: project.name,
      path: project.path,
      model: preferences.model,
      reasoningEffort: preferences.reasoningEffort,
      speed: preferences.speed,
      updatedAt: "2026-03-13T10:00:00.000Z",
      source: "runner-local",
    };
    this.entries.set(project.path, persisted);
    return { ...persisted };
  }
}

const createConfigSnapshot = (
  value: Partial<CodexLocalConfigSnapshot> = {},
): CodexLocalConfigSnapshot => ({
  loadedAt: new Date("2026-03-13T08:00:00.000Z"),
  model: null,
  reasoningEffort: null,
  serviceTier: null,
  fastModeEnabled: null,
  ...value,
});

const project: ProjectRef = {
  name: "alpha-project",
  path: "/tmp/projects/alpha-project",
};

const catalogSnapshot: CodexModelCatalogSnapshot = {
  fetchedAt: new Date("2026-03-13T09:00:00.000Z"),
  models: [
    {
      slug: "gpt-5.4",
      displayName: "gpt-5.4",
      description: "Modelo principal",
      visibility: "list",
      defaultReasoningLevel: "medium",
      supportedReasoningLevels: [
        { effort: "medium", description: "Balanced" },
        { effort: "xhigh", description: "Deep" },
      ],
      priority: 10,
    },
    {
      slug: "gpt-5.3-codex",
      displayName: "gpt-5.3-codex",
      description: "Modelo alternativo",
      visibility: "list",
      defaultReasoningLevel: "medium",
      supportedReasoningLevels: [
        { effort: "low", description: "Fast" },
        { effort: "medium", description: "Balanced" },
      ],
      priority: 20,
    },
  ],
};

test("resolveProjectPreferences usa preferencia runner-local antes da config local", async () => {
  const service = new DefaultCodexPreferencesService({
    catalogReader: new StubCatalogReader(catalogSnapshot),
    configReader: new StubConfigReader(createConfigSnapshot({
      model: "gpt-5.3-codex",
      reasoningEffort: "medium",
      serviceTier: "fast",
    })),
    store: new StubPreferencesStore({
      name: project.name,
      path: project.path,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      speed: "standard",
      updatedAt: "2026-03-13T07:00:00.000Z",
      source: "runner-local",
    }),
  });

  const resolved = await service.resolveProjectPreferences(project);

  assert.equal(resolved.model, "gpt-5.4");
  assert.equal(resolved.reasoningEffort, "xhigh");
  assert.equal(resolved.speed, "standard");
  assert.equal(resolved.source, "runner-local");
});

test("resolveProjectPreferences usa speed da config local quando o store legado nao define velocidade", async () => {
  const service = new DefaultCodexPreferencesService({
    catalogReader: new StubCatalogReader(catalogSnapshot),
    configReader: new StubConfigReader(createConfigSnapshot({
      serviceTier: "fast",
      fastModeEnabled: true,
    })),
    store: new StubPreferencesStore({
      name: project.name,
      path: project.path,
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      speed: null,
      updatedAt: "2026-03-13T07:00:00.000Z",
      source: "runner-local",
    }),
  });

  const resolved = await service.resolveProjectPreferences(project);

  assert.equal(resolved.model, "gpt-5.4");
  assert.equal(resolved.reasoningEffort, "xhigh");
  assert.equal(resolved.speed, "fast");
  assert.equal(resolved.source, "mixed");
  assert.deepEqual(resolved.sources, {
    model: "runner-local",
    reasoningEffort: "runner-local",
    speed: "codex-config",
  });
});

test("resolveProjectPreferences usa config local quando nao ha preferencia persistida", async () => {
  const service = new DefaultCodexPreferencesService({
    catalogReader: new StubCatalogReader(catalogSnapshot),
    configReader: new StubConfigReader(createConfigSnapshot({
      model: "gpt-5.3-codex",
      reasoningEffort: "medium",
      serviceTier: "fast",
    })),
    store: new StubPreferencesStore(),
  });

  const resolved = await service.resolveProjectPreferences(project);

  assert.equal(resolved.model, "gpt-5.3-codex");
  assert.equal(resolved.reasoningEffort, "medium");
  assert.equal(resolved.speed, "standard");
  assert.equal(resolved.speedAdjustedFrom, "fast");
  assert.equal(resolved.fastModeSupported, false);
  assert.equal(resolved.source, "codex-config");
});

test("selectModel reseta reasoning e velocidade quando o modelo de destino nao suporta o estado atual", async () => {
  const store = new StubPreferencesStore({
    name: project.name,
    path: project.path,
    model: "gpt-5.4",
    reasoningEffort: "xhigh",
    speed: "fast",
    updatedAt: "2026-03-13T07:00:00.000Z",
    source: "runner-local",
  });
  const service = new DefaultCodexPreferencesService({
    catalogReader: new StubCatalogReader(catalogSnapshot),
    configReader: new StubConfigReader(createConfigSnapshot()),
    store,
  });

  const result = await service.selectModel(project, "gpt-5.3-codex");

  assert.equal(result.status, "selected");
  if (result.status === "selected") {
    assert.equal(result.current.model, "gpt-5.3-codex");
    assert.equal(result.current.reasoningEffort, "medium");
    assert.equal(result.current.speed, "standard");
    assert.equal(result.reasoningResetFrom, "xhigh");
    assert.equal(result.speedResetFrom, "fast");
  }
});

test("selectSpeed rejeita fast quando o modelo atual nao suporta fast mode", async () => {
  const store = new StubPreferencesStore({
    name: project.name,
    path: project.path,
    model: "gpt-5.3-codex",
    reasoningEffort: "medium",
    speed: "standard",
    updatedAt: "2026-03-13T07:00:00.000Z",
    source: "runner-local",
  });
  const service = new DefaultCodexPreferencesService({
    catalogReader: new StubCatalogReader(catalogSnapshot),
    configReader: new StubConfigReader(createConfigSnapshot()),
    store,
  });

  const result = await service.selectSpeed(project, "fast");

  assert.equal(result.status, "not-supported");
  if (result.status === "not-supported") {
    assert.equal(result.speed, "fast");
    assert.deepEqual(result.supportedSpeeds, ["standard"]);
  }
});
