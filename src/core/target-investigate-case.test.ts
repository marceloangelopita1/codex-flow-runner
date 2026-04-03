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
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseManifestSchema,
  targetInvestigateCasePublicationDecisionSchema,
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
  assert.match(invalidCapability.reason, /capability/u);
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
  dossierFormat?: "md" | "json";
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
    publicationDecisionPath: `${roundDir}/publication-decision.json`,
  };

  await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "workflows"), { recursive: true });
  await fs.mkdir(path.join(projectPath, roundDir), { recursive: true });

  const manifest = JSON.parse(
    await fs.readFile(path.join(runnerRepoPath, TARGET_INVESTIGATE_CASE_MANIFEST_PATH), "utf8"),
  ) as any;
  manifest.workflows = {
    investigable: ["billing-core"],
  };
  options.mutateManifest?.(manifest);
  targetInvestigateCaseManifestSchema.parse(manifest);
  await fs.writeFile(
    path.join(projectPath, ...TARGET_INVESTIGATE_CASE_MANIFEST_PATH.split("/")),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const caseResolution = buildCaseResolutionFixture();
  options.mutateCaseResolution?.(caseResolution);
  await fs.writeFile(
    path.join(projectPath, ...artifactPaths.caseResolutionPath.split("/")),
    `${JSON.stringify(caseResolution, null, 2)}\n`,
    "utf8",
  );

  const evidenceBundle = buildEvidenceBundleFixture();
  options.mutateEvidenceBundle?.(evidenceBundle);
  targetInvestigateCaseEvidenceBundleSchema.parse(evidenceBundle);
  await fs.writeFile(
    path.join(projectPath, ...artifactPaths.evidenceBundlePath.split("/")),
    `${JSON.stringify(evidenceBundle, null, 2)}\n`,
    "utf8",
  );

  const assessment = buildAssessmentFixture();
  options.mutateAssessment?.(assessment);
  targetInvestigateCaseAssessmentSchema.parse(assessment);
  await fs.writeFile(
    path.join(projectPath, ...artifactPaths.assessmentPath.split("/")),
    `${JSON.stringify(assessment, null, 2)}\n`,
    "utf8",
  );

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
