import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Logger } from "../core/logger.js";
import {
  readTargetInvestigateCaseCaseResolutionArtifact,
  TargetInvestigateCaseRoundPreparer,
  TargetInvestigateCaseRoundPreparationRequest,
  TargetInvestigateCaseRoundPreparationResult,
} from "../core/target-investigate-case.js";
import type { ProjectRef } from "../types/project.js";
import {
  normalizeTargetInvestigateCaseRelativePath,
  targetInvestigateCaseAssessmentSchema,
  targetInvestigateCaseCausalDebugRequestSchema,
  targetInvestigateCaseDiagnosisSchema,
  targetInvestigateCaseDossierJsonSchema,
  targetInvestigateCaseEvidenceIndexSchema,
  targetInvestigateCaseEvidenceBundleSchema,
  targetInvestigateCaseRootCauseReviewRequestSchema,
  targetInvestigateCaseSemanticReviewRequestSchema,
  TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_COMMAND,
  TARGET_INVESTIGATE_CASE_DIAGNOSIS_REQUIRED_SECTIONS,
  TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
  TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
  TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
  TARGET_INVESTIGATE_CASE_V2_COMMAND,
  TARGET_INVESTIGATE_CASE_V2_FLOW,
  TARGET_INVESTIGATE_CASE_V2_MIRROR_ROUNDS_DIR,
  TargetInvestigateCaseAssessment,
  TargetInvestigateCaseCausalDebugRequest,
  TargetInvestigateCaseFailureKind,
  TargetInvestigateCaseFailureSurface,
  TargetInvestigateCaseReplayMode,
  TargetInvestigateCaseRootCauseReviewRequest,
  TargetInvestigateCaseSemanticReviewRequest,
} from "../types/target-investigate-case.js";
import { TargetInvestigateCaseMilestone } from "../types/target-flow.js";
import { TargetInvestigateCaseRoundMaterializationCodexClient } from "./codex-client.js";
import { GitVersioning } from "./git-client.js";
import {
  buildTargetInvestigateCaseSemanticReviewPromptContext,
  parseTargetInvestigateCaseSemanticReviewOutput,
} from "./target-investigate-case-semantic-review.js";
import { parseTargetInvestigateCaseCausalDebugOutput } from "./target-investigate-case-causal-debug.js";
import { parseTargetInvestigateCaseRootCauseReviewOutput } from "./target-investigate-case-root-cause-review.js";
import { FileSystemTargetInvestigateCaseTicketPublisher } from "./target-investigate-case-ticket-publisher.js";

interface TargetInvestigateCaseRoundPreparerDependencies {
  logger: Logger;
  runnerRepoPath: string;
  createCodexClient: (project: ProjectRef) => TargetInvestigateCaseRoundMaterializationCodexClient;
  createGitVersioning: (project: ProjectRef) => GitVersioning;
  runSemanticReviewRecomposition?: (
    request: TargetInvestigateCaseSemanticReviewRecompositionRequest,
  ) => Promise<void>;
}

interface TargetInvestigateCaseSelectedSelectors {
  propertyId?: string;
  requestId?: string;
  workflow?: string;
  window?: string;
  runArtifact?: string;
  symptom?: string;
}

