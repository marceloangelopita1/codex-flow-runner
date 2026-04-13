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
    !value.startsWith("../") &&
    !value.startsWith("..\\") &&
    !value.includes("/../") &&
    !value.includes("\\..\\"),
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

const uniqueArray = <Schema extends z.ZodTypeAny>(
  schema: Schema,
  label: string,
  minimumLength = 0,
) =>
  z
    .array(schema)
    .min(minimumLength)
    .superRefine((values, context) => {
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
  uniqueArray(schema, label, 1);

const uniqueStringArray = (schema: z.ZodType<string>, label: string) =>
  uniqueNonEmptyArray(schema, label);

const targetInvestigateCaseLineageFlexibleEntrySchema = z.union([
  trimmedString,
  z
    .record(z.string(), z.unknown())
    .refine((value) => Object.keys(value).length > 0, {
      message: "Entradas estruturadas exigem ao menos uma propriedade.",
    }),
]);

export const targetInvestigateCaseLineageSchema = z
  .array(targetInvestigateCaseLineageFlexibleEntrySchema)
  .min(1);

export const TARGET_INVESTIGATE_CASE_CONTRACT_VERSION = "1.0";
export const TARGET_INVESTIGATE_CASE_SCHEMA_VERSION = "1.0";
export const TARGET_INVESTIGATE_CASE_CAPABILITY = "case-investigation";
export const TARGET_INVESTIGATE_CASE_V2_FLOW = "target-investigate-case-v2";
export const TARGET_INVESTIGATE_CASE_V2_COMMAND = "/target_investigate_case_v2";
export const TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH =
  "docs/workflows/target-case-investigation-v2-manifest.json";
export const TARGET_INVESTIGATE_CASE_ROUNDS_DIR = "investigations";
export const TARGET_INVESTIGATE_CASE_V2_AUTHORITATIVE_ROUNDS_DIR =
  "output/case-investigation";
export const TARGET_INVESTIGATE_CASE_V2_MIRROR_ROUNDS_DIR = "investigations";
export const TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT = "evidence-index.json";
export const TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT = "case-bundle.json";
export const TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT =
  "improvement-proposal.json";
export const TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT = "ticket-proposal.json";
export const TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT =
  "publication-decision.json";
export const TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_SCHEMA_VERSION =
  "ticket_proposal_v1";
export const TARGET_INVESTIGATE_CASE_TARGET_OWNED_RESPONSE_ARTIFACTS = uniqueValues(
  [
    TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
    TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
    "diagnosis.json",
  ] as const,
  "target-investigate-case-target-owned-response-artifacts",
);

export const TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES = uniqueValues(
  ["low", "medium", "high"] as const,
  "confidence",
);
export const TARGET_INVESTIGATE_CASE_DIAGNOSIS_VERDICT_VALUES = uniqueValues(
  ["ok", "not_ok", "inconclusive"] as const,
  "diagnosis-verdict",
);
export const TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES = uniqueValues(
  ["insufficient", "partial", "sufficient", "strong"] as const,
  "evidence-sufficiency",
);
export const TARGET_INVESTIGATE_CASE_ALLOWED_V2_STAGE_VALUES = uniqueValues(
  [
    "resolve-case",
    "assemble-evidence",
    "diagnosis",
    "deep-dive",
    "improvement-proposal",
    "ticket-projection",
    "publication",
  ] as const,
  "target-investigate-case-v2-stages",
);
export const TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES = uniqueValues(
  ["preflight", "resolve-case", "assemble-evidence", "diagnosis"] as const,
  "target-investigate-case-v2-minimum-path",
);
export const TARGET_INVESTIGATE_CASE_V2_DEEP_DIVE_TRIGGER_VALUES = uniqueValues(
  [
    "causal-ambiguity",
    "low-confidence",
    "smallest-plausible-change-unclear",
  ] as const,
  "target-investigate-case-v2-deep-dive-triggers",
);
export const TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS = uniqueValues(
  [
    "Veredito",
    "Workflow avaliado",
    "Objetivo esperado",
    "O que a evidência mostra",
    "Por que o caso está ok ou não está",
    "Comportamento que precisa mudar",
    "Superfície provável de correção",
    "Próxima ação",
  ] as const,
  "diagnosis-required-sections",
);

const confidenceSchema = z.enum(TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES);
const diagnosisVerdictSchema = z.enum(TARGET_INVESTIGATE_CASE_DIAGNOSIS_VERDICT_VALUES);
const evidenceSufficiencySchema = z.enum(TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES);
const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/iu, "sha256 deve conter 64 caracteres hexadecimais.");

const normalizeTargetInvestigateCaseRelativePathValue = (value: string): string =>
  value.replace(/\\/gu, "/");

export const normalizeTargetInvestigateCaseRelativePath = (
  value: string,
): string => normalizeTargetInvestigateCaseRelativePathValue(value);

export const targetInvestigateCaseNormalizedInputSchema = z
  .object({
    projectName: trimmedString,
    caseRef: trimmedString,
    workflow: trimmedString.nullable().optional(),
    requestId: trimmedString.nullable().optional(),
    window: trimmedString.nullable().optional(),
    symptom: trimmedString.nullable().optional(),
    canonicalCommand: trimmedString,
  })
  .strict();

const manifestEntrypointSchema = z
  .object({
    command: trimmedString.optional(),
    scriptPath: relativePathSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.command && !value.scriptPath) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "entrypoint precisa declarar command, scriptPath ou ambos.",
      });
    }
  });

