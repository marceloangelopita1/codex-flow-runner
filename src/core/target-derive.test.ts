import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "./logger.js";
import {
  ControlledTargetDeriveExecutor,
} from "./target-derive.js";
import { renderTargetCheckupMarkdownReport } from "./target-checkup.js";
import {
  TargetDeriveGapAnalysisCodexClient,
} from "../integrations/codex-client.js";
import {
  GitSyncEvidence,
  GitVersioning,
} from "../integrations/git-client.js";
import { TargetDeriveGitGuard } from "../integrations/target-derive-git-guard.js";
import { ProjectRef } from "../types/project.js";
import {
  TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
  TargetCheckupReport,
} from "../types/target-checkup.js";

class SpyLogger extends Logger {
  override info(): void {}
  override warn(): void {}
  override error(): void {}
}

class StubTargetDeriveCodexClient implements TargetDeriveGapAnalysisCodexClient {
  public readonly outputs: string[];
  public readonly requests: Array<{
    reportJsonPath: string;
    reportMarkdownPath: string;
    reportFactsJson: string;
  }> = [];

  constructor(outputs: string[]) {
    this.outputs = [...outputs];
  }

  async ensureAuthenticated(): Promise<void> {}

  async snapshotInvocationPreferences() {
    return {
      model: "gpt-5.4",
      reasoningEffort: "high",
      speed: "standard" as const,
    };
  }

  forkWithFixedInvocationPreferences(): TargetDeriveGapAnalysisCodexClient {
    return this;
  }

  async runTargetDeriveGapAnalysis(request: {
    reportJsonPath: string;
    reportMarkdownPath: string;
    reportFactsJson: string;
  }) {
    this.requests.push({
      reportJsonPath: request.reportJsonPath,
      reportMarkdownPath: request.reportMarkdownPath,
      reportFactsJson: request.reportFactsJson,
    });

    return {
      output: this.outputs.shift() ?? buildGapAnalysisOutput(),
      promptTemplatePath: "/tmp/prompts/15-target-derive-gaps-idempotent-readiness-materialization.md",
      promptText: "prompt",
    };
  }
}

class StubTargetDeriveGitGuard implements TargetDeriveGitGuard {
  constructor(
    private readonly options: {
      dirtyMessage?: string;
      currentHeadSha?: string | null;
      headParentSha?: string | null;
      lastCommitByPath?: Record<string, string | null>;
    } = {},
  ) {}

  async assertCleanWorkingTree(): Promise<void> {
    if (this.options.dirtyMessage) {
      throw new Error(this.options.dirtyMessage);
    }
  }

  async listChangedPaths(): Promise<string[]> {
    return [];
  }

  async getCurrentBranch(): Promise<string | null> {
    return "main";
  }

  async getHeadSha(): Promise<string | null> {
    return this.options.currentHeadSha ?? "meta456";
  }

  async getHeadParentSha(): Promise<string | null> {
    return this.options.headParentSha ?? "report123";
  }

  async getLastCommitTouchingPath(relativePath: string): Promise<string | null> {
    return this.options.lastCommitByPath?.[relativePath] ?? "meta456";
  }
}

class StubGitVersioning implements GitVersioning {
  public readonly commitRequests: Array<{
    paths: string[];
    subject: string;
    bodyParagraphs: string[];
  }> = [];

  constructor(
    private readonly evidence: GitSyncEvidence | null = {
      commitHash: "derive123",
      upstream: "origin/main",
      commitPushId: "derive123@origin/main",
    },
  ) {}

  async commitTicketClosure(): Promise<void> {
    throw new Error("not used");
  }

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs: string[] = [],
  ): Promise<GitSyncEvidence | null> {
    this.commitRequests.push({
      paths: [...paths],
      subject,
      bodyParagraphs: [...bodyParagraphs],
    });
    return this.evidence;
  }

  async commitCheckupArtifacts(): Promise<null> {
    throw new Error("not used");
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    throw new Error("not used");
  }
}