interface TargetInvestigateCaseSemanticReviewRecompositionRequest {
  targetProject: ProjectRef;
  entrypointCommand: string;
  scriptPath: string;
  roundId: string;
  selectors: TargetInvestigateCaseSelectedSelectors;
  roundRequestIdFlag: string;
  forceFlag: string;
  replayMode: TargetInvestigateCaseReplayMode;
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
  options?: {
    commandLabel?: string;
    failedAtMilestone?: TargetInvestigateCaseMilestone;
  },
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
    failedAtMilestone: options?.failedAtMilestone ?? "case-resolution",
    nextAction:
      `Revise os artefatos canonicos materializados nesta rodada antes de rerodar ${options?.commandLabel ?? "/target_investigate_case"}.`,
  };
};

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
    const authoritativeDossierLocalPath = resolveAuthoritativeDossierLocalPath(
      request.manifest.dossierPolicy.localPathTemplate,
      request.roundId,
    );
    const isV2Contract = request.manifest.flow === TARGET_INVESTIGATE_CASE_V2_FLOW;
    const commandLabel = isV2Contract
      ? TARGET_INVESTIGATE_CASE_V2_COMMAND
      : TARGET_INVESTIGATE_CASE_COMMAND;

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
        officialTargetEntrypointCommand: request.manifest.entrypoint?.command ?? null,
        officialTargetEntrypointScriptPath: request.manifest.entrypoint?.scriptPath ?? null,
        authoritativeDossierLocalPath,
      });
    } catch (error) {
      return {
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
        failureSurface: "round-materialization",
        failureKind: "codex-execution-failed",
        failedAtMilestone: isV2Contract ? "resolve-case" : "case-resolution",
        nextAction:
          `Revise a execucao runner-side da materializacao inicial e rerode ${commandLabel}.`,
      };
    }

    let dossierPath = "";
    try {
      await syncCanonicalArtifactsFromAuthoritativeDossier(request, authoritativeDossierLocalPath);
      dossierPath = await resolvePreparedDossierPath(request);
      await readTargetInvestigateCaseCaseResolutionArtifact({
        projectPath: request.targetProject.path,
        relativePath: request.artifactPaths.caseResolutionPath,
        normalizedInput: request.normalizedInput,
        roundId: request.roundId,
        onCompatibilityIssue: (issue) => {
          this.dependencies.logger.warn(issue.message, {
            targetProjectName: request.targetProject.name,
            artifactPath: request.artifactPaths.caseResolutionPath,
            compatibilityCode: issue.code,
            ...(issue.context ?? {}),
          });
        },
      });
      if (request.artifactPaths.evidenceIndexPath) {
        await readJsonArtifact(
          request.targetProject.path,
          request.artifactPaths.evidenceIndexPath,
          targetInvestigateCaseEvidenceIndexSchema,
          TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT,
        );
      }
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.evidenceBundlePath,
        targetInvestigateCaseEvidenceBundleSchema,
        path.posix.basename(request.artifactPaths.evidenceBundlePath),
      );
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.assessmentPath,
        targetInvestigateCaseAssessmentSchema,
        "assessment.json",
      );
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.diagnosisJsonPath,
        targetInvestigateCaseDiagnosisSchema,
        "diagnosis.json",
      );
      await validateDiagnosisMarkdownArtifact(
        request.targetProject.path,
        request.artifactPaths.diagnosisMdPath,
      );
      await validateDossierArtifact(request.targetProject.path, dossierPath);
      if (isV2Contract) {
        this.dependencies.logger.info(
          "Contrato v2 detectado: semantic-review, causal-debug e root-cause-review permanecem opcionais e nao sao disparados automaticamente no caminho minimo",
          {
            targetProjectName: request.targetProject.name,
            roundId: request.roundId,
            authoritativeRoundDirectory: authoritativeDossierLocalPath,
          },
        );
      } else {
        await this.completeSemanticReviewIfSupported(
          request,
          fixedCodexClient,
          authoritativeDossierLocalPath,
        );
        await this.completeCausalDebugIfSupported(
          request,
          fixedCodexClient,
          authoritativeDossierLocalPath,
        );
        await this.completeRootCauseReviewIfSupported(
          request,
          fixedCodexClient,
          authoritativeDossierLocalPath,
        );
      }
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.assessmentPath,
        targetInvestigateCaseAssessmentSchema,
        "assessment.json",
      );
      await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.diagnosisJsonPath,
        targetInvestigateCaseDiagnosisSchema,
        "diagnosis.json",
      );
      await validateDiagnosisMarkdownArtifact(
        request.targetProject.path,
        request.artifactPaths.diagnosisMdPath,
      );
      await validateDossierArtifact(request.targetProject.path, dossierPath);
    } catch (error) {
      return buildRoundPreparationFailedResult(error, {
        commandLabel,
        failedAtMilestone: isV2Contract ? "resolve-case" : "case-resolution",
      });
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

  private async completeSemanticReviewIfSupported(
    request: TargetInvestigateCaseRoundPreparationRequest,
    codexClient: TargetInvestigateCaseRoundMaterializationCodexClient,
    authoritativeDossierLocalPath: string | null,
  ): Promise<void> {
    if (!request.manifest.semanticReview) {
      return;
    }

    const resultDestinationPaths = uniquePaths([
      request.artifactPaths.semanticReviewResultPath,
      authoritativeDossierLocalPath
        ? path.posix.join(authoritativeDossierLocalPath, "semantic-review.result.json")
        : null,
    ]);
    for (const resultDestinationPath of resultDestinationPaths) {
      await removeRelativePathIfExists(request.targetProject.path, resultDestinationPath);
    }

    if (
      !(await relativePathExists(
        request.targetProject.path,
        request.artifactPaths.semanticReviewRequestPath,
      ))
    ) {
      this.dependencies.logger.info(
        "semantic-review ausente na rodada de target-investigate-case; fluxo segue sem regressao",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
        },
      );
      return;
    }

    let semanticReviewRequest: TargetInvestigateCaseSemanticReviewRequest;
    try {
      semanticReviewRequest = await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.semanticReviewRequestPath,
        targetInvestigateCaseSemanticReviewRequestSchema,
        "semantic-review.request.json",
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "semantic-review.request.json invalido; rodada falhara com causa operacional explicita",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "semantic-review",
        "request-invalid",
        "assessment",
        error instanceof Error ? error.message : String(error),
        "Corrija semantic-review.request.json no projeto alvo antes de rerodar a rodada.",
      );
    }

    if (semanticReviewRequest.review_readiness.status === "blocked") {
      this.dependencies.logger.info(
        "semantic-review pulado por bloqueio explicito do projeto alvo",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
          reasonCode: semanticReviewRequest.review_readiness.reason_code,
        },
      );
      return;
    }

    if (request.isCancellationRequested()) {
      this.dependencies.logger.info(
        "semantic-review nao sera executado porque a rodada recebeu cancelamento cooperativo",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
        },
      );
      return;
    }

    let reviewContextJson = "";
    try {
      reviewContextJson = JSON.stringify(
        await buildTargetInvestigateCaseSemanticReviewPromptContext(
          request.targetProject.path,
          semanticReviewRequest,
        ),
        null,
        2,
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "semantic-review nao conseguiu montar contexto bounded valido; rodada falhara com causa operacional explicita",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "semantic-review",
        "context-build-failed",
        "assessment",
        error instanceof Error ? error.message : String(error),
        "Revise o packet bounded e os supporting_refs declarados pelo target antes de rerodar.",
      );
    }

    const runnerReference = `codex-flow-runner@${this.dependencies.runnerRepoPath}`;
    let authoritativeResultPath =
      authoritativeDossierLocalPath != null
        ? path.posix.join(authoritativeDossierLocalPath, "semantic-review.result.json")
        : request.artifactPaths.semanticReviewResultPath;

    let resultOutput = "";
    try {
      const result = await codexClient.runTargetInvestigateCaseSemanticReview({
        targetProject: request.targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference,
        manifestPath: request.manifestPath,
        reviewRequestPath: request.artifactPaths.semanticReviewRequestPath,
        reviewResultPath: request.artifactPaths.semanticReviewResultPath,
        reviewRequestJson: JSON.stringify(semanticReviewRequest, null, 2),
        reviewContextJson,
      });
      resultOutput = result.output;
    } catch (error) {
      this.dependencies.logger.warn(
        "semantic-review runner-side falhou e agora interrompe a rodada",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
          resultPath: request.artifactPaths.semanticReviewResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "semantic-review",
        "codex-execution-failed",
        "assessment",
        error instanceof Error ? error.message : String(error),
        "Revise a execucao runner-side do semantic-review e rerode a rodada.",
      );
    }

    let parsedResult: unknown;
    try {
      parsedResult = parseTargetInvestigateCaseSemanticReviewOutput(resultOutput);
    } catch (error) {
      this.dependencies.logger.warn(
        "semantic-review retornou payload nao materializavel; rodada falhara com parse explicito",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
          resultPath: request.artifactPaths.semanticReviewResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "semantic-review",
        "result-parse-failed",
        "assessment",
        error instanceof Error ? error.message : String(error),
        "Revise a resposta do Codex para semantic-review e garanta JSON valido antes de rerodar.",
      );
    }

    try {
      await writeJsonArtifact(
        request.targetProject.path,
        authoritativeResultPath,
        parsedResult,
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "semantic-review falhou ao persistir o artefato canonico; rodada sera interrompida",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.semanticReviewRequestPath,
          resultPath: request.artifactPaths.semanticReviewResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "semantic-review",
        "artifact-persist-failed",
        "assessment",
        error instanceof Error ? error.message : String(error),
        "Revise a persistencia de semantic-review.result.json no projeto alvo antes de rerodar.",
      );
    }

    if (request.manifest.semanticReview.recomposition) {
      try {
        await this.recomposeAssessmentAfterSemanticReview(
          request,
          authoritativeResultPath,
          authoritativeDossierLocalPath,
        );
        await syncCanonicalArtifactsFromAuthoritativeDossier(request, authoritativeDossierLocalPath);
      } catch (error) {
        throw new TargetInvestigateCaseRoundPreparationFailureError(
          "semantic-review",
          "recomposition-failed",
          "assessment",
          error instanceof Error ? error.message : String(error),
          "Revise a recomposicao oficial do target para semantic-review antes de rerodar.",
        );
      }
    } else if (authoritativeResultPath !== request.artifactPaths.semanticReviewResultPath) {
      try {
        await copyRelativePath(
          request.targetProject.path,
          authoritativeResultPath,
          request.artifactPaths.semanticReviewResultPath,
        );
      } catch (error) {
        throw new TargetInvestigateCaseRoundPreparationFailureError(
          "semantic-review",
          "artifact-persist-failed",
          "assessment",
          error instanceof Error ? error.message : String(error),
          "Revise a sincronizacao canonica de semantic-review.result.json antes de rerodar.",
        );
      }
    }
  }

  private async completeCausalDebugIfSupported(
    request: TargetInvestigateCaseRoundPreparationRequest,
    codexClient: TargetInvestigateCaseRoundMaterializationCodexClient,
    authoritativeDossierLocalPath: string | null,
  ): Promise<void> {
    if (!request.manifest.causalDebug) {
      return;
    }

    const resultDestinationPaths = uniquePaths([
      request.artifactPaths.causalDebugResultPath,
      authoritativeDossierLocalPath
        ? path.posix.join(
            authoritativeDossierLocalPath,
            TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
          )
        : null,
      request.artifactPaths.ticketProposalPath,
      authoritativeDossierLocalPath
        ? path.posix.join(
            authoritativeDossierLocalPath,
            TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
          )
        : null,
    ]);
    for (const resultDestinationPath of resultDestinationPaths) {
      await removeRelativePathIfExists(request.targetProject.path, resultDestinationPath);
    }

    if (
      !(await relativePathExists(
        request.targetProject.path,
        request.artifactPaths.causalDebugRequestPath,
      ))
    ) {
      this.dependencies.logger.info(
        "causal-debug ausente na rodada de target-investigate-case; fluxo segue sem regressao",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
        },
      );
      return;
    }

    let causalDebugRequest: TargetInvestigateCaseCausalDebugRequest;
    try {
      causalDebugRequest = await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.causalDebugRequestPath,
        targetInvestigateCaseCausalDebugRequestSchema,
        TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "causal-debug.request.json invalido; rodada falhara com causa operacional explicita",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "causal-debug",
        "request-invalid",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Corrija causal-debug.request.json no projeto alvo antes de rerodar a rodada.",
      );
    }

    if (causalDebugRequest.debug_readiness.status === "blocked") {
      this.dependencies.logger.info(
        "causal-debug pulado por bloqueio explicito do projeto alvo",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
          reasonCode: causalDebugRequest.debug_readiness.reason_code,
        },
      );
      return;
    }

    if (request.isCancellationRequested()) {
      this.dependencies.logger.info(
        "causal-debug nao sera executado porque a rodada recebeu cancelamento cooperativo",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
        },
      );
      return;
    }

    const runnerReference = `codex-flow-runner@${this.dependencies.runnerRepoPath}`;
    const authoritativeResultPath =
      authoritativeDossierLocalPath != null
        ? path.posix.join(
            authoritativeDossierLocalPath,
            TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
          )
        : request.artifactPaths.causalDebugResultPath;

    let resultOutput = "";
    try {
      const result = await codexClient.runTargetInvestigateCaseCausalDebug({
        targetProject: request.targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference,
        manifestPath: request.manifestPath,
        debugPromptPath: request.manifest.causalDebug.promptPath,
        debugRequestPath: request.artifactPaths.causalDebugRequestPath,
        debugResultPath: request.artifactPaths.causalDebugResultPath,
        debugRequestJson: JSON.stringify(causalDebugRequest, null, 2),
      });
      resultOutput = result.output;
    } catch (error) {
      this.dependencies.logger.warn(
        "causal-debug runner-side falhou e agora interrompe a rodada",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
          resultPath: request.artifactPaths.causalDebugResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "causal-debug",
        "codex-execution-failed",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Revise a execucao runner-side do causal-debug antes de rerodar a rodada.",
      );
    }

    let parsedResult: unknown;
    try {
      parsedResult = parseTargetInvestigateCaseCausalDebugOutput(resultOutput);
    } catch (error) {
      this.dependencies.logger.warn(
        "causal-debug retornou payload nao materializavel; rodada falhara com parse explicito",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
          resultPath: request.artifactPaths.causalDebugResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "causal-debug",
        "result-parse-failed",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Revise a resposta do Codex para causal-debug e garanta JSON valido antes de rerodar.",
      );
    }

    try {
      await writeJsonArtifact(
        request.targetProject.path,
        authoritativeResultPath,
        parsedResult,
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "causal-debug falhou ao persistir o artefato canonico; rodada sera interrompida",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.causalDebugRequestPath,
          resultPath: request.artifactPaths.causalDebugResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "causal-debug",
        "artifact-persist-failed",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Revise a persistencia de causal-debug.result.json no projeto alvo antes de rerodar.",
      );
    }

    if (request.manifest.causalDebug.recomposition) {
      try {
        await this.recomposeAssessmentAfterCausalDebug(
          request,
          authoritativeResultPath,
          authoritativeDossierLocalPath,
        );
        await syncCanonicalArtifactsFromAuthoritativeDossier(request, authoritativeDossierLocalPath);
      } catch (error) {
        throw new TargetInvestigateCaseRoundPreparationFailureError(
          "causal-debug",
          "recomposition-failed",
          "publication",
          error instanceof Error ? error.message : String(error),
          "Revise a recomposicao oficial do target para causal-debug antes de rerodar.",
        );
      }
    } else if (authoritativeResultPath !== request.artifactPaths.causalDebugResultPath) {
      try {
        await copyRelativePath(
          request.targetProject.path,
          authoritativeResultPath,
          request.artifactPaths.causalDebugResultPath,
        );
      } catch (error) {
        throw new TargetInvestigateCaseRoundPreparationFailureError(
          "causal-debug",
          "artifact-persist-failed",
          "publication",
          error instanceof Error ? error.message : String(error),
          "Revise a sincronizacao canonica de causal-debug.result.json antes de rerodar.",
        );
      }
    }
  }

  private async completeRootCauseReviewIfSupported(
    request: TargetInvestigateCaseRoundPreparationRequest,
    codexClient: TargetInvestigateCaseRoundMaterializationCodexClient,
    authoritativeDossierLocalPath: string | null,
  ): Promise<void> {
    if (!request.manifest.rootCauseReview) {
      return;
    }

    const resultDestinationPaths = uniquePaths([
      request.artifactPaths.rootCauseReviewResultPath,
      authoritativeDossierLocalPath
        ? path.posix.join(
            authoritativeDossierLocalPath,
            TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
          )
        : null,
      request.artifactPaths.ticketProposalPath,
      authoritativeDossierLocalPath
        ? path.posix.join(
            authoritativeDossierLocalPath,
            TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
          )
        : null,
    ]);
    for (const resultDestinationPath of resultDestinationPaths) {
      await removeRelativePathIfExists(request.targetProject.path, resultDestinationPath);
    }

    if (
      !(await relativePathExists(
        request.targetProject.path,
        request.artifactPaths.rootCauseReviewRequestPath,
      ))
    ) {
      this.dependencies.logger.info(
        "root-cause-review ausente na rodada de target-investigate-case; fluxo segue sem regressao",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
        },
      );
      return;
    }

    let rootCauseReviewRequest: TargetInvestigateCaseRootCauseReviewRequest;
    try {
      rootCauseReviewRequest = await readJsonArtifact(
        request.targetProject.path,
        request.artifactPaths.rootCauseReviewRequestPath,
        targetInvestigateCaseRootCauseReviewRequestSchema,
        TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "root-cause-review.request.json invalido; rodada falhara com causa operacional explicita",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "root-cause-review",
        "request-invalid",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Corrija root-cause-review.request.json no projeto alvo antes de rerodar a rodada.",
      );
    }

    if (rootCauseReviewRequest.review_readiness.status === "blocked") {
      this.dependencies.logger.info(
        "root-cause-review pulado por bloqueio explicito do projeto alvo",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
          reasonCode: rootCauseReviewRequest.review_readiness.reason_code,
        },
      );
      return;
    }

    if (request.isCancellationRequested()) {
      this.dependencies.logger.info(
        "root-cause-review nao sera executado porque a rodada recebeu cancelamento cooperativo",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
        },
      );
      return;
    }

    const runnerReference = `codex-flow-runner@${this.dependencies.runnerRepoPath}`;
    const authoritativeResultPath =
      authoritativeDossierLocalPath != null
        ? path.posix.join(
            authoritativeDossierLocalPath,
            TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
          )
        : request.artifactPaths.rootCauseReviewResultPath;

    let resultOutput = "";
    try {
      const result = await codexClient.runTargetInvestigateCaseRootCauseReview({
        targetProject: request.targetProject,
        runnerRepoPath: this.dependencies.runnerRepoPath,
        runnerReference,
        manifestPath: request.manifestPath,
        reviewPromptPath: request.manifest.rootCauseReview.promptPath,
        reviewRequestPath: request.artifactPaths.rootCauseReviewRequestPath,
        reviewResultPath: request.artifactPaths.rootCauseReviewResultPath,
        reviewRequestJson: JSON.stringify(rootCauseReviewRequest, null, 2),
      });
      resultOutput = result.output;
    } catch (error) {
      this.dependencies.logger.warn(
        "root-cause-review runner-side falhou e agora interrompe a rodada",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
          resultPath: request.artifactPaths.rootCauseReviewResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "root-cause-review",
        "codex-execution-failed",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Revise a execucao runner-side do root-cause-review antes de rerodar a rodada.",
      );
    }

    let parsedResult: unknown;
    try {
      parsedResult = parseTargetInvestigateCaseRootCauseReviewOutput(resultOutput);
    } catch (error) {
      this.dependencies.logger.warn(
        "root-cause-review retornou payload nao materializavel; rodada falhara com parse explicito",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
          resultPath: request.artifactPaths.rootCauseReviewResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "root-cause-review",
        "result-parse-failed",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Revise a resposta do Codex para root-cause-review e garanta JSON valido antes de rerodar.",
      );
    }

    try {
      await writeJsonArtifact(
        request.targetProject.path,
        authoritativeResultPath,
        parsedResult,
      );
    } catch (error) {
      this.dependencies.logger.warn(
        "root-cause-review falhou ao persistir o artefato canonico; rodada sera interrompida",
        {
          targetProjectName: request.targetProject.name,
          roundId: request.roundId,
          requestPath: request.artifactPaths.rootCauseReviewRequestPath,
          resultPath: request.artifactPaths.rootCauseReviewResultPath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new TargetInvestigateCaseRoundPreparationFailureError(
        "root-cause-review",
        "artifact-persist-failed",
        "publication",
        error instanceof Error ? error.message : String(error),
        "Revise a persistencia de root-cause-review.result.json no projeto alvo antes de rerodar.",
      );
    }

    if (request.manifest.rootCauseReview.recomposition) {
      try {
        await this.recomposeAssessmentAfterRootCauseReview(
          request,
          authoritativeResultPath,
          authoritativeDossierLocalPath,
        );
        await syncCanonicalArtifactsFromAuthoritativeDossier(request, authoritativeDossierLocalPath);
      } catch (error) {
        throw new TargetInvestigateCaseRoundPreparationFailureError(
          "root-cause-review",
          "recomposition-failed",
          "publication",
          error instanceof Error ? error.message : String(error),
          "Revise a recomposicao oficial do target para root-cause-review antes de rerodar.",
        );
      }
    } else if (authoritativeResultPath !== request.artifactPaths.rootCauseReviewResultPath) {
      try {
        await copyRelativePath(
          request.targetProject.path,
          authoritativeResultPath,
          request.artifactPaths.rootCauseReviewResultPath,
        );
      } catch (error) {
        throw new TargetInvestigateCaseRoundPreparationFailureError(
          "root-cause-review",
          "artifact-persist-failed",
          "publication",
          error instanceof Error ? error.message : String(error),
          "Revise a sincronizacao canonica de root-cause-review.result.json antes de rerodar.",
        );
      }
    }
  }

  private async recomposeAssessmentAfterSemanticReview(
    request: TargetInvestigateCaseRoundPreparationRequest,
    authoritativeResultPath: string,
    authoritativeDossierLocalPath: string | null,
  ): Promise<void> {
    const recomposition = request.manifest.semanticReview?.recomposition;
    if (!recomposition) {
      return;
    }

    if (!authoritativeDossierLocalPath) {
      throw new Error(
        "A recomposicao oficial do target-project exige dossier autoritativo local, mas nenhum caminho valido foi resolvido.",
      );
    }

    if (!request.manifest.entrypoint) {
      throw new Error(
        "O manifesto declarou semanticReview.recomposition, mas entrypoint esta ausente para o rerun oficial.",
      );
    }

    const selectors = await loadSelectedSelectorsFromCaseResolution(
      request.targetProject.path,
      path.posix.join(authoritativeDossierLocalPath, "case-resolution.json"),
    );

    const runRecomposition =
      this.dependencies.runSemanticReviewRecomposition ??
      runTargetInvestigateCaseSemanticReviewRecomposition;

    await runRecomposition({
      targetProject: request.targetProject,
      entrypointCommand: request.manifest.entrypoint.command,
      scriptPath: request.manifest.entrypoint.scriptPath,
      roundId: request.roundId,
      selectors,
      roundRequestIdFlag: recomposition.roundRequestIdFlag,
      forceFlag: recomposition.forceFlag,
      replayMode: recomposition.replayMode,
    });

    if (!(await relativePathExists(request.targetProject.path, authoritativeResultPath))) {
      throw new Error(
        "A recomposicao oficial removeu semantic-review.result.json do dossier autoritativo, o que viola o contrato bounded.",
      );
    }

    const recomposedAssessment = await readJsonArtifact(
      request.targetProject.path,
      path.posix.join(authoritativeDossierLocalPath, "assessment.json"),
      targetInvestigateCaseAssessmentSchema,
      "assessment.json",
    );

    assertAssessmentConsumedSemanticReviewResult(recomposedAssessment);
  }

  private async recomposeAssessmentAfterCausalDebug(
    request: TargetInvestigateCaseRoundPreparationRequest,
    authoritativeResultPath: string,
    authoritativeDossierLocalPath: string | null,
  ): Promise<void> {
    const recomposition = request.manifest.causalDebug?.recomposition;
    if (!recomposition) {
      return;
    }

    if (!authoritativeDossierLocalPath) {
      throw new Error(
        "A recomposicao oficial do target-project exige dossier autoritativo local, mas nenhum caminho valido foi resolvido.",
      );
    }

    if (!request.manifest.entrypoint) {
      throw new Error(
        "O manifesto declarou causalDebug.recomposition, mas entrypoint esta ausente para o rerun oficial.",
      );
    }

    const selectors = await loadSelectedSelectorsFromCaseResolution(
      request.targetProject.path,
      path.posix.join(authoritativeDossierLocalPath, "case-resolution.json"),
    );

    const runRecomposition =
      this.dependencies.runSemanticReviewRecomposition ??
      runTargetInvestigateCaseSemanticReviewRecomposition;

    await runRecomposition({
      targetProject: request.targetProject,
      entrypointCommand: request.manifest.entrypoint.command,
      scriptPath: request.manifest.entrypoint.scriptPath,
      roundId: request.roundId,
      selectors,
      roundRequestIdFlag: recomposition.roundRequestIdFlag,
      forceFlag: recomposition.forceFlag,
      replayMode: recomposition.replayMode,
    });

    if (!(await relativePathExists(request.targetProject.path, authoritativeResultPath))) {
      throw new Error(
        "A recomposicao oficial removeu causal-debug.result.json do dossier autoritativo, o que viola o contrato repo-aware.",
      );
    }

    const recomposedAssessment = await readJsonArtifact(
      request.targetProject.path,
      path.posix.join(authoritativeDossierLocalPath, "assessment.json"),
      targetInvestigateCaseAssessmentSchema,
      "assessment.json",
    );

    assertAssessmentConsumedCausalDebugResult(
      recomposedAssessment,
      await relativePathExists(
        request.targetProject.path,
        path.posix.join(authoritativeDossierLocalPath, TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT),
      ),
    );
  }

  private async recomposeAssessmentAfterRootCauseReview(
    request: TargetInvestigateCaseRoundPreparationRequest,
    authoritativeResultPath: string,
    authoritativeDossierLocalPath: string | null,
  ): Promise<void> {
    const recomposition = request.manifest.rootCauseReview?.recomposition;
    if (!recomposition) {
      return;
    }

    if (!authoritativeDossierLocalPath) {
      throw new Error(
        "A recomposicao oficial do target-project exige dossier autoritativo local, mas nenhum caminho valido foi resolvido.",
      );
    }

    if (!request.manifest.entrypoint) {
      throw new Error(
        "O manifesto declarou rootCauseReview.recomposition, mas entrypoint esta ausente para o rerun oficial.",
      );
    }

    const selectors = await loadSelectedSelectorsFromCaseResolution(
      request.targetProject.path,
      path.posix.join(authoritativeDossierLocalPath, "case-resolution.json"),
    );

    const runRecomposition =
      this.dependencies.runSemanticReviewRecomposition ??
      runTargetInvestigateCaseSemanticReviewRecomposition;

    await runRecomposition({
      targetProject: request.targetProject,
      entrypointCommand: request.manifest.entrypoint.command,
      scriptPath: request.manifest.entrypoint.scriptPath,
      roundId: request.roundId,
      selectors,
      roundRequestIdFlag: recomposition.roundRequestIdFlag,
      forceFlag: recomposition.forceFlag,
      replayMode: recomposition.replayMode,
    });

    if (!(await relativePathExists(request.targetProject.path, authoritativeResultPath))) {
      throw new Error(
        "A recomposicao oficial removeu root-cause-review.result.json do dossier autoritativo, o que viola o contrato repo-aware.",
      );
    }

    const recomposedAssessment = await readJsonArtifact(
      request.targetProject.path,
      path.posix.join(authoritativeDossierLocalPath, "assessment.json"),
      targetInvestigateCaseAssessmentSchema,
      "assessment.json",
    );

    assertAssessmentConsumedRootCauseReviewResult(
      recomposedAssessment,
      await relativePathExists(
        request.targetProject.path,
        path.posix.join(
          authoritativeDossierLocalPath,
          TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
        ),
      ),
    );
  }
}

