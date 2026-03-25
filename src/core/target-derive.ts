import { promises as fs } from "node:fs";
import path from "node:path";
import { Logger } from "./logger.js";
import {
  TargetDeriveGapAnalysisCodexClient,
} from "../integrations/codex-client.js";
import { GitVersioning } from "../integrations/git-client.js";
import {
  parseTargetDeriveGapAnalysisOutput,
} from "../integrations/target-derive-gap-analysis-parser.js";
import { TargetDeriveGitGuard } from "../integrations/target-derive-git-guard.js";
import { TargetProjectResolver } from "../integrations/target-project-resolver.js";
import { ProjectRef } from "../types/project.js";
import {
  TARGET_DERIVE_MILESTONE_LABELS,
  targetFlowKindToCommand,
} from "../types/target-flow.js";
import {
  buildTargetDeriveGapFingerprint,
  buildTargetDeriveGapId,
  computeGapDerivationStatus,
  computeTargetDerivePriority,
  mapDecisionToResultStatus,
  TargetDeriveExecutionResult,
  TargetDeriveGapAnalysisItem,
  TargetDeriveLifecycleHooks,
  TargetDeriveNormalizedGap,
  TargetDeriveResultStatus,
  TargetDeriveTicketSummary,
} from "../types/target-derive.js";
import {
  evaluateTargetCheckupDerivationReadiness,
  TargetCheckupGapDerivationSnapshot,
  TargetCheckupReport,
} from "../types/target-checkup.js";
import { renderTargetCheckupMarkdownReport } from "./target-checkup.js";

const REPORT_HISTORY_ROOT = "docs/checkups/history";
const INTERNAL_TICKET_TEMPLATE_PATH = "tickets/templates/internal-ticket-template.md";
const TICKET_FINGERPRINT_PATTERN = /^\s*-\s*Gap fingerprint\s*:\s*(.+?)\s*$/imu;
const TICKET_CREATED_AT_PATTERN = /^\s*-\s*Created at \(UTC\)\s*:\s*(.+?)\s*$/imu;
const TICKET_SOURCE_PATTERN = /^\s*-\s*Source\s*:\s*(.+?)\s*$/imu;

interface TargetDeriveExecutorDependencies {
  logger: Logger;
  targetProjectResolver: TargetProjectResolver;
  createCodexClient: (project: ProjectRef) => TargetDeriveGapAnalysisCodexClient;
  createGitVersioning: (project: ProjectRef) => GitVersioning;
  createGitGuard: (project: ProjectRef) => TargetDeriveGitGuard;
  runnerRepoPath: string;
  now?: () => Date;
}

export interface TargetDeriveExecuteRequest {
  projectName: string;
  reportPath: string;
}

export interface TargetDeriveExecutor {
  execute(
    request: TargetDeriveExecuteRequest,
    hooks?: TargetDeriveLifecycleHooks,
  ): Promise<TargetDeriveExecutionResult>;
}

interface ResolvedReportPaths {
  jsonPath: string;
  markdownPath: string;
  jsonAbsolutePath: string;
  markdownAbsolutePath: string;
}

interface DerivedTicketRecord {
  directory: "open" | "closed";
  path: string;
  absolutePath: string;
  fileName: string;
  fingerprint: string;
  content: string;
}

interface PlannedTicketMutation {
  path: string;
  absolutePath: string;
  content: string;
  existingContent: string | null;
}

interface PlannedGapOutcome {
  normalizedGap: TargetDeriveNormalizedGap;
  resultStatus: TargetDeriveResultStatus;
  rationale: string;
  ticketPaths: string[];
  ticketMutation: PlannedTicketMutation | null;
}

interface ReusablePreviousGapResult {
  resultStatus: TargetDeriveResultStatus;
  rationale: string;
  ticketPaths: string[];
}

export class ControlledTargetDeriveExecutor implements TargetDeriveExecutor {
  private readonly now: () => Date;

