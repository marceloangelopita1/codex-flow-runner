import { ProjectRef } from "./project.js";

export type TargetFlowKind =
  | "target-prepare"
  | "target-checkup"
  | "target-derive"
  | "target-investigate-case-v2";

export type TargetFlowCommand =
  | "/target_prepare"
  | "/target_checkup"
  | "/target_derive_gaps"
  | "/target_investigate_case_v2";

export type TargetFlowVersionBoundaryState = "before-versioning" | "after-versioning";

export type TargetPrepareMilestone = "preflight" | "ai-adjustment" | "post-check" | "versioning";
export type TargetCheckupMilestone =
  | "preflight"
  | "evidence-collection"
  | "editorial-summary"
  | "versioning";
export type TargetDeriveMilestone =
  | "preflight"
  | "dedup-prioritization"
  | "materialization"
  | "versioning";
export type TargetInvestigateCaseV2Milestone =
  | "preflight"
  | "resolve-case"
  | "assemble-evidence"
  | "diagnosis"
  | "deep-dive"
  | "improvement-proposal"
  | "ticket-projection"
  | "publication";
export type TargetInvestigateCaseMilestone = TargetInvestigateCaseV2Milestone;

export type TargetFlowMilestone =
  | TargetPrepareMilestone
  | TargetCheckupMilestone
  | TargetDeriveMilestone
  | TargetInvestigateCaseMilestone;

export interface TargetFlowAiExchange {
  stageLabel: string;
  promptTemplatePath: string;
  promptText: string;
  outputText: string;
  diagnostics?: {
    stdoutPreview?: string;
    stderrPreview?: string;
  };
}

export interface TargetFlowMilestoneEvent<Milestone extends string = string> {
  flow: TargetFlowKind;
  command: TargetFlowCommand;
  targetProject: ProjectRef;
  milestone: Milestone;
  milestoneLabel: string;
  message: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
  recordedAtUtc: string;
}

export interface TargetFlowLifecycleHooks<Milestone extends string = string> {
  onMilestone?: (event: TargetFlowMilestoneEvent<Milestone>) => Promise<void> | void;
  onAiExchange?: (event: TargetFlowAiExchange) => Promise<void> | void;
  isCancellationRequested?: () => boolean;
}

export const TARGET_PREPARE_MILESTONE_LABELS: Record<TargetPrepareMilestone, string> = {
  preflight: "preflight",
  "ai-adjustment": "adequacao por IA",
  "post-check": "pos-check",
  versioning: "versionamento",
};

export const TARGET_CHECKUP_MILESTONE_LABELS: Record<TargetCheckupMilestone, string> = {
  preflight: "preflight",
  "evidence-collection": "coleta de evidencias",
  "editorial-summary": "sintese/redacao",
  versioning: "versionamento",
};

export const TARGET_DERIVE_MILESTONE_LABELS: Record<TargetDeriveMilestone, string> = {
  preflight: "preflight",
  "dedup-prioritization": "deduplicacao/priorizacao",
  materialization: "materializacao",
  versioning: "versionamento",
};

export const TARGET_INVESTIGATE_CASE_V2_MILESTONE_LABELS: Record<
  TargetInvestigateCaseV2Milestone,
  string
> = {
  preflight: "preflight",
  "resolve-case": "resolve-case",
  "assemble-evidence": "assemble-evidence",
  diagnosis: "diagnosis",
  "deep-dive": "deep-dive",
  "improvement-proposal": "improvement-proposal",
  "ticket-projection": "ticket-projection",
  publication: "publication",
};

export const targetFlowKindToCommand = (flow: TargetFlowKind): TargetFlowCommand => {
  if (flow === "target-prepare") {
    return "/target_prepare";
  }

  if (flow === "target-checkup") {
    return "/target_checkup";
  }

  if (flow === "target-derive") {
    return "/target_derive_gaps";
  }

  return "/target_investigate_case_v2";
};

export const targetFlowCommandToKind = (command: TargetFlowCommand): TargetFlowKind => {
  if (command === "/target_prepare") {
    return "target-prepare";
  }

  if (command === "/target_checkup") {
    return "target-checkup";
  }

  if (command === "/target_derive_gaps") {
    return "target-derive";
  }

  return "target-investigate-case-v2";
};

export const renderTargetFlowMilestoneLabel = (
  flow: TargetFlowKind,
  milestone: TargetFlowMilestone,
): string => {
  if (flow === "target-prepare") {
    return TARGET_PREPARE_MILESTONE_LABELS[milestone as TargetPrepareMilestone];
  }

  if (flow === "target-checkup") {
    return TARGET_CHECKUP_MILESTONE_LABELS[milestone as TargetCheckupMilestone];
  }

  if (flow === "target-derive") {
    return TARGET_DERIVE_MILESTONE_LABELS[milestone as TargetDeriveMilestone];
  }

  return TARGET_INVESTIGATE_CASE_V2_MILESTONE_LABELS[
    milestone as TargetInvestigateCaseV2Milestone
  ];
};