const resolveRunbookPath = (docs: readonly string[]): string | null =>
  docs.find((entry) => entry.endsWith("target-case-investigation-runbook.md")) ?? null;

const resolveAuthoritativeDossierLocalPath = (
  localPathTemplate: string,
  roundId: string,
): string | null => {
  const resolved = normalizeTargetInvestigateCaseRelativePath(
    localPathTemplate
      .trim()
      .replace(/<request-id>/gu, roundId)
      .replace(/<round-id>/gu, roundId),
  ).replace(/\/+$/u, "");

  if (!resolved || resolved === "." || path.posix.isAbsolute(resolved)) {
    return null;
  }

  const normalized = path.posix.normalize(resolved);
  if (normalized === ".." || normalized.startsWith("../")) {
    return null;
  }

  return normalized;
};

const loadSelectedSelectorsFromCaseResolution = async (
  projectPath: string,
  relativeCaseResolutionPath: string,
): Promise<TargetInvestigateCaseSelectedSelectors> => {
  const absolutePath = path.join(projectPath, ...relativeCaseResolutionPath.split("/"));
  const decoded = JSON.parse(await fs.readFile(absolutePath, "utf8")) as {
    selected_selectors?: Record<string, unknown>;
  };
  const selectedSelectors = decoded.selected_selectors;
  if (!selectedSelectors || typeof selectedSelectors !== "object") {
    throw new Error(
      "case-resolution.json nao expoe selected_selectors suficientes para a recomposicao oficial.",
    );
  }

  const pick = (key: keyof TargetInvestigateCaseSelectedSelectors): string | undefined => {
    const value = selectedSelectors[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  };

  const normalizedSelectors = {
    propertyId: pick("propertyId"),
    requestId: pick("requestId"),
    workflow: pick("workflow"),
    window: pick("window"),
    runArtifact: pick("runArtifact"),
    symptom: pick("symptom"),
  };

  if (
    !normalizedSelectors.propertyId &&
    !normalizedSelectors.requestId &&
    !normalizedSelectors.runArtifact
  ) {
    throw new Error(
      "selected_selectors nao preserva propertyId, requestId ou runArtifact para a recomposicao oficial.",
    );
  }

  return normalizedSelectors;
};

const writeJsonArtifact = async (
  projectPath: string,
  relativePath: string,
  value: unknown,
): Promise<void> => {
  const absolutePath = path.join(projectPath, ...relativePath.split("/"));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const assertAssessmentConsumedSemanticReviewResult = (
  assessment: TargetInvestigateCaseAssessment,
): void => {
  const staleBlockerCodes = new Set(
    (assessment.blockers ?? []).map((entry) => entry.code),
  );
  const staleLimitCodes = new Set(
    (assessment.capability_limits ?? []).map((entry) => entry.code),
  );
  if (
    staleBlockerCodes.has("SEMANTIC_REVIEW_RESULT_MISSING") ||
    staleBlockerCodes.has("SEMANTIC_REVIEW_RESULT_INVALID") ||
    staleLimitCodes.has("semantic_review_result_missing") ||
    staleLimitCodes.has("semantic_review_result_invalid")
  ) {
    throw new Error(
      "assessment.json permaneceu stale apos a recomposicao oficial e ainda trata semantic-review.result.json como ausente/invalido.",
    );
  }

  if (
    assessment.primary_taxonomy === "bug_likely" &&
    assessment.next_action?.code === "materialize_semantic_review_result"
  ) {
    throw new Error(
      "assessment.json nao consumiu semantic-review.result.json e continuou exigindo sua materializacao apos a recomposicao oficial.",
    );
  }
};

const assertAssessmentConsumedCausalDebugResult = (
  assessment: TargetInvestigateCaseAssessment,
  hasTicketProposal: boolean,
): void => {
  const staleBlockerCodes = new Set((assessment.blockers ?? []).map((entry) => entry.code));
  const staleLimitCodes = new Set(
    (assessment.capability_limits ?? []).map((entry) => entry.code),
  );
  if (
    staleBlockerCodes.has("CAUSAL_DEBUG_RESULT_MISSING") ||
    staleBlockerCodes.has("CAUSAL_DEBUG_RESULT_INVALID") ||
    staleLimitCodes.has("causal_debug_result_missing") ||
    staleLimitCodes.has("causal_debug_result_invalid")
  ) {
    throw new Error(
      "assessment.json permaneceu stale apos a recomposicao oficial e ainda trata causal-debug.result.json como ausente/invalido.",
    );
  }

  if (
    assessment.next_action?.code === "materialize_causal_debug_result" ||
    assessment.next_action?.code === "rerun_causal_debug"
  ) {
    throw new Error(
      "assessment.json nao consumiu causal-debug.result.json e continuou exigindo sua materializacao apos a recomposicao oficial.",
    );
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    !hasTicketProposal
  ) {
    throw new Error(
      "assessment.json solicitou publication positiva sem ticket-proposal.json apos a recomposicao oficial do causal-debug.",
    );
  }
};

const assertAssessmentConsumedRootCauseReviewResult = (
  assessment: TargetInvestigateCaseAssessment,
  hasTicketProposal: boolean,
): void => {
  const staleBlockerCodes = new Set((assessment.blockers ?? []).map((entry) => entry.code));
  const staleLimitCodes = new Set(
    (assessment.capability_limits ?? []).map((entry) => entry.code),
  );
  if (
    staleBlockerCodes.has("ROOT_CAUSE_REVIEW_RESULT_MISSING") ||
    staleBlockerCodes.has("ROOT_CAUSE_REVIEW_RESULT_INVALID") ||
    staleLimitCodes.has("root_cause_review_result_missing") ||
    staleLimitCodes.has("root_cause_review_result_invalid")
  ) {
    throw new Error(
      "assessment.json permaneceu stale apos a recomposicao oficial e ainda trata root-cause-review.result.json como ausente/invalido.",
    );
  }

  if (
    assessment.next_action?.code === "materialize_root_cause_review_result" ||
    assessment.next_action?.code === "rerun_root_cause_review"
  ) {
    throw new Error(
      "assessment.json nao consumiu root-cause-review.result.json e continuou exigindo sua materializacao apos a recomposicao oficial.",
    );
  }

  if (!assessment.root_cause_review) {
    throw new Error(
      "assessment.json nao consolidou o bloco root_cause_review apos a recomposicao oficial.",
    );
  }

  if (
    assessment.publication_recommendation.recommended_action === "publish_ticket" &&
    !hasTicketProposal
  ) {
    throw new Error(
      "assessment.json solicitou publication positiva sem ticket-proposal.json apos a recomposicao oficial do root-cause-review.",
    );
  }
};

const runTargetInvestigateCaseSemanticReviewRecomposition = async (
  request: TargetInvestigateCaseSemanticReviewRecompositionRequest,
): Promise<void> => {
  const argv = parseCommandLine(request.entrypointCommand);
  if (argv.length === 0) {
    throw new Error("entrypoint.command nao pode estar vazio para a recomposicao oficial.");
  }

  const [command, ...baseArgs] = argv;
  const selectorArgs = buildTargetSelectorArgs(request.selectors);
  const args = [
    ...baseArgs,
    ...selectorArgs,
    "--replay-mode",
    request.replayMode,
    request.roundRequestIdFlag,
    request.roundId,
    request.forceFlag,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: request.targetProject.path,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          [
            `A recomposicao oficial do target-project falhou com exit code ${code}.`,
            stdout.trim() ? `stdout: ${stdout.trim()}` : null,
            stderr.trim() ? `stderr: ${stderr.trim()}` : null,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      );
    });
  });
};

