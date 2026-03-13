import { ProjectRef } from "./project.js";

export type CodexPreferenceSource = "runner-local" | "codex-config" | "catalog-default";

export interface CodexInvocationPreferences {
  model: string;
  reasoningEffort: string;
}

export interface CodexReasoningLevel {
  effort: string;
  description: string;
}

export interface CodexModelCatalogEntry {
  slug: string;
  displayName: string;
  description: string | null;
  visibility: string;
  defaultReasoningLevel: string;
  supportedReasoningLevels: CodexReasoningLevel[];
  priority: number | null;
}

export interface CodexModelCatalogSnapshot {
  fetchedAt: Date;
  models: CodexModelCatalogEntry[];
}

export interface CodexProjectPreferences {
  model: string;
  reasoningEffort: string;
  updatedAt: Date;
  source: CodexPreferenceSource;
}

export interface CodexResolvedProjectPreferences extends CodexProjectPreferences {
  project: ProjectRef;
  catalogFetchedAt: Date;
  modelDisplayName: string;
  modelDescription: string | null;
  modelVisibility: string | null;
  modelSelectable: boolean;
  supportedReasoningLevels: CodexReasoningLevel[];
  defaultReasoningEffort: string;
  reasoningAdjustedFrom: string | null;
}

export interface CodexModelOption {
  slug: string;
  displayName: string;
  description: string | null;
  visibility: string;
  selectable: boolean;
  active: boolean;
  defaultReasoningEffort: string;
  supportedReasoningLevels: CodexReasoningLevel[];
}

export interface CodexReasoningOption extends CodexReasoningLevel {
  active: boolean;
}

export interface CodexModelSelectionSnapshot {
  project: ProjectRef;
  current: CodexResolvedProjectPreferences;
  models: CodexModelOption[];
}

export interface CodexReasoningSelectionSnapshot {
  project: ProjectRef;
  current: CodexResolvedProjectPreferences;
  reasoningLevels: CodexReasoningOption[];
}

export type CodexModelSelectionResult =
  | {
      status: "selected";
      current: CodexResolvedProjectPreferences;
      previousModel: string;
      reasoningResetFrom: string | null;
    }
  | {
      status: "not-found";
      model: string;
      current: CodexResolvedProjectPreferences;
      availableModels: string[];
    }
  | {
      status: "not-selectable";
      model: string;
      current: CodexResolvedProjectPreferences;
      visibility: string | null;
    };

export type CodexReasoningSelectionResult =
  | {
      status: "selected";
      current: CodexResolvedProjectPreferences;
      previousReasoningEffort: string;
    }
  | {
      status: "not-supported";
      effort: string;
      current: CodexResolvedProjectPreferences;
      supportedEfforts: string[];
    };

export interface CodexObservedTurnPreferences {
  model: string;
  reasoningEffort: string;
  observedAt: Date;
}
