import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildTargetInvestigateCaseFinalSummary,
  buildTargetInvestigateCaseTracePayload,
  ControlledTargetInvestigateCaseExecutor,
  evaluateTargetInvestigateCaseRound,
  loadTargetInvestigateCaseManifest,
  normalizeTargetInvestigateCaseInput,
  parseTargetInvestigateCaseCommand,
  renderTargetInvestigateCaseFinalSummary,
  TargetInvestigateCaseTicketPublisher,
} from "./target-investigate-case.js";
import { FileSystemTargetProjectResolver } from "../integrations/target-project-resolver.js";
import { ProjectRef } from "../types/project.js";
import {
  targetInvestigateCaseAssessmentSchema,
  targetInvestigateCaseCaseBundleSchema,
  targetInvestigateCaseCaseResolutionSchema,
  targetInvestigateCaseCausalDebugRequestSchema,
  targetInvestigateCaseCausalDebugResultSchema,
  targetInvestigateCaseDiagnosisSchema,
  targetInvestigateCaseEvidenceIndexSchema,
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseManifestSchema,
  targetInvestigateCasePublicationDecisionSchema,
  targetInvestigateCaseRootCauseReviewRequestSchema,
  targetInvestigateCaseRootCauseReviewResultSchema,
  targetInvestigateCaseSemanticReviewRequestSchema,
  targetInvestigateCaseSemanticReviewResultSchema,
  targetInvestigateCaseTicketProposalSchema,
  TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES,
  TARGET_INVESTIGATE_CASE_ALLOWED_V2_STAGE_VALUES,
  TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
  TARGET_INVESTIGATE_CASE_COMMAND,
  TARGET_INVESTIGATE_CASE_BOUNDED_OUTCOME_STATUS_VALUES,
  TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES,
  TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_CURRENT_STATE_DEFAULT_SELECTION_BASIS_VALUES,
  TARGET_INVESTIGATE_CASE_CURRENT_STATE_EXPLICIT_AUTHORITY_VALUES,
  TARGET_INVESTIGATE_CASE_CURRENT_STATE_FOCUS_AWARE_MEMBER_VALUES,
  TARGET_INVESTIGATE_CASE_CURRENT_STATE_LATEST_INELIGIBLE_POLICY_VALUES,
  TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS,
  TARGET_INVESTIGATE_CASE_DIAGNOSIS_VERDICT_VALUES,
  TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES,
  TARGET_INVESTIGATE_CASE_EVITABILIDADE_VALUES,
  TARGET_INVESTIGATE_CASE_GENERALIZACAO_VALUES,
  TARGET_INVESTIGATE_CASE_HOUVE_GAP_REAL_VALUES,
  TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  TARGET_INVESTIGATE_CASE_OPERATIONAL_CLASS_VALUES,
  TARGET_INVESTIGATE_CASE_OVERALL_OUTCOME_VALUES,
  TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_CANONICAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_EXECUTION_READINESS_VALUES,
  TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_PUBLICATION_DEPENDENCY_VALUES,
  TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_STATUS_VALUES,
  TARGET_INVESTIGATE_CASE_PRIMARY_TAXONOMY_VALUES,
  TARGET_INVESTIGATE_CASE_PUBLICATION_STATUS_VALUES,
  TARGET_INVESTIGATE_CASE_RECOMMENDED_ACTION_VALUES,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_STATUS_VALUES,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS,
  TARGET_INVESTIGATE_CASE_V2_COMMAND,
  TARGET_INVESTIGATE_CASE_V2_FLOW,
  TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
} from "../types/target-investigate-case.js";

const runnerRepoPath = fileURLToPath(new URL("../../", import.meta.url));

interface TargetRepoFixture {
  rootPath: string;
  project: ProjectRef;
  artifactPaths: {
    caseResolutionPath: string;
    evidenceIndexPath: string;
    evidenceBundlePath: string;
    assessmentPath: string;
    diagnosisJsonPath: string;
    diagnosisMdPath: string;
    dossierPath: string;
    semanticReviewRequestPath: string;
    semanticReviewResultPath: string;
    causalDebugRequestPath: string;
    causalDebugResultPath: string;
    rootCauseReviewRequestPath: string;
    rootCauseReviewResultPath: string;
    remediationProposalPath: string;
    ticketProposalPath: string;
    publicationDecisionPath: string;
  };
}

class StubTargetInvestigateCaseTicketPublisher implements TargetInvestigateCaseTicketPublisher {
  public readonly calls: Array<{ targetProject: ProjectRef; ticketPath: string }> = [];

  constructor(public readonly ticketPath = "tickets/open/2026-04-03-case-investigation-case-001.md") {}

  async publish(request: { targetProject: ProjectRef }): Promise<{ ticketPath: string }> {
    this.calls.push({
      targetProject: request.targetProject,
      ticketPath: this.ticketPath,
    });
    const absolutePath = path.join(request.targetProject.path, ...this.ticketPath.split("/"));
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, "# ticket\n", "utf8");
    return {
      ticketPath: this.ticketPath,
    };
  }
}

test("loadTargetInvestigateCaseManifest aceita o manifesto canonico e rejeita ausente/invalido/capability divergente", async () => {
  const validFixture = await createTargetRepoFixture();
  const valid = await loadTargetInvestigateCaseManifest(validFixture.project.path);
  assert.equal(valid.status, "loaded");
  assert.equal(valid.manifestPath, TARGET_INVESTIGATE_CASE_MANIFEST_PATH);

  const missingFixture = await createTargetRepoFixture();
  await fs.unlink(path.join(missingFixture.project.path, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")));
  const missing = await loadTargetInvestigateCaseManifest(missingFixture.project.path);
  assert.equal(missing.status, "missing");
  assert.match(missing.reason, /Manifesto investigativo ausente/u);

  const invalidJsonFixture = await createTargetRepoFixture();
  await fs.writeFile(
    path.join(invalidJsonFixture.project.path, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")),
    "{invalid-json\n",
    "utf8",
  );
  const invalidJson = await loadTargetInvestigateCaseManifest(invalidJsonFixture.project.path);
  assert.equal(invalidJson.status, "invalid");
  assert.match(invalidJson.reason, /JSON invalido/u);

  const invalidCapabilityFixture = await createTargetRepoFixture();
  const invalidCapabilityManifestPath = path.join(
    invalidCapabilityFixture.project.path,
    ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/"),
  );
  const invalidCapabilityManifest = JSON.parse(
    await fs.readFile(invalidCapabilityManifestPath, "utf8"),
  ) as Record<string, unknown>;
  invalidCapabilityManifest.capability = "different-capability";
  await fs.writeFile(
    invalidCapabilityManifestPath,
    `${JSON.stringify(invalidCapabilityManifest, null, 2)}\n`,
    "utf8",
  );
  const invalidCapability = await loadTargetInvestigateCaseManifest(invalidCapabilityFixture.project.path);
  assert.equal(invalidCapability.status, "invalid");
  assert.match(invalidCapability.reason, /case-investigation/u);
});

test("loadTargetInvestigateCaseManifest aceita o manifesto v2 dedicado com stages, minimumPath e namespace canonicos", async () => {
  const fixture = await createTargetRepoFixture();
  const v2ManifestPath = path.join(
    fixture.project.path,
    ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/"),
  );
  const v2Manifest = await fs.readFile(
    path.join(runnerRepoPath, ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/")),
    "utf8",
  );
  await fs.writeFile(v2ManifestPath, v2Manifest, "utf8");
  await fs.unlink(path.join(fixture.project.path, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")));

  const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path, {
    canonicalCommand: `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001`,
  });
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") {
    return;
  }

  assert.equal(loaded.manifestPath, TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH);
  assert.equal(loaded.manifest.flow, TARGET_INVESTIGATE_CASE_V2_FLOW);
  assert.equal(loaded.manifest.command, TARGET_INVESTIGATE_CASE_V2_COMMAND);
  assert.deepEqual(loaded.manifest.minimumPath, [
    ...TARGET_INVESTIGATE_CASE_ALLOWED_V2_MINIMUM_PATH_VALUES,
  ]);
  assert.equal(
    loaded.manifest.roundDirectories?.authoritative,
    "output/case-investigation/<round-id>",
  );
  assert.equal(loaded.manifest.roundDirectories?.mirror, "investigations/<round-id>");
  assert.equal(
    loaded.manifest.outputs.evidenceIndex?.artifactPath,
    TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  );
  assert.equal(
    loaded.manifest.outputs.evidenceBundle.artifactPath,
    TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
  );
  assert.equal(loaded.manifest.publicationPolicy.semanticAuthority, "target-project");
  assert.equal(loaded.manifest.publicationPolicy.finalPublicationAuthority, "runner");
  assert.deepEqual(
    [
      loaded.manifest.stages?.resolveCase.stage,
      loaded.manifest.stages?.assembleEvidence.stage,
      loaded.manifest.stages?.diagnosis.stage,
      loaded.manifest.stages?.deepDive?.stage,
      loaded.manifest.stages?.improvementProposal?.stage,
      loaded.manifest.stages?.ticketProjection?.stage,
      loaded.manifest.stages?.publication?.stage,
    ],
    [...TARGET_INVESTIGATE_CASE_ALLOWED_V2_STAGE_VALUES],
  );
});

test("loadTargetInvestigateCaseManifest rejeita manifesto v2 com stage legado fora da matriz canonica", async () => {
  const fixture = await createTargetRepoFixture();
  const v2ManifestPath = path.join(
    fixture.project.path,
    ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/"),
  );
  const v2Manifest = JSON.parse(
    await fs.readFile(
      path.join(runnerRepoPath, ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/")),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const stages = v2Manifest.stages as Record<string, Record<string, unknown>>;
  stages.resolveCase.stage = "case-resolution";
  await fs.writeFile(v2ManifestPath, `${JSON.stringify(v2Manifest, null, 2)}\n`, "utf8");
  await fs.unlink(path.join(fixture.project.path, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")));

  const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path, {
    canonicalCommand: `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001`,
  });
  assert.equal(loaded.status, "invalid");
  assert.match(loaded.reason, /resolve-case/u);
});

test("loadTargetInvestigateCaseManifest adapta o manifesto rico atual hardenizado e preserva as allowlists explicitas", async () => {
  const fixture = await createTargetRepoFixture({
    manifestDocument: buildCurrentPilotManifestFixture(),
  });

  const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path);
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") {
    return;
  }

  assert.deepEqual(loaded.manifest.selectors.targetProjectAccepted, [
    "propertyId",
    "requestId",
    "workflow",
    "window",
    "runArtifact",
    "symptom",
  ]);
  assert.deepEqual(loaded.manifest.selectors.accepted, [
    "case-ref",
    "workflow",
    "request-id",
    "window",
    "symptom",
  ]);
  assert.deepEqual(loaded.manifest.caseResolutionPolicy.caseRefAuthorities, [
    "propertyId",
    "requestId",
    "runArtifact",
  ]);
  assert.deepEqual(loaded.manifest.caseResolutionPolicy.attemptRefAuthorities, [
    "requestId",
    "runArtifact",
    "workflow+window",
  ]);
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.requiresAlignedFocus,
    false,
  );
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.defaultSelectionBasis,
    TARGET_INVESTIGATE_CASE_CURRENT_STATE_DEFAULT_SELECTION_BASIS_VALUES[0],
  );
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.divergenceRemainsObservable,
    true,
  );
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.latestIneligiblePolicy,
    TARGET_INVESTIGATE_CASE_CURRENT_STATE_LATEST_INELIGIBLE_POLICY_VALUES[0],
  );
  assert.deepEqual(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.focusAwareMembers,
    [...TARGET_INVESTIGATE_CASE_CURRENT_STATE_FOCUS_AWARE_MEMBER_VALUES],
  );
  assert.deepEqual(
    loaded.manifest.caseResolutionPolicy.currentStateSelection
      ?.acceptedExplicitAuthoritiesToBreakAmbiguity,
    [...TARGET_INVESTIGATE_CASE_CURRENT_STATE_EXPLICIT_AUTHORITY_VALUES],
  );
  assert.deepEqual(loaded.manifest.replayPolicy.acceptedPurgeIdentifiers, [
    "propertyId",
    "pdfFileName",
    "matriculaNumber",
    "transcriptHint",
  ]);
  assert.deepEqual(loaded.manifest.workflows.investigable, [
    "extract_address",
    "extract_condominium_info",
    "extract_inscricao_municipal",
    "extract_matricula_risks_v2",
    "extract_unit_description_structured_v1",
    "extract_value_timeline_v1",
    "extract_construction_timeline_v1",
  ]);
  assert.equal(loaded.manifest.entrypoint?.command, "npm run case-investigation --");
  assert.equal(
    loaded.manifest.entrypoint?.scriptPath,
    "scripts/materialize-case-investigation-round.js",
  );
  assert.equal(loaded.manifest.entrypoint?.defaultReplayMode, "historical-only");
  assert.equal(loaded.manifest.entrypoint?.defaultIncludeWorkflowDebug, false);
  assert.equal(loaded.manifest.outputs.dossier.preferredArtifact, "dossier.md");
  assert.equal(loaded.manifest.ticketPublicationPolicy?.internalTicketTemplatePath, "tickets/templates/internal-ticket-template.md");
  assert.equal(loaded.manifest.semanticReview?.owner, "target-project");
  assert.equal(loaded.manifest.semanticReview?.runnerExecutor, "codex-flow-runner");
  assert.equal(
    loaded.manifest.semanticReview?.artifacts.request.artifact,
    "semantic-review.request.json",
  );
  assert.equal(
    loaded.manifest.semanticReview?.recomposition?.strategy,
    "rerun-entrypoint",
  );
  assert.equal(
    loaded.manifest.semanticReview?.recomposition?.roundRequestIdFlag,
    "--round-request-id",
  );
  assert.equal(loaded.manifest.semanticReview?.recomposition?.forceFlag, "--force");
  assert.equal(
    loaded.manifest.semanticReview?.recomposition?.replayMode,
    "historical-only",
  );
  assert.equal(
    loaded.manifest.semanticReview?.recomposition?.preserveExistingDossier,
    true,
  );
  assert.equal(
    loaded.manifest.semanticReview?.packetPolicy.operationalErrorSurface?.workflowBinding,
    "errors[].key === workflow.key",
  );
  assert.equal(
    loaded.manifest.semanticReview?.packetPolicy.operationalErrorSurface
      ?.boundedTargetFieldPattern,
    "errors[<index>]",
  );
  assert.equal(loaded.manifest.semanticReview?.symptoms?.selectedField, "symptom");
  assert.equal(
    loaded.manifest.semanticReview?.symptoms?.derivedOperationalCandidate?.fieldPathPattern,
    "errors[<index>]",
  );
  assert.equal(
    loaded.manifest.semanticReview?.symptoms?.derivedOperationalCandidate?.jsonPointerPattern,
    "/errors/<index>",
  );
  assert.deepEqual(
    loaded.manifest.outputs.assessment.boundedOutcomeStatuses,
    [...TARGET_INVESTIGATE_CASE_BOUNDED_OUTCOME_STATUS_VALUES],
  );
  assert.deepEqual(
    loaded.manifest.outputs.assessment.primaryRemediationStatusValues,
    [...TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_STATUS_VALUES],
  );
  assert.deepEqual(
    loaded.manifest.outputs.assessment.primaryRemediationExecutionReadinessValues,
    [...TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_EXECUTION_READINESS_VALUES],
  );
  assert.deepEqual(
    loaded.manifest.outputs.assessment.primaryRemediationPublicationDependencyValues,
    [...TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_PUBLICATION_DEPENDENCY_VALUES],
  );
  assert.equal(loaded.manifest.causalDebug?.owner, "target-project");
  assert.equal(
    loaded.manifest.causalDebug?.artifacts.result.optionalFields?.[0],
    "minimal_cause.root_cause_classification",
  );
  assert.equal(
    loaded.manifest.causalDebug?.artifacts.ticketProposal.qualityGate,
    "target-ticket-quality-v1",
  );
  assert.equal(
    loaded.manifest.causalDebug?.artifacts.ticketProposal.optionalFields?.[0],
    "publication_hints.ticket_scope",
  );
  assert.deepEqual(
    loaded.manifest.causalDebug?.debugPolicy.acceptedBoundedOutcomesForReadiness,
    [
      "semantic_error",
      "workflow_operational_error",
      "semantic_operational_conflict",
    ],
  );
  assert.equal(loaded.manifest.causalDebug?.debugPolicy.narrativeLanguage, "pt-BR");
  assert.equal(loaded.manifest.rootCauseReview?.owner, "target-project");
  assert.equal(
    loaded.manifest.rootCauseReview?.artifacts.request.artifact,
    "root-cause-review.request.json",
  );
  assert.equal(loaded.manifest.rootCauseReview?.artifacts.result.optionalFields, undefined);
  assert.deepEqual(loaded.manifest.rootCauseReview?.reviewPolicy.readableSurfaces, [
    "code",
    "prompts",
    "tests",
    "docs",
    "config",
  ]);
  assert.equal(loaded.manifest.rootCauseReview?.reviewPolicy.targetProjectOwnsRootCauseDecision, true);
  assert.equal(loaded.manifest.rootCauseReview?.reviewPolicy.narrativeLanguage, "pt-BR");
  assert.equal(
    loaded.manifest.rootCauseReview?.reviewPolicy.primaryRemediationCanonicalArtifact,
    TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_CANONICAL_ARTIFACT,
  );
});

test("targetInvestigateCaseDiagnosisSchema aceita exatamente os verdicts canonicos e rejeita valores fora do conjunto", () => {
  for (const verdict of TARGET_INVESTIGATE_CASE_DIAGNOSIS_VERDICT_VALUES) {
    const parsed = targetInvestigateCaseDiagnosisSchema.parse(
      buildDiagnosisFixture("investigations/round-1/evidence-bundle.json", { verdict }),
    );
    assert.equal(parsed.verdict, verdict);
  }

  assert.throws(
    () =>
      targetInvestigateCaseDiagnosisSchema.parse(
        buildDiagnosisFixture("investigations/round-1/evidence-bundle.json", {
          verdict: "unexpected",
        }),
      ),
    /Invalid enum value|invalid_enum_value/u,
  );
});

test("evaluateTargetInvestigateCaseRound exige diagnosis.md com as secoes canonicas obrigatorias", async () => {
  const fixture = await createTargetRepoFixture();
  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
  });
  assert.equal(result.summary.diagnosis.verdict, "not_ok");
  assert.deepEqual([...TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS], [
    "Veredito",
    "Workflow avaliado",
    "Objetivo esperado",
    "O que a evidência mostra",
    "Por que o caso está ok ou não está",
    "Comportamento que precisa mudar",
    "Superfície provável de correção",
    "Próxima ação",
  ]);

  const renamedHeadingFixture = await createTargetRepoFixture({
    diagnosisMarkdown: buildDiagnosisMarkdownFixture().replace(
      "# Próxima ação",
      "# Ação seguinte",
    ),
  });
  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: renamedHeadingFixture.project,
        input: {
          projectName: renamedHeadingFixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: renamedHeadingFixture.artifactPaths,
      }),
    /diagnosis\.md precisa conter a secao obrigatoria `Próxima ação`/u,
  );

  const emptySectionFixture = await createTargetRepoFixture({
    diagnosisMarkdown: buildDiagnosisMarkdownFixture({ nextAction: "" }),
  });
  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: emptySectionFixture.project,
        input: {
          projectName: emptySectionFixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: emptySectionFixture.artifactPaths,
      }),
    /diagnosis\.md precisa preencher a secao obrigatoria `Próxima ação`/u,
  );
});

test("loadTargetInvestigateCaseManifest preserva retrocompatibilidade com currentStateSelection hardenizado legado", async () => {
  const fixture = await createTargetRepoFixture({
    manifestDocument: buildCurrentPilotManifestFixture({
      mutateManifest: (manifest) => {
        manifest.caseResolution.attemptCandidates.currentStateSelection = {
          requiresAlignedFocus: true,
          focusAwareMembers: [...TARGET_INVESTIGATE_CASE_CURRENT_STATE_FOCUS_AWARE_MEMBER_VALUES],
          acceptedExplicitAuthoritiesToBreakAmbiguity: [
            ...TARGET_INVESTIGATE_CASE_CURRENT_STATE_EXPLICIT_AUTHORITY_VALUES,
          ],
        };
      },
    }),
  });

  const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path);
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") {
    return;
  }

  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.requiresAlignedFocus,
    true,
  );
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.defaultSelectionBasis,
    undefined,
  );
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.divergenceRemainsObservable,
    undefined,
  );
  assert.equal(
    loaded.manifest.caseResolutionPolicy.currentStateSelection?.latestIneligiblePolicy,
    undefined,
  );
});

test("loadTargetInvestigateCaseManifest prioriza erros do manifesto pilot quando o documento rico atual esta invalido", async () => {
  const fixture = await createTargetRepoFixture({
    manifestDocument: buildCurrentPilotManifestFixture({
      mutateManifest: (manifest) => {
        manifest.causalDebug.debugPolicy.acceptedBoundedOutcomesForReadiness = [
          "unsupported-readiness-status",
        ];
      },
    }),
  });

  const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path);
  assert.equal(loaded.status, "invalid");
  assert.match(loaded.reason, /^pilot: /u);
  assert.match(loaded.reason, /unsupported-readiness-status/u);
  assert.doesNotMatch(loaded.reason, /normalized:/u);
});

test("loadTargetInvestigateCaseManifest preserva retrocompatibilidade com o shape pilot anterior sem entrypoint e sem preflight.artifact", async () => {
  const fixture = await createTargetRepoFixture({
    manifestDocument: buildPilotManifestFixture({
      mutateManifest: (manifest) => {
        delete manifest.entrypoint;
        delete manifest.phaseOutputs.preflight.artifact;
      },
    }),
  });

  const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path);
  assert.equal(loaded.status, "loaded");
});

