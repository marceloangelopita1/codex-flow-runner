import { existsSync, promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { Logger } from "./logger.js";
import {
  TargetCheckupCodexClient,
  TargetCheckupCodexResult,
  TargetCheckupCodexRequest,
} from "../integrations/codex-client.js";
import { GitVersioning } from "../integrations/git-client.js";
import { TargetCheckupGitGuard } from "../integrations/target-checkup-git-guard.js";
import { TargetProjectResolver } from "../integrations/target-project-resolver.js";
import { ProjectRef } from "../types/project.js";
import {
  renderTargetPrepareManagedBlockEnd,
  renderTargetPrepareManagedBlockStart,
  TARGET_PREPARE_EXACT_COPY_SOURCES,
  TARGET_PREPARE_MANIFEST_PATH,
  TARGET_PREPARE_MERGED_FILE_SOURCES,
  TARGET_PREPARE_REPORT_PATH,
  resolveTargetPrepareWorkflowCompleteDependencies,
  TargetPrepareManifest,
  TargetPrepareWorkflowDependency,
} from "../types/target-prepare.js";
import {
  TARGET_CHECKUP_MILESTONE_LABELS,
  targetFlowKindToCommand,
} from "../types/target-flow.js";
import {
  buildTargetCheckupReportFileStem,
  evaluateTargetCheckupDerivationReadiness,
  TARGET_CHECKUP_CONTRACT_VERSION,
  TARGET_CHECKUP_DIMENSION_LABELS,
  TARGET_CHECKUP_HISTORY_DIR,
  TARGET_CHECKUP_MAX_AGE_DAYS,
  TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
  TARGET_CHECKUP_REPORT_FILE_SUFFIX,
  TARGET_CHECKUP_REQUIRED_DIMENSIONS,
  TARGET_CHECKUP_REQUIRED_DIRECTORIES,
  TARGET_CHECKUP_REQUIRED_DOCUMENTS,
  TARGET_CHECKUP_SAFE_COMMAND_NAMES,
  TargetCheckupCommandExecution,
  TargetCheckupCommandSurface,
  TargetCheckupDimensionKey,
  TargetCheckupDimensionResult,
  TargetCheckupDimensionVerdict,
  TargetCheckupEvidenceItem,
  TargetCheckupExecutionResult,
  TargetCheckupLifecycleHooks,
  TargetCheckupOverallVerdict,
  TargetCheckupReport,
  TARGET_CHECKUP_SCHEMA_VERSION,
} from "../types/target-checkup.js";

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_COMMANDS_TO_EXECUTE = 3;
const DEFAULT_COMMANDS_TO_EXECUTE = TARGET_CHECKUP_SAFE_COMMAND_NAMES.slice(0, MAX_COMMANDS_TO_EXECUTE);

interface TargetCheckupExecutorDependencies {
  logger: Logger;
  targetProjectResolver: TargetProjectResolver;
  createCodexClient: (project: ProjectRef) => TargetCheckupCodexClient;
  createGitVersioning: (project: ProjectRef) => GitVersioning;
  createGitGuard: (project: ProjectRef) => TargetCheckupGitGuard;
  runnerRepoPath: string;
  now?: () => Date;
  commandRunner?: TargetCheckupCommandRunner;
}

export interface TargetCheckupExecuteRequest {
  activeProject: ProjectRef | null;
  projectName?: string | null;
}

export interface TargetCheckupExecutor {
  execute(
    request: TargetCheckupExecuteRequest,
    hooks?: TargetCheckupLifecycleHooks,
  ): Promise<TargetCheckupExecutionResult>;
}

interface TargetCheckupCommandRunnerRequest {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
}

interface TargetCheckupCommandRunnerResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  failedToSpawn: boolean;
}

interface TargetCheckupCommandRunner {
  run(request: TargetCheckupCommandRunnerRequest): Promise<TargetCheckupCommandRunnerResult>;
}

interface DiscoveredTargetCheckupCommand {
  id: string;
  name: string;
  label: string;
  source: TargetCheckupCommandSurface;
  command: string;
  args: string[];
}

interface CommandDiscoveryResult {
  commands: DiscoveredTargetCheckupCommand[];
  evidence: TargetCheckupEvidenceItem[];
  explicitSurfaceFound: boolean;
  hasUnsupportedSurface: boolean;
}

interface CollectDimensionsResult {
  dimensions: TargetCheckupDimensionResult[];
  overallVerdict: TargetCheckupOverallVerdict;
}

interface PrepareIntegrityContext {
  targetProject: ProjectRef;
  runnerRepoPath: string;
}

export class ControlledTargetCheckupExecutor implements TargetCheckupExecutor {
  private readonly now: () => Date;
  private readonly commandRunner: TargetCheckupCommandRunner;

  constructor(private readonly dependencies: TargetCheckupExecutorDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.commandRunner = dependencies.commandRunner ?? new DefaultTargetCheckupCommandRunner();
  }

  async execute(
    request: TargetCheckupExecuteRequest,
    hooks?: TargetCheckupLifecycleHooks,
  ): Promise<TargetCheckupExecutionResult> {
    let targetProject: ProjectRef;
    try {
      targetProject = await this.resolveTargetProject(request);
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

    const analyzedHeadSha = await gitGuard.getHeadSha();
    if (!analyzedHeadSha) {
      return {
        status: "blocked",
        reason: "head-unresolved",
        message:
          "O target_checkup exige `HEAD` resolvido antes de iniciar. Revise o repositorio alvo e tente novamente.",
      };
    }

    const branch = await gitGuard.getCurrentBranch();
    if (!branch || branch === "HEAD") {
      return {
        status: "blocked",
        reason: "branch-unresolved",
        message:
          "O target_checkup exige branch simbolica resolvida; `HEAD` destacado nao e elegivel para publicar relatorio canonico.",
      };
    }

    const codexClient = this.dependencies.createCodexClient(targetProject);
    let fixedCodexClient: TargetCheckupCodexClient = codexClient;
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
            : "Falha ao validar autenticacao do Codex CLI para /target_checkup.",
      };
    }

