import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Logger } from "./logger.js";
import { ControlledTargetPrepareExecutor } from "./target-prepare.js";
import {
  TargetPrepareCodexClient,
  TargetPrepareCodexRequest,
  TargetPrepareCodexResult,
} from "../integrations/codex-client.js";
import { GitSyncEvidence, GitVersioning } from "../integrations/git-client.js";
import { TargetPrepareGitGuard } from "../integrations/target-prepare-git-guard.js";
import {
  resolveTargetPrepareWorkflowCompleteDependencies,
  TargetPrepareResolvedProject,
  TARGET_PREPARE_EXACT_COPY_SOURCES,
  TARGET_PREPARE_MANIFEST_PATH,
  TARGET_PREPARE_MERGED_FILE_SOURCES,
  TARGET_PREPARE_REPORT_PATH,
  renderTargetPrepareManagedBlockEnd,
  renderTargetPrepareManagedBlockStart,
} from "../types/target-prepare.js";

class SpyLogger extends Logger {
  override info(): void {}
  override warn(): void {}
  override error(): void {}
}

class StubTargetPrepareCodexClient implements TargetPrepareCodexClient {
  public readonly requests: TargetPrepareCodexRequest[] = [];

  constructor(
    private readonly handler: (request: TargetPrepareCodexRequest) => Promise<void> | void,
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

  forkWithFixedInvocationPreferences(): TargetPrepareCodexClient {
    return this;
  }

  async runTargetPrepare(request: TargetPrepareCodexRequest): Promise<TargetPrepareCodexResult> {
    this.requests.push(request);
    await this.handler(request);
    return {
      output: "Arquivos canônicos sincronizados e blocos gerenciados mesclados.",
      promptTemplatePath: "/tmp/prompts/13-target-prepare-controlled-onboarding.md",
      promptText: "prompt",
    };
  }
}

class StubTargetPrepareGitGuard implements TargetPrepareGitGuard {
  private changedPathsIndex = 0;
  private headShaIndex = 0;

  constructor(
    private readonly changedPathsByCall: string[][],
    private readonly options: {
      dirtyMessage?: string;
      branch?: string | null;
      headShas?: Array<string | null>;
    } = {},
  ) {}

  async assertCleanWorkingTree(): Promise<void> {
    if (this.options.dirtyMessage) {
      throw new Error(this.options.dirtyMessage);
    }
  }

  async listChangedPaths(): Promise<string[]> {
    const value =
      this.changedPathsByCall[Math.min(this.changedPathsIndex, this.changedPathsByCall.length - 1)] ??
      [];
    this.changedPathsIndex += 1;
    return [...value];
  }

  async getCurrentBranch(): Promise<string | null> {
    return this.options.branch ?? "main";
  }

  async getHeadSha(): Promise<string | null> {
    const values = this.options.headShas ?? ["head-start", "head-validated", "head-local"];
    const value = values[Math.min(this.headShaIndex, values.length - 1)] ?? null;
    this.headShaIndex += 1;
    return value;
  }
}

class StubGitVersioning implements GitVersioning {
  public commitCalls: Array<{
    paths: string[];
    subject: string;
    bodyParagraphs: string[];
  }> = [];

  constructor(
    private readonly handler: (
      paths: string[],
      subject: string,
      bodyParagraphs: string[],
    ) => Promise<GitSyncEvidence | null>,
  ) {}

  async commitTicketClosure(): Promise<void> {
    throw new Error("not used");
  }

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs: string[] = [],
  ): Promise<GitSyncEvidence | null> {
    this.commitCalls.push({ paths: [...paths], subject, bodyParagraphs: [...bodyParagraphs] });
    return this.handler(paths, subject, bodyParagraphs);
  }

  async commitCheckupArtifacts(): Promise<{
    commitHash: string;
    upstream: string;
    commitPushId: string;
    reportCommitHash: string;
    metadataCommitHash: string;
  } | null> {
    throw new Error("not used");
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    throw new Error("not used");
  }
}

const runnerRepoPath = fileURLToPath(new URL("../../", import.meta.url));

const createTempTargetRepo = async (
  projectName = "target-prepare-smoke",
): Promise<{ rootPath: string; project: TargetPrepareResolvedProject }> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "target-prepare-"));
  const projectPath = path.join(rootPath, projectName);
  await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  await fs.writeFile(path.join(projectPath, "README.md"), "# Projeto alvo\n\nContexto local.\n", "utf8");
  await fs.writeFile(path.join(projectPath, "AGENTS.md"), "# AGENTS local\n\nRegra preexistente.\n", "utf8");

  return {
    rootPath,
    project: {
      name: projectName,
      path: projectPath,
      eligibleForProjects: false,
    },
  };
};

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

