import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  InvalidTargetProjectNameError,
  TargetProjectGitMissingError,
  TargetProjectNotFoundError,
  TargetProjectResolver,
} from "../integrations/target-project-resolver.js";
import { ProjectRef } from "../types/project.js";
import {
  compareTargetInvestigateCaseEvidenceSufficiency,
  isTargetInvestigateCasePublicationCombinationValid,
  normalizeTargetInvestigateCaseRelativePath,
  normalizeTargetInvestigateCaseManifestDocument,
  targetInvestigateCaseAssessmentSchema,
  targetInvestigateCaseCaseResolutionSchema,
  targetInvestigateCaseCausalDebugRequestSchema,
  targetInvestigateCaseCausalDebugResultSchema,
  targetInvestigateCaseDossierJsonSchema,
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseFinalSummarySchema,
  targetInvestigateCaseNormalizedInputSchema,
  targetInvestigateCasePublicationDecisionSchema,
  targetInvestigateCaseRootCauseReviewRequestSchema,
  targetInvestigateCaseRootCauseReviewResultSchema,
  targetInvestigateCaseTicketProposalSchema,
  targetInvestigateCaseSemanticReviewRequestSchema,
  targetInvestigateCaseSemanticReviewResultSchema,
  targetInvestigateCaseRootCauseReviewTraceSchema,
  targetInvestigateCaseSemanticReviewTraceSchema,
  targetInvestigateCaseTracePayloadSchema,
  TargetInvestigateCaseAssessment,
  TargetInvestigateCaseArtifactSet,
  TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_COMMAND,
  TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROUNDS_DIR,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
  TargetInvestigateCaseCaseResolution,
  TargetInvestigateCaseCausalDebugRequest,
  TargetInvestigateCaseCausalDebugResult,
  TargetInvestigateCaseCompletedSummary,
  TargetInvestigateCaseEvidenceBundle,
  TargetInvestigateCaseExecutionResult,
  TargetInvestigateCaseFailureKind,
  TargetInvestigateCaseFailureSummary,
  TargetInvestigateCaseFailureSurface,
  TargetInvestigateCaseFinalSummary,
  TargetInvestigateCaseLifecycleHooks,
  TargetInvestigateCaseManifest,
  TargetInvestigateCaseNormalizedInput,
  TargetInvestigateCasePublicationDecision,
  TargetInvestigateCasePublicationStatus,
  TargetInvestigateCaseRootCauseReviewRequest,
  TargetInvestigateCaseRootCauseReviewResult,
  TargetInvestigateCaseRootCauseReviewTrace,
  TargetInvestigateCaseSemanticReviewRequest,
  TargetInvestigateCaseSemanticReviewResult,
  TargetInvestigateCaseSemanticReviewTrace,
  TargetInvestigateCaseTicketProposal,
  TargetInvestigateCaseTracePayload,
} from "../types/target-investigate-case.js";
import {
  TARGET_INVESTIGATE_CASE_MILESTONE_LABELS,
  TargetFlowVersionBoundaryState,
  TargetInvestigateCaseMilestone,
  targetFlowKindToCommand,
} from "../types/target-flow.js";

export interface TargetInvestigateCaseInput {
  projectName: string;
  caseRef: string;
  workflow?: string | null;
  requestId?: string | null;
  window?: string | null;
  symptom?: string | null;
}

export interface TargetInvestigateCaseArtifactPaths {
  caseResolutionPath: string;
  evidenceBundlePath: string;
  assessmentPath: string;
  dossierPath: string;
  semanticReviewRequestPath?: string;
  semanticReviewResultPath?: string;
  causalDebugRequestPath?: string;
  causalDebugResultPath?: string;
  rootCauseReviewRequestPath?: string;
  rootCauseReviewResultPath?: string;
  remediationProposalPath?: string;
  ticketProposalPath?: string;
  publicationDecisionPath?: string;
}

export interface TargetInvestigateCaseTicketPublicationRequest {
  targetProject: ProjectRef;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  manifest: TargetInvestigateCaseManifest;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  ticketProposal?: TargetInvestigateCaseTicketProposal | null;
  summary: TargetInvestigateCaseFinalSummary;
}

export interface TargetInvestigateCaseTicketPublicationResult {
  ticketPath: string;
}

export interface TargetInvestigateCaseTicketPublisher {
  publish(
    request: TargetInvestigateCaseTicketPublicationRequest,
  ): Promise<TargetInvestigateCaseTicketPublicationResult>;
}

export type TargetInvestigateCaseManifestLoadResult =
  | {
      status: "loaded";
      manifest: TargetInvestigateCaseManifest;
      manifestPath: string;
    }
  | {
      status: "missing";
      manifestPath: string;
      reason: string;
    }
  | {
      status: "invalid";
      manifestPath: string;
      reason: string;
    };

export interface TargetInvestigateCaseEvaluationRequest {
  targetProject: ProjectRef;
  input: string | TargetInvestigateCaseInput;
  artifacts: TargetInvestigateCaseArtifactPaths;
  ticketPublisher?: TargetInvestigateCaseTicketPublisher;
}

export interface TargetInvestigateCaseEvaluationResult {
  manifestPath: string;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  summary: TargetInvestigateCaseFinalSummary;
  tracePayload: TargetInvestigateCaseTracePayload;
}

export interface TargetInvestigateCaseExecuteRequest {
  input: string | TargetInvestigateCaseInput | TargetInvestigateCaseNormalizedInput;
}

export interface TargetInvestigateCaseRoundPreparationRequest {
  targetProject: ProjectRef;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  manifest: TargetInvestigateCaseManifest;
  manifestPath: string;
  roundId: string;
  roundDirectory: string;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  isCancellationRequested: () => boolean;
}

export type TargetInvestigateCaseRoundPreparationResult =
  | {
      status: "prepared";
      dossierPath?: string;
      ticketPublisher?: TargetInvestigateCaseTicketPublisher | null;
    }
  | {
      status: "blocked";
      message: string;
    }
  | {
      status: "failed";
      message: string;
      failureSurface?: TargetInvestigateCaseFailureSurface;
      failureKind?: TargetInvestigateCaseFailureKind;
      failedAtMilestone?: TargetInvestigateCaseMilestone;
      nextAction?: string;
    };

export interface TargetInvestigateCaseRoundPreparer {
  prepareRound(
    request: TargetInvestigateCaseRoundPreparationRequest,
  ): Promise<TargetInvestigateCaseRoundPreparationResult>;
}

interface TargetInvestigateCaseExecutorDependencies {
  targetProjectResolver: TargetProjectResolver;
  roundPreparer?: TargetInvestigateCaseRoundPreparer;
  now?: () => Date;
}

export interface TargetInvestigateCaseExecutor {
  execute(
    request: TargetInvestigateCaseExecuteRequest,
    hooks?: TargetInvestigateCaseLifecycleHooks,
  ): Promise<TargetInvestigateCaseExecutionResult>;
}

export interface TargetInvestigateCaseCaseResolutionCompatibilityIssue {
  code: "round-id-promoted-to-request-id";
  message: string;
  context?: Record<string, unknown>;
}

interface ValidatedDossierArtifact {
  path: string;
  format: "markdown" | "json";
}

interface DiscoveredSemanticReviewArtifacts {
  trace: TargetInvestigateCaseSemanticReviewTrace;
  request: TargetInvestigateCaseSemanticReviewRequest | null;
  result: TargetInvestigateCaseSemanticReviewResult | null;
}

interface DiscoveredCausalDebugArtifacts {
  request: TargetInvestigateCaseCausalDebugRequest | null;
  result: TargetInvestigateCaseCausalDebugResult | null;
  ticketProposal: TargetInvestigateCaseTicketProposal | null;
}

interface DiscoveredRootCauseReviewArtifacts {
  trace: TargetInvestigateCaseRootCauseReviewTrace;
  request: TargetInvestigateCaseRootCauseReviewRequest | null;
  result: TargetInvestigateCaseRootCauseReviewResult | null;
}

class TargetInvestigateCaseOperationalFailureError extends Error {
  constructor(
    public readonly failureSurface: TargetInvestigateCaseFailureSurface,
    public readonly failureKind: TargetInvestigateCaseFailureKind,
    public readonly failedAtMilestone: TargetInvestigateCaseMilestone,
    message: string,
    public readonly nextAction: string,
  ) {
    super(message);
    this.name = "TargetInvestigateCaseOperationalFailureError";
  }
}

const isTargetInvestigateCaseOperationalFailure = (
  error: unknown,
): error is TargetInvestigateCaseOperationalFailureError =>
  error instanceof TargetInvestigateCaseOperationalFailureError ||
  (typeof error === "object" &&
    error !== null &&
    "failureSurface" in error &&
    "failureKind" in error &&
    "failedAtMilestone" in error &&
    "nextAction" in error);

const OPTIONAL_FLAG_ORDER = [
  ["workflow", "--workflow"],
  ["requestId", "--request-id"],
  ["window", "--window"],
  ["symptom", "--symptom"],
] as const;

const PROHIBITED_TRACE_TOKENS = ["workflow_debug", "db_payload", "transcript"];