    const startedAt = this.now();
    const reportStem = buildTargetCheckupReportFileStem(startedAt);
    const reportJsonPath = normalizeRelativePath(
      path.join(TARGET_CHECKUP_HISTORY_DIR, `${reportStem}.json`),
    );
    const reportMarkdownPath = normalizeRelativePath(
      path.join(TARGET_CHECKUP_HISTORY_DIR, `${reportStem}.md`),
    );
    const runnerReference = `codex-flow-runner@${this.dependencies.runnerRepoPath}`;
    await hooks?.onMilestone?.({
      flow: "target-checkup",
      command: targetFlowKindToCommand("target-checkup"),
      targetProject,
      milestone: "preflight",
      milestoneLabel: TARGET_CHECKUP_MILESTONE_LABELS.preflight,
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
            "Nenhum artefato canônico foi versionado. Revise o contexto do projeto alvo e rerode quando estiver pronto.",
        },
      };
    }

    let collected: CollectDimensionsResult;
    try {
      await hooks?.onMilestone?.({
        flow: "target-checkup",
        command: targetFlowKindToCommand("target-checkup"),
        targetProject,
        milestone: "evidence-collection",
        milestoneLabel: TARGET_CHECKUP_MILESTONE_LABELS["evidence-collection"],
        message: `Coleta de evidencias em andamento para ${targetProject.name}.`,
        versionBoundaryState: "before-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      collected = await this.collectDimensions({
        targetProject,
        gitGuard,
      });
    } catch (error) {
      if (error instanceof TargetCheckupCommandMutationError) {
        return {
          status: "failed",
          message: [
            "target_checkup abortado antes da publicacao canonica porque um comando descoberto alterou o working tree.",
            `Comando: ${error.commandLabel}.`,
            `Caminhos alterados: ${error.changedPaths.join(", ")}.`,
            "Reverta o diff local, endureca a superficie de descoberta se necessario e rerode em snapshot limpo.",
          ].join(" "),
        };
      }

      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "evidence-collection",
          changedPaths: [],
          nextAction:
            "Nenhum artefato canônico foi publicado. Reavalie a rodada e rerode quando quiser gerar um novo snapshot.",
        },
      };
    }

    const finishedAt = this.now();
    const draftReport = this.buildReport({
      targetProject,
      analyzedHeadSha,
      branch,
      startedAt,
      finishedAt,
      reportJsonPath,
      reportMarkdownPath,
      overallVerdict: collected.overallVerdict,
      dimensions: collected.dimensions,
      editorialSummaryMarkdown: null,
      reportCommitSha: null,
      reportCommitShaConvention: null,
    });

    let editorialSummaryMarkdown = "";
    try {
      await hooks?.onMilestone?.({
        flow: "target-checkup",
        command: targetFlowKindToCommand("target-checkup"),
        targetProject,
        milestone: "editorial-summary",
        milestoneLabel: TARGET_CHECKUP_MILESTONE_LABELS["editorial-summary"],
        message: `Sintese/redacao em andamento para ${targetProject.name}.`,
        versionBoundaryState: "before-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      const editorialResult = await this.renderEditorialSummary({
        codexClient: fixedCodexClient,
        report: draftReport,
        runnerReference,
      });
      editorialSummaryMarkdown = editorialResult.markdown;
      await hooks?.onAiExchange?.({
        stageLabel: TARGET_CHECKUP_MILESTONE_LABELS["editorial-summary"],
        promptTemplatePath: editorialResult.promptTemplatePath,
        promptText: editorialResult.promptText,
        outputText: editorialResult.outputText,
        ...(editorialResult.diagnostics ? { diagnostics: editorialResult.diagnostics } : {}),
      });
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    let report = this.buildReport({
      targetProject,
      analyzedHeadSha,
      branch,
      startedAt,
      finishedAt,
      reportJsonPath,
      reportMarkdownPath,
      overallVerdict: collected.overallVerdict,
      dimensions: collected.dimensions,
      editorialSummaryMarkdown,
      reportCommitSha: null,
      reportCommitShaConvention: null,
    });

    try {
      await this.writeReportArtifacts(targetProject.path, report);
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const changedPathsBeforeVersioning = await gitGuard.listChangedPaths();
    const unexpectedPaths = changedPathsBeforeVersioning.filter(
      (entry) => ![reportJsonPath, reportMarkdownPath].includes(normalizeRelativePath(entry)),
    );
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "editorial-summary",
          changedPaths: changedPathsBeforeVersioning,
          nextAction:
            "Os artefatos locais do checkup ficaram disponiveis sem commit/push; revise-os antes de decidir o proximo passo.",
        },
      };
    }
    if (unexpectedPaths.length > 0) {
      return {
        status: "failed",
        message: [
          "target_checkup gerou mutacoes inesperadas antes da fronteira de versionamento.",
          `Caminhos observados: ${unexpectedPaths.join(", ")}.`,
        ].join(" "),
      };
    }

    const gitVersioning = this.dependencies.createGitVersioning(targetProject);
    try {
      await hooks?.onMilestone?.({
        flow: "target-checkup",
        command: targetFlowKindToCommand("target-checkup"),
        targetProject,
        milestone: "versioning",
        milestoneLabel: TARGET_CHECKUP_MILESTONE_LABELS.versioning,
        message: `Versionamento em andamento para ${targetProject.name}.`,
        versionBoundaryState: "after-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      const publicationEvidence = await gitVersioning.commitCheckupArtifacts({
        paths: [reportJsonPath, reportMarkdownPath],
        publicationSubject: `docs(readiness): publish ${targetProject.name} ${TARGET_CHECKUP_REPORT_FILE_SUFFIX}`,
        publicationBodyParagraphs: [
          `Analyzed head SHA: ${analyzedHeadSha}`,
          `Overall verdict: ${report.overall_verdict}`,
        ],
        finalizePublishedArtifacts: async (reportCommitHash) => {
          report = this.buildReport({
            targetProject,
            analyzedHeadSha,
            branch,
            startedAt,
            finishedAt,
            reportJsonPath,
            reportMarkdownPath,
            overallVerdict: collected.overallVerdict,
            dimensions: collected.dimensions,
            editorialSummaryMarkdown,
            reportCommitSha: reportCommitHash,
            reportCommitShaConvention: TARGET_CHECKUP_REPORT_COMMIT_SHA_CONVENTION,
          });
          await this.writeReportArtifacts(targetProject.path, report);
        },
        metadataSubject: `docs(readiness): register report_commit_sha for ${targetProject.name}`,
        metadataBodyParagraphs: [
          `Report JSON: ${reportJsonPath}`,
          `Initial publication commit: tracked in report_commit_sha`,
        ],
      });

      if (!publicationEvidence) {
        return {
          status: "failed",
          message:
            "target_checkup concluiu a coleta, mas nenhum artefato canonico ficou staged para versionamento.",
        };
      }

      return {
        status: "completed",
        summary: {
          targetProject,
          analyzedHeadSha,
          branch,
          overallVerdict: report.overall_verdict,
          reportJsonPath,
          reportMarkdownPath,
          reportCommitSha: publicationEvidence.reportCommitHash,
          changedPaths: [reportJsonPath, reportMarkdownPath],
          nextAction: buildTargetCheckupNextAction(report),
          versioning: {
            status: "committed-and-pushed",
            metadataCommitHash: publicationEvidence.metadataCommitHash,
            reportCommitHash: publicationEvidence.reportCommitHash,
            upstream: publicationEvidence.upstream,
            commitPushId: publicationEvidence.commitPushId,
          },
        },
      };
    } catch (error) {
      const localHead = await gitGuard.getHeadSha();
      return {
        status: "failed",
        message: [
          "target_checkup falhou na fronteira de versionamento e nao publicou o artefato canonico final no remoto.",
          error instanceof Error ? error.message : String(error),
          localHead ? `HEAD local atual: ${localHead}.` : null,
          "Sincronize o estado local antes de rerodar.",
        ]
          .filter(Boolean)
          .join(" "),
      };
    }
  }

  private async resolveTargetProject(request: TargetCheckupExecuteRequest): Promise<ProjectRef> {
    const explicitProjectName = request.projectName?.trim();
    if (explicitProjectName) {
      const resolved = await this.dependencies.targetProjectResolver.resolveProject(explicitProjectName, {
        commandLabel: "/target_checkup",
      });
      return {
        name: resolved.name,
        path: resolved.path,
      };
    }

    if (!request.activeProject) {
      throw new ActiveTargetProjectUnavailableError();
    }

    const gitMetadataExists = Boolean(
      await safeStat(path.join(request.activeProject.path, ".git")),
    );
    if (!gitMetadataExists) {
      throw new ActiveTargetProjectGitMissingError(request.activeProject);
    }

    return {
      name: request.activeProject.name,
      path: request.activeProject.path,
    };
  }

  private async collectDimensions(params: {
    targetProject: ProjectRef;
    gitGuard: TargetCheckupGitGuard;
  }): Promise<CollectDimensionsResult> {
    const preparationIntegrity = await this.collectPreparationIntegrity({
      targetProject: params.targetProject,
      runnerRepoPath: this.dependencies.runnerRepoPath,
    });
    const documentationGovernance = await this.collectDocumentationGovernance(params.targetProject);
    const commandDiscovery = await this.discoverCommands(params.targetProject.path);
    const localOperability = this.buildLocalOperabilityDimension(commandDiscovery);
    const validationDeliveryHealth = await this.collectValidationDeliveryHealth({
      targetProject: params.targetProject,
      gitGuard: params.gitGuard,
      discovery: commandDiscovery,
    });
    const observability = this.buildObservabilityDimension();

    const dimensions = [
      preparationIntegrity,
      localOperability,
      validationDeliveryHealth,
      documentationGovernance,
      observability,
    ];

    return {
      dimensions,
      overallVerdict: determineOverallVerdict(dimensions),
    };
  }

  private async collectPreparationIntegrity(
    context: PrepareIntegrityContext,
  ): Promise<TargetCheckupDimensionResult> {
    const evidence: TargetCheckupEvidenceItem[] = [];
    const expectedWorkflowDependencies = resolveTargetPrepareWorkflowCompleteDependencies(
      context.targetProject.path,
      context.runnerRepoPath,
    );

    const manifestAbsolutePath = path.join(context.targetProject.path, TARGET_PREPARE_MANIFEST_PATH);
    const reportAbsolutePath = path.join(context.targetProject.path, TARGET_PREPARE_REPORT_PATH);
    const manifestRaw = await safeReadFile(manifestAbsolutePath);
    const prepareReportRaw = await safeReadFile(reportAbsolutePath);
    let manifest: TargetPrepareManifest | null = null;

    if (!manifestRaw) {
      evidence.push({
        code: "prepare-manifest-missing",
        status: "gap",
        summary: "Manifesto canônico do target_prepare ausente.",
        paths: [TARGET_PREPARE_MANIFEST_PATH],
      });
    } else {
      evidence.push({
        code: "prepare-manifest-present",
        status: "ok",
        summary: "Manifesto canônico do target_prepare encontrado.",
        paths: [TARGET_PREPARE_MANIFEST_PATH],
      });

      try {
        manifest = JSON.parse(manifestRaw) as TargetPrepareManifest;
        if (manifest.targetProject?.name !== context.targetProject.name) {
          evidence.push({
            code: "prepare-manifest-target-mismatch",
            status: "gap",
            summary: "O manifesto de preparo nao aponta para o projeto alvo atual.",
            paths: [TARGET_PREPARE_MANIFEST_PATH],
          });
        }

        if (manifest.artifacts?.manifestPath !== TARGET_PREPARE_MANIFEST_PATH) {
          evidence.push({
            code: "prepare-manifest-artifact-path-invalid",
            status: "gap",
            summary: "O manifesto de preparo registra caminho inesperado para si mesmo.",
            paths: [TARGET_PREPARE_MANIFEST_PATH],
          });
        }
      } catch {
        evidence.push({
          code: "prepare-manifest-invalid-json",
          status: "gap",
          summary: "Manifesto do target_prepare existe, mas nao e um JSON valido.",
          paths: [TARGET_PREPARE_MANIFEST_PATH],
        });
      }
    }

    for (const dependency of expectedWorkflowDependencies) {
      const declaredDependency = manifest?.workflowCompleteDependencies?.find(
        (entry) => entry.artifactId === dependency.artifactId,
      );
      evidence.push({
        code: `prepare-workflow-dependency-declared-${dependency.artifactId}`,
        status: matchesWorkflowDependency(declaredDependency, dependency) ? "ok" : "gap",
        summary: matchesWorkflowDependency(declaredDependency, dependency)
          ? `Manifesto do target_prepare declara ${dependency.artifactId} pela estrategia ${dependency.accessMode}.`
          : `Manifesto do target_prepare nao declara ${dependency.artifactId} pela estrategia canonica esperada.`,
        paths: [TARGET_PREPARE_MANIFEST_PATH],
      });
    }

    if (!prepareReportRaw) {
      evidence.push({
        code: "prepare-report-missing",
        status: "gap",
        summary: "Relatorio canônico do target_prepare ausente.",
        paths: [TARGET_PREPARE_REPORT_PATH],
      });
    } else {
      evidence.push({
        code: "prepare-report-present",
        status: "ok",
        summary: "Relatorio canônico do target_prepare encontrado.",
        paths: [TARGET_PREPARE_REPORT_PATH],
      });
    }

    for (const dependency of expectedWorkflowDependencies) {
      const reportDeclaresDependency = Boolean(
        prepareReportRaw?.includes(dependency.targetRelativePath) &&
          prepareReportRaw.includes(dependency.accessMode),
      );
      evidence.push({
        code: `prepare-report-workflow-dependency-${dependency.artifactId}`,
        status: reportDeclaresDependency ? "ok" : "gap",
        summary: reportDeclaresDependency
          ? `Relatorio do target_prepare explicita ${dependency.artifactId} em ${dependency.targetRelativePath}.`
          : `Relatorio do target_prepare nao explicita ${dependency.artifactId} pelo caminho canonico esperado.`,
        paths: [TARGET_PREPARE_REPORT_PATH],
      });

      const resolvedDependencyAbsolutePath = path.resolve(
        context.targetProject.path,
        dependency.targetRelativePath,
      );
      const sourceDependencyAbsolutePath = path.join(
        context.runnerRepoPath,
        dependency.sourceRelativePath,
      );
      const [resolvedDependencyContent, sourceDependencyContent] = await Promise.all([
        safeReadFile(resolvedDependencyAbsolutePath),
        safeReadFile(sourceDependencyAbsolutePath),
      ]);
      const dependencyResolvable =
        typeof resolvedDependencyContent === "string" &&
        typeof sourceDependencyContent === "string" &&
        resolvedDependencyContent === sourceDependencyContent;

      evidence.push({
        code: `prepare-workflow-dependency-resolved-${dependency.artifactId}`,
        status: dependencyResolvable ? "ok" : "gap",
        summary: dependencyResolvable
          ? `${dependency.artifactId} permanece resolvivel pelo caminho canonico ${dependency.targetRelativePath}.`
          : `${dependency.artifactId} nao esta resolvivel pelo caminho canonico ${dependency.targetRelativePath}.`,
        paths: [dependency.targetRelativePath],
      });
    }

    for (const relativeDir of TARGET_CHECKUP_REQUIRED_DIRECTORIES) {
      const stats = await safeStat(path.join(context.targetProject.path, relativeDir));
      evidence.push({
        code: `required-directory-${relativeDir}`,
        status: stats?.isDirectory() ? "ok" : "gap",
        summary: stats?.isDirectory()
          ? `Diretorio obrigatorio presente: ${relativeDir}.`
          : `Diretorio obrigatorio ausente: ${relativeDir}.`,
        paths: [relativeDir],
      });
    }

    for (const entry of TARGET_PREPARE_EXACT_COPY_SOURCES) {
      const sourceAbsolutePath = path.join(context.runnerRepoPath, entry.sourceRelativePath);
      const targetAbsolutePath = path.join(context.targetProject.path, entry.targetPath);
      const sourceContent = await safeReadFile(sourceAbsolutePath);
      const targetContent = await safeReadFile(targetAbsolutePath);
      if (!sourceContent || !targetContent) {
        evidence.push({
          code: `prepare-copy-missing-${entry.targetPath}`,
          status: "gap",
          summary: `Superficie sincronizada por copia exata ausente: ${entry.targetPath}.`,
          paths: [entry.targetPath],
        });
        continue;
      }

      evidence.push({
        code: `prepare-copy-match-${entry.targetPath}`,
        status: sourceContent === targetContent ? "ok" : "gap",
        summary:
          sourceContent === targetContent
            ? `Superficie sincronizada por copia exata preservada: ${entry.targetPath}.`
            : `Superficie de copia exata divergiu do runner: ${entry.targetPath}.`,
        paths: [entry.targetPath],
      });
    }

    for (const entry of TARGET_PREPARE_MERGED_FILE_SOURCES) {
      const sourceAbsolutePath = path.join(context.runnerRepoPath, entry.sourceRelativePath);
      const targetAbsolutePath = path.join(context.targetProject.path, entry.targetPath);
      const sourceContent = (await safeReadFile(sourceAbsolutePath))?.trim() ?? "";
      const targetContent = await safeReadFile(targetAbsolutePath);
      const managedBlock = targetContent ? readManagedBlock(targetContent, entry.markerId) : "";

      evidence.push({
        code: `prepare-managed-block-${entry.targetPath}`,
        status: managedBlock === sourceContent && managedBlock.length > 0 ? "ok" : "gap",
        summary:
          managedBlock === sourceContent && managedBlock.length > 0
            ? `Bloco gerenciado preservado em ${entry.targetPath}.`
            : `Bloco gerenciado divergente ou ausente em ${entry.targetPath}.`,
        paths: [entry.targetPath],
      });
    }

    return buildDimensionResult({
      key: "preparation_integrity",
      evidence,
      commands: [],
      okSummary:
        "Manifesto, relatorio de preparo e superficies gerenciadas do onboarding permanecem integros.",
      nonOkSummary:
        "Foram encontrados desvios objetivos no preparo versionado que comprometem a integridade do onboarding.",
    });
  }

  private async collectDocumentationGovernance(
    targetProject: ProjectRef,
  ): Promise<TargetCheckupDimensionResult> {
    const evidence: TargetCheckupEvidenceItem[] = [];

    for (const relativePath of TARGET_CHECKUP_REQUIRED_DOCUMENTS) {
      const absolutePath = path.join(targetProject.path, relativePath);
      const content = await safeReadFile(absolutePath);
      evidence.push({
        code: `required-document-${relativePath}`,
        status: content && content.trim().length > 0 ? "ok" : "gap",
        summary:
          content && content.trim().length > 0
            ? `Documento canônico presente e nao vazio: ${relativePath}.`
            : `Documento canônico ausente ou vazio: ${relativePath}.`,
        paths: [relativePath],
      });
    }

    return buildDimensionResult({
      key: "documentation_governance",
      evidence,
      commands: [],
      okSummary:
        "As superficies documentais canonicas do workflow permanecem presentes e legiveis.",
      nonOkSummary:
        "A governanca documental do workflow apresenta lacunas objetivas em superficies canonicas obrigatorias.",
    });
  }

  private async discoverCommands(projectPath: string): Promise<CommandDiscoveryResult> {
    const commandsByName = new Map<string, DiscoveredTargetCheckupCommand>();
    const evidence: TargetCheckupEvidenceItem[] = [];
    let explicitSurfaceFound = false;
    let hasUnsupportedSurface = false;

    const packageJsonAbsolutePath = path.join(projectPath, "package.json");
    const packageJsonRaw = await safeReadFile(packageJsonAbsolutePath);
    if (packageJsonRaw) {
      explicitSurfaceFound = true;
      try {
        const packageJson = JSON.parse(packageJsonRaw) as {
          packageManager?: string;
          scripts?: Record<string, unknown>;
        };
        evidence.push({
          code: "package-json-present",
          status: "ok",
          summary: "Superficie package.json encontrada para descoberta de comandos.",
          paths: ["package.json"],
        });

        const packageManager = resolvePackageManager(packageJson.packageManager, projectPath);
        if (!packageManager.supported) {
          hasUnsupportedSurface = true;
          evidence.push({
            code: "package-manager-unsupported",
            status: "blocked",
            summary: `Package manager nao suportado para execucao segura no v1: ${packageManager.commandLabel}.`,
            paths: ["package.json"],
          });
        } else if (isRecord(packageJson.scripts)) {
          const discoveredInPackageJson: string[] = [];
          for (const scriptName of TARGET_CHECKUP_SAFE_COMMAND_NAMES) {
            const scriptValue = packageJson.scripts[scriptName];
            if (typeof scriptValue !== "string" || commandsByName.has(scriptName)) {
              continue;
            }

            commandsByName.set(scriptName, {
              id: `package-json:${scriptName}`,
              name: scriptName,
              label: `package.json#scripts.${scriptName}`,
              source: "package-json",
              command: packageManager.command,
              args: packageManager.command === "yarn" ? [scriptName] : ["run", scriptName],
            });
            discoveredInPackageJson.push(scriptName);
          }

          evidence.push({
            code: "package-json-supported-commands",
            status: discoveredInPackageJson.length > 0 ? "ok" : "info",
            summary:
              discoveredInPackageJson.length > 0
                ? `Comandos suportados descobertos em package.json: ${discoveredInPackageJson.join(", ")}.`
                : "package.json presente, mas sem comandos suportados na allowlist de checkup.",
            paths: ["package.json"],
          });
        } else {
          evidence.push({
            code: "package-json-scripts-missing",
            status: "info",
            summary: "package.json presente sem objeto scripts legivel por maquina.",
            paths: ["package.json"],
          });
        }
      } catch {
        evidence.push({
          code: "package-json-invalid",
          status: "gap",
          summary: "package.json existe, mas nao e um JSON valido para descoberta objetiva.",
          paths: ["package.json"],
        });
      }
    }

    const makefileAbsolutePath = path.join(projectPath, "Makefile");
    const makefileRaw = await safeReadFile(makefileAbsolutePath);
    if (makefileRaw) {
      explicitSurfaceFound = true;
      const targets = collectMakeTargets(makefileRaw);
      const discoveredTargets: string[] = [];
      for (const targetName of TARGET_CHECKUP_SAFE_COMMAND_NAMES) {
        if (!targets.has(targetName) || commandsByName.has(targetName)) {
          continue;
        }

        commandsByName.set(targetName, {
          id: `makefile:${targetName}`,
          name: targetName,
          label: `Makefile:${targetName}`,
          source: "makefile",
          command: "make",
          args: [targetName],
        });
        discoveredTargets.push(targetName);
      }

      evidence.push({
        code: "makefile-supported-commands",
        status: discoveredTargets.length > 0 ? "ok" : "info",
        summary:
          discoveredTargets.length > 0
            ? `Alvos suportados descobertos em Makefile: ${discoveredTargets.join(", ")}.`
            : "Makefile presente, mas sem alvos suportados na allowlist de checkup.",
        paths: ["Makefile"],
      });
    }

    const justfileAbsolutePath = path.join(projectPath, "justfile");
    const justfileRaw = await safeReadFile(justfileAbsolutePath);
    if (justfileRaw) {
      explicitSurfaceFound = true;
      const recipes = collectJustfileRecipes(justfileRaw);
      const discoveredRecipes: string[] = [];
      for (const recipeName of TARGET_CHECKUP_SAFE_COMMAND_NAMES) {
        if (!recipes.has(recipeName) || commandsByName.has(recipeName)) {
          continue;
        }

        commandsByName.set(recipeName, {
          id: `justfile:${recipeName}`,
          name: recipeName,
          label: `justfile:${recipeName}`,
          source: "justfile",
          command: "just",
          args: [recipeName],
        });
        discoveredRecipes.push(recipeName);
      }

      evidence.push({
        code: "justfile-supported-commands",
        status: discoveredRecipes.length > 0 ? "ok" : "info",
        summary:
          discoveredRecipes.length > 0
            ? `Receitas suportadas descobertas em justfile: ${discoveredRecipes.join(", ")}.`
            : "justfile presente, mas sem receitas suportadas na allowlist de checkup.",
        paths: ["justfile"],
      });
    }

    const commands = DEFAULT_COMMANDS_TO_EXECUTE
      .map((commandName) => commandsByName.get(commandName))
      .filter((entry): entry is DiscoveredTargetCheckupCommand => Boolean(entry));

    return {
      commands,
      evidence,
      explicitSurfaceFound,
      hasUnsupportedSurface,
    };
  }

  private buildLocalOperabilityDimension(
    discovery: CommandDiscoveryResult,
  ): TargetCheckupDimensionResult {
    const evidence = [...discovery.evidence];

    if (discovery.commands.length > 0) {
      evidence.push({
        code: "local-operability-supported-command-discovered",
        status: "ok",
        summary: `Comando(s) nao interativo(s) suportado(s) descoberto(s): ${discovery.commands
          .map((command) => command.label)
          .join(", ")}.`,
      });
    } else if (!discovery.explicitSurfaceFound) {
      evidence.push({
        code: "local-operability-explicit-surface-missing",
        status: "gap",
        summary:
          "Nenhuma superficie explicita e legivel por maquina foi encontrada para descoberta de comandos (package.json, Makefile ou justfile).",
      });
    } else if (discovery.hasUnsupportedSurface) {
      evidence.push({
        code: "local-operability-unsupported-surface",
        status: "blocked",
        summary:
          "Existe superficie explicita de comandos, mas o runner nao consegue executa-la com suporte seguro no v1.",
      });
    } else {
      evidence.push({
        code: "local-operability-safe-command-missing",
        status: "gap",
        summary:
          "As superficies explicitas existem, mas nao declararam comandos suportados pela allowlist conservadora do checkup.",
      });
    }

    return buildDimensionResult({
      key: "local_operability",
      evidence,
      commands: [],
      okSummary:
        "O projeto expoe ao menos uma superficie explicita e segura para operacao local observavel pelo checkup.",
      nonOkSummary:
        "A operabilidade local nao ficou comprovada por superficies machine-readable seguras o bastante para o checkup v1.",
    });
  }

  private async collectValidationDeliveryHealth(params: {
    targetProject: ProjectRef;
    gitGuard: TargetCheckupGitGuard;
    discovery: CommandDiscoveryResult;
  }): Promise<TargetCheckupDimensionResult> {
    const evidence: TargetCheckupEvidenceItem[] = [];
    const commands: TargetCheckupCommandExecution[] = [];

    if (params.discovery.commands.length === 0) {
      evidence.push({
        code: params.discovery.hasUnsupportedSurface
          ? "validation-command-surface-blocked"
          : "validation-command-missing",
        status: params.discovery.hasUnsupportedSurface ? "blocked" : "gap",
        summary: params.discovery.hasUnsupportedSurface
          ? "A saude de validacao/entrega ficou bloqueada porque a superficie declarada nao e suportada pelo runner no v1."
          : "Nao foi descoberto comando seguro e nao interativo para validar entrega neste projeto.",
      });

      return buildDimensionResult({
        key: "validation_delivery_health",
        evidence,
        commands,
        okSummary:
          "Os comandos seguros de validacao/entrega declarados pelo projeto executaram com sucesso.",
        nonOkSummary:
          "A saude de validacao/entrega nao ficou comprovada por comandos seguros e observaveis no snapshot atual.",
      });
    }

    for (const discoveredCommand of params.discovery.commands) {
      const result = await this.commandRunner.run({
        command: discoveredCommand.command,
        args: discoveredCommand.args,
        cwd: params.targetProject.path,
        timeoutMs: COMMAND_TIMEOUT_MS,
      });

      const changedPathsAfterCommand = await params.gitGuard.listChangedPaths();
      if (changedPathsAfterCommand.length > 0) {
        throw new TargetCheckupCommandMutationError(
          discoveredCommand.label,
          changedPathsAfterCommand.map(normalizeRelativePath),
        );
      }

      commands.push({
        command_id: discoveredCommand.id,
        label: discoveredCommand.label,
        source: discoveredCommand.source,
        command: discoveredCommand.command,
        args: [...discoveredCommand.args],
        working_directory: ".",
        exit_code: result.exitCode,
        duration_ms: result.durationMs,
        stdout_summary: summarizeProcessOutput(result.stdout),
        stderr_summary: summarizeProcessOutput(result.stderr),
      });

      if (result.failedToSpawn) {
        evidence.push({
          code: `validation-command-blocked-${discoveredCommand.id}`,
          status: "blocked",
          summary: `Nao foi possivel iniciar ${discoveredCommand.label}.`,
          detail: summarizeProcessOutput(result.stderr),
        });
        continue;
      }

      if (result.exitCode !== 0) {
        evidence.push({
          code: `validation-command-failed-${discoveredCommand.id}`,
          status: "execution_failed",
          summary: `${discoveredCommand.label} terminou com exit code ${String(result.exitCode)}.`,
          detail: summarizeProcessOutput(result.stderr || result.stdout),
        });
        continue;
      }

      evidence.push({
        code: `validation-command-ok-${discoveredCommand.id}`,
        status: "ok",
        summary: `${discoveredCommand.label} concluiu com sucesso.`,
        detail: summarizeProcessOutput(result.stdout),
      });
    }

    return buildDimensionResult({
      key: "validation_delivery_health",
      evidence,
      commands,
      okSummary:
        "Os comandos seguros de validacao/entrega descobertos em superficies explicitas executaram com sucesso.",
      nonOkSummary:
        "Ao menos um comando seguro de validacao/entrega falhou, ficou bloqueado ou nao ficou disponivel para execucao segura.",
    });
  }

  private buildObservabilityDimension(): TargetCheckupDimensionResult {
    return {
      key: "observability",
      label: TARGET_CHECKUP_DIMENSION_LABELS.observability,
      verdict: "n/a",
      summary: "A dimensao de observabilidade permanece opcional e nao bloqueante no v1 do target_checkup.",
      evidence: [
        {
          code: "observability-v1-not-assessed",
          status: "info",
          summary:
            "O v1 registra explicitamente que a observabilidade nao foi avaliada como gate bloqueante nesta rodada.",
        },
      ],
      commands: [],
    };
  }

  private buildReport(params: {
    targetProject: ProjectRef;
    analyzedHeadSha: string;
    branch: string;
    startedAt: Date;
    finishedAt: Date;
    reportJsonPath: string;
    reportMarkdownPath: string;
    overallVerdict: TargetCheckupOverallVerdict;
    dimensions: TargetCheckupDimensionResult[];
    editorialSummaryMarkdown: string | null;
    reportCommitSha: string | null;
    reportCommitShaConvention: string | null;
  }): TargetCheckupReport {
    const report: TargetCheckupReport = {
      contract_version: TARGET_CHECKUP_CONTRACT_VERSION,
      schema_version: TARGET_CHECKUP_SCHEMA_VERSION,
      target_project: {
        name: params.targetProject.name,
        path: params.targetProject.path,
      },
      started_at_utc: params.startedAt.toISOString(),
      finished_at_utc: params.finishedAt.toISOString(),
      analyzed_head_sha: params.analyzedHeadSha,
      branch: params.branch,
      working_tree_clean_at_start: true,
      report_commit_sha: params.reportCommitSha,
      report_commit_sha_convention: params.reportCommitShaConvention,
      artifacts: {
        json_path: params.reportJsonPath,
        markdown_path: params.reportMarkdownPath,
      },
      overall_verdict: params.overallVerdict,
      dimensions: params.dimensions.map(cloneDimensionResult),
      editorial_summary_markdown: params.editorialSummaryMarkdown,
      derivation_readiness: {
        eligible: false,
        checked_at_utc: params.finishedAt.toISOString(),
        expires_at_utc: null,
        reasons: [],
      },
      gap_derivation: null,
    };

    report.derivation_readiness = evaluateTargetCheckupDerivationReadiness(report, {
      now: params.finishedAt,
    });

    return report;
  }

  private async renderEditorialSummary(params: {
    codexClient: TargetCheckupCodexClient;
    report: TargetCheckupReport;
    runnerReference: string;
  }): Promise<{
    markdown: string;
    outputText: string;
    promptTemplatePath: string;
    promptText: string;
    diagnostics?: TargetCheckupCodexResult["diagnostics"];
  }> {
    const factsPayload = JSON.stringify(
      {
        target_project: params.report.target_project,
        started_at_utc: params.report.started_at_utc,
        finished_at_utc: params.report.finished_at_utc,
        analyzed_head_sha: params.report.analyzed_head_sha,
        branch: params.report.branch,
        working_tree_clean_at_start: params.report.working_tree_clean_at_start,
        overall_verdict: params.report.overall_verdict,
        dimensions: params.report.dimensions,
        derivation_readiness: params.report.derivation_readiness,
      },
      null,
      2,
    );

    const result = await params.codexClient.runTargetCheckup({
      targetProject: params.report.target_project,
      runnerRepoPath: this.dependencies.runnerRepoPath,
      runnerReference: params.runnerReference,
      reportJsonPath: params.report.artifacts.json_path,
      reportMarkdownPath: params.report.artifacts.markdown_path,
      reportFactsJson: factsPayload,
    } satisfies TargetCheckupCodexRequest);

    const sanitized = sanitizeEditorialSummary(result.output);
    if (sanitized) {
      return {
        markdown: sanitized,
        outputText: result.output,
        promptTemplatePath: result.promptTemplatePath,
        promptText: result.promptText,
        ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
      };
    }

    return {
      markdown: buildDeterministicEditorialFallback(params.report),
      outputText: result.output,
      promptTemplatePath: result.promptTemplatePath,
      promptText: result.promptText,
      ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
    };
  }

  private async writeReportArtifacts(
    targetProjectPath: string,
    report: TargetCheckupReport,
  ): Promise<void> {
    const jsonAbsolutePath = path.join(targetProjectPath, report.artifacts.json_path);
    const markdownAbsolutePath = path.join(targetProjectPath, report.artifacts.markdown_path);

    await fs.mkdir(path.dirname(jsonAbsolutePath), { recursive: true });
    await fs.mkdir(path.dirname(markdownAbsolutePath), { recursive: true });
    await fs.writeFile(jsonAbsolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(markdownAbsolutePath, renderTargetCheckupMarkdownReport(report), "utf8");
  }
}

