import assert from "node:assert/strict";
import test from "node:test";
import {
  SpecRef,
  SpecTicketValidationSession,
  SpecTicketValidationSessionTurnResult,
} from "../integrations/codex-client.js";
import {
  SpecTicketValidationAppliedCorrection,
  SpecTicketValidationPassResult,
} from "../types/spec-ticket-validation.js";
import {
  MAX_SPEC_TICKET_VALIDATION_CYCLES,
  runSpecTicketValidation,
} from "./spec-ticket-validation.js";

const spec: SpecRef = {
  fileName: "2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md",
  path: "docs/specs/2026-03-19-spec-ticket-validation-e-melhoria-continua-do-workflow.md",
};

class StubSpecTicketValidationSession implements SpecTicketValidationSession {
  public readonly turnRequests: Array<{
    packageContext: string;
    appliedCorrectionsSummary: string[];
  }> = [];
  public cancelCalls = 0;
  private lastThreadId: string | null = null;

  constructor(private readonly turns: SpecTicketValidationSessionTurnResult[]) {}

  async runTurn(request: {
    packageContext: string;
    appliedCorrectionsSummary?: string[];
  }): Promise<SpecTicketValidationSessionTurnResult> {
    this.turnRequests.push({
      packageContext: request.packageContext,
      appliedCorrectionsSummary: request.appliedCorrectionsSummary ?? [],
    });

    const nextTurn = this.turns.shift();
    if (!nextTurn) {
      throw new Error("Turno inesperado na sessao de spec-ticket-validation.");
    }

    this.lastThreadId = nextTurn.threadId;
    return nextTurn;
  }

  getThreadId(): string | null {
    return this.lastThreadId;
  }

  async cancel(): Promise<void> {
    this.cancelCalls += 1;
  }
}

const buildCorrection = (
  description: string,
  outcome: SpecTicketValidationAppliedCorrection["outcome"] = "applied",
): SpecTicketValidationAppliedCorrection => ({
  description,
  affectedArtifactPaths: ["tickets/open/example.md"],
  linkedGapTypes: ["coverage-gap"],
  outcome,
});

const buildPass = (overrides: Partial<SpecTicketValidationPassResult> = {}): SpecTicketValidationPassResult => ({
  verdict: "NO_GO",
  confidence: "medium",
  summary: "Pacote ainda possui gaps em aberto.",
  gaps: [
    {
      gapType: "coverage-gap",
      summary: "RF-02 ainda nao esta coberto.",
      affectedArtifactPaths: ["tickets/open/example.md"],
      requirementRefs: ["RF-02"],
      evidence: ["Ticket atual nao menciona RF-02."],
      probableRootCause: "ticket",
      isAutoCorrectable: true,
    },
  ],
  appliedCorrections: [],
  ...overrides,
});

const buildTurn = (
  parsed: SpecTicketValidationPassResult,
  threadId = "thread-validation-1",
): SpecTicketValidationSessionTurnResult => ({
  threadId,
  output: JSON.stringify(parsed),
  parsed,
  promptTemplatePath: "/tmp/prompts/09-validar-tickets-derivados-da-spec.md",
  promptText: "prompt",
});

test("retorna GO no primeiro passe quando o gate conclui com alta confianca", async () => {
  const session = new StubSpecTicketValidationSession([
    buildTurn(
      buildPass({
        verdict: "GO",
        confidence: "high",
        summary: "Pacote aprovado sem gaps remanescentes.",
        gaps: [],
      }),
    ),
  ]);
  let autoCorrectCalls = 0;

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async () => {
        autoCorrectCalls += 1;
        return {
          packageContext: "nao deveria ser chamado",
          appliedCorrections: [],
          materialChangesApplied: false,
        };
      },
    },
    {
      spec,
      initialPackageContext: "tickets derivados atuais",
      triageThreadId: "thread-triage-externa",
    },
  );

  assert.equal(result.verdict, "GO");
  assert.equal(result.finalReason, "go-with-high-confidence");
  assert.equal(result.cyclesExecuted, 0);
  assert.equal(result.triageContextInherited, false);
  assert.equal(result.snapshots.length, 1);
  assert.equal(autoCorrectCalls, 0);
  assert.equal(session.turnRequests.length, 1);
  assert.equal(session.cancelCalls, 1);
});

