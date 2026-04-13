import { promises as fs } from "node:fs";
import path from "node:path";
import { Logger } from "../core/logger.js";
import {
  inspectTargetInvestigateCaseTargetOwnedArtifacts,
  readTargetInvestigateCaseCaseResolutionArtifact,
  resolveTargetInvestigateCaseDiagnosticClosure,
  TargetInvestigateCaseRoundPreparer,
  TargetInvestigateCaseRoundPreparationRequest,
  TargetInvestigateCaseRoundPreparationResult,
} from "../core/target-investigate-case.js";
import type { ProjectRef } from "../types/project.js";
import {
  normalizeTargetInvestigateCaseRelativePath,
  TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT,
  TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  TARGET_INVESTIGATE_CASE_V2_COMMAND,
  TargetInvestigateCaseFailureKind,
  TargetInvestigateCaseFailureSurface,
  TargetInvestigateCaseArtifactInspectionReport,
  TargetInvestigateCaseV2StageArtifactSet,
} from "../types/target-investigate-case.js";
import { TargetInvestigateCaseMilestone } from "../types/target-flow.js";
import {
  TargetInvestigateCaseRoundMaterializationCodexClient,
  TargetInvestigateCaseV2StageName,
} from "./codex-client.js";
import { GitVersioning } from "./git-client.js";
import { FileSystemTargetInvestigateCaseTicketPublisher } from "./target-investigate-case-ticket-publisher.js";

interface TargetInvestigateCaseRoundPreparerDependencies {
  logger: Logger;
  runnerRepoPath: string;
  createCodexClient: (project: ProjectRef) => TargetInvestigateCaseRoundMaterializationCodexClient;
  createGitVersioning: (project: ProjectRef) => GitVersioning;
}

class TargetInvestigateCaseRoundPreparationFailureError extends Error {
  constructor(
    public readonly failureSurface: TargetInvestigateCaseFailureSurface,
    public readonly failureKind: TargetInvestigateCaseFailureKind,
    public readonly failedAtMilestone: TargetInvestigateCaseMilestone,
    message: string,
    public readonly nextAction: string,
  ) {
    super(message);
    this.name = "TargetInvestigateCaseRoundPreparationFailureError";
  }
}

const buildRoundPreparationFailedResult = (
  error: unknown,
  failedAtMilestone: TargetInvestigateCaseMilestone,
): Extract<TargetInvestigateCaseRoundPreparationResult, { status: "failed" }> => {
  if (error instanceof TargetInvestigateCaseRoundPreparationFailureError) {
    return {
      status: "failed",
      message: error.message,
      failureSurface: error.failureSurface,
      failureKind: error.failureKind,
      failedAtMilestone: error.failedAtMilestone,
      nextAction: error.nextAction,
    };
  }

  return {
    status: "failed",
    message: error instanceof Error ? error.message : String(error),
    failureSurface: "round-materialization",
    failureKind: "artifact-validation-failed",
    failedAtMilestone,
    nextAction:
      `Revise os artefatos canonicos materializados nesta rodada antes de rerodar ${TARGET_INVESTIGATE_CASE_V2_COMMAND}.`,
  };
};

const buildTargetInvestigateCaseV2StageArtifactSet = (
  artifactPaths: TargetInvestigateCaseRoundPreparationRequest["artifactPaths"],
): TargetInvestigateCaseV2StageArtifactSet => ({
  caseResolutionPath: artifactPaths.caseResolutionPath,
  evidenceIndexPath: artifactPaths.evidenceIndexPath,
  evidenceBundlePath: artifactPaths.evidenceBundlePath,
  diagnosisJsonPath: artifactPaths.diagnosisJsonPath,
  diagnosisMdPath: artifactPaths.diagnosisMdPath,
  remediationProposalPath: artifactPaths.remediationProposalPath,
  ticketProposalPath: artifactPaths.ticketProposalPath,
  publicationDecisionPath: artifactPaths.publicationDecisionPath,
});