const buildTargetSelectorArgs = (
  selectors: TargetInvestigateCaseSelectedSelectors,
): string[] => {
  const args: string[] = [];
  const selectorFlags: Array<[keyof TargetInvestigateCaseSelectedSelectors, string]> = [
    ["propertyId", "--property-id"],
    ["requestId", "--request-id"],
    ["workflow", "--workflow"],
    ["window", "--window"],
    ["runArtifact", "--run-artifact"],
    ["symptom", "--symptom"],
  ];

  for (const [key, flag] of selectorFlags) {
    const value = selectors[key];
    if (!value) {
      continue;
    }
    args.push(flag, value);
  }

  return args;
};

const parseCommandLine = (command: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;

  const pushCurrent = () => {
    if (!current) {
      return;
    }
    tokens.push(current);
    current = "";
  };

  for (const character of command.trim()) {
    if (escaping) {
      current += character;
      escaping = false;
      continue;
    }

    if (character === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        current += character;
      }
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }

    if (/\s/u.test(character)) {
      pushCurrent();
      continue;
    }

    current += character;
  }

  if (quote) {
    throw new Error(`entrypoint.command possui aspas nao fechadas: ${command}`);
  }

  pushCurrent();
  return tokens;
};

const syncCanonicalArtifactsFromAuthoritativeDossier = async (
  request: TargetInvestigateCaseRoundPreparationRequest,
  authoritativeDossierLocalPath: string | null,
): Promise<void> => {
  if (!authoritativeDossierLocalPath) {
    return;
  }

  if (!(await relativePathExists(request.targetProject.path, authoritativeDossierLocalPath))) {
    return;
  }

  const artifactMirrors = [
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, "case-resolution.json"),
      destinationPath: request.artifactPaths.caseResolutionPath,
    },
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, TARGET_INVESTIGATE_CASE_EVIDENCE_INDEX_ARTIFACT),
      destinationPath: request.artifactPaths.evidenceIndexPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        path.posix.basename(request.artifactPaths.evidenceBundlePath),
      ),
      destinationPath: request.artifactPaths.evidenceBundlePath,
    },
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, "assessment.json"),
      destinationPath: request.artifactPaths.assessmentPath,
    },
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, "diagnosis.json"),
      destinationPath: request.artifactPaths.diagnosisJsonPath,
    },
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, "diagnosis.md"),
      destinationPath: request.artifactPaths.diagnosisMdPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_ARTIFACT,
      ),
      destinationPath: request.artifactPaths.semanticReviewRequestPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        "semantic-review.result.json",
      ),
      destinationPath: request.artifactPaths.semanticReviewResultPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_REQUEST_ARTIFACT,
      ),
      destinationPath: request.artifactPaths.causalDebugRequestPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        TARGET_INVESTIGATE_CASE_CAUSAL_DEBUG_RESULT_ARTIFACT,
      ),
      destinationPath: request.artifactPaths.causalDebugResultPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_REQUEST_ARTIFACT,
      ),
      destinationPath: request.artifactPaths.rootCauseReviewRequestPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        TARGET_INVESTIGATE_CASE_ROOT_CAUSE_REVIEW_RESULT_ARTIFACT,
      ),
      destinationPath: request.artifactPaths.rootCauseReviewResultPath,
    },
    {
      sourcePath: path.posix.join(
        authoritativeDossierLocalPath,
        TARGET_INVESTIGATE_CASE_TICKET_PROPOSAL_ARTIFACT,
      ),
      destinationPath: request.artifactPaths.ticketProposalPath,
    },
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, "dossier.md"),
      destinationPath: path.posix.join(request.roundDirectory, "dossier.md"),
    },
    {
      sourcePath: path.posix.join(authoritativeDossierLocalPath, "dossier.json"),
      destinationPath: path.posix.join(request.roundDirectory, "dossier.json"),
    },
  ];

  const mirrorArtifactCopies =
    request.manifest.flow === TARGET_INVESTIGATE_CASE_V2_FLOW
      ? artifactMirrors
          .filter((artifactMirror) => artifactMirror.destinationPath)
          .map((artifactMirror) => ({
            sourcePath: artifactMirror.sourcePath,
            destinationPath: normalizeTargetInvestigateCaseRelativePath(
              path.posix.join(
                TARGET_INVESTIGATE_CASE_V2_MIRROR_ROUNDS_DIR,
                request.roundId,
                path.posix.basename(artifactMirror.destinationPath),
              ),
            ),
          }))
      : [];

  for (const destinationPath of uniquePaths(
    [...artifactMirrors, ...mirrorArtifactCopies]
      .filter((artifactMirror) => artifactMirror.destinationPath !== artifactMirror.sourcePath)
      .map((artifactMirror) => artifactMirror.destinationPath),
  )) {
    await removeRelativePathIfExists(request.targetProject.path, destinationPath);
  }

  for (const artifactMirror of [...artifactMirrors, ...mirrorArtifactCopies]) {
    if (!artifactMirror.destinationPath || artifactMirror.destinationPath === artifactMirror.sourcePath) {
      continue;
    }
    if (!(await relativePathExists(request.targetProject.path, artifactMirror.sourcePath))) {
      continue;
    }

    await copyRelativePath(
      request.targetProject.path,
      artifactMirror.sourcePath,
      artifactMirror.destinationPath,
    );
  }
};

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