const targetInvestigateCaseStageNameSchema = z.enum(
  TARGET_INVESTIGATE_CASE_ALLOWED_V2_STAGE_VALUES,
);

const stageExecutionSchema = z
  .object({
    promptPath: relativePathSchema.optional(),
    entrypoint: manifestEntrypointSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.promptPath && !value.entrypoint) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cada estagio target-owned precisa declarar promptPath, entrypoint ou ambos.",
      });
    }
  });

const targetOwnedStageBaseSchema = (
  stage: (typeof TARGET_INVESTIGATE_CASE_ALLOWED_V2_STAGE_VALUES)[number],
) =>
  z
    .object({
      stage: z.literal(stage),
      owner: z.literal("target-project"),
      runnerExecutor: z.literal("codex-flow-runner"),
      promptPath: relativePathSchema.optional(),
      entrypoint: manifestEntrypointSchema.optional(),
      artifacts: uniqueNonEmptyArray(relativePathSchema, `stages.${stage}.artifacts`),
      policy: z.record(z.string(), z.unknown()).optional(),
    })
    .strict();

const buildTargetOwnedStageSchema = <ArtifactsSchema extends z.ZodTypeAny>(
  stage: (typeof TARGET_INVESTIGATE_CASE_ALLOWED_V2_STAGE_VALUES)[number],
  artifacts: ArtifactsSchema,
) =>
  targetOwnedStageBaseSchema(stage)
    .extend({
      artifacts,
    })
    .superRefine((value, context) => {
      const execution = stageExecutionSchema.safeParse({
        promptPath: value.promptPath,
        entrypoint: value.entrypoint,
      });
      if (!execution.success) {
        for (const issue of execution.error.issues) {
          context.addIssue(issue);
        }
      }

      const expectedPromptPath = `docs/workflows/target-investigate-case-v2-${stage}.md`;
      if (value.promptPath && value.promptPath !== expectedPromptPath) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["promptPath"],
          message: `promptPath precisa ser ${expectedPromptPath}.`,
        });
      }
    });