test("loadTargetInvestigateCaseManifest rejeita manifesto rico com members fora das allowlists declaradas", async () => {
  const invalidSelectorFixture = await createTargetRepoFixture({
    manifestDocument: buildPilotManifestFixture({
      mutateManifest: (manifest) => {
        manifest.selectors.accepted.push("unexpected-selector");
      },
    }),
  });
  const invalidSelector = await loadTargetInvestigateCaseManifest(invalidSelectorFixture.project.path);
  assert.equal(invalidSelector.status, "invalid");
  assert.match(invalidSelector.reason, /unexpected-selector/u);

  const invalidPurgeFixture = await createTargetRepoFixture({
    manifestDocument: buildPilotManifestFixture({
      mutateManifest: (manifest) => {
        manifest.replayPolicy.minimumSafeProfile.cacheAndPurge.acceptedIdentifiers.push(
          "unexpected-id",
        );
      },
    }),
  });
  const invalidPurge = await loadTargetInvestigateCaseManifest(invalidPurgeFixture.project.path);
  assert.equal(invalidPurge.status, "invalid");
  assert.match(invalidPurge.reason, /unexpected-id/u);
});

test("schemas aceitam metadados aditivos e o contrato atual de root-cause-review sem quebrar v1", () => {
  const causalDebugRequest = targetInvestigateCaseCausalDebugRequestSchema.parse({
    schema_version: "causal_debug_request_v1",
    generated_at: "2026-04-06T17:10:00.000Z",
    manifest_path: "docs/workflows/target-case-investigation-manifest.json",
    dossier_local_path: "output/case-investigation/2026-04-06T17-10-00Z",
    workflow: {
      key: "extract_address",
      documentation_path: "docs/specs/example.md",
    },
    selected_selectors: {
      propertyId: "8555540138269",
      workflow: "extract_address",
    },
    semantic_confirmation: {
      status: "confirmed_error",
      result_verdict: "confirmed_error",
      result_issue_type: "semantic_truncation",
      summary: "fixture bounded review already confirmed the workflow error",
    },
    bounded_outcome: {
      status: "semantic_error",
      summary: "fixture bounded review isolated a semantic error without conflicting operational evidence",
      workflow_operational_signal_declared: false,
      deterministic_signal_actionable: false,
      repo_aware_escalation_eligible: false,
    },
    causal_hypothesis: {
      owner: "target-project",
      kind: "bug",
      summary: "fixture bounded signal already points to a local reusable bug",
    },
    causal_surface: {
      owner: "target-project",
      kind: "bug",
      actionable: true,
      summary: "fixture bounded signal already points to a local reusable bug",
    },
    evidence_sufficiency: "strong",
    generalization_basis: [
      {
        code: "semantic_review_confirmed_error",
        summary: "fixture bounded review already confirmed the workflow error",
      },
    ],
    debug_readiness: {
      status: "ready",
      reason_code: "READY",
      summary: "fixture repo-aware causal debug may proceed",
    },
    repo_context: {
      prompt_path: "docs/workflows/target-case-investigation-causal-debug.md",
      documentation_paths: ["docs/specs/example.md"],
      code_paths: ["src/workflows/extract-address.ts"],
      test_paths: ["src/workflows/extract-address.test.ts"],
      ticket_guidance_paths: ["tickets/templates/internal-ticket-template.md"],
    },
    extractor_stage_analysis: [
      {
        stage: "cache/versionamento",
        focus: "revisar como a superficie de cache participa do sintoma observado",
        paths: ["src/workflows/extract-address.ts"],
      },
    ],
    supporting_refs: [
      {
        ref: "src/workflows/extract-address.ts",
        path: "src/workflows/extract-address.ts",
        reason: "fixture",
      },
    ],
    debug_question: "Identify the minimum local cause for this fixture.",
    expected_result_artifact: {
      artifact: "causal-debug.result.json",
      schema_version: "causal_debug_result_v1",
    },
  });
  assert.equal(causalDebugRequest.extractor_stage_analysis?.[0]?.stage, "cache/versionamento");
  assert.equal(causalDebugRequest.bounded_outcome?.status, "semantic_error");

  const causalDebugResult = targetInvestigateCaseCausalDebugResultSchema.parse({
    schema_version: "causal_debug_result_v1",
    generated_at: "2026-04-06T17:15:00.000Z",
    request_artifact: "causal-debug.request.json",
    debugger: {
      orchestrator: "codex-flow-runner",
      prompt_path: "docs/workflows/target-case-investigation-causal-debug.md",
      debugger_label: "codex",
    },
    verdict: "minimal_cause_identified",
    confidence: "high",
    summary: "fixture causal debug enriched the local cause contract",
    minimal_cause: {
      repository_surface_kind: "code",
      summary: "fixture minimal cause",
      why_minimal: "fixture",
      suggested_fix_surface: ["src/workflows/extract-address.ts"],
      suspected_components: ["src/workflows/extract-address.ts"],
      root_cause_classification: "validation",
      preventable_stage: "after target-owned parser fix and before version-gate publication",
      remediation_scope: "local",
    },
    supporting_refs: [
      {
        path: "src/workflows/extract-address.ts",
        reason: "fixture",
      },
    ],
    stage_analysis: [
      {
        stage: "consolidacao final",
        status: "leading_signal",
        summary: "a consolidacao final preserva o melhor sinal da causa minima nesta fixture",
        suspected_paths: ["src/workflows/extract-address.ts"],
      },
    ],
    competing_hypotheses: [
      {
        stage: "cache/versionamento",
        status: "competing",
        hypothesis: "cache stale ainda influencia a resposta publicada",
        summary: "o reuso historico ainda compete, mas nao explica sozinho a consolidacao final.",
      },
    ],
    ticket_seed: {
      suggested_title: "Fix extract_address semantic truncation",
      suggested_slug: "fix-extract-address-semantic-truncation",
      scope_summary: "fix the reusable semantic bug in extract_address",
      should_open_ticket: true,
      rationale: "fixture",
      ticket_scope: "generalizable",
    },
    constraints_acknowledged: {
      repo_read_allowed: true,
      external_evidence_discovery_allowed: false,
      final_publication_authority: "runner",
    },
  });
  assert.equal(causalDebugResult.minimal_cause?.root_cause_classification, "validation");
  assert.equal(causalDebugResult.stage_analysis?.[0]?.status, "leading_signal");
  assert.equal(causalDebugResult.competing_hypotheses?.[0]?.stage, "cache/versionamento");
  assert.equal(causalDebugResult.ticket_seed.ticket_scope, "generalizable");

  const rootCauseReviewRequest = targetInvestigateCaseRootCauseReviewRequestSchema.parse(
    buildCurrentRootCauseReviewRequestFixture(),
  );
  assert.ok("source_causal_debug" in rootCauseReviewRequest);
  assert.ok("review_questions" in rootCauseReviewRequest);
  assert.ok("stage_analysis" in rootCauseReviewRequest);
  assert.equal(
    rootCauseReviewRequest.source_causal_debug?.result_artifact,
    TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
  );
  assert.equal(rootCauseReviewRequest.review_questions?.length, 5);
  assert.equal(rootCauseReviewRequest.stage_analysis?.[0]?.stage, "cache/versionamento");

  const rootCauseReviewResult = targetInvestigateCaseRootCauseReviewResultSchema.parse({
    ...buildRootCauseReviewResultFixture({
      winning_hypothesis: {
        stage: "consolidacao final",
        summary: "o valor final ainda aceita o complemento truncado",
        why_selected: "a superficie local segue explicando o erro mesmo apos revisar hipoteses concorrentes",
      },
      stage_findings: [
        {
          stage: "consolidacao final",
          status: "leading_signal",
          summary: "a consolidacao final manteve a truncacao sem guardrail",
          suspected_paths: ["src/workflows/extract-address.ts"],
        },
      ],
      competing_hypotheses: [
        {
          stage: "cache/versionamento",
          status: "competing",
          hypothesis: "cache stale v10 ainda influencia a resposta",
          summary: "o reuso historico ainda compete, mas nao explica sozinho a consolidacao final",
        },
      ],
      qa_escape: {
        summary: "o QA nao comparava a saida final contra a literalidade minima da unidade",
        why_not_caught:
          "o suite atual valida a extracao, mas nao um complemento truncado promovido como valor final.",
        prompt_clarity_or_examples:
          "o prompt principal precisa de exemplo explicito para unidade truncada em complemento.",
        qa_prompt_gap:
          "o QA nao pergunta se a saida final preserva a literalidade minima da unidade.",
        missing_guardrails_or_warnings:
          "falta um warning deterministico quando a consolidacao final reduz a unidade a um fragmento ambiguo.",
      },
      remaining_gaps: [
        {
          code: "cache-falsification-pending",
          summary: "ainda falta replay cold controlado para encerrar a disputa com cache.",
        },
      ],
      falsification_review: {
        status: "not_falsified",
        strongest_competing_hypothesis: "cache stale v10 ainda influencia a resposta",
        rationale: "a superficie local domina, mas o experimento cold ainda nao foi concluido.",
      },
      ticket_readiness: {
        status: "ready",
        reason_code: "READY",
        summary: "ha contexto suficiente para publication runner-side conservadora.",
        next_experiments: ["monitorar reruns cold apos o fix."],
      },
    }),
  });
  assert.equal(rootCauseReviewResult.root_cause_status, "root_cause_confirmed");
  assert.equal(rootCauseReviewResult.qa_escape?.qa_prompt_gap, "o QA nao pergunta se a saida final preserva a literalidade minima da unidade.");

  const ticketProposal = targetInvestigateCaseTicketProposalSchema.parse({
    ...buildTicketProposalFixture({
      source_root_cause_review_artifact: TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
      competing_hypotheses: [
        {
          stage: "cache/versionamento",
          status: "competing",
          hypothesis: "cache stale v10 ainda domina a resposta",
          summary: "o version gate ainda reaproveita envelopes antigos",
        },
      ],
      qa_escape: {
        summary: "o QA nao revisitou envelopes cacheados apos o fix local",
        why_not_caught:
          "o suite atual valida o parser, mas nao um envelope Mongo legado ainda marcado como v10.",
        prompt_clarity_or_examples:
          "explicitar exemplos de envelope legado no prompt de ticket projection.",
        qa_prompt_gap: "o QA nao exige trail explicita de invalidacao de cache.",
        missing_guardrails_or_warnings:
          "falta warning deterministico para envelopes historicos ainda ativos.",
      },
      prompt_guardrail_opportunities: [
        {
          area: "prompt_clarity_or_examples",
          summary: "explicitar a necessidade de descrever invalidacao de cache ao projetar o ticket.",
        },
        {
          area: "qa_prompt_gap",
          summary: "o QA precisa exigir trail explicita de invalidacao de cache.",
        },
      ],
      ticket_readiness: {
        status: "ready",
        reason_code: "READY",
        summary: "ha contexto suficiente para publication runner-side conservadora.",
        next_experiments: ["monitorar o purge dos envelopes antigos."],
      },
      remaining_gaps: [
        {
          code: "cache-purge-follow-up",
          summary: "confirmar a estrategia de purge dos envelopes antigos.",
        },
      ],
    }),
    ticket_markdown: [
      "# [TICKET] Fix extract_address semantic truncation",
      "",
      "## Metadata",
      "",
      "## Context",
      "",
      "## Problem statement",
      "",
      "## Observed behavior",
      "",
      "## Expected behavior",
      "",
      "## Reproduction steps",
      "",
      "1. Reexecutar o caso ancora.",
      "2. Confirmar o envelope cacheado legado.",
      "3. Validar o novo version gate.",
      "",
      "## Evidence",
      "",
      "## Impact assessment",
      "",
      "## Investigacao Causal",
      "",
      "### Resolved case",
      "### Resolved attempt",
      "### Investigation inputs",
      "### Replay used",
      "### Verdicts",
      "### Confidence and evidence sufficiency",
      "### Hypotheses considered",
      "- cache stale v10 ainda domina a resposta",
      "### QA escape",
      "- o suite atual valida o parser, mas nao um envelope Mongo legado ainda marcado como v10.",
      "### Prompt / guardrail opportunities",
      "- explicitar a necessidade de descrever invalidacao de cache ao projetar o ticket.",
      "- o QA precisa exigir trail explicita de invalidacao de cache.",
      "### Ticket readiness",
      "- ready",
      "- ha contexto suficiente para publication runner-side conservadora.",
      "- confirmar a estrategia de purge dos envelopes antigos.",
      "### Causal surface",
      "### Generalization basis",
      "### Overfit vetoes considered",
      "### Publication decision",
      "",
      "## Closure criteria",
      "",
      "## Decision log",
      "",
      "## Closure",
    ].join("\n"),
    publication_hints: {
      ticket_scope: "generalizable",
      slug_strategy: "suggested-slug-only",
      quality_gate: "target-ticket-quality-v1",
    },
  });
  assert.equal(ticketProposal.publication_hints?.slug_strategy, "suggested-slug-only");
  assert.equal(ticketProposal.ticket_readiness?.status, "ready");
  assert.equal(
    ticketProposal.qa_escape?.why_not_caught,
    "o suite atual valida o parser, mas nao um envelope Mongo legado ainda marcado como v10.",
  );

  const legacyTicketProposal = targetInvestigateCaseTicketProposalSchema.parse({
    ...buildTicketProposalFixture(),
    publication_hints: {
      ticket_scope: "case-specific",
      slug_strategy: "case-ref-prefix",
      quality_gate: "legacy",
    },
  });
  assert.equal(legacyTicketProposal.publication_hints?.ticket_scope, "case-specific");
  assert.equal(legacyTicketProposal.publication_hints?.slug_strategy, "case-ref-prefix");
  assert.equal(legacyTicketProposal.publication_hints?.quality_gate, "legacy");

  assert.throws(
    () =>
      targetInvestigateCaseTicketProposalSchema.parse({
        ...buildTicketProposalFixture(),
        publication_hints: {
          ticket_scope: "case-specific",
          slug_strategy: "suggested-slug-only",
          quality_gate: "legacy",
        },
      }),
    /ticket_scope=`generalizable`/u,
  );
});

test("targetInvestigateCaseAssessmentSchema preserva semantic_confirmation, bounded_outcome, causal_hypothesis e primary_remediation do assessment rico atual", () => {
  const assessment = targetInvestigateCaseAssessmentSchema.parse(
    buildCurrentAssessmentFixture({
      semantic_confirmation: {
        status: "conflict",
        summary:
          "bounded semantic review found expected behavior in value fields while the workflow still exposes an actionable operational error",
        request_status: "ready",
        request_reason_code: "READY",
        result_status: "valid",
        result_verdict: "expected_behavior",
        result_issue_type: null,
        publication_blocked: false,
      },
      bounded_outcome: {
        status: "semantic_operational_conflict",
        summary:
          "the bounded packet preserved a top-level operational workflow error even though the semantic subtree looked acceptable",
        workflow_operational_signal_declared: true,
        deterministic_signal_actionable: true,
        repo_aware_escalation_eligible: true,
      },
      causal_hypothesis: {
        owner: "target-project",
        kind: "contract-conflict",
        summary:
          "the smallest current hypothesis is a bounded conflict between semantic acceptance and declared workflow error",
        actionable: true,
        systems: ["case-investigation", "extract_address"],
      },
      causal_surface: {
        owner: "target-project",
        kind: "contract-conflict",
        summary:
          "the integrated causal surface remains a bounded conflict between semantic acceptance and operational workflow error",
        actionable: true,
        systems: ["case-investigation", "extract_address"],
      },
      publication_recommendation: {
        recommended_action: "do_not_publish",
        reason: "the target still needs repo-aware debugging before any ticket publication",
        proposed_ticket_scope: "hold publication until the repo-aware conflict is resolved",
        suggested_title: "Do not publish extract_address ticket yet",
      },
      ticket_projection: null,
      primary_remediation: buildPrimaryRemediationFixture({
        status: "candidate",
        execution_readiness: "needs_more_evidence",
        publication_dependency: "publication_only",
        source: "root_cause_review",
        summary: "a primary remediation candidate exists, but it still depends on more evidence",
        rationale:
          "the repo-aware review isolated a candidate remediation, but publication should stay blocked until the remaining falsification finishes",
        stage: "consolidacao final",
        follow_ups: [
          {
            summary: "finish the remaining falsification before publication",
            scope: "publication_only",
          },
        ],
      }),
      causal_debug: {
        status: "pending_runner_materialization",
        summary: "repo-aware causal debug still needs runner-side materialization",
        request_status: "ready",
        request_reason_code: "READY",
        result_status: "missing",
        result_verdict: null,
        publication_blocked: true,
      },
    }),
  );

  assert.equal(assessment.semantic_confirmation?.status, "conflict");
  assert.equal(assessment.bounded_outcome?.status, "semantic_operational_conflict");
  assert.equal(assessment.bounded_outcome?.repo_aware_escalation_eligible, true);
  assert.equal(assessment.causal_hypothesis?.kind, "contract-conflict");
  assert.equal(assessment.primary_remediation?.status, "candidate");
  assert.equal(assessment.primary_remediation?.publication_dependency, "publication_only");
});

test("targetInvestigateCaseSemanticReviewRequestSchema aceita target_fields operacionais em /errors/<index>", () => {
  const request = targetInvestigateCaseSemanticReviewRequestSchema.parse(
    buildSemanticReviewRequestFixture({
      workflow: {
        key: "extract_address",
        support_status: "supported",
        public_http_selectable: true,
        documentation_path: "docs/specs/example.md",
      },
      selected_selectors: {
        requestId: "req-001",
        workflow: "extract_address",
        symptom: "workflow extract_address still reports top-level error address_mismatch",
      },
      symptom:
        "workflow extract_address still reports top-level error address_mismatch",
      symptom_selection: {
        source: "strong_candidate",
        selected_candidate_id:
          "extract_address_top_level_operational_error_address_mismatch_entry_0",
        selection_reason:
          "the target project promoted the bounded operational error as the strongest current symptom",
      },
      symptom_candidates: [
        {
          candidate_id:
            "extract_address_top_level_operational_error_address_mismatch_entry_0",
          workflow_key: "extract_address",
          surface_id: "local-run-bundle",
          artifact_path: "investigations/round-1/semantic-source.json",
          field_path: "errors[0]",
          json_pointer: "/errors/0",
          symptom:
            "workflow extract_address still reports top-level error address_mismatch",
          issue_type: "contract_mismatch",
          strength: "strong",
          selection_reason:
            "the top-level workflow error remained explicitly declared in the bounded packet",
        },
      ],
      target_fields: [
        {
          field_path: "errors",
          artifact_path: "investigations/round-1/semantic-source.json",
          json_pointer: "/errors",
          selection_reason:
            "top-level bounded errors array remained in scope because it still contains an entry for the selected workflow",
        },
        {
          field_path: "errors[0]",
          artifact_path: "investigations/round-1/semantic-source.json",
          json_pointer: "/errors/0",
          selection_reason:
            "bounded top-level workflow error entry filtered by errors[0].key === \"extract_address\"",
        },
      ],
      supporting_refs: [
        {
          surface_id: "local-run-bundle",
          ref: "local-run-bundle:response",
          path: "investigations/round-1/semantic-source.json",
          sha256: "a".repeat(64),
          record_count: 1,
          selection_reason: "observed workflow response with bounded top-level errors",
          json_pointers: ["/errors", "/errors/0"],
        },
      ],
    }),
  );

  assert.equal(request.target_fields[1]?.field_path, "errors[0]");
  assert.equal(request.target_fields[1]?.json_pointer, "/errors/0");
  assert.equal(request.symptom_candidates[0]?.field_path, "errors[0]");
});

test("parseTargetInvestigateCaseCommand normaliza o contrato canonico e rejeita flags fora da allowlist", () => {
  const command = `${TARGET_INVESTIGATE_CASE_COMMAND} alpha-project case-001 --workflow billing-core --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`;
  const parsed = parseTargetInvestigateCaseCommand(command);
  const normalized = normalizeTargetInvestigateCaseInput({
    projectName: "alpha-project",
    caseRef: "case-001",
    workflow: "billing-core",
    requestId: "req-001",
    window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
    symptom: "timeout on save",
  });

  assert.deepEqual(parsed, normalized);
  assert.equal(
    parsed.canonicalCommand,
    `${TARGET_INVESTIGATE_CASE_COMMAND} alpha-project case-001 --workflow billing-core --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`,
  );

  assert.throws(
    () =>
      parseTargetInvestigateCaseCommand(
        `${TARGET_INVESTIGATE_CASE_COMMAND} alpha-project case-001 --unexpected nope`,
      ),
    /fora do contrato canonico/u,
  );
});

test("parseTargetInvestigateCaseCommand aceita o comando explicito v2 preservando o canonicalCommand recebido", () => {
  const command = `${TARGET_INVESTIGATE_CASE_V2_COMMAND} alpha-project case-001 --workflow billing-core --request-id req-001`;
  const parsed = parseTargetInvestigateCaseCommand(command);

  assert.equal(parsed.projectName, "alpha-project");
  assert.equal(parsed.caseRef, "case-001");
  assert.equal(parsed.workflow, "billing-core");
  assert.equal(parsed.requestId, "req-001");
  assert.equal(parsed.canonicalCommand, command);
});

