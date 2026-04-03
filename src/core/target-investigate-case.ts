import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ProjectRef } from "../types/project.js";
import {
  compareTargetInvestigateCaseEvidenceSufficiency,
  isTargetInvestigateCasePublicationCombinationValid,
  normalizeTargetInvestigateCaseRelativePath,
  targetInvestigateCaseAssessmentSchema,
  targetInvestigateCaseCaseResolutionSchema,
  targetInvestigateCaseDossierJsonSchema,
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseFinalSummarySchema,
  targetInvestigateCaseManifestSchema,
  targetInvestigateCaseNormalizedInputSchema,
  targetInvestigateCasePublicationDecisionSchema,
  targetInvestigateCaseTracePayloadSchema,
  TargetInvestigateCaseAssessment,
  TARGET_INVESTIGATE_CASE_CAPABILITY,
  TARGET_INVESTIGATE_CASE_COMMAND,
  TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  TargetInvestigateCaseCaseResolution,
  TargetInvestigateCaseEvidenceBundle,
  TargetInvestigateCaseFinalSummary,
  TargetInvestigateCaseManifest,
  TargetInvestigateCaseNormalizedInput,
  TargetInvestigateCasePublicationDecision,
  TargetInvestigateCasePublicationStatus,
  TargetInvestigateCaseTracePayload,
} from "../types/target-investigate-case.js";

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
  publicationDecisionPath?: string;
}

export interface TargetInvestigateCaseTicketPublicationRequest {
  targetProject: ProjectRef;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  manifest: TargetInvestigateCaseManifest;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
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

interface ValidatedDossierArtifact {
  path: string;
  format: "markdown" | "json";
}

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

  const parsed = targetInvestigateCaseManifestSchema.safeParse(decoded);
  if (!parsed.success) {
    return {
      status: "invalid",
      manifestPath,
      reason: renderZodIssues(parsed.error.issues),
    };
  }

  if (parsed.data.capability !== TARGET_INVESTIGATE_CASE_CAPABILITY) {
    return {
      status: "invalid",
      manifestPath,
      reason: `Capability invalida em ${manifestPath}: esperado ${TARGET_INVESTIGATE_CASE_CAPABILITY}.`,
    };
  }

