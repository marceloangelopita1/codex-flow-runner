import {
  SpecRef,
  SpecTicketValidationSession,
  SpecTicketValidationSessionStartRequest,
} from "../integrations/codex-client.js";
import {
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationCycleSnapshot,
  SpecTicketValidationFinalReason,
  SpecTicketValidationPassResult,
  SpecTicketValidationResult,
  collectSpecTicketValidationGapFingerprints,
  hasAutoCorrectableGaps,
  hasStrictOpenGapReduction,
  isConfidenceSufficientForGo,
} from "../types/spec-ticket-validation.js";

export const MAX_SPEC_TICKET_VALIDATION_CYCLES = 2;

export interface SpecTicketValidationAutoCorrectRequest {
  spec: SpecRef;
  cycleNumber: number;
  latestPass: SpecTicketValidationPassResult;
  latestSnapshot: SpecTicketValidationCycleSnapshot;
}

export interface SpecTicketValidationAutoCorrectResult {
  packageContext: string;
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
}

export interface SpecTicketValidationRunnerDependencies {
  startSession: (
    request: SpecTicketValidationSessionStartRequest,
  ) => Promise<SpecTicketValidationSession>;
  autoCorrect: (
    request: SpecTicketValidationAutoCorrectRequest,
  ) => Promise<SpecTicketValidationAutoCorrectResult>;
}

export interface RunSpecTicketValidationRequest {
  spec: SpecRef;
  initialPackageContext: string;
  triageThreadId?: string | null;
}

export const runSpecTicketValidation = async (
  dependencies: SpecTicketValidationRunnerDependencies,
  request: RunSpecTicketValidationRequest,
): Promise<SpecTicketValidationResult> => {
  const session = await dependencies.startSession({
    spec: request.spec,
    triageThreadId: request.triageThreadId,
  });

  const snapshots: SpecTicketValidationCycleSnapshot[] = [];
  let cyclesExecuted = 0;

  try {
    let turn = await session.runTurn({
      packageContext: request.initialPackageContext,
    });

    snapshots.push(
      buildSnapshot({
        cycleNumber: 0,
        phase: "initial-validation",
        threadId: turn.threadId,
        turnResult: turn.parsed,
        appliedCorrections: turn.parsed.appliedCorrections,
        realGapReductionFromPrevious: null,
      }),
    );

    if (isConfidenceSufficientForGo(turn.parsed.verdict, turn.parsed.confidence)) {
      return finalizeResult({
        finalPass: turn.parsed,
        finalReason: "go-with-high-confidence",
        cyclesExecuted,
        snapshots,
        validationThreadId: turn.threadId,
      });
    }

    for (let cycleNumber = 1; cycleNumber <= MAX_SPEC_TICKET_VALIDATION_CYCLES; cycleNumber += 1) {
      if (!hasAutoCorrectableGaps(turn.parsed.gaps)) {
        break;
      }

      const latestSnapshot = snapshots[snapshots.length - 1];
      if (!latestSnapshot) {
        throw new Error("Snapshot de validacao ausente antes da autocorrecao.");
      }

      const autoCorrection = await dependencies.autoCorrect({
        spec: request.spec,
        cycleNumber,
        latestPass: turn.parsed,
        latestSnapshot,
      });

      const nextTurn = await session.runTurn({
        packageContext: autoCorrection.packageContext,
        appliedCorrectionsSummary: autoCorrection.appliedCorrections.map(
          (correction) => `${correction.description} [${correction.outcome}]`,
        ),
      });

      cyclesExecuted = cycleNumber;
      const realGapReductionFromPrevious = hasStrictOpenGapReduction(
        turn.parsed.gaps,
        nextTurn.parsed.gaps,
      );
      const appliedCorrections = [
        ...autoCorrection.appliedCorrections,
        ...nextTurn.parsed.appliedCorrections,
      ];

      snapshots.push(
        buildSnapshot({
          cycleNumber,
          phase: "revalidation",
          threadId: nextTurn.threadId,
          turnResult: nextTurn.parsed,
          appliedCorrections,
          realGapReductionFromPrevious,
        }),
      );

      if (isConfidenceSufficientForGo(nextTurn.parsed.verdict, nextTurn.parsed.confidence)) {
        return finalizeResult({
          finalPass: nextTurn.parsed,
          finalReason: "go-with-high-confidence",
          cyclesExecuted,
          snapshots,
          validationThreadId: nextTurn.threadId,
        });
      }

      if (!realGapReductionFromPrevious) {
        return finalizeResult({
          finalPass: nextTurn.parsed,
          finalReason: "no-real-gap-reduction",
          cyclesExecuted,
          snapshots,
          validationThreadId: nextTurn.threadId,
        });
      }

      turn = nextTurn;
    }

    const lastSnapshot = snapshots[snapshots.length - 1];
    if (!lastSnapshot) {
      throw new Error("Nenhum snapshot final de spec-ticket-validation foi produzido.");
    }

    return finalizeResult({
      finalPass: lastSnapshot.turnResult,
      finalReason: resolveTerminalReason(lastSnapshot.turnResult, cyclesExecuted),
      cyclesExecuted,
      snapshots,
      validationThreadId: lastSnapshot.threadId,
    });
  } finally {
    await session.cancel();
  }
};

const buildSnapshot = (params: {
  cycleNumber: number;
  phase: SpecTicketValidationCycleSnapshot["phase"];
  threadId: string;
  turnResult: SpecTicketValidationPassResult;
  appliedCorrections: SpecTicketValidationAppliedCorrection[];
  realGapReductionFromPrevious: boolean | null;
}): SpecTicketValidationCycleSnapshot => {
  return {
    cycleNumber: params.cycleNumber,
    phase: params.phase,
    threadId: params.threadId,
    turnResult: params.turnResult,
    appliedCorrections: params.appliedCorrections,
    openGapFingerprints: collectSpecTicketValidationGapFingerprints(params.turnResult.gaps),
    realGapReductionFromPrevious: params.realGapReductionFromPrevious,
  };
};

const resolveTerminalReason = (
  finalPass: SpecTicketValidationPassResult,
  cyclesExecuted: number,
): SpecTicketValidationFinalReason => {
  if (finalPass.verdict === "GO" && finalPass.confidence !== "high") {
    return "insufficient-confidence";
  }

  if (cyclesExecuted >= MAX_SPEC_TICKET_VALIDATION_CYCLES && hasAutoCorrectableGaps(finalPass.gaps)) {
    return "max-cycles-reached";
  }

  return "no-auto-correctable-gaps";
};

const finalizeResult = (params: {
  finalPass: SpecTicketValidationPassResult;
  finalReason: SpecTicketValidationFinalReason;
  cyclesExecuted: number;
  snapshots: SpecTicketValidationCycleSnapshot[];
  validationThreadId: string | null;
}): SpecTicketValidationResult => {
  return {
    verdict: params.finalReason === "go-with-high-confidence" ? "GO" : "NO_GO",
    confidence: params.finalPass.confidence,
    finalReason: params.finalReason,
    cyclesExecuted: params.cyclesExecuted,
    validationThreadId: params.validationThreadId,
    triageContextInherited: false,
    snapshots: params.snapshots,
    finalPass: params.finalPass,
    finalOpenGapFingerprints: collectSpecTicketValidationGapFingerprints(params.finalPass.gaps),
    allAppliedCorrections: params.snapshots.flatMap((snapshot) => snapshot.appliedCorrections),
  };
};