export const loadTargetInvestigateCaseManifest = async (
  projectPath: string,
): Promise<TargetInvestigateCaseManifestLoadResult> => {
  const manifestPath = TARGET_INVESTIGATE_CASE_MANIFEST_PATH;
  const absolutePath = path.join(projectPath, ...manifestPath.split("/"));
  let raw = "";

  try {
    raw = await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        status: "missing",
        manifestPath,
        reason: `Manifesto investigativo ausente em ${manifestPath}.`,
      };
    }

    return {
      status: "invalid",
      manifestPath,
      reason: `Falha ao ler ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    return {
      status: "invalid",
      manifestPath,
      reason: `JSON invalido em ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  let manifest: TargetInvestigateCaseManifest;
  try {
    manifest = normalizeTargetInvestigateCaseManifestDocument(decoded);
  } catch (error) {
    return {
      status: "invalid",
      manifestPath,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    status: "loaded",
    manifest,
    manifestPath,
  };
};

export const normalizeTargetInvestigateCaseInput = (
  input: TargetInvestigateCaseInput,
): TargetInvestigateCaseNormalizedInput => {
  const base = {
    projectName: normalizeRequiredValue(input.projectName, "projectName"),
    caseRef: normalizeRequiredValue(input.caseRef, "caseRef"),
    workflow: normalizeOptionalValue(input.workflow ?? undefined),
    requestId: normalizeOptionalValue(input.requestId ?? undefined),
    window: normalizeOptionalValue(input.window ?? undefined),
    symptom: normalizeOptionalValue(input.symptom ?? undefined),
  };
  const canonicalCommand = renderTargetInvestigateCaseCommand(base);

  return targetInvestigateCaseNormalizedInputSchema.parse({
    ...base,
    canonicalCommand,
  });
};

export const parseTargetInvestigateCaseCommand = (
  commandText: string,
): TargetInvestigateCaseNormalizedInput => {
  const tokens = tokenizeCommand(commandText);
  if (tokens.length < 3) {
    throw new Error(
      `Use ${TARGET_INVESTIGATE_CASE_COMMAND} <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...].`,
    );
  }

  if (tokens[0] !== TARGET_INVESTIGATE_CASE_COMMAND) {
    throw new Error(`Comando invalido: esperado ${TARGET_INVESTIGATE_CASE_COMMAND}.`);
  }

  const input: TargetInvestigateCaseInput = {
    projectName: tokens[1] ?? "",
    caseRef: tokens[2] ?? "",
  };
  const seenFlags = new Set<string>();

  for (let index = 3; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    if (!token.startsWith("--")) {
      throw new Error(`Token inesperado no contrato canonico: ${token}.`);
    }

    const nextValue = tokens[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      throw new Error(`Flag sem valor em ${token}.`);
    }

    if (seenFlags.has(token)) {
      throw new Error(`Flag duplicada em ${token}.`);
    }
    seenFlags.add(token);

    if (token === "--workflow") {
      input.workflow = nextValue;
    } else if (token === "--request-id") {
      input.requestId = nextValue;
    } else if (token === "--window") {
      input.window = nextValue;
    } else if (token === "--symptom") {
      input.symptom = nextValue;
    } else {
      throw new Error(`Flag fora do contrato canonico: ${token}.`);
    }

    index += 1;
  }

  return normalizeTargetInvestigateCaseInput(input);
};

export const renderTargetInvestigateCaseCommand = (
  input: Omit<TargetInvestigateCaseNormalizedInput, "canonicalCommand"> | TargetInvestigateCaseNormalizedInput,
): string => {
  const parts = [TARGET_INVESTIGATE_CASE_COMMAND, input.projectName.trim(), input.caseRef.trim()];

  for (const [key, flag] of OPTIONAL_FLAG_ORDER) {
    const value = input[key];
    if (value) {
      parts.push(flag, quoteIfNeeded(value));
    }
  }

  return parts.join(" ");
};

export const evaluateTargetInvestigateCaseRound = async (
  request: TargetInvestigateCaseEvaluationRequest,
): Promise<TargetInvestigateCaseEvaluationResult> => {
  const manifestLoad = await loadTargetInvestigateCaseManifest(request.targetProject.path);
  if (manifestLoad.status !== "loaded") {
    throw new Error(manifestLoad.reason);
  }

  const normalizedInput =
    typeof request.input === "string"
      ? parseTargetInvestigateCaseCommand(request.input)
      : normalizeTargetInvestigateCaseInput(request.input);

  if (normalizedInput.projectName !== request.targetProject.name) {
    throw new Error(
      `Projeto do contrato canonico (${normalizedInput.projectName}) diverge do target recebido (${request.targetProject.name}).`,
    );
  }

  validateInputAgainstManifest(manifestLoad.manifest, normalizedInput);
  const artifactPaths = normalizeArtifactPaths(request.artifacts);
  const caseResolution = await readTargetInvestigateCaseCaseResolutionArtifact({
    projectPath: request.targetProject.path,
    relativePath: artifactPaths.caseResolutionPath,
    normalizedInput,
    roundId: path.posix.basename(path.posix.dirname(artifactPaths.caseResolutionPath)),
  });
  const evidenceBundle = await readJsonArtifact(
    request.targetProject.path,
    artifactPaths.evidenceBundlePath,
    targetInvestigateCaseEvidenceBundleSchema,
    "evidence-bundle.json",
  );
  const assessment = await readJsonArtifact(
    request.targetProject.path,
    artifactPaths.assessmentPath,
    targetInvestigateCaseAssessmentSchema,
    "assessment.json",
  );
  const dossier = await validateDossierArtifact(request.targetProject.path, artifactPaths.dossierPath);
  const semanticReview = await discoverTargetInvestigateCaseSemanticReviewArtifacts(
    request.targetProject.path,
    manifestLoad.manifest,
    artifactPaths,
  );
  const causalDebug = await discoverTargetInvestigateCaseCausalDebugArtifacts(
    request.targetProject.path,
    manifestLoad.manifest,
    artifactPaths,
  );
  const rootCauseReview = await discoverTargetInvestigateCaseRootCauseReviewArtifacts(
    request.targetProject.path,
    manifestLoad.manifest,
    artifactPaths,
  );
  const remediationProposalPath =
    artifactPaths.remediationProposalPath &&
    (await relativePathExists(request.targetProject.path, artifactPaths.remediationProposalPath))
      ? artifactPaths.remediationProposalPath
      : null;

  validateCaseResolution(normalizedInput, manifestLoad.manifest, caseResolution);
  assertOperationalSubflowsReady(semanticReview, causalDebug, rootCauseReview, assessment);
  validateAssessmentConsistency(assessment, semanticReview, causalDebug, rootCauseReview);
  validateEvidenceCoherence(evidenceBundle, assessment, semanticReview);

  const decision = await buildPublicationDecision({
    targetProject: request.targetProject,
    manifest: manifestLoad.manifest,
    normalizedInput,
    artifactPaths,
    caseResolution,
    evidenceBundle,
    assessment,
    rootCauseReview,
    dossier,
    ticketProposal: causalDebug.ticketProposal,
    ticketPublisher: request.ticketPublisher,
  });

  const summary = buildTargetInvestigateCaseFinalSummary({
    caseResolution,
    evidenceBundle,
    assessment,
    publicationDecision: decision,
    dossierPath: artifactPaths.dossierPath,
    remediationProposalPath,
  });
  const tracePayload = buildTargetInvestigateCaseTracePayload({
    normalizedInput,
    manifest: manifestLoad.manifest,
    caseResolution,
    evidenceBundle,
    assessment,
    publicationDecision: decision,
    dossierPath: artifactPaths.dossierPath,
    remediationProposalPath,
    semanticReview: semanticReview.trace,
    rootCauseReview: rootCauseReview.trace,
  });
  await writeJsonArtifact(
    request.targetProject.path,
    artifactPaths.publicationDecisionPath,
    targetInvestigateCasePublicationDecisionSchema.parse(decision),
  );

  return {
    manifestPath: manifestLoad.manifestPath,
    normalizedInput,
    artifactPaths,
    caseResolution,
    evidenceBundle,
    assessment,
    publicationDecision: decision,
    summary,
    tracePayload,
  };
};

export const buildTargetInvestigateCaseTracePayload = (params: {
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  manifest: TargetInvestigateCaseManifest;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  dossierPath: string;
  remediationProposalPath?: string | null;
  semanticReview: TargetInvestigateCaseSemanticReviewTrace;
  rootCauseReview: TargetInvestigateCaseRootCauseReviewTrace;
}): TargetInvestigateCaseTracePayload => {
  const investigation = buildTargetInvestigateCaseInvestigationSnapshot({
    assessment: params.assessment,
    publicationDecision: params.publicationDecision,
    remediationProposalPath: params.remediationProposalPath ?? null,
  });

  return targetInvestigateCaseTracePayloadSchema.parse({
    selectors: {
      caseRef: params.normalizedInput.caseRef,
      workflow: params.normalizedInput.workflow ?? null,
      requestId: params.normalizedInput.requestId ?? null,
      window: params.normalizedInput.window ?? null,
      symptom: params.normalizedInput.symptom ?? null,
    },
    resolved_case_ref: params.caseResolution.resolved_case.ref,
    resolved_attempt_ref: params.caseResolution.attempt_resolution.attempt_ref,
    case_resolution: {
      attempt_candidates_status: params.caseResolution.attempt_candidates?.status ?? null,
      selected_attempt_candidate_request_id:
        params.caseResolution.attempt_candidates?.selected_request_id ?? null,
      attempt_candidate_request_ids:
        params.caseResolution.attempt_candidates?.candidate_request_ids ?? [],
      replay_readiness: params.caseResolution.replay_readiness ?? null,
    },
    replay: {
      used: params.evidenceBundle.replay.used,
      mode: params.evidenceBundle.replay.mode,
      requestId: params.evidenceBundle.replay.request_id,
      namespace: params.evidenceBundle.replay.namespace,
    },
    evidence_refs: params.evidenceBundle.sensitive_artifact_refs.map((entry) => ({
      ref: entry.ref,
      path: entry.path ?? null,
      sha256: entry.sha256 ?? null,
      record_count: entry.record_count,
    })),
    verdicts: {
      houve_gap_real: params.assessment.houve_gap_real,
      era_evitavel_internamente: params.assessment.era_evitavel_internamente,
      merece_ticket_generalizavel: params.assessment.merece_ticket_generalizavel,
      confidence: params.assessment.confidence,
      evidence_sufficiency: params.assessment.evidence_sufficiency,
      primary_taxonomy: params.assessment.primary_taxonomy,
      operational_class: params.assessment.operational_class,
    },
    assessment: {
      next_action: params.assessment.next_action,
      blockers: params.assessment.blockers,
      capability_limits: params.assessment.capability_limits,
      primary_remediation: params.assessment.primary_remediation,
    },
    investigation: {
      outcome: investigation.outcome,
      reason: investigation.reason,
      primary_remediation: investigation.primaryRemediation,
      remediation_proposal_path: investigation.remediationProposalPath,
    },
    causal_surface: params.assessment.causal_surface,
    publication: {
      publication_status: params.publicationDecision.publication_status,
      overall_outcome: params.publicationDecision.overall_outcome,
      outcome_reason: params.publicationDecision.outcome_reason,
      gates_applied: [...params.publicationDecision.gates_applied],
      blocked_gates: [...params.publicationDecision.blocked_gates],
      ticket_path: params.publicationDecision.ticket_path,
      next_action: params.publicationDecision.next_action,
    },
    dossier: {
      path: params.dossierPath,
      sensitivity: params.manifest.dossierPolicy.sensitivity,
      retention: params.manifest.dossierPolicy.retention,
    },
    semantic_review: params.semanticReview,
    root_cause_review: params.rootCauseReview,
  });
};

export const buildTargetInvestigateCaseFinalSummary = (params: {
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  dossierPath: string;
  remediationProposalPath?: string | null;
}): TargetInvestigateCaseFinalSummary => {
  const investigation = buildTargetInvestigateCaseInvestigationSnapshot({
    assessment: params.assessment,
    publicationDecision: params.publicationDecision,
    remediationProposalPath: params.remediationProposalPath ?? null,
  });

  return targetInvestigateCaseFinalSummarySchema.parse({
    case_ref: params.caseResolution.case_ref,
    resolved_attempt_ref: params.caseResolution.attempt_resolution.attempt_ref,
    attempt_resolution_status: params.caseResolution.attempt_resolution.status,
    attempt_candidates_status: params.caseResolution.attempt_candidates?.status ?? null,
    replay_readiness_state: params.caseResolution.replay_readiness?.state ?? null,
    replay_used: params.evidenceBundle.replay.used,
    houve_gap_real: params.assessment.houve_gap_real,
    era_evitavel_internamente: params.assessment.era_evitavel_internamente,
    merece_ticket_generalizavel: params.assessment.merece_ticket_generalizavel,
    confidence: params.assessment.confidence,
    evidence_sufficiency: params.assessment.evidence_sufficiency,
    primary_taxonomy: params.assessment.primary_taxonomy,
    operational_class: params.assessment.operational_class,
    root_cause_status: params.assessment.root_cause_review?.root_cause_status ?? null,
    ticket_readiness_status:
      params.assessment.root_cause_review?.ticket_readiness_status ?? null,
    assessment_next_action: params.assessment.next_action,
    investigation_outcome: investigation.outcome,
    investigation_reason: investigation.reason,
    primary_remediation: investigation.primaryRemediation,
    remediation_proposal_path: investigation.remediationProposalPath,
    blocker_codes: params.assessment.blockers.map((entry) => entry.code),
    remaining_gap_codes:
      params.assessment.root_cause_review?.remaining_gaps.map((entry) => entry.code) ?? [],
    causal_surface: params.assessment.causal_surface,
    publication_status: params.publicationDecision.publication_status,
    overall_outcome: params.publicationDecision.overall_outcome,
    outcome_reason: params.publicationDecision.outcome_reason,
    dossier_path: params.dossierPath,
    ticket_path: params.publicationDecision.ticket_path,
    next_action: params.publicationDecision.next_action,
  });
};

const hasActionablePrimaryRemediation = (
  assessment: TargetInvestigateCaseAssessment,
): boolean =>
  assessment.primary_remediation?.status === "recommended" &&
  assessment.primary_remediation.execution_readiness === "ready";

const buildTargetInvestigateCaseInvestigationSnapshot = (params: {
  assessment: TargetInvestigateCaseAssessment;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  remediationProposalPath: string | null;
}): {
  outcome: TargetInvestigateCaseFinalSummary["investigation_outcome"];
  reason: string;
  primaryRemediation: TargetInvestigateCaseFinalSummary["primary_remediation"];
  remediationProposalPath: string | null;
} => {
  const primaryRemediation = params.assessment.primary_remediation ?? null;

  if (hasActionablePrimaryRemediation(params.assessment) && primaryRemediation) {
    return {
      outcome: "actionable-remediation-identified",
      reason: primaryRemediation.rationale,
      primaryRemediation,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (
    params.assessment.primary_taxonomy === "expected_behavior" ||
    params.assessment.houve_gap_real === "no"
  ) {
    return {
      outcome: "no-real-gap",
      reason:
        "A autoridade semantica do projeto alvo concluiu que nao ha melhoria local necessaria neste caso.",
      primaryRemediation,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (params.assessment.causal_surface.owner === "runner") {
    return {
      outcome: "runner-limitation",
      reason:
        "A limitacao principal desta rodada pertence ao proprio runner, nao ao projeto alvo.",
      primaryRemediation,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (
    params.assessment.houve_gap_real === "yes" &&
    params.assessment.era_evitavel_internamente === "no"
  ) {
    return {
      outcome: "real-gap-not-internally-avoidable",
      reason:
        "O caso foi confirmado como gap real, mas sem superficie causal executavel dentro do projeto alvo.",
      primaryRemediation,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (
    params.assessment.houve_gap_real === "yes" &&
    params.assessment.era_evitavel_internamente === "yes" &&
    params.assessment.merece_ticket_generalizavel === "no"
  ) {
    return {
      outcome: "real-gap-not-generalizable",
      reason:
        "O gap real e local ao projeto alvo, mas ainda sem base declarada para generalizacao automatica.",
      primaryRemediation,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (params.assessment.primary_taxonomy === "capability_gap") {
    return {
      outcome: "project-capability-gap",
      reason:
        "A propria capability local do projeto alvo permaneceu insuficiente para fechar a investigacao.",
      primaryRemediation,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  return {
    outcome: "inconclusive",
    reason: params.publicationDecision.outcome_reason,
    primaryRemediation,
    remediationProposalPath: params.remediationProposalPath,
  };
};

export const describeTargetInvestigateCaseInvestigationOutcome = (
  summary: Pick<
    TargetInvestigateCaseFinalSummary,
    | "investigation_outcome"
    | "publication_status"
    | "primary_remediation"
    | "remediation_proposal_path"
  >,
): string => {
  if (summary.investigation_outcome === "actionable-remediation-identified") {
    return summary.publication_status === "eligible"
      ? "Ha remediacao acionavel identificada e a publication automatica ja foi concluida."
      : "Ha remediacao acionavel identificada; publication automatica segue bloqueada.";
  }

  if (summary.investigation_outcome === "no-real-gap") {
    return "Nao ha gap real a corrigir neste caso.";
  }

  if (summary.investigation_outcome === "real-gap-not-internally-avoidable") {
    return "Ha gap real, mas sem superficie causal executavel dentro do projeto alvo.";
  }

  if (summary.investigation_outcome === "real-gap-not-generalizable") {
    return "Ha gap local, mas sem base suficiente para publication automatica.";
  }

  if (summary.investigation_outcome === "project-capability-gap") {
    return "A investigacao esbarrou em um capability gap local do projeto alvo.";
  }

  if (summary.investigation_outcome === "runner-limitation") {
    return "A limitacao principal desta rodada esta no runner.";
  }

  return "A investigacao permanece inconclusiva.";
};

export const renderTargetInvestigateCaseFinalSummary = (
  summary: TargetInvestigateCaseFinalSummary,
): string => {
  const attempt =
    summary.resolved_attempt_ref ??
    (summary.attempt_resolution_status === "absent-explicitly"
      ? "ausencia explicita de tentativa"
      : "nao aplicavel");
  const primaryRemediationLine = summary.primary_remediation
    ? `${summary.primary_remediation.summary} [readiness=${summary.primary_remediation.execution_readiness}; publication_dependency=${summary.primary_remediation.publication_dependency}]`
    : "not available";
  const lines = [
    "# Target investigate case",
    "",
    `- Case-ref: ${summary.case_ref}`,
    `- Resolved attempt: ${attempt}`,
    `- Attempt candidates status: ${summary.attempt_candidates_status ?? "N/A"}`,
    `- Replay readiness state: ${summary.replay_readiness_state ?? "N/A"}`,
    `- Replay used: ${summary.replay_used ? "yes" : "no"}`,
    `- Houve gap real: ${summary.houve_gap_real}`,
    `- Era evitavel internamente: ${summary.era_evitavel_internamente}`,
    `- Merece ticket generalizavel: ${summary.merece_ticket_generalizavel}`,
    `- Confidence: ${summary.confidence}`,
    `- Evidence sufficiency: ${summary.evidence_sufficiency}`,
    `- Primary taxonomy: ${summary.primary_taxonomy ?? "legacy-not-declared"}`,
    `- Operational class: ${summary.operational_class ?? "not_applicable"}`,
    `- Root cause status: ${summary.root_cause_status ?? "legacy-not-declared"}`,
    `- Ticket readiness status: ${summary.ticket_readiness_status ?? "legacy-not-declared"}`,
    `- Assessment next action: ${summary.assessment_next_action ? `${summary.assessment_next_action.code} (${summary.assessment_next_action.source}) - ${summary.assessment_next_action.summary}` : "N/A"}`,
    `- Investigation outcome: ${summary.investigation_outcome}`,
    `- Investigation summary: ${describeTargetInvestigateCaseInvestigationOutcome(summary)}`,
    `- Investigation reason: ${summary.investigation_reason}`,
    `- Primary remediation: ${primaryRemediationLine}`,
    `- Remediation proposal path: ${summary.remediation_proposal_path ?? "(none)"}`,
    `- Blockers: ${summary.blocker_codes.length > 0 ? summary.blocker_codes.join(", ") : "none"}`,
    `- Remaining gap codes: ${summary.remaining_gap_codes.length > 0 ? summary.remaining_gap_codes.join(", ") : "none"}`,
    `- Causal surface: ${summary.causal_surface.owner}/${summary.causal_surface.kind} - ${summary.causal_surface.summary}`,
    `- Publication status: ${summary.publication_status}`,
    `- Overall outcome: ${summary.overall_outcome}`,
    `- Outcome reason: ${summary.outcome_reason}`,
    `- Dossier path: ${summary.dossier_path}`,
    `- Ticket path: ${summary.ticket_path ?? "(none)"}`,
    `- Next action: ${summary.next_action}`,
    "",
  ];

  const rendered = lines.join("\n");
  for (const token of PROHIBITED_TRACE_TOKENS) {
    if (rendered.includes(token)) {
      throw new Error(`Resumo final vazou token proibido: ${token}.`);
    }
  }

  return rendered;
};

export class ControlledTargetInvestigateCaseExecutor implements TargetInvestigateCaseExecutor {
  private readonly now: () => Date;

  constructor(private readonly dependencies: TargetInvestigateCaseExecutorDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async execute(
    request: TargetInvestigateCaseExecuteRequest,
    hooks?: TargetInvestigateCaseLifecycleHooks,
  ): Promise<TargetInvestigateCaseExecutionResult> {
    const normalizedInput = normalizeTargetInvestigateCaseExecuteInput(request.input);

    let targetProject: ProjectRef;
    try {
      targetProject = await this.dependencies.targetProjectResolver.resolveProject(
        normalizedInput.projectName,
        {
          commandLabel: TARGET_INVESTIGATE_CASE_COMMAND,
        },
      );
    } catch (error) {
      return mapTargetInvestigateCaseResolutionError(error);
    }

    const manifestLoad = await loadTargetInvestigateCaseManifest(targetProject.path);
    if (manifestLoad.status === "missing") {
      return {
        status: "blocked",
        reason: "manifest-missing",
        message: manifestLoad.reason,
      };
    }

    if (manifestLoad.status === "invalid") {
      return {
        status: "blocked",
        reason: "manifest-invalid",
        message: manifestLoad.reason,
      };
    }

    const startedAt = this.now();
    const roundId = buildTargetInvestigateCaseRoundId(startedAt);
    const roundDirectory = normalizeTargetInvestigateCaseRelativePath(
      path.join(TARGET_INVESTIGATE_CASE_ROUNDS_DIR, roundId),
    );
    let artifactPaths = buildTargetInvestigateCaseArtifactSet(roundDirectory);
    let finalVersionBoundaryState: TargetFlowVersionBoundaryState = "before-versioning";

    await fs.mkdir(path.join(targetProject.path, ...roundDirectory.split("/")), {
      recursive: true,
    });

    const buildFailure = async (params: {
      failedAtMilestone: TargetInvestigateCaseMilestone;
      failureSurface: TargetInvestigateCaseFailureSurface;
      failureKind: TargetInvestigateCaseFailureKind;
      message: string;
      nextAction: string;
    }): Promise<Extract<TargetInvestigateCaseExecutionResult, { status: "failed" }>> =>
      buildFailedTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(targetProject.path, artifactPaths),
        failedAtMilestone: params.failedAtMilestone,
        failureSurface: params.failureSurface,
        failureKind: params.failureKind,
        message: params.message,
        nextAction: params.nextAction,
        versionBoundaryState: finalVersionBoundaryState,
      });

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "preflight",
      message: `Preflight concluido para ${targetProject.name}.`,
      versionBoundaryState: "before-versioning",
      now: this.now,
    });

    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: [],
        cancelledAtMilestone: "preflight",
        versionBoundaryState: "before-versioning",
      });
    }

    if (!this.dependencies.roundPreparer) {
      return {
        status: "blocked",
        reason: "round-preparer-unavailable",
        message:
          "O runner ainda nao recebeu materializador oficial para gerar os artefatos de case-investigation no projeto alvo.",
      };
    }

    const preparation = await this.dependencies.roundPreparer.prepareRound({
      targetProject,
      normalizedInput,
      manifest: manifestLoad.manifest,
      manifestPath: manifestLoad.manifestPath,
      roundId,
      roundDirectory,
      artifactPaths,
      isCancellationRequested: () => Boolean(hooks?.isCancellationRequested?.()),
    });

    if (preparation.status === "blocked") {
      return {
        status: "blocked",
        reason: "artifact-preparation-blocked",
        message: preparation.message,
      };
    }

    if (preparation.status === "failed") {
      return buildFailure({
        failedAtMilestone: preparation.failedAtMilestone ?? "case-resolution",
        failureSurface: preparation.failureSurface ?? "round-materialization",
        failureKind: preparation.failureKind ?? "artifact-validation-failed",
        message: preparation.message,
        nextAction:
          preparation.nextAction ??
          "Revise a materializacao local da rodada e rerode /target_investigate_case.",
      });
    }

    if (preparation.dossierPath) {
      artifactPaths = {
        ...artifactPaths,
        dossierPath: normalizeTargetInvestigateCaseRelativePath(preparation.dossierPath),
      };
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "case-resolution",
      message: `Resolucao de caso pronta para ${normalizedInput.caseRef}.`,
      versionBoundaryState: "before-versioning",
      now: this.now,
    });
    try {
      await assertRelativeArtifactExists(
        targetProject.path,
        artifactPaths.caseResolutionPath,
        "case-resolution.json",
      );
    } catch (error) {
      return buildFailure({
        failedAtMilestone: "case-resolution",
        failureSurface: "round-materialization",
        failureKind: "artifact-validation-failed",
        message: error instanceof Error ? error.message : String(error),
        nextAction:
          "Garanta que case-resolution.json seja materializado no namespace canonico antes de rerodar.",
      });
    }
    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(targetProject.path, artifactPaths),
        cancelledAtMilestone: "case-resolution",
        versionBoundaryState: "before-versioning",
      });
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "evidence-collection",
      message: `Coleta de evidencias pronta para ${normalizedInput.caseRef}.`,
      versionBoundaryState: "before-versioning",
      now: this.now,
    });
    try {
      await assertRelativeArtifactExists(
        targetProject.path,
        artifactPaths.evidenceBundlePath,
        "evidence-bundle.json",
      );
    } catch (error) {
      return buildFailure({
        failedAtMilestone: "evidence-collection",
        failureSurface: "round-materialization",
        failureKind: "artifact-validation-failed",
        message: error instanceof Error ? error.message : String(error),
        nextAction:
          "Garanta que evidence-bundle.json seja materializado no namespace canonico antes de rerodar.",
      });
    }
    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(targetProject.path, artifactPaths),
        cancelledAtMilestone: "evidence-collection",
        versionBoundaryState: "before-versioning",
      });
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "assessment",
      message: `Assessment semantico pronto para ${normalizedInput.caseRef}.`,
      versionBoundaryState: "before-versioning",
      now: this.now,
    });
    try {
      await assertRelativeArtifactExists(
        targetProject.path,
        artifactPaths.assessmentPath,
        "assessment.json",
      );
      await assertRelativeArtifactExists(targetProject.path, artifactPaths.dossierPath, "dossier");
    } catch (error) {
      return buildFailure({
        failedAtMilestone: "assessment",
        failureSurface: "round-materialization",
        failureKind: "artifact-validation-failed",
        message: error instanceof Error ? error.message : String(error),
        nextAction:
          "Garanta que assessment.json e dossier local existam e estejam coerentes antes de rerodar.",
      });
    }
    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(targetProject.path, artifactPaths),
        cancelledAtMilestone: "assessment",
        versionBoundaryState: "before-versioning",
      });
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "publication",
      message: `Publication runner-side em avaliacao para ${normalizedInput.caseRef}.`,
      versionBoundaryState: "before-versioning",
      now: this.now,
    });
    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(targetProject.path, artifactPaths),
        cancelledAtMilestone: "publication",
        versionBoundaryState: "before-versioning",
      });
    }

    const ticketPublisher = preparation.ticketPublisher
      ? wrapTargetInvestigateCaseTicketPublisher(preparation.ticketPublisher, async () => {
          finalVersionBoundaryState = "after-versioning";
          await emitTargetInvestigateCaseMilestone({
            hooks,
            targetProject,
            milestone: "publication",
            message: `Publication cruzou a fronteira de versionamento para ${normalizedInput.caseRef}.`,
            versionBoundaryState: "after-versioning",
            now: this.now,
          });
        })
      : undefined;

    let evaluation: TargetInvestigateCaseEvaluationResult;
    try {
      evaluation = await evaluateTargetInvestigateCaseRound({
        targetProject,
        input: normalizedInput,
        artifacts: artifactPaths,
        ticketPublisher,
      });
    } catch (error) {
      const inferredFailure = await inferTargetInvestigateCaseFailureFromArtifacts(
        targetProject.path,
        artifactPaths,
      );
      if (inferredFailure) {
        return buildFailure(inferredFailure);
      }

      const classifiedFailure = classifyTargetInvestigateCaseEvaluationFailure(error);
      return buildFailure(classifiedFailure);
    }

    if (evaluation.publicationDecision.versioned_artifact_paths.length === 0) {
      finalVersionBoundaryState = "before-versioning";
    }

    const summary: TargetInvestigateCaseCompletedSummary = {
      targetProject,
      manifestPath: evaluation.manifestPath,
      roundId,
      roundDirectory,
      canonicalCommand: evaluation.normalizedInput.canonicalCommand,
      artifactPaths,
      realizedArtifactPaths: await listExistingTargetInvestigateCaseArtifacts(
        targetProject.path,
        artifactPaths,
      ),
      publicationDecision: evaluation.publicationDecision,
      finalSummary: evaluation.summary,
      tracePayload: evaluation.tracePayload,
      nextAction: evaluation.summary.next_action,
      versionBoundaryState: finalVersionBoundaryState,
    };

    return {
      status: "completed",
      summary,
    };
  }
}

