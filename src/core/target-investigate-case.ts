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
  normalizeTargetInvestigateCaseManifestDocument,
  normalizeTargetInvestigateCaseRelativePath,
  targetInvestigateCaseCaseBundleSchema,
  targetInvestigateCaseCaseResolutionSchema,
  targetInvestigateCaseDiagnosisSchema,
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseEvidenceIndexSchema,
  targetInvestigateCaseFinalSummarySchema,
  targetInvestigateCaseNormalizedInputSchema,
  targetInvestigateCasePublicationDecisionSchema,
  targetInvestigateCaseTicketProposalSchema,
  targetInvestigateCaseTracePayloadSchema,
  TargetInvestigateCaseArtifactSet,
  TargetInvestigateCaseArtifactAutomationUsability,
  TargetInvestigateCaseArtifactInspectionEntry,
  TargetInvestigateCaseArtifactInspectionReport,
  TargetInvestigateCaseArtifactInspectionWarning,
  TargetInvestigateCaseArtifactInspectionWarningKind,
  TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES,
  TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
  TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES,
  TARGET_INVESTIGATE_CASE_DIAGNOSIS_VERDICT_VALUES,
  TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT,
  TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROUNDS_DIR,
  TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_V2_AUTHORITATIVE_ROUNDS_DIR,
  TARGET_INVESTIGATE_CASE_V2_COMMAND,
  TARGET_INVESTIGATE_CASE_V2_FLOW,
  TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
  TargetInvestigateCaseCaseBundle,
  TargetInvestigateCaseCaseResolution,
  TargetInvestigateCaseCompletedSummary,
  TargetInvestigateCaseDiagnosis,
  TargetInvestigateCaseEvidenceBundle,
  TargetInvestigateCaseEvidenceIndex,
  TargetInvestigateCaseExecutionResult,
  TargetInvestigateCaseFailureKind,
  TargetInvestigateCaseFailureSummary,
  TargetInvestigateCaseFailureSurface,
  TargetInvestigateCaseFinalSummary,
  TargetInvestigateCaseInvestigationOutcome,
  TargetInvestigateCaseLifecycleHooks,
  TargetInvestigateCaseManifest,
  TargetInvestigateCaseNormalizedInput,
  TargetInvestigateCasePublicationDecision,
  TargetInvestigateCasePublicationStatus,
  TargetInvestigateCaseTicketProposal,
  TargetInvestigateCaseTracePayload,
} from "../types/target-investigate-case.js";
import {
  renderTargetFlowMilestoneLabel,
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

export type TargetInvestigateCaseArtifactPaths = TargetInvestigateCaseArtifactSet;

export interface TargetInvestigateCaseTicketPublicationRequest {
  targetProject: ProjectRef;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  manifest: TargetInvestigateCaseManifest;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  diagnosis: TargetInvestigateCaseDiagnosis;
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
  input: string | TargetInvestigateCaseInput | TargetInvestigateCaseNormalizedInput;
  artifacts: TargetInvestigateCaseArtifactPaths;
  ticketPublisher?: TargetInvestigateCaseTicketPublisher;
}

export interface TargetInvestigateCaseEvaluationResult {
  manifestPath: string;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundleArtifact;
  diagnosis: TargetInvestigateCaseDiagnosis;
  artifactInspectionWarnings: TargetInvestigateCaseArtifactInspectionWarning[];
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
      ticketPublisher?: TargetInvestigateCaseTicketPublisher | null;
      artifactInspectionWarnings?: TargetInvestigateCaseArtifactInspectionWarning[];
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

const OPTIONAL_FLAG_ORDER = [
  ["workflow", "--workflow"],
  ["requestId", "--request-id"],
  ["window", "--window"],
  ["symptom", "--symptom"],
] as const;

const PROHIBITED_TRACE_TOKENS = ["workflow_debug", "db_payload", "transcript"];
const DIAGNOSIS_MARKDOWN_HEADING_PATTERN = /^\s{0,3}#{1,6}\s+(.+?)\s*$/u;

type TargetInvestigateCaseEvidenceBundleArtifact = TargetInvestigateCaseEvidenceBundle & {
  lineage?: TargetInvestigateCaseCaseBundle["lineage"];
};

type ArtifactReaderSchema<SchemaOutput> = z.ZodType<SchemaOutput, z.ZodTypeDef, unknown>;

const isTargetInvestigateCaseCaseBundlePath = (relativePath: string): boolean =>
  path.posix.basename(relativePath) === TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT;

const TARGET_INVESTIGATE_CASE_INSPECTED_RESPONSE_ARTIFACTS: Array<{
  artifactLabel: TargetInvestigateCaseArtifactInspectionEntry["artifactLabel"];
  pathKey: keyof Pick<
    TargetInvestigateCaseArtifactSet,
    "evidenceIndexPath" | "evidenceBundlePath" | "diagnosisJsonPath"
  >;
  schema: z.ZodTypeAny;
  recognizedFields: readonly string[];
}> = [
  {
    artifactLabel: TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
    pathKey: "evidenceIndexPath",
    schema: targetInvestigateCaseEvidenceIndexSchema,
    recognizedFields: ["schema_version", "bundle_artifact", "entries", "lineage"],
  },
  {
    artifactLabel: TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
    pathKey: "evidenceBundlePath",
    schema: targetInvestigateCaseCaseBundleSchema,
    recognizedFields: [
      "schema_version",
      "collection_plan",
      "historical_sources",
      "sensitive_artifact_refs",
      "replay",
      "collection_sufficiency",
      "normative_conflicts",
      "factual_sufficiency_reason",
      "lineage",
    ],
  },
  {
    artifactLabel: "diagnosis.json",
    pathKey: "diagnosisJsonPath",
    schema: targetInvestigateCaseDiagnosisSchema,
    recognizedFields: [
      "schema_version",
      "bundle_artifact",
      "verdict",
      "summary",
      "why",
      "expected_behavior",
      "observed_behavior",
      "confidence",
      "behavior_to_change",
      "probable_fix_surface",
      "evidence_used",
      "next_action",
      "lineage",
    ],
  },
];

interface OptionalJsonArtifactReadResult {
  exists: boolean;
  parseableJson: boolean;
  decoded: unknown | null;
  message: string | null;
}

interface TargetInvestigateCaseExplicitBlocker {
  present: boolean;
  summary: string;
  nextAction: string;
  codes: string[];
}

interface TargetInvestigateCaseDiagnosisMarkdownInsight {
  exists: boolean;
  useful: boolean;
  verdict: TargetInvestigateCaseDiagnosis["verdict"] | null;
  summary: string | null;
  why: string | null;
  expectedBehavior: string | null;
  observedBehavior: string | null;
  behaviorToChange: string | null;
  probableFixSurface: string | null;
  nextAction: string | null;
}

interface TargetInvestigateCaseDiagnosticClosure {
  source: "diagnosis-json" | "diagnosis-md" | "explicit-blocker";
  diagnosis: TargetInvestigateCaseDiagnosis;
  explicitBlocker: TargetInvestigateCaseExplicitBlocker | null;
}

export const inspectTargetInvestigateCaseTargetOwnedArtifacts = async (params: {
  projectPath: string;
  artifactPaths: TargetInvestigateCaseArtifactSet;
}): Promise<TargetInvestigateCaseArtifactInspectionReport> => {
  const entries: TargetInvestigateCaseArtifactInspectionEntry[] = [];

  for (const spec of TARGET_INVESTIGATE_CASE_INSPECTED_RESPONSE_ARTIFACTS) {
    const artifactPath = params.artifactPaths[spec.pathKey];
    entries.push(
      await inspectTargetInvestigateCaseTargetOwnedArtifact({
        projectPath: params.projectPath,
        artifactPath,
        artifactLabel: spec.artifactLabel,
        schema: spec.schema,
        recognizedFields: spec.recognizedFields,
        expectedEvidenceBundlePath: params.artifactPaths.evidenceBundlePath,
      }),
    );
  }

  const warnings = entries.flatMap((entry) => entry.warnings);
  const automationUsability = entries.some((entry) => entry.automationUsability === "unusable")
    ? "unusable"
    : warnings.length > 0
      ? "degraded"
      : "full";

  return {
    artifacts: entries,
    warnings,
    automationUsability,
    hasDegradedAutomation: warnings.length > 0,
  };
};

export const resolveTargetInvestigateCaseDiagnosticClosure = async (params: {
  projectPath: string;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  caseResolution: TargetInvestigateCaseCaseResolution;
}): Promise<TargetInvestigateCaseDiagnosticClosure> => {
  const diagnosisJson = await readOptionalJsonArtifactDecoded(
    params.projectPath,
    params.artifactPaths.diagnosisJsonPath,
    "diagnosis.json",
  );
  const diagnosisJsonRecord = asRecord(diagnosisJson.decoded);
  const strictDiagnosis =
    diagnosisJson.parseableJson && diagnosisJson.decoded !== null
      ? targetInvestigateCaseDiagnosisSchema.safeParse(diagnosisJson.decoded)
      : null;
  const markdown = await readTargetInvestigateCaseDiagnosisMarkdownInsight(
    params.projectPath,
    params.artifactPaths.diagnosisMdPath,
  );
  const explicitBlocker = detectTargetInvestigateCaseExplicitBlocker(
    params.caseResolution,
  );

  if (strictDiagnosis?.success) {
    return {
      source: "diagnosis-json",
      diagnosis: targetInvestigateCaseDiagnosisSchema.parse({
        ...strictDiagnosis.data,
        bundle_artifact: params.artifactPaths.evidenceBundlePath,
      }),
      explicitBlocker: null,
    };
  }

  const recognizedJsonVerdict = readDiagnosisVerdictField(diagnosisJsonRecord);
  if (markdown.useful || recognizedJsonVerdict || explicitBlocker.present) {
    const source = markdown.useful
      ? "diagnosis-md"
      : recognizedJsonVerdict
        ? "diagnosis-json"
        : "explicit-blocker";

    return {
      source,
      diagnosis: buildDegradedTargetInvestigateCaseDiagnosis({
        artifactPaths: params.artifactPaths,
        diagnosisJsonRecord,
        markdown,
        explicitBlocker,
      }),
      explicitBlocker: explicitBlocker.present ? explicitBlocker : null,
    };
  }

  throw new Error(
    "A rodada nao produziu diagnostico util nem blocker explicito: materialize diagnosis.md, diagnosis.json com verdict reconhecido ou um blocker target-owned antes de rerodar.",
  );
};

const inspectTargetInvestigateCaseTargetOwnedArtifact = async (params: {
  projectPath: string;
  artifactPath: string;
  artifactLabel: TargetInvestigateCaseArtifactInspectionEntry["artifactLabel"];
  schema: z.ZodTypeAny;
  recognizedFields: readonly string[];
  expectedEvidenceBundlePath: string;
}): Promise<TargetInvestigateCaseArtifactInspectionEntry> => {
  const warnings: TargetInvestigateCaseArtifactInspectionWarning[] = [];
  const absolutePath = resolveProjectRelativePath(
    params.projectPath,
    params.artifactPath,
    params.artifactLabel,
  );
  let raw = "";

  try {
    raw = await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    warnings.push(
      buildArtifactInspectionWarning({
        artifactPath: params.artifactPath,
        artifactLabel: params.artifactLabel,
        kind: "artifact-missing",
        message: `${params.artifactLabel} nao foi materializado no namespace autoritativo.`,
        automationUsability: "unusable",
      }),
    );

    return {
      artifactPath: params.artifactPath,
      artifactLabel: params.artifactLabel,
      exists: false,
      parseableJson: false,
      recommendedSchemaValid: false,
      recognizedFields: [],
      automationUsability: "unusable",
      warnings,
    };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    warnings.push(
      buildArtifactInspectionWarning({
        artifactPath: params.artifactPath,
        artifactLabel: params.artifactLabel,
        kind: "json-parse-failed",
        message: `${params.artifactLabel} nao contem JSON parseavel: ${error instanceof Error ? error.message : String(error)}`,
        automationUsability: "unusable",
      }),
    );

    return {
      artifactPath: params.artifactPath,
      artifactLabel: params.artifactLabel,
      exists: true,
      parseableJson: false,
      recommendedSchemaValid: false,
      recognizedFields: [],
      automationUsability: "unusable",
      warnings,
    };
  }

  const recognizedFields = collectRecognizedFields(decoded, params.recognizedFields);
  const parsed = params.schema.safeParse(decoded);
  let recommendedSchemaValid = parsed.success;

  if (!parsed.success) {
    warnings.push(
      buildArtifactInspectionWarning({
        artifactPath: params.artifactPath,
        artifactLabel: params.artifactLabel,
        kind: "recommended-schema-invalid",
        message: `${params.artifactLabel} diverge do envelope recomendado: ${renderZodIssues(parsed.error.issues)}`,
        automationUsability: "degraded",
      }),
    );
  }

  if (
    params.artifactLabel === "diagnosis.json" &&
    parsed.success &&
    (parsed.data as TargetInvestigateCaseDiagnosis).bundle_artifact !==
      params.expectedEvidenceBundlePath
  ) {
    recommendedSchemaValid = false;
    warnings.push(
      buildArtifactInspectionWarning({
        artifactPath: params.artifactPath,
        artifactLabel: params.artifactLabel,
        kind: "recommended-coherence-invalid",
        message: `diagnosis.json aponta bundle_artifact diferente de ${params.expectedEvidenceBundlePath}; automacoes devem usar o diagnostico de forma degradada.`,
        automationUsability: "degraded",
      }),
    );
  }

  const automationUsability: TargetInvestigateCaseArtifactAutomationUsability =
    warnings.length > 0 ? "degraded" : "full";

  return {
    artifactPath: params.artifactPath,
    artifactLabel: params.artifactLabel,
    exists: true,
    parseableJson: true,
    recommendedSchemaValid,
    recognizedFields,
    automationUsability,
    warnings,
  };
};

const buildArtifactInspectionWarning = (params: {
  artifactPath: string;
  artifactLabel: TargetInvestigateCaseArtifactInspectionWarning["artifactLabel"];
  kind: TargetInvestigateCaseArtifactInspectionWarningKind;
  message: string;
  automationUsability: TargetInvestigateCaseArtifactAutomationUsability;
}): TargetInvestigateCaseArtifactInspectionWarning => ({
  artifactPath: params.artifactPath,
  artifactLabel: params.artifactLabel,
  kind: params.kind,
  message: params.message,
  automationUsability: params.automationUsability,
});

const collectRecognizedFields = (
  decoded: unknown,
  recognizedFields: readonly string[],
): string[] => {
  const record = asRecord(decoded);
  if (!record) {
    return [];
  }

  return recognizedFields.filter((field) => Object.prototype.hasOwnProperty.call(record, field));
};

const readOptionalJsonArtifactDecoded = async (
  projectPath: string,
  relativePath: string,
  label: string,
): Promise<OptionalJsonArtifactReadResult> => {
  let raw = "";
  try {
    raw = await fs.readFile(resolveProjectRelativePath(projectPath, relativePath, label), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        exists: false,
        parseableJson: false,
        decoded: null,
        message: `${label} nao foi materializado.`,
      };
    }
    throw error;
  }

  try {
    return {
      exists: true,
      parseableJson: true,
      decoded: JSON.parse(raw),
      message: null,
    };
  } catch (error) {
    return {
      exists: true,
      parseableJson: false,
      decoded: null,
      message: `${label} nao contem JSON valido: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

const readTargetInvestigateCaseDiagnosisMarkdownInsight = async (
  projectPath: string,
  relativePath: string,
): Promise<TargetInvestigateCaseDiagnosisMarkdownInsight> => {
  let raw = "";
  try {
    raw = await fs.readFile(
      resolveProjectRelativePath(projectPath, relativePath, "diagnosis.md"),
      "utf8",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyDiagnosisMarkdownInsight(false);
    }
    throw error;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return emptyDiagnosisMarkdownInsight(true);
  }

  const sections = extractTargetInvestigateCaseMarkdownSections(raw);
  const verdictText = readMarkdownSectionOrInlineLabel(sections, raw, ["Veredito"]);
  const why = readMarkdownSectionOrInlineLabel(sections, raw, [
    "Por que o caso está ok ou não está",
    "Por que",
  ]);

  return {
    exists: true,
    useful: true,
    verdict: verdictText ? deriveDiagnosisVerdictFromText(verdictText) : null,
    summary:
      readMarkdownSectionOrInlineLabel(sections, raw, ["Resumo"]) ??
      why ??
      extractFirstUsefulDiagnosisParagraph(raw),
    why,
    expectedBehavior: readMarkdownSectionOrInlineLabel(sections, raw, [
      "Objetivo esperado",
      "Comportamento esperado",
    ]),
    observedBehavior: readMarkdownSectionOrInlineLabel(sections, raw, [
      "O que a evidência mostra",
      "O que a evidencia mostra",
      "Comportamento observado",
    ]),
    behaviorToChange: readMarkdownSectionOrInlineLabel(sections, raw, [
      "Comportamento que precisa mudar",
      "Comportamento a mudar",
    ]),
    probableFixSurface: readMarkdownSectionOrInlineLabel(sections, raw, [
      "Superfície provável de correção",
      "Superficie provavel de correcao",
      "Superficie provavel de correção",
    ]),
    nextAction: readMarkdownSectionOrInlineLabel(sections, raw, [
      "Próxima ação",
      "Proxima acao",
      "Proxima ação",
    ]),
  };
};

const emptyDiagnosisMarkdownInsight = (
  exists: boolean,
): TargetInvestigateCaseDiagnosisMarkdownInsight => ({
  exists,
  useful: false,
  verdict: null,
  summary: null,
  why: null,
  expectedBehavior: null,
  observedBehavior: null,
  behaviorToChange: null,
  probableFixSurface: null,
  nextAction: null,
});

const extractTargetInvestigateCaseMarkdownSections = (raw: string): Map<string, string> => {
  const sections = new Map<string, string[]>();
  let currentHeading: string | null = null;

  for (const line of raw.split(/\r?\n/u)) {
    const headingMatch = line.match(DIAGNOSIS_MARKDOWN_HEADING_PATTERN);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      if (!sections.has(currentHeading)) {
        sections.set(currentHeading, []);
      }
      continue;
    }

    if (currentHeading) {
      sections.get(currentHeading)?.push(line);
    }
  }

  return new Map(
    [...sections.entries()]
      .map(([heading, lines]) => [heading, lines.join("\n").trim()] as const)
      .filter(([, content]) => content.length > 0),
  );
};

const readMarkdownSectionOrInlineLabel = (
  sections: Map<string, string>,
  raw: string,
  labels: readonly string[],
): string | null => {
  for (const label of labels) {
    const section = sections.get(label)?.trim();
    if (section) {
      return section;
    }
  }

  for (const line of raw.split(/\r?\n/u)) {
    for (const label of labels) {
      const match = line.match(new RegExp(`^\\s*${escapeRegExp(label)}\\s*:\\s*(.+)$`, "iu"));
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return null;
};

const extractFirstUsefulDiagnosisParagraph = (raw: string): string | null => {
  for (const paragraph of raw.split(/\n\s*\n/u)) {
    const normalized = paragraph
      .split(/\r?\n/u)
      .map((line) => line.replace(/^#{1,6}\s+/u, "").trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!normalized || /^diagnosis$/iu.test(normalized) || /^veredito\s*:/iu.test(normalized)) {
      continue;
    }

    return normalized;
  }

  return null;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const deriveDiagnosisVerdictFromText = (
  value: string,
): TargetInvestigateCaseDiagnosis["verdict"] | null => {
  const normalized = normalizeLooseText(value);

  if (/\bnot[_ -]?ok\b/u.test(normalized) || /\bnao\s+ok\b/u.test(normalized)) {
    return "not_ok";
  }

  if (/\binconclusive\b/u.test(normalized) || /\binconclusiv[ao]\b/u.test(normalized)) {
    return "inconclusive";
  }

  if (/\bok\b/u.test(normalized)) {
    return "ok";
  }

  return null;
};

const normalizeLooseText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const detectTargetInvestigateCaseExplicitBlocker = (
  caseResolution: TargetInvestigateCaseCaseResolution,
): TargetInvestigateCaseExplicitBlocker => {
  const codes = caseResolution.replay_readiness?.blocker_codes ?? [];
  const reasons: string[] = [];

  if (caseResolution.attempt_resolution.status === "absent-explicitly") {
    reasons.push(caseResolution.attempt_resolution.reason);
  }

  if (codes.length > 0) {
    reasons.push(
      caseResolution.replay_readiness?.summary ??
        `Blockers declarados pelo target: ${codes.join(", ")}.`,
    );
  }

  if (reasons.length === 0) {
    return {
      present: false,
      summary: "",
      nextAction: "",
      codes: [],
    };
  }

  return {
    present: true,
    summary: reasons.join(" "),
    nextAction:
      caseResolution.replay_readiness?.next_step?.summary ??
      caseResolution.attempt_candidates?.next_step?.summary ??
      "Resolver o blocker target-owned antes de continuar a investigation.",
    codes,
  };
};

const buildDegradedTargetInvestigateCaseDiagnosis = (params: {
  artifactPaths: TargetInvestigateCaseArtifactSet;
  diagnosisJsonRecord: Record<string, unknown> | null;
  markdown: TargetInvestigateCaseDiagnosisMarkdownInsight;
  explicitBlocker: TargetInvestigateCaseExplicitBlocker;
}): TargetInvestigateCaseDiagnosis => {
  const diagnosisMdPath = params.artifactPaths.diagnosisMdPath;
  const fallbackEvidencePath = params.markdown.exists
    ? diagnosisMdPath
    : params.artifactPaths.diagnosisJsonPath;
  const fallbackSummary =
    params.markdown.summary ??
    params.explicitBlocker.summary ??
    "Diagnostico target-owned disponivel apenas em superficie humana ou blocker explicito.";
  const fallbackWhy =
    params.markdown.why ??
    params.explicitBlocker.summary ??
    "O envelope machine-readable recomendado nao esta totalmente consumivel pelo runner.";
  const probableFixSurface =
    readStringArrayOrStringField(params.diagnosisJsonRecord, "probable_fix_surface") ??
    (params.markdown.probableFixSurface ? [params.markdown.probableFixSurface] : null) ??
    ["target-owned-diagnosis"];

  return targetInvestigateCaseDiagnosisSchema.parse({
    schema_version:
      readStringField(params.diagnosisJsonRecord, "schema_version") ?? "diagnosis_degraded_v1",
    bundle_artifact: params.artifactPaths.evidenceBundlePath,
    verdict:
      params.markdown.verdict ??
      readDiagnosisVerdictField(params.diagnosisJsonRecord) ??
      "inconclusive",
    summary: readStringField(params.diagnosisJsonRecord, "summary") ?? fallbackSummary,
    why: readStringField(params.diagnosisJsonRecord, "why") ?? fallbackWhy,
    expected_behavior:
      readStringField(params.diagnosisJsonRecord, "expected_behavior") ??
      params.markdown.expectedBehavior ??
      "Consultar diagnosis.md ou blocker explicito target-owned para o comportamento esperado.",
    observed_behavior:
      readStringField(params.diagnosisJsonRecord, "observed_behavior") ??
      params.markdown.observedBehavior ??
      "Consultar diagnosis.md ou blocker explicito target-owned para o comportamento observado.",
    confidence: readConfidenceField(params.diagnosisJsonRecord) ?? "medium",
    behavior_to_change:
      readStringField(params.diagnosisJsonRecord, "behavior_to_change") ??
      params.markdown.behaviorToChange ??
      (params.explicitBlocker.present
        ? "Resolver o blocker target-owned antes de diagnosticar mudanca funcional."
        : "Consultar diagnosis.md para a mudanca recomendada."),
    probable_fix_surface: probableFixSurface,
    evidence_used:
      readStringArrayField(params.diagnosisJsonRecord, "evidence_used") ??
      [fallbackEvidencePath],
    next_action:
      readStringField(params.diagnosisJsonRecord, "next_action") ??
      params.markdown.nextAction ??
      params.explicitBlocker.nextAction ??
      `Ler ${diagnosisMdPath} e corrigir o envelope machine-readable apenas se a automacao for necessaria.`,
    lineage:
      readStringArrayField(params.diagnosisJsonRecord, "lineage") ??
      ["target-investigate-case-v2", fallbackEvidencePath],
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readStringField = (
  record: Record<string, unknown> | null,
  field: string,
): string | null => {
  const value = record?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const readDiagnosisVerdictField = (
  record: Record<string, unknown> | null,
): TargetInvestigateCaseDiagnosis["verdict"] | null => {
  const verdict = readStringField(record, "verdict");
  return verdict &&
    TARGET_INVESTIGATE_CASE_DIAGNOSIS_VERDICT_VALUES.includes(
      verdict as TargetInvestigateCaseDiagnosis["verdict"],
    )
    ? (verdict as TargetInvestigateCaseDiagnosis["verdict"])
    : null;
};

const readConfidenceField = (
  record: Record<string, unknown> | null,
): TargetInvestigateCaseDiagnosis["confidence"] | null => {
  const confidence = readStringField(record, "confidence");
  return confidence &&
    TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES.includes(
      confidence as TargetInvestigateCaseDiagnosis["confidence"],
    )
    ? (confidence as TargetInvestigateCaseDiagnosis["confidence"])
    : null;
};

const readStringArrayField = (
  record: Record<string, unknown> | null,
  field: string,
): string[] | null => {
  const value = record?.[field];
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());

  return strings.length > 0 ? strings : null;
};

const readStringArrayOrStringField = (
  record: Record<string, unknown> | null,
  field: string,
): string[] | null => {
  const strings = readStringArrayField(record, field);
  if (strings) {
    return strings;
  }

  const singleValue = readStringField(record, field);
  return singleValue ? [singleValue] : null;
};

export const loadTargetInvestigateCaseManifest = async (
  projectPath: string,
): Promise<TargetInvestigateCaseManifestLoadResult> => {
  const manifestPath = TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH;
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

  try {
    return {
      status: "loaded",
      manifest: normalizeTargetInvestigateCaseManifestDocument(decoded),
      manifestPath,
    };
  } catch (error) {
    return {
      status: "invalid",
      manifestPath,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};

export const normalizeTargetInvestigateCaseInput = (
  input: TargetInvestigateCaseInput,
): TargetInvestigateCaseNormalizedInput => {
  const normalized = {
    projectName: normalizeRequiredValue(input.projectName, "projectName"),
    caseRef: normalizeRequiredValue(input.caseRef, "caseRef"),
    workflow: normalizeOptionalValue(input.workflow ?? undefined),
    requestId: normalizeOptionalValue(input.requestId ?? undefined),
    window: normalizeOptionalValue(input.window ?? undefined),
    symptom: normalizeOptionalValue(input.symptom ?? undefined),
  };

  return targetInvestigateCaseNormalizedInputSchema.parse({
    ...normalized,
    canonicalCommand: renderTargetInvestigateCaseCommand(normalized),
  });
};

export const parseTargetInvestigateCaseCommand = (
  commandText: string,
): TargetInvestigateCaseNormalizedInput => {
  const tokens = tokenizeCommand(commandText);
  if (tokens.length < 3) {
    throw new Error(
      `Use ${TARGET_INVESTIGATE_CASE_V2_COMMAND} <project> <case-ref> [--workflow ...] [--request-id ...] [--window ...] [--symptom ...].`,
    );
  }

  const command = tokens[0] ?? "";
  if (command !== TARGET_INVESTIGATE_CASE_V2_COMMAND) {
    throw new Error(`Comando invalido: esperado ${TARGET_INVESTIGATE_CASE_V2_COMMAND}.`);
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

  return targetInvestigateCaseNormalizedInputSchema.parse({
    ...normalizeTargetInvestigateCaseInput(input),
    canonicalCommand: renderTargetInvestigateCaseCommand(input),
  });
};

export const renderTargetInvestigateCaseCommand = (
  input:
    | Omit<TargetInvestigateCaseNormalizedInput, "canonicalCommand">
    | TargetInvestigateCaseNormalizedInput,
): string => {
  const parts = [
    TARGET_INVESTIGATE_CASE_V2_COMMAND,
    input.projectName.trim(),
    input.caseRef.trim(),
  ];

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
  const normalizedInput =
    typeof request.input === "string"
      ? parseTargetInvestigateCaseCommand(request.input)
      : "canonicalCommand" in request.input
        ? targetInvestigateCaseNormalizedInputSchema.parse(request.input)
        : normalizeTargetInvestigateCaseInput(request.input);

  const manifestLoad = await loadTargetInvestigateCaseManifest(request.targetProject.path);
  if (manifestLoad.status !== "loaded") {
    throw new Error(manifestLoad.reason);
  }

  if (normalizedInput.projectName !== request.targetProject.name) {
    throw new Error(
      `Projeto do contrato canonico (${normalizedInput.projectName}) diverge do target recebido (${request.targetProject.name}).`,
    );
  }

  const artifactPaths = normalizeArtifactPaths(request.artifacts);
  const caseResolution = await readTargetInvestigateCaseCaseResolutionArtifact({
    projectPath: request.targetProject.path,
    relativePath: artifactPaths.caseResolutionPath,
    normalizedInput,
  });
  const artifactInspection = await inspectTargetInvestigateCaseTargetOwnedArtifacts({
    projectPath: request.targetProject.path,
    artifactPaths,
  });
  const evidenceBundle = await readTargetInvestigateCaseEvidenceBundleArtifactTolerant({
    projectPath: request.targetProject.path,
    artifactPaths,
    caseResolution,
  });
  const diagnosticClosure = await resolveTargetInvestigateCaseDiagnosticClosure({
    projectPath: request.targetProject.path,
    artifactPaths,
    caseResolution,
  });
  const diagnosis = diagnosticClosure.diagnosis;
  validateCaseResolution(normalizedInput, caseResolution);

  const hasTicketProposalArtifact = await relativePathExists(
    request.targetProject.path,
    artifactPaths.ticketProposalPath,
  );
  const ticketProposal = artifactInspection.hasDegradedAutomation
    ? null
    : await discoverTargetInvestigateCaseTicketProposalArtifact(
        request.targetProject.path,
        artifactPaths,
      );
  const remediationProposalPath =
    artifactPaths.remediationProposalPath &&
    (await relativePathExists(request.targetProject.path, artifactPaths.remediationProposalPath))
      ? artifactPaths.remediationProposalPath
      : null;
  const shouldTraversePublication = shouldTraverseTargetInvestigateCasePublication({
    manifest: manifestLoad.manifest,
    hasTicketProposal: Boolean(ticketProposal),
  }) && !artifactInspection.hasDegradedAutomation;
  const publicationDecision = shouldTraversePublication
    ? await buildPublicationDecisionFromDiagnosis({
        targetProject: request.targetProject,
        manifest: manifestLoad.manifest,
        normalizedInput,
        caseResolution,
        evidenceBundle,
        diagnosis,
        ticketProposal,
        remediationProposalPath,
        ticketPublisher: request.ticketPublisher,
        diagnosisMdPath: artifactPaths.diagnosisMdPath,
        diagnosisJsonPath: artifactPaths.diagnosisJsonPath,
      })
    : buildSkippedPublicationDecisionFromDiagnosis({
        manifest: manifestLoad.manifest,
        diagnosis,
        hasTicketProposal: hasTicketProposalArtifact,
        automationDegraded: artifactInspection.hasDegradedAutomation,
      });

  if (shouldTraversePublication) {
    await writeJsonArtifact(
      request.targetProject.path,
      artifactPaths.publicationDecisionPath,
      targetInvestigateCasePublicationDecisionSchema.parse(publicationDecision),
    );
  }

  const summary = buildTargetInvestigateCaseFinalSummary({
    caseResolution,
    evidenceBundle,
    diagnosis,
    publicationDecision,
    diagnosisMdPath: artifactPaths.diagnosisMdPath,
    diagnosisJsonPath: artifactPaths.diagnosisJsonPath,
    remediationProposalPath,
  });
  const tracePayload = buildTargetInvestigateCaseTracePayload({
    normalizedInput,
    caseResolution,
    evidenceBundle,
    diagnosis,
    publicationDecision,
    diagnosisMdPath: artifactPaths.diagnosisMdPath,
    diagnosisJsonPath: artifactPaths.diagnosisJsonPath,
    remediationProposalPath,
  });

  return {
    manifestPath: manifestLoad.manifestPath,
    normalizedInput,
    artifactPaths,
    caseResolution,
    evidenceBundle,
    diagnosis,
    artifactInspectionWarnings: artifactInspection.warnings,
    publicationDecision,
    summary,
    tracePayload,
  };
};

export const buildTargetInvestigateCaseTracePayload = (params: {
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  diagnosis: TargetInvestigateCaseDiagnosis;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  diagnosisMdPath: string;
  diagnosisJsonPath: string;
  remediationProposalPath: string | null;
}): TargetInvestigateCaseTracePayload => {
  const investigation = buildInvestigationSnapshot({
    diagnosis: params.diagnosis,
    publicationDecision: params.publicationDecision,
    remediationProposalPath: params.remediationProposalPath,
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
    diagnosis: {
      verdict: params.diagnosis.verdict,
      summary: params.diagnosis.summary,
      why: params.diagnosis.why,
      expected_behavior: params.diagnosis.expected_behavior,
      observed_behavior: params.diagnosis.observed_behavior,
      confidence: params.diagnosis.confidence,
      behavior_to_change: params.diagnosis.behavior_to_change,
      probable_fix_surface: [...params.diagnosis.probable_fix_surface],
      next_action: params.diagnosis.next_action,
      bundle_artifact: params.diagnosis.bundle_artifact,
      diagnosis_md_path: params.diagnosisMdPath,
      diagnosis_json_path: params.diagnosisJsonPath,
      evidence_used: [...params.diagnosis.evidence_used],
      lineage: [...params.diagnosis.lineage],
    },
    investigation: {
      outcome: investigation.outcome,
      reason: investigation.reason,
      remediation_proposal_path: investigation.remediationProposalPath,
    },
    publication: {
      publication_status: params.publicationDecision.publication_status,
      overall_outcome: params.publicationDecision.overall_outcome,
      outcome_reason: params.publicationDecision.outcome_reason,
      gates_applied: [...params.publicationDecision.gates_applied],
      blocked_gates: [...params.publicationDecision.blocked_gates],
      ticket_path: params.publicationDecision.ticket_path,
      next_action: params.publicationDecision.next_action,
    },
  });
};

export const buildTargetInvestigateCaseFinalSummary = (params: {
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  diagnosis: TargetInvestigateCaseDiagnosis;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  diagnosisMdPath: string;
  diagnosisJsonPath: string;
  remediationProposalPath: string | null;
}): TargetInvestigateCaseFinalSummary => {
  const investigation = buildInvestigationSnapshot({
    diagnosis: params.diagnosis,
    publicationDecision: params.publicationDecision,
    remediationProposalPath: params.remediationProposalPath,
  });

  return targetInvestigateCaseFinalSummarySchema.parse({
    case_ref: params.caseResolution.case_ref,
    resolved_attempt_ref: params.caseResolution.attempt_resolution.attempt_ref,
    attempt_resolution_status: params.caseResolution.attempt_resolution.status,
    attempt_candidates_status: params.caseResolution.attempt_candidates?.status ?? null,
    replay_readiness_state: params.caseResolution.replay_readiness?.state ?? null,
    replay_used: params.evidenceBundle.replay.used,
    diagnosis: {
      verdict: params.diagnosis.verdict,
      summary: params.diagnosis.summary,
      why: params.diagnosis.why,
      expected_behavior: params.diagnosis.expected_behavior,
      observed_behavior: params.diagnosis.observed_behavior,
      confidence: params.diagnosis.confidence,
      behavior_to_change: params.diagnosis.behavior_to_change,
      probable_fix_surface: [...params.diagnosis.probable_fix_surface],
      next_action: params.diagnosis.next_action,
      bundle_artifact: params.diagnosis.bundle_artifact,
      diagnosis_md_path: params.diagnosisMdPath,
      diagnosis_json_path: params.diagnosisJsonPath,
    },
    confidence: params.diagnosis.confidence,
    investigation_outcome: investigation.outcome,
    investigation_reason: investigation.reason,
    remediation_proposal_path: investigation.remediationProposalPath,
    publication_status: params.publicationDecision.publication_status,
    overall_outcome: params.publicationDecision.overall_outcome,
    outcome_reason: params.publicationDecision.outcome_reason,
    ticket_path: params.publicationDecision.ticket_path,
    next_action: params.publicationDecision.next_action,
  });
};

export const describeTargetInvestigateCaseInvestigationOutcome = (
  summary: Pick<TargetInvestigateCaseFinalSummary, "investigation_outcome" | "investigation_reason">,
): string => {
  if (summary.investigation_outcome === "no-real-gap") {
    return "O target concluiu que o caso esta OK e nao exige remediacao.";
  }

  if (summary.investigation_outcome === "actionable-remediation-identified") {
    return "O target encontrou uma mudanca acionavel para corrigir o comportamento.";
  }

  if (summary.investigation_outcome === "real-gap-not-internally-avoidable") {
    return "Existe um gap real, mas a superficie principal nao e evitavel dentro do target.";
  }

  if (summary.investigation_outcome === "real-gap-not-generalizable") {
    return "Existe um gap real, mas sem base suficiente para generalizacao.";
  }

  if (summary.investigation_outcome === "project-capability-gap") {
    return "O proprio projeto alvo ainda nao tem capability suficiente para estabilizar o caso.";
  }

  if (summary.investigation_outcome === "runner-limitation") {
    return "A limitacao principal pertence ao runner, nao ao target.";
  }

  return summary.investigation_reason;
};

export const describeTargetInvestigateCaseDiagnosisVerdict = (
  verdict: TargetInvestigateCaseDiagnosis["verdict"],
): string => {
  if (verdict === "ok") {
    return "Diagnostico target-owned encerrou o caso como comportamento esperado.";
  }

  if (verdict === "not_ok") {
    return "Diagnostico target-owned encontrou comportamento incorreto com mudanca provavel.";
  }

  return "Diagnostico target-owned permaneceu inconclusivo.";
};

export const renderTargetInvestigateCaseFinalSummary = (
  summary: TargetInvestigateCaseFinalSummary,
): string => {
  const rendered = [
    `Case ref: ${summary.case_ref}`,
    `Attempt resolution: ${summary.resolved_attempt_ref ?? summary.attempt_resolution_status}`,
    `Diagnosis verdict: ${summary.diagnosis.verdict}`,
    `Diagnosis summary: ${summary.diagnosis.summary}`,
    `Why: ${summary.diagnosis.why}`,
    `Expected behavior: ${summary.diagnosis.expected_behavior}`,
    `Observed behavior: ${summary.diagnosis.observed_behavior}`,
    `Behavior to change: ${summary.diagnosis.behavior_to_change}`,
    `Probable fix surface: ${summary.diagnosis.probable_fix_surface.join(", ")}`,
    `Investigation outcome: ${summary.investigation_outcome}`,
    `Investigation reason: ${summary.investigation_reason}`,
    `Publication: ${summary.publication_status}/${summary.overall_outcome}`,
    `Ticket path: ${summary.ticket_path ?? "(nenhum)"}`,
    `Next action: ${summary.next_action}`,
  ].join("\n");

  for (const token of PROHIBITED_TRACE_TOKENS) {
    if (rendered.includes(token)) {
      throw new Error(`Resumo final vazou token proibido: ${token}.`);
    }
  }

  return rendered;
};

export class ControlledTargetInvestigateCaseExecutor
  implements TargetInvestigateCaseExecutor
{
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
          commandLabel: TARGET_INVESTIGATE_CASE_V2_COMMAND,
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

    if (!this.dependencies.roundPreparer) {
      return {
        status: "blocked",
        reason: "round-preparer-unavailable",
        message:
          "O runner ainda nao recebeu materializador oficial para gerar os artefatos de case-investigation no projeto alvo.",
      };
    }

    const roundId = buildTargetInvestigateCaseRoundId(this.now());
    const roundDirectory = buildTargetInvestigateCaseRoundDirectory(roundId, manifestLoad.manifest);
    const artifactPaths = buildTargetInvestigateCaseArtifactSet(roundDirectory);
    let versionBoundaryState: TargetFlowVersionBoundaryState = "before-versioning";

    await fs.mkdir(path.join(targetProject.path, ...roundDirectory.split("/")), {
      recursive: true,
    });

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "preflight",
      message: `Preflight concluido para ${targetProject.name}.`,
      versionBoundaryState,
      now: this.now,
    });

    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: [],
        cancelledAtMilestone: "preflight",
        versionBoundaryState,
      });
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
      return buildFailedTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(
          targetProject.path,
          artifactPaths,
        ),
        failedAtMilestone: preparation.failedAtMilestone ?? "resolve-case",
        failureSurface: preparation.failureSurface ?? "round-materialization",
        failureKind: preparation.failureKind ?? "artifact-validation-failed",
        message: preparation.message,
        nextAction:
          preparation.nextAction ??
          `Revise a materializacao local da rodada e rerode ${TARGET_INVESTIGATE_CASE_V2_COMMAND}.`,
        versionBoundaryState,
      });
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "resolve-case",
      message: `Resolucao de caso pronta para ${normalizedInput.caseRef}.`,
      versionBoundaryState,
      now: this.now,
    });
    await assertArtifactExistsOrFail({
      targetProject,
      artifactPaths,
      artifactPath: artifactPaths.caseResolutionPath,
      artifactLabel: "case-resolution.json",
      failedAtMilestone: "resolve-case",
      versionBoundaryState,
      roundId,
      roundDirectory,
    });

    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(
          targetProject.path,
          artifactPaths,
        ),
        cancelledAtMilestone: "resolve-case",
        versionBoundaryState,
      });
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "assemble-evidence",
      message: `Coleta de evidencias pronta para ${normalizedInput.caseRef}.`,
      versionBoundaryState,
      now: this.now,
    });

    try {
      await assertRelativeArtifactExists(
        targetProject.path,
        artifactPaths.evidenceIndexPath,
        TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
      );
      await assertRelativeArtifactExists(
        targetProject.path,
        artifactPaths.evidenceBundlePath,
        TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
      );
    } catch (error) {
      return buildFailedTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(
          targetProject.path,
          artifactPaths,
        ),
        failedAtMilestone: "assemble-evidence",
        failureSurface: "round-materialization",
        failureKind: "artifact-validation-failed",
        message: error instanceof Error ? error.message : String(error),
        nextAction:
          "Garanta que evidence-index.json e case-bundle.json sejam materializados no namespace canonico antes de rerodar.",
        versionBoundaryState,
      });
    }

    if (hooks?.isCancellationRequested?.()) {
      return buildCancelledTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(
          targetProject.path,
          artifactPaths,
        ),
        cancelledAtMilestone: "assemble-evidence",
        versionBoundaryState,
      });
    }

    await emitTargetInvestigateCaseMilestone({
      hooks,
      targetProject,
      milestone: "diagnosis",
      message: `Diagnostico diagnosis-first pronto para ${normalizedInput.caseRef}.`,
      versionBoundaryState,
      now: this.now,
    });

    const shouldTraversePublication = await shouldTraverseTargetInvestigateCasePublicationFromArtifacts(
      {
        projectPath: targetProject.path,
        manifest: manifestLoad.manifest,
        artifactPaths,
      },
    );

    if (shouldTraversePublication) {
      await emitTargetInvestigateCaseMilestone({
        hooks,
        targetProject,
        milestone: "publication",
        message: `Publication runner-side em avaliacao para ${normalizedInput.caseRef}.`,
        versionBoundaryState,
        now: this.now,
      });
    }

    const ticketPublisher = preparation.ticketPublisher
      ? wrapTargetInvestigateCaseTicketPublisher(preparation.ticketPublisher, async () => {
          versionBoundaryState = "after-versioning";
          await emitTargetInvestigateCaseMilestone({
            hooks,
            targetProject,
            milestone: "publication",
            message: `Publication cruzou a fronteira de versionamento para ${normalizedInput.caseRef}.`,
            versionBoundaryState,
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
      return buildFailedTargetInvestigateCaseResult({
        targetProject,
        roundId,
        roundDirectory,
        artifactPaths: await listExistingTargetInvestigateCaseArtifacts(
          targetProject.path,
          artifactPaths,
        ),
        failedAtMilestone: shouldTraversePublication ? "publication" : "diagnosis",
        failureSurface: "round-evaluation",
        failureKind: "round-evaluation-failed",
        message: error instanceof Error ? error.message : String(error),
        nextAction:
          shouldTraversePublication
            ? "Revise diagnosis.json, ticket-proposal.json e a publication runner-side antes de rerodar."
            : "Revise os artefatos diagnosis-first antes de rerodar.",
        versionBoundaryState,
      });
    }

    if (evaluation.publicationDecision.versioned_artifact_paths.length === 0) {
      versionBoundaryState = "before-versioning";
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
      artifactInspectionWarnings: evaluation.artifactInspectionWarnings,
      nextAction: evaluation.summary.next_action,
      versionBoundaryState,
    };

    return {
      status: "completed",
      summary,
    };
  }
}

const shouldTraverseTargetInvestigateCasePublication = (params: {
  manifest: TargetInvestigateCaseManifest;
  hasTicketProposal: boolean;
}): boolean => Boolean(params.manifest.stages.publication && params.hasTicketProposal);

const shouldTraverseTargetInvestigateCasePublicationFromArtifacts = async (params: {
  projectPath: string;
  manifest: TargetInvestigateCaseManifest;
  artifactPaths: TargetInvestigateCaseArtifactSet;
}): Promise<boolean> => {
  if (!params.manifest.stages.publication) {
    return false;
  }

  return relativePathExists(params.projectPath, params.artifactPaths.ticketProposalPath);
};

const buildSkippedPublicationDecisionFromDiagnosis = (params: {
  manifest: TargetInvestigateCaseManifest;
  diagnosis: TargetInvestigateCaseDiagnosis;
  hasTicketProposal: boolean;
  automationDegraded?: boolean;
}): TargetInvestigateCasePublicationDecision => {
  const gatesApplied = [
    "manifest-canonical-path",
    "capability-case-investigation",
    "input-normalized",
    "case-resolution-consistent",
    "evidence-bundle-consistent",
    "diagnosis-consistent",
    "publication-continuation-not-entered",
  ];
  const blockedGates: string[] = [];

  let publicationStatus: TargetInvestigateCasePublicationStatus = "not_applicable";
  let overallOutcome: TargetInvestigateCasePublicationDecision["overall_outcome"] =
    params.diagnosis.verdict === "ok" ? "no-real-gap" : "inconclusive-case";
  let outcomeReason =
    params.diagnosis.verdict === "ok"
      ? "O diagnostico encerrou o caso como comportamento esperado; a continuacao publication nao se aplica."
      : "A continuacao publication nao foi atravessada nesta rodada diagnosis-first.";

  if (params.automationDegraded) {
    blockedGates.push("artifact-envelope-warnings");
    if (params.manifest.stages.publication) {
      publicationStatus = "not_eligible";
    }
    outcomeReason =
      "A rodada produziu diagnostico, mas a publication runner-side nao foi atravessada porque artefatos target-owned exigem automacao degradada.";
  }

  if (params.manifest.stages.publication && !params.hasTicketProposal) {
    blockedGates.push("ticket-projection-missing");
    if (!params.automationDegraded && params.diagnosis.verdict === "not_ok") {
      publicationStatus = "not_eligible";
      outcomeReason =
        "O target declarou publication, mas ticket-proposal.json ainda nao foi materializado no namespace autoritativo.";
    }
  }

  return targetInvestigateCasePublicationDecisionSchema.parse({
    publication_status: publicationStatus,
    overall_outcome: overallOutcome,
    outcome_reason: outcomeReason,
    gates_applied: gatesApplied,
    blocked_gates: blockedGates,
    versioned_artifact_paths: [],
    ticket_path: null,
    next_action: params.diagnosis.next_action,
  });
};

const buildPublicationDecisionFromDiagnosis = async (params: {
  targetProject: ProjectRef;
  manifest: TargetInvestigateCaseManifest;
  normalizedInput: TargetInvestigateCaseNormalizedInput;
  caseResolution: TargetInvestigateCaseCaseResolution;
  evidenceBundle: TargetInvestigateCaseEvidenceBundle;
  diagnosis: TargetInvestigateCaseDiagnosis;
  ticketProposal?: TargetInvestigateCaseTicketProposal | null;
  ticketPublisher?: TargetInvestigateCaseTicketPublisher;
  diagnosisMdPath: string;
  diagnosisJsonPath: string;
  remediationProposalPath: string | null;
}): Promise<TargetInvestigateCasePublicationDecision> => {
  const gatesApplied = [
    "manifest-canonical-path",
    "capability-case-investigation",
    "input-normalized",
    "case-resolution-consistent",
    "evidence-bundle-consistent",
    "diagnosis-consistent",
    "ticket-proposal-present",
  ];
  const blockedGates: string[] = [];

  let publicationStatus: TargetInvestigateCasePublicationStatus = "not_applicable";
  let overallOutcome: TargetInvestigateCasePublicationDecision["overall_outcome"] =
    "inconclusive-case";
  let outcomeReason =
    "A rodada diagnosis-first ainda nao reuniu base suficiente para publication runner-side.";
  let ticketPath: string | null = null;
  let versionedArtifactPaths: string[] = [];
  let nextAction = params.diagnosis.next_action;

  if (params.diagnosis.verdict === "ok") {
    overallOutcome = "no-real-gap";
    outcomeReason =
      "O diagnostico do target concluiu que o caso esta OK; publication runner-side nao se aplica.";
  } else if (params.diagnosis.verdict === "inconclusive") {
    outcomeReason =
      "O diagnostico do target permaneceu inconclusivo; publication runner-side nao deve ser atravessada.";
  } else if (!params.manifest.publicationPolicy.allowAutomaticPublication) {
    blockedGates.push("publication-policy");
    publicationStatus = "blocked_by_policy";
    overallOutcome = "ticket-eligible-but-blocked-by-policy";
    outcomeReason =
      params.manifest.publicationPolicy.blockedReason ??
      "A policy declarada pelo projeto alvo nao permite publication automatica deste ticket.";
    nextAction = "Escalar para revisao humana conforme a policy do manifesto.";
  } else if (!params.ticketProposal) {
    blockedGates.push("target-ticket-proposal-missing");
    publicationStatus = "not_eligible";
    outcomeReason =
      "O target declarou publication, mas ticket-proposal.json ainda nao foi materializado no namespace autoritativo.";
  } else if (!params.ticketPublisher) {
    blockedGates.push("ticket-publisher-missing");
    overallOutcome = "runner-limitation";
    outcomeReason =
      "O runner nao recebeu publisher configurado para materializar ticket elegivel de case-investigation.";
    nextAction = "Conectar o publisher do fluxo antes de habilitar publication automatica.";
  } else {
    const draftSummary = buildTargetInvestigateCaseFinalSummary({
      caseResolution: params.caseResolution,
      evidenceBundle: params.evidenceBundle,
      diagnosis: params.diagnosis,
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
      diagnosisMdPath: params.diagnosisMdPath,
      diagnosisJsonPath: params.diagnosisJsonPath,
      remediationProposalPath: params.remediationProposalPath,
    });
    const publication = await params.ticketPublisher.publish({
      targetProject: params.targetProject,
      normalizedInput: params.normalizedInput,
      manifest: params.manifest,
      caseResolution: params.caseResolution,
      evidenceBundle: params.evidenceBundle,
      diagnosis: params.diagnosis,
      ticketProposal: params.ticketProposal,
      summary: draftSummary,
    });
    publicationStatus = "eligible";
    overallOutcome = "ticket-published";
    outcomeReason =
      "Os gates mecanicos foram satisfeitos e o ticket elegivel foi materializado no projeto alvo.";
    ticketPath = normalizeTargetInvestigateCaseRelativePath(publication.ticketPath);
    versionedArtifactPaths = [ticketPath];
    nextAction = "Revisar o ticket publicado no projeto alvo e seguir o fluxo sequencial normal.";
  }

  return targetInvestigateCasePublicationDecisionSchema.parse({
    publication_status: publicationStatus,
    overall_outcome: overallOutcome,
    outcome_reason: outcomeReason,
    gates_applied: gatesApplied,
    blocked_gates: blockedGates,
    versioned_artifact_paths: versionedArtifactPaths,
    ticket_path: ticketPath,
    next_action: nextAction,
  });
};

const buildInvestigationSnapshot = (params: {
  diagnosis: TargetInvestigateCaseDiagnosis;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  remediationProposalPath: string | null;
}): {
  outcome: TargetInvestigateCaseInvestigationOutcome;
  reason: string;
  remediationProposalPath: string | null;
} => {
  if (params.publicationDecision.overall_outcome === "no-real-gap") {
    return {
      outcome: "no-real-gap",
      reason: params.publicationDecision.outcome_reason,
      remediationProposalPath: null,
    };
  }

  if (params.publicationDecision.overall_outcome === "real-gap-not-internally-avoidable") {
    return {
      outcome: "real-gap-not-internally-avoidable",
      reason: params.publicationDecision.outcome_reason,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (params.publicationDecision.overall_outcome === "real-gap-not-generalizable") {
    return {
      outcome: "real-gap-not-generalizable",
      reason: params.publicationDecision.outcome_reason,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (params.publicationDecision.overall_outcome === "runner-limitation") {
    return {
      outcome: "runner-limitation",
      reason: params.publicationDecision.outcome_reason,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (params.publicationDecision.overall_outcome === "inconclusive-project-capability-gap") {
    return {
      outcome: "project-capability-gap",
      reason: params.publicationDecision.outcome_reason,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  if (params.diagnosis.verdict === "not_ok") {
    return {
      outcome: "actionable-remediation-identified",
      reason: params.diagnosis.next_action,
      remediationProposalPath: params.remediationProposalPath,
    };
  }

  return {
    outcome: "inconclusive",
    reason: params.publicationDecision.outcome_reason,
    remediationProposalPath: params.remediationProposalPath,
  };
};

const validateCaseResolution = (
  input: TargetInvestigateCaseNormalizedInput,
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
};

const discoverTargetInvestigateCaseTicketProposalArtifact = async (
  projectPath: string,
  artifactPaths: TargetInvestigateCaseArtifactSet,
): Promise<TargetInvestigateCaseTicketProposal | null> => {
  if (!(await relativePathExists(projectPath, artifactPaths.ticketProposalPath))) {
    return null;
  }

  return readJsonArtifact(
    projectPath,
    artifactPaths.ticketProposalPath,
    targetInvestigateCaseTicketProposalSchema,
    TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
  );
};

const normalizeArtifactPaths = (
  paths: TargetInvestigateCaseArtifactPaths,
): TargetInvestigateCaseArtifactSet => {
  const caseResolutionPath = normalizeRelativePath(paths.caseResolutionPath, "caseResolutionPath");
  const evidenceIndexPath = normalizeRelativePath(paths.evidenceIndexPath, "evidenceIndexPath");
  const evidenceBundlePath = normalizeRelativePath(paths.evidenceBundlePath, "evidenceBundlePath");
  const diagnosisJsonPath = normalizeRelativePath(paths.diagnosisJsonPath, "diagnosisJsonPath");
  const diagnosisMdPath = normalizeRelativePath(paths.diagnosisMdPath, "diagnosisMdPath");
  const roundDirectory = path.posix.dirname(caseResolutionPath);
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
      path.posix.join(roundDirectory, TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT),
    "publicationDecisionPath",
  );

  return {
    caseResolutionPath,
    evidenceIndexPath,
    evidenceBundlePath,
    diagnosisJsonPath,
    diagnosisMdPath,
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
  schema: ArtifactReaderSchema<SchemaOutput>,
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

  return parsed.data;
};

export const readTargetInvestigateCaseEvidenceBundleArtifact = async (params: {
  projectPath: string;
  relativePath: string;
}): Promise<TargetInvestigateCaseEvidenceBundleArtifact> =>
  readJsonArtifact(
    params.projectPath,
    params.relativePath,
    isTargetInvestigateCaseCaseBundlePath(params.relativePath)
      ? targetInvestigateCaseCaseBundleSchema
      : targetInvestigateCaseEvidenceBundleSchema,
    path.posix.basename(params.relativePath),
  );

const readTargetInvestigateCaseEvidenceBundleArtifactTolerant = async (params: {
  projectPath: string;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  caseResolution: TargetInvestigateCaseCaseResolution;
}): Promise<TargetInvestigateCaseEvidenceBundleArtifact> => {
  if (!(await relativePathExists(params.projectPath, params.artifactPaths.evidenceBundlePath))) {
    throw new Error(
      `Artefato obrigatorio ausente: ${TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT} em ${params.artifactPaths.evidenceBundlePath}.`,
    );
  }

  try {
    return await readTargetInvestigateCaseEvidenceBundleArtifact({
      projectPath: params.projectPath,
      relativePath: params.artifactPaths.evidenceBundlePath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/nao contem JSON valido|contem schema invalido/u.test(message)) {
      throw error;
    }

    return buildDegradedTargetInvestigateCaseEvidenceBundle({
      artifactPaths: params.artifactPaths,
      caseResolution: params.caseResolution,
    });
  }
};

const buildDegradedTargetInvestigateCaseEvidenceBundle = (params: {
  artifactPaths: TargetInvestigateCaseArtifactSet;
  caseResolution: TargetInvestigateCaseCaseResolution;
}): TargetInvestigateCaseEvidenceBundleArtifact => ({
  collection_plan: {
    manifest_path: TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
    strategy_ids: ["target-owned-artifact-inspection"],
  },
  historical_sources: [
    {
      source_id: "case-bundle",
      surface: TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
      consulted: true,
    },
  ],
  sensitive_artifact_refs: [
    {
      ref: "case-bundle",
      path: params.artifactPaths.evidenceBundlePath,
      record_count: 1,
    },
  ],
  replay: {
    used: false,
    mode: "historical-only",
    request_id: params.caseResolution.attempt_resolution.attempt_ref,
    update_db: false,
    cache_policy: null,
    purge_policy: null,
    namespace: path.posix.dirname(params.artifactPaths.evidenceBundlePath),
  },
  collection_sufficiency: "partial",
  normative_conflicts: [],
  factual_sufficiency_reason:
    "case-bundle.json existe, mas o envelope recomendado nao esta consumivel; summary e trace foram montados em modo de automacao degradada.",
});

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
      `${label} nao contem JSON valido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const writeJsonArtifact = async (
  projectPath: string,
  relativePath: string,
  payload: unknown,
): Promise<void> => {
  const absolutePath = resolveProjectRelativePath(projectPath, relativePath, "artifact");
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(`${absolutePath}`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const resolveProjectRelativePath = (
  projectPath: string,
  relativePath: string,
  label: string,
): string => {
  const normalized = normalizeRelativePath(relativePath, label);
  return path.join(projectPath, ...normalized.split("/"));
};

const relativePathExists = async (
  projectPath: string,
  relativePath: string,
): Promise<boolean> => {
  try {
    await fs.stat(resolveProjectRelativePath(projectPath, relativePath, relativePath));
    return true;
  } catch {
    return false;
  }
};

const assertRelativeArtifactExists = async (
  projectPath: string,
  relativePath: string,
  label: string,
): Promise<void> => {
  if (!(await relativePathExists(projectPath, relativePath))) {
    throw new Error(`Artefato obrigatorio ausente: ${label} em ${relativePath}.`);
  }
};

const assertArtifactExistsOrFail = async (params: {
  targetProject: ProjectRef;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  artifactPath: string;
  artifactLabel: string;
  failedAtMilestone: TargetInvestigateCaseMilestone;
  versionBoundaryState: TargetFlowVersionBoundaryState;
  roundId: string;
  roundDirectory: string;
}): Promise<void> => {
  await assertRelativeArtifactExists(
    params.targetProject.path,
    params.artifactPath,
    params.artifactLabel,
  );
};

const buildTargetInvestigateCaseRoundId = (value: Date): string =>
  value.toISOString().replace(/\.\d{3}Z$/u, "Z").replace(/:/gu, "-");

const buildTargetInvestigateCaseRoundDirectory = (
  roundId: string,
  manifest: TargetInvestigateCaseManifest,
): string =>
  normalizeTargetInvestigateCaseRelativePath(
    manifest.roundDirectories.authoritative.replace(/<round-id>/gu, roundId),
  );

const buildTargetInvestigateCaseArtifactSet = (
  roundDirectory: string,
): TargetInvestigateCaseArtifactSet => ({
  caseResolutionPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "case-resolution.json"),
  ),
  evidenceIndexPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT),
  ),
  evidenceBundlePath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT),
  ),
  diagnosisJsonPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "diagnosis.json"),
  ),
  diagnosisMdPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, "diagnosis.md"),
  ),
  remediationProposalPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT),
  ),
  ticketProposalPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT),
  ),
  publicationDecisionPath: normalizeTargetInvestigateCaseRelativePath(
    path.join(roundDirectory, TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT),
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
    flow: TARGET_INVESTIGATE_CASE_V2_FLOW,
    command: targetFlowKindToCommand(TARGET_INVESTIGATE_CASE_V2_FLOW),
    targetProject: params.targetProject,
    milestone: params.milestone,
    milestoneLabel: renderTargetFlowMilestoneLabel(
      TARGET_INVESTIGATE_CASE_V2_FLOW,
      params.milestone,
    ),
    message: params.message,
    versionBoundaryState: params.versionBoundaryState,
    recordedAtUtc: params.now().toISOString(),
  });
};

