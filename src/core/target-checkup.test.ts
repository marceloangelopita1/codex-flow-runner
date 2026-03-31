import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Logger } from "./logger.js";
import {
  ControlledTargetCheckupExecutor,
} from "./target-checkup.js";
import {
  TargetCheckupCodexClient,
  TargetCheckupCodexRequest,
  TargetCheckupCodexResult,
} from "../integrations/codex-client.js";
import {
  GitCheckupPublicationEvidence,
  GitCheckupPublicationRequest,
  GitSyncEvidence,
  GitVersioning,
} from "../integrations/git-client.js";
import { TargetCheckupGitGuard } from "../integrations/target-checkup-git-guard.js";
import { ProjectRef } from "../types/project.js";
import {
  renderTargetPrepareManagedBlockEnd,
  renderTargetPrepareManagedBlockStart,
  resolveTargetPrepareWorkflowCompleteDependencies,
  TARGET_PREPARE_EXACT_COPY_SOURCES,
  TARGET_PREPARE_MANIFEST_PATH,
  TARGET_PREPARE_MERGED_FILE_SOURCES,
  TARGET_PREPARE_REPORT_PATH,
} from "../types/target-prepare.js";
import {
  evaluateTargetCheckupDerivationReadiness,
  TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
  TargetCheckupReport,
} from "../types/target-checkup.js";

class SpyLogger extends Logger {
  override info(): void {}
  override warn(): void {}
  override error(): void {}
}

class StubTargetCheckupCodexClient implements TargetCheckupCodexClient {
  public readonly requests: TargetCheckupCodexRequest[] = [];

  constructor(
    private readonly output = "### Executive summary\nSem inventar fatos.\n",
    private readonly authenticated = true,
  ) {}

  async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated) {
      throw new Error("Codex CLI nao autenticado.");
    }
  }

  async snapshotInvocationPreferences() {
    return {
      model: "gpt-5.4",
      reasoningEffort: "high",
      speed: "standard" as const,
    };
  }

  forkWithFixedInvocationPreferences(): TargetCheckupCodexClient {
    return this;
  }

  async runTargetCheckup(request: TargetCheckupCodexRequest): Promise<TargetCheckupCodexResult> {
    this.requests.push(request);
    return {
      output: this.output,
      promptTemplatePath: "/tmp/prompts/14-target-checkup-readiness-audit.md",
      promptText: "prompt",
    };
  }
}

class StubTargetCheckupGitGuard implements TargetCheckupGitGuard {
  private changedPathsIndex = 0;

  constructor(
    private readonly options: {
      dirtyMessage?: string;
      branch?: string | null;
      headSha?: string | null;
      changedPathsByCall?: string[][];
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
    const value =
      this.options.changedPathsByCall?.[
        Math.min(this.changedPathsIndex, (this.options.changedPathsByCall?.length ?? 1) - 1)
      ] ?? [];
    this.changedPathsIndex += 1;
    return [...value];
  }

  async getCurrentBranch(): Promise<string | null> {
    return this.options.branch ?? "main";
  }

  async getHeadSha(): Promise<string | null> {
    return this.options.headSha ?? "head-start";
  }

  async getHeadParentSha(): Promise<string | null> {
    return this.options.headParentSha ?? "report123";
  }

  async getLastCommitTouchingPath(relativePath: string): Promise<string | null> {
    return this.options.lastCommitByPath?.[relativePath] ?? "meta456";
  }
}

class StubGitVersioning implements GitVersioning {
  public readonly checkupRequests: GitCheckupPublicationRequest[] = [];

  constructor(
    private readonly handler: (
      request: GitCheckupPublicationRequest,
    ) => Promise<GitCheckupPublicationEvidence | null>,
  ) {}

  async commitTicketClosure(): Promise<void> {
    throw new Error("not used");
  }

  async commitAndPushPaths(): Promise<GitSyncEvidence | null> {
    throw new Error("not used");
  }