const publicationStageSchema = z
  .object({
    stage: z.literal("publication"),
    owner: z.literal("codex-flow-runner"),
    runnerExecutor: z.literal("codex-flow-runner"),
    artifacts: z.tuple([z.literal(TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT)]),
    policy: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const ticketPublicationPolicySchema = z
  .object({
    internalTicketTemplatePath: relativePathSchema,
    causalBlockSourcePath: relativePathSchema,
    mandatoryCausalBlockSources: uniqueStringArray(
      trimmedString,
      "ticketPublicationPolicy.mandatoryCausalBlockSources",
    ),
    versionedArtifactsDefault: z.tuple([z.literal("ticket")]),
    nonVersionedArtifactsDefault: uniqueStringArray(
      trimmedString,
      "ticketPublicationPolicy.nonVersionedArtifactsDefault",
    ),
    semanticAuthority: z.literal("target-project"),
    finalPublicationAuthority: z.literal("runner"),
  })
  .strict();

export const targetInvestigateCaseManifestSchema = z
  .object({
    contractVersion: z.literal(TARGET_INVESTIGATE_CASE_CONTRACT_VERSION),
    schemaVersion: z.literal(TARGET_INVESTIGATE_CASE_SCHEMA_VERSION),
    capability: z.literal(TARGET_INVESTIGATE_CASE_CAPABILITY),
    flow: z.literal(TARGET_INVESTIGATE_CASE_V2_FLOW),
    command: z.literal(TARGET_INVESTIGATE_CASE_V2_COMMAND),
    entrypoint: manifestEntrypointSchema.optional(),
    supportingArtifacts: z
      .object({
        docs: z.array(relativePathSchema),
        prompts: z.array(relativePathSchema),
        scripts: z.array(relativePathSchema),
      })
      .strict(),
    roundDirectories: z
      .object({
        authoritative: z.literal(
          `${TARGET_INVESTIGATE_CASE_V2_AUTHORITATIVE_ROUNDS_DIR}/<round-id>`,
        ),
        mirror: z.literal(`${TARGET_INVESTIGATE_CASE_V2_MIRROR_ROUNDS_DIR}/<round-id>`),
      })
      .strict(),
    minimumPath: z.tuple([
      z.literal(TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES[0]),
      z.literal(TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES[1]),
      z.literal(TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES[2]),
      z.literal(TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES[3]),
    ]),
    stages: z
      .object({
        resolveCase: buildTargetOwnedStageSchema(
          "resolve-case",
          z.tuple([z.literal("case-resolution.json")]),
        ),
        assembleEvidence: buildTargetOwnedStageSchema(
          "assemble-evidence",
          z.tuple([
            z.literal(TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT),
            z.literal(TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT),
          ]),
        ),
        diagnosis: buildTargetOwnedStageSchema(
          "diagnosis",
          z.tuple([z.literal("diagnosis.md"), z.literal("diagnosis.json")]),
        ),
        deepDive: buildTargetOwnedStageSchema(
          "deep-dive",
          z.tuple([
            z.literal("deep-dive.request.json"),
            z.literal("deep-dive.result.json"),
          ]),
        ).optional(),
        improvementProposal: buildTargetOwnedStageSchema(
          "improvement-proposal",
          z.tuple([z.literal(TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT)]),
        ).optional(),
        ticketProjection: buildTargetOwnedStageSchema(
          "ticket-projection",
          z.tuple([z.literal(TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT)]),
        ).optional(),
        publication: publicationStageSchema.optional(),
      })
      .strict(),
    publicationPolicy: z
      .object({
        semanticAuthority: z.literal("target-project"),
        finalPublicationAuthority: z.literal("runner"),
        allowAutomaticPublication: z.boolean(),
        blockedReason: trimmedString.nullable(),
      })
      .strict(),
    ticketPublicationPolicy: ticketPublicationPolicySchema.nullable().optional(),
  })
  .strict();

const readNestedUnknown = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;

const mergeRecordDefaults = (
  value: unknown,
  defaults: Record<string, unknown>,
): unknown => {
  if (value === undefined) {
    return { ...defaults };
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return {
      ...defaults,
      ...(value as Record<string, unknown>),
    };
  }

  return value;
};

const normalizeStageDocument = (
  stageValue: unknown,
  defaults: Record<string, unknown>,
): unknown => {
  const merged = mergeRecordDefaults(stageValue, defaults);
  if (typeof merged !== "object" || merged === null || Array.isArray(merged)) {
    return merged;
  }

  const mergedRecord = merged as Record<string, unknown>;
  if ("entrypoint" in mergedRecord && mergedRecord.entrypoint !== undefined) {
    mergedRecord.entrypoint = mergeRecordDefaults(mergedRecord.entrypoint, {});
  }

  return mergedRecord;
};

export const normalizeTargetInvestigateCaseManifestDocument = (
  decoded: unknown,
): TargetInvestigateCaseManifest => {
  const stagesValue = readNestedUnknown(decoded, "stages");

  return targetInvestigateCaseManifestSchema.parse({
    contractVersion:
      readNestedUnknown(decoded, "contractVersion") ?? TARGET_INVESTIGATE_CASE_CONTRACT_VERSION,
    schemaVersion:
      readNestedUnknown(decoded, "schemaVersion") ?? TARGET_INVESTIGATE_CASE_SCHEMA_VERSION,
    capability: readNestedUnknown(decoded, "capability") ?? TARGET_INVESTIGATE_CASE_CAPABILITY,
    flow: readNestedUnknown(decoded, "flow") ?? TARGET_INVESTIGATE_CASE_V2_FLOW,
    command: readNestedUnknown(decoded, "command") ?? TARGET_INVESTIGATE_CASE_V2_COMMAND,
    entrypoint:
      readNestedUnknown(decoded, "entrypoint") === undefined
        ? undefined
        : mergeRecordDefaults(readNestedUnknown(decoded, "entrypoint"), {}),
    supportingArtifacts: mergeRecordDefaults(readNestedUnknown(decoded, "supportingArtifacts"), {
      docs: [],
      prompts: [],
      scripts: [],
    }),
    roundDirectories: mergeRecordDefaults(readNestedUnknown(decoded, "roundDirectories"), {
      authoritative: `${TARGET_INVESTIGATE_CASE_V2_AUTHORITATIVE_ROUNDS_DIR}/<round-id>`,
      mirror: `${TARGET_INVESTIGATE_CASE_V2_MIRROR_ROUNDS_DIR}/<round-id>`,
    }),
    minimumPath:
      readNestedUnknown(decoded, "minimumPath") ??
      [...TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES],
    stages: {
      resolveCase: normalizeStageDocument(readNestedUnknown(stagesValue, "resolveCase"), {
        stage: "resolve-case",
        owner: "target-project",
        runnerExecutor: "codex-flow-runner",
        artifacts: ["case-resolution.json"],
        policy: {},
      }),
      assembleEvidence: normalizeStageDocument(
        readNestedUnknown(stagesValue, "assembleEvidence"),
        {
          stage: "assemble-evidence",
          owner: "target-project",
          runnerExecutor: "codex-flow-runner",
          artifacts: [
            TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
            TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
          ],
          policy: {},
        },
      ),
      diagnosis: normalizeStageDocument(readNestedUnknown(stagesValue, "diagnosis"), {
        stage: "diagnosis",
        owner: "target-project",
        runnerExecutor: "codex-flow-runner",
        artifacts: ["diagnosis.md", "diagnosis.json"],
        policy: {},
      }),
      deepDive:
        readNestedUnknown(stagesValue, "deepDive") === undefined
          ? undefined
          : normalizeStageDocument(readNestedUnknown(stagesValue, "deepDive"), {
              stage: "deep-dive",
              owner: "target-project",
              runnerExecutor: "codex-flow-runner",
              artifacts: ["deep-dive.request.json", "deep-dive.result.json"],
              policy: {},
            }),
      improvementProposal:
        readNestedUnknown(stagesValue, "improvementProposal") === undefined
          ? undefined
          : normalizeStageDocument(readNestedUnknown(stagesValue, "improvementProposal"), {
              stage: "improvement-proposal",
              owner: "target-project",
              runnerExecutor: "codex-flow-runner",
              artifacts: [TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT],
              policy: {},
            }),
      ticketProjection:
        readNestedUnknown(stagesValue, "ticketProjection") === undefined
          ? undefined
          : normalizeStageDocument(readNestedUnknown(stagesValue, "ticketProjection"), {
              stage: "ticket-projection",
              owner: "target-project",
              runnerExecutor: "codex-flow-runner",
              artifacts: [TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT],
              policy: {},
            }),
      publication:
        readNestedUnknown(stagesValue, "publication") === undefined
          ? undefined
          : normalizeStageDocument(readNestedUnknown(stagesValue, "publication"), {
              stage: "publication",
              owner: "codex-flow-runner",
              runnerExecutor: "codex-flow-runner",
              artifacts: [TARGET_INVESTIGATE_CASE_PUBLICATION_DECISION_ARTIFACT],
              policy: {},
            }),
    },
    publicationPolicy: mergeRecordDefaults(readNestedUnknown(decoded, "publicationPolicy"), {
      semanticAuthority: "target-project",
      finalPublicationAuthority: "runner",
      allowAutomaticPublication: true,
      blockedReason: null,
    }),
    ticketPublicationPolicy: readNestedUnknown(decoded, "ticketPublicationPolicy"),
  });
};

const attemptResolutionStatusSchema = z.enum([
  "resolved",
  "absent-explicitly",
  "not-required",
]);

const replayDecisionStatusSchema = z.enum([
  "required",
  "not-required",
  "used",
  "not-allowed",
  "inconclusive",
]);

const replayReadinessStateSchema = z.enum([
  "prohibited",
  "incomplete",
  "ready",
  "executed",
]);

const replayModeSchema = z.enum(["historical-only", "safe-replay", "mixed"]);

const targetInvestigateCaseSelectorsSchema = z
  .object({
    workflow: trimmedString.optional(),
    request_id: trimmedString.optional(),
    window: trimmedString.optional(),
    symptom: trimmedString.optional(),
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
    lineage: targetInvestigateCaseLineageSchema.optional(),
  })
  .strict();

const targetInvestigateCaseRichSelectedSelectorsSchema = z
  .object({
    propertyId: trimmedString.optional(),
    requestId: trimmedString.optional(),
    workflow: trimmedString.optional(),
    window: trimmedString.optional(),
    runArtifact: trimmedString.optional(),
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
      })
      .passthrough(),
    attempt_candidates: z
      .object({
        status: trimmedString.optional(),
        silent_selection_blocked: z.boolean().optional(),
        selected_for_historical_evidence_request_id: trimmedString.nullable().optional(),
        candidate_request_ids: z.array(trimmedString).optional(),
        next_step: targetInvestigateCaseCaseResolutionNextStepSchema.nullable().optional(),
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
        next_step: targetInvestigateCaseCaseResolutionNextStepSchema.nullable().optional(),
      })
      .passthrough()
      .optional(),
    lineage: targetInvestigateCaseLineageSchema.optional(),
  })
  .passthrough();