const DIAGNOSIS_MARKDOWN_HEADING_PATTERN = /^\s{0,3}#{1,6}\s+(.+?)\s*$/u;

const validateDiagnosisMarkdownArtifact = async (
  projectPath: string,
  diagnosisMdPath: string,
): Promise<void> => {
  const absolutePath = path.join(projectPath, ...diagnosisMdPath.split("/"));
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

const removeRelativePathIfExists = async (
  projectPath: string,
  relativePath: string,
): Promise<void> => {
  try {
    await fs.unlink(path.join(projectPath, ...relativePath.split("/")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
};

const copyRelativePath = async (
  projectPath: string,
  sourceRelativePath: string,
  destinationRelativePath: string,
): Promise<void> => {
  const absoluteSourcePath = path.join(projectPath, ...sourceRelativePath.split("/"));
  const absoluteDestinationPath = path.join(projectPath, ...destinationRelativePath.split("/"));
  await fs.mkdir(path.dirname(absoluteDestinationPath), { recursive: true });

  if (sourceRelativePath.endsWith("/dossier.json")) {
    const raw = await fs.readFile(absoluteSourcePath, "utf8");
    const decoded = JSON.parse(raw);
    const parsed = targetInvestigateCaseDossierJsonSchema.parse(decoded);
    await fs.writeFile(
      absoluteDestinationPath,
      `${JSON.stringify({ ...parsed, local_path: destinationRelativePath }, null, 2)}\n`,
      "utf8",
    );
    return;
  }

  await fs.copyFile(absoluteSourcePath, absoluteDestinationPath);
};

const relativePathExists = async (projectPath: string, relativePath: string): Promise<boolean> => {
  try {
    await fs.access(path.join(projectPath, ...relativePath.split("/")));
    return true;
  } catch {
    return false;
  }
};