const buildPublicationDecision = async (params: {
  targetProject: ProjectRef;
  manifest: TargetInvestigateCaseManifest;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  rootCauseReview: DiscoveredRootCauseReviewArtifacts;
  dossier: ValidatedDossierArtifact;
  ticketProposal?: TargetInvestigateCaseTicketProposal | null;
  ticketPublisher?: TargetInvestigateCaseTicketPublisher;
}): Promise<TargetInvestigateCasePublicationDecision> => {
  const gatesApplied = [
    "manifest-canonical-path",
    "capability-case-investigation",
    "input-normalized",
    "case-resolution-consistent",
    "evidence-bundle-consistent",
    "assessment-consistent",
    `dossier-${params.dossier.format}`,
  ];
  const blockedGates: string[] = [];
  const hasBlockingVeto = params.assessment.overfit_vetoes.some((entry) => entry.blocking);
  const hasNormativeConflict = params.evidenceBundle.normative_conflicts.some(
    (entry) => entry.blocking && entry.kind !== "high-precedence-conflict",
  );
  const hasHighPrecedenceConflict = params.evidenceBundle.normative_conflicts.some(
    (entry) => entry.blocking && entry.kind === "high-precedence-conflict",
  );
  const hasProjectCapabilityGap =
    params.assessment.primary_taxonomy === "capability_gap" ||
    params.assessment.causal_surface.kind === "project-capability-gap" ||
    params.assessment.causal_surface.kind === "observability-gap";
  const isRunnerLimitation =
    params.assessment.causal_surface.owner === "runner" ||
    params.assessment.causal_surface.kind === "runner-limitation";
  const hasRichTaxonomy =
    params.assessment.primary_taxonomy !== null || params.assessment.operational_class !== null;
  const isExpectedBehaviorTaxonomy = params.assessment.primary_taxonomy === "expected_behavior";
  const isEvidenceGapTaxonomy =
    params.assessment.primary_taxonomy === "evidence_missing_or_partial";
  const isLikelyBugTaxonomy = params.assessment.primary_taxonomy === "bug_likely";
  const hasStrongEnoughEvidence =
    params.assessment.evidence_sufficiency === "strong" ||
    (params.assessment.evidence_sufficiency === "sufficient" &&
      params.manifest.publicationPolicy.allowSufficientWithNormativeConflict &&
      hasNormativeConflict &&
      params.assessment.generalization_basis.length > 0 &&
      !hasBlockingVeto);
  const publicationRequested =
    params.assessment.publication_recommendation.recommended_action === "publish_ticket";
  const rootCauseReviewContractDeclared = Boolean(params.manifest.rootCauseReview);
  const rootCauseReviewResult = params.rootCauseReview.result;
  const rootCauseStatus = rootCauseReviewResult?.root_cause_status ?? null;
  const ticketReadinessStatus = rootCauseReviewResult?.ticket_readiness.status ?? null;
  const rootCauseReviewConfirmedAndReady =
    !rootCauseReviewContractDeclared ||
    (rootCauseStatus === "root_cause_confirmed" && ticketReadinessStatus === "ready");
  const hasContradictoryTicketProposal =
    rootCauseReviewContractDeclared &&
    Boolean(params.ticketProposal) &&
    !rootCauseReviewConfirmedAndReady;
  const semanticallyEligible =
    publicationRequested &&
    rootCauseReviewConfirmedAndReady &&
    (params.assessment.primary_taxonomy === "bug_confirmed" ||
      (params.assessment.houve_gap_real === "yes" &&
        params.assessment.era_evitavel_internamente === "yes" &&
        params.assessment.merece_ticket_generalizavel === "yes") ||
      (params.assessment.houve_gap_real === "inconclusive" &&
        params.assessment.merece_ticket_generalizavel === "yes" &&
        hasProjectCapabilityGap));

  let publication_status: TargetInvestigateCasePublicationStatus = "not_applicable";
  let overall_outcome = "inconclusive-case" as TargetInvestigateCasePublicationDecision["overall_outcome"];
  let outcome_reason = params.assessment.publication_recommendation.reason;
  let next_action =
    "Revisar o dossier local e seguir a proxima acao manual indicada pela capability investigativa.";
  let ticketPath: string | null = null;
  let versionedArtifactPaths: string[] = [];

  if (isRunnerLimitation) {
    publication_status = "not_applicable";
    overall_outcome = "runner-limitation";
    outcome_reason =
      "A superficie causal principal pertence ao proprio runner; nenhum ticket automatico deve ser aberto no projeto alvo.";
    next_action = "Abrir tratamento no runner antes de nova publication para o projeto alvo.";
  } else if (isExpectedBehaviorTaxonomy || params.assessment.houve_gap_real === "no") {
    publication_status = "not_applicable";
    overall_outcome = "no-real-gap";
    outcome_reason =
      "A autoridade semantica do projeto alvo concluiu que o comportamento esperado ja tem base suficiente.";
    next_action = "Encerrar a rodada como no-op local e manter apenas o trace minimizado.";
  } else if (
    params.assessment.houve_gap_real === "yes" &&
    params.assessment.era_evitavel_internamente === "no"
  ) {
    publication_status = "not_eligible";
    overall_outcome = "real-gap-not-internally-avoidable";
    outcome_reason =
      "O caso foi reconhecido como gap real, mas sem superficie causal executavel dentro do projeto alvo.";
    next_action = "Registrar o caso no trace local e encaminhar a dependencia externa fora do fluxo automatico.";
  } else if (
    params.assessment.houve_gap_real === "yes" &&
    params.assessment.era_evitavel_internamente === "yes" &&
    params.assessment.merece_ticket_generalizavel === "no"
  ) {
    publication_status = "not_eligible";
    overall_outcome = "real-gap-not-generalizable";
    outcome_reason =
      "O gap real e local, mas sem base explicita de generalizacao suficiente para ticket automatico.";
    next_action = "Tratar o caso localmente sem publication automatica.";
  } else if (hasContradictoryTicketProposal) {
    blockedGates.push("ticket-proposal-contradicts-root-cause-review");
    if (!rootCauseReviewResult) {
      blockedGates.push("root-cause-review-missing");
    } else if (rootCauseStatus === "plausible_but_unfalsified") {
      blockedGates.push("root-cause-review-plausible-but-unfalsified");
    } else if (rootCauseStatus === "inconclusive") {
      blockedGates.push("root-cause-review-inconclusive");
    } else if (ticketReadinessStatus !== "ready") {
      blockedGates.push("root-cause-review-ticket-not-ready");
    }
    publication_status = "not_eligible";
    overall_outcome = hasProjectCapabilityGap
      ? "inconclusive-project-capability-gap"
      : "inconclusive-case";
    outcome_reason =
      "ticket-proposal.json contradiz o gate root-cause-review e nao pode ser publicado runner-side.";
    next_action =
      params.assessment.root_cause_review?.summary ??
      params.assessment.next_action?.summary ??
      "Recompor root-cause-review.result.json e os artefatos oficiais do target antes de nova publication.";
  } else if (rootCauseReviewContractDeclared && publicationRequested && !rootCauseReviewConfirmedAndReady) {
    if (!rootCauseReviewResult) {
      blockedGates.push("root-cause-review-missing");
      outcome_reason =
        "O manifesto declarou rootCauseReview, mas a etapa ainda nao materializou root-cause-review.result.json valido para publication positiva.";
    } else if (rootCauseStatus === "plausible_but_unfalsified") {
      blockedGates.push("root-cause-review-plausible-but-unfalsified");
      outcome_reason =
        "A etapa root-cause-review concluiu que a causa continua apenas plausivel sem falsificacao suficiente.";
    } else if (rootCauseStatus === "inconclusive") {
      blockedGates.push("root-cause-review-inconclusive");
      outcome_reason =
        "A etapa root-cause-review permaneceu inconclusiva e nao liberou publication positiva.";
    } else if (ticketReadinessStatus !== "ready") {
      blockedGates.push("root-cause-review-ticket-not-ready");
      outcome_reason =
        "A etapa root-cause-review nao liberou ticket_readiness.status=ready para publication runner-side.";
    }
    publication_status = "not_eligible";
    overall_outcome = hasProjectCapabilityGap
      ? "inconclusive-project-capability-gap"
      : "inconclusive-case";
    next_action =
      params.assessment.root_cause_review?.summary ??
      rootCauseReviewResult?.ticket_readiness.summary ??
      params.assessment.next_action?.summary ??
      "Concluir root-cause-review com causa confirmada e ticket readiness explicito antes de nova publication.";
  } else if (semanticallyEligible) {
    if (hasBlockingVeto) {
      blockedGates.push("blocking-overfit-veto");
      publication_status = "blocked_by_policy";
      overall_outcome = "ticket-eligible-but-blocked-by-policy";
      outcome_reason =
        "A recomendacao semantica positiva foi barrada por overfit_vetoes bloqueantes.";
      next_action = "Rever a base de generalizacao antes de qualquer ticket automatico.";
    } else if (hasHighPrecedenceConflict && !hasProjectCapabilityGap) {
      blockedGates.push("high-precedence-conflict");
      publication_status = "not_eligible";
      overall_outcome = "inconclusive-case";
      outcome_reason =
        "Houve conflito entre superficies de precedencia alta sem base suficiente para escolher uma narrativa segura.";
      next_action = "Manter a rodada inconclusiva e auditar o conflito contratual localmente.";
    } else if (!hasStrongEnoughEvidence) {
      blockedGates.push("evidence-threshold");
      publication_status = "not_eligible";
      overall_outcome = hasProjectCapabilityGap
        ? "inconclusive-project-capability-gap"
        : "inconclusive-case";
      outcome_reason =
        "A barra runner-side de suficiencia de evidencia nao foi atingida para publication automatica.";
      next_action = hasProjectCapabilityGap
        ? "Refinar a capability/observabilidade local antes de um ticket automatico."
        : "Coletar mais evidencia ou encerrar o caso como inconclusivo.";
    } else if (!params.manifest.publicationPolicy.allowAutomaticPublication) {
      blockedGates.push("publication-policy");
      publication_status = "blocked_by_policy";
      overall_outcome = "ticket-eligible-but-blocked-by-policy";
      outcome_reason =
        params.manifest.publicationPolicy.blockedReason ??
        "A policy declarada pelo projeto alvo nao permite publication automatica deste ticket.";
      next_action = "Escalar para revisao humana conforme a policy do manifesto.";
    } else if (!params.ticketProposal) {
      blockedGates.push("target-ticket-proposal-missing");
      publication_status = "not_eligible";
      overall_outcome = hasProjectCapabilityGap
        ? "inconclusive-project-capability-gap"
        : "inconclusive-case";
      outcome_reason =
        "O projeto alvo solicitou publication, mas ticket-proposal.json ainda nao foi materializado com base repo-aware suficiente.";
      next_action =
        params.assessment.next_action?.summary ??
        "Materializar ticket-proposal.json no projeto alvo antes de nova publication runner-side.";
    } else if (!params.ticketPublisher) {
      blockedGates.push("ticket-publisher-missing");
      publication_status = "not_applicable";
      overall_outcome = "runner-limitation";
      outcome_reason =
        "O runner nao recebeu publisher configurado para materializar ticket elegivel de case-investigation.";
      next_action = "Conectar o publisher do fluxo antes de habilitar publication automatica.";
    } else {
      const draftSummary = buildTargetInvestigateCaseFinalSummary({
        caseResolution: params.caseResolution,
        evidenceBundle: params.evidenceBundle,
        assessment: params.assessment,
        publicationDecision: {
          publication_status: "eligible",
          overall_outcome: "ticket-published",
          outcome_reason:
            "Os gates mecanicos foram satisfeitos e o ticket elegivel foi materializado no projeto alvo.",
          gates_applied: gatesApplied,
          blocked_gates: blockedGates,
          versioned_artifact_paths: [],
          ticket_path: null,
          next_action:
            "Revisar o ticket publicado no projeto alvo e seguir o fluxo sequencial normal.",
        },
        dossierPath: params.artifactPaths.dossierPath,
      });
      const publication = await params.ticketPublisher.publish({
        targetProject: params.targetProject,
        normalizedInput: params.normalizedInput,
        manifest: params.manifest,
        caseResolution: params.caseResolution,
        evidenceBundle: params.evidenceBundle,
        assessment: params.assessment,
        ticketProposal: params.ticketProposal,
        summary: draftSummary,
      });
      publication_status = "eligible";
      overall_outcome = "ticket-published";
      outcome_reason =
        "Os gates mecanicos foram satisfeitos e o ticket elegivel foi materializado no projeto alvo.";
      ticketPath = normalizeTargetInvestigateCaseRelativePath(publication.ticketPath);
      versionedArtifactPaths = [ticketPath];
      next_action = "Revisar o ticket publicado no projeto alvo e seguir o fluxo sequencial normal.";
    }
  } else if (params.assessment.primary_taxonomy === "capability_gap") {
    publication_status = "not_eligible";
    overall_outcome = "inconclusive-project-capability-gap";
    outcome_reason =
      "O assessment do projeto alvo classificou o caso como capability_gap sem base runner-side suficiente para publication automatica.";
    next_action =
      params.assessment.next_action?.summary ??
      "Revisar a capability local antes de promover ticket automatico.";
  } else if (isLikelyBugTaxonomy) {
    publication_status = "not_applicable";
    overall_outcome = "inconclusive-case";
    outcome_reason =
      "O assessment do projeto alvo sinalizou bug provavel, mas ainda nao confirmado o bastante para publication runner-side.";
    next_action =
      params.assessment.next_action?.summary ??
      "Materializar ou rerodar o semantic-review bounded antes de qualquer publication.";
  } else if (isEvidenceGapTaxonomy) {
    publication_status = "not_applicable";
    overall_outcome = "inconclusive-case";
    outcome_reason =
      "O assessment do projeto alvo ainda indica evidencia faltante ou parcial para publication runner-side.";
    next_action =
      params.assessment.next_action?.summary ??
      "Completar a captura bounded de evidencia antes de qualquer publication.";
  } else if (
    hasProjectCapabilityGap &&
    params.assessment.merece_ticket_generalizavel !== "not_applicable"
  ) {
    publication_status = "not_eligible";
    overall_outcome = "inconclusive-project-capability-gap";
    outcome_reason =
      "A rodada terminou inconclusiva por limitacao local do proprio projeto alvo, mas sem gates suficientes para publication automatica.";
    next_action = "Revisar a capability local antes de promover ticket automatico.";
  } else {
    publication_status =
      params.assessment.houve_gap_real === "yes" ? "not_eligible" : "not_applicable";
    overall_outcome = "inconclusive-case";
    outcome_reason =
      "A rodada permanece inconclusiva sem base runner-side para publication automatica.";
    next_action = "Preservar apenas o trace minimizado e o dossier local desta investigacao.";
  }

  const decision = targetInvestigateCasePublicationDecisionSchema.parse({
    publication_status,
    overall_outcome,
    outcome_reason,
    gates_applied: gatesApplied,
    blocked_gates: blockedGates,
    versioned_artifact_paths: versionedArtifactPaths,
    ticket_path: ticketPath,
    next_action: next_action,
  });

  if (
    !hasRichTaxonomy &&
    !isTargetInvestigateCasePublicationCombinationValid({
      houve_gap_real: params.assessment.houve_gap_real,
      era_evitavel_internamente: params.assessment.era_evitavel_internamente,
      merece_ticket_generalizavel: params.assessment.merece_ticket_generalizavel,
      publication_status: decision.publication_status,
      overall_outcome: decision.overall_outcome,
    })
  ) {
    throw new Error(
      [
        "A combinacao final de vereditos semanticos, publication_status e overall_outcome nao faz parte da matriz canonica.",
        `Tuple: ${params.assessment.houve_gap_real}/${params.assessment.era_evitavel_internamente}/${params.assessment.merece_ticket_generalizavel}/${decision.publication_status}/${decision.overall_outcome}.`,
      ].join(" "),
    );
  }

  return decision;
};

