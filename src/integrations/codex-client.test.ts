import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { Logger } from "../core/logger.js";
import type { RuntimeShellGuidance } from "./runtime-shell-guidance.js";
import { CodexCliTicketFlowClient } from "./codex-client.js";
import {
  buildArtifactPaths,
  createTargetInvestigateCaseProjectFixture,
  cleanupTargetInvestigateCaseProjectFixture,
} from "../test-support/target-investigate-case-fixtures.js";

class StubLogger extends Logger {}

const runnerRepoPath = "/home/mapita/projetos/codex-flow-runner";
const runnerReference = "codex-flow-runner@local";

const runtimeShellGuidance: RuntimeShellGuidance = {
  text: "shell-guidance",
  homePath: "/home/mapita",
  nodeExecutablePath: process.execPath,
  nodeBinPath: path.dirname(process.execPath),
  npmExecutablePath: "/usr/bin/npm",
  codexExecutablePath: "/usr/bin/codex",
  isSnapCodex: false,
  hostGitExecutablePath: null,
  hostGitExecPath: null,
  hostGhExecutablePath: null,
};

const targetOwnedStageCases = [
  {
    stage: "resolve-case",
    promptPath: "docs/workflows/target-investigate-case-v2-resolve-case.md",
    artifacts: ["case-resolution.json"],
    entrypointCommand: "npm run target-investigate-case-v2:resolve-case",
    entrypointScriptPath: "scripts/resolve-case.mjs",
    requiredArtifactPathKeys: ["caseResolutionPath"],
  },
  {
    stage: "assemble-evidence",
    promptPath: "docs/workflows/target-investigate-case-v2-assemble-evidence.md",
    artifacts: ["evidence-index.json", "case-bundle.json"],
    entrypointCommand: "npm run target-investigate-case-v2:assemble-evidence",
    entrypointScriptPath: "scripts/assemble-evidence.mjs",
    requiredArtifactPathKeys: ["evidenceIndexPath", "evidenceBundlePath"],
  },
  {
    stage: "diagnosis",
    promptPath: "docs/workflows/target-investigate-case-v2-diagnosis.md",
    artifacts: ["diagnosis.md", "diagnosis.json"],
    entrypointCommand: "npm run target-investigate-case-v2:diagnosis",
    entrypointScriptPath: "scripts/diagnosis.mjs",
    requiredArtifactPathKeys: ["diagnosisMdPath", "diagnosisJsonPath"],
  },
] as const;