  return {
    status: "loaded",
    manifest: parsed.data,
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
  const caseResolution = await readJsonArtifact(
    request.targetProject.path,
    artifactPaths.caseResolutionPath,
    targetInvestigateCaseCaseResolutionSchema,
    "case-resolution.json",
  );
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

  validateCaseResolution(normalizedInput, manifestLoad.manifest, caseResolution);
  validateAssessmentConsistency(assessment);
  validateEvidenceCoherence(evidenceBundle, assessment);

  const decision = await buildPublicationDecision({
    targetProject: request.targetProject,
    manifest: manifestLoad.manifest,
    normalizedInput,
    artifactPaths,
    caseResolution,
    evidenceBundle,
    assessment,
    dossier,
    ticketPublisher: request.ticketPublisher,
  });

  const summary = buildTargetInvestigateCaseFinalSummary({
    caseResolution,
    evidenceBundle,
    assessment,
    publicationDecision: decision,
    dossierPath: artifactPaths.dossierPath,
  });
  const tracePayload = buildTargetInvestigateCaseTracePayload({
    normalizedInput,
    manifest: manifestLoad.manifest,
    caseResolution,
    evidenceBundle,
    assessment,
    publicationDecision: decision,
    dossierPath: artifactPaths.dossierPath,
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
}): TargetInvestigateCaseTracePayload =>
  targetInvestigateCaseTracePayloadSchema.parse({
    selectors: {
      caseRef: params.normalizedInput.caseRef,
      workflow: params.normalizedInput.workflow ?? null,
      requestId: params.normalizedInput.requestId ?? null,
      window: params.normalizedInput.window ?? null,
      symptom: params.normalizedInput.symptom ?? null,
    },
    resolved_case_ref: params.caseResolution.resolved_case.ref,
    resolved_attempt_ref: params.caseResolution.attempt_resolution.attempt_ref,
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
  });

export const buildTargetInvestigateCaseFinalSummary = (params: {
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  dossierPath: string;
}): TargetInvestigateCaseFinalSummary =>
  targetInvestigateCaseFinalSummarySchema.parse({
    case_ref: params.caseResolution.case_ref,
    resolved_attempt_ref: params.caseResolution.attempt_resolution.attempt_ref,
    attempt_resolution_status: params.caseResolution.attempt_resolution.status,
    replay_used: params.evidenceBundle.replay.used,
    houve_gap_real: params.assessment.houve_gap_real,
    era_evitavel_internamente: params.assessment.era_evitavel_internamente,
    merece_ticket_generalizavel: params.assessment.merece_ticket_generalizavel,
    confidence: params.assessment.confidence,
    evidence_sufficiency: params.assessment.evidence_sufficiency,
    causal_surface: params.assessment.causal_surface,
    publication_status: params.publicationDecision.publication_status,
    overall_outcome: params.publicationDecision.overall_outcome,
    outcome_reason: params.publicationDecision.outcome_reason,
    dossier_path: params.dossierPath,
    ticket_path: params.publicationDecision.ticket_path,
    next_action: params.publicationDecision.next_action,
  });

export const renderTargetInvestigateCaseFinalSummary = (
  summary: TargetInvestigateCaseFinalSummary,
): string => {
  const attempt =
    summary.resolved_attempt_ref ??
    (summary.attempt_resolution_status === "absent-explicitly"
      ? "ausencia explicita de tentativa"
      : "nao aplicavel");
  const lines = [
    "# Target investigate case",
    "",
    `- Case-ref: ${summary.case_ref}`,
    `- Resolved attempt: ${attempt}`,
    `- Replay used: ${summary.replay_used ? "yes" : "no"}`,
    `- Houve gap real: ${summary.houve_gap_real}`,
    `- Era evitavel internamente: ${summary.era_evitavel_internamente}`,
    `- Merece ticket generalizavel: ${summary.merece_ticket_generalizavel}`,
    `- Confidence: ${summary.confidence}`,
    `- Evidence sufficiency: ${summary.evidence_sufficiency}`,
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

const buildPublicationDecision = async (params: {
  targetProject: ProjectRef;
  manifest: TargetInvestigateCaseManifest;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  artifactPaths: Required<TargetInvestigateCaseArtifactPaths>;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  assessment: TargetInvestigateCaseAssessment;
  dossier: ValidatedDossierArtifact;
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
    params.assessment.causal_surface.kind === "project-capability-gap" ||
    params.assessment.causal_surface.kind === "observability-gap";
  const isRunnerLimitation =
    params.assessment.causal_surface.owner === "runner" ||
    params.assessment.causal_surface.kind === "runner-limitation";
  const hasStrongEnoughEvidence =
    params.assessment.evidence_sufficiency === "strong" ||
    (params.assessment.evidence_sufficiency === "sufficient" &&
      params.manifest.publicationPolicy.allowSufficientWithNormativeConflict &&
      hasNormativeConflict &&
      params.assessment.generalization_basis.length > 0 &&
      !hasBlockingVeto);
  const publicationRequested =
    params.assessment.publication_recommendation.recommended_action === "publish_ticket";
  const semanticallyEligible =
    publicationRequested &&
    ((params.assessment.houve_gap_real === "yes" &&
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
  } else if (params.assessment.houve_gap_real === "no") {
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
    if ((caseResolution.selectors[key] ?? undefined) !== value) {
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

const validateAssessmentConsistency = (assessment: TargetInvestigateCaseAssessment): void => {
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

  if (
    assessment.causal_surface.kind === "runner-limitation" &&
    assessment.causal_surface.owner !== "runner"
  ) {
    throw new Error("causal_surface.kind=runner-limitation exige owner=runner.");
  }
};

const validateEvidenceCoherence = (
  evidenceBundle: TargetInvestigateCaseEvidenceBundle,
  assessment: TargetInvestigateCaseAssessment,
): void => {
  if (
    compareTargetInvestigateCaseEvidenceSufficiency(
      assessment.evidence_sufficiency,
      evidenceBundle.collection_sufficiency,
    ) > 0
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

const normalizeArtifactPaths = (
  paths: TargetInvestigateCaseArtifactPaths,
): Required<TargetInvestigateCaseArtifactPaths> => {
  const caseResolutionPath = normalizeRelativePath(paths.caseResolutionPath, "caseResolutionPath");
  const evidenceBundlePath = normalizeRelativePath(paths.evidenceBundlePath, "evidenceBundlePath");
  const assessmentPath = normalizeRelativePath(paths.assessmentPath, "assessmentPath");
  const dossierPath = normalizeRelativePath(paths.dossierPath, "dossierPath");
  const publicationDecisionPath = normalizeRelativePath(
    paths.publicationDecisionPath ??
      path.posix.join(path.posix.dirname(caseResolutionPath), "publication-decision.json"),
    "publicationDecisionPath",
  );

  return {
    caseResolutionPath,
    evidenceBundlePath,
    assessmentPath,
    dossierPath,
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
  schema: z.ZodType<SchemaOutput>,
  label: string,
): Promise<SchemaOutput> => {
  const absolutePath = resolveProjectRelativePath(projectPath, relativePath, label);
  const raw = await fs.readFile(absolutePath, "utf8");

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} contem JSON invalido: ${error instanceof Error ? error.message : String(error)}`);
  }

  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error(`${label} contem schema invalido: ${renderZodIssues(parsed.error.issues)}`);
  }

  return parsed.data;
};

const writeJsonArtifact = async (
  projectPath: string,
  relativePath: string,
  payload: TargetInvestigateCasePublicationDecision,
): Promise<void> => {
  const absolutePath = resolveProjectRelativePath(projectPath, relativePath, "publication-decision");
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
