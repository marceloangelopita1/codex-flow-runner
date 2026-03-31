import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Logger } from "./logger.js";
import {
  TargetPrepareCodexClient,
  TargetPrepareCopySource,
  TargetPrepareMergeSource,
} from "../integrations/codex-client.js";
import { GitVersioning } from "../integrations/git-client.js";
import { TargetPrepareGitGuard } from "../integrations/target-prepare-git-guard.js";
import { TargetProjectResolver } from "../integrations/target-project-resolver.js";
import {
  TARGET_PREPARE_MILESTONE_LABELS,
  targetFlowKindToCommand,
} from "../types/target-flow.js";
import {
  isTargetPreparePathAllowed,
  renderTargetPrepareManagedBlockEnd,
  renderTargetPrepareManagedBlockStart,
  TARGET_PREPARE_ALLOWED_PATHS,
  TARGET_PREPARE_CONTRACT_VERSION,
  TARGET_PREPARE_EXACT_COPY_SOURCES,
  TARGET_PREPARE_MANIFEST_PATH,
  TARGET_PREPARE_MERGED_FILE_SOURCES,
  TARGET_PREPARE_REPORT_PATH,
  TARGET_PREPARE_REQUIRED_DIRECTORIES,
  TARGET_PREPARE_SCHEMA_VERSION,
  resolveTargetPrepareWorkflowCompleteDependencies,
  TargetPrepareExecutionResult,
  TargetPrepareLifecycleHooks,
  TargetPrepareManifest,
  TargetPrepareResolvedProject,
  TargetPrepareSurfaceEvidence,
  TargetPrepareWorkflowDependency,
} from "../types/target-prepare.js";

interface TargetPrepareExecutorDependencies {
  logger: Logger;
  targetProjectResolver: TargetProjectResolver;
  createCodexClient: (project: TargetPrepareResolvedProject) => TargetPrepareCodexClient;
  createGitVersioning: (project: TargetPrepareResolvedProject) => GitVersioning;
  createGitGuard: (project: TargetPrepareResolvedProject) => TargetPrepareGitGuard;
  runnerRepoPath: string;
  now?: () => Date;
}

export interface TargetPrepareExecutor {
  execute(
    projectName: string,
    hooks?: TargetPrepareLifecycleHooks,
  ): Promise<TargetPrepareExecutionResult>;
}

export class ControlledTargetPrepareExecutor implements TargetPrepareExecutor {
  private readonly now: () => Date;