const firstTrimmedString = (...values: Array<unknown>): string | null => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const collectUniqueTrimmedStrings = (values: Array<unknown>): string[] => {
  const seen = new Set<string>();
  const collected: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    collected.push(trimmed);
  }

  return collected;
};

export const targetInvestigateCaseCaseResolutionSchema: z.ZodType<
  z.infer<typeof targetInvestigateCaseInternalCaseResolutionSchema>,
  z.ZodTypeDef,
  unknown
> = z.preprocess((decoded) => {
  const direct = targetInvestigateCaseInternalCaseResolutionSchema.safeParse(decoded);
  if (direct.success) {
    return direct.data;
  }

  const rich = targetInvestigateCaseRichCaseResolutionSchema.safeParse(decoded);
  if (!rich.success) {
    return decoded;
  }

  const caseRef =
    firstTrimmedString(
      rich.data.resolved_case.value,
      rich.data.selected_selectors.requestId,
      rich.data.selected_selectors.propertyId,
      rich.data.selected_selectors.runArtifact,
      rich.data.resolved_case.request_id,
      rich.data.resolved_case.run_artifact,
    ) ?? "";
  const resolvedCaseRef =
    firstTrimmedString(rich.data.resolved_case.value, caseRef) ?? caseRef;
  const attemptStatus = rich.data.resolved_attempt?.status ?? "not-required";

  return {
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
        ) ?? "Caso resolvido sem detalhe adicional.",
    },
    attempt_resolution: {
      status: attemptStatus,
      attempt_ref:
        attemptStatus === "resolved"
          ? firstTrimmedString(
              rich.data.resolved_attempt?.request_id,
              rich.data.resolved_attempt?.run_artifact,
            )
          : null,
      reason:
        firstTrimmedString(
          rich.data.resolved_attempt?.resolution_reason,
          attemptStatus === "not-required"
            ? "Resolucao explicita de tentativa nao foi necessaria."
            : attemptStatus === "absent-explicitly"
              ? "A capability registrou ausencia explicita de tentativa."
              : null,
        ) ?? "Tentativa resolvida sem detalhe adicional.",
    },
    relevant_workflows: collectUniqueTrimmedStrings([
      rich.data.selected_selectors.workflow,
      rich.data.resolved_attempt?.workflow,
    ]),
    replay_decision: {
      status: rich.data.replay_decision.status,
      reason:
        firstTrimmedString(
          rich.data.replay_decision.resolution_reason,
          rich.data.replay_decision.factual_sufficiency_reason,
          rich.data.replay_decision.reason_code,
        ) ?? "Decisao de replay registrada sem detalhamento adicional.",
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
          next_step: rich.data.attempt_candidates.next_step ?? null,
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
          next_step: rich.data.replay_readiness.next_step ?? null,
        }
      : null,
    resolution_reason:
      firstTrimmedString(
        rich.data.resolved_case.resolution_reason,
        rich.data.replay_decision.resolution_reason,
        rich.data.historical_evidence?.factual_sufficiency_reason,
      ) ?? "A capability registrou uma resolucao de caso sem rationale adicional.",
    lineage: rich.data.lineage,
  };
}, targetInvestigateCaseInternalCaseResolutionSchema);