test("runTargetInvestigateCaseV2Stage executa estagios target-owned no cwd do target preservando contexto do runner", async () => {
  for (const stageCase of targetOwnedStageCases) {
    const fixture = await createTargetInvestigateCaseProjectFixture({
      projectName: `alpha-project-${stageCase.stage}`,
    });

    try {
      let capturedPromptTemplatePath = "";
      const capturedCodexRequests: Array<{ cwd: string; prompt: string }> = [];
      const client = new CodexCliTicketFlowClient(runnerRepoPath, new StubLogger(), {
        loadPromptTemplate: async (filePath) => {
          capturedPromptTemplatePath = filePath;
          return [
            "Manifest: <TARGET_INVESTIGATE_CASE_MANIFEST_PATH>",
            "Runbook: <TARGET_INVESTIGATE_CASE_RUNBOOK_PATH>",
            "Stage: <TARGET_INVESTIGATE_CASE_STAGE>",
            "Prompt: <TARGET_INVESTIGATE_CASE_STAGE_PROMPT_PATH>",
            "Artifacts: <TARGET_INVESTIGATE_CASE_STAGE_ARTIFACTS_JSON>",
            "Paths: <TARGET_INVESTIGATE_CASE_ARTIFACT_PATHS_JSON>",
            "Facts: <TARGET_INVESTIGATE_CASE_FACTS_JSON>",
          ].join("\n");
        },
        runCodexCommand: async (request) => {
          capturedCodexRequests.push(request);
          return {
            stdout: "ok",
            stderr: "",
          };
        },
        runCodexExecJsonCommand: async () => ({ stdout: "", stderr: "" }),
        runCodexAuthStatusCommand: async () => ({ stdout: "authenticated", stderr: "" }),
        resolvePlanDirectoryName: async () => "execplans",
        buildRuntimeShellGuidance: () => runtimeShellGuidance,
      });

      const artifactPaths = buildArtifactPaths(fixture.roundDirectory);
      const result = await client.runTargetInvestigateCaseV2Stage({
        targetProject: fixture.project,
        runnerRepoPath,
        runnerReference,
        manifestPath: "docs/workflows/target-case-investigation-v2-manifest.json",
        runbookPath: "docs/workflows/target-case-investigation-v2-runbook.md",
        officialTargetEntrypointCommand: "npm run target-investigate-case-v2",
        officialTargetEntrypointScriptPath: "scripts/investigate-case-v2.mjs",
        canonicalCommand:
          `/target_investigate_case_v2 ${fixture.project.name} case-001 ` +
          "--workflow billing-core --request-id req-001",
        roundId: fixture.roundId,
        roundDirectory: fixture.roundDirectory,
        artifactPaths,
        stage: stageCase.stage,
        stagePromptPath: stageCase.promptPath,
        stageArtifacts: [...stageCase.artifacts],
        stageEntrypointCommand: stageCase.entrypointCommand,
        stageEntrypointScriptPath: stageCase.entrypointScriptPath,
      });

      assert.equal(capturedCodexRequests.length, 1, stageCase.stage);
      const capturedCodexRequest = capturedCodexRequests[0];
      assert.ok(capturedCodexRequest, stageCase.stage);
      assert.equal(capturedCodexRequest.cwd, fixture.project.path, stageCase.stage);
      assert.notEqual(capturedCodexRequest.cwd, runnerRepoPath, stageCase.stage);
      assert.equal(
        capturedPromptTemplatePath,
        path.join(fixture.project.path, stageCase.promptPath),
      );
      assert.equal(result.promptTemplatePath, capturedPromptTemplatePath);

      const capturedPrompt = capturedCodexRequest.prompt;
      assert.match(capturedPrompt, /target-investigate-case v2/u);
      assert.ok(capturedPrompt.includes(runnerRepoPath), stageCase.stage);
      assert.ok(capturedPrompt.includes(runnerReference), stageCase.stage);
      assert.ok(capturedPrompt.includes(fixture.roundId), stageCase.stage);
      assert.ok(capturedPrompt.includes(fixture.roundDirectory), stageCase.stage);
      assert.ok(
        capturedPrompt.includes("docs/workflows/target-case-investigation-v2-manifest.json"),
        stageCase.stage,
      );
      assert.ok(
        capturedPrompt.includes("docs/workflows/target-case-investigation-v2-runbook.md"),
        stageCase.stage,
      );
      assert.ok(capturedPrompt.includes(stageCase.promptPath), stageCase.stage);
      assert.ok(capturedPrompt.includes(JSON.stringify(artifactPaths, null, 2)), stageCase.stage);
      assert.ok(capturedPrompt.includes(`"stage": "${stageCase.stage}"`), stageCase.stage);
      for (const artifact of stageCase.artifacts) {
        assert.ok(capturedPrompt.includes(artifact), `${stageCase.stage}:${artifact}`);
      }
      for (const pathKey of stageCase.requiredArtifactPathKeys) {
        assert.ok(
          capturedPrompt.includes(artifactPaths[pathKey]),
          `${stageCase.stage}:${pathKey}`,
        );
      }
    } finally {
      await cleanupTargetInvestigateCaseProjectFixture(fixture);
    }
  }
});

