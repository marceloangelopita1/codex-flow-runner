import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../core/logger.js";
import type { TargetInvestigateCaseRequestResult } from "../core/runner.js";
import type { RunnerState } from "../types/state.js";
import { TelegramController } from "./telegram-bot.js";

class StubLogger extends Logger {}

const createState = (value: Partial<RunnerState> = {}): RunnerState => ({
  isRunning: false,
  isPaused: false,
  currentTicket: null,
  currentSpec: null,
  activeProject: {
    name: "codex-flow-runner",
    path: "/home/mapita/projetos/codex-flow-runner",
  },
  capacity: {
    limit: 5,
    used: 0,
  },
  activeSlots: [],
  targetFlow: null,
  discoverSpecSession: null,
  planSpecSession: null,
  codexChatSession: null,
  lastCodexChatSessionClosure: null,
  lastCodexChatOutputEvent: null,
  lastCodexChatOutputFailure: null,
  phase: "idle",
  lastMessage: "idle",
  updatedAt: new Date("2026-04-09T12:00:00.000Z"),
  lastNotifiedEvent: null,
  lastNotificationFailure: null,
  lastRunFlowSummary: null,
  lastRunFlowNotificationEvent: null,
  lastRunFlowNotificationFailure: null,
  ...value,
});

const createController = (state: RunnerState = createState()): TelegramController =>
  new TelegramController(
    "telegram-token",
    new StubLogger(),
    () => state,
    {} as never,
    "123",
  );

const callPrivate = <ReturnValue>(
  controller: TelegramController,
  method: string,
  ...args: unknown[]
): ReturnValue =>
  (controller as unknown as Record<string, (...values: unknown[]) => ReturnValue>)[method](
    ...args,
  );