  constructor(private readonly dependencies: TargetPrepareExecutorDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async execute(
    projectName: string,
    hooks?: TargetPrepareLifecycleHooks,
  ): Promise<TargetPrepareExecutionResult> {
    let targetProject: TargetPrepareResolvedProject;
    try {
      targetProject = await this.dependencies.targetProjectResolver.resolveProject(projectName);
    } catch (error) {
      return mapTargetResolutionError(error);
    }

    const gitGuard = this.dependencies.createGitGuard(targetProject);
    try {
      await gitGuard.assertCleanWorkingTree();
    } catch (error) {
      return {
        status: "blocked",
        reason: "working-tree-dirty",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const codexClient = this.dependencies.createCodexClient(targetProject);
    let fixedCodexClient: TargetPrepareCodexClient = codexClient;
    try {
      await codexClient.ensureAuthenticated();
      const fixedPreferences = await codexClient.snapshotInvocationPreferences();
      fixedCodexClient = codexClient.forkWithFixedInvocationPreferences(fixedPreferences);
    } catch (error) {
      return {
        status: "blocked",
        reason: "codex-auth-missing",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao validar autenticacao do Codex CLI para /target_prepare.",
      };
    }

    const runnerReference = `codex-flow-runner@${this.dependencies.runnerRepoPath}`;
    const gitBranch = await gitGuard.getCurrentBranch();
    const gitHeadAtStart = await gitGuard.getHeadSha();
    await hooks?.onMilestone?.({
      flow: "target-prepare",
      command: targetFlowKindToCommand("target-prepare"),
      targetProject,
      milestone: "preflight",
      milestoneLabel: TARGET_PREPARE_MILESTONE_LABELS.preflight,
      message: `Preflight concluido para ${targetProject.name}.`,
      versionBoundaryState: "before-versioning",
      recordedAtUtc: this.now().toISOString(),
    });
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "preflight",
          changedPaths: [],
          nextAction:
            "Nenhuma alteracao foi versionada. Revise o contexto do projeto alvo e rerode quando estiver pronto.",
        },
      };
    }

    let codexOutput = "";
    try {
      await hooks?.onMilestone?.({
        flow: "target-prepare",
        command: targetFlowKindToCommand("target-prepare"),
        targetProject,
        milestone: "ai-adjustment",
        milestoneLabel: TARGET_PREPARE_MILESTONE_LABELS["ai-adjustment"],
        message: `Adequacao por IA em andamento para ${targetProject.name}.`,
        versionBoundaryState: "before-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      const codexResult = await fixedCodexClient.runTargetPrepare({
        targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference,
        allowlistedPaths: [...TARGET_PREPARE_ALLOWED_PATHS],
        copySources: this.resolveCopySources(),
        mergeSources: this.resolveMergeSources(),
      });
      codexOutput = codexResult.output.trim();
      await hooks?.onAiExchange?.({
        stageLabel: TARGET_PREPARE_MILESTONE_LABELS["ai-adjustment"],
        promptTemplatePath: codexResult.promptTemplatePath,
        promptText: codexResult.promptText,
        outputText: codexResult.output,
        ...(codexResult.diagnostics ? { diagnostics: codexResult.diagnostics } : {}),
      });
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const changedPathsAfterCodex = await gitGuard.listChangedPaths();
    const disallowedPaths = changedPathsAfterCodex.filter(
      (entry) => !isTargetPreparePathAllowed(entry),
    );
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "ai-adjustment",
          changedPaths: changedPathsAfterCodex,
          nextAction:
            "Inspecione o diff local gerado antes do versionamento e descarte ou reaproveite as mudancas conscientemente.",
        },
      };
    }
    if (disallowedPaths.length > 0) {
      return {
        status: "failed",
        message: [
          "target_prepare gerou mutacoes fora da allowlist autorizada.",
          `Caminhos bloqueados: ${disallowedPaths.join(", ")}.`,
        ].join(" "),
      };
    }

    let validatedSurfaces: TargetPrepareSurfaceEvidence[];
    try {
      await hooks?.onMilestone?.({
        flow: "target-prepare",
        command: targetFlowKindToCommand("target-prepare"),
        targetProject,
        milestone: "post-check",
        milestoneLabel: TARGET_PREPARE_MILESTONE_LABELS["post-check"],
        message: `Pos-check em andamento para ${targetProject.name}.`,
        versionBoundaryState: "before-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      validatedSurfaces = await this.validateManagedSurfaces(targetProject.path);
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const finalChangedPaths = uniqueSorted([
      ...changedPathsAfterCodex,
      TARGET_PREPARE_MANIFEST_PATH,
      TARGET_PREPARE_REPORT_PATH,
    ]);
    const gitHeadAtValidation = await gitGuard.getHeadSha();

    try {
      const artifacts = await this.writeGeneratedArtifacts({
        targetProject,
        validatedSurfaces,
        changedPaths: finalChangedPaths,
        runnerReference,
        codexOutput,
        gitBranch,
        gitHeadAtStart,
        gitHeadAtValidation,
        codexClient: fixedCodexClient,
      });
      validatedSurfaces = artifacts.surfaces;
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const changedPathsBeforeVersioning = await gitGuard.listChangedPaths();
    const disallowedPathsAfterArtifacts = changedPathsBeforeVersioning.filter(
      (entry) => !isTargetPreparePathAllowed(entry),
    );
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "post-check",
          changedPaths: changedPathsBeforeVersioning,
          nextAction:
            "Revise manifesto, relatorio e demais mudancas locais antes de decidir se deseja descartalas ou rerodar o fluxo.",
        },
      };
    }
    if (disallowedPathsAfterArtifacts.length > 0) {
      return {
        status: "failed",
        message: [
          "target_prepare gerou mutacoes fora da allowlist apos escrever manifesto/relatorio.",
          `Caminhos bloqueados: ${disallowedPathsAfterArtifacts.join(", ")}.`,
        ].join(" "),
      };
    }

    const gitVersioning = this.dependencies.createGitVersioning(targetProject);
    const commitSubject = `chore(onboarding): prepare ${targetProject.name} for codex-flow-runner`;
    try {
      await hooks?.onMilestone?.({
        flow: "target-prepare",
        command: targetFlowKindToCommand("target-prepare"),
        targetProject,
        milestone: "versioning",
        milestoneLabel: TARGET_PREPARE_MILESTONE_LABELS.versioning,
        message: `Versionamento em andamento para ${targetProject.name}.`,
        versionBoundaryState: "after-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      const evidence = await gitVersioning.commitAndPushPaths(changedPathsBeforeVersioning, commitSubject, [
        `Target prepare manifest: ${TARGET_PREPARE_MANIFEST_PATH}`,
        `Target prepare report: ${TARGET_PREPARE_REPORT_PATH}`,
        `Runner reference: ${runnerReference}`,
      ]);

      if (!evidence) {
        return {
          status: "failed",
          message:
            "target_prepare passou no pos-check, mas nenhum artefato ficou staged para commit/push.",
        };
      }

      return {
        status: "completed",
        summary: {
          targetProject,
          eligibleForProjects: true,
          compatibleWithWorkflowComplete: true,
          nextAction: `Selecionar o projeto por /select_project ${targetProject.name} ou pelo menu /projects.`,
          manifestPath: TARGET_PREPARE_MANIFEST_PATH,
          reportPath: TARGET_PREPARE_REPORT_PATH,
          changedPaths: changedPathsBeforeVersioning,
          versioning: {
            status: "committed-and-pushed",
            commitHash: evidence.commitHash,
            upstream: evidence.upstream,
            commitPushId: evidence.commitPushId,
          },
        },
      };
    } catch (error) {
      const localHead = await gitGuard.getHeadSha();
      return {
        status: "failed",
        message: [
          "target_prepare concluiu o pos-check, mas falhou na fronteira de versionamento.",
          error instanceof Error ? error.message : String(error),
          localHead ? `HEAD local atual: ${localHead}.` : null,
          "Revise o commit local e sincronize o push antes de rerodar qualquer mutacao.",
        ]
          .filter(Boolean)
          .join(" "),
      };
    }
  }

  private resolveCopySources(): TargetPrepareCopySource[] {
    return TARGET_PREPARE_EXACT_COPY_SOURCES.map((entry) => ({
      targetPath: entry.targetPath,
      sourcePath: path.join(this.dependencies.runnerRepoPath, entry.sourceRelativePath),
    }));
  }

  private resolveMergeSources(): TargetPrepareMergeSource[] {
    return TARGET_PREPARE_MERGED_FILE_SOURCES.map((entry) => ({
      targetPath: entry.targetPath,
      sourcePath: path.join(this.dependencies.runnerRepoPath, entry.sourceRelativePath),
      markerId: entry.markerId,
    }));
  }

  private async validateManagedSurfaces(projectPath: string): Promise<TargetPrepareSurfaceEvidence[]> {
    const surfaces: TargetPrepareSurfaceEvidence[] = [];

    for (const relativeDir of TARGET_PREPARE_REQUIRED_DIRECTORIES) {
      const directoryPath = path.join(projectPath, relativeDir);
      const stats = await safeStat(directoryPath);
      if (!stats?.isDirectory()) {
        throw new Error(`target_prepare nao criou a estrutura obrigatoria ${relativeDir}.`);
      }

      surfaces.push({
        path: relativeDir,
        sourcePath: null,
        managementMode: "directory",
        validationStrategy: "directory-exists",
        sha256: null,
      });
    }

    for (const entry of TARGET_PREPARE_EXACT_COPY_SOURCES) {
      const targetPath = path.join(projectPath, entry.targetPath);
      const sourcePath = path.join(this.dependencies.runnerRepoPath, entry.sourceRelativePath);
      const [targetContent, sourceContent] = await Promise.all([
        fs.readFile(targetPath, "utf8"),
        fs.readFile(sourcePath, "utf8"),
      ]);
      if (targetContent !== sourceContent) {
        throw new Error(`target_prepare nao convergiu ${entry.targetPath} para o contrato atual.`);
      }

      surfaces.push({
        path: entry.targetPath,
        sourcePath: sourcePath,
        managementMode: "copy-exact",
        validationStrategy: "exact-match",
        sha256: sha256Hex(targetContent),
      });
    }

    for (const entry of TARGET_PREPARE_MERGED_FILE_SOURCES) {
      const targetPath = path.join(projectPath, entry.targetPath);
      const sourcePath = path.join(this.dependencies.runnerRepoPath, entry.sourceRelativePath);
      const [targetContent, sourceContent] = await Promise.all([
        fs.readFile(targetPath, "utf8"),
        fs.readFile(sourcePath, "utf8"),
      ]);

      const managedBlock = readManagedBlock(targetContent, entry.markerId);
      if (managedBlock !== sourceContent.trim()) {
        throw new Error(
          `target_prepare nao convergiu o bloco gerenciado de ${entry.targetPath} para o contrato atual.`,
        );
      }

      surfaces.push({
        path: entry.targetPath,
        sourcePath: sourcePath,
        managementMode: "merge-managed-block",
        validationStrategy: "managed-block",
        sha256: sha256Hex(managedBlock),
      });
    }

    return surfaces;
  }

  private async writeGeneratedArtifacts(params: {
    targetProject: TargetPrepareResolvedProject;
    validatedSurfaces: TargetPrepareSurfaceEvidence[];
    changedPaths: string[];
    runnerReference: string;
    codexOutput: string;
    gitBranch: string | null;
    gitHeadAtStart: string | null;
    gitHeadAtValidation: string | null;
    codexClient: TargetPrepareCodexClient;
  }): Promise<{ surfaces: TargetPrepareSurfaceEvidence[] }> {
    const manifestPath = path.join(params.targetProject.path, TARGET_PREPARE_MANIFEST_PATH);
    const reportPath = path.join(params.targetProject.path, TARGET_PREPARE_REPORT_PATH);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });

    const workflowCompleteDependencies = resolveTargetPrepareWorkflowCompleteDependencies(
      params.targetProject.path,
      this.dependencies.runnerRepoPath,
    );
    const reportContent = this.renderReport({
      ...params,
      workflowCompleteDependencies,
    });
    await fs.writeFile(reportPath, reportContent, "utf8");

    const surfaces = [
      ...params.validatedSurfaces,
      {
        path: TARGET_PREPARE_REPORT_PATH,
        sourcePath: null,
        managementMode: "runner-generated" as const,
        validationStrategy: "runner-generated" as const,
        sha256: sha256Hex(reportContent),
      },
      {
        path: TARGET_PREPARE_MANIFEST_PATH,
        sourcePath: null,
        managementMode: "runner-generated" as const,
        validationStrategy: "runner-generated" as const,
        sha256: null,
      },
    ];

    const codexPreferences = await params.codexClient.snapshotInvocationPreferences();
    const manifest: TargetPrepareManifest = {
      contractVersion: TARGET_PREPARE_CONTRACT_VERSION,
      prepareSchemaVersion: TARGET_PREPARE_SCHEMA_VERSION,
      generatedAtUtc: this.now().toISOString(),
      runnerReference: params.runnerReference,
      targetProject: {
        name: params.targetProject.name,
        path: params.targetProject.path,
      },
      allowlistedPaths: [...TARGET_PREPARE_ALLOWED_PATHS],
      changedPaths: params.changedPaths,
      eligibleForProjects: true,
      compatibleWithWorkflowComplete: true,
      codexPreferences,
      git: {
        branch: params.gitBranch,
        headShaAtStart: params.gitHeadAtStart,
        headShaAtValidation: params.gitHeadAtValidation,
      },
      workflowCompleteDependencies,
      artifacts: {
        manifestPath: TARGET_PREPARE_MANIFEST_PATH,
        reportPath: TARGET_PREPARE_REPORT_PATH,
      },
      surfaces,
    };

    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return { surfaces };
  }

  private renderReport(params: {
    targetProject: TargetPrepareResolvedProject;
    validatedSurfaces: TargetPrepareSurfaceEvidence[];
    changedPaths: string[];
    runnerReference: string;
    codexOutput: string;
    gitBranch: string | null;
    gitHeadAtStart: string | null;
    gitHeadAtValidation: string | null;
    workflowCompleteDependencies: TargetPrepareWorkflowDependency[];
  }): string {
    const generatedAtUtc = this.now().toISOString();
    const codexSummary = summarizeCodexOutput(params.codexOutput);
    const qualityGatesDependency = params.workflowCompleteDependencies.find(
      (dependency) => dependency.artifactId === "workflow-quality-gates",
    );

    return [
      "# Relatório do target_prepare",
      "",
      "## Resumo",
      `- Gerado em (UTC): ${generatedAtUtc}`,
      `- Referência do runner: ${params.runnerReference}`,
      `- Projeto alvo: ${params.targetProject.name}`,
      `- Caminho do projeto alvo: ${params.targetProject.path}`,
      `- Elegível para /projects: sim`,
      `- Compatível com workflow completo: sim`,
      qualityGatesDependency
        ? `- Checklist compartilhado do workflow: ${qualityGatesDependency.targetRelativePath} (${qualityGatesDependency.accessMode})`
        : "- Checklist compartilhado do workflow: n/a",
      `- Próxima ação recomendada: Selecionar o projeto por /select_project ${params.targetProject.name} ou pelo menu /projects.`,
      "",
      "## Snapshot do Git",
      `- Branch: ${params.gitBranch ?? "n/a"}`,
      `- HEAD at start: ${params.gitHeadAtStart ?? "n/a"}`,
      `- HEAD at validation: ${params.gitHeadAtValidation ?? "n/a"}`,
      "",
      "## Caminhos alterados",
      ...params.changedPaths.map((entry) => `- ${entry}`),
      "",
      "## Dependências do workflow completo",
      ...params.workflowCompleteDependencies.map(
        (dependency) =>
          `- ${dependency.artifactId} | ${dependency.accessMode} | target=${dependency.targetRelativePath} | runner=${dependency.sourceRelativePath}`,
      ),
      "",
      "## Superfícies gerenciadas",
      ...params.validatedSurfaces.map(
        (surface) =>
          `- ${surface.path} | ${surface.managementMode} | ${surface.validationStrategy} | sha256=${surface.sha256 ?? "n/a"}`,
      ),
      "",
      "## Resumo do Codex",
      ...(codexSummary.length > 0 ? codexSummary.map((entry) => `- ${entry}`) : ["- Nenhum resumo textual retornado pelo Codex."]),
      "",
      "## Notas",
      "- Manifesto técnico e relatório humano foram gerados pelo runner após pós-check determinístico.",
      "- Compatibilidade com workflow completo depende das resoluções acima continuarem acessíveis pelo caminho declarado.",
      "- Commit/push só são permitidos depois de este relatório existir e de os validadores estarem verdes.",
      "",
    ].join("\n");
  }
}

