import { Logger } from "./logger.js";
import {
  CodexLocalConfigReader,
  CodexLocalConfigSnapshot,
} from "../integrations/codex-config.js";
import {
  CodexModelCatalogReadError,
  CodexModelCatalogReader,
} from "../integrations/codex-model-catalog.js";
import {
  CodexProjectPreferencesStore,
  PersistedCodexProjectPreference,
} from "../integrations/codex-project-preferences-store.js";
import {
  CodexModelCatalogEntry,
  CodexModelOption,
  CodexModelSelectionResult,
  CodexModelSelectionSnapshot,
  CodexProjectPreferences,
  CodexReasoningSelectionResult,
  CodexReasoningSelectionSnapshot,
  CodexResolvedProjectPreferences,
} from "../types/codex-preferences.js";
import { ProjectRef } from "../types/project.js";

export interface CodexPreferencesService {
  resolveProjectPreferences(project: ProjectRef): Promise<CodexResolvedProjectPreferences>;
  listModels(project: ProjectRef): Promise<CodexModelSelectionSnapshot>;
  selectModel(project: ProjectRef, model: string): Promise<CodexModelSelectionResult>;
  listReasoning(project: ProjectRef): Promise<CodexReasoningSelectionSnapshot>;
  selectReasoning(project: ProjectRef, effort: string): Promise<CodexReasoningSelectionResult>;
}

export class CodexPreferencesResolutionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CodexPreferencesResolutionError";
  }
}

export interface CodexPreferencesServiceDependencies {
  catalogReader: CodexModelCatalogReader;
  configReader: CodexLocalConfigReader;
  store: CodexProjectPreferencesStore;
}

export class DefaultCodexPreferencesService implements CodexPreferencesService {
  constructor(
    private readonly dependencies: CodexPreferencesServiceDependencies,
    private readonly logger?: Logger,
  ) {}

  async resolveProjectPreferences(project: ProjectRef): Promise<CodexResolvedProjectPreferences> {
    const catalog = await this.readCatalog();
    const persisted = await this.dependencies.store.load(project);
    const localConfig = await this.dependencies.configReader.read();

    const candidate = this.resolveCandidatePreferences(
      project,
      persisted,
      localConfig,
      catalog.models,
      catalog.fetchedAt,
    );
    const model = catalog.models.find((entry) => entry.slug === candidate.preferences.model);
    if (!model) {
      throw new CodexPreferencesResolutionError(
        `Modelo configurado para ${project.name} nao existe no catalogo local do Codex: ${candidate.preferences.model}.`,
      );
    }

    const supportedEfforts = new Set(model.supportedReasoningLevels.map((level) => level.effort));
    const reasoningAdjustedFrom = supportedEfforts.has(candidate.preferences.reasoningEffort)
      ? null
      : candidate.preferences.reasoningEffort;
    const reasoningEffort = reasoningAdjustedFrom
      ? model.defaultReasoningLevel
      : candidate.preferences.reasoningEffort;

    return {
      project: { ...project },
      model: model.slug,
      reasoningEffort,
      updatedAt: candidate.preferences.updatedAt,
      source: candidate.preferences.source,
      catalogFetchedAt: catalog.fetchedAt,
      modelDisplayName: model.displayName,
      modelDescription: model.description,
      modelVisibility: model.visibility,
      modelSelectable: isSelectableModel(model),
      supportedReasoningLevels: model.supportedReasoningLevels.map((level) => ({ ...level })),
      defaultReasoningEffort: model.defaultReasoningLevel,
      reasoningAdjustedFrom,
    };
  }

  async listModels(project: ProjectRef): Promise<CodexModelSelectionSnapshot> {
    const [current, catalog] = await Promise.all([
      this.resolveProjectPreferences(project),
      this.readCatalog(),
    ]);

    return {
      project: { ...project },
      current,
      models: catalog.models.filter(isSelectableModel).map((model) => this.buildModelOption(model, current)),
    };
  }

  async selectModel(project: ProjectRef, model: string): Promise<CodexModelSelectionResult> {
    const normalizedModel = model.trim();
    const [catalog, current] = await Promise.all([
      this.readCatalog(),
      this.resolveProjectPreferences(project),
    ]);

    const target = catalog.models.find((entry) => entry.slug === normalizedModel);
    if (!target) {
      return {
        status: "not-found",
        model: normalizedModel,
        current,
        availableModels: catalog.models.filter(isSelectableModel).map((entry) => entry.slug),
      };
    }

    if (!isSelectableModel(target)) {
      return {
        status: "not-selectable",
        model: normalizedModel,
        current,
        visibility: target.visibility,
      };
    }

    const supportedEfforts = new Set(target.supportedReasoningLevels.map((level) => level.effort));
    const reasoningResetFrom = supportedEfforts.has(current.reasoningEffort)
      ? null
      : current.reasoningEffort;
    const reasoningEffort = reasoningResetFrom ? target.defaultReasoningLevel : current.reasoningEffort;
    const previousModel = current.model;

    const persisted = await this.dependencies.store.save(project, {
      model: target.slug,
      reasoningEffort,
    });
    const resolved = this.buildResolvedFromPersisted(project, persisted, target, catalog.fetchedAt, reasoningResetFrom);

    this.logger?.info("Preferencia de modelo do Codex atualizada para projeto", {
      projectName: project.name,
      projectPath: project.path,
      previousModel,
      nextModel: target.slug,
      reasoningEffort,
      reasoningResetFrom,
      catalogPath: this.dependencies.catalogReader.catalogPath,
    });

    return {
      status: "selected",
      current: resolved,
      previousModel,
      reasoningResetFrom,
    };
  }