  async commitCheckupArtifacts(
    request: GitCheckupPublicationRequest,
  ): Promise<GitCheckupPublicationEvidence | null> {
    this.checkupRequests.push(request);
    return this.handler(request);
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    throw new Error("not used");
  }
}

interface CommandRunnerResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  failedToSpawn: boolean;
}

class StubCommandRunner {
  public readonly calls: Array<{ command: string; args: string[]; cwd: string; timeoutMs: number }> =
    [];

  constructor(
    private readonly resultsByCommand: Record<string, CommandRunnerResult>,
  ) {}

  async run(request: {
    command: string;
    args: string[];
    cwd: string;
    timeoutMs: number;
  }): Promise<CommandRunnerResult> {
    this.calls.push({
      command: request.command,
      args: [...request.args],
      cwd: request.cwd,
      timeoutMs: request.timeoutMs,
    });
    return (
      this.resultsByCommand[[request.command, ...request.args].join(" ")] ?? {
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 1,
        failedToSpawn: false,
      }
    );
  }
}

const actualRunnerRepoPath = fileURLToPath(new URL("../../", import.meta.url));

const createPreparedTargetRepo = async (
  projectName: string,
  options: {
    packageJson?: Record<string, unknown>;
    provisionWorkflowRepoSibling?: boolean;
  } = {},
): Promise<{ rootPath: string; project: ProjectRef; runnerRepoPath: string }> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-checkup-"));
  const projectPath = path.join(rootPath, projectName);
  const runnerRepoPath =
    options.provisionWorkflowRepoSibling === false
      ? actualRunnerRepoPath
      : path.join(rootPath, "codex-flow-runner");

  if (options.provisionWorkflowRepoSibling !== false) {
    await fs.symlink(actualRunnerRepoPath, runnerRepoPath, "dir");
  }

  await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "tickets", "closed"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "execplans"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "specs", "templates"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "docs", "workflows"), { recursive: true });

  for (const entry of TARGET_PREPARE_EXACT_COPY_SOURCES) {
    const sourceContent = await fs.readFile(
      path.join(runnerRepoPath, entry.sourceRelativePath),
      "utf8",
    );
    const destinationPath = path.join(projectPath, entry.targetPath);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, sourceContent, "utf8");
  }

  await fs.writeFile(
    path.join(projectPath, TARGET_PREPARE_MANIFEST_PATH),
    `${JSON.stringify(
      {
        targetProject: {
          name: projectName,
          path: projectPath,
        },
        artifacts: {
          manifestPath: TARGET_PREPARE_MANIFEST_PATH,
          reportPath: TARGET_PREPARE_REPORT_PATH,
        },
        workflowCompleteDependencies: resolveTargetPrepareWorkflowCompleteDependencies(
          projectPath,
          runnerRepoPath,
        ),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  const qualityGatesDependency = resolveTargetPrepareWorkflowCompleteDependencies(
    projectPath,
    runnerRepoPath,
  )[0];
  await fs.writeFile(
    path.join(projectPath, TARGET_PREPARE_REPORT_PATH),
    [
      "# target_prepare report",
      "",
      "## Resumo",
      `- Compatível com workflow completo: sim`,
      `- Checklist compartilhado do workflow: ${qualityGatesDependency?.targetRelativePath ?? "n/a"} (${qualityGatesDependency?.accessMode ?? "n/a"})`,
      "",
      "## Dependências do workflow completo",
      qualityGatesDependency
        ? `- ${qualityGatesDependency.artifactId} | ${qualityGatesDependency.accessMode} | target=${qualityGatesDependency.targetRelativePath} | runner=${qualityGatesDependency.sourceRelativePath}`
        : "- n/a",
      "",
    ].join("\n"),
    "utf8",
  );

  for (const entry of TARGET_PREPARE_MERGED_FILE_SOURCES) {
    const sourceContent = (await fs.readFile(
      path.join(runnerRepoPath, entry.sourceRelativePath),
      "utf8",
    )).trim();
    const managedBlock = [
      renderTargetPrepareManagedBlockStart(entry.markerId),
      sourceContent,
      renderTargetPrepareManagedBlockEnd(entry.markerId),
    ].join("\n");
    await fs.writeFile(
      path.join(projectPath, entry.targetPath),
      `# local\n\n${managedBlock}\n`,
      "utf8",
    );
  }

  if (options.packageJson) {
    await fs.writeFile(
      path.join(projectPath, "package.json"),
      `${JSON.stringify(options.packageJson, null, 2)}\n`,
      "utf8",
    );
  }

  return {
    rootPath,
    project: {
      name: projectName,
      path: projectPath,
    },
    runnerRepoPath,
  };
};

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