export const targetInvestigateCaseNormativeConflictSchema = z
  .object({
    kind: trimmedString,
    summary: trimmedString,
    blocking: z.boolean(),
  })
  .strict();

const replaySchema = z
  .object({
    used: z.boolean(),
    mode: replayModeSchema,
    request_id: trimmedString.nullable(),
    update_db: z.boolean().nullable(),
    include_workflow_debug: z.boolean().nullable().optional(),
    cache_policy: trimmedString.nullable(),
    purge_policy: trimmedString.nullable(),
    namespace: trimmedString.nullable(),
  })
  .strict();

const targetInvestigateCaseLegacyEvidenceBundleSchema = z
  .object({
    collection_plan: z
      .object({
        manifest_path: relativePathSchema,
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
    replay: replaySchema,
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

export const targetInvestigateCaseEvidenceBundleSchema: z.ZodType<
  z.infer<typeof targetInvestigateCaseLegacyEvidenceBundleSchema>,
  z.ZodTypeDef,
  unknown
> = z.preprocess((decoded) => {
  const direct = targetInvestigateCaseLegacyEvidenceBundleSchema.safeParse(decoded);
  if (direct.success) {
    return direct.data;
  }

  const rich = targetInvestigateCaseRichEvidenceBundleSchema.safeParse(decoded);
  if (!rich.success) {
    return decoded;
  }

  return {
    collection_plan: rich.data.collection_plan,
    historical_sources: rich.data.historical_sources,
    sensitive_artifact_refs: rich.data.sensitive_artifact_refs,
    replay: rich.data.replay,
    collection_sufficiency: rich.data.collection_sufficiency,
    normative_conflicts: rich.data.normative_conflicts,
    factual_sufficiency_reason: rich.data.factual_sufficiency_reason,
  };
}, targetInvestigateCaseLegacyEvidenceBundleSchema);

const targetInvestigateCaseInternalCaseBundleSchema =
  targetInvestigateCaseLegacyEvidenceBundleSchema
    .extend({
      lineage: targetInvestigateCaseLineageSchema.optional(),
    })
    .strict();

const targetInvestigateCaseRichCaseBundleSchema = targetInvestigateCaseInternalCaseBundleSchema
  .extend({
    schema_version: z.literal("evidence_bundle_v1"),
    generated_at: trimmedString.optional(),
  })
  .passthrough();

export const targetInvestigateCaseCaseBundleSchema: z.ZodType<
  z.infer<typeof targetInvestigateCaseInternalCaseBundleSchema>,
  z.ZodTypeDef,
  unknown
> = z.preprocess((decoded) => {
  const direct = targetInvestigateCaseInternalCaseBundleSchema.safeParse(decoded);
  if (direct.success) {
    return direct.data;
  }

  const rich = targetInvestigateCaseRichCaseBundleSchema.safeParse(decoded);
  if (!rich.success) {
    return decoded;
  }

  return {
    collection_plan: rich.data.collection_plan,
    historical_sources: rich.data.historical_sources,
    sensitive_artifact_refs: rich.data.sensitive_artifact_refs,
    replay: rich.data.replay,
    collection_sufficiency: rich.data.collection_sufficiency,
    normative_conflicts: rich.data.normative_conflicts,
    factual_sufficiency_reason: rich.data.factual_sufficiency_reason,
    lineage: rich.data.lineage,
  };
}, targetInvestigateCaseInternalCaseBundleSchema);

export const targetInvestigateCaseEvidenceIndexSchema = z
  .object({
    schema_version: trimmedString,
    bundle_artifact: relativePathSchema,
    entries: z
      .array(
        z
          .object({
            id: trimmedString,
            locator: trimmedString,
            acquired_via: trimmedString,
            relevance: trimmedString,
          })
          .strict(),
      )
      .min(1),
    lineage: targetInvestigateCaseLineageSchema.optional(),
  })
  .strict();

export const targetInvestigateCaseDiagnosisSchema = z
  .object({
    schema_version: trimmedString,
    bundle_artifact: relativePathSchema,
    verdict: diagnosisVerdictSchema,
    summary: trimmedString,
    why: trimmedString,
    expected_behavior: trimmedString,
    observed_behavior: trimmedString,
    confidence: confidenceSchema,
    behavior_to_change: trimmedString,
    probable_fix_surface: uniqueStringArray(
      trimmedString,
      "diagnosis.probable_fix_surface",
    ),
    evidence_used: targetInvestigateCaseLineageSchema,
    next_action: trimmedString,
    lineage: targetInvestigateCaseLineageSchema,
  })
  .strict();

const ticketScopeSchema = z.enum(["case-specific", "generalizable"]);
const ticketSlugStrategySchema = z.enum(["case-ref-prefix", "suggested-slug-only"]);
const ticketQualityGateSchema = z.enum(["legacy", "target-ticket-quality-v1"]);

const competingHypothesisSchema = z
  .object({
    label: trimmedString,
    why_not_winner: trimmedString,
  })
  .strict();

const qaEscapeSchema = z
  .object({
    summary: trimmedString,
    why_not_caught: trimmedString,
  })
  .strict();

const promptGuardrailOpportunitySchema = z
  .object({
    summary: trimmedString,
  })
  .strict();

const ticketReadinessSchema = z
  .object({
    status: trimmedString,
    summary: trimmedString,
  })
  .strict();

const remainingGapSchema = z
  .object({
    code: trimmedString,
    summary: trimmedString,
  })
  .strict();

export const targetInvestigateCaseTicketProposalSchema = z
  .object({
    schema_version: z.literal(TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_SCHEMA_VERSION),
    generated_at: trimmedString,
    source_diagnosis_artifact: z.literal("diagnosis.json"),
    source_case_bundle_artifact: z.literal(TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT),
    source_improvement_proposal_artifact: z
      .literal(TARGET_INVESTIGATE_CASE_REMEDIATION_PROPOSAL_ARTIFACT)
      .optional(),
    recommended_action: z.literal("publish_ticket"),
    suggested_slug: trimmedString,
    suggested_title: trimmedString,
    priority: trimmedString,
    severity: trimmedString,
    summary: trimmedString,
    ticket_markdown: trimmedString,
    ticket_readiness: ticketReadinessSchema.optional(),
    competing_hypotheses: z.array(competingHypothesisSchema).optional(),
    qa_escape: qaEscapeSchema.nullable().optional(),
    prompt_guardrail_opportunities: z
      .array(promptGuardrailOpportunitySchema)
      .optional(),
    remaining_gaps: z.array(remainingGapSchema).optional(),
    publication_hints: z
      .object({
        ticket_scope: ticketScopeSchema,
        slug_strategy: ticketSlugStrategySchema,
        quality_gate: ticketQualityGateSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.publication_hints?.slug_strategy === "suggested-slug-only" &&
      value.publication_hints.ticket_scope !== "generalizable"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publication_hints", "slug_strategy"],
        message:
          "publication_hints.slug_strategy=`suggested-slug-only` exige ticket_scope=`generalizable`.",
      });
    }

    if (value.publication_hints?.quality_gate !== "target-ticket-quality-v1") {
      return;
    }

    if (!value.competing_hypotheses?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["competing_hypotheses"],
        message:
          "competing_hypotheses[] e obrigatorio quando publication_hints.quality_gate=`target-ticket-quality-v1`.",
      });
    }

    if (!value.qa_escape) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qa_escape"],
        message:
          "qa_escape e obrigatorio quando publication_hints.quality_gate=`target-ticket-quality-v1`.",
      });
    }

    if (!value.prompt_guardrail_opportunities?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["prompt_guardrail_opportunities"],
        message:
          "prompt_guardrail_opportunities[] e obrigatorio quando publication_hints.quality_gate=`target-ticket-quality-v1`.",
      });
    }

    if (!value.ticket_readiness) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ticket_readiness"],
        message:
          "ticket_readiness e obrigatorio quando publication_hints.quality_gate=`target-ticket-quality-v1`.",
      });
    }
  });

