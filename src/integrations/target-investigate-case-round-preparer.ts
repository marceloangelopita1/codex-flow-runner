import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Logger } from "../core/logger.js";
import {
  assertTargetInvestigateCaseV2LegacyLineageCoverage,
  readTargetInvestigateCaseCaseResolutionArtifact,
  readTargetInvestigateCaseEvidenceBundleArtifact,
  TargetInvestigateCaseRoundPreparer,
  TargetInvestigateCaseRoundPreparationRequest,
  TargetInvestigateCaseRoundPreparationResult,
} from "../core/target-investigate-case.js";
import type { ProjectRef } from "../types/project.js";
import {
  normalizeTargetInvestigateCaseRelativePath,
  targetInvestigateCaseDiagnosisSchema,
  targetInvestigateCaseEvidenceIndexSchema,
  TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS,
  TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  TARGET_INVESTIGATE_CASE_V2_COMMAND,
  TargetInvestigateCaseFailureKind,
  TargetInvestigateCaseFailureSurface,
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
      await this.validateCanonicalArtifacts(request);
      await this.syncCanonicalArtifactsToMirror(request);
    } catch (error) {
      return buildRoundPreparationFailedResult(error, "diagnosis");
    }

    return {
      status: "prepared",
      ticketPublisher: request.manifest.ticketPublicationPolicy
        ? new FileSystemTargetInvestigateCaseTicketPublisher(
            request.targetProject.path,
            this.dependencies.createGitVersioning(request.targetProject),
          )
        : null,
    };
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

  private async validateCanonicalArtifacts(
    request: TargetInvestigateCaseRoundPreparationRequest,
  ): Promise<void> {
    const caseResolution = await readTargetInvestigateCaseCaseResolutionArtifact({
      projectPath: request.targetProject.path,
      relativePath: request.artifactPaths.caseResolutionPath,
      normalizedInput: request.normalizedInput,
    });
    const evidenceIndex = await readJsonArtifact(
      request.targetProject.path,
      request.artifactPaths.evidenceIndexPath,
      targetInvestigateCaseEvidenceIndexSchema,
      TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
    );
    const evidenceBundle = await readTargetInvestigateCaseEvidenceBundleArtifact({
      projectPath: request.targetProject.path,
      relativePath: request.artifactPaths.evidenceBundlePath,
    });
    const diagnosis = await readJsonArtifact(
      request.targetProject.path,
      request.artifactPaths.diagnosisJsonPath,
      targetInvestigateCaseDiagnosisSchema,
      "diagnosis.json",
    );

    if (diagnosis.bundle_artifact !== request.artifactPaths.evidenceBundlePath) {
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "round-materialization",
        "artifact-validation-failed",
        "diagnosis",
        `diagnosis.json precisa apontar bundle_artifact=${request.artifactPaths.evidenceBundlePath}.`,
        "Garanta coerencia entre diagnosis.json e case-bundle.json antes de rerodar.",
      );
    }

    await validateDiagnosisMarkdownArtifact(
      request.targetProject.path,
      request.artifactPaths.diagnosisMdPath,
    );
    assertTargetInvestigateCaseV2LegacyLineageCoverage({
      manifest: request.manifest,
      artifactPaths: request.artifactPaths,
      caseResolution,
      evidenceBundle,
      evidenceIndex,
      diagnosis,
    });
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

const readJsonArtifact = async <SchemaOutput>(
  projectPath: string,
  relativePath: string,
  schema: z.ZodType<SchemaOutput, z.ZodTypeDef, unknown>,
  label: string,
): Promise<SchemaOutput> => {
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  const raw = await fs.readFile(absolutePath, "utf8");
  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label} nao contem JSON valido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error(`${label} contem schema invalido: ${renderZodIssues(parsed.error.issues)}`);
  }

  return parsed.data;
};

const renderZodIssues = (issues: readonly z.ZodIssue[]): string =>
  issues
    .map((issue) => {
      const pathLabel = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${pathLabel}${issue.message}`;
    })
    .join(" | ");

const DIAGNOSIS_MARKDOWN_HEADING_PATTERN = /^\s{0,3}#{1,6}\s+(.+?)\s*$/u;

const validateDiagnosisMarkdownArtifact = async (
  projectPath: string,
  relativePath: string,
): Promise<void> => {
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  const raw = await fs.readFile(absolutePath, "utf8");

  if (!raw.trim()) {
    throw new Error("diagnosis.md nao pode estar vazio.");
  }

  const sections = new Map<string, string[]>();
  let currentHeading: string | null = null;

  for (const line of raw.split(/\r?\n/u)) {
    const headingMatch = line.match(DIAGNOSIS_MARKDOWN_HEADING_PATTERN);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      if (
        TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS.includes(
          heading as (typeof TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS)[number],
        )
      ) {
        if (sections.has(heading)) {
          throw new Error(`diagnosis.md nao pode repetir a secao obrigatoria \`${heading}\`.`);
        }
        sections.set(heading, []);
      }
      currentHeading = heading;
      continue;
    }

    if (!currentHeading || !sections.has(currentHeading)) {
      continue;
    }

    sections.get(currentHeading)?.push(line);
  }

  for (const heading of TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS) {
    if (!sections.has(heading)) {
      throw new Error(`diagnosis.md precisa conter a secao obrigatoria \`${heading}\`.`);
    }

    const content = sections.get(heading)?.join("\n").trim() ?? "";
    if (!content) {
      throw new Error(`diagnosis.md precisa preencher a secao obrigatoria \`${heading}\`.`);
    }
  }
};