const createTargetRepoWithReport = async (params: {
  projectName: string;
  stem: string;
  reportFinishedAt?: string;
}): Promise<{
  rootPath: string;
  project: ProjectRef;
  report: TargetCheckupReport;
  reportJsonPath: string;
  reportMarkdownPath: string;
}> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-derive-"));
  const projectPath = path.join(rootPath, params.projectName);
  const reportJsonPath = `docs/checkups/history/${params.stem}.json`;
  const reportMarkdownPath = `docs/checkups/history/${params.stem}.md`;
  const report: TargetCheckupReport = {
    contract_version: "1.0",
    schema_version: "1.0",
    target_project: {
      name: params.projectName,
      path: projectPath,
    },
    started_at_utc: "2026-03-24T22:00:00.000Z",
    finished_at_utc: params.reportFinishedAt ?? "2026-03-24T22:05:00.000Z",
    analyzed_head_sha: "head-start",
    branch: "main",
    working_tree_clean_at_start: true,
    report_commit_sha: "report123",
    report_commit_sha_convention: TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
    artifacts: {
      json_path: reportJsonPath,
      markdown_path: reportMarkdownPath,
    },
    overall_verdict: "valid_for_gap_ticket_derivation",
    dimensions: [
      {
        key: "preparation_integrity",
        label: "integridade do preparo",
        verdict: "ok",
        summary: "ok",
        evidence: [
          {
            code: "prepare-ok",
            status: "ok",
            summary: "Manifesto e relatorio de preparo presentes.",
          },
        ],
        commands: [],
      },
      {
        key: "local_operability",
        label: "operabilidade local",
        verdict: "ok",
        summary: "ok",
        evidence: [
          {
            code: "commands-ok",
            status: "ok",
            summary: "Superficie machine-readable com comandos seguros.",
          },
        ],
        commands: [],
      },
      {
        key: "validation_delivery_health",
        label: "saude de validacao/entrega",
        verdict: "ok",
        summary: "ok",
        evidence: [
          {
            code: "validation-gap",
            status: "gap",
            summary: "O projeto nao expoe script seguro de validacao na superficie local.",
            detail:
              "package.json presente sem script test/check suportado pela allowlist do target_checkup.",
            paths: ["package.json"],
          },
        ],
        commands: [],
      },
      {
        key: "documentation_governance",
        label: "governanca documental",
        verdict: "ok",
        summary: "ok",
        evidence: [],
        commands: [],
      },
      {
        key: "observability",
        label: "observabilidade",
        verdict: "n/a",
        summary: "n/a",
        evidence: [],
        commands: [],
      },
    ],
    editorial_summary_markdown: "### Executive summary\nGap de validacao claramente observavel.",
    derivation_readiness: {
      eligible: true,
      checked_at_utc: params.reportFinishedAt ?? "2026-03-24T22:05:00.000Z",
      expires_at_utc: "2026-04-23T22:05:00.000Z",
      reasons: [],
    },
    gap_derivation: null,
  };

  await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "closed"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "templates"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "checkups", "history"), { recursive: true });
  await fs.writeFile(
    path.join(projectPath, "tickets", "templates", "internal-ticket-template.md"),
    "# template\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(projectPath, reportJsonPath),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(projectPath, reportMarkdownPath),
    renderTargetCheckupMarkdownReport(report),
    "utf8",
  );

  return {
    rootPath,
    project: {
      name: params.projectName,
      path: projectPath,
    },
    report,
    reportJsonPath,
    reportMarkdownPath,
  };
};

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

const createExecutor = (params: {
  project: ProjectRef;
  codexClient: StubTargetDeriveCodexClient;
  gitGuard: StubTargetDeriveGitGuard;
  gitVersioning?: StubGitVersioning;
  now?: () => Date;
}) =>
  new ControlledTargetDeriveExecutor({
    logger: new SpyLogger(),
    targetProjectResolver: {
      resolveProject: async () => ({
        ...params.project,
        eligibleForProjects: true,
      }),
    },
    createCodexClient: () => params.codexClient,
    createGitVersioning: () => params.gitVersioning ?? new StubGitVersioning(),
    createGitGuard: () => params.gitGuard,
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    now: params.now ?? (() => new Date("2026-03-24T23:00:00.000Z")),
  });