const validateInputAgainstManifest = (
  manifest: TargetInvestigateCaseManifest,
  input: TargetInvestigateCaseNormalizedInput,
): void => {
  for (const selector of manifest.selectors.required) {
    if (selector === "case-ref") {
      continue;
    }

    const normalizedValue = getSelectorValue(input, selector);
    if (!normalizedValue) {
      throw new Error(`Selector obrigatorio ausente segundo o manifesto: ${selector}.`);
    }
  }

  if (input.workflow && !manifest.workflows.investigable.includes(input.workflow)) {
    throw new Error(
      `Workflow fora da allowlist investigavel declarada no manifesto: ${input.workflow}.`,
    );
  }
};

const validateCaseResolution = (
  input: TargetInvestigateCaseNormalizedInput,
  manifest: TargetInvestigateCaseManifest,
  caseResolution: TargetInvestigateCaseCaseResolution,
): void => {
  if (caseResolution.case_ref !== input.caseRef) {
    throw new Error(
      `case-resolution.json diverge do case-ref canonico (${caseResolution.case_ref} != ${input.caseRef}).`,
    );
  }

  const inputSelectors = {
    workflow: input.workflow ?? undefined,
    request_id: input.requestId ?? undefined,
    window: input.window ?? undefined,
    symptom: input.symptom ?? undefined,
  };

  for (const [key, value] of Object.entries(inputSelectors) as Array<
    [keyof typeof inputSelectors, string | undefined]
  >) {
    const resolvedValue = caseResolution.selectors[key] ?? undefined;
    const matchesRedundantCaseRef =
      key === "request_id" &&
      resolvedValue === undefined &&
      value === input.caseRef &&
      caseResolution.case_ref === input.caseRef;

    if (resolvedValue !== value && !matchesRedundantCaseRef) {
      throw new Error(`case-resolution.json diverge do seletor normalizado ${key}.`);
    }
  }

  if (input.workflow && !caseResolution.relevant_workflows.includes(input.workflow)) {
    throw new Error(
      `case-resolution.json nao registra o workflow canonico em relevant_workflows: ${input.workflow}.`,
    );
  }

  if (
    manifest.caseResolutionPolicy.requireExplicitAttemptResolution &&
    caseResolution.attempt_resolution.status === "not-required" &&
    !manifest.caseResolutionPolicy.allowAttemptlessCases
  ) {
    throw new Error("O manifesto exige resolucao explicita de tentativa para este caso.");
  }
};

