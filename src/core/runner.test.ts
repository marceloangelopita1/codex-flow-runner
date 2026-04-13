import assert from "node:assert/strict";
import test from "node:test";
import type { AppEnv } from "../config/env.js";
import type { CodexTicketFlowClient } from "../integrations/codex-client.js";
import type { GitVersioning } from "../integrations/git-client.js";
import type { TicketQueue } from "../integrations/ticket-queue.js";
import type { ProjectRef } from "../types/project.js";
import type { TargetInvestigateCaseExecutor } from "./target-investigate-case.js";
import { Logger } from "./logger.js";
import type {
  RunnerRoundDependencies,
  RunnerRoundDependenciesResolver,
  TicketRunnerOptions,
} from "./runner.js";
import { TicketRunner } from "./runner.js";
import type {
  TargetFlowTraceRecord,
  TargetFlowTraceRecordRequest,
  WorkflowStageTraceRecord,
  WorkflowStageTraceRecordRequest,
  WorkflowTraceStore,
} from "../integrations/workflow-trace-store.js";
import type {
  TargetInvestigateCaseArtifactInspectionWarning,
  TargetInvestigateCaseExecutionResult,
} from "../types/target-investigate-case.js";

class StubLogger extends Logger {}

const env: AppEnv = {
  TELEGRAM_BOT_TOKEN: "telegram-token",
  TELEGRAM_ALLOWED_CHAT_ID: "123",
  PROJECTS_ROOT_PATH: "/tmp/projects",
  POLL_INTERVAL_MS: 1000,
  RUN_ALL_MAX_TICKETS_PER_ROUND: 20,
  SHUTDOWN_DRAIN_TIMEOUT_MS: 30000,
  PLAN_SPEC_FORWARD_RAW_OUTPUT_TO_TELEGRAM: false,
  RUN_SPECS_WORKFLOW_IMPROVEMENT_ENABLED: false,
};

const activeProject: ProjectRef = {
  name: "codex-flow-runner",
  path: "/home/mapita/projetos/codex-flow-runner",
};

const dependencies: RunnerRoundDependencies = {
  activeProject,
  queue: {} as TicketQueue,
  codexClient: {} as CodexTicketFlowClient,
  gitVersioning: {} as GitVersioning,
};

const createRunner = (
  executor: TargetInvestigateCaseExecutor | null = null,
  options: Omit<TicketRunnerOptions, "targetInvestigateCaseExecutor"> = {},
): TicketRunner => {
  const resolver: RunnerRoundDependenciesResolver = async () => dependencies;
  return new TicketRunner(env, new StubLogger(), dependencies, resolver, undefined, {
    ...options,
    targetInvestigateCaseExecutor: executor ?? undefined,
  });
};

const targetProject: ProjectRef = {
  name: "alpha-project",
  path: "/tmp/alpha-project",
};

const artifactInspectionWarnings: TargetInvestigateCaseArtifactInspectionWarning[] = [
  {
    artifactLabel: "evidence-index.json",
    artifactPath: "output/case-investigation/2026-04-13T16-00-00Z/evidence-index.json",
    kind: "recommended-schema-invalid",
    automationUsability: "degraded",
    message: "evidence-index.json diverge do envelope recomendado.",
  },
  {
    artifactLabel: "case-bundle.json",
    artifactPath: "output/case-investigation/2026-04-13T16-00-00Z/case-bundle.json",
    kind: "recommended-schema-invalid",
    automationUsability: "degraded",
    message: "case-bundle.json diverge do envelope recomendado.",
  },
  {
    artifactLabel: "diagnosis.json",
    artifactPath: "output/case-investigation/2026-04-13T16-00-00Z/diagnosis.json",
    kind: "recommended-schema-invalid",
    automationUsability: "degraded",
    message: "diagnosis.json diverge do envelope recomendado.",
  },
];

