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
  CodexPreferenceResolutionSource,
  CodexPreferenceSource,
  CodexProjectPreferences,
  CodexReasoningSelectionResult,
  CodexReasoningSelectionSnapshot,
  CodexResolvedProjectPreferences,
  CodexSpeed,
  CodexSpeedOption,
  CodexSpeedSelectionResult,
  CodexSpeedSelectionSnapshot,
} from "../types/codex-preferences.js";
import { ProjectRef } from "../types/project.js";

const FAST_MODE_SUPPORTED_MODELS = new Set(["gpt-5.4"]);
const SUPPORTED_SPEEDS: CodexSpeed[] = ["standard", "fast"];

interface PreferenceFieldCandidate<TValue> {
  value: TValue;
  source: CodexPreferenceSource;
  updatedAt: Date;
}

interface CandidatePreferences {
  model: PreferenceFieldCandidate<string>;
  reasoningEffort: PreferenceFieldCandidate<string>;
  speed: PreferenceFieldCandidate<CodexSpeed>;
}

export interface CodexPreferencesService {
  resolveProjectPreferences(project: ProjectRef): Promise<CodexResolvedProjectPreferences>;
  listModels(project: ProjectRef): Promise<CodexModelSelectionSnapshot>;
  selectModel(project: ProjectRef, model: string): Promise<CodexModelSelectionResult>;
  listReasoning(project: ProjectRef): Promise<CodexReasoningSelectionSnapshot>;
  selectReasoning(project: ProjectRef, effort: string): Promise<CodexReasoningSelectionResult>;
  listSpeed(project: ProjectRef): Promise<CodexSpeedSelectionSnapshot>;
  selectSpeed(project: ProjectRef, speed: string): Promise<CodexSpeedSelectionResult>;
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
    const model = catalog.models.find((entry) => entry.slug === candidate.model.value);
    if (!model) {
      throw new CodexPreferencesResolutionError(
        `Modelo configurado para ${project.name} nao existe no catalogo local do Codex: ${candidate.model.value}.`,
      );
    }

    return this.buildResolvedPreferences(
      project,
      candidate,
      model,
      catalog.fetchedAt,
    );
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
    const speedResetFrom =
      current.speed === "fast" && !isFastModeSupportedModel(target.slug)
        ? "fast"
        : null;
    const speed = speedResetFrom ? "standard" : current.speed;
    const previousModel = current.model;

    const persisted = await this.dependencies.store.save(project, {
      model: target.slug,
      reasoningEffort,
      speed,
    });
    const resolved = this.buildResolvedFromPersisted(
      project,
      persisted,
      target,
      catalog.fetchedAt,
      reasoningResetFrom,
      speedResetFrom,
    );

    this.logger?.info("Preferencia de modelo do Codex atualizada para projeto", {
      projectName: project.name,
      projectPath: project.path,
      previousModel,
      nextModel: target.slug,
      reasoningEffort,
      reasoningResetFrom,
      speed,
      speedResetFrom,
      catalogPath: this.dependencies.catalogReader.catalogPath,
    });

    return {
      status: "selected",
      current: resolved,
      previousModel,
      reasoningResetFrom,
      speedResetFrom,
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
    const [catalog, current] = await Promise.all([
      this.readCatalog(),
      this.resolveProjectPreferences(project),
    ]);
    const supported = current.supportedReasoningLevels.find((level) => level.effort === normalizedEffort);
    if (!supported) {
      return {
        status: "not-supported",
        effort: normalizedEffort,
        current,
        supportedEfforts: current.supportedReasoningLevels.map((level) => level.effort),
      };
    }

    const model = catalog.models.find((entry) => entry.slug === current.model);
    if (!model) {
      throw new CodexPreferencesResolutionError(
        `Modelo configurado para ${project.name} nao existe no catalogo local do Codex: ${current.model}.`,
      );
    }

    const previousReasoningEffort = current.reasoningEffort;
    const persisted = await this.dependencies.store.save(project, {
      model: current.model,
      reasoningEffort: normalizedEffort,
      speed: current.speed,
    });
    const resolved = this.buildResolvedFromPersisted(
      project,
      persisted,
      model,
      catalog.fetchedAt,
      null,
      null,
    );

    this.logger?.info("Preferencia de reasoning do Codex atualizada para projeto", {
      projectName: project.name,
      projectPath: project.path,
      model: current.model,
      previousReasoningEffort,
      nextReasoningEffort: normalizedEffort,
      speed: current.speed,
      catalogPath: this.dependencies.catalogReader.catalogPath,
    });

    return {
      status: "selected",
      current: resolved,
      previousReasoningEffort,
    };
  }