test("execute usa projeto ativo, gera md+json canonicos e versiona mesmo quando o veredito e invalido", async () => {
  const { rootPath, project, runnerRepoPath } = await createPreparedTargetRepo("active-target");

  try {
    const codexClient = new StubTargetCheckupCodexClient(
      "### Executive summary\nRelatorio editorial derivado apenas dos fatos.\n",
    );
    const gitVersioning = new StubGitVersioning(async (request) => {
      await request.finalizePublishedArtifacts("report123");
      return {
        commitHash: "meta456",
        metadataCommitHash: "meta456",
        reportCommitHash: "report123",
        upstream: "origin/main",
        commitPushId: "meta456@origin/main",
      };
    });

    const executor = new ControlledTargetCheckupExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => {
          throw new Error("resolver nao deveria ser chamado");
        },
      },
      createCodexClient: () => codexClient,
      createGitVersioning: () => gitVersioning,
      createGitGuard: () =>
        new StubTargetCheckupGitGuard({
          changedPathsByCall: [[]],
        }),
      commandRunner: new StubCommandRunner({}),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:30:00.000Z"),
    });

    const result = await executor.execute({
      activeProject: project,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.summary.targetProject.name, "active-target");
    assert.equal(result.summary.overallVerdict, "invalid_for_gap_ticket_derivation");
    assert.equal(result.summary.reportCommitSha, "report123");
    assert.equal(codexClient.requests.length, 1);
    assert.equal(gitVersioning.checkupRequests.length, 1);

    const reportRaw = await fs.readFile(
      path.join(project.path, result.summary.reportJsonPath),
      "utf8",
    );
    const report = JSON.parse(reportRaw) as TargetCheckupReport;
    assert.equal(report.report_commit_sha, "report123");
    assert.equal(
      report.report_commit_sha_convention,
      TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
    );
    assert.equal(report.overall_verdict, "invalid_for_gap_ticket_derivation");
    assert.equal(report.dimensions.length, 5);
    assert.equal(
      report.dimensions.find((dimension) => dimension.key === "preparation_integrity")?.verdict,
      "ok",
    );
    assert.equal(
      report.dimensions.find((dimension) => dimension.key === "local_operability")?.verdict,
      "gap",
    );
    assert.equal(
      report.dimensions.find((dimension) => dimension.key === "validation_delivery_health")
        ?.verdict,
      "gap",
    );

    const markdown = await fs.readFile(
      path.join(project.path, result.summary.reportMarkdownPath),
      "utf8",
    );
    assert.match(markdown, /Report commit SHA: report123/u);
    assert.match(markdown, /### Executive summary/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute registra gap quando o checklist compartilhado nao fica resolvivel pelo caminho canonico", async () => {
  const { rootPath, project, runnerRepoPath } = await createPreparedTargetRepo(
    "missing-workflow-sibling",
    {
      packageJson: {
        packageManager: "npm@10.0.0",
        scripts: {
          check: "echo check",
        },
      },
      provisionWorkflowRepoSibling: false,
    },
  );

  try {
    const executor = new ControlledTargetCheckupExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => ({
          ...project,
          eligibleForProjects: true,
        }),
      },
      createCodexClient: () => new StubTargetCheckupCodexClient(),
      createGitVersioning: () =>
        new StubGitVersioning(async (request) => {
          await request.finalizePublishedArtifacts("report123");
          return {
            commitHash: "meta456",
            metadataCommitHash: "meta456",
            reportCommitHash: "report123",
            upstream: "origin/main",
            commitPushId: "meta456@origin/main",
          };
        }),
      createGitGuard: () =>
        new StubTargetCheckupGitGuard({
          changedPathsByCall: [[]],
        }),
      commandRunner: new StubCommandRunner({
        "npm run check": {
          exitCode: 0,
          stdout: "check ok\n",
          stderr: "",
          durationMs: 11,
          failedToSpawn: false,
        },
      }),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:45:00.000Z"),
    });

    const result = await executor.execute({
      activeProject: null,
      projectName: project.name,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.summary.overallVerdict, "invalid_for_gap_ticket_derivation");

    const reportRaw = await fs.readFile(
      path.join(project.path, result.summary.reportJsonPath),
      "utf8",
    );
    const report = JSON.parse(reportRaw) as TargetCheckupReport;
    const preparationIntegrity = report.dimensions.find(
      (dimension) => dimension.key === "preparation_integrity",
    );
    assert.equal(preparationIntegrity?.verdict, "gap");
    assert.ok(
      preparationIntegrity?.evidence.some(
        (entry) =>
          entry.code === "prepare-workflow-dependency-resolved-workflow-quality-gates" &&
          entry.status === "gap",
      ),
    );
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute resolve alvo explicito, captura comandos declarados e pode concluir com veredito valido", async () => {
  const { rootPath, project, runnerRepoPath } = await createPreparedTargetRepo("explicit-target", {
    packageJson: {
      packageManager: "npm@10.0.0",
      scripts: {
        check: "echo check",
        typecheck: "echo typecheck",
      },
    },
  });

  try {
    const commandRunner = new StubCommandRunner({
      "npm run check": {
        exitCode: 0,
        stdout: "check ok\n",
        stderr: "",
        durationMs: 17,
        failedToSpawn: false,
      },
      "npm run typecheck": {
        exitCode: 0,
        stdout: "typecheck ok\n",
        stderr: "",
        durationMs: 23,
        failedToSpawn: false,
      },
    });
    const executor = new ControlledTargetCheckupExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => ({
          ...project,
          eligibleForProjects: true,
        }),
      },
      createCodexClient: () => new StubTargetCheckupCodexClient(),
      createGitVersioning: () =>
        new StubGitVersioning(async (request) => {
          await request.finalizePublishedArtifacts("report123");
          return {
            commitHash: "meta456",
            metadataCommitHash: "meta456",
            reportCommitHash: "report123",
            upstream: "origin/main",
            commitPushId: "meta456@origin/main",
          };
        }),
      createGitGuard: () =>
        new StubTargetCheckupGitGuard({
          changedPathsByCall: [[], [], []],
        }),
      commandRunner,
      runnerRepoPath,
      now: () => new Date("2026-03-24T23:00:00.000Z"),
    });

    const result = await executor.execute({
      activeProject: null,
      projectName: "explicit-target",
    });

    assert.equal(result.status, "completed");
    assert.equal(result.summary.overallVerdict, "valid_for_gap_ticket_derivation");
    assert.deepEqual(
      commandRunner.calls.map((entry) => [entry.command, ...entry.args].join(" ")),
      ["npm run check", "npm run typecheck"],
    );

    const reportRaw = await fs.readFile(
      path.join(project.path, result.summary.reportJsonPath),
      "utf8",
    );
    const report = JSON.parse(reportRaw) as TargetCheckupReport;
    assert.equal(report.overall_verdict, "valid_for_gap_ticket_derivation");
    assert.equal(
      report.dimensions.find((dimension) => dimension.key === "validation_delivery_health")
        ?.verdict,
      "ok",
    );
    assert.equal(
      report.dimensions.find((dimension) => dimension.key === "validation_delivery_health")
        ?.commands.length,
      2,
    );
    assert.equal(report.derivation_readiness.eligible, true);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia o target_checkup quando o working tree inicial esta sujo", async () => {
  const { rootPath, project, runnerRepoPath } = await createPreparedTargetRepo("dirty-target");

  try {
    const executor = new ControlledTargetCheckupExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => ({
          ...project,
          eligibleForProjects: true,
        }),
      },
      createCodexClient: () => new StubTargetCheckupCodexClient(),
      createGitVersioning: () =>
        new StubGitVersioning(async () => {
          throw new Error("nao esperado");
        }),
      createGitGuard: () =>
        new StubTargetCheckupGitGuard({
          dirtyMessage: "O target_checkup exige working tree limpo antes de iniciar.",
        }),
      commandRunner: new StubCommandRunner({}),
      runnerRepoPath,
    });

    const result = await executor.execute({
      activeProject: null,
      projectName: "dirty-target",
    });

    assert.deepEqual(result, {
      status: "blocked",
      reason: "working-tree-dirty",
      message: "O target_checkup exige working tree limpo antes de iniciar.",
    });
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute aborta sem publicacao quando um comando descoberto altera o working tree", async () => {
  const { rootPath, project, runnerRepoPath } = await createPreparedTargetRepo("mutating-target", {
    packageJson: {
      packageManager: "npm@10.0.0",
      scripts: {
        check: "echo check",
      },
    },
  });

  try {
    const gitVersioning = new StubGitVersioning(async () => {
      throw new Error("nao esperado");
    });
    const executor = new ControlledTargetCheckupExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => ({
          ...project,
          eligibleForProjects: true,
        }),
      },
      createCodexClient: () => new StubTargetCheckupCodexClient(),
      createGitVersioning: () => gitVersioning,
      createGitGuard: () =>
        new StubTargetCheckupGitGuard({
          changedPathsByCall: [["dist/generated.js"]],
        }),
      commandRunner: new StubCommandRunner({
        "npm run check": {
          exitCode: 0,
          stdout: "check ok\n",
          stderr: "",
          durationMs: 9,
          failedToSpawn: false,
        },
      }),
      runnerRepoPath,
    });

    const result = await executor.execute({
      activeProject: null,
      projectName: "mutating-target",
    });

    assert.equal(result.status, "failed");
    assert.match(result.message, /alterou o working tree/u);
    assert.equal(gitVersioning.checkupRequests.length, 0);

    const historyDir = path.join(project.path, "docs", "checkups", "history");
    await assert.rejects(() => fs.readdir(historyDir), /ENOENT/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("evaluateTargetCheckupDerivationReadiness valida idade, drift e cadeia do report_commit_sha", () => {
  const report: TargetCheckupReport = {
    contract_version: "1.0",
    schema_version: "1.0",
    target_project: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    started_at_utc: "2026-03-24T22:00:00.000Z",
    finished_at_utc: "2026-03-24T22:05:00.000Z",
    analyzed_head_sha: "head-start",
    branch: "main",
    working_tree_clean_at_start: true,
    report_commit_sha: "report123",
    report_commit_sha_convention: TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
    artifacts: {
      json_path: "docs/checkups/history/report.json",
      markdown_path: "docs/checkups/history/report.md",
    },
    overall_verdict: "valid_for_gap_ticket_derivation",
    dimensions: [
      {
        key: "preparation_integrity",
        label: "integridade do preparo",
        verdict: "ok",
        summary: "ok",
        evidence: [],
        commands: [],
      },
      {
        key: "local_operability",
        label: "operabilidade local",
        verdict: "ok",
        summary: "ok",
        evidence: [],
        commands: [],
      },
      {
        key: "validation_delivery_health",
        label: "saude de validacao/entrega",
        verdict: "ok",
        summary: "ok",
        evidence: [],
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
    editorial_summary_markdown: "### Executive summary\nok",
    derivation_readiness: {
      eligible: true,
      checked_at_utc: "2026-03-24T22:05:00.000Z",
      expires_at_utc: "2026-04-23T22:05:00.000Z",
      reasons: [],
    },
  };

  const valid = evaluateTargetCheckupDerivationReadiness(report, {
    now: new Date("2026-03-25T00:00:00.000Z"),
    currentHeadSha: "meta456",
    reportLastCommitSha: "meta456",
    reportLastCommitParentSha: "report123",
  });
  assert.equal(valid.eligible, true);

  const drifted = evaluateTargetCheckupDerivationReadiness(report, {
    now: new Date("2026-03-25T00:00:00.000Z"),
    currentHeadSha: "new-head",
    reportLastCommitSha: "meta456",
    reportLastCommitParentSha: "report123",
  });
  assert.equal(drifted.eligible, false);
  assert.ok(drifted.reasons.includes("head-drifted-after-report"));

  const expired = evaluateTargetCheckupDerivationReadiness(report, {
    now: new Date("2026-05-01T00:00:00.000Z"),
    currentHeadSha: "meta456",
    reportLastCommitSha: "meta456",
    reportLastCommitParentSha: "report123",
  });
  assert.equal(expired.eligible, false);
  assert.ok(expired.reasons.includes("report-expired"));

  const brokenChain = evaluateTargetCheckupDerivationReadiness(report, {
    now: new Date("2026-03-25T00:00:00.000Z"),
    currentHeadSha: "meta456",
    reportLastCommitSha: "meta456",
    reportLastCommitParentSha: "other-commit",
  });
  assert.equal(brokenChain.eligible, false);
  assert.ok(brokenChain.reasons.includes("report-commit-chain-broken"));
});

test("execute publica milestones canonicos e respeita cancelamento cooperativo antes do versionamento", async () => {
  const { rootPath, project, runnerRepoPath } = await createPreparedTargetRepo("checkup-cancelled", {
    packageJson: {
      scripts: {
        test: "echo ok",
      },
    },
  });

  try {
    const reportJsonPath =
      "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.json";
    const reportMarkdownPath =
      "docs/checkups/history/2026-03-24T22-30-00Z-project-readiness-checkup.md";
    const milestones: string[] = [];
    const aiStages: string[] = [];
    let cancelRequested = false;
    const executor = new ControlledTargetCheckupExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => ({
          ...project,
          eligibleForProjects: true,
        }),
      },
      createCodexClient: () => new StubTargetCheckupCodexClient(),
      createGitVersioning: () =>
        new StubGitVersioning(async () => ({
          commitHash: "meta456",
          reportCommitHash: "report123",
          metadataCommitHash: "meta456",
          upstream: "origin/main",
          commitPushId: "meta456@origin/main",
        })),
      createGitGuard: () =>
        new StubTargetCheckupGitGuard({
          changedPathsByCall: [[reportJsonPath, reportMarkdownPath]],
        }),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:30:00.000Z"),
      commandRunner: new StubCommandRunner({
        "npm run test": {
          exitCode: 0,
          stdout: "ok",
          stderr: "",
          durationMs: 1,
          failedToSpawn: false,
        },
      }),
    });

    const result = await executor.execute(
      {
        activeProject: project,
      },
      {
        onMilestone: async (event) => {
          milestones.push(event.milestone);
          if (event.milestone === "editorial-summary") {
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
    assert.equal(result.summary.cancelledAtMilestone, "editorial-summary");
    assert.deepEqual(milestones, ["preflight", "evidence-collection", "editorial-summary"]);
    assert.deepEqual(aiStages, ["sintese/redacao"]);
    assert.deepEqual(result.summary.changedPaths, [reportJsonPath, reportMarkdownPath]);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});