const buildCancelledTargetInvestigateCaseResult = (params: {
  targetProject: ProjectRef;
  roundId: string;
  roundDirectory: string;
  artifactPaths: string[];
  cancelledAtMilestone: TargetInvestigateCaseMilestone;
  versionBoundaryState: TargetFlowVersionBoundaryState;
}): Extract<TargetInvestigateCaseExecutionResult, { status: "cancelled" }> => ({
  status: "cancelled",
  summary: {
    targetProject: params.targetProject,
    roundId: params.roundId,
    roundDirectory: params.roundDirectory,
    artifactPaths: params.artifactPaths,
    cancelledAtMilestone: params.cancelledAtMilestone,
    nextAction: "Reexecutar a rodada quando for seguro retomar a investigacao.",
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
  nextAction: string;
  message: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
}): Extract<TargetInvestigateCaseExecutionResult, { status: "failed" }> => ({
  status: "failed",
  message: params.message,
  summary: {
    targetProject: params.targetProject,
    roundId: params.roundId,
    roundDirectory: params.roundDirectory,
    artifactPaths: params.artifactPaths,
    failedAtMilestone: params.failedAtMilestone,
    failureSurface: params.failureSurface,
    failureKind: params.failureKind,
    nextAction: params.nextAction,
    message: params.message,
    versionBoundaryState: params.versionBoundaryState,
  },
});

const mapTargetInvestigateCaseResolutionError = (
  error: unknown,
): Extract<
  TargetInvestigateCaseExecutionResult,
  { status: "blocked" }
> => {
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
    reason: "project-not-found",
    message: error instanceof Error ? error.message : String(error),
  };
};