const syncManagedWorkflowArtifacts = async (
  targetRepoPath: string,
  request: TargetPrepareCodexRequest,
): Promise<void> => {
  await fs.mkdir(path.join(targetRepoPath, "tickets", "open"), { recursive: true });
  await fs.mkdir(path.join(targetRepoPath, "tickets", "closed"), { recursive: true });
  await fs.mkdir(path.join(targetRepoPath, "execplans"), { recursive: true });
  await fs.mkdir(path.join(targetRepoPath, "docs", "specs", "templates"), { recursive: true });
  await fs.mkdir(path.join(targetRepoPath, "docs", "workflows"), { recursive: true });

  for (const entry of request.copySources) {
    const sourceContent = await fs.readFile(entry.sourcePath, "utf8");
    const destinationPath = path.join(targetRepoPath, entry.targetPath);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, sourceContent, "utf8");
  }

  for (const entry of request.mergeSources) {
    const sourceContent = (await fs.readFile(entry.sourcePath, "utf8")).trim();
    const destinationPath = path.join(targetRepoPath, entry.targetPath);
    let existingContent = "";
    try {
      existingContent = await fs.readFile(destinationPath, "utf8");
    } catch {
      existingContent = "";
    }

    const managedBlock = [
      renderTargetPrepareManagedBlockStart(entry.markerId),
      sourceContent,
      renderTargetPrepareManagedBlockEnd(entry.markerId),
    ].join("\n");
    const nextContent = existingContent.trim()
      ? `${existingContent.trim()}\n\n${managedBlock}\n`
      : `${managedBlock}\n`;
    await fs.writeFile(destinationPath, nextContent, "utf8");
  }
};

test("resolveTargetPrepareWorkflowCompleteDependencies usa caminho externo canonico para projeto irmao", () => {
  const dependencies = resolveTargetPrepareWorkflowCompleteDependencies(
    "/home/mapita/projetos/alpha-project",
    "/home/mapita/projetos/codex-flow-runner",
  );

  assert.deepEqual(dependencies, [
    {
      artifactId: "workflow-quality-gates",
      requiredFor: "workflow-complete",
      summary: "Checklist compartilhado exigido pelos prompts operacionais do workflow completo.",
      sourceRelativePath: "docs/workflows/codex-quality-gates.md",
      targetRelativePath: "../codex-flow-runner/docs/workflows/codex-quality-gates.md",
      accessMode: "workflow-repo-sibling",
    },
  ]);
});

test("resolveTargetPrepareWorkflowCompleteDependencies usa caminho local no proprio runner", () => {
  const dependencies = resolveTargetPrepareWorkflowCompleteDependencies(
    "/home/mapita/projetos/codex-flow-runner",
    "/home/mapita/projetos/codex-flow-runner",
  );

  assert.deepEqual(dependencies, [
    {
      artifactId: "workflow-quality-gates",
      requiredFor: "workflow-complete",
      summary: "Checklist compartilhado exigido pelos prompts operacionais do workflow completo.",
      sourceRelativePath: "docs/workflows/codex-quality-gates.md",
      targetRelativePath: "docs/workflows/codex-quality-gates.md",
      accessMode: "current-project",
    },
  ]);
});