  async listSpeed(project: ProjectRef): Promise<CodexSpeedSelectionSnapshot> {
    const current = await this.resolveProjectPreferences(project);

    return {
      project: { ...project },
      current,
      speedOptions: buildSpeedOptions(current),
    };
  }

  async selectSpeed(project: ProjectRef, speed: string): Promise<CodexSpeedSelectionResult> {
    const normalizedSpeed = normalizeSpeed(speed);
    const [catalog, current] = await Promise.all([
      this.readCatalog(),
      this.resolveProjectPreferences(project),
    ]);

    if (!normalizedSpeed) {
      return {
        status: "not-supported",
        speed: speed.trim(),
        current,
        supportedSpeeds: SUPPORTED_SPEEDS,
      };
    }

    if (normalizedSpeed === "fast" && !current.fastModeSupported) {
      return {
        status: "not-supported",
        speed: normalizedSpeed,
        current,
        supportedSpeeds: SUPPORTED_SPEEDS.filter((value) =>
          value === "standard" || current.fastModeSupported,
        ),
      };
    }

    const model = catalog.models.find((entry) => entry.slug === current.model);
    if (!model) {
      throw new CodexPreferencesResolutionError(
        `Modelo configurado para ${project.name} nao existe no catalogo local do Codex: ${current.model}.`,
      );
    }

    const previousSpeed = current.speed;
    const persisted = await this.dependencies.store.save(project, {
      model: current.model,
      reasoningEffort: current.reasoningEffort,
      speed: normalizedSpeed,
    });
    const resolved = this.buildResolvedFromPersisted(
      project,
      persisted,
      model,
      catalog.fetchedAt,
      null,
      null,
    );

    this.logger?.info("Preferencia de velocidade do Codex atualizada para projeto", {
      projectName: project.name,
      projectPath: project.path,
      model: current.model,
      previousSpeed,
      nextSpeed: normalizedSpeed,
      catalogPath: this.dependencies.catalogReader.catalogPath,
    });

    return {
      status: "selected",
      current: resolved,
      previousSpeed,
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
  ): CandidatePreferences {
    const defaultModel = catalogModels.find(isSelectableModel);
    if (!defaultModel) {
      throw new CodexPreferencesResolutionError(
        `Nenhum modelo selecionavel encontrado no catalogo local do Codex para ${project.name}.`,
      );
    }

    const persistedUpdatedAt = persisted ? new Date(persisted.updatedAt) : null;
    const configModel = normalizeNonEmptyString(localConfig.model);
    const configReasoning = normalizeNonEmptyString(localConfig.reasoningEffort);
    const localConfigDefinesSpeed =
      normalizeNonEmptyString(localConfig.serviceTier) !== null || localConfig.fastModeEnabled !== null;
    const configSpeed = resolveSpeedFromLocalConfig(localConfig);

    const model = persisted
      ? {
          value: persisted.model,
          source: persisted.source,
          updatedAt: persistedUpdatedAt ?? catalogFetchedAt,
        }
      : configModel
        ? {
            value: configModel,
            source: "codex-config" as const,
            updatedAt: localConfig.loadedAt,
          }
        : {
            value: defaultModel.slug,
            source: "catalog-default" as const,
            updatedAt: catalogFetchedAt,
          };

    const modelFromCatalog = catalogModels.find((entry) => entry.slug === model.value);
    if (!modelFromCatalog) {
      throw new CodexPreferencesResolutionError(
        `Modelo definido na configuracao local do Codex nao existe no catalogo: ${model.value}.`,
      );
    }

    const reasoningEffort = persisted
      ? {
          value: persisted.reasoningEffort,
          source: persisted.source,
          updatedAt: persistedUpdatedAt ?? catalogFetchedAt,
        }
      : configReasoning
        ? {
            value: configReasoning,
            source: "codex-config" as const,
            updatedAt: localConfig.loadedAt,
          }
        : {
            value: modelFromCatalog.defaultReasoningLevel,
            source: model.source,
            updatedAt: model.updatedAt,
          };

    const speed = persisted?.speed
      ? {
          value: persisted.speed,
          source: persisted.source,
          updatedAt: persistedUpdatedAt ?? catalogFetchedAt,
        }
      : localConfigDefinesSpeed
        ? {
            value: configSpeed,
            source: "codex-config" as const,
            updatedAt: localConfig.loadedAt,
          }
        : {
            value: "standard" as const,
            source: "catalog-default" as const,
            updatedAt: catalogFetchedAt,
          };

    return {
      model,
      reasoningEffort,
      speed,
    };
  }

  private buildResolvedPreferences(
    project: ProjectRef,
    candidate: CandidatePreferences,
    model: CodexModelCatalogEntry,
    catalogFetchedAt: Date,
  ): CodexResolvedProjectPreferences {
    const supportedEfforts = new Set(model.supportedReasoningLevels.map((level) => level.effort));
    const reasoningAdjustedFrom = supportedEfforts.has(candidate.reasoningEffort.value)
      ? null
      : candidate.reasoningEffort.value;
    const reasoningEffort = reasoningAdjustedFrom
      ? model.defaultReasoningLevel
      : candidate.reasoningEffort.value;
    const fastModeSupported = isFastModeSupportedModel(model.slug);
    const speedAdjustedFrom =
      candidate.speed.value === "fast" && !fastModeSupported ? candidate.speed.value : null;
    const speed = speedAdjustedFrom ? "standard" : candidate.speed.value;
    const sources = {
      model: candidate.model.source,
      reasoningEffort: candidate.reasoningEffort.source,
      speed: candidate.speed.source,
    };

    return {
      project: { ...project },
      model: model.slug,
      reasoningEffort,
      speed,
      updatedAt: latestDate(
        candidate.model.updatedAt,
        candidate.reasoningEffort.updatedAt,
        candidate.speed.updatedAt,
      ),
      source: summarizeSources(sources),
      sources,
      catalogFetchedAt,
      modelDisplayName: model.displayName,
      modelDescription: model.description,
      modelVisibility: model.visibility,
      modelSelectable: isSelectableModel(model),
      supportedReasoningLevels: model.supportedReasoningLevels.map((level) => ({ ...level })),
      defaultReasoningEffort: model.defaultReasoningLevel,
      reasoningAdjustedFrom,
      fastModeSupported,
      speedAdjustedFrom,
    };
  }

  private buildResolvedFromPersisted(
    project: ProjectRef,
    persisted: PersistedCodexProjectPreference,
    model: CodexModelCatalogEntry,
    catalogFetchedAt: Date,
    reasoningAdjustedFrom: string | null,
    speedAdjustedFrom: CodexSpeed | null,
  ): CodexResolvedProjectPreferences {
    return {
      project: { ...project },
      model: persisted.model,
      reasoningEffort: persisted.reasoningEffort,
      speed: persisted.speed ?? "standard",
      updatedAt: new Date(persisted.updatedAt),
      source: persisted.source,
      sources: {
        model: persisted.source,
        reasoningEffort: persisted.source,
        speed: persisted.source,
      },
      catalogFetchedAt,
      modelDisplayName: model.displayName,
      modelDescription: model.description,
      modelVisibility: model.visibility,
      modelSelectable: isSelectableModel(model),
      supportedReasoningLevels: model.supportedReasoningLevels.map((level) => ({ ...level })),
      defaultReasoningEffort: model.defaultReasoningLevel,
      reasoningAdjustedFrom,
      fastModeSupported: isFastModeSupportedModel(model.slug),
      speedAdjustedFrom,
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

const buildSpeedOptions = (current: CodexResolvedProjectPreferences): CodexSpeedOption[] => [
  {
    slug: "standard",
    label: "Standard",
    description: "Mantem o modo padrao, sem ativar Fast mode explicitamente.",
    selectable: true,
    active: current.speed === "standard",
  },
  {
    slug: "fast",
    label: "Fast",
    description: current.fastModeSupported
      ? "Ativa Fast mode para respostas mais rapidas."
      : "Disponivel apenas quando o modelo atual suporta Fast mode.",
    selectable: current.fastModeSupported,
    active: current.speed === "fast",
  },
];

const resolveSpeedFromLocalConfig = (localConfig: CodexLocalConfigSnapshot): CodexSpeed => {
  const serviceTier = normalizeNonEmptyString(localConfig.serviceTier)?.toLowerCase();
  if (localConfig.fastModeEnabled === false) {
    return "standard";
  }

  if (serviceTier === "fast") {
    return "fast";
  }

  return "standard";
};

const normalizeNonEmptyString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeSpeed = (value: string): CodexSpeed | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "standard" || normalized === "fast") {
    return normalized;
  }

  return null;
};

const isSelectableModel = (model: CodexModelCatalogEntry): boolean => model.visibility === "list";

const isFastModeSupportedModel = (model: string): boolean => FAST_MODE_SUPPORTED_MODELS.has(model);

const summarizeSources = (
  sources: Record<string, CodexPreferenceSource>,
): CodexPreferenceResolutionSource => {
  const values = new Set(Object.values(sources));
  if (values.size === 1) {
    return Object.values(sources)[0] ?? "catalog-default";
  }

  return "mixed";
};

const latestDate = (...dates: Date[]): Date => {
  const latestTime = Math.max(...dates.map((date) => date.getTime()));
  return new Date(latestTime);
};