test("execute materializa ticket readiness e grava write-back no mesmo changeset", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } = await createTargetRepoWithReport(
    {
      projectName: "alpha-project",
      stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
    },
  );

  try {
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning,
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportMarkdownPath,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.summary.completionMode, "applied");
    assert.equal(result.summary.derivationStatus, "materialized");
    assert.equal(result.summary.touchedTicketPaths.length, 1);
    assert.equal(gitVersioning.commitRequests.length, 1);
    assert.deepEqual(gitVersioning.commitRequests[0]?.paths, [
      reportJsonPath,
      reportMarkdownPath,
      result.summary.touchedTicketPaths[0],
    ]);

    const ticketRaw = await fs.readFile(
      path.join(project.path, result.summary.touchedTicketPaths[0] ?? ""),
      "utf8",
    );
    assert.match(ticketRaw, /- Source: readiness-checkup/u);
    assert.match(ticketRaw, /- Gap fingerprint: readiness-gap\|/u);
    assert.match(ticketRaw, /- Readiness report JSON:/u);
    assert.match(ticketRaw, /- Priority: P0/u);

    const reportRaw = await fs.readFile(path.join(project.path, reportJsonPath), "utf8");
    const report = JSON.parse(reportRaw) as TargetCheckupReport;
    assert.equal(report.gap_derivation?.derivation_status, "materialized");
    assert.equal(report.gap_derivation?.gap_results[0]?.result, "materialized_as_ticket");
    assert.deepEqual(report.gap_derivation?.touched_ticket_paths, result.summary.touchedTicketPaths);

    const markdown = await fs.readFile(path.join(project.path, reportMarkdownPath), "utf8");
    assert.match(markdown, /## Gap derivation/u);
    assert.match(markdown, /materialized_as_ticket/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute faz no-op quando o mesmo report ja possui o mesmo mapeamento derivado", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } = await createTargetRepoWithReport(
    {
      projectName: "alpha-project",
      stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
    },
  );

  try {
    const firstExecutor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning: new StubGitVersioning(),
    });
    const firstResult = await firstExecutor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });
    assert.equal(firstResult.status, "completed");

    const secondGitVersioning = new StubGitVersioning();
    const secondExecutor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "derive123",
        lastCommitByPath: {
          [reportJsonPath]: "derive123",
          [reportMarkdownPath]: "derive123",
        },
      }),
      gitVersioning: secondGitVersioning,
    });

    const secondResult = await secondExecutor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.equal(secondResult.status, "completed");
    assert.equal(secondResult.summary.completionMode, "no-op-existing-mapping");
    assert.equal(secondResult.summary.versioning.status, "no-op");
    assert.equal(secondGitVersioning.commitRequests.length, 0);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute reutiliza ticket aberto equivalente quando surge novo report com o mesmo fingerprint", async () => {
  const first = await createTargetRepoWithReport({
    projectName: "alpha-project",
    stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
  });

  try {
    const firstExecutor = createExecutor({
      project: first.project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [first.reportJsonPath]: "meta456",
          [first.reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning: new StubGitVersioning(),
    });
    const firstResult = await firstExecutor.execute({
      projectName: first.project.name,
      reportPath: first.reportJsonPath,
    });
    assert.equal(firstResult.status, "completed");
    const reusedTicketPath = firstResult.summary.touchedTicketPaths[0];

    const secondStem = "2026-03-25T10-00-00Z-project-readiness-checkup";
    const secondReportJsonPath = `docs/checkups/history/${secondStem}.json`;
    const secondReportMarkdownPath = `docs/checkups/history/${secondStem}.md`;
    const secondReport: TargetCheckupReport = {
      ...(JSON.parse(
        await fs.readFile(path.join(first.project.path, first.reportJsonPath), "utf8"),
      ) as TargetCheckupReport),
      finished_at_utc: "2026-03-25T10:05:00.000Z",
      artifacts: {
        json_path: secondReportJsonPath,
        markdown_path: secondReportMarkdownPath,
      },
      gap_derivation: null,
    };
    await fs.writeFile(
      path.join(first.project.path, secondReportJsonPath),
      `${JSON.stringify(secondReport, null, 2)}\n`,
      "utf8",
    );
    await fs.writeFile(
      path.join(first.project.path, secondReportMarkdownPath),
      renderTargetCheckupMarkdownReport(secondReport),
      "utf8",
    );

    const secondExecutor = createExecutor({
      project: first.project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta789",
        headParentSha: "report123",
        lastCommitByPath: {
          [secondReportJsonPath]: "meta789",
          [secondReportMarkdownPath]: "meta789",
        },
      }),
      gitVersioning: new StubGitVersioning({
        commitHash: "derive789",
        upstream: "origin/main",
        commitPushId: "derive789@origin/main",
      }),
    });

    const secondResult = await secondExecutor.execute({
      projectName: first.project.name,
      reportPath: secondReportMarkdownPath,
    });

    assert.equal(secondResult.status, "completed");
    assert.deepEqual(secondResult.summary.touchedTicketPaths, [reusedTicketPath]);
    assert.equal(secondResult.summary.gapResults[0]?.result, "reused_existing_ticket");

    const ticketRaw = await fs.readFile(
      path.join(first.project.path, reusedTicketPath ?? ""),
      "utf8",
    );
    assert.match(ticketRaw, new RegExp(secondReportJsonPath.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  } finally {
    await cleanupTempRoot(first.rootPath);
  }
});

