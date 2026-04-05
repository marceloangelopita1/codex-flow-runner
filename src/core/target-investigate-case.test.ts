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
  targetInvestigateCaseCaseResolutionSchema,
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseManifestSchema,
  targetInvestigateCasePublicationDecisionSchema,
  targetInvestigateCaseSemanticReviewRequestSchema,
  targetInvestigateCaseSemanticReviewResultSchema,
  TARGET_INVESTIGATE_CASE_COMMAND,
  TARGET_INVESTIGATE_CASE_CONFIDENCE_VALUES,
  TARGET_INVESTIGATE_CASE_EVIDENCE_SUFFICIENCY_VALUES,
  TARGET_INVESTIGATE_CASE_EVITABILIDADE_VALUES,
  TARGET_INVESTIGATE_CASE_GENERALIZACAO_VALUES,
  TARGET_INVESTIGATE_CASE_HOUVE_GAP_REAL_VALUES,
  TARGET_INVESTIGATE_CASE_MANIFEST_PATH,
  TARGET_INVESTIGATE_CASE_OVERALL_OUTCOME_VALUES,
  TARGET_INVESTIGATE_CASE_PUBLICATION_STATUS_VALUES,
  TARGET_INVESTIGATE_CASE_RECOMMENDED_ACTION_VALUES,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_VALID_PUBLICATION_COMBINATIONS,
} from "../types/target-investigate-case.js";

const runnerRepoPath = fileURLToPath(new URL("../../", import.meta.url));

interface TargetRepoFixture {
  rootPath: string;
  project: ProjectRef;
  artifactPaths: {
    caseResolutionPath: string;
    evidenceBundlePath: string;
    assessmentPath: string;
    dossierPath: string;
    semanticReviewRequestPath: string;
    semanticReviewResultPath: string;
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

test("loadTargetInvestigateCaseManifest adapta o manifesto rico atual do piloto e preserva as allowlists explicitas", async () => {
  const fixture = await createTargetRepoFixture({
    manifestDocument: buildPilotManifestFixture(),
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

test("assessment.json e publication-decision.json cobrem todos os enums explicitos e rejeitam valores fora do conjunto", () => {
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

  assert.throws(
    () =>
      targetInvestigateCaseAssessmentSchema.parse({
        ...baseAssessment,
        confidence: "unexpected",
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

test("evaluateTargetInvestigateCaseRound marca semantic-review como failed quando o request esta invalido", async () => {
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

  assert.equal(result.tracePayload.semantic_review.status, "failed");
  assert.equal(result.tracePayload.semantic_review.failure_reason, "semantic-review.request.json invalido.");
  assert.equal(result.publicationDecision.publication_status, "not_applicable");
});

test("evaluateTargetInvestigateCaseRound marca semantic-review como failed quando o result esta invalido", async () => {
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

  assert.equal(result.tracePayload.semantic_review.status, "failed");
  assert.equal(result.tracePayload.semantic_review.failure_reason, "semantic-review.result.json invalido.");
  assert.equal(result.publicationDecision.publication_status, "not_applicable");
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
    publicationDecision: result.publicationDecision,
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
    publicationDecision: result.publicationDecision,
    dossierPath: result.artifactPaths.dossierPath,
    semanticReview: result.tracePayload.semantic_review,
  });

  const renderedSummary = renderTargetInvestigateCaseFinalSummary(summary);
  const traceJson = JSON.stringify(tracePayload);
  assert.doesNotMatch(renderedSummary, /workflow_debug|db_payload|transcript/u);
  assert.doesNotMatch(traceJson, /workflow_debug|db_payload|transcript/u);
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
  ]);
  assert.equal(result.summary.versionBoundaryState, "before-versioning");
  assert.deepEqual(
    result.summary.artifactPaths,
    {
      caseResolutionPath: "investigations/2026-04-03T18-00-00Z/case-resolution.json",
      evidenceBundlePath: "investigations/2026-04-03T18-00-00Z/evidence-bundle.json",
      assessmentPath: "investigations/2026-04-03T18-00-00Z/assessment.json",
      dossierPath: "investigations/2026-04-03T18-00-00Z/dossier.md",
      semanticReviewRequestPath:
        "investigations/2026-04-03T18-00-00Z/semantic-review.request.json",
      semanticReviewResultPath:
        "investigations/2026-04-03T18-00-00Z/semantic-review.result.json",
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
  mutateSemanticReviewRequest?: (artifact: any) => void;
  mutateSemanticReviewResult?: (artifact: any) => void;
  dossierFormat?: "md" | "json";
  manifestDocument?: any;
  caseResolutionDocument?: any;
  evidenceBundleDocument?: any;
  assessmentDocument?: any;
  semanticReviewRequestDocument?: any | null;
  semanticReviewResultDocument?: any | null;
} = {}): Promise<TargetRepoFixture> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-investigate-case-"));
  const projectName = "alpha-project";
  const projectPath = path.join(rootPath, projectName);
  const roundDir = "investigations/round-1";
  const artifactPaths = {
    caseResolutionPath: `${roundDir}/case-resolution.json`,
    evidenceBundlePath: `${roundDir}/evidence-bundle.json`,
    assessmentPath: `${roundDir}/assessment.json`,
    dossierPath: `${roundDir}/dossier.${options.dossierFormat === "json" ? "json" : "md"}`,
    semanticReviewRequestPath: `${roundDir}/${TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT}`,
    semanticReviewResultPath: `${roundDir}/${TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_ARTIFACT}`,
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
});

const buildSemanticReviewRequestFixture = (): any => ({
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