const tokenizeCommand = (commandText: string): string[] => {
  const matches = commandText.match(/"[^"]*"|'[^']*'|\S+/gu) ?? [];
  return matches.map((token) => {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1);
    }
    return token;
  });
};

const quoteIfNeeded = (value: string): string =>
  /\s/u.test(value) ? JSON.stringify(value) : value;

const normalizeRequiredValue = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} nao pode ser vazio.`);
  }
  return normalized;
};

const normalizeOptionalValue = (value: string | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeTargetInvestigateCaseExecuteInput = (
  input: TargetInvestigateCaseExecuteRequest["input"],
): TargetInvestigateCaseNormalizedInput => {
  if (typeof input === "string") {
    return parseTargetInvestigateCaseCommand(input);
  }

  if ("canonicalCommand" in input) {
    return targetInvestigateCaseNormalizedInputSchema.parse(input);
  }

  return normalizeTargetInvestigateCaseInput(input);
};

const renderZodIssues = (issues: readonly z.ZodIssue[]): string =>
  issues
    .map((issue) => {
      const pathLabel = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${pathLabel}${issue.message}`;
    })
    .join(" | ");

const listExistingTargetInvestigateCaseArtifacts = async (
  projectPath: string,
  artifactPaths: TargetInvestigateCaseArtifactSet,
): Promise<string[]> => {
  const existing: string[] = [];
  for (const artifactPath of Object.values(artifactPaths)) {
    if (await relativePathExists(projectPath, artifactPath)) {
      existing.push(artifactPath);
    }
  }

  return existing.sort((left, right) => left.localeCompare(right, "pt-BR"));
};

const wrapTargetInvestigateCaseTicketPublisher = (
  publisher: TargetInvestigateCaseTicketPublisher,
  onVersionBoundary: () => Promise<void>,
): TargetInvestigateCaseTicketPublisher => ({
  publish: async (request) => {
    const result = await publisher.publish(request);
    await onVersionBoundary();
    return result;
  },
});