export type TargetInvestigateCasePublicationStatus =
  | "not_applicable"
  | "not_eligible"
  | "eligible"
  | "blocked_by_policy";

export type TargetInvestigateCaseOverallOutcome =
  | "no-real-gap"
  | "real-gap-not-internally-avoidable"
  | "real-gap-not-generalizable"
  | "inconclusive-case"
  | "inconclusive-project-capability-gap"
  | "runner-limitation"
  | "ticket-published"
  | "ticket-eligible-but-blocked-by-policy";

export type TargetInvestigateCaseInvestigationOutcome =
  | "no-real-gap"
  | "actionable-remediation-identified"
  | "real-gap-not-internally-avoidable"
  | "real-gap-not-generalizable"
  | "project-capability-gap"
  | "runner-limitation"
  | "inconclusive";

export type TargetInvestigateCaseTargetOwnedResponseArtifact =
  (typeof TARGET_INVESTIGATE_CASE_TARGET_OWNED_RESPONSE_ARTIFACTS)[number];

export type TargetInvestigateCaseArtifactAutomationUsability =
  | "full"
  | "degraded"
  | "unusable";

export type TargetInvestigateCaseArtifactInspectionWarningKind =
  | "artifact-missing"
  | "json-parse-failed"
  | "recommended-schema-invalid"
  | "recommended-coherence-invalid";