const mapTargetResolutionError = (error: unknown): TargetPrepareExecutionResult => {
  const message = error instanceof Error ? error.message : String(error);
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: unknown }).name);
    if (name === "InvalidTargetProjectNameError") {
      return { status: "blocked", reason: "invalid-project-name", message };
    }

    if (name === "TargetProjectNotFoundError") {
      return { status: "blocked", reason: "project-not-found", message };
    }

    if (name === "TargetProjectGitMissingError") {
      return { status: "blocked", reason: "git-repo-missing", message };
    }
  }

  return {
    status: "failed",
    message,
  };
};

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, "pt-BR"));

const safeStat = async (value: string) => {
  try {
    return await fs.stat(value);
  } catch {
    return null;
  }
};

const sha256Hex = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const readManagedBlock = (fileContent: string, markerId: string): string => {
  const startMarker = renderTargetPrepareManagedBlockStart(markerId);
  const endMarker = renderTargetPrepareManagedBlockEnd(markerId);
  const pattern = new RegExp(
    `${escapeRegExp(startMarker)}\\s*([\\s\\S]*?)\\s*${escapeRegExp(endMarker)}`,
    "u",
  );
  const match = fileContent.match(pattern);
  if (!match?.[1]) {
    return "";
  }

  return match[1].trim();
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const summarizeCodexOutput = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