const createCompletedInvestigateCaseResult = (): TargetInvestigateCaseExecutionResult => {
  const roundDirectory = "output/case-investigation/2026-04-13T16-00-00Z";
  const artifactPaths = {
    caseResolutionPath: `${roundDirectory}/case-resolution.json`,
    evidenceIndexPath: `${roundDirectory}/evidence-index.json`,
    evidenceBundlePath: `${roundDirectory}/case-bundle.json`,
    diagnosisJsonPath: `${roundDirectory}/diagnosis.json`,
    diagnosisMdPath: `${roundDirectory}/diagnosis.md`,
    remediationProposalPath: `${roundDirectory}/improvement-proposal.json`,
    ticketProposalPath: `${roundDirectory}/ticket-proposal.json`,
    publicationDecisionPath: `${roundDirectory}/publication-decision.json`,
  };
  const diagnosis = {
    schema_version: "target-investigate-case-diagnosis-v2",
    bundle_artifact: artifactPaths.evidenceBundlePath,
    verdict: "ok" as const,
    summary: "The workflow behaved as expected.",
    why: "The evidence confirms the target output is correct.",
    expected_behavior: "Emit the correct output.",
    observed_behavior: "The correct output was emitted.",
    confidence: "high" as const,
    behavior_to_change: "No behavior change is required.",
    probable_fix_surface: ["none"],
    evidence_used: ["case-bundle.json"],
    next_action: "No follow-up required.",
    lineage: ["target-investigate-case-v2"],
  };
  const publicationDecision = {
    publication_status: "not_eligible" as const,
    overall_outcome: "no-real-gap" as const,
    outcome_reason:
      "A rodada produziu diagnostico, mas automacoes estruturadas ficaram degradadas.",
    gates_applied: ["diagnosis-consistent"],
    blocked_gates: ["artifact-envelope-warnings"],
    versioned_artifact_paths: [],
    ticket_path: null,
    next_action: "No follow-up required.",
  };

  return {
    status: "completed",
    summary: {
      targetProject,
      manifestPath: "docs/workflows/target-case-investigation-v2-manifest.json",
      roundId: "2026-04-13T16-00-00Z",
      roundDirectory,
      canonicalCommand: "/target_investigate_case_v2 alpha-project case-001",
      artifactPaths,
      realizedArtifactPaths: [
        artifactPaths.caseResolutionPath,
        artifactPaths.evidenceIndexPath,
        artifactPaths.evidenceBundlePath,
        artifactPaths.diagnosisJsonPath,
        artifactPaths.diagnosisMdPath,
      ],
      publicationDecision,
      finalSummary: {
        case_ref: "case-001",
        resolved_attempt_ref: "req-001",
        attempt_resolution_status: "resolved",
        attempt_candidates_status: null,
        replay_readiness_state: null,
        replay_used: false,
        diagnosis: {
          verdict: diagnosis.verdict,
          summary: diagnosis.summary,
          why: diagnosis.why,
          expected_behavior: diagnosis.expected_behavior,
          observed_behavior: diagnosis.observed_behavior,
          confidence: diagnosis.confidence,
          behavior_to_change: diagnosis.behavior_to_change,
          probable_fix_surface: [...diagnosis.probable_fix_surface],
          next_action: diagnosis.next_action,
          bundle_artifact: diagnosis.bundle_artifact,
          diagnosis_md_path: artifactPaths.diagnosisMdPath,
          diagnosis_json_path: artifactPaths.diagnosisJsonPath,
        },
        confidence: diagnosis.confidence,
        investigation_outcome: "no-real-gap",
        investigation_reason: "The diagnosis concluded the case is OK.",
        remediation_proposal_path: null,
        publication_status: publicationDecision.publication_status,
        overall_outcome: publicationDecision.overall_outcome,
        outcome_reason: publicationDecision.outcome_reason,
        ticket_path: null,
        next_action: diagnosis.next_action,
      },
      tracePayload: {
        selectors: {
          caseRef: "case-001",
          workflow: null,
          requestId: "req-001",
          window: null,
          symptom: null,
        },
        resolved_case_ref: "case-001",
        resolved_attempt_ref: "req-001",
        case_resolution: {
          attempt_candidates_status: null,
          selected_attempt_candidate_request_id: null,
          attempt_candidate_request_ids: [],
          replay_readiness: null,
        },
        replay: {
          used: false,
          mode: "historical-only",
          requestId: "req-001",
          namespace: "case-investigation/round-1",
        },
        evidence_refs: [],
        diagnosis: {
          ...diagnosis,
          diagnosis_md_path: artifactPaths.diagnosisMdPath,
          diagnosis_json_path: artifactPaths.diagnosisJsonPath,
        },
        investigation: {
          outcome: "no-real-gap",
          reason: "The diagnosis concluded the case is OK.",
          remediation_proposal_path: null,
        },
        publication: {
          publication_status: publicationDecision.publication_status,
          overall_outcome: publicationDecision.overall_outcome,
          outcome_reason: publicationDecision.outcome_reason,
          gates_applied: [...publicationDecision.gates_applied],
          blocked_gates: [...publicationDecision.blocked_gates],
          ticket_path: publicationDecision.ticket_path,
          next_action: publicationDecision.next_action,
        },
      },
      artifactInspectionWarnings,
      nextAction: diagnosis.next_action,
      versionBoundaryState: "before-versioning",
    },
  };
};

const createTraceStore = (records: TargetFlowTraceRecordRequest[]): WorkflowTraceStore => ({
  recordStageTrace: async (
    _request: WorkflowStageTraceRecordRequest,
  ): Promise<WorkflowStageTraceRecord> => ({
    traceId: "stage-1",
    requestPath: "request.md",
    responsePath: "response.md",
    decisionPath: "decision.json",
  }),
  recordTargetFlowTrace: async (
    request: TargetFlowTraceRecordRequest,
  ): Promise<TargetFlowTraceRecord> => {
    records.push(request);
    return {
      traceId: "target-1",
      sessionPath: ".codex-flow-runner/flow-traces/target-flows/target-1/session.json",
    };
  },
});