const assertOperationalSubflowsReady = (
  semanticReview: DiscoveredSemanticReviewArtifacts,
  causalDebug: DiscoveredCausalDebugArtifacts,
  rootCauseReview: DiscoveredRootCauseReviewArtifacts,
  assessment: TargetInvestigateCaseAssessment,
): void => {
  if (semanticReview.trace.status === "failed") {
    throw new TargetInvestigateCaseOperationalFailureError(
      "semantic-review",
      mapSemanticReviewTraceToFailureKind(semanticReview.trace.failure_reason),
      "publication",
      semanticReview.trace.failure_reason ??
        "semantic-review entrou em falha operacional antes da publication runner-side.",
      assessment.next_action?.summary ??
        "Materialize semantic-review.result.json valido para o packet bounded antes de nova publication runner-side.",
    );
  }

  if (!causalDebug.request) {
    return;
  }

  if (causalDebug.request.debug_readiness.status !== "ready") {
    return;
  }

  if (!causalDebug.result) {
    throw new TargetInvestigateCaseOperationalFailureError(
      "causal-debug",
      "artifact-validation-failed",
      "publication",
      "causal-debug.result.json ausente para packet repo-aware pronto.",
      assessment.next_action?.summary ??
        "Materialize causal-debug.result.json no projeto alvo antes de nova publication runner-side.",
    );
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    !causalDebug.ticketProposal
  ) {
    const failureSurface: TargetInvestigateCaseFailureSurface = rootCauseReview.request
      ? "root-cause-review"
      : "causal-debug";
    throw new TargetInvestigateCaseOperationalFailureError(
      failureSurface,
      "artifact-validation-failed",
      "publication",
      "ticket-proposal.json ausente para packet repo-aware pronto com publication positiva.",
      assessment.next_action?.summary ??
        "Materialize ticket-proposal.json no projeto alvo antes de nova publication runner-side.",
    );
  }

  if (!rootCauseReview.request) {
    return;
  }

  if (rootCauseReview.request.review_readiness.status !== "ready") {
    return;
  }

  if (!rootCauseReview.result) {
    throw new TargetInvestigateCaseOperationalFailureError(
      "root-cause-review",
      "artifact-validation-failed",
      "publication",
      "root-cause-review.result.json ausente para packet repo-aware pronto.",
      assessment.next_action?.summary ??
        "Materialize root-cause-review.result.json no projeto alvo antes de nova publication runner-side.",
    );
  }
};

const mapSemanticReviewTraceToFailureKind = (
  failureReason: string | null,
): TargetInvestigateCaseFailureKind => {
  if (!failureReason) {
    return "artifact-validation-failed";
  }

  if (failureReason.includes("request.json invalido")) {
    return "request-invalid";
  }

  if (failureReason.includes("result.json invalido")) {
    return "result-parse-failed";
  }

  return "artifact-validation-failed";
};

const renderArtifactValidationFailure = (summary: string, error: unknown): string => {
  const details = error instanceof Error ? error.message : String(error);
  const normalizedSummary = summary.trim();
  const normalizedDetails = details.trim();

  if (!normalizedDetails) {
    return normalizedSummary;
  }

  return `${normalizedSummary} Detalhes: ${normalizedDetails}`;
};

const classifyTargetInvestigateCaseEvaluationFailure = (error: unknown): {
  failedAtMilestone: TargetInvestigateCaseMilestone;
  failureSurface: TargetInvestigateCaseFailureSurface;
  failureKind: TargetInvestigateCaseFailureKind;
  message: string;
  nextAction: string;
} => {
  if (isTargetInvestigateCaseOperationalFailure(error)) {
    return {
      failedAtMilestone: error.failedAtMilestone,
      failureSurface: error.failureSurface,
      failureKind: error.failureKind,
      message: error.message,
      nextAction: error.nextAction,
    };
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("semantic-review")) {
    return {
      failedAtMilestone: "publication",
      failureSurface: "semantic-review",
      failureKind: mapSemanticReviewTraceToFailureKind(message),
      message,
      nextAction:
        "Materialize semantic-review.result.json valido para o packet bounded antes de nova publication runner-side.",
    };
  }

  if (message.includes("root-cause-review")) {
    return {
      failedAtMilestone: "publication",
      failureSurface: "root-cause-review",
      failureKind: "artifact-validation-failed",
      message,
      nextAction:
        "Materialize root-cause-review.result.json valido antes de nova publication runner-side.",
    };
  }

  if (message.includes("causal-debug") || message.includes("ticket-proposal.json")) {
    return {
      failedAtMilestone: "publication",
      failureSurface: message.includes("ticket-proposal.json") ? "root-cause-review" : "causal-debug",
      failureKind: "artifact-validation-failed",
      message,
      nextAction:
        message.includes("ticket-proposal.json")
          ? "Materialize root-cause-review.result.json e ticket-proposal.json coerentes antes de nova publication runner-side."
          : "Materialize causal-debug.result.json e ticket-proposal.json validos antes de nova publication runner-side.",
    };
  }

  return {
    failedAtMilestone: "publication",
    failureSurface: "round-evaluation",
    failureKind: "round-evaluation-failed",
    message,
    nextAction:
      "Revise a coerencia contratual dos artefatos da rodada antes de rerodar a publication.",
  };
};

const inferTargetInvestigateCaseFailureFromArtifacts = async (
  projectPath: string,
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>,
): Promise<{
  failedAtMilestone: TargetInvestigateCaseMilestone;
  failureSurface: TargetInvestigateCaseFailureSurface;
  failureKind: TargetInvestigateCaseFailureKind;
  message: string;
  nextAction: string;
} | null> => {
  if (await relativePathExists(projectPath, artifactPaths.semanticReviewRequestPath)) {
    try {
      const request = await readJsonArtifact(
        projectPath,
        artifactPaths.semanticReviewRequestPath,
        targetInvestigateCaseSemanticReviewRequestSchema,
        TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
      );
      if (request.review_readiness.status === "ready") {
        if (!(await relativePathExists(projectPath, artifactPaths.semanticReviewResultPath))) {
          return {
            failedAtMilestone: "publication",
            failureSurface: "semantic-review",
            failureKind: "artifact-validation-failed",
            message: "semantic-review.result.json ausente para packet pronto.",
            nextAction:
              "Materialize semantic-review.result.json valido para o packet bounded antes de nova publication runner-side.",
          };
        }

        try {
          await readJsonArtifact(
            projectPath,
            artifactPaths.semanticReviewResultPath,
            targetInvestigateCaseSemanticReviewResultSchema,
            TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT,
          );
        } catch (error) {
          return {
            failedAtMilestone: "publication",
            failureSurface: "semantic-review",
            failureKind: "result-parse-failed",
            message: renderArtifactValidationFailure(
              "semantic-review.result.json invalido.",
              error,
            ),
            nextAction:
              "Materialize semantic-review.result.json valido para o packet bounded antes de nova publication runner-side.",
          };
        }
      }
    } catch (error) {
      return {
        failedAtMilestone: "publication",
        failureSurface: "semantic-review",
        failureKind: "request-invalid",
        message: renderArtifactValidationFailure(
          "semantic-review.request.json invalido.",
          error,
        ),
        nextAction:
          "Corrija semantic-review.request.json no projeto alvo antes de rerodar a rodada.",
      };
    }
  }

  if (await relativePathExists(projectPath, artifactPaths.causalDebugRequestPath)) {
    try {
      const request = await readJsonArtifact(
        projectPath,
        artifactPaths.causalDebugRequestPath,
        targetInvestigateCaseCausalDebugRequestSchema,
        TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
      );
      if (request.debug_readiness.status === "ready") {
        if (!(await relativePathExists(projectPath, artifactPaths.causalDebugResultPath))) {
          return {
            failedAtMilestone: "publication",
            failureSurface: "causal-debug",
            failureKind: "artifact-validation-failed",
            message: "causal-debug.result.json ausente para packet repo-aware pronto.",
            nextAction:
              "Materialize causal-debug.result.json antes de nova publication runner-side.",
          };
        }

        try {
          await readJsonArtifact(
            projectPath,
            artifactPaths.causalDebugResultPath,
            targetInvestigateCaseCausalDebugResultSchema,
            TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
          );
        } catch {
          return {
            failedAtMilestone: "publication",
            failureSurface: "causal-debug",
            failureKind: "result-parse-failed",
            message: "causal-debug.result.json invalido.",
            nextAction:
              "Materialize causal-debug.result.json valido antes de nova publication runner-side.",
          };
        }

      }
    } catch {
      return {
        failedAtMilestone: "publication",
        failureSurface: "causal-debug",
        failureKind: "request-invalid",
        message: "causal-debug.request.json invalido.",
        nextAction: "Corrija causal-debug.request.json no projeto alvo antes de rerodar a rodada.",
      };
    }
  }

  if (await relativePathExists(projectPath, artifactPaths.rootCauseReviewRequestPath)) {
    try {
      const request = await readJsonArtifact(
        projectPath,
        artifactPaths.rootCauseReviewRequestPath,
        targetInvestigateCaseRootCauseReviewRequestSchema,
        TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
      );
      if (request.review_readiness.status === "ready") {
        if (!(await relativePathExists(projectPath, artifactPaths.rootCauseReviewResultPath))) {
          return {
            failedAtMilestone: "publication",
            failureSurface: "root-cause-review",
            failureKind: "artifact-validation-failed",
            message: "root-cause-review.result.json ausente para packet repo-aware pronto.",
            nextAction:
              "Materialize root-cause-review.result.json antes de nova publication runner-side.",
          };
        }

        try {
          await readJsonArtifact(
            projectPath,
            artifactPaths.rootCauseReviewResultPath,
            targetInvestigateCaseRootCauseReviewResultSchema,
            TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
          );
        } catch {
          return {
            failedAtMilestone: "publication",
            failureSurface: "root-cause-review",
            failureKind: "result-parse-failed",
            message: "root-cause-review.result.json invalido.",
            nextAction:
              "Materialize root-cause-review.result.json valido antes de nova publication runner-side.",
          };
        }
      }
    } catch {
      return {
        failedAtMilestone: "publication",
        failureSurface: "root-cause-review",
        failureKind: "request-invalid",
        message: "root-cause-review.request.json invalido.",
        nextAction:
          "Corrija root-cause-review.request.json no projeto alvo antes de rerodar a rodada.",
      };
    }
  }

  return null;
};