class DefaultTargetCheckupCommandRunner implements TargetCheckupCommandRunner {
  async run(
    request: TargetCheckupCommandRunnerRequest,
  ): Promise<TargetCheckupCommandRunnerResult> {
    return new Promise<TargetCheckupCommandRunnerResult>((resolve) => {
      const startedAt = Date.now();
      const child = spawn(request.command, request.args, {
        cwd: request.cwd,
        env: {
          ...process.env,
          CI: "1",
          GIT_TERMINAL_PROMPT: "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let failedToSpawn = false;
      let settled = false;

      const finalize = (exitCode: number | null) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({
          exitCode,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
          failedToSpawn,
        });
      };

      child.stdout?.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        failedToSpawn = true;
        stderr = `${stderr}${stderr ? "\n" : ""}${String(error)}`;
        finalize(null);
      });

      child.on("close", (exitCode) => {
        finalize(exitCode);
      });

      const timeoutHandle = setTimeout(() => {
        stderr = `${stderr}${stderr ? "\n" : ""}Processo excedeu o timeout de ${COMMAND_TIMEOUT_MS}ms.`;
        child.kill("SIGTERM");
      }, request.timeoutMs);
    });
  }
}

class ActiveTargetProjectUnavailableError extends Error {
  constructor() {
    super("Nao existe projeto ativo selecionado para executar /target_checkup sem argumento.");
    this.name = "ActiveTargetProjectUnavailableError";
  }
}