test("assessment.json, publication-decision.json e root-cause-review.result.json cobrem todos os enums explicitos e rejeitam valores fora do conjunto", () => {
  const baseAssessment = buildAssessmentFixture();
  for (const value of TARGET_INVESTIGATE_CASE_HOUVE_GAP_REAL_VALUES) {
    const nextAssessment = structuredClone(baseAssessment);
    nextAssessment.houve_gap_real = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_EVITABILIDADE_VALUES) {
    const nextAssessment = structuredClone(baseAssessment);
    nextAssessment.era_evitavel_internamente = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_GENERALIZACAO_VALUES) {
    const nextAssessment = structuredClone(baseAssessment);
    nextAssessment.merece_ticket_generalizavel = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES) {
    const nextAssessment = structuredClone(baseAssessment);
    nextAssessment.confidence = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES) {
    const nextAssessment = structuredClone(baseAssessment);
    nextAssessment.evidence_sufficiency = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_RECOMMENDED_ACTION_VALUES) {
    const nextAssessment = structuredClone(baseAssessment);
    nextAssessment.publication_recommendation.recommended_action = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_ROOT_CAUSE_STATUS_VALUES) {
    const nextResult = buildRootCauseReviewResultFixture({
      root_cause_status: value,
    });
    targetInvestigateCaseRootCauseReviewResultSchema.parse(nextResult);
  }

  const richAssessment = buildCurrentAssessmentFixture();
  for (const value of TARGET_INVESTIGATE_CASE_PRIMARY_TAXONOMY_VALUES) {
    const nextAssessment = structuredClone(richAssessment);
    nextAssessment.primary_taxonomy = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_OPERATIONAL_CLASS_VALUES) {
    const nextAssessment = structuredClone(richAssessment);
    nextAssessment.operational_class = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_STATUS_VALUES) {
    const nextAssessment = structuredClone(richAssessment);
    nextAssessment.primary_remediation.status = value;
    if (value === "not_available") {
      nextAssessment.primary_remediation.suggested_fix_surface = [];
    }
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_EXECUTION_READINESS_VALUES) {
    const nextAssessment = structuredClone(richAssessment);
    nextAssessment.primary_remediation.execution_readiness = value;
    if (value === "blocked") {
      nextAssessment.primary_remediation.status = "candidate";
    }
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }
  for (const value of TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_PUBLICATION_DEPENDENCY_VALUES) {
    const nextAssessment = structuredClone(richAssessment);
    nextAssessment.primary_remediation.publication_dependency = value;
    targetInvestigateCaseAssessmentSchema.parse(nextAssessment);
  }

  assert.throws(
    () =>
      targetInvestigateCaseAssessmentSchema.parse({
        ...baseAssessment,
        confidence: "unexpected",
      }),
    /Invalid enum value/u,
  );
  assert.throws(
    () =>
      targetInvestigateCaseRootCauseReviewResultSchema.parse({
        ...buildRootCauseReviewResultFixture(),
        root_cause_status: "unexpected",
      }),
    /Invalid enum value/u,
  );

  const observedStatuses = new Set(
    TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS.map((entry) => entry.publication_status),
  );
  const observedOutcomes = new Set(
    TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS.map((entry) => entry.overall_outcome),
  );
  assert.deepEqual(
    new Set(TARGET_INVESTIGATE_CASE_PUBLICATION_STATUS_VALUES),
    observedStatuses,
  );
  assert.deepEqual(new Set(TARGET_INVESTIGATE_CASE_OVERALL_OUTCOME_VALUES), observedOutcomes);

  for (const combination of TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS) {
    const decision = buildPublicationDecisionFixture(combination.publication_status, combination.overall_outcome);
    targetInvestigateCasePublicationDecisionSchema.parse(decision);
  }

  assert.throws(
    () =>
      targetInvestigateCasePublicationDecisionSchema.parse({
        ...buildPublicationDecisionFixture("eligible", "ticket-published"),
        publication_status: "unexpected",
      }),
    /Invalid enum value/u,
  );
  assert.throws(
    () =>
      targetInvestigateCasePublicationDecisionSchema.parse({
        ...buildPublicationDecisionFixture("eligible", "ticket-published"),
        overall_outcome: "unexpected",
      }),
    /Invalid enum value/u,
  );
});

test("semantic-review.request.json aceita symptom_selection e symptom_candidates mantendo retrocompatibilidade legada", () => {
  const currentPacket = buildSemanticReviewRequestFixture({
    symptom: "complemento truncado como apartamento n",
    symptom_selection: {
      source: "strong_candidate",
      selected_candidate_id:
        "extract_address_current_complemento_semantic_truncation_apartamento_n",
      selection_reason:
        "the packet promoted the only bounded strong symptom candidate because the operator did not provide a symptom",
    },
    symptom_candidates: [
      {
        candidate_id: "extract_address_current_complemento_semantic_truncation_apartamento_n",
        workflow_key: "extract_address",
        surface_id: "local-run-bundle",
        artifact_path: "output/local-runs/hist-case/main.response.json",
        field_path: "extract_address.value.current.complemento",
        json_pointer: "/extract_address/value/current/complemento",
        symptom: "complemento truncado como apartamento n",
        issue_type: "semantic_truncation",
        strength: "strong",
        selection_reason:
          'the observed workflow response still carries the bounded complemento literal "apartamento n", which strongly suggests semantic truncation of the apartment identifier',
      },
    ],
  });

  const parsedCurrent = targetInvestigateCaseSemanticReviewRequestSchema.parse(currentPacket);
  assert.equal(parsedCurrent.symptom_selection?.source, "strong_candidate");
  assert.equal(parsedCurrent.symptom_candidates.length, 1);

  const legacyPacket = buildSemanticReviewRequestFixture();
  delete legacyPacket.symptom_selection;
  delete legacyPacket.symptom_candidates;

  const parsedLegacy = targetInvestigateCaseSemanticReviewRequestSchema.parse(legacyPacket);
  assert.equal(parsedLegacy.symptom_selection, null);
  assert.deepEqual(parsedLegacy.symptom_candidates, []);
});

test("evaluateTargetInvestigateCaseRound falha explicitamente quando o packet ready ainda espera semantic-review.result.json", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
      manifest.workflows = {
        investigable: ["extract_address"],
      };
    },
    caseResolutionDocument: buildCurrentCaseResolutionFixture(),
    evidenceBundleDocument: buildRichEvidenceBundleFixture(),
    assessmentDocument: buildCurrentAssessmentFixture({
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "no",
      merece_ticket_generalizavel: "inconclusive",
      confidence: "medium",
      evidence_sufficiency: "sufficient",
      primary_taxonomy: "bug_likely",
      operational_class: "bug_likely_but_unconfirmed",
      next_action: {
        code: "materialize_semantic_review_result",
        summary:
          "materialize semantic-review.result.json for the ready bounded packet before runner-side publication triage",
        source: "semantic_review",
      },
      blockers: [
        {
          code: "SEMANTIC_REVIEW_RESULT_MISSING",
          summary:
            "semantic-review.result.json is still missing for the ready bounded packet in this dossier",
          source: "semantic_review_result",
          member: null,
        },
      ],
      causal_surface: {
        owner: "target-project",
        kind: "bug",
        summary:
          "deterministic target-project evidence already points to a reusable semantic bug while bounded confirmation stays pending",
        actionable: true,
        systems: ["case-investigation", "semantic-review", "extract_address"],
      },
      publication_recommendation: {
        recommended_action: "inconclusive",
        reason:
          "materialize semantic-review.result.json for the ready bounded packet before runner-side publication triage",
        proposed_ticket_scope: "hold publication and keep the local dossier as supporting evidence only",
        suggested_title: "Do not publish extract_address ticket yet",
      },
      capability_limits: [
        {
          code: "semantic_review_result_missing",
          summary:
            "semantic-review was ready, but the runner result has not been materialized in the dossier yet",
        },
      ],
    }),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture({
      selected_selectors: {
        propertyId: "case-001",
        workflow: "extract_address",
        window: "2026-04-05T23:15:00Z/2026-04-05T23:25:00Z",
      },
      symptom: "complemento truncado como apartamento n",
      symptom_selection: {
        source: "strong_candidate",
        selected_candidate_id:
          "extract_address_current_complemento_semantic_truncation_apartamento_n",
        selection_reason:
          "the packet promoted the only bounded strong symptom candidate because the operator did not provide a symptom",
      },
      symptom_candidates: [
        {
          candidate_id: "extract_address_current_complemento_semantic_truncation_apartamento_n",
          workflow_key: "extract_address",
          surface_id: "local-run-bundle",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          field_path: "extract_address.value.current.complemento",
          json_pointer: "/extract_address/value/current/complemento",
          symptom: "complemento truncado como apartamento n",
          issue_type: "semantic_truncation",
          strength: "strong",
          selection_reason:
            'the observed workflow response still carries the bounded complemento literal "apartamento n", which strongly suggests semantic truncation of the apartment identifier',
        },
      ],
      workflow: {
        key: "extract_address",
        support_status: "supported",
        public_http_selectable: true,
        documentation_path: "docs/specs/example.md",
      },
      target_fields: [
        {
          field_path: "extract_address.value.current.complemento",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          json_pointer: "/extract_address/value/current/complemento",
          selection_reason: "bounded target field selected by the target project",
        },
      ],
      supporting_refs: [
        {
          surface_id: "local-run-bundle",
          ref: "local-run-bundle:response",
          path: "output/local-runs/hist-case/main.response.json",
          sha256: "a".repeat(64),
          record_count: 1,
          selection_reason: "observed workflow response bounded by the target packet",
          json_pointers: ["/extract_address/value/current/complemento"],
        },
      ],
    }),
    semanticReviewResultDocument: null,
  });

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: {
          projectName: fixture.project.name,
          caseRef: "case-001",
          workflow: "extract_address",
        },
        artifacts: fixture.artifactPaths,
      }),
    /semantic-review\.result\.json ausente para packet pronto/u,
  );
});

test("evaluateTargetInvestigateCaseRound preserva evidence_missing_or_partial com bundle_not_captured e replay_readiness pronto", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
      manifest.workflows = {
        investigable: ["extract_address"],
      };
    },
    caseResolutionDocument: {
      ...buildCurrentCaseResolutionFixture(),
      replay_decision: {
        status: "required",
        reason_code: "SAFE_REPLAY_REQUIRED",
        resolution_reason: "fixture still requires a safe replay",
        factual_sufficiency_reason: "fixture response artifact is still missing",
        replay_mode: "historical-only",
        request_id: "case_inv_current_01",
        local_namespace: "output/case-investigation/case_inv_current_01",
        update_db: false,
        include_workflow_debug: false,
        workflow: "extract_address",
      },
      replay_readiness: {
        state: "ready",
        required: true,
        summary: "fixture has enough selectors to run safe replay",
        reason_code: "SAFE_REPLAY_REQUIRED",
        blockers: [],
        next_step: {
          code: "run_safe_replay",
          summary: "fixture should run safe replay to capture the missing bundle",
        },
      },
    },
    evidenceBundleDocument: {
      ...buildRichEvidenceBundleFixture(),
      collection_sufficiency: "partial",
    },
    assessmentDocument: buildCurrentAssessmentFixture({
      houve_gap_real: "inconclusive",
      era_evitavel_internamente: "no",
      merece_ticket_generalizavel: "inconclusive",
      confidence: "medium",
      evidence_sufficiency: "partial",
      primary_taxonomy: "evidence_missing_or_partial",
      operational_class: "bundle_not_captured",
      next_action: {
        code: "run_safe_replay",
        summary: "fixture should run safe replay to capture the missing bundle",
        source: "replay_readiness",
      },
      blockers: [
        {
          code: "WORKFLOW_RESPONSE_MISSING",
          summary: "semantic review blocked because the observed workflow response is unavailable",
          source: "semantic_review_request",
          member: null,
        },
      ],
      causal_surface: {
        owner: "shared",
        kind: "unknown",
        summary: "fixture still lacks the bounded response artifact for semantic confirmation",
        actionable: true,
        systems: ["case-investigation", "safe-replay", "extract_address"],
      },
      publication_recommendation: {
        recommended_action: "inconclusive",
        reason: "capture the missing bundle before runner-side publication triage",
        proposed_ticket_scope: "hold publication until the missing bundle is captured",
        suggested_title: "Do not publish extract_address ticket yet",
      },
      capability_limits: [
        {
          code: "bundle_not_captured",
          summary: "the bounded workflow response was still unavailable in the local dossier",
        },
      ],
    }),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture({
      symptom: null,
      symptom_selection: {
        source: "none",
        selected_candidate_id: null,
        selection_reason:
          "no operator-provided symptom or unique bounded strong symptom candidate was available for prioritization",
      },
      symptom_candidates: [],
      selected_selectors: {
        propertyId: "case-001",
        workflow: "extract_address",
      },
      workflow: {
        key: "extract_address",
        support_status: "supported",
        public_http_selectable: true,
        documentation_path: "docs/specs/example.md",
      },
      review_readiness: {
        status: "blocked",
        reason_code: "WORKFLOW_RESPONSE_MISSING",
        summary: "semantic review blocked because the observed workflow response is unavailable",
      },
      target_fields: [],
      supporting_refs: [],
    }),
    semanticReviewResultDocument: null,
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "extract_address",
    },
    artifacts: fixture.artifactPaths,
  });

  assert.equal(result.assessment.primary_taxonomy, "evidence_missing_or_partial");
  assert.equal(result.assessment.operational_class, "bundle_not_captured");
  assert.equal(result.summary.primary_taxonomy, "evidence_missing_or_partial");
  assert.equal(result.summary.operational_class, "bundle_not_captured");
  assert.equal(result.tracePayload.case_resolution.replay_readiness?.state, "ready");
  assert.equal(result.publicationDecision.overall_outcome, "inconclusive-case");
});

test("evaluateTargetInvestigateCaseRound publica normalmente com assessment bug_confirmed no contrato novo", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
      manifest.workflows = {
        investigable: ["extract_address"],
      };
    },
    caseResolutionDocument: buildCurrentCaseResolutionFixture(),
    evidenceBundleDocument: {
      ...buildRichEvidenceBundleFixture(),
      collection_sufficiency: "strong",
    },
    assessmentDocument: buildCurrentAssessmentFixture(),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture({
      selected_selectors: {
        propertyId: "case-001",
        workflow: "extract_address",
        symptom: "complemento truncado como apartamento n",
      },
      symptom: "complemento truncado como apartamento n",
      symptom_selection: {
        source: "operator",
        selected_candidate_id:
          "extract_address_current_complemento_semantic_truncation_apartamento_n",
        selection_reason:
          "operator-provided symptom took precedence over inferred candidates and matched the bounded strong candidate",
      },
      symptom_candidates: [
        {
          candidate_id: "extract_address_current_complemento_semantic_truncation_apartamento_n",
          workflow_key: "extract_address",
          surface_id: "local-run-bundle",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          field_path: "extract_address.value.current.complemento",
          json_pointer: "/extract_address/value/current/complemento",
          symptom: "complemento truncado como apartamento n",
          issue_type: "semantic_truncation",
          strength: "strong",
          selection_reason:
            'the observed workflow response still carries the bounded complemento literal "apartamento n", which strongly suggests semantic truncation of the apartment identifier',
        },
      ],
      workflow: {
        key: "extract_address",
        support_status: "supported",
        public_http_selectable: true,
        documentation_path: "docs/specs/example.md",
      },
      target_fields: [
        {
          field_path: "extract_address.value.current.complemento",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          json_pointer: "/extract_address/value/current/complemento",
          selection_reason: "bounded target field selected by the target project",
        },
      ],
      supporting_refs: [
        {
          surface_id: "local-run-bundle",
          ref: "local-run-bundle:response",
          path: "output/local-runs/hist-case/main.response.json",
          sha256: "a".repeat(64),
          record_count: 1,
          selection_reason: "observed workflow response bounded by the target packet",
          json_pointers: ["/extract_address/value/current/complemento"],
        },
      ],
    }),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
  });
  const publisher = new StubTargetInvestigateCaseTicketPublisher(
    "tickets/open/2026-04-05-case-investigation-bug-confirmed.md",
  );

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "extract_address",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher: publisher,
  });

  assert.equal(result.assessment.primary_taxonomy, "bug_confirmed");
  assert.equal(result.publicationDecision.publication_status, "eligible");
  assert.equal(result.publicationDecision.overall_outcome, "ticket-published");
  assert.equal(result.tracePayload.semantic_review.status, "completed");
  assert.equal(result.summary.primary_taxonomy, "bug_confirmed");
});

test("evaluateTargetInvestigateCaseRound grava publication-decision no caminho no-op para no-real-gap", async () => {
  const fixture = await createTargetRepoFixture({
    mutateCaseResolution: (artifact) => {
      artifact.attempt_resolution = {
        status: "absent-explicitly",
        attempt_ref: null,
        reason: "Nao ha tentativa segura para desambiguar o caso.",
      };
      artifact.replay_decision = {
        status: "not-required",
        reason: "Base historica suficiente.",
      };
    },
    mutateEvidenceBundle: (artifact) => {
      artifact.replay = {
        used: false,
        mode: "historical-only",
        request_id: null,
        update_db: null,
        include_workflow_debug: null,
        cache_policy: null,
        purge_policy: null,
        namespace: null,
      };
    },
    mutateAssessment: (artifact) => {
      artifact.houve_gap_real = "no";
      artifact.era_evitavel_internamente = "not_applicable";
      artifact.merece_ticket_generalizavel = "not_applicable";
      artifact.publication_recommendation.recommended_action = "do_not_publish";
      artifact.causal_surface.kind = "expected-behavior";
      artifact.generalization_basis = [];
    },
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
  });

  assert.equal(result.publicationDecision.publication_status, "not_applicable");
  assert.equal(result.publicationDecision.overall_outcome, "no-real-gap");
  assert.deepEqual(result.publicationDecision.versioned_artifact_paths, []);
  assert.equal(result.publicationDecision.ticket_path, null);
  assert.equal(result.tracePayload.semantic_review.status, "missing");

  const savedDecision = JSON.parse(
    await fs.readFile(
      path.join(fixture.project.path, ...fixture.artifactPaths.publicationDecisionPath.split("/")),
      "utf8",
    ),
  );
  assert.equal(savedDecision.overall_outcome, "no-real-gap");

  const renderedSummary = renderTargetInvestigateCaseFinalSummary(result.summary);
  assert.match(renderedSummary, /Case-ref: case-001/u);
  assert.match(renderedSummary, /ausencia explicita de tentativa/u);

  const traceJson = JSON.stringify(result.tracePayload);
  assert.doesNotMatch(traceJson, /workflow_debug/u);
  assert.doesNotMatch(traceJson, /db_payload/u);
  assert.doesNotMatch(traceJson, /transcript/u);
});

test("evaluateTargetInvestigateCaseRound registra semantic-review blocked sem alterar a semantica atual de publication", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    semanticReviewRequestDocument: {
      ...buildSemanticReviewRequestFixture(),
      review_readiness: {
        status: "blocked",
        reason_code: "WORKFLOW_RESPONSE_MISSING",
        summary: "semantic review blocked because the observed workflow response is unavailable",
      },
      target_fields: [],
      supporting_refs: [],
    },
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
  });

  assert.equal(result.tracePayload.semantic_review.status, "blocked");
  assert.equal(result.tracePayload.semantic_review.request_path, fixture.artifactPaths.semanticReviewRequestPath);
  assert.equal(result.tracePayload.semantic_review.result_path, null);
  assert.equal(result.publicationDecision.publication_status, "not_applicable");
});

test("evaluateTargetInvestigateCaseRound registra semantic-review completed com metadados minimos do resultado", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    assessmentDocument: buildCurrentAssessmentFixture(),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture(),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
  });

  assert.equal(result.tracePayload.semantic_review.status, "completed");
  assert.equal(result.tracePayload.semantic_review.request_path, fixture.artifactPaths.semanticReviewRequestPath);
  assert.equal(result.tracePayload.semantic_review.result_path, fixture.artifactPaths.semanticReviewResultPath);
  assert.equal(result.tracePayload.semantic_review.verdict, "confirmed_error");
  assert.equal(result.tracePayload.semantic_review.issue_type, "semantic_truncation");
  assert.equal(result.tracePayload.semantic_review.confidence, "high");
  const traceJson = JSON.stringify(result.tracePayload);
  assert.doesNotMatch(traceJson, /billing-core\.value\.current\.status/u);
  assert.doesNotMatch(traceJson, /semantic review confirms the functional mismatch/u);
});

test("evaluateTargetInvestigateCaseRound falha explicitamente quando o request de semantic-review esta invalido", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture(),
  });
  await fs.writeFile(
    path.join(fixture.project.path, ...fixture.artifactPaths.semanticReviewRequestPath.split("/")),
    "{invalid-json\n",
    "utf8",
  );

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: {
          projectName: fixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: fixture.artifactPaths,
      }),
    /semantic-review\.request\.json invalido/u,
  );
});

test("evaluateTargetInvestigateCaseRound falha explicitamente quando o result de semantic-review esta invalido", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture(),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
  });
  await fs.writeFile(
    path.join(fixture.project.path, ...fixture.artifactPaths.semanticReviewResultPath.split("/")),
    "{invalid-json\n",
    "utf8",
  );

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: {
          projectName: fixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: fixture.artifactPaths,
      }),
    /semantic-review\.result\.json invalido/u,
  );
});

test("evaluateTargetInvestigateCaseRound aceita os artefatos ricos atuais do piloto e os normaliza para o contrato interno", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.workflows = {
        investigable: ["extract_address"],
      };
    },
    caseResolutionDocument: buildRichCaseResolutionFixture(),
    evidenceBundleDocument: buildRichEvidenceBundleFixture(),
    assessmentDocument: buildRichAssessmentFixture(),
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case_inv_pilot_20260403_183200",
      workflow: "extract_address",
      requestId: "case_inv_pilot_20260403_183200",
    },
    artifacts: fixture.artifactPaths,
  });

  assert.equal(result.caseResolution.case_ref, "case_inv_pilot_20260403_183200");
  assert.equal(result.caseResolution.selectors.request_id, undefined);
  assert.equal(result.caseResolution.attempt_resolution.status, "resolved");
  assert.equal(
    result.caseResolution.attempt_resolution.attempt_ref,
    "case_inv_pilot_20260403_183200",
  );
  assert.deepEqual(result.caseResolution.relevant_workflows, ["extract_address"]);
  assert.equal(result.evidenceBundle.replay.used, false);
  assert.equal(result.assessment.houve_gap_real, "no");
  assert.equal(result.assessment.evidence_sufficiency, "sufficient");
  assert.equal(result.assessment.primary_remediation?.status, "not_available");
  assert.equal(result.publicationDecision.publication_status, "not_applicable");
  assert.equal(result.publicationDecision.overall_outcome, "no-real-gap");
});