test("execute conclui target_prepare, versiona artefatos permitidos e preserva contexto preexistente", async () => {
  const { rootPath, project } = await createTempTargetRepo("prepared-project");

  try {
    const changedPathsAfterCodex = [
      "AGENTS.md",
      "README.md",
      ...TARGET_PREPARE_EXACT_COPY_SOURCES.map((entry) => entry.targetPath),
    ];
    const changedPathsBeforeVersioning = [
      ...changedPathsAfterCodex,
      TARGET_PREPARE_MANIFEST_PATH,
      TARGET_PREPARE_REPORT_PATH,
    ];

    const codexClient = new StubTargetPrepareCodexClient(async (request) => {
      await syncManagedWorkflowArtifacts(project.path, request);
    });
    const gitVersioning = new StubGitVersioning(async () => ({
      commitHash: "prepare123",
      upstream: "origin/main",
      commitPushId: "prepare123@origin/main",
    }));

    const executor = new ControlledTargetPrepareExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => project,
      },
      createCodexClient: () => codexClient,
      createGitVersioning: () => gitVersioning,
      createGitGuard: () =>
        new StubTargetPrepareGitGuard([changedPathsAfterCodex, changedPathsBeforeVersioning]),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:30:00.000Z"),
    });

    const result = await executor.execute(project.name);

    assert.equal(result.status, "completed");
    assert.equal(result.summary.targetProject.name, project.name);
    assert.equal(result.summary.eligibleForProjects, true);
    assert.equal(result.summary.compatibleWithWorkflowComplete, true);
    assert.match(result.summary.nextAction, /select_project prepared-project/u);
    assert.deepEqual(gitVersioning.commitCalls[0]?.paths, changedPathsBeforeVersioning);

    const manifestRaw = await fs.readFile(
      path.join(project.path, TARGET_PREPARE_MANIFEST_PATH),
      "utf8",
    );
    const manifest = JSON.parse(manifestRaw) as {
      contractVersion: string;
      prepareSchemaVersion: string;
      allowlistedPaths: string[];
      artifacts: { manifestPath: string; reportPath: string };
      workflowCompleteDependencies: Array<{
        artifactId: string;
        targetRelativePath: string;
        accessMode: string;
      }>;
      surfaces: Array<{ path: string; validationStrategy: string }>;
    };
    assert.equal(manifest.contractVersion, "1.0");
    assert.equal(manifest.prepareSchemaVersion, "1.0");
    assert.equal(manifest.artifacts.manifestPath, TARGET_PREPARE_MANIFEST_PATH);
    assert.equal(manifest.artifacts.reportPath, TARGET_PREPARE_REPORT_PATH);
    assert.deepEqual(manifest.workflowCompleteDependencies, [
      {
        artifactId: "workflow-quality-gates",
        requiredFor: "workflow-complete",
        summary: "Checklist compartilhado exigido pelos prompts operacionais do workflow completo.",
        sourceRelativePath: "docs/workflows/codex-quality-gates.md",
        targetRelativePath: "../codex-flow-runner/docs/workflows/codex-quality-gates.md",
        accessMode: "workflow-repo-sibling",
      },
    ]);
    assert.ok(manifest.allowlistedPaths.includes("AGENTS.md"));
    assert.ok(
      manifest.surfaces.some(
        (surface) =>
          surface.path === TARGET_PREPARE_REPORT_PATH &&
          surface.validationStrategy === "runner-generated",
      ),
    );

    const report = await fs.readFile(path.join(project.path, TARGET_PREPARE_REPORT_PATH), "utf8");
    assert.match(report, /# Relatório do target_prepare/u);
    assert.match(report, /## Resumo/u);
    assert.match(report, /Elegível para \/projects: sim/u);
    assert.match(report, /Compatível com workflow completo: sim/u);
    assert.match(
      report,
      /Checklist compartilhado do workflow: \.\.\/codex-flow-runner\/docs\/workflows\/codex-quality-gates\.md \(workflow-repo-sibling\)/u,
    );
    assert.match(report, /## Dependências do workflow completo/u);
    assert.match(
      report,
      /Próxima ação recomendada: Selecionar o projeto por \/select_project prepared-project ou pelo menu \/projects\./u,
    );

    const agentsContent = await fs.readFile(path.join(project.path, "AGENTS.md"), "utf8");
    const readmeContent = await fs.readFile(path.join(project.path, "README.md"), "utf8");
    assert.match(agentsContent, /Regra preexistente\./u);
    assert.match(readmeContent, /Contexto local\./u);

    for (const entry of TARGET_PREPARE_MERGED_FILE_SOURCES) {
      const fileContent = await fs.readFile(path.join(project.path, entry.targetPath), "utf8");
      const sourceContent = (await fs.readFile(
        path.join(runnerRepoPath, entry.sourceRelativePath),
        "utf8",
      )).trim();
      assert.match(fileContent, new RegExp(renderTargetPrepareManagedBlockStart(entry.markerId)));
      assert.match(fileContent, new RegExp(renderTargetPrepareManagedBlockEnd(entry.markerId)));
      assert.match(fileContent, new RegExp(escapeRegExp(sourceContent)));
    }
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute bloqueia prepare quando o diff do Codex sai da allowlist", async () => {
  const { rootPath, project } = await createTempTargetRepo("blocked-project");

  try {
    const executor = new ControlledTargetPrepareExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => project,
      },
      createCodexClient: () =>
        new StubTargetPrepareCodexClient(async () => {
          await fs.writeFile(path.join(project.path, "package.json"), "{ }\n", "utf8");
        }),
      createGitVersioning: () =>
        new StubGitVersioning(async () => ({
          commitHash: "unused",
          upstream: "origin/main",
          commitPushId: "unused@origin/main",
        })),
      createGitGuard: () => new StubTargetPrepareGitGuard([["package.json"]]),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:30:00.000Z"),
    });

    const result = await executor.execute(project.name);

    assert.equal(result.status, "failed");
    assert.match(result.message, /fora da allowlist/u);
    await assert.rejects(
      () => fs.readFile(path.join(project.path, TARGET_PREPARE_MANIFEST_PATH), "utf8"),
      /ENOENT/u,
    );
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute devolve diagnostico explicito quando push falha apos pos-check", async () => {
  const { rootPath, project } = await createTempTargetRepo("push-failure-project");

  try {
    const changedPathsAfterCodex = [
      "AGENTS.md",
      "README.md",
      ...TARGET_PREPARE_EXACT_COPY_SOURCES.map((entry) => entry.targetPath),
    ];
    const changedPathsBeforeVersioning = [
      ...changedPathsAfterCodex,
      TARGET_PREPARE_MANIFEST_PATH,
      TARGET_PREPARE_REPORT_PATH,
    ];

    const executor = new ControlledTargetPrepareExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => project,
      },
      createCodexClient: () =>
        new StubTargetPrepareCodexClient(async (request) => {
          await syncManagedWorkflowArtifacts(project.path, request);
        }),
      createGitVersioning: () =>
        new StubGitVersioning(async () => {
          throw new Error("push falhou");
        }),
      createGitGuard: () =>
        new StubTargetPrepareGitGuard(
          [changedPathsAfterCodex, changedPathsBeforeVersioning],
          {
            headShas: ["head-start", "head-validated", "head-local-after-commit"],
          },
        ),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:30:00.000Z"),
    });

    const result = await executor.execute(project.name);

    assert.equal(result.status, "failed");
    assert.match(result.message, /fronteira de versionamento/u);
    assert.match(result.message, /push falhou/u);
    assert.match(result.message, /head-local-after-commit/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("execute publica milestones canonicos e respeita cancelamento cooperativo antes do versionamento", async () => {
  const { rootPath, project } = await createTempTargetRepo("prepare-cancelled");

  try {
    const changedPathsAfterCodex = [
      "AGENTS.md",
      "README.md",
      ...TARGET_PREPARE_EXACT_COPY_SOURCES.map((entry) => entry.targetPath),
    ];
    const changedPathsBeforeVersioning = [
      ...changedPathsAfterCodex,
      TARGET_PREPARE_MANIFEST_PATH,
      TARGET_PREPARE_REPORT_PATH,
    ];
    const milestones: string[] = [];
    const aiStages: string[] = [];
    let cancelRequested = false;
    const executor = new ControlledTargetPrepareExecutor({
      logger: new SpyLogger(),
      targetProjectResolver: {
        resolveProject: async () => project,
      },
      createCodexClient: () =>
        new StubTargetPrepareCodexClient(async (request) => {
          await syncManagedWorkflowArtifacts(project.path, request);
        }),
      createGitVersioning: () =>
        new StubGitVersioning(async () => ({
          commitHash: "prepare123",
          upstream: "origin/main",
          commitPushId: "prepare123@origin/main",
        })),
      createGitGuard: () =>
        new StubTargetPrepareGitGuard([changedPathsAfterCodex, changedPathsBeforeVersioning]),
      runnerRepoPath,
      now: () => new Date("2026-03-24T22:30:00.000Z"),
    });

    const result = await executor.execute(project.name, {
      onMilestone: async (event) => {
        milestones.push(event.milestone);
        if (event.milestone === "ai-adjustment") {
          cancelRequested = true;
        }
      },
      onAiExchange: async (event) => {
        aiStages.push(event.stageLabel);
      },
      isCancellationRequested: () => cancelRequested,
    });

    assert.equal(result.status, "cancelled");
    assert.equal(result.summary.cancelledAtMilestone, "ai-adjustment");
    assert.deepEqual(milestones, ["preflight", "ai-adjustment"]);
    assert.deepEqual(aiStages, ["adequacao por IA"]);
    assert.deepEqual(result.summary.changedPaths, changedPathsAfterCodex);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