class ActiveTargetProjectGitMissingError extends Error {
  constructor(project: ProjectRef) {
    super(
      `Projeto ativo ${project.name} nao e um repositorio Git valido para /target_checkup.`,
    );
    this.name = "TargetProjectGitMissingError";
  }
}

class TargetCheckupCommandMutationError extends Error {
  constructor(
    public readonly commandLabel: string,
    public readonly changedPaths: string[],
  ) {
    super(
      `O comando ${commandLabel} alterou o working tree durante o target_checkup: ${changedPaths.join(", ")}.`,
    );
    this.name = "TargetCheckupCommandMutationError";
  }
}

const buildDimensionResult = (params: {
  key: TargetCheckupDimensionKey;
  evidence: TargetCheckupEvidenceItem[];
  commands: TargetCheckupCommandExecution[];
  okSummary: string;
  nonOkSummary: string;
}): TargetCheckupDimensionResult => {
  const verdict = summarizeDimensionVerdict(params.evidence);
  return {
    key: params.key,
    label: TARGET_CHECKUP_DIMENSION_LABELS[params.key],
    verdict,
    summary: verdict === "ok" ? params.okSummary : params.nonOkSummary,
    evidence: params.evidence,
    commands: params.commands,
  };
};

const summarizeDimensionVerdict = (
  evidence: TargetCheckupEvidenceItem[],
): TargetCheckupDimensionVerdict => {
  if (evidence.some((entry) => entry.status === "execution_failed")) {
    return "execution_failed";
  }

  if (evidence.some((entry) => entry.status === "blocked")) {
    return "blocked";
  }

  if (evidence.some((entry) => entry.status === "gap")) {
    return "gap";
  }

  return "ok";
};