test("execute cria recorrencia quando ticket equivalente ja esta fechado", async () => {
  const first = await createTargetRepoWithReport({
    projectName: "alpha-project",
    stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
  });

  try {
    const initialExecutor = createExecutor({
      project: first.project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [first.reportJsonPath]: "meta456",
          [first.reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning: new StubGitVersioning(),
    });
    const initialResult = await initialExecutor.execute({
      projectName: first.project.name,
      reportPath: first.reportJsonPath,
    });
    assert.equal(initialResult.status, "completed");
    const previousTicketPath = initialResult.summary.touchedTicketPaths[0] ?? "";
    const previousTicketName = path.basename(previousTicketPath);
    await fs.rename(
      path.join(first.project.path, previousTicketPath),
      path.join(first.project.path, "tickets", "closed", previousTicketName),
    );

    const secondStem = "2026-03-26T10-00-00Z-project-readiness-checkup";
    const secondReportJsonPath = `docs/checkups/history/${secondStem}.json`;
    const secondReportMarkdownPath = `docs/checkups/history/${secondStem}.md`;
    const secondReport: TargetCheckupReport = {
      ...(JSON.parse(
        await fs.readFile(path.join(first.project.path, first.reportJsonPath), "utf8"),
      ) as TargetCheckupReport),
      finished_at_utc: "2026-03-26T10:05:00.000Z",
      artifacts: {
        json_path: secondReportJsonPath,
        markdown_path: secondReportMarkdownPath,
      },
      gap_derivation: null,
    };
    await fs.writeFile(
      path.join(first.project.path, secondReportJsonPath),
      `${JSON.stringify(secondReport, null, 2)}\n`,
      "utf8",
    );
    await fs.writeFile(
      path.join(first.project.path, secondReportMarkdownPath),
      renderTargetCheckupMarkdownReport(secondReport),
      "utf8",
    );

    const recurrenceExecutor = createExecutor({
      project: first.project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta999",
        headParentSha: "report123",
        lastCommitByPath: {
          [secondReportJsonPath]: "meta999",
          [secondReportMarkdownPath]: "meta999",
        },
      }),
      gitVersioning: new StubGitVersioning({
        commitHash: "derive999",
        upstream: "origin/main",
        commitPushId: "derive999@origin/main",
      }),
    });

    const recurrenceResult = await recurrenceExecutor.execute({
      projectName: first.project.name,
      reportPath: secondReportJsonPath,
    });

    assert.equal(recurrenceResult.status, "completed");
    assert.equal(recurrenceResult.summary.gapResults[0]?.result, "materialized_as_ticket");
    assert.notEqual(recurrenceResult.summary.touchedTicketPaths[0], previousTicketPath);

    const ticketRaw = await fs.readFile(
      path.join(first.project.path, recurrenceResult.summary.touchedTicketPaths[0] ?? ""),
      "utf8",
    );
    assert.match(ticketRaw, new RegExp(`- Parent ticket \\(optional\\): tickets/closed/${previousTicketName}`, "u"));
  } finally {
    await cleanupTempRoot(first.rootPath);
  }
});