test("retorna GO sem autocorrecao quando o pacote inicial ja herda RNF e obrigacao documental", async () => {
  const session = new StubSpecTicketValidationSession([
    buildTurn(
      buildPass({
        verdict: "GO",
        confidence: "high",
        summary: "Pacote ja cobre RNF e obrigacao documental herdados.",
        gaps: [],
      }),
    ),
  ]);
  let autoCorrectCalls = 0;
  const initialPackageContext = [
    "# Pacote derivado da spec",
    "",
    "## Spec",
    "- Restricoes tecnicas relevantes: propagar requestId e propertyId; mudancas materiais de calculo devem revisar README.md.",
    "",
    "## Tickets derivados",
    "### 1. tickets/open/example.md",
    "- Source requirements (RFs/CAs, when applicable): RF-01; RNF-02; Restricao tecnica: revisar README.md quando o calculo mudar.",
    "- Inherited assumptions/defaults (when applicable): Propagar requestId e propertyId em logs e payloads.",
    "",
    "## Closure criteria",
    "- Requisito/RF/CA coberto: RNF-02",
    "- Evidencia observavel: requestId e propertyId permanecem visiveis de ponta a ponta.",
    "- Requisito/RF/CA coberto: Restricao tecnica - revisao documental",
    "- Evidencia observavel: README.md revisado quando houver mudanca material no calculo.",
    "",
  ].join("\n");

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async () => {
        autoCorrectCalls += 1;
        return {
          packageContext: "nao deveria ser chamado",
          appliedCorrections: [],
          materialChangesApplied: false,
        };
      },
    },
    {
      spec,
      initialPackageContext,
    },
  );

  assert.equal(result.verdict, "GO");
  assert.equal(result.finalReason, "go-with-high-confidence");
  assert.equal(autoCorrectCalls, 0);
  assert.equal(session.turnRequests.length, 1);
  assert.match(session.turnRequests[0]?.packageContext ?? "", /RNF-02/u);
  assert.match(session.turnRequests[0]?.packageContext ?? "", /requestId e propertyId/u);
  assert.match(session.turnRequests[0]?.packageContext ?? "", /README\.md/u);
});

test("executa autocorrecao e revalidacao quando o primeiro passe encontra gaps corrigiveis", async () => {
  const session = new StubSpecTicketValidationSession([
    buildTurn(buildPass()),
    buildTurn(
      buildPass({
        verdict: "GO",
        confidence: "high",
        summary: "Pacote corrigido e pronto para seguir.",
        gaps: [],
      }),
    ),
  ]);
  const autoCorrections = [buildCorrection("Adicionar RF-02 ao ticket derivado.")];

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async () => ({
        packageContext: "tickets derivados apos correcao automatica",
        appliedCorrections: autoCorrections,
        materialChangesApplied: true,
      }),
    },
    {
      spec,
      initialPackageContext: "tickets derivados iniciais",
    },
  );

  assert.equal(result.verdict, "GO");
  assert.equal(result.cyclesExecuted, 1);
  assert.equal(result.finalReason, "go-with-high-confidence");
  assert.equal(result.snapshots.length, 2);
  assert.deepEqual(
    session.turnRequests[1]?.appliedCorrectionsSummary,
    ["Adicionar RF-02 ao ticket derivado. [applied]"],
  );
  assert.equal(result.snapshots[1]?.realGapReductionFromPrevious, true);
  assert.deepEqual(result.allAppliedCorrections, autoCorrections);
});