const determineOverallVerdict = (
  dimensions: TargetCheckupDimensionResult[],
): TargetCheckupOverallVerdict =>
  TARGET_CHECKUP_REQUIRED_DIMENSIONS.every(
    (key) => dimensions.find((dimension) => dimension.key === key)?.verdict === "ok",
  )
    ? "valid_for_gap_ticket_derivation"
    : "invalid_for_gap_ticket_derivation";

export const buildTargetCheckupNextAction = (report: TargetCheckupReport): string => {
  if (report.overall_verdict === "valid_for_gap_ticket_derivation") {
    return [
      "Relatorio canonico publicado.",
      `Execute /target_derive_gaps ${report.target_project.name} ${report.artifacts.json_path} para materializar os gaps readiness elegiveis.`,
    ].join(" ");
  }

  return "Corrija os gaps registrados, garanta novo snapshot limpo e rerode /target_checkup.";
};

export const renderTargetCheckupMarkdownReport = (report: TargetCheckupReport): string => {
  const lines: string[] = [
    `# Readiness checkup - ${report.target_project.name}`,
    "",
    `- Contract version: ${report.contract_version}`,
    `- Schema version: ${report.schema_version}`,
    `- Started at (UTC): ${report.started_at_utc}`,
    `- Finished at (UTC): ${report.finished_at_utc}`,
    `- Analyzed head SHA: ${report.analyzed_head_sha ?? "(ausente)"}`,
    `- Branch: ${report.branch ?? "(ausente)"}`,
    `- Working tree clean at start: ${report.working_tree_clean_at_start ? "true" : "false"}`,
    `- Report commit SHA: ${report.report_commit_sha ?? "(pendente antes da publicacao final)"}`,
    `- Report commit SHA convention: ${report.report_commit_sha_convention ?? "(pendente)"}`,
    `- JSON artifact: ${report.artifacts.json_path}`,
    `- Markdown artifact: ${report.artifacts.markdown_path}`,
    `- Overall verdict: ${report.overall_verdict}`,
    "",
    "## Derivation readiness snapshot",
    "",
    `- Eligible: ${report.derivation_readiness.eligible ? "yes" : "no"}`,
    `- Checked at (UTC): ${report.derivation_readiness.checked_at_utc}`,
    `- Expires at (UTC): ${report.derivation_readiness.expires_at_utc ?? "(indisponivel)"}`,
    "",
  ];

  if (report.derivation_readiness.reasons.length > 0) {
    lines.push("Reasons:");
    for (const reason of report.derivation_readiness.reasons) {
      lines.push(`- ${reason}`);
    }
    lines.push("");
  }

  lines.push("## Gap derivation");
  lines.push("");
  if (!report.gap_derivation) {
    lines.push("- Status: not_requested");
    lines.push("- Derived at (UTC): (nao executado)");
    lines.push("- Touched ticket paths: (nenhum)");
    lines.push("");
  } else {
    lines.push(`- Status: ${report.gap_derivation.derivation_status}`);
    lines.push(`- Derived at (UTC): ${report.gap_derivation.derived_at_utc}`);
    lines.push(
      `- Touched ticket paths: ${report.gap_derivation.touched_ticket_paths.join(", ") || "(nenhum)"}`,
    );
    lines.push("");
    if (report.gap_derivation.gap_results.length > 0) {
      lines.push("Gap results:");
      for (const gap of report.gap_derivation.gap_results) {
        lines.push(
          `- ${gap.title} | ${gap.gap_id} | ${gap.gap_fingerprint} | result=${gap.result}`,
        );
        lines.push(`  Dimension: ${gap.checkup_dimension}`);
        lines.push(`  Gap type: ${gap.gap_type}`);
        lines.push(`  Priority: ${gap.priority.priority} (score=${gap.priority.score})`);
        lines.push(`  Surface: ${gap.remediation_surface.join(", ") || "(nenhuma)"}`);
        lines.push(`  Rationale: ${gap.rationale}`);
        lines.push(`  Ticket paths: ${gap.ticket_paths.join(", ") || "(nenhum)"}`);
      }
      lines.push("");
    }
  }

  lines.push("## Editorial summary");
  lines.push("");
  lines.push(report.editorial_summary_markdown?.trim() || "_Sem sintese editorial._");
  lines.push("");
  lines.push("## Dimensions");
  lines.push("");

  for (const dimension of report.dimensions) {
    lines.push(`### ${dimension.label}`);
    lines.push("");
    lines.push(`- Verdict: ${dimension.verdict}`);
    lines.push(`- Summary: ${dimension.summary}`);
    lines.push("");

    if (dimension.evidence.length > 0) {
      lines.push("Evidence:");
      for (const entry of dimension.evidence) {
        lines.push(`- [${entry.status}] ${entry.summary}`);
        if (entry.detail) {
          lines.push(`  Detail: ${entry.detail}`);
        }
        if (entry.paths && entry.paths.length > 0) {
          lines.push(`  Paths: ${entry.paths.join(", ")}`);
        }
      }
      lines.push("");
    }

    if (dimension.commands.length > 0) {
      lines.push("Commands:");
      for (const command of dimension.commands) {
        lines.push(
          `- ${command.label} -> \`${[command.command, ...command.args].join(" ")}\` | exit=${String(command.exit_code)} | duration_ms=${command.duration_ms}`,
        );
        if (command.stdout_summary) {
          lines.push(`  stdout: ${command.stdout_summary}`);
        }
        if (command.stderr_summary) {
          lines.push(`  stderr: ${command.stderr_summary}`);
        }
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
};

const buildDeterministicEditorialFallback = (report: TargetCheckupReport): string =>
  [
    "### Executive summary",
    `O veredito geral desta rodada foi \`${report.overall_verdict}\` com base em fatos coletados deterministicamente no snapshot \`${report.analyzed_head_sha ?? "n/a"}\`.`,
    "",
    "### Key findings",
    ...report.dimensions
      .filter((dimension) => dimension.verdict !== "ok" && dimension.verdict !== "n/a")
      .map((dimension) => `- ${dimension.label}: ${dimension.summary}`),
    ...(
      report.dimensions.every((dimension) => dimension.verdict === "ok" || dimension.verdict === "n/a")
        ? ["- Nenhum gap bloqueante foi encontrado nas dimensoes obrigatorias."]
        : []
    ),
    "",
    "### Next action",
    buildTargetCheckupNextAction(report),
  ].join("\n");

const sanitizeEditorialSummary = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const fencedMatch = trimmed.match(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/u);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  return trimmed;
};

const summarizeProcessOutput = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(" | ")
    .slice(0, 500);
};

const resolvePackageManager = (
  packageManagerField: string | undefined,
  projectPath: string,
): {
  command: string;
  commandLabel: string;
  supported: boolean;
} => {
  if (packageManagerField) {
    const normalized = packageManagerField.split("@")[0]?.trim() ?? "";
    if (["npm", "pnpm", "yarn", "bun"].includes(normalized)) {
      return {
        command: normalized,
        commandLabel: normalized,
        supported: true,
      };
    }

    return {
      command: normalized || packageManagerField,
      commandLabel: packageManagerField,
      supported: false,
    };
  }

  if (safeExistsSync(path.join(projectPath, "pnpm-lock.yaml"))) {
    return { command: "pnpm", commandLabel: "pnpm", supported: true };
  }
  if (safeExistsSync(path.join(projectPath, "yarn.lock"))) {
    return { command: "yarn", commandLabel: "yarn", supported: true };
  }
  if (safeExistsSync(path.join(projectPath, "bun.lockb")) || safeExistsSync(path.join(projectPath, "bun.lock"))) {
    return { command: "bun", commandLabel: "bun", supported: true };
  }

  return { command: "npm", commandLabel: "npm", supported: true };
};

const collectMakeTargets = (value: string): Set<string> => {
  const targets = new Set<string>();
  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Za-z0-9][A-Za-z0-9_.-]*):/u);
    if (match?.[1]) {
      targets.add(match[1]);
    }
  }

  return targets;
};