  constructor(private readonly dependencies: TargetDeriveExecutorDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async execute(
    request: TargetDeriveExecuteRequest,
    hooks?: TargetDeriveLifecycleHooks,
  ): Promise<TargetDeriveExecutionResult> {
    let targetProject: ProjectRef;
    try {
      const resolved = await this.dependencies.targetProjectResolver.resolveProject(
        request.projectName,
        {
          commandLabel: "/target_derive_gaps",
        },
      );
      targetProject = {
        name: resolved.name,
        path: resolved.path,
      };
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

    const currentHeadSha = await gitGuard.getHeadSha();
    if (!currentHeadSha) {
      return {
        status: "blocked",
        reason: "head-unresolved",
        message:
          "O target_derive_gaps exige `HEAD` resolvido antes de iniciar. Revise o repositorio alvo e tente novamente.",
      };
    }

    const resolvedReportPaths = resolveReportPaths(targetProject.path, request.reportPath);
    if ("status" in resolvedReportPaths) {
      return resolvedReportPaths;
    }

    const reportRaw = await safeReadFile(resolvedReportPaths.jsonAbsolutePath);
    const markdownRaw = await safeReadFile(resolvedReportPaths.markdownAbsolutePath);
    if (!reportRaw || !markdownRaw) {
      return {
        status: "blocked",
        reason: "report-not-found",
        message: [
          "O target_derive_gaps exige os artefatos canonicos .json e .md do mesmo report-path.",
          `JSON esperado: ${resolvedReportPaths.jsonPath}.`,
          `Markdown esperado: ${resolvedReportPaths.markdownPath}.`,
        ].join(" "),
      };
    }

    let report: TargetCheckupReport;
    try {
      report = JSON.parse(reportRaw) as TargetCheckupReport;
    } catch (error) {
      return {
        status: "blocked",
        reason: "report-invalid",
        message: `Relatorio JSON invalido para /target_derive_gaps: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    const validation = await this.validateReport({
      targetProject,
      report,
      reportPaths: resolvedReportPaths,
      gitGuard,
      currentHeadSha,
    });
    if (validation.status !== "ok") {
      return validation.result;
    }

    const codexClient = this.dependencies.createCodexClient(targetProject);
    let fixedCodexClient: TargetDeriveGapAnalysisCodexClient = codexClient;
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
            : "Falha ao validar autenticacao do Codex CLI para /target_derive_gaps.",
      };
    }
    await hooks?.onMilestone?.({
      flow: "target-derive",
      command: targetFlowKindToCommand("target-derive"),
      targetProject,
      milestone: "preflight",
      milestoneLabel: TARGET_DERIVE_MILESTONE_LABELS.preflight,
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
            "Nenhuma alteracao foi versionada. Reavalie o report e rerode quando estiver pronto.",
        },
      };
    }

    let gapAnalysis;
    try {
      await hooks?.onMilestone?.({
        flow: "target-derive",
        command: targetFlowKindToCommand("target-derive"),
        targetProject,
        milestone: "dedup-prioritization",
        milestoneLabel: TARGET_DERIVE_MILESTONE_LABELS["dedup-prioritization"],
        message: `Deduplicacao/priorizacao em andamento para ${targetProject.name}.`,
        versionBoundaryState: "before-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      const result = await fixedCodexClient.runTargetDeriveGapAnalysis({
        targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference: `codex-flow-runner@${this.dependencies.runnerRepoPath}`,
        reportJsonPath: resolvedReportPaths.jsonPath,
        reportMarkdownPath: resolvedReportPaths.markdownPath,
        reportFactsJson: JSON.stringify(
          {
            target_project: report.target_project,
            artifacts: report.artifacts,
            analyzed_head_sha: report.analyzed_head_sha,
            report_commit_sha: report.report_commit_sha,
            overall_verdict: report.overall_verdict,
            derivation_readiness: report.derivation_readiness,
            editorial_summary_markdown: report.editorial_summary_markdown,
            dimensions: report.dimensions,
            existing_gap_derivation: report.gap_derivation,
          },
          null,
          2,
        ),
      });
      gapAnalysis = parseTargetDeriveGapAnalysisOutput(result.output);
      await hooks?.onAiExchange?.({
        stageLabel: TARGET_DERIVE_MILESTONE_LABELS["dedup-prioritization"],
        promptTemplatePath: result.promptTemplatePath,
        promptText: result.promptText,
        outputText: result.output,
        ...(result.diagnostics ? { diagnostics: result.diagnostics } : {}),
      });
    } catch (error) {
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
          cancelledAtMilestone: "dedup-prioritization",
          changedPaths: [],
          nextAction:
            "Nenhuma alteracao foi versionada. Reavalie a analise gerada antes de decidir uma nova rodada.",
        },
      };
    }

    const normalizedGaps = normalizeGaps(gapAnalysis.gaps, resolvedReportPaths.jsonPath);
    const ticketInventory = await this.loadTicketInventory(targetProject.path);
    await hooks?.onMilestone?.({
      flow: "target-derive",
      command: targetFlowKindToCommand("target-derive"),
      targetProject,
      milestone: "materialization",
      milestoneLabel: TARGET_DERIVE_MILESTONE_LABELS.materialization,
      message: `Materializacao em andamento para ${targetProject.name}.`,
      versionBoundaryState: "before-versioning",
      recordedAtUtc: this.now().toISOString(),
    });
    const plannedOutcomes = await this.planGapOutcomes({
      targetProject,
      report,
      reportPaths: resolvedReportPaths,
      ticketInventory,
      normalizedGaps,
    });

    const baseDerivationSnapshot = buildGapDerivationSnapshot(plannedOutcomes);
    const equivalentMapping = isEquivalentGapDerivation(
      report.gap_derivation ?? null,
      baseDerivationSnapshot,
    );
    const derivedAtUtc =
      equivalentMapping && report.gap_derivation
        ? report.gap_derivation.derived_at_utc
        : this.now().toISOString();

    const nextReport: TargetCheckupReport = {
      ...report,
      dimensions: report.dimensions.map(cloneDimensionResult),
      gap_derivation: {
        ...baseDerivationSnapshot,
        derived_at_utc: derivedAtUtc,
      },
    };

    const nextReportJson = `${JSON.stringify(nextReport, null, 2)}\n`;
    const nextReportMarkdown = renderTargetCheckupMarkdownReport(nextReport);
    const reportJsonChanged = nextReportJson !== reportRaw;
    const reportMarkdownChanged = nextReportMarkdown !== markdownRaw;
    const changedTicketMutations = plannedOutcomes
      .map((entry) => entry.ticketMutation)
      .filter((entry): entry is PlannedTicketMutation => Boolean(entry))
      .filter((entry) => entry.content !== entry.existingContent);
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "materialization",
          changedPaths: changedTicketMutations.map((entry) => entry.path),
          nextAction:
            "Revise tickets e write-back locais gerados antes do versionamento para decidir se devem ser descartados ou reaproveitados.",
        },
      };
    }

    if (!reportJsonChanged && !reportMarkdownChanged && changedTicketMutations.length === 0) {
      await hooks?.onMilestone?.({
        flow: "target-derive",
        command: targetFlowKindToCommand("target-derive"),
        targetProject,
        milestone: "versioning",
        milestoneLabel: TARGET_DERIVE_MILESTONE_LABELS.versioning,
        message: `Versionamento avaliado para ${targetProject.name}: nenhuma alteracao nova para publicar.`,
        versionBoundaryState: "after-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      return {
        status: "completed",
        summary: this.buildSummary({
          targetProject,
          report,
          completionMode: "no-op-existing-mapping",
          changedPaths: [],
          touchedTicketPaths: uniqueSorted(
            plannedOutcomes.flatMap((entry) => entry.ticketPaths),
          ),
          versioning: {
            status: "no-op",
            reason: "existing-mapping",
          },
        }),
      };
    }

    try {
      if (reportJsonChanged) {
        await fs.writeFile(resolvedReportPaths.jsonAbsolutePath, nextReportJson, "utf8");
      }
      if (reportMarkdownChanged) {
        await fs.writeFile(resolvedReportPaths.markdownAbsolutePath, nextReportMarkdown, "utf8");
      }
      for (const mutation of changedTicketMutations) {
        await fs.mkdir(path.dirname(mutation.absolutePath), { recursive: true });
        await fs.writeFile(mutation.absolutePath, mutation.content, "utf8");
      }
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    const changedPaths = uniqueSorted([
      ...(reportJsonChanged ? [resolvedReportPaths.jsonPath] : []),
      ...(reportMarkdownChanged ? [resolvedReportPaths.markdownPath] : []),
      ...changedTicketMutations.map((entry) => entry.path),
    ]);
    if (hooks?.isCancellationRequested?.()) {
      return {
        status: "cancelled",
        summary: {
          targetProject,
          cancelledAtMilestone: "materialization",
          changedPaths,
          nextAction:
            "As alteracoes locais da derivacao ficaram sem commit/push. Revise o working tree antes de decidir o proximo passo.",
        },
      };
    }

    const gitVersioning = this.dependencies.createGitVersioning(targetProject);
    try {
      await hooks?.onMilestone?.({
        flow: "target-derive",
        command: targetFlowKindToCommand("target-derive"),
        targetProject,
        milestone: "versioning",
        milestoneLabel: TARGET_DERIVE_MILESTONE_LABELS.versioning,
        message: `Versionamento em andamento para ${targetProject.name}.`,
        versionBoundaryState: "after-versioning",
        recordedAtUtc: this.now().toISOString(),
      });
      const evidence = await gitVersioning.commitAndPushPaths(
        changedPaths,
        `chore(readiness): derive gaps for ${targetProject.name}`,
        [
          `Readiness report JSON: ${resolvedReportPaths.jsonPath}`,
          `Analyzed head SHA: ${report.analyzed_head_sha ?? "(ausente)"}`,
        ],
      );

      if (!evidence) {
        return {
          status: "failed",
          message:
            "target_derive_gaps calculou alteracoes, mas nenhum caminho ficou staged para commit/push.",
        };
      }

      return {
        status: "completed",
        summary: this.buildSummary({
          targetProject,
          report: nextReport,
          completionMode: "applied",
          changedPaths,
          touchedTicketPaths: uniqueSorted(plannedOutcomes.flatMap((entry) => entry.ticketPaths)),
          versioning: {
            status: "committed-and-pushed",
            commitHash: evidence.commitHash,
            upstream: evidence.upstream,
            commitPushId: evidence.commitPushId,
          },
        }),
      };
    } catch (error) {
      return {
        status: "failed",
        message: [
          "target_derive_gaps falhou na fronteira de versionamento.",
          error instanceof Error ? error.message : String(error),
          "Sincronize o estado local antes de rerodar.",
        ].join(" "),
      };
    }
  }

  private async validateReport(params: {
    targetProject: ProjectRef;
    report: TargetCheckupReport;
    reportPaths: ResolvedReportPaths;
    gitGuard: TargetDeriveGitGuard;
    currentHeadSha: string;
  }): Promise<
    | { status: "ok" }
    | {
        status: "blocked";
        result: Extract<TargetDeriveExecutionResult, { status: "blocked" }>;
      }
  > {
    const report = params.report;
    if (
      report.target_project?.name !== params.targetProject.name ||
      normalizeRelativePath(report.artifacts?.json_path ?? "") !== params.reportPaths.jsonPath ||
      normalizeRelativePath(report.artifacts?.markdown_path ?? "") !== params.reportPaths.markdownPath
    ) {
      return {
        status: "blocked",
        result: {
          status: "blocked",
          reason: "report-project-mismatch",
          message:
            "O report-path informado nao pertence ao projeto alvo solicitado ou nao aponta para o stem canonico esperado.",
        },
      };
    }

    const currentProjectPath = normalizeRelativePath(path.resolve(params.targetProject.path));
    const reportProjectPath = normalizeRelativePath(path.resolve(report.target_project.path));
    if (currentProjectPath !== reportProjectPath) {
      return {
        status: "blocked",
        result: {
          status: "blocked",
          reason: "report-project-mismatch",
          message:
            "O relatorio referencia outro caminho absoluto de projeto alvo e nao pode ser derivado neste repositorio.",
        },
      };
    }

    const jsonCommitSha = await params.gitGuard.getLastCommitTouchingPath(params.reportPaths.jsonPath);
    const markdownCommitSha = await params.gitGuard.getLastCommitTouchingPath(
      params.reportPaths.markdownPath,
    );
    if (!jsonCommitSha || !markdownCommitSha) {
      return {
        status: "blocked",
        result: {
          status: "blocked",
          reason: "report-drifted",
          message:
            "Nao foi possivel identificar os commits que tocaram os artefatos canonicos do report.",
        },
      };
    }

    if (jsonCommitSha !== markdownCommitSha) {
      return {
        status: "blocked",
        result: {
          status: "blocked",
          reason: "report-drifted",
          message:
            "Os artefatos .json e .md do report nao convergem para o mesmo commit e nao sao elegiveis para derivacao.",
        },
      };
    }

    const baseReadiness = evaluateTargetCheckupDerivationReadiness(report, {
      now: this.now(),
    });
    if (!baseReadiness.eligible) {
      return {
        status: "blocked",
        result: {
          status: "blocked",
          reason: "report-ineligible",
          message: [
            "O relatorio nao esta elegivel para /target_derive_gaps.",
            `Motivos: ${baseReadiness.reasons.join(", ") || "(nao informados)"}.`,
          ].join(" "),
        },
      };
    }

    if (report.gap_derivation) {
      if (params.currentHeadSha !== jsonCommitSha) {
        return {
          status: "blocked",
          result: {
            status: "blocked",
            reason: "report-drifted",
            message:
              "O repositorio recebeu commit novo depois do ultimo write-back do report; gere um novo /target_checkup antes de derivar novamente.",
          },
        };
      }

      return { status: "ok" };
    }

    const fullReadiness = evaluateTargetCheckupDerivationReadiness(report, {
      now: this.now(),
      currentHeadSha: params.currentHeadSha,
      reportLastCommitSha: jsonCommitSha,
      reportLastCommitParentSha: await params.gitGuard.getHeadParentSha(),
    });
    if (!fullReadiness.eligible) {
      const reason =
        fullReadiness.reasons.includes("head-drifted-after-report") ||
        fullReadiness.reasons.includes("report-commit-chain-broken") ||
        fullReadiness.reasons.includes("report-last-commit-parent-missing") ||
        fullReadiness.reasons.includes("report-last-commit-missing")
          ? "report-drifted"
          : "report-ineligible";

      return {
        status: "blocked",
        result: {
          status: "blocked",
          reason,
          message: [
            "O relatorio nao passou na validacao de derivacao do /target_derive_gaps.",
            `Motivos: ${fullReadiness.reasons.join(", ") || "(nao informados)"}.`,
          ].join(" "),
        },
      };
    }

    return { status: "ok" };
  }

  private async loadTicketInventory(repoPath: string): Promise<DerivedTicketRecord[]> {
    const records: DerivedTicketRecord[] = [];

    for (const directory of ["open", "closed"] as const) {
      const absoluteDir = path.join(repoPath, "tickets", directory);
      let entries: string[] = [];
      try {
        entries = await fs.readdir(absoluteDir);
      } catch {
        continue;
      }

      for (const entry of entries.sort((left, right) => left.localeCompare(right, "pt-BR"))) {
        if (!entry.endsWith(".md")) {
          continue;
        }

        const absolutePath = path.join(absoluteDir, entry);
        const content = await safeReadFile(absolutePath);
        if (!content) {
          continue;
        }

        if (extractTicketSource(content) !== "readiness-checkup") {
          continue;
        }

        const fingerprint = extractTicketFingerprint(content);
        if (!fingerprint) {
          continue;
        }

        records.push({
          directory,
          path: normalizeRelativePath(path.posix.join("tickets", directory, entry)),
          absolutePath,
          fileName: entry,
          fingerprint,
          content,
        });
      }
    }

    return records;
  }

  private async planGapOutcomes(params: {
    targetProject: ProjectRef;
    report: TargetCheckupReport;
    reportPaths: ResolvedReportPaths;
    ticketInventory: DerivedTicketRecord[];
    normalizedGaps: TargetDeriveNormalizedGap[];
  }): Promise<PlannedGapOutcome[]> {
    const existingTicketPaths = new Set(
      params.ticketInventory.flatMap((entry) => [
        entry.path,
        normalizeRelativePath(path.posix.join("tickets/open", entry.fileName)),
      ]),
    );
    const outcomes: PlannedGapOutcome[] = [];

    for (const gap of params.normalizedGaps) {
      const reusablePreviousResult = resolveReusablePreviousGapResult({
        report: params.report,
        gap,
        existingTicketPaths,
      });
      if (reusablePreviousResult) {
        outcomes.push({
          normalizedGap: gap,
          resultStatus: reusablePreviousResult.resultStatus,
          rationale: reusablePreviousResult.rationale,
          ticketPaths: [...reusablePreviousResult.ticketPaths],
          ticketMutation: null,
        });
        continue;
      }

      const openMatch = params.ticketInventory.find(
        (entry) => entry.directory === "open" && entry.fingerprint === gap.gapFingerprint,
      );
      const closedMatch = params.ticketInventory
        .filter((entry) => entry.directory === "closed" && entry.fingerprint === gap.gapFingerprint)
        .sort((left, right) => right.fileName.localeCompare(left.fileName, "pt-BR"))[0];

      if (
        gap.materializationDecision === "informational" ||
        gap.materializationDecision === "insufficient_specificity" ||
        gap.materializationDecision === "runner_limitation"
      ) {
        outcomes.push({
          normalizedGap: gap,
          resultStatus: mapDecisionToResultStatus(gap.materializationDecision, false),
          rationale: buildNonMaterializedRationale(gap),
          ticketPaths: [],
          ticketMutation: null,
        });
        continue;
      }

      const ticketPath = openMatch
        ? openMatch.path
        : buildUniqueTicketPath({
            now: this.now(),
            gap,
            existingTicketPaths,
          });
      existingTicketPaths.add(ticketPath);
      const absolutePath = path.join(params.targetProject.path, ...ticketPath.split("/"));
      const existingContent = openMatch?.content ?? (await safeReadFile(absolutePath));
      const createdAtUtc =
        extractTicketCreatedAt(existingContent) ?? formatTicketTimestamp(this.now());
      const resultStatus = mapDecisionToResultStatus(
        gap.materializationDecision,
        Boolean(openMatch),
      );
      const parentTicketPath = closedMatch?.path ?? null;
      const content = renderReadinessTicket({
        targetProject: params.targetProject,
        report: params.report,
        reportPaths: params.reportPaths,
        gap,
        createdAtUtc,
        ticketStatus: resultStatus === "blocked_ticket_created" ? "blocked" : "open",
        parentTicketPath,
        existingTicketPath: openMatch?.path ?? null,
      });

      outcomes.push({
        normalizedGap: gap,
        resultStatus,
        rationale: buildTicketOutcomeRationale({
          gap,
          resultStatus,
          openMatch,
          closedMatch,
        }),
        ticketPaths: [ticketPath],
        ticketMutation: {
          path: ticketPath,
          absolutePath,
          content,
          existingContent,
        },
      });
    }

    return outcomes.sort((left, right) =>
      left.normalizedGap.gapFingerprint.localeCompare(
        right.normalizedGap.gapFingerprint,
        "pt-BR",
      ),
    );
  }

  private buildSummary(params: {
    targetProject: ProjectRef;
    report: TargetCheckupReport;
    completionMode: TargetDeriveTicketSummary["completionMode"];
    changedPaths: string[];
    touchedTicketPaths: string[];
    versioning: TargetDeriveTicketSummary["versioning"];
  }): TargetDeriveTicketSummary {
    const gapResults =
      params.report.gap_derivation?.gap_results.map((entry) => ({
        gapId: entry.gap_id,
        gapFingerprint: entry.gap_fingerprint,
        result: entry.result,
        ticketPaths: [...entry.ticket_paths],
      })) ?? [];

    return {
      targetProject: params.targetProject,
      analyzedHeadSha: params.report.analyzed_head_sha ?? "(ausente)",
      reportJsonPath: params.report.artifacts.json_path,
      reportMarkdownPath: params.report.artifacts.markdown_path,
      reportCommitSha: params.report.report_commit_sha ?? "(ausente)",
      completionMode: params.completionMode,
      derivationStatus:
        params.report.gap_derivation?.derivation_status ?? "not_materialized",
      changedPaths: [...params.changedPaths],
      touchedTicketPaths: [...params.touchedTicketPaths],
      gapResults,
      nextAction: buildNextAction({
        completionMode: params.completionMode,
        touchedTicketPaths: params.touchedTicketPaths,
      }),
      versioning: params.versioning,
    };
  }
}

const normalizeGaps = (
  gaps: TargetDeriveGapAnalysisItem[],
  reportJsonPath: string,
): TargetDeriveNormalizedGap[] =>
  gaps
    .map((gap) => {
      const priority = computeTargetDerivePriority(gap.priority);
      const normalizedGap: TargetDeriveNormalizedGap = {
        title: gap.title.trim(),
        summary: gap.summary.trim(),
        gapType: gap.gapType,
        checkupDimension: gap.checkupDimension,
        materializationDecision: gap.materializationDecision,
        remediationSurface: uniqueSorted(gap.remediationSurface),
        evidence: [...gap.evidence],
        assumptionsDefaults: [...gap.assumptionsDefaults],
        validationNotes: [...gap.validationNotes],
        closureCriteria: [...gap.closureCriteria],
        fingerprintBasis: uniqueSorted(gap.fingerprintBasis),
        priority,
        externalDependency: gap.externalDependency,
        gapFingerprint: "",
        gapId: "",
      };
      normalizedGap.gapFingerprint = buildTargetDeriveGapFingerprint(normalizedGap);
      normalizedGap.gapId = buildTargetDeriveGapId({
        reportJsonPath,
        title: normalizedGap.title,
        gapFingerprint: normalizedGap.gapFingerprint,
      });
      return normalizedGap;
    })
    .sort((left, right) => left.gapFingerprint.localeCompare(right.gapFingerprint, "pt-BR"));

const buildGapDerivationSnapshot = (
  outcomes: PlannedGapOutcome[],
): TargetCheckupGapDerivationSnapshot => ({
  derivation_status: computeGapDerivationStatus(
    outcomes.map((entry) => ({ result: entry.resultStatus })),
  ),
  derived_at_utc: "",
  touched_ticket_paths: uniqueSorted(outcomes.flatMap((entry) => entry.ticketPaths)),
  gap_results: outcomes.map((entry) => ({
    gap_id: entry.normalizedGap.gapId,
    gap_fingerprint: entry.normalizedGap.gapFingerprint,
    title: entry.normalizedGap.title,
    gap_type: entry.normalizedGap.gapType,
    checkup_dimension: entry.normalizedGap.checkupDimension,
    priority: entry.normalizedGap.priority,
    remediation_surface: [...entry.normalizedGap.remediationSurface],
    result: entry.resultStatus,
    rationale: entry.rationale,
    ticket_paths: [...entry.ticketPaths],
  })),
});

const isEquivalentGapDerivation = (
  left: TargetCheckupGapDerivationSnapshot | null,
  right: TargetCheckupGapDerivationSnapshot,
): boolean => {
  if (!left) {
    return false;
  }

  const comparableLeft = {
    derivation_status: left.derivation_status,
    touched_ticket_paths: left.touched_ticket_paths,
    gap_results: left.gap_results,
  };
  const comparableRight = {
    derivation_status: right.derivation_status,
    touched_ticket_paths: right.touched_ticket_paths,
    gap_results: right.gap_results,
  };

  return JSON.stringify(comparableLeft) === JSON.stringify(comparableRight);
};

const resolveReusablePreviousGapResult = (params: {
  report: TargetCheckupReport;
  gap: TargetDeriveNormalizedGap;
  existingTicketPaths: Set<string>;
}): ReusablePreviousGapResult | null => {
  const previousResult = params.report.gap_derivation?.gap_results.find(
    (entry) => entry.gap_fingerprint === params.gap.gapFingerprint,
  );
  if (!previousResult) {
    return null;
  }

  if (!isResultCompatibleWithDecision(params.gap.materializationDecision, previousResult.result)) {
    return null;
  }

  if (
    previousResult.ticket_paths.some(
      (ticketPath) => !params.existingTicketPaths.has(normalizeRelativePath(ticketPath)),
    )
  ) {
    return null;
  }

  return {
    resultStatus: previousResult.result,
    rationale: previousResult.rationale,
    ticketPaths: [...previousResult.ticket_paths],
  };
};

const isResultCompatibleWithDecision = (
  decision: TargetDeriveNormalizedGap["materializationDecision"],
  resultStatus: TargetDeriveResultStatus,
): boolean => {
  if (decision === "materialize") {
    return (
      resultStatus === "materialized_as_ticket" || resultStatus === "reused_existing_ticket"
    );
  }

  if (decision === "blocked") {
    return resultStatus === "blocked_ticket_created";
  }

  if (decision === "informational") {
    return resultStatus === "not_materialized_informational";
  }

  if (decision === "insufficient_specificity") {
    return resultStatus === "not_materialized_insufficient_specificity";
  }

  return resultStatus === "not_materialized_runner_limitation";
};

const renderReadinessTicket = (params: {
  targetProject: ProjectRef;
  report: TargetCheckupReport;
  reportPaths: ResolvedReportPaths;
  gap: TargetDeriveNormalizedGap;
  createdAtUtc: string;
  ticketStatus: "open" | "blocked";
  parentTicketPath: string | null;
  existingTicketPath: string | null;
}): string => {
  const severityLabel = mapSeverityToLabel(params.gap.priority.severity);
  const sourceRequirements = [
    `readiness-checkup/${params.gap.checkupDimension}`,
    `gap-type:${params.gap.gapType}`,
  ].join("; ");

  const relatedDocs = [
    `  - ${params.reportPaths.jsonPath}`,
    `  - ${params.reportPaths.markdownPath}`,
    `  - ${INTERNAL_TICKET_TEMPLATE_PATH}`,
  ];

  const evidenceLines = params.gap.evidence.map((entry) => `  - ${entry}`);
  const validationNotes =
    params.gap.validationNotes.length > 0
      ? params.gap.validationNotes.map((entry) => `- ${entry}`)
      : ["- Nenhuma nota adicional declarada pelo gap analysis."];
  const assumptionsDefaults =
    params.gap.assumptionsDefaults.length > 0
      ? params.gap.assumptionsDefaults.join("; ")
      : "Nenhum adicional.";

  const decisionLog = [
    `- ${formatTicketDateOnly(new Date())} - Ticket readiness derivado automaticamente do report ${params.reportPaths.jsonPath}.`,
    params.parentTicketPath
      ? `- ${formatTicketDateOnly(new Date())} - Recorrencia detectada a partir de ${params.parentTicketPath}.`
      : null,
    params.existingTicketPath
      ? `- ${formatTicketDateOnly(new Date())} - Ticket aberto equivalente reutilizado e atualizado in-place.`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    `# [TICKET] ${params.gap.title}`,
    "",
    "## Metadata",
    `- Status: ${params.ticketStatus}`,
    "- Status guidance: `open` = elegivel para execucao; `in-progress` = em andamento manual; `blocked` = aguardando insumo/decisao externa sem proximo passo local executavel; `closed` = encerrado em `tickets/closed/`",
    `- Priority: ${params.gap.priority.priority}`,
    `- Severity: ${severityLabel}`,
    `- Created at (UTC): ${params.createdAtUtc}`,
    "- Reporter: Codex",
    "- Owner:",
    "- Source: readiness-checkup",
    `- Parent ticket (optional): ${params.parentTicketPath ?? ""}`,
    "- Parent execplan (optional):",
    "- Parent commit (optional):",
    "- Analysis stage (when applicable): target-derive-gaps",
    `- Active project (when applicable): ${params.targetProject.name}`,
    `- Target repository (when applicable): ${params.targetProject.name}`,
    "- Request ID:",
    "- Source spec (when applicable):",
    "- Source spec canonical path (when applicable):",
    `- Source requirements (RFs/CAs/RNFs/restricoes, when applicable): ${sourceRequirements}`,
    `- Readiness report JSON: ${params.reportPaths.jsonPath}`,
    `- Readiness report Markdown: ${params.reportPaths.markdownPath}`,
    `- Analyzed head SHA: ${params.report.analyzed_head_sha ?? "(ausente)"}`,
    `- Report commit SHA: ${params.report.report_commit_sha ?? "(ausente)"}`,
    `- Gap ID: ${params.gap.gapId}`,
    `- Gap fingerprint: ${params.gap.gapFingerprint}`,
    `- Gap type: ${params.gap.gapType}`,
    `- Checkup dimension: ${params.gap.checkupDimension}`,
    `- Inherited assumptions/defaults (when applicable): ${assumptionsDefaults}`,
    "- Inherited RNFs (when applicable): manter fluxo sequencial; preservar rastreabilidade do readiness checkup; fechar somente com validacao observavel.",
    "- Inherited technical/documentary constraints (when applicable): manter o report de readiness como fonte canonica e fechar somente com evidencias observaveis na superficie local de remediacao.",
    `- Inherited pending/manual validations (when applicable): ${params.gap.validationNotes.join(" | ") || "Nenhuma adicional."}`,
    "- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): n/a",
    "- Smallest plausible explanation (audit/review only): n/a",
    "- Remediation scope (audit/review only): n/a",
    "- Related artifacts:",
    "  - Request file:",
    "  - Response file:",
    "  - Decision file:",
    "- Related docs/execplans:",
    ...relatedDocs,
    "",
    "## Classificacao de risco (check-up nao funcional, quando aplicavel)",
    "- Matriz aplicavel: sim",
    `- Severidade (1-5): ${params.gap.priority.severity}`,
    `- Frequencia (1-5): ${params.gap.priority.frequency}`,
    `- Custo de atraso (1-5): ${params.gap.priority.costOfDelay}`,
    `- Risco operacional (1-5): ${params.gap.priority.operationalRisk}`,
    `- Score ponderado (10-50): ${params.gap.priority.score}`,
    `- Prioridade resultante (\`P0\` | \`P1\` | \`P2\`): ${params.gap.priority.priority}`,
    `- Justificativa objetiva (evidencias e impacto): ${params.gap.summary}`,
    "",
    "## Context",
    `- Workflow area: readiness checkup / ${params.gap.checkupDimension}.`,
    `- Scenario: ${params.gap.summary}`,
    `- Input constraints: superficie local de remediacao = ${params.gap.remediationSurface.join(", ")}.`,
    "",
    "## Problem statement",
    params.gap.summary,
    "",
    "## Observed behavior",
    "- O que foi observado:",
    ...evidenceLines,
    "- Frequencia (unico, recorrente, intermitente): conforme matriz de prioridade registrada acima.",
    "- Como foi detectado (warning/log/test/assert): readiness checkup canonicamente versionado.",
    "",
    "## Expected behavior",
    params.gap.closureCriteria.join(" "),
    "",
    "## Reproduction steps",
    `1. Abrir ${params.reportPaths.markdownPath} e localizar o gap ${params.gap.gapId}.`,
    `2. Confirmar as evidencias objetivas registradas para ${params.gap.checkupDimension}.`,
    `3. Verificar a superficie local de remediacao: ${params.gap.remediationSurface.join(", ")}.`,
    "",
    "## Evidence",
    "- Logs relevantes (trechos curtos e redigidos): n/a",
    "- Warnings/codes relevantes:",
    ...params.gap.evidence.map((entry) => `  - ${entry}`),
    `- Comparativo antes/depois (se houver): report ${params.reportPaths.jsonPath} -> gap fingerprint ${params.gap.gapFingerprint}.`,
    "",
    "## Impact assessment",
    `- Impacto funcional: o projeto permanece com gap readiness em ${params.gap.checkupDimension}.`,
    "- Impacto operacional: a prontidao do workflow continua sem evidencia observavel suficiente nesta superficie.",
    `- Risco de regressao: ${params.gap.priority.priority === "P0" ? "alto" : params.gap.priority.priority === "P1" ? "medio" : "baixo"}.`,
    `- Scope estimado (quais fluxos podem ser afetados): ${params.gap.remediationSurface.join(", ")}.`,
    "",
    "## Initial hypotheses (optional)",
    ...params.gap.assumptionsDefaults.map((entry) => `- ${entry}`),
    ...(params.gap.assumptionsDefaults.length === 0 ? ["- Nenhuma adicional declarada."] : []),
    "",
    "## Validation notes",
    ...validationNotes,
    "",
    "## Closure criteria",
    ...params.gap.closureCriteria.flatMap((entry) => [
      `- Requisito/RF/CA coberto: readiness-checkup/${params.gap.checkupDimension}`,
      `- Evidencia observavel: ${entry}`,
    ]),
    "",
    "## Decision log",
    decisionLog,
    "",
    "## Closure",
    "- Closed at (UTC):",
    "- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up",
    "- Related PR/commit/execplan:",
    "- Follow-up ticket (required when `Closure reason: split-follow-up`):",
    "- Follow-up status guidance (when `Closure reason: split-follow-up`): se o trabalho remanescente depender apenas de insumo/decisao externa e nao houver proximo passo local executavel, criar o follow-up em `tickets/open/` com `Status: blocked`; use `Status: open` apenas quando ainda houver trabalho local executavel pelo agente.",
  ];

  return `${lines.join("\n")}\n`;
};

const buildUniqueTicketPath = (params: {
  now: Date;
  gap: TargetDeriveNormalizedGap;
  existingTicketPaths: Set<string>;
}): string => {
  const datePrefix = params.now.toISOString().slice(0, 10);
  const slugBase = normalizeSlug(params.gap.title).slice(0, 80) || "readiness-gap";
  const hashSuffix = params.gap.gapFingerprint.split("|")[1] ?? "gap";
  let attempt = 1;

  while (true) {
    const suffix = attempt === 1 ? "" : `-r${String(attempt)}`;
    const candidate = normalizeRelativePath(
      path.posix.join(
        "tickets/open",
        `${datePrefix}-readiness-gap-${slugBase}-${hashSuffix}${suffix}.md`,
      ),
    );
    if (!params.existingTicketPaths.has(candidate)) {
      return candidate;
    }
    attempt += 1;
  }
};

const buildTicketOutcomeRationale = (params: {
  gap: TargetDeriveNormalizedGap;
  resultStatus: TargetDeriveResultStatus;
  openMatch?: DerivedTicketRecord;
  closedMatch?: DerivedTicketRecord;
}): string => {
  if (params.resultStatus === "reused_existing_ticket") {
    return `Ticket aberto equivalente reutilizado por gap fingerprint ${params.gap.gapFingerprint}.`;
  }

  if (params.closedMatch) {
    return `Recorrencia materializada a partir do ticket fechado ${params.closedMatch.path}.`;
  }

  if (params.resultStatus === "blocked_ticket_created") {
    return params.gap.externalDependency
      ? `Gap real, mas bloqueado por dependencia externa: ${params.gap.externalDependency}.`
      : "Gap real, mas bloqueado por dependencia externa sem proximo passo local.";
  }

  return `Ticket readiness materializado para ${params.gap.gapFingerprint}.`;
};

const buildNonMaterializedRationale = (gap: TargetDeriveNormalizedGap): string => {
  if (gap.materializationDecision === "informational") {
    return "Gap mantido apenas como informacao no write-back do report.";
  }

  if (gap.materializationDecision === "insufficient_specificity") {
    return "Gap nao materializado porque o report nao sustenta ticket forte o bastante.";
  }

  return "Limitacao do proprio runner registrada sem criar ticket no projeto alvo.";
};

const buildNextAction = (params: {
  completionMode: "applied" | "no-op-existing-mapping";
  touchedTicketPaths: string[];
}): string => {
  if (params.completionMode === "no-op-existing-mapping") {
    return "Nenhuma alteracao nova foi necessaria; o mapeamento derivado ja estava registrado no report.";
  }

  if (params.touchedTicketPaths.length > 0) {
    return "Revise os tickets readiness derivados no projeto alvo e siga o fluxo sequencial normal de execucao.";
  }

  return "Nenhum ticket novo foi materializado; use o write-back do report para revisar itens informativos, insuficientes ou limitacoes do runner.";
};

const mapSeverityToLabel = (value: number): string => {
  if (value >= 5) {
    return "S1";
  }
  if (value === 4) {
    return "S2";
  }
  if (value === 3) {
    return "S3";
  }
  if (value === 2) {
    return "S4";
  }
  return "S5";
};

const resolveReportPaths = (
  repoPath: string,
  rawReportPath: string,
): ResolvedReportPaths | Extract<TargetDeriveExecutionResult, { status: "blocked" }> => {
  const trimmed = rawReportPath.trim();
  if (!trimmed) {
    return {
      status: "blocked",
      reason: "report-path-invalid",
      message:
        "O target_derive_gaps exige `report-path` explicito relativo ao repositorio alvo.",
    };
  }

  const normalized = normalizeRelativePath(path.posix.normalize(trimmed.replace(/\\/gu, "/")));
  if (
    path.posix.isAbsolute(normalized) ||
    normalized === "." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return {
      status: "blocked",
      reason: "report-path-invalid",
      message:
        "Use apenas `report-path` relativo ao repositorio alvo, sem caminho absoluto nem `..`.",
    };
  }

  if (!normalized.startsWith(`${REPORT_HISTORY_ROOT}/`)) {
    return {
      status: "blocked",
      reason: "report-path-invalid",
      message:
        "O target_derive_gaps aceita apenas artefatos canonicos em docs/checkups/history/.",
    };
  }

  const extension = path.posix.extname(normalized);
  if (extension !== ".json" && extension !== ".md") {
    return {
      status: "blocked",
      reason: "report-path-invalid",
      message: "Use o caminho explicito do artefato .json ou .md gerado pelo /target_checkup.",
    };
  }

  const stem = normalized.slice(0, -extension.length);
  const jsonPath = `${stem}.json`;
  const markdownPath = `${stem}.md`;
  const jsonAbsolutePath = path.join(repoPath, ...jsonPath.split("/"));
  const markdownAbsolutePath = path.join(repoPath, ...markdownPath.split("/"));

  return {
    jsonPath,
    markdownPath,
    jsonAbsolutePath,
    markdownAbsolutePath,
  };
};

const mapTargetResolutionError = (error: unknown): TargetDeriveExecutionResult => {
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

const cloneDimensionResult = (dimension: TargetCheckupReport["dimensions"][number]) => ({
  ...dimension,
  evidence: dimension.evidence.map((entry) => ({
    ...entry,
    ...(entry.paths ? { paths: [...entry.paths] } : {}),
  })),
  commands: dimension.commands.map((entry) => ({
    ...entry,
    args: [...entry.args],
  })),
});

const extractTicketFingerprint = (content: string): string | null =>
  content.match(TICKET_FINGERPRINT_PATTERN)?.[1]?.trim() || null;

const extractTicketCreatedAt = (content: string | null): string | null =>
  content?.match(TICKET_CREATED_AT_PATTERN)?.[1]?.trim() || null;

const extractTicketSource = (content: string): string | null =>
  content.match(TICKET_SOURCE_PATTERN)?.[1]?.trim() || null;

const normalizeRelativePath = (value: string): string => value.replace(/\\/gu, "/");

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, "pt-BR"));

const safeReadFile = async (value: string): Promise<string | null> => {
  try {
    return await fs.readFile(value, "utf8");
  } catch {
    return null;
  }
};

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-");

const formatTicketTimestamp = (value: Date): string =>
  `${formatTicketDateOnly(value)} ${value.toISOString().slice(11, 16)}Z`;

const formatTicketDateOnly = (value: Date): string => value.toISOString().slice(0, 10);