export interface TargetInvestigateCaseArtifactInspectionWarning {
  artifactPath: string;
  artifactLabel: TargetInvestigateCaseTargetOwnedResponseArtifact;
  kind: TargetInvestigateCaseArtifactInspectionWarningKind;
  message: string;
  automationUsability: TargetInvestigateCaseArtifactAutomationUsability;
}

export interface TargetInvestigateCaseArtifactInspectionEntry {
  artifactPath: string;
  artifactLabel: TargetInvestigateCaseTargetOwnedResponseArtifact;
  exists: boolean;
  parseableJson: boolean;
  recommendedSchemaValid: boolean;
  recognizedFields: string[];
  automationUsability: TargetInvestigateCaseArtifactAutomationUsability;
  warnings: TargetInvestigateCaseArtifactInspectionWarning[];
}

export interface TargetInvestigateCaseArtifactInspectionReport {
  artifacts: TargetInvestigateCaseArtifactInspectionEntry[];
  warnings: TargetInvestigateCaseArtifactInspectionWarning[];
  automationUsability: TargetInvestigateCaseArtifactAutomationUsability;
  hasDegradedAutomation: boolean;
}

const publicationStatusSchema = z.enum([
  "not_applicable",
  "not_eligible",
  "eligible",
  "blocked_by_policy",
]);

const overallOutcomeSchema = z.enum([
  "no-real-gap",
  "real-gap-not-internally-avoidable",
  "real-gap-not-generalizable",
  "inconclusive-case",
  "inconclusive-project-capability-gap",
  "runner-limitation",
  "ticket-published",
  "ticket-eligible-but-blocked-by-policy",
]);