test("execute registra runner limitation sem abrir ticket no projeto alvo", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } = await createTargetRepoWithReport(
    {
      projectName: "alpha-project",
      stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
    },
  );

  try {
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([
        buildGapAnalysisOutput({
          materializationDecision: "runner_limitation",
          gapType: "runner_limitation",
          remediationSurface: ["codex-flow-runner/src/core/target-derive.ts"],
          closureCriteria: ["Limitacao registrada no proprio runner e removida em follow-up dedicado."],
          fingerprintBasis: [
            "runner_limitation",
            "target_derive_gaps ainda depende de melhoria no runner",
          ],
          evidence: ["A remediacao mora no proprio codex-flow-runner, nao no projeto alvo."],
        }),
      ]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning,
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.equal(result.status, "completed");
    assert.deepEqual(result.summary.touchedTicketPaths, []);
    assert.equal(result.summary.derivationStatus, "not_materialized");
    assert.deepEqual(gitVersioning.commitRequests[0]?.paths, [reportJsonPath, reportMarkdownPath]);

    const reportRaw = await fs.readFile(path.join(project.path, reportJsonPath), "utf8");
    const report = JSON.parse(reportRaw) as TargetCheckupReport;
    assert.equal(
      report.gap_derivation?.gap_results[0]?.result,
      "not_materialized_runner_limitation",
    );
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute publica milestones canonicos e respeita cancelamento cooperativo antes do versionamento", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } =
    await createTargetRepoWithReport({
      projectName: "derive-cancelled",
      stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
    });

  try {
    const milestones: string[] = [];
    const aiStages: string[] = [];
    let cancelRequested = false;
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning,
      now: () => new Date("2026-03-24T23:00:00.000Z"),
    });

    const result = await executor.execute(
      {
        projectName: project.name,
        reportPath: reportJsonPath,
      },
      {
        onMilestone: async (event) => {
          milestones.push(event.milestone);
          if (event.milestone === "materialization") {
            cancelRequested = true;
          }
        },
        onAiExchange: async (event) => {
          aiStages.push(event.stageLabel);
        },
        isCancellationRequested: () => cancelRequested,
      },
    );

    assert.equal(result.status, "cancelled");
    assert.equal(result.summary.cancelledAtMilestone, "materialization");
    assert.deepEqual(milestones, ["preflight", "dedup-prioritization", "materialization"]);
    assert.deepEqual(aiStages, ["deduplicacao/priorizacao"]);
    assert.equal(gitVersioning.commitRequests.length, 0);
    assert.ok(
      result.summary.changedPaths.some((entry) => entry.startsWith("tickets/open/")),
      "expected local derived ticket path in cancelled summary",
    );
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia quando o working tree inicial esta sujo", async () => {
  const { rootPath, project, reportJsonPath } = await createTargetRepoWithReport({
    projectName: "alpha-project",
    stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
  });

  try {
    const executor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        dirtyMessage: "O target_derive_gaps exige working tree limpo antes de iniciar.",
      }),
      gitVersioning: new StubGitVersioning(),
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.deepEqual(result, {
      status: "blocked",
      reason: "working-tree-dirty",
      message: "O target_derive_gaps exige working tree limpo antes de iniciar.",
    });
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia quando o report-path nao e um artefato canonico relativo do checkup", async () => {
  const { rootPath, project } = await createTargetRepoWithReport({
    projectName: "alpha-project",
    stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
  });

  try {
    const codexClient = new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]);
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient,
      gitGuard: new StubTargetDeriveGitGuard(),
      gitVersioning,
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: "README.md",
    });

    assert.deepEqual(result, {
      status: "blocked",
      reason: "report-path-invalid",
      message:
        "O target_derive_gaps aceita apenas artefatos canonicos em docs/checkups/history/.",
    });
    assert.equal(codexClient.requests.length, 0);
    assert.equal(gitVersioning.commitRequests.length, 0);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "open"), []);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "closed"), []);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia quando o report JSON e invalido", async () => {
  const { rootPath, project, reportJsonPath } = await createTargetRepoWithReport({
    projectName: "alpha-project",
    stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
  });

  try {
    await fs.writeFile(path.join(project.path, reportJsonPath), "{invalid-json\n", "utf8");

    const codexClient = new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]);
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient,
      gitGuard: new StubTargetDeriveGitGuard(),
      gitVersioning,
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.reason, "report-invalid");
    assert.match(result.message, /Relatorio JSON invalido/u);
    assert.equal(codexClient.requests.length, 0);
    assert.equal(gitVersioning.commitRequests.length, 0);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "open"), []);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "closed"), []);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia quando o report pertence a outro projeto", async () => {
  const { rootPath, project, reportJsonPath } = await createTargetRepoWithReport({
    projectName: "alpha-project",
    stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
  });

  try {
    const report = JSON.parse(
      await fs.readFile(path.join(project.path, reportJsonPath), "utf8"),
    ) as TargetCheckupReport;
    report.target_project.path = path.join(rootPath, "other-project");
    await fs.writeFile(path.join(project.path, reportJsonPath), `${JSON.stringify(report, null, 2)}\n`);

    const codexClient = new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]);
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient,
      gitGuard: new StubTargetDeriveGitGuard(),
      gitVersioning,
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.deepEqual(result, {
      status: "blocked",
      reason: "report-project-mismatch",
      message:
        "O relatorio referencia outro caminho absoluto de projeto alvo e nao pode ser derivado neste repositorio.",
    });
    assert.equal(codexClient.requests.length, 0);
    assert.equal(gitVersioning.commitRequests.length, 0);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "open"), []);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "closed"), []);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia quando o report expirou para derivacao", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } = await createTargetRepoWithReport(
    {
      projectName: "alpha-project",
      stem: "2026-01-20T22-30-00Z-project-readiness-checkup",
      reportFinishedAt: "2026-01-20T22:35:00.000Z",
    },
  );

  try {
    const codexClient = new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]);
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient,
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning,
      now: () => new Date("2026-03-24T23:00:00.000Z"),
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.equal(result.status, "blocked");
    assert.equal(result.reason, "report-ineligible");
    assert.match(result.message, /report-expired/u);
    assert.equal(codexClient.requests.length, 0);
    assert.equal(gitVersioning.commitRequests.length, 0);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "open"), []);
    assert.deepEqual(await listTicketMarkdownFiles(project.path, "closed"), []);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia quando o repositorio avancou apos o ultimo write-back do report", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } = await createTargetRepoWithReport(
    {
      projectName: "alpha-project",
      stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
    },
  );

  try {
    const initialExecutor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning: new StubGitVersioning(),
    });
    const firstResult = await initialExecutor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });
    assert.equal(firstResult.status, "completed");

    const codexClient = new StubTargetDeriveCodexClient([buildGapAnalysisOutput()]);
    const gitVersioning = new StubGitVersioning();
    const driftedExecutor = createExecutor({
      project,
      codexClient,
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "post-derive-head",
        lastCommitByPath: {
          [reportJsonPath]: "derive123",
          [reportMarkdownPath]: "derive123",
        },
      }),
      gitVersioning,
    });

    const result = await driftedExecutor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.deepEqual(result, {
      status: "blocked",
      reason: "report-drifted",
      message:
        "O repositorio recebeu commit novo depois do ultimo write-back do report; gere um novo /target_checkup antes de derivar novamente.",
    });
    assert.equal(codexClient.requests.length, 0);
    assert.equal(gitVersioning.commitRequests.length, 0);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute cria ticket blocked e registra taxonomia completa de resultados nao materializados", async () => {
  const { rootPath, project, reportJsonPath, reportMarkdownPath } = await createTargetRepoWithReport(
    {
      projectName: "alpha-project",
      stem: "2026-03-24T22-30-00Z-project-readiness-checkup",
    },
  );

  try {
    const gitVersioning = new StubGitVersioning();
    const executor = createExecutor({
      project,
      codexClient: new StubTargetDeriveCodexClient([
        buildGapAnalysisOutputFromGaps([
          buildGapAnalysisGap({
            title: "Dependencia externa bloqueando a validacao",
            materializationDecision: "blocked",
            evidence: ["A execucao depende de credencial externa ainda nao liberada."],
            closureCriteria: ["A credencial externa fica disponivel e o fluxo local passa a ser executavel."],
            fingerprintBasis: [
              "validation_delivery_health",
              "credencial externa indisponivel",
              "surface: infra/credenciais",
            ],
            remediationSurface: ["docs/workflows/credentials.md"],
            validationNotes: ["Aguardando liberacao operacional da credencial."],
            externalDependency: "Liberacao de credencial pela equipe de infraestrutura.",
          }),
          buildGapAnalysisGap({
            title: "Observacao apenas informativa do report",
            materializationDecision: "informational",
            gapType: "documentation",
            checkupDimension: "documentation_governance",
            remediationSurface: ["docs/specs/"],
            evidence: ["O report cita oportunidade editorial sem impacto local acionavel."],
            closureCriteria: ["O proprio report permanece como registro suficiente."],
            fingerprintBasis: [
              "documentation_governance",
              "observacao editorial informativa",
              "surface: docs/specs",
            ],
          }),
          buildGapAnalysisGap({
            title: "Gap ainda sem especificidade suficiente",
            materializationDecision: "insufficient_specificity",
            gapType: "observability",
            checkupDimension: "observability",
            remediationSurface: ["docs/checkups/history/"],
            evidence: ["O checkup sinaliza lacuna, mas ainda sem superficie corretiva observavel."],
            closureCriteria: ["Um novo checkup delimita a superficie local com evidencia objetiva."],
            fingerprintBasis: [
              "observability",
              "falta delimitacao suficiente para ticket",
              "surface: docs/checkups/history",
            ],
          }),
        ]),
      ]),
      gitGuard: new StubTargetDeriveGitGuard({
        currentHeadSha: "meta456",
        headParentSha: "report123",
        lastCommitByPath: {
          [reportJsonPath]: "meta456",
          [reportMarkdownPath]: "meta456",
        },
      }),
      gitVersioning,
    });

    const result = await executor.execute({
      projectName: project.name,
      reportPath: reportJsonPath,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.summary.derivationStatus, "materialized");
    assert.equal(result.summary.touchedTicketPaths.length, 1);
    assert.equal(
      result.summary.gapResults.find((entry) => entry.result === "blocked_ticket_created")?.result,
      "blocked_ticket_created",
    );
    assert.equal(
      result.summary.gapResults.find(
        (entry) => entry.result === "not_materialized_informational",
      )?.result,
      "not_materialized_informational",
    );
    assert.equal(
      result.summary.gapResults.find(
        (entry) => entry.result === "not_materialized_insufficient_specificity",
      )?.result,
      "not_materialized_insufficient_specificity",
    );
    assert.deepEqual(gitVersioning.commitRequests[0]?.paths, [
      reportJsonPath,
      reportMarkdownPath,
      result.summary.touchedTicketPaths[0],
    ]);

    const ticketRaw = await fs.readFile(
      path.join(project.path, result.summary.touchedTicketPaths[0] ?? ""),
      "utf8",
    );
    assert.match(ticketRaw, /- Status: blocked/u);

    const report = JSON.parse(
      await fs.readFile(path.join(project.path, reportJsonPath), "utf8"),
    ) as TargetCheckupReport;
    assert.equal(report.gap_derivation?.gap_results.length, 3);
    assert.ok(
      report.gap_derivation?.gap_results.some(
        (entry) => entry.result === "blocked_ticket_created",
      ),
    );
    assert.ok(
      report.gap_derivation?.gap_results.some(
        (entry) => entry.result === "not_materialized_informational",
      ),
    );
    assert.ok(
      report.gap_derivation?.gap_results.some(
        (entry) => entry.result === "not_materialized_insufficient_specificity",
      ),
    );
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

const listTicketMarkdownFiles = async (
  projectPath: string,
  directory: "open" | "closed",
): Promise<string[]> =>
  (await fs.readdir(path.join(projectPath, "tickets", directory)))
    .filter((entry) => entry.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

const buildGapAnalysisOutput = (overrides?: Partial<{
  title: string;
  summary: string;
  gapType: string;
  checkupDimension: string;
  materializationDecision: string;
  remediationSurface: string[];
  evidence: string[];
  assumptionsDefaults: string[];
  validationNotes: string[];
  closureCriteria: string[];
  fingerprintBasis: string[];
  priority: {
    severity: number;
    frequency: number;
    costOfDelay: number;
    operationalRisk: number;
  };
  externalDependency: string | null;
}>): string =>
  buildGapAnalysisOutputFromGaps([buildGapAnalysisGap(overrides)]);

const buildGapAnalysisOutputFromGaps = (
  gaps: Array<
    Partial<{
      title: string;
      summary: string;
      gapType: string;
      checkupDimension: string;
      materializationDecision: string;
      remediationSurface: string[];
      evidence: string[];
      assumptionsDefaults: string[];
      validationNotes: string[];
      closureCriteria: string[];
      fingerprintBasis: string[];
      priority: {
        severity: number;
        frequency: number;
        costOfDelay: number;
        operationalRisk: number;
      };
      externalDependency: string | null;
    }>
  >,
): string =>
  [
    "[[TARGET_DERIVE_GAP_ANALYSIS]]",
    "```json",
    JSON.stringify(
      {
        summary: "Gap readiness agrupado de forma estruturada.",
        gaps: gaps.map((gap) => buildGapAnalysisGap(gap)),
      },
      null,
      2,
    ),
    "```",
    "[[/TARGET_DERIVE_GAP_ANALYSIS]]",
  ].join("\n");

const buildGapAnalysisGap = (
  overrides?: Partial<{
    title: string;
    summary: string;
    gapType: string;
    checkupDimension: string;
    materializationDecision: string;
    remediationSurface: string[];
    evidence: string[];
    assumptionsDefaults: string[];
    validationNotes: string[];
    closureCriteria: string[];
    fingerprintBasis: string[];
    priority: {
      severity: number;
      frequency: number;
      costOfDelay: number;
      operationalRisk: number;
    };
    externalDependency: string | null;
  }>,
) => ({
  title: overrides?.title ?? "Falta script seguro de validacao local",
  summary:
    overrides?.summary ??
    "O readiness checkup mostrou que o projeto ainda nao expoe comando seguro e observavel para validar entrega local.",
  gapType: overrides?.gapType ?? "validation",
  checkupDimension: overrides?.checkupDimension ?? "validation_delivery_health",
  materializationDecision: overrides?.materializationDecision ?? "materialize",
  remediationSurface: overrides?.remediationSurface ?? ["package.json", "README.md"],
  evidence:
    overrides?.evidence ?? [
      "package.json presente sem script test/check suportado pela allowlist do target_checkup.",
    ],
  assumptionsDefaults:
    overrides?.assumptionsDefaults ?? [
      "O projeto usa package.json como superficie canonica para comandos locais.",
    ],
  validationNotes: overrides?.validationNotes ?? ["Rodar npm test apos declarar o script seguro."],
  closureCriteria:
    overrides?.closureCriteria ?? ["`npm test` conclui com exit code 0 no projeto alvo."],
  fingerprintBasis:
    overrides?.fingerprintBasis ?? [
      "validation_delivery_health",
      "package.json sem script suportado",
      "surface: package.json",
    ],
  priority: overrides?.priority ?? {
    severity: 5,
    frequency: 4,
    costOfDelay: 4,
    operationalRisk: 4,
  },
  externalDependency: overrides?.externalDependency ?? null,
});