export class CodexCliTargetInvestigateCaseRoundPreparer
  implements TargetInvestigateCaseRoundPreparer
{
  constructor(private readonly dependencies: TargetInvestigateCaseRoundPreparerDependencies) {}

  async prepareRound(
    request: TargetInvestigateCaseRoundPreparationRequest,
  ): Promise<TargetInvestigateCaseRoundPreparationResult> {
    const codexClient = this.dependencies.createCodexClient(request.targetProject);
    let fixedCodexClient = codexClient;

    try {
      await codexClient.ensureAuthenticated();
      const fixedPreferences = await codexClient.snapshotInvocationPreferences();
      fixedCodexClient = codexClient.forkWithFixedInvocationPreferences(fixedPreferences);
    } catch (error) {
      return {
        status: "blocked",
        message:
          error instanceof Error
            ? error.message
            : "Falha ao validar autenticacao do Codex CLI para materializar a rodada.",
      };
    }

    const runnerReference = `codex-flow-runner@${this.dependencies.runnerRepoPath}`;
    const runbookPath = request.manifest.supportingArtifacts.docs[0] ?? null;

    try {
      await this.executeV2Stage("resolve-case", request, fixedCodexClient, {
        runnerReference,
        runbookPath,
      });
      await this.executeV2Stage("assemble-evidence", request, fixedCodexClient, {
        runnerReference,
        runbookPath,
      });
      await this.executeV2Stage("diagnosis", request, fixedCodexClient, {
        runnerReference,
        runbookPath,
      });
      const artifactInspection = await this.inspectCanonicalArtifacts(request);
      await this.syncCanonicalArtifactsToMirror(request);

      return {
        status: "prepared",
        artifactInspectionWarnings: artifactInspection.warnings,
        ticketPublisher: request.manifest.ticketPublicationPolicy
          ? new FileSystemTargetInvestigateCaseTicketPublisher(
              request.targetProject.path,
              this.dependencies.createGitVersioning(request.targetProject),
            )
          : null,
      };
    } catch (error) {
      return buildRoundPreparationFailedResult(error, "diagnosis");
    }
  }

  private async executeV2Stage(
    stage: TargetInvestigateCaseV2StageName,
    request: TargetInvestigateCaseRoundPreparationRequest,
    codexClient: TargetInvestigateCaseRoundMaterializationCodexClient,
    context: {
      runnerReference: string;
      runbookPath: string | null;
    },
  ): Promise<void> {
    const stageConfig = resolveStageConfig(request, stage);
    try {
      await codexClient.runTargetInvestigateCaseV2Stage({
        targetProject: request.targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference: context.runnerReference,
        manifestPath: request.manifestPath,
        runbookPath: context.runbookPath,
        officialTargetEntrypointCommand: request.manifest.entrypoint?.command ?? null,
        officialTargetEntrypointScriptPath: request.manifest.entrypoint?.scriptPath ?? null,
        canonicalCommand: request.normalizedInput.canonicalCommand,
        roundId: request.roundId,
        roundDirectory: request.roundDirectory,
        artifactPaths: buildTargetInvestigateCaseV2StageArtifactSet(request.artifactPaths),
        stage,
        stagePromptPath: stageConfig.promptPath ?? null,
        stageArtifacts: [...stageConfig.artifacts],
        stageEntrypointCommand: stageConfig.entrypoint?.command ?? null,
        stageEntrypointScriptPath: stageConfig.entrypoint?.scriptPath ?? null,
      });
    } catch (error) {
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "round-materialization",
        "codex-execution-failed",
        stage,
        error instanceof Error ? error.message : String(error),
        `Revise a execucao runner-side de ${stage} e rerode ${TARGET_INVESTIGATE_CASE_V2_COMMAND}.`,
      );
    }
  }

  private async inspectCanonicalArtifacts(
    request: TargetInvestigateCaseRoundPreparationRequest,
  ): Promise<TargetInvestigateCaseArtifactInspectionReport> {
    const artifactInspection = await inspectTargetInvestigateCaseTargetOwnedArtifacts({
      projectPath: request.targetProject.path,
      artifactPaths: request.artifactPaths,
    });
    const missingBlockingArtifacts = artifactInspection.artifacts.filter(
      (entry) =>
        !entry.exists &&
        (entry.artifactLabel === TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT ||
          entry.artifactLabel === TARGET_INVESTIGATE_CASE_CASE_BUNDLE_ARTIFACT),
    );

    if (missingBlockingArtifacts.length > 0) {
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "round-materialization",
        "artifact-validation-failed",
        "diagnosis",
        `Artefatos obrigatorios ausentes: ${missingBlockingArtifacts
          .map((entry) => `${entry.artifactLabel} em ${entry.artifactPath}`)
          .join(", ")}.`,
        "Materialize evidence-index.json e case-bundle.json no namespace autoritativo antes de rerodar.",
      );
    }

    try {
      const caseResolution = await readTargetInvestigateCaseCaseResolutionArtifact({
        projectPath: request.targetProject.path,
        relativePath: request.artifactPaths.caseResolutionPath,
        normalizedInput: request.normalizedInput,
      });
      await resolveTargetInvestigateCaseDiagnosticClosure({
        projectPath: request.targetProject.path,
        artifactPaths: request.artifactPaths,
        caseResolution,
      });
    } catch (error) {
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "round-materialization",
        "artifact-validation-failed",
        "diagnosis",
        error instanceof Error ? error.message : String(error),
        "Materialize diagnosis.md, diagnosis.json com verdict reconhecido ou um blocker explicito target-owned antes de rerodar.",
      );
    }

    return artifactInspection;
  }

  private async syncCanonicalArtifactsToMirror(
    request: TargetInvestigateCaseRoundPreparationRequest,
  ): Promise<void> {
    const mirrorDirectory = request.manifest.roundDirectories.mirror.replace(
      /<round-id>/gu,
      request.roundId,
    );
    if (!mirrorDirectory) {
      return;
    }

    const mirrorAbsoluteDirectory = path.join(
      request.targetProject.path,
      ...mirrorDirectory.split("/"),
    );
    await fs.mkdir(mirrorAbsoluteDirectory, { recursive: true });

    const artifactsToMirror = [
      request.artifactPaths.caseResolutionPath,
      request.artifactPaths.evidenceIndexPath,
      request.artifactPaths.evidenceBundlePath,
      request.artifactPaths.diagnosisJsonPath,
      request.artifactPaths.diagnosisMdPath,
      request.artifactPaths.remediationProposalPath,
      request.artifactPaths.ticketProposalPath,
      request.artifactPaths.publicationDecisionPath,
    ];

    for (const sourceRelativePath of artifactsToMirror) {
      const sourceAbsolutePath = path.join(
        request.targetProject.path,
        ...sourceRelativePath.split("/"),
      );
      try {
        await fs.stat(sourceAbsolutePath);
      } catch {
        continue;
      }

      const destinationRelativePath = normalizeTargetInvestigateCaseRelativePath(
        path.posix.join(mirrorDirectory, path.posix.basename(sourceRelativePath)),
      );
      const destinationAbsolutePath = path.join(
        request.targetProject.path,
        ...destinationRelativePath.split("/"),
      );
      await fs.mkdir(path.dirname(destinationAbsolutePath), { recursive: true });
      await fs.copyFile(sourceAbsolutePath, destinationAbsolutePath);
    }
  }
}

const resolveStageConfig = (
  request: TargetInvestigateCaseRoundPreparationRequest,
  stage: TargetInvestigateCaseV2StageName,
):
  | TargetInvestigateCaseRoundPreparationRequest["manifest"]["stages"]["resolveCase"]
  | TargetInvestigateCaseRoundPreparationRequest["manifest"]["stages"]["assembleEvidence"]
  | TargetInvestigateCaseRoundPreparationRequest["manifest"]["stages"]["diagnosis"] => {
  if (stage === "resolve-case") {
    return request.manifest.stages.resolveCase;
  }

  if (stage === "assemble-evidence") {
    return request.manifest.stages.assembleEvidence;
  }

  return request.manifest.stages.diagnosis;
};