test("evaluateTargetInvestigateCaseRound aplica bridge bounded quando o roundId foi promovido a requestId sem input explicito", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.workflows = {
        investigable: ["extract_address"],
      };
    },
    caseResolutionDocument: {
      ...buildCurrentCaseResolutionFixture(),
      selected_selectors: {
        propertyId: "case-001",
        requestId: "round-1",
        workflow: "extract_address",
      },
      resolved_case: {
        status: "invalid",
        authority: null,
        value: null,
        request_id: null,
        run_artifact: null,
        resolution_reason:
          "fixture promoted the runner round id to requestId even though the operator did not provide one",
        provided_authorities: ["propertyId", "requestId"],
      },
      resolved_attempt: {
        authority: "requestId",
        status: "resolved",
        request_id: "round-1",
        run_artifact: null,
        workflow: "extract_address",
        window: null,
        resolution_reason: "requestId is an explicit attempt authority",
      },
      attempt_candidates: {
        discovery_mode: "not-run",
        status: "not-run",
        silent_selection_blocked: false,
        resolution_reason:
          "attempt candidate discovery was skipped because an explicit attempt authority was already supplied",
        selected_for_historical_evidence_request_id: null,
        candidate_request_ids: [],
        next_step: null,
      },
      replay_readiness: {
        state: "ready",
        required: false,
        summary: "fixture historical evidence already closed the case",
        reason_code: "HISTORICAL_BUNDLE_SUFFICIENT",
        blockers: [],
        next_step: null,
      },
    },
    evidenceBundleDocument: buildRichEvidenceBundleFixture(),
    assessmentDocument: buildRichAssessmentFixture(),
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "extract_address",
      requestId: null,
    },
    artifacts: fixture.artifactPaths,
  });

  assert.equal(result.caseResolution.case_ref, "case-001");
  assert.equal(result.caseResolution.selectors.request_id, undefined);
  assert.equal(result.caseResolution.attempt_resolution.status, "not-required");
  assert.equal(result.caseResolution.attempt_resolution.attempt_ref, null);
  assert.equal(result.publicationDecision.publication_status, "not_applicable");
  assert.equal(result.publicationDecision.overall_outcome, "no-real-gap");
});

test("evaluateTargetInvestigateCaseRound publica ticket quando o caso e elegivel com evidencia strong", async () => {
  const fixture = await createTargetRepoFixture();
  const publisher = new StubTargetInvestigateCaseTicketPublisher();

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: `${TARGET_INVESTIGATE_CASE_COMMAND} ${fixture.project.name} case-001 --workflow billing-core --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`,
    artifacts: fixture.artifactPaths,
    ticketPublisher: publisher,
  });

  assert.equal(result.publicationDecision.publication_status, "eligible");
  assert.equal(result.publicationDecision.overall_outcome, "ticket-published");
  assert.deepEqual(result.publicationDecision.versioned_artifact_paths, [publisher.ticketPath]);
  assert.equal(result.publicationDecision.ticket_path, publisher.ticketPath);
  assert.equal(publisher.calls.length, 1);
  assert.ok(
    await fileExists(path.join(fixture.project.path, ...publisher.ticketPath.split("/"))),
  );

  const renderedSummary = renderTargetInvestigateCaseFinalSummary(result.summary);
  assert.match(renderedSummary, /Ticket path: tickets\/open\//u);
});

test("evaluateTargetInvestigateCaseRound bloqueia publication por policy declarada no manifesto", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.publicationPolicy.allowAutomaticPublication = false;
      manifest.publicationPolicy.blockedReason = "Policy local exige revisao humana obrigatoria.";
    },
  });
  const publisher = new StubTargetInvestigateCaseTicketPublisher();

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher: publisher,
  });

  assert.equal(result.publicationDecision.publication_status, "blocked_by_policy");
  assert.equal(result.publicationDecision.overall_outcome, "ticket-eligible-but-blocked-by-policy");
  assert.equal(result.publicationDecision.ticket_path, null);
  assert.equal(publisher.calls.length, 0);
});

test("evaluateTargetInvestigateCaseRound aceita evidence_sufficiency=sufficient apenas com conflito normativo inequivoco", async () => {
  const failingFixture = await createTargetRepoFixture({
    mutateEvidenceBundle: (artifact) => {
      artifact.collection_sufficiency = "sufficient";
      artifact.normative_conflicts = [];
    },
    mutateAssessment: (artifact) => {
      artifact.evidence_sufficiency = "sufficient";
    },
  });

  const failingResult = await evaluateTargetInvestigateCaseRound({
    targetProject: failingFixture.project,
    input: {
      projectName: failingFixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: failingFixture.artifactPaths,
    ticketPublisher: new StubTargetInvestigateCaseTicketPublisher(),
  });

  assert.equal(failingResult.publicationDecision.publication_status, "not_eligible");
  assert.equal(failingResult.publicationDecision.overall_outcome, "inconclusive-case");

  const successfulFixture = await createTargetRepoFixture({
    mutateEvidenceBundle: (artifact) => {
      artifact.collection_sufficiency = "sufficient";
      artifact.normative_conflicts = [
        {
          kind: "contract-violation",
          summary: "Conflito contratual inequívoco com guardrail ativo.",
          blocking: true,
        },
      ];
    },
    mutateAssessment: (artifact) => {
      artifact.evidence_sufficiency = "sufficient";
    },
  });
  const publisher = new StubTargetInvestigateCaseTicketPublisher(
    "tickets/open/2026-04-03-case-investigation-sufficient.md",
  );

  const successfulResult = await evaluateTargetInvestigateCaseRound({
    targetProject: successfulFixture.project,
    input: {
      projectName: successfulFixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: successfulFixture.artifactPaths,
    ticketPublisher: publisher,
  });

  assert.equal(successfulResult.publicationDecision.publication_status, "eligible");
  assert.equal(successfulResult.publicationDecision.overall_outcome, "ticket-published");
});

test("evaluateTargetInvestigateCaseRound aceita promotion para evidence_sufficiency=strong quando semantic-review confirmou erro bounded", async () => {
  const publisher = new StubTargetInvestigateCaseTicketPublisher(
    "tickets/open/2026-04-06-case-investigation-semantic-confirmed.md",
  );
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    mutateEvidenceBundle: (artifact) => {
      artifact.collection_sufficiency = "sufficient";
      artifact.normative_conflicts = [];
    },
    assessmentDocument: buildCurrentAssessmentFixture({
      evidence_sufficiency: "strong",
    }),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture(),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
  });

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher: publisher,
  });

  assert.equal(result.publicationDecision.publication_status, "eligible");
  assert.equal(result.publicationDecision.overall_outcome, "ticket-published");
  assert.equal(result.publicationDecision.ticket_path, publisher.ticketPath);
});

test("evaluateTargetInvestigateCaseRound aceita promotion semantica para evidence_sufficiency=strong mesmo quando root-cause-review ainda bloqueia publication", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
      manifest.rootCauseReview = buildPilotManifestFixture().rootCauseReview;
    },
    evidenceBundleDocument: buildRichEvidenceBundleFixture(),
    assessmentDocument: buildCurrentAssessmentFixture({
      merece_ticket_generalizavel: "inconclusive",
      evidence_sufficiency: "strong",
      generalization_basis: [
        {
          code: "correlated_local_bundle",
          summary: "request, response and headers remained correlated to the same attempt",
        },
        {
          code: "semantic_review_confirmed_error",
          summary: "bounded semantic review confirmed the workflow error",
        },
        {
          code: "repo_aware_minimal_cause",
          summary: "repo-aware causal debug isolated a smallest plausible local cause",
        },
      ],
      overfit_vetoes: [
        {
          code: "root_cause_review_plausible_but_unfalsified",
          reason:
            "the leading hypothesis remains plausible but not falsified strongly enough, so publication stays blocked",
          blocking: true,
        },
      ],
      ticket_projection: {
        status: "blocked",
        summary: "ticket projection stayed blocked until root-cause-review confirms the cause",
        ticket_proposal_artifact: null,
      },
      root_cause_review: {
        status: "plausible_but_unfalsified",
        summary: "root-cause-review kept publication blocked pending falsification experiments",
        request_status: "ready",
        request_reason_code: "READY",
        result_status: "valid",
        root_cause_status: "plausible_but_unfalsified",
        ticket_readiness_status: "needs_more_falsification",
        publication_blocked: true,
        remaining_gaps: [
          {
            code: "upstream-origin-not-observed",
            summary: "the upstream origin of the truncation still has not been observed directly",
          },
        ],
      },
      publication_recommendation: {
        recommended_action: "inconclusive",
        reason:
          "root-cause-review marked the cause as plausible_but_unfalsified, so publication stays blocked",
        proposed_ticket_scope: "hold publication and keep the local dossier as supporting evidence only",
        suggested_title: "Do not publish billing-core ticket yet",
      },
      ticket_decision_reason:
        "root-cause-review kept publication blocked even though bounded semantic evidence stayed strong",
    }),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture(),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
    rootCauseReviewRequestDocument: buildRootCauseReviewRequestFixture(),
    rootCauseReviewResultDocument: buildRootCauseReviewResultFixture({
      root_cause_status: "plausible_but_unfalsified",
      ticket_readiness: {
        status: "needs_more_falsification",
        reason_code: "UPSTREAM_ORIGIN_NOT_OBSERVED",
        summary: "A leading cause exists, but competing hypotheses still need falsification.",
      },
      remaining_gaps: [
        {
          code: "upstream-origin-not-observed",
          summary: "the upstream origin of the truncation still has not been observed directly",
        },
      ],
    }),
    remediationProposalDocument: {
      status: "recommended",
      summary: "fix the reusable semantic bug in extract_address",
    },
    ticketProposalDocument: null,
  });
  const ticketPublisher = new StubTargetInvestigateCaseTicketPublisher();

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher,
  });

  assert.equal(result.publicationDecision.publication_status, "not_eligible");
  assert.equal(result.publicationDecision.overall_outcome, "inconclusive-case");
  assert.equal(result.summary.investigation_outcome, "actionable-remediation-identified");
  assert.equal(
    result.summary.remediation_proposal_path,
    fixture.artifactPaths.remediationProposalPath,
  );
  assert.match(
    renderTargetInvestigateCaseFinalSummary(result.summary),
    /Ha remediacao acionavel identificada; publication automatica segue bloqueada\./u,
  );
  assert.deepEqual(result.publicationDecision.blocked_gates, []);
  assert.equal(ticketPublisher.calls.length, 0);
});

test("evaluateTargetInvestigateCaseRound rejeita promotion de evidence_sufficiency sem semantic-review confirmado", async () => {
  const fixture = await createTargetRepoFixture({
    mutateEvidenceBundle: (artifact) => {
      artifact.collection_sufficiency = "sufficient";
      artifact.normative_conflicts = [];
    },
    assessmentDocument: buildCurrentAssessmentFixture({
      evidence_sufficiency: "strong",
    }),
  });

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: {
          projectName: fixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: fixture.artifactPaths,
        ticketPublisher: new StubTargetInvestigateCaseTicketPublisher(),
      }),
    /assessment\.json nao pode declarar evidence_sufficiency acima da coleta factual registrada em evidence-bundle\.json\./u,
  );
});

test("evaluateTargetInvestigateCaseRound devolve runner-limitation quando a causal surface pertence ao runner", async () => {
  const fixture = await createTargetRepoFixture({
    mutateAssessment: (artifact) => {
      artifact.causal_surface.owner = "runner";
      artifact.causal_surface.kind = "runner-limitation";
      artifact.causal_surface.summary = "O proprio runner ainda nao oferece a superficie operacional necessaria.";
    },
  });
  const publisher = new StubTargetInvestigateCaseTicketPublisher();

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher: publisher,
  });

  assert.equal(result.publicationDecision.publication_status, "not_applicable");
  assert.equal(result.publicationDecision.overall_outcome, "runner-limitation");
  assert.equal(publisher.calls.length, 0);
});

test("evaluateTargetInvestigateCaseRound rejeita assessment stale quando semantic-review.result.json confirmado nao foi consumido pelo target-project", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    assessmentDocument: buildCurrentAssessmentFixture({
      primary_taxonomy: "bug_likely",
      operational_class: "bug_likely_but_unconfirmed",
      next_action: {
        code: "materialize_semantic_review_result",
        summary:
          "materialize semantic-review.result.json for the ready bounded packet before runner-side publication triage",
        source: "semantic_review",
      },
      blockers: [
        {
          code: "SEMANTIC_REVIEW_RESULT_MISSING",
          summary:
            "semantic-review.result.json is still missing for the ready bounded packet in this dossier",
          source: "semantic_review_result",
          member: null,
        },
      ],
      capability_limits: [
        {
          code: "semantic_review_result_missing",
          summary:
            "semantic-review was ready, but the runner result has not been materialized in the dossier yet",
        },
      ],
    }),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture(),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
  });

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: {
          projectName: fixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: fixture.artifactPaths,
      }),
    /primary_taxonomy=bug_confirmed|assessment\.json permaneceu stale/u,
  );
});

test("evaluateTargetInvestigateCaseRound bloqueia publication quando ticket-proposal contradiz root-cause-review plausivel", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.rootCauseReview = buildPilotManifestFixture().rootCauseReview;
    },
    assessmentDocument: buildCurrentAssessmentFixture({
      root_cause_review: {
        status: "completed",
        summary: "root-cause-review manteve a causa apenas plausivel sem falsificacao suficiente",
        request_status: "ready",
        request_reason_code: "READY",
        result_status: "valid",
        root_cause_status: "plausible_but_unfalsified",
        ticket_readiness_status: "blocked",
        publication_blocked: true,
        remaining_gaps: [
          {
            code: "adversarial-proof-missing",
            summary: "A hipotese principal ainda nao foi falsificada contra cenarios concorrentes.",
          },
        ],
      },
    }),
    rootCauseReviewRequestDocument: buildRootCauseReviewRequestFixture(),
    rootCauseReviewResultDocument: buildRootCauseReviewResultFixture({
      root_cause_status: "plausible_but_unfalsified",
      ticket_readiness: {
        status: "blocked",
        reason_code: "ADVERSARIAL_PROOF_MISSING",
        summary: "Ainda faltam falsificacoes adversariais antes de liberar ticket.",
      },
      remaining_gaps: [
        {
          code: "adversarial-proof-missing",
          summary: "A hipotese principal ainda nao foi falsificada contra cenarios concorrentes.",
        },
      ],
    }),
  });
  const ticketPublisher = new StubTargetInvestigateCaseTicketPublisher();

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher,
  });

  assert.equal(result.publicationDecision.publication_status, "not_eligible");
  assert.equal(result.publicationDecision.overall_outcome, "inconclusive-case");
  assert.deepEqual(result.publicationDecision.blocked_gates, [
    "ticket-proposal-contradicts-root-cause-review",
    "root-cause-review-plausible-but-unfalsified",
  ]);
  assert.equal(result.tracePayload.root_cause_review.root_cause_status, "plausible_but_unfalsified");
  assert.equal(result.tracePayload.root_cause_review.ticket_readiness_status, "blocked");
  assert.deepEqual(result.tracePayload.root_cause_review.remaining_gap_codes, [
    "adversarial-proof-missing",
  ]);
  assert.equal(ticketPublisher.calls.length, 0);
});

test("evaluateTargetInvestigateCaseRound rejeita ticket-proposal enriquecido sem trilha estruturada minima do quality gate v1", async () => {
  const fixture = await createTargetRepoFixture({
    ticketProposalDocument: null,
  });
  const invalidTicketProposal = buildTicketProposalFixture({
    publication_hints: {
      ticket_scope: "generalizable",
      slug_strategy: "suggested-slug-only",
      quality_gate: "target-ticket-quality-v1",
    },
    competing_hypotheses: [
      {
        hypothesis: "cache stale v10 ainda domina a resposta",
        disposition: "kept-as-primary",
        rationale: "o version gate ainda reaproveita envelopes antigos",
      },
    ],
    prompt_guardrail_opportunities: [
      {
        area: "ticket projection",
        summary: "explicitar invalidacao de cache na projecao do ticket.",
      },
    ],
    ticket_readiness: {
      status: "ready",
      reason_code: "READY",
      summary: "publication runner-side pode seguir.",
    },
    ticket_markdown: "# [TICKET] Fix extract_address semantic truncation\n",
  });
  await fs.writeFile(
    path.join(fixture.project.path, ...fixture.artifactPaths.ticketProposalPath.split("/")),
    `${JSON.stringify(invalidTicketProposal, null, 2)}\n`,
    "utf8",
  );

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: {
          projectName: fixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: fixture.artifactPaths,
      }),
    /ticket-proposal\.json contem schema invalido: qa_escape:/u,
  );
});

test("evaluateTargetInvestigateCaseRound rejeita combinacoes invalidas e trace/summary permanecem redigidos", async () => {
  const invalidFixture = await createTargetRepoFixture({
    mutateAssessment: (artifact) => {
      artifact.era_evitavel_internamente = "no";
      artifact.merece_ticket_generalizavel = "yes";
    },
  });

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: invalidFixture.project,
        input: {
          projectName: invalidFixture.project.name,
          caseRef: "case-001",
          workflow: "billing-core",
          requestId: "req-001",
          window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
          symptom: "timeout on save",
        },
        artifacts: invalidFixture.artifactPaths,
      }),
    /not_applicable|publish_ticket exige|merece_ticket_generalizavel precisa/u,
  );

  const fixture = await createTargetRepoFixture();
  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: {
      projectName: fixture.project.name,
      caseRef: "case-001",
      workflow: "billing-core",
      requestId: "req-001",
      window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
      symptom: "timeout on save",
    },
    artifacts: fixture.artifactPaths,
    ticketPublisher: new StubTargetInvestigateCaseTicketPublisher(),
  });

  const summary = buildTargetInvestigateCaseFinalSummary({
    caseResolution: result.caseResolution,
    evidenceBundle: result.evidenceBundle,
    assessment: result.assessment,
    diagnosis: result.diagnosis,
    publicationDecision: result.publicationDecision,
    diagnosisMdPath: result.artifactPaths.diagnosisMdPath,
    diagnosisJsonPath: result.artifactPaths.diagnosisJsonPath,
    dossierPath: result.artifactPaths.dossierPath,
  });
  const tracePayload = buildTargetInvestigateCaseTracePayload({
    normalizedInput: result.normalizedInput,
    manifest: targetInvestigateCaseManifestSchema.parse(
      JSON.parse(
        await fs.readFile(
          path.join(fixture.project.path, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")),
          "utf8",
        ),
      ),
    ),
    caseResolution: result.caseResolution,
    evidenceBundle: result.evidenceBundle,
    assessment: result.assessment,
    diagnosis: result.diagnosis,
    publicationDecision: result.publicationDecision,
    diagnosisMdPath: result.artifactPaths.diagnosisMdPath,
    diagnosisJsonPath: result.artifactPaths.diagnosisJsonPath,
    dossierPath: result.artifactPaths.dossierPath,
    semanticReview: result.tracePayload.semantic_review,
    rootCauseReview: result.tracePayload.root_cause_review,
  });

  const renderedSummary = renderTargetInvestigateCaseFinalSummary(summary);
  const traceJson = JSON.stringify(tracePayload);
  assert.doesNotMatch(renderedSummary, /workflow_debug|db_payload|transcript/u);
  assert.doesNotMatch(traceJson, /workflow_debug|db_payload|transcript/u);
});

test("evaluateTargetInvestigateCaseRound aceita o trio de lineage do contrato v2 quando a rodada declara origem legada", async () => {
  const fixture = await createTargetRepoFixture();
  const artifactPaths = buildV2ArtifactPaths("2026-04-03T20-15-00Z");
  await writeV2ManifestFixture(fixture.project.path);
  await writeV2RoundArtifacts(fixture.project.path, artifactPaths);

  const result = await evaluateTargetInvestigateCaseRound({
    targetProject: fixture.project,
    input: `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 --workflow extract_address --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`,
    artifacts: artifactPaths,
  });

  assert.deepEqual(
    result.caseResolution.lineage,
    buildLegacyLineageFixture(
      "case-resolution.json",
      "investigations/2026-04-03T20-15-00Z/case-resolution.json",
    ),
  );
  assert.deepEqual(
    (result.evidenceBundle as { lineage?: unknown[] }).lineage,
    buildLegacyLineageFixture(
      "evidence-bundle.json",
      "investigations/2026-04-03T20-15-00Z/evidence-bundle.json",
    ),
  );
  assert.deepEqual(
    result.diagnosis.lineage,
    buildLegacyLineageFixture(
      "assessment.json",
      "investigations/2026-04-03T20-15-00Z/assessment.json",
    ),
  );
});

test("evaluateTargetInvestigateCaseRound rejeita case-bundle sem lineage mesmo quando evidence-index preserva a origem legada", async () => {
  const fixture = await createTargetRepoFixture();
  const artifactPaths = buildV2ArtifactPaths("2026-04-03T20-20-00Z");
  await writeV2ManifestFixture(fixture.project.path);
  await writeV2RoundArtifacts(fixture.project.path, artifactPaths, {
    omitCaseBundleLineage: true,
  });

  await assert.rejects(
    () =>
      evaluateTargetInvestigateCaseRound({
        targetProject: fixture.project,
        input: `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 --workflow extract_address --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`,
        artifacts: artifactPaths,
      }),
    /case-bundle\.json nao carregam lineage obrigatoria|evidence-index\.json pode manter lineage auxiliar/u,
  );
});