  async listReasoning(project: ProjectRef): Promise<CodexReasoningSelectionSnapshot> {
    const current = await this.resolveProjectPreferences(project);

    return {
      project: { ...project },
      current,
      reasoningLevels: current.supportedReasoningLevels.map((level) => ({
        ...level,
        active: level.effort === current.reasoningEffort,
      })),
    };
  }

  async selectReasoning(project: ProjectRef, effort: string): Promise<CodexReasoningSelectionResult> {
    const normalizedEffort = effort.trim();
    const current = await this.resolveProjectPreferences(project);
    const supported = current.supportedReasoningLevels.find((level) => level.effort === normalizedEffort);
    if (!supported) {
      return {
        status: "not-supported",
        effort: normalizedEffort,
        current,
        supportedEfforts: current.supportedReasoningLevels.map((level) => level.effort),
      };
    }

    const previousReasoningEffort = current.reasoningEffort;
    const persisted = await this.dependencies.store.save(project, {
      model: current.model,
      reasoningEffort: normalizedEffort,
    });
    const resolved = {
      ...current,
      reasoningEffort: persisted.reasoningEffort,
      updatedAt: new Date(persisted.updatedAt),
      source: persisted.source,
      reasoningAdjustedFrom: null,
    };

    this.logger?.info("Preferencia de reasoning do Codex atualizada para projeto", {
      projectName: project.name,
      projectPath: project.path,
      model: current.model,
      previousReasoningEffort,
      nextReasoningEffort: normalizedEffort,
      catalogPath: this.dependencies.catalogReader.catalogPath,
    });

    return {
      status: "selected",
      current: resolved,
      previousReasoningEffort,
    };
  }

  private async readCatalog() {
    try {
      const catalog = await this.dependencies.catalogReader.read();
      this.logger?.info("Catalogo local de modelos do Codex carregado", {
        catalogPath: this.dependencies.catalogReader.catalogPath,
        fetchedAt: catalog.fetchedAt.toISOString(),
        modelsCount: catalog.models.length,
      });
      return catalog;
    } catch (error) {
      if (error instanceof CodexModelCatalogReadError) {
        this.logger?.error("Falha ao carregar catalogo local de modelos do Codex", {
          catalogPath: this.dependencies.catalogReader.catalogPath,
          error: error.message,
        });
        throw new CodexPreferencesResolutionError(error.message, { cause: error });
      }

      throw error;
    }
  }

  private resolveCandidatePreferences(
    project: ProjectRef,
    persisted: PersistedCodexProjectPreference | null,
    localConfig: CodexLocalConfigSnapshot,
    catalogModels: CodexModelCatalogEntry[],
    catalogFetchedAt: Date,
  ): {
    preferences: CodexProjectPreferences;
  } {
    if (persisted) {
      return {
        preferences: {
          model: persisted.model,
          reasoningEffort: persisted.reasoningEffort,
          updatedAt: new Date(persisted.updatedAt),
          source: persisted.source,
        },
      };
    }

    const defaultModel = catalogModels.find(isSelectableModel);
    if (!defaultModel) {
      throw new CodexPreferencesResolutionError(
        `Nenhum modelo selecionavel encontrado no catalogo local do Codex para ${project.name}.`,
      );
    }

    const model = localConfig.model ?? defaultModel.slug;
    const modelFromCatalog = catalogModels.find((entry) => entry.slug === model);
    if (!modelFromCatalog) {
      throw new CodexPreferencesResolutionError(
        `Modelo definido na configuracao local do Codex nao existe no catalogo: ${model}.`,
      );
    }

    return {
      preferences: {
        model,
        reasoningEffort:
          localConfig.reasoningEffort?.trim() || modelFromCatalog.defaultReasoningLevel,
        updatedAt: localConfig.model || localConfig.reasoningEffort ? localConfig.loadedAt : catalogFetchedAt,
        source:
          localConfig.model || localConfig.reasoningEffort ? "codex-config" : "catalog-default",
      },
    };
  }

  private buildResolvedFromPersisted(
    project: ProjectRef,
    persisted: PersistedCodexProjectPreference,
    model: CodexModelCatalogEntry,
    catalogFetchedAt: Date,
    reasoningAdjustedFrom: string | null,
  ): CodexResolvedProjectPreferences {
    return {
      project: { ...project },
      model: persisted.model,
      reasoningEffort: persisted.reasoningEffort,
      updatedAt: new Date(persisted.updatedAt),
      source: persisted.source,
      catalogFetchedAt,
      modelDisplayName: model.displayName,
      modelDescription: model.description,
      modelVisibility: model.visibility,
      modelSelectable: isSelectableModel(model),
      supportedReasoningLevels: model.supportedReasoningLevels.map((level) => ({ ...level })),
      defaultReasoningEffort: model.defaultReasoningLevel,
      reasoningAdjustedFrom,
    };
  }

  private buildModelOption(
    model: CodexModelCatalogEntry,
    current: CodexResolvedProjectPreferences,
  ): CodexModelOption {
    return {
      slug: model.slug,
      displayName: model.displayName,
      description: model.description,
      visibility: model.visibility,
      selectable: isSelectableModel(model),
      active: model.slug === current.model,
      defaultReasoningEffort: model.defaultReasoningLevel,
      supportedReasoningLevels: model.supportedReasoningLevels.map((level) => ({ ...level })),
    };
  }
}

const isSelectableModel = (model: CodexModelCatalogEntry): boolean => model.visibility === "list";
