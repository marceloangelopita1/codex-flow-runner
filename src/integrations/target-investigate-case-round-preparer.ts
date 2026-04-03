import { promises as fs } from "node:fs";
import path from "node:path";
import { Logger } from "../core/logger.js";
import {
  TargetInvestigateCaseRoundPreparer,
  TargetInvestigateCaseRoundPreparationRequest,
  TargetInvestigateCaseRoundPreparationResult,
} from "../core/target-investigate-case.js";
import type { ProjectRef } from "../types/project.js";
import {
  targetInvestigateCaseAssessmentSchema,
  targetInvestigateCaseCaseResolutionSchema,
  targetInvestigateCaseDossierJsonSchema,
  targetInvestigateCaseEvidenceBundleSchema,
} from "../types/target-investigate-case.js";
import { TargetInvestigateCaseRoundMaterializationCodexClient } from "./codex-client.js";
import { GitVersioning } from "./git-client.js";
import { FileSystemTargetInvestigateCaseTicketPublisher } from "./target-investigate-case-ticket-publisher.js";

interface TargetInvestigateCaseRoundPreparerDependencies {
  logger: Logger;
  runnerRepoPath: string;
  createCodexClient: (project: ProjectRef) => TargetInvestigateCaseRoundMaterializationCodexClient;
  createGitVersioning: (project: ProjectRef) => GitVersioning;
}

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
    const runbookPath = resolveRunbookPath(request.manifest.supportingArtifacts.docs);

    try {
      await fixedCodexClient.runTargetInvestigateCaseRoundMaterialization({
        targetProject: request.targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference,
        manifestPath: request.manifestPath,
        runbookPath,
        canonicalCommand: request.normalizedInput.canonicalCommand,
        roundId: request.roundId,
        roundDirectory: request.roundDirectory,
        artifactPaths: request.artifactPaths,
        caseRefAuthorities: request.manifest.caseResolutionPolicy.caseRefAuthorities ?? [],
        attemptRefAuthorities: request.manifest.caseResolutionPolicy.attemptRefAuthorities ?? [],
        targetProjectAcceptedSelectors: request.manifest.selectors.targetProjectAccepted ?? [],
        investigableWorkflows: request.manifest.workflows.investigable,
        acceptedPurgeIdentifiers: request.manifest.replayPolicy.acceptedPurgeIdentifiers ?? [],
        dossierLocalPathTemplate: request.manifest.dossierPolicy.localPathTemplate,
      });
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    let dossierPath = "";
    try {
      dossierPath = await resolvePreparedDossierPath(request);
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.caseResolutionPath,
        targetInvestigateCaseCaseResolutionSchema,
        "case-resolution.json",
      );
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.evidenceBundlePath,
        targetInvestigateCaseEvidenceBundleSchema,
        "evidence-bundle.json",
      );
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.assessmentPath,
        targetInvestigateCaseAssessmentSchema,
        "assessment.json",
      );
      await validateDossierArtifact(request.targetProject.path, dossierPath);
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      };
    }

    return {
      status: "prepared",
      dossierPath,
      ticketPublisher: this.buildTicketPublisher(request),
    };
  }

  private buildTicketPublisher(
    request: TargetInvestigateCaseRoundPreparationRequest,
  ): FileSystemTargetInvestigateCaseTicketPublisher | null {
    const policy = request.manifest.ticketPublicationPolicy;
    if (!policy) {
      return null;
    }

    if (
      policy.semanticAuthority !== "target-project" ||
      policy.finalPublicationAuthority !== "runner"
    ) {
      this.dependencies.logger.warn(
        "ticketPublicationPolicy incompativel com o publisher oficial de target-investigate-case",
        {
          targetProjectName: request.targetProject.name,
          semanticAuthority: policy.semanticAuthority,
          finalPublicationAuthority: policy.finalPublicationAuthority,
        },
      );
      return null;
    }

    if (
      policy.versionedArtifactsDefault.length !== 1 ||
      policy.versionedArtifactsDefault[0] !== "ticket"
    ) {
      this.dependencies.logger.warn(
        "ticketPublicationPolicy declarou artefatos versionados fora do contrato suportado",
        {
          targetProjectName: request.targetProject.name,
          versionedArtifactsDefault: policy.versionedArtifactsDefault,
        },
      );
      return null;
    }

    return new FileSystemTargetInvestigateCaseTicketPublisher(
      request.targetProject.path,
      this.dependencies.createGitVersioning(request.targetProject),
    );
  }
}

const resolveRunbookPath = (docs: readonly string[]): string | null =>
  docs.find((entry) => entry.endsWith("target-case-investigation-runbook.md")) ?? null;

const resolvePreparedDossierPath = async (
  request: TargetInvestigateCaseRoundPreparationRequest,
): Promise<string> => {
  const preferredArtifact = request.manifest.outputs.dossier.preferredArtifact;
  const candidatePaths = uniquePaths([
    preferredArtifact ? path.posix.join(request.roundDirectory, preferredArtifact) : null,
    request.artifactPaths.dossierPath,
    path.posix.join(request.roundDirectory, "dossier.md"),
    path.posix.join(request.roundDirectory, "dossier.json"),
  ]);

  for (const candidate of candidatePaths) {
    if (await relativePathExists(request.targetProject.path, candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Nenhum dossier canonico foi materializado em ${request.roundDirectory} (esperado dossier.md ou dossier.json).`,
  );
};

const uniquePaths = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
};

const validateDossierArtifact = async (projectPath: string, dossierPath: string): Promise<void> => {
  const absolutePath = path.join(projectPath, ...dossierPath.split("/"));
  const raw = await fs.readFile(absolutePath, "utf8");

  if (dossierPath.endsWith(".md")) {
    if (!raw.trim()) {
      throw new Error("dossier.md nao pode estar vazio.");
    }
    return;
  }

  const decoded = JSON.parse(raw);
  const parsed = targetInvestigateCaseDossierJsonSchema.parse(decoded);
  if (parsed.local_path !== dossierPath) {
    throw new Error("dossier.json.local_path precisa coincidir com o caminho efetivo do dossier.");
  }
};

const readJsonArtifact = async <SchemaOutput>(
  projectPath: string,
  relativePath: string,
  schema: { parse: (decoded: unknown) => SchemaOutput },
  label: string,
): Promise<SchemaOutput> => {
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  const raw = await fs.readFile(absolutePath, "utf8");

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label} contem JSON invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return schema.parse(decoded);
};

const relativePathExists = async (projectPath: string, relativePath: string): Promise<boolean> => {
  try {
    await fs.access(path.join(projectPath, ...relativePath.split("/")));
    return true;
  } catch {
    return false;
  }
};