test("runTargetInvestigateCaseV2Stage injeta contexto diagnosis-first sem surfaces legadas", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    let capturedPrompt = "";
    const client = new CodexCliTicketFlowClient(fixture.project.path, new StubLogger(), {
      loadPromptTemplate: async () =>
        [
          "Manifest: <TARGET_INVESTIGATE_CASE_MANIFEST_PATH>",
          "Stage: <TARGET_INVESTIGATE_CASE_STAGE>",
          "Prompt: <TARGET_INVESTIGATE_CASE_STAGE_PROMPT_PATH>",
          "Artifacts: <TARGET_INVESTIGATE_CASE_STAGE_ARTIFACTS_JSON>",
          "Paths: <TARGET_INVESTIGATE_CASE_ARTIFACT_PATHS_JSON>",
          "Facts: <TARGET_INVESTIGATE_CASE_FACTS_JSON>",
        ].join("\n"),
      runCodexCommand: async ({ prompt }) => {
        capturedPrompt = prompt;
        return {
          stdout: "ok",
          stderr: "",
        };
      },
      runCodexExecJsonCommand: async () => ({ stdout: "", stderr: "" }),
      runCodexAuthStatusCommand: async () => ({ stdout: "authenticated", stderr: "" }),
      resolvePlanDirectoryName: async () => "execplans",
      buildRuntimeShellGuidance: () => runtimeShellGuidance,
    });

    const artifactPaths = buildArtifactPaths(fixture.roundDirectory);
    const result = await client.runTargetInvestigateCaseV2Stage({
      targetProject: fixture.project,
      runnerRepoPath,
      runnerReference,
      manifestPath: "docs/workflows/target-case-investigation-v2-manifest.json",
      runbookPath: "docs/workflows/target-case-investigation-v2-runbook.md",
      officialTargetEntrypointCommand: "npm run target-investigate-case-v2",
      officialTargetEntrypointScriptPath: "scripts/investigate-case-v2.mjs",
      canonicalCommand:
        `/target_investigate_case_v2 ${fixture.project.name} case-001 ` +
        "--workflow billing-core --request-id req-001",
      roundId: fixture.roundId,
      roundDirectory: fixture.roundDirectory,
      artifactPaths,
      stage: "diagnosis",
      stagePromptPath: "docs/workflows/target-investigate-case-v2-diagnosis.md",
      stageArtifacts: ["diagnosis.md", "diagnosis.json"],
      stageEntrypointCommand: "npm run target-investigate-case-v2:diagnosis",
      stageEntrypointScriptPath: "scripts/diagnosis.mjs",
    });

    assert.equal(
      result.promptTemplatePath,
      path.join(fixture.project.path, "docs/workflows/target-investigate-case-v2-diagnosis.md"),
    );
    assert.match(capturedPrompt, /target-investigate-case v2/u);
    assert.match(capturedPrompt, /"stage": "diagnosis"/u);
    assert.match(capturedPrompt, /"stageArtifacts": \[\n\s+"diagnosis.md",\n\s+"diagnosis.json"/u);
    assert.match(capturedPrompt, /\/target_investigate_case_v2/u);
    assert.doesNotMatch(capturedPrompt, /assessment\.json/u);
    assert.doesNotMatch(capturedPrompt, /dossier/u);
    assert.doesNotMatch(capturedPrompt, /semantic-review/u);
    assert.doesNotMatch(capturedPrompt, /causal-debug/u);
    assert.doesNotMatch(capturedPrompt, /root-cause-review/u);
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("runTargetInvestigateCaseV2Stage suporta etapa entrypoint-only sem depender do prompt monolitico legado", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    let capturedPrompt = "";
    const client = new CodexCliTicketFlowClient(fixture.project.path, new StubLogger(), {
      loadPromptTemplate: async () => {
        throw new Error("Nao deveria carregar template externo nesta etapa.");
      },
      runCodexCommand: async ({ prompt }) => {
        capturedPrompt = prompt;
        return {
          stdout: "ok",
          stderr: "",
        };
      },
      runCodexExecJsonCommand: async () => ({ stdout: "", stderr: "" }),
      runCodexAuthStatusCommand: async () => ({ stdout: "authenticated", stderr: "" }),
      resolvePlanDirectoryName: async () => "execplans",
      buildRuntimeShellGuidance: () => runtimeShellGuidance,
    });

    const result = await client.runTargetInvestigateCaseV2Stage({
      targetProject: fixture.project,
      runnerRepoPath,
      runnerReference,
      manifestPath: "docs/workflows/target-case-investigation-v2-manifest.json",
      canonicalCommand: `/target_investigate_case_v2 ${fixture.project.name} case-001`,
      roundId: fixture.roundId,
      roundDirectory: fixture.roundDirectory,
      artifactPaths: buildArtifactPaths(fixture.roundDirectory),
      stage: "resolve-case",
      stagePromptPath: null,
      stageArtifacts: ["case-resolution.json"],
      stageEntrypointCommand: "npm run target-investigate-case-v2:resolve-case",
      stageEntrypointScriptPath: null,
    });

    assert.equal(result.promptTemplatePath, "[entrypoint-only-stage:resolve-case]");
    assert.match(capturedPrompt, /Execute somente a etapa resolve-case/u);
    assert.doesNotMatch(capturedPrompt, /16-target-investigate-case-round-materialization/u);
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});