const investigationOutcomeSchema = z.enum([
  "no-real-gap",
  "actionable-remediation-identified",
  "real-gap-not-internally-avoidable",
  "real-gap-not-generalizable",
  "project-capability-gap",
  "runner-limitation",
  "inconclusive",
]);

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

      if (
        value.versioned_artifact_paths.length !== 1 ||
        value.versioned_artifact_paths[0] !== value.ticket_path
      ) {
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
  });

const targetInvestigateCaseDiagnosisSurfaceSchema = z
  .object({
    verdict: diagnosisVerdictSchema,
    summary: trimmedString,
    why: trimmedString,
    expected_behavior: trimmedString,
    observed_behavior: trimmedString,
    confidence: confidenceSchema,
    behavior_to_change: trimmedString,
    probable_fix_surface: uniqueStringArray(
      trimmedString,
      "diagnosis.probable_fix_surface",
    ),
    next_action: trimmedString,
    bundle_artifact: relativePathSchema,
    diagnosis_md_path: relativePathSchema,
    diagnosis_json_path: relativePathSchema,
  })
  .strict();

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
    diagnosis: targetInvestigateCaseDiagnosisSurfaceSchema.extend({
      evidence_used: targetInvestigateCaseLineageSchema,
      lineage: targetInvestigateCaseLineageSchema,
    }),
    investigation: z
      .object({
        outcome: investigationOutcomeSchema,
        reason: trimmedString,
        remediation_proposal_path: relativePathSchema.nullable(),
      })
      .strict(),
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
    diagnosis: targetInvestigateCaseDiagnosisSurfaceSchema,
    confidence: confidenceSchema,
    investigation_outcome: investigationOutcomeSchema,
    investigation_reason: trimmedString,
    remediation_proposal_path: relativePathSchema.nullable(),
    publication_status: publicationStatusSchema,
    overall_outcome: overallOutcomeSchema,
    outcome_reason: trimmedString,
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
export type TargetInvestigateCaseCaseBundle = z.infer<
  typeof targetInvestigateCaseCaseBundleSchema
>;
export type TargetInvestigateCaseEvidenceIndex = z.infer<
  typeof targetInvestigateCaseEvidenceIndexSchema
>;
export type TargetInvestigateCaseDiagnosis = z.infer<
  typeof targetInvestigateCaseDiagnosisSchema
>;
export type TargetInvestigateCaseTicketProposal = z.infer<
  typeof targetInvestigateCaseTicketProposalSchema
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
  evidenceIndexPath: string;
  evidenceBundlePath: string;
  diagnosisJsonPath: string;
  diagnosisMdPath: string;
  remediationProposalPath: string;
  ticketProposalPath: string;
  publicationDecisionPath: string;
}

export interface TargetInvestigateCaseV2StageArtifactSet {
  caseResolutionPath: string;
  evidenceIndexPath: string;
  evidenceBundlePath: string;
  diagnosisJsonPath: string;
  diagnosisMdPath: string;
  remediationProposalPath?: string;
  ticketProposalPath?: string;
  publicationDecisionPath?: string;
}

export interface TargetInvestigateCaseCompletedSummary {
  targetProject: ProjectRef;
  manifestPath: string;
  roundId: string;
  roundDirectory: string;
  canonicalCommand: string;
  artifactPaths: TargetInvestigateCaseArtifactSet;
  realizedArtifactPaths: string[];
  publicationDecision: TargetInvestigateCasePublicationDecision;
  finalSummary: TargetInvestigateCaseFinalSummary;
  tracePayload: TargetInvestigateCaseTracePayload;
  artifactInspectionWarnings?: TargetInvestigateCaseArtifactInspectionWarning[];
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

export type TargetInvestigateCaseFailureSurface =
  | "round-materialization"
  | "round-evaluation";

export type TargetInvestigateCaseFailureKind =
  | "codex-execution-failed"
  | "artifact-validation-failed"
  | "round-evaluation-failed";

export interface TargetInvestigateCaseFailureSummary {
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
      summary?: TargetInvestigateCaseFailureSummary;
    };

export type TargetInvestigateCaseLifecycleHooks =
  TargetFlowLifecycleHooks<TargetInvestigateCaseMilestone>;

const evidenceSufficiencyRank: Record<
  z.infer<typeof evidenceSufficiencySchema>,
  number
> = {
  insufficient: 0,
  partial: 1,
  sufficient: 2,
  strong: 3,
};

export const compareTargetInvestigateCaseEvidenceSufficiency = (
  left: z.infer<typeof evidenceSufficiencySchema>,
  right: z.infer<typeof evidenceSufficiencySchema>,
): number => evidenceSufficiencyRank[left] - evidenceSufficiencyRank[right];
