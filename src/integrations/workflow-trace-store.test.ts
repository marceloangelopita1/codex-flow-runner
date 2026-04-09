import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemWorkflowTraceStore } from "./workflow-trace-store.js";

test("FileSystemWorkflowTraceStore grava a trilha do target-investigate-case v2", async () => {
  const projectPath = await fs.mkdtemp(
    path.join(os.tmpdir(), "workflow-trace-store-v2-"),
  );

  try {
    const store = new FileSystemWorkflowTraceStore(projectPath);
    const record = await store.recordTargetFlowTrace({
      flow: "target-investigate-case-v2",
      sourceCommand: "/target_investigate_case_v2",
      targetProjectName: "alpha-project",
      targetProjectPath: "/tmp/alpha-project",
      inputs: {
        canonicalCommand: "/target_investigate_case_v2 alpha-project case-001",
      },
      milestones: [
        {
          milestone: "diagnosis",
          milestoneLabel: "diagnosis",
          message: "Diagnostico diagnosis-first pronto.",
          versionBoundaryState: "before-versioning",
          recordedAtUtc: "2026-04-09T12:00:00.000Z",
        },
      ],
      aiExchanges: [
        {
          stageLabel: "diagnosis",
          promptTemplatePath: "docs/workflows/target-investigate-case-v2-diagnosis.md",
          promptText: "prompt",
          outputText: "output",
        },
      ],
      artifactPaths: [
        "output/case-investigation/2026-04-09T12-00-00Z/case-resolution.json",
        "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
      ],
      versionedArtifactPaths: [],
      outcome: {
        status: "success",
        summary: "Fluxo v2 concluido.",
      },
      recordedAt: new Date("2026-04-09T12:00:00.000Z"),
    });

    const sessionPath = path.join(projectPath, ...record.sessionPath.split("/"));
    const payload = JSON.parse(await fs.readFile(sessionPath, "utf8")) as Record<string, unknown>;

    assert.equal(payload.flow, "target-investigate-case-v2");
    assert.equal(payload.sourceCommand, "/target_investigate_case_v2");
    assert.deepEqual(payload.artifactPaths, [
      "output/case-investigation/2026-04-09T12-00-00Z/case-resolution.json",
      "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
    ]);
    assert.equal(JSON.stringify(payload).includes("/target_investigate_case\""), false);
  } finally {
    await fs.rm(projectPath, { recursive: true, force: true });
  }
});
