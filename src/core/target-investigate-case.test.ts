import assert from "node:assert/strict";
import test from "node:test";
import {
  ControlledTargetInvestigateCaseExecutor,
  evaluateTargetInvestigateCaseRound,
  loadTargetInvestigateCaseManifest,
  parseTargetInvestigateCaseCommand,
  renderTargetInvestigateCaseCommand,
} from "./target-investigate-case.js";
import { TARGET_INVESTIGATE_CASE_V2_COMMAND } from "../types/target-investigate-case.js";
import {
  cleanupTargetInvestigateCaseProjectFixture,
  createTargetInvestigateCaseManifest,
  createTargetInvestigateCaseProjectFixture,
  writeTargetInvestigateCaseArtifacts,
  writeTargetInvestigateCaseManifest,
  writeTargetInvestigateCasePromptFiles,
} from "../test-support/target-investigate-case-fixtures.js";

test("parseTargetInvestigateCaseCommand aceita apenas o contrato v2 canonico", () => {
  const command =
    `${TARGET_INVESTIGATE_CASE_V2_COMMAND} alpha-project case-001 ` +
    `--workflow billing-core --request-id req-001 --window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z ` +
    `--symptom "Timeout on save"`;

  const parsed = parseTargetInvestigateCaseCommand(command);

  assert.equal(parsed.projectName, "alpha-project");
  assert.equal(parsed.caseRef, "case-001");
  assert.equal(
    renderTargetInvestigateCaseCommand(parsed),
    command,
  );
  assert.throws(
    () => parseTargetInvestigateCaseCommand("/target_investigate_case alpha-project case-001"),
    /Comando invalido/u,
  );
});