test("para no segundo ciclo completo sem terceira tentativa quando os gaps seguem reduzindo mas nao zeram", async () => {
  const session = new StubSpecTicketValidationSession([
    buildTurn(
      buildPass({
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-02 ainda nao esta coberto.",
            affectedArtifactPaths: ["tickets/open/a.md"],
            requirementRefs: ["RF-02"],
            evidence: ["Ticket A nao cobre RF-02."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
          {
            gapType: "closure-criteria-gap",
            summary: "CA-05 ainda nao esta observavel.",
            affectedArtifactPaths: ["tickets/open/b.md"],
            requirementRefs: ["CA-05"],
            evidence: ["Ticket B nao tem criterio observavel."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
          {
            gapType: "granularity-gap",
            summary: "Escopo ainda grande demais.",
            affectedArtifactPaths: ["tickets/open/c.md"],
            requirementRefs: ["RF-12"],
            evidence: ["Ticket C continua acumulando duas frentes."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
      }),
    ),
    buildTurn(
      buildPass({
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-02 ainda nao esta coberto.",
            affectedArtifactPaths: ["tickets/open/a.md"],
            requirementRefs: ["RF-02"],
            evidence: ["Ticket A ainda nao cobre RF-02."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
          {
            gapType: "granularity-gap",
            summary: "Escopo ainda grande demais.",
            affectedArtifactPaths: ["tickets/open/c.md"],
            requirementRefs: ["RF-12"],
            evidence: ["Ticket C continua acumulando duas frentes."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
      }),
    ),
    buildTurn(
      buildPass({
        gaps: [
          {
            gapType: "granularity-gap",
            summary: "Escopo ainda grande demais.",
            affectedArtifactPaths: ["tickets/open/c.md"],
            requirementRefs: ["RF-12"],
            evidence: ["Ticket C ainda precisa ser quebrado."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
      }),
    ),
  ]);
  let autoCorrectCalls = 0;

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async ({ cycleNumber }) => {
        autoCorrectCalls += 1;
        return {
          packageContext: `tickets derivados apos ciclo ${String(cycleNumber)}`,
          appliedCorrections: [buildCorrection(`Correcao do ciclo ${String(cycleNumber)}.`)],
          materialChangesApplied: true,
        };
      },
    },
    {
      spec,
      initialPackageContext: "tickets derivados iniciais",
    },
  );

  assert.equal(MAX_SPEC_TICKET_VALIDATION_CYCLES, 2);
  assert.equal(result.verdict, "NO_GO");
  assert.equal(result.finalReason, "max-cycles-reached");
  assert.equal(result.cyclesExecuted, 2);
  assert.equal(autoCorrectCalls, 2);
  assert.equal(session.turnRequests.length, 3);
});

test("bloqueia a rodada quando nao ha reducao real dos gaps apos revalidacao", async () => {
  const stagnantPass = buildPass({
    gaps: [
      {
        gapType: "coverage-gap",
        summary: "RF-02 ainda nao esta coberto.",
        affectedArtifactPaths: ["tickets/open/example.md"],
        requirementRefs: ["RF-02"],
        evidence: ["Ticket atual nao menciona RF-02."],
        probableRootCause: "ticket",
        isAutoCorrectable: true,
      },
    ],
  });
  const session = new StubSpecTicketValidationSession([
    buildTurn(stagnantPass),
    buildTurn(
      buildPass({
        summary: "Mesmo gap permaneceu aberto.",
        gaps: [
          {
            gapType: "coverage-gap",
            summary: "RF-02 ainda nao esta coberto.",
            affectedArtifactPaths: ["tickets/open/example.md"],
            requirementRefs: ["RF-02"],
            evidence: ["Mesmo gap continua no ticket."],
            probableRootCause: "ticket",
            isAutoCorrectable: true,
          },
        ],
      }),
    ),
  ]);

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async () => ({
        packageContext: "tickets derivados apos correcao sem efeito",
        appliedCorrections: [buildCorrection("Tentativa sem efeito pratico.", "failed")],
        materialChangesApplied: true,
      }),
    },
    {
      spec,
      initialPackageContext: "tickets derivados iniciais",
    },
  );

  assert.equal(result.verdict, "NO_GO");
  assert.equal(result.finalReason, "no-real-gap-reduction");
  assert.equal(result.cyclesExecuted, 1);
  assert.equal(result.snapshots.length, 2);
  assert.equal(result.snapshots[1]?.realGapReductionFromPrevious, false);
});

test("normaliza GO com confianca medium ou low para NO_GO final", async () => {
  const session = new StubSpecTicketValidationSession([
    buildTurn(
      buildPass({
        verdict: "GO",
        confidence: "medium",
        summary: "Pacote parece bom, mas a confianca ainda nao e suficiente.",
        gaps: [],
      }),
    ),
  ]);

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async () => ({
        packageContext: "nao deveria ser chamado",
        appliedCorrections: [],
        materialChangesApplied: false,
      }),
    },
    {
      spec,
      initialPackageContext: "tickets derivados atuais",
    },
  );

  assert.equal(result.verdict, "NO_GO");
  assert.equal(result.finalReason, "insufficient-confidence");
  assert.equal(result.cyclesExecuted, 0);
  assert.deepEqual(result.finalOpenGapFingerprints, []);
});

test("encerra sem revalidar quando nao houve correcao material segura", async () => {
  const initialPass = buildPass({
    summary: "Existe gap documental auto-corrigivel, mas nenhuma correcao segura foi aplicada.",
    gaps: [
      {
        gapType: "documentation-compliance-gap",
        summary: "Ticket ainda nao deixa clara a aplicabilidade do contrato documental.",
        affectedArtifactPaths: ["tickets/open/example.md"],
        requirementRefs: ["RF-08"],
        evidence: ["O pacote nao informa a origem documental do ticket."],
        probableRootCause: "ticket",
        isAutoCorrectable: true,
      },
    ],
  });
  const session = new StubSpecTicketValidationSession([buildTurn(initialPass)]);
  let autoCorrectCalls = 0;

  const result = await runSpecTicketValidation(
    {
      startSession: async () => session,
      autoCorrect: async () => {
        autoCorrectCalls += 1;
        return {
          packageContext: "mesmo pacote derivado",
          appliedCorrections: [],
          materialChangesApplied: false,
        };
      },
    },
    {
      spec,
      initialPackageContext: "tickets derivados atuais",
    },
  );

  assert.equal(result.verdict, "NO_GO");
  assert.equal(result.finalReason, "no-material-auto-correction");
  assert.equal(result.cyclesExecuted, 0);
  assert.equal(autoCorrectCalls, 1);
  assert.equal(session.turnRequests.length, 1);
  assert.equal(result.snapshots.length, 1);
  assert.deepEqual(result.allAppliedCorrections, []);
});
