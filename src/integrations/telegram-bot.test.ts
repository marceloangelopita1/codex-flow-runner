import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../core/logger.js";
import type { TargetInvestigateCaseRequestResult } from "../core/runner.js";
import type { TargetInvestigateCaseFlowSummary } from "../types/flow-timing.js";
import type { ProjectRef } from "../types/project.js";
import type { RunnerState } from "../types/state.js";
import type { TargetInvestigateCaseArtifactInspectionWarning } from "../types/target-investigate-case.js";
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

const createResolvedCodexPreferences = (project: ProjectRef) => ({
  project,
  model: "gpt-5.4",
  reasoningEffort: "medium",
  speed: "standard" as const,
  updatedAt: new Date("2026-04-09T12:00:00.000Z"),
  source: "catalog-default" as const,
  sources: {
    model: "catalog-default" as const,
    reasoningEffort: "catalog-default" as const,
    speed: "catalog-default" as const,
  },
  catalogFetchedAt: new Date("2026-04-09T12:00:00.000Z"),
  modelDisplayName: "GPT-5.4",
  modelDescription: null,
  modelVisibility: "public",
  modelSelectable: true,
  supportedReasoningLevels: [],
  defaultReasoningEffort: "medium",
  reasoningAdjustedFrom: null,
  fastModeSupported: true,
  speedAdjustedFrom: null,
});

const artifactInspectionWarnings: TargetInvestigateCaseArtifactInspectionWarning[] = [
  {
    artifactLabel: "evidence-index.json",
    artifactPath: "output/case-investigation/2026-04-09T12-00-00Z/evidence-index.json",
    kind: "recommended-schema-invalid",
    automationUsability: "degraded",
    message: "evidence-index.json diverge do envelope recomendado.",
  },
  {
    artifactLabel: "case-bundle.json",
    artifactPath: "output/case-investigation/2026-04-09T12-00-00Z/case-bundle.json",
    kind: "recommended-schema-invalid",
    automationUsability: "degraded",
    message: "case-bundle.json diverge do envelope recomendado.",
  },
  {
    artifactLabel: "diagnosis.json",
    artifactPath: "output/case-investigation/2026-04-09T12-00-00Z/diagnosis.json",
    kind: "recommended-schema-invalid",
    automationUsability: "degraded",
    message: "diagnosis.json diverge do envelope recomendado.",
  },
];

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

const completedResultWithWarnings: TargetInvestigateCaseRequestResult = {
  ...completedResult,
  summary: {
    ...completedResult.summary,
    artifactInspectionWarnings,
    publicationDecision: {
      ...completedResult.summary.publicationDecision,
      publication_status: "not_eligible",
      outcome_reason:
        "A rodada produziu diagnostico, mas automacoes estruturadas ficaram degradadas.",
      blocked_gates: ["artifact-envelope-warnings"],
    },
  },
};

const completedFlowSummaryWithWarnings: TargetInvestigateCaseFlowSummary = {
  flow: "target-investigate-case-v2",
  command: "/target_investigate_case_v2",
  outcome: "success",
  finalStage: "diagnosis",
  completionReason: "diagnosis-completed-with-artifact-warnings",
  timestampUtc: "2026-04-09T12:00:00.000Z",
  targetProjectName: "alpha-project",
  targetProjectPath: "/tmp/alpha-project",
  versionBoundaryState: "before-versioning",
  nextAction: "No follow-up required.",
  artifactPaths: [...completedResult.summary.realizedArtifactPaths],
  versionedArtifactPaths: [],
  details:
    "Diagnostico produzido com warnings de automacao: evidence-index.json, case-bundle.json, diagnosis.json.",
  timing: {
    startedAtUtc: "2026-04-09T12:00:00.000Z",
    finishedAtUtc: "2026-04-09T12:00:04.000Z",
    totalDurationMs: 4000,
    durationsByStageMs: {
      preflight: 1000,
      "resolve-case": 1000,
      "assemble-evidence": 1000,
      diagnosis: 1000,
    },
    completedStages: ["preflight", "resolve-case", "assemble-evidence", "diagnosis"],
    interruptedStage: "preflight",
  },
  summary: completedResult.summary.finalSummary,
  artifactInspectionWarnings,
  artifactAutomationUsability: "degraded",
};