test("requestTargetInvestigateCase usa a superficie v2 na mensagem de executor ausente", async () => {
  const runner = createRunner();

  const result = await runner.requestTargetInvestigateCase(
    "/target_investigate_case_v2 alpha-project case-001",
  );

  assert.equal(result.status, "failed");
  if (result.status !== "failed") {
    return;
  }

  assert.match(result.message, /Executor de \/target_investigate_case_v2 nao configurado/u);
  await runner.shutdown({ timeoutMs: 100 });
});

test("requestTargetInvestigateCase rejeita comandos fora do contrato v2", async () => {
  const runner = createRunner({
    execute: async () => {
      throw new Error("Nao deveria executar quando o comando e invalido.");
    },
  });

  const result = await runner.requestTargetInvestigateCase(
    "/target_investigate_case alpha-project case-001",
  );

  assert.equal(result.status, "failed");
  if (result.status !== "failed") {
    return;
  }

  assert.match(result.message, /Comando invalido/u);
  await runner.shutdown({ timeoutMs: 100 });
});

test("requestTargetInvestigateCase registra diagnostico com warnings como sucesso degradado no summary e trace", async () => {
  const traceRecords: TargetFlowTraceRecordRequest[] = [];
  let completedSummary: unknown = null;
  let completeFlow: ((value: unknown) => void) | null = null;
  const completion = new Promise<unknown>((resolve) => {
    completeFlow = resolve;
  });

  const executor: TargetInvestigateCaseExecutor = {
    execute: async (_request, hooks) => {
      await hooks?.onMilestone?.({
        flow: "target-investigate-case-v2",
        command: "/target_investigate_case_v2",
        targetProject,
        milestone: "preflight",
        milestoneLabel: "preflight",
        message: "Preflight concluido.",
        versionBoundaryState: "before-versioning",
        recordedAtUtc: "2026-04-13T16:00:00.000Z",
      });
      await hooks?.onMilestone?.({
        flow: "target-investigate-case-v2",
        command: "/target_investigate_case_v2",
        targetProject,
        milestone: "diagnosis",
        milestoneLabel: "diagnosis",
        message: "Diagnostico pronto.",
        versionBoundaryState: "before-versioning",
        recordedAtUtc: "2026-04-13T16:00:03.000Z",
      });
      return createCompletedInvestigateCaseResult();
    },
  };
  const runner = createRunner(executor, {
    now: () => new Date("2026-04-13T16:00:04.000Z"),
    workflowTraceStoreFactory: () => createTraceStore(traceRecords),
    runFlowEventHandlers: {
      onFlowCompleted: (event) => {
        completedSummary = event;
        completeFlow?.(event);
      },
    },
  });

  const startResult = await runner.requestTargetInvestigateCase(
    "/target_investigate_case_v2 alpha-project case-001 --request-id req-001",
  );
  assert.equal(startResult.status, "started");

  const summary = (await completion) as NonNullable<typeof completedSummary>;
  assert.equal(typeof summary, "object");
  const flowSummary = summary as {
    outcome: string;
    finalStage: string;
    completionReason: string;
    details?: string;
    artifactInspectionWarnings?: TargetInvestigateCaseArtifactInspectionWarning[];
  };
  assert.equal(flowSummary.outcome, "success");
  assert.equal(flowSummary.finalStage, "diagnosis");
  assert.equal(
    flowSummary.completionReason,
    "diagnosis-completed-with-artifact-warnings",
  );
  assert.match(flowSummary.details ?? "", /Diagnostico produzido com warnings de automacao/u);
  assert.deepEqual(
    flowSummary.artifactInspectionWarnings?.map((warning) => warning.artifactLabel),
    ["evidence-index.json", "case-bundle.json", "diagnosis.json"],
  );

  assert.equal(traceRecords.length, 1);
  const trace = traceRecords[0]!;
  assert.equal(trace.outcome.status, "success");
  assert.doesNotMatch(JSON.stringify(trace.outcome), /round-materialization-failed/u);
  const metadata = trace.outcome.metadata as {
    completionReason?: string;
    finalStage?: string;
    artifactAutomationUsability?: string;
    artifactInspectionWarnings?: TargetInvestigateCaseArtifactInspectionWarning[];
  };
  assert.equal(
    metadata.completionReason,
    "diagnosis-completed-with-artifact-warnings",
  );
  assert.equal(metadata.finalStage, "diagnosis");
  assert.equal(metadata.artifactAutomationUsability, "degraded");
  assert.deepEqual(
    metadata.artifactInspectionWarnings?.map((warning) => warning.artifactLabel),
    ["evidence-index.json", "case-bundle.json", "diagnosis.json"],
  );
  assert.equal(
    metadata.artifactInspectionWarnings?.every(
      (warning) =>
        warning.kind === "recommended-schema-invalid" &&
        warning.automationUsability === "degraded",
    ),
    true,
  );

  await runner.shutdown({ timeoutMs: 100 });
});
