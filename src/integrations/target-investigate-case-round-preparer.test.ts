import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Logger } from "../core/logger.js";
import { parseTargetInvestigateCaseCommand } from "../core/target-investigate-case.js";
import {
  TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
} from "../types/target-investigate-case.js";
import type {
  TargetInvestigateCaseRoundMaterializationCodexClient,
  TargetInvestigateCaseV2StageCodexRequest,
} from "./codex-client.js";
import { GitVersioning } from "./git-client.js";
import { CodexCliTargetInvestigateCaseRoundPreparer } from "./target-investigate-case-round-preparer.js";
import {
  cleanupTargetInvestigateCaseProjectFixture,
  createTargetInvestigateCaseManifest,
  createTargetInvestigateCaseProjectFixture,
  writeTargetInvestigateCaseArtifacts,
  writeTargetInvestigateCaseManifest,
  writeTargetInvestigateCasePromptFiles,
} from "../test-support/target-investigate-case-fixtures.js";

class StubLogger extends Logger {}

class StubCodexClient implements TargetInvestigateCaseRoundMaterializationCodexClient {
  public readonly calls: TargetInvestigateCaseV2StageCodexRequest[] = [];

  constructor(
    private readonly onStage: (
      request: TargetInvestigateCaseV2StageCodexRequest,
    ) => Promise<void> | void,
  ) {}

  async ensureAuthenticated(): Promise<void> {}

  async snapshotInvocationPreferences(): Promise<null> {
    return null;
  }

  forkWithFixedInvocationPreferences(): TargetInvestigateCaseRoundMaterializationCodexClient {
    return this;
  }

  async runTargetInvestigateCaseV2Stage(
    request: TargetInvestigateCaseV2StageCodexRequest,
  ): Promise<{
    output: string;
    promptTemplatePath: string;
    promptText: string;
  }> {
    this.calls.push(request);
    await this.onStage(request);
    return {
      output: `stage:${request.stage}`,
      promptTemplatePath: request.stagePromptPath ?? `[entrypoint-only-stage:${request.stage}]`,
      promptText: `prompt:${request.stage}`,
    };
  }
}

const createRequest = async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();
  await writeTargetInvestigateCasePromptFiles(fixture.project.path);
  const manifest = createTargetInvestigateCaseManifest({
    ticketPublicationPolicy: true,
  });
  await writeTargetInvestigateCaseManifest(fixture.project.path, manifest);

  return {
    fixture,
    request: {
      targetProject: fixture.project,
      normalizedInput: parseTargetInvestigateCaseCommand(
        `/target_investigate_case_v2 ${fixture.project.name} case-001 --workflow billing-core --request-id req-001`,
      ),
      manifest,
      manifestPath: TARGET_INVESTIGATE_CASE_V2_MANIFEST_PATH,
      roundId: fixture.roundId,
      roundDirectory: fixture.roundDirectory,
      artifactPaths: fixture.artifactPaths,
      isCancellationRequested: () => false,
    },
  };
};

test("CodexCliTargetInvestigateCaseRoundPreparer executa apenas resolve-case, assemble-evidence e diagnosis e espelha os artefatos canonicos", async () => {
  const { fixture, request } = await createRequest();

  try {
    const codexClient = new StubCodexClient(async (stageRequest) => {
      if (stageRequest.stage === "diagnosis") {
        await writeTargetInvestigateCaseArtifacts(
          stageRequest.targetProject.path,
          request.artifactPaths,
          {
            verdict: "not_ok",
            ticketProposal: true,
          },
        );
      }
    });

    const preparer = new CodexCliTargetInvestigateCaseRoundPreparer({
      logger: new StubLogger(),
      runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
      createCodexClient: () => codexClient,
      createGitVersioning: () => ({}) as GitVersioning,
    });

    const result = await preparer.prepareRound(request);

    assert.equal(result.status, "prepared");
    if (result.status !== "prepared") {
      return;
    }

    assert.deepEqual(
      codexClient.calls.map((entry) => entry.stage),
      ["resolve-case", "assemble-evidence", "diagnosis"],
    );
    assert.equal(result.ticketPublisher !== null, true);
    assert.equal(
      codexClient.calls.some((entry) =>
        entry.stageArtifacts.some((artifact) => /assessment|dossier|semantic-review/u.test(artifact)),
      ),
      false,
    );

    for (const mirroredFile of [
      "case-resolution.json",
      "evidence-index.json",
      "case-bundle.json",
      "diagnosis.json",
      "diagnosis.md",
      "ticket-proposal.json",
    ]) {
      const mirrorPath = path.join(
        fixture.project.path,
        "investigations",
        fixture.roundId,
        mirroredFile,
      );
      await fs.stat(mirrorPath);
    }
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("CodexCliTargetInvestigateCaseRoundPreparer classifica falha do Codex no milestone v2 correto", async () => {
  const { fixture, request } = await createRequest();

  try {
    const codexClient = new StubCodexClient(async (stageRequest) => {
      if (stageRequest.stage === "diagnosis") {
        throw new Error("Falha simulada no diagnosis.");
      }
    });

    const preparer = new CodexCliTargetInvestigateCaseRoundPreparer({
      logger: new StubLogger(),
      runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
      createCodexClient: () => codexClient,
      createGitVersioning: () => ({}) as GitVersioning,
    });

    const result = await preparer.prepareRound(request);

    assert.equal(result.status, "failed");
    if (result.status !== "failed") {
      return;
    }

    assert.equal(result.failureSurface, "round-materialization");
    assert.equal(result.failureKind, "codex-execution-failed");
    assert.equal(result.failedAtMilestone, "diagnosis");
    assert.match(result.message, /Falha simulada no diagnosis/u);
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});