test("ControlledTargetInvestigateCaseExecutor executa o lifecycle canonico com namespace local estavel em no-op", async () => {
  const fixture = await createTargetRepoFixture({
    mutateCaseResolution: (artifact) => {
      artifact.attempt_resolution = {
        status: "absent-explicitly",
        attempt_ref: null,
        reason: "Nao ha tentativa segura para desambiguar o caso.",
      };
      artifact.replay_decision = {
        status: "not-required",
        reason: "Base historica suficiente.",
      };
    },
    mutateEvidenceBundle: (artifact) => {
      artifact.replay = {
        used: false,
        mode: "historical-only",
        request_id: null,
        update_db: null,
        include_workflow_debug: null,
        cache_policy: null,
        purge_policy: null,
        namespace: null,
      };
    },
    mutateAssessment: (artifact) => {
      artifact.houve_gap_real = "no";
      artifact.era_evitavel_internamente = "not_applicable";
      artifact.merece_ticket_generalizavel = "not_applicable";
      artifact.publication_recommendation.recommended_action = "do_not_publish";
      artifact.causal_surface.kind = "expected-behavior";
      artifact.generalization_basis = [];
    },
  });
  const milestones: string[] = [];
  const executor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver: new FileSystemTargetProjectResolver(fixture.rootPath),
    now: () => new Date("2026-04-03T18:00:00.000Z"),
    roundPreparer: {
      prepareRound: async (request) => {
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.caseResolutionPath,
          request.targetProject.path,
          request.artifactPaths.caseResolutionPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.evidenceBundlePath,
          request.targetProject.path,
          request.artifactPaths.evidenceBundlePath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.assessmentPath,
          request.targetProject.path,
          request.artifactPaths.assessmentPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisJsonPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisJsonPath,
          { rewriteDiagnosisBundleArtifact: request.artifactPaths.evidenceBundlePath },
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisMdPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisMdPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.dossierPath,
          request.targetProject.path,
          request.artifactPaths.dossierPath,
        );
        return {
          status: "prepared",
        };
      },
    },
  });

  const result = await executor.execute(
    {
      input: {
        projectName: fixture.project.name,
        caseRef: "case-001",
        workflow: "billing-core",
        requestId: "req-001",
        window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
        symptom: "timeout on save",
      },
    },
    {
      onMilestone: async (event) => {
        milestones.push(`${event.milestone}:${event.versionBoundaryState}`);
      },
    },
  );

  assert.equal(result.status, "completed", JSON.stringify(result));
  if (result.status !== "completed") {
    return;
  }

  assert.deepEqual(milestones, [
    "preflight:before-versioning",
    "case-resolution:before-versioning",
    "evidence-collection:before-versioning",
    "assessment:before-versioning",
    "publication:before-versioning",
  ]);
  assert.equal(result.summary.versionBoundaryState, "before-versioning");
  assert.deepEqual(
    result.summary.artifactPaths,
    {
      caseResolutionPath: "investigations/2026-04-03T18-00-00Z/case-resolution.json",
      evidenceIndexPath: "",
      evidenceBundlePath: "investigations/2026-04-03T18-00-00Z/evidence-bundle.json",
      assessmentPath: "investigations/2026-04-03T18-00-00Z/assessment.json",
      diagnosisJsonPath: "investigations/2026-04-03T18-00-00Z/diagnosis.json",
      diagnosisMdPath: "investigations/2026-04-03T18-00-00Z/diagnosis.md",
      dossierPath: "investigations/2026-04-03T18-00-00Z/dossier.md",
      semanticReviewRequestPath:
        "investigations/2026-04-03T18-00-00Z/semantic-review.request.json",
      semanticReviewResultPath:
        "investigations/2026-04-03T18-00-00Z/semantic-review.result.json",
      causalDebugRequestPath:
        "investigations/2026-04-03T18-00-00Z/causal-debug.request.json",
      causalDebugResultPath:
        "investigations/2026-04-03T18-00-00Z/causal-debug.result.json",
      rootCauseReviewRequestPath:
        "investigations/2026-04-03T18-00-00Z/root-cause-review.request.json",
      rootCauseReviewResultPath:
        "investigations/2026-04-03T18-00-00Z/root-cause-review.result.json",
      remediationProposalPath:
        "investigations/2026-04-03T18-00-00Z/remediation-proposal.json",
      ticketProposalPath:
        "investigations/2026-04-03T18-00-00Z/ticket-proposal.json",
      publicationDecisionPath: "investigations/2026-04-03T18-00-00Z/publication-decision.json",
    },
  );
  assert.equal(result.summary.publicationDecision.publication_status, "not_applicable");
  assert.equal(result.summary.publicationDecision.overall_outcome, "no-real-gap");
  assert.ok(
    await fileExists(
      path.join(
        fixture.project.path,
        ...result.summary.artifactPaths.publicationDecisionPath.split("/"),
      ),
    ),
  );
});

test("ControlledTargetInvestigateCaseExecutor aceita o contrato v2 com namespace autoritativo e milestones diagnosis-first", async () => {
  const fixture = await createTargetRepoFixture();
  await writeV2ManifestFixture(fixture.project.path);

  const milestones: string[] = [];
  const executor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver: new FileSystemTargetProjectResolver(fixture.rootPath),
    now: () => new Date("2026-04-03T20:00:00.000Z"),
    roundPreparer: {
      prepareRound: async (request) => {
        await writeV2RoundArtifacts(request.targetProject.path, request.artifactPaths);
        return {
          status: "prepared",
        };
      },
    },
  });

  const result = await executor.execute(
    {
      input: `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 --workflow extract_address --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`,
    },
    {
      onMilestone: async (event) => {
        milestones.push(`${event.flow}:${event.command}:${event.milestone}`);
      },
    },
  );

  assert.equal(result.status, "completed", JSON.stringify(result));
  if (result.status !== "completed") {
    return;
  }

  assert.deepEqual(milestones.slice(0, 4), [
    "target-investigate-case-v2:/target_investigate_case_v2:preflight",
    "target-investigate-case-v2:/target_investigate_case_v2:resolve-case",
    "target-investigate-case-v2:/target_investigate_case_v2:assemble-evidence",
    "target-investigate-case-v2:/target_investigate_case_v2:diagnosis",
  ]);
  assert.equal(result.summary.manifestPath, TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH);
  assert.equal(
    result.summary.roundDirectory,
    "output/case-investigation/2026-04-03T20-00-00Z",
  );
  assert.equal(
    result.summary.artifactPaths.evidenceIndexPath,
    "output/case-investigation/2026-04-03T20-00-00Z/evidence-index.json",
  );
  assert.equal(
    result.summary.artifactPaths.evidenceBundlePath,
    "output/case-investigation/2026-04-03T20-00-00Z/case-bundle.json",
  );
  assert.equal(result.summary.publicationDecision.publication_status, "not_applicable");
  assert.equal(result.summary.publicationDecision.overall_outcome, "no-real-gap");
});

test("ControlledTargetInvestigateCaseExecutor cruza a fronteira de versionamento apenas dentro de publication e aceita dossier.json", async () => {
  const fixture = await createTargetRepoFixture({
    dossierFormat: "json",
  });
  const publisher = new StubTargetInvestigateCaseTicketPublisher(
    "tickets/open/2026-04-03-case-investigation-executor.md",
  );
  const milestones: string[] = [];
  const executor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver: new FileSystemTargetProjectResolver(fixture.rootPath),
    now: () => new Date("2026-04-03T19:00:00.000Z"),
    roundPreparer: {
      prepareRound: async (request) => {
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.caseResolutionPath,
          request.targetProject.path,
          request.artifactPaths.caseResolutionPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.evidenceBundlePath,
          request.targetProject.path,
          request.artifactPaths.evidenceBundlePath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.assessmentPath,
          request.targetProject.path,
          request.artifactPaths.assessmentPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisJsonPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisJsonPath,
          { rewriteDiagnosisBundleArtifact: request.artifactPaths.evidenceBundlePath },
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisMdPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisMdPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.ticketProposalPath,
          request.targetProject.path,
          request.artifactPaths.ticketProposalPath,
        );
        const dossierPath = request.artifactPaths.dossierPath.replace(/\.md$/u, ".json");
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.dossierPath,
          request.targetProject.path,
          dossierPath,
          { rewriteDossierLocalPath: dossierPath },
        );
        return {
          status: "prepared",
          dossierPath,
          ticketPublisher: publisher,
        };
      },
    },
  });

  const result = await executor.execute(
    {
      input: `${TARGET_INVESTIGATE_CASE_COMMAND} ${fixture.project.name} case-001 --workflow billing-core --request-id req-001 --window 2026-04-03T00:00Z/2026-04-03T01:00Z --symptom "timeout on save"`,
    },
    {
      onMilestone: async (event) => {
        milestones.push(`${event.milestone}:${event.versionBoundaryState}`);
      },
    },
  );

  assert.equal(result.status, "completed");
  if (result.status !== "completed") {
    return;
  }

  assert.deepEqual(milestones, [
    "preflight:before-versioning",
    "case-resolution:before-versioning",
    "evidence-collection:before-versioning",
    "assessment:before-versioning",
    "publication:before-versioning",
    "publication:after-versioning",
  ]);
  assert.equal(result.summary.versionBoundaryState, "after-versioning");
  assert.equal(
    result.summary.artifactPaths.dossierPath,
    "investigations/2026-04-03T19-00-00Z/dossier.json",
  );
  assert.deepEqual(
    result.summary.publicationDecision.versioned_artifact_paths,
    [publisher.ticketPath],
  );
  assert.equal(result.summary.publicationDecision.ticket_path, publisher.ticketPath);
});

test("ControlledTargetInvestigateCaseExecutor falha explicitamente quando semantic-review ready nao foi materializado", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
      manifest.workflows = {
        investigable: ["extract_address"],
      };
    },
    evidenceBundleDocument: {
      ...buildRichEvidenceBundleFixture(),
      collection_sufficiency: "sufficient",
    },
    assessmentDocument: buildCurrentAssessmentFixture({
      houve_gap_real: "yes",
      era_evitavel_internamente: "yes",
      merece_ticket_generalizavel: "yes",
      confidence: "high",
      evidence_sufficiency: "sufficient",
      primary_taxonomy: "bug_likely",
      operational_class: "bug_likely_but_unconfirmed",
      next_action: {
        code: "materialize_semantic_review_result",
        summary:
          "materialize semantic-review.result.json for the ready bounded packet before runner-side publication triage",
        source: "semantic_review",
      },
      blockers: [
        {
          code: "SEMANTIC_REVIEW_RESULT_MISSING",
          summary:
            "semantic-review.result.json is still missing for the ready bounded packet in this dossier",
          source: "semantic_review_result",
          member: null,
        },
      ],
      causal_surface: {
        owner: "target-project",
        kind: "bug",
        summary:
          "deterministic target-project evidence already points to a reusable semantic bug while bounded confirmation stays pending",
        actionable: true,
        systems: ["case-investigation", "semantic-review", "extract_address"],
      },
      publication_recommendation: {
        recommended_action: "inconclusive",
        reason:
          "materialize semantic-review.result.json for the ready bounded packet before runner-side publication triage",
        proposed_ticket_scope: "hold publication and keep the local dossier as supporting evidence only",
        suggested_title: "Do not publish extract_address ticket yet",
      },
      capability_limits: [
        {
          code: "semantic_review_result_missing",
          summary:
            "semantic-review was ready, but the runner result has not been materialized in the dossier yet",
        },
      ],
    }),
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture({
      selected_selectors: {
        propertyId: "case-001",
        workflow: "extract_address",
      },
      symptom: "complemento truncado como apartamento n",
      symptom_selection: {
        source: "strong_candidate",
        selected_candidate_id:
          "extract_address_current_complemento_semantic_truncation_apartamento_n",
        selection_reason:
          "the packet promoted the only bounded strong symptom candidate because the operator did not provide a symptom",
      },
      symptom_candidates: [
        {
          candidate_id: "extract_address_current_complemento_semantic_truncation_apartamento_n",
          workflow_key: "extract_address",
          surface_id: "local-run-bundle",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          field_path: "extract_address.value.current.complemento",
          json_pointer: "/extract_address/value/current/complemento",
          symptom: "complemento truncado como apartamento n",
          issue_type: "semantic_truncation",
          strength: "strong",
          selection_reason:
            'the observed workflow response still carries the bounded complemento literal "apartamento n", which strongly suggests semantic truncation of the apartment identifier',
        },
      ],
      workflow: {
        key: "extract_address",
        support_status: "supported",
        public_http_selectable: true,
        documentation_path: "docs/specs/example.md",
      },
      target_fields: [
        {
          field_path: "extract_address.value.current.complemento",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          json_pointer: "/extract_address/value/current/complemento",
          selection_reason: "bounded target field selected by the target project",
        },
      ],
      supporting_refs: [
        {
          surface_id: "local-run-bundle",
          ref: "local-run-bundle:response",
          path: "output/local-runs/hist-case/main.response.json",
          sha256: "a".repeat(64),
          record_count: 1,
          selection_reason: "observed workflow response bounded by the target packet",
          json_pointers: ["/extract_address/value/current/complemento"],
        },
      ],
    }),
    semanticReviewResultDocument: null,
  });
  const milestones: string[] = [];
  const executor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver: new FileSystemTargetProjectResolver(fixture.rootPath),
    now: () => new Date("2026-04-06T05:35:50.000Z"),
    roundPreparer: {
      prepareRound: async (request) => {
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.caseResolutionPath,
          request.targetProject.path,
          request.artifactPaths.caseResolutionPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.evidenceBundlePath,
          request.targetProject.path,
          request.artifactPaths.evidenceBundlePath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.assessmentPath,
          request.targetProject.path,
          request.artifactPaths.assessmentPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisJsonPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisJsonPath,
          { rewriteDiagnosisBundleArtifact: request.artifactPaths.evidenceBundlePath },
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisMdPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisMdPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.dossierPath,
          request.targetProject.path,
          request.artifactPaths.dossierPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.semanticReviewRequestPath,
          request.targetProject.path,
          request.artifactPaths.semanticReviewRequestPath,
        );
        return {
          status: "prepared",
        };
      },
    },
  });

  const result = await executor.execute(
    {
      input: `${TARGET_INVESTIGATE_CASE_COMMAND} ${fixture.project.name} case-001 --workflow extract_address`,
    },
    {
      onMilestone: async (event) => {
        milestones.push(`${event.milestone}:${event.versionBoundaryState}`);
      },
    },
  );

  assert.deepEqual(milestones, [
    "preflight:before-versioning",
    "case-resolution:before-versioning",
    "evidence-collection:before-versioning",
    "assessment:before-versioning",
    "publication:before-versioning",
  ]);
  assert.equal(result.status, "failed");
  if (result.status !== "failed" || !result.summary) {
    return;
  }

  assert.equal(result.summary.failureSurface, "semantic-review");
  assert.equal(result.summary.failureKind, "artifact-validation-failed");
  assert.equal(result.summary.failedAtMilestone, "publication");
  assert.equal(result.summary.versionBoundaryState, "before-versioning");
  assert.match(result.summary.message, /semantic-review\.result\.json ausente/u);
  assert.deepEqual(result.summary.artifactPaths, [
    "investigations/2026-04-06T05-35-50Z/assessment.json",
    "investigations/2026-04-06T05-35-50Z/case-resolution.json",
    "investigations/2026-04-06T05-35-50Z/diagnosis.json",
    "investigations/2026-04-06T05-35-50Z/diagnosis.md",
    "investigations/2026-04-06T05-35-50Z/dossier.md",
    "investigations/2026-04-06T05-35-50Z/evidence-bundle.json",
    "investigations/2026-04-06T05-35-50Z/semantic-review.request.json",
  ]);
});

