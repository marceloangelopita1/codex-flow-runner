import { ProjectRef } from "./project.js";

export type CodexPreferenceSource = "runner-local" | "codex-config" | "catalog-default";
export type CodexPreferenceResolutionSource = CodexPreferenceSource | "mixed";
export type CodexSpeed = "standard" | "fast";

export interface CodexPreferenceSources {
  model: CodexPreferenceSource;
  reasoningEffort: CodexPreferenceSource;
  speed: CodexPreferenceSource;
}

export interface CodexInvocationPreferences {
  model: string;
  reasoningEffort: string;
  speed?: CodexSpeed;
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
  speed: CodexSpeed;
  updatedAt: Date;
  source: CodexPreferenceResolutionSource;
  sources: CodexPreferenceSources;
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
  fastModeSupported: boolean;
  speedAdjustedFrom: CodexSpeed | null;
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

export interface CodexSpeedOption {
  slug: CodexSpeed;
  label: string;
  description: string;
  selectable: boolean;
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

export interface CodexSpeedSelectionSnapshot {
  project: ProjectRef;
  current: CodexResolvedProjectPreferences;
  speedOptions: CodexSpeedOption[];
}

export type CodexModelSelectionResult =
  | {
      status: "selected";
      current: CodexResolvedProjectPreferences;
      previousModel: string;
      reasoningResetFrom: string | null;
      speedResetFrom: CodexSpeed | null;
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

export type CodexSpeedSelectionResult =
  | {
      status: "selected";
      current: CodexResolvedProjectPreferences;
      previousSpeed: CodexSpeed;
    }
  | {
      status: "not-supported";
      speed: string;
      current: CodexResolvedProjectPreferences;
      supportedSpeeds: CodexSpeed[];
    };

export interface CodexObservedTurnPreferences {
  model: string;
  reasoningEffort: string;
  observedAt: Date;
}
