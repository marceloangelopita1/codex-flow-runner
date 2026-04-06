import { z } from "zod";
import { ProjectRef } from "./project.js";
import {
  TargetFlowLifecycleHooks,
  TargetFlowVersionBoundaryState,
  TargetInvestigateCaseMilestone,
} from "./target-flow.js";

const trimmedString = z.string().trim().min(1);

const relativePathSchema = trimmedString.refine(
  (value) =>
    !value.startsWith("/") &&
    !value.startsWith("\\") &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/../") &&
    !value.includes("\\..\\") &&
    !value.startsWith("../") &&
    !value.startsWith("..\\"),
  {
    message: "Use apenas caminhos relativos sem `..`.",
  },
);

const uniqueValues = <const Values extends readonly [string, ...string[]]>(
  values: Values,
  label: string,
): Values => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Lista duplicada em ${label}: ${value}`);
    }
    seen.add(value);
  }

  return values;
};

const uniqueArray = <Schema extends z.ZodTypeAny>(schema: Schema, label: string) =>
  z.array(schema).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const fingerprint = JSON.stringify(value);
      if (seen.has(fingerprint)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `${label} nao aceita duplicados.`,
        });
      }
      seen.add(fingerprint);
    });
  });

const uniqueNonEmptyArray = <Schema extends z.ZodTypeAny>(schema: Schema, label: string) =>
  z.array(schema).min(1).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const fingerprint = JSON.stringify(value);
      if (seen.has(fingerprint)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `${label} nao aceita duplicados.`,
        });
      }
      seen.add(fingerprint);
    });
  });

const uniqueStringArray = <Schema extends z.ZodType<string>>(schema: Schema, label: string) =>
  uniqueNonEmptyArray(schema, label);

export const TARGET_INVESTIGATE_CASE_CONTRACT_VERSION = "1.0";
export const TARGET_INVESTIGATE_CASE_SCHEMA_VERSION = "1.0";
export const TARGET_INVESTIGATE_CASE_MANIFEST_PATH =
  "docs/workflows/target-case-investigation-manifest.json";
export const TARGET_INVESTIGATE_CASE_CAPABILITY = "case-investigation";
export const TARGET_INVESTIGATE_CASE_COMMAND = "/target_investigate_case";
export const TARGET_INVESTIGATE_CASE_ROUNDS_DIR = "investigations";
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT =
  "semantic-review.request.json";
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT =
  "semantic-review.result.json";
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_SCHEMA_VERSION =
  "semantic_review_request_v1";
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_SCHEMA_VERSION =
  "semantic_review_result_v1";

export const TARGET_INVESTIGATE_CASE_ALLOWED_SELECTORS = uniqueValues(
  ["case-ref", "workflow", "request-id", "window", "symptom"] as const,
  "allowed-selectors",
);
export const TARGET_INVESTIGATE_CASE_HOUVE_GAP_REAL_VALUES = uniqueValues(
  ["yes", "no", "inconclusive"] as const,
  "houve-gap-real",
);
export const TARGET_INVESTIGATE_CASE_EVITABILIDADE_VALUES = uniqueValues(
  ["yes", "no", "inconclusive", "not_applicable"] as const,
  "era-evitavel-internamente",
);
export const TARGET_INVESTIGATE_CASE_GENERALIZACAO_VALUES = uniqueValues(
  ["yes", "no", "inconclusive", "not_applicable"] as const,
  "merece-ticket-generalizavel",
);
export const TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES = uniqueValues(
  ["low", "medium", "high"] as const,
  "confidence",
);
export const TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES = uniqueValues(
  ["insufficient", "partial", "sufficient", "strong"] as const,
  "evidence-sufficiency",
);
export const TARGET_INVESTIGATE_CASE_PRIMARY_TAXONOMY_VALUES = uniqueValues(
  [
    "capability_gap",
    "bug_likely",
    "bug_confirmed",
    "expected_behavior",
    "evidence_missing_or_partial",
  ] as const,
  "primary-taxonomy",
);
export const TARGET_INVESTIGATE_CASE_OPERATIONAL_CLASS_VALUES = uniqueValues(
  [
    "bundle_not_captured",
    "runtime_surface_unavailable",
    "bug_likely_but_unconfirmed",
  ] as const,
  "operational-class",
);
export const TARGET_INVESTIGATE_CASE_RECOMMENDED_ACTION_VALUES = uniqueValues(
  ["publish_ticket", "do_not_publish", "inconclusive"] as const,
  "recommended-action",
);
export const TARGET_INVESTIGATE_CASE_PUBLICATION_STATUS_VALUES = uniqueValues(
  ["eligible", "not_eligible", "blocked_by_policy", "not_applicable"] as const,
  "publication-status",
);
export const TARGET_INVESTIGATE_CASE_OVERALL_OUTCOME_VALUES = uniqueValues(
  [
    "no-real-gap",
    "real-gap-not-internally-avoidable",
    "real-gap-not-generalizable",
    "inconclusive-case",
    "inconclusive-project-capability-gap",
    "runner-limitation",
    "ticket-published",
    "ticket-eligible-but-blocked-by-policy",
  ] as const,
  "overall-outcome",
);
export const TARGET_INVESTIGATE_CASE_NORMATIVE_CONFLICT_KIND_VALUES = uniqueValues(
  [
    "contract-violation",
    "schema-violation",
    "guardrail-violation",
    "high-precedence-conflict",
  ] as const,
  "normative-conflict-kind",
);
export const TARGET_INVESTIGATE_CASE_CAUSAL_SURFACE_OWNER_VALUES = uniqueValues(
  ["target-project", "runner", "shared"] as const,
  "causal-surface-owner",
);
export const TARGET_INVESTIGATE_CASE_CAUSAL_SURFACE_KIND_VALUES = uniqueValues(
  [
    "bug",
    "expected-behavior",
    "project-capability-gap",
    "observability-gap",
    "contract-conflict",
    "data-anomaly",
    "runner-limitation",
    "unknown",
  ] as const,
  "causal-surface-kind",
);
export const TARGET_INVESTIGATE_CASE_ATTEMPT_RESOLUTION_STATUS_VALUES = uniqueValues(
  ["resolved", "absent-explicitly", "not-required"] as const,
  "attempt-resolution-status",
);
export const TARGET_INVESTIGATE_CASE_REPLAY_DECISION_STATUS_VALUES = uniqueValues(
  ["required", "not-required", "used", "not-allowed", "inconclusive"] as const,
  "replay-decision-status",
);
export const TARGET_INVESTIGATE_CASE_REPLAY_READINESS_STATE_VALUES = uniqueValues(
  ["prohibited", "incomplete", "ready", "executed"] as const,
  "replay-readiness-state",
);
export const TARGET_INVESTIGATE_CASE_REPLAY_MODE_VALUES = uniqueValues(
  ["historical-only", "safe-replay", "mixed"] as const,
  "replay-mode",
);
export const TARGET_INVESTIGATE_CASE_DOSSIER_SENSITIVITY_VALUES = uniqueValues(
  ["restricted", "confidential"] as const,
  "dossier-sensitivity",
);
export const TARGET_INVESTIGATE_CASE_PRECEDENCE_FIXED_LAYERS = uniqueValues(
  ["canonical-contract", "structured-contracts", "runtime-guardrails"] as const,
  "precedence-fixed-layers",
);
export const TARGET_INVESTIGATE_CASE_PRECEDENCE_PROJECT_LAYERS = uniqueValues(
  ["active-decisions", "tests-and-goldens", "historical-evidence-and-replay"] as const,
  "precedence-project-layers",
);
export const TARGET_INVESTIGATE_CASE_TARGET_PROJECT_SELECTOR_VALUES = uniqueValues(
  ["propertyId", "requestId", "workflow", "window", "runArtifact", "symptom"] as const,
  "target-project-selectors",
);
export const TARGET_INVESTIGATE_CASE_CASE_REF_AUTHORITY_VALUES = uniqueValues(
  ["propertyId", "requestId", "runArtifact"] as const,
  "case-ref-authorities",
);
export const TARGET_INVESTIGATE_CASE_ATTEMPT_REF_AUTHORITY_VALUES = uniqueValues(
  ["requestId", "runArtifact", "workflow+window"] as const,
  "attempt-ref-authorities",
);
export const TARGET_INVESTIGATE_CASE_PURGE_IDENTIFIER_VALUES = uniqueValues(
  ["propertyId", "pdfFileName", "matriculaNumber", "transcriptHint"] as const,
  "purge-identifiers",
);
export const TARGET_INVESTIGATE_CASE_TICKET_SOURCE_VALUES = uniqueValues(
  ["production-observation"] as const,
  "ticket-sources",
);
export const TARGET_INVESTIGATE_CASE_VERSIONED_ARTIFACT_VALUES = uniqueValues(
  ["ticket"] as const,
  "versioned-artifacts",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_READINESS_STATUS_VALUES = uniqueValues(
  ["ready", "blocked"] as const,
  "semantic-review-readiness-status",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_READINESS_REASON_CODE_VALUES = uniqueValues(
  ["READY", "WORKFLOW_UNRESOLVED", "WORKFLOW_RESPONSE_MISSING", "WORKFLOW_TARGETS_MISSING"] as const,
  "semantic-review-readiness-reason-code",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_SYMPTOM_SELECTION_SOURCE_VALUES = uniqueValues(
  ["operator", "strong_candidate", "none"] as const,
  "semantic-review-symptom-selection-source",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_SYMPTOM_CANDIDATE_STRENGTH_VALUES =
  uniqueValues(["strong"] as const, "semantic-review-symptom-candidate-strength");
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_VERDICT_VALUES = uniqueValues(
  ["confirmed_error", "expected_behavior", "inconclusive"] as const,
  "semantic-review-verdict",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_ISSUE_TYPE_VALUES = uniqueValues(
  [
    "semantic_truncation",
    "contract_mismatch",
    "scope_confusion",
    "data_anomaly",
    "observability_limit",
    "unknown",
  ] as const,
  "semantic-review-issue-type",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_FIELD_VERDICT_VALUES = uniqueValues(
  ["supports_error", "supports_expected_behavior", "not_assessed"] as const,
  "semantic-review-field-verdict",
);
export const TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_TRACE_STATUS_VALUES = uniqueValues(
  ["missing", "blocked", "failed", "completed"] as const,
  "semantic-review-trace-status",
);

export type TargetInvestigateCaseAllowedSelector =
  (typeof TARGET_INVESTIGATE_CASE_ALLOWED_SELECTORS)[number];
export type TargetInvestigateCaseHouveGapReal =
  (typeof TARGET_INVESTIGATE_CASE_HOUVE_GAP_REAL_VALUES)[number];
export type TargetInvestigateCaseEvitabilidade =
  (typeof TARGET_INVESTIGATE_CASE_EVITABILIDADE_VALUES)[number];
export type TargetInvestigateCaseGeneralizacao =
  (typeof TARGET_INVESTIGATE_CASE_GENERALIZACAO_VALUES)[number];
export type TargetInvestigateCaseConfidence =
  (typeof TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES)[number];
export type TargetInvestigateCaseEvidenceSufficiency =
  (typeof TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES)[number];
export type TargetInvestigateCasePrimaryTaxonomy =
  (typeof TARGET_INVESTIGATE_CASE_PRIMARY_TAXONOMY_VALUES)[number];
export type TargetInvestigateCaseOperationalClass =
  (typeof TARGET_INVESTIGATE_CASE_OPERATIONAL_CLASS_VALUES)[number];
export type TargetInvestigateCaseRecommendedAction =
  (typeof TARGET_INVESTIGATE_CASE_RECOMMENDED_ACTION_VALUES)[number];
export type TargetInvestigateCasePublicationStatus =
  (typeof TARGET_INVESTIGATE_CASE_PUBLICATION_STATUS_VALUES)[number];
export type TargetInvestigateCaseOverallOutcome =
  (typeof TARGET_INVESTIGATE_CASE_OVERALL_OUTCOME_VALUES)[number];
export type TargetInvestigateCaseNormativeConflictKind =
  (typeof TARGET_INVESTIGATE_CASE_NORMATIVE_CONFLICT_KIND_VALUES)[number];
export type TargetInvestigateCaseCausalSurfaceOwner =
  (typeof TARGET_INVESTIGATE_CASE_CAUSAL_SURFACE_OWNER_VALUES)[number];
export type TargetInvestigateCaseCausalSurfaceKind =
  (typeof TARGET_INVESTIGATE_CASE_CAUSAL_SURFACE_KIND_VALUES)[number];
export type TargetInvestigateCaseAttemptResolutionStatus =
  (typeof TARGET_INVESTIGATE_CASE_ATTEMPT_RESOLUTION_STATUS_VALUES)[number];
export type TargetInvestigateCaseReplayDecisionStatus =
  (typeof TARGET_INVESTIGATE_CASE_REPLAY_DECISION_STATUS_VALUES)[number];
export type TargetInvestigateCaseReplayReadinessState =
  (typeof TARGET_INVESTIGATE_CASE_REPLAY_READINESS_STATE_VALUES)[number];
export type TargetInvestigateCaseReplayMode =
  (typeof TARGET_INVESTIGATE_CASE_REPLAY_MODE_VALUES)[number];
export type TargetInvestigateCaseDossierSensitivity =
  (typeof TARGET_INVESTIGATE_CASE_DOSSIER_SENSITIVITY_VALUES)[number];
export type TargetInvestigateCaseTargetProjectSelector =
  (typeof TARGET_INVESTIGATE_CASE_TARGET_PROJECT_SELECTOR_VALUES)[number];
export type TargetInvestigateCaseCaseRefAuthority =
  (typeof TARGET_INVESTIGATE_CASE_CASE_REF_AUTHORITY_VALUES)[number];
export type TargetInvestigateCaseAttemptRefAuthority =
  (typeof TARGET_INVESTIGATE_CASE_ATTEMPT_REF_AUTHORITY_VALUES)[number];
export type TargetInvestigateCasePurgeIdentifier =
  (typeof TARGET_INVESTIGATE_CASE_PURGE_IDENTIFIER_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewReadinessStatus =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_READINESS_STATUS_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewReadinessReasonCode =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_READINESS_REASON_CODE_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewSymptomSelectionSource =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_SYMPTOM_SELECTION_SOURCE_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewSymptomCandidateStrength =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_SYMPTOM_CANDIDATE_STRENGTH_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewVerdict =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_VERDICT_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewIssueType =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_ISSUE_TYPE_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewFieldVerdict =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_FIELD_VERDICT_VALUES)[number];
export type TargetInvestigateCaseSemanticReviewTraceStatus =
  (typeof TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_TRACE_STATUS_VALUES)[number];

const selectorEnumSchema = z.enum(TARGET_INVESTIGATE_CASE_ALLOWED_SELECTORS);
const houveGapRealSchema = z.enum(TARGET_INVESTIGATE_CASE_HOUVE_GAP_REAL_VALUES);
const evitabilidadeSchema = z.enum(TARGET_INVESTIGATE_CASE_EVITABILIDADE_VALUES);
const generalizacaoSchema = z.enum(TARGET_INVESTIGATE_CASE_GENERALIZACAO_VALUES);
const confidenceSchema = z.enum(TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES);
const evidenceSufficiencySchema = z.enum(TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES);
const primaryTaxonomySchema = z.enum(TARGET_INVESTIGATE_CASE_PRIMARY_TAXONOMY_VALUES);
const operationalClassSchema = z.enum(TARGET_INVESTIGATE_CASE_OPERATIONAL_CLASS_VALUES);
const recommendedActionSchema = z.enum(TARGET_INVESTIGATE_CASE_RECOMMENDED_ACTION_VALUES);
const publicationStatusSchema = z.enum(TARGET_INVESTIGATE_CASE_PUBLICATION_STATUS_VALUES);
const overallOutcomeSchema = z.enum(TARGET_INVESTIGATE_CASE_OVERALL_OUTCOME_VALUES);
const causalSurfaceOwnerSchema = z.enum(TARGET_INVESTIGATE_CASE_CAUSAL_SURFACE_OWNER_VALUES);
const causalSurfaceKindSchema = z.enum(TARGET_INVESTIGATE_CASE_CAUSAL_SURFACE_KIND_VALUES);
const normativeConflictKindSchema = z.enum(TARGET_INVESTIGATE_CASE_NORMATIVE_CONFLICT_KIND_VALUES);
const attemptResolutionStatusSchema = z.enum(
  TARGET_INVESTIGATE_CASE_ATTEMPT_RESOLUTION_STATUS_VALUES,
);
const replayDecisionStatusSchema = z.enum(TARGET_INVESTIGATE_CASE_REPLAY_DECISION_STATUS_VALUES);
const replayReadinessStateSchema = z.enum(TARGET_INVESTIGATE_CASE_REPLAY_READINESS_STATE_VALUES);
const replayModeSchema = z.enum(TARGET_INVESTIGATE_CASE_REPLAY_MODE_VALUES);
const dossierSensitivitySchema = z.enum(TARGET_INVESTIGATE_CASE_DOSSIER_SENSITIVITY_VALUES);
const targetProjectSelectorSchema = z.enum(TARGET_INVESTIGATE_CASE_TARGET_PROJECT_SELECTOR_VALUES);
const caseRefAuthoritySchema = z.enum(TARGET_INVESTIGATE_CASE_CASE_REF_AUTHORITY_VALUES);
const attemptRefAuthoritySchema = z.enum(TARGET_INVESTIGATE_CASE_ATTEMPT_REF_AUTHORITY_VALUES);
const purgeIdentifierSchema = z.enum(TARGET_INVESTIGATE_CASE_PURGE_IDENTIFIER_VALUES);
const ticketSourceSchema = z.enum(TARGET_INVESTIGATE_CASE_TICKET_SOURCE_VALUES);
const versionedArtifactSchema = z.enum(TARGET_INVESTIGATE_CASE_VERSIONED_ARTIFACT_VALUES);
const semanticReviewReadinessStatusSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_READINESS_STATUS_VALUES,
);
const semanticReviewReadinessReasonCodeSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_READINESS_REASON_CODE_VALUES,
);
const semanticReviewSymptomSelectionSourceSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_SYMPTOM_SELECTION_SOURCE_VALUES,
);
const semanticReviewSymptomCandidateStrengthSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_SYMPTOM_CANDIDATE_STRENGTH_VALUES,
);
const semanticReviewVerdictSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_VERDICT_VALUES,
);
const semanticReviewIssueTypeSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_ISSUE_TYPE_VALUES,
);
const semanticReviewFieldVerdictSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_FIELD_VERDICT_VALUES,
);
const semanticReviewTraceStatusSchema = z.enum(
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_TRACE_STATUS_VALUES,
);
const caseIdentityMemberSchema = z.union([targetProjectSelectorSchema, purgeIdentifierSchema]);

const selectorValueSchema = trimmedString;
const jsonPointerSchema = trimmedString.refine((value) => value.startsWith("/"), {
  message: "JSON pointer deve comecar com `/`.",
});

export const targetInvestigateCaseNormalizedInputSchema = z
  .object({
    projectName: trimmedString,
    caseRef: trimmedString,
    workflow: selectorValueSchema.optional(),
    requestId: selectorValueSchema.optional(),
    window: selectorValueSchema.optional(),
    symptom: selectorValueSchema.optional(),
    canonicalCommand: trimmedString,
  })
  .strict();

const targetInvestigateCaseManifestSemanticReviewSymptomsSchema = z
  .object({
    selectedField: z.literal("symptom"),
    selectionField: z.literal("symptom_selection"),
    candidateField: z.literal("symptom_candidates"),
    selectionPrecedence: uniqueNonEmptyArray(
      trimmedString,
      "semanticReview.symptoms.selectionPrecedence",
    ),
    minimumScopedCandidates: z
      .array(
        z
          .object({
            candidateId: trimmedString,
            workflow: trimmedString,
            fieldPath: trimmedString,
            jsonPointer: jsonPointerSchema,
            issueType: semanticReviewIssueTypeSchema,
            strength: semanticReviewSymptomCandidateStrengthSchema,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const targetInvestigateCaseManifestSemanticReviewSchema = z
  .object({
    owner: z.literal("target-project"),
    runnerExecutor: z.literal("codex-flow-runner"),
    artifacts: z
      .object({
        request: z
          .object({
            artifact: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT),
            schemaVersion: z.literal(
              TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_SCHEMA_VERSION,
            ),
            requiredFields: uniqueNonEmptyArray(trimmedString, "semanticReview.artifacts.request.requiredFields"),
          })
          .strict(),
        result: z
          .object({
            artifact: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT),
            schemaVersion: z.literal(
              TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_SCHEMA_VERSION,
            ),
            optionalUntilRunnerIntegration: z.boolean().optional(),
          })
          .strict(),
      })
      .strict(),
    packetPolicy: z
      .object({
        declaredSurfacesOnly: z.literal(true),
        newEvidenceDiscoveryAllowed: z.literal(false),
        allowRawPayloadEmbedding: z.literal(false),
        boundedByWorkflowContract: z.literal(true),
        targetProjectRemainsAssessmentAuthority: z.literal(true),
        runnerRemainsPublicationAuthority: z.literal(true),
      })
      .strict(),
    recomposition: z
      .object({
        strategy: z.literal("rerun-entrypoint"),
        roundRequestIdFlag: z.literal("--round-request-id"),
        forceFlag: z.literal("--force"),
        replayMode: replayModeSchema,
        preserveExistingDossier: z.boolean(),
      })
      .strict()
      .optional(),
    symptoms: targetInvestigateCaseManifestSemanticReviewSymptomsSchema.optional(),
  })
  .strict();

export const targetInvestigateCaseManifestSchema = z
  .object({
    contractVersion: z.literal(TARGET_INVESTIGATE_CASE_CONTRACT_VERSION),
    schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
    capability: z.literal(TARGET_INVESTIGATE_CASE_CAPABILITY),
    entrypoint: z
      .object({
        command: trimmedString,
        scriptPath: relativePathSchema,
        defaultReplayMode: replayModeSchema,
        defaultIncludeWorkflowDebug: z.boolean(),
      })
      .strict()
      .optional(),
    selectors: z
      .object({
        accepted: uniqueStringArray(selectorEnumSchema, "selectors.accepted"),
        required: uniqueStringArray(selectorEnumSchema, "selectors.required"),
        targetProjectAccepted: uniqueNonEmptyArray(
          targetProjectSelectorSchema,
          "selectors.targetProjectAccepted",
        ).optional(),
      })
      .strict()
      .superRefine((value, context) => {
        const accepted = new Set(value.accepted);
        value.required.forEach((entry, index) => {
          if (!accepted.has(entry)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["required", index],
              message: "selectors.required precisa ser subconjunto de selectors.accepted.",
            });
          }
        });
        if (!value.required.includes("case-ref")) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["required"],
            message: "case-ref e obrigatorio no manifesto da capability.",
          });
        }
      }),
    workflows: z
      .object({
        investigable: uniqueStringArray(trimmedString, "workflows.investigable"),
      })
      .strict(),
    caseResolutionPolicy: z
      .object({
        requireExplicitAttemptResolution: z.boolean(),
        allowAttemptlessCases: z.boolean(),
        caseRefAuthorities: uniqueNonEmptyArray(
          caseRefAuthoritySchema,
          "caseResolutionPolicy.caseRefAuthorities",
        ).optional(),
        attemptRefAuthorities: uniqueNonEmptyArray(
          attemptRefAuthoritySchema,
          "caseResolutionPolicy.attemptRefAuthorities",
        ).optional(),
      })
      .strict(),
    evidenceCollection: z
      .object({
        surfaces: z
          .array(
            z
              .object({
                id: trimmedString,
                kind: trimmedString,
                description: trimmedString,
              })
              .strict(),
          )
          .min(1),
        strategies: z
          .array(
            z
              .object({
                id: trimmedString,
                kind: trimmedString,
                reference: trimmedString,
              })
              .strict(),
          )
          .min(1),
      })
      .strict(),
    outputs: z
      .object({
        caseResolution: z
          .object({
            artifactPath: z.literal("case-resolution.json"),
            schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
          })
          .strict(),
        evidenceBundle: z
          .object({
            artifactPath: z.literal("evidence-bundle.json"),
            schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
          })
          .strict(),
        assessment: z
          .object({
            artifactPath: z.literal("assessment.json"),
            schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
          })
          .strict(),
        publicationDecision: z
          .object({
            artifactPath: z.literal("publication-decision.json"),
            schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
          })
          .strict(),
        dossier: z
          .object({
            artifactPathPattern: z.literal("dossier.md|dossier.json"),
            schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
            preferredArtifact: z.enum(["dossier.md", "dossier.json"]).optional(),
          })
          .strict(),
      })
      .strict(),
    semanticReview: targetInvestigateCaseManifestSemanticReviewSchema.optional(),
    replayPolicy: z
      .object({
        supported: z.boolean(),
        safeModeRequired: z.boolean(),
        requireUpdateDbFalse: z.boolean(),
        requireDedicatedRequestId: z.boolean(),
        allowWorkflowDebugWhenSafe: z.boolean(),
        cachePurgePolicy: trimmedString,
        acceptedPurgeIdentifiers: uniqueNonEmptyArray(
          purgeIdentifierSchema,
          "replayPolicy.acceptedPurgeIdentifiers",
        ).optional(),
      })
      .strict(),
    dossierPolicy: z
      .object({
        localPathTemplate: trimmedString,
        sensitivity: dossierSensitivitySchema,
        retention: trimmedString,
      })
      .strict(),
    supportingArtifacts: z
      .object({
        docs: z.array(relativePathSchema),
        prompts: z.array(relativePathSchema),
        scripts: z.array(relativePathSchema),
      })
      .strict(),
    precedence: z
      .object({
        fixedLayers: z
          .tuple([
            z.literal(TARGET_INVESTIGATE_CASE_PRECEDENCE_FIXED_LAYERS[0]),
            z.literal(TARGET_INVESTIGATE_CASE_PRECEDENCE_FIXED_LAYERS[1]),
            z.literal(TARGET_INVESTIGATE_CASE_PRECEDENCE_FIXED_LAYERS[2]),
          ])
          .readonly(),
        projectCustomizableLayers: z
          .tuple([
            z.literal(TARGET_INVESTIGATE_CASE_PRECEDENCE_PROJECT_LAYERS[0]),
            z.literal(TARGET_INVESTIGATE_CASE_PRECEDENCE_PROJECT_LAYERS[1]),
            z.literal(TARGET_INVESTIGATE_CASE_PRECEDENCE_PROJECT_LAYERS[2]),
          ])
          .readonly(),
      })
      .strict(),
    publicationPolicy: z
      .object({
        allowAutomaticPublication: z.boolean(),
        requireStrongEvidenceByDefault: z.boolean(),
        allowSufficientWithNormativeConflict: z.boolean(),
        requireGeneralizationBasis: z.boolean(),
        requireZeroBlockingVetoes: z.boolean(),
        blockedReason: trimmedString.nullable(),
      })
      .strict(),
    ticketPublicationPolicy: z
      .object({
        internalTicketTemplatePath: relativePathSchema,
        causalBlockSourcePath: relativePathSchema,
        mandatoryCausalBlockSources: uniqueNonEmptyArray(
          ticketSourceSchema,
          "ticketPublicationPolicy.mandatoryCausalBlockSources",
        ),
        versionedArtifactsDefault: uniqueNonEmptyArray(
          versionedArtifactSchema,
          "ticketPublicationPolicy.versionedArtifactsDefault",
        ),
        nonVersionedArtifactsDefault: uniqueStringArray(
          trimmedString,
          "ticketPublicationPolicy.nonVersionedArtifactsDefault",
        ),
        semanticAuthority: z.literal("target-project"),
        finalPublicationAuthority: z.literal("runner"),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

export const targetInvestigateCasePilotManifestSchema = z
  .object({
    contractVersion: z.literal(TARGET_INVESTIGATE_CASE_CONTRACT_VERSION),
    capability: z
      .object({
        key: z.literal(TARGET_INVESTIGATE_CASE_CAPABILITY),
        manifestPath: z.literal(TARGET_INVESTIGATE_CASE_MANIFEST_PATH),
        compatibleRunnerFlow: z.literal("target-investigate-case"),
      })
      .strict(),
    entrypoint: z
      .object({
        command: trimmedString,
        scriptPath: relativePathSchema,
        defaultReplayMode: replayModeSchema,
        defaultIncludeWorkflowDebug: z.boolean(),
      })
      .strict()
      .optional(),
    selectors: z
      .object({
        accepted: uniqueNonEmptyArray(targetProjectSelectorSchema, "selectors.accepted"),
        runnerCaseRefRequired: z.boolean(),
        attemptResolution: z
          .object({
            strategy: z.literal("explicit-or-null"),
            runnerMustNotGuess: z.boolean(),
            requiredArtifacts: uniqueNonEmptyArray(
              z.enum(["case-resolution.json", "assessment.json"]),
              "selectors.attemptResolution.requiredArtifacts",
            ),
          })
          .strict(),
      })
      .strict(),
    investigableWorkflows: z
      .array(
        z
          .object({
            key: trimmedString,
            supportStatus: z.enum(["supported", "implemented_but_unsupported"]),
            publicHttpSelectable: z.boolean(),
            documentationPath: relativePathSchema,
          })
          .strict(),
      )
      .min(1),
    caseResolution: z
      .object({
        caseRefAuthorities: uniqueNonEmptyArray(
          caseRefAuthoritySchema,
          "caseResolution.caseRefAuthorities",
        ),
        attemptRefAuthorities: uniqueNonEmptyArray(
          attemptRefAuthoritySchema,
          "caseResolution.attemptRefAuthorities",
        ),
        canonicalIdentityMembers: uniqueNonEmptyArray(
          caseIdentityMemberSchema,
          "caseResolution.canonicalIdentityMembers",
        ).optional(),
        attemptCandidates: z
          .object({
            discoveryMode: z.literal("case-identity"),
            selectionPolicy: z.literal("no-silent-selection-on-ambiguity"),
            historicalEvidenceMayReuseSingleCandidate: z.boolean(),
          })
          .strict()
          .optional(),
        replayReadiness: z
          .object({
            states: uniqueNonEmptyArray(
              replayReadinessStateSchema,
              "caseResolution.replayReadiness.states",
            ),
            legacyCompatField: z.literal("replay_decision"),
          })
          .strict()
          .optional(),
        noSilentAttemptSelection: z.boolean(),
      })
      .strict(),
    evidenceSurfaces: z
      .array(
        z
          .object({
            id: trimmedString,
            kind: trimmedString,
            pathPatterns: z.array(trimmedString).optional(),
            scriptPath: relativePathSchema.optional(),
            source: trimmedString.optional(),
            endpoint: trimmedString.optional(),
            historicalClosureEligible: z.union([z.boolean(), trimmedString]).optional(),
            notes: trimmedString,
          })
          .strict(),
      )
      .min(1),
    collectionStrategies: z
      .object({
        allowedQueries: z.array(trimmedString),
        allowedCommands: z.array(
          z
            .object({
              id: trimmedString,
              method: trimmedString.optional(),
              path: trimmedString.optional(),
              requiredPayload: z.record(z.string(), z.unknown()).optional(),
              dryRunRequiredBeforeApply: z.boolean().optional(),
              scriptPath: relativePathSchema.optional(),
            })
            .strict(),
        ),
        allowedTemplates: z.array(relativePathSchema),
      })
      .strict(),
    phaseOutputs: z
      .object({
        preflight: z
          .object({
            artifact: z.literal("preflight.json").optional(),
            schemaVersion: trimmedString,
            requiredFields: z.array(trimmedString).min(1),
          })
          .strict(),
        "case-resolution": z
          .object({
            artifact: z.literal("case-resolution.json"),
            schemaVersion: trimmedString,
          })
          .strict(),
        "evidence-collection": z
          .object({
            artifact: z.literal("evidence-bundle.json"),
            schemaVersion: trimmedString,
          })
          .strict(),
        assessment: z
          .object({
            artifact: z.literal("assessment.json"),
            schemaVersion: trimmedString,
            requiredFields: uniqueNonEmptyArray(
              trimmedString,
              "phaseOutputs.assessment.requiredFields",
            ).optional(),
            primaryTaxonomyValues: uniqueNonEmptyArray(
              primaryTaxonomySchema,
              "phaseOutputs.assessment.primaryTaxonomyValues",
            ).optional(),
            operationalClassValues: uniqueNonEmptyArray(
              operationalClassSchema,
              "phaseOutputs.assessment.operationalClassValues",
            ).optional(),
          })
          .strict(),
        publication: z
          .object({
            artifact: z.literal("publication-decision.json"),
            schemaVersion: trimmedString,
            dossierArtifact: z.enum(["dossier.md", "dossier.json"]),
          })
          .strict(),
      })
      .strict(),
    semanticReview: targetInvestigateCaseManifestSemanticReviewSchema.optional(),
    replayPolicy: z
      .object({
        explicitReplayRequired: z.boolean(),
        minimumSafeProfile: z
          .object({
            updateDb: z.literal(false),
            dedicatedRequestId: z.boolean(),
            replayMustBeDeclaredInArtifacts: z.boolean(),
            includeWorkflowDebug: z
              .object({
                default: z.boolean(),
                policy: trimmedString,
                allowedOnlyWhen: z.array(trimmedString),
              })
              .strict(),
            cacheAndPurge: z
              .object({
                endpoint: trimmedString,
                acceptedIdentifiers: uniqueNonEmptyArray(
                  purgeIdentifierSchema,
                  "replayPolicy.minimumSafeProfile.cacheAndPurge.acceptedIdentifiers",
                ),
                dryRunRequiredBeforeApply: z.boolean(),
                globalPurgeAllowed: z.boolean(),
              })
              .strict(),
            nonEssentialMutationsForbidden: z.boolean(),
            forbiddenWritesDuringReplay: z.array(trimmedString),
            automaticRawArtifactVersioning: z.boolean(),
            localNamespace: trimmedString,
            declaredSurfacesOnly: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    dossier: z
      .object({
        localPathTemplate: trimmedString,
        gitIgnoredBy: trimmedString,
        retentionPolicy: trimmedString,
        sensitivity: trimmedString,
        automaticVersioning: z.boolean(),
        cleanupTool: z
          .object({
            scriptPath: relativePathSchema,
            coversNamespace: z.boolean(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    operationalReferences: z
      .object({
        docs: z.array(relativePathSchema),
        templates: z.array(relativePathSchema),
        scripts: z.array(relativePathSchema),
      })
      .strict(),
    precedence: z
      .object({
        layers: z
          .array(
            z
              .object({
                position: z.number().int().min(1).max(6),
                name: trimmedString,
                customizable: z.boolean(),
              })
              .strict(),
          )
          .min(1),
        customizablePositions: z.tuple([z.literal(4), z.literal(5), z.literal(6)]).readonly(),
      })
      .strict()
      .superRefine((value, context) => {
        const positions = value.layers.map((entry) => entry.position).sort((left, right) => left - right);
        if (positions.length !== 6 || positions.some((entry, index) => entry !== index + 1)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["layers"],
            message: "precedence.layers precisa declarar exatamente as posicoes 1..6.",
          });
        }

        const customizablePositions = value.layers
          .filter((entry) => entry.customizable)
          .map((entry) => entry.position)
          .sort((left, right) => left - right);
        if (
          customizablePositions.length !== value.customizablePositions.length ||
          customizablePositions.some((entry, index) => entry !== value.customizablePositions[index])
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customizablePositions"],
            message:
              "precedence.customizablePositions precisa coincidir com as camadas marcadas como customizaveis.",
          });
        }
      }),
    ticketPublicationPolicy: z
      .object({
        internalTicketTemplatePath: relativePathSchema,
        causalBlockSourcePath: relativePathSchema,
        mandatoryCausalBlockSources: uniqueNonEmptyArray(
          ticketSourceSchema,
          "ticketPublicationPolicy.mandatoryCausalBlockSources",
        ),
        versionedArtifactsDefault: uniqueNonEmptyArray(
          versionedArtifactSchema,
          "ticketPublicationPolicy.versionedArtifactsDefault",
        ),
        nonVersionedArtifactsDefault: uniqueStringArray(
          trimmedString,
          "ticketPublicationPolicy.nonVersionedArtifactsDefault",
        ),
        semanticAuthority: z.literal("target-project"),
        finalPublicationAuthority: z.literal("runner"),
      })
      .strict(),
  })
  .strict();

const dedupeStrings = (values: readonly string[]): string[] => {
  const unique = new Set(values.filter((value) => value.trim().length > 0));
  return [...unique];
};

const describePilotEvidenceSurface = (
  surface: z.infer<typeof targetInvestigateCasePilotManifestSchema>["evidenceSurfaces"][number],
): string => {
  const parts = [surface.notes];
  if (surface.pathPatterns?.length) {
    parts.push(`paths: ${surface.pathPatterns.join(", ")}`);
  }
  if (surface.scriptPath) {
    parts.push(`script: ${surface.scriptPath}`);
  }
  if (surface.source) {
    parts.push(`source: ${surface.source}`);
  }
  if (surface.endpoint) {
    parts.push(`endpoint: ${surface.endpoint}`);
  }
  return parts.join(" | ");
};

const normalizePilotDossierSensitivity = (
  rawSensitivity: string,
): TargetInvestigateCaseDossierSensitivity => {
  const normalized = rawSensitivity.toLowerCase();
  if (
    normalized.includes("local-only") ||
    normalized.includes("workflow_debug") ||
    normalized.includes("db_payload") ||
    normalized.includes("transcript")
  ) {
    return "confidential";
  }

  return "restricted";
};

const buildPilotEvidenceStrategies = (
  manifest: z.infer<typeof targetInvestigateCasePilotManifestSchema>,
): Array<{ id: string; kind: string; reference: string }> => {
  const strategies: Array<{ id: string; kind: string; reference: string }> = [];

  manifest.collectionStrategies.allowedQueries.forEach((entry, index) => {
    strategies.push({
      id: `allowed-query-${index + 1}`,
      kind: "query",
      reference: entry,
    });
  });

  manifest.collectionStrategies.allowedCommands.forEach((entry) => {
    strategies.push({
      id: entry.id,
      kind: entry.scriptPath ? "script" : "command",
      reference: entry.scriptPath ?? `${entry.method ?? "COMMAND"} ${entry.path ?? entry.id}`,
    });
  });

  manifest.collectionStrategies.allowedTemplates.forEach((entry, index) => {
    strategies.push({
      id: `template-${index + 1}`,
      kind: "template",
      reference: entry,
    });
  });

  return strategies;
};

const normalizePilotManifestToInternal = (
  manifest: z.infer<typeof targetInvestigateCasePilotManifestSchema>,
): TargetInvestigateCaseManifest =>
  targetInvestigateCaseManifestSchema.parse({
    contractVersion: TARGET_INVESTIGATE_CASE_CONTRACT_VERSION,
    schemaVersion: TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
    capability: TARGET_INVESTIGATE_CASE_CAPABILITY,
    entrypoint: manifest.entrypoint
      ? {
          command: manifest.entrypoint.command,
          scriptPath: manifest.entrypoint.scriptPath,
          defaultReplayMode: manifest.entrypoint.defaultReplayMode,
          defaultIncludeWorkflowDebug: manifest.entrypoint.defaultIncludeWorkflowDebug,
        }
      : undefined,
    selectors: {
      accepted: [
        "case-ref",
        ...(manifest.selectors.accepted.includes("workflow") ? ["workflow" as const] : []),
        ...(manifest.selectors.accepted.includes("requestId") ? ["request-id" as const] : []),
        ...(manifest.selectors.accepted.includes("window") ? ["window" as const] : []),
        ...(manifest.selectors.accepted.includes("symptom") ? ["symptom" as const] : []),
      ],
      required: ["case-ref"],
      targetProjectAccepted: [...manifest.selectors.accepted],
    },
    workflows: {
      investigable: manifest.investigableWorkflows.map((entry) => entry.key),
    },
    caseResolutionPolicy: {
      requireExplicitAttemptResolution:
        manifest.selectors.attemptResolution.runnerMustNotGuess ||
        manifest.caseResolution.noSilentAttemptSelection,
      allowAttemptlessCases: manifest.selectors.attemptResolution.strategy === "explicit-or-null",
      caseRefAuthorities: [...manifest.caseResolution.caseRefAuthorities],
      attemptRefAuthorities: [...manifest.caseResolution.attemptRefAuthorities],
    },
    evidenceCollection: {
      surfaces: manifest.evidenceSurfaces.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        description: describePilotEvidenceSurface(entry),
      })),
      strategies: buildPilotEvidenceStrategies(manifest),
    },
    outputs: {
      caseResolution: {
        artifactPath: manifest.phaseOutputs["case-resolution"].artifact,
        schemaVersion: TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
      },
      evidenceBundle: {
        artifactPath: manifest.phaseOutputs["evidence-collection"].artifact,
        schemaVersion: TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
      },
      assessment: {
        artifactPath: manifest.phaseOutputs.assessment.artifact,
        schemaVersion: TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
      },
      publicationDecision: {
        artifactPath: manifest.phaseOutputs.publication.artifact,
        schemaVersion: TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
      },
      dossier: {
        artifactPathPattern: "dossier.md|dossier.json",
        schemaVersion: TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
        preferredArtifact: manifest.phaseOutputs.publication.dossierArtifact,
      },
    },
    semanticReview: manifest.semanticReview
      ? {
          owner: manifest.semanticReview.owner,
          runnerExecutor: manifest.semanticReview.runnerExecutor,
          artifacts: {
            request: {
              artifact: manifest.semanticReview.artifacts.request.artifact,
              schemaVersion: manifest.semanticReview.artifacts.request.schemaVersion,
              requiredFields: [...manifest.semanticReview.artifacts.request.requiredFields],
            },
            result: {
              artifact: manifest.semanticReview.artifacts.result.artifact,
              schemaVersion: manifest.semanticReview.artifacts.result.schemaVersion,
              optionalUntilRunnerIntegration:
                manifest.semanticReview.artifacts.result.optionalUntilRunnerIntegration,
            },
          },
          packetPolicy: {
            declaredSurfacesOnly: manifest.semanticReview.packetPolicy.declaredSurfacesOnly,
            newEvidenceDiscoveryAllowed:
              manifest.semanticReview.packetPolicy.newEvidenceDiscoveryAllowed,
            allowRawPayloadEmbedding:
              manifest.semanticReview.packetPolicy.allowRawPayloadEmbedding,
            boundedByWorkflowContract:
              manifest.semanticReview.packetPolicy.boundedByWorkflowContract,
            targetProjectRemainsAssessmentAuthority:
              manifest.semanticReview.packetPolicy.targetProjectRemainsAssessmentAuthority,
            runnerRemainsPublicationAuthority:
              manifest.semanticReview.packetPolicy.runnerRemainsPublicationAuthority,
          },
          recomposition: manifest.semanticReview.recomposition
            ? {
                strategy: manifest.semanticReview.recomposition.strategy,
                roundRequestIdFlag:
                  manifest.semanticReview.recomposition.roundRequestIdFlag,
                forceFlag: manifest.semanticReview.recomposition.forceFlag,
                replayMode: manifest.semanticReview.recomposition.replayMode,
                preserveExistingDossier:
                  manifest.semanticReview.recomposition.preserveExistingDossier,
              }
            : undefined,
          symptoms: manifest.semanticReview.symptoms
            ? {
                selectedField: manifest.semanticReview.symptoms.selectedField,
                selectionField: manifest.semanticReview.symptoms.selectionField,
                candidateField: manifest.semanticReview.symptoms.candidateField,
                selectionPrecedence: [
                  ...manifest.semanticReview.symptoms.selectionPrecedence,
                ],
                minimumScopedCandidates:
                  manifest.semanticReview.symptoms.minimumScopedCandidates.map(
                    (entry) => ({
                      candidateId: entry.candidateId,
                      workflow: entry.workflow,
                      fieldPath: entry.fieldPath,
                      jsonPointer: entry.jsonPointer,
                      issueType: entry.issueType,
                      strength: entry.strength,
                    }),
                  ),
              }
            : undefined,
        }
      : undefined,
    replayPolicy: {
      supported: true,
      safeModeRequired: true,
      requireUpdateDbFalse: manifest.replayPolicy.minimumSafeProfile.updateDb === false,
      requireDedicatedRequestId: manifest.replayPolicy.minimumSafeProfile.dedicatedRequestId,
      allowWorkflowDebugWhenSafe:
        manifest.replayPolicy.minimumSafeProfile.includeWorkflowDebug.policy === "safe-only",
      cachePurgePolicy: [
        manifest.replayPolicy.minimumSafeProfile.cacheAndPurge.endpoint,
        `dryRunRequiredBeforeApply=${manifest.replayPolicy.minimumSafeProfile.cacheAndPurge.dryRunRequiredBeforeApply}`,
      ].join(" | "),
      acceptedPurgeIdentifiers: [
        ...manifest.replayPolicy.minimumSafeProfile.cacheAndPurge.acceptedIdentifiers,
      ],
    },
    dossierPolicy: {
      localPathTemplate: manifest.dossier.localPathTemplate,
      sensitivity: normalizePilotDossierSensitivity(manifest.dossier.sensitivity),
      retention: manifest.dossier.retentionPolicy,
    },
    supportingArtifacts: {
      docs: dedupeStrings([
        manifest.capability.manifestPath,
        ...manifest.operationalReferences.docs,
      ]),
      prompts: dedupeStrings(manifest.collectionStrategies.allowedTemplates),
      scripts: dedupeStrings(manifest.operationalReferences.scripts),
    },
    precedence: {
      fixedLayers: [...TARGET_INVESTIGATE_CASE_PRECEDENCE_FIXED_LAYERS],
      projectCustomizableLayers: [...TARGET_INVESTIGATE_CASE_PRECEDENCE_PROJECT_LAYERS],
    },
    publicationPolicy: {
      allowAutomaticPublication:
        manifest.ticketPublicationPolicy.finalPublicationAuthority === "runner" &&
        manifest.ticketPublicationPolicy.versionedArtifactsDefault.includes("ticket"),
      requireStrongEvidenceByDefault: true,
      allowSufficientWithNormativeConflict: true,
      requireGeneralizationBasis: true,
      requireZeroBlockingVetoes: true,
      blockedReason: null,
    },
    ticketPublicationPolicy: {
      internalTicketTemplatePath: manifest.ticketPublicationPolicy.internalTicketTemplatePath,
      causalBlockSourcePath: manifest.ticketPublicationPolicy.causalBlockSourcePath,
      mandatoryCausalBlockSources: [
        ...manifest.ticketPublicationPolicy.mandatoryCausalBlockSources,
      ],
      versionedArtifactsDefault: [
        ...manifest.ticketPublicationPolicy.versionedArtifactsDefault,
      ],
      nonVersionedArtifactsDefault: [
        ...manifest.ticketPublicationPolicy.nonVersionedArtifactsDefault,
      ],
      semanticAuthority: manifest.ticketPublicationPolicy.semanticAuthority,
      finalPublicationAuthority: manifest.ticketPublicationPolicy.finalPublicationAuthority,
    },
  });

export const normalizeTargetInvestigateCaseManifestDocument = (
  decoded: unknown,
): TargetInvestigateCaseManifest => {
  const normalized = targetInvestigateCaseManifestSchema.safeParse(decoded);
  if (normalized.success) {
    return normalized.data;
  }

  const pilot = targetInvestigateCasePilotManifestSchema.safeParse(decoded);
  if (pilot.success) {
    return normalizePilotManifestToInternal(pilot.data);
  }

  const normalizedIssues = normalized.error.issues.map((issue) => `normalized: ${issue.message}`);
  const pilotIssues = pilot.error.issues.map((issue) => `pilot: ${issue.message}`);
  throw new Error([...normalizedIssues, ...pilotIssues].join(" | "));
};

export const targetInvestigateCaseCausalSurfaceSchema = z
  .object({
    owner: causalSurfaceOwnerSchema,
    kind: causalSurfaceKindSchema,
    summary: trimmedString,
    actionable: z.boolean(),
    systems: uniqueStringArray(trimmedString, "causal-surface.systems"),
  })
  .strict();

export const targetInvestigateCaseGeneralizationBasisSchema = z
  .object({
    code: trimmedString,
    summary: trimmedString,
  })
  .strict();

export const targetInvestigateCaseOverfitVetoSchema = z
  .object({
    code: trimmedString,
    reason: trimmedString,
    blocking: z.boolean(),
  })
  .strict();

export const targetInvestigateCasePublicationRecommendationSchema = z
  .object({
    recommended_action: recommendedActionSchema,
    reason: trimmedString,
    proposed_ticket_scope: trimmedString,
    suggested_title: trimmedString,
  })
  .strict();

export const targetInvestigateCaseAssessmentNextActionSchema = z
  .object({
    code: trimmedString,
    summary: trimmedString,
    source: trimmedString,
  })
  .strict();

export const targetInvestigateCaseAssessmentBlockerSchema = z
  .object({
    code: trimmedString,
    summary: trimmedString,
    source: trimmedString,
    member: trimmedString.nullable(),
  })
  .strict();

export const targetInvestigateCaseCapabilityLimitSchema = z
  .object({
    code: trimmedString,
    summary: trimmedString,
  })
  .strict();

type ArtifactNormalizationResult<Output> =
  | {
      success: true;
      data: Output;
    }
  | {
      success: false;
      issues: z.ZodIssue[];
    };

const buildArtifactNormalizationSchema = <Output>(
  normalize: (decoded: unknown) => ArtifactNormalizationResult<Output>,
): z.ZodType<Output, z.ZodTypeDef, unknown> =>
  z.unknown().transform((decoded, context) => {
    const result = normalize(decoded);
    if (!result.success) {
      for (const issue of result.issues) {
        context.addIssue(issue);
      }
      return z.NEVER;
    }

    return result.data;
  });

const hasSchemaVersion = (decoded: unknown, schemaVersion: string): boolean =>
  typeof decoded === "object" &&
  decoded !== null &&
  "schema_version" in decoded &&
  (decoded as { schema_version?: unknown }).schema_version === schemaVersion;

const firstTrimmedString = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
};

const collectUniqueTrimmedStrings = (values: Array<unknown>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
};

const targetInvestigateCaseInternalAssessmentSchema = z
  .object({
    houve_gap_real: houveGapRealSchema,
    era_evitavel_internamente: evitabilidadeSchema,
    merece_ticket_generalizavel: generalizacaoSchema,
    confidence: confidenceSchema,
    evidence_sufficiency: evidenceSufficiencySchema,
    primary_taxonomy: primaryTaxonomySchema.nullable(),
    operational_class: operationalClassSchema.nullable(),
    next_action: targetInvestigateCaseAssessmentNextActionSchema.nullable(),
    blockers: z.array(targetInvestigateCaseAssessmentBlockerSchema),
    causal_surface: targetInvestigateCaseCausalSurfaceSchema,
    generalization_basis: z.array(targetInvestigateCaseGeneralizationBasisSchema),
    overfit_vetoes: z.array(targetInvestigateCaseOverfitVetoSchema),
    ticket_decision_reason: trimmedString,
    publication_recommendation: targetInvestigateCasePublicationRecommendationSchema,
    capability_limits: z.array(targetInvestigateCaseCapabilityLimitSchema),
  })
  .strict();

const targetInvestigateCaseLegacyAssessmentSchema = z
  .object({
    houve_gap_real: houveGapRealSchema,
    era_evitavel_internamente: evitabilidadeSchema,
    merece_ticket_generalizavel: generalizacaoSchema,
    confidence: confidenceSchema,
    evidence_sufficiency: evidenceSufficiencySchema,
    causal_surface: targetInvestigateCaseCausalSurfaceSchema,
    generalization_basis: z.array(targetInvestigateCaseGeneralizationBasisSchema),
    overfit_vetoes: z.array(targetInvestigateCaseOverfitVetoSchema),
    ticket_decision_reason: trimmedString,
    publication_recommendation: targetInvestigateCasePublicationRecommendationSchema,
  })
  .strict();

const targetInvestigateCaseRichAssessmentSchema = targetInvestigateCaseLegacyAssessmentSchema.extend({
    schema_version: z.literal("assessment_v1"),
    generated_at: trimmedString.optional(),
    primary_taxonomy: primaryTaxonomySchema.nullable().optional(),
    operational_class: operationalClassSchema.nullable().optional(),
    next_action: targetInvestigateCaseAssessmentNextActionSchema.nullable().optional(),
    blockers: z.array(targetInvestigateCaseAssessmentBlockerSchema).optional(),
    capability_limits: z.array(targetInvestigateCaseCapabilityLimitSchema).optional(),
  }).passthrough();

const normalizeTargetInvestigateCaseAssessmentDocument = (
  decoded: unknown,
): ArtifactNormalizationResult<z.infer<typeof targetInvestigateCaseInternalAssessmentSchema>> => {
  const legacy = targetInvestigateCaseLegacyAssessmentSchema.safeParse(decoded);
  if (legacy.success) {
    const normalizedLegacy = targetInvestigateCaseInternalAssessmentSchema.safeParse({
      ...legacy.data,
      primary_taxonomy: null,
      operational_class: null,
      next_action: null,
      blockers: [],
      capability_limits: [],
    });

    if (!normalizedLegacy.success) {
      return {
        success: false,
        issues: normalizedLegacy.error.issues,
      };
    }

    return {
      success: true,
      data: normalizedLegacy.data,
    };
  }

  if (!hasSchemaVersion(decoded, "assessment_v1")) {
    return {
      success: false,
      issues: legacy.error.issues,
    };
  }

  const rich = targetInvestigateCaseRichAssessmentSchema.safeParse(decoded);
  if (!rich.success) {
    return {
      success: false,
      issues: rich.error.issues,
    };
  }

  const normalized = targetInvestigateCaseInternalAssessmentSchema.safeParse({
    houve_gap_real: rich.data.houve_gap_real,
    era_evitavel_internamente: rich.data.era_evitavel_internamente,
    merece_ticket_generalizavel: rich.data.merece_ticket_generalizavel,
    confidence: rich.data.confidence,
    evidence_sufficiency: rich.data.evidence_sufficiency,
    primary_taxonomy: rich.data.primary_taxonomy ?? null,
    operational_class: rich.data.operational_class ?? null,
    next_action: rich.data.next_action ?? null,
    blockers: rich.data.blockers ?? [],
    causal_surface: rich.data.causal_surface,
    generalization_basis: rich.data.generalization_basis,
    overfit_vetoes: rich.data.overfit_vetoes,
    ticket_decision_reason: rich.data.ticket_decision_reason,
    publication_recommendation: rich.data.publication_recommendation,
    capability_limits: rich.data.capability_limits ?? [],
  });

  if (!normalized.success) {
    return {
      success: false,
      issues: normalized.error.issues,
    };
  }

  return {
    success: true,
    data: normalized.data,
  };
};

export const targetInvestigateCaseAssessmentSchema: z.ZodType<
  z.infer<typeof targetInvestigateCaseInternalAssessmentSchema>,
  z.ZodTypeDef,
  unknown
> = buildArtifactNormalizationSchema(normalizeTargetInvestigateCaseAssessmentDocument);

const targetInvestigateCaseSelectorsSchema = z
  .object({
    workflow: selectorValueSchema.optional(),
    request_id: selectorValueSchema.optional(),
    window: selectorValueSchema.optional(),
    symptom: selectorValueSchema.optional(),
  })
  .strict();

const targetInvestigateCaseAttemptResolutionSchema = z
  .object({
    status: attemptResolutionStatusSchema,
    attempt_ref: trimmedString.nullable(),
    reason: trimmedString,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "resolved" && !value.attempt_ref) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attempt_ref"],
        message: "attempt_ref e obrigatorio quando status=resolved.",
      });
    }

    if (value.status !== "resolved" && value.attempt_ref !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attempt_ref"],
        message: "attempt_ref deve ser null quando a tentativa nao foi resolvida.",
      });
    }
  });

const targetInvestigateCaseReplayDecisionSchema = z
  .object({
    status: replayDecisionStatusSchema,
    reason: trimmedString,
  })
  .strict();

const targetInvestigateCaseCaseResolutionNextStepSchema = z
  .object({
    code: trimmedString,
    summary: trimmedString,
  })
  .strict();

const targetInvestigateCaseCaseResolutionAttemptCandidatesSchema = z
  .object({
    status: trimmedString.nullable(),
    silent_selection_blocked: z.boolean().nullable(),
    selected_request_id: trimmedString.nullable(),
    candidate_request_ids: z.array(trimmedString),
    next_step: targetInvestigateCaseCaseResolutionNextStepSchema.nullable(),
  })
  .strict();

const targetInvestigateCaseCaseResolutionReplayReadinessSchema = z
  .object({
    state: replayReadinessStateSchema.nullable(),
    required: z.boolean().nullable(),
    summary: trimmedString.nullable(),
    reason_code: trimmedString.nullable(),
    blocker_codes: z.array(trimmedString),
    next_step: targetInvestigateCaseCaseResolutionNextStepSchema.nullable(),
  })
  .strict();

const targetInvestigateCaseInternalCaseResolutionSchema = z
  .object({
    case_ref: trimmedString,
    selectors: targetInvestigateCaseSelectorsSchema,
    resolved_case: z
      .object({
        ref: trimmedString,
        summary: trimmedString,
      })
      .strict(),
    attempt_resolution: targetInvestigateCaseAttemptResolutionSchema,
    relevant_workflows: uniqueArray(trimmedString, "case-resolution.relevant-workflows"),
    replay_decision: targetInvestigateCaseReplayDecisionSchema,
    attempt_candidates: targetInvestigateCaseCaseResolutionAttemptCandidatesSchema.nullable(),
    replay_readiness: targetInvestigateCaseCaseResolutionReplayReadinessSchema.nullable(),
    resolution_reason: trimmedString,
  })
  .strict();

const targetInvestigateCaseLegacyCaseResolutionSchema = z
  .object({
    case_ref: trimmedString,
    selectors: targetInvestigateCaseSelectorsSchema,
    resolved_case: z
      .object({
        ref: trimmedString,
        summary: trimmedString,
      })
      .strict(),
    attempt_resolution: targetInvestigateCaseAttemptResolutionSchema,
    relevant_workflows: uniqueArray(trimmedString, "case-resolution.relevant-workflows"),
    replay_decision: targetInvestigateCaseReplayDecisionSchema,
    resolution_reason: trimmedString,
  })
  .strict();

const targetInvestigateCaseRichSelectedSelectorsSchema = z
  .object({
    propertyId: selectorValueSchema.optional(),
    requestId: selectorValueSchema.optional(),
    workflow: selectorValueSchema.optional(),
    window: selectorValueSchema.optional(),
    runArtifact: selectorValueSchema.optional(),
  })
  .passthrough();

const targetInvestigateCaseRichCaseResolutionSchema = z
  .object({
    schema_version: z.literal("case_resolution_v1"),
    selected_selectors: targetInvestigateCaseRichSelectedSelectorsSchema,
    resolved_case: z
      .object({
        status: trimmedString,
        authority: trimmedString.nullable().optional(),
        value: trimmedString.nullable().optional(),
        request_id: trimmedString.nullable().optional(),
        run_artifact: trimmedString.nullable().optional(),
        resolution_reason: trimmedString.optional(),
      })
      .passthrough(),
    resolved_attempt: z
      .object({
        status: attemptResolutionStatusSchema,
        request_id: trimmedString.nullable().optional(),
        run_artifact: trimmedString.nullable().optional(),
        workflow: trimmedString.nullable().optional(),
        window: trimmedString.nullable().optional(),
        resolution_reason: trimmedString.optional(),
      })
      .passthrough()
      .optional(),
    historical_evidence: z
      .object({
        factual_sufficiency_reason: trimmedString.optional(),
      })
      .passthrough()
      .optional(),
    replay_decision: z
      .object({
        status: replayDecisionStatusSchema,
        reason_code: trimmedString.optional(),
        resolution_reason: trimmedString.optional(),
        factual_sufficiency_reason: trimmedString.optional(),
        replay_mode: replayModeSchema.optional(),
        request_id: trimmedString.nullable().optional(),
        local_namespace: trimmedString.nullable().optional(),
        update_db: z.boolean().nullable().optional(),
        include_workflow_debug: z.boolean().nullable().optional(),
        workflow: trimmedString.nullable().optional(),
      })
      .passthrough(),
    attempt_candidates: z
      .object({
        status: trimmedString.optional(),
        silent_selection_blocked: z.boolean().optional(),
        selected_for_historical_evidence_request_id: trimmedString.nullable().optional(),
        candidate_request_ids: z.array(trimmedString).optional(),
        next_step: targetInvestigateCaseCaseResolutionNextStepSchema.optional(),
      })
      .passthrough()
      .optional(),
    replay_readiness: z
      .object({
        state: replayReadinessStateSchema.optional(),
        required: z.boolean().optional(),
        summary: trimmedString.optional(),
        reason_code: trimmedString.optional(),
        blockers: z
          .array(
            z
              .object({
                code: trimmedString.optional(),
              })
              .passthrough(),
          )
          .optional(),
        next_step: targetInvestigateCaseCaseResolutionNextStepSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const normalizeTargetInvestigateCaseCaseResolutionDocument = (
  decoded: unknown,
): ArtifactNormalizationResult<z.infer<typeof targetInvestigateCaseInternalCaseResolutionSchema>> => {
  const legacy = targetInvestigateCaseLegacyCaseResolutionSchema.safeParse(decoded);
  if (legacy.success) {
    const normalizedLegacy = targetInvestigateCaseInternalCaseResolutionSchema.safeParse({
      ...legacy.data,
      attempt_candidates: null,
      replay_readiness: null,
    });
    if (!normalizedLegacy.success) {
      return {
        success: false,
        issues: normalizedLegacy.error.issues,
      };
    }

    return {
      success: true,
      data: normalizedLegacy.data,
    };
  }

  if (!hasSchemaVersion(decoded, "case_resolution_v1")) {
    return {
      success: false,
      issues: legacy.error.issues,
    };
  }

  const rich = targetInvestigateCaseRichCaseResolutionSchema.safeParse(decoded);
  if (!rich.success) {
    return {
      success: false,
      issues: rich.error.issues,
    };
  }

  const caseRef = firstTrimmedString(
    rich.data.resolved_case.value,
    rich.data.selected_selectors.requestId,
    rich.data.selected_selectors.propertyId,
    rich.data.selected_selectors.runArtifact,
    rich.data.resolved_case.request_id,
    rich.data.resolved_case.run_artifact,
  );
  const resolvedCaseRef = firstTrimmedString(rich.data.resolved_case.value, caseRef);
  const attemptStatus = rich.data.resolved_attempt?.status ?? "not-required";
  const attemptRef =
    attemptStatus === "resolved"
      ? firstTrimmedString(
          rich.data.resolved_attempt?.request_id,
          rich.data.resolved_attempt?.run_artifact,
        )
      : null;

  const normalized = targetInvestigateCaseInternalCaseResolutionSchema.safeParse({
    case_ref: caseRef,
    selectors: {
      workflow: rich.data.selected_selectors.workflow,
      request_id:
        rich.data.selected_selectors.requestId === caseRef
          ? undefined
          : rich.data.selected_selectors.requestId,
      window: rich.data.selected_selectors.window,
      symptom: undefined,
    },
    resolved_case: {
      ref: resolvedCaseRef,
      summary:
        firstTrimmedString(
          rich.data.resolved_case.resolution_reason,
          rich.data.replay_decision.resolution_reason,
          rich.data.historical_evidence?.factual_sufficiency_reason,
          resolvedCaseRef ? `Caso resolvido como ${resolvedCaseRef}.` : null,
        ) ?? "",
    },
    attempt_resolution: {
      status: attemptStatus,
      attempt_ref: attemptRef,
      reason:
        firstTrimmedString(
          rich.data.resolved_attempt?.resolution_reason,
          attemptStatus === "not-required"
            ? "Resolucao explicita de tentativa nao foi necessaria."
            : attemptStatus === "absent-explicitly"
              ? "A capability registrou ausencia explicita de tentativa."
              : null,
        ) ?? "",
    },
    relevant_workflows: collectUniqueTrimmedStrings([
      rich.data.selected_selectors.workflow,
      rich.data.resolved_attempt?.workflow,
      rich.data.replay_decision.workflow,
    ]),
    replay_decision: {
      status: rich.data.replay_decision.status,
      reason:
        firstTrimmedString(
          rich.data.replay_decision.resolution_reason,
          rich.data.replay_decision.factual_sufficiency_reason,
          rich.data.replay_decision.reason_code,
          "Decisao de replay registrada sem detalhamento adicional.",
        ) ?? "",
    },
    attempt_candidates: rich.data.attempt_candidates
      ? {
          status: firstTrimmedString(rich.data.attempt_candidates.status),
          silent_selection_blocked:
            rich.data.attempt_candidates.silent_selection_blocked ?? null,
          selected_request_id: firstTrimmedString(
            rich.data.attempt_candidates.selected_for_historical_evidence_request_id,
          ),
          candidate_request_ids: collectUniqueTrimmedStrings(
            rich.data.attempt_candidates.candidate_request_ids ?? [],
          ),
          next_step: rich.data.attempt_candidates.next_step
            ? {
                code: rich.data.attempt_candidates.next_step.code,
                summary: rich.data.attempt_candidates.next_step.summary,
              }
            : null,
        }
      : null,
    replay_readiness: rich.data.replay_readiness
      ? {
          state: rich.data.replay_readiness.state ?? null,
          required: rich.data.replay_readiness.required ?? null,
          summary: firstTrimmedString(rich.data.replay_readiness.summary),
          reason_code: firstTrimmedString(rich.data.replay_readiness.reason_code),
          blocker_codes: collectUniqueTrimmedStrings(
            (rich.data.replay_readiness.blockers ?? []).map((entry) => entry.code),
          ),
          next_step: rich.data.replay_readiness.next_step
            ? {
                code: rich.data.replay_readiness.next_step.code,
                summary: rich.data.replay_readiness.next_step.summary,
              }
            : null,
        }
      : null,
    resolution_reason:
      firstTrimmedString(
        rich.data.resolved_case.resolution_reason,
        rich.data.replay_decision.resolution_reason,
        rich.data.historical_evidence?.factual_sufficiency_reason,
        "A capability registrou uma resolucao de caso sem rationale adicional.",
      ) ?? "",
  });

  if (!normalized.success) {
    return {
      success: false,
      issues: normalized.error.issues,
    };
  }

  return {
    success: true,
    data: normalized.data,
  };
};

export const targetInvestigateCaseCaseResolutionSchema: z.ZodType<
  z.infer<typeof targetInvestigateCaseInternalCaseResolutionSchema>,
  z.ZodTypeDef,
  unknown
> = buildArtifactNormalizationSchema(normalizeTargetInvestigateCaseCaseResolutionDocument);

const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/iu, "sha256 deve conter 64 caracteres hexadecimais.");

export const targetInvestigateCaseNormativeConflictSchema = z
  .object({
    kind: normativeConflictKindSchema,
    summary: trimmedString,
    blocking: z.boolean(),
  })
  .strict();

const targetInvestigateCaseLegacyReplaySchema = z
  .object({
    used: z.boolean(),
    mode: replayModeSchema,
    request_id: trimmedString.nullable(),
    update_db: z.boolean().nullable(),
    include_workflow_debug: z.boolean().nullable(),
    cache_policy: trimmedString.nullable(),
    purge_policy: trimmedString.nullable(),
    namespace: trimmedString.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.used) {
      return;
    }

    if (!value.request_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["request_id"],
        message: "request_id dedicado e obrigatorio quando replay.used=true.",
      });
    }

    if (value.update_db !== false) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["update_db"],
        message: "update_db precisa ser false no replay seguro.",
      });
    }

    if (!value.cache_policy) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cache_policy"],
        message: "cache_policy e obrigatorio quando replay.used=true.",
      });
    }

    if (!value.purge_policy) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purge_policy"],
        message: "purge_policy e obrigatorio quando replay.used=true.",
      });
    }

    if (!value.namespace) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["namespace"],
        message: "namespace local separado e obrigatorio quando replay.used=true.",
      });
    }
  });

const targetInvestigateCaseLegacyEvidenceBundleSchema = z
  .object({
    collection_plan: z
      .object({
        manifest_path: z.literal(TARGET_INVESTIGATE_CASE_MANIFEST_PATH),
        strategy_ids: uniqueStringArray(trimmedString, "collection-plan.strategy-ids"),
      })
      .strict(),
    historical_sources: z
      .array(
        z
          .object({
            source_id: trimmedString,
            surface: trimmedString,
            consulted: z.boolean(),
          })
          .strict(),
      )
      .min(1),
    sensitive_artifact_refs: z
      .array(
        z
          .object({
            ref: trimmedString,
            path: relativePathSchema.optional(),
            sha256: sha256Schema.optional(),
            record_count: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1),
    replay: targetInvestigateCaseLegacyReplaySchema,
    collection_sufficiency: evidenceSufficiencySchema,
    normative_conflicts: z.array(targetInvestigateCaseNormativeConflictSchema),
    factual_sufficiency_reason: trimmedString,
  })
  .strict();

const targetInvestigateCaseRichEvidenceBundleSchema = targetInvestigateCaseLegacyEvidenceBundleSchema
  .extend({
    schema_version: z.literal("evidence_bundle_v1"),
    generated_at: trimmedString.optional(),
  })
  .passthrough();

const normalizeTargetInvestigateCaseEvidenceBundleDocument = (
  decoded: unknown,
): ArtifactNormalizationResult<z.infer<typeof targetInvestigateCaseLegacyEvidenceBundleSchema>> => {
  const legacy = targetInvestigateCaseLegacyEvidenceBundleSchema.safeParse(decoded);
  if (legacy.success) {
    return {
      success: true,
      data: legacy.data,
    };
  }

  if (!hasSchemaVersion(decoded, "evidence_bundle_v1")) {
    return {
      success: false,
      issues: legacy.error.issues,
    };
  }

  const rich = targetInvestigateCaseRichEvidenceBundleSchema.safeParse(decoded);
  if (!rich.success) {
    return {
      success: false,
      issues: rich.error.issues,
    };
  }

  const normalized = targetInvestigateCaseLegacyEvidenceBundleSchema.safeParse({
    collection_plan: rich.data.collection_plan,
    historical_sources: rich.data.historical_sources,
    sensitive_artifact_refs: rich.data.sensitive_artifact_refs,
    replay: rich.data.replay,
    collection_sufficiency: rich.data.collection_sufficiency,
    normative_conflicts: rich.data.normative_conflicts,
    factual_sufficiency_reason: rich.data.factual_sufficiency_reason,
  });

  if (!normalized.success) {
    return {
      success: false,
      issues: normalized.error.issues,
    };
  }

  return {
    success: true,
    data: normalized.data,
  };
};

export const targetInvestigateCaseEvidenceBundleSchema: z.ZodType<
  z.infer<typeof targetInvestigateCaseLegacyEvidenceBundleSchema>,
  z.ZodTypeDef,
  unknown
> = buildArtifactNormalizationSchema(normalizeTargetInvestigateCaseEvidenceBundleDocument);

export const targetInvestigateCaseDossierJsonSchema = z
  .object({
    case_ref: trimmedString,
    local_path: relativePathSchema,
    retention: trimmedString,
    summary: trimmedString,
  })
  .strict();

const targetInvestigateCaseSemanticReviewWorkflowSchema = z
  .object({
    key: trimmedString,
    support_status: trimmedString.nullable(),
    public_http_selectable: z.boolean(),
    documentation_path: relativePathSchema.nullable(),
  })
  .strict();

const targetInvestigateCaseSemanticReviewRefSchema = z
  .object({
    surface_id: trimmedString,
    ref: trimmedString,
    path: relativePathSchema,
    sha256: sha256Schema,
    record_count: z.number().int().nonnegative(),
    selection_reason: trimmedString,
    json_pointers: z.array(jsonPointerSchema),
  })
  .strict();

const targetInvestigateCaseSemanticReviewTargetFieldSchema = z
  .object({
    field_path: trimmedString,
    artifact_path: relativePathSchema,
    json_pointer: jsonPointerSchema,
    selection_reason: trimmedString,
  })
  .strict();

const targetInvestigateCaseSemanticReviewSymptomSelectionSchema = z
  .object({
    source: semanticReviewSymptomSelectionSourceSchema,
    selected_candidate_id: trimmedString.nullable(),
    selection_reason: trimmedString,
  })
  .strict();

const targetInvestigateCaseSemanticReviewSymptomCandidateSchema = z
  .object({
    candidate_id: trimmedString,
    workflow_key: trimmedString,
    surface_id: trimmedString,
    artifact_path: relativePathSchema,
    field_path: trimmedString,
    json_pointer: jsonPointerSchema,
    symptom: trimmedString,
    issue_type: semanticReviewIssueTypeSchema,
    strength: semanticReviewSymptomCandidateStrengthSchema,
    selection_reason: trimmedString,
  })
  .strict();

export const targetInvestigateCaseSemanticReviewRequestSchema = z
  .object({
    schema_version: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_SCHEMA_VERSION),
    generated_at: trimmedString,
    manifest_path: z.literal(TARGET_INVESTIGATE_CASE_MANIFEST_PATH),
    dossier_local_path: relativePathSchema,
    dossier_request_id: trimmedString.nullable(),
    workflow: targetInvestigateCaseSemanticReviewWorkflowSchema.nullable(),
    selected_selectors: z
      .record(z.string(), trimmedString)
      .superRefine((value, context) => {
        for (const key of Object.keys(value)) {
          if (!TARGET_INVESTIGATE_CASE_TARGET_PROJECT_SELECTOR_VALUES.includes(key as any)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: `selected_selectors contem chave fora da allowlist: ${key}.`,
            });
          }
        }
      }),
    symptom: trimmedString.nullable(),
    symptom_selection: targetInvestigateCaseSemanticReviewSymptomSelectionSchema
      .nullable()
      .optional()
      .default(null),
    symptom_candidates: z
      .array(targetInvestigateCaseSemanticReviewSymptomCandidateSchema)
      .max(4)
      .optional()
      .default([]),
    review_readiness: z
      .object({
        status: semanticReviewReadinessStatusSchema,
        reason_code: semanticReviewReadinessReasonCodeSchema,
        summary: trimmedString,
      })
      .strict(),
    review_scope: z
      .object({
        resolved_case_authority: caseRefAuthoritySchema.nullable(),
        resolved_attempt_authority: attemptRefAuthoritySchema.nullable(),
        resolved_attempt_status: trimmedString.nullable(),
        replay_status: replayDecisionStatusSchema.nullable(),
        replay_mode: replayModeSchema.nullable(),
        historical_sufficiency_class: evidenceSufficiencySchema.nullable(),
        evidence_sufficiency: evidenceSufficiencySchema.nullable(),
      })
      .strict(),
    prompt_contract: z
      .object({
        declared_surfaces_only: z.literal(true),
        new_evidence_discovery_allowed: z.literal(false),
        raw_payload_embedding_allowed: z.literal(false),
        final_assessment_authority: z.literal("target-project"),
        final_publication_authority: z.literal("runner"),
      })
      .strict(),
    contract_refs: z
      .object({
        workflow_documentation_path: relativePathSchema.nullable(),
      })
      .strict(),
    review_question: trimmedString,
    target_fields: z.array(targetInvestigateCaseSemanticReviewTargetFieldSchema),
    supporting_refs: z.array(targetInvestigateCaseSemanticReviewRefSchema),
    declared_signals: z
      .object({
        consulted_surfaces: z.array(trimmedString),
        warning_error_code_candidates: z.array(trimmedString),
        compare_report_signals: z
          .object({
            recommended_actions: z.array(trimmedString),
            transcript_parity_statuses: z.array(trimmedString),
            phase_step_hints: z.number().int().nonnegative(),
          })
          .strict(),
        cache_summary: z.unknown().nullable(),
        normative_conflicts: z.array(
          z
            .object({
              kind: trimmedString,
              summary: trimmedString,
              blocking: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict(),
    expected_result_artifact: z
      .object({
        artifact: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT),
        schema_version: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_SCHEMA_VERSION),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const seenCandidateIds = new Set<string>();
    value.symptom_candidates.forEach((candidate, index) => {
      if (seenCandidateIds.has(candidate.candidate_id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["symptom_candidates", index, "candidate_id"],
          message: "semantic-review request nao aceita symptom_candidates duplicados.",
        });
      }
      seenCandidateIds.add(candidate.candidate_id);
    });

    if (value.symptom_selection) {
      const selectedCandidateId = value.symptom_selection.selected_candidate_id;
      if (selectedCandidateId && !seenCandidateIds.has(selectedCandidateId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["symptom_selection", "selected_candidate_id"],
          message:
            "symptom_selection.selected_candidate_id precisa apontar para um candidate_id emitido no packet.",
        });
      }

      if (value.symptom_selection.source === "none") {
        if (value.symptom !== null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["symptom"],
            message: "symptom deve permanecer null quando symptom_selection.source=none.",
          });
        }
        if (selectedCandidateId !== null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["symptom_selection", "selected_candidate_id"],
            message:
              "symptom_selection.selected_candidate_id deve permanecer null quando nenhum sintoma foi priorizado.",
          });
        }
      } else if (value.symptom === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["symptom"],
          message:
            "symptom precisa ser nao-nulo quando symptom_selection.source prioriza um sintoma.",
        });
      }

      if (
        value.symptom_selection.source === "strong_candidate" &&
        value.symptom_selection.selected_candidate_id === null
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["symptom_selection", "selected_candidate_id"],
          message:
            "symptom_selection.source=strong_candidate exige selected_candidate_id nao nulo.",
        });
      }
    } else if (value.symptom_candidates.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["symptom_selection"],
        message:
          "symptom_selection e obrigatorio quando symptom_candidates foram emitidos no packet.",
      });
    }

    if (
      value.review_readiness.status === "ready" &&
      (value.workflow === null ||
        value.target_fields.length === 0 ||
        value.supporting_refs.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["review_readiness", "status"],
        message:
          "Packets ready de semantic-review exigem workflow, target_fields e supporting_refs.",
      });
    }
  });

export const targetInvestigateCaseSemanticReviewResultSchema = z
  .object({
    schema_version: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_SCHEMA_VERSION),
    generated_at: trimmedString,
    request_artifact: z.literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT),
    reviewer: z
      .object({
        orchestrator: trimmedString,
        reviewer_label: trimmedString,
      })
      .strict(),
    verdict: semanticReviewVerdictSchema,
    issue_type: semanticReviewIssueTypeSchema,
    confidence: confidenceSchema,
    owner_hint: causalSurfaceOwnerSchema,
    actionable: z.boolean(),
    summary: trimmedString,
    supporting_refs: z.array(targetInvestigateCaseSemanticReviewRefSchema),
    field_verdicts: z.array(
      z
        .object({
          field_path: trimmedString,
          json_pointer: jsonPointerSchema,
          verdict: semanticReviewFieldVerdictSchema,
          summary: trimmedString,
        })
        .strict(),
    ),
    constraints_acknowledged: z
      .object({
        declared_surfaces_only: z.literal(true),
        new_evidence_discovery_allowed: z.literal(false),
      })
      .strict(),
  })
  .strict();

export const targetInvestigateCaseSemanticReviewTraceSchema = z
  .object({
    status: semanticReviewTraceStatusSchema,
    request_path: relativePathSchema.nullable(),
    request_schema_version: z
      .literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_SCHEMA_VERSION)
      .nullable(),
    symptom: trimmedString.nullable(),
    symptom_selection_source: semanticReviewSymptomSelectionSourceSchema.nullable(),
    selected_candidate_id: trimmedString.nullable(),
    symptom_candidate_count: z.number().int().nonnegative(),
    review_readiness_status: semanticReviewReadinessStatusSchema.nullable(),
    review_readiness_reason_code: semanticReviewReadinessReasonCodeSchema.nullable(),
    result_path: relativePathSchema.nullable(),
    result_schema_version: z
      .literal(TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_SCHEMA_VERSION)
      .nullable(),
    verdict: semanticReviewVerdictSchema.nullable(),
    issue_type: semanticReviewIssueTypeSchema.nullable(),
    confidence: confidenceSchema.nullable(),
    failure_reason: trimmedString.nullable(),
  })
  .strict();

export interface TargetInvestigateCasePublicationCombination {
  houve_gap_real: TargetInvestigateCaseHouveGapReal;
  era_evitavel_internamente: TargetInvestigateCaseEvitabilidade;
  merece_ticket_generalizavel: TargetInvestigateCaseGeneralizacao;
  publication_status: TargetInvestigateCasePublicationStatus;
  overall_outcome: TargetInvestigateCaseOverallOutcome;
}

export const TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS: readonly TargetInvestigateCasePublicationCombination[] =
  [
    {
      houve_gap_real: "no",
      era_evitavel_internamente: "not_applicable",
      merece_ticket_generalizavel: "not_applicable",
      publication_status: "not_applicable",
      overall_outcome: "no-real-gap",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "no",
      merece_ticket_generalizavel: "not_applicable",
      publication_status: "not_eligible",
      overall_outcome: "real-gap-not-internally-avoidable",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "yes",
      merece_ticket_generalizavel: "no",
      publication_status: "not_eligible",
      overall_outcome: "real-gap-not-generalizable",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "yes",
      merece_ticket_generalizavel: "yes",
      publication_status: "eligible",
      overall_outcome: "ticket-published",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "yes",
      merece_ticket_generalizavel: "yes",
      publication_status: "blocked_by_policy",
      overall_outcome: "ticket-eligible-but-blocked-by-policy",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "yes",
      merece_ticket_generalizavel: "yes",
      publication_status: "not_eligible",
      overall_outcome: "inconclusive-case",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "yes",
      merece_ticket_generalizavel: "yes",
      publication_status: "not_applicable",
      overall_outcome: "runner-limitation",
    },
    {
      houve_gap_real: "yes",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "inconclusive",
      publication_status: "not_eligible",
      overall_outcome: "inconclusive-case",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "inconclusive",
      publication_status: "not_applicable",
      overall_outcome: "inconclusive-case",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "not_applicable",
      merece_ticket_generalizavel: "not_applicable",
      publication_status: "not_applicable",
      overall_outcome: "inconclusive-case",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "yes",
      publication_status: "eligible",
      overall_outcome: "ticket-published",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "yes",
      publication_status: "blocked_by_policy",
      overall_outcome: "ticket-eligible-but-blocked-by-policy",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "yes",
      publication_status: "not_eligible",
      overall_outcome: "inconclusive-project-capability-gap",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "yes",
      publication_status: "not_applicable",
      overall_outcome: "runner-limitation",
    },
    {
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "inconclusive",
      merece_ticket_generalizavel: "no",
      publication_status: "not_eligible",
      overall_outcome: "inconclusive-project-capability-gap",
    },
  ] as const;

export const isTargetInvestigateCasePublicationCombinationValid = (
  combination: TargetInvestigateCasePublicationCombination,
): boolean =>
  TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS.some(
    (entry) =>
      entry.houve_gap_real === combination.houve_gap_real &&
      entry.era_evitavel_internamente === combination.era_evitavel_internamente &&
      entry.merece_ticket_generalizavel === combination.merece_ticket_generalizavel &&
      entry.publication_status === combination.publication_status &&
      entry.overall_outcome === combination.overall_outcome,
  );

export const targetInvestigateCasePublicationDecisionSchema = z
  .object({
    publication_status: publicationStatusSchema,
    overall_outcome: overallOutcomeSchema,
    outcome_reason: trimmedString,
    gates_applied: z.array(trimmedString),
    blocked_gates: z.array(trimmedString),
    versioned_artifact_paths: z.array(relativePathSchema),
    ticket_path: relativePathSchema.nullable(),
    next_action: trimmedString,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.overall_outcome === "ticket-published") {
      if (!value.ticket_path) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticket_path"],
          message: "ticket_path e obrigatorio quando overall_outcome=ticket-published.",
        });
      }

      if (value.versioned_artifact_paths.length !== 1 || value.versioned_artifact_paths[0] !== value.ticket_path) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["versioned_artifact_paths"],
          message:
            "versioned_artifact_paths deve conter apenas o ticket publicado quando overall_outcome=ticket-published.",
        });
      }
    } else {
      if (value.ticket_path !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ticket_path"],
          message: "ticket_path deve ser null fora do caminho ticket-published.",
        });
      }

      if (value.versioned_artifact_paths.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["versioned_artifact_paths"],
          message: "Nao ha artefatos versionados por default quando nao ha ticket publicado.",
        });
      }
    }

    if (
      value.publication_status === "eligible" &&
      value.overall_outcome !== "ticket-published"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overall_outcome"],
        message: "publication_status=eligible so e aceito junto de overall_outcome=ticket-published.",
      });
    }

    if (
      value.publication_status === "blocked_by_policy" &&
      value.overall_outcome !== "ticket-eligible-but-blocked-by-policy"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overall_outcome"],
        message:
          "publication_status=blocked_by_policy so e aceito junto de overall_outcome=ticket-eligible-but-blocked-by-policy.",
      });
    }
  });

export const targetInvestigateCaseTracePayloadSchema = z
  .object({
    selectors: z
      .object({
        caseRef: trimmedString,
        workflow: trimmedString.nullable(),
        requestId: trimmedString.nullable(),
        window: trimmedString.nullable(),
        symptom: trimmedString.nullable(),
      })
      .strict(),
    resolved_case_ref: trimmedString,
    resolved_attempt_ref: trimmedString.nullable(),
    case_resolution: z
      .object({
        attempt_candidates_status: trimmedString.nullable(),
        selected_attempt_candidate_request_id: trimmedString.nullable(),
        attempt_candidate_request_ids: z.array(trimmedString),
        replay_readiness: targetInvestigateCaseCaseResolutionReplayReadinessSchema.nullable(),
      })
      .strict(),
    replay: z
      .object({
        used: z.boolean(),
        mode: replayModeSchema,
        requestId: trimmedString.nullable(),
        namespace: trimmedString.nullable(),
      })
      .strict(),
    evidence_refs: z
      .array(
        z
          .object({
            ref: trimmedString,
            path: relativePathSchema.nullable(),
            sha256: sha256Schema.nullable(),
            record_count: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1),
    verdicts: z
      .object({
        houve_gap_real: houveGapRealSchema,
        era_evitavel_internamente: evitabilidadeSchema,
        merece_ticket_generalizavel: generalizacaoSchema,
        confidence: confidenceSchema,
        evidence_sufficiency: evidenceSufficiencySchema,
        primary_taxonomy: primaryTaxonomySchema.nullable(),
        operational_class: operationalClassSchema.nullable(),
      })
      .strict(),
    assessment: z
      .object({
        next_action: targetInvestigateCaseAssessmentNextActionSchema.nullable(),
        blockers: z.array(targetInvestigateCaseAssessmentBlockerSchema),
        capability_limits: z.array(targetInvestigateCaseCapabilityLimitSchema),
      })
      .strict(),
    causal_surface: targetInvestigateCaseCausalSurfaceSchema,
    publication: z
      .object({
        publication_status: publicationStatusSchema,
        overall_outcome: overallOutcomeSchema,
        outcome_reason: trimmedString,
        gates_applied: z.array(trimmedString),
        blocked_gates: z.array(trimmedString),
        ticket_path: relativePathSchema.nullable(),
        next_action: trimmedString,
      })
      .strict(),
    dossier: z
      .object({
        path: relativePathSchema,
        sensitivity: dossierSensitivitySchema,
        retention: trimmedString,
      })
      .strict(),
    semantic_review: targetInvestigateCaseSemanticReviewTraceSchema,
  })
  .strict();

export const targetInvestigateCaseFinalSummarySchema = z
  .object({
    case_ref: trimmedString,
    resolved_attempt_ref: trimmedString.nullable(),
    attempt_resolution_status: attemptResolutionStatusSchema,
    attempt_candidates_status: trimmedString.nullable(),
    replay_readiness_state: replayReadinessStateSchema.nullable(),
    replay_used: z.boolean(),
    houve_gap_real: houveGapRealSchema,
    era_evitavel_internamente: evitabilidadeSchema,
    merece_ticket_generalizavel: generalizacaoSchema,
    confidence: confidenceSchema,
    evidence_sufficiency: evidenceSufficiencySchema,
    primary_taxonomy: primaryTaxonomySchema.nullable(),
    operational_class: operationalClassSchema.nullable(),
    assessment_next_action: targetInvestigateCaseAssessmentNextActionSchema.nullable(),
    blocker_codes: z.array(trimmedString),
    causal_surface: targetInvestigateCaseCausalSurfaceSchema,
    publication_status: publicationStatusSchema,
    overall_outcome: overallOutcomeSchema,
    outcome_reason: trimmedString,
    dossier_path: relativePathSchema,
    ticket_path: relativePathSchema.nullable(),
    next_action: trimmedString,
  })
  .strict();

export type TargetInvestigateCaseNormalizedInput = z.infer<
  typeof targetInvestigateCaseNormalizedInputSchema
>;
export type TargetInvestigateCaseManifest = z.infer<typeof targetInvestigateCaseManifestSchema>;
export type TargetInvestigateCaseCaseResolution = z.infer<
  typeof targetInvestigateCaseCaseResolutionSchema
>;
export type TargetInvestigateCaseEvidenceBundle = z.infer<
  typeof targetInvestigateCaseEvidenceBundleSchema
>;
export type TargetInvestigateCaseAssessment = z.infer<typeof targetInvestigateCaseAssessmentSchema>;
export type TargetInvestigateCaseSemanticReviewRequest = z.infer<
  typeof targetInvestigateCaseSemanticReviewRequestSchema
>;
export type TargetInvestigateCaseSemanticReviewResult = z.infer<
  typeof targetInvestigateCaseSemanticReviewResultSchema
>;
export type TargetInvestigateCaseSemanticReviewTrace = z.infer<
  typeof targetInvestigateCaseSemanticReviewTraceSchema
>;
export type TargetInvestigateCasePublicationDecision = z.infer<
  typeof targetInvestigateCasePublicationDecisionSchema
>;
export type TargetInvestigateCaseTracePayload = z.infer<
  typeof targetInvestigateCaseTracePayloadSchema
>;
export type TargetInvestigateCaseFinalSummary = z.infer<
  typeof targetInvestigateCaseFinalSummarySchema
>;

export interface TargetInvestigateCaseArtifactSet {
  caseResolutionPath: string;
  evidenceBundlePath: string;
  assessmentPath: string;
  dossierPath: string;
  semanticReviewRequestPath: string;
  semanticReviewResultPath: string;
  publicationDecisionPath: string;
}

export interface TargetInvestigateCaseCompletedSummary {
  targetProject: ProjectRef;
  manifestPath: string;
  roundId: string;
  roundDirectory: string;
  canonicalCommand: string;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  publicationDecision: TargetInvestigateCasePublicationDecision;
  finalSummary: TargetInvestigateCaseFinalSummary;
  tracePayload: TargetInvestigateCaseTracePayload;
  nextAction: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
}

export interface TargetInvestigateCaseCancelledSummary {
  targetProject: ProjectRef;
  roundId: string;
  roundDirectory: string;
  artifactPaths: string[];
  cancelledAtMilestone: TargetInvestigateCaseMilestone;
  nextAction: string;
  versionBoundaryState: TargetFlowVersionBoundaryState;
}

export type TargetInvestigateCaseBlockedReason =
  | "invalid-project-name"
  | "project-not-found"
  | "git-repo-missing"
  | "manifest-missing"
  | "manifest-invalid"
  | "round-preparer-unavailable"
  | "artifact-preparation-blocked";

export type TargetInvestigateCaseExecutionResult =
  | {
      status: "completed";
      summary: TargetInvestigateCaseCompletedSummary;
    }
  | {
      status: "cancelled";
      summary: TargetInvestigateCaseCancelledSummary;
    }
  | {
      status: "blocked";
      reason: TargetInvestigateCaseBlockedReason;
      message: string;
    }
  | {
      status: "failed";
      message: string;
    };

export type TargetInvestigateCaseLifecycleHooks =
  TargetFlowLifecycleHooks<TargetInvestigateCaseMilestone>;

const evidenceSufficiencyRank: Record<TargetInvestigateCaseEvidenceSufficiency, number> = {
  insufficient: 0,
  partial: 1,
  sufficient: 2,
  strong: 3,
};

export const compareTargetInvestigateCaseEvidenceSufficiency = (
  left: TargetInvestigateCaseEvidenceSufficiency,
  right: TargetInvestigateCaseEvidenceSufficiency,
): number => evidenceSufficiencyRank[left] - evidenceSufficiencyRank[right];

export const normalizeTargetInvestigateCaseRelativePath = (value: string): string =>
  value.replace(/\\/gu, "/");