const failedFlowSummary: TargetInvestigateCaseFlowSummary = {
  ...completedFlowSummaryWithWarnings,
  outcome: "failure",
  finalStage: "preflight",
  completionReason: "round-materialization-failed",
  nextAction: "Revise os artefatos antes de rerodar.",
  artifactPaths: [],
  details: "Falha operacional em round-materialization.",
  timing: {
    ...completedFlowSummaryWithWarnings.timing,
    completedStages: [],
    interruptedStage: "preflight",
  },
  summary: undefined,
  artifactInspectionWarnings: undefined,
  artifactAutomationUsability: undefined,
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

test("buildTargetInvestigateCaseReply separa warnings de envelope sem rebaixar diagnostico", () => {
  const controller = createController();

  const reply = callPrivate<string>(
    controller,
    "buildTargetInvestigateCaseReply",
    completedResultWithWarnings,
  );

  assert.match(reply, /concluido com warnings de automacao para alpha-project/u);
  assert.match(
    reply,
    /Estado do diagnostico: diagnostico produzido com warnings de automacao/u,
  );
  assert.match(reply, /Veredito do diagnostico: ok/u);
  assert.match(reply, /Proxima acao do diagnostico: No follow-up required\./u);
  assert.match(reply, /Diagnosis markdown: output\/case-investigation\/2026-04-09T12-00-00Z\/diagnosis\.md/u);
  assert.match(reply, /Diagnosis JSON: output\/case-investigation\/2026-04-09T12-00-00Z\/diagnosis\.json/u);
  assert.match(reply, /Artefatos realizados: .*evidence-index\.json.*case-bundle\.json.*diagnosis\.json/u);
  assert.match(reply, /Warnings de automacao:/u);

  for (const artifactLabel of [
    "evidence-index.json",
    "case-bundle.json",
    "diagnosis.json",
  ]) {
    assert.match(
      reply,
      new RegExp(
        `- ${artifactLabel.replace(".", "\\.")}: recommended-schema-invalid; usability=degraded; path=.*${artifactLabel.replace(".", "\\.")}`,
        "u",
      ),
    );
  }

  assert.equal(
    reply.indexOf("Warnings de automacao:") > reply.indexOf("Proxima acao do diagnostico"),
    true,
  );
  assert.doesNotMatch(reply, /round-materialization-failed/u);
});

test("buildTargetInvestigateCaseArtifactWarningLines preserva todos os tipos aceitos de warning", () => {
  const controller = createController();
  const warnings: TargetInvestigateCaseArtifactInspectionWarning[] = [
    {
      artifactLabel: "evidence-index.json",
      artifactPath: "output/case-investigation/round/evidence-index.json",
      kind: "artifact-missing",
      automationUsability: "unusable",
      message: "evidence-index.json nao foi materializado.",
    },
    {
      artifactLabel: "case-bundle.json",
      artifactPath: "output/case-investigation/round/case-bundle.json",
      kind: "json-parse-failed",
      automationUsability: "unusable",
      message: "case-bundle.json nao e JSON valido.",
    },
    {
      artifactLabel: "diagnosis.json",
      artifactPath: "output/case-investigation/round/diagnosis.json",
      kind: "recommended-schema-invalid",
      automationUsability: "degraded",
      message: "diagnosis.json diverge do schema recomendado.",
    },
    {
      artifactLabel: "diagnosis.json",
      artifactPath: "output/case-investigation/round/coherence.json",
      kind: "recommended-coherence-invalid",
      automationUsability: "degraded",
      message: "diagnosis.json diverge da coerencia recomendada.",
    },
  ];

  const lines = callPrivate<string[]>(
    controller,
    "buildTargetInvestigateCaseArtifactWarningLines",
    warnings,
  );

  assert.deepEqual(
    lines.map((line) => line.match(/: ([^;]+);/u)?.[1]),
    [
      "artifact-missing",
      "json-parse-failed",
      "recommended-schema-invalid",
      "recommended-coherence-invalid",
    ],
  );
  assert.deepEqual(
    lines.map((line) => line.match(/usability=([^;]+);/u)?.[1]),
    ["unusable", "unusable", "degraded", "degraded"],
  );
});

test("buildRunFlowSummaryMessage abre target investigate com diagnostico e omite fase interrompida em sucesso com warnings", () => {
  const controller = createController();

  const reply = callPrivate<string>(
    controller,
    "buildRunFlowSummaryMessage",
    completedFlowSummaryWithWarnings,
  );

  assert.match(reply, /Diagnostico\nEstado: diagnostico produzido com warnings de automacao/u);
  assert.match(reply, /Veredito do diagnostico: ok/u);
  assert.match(reply, /Warnings de automacao\n- evidence-index\.json: recommended-schema-invalid/u);
  assert.match(reply, /- case-bundle\.json: recommended-schema-invalid/u);
  assert.match(reply, /- diagnosis\.json: recommended-schema-invalid/u);
  assert.match(reply, /Motivo de encerramento: diagnosis-completed-with-artifact-warnings/u);
  assert.equal(reply.indexOf("Diagnostico") < reply.indexOf("Visao geral do fluxo"), true);
  assert.doesNotMatch(reply, /Fase interrompida/u);
});

test("buildRunFlowSummaryMessage preserva fase interrompida em falha real", () => {
  const controller = createController();

  const reply = callPrivate<string>(
    controller,
    "buildRunFlowSummaryMessage",
    failedFlowSummary,
  );

  assert.match(reply, /Resultado: falha/u);
  assert.match(reply, /Motivo de encerramento: round-materialization-failed/u);
  assert.match(reply, /Fase interrompida: preflight/u);
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

test("handleStatusCommand envia status longo em chunks pela camada central", async () => {
  const state = createState({
    lastMessage: "detalhe operacional extenso ".repeat(500),
  });
  const sentMessages: Array<{ chatId: string; text: string }> = [];
  const controller = new TelegramController(
    "telegram-token",
    new StubLogger(),
    () => state,
    {
      resolveCodexProjectPreferences: (project: ProjectRef) =>
        createResolvedCodexPreferences(project),
    } as never,
    "123",
  );
  const internalController = controller as unknown as {
    bot: {
      telegram: {
        sendMessage: (chatId: string, text: string, extra?: unknown) => Promise<unknown>;
      };
    };
  };
  internalController.bot.telegram.sendMessage = async (chatId, text) => {
    sentMessages.push({ chatId, text });
    return { message_id: sentMessages.length };
  };
  const directReplies: string[] = [];

  await callPrivate<Promise<void>>(controller, "handleStatusCommand", {
    chat: {
      id: "123",
    },
    reply: async (text: string) => {
      directReplies.push(text);
      return {};
    },
  });

  assert.equal(directReplies.length, 0);
  assert.equal(sentMessages.length > 1, true);
  assert.equal(sentMessages.every((message) => message.chatId === "123"), true);
  assert.equal(sentMessages.every((message) => message.text.length <= 4096), true);
  assert.match(sentMessages[0]?.text ?? "", /^Parte 1\/\d+\n\nRunner: inativo/u);
});