test("loadTargetInvestigateCaseManifest carrega apenas o manifesto v2 canonico", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );

    const loaded = await loadTargetInvestigateCaseManifest(fixture.project.path);
    assert.equal(loaded.status, "loaded");
    if (loaded.status !== "loaded") {
      return;
    }

    assert.equal(loaded.manifest.command, TARGET_INVESTIGATE_CASE_V2_COMMAND);
    assert.equal(loaded.manifest.flow, "target-investigate-case-v2");
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("evaluateTargetInvestigateCaseRound produz summary diagnosis-first sem superfícies pré-v2", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );
    await writeTargetInvestigateCaseArtifacts(fixture.project.path, fixture.artifactPaths, {
      verdict: "not_ok",
      ticketProposal: false,
    });

    const result = await evaluateTargetInvestigateCaseRound({
      targetProject: fixture.project,
      input:
        `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001 " +
        '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
      artifacts: fixture.artifactPaths,
    });

    assert.equal(result.summary.diagnosis.verdict, "not_ok");
    assert.equal(result.summary.publication_status, "not_applicable");
    assert.equal(result.publicationDecision.overall_outcome, "inconclusive-case");
    assert.equal(result.summary.diagnosis.bundle_artifact, fixture.artifactPaths.evidenceBundlePath);
    assert.equal(result.tracePayload.investigation.outcome, "actionable-remediation-identified");
    assert.equal("assessmentPath" in result.artifactPaths, false);
    assert.equal("dossierPath" in result.artifactPaths, false);
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("ControlledTargetInvestigateCaseExecutor executa apenas os milestones v2 do caminho minimo", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );

    const milestones: string[] = [];
    const executor = new ControlledTargetInvestigateCaseExecutor({
      targetProjectResolver: {
        resolveProject: async () => ({
          ...fixture.project,
          eligibleForProjects: true,
        }),
      },
      roundPreparer: {
        prepareRound: async (request) => {
          await writeTargetInvestigateCaseArtifacts(request.targetProject.path, request.artifactPaths, {
            verdict: "ok",
            ticketProposal: false,
          });
          return {
            status: "prepared",
            ticketPublisher: null,
          };
        },
      },
      now: () => new Date("2026-04-09T12:00:00.000Z"),
    });

    const result = await executor.execute(
      {
        input:
          `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
          "--workflow billing-core --request-id req-001 " +
          '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
      },
      {
        onMilestone: (event) => {
          milestones.push(event.milestone);
        },
      },
    );

    assert.equal(result.status, "completed");
    if (result.status !== "completed") {
      return;
    }

    assert.deepEqual(milestones, [
      "preflight",
      "resolve-case",
      "assemble-evidence",
      "diagnosis",
    ]);
    assert.equal(result.summary.finalSummary.diagnosis.verdict, "ok");
    assert.equal(
      result.summary.canonicalCommand,
      `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001 " +
        '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
    );
    assert.equal(
      result.summary.realizedArtifactPaths.some((entry) => /assessment|dossier/u.test(entry)),
      false,
    );
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("ControlledTargetInvestigateCaseExecutor conclui com warnings quando envelopes target-owned divergem", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );

    const executor = new ControlledTargetInvestigateCaseExecutor({
      targetProjectResolver: {
        resolveProject: async () => ({
          ...fixture.project,
          eligibleForProjects: true,
        }),
      },
      roundPreparer: {
        prepareRound: async (request) => {
          await writeTargetInvestigateCaseArtifacts(request.targetProject.path, request.artifactPaths, {
            verdict: "ok",
            divergentResponseEnvelopes: true,
            diagnosisJsonConfidence: "medium_high",
            ticketProposal: false,
          });
          return {
            status: "prepared",
            ticketPublisher: null,
          };
        },
      },
      now: () => new Date("2026-04-09T12:00:00.000Z"),
    });

    const result = await executor.execute({
      input:
        `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001 " +
        '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
    });

    assert.equal(result.status, "completed");
    if (result.status !== "completed") {
      return;
    }

    assert.equal(result.summary.finalSummary.diagnosis.verdict, "ok");
    assert.deepEqual(
      result.summary.artifactInspectionWarnings?.map((entry) => entry.artifactLabel),
      ["evidence-index.json", "case-bundle.json", "diagnosis.json"],
    );
    assert.equal(
      result.summary.artifactInspectionWarnings?.every((entry) =>
        entry.artifactPath.startsWith(fixture.roundDirectory),
      ),
      true,
    );
    for (const artifactPath of [
      fixture.artifactPaths.caseResolutionPath,
      fixture.artifactPaths.evidenceIndexPath,
      fixture.artifactPaths.evidenceBundlePath,
      fixture.artifactPaths.diagnosisJsonPath,
      fixture.artifactPaths.diagnosisMdPath,
    ]) {
      assert.equal(result.summary.realizedArtifactPaths.includes(artifactPath), true);
    }
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("evaluateTargetInvestigateCaseRound nao aceita veredito fora da enum em diagnosis.json divergente", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );
    await writeTargetInvestigateCaseArtifacts(fixture.project.path, fixture.artifactPaths, {
      diagnosisMdVerdict: "inconclusive",
      diagnosisJsonVerdict: "medium_high",
      divergentResponseEnvelopes: true,
      ticketProposal: false,
    });

    const result = await evaluateTargetInvestigateCaseRound({
      targetProject: fixture.project,
      input:
        `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001 " +
        '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
      artifacts: fixture.artifactPaths,
    });

    assert.equal(result.summary.diagnosis.verdict, "inconclusive");
    assert.notEqual(result.summary.diagnosis.verdict, "medium_high");
    assert.equal(
      result.artifactInspectionWarnings.some(
        (entry) => entry.artifactLabel === "diagnosis.json",
      ),
      true,
    );
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("ControlledTargetInvestigateCaseExecutor aceita blocker explicito sem diagnosis.md nem diagnosis.json", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );

    const executor = new ControlledTargetInvestigateCaseExecutor({
      targetProjectResolver: {
        resolveProject: async () => ({
          ...fixture.project,
          eligibleForProjects: true,
        }),
      },
      roundPreparer: {
        prepareRound: async (request) => {
          await writeTargetInvestigateCaseArtifacts(request.targetProject.path, request.artifactPaths, {
            explicitBlocker: true,
            omitDiagnosisJson: true,
            omitDiagnosisMd: true,
            ticketProposal: false,
          });
          return {
            status: "prepared",
            ticketPublisher: null,
          };
        },
      },
      now: () => new Date("2026-04-09T12:00:00.000Z"),
    });

    const result = await executor.execute({
      input:
        `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001 " +
        '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
    });

    assert.equal(result.status, "completed");
    if (result.status !== "completed") {
      return;
    }

    assert.equal(result.summary.finalSummary.diagnosis.verdict, "inconclusive");
    assert.match(result.summary.finalSummary.next_action, /Coletar a evidencia ausente/u);
    assert.equal(
      result.summary.artifactInspectionWarnings?.some(
        (entry) =>
          entry.artifactLabel === "diagnosis.json" && entry.kind === "artifact-missing",
      ),
      true,
    );
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("ControlledTargetInvestigateCaseExecutor falha sem diagnostico nem blocker explicito", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        includePublicationStage: false,
        ticketPublicationPolicy: false,
      }),
    );

    const executor = new ControlledTargetInvestigateCaseExecutor({
      targetProjectResolver: {
        resolveProject: async () => ({
          ...fixture.project,
          eligibleForProjects: true,
        }),
      },
      roundPreparer: {
        prepareRound: async (request) => {
          await writeTargetInvestigateCaseArtifacts(request.targetProject.path, request.artifactPaths, {
            omitDiagnosisJson: true,
            omitDiagnosisMd: true,
            ticketProposal: false,
          });
          return {
            status: "prepared",
            ticketPublisher: null,
          };
        },
      },
      now: () => new Date("2026-04-09T12:00:00.000Z"),
    });

    const result = await executor.execute({
      input:
        `${TARGET_INVESTIGATE_CASE_V2_COMMAND} ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001 " +
        '--window 2026-04-09T00:00:00Z/2026-04-09T01:00:00Z --symptom "Timeout on save"',
    });

    assert.equal(result.status, "failed");
    if (result.status !== "failed") {
      return;
    }

    assert.equal(result.summary?.failureSurface, "round-evaluation");
    assert.match(result.message, /diagnostico util nem blocker explicito/u);
    assert.match(result.summary?.nextAction ?? "", /diagnosis-first/u);
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});