const validateAssessmentConsistency = (
  assessment: TargetInvestigateCaseAssessment,
  semanticReview?: DiscoveredSemanticReviewArtifacts,
  causalDebug?: DiscoveredCausalDebugArtifacts,
  rootCauseReview?: DiscoveredRootCauseReviewArtifacts,
): void => {
  const hasRichTaxonomy =
    assessment.primary_taxonomy !== null || assessment.operational_class !== null;

  if (
    assessment.houve_gap_real === "no" &&
    (assessment.evidence_sufficiency === "insufficient" ||
      assessment.evidence_sufficiency === "partial")
  ) {
    throw new Error(
      "assessment nao pode concluir houve_gap_real=no com evidence_sufficiency fraca.",
    );
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    assessment.generalization_basis.length === 0
  ) {
    throw new Error(
      "generalization_basis[] e obrigatoria quando publication_recommendation.recommended_action=publish_ticket.",
    );
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    assessment.houve_gap_real === "no"
  ) {
    throw new Error("Nao ha publication positiva valida quando houve_gap_real=no.");
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    !causalDebug?.ticketProposal
  ) {
    throw new Error(
      "publication positiva runner-side exige ticket-proposal.json target-owned materializado.",
    );
  }

  if (rootCauseReview?.result) {
    if (!assessment.root_cause_review) {
      throw new Error(
        "assessment.json precisa expor o bloco root_cause_review quando root-cause-review.result.json estiver materializado.",
      );
    }

    if (
      assessment.root_cause_review.root_cause_status !== rootCauseReview.result.root_cause_status
    ) {
      throw new Error(
        "assessment.json diverge de root-cause-review.result.json em root_cause_status.",
      );
    }

    if (
      assessment.root_cause_review.ticket_readiness_status !==
      rootCauseReview.result.ticket_readiness.status
    ) {
      throw new Error(
        "assessment.json diverge de root-cause-review.result.json em ticket_readiness.status.",
      );
    }

    if (
      (rootCauseReview.result.remaining_gaps?.length ?? 0) > 0 &&
      assessment.root_cause_review.remaining_gaps.length === 0
    ) {
      throw new Error(
        "assessment.json precisa propagar remaining_gaps quando root-cause-review.result.json ainda declara lacunas remanescentes.",
      );
    }
  }

  if (
    assessment.causal_surface.kind === "runner-limitation" &&
    assessment.causal_surface.owner !== "runner"
  ) {
    throw new Error("causal_surface.kind=runner-limitation exige owner=runner.");
  }

  if (
    assessment.primary_taxonomy === "bug_likely" &&
    assessment.operational_class !== "bug_likely_but_unconfirmed"
  ) {
    throw new Error(
      "assessment bug_likely precisa expor operational_class=bug_likely_but_unconfirmed.",
    );
  }

  if (
    (assessment.operational_class === "bundle_not_captured" ||
      assessment.operational_class === "runtime_surface_unavailable") &&
    assessment.primary_taxonomy !== "evidence_missing_or_partial"
  ) {
    throw new Error(
      "assessment operational_class de evidencia parcial precisa mapear para primary_taxonomy=evidence_missing_or_partial.",
    );
  }

  if (
    (assessment.primary_taxonomy === "bug_likely" ||
      assessment.primary_taxonomy === "evidence_missing_or_partial") &&
    assessment.blockers.length > 0 &&
    assessment.next_action === null
  ) {
    throw new Error(
      "assessment incompleto com blockers exige next_action estruturado.",
    );
  }

  if (semanticReview?.result?.verdict === "confirmed_error") {
    if (assessment.primary_taxonomy !== "bug_confirmed") {
      throw new Error(
        "assessment.json precisa promover primary_taxonomy=bug_confirmed quando semantic-review.result.json confirma erro bounded.",
      );
    }

    const staleBlockerCodes = new Set(assessment.blockers.map((entry) => entry.code));
    const staleCapabilityLimitCodes = new Set(
      assessment.capability_limits.map((entry) => entry.code),
    );
    if (
      staleBlockerCodes.has("SEMANTIC_REVIEW_RESULT_MISSING") ||
      staleBlockerCodes.has("SEMANTIC_REVIEW_RESULT_INVALID") ||
      staleCapabilityLimitCodes.has("semantic_review_result_missing") ||
      staleCapabilityLimitCodes.has("semantic_review_result_invalid")
    ) {
      throw new Error(
        "assessment.json permaneceu stale apos semantic-review.result.json confirmado.",
      );
    }
  }

  if (!hasRichTaxonomy) {
    if (
      assessment.houve_gap_real === "no" &&
      (assessment.era_evitavel_internamente !== "not_applicable" ||
        assessment.merece_ticket_generalizavel !== "not_applicable")
    ) {
      throw new Error(
        "Quando houve_gap_real=no, era_evitavel_internamente e merece_ticket_generalizavel precisam ser not_applicable.",
      );
    }

    if (
      assessment.houve_gap_real === "yes" &&
      assessment.era_evitavel_internamente === "not_applicable"
    ) {
      throw new Error(
        "era_evitavel_internamente nao pode ser not_applicable quando houve_gap_real=yes.",
      );
    }

    if (
      assessment.houve_gap_real === "yes" &&
      assessment.era_evitavel_internamente === "no" &&
      assessment.merece_ticket_generalizavel !== "not_applicable"
    ) {
      throw new Error(
        "merece_ticket_generalizavel precisa ser not_applicable quando o gap nao e evitavel internamente.",
      );
    }

    if (
      assessment.houve_gap_real === "inconclusive" &&
      (assessment.era_evitavel_internamente === "yes" ||
        assessment.era_evitavel_internamente === "no")
    ) {
      throw new Error(
        "era_evitavel_internamente nao pode concluir yes/no quando houve_gap_real=inconclusive.",
      );
    }

    if (
      assessment.publication_recommendation.recommended_action === "publish_ticket" &&
      assessment.houve_gap_real === "yes" &&
      assessment.era_evitavel_internamente !== "yes"
    ) {
      throw new Error(
        "publish_ticket exige era_evitavel_internamente=yes quando houve_gap_real=yes.",
      );
    }

    if (
      assessment.publication_recommendation.recommended_action === "publish_ticket" &&
      assessment.houve_gap_real === "inconclusive" &&
      assessment.merece_ticket_generalizavel !== "yes"
    ) {
      throw new Error(
        "publish_ticket com caso inconclusivo exige merece_ticket_generalizavel=yes.",
      );
    }
  }
};

const validateEvidenceCoherence = (
  evidenceBundle: TargetInvestigateCaseEvidenceBundle,
  assessment: TargetInvestigateCaseAssessment,
  semanticReview?: DiscoveredSemanticReviewArtifacts,
): void => {
  const semanticPromotionBasisCodes = new Set(
    assessment.generalization_basis.map((entry) => entry.code),
  );
  const allowsSemanticPromotion =
    evidenceBundle.collection_sufficiency === "sufficient" &&
    assessment.evidence_sufficiency === "strong" &&
    assessment.primary_taxonomy === "bug_confirmed" &&
    !evidenceBundle.normative_conflicts.some((conflict) => conflict.blocking) &&
    semanticReview?.result?.verdict === "confirmed_error";
  const semanticPromotionUsesLegacyPublicationGate =
    assessment.publication_recommendation.recommended_action === "publish_ticket";
  const semanticPromotionUsesBoundedCorrelationGate =
    semanticPromotionBasisCodes.has("correlated_local_bundle") &&
    semanticPromotionBasisCodes.has("semantic_review_confirmed_error");

  if (
    compareTargetInvestigateCaseEvidenceSufficiency(
      assessment.evidence_sufficiency,
      evidenceBundle.collection_sufficiency,
    ) > 0 &&
    !(allowsSemanticPromotion &&
      (semanticPromotionUsesLegacyPublicationGate || semanticPromotionUsesBoundedCorrelationGate))
  ) {
    throw new Error(
      "assessment.json nao pode declarar evidence_sufficiency acima da coleta factual registrada em evidence-bundle.json.",
    );
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    evidenceBundle.replay.used &&
    evidenceBundle.replay.update_db !== false
  ) {
    throw new Error("Replay seguro para publication positiva exige update_db=false.");
  }
};