const collectJustfileRecipes = (value: string): Set<string> => {
  const recipes = new Set<string>();
  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Za-z0-9][A-Za-z0-9_-]*)(?:\s+[^:]*)?:/u);
    if (match?.[1] && !line.startsWith("#")) {
      recipes.add(match[1]);
    }
  }

  return recipes;
};

const mapTargetResolutionError = (error: unknown): TargetCheckupExecutionResult => {
  const message = error instanceof Error ? error.message : String(error);
  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: unknown }).name);
    if (name === "ActiveTargetProjectUnavailableError") {
      return { status: "blocked", reason: "active-project-unavailable", message };
    }

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

const normalizeRelativePath = (value: string): string => value.replace(/\\/gu, "/");

const safeStat = async (value: string) => {
  try {
    return await fs.stat(value);
  } catch {
    return null;
  }
};

const safeReadFile = async (value: string): Promise<string | null> => {
  try {
    return await fs.readFile(value, "utf8");
  } catch {
    return null;
  }
};

const safeExistsSync = (value: string): boolean => {
  try {
    return existsSync(value);
  } catch {
    return false;
  }
};

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

const matchesWorkflowDependency = (
  actual: TargetPrepareWorkflowDependency | undefined,
  expected: TargetPrepareWorkflowDependency,
): boolean =>
  Boolean(
    actual &&
      actual.artifactId === expected.artifactId &&
      actual.requiredFor === expected.requiredFor &&
      actual.summary === expected.summary &&
      actual.sourceRelativePath === expected.sourceRelativePath &&
      actual.targetRelativePath === expected.targetRelativePath &&
      actual.accessMode === expected.accessMode,
  );

const cloneDimensionResult = (dimension: TargetCheckupDimensionResult): TargetCheckupDimensionResult => ({
  ...dimension,
  evidence: dimension.evidence.map((entry) => ({
    ...entry,
    ...(entry.paths ? { paths: [...entry.paths] } : {}),
  })),
  commands: dimension.commands.map((command) => ({
    ...command,
    args: [...command.args],
  })),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