const completedResult: TargetInvestigateCaseRequestResult = {
  status: "completed",
  summary: {
    targetProject: {
      name: "alpha-project",
      path: "/tmp/alpha-project",
    },
    manifestPath: "docs/workflows/target-case-investigation-v2-manifest.json",
    roundId: "2026-04-09T12-00-00Z",
    roundDirectory: "output/case-investigation/2026-04-09T12-00-00Z",
    canonicalCommand: "/target_investigate_case_v2 alpha-project case-001",
    artifactPaths: {
      caseResolutionPath: "output/case-investigation/2026-04-09T12-00-00Z/case-resolution.json",
      evidenceIndexPath: "output/case-investigation/2026-04-09T12-00-00Z/evidence-index.json",
      evidenceBundlePath: "output/case-investigation/2026-04-09T12-00-00Z/case-bundle.json",
      diagnosisJsonPath: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
      diagnosisMdPath: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.md",
      remediationProposalPath:
        "output/case-investigation/2026-04-09T12-00-00Z/improvement-proposal.json",
      ticketProposalPath:
        "output/case-investigation/2026-04-09T12-00-00Z/ticket-proposal.json",
      publicationDecisionPath:
        "output/case-investigation/2026-04-09T12-00-00Z/publication-decision.json",
    },
    realizedArtifactPaths: [
      "output/case-investigation/2026-04-09T12-00-00Z/case-resolution.json",
      "output/case-investigation/2026-04-09T12-00-00Z/evidence-index.json",
      "output/case-investigation/2026-04-09T12-00-00Z/case-bundle.json",
      "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
      "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.md",
    ],
    publicationDecision: {
      publication_status: "not_applicable",
      overall_outcome: "no-real-gap",
      outcome_reason: "The diagnosis concluded the case is OK.",
      gates_applied: ["diagnosis-consistent"],
      blocked_gates: [],
      versioned_artifact_paths: [],
      ticket_path: null,
      next_action: "No follow-up required.",
    },
    finalSummary: {
      case_ref: "case-001",
      resolved_attempt_ref: "req-001",
      attempt_resolution_status: "resolved",
      attempt_candidates_status: null,
      replay_readiness_state: null,
      replay_used: false,
      diagnosis: {
        verdict: "ok",
        summary: "The workflow behaved as expected.",
        why: "The evidence confirms the target output is correct.",
        expected_behavior: "Emit the correct output.",
        observed_behavior: "The correct output was emitted.",
        confidence: "high",
        behavior_to_change: "No behavior change is required.",
        probable_fix_surface: ["none"],
        next_action: "No follow-up required.",
        bundle_artifact: "output/case-investigation/2026-04-09T12-00-00Z/case-bundle.json",
        diagnosis_md_path: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.md",
        diagnosis_json_path: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
      },
      confidence: "high",
      investigation_outcome: "no-real-gap",
      investigation_reason: "The diagnosis concluded the case is OK.",
      remediation_proposal_path: null,
      publication_status: "not_applicable",
      overall_outcome: "no-real-gap",
      outcome_reason: "The diagnosis concluded the case is OK.",
      ticket_path: null,
      next_action: "No follow-up required.",
    },
    tracePayload: {
      selectors: {
        caseRef: "case-001",
        workflow: "billing-core",
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
      evidence_refs: [
        {
          ref: "bundle-ref-1",
          path: "output/case-investigation/2026-04-09T12-00-00Z/case-bundle.json",
          sha256: "a".repeat(64),
          record_count: 1,
        },
      ],
      diagnosis: {
        verdict: "ok",
        summary: "The workflow behaved as expected.",
        why: "The evidence confirms the target output is correct.",
        expected_behavior: "Emit the correct output.",
        observed_behavior: "The correct output was emitted.",
        confidence: "high",
        behavior_to_change: "No behavior change is required.",
        probable_fix_surface: ["none"],
        next_action: "No follow-up required.",
        bundle_artifact: "output/case-investigation/2026-04-09T12-00-00Z/case-bundle.json",
        diagnosis_md_path: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.md",
        diagnosis_json_path: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
        evidence_used: ["case-resolution.json"],
        lineage: ["target-investigate-case-v2"],
      },
      investigation: {
        outcome: "no-real-gap",
        reason: "The diagnosis concluded the case is OK.",
        remediation_proposal_path: null,
      },
      publication: {
        publication_status: "not_applicable",
        overall_outcome: "no-real-gap",
        outcome_reason: "The diagnosis concluded the case is OK.",
        gates_applied: ["diagnosis-consistent"],
        blocked_gates: [],
        ticket_path: null,
        next_action: "No follow-up required.",
      },
    },
    nextAction: "No follow-up required.",
    versionBoundaryState: "before-versioning",
  },
};

test("buildStartReply expõe apenas comandos de investigacao v2", () => {
  const controller = createController();

  const reply = callPrivate<string>(controller, "buildStartReply");

  assert.match(reply, /\/target_investigate_case_v2 <projeto> <case-ref>/u);
  assert.match(reply, /\/target_investigate_case_v2_status/u);
  assert.match(reply, /\/target_investigate_case_v2_cancel/u);
  assert.doesNotMatch(reply, /\/target_investigate_case(?!_v2)/u);
});

test("buildTargetInvestigateCaseReply mantem a superficie operator-facing diagnosis-first e v2-only", () => {
  const controller = createController();

  const reply = callPrivate<string>(
    controller,
    "buildTargetInvestigateCaseReply",
    completedResult,
  );

  assert.match(reply, /\/target_investigate_case_v2 concluido para alpha-project/u);
  assert.match(reply, /Veredito do diagnostico: ok/u);
  assert.match(reply, /Diagnosis markdown: output\/case-investigation\/2026-04-09T12-00-00Z\/diagnosis\.md/u);
  assert.doesNotMatch(reply, /assessment/u);
  assert.doesNotMatch(reply, /dossier/u);
  assert.doesNotMatch(reply, /semantic-review/u);
});

test("buildTargetFlowStatusReply descreve apenas o comando v2 quando nao ha execucao ativa", () => {
  const controller = createController(createState());

  const reply = callPrivate<string>(
    controller,
    "buildTargetFlowStatusReply",
    "target-investigate-case-v2",
    createState(),
  );

  assert.equal(
    reply,
    "ℹ️ Nenhuma execucao /target_investigate_case_v2 ativa no momento.",
  );
});