const validateDossierArtifact = async (
  projectPath: string,
  relativePath: string,
): Promise<ValidatedDossierArtifact> => {
  const absolutePath = resolveProjectRelativePath(projectPath, relativePath, "dossier");
  const raw = await fs.readFile(absolutePath, "utf8");

  if (relativePath.endsWith(".md")) {
    if (!raw.trim()) {
      throw new Error("dossier.md nao pode estar vazio.");
    }

    return {
      path: relativePath,
      format: "markdown",
    };
  }

  if (relativePath.endsWith(".json")) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `dossier.json invalido: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const parsed = targetInvestigateCaseDossierJsonSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new Error(`dossier.json invalido: ${renderZodIssues(parsed.error.issues)}`);
    }

    if (parsed.data.local_path !== relativePath) {
      throw new Error("dossier.json.local_path precisa coincidir com o caminho efetivo do dossier.");
    }

    return {
      path: relativePath,
      format: "json",
    };
  }

  throw new Error("O dossier precisa usar apenas dossier.md ou dossier.json.");
};

const discoverTargetInvestigateCaseSemanticReviewArtifacts = async (
  projectPath: string,
  manifest: TargetInvestigateCaseManifest,
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>,
): Promise<DiscoveredSemanticReviewArtifacts> => {
  if (!manifest.semanticReview) {
    return {
      trace: buildTargetInvestigateCaseSemanticReviewTrace({
        status: "missing",
      }),
      request: null,
      result: null,
    };
  }

  if (!(await relativePathExists(projectPath, artifactPaths.semanticReviewRequestPath))) {
    return {
      trace: buildTargetInvestigateCaseSemanticReviewTrace({
        status: "missing",
      }),
      request: null,
      result: null,
    };
  }

  let request: TargetInvestigateCaseSemanticReviewRequest;
  try {
    request = await readJsonArtifact(
      projectPath,
      artifactPaths.semanticReviewRequestPath,
      targetInvestigateCaseSemanticReviewRequestSchema,
      TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
    );
  } catch (error) {
    return {
      trace: buildTargetInvestigateCaseSemanticReviewTrace({
        status: "failed",
        requestPath: artifactPaths.semanticReviewRequestPath,
        failureReason: renderArtifactValidationFailure(
          "semantic-review.request.json invalido.",
          error,
        ),
      }),
      request: null,
      result: null,
    };
  }

  if (request.review_readiness.status === "blocked") {
    if (await relativePathExists(projectPath, artifactPaths.semanticReviewResultPath)) {
      return {
        trace: buildTargetInvestigateCaseSemanticReviewTrace({
          status: "failed",
          requestPath: artifactPaths.semanticReviewRequestPath,
          requestSchemaVersion: request.schema_version,
          symptom: request.symptom,
          symptomSelectionSource: request.symptom_selection?.source ?? null,
          selectedCandidateId: request.symptom_selection?.selected_candidate_id ?? null,
          symptomCandidateCount: request.symptom_candidates.length,
          reviewReadinessStatus: request.review_readiness.status,
          reviewReadinessReasonCode: request.review_readiness.reason_code,
          resultPath: artifactPaths.semanticReviewResultPath,
          failureReason:
            "semantic-review.result.json nao deveria existir para packet bloqueado.",
        }),
        request,
        result: null,
      };
    }

    return {
      trace: buildTargetInvestigateCaseSemanticReviewTrace({
        status: "blocked",
        requestPath: artifactPaths.semanticReviewRequestPath,
        requestSchemaVersion: request.schema_version,
        symptom: request.symptom,
        symptomSelectionSource: request.symptom_selection?.source ?? null,
        selectedCandidateId: request.symptom_selection?.selected_candidate_id ?? null,
        symptomCandidateCount: request.symptom_candidates.length,
        reviewReadinessStatus: request.review_readiness.status,
        reviewReadinessReasonCode: request.review_readiness.reason_code,
      }),
      request,
      result: null,
    };
  }

  if (!(await relativePathExists(projectPath, artifactPaths.semanticReviewResultPath))) {
    return {
      trace: buildTargetInvestigateCaseSemanticReviewTrace({
        status: "failed",
        requestPath: artifactPaths.semanticReviewRequestPath,
        requestSchemaVersion: request.schema_version,
        symptom: request.symptom,
        symptomSelectionSource: request.symptom_selection?.source ?? null,
        selectedCandidateId: request.symptom_selection?.selected_candidate_id ?? null,
        symptomCandidateCount: request.symptom_candidates.length,
        reviewReadinessStatus: request.review_readiness.status,
        reviewReadinessReasonCode: request.review_readiness.reason_code,
        failureReason: "semantic-review.result.json ausente para packet pronto.",
      }),
      request,
      result: null,
    };
  }

  let result: TargetInvestigateCaseSemanticReviewResult;
  try {
    result = await readJsonArtifact(
      projectPath,
      artifactPaths.semanticReviewResultPath,
      targetInvestigateCaseSemanticReviewResultSchema,
      TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT,
    );
  } catch (error) {
    return {
      trace: buildTargetInvestigateCaseSemanticReviewTrace({
        status: "failed",
        requestPath: artifactPaths.semanticReviewRequestPath,
        requestSchemaVersion: request.schema_version,
        symptom: request.symptom,
        symptomSelectionSource: request.symptom_selection?.source ?? null,
        selectedCandidateId: request.symptom_selection?.selected_candidate_id ?? null,
        symptomCandidateCount: request.symptom_candidates.length,
        reviewReadinessStatus: request.review_readiness.status,
        reviewReadinessReasonCode: request.review_readiness.reason_code,
        resultPath: artifactPaths.semanticReviewResultPath,
        failureReason: renderArtifactValidationFailure(
          "semantic-review.result.json invalido.",
          error,
        ),
      }),
      request,
      result: null,
    };
  }

  return {
    trace: buildTargetInvestigateCaseSemanticReviewTrace({
      status: "completed",
      requestPath: artifactPaths.semanticReviewRequestPath,
      requestSchemaVersion: request.schema_version,
      symptom: request.symptom,
      symptomSelectionSource: request.symptom_selection?.source ?? null,
      selectedCandidateId: request.symptom_selection?.selected_candidate_id ?? null,
      symptomCandidateCount: request.symptom_candidates.length,
      reviewReadinessStatus: request.review_readiness.status,
      reviewReadinessReasonCode: request.review_readiness.reason_code,
      resultPath: artifactPaths.semanticReviewResultPath,
      resultSchemaVersion: result.schema_version,
      verdict: result.verdict,
      issueType: result.issue_type,
      confidence: result.confidence,
    }),
    request,
    result,
  };
};

const buildTargetInvestigateCaseSemanticReviewTrace = (params: {
  status: TargetInvestigateCaseSemanticReviewTrace["status"];
  requestPath?: string | null;
  requestSchemaVersion?: TargetInvestigateCaseSemanticReviewRequest["schema_version"] | null;
  symptom?: string | null;
  symptomSelectionSource?: TargetInvestigateCaseSemanticReviewTrace["symptom_selection_source"];
  selectedCandidateId?: string | null;
  symptomCandidateCount?: number;
  reviewReadinessStatus?: TargetInvestigateCaseSemanticReviewRequest["review_readiness"]["status"] | null;
  reviewReadinessReasonCode?: TargetInvestigateCaseSemanticReviewRequest["review_readiness"]["reason_code"] | null;
  resultPath?: string | null;
  resultSchemaVersion?: TargetInvestigateCaseSemanticReviewResult["schema_version"] | null;
  verdict?: TargetInvestigateCaseSemanticReviewResult["verdict"] | null;
  issueType?: TargetInvestigateCaseSemanticReviewResult["issue_type"] | null;
  confidence?: TargetInvestigateCaseSemanticReviewResult["confidence"] | null;
  failureReason?: string | null;
}): TargetInvestigateCaseSemanticReviewTrace =>
  targetInvestigateCaseSemanticReviewTraceSchema.parse({
    status: params.status,
    request_path: params.requestPath ?? null,
    request_schema_version: params.requestSchemaVersion ?? null,
    symptom: params.symptom ?? null,
    symptom_selection_source: params.symptomSelectionSource ?? null,
    selected_candidate_id: params.selectedCandidateId ?? null,
    symptom_candidate_count: params.symptomCandidateCount ?? 0,
    review_readiness_status: params.reviewReadinessStatus ?? null,
    review_readiness_reason_code: params.reviewReadinessReasonCode ?? null,
    result_path: params.resultPath ?? null,
    result_schema_version: params.resultSchemaVersion ?? null,
    verdict: params.verdict ?? null,
    issue_type: params.issueType ?? null,
    confidence: params.confidence ?? null,
    failure_reason: params.failureReason ?? null,
  });

const discoverTargetInvestigateCaseCausalDebugArtifacts = async (
  projectPath: string,
  manifest: TargetInvestigateCaseManifest,
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>,
): Promise<DiscoveredCausalDebugArtifacts> => {
  if (!manifest.causalDebug) {
    return {
      request: null,
      result: null,
      ticketProposal: null,
    };
  }

  const hasRequest = await relativePathExists(projectPath, artifactPaths.causalDebugRequestPath);
  const hasResult = await relativePathExists(projectPath, artifactPaths.causalDebugResultPath);
  const hasTicketProposal = await relativePathExists(projectPath, artifactPaths.ticketProposalPath);

  const request = hasRequest
    ? await readJsonArtifact(
        projectPath,
        artifactPaths.causalDebugRequestPath,
        targetInvestigateCaseCausalDebugRequestSchema,
        TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
      )
    : null;
  const result = hasResult
    ? await readJsonArtifact(
        projectPath,
        artifactPaths.causalDebugResultPath,
        targetInvestigateCaseCausalDebugResultSchema,
        TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
      )
    : null;
  const ticketProposal = hasTicketProposal
    ? await readJsonArtifact(
        projectPath,
        artifactPaths.ticketProposalPath,
        targetInvestigateCaseTicketProposalSchema,
        TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
      )
    : null;

  return {
    request,
    result,
    ticketProposal,
  };
};

const discoverTargetInvestigateCaseRootCauseReviewArtifacts = async (
  projectPath: string,
  manifest: TargetInvestigateCaseManifest,
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>,
): Promise<DiscoveredRootCauseReviewArtifacts> => {
  if (!manifest.rootCauseReview) {
    return {
      trace: buildTargetInvestigateCaseRootCauseReviewTrace({
        status: "missing",
      }),
      request: null,
      result: null,
    };
  }

  if (!(await relativePathExists(projectPath, artifactPaths.rootCauseReviewRequestPath))) {
    return {
      trace: buildTargetInvestigateCaseRootCauseReviewTrace({
        status: "missing",
      }),
      request: null,
      result: null,
    };
  }

  let request: TargetInvestigateCaseRootCauseReviewRequest;
  try {
    request = await readJsonArtifact(
      projectPath,
      artifactPaths.rootCauseReviewRequestPath,
      targetInvestigateCaseRootCauseReviewRequestSchema,
      TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
    );
  } catch (error) {
    return {
      trace: buildTargetInvestigateCaseRootCauseReviewTrace({
        status: "failed",
        requestPath: artifactPaths.rootCauseReviewRequestPath,
        failureReason: renderArtifactValidationFailure(
          "root-cause-review.request.json invalido.",
          error,
        ),
      }),
      request: null,
      result: null,
    };
  }

  if (request.review_readiness.status === "blocked") {
    if (await relativePathExists(projectPath, artifactPaths.rootCauseReviewResultPath)) {
      return {
        trace: buildTargetInvestigateCaseRootCauseReviewTrace({
          status: "failed",
          requestPath: artifactPaths.rootCauseReviewRequestPath,
          requestSchemaVersion: request.schema_version,
          reviewReadinessStatus: request.review_readiness.status,
          reviewReadinessReasonCode: request.review_readiness.reason_code,
          resultPath: artifactPaths.rootCauseReviewResultPath,
          failureReason:
            "root-cause-review.result.json nao deveria existir para packet bloqueado.",
        }),
        request,
        result: null,
      };
    }

    return {
      trace: buildTargetInvestigateCaseRootCauseReviewTrace({
        status: "blocked",
        requestPath: artifactPaths.rootCauseReviewRequestPath,
        requestSchemaVersion: request.schema_version,
        reviewReadinessStatus: request.review_readiness.status,
        reviewReadinessReasonCode: request.review_readiness.reason_code,
      }),
      request,
      result: null,
    };
  }

  if (!(await relativePathExists(projectPath, artifactPaths.rootCauseReviewResultPath))) {
    return {
      trace: buildTargetInvestigateCaseRootCauseReviewTrace({
        status: "failed",
        requestPath: artifactPaths.rootCauseReviewRequestPath,
        requestSchemaVersion: request.schema_version,
        reviewReadinessStatus: request.review_readiness.status,
        reviewReadinessReasonCode: request.review_readiness.reason_code,
        failureReason: "root-cause-review.result.json ausente para packet pronto.",
      }),
      request,
      result: null,
    };
  }

  let result: TargetInvestigateCaseRootCauseReviewResult;
  try {
    result = await readJsonArtifact(
      projectPath,
      artifactPaths.rootCauseReviewResultPath,
      targetInvestigateCaseRootCauseReviewResultSchema,
      TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
    );
  } catch (error) {
    return {
      trace: buildTargetInvestigateCaseRootCauseReviewTrace({
        status: "failed",
        requestPath: artifactPaths.rootCauseReviewRequestPath,
        requestSchemaVersion: request.schema_version,
        reviewReadinessStatus: request.review_readiness.status,
        reviewReadinessReasonCode: request.review_readiness.reason_code,
        resultPath: artifactPaths.rootCauseReviewResultPath,
        failureReason: renderArtifactValidationFailure(
          "root-cause-review.result.json invalido.",
          error,
        ),
      }),
      request,
      result: null,
    };
  }

  return {
    trace: buildTargetInvestigateCaseRootCauseReviewTrace({
      status: "completed",
      requestPath: artifactPaths.rootCauseReviewRequestPath,
      requestSchemaVersion: request.schema_version,
      reviewReadinessStatus: request.review_readiness.status,
      reviewReadinessReasonCode: request.review_readiness.reason_code,
      resultPath: artifactPaths.rootCauseReviewResultPath,
      resultSchemaVersion: result.schema_version,
      rootCauseStatus: result.root_cause_status,
      ticketReadinessStatus: result.ticket_readiness.status,
      remainingGapCodes: (result.remaining_gaps ?? []).map((entry) => entry.code),
    }),
    request,
    result,
  };
};

const buildTargetInvestigateCaseRootCauseReviewTrace = (params: {
  status: TargetInvestigateCaseRootCauseReviewTrace["status"];
  requestPath?: string | null;
  requestSchemaVersion?: TargetInvestigateCaseRootCauseReviewRequest["schema_version"] | null;
  reviewReadinessStatus?: TargetInvestigateCaseRootCauseReviewRequest["review_readiness"]["status"] | null;
  reviewReadinessReasonCode?: string | null;
  resultPath?: string | null;
  resultSchemaVersion?: TargetInvestigateCaseRootCauseReviewResult["schema_version"] | null;
  rootCauseStatus?: TargetInvestigateCaseRootCauseReviewResult["root_cause_status"] | null;
  ticketReadinessStatus?: string | null;
  remainingGapCodes?: string[];
  failureReason?: string | null;
}): TargetInvestigateCaseRootCauseReviewTrace =>
  targetInvestigateCaseRootCauseReviewTraceSchema.parse({
    status: params.status,
    request_path: params.requestPath ?? null,
    request_schema_version: params.requestSchemaVersion ?? null,
    review_readiness_status: params.reviewReadinessStatus ?? null,
    review_readiness_reason_code: params.reviewReadinessReasonCode ?? null,
    result_path: params.resultPath ?? null,
    result_schema_version: params.resultSchemaVersion ?? null,
    root_cause_status: params.rootCauseStatus ?? null,
    ticket_readiness_status: params.ticketReadinessStatus ?? null,
    remaining_gap_codes: params.remainingGapCodes ?? [],
    failure_reason: params.failureReason ?? null,
  });

const normalizeArtifactPaths = (
  paths: TargetInvestigateCaseArtifactPaths,
): Required<TargetInvestigateCaseArtifactPaths> => {
  const caseResolutionPath = normalizeRelativePath(paths.caseResolutionPath, "caseResolutionPath");
  const evidenceBundlePath = normalizeRelativePath(paths.evidenceBundlePath, "evidenceBundlePath");
  const assessmentPath = normalizeRelativePath(paths.assessmentPath, "assessmentPath");
  const dossierPath = normalizeRelativePath(paths.dossierPath, "dossierPath");
  const roundDirectory = path.posix.dirname(caseResolutionPath);
  const semanticReviewRequestPath = normalizeRelativePath(
    paths.semanticReviewRequestPath ??
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT),
    "semanticReviewRequestPath",
  );
  const semanticReviewResultPath = normalizeRelativePath(
    paths.semanticReviewResultPath ??
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT),
    "semanticReviewResultPath",
  );
  const causalDebugRequestPath = normalizeRelativePath(
    paths.causalDebugRequestPath ??
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT),
    "causalDebugRequestPath",
  );
  const causalDebugResultPath = normalizeRelativePath(
    paths.causalDebugResultPath ??
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT),
    "causalDebugResultPath",
  );
  const rootCauseReviewRequestPath = normalizeRelativePath(
    paths.rootCauseReviewRequestPath ??
      path.posix.join(
        roundDirectory,
        TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
      ),
    "rootCauseReviewRequestPath",
  );
  const rootCauseReviewResultPath = normalizeRelativePath(
    paths.rootCauseReviewResultPath ??
      path.posix.join(
        roundDirectory,
        TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
      ),
    "rootCauseReviewResultPath",
  );
  const remediationProposalPath = normalizeRelativePath(
    paths.remediationProposalPath ??
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT),
    "remediationProposalPath",
  );
  const ticketProposalPath = normalizeRelativePath(
    paths.ticketProposalPath ??
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT),
    "ticketProposalPath",
  );
  const publicationDecisionPath = normalizeRelativePath(
    paths.publicationDecisionPath ??
      path.posix.join(roundDirectory, "publication-decision.json"),
    "publicationDecisionPath",
  );

  return {
    caseResolutionPath,
    evidenceBundlePath,
    assessmentPath,
    dossierPath,
    semanticReviewRequestPath,
    semanticReviewResultPath,
    causalDebugRequestPath,
    causalDebugResultPath,
    rootCauseReviewRequestPath,
    rootCauseReviewResultPath,
    remediationProposalPath,
    ticketProposalPath,
    publicationDecisionPath,
  };
};

const normalizeRelativePath = (value: string, label: string): string => {
  const normalized = normalizeTargetInvestigateCaseRelativePath(value.trim());
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Caminho relativo invalido em ${label}: ${value}.`);
  }

  return normalized;
};