test("ControlledTargetInvestigateCaseExecutor preserva detalhes de schema quando semantic-review.result.json esta invalido", async () => {
  const fixture = await createTargetRepoFixture({
    mutateManifest: (manifest) => {
      manifest.semanticReview = buildPilotManifestFixture().semanticReview;
    },
    semanticReviewRequestDocument: buildSemanticReviewRequestFixture({
      workflow: {
        key: "extract_address",
        support_status: "supported",
        public_http_selectable: true,
        documentation_path: "docs/workflows/extract_address.md",
      },
      symptom: "complemento truncado como apartamento n",
      symptom_selection: {
        source: "strong_candidate",
        selected_candidate_id:
          "extract_address_current_complemento_semantic_truncation_apartamento_n",
        selection_reason:
          "the packet promoted the only bounded strong symptom candidate because the operator did not provide a symptom",
      },
      symptom_candidates: [
        {
          candidate_id: "extract_address_current_complemento_semantic_truncation_apartamento_n",
          workflow_key: "extract_address",
          surface_id: "local-run-bundle",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          field_path: "extract_address.value.current.complemento",
          json_pointer: "/extract_address/value/current/complemento",
          symptom: "complemento truncado como apartamento n",
          issue_type: "semantic_truncation",
          strength: "strong",
          selection_reason: "single bounded strong candidate from the target dossier",
        },
      ],
      target_fields: [
        {
          field_path: "extract_address.value.current.complemento",
          artifact_path: "output/local-runs/hist-case/main.response.json",
          json_pointer: "/extract_address/value/current/complemento",
          selection_reason: "current complemento extracted from the bounded workflow response",
        },
      ],
      supporting_refs: [
        {
          surface_id: "local-run-bundle",
          ref: "local-run-bundle:response",
          path: "output/local-runs/hist-case/main.response.json",
          sha256: "a".repeat(64),
          record_count: 1,
          selection_reason: "observed workflow response bounded by the target packet",
          json_pointers: ["/extract_address/value/current/complemento"],
        },
      ],
    }),
    semanticReviewResultDocument: buildSemanticReviewResultFixture(),
  });
  await fs.writeFile(
    path.join(fixture.project.path, ...fixture.artifactPaths.semanticReviewResultPath.split("/")),
    `${JSON.stringify(
      {
        ...buildSemanticReviewResultFixture(),
        field_verdicts: [
          {
            field_path: "extract_address.value.current.complemento",
            json_pointer: "/extract_address/value/current/complemento",
            verdict: "confirmed_error",
            summary: "field preserves only a truncated fragment of the expected value",
            artifact_path: "output/local-runs/hist-case/main.response.json",
          },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const executor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver: new FileSystemTargetProjectResolver(fixture.rootPath),
    now: () => new Date("2026-04-06T05:35:50.000Z"),
    roundPreparer: {
      prepareRound: async (request) => {
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.caseResolutionPath,
          request.targetProject.path,
          request.artifactPaths.caseResolutionPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.evidenceBundlePath,
          request.targetProject.path,
          request.artifactPaths.evidenceBundlePath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.assessmentPath,
          request.targetProject.path,
          request.artifactPaths.assessmentPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisJsonPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisJsonPath,
          { rewriteDiagnosisBundleArtifact: request.artifactPaths.evidenceBundlePath },
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.diagnosisMdPath,
          request.targetProject.path,
          request.artifactPaths.diagnosisMdPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.dossierPath,
          request.targetProject.path,
          request.artifactPaths.dossierPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.semanticReviewRequestPath,
          request.targetProject.path,
          request.artifactPaths.semanticReviewRequestPath,
        );
        await copyInvestigationArtifact(
          fixture.project.path,
          fixture.artifactPaths.semanticReviewResultPath,
          request.targetProject.path,
          request.artifactPaths.semanticReviewResultPath,
        );
        return {
          status: "prepared",
        };
      },
    },
  });

  const result = await executor.execute({
    input: `${TARGET_INVESTIGATE_CASE_COMMAND} ${fixture.project.name} case-001 --workflow extract_address`,
  });

  assert.equal(result.status, "failed");
  if (result.status !== "failed" || !result.summary) {
    return;
  }

  assert.equal(result.summary.failureSurface, "semantic-review");
  assert.equal(result.summary.failureKind, "result-parse-failed");
  assert.equal(result.summary.failedAtMilestone, "publication");
  assert.match(result.summary.message, /semantic-review\.result\.json invalido\./u);
  assert.match(result.summary.message, /Invalid enum value/u);
  assert.match(result.summary.message, /artifact_path/u);
});

test("ControlledTargetInvestigateCaseExecutor bloqueia explicitamente quando o materializador oficial ainda nao foi ligado", async () => {
  const fixture = await createTargetRepoFixture();
  const milestones: string[] = [];
  const executor = new ControlledTargetInvestigateCaseExecutor({
    targetProjectResolver: new FileSystemTargetProjectResolver(fixture.rootPath),
    now: () => new Date("2026-04-03T19:30:00.000Z"),
  });

  const result = await executor.execute(
    {
      input: `${TARGET_INVESTIGATE_CASE_COMMAND} ${fixture.project.name} case-001`,
    },
    {
      onMilestone: async (event) => {
        milestones.push(`${event.milestone}:${event.versionBoundaryState}`);
      },
    },
  );

  assert.deepEqual(milestones, ["preflight:before-versioning"]);
  assert.deepEqual(result, {
    status: "blocked",
    reason: "round-preparer-unavailable",
    message:
      "O runner ainda nao recebeu materializador oficial para gerar os artefatos de case-investigation no projeto alvo.",
  });
});

const createTargetRepoFixture = async (options: {
  mutateManifest?: (manifest: any) => void;
  mutateCaseResolution?: (artifact: any) => void;
  mutateEvidenceBundle?: (artifact: any) => void;
  mutateAssessment?: (artifact: any) => void;
  mutateDiagnosis?: (artifact: any) => void;
  mutateSemanticReviewRequest?: (artifact: any) => void;
  mutateSemanticReviewResult?: (artifact: any) => void;
  mutateRootCauseReviewRequest?: (artifact: any) => void;
  mutateRootCauseReviewResult?: (artifact: any) => void;
  dossierFormat?: "md" | "json";
  manifestDocument?: any;
  caseResolutionDocument?: any;
  evidenceBundleDocument?: any;
  assessmentDocument?: any;
  diagnosisDocument?: any;
  diagnosisMarkdown?: string | null;
  semanticReviewRequestDocument?: any | null;
  semanticReviewResultDocument?: any | null;
  rootCauseReviewRequestDocument?: any | null;
  rootCauseReviewResultDocument?: any | null;
  remediationProposalDocument?: any | null;
  ticketProposalDocument?: any | null;
} = {}): Promise<TargetRepoFixture> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-investigate-case-"));
  const projectName = "alpha-project";
  const projectPath = path.join(rootPath, projectName);
  const roundDir = "investigations/round-1";
  const artifactPaths = {
    caseResolutionPath: `${roundDir}/case-resolution.json`,
    evidenceIndexPath: "",
    evidenceBundlePath: `${roundDir}/evidence-bundle.json`,
    assessmentPath: `${roundDir}/assessment.json`,
    diagnosisJsonPath: `${roundDir}/diagnosis.json`,
    diagnosisMdPath: `${roundDir}/diagnosis.md`,
    dossierPath: `${roundDir}/dossier.${options.dossierFormat === "json" ? "json" : "md"}`,
    semanticReviewRequestPath: `${roundDir}/${TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT}`,
    semanticReviewResultPath: `${roundDir}/${TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT}`,
    causalDebugRequestPath: `${roundDir}/causal-debug.request.json`,
    causalDebugResultPath: `${roundDir}/causal-debug.result.json`,
    rootCauseReviewRequestPath: `${roundDir}/${TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT}`,
    rootCauseReviewResultPath: `${roundDir}/${TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT}`,
    remediationProposalPath: `${roundDir}/remediation-proposal.json`,
    ticketProposalPath: `${roundDir}/ticket-proposal.json`,
    publicationDecisionPath: `${roundDir}/publication-decision.json`,
  };

  await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "workflows"), { recursive: true });
  await fs.mkdir(path.join(projectPath, roundDir), { recursive: true });

  const manifest =
    options.manifestDocument ??
    (JSON.parse(
      await fs.readFile(path.join(runnerRepoPath, TARGET_INVESTIGATE_CASE_MANIFEST_PATH), "utf8"),
    ) as any);
  if (!options.manifestDocument) {
    manifest.workflows = {
      investigable: ["billing-core"],
    };
    delete manifest.rootCauseReview;
    options.mutateManifest?.(manifest);
    targetInvestigateCaseManifestSchema.parse(manifest);
  }
  await fs.writeFile(
    path.join(projectPath, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const caseResolution = options.caseResolutionDocument ?? buildCaseResolutionFixture();
  options.mutateCaseResolution?.(caseResolution);
  targetInvestigateCaseCaseResolutionSchema.parse(caseResolution);
  await fs.writeFile(
    path.join(projectPath, ...artifactPaths.caseResolutionPath.split("/")),
    `${JSON.stringify(caseResolution, null, 2)}\n`,
    "utf8",
  );

  const evidenceBundle = options.evidenceBundleDocument ?? buildEvidenceBundleFixture();
  options.mutateEvidenceBundle?.(evidenceBundle);
  targetInvestigateCaseEvidenceBundleSchema.parse(evidenceBundle);
  await fs.writeFile(
    path.join(projectPath, ...artifactPaths.evidenceBundlePath.split("/")),
    `${JSON.stringify(evidenceBundle, null, 2)}\n`,
    "utf8",
  );

  const assessment = options.assessmentDocument ?? buildAssessmentFixture();
  options.mutateAssessment?.(assessment);
  targetInvestigateCaseAssessmentSchema.parse(assessment);
  await fs.writeFile(
    path.join(projectPath, ...artifactPaths.assessmentPath.split("/")),
    `${JSON.stringify(assessment, null, 2)}\n`,
    "utf8",
  );

  if (options.diagnosisDocument !== null) {
    const diagnosis =
      options.diagnosisDocument ?? buildDiagnosisFixture(artifactPaths.evidenceBundlePath);
    options.mutateDiagnosis?.(diagnosis);
    targetInvestigateCaseDiagnosisSchema.parse(diagnosis);
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.diagnosisJsonPath.split("/")),
      `${JSON.stringify(diagnosis, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.diagnosisMarkdown !== null) {
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.diagnosisMdPath.split("/")),
      options.diagnosisMarkdown ??
        buildDiagnosisMarkdownFixture({
          verdict: "O caso nao esta OK; o workflow billing-core falhou com evidência suficiente.",
          workflow: "billing-core",
        }),
      "utf8",
    );
  }

  if (options.semanticReviewRequestDocument !== null && options.semanticReviewRequestDocument !== undefined) {
    const semanticReviewRequest =
      options.semanticReviewRequestDocument ?? buildSemanticReviewRequestFixture();
    options.mutateSemanticReviewRequest?.(semanticReviewRequest);
    targetInvestigateCaseSemanticReviewRequestSchema.parse(semanticReviewRequest);
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.semanticReviewRequestPath.split("/")),
      `${JSON.stringify(semanticReviewRequest, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.ticketProposalDocument !== null) {
    const shouldWriteTicketProposal =
      options.ticketProposalDocument !== undefined ||
      assessment.publication_recommendation?.recommended_action === "publish_ticket";
    if (shouldWriteTicketProposal) {
      const ticketProposal =
        options.ticketProposalDocument ?? buildTicketProposalFixture();
      targetInvestigateCaseTicketProposalSchema.parse(ticketProposal);
      await fs.writeFile(
        path.join(projectPath, ...artifactPaths.ticketProposalPath.split("/")),
        `${JSON.stringify(ticketProposal, null, 2)}\n`,
        "utf8",
      );
    }
  }

  if (options.remediationProposalDocument !== null && options.remediationProposalDocument !== undefined) {
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.remediationProposalPath.split("/")),
      `${JSON.stringify(options.remediationProposalDocument, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.semanticReviewResultDocument !== null && options.semanticReviewResultDocument !== undefined) {
    const semanticReviewResult =
      options.semanticReviewResultDocument ?? buildSemanticReviewResultFixture();
    options.mutateSemanticReviewResult?.(semanticReviewResult);
    targetInvestigateCaseSemanticReviewResultSchema.parse(semanticReviewResult);
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.semanticReviewResultPath.split("/")),
      `${JSON.stringify(semanticReviewResult, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.rootCauseReviewRequestDocument !== null && options.rootCauseReviewRequestDocument !== undefined) {
    const rootCauseReviewRequest =
      options.rootCauseReviewRequestDocument ?? buildRootCauseReviewRequestFixture();
    options.mutateRootCauseReviewRequest?.(rootCauseReviewRequest);
    targetInvestigateCaseRootCauseReviewRequestSchema.parse(rootCauseReviewRequest);
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.rootCauseReviewRequestPath.split("/")),
      `${JSON.stringify(rootCauseReviewRequest, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.rootCauseReviewResultDocument !== null && options.rootCauseReviewResultDocument !== undefined) {
    const rootCauseReviewResult =
      options.rootCauseReviewResultDocument ?? buildRootCauseReviewResultFixture();
    options.mutateRootCauseReviewResult?.(rootCauseReviewResult);
    targetInvestigateCaseRootCauseReviewResultSchema.parse(rootCauseReviewResult);
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.rootCauseReviewResultPath.split("/")),
      `${JSON.stringify(rootCauseReviewResult, null, 2)}\n`,
      "utf8",
    );
  }

  if (options.dossierFormat === "json") {
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.dossierPath.split("/")),
      `${JSON.stringify(
        {
          case_ref: "case-001",
          local_path: artifactPaths.dossierPath,
          retention: "30 days",
          summary: "Resumo local e sensivel sob retencao controlada.",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  } else {
    await fs.writeFile(
      path.join(projectPath, ...artifactPaths.dossierPath.split("/")),
      "# dossier\n\nResumo local e sensivel sob retencao controlada.\n",
      "utf8",
    );
  }

  return {
    rootPath,
    project: {
      name: projectName,
      path: projectPath,
    },
    artifactPaths,
  };
};

const buildPilotManifestFixture = (options: {
  mutateManifest?: (manifest: any) => void;
} = {}): any => {
  const manifest = {
    contractVersion: "1.0",
    capability: {
      key: "case-investigation",
      manifestPath: "docs/workflows/target-case-investigation-manifest.json",
      compatibleRunnerFlow: "target-investigate-case",
    },
    entrypoint: {
      command: "npm run case-investigation --",
      scriptPath: "scripts/materialize-case-investigation-round.js",
      defaultReplayMode: "historical-only",
      defaultIncludeWorkflowDebug: false,
    },
    selectors: {
      accepted: ["propertyId", "requestId", "workflow", "window", "runArtifact", "symptom"],
      runnerCaseRefRequired: true,
      attemptResolution: {
        strategy: "explicit-or-null",
        runnerMustNotGuess: true,
        requiredArtifacts: ["case-resolution.json", "assessment.json"],
      },
    },
    investigableWorkflows: [
      "extract_address",
      "extract_condominium_info",
      "extract_inscricao_municipal",
      "extract_matricula_risks_v2",
      "extract_unit_description_structured_v1",
      "extract_value_timeline_v1",
      "extract_construction_timeline_v1",
    ].map((key) => ({
      key,
      supportStatus: "supported",
      publicHttpSelectable: true,
      documentationPath: "docs/specs/example.md",
    })),
    caseResolution: {
      caseRefAuthorities: ["propertyId", "requestId", "runArtifact"],
      attemptRefAuthorities: ["requestId", "runArtifact", "workflow+window"],
      canonicalIdentityMembers: [
        "propertyId",
        "pdfFileName",
        "matriculaNumber",
        "workflow",
        "window",
      ],
      attemptCandidates: {
        discoveryMode: "case-identity",
        selectionPolicy: "no-silent-selection-on-ambiguity",
        historicalEvidenceMayReuseSingleCandidate: true,
      },
      replayReadiness: {
        states: ["prohibited", "incomplete", "ready", "executed"],
        legacyCompatField: "replay_decision",
      },
      noSilentAttemptSelection: true,
    },
    evidenceSurfaces: [
      {
        id: "local-run-bundle",
        kind: "local-artifacts",
        pathPatterns: ["output/local-runs/*.request.json"],
        historicalClosureEligible: true,
        notes: "Bundle local correlacionado por requestId.",
      },
    ],
    collectionStrategies: {
      allowedQueries: ["GET /_meta/extractors"],
      allowedCommands: [
        {
          id: "purge-preview",
          method: "POST",
          path: "/_meta/cache/purge-extractors",
          dryRunRequiredBeforeApply: true,
        },
      ],
      allowedTemplates: [
        "docs/workflows/target-case-investigation-causal-ticket-template.md",
      ],
    },
    phaseOutputs: {
      preflight: {
        artifact: "preflight.json",
        schemaVersion: "case_investigation_preflight_v1",
        requiredFields: [
          "selected_selectors",
          "manifest_path",
          "dossier_local_path",
          "replay_policy_reference",
        ],
      },
      "case-resolution": {
        artifact: "case-resolution.json",
        schemaVersion: "case_resolution_v1",
      },
      "evidence-collection": {
        artifact: "evidence-bundle.json",
        schemaVersion: "evidence_bundle_v1",
      },
      assessment: {
        artifact: "assessment.json",
        schemaVersion: "assessment_v1",
        requiredFields: [
          "primary_taxonomy",
          "operational_class",
          "next_action",
          "blockers",
          "causal_hypothesis",
          "semantic_confirmation",
          "causal_debug",
          "causal_surface",
          "ticket_projection",
          "publication_recommendation",
        ],
        primaryTaxonomyValues: [
          "capability_gap",
          "bug_likely",
          "bug_confirmed",
          "expected_behavior",
          "evidence_missing_or_partial",
        ],
        operationalClassValues: [
          "bundle_not_captured",
          "runtime_surface_unavailable",
          "bug_likely_but_unconfirmed",
        ],
      },
      "causal-debug-request": {
        artifact: "causal-debug.request.json",
        schemaVersion: "causal_debug_request_v1",
      },
      "causal-debug-result": {
        artifact: "causal-debug.result.json",
        schemaVersion: "causal_debug_result_v1",
      },
      "root-cause-review-request": {
        artifact: "root-cause-review.request.json",
        schemaVersion: "root_cause_review_request_v1",
      },
      "root-cause-review-result": {
        artifact: "root-cause-review.result.json",
        schemaVersion: "root_cause_review_result_v1",
      },
      "remediation-proposal": {
        artifact: "remediation-proposal.json",
        schemaVersion: "remediation_proposal_v1",
        requiredFields: [
          "summary",
          "rationale",
          "owner",
          "remediation_scope",
          "execution_readiness",
          "publication_dependency",
          "suggested_fix_surface",
          "evidence_basis",
          "follow_ups",
          "blockers",
        ],
      },
      "ticket-projection": {
        artifact: "ticket-proposal.json",
        schemaVersion: "ticket_proposal_v1",
      },
      publication: {
        artifact: "publication-decision.json",
        schemaVersion: "publication_decision_v1",
        dossierArtifact: "dossier.md",
      },
    },
    semanticReview: {
      owner: "target-project",
      runnerExecutor: "codex-flow-runner",
      artifacts: {
        request: {
          artifact: "semantic-review.request.json",
          schemaVersion: "semantic_review_request_v1",
          requiredFields: [
            "workflow",
            "symptom_selection",
            "symptom_candidates",
            "review_readiness",
            "prompt_contract",
            "target_fields",
            "supporting_refs",
          ],
        },
        result: {
          artifact: "semantic-review.result.json",
          schemaVersion: "semantic_review_result_v1",
          optionalUntilRunnerIntegration: true,
        },
      },
      packetPolicy: {
        declaredSurfacesOnly: true,
        newEvidenceDiscoveryAllowed: false,
        allowRawPayloadEmbedding: false,
        boundedByWorkflowContract: true,
        targetProjectRemainsAssessmentAuthority: true,
        runnerRemainsPublicationAuthority: true,
      },
      recomposition: {
        strategy: "rerun-entrypoint",
        roundRequestIdFlag: "--round-request-id",
        forceFlag: "--force",
        replayMode: "historical-only",
        preserveExistingDossier: true,
      },
      symptoms: {
        selectedField: "symptom",
        selectionField: "symptom_selection",
        candidateField: "symptom_candidates",
        selectionPrecedence: [
          "selected_selectors.symptom",
          "single-strong-bounded-candidate",
        ],
        minimumScopedCandidates: [
          {
            candidateId:
              "extract_address_current_complemento_semantic_truncation_apartamento_n",
            workflow: "extract_address",
            fieldPath: "extract_address.value.current.complemento",
            jsonPointer: "/extract_address/value/current/complemento",
            issueType: "semantic_truncation",
            strength: "strong",
          },
        ],
      },
    },
    causalDebug: {
      owner: "target-project",
      runnerExecutor: "codex-flow-runner",
      promptPath: "docs/workflows/target-case-investigation-causal-debug.md",
      artifacts: {
        request: {
          artifact: "causal-debug.request.json",
          schemaVersion: "causal_debug_request_v1",
        },
        result: {
          artifact: "causal-debug.result.json",
          schemaVersion: "causal_debug_result_v1",
          optionalFields: [
            "minimal_cause.root_cause_classification",
            "minimal_cause.preventable_stage",
            "minimal_cause.remediation_scope",
            "ticket_seed.ticket_scope",
          ],
        },
        ticketProposal: {
          artifact: "ticket-proposal.json",
          schemaVersion: "ticket_proposal_v1",
          optionalFields: [
            "competing_hypotheses",
            "qa_escape",
            "prompt_guardrail_opportunities",
            "ticket_readiness",
            "remaining_gaps",
            "publication_hints.ticket_scope",
            "publication_hints.slug_strategy",
            "publication_hints.quality_gate",
          ],
          qualityGate: "target-ticket-quality-v1",
        },
      },
      debugPolicy: {
        repoReadAllowed: true,
        readableSurfaces: ["code", "prompts", "tests", "docs", "config"],
        externalEvidenceDiscoveryAllowed: false,
        boundedSemanticConfirmationRequired: true,
        targetProjectOwnsMinimalCause: true,
        runnerRemainsPublicationAuthority: true,
        narrativeLanguage: "pt-BR",
      },
      recomposition: {
        strategy: "rerun-entrypoint",
        roundRequestIdFlag: "--round-request-id",
        forceFlag: "--force",
        replayMode: "historical-only",
        preserveExistingDossier: true,
      },
    },
    rootCauseReview: {
      owner: "target-project",
      runnerExecutor: "codex-flow-runner",
      promptPath: "docs/workflows/target-case-investigation-root-cause-review.md",
      artifacts: {
        request: {
          artifact: "root-cause-review.request.json",
          schemaVersion: "root_cause_review_request_v1",
        },
        result: {
          artifact: "root-cause-review.result.json",
          schemaVersion: "root_cause_review_result_v1",
          optionalFields: [
            "competing_hypotheses",
            "qa_escape",
            "prompt_guardrail_opportunities",
            "remaining_gaps",
          ],
        },
        remediationProposal: {
          artifact: "remediation-proposal.json",
          schemaVersion: "remediation_proposal_v1",
          owner: "target-project",
        },
      },
      reviewPolicy: {
        repoReadAllowed: true,
        readableSurfaces: ["code", "prompts", "tests", "docs", "config"],
        externalEvidenceDiscoveryAllowed: false,
        targetProjectOwnsRootCauseDecision: true,
        runnerRemainsPublicationAuthority: true,
        narrativeLanguage: "pt-BR",
      },
      recomposition: {
        strategy: "rerun-entrypoint",
        roundRequestIdFlag: "--round-request-id",
        forceFlag: "--force",
        replayMode: "historical-only",
        preserveExistingDossier: true,
      },
    },
    replayPolicy: {
      explicitReplayRequired: true,
      minimumSafeProfile: {
        updateDb: false,
        dedicatedRequestId: true,
        replayMustBeDeclaredInArtifacts: true,
        includeWorkflowDebug: {
          default: false,
          policy: "safe-only",
          allowedOnlyWhen: ["redacted_or_synthetic_fixture"],
        },
        cacheAndPurge: {
          endpoint: "/_meta/cache/purge-extractors",
          acceptedIdentifiers: [
            "propertyId",
            "pdfFileName",
            "matriculaNumber",
            "transcriptHint",
          ],
          dryRunRequiredBeforeApply: true,
          globalPurgeAllowed: false,
        },
        nonEssentialMutationsForbidden: true,
        forbiddenWritesDuringReplay: ["mongodb", "tickets", "docs", "git"],
        automaticRawArtifactVersioning: false,
        localNamespace: "output/case-investigation/<request-id>/",
        declaredSurfacesOnly: true,
      },
    },
    dossier: {
      localPathTemplate: "output/case-investigation/<request-id>/",
      gitIgnoredBy: "output/",
      retentionPolicy: "manual cleanup after investigator review",
      sensitivity: "local-only; may contain workflow_debug, headers and replay artifacts",
      automaticVersioning: false,
      cleanupTool: {
        scriptPath: "scripts/repo-hygiene-cleanup.js",
        coversNamespace: false,
      },
    },
    operationalReferences: {
      docs: ["docs/workflows/target-case-investigation-runbook.md"],
      templates: [
        "docs/workflows/target-case-investigation-causal-ticket-template.md",
        "tickets/templates/internal-ticket-template.md",
      ],
      scripts: ["scripts/build-golden-workflow-debug-sidecar.js"],
    },
    precedence: {
      layers: [
        { position: 1, name: "resolved case and attempt invariants", customizable: false },
        { position: 2, name: "declared workflow contract", customizable: false },
        { position: 3, name: "request artifacts", customizable: false },
        { position: 4, name: "active decisions", customizable: true },
        { position: 5, name: "goldens and tests", customizable: true },
        { position: 6, name: "historical evidence and replay", customizable: true },
      ],
      customizablePositions: [4, 5, 6],
    },
    ticketPublicationPolicy: {
      internalTicketTemplatePath: "tickets/templates/internal-ticket-template.md",
      causalBlockSourcePath: "docs/workflows/target-case-investigation-causal-ticket-template.md",
      mandatoryCausalBlockSources: ["production-observation"],
      versionedArtifactsDefault: ["ticket"],
      nonVersionedArtifactsDefault: [
        "evidence-bundle.json",
        "workflow_debug",
        "db_payload",
        "transcript",
      ],
      semanticAuthority: "target-project",
      finalPublicationAuthority: "runner",
    },
  } as any;

  options.mutateManifest?.(manifest);
  return manifest;
};

const buildCurrentPilotManifestFixture = (options: {
  mutateManifest?: (manifest: any) => void;
} = {}): any => {
  const manifest = buildPilotManifestFixture();
  manifest.caseResolution.attemptCandidates.currentStateSelection = {
    requiresAlignedFocus: false,
    defaultSelectionBasis: TARGET_INVESTIGATE_CASE_CURRENT_STATE_DEFAULT_SELECTION_BASIS_VALUES[0],
    divergenceRemainsObservable: true,
    latestIneligiblePolicy: TARGET_INVESTIGATE_CASE_CURRENT_STATE_LATEST_INELIGIBLE_POLICY_VALUES[0],
    focusAwareMembers: [...TARGET_INVESTIGATE_CASE_CURRENT_STATE_FOCUS_AWARE_MEMBER_VALUES],
    acceptedExplicitAuthoritiesToBreakAmbiguity: [
      ...TARGET_INVESTIGATE_CASE_CURRENT_STATE_EXPLICIT_AUTHORITY_VALUES,
    ],
  };
  manifest.phaseOutputs.assessment.requiredFields = [
    "primary_taxonomy",
    "operational_class",
    "next_action",
    "blockers",
    "causal_hypothesis",
    "semantic_confirmation",
    "bounded_outcome",
    "causal_debug",
    "root_cause_review",
    "primary_remediation",
    "causal_surface",
    "ticket_projection",
    "publication_recommendation",
  ];
  manifest.phaseOutputs.assessment.boundedOutcomeStatuses = [
    ...TARGET_INVESTIGATE_CASE_BOUNDED_OUTCOME_STATUS_VALUES,
  ];
  manifest.phaseOutputs.assessment.primaryRemediationStatusValues = [
    ...TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_STATUS_VALUES,
  ];
  manifest.phaseOutputs.assessment.primaryRemediationExecutionReadinessValues = [
    ...TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_EXECUTION_READINESS_VALUES,
  ];
  manifest.phaseOutputs.assessment.primaryRemediationPublicationDependencyValues = [
    ...TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_PUBLICATION_DEPENDENCY_VALUES,
  ];
  manifest.semanticReview.packetPolicy.operationalErrorSurface = {
    sourceField: "errors[]",
    workflowBinding: "errors[].key === workflow.key",
    boundedTargetFieldPattern: "errors[<index>]",
    issueType: "contract_mismatch",
  };
  manifest.semanticReview.symptoms.derivedOperationalCandidate = {
    sourceField: "errors[]",
    workflowBinding: "errors[].key === workflow.key",
    candidateIdPattern:
      "<workflow>_top_level_operational_error_<message-slug>_entry_<index>",
    fieldPathPattern: "errors[<index>]",
    jsonPointerPattern: "/errors/<index>",
    symptomPattern: "workflow <workflow> still reports top-level error <message>",
    issueType: "contract_mismatch",
    strength: "strong",
  };
  manifest.causalDebug.analysisStages = [
    "cache/versionamento",
    "prompts do extractor",
    "QA do extractor",
    "pos-processamento deterministico",
    "consolidacao final",
    "cobertura de testes",
  ];
  manifest.causalDebug.debugPolicy.acceptedBoundedOutcomesForReadiness = [
    "semantic_error",
    "workflow_operational_error",
    "semantic_operational_conflict",
  ];
  manifest.rootCauseReview.artifacts.ticketProposal = {
    artifact: "ticket-proposal.json",
    schemaVersion: "ticket_proposal_v1",
    optionalFields: [
      "publication_hints.ticket_scope",
      "publication_hints.slug_strategy",
      "publication_hints.quality_gate",
    ],
    qualityGate: "target-ticket-quality-v1",
  };
  delete manifest.causalDebug.artifacts.ticketProposal;
  delete manifest.rootCauseReview.artifacts.result.optionalFields;
  manifest.rootCauseReview.reviewPolicy = {
    repoReadAllowed: true,
    externalEvidenceDiscoveryAllowed: false,
    causalDebugMustStayComplementary: true,
    acceptedVerdicts: [...TARGET_INVESTIGATE_CASE_ROOT_CAUSE_STATUS_VALUES],
    ticketReadinessValues: ["ready", "needs_more_falsification", "blocked"],
    primaryRemediationCanonicalArtifact:
      TARGET_INVESTIGATE_CASE_PRIMARY_REMEDIATION_CANONICAL_ARTIFACT,
    primaryRemediationProposalArtifact: "remediation-proposal.json",
    remediationFirstNextActionWhenExecutionReady: true,
    ticketReadinessIsNotRemediationVeto: true,
    analysisStages: [...manifest.causalDebug.analysisStages],
    runnerRemainsPublicationAuthority: true,
    narrativeLanguage: "pt-BR",
  };

  options.mutateManifest?.(manifest);
  return manifest;
};

const buildCaseResolutionFixture = (): any => ({
  case_ref: "case-001",
  selectors: {
    workflow: "billing-core",
    request_id: "req-001",
    window: "2026-04-03T00:00Z/2026-04-03T01:00Z",
    symptom: "timeout on save",
  },
  resolved_case: {
    ref: "case-001",
    summary: "Caso produtivo resolvido contra a entidade canonica.",
  },
  attempt_resolution: {
    status: "resolved",
    attempt_ref: "attempt-001",
    reason: "Tentativa historica identificada deterministicamente pelo projeto alvo.",
  },
  relevant_workflows: ["billing-core"],
  replay_decision: {
    status: "used",
    reason: "Replay seguro complementou a causalidade do caso.",
  },
  resolution_reason: "A capability fechou o caso e os seletores sem escolher tentativa provavel por inferencia livre.",
});

const buildRichCaseResolutionFixture = (): any => ({
  schema_version: "case_resolution_v1",
  generated_at: "2026-04-04T18:38:30.743Z",
  official_entrypoint: "npm run case-investigation --",
  dossier_request_id: "2026-04-04T18-36-23Z",
  selected_selectors: {
    requestId: "case_inv_pilot_20260403_183200",
    workflow: "extract_address",
  },
  case_ref_authorities: ["propertyId", "requestId", "runArtifact"],
  attempt_ref_authorities: ["requestId", "runArtifact", "workflow+window"],
  resolved_case: {
    status: "resolved",
    authority: "requestId",
    value: "case_inv_pilot_20260403_183200",
    request_id: "case_inv_pilot_20260403_183200",
    run_artifact: null,
    bundle_refs: {
      request: "output/case-investigation/case_inv_pilot_20260403_183200/requests/main.request.json",
      response: "output/case-investigation/case_inv_pilot_20260403_183200/main.response.json",
      headers: "output/case-investigation/case_inv_pilot_20260403_183200/main.headers.txt",
    },
    resolution_reason: "requestId resolved to a historical local bundle",
  },
  resolved_attempt: {
    authority: "requestId",
    status: "resolved",
    request_id: "case_inv_pilot_20260403_183200",
    run_artifact: null,
    workflow: "extract_address",
    window: null,
    bundle_refs: {
      request: "output/case-investigation/case_inv_pilot_20260403_183200/requests/main.request.json",
      response: "output/case-investigation/case_inv_pilot_20260403_183200/main.response.json",
      headers: "output/case-investigation/case_inv_pilot_20260403_183200/main.headers.txt",
    },
    resolution_reason: "requestId is an explicit attempt authority",
  },
  historical_evidence: {
    bundle_refs: {
      request: "output/case-investigation/case_inv_pilot_20260403_183200/requests/main.request.json",
      response: "output/case-investigation/case_inv_pilot_20260403_183200/main.response.json",
      headers: "output/case-investigation/case_inv_pilot_20260403_183200/main.headers.txt",
    },
    request_found: true,
    response_found: true,
    headers_found: true,
    workflow_matches: true,
    workflow_debug_available: false,
    cache_observability_available: true,
    sufficient: true,
    factual_sufficiency_reason:
      "historical bundle has request, response and headers correlated to the same case without silent inference",
  },
  replay_decision: {
    status: "not-required",
    reason_code: "HISTORICAL_BUNDLE_SUFFICIENT",
    resolution_reason:
      "historical request, response and headers already close the case without replay",
    factual_sufficiency_reason:
      "historical bundle has request, response and headers correlated to the same case without silent inference",
    replay_mode: "historical-only",
    request_id: "2026-04-04T18-36-23Z",
    local_namespace: "output/case-investigation/2026-04-04T18-36-23Z",
    update_db: false,
    include_workflow_debug: false,
    workflow: "extract_address",
    purge_policy: {
      accepted_identifiers: [
        "propertyId",
        "pdfFileName",
        "matriculaNumber",
        "transcriptHint",
      ],
      declared_identifiers: ["pdfFileName", "matriculaNumber"],
      dry_run_required_before_apply: true,
      dry_run_performed: false,
      apply_performed: false,
    },
  },
  ownership_boundary: {
    targetProject: ["official-round-entrypoint"],
    siblingTicket: ["assessment.json"],
    runner: ["publication-decision.json"],
  },
  handoff: {
    preflight_path: "preflight.json",
    pending_artifacts: ["evidence-bundle.json", "assessment.json", "dossier.md"],
    sibling_ticket:
      "tickets/closed/2026-04-03-case-investigation-evidence-assessment-and-causal-ticket-projection-gap.md",
  },
});

const buildEvidenceBundleFixture = (): any => ({
  collection_plan: {
    manifest_path: TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
    strategy_ids: ["canonical-manifest-guided-collection"],
  },
  historical_sources: [
    {
      source_id: "app-logs",
      surface: "logs",
      consulted: true,
    },
  ],
  sensitive_artifact_refs: [
    {
      ref: "evidence-log-001",
      path: "investigations/round-1/evidence/log-001.json",
      sha256: "a".repeat(64),
      record_count: 3,
    },
  ],
  replay: {
    used: true,
    mode: "safe-replay",
    request_id: "replay-001",
    update_db: false,
    include_workflow_debug: null,
    cache_policy: "cache separado por namespace local",
    purge_policy: "purge scoped auditavel",
    namespace: "investigations/case-001",
  },
  collection_sufficiency: "strong",
  normative_conflicts: [],
  factual_sufficiency_reason: "A coleta historica e o replay seguro forneceram evidencia suficiente.",
});

const buildRichEvidenceBundleFixture = (): any => ({
  schema_version: "evidence_bundle_v1",
  generated_at: "2026-04-04T18:38:30.743Z",
  collection_plan: {
    manifest_path: TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
    strategy_ids: ["case-investigation-round"],
  },
  historical_sources: [
    {
      source_id: "local-run-bundle",
      surface: "local-run-bundle",
      consulted: true,
    },
    {
      source_id: "cache-observability",
      surface: "cache-observability",
      consulted: true,
    },
  ],
  surface_catalog: [],
  sensitive_artifact_refs: [
    {
      ref: "local-run-bundle:request",
      path: "output/case-investigation/case_inv_pilot_20260403_183200/requests/main.request.json",
      sha256: "2c9489e40d6d87254177ad73da30f21737619d75365dcaa16964497b8e8e52d9",
      record_count: 1,
    },
    {
      ref: "local-run-bundle:response",
      path: "output/case-investigation/case_inv_pilot_20260403_183200/main.response.json",
      sha256: "064ba4bbe79d2088180dedf9e4f7b1e5d520d0227806a0fe8cb9bf3147df7259",
      record_count: 1,
    },
  ],
  historical_sufficiency_class: "sufficient",
  replay: {
    used: false,
    mode: "historical-only",
    request_id: "2026-04-04T18-36-23Z",
    update_db: null,
    include_workflow_debug: null,
    cache_policy: null,
    purge_policy: null,
    namespace: null,
  },
  collection_sufficiency: "sufficient",
  normative_conflicts: [],
  factual_sufficiency_reason:
    "local request, response and headers stayed correlated to the same attempt without silent inference",
  cache_summary: {
    source: null,
  },
  warning_error_code_candidates: ["ADDRESS_CURRENT_INCOMPLETE"],
});

const buildAssessmentFixture = (): any => ({
  houve_gap_real: "yes",
  era_evitavel_internamente: "yes",
  merece_ticket_generalizavel: "yes",
  confidence: "high",
  evidence_sufficiency: "strong",
  causal_surface: {
    owner: "target-project",
    kind: "bug",
    summary: "Guardrail local falhou de forma reproduzivel.",
    actionable: true,
    systems: ["billing-core"],
  },
  generalization_basis: [
    {
      code: "contract-violation",
      summary: "Violacao clara de comportamento canonicamente documentado.",
    },
  ],
  overfit_vetoes: [],
  ticket_decision_reason: "Ha base de generalizacao explicita e superficie causal local clara.",
  publication_recommendation: {
    recommended_action: "publish_ticket",
    reason: "Caso forte o bastante para ticket automatico conservador.",
    proposed_ticket_scope: "Corrigir o guardrail local no workflow billing-core.",
    suggested_title: "Corrigir guardrail local do billing-core em case-investigation",
  },
});

const buildDiagnosisFixture = (
  bundleArtifactPath = "investigations/round-1/evidence-bundle.json",
  overrides: Record<string, unknown> = {},
): any => ({
  schema_version: "diagnosis_v1",
  bundle_artifact: bundleArtifactPath,
  verdict: "not_ok",
  summary: "O caso nao esta OK e a rodada ja identifica uma superficie local plausivel de correcao.",
  why: "A evidência mostra divergência reproduzível entre o comportamento esperado e o observado.",
  expected_behavior: "O workflow billing-core deve preservar o guardrail local sem truncar o estado final.",
  observed_behavior: "O guardrail local falhou e permitiu uma saida inconsistente para o operador.",
  confidence: "high",
  behavior_to_change: "Repor o guardrail local antes da consolidacao final do billing-core.",
  probable_fix_surface: ["src/workflows/billing-core.ts"],
  evidence_used: [
    {
      ref: "local-bundle",
      path: bundleArtifactPath,
      summary: "Bundle historico curado para o diagnostico.",
    },
  ],
  next_action: "Corrigir a superficie local e rerodar a investigacao para confirmar o diagnostico.",
  lineage: [
    {
      source: "legacy-target-investigate-case",
      artifact: "assessment.json",
      path: "investigations/round-1/assessment.json",
    },
  ],
  ...overrides,
});

const buildEvidenceIndexFixture = (bundleArtifactPath: string): any => ({
  schema_version: "evidence_index_v1",
  bundle_artifact: bundleArtifactPath,
  entries: [
    {
      id: "historical-bundle",
      locator: bundleArtifactPath,
      acquired_via: "manifest-guided-collection",
      relevance: "Bundle curado necessario para responder o caso.",
    },
  ],
  lineage: [
    {
      source: "legacy-target-investigate-case",
      artifact: "evidence-bundle.json",
      path: bundleArtifactPath,
    },
  ],
});

const buildLegacyLineageFixture = (artifact: string, relativePath: string): any[] => [
  {
    source: "legacy-target-investigate-case",
    artifact,
    path: relativePath,
  },
];

const buildV2ArtifactPaths = (roundId: string) => {
  const roundDirectory = `output/case-investigation/${roundId}`;
  return {
    caseResolutionPath: `${roundDirectory}/case-resolution.json`,
    evidenceIndexPath: `${roundDirectory}/evidence-index.json`,
    evidenceBundlePath: `${roundDirectory}/case-bundle.json`,
    assessmentPath: `${roundDirectory}/assessment.json`,
    diagnosisJsonPath: `${roundDirectory}/diagnosis.json`,
    diagnosisMdPath: `${roundDirectory}/diagnosis.md`,
    dossierPath: `${roundDirectory}/dossier.md`,
    semanticReviewRequestPath: `${roundDirectory}/semantic-review.request.json`,
    semanticReviewResultPath: `${roundDirectory}/semantic-review.result.json`,
    causalDebugRequestPath: `${roundDirectory}/causal-debug.request.json`,
    causalDebugResultPath: `${roundDirectory}/causal-debug.result.json`,
    rootCauseReviewRequestPath: `${roundDirectory}/root-cause-review.request.json`,
    rootCauseReviewResultPath: `${roundDirectory}/root-cause-review.result.json`,
    remediationProposalPath: `${roundDirectory}/remediation-proposal.json`,
    ticketProposalPath: `${roundDirectory}/ticket-proposal.json`,
    publicationDecisionPath: `${roundDirectory}/publication-decision.json`,
  };
};

const writeV2ManifestFixture = async (projectPath: string): Promise<void> => {
  const v2Manifest = JSON.parse(
    await fs.readFile(
      path.join(runnerRepoPath, ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/")),
      "utf8",
    ),
  ) as Record<string, unknown>;
  (v2Manifest.workflows as { investigable: string[] }).investigable = ["extract_address"];
  await fs.writeFile(
    path.join(projectPath, ...TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH.split("/")),
    `${JSON.stringify(v2Manifest, null, 2)}\n`,
    "utf8",
  );
  await fs.unlink(path.join(projectPath, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")));
};

const writeV2RoundArtifacts = async (
  projectPath: string,
  artifactPaths: {
    caseResolutionPath: string;
    evidenceIndexPath: string;
    evidenceBundlePath: string;
    assessmentPath: string;
    diagnosisJsonPath: string;
    diagnosisMdPath: string;
    dossierPath: string;
  },
  options: {
    omitCaseResolutionLineage?: boolean;
    omitCaseBundleLineage?: boolean;
  } = {},
): Promise<void> => {
  const roundId = path.posix.basename(path.posix.dirname(artifactPaths.caseResolutionPath));
  const legacyMirrorDirectory = path.posix.join("investigations", roundId);
  const caseResolution = buildCaseResolutionFixture();
  caseResolution.attempt_resolution = {
    status: "absent-explicitly",
    attempt_ref: null,
    reason: "Nao ha tentativa segura para desambiguar o caso.",
  };
  caseResolution.selectors.workflow = "extract_address";
  caseResolution.relevant_workflows = ["extract_address"];
  caseResolution.replay_decision = {
    status: "not-required",
    reason: "Base historica suficiente.",
  };
  if (!options.omitCaseResolutionLineage) {
    caseResolution.lineage = buildLegacyLineageFixture(
      "case-resolution.json",
      `${legacyMirrorDirectory}/case-resolution.json`,
    );
  }
  targetInvestigateCaseCaseResolutionSchema.parse(caseResolution);

  const caseBundle = buildEvidenceBundleFixture();
  caseBundle.collection_plan.manifest_path = TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH;
  caseBundle.replay = {
    used: false,
    mode: "historical-only",
    request_id: null,
    update_db: null,
    include_workflow_debug: null,
    cache_policy: null,
    purge_policy: null,
    namespace: null,
  };
  if (!options.omitCaseBundleLineage) {
    caseBundle.lineage = buildLegacyLineageFixture(
      "evidence-bundle.json",
      `${legacyMirrorDirectory}/evidence-bundle.json`,
    );
  }
  targetInvestigateCaseCaseBundleSchema.parse(caseBundle);

  const assessment = buildAssessmentFixture();
  assessment.houve_gap_real = "no";
  assessment.era_evitavel_internamente = "not_applicable";
  assessment.merece_ticket_generalizavel = "not_applicable";
  assessment.publication_recommendation.recommended_action = "do_not_publish";
  assessment.causal_surface.kind = "expected-behavior";
  assessment.generalization_basis = [];
  targetInvestigateCaseAssessmentSchema.parse(assessment);

  const evidenceIndex = buildEvidenceIndexFixture(artifactPaths.evidenceBundlePath);
  evidenceIndex.lineage = buildLegacyLineageFixture(
    "evidence-bundle.json",
    `${legacyMirrorDirectory}/evidence-bundle.json`,
  );
  targetInvestigateCaseEvidenceIndexSchema.parse(evidenceIndex);

  const diagnosis = buildDiagnosisFixture(artifactPaths.evidenceBundlePath, {
    verdict: "ok",
    summary: "O caso esta OK no contrato v2 e o namespace autoritativo ficou coerente.",
    why: "A evidencia diagnosis-first confirmou comportamento esperado sem depender da cadeia v1.",
    expected_behavior: "O workflow extract_address deve preservar o comportamento esperado.",
    observed_behavior: "A rodada v2 reuniu bundle suficiente e nao encontrou desvio funcional.",
    behavior_to_change: "Nenhuma correcao necessaria para este caso.",
    next_action: "Manter o contrato v2 e seguir sem publication automatica.",
    lineage: buildLegacyLineageFixture(
      "assessment.json",
      `${legacyMirrorDirectory}/assessment.json`,
    ),
  });
  targetInvestigateCaseDiagnosisSchema.parse(diagnosis);

  const writes: Array<[string, string]> = [
    [artifactPaths.caseResolutionPath, `${JSON.stringify(caseResolution, null, 2)}\n`],
    [artifactPaths.evidenceIndexPath, `${JSON.stringify(evidenceIndex, null, 2)}\n`],
    [artifactPaths.evidenceBundlePath, `${JSON.stringify(caseBundle, null, 2)}\n`],
    [artifactPaths.assessmentPath, `${JSON.stringify(assessment, null, 2)}\n`],
    [artifactPaths.diagnosisJsonPath, `${JSON.stringify(diagnosis, null, 2)}\n`],
    [
      artifactPaths.diagnosisMdPath,
      buildDiagnosisMarkdownFixture({
        verdict: "O caso esta OK no contrato v2.",
        workflow: "extract_address",
        expectedBehavior: "Preservar o comportamento esperado no contrato diagnosis-first.",
        evidence:
          "O case-bundle.json e o evidence-index.json autoritativos ficaram coerentes entre si.",
        why: "Nao ha divergencia funcional relevante nesta rodada.",
        behaviorToChange: "Nenhuma correcao necessaria para este caso.",
        probableFixSurface: "N/A",
        nextAction: "Manter o contrato v2 e seguir sem publication automatica.",
      }),
    ],
    [artifactPaths.dossierPath, "# dossier\n\nResumo local do namespace autoritativo v2.\n"],
  ];

  for (const [relativePath, contents] of writes) {
    const absolutePath = path.join(projectPath, ...relativePath.split("/"));
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, contents, "utf8");
  }
};

const buildDiagnosisMarkdownFixture = (overrides: {
  verdict?: string;
  workflow?: string;
  expectedBehavior?: string;
  evidence?: string;
  why?: string;
  behaviorToChange?: string;
  probableFixSurface?: string;
  nextAction?: string;
} = {}): string =>
  [
    "# Veredito",
    overrides.verdict ??
      "O caso nao esta OK; o workflow billing-core falhou com evidência suficiente.",
    "",
    "# Workflow avaliado",
    overrides.workflow ?? "billing-core",
    "",
    "# Objetivo esperado",
    overrides.expectedBehavior ??
      "Preservar o guardrail local e devolver um resultado coerente ao operador.",
    "",
    "# O que a evidência mostra",
    overrides.evidence ??
      "O bundle historico mostra divergência reproduzível entre a saída esperada e a saída observada.",
    "",
    "# Por que o caso está ok ou não está",
    overrides.why ??
      "A resposta observada viola o comportamento esperado e confirma a necessidade de correção local.",
    "",
    "# Comportamento que precisa mudar",
    overrides.behaviorToChange ??
      "O guardrail local precisa voltar a bloquear a saída inconsistente.",
    "",
    "# Superfície provável de correção",
    overrides.probableFixSurface ?? "src/workflows/billing-core.ts",
    "",
    "# Próxima ação",
    overrides.nextAction ??
      "Corrigir a superfície local e rerodar a investigação diagnosis-first.",
    "",
  ].join("\n");

const buildPrimaryRemediationFixture = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  status: "recommended",
  execution_readiness: "ready",
  publication_dependency: "shared",
  source: "causal_debug",
  confidence: "high",
  summary: "fix the reusable semantic bug in extract_address",
  rationale: "the target project already isolated a stable local remediation surface",
  stage: "consolidacao final",
  suggested_fix_surface: ["src/workflows/extract-address.ts"],
  follow_ups: [
    {
      summary: "keep the publication narrative aligned with the target-owned remediation",
      scope: "shared",
    },
  ],
  blockers: [],
  ...overrides,
});

const buildRichAssessmentFixture = (): any => ({
  schema_version: "assessment_v1",
  generated_at: "2026-04-04T18:38:30.743Z",
  houve_gap_real: "no",
  era_evitavel_internamente: "not_applicable",
  merece_ticket_generalizavel: "not_applicable",
  confidence: "medium",
  evidence_sufficiency: "sufficient",
  causal_surface: {
    owner: "target-project",
    kind: "expected-behavior",
    summary: "the local evidence does not show a reusable target-project gap beyond expected behavior",
    actionable: false,
    systems: ["case-investigation", "extract_address"],
  },
  generalization_basis: [],
  overfit_vetoes: [
    {
      code: "no_generalization_basis",
      reason: "the case did not produce a reusable basis strong enough for ticket projection",
      blocking: true,
    },
  ],
  ticket_decision_reason:
    "the current local evidence should not be projected into a generalizable ticket",
  publication_recommendation: {
    recommended_action: "do_not_publish",
    reason:
      "either the case is not a reusable gap or the current evidence would overfit the conclusion",
    proposed_ticket_scope: "hold publication and keep the local dossier as supporting evidence only",
    suggested_title: "Do not publish extract_address ticket yet",
  },
  capability_limits: [
    {
      code: "compare_report_absent",
      summary:
        "no compare report was available for this round, so phase/step corroboration stayed limited to local runtime traces",
    },
  ],
  primary_remediation: buildPrimaryRemediationFixture({
    status: "not_available",
    execution_readiness: "blocked",
    publication_dependency: "publication_only",
    source: "root_cause_review",
    summary: "no primary remediation is recommended for this expected-behavior round",
    rationale:
      "the current local evidence did not justify a reusable remediation beyond preserving the dossier",
    stage: null,
    suggested_fix_surface: [],
    follow_ups: [
      {
        summary: "keep the dossier only as supporting evidence for the operator review",
        scope: "publication_only",
      },
    ],
  }),
  causal_debug: null,
  root_cause_review: null,
  ticket_projection: null,
});

const buildCurrentCaseResolutionFixture = (): any => ({
  schema_version: "case_resolution_v1",
  generated_at: "2026-04-05T22:03:15.476Z",
  official_entrypoint: "npm run case-investigation --",
  dossier_request_id: "case_inv_current_01",
  selected_selectors: {
    propertyId: "case-001",
    workflow: "extract_address",
  },
  case_ref_authorities: ["propertyId", "requestId", "runArtifact"],
  attempt_ref_authorities: ["requestId", "runArtifact", "workflow+window"],
  resolved_case: {
    status: "resolved",
    authority: "propertyId",
    value: "case-001",
    request_id: null,
    run_artifact: null,
    resolution_reason: "fixture resolved the case against propertyId",
  },
  resolved_attempt: {
    authority: null,
    status: "not-required",
    request_id: null,
    run_artifact: null,
    workflow: "extract_address",
    window: null,
    resolution_reason: "fixture kept attempt resolution implicit",
  },
  attempt_candidates: {
    discovery_mode: "case-identity",
    status: "single",
    silent_selection_blocked: false,
    resolution_reason: "fixture exposed one historical attempt candidate",
    selected_for_historical_evidence_request_id: "hist-case",
    candidate_request_ids: ["hist-case"],
    next_step: {
      code: "review_unique_candidate",
      summary: "fixture candidate can support historical evidence directly",
    },
  },
  historical_evidence: {
    factual_sufficiency_reason: "fixture historical evidence remained correlated",
  },
  replay_decision: {
    status: "not-required",
    reason_code: "HISTORICAL_BUNDLE_SUFFICIENT",
    resolution_reason: "fixture historical bundle already closed the case",
    factual_sufficiency_reason: "fixture historical bundle remained sufficient",
    replay_mode: "historical-only",
    request_id: "case_inv_current_01",
    local_namespace: "output/case-investigation/case_inv_current_01",
    update_db: false,
    include_workflow_debug: false,
    workflow: "extract_address",
  },
  replay_readiness: {
    state: "ready",
    required: false,
    summary: "fixture historical evidence already closed the case",
    reason_code: "HISTORICAL_BUNDLE_SUFFICIENT",
    blockers: [],
    next_step: {
      code: "continue_with_historical_evidence",
      summary: "fixture may continue without replay",
    },
  },
});

const buildCurrentAssessmentFixture = (overrides: Record<string, unknown> = {}): any => ({
  schema_version: "assessment_v1",
  generated_at: "2026-04-05T22:52:04.562Z",
  houve_gap_real: "yes",
  era_evitavel_internamente: "yes",
  merece_ticket_generalizavel: "yes",
  confidence: "high",
  evidence_sufficiency: "strong",
  primary_taxonomy: "bug_confirmed",
  operational_class: null,
  next_action: null,
  blockers: [],
  causal_hypothesis: {
    owner: "target-project",
    kind: "bug",
    summary: "fixture deterministic target-project evidence already points to a reusable bug",
    actionable: true,
    systems: ["case-investigation", "extract_address"],
  },
  semantic_confirmation: {
    status: "confirmed_error",
    summary: "bounded semantic review confirmed the workflow error",
    request_status: "ready",
    request_reason_code: "READY",
    result_status: "valid",
    result_verdict: "confirmed_error",
    result_issue_type: "semantic_truncation",
    publication_blocked: false,
  },
  bounded_outcome: {
    status: "semantic_error",
    summary: "bounded semantic review isolated a semantic error without conflicting operational evidence",
    workflow_operational_signal_declared: false,
    deterministic_signal_actionable: false,
    repo_aware_escalation_eligible: false,
  },
  causal_debug: {
    status: "minimal_cause_identified",
    summary: "repo-aware causal debug isolated the minimum local cause",
    request_status: "ready",
    request_reason_code: "READY",
    result_status: "valid",
    result_verdict: "minimal_cause_identified",
    publication_blocked: false,
  },
  causal_surface: {
    owner: "target-project",
    kind: "bug",
    summary: "fixture confirmed a reusable target-project bug",
    actionable: true,
    systems: ["case-investigation", "extract_address"],
  },
  primary_remediation: buildPrimaryRemediationFixture(),
  ticket_projection: {
    status: "ready",
    summary: "ticket projection is ready and stored in ticket-proposal.json for runner-side publication review",
    ticket_proposal_artifact: "ticket-proposal.json",
  },
  root_cause_review: null,
  generalization_basis: [
    {
      code: "semantic_review_confirmed_error",
      summary: "bounded semantic review confirmed the workflow error",
    },
  ],
  overfit_vetoes: [],
  ticket_decision_reason: "fixture has strong bounded evidence and reusable generalization basis",
  publication_recommendation: {
    recommended_action: "publish_ticket",
    reason: "fixture is strong enough for conservative runner-side publication",
    proposed_ticket_scope: "fix the reusable semantic bug in extract_address",
    suggested_title: "Fix extract_address semantic truncation",
  },
  capability_limits: [],
  ...overrides,
});

const buildRootCauseReviewRequestFixture = (overrides: Record<string, unknown> = {}): any => ({
  schema_version: "root_cause_review_request_v1",
  generated_at: "2026-04-06T17:20:00.000Z",
  manifest_path: TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  dossier_local_path: "investigations/round-1/dossier.md",
  workflow: {
    key: "billing-core",
    documentation_path: "docs/specs/example.md",
  },
  selected_selectors: {
    requestId: "req-001",
    workflow: "billing-core",
    symptom: "timeout on save",
  },
  semantic_confirmation: {
    status: "confirmed_error",
    result_verdict: "confirmed_error",
    result_issue_type: "semantic_truncation",
    summary: "bounded semantic review confirmed the workflow error",
  },
  causal_debug: {
    status: "minimal_cause_identified",
    result_verdict: "minimal_cause_identified",
    summary: "repo-aware causal debug isolated the minimum local cause",
  },
  causal_surface: {
    owner: "target-project",
    kind: "bug",
    actionable: true,
    summary: "guardrail local falhou de forma reproduzivel",
  },
  review_readiness: {
    status: "ready",
    reason_code: "READY",
    summary: "root-cause-review repo-aware ready",
  },
  repo_context: {
    prompt_path: "docs/workflows/target-case-investigation-root-cause-review.md",
    documentation_paths: ["docs/specs/example.md"],
    code_paths: ["src/workflows/billing-core.ts"],
    test_paths: ["src/workflows/billing-core.test.ts"],
    ticket_guidance_paths: ["docs/workflows/target-case-investigation-causal-ticket-template.md"],
  },
  supporting_refs: [
    {
      ref: "src/workflows/billing-core.ts",
      path: "src/workflows/billing-core.ts",
      reason: "fixture",
    },
  ],
  review_question:
    "Given the bounded semantic and causal signals, determine whether the root cause is confirmed strongly enough to release ticket publication.",
  expected_result_artifact: {
    artifact: TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
    schema_version: "root_cause_review_result_v1",
  },
  ...overrides,
});

const buildCurrentRootCauseReviewRequestFixture = (
  overrides: Record<string, unknown> = {},
): any => ({
  schema_version: "root_cause_review_request_v1",
  generated_at: "2026-04-06T17:20:00.000Z",
  manifest_path: TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  dossier_local_path: "investigations/round-1/dossier.md",
  workflow: {
    key: "extract_address",
    documentation_path: "docs/specs/example.md",
  },
  review_readiness: {
    status: "ready",
    reason_code: "READY",
    summary: "root-cause-review repo-aware ready",
  },
  source_causal_debug: {
    request_artifact: TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
    result_artifact: TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
    result_status: "valid",
    result_verdict: "minimal_cause_identified",
    summary: "causal-debug confirmou uma causa minima forte o suficiente para revisao adversarial.",
  },
  stage_analysis: [
    {
      stage: "cache/versionamento",
      status: "not_supported",
      summary: "o cache sozinho nao explica a perda semantica principal desta fixture.",
      suspected_paths: ["src/workflows/extract-address.ts"],
    },
    {
      stage: "prompts do extractor",
      status: "competing_signal",
      summary: "o prompt principal ainda compete, mas sem artefato suficiente para vencer a hipotese local.",
      suspected_paths: ["docs/specs/example.md"],
    },
    {
      stage: "QA do extractor",
      status: "leading_signal",
      summary: "o QA nao abriu revisao para o complemento truncado desta fixture.",
      suspected_paths: ["src/workflows/extract-address.ts"],
    },
    {
      stage: "pos-processamento deterministico",
      status: "not_supported",
      summary: "o pos-processamento deterministico nao sustenta a causa minima nesta fixture.",
      suspected_paths: ["src/workflows/extract-address.ts"],
    },
    {
      stage: "consolidacao final",
      status: "competing_signal",
      summary: "a consolidacao ainda compete por promover um candidato ruim sem novo guardrail.",
      suspected_paths: ["src/workflows/extract-address.ts"],
    },
    {
      stage: "cobertura de testes",
      status: "competing_signal",
      summary: "a suite ainda nao cobre a fuga especifica desta fixture.",
      suspected_paths: ["src/workflows/extract-address.test.ts"],
    },
  ],
  competing_hypotheses: [
    {
      stage: "QA do extractor",
      status: "leading",
      hypothesis: "o QA falhou ao revisar o complemento truncado",
      summary: "o fluxo local nao abriu nem aplicou uma correcao adequada para a unidade truncada.",
    },
    {
      stage: "consolidacao final",
      status: "competing",
      hypothesis: "a consolidacao final promoveu um candidato ruim",
      summary: "continua plausivel, mas depende de a truncacao ja existir antes da consolidacao.",
    },
  ],
  review_questions: [
    "Em qual etapa do fluxo do extractor o erro esta surgindo e por que essa etapa domina as alternativas concorrentes?",
    "Por que o QA do proprio extractor nao captou o problema neste fluxo?",
    "O prompt principal ou o prompt de QA precisam de mais clareza ou exemplos para evitar a recorrencia?",
    "Faltam regras deterministicas, warnings ou gatilhos para encaminhar o caso ao QA?",
    "A hipotese vencedora foi falsificada contra as hipoteses concorrentes ou ainda restam lacunas objetivas?",
  ],
  ticket_readiness_rule:
    "ticket_readiness somente pode sair ready quando a causa estiver confirmada e falsificada contra hipoteses concorrentes",
  supporting_refs: [
    {
      path: "src/workflows/extract-address.ts",
      reason: "fixture",
    },
  ],
  expected_result_artifact: {
    artifact: TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
    schema_version: "root_cause_review_result_v1",
  },
  constraints_acknowledged: {
    repo_read_allowed: true,
    external_evidence_discovery_allowed: false,
    final_publication_authority: "runner",
  },
  ...overrides,
});

const buildRootCauseReviewResultFixture = (overrides: Record<string, unknown> = {}): any => ({
  schema_version: "root_cause_review_result_v1",
  generated_at: "2026-04-06T17:21:00.000Z",
  request_artifact: TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
  reviewer: {
    orchestrator: "codex-flow-runner",
    prompt_path: "docs/workflows/target-case-investigation-root-cause-review.md",
    reviewer_label: "codex",
  },
  root_cause_status: "root_cause_confirmed",
  confidence: "high",
  summary: "root cause review confirmed the reusable local cause with enough adversarial evidence",
  ticket_readiness: {
    status: "ready",
    reason_code: "READY",
    summary: "ticket publication may proceed conservatively",
  },
  supporting_refs: [
    {
      path: "src/workflows/billing-core.ts",
      reason: "fixture",
    },
  ],
  constraints_acknowledged: {
    repo_read_allowed: true,
    external_evidence_discovery_allowed: false,
    final_publication_authority: "runner",
  },
  ...overrides,
});

const buildTicketProposalFixture = (overrides: Record<string, unknown> = {}): any => ({
  schema_version: "ticket_proposal_v1",
  generated_at: "2026-04-06T04:20:00.000Z",
  source_assessment_artifact: "assessment.json",
  source_causal_debug_artifact: "causal-debug.result.json",
  recommended_action: "publish_ticket",
  suggested_slug: "fix-extract-address-semantic-truncation",
  suggested_title: "Fix extract_address semantic truncation",
  priority: "P1",
  severity: "S2",
  summary: "fix the reusable semantic bug in extract_address",
  ticket_markdown: "# [TICKET] Fix extract_address semantic truncation\n",
  ...overrides,
});

const buildSemanticReviewRequestFixture = (overrides: Record<string, unknown> = {}): any => ({
  schema_version: "semantic_review_request_v1",
  generated_at: "2026-04-05T15:48:00.000Z",
  manifest_path: TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  dossier_local_path: "investigations/round-1/dossier.md",
  dossier_request_id: "case_inv_semantic_01",
  workflow: {
    key: "billing-core",
    support_status: "supported",
    public_http_selectable: true,
    documentation_path: "docs/specs/example.md",
  },
  selected_selectors: {
    requestId: "req-001",
    workflow: "billing-core",
    symptom: "timeout on save",
  },
  symptom: "timeout on save",
  symptom_selection: {
    source: "operator",
    selected_candidate_id: "billing_core_value_current_status_timeout_on_save",
    selection_reason:
      "operator-provided symptom took precedence over inferred candidates in this bounded packet",
  },
  symptom_candidates: [
    {
      candidate_id: "billing_core_value_current_status_timeout_on_save",
      workflow_key: "billing-core",
      surface_id: "local-run-bundle",
      artifact_path: "investigations/round-1/semantic-source.json",
      field_path: "billing-core.value.current.status",
      json_pointer: "/billing-core/value/current/status",
      symptom: "timeout on save",
      issue_type: "unknown",
      strength: "strong",
      selection_reason: "fixture bounded candidate remained aligned with the operator symptom",
    },
  ],
  review_readiness: {
    status: "ready",
    reason_code: "READY",
    summary: "bounded semantic review ready",
  },
  review_scope: {
    resolved_case_authority: "requestId",
    resolved_attempt_authority: "requestId",
    resolved_attempt_status: "resolved",
    replay_status: "used",
    replay_mode: "safe-replay",
    historical_sufficiency_class: "sufficient",
    evidence_sufficiency: "strong",
  },
  prompt_contract: {
    declared_surfaces_only: true,
    new_evidence_discovery_allowed: false,
    raw_payload_embedding_allowed: false,
    final_assessment_authority: "target-project",
    final_publication_authority: "runner",
  },
  contract_refs: {
    workflow_documentation_path: "docs/specs/example.md",
  },
  review_question:
    "Using only the declared refs, pointers and workflow contract, determine whether the observed output shows a functional error.",
  target_fields: [
    {
      field_path: "billing-core.value.current.status",
      artifact_path: "investigations/round-1/semantic-source.json",
      json_pointer: "/billing-core/value/current/status",
      selection_reason: "bounded target field selected by the target project",
    },
  ],
  supporting_refs: [
    {
      surface_id: "local-run-bundle",
      ref: "local-run-bundle:response",
      path: "investigations/round-1/semantic-source.json",
      sha256: "a".repeat(64),
      record_count: 1,
      selection_reason: "observed workflow response",
      json_pointers: ["/billing-core/value/current/status"],
    },
  ],
  declared_signals: {
    consulted_surfaces: ["local-run-bundle"],
    warning_error_code_candidates: ["LOW_EXTRACTOR_SUCCESS"],
    compare_report_signals: {
      recommended_actions: [],
      transcript_parity_statuses: [],
      phase_step_hints: 0,
    },
    cache_summary: null,
    normative_conflicts: [],
  },
  expected_result_artifact: {
    artifact: TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT,
    schema_version: "semantic_review_result_v1",
  },
  ...overrides,
});

const buildSemanticReviewResultFixture = (): any => ({
  schema_version: "semantic_review_result_v1",
  generated_at: "2026-04-05T15:49:00.000Z",
  request_artifact: TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
  reviewer: {
    orchestrator: "codex-flow-runner",
    reviewer_label: "codex",
  },
  verdict: "confirmed_error",
  issue_type: "semantic_truncation",
  confidence: "high",
  owner_hint: "target-project",
  actionable: true,
  summary: "bounded semantic review confirms the functional mismatch",
  supporting_refs: [
    {
      surface_id: "local-run-bundle",
      ref: "local-run-bundle:response",
      path: "investigations/round-1/semantic-source.json",
      sha256: "a".repeat(64),
      record_count: 1,
      selection_reason: "observed workflow response",
      json_pointers: ["/billing-core/value/current/status"],
    },
  ],
  field_verdicts: [
    {
      field_path: "billing-core.value.current.status",
      json_pointer: "/billing-core/value/current/status",
      verdict: "supports_error",
      summary: "field diverges from the expected target-project contract",
    },
  ],
  constraints_acknowledged: {
    declared_surfaces_only: true,
    new_evidence_discovery_allowed: false,
  },
});

const buildPublicationDecisionFixture = (
  publicationStatus: string,
  overallOutcome: string,
): any => {
  if (publicationStatus === "eligible" && overallOutcome === "ticket-published") {
    return {
      publication_status: publicationStatus,
      overall_outcome: overallOutcome,
      outcome_reason: "Ticket elegivel publicado.",
      gates_applied: ["all"],
      blocked_gates: [],
      versioned_artifact_paths: ["tickets/open/2026-04-03-case.md"],
      ticket_path: "tickets/open/2026-04-03-case.md",
      next_action: "Revisar o ticket publicado.",
    };
  }

  return {
    publication_status: publicationStatus,
    overall_outcome: overallOutcome,
    outcome_reason: "No-op local ou bloqueio conservador.",
    gates_applied: ["all"],
    blocked_gates: publicationStatus === "blocked_by_policy" ? ["policy"] : [],
    versioned_artifact_paths: [],
    ticket_path: null,
    next_action: "Revisar o dossier local.",
  };
};

const copyInvestigationArtifact = async (
  sourceProjectPath: string,
  sourceRelativePath: string,
  targetProjectPath: string,
  targetRelativePath: string,
  options: {
    rewriteDossierLocalPath?: string;
    rewriteDiagnosisBundleArtifact?: string;
  } = {},
): Promise<void> => {
  const sourcePath = path.join(sourceProjectPath, ...sourceRelativePath.split("/"));
  const targetPath = path.join(targetProjectPath, ...targetRelativePath.split("/"));
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  if (options.rewriteDossierLocalPath) {
    const decoded = JSON.parse(await fs.readFile(sourcePath, "utf8")) as {
      local_path?: string;
    };
    decoded.local_path = options.rewriteDossierLocalPath;
    await fs.writeFile(targetPath, `${JSON.stringify(decoded, null, 2)}\n`, "utf8");
    return;
  }

  if (options.rewriteDiagnosisBundleArtifact) {
    const decoded = JSON.parse(await fs.readFile(sourcePath, "utf8")) as {
      bundle_artifact?: string;
    };
    decoded.bundle_artifact = options.rewriteDiagnosisBundleArtifact;
    await fs.writeFile(targetPath, `${JSON.stringify(decoded, null, 2)}\n`, "utf8");
    return;
  }

  await fs.copyFile(sourcePath, targetPath);
};

const fileExists = async (value: string): Promise<boolean> => {
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
};