const readJsonArtifact = async <SchemaOutput>(
  projectPath: string,
  relativePath: string,
  schema: z.ZodType<SchemaOutput, z.ZodTypeDef, unknown>,
  label: string,
): Promise<SchemaOutput> => {
  const decoded = await readJsonArtifactDecoded(projectPath, relativePath, label);
  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error(`${label} contem schema invalido: ${renderZodIssues(parsed.error.issues)}`);
  }

  return parsed.data;
};

export const readTargetInvestigateCaseCaseResolutionArtifact = async (params: {
  projectPath: string;
  relativePath: string;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  roundId: string;
  onCompatibilityIssue?: (issue: TargetInvestigateCaseCaseResolutionCompatibilityIssue) => void;
}): Promise<TargetInvestigateCaseCaseResolution> => {
  const decoded = await readJsonArtifactDecoded(
    params.projectPath,
    params.relativePath,
    "case-resolution.json",
  );
  const parsed = targetInvestigateCaseCaseResolutionSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error(
      `case-resolution.json contem schema invalido: ${renderZodIssues(parsed.error.issues)}`,
    );
  }

  return applyCaseResolutionCompatibilityBridge({
    caseResolution: parsed.data,
    decoded,
    normalizedInput: params.normalizedInput,
    roundId: params.roundId,
    onCompatibilityIssue: params.onCompatibilityIssue,
  });
};

const readJsonArtifactDecoded = async (
  projectPath: string,
  relativePath: string,
  label: string,
): Promise<unknown> => {
  const absolutePath = resolveProjectRelativePath(projectPath, relativePath, label);
  const raw = await fs.readFile(absolutePath, "utf8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label} contem JSON invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const applyCaseResolutionCompatibilityBridge = (params: {
  caseResolution: TargetInvestigateCaseCaseResolution;
  decoded: unknown;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  roundId: string;
  onCompatibilityIssue?: (issue: TargetInvestigateCaseCaseResolutionCompatibilityIssue) => void;
}): TargetInvestigateCaseCaseResolution => {
  if (params.normalizedInput.requestId || !params.roundId) {
    return params.caseResolution;
  }

  const decoded = params.decoded;
  if (typeof decoded !== "object" || decoded === null) {
    return params.caseResolution;
  }

  const selectedSelectors =
    "selected_selectors" in decoded &&
    typeof decoded.selected_selectors === "object" &&
    decoded.selected_selectors !== null
      ? decoded.selected_selectors
      : null;
  if (!selectedSelectors) {
    return params.caseResolution;
  }

  const selectedRequestId =
    "requestId" in selectedSelectors && typeof selectedSelectors.requestId === "string"
      ? selectedSelectors.requestId.trim()
      : null;
  const selectedPropertyId =
    "propertyId" in selectedSelectors && typeof selectedSelectors.propertyId === "string"
      ? selectedSelectors.propertyId.trim()
      : null;
  if (
    selectedRequestId !== params.roundId ||
    selectedPropertyId !== params.normalizedInput.caseRef
  ) {
    return params.caseResolution;
  }
  if (
    params.caseResolution.case_ref !== params.roundId &&
    params.caseResolution.attempt_resolution.attempt_ref !== params.roundId
  ) {
    return params.caseResolution;
  }

  const { request_id: _ignoredRequestId, ...selectorsWithoutPromotedRequestId } =
    params.caseResolution.selectors;
  const bridgedAttemptResolution =
    params.caseResolution.attempt_resolution.attempt_ref === params.roundId
      ? {
          status: "not-required" as const,
          attempt_ref: null,
          reason:
            "Runner compatibility bridge ignored the round id that was promoted to selected requestId without explicit operator input.",
        }
      : params.caseResolution.attempt_resolution;

  params.onCompatibilityIssue?.({
    code: "round-id-promoted-to-request-id",
    message:
      "case-resolution.json promoted the round id to selected requestId even though /target_investigate_case was executed without --request-id; the runner ignored that selector via a bounded compatibility bridge.",
    context: {
      roundId: params.roundId,
      caseRef: params.normalizedInput.caseRef,
      selectedRequestId,
    },
  });

  return {
    ...params.caseResolution,
    case_ref: params.normalizedInput.caseRef,
    selectors: selectorsWithoutPromotedRequestId,
    resolved_case: {
      ...params.caseResolution.resolved_case,
      ref: params.normalizedInput.caseRef,
      summary: appendCompatibilitySentence(
        params.caseResolution.resolved_case.summary,
        "Runner compatibility bridge ignored the promoted round id selector and preserved the canonical case-ref from operator input.",
      ),
    },
    attempt_resolution: bridgedAttemptResolution,
    resolution_reason: appendCompatibilitySentence(
      params.caseResolution.resolution_reason,
      "Runner compatibility bridge ignored the round id promoted to selected requestId.",
    ),
  };
};

const appendCompatibilitySentence = (value: string, sentence: string): string => {
  const normalizedValue = value.trim();
  const normalizedSentence = sentence.trim();
  if (!normalizedSentence) {
    return normalizedValue;
  }
  if (!normalizedValue) {
    return normalizedSentence;
  }
  if (normalizedValue.includes(normalizedSentence)) {
    return normalizedValue;
  }

  return normalizedValue.endsWith(".")
    ? `${normalizedValue} ${normalizedSentence}`
    : `${normalizedValue}. ${normalizedSentence}`;
};

const writeJsonArtifact = async (
  projectPath: string,
  relativePath: string,
  payload: unknown,
): Promise<void> => {
  const absolutePath = resolveProjectRelativePath(projectPath, relativePath, "json-artifact");
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const resolveProjectRelativePath = (
  projectPath: string,
  relativePath: string,
  label: string,
): string => {
  const normalized = normalizeRelativePath(relativePath, label);
  return path.join(projectPath, ...normalized.split("/"));
};

const getSelectorValue = (
  input: TargetInvestigateCaseNormalizedInput,
  selector: Exclude<
    TargetInvestigateCaseManifest["selectors"]["accepted"][number],
    "case-ref"
  >,
): string | undefined => {
  if (selector === "workflow") {
    return input.workflow;
  }
  if (selector === "request-id") {
    return input.requestId;
  }
  if (selector === "window") {
    return input.window;
  }

  return input.symptom;
};

const normalizeTargetInvestigateCaseExecuteInput = (
  input: string | TargetInvestigateCaseInput | TargetInvestigateCaseNormalizedInput,
): TargetInvestigateCaseNormalizedInput => {
  if (typeof input === "string") {
    return parseTargetInvestigateCaseCommand(input);
  }

  if ("canonicalCommand" in input) {
    return targetInvestigateCaseNormalizedInputSchema.parse(input);
  }

  return normalizeTargetInvestigateCaseInput(input);
};

const buildTargetInvestigateCaseRoundId = (value: Date): string =>
  value.toISOString().replace(/\.\d{3}Z$/u, "Z").replace(/:/gu, "-");

const buildTargetInvestigateCaseArtifactSet = (
  roundDirectory: string,
): TargetInvestigateCaseArtifactSet => ({
  caseResolutionPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "case-resolution.json"),
  ),
  evidenceBundlePath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "evidence-bundle.json"),
  ),
  assessmentPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "assessment.json"),
  ),
  dossierPath: normalizeTargetInvestigateCaseRelativePath(path.join(roundDirectory, "dossier.md")),
  semanticReviewRequestPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT),
  ),
  semanticReviewResultPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT),
  ),
  causalDebugRequestPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT),
  ),
  causalDebugResultPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT),
  ),
  rootCauseReviewRequestPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT),
  ),
  rootCauseReviewResultPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT),
  ),
  remediationProposalPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT),
  ),
  ticketProposalPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT),
  ),
  publicationDecisionPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "publication-decision.json"),
  ),
});

const emitTargetInvestigateCaseMilestone = async (params: {
  hooks?: TargetInvestigateCaseLifecycleHooks;
  targetProject: ProjectRef;
  milestone: TargetInvestigateCaseMilestone;
  message: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
  now: () => Date;
}): Promise<void> => {
  await params.hooks?.onMilestone?.({
    flow: "target-investigate-case",
    command: targetFlowKindToCommand("target-investigate-case"),
    targetProject: params.targetProject,
    milestone: params.milestone,
    milestoneLabel: TARGET_INVESTIGATE_CASE_MILESTONE_LABELS[params.milestone],
    message: params.message,
    versionBoundaryState: params.versionBoundaryState,
    recordedAtUtc: params.now().toISOString(),
  });
};

const assertRelativeArtifactExists = async (
  projectPath: string,
  relativePath: string,
  label: string,
): Promise<void> => {
  try {
    await fs.access(path.join(projectPath, ...relativePath.split("/")));
  } catch {
    throw new Error(`Artefato obrigatorio ausente para ${label}: ${relativePath}.`);
  }
};

const listExistingTargetInvestigateCaseArtifacts = async (
  projectPath: string,
  artifactPaths: TargetInvestigateCaseArtifactSet,
): Promise<string[]> => {
  const existing: string[] = [];
  for (const artifactPath of Object.values(artifactPaths)) {
    if (!artifactPath) {
      continue;
    }
    if (await relativePathExists(projectPath, artifactPath)) {
      existing.push(artifactPath);
    }
  }

  return existing.sort((left, right) => left.localeCompare(right, "pt-BR"));
};

const relativePathExists = async (projectPath: string, relativePath: string): Promise<boolean> => {
  try {
    await fs.access(path.join(projectPath, ...relativePath.split("/")));
    return true;
  } catch {
    return false;
  }
};

const buildCancelledTargetInvestigateCaseResult = (params: {
  targetProject: ProjectRef;
  roundId: string;
  roundDirectory: string;
  artifactPaths: string[];
  cancelledAtMilestone: TargetInvestigateCaseMilestone;
  versionBoundaryState: TargetFlowVersionBoundaryState;
}): TargetInvestigateCaseExecutionResult => ({
  status: "cancelled",
  summary: {
    targetProject: params.targetProject,
    roundId: params.roundId,
    roundDirectory: params.roundDirectory,
    artifactPaths: params.artifactPaths,
    cancelledAtMilestone: params.cancelledAtMilestone,
    nextAction:
      params.versionBoundaryState === "after-versioning"
        ? "A publication ja cruzou a fronteira de versionamento; finalize a rodada antes de nova investigacao."
        : "Revise o namespace local da rodada antes de decidir entre descartar ou retomar a investigacao.",
    versionBoundaryState: params.versionBoundaryState,
  },
});

const buildFailedTargetInvestigateCaseResult = (params: {
  targetProject: ProjectRef;
  roundId: string;
  roundDirectory: string;
  artifactPaths: string[];
  failedAtMilestone: TargetInvestigateCaseMilestone;
  failureSurface: TargetInvestigateCaseFailureSurface;
  failureKind: TargetInvestigateCaseFailureKind;
  message: string;
  nextAction: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
}): Extract<TargetInvestigateCaseExecutionResult, { status: "failed" }> => {
  const summary: TargetInvestigateCaseFailureSummary = {
    targetProject: params.targetProject,
    roundId: params.roundId,
    roundDirectory: params.roundDirectory,
    artifactPaths: [...params.artifactPaths],
    failedAtMilestone: params.failedAtMilestone,
    failureSurface: params.failureSurface,
    failureKind: params.failureKind,
    nextAction: params.nextAction,
    message: params.message,
    versionBoundaryState: params.versionBoundaryState,
  };

  return {
    status: "failed",
    message: params.message,
    summary,
  };
};

const wrapTargetInvestigateCaseTicketPublisher = (
  publisher: TargetInvestigateCaseTicketPublisher,
  onVersionBoundary: () => Promise<void>,
): TargetInvestigateCaseTicketPublisher => ({
  publish: async (request) => {
    await onVersionBoundary();
    return publisher.publish(request);
  },
});

const mapTargetInvestigateCaseResolutionError = (
  error: unknown,
): Extract<TargetInvestigateCaseExecutionResult, { status: "blocked" }> => {
  if (error instanceof InvalidTargetProjectNameError) {
    return {
      status: "blocked",
      reason: "invalid-project-name",
      message: error.message,
    };
  }

  if (error instanceof TargetProjectNotFoundError) {
    return {
      status: "blocked",
      reason: "project-not-found",
      message: error.message,
    };
  }

  if (error instanceof TargetProjectGitMissingError) {
    return {
      status: "blocked",
      reason: "git-repo-missing",
      message: error.message,
    };
  }

  return {
    status: "blocked",
    reason: "artifact-preparation-blocked",
    message: error instanceof Error ? error.message : String(error),
  };
};

const normalizeOptionalValue = (value?: string | null, label = "value"): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} nao pode ser vazio.`);
  }

  return normalized;
};

const normalizeRequiredValue = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} nao pode ser vazio.`);
  }

  return normalized;
};

const tokenizeCommand = (value: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;

  for (const character of value.trim()) {
    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/u.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (quote) {
    throw new Error("Aspas nao fechadas no comando canonico.");
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
};

const quoteIfNeeded = (value: string): string =>
  /\s/u.test(value) ? `"${value.replace(/"/gu, '\\"')}"` : value;

const renderZodIssues = (issues: Array<{ path?: Array<string | number>; message?: string }>): string =>
  issues
    .map((issue) => `${issue.path?.join(".") || "(root)"}: ${issue.message || "schema invalido"}`)
    .join("; ");
